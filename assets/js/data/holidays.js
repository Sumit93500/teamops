// data/holidays.js
// The company holiday calendar, kept in localStorage through data/collection.js,
// plus the plain date helpers the leave module uses to count working days.
//
// Dates are always ISO strings ("2026-10-02"). All date maths is done in UTC
// on whole days, so a browser's time zone or daylight saving can never shift
// a date by one.

import { createCollection, fail } from "./collection.js";
import { load } from "../core/storage.js";
import { getUser } from "./store.js";
import { permissionsOf } from "../config/roles.js";

export const HOLIDAY_KINDS = ["national", "company", "optional"];

// The 7 dates holidays.html shows today.
const SEED = [
  { date: "2026-01-26", name: "Republic Day",     kind: "national" },
  { date: "2026-03-04", name: "Holi",             kind: "company" },
  { date: "2026-08-15", name: "Independence Day", kind: "national" },
  { date: "2026-10-02", name: "Gandhi Jayanti",   kind: "national" },
  { date: "2026-10-20", name: "Dussehra",         kind: "company" },
  { date: "2026-11-08", name: "Diwali",           kind: "company" },
  { date: "2026-12-25", name: "Christmas",        kind: "optional" },
];

const holidays = createCollection({ key: "holidays", version: 1, seed: () => SEED, idPrefix: "HOL-" });

// ---------- date helpers (UTC, whole days) ----------

const DAY_MS = 24 * 60 * 60 * 1000;

// Days since 1 Jan 1970 for a real calendar date, or null ("2026-02-30" is null).
export function dayNumber(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ""));
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(ms).toISOString().slice(0, 10) === iso ? ms / DAY_MS : null;
}

export const isValidDate = (iso) => dayNumber(iso) !== null;

export function isoFromDayNumber(n) {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

// The date n days later (n < 0: earlier), e.g. addDays("2026-09-30", 1) -> "2026-10-01".
export const addDays = (iso, n) => isoFromDayNumber(dayNumber(iso) + n);

export function isWeekend(iso) {
  const n = dayNumber(iso);
  if (n === null) return false;
  const weekday = new Date(n * DAY_MS).getUTCDay();   // 0 Sunday .. 6 Saturday
  return weekday === 0 || weekday === 6;
}

// ---------- reads ----------

const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

// Today on the local calendar: the day attendance and leave call today (the one
// date here that isn't UTC maths).
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getAllHolidays() {
  return holidays.getAll().sort(byDate);
}

export function holidaysIn(year) {
  return getAllHolidays().filter((h) => h.date.startsWith(`${year}-`));
}

// A weekend, or a national or company holiday. Optional holidays are not days
// off for everyone, so they don't count. Anything that isn't a real date is false.
export function isDayOff(iso) {
  return dayOffChecker()(iso);
}

// The same rule as isDayOff(), but the holiday list is read once, so counting
// the days in a long date range doesn't re-read storage for every day.
export function dayOffChecker() {
  const closed = new Set(holidays.getAll().filter((h) => h.kind !== "optional").map((h) => h.date));
  return (iso) => isValidDate(iso) && (isWeekend(iso) || closed.has(iso));
}

// ---------- writes ----------

// The acting person, if they are active and hold holidays:manage on record
// (their role's permissions with their overrides, round 11R); else null. Their stored record decides, not the session
// (inventory-store.js's actorWith()): holidays move attendance, leave and pay
// (round 10W). store.js imports this file too (isValidDate); neither uses the
// other while loading, so that's safe.
function holidayManager(userId) {
  const user = userId ? getUser(userId) : null;
  return user && user.status !== "inactive" && permissionsOf(user).includes("holidays:manage") ? user : null;
}

// A month whose payroll run is approved has a closed calendar (round 11V,
// round-11u-notes.md U3 / U-D3): a holiday of any kind dated in it is refused.
// Adding one would change that month's working days, and so the loss of pay
// of anyone with some, after their pay was approved (removing a past holiday
// is refused already, below). The runs are read from storage, as
// payroll-store.js saves them: that file imports this one.
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function payrollApproved(date) {
  const box = load("payroll-runs");
  const runs = box && box.version === 1 && Number.isInteger(box.nextNum) && Array.isArray(box.records) ? box.records : [];
  return runs.some((r) => r.status === "approved" && r.month === date.slice(0, 7));
}

export function addHoliday(actorUserId, fields = {}) {
  if (!holidayManager(actorUserId)) return fail("You can't add holidays.");
  const date = String(fields.date ?? "").trim();
  const name = String(fields.name ?? "").trim();
  const kind = String(fields.kind ?? "").trim();
  if (!isValidDate(date)) return fail("Pick a valid date.", "date");
  if (payrollApproved(date)) {
    return fail(`${MONTH_NAMES[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}'s payroll is approved, so a holiday can't be added to it.`, "date");
  }
  const clash = holidays.getAll().find((h) => h.date === date);
  if (clash) return fail(`${clash.name} is already on that date.`, "date");
  if (!name) return fail("Holiday name is required.", "name");
  if (!HOLIDAY_KINDS.includes(kind)) return fail("Kind must be national, company or optional.", "kind");
  return holidays.add({ date, name, kind });
}

// A holiday already past can't be removed: its day would become an absence for
// everyone who didn't punch in, perhaps after the time to ask for a correction
// has gone (round 10O). Today's and later ones can; adding a past one is fine,
// unless its month's payroll is approved (addHoliday, round 11V).
export function removeHoliday(actorUserId, id) {
  if (!holidayManager(actorUserId)) return fail("You can't remove holidays.");
  const holiday = holidays.get(id);
  if (holiday && holiday.date < todayIso()) return fail(`Can't remove a past holiday (${holiday.date}).`);
  return holidays.remove(id);
}

// Back to the 7 seeded dates. Called by resetLeaveData() in data/leave-store.js.
export function resetHolidays() {
  holidays.reset();
}