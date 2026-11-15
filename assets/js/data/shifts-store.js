// data/shifts-store.js (SH1, 2026-11-15): the shifts and their rules. Additive: nothing older reads it.
//
// A shift: { id, name, sample, active, versions: [{ from, start, end, graceMin, breakMin, absentBelowHours,
// halfDayBelowHours, shortLeaveBelowHours, earliestCheckInMin, overtimeAfterMin, overtimeMinBlockMin, weeklyOffDays }] }.
// The rules are dated: an edit adds a version from the day it is made (an edit the same day replaces that day's), so a
// day already worked keeps the rules it was worked under. crossesMidnight is derived (end before start), never stored.
//
// The seed (all marked sample, an edit clears the mark):
//   General    09:30-18:30, the CURRENT rules exactly (data/attendance-store.js ATTENDANCE_RULES): 15 min grace, no break,
//              half day under 8 h, absent under 4 h, no short-leave band, check-in from 08:30, Saturday and Sunday off;
//              overtime after 18:45 in 30 min blocks (overtime is new: it changes no status)
//   Early      06:00-15:00, Night 22:00-07:00 (the next morning), Part-time 10:00-14:00
// Everyone without an assignment is on General (data/shift-assignments.js), which can't be deactivated.
//
// Who: shifts:manage (Admin, HR) creates, edits, deactivates and reactivates. A shift someone is on, now or later (a
// person, a department's default, a date swap), can't be deactivated. Reads are open to every module.
//
//   getShifts({ includeInactive }, date?)  getShift(id, date?)  shiftRulesOn(id, date)  shiftProblems(fields, id?)
//   createShift(actorUserId, fields, today?)  updateShift(actorUserId, id, changes, today?)
//   deactivateShift(actorUserId, id, today?)  reactivateShift(actorUserId, id)  shiftSummary(rules)  shiftHours(rules)
//   shiftsAudit()  resetShifts()

import { load, remove } from "../core/storage.js";
import { getUser } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { pureBox } from "./places.js";
import { toMin, hhmm, shiftShape, officeNow, DAY } from "./shift-engine.js";

const KEY = "shifts";
export const GENERAL_ID = "SH-1";
export const RULE_FIELDS = ["start", "end", "graceMin", "breakMin", "absentBelowHours", "halfDayBelowHours", "shortLeaveBelowHours", "earliestCheckInMin", "overtimeAfterMin", "overtimeMinBlockMin", "weeklyOffDays"];
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SEED_FROM = "2000-01-01";
const OFF = [0, 6];

export const SHIFT_SEED = Object.freeze([
  { id: GENERAL_ID, name: "General", rules: { start: "09:30", end: "18:30", graceMin: 15, breakMin: 0, absentBelowHours: 4, halfDayBelowHours: 8, shortLeaveBelowHours: 8, earliestCheckInMin: 60, overtimeAfterMin: 15, overtimeMinBlockMin: 30, weeklyOffDays: OFF } },
  { id: "SH-2", name: "Early", rules: { start: "06:00", end: "15:00", graceMin: 10, breakMin: 30, absentBelowHours: 4, halfDayBelowHours: 6, shortLeaveBelowHours: 8, earliestCheckInMin: 30, overtimeAfterMin: 30, overtimeMinBlockMin: 30, weeklyOffDays: OFF } },
  { id: "SH-3", name: "Night", rules: { start: "22:00", end: "07:00", graceMin: 15, breakMin: 30, absentBelowHours: 4, halfDayBelowHours: 6, shortLeaveBelowHours: 8, earliestCheckInMin: 30, overtimeAfterMin: 30, overtimeMinBlockMin: 30, weeklyOffDays: OFF } },
  { id: "SH-4", name: "Part-time", rules: { start: "10:00", end: "14:00", graceMin: 10, breakMin: 0, absentBelowHours: 1.5, halfDayBelowHours: 3, shortLeaveBelowHours: 3.5, earliestCheckInMin: 30, overtimeAfterMin: 30, overtimeMinBlockMin: 30, weeklyOffDays: OFF } },
]);
const seed = () => ({
  shifts: SHIFT_SEED.map((s) => ({ id: s.id, name: s.name, sample: true, active: true, versions: [{ from: SEED_FROM, ...s.rules, weeklyOffDays: [...s.rules.weeklyOffDays] }] })),
  nextId: SHIFT_SEED.length + 1,
  audit: [],
});
const store = pureBox(KEY, 1, seed, (b) => Array.isArray(b.shifts) && Array.isArray(b.audit));

const copy = (v) => JSON.parse(JSON.stringify(v));
const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";
const today0 = () => officeNow().date;
const nameKey = (s) => String(s ?? "").trim().replace(/\s+/g, "").toLowerCase();

