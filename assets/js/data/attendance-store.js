// data/attendance-store.js
// Attendance records and regularization requests, kept in localStorage through
// data/collection.js. Only what happened is stored: who, which day, the punch
// times, office or home, where the record came from, any times a correction
// replaced, and the history. Status, hours and lateness are worked out on every
// read from the rules below plus weekends, holidays, approved leave and the
// user list, so adding a holiday or approving leave changes a day without
// rewriting any record.
//
// Dates are local calendar dates ("2026-09-28") and times are local "HH:MM",
// the same way the leave module treats "today".
//
// The older data/attendance.js (fixed demo constants) is not used by this file.

import { createCollection, fail } from "./collection.js";
import { getUser, getAllUsers } from "./store.js";
import { dayNumber, isoFromDayNumber, isValidDate, isWeekend, getAllHolidays, dayOffChecker } from "./holidays.js";
import { allRequests, managerFor } from "./leave-store.js";
import { ROLES } from "../config/roles.js";

// The General shift, the only one for now.
export const ATTENDANCE_RULES = {
  shiftStart: "09:30",
  shiftEnd: "18:30",
  graceMinutes: 15,           // late = checking in after 09:45
  halfSplit: "14:00",         // where a half-day leave splits the shift
  fullDayMinutes: 8 * 60,
  halfDayMinutes: 4 * 60,     // under this = absent for the day
  penaltyEvery: 3,            // every 3rd late mark in a month = a half-day penalty (information only)
  requestWindowDays: 7,
};

export const MODES = ["office", "wfh"];
export const ISSUES = ["late-arrival", "missed-check-in", "missed-check-out"];
export const STATUSES = ["present", "late", "half-day", "absent", "on-leave", "holiday", "weekend", "not-yet", "no-data"];

// ---------- small helpers ----------

const pad = (n) => String(n).padStart(2, "0");

// "09:45" -> 585. Anything that isn't a real 24-hour "HH:MM" -> null.
function toMinutes(hhmm) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm ?? ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
const fromMinutes = (n) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;
export const isValidTime = (hhmm) => toMinutes(hhmm) !== null;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}
// The moment a local date and time happened, as a stored ISO timestamp.
function stampOf(date, hhmm) {
  const [y, m, d] = date.split("-").map(Number);
  const minutes = toMinutes(hhmm);
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60).toISOString();
}

const canDecide = (roleKey) => Boolean(ROLES[roleKey]?.permissions.includes("attendance:approve"));
const isTracked = (user) => Boolean(user) && user.status !== "inactive";   // "on-leave" is a profile label, not a leave
const byName = (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id);

// ---------- seed (generated around the day it's first read) ----------

// The nine active demo employees (Divya, EMP-1061, is inactive and gets nothing).
const SEED_USERS = ["EMP-1001", "EMP-1003", "EMP-1008", "EMP-1017", "EMP-1023", "EMP-1029", "EMP-1042", "EMP-1088", "EMP-1105"];
// The four demo sign-in identities check in themselves; nobody checks in for them today.
const SIGN_IN_IDS = ["EMP-1001", "EMP-1003", "EMP-1008", "EMP-1105"];
const MIN_SEED_DAYS = 14;

// A fixed number from a text, so the same person and day always get the same times.
function hash(text) {
  let h = 5381;
  for (const ch of text) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return h;
}
const vary = (key, range) => hash(key) % range;

// Working days before today (weekends and national/company holidays skipped),
// newest first: at least 14, and back to the 1st of this month.
function seedDays(today) {
  const isOff = dayOffChecker();
  const monthStart = `${today.slice(0, 8)}01`;
  const days = [];
  for (let n = dayNumber(today) - 1; days.length < 60; n--) {
    const iso = isoFromDayNumber(n);
    if (days.length >= MIN_SEED_DAYS && iso < monthStart) break;
    if (!isOff(iso)) days.push(iso);
  }
  return days;
}

