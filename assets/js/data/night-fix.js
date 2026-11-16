// data/night-fix.js (CV1, 2026-11-16): "Request fix" for a night shift's missed check-out. Additive: data/attendance-store.js asks it, for a
// missed check-out only, and uses its answer when the date is a night shift's start date under the shift rules; for every other day it
// answers null and the old rule judges as before.
//
// A night shift is one day, the date it STARTS on (data/shift-engine.js). Its check-out is the next calendar morning, so the correction is
// judged against the SHIFT day: the time is read as the next morning when it is earlier than the check-in, and may be as late as the
// shift's end plus a window (default 6 h, an Admin / HR setting) after which it is refused. A time before the check-in's own evening
// stays refused. Day shifts, and days before the shift rules start, are not touched.
//
// Saved under "officeos:night-fix" as { version: 1, windowMin }.
//
//   nightCheckOutJudge(userId, date, record, time)  -> null (not a night shift's day) | { ok: true, nextDay, outAt, until } | { ok: false, error }
//   correctionContext(userId, date, time?)          -> { shiftName, start, end, crossesMidnight, nextDay, until, window } for the form
//   nightFixWindow()  setNightFixWindow(actorUserId, minutes)  resetNightFix()

import { remove } from "../core/storage.js";
import { getUser } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { pureBox } from "./places.js";
import { assignmentReader } from "./shift-assignments.js";
import { shiftReader } from "./shifts-store.js";
import { shiftRulesApply } from "./shift-settings.js";
import { shiftShape, toMin, hhmm, DAY } from "./shift-engine.js";

const KEY = "night-fix";
export const NIGHT_WINDOW_DEFAULT = 360;   // 6 h after the shift's end
export const NIGHT_WINDOW_MAX = 720;
const store = pureBox(KEY, 1, () => ({ windowMin: null }), (b) => "windowMin" in b);

export const nightFixWindow = () => store.read().windowMin ?? NIGHT_WINDOW_DEFAULT;
export function setNightFixWindow(actorUserId, minutes) {
  const u = actorUserId ? getUser(actorUserId) : null;
  if (!u || u.status === "inactive" || !hasPermission(u, "shifts:manage")) return { ok: false, error: "Only HR or an Admin can change this window." };
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > NIGHT_WINDOW_MAX) return { ok: false, error: `Use a whole number of minutes from 0 to ${NIGHT_WINDOW_MAX}.` };
  return store.write({ ...store.read(), windowMin: minutes }) ? { ok: true, windowMin: minutes } : { ok: false, error: "Couldn't save. Browser storage may be full or disabled." };
}
export function resetNightFix() {
  remove(KEY);
}

// The shift a person works on a date, when the shift rules apply to it: the rules with their shape, else null.
function shiftOn(userId, date) {
  if (!shiftRulesApply(date)) return null;
  const a = assignmentReader()(userId, date);
  const rules = shiftReader()(a.shiftId, date);
  return rules ? { rules, shape: shiftShape(rules) } : null;
}

export function correctionContext(userId, date, time) {
  const s = shiftOn(userId, date);
  if (!s) return null;
  const window = nightFixWindow();
  const t = toMin(time);
  return {
    shiftName: s.rules.name, start: s.rules.start, end: s.rules.end, crossesMidnight: s.shape.crossesMidnight,
    until: s.shape.crossesMidnight ? hhmm(s.shape.end + window) : null, window,
    nextDay: Boolean(s.shape.crossesMidnight && t !== null && t < s.shape.opens),
  };
}

export function nightCheckOutJudge(userId, date, record, time) {
  const s = shiftOn(userId, date);
  if (!s || !s.shape.crossesMidnight || !record?.checkIn) return null;
  const t = toMin(time), inAt = toMin(record.checkIn);
  if (t === null || inAt === null) return null;
  // the check-in itself may be after midnight ("00:40": a late arrival read as the next morning)
  const inRel = inAt < s.shape.opens ? inAt + DAY : inAt;
  let outAt = t;
  while (outAt < inRel) outAt += DAY;
  const limit = s.shape.end + nightFixWindow();
  if (outAt === inRel) return { ok: false, error: `The check-out must be after the check-in (${record.checkIn}).` };
  if (outAt > limit) return { ok: false, error: `For a night shift the check-out can be added up to ${hhmm(limit)} the next morning (the shift ends at ${s.rules.end}, plus ${Math.round(nightFixWindow() / 60 * 10) / 10} h).` };
  return { ok: true, nextDay: outAt >= DAY, outAt, until: hhmm(limit) };
}