// The version in force on a date: the newest one from on or before it (the oldest when the date is before all of them).
function versionOn(shift, date) {
  const sorted = [...shift.versions].sort((a, b) => a.from.localeCompare(b.from));
  return [...sorted].reverse().find((v) => v.from <= date) ?? sorted[0];
}
function view(shift, date) {
  const v = versionOn(shift, date);
  const rules = Object.fromEntries(RULE_FIELDS.map((k) => [k, k === "weeklyOffDays" ? [...v[k]] : v[k]]));
  const shape = shiftShape(rules);
  return { id: shift.id, name: shift.name, sample: Boolean(shift.sample), active: shift.active !== false, from: v.from, ...rules,
    crossesMidnight: shape.crossesMidnight, lengthMin: shape.length, netMin: shape.net, versions: shift.versions.length };
}

// ---------- reads ----------
export function getShifts({ includeInactive = false } = {}, date = today0()) {
  return store.read().shifts.filter((s) => includeInactive || s.active !== false).map((s) => view(s, date));
}
export function getShift(id, date = today0()) {
  const s = store.read().shifts.find((x) => x.id === id);
  return s ? view(s, date) : null;
}
// The rules of a shift on a date; General's when the id is unknown (a shift is never deleted, so only bad data gets here).
export function shiftRulesOn(id, date) {
  const box = store.read();
  const s = box.shifts.find((x) => x.id === id) ?? box.shifts.find((x) => x.id === GENERAL_ID) ?? seed().shifts[0];
  return view(s, date);
}
// One read of the box for many days (a month, a team): (id, date) -> the rules.
export function shiftReader() {
  const box = store.read();
  const byId = new Map(box.shifts.map((s) => [s.id, s]));
  const general = byId.get(GENERAL_ID) ?? seed().shifts[0];
  const cache = new Map();
  return (id, date) => {
    const k = `${id}|${date}`;
    if (!cache.has(k)) cache.set(k, view(byId.get(id) ?? general, date));
    return cache.get(k);
  };
}
export const shiftsAudit = () => copy(store.read().audit);

// ---------- the rules in words ----------
const hours = (h) => `${Number(h)} h`;
export function shiftHours(rules) {
  const night = rules.crossesMidnight ?? (toMin(rules.end) < toMin(rules.start));
  return night ? `${rules.start} to ${rules.end} (next day)` : `${rules.start} to ${rules.end}`;
}
// "Late after 09:45. Half day under 8 h. Absent under 4 h. Overtime after 18:45 in 30 min blocks." and the rest.
export function shiftSummary(rules) {
  const s = toMin(rules.start), e = toMin(rules.end);
  if (s === null || e === null) return [];
  const night = e < s;
  const lines = [];
  const length = (night ? e + DAY : e) - s;
  lines.push(`${rules.start} to ${rules.end}${night ? " the next morning (night shift)" : ""}, ${Math.floor(length / 60)} h${length % 60 ? ` ${length % 60} min` : ""}${rules.breakMin ? ` with a ${rules.breakMin} min unpaid break` : ""}.`);
  lines.push(`Check-in opens at ${hhmm(s - (rules.earliestCheckInMin || 0))}.`);
  lines.push(`Late after ${hhmm(s + (rules.graceMin || 0))}.`);
  if (Number(rules.shortLeaveBelowHours) > Number(rules.halfDayBelowHours)) lines.push(`Short leave under ${hours(rules.shortLeaveBelowHours)}.`);
  lines.push(`Half day under ${hours(rules.halfDayBelowHours)}.`);
  lines.push(`Absent under ${hours(rules.absentBelowHours)}.`);
  lines.push(`Overtime after ${hhmm((night ? e + DAY : e) + (rules.overtimeAfterMin || 0))} in ${rules.overtimeMinBlockMin} min blocks.`);
  const off = (rules.weeklyOffDays ?? []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEKDAYS[d]);
  lines.push(off.length ? `Weekly off: ${off.join(", ")}.` : "No weekly off.");
  return lines;
}

