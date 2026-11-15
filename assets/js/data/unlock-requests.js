// data/unlock-requests.js (F2, 2026-11-15): an unlock request is opened when an account locks (data/credentials.js, 5 failed sign-ins),
// once per lock. Storage only (data/credentials.js writes it, data/lockouts.js reads and resolves it), so neither imports the other.
//
// Saved under "officeos:unlock-requests" as { version, requests: [{ id, userId, lockedAt, lockedUntil, attempts, status, by, at }], seq }.
//   status: open | unlocked (Unlock now) | dismissed (Dismiss: the lock stays until it expires). A request whose lock has expired or was
//   lifted another way isn't waiting any more: data/lockouts.js compares it with the account's lock on every read; nothing is rewritten.
//
//   openUnlockRequest(userId, lockedAt, lockedUntil, attempts)  allUnlockRequests()  unlockRequest(id)  closeUnlockRequest(id, status, by, at)
//   resetUnlockRequests()

import { remove } from "../core/storage.js";
import { pureBox } from "./places.js";

const KEY = "unlock-requests";
const store = pureBox(KEY, 1, () => ({ requests: [], seq: 1 }), (b) => Array.isArray(b.requests));
const copy = (v) => JSON.parse(JSON.stringify(v));

// One request per lock: a second call for the same lock (same lockedUntil) is a no-op. -> the request (new or existing)
export function openUnlockRequest(userId, lockedAt, lockedUntil, attempts) {
  const box = store.read();
  const same = box.requests.find((r) => r.userId === userId && r.lockedUntil === lockedUntil);
  if (same) return copy(same);
  const req = { id: `UL-${box.seq}`, userId, lockedAt, lockedUntil, attempts, status: "open", by: null, at: null };
  box.seq += 1;
  box.requests.push(req);
  store.write(box);
  return copy(req);
}
export const allUnlockRequests = () => copy(store.read().requests);
export const unlockRequest = (id) => copy(store.read().requests.find((r) => r.id === id) ?? null);
export function closeUnlockRequest(id, status, by, at) {
  const box = store.read();
  const req = box.requests.find((r) => r.id === id);
  if (!req || req.status !== "open") return false;
  Object.assign(req, { status, by, at });
  return store.write(box);
}
export function resetUnlockRequests() {
  remove(KEY);
}