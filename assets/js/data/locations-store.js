// data/locations-store.js
// Where people may check in from (round 14, data only; the page round adds screens). Honest limit: a browser's
// location and its device token can be faked; this only checks what the browser reports, once, at check-in and
// check-out (no continuous tracking). Real enforcement is the backend stage.
//
// Home places: an employee HR marks home-eligible (homeEligible, default false; users:edit sets it) may set a permanent
// and a temporary home { address, lat, lng } ONCE each (locations:set-own follows the flag). After that a change is a
// request ("location change": the new place and a reason) that an Admin (locations:review) approves or rejects; an
// approval applies the new place. Every set and change is kept in the person's history (who, when, from, to).
// An Admin's own request is approved at once, as their own leave is.
//   "officeos:home-locations"    { version, people: { "<id>": { homeEligible, permanent, temporary, history } } }
//   "officeos:location-changes"  { version, nextNum, records: [{ id "LC-n", userId, kind, place, reason, status, ... }] }
// Reads never write (data/places.js pureBox).
//
// The place check: checkPlace({ lat, lng, accuracyM }, employee, now) -> { ok, place, placeName, distanceM, reason, code }
//   allowed places: the employee's office (data/offices-store.js officeOf: "head" or "branch", its own radius) and, only
//   when home-eligible and set, their homes ("homePermanent", "homeTemporary"; HOME_RADIUS_M each). Distances are
//   haversine metres, judged in whole metres: ok when distance <= radius (exactly the radius is inside). The nearest
//   place inside wins. A reading with accuracyM over 100 (or none) isn't judged: "location not accurate enough, try
//   again". Outside every place: the nearest one, "<N> m from <place>". judgePlace(reading, places) is the pure part.
//   codes: "ok", "no-location", "inaccurate", "no-place", "outside"
//
// Check-in / check-out with a place (the only new way; checkIn()/checkOut() without it are unchanged):
//   checkInAt(userId, mode, reading, token?)   checkOutAt(userId, reading, token?)
//   -> attendance's result, or a refusal with a code: the place check's, or the device check's ("device-limit",
//      "no-token"). On success the record carries the place, distance and device (data/attendance-store.js stampFields)
//      and `flagged` (check-out place or device differs from the check-in's, or the device is registered to someone else:
//      "shared-device").

import { remove } from "../core/storage.js";
import { getUser } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { pureBox, distanceM, placeProblem, cleanPlace } from "./places.js";
import { officeOf } from "./offices-store.js";
import { checkIn, checkOut, checkInRefusal, checkOutRefusal } from "./attendance-store.js";
import { deviceToken, deviceLabel, peekDevice, useDevice, sharedWith } from "./devices-store.js";

export const HOME_KINDS = ["permanent", "temporary"];
export const HOME_RADIUS_M = 150;
export const ACCURACY_LIMIT_M = 100;
export const REASON_MAX = 300;
const PLACE_OF_KIND = { permanent: "homePermanent", temporary: "homeTemporary" };
const NAME_OF_KIND = { permanent: "your permanent home", temporary: "your temporary home" };

const homes = pureBox("home-locations", 1, () => ({ people: {} }), (b) => b.people && typeof b.people === "object");
const changes = pureBox("location-changes", 1, () => ({ nextNum: 1, records: [] }), (b) => Number.isInteger(b.nextNum) && Array.isArray(b.records));
const copy = (value) => JSON.parse(JSON.stringify(value));
const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";
const blank = () => ({ homeEligible: false, permanent: null, temporary: null, history: [] });
const active = (id) => { const u = id ? getUser(id) : null; return u && u.status !== "inactive" ? u : null; };
const now = () => new Date().toISOString();

// ---------- reads ----------
export function homeOf(userId) {
  return copy(homes.read().people[userId] ?? blank());
}
export const isHomeEligible = (userId) => Boolean(homes.read().people[userId]?.homeEligible);
export const allLocationChanges = () => copy(changes.read().records);
export const locationChangesFor = (userId) => copy(changes.read().records.filter((r) => r.userId === userId));
export function getLocationChange(id) {
  const r = changes.read().records.find((x) => x.id === id);
  return r ? copy(r) : null;
}
// What waits for this person's decision (the same signature as the other stores' pendingFor): pending changes, not
// their own, for someone active whose role on record is roleKey and who holds locations:review.
// Not yet in ui/waiting.js: the inbox, the sidebar count and the Admin dashboard card learn this kind together in the
// page round, so the counts never disagree with what the inbox lists.
export function pendingLocationChanges(deciderUserId, roleKey) {
  const decider = active(deciderUserId);
  if (!decider || decider.role !== roleKey || !hasPermission(decider, "locations:review")) return [];
  return copy(changes.read().records.filter((r) => r.status === "pending" && r.userId !== decider.id));
}

