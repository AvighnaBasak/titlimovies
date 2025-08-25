import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import SearchBar from "../../components/SearchBar";
import MediaGrid from "../../components/MediaGrid";

export default function SearchResults() {
  const router = useRouter();
  const { query } = router.query;
  const type = router.query.type || "movie";
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
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
      .then((data) => {
        setResults(data.results || data || []);
        setLoading(false);
      });
  }, [query, type]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white">
      <Navbar />
      <SearchBar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Search Results for &quot;{query}&quot;</h1>
        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : (
          <MediaGrid items={results} type={type} />
        )}
      </div>
    </div>
  );
} 
