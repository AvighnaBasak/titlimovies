import BrowsePage from "../components/BrowsePage";
import { TV_ROWS, TV_GENRES } from "../lib/categories";

export default function TVShowsPage() {
  return <BrowsePage heading="TV Shows" mediaType="tv" rows={TV_ROWS} genres={TV_GENRES} />;
}
