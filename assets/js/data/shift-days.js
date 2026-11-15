// data/shift-days.js (SH1, 2026-11-15): attendance days read under each person's shift. Additive: it reads
// data/attendance-store.js's days (dayFor, monthFor, rangeFor, teamFor), never changes them, and nothing older reads it.
//
// Before the shift rules start date (data/shift-settings.js) a day is the old day exactly, with its shift named General
// (the rule in force: General is today's rules). From it, the day is reclassified by data/shift-engine.js from the same
// record (check-in, check-out), holiday, approved leave and the person's shift on that date (data/shift-assignments.js),
// with "now" in office time. Left, not-joined and no-data days stay as the old rules give them.
//
// Each day gains: shiftId, shiftName, shiftStart, shiftEnd, crossesMidnight, shiftSource (swap | person | department |
// default | before-start), swapReason, overtimeMinutes, rules ("old" | "shift"); status may be short-leave or weekly-off.
//
//   shiftDayFor(userId, date)  shiftRangeFor(userId, from, to)  shiftTeamFor(date)  shiftMonthFor(userId, year, month)
//   shiftMonthLossOfPay(userId, year, month)  shiftCounts(days)

import { dayFor, monthFor, rangeFor, teamFor, recordsStart, ATTENDANCE_RULES } from "./attendance-store.js";
import { getUser, joiningDate } from "./store.js";
import { allRequests } from "./leave-store.js";
import { classifyDay, dayLossOfPay, officeNow, addDays, shiftShape, toMin, hhmm, dayNo, DAY } from "./shift-engine.js";
import { assignmentReader } from "./shift-assignments.js";
import { shiftReader, GENERAL_ID } from "./shifts-store.js";
import { shiftRulesApply, shiftRulesMonth, latePolicy } from "./shift-settings.js";

const pad = (n) => String(n).padStart(2, "0");

function reader(now = officeNow()) {
  return { assign: assignmentReader(), shift: shiftReader(), now, trackingStart: recordsStart() ?? "9999-12-31" };
}
function named(day, rules, source, extra = {}) {
  return { ...day, shiftId: rules.id, shiftName: rules.name, shiftStart: rules.start, shiftEnd: rules.end, crossesMidnight: rules.crossesMidnight, shiftSource: source, overtimeMinutes: 0, ...extra };
}
// The sample people's generated days (data/attendance-store.js: no stored record, recordId null; times around 09:30 and
// 18:30) follow their shift: the check-in keeps its distance from the start, the check-out from the end (General: the
// same times). A time that hasn't come yet in office time isn't shown (as the old rule does for today). A stored record
// is never moved.
const GEN_START = 570, GEN_END = 1110;
function sampleTimes(old, rules, now) {
  if (old.recordId !== null || !old.checkIn) return { checkIn: old.checkIn, checkOut: old.checkOut };
  const shape = shiftShape(rules);
  if (shape.start === GEN_START && shape.end === GEN_END) return { checkIn: old.checkIn, checkOut: old.checkOut };
  const nowRel = (dayNo(now.date) - dayNo(old.date)) * DAY + now.minutes;
  const inRel = shape.start + (toMin(old.checkIn) - GEN_START);
  if (inRel > nowRel) return { checkIn: null, checkOut: null };
  const outRel = old.checkOut ? shape.end + (toMin(old.checkOut) - GEN_END) : null;
  return { checkIn: hhmm(inRel), checkOut: outRel !== null && outRel <= nowRel ? hhmm(outRel) : null };
}

// One old day -> the same day under the shift rules.
function shiftDay(old, ctx) {
  if (!shiftRulesApply(old.date)) return named(old, ctx.shift(GENERAL_ID, old.date), "before-start", { rules: "old" });
  const a = ctx.assign(old.userId, old.date);
  const rules = ctx.shift(a.shiftId, old.date);
  const swap = a.source === "swap" ? { swapReason: a.swap.reason, swapBy: a.swap.by } : {};
  if (old.status === "left" || old.status === "not-joined") return named(old, rules, a.source, { rules: "shift", ...swap });
  const times = sampleTimes(old, rules, ctx.now);
  const c = classifyDay({
    date: old.date, rules, checkIn: times.checkIn, checkOut: times.checkOut,
    holiday: Boolean(old.holiday && old.holiday.kind !== "optional"),
    leaveFull: Boolean(old.leave && old.leave.type !== "wfh" && !old.halfDayLeave),
    halfDayLeave: old.halfDayLeave, noData: old.date < ctx.trackingStart, now: ctx.now,
  });
  return named({ ...old, lateAfter: hhmm(shiftShape(rules).start + rules.graceMin), checkIn: times.checkIn, checkOut: times.checkOut, status: c.status, expected: c.expected, minutesLate: c.minutesLate, minutesWorked: c.minutesWorked, hours: c.hours,
    inProgress: c.inProgress, overdue: c.overdue, incomplete: c.incomplete }, rules, a.source, { rules: "shift", overtimeMinutes: c.overtimeMinutes, window: c.window, ...swap });
}

