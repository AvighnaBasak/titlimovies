import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import SearchBar from "../../components/SearchBar";
import MediaDetail from "../../components/MediaDetail";
import Player from "../../components/Player";
import SimilarMedia from "../../components/SimilarMedia";

export default function MovieDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/proxy?url=${encodeURIComponent(`https://api.2embed.cc/movie?imdb_id=${id}`)}`)
      .then((res) => res.json())
      .then((data) => {
        setItem(data);
        setLoading(false);
      });
  }, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white">
      <Navbar />
      <SearchBar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading || !item ? (
          <div className="text-center py-10">Loading...</div>
        ) : (
          <>
            <MediaDetail item={item} type="movie" />
            <div className="my-8">
              <Player imdb_id={item.imdb_id || id} tmdb_id={item.id} type="movie" />
            </div>
            <SimilarMedia imdb_id={item.imdb_id || id} type="movie" />
          </>
        )}
      </div>
    </div>
  );
} 
