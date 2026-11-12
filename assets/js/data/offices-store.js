// data/offices-store.js
// The company's offices and which office each employee works from (round 14, data only; the page round adds screens).
// Saved under "officeos:offices" as { version, nextNum, records, assignments }:
//   records      [{ id "OFF-n", name, type "head" | "branch", address, lat, lng, radiusM, active, sample, note }]
//   assignments  { "<employee id>": "<office id>" }: only people moved off the head office; everyone else (and anyone
//                whose office is inactive or gone) works from the head office. Kept here, not on the user record, so
//                the users box and every page reading it are unchanged ("officeId", additive, defaulting to the head office).
// Seed: one head office at the company's address with SAMPLE coordinates (sample: true; "set the real location"), no
// branch. Reads never write (data/places.js pureBox): storage gets the key on the first change.
// Writes need offices:manage (Admin; config/roles.js hasPermission); reads need nothing (every role has offices:view).
//
//   getOffices({ includeInactive })   getOffice(id)   headOffice()
//   createOffice(actorUserId, { name, type, address, lat, lng, radiusM })            -> { ok, record } | { ok: false, error, field }
//   updateOffice(actorUserId, id, changes)   deactivateOffice(actorUserId, id)   reactivateOffice(actorUserId, id)
//   officeOf(userId) -> the office record they work from     officeIdOf(userId)
//   setEmployeeOffice(actorUserId, userId, officeId)
//   OFFICE_RADIUS { min 20, max 1000, default 150 }           resetOffices()

import { remove } from "../core/storage.js";
import { getUser } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { pureBox, coordsProblem, ADDRESS_MAX } from "./places.js";

const KEY = "offices";
export const OFFICE_RADIUS = { min: 20, max: 1000, default: 150 };
export const OFFICE_TYPES = ["head", "branch"];
export const SAMPLE_NOTE = "Sample coordinates: set the real location.";
// L0: the office's state or union territory, from this fixed list (28 states, 8 union territories). Required when an
// office is created; an office saved before L0 has none and reads as state null ("Not set") until it's edited.
export const OFFICE_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
  "Lakshadweep", "Puducherry",
];
const NAME_MAX = 80;

const seed = () => ({
  nextNum: 2,
  records: [{
    id: "OFF-1", name: "Head office", type: "head", address: "Sector 44, Gurugram, Haryana 122003",
    state: "Haryana", lat: 28.4523, lng: 77.0723, radiusM: OFFICE_RADIUS.default, active: true, sample: true, note: SAMPLE_NOTE,
  }],
  assignments: {},
});
const store = pureBox(KEY, 1, seed, (b) => Number.isInteger(b.nextNum) && Array.isArray(b.records) && b.assignments && typeof b.assignments === "object");

const copy = (value) => JSON.parse(JSON.stringify(value));
const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });
const saved = (box, record) => (store.write(box) ? { ok: true, record: copy(record) } : fail("Couldn't save. Browser storage may be full or disabled."));
const manager = (actorUserId) => {
  const actor = actorUserId ? getUser(actorUserId) : null;
  return actor && actor.status !== "inactive" && hasPermission(actor, "offices:manage") ? actor : null;
};
const NOT_ALLOWED = "Only an Admin can change offices.";

// ---------- reads ----------
// An office saved before L0 has no state: it reads as null.
const withState = (o) => ({ ...o, state: o.state ?? null });
export function getOffices({ includeInactive = false } = {}) {
  return copy(store.read().records.filter((o) => includeInactive || o.active).map(withState));
}
export function getOffice(id) {
  const o = store.read().records.find((r) => r.id === id);
  return o ? copy(withState(o)) : null;
}
export function headOffice() {
  const o = store.read().records.find((r) => r.type === "head");
  return o ? copy(withState(o)) : null;
}
export function officeIdOf(userId) {
  const box = store.read();
  const id = box.assignments[userId];
  const office = id && box.records.find((o) => o.id === id && o.active);
  return office ? office.id : box.records.find((o) => o.type === "head")?.id ?? null;
}
export const officeOf = (userId) => getOffice(officeIdOf(userId));

