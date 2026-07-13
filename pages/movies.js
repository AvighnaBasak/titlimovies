import BrowsePage from "../components/BrowsePage";
import { MOVIE_ROWS, MOVIE_GENRES } from "../lib/categories";

export default function MoviesPage() {
  return <BrowsePage heading="Movies" mediaType="movie" rows={MOVIE_ROWS} genres={MOVIE_GENRES} />;
}
