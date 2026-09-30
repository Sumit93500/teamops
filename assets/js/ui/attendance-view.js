// ui/attendance-view.js
// Display helpers shared by the attendance pages (mark-attendance,
// my-attendance, team-attendance) and the dashboards: worked time as "8h 44m",
// the status badge for a day worked out by data/attendance-store.js, and the
// pieces team-attendance and the admin dashboard both show for a date (the
// Present card's line, the check-in and hours cells). Everything is built with
// DOM calls, never innerHTML.

import { ATTENDANCE_RULES } from "../data/attendance-store.js";
import { el, percent } from "./leave-view.js";

const pad = (n) => String(n).padStart(2, "0");

// 524 -> "8h 44m"
export const hoursText = (minutes) => `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;

// The latest on-time check-in for the day: 09:45, or 14:15 with first-half leave.
function checkInBy(day) {
  const [h, m] = (day.halfDayLeave === "first-half" ? ATTENDANCE_RULES.halfSplit : ATTENDANCE_RULES.shiftStart).split(":").map(Number);
  const minutes = h * 60 + m + ATTENDANCE_RULES.graceMinutes;
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

const BADGE = {
  present: ["badge badge--success badge--dot", "Present"],
  late: ["badge badge--warning badge--dot", "Late"],
  "half-day": ["badge badge--info badge--dot", "Half day"],
  absent: ["badge badge--danger badge--dot", "Absent"],
  "on-leave": ["badge badge--info badge--dot", "On leave"],
  holiday: ["badge badge--dot", "Holiday"],
  weekend: ["badge badge--dot", "Weekend"],
  "no-data": ["badge badge--dot", "No data"],
  "not-yet": ["badge badge--dot badge--not-yet", "Not in yet"],
};

// The badge for a day from dayFor(), monthFor() or teamFor(). Someone not in
// yet gets an outlined "Not in yet" until the grace time passes, then an
// outlined red "Overdue" (day.overdue), so neither reads as Absent.
export function dayBadge(day) {
  if (day.overdue) {
    const badge = el("span", "badge badge--dot badge--overdue", "Overdue");
    badge.title = `Not checked in by ${checkInBy(day)}`;
    return badge;
  }
  const [className, label] = BADGE[day.status] ?? ["badge badge--dot", day.status];
  return el("span", className, label);
}

// ---------- a date across the company (team-attendance, admin dashboard) ----------

// The line under the Present card: "50% of 8 expected", or why nobody is
// expected. summary is summaryFor()'s shape; days are that date's day objects
// for everyone counted (only read when nobody is expected).
export function presentNote(summary, days) {
  return summary.expected ? `${percent(summary.present, summary.expected)} of ${summary.expected} expected` : offNote(days);
}

// Why nobody is expected: a holiday, a weekend, a date before records began.
function offNote(days) {
  const holiday = days.find((d) => d.status === "holiday")?.holiday;
  if (holiday) return `Holiday: ${holiday.name}`;
  if (days.some((d) => d.status === "weekend")) return "Weekend";
  if (days.some((d) => d.status === "no-data")) return "No attendance records for this date";
  if (days.length && days.every((d) => d.status === "on-leave")) return "Everyone is on leave";
  return "No active employees";
}

// Check-in time, with (WFH) and the time before a correction: "09:12 WFH was 10:24".
export function checkInCell(day) {
  const td = el("td");
  if (!day.checkIn) {
    td.textContent = "–";
    return td;
  }
  td.append(el("span", "", day.checkIn));
  if (day.mode === "wfh") td.append(" ", el("span", "badge", "WFH"));
  if (day.originalCheckIn) td.append(el("span", "table__user-sub", `was ${day.originalCheckIn}`));
  return td;
}

// Hours worked, "so far" while the day is open, or "No check-out".
export function hoursCell(day) {
  const td = el("td", "table__num");
  if (day.minutesWorked === null) {
    td.textContent = day.incomplete ? "No check-out" : "–";
    return td;
  }
  td.append(el("span", "", hoursText(day.minutesWorked)));
  if (day.inProgress) td.append(el("span", "table__user-sub", "so far"));
  return td;
}