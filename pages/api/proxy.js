// Generic JSON proxy for third-party APIs (2embed, ipapi, etc.), with caching
// so repeated identical calls within the TTL are served from memory.

import { cached } from '../../lib/cache';

const TTL = 1000 * 60 * 5; // 5 minutes

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url param' });

  const target = decodeURIComponent(url);

  try {
    const data = await cached(`proxy:${target}`, TTL, async () => {
      const response = await fetch(target, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (!response.ok) throw Object.assign(new Error('External API error'), { status: response.status });
      return response.json();
    });

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: 'Proxy error', details: err.message });
  }
}
