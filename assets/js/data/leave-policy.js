// data/leave-policy.js
// P3: leave by tenure (data only; NEW functions. data/leave-store.js still gives every page its balances, its flat
// policy and its checks exactly as before; the page round, P4, switches them over).
//
// The bands (tenureBand): an intern is always "intern"; anyone else is "under1" before their first work anniversary and
// "over1" from that day on. Nothing is stored: the band is worked out from the joining date and the employment type
// (data/employment.js: the profile's values, else the sample) on the day asked about.
//
// The policy, per band and leave type, SAMPLE values an Admin can edit (ruled 2026-11-12, E2):
//   intern   casual 1 a month (accrues monthly, no carry-forward); no sick; no earned
//   under1   casual 12 and sick 8 a year, pro-rated by month in the year they join; earned 1 per 20 days worked from
//            joining, usable 6 months after joining
//   over1    casual 12, sick 8; earned 1 per 20 days worked; earned carries forward up to 30, encashed above 30 at year end
//   every band: work from home 4 a month (unchanged); unpaid leave unlimited (unchanged)
// The leave year is the calendar year (as data/leave-store.js counts it).
//
// Choices made here (to confirm, see docs/leave.md):
//   - A month counts toward a pro-rated or monthly allowance when the person is employed on its 15th (a joiner on or before
//     the 15th gets that month). Pro-rated amounts are rounded DOWN to the half day.
//   - "Days worked" for earned leave: the working days (no weekend, no national or company holiday) from the later of the
//     joining date and 1 January up to the day asked about, less approved unpaid leave. Paid leave counts as worked.
//     (Attendance records don't cover the past, so they aren't read.)
//   - Under one year, earned leave left at year end also carries forward (cap 30), but is not encashed.
//   - Casual and sick leave lapse at year end. A person with no joining date on file counts as over one year.
// Statutory (STATUTORY_NOTES): the OSH Code's annual leave is a NOTE, not enforced (whether it covers this office, or the
// Haryana Shops and Establishments Act does, is not confirmed).
//
// Saved under "officeos:leave-policy" as { version, changes: { "<band>": { "<type>": { <field>: value } } },
// closes: { "<year>": { closedBy, closedByName, closedOn, rows: { "<employee id>": { band, earnedLeft, carried, encashed,
// lapsed } } } }, audit: [...] }. Reads never write.
// Who: LEAVE_POLICY_PERMISSIONS "leave-policy:edit" (change a band's numbers, close a leave year): the Admin only, kept
// here until the page round, as payroll-rules:verify is.
//
//   LEAVE_BANDS, BAND_LABEL, LEAVE_POLICY_SEED, STATUTORY_NOTES
//   tenureBand(user | userId, date)          "intern" | "under1" | "over1" | null (unknown person, bad date)
//   anniversaryOf(joiningDate)               the first work anniversary, "YYYY-MM-DD" (29 Feb joiners: 28 Feb)
//   leavePolicy()  bandPolicy(band)          the policy with the Admin's changes
//   monthsCounted(joiningDate, year, uptoMonth)   the months of the year that count (the 15th rule)
//   daysWorked(userId, from, to)             the working days less approved unpaid leave
//   leaveAccount(userId, date)               -> per type: { band, entitled, carriedIn, taken, pending, available, usable, left, lop, ... }
//   requestOutcome(userId, type, days, date) -> { paid, lop }: what a request of that many days would be paid as
//   updateLeavePolicy(actorUserId, band, type, changes, today?)   closeLeaveYear(actorUserId, year, today?)
//   yearClose(year)  leavePolicyAudit()  holdsLeavePolicyPermission(user, permission)  resetLeavePolicy()

import { remove } from "../core/storage.js";
import { getUser, getAllUsers } from "./store.js";
import { ROLE_KEYS } from "../config/roles.js";
import { pureBox } from "./places.js";
import { dayNumber, isoFromDayNumber, dayOffChecker } from "./holidays.js";
import { allRequests, balanceFor, LEAVE_POLICY, applyLeave, workingDays } from "./leave-store.js";
import { leavePolicyActive } from "./pay-settings.js";
import { employmentOf } from "./employment.js";

