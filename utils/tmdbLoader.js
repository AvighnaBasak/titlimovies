/**
 * Custom TMDB Image Loader for Next.js <Image /> components.
 *
 * Instead of letting Next.js download, resize, and cache TMDB images
 * (which exhausts hosting platform image optimization quotas), this loader
 * returns a direct URL to TMDB's own CDN with the appropriate size bucket.
 *
 * Supports both:
 *   - Relative paths: "/abc123.jpg"
 *   - Full TMDB URLs: "https://image.tmdb.org/t/p/w500/abc123.jpg"
 *     (automatically extracts the relative path)
 */
export default function tmdbLoader({ src, width }) {
    // Extract relative path if a full TMDB URL was passed
    let relativePath = src;
    if (src.startsWith('https://image.tmdb.org/t/p/')) {
        // Strip "https://image.tmdb.org/t/p/{size}" prefix to get "/filename.jpg"
        const match = src.match(/https:\/\/image\.tmdb\.org\/t\/p\/[^/]+(\/.+)$/);
        if (match) {
            relativePath = match[1];
        }
    }

    // Ensure leading slash
    if (!relativePath.startsWith('/')) {
        relativePath = `/${relativePath}`;
    }

    // Map requested width to TMDB's available size buckets
    let size = 'original';
    if (width <= 92) size = 'w92';
    else if (width <= 154) size = 'w154';
    else if (width <= 185) size = 'w185';
    else if (width <= 342) size = 'w342';
    else if (width <= 500) size = 'w500';
    else if (width <= 780) size = 'w780';

    return `https://image.tmdb.org/t/p/${size}${relativePath}`;
}

/**
 * Checks whether a given image URL/path is from TMDB.
 * Use this to conditionally apply the tmdbLoader.
 */
export function isTmdbImage(src) {
    if (!src || typeof src !== 'string') return false;
    return (
        src.startsWith('https://image.tmdb.org/') ||
        (src.startsWith('/') && !src.startsWith('/placeholder') && !src.startsWith('/api'))
    );
}
