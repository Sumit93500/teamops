// core/guard.js
// Runs at the top of every protected page. Sends people to the login page
// if nobody is signed in (or whoever is can't be found on record), or to the
// 403 page if their role on record can't open this page.
// Skips the check entirely on pages that don't need sign-in (login, 403, etc.)

import { isSignedIn, getCurrentRole, getCurrentUser, signOut } from "./auth.js";
import { ROUTES } from "../config/routes.js";
import { can } from "./rbac.js";
import { resolvePageLink } from "./paths.js";

const PUBLIC_PAGES = [
  "auth/login.html",
  "auth/forgot-password.html",
  "auth/reset-password.html",
  "auth/two-factor.html",
  "errors/403.html",
  "errors/404.html",
  "errors/500.html",
];

function currentPagePath() {
  const path = window.location.pathname;
  const marker = "/pages/";
  const idx = path.indexOf(marker);
  if (idx === -1) return null;
  return path.slice(idx + marker.length);
}

export function guardPage() {
  const pagePath = currentPagePath();

  if (pagePath && PUBLIC_PAGES.includes(pagePath)) {
    return true;   // no sign-in required on this page — don't check anything
  }

  if (!isSignedIn()) {
    window.location.href = resolvePageLink("auth/login.html");
    return false;
  }

  // Signed in, but not on record: deleted or deactivated since, or an old
  // session with no employee id. Signed out and sent to sign in again (round
  // 11P), not to the 403 page: no role is missing a permission here.
  if (!getCurrentUser()) {
    signOut();
    window.location.href = resolvePageLink("auth/login.html");
    return false;
  }

  const required = pagePath ? ROUTES[pagePath] : undefined;

  if (required && !can(required)) {
    window.location.href = resolvePageLink("errors/403.html");
    return false;
  }

  return true;
}

export function redirectToLanding() {
  const role = getCurrentRole();
  const landing = role ? role.landing : "auth/login.html";
  window.location.href = resolvePageLink(landing);
}