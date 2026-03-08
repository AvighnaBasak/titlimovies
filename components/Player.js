import { useEffect, useRef, useCallback, useState } from "react";

const VIDFAST_ORIGINS = [
  'https://vidfast.pro',
  'https://vidfast.in',
  'https://vidfast.io',
  'https://vidfast.me',
  'https://vidfast.net',
  'https://vidfast.pm',
  'https://vidfast.xyz'
];

export default function Player({ imdb_id, tmdb_id, type, season, episode, onEpisodeChange }) {
  const id = imdb_id || tmdb_id;
  const currentEpisodeRef = useRef(episode);
  const currentSeasonRef = useRef(season);
  const iframeRef = useRef(null);
  const [iframeKey, setIframeKey] = useState(0);

  // Keep refs in sync with props
  useEffect(() => {
    currentEpisodeRef.current = episode;
    currentSeasonRef.current = season;
  }, [episode, season]);

  const getVidFastUrl = () => {
    const baseUrl = "https://vidfast.pro";
    const params = new URLSearchParams({
      autoPlay: "true",
      theme: "8B5CF6",
      title: "true",
      poster: "true",
      nextButton: "true",
      autoNext: "true"
    });

    if (type === "movie" && id) {
      return `${baseUrl}/movie/${id}?${params.toString()}`;
    } else if (type === "tv" && id && season && episode) {
      return `${baseUrl}/tv/${id}/${season}/${episode}?${params.toString()}`;
    }
    return "";
  };

  const src = getVidFastUrl();

  // === Page Visibility: recover from popup/tab-switch corruption ===
  useEffect(() => {
    if (!src) return;

    let hiddenAt = null;

    const handleVisibility = () => {
      if (document.hidden) {
        // Page became hidden (popup opened, tab switched, etc.)
        hiddenAt = Date.now();
      } else if (hiddenAt) {
        // Page became visible again
        const hiddenDuration = Date.now() - hiddenAt;
        hiddenAt = null;

        // If hidden for more than 500ms (likely a popup, not a quick alt-tab),
        // reload the iframe to reset any corrupted playback state (2x speed, etc.)
        if (hiddenDuration > 500) {
          setTimeout(() => {
            setIframeKey(prev => prev + 1);
          }, 1000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [src]);

  // === Save per-episode progress to localStorage ===
  const saveEpisodeProgress = useCallback((showId, s, ep, watched, duration) => {
    if (!showId || !duration || duration <= 0) return;
    try {
      const allProgress = JSON.parse(localStorage.getItem('episodeProgress') || '{}');
      const progressKey = `${showId}_s${s}_e${ep}`;
      const percentage = Math.min((watched / duration) * 100, 100);

      allProgress[progressKey] = {
        showId: String(showId),
        season: Number(s),
        episode: Number(ep),
        time: watched,
        duration,
        progress: percentage,
        updatedAt: Date.now()
      };

      localStorage.setItem('episodeProgress', JSON.stringify(allProgress));
      window.dispatchEvent(new Event('episode-progress-update'));
    } catch (e) {
      console.error("[Player] Failed to save episode progress:", e);
    }
  }, []);

  // === Update continue watching entry ===
  const updateContinueWatching = useCallback((watched, duration) => {
    if (!duration || duration <= 0) return;
    try {
      const progress = (watched / duration) * 100;
      const isFinished = progress > 90;
      const history = JSON.parse(localStorage.getItem('continueWatching') || '[]');
      const itemIndex = history.findIndex(i => String(i.id) == String(id));

      if (itemIndex > -1) {
        if (isFinished) {
          history.splice(itemIndex, 1);
        } else {
          history[itemIndex].last_watched = Date.now();
          history[itemIndex].progress = progress;
          if (type === 'tv') {
            history[itemIndex].season = currentSeasonRef.current;
            history[itemIndex].episode = currentEpisodeRef.current;
          }
        }
        localStorage.setItem('continueWatching', JSON.stringify(history));
        window.dispatchEvent(new Event('continue-watching-update'));
      }
    } catch (e) {
      console.error("[Player] Failed to update continue watching:", e);
    }
  }, [id, type]);

  // === Main message listener for VidFast postMessage API ===
  useEffect(() => {
    const handleMessage = ({ origin, data }) => {
      if (!VIDFAST_ORIGINS.includes(origin) || !data) return;

      // ─── Handle PLAYER_EVENT (primary VidFast event format) ───
      if (data.type === 'PLAYER_EVENT' && data.data) {
        const evt = data.data;
        const currentTime = evt.currentTime;
        const duration = evt.duration;

        // Detect episode change
        if (type === 'tv' && evt.season !== undefined && evt.episode !== undefined) {
          const reportedSeason = Number(evt.season);
          const reportedEpisode = Number(evt.episode);

          if (reportedEpisode !== currentEpisodeRef.current || reportedSeason !== currentSeasonRef.current) {
            console.log(`[Player] Episode changed: S${currentSeasonRef.current}E${currentEpisodeRef.current} → S${reportedSeason}E${reportedEpisode}`);
            currentSeasonRef.current = reportedSeason;
            currentEpisodeRef.current = reportedEpisode;
            if (onEpisodeChange) {
              onEpisodeChange(reportedSeason, reportedEpisode);
            }
          }
        }

        // Save progress
        if (currentTime != null && duration != null && duration > 0) {
          if (type === 'tv') {
            saveEpisodeProgress(id, currentSeasonRef.current, currentEpisodeRef.current, currentTime, duration);
          }
          updateContinueWatching(currentTime, duration);
        }
      }

      // ─── Handle MEDIA_DATA (secondary/legacy format) ───
      if (data.type === 'MEDIA_DATA' && data.data) {
        localStorage.setItem('vidFastProgress', JSON.stringify(data.data));

        const progressData = data.data;
        const watched = progressData.watched ?? progressData.time ?? progressData.currentTime;
        const duration = progressData.duration;

        if (type === 'tv' && watched != null && duration != null && duration > 0) {
          saveEpisodeProgress(id, currentSeasonRef.current, currentEpisodeRef.current, watched, duration);
          updateContinueWatching(watched, duration);
        }

        if (type === 'tv') {
          const s = progressData.last_season_watched ?? progressData.season;
          const ep = progressData.last_episode_watched ?? progressData.episode;
          if (s !== undefined && ep !== undefined) {
            const rS = Number(s);
            const rE = Number(ep);
            if (rE !== currentEpisodeRef.current || rS !== currentSeasonRef.current) {
              currentSeasonRef.current = rS;
              currentEpisodeRef.current = rE;
              if (onEpisodeChange) onEpisodeChange(rS, rE);
            }
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [id, type, onEpisodeChange, saveEpisodeProgress, updateContinueWatching]);

  if (!src) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-3xl flex items-center justify-center text-gray-400">
        <p>Video source not available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="relative w-full h-full rounded-xl overflow-hidden bg-black shadow-2xl">
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={src}
          className="w-full h-full"
          style={{ border: 'none', minHeight: '100%', minWidth: '100%' }}
          frameBorder="0"
          allowFullScreen
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope"
          referrerPolicy="origin"
          loading="eager"
          title="VidFast Player"
        />
      </div>
    </div>
  );
}
