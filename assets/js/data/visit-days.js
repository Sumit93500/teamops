// data/visit-days.js (CV1, 2026-11-16): how a day with an approved visit reads. Pure apart from its read of data/visits-store.js; the one
// caller is data/shift-days.js, which hands over the day it worked out under the shift and gets back the visit's reading of it.
//
// A day the person has no visit on is returned as it is (the same object), so every existing month reads byte for byte as before.
// A visit day:
//   a valid check-in (location accepted, or the approver's OK for "location unavailable")
//     checked out           status "on-site", or "half-day" when the hours are under the shift's half-day threshold
//     still open            status "on-site", inProgress today; after the day, incomplete (HR sees it)
//   no valid check-in       status "visit-planned" ("Visit not started"): flagged, never absent; after the day it is incomplete
// A FULL day whatever the hours (CV1b: the hours are shown, never a reason for a half day). Never late (the office shift's start doesn't apply),
// never absent, never overtime. A check-in with no check-out is flagged Incomplete after the day (not absent, no loss of pay) until HR or an
// Admin completes the day (data/visits.js completeVisitDay: a check-out time, or the day marked full or half, with a reason); only a day
// HR marked half is a half day, and costs what any half day costs (data/shift-engine.js dayLossOfPay).
// oldDayWithVisit(day, today, now): the same reading for the current (pre-shift) rules, where data/attendance-store.js deriveDay hands every
// day to it: a day with an approved visit and a valid check-in reads present (half-day when HR marked it half); every other day is returned
// as it was (the same object), so every existing month is byte for byte what it was.
// Added fields: onSite true, visit { id, kind, siteName, address, purpose, status, sameDay, approvalPending, lowAccuracy,
// awaitingOk, source }.
//
//   overlayVisit(day, rules, now)   oldDayWithVisit(day, today, nowMinutes)   VISIT_STATUSES

import { visitOnDate } from "./visits-store.js";
import { toMin, dayNo, DAY } from "./shift-engine.js";

export const VISIT_STATUSES = ["on-site", "visit-planned"];

const valid = (p) => Boolean(p) && (!p.needsOk || Boolean(p.okBy));

export function overlayVisit(day, rules, now) {
  if (!day || day.status === "left" || day.status === "not-joined") return day;
  const v = visitOnDate(day.userId, day.date);
  if (!v) return day;
  const { in: pin, out: pout } = v.day;
  const ended = now.date > day.date;
  const nowMin = (dayNo(now.date) - dayNo(day.date)) * DAY + now.minutes;
  const info = { id: v.id, kind: v.kind, siteName: v.siteName, address: v.address, purpose: v.purpose, status: v.status, sameDay: v.sameDay, approvalPending: v.approvalPending, source: v.source,
    lowAccuracy: Boolean((pin && pin.lowAccuracy) || (pout && pout.lowAccuracy)), awaitingOk: Boolean((pin && !valid(pin)) || (pout && !valid(pout))) };
  const dec = v.day.decision ?? null;
  const base = { ...day, onSite: true, visit: { ...info, decision: dec ? { outcome: dec.outcome, by: dec.by, reason: dec.reason } : null }, minutesLate: 0, overtimeMinutes: 0, overdue: false, regularization: day.regularization };
  if (!valid(pin)) {
    return { ...base, status: "visit-planned", expected: true, checkIn: null, checkOut: null, minutesWorked: null, hours: null, inProgress: false, incomplete: ended };
  }
  const inAt = toMin(pin.time);
  if (valid(pout)) {
    const worked = Math.max(0, toMin(pout.time) - inAt);
    return { ...base, status: dec?.outcome === "half" ? "half-day" : "on-site", expected: true, checkIn: pin.time, checkOut: pout.time, minutesWorked: worked, hours: Math.round(worked / 6) / 10, inProgress: false, incomplete: false };
  }
  const today = day.date === now.date;
  const worked = today ? Math.max(0, nowMin - inAt) : null;
  return { ...base, status: dec?.outcome === "half" ? "half-day" : "on-site", expected: true, checkIn: pin.time, checkOut: null, minutesWorked: worked, hours: worked === null ? null : Math.round(worked / 6) / 10, inProgress: today, incomplete: ended && !dec };
}

// The current rules' day (data/attendance-store.js deriveDay): present, or half-day when HR marked it half; the same object when there is no visit
// check-in to read. today: the date deriveDay calls today; nowMinutes: its clock.
export function oldDayWithVisit(day, today, nowMinutes) {
  if (day.status === "left" || day.status === "not-joined") return day;
  const v = visitOnDate(day.userId, day.date);
  if (!v) return day;
  const { in: pin, out: pout } = v.day;
  if (!valid(pin)) return day;
  const dec = v.day.decision ?? null;
  const inAt = toMin(pin.time), closed = valid(pout);
  const open = !closed && day.date === today;
  const worked = closed ? Math.max(0, toMin(pout.time) - inAt) : open ? Math.max(0, nowMinutes - inAt) : null;
  const info = { id: v.id, kind: v.kind, siteName: v.siteName, address: v.address, purpose: v.purpose, status: v.status, sameDay: v.sameDay, approvalPending: v.approvalPending, source: v.source,
    lowAccuracy: Boolean(pin.lowAccuracy || (pout && pout.lowAccuracy)), awaitingOk: false, decision: dec ? { outcome: dec.outcome, by: dec.by, reason: dec.reason } : null };
  return { ...day, status: dec?.outcome === "half" ? "half-day" : "present", expected: true, checkIn: pin.time, checkOut: closed ? pout.time : null, mode: "office", minutesLate: 0, minutesWorked: worked,
    hours: worked === null ? null : Math.round(worked / 6) / 10, inProgress: open, overdue: false, incomplete: !closed && day.date < today && !dec, conflict: false, onSite: true, visit: info };
}