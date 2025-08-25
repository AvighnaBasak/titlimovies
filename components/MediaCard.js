 // components/MediaCard.js
 import Link from "next/link";
 import Image from "next/image";

 export default function MediaCard({ item, type }) {
   // Handle poster / image - use the 'poster' field from API response
   const poster = item.poster || // Use 'poster' field which has full URL
     (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null) ||
     (type === "anime" ? item.thumbnail_url : null) || // Use thumbnail_url for anime
     item.image_url || 
     "/placeholder.png"; // Use placeholder as fallback
 
   // Handle title
   const title =
     item.title || item.name || item.title_en || item.title_jp || "Untitled";
 
   // Handle year
   const year =
     item.release_date?.split("-")[0] ||
     item.first_air_date?.split("-")[0] ||
     item.aired?.split("-")[0] ||
     item.year || // Also check for 'year' field from API
     "N/A";
 
   // Handle link (different routes for movie, tv, anime)
   let href = "/";
   if (type === "movie") {
     href = `/movie/${item.imdb_id || item.id}`;
   } else if (type === "tv") {
     href = `/tv/${item.imdb_id || item.id}`;
   } else if (type === "anime") {
     href = `/anime/${encodeURIComponent(item.title_en || item.title_jp || item.title)}`;
   }
 
     return (
    <Link href={href}>
      <div className="group bg-gradient-to-b from-gray-800/50 to-gray-900/80 backdrop-blur rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-105 hover:bg-gray-800/60 transition-all duration-300 cursor-pointer border border-gray-700/30">
        {/* Poster */}
        <div className="relative overflow-hidden">
          <Image
            src={poster}
            alt={title}
            width={300}
            height={288}
            className="w-full h-72 object-cover group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              e.target.src = "/placeholder.png";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Info */}
        <div className="p-4">
          <h2 className="text-sm font-semibold truncate text-white mb-1 group-hover:text-blue-300 transition-colors">{title}</h2>
          <p className="text-xs text-gray-400">{year}</p>
        </div>
      </div>
    </Link>
  );
 }
 
 