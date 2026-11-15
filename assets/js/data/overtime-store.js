// data/overtime-store.js (SH1, 2026-11-15): overtime, from the shift engine, and the decisions on it. Additive.
//
// A day's overtime minutes are worked out (data/shift-days.js: past the shift's end + overtimeAfterMin, in whole blocks,
// on a full day checked out, from the shift rules start date). Until decided it is pending. A decision is stored once and
// never changed: { id, seq, userId, date, month, minutes (as decided), status approved | rejected, by, at, note,
// compOff }. So a month's approved minutes are fixed by the decisions, whatever the record says later.
//
// Who decides: the person's manager (data/reporting.js managerOf) when they have one; HR or an Admin (attendance:view-all)
// for someone without one. Either needs overtime:approve. Nobody decides their own. A rejection needs a reason.
// With comp-off on (data/shift-settings.js), each approval adds its minutes to the person's comp-off bank
// (data/comp-off.js), which makes a comp-off day per minutesPerDay. Pay for overtime is not worked out (a Finance rule).
//
//   overtimeDays(userId, from, to, now?)  pendingOvertime(deciderUserId, now?)  mayDecideOvertime(deciderUserId, userId)
//   decideOvertime(deciderUserId, userId, date, decision, note, now?)  monthOvertime(userId, year, month, now?)
//   overtimeItem(id)  decideOvertimeItem(deciderUserId, id, decision, note)   (id "OT:<userId>:<date>", the approval card's)
//   allOvertimeDecisions()  overtimeDecisionsFor(userId)  resetOvertime()  resetShiftData()

import { remove } from "../core/storage.js";
import { getUser, getAllUsers } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { pureBox } from "./places.js";
import { managerOf } from "./reporting.js";
import { shiftRangeFor } from "./shift-days.js";
import { shiftRulesFrom, compOffRule } from "./shift-settings.js";
import { creditOvertime, resetCompOff } from "./comp-off.js";
import { resetShifts } from "./shifts-store.js";
import { resetShiftAssignments } from "./shift-assignments.js";
import { resetShiftSettings } from "./shift-settings.js";
import { officeNow, addDays, officeInstant, toMin } from "./shift-engine.js";

const KEY = "overtime";
const store = pureBox(KEY, 1, () => ({ decisions: [], seq: 1 }), (b) => Array.isArray(b.decisions));
const copy = (v) => JSON.parse(JSON.stringify(v));
const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";
export const PENDING_DAYS_BACK = 62;   // the inbox looks back about two months

export const allOvertimeDecisions = () => copy(store.read().decisions);
export const overtimeDecisionsFor = (userId) => copy(store.read().decisions.filter((d) => d.userId === userId));

// A person's days with overtime between two dates (from the shift rules start date), oldest first:
// [{ userId, date, minutes, engineMinutes, status: pending | approved | rejected, decision, shiftName }]
export function overtimeDays(userId, from, to, now = officeNow()) {
  const start = from > shiftRulesFrom() ? from : shiftRulesFrom();
  if (start > to) return [];
  const days = shiftRangeFor(userId, start, to, now) ?? [];
  const decided = new Map(store.read().decisions.filter((d) => d.userId === userId).map((d) => [d.date, d]));
  // only a stored record's day (a sample person's generated day is never overtime)
  return days.filter((d) => d.rules === "shift" && d.recordId !== null && d.checkOut && (d.overtimeMinutes > 0 || decided.has(d.date))).map((d) => {
    const dec = decided.get(d.date) ?? null;
    // id: "OT:<userId>:<date>" (the approval card and the inbox); requestedAt: the check-out's instant (office time), when it began to wait
    const outDate = d.crossesMidnight && toMin(d.checkOut) < toMin(d.checkIn) ? addDays(d.date, 1) : d.date;
    return { id: `OT:${userId}:${d.date}`, userId, date: d.date, minutes: dec ? dec.minutes : d.overtimeMinutes, engineMinutes: d.overtimeMinutes, status: dec ? dec.status : "pending", decision: dec ? copy(dec) : null,
      shiftName: d.shiftName, checkIn: d.checkIn, checkOut: d.checkOut, shiftEnd: d.shiftEnd, requestedAt: officeInstant(outDate, toMin(d.checkOut)) };
  });
}

