// ui/theme.js
// Light/dark mode, saved so it stays the same across pages.

import { save, load } from "../core/storage.js";

const THEME_KEY = "theme";

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  save(THEME_KEY, theme);
}

export function loadTheme() {
  const saved = load(THEME_KEY);
  if (saved) {
    document.documentElement.dataset.theme = saved;
  }
}

export function toggleTheme() {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  applyTheme(current === "dark" ? "light" : "dark");
}