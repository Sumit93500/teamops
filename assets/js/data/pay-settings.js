// data/pay-settings.js
// P4: the two start dates that switch the screens from the old rules to the new ones (additive; nothing is computed here).
//
//   statutoryFrom  "YYYY-MM": the first payroll month worked out by the new engine (data/pay-engine.js payFor). Months
//                  before it keep exactly the figures the old engine gives (data/payroll.js). Default (nothing saved):
//                  2026-11, the first month whose payroll wasn't finalized when the new rules shipped.
//   leaveFrom      "YYYY-MM-DD": the day the tenure leave policy (data/leave-policy.js) starts to apply on screen. Before
//                  it balances and history are as before; taken leave is never rewritten. Default: 2026-12-01, the first of
//                  the month after the new rules shipped.
//
// Saved under "officeos:pay-settings" as { version, statutoryFrom, leaveFrom, audit }. Reads never write. Only an Admin
// (settings:edit and payroll:approve on record, the rules Admin) changes them; every change is in the audit.
//
//   statutoryFrom()  leaveFrom()  usesNewRules(month "YYYY-MM")  leavePolicyActive(date "YYYY-MM-DD")
//   setStatutoryFrom(actorUserId, month, today?)  setLeaveFrom(actorUserId, date, today?)
//   paySettingsAudit()  resetPaySettings()

import { load, remove } from "../core/storage.js";
import { getUser } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { pureBox } from "./places.js";
import { approvedSnapshot } from "./pay-snapshots.js";

const KEY = "pay-settings";
export const DEFAULT_STATUTORY_FROM = "2026-11";
export const DEFAULT_LEAVE_FROM = "2026-12-01";

const store = pureBox(KEY, 1, () => ({ statutoryFrom: null, leaveFrom: null, audit: [] }), (b) => Array.isArray(b.audit));
const copy = (v) => JSON.parse(JSON.stringify(v));
const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });
const isMonth = (s) => typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
const isDay = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const statutoryFrom = () => store.read().statutoryFrom ?? DEFAULT_STATUTORY_FROM;
export const leaveFrom = () => store.read().leaveFrom ?? DEFAULT_LEAVE_FROM;
// P5: a month whose new-rules figures were approved (a frozen snapshot) stays a new-rules month whatever the start month says later.
export const usesNewRules = (month) => isMonth(month) && (month >= statutoryFrom() || approvedSnapshot(month) !== null);
export const leavePolicyActive = (date) => isDay(date) && date >= leaveFrom();
export const paySettingsAudit = () => copy(store.read().audit);

const admin = (id) => {
  const u = id ? getUser(id) : null;
  return u && u.status !== "inactive" && hasPermission(u, "settings:edit") && hasPermission(u, "payroll:approve") ? u : null;
};
const NOT_ALLOWED = "Only an Admin can change these settings.";
const entry = (actor, action, detail, today) => ({ at: new Date().toISOString(), on: today, by: actor.id, name: actor.name, action, ...detail });
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";

// The newest month whose payroll run is approved (its figures are fixed): the new rules can't start on or before it.
function newestApproved() {
  const box = load("payroll-runs");
  const runs = box && box.version === 1 && Array.isArray(box.records) ? box.records : [];
  return runs.filter((r) => r.status === "approved").map((r) => r.month).sort().at(-1) ?? null;
}

export function setStatutoryFrom(actorUserId, month, today = todayIso()) {
  const actor = admin(actorUserId);
  if (!actor) return fail(NOT_ALLOWED);
  if (!isMonth(month)) return fail("Choose a month, like 2026-11.", "month");
  const done = newestApproved();
  if (done && month <= done) return fail(`The payroll for ${done} is already approved: its figures are fixed. Start the new rules after it.`, "month");
  const box = store.read();
  box.statutoryFrom = month;
  box.audit.push(entry(actor, "statutory-from", { value: month }, today));
  return store.write(box) ? { ok: true, record: { statutoryFrom: month } } : fail(SAVE_FAILED);
}

export function setLeaveFrom(actorUserId, date, today = todayIso()) {
  const actor = admin(actorUserId);
  if (!actor) return fail(NOT_ALLOWED);
  if (!isDay(date)) return fail("Choose a date.", "date");
  if (date < today) return fail("The leave policy can't start in the past: leave already taken is never rewritten.", "date");
  const box = store.read();
  box.leaveFrom = date;
  box.audit.push(entry(actor, "leave-from", { value: date }, today));
  return store.write(box) ? { ok: true, record: { leaveFrom: date } } : fail(SAVE_FAILED);
}

export function resetPaySettings() {
  remove(KEY);
}