const KEY = "leave-policy";
export const LEAVE_BANDS = ["intern", "under1", "over1"];
export const BAND_LABEL = { intern: "Intern", under1: "Under 1 year", over1: "1 year or more" };
export const POLICY_TYPES = ["casual", "sick", "earned", "wfh", "unpaid"];
// accrual: "perMonth" (amount each counted month), "perYear" (amount a year, pro-rated by month in the joining year),
// "per20Days" (1 per `per` days worked), "perMonthReset" (amount every month, nothing kept: WFH), "none", "unlimited"
const p = (accrual, amount, more = {}) => Object.freeze({ accrual, amount, per: null, usableAfterMonths: 0, carryForwardMax: 0, encashAbove: null, ...more });
export const LEAVE_POLICY_SEED = Object.freeze({
  intern: Object.freeze({ casual: p("perMonth", 1), sick: p("none", 0), earned: p("none", 0), wfh: p("perMonthReset", 4), unpaid: p("unlimited", null) }),
  under1: Object.freeze({ casual: p("perYear", 12), sick: p("perYear", 8), earned: p("per20Days", 1, { per: 20, usableAfterMonths: 6, carryForwardMax: 30 }), wfh: p("perMonthReset", 4), unpaid: p("unlimited", null) }),
  over1: Object.freeze({ casual: p("perYear", 12), sick: p("perYear", 8), earned: p("per20Days", 1, { per: 20, carryForwardMax: 30, encashAbove: 30 }), wfh: p("perMonthReset", 4), unpaid: p("unlimited", null) }),
});
const EDITABLE = ["amount", "per", "usableAfterMonths", "carryForwardMax", "encashAbove"];
export const STATUTORY_NOTES = Object.freeze([
  Object.freeze({ key: "osh-annual-leave", enforced: false, confidence: "secondary", source: "https://www.labour.gov.in/static/uploads/2025/07/e0971b414d2951d58dd958ecec9c8c09.pdf",
    note: "OSH Code: annual leave with wages, 1 day per 20 days worked, after 180 days' work in a calendar year; carry-forward up to 30; encashment above 30 at year end and at separation. Whether this chapter covers an office like ours, or the Haryana Shops and Establishments Act does, is not confirmed: a note, not enforced." }),
  Object.freeze({ key: "maternity", enforced: false, confidence: "unverified", source: "", note: "Maternity benefit: not confirmed in the research; not modelled." }),
  Object.freeze({ key: "interns", enforced: false, confidence: "unverified", source: "", note: "Whether interns are employees for leave law is not confirmed; their band is company policy." }),
]);

// ---------- who ----------
export const LEAVE_POLICY_PERMISSIONS = ["leave-policy:edit"];
export const LEAVE_POLICY_GRANTS = Object.fromEntries(ROLE_KEYS.map((k) => [k, k === "admin" ? [...LEAVE_POLICY_PERMISSIONS] : []]));
export function holdsLeavePolicyPermission(user, permission) {
  return Boolean(user) && Object.hasOwn(LEAVE_POLICY_GRANTS, user.role) && LEAVE_POLICY_GRANTS[user.role].includes(permission);
}
const NOT_ALLOWED = "Only an Admin can change the leave policy or close a leave year.";

// ---------- storage ----------
const isObj = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const store = pureBox(KEY, 1, () => ({ changes: {}, closes: {}, audit: [] }), (b) => isObj(b.changes) && isObj(b.closes) && Array.isArray(b.audit));
const copy = (value) => JSON.parse(JSON.stringify(value));
const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";

