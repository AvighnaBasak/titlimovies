import { useRouter } from "next/router";
import { useEffect, useState, useCallback } from "react";
import VideoPlayer from "../../components/VideoPlayer";
import { updateWatchProgress, upsertContinueWatching } from "../../lib/continueWatching";

export default function MovieDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [title, setTitle] = useState("");
  const [tmdbId, setTmdbId] = useState(null);

  const isImdb = id && id.startsWith("tt");

  // Fetch details for the title + seed a continue-watching entry.
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        let fetchId = id;
        if (isImdb) {
          const findRes = await fetch(`/api/tmdb?path=/find/${id}&external_source=imdb_id`);
          const findData = await findRes.json();
          fetchId = findData.movie_results?.[0]?.id;
          if (!fetchId) return;
        }
        const res = await fetch(`/api/tmdb?path=/movie/${fetchId}`);
        const data = await res.json();
        if (!data || data.success === false) return;
        setTitle(data.title || data.name || "");
        setTmdbId(data.id);
        upsertContinueWatching({
          id: data.id,
          title: data.title || data.name,
          poster_path: data.poster_path,
          backdrop_path: data.backdrop_path,
          media_type: "movie",
        });
      } catch (e) {
        console.error("Failed to load movie details", e);
      }
    };
    load();
  }, [id]);

  const handleProgress = useCallback(
    (watched, duration) => {
      if (tmdbId) updateWatchProgress(tmdbId, watched, duration);
    },
    [tmdbId]
  );

  if (!id) return <div className="fixed inset-0 bg-black" />;

  return (
    <div className="fixed inset-0 bg-black">
      <VideoPlayer
        id={id}
        type="movie"
        title={title}
        onBack={() => router.push("/")}
        onProgress={handleProgress}
      />
    </div>
  );
}
