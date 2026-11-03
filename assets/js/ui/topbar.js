// ui/topbar.js
// Fills in the topbar's breadcrumb and avatar with the signed-in person's info,
// and makes the bell a link to what waits for them.

import { getCurrentRole, getCurrentUserId, getCurrentUserLabel, signOut } from "../core/auth.js";
import { canOpenPage } from "../core/guard.js";
import { resolvePageLink } from "../core/paths.js";
import { waitingCount } from "./waiting.js";

const INBOX = "requests/approvals-inbox.html";

// The bell links to the Approvals Inbox, labelled with what waits for this
// person (ui/waiting.js, the sidebar's number); the dot only shows above 0. If
// they can't open the Inbox it stays the page's placeholder button, with no dot.
export function renderBell() {
  const button = document.querySelector(".topbar__icon-btn--dot");
  if (!button || !canOpenPage(INBOX)) return;
  const bell = document.createElement("a");
  bell.className = button.className;
  bell.href = resolvePageLink(INBOX);
  bell.append(...button.childNodes);
  button.replaceWith(bell);
  refreshBell();
}

export function refreshBell() {
  const bell = document.querySelector("a.topbar__icon-btn--dot");
  if (!bell) return;
  const n = waitingCount(getCurrentUserId(), getCurrentRole()?.key);
  bell.setAttribute("aria-label", `Waiting for you: ${n}`);
  bell.title = `Waiting for you: ${n}`;
  bell.toggleAttribute("data-waiting", n > 0);
}

function initialsFrom(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function renderTopbar({ breadcrumbSelector, avatarSelector, signOutSelector } = {}) {
  const label = getCurrentUserLabel();
  const role = getCurrentRole();

  if (breadcrumbSelector) {
    const el = document.querySelector(breadcrumbSelector);
    if (el && role) el.textContent = role.label;
  }

  if (avatarSelector) {
    const el = document.querySelector(avatarSelector);
    if (el) {
      el.textContent = initialsFrom(label);
      el.title = label ?? "";
    }
  }

  if (signOutSelector) {
    const el = document.querySelector(signOutSelector);
    if (el) {
      el.addEventListener("click", () => {
        signOut();
        window.location.href = resolvePageLink("auth/login.html");
      });
    }
  }
}