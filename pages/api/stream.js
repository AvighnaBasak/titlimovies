// Resolve a playable stream (+ captions) for a movie/TV episode.
//
//   /api/stream?id=550&type=movie
//   /api/stream?id=1396&type=tv&season=1&episode=1
//   /api/stream?id=tt0111161&type=movie   (imdb ids are converted to tmdb)
//
// Source URLs and caption URLs are rewritten to go through our own proxies
// (/api/hls, /api/subs) so the browser never needs VidLink's referer/CORS.

import { resolveStream } from '../../lib/vidlink';
import { toTmdbId } from '../../lib/tmdb';
import { cached } from '../../lib/cache';

const STREAM_TTL = 1000 * 60 * 3; // signed URLs are short-lived; keep cache brief

export default async function handler(req, res) {
  const { id, type = 'movie', season, episode } = req.query;
  if (!id) return res.status(400).json({ error: 'missing id' });

  try {
    const tmdbId = await toTmdbId(id, type);
    if (!tmdbId) return res.status(404).json({ error: 'could not resolve TMDB id' });

    const s = type === 'tv' ? Number(season) || 1 : undefined;
    const e = type === 'tv' ? Number(episode) || 1 : undefined;

    const cacheKey = `stream:${tmdbId}:${s || ''}:${e || ''}`;
    const stream = await cached(cacheKey, STREAM_TTL, () => resolveStream(tmdbId, s, e));

    // Wrap upstream URLs in our proxies.
    const sources = stream.sources.map((src) => ({
      quality: src.quality,
      label: src.label,
      codec: src.codec,
      container: src.container,
      url: `/api/hls?url=${encodeURIComponent(src.url)}`,
    }));

    const playlist = stream.playlist
      ? `/api/hls?url=${encodeURIComponent(stream.playlist)}`
      : null;

    const captions = stream.captions.map((c, i) => ({
      language: c.language,
      type: c.type,
      url: `/api/subs?url=${encodeURIComponent(c.url)}&type=${c.type}`,
      default: /^english$/i.test(c.language),
      id: i,
    }));

    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.status(200).json({
      type: playlist ? 'hls' : 'file',
      tmdbId,
      sources,
      playlist,
      captions,
    });
  } catch (err) {
    console.error('[api/stream]', err.message);
    return res.status(502).json({ error: err.message });
  }
}
