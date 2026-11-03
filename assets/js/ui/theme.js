// ui/theme.js
// The person's look on this device: light, dark or the device's setting, and an
// accent colour (none = their role's own, tokens.css). Saved so it stays the same
// across pages and sign-ins. The topbar's Appearance menu sets both.

import { save, load, remove } from "../core/storage.js";

const THEME_KEY = "theme";
const ACCENT_KEY = "accent";
const CHANGED = "officeos:appearance";
const PALETTE = "M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1.1.9-2 2-2h2.5a4.5 4.5 0 0 0 4.5-4.5C22 6.1 17.5 3 12 3M7.5 12h.01M9.5 7.5h.01M14.5 7.5h.01";

export const THEMES = [["light", "Light"], ["dark", "Dark"], ["system", "Match the device"]];
export const ACCENTS = [["indigo", "Indigo"], ["blue", "Blue"], ["teal", "Teal"], ["violet", "Violet"], ["slate", "Slate"], ["pink", "Pink"]];
const ROLE_COLOUR = "My role's colour";

const deviceScheme = () => window.matchMedia?.("(prefers-color-scheme: dark)");

// Anything else in the box (an old or hand-edited value) counts as nothing saved.
export function savedTheme() {
  const saved = load(THEME_KEY);
  return THEMES.some(([value]) => value === saved) ? saved : null;
}

function savedAccent() {
  const saved = load(ACCENT_KEY);
  return ACCENTS.some(([value]) => value === saved) ? saved : null;
}

function paintTheme(theme) {
  document.documentElement.dataset.theme = theme !== "system" ? theme : deviceScheme()?.matches ? "dark" : "light";
}

function paintAccent(accent) {
  if (accent) document.documentElement.dataset.accent = accent;
  else delete document.documentElement.dataset.accent;
}

const announce = () => document.dispatchEvent(new window.CustomEvent(CHANGED));

// The menu and Settings' card show the same setting: each redraws when the other changes it.
export function onAppearanceChange(draw) {
  document.addEventListener(CHANGED, draw);
}

export function applyTheme(theme) {
  save(THEME_KEY, theme);
  paintTheme(theme);
  announce();
}

export function applyAccent(accent) {
  if (accent) save(ACCENT_KEY, accent);
  else remove(ACCENT_KEY);
  paintAccent(accent);
  announce();
}

export function loadTheme() {
  const saved = savedTheme();
  if (saved) paintTheme(saved);
  paintAccent(savedAccent());
  deviceScheme()?.addEventListener?.("change", () => {
    if (savedTheme() === "system") paintTheme("system");
  });
}

export function toggleTheme() {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

// Draws the Appearance menu first in the topbar's actions, as a .dropdown, so
// ui/dropdown.js opens and closes it and returns focus. A page with no topbar
// (sign-in, errors) has nowhere to draw it. Call before initDropdowns().
export function renderThemeMenu(actions = document.querySelector(".topbar__actions")) {
  if (!actions) return;
  const menu = document.createElement("div");
  menu.className = "dropdown";
  menu.innerHTML = `
    <button class="topbar__icon-btn" type="button" aria-label="Appearance" title="Appearance"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${PALETTE}"></path></svg></button>
    <div class="dropdown__menu theme-menu">
      <div class="theme-menu__title">Theme</div>
      <div class="theme-menu__themes" role="group" aria-label="Theme">
        ${THEMES.map(([value, label]) => `<button class="theme-menu__theme" type="button" data-theme-choice="${value}">${label}</button>`).join("")}
      </div>
      <div class="theme-menu__title">Accent colour</div>
      <div class="theme-menu__accents" role="group" aria-label="Accent colour">
        <button class="theme-swatch theme-swatch--role" type="button" data-accent-choice="" aria-label="${ROLE_COLOUR}" title="${ROLE_COLOUR}"></button>
        ${ACCENTS.map(([value, label]) => `<button class="theme-swatch" type="button" data-accent-choice="${value}" data-accent="${value}" aria-label="${label}" title="${label}"></button>`).join("")}
      </div>
      <div class="theme-menu__current" aria-hidden="true"></div>
    </div>`;
  const draw = () => {
    const theme = savedTheme() ?? "light", accent = savedAccent() ?? "";
    menu.querySelectorAll("[data-theme-choice]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeChoice === theme)));
    menu.querySelectorAll("[data-accent-choice]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.accentChoice === accent)));
    // A swatch is only a colour until it's named: on a phone there's no tooltip.
    menu.querySelector(".theme-menu__current").textContent = ACCENTS.find(([value]) => value === accent)?.[1] ?? ROLE_COLOUR;
  };
  menu.querySelectorAll("[data-theme-choice]").forEach((b) => b.addEventListener("click", () => applyTheme(b.dataset.themeChoice)));
  menu.querySelectorAll("[data-accent-choice]").forEach((b) => b.addEventListener("click", () => applyAccent(b.dataset.accentChoice)));
  // Stays open so colours can be compared, and focus stays on the choice just made; Esc or a click elsewhere closes it.
  menu.querySelector(".theme-menu").addEventListener("click", (e) => e.stopPropagation());
  draw();
  onAppearanceChange(draw);
  actions.prepend(menu);
}