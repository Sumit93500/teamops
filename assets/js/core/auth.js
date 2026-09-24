// core/auth.js
// The single source of truth for "who is signed in right now."
// Nothing else in the app should read localStorage directly for the session —
// everything asks the functions here instead.

import { save, load, remove } from "./storage.js";
import { ROLES } from "../config/roles.js";

const SESSION_KEY = "session";

// Called from the login page once someone picks a role.
export function signIn(roleKey, userLabel) {
  const role = ROLES[roleKey];
  if (!role) {
    console.error(`auth: unknown role "${roleKey}"`);
    return false;
  }
  save(SESSION_KEY, { roleKey, userLabel, signedInAt: Date.now() });
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

// Returns the full role object (label, permissions, dataScope, landing page)
// for whoever is signed in, or null.
export function getCurrentRole() {
  const session = getSession();
  if (!session) return null;
  return ROLES[session.roleKey] ?? null;
}

export function getCurrentUserLabel() {
  const session = getSession();
  return session ? session.userLabel : null;
}