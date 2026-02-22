
import Link from 'next/link';

import { useState, useEffect } from 'react';

import { useTransition } from '../context/TransitionContext';
import { useModal } from '../context/ModalContext';

export default function HeroBanner({ item, type, mobileItem }) {
    const { openModal } = useModal();
    const { navigateDelay } = useTransition();
    const [videoKey, setVideoKey] = useState(null);
    const [logoPath, setLogoPath] = useState(null);
    const [mobileKeywords, setMobileKeywords] = useState([]);

    // Fetch keywords for mobile hero item
    useEffect(() => {
        if (!mobileItem) return;
        const fetchKeywords = async () => {
            const id = mobileItem.tmdb_id || mobileItem.id;
            if (!id) return;
            const mediaType = mobileItem.media_type === 'tv' || mobileItem.first_air_date ? 'tv' : 'movie';
            try {
                const res = await fetch(`/api/tmdb?path=/${mediaType}/${id}/keywords`);
                const data = await res.json();
                const keywords = data.keywords || data.results || [];
                setMobileKeywords(keywords.slice(0, 3).map(k => k.name));
            } catch (e) {
                console.error('Failed to fetch keywords', e);
            }
        };
        fetchKeywords();
    }, [mobileItem]);

    // Fetch Video & Logo Logic (Desktop Only)
    useEffect(() => {
        if (!item) return;

        const fetchWithRetry = async () => {
            const id = item.id || item.tmdb_id;
            if (!id) return;

            // Helper to try fetching video
            const tryFetchVideo = async (mediaType) => {
                try {
                    const res = await fetch(`/api/tmdb?path=/${mediaType}/${id}/videos&language=en-US`);
                    if (!res.ok) return null;
                    const data = await res.json();
                    if (data.results && data.results.length > 0) {
                        return data.results.find(v => v.type === "Trailer" && v.site === "YouTube")
                            || data.results.find(v => v.site === "YouTube");
                    }
                } catch (e) { console.error(e); }
                return null;
            };

            // Helper to try fetching images (logo)
            const tryFetchLogo = async (mediaType) => {
                try {
                    const res = await fetch(`/api/tmdb?path=/${mediaType}/${id}/images&include_image_language=en,null`);
                    if (!res.ok) return null;
                    const data = await res.json();
                    // Get highest voted logo in English or neutral
                    if (data.logos && data.logos.length > 0) {
                        return data.logos[0].file_path;
                    }
                } catch (e) { console.error(e); }
                return null;
            };

            // Try Primary Type
            let primaryType = type === 'movie' ? 'movie' : 'tv';
            let video = await tryFetchVideo(primaryType);
            let logo = await tryFetchLogo(primaryType);

            // If fail, try secondary type
            if (!video && !logo) {
                const secondaryType = primaryType === 'movie' ? 'tv' : 'movie';
                if (!video) video = await tryFetchVideo(secondaryType);
                if (!logo) logo = await tryFetchLogo(secondaryType);
            }

            setVideoKey(video ? video.key : null);
            setLogoPath(logo);
        };

        fetchWithRetry();
    }, [item, type]);

    if (!item) return null;

    const title = item.title || item.name || item.title_en || "Featured";

    // Robust Backdrop Logic
    const backdrop = item.backdrop_path
        ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
        : "https://assets.nflxext.com/ffe/siteui/vlv3/f841d4c7-10e1-40af-bcae-07a3f8dc141a/f6d7434e-d6de-4185-a6d4-c77a2d08737b/US-en-20220502-popsignuptwoweeks-perspective_alpha_website_medium.jpg";

    // Determine Link for Desktop
    let href = "/";
    if (type === "movie") href = `/movie/${item.imdb_id || item.id}`;
    else if (type === "tv") href = `/tv/${item.imdb_id || item.id}`;
    else if (type === "anime") href = `/anime/${encodeURIComponent(title)}`;

    // Mobile Item Logic
    // Mobile Item Logic
    let mobilePoster = backdrop;
    if (mobileItem) {
        // Handle both 'poster_path' (TMDB) and 'poster' (custom/other APIs)
        const path = mobileItem.poster_path || mobileItem.poster;
        if (path) {
            // If full URL (http), use as is. Else prepend TMDB base URL.
            mobilePoster = path.startsWith('http') ? path : `https://image.tmdb.org/t/p/w780${path}`;
        }
    }

    // Determine Link for Mobile
    let mobileHref = "/";
    if (mobileItem) {
        if (mobileItem.media_type === "movie" || !mobileItem.first_air_date) mobileHref = `/movie/${mobileItem.imdb_id || mobileItem.id}`;
        else mobileHref = `/tv/${mobileItem.imdb_id || mobileItem.id}`;
    }

    return (
        <>
            {/* DESKTOP VIEW (Video Banner) */}
            <div key={item.id + (videoKey || '')} className="hidden md:block relative h-[60vh] md:h-[85vh] w-full animate-fadeIn bg-black overflow-hidden group">

                {/* Background Layer */}
                <div className="absolute inset-0 w-full h-full">
                    {/* Fallback Image */}
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
                        style={{ backgroundImage: `url(${backdrop})`, opacity: videoKey ? 0 : 1 }}
                    />

                    {/* Video Player - Centered Cover Mode */}
                    {videoKey && (
                        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                            <iframe
                                className="absolute top-1/2 left-1/2 w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] -translate-x-1/2 -translate-y-1/2 object-cover opacity-80"
                                src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoKey}&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&origin=http://localhost:3000`}
                                title="Hero Video"
                                allow="autoplay; encrypted-media"
                                allowFullScreen
                            />
                        </div>
                    )}

                    {/* Gradients */}
                    {/* Side Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent z-10" />

                    {/* Bottom Gradient */}
                    <div className="absolute bottom-0 left-0 w-full h-24 md:h-40 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent z-10 opacity-60" />
                </div>

                {/* Content */}
                <div className="absolute top-[20%] md:top-[55%] left-4 md:left-12 max-w-2xl px-2 md:px-4 z-20 flex flex-col justify-end h-full md:h-auto pb-40 md:pb-0">
                    {logoPath ? (
                        <img
                            src={`https://image.tmdb.org/t/p/original${logoPath}`}
                            alt={title}
                            className="max-w-[70%] md:max-w-sm w-auto h-auto max-h-20 md:max-h-28 object-contain mb-0 md:mb-6 drop-shadow-xl"
                        />
                    ) : (
                        <h1 className="text-3xl md:text-6xl font-extrabold text-white mb-0 md:mb-6 drop-shadow-lg">
                            {title}
                        </h1>
                    )}

                    <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-8 pb-1">
                        <button
                            onClick={() => navigateDelay(href)}
                            className="flex items-center gap-2 bg-white text-black px-4 py-2 md:px-8 md:py-3 rounded hover:bg-white/90 transition font-bold text-sm md:text-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 md:w-6 md:h-6">
                                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                            </svg>
                            Play
                        </button>
                        <button
                            onClick={() => openModal(item, type)}
                            className="flex items-center gap-2 bg-gray-500/70 text-white px-4 py-2 md:px-8 md:py-3 rounded hover:bg-gray-500/50 transition font-bold text-sm md:text-lg backdrop-blur"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-6 md:h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                            </svg>
                            More Info
                        </button>
                    </div>
                </div>
            </div>

            {/* MOBILE VIEW (Floating Card) */}
            {mobileItem && (
                <div className="md:hidden relative w-full bg-[#141414] pt-16 pb-14 px-4 overflow-hidden">
                    {/* Ambient Background Glow (Simulating color based on poster) */}
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-purple-900/40 blur-[80px] rounded-full pointer-events-none" />

                    {/* Floating Card - ADJUST SIZE HERE: mx-5 sets even margins, aspect-[2/3] keeps poster ratio */}
                    <div
                        className="relative mx-5 aspect-[2/3] rounded-2xl overflow-hidden border border-white/20 shadow-2xl group cursor-pointer"
                        onClick={() => openModal(mobileItem, mobileItem.media_type || (mobileItem.first_air_date ? 'tv' : 'movie'))}
                    >
                        {/* Poster Image */}
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${mobilePoster})` }}
                        />

                        {/* Gradient Overlay: Color (Purple hint) to Black at bottom */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent opacity-60" />

                        {/* Content */}
                        <div className="absolute bottom-0 w-full p-5 flex flex-col gap-3">

                            {/* Keyword Tags */}
                            {mobileKeywords.length > 0 && (
                                <p className="text-white/80 text-xs text-center tracking-wide">
                                    {mobileKeywords.map((kw, i) => (
                                        <span key={i}>
                                            {i > 0 && <span className="mx-1.5 text-white/40">&bull;</span>}
                                            <span className="capitalize">{kw}</span>
                                        </span>
                                    ))}
                                </p>
                            )}

                            {/* Buttons */}
                            <div className="flex items-center gap-3">
                                {/* Play Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigateDelay(mobileHref); }}
                                    className="flex items-center justify-center gap-2 bg-white text-black px-4 py-2 rounded-lg flex-1 font-bold text-sm hover:bg-gray-200 transition active:scale-95"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                    </svg>
                                    Play
                                </button>

                                {/* My List Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); }}
                                    className="flex items-center justify-center gap-2 bg-[#262626]/90 text-white px-4 py-2 rounded-lg flex-1 font-bold text-sm backdrop-blur-md border border-white/10 hover:bg-[#333] transition active:scale-95"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    My List
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
