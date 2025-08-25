import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const TABS = ["movie", "tv", "anime"];

export default function SearchBar({ hideTypeSelector = false }) {
  const router = useRouter();
  const qType = Array.isArray(router.query.type) ? router.query.type[0] : router.query.type;
  const initialType = qType || "movie";
  const [type, setType] = useState(initialType);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!query) return setSuggestions([]);
    let url = "";
    if (type === "movie") {
      url = `/api/proxy?url=${encodeURIComponent(`https://api.2embed.cc/search?q=${encodeURIComponent(query)}&page=1`)}`;
    } else if (type === "tv") {
      url = `/api/proxy?url=${encodeURIComponent(`https://api.2embed.cc/searchtv?q=${encodeURIComponent(query)}&page=1`)}`;
    } else if (type === "anime") {
      url = `/api/proxy?url=${encodeURIComponent(`https://animeapi.skin/search?q=${encodeURIComponent(query)}&page=1`)}`;
    }
    fetch(url)
      .then((res) => res.json())
      .then((data) => setSuggestions(data.results || data || []));
  }, [query, type]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search/${encodeURIComponent(query)}?type=${type}`);
    setSuggestions([]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 py-4 md:px-4 md:py-6">
      <form onSubmit={handleSubmit} className="relative flex w-full items-center gap-2 md:gap-3 justify-center flex-wrap sm:flex-nowrap">
        {!hideTypeSelector && (
          <select
            className="bg-gray-800/80 backdrop-blur text-white rounded-2xl px-3 py-2 md:px-4 md:py-3 border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm md:text-base min-w-0 flex-shrink-0"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {TABS.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={hideTypeSelector ? "Search movies, TV, anime..." : `Search ${type}...`}
          className="flex-1 max-w-2xl min-w-0 p-2 md:p-3 rounded-2xl bg-gray-800/80 backdrop-blur text-white border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder-gray-400 text-sm md:text-base"
        />
        <button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2 md:px-6 md:py-3 rounded-2xl font-medium transition-all transform hover:scale-105 shadow-lg text-sm md:text-base flex-shrink-0">
          Search
        </button>
        {suggestions.length > 0 && (
          <div className="search-suggestions absolute top-full mt-2 left-0 right-0 bg-gray-900/95 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-700/50 max-h-72 overflow-y-auto z-50">
            {suggestions.slice(0, 8).map((item, idx) => (
              <div
                key={item.id || item.imdb_id || item.title_en || idx}
                className="px-4 py-3 hover:bg-gray-800/70 cursor-pointer transition-all text-gray-200 hover:text-white border-b border-gray-700/30 last:border-0"
                onClick={() => {
                  setSuggestions([]);
                  if (type === "movie") router.push(`/movie/${item.imdb_id || item.id}`);
                  else if (type === "tv") router.push(`/tv/${item.imdb_id || item.id}`);
                  else router.push(`/anime/${encodeURIComponent(item.title_en || item.title_jp || item.title)}`);
                }}
              >
                {item.title || item.name || item.title_en || item.title_jp}
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
