import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Player from "../../components/Player";

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

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

  // Save to Continue Watching on mount and when season/episode changes
  useEffect(() => {
    if (!id) return;

    const isImdb = id.startsWith("tt");
    const tmdbId = isImdb ? null : id;

    const saveToHistory = async () => {
      try {
        // Fetch TMDB metadata for the card
        let fetchId = tmdbId;
        let mediaType = 'tv';

        // If we have an IMDB ID, we need to find the TMDB ID first
        if (isImdb) {
          const findRes = await fetch(
            `https://api.themoviedb.org/3/find/${id}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
          );
          const findData = await findRes.json();
          if (findData.tv_results && findData.tv_results.length > 0) {
            fetchId = findData.tv_results[0].id;
          } else {
            return; // Can't find TMDB ID
          }
        }

        const res = await fetch(
          `https://api.themoviedb.org/3/tv/${fetchId}?api_key=${TMDB_API_KEY}`
        );
        const data = await res.json();
        if (!data || data.success === false) return;

        const history = JSON.parse(localStorage.getItem('continueWatching') || '[]');
        const existingIndex = history.findIndex(i => String(i.id) === String(fetchId));
        if (existingIndex > -1) {
          history.splice(existingIndex, 1);
        }

        history.unshift({
          id: data.id,
          tmdb_id: data.id,
          title: data.title || data.name,
          name: data.name || data.title,
          poster_path: data.poster_path,
          backdrop_path: data.backdrop_path,
          media_type: 'tv',
          season: season,
          episode: episode,
          progress: 5,
          last_watched: Date.now()
        });

        localStorage.setItem('continueWatching', JSON.stringify(history));
        window.dispatchEvent(new Event('continue-watching-update'));
      } catch (e) {
        console.error("Failed to save to continue watching", e);
      }
    };

    saveToHistory();
  }, [id, season, episode]);

  const isImdb = id && id.startsWith("tt");

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center z-50 p-[5px] group/player">

      {/* Back Button + Minimal Controls Overlay */}
      <div className="absolute top-4 left-4 z-50 flex gap-4 items-center bg-black/50 p-2 rounded backdrop-blur-sm opacity-0 group-hover/player:opacity-100 transition-opacity duration-300">
        <button
          onClick={() => router.push('/')}
          className="bg-black/60 hover:bg-black/90 text-white rounded-full p-2 cursor-pointer transition-colors"
          title="Back to Home"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>

        {seasons.length > 0 && (
          <>
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
          </>
        )}
      </div>

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
