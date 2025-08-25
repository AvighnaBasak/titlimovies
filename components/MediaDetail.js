export default function MediaDetail({ item, type }) {
  if (!item) return null;
  // Poster
  const poster = item.poster || (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null) || (type === 'anime' ? item.thumbnail_url : null) || item.image_url || "/placeholder.png";
  // Title
  const title =
    item.title || item.name || item.title_en || item.title_jp || "Untitled";
  // Description
  const overview = item.overview || item.synopsis || item.description || item.plot || "No description.";
  // Details
  const released = item.release_date || item.first_air_date || item.aired || item.year || "N/A";
  const genres = Array.isArray(item.genres) ? item.genres.join(", ") : (item.genres ? (Array.isArray(item.genres.map) ? item.genres.map(g => g.name).join(", ") : item.genres) : "N/A");
  const casts = item.casts ? item.casts.map(c => c.name).join(", ") : item.casts || "N/A";
  const duration = item.runtime || item.episode_run_time || item.duration || "N/A";
  const country = Array.isArray(item.production_countries) ? item.production_countries.join(", ") : (item.production_countries ? item.production_countries.map?.(c => c.name).join(", ") : item.country || "N/A");
  const production = Array.isArray(item.production_companies) ? item.production_companies.map(p => p.name).join(", ") : item.production || "N/A";

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      <img
        src={poster}
        alt={title}
        className="w-44 h-64 object-cover rounded-3xl shadow-lg mb-4 md:mb-0"
        onError={(e) => { e.target.src = '/placeholder.png'; }}
      />
      <div className="flex-1">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-gray-300 mb-4 leading-relaxed">{overview}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-300">
          <div><span className="font-semibold text-white">Released:</span> {released}</div>
          <div><span className="font-semibold text-white">Genre:</span> {genres}</div>
          <div><span className="font-semibold text-white">Casts:</span> {casts}</div>
          <div><span className="font-semibold text-white">Duration:</span> {duration} min</div>
          <div><span className="font-semibold text-white">Country:</span> {country}</div>
          <div><span className="font-semibold text-white">Production:</span> {production}</div>
        </div>
      </div>
    </div>
  );
} 
