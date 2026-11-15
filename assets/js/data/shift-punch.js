// data/shift-punch.js (SH1, 2026-11-15): checking in and out by the person's shift, in office time (India). Additive: the
// old checkIn / checkOut (data/attendance-store.js) and checkInAt / checkOutAt (data/locations-store.js) are unchanged;
// the React Mark attendance uses this path from the shift rules start date (data/shift-settings.js), the old one before.
//
// Which day a punch belongs to (now = the office's date T and minute t):
//   check-in   yesterday's night shift, while it hasn't started and it is before its end (a late arrival after
//              midnight, stored on yesterday's record as "00:40"); else today's shift, from its window's opening
//              (start - earliestCheckInMin: "Your shift starts at 22:00, check-in opens at 21:30.") to its end (the
//              half-day split with second-half leave). A night shift's window runs on past midnight.
//   check-out  today's open record; else yesterday's night shift, until 4 h after its end. A night shift's check-out
//              next morning completes the day it started on.
// Every other check is the old path's, in its words: an inactive person, before the joining date, a holiday, leave,
// and the shift's weekly off ("Today is your weekly off, so no attendance is needed.").
//
//   shiftCheckInRefusal(userId, mode, now?)   shiftCheckIn(userId, mode, stamp, now?)
//   shiftCheckOutRefusal(userId, now?)        shiftCheckOut(userId, stamp, now?)
//   shiftCheckInAt / shiftCheckOutAt          the same after the place and device checks (as checkInAt / checkOutAt)
//   punchState(userId, now?)                  what Mark attendance shows: the shift, the day, the next action, the window
//   nextCheckIn(userId, now?)                 the next check-in window: { date, shift, opens, closes, openNow }
//   completeShiftDay(actorUserId, userId, date, time, note, now?)   HR / Admin add a missing check-out

import { storedRecord, writeShiftCheckIn, writeShiftCheckOut, writeCompletedDay, MODES } from "./attendance-store.js";
import { getUser, joiningDate } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { placeAndDeviceCheck, punchStamp } from "./locations-store.js";
import { deviceToken } from "./devices-store.js";
import { officeNow, addDays, toMin, hhmm, shiftShape, DAY } from "./shift-engine.js";
import { shiftRulesApply } from "./shift-settings.js";
import { shiftDayFor } from "./shift-days.js";

const fail = (error, code) => ({ ok: false, error, ...(code ? { code } : {}) });
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";
const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const weekdayName = (iso) => WEEKDAY[new Date(`${iso}T00:00:00Z`).getUTCDay()];
const OPEN_AFTER_END = 240;   // a night shift's check-out stays open 4 h after its end

function userCheck(userId) {
  const user = getUser(userId);
  if (!user) return { refusal: fail(`No employee with id ${userId}.`) };
  if (user.status === "inactive") return { refusal: fail(`${user.name} is inactive and can't check in.`) };
  return { user };
}
// Yesterday's night shift still open for a check-out, or not yet started and still before its end.
function yesterdayNight(user, now) {
  const y = addDays(now.date, -1);
  if (!shiftRulesApply(y)) return null;
  const day = shiftDayFor(user.id, y, now);
  if (!day || !day.crossesMidnight || day.rules !== "shift") return null;
  const shape = shiftShape({ start: day.shiftStart, end: day.shiftEnd });
  const rel = now.minutes + DAY;
  return { date: y, day, shape, rel };
}

