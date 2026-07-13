// Netflix-style category definitions for the Movies and TV Shows browse pages.
// Each row is a TMDB /discover query. Kept declarative so the browse page is a
// simple config-driven renderer.

export const MOVIE_GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 27, name: "Horror" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
];

export const TV_GENRES = [
  { id: 10759, name: "Action & Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 9648, name: "Mystery" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 10768, name: "War & Politics" },
];

// baseParams shared by discover rows to keep results high quality.
const q = (extra) => ({ sort_by: "popularity.desc", "vote_count.gte": 200, ...extra });

export const MOVIE_ROWS = [
  { title: "US Crime Dramas", params: q({ with_genres: "80,18", with_origin_country: "US" }) },
  { title: "Thrillers & Horror Movies", params: q({ with_genres: "53,27" }) },
  { title: "Comedies", params: q({ with_genres: "35" }) },
  { title: "Perfect Popcorn Films", params: q({ with_genres: "28,12", "vote_count.gte": 1000 }) },
  { title: "Critically Acclaimed Films", params: { sort_by: "vote_average.desc", "vote_count.gte": 3000, with_genres: "18" } },
  { title: "Sci-Fi & Fantasy", params: q({ with_genres: "878,14" }) },
  { title: "Romance Movies", params: q({ with_genres: "10749" }) },
  { title: "Family Movie Night", params: q({ with_genres: "10751,16" }) },
];

export const TV_ROWS = [
  { title: "Critically Acclaimed US TV Dramas", params: { sort_by: "vote_average.desc", "vote_count.gte": 500, with_genres: "18", with_origin_country: "US" } },
  { title: "Binge-worthy Sci-Fi & Fantasy", params: q({ with_genres: "10765" }) },
  { title: "US TV Comedies", params: q({ with_genres: "35", with_origin_country: "US" }) },
  { title: "Japanese Anime Series", params: q({ with_genres: "16", with_original_language: "ja", "vote_count.gte": 300 }) },
  { title: "Crime TV Shows", params: q({ with_genres: "80" }) },
  { title: "Reality & Competition", params: q({ with_genres: "10764", "vote_count.gte": 50 }) },
  { title: "Documentaries", params: q({ with_genres: "99", "vote_count.gte": 50 }) },
];

export function buildDiscoverPath(mediaType, params) {
  const qs = new URLSearchParams({ ...params, page: 1 }).toString();
  return `/api/tmdb?path=/discover/${mediaType}&${qs}`;
}
