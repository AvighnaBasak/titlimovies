
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import Image from "next/image";
import tmdbLoader from "../utils/tmdbLoader";
import { motion } from "framer-motion";
import { useModal } from "../context/ModalContext";
import { useTransition } from "../context/TransitionContext";

// Spring config for luxury Netflix feel
const NETFLIX_SPRING = { type: "spring", stiffness: 300, damping: 35 };



export default function InfoModal() {
    const { isModalOpen, modalContent, closeModal } = useModal();
    const router = useRouter();
    const { navigateDelay } = useTransition();
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [videoKey, setVideoKey] = useState(null);
    const [logoPath, setLogoPath] = useState(null);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [seasonEpisodes, setSeasonEpisodes] = useState([]);
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showTapOverlay, setShowTapOverlay] = useState(false);
    const [episodeProgress, setEpisodeProgress] = useState({});
    const videoWrapperRef = useRef(null);
    const playerRef = useRef(null);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") closeModal();
        };
        if (isModalOpen) window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isModalOpen, closeModal]);

    // Main Fetch Logic
    useEffect(() => {
        if (!isModalOpen || !modalContent) {
            setDetails(null);
            setVideoKey(null);
            setLogoPath(null);
            setSeasonEpisodes([]);
            setSelectedSeason(1);
            setIsPlaying(false);
            setShowTapOverlay(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            const { id, type } = modalContent || {};
            // Convert to TMDB type
            const mediaType = type === 'anime' ? 'tv' : (type || 'movie');

            try {
                // Fetch Main Details with Append To Response
                const append = "credits,release_dates,content_ratings,recommendations,keywords,similar,videos,images";
                const url = `/api/tmdb?path=/${mediaType}/${id}&append_to_response=${append}`;
                const res = await fetch(url);
                const data = await res.json();

                // Process Data (Netflix Style Mapping)

                // 1. Runtime
                let runtime = 0;
                if (data.runtime) runtime = data.runtime;
                else if (data.episode_run_time && data.episode_run_time.length > 0) runtime = data.episode_run_time[0];

                const hours = Math.floor(runtime / 60);
                const minutes = runtime % 60;
                const formattedRuntime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                // 2. Rating (Maturity)
                let rating = "NR";
                if (mediaType === 'movie' && data.release_dates) {
                    const country = data.release_dates.results.find(c => c.iso_3166_1 === 'IN') ||
                        data.release_dates.results.find(c => c.iso_3166_1 === 'US');
                    if (country && country.release_dates.length > 0) {
                        rating = country.release_dates[country.release_dates.length - 1].certification || "NR";
                    }
                } else if (mediaType === 'tv' && data.content_ratings) {
                    const country = data.content_ratings.results.find(c => c.iso_3166_1 === 'IN') ||
                        data.content_ratings.results.find(c => c.iso_3166_1 === 'US');
                    if (country) rating = country.rating;
                }

                // 3. Crew & Cast
                const directors = data.credits?.crew?.filter(m => m.job === 'Director').map(m => m.name) || [];
                const writers = data.credits?.crew?.filter(m => ['Writer', 'Screenplay', 'Creator'].includes(m.job)).map(m => m.name) || [];
                // For TV, creators are often in `created_by`
                if (mediaType === 'tv' && data.created_by) {
                    directors.push(...data.created_by.map(c => c.name));
                }

                const cast = data.credits?.cast?.slice(0, 10).map(c => c.name) || [];

                // 4. Video (Trailer)
                const videos = data.videos?.results || [];
                const trailer = videos.find(v => v.type === "Trailer" && v.site === "YouTube") || videos.find(v => v.site === "YouTube");
                setVideoKey(trailer ? trailer.key : null);

                // 5. Logo
                const logos = data.images?.logos || [];
                const logo = logos.find(l => l.iso_639_1 === 'en') || logos[0];
                setLogoPath(logo ? logo.file_path : null);

                // 6. Episodes (Pre-fetch Season 1 if TV)
                if (mediaType === 'tv') {
                    // We will fetch season 1 specifically later in effect, or here? 
                    // Let's rely on the separate effect for season changes to handle loading episodes.
                    // Ensuring we have seasons
                }

                const netflixData = {
                    ...data,
                    formattedRuntime,
                    maturityRating: rating,
                    genresList: data.genres?.map(g => g.name) || [],
                    tags: data.keywords?.keywords?.map(k => k.name) || data.keywords?.results?.map(k => k.name) || [],
                    directorsList: [...new Set(directors)],
                    writersList: [...new Set(writers)],
                    castList: cast,
                    moreLikeThis: data.recommendations?.results?.slice(0, 12) || data.similar?.results?.slice(0, 12) || []
                };

                setDetails(netflixData);
            } catch (err) {
                console.error("Failed to fetch details", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isModalOpen, modalContent]);

    // YouTube IFrame Player API — mobile autoplay workaround
    useEffect(() => {
        if (!videoKey || !details) {
            if (playerRef.current) { try { playerRef.current.destroy(); } catch { } playerRef.current = null; }
            return;
        }
        let destroyed = false;
        const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

        const initPlayer = () => {
            if (destroyed || !videoWrapperRef.current) return;
            videoWrapperRef.current.innerHTML = '';
            const el = document.createElement('div');
            el.id = `yt-modal-${Date.now()}`;
            videoWrapperRef.current.appendChild(el);
            try {
                const player = new window.YT.Player(el.id, {
                    videoId: videoKey,
                    width: '100%',
                    height: '100%',
                    playerVars: {
                        autoplay: 1, mute: 1, controls: 0, loop: 1,
                        playlist: videoKey, playsinline: 1, showinfo: 0,
                        rel: 0, iv_load_policy: 3, modestbranding: 1,
                        origin: window.location.origin
                    },
                    events: {
                        onReady: (e) => {
                            if (destroyed) return;
                            playerRef.current = player;
                            const iframe = e.target.getIframe();
                            if (iframe) {
                                iframe.style.width = '100%';
                                iframe.style.height = '100%';
                                iframe.style.border = 'none';
                                iframe.style.pointerEvents = 'none';
                            }
                            e.target.playVideo();
                            // Check after 1.5s if autoplay worked
                            setTimeout(() => {
                                if (destroyed) return;
                                try {
                                    if (e.target.getPlayerState() !== 1 && isMobile) setShowTapOverlay(true);
                                } catch { }
                            }, 1500);
                        },
                        onStateChange: (e) => {
                            if (destroyed) return;
                            if (e.data === 1) { setIsPlaying(true); setShowTapOverlay(false); }
                            else if ((e.data === -1 || e.data === 5) && isMobile) setShowTapOverlay(true);
                        },
                        onError: () => { if (!destroyed) setIsPlaying(false); }
                    }
                });
            } catch (err) { console.error('YT player error', err); }
        };

        // Load API script if needed, then init
        let tid, iid;
        if (window.YT && window.YT.Player) {
            tid = setTimeout(initPlayer, 100);
        } else {
            if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
                const s = document.createElement('script');
                s.src = 'https://www.youtube.com/iframe_api';
                document.head.appendChild(s);
            }
            iid = setInterval(() => { if (window.YT && window.YT.Player) { clearInterval(iid); initPlayer(); } }, 200);
        }

        return () => {
            destroyed = true;
            clearTimeout(tid); clearInterval(iid);
            if (playerRef.current) { try { playerRef.current.destroy(); } catch { } playerRef.current = null; }
            if (videoWrapperRef.current) videoWrapperRef.current.innerHTML = '';
            setIsPlaying(false); setShowTapOverlay(false);
        };
    }, [videoKey, details?.id]);

    const handleTapToPlay = () => {
        if (playerRef.current?.playVideo) { playerRef.current.playVideo(); setShowTapOverlay(false); }
    };

    const handleMuteToggle = () => {
        if (playerRef.current) {
            try { if (isMuted) playerRef.current.unMute(); else playerRef.current.mute(); } catch { }
        }
        setIsMuted(!isMuted);
    };

    // Fetch Season Episodes when Season Changes (TV Only)
    useEffect(() => {
        if (!details || (modalContent?.type !== 'tv' && modalContent?.type !== 'anime') || !details.seasons) return;

        const fetchSeason = async () => {
            // Find the season object to get accurate season number or just use selectedSeason
            // Some shows have season 0 (Specials).
            try {
                const res = await fetch(`/api/tmdb?path=/tv/${details.id}/season/${selectedSeason}`);
                const data = await res.json();
                setSeasonEpisodes(data.episodes || []);
            } catch (e) {
                console.error("Failed to fetch season", e);
            }
        };

        fetchSeason();
    }, [selectedSeason, details, modalContent]);

    // Resume Logic: Check history when details load
    useEffect(() => {
        if (!details || !modalContent) return;

        try {
            const history = JSON.parse(localStorage.getItem('continueWatching') || '[]');
            const savedItem = history.find(i => i.id === details.id);

            if (savedItem && (modalContent?.type === 'tv' || modalContent?.type === 'anime')) {
                if (savedItem.season) {
                    setSelectedSeason(savedItem.season);
                }
            }
        } catch (e) {
            console.error("Failed to load history", e);
        }
    }, [details, modalContent]);

    // Load per-episode progress
    useEffect(() => {
        if (!details) return;

        const loadProgress = () => {
            try {
                const allProgress = JSON.parse(localStorage.getItem('episodeProgress') || '{}');
                const showProgress = {};
                const showId = String(details.id);

                for (const [key, value] of Object.entries(allProgress)) {
                    if (String(value.showId) === showId) {
                        const epKey = `s${value.season}_e${value.episode}`;
                        showProgress[epKey] = value.progress; // percentage 0-100
                    }
                }

                setEpisodeProgress(showProgress);
            } catch (e) {
                console.error("Failed to load episode progress", e);
            }
        };

        loadProgress();

        // Listen for real-time progress updates
        window.addEventListener('episode-progress-update', loadProgress);
        return () => window.removeEventListener('episode-progress-update', loadProgress);
    }, [details, selectedSeason]);

    const addToContinueWatching = (season = 1, episode = 1) => {
        if (!details) return;

        try {
            const history = JSON.parse(localStorage.getItem('continueWatching') || '[]');
            const existingIndex = history.findIndex(i => i.id === details.id);

            // Remove existing if found
            if (existingIndex > -1) {
                history.splice(existingIndex, 1);
            }

            const newItem = {
                id: details.id,
                tmdb_id: details.id,
                title: details.title || details.name,
                name: details.name || details.title,
                poster_path: details.poster_path,
                backdrop_path: details.backdrop_path,
                media_type: modalContent?.type || 'movie',
                season: season,
                episode: episode,
                last_watched: Date.now()
            };

            // Add to front
            history.unshift(newItem);
            localStorage.setItem('continueWatching', JSON.stringify(history));

            // Dispatch event for UI updates across components
            window.dispatchEvent(new Event('continue-watching-update'));
        } catch (e) {
            console.error("Failed to save history", e);
        }
    };

    const handlePlay = () => {
        if (!details) return;

        // Check continue watching for resume position
        let resumeSeason = selectedSeason || 1;
        let resumeEpisode = 1;
        try {
            const cwList = JSON.parse(localStorage.getItem('continueWatching') || '[]');
            const saved = cwList.find(i => i.id === details.id);
            if (saved && saved.season) resumeSeason = saved.season;
            if (saved && saved.episode) resumeEpisode = saved.episode;
        } catch (e) { }

        // === SAVE TO CONTINUE WATCHING ===
        try {
            const list = JSON.parse(localStorage.getItem('continueWatching') || '[]');
            // Remove if already exists
            const filtered = list.filter(i => i.id !== details.id);
            // Add to front
            filtered.unshift({
                id: details.id,
                tmdb_id: details.id,
                title: details.title || details.name,
                name: details.name || details.title,
                poster_path: details.poster_path,
                backdrop_path: details.backdrop_path,
                media_type: modalContent?.type || 'movie',
                season: resumeSeason,
                episode: resumeEpisode,
                progress: 5,
                last_watched: Date.now()
            });
            localStorage.setItem('continueWatching', JSON.stringify(filtered));
            console.log('[CW] Saved! List now has', filtered.length, 'items');
        } catch (e) {
            console.error('[CW] FAILED to save:', e.message);
        }

        // Navigate with season/episode always in URL
        if (modalContent?.type === 'tv' || modalContent?.type === 'anime') {
            navigateDelay(`/tv/${details.id}?season=${resumeSeason}&episode=${resumeEpisode}`);
        } else {
            navigateDelay(`/movie/${details.id}`);
        }
        setTimeout(() => closeModal(), 1000);
    };

    const handleEpisodePlay = (epNum) => {
        // Save progress for this specific episode
        addToContinueWatching(selectedSeason, epNum);

        navigateDelay(`/tv/${details.id}?season=${selectedSeason}&episode=${epNum}`);
        setTimeout(() => closeModal(), 1000);
    };

    if (typeof document === 'undefined') return null;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return createPortal(
        <motion.div
            className="fixed inset-0 z-[1000] overflow-y-auto overflow-x-hidden flex justify-center items-start pt-0 md:pt-8 pb-0 md:pb-8"
            onClick={closeModal}
            initial={{ backgroundColor: "rgba(0,0,0,0)" }}
            animate={{ backgroundColor: "rgba(0,0,0,0.7)" }}
            exit={{ backgroundColor: "rgba(0,0,0,0)" }}
            transition={{ duration: 0.3 }}
            style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
        >
            <motion.div
                className="relative w-full max-w-[850px] bg-black md:bg-[#181818] rounded-t-2xl md:rounded-xl overflow-visible md:overflow-hidden shadow-2xl mx-0 md:mx-4 mb-0 md:mb-8 pb-12 md:pb-0 min-h-screen md:min-h-auto"
                onClick={e => e.stopPropagation()}
                style={{ minHeight: '80vh' }}
                // Mobile: slide up from bottom | Desktop: scale in from center (Previous PC variant)
                initial={isMobile ? { y: "100%", opacity: 0.5, scale: 0.95 } : { y: 20, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={isMobile ? { y: "100%", opacity: 0, scale: 0.95 } : { y: 20, opacity: 0, scale: 0.9 }}
                transition={NETFLIX_SPRING}
            >
                {/* Close Button — sticky on mobile so it doesn't scroll away */}
                <div className="sticky top-0 z-50 flex justify-end pointer-events-none md:absolute md:top-4 md:right-4 md:block md:w-auto">
                    <button
                        onClick={closeModal}
                        className="pointer-events-auto mt-4 mr-4 md:mt-0 md:mr-0 w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#181818] text-white flex items-center justify-center hover:bg-[#333] transition cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {loading || !details ? (
                    <div className="h-[50vh] flex items-center justify-center text-white"></div>
                ) : (
                    <>
                        {/* Header Video Area — sticky on mobile */}
                        <div className="sticky top-0 z-30 md:relative md:z-auto">
                            <div className="relative w-full aspect-video bg-black group overflow-hidden">
                                {/* YouTube Player (API-driven for mobile autoplay) */}
                                {videoKey && (
                                    <div className="absolute inset-0 overflow-hidden z-[0]">
                                        <div className="w-full h-full transform scale-[1.50] origin-center">
                                            <div ref={videoWrapperRef} className="w-full h-full" />
                                        </div>
                                    </div>
                                )}

                                {/* Backdrop image — visible until video plays, or permanent fallback */}
                                <div
                                    className={`absolute inset-0 z-[1] transition-opacity duration-1000 ${videoKey && isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                >
                                    <Image
                                        loader={tmdbLoader}
                                        src={`https://image.tmdb.org/t/p/original${details.backdrop_path || details.poster_path}`}
                                        alt={details.title || details.name}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 850px"
                                        className="object-cover img-fade"
                                        onLoad={(e) => e.target.classList.add('img-fade-loaded')}
                                        priority
                                    />
                                </div>

                                {/* Mobile Tap-to-Play Overlay */}
                                {showTapOverlay && (
                                    <div
                                        className="md:hidden absolute inset-0 z-[6] flex items-center justify-center cursor-pointer"
                                        onClick={handleTapToPlay}
                                    >
                                        <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg shadow-black/40 animate-pulse">
                                            <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                        </div>
                                    </div>
                                )}

                                {/* Gradient Overlay (Desktop Only) */}
                                <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent z-10"></div>
                                {/* Explicit Bottom Fade (Desktop Only) */}
                                <div className="hidden md:block absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#181818] via-[#181818]/60 to-transparent z-10"></div>

                                {/* Content Overlay (Desktop Only) */}
                                <div className="hidden md:block absolute bottom-[5%] left-[5%] right-[5%] z-20">
                                    <div className="max-w-[70%] md:max-w-[50%]">
                                        {logoPath ? (
                                            <img
                                                src={`https://image.tmdb.org/t/p/w500${logoPath}`}
                                                alt="Logo"
                                                className="w-full max-h-20 md:max-h-32 object-contain object-left-bottom mb-4 md:mb-6"
                                            />
                                        ) : (
                                            <h1 className="text-2xl md:text-4xl font-bold text-white mb-4 drop-shadow-md">{details.title || details.name}</h1>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 md:gap-3">
                                        <button
                                            onClick={handlePlay}
                                            className="bg-white text-black px-4 md:px-6 py-1.5 md:py-2 rounded font-bold flex items-center gap-2 hover:bg-gray-200 transition text-sm md:text-base"
                                        >
                                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                            Play
                                        </button>
                                        <button className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-gray-500 text-white flex items-center justify-center hover:border-white hover:bg-white/10 transition">
                                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                        </button>
                                        <button className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-gray-500 text-white flex items-center justify-center hover:border-white hover:bg-white/10 transition">
                                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                                        </button>
                                        <div className="flex-grow"></div>
                                        {videoKey && (
                                            <button
                                                onClick={handleMuteToggle}
                                                className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/30 text-white/70 flex items-center justify-center hover:border-white hover:text-white hover:bg-white/10 transition"
                                            >
                                                {isMuted ? (
                                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                                                ) : (
                                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Purple progress bar — mobile only */}
                            <div className="block md:hidden w-full h-[3px] bg-[#333]">
                                <div
                                    className="h-full bg-purple-600 rounded-r-full"
                                    style={{ animation: 'modalProgress 60s linear infinite' }}
                                />
                            </div>
                            <style jsx>{`
                                @keyframes modalProgress {
                                    0% { width: 0%; }
                                    100% { width: 100%; }
                                }
                            `}</style>
                        </div>

                        {/* Mobile Info Body (Text Title, Buttons, Metadata) — Staggered */}
                        <motion.div
                            className="block md:hidden px-4 py-4 space-y-4 bg-black"
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: {},
                                visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } }
                            }}
                        >
                            <motion.h1 className="text-2xl font-bold text-white tracking-tight" variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: NETFLIX_SPRING } }}>{details.title || details.name}</motion.h1>

                            <motion.div className="flex items-center flex-wrap gap-3 text-gray-400 text-xs" variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: NETFLIX_SPRING } }}>
                                <span>{(details.release_date || details.first_air_date || "").substring(0, 4)}</span>
                                <span className="bg-gray-700 text-white px-1.5 py-0.5 rounded text-[10px]">{details.maturityRating}</span>
                                <span>{details.formattedRuntime}</span>
                                <span className="border border-gray-500 px-1.5 py-0.5 rounded text-[10px]">HD</span>
                            </motion.div>

                            <motion.button
                                onClick={handlePlay}
                                className="w-full bg-white text-black font-bold py-3 rounded flex items-center justify-center gap-2 active:scale-95 transition"
                                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: NETFLIX_SPRING } }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                Play
                            </motion.button>

                            <motion.button
                                className="w-full bg-[#262626] text-white font-bold py-3 rounded flex items-center justify-center gap-2 active:scale-95 transition"
                                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: NETFLIX_SPRING } }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                My List
                            </motion.button>

                            <motion.p className="text-sm text-gray-300 leading-relaxed font-light" variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: NETFLIX_SPRING } }}>
                                {details.overview}
                            </motion.p>

                            <motion.div className="text-xs text-gray-400 space-y-1 pt-2" variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: NETFLIX_SPRING } }}>
                                <p><span className="text-gray-500">Cast: </span>{details.castList.slice(0, 4).join(', ')}... more</p>
                                <p><span className="text-gray-500">Director: </span>{details.directorsList.join(', ')}</p>
                                <p><span className="text-gray-500">Writer: </span>{details.writersList.join(', ')}</p>
                            </motion.div>
                        </motion.div>

                        {/* Main Info (Desktop) */}
                        <div className="hidden md:grid px-4 md:px-10 py-4 grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 md:gap-8">
                            {/* Left Column */}
                            <div className="space-y-3 md:space-y-4">
                                <div className="flex items-center flex-wrap gap-2 md:gap-3 text-white font-semibold text-sm md:text-base">
                                    <span className="text-[#46d369]">{(details.vote_average * 10).toFixed(0)}% Match</span>
                                    <span className="text-gray-400">{(details.release_date || details.first_air_date || "").substring(0, 4)}</span>
                                    <span className="border border-white/40 px-1 rounded text-xs py-0.5">{details.maturityRating}</span>
                                    <span className="text-gray-400">{details.formattedRuntime}</span>
                                    <span className="border border-white/40 px-1 rounded text-[10px] py-0.5">HD</span>
                                </div>

                                <p className="text-white text-sm md:text-base leading-relaxed">
                                    {details.overview}
                                </p>
                            </div>

                            {/* Right Column (Metadata) */}
                            <div className="text-xs md:text-sm space-y-2 md:space-y-3">
                                <div className="text-gray-400">
                                    <span className="text-gray-500">Cast: </span>
                                    {details.castList.map((c, i) => (
                                        <span key={i} className="text-white hover:underline cursor-pointer mr-1">{c}{i < details.castList.length - 1 ? ',' : ''}</span>
                                    ))}
                                </div>
                                <div className="text-gray-400">
                                    <span className="text-gray-500">Genres: </span>
                                    {details.genresList.map((g, i) => (
                                        <span key={i} className="text-white hover:underline cursor-pointer mr-1">{g}{i < details.genresList.length - 1 ? ',' : ''}</span>
                                    ))}
                                </div>
                                <div className="text-gray-400">
                                    <span className="text-gray-500">This is: </span>
                                    {details.tags.slice(0, 5).map((t, i) => (
                                        <span key={i} className="text-white mr-1">{t}{i < 4 ? ',' : ''}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Episodes Section (TV Only) */}
                        {(modalContent?.type === 'tv' || modalContent?.type === 'anime') && details.seasons && (
                            <>
                                {/* === MOBILE EPISODES === */}
                                <div className="block md:hidden bg-black px-4 py-4">
                                    {/* Season Selector Row */}
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="relative inline-block">
                                            <select
                                                value={selectedSeason}
                                                onChange={(e) => setSelectedSeason(Number(e.target.value))}
                                                className="appearance-none bg-transparent text-white font-bold text-base pr-6 cursor-pointer focus:outline-none"
                                            >
                                                {details.seasons.filter(s => s.season_number > 0).map(s => (
                                                    <option key={s.id} value={s.season_number} className="bg-black text-white">
                                                        {s.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-white">
                                                <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                            </div>
                                        </div>
                                        {/* Info icon */}
                                        <button className="w-7 h-7 rounded-full border border-white/30 flex items-center justify-center text-white/60">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Episode List */}
                                    <div className="space-y-0">
                                        {seasonEpisodes.map((ep, idx) => (
                                            <div key={ep.id}>
                                                <div
                                                    className="py-3 cursor-pointer active:bg-white/5 transition"
                                                    onClick={() => handleEpisodePlay(ep.episode_number)}
                                                >
                                                    {/* Top row: Thumbnail + Title */}
                                                    <div className="flex items-center gap-3">
                                                        {/* Thumbnail */}
                                                        <div className="relative w-[120px] h-[68px] bg-[#1a1a1a] rounded overflow-hidden flex-shrink-0 img-shimmer">
                                                            <Image
                                                                loader={tmdbLoader}
                                                                src={ep.still_path
                                                                    ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
                                                                    : `https://image.tmdb.org/t/p/w300${details.backdrop_path || details.poster_path}`
                                                                }
                                                                alt={ep.name}
                                                                fill
                                                                sizes="120px"
                                                                className={`object-cover img-fade ${!ep.still_path ? 'opacity-40 grayscale' : ''}`}
                                                                onLoad={(e) => e.target.classList.add('img-fade-loaded')}
                                                            />
                                                            {/* Play icon overlay */}
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="w-8 h-8 rounded-full border-2 border-white/80 bg-black/40 flex items-center justify-center pl-0.5">
                                                                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                                </div>
                                                            </div>
                                                            {/* Episode progress bar */}
                                                            {(() => {
                                                                const epProgress = episodeProgress[`s${selectedSeason}_e${ep.episode_number}`];
                                                                return epProgress > 0 && epProgress < 100 ? (
                                                                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-700 z-10">
                                                                        <div className="h-full bg-purple-500 rounded-r-full" style={{ width: `${epProgress}%` }} />
                                                                    </div>
                                                                ) : null;
                                                            })()}
                                                        </div>

                                                        {/* Title + Runtime */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white text-sm font-medium truncate">
                                                                {ep.episode_number}. {ep.name}
                                                            </p>
                                                            <p className="text-gray-500 text-xs mt-0.5">
                                                                {ep.runtime ? `${ep.runtime}m` : ''}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Description */}
                                                    <p className="text-gray-500 text-xs leading-relaxed mt-2.5 line-clamp-3">
                                                        {ep.overview || 'Coming soon'}
                                                    </p>
                                                </div>
                                                {/* Separator */}
                                                {idx < seasonEpisodes.length - 1 && (
                                                    <div className="border-b border-white/10" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* === DESKTOP EPISODES (unchanged) === */}
                                <div className="hidden md:block px-10 py-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-bold text-white">Episodes</h3>
                                        <div className="relative">
                                            <select
                                                value={selectedSeason}
                                                onChange={(e) => setSelectedSeason(Number(e.target.value))}
                                                className="appearance-none bg-[#242424] border border-gray-600 rounded py-2 px-4 pr-10 text-white font-bold cursor-pointer focus:outline-none focus:border-white text-base"
                                            >
                                                {details.seasons.filter(s => s.season_number > 0).map(s => (
                                                    <option key={s.id} value={s.season_number}>{s.name} ({s.episode_count} Episodes)</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {seasonEpisodes.map((ep) => (
                                            <div
                                                key={ep.id}
                                                className="group flex items-center gap-4 p-4 rounded-md hover:bg-[#333] cursor-pointer transition border border-transparent hover:border-white/10"
                                                onClick={() => handleEpisodePlay(ep.episode_number)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="text-2xl text-gray-400 font-bold w-6">{ep.episode_number}</div>
                                                    <div className="relative w-[140px] aspect-video bg-gray-800 rounded overflow-hidden flex-shrink-0 img-shimmer">
                                                        <Image
                                                            loader={tmdbLoader}
                                                            src={ep.still_path
                                                                ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
                                                                : `https://image.tmdb.org/t/p/w300${details.backdrop_path || details.poster_path}`
                                                            }
                                                            alt={ep.name}
                                                            fill
                                                            sizes="140px"
                                                            className={`object-cover img-fade ${!ep.still_path ? 'opacity-40 grayscale' : ''}`}
                                                            onLoad={(e) => e.target.classList.add('img-fade-loaded')}
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                            <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center pl-1">
                                                                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                            </div>
                                                        </div>
                                                        {/* Episode progress bar */}
                                                        {(() => {
                                                            const epProgress = episodeProgress[`s${selectedSeason}_e${ep.episode_number}`];
                                                            return epProgress > 0 && epProgress < 100 ? (
                                                                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-700 z-10">
                                                                    <div className="h-full bg-purple-500 rounded-r-full" style={{ width: `${epProgress}%` }} />
                                                                </div>
                                                            ) : null;
                                                        })()}
                                                    </div>
                                                </div>
                                                <div className="flex-grow">
                                                    <div className="flex justify-between text-white font-bold mb-1 text-base">
                                                        <span>{ep.name}</span>
                                                        <span className="text-sm font-normal text-gray-400">{ep.runtime ? `${ep.runtime}m` : ''}</span>
                                                    </div>
                                                    <p className="text-gray-400 text-sm line-clamp-2 leading-snug">{ep.overview || 'Coming soon'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* More Like This (Using Grid) */}
                        <div className="px-4 md:px-10 py-6">
                            <h3 className="text-lg md:text-xl font-bold text-white mb-4">More Like This</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                                {details.moreLikeThis.map((item) => (
                                    <div key={item.id} className="bg-[#2f2f2f] rounded-md overflow-hidden cursor-pointer hover:bg-[#404040] transition" onClick={() => {
                                        // TODO: handle switching modal content
                                    }}>
                                        <div className="relative aspect-video w-full bg-gray-800 img-shimmer">
                                            {item.backdrop_path || item.poster_path ? (
                                                <Image loader={tmdbLoader} src={`https://image.tmdb.org/t/p/w500${item.backdrop_path || item.poster_path}`} alt={item.title} fill sizes="(max-width: 768px) 50vw, 280px" className="object-cover img-fade" onLoad={(e) => e.target.classList.add('img-fade-loaded')} />
                                            ) : null}
                                            <div className="absolute top-2 right-2 font-bold text-white drop-shadow-md text-xs md:text-sm">
                                                {(item.vote_average * 10).toFixed(0)}% Match
                                            </div>
                                        </div>
                                        <div className="p-3 md:p-4">
                                            <div className="flex justify-between items-start text-white gap-2 mb-2">
                                                <h4 className="font-bold text-xs md:text-sm leading-tight">{item.title || item.name}</h4>
                                                <span className="text-[10px] md:text-xs text-gray-400 text-nowrap">{(item.release_date || item.first_air_date || "").substring(0, 4)}</span>
                                            </div>
                                            <p className="text-[10px] md:text-xs text-gray-400 line-clamp-3 leading-relaxed">{item.overview}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* About Section */}
                        <div className="px-4 md:px-10 py-8 pb-12">
                            <h3 className="text-lg md:text-xl font-bold text-white mb-2">About <strong>{details.title || details.name}</strong></h3>
                            <div className="text-xs md:text-sm text-gray-400 space-y-1">
                                <p><span className="text-gray-500">Director: </span>{details.directorsList.join(', ')}</p>
                                <p><span className="text-gray-500">Cast: </span>{details.castList.join(', ')}</p>
                                <p><span className="text-gray-500">Writer: </span>{details.writersList.join(', ')}</p>
                                <p><span className="text-gray-500">Genres: </span>{details.genresList.join(', ')}</p>
                                <p><span className="text-gray-500">Maturity Rating: </span><span className="border border-white/40 px-1 text-xs text-white ml-2">{details.maturityRating}</span></p>
                            </div>
                        </div>
                    </>
                )}
            </motion.div>
        </motion.div>,
        document.body
    );
}
