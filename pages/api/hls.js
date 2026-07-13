// Streaming proxy for VidLink media. The upstream CDN rejects requests without
// VidLink's Referer/Origin (returns 403), so the browser can't fetch segments or
// MP4 bytes directly. This proxy adds those headers, forwards Range requests so
// seeking works on progressive MP4s, and rewrites HLS playlists so their segment
// URLs point back through here too.

import { Readable } from 'node:stream';
import { VIDLINK_HEADERS } from '../../lib/vidlink';

export const config = {
  api: { responseLimit: false }, // large media bodies stream through untouched
};

// Rewrite every non-comment URI line in an m3u8 to route back through this proxy.
function rewritePlaylist(body, playlistUrl) {
  const base = playlistUrl.split('?')[0];
  const baseDir = base.substring(0, base.lastIndexOf('/') + 1);
  const origin = new URL(playlistUrl).origin;

  return body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Rewrite URIs embedded in tag attributes (keys, media renditions, maps).
      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/g, (_, uri) => {
          const abs = uri.startsWith('http') ? uri : uri.startsWith('/') ? origin + uri : baseDir + uri;
          return `URI="/api/hls?url=${encodeURIComponent(abs)}"`;
        });
      }

      const abs = trimmed.startsWith('http')
        ? trimmed
        : trimmed.startsWith('/')
        ? origin + trimmed
        : baseDir + trimmed;
      return `/api/hls?url=${encodeURIComponent(abs)}`;
    })
    .join('\n');
}

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'missing url' });

  const target = decodeURIComponent(url);

  const headers = { ...VIDLINK_HEADERS, Accept: '*/*' };
  if (req.headers.range) headers.Range = req.headers.range;

  try {
    const upstream = await fetch(target, { headers, redirect: 'follow' });
    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    const isPlaylist =
      contentType.includes('mpegurl') ||
      contentType.includes('m3u8') ||
      /\.m3u8?(\?|$)/i.test(target.split('?')[0]);

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (isPlaylist) {
      const body = await upstream.text();
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(rewritePlaylist(body, target));
    }

    // Binary media (MP4 / TS segments): forward status + range headers, stream body.
    res.statusCode = upstream.status;
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    for (const h of ['content-length', 'content-range', 'accept-ranges']) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (!upstream.body) return res.end();
    // Pipe the web stream straight to the Node response with native backpressure
    // (far faster than reading/writing chunk-by-chunk).
    const nodeStream = Readable.fromWeb(upstream.body);
    req.on('close', () => nodeStream.destroy());
    nodeStream.on('error', () => { if (!res.writableEnded) res.end(); });
    return nodeStream.pipe(res);
  } catch (err) {
    console.error('[api/hls]', err.message);
    if (!res.headersSent) res.status(502).json({ error: err.message });
    else res.end();
  }
}
