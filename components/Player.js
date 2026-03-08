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

// Common ad/popup/adult URL patterns to block
const AD_PATTERNS = [
  // Ad networks
  'doubleclick', 'googlesyndication', 'adservice', 'adsystem',
  'popads', 'popcash', 'propellerads', 'exoclick', 'juicyads',
  'trafficjunky', 'tsyndicate', 'clickadu', 'hilltopads',
  'adsterra', 'a-ads', 'ad.plus', 'admaven', 'monetag',
  'profitablecpm', 'clickaine', 'richads', 'pushground',
  'evadav', 'galaksion', 'roller-ads', 'clickadilla',
  'revcontent', 'mgid', 'taboola', 'outbrain', 'zergnet',
  // Gambling / betting
  'betting', 'casino', 'poker', 'slots', '1xbet', 'stake.com',
  'melbet', 'mostbet', 'pin-up', 'linebet', 'betwinner',
  'bet365', 'betway', '22bet', 'parimatch', 'megapari',
  // Adult / dating / livestream
  'tango', 'chaturbate', 'stripchat', 'bongacams', 'cam4',
  'livejasmin', 'camsoda', 'myfreecams', 'flirt4free',
  'pornhub', 'xvideos', 'xhamster', 'xnxx', 'redtube',
  'youporn', 'tube8', 'spankbang', 'eporner', 'hentai',
  'onlyfans', 'fansly', 'manyvids', 'clips4sale',
  'ashleymadison', 'adultfriendfinder', 'banglocals',
  'hookup', 'fuckbook', 'sexting', 'milf', 'meetandfuck',
  'jerkmate', 'cams.com', 'imlive', 'streamate', 'flirt',
  'datinggold', 'datingpartner', 'datingsphere',
  // Scam / malware / phishing
  'virus', 'malware', 'phishing', 'survey', 'prize',
  'congratulations', 'you-won', 'giftcard', 'free-iphone',
  'spin-wheel', 'lucky-visitor', 'claimreward',
  // Known VidFast popup domains
  'shopping-market.pro', 'rkv1.com', 'viifwjox.com',
  'top-r3v3nue.com', 'r3v3nue',
  // Suspicious protocols
  'about:blank', 'javascript:', 'blob:', 'data:'
];

function isAdUrl(url) {
  if (!url || typeof url !== 'string') return true; // Block empty/null popups
  const lower = url.toLowerCase();
  return AD_PATTERNS.some(p => lower.includes(p));
}

export default function Player({ imdb_id, tmdb_id, type, season, episode, onEpisodeChange }) {
  const id = imdb_id || tmdb_id;
  const currentEpisodeRef = useRef(episode);
  const currentSeasonRef = useRef(season);
  const [shieldActive, setShieldActive] = useState(true);

  // Keep refs in sync with props
  useEffect(() => {
    currentEpisodeRef.current = episode;
    currentSeasonRef.current = season;
  }, [episode, season]);

  // === POPUP BLOCKER: Override window.open while player is mounted ===
  useEffect(() => {
    const originalOpen = window.open;

    window.open = function (url, target, features) {
      // Block known ad URLs and suspicious popups
      if (!url || isAdUrl(url)) {
        console.log('[PopupBlocker] Blocked ad popup:', url?.substring(0, 80));
        return null;
      }
      // Allow legitimate opens (e.g., external links user actually clicked)
      return originalOpen.call(this, url, target, features);
    };

    // Block iframe-initiated top-level navigation (common ad trick)
    const blockNavigation = (e) => {
      // Only block if it's from an iframe trying to navigate the top frame
      if (e.target !== window) {
        e.preventDefault();
        console.log('[PopupBlocker] Blocked top-level navigation attempt');
      }
    };
    window.addEventListener('beforeunload', blockNavigation);

    return () => {
      window.open = originalOpen;
      window.removeEventListener('beforeunload', blockNavigation);
    };
  }, []);

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

  // === Click Shield: absorb the first click (usually triggers popup) ===
  // After first click, the shield disappears and subsequent clicks go to the player
  const handleShieldClick = () => {
    setShieldActive(false);
  };

  // Auto-remove shield after 3 seconds if user hasn't clicked yet
  // (video auto-plays anyway, shield is just for first-interaction protection)
  useEffect(() => {
    if (!shieldActive) return;
    const timer = setTimeout(() => setShieldActive(false), 3000);
    return () => clearTimeout(timer);
  }, [shieldActive]);

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

        {/* Click shield: absorbs the first click which usually triggers a popup.
            Auto-removes after 3s or on first tap. Video auto-plays so no interaction needed. */}
        {shieldActive && (
          <div
            className="absolute inset-0 z-10 cursor-pointer"
            onClick={handleShieldClick}
            style={{ background: 'transparent' }}
          />
        )}
      </div>
    </div>
  );
}
