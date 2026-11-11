// A media query as React state (the shell's breakpoints: the rail above 820px, the phone layout at 560px and under).
import { useSyncExternalStore } from "react";

export function useMedia(query) {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(query); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(query).matches,
  );
}
export const RAIL = "(min-width: 821px)";
export const inRail = () => window.matchMedia(RAIL).matches;

// "Arjun Kapoor" -> "AK" (ui/topbar.js initialsFrom).
export function initialsFrom(name) {
  if (!name) return "?";
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
