// ui/attendance-view.js
// Display helpers shared by the attendance pages (mark-attendance,
// my-attendance, team-attendance): worked time as "8h 44m" and the status
// badge for a day worked out by data/attendance-store.js. Everything is built
// with DOM calls, never innerHTML.

import { ATTENDANCE_RULES } from "../data/attendance-store.js";
import { el } from "./leave-view.js";

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