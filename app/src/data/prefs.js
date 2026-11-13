// A1: the person's appearance preferences, in ONE store. The header's Appearance menu, the Appearance page and Settings >
// Appearance all read and write it here, so each shows the other's change at once, and other open tabs follow (the
// storage event).
//   theme    light | dark | system (follows the device, live)       accent   "" (the role's colour) | the six accents
//   density  comfortable | compact                                   text     small | default | large
//   sidebar  remember (S1: the last toggle, else the width's default) | expanded | collapsed
//   motion   device (follow the device's reduced-motion setting) | reduce (always)
// Saved per signed-in person under "officeos:prefs:<employee id>" (before sign-in: "officeos:prefs", this device's). The
// theme and accent are also written to the keys every page has used ("officeos:theme", "officeos:accent"), so nothing that
// reads them changes; a person with nothing saved yet starts from them. Applied to <html> as data attributes: data-theme,
// data-accent, data-density="compact", data-text="small|large", data-motion="reduce" (none of them at the default, so the
// default look is exactly the old one). index.html's head script applies the same before the first paint. Storage that
// is blocked doesn't break anything: the choices then live in memory for this visit.
import { useSyncExternalStore } from "react";
import { THEMES, ACCENTS } from "../../../assets/js/ui/theme.js";

export { THEMES, ACCENTS };
export const ROLE_COLOUR = "My role's colour";
export const DENSITIES = [["comfortable", "Comfortable"], ["compact", "Compact"]];
export const TEXT_SIZES = [["small", "Small"], ["default", "Default"], ["large", "Large"]];
export const SIDEBAR_DEFAULTS = [["remember", "Remember my last choice"], ["expanded", "Expanded"], ["collapsed", "Collapsed"]];
export const MOTIONS = [["device", "Follow the device"], ["reduce", "Always reduce"]];
export const DEFAULTS = Object.freeze({ theme: "light", accent: "", density: "comfortable", text: "default", sidebar: "remember", motion: "device" });
const ALLOWED = {
  theme: THEMES.map(([v]) => v), accent: ["", ...ACCENTS.map(([v]) => v)], density: DENSITIES.map(([v]) => v),
  text: TEXT_SIZES.map(([v]) => v), sidebar: SIDEBAR_DEFAULTS.map(([v]) => v), motion: MOTIONS.map(([v]) => v),
};
const P = "officeos:";

// ---------- storage, with an in-memory stand-in when the browser refuses ----------
const memory = new Map();
let blocked = false;
function getRaw(key) {
  if (memory.has(key)) return memory.get(key);   // a write the browser refused: what was chosen this visit wins
  try { return localStorage.getItem(key); } catch { blocked = true; return null; }
}
function setRaw(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { blocked = true; memory.set(key, value); return false; }
}
function removeRaw(key) {
  try { localStorage.removeItem(key); memory.delete(key); } catch { blocked = true; memory.set(key, null); }
}
const parse = (s) => { try { return s === null ? null : JSON.parse(s); } catch { return null; } };
export const storageBlocked = () => blocked;

const whoKey = () => {
  const session = parse(getRaw(`${P}session`));
  return session?.employeeId ? `${P}prefs:${session.employeeId}` : `${P}prefs`;
};
function clean(box) {
  const out = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS)) if (box && ALLOWED[k].includes(box[k])) out[k] = box[k];
  return out;
}

// What applies now: this person's saved choices, else this device's (its prefs and the old theme / accent keys).
export function readPrefs() {
  const own = parse(getRaw(whoKey()));
  if (own && typeof own === "object") return clean(own);
  const device = parse(getRaw(`${P}prefs`)) ?? {};
  const theme = parse(getRaw(`${P}theme`)), accent = parse(getRaw(`${P}accent`));
  return clean({ ...device, ...(theme !== null ? { theme } : {}), ...(accent !== null ? { accent } : {}) });
}

function write(prefs) {
  const ok = setRaw(whoKey(), JSON.stringify(prefs));
  setRaw(`${P}theme`, JSON.stringify(prefs.theme));                      // the keys every page has read
  if (prefs.accent) setRaw(`${P}accent`, JSON.stringify(prefs.accent)); else removeRaw(`${P}accent`);
  return ok;
}

// ---------- <html> ----------
const darkDevice = () => window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
export function applyPrefs(prefs = readPrefs()) {
  const d = document.documentElement;
  d.dataset.theme = prefs.theme === "system" ? (darkDevice() ? "dark" : "light") : prefs.theme;
  const set = (name, value) => (value ? d.setAttribute(name, value) : d.removeAttribute(name));
  set("data-accent", prefs.accent);
  set("data-density", prefs.density === "compact" ? "compact" : null);
  set("data-text", prefs.text === "default" ? null : prefs.text);
  set("data-motion", prefs.motion === "reduce" ? "reduce" : null);
}

// ---------- changes ----------
const listeners = new Set();
let version = 0;
function changed() { version++; applyPrefs(); listeners.forEach((l) => l()); }
export const subscribePrefs = (l) => { listeners.add(l); return () => listeners.delete(l); };

// One choice; returns true when it was saved (false: applied for this visit only, storage is blocked).
export function setPref(name, value) {
  if (!ALLOWED[name]?.includes(value)) return false;
  const ok = write({ ...readPrefs(), [name]: value });
  changed();
  return ok;
}
export function resetPrefs() {
  const ok = write({ ...DEFAULTS });
  changed();
  return ok;
}

let started = false;
// Once, at start: paint, follow the device's colour scheme when the theme says so, and follow other tabs.
export function initPrefs() {
  applyPrefs();
  if (started) return;
  started = true;
  window.matchMedia?.("(prefers-color-scheme: dark)")?.addEventListener?.("change", () => { if (readPrefs().theme === "system") changed(); });
  window.addEventListener("storage", (e) => {
    if (e.key === null || e.key.startsWith(`${P}prefs`) || e.key === `${P}theme` || e.key === `${P}accent` || e.key === `${P}session`) changed();
  });
}
// Someone signed in or out in this tab: their own choices apply.
export const refreshPrefs = () => changed();

export function usePrefs() {
  useSyncExternalStore(subscribePrefs, () => version);
  return readPrefs();
}