import { useEffect, useState } from "react";
import MediaGrid from "./MediaGrid";

export default function SimilarMedia({ imdb_id, type, title }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!imdb_id && !(type === "anime" && title)) return;
    setLoading(true);
    let url = "";
    if (type === "movie") {
      url = `/api/proxy?url=${encodeURIComponent(`https://api.2embed.cc/similar?imdb_id=${imdb_id}&page=1`)}`;
    } else if (type === "tv") {
      url = `/api/proxy?url=${encodeURIComponent(`https://api.2embed.cc/similartv?imdb_id=${imdb_id}&page=1`)}`;
    } else if (type === "anime") {
      url = `/api/proxy?url=${encodeURIComponent(`https://animeapi.skin/search?q=${encodeURIComponent(title)}&page=1`)}`;
    }
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.results || data || []);
        setLoading(false);
      });
  }, [imdb_id, type, title]);

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Similar Media</h2>
      {loading ? (
        <div className="text-center py-6">Loading...</div>
      ) : (
        <MediaGrid items={items} type={type} />
      )}
    </div>
  );
} 
