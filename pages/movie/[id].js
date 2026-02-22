import { useRouter } from "next/router";
import { useEffect } from "react";
import Player from "../../components/Player";



export default function MovieDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const isImdb = id && id.startsWith("tt");

  // Save to Continue Watching on mount
  useEffect(() => {
    if (!id) return;

    const tmdbId = isImdb ? null : id;
    if (!tmdbId) return; // We need TMDB ID for metadata

    const saveToHistory = async () => {
      try {
        const res = await fetch(
          `/api/tmdb?path=/movie/${tmdbId}`
        );
        const data = await res.json();
        if (!data || data.success === false) return;

        const history = JSON.parse(localStorage.getItem('continueWatching') || '[]');
        const existingIndex = history.findIndex(i => String(i.id) === String(tmdbId));
        if (existingIndex > -1) {
          history.splice(existingIndex, 1);
        }

        history.unshift({
          id: data.id,
          tmdb_id: data.id,
          title: data.title || data.name,
          name: data.name || data.title,
          poster_path: data.poster_path,
          backdrop_path: data.backdrop_path,
          media_type: 'movie',
          season: null,
          episode: null,
          progress: 5, // Start with small progress to show the bar
          last_watched: Date.now()
        });

        localStorage.setItem('continueWatching', JSON.stringify(history));
        window.dispatchEvent(new Event('continue-watching-update'));
      } catch (e) {
        console.error("Failed to save to continue watching", e);
      }
    };

    saveToHistory();
  }, [id]);

  return (
    <div className="fixed inset-0 bg-black text-white flex items-center justify-center z-50 p-[5px] group/player">
      {/* Back Button */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-4 left-4 z-50 bg-black/60 hover:bg-black/90 text-white rounded-full p-2 backdrop-blur-sm opacity-0 group-hover/player:opacity-100 transition-opacity duration-300 cursor-pointer"
        title="Back to Home"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
      </button>

      {/* Full Screen Player Container */}
      <div className="w-full h-full">
        <Player
          imdb_id={isImdb ? id : null}
          tmdb_id={!isImdb ? id : null}
          type="movie"
        />
      </div>
    </div>
  );
}
