// ui/sidebar.js
// Builds the sidebar from config/nav.js, keeping only the items the
// signed-in role is allowed to see (or, for an item marked alsoForManagers,
// that the person sees as a manager), and highlighting the current page.
// An item with countWaiting shows how many requests wait for the person's
// decision (ui/waiting.js, the same rows as the approvals inbox).
// Also fills the footer's "N active employees" line from the live employee list.

import { NAV } from "../config/nav.js";
import { can } from "../core/rbac.js";
import { getCurrentRole, getCurrentUserId } from "../core/auth.js";
import { resolvePageLink } from "../core/paths.js";
import { ICONS } from "./icons.js";
import { activeHeadcount } from "../data/store.js";
import { managesAnyone, pendingFor } from "../data/expenses-store.js";
import { waitingCount } from "./waiting.js";

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
  a.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>${item.label}`;
  if (item.countWaiting) {
    a.dataset.countWaiting = "";
    setWaitingCount(a);
  }
  return a;
}

// The count on a drawn item: how many requests wait for the signed-in person,
// none shown at 0.
function setWaitingCount(a) {
  const n = waitingCount(getCurrentUserId(), getCurrentRole()?.key);
  let count = a.querySelector(".nav__count");
  if (!n) {
    count?.remove();
    return;
  }
  if (!count) {
    count = document.createElement("span");
    count.className = "nav__count";
    a.append(count);
  }
  count.textContent = String(n);
}

// After a decision changes what waits (ui/leave-decision.js calls this), the
// counts already in the sidebar are brought up to date without redrawing it.
export function refreshWaitingCount(root = document) {
  root.querySelectorAll(".nav__item[data-count-waiting]").forEach(setWaitingCount);
}

// Has people reporting to them, or an expense claim waiting on them as its
// manager (a claim keeps the manager it was sent to).
function isManager() {
  const id = getCurrentUserId();
  return managesAnyone(id) || pendingFor(id, getCurrentRole()?.key).length > 0;
}

export function renderSidebar(container) {
  if (!container) return;
  container.innerHTML = "";
  const currentPath = currentPagePath();

  NAV.forEach((group) => {
    const visibleItems = group.items.filter((item) => can(item.permission) || (item.alsoForManagers && isManager()));
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