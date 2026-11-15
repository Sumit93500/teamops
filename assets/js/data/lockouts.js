// data/lockouts.js (F2, 2026-11-15): what the Admin sees of locked accounts. A request (data/unlock-requests.js) waits while its lock
// is still on: once the lock expires, or the person is unlocked another way (the profile's Unlock, a reset, a good sign-in after the
// lock), it is no longer waiting, without anything being rewritten.
//
// Who: accounts:unlock (the Admin). HR can't unlock (accounts:reset only); nobody resolves their own.
//   pendingUnlockRequests(deciderUserId, now?)  -> [{ id, userId, lockedAt, lockedUntil, attempts, requestedAt }]  (the inbox, bell, sidebar)
//   unlockRequestItem(id, now?)                 -> the request with its live state: status open | unlocked | dismissed | expired
//   resolveUnlockRequest(actorUserId, id, action "unlock" | "dismiss", now?)
//   lockedOnly(userIds, now?)                   the users list's "Locked" filter

import { getUser } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { accountOf, unlockAccount } from "./credentials.js";
import { allUnlockRequests, unlockRequest, closeUnlockRequest } from "./unlock-requests.js";

const fail = (error, code) => ({ ok: false, error, code });
const mayUnlock = (actorId, userId) => {
  const a = actorId ? getUser(actorId) : null;
  return Boolean(a && a.status !== "inactive" && hasPermission(a, "accounts:unlock") && a.id !== userId);
};
// Is this request's lock the one on the account now?
const stillLocked = (req, now) => { const acc = accountOf(req.userId, now); return acc.status === "locked" && acc.lockedUntil === req.lockedUntil; };

export function unlockRequestItem(id, now = Date.now()) {
  const req = unlockRequest(id);
  if (!req) return null;
  const live = req.status === "open" && !stillLocked(req, now) ? "expired" : req.status;
  return { ...req, status: live === "open" ? "pending" : live, requestedAt: new Date(req.lockedAt).toISOString() };
}

export function pendingUnlockRequests(deciderUserId, now = Date.now()) {
  const d = deciderUserId ? getUser(deciderUserId) : null;
  if (!d || !hasPermission(d, "accounts:unlock")) return [];
  return allUnlockRequests().filter((r) => r.status === "open" && r.userId !== d.id && stillLocked(r, now))
    .map((r) => ({ ...r, status: "pending", requestedAt: new Date(r.lockedAt).toISOString() }))
    .sort((a, b) => a.lockedAt - b.lockedAt);
}

export function resolveUnlockRequest(actorUserId, id, action, now = Date.now()) {
  const req = unlockRequest(id);
  if (!req) return fail("That request doesn't exist.", "gone");
  if (!mayUnlock(actorUserId, req.userId)) return fail("Only an Admin can unlock an account.", "not-allowed");
  if (req.status !== "open") return fail(`This request was already ${req.status}.`, "decided");
  if (!stillLocked(req, now)) return fail(`${getUser(req.userId)?.name ?? "The account"} isn't locked any more.`, "not-locked");
  if (action === "unlock") {
    const r = unlockAccount(actorUserId, req.userId, now);   // clears the lock and the count, and writes the audit entry
    if (!r.ok) return r;
    closeUnlockRequest(id, "unlocked", actorUserId, new Date(now).toISOString());
    return { ok: true, status: "unlocked" };
  }
  if (action === "dismiss") {
    closeUnlockRequest(id, "dismissed", actorUserId, new Date(now).toISOString());   // the lock stays until it expires
    return { ok: true, status: "dismissed" };
  }
  return fail("Unlock or dismiss.", "action");
}

export const lockedOnly = (userIds, now = Date.now()) => userIds.filter((id) => accountOf(id, now).status === "locked");