// Server-side TMDB proxy — keeps the API key hidden and memoizes responses.
// Client sends: /api/tmdb?path=/tv/12345&append_to_response=credits,videos
// Server calls: https://api.themoviedb.org/3/tv/12345?api_key=SECRET&...

import { tmdbFetch, getApiKey } from '../../lib/tmdb';

export default async function handler(req, res) {
  const { path, ...params } = req.query;

  if (!path) {
    return res.status(400).json({ error: 'Missing "path" query parameter.' });
  }
  if (!getApiKey()) {
    console.error('TMDB_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const data = await tmdbFetch(path, params);
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: 'TMDB proxy error', status });
  }
}
