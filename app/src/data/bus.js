// The app's one change signal. The old stores (../assets/js/data) keep their data in localStorage and have no
// change events, so the app counts changes itself: every write made through useAction() bumps the version,
// and so does any change another tab makes to the same storage (the browser's "storage" event, which fires
// only in the other tabs). Components read through useData(), which re-reads when the version moves.

let version = 0;
const listeners = new Set();

export function bump() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getVersion = () => version;

// Another tab signed in or out, or saved a record: re-read (the stores' keys are "officeos:<name>"; a
// cleared storage has no key).
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === null || event.key.startsWith("officeos:")) bump();
  });
}
