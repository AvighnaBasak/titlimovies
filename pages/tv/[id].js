import { useRouter } from "next/router";
import { useEffect, useState, useCallback, useRef } from "react";
import Player from "../../components/Player";



export default function TVDetailPage() {
  const router = useRouter();
  const { id, season: qSeason, episode: qEpisode } = router.query;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [seasons, setSeasons] = useState([]);
  const [episodes, setEpisodes] = useState([]);

  // Track whether episode change came from VidFast (internal) vs user (dropdown)
  const episodeChangeSourceRef = useRef('init'); // 'init' | 'vidfast' | 'user'

  // On first load: if no season/episode in URL, try to resume from continue watching
  useEffect(() => {
    if (!id || !router.isReady) return;

    // If URL already has season & episode params, use them
    if (qSeason && qEpisode) {
      setSeason(Number(qSeason));
      setEpisode(Number(qEpisode));
      return;
    }

    // Otherwise, check continue watching for resume position
    try {
      const isImdb = id.startsWith("tt");
      const history = JSON.parse(localStorage.getItem('continueWatching') || '[]');
      let savedItem = null;
      if (isImdb) {
        savedItem = history.find(i => String(i.imdb_id) === String(id));
      }
      if (!savedItem) {
        savedItem = history.find(i => String(i.id) === String(id) || String(i.tmdb_id) === String(id));
      }

      if (savedItem && savedItem.season && savedItem.episode) {
        const s = Number(savedItem.season);
        const ep = Number(savedItem.episode);
        setSeason(s);
        setEpisode(ep);
        router.replace(`/tv/${id}?season=${s}&episode=${ep}`, undefined, { shallow: true });
      } else {
        router.replace(`/tv/${id}?season=1&episode=1`, undefined, { shallow: true });
      }
    } catch (e) {
      console.error("Failed to load resume position", e);
      router.replace(`/tv/${id}?season=1&episode=1`, undefined, { shallow: true });
    }
  }, [id, router.isReady]);

  // Sync with URL params when they change (e.g. from shallow updates)
  useEffect(() => {
    if (qSeason) setSeason(Number(qSeason));
    if (qEpisode) setEpisode(Number(qEpisode));
  }, [qSeason, qEpisode]);

  // Handle episode change FROM VidFast player (next/prev episode button in player)
  // This only updates URL + state; does NOT cause Player iframe to reload
  const handleEpisodeChange = useCallback((newSeason, newEpisode) => {
    episodeChangeSourceRef.current = 'vidfast';
    setSeason(newSeason);
    setEpisode(newEpisode);
    // Update the URL without full page navigation
    router.replace(
      `/tv/${id}?season=${newSeason}&episode=${newEpisode}`,
      undefined,
      { shallow: true }
    );
  }, [id, router]);

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
          if (!qSeason) {
            setSeason(prev => prev || data.seasons[0]?.season_number || 1);
          }
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
        let fetchId = tmdbId;

        if (isImdb) {
          const findRes = await fetch(
            `/api/tmdb?path=/find/${id}&external_source=imdb_id`
          );
          const findData = await findRes.json();
          if (findData.tv_results && findData.tv_results.length > 0) {
            fetchId = findData.tv_results[0].id;
          } else {
            return;
          }
        }

        const res = await fetch(
          `/api/tmdb?path=/tv/${fetchId}`
        );
        const data = await res.json();
        if (!data || data.success === false) return;

        const history = JSON.parse(localStorage.getItem('continueWatching') || '[]');
        const existingIndex = history.findIndex(i => String(i.id) === String(fetchId));

        let existingProgress = 5;
        if (existingIndex > -1) {
          existingProgress = history[existingIndex].progress || 5;
          history.splice(existingIndex, 1);
        }

        history.unshift({
          id: data.id,
          tmdb_id: data.id,
          imdb_id: isImdb ? id : undefined,
          title: data.title || data.name,
          name: data.name || data.title,
          poster_path: data.poster_path,
          backdrop_path: data.backdrop_path,
          media_type: 'tv',
          season: season,
          episode: episode,
          progress: existingProgress,
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

  // Handle season change from dropdown — reset episode and reload player
  const handleSeasonChange = (newSeason) => {
    episodeChangeSourceRef.current = 'user';
    setSeason(newSeason);
    setEpisode(1);
    router.replace(`/tv/${id}?season=${newSeason}&episode=1`, undefined, { shallow: true });
  };

  // Handle episode change from dropdown — reload player
  const handleEpisodeSelect = (newEpisode) => {
    episodeChangeSourceRef.current = 'user';
    setEpisode(newEpisode);
    router.replace(`/tv/${id}?season=${season}&episode=${newEpisode}`, undefined, { shallow: true });
  };

  const isImdb = id && id.startsWith("tt");

  // Only generate a new player key when the user manually changes episode (not VidFast auto-next)
  // This prevents the iframe from reloading when VidFast itself navigated
  const [playerKey, setPlayerKey] = useState('initial');
  useEffect(() => {
    if (episodeChangeSourceRef.current === 'user' || episodeChangeSourceRef.current === 'init') {
      setPlayerKey(`${season}-${episode}`);
    }
    // Reset source after processing
    episodeChangeSourceRef.current = 'init';
  }, [season, episode]);

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
              onChange={e => handleSeasonChange(Number(e.target.value))}
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
              onChange={e => handleEpisodeSelect(Number(e.target.value))}
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
          key={playerKey}
          imdb_id={isImdb ? id : item?.imdb_id}
          tmdb_id={!isImdb ? id : item?.id}
          type="tv"
          season={season}
          episode={episode}
          onEpisodeChange={handleEpisodeChange}
        />
      </div>
    </div>
  );
}
