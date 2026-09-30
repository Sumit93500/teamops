// data/holidays.js
// The company holiday calendar, kept in localStorage through data/collection.js,
// plus the plain date helpers the leave module uses to count working days.
//
// Dates are always ISO strings ("2026-10-02"). All date maths is done in UTC
// on whole days, so a browser's time zone or daylight saving can never shift
// a date by one.

import { createCollection, fail } from "./collection.js";

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

export function addHoliday(fields = {}) {
  const date = String(fields.date ?? "").trim();
  const name = String(fields.name ?? "").trim();
  const kind = String(fields.kind ?? "").trim();
  if (!isValidDate(date)) return fail("Pick a valid date.", "date");
  const clash = holidays.getAll().find((h) => h.date === date);
  if (clash) return fail(`${clash.name} is already on that date.`, "date");
  if (!name) return fail("Holiday name is required.", "name");
  if (!HOLIDAY_KINDS.includes(kind)) return fail("Kind must be national, company or optional.", "kind");
  return holidays.add({ date, name, kind });
}

export function removeHoliday(id) {
  return holidays.remove(id);
}

// Back to the 7 seeded dates. Called by resetLeaveData() in data/leave-store.js.
export function resetHolidays() {
  holidays.reset();
}