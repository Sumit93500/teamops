// ui/sidebar.js
// Builds the sidebar from config/nav.js, keeping only the items the
// signed-in role is allowed to see (or, for an item marked alsoForManagers,
// that the person sees as a manager), and highlighting the current page.
// An item with countWaiting shows how many requests wait for the person's
// decision (ui/waiting.js, the same rows as the approvals inbox).
// Also fills the footer's "N employees" line from the live employee list.

import { NAV } from "../config/nav.js";
import { can } from "../core/rbac.js";
import { getCurrentRole, getCurrentUserId } from "../core/auth.js";
import { resolvePageLink } from "../core/paths.js";
import { ICONS, SECTION_ICONS } from "./icons.js";
import { activeHeadcount } from "../data/store.js";
import { managesAnyone, pendingFor } from "../data/expenses-store.js";
import { isManager as hasReports } from "../data/reporting.js";
import { pendingFor as pendingAssetRequests } from "../data/asset-requests-store.js";
import { waitingCount } from "./waiting.js";
import { refreshBell } from "./topbar.js";

function currentPagePath() {
  const path = window.location.pathname;
  const marker = "/pages/";
  const idx = path.indexOf(marker);
  if (idx === -1) return "";
  return path.slice(idx + marker.length);
}

// An item's page, relative to the pages folder.
export function navItemHref(item) {
  return item.href === "@landing"
    ? getCurrentRole()?.landing ?? "auth/login.html"
    : item.href;
}

function buildItem(item, currentPath, sectionIcon) {
  const href = navItemHref(item);

  const link = resolvePageLink(href);
  const isActive = href === currentPath;

  const a = document.createElement("a");
  a.className = "nav__item" + (isActive ? " is-active" : "");
  a.href = link;
  if (isActive) a.setAttribute("aria-current", "page");
  const path = sectionIcon ?? ICONS[item.icon] ?? ICONS.default;
  a.innerHTML = `<svg class="icon${sectionIcon ? " icon--solid" : ""}" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>${item.label}`;
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
// counts already in the sidebar, and the topbar's bell, are brought up to date without redrawing them.
export function refreshWaitingCount(root = document) {
  root.querySelectorAll(".nav__item[data-count-waiting]").forEach(setWaitingCount);
  refreshBell();
}

// Has people reporting to them, or an expense claim or asset request waiting
// on them as its manager (each keeps the manager it was sent to).
function isManager() {
  const id = getCurrentUserId();
  const role = getCurrentRole()?.key;
  return managesAnyone(id) || pendingFor(id, role).length > 0 || pendingAssetRequests(id, role).length > 0;
}

// Whether the sidebar lists this item for the signed-in person (ui/search.js asks too).
export function navItemVisible(item) {
  return can(item.permission) || (item.alsoForManagers && isManager()) || (item.alsoForReports && hasReports(getCurrentUserId()));
}

// Built whole, then swapped in: a throw on the way leaves the page's static list as
// it was. Every page's head script marks <html data-nav-pending>, which hides the list
// and the footer below it (shell.css), so the static list never shows and the footer
// doesn't jump; drawing lifts the mark, and so does the head script at load, so a list
// that never gets drawn doesn't stay hidden. data-nav-drawn keeps the rail narrow
// after that (layout/rail.css): with neither mark the list never drew, and the static
// one shows at full width. Each section: its button (none if it has one page, whose
// link goes straight there) and a panel of links, which ui/rail.js opens.
export function renderSidebar(container) {
  if (!container) return;
  const drawn = document.createDocumentFragment();
  const currentPath = currentPagePath();

  NAV.forEach((group, index) => {
    const visibleItems = group.items.filter(navItemVisible);
    if (visibleItems.length === 0) return;

    const section = document.createElement("div");
    section.className = "nav__section";
    const panel = document.createElement("div");
    panel.className = "nav__panel";
    const groupTitle = document.createElement("div");
    groupTitle.className = "nav__group-title";
    groupTitle.textContent = group.group;
    panel.appendChild(groupTitle);

    const single = visibleItems.length === 1;
    visibleItems.forEach((item) => {
      panel.appendChild(buildItem(item, currentPath, single ? SECTION_ICONS[group.icon] : undefined));
    });
    if (single) {
      section.classList.add("nav__section--single");
      panel.querySelector("a").dataset.label = visibleItems[0].label;
    } else {
      panel.id = `nav-panel-${index}`;
      section.appendChild(buildTrigger(group, panel.id));
    }
    if (panel.querySelector(".is-active")) section.classList.add("is-current");
    section.appendChild(panel);
    drawn.appendChild(section);
  });
  container.replaceChildren(drawn);
  document.documentElement.removeAttribute("data-nav-pending");
  document.documentElement.setAttribute("data-nav-drawn", "");
}

function buildTrigger(group, panelId) {
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "nav__trigger";
  trigger.dataset.label = group.group;
  trigger.setAttribute("aria-label", group.group);
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", panelId);
  trigger.innerHTML = `<svg class="icon icon--solid" viewBox="0 0 24 24" aria-hidden="true"><path d="${SECTION_ICONS[group.icon]}"></path></svg><span class="nav__trigger-label"></span>`;
  trigger.lastChild.textContent = group.group;
  return trigger;
}

// The footer's headcount line (#sidebar-headcount on every page with a sidebar):
// everyone not inactive, the same people as a payroll run.
export function renderHeadcount(target) {
  if (!target) return;
  const n = activeHeadcount();
  target.textContent = `${n} ${n === 1 ? "employee" : "employees"}`;   // everyone not inactive (round 14E part 4: was "N active employees")
}