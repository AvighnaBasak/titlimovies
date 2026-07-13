// Server-side TMDB helpers with caching. Keeps the API key on the server and
// memoizes responses so repeated identical lookups (e.g. imdb->tmdb resolution,
// details fetched by several components) hit memory instead of TMDB.

import { cached } from './cache';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TTL = 1000 * 60 * 10; // 10 minutes

export function getApiKey() {
  return process.env.TMDB_API_KEY;
}

// Fetch a TMDB path (e.g. "/movie/550") with arbitrary query params.
export async function tmdbFetch(tmdbPath, params = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('TMDB_API_KEY is not configured');

  const qs = new URLSearchParams({ api_key: apiKey, ...params });
  const url = `${TMDB_BASE}${tmdbPath}?${qs.toString()}`;
  const cacheKey = `tmdb:${tmdbPath}?${new URLSearchParams(params).toString()}`;

  return cached(cacheKey, TTL, async () => {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw Object.assign(new Error('TMDB error'), { status: res.status });
    return res.json();
  });
}

// Resolve an IMDb id (tt…) to a TMDB numeric id for the given media type.
export async function imdbToTmdb(imdbId, type) {
  const data = await tmdbFetch(`/find/${imdbId}`, { external_source: 'imdb_id' });
  const list = type === 'tv' ? data.tv_results : data.movie_results;
  if (list && list.length > 0) return list[0].id;
  // Fall back to the other bucket in case the caller guessed the type wrong.
  const other = type === 'tv' ? data.movie_results : data.tv_results;
  return other && other.length > 0 ? other[0].id : null;
}

// Normalize an incoming id (imdb or tmdb) to a numeric TMDB id.
export async function toTmdbId(id, type) {
  if (id == null) return null;
  const str = String(id);
  if (str.startsWith('tt')) return imdbToTmdb(str, type);
  return str;
}