// ---------- HR: who may use home places ----------
export function setHomeEligible(actorUserId, userId, eligible) {
  const actor = active(actorUserId);
  if (!actor || !hasPermission(actor, "users:edit")) return fail("Only HR or an Admin can change who may check in from home.");
  if (!getUser(userId)) return fail(`No employee with id ${userId}.`);
  if (typeof eligible !== "boolean") return fail("Say yes or no.", "homeEligible");
  const box = homes.read();
  const person = box.people[userId] ?? blank();
  if (person.homeEligible === eligible) return { ok: true, record: copy(person) };
  person.homeEligible = eligible;
  person.history.push({ at: now(), byUserId: actor.id, action: eligible ? "eligible" : "not-eligible", kind: null, from: null, to: null, requestId: null });
  box.people[userId] = person;
  return homes.write(box) ? { ok: true, record: copy(person) } : fail(SAVE_FAILED);
}

// ---------- the employee: set once ----------
// kind: "permanent" | "temporary"; place: { address, lat, lng }.
export function setOwnHome(actorUserId, kind, place) {
  const actor = active(actorUserId);
  if (!actor) return fail("Sign in to set your home location.");
  if (!HOME_KINDS.includes(kind)) return fail("Choose your permanent or temporary home.", "kind");
  const box = homes.read();
  const person = box.people[actor.id] ?? blank();
  if (!person.homeEligible) return fail("You can't check in from home: HR hasn't turned it on for you.");
  if (person[kind]) return fail(`Your ${kind} home is already set. To change it, send a location change request.`, "kind");
  const problem = placeProblem(place);
  if (problem) return fail(problem, "place");
  const at = now();
  person[kind] = { ...cleanPlace(place), setAt: at, setBy: actor.id };
  person.history.push({ at, byUserId: actor.id, action: "set", kind, from: null, to: cleanPlace(place), requestId: null });
  box.people[actor.id] = person;
  return homes.write(box) ? { ok: true, record: copy(person) } : fail(SAVE_FAILED);
}

// ---------- changes: a request, decided by an Admin ----------
function applyChange(request, byUserId) {
  const box = homes.read();
  const person = box.people[request.userId] ?? blank();
  const at = now();
  const from = person[request.kind] ? cleanPlace(person[request.kind]) : null;
  person[request.kind] = { ...cleanPlace(request.place), setAt: at, setBy: byUserId };
  person.history.push({ at, byUserId, action: "changed", kind: request.kind, from, to: cleanPlace(request.place), requestId: request.id });
  box.people[request.userId] = person;
  return homes.write(box);
}

export function requestLocationChange(actorUserId, kind, place, reason) {
  const actor = active(actorUserId);
  if (!actor) return fail("Sign in to ask for a location change.");
  if (!HOME_KINDS.includes(kind)) return fail("Choose your permanent or temporary home.", "kind");
  const person = homes.read().people[actor.id] ?? blank();
  if (!person.homeEligible) return fail("You can't check in from home: HR hasn't turned it on for you.");
  if (!person[kind]) return fail(`Your ${kind} home isn't set yet. Set it first; that needs no approval.`, "kind");
  const problem = placeProblem(place);
  if (problem) return fail(problem, "place");
  const p = cleanPlace(place);
  if (p.lat === person[kind].lat && p.lng === person[kind].lng && p.address === person[kind].address) return fail(`That's already your ${kind} home.`, "place");
  const why = typeof reason === "string" ? reason.trim() : "";
  if (why.length < 3) return fail("Give a reason for the change.", "reason");
  if (why.length > REASON_MAX) return fail(`The reason can be at most ${REASON_MAX} characters.`, "reason");
  const box = changes.read();
  if (box.records.some((r) => r.userId === actor.id && r.kind === kind && r.status === "pending")) return fail(`You already have a ${kind} home change waiting.`, "kind");
  const at = now();
  const record = { id: `LC-${box.nextNum}`, type: "location-change", userId: actor.id, kind, place: p, reason: why, status: "pending",
    requestedAt: at, decidedAt: null, decidedBy: null, note: "", history: [{ at, byUserId: actor.id, action: "requested", note: "" }] };
  // An Admin's own request is approved at once (as their leave is).
  if (hasPermission(actor, "locations:review")) {
    if (!applyChange(record, actor.id)) return fail(SAVE_FAILED);
    Object.assign(record, { status: "approved", decidedAt: at, decidedBy: actor.id });
    record.history.push({ at, byUserId: actor.id, action: "approved", note: "Your own request (Admin)." });
  }
  box.records.push(record);
  box.nextNum += 1;
  return changes.write(box) ? { ok: true, record: copy(record) } : fail(SAVE_FAILED);
}

// decision: "approved" | "rejected". An approval applies the new place; a rejection changes nothing.
export function decideLocationChange(requestId, deciderUserId, decision, note = "") {
  const decider = active(deciderUserId);
  if (!decider || !hasPermission(decider, "locations:review")) return fail("Only an Admin can decide location changes.");
  if (!["approved", "rejected"].includes(decision)) return fail("Approve or reject.", "decision");
  const box = changes.read();
  const record = box.records.find((r) => r.id === requestId);
  if (!record) return fail(`No location change with id ${requestId}.`);
  if (record.status !== "pending") return fail(`This request is already ${record.status}.`);
  if (record.userId === decider.id) return fail("You can't decide your own request.");
  const text = String(note ?? "").trim().slice(0, REASON_MAX);
  if (decision === "approved") {
    if (!isHomeEligible(record.userId)) return fail("This employee can't check in from home any more, so the change can't be approved. Reject it instead.");
    if (!applyChange(record, decider.id)) return fail(SAVE_FAILED);
  }
  const at = now();
  Object.assign(record, { status: decision, decidedAt: at, decidedBy: decider.id, note: text });
  record.history.push({ at, byUserId: decider.id, action: decision, note: text });
  return changes.write(box) ? { ok: true, record: copy(record) } : fail(SAVE_FAILED);
}

