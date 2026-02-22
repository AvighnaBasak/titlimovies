// Server-side TMDB proxy — keeps the API key hidden from the client.
// Client sends: /api/tmdb?path=/tv/12345&append_to_response=credits,videos
// Server calls: https://api.themoviedb.org/3/tv/12345?api_key=SECRET&append_to_response=credits,videos

export default async function handler(req, res) {
    const { path, ...params } = req.query;

    if (!path) {
        return res.status(400).json({ error: 'Missing "path" query parameter. Example: /api/tmdb?path=/movie/popular&page=1' });
    }

    // Build the TMDB URL with the server-side API key
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
        console.error('TMDB_API_KEY is not set in environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // Construct query string from remaining params
    const queryParams = new URLSearchParams({ api_key: apiKey, ...params });
    const tmdbUrl = `https://api.themoviedb.org/3${path}?${queryParams.toString()}`;

    try {
        const response = await fetch(tmdbUrl, {
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'TMDB API error', status: response.status });
        }

        const data = await response.json();

        // Cache for 5 minutes
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        res.setHeader('Content-Type', 'application/json');

        return res.status(200).json(data);
    } catch (err) {
        console.error('TMDB proxy error:', err);
        return res.status(500).json({ error: 'TMDB proxy error', details: err.message });
    }
}
