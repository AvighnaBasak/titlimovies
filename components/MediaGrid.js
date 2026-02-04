import MediaCard from "./MediaCard";

export default function MediaGrid({ items, type }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🎬</div>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No results found</h3>
        <p className="text-gray-400">Try searching for something else</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4 md:gap-2 w-full p-4">
      {items.map((item, idx) => (
        <MediaCard key={item.id || item.imdb_id || item.title_en || idx} item={item} type={item.media_type || type} variant="grid" />
      ))}
    </div>
  );
} 