function inPlan(userId, mode, now) {
  const u = userCheck(userId);
  if (u.refusal) return u.refusal;
  const { user } = u;
  const yn = yesterdayNight(user, now);
  if (yn && yn.day.checkIn && !yn.day.checkOut && yn.rel < yn.shape.end + OPEN_AFTER_END) return fail(`You're checked in for ${weekdayName(yn.date)}'s ${yn.day.shiftName} shift: check out first.`, "open-shift");
  if (yn && !yn.day.checkIn && yn.day.expected && yn.rel < yn.shape.end) {
    const chosen = mode ?? yn.day.suggestedMode;
    if (!MODES.includes(chosen)) return fail("Choose Office or Work from home.", "mode");
    return { ok: true, user, date: yn.date, time: hhmm(now.minutes), mode: chosen, day: yn.day };
  }
  const day = shiftDayFor(user.id, now.date, now);
  const chosen = mode ?? day.suggestedMode;
  if (!MODES.includes(chosen)) return fail("Choose Office or Work from home.", "mode");
  if (day.checkIn) return fail(`You already checked in today at ${day.checkIn}.`, "done");
  const joined = joiningDate(user.dateOfJoining);
  if (joined && now.date < joined) return fail(`You can't check in before your joining date (${joined}).`, "not-joined");
  if (day.status === "holiday") return fail("Today is a holiday, so no attendance is needed.", "off");
  if (day.status === "weekly-off") return fail("Today is your weekly off, so no attendance is needed.", "off");
  if (day.status === "on-leave") return fail("You're on approved leave today, so check-in is closed.", "leave");
  const opens = day.window.opens, closes = day.window.closes;
  if (now.minutes < opens) return fail(`Your shift starts at ${day.shiftStart}, check-in opens at ${hhmm(opens)}.`, "too-early");
  if (now.minutes >= closes) return fail(`Check-in closed at ${hhmm(closes)}.`, "closed");
  return { ok: true, user, date: now.date, time: hhmm(now.minutes), mode: chosen, day };
}
function outPlan(userId, now) {
  const u = userCheck(userId);
  if (u.refusal) return { ...u.refusal, error: u.refusal.error.replace("check in", "check out") };
  const { user } = u;
  const today = storedRecord(user.id, now.date);
  if (today?.checkIn && !today.checkOut) {
    const day = shiftDayFor(user.id, now.date, now);
    if (!day.crossesMidnight && now.minutes < toMin(today.checkIn)) return fail("Check-out can't be earlier than your check-in.");
    return { ok: true, user, date: now.date, time: hhmm(now.minutes), day };
  }
  const yn = yesterdayNight(user, now);
  const yRec = yn ? storedRecord(user.id, yn.date) : null;
  if (yn && yRec?.checkIn && !yRec.checkOut && yn.rel < yn.shape.end + OPEN_AFTER_END) return { ok: true, user, date: yn.date, time: hhmm(now.minutes), day: yn.day };
  if (today?.checkOut) return fail(`You already checked out today at ${today.checkOut}.`, "done");
  return fail("Check in first.", "not-in");
}

export function shiftCheckInRefusal(userId, mode, now = officeNow()) {
  const p = inPlan(userId, mode, now);
  return p.ok ? null : p;
}
export function shiftCheckIn(userId, mode, stamp, now = officeNow()) {
  const p = inPlan(userId, mode, now);
  if (!p.ok) return p;
  const res = writeShiftCheckIn(p.user.id, p.date, p.time, p.mode, stamp);
  return res.ok ? { ...res, date: p.date, day: shiftDayFor(p.user.id, p.date, now) } : res;
}
export function shiftCheckOutRefusal(userId, now = officeNow()) {
  const p = outPlan(userId, now);
  return p.ok ? null : p;
}
export function shiftCheckOut(userId, stamp, now = officeNow()) {
  const p = outPlan(userId, now);
  if (!p.ok) return p;
  const res = writeShiftCheckOut(p.user.id, p.date, p.time, stamp);
  return res.ok ? { ...res, date: p.date, day: shiftDayFor(p.user.id, p.date, now) } : res;
}
// With the place and device (data/locations-store.js's checks first; nothing is written when they refuse).
export function shiftCheckInAt(userId, mode, reading, token = deviceToken(), placeId, now = officeNow()) {
  const w = placeAndDeviceCheck(userId, reading, token, placeId);
  if (w.refusal) return w.refusal;
  const refused = shiftCheckInRefusal(userId, mode, now);
  if (refused) return refused;
  const stamp = punchStamp(userId, w.place, token);
  if (!stamp) return { ...fail(SAVE_FAILED), code: "storage" };
  return shiftCheckIn(userId, mode, stamp, now);
}
export function shiftCheckOutAt(userId, reading, token = deviceToken(), placeId, now = officeNow()) {
  const w = placeAndDeviceCheck(userId, reading, token, placeId);
  if (w.refusal) return w.refusal;
  const refused = shiftCheckOutRefusal(userId, now);
  if (refused) return refused;
  const stamp = punchStamp(userId, w.place, token);
  if (!stamp) return { ...fail(SAVE_FAILED), code: "storage" };
  return shiftCheckOut(userId, stamp, now);
}

