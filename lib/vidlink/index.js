// Server-only VidLink stream resolver.
//
// VidLink guards its internal stream API with a token produced by an obfuscated
// Go/WASM module. Booting that module and calling its exported getAdv() requires
// browser-shim globals (window, self, document, location). Those must NOT persist
// on the Node global scope — a lingering `document` makes Next's server think it's
// in a browser and breaks SSR. So we install the shims only around the WASM calls
// (all synchronous once booted) and immediately restore the real globals.

import fs from 'node:fs';
import path from 'node:path';

export const VIDLINK_HEADERS = {
  Referer: 'https://vidlink.pro/',
  Origin: 'https://vidlink.pro',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

const WASM_DIR = path.join(process.cwd(), 'lib', 'vidlink');
const SHIM_KEYS = ['window', 'self', 'document', 'location'];

let bootPromise = null;
let getAdvRef = null;

function applyShims() {
  const saved = {};
  for (const k of SHIM_KEYS) saved[k] = globalThis[k];
  globalThis.window = globalThis;
  globalThis.self = globalThis;
  globalThis.document = { createElement: () => ({}), body: { appendChild: () => {} } };
  globalThis.location = { protocol: 'https:', href: 'https://vidlink.pro/', host: 'vidlink.pro' };
  return saved;
}

function restoreShims(saved) {
  for (const k of SHIM_KEYS) {
    if (saved[k] === undefined) delete globalThis[k];
    else globalThis[k] = saved[k];
  }
}

function bootWasm() {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    const saved = applyShims();
    try {
      const sodium = (await import('libsodium-wrappers')).default;
      await sodium.ready;
      globalThis.sodium = sodium;

      // Vendored Go wasm_exec glue: an IIFE that assigns the runtime to
      // globalThis.Dm. Indirect eval runs it in global scope; trusted asset.
      const glue = fs.readFileSync(path.join(WASM_DIR, 'wasm_exec.js'), 'utf8');
      const indirectEval = eval;
      indirectEval(glue);
      const GoRuntime = globalThis.Dm;
      if (typeof GoRuntime !== 'function') throw new Error('vidlink glue did not expose Dm');

      const go = new GoRuntime();
      const wasmBuf = fs.readFileSync(path.join(WASM_DIR, 'fu.wasm'));
      const { instance } = await WebAssembly.instantiate(wasmBuf, go.importObject);
      go.run(instance);

      // Let the Go runtime register its exports.
      await new Promise((r) => setTimeout(r, 500));
      if (typeof globalThis.getAdv !== 'function') {
        throw new Error('vidlink WASM booted but getAdv was not exported');
      }
      getAdvRef = globalThis.getAdv;
    } finally {
      restoreShims(saved);
    }
  })();
  bootPromise.catch(() => {
    bootPromise = null; // allow retry on next request
  });
  return bootPromise;
}

// getAdv is synchronous; wrap it in shims atomically (no awaits between apply and
// restore) so concurrent requests never observe a polluted global scope.
function mintToken(id) {
  const saved = applyShims();
  try {
    return getAdvRef(String(id));
  } finally {
    restoreShims(saved);
  }
}

function normalizeStream(stream) {
  const out = { type: stream.type, sources: [], captions: [], playlist: null };

  if (stream.type === 'hls' && stream.playlist) out.playlist = stream.playlist;

  if (stream.qualities && typeof stream.qualities === 'object') {
    out.sources = Object.entries(stream.qualities)
      .map(([quality, q]) => ({
        quality: Number(quality) || quality,
        label: `${quality}p`,
        url: q.url,
        codec: q.codecName || null,
        container: q.type || 'mp4',
      }))
      .filter((s) => s.url)
      .sort((a, b) => (Number(b.quality) || 0) - (Number(a.quality) || 0));
  }

  const rawCaptions = stream.captions || stream.subtitles || [];
  out.captions = rawCaptions
    .filter((c) => c && c.url)
    .map((c) => ({
      url: c.url,
      language: c.language || c.label || 'Unknown',
      type: (c.type || 'srt').toLowerCase(),
    }));

  return out;
}

// Resolve a playable stream for a TMDB id. `season`/`episode` for TV; omit for movies.
export async function resolveStream(tmdbId, season, episode) {
  await bootWasm();
  const token = mintToken(tmdbId);
  if (!token) throw new Error('vidlink getAdv returned no token');

  const apiUrl = season
    ? `https://vidlink.pro/api/b/tv/${token}/${season}/${episode || 1}?multiLang=0`
    : `https://vidlink.pro/api/b/movie/${token}?multiLang=0`;

  const res = await fetch(apiUrl, { headers: VIDLINK_HEADERS });
  if (!res.ok) throw new Error(`vidlink API returned ${res.status}`);

  const data = await res.json();
  if (!data || !data.stream) throw new Error('vidlink response missing stream');

  const normalized = normalizeStream(data.stream);
  if (!normalized.playlist && normalized.sources.length === 0) {
    throw new Error('vidlink returned no playable sources');
  }
  return normalized;
}