export function mayDecideOvertime(deciderUserId, userId) {
  const d = deciderUserId ? getUser(deciderUserId) : null;
  if (!d || d.status === "inactive" || d.id === userId || !hasPermission(d, "overtime:approve")) return false;
  const mgr = managerOf(userId);
  return mgr ? mgr === d.id : hasPermission(d, "attendance:view-all");
}

// Everything waiting for this person's decision (the inbox, the bell, the sidebar count, the Admin dashboard), oldest first.
export function pendingOvertime(deciderUserId, now = officeNow()) {
  const d = deciderUserId ? getUser(deciderUserId) : null;
  if (!d || !hasPermission(d, "overtime:approve")) return [];
  const from = addDays(now.date, -PENDING_DAYS_BACK);
  return getAllUsers().filter((u) => u.status !== "inactive" && mayDecideOvertime(d.id, u.id))
    .flatMap((u) => overtimeDays(u.id, from, now.date, now).filter((o) => o.status === "pending").map((o) => ({ ...o, name: u.name })))
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

export function decideOvertime(deciderUserId, userId, date, decision, note = "", now = officeNow()) {
  if (decision !== "approved" && decision !== "rejected") return fail("Approve or reject.");
  if (!mayDecideOvertime(deciderUserId, userId)) return fail(deciderUserId === userId ? "You can't decide your own overtime." : "You can't decide this overtime.");
  const box = store.read();
  const done = box.decisions.find((x) => x.userId === userId && x.date === date);
  if (done) return fail(`This overtime was already ${done.status}.`);
  const day = overtimeDays(userId, date, date, now)[0];
  if (!day || day.engineMinutes <= 0) return fail("There's no overtime on that day.");
  const why = String(note ?? "").trim();
  if (decision === "rejected" && (why.length < 3 || why.length > 200)) return fail("Give a reason of 3 to 200 characters.", "note");
  const rule = compOffRule();
  const row = { id: `OT-${box.seq}`, seq: box.seq, userId, date, month: date.slice(0, 7), minutes: day.engineMinutes, status: decision, by: deciderUserId, at: new Date().toISOString(), note: why.slice(0, 200), compOff: decision === "approved" && rule.on };
  box.seq += 1;
  box.decisions.push(row);
  if (!store.write(box)) return fail(SAVE_FAILED);
  const credit = row.compOff ? creditOvertime(userId, row.minutes, rule, now.date, row.id) : null;
  return { ok: true, record: copy(row), credits: credit?.credits ?? [] };
}

// One day's overtime by its id ("OT:<userId>:<date>"), pending or decided, or null.
const parseId = (id) => { const m = /^OT:(.+):(\d{4}-\d{2}-\d{2})$/.exec(String(id ?? "")); return m ? { userId: m[1], date: m[2] } : null; };
export function overtimeItem(id, now = officeNow()) {
  const p = parseId(id);
  return p ? overtimeDays(p.userId, p.date, p.date, now)[0] ?? null : null;
}
export function decideOvertimeItem(deciderUserId, id, decision, note = "", now = officeNow()) {
  const p = parseId(id);
  return p ? decideOvertime(deciderUserId, p.userId, p.date, decision, note, now) : fail("That overtime doesn't exist.");
}

// A month's minutes: approved (fixed by the decisions), pending and rejected.
export function monthOvertime(userId, year, month, now = officeNow()) {
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const last = addDays(next, -1);
  const days = overtimeDays(userId, `${key}-01`, last, now);
  const sum = (s) => days.filter((d) => d.status === s).reduce((t, d) => t + d.minutes, 0);
  return { month: key, approved: sum("approved"), pending: sum("pending"), rejected: sum("rejected"), days };
}

export function resetOvertime() {
  remove(KEY);
}
// The users page's Reset demo data: every SH1 store back to its seed (shifts, assignments, settings, overtime, comp-off).
export function resetShiftData() {
  resetShifts();
  resetShiftAssignments();
  resetShiftSettings();
  resetOvertime();
  resetCompOff();
}