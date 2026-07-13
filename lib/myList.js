// "My List" persistence in localStorage. Powers the + buttons across the app
// and the /my-list page.

const KEY = "myList";
const EVENT = "my-list-update";

function read() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
}

export const MY_LIST_EVENT = EVENT;

export function getMyList() {
  return read();
}

export function isInMyList(id) {
  return read().some((i) => String(i.id) === String(id));
}

export function toggleMyList(item) {
  const list = read();
  const id = item.id || item.tmdb_id;
  const idx = list.findIndex((i) => String(i.id) === String(id));
  if (idx > -1) {
    list.splice(idx, 1);
    write(list);
    return false;
  }
  list.unshift({
    id,
    tmdb_id: item.tmdb_id || item.id,
    imdb_id: item.imdb_id,
    title: item.title || item.name,
    name: item.name || item.title,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    media_type: item.media_type || item.type || "movie",
    added_at: Date.now(),
  });
  write(list);
  return true;
}
