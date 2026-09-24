// ui/sidebar.js
// Builds the sidebar from config/nav.js, keeping only the items the
// signed-in role is allowed to see, and highlighting the current page.

import { NAV } from "../config/nav.js";
import { can } from "../core/rbac.js";
import { getCurrentRole } from "../core/auth.js";
import { resolvePageLink } from "../core/paths.js";

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
  a.innerHTML = `<span class="nav__icon" data-icon="${item.icon}"></span>${item.label}`;
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