export function cancelLocationChange(requestId, userId) {
  const box = changes.read();
  const record = box.records.find((r) => r.id === requestId);
  if (!record || record.userId !== userId) return fail("You can cancel only your own request.");
  if (record.status !== "pending") return fail(`This request is already ${record.status}.`);
  const at = now();
  Object.assign(record, { status: "cancelled", decidedAt: at, decidedBy: userId });
  record.history.push({ at, byUserId: userId, action: "cancelled", note: "" });
  return changes.write(box) ? { ok: true, record: copy(record) } : fail(SAVE_FAILED);
}

// ---------- the place check ----------
// The places this employee may check in from: [{ place, name, lat, lng, radiusM }].
export function placesFor(employee) {
  const id = typeof employee === "string" ? employee : employee?.id;
  if (!id) return [];
  const list = [];
  const office = officeOf(id);
  if (office) list.push({ place: office.type, name: office.name, lat: office.lat, lng: office.lng, radiusM: office.radiusM });
  const person = homes.read().people[id];
  if (person?.homeEligible) {
    for (const kind of HOME_KINDS) {
      const h = person[kind];
      if (h) list.push({ place: PLACE_OF_KIND[kind], name: NAME_OF_KIND[kind], lat: h.lat, lng: h.lng, radiusM: HOME_RADIUS_M });
    }
  }
  return list;
}

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const answer = (ok, code, reason, p = null, d = null) => ({ ok, place: p?.place ?? null, placeName: p?.name ?? null, distanceM: d, reason, code });

// The pure part: a reading against a list of places (placesFor()'s shape).
export function judgePlace(reading, places) {
  const { lat, lng, accuracyM } = reading ?? {};
  if (!isNum(lat) || !isNum(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return answer(false, "no-location", "No location from this browser. Allow location and try again.");
  if (!isNum(accuracyM) || accuracyM < 0 || accuracyM > ACCURACY_LIMIT_M) return answer(false, "inaccurate", "location not accurate enough, try again");
  if (!places?.length) return answer(false, "no-place", "No office is set for you. Ask an Admin.");
  const measured = places.map((p) => ({ p, d: Math.round(distanceM({ lat, lng }, p)) })).sort((a, b) => a.d - b.d);
  const inside = measured.find(({ p, d }) => d <= p.radiusM);
  if (inside) return answer(true, "ok", "", inside.p, inside.d);
  const nearest = measured[0];
  return answer(false, "outside", `${nearest.d} m from ${nearest.p.name}`, nearest.p, nearest.d);
}

// employee: a user record or id; now: when (kept on the answer as `at`, ISO).
export function checkPlace(reading, employee, nowDate = new Date()) {
  return { ...judgePlace(reading, placesFor(employee)), at: new Date(nowDate).toISOString() };
}

// ---------- check in / out with a place ----------
function where(userId, reading, token) {
  if (!getUser(userId)) return { refusal: { ...fail(`No employee with id ${userId}.`), code: "no-employee" } };
  const place = checkPlace(reading, userId);
  if (!place.ok) return { refusal: { ok: false, error: place.reason, code: place.code, place } };
  const device = peekDevice(userId, token);
  if (!device.ok) return { refusal: device };
  return { place };
}
function stampAfter(userId, place, token) {
  const used = useDevice(userId, token, deviceLabel());
  if (!used.ok) return null;
  return { place: place.place, distanceM: place.distanceM, deviceId: used.device.id, flagReasons: sharedWith(token, userId).length ? ["shared-device"] : [] };
}

// The attendance checks run first (nothing is written when they refuse); the device is registered or touched only
// after the place and device are fine, then the record is written with the stamp.
export function checkInAt(userId, mode, reading, token = deviceToken()) {
  const w = where(userId, reading, token);
  if (w.refusal) return w.refusal;
  const refused = checkInRefusal(userId, mode);
  if (refused) return refused;
  const stamp = stampAfter(userId, w.place, token);
  if (!stamp) return { ...fail(SAVE_FAILED), code: "storage" };
  return checkIn(userId, mode, stamp);
}
export function checkOutAt(userId, reading, token = deviceToken()) {
  const w = where(userId, reading, token);
  if (w.refusal) return w.refusal;
  const refused = checkOutRefusal(userId);
  if (refused) return refused;
  const stamp = stampAfter(userId, w.place, token);
  if (!stamp) return { ...fail(SAVE_FAILED), code: "storage" };
  return checkOut(userId, stamp);
}

// ---------- the demo reset for these stores ----------
export function resetLocations() {
  remove("home-locations");
  remove("location-changes");
}