// core/paths.js
// Works out how deep the current page sits inside /pages/, so other scripts
// can build correct relative links without hardcoding "../../" everywhere.

function depthInPages() {
  const path = window.location.pathname;
  const marker = "/pages/";
  const idx = path.indexOf(marker);
  if (idx === -1) return 0;

  const afterPages = path.slice(idx + marker.length);
  const segments = afterPages.split("/").filter(Boolean);
  return segments.length;
}

export function rootPrefix() {
  return "../".repeat(depthInPages());
}

export function resolvePageLink(pathFromPagesRoot) {
  const depth = depthInPages();
  if (depth === 0) {
    return "pages/" + pathFromPagesRoot;
  }
  return "../".repeat(depth - 1) + pathFromPagesRoot;
}

export function resolveRootLink(pathFromRoot) {
  return rootPrefix() + pathFromRoot;
}