// Covered by an approved leave? { full, wfh } for one person and date.
function seedLeaveOn(approved, userId, date) {
  const mine = approved.filter((r) => r.userId === userId && r.from <= date && date <= r.to);
  return {
    full: mine.some((r) => r.type !== "wfh" && r.duration === "full"),
    wfh: mine.some((r) => r.type === "wfh"),
  };
}

// Everything special in the sample data, by position in seedDays() (0 = the
// last working day before today). Everyone else has an ordinary on-time day.
//   day: { in, out }              the punch times (out null = forgot to check out)
//   mode                          "wfh" (default office)
//   originalIn                    the time a regularization replaced
//   absent: true                  no record at all that day
const SPECIAL = {
  "EMP-1105": {   // Arjun: a regularized late day and a plain late day, as the pages show
    1: { in: "09:30", out: "18:30", originalIn: "10:12" },
    3: { in: "10:05", out: "18:20" },
  },
  "EMP-1088": {   // Vikram: two late days (one waiting for a correction) and an absence
    2: { in: "10:24", out: "18:40" },
    6: { in: "09:58", out: "18:35" },
    10: { absent: true },
  },
  "EMP-1029": { 4: { in: "10:02", out: "18:45" } },                          // Sneha: late, correction pending
  "EMP-1017": { 5: { in: "09:31", out: null }, 9: { in: "09:20", out: "13:40" } },   // Ananya: forgot to check out; a half day
  "EMP-1042": { 8: { in: "09:58", out: "18:40" } },                          // Rohan: late, correction rejected
  "EMP-1008": { 7: { in: "09:15", out: "18:20", mode: "wfh" } },             // Kabir: worked from home (free choice)
};
// Today's check-ins for the people who don't sign in to the demo; only the ones
// already past when the data is first created.
const TODAY_IN = { "EMP-1042": "09:12", "EMP-1017": "09:31", "EMP-1029": "09:20", "EMP-1088": "10:24" };

// The seeded corrections, one per SPECIAL day that has one.
//   decision: "approved" / "rejected" (by Priya Nair, HR, on the next working day) or pending
const SEED_REQUESTS = [
  { id: "RG-101", userId: "EMP-1105", day: 1, issue: "late-arrival", time: "09:30", recordedTime: "10:12",
    reason: "Client call ran over before I left home; Sneha knew in the morning", decision: "approved" },
  { id: "RG-102", userId: "EMP-1088", day: 2, issue: "late-arrival", time: "09:30", recordedTime: "10:24",
    reason: "Bus breakdown, informed the manager by phone" },
  { id: "RG-103", userId: "EMP-1029", day: 4, issue: "late-arrival", time: "09:30", recordedTime: "10:02",
    reason: "Client call from home before commuting" },
  { id: "RG-104", userId: "EMP-1017", day: 5, issue: "missed-check-out", time: "18:00", recordedTime: null,
    reason: "Forgot to check out before leaving" },
  { id: "RG-105", userId: "EMP-1042", day: 8, issue: "late-arrival", time: "09:30", recordedTime: "09:58",
    reason: "Heavy traffic on the expressway", decision: "rejected", note: "Traffic delays aren't corrected; the late mark stays." },
];
const HR_DECIDER = "EMP-1003";   // Priya Nair

