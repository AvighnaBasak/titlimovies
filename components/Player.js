import { useEffect } from "react";

export default function Player({ imdb_id, tmdb_id, type, season, episode }) {
  // Priority: IMDB ID > TMDB ID
  const id = imdb_id || tmdb_id;

  const getVidFastUrl = () => {
    const baseUrl = "https://vidfast.pro";
    const params = new URLSearchParams({
      autoPlay: "true",
      theme: "8B5CF6", // matching the site's purple/violet aesthetic
      title: "true",
      poster: "true"
    });

    if (type === "movie" && id) {
      return `${baseUrl}/movie/${id}?${params.toString()}`;
    } else if (type === "tv" && id && season && episode) {
      return `${baseUrl}/tv/${id}/${season}/${episode}?${params.toString()}`;
    }

    return "";
  };

  const src = getVidFastUrl();

  useEffect(() => {
    const vidfastOrigins = [
      'https://vidfast.pro',
      'https://vidfast.in',
      'https://vidfast.io',
      'https://vidfast.me',
      'https://vidfast.net',
      'https://vidfast.pm',
      'https://vidfast.xyz'
    ];

    const handleMessage = ({ origin, data }) => {
      if (!vidfastOrigins.includes(origin) || !data) {
        return;
      }

      // Save progress to localStorage
      if (data.type === 'MEDIA_DATA') {
        try {
          const progressData = data.data;
          // Save VidFast specific progress
          localStorage.setItem('vidFastProgress', JSON.stringify(progressData));

          // UPDATE CONTINUE WATCHING
          // Calculate if finished ( > 90% watched)
          const isFinished = (progressData.time / progressData.duration) > 0.90;

          const history = JSON.parse(localStorage.getItem('continueWatching') || '[]');
          const itemIndex = history.findIndex(i => i.id == id); // Loose equality for string/number match

          if (itemIndex > -1) {
            if (isFinished) {
              // Remove if finished
              history.splice(itemIndex, 1);
            } else {
              // Update last watched timestamp & progress for the UI bar
              history[itemIndex].last_watched = Date.now();
              history[itemIndex].progress = (progressData.time / progressData.duration) * 100; // Save as percentage (0-100)
            }
            localStorage.setItem('continueWatching', JSON.stringify(history));
            window.dispatchEvent(new Event('continue-watching-update'));
          }
        } catch (e) {
          console.error("Failed to save progress", e);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
          frameBorder="0"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          title="VidFast Player"
        />
      </div>
    </div>
  );
}
