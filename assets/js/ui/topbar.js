// ui/topbar.js
// Fills in the topbar's breadcrumb and avatar with the signed-in person's info.

import { getCurrentRole, getCurrentUserLabel, signOut } from "../core/auth.js";
import { resolvePageLink } from "../core/paths.js";

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