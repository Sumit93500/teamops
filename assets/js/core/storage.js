// core/storage.js
// A thin, safe wrapper around the browser's localStorage.
// Nothing here knows about "users" or "roles" — it just saves and reads
// named boxes of data. auth.js decides WHAT goes in each box.

const PREFIX = "officeos:";

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`storage: failed to save "${key}"`, err);
    return false;
  }
}

export function load(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? null : JSON.parse(raw);
  } catch (err) {
    console.error(`storage: failed to read "${key}"`, err);
    return null;
  }
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key);
}