// ---------- checks ----------
// Why these fields can't be saved for this office (null for a new one), or null. `all` is every office on record.
function officeProblem(fields, current, all) {
  const merged = { ...current, ...fields };
  const name = typeof merged.name === "string" ? merged.name.trim() : "";
  if (!name) return fail("Enter the office's name.", "name");
  if (name.length > NAME_MAX) return fail(`The name can be at most ${NAME_MAX} characters.`, "name");
  if (all.some((o) => o.id !== current?.id && o.name.trim().toLowerCase() === name.toLowerCase())) return fail(`There's already an office called "${name}".`, "name");
  if (!OFFICE_TYPES.includes(merged.type)) return fail("The type must be head or branch.", "type");
  const head = all.find((o) => o.type === "head");
  if (merged.type === "head" && head && head.id !== current?.id) return fail(`${head.name} is the head office; there can be only one.`, "type");
  if (current?.type === "head" && merged.type !== "head") return fail("The head office stays the head office.", "type");
  const address = typeof merged.address === "string" ? merged.address.trim() : "";
  if (!address) return fail("Enter the address.", "address");
  if (address.length > ADDRESS_MAX) return fail(`The address can be at most ${ADDRESS_MAX} characters.`, "address");
  // L0: a new office needs its state; an edit keeps a valid one (or none, for an office saved before L0, unless one is given)
  if ((!current || "state" in fields || current.state != null) && !OFFICE_STATES.includes(merged.state)) return fail("Choose the office's state or union territory.", "state");
  const coords = coordsProblem(merged.lat, merged.lng);
  if (coords) return fail(coords, Number.isFinite(merged.lat) && merged.lat >= -90 && merged.lat <= 90 ? "lng" : "lat");
  const r = merged.radiusM;
  if (!Number.isInteger(r) || r < OFFICE_RADIUS.min || r > OFFICE_RADIUS.max) return fail(`The radius must be a whole number of metres from ${OFFICE_RADIUS.min} to ${OFFICE_RADIUS.max}.`, "radiusM");
  return null;
}
const EDITABLE = ["name", "type", "address", "state", "lat", "lng", "radiusM"];
const onlyEditable = (fields) => Object.keys(fields ?? {}).find((k) => !EDITABLE.includes(k));

// ---------- writes ----------
export function createOffice(actorUserId, fields = {}) {
  if (!manager(actorUserId)) return fail(NOT_ALLOWED);
  const extra = onlyEditable(fields);
  if (extra) return fail(`"${extra}" can't be set on an office.`, extra);
  const box = store.read();
  const draft = { type: "branch", radiusM: OFFICE_RADIUS.default, ...fields };
  const problem = officeProblem(draft, null, box.records);
  if (problem) return problem;
  const record = { id: `OFF-${box.nextNum}`, name: draft.name.trim(), type: draft.type, address: draft.address.trim(), state: draft.state, lat: draft.lat, lng: draft.lng,
    radiusM: draft.radiusM, active: true, sample: false, note: "" };
  box.records.push(record);
  box.nextNum += 1;
  return saved(box, record);
}

// Changing the coordinates clears the "sample" mark: someone has set the real location.
export function updateOffice(actorUserId, id, changes = {}) {
  if (!manager(actorUserId)) return fail(NOT_ALLOWED);
  const extra = onlyEditable(changes);
  if (extra) return fail(`"${extra}" can't be changed here.`, extra);
  const box = store.read();
  const record = box.records.find((o) => o.id === id);
  if (!record) return fail(`No office with id ${id}.`);
  const problem = officeProblem(changes, record, box.records);
  if (problem) return problem;
  const moved = ("lat" in changes && changes.lat !== record.lat) || ("lng" in changes && changes.lng !== record.lng);
  Object.assign(record, changes, { name: (changes.name ?? record.name).trim(), address: (changes.address ?? record.address).trim() });
  if (moved) Object.assign(record, { sample: false, note: "" });
  return saved(box, record);
}

// The head office can't be deactivated (everyone without an active office works from it). The people assigned to a
// deactivated branch work from the head office until it's active again or they're moved.
export function deactivateOffice(actorUserId, id) {
  if (!manager(actorUserId)) return fail(NOT_ALLOWED);
  const box = store.read();
  const record = box.records.find((o) => o.id === id);
  if (!record) return fail(`No office with id ${id}.`);
  if (record.type === "head") return fail("The head office can't be deactivated.");
  if (!record.active) return fail(`${record.name} is already inactive.`);
  record.active = false;
  return saved(box, record);
}
export function reactivateOffice(actorUserId, id) {
  if (!manager(actorUserId)) return fail(NOT_ALLOWED);
  const box = store.read();
  const record = box.records.find((o) => o.id === id);
  if (!record) return fail(`No office with id ${id}.`);
  if (record.active) return fail(`${record.name} is already active.`);
  if (box.records.some((o) => o.id !== id && o.active && o.name.trim().toLowerCase() === record.name.trim().toLowerCase())) return fail(`There's already an active office called "${record.name}".`);
  record.active = true;
  return saved(box, record);
}

// Moves someone to an active office (the head office clears the assignment: it's the default).
export function setEmployeeOffice(actorUserId, userId, officeId) {
  if (!manager(actorUserId)) return fail(NOT_ALLOWED);
  const user = getUser(userId);
  if (!user) return fail(`No employee with id ${userId}.`);
  const box = store.read();
  const office = box.records.find((o) => o.id === officeId);
  if (!office) return fail(`No office with id ${officeId}.`, "officeId");
  if (!office.active) return fail(`${office.name} is inactive.`, "officeId");
  if (office.type === "head") delete box.assignments[userId]; else box.assignments[userId] = officeId;
  return store.write(box) ? { ok: true, record: copy(office) } : fail("Couldn't save. Browser storage may be full or disabled.");
}

export function resetOffices() {
  remove(KEY);
}