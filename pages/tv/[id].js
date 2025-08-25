import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import SearchBar from "../../components/SearchBar";
import MediaDetail from "../../components/MediaDetail";
import Player from "../../components/Player";
import SimilarMedia from "../../components/SimilarMedia";

export default function TVDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [seasons, setSeasons] = useState([]);
  const [episodes, setEpisodes] = useState([]);

  // Fetch TV show details
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/proxy?url=${encodeURIComponent(`https://api.2embed.cc/tv?imdb_id=${id}`)}`)
      .then((res) => res.json())
      .then((data) => {
        setItem(data);
        // Try to extract seasons and episodes
        if (data.seasons && Array.isArray(data.seasons)) {
          setSeasons(data.seasons);
          setSeason(data.seasons[0]?.season_number || 1);
        }
        setLoading(false);
      });
  }, [id]);

  // Fetch episodes for selected season
  useEffect(() => {
    if (!id || !season) return;
    fetch(`/api/proxy?url=${encodeURIComponent(`https://api.2embed.cc/season?imdb_id=${id}&season=${season}`)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.episodes && Array.isArray(data.episodes)) {
          setEpisodes(data.episodes);
          setEpisode(data.episodes[0]?.episode_number || 1);
        }
      });
  }, [id, season]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white">
      <Navbar />
      <SearchBar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading || !item ? (
          <div className="text-center py-10">Loading...</div>
        ) : (
          <>
            <MediaDetail item={item} type="tv" />
            <div className="my-8">
              {/* Season Selector */}
              {seasons.length > 0 && (
                <div className="mb-4 flex gap-4 items-center">
                  <label className="font-semibold">Season:</label>
                  <select
                    className="bg-gray-800 text-white rounded px-3 py-2"
                    value={season}
                    onChange={e => setSeason(Number(e.target.value))}
                  >
                    {seasons.map(s => (
                      <option key={s.season_number} value={s.season_number}>
                        {s.name || `Season ${s.season_number}`}
                      </option>
                    ))}
                  </select>
                  {/* Episode Selector */}
                  <label className="font-semibold ml-6">Episode:</label>
                  <select
                    className="bg-gray-800 text-white rounded px-3 py-2"
                    value={episode}
                    onChange={e => setEpisode(Number(e.target.value))}
                  >
                    {episodes.map(ep => (
                      <option key={ep.episode_number} value={ep.episode_number}>
                        {ep.name || `Episode ${ep.episode_number}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Player imdb_id={item.imdb_id || id} tmdb_id={item.id} type="tv" season={season} episode={episode} />
            </div>
            <SimilarMedia imdb_id={item.imdb_id || id} type="tv" />
          </>
        )}
      </div>
    </div>
  );
} 
