// ui/topbar.js
// Fills in the topbar's breadcrumb and avatar with the signed-in person's info,
// and makes the bell open the list of what waits for them (round 14G).

import { getCurrentRole, getCurrentUserId, getCurrentUserLabel, signOut } from "../core/auth.js";
import { canOpenPage } from "../core/guard.js";
import { resolvePageLink } from "../core/paths.js";
import { waitingCount } from "./waiting.js";

const INBOX = "requests/approvals-inbox.html";

// The bell opens the list of what waits for this person (ui/approval-card.js,
// loaded on the first click; See all goes to the Approvals Inbox), labelled with
// how many (ui/waiting.js, the sidebar's number); the dot only shows above 0.
// It's a new button: the placeholder's own carries its "not built yet" toast.
// If they can't open the Inbox it stays the page's placeholder, with no dot.
export function renderBell() {
  const button = document.querySelector(".topbar__icon-btn--dot");
  if (!button || !canOpenPage(INBOX)) return;
  const bell = document.createElement("button");
  bell.type = "button";
  bell.className = button.className;
  bell.setAttribute("aria-haspopup", "dialog");
  bell.setAttribute("aria-expanded", "false");
  bell.append(...button.childNodes);
  // A second tap while the list's script is still on its way (a slow phone's first tap) is ignored:
  // it would close the list the first tap is opening.
  let loading = false;
  bell.addEventListener("click", () => {
    if (loading) return;
    loading = true;
    import("./approval-card.js")
      .then((card) => card.toggleBellPanel(bell))
      .catch(() => { window.location.href = resolvePageLink(INBOX); })   // if the list can't load, the inbox, as before
      .finally(() => { loading = false; });
  });
  button.replaceWith(bell);
  refreshBell();
}

export function refreshBell() {
  const bell = document.querySelector(".topbar__icon-btn--dot[aria-haspopup]");
  if (!bell) return;
  const n = waitingCount(getCurrentUserId(), getCurrentRole()?.key);
  bell.setAttribute("aria-label", `Waiting for you: ${n}`);
  bell.title = `Waiting for you: ${n}`;
  bell.toggleAttribute("data-waiting", n > 0);
}

export function initialsFrom(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// The account menu's Sign out, and the drawer's (ui/rail.js).
export function signOutNow() {
  signOut();
  window.location.href = resolvePageLink("auth/login.html");
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
      el.addEventListener("click", signOutNow);
    }
  }
}