function generateSeed() {
  const today = todayIso();
  const now = nowMinutes();
  const days = seedDays(today);
  const approved = allRequests().filter((r) => r.status === "approved");
  const people = SEED_USERS.map((id) => getUser(id)).filter(isTracked);

  const records = [];
  const entry = (at, byUserId, action, extra = {}) => ({ at, byUserId, action, note: "", ...extra });

  people.forEach((user) => {
    // Oldest first, so ids run in date order.
    [...days].reverse().forEach((date) => {
      const index = days.indexOf(date);
      const leaveDay = seedLeaveOn(approved, user.id, date);
      if (leaveDay.full) return;
      const special = SPECIAL[user.id]?.[index];
      if (special?.absent) return;
      const checkIn = special?.in ?? fromMinutes(9 * 60 + 5 + vary(`${user.id}|${date}|in`, 26));      // 09:05-09:30
      const checkOut = special ? special.out : fromMinutes(18 * 60 + vary(`${user.id}|${date}|out`, 46));   // 18:00-18:45
      const mode = special?.mode ?? (leaveDay.wfh ? "wfh" : "office");
      const history = [entry(stampOf(date, special?.originalIn ?? checkIn), user.id, "checked-in")];
      if (checkOut) history.push(entry(stampOf(date, checkOut), user.id, "checked-out"));
      const request = SEED_REQUESTS.find((r) => r.userId === user.id && r.day === index && r.decision === "approved");
      if (request) history.push(entry(stampOf(days[index - 1] ?? today, "11:00"), HR_DECIDER, "regularized", { regularizationId: request.id }));
      records.push({
        userId: user.id, date, checkIn, checkOut, mode, source: "seed",
        originalCheckIn: special?.originalIn ?? null, originalCheckOut: null, history,
      });
    });

    // Today, if it's a working day for them and the check-in time has passed.
    const time = TODAY_IN[user.id];
    const todayLeave = seedLeaveOn(approved, user.id, today);
    if (time && !SIGN_IN_IDS.includes(user.id) && !dayOffChecker()(today) && !todayLeave.full && toMinutes(time) <= now) {
      records.push({
        userId: user.id, date: today, checkIn: time, checkOut: null, mode: todayLeave.wfh ? "wfh" : "office", source: "seed",
        originalCheckIn: null, originalCheckOut: null, history: [entry(stampOf(today, time), user.id, "checked-in")],
      });
    }
  });

  const requests = SEED_REQUESTS
    .filter((r) => days[r.day] && people.some((u) => u.id === r.userId))
    .map((r) => {
      const date = days[r.day];
      const sentOn = days[r.day - 1] ?? today;   // sent the next working day
      const managerId = managerFor(r.userId);
      const stage = managerId ? "manager" : "hr";
      const history = [{ stage, byUserId: r.userId, decision: "applied", at: stampOf(r.day === 1 ? date : sentOn, r.day === 1 ? "18:40" : "09:40"), note: "" }];
      if (r.decision) history.push({ stage, byUserId: HR_DECIDER, decision: r.decision, at: stampOf(sentOn, "11:00"), note: r.note ?? "" });
      return {
        id: r.id, userId: r.userId, date, issue: r.issue, time: r.time, recordedTime: r.recordedTime, reason: r.reason,
        status: r.decision ?? "pending", stage: r.decision ? "done" : stage, managerId,
        appliedOn: r.day === 1 ? date : sentOn, history,
      };
    });

  return { records, requests };
}

const attendance = createCollection({ key: "attendance", version: 1, seed: () => generateSeed().records, idPrefix: "AT-" });
const regularizations = createCollection({ key: "regularizations", version: 1, seed: () => generateSeed().requests, idPrefix: "RG-" });

// ---------- deriving a day ----------

// Everything a day needs, read once so a month or a whole team doesn't re-read storage per day.
function context() {
  const records = attendance.getAll();
  return {
    records,
    requests: regularizations.getAll(),
    approvedLeave: allRequests().filter((r) => r.status === "approved"),
    isOff: dayOffChecker(),
    holidays: new Map(getAllHolidays().map((h) => [h.date, h])),
    trackingStart: records.reduce((min, r) => (r.date < min ? r.date : min), "9999-12-31"),
    today: todayIso(),
    now: nowMinutes(),
  };
}

// What approved leave covers this person's date:
//   full: a whole day off (a full-day leave, or both halves); half: the half they're off
//   wfh:  an approved work-from-home day; leave: the leave to show ({ id, type, duration })
function leaveCover(approvedLeave, userId, date) {
  const mine = approvedLeave.filter((r) => r.userId === userId && r.from <= date && date <= r.to);
  const away = mine.filter((r) => r.type !== "wfh");
  const halves = new Set(away.filter((r) => r.duration !== "full").map((r) => r.duration));
  const full = away.some((r) => r.duration === "full") || halves.size === 2;
  const shown = away[0] ?? mine[0] ?? null;
  return {
    full,
    half: !full && halves.size === 1 ? [...halves][0] : null,
    wfh: mine.some((r) => r.type === "wfh"),
    leave: shown ? { id: shown.id, type: shown.type, duration: shown.duration } : null,
  };
}

