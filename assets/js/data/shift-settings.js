// data/shift-settings.js (SH1, 2026-11-15): when the shift rules start, and their two company switches. Additive.
//
//   shiftRulesFrom  "YYYY-MM-DD", always the 1st of a month (pay months start on the 1st). Before it, attendance, leave
//                   and pay read exactly today's rules (data/attendance-store.js, data/payroll-store.js), byte for byte;
//                   from it, the shift engine decides each day (data/shift-days.js) and pay takes its loss of pay
//                   (data/pay-engine.js payFor). Default (nothing saved): 2026-12-01, as the leave policy's.
//   latePolicy      { on, every }: every `every`th late mark in a month costs a half day's pay. Default ON, every 3: today's
//                   rule, so pay from the start date matches it (SH1b ruling; SH1 shipped it off). Dated: a change made by the
//                   Admin applies from its effective date (the day it is made) only; a late mark is judged by the policy in
//                   force on its own date, counted in the month's running order (the 3rd costs a half day, the 6th another).
//                   Only from the shift rules start date; before it the old rule stands.
//   compOff         { on, minutesPerDay, expiryDays }: approved overtime turns into comp-off days, credited to earned
//                   leave (data/comp-off.js, data/leave-policy.js), each expiring expiryDays after it is earned.
//                   Default OFF (480 minutes a day, 90 days).
//
// Saved under "officeos:shift-settings" as { version, shiftRulesFrom, lateHistory: [{ from, on, every }], compOff, audit }. Reads never write.
// Only an Admin changes them (settings:edit, the Admin's alone); every change is in the audit.
//
//   shiftRulesFrom()  shiftRulesApply(date)  shiftRulesMonth()  latePolicy(date?)  lateHalfDays(lateDates)  compOffRule()  shiftSettingsAudit()
//   setShiftRulesFrom(actorUserId, date, today?)  setLatePolicy(actorUserId, { on, every })  setCompOff(actorUserId, { on, minutesPerDay, expiryDays })
//   resetShiftSettings()

import { load, remove } from "../core/storage.js";
import { getUser } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { pureBox } from "./places.js";
import { officeNow, dayNo } from "./shift-engine.js";

const KEY = "shift-settings";
export const DEFAULT_SHIFT_RULES_FROM = "2026-12-01";
export const DEFAULT_LATE_POLICY = Object.freeze({ on: true, every: 3 });
export const DEFAULT_COMP_OFF = Object.freeze({ on: false, minutesPerDay: 480, expiryDays: 90 });
const store = pureBox(KEY, 1, () => ({ shiftRulesFrom: null, lateHistory: [], compOff: null, audit: [] }), (b) => Array.isArray(b.audit));
const copy = (v) => JSON.parse(JSON.stringify(v));
const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";

export const shiftRulesFrom = () => store.read().shiftRulesFrom ?? DEFAULT_SHIFT_RULES_FROM;
export const shiftRulesMonth = () => shiftRulesFrom().slice(0, 7);
export const shiftRulesApply = (date) => dayNo(date) !== null && date >= shiftRulesFrom();
// The late-mark policy in force on a date (today in office time by default): the newest version from on or before it.
const lateVersions = (box) => [{ from: "2000-01-01", ...DEFAULT_LATE_POLICY }, ...(Array.isArray(box.lateHistory) ? box.lateHistory : [])].sort((a, b) => a.from.localeCompare(b.from));
const lateOn = (versions, date) => [...versions].reverse().find((v) => v.from <= date) ?? versions[0];
export const latePolicy = (date = officeNow().date) => { const v = lateOn(lateVersions(store.read()), date); return { on: v.on, every: v.every, from: v.from }; };
// The half days a month's late marks cost: the k-th late mark (dates, oldest first) costs one when the policy in force on its date
// is on and k is a multiple of its `every`. A constant policy: floor(marks / every).
export function lateHalfDays(lateDates) {
  const versions = lateVersions(store.read());
  return [...lateDates].sort().reduce((n, date, i) => { const p = lateOn(versions, date); return n + (p.on && (i + 1) % p.every === 0 ? 1 : 0); }, 0);
}
export const compOffRule = () => ({ ...DEFAULT_COMP_OFF, ...(store.read().compOff ?? {}) });
export const shiftSettingsAudit = () => copy(store.read().audit);

