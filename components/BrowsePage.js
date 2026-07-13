import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import HeroBanner from "./HeroBanner";
import MediaRow from "./MediaRow";
import Footer from "./Footer";
import { buildDiscoverPath } from "../lib/categories";

// Shared Netflix-style browse page for Movies / TV Shows. Renders a hero, a
// Genres dropdown, and a set of category rows. Selecting a genre swaps the
// curated rows for a focused, sorted set of that genre's titles.

export default function BrowsePage({ heading, mediaType, rows, genres, extraRows }) {
  const [heroItem, setHeroItem] = useState(null);
  const [rowData, setRowData] = useState({});
  const [genre, setGenre] = useState("all");
  const [loading, setLoading] = useState(true);

  // Fetch the curated rows (or a single-genre set) whenever the genre changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const activeRows =
      genre === "all"
        ? rows
        : genreRows(genres.find((g) => String(g.id) === String(genre)));

    const load = async () => {
      const results = await Promise.all(
        activeRows.map((r) =>
          fetch(buildDiscoverPath(mediaType, r.params))
            .then((res) => res.json())
            .then((d) => ({ title: r.title, items: (d.results || []).filter((i) => i.poster_path || i.backdrop_path) }))
            .catch(() => ({ title: r.title, items: [] }))
        )
      );
      if (cancelled) return;

      const map = {};
      const order = [];
      for (const r of results) {
        map[r.title] = r.items;
        order.push(r.title);
      }
      setRowData({ map, order });

      // Pick a hero from the first populated row.
      const pool = results.find((r) => r.items.length > 0)?.items || [];
      if (pool.length) setHeroItem(pool[Math.floor(Math.random() * Math.min(pool.length, 8))]);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [genre, mediaType, rows, genres]);

  // Build a couple of sorted rows for a single selected genre.
  function genreRows(g) {
    if (!g) return rows;
    return [
      { title: `Popular in ${g.name}`, params: { sort_by: "popularity.desc", "vote_count.gte": 100, with_genres: String(g.id) } },
      { title: `Top Rated ${g.name}`, params: { sort_by: "vote_average.desc", "vote_count.gte": 500, with_genres: String(g.id) } },
      { title: `New in ${g.name}`, params: { sort_by: mediaType === "tv" ? "first_air_date.desc" : "primary_release_date.desc", "vote_count.gte": 50, with_genres: String(g.id) } },
    ];
  }

  const heroType = mediaType === "tv" ? "tv" : "movie";

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-900 to-black md:bg-[#141414] md:bg-none text-white overflow-x-hidden font-netflix">
      <Navbar />

      {/* Heading + Genres dropdown. Overlaid on the hero (Netflix-style) when a
          hero is shown; otherwise sits in a compact band under the nav. */}
      {heroItem && genre === "all" ? (
        <div className="relative">
          <HeroBanner item={heroItem} type={heroType} mobileItem={heroItem} />
          <div className="absolute top-20 md:top-28 left-4 md:left-12 z-30 flex items-center gap-3">
            <h1 className="text-2xl md:text-4xl font-bold drop-shadow-lg">{heading}</h1>
            <GenreSelect genre={genre} setGenre={setGenre} genres={genres} />
          </div>
        </div>
      ) : (
        <div className="pt-24 md:pt-28 px-4 md:px-12 flex items-center gap-3 mb-4">
          <h1 className="text-2xl md:text-4xl font-bold">{heading}</h1>
          <GenreSelect genre={genre} setGenre={setGenre} genres={genres} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="relative z-10 -mt-6 md:-mt-2 pb-12 space-y-[2px] md:space-y-4">
          {extraRows}
          {(rowData.order || []).map((title) => (
            <MediaRow key={title} title={title} items={rowData.map[title]} type={heroType} variant="landscape" />
          ))}
        </div>
      )}

      <Footer />
    </div>
  );
}

function GenreSelect({ genre, setGenre, genres }) {
  return (
    <div className="relative">
      <select
        value={genre}
        onChange={(e) => setGenre(e.target.value)}
        className="appearance-none bg-black/50 border border-white/40 rounded px-3 py-1.5 pr-8 text-sm md:text-base text-white cursor-pointer focus:outline-none focus:border-white"
      >
        <option value="all" className="bg-[#141414]">Genres</option>
        {genres.map((g) => (
          <option key={g.id} value={g.id} className="bg-[#141414]">{g.name}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-white">
        <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
      </div>
    </div>
  );
}
