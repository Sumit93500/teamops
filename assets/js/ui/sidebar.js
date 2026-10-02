// ui/sidebar.js
// Builds the sidebar from config/nav.js, keeping only the items the
// signed-in role is allowed to see, and highlighting the current page.
// Also fills the footer's "N active employees" line from the live employee list.

import { NAV } from "../config/nav.js";
import { can } from "../core/rbac.js";
import { getCurrentRole } from "../core/auth.js";
import { resolvePageLink } from "../core/paths.js";
import { ICONS } from "./icons.js";
import { activeHeadcount } from "../data/store.js";

function currentPagePath() {
  const path = window.location.pathname;
  const marker = "/pages/";
  const idx = path.indexOf(marker);
  if (idx === -1) return "";
  return path.slice(idx + marker.length);
}

function buildItem(item, currentPath) {
  const href = item.href === "@landing"
    ? getCurrentRole()?.landing ?? "auth/login.html"
    : item.href;

  const link = resolvePageLink(href);
  const isActive = href === currentPath;

  const a = document.createElement("a");
  a.className = "nav__item" + (isActive ? " is-active" : "");
  a.href = link;
  const path = ICONS[item.icon] ?? ICONS.default;
  const count = item.badge ? `<span class="nav__count">${item.badge}</span>` : "";
  a.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>${item.label}${count}`;
  return a;
}

export function renderSidebar(container) {
  if (!container) return;
  container.innerHTML = "";
  const currentPath = currentPagePath();

  NAV.forEach((group) => {
    const visibleItems = group.items.filter((item) => can(item.permission));
    if (visibleItems.length === 0) return;

    const groupTitle = document.createElement("div");
    groupTitle.className = "nav__group-title";
    groupTitle.textContent = group.group;
    container.appendChild(groupTitle);

    visibleItems.forEach((item) => {
      container.appendChild(buildItem(item, currentPath));
    });
  });
}

// The footer's headcount line (#sidebar-headcount on every page with a sidebar):
// everyone not inactive, the same people as a payroll run.
export function renderHeadcount(target) {
  if (!target) return;
  const n = activeHeadcount();
  target.textContent = `${n} active ${n === 1 ? "employee" : "employees"}`;
}