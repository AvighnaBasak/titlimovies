import { useRouter } from "next/router";
import { useEffect, useState, useCallback } from "react";
import VideoPlayer from "../../components/VideoPlayer";
import {
  updateWatchProgress,
  upsertContinueWatching,
  getResumePosition,
} from "../../lib/continueWatching";

export default function TVDetailPage() {
  const router = useRouter();
  const { id, season: qSeason, episode: qEpisode } = router.query;
  const [season, setSeason] = useState(null);
  const [episode, setEpisode] = useState(null);
  const [title, setTitle] = useState("");
  const [tmdbId, setTmdbId] = useState(null);
  const [episodeCount, setEpisodeCount] = useState(0);

  const isImdb = id && id.startsWith("tt");

  // Resolve the starting season/episode: URL params, then saved resume, else 1/1.
  useEffect(() => {
    if (!id || !router.isReady) return;
    if (qSeason && qEpisode) {
      setSeason(Number(qSeason));
      setEpisode(Number(qEpisode));
      return;
    }
    const resume = getResumePosition(id);
    const s = resume?.season || 1;
    const e = resume?.episode || 1;
    setSeason(s);
    setEpisode(e);
    router.replace(`/tv/${id}?season=${s}&episode=${e}`, undefined, { shallow: true });
  }, [id, router.isReady]);

  useEffect(() => {
    if (qSeason) setSeason(Number(qSeason));
    if (qEpisode) setEpisode(Number(qEpisode));
  }, [qSeason, qEpisode]);

  // Fetch show details (title + tmdb id) and seed continue watching.
  useEffect(() => {
    if (!id || season == null || episode == null) return;
    const load = async () => {
      try {
        let fetchId = id;
        if (isImdb) {
          const findRes = await fetch(`/api/tmdb?path=/find/${id}&external_source=imdb_id`);
          const findData = await findRes.json();
          fetchId = findData.tv_results?.[0]?.id;
          if (!fetchId) return;
        }
        const res = await fetch(`/api/tmdb?path=/tv/${fetchId}`);
        const data = await res.json();
        if (!data || data.success === false) return;
        setTitle(data.name || data.title || "");
        setTmdbId(data.id);
        upsertContinueWatching({
          id: data.id,
          imdb_id: isImdb ? id : undefined,
          title: data.name || data.title,
          poster_path: data.poster_path,
          backdrop_path: data.backdrop_path,
          media_type: "tv",
          season,
          episode,
        });
      } catch (e) {
        console.error("Failed to load TV details", e);
      }
    };
    load();
  }, [id, season, episode]);

  // Episode count for the current season (drives the "next episode" button).
  useEffect(() => {
    if (!tmdbId || season == null) return;
    fetch(`/api/tmdb?path=/tv/${tmdbId}/season/${season}`)
      .then((r) => r.json())
      .then((d) => setEpisodeCount((d.episodes || []).length))
      .catch(() => setEpisodeCount(0));
  }, [tmdbId, season]);

  const handleProgress = useCallback(
    (watched, duration) => {
      if (tmdbId) updateWatchProgress(tmdbId, watched, duration, season, episode);
    },
    [tmdbId, season, episode]
  );

  const goToEpisode = useCallback(
    (s, e) => {
      setSeason(s);
      setEpisode(e);
      router.replace(`/tv/${id}?season=${s}&episode=${e}`, undefined, { shallow: true });
    },
    [id, router]
  );

  const hasNext = episodeCount > 0 && episode < episodeCount;
  const handleNext = useCallback(() => {
    if (hasNext) goToEpisode(season, episode + 1);
  }, [hasNext, season, episode, goToEpisode]);

  if (!id || season == null || episode == null) return <div className="fixed inset-0 bg-black" />;

  return (
    <div className="fixed inset-0 bg-black">
      <VideoPlayer
        key={`${season}-${episode}`}
        id={id}
        type="tv"
        season={season}
        episode={episode}
        title={title ? `${title} · S${season}:E${episode}` : ""}
        onBack={() => router.push("/")}
        onProgress={handleProgress}
        hasNext={hasNext}
        onNext={handleNext}
      />
    </div>
  );
}
