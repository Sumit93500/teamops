// core/rbac.js
// The actual RBAC engine. Two jobs:
//   1. can(permission) — a pure yes/no check against the signed-in role.
//   2. applyPermissions() — hides any element whose data-permission the role lacks.
//
// This is the ONLY file that should read data-permission attributes.

import { getCurrentRole } from "./auth.js";

// The core check. Everything else in the app should call this instead of
// looking at roles or permissions directly.
export function can(permission) {
  const role = getCurrentRole();
  if (!role) return false;               // nobody signed in = no permissions at all
  return role.permissions.includes(permission);
}

// Convenience: true only if the role has EVERY permission in the list.
export function canAll(permissions) {
  return permissions.every((p) => can(p));
}

// Convenience: true if the role has AT LEAST ONE of the permissions.
export function canAny(permissions) {
  return permissions.some((p) => can(p));
}

// Finds every element with data-permission on the current page and hides
// the ones the signed-in role isn't allowed to use.
export function applyPermissions(root = document) {
  const elements = root.querySelectorAll("[data-permission]");

  elements.forEach((el) => {
    const required = el.dataset.permission;
    if (can(required)) {
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  });
}

// Same idea, but for the person's data scope ("all" vs "own"), used later
// when a page needs to decide whose records to show, not just which buttons.
export function currentDataScope() {
  const role = getCurrentRole();
  return role ? role.dataScope : null;
}