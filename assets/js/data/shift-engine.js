// data/shift-engine.js (SH1, 2026-11-15): how one day reads under a shift. Pure: no storage, no clock, no machine time
// zone. Everything it needs is passed in, so a day reads the same on any machine (tests run it in India, UTC and Los
// Angeles).
//
// Shift times are wall-clock "HH:MM" in the office's time zone. Every office is in India (offices-store's states), so the
// office clock is India Standard Time, UTC+05:30 all year (no daylight saving): officeNow() reads it from an instant.
//
// A shift's rules (data/shifts-store.js keeps them):
//   start, end "HH:MM"           end before start = the shift crosses midnight (a night shift)
//   graceMin                     late = checking in more than this many minutes after the start
//   breakMin                     an unpaid break, taken off the time worked on a full day
//   absentBelowHours             worked under this = absent (less than half the shift)
//   halfDayBelowHours            worked under this = half day
//   shortLeaveBelowHours         worked under this = short leave (a small shortfall); equal to halfDayBelowHours = no band
//   earliestCheckInMin           check-in opens this many minutes before the start
//   overtimeAfterMin             overtime starts this many minutes after the end ...
//   overtimeMinBlockMin          ... and counts in whole blocks of this many minutes
//   weeklyOffDays                0 (Sunday) to 6 (Saturday)
//
// A NIGHT SHIFT is one day, the date it STARTS on: checking in at 22:00 on Monday and out at 07:00 on Tuesday is Monday.
// The record is Monday's, its check-out "07:00" read as the next morning. A late check-in after midnight ("00:40") is
// read as the next morning too, when it comes before the shift's check-in window on the start date.
//
// classifyDay() follows data/attendance-store.js deriveDay() step for step, so the General shift (09:30-18:30, 15 min
// grace, no break, half day under 8 h, absent under 4 h, Saturday and Sunday off) reads every day exactly as the old rules
// do (tests/live/shifts.mjs compares every seeded day). What the shift adds: short leave, weekly off by the shift, overtime
// minutes, the night shift, and "now" in office time.

export const DAY = 1440;
export const OFFICE_TZ = "Asia/Kolkata";
export const OFFICE_OFFSET_MIN = 330;   // India Standard Time, UTC+05:30, no daylight saving

const pad = (n) => String(n).padStart(2, "0");

// "09:45" -> 585; anything that isn't a real 24-hour "HH:MM" -> null.
export function toMin(hhmm) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm ?? ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
// 585 -> "09:45" (wraps past midnight: 1470 -> "00:30").
export const hhmm = (n) => `${pad(Math.floor((((n % DAY) + DAY) % DAY) / 60))}:${pad((((n % DAY) + DAY) % DAY) % 60)}`;

// Whole days, in UTC, so a machine's zone never moves a date.
export function dayNo(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== iso) return null;
  return Math.round(t / 86400000);
}
export const isoOf = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
export const addDays = (iso, k) => isoOf(dayNo(iso) + k);
export const weekdayOf = (iso) => new Date(dayNo(iso) * 86400000).getUTCDay();   // 0 Sunday .. 6 Saturday

