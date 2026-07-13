import { useEffect, useRef, useState, useCallback } from 'react';

// Modern, Netflix-style video player.
//
// Resolves a stream from /api/stream, then plays it either through hls.js
// (type: "hls") or the native <video> element with a quality picker
// (type: "file"). Subtitle tracks come from the same resolve call and are
// served same-origin as WebVTT. If the browser can't decode the stream
// (e.g. HEVC), it offers a one-tap fallback to the source's own player.

const SKIP_SECONDS = 10;
const CONTROLS_HIDE_MS = 3000;

function formatTime(sec) {
  if (!sec || !isFinite(sec)) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')}`;
}

export default function VideoPlayer({
  id,
  type,
  season,
  episode,
  title,
  onBack,
  onProgress,
  onEnded,
  hasNext,
  onNext,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const hideTimer = useRef(null);
  const progressTimer = useRef(null);

  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fallback, setFallback] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [menu, setMenu] = useState(null); // 'subs' | 'quality' | null

  const [activeQuality, setActiveQuality] = useState(null); // source index
  const [activeSub, setActiveSub] = useState(-1); // caption index, -1 = off
  const [waiting, setWaiting] = useState(false);

  // ── Resolve the stream ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFallback(false);
    setStream(null);

    const params = new URLSearchParams({ id: String(id), type });
    if (type === 'tv') {
      params.set('season', String(season || 1));
      params.set('episode', String(episode || 1));
    }

    fetch(`/api/stream?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error || (!data.playlist && (!data.sources || data.sources.length === 0))) {
          setError(data.error || 'No playable source found');
          setLoading(false);
          return;
        }
        setStream(data);
        // Start at ~720p for a fast first frame rather than the biggest file.
        const srcs = data.sources || [];
        let startIdx = srcs.findIndex((s) => Number(s.quality) <= 720);
        if (startIdx === -1) startIdx = srcs.length - 1; // all above 720 -> smallest
        setActiveQuality(Math.max(0, startIdx));
        const def = (data.captions || []).findIndex((c) => c.default);
        setActiveSub(def); // -1 if none default
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message || 'Failed to resolve stream');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, type, season, episode]);

  // ── Attach the media source to the <video> ───────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream || fallback) return;

    let disposed = false;

    const cleanupHls = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    // Watchdog: some browsers can't decode the stream's codec (e.g. HEVC) and
    // stall silently without firing an 'error'. If nothing has loaded after a
    // grace period, fall back to the source's own player.
    let watchdog = setTimeout(() => {
      if (video.readyState < 2 && video.currentTime === 0) setFallback(true);
    }, 12000);
    const clearWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = null;
    };
    video.addEventListener('canplay', clearWatchdog, { once: true });
    video.addEventListener('loadeddata', clearWatchdog, { once: true });

    const attach = async () => {
      cleanupHls();

      if (stream.type === 'hls' && stream.playlist) {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = stream.playlist; // Safari native HLS
        } else {
          const Hls = (await import('hls.js')).default;
          if (disposed) return;
          if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
            hls.loadSource(stream.playlist);
            hls.attachMedia(video);
            hls.on(Hls.Events.ERROR, (_, data) => {
              if (data.fatal) setFallback(true);
            });
            hlsRef.current = hls;
          } else {
            setFallback(true);
          }
        }
      } else {
        // Progressive MP4 by quality.
        const src = stream.sources[activeQuality] || stream.sources[0];
        if (src) video.src = src.url;
      }
      video.play().catch(() => {});
    };

    attach();
    return () => {
      disposed = true;
      if (watchdog) clearTimeout(watchdog);
      video.removeEventListener('canplay', clearWatchdog);
      video.removeEventListener('loadeddata', clearWatchdog);
      cleanupHls();
    };
    // activeQuality handled separately for seamless switching
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, fallback]);

  // ── Seamless quality switch for progressive MP4 ──────────────────────
  const switchQuality = (idx) => {
    const video = videoRef.current;
    if (!video || !stream || stream.type !== 'file') return;
    const wasPlaying = !video.paused;
    const t = video.currentTime;
    setActiveQuality(idx);
    video.src = stream.sources[idx].url;
    video.load();
    const restore = () => {
      video.currentTime = t;
      if (wasPlaying) video.play().catch(() => {});
      video.removeEventListener('loadedmetadata', restore);
    };
    video.addEventListener('loadedmetadata', restore);
    setMenu(null);
  };

  // ── Subtitle track application ───────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = i === activeSub ? 'showing' : 'disabled';
    }
  }, [activeSub, stream]);

  // ── Video element event wiring ───────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => {
      setCurrent(video.currentTime);
      if (video.buffered.length) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onMeta = () => setDuration(video.duration);
    const onWaiting = () => setWaiting(true);
    const onPlaying = () => setWaiting(false);
    const onVol = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };
    const onErr = () => setFallback(true);
    const onEnd = () => {
      setPlaying(false);
      if (onEnded) onEnded();
      else if (hasNext && onNext) onNext();
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('volumechange', onVol);
    video.addEventListener('error', onErr);
    video.addEventListener('ended', onEnd);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('volumechange', onVol);
      video.removeEventListener('error', onErr);
      video.removeEventListener('ended', onEnd);
    };
  }, [stream, hasNext, onNext, onEnded]);

  // ── Report progress to parent (continue-watching) every few seconds ──
  useEffect(() => {
    if (!onProgress) return;
    progressTimer.current = setInterval(() => {
      const video = videoRef.current;
      if (video && video.duration > 0 && !video.paused) {
        onProgress(video.currentTime, video.duration);
      }
    }, 5000);
    return () => clearInterval(progressTimer.current);
  }, [onProgress]);

  // ── Controls auto-hide ───────────────────────────────────────────────
  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false);
        setMenu(null);
      }
    }, CONTROLS_HIDE_MS);
  }, []);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // ── Player actions ───────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };
  const seek = (t) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, Math.min(t, v.duration || t));
  };
  const skip = (delta) => seek((videoRef.current?.currentTime || 0) + delta);
  const setVol = (val) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted = val === 0;
  };
  const toggleMute = () => {
    const v = videoRef.current;
    if (v) v.muted = !v.muted;
  };
  const toggleFull = () => {
    const el = containerRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          skip(SKIP_SECONDS);
          break;
        case 'ArrowLeft':
          skip(-SKIP_SECONDS);
          break;
        case 'ArrowUp':
          setVol(Math.min(1, (videoRef.current?.volume || 0) + 0.1));
          break;
        case 'ArrowDown':
          setVol(Math.max(0, (videoRef.current?.volume || 0) - 0.1));
          break;
        case 'f':
          toggleFull();
          break;
        case 'm':
          toggleMute();
          break;
        case 'Escape':
          if (!document.fullscreenElement && onBack) onBack();
          break;
        default:
          return;
      }
      showControls();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showControls, onBack]);

  // ── Fallback: play in the source's own player (handles HEVC etc.) ────
  if (fallback) {
    const src =
      type === 'movie'
        ? `https://vidlink.pro/movie/${stream?.tmdbId || id}?primaryColor=8b5cf6&autoplay=true`
        : `https://vidlink.pro/tv/${stream?.tmdbId || id}/${season || 1}/${episode || 1}?primaryColor=8b5cf6&autoplay=true`;
    return (
      <div ref={containerRef} className="relative w-full h-full bg-black">
        <BackButton onBack={onBack} visible />
        <iframe
          src={src}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          title="Player"
        />
      </div>
    );
  }

  const captions = stream?.captions || [];
  const sources = stream?.sources || [];
  const progressPct = duration ? (current / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden select-none"
      onMouseMove={showControls}
      onTouchStart={showControls}
      style={{ cursor: controlsVisible ? 'default' : 'none' }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline
        autoPlay
        preload="auto"
        onClick={togglePlay}
        crossOrigin="anonymous"
      >
        {captions.map((c, i) => (
          <track
            key={i}
            kind="subtitles"
            src={c.url}
            srcLang={c.type}
            label={c.language}
            default={i === activeSub}
          />
        ))}
      </video>

      {/* Loading / buffering */}
      {(loading || waiting) && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 border-4 border-white/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
          <p className="text-white/80 text-lg">Couldn&apos;t load this title.</p>
          <p className="text-white/40 text-sm max-w-md">{error}</p>
          <button
            onClick={() => setFallback(true)}
            className="mt-2 bg-white text-black font-semibold px-5 py-2 rounded"
          >
            Try alternate player
          </button>
        </div>
      )}

      {/* Center play/pause ripple (tap target on mobile) */}
      {!loading && !error && !playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center pointer-events-auto"
          aria-label="Play"
        >
          <span className="w-20 h-20 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
            <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}

      {/* Top gradient + back button + title */}
      <div
        className={`absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <BackButton onBack={onBack} visible={controlsVisible} />
      {title && (
        <div
          className={`absolute top-5 left-20 right-6 text-white font-semibold text-lg drop-shadow truncate transition-opacity duration-300 ${
            controlsVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {title}
        </div>
      )}

      {/* Bottom controls */}
      <div
        className={`absolute bottom-0 inset-x-0 px-4 md:px-8 pb-4 pt-16 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Seek bar */}
        <div
          className="relative h-1.5 group/seek mb-3 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - rect.left) / rect.width) * duration);
          }}
        >
          <div className="absolute inset-0 rounded-full bg-white/25" />
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/40" style={{ width: `${bufferedPct}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full bg-purple-500" style={{ width: `${progressPct}%` }} />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-purple-500 shadow opacity-0 group-hover/seek:opacity-100"
            style={{ left: `calc(${progressPct}% - 7px)` }}
          />
        </div>

        {/* Buttons row */}
        <div className="flex items-center gap-4 text-white">
          <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>
            ) : (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>

          <button onClick={() => skip(-SKIP_SECONDS)} aria-label="Rewind 10s">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => skip(SKIP_SECONDS)} aria-label="Forward 10s">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2 group/vol">
            <button onClick={toggleMute} aria-label="Mute">
              {muted || volume === 0 ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l4-4m0 4l-4-4" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.657 6.343a8 8 0 010 11.314M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={(e) => setVol(Number(e.target.value))}
              className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-purple-500 cursor-pointer"
            />
          </div>

          <span className="text-sm text-white/90 tabular-nums">
            {formatTime(current)} <span className="text-white/40">/ {formatTime(duration)}</span>
          </span>

          <div className="flex-1" />

          {/* Subtitles menu */}
          {captions.length > 0 && (
            <div className="relative">
              <button onClick={() => setMenu(menu === 'subs' ? null : 'subs')} aria-label="Subtitles">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path strokeLinecap="round" d="M7 15h4m2 0h4M7 11h2m2 0h6" /></svg>
              </button>
              {menu === 'subs' && (
                <Menu title="Subtitles">
                  <MenuItem active={activeSub === -1} onClick={() => { setActiveSub(-1); setMenu(null); }}>
                    Off
                  </MenuItem>
                  {captions.map((c, i) => (
                    <MenuItem key={i} active={activeSub === i} onClick={() => { setActiveSub(i); setMenu(null); }}>
                      {c.language}
                    </MenuItem>
                  ))}
                </Menu>
              )}
            </div>
          )}

          {/* Quality menu (progressive MP4 only) */}
          {stream?.type === 'file' && sources.length > 1 && (
            <div className="relative">
              <button onClick={() => setMenu(menu === 'quality' ? null : 'quality')} aria-label="Quality">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
              </button>
              {menu === 'quality' && (
                <Menu title="Quality">
                  {sources.map((s, i) => (
                    <MenuItem key={i} active={activeQuality === i} onClick={() => switchQuality(i)}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Menu>
              )}
            </div>
          )}

          {/* Next episode */}
          {hasNext && (
            <button onClick={onNext} aria-label="Next episode">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 5v14l8-7zM16 5h2v14h-2z" /></svg>
            </button>
          )}

          {/* Fullscreen */}
          <button onClick={toggleFull} aria-label="Fullscreen">
            {isFull ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9H4m0 0V4m0 5l6-6m5 5h5m0 0V4m0 5l-6-6M9 15H4m0 0v5m0-5l6 6m5-6h5m0 0v5m0-5l-6 6" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Floating back button — positioned top-left, clear of the bottom control bar.
function BackButton({ onBack, visible }) {
  if (!onBack) return null;
  return (
    <button
      onClick={onBack}
      className={`absolute top-4 left-4 z-30 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur flex items-center justify-center text-white transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      aria-label="Back"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
    </button>
  );
}

function Menu({ title, children }) {
  return (
    <div className="absolute bottom-10 right-0 min-w-[160px] bg-[#141414]/95 backdrop-blur border border-white/10 rounded-lg py-2 shadow-2xl">
      <p className="px-4 py-1 text-xs uppercase tracking-wide text-white/40">{title}</p>
      <div className="max-h-64 overflow-y-auto no-scrollbar">{children}</div>
    </div>
  );
}

function MenuItem({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-white/10 transition ${
        active ? 'text-white font-semibold' : 'text-white/70'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-purple-500' : 'bg-transparent'}`} />
      {children}
    </button>
  );
}
