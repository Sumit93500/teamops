// data/visit-days.js (CV1, 2026-11-16): how a day with an approved visit reads. Pure apart from its read of data/visits-store.js; the one
// caller is data/shift-days.js, which hands over the day it worked out under the shift and gets back the visit's reading of it.
//
// A day the person has no visit on is returned as it is (the same object), so every existing month reads byte for byte as before.
// A visit day:
//   a valid check-in (location accepted, or the approver's OK for "location unavailable")
//     checked out           status "on-site", or "half-day" when the hours are under the shift's half-day threshold
//     still open            status "on-site", inProgress today; after the day, incomplete (HR sees it)
//   no valid check-in       status "visit-planned" ("Visit not started"): flagged, never absent; after the day it is incomplete
// Never late (the office shift's start doesn't apply, the visit's own check-in only gives the hours), never absent, never overtime.
// A day under the half-day threshold is a half day and costs what any half day does (data/shift-engine.js dayLossOfPay).
// Added fields: onSite true, visit { id, kind, siteName, address, purpose, status, sameDay, approvalPending, lowAccuracy,
// awaitingOk, source }.
//
//   overlayVisit(day, rules, now)   VISIT_STATUSES

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
  const base = { ...day, onSite: true, visit: info, minutesLate: 0, overtimeMinutes: 0, overdue: false, regularization: day.regularization };
  if (!valid(pin)) {
    return { ...base, status: "visit-planned", expected: true, checkIn: null, checkOut: null, minutesWorked: null, hours: null, inProgress: false, incomplete: ended };
  }
  const inAt = toMin(pin.time);
  if (valid(pout)) {
    const worked = Math.max(0, toMin(pout.time) - inAt);
    const half = worked < Math.round((rules.halfDayBelowHours ?? 4) * 60);
    return { ...base, status: half ? "half-day" : "on-site", expected: true, checkIn: pin.time, checkOut: pout.time, minutesWorked: worked, hours: Math.round(worked / 6) / 10, inProgress: false, incomplete: false };
  }
  const today = day.date === now.date;
  const worked = today ? Math.max(0, nowMin - inAt) : null;
  return { ...base, status: "on-site", expected: true, checkIn: pin.time, checkOut: null, minutesWorked: worked, hours: worked === null ? null : Math.round(worked / 6) / 10, inProgress: today, incomplete: ended };
}