// The request to show for a day: a pending one if any, otherwise the latest.
function requestOn(requests, userId, date) {
  const mine = requests.filter((r) => r.userId === userId && r.date === date);
  const chosen = mine.find((r) => r.status === "pending") ?? mine.sort((a, b) => b.id.localeCompare(a.id, "en", { numeric: true }))[0];
  return chosen ? { id: chosen.id, status: chosen.status, issue: chosen.issue } : null;
}

function deriveDay(ctx, user, date) {
  const R = ATTENDANCE_RULES;
  const record = ctx.records.find((r) => r.userId === user.id && r.date === date) ?? null;
  const holiday = ctx.holidays.get(date) ?? null;
  const cover = leaveCover(ctx.approvedLeave, user.id, date);

  // The part of the shift they're expected for: all of it, or the half not on leave.
  let start = toMinutes(R.shiftStart);
  let end = toMinutes(R.shiftEnd);
  let needed = R.fullDayMinutes;
  if (cover.half === "first-half") { start = toMinutes(R.halfSplit); needed = R.halfDayMinutes; }
  if (cover.half === "second-half") { end = toMinutes(R.halfSplit); needed = R.halfDayMinutes; }

  const day = {
    userId: user.id,
    date,
    status: null,
    expected: false,              // was attendance expected (a working day, not a full day of leave)
    recordId: record?.id ?? null,
    checkIn: record?.checkIn ?? null,
    checkOut: record?.checkOut ?? null,
    originalCheckIn: record?.originalCheckIn ?? null,
    originalCheckOut: record?.originalCheckOut ?? null,
    mode: record?.mode ?? null,
    suggestedMode: cover.wfh ? "wfh" : "office",
    minutesWorked: null,
    hours: null,
    minutesLate: 0,               // minutes after the (half-)shift start, only when past the grace period
    inProgress: false,            // today, checked in, not out yet
    overdue: false,               // today, not in yet, and past the time to check in (start + grace)
    incomplete: false,            // an earlier day with a check-in but no check-out
    conflict: false,              // checked in, but a full day of approved leave covers it
    regularized: Boolean(record?.history.some((h) => h.action === "regularized")),
    holiday: holiday ? { name: holiday.name, kind: holiday.kind } : null,
    leave: cover.leave,
    halfDayLeave: cover.half,
    regularization: requestOn(ctx.requests, user.id, date),
  };

  if (record?.checkIn) {
    // A check-in always counts, even on a day that later became a holiday or leave.
    const inAt = toMinutes(record.checkIn);
    const late = inAt > start + R.graceMinutes;
    day.expected = true;
    day.conflict = cover.full;
    day.minutesLate = late ? inAt - start : 0;
    if (record.checkOut) {
      day.minutesWorked = Math.max(0, toMinutes(record.checkOut) - inAt);
      if (day.minutesWorked < R.halfDayMinutes) day.status = "absent";
      else if (day.minutesWorked < needed) day.status = "half-day";
      else day.status = late ? "late" : "present";
    } else {
      if (date === ctx.today) {
        day.inProgress = true;
        day.minutesWorked = Math.max(0, ctx.now - inAt);
      } else {
        day.incomplete = true;
      }
      day.status = late ? "late" : "present";
    }
  } else if (holiday && holiday.kind !== "optional") {
    day.status = "holiday";
  } else if (isWeekend(date)) {
    day.status = "weekend";
  } else if (cover.full) {
    day.status = "on-leave";
  } else if (date < ctx.trackingStart) {
    day.status = "no-data";       // before attendance was recorded at all
  } else {
    day.expected = true;
    const stillOpen = date > ctx.today || (date === ctx.today && ctx.now < end);
    day.status = stillOpen ? "not-yet" : "absent";
    // Checking in now would already be late: after 09:45, or 14:15 with first-half leave.
    day.overdue = stillOpen && date === ctx.today && ctx.now > start + R.graceMinutes;
  }

  if (day.minutesWorked !== null) day.hours = Math.round(day.minutesWorked / 6) / 10;   // one decimal
  return day;
}