// ---------- the band ----------
const isIso = (d) => typeof d === "string" && dayNumber(d) !== null;
export function anniversaryOf(joiningDate) {
  if (!isIso(joiningDate)) return null;
  const [y, m, d] = joiningDate.split("-").map(Number);
  const iso = `${y + 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return isIso(iso) ? iso : `${y + 1}-02-28`;
}
// `months` after a date, same day of the month (or the month's last day): the "usable after 6 months" day.
function plusMonths(date, months) {
  const [y, m, d] = date.split("-").map(Number);
  const t = (m - 1) + months, yy = y + Math.floor(t / 12), mm = (t % 12) + 1;
  for (let dd = d; dd >= 28; dd--) { const iso = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`; if (isIso(iso)) return iso; }
  return `${yy}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
export function tenureBand(user, date) {
  if (!isIso(date)) return null;
  const id = typeof user === "string" ? user : user?.id;
  const e = id ? employmentOf(id) : null;
  if (!e) return null;
  if (e.kind === "intern") return "intern";
  const anniversary = anniversaryOf(e.joiningDate);
  return anniversary && date < anniversary ? "under1" : "over1";
}

// ---------- the policy ----------
export function bandPolicy(band) {
  const seed = LEAVE_POLICY_SEED[band];
  if (!seed) return null;
  const changes = store.read().changes[band] ?? {};
  return Object.fromEntries(POLICY_TYPES.map((t) => [t, { ...seed[t], ...(changes[t] ?? {}) }]));
}
export const leavePolicy = () => Object.fromEntries(LEAVE_BANDS.map((b) => [b, bandPolicy(b)]));

// ---------- counting ----------
// The months of `year` up to `uptoMonth` that count for someone who joined on joiningDate: every month whose 15th is on
// or after the joining date (no joining date: every month).
export function monthsCounted(joiningDate, year, uptoMonth = 12) {
  let n = 0;
  for (let m = 1; m <= uptoMonth; m++) if (!joiningDate || `${year}-${String(m).padStart(2, "0")}-15` >= joiningDate) n++;
  return n;
}
const halfDown = (x) => Math.floor(x * 2 + 1e-9) / 2;
export function daysWorked(userId, from, to) {
  const a = dayNumber(from), b = dayNumber(to);
  if (a === null || b === null || b < a) return 0;
  const off = dayOffChecker();
  let days = 0;
  for (let n = a; n <= b; n++) if (!off(isoFromDayNumber(n))) days++;
  const unpaid = allRequests().filter((r) => r.userId === userId && r.type === "unpaid" && r.status === "approved");
  for (const r of unpaid) for (let n = Math.max(a, dayNumber(r.from)); n <= Math.min(b, dayNumber(r.to)); n++) {
    if (!off(isoFromDayNumber(n))) days -= r.duration === "full" ? 1 : 0.5;
  }
  return Math.max(0, days);
}

// One leave type's account on `date` (its calendar year), from the policy of the person's band on that day:
//   entitled   the year's allowance so far: perYear pro-rated in the joining year; perMonth up to date's month; per20Days
//              floor(days worked this year / per); WFH the month's 4; unpaid null (no limit)
//   carriedIn  earned leave carried from last year's close (0 until a year is closed)
//   taken, pending   approved and pending days this year (this month for WFH), as data/leave-store.js counts them
//   available  entitled + carriedIn;  usable  what may be taken now (earned before the usable date: 0)
//   left       usable - taken (never below 0)  lop  days taken beyond what is usable: unpaid (loss of pay)
function account(userId, type, date, band, e) {
  const policy = bandPolicy(band)[type];
  const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7));
  const used = balanceFor(userId, year, month)[type] ?? { approved: 0, pending: 0 };
  const taken = used.approved, pending = used.pending;
  const join = e.joiningDate;
  let entitled = 0, carriedIn = 0, usableFrom = null;
  if (policy.accrual === "unlimited") return { type, band, accrual: policy.accrual, entitled: null, carriedIn: 0, taken, pending, available: null, usable: null, left: null, lop: 0 };
  if (policy.accrual === "perYear") entitled = halfDown((policy.amount * monthsCounted(join && join.slice(0, 4) === String(year) ? join : null, year)) / 12);
  else if (policy.accrual === "perMonth") entitled = policy.amount * monthsCounted(join && join.slice(0, 4) <= String(year) ? join : null, year, month);
  else if (policy.accrual === "perMonthReset") entitled = policy.amount;
  else if (policy.accrual === "per20Days") {
    const from = join && join > `${year}-01-01` ? join : `${year}-01-01`;
    entitled = Math.floor(daysWorked(userId, from, date) / (policy.per || 20)) * policy.amount;
    carriedIn = store.read().closes[year - 1]?.rows?.[userId]?.carried ?? 0;
    if (policy.usableAfterMonths && join) usableFrom = plusMonths(join, policy.usableAfterMonths);
  }
  const available = entitled + carriedIn;
  const usable = usableFrom && date < usableFrom ? 0 : available;
  return { type, band, accrual: policy.accrual, entitled, carriedIn, taken, pending, available, usable, ...(usableFrom ? { usableFrom } : {}), left: Math.max(0, usable - taken), lop: Math.max(0, taken - usable) };
}
export function leaveAccount(userId, date) {
  const band = tenureBand(userId, date);
  if (!band) return null;
  const e = employmentOf(userId);
  return { userId, date, band, joiningDate: e.joiningDate, employmentType: e.employmentType,
    types: Object.fromEntries(POLICY_TYPES.map((t) => [t, account(userId, t, date, band, e)])),
    lop: POLICY_TYPES.reduce((s, t) => s + account(userId, t, date, band, e).lop, 0) };
}
// A request of `days` of `type` on `date`: the part the balance covers is paid, the rest is loss of pay (unpaid leave:
// all paid as before, it is unpaid by nature and the existing payroll already deducts it).
export function requestOutcome(userId, type, days, date) {
  const a = leaveAccount(userId, date);
  if (!a || !POLICY_TYPES.includes(type) || !(days > 0)) return null;
  const t = a.types[type];
  if (t.usable === null) return { paid: days, lop: 0 };
  const room = Math.max(0, t.usable - t.taken - t.pending);
  return { paid: Math.min(days, room), lop: Math.max(0, days - room) };
}

// ---------- writes ----------
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const admin = (id) => { const u = id ? getUser(id) : null; return u && u.status !== "inactive" && holdsLeavePolicyPermission(u, "leave-policy:edit") ? u : null; };
const entry = (actor, action, detail, today) => ({ at: new Date().toISOString(), on: today, by: actor.id, name: actor.name, action, ...detail });

// The Admin changes a band's numbers for one type: amount, per (days worked per earned day), usableAfterMonths,
// carryForwardMax, encashAbove (null: never). Whole or half days, 0 or more; per a whole number from 1.
export function updateLeavePolicy(actorUserId, band, type, changes = {}, today = todayIso()) {
  const actor = admin(actorUserId);
  if (!actor) return fail(NOT_ALLOWED);
  if (!LEAVE_BANDS.includes(band)) return fail("Choose intern, under1 or over1.", "band");
  if (!POLICY_TYPES.includes(type) || type === "unpaid") return fail("Choose casual, sick, earned or wfh.", "type");
  if (!isObj(changes) || !Object.keys(changes).length) return fail("Give what changes.");
  for (const [k, v] of Object.entries(changes)) {
    if (!EDITABLE.includes(k)) return fail(`"${k}" can't be changed here.`, k);
    if (k === "per") { if (!Number.isInteger(v) || v < 1) return fail("Days worked per earned day is a whole number from 1.", k); continue; }
    if (k === "encashAbove" && v === null) continue;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || !Number.isInteger(v * 2)) return fail("Enter whole or half days, 0 or more.", k);
  }
  const box = store.read();
  ((box.changes[band] ??= {})[type] ??= {});
  Object.assign(box.changes[band][type], changes);
  box.audit.push(entry(actor, "policy", { band, type, changes }, today));
  return store.write(box) ? { ok: true, record: bandPolicy(band)[type] } : fail(SAVE_FAILED);
}

