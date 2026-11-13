// S1: the desktop sidebar's two widths. Collapsed is the icon rail (64 px, flyouts, labels as chips on hover and focus);
// expanded (240 px) lists every item with its icon and label under its group's heading. <html data-nav-wide> marks
// expanded; the CSS reads it only above 820 px (the phone's drawer is unchanged). The person's choice is kept in
// "officeos:sidebar" ("expanded" | "collapsed"); with no choice, 1280 px and wider opens expanded and narrower collapsed,
// following the window. index.html's head script applies the same rule before the first paint, so nothing flashes.
// A1: the person's "Sidebar on a computer" preference (data/prefs.js) comes first: expanded or collapsed opens it so on
// every page; "remember" (the default) is the rule above.
import { useEffect, useSyncExternalStore } from "react";
import { load, save } from "../../../assets/js/core/storage.js";
import { readPrefs, subscribePrefs } from "../data/prefs.js";

export const NAV_KEY = "sidebar";
export const WIDE_QUERY = "(min-width: 1280px)";
const listeners = new Set();

export function storedChoice() {
  const v = load(NAV_KEY);
  return v === "expanded" || v === "collapsed" ? v : null;
}
export function wideNow() {
  const pref = readPrefs().sidebar;
  if (pref === "expanded" || pref === "collapsed") return pref === "expanded";
  const choice = storedChoice();
  if (choice) return choice === "expanded";
  return window.matchMedia(WIDE_QUERY).matches;
}
function apply() {
  document.documentElement.toggleAttribute("data-nav-wide", wideNow());
  listeners.forEach((cb) => cb());
}
// The person's choice: kept (a browser that can't store it still switches for this page).
export function setWide(wide) {
  try { save(NAV_KEY, wide ? "expanded" : "collapsed"); } catch { /* storage blocked: this page only */ }
  document.documentElement.toggleAttribute("data-nav-wide", wide);
  listeners.forEach((cb) => cb());
}
const read = () => document.documentElement.hasAttribute("data-nav-wide");
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb); };

// The current width as React state; with no stored choice it follows the 1280 px line as the window is resized.
export function useNavWide() {
  useEffect(() => {
    const m = window.matchMedia(WIDE_QUERY);
    const onChange = () => { if (!storedChoice() && readPrefs().sidebar === "remember") apply(); };
    m.addEventListener("change", onChange);
    const off = subscribePrefs(apply);
    apply();
    return () => { m.removeEventListener("change", onChange); off(); };
  }, []);
  return useSyncExternalStore(subscribe, read);
}