// ---------- the checks ----------
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const quarter = (v) => typeof v === "number" && Number.isFinite(v) && Math.round(v * 4) === v * 4;
// Every problem with a shift's fields, field by field: { field: message } (empty = fine). id: the shift being edited.
export function shiftProblems(fields, id = null) {
  const p = {};
  const name = String(fields.name ?? "").trim();
  if (name.length < 2 || name.length > 40) p.name = "Give the shift a name of 2 to 40 characters.";
  else if (store.read().shifts.some((s) => s.id !== id && nameKey(s.name) === nameKey(name))) p.name = `There's already a shift called ${name}.`;
  const s = toMin(fields.start), e = toMin(fields.end);
  if (s === null) p.start = "Enter the start as HH:MM, like 09:30.";
  if (e === null) p.end = "Enter the end as HH:MM, like 18:30.";
  if (s !== null && e !== null && s === e) p.end = "The end can't be the same as the start.";
  const length = s !== null && e !== null && s !== e ? (e - s + DAY) % DAY : null;
  if (!isInt(fields.graceMin, 0, 1439)) p.graceMin = "Grace is whole minutes, 0 or more.";
  else if (length !== null && fields.graceMin >= length) p.graceMin = "Grace must be shorter than the shift.";
  if (!isInt(fields.breakMin, 0, 1439)) p.breakMin = "The break is whole minutes, 0 or more.";
  else if (length !== null && fields.breakMin > length - 60) p.breakMin = "The break must leave at least an hour of work.";
  const net = length !== null && isInt(fields.breakMin, 0, 1439) ? (length - fields.breakMin) / 60 : null;
  const A = fields.absentBelowHours, H = fields.halfDayBelowHours, S = fields.shortLeaveBelowHours;
  for (const [k, v] of [["absentBelowHours", A], ["halfDayBelowHours", H], ["shortLeaveBelowHours", S]]) {
    if (!quarter(v) || v <= 0) p[k] = "Hours, more than 0, in quarter hours (like 4 or 7.5).";
  }
  if (!p.absentBelowHours && !p.halfDayBelowHours && A > H) p.absentBelowHours = "Absent must be at or under the half-day hours.";
  if (!p.halfDayBelowHours && !p.shortLeaveBelowHours && H > S) p.shortLeaveBelowHours = "Short leave must be at or above the half-day hours.";
  if (net !== null && !p.shortLeaveBelowHours && S > net) p.shortLeaveBelowHours = `Short leave must be within the hours worked (${net} h).`;
  if (net !== null && !p.halfDayBelowHours && H > net) p.halfDayBelowHours = `Half day must be within the hours worked (${net} h).`;
  if (length !== null && !p.absentBelowHours && A * 60 >= length / 2) p.absentBelowHours = `Absent must be under half the shift (${length / 120} h).`;
  if (!isInt(fields.earliestCheckInMin, 0, 240)) p.earliestCheckInMin = "Check-in can open 0 to 240 minutes before the start.";
  else if (s !== null && fields.earliestCheckInMin > s) p.earliestCheckInMin = "Check-in can't open before midnight on the shift's day.";
  else if (length !== null && fields.earliestCheckInMin + length > DAY - 60) p.earliestCheckInMin = "The check-in window and the shift must fit in a day, with an hour to spare.";
  if (!isInt(fields.overtimeAfterMin, 0, 240)) p.overtimeAfterMin = "Overtime can start 0 to 240 minutes after the end.";
  if (!isInt(fields.overtimeMinBlockMin, 5, 240)) p.overtimeMinBlockMin = "Overtime blocks are 5 to 240 minutes.";
  const off = fields.weeklyOffDays;
  if (!Array.isArray(off) || off.some((d) => !isInt(d, 0, 6)) || new Set(off).size !== off.length) p.weeklyOffDays = "Choose the weekly off days.";
  else if (off.length > 6) p.weeklyOffDays = "Leave at least one working day in the week.";
  return p;
}
const rulesOf = (f) => ({ ...Object.fromEntries(RULE_FIELDS.map((k) => [k, f[k]])), weeklyOffDays: [...f.weeklyOffDays].sort((a, b) => a - b) });

// ---------- writes ----------
const manager = (id) => { const u = id ? getUser(id) : null; return u && u.status !== "inactive" && hasPermission(u, "shifts:manage") ? u : null; };
const NOT_ALLOWED = "Only HR or an Admin can change shifts.";
const entry = (actor, action, detail, today) => ({ at: new Date().toISOString(), on: today, by: actor.id, name: actor.name, action, ...detail });
function firstProblem(p) {
  const field = Object.keys(p)[0];
  return { ...fail(p[field], field), problems: p };
}

export function createShift(actorUserId, fields = {}, today = today0()) {
  const actor = manager(actorUserId);
  if (!actor) return fail(NOT_ALLOWED);
  const f = { ...fields, name: String(fields.name ?? "").trim() };
  const p = shiftProblems(f);
  if (Object.keys(p).length) return firstProblem(p);
  const box = store.read();
  const id = `SH-${box.nextId}`;
  box.nextId += 1;
  const shift = { id, name: f.name, sample: false, active: true, versions: [{ from: today, ...rulesOf(f) }] };
  box.shifts.push(shift);
  box.audit.push(entry(actor, "created", { shiftId: id, shiftName: f.name }, today));
  return store.write(box) ? { ok: true, record: view(shift, today) } : fail(SAVE_FAILED);
}