// The next check-in window from now: today's (or yesterday's night shift) while it is open or still to come, else the
// next day the person is expected (not a weekly off, holiday or full leave), up to 31 days ahead. null when none.
// -> { date, shiftId, shiftName, start, end, crossesMidnight, opens "HH:MM", closes "HH:MM", openNow }
export function nextCheckIn(userId, now = officeNow()) {
  const user = getUser(userId);
  if (!user || user.status === "inactive") return null;
  const shape = (d) => ({ date: d.date, shiftId: d.shiftId, shiftName: d.shiftName, start: d.shiftStart, end: d.shiftEnd, crossesMidnight: d.crossesMidnight });
  const yn = yesterdayNight(user, now);
  if (yn && !yn.day.checkIn && yn.day.expected && yn.rel < yn.shape.end) return { ...shape(yn.day), opens: hhmm(yn.shape.opens), closes: hhmm(yn.shape.end), openNow: true };
  for (let k = 0; k <= 31; k++) {
    const date = addDays(now.date, k);
    const day = shiftDayFor(user.id, date, now);
    if (!day || day.checkIn || !day.expected || day.status !== "not-yet") continue;
    const w = day.window ?? { opens: toMin(day.shiftStart) - 60, closes: toMin(day.shiftEnd) };
    if (k === 0 && now.minutes >= w.closes) continue;
    return { ...shape(day), opens: hhmm(w.opens), closes: hhmm(w.closes), openNow: k === 0 && now.minutes >= w.opens };
  }
  return null;
}

// What Mark attendance needs: the shift day a punch now concerns, the action it allows, and the refusal in words.
// -> { shift: { id, name, start, end, crossesMidnight }, date, day, action: "check-in" | "check-out" | "done" | "closed", message, next }
export function punchState(userId, now = officeNow()) {
  const user = getUser(userId);
  if (!user) return null;
  const outRefused = shiftCheckOutRefusal(userId, now);
  const inRefused = shiftCheckInRefusal(userId, undefined, now);
  const out = outRefused ? null : outPlan(userId, now);
  const inn = inRefused ? null : inPlan(userId, undefined, now);
  const day = out?.day ?? inn?.day ?? shiftDayFor(userId, now.date, now);
  const shift = { id: day.shiftId, name: day.shiftName, start: day.shiftStart, end: day.shiftEnd, crossesMidnight: day.crossesMidnight };
  const action = out ? "check-out" : inn ? "check-in" : inRefused?.code === "done" || outRefused?.code === "done" ? "done" : "closed";
  return { shift, date: day.date, day, action, message: action === "closed" ? inRefused?.error ?? "" : "", next: nextCheckIn(userId, now) };
}

// HR or an Admin completes a day left without a check-out (an "incomplete" day under the shift rules): the check-out
// time ("07:05" is the next morning on a night shift) and a reason. Not their own day; the record keeps the history.
export function completeShiftDay(actorUserId, userId, date, time, note, now = officeNow()) {
  const actor = getUser(actorUserId);
  if (!actor || actor.status === "inactive" || !hasPermission(actor, "attendance:approve") || !hasPermission(actor, "attendance:view-all")) return fail("Only HR or an Admin can complete a day.");
  if (actor.id === userId) return fail("You can't complete your own day: ask HR.");
  const day = shiftDayFor(userId, date, now);
  if (!day || day.rules !== "shift") return fail("Only a day under the shift rules can be completed here.");
  if (!day.incomplete) return fail("That day isn't missing a check-out.");
  if (toMin(time) === null) return { ...fail("Enter the check-out as HH:MM."), field: "time" };
  if (!day.crossesMidnight && toMin(time) <= toMin(day.checkIn)) return { ...fail(`The check-out must be after the check-in (${day.checkIn}).`), field: "time" };
  const why = String(note ?? "").trim();
  if (why.length < 3 || why.length > 200) return { ...fail("Give a reason of 3 to 200 characters."), field: "note" };
  const res = writeCompletedDay(actor.id, userId, date, time, why);
  return res.ok ? { ...res, day: shiftDayFor(userId, date, now) } : res;
}