// Closes a leave year, once, after it has ended: for everyone with a joining date by its end, their earned leave left
// on 31 December (by their band that day) carries forward up to the band's cap; above it, over one year, it is encashed;
// the rest lapses. Interns and casual / sick leave carry nothing.
export function closeLeaveYear(actorUserId, year, today = todayIso()) {
  const actor = admin(actorUserId);
  if (!actor) return fail(NOT_ALLOWED);
  if (!Number.isInteger(year) || year < 2000) return fail("Give the year, like 2026.", "year");
  if (!isIso(today) || today <= `${year}-12-31`) return fail(`${year} hasn't ended yet.`, "year");
  const box = store.read();
  if (box.closes[year]) return fail(`${year} is already closed.`, "year");
  const end = `${year}-12-31`, rows = {};
  for (const u of getAllUsers()) {
    const e = employmentOf(u.id);
    if (!e || (e.joiningDate && e.joiningDate > end)) continue;
    const band = tenureBand(u.id, end);
    const a = account(u.id, "earned", end, band, e);
    const policy = bandPolicy(band).earned;
    const earnedLeft = Math.max(0, a.available - a.taken);
    const carried = Math.min(earnedLeft, policy.carryForwardMax ?? 0);
    const encashed = policy.encashAbove === null || policy.encashAbove === undefined ? 0 : Math.max(0, earnedLeft - Math.max(policy.encashAbove, carried));
    rows[u.id] = { band, earnedLeft, carried, encashed, lapsed: earnedLeft - carried - encashed };
  }
  box.closes[year] = { closedBy: actor.id, closedByName: actor.name, closedOn: today, rows };
  box.audit.push(entry(actor, "close-year", { year }, today));
  return store.write(box) ? { ok: true, record: copy(box.closes[year]) } : fail(SAVE_FAILED);
}
export const yearClose = (year) => { const c = store.read().closes[year]; return c ? copy(c) : null; };
export const leavePolicyAudit = () => copy(store.read().audit);
export function resetLeavePolicy() {
  remove(KEY);
}
// ---------- P5: the policy binds ----------
// From the leave policy's start date (data/pay-settings.js leaveFrom), counted by the leave's first day, a request is
// checked against the band's policy, not the old flat allowance (12 / 8 / 10, which still applies to leave starting
// before that day). Days beyond the balance can go through only as unpaid (loss of pay), and only when the person says so
// (acceptLossOfPay); without it the request is refused with code "loss-of-pay", lopDays and paidDays. Work from home and
// unpaid leave are never loss of pay here (work from home keeps its old advisory). The request records lopDays.
export const LOSS_OF_PAY = "loss-of-pay";
export function applyLeaveUnderPolicy(userId, fields = {}, { acceptLossOfPay = false } = {}) {
  const from = String(fields?.from ?? "").trim();
  if (!leavePolicyActive(from)) return applyLeave(userId, fields);
  const type = String(fields?.type ?? ""), to = String(fields?.to ?? "").trim(), duration = String(fields?.duration ?? "full");
  const days = POLICY_TYPES.includes(type) && dayNumber(to) !== null && to >= from ? workingDays(from, to, duration) : 0;
  const today = todayIso();
  const outcome = days > 0 && type !== "wfh" && type !== "unpaid" ? requestOutcome(userId, type, days, from > today ? from : today) : null;
  const lop = outcome?.lop ?? 0;
  if (lop > 0 && acceptLossOfPay !== true) {
    return { ok: false, code: LOSS_OF_PAY, field: "type", lopDays: lop, paidDays: outcome.paid,
      error: `${lop} of these ${days} days are beyond your balance. They can go through only as unpaid leave (loss of pay), if you confirm.` };
  }
  return applyLeave(userId, fields, { policy: { lopDays: lop, band: tenureBand(userId, from) } });
}

// The loss-of-pay days of approved policy requests that fall in a month: a request's lopDays are its last working days
// (a half-day request is 0.5). Leave taken before the policy's start date has no lopDays, so it is never counted.
export function lossOfPayDaysIn(userId, year, month) {
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const off = dayOffChecker();
  let total = 0;
  for (const r of allRequests()) {
    if (r.userId !== userId || r.status !== "approved" || !(r.lopDays > 0)) continue;
    let left = r.lopDays;
    for (let n = dayNumber(r.to); n >= dayNumber(r.from) && left > 0; n--) {
      const iso = isoFromDayNumber(n);
      if (off(iso)) continue;
      const take = Math.min(r.duration === "full" ? 1 : 0.5, left);
      left -= take;
      if (iso.slice(0, 7) === key) total += take;
    }
  }
  return total;
}

// The flat policy data/leave-store.js still applies (for the comparison the page round makes).
export const FLAT_POLICY = LEAVE_POLICY;