export function shiftDayFor(userId, date, now) {
  const old = dayFor(userId, date);
  return old ? shiftDay(old, reader(now)) : null;
}
export function shiftRangeFor(userId, from, to, now) {
  const days = rangeFor(userId, from, to);
  if (!days) return null;
  const ctx = reader(now);
  return days.map((d) => shiftDay(d, ctx));
}
export function shiftTeamFor(date, now) {
  const ctx = reader(now);
  return teamFor(date).map((d) => shiftDay(d, ctx));
}

// Counts of a list of days (the old monthFor's names, plus shortLeave, weeklyOff, incomplete and overtime).
export function shiftCounts(days) {
  const count = (s) => days.filter((d) => d.status === s).length;
  return {
    present: count("present"), late: count("late"), halfDay: count("half-day"), shortLeave: count("short-leave"), absent: count("absent"),
    onLeave: count("on-leave"), holiday: count("holiday"), weekend: count("weekend"), weeklyOff: count("weekly-off"), notYet: count("not-yet"),
    noData: count("no-data"), notJoined: count("not-joined"), incomplete: days.filter((d) => d.incomplete).length,
    overtimeMinutes: days.reduce((s, d) => s + (d.overtimeMinutes || 0), 0),
  };
}

// One person's month: the old month's fields, its days under the shift rules (before the start month: the old month as
// it is, each day named General), and the counts again. The late-mark half days follow the late policy from the start
// month (off by default), the old rule before it.
export function shiftMonthFor(userId, year, month, now) {
  const m = monthFor(userId, year, month);
  if (!m) return null;
  const ctx = reader(now);
  const days = m.days.map((d) => shiftDay(d, ctx));
  if (`${m.year}-${pad(m.month)}` < shiftRulesMonth()) return { ...m, days, rules: "old", counts: { ...m.counts, shortLeave: 0, weeklyOff: 0, incomplete: days.filter((d) => d.incomplete).length, overtimeMinutes: 0 } };
  const counts = shiftCounts(days);
  const finished = days.filter((d) => d.checkOut && d.minutesWorked !== null);
  const lp = latePolicy();
  return {
    ...m, days, rules: "shift", counts,
    daysWorked: counts.present + counts.late + counts.halfDay + counts.shortLeave,
    lateMarks: counts.late,
    penaltyHalfDays: lp.on ? Math.floor(counts.late / lp.every) : 0,
    averageMinutes: finished.length ? Math.round(finished.reduce((s, d) => s + d.minutesWorked, 0) / finished.length) : null,
    overtimeMinutes: counts.overtimeMinutes,
  };
}

// Pay's side (data/pay-engine.js payFor, from the shift rules month): the month's loss-of-pay days under the shift rules,
// settled the way the old payroll settles an absence (data/payroll-store.js absencesIn): once the day's correction
// window has closed and no correction or leave request for it is waiting. Absent 1 (0.5 with a half-day leave), half day
// 0.5, short leave 0.25; an absence with no check-in only from the joining date and only with a joining date on file;
// plus the late-mark half days when the late policy is on (a late mark whose late-arrival correction is pending waits).
// null before the shift rules month or when the old month is null.
// -> { days, absent, halfDay, shortLeave, penaltyHalfDays, open: [{ date, days, until, waiting }] }
export function shiftMonthLossOfPay(userId, year, month, now = officeNow()) {
  if (`${year}-${pad(month)}` < shiftRulesMonth()) return null;
  const m = shiftMonthFor(userId, year, month, now);
  const user = getUser(userId);
  if (!m || !user) return null;
  const joined = joiningDate(user.dateOfJoining);
  const pendingLeave = allRequests().filter((r) => r.userId === userId && r.status === "pending" && r.type !== "wfh");
  const out = { days: 0, absent: 0, halfDay: 0, shortLeave: 0, penaltyHalfDays: 0, open: [] };
  for (const d of m.days) {
    const lop = dayLossOfPay(d.status, d.halfDayLeave);
    if (!lop) continue;
    if (!d.checkIn && (!joined || d.date < joined)) continue;
    const until = addDays(d.date, ATTENDANCE_RULES.requestWindowDays);
    const waiting = d.regularization?.status === "pending" || pendingLeave.some((r) => r.from <= d.date && d.date <= r.to);
    if (now.date > until && !waiting) {
      out.days += lop;
      if (d.status === "absent") out.absent += lop;
      else if (d.status === "half-day") out.halfDay += lop;
      else out.shortLeave += lop;
    } else out.open.push({ date: d.date, days: lop, until, waiting });
  }
  const lp = latePolicy();
  if (lp.on) {
    const paused = m.days.filter((d) => d.status === "late" && d.regularization?.status === "pending" && d.regularization.issue === "late-arrival").length;
    out.penaltyHalfDays = Math.floor((m.counts.late - paused) / lp.every);
    out.days += out.penaltyHalfDays * 0.5;
  }
  return out;
}