// The office's date and minute at an instant (ms since 1970; now by default): { date "YYYY-MM-DD", minutes 0-1439 }.
export function officeNow(ms = Date.now()) {
  const d = new Date(ms + OFFICE_OFFSET_MIN * 60000);
  return { date: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
// The instant a wall-clock office date and time happened (the inverse of officeNow), as an ISO timestamp.
export function officeInstant(date, minutes) {
  return new Date((dayNo(date) * DAY + minutes - OFFICE_OFFSET_MIN) * 60000).toISOString();
}

// ---------- a shift's own numbers ----------

// The shift's length in minutes (a night shift's runs past midnight), and whether it crosses midnight.
export function shiftShape(rules) {
  const start = toMin(rules.start), end = toMin(rules.end);
  const crossesMidnight = end < start;
  const length = crossesMidnight ? end + DAY - start : end - start;
  return {
    start,
    end: crossesMidnight ? end + DAY : end,   // minutes from the start date's midnight
    crossesMidnight,
    length,
    net: length - (rules.breakMin ?? 0),
    split: start + Math.floor(length / 2),     // where a half-day leave splits it (General: 14:00)
    opens: start - (rules.earliestCheckInMin ?? 0),
  };
}

// The minutes after a time on the start date: a night shift's early-morning time belongs to the next morning.
//   check-in: before the window opens on the start date -> the next morning
//   check-out: never before the check-in -> the next morning while it would be
function inMinute(shape, t) {
  return shape.crossesMidnight && t < shape.opens ? t + DAY : t;
}
function outMinute(shape, t, inAt) {
  if (!shape.crossesMidnight) return t;
  let o = t;
  while (o < inAt) o += DAY;
  return o;
}

// Overtime: the minutes after end + overtimeAfterMin, in whole blocks (0 when not past it).
export function overtimeOf(rules, outAt, end) {
  const past = outAt - (end + (rules.overtimeAfterMin ?? 0));
  const block = rules.overtimeMinBlockMin || 1;
  return past > 0 ? Math.floor(past / block) * block : 0;
}

// The status a worked span gives (a day checked in and out). With a half-day leave only half the shift is expected:
// under half of halfDayBelowHours is absent, else present / late (the old rules' "under 4 h" with half-day leave).
export function workedStatus(rules, worked, late, halfLeave) {
  const h = (x) => Math.round(x * 60);
  if (halfLeave) return worked < h(rules.halfDayBelowHours) / 2 ? "absent" : late ? "late" : "present";
  if (worked < h(rules.absentBelowHours)) return "absent";
  if (worked < h(rules.halfDayBelowHours)) return "half-day";
  if (worked < h(rules.shortLeaveBelowHours)) return "short-leave";
  return late ? "late" : "present";
}

// ---------- one day ----------

// input:
//   date            the shift's date (the day it starts on)
//   rules           the shift's rules on that date
//   checkIn, checkOut   "HH:MM" from the record (null when none)
//   holiday         a closed holiday (not an optional one) on that date
//   leaveFull       a full day of approved leave (not work from home)
//   halfDayLeave    "first-half" | "second-half" | null
//   noData          the date is before attendance was recorded at all
//   now             { date, minutes } in office time (officeNow())
// -> { status, expected, minutesLate, minutesWorked, hours, overtimeMinutes, inProgress, overdue, incomplete,
//      crossesMidnight, window: { opens, closes } (minutes from the date's midnight) }
// status: present, late, half-day, short-leave, absent, on-leave, holiday, weekly-off, not-yet, no-data
export function classifyDay({ date, rules, checkIn = null, checkOut = null, holiday = false, leaveFull = false, halfDayLeave = null, noData = false, now }) {
  const shape = shiftShape(rules);
  let start = shape.start, end = shape.end;
  if (halfDayLeave === "first-half") start = shape.split;
  if (halfDayLeave === "second-half") end = shape.split;
  const nowRel = (dayNo(now.date) - dayNo(date)) * DAY + now.minutes;   // now, in minutes from the date's midnight
  const out = {
    status: null, expected: false, minutesLate: 0, minutesWorked: null, hours: null, overtimeMinutes: 0,
    inProgress: false, overdue: false, incomplete: false, crossesMidnight: shape.crossesMidnight,
    window: { opens: shape.opens, closes: end },
  };
  if (checkIn !== null && toMin(checkIn) !== null) {
    // a check-in always counts, even on a day that later became a holiday, an off day or leave (the old rule)
    const inAt = inMinute(shape, toMin(checkIn));
    const late = inAt > start + rules.graceMin;
    out.expected = true;
    out.minutesLate = late ? inAt - start : 0;
    if (checkOut !== null && toMin(checkOut) !== null) {
      const outAt = outMinute(shape, toMin(checkOut), inAt);
      const span = Math.max(0, outAt - inAt);
      out.minutesWorked = halfDayLeave ? span : Math.max(0, span - (rules.breakMin ?? 0));
      out.status = workedStatus(rules, out.minutesWorked, late, halfDayLeave);
      if (!halfDayLeave && (out.status === "present" || out.status === "late")) out.overtimeMinutes = overtimeOf(rules, outAt, shape.end);
    } else {
      // still open: the rest of the start date, or a night shift's until 4 h after its end; after that, incomplete
      const open = shape.crossesMidnight ? shape.end + 240 : DAY;
      if (nowRel >= 0 && nowRel < open) {
        out.inProgress = true;
        out.minutesWorked = Math.max(0, nowRel - inAt);
      } else if (nowRel >= open) out.incomplete = true;
      out.status = late ? "late" : "present";
    }
  } else if (holiday) out.status = "holiday";
  else if ((rules.weeklyOffDays ?? []).includes(weekdayOf(date))) out.status = "weekly-off";
  else if (leaveFull) out.status = "on-leave";
  else if (noData) out.status = "no-data";
  else {
    out.expected = true;
    const stillOpen = nowRel < end;
    out.status = stillOpen ? "not-yet" : "absent";
    out.overdue = stillOpen && nowRel >= 0 && nowRel > start + rules.graceMin;
  }
  if (out.minutesWorked !== null) out.hours = Math.round(out.minutesWorked / 6) / 10;
  return out;
}

// The loss of pay a day's status costs (days), before the settling rule (data/shift-days.js): absent 1 (half with a
// half-day leave: that half is leave), half day 0.5, short leave 0.25 (SH1's choice: a quarter day), anything else 0.
export const SHORT_LEAVE_DAYS = 0.25;
export function dayLossOfPay(status, halfDayLeave) {
  if (status === "absent") return halfDayLeave ? 0.5 : 1;
  if (status === "half-day") return 0.5;
  if (status === "short-leave") return SHORT_LEAVE_DAYS;
  return 0;
}

// The check-in window of a shift on a date, in office minutes from the date's midnight: from start - earliest to the
// day's own end (the end, or the half-day split with second-half leave; a night shift's end is the next morning).
export function checkInWindowOf(rules, halfDayLeave = null) {
  const shape = shiftShape(rules);
  return { opens: shape.opens, closes: halfDayLeave === "second-half" ? shape.split : shape.end };
}