// ---------- reads ----------

// One person's day, or null (unknown or inactive person, or not a real date).
export function dayFor(userId, date) {
  const user = getUser(userId);
  if (!isTracked(user) || !isValidDate(date)) return null;
  return deriveDay(context(), user, date);
}

// One person's month (month 1-12): every day, counts per status, and the late-mark penalty.
export function monthFor(userId, year, month) {
  const user = getUser(userId);
  const y = Number(year);
  const m = Number(month);
  if (!isTracked(user) || !Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return null;
  const ctx = context();
  const first = dayNumber(`${y}-${pad(m)}-01`);
  const next = m === 12 ? dayNumber(`${y + 1}-01-01`) : dayNumber(`${y}-${pad(m + 1)}-01`);
  const days = [];
  for (let n = first; n < next; n++) days.push(deriveDay(ctx, user, isoFromDayNumber(n)));

  const count = (status) => days.filter((d) => d.status === status).length;
  const counts = {
    present: count("present"), late: count("late"), halfDay: count("half-day"), absent: count("absent"),
    onLeave: count("on-leave"), holiday: count("holiday"), weekend: count("weekend"), notYet: count("not-yet"), noData: count("no-data"),
  };
  const finished = days.filter((d) => d.checkOut && d.minutesWorked !== null);
  const lateMarks = counts.late;
  return {
    userId: user.id,
    year: y,
    month: m,
    days,
    counts,
    workingDays: days.filter((d) => !ctx.isOff(d.date)).length,
    workingDaysLeft: days.filter((d) => !ctx.isOff(d.date) && d.date > ctx.today).length,
    daysWorked: counts.present + counts.late + counts.halfDay,
    lateMarks,
    penaltyHalfDays: Math.floor(lateMarks / ATTENDANCE_RULES.penaltyEvery),
    averageMinutes: finished.length ? Math.round(finished.reduce((sum, d) => sum + d.minutesWorked, 0) / finished.length) : null,
    conflicts: days.filter((d) => d.conflict).length,
    regularized: days.filter((d) => d.regularized).length,
  };
}

// Every active person's day, by name.
export function teamFor(date) {
  if (!isValidDate(date)) return [];
  const ctx = context();
  return getAllUsers().filter(isTracked).sort(byName).map((user) => deriveDay(ctx, user, date));
}

// Monday to Friday of the week (Monday to Sunday) that holds the date.
function weekDates(date) {
  const n = dayNumber(date);
  const monday = n - (((n + 3) % 7) + 7) % 7;   // day 0, 1 Jan 1970, was a Thursday
  return [0, 1, 2, 3, 4].map((i) => isoFromDayNumber(monday + i));
}

// One person's Monday to Friday around the date, or null (unknown or inactive
// person, or not a real date).
export function weekFor(userId, date) {
  const user = getUser(userId);
  if (!isTracked(user) || !isValidDate(date)) return null;
  const ctx = context();
  return weekDates(date).map((d) => deriveDay(ctx, user, d));
}

// One person's days from one date to another (both included, oldest first),
// reading storage once; at most a year. null for an unknown or inactive person
// or a date that isn't real; [] when to is before from.
export function rangeFor(userId, from, to) {
  const user = getUser(userId);
  if (!isTracked(user) || !isValidDate(from) || !isValidDate(to)) return null;
  const ctx = context();
  const days = [];
  const last = Math.min(dayNumber(to), dayNumber(from) + 365);
  for (let n = dayNumber(from); n <= last; n++) days.push(deriveDay(ctx, user, isoFromDayNumber(n)));
  return days;
}

// teamFor() with each person's Monday to Friday, reading storage once:
// [{ day, week: [Mon..Fri days] }], by name.
export function teamWeekFor(date) {
  if (!isValidDate(date)) return [];
  const ctx = context();
  const dates = weekDates(date);
  return getAllUsers().filter(isTracked).sort(byName).map((user) => ({
    day: deriveDay(ctx, user, date),
    week: dates.map((d) => deriveDay(ctx, user, d)),
  }));
}

// Totals for one date across active people. present counts everyone who came
// in (on time, late or a half day); late and halfDay are part of it. expected
// is who should have worked (everyone but weekends, holidays and full leave).
// overdue is the part of notYet already past the time to check in.
export function summaryFor(date) {
  return summarize(date, teamFor(date));
}

// summaryFor() for every date from one to another (both included, oldest
// first), reading storage once; at most a year. null for a date that isn't
// real; [] when to is before from.
export function summaryRange(from, to) {
  if (!isValidDate(from) || !isValidDate(to)) return null;
  const ctx = context();
  const people = getAllUsers().filter(isTracked).sort(byName);
  const out = [];
  const last = Math.min(dayNumber(to), dayNumber(from) + 365);
  for (let n = dayNumber(from); n <= last; n++) {
    const date = isoFromDayNumber(n);
    out.push(summarize(date, people.map((user) => deriveDay(ctx, user, date))));
  }
  return out;
}

// The totals for one date's derived days (shared by summaryFor and summaryRange).
function summarize(date, days) {
  const count = (...statuses) => days.filter((d) => statuses.includes(d.status)).length;
  return {
    date,
    total: days.length,
    expected: days.filter((d) => d.expected).length,
    present: count("present", "late", "half-day"),
    late: count("late"),
    halfDay: count("half-day"),
    wfh: days.filter((d) => d.checkIn && d.mode === "wfh").length,
    onLeave: count("on-leave"),
    absent: count("absent"),
    notYet: count("not-yet"),
    overdue: days.filter((d) => d.overdue).length,
    off: count("holiday", "weekend"),
    conflicts: days.filter((d) => d.conflict).length,
  };
}

export function allRegularizations() {
  return regularizations.getAll();
}

export function getRegularization(id) {
  return regularizations.get(id);
}

export function regularizationsFor(userId) {
  return regularizations.getAll().filter((r) => r.userId === userId);
}

// Pending requests this person may decide: none for roles without
// attendance:approve, and never their own.
export function pendingRegularizations(deciderUserId, roleKey) {
  if (!canDecide(roleKey)) return [];
  return regularizations.getAll().filter((r) => r.status === "pending" && r.userId !== deciderUserId);
}

// ---------- check in / check out (always today, at the current time) ----------

// mode: "office" | "wfh"; left out, it's "wfh" on an approved work-from-home day, else "office".
// Success: { ok: true, record, day }.
export function checkIn(userId, mode) {
  const user = getUser(userId);
  if (!user) return fail(`No employee with id ${userId}.`);
  if (!isTracked(user)) return fail(`${user.name} is inactive and can't check in.`);
  const ctx = context();
  const day = deriveDay(ctx, user, ctx.today);
  const chosen = mode ?? day.suggestedMode;
  if (!MODES.includes(chosen)) return fail("Choose Office or Work from home.", "mode");
  if (day.checkIn) return fail(`You already checked in today at ${day.checkIn}.`);
  if (day.status === "holiday") return fail("Today is a holiday, so no attendance is needed.");
  if (day.status === "weekend") return fail("Today is a weekend, so no attendance is needed.");
  if (day.status === "on-leave") return fail("You're on approved leave today, so check-in is closed.");

  const checkInAt = fromMinutes(ctx.now);
  const result = attendance.add({
    userId: user.id, date: ctx.today, checkIn: checkInAt, checkOut: null, mode: chosen, source: "punch",
    originalCheckIn: null, originalCheckOut: null,
    history: [{ at: new Date().toISOString(), byUserId: user.id, action: "checked-in", note: "" }],
  });
  return result.ok ? { ...result, day: dayFor(user.id, ctx.today) } : result;
}

// Success: { ok: true, record, day }.
export function checkOut(userId) {
  const user = getUser(userId);
  if (!user) return fail(`No employee with id ${userId}.`);
  if (!isTracked(user)) return fail(`${user.name} is inactive and can't check out.`);
  const ctx = context();
  const record = ctx.records.find((r) => r.userId === user.id && r.date === ctx.today);
  if (!record?.checkIn) return fail("Check in first.");
  if (record.checkOut) return fail(`You already checked out today at ${record.checkOut}.`);
  if (ctx.now < toMinutes(record.checkIn)) return fail("Check-out can't be earlier than your check-in.");
  const result = attendance.update(record.id, {
    checkOut: fromMinutes(ctx.now),
    history: [...record.history, { at: new Date().toISOString(), byUserId: user.id, action: "checked-out", note: "" }],
  });
  return result.ok ? { ...result, day: dayFor(user.id, ctx.today) } : result;
}

// ---------- regularization ----------

// Is this correction still possible for the record as it is now? null if yes, else a fail().
function checkAgainstRecord(record, issue, time, today, date) {
  const t = toMinutes(time);
  if (issue === "late-arrival") {
    if (!record?.checkIn) return fail("There's no check-in that day to correct. Choose Missed check-in instead.", "issue");
    if (t >= toMinutes(record.checkIn)) return fail(`The corrected time must be earlier than the recorded check-in (${record.checkIn}).`, "time");
    return null;
  }
  if (issue === "missed-check-in") {
    if (record?.checkIn) return fail(`You checked in at ${record.checkIn} that day. Choose Late arrival to correct it.`, "issue");
    return null;
  }
  // missed-check-out
  if (!record?.checkIn) return fail("There's no check-in that day, so there's no check-out to add. Choose Missed check-in first.", "issue");
  if (record.checkOut) return fail(`A check-out at ${record.checkOut} is already recorded for that day.`, "issue");
  if (date === today) return fail("You can still check out today from Mark attendance.", "date");
  if (t <= toMinutes(record.checkIn)) return fail(`The check-out time must be later than the check-in (${record.checkIn}).`, "time");
  return null;
}

// Writes an approved correction into the attendance record (creating one for a
// missed check-in) and notes it in the record's history.
function applyCorrection(request, byUserId) {
  const record = attendance.getAll().find((r) => r.userId === request.userId && r.date === request.date) ?? null;
  const problem = checkAgainstRecord(record, request.issue, request.time, todayIso(), request.date);
  if (problem) return fail(`This request no longer matches the attendance record: ${problem.error}`);
  const entry = { at: new Date().toISOString(), byUserId, action: "regularized", note: "", regularizationId: request.id };
  if (request.issue === "missed-check-in") {
    return attendance.add({
      userId: request.userId, date: request.date, checkIn: request.time, checkOut: null, mode: "office", source: "regularization",
      originalCheckIn: null, originalCheckOut: null, history: [entry],
    });
  }
  if (request.issue === "late-arrival") {
    return attendance.update(record.id, { checkIn: request.time, originalCheckIn: record.originalCheckIn ?? record.checkIn, history: [...record.history, entry] });
  }
  return attendance.update(record.id, { checkOut: request.time, history: [...record.history, entry] });
}

// fields: { date, issue, time, reason }. Success: { ok: true, record }.
// An Admin's own request is approved straight away, as with leave.
export function requestRegularization(userId, fields = {}) {
  const user = getUser(userId);
  if (!user) return fail(`No employee with id ${userId}.`);
  if (!isTracked(user)) return fail(`${user.name} is inactive and can't ask for corrections.`);

  const date = String(fields.date ?? "").trim();
  const issue = String(fields.issue ?? "").trim();
  const time = String(fields.time ?? "").trim();
  const reason = String(fields.reason ?? "").trim();

  if (!ISSUES.includes(issue)) return fail("Choose what went wrong.", "issue");
  if (!isValidDate(date)) return fail("Pick a valid date.", "date");
  const ctx = context();
  const age = dayNumber(ctx.today) - dayNumber(date);
  if (age < 0) return fail("You can't ask to correct a day that hasn't happened yet.", "date");
  if (age > ATTENDANCE_RULES.requestWindowDays) return fail(`Corrections must be asked for within ${ATTENDANCE_RULES.requestWindowDays} days of the date.`, "date");
  if (!isValidTime(time)) return fail("Enter the correct time as HH:MM.", "time");
  if (!reason) return fail("Reason is required.", "reason");

  const day = deriveDay(ctx, user, date);
  if (!day.checkIn && (day.status === "holiday" || day.status === "weekend")) return fail("No attendance is needed on that day.", "date");
  if (!day.checkIn && day.status === "on-leave") return fail("You were on approved leave that day.", "date");
  const record = ctx.records.find((r) => r.userId === user.id && r.date === date) ?? null;
  const problem = checkAgainstRecord(record, issue, time, ctx.today, date);
  if (problem) return problem;
  if (issue === "late-arrival" && day.minutesLate === 0) return fail("You weren't marked late that day.", "issue");
  if (ctx.requests.some((r) => r.userId === user.id && r.date === date && r.status === "pending")) {
    return fail("You already have a correction waiting for that date.", "date");
  }

  const managerId = managerFor(user.id);
  const stage = managerId ? "manager" : "hr";
  const now = new Date().toISOString();
  const history = [{ stage, byUserId: user.id, decision: "applied", at: now, note: "" }];
  const recordedTime = issue === "late-arrival" ? record.checkIn : null;
  const autoApprove = user.role === "admin";
  if (autoApprove) history.push({ stage, byUserId: user.id, decision: "auto-approved", at: now, note: "Auto-approved (Admin)" });

  const added = regularizations.add({
    userId: user.id, date, issue, time, recordedTime, reason,
    status: autoApprove ? "approved" : "pending", stage: autoApprove ? "done" : stage, managerId,
    appliedOn: ctx.today, history,
  });
  if (!added.ok || !autoApprove) return added;
  const applied = applyCorrection(added.record, user.id);
  if (applied.ok) return added;
  regularizations.remove(added.record.id);
  return applied;
}

// decision: "approve" | "reject". Only a role with attendance:approve (HR, Admin),
// never on your own request, only while pending. Rejecting needs a note.
// Approving writes the corrected time into the attendance record first; if the
// record has changed so the correction no longer fits, nothing is decided.
export function decideRegularization(requestId, deciderUserId, deciderRole, decision, note = "") {
  const request = regularizations.get(requestId);
  if (!request) return fail(`No correction request ${requestId}.`);
  if (!canDecide(deciderRole)) return fail("Only HR or an Admin can decide attendance corrections.");
  const decider = getUser(deciderUserId);
  if (!decider || decider.status === "inactive" || decider.role !== deciderRole) {
    return fail("Only HR or an Admin can decide attendance corrections.");
  }
  if (deciderUserId === request.userId) return fail("You can't decide your own correction request.");
  if (request.status !== "pending") return fail(`This request is already ${request.status}.`);
  if (decision !== "approve" && decision !== "reject") return fail('Decision must be "approve" or "reject".');
  const text = String(note ?? "").trim();
  if (decision === "reject" && !text) return fail("Add a note saying why the request is rejected.", "note");

  if (decision === "approve") {
    const applied = applyCorrection(request, deciderUserId);
    if (!applied.ok) return applied;
  }
  const outcome = decision === "approve" ? "approved" : "rejected";
  const entry = { stage: request.stage, byUserId: deciderUserId, decision: outcome, at: new Date().toISOString(), note: text };
  return regularizations.update(requestId, { status: outcome, stage: "done", history: [...request.history, entry] });
}

// Only the person who asked, only while it's pending.
export function cancelRegularization(requestId, userId) {
  const request = regularizations.get(requestId);
  if (!request) return fail(`No correction request ${requestId}.`);
  if (request.userId !== userId) return fail("Only the person who asked for this correction can cancel it.");
  if (request.status !== "pending") return fail(`This request is already ${request.status}, so it can't be cancelled.`);
  const entry = { stage: request.stage, byUserId: userId, decision: "cancelled", at: new Date().toISOString(), note: "" };
  return regularizations.update(requestId, { status: "cancelled", stage: "done", history: [...request.history, entry] });
}

// ---------- safety net ----------

// Throws away every attendance record and correction in this browser; the next
// read generates fresh sample data around that day.
export function resetAttendanceData() {
  attendance.reset();
  regularizations.reset();
}