// changes: any of name and the rule fields. The rules start from today (a version); the name is the shift's.
export function updateShift(actorUserId, id, changes = {}, today = today0()) {
  const actor = manager(actorUserId);
  if (!actor) return fail(NOT_ALLOWED);
  const box = store.read();
  const shift = box.shifts.find((s) => s.id === id);
  if (!shift) return fail("That shift doesn't exist.");
  const current = view(shift, today);
  const f = { ...current, ...changes, name: String(changes.name ?? current.name).trim() };
  const p = shiftProblems(f, id);
  if (Object.keys(p).length) return firstProblem(p);
  const rules = rulesOf(f);
  const same = RULE_FIELDS.every((k) => JSON.stringify(rules[k]) === JSON.stringify(current[k]));
  if (same && f.name === shift.name) return fail("Nothing changed.");
  if (!same) {
    const at = shift.versions.findIndex((v) => v.from === today);
    if (at >= 0) shift.versions[at] = { from: today, ...rules };
    else shift.versions.push({ from: today, ...rules });
  }
  const renamed = f.name !== shift.name;
  shift.name = f.name;
  shift.sample = false;
  box.audit.push(entry(actor, "edited", { shiftId: id, shiftName: f.name, ...(renamed ? { renamedFrom: current.name } : {}), rulesFrom: same ? null : today }, today));
  return store.write(box) ? { ok: true, record: view(shift, today) } : fail(SAVE_FAILED);
}

// Who is on a shift now or later, read straight from data/shift-assignments.js's storage (that module imports this one):
// people whose assignment covers today or starts later, departments whose default is it today or later, swaps from today.
export function shiftInUse(id, today = today0()) {
  const box = load("shift-assignments");
  const a = box && box.version === 1 ? box : { people: [], departments: [], swaps: [] };
  const people = (a.people ?? []).filter((r) => r.shiftId === id && !r.cancelled && (r.to === null || r.to >= today));
  const deps = (a.departments ?? []).filter((d) => d.shiftId === id);
  const liveDeps = deps.filter((d) => {
    const later = (a.departments ?? []).filter((x) => x.departmentId === d.departmentId && x.from <= today).sort((x, y) => x.from.localeCompare(y.from) || x.seq - y.seq).at(-1);
    return d.from > today || later === d;
  });
  const swaps = (a.swaps ?? []).filter((s) => s.shiftId === id && !s.cancelled && s.date >= today);
  const names = [...new Set(people.map((r) => r.userId).concat(swaps.map((s) => s.userId)))].map((uid) => getUser(uid)?.name ?? uid);
  return { people: people.length, departments: liveDeps.length, swaps: swaps.length, names, any: people.length + liveDeps.length + swaps.length > 0 };
}

export function deactivateShift(actorUserId, id, today = today0()) {
  const actor = manager(actorUserId);
  if (!actor) return fail(NOT_ALLOWED);
  const box = store.read();
  const shift = box.shifts.find((s) => s.id === id);
  if (!shift) return fail("That shift doesn't exist.");
  if (id === GENERAL_ID) return fail("General is everyone's shift unless they're assigned another, so it can't be deactivated.");
  if (shift.active === false) return fail(`${shift.name} is already inactive.`);
  const use = shiftInUse(id, today);
  if (use.any) {
    const parts = [use.people ? `${use.people} ${use.people === 1 ? "assignment" : "assignments"}` : null, use.departments ? `${use.departments} department ${use.departments === 1 ? "default" : "defaults"}` : null, use.swaps ? `${use.swaps} date ${use.swaps === 1 ? "swap" : "swaps"}` : null].filter(Boolean);
    return { ...fail(`${shift.name} is still in use (${parts.join(", ")}${use.names.length ? `: ${use.names.slice(0, 3).join(", ")}${use.names.length > 3 ? " and others" : ""}` : ""}). Move them to another shift first.`), code: "in-use", use };
  }
  shift.active = false;
  box.audit.push(entry(actor, "deactivated", { shiftId: id, shiftName: shift.name }, today));
  return store.write(box) ? { ok: true, record: view(shift, today) } : fail(SAVE_FAILED);
}
export function reactivateShift(actorUserId, id, today = today0()) {
  const actor = manager(actorUserId);
  if (!actor) return fail(NOT_ALLOWED);
  const box = store.read();
  const shift = box.shifts.find((s) => s.id === id);
  if (!shift) return fail("That shift doesn't exist.");
  if (shift.active !== false) return fail(`${shift.name} is already active.`);
  shift.active = true;
  box.audit.push(entry(actor, "reactivated", { shiftId: id, shiftName: shift.name }, today));
  return store.write(box) ? { ok: true, record: view(shift, today) } : fail(SAVE_FAILED);
}

export function resetShifts() {
  remove(KEY);
}