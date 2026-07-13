// Single source of truth for the "Continue Watching" list and per-episode
// progress, both stored in localStorage. Previously this logic was copy-pasted
// across MediaCard, HoverCard, InfoModal and the watch pages; centralizing it
// keeps the shape consistent and the events firing in one place.

const CW_KEY = "continueWatching";
const EP_KEY = "episodeProgress";
const CW_EVENT = "continue-watching-update";
const EP_EVENT = "episode-progress-update";

function readList(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeList(key, value, event) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(event));
}

export function getContinueWatching() {
  const list = readList(CW_KEY, []);
  return list.filter((i) => i.id && (i.poster_path || i.backdrop_path));
}

// Insert or move an item to the front of the list, preserving prior progress.
export function upsertContinueWatching(item) {
  const list = readList(CW_KEY, []);
  const idx = list.findIndex((i) => String(i.id) === String(item.id));
  const prior = idx > -1 ? list[idx] : null;
  if (idx > -1) list.splice(idx, 1);

  list.unshift({
    id: item.id,
    tmdb_id: item.tmdb_id || item.id,
    imdb_id: item.imdb_id,
    title: item.title || item.name,
    name: item.name || item.title,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    media_type: item.media_type || "movie",
    season: item.season ?? prior?.season ?? null,
    episode: item.episode ?? prior?.episode ?? null,
    progress: item.progress ?? prior?.progress ?? 5,
    last_watched: Date.now(),
  });

  writeList(CW_KEY, list, CW_EVENT);
}

export function removeContinueWatching(id) {
  const list = readList(CW_KEY, []).filter((i) => String(i.id) !== String(id));
  writeList(CW_KEY, list, CW_EVENT);
}

// Update playback progress; drops the item once effectively finished (>90%).
export function updateWatchProgress(id, watched, duration, season, episode) {
  if (!duration || duration <= 0) return;
  const pct = Math.min((watched / duration) * 100, 100);
  const list = readList(CW_KEY, []);
  const idx = list.findIndex((i) => String(i.id) === String(id));
  if (idx === -1) return;

  if (pct > 90) {
    list.splice(idx, 1);
  } else {
    list[idx].progress = pct;
    list[idx].last_watched = Date.now();
    if (season != null) list[idx].season = season;
    if (episode != null) list[idx].episode = episode;
  }
  writeList(CW_KEY, list, CW_EVENT);

  if (season != null && episode != null) {
    saveEpisodeProgress(id, season, episode, watched, duration);
  }
}

export function saveEpisodeProgress(showId, season, episode, watched, duration) {
  if (!showId || !duration || duration <= 0) return;
  const all = readList(EP_KEY, {});
  all[`${showId}_s${season}_e${episode}`] = {
    showId: String(showId),
    season: Number(season),
    episode: Number(episode),
    time: watched,
    duration,
    progress: Math.min((watched / duration) * 100, 100),
    updatedAt: Date.now(),
  };
  writeList(EP_KEY, all, EP_EVENT);
}

export function getEpisodeProgress(showId) {
  const all = readList(EP_KEY, {});
  const out = {};
  for (const v of Object.values(all)) {
    if (String(v.showId) === String(showId)) out[`s${v.season}_e${v.episode}`] = v.progress;
  }
  return out;
}

// Look up a saved resume position (season/episode) for a show.
export function getResumePosition(id) {
  const list = readList(CW_KEY, []);
  const saved = list.find(
    (i) => String(i.id) === String(id) || String(i.tmdb_id) === String(id) || String(i.imdb_id) === String(id)
  );
  return saved ? { season: saved.season, episode: saved.episode } : null;
}
