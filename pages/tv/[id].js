import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import SearchBar from "../../components/SearchBar";
import MediaDetail from "../../components/MediaDetail";
import Player from "../../components/Player";
import SimilarMedia from "../../components/SimilarMedia";

export default function TVDetailPage() {
  const router = useRouter();
  const { id, season: qSeason, episode: qEpisode } = router.query;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [seasons, setSeasons] = useState([]);
  const [episodes, setEpisodes] = useState([]);

  // Sync with URL params
  useEffect(() => {
    if (qSeason) setSeason(Number(qSeason));
    if (qEpisode) setEpisode(Number(qEpisode));
  }, [qSeason, qEpisode]);

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

  const isImdb = id && id.startsWith("tt");

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center z-50 p-[5px]">

      {/* Minimal Controls Overlay */}
      {seasons.length > 0 && (
        <div className="absolute top-4 left-4 z-50 flex gap-4 bg-black/50 p-2 rounded backdrop-blur-sm hover:opacity-100 opacity-0 transition-opacity duration-300">
          <select
            className="bg-transparent text-white border border-white/20 rounded px-2 py-1 text-sm outline-none"
            value={season}
            onChange={e => setSeason(Number(e.target.value))}
          >
            {seasons.map(s => (
              <option key={s.season_number} value={s.season_number} className="bg-black text-white">
                {s.name || `Season ${s.season_number}`}
              </option>
            ))}
          </select>

          <select
            className="bg-transparent text-white border border-white/20 rounded px-2 py-1 text-sm outline-none"
            value={episode}
            onChange={e => setEpisode(Number(e.target.value))}
          >
            {episodes.map(ep => (
              <option key={ep.episode_number} value={ep.episode_number} className="bg-black text-white">
                {ep.name || `Ep ${ep.episode_number}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Full Screen Player Container */}
      <div className="w-full h-full">
        <Player
          imdb_id={isImdb ? id : item?.imdb_id}
          tmdb_id={!isImdb ? id : item?.id}
          type="tv"
          season={season}
          episode={episode}
        />
      </div>
    </div>
  );
} 
