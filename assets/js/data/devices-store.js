// data/devices-store.js
// The devices people check in from (round 14, data only). A device is a browser: on first use it gets a random token,
// kept in that browser's storage ("officeos:device-token"). The token is random, never a fingerprint of the person or
// the machine, and the only other thing kept is a short, harmless label ("Edge on Windows"). Honest limit: a token in
// browser storage can be copied or cleared; the backend stage enforces devices for real.
// The registered devices are saved under "officeos:devices" as { version, nextNum, records }:
//   [{ id "DEV-n", userId, token, label, registeredAt, lastUsedAt }]
// At most MAX_DEVICES (2) per employee. A check-in or check-out from a third device is refused (code "device-limit")
// until an Admin (devices:reset) resets that person's devices. Reads never write.
//
//   deviceToken()                         this browser's token (made on first call)
//   deviceLabel(userAgent?)               "<browser> on <system>"
//   devicesFor(actorUserId, userId)       -> { ok, records } (your own: devices:view-own; anyone's: devices:reset)
//   useDevice(userId, token, label?)      -> { ok, device, registered } | { ok: false, error, code }   (attendance calls it)
//   peekDevice(userId, token)             the same answer, writing nothing
//   resetDevices(actorUserId, userId)     -> { ok, removed }
//   sharedWith(token, userId)             the other employees' ids with this token registered
//   MAX_DEVICES                           resetAllDevices()

import { save, load, remove } from "../core/storage.js";
import { getUser } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { pureBox } from "./places.js";

export const MAX_DEVICES = 2;
const KEY = "devices", TOKEN_KEY = "device-token";
const store = pureBox(KEY, 1, () => ({ nextNum: 1, records: [] }), (b) => Number.isInteger(b.nextNum) && Array.isArray(b.records));
const copy = (value) => JSON.parse(JSON.stringify(value));
const fail = (error, code) => (code ? { ok: false, error, code } : { ok: false, error });
const TOKEN = /^[0-9a-f]{32}$/;

function randomHex(bytes) {
  const a = new Uint8Array(bytes);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(a);
  else for (let i = 0; i < bytes; i++) a[i] = Math.floor(Math.random() * 256);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function deviceToken() {
  const saved = load(TOKEN_KEY);
  if (saved && TOKEN.test(saved.token ?? "")) return saved.token;
  const token = randomHex(16);
  save(TOKEN_KEY, { token, createdAt: new Date().toISOString() });
  return token;
}

// Only the browser's family and the system's name: no version, no model.
export function deviceLabel(userAgent = globalThis.navigator?.userAgent ?? "") {
  const ua = String(userAgent);
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\/|CriOS\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "A browser";
  const system = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "another system";
  return `${browser} on ${system}`;
}

const mine = (box, userId) => box.records.filter((d) => d.userId === userId);

export function devicesFor(actorUserId, userId) {
  const actor = actorUserId ? getUser(actorUserId) : null;
  if (!actor || actor.status === "inactive") return fail("Sign in to see devices.");
  const own = actor.id === userId;
  if (!(own ? hasPermission(actor, "devices:view-own") : hasPermission(actor, "devices:reset"))) return fail("Only an Admin can see someone else's devices.");
  return { ok: true, records: copy(mine(store.read(), userId)) };
}

// The device this check-in or check-out comes from: known -> its record (last used now); new and under the limit ->
// registered; new at the limit -> refused.
export function useDevice(userId, token, label = deviceLabel()) {
  if (!getUser(userId)) return fail(`No employee with id ${userId}.`, "no-employee");
  if (!TOKEN.test(String(token ?? ""))) return fail("This browser has no device token.", "no-token");
  const box = store.read();
  const now = new Date().toISOString();
  const known = box.records.find((d) => d.userId === userId && d.token === token);
  if (known) {
    known.lastUsedAt = now;
    return store.write(box) ? { ok: true, device: copy(known), registered: false } : fail("Couldn't save. Browser storage may be full or disabled.", "storage");
  }
  if (mine(box, userId).length >= MAX_DEVICES) {
    return fail(`You already use ${MAX_DEVICES} devices. Ask an Admin to reset your devices to use this one.`, "device-limit");
  }
  const device = { id: `DEV-${box.nextNum}`, userId, token, label: String(label).slice(0, 40), registeredAt: now, lastUsedAt: now };
  box.records.push(device);
  box.nextNum += 1;
  return store.write(box) ? { ok: true, device: copy(device), registered: true } : fail("Couldn't save. Browser storage may be full or disabled.", "storage");
}

// useDevice()'s answer without writing anything: { ok, known, device } or the same refusal.
export function peekDevice(userId, token) {
  if (!getUser(userId)) return fail(`No employee with id ${userId}.`, "no-employee");
  if (!TOKEN.test(String(token ?? ""))) return fail("This browser has no device token.", "no-token");
  const box = store.read();
  const known = box.records.find((d) => d.userId === userId && d.token === token);
  if (known) return { ok: true, known: true, device: copy(known) };
  if (mine(box, userId).length >= MAX_DEVICES) return fail(`You already use ${MAX_DEVICES} devices. Ask an Admin to reset your devices to use this one.`, "device-limit");
  return { ok: true, known: false, device: null };
}

export function resetDevices(actorUserId, userId) {
  const actor = actorUserId ? getUser(actorUserId) : null;
  if (!actor || actor.status === "inactive" || !hasPermission(actor, "devices:reset")) return fail("Only an Admin can reset devices.");
  if (!getUser(userId)) return fail(`No employee with id ${userId}.`);
  const box = store.read();
  const before = box.records.length;
  box.records = box.records.filter((d) => d.userId !== userId);
  return store.write(box) ? { ok: true, removed: before - box.records.length } : fail("Couldn't save. Browser storage may be full or disabled.");
}

export const sharedWith = (token, userId) => [...new Set(store.read().records.filter((d) => d.token === token && d.userId !== userId).map((d) => d.userId))];

export function resetAllDevices() {
  remove(KEY);
}