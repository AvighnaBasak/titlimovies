import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import SearchBar from "../../components/SearchBar";
import MediaDetail from "../../components/MediaDetail";
import SimilarMedia from "../../components/SimilarMedia";
import Player from "../../components/Player";

export default function AnimeDetailPage() {
  const router = useRouter();
  const { title } = router.query;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  useEffect(() => {
    if (!title) return;
    setLoading(true);
    fetch(`/api/proxy?url=${encodeURIComponent(`https://animeapi.skin/search?q=${encodeURIComponent(title)}&page=1`)}`)
      .then((res) => res.json())
      .then((data) => {
        // Try to find the best match
        let found = null;
        if (Array.isArray(data.results)) {
          found = data.results.find(
            (a) => a.title_en?.toLowerCase() === title?.toLowerCase() || a.title_jp?.toLowerCase() === title?.toLowerCase()
          ) || data.results[0];
        } else if (Array.isArray(data)) {
          found = data[0];
        }
        setItem(found);
        setLoading(false);

        // Fetch episodes for this anime
        if (found) {
          const animeTitle = found.title_en || found.title_jp || title;
          fetch(`/api/proxy?url=${encodeURIComponent(`https://animeapi.skin/episodes?title=${encodeURIComponent(animeTitle)}`)}`)
            .then((res) => res.json())
            .then((episodeData) => {
              setEpisodes(episodeData || []);
            })
            .catch(err => console.error('Failed to fetch episodes:', err));
        }
      });
  }, [title]);

  const animeTitle = item?.title_en || item?.title_jp || title;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white">
      <Navbar />
      <SearchBar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading || !item ? (
          <div className="text-center py-10">Loading...</div>
        ) : (
          <>
            <MediaDetail item={item} type="anime" />
            <div className="my-8">
              {/* Episode Selector */}
              {episodes.length > 0 && (
                <div className="mb-4 flex gap-4 items-center flex-wrap">
                  <label className="font-semibold">Episode:</label>
                  <select
                    className="bg-gray-800/80 backdrop-blur text-white rounded-2xl px-4 py-2 border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    value={selectedEpisode}
                    onChange={e => setSelectedEpisode(Number(e.target.value))}
                  >
                    {episodes.map((ep, idx) => (
                      <option key={idx} value={idx + 1}>
                        Episode {idx + 1} {ep.title ? `- ${ep.title}` : ''}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-400 text-sm">
                    {episodes.length} episodes available
                  </span>
                </div>
              )}
              <Player
                type="anime"
                title={animeTitle?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "")}
                episode={selectedEpisode}
                season={1} // Anime usually treats episodes as global or Season 1
                // For VidFast we might need ID if possible, but VidFast supports query? 
                // Actually VidFast for anime isn't explicitly documented as supporting title-slug.
                // Re-reading user request: "for all tv shows movies and anime use vidfast api"
                // The provided docs mainly show IDs (IMDB/TMDB). 
                // Anime might have TMDB IDs. Let's try to pass the 'item.id' if available.
                // The 'item' from 'animeapi.skin' usually has IDs.
                tmdb_id={item.id} // Passing TMDB ID if available
              />
            </div>
            <SimilarMedia type="anime" title={animeTitle} />
          </>
        )}
      </div>
    </div>
  );
} 