const admin = (id) => { const u = id ? getUser(id) : null; return u && u.status !== "inactive" && hasPermission(u, "settings:edit") ? u : null; };
const NOT_ALLOWED = "Only an Admin can change the shift settings.";
const entry = (actor, action, detail, today) => ({ at: new Date().toISOString(), on: today, by: actor.id, name: actor.name, action, ...detail });

// The newest payroll month already approved (an old run or a frozen new-rules snapshot): its figures are fixed.
function newestApproved() {
  const runs = load("payroll-runs");
  const snaps = load("pay-snapshots");
  const a = runs && Array.isArray(runs.records) ? runs.records.filter((r) => r.status === "approved").map((r) => r.month) : [];
  const b = snaps && snaps.months && typeof snaps.months === "object" ? Object.entries(snaps.months).filter(([, s]) => s?.status === "approved").map(([m]) => m) : [];
  return [...a, ...b].sort().at(-1) ?? null;
}

export function setShiftRulesFrom(actorUserId, date, today = officeNow().date) {
  const actor = admin(actorUserId);
  if (!actor) return fail(NOT_ALLOWED);
  if (dayNo(date) === null) return fail("Choose a date.", "date");
  if (date.slice(8) !== "01") return fail("Shift rules start on the 1st of a month, as pay months do.", "date");
  if (date < today) return fail("Shift rules can't start in the past: days already worked keep the rules they were worked under.", "date");
  const done = newestApproved();
  if (done && date.slice(0, 7) <= done) return fail(`The payroll for ${done} is already approved: its figures are fixed. Start the shift rules after it.`, "date");
  const box = store.read();
  box.shiftRulesFrom = date;
  box.audit.push(entry(actor, "shift-rules-from", { value: date }, today));
  return store.write(box) ? { ok: true, record: { shiftRulesFrom: date } } : fail(SAVE_FAILED);
}
export function setLatePolicy(actorUserId, { on, every } = {}, today = officeNow().date) {
  const actor = admin(actorUserId);
  if (!actor) return fail(NOT_ALLOWED);
  const n = every ?? latePolicy(today).every;
  if (typeof on !== "boolean") return fail("Turn the late-mark rule on or off.", "on");
  if (!Number.isInteger(n) || n < 2 || n > 10) return fail("Late marks per half day: a whole number from 2 to 10.", "every");
  const box = store.read();
  const history = Array.isArray(box.lateHistory) ? box.lateHistory.filter((v) => v.from !== today) : [];
  history.push({ from: today, on, every: n });   // effective from today: days before it keep the policy they had
  box.lateHistory = history;
  box.audit.push(entry(actor, "late-policy", { value: { on, every: n }, from: today }, today));
  return store.write(box) ? { ok: true, record: { on, every: n, from: today } } : fail(SAVE_FAILED);
}
export function setCompOff(actorUserId, { on, minutesPerDay, expiryDays } = {}, today = officeNow().date) {
  const actor = admin(actorUserId);
  if (!actor) return fail(NOT_ALLOWED);
  const cur = compOffRule();
  const m = minutesPerDay ?? cur.minutesPerDay, e = expiryDays ?? cur.expiryDays;
  if (typeof on !== "boolean") return fail("Turn comp-off on or off.", "on");
  if (!Number.isInteger(m) || m < 60 || m > 720) return fail("Minutes of overtime per comp-off day: 60 to 720.", "minutesPerDay");
  if (!Number.isInteger(e) || e < 7 || e > 365) return fail("A comp-off day expires after 7 to 365 days.", "expiryDays");
  const box = store.read();
  box.compOff = { on, minutesPerDay: m, expiryDays: e };
  box.audit.push(entry(actor, "comp-off", { value: { ...box.compOff } }, today));
  return store.write(box) ? { ok: true, record: { ...box.compOff } } : fail(SAVE_FAILED);
}
export function resetShiftSettings() {
  remove(KEY);
}