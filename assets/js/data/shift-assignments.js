// data/shift-assignments.js (SH1, 2026-11-15): who is on which shift, on which date. Additive: nothing older reads it.
//
// Stored under "officeos:shift-assignments" as { version, people, departments, swaps, seq, audit }:
//   people       { id, seq, userId, shiftId, from, to (null: no end), by, at, note, cancelled? }
//   departments  { seq, departmentId, shiftId, from, by, at }       a department's default from a date
//   swaps        { id, seq, userId, date, shiftId, reason, by, at, cancelled?, cancelledBy? }   one date only
// Nothing is edited away: a new assignment is a new row, so the history is every row.
//
// shiftIdOn(userId, date), a pure function of what is stored (shiftOn() adds the rules and where it came from):
//   1 a swap for that person and date (not cancelled)
//   2 else their assignments that cover the date (from <= date <= to, or no end): the one made last
//   3 else their department's default on the date: the newest from on or before it (of two the same day, the later one)
//   4 else General (SH-1)
//
// Who:
//   shifts:assign (Admin, HR)       assign anyone (a person, several people, a department's default), end an assignment,
//                                   swap anyone's date
//   shifts:swap-team (everyone)     swap one date for their own direct reports only (a manager; data/reporting.js)
// Nobody changes their own shift. Dates are office dates (India) and can't be in the past: a day already worked keeps
// the shift it was worked on. A swap can't overlap the shift before or after it (a night shift ending at 07:00 and an
// early one opening at 05:30 the same morning).
//
//   shiftIdOn  shiftOn  assignmentReader  assignmentsFor  swapsFor  historyFor  departmentShiftOn  peopleOnShift
//   assignShift  assignMany  endAssignment  cancelAssignment  setDepartmentShift  swapShift  cancelSwap
//   mayAssign  maySwap  allAssignmentRows  allSwaps  resetShiftAssignments

import { remove } from "../core/storage.js";
import { getUser, getAllUsers, getDepartment } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { pureBox } from "./places.js";
import { managerOf } from "./reporting.js";
import { getShift, shiftReader, GENERAL_ID } from "./shifts-store.js";
import { officeNow, dayNo, addDays, shiftShape, DAY } from "./shift-engine.js";

const KEY = "shift-assignments";
const store = pureBox(KEY, 1, () => ({ people: [], departments: [], swaps: [], seq: 1, audit: [] }),
  (b) => Array.isArray(b.people) && Array.isArray(b.departments) && Array.isArray(b.swaps) && Array.isArray(b.audit));
const copy = (v) => JSON.parse(JSON.stringify(v));
const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";
const today0 = () => officeNow().date;
const isDay = (s) => dayNo(s) !== null;
export const REASON_MIN = 3, REASON_MAX = 200;

// ---------- reads ----------
function pick(box, user, date) {
  const swap = box.swaps.filter((s) => s.userId === user.id && s.date === date && !s.cancelled).sort((a, b) => a.seq - b.seq).at(-1);
  if (swap) return { shiftId: swap.shiftId, source: "swap", swap };
  const mine = box.people.filter((r) => r.userId === user.id && !r.cancelled && r.from <= date && (r.to === null || date <= r.to)).sort((a, b) => a.seq - b.seq).at(-1);
  if (mine) return { shiftId: mine.shiftId, source: "person", assignment: mine };
  const dep = box.departments.filter((d) => d.departmentId === user.department && d.from <= date).sort((a, b) => a.from.localeCompare(b.from) || a.seq - b.seq).at(-1);
  if (dep) return { shiftId: dep.shiftId, source: "department", department: dep };
  return { shiftId: GENERAL_ID, source: "default" };
}
// One read for many days: (userId, date) -> { shiftId, source, ... }.
export function assignmentReader() {
  const box = store.read();
  const users = new Map(getAllUsers().map((u) => [u.id, u]));
  return (userId, date) => pick(box, users.get(userId) ?? { id: userId, department: null }, date);
}
export function shiftIdOn(userId, date) {
  const user = getUser(userId) ?? { id: userId, department: null };
  return pick(store.read(), user, date).shiftId;
}
// The person's shift on a date: { shift (its rules that day), source: swap | person | department | default, swap?, assignment?, department? }.
export function shiftOn(userId, date) {
  const user = getUser(userId) ?? { id: userId, department: null };
  const p = pick(store.read(), user, date);
  return { ...copy(p), shift: shiftReader()(p.shiftId, date) };
}
export function departmentShiftOn(departmentId, date = today0()) {
  const p = pick(store.read(), { id: null, department: departmentId }, date);
  return p.source === "department" ? p.shiftId : GENERAL_ID;
}
export const allAssignmentRows = () => copy(store.read().people);
export const allSwaps = () => copy(store.read().swaps);
export const allDepartmentDefaults = () => copy(store.read().departments);
export const assignmentsFor = (userId) => copy(store.read().people.filter((r) => r.userId === userId)).sort((a, b) => b.seq - a.seq);
export const swapsFor = (userId) => copy(store.read().swaps.filter((s) => s.userId === userId)).sort((a, b) => b.seq - a.seq);
// Everything that changed a person's shift, newest first: { kind: "assignment" | "swap", ...row, byName }.
export function historyFor(userId) {
  const name = (id) => getUser(id)?.name ?? id;
  return [...assignmentsFor(userId).map((r) => ({ kind: "assignment", ...r, byName: name(r.by) })), ...swapsFor(userId).map((s) => ({ kind: "swap", ...s, byName: name(s.by) }))]
    .sort((a, b) => b.seq - a.seq);
}
// Active people on a shift on a date (by name), through shiftIdOn's order.
export function peopleOnShift(shiftId, date = today0()) {
  const read = assignmentReader();
  return getAllUsers().filter((u) => u.status !== "inactive" && read(u.id, date).shiftId === shiftId).sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- who may ----------
const activeUser = (id) => { const u = id ? getUser(id) : null; return u && u.status !== "inactive" ? u : null; };
export function mayAssign(actorUserId, userId = null) {
  const a = activeUser(actorUserId);
  return Boolean(a && hasPermission(a, "shifts:assign") && a.id !== userId);
}
export function maySwap(actorUserId, userId) {
  const a = activeUser(actorUserId);
  if (!a || a.id === userId) return false;
  if (hasPermission(a, "shifts:assign")) return true;
  return hasPermission(a, "shifts:swap-team") && managerOf(userId) === a.id;
}

// ---------- writes ----------
const entry = (actor, action, detail, today) => ({ at: new Date().toISOString(), on: today, by: actor.id, name: actor.name, action, ...detail });
function checkShift(shiftId) {
  const s = getShift(shiftId);
  if (!s) return fail("Choose a shift.", "shiftId");
  if (!s.active) return fail(`${s.name} is inactive: reactivate it first.`, "shiftId");
  return null;
}
function checkFrom(from, today, field = "from") {
  if (!isDay(from)) return fail("Choose a date.", field);
  if (from < today) return fail("A shift can't change on a day that has already passed.", field);
  return null;
}

// One person, from a date (no end, or up to and including `to`).
function assignRow(box, actor, userId, shiftId, from, to, note, today) {
  const user = activeUser(userId);
  if (!user) return fail(`No active employee with id ${userId}.`, "userId");
  if (user.id === actor.id) return fail("You can't change your own shift: ask HR.", "userId");
  const r = { id: `SA-${box.seq}`, seq: box.seq, userId, shiftId, from, to: to || null, by: actor.id, at: new Date().toISOString(), note: String(note ?? "").trim().slice(0, REASON_MAX) };
  box.seq += 1;
  box.people.push(r);
  box.audit.push(entry(actor, "assigned", { userId, shiftId, from, to: r.to }, today));
  return { ok: true, record: r };
}
function checkAssign(actor, shiftId, from, to, today) {
  if (!actor || !hasPermission(actor, "shifts:assign")) return fail("Only HR or an Admin can assign shifts.");
  return checkShift(shiftId) ?? checkFrom(from, today) ?? (to ? (!isDay(to) ? fail("Choose an end date, or leave it empty.", "to") : to < from ? fail("The end can't be before the start.", "to") : null) : null);
}
export function assignShift(actorUserId, userId, shiftId, from, to = null, note = "", today = today0()) {
  const actor = activeUser(actorUserId);
  const bad = checkAssign(actor, shiftId, from, to, today);
  if (bad) return bad;
  const box = store.read();
  const res = assignRow(box, actor, userId, shiftId, from, to, note, today);
  if (!res.ok) return res;
  return store.write(box) ? res : fail(SAVE_FAILED);
}
// Bulk: several people at once, all or nothing (the first problem names the person).
export function assignMany(actorUserId, userIds, shiftId, from, to = null, note = "", today = today0()) {
  const actor = activeUser(actorUserId);
  const bad = checkAssign(actor, shiftId, from, to, today);
  if (bad) return bad;
  const ids = [...new Set(Array.isArray(userIds) ? userIds : [])];
  if (!ids.length) return fail("Choose at least one person.", "userIds");
  const box = store.read();
  const records = [];
  for (const id of ids) {
    const res = assignRow(box, actor, id, shiftId, from, to, note, today);
    if (!res.ok) return { ...res, error: `${getUser(id)?.name ?? id}: ${res.error}`, field: "userIds" };
    records.push(res.record);
  }
  return store.write(box) ? { ok: true, records } : fail(SAVE_FAILED);
}
// End an assignment on a date (today or later, not before its start): from the next day the person is back on the
// shift underneath it. An assignment that hasn't started yet is cancelled instead.
export function endAssignment(actorUserId, assignmentId, to, today = today0()) {
  const actor = activeUser(actorUserId);
  if (!actor || !hasPermission(actor, "shifts:assign")) return fail("Only HR or an Admin can assign shifts.");
  const box = store.read();
  const r = box.people.find((x) => x.id === assignmentId);
  if (!r || r.cancelled) return fail("That assignment doesn't exist.");
  if (r.userId === actor.id) return fail("You can't change your own shift: ask HR.");
  if (!isDay(to)) return fail("Choose the last day.", "to");
  if (to < today) return fail("An assignment can't end on a day that has already passed.", "to");
  if (to < r.from) return fail("The last day can't be before the assignment starts.", "to");
  if (r.to !== null && to >= r.to) return fail(`It already ends on ${r.to}.`, "to");
  r.to = to;
  box.audit.push(entry(actor, "ended", { assignmentId, userId: r.userId, to }, today));
  return store.write(box) ? { ok: true, record: copy(r) } : fail(SAVE_FAILED);
}
export function cancelAssignment(actorUserId, assignmentId, today = today0()) {
  const actor = activeUser(actorUserId);
  if (!actor || !hasPermission(actor, "shifts:assign")) return fail("Only HR or an Admin can assign shifts.");
  const box = store.read();
  const r = box.people.find((x) => x.id === assignmentId);
  if (!r || r.cancelled) return fail("That assignment doesn't exist.");
  if (r.from <= today) return fail("It has already started: end it instead.");
  r.cancelled = true;
  box.audit.push(entry(actor, "cancelled", { assignmentId, userId: r.userId }, today));
  return store.write(box) ? { ok: true, record: copy(r) } : fail(SAVE_FAILED);
}
export function setDepartmentShift(actorUserId, departmentId, shiftId, from, today = today0()) {
  const actor = activeUser(actorUserId);
  if (!actor || !hasPermission(actor, "shifts:assign")) return fail("Only HR or an Admin can assign shifts.");
  if (!getDepartment(departmentId)) return fail("Choose a department.", "departmentId");
  const bad = checkShift(shiftId) ?? checkFrom(from, today);
  if (bad) return bad;
  const box = store.read();
  const row = { seq: box.seq, departmentId, shiftId, from, by: actor.id, at: new Date().toISOString() };
  box.seq += 1;
  box.departments.push(row);
  box.audit.push(entry(actor, "department-default", { departmentId, shiftId, from }, today));
  return store.write(box) ? { ok: true, record: row } : fail(SAVE_FAILED);
}

// Would `shiftId` on `date` overlap the person's shift the day before or after? A message, or null.
function overlapProblem(box, user, shiftId, date) {
  const read = shiftReader();
  const mine = shiftShape(read(shiftId, date));
  const prevId = pick(box, user, addDays(date, -1)).shiftId, nextId = pick(box, user, addDays(date, 1)).shiftId;
  const prev = read(prevId, addDays(date, -1)), next = read(nextId, addDays(date, 1));
  if (shiftShape(prev).end - DAY > mine.opens) return `That would overlap ${prev.name} the day before, which ends at ${prev.end}.`;
  if (mine.end - DAY > shiftShape(next).opens) return `That would overlap ${next.name} the day after, whose check-in opens at ${String(Math.floor(shiftShape(next).opens / 60)).padStart(2, "0")}:${String(shiftShape(next).opens % 60).padStart(2, "0")}.`;
  return null;
}
// One date only, with a reason: HR / Admin for anyone, a manager for a direct report.
export function swapShift(actorUserId, userId, date, shiftId, reason, today = today0()) {
  const actor = activeUser(actorUserId);
  const user = activeUser(userId);
  if (!actor) return fail("Sign in again.");
  if (!user) return fail(`No active employee with id ${userId}.`, "userId");
  if (actor.id === user.id) return fail("You can't change your own shift: ask HR.", "userId");
  if (!maySwap(actor.id, user.id)) return fail("You can swap shifts only for your own team.");
  const bad = checkShift(shiftId) ?? checkFrom(date, today, "date");
  if (bad) return bad;
  const why = String(reason ?? "").trim();
  if (why.length < REASON_MIN || why.length > REASON_MAX) return fail(`Give a reason of ${REASON_MIN} to ${REASON_MAX} characters.`, "reason");
  const box = store.read();
  const now = pick(box, user, date);
  if (now.shiftId === shiftId) return fail(`${user.name} is already on that shift that day.`, "shiftId");
  const overlap = overlapProblem(box, user, shiftId, date);
  if (overlap) return fail(overlap, "shiftId");
  for (const s of box.swaps) if (s.userId === user.id && s.date === date && !s.cancelled) { s.cancelled = true; s.cancelledBy = actor.id; }
  const row = { id: `SW-${box.seq}`, seq: box.seq, userId: user.id, date, shiftId, fromShiftId: now.shiftId, reason: why, by: actor.id, at: new Date().toISOString() };
  box.seq += 1;
  box.swaps.push(row);
  box.audit.push(entry(actor, "swapped", { userId: user.id, date, shiftId, fromShiftId: now.shiftId }, today));
  return store.write(box) ? { ok: true, record: row } : fail(SAVE_FAILED);
}
export function cancelSwap(actorUserId, swapId, today = today0()) {
  const box = store.read();
  const s = box.swaps.find((x) => x.id === swapId);
  if (!s || s.cancelled) return fail("That swap doesn't exist.");
  if (!maySwap(actorUserId, s.userId)) return fail("You can swap shifts only for your own team.");
  if (s.date < today) return fail("That day has already passed.");
  s.cancelled = true;
  s.cancelledBy = actorUserId;
  const actor = getUser(actorUserId);
  box.audit.push(entry(actor, "swap-cancelled", { swapId, userId: s.userId, date: s.date }, today));
  return store.write(box) ? { ok: true, record: copy(s) } : fail(SAVE_FAILED);
}
export const shiftAssignmentsAudit = () => copy(store.read().audit);
export function resetShiftAssignments() {
  remove(KEY);
}