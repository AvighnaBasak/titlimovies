// components/MediaCard.js
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useModal } from "../context/ModalContext";
import { useTransition } from "../context/TransitionContext";
import HoverCard from "./HoverCard";

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

// Module-level tracker: counts how many times each URL has failed to load.
// After 5 failures for a given URL, we stop attempting to load it.
const failedUrls = new Map();
const MAX_FAILURES = 5;

function isUrlBlocked(url) {
  return (failedUrls.get(url) || 0) >= MAX_FAILURES;
}

function recordUrlFailure(url) {
  const count = (failedUrls.get(url) || 0) + 1;
  failedUrls.set(url, count);
  return count;
}

export default function MediaCard({ item, type, variant = "landscape", rank }) {
  const { openModal } = useModal();
  const router = useRouter();
  const { navigateDelay } = useTransition();
  const [imageSrc, setImageSrc] = useState("/placeholder.png");
  const [loaded, setLoaded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // NEW: track if we're still fetching the first image
  const errorCountRef = useRef(0);
  const [showRemove, setShowRemove] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  // Track mobile viewport
  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Initial Logic: use props if available
  useEffect(() => {
    const useBackdrop = variant === "landscape";
    errorCountRef.current = 0; // Reset error count on new item/variant
    setIsInitializing(true); // Reset initializing state on item change

    // For vertical (portrait/top10) cards — keep existing behavior
    if (!useBackdrop) {
      let src = "/placeholder.png";
      if (item.poster_path) src = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
      else if (item.coverImage?.large) src = item.coverImage.large;
      else if (item.poster) src = item.poster;
      else if (item.image_url) src = item.image_url;
      else if (item.backdrop_path) src = `https://image.tmdb.org/t/p/w500${item.backdrop_path}`;

      if (src !== "/placeholder.png" && !isUrlBlocked(src)) {
        setImageSrc(src);
        setLoaded(true);
        setIsInitializing(false); // Image source found, ready to render
      } else {
        // Fallback: fetch from TMDB
        const fetchTMDBPosters = async () => {
          if (!item.id && !item.tmdb_id) {
            setIsInitializing(false);
            return;
          }
          try {
            const id = item.tmdb_id || item.id;
            const effectiveType = item.media_type || type || 'movie';
            const endpointType = effectiveType === 'movie' ? 'movie' : 'tv';
            const res = await fetch(`https://api.themoviedb.org/3/${endpointType}/${id}/images?api_key=${TMDB_API_KEY}`);
            const data = await res.json();

            let newSrc = "/placeholder.png";
            if (data.posters && data.posters.length > 0) {
              newSrc = `https://image.tmdb.org/t/p/w500${data.posters[0].file_path}`;
            } else if (data.backdrops && data.backdrops.length > 0) {
              newSrc = `https://image.tmdb.org/t/p/w500${data.backdrops[0].file_path}`;
            }
            if (newSrc !== "/placeholder.png" && !isUrlBlocked(newSrc)) {
              setImageSrc(newSrc);
              setLoaded(true);
            }
            setIsInitializing(false); // Done fetching
          } catch (err) {
            console.error("Failed to fetch TMDB image", err);
            setIsInitializing(false);
          }
        };
        if (type !== 'anime' || (item.id && !isNaN(item.id))) {
          fetchTMDBPosters();
        } else {
          setIsInitializing(false);
        }
      }
      return;
    }

    // For horizontal (landscape) cards — fetch backdrop with language cascade:
    // English → French → no-language (null) → any backdrop → prop fallback
    const fetchBackdropCascade = async () => {
      const id = item.tmdb_id || item.id;

      if (!id) {
        setFallbackLandscape();
        setIsInitializing(false);
        return;
      }

      try {
        const effectiveType = item.media_type || type || 'movie';
        const endpointType = effectiveType === 'movie' ? 'movie' : 'tv';
        // Request en, fr, and null (no language) backdrops in one call
        const res = await fetch(
          `https://api.themoviedb.org/3/${endpointType}/${id}/images?api_key=${TMDB_API_KEY}&include_image_language=en,fr,null`
        );
        if (!res.ok) {
          setFallbackLandscape();
          setIsInitializing(false);
          return;
        }
        const data = await res.json();
        const allBackdrops = data.backdrops || [];

        // Helper: try to use the first non-blocked backdrop from a filtered list
        const trySetBackdrop = (list) => {
          for (const b of list) {
            const url = `https://image.tmdb.org/t/p/w780${b.file_path}`;
            if (!isUrlBlocked(url)) {
              setImageSrc(url);
              setLoaded(true);
              setIsInitializing(false); // Image source found
              return true;
            }
          }
          return false;
        };

        // 1. Try English
        const enBackdrops = allBackdrops.filter((b) => b.iso_639_1 === 'en');
        if (trySetBackdrop(enBackdrops)) return;

        // 2. Try French
        const frBackdrops = allBackdrops.filter((b) => b.iso_639_1 === 'fr');
        if (trySetBackdrop(frBackdrops)) return;

        // 3. Try no-language (null)
        const nullBackdrops = allBackdrops.filter((b) => b.iso_639_1 === null || b.iso_639_1 === '');
        if (trySetBackdrop(nullBackdrops)) return;

        // 4. Try any remaining backdrop
        if (trySetBackdrop(allBackdrops)) return;

        // 5. Nothing worked, use prop fallback
        setFallbackLandscape();
        setIsInitializing(false);
      } catch (err) {
        console.error("Failed to fetch backdrop", err);
        setFallbackLandscape();
        setIsInitializing(false);
      }
    };

    // Fallback for landscape: use whatever props are available (existing behavior)
    const setFallbackLandscape = () => {
      let src = "/placeholder.png";
      if (item.backdrop_path) src = `https://image.tmdb.org/t/p/w500${item.backdrop_path}`;
      else if (item.bannerImage) src = item.bannerImage;
      else if (item.image_url) src = item.image_url;
      else if (item.poster_path) src = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
      if (src !== "/placeholder.png" && !isUrlBlocked(src)) {
        setImageSrc(src);
        setLoaded(true);
      }
    };

    if (type !== 'anime' || (item.id && !isNaN(item.id))) {
      fetchBackdropCascade();
    } else {
      setFallbackLandscape();
      setIsInitializing(false);
    }
  }, [item, variant, type]);

  // If image fails to load, hide the entire card
  if (hidden) return null;

  // Don't render until we have an image source (prevents showing placeholder on initial load)
  if (isInitializing && imageSrc === "/placeholder.png") return null;

  const title = item.title || item.name || item.title_en || item.title_jp || "Untitled";

  const activeType = item.media_type || type || "movie";

  // Handle link
  let href = "/";
  if (activeType === "movie") href = `/movie/${item.imdb_id || item.id}`;
  else if (activeType === "tv") href = `/tv/${item.imdb_id || item.id}`;
  else if (activeType === "anime") href = `/anime/${encodeURIComponent(title)}`;

  const handleCardClick = (e) => {
    e.preventDefault();
    openModal(item, activeType);
  };

  // Top 10 Variant
  if (variant === "top10") {
    return (
      <div className="flex items-end group relative flex-shrink-0 min-w-[110px] md:min-w-max pl-0 md:pl-6">
        {/* Big Number — Desktop only */}
        <span
          className="hidden md:block text-[260px] font-black text-black leading-[0.8] -mr-10 z-0 select-none tracking-tighter"
          style={{
            WebkitTextStroke: "4px #595959",
            fontFamily: "'Netflix Sans', 'Helvetica Neue', sans-serif"
          }}
        >
          {rank}
        </span>

        {/* Poster Container - No Scale on Hover */}
        <div className="relative w-28 md:w-32 h-40 md:h-48 rounded-md shadow-lg z-10 border border-white/20 bg-gray-900 group-poster cursor-pointer">
          <Link href={href} onClick={handleCardClick} className="block w-full h-full relative overflow-hidden rounded-md">
            {/* Mobile: Use TMDB poster */}
            <div className="block md:hidden w-full h-full relative">
              <Image
                src={item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : imageSrc}
                alt={title}
                fill
                className={`object-cover ${imageSrc === "/placeholder.png" ? "opacity-50" : ""}`}
                loading="lazy"
                onError={() => setHidden(true)}
              />
            </div>
            {/* Desktop: Use existing imageSrc */}
            <div className="hidden md:block w-full h-full relative">
              <Image
                src={imageSrc}
                alt={title}
                fill
                className={`object-cover ${imageSrc === "/placeholder.png" ? "opacity-50" : ""}`}
                loading="lazy"
                onError={() => setHidden(true)}
              />
            </div>

            {/* Recently Added Badge */}
            {(item.release_date || item.first_air_date) &&
              (new Date(item.release_date || item.first_air_date).getFullYear() === new Date().getFullYear()) && (
                <div data-recently-added className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[8px] font-bold px-2 py-[3px] rounded-t-lg shadow-lg z-20 whitespace-nowrap transition-opacity duration-300 group-hover:opacity-0 flex items-center justify-center leading-none">
                  Recently added
                </div>
              )}
          </Link>

          {/* Hover Card Integration */}
          <div className="hidden md:block absolute inset-0 w-full h-full">
            <HoverCard item={item} type={activeType} imageSrc={imageSrc} />
          </div>
        </div>
      </div>
    );
  }

  // Top 10 Mobile Variant — numbers visible on mobile + desktop (for regional Top 10)
  if (variant === "top10mobile") {
    return (
      <div className="flex items-end group relative flex-shrink-0 min-w-[110px] md:min-w-max pl-0 md:pl-6">
        {/* Big Number — Visible on mobile + desktop */}
        <span
          className="block text-[140px] md:text-[260px] font-black text-black leading-[0.8] -mr-5 md:-mr-10 z-0 select-none tracking-tighter"
          style={{
            WebkitTextStroke: "1.5px #ffffff",
            fontFamily: "'Netflix Sans', 'Helvetica Neue', sans-serif"
          }}
        >
          {rank}
        </span>

        {/* Poster Container */}
        <div className="relative w-28 md:w-32 h-40 md:h-48 rounded-md shadow-lg z-10 border border-white/20 bg-gray-900 group-poster cursor-pointer">
          <Link href={href} onClick={handleCardClick} className="block w-full h-full relative overflow-hidden rounded-md">
            {/* Mobile: Use TMDB poster */}
            <div className="block md:hidden w-full h-full relative">
              <Image
                src={item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : imageSrc}
                alt={title}
                fill
                className={`object-cover ${imageSrc === "/placeholder.png" ? "opacity-50" : ""}`}
                loading="lazy"
                onError={() => setHidden(true)}
              />
            </div>
            {/* Desktop: Use existing imageSrc */}
            <div className="hidden md:block w-full h-full relative">
              <Image
                src={imageSrc}
                alt={title}
                fill
                className={`object-cover ${imageSrc === "/placeholder.png" ? "opacity-50" : ""}`}
                loading="lazy"
                onError={() => setHidden(true)}
              />
            </div>

            {/* Recently Added Badge */}
            {(item.release_date || item.first_air_date) &&
              (new Date(item.release_date || item.first_air_date).getFullYear() === new Date().getFullYear()) && (
                <div data-recently-added className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[8px] font-bold px-2 py-[3px] rounded-t-lg shadow-lg z-20 whitespace-nowrap transition-opacity duration-300 group-hover:opacity-0 flex items-center justify-center leading-none">
                  Recently added
                </div>
              )}
          </Link>

          {/* Hover Card Integration */}
          <div className="hidden md:block absolute inset-0 w-full h-full">
            <HoverCard item={item} type={activeType} imageSrc={imageSrc} />
          </div>
        </div>
      </div>
    );
  }

  // Build a poster-only source for mobile (never use backdrop/banner)
  const mobilePosterPath = item.poster_path || item.poster;
  const posterSrc = mobilePosterPath
    ? (mobilePosterPath.startsWith('http') ? mobilePosterPath : `https://image.tmdb.org/t/p/w500${mobilePosterPath}`)
    : "/placeholder.png";

  // Showcase Variant (Big portrait cards with gradient — for Award-Winning Dramas etc.)
  if (variant === "showcase") {
    return (
      <div className="relative flex-shrink-0 w-[42vw] md:w-64 aspect-[2/3] group z-0 hover:z-50 transition-all duration-300">
        <Link href={href} onClick={handleCardClick} className="absolute inset-0 rounded-lg overflow-hidden bg-[#202020] shadow-md cursor-pointer block">
          {/* Mobile: Poster */}
          <div className="block md:hidden w-full h-full relative">
            <Image
              src={posterSrc}
              alt={title}
              fill
              className={`object-cover ${posterSrc === "/placeholder.png" ? "opacity-50 grayscale" : ""}`}
              loading="lazy"
              onError={() => setHidden(true)}
            />
          </div>
          {/* Desktop: Backdrop/imageSrc */}
          <div className="hidden md:block w-full h-full relative">
            <Image
              src={imageSrc}
              alt={title}
              fill
              className={`object-cover ${imageSrc === "/placeholder.png" ? "opacity-50 grayscale" : ""}`}
              loading="lazy"
              onError={() => setHidden(true)}
            />
          </div>
          {/* Bottom Gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
        </Link>
        {/* Hover Card Overlay — Desktop only */}
        <div className="hidden md:block absolute top-0 left-0 w-full h-full pointer-events-none group-hover:pointer-events-auto">
          <HoverCard item={item} type={activeType} imageSrc={imageSrc} />
        </div>
      </div>
    );
  }

  // === MOBILE CONTINUE WATCHING CARD ===
  // Only for items with last_watched (continue watching items) on mobile
  const isContinueWatching = !!item.last_watched;
  if (isContinueWatching && isMobileView) {
    // Build watch URL for resume playback
    const activeT = item.media_type || type || 'movie';
    let cwWatchUrl = '/';
    let cwResumeS = item.season || 1;
    let cwResumeE = item.episode || 1;
    try {
      const cwList = JSON.parse(localStorage.getItem('continueWatching') || '[]');
      const saved = cwList.find(i => String(i.id) === String(item.id));
      if (saved && saved.season) cwResumeS = saved.season;
      if (saved && saved.episode) cwResumeE = saved.episode;
    } catch (e) { }

    if (activeT === 'movie') cwWatchUrl = `/movie/${item.imdb_id || item.id}`;
    else if (activeT === 'tv' || activeT === 'anime') cwWatchUrl = `/tv/${item.imdb_id || item.id}?season=${cwResumeS}&episode=${cwResumeE}`;

    const cwPoster = item.poster_path
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : (item.backdrop_path ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}` : posterSrc);

    const handleCWPlay = () => {
      navigateDelay(cwWatchUrl);
    };

    const handleCWInfo = (e) => {
      e.stopPropagation();
      openModal(item, activeT);
    };

    const handleCWRemove = (e) => {
      e.stopPropagation();
      try {
        const list = JSON.parse(localStorage.getItem('continueWatching') || '[]');
        const filtered = list.filter(i => String(i.id) !== String(item.id));
        localStorage.setItem('continueWatching', JSON.stringify(filtered));
        window.dispatchEvent(new Event('continue-watching-update'));
      } catch (err) {
        console.error('[CW] Failed to remove:', err);
      }
    };

    const handleXClick = (e) => {
      e.stopPropagation();
      handleCWRemove(e);
    };

    return (
      <div className="relative flex-shrink-0 w-[32vw] group z-0" style={{ maxWidth: '160px' }}>
        {/* Poster area with play button */}
        <div
          className="relative w-full aspect-[2/3] rounded-md overflow-hidden bg-[#1a1a1a] cursor-pointer"
          onClick={handleCWPlay}
        >
          <Image
            src={cwPoster}
            alt={title}
            fill
            className="object-cover"
            loading="lazy"
            onError={() => setHidden(true)}
          />
          {/* Centered Play Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-[1.5px] border-white bg-black/50 flex items-center justify-center pl-1 backdrop-blur-sm">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4.75c0-.87.96-1.4 1.72-.95l11.18 6.75c.71.43.71 1.47 0 1.9L7.72 19.2A1.1 1.1 0 0 1 6 18.25V4.75z" /></svg>
            </div>
          </div>
          {/* Progress bar */}
          {item.progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-700 z-10">
              <div
                className="h-full bg-purple-500 rounded-r-sm"
                style={{ width: `${Math.min(item.progress, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <div className="flex items-center justify-between mt-0 bg-[#1a1a1a] rounded-b-md px-1 py-1">
          {/* Info button */}
          <button
            onClick={handleCWInfo}
            className="flex-1 flex items-center justify-center py-2 text-white/70 active:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
            </svg>
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-white/10" />

          {/* X button to remove */}
          <button
            onClick={handleXClick}
            className="flex-1 flex items-center justify-center py-2 text-white/70 active:text-red-400 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Standard Variant (Landscape or Portrait)
  const aspectClass = variant === "portrait" ? "aspect-[2/3]" : "aspect-[2/3] md:aspect-video";
  // If variant is 'grid', we want full width of parent.
  // For rows: Mobile always vertical (w-[110px]), Desktop depends on variant.
  const containerClass = variant === "grid"
    ? "w-full"
    : (variant === "portrait" ? "w-28 md:w-40" : "w-[110px] md:w-64");


  return (
    <div className={`relative flex-shrink-0 ${aspectClass} ${containerClass} group z-0 hover:z-50 transition-all duration-300`}>
      {/* Static Content (Always visible until hovered) */}
      <Link href={href} onClick={handleCardClick} className="absolute inset-0 rounded-md overflow-hidden bg-[#202020] shadow-md cursor-pointer block">

        {/* Mobile: Vertical Poster */}
        <div className="block md:hidden w-full h-full relative">
          <Image
            src={posterSrc}
            alt={title}
            fill
            className={`object-cover ${posterSrc === "/placeholder.png" ? "opacity-50 grayscale" : ""}`}
            loading="lazy"
            onError={() => setHidden(true)}
          />
        </div>

        {/* Desktop: Determine based on variant (Landscape uses backdrop logic) */}
        <div className="hidden md:block w-full h-full relative">
          <Image
            src={imageSrc}
            alt={title}
            fill
            className={`object-cover ${imageSrc === "/placeholder.png" ? "opacity-50 grayscale" : ""}`}
            loading="lazy"
            onError={() => setHidden(true)}
          />
        </div>

        {/* Recently Added Badge */}
        {(item.release_date || item.first_air_date) &&
          (new Date(item.release_date || item.first_air_date).getFullYear() === new Date().getFullYear()) && (
            <div data-recently-added className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[9px] md:text-[10px] font-bold px-3 py-[4px] rounded-t-lg shadow-lg z-20 whitespace-nowrap transition-opacity duration-300 group-hover:opacity-0 flex items-center justify-center leading-none">
              Recently added
            </div>
          )}

        {/* Progress Bar for Continue Watching */}
        {item.progress > 0 && item.progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600 z-10 w-full">
            <div
              className="h-full bg-purple-500"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}


      </Link>

      {/* Hover Card Overlay */}
      <div className="hidden md:block absolute top-0 left-0 w-full h-full pointer-events-none group-hover:pointer-events-auto">
        <HoverCard item={item} type={activeType} imageSrc={imageSrc} />
      </div>
    </div>
  );
}
