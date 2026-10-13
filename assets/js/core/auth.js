// core/auth.js
// The single source of truth for "who is signed in right now."
// Nothing else in the app should read localStorage directly for the session —
// everything asks the functions here instead.

import { save, load, remove } from "./storage.js";
import { ROLES } from "../config/roles.js";
import { getUser } from "../data/store.js";

const SESSION_KEY = "session";

// Called from the login page once someone picks a role.
export function signIn(roleKey, userLabel, employeeId) {
  const role = ROLES[roleKey];
  if (!role) {
    console.error(`auth: unknown role "${roleKey}"`);
    return false;
  }
  save(SESSION_KEY, { roleKey, userLabel, employeeId, signedInAt: Date.now() });
  return true;
}

export function signOut() {
  remove(SESSION_KEY);
}

// Returns the raw session object, or null if nobody is signed in.
export function getSession() {
  return load(SESSION_KEY);
}

export function isSignedIn() {
  return getSession() !== null;
}

// The signed-in person's stored record: the session's employee id, on record
// and not inactive. null when nobody is signed in, the session has no employee
// id (an old sign-in), or the person was deleted or deactivated since. Read on
// every call, never kept here (round 11P): the record decides, not the role
// picked at sign-in.
export function getCurrentUser() {
  const id = getCurrentUserId();
  const user = id ? getUser(id) : null;
  return user && user.status !== "inactive" ? user : null;
}

// Returns the full role object (label, permissions, dataScope, landing page)
// of the signed-in person's role on record (getCurrentUser()), or null. The
// role picked at sign-in isn't read, so a promotion or demotion shows at the
// next page load (round 11P).
export function getCurrentRole() {
  const user = getCurrentUser();
  return user ? ROLES[user.role] ?? null : null;
}

export function getCurrentUserLabel() {
  const session = getSession();
  return session ? session.userLabel : null;
}

// The employee id (e.g. "EMP-1105") of whoever is signed in, or null.
// Sessions saved before ids were stored have none, so this is null for them too.
export function getCurrentUserId() {
  const session = getSession();
  return session?.employeeId ?? null;
}