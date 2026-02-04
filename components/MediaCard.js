// components/MediaCard.js
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useModal } from "../context/ModalContext";
import HoverCard from "./HoverCard";

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

export default function MediaCard({ item, type, variant = "landscape", rank }) {
  const { openModal } = useModal();
  const [imageSrc, setImageSrc] = useState("/placeholder.png");
  const [loaded, setLoaded] = useState(false);

  // Initial Logic: use props if available
  useEffect(() => {
    let src = "/placeholder.png";
    const useBackdrop = variant === "landscape";

    if (useBackdrop) {
      if (item.backdrop_path) src = `https://image.tmdb.org/t/p/w500${item.backdrop_path}`;
      else if (item.bannerImage) src = item.bannerImage;
      else if (item.image_url) src = item.image_url;
      else if (item.poster_path) src = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
    } else {
      if (item.poster_path) src = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
      else if (item.coverImage?.large) src = item.coverImage.large;
      else if (item.poster) src = item.poster;
      else if (item.image_url) src = item.image_url;
      else if (item.backdrop_path) src = `https://image.tmdb.org/t/p/w500${item.backdrop_path}`;
    }

    // If we have a valid src from props, set it
    if (src !== "/placeholder.png") {
      setImageSrc(src);
      setLoaded(true);
    } else {
      // If missing, try to fetch from TMDB uniquely
      const fetchTMDBImages = async () => {
        if (!item.id && !item.tmdb_id) return;
        try {
          const id = item.tmdb_id || item.id;
          // Distinguish endpoint based on type (tv or movie). Anime is tricky, often maps to TV in TMDB.
          const endpointType = type === 'movie' ? 'movie' : 'tv';

          const res = await fetch(`https://api.themoviedb.org/3/${endpointType}/${id}/images?api_key=${TMDB_API_KEY}`);
          const data = await res.json();

          let newSrc = "/placeholder.png";
          if (useBackdrop) {
            if (data.backdrops && data.backdrops.length > 0) {
              newSrc = `https://image.tmdb.org/t/p/w500${data.backdrops[0].file_path}`;
            } else if (data.posters && data.posters.length > 0) {
              newSrc = `https://image.tmdb.org/t/p/w500${data.posters[0].file_path}`;
            }
          } else {
            if (data.posters && data.posters.length > 0) {
              newSrc = `https://image.tmdb.org/t/p/w500${data.posters[0].file_path}`;
            } else if (data.backdrops && data.backdrops.length > 0) {
              newSrc = `https://image.tmdb.org/t/p/w500${data.backdrops[0].file_path}`;
            }
          }

          if (newSrc !== "/placeholder.png") {
            setImageSrc(newSrc);
          }
        } catch (err) {
          console.error("Failed to fetch TMDB image", err);
        }
      };

      // Only fetch if it's likely a standard Movie/TV item (standard numeric ID)
      if (type !== 'anime' || (item.id && !isNaN(item.id))) {
        fetchTMDBImages();
      }
    }
  }, [item, variant, type]);

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
      <div className="flex items-end group relative min-w-[180px] md:min-w-[216px] pl-2 md:pl-6">
        {/* Big Number */}
        <span
          className="text-[190px] md:text-[260px] font-black text-black leading-[0.8] -mr-6 md:-mr-10 z-0 select-none tracking-tighter"
          style={{
            WebkitTextStroke: "4px #595959",
            fontFamily: "'Netflix Sans', 'Helvetica Neue', sans-serif"
          }}
        >
          {rank}
        </span>

        {/* Poster Container - No Scale on Hover */}
        <div className="relative w-24 md:w-32 h-36 md:h-48 rounded-md shadow-lg z-10 border border-white/20 bg-gray-900 group-poster cursor-pointer">
          <Link href={href} onClick={handleCardClick} className="block w-full h-full relative overflow-hidden rounded-md">
            <Image
              src={imageSrc}
              alt={title}
              fill
              className={`object-cover ${imageSrc === "/placeholder.png" ? "opacity-50" : ""}`}
              loading="lazy"
              onError={(e) => { e.target.src = "https://via.placeholder.com/300x450?text=No+Poster"; }}
            />

            {/* Recently Added Badge */}
            {(item.release_date || item.first_air_date) &&
              (new Date(item.release_date || item.first_air_date).getFullYear() === new Date().getFullYear()) && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-t-lg shadow-lg z-20 whitespace-nowrap transition-opacity duration-300 group-hover:opacity-0">
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

  // Standard Variant (Landscape or Portrait)
  const aspectClass = variant === "portrait" ? "aspect-[2/3]" : "aspect-video";
  // If variant is 'grid', we want full width of parent, otherwise fixed for rows
  const containerClass = variant === "grid" ? "w-full" : (variant === "portrait" ? "w-28 md:w-40" : "w-48 md:w-64");

  return (
    <div className={`relative ${aspectClass} ${containerClass} group z-0 hover:z-50 transition-all duration-300`}>
      {/* Static Content (Always visible until hovered) */}
      <Link href={href} onClick={handleCardClick} className="absolute inset-0 rounded-md overflow-hidden bg-[#202020] shadow-md cursor-pointer block">
        <Image
          src={imageSrc}
          alt={title}
          fill
          className={`object-cover ${imageSrc === "/placeholder.png" ? "opacity-50 grayscale" : ""}`}
          loading="lazy"
          onError={(e) => { e.target.src = "https://via.placeholder.com/400x225?text=No+Image"; }}
        />

        {/* Recently Added Badge */}
        {(item.release_date || item.first_air_date) &&
          (new Date(item.release_date || item.first_air_date).getFullYear() === new Date().getFullYear()) && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[9px] md:text-[10px] font-bold px-3 py-1 rounded-t-lg shadow-lg z-20 whitespace-nowrap transition-opacity duration-300 group-hover:opacity-0">
              Recently added
            </div>
          )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
          <h3 className="text-white text-xs md:text-sm font-bold shadow-black drop-shadow-md leading-tight">{title}</h3>
        </div>
      </Link>

      {/* Hover Card Overlay */}
      <div className="hidden md:block absolute top-0 left-0 w-full h-full pointer-events-none group-hover:pointer-events-auto">
        <HoverCard item={item} type={activeType} imageSrc={imageSrc} />
      </div>
    </div>
  );
}
