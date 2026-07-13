// Tiny in-process TTL cache with an LRU cap. Used to memoize upstream API
// responses (TMDB, 2embed, resolved streams) so repeat requests within the TTL
// window are served instantly instead of round-tripping to the origin.
//
// This is per-server-instance memory — good enough to smooth out the burst of
// identical requests a page load produces and to survive warm serverless reuse.

const store = new Map(); // key -> { value, expires }
const MAX_ENTRIES = 500;

export function cacheGet(key) {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return undefined;
  }
  // Refresh LRU recency.
  store.delete(key);
  store.set(key, hit);
  return hit.value;
}

export function cacheSet(key, value, ttlMs) {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expires: Date.now() + ttlMs });
}

// Deduplicate concurrent identical work: if `key` is already cached, return it;
// otherwise run `producer()` once and cache the result. In-flight promises are
// tracked so parallel callers share a single upstream request.
const inflight = new Map();

export async function cached(key, ttlMs, producer) {
  const existing = cacheGet(key);
  if (existing !== undefined) return existing;

  if (inflight.has(key)) return inflight.get(key);

  const p = (async () => {
    try {
      const value = await producer();
      cacheSet(key, value, ttlMs);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}
