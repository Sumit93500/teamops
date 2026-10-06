// data/leave-store.js
// Leave requests, kept in localStorage through data/collection.js. Pages apply,
// decide, cancel and read through here. Balances are always worked out from
// the requests, never stored, so they can't drift.
//
// The older data/leave.js (fixed demo constants) is not used by this file.

import { createCollection, fail } from "./collection.js";
import { getUser, getAllUsers } from "./store.js";
import { dayNumber, isoFromDayNumber, dayOffChecker, resetHolidays } from "./holidays.js";
import { createChain, skippedEntry, CHAIN_STAGES } from "./approval-chain.js";

// allowance: days per period; null = no limit.
export const LEAVE_POLICY = {
  casual: { label: "Casual leave",   allowance: 12,   per: "year" },
  sick:   { label: "Sick leave",     allowance: 8,    per: "year" },
  earned: { label: "Earned leave",   allowance: 10,   per: "year" },
  wfh:    { label: "Work from home", allowance: 4,    per: "month" },
  unpaid: { label: "Unpaid leave",   allowance: null, per: "year" },
};
export const LEAVE_TYPES = Object.keys(LEAVE_POLICY);
export const DURATIONS = ["full", "first-half", "second-half"];

const CAPPED_TYPES = ["casual", "sick", "earned"];   // going over the allowance is refused
const COUNTED = ["pending", "approved"];              // statuses that use up balance and can clash

// ---------- seed ----------

// Real users only. Weekday dates; `days` matches workingDays() for each.
// Each request is attributed to the year (month, for wfh) of its first day.
const at = (date, time = "10:00") => `${date}T${time}:00.000Z`;
const applied = (stage, userId, date) => ({ stage, byUserId: userId, decision: "applied", at: at(date, "09:30"), note: "" });
// A decision: by Priya Nair (HR) at the HR stage unless another decider is named (the requester's manager at the
// manager stage). An approval at the manager stage is followed by HR's decision.
const decided = (stage, decision, date, note = "", byUserId = "EMP-1003", time = "10:00") => ({ stage, byUserId, decision, at: at(date, time), note });
const byManager = (managerId, decision, date, note = "", time = "09:45") => decided("manager", decision, date, note, managerId, time);

const SEED = [
  { id: "LV-2101", userId: "EMP-1105", type: "casual", from: "2026-01-20", to: "2026-01-22", duration: "full", days: 3,
    reason: "Family trip", contactPhone: "", status: "rejected", stage: "done", managerId: "EMP-1029", appliedOn: "2026-01-05",
    history: [applied("manager", "EMP-1105", "2026-01-05"), byManager("EMP-1029", "rejected", "2026-01-06", "Project deadline")] },
  { id: "LV-2124", userId: "EMP-1105", type: "casual", from: "2026-05-14", to: "2026-05-15", duration: "full", days: 2,
    reason: "Cousin's wedding", contactPhone: "+91 98765 43210", status: "approved", stage: "done", managerId: "EMP-1029", appliedOn: "2026-04-28",
    history: [applied("manager", "EMP-1105", "2026-04-28"), byManager("EMP-1029", "approved", "2026-04-28", "", "16:00"), decided("hr", "approved", "2026-04-29")] },
  { id: "LV-2147", userId: "EMP-1105", type: "sick", from: "2026-07-02", to: "2026-07-03", duration: "full", days: 2,
    reason: "Fever", contactPhone: "", status: "approved", stage: "done", managerId: "EMP-1029", appliedOn: "2026-07-02",
    history: [applied("manager", "EMP-1105", "2026-07-02"), byManager("EMP-1029", "approved", "2026-07-02", "", "11:00"), decided("hr", "approved", "2026-07-02", "", "EMP-1003", "15:00")] },
  { id: "LV-2160", userId: "EMP-1105", type: "wfh", from: "2026-08-12", to: "2026-08-12", duration: "full", days: 1,
    reason: "Home repairs", contactPhone: "", status: "approved", stage: "done", managerId: "EMP-1029", appliedOn: "2026-08-10",
    history: [applied("manager", "EMP-1105", "2026-08-10"), byManager("EMP-1029", "approved", "2026-08-10", "", "15:00"), decided("hr", "approved", "2026-08-11")] },
  { id: "LV-2172", userId: "EMP-1023", type: "earned", from: "2026-09-21", to: "2026-10-01", duration: "full", days: 9,
    reason: "Annual vacation", contactPhone: "", status: "approved", stage: "done", managerId: "EMP-1008", appliedOn: "2026-09-01",
    history: [applied("manager", "EMP-1023", "2026-09-01"), byManager("EMP-1008", "approved", "2026-09-02"), decided("hr", "approved", "2026-09-03")] },
  { id: "LV-2180", userId: "EMP-1042", type: "wfh", from: "2026-09-16", to: "2026-09-16", duration: "full", days: 1,
    reason: "Internet installation", contactPhone: "", status: "cancelled", stage: "done", managerId: "EMP-1029", appliedOn: "2026-09-10",
    history: [applied("manager", "EMP-1042", "2026-09-10"), { stage: "manager", byUserId: "EMP-1042", decision: "cancelled", at: at("2026-09-14"), note: "" }] },
  { id: "LV-2189", userId: "EMP-1042", type: "casual", from: "2026-10-13", to: "2026-10-15", duration: "full", days: 3,
    reason: "Family function", contactPhone: "", status: "pending", stage: "manager", managerId: "EMP-1029", appliedOn: "2026-09-17",
    history: [applied("manager", "EMP-1042", "2026-09-17")] },
  { id: "LV-2201", userId: "EMP-1105", type: "casual", from: "2026-10-05", to: "2026-10-05", duration: "full", days: 1,
    reason: "Personal work", contactPhone: "", status: "pending", stage: "manager", managerId: "EMP-1029", appliedOn: "2026-09-18",
    history: [applied("manager", "EMP-1105", "2026-09-18")] },
  { id: "LV-2202", userId: "EMP-1029", type: "casual", from: "2026-10-14", to: "2026-10-14", duration: "full", days: 1,
    reason: "Bank work", contactPhone: "", status: "pending", stage: "hr", managerId: null, appliedOn: "2026-09-18",
    history: [applied("hr", "EMP-1029", "2026-09-18")] },
  { id: "LV-2208", userId: "EMP-1017", type: "casual", from: "2026-10-09", to: "2026-10-09", duration: "first-half", days: 0.5,
    reason: "Doctor's appointment", contactPhone: "", status: "pending", stage: "hr", managerId: null, appliedOn: "2026-09-25",
    history: [applied("hr", "EMP-1017", "2026-09-25")] },
  { id: "LV-2211", userId: "EMP-1003", type: "wfh", from: "2026-10-07", to: "2026-10-07", duration: "full", days: 1,
    reason: "Plumber visit", contactPhone: "", status: "pending", stage: "manager", managerId: "EMP-1001", appliedOn: "2026-09-26",
    history: [applied("manager", "EMP-1003", "2026-09-26")] },
];

const leave = createCollection({ key: "leave-requests", version: 1, seed: () => SEED, idPrefix: "LV-" });

// ---------- small helpers ----------

const pad = (n) => String(n).padStart(2, "0");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Today's date where the person is (local calendar), as ISO.
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const sum = (requests) => requests.reduce((total, r) => total + (Number(r.days) || 0), 0);

// Does this request fall in the given year (and month, for per-month types)?
function inPeriod(request, per, year, month) {
  const [y, m] = request.from.split("-").map(Number);
  return y === Number(year) && (per !== "month" || m === Number(month));
}

// Two requests clash if their dates overlap. The one exception: a first-half
// and a second-half on the same single day.
function clash(a, b) {
  if (!(a.from <= b.to && b.from <= a.to)) return false;   // ISO strings compare in date order
  const halves = a.from === a.to && b.from === b.to && a.duration !== "full" && b.duration !== "full";
  return !(halves && a.duration !== b.duration);
}

// Who may decide which stage: the two-step chain shared with attendance corrections (data/approval-chain.js).
const chain = createChain("leave:approve");

// The requester's reportingManager is a name. It counts only if exactly one
// active user has that exact name (and it isn't the requester).
function resolveManager(user) {
  const name = user.reportingManager;
  if (!name) return null;
  const matches = getAllUsers().filter((u) => u.status === "active" && u.name === name && u.id !== user.id);
  return matches.length === 1 ? matches[0].id : null;
}

// ---------- calculations ----------

// Working days from `from` to `to`, both included, skipping weekends and
// national/company holidays. A half day is 0.5 and only allowed when
// from === to. Returns 0 for anything invalid (bad dates, to before from,
// a half day over several days) or a span with no working days.
export function workingDays(from, to, duration = "full") {
  const start = dayNumber(from);
  const end = dayNumber(to);
  if (start === null || end === null || end < start || !DURATIONS.includes(duration)) return 0;
  const isOff = dayOffChecker();
  if (duration !== "full") return start === end && !isOff(from) ? 0.5 : 0;
  let days = 0;
  for (let n = start; n <= end; n++) {
    if (!isOff(isoFromDayNumber(n))) days += 1;
  }
  return days;
}

// Per type: { allowance, approved, pending, left }. left = allowance - approved
// (pending is shown separately, as on my-leave.html); null when there's no limit.
// year and month (1-12) default to today; month only matters for wfh.
export function balanceFor(userId, year, month) {
  const today = todayIso();
  const y = year ?? Number(today.slice(0, 4));
  const m = month ?? Number(today.slice(5, 7));
  const mine = leave.getAll().filter((r) => r.userId === userId && COUNTED.includes(r.status));
  const out = {};
  for (const [type, policy] of Object.entries(LEAVE_POLICY)) {
    const inThis = mine.filter((r) => r.type === type && inPeriod(r, policy.per, y, m));
    const approved = sum(inThis.filter((r) => r.status === "approved"));
    const pending = sum(inThis.filter((r) => r.status === "pending"));
    out[type] = { allowance: policy.allowance, approved, pending, left: policy.allowance === null ? null : policy.allowance - approved };
  }
  return out;
}

// ---------- writes ----------

// fields: { type, from, to, duration, reason, contactPhone }. Anything else is ignored.
// Success: { ok: true, record, advisories: [{ code, message }] }. Advisories are
// things to tell the person; they don't stop the request.
export function applyLeave(userId, fields = {}) {
  const user = getUser(userId);
  if (!user) return fail(`No employee with id ${userId}.`);
  if (user.status === "inactive") return fail(`${user.name} is inactive and can't apply for leave.`);

  const type = String(fields.type ?? "");
  const from = String(fields.from ?? "").trim();
  const to = String(fields.to ?? "").trim();
  const duration = String(fields.duration ?? "full");
  const reason = String(fields.reason ?? "").trim();
  const contactPhone = String(fields.contactPhone ?? "").trim();

  const policy = LEAVE_POLICY[type];
  if (!policy) return fail("Choose a leave type.", "type");
  if (dayNumber(from) === null) return fail("Pick a valid start date.", "from");
  if (dayNumber(to) === null) return fail("Pick a valid end date.", "to");
  if (to < from) return fail("The end date can't be before the start date.", "to");
  // One request must end before the same date next year ("2026-11-02" -> before "2027-11-02").
  if (to >= `${Number(from.slice(0, 4)) + 1}${from.slice(4)}`) return fail("One request can't be a year or longer.", "to");
  if (!DURATIONS.includes(duration)) return fail("Choose full day, first half or second half.", "duration");
  if (duration !== "full" && from !== to) return fail("A half day must start and end on the same date.", "duration");
  if (!reason) return fail("Reason is required.", "reason");

  const days = workingDays(from, to, duration);
  if (days === 0) return fail("Those dates are all weekends or holidays, so there's nothing to take.", "to");

  const request = { from, to, duration };
  const mine = leave.getAll().filter((r) => r.userId === userId && COUNTED.includes(r.status));
  const overlap = mine.find((r) => clash(r, request));
  if (overlap) return fail(`These dates overlap your ${overlap.status} request ${overlap.id} (${overlap.from} to ${overlap.to}).`, "from");

  const [y, m] = from.split("-").map(Number);
  const balance = balanceFor(userId, y, m)[type];
  const periodLabel = policy.per === "month" ? `${MONTHS[m - 1]} ${y}` : String(y);
  if (CAPPED_TYPES.includes(type) && balance.approved + balance.pending + days > policy.allowance) {
    const free = policy.allowance - balance.approved - balance.pending;
    return fail(`Not enough ${policy.label.toLowerCase()}: ${free} of ${policy.allowance} days free in ${periodLabel} `
      + `(${balance.approved} approved, ${balance.pending} pending), and this request is ${days}.`, "type");
  }

  const advisories = [];
  if (type === "sick" && days > 2) {
    advisories.push({ code: "certificate", message: "A medical certificate is needed for sick leave over 2 days." });
  }
  const today = todayIso();
  if (days >= 3 && dayNumber(from) - dayNumber(today) < 7) {
    advisories.push({ code: "short-notice", message: "Requests for 3 or more days should be sent at least 7 days ahead, so your team can plan." });
  }
  if (type === "wfh" && balance.approved + balance.pending + days > policy.allowance) {
    advisories.push({ code: "wfh-limit", message: `This goes over the ${policy.allowance} work-from-home days allowed in ${periodLabel}.` });
  }

  const managerId = resolveManager(user);
  const stage = managerId ? "manager" : "hr";
  const now = new Date().toISOString();
  const history = [{ stage, byUserId: userId, decision: "applied", at: now, note: "" }];
  let status = "pending";
  let finalStage = stage;
  if (user.role === "admin") {
    CHAIN_STAGES.forEach((s) => history.push({ stage: s, byUserId: userId, decision: "auto-approved", at: now, note: "Auto-approved (Admin)" }));
    status = "approved";
    finalStage = "done";
  }

  const result = leave.add({
    userId, type, from, to, duration, days, reason, contactPhone,
    status, stage: finalStage, managerId, appliedOn: today, history,
  });
  return result.ok ? { ...result, advisories } : result;
}

// decision: "approve" | "reject", for the request's current stage only:
//   manager  the requester's manager (or, if they can no longer decide, HR or an Admin)
//   hr       HR or an Admin (leave:approve)
// Never on your own request, only while pending. Approving at the manager stage
// moves the request to HR; approving at HR is final. Rejecting at either stage
// ends it and needs a note.
export function decideLeave(requestId, deciderUserId, deciderRole, decision, note = "") {
  const request = leave.get(requestId);
  if (!request) return fail(`No leave request ${requestId}.`);
  const decider = getUser(deciderUserId);
  if (!decider || decider.status === "inactive" || decider.role !== deciderRole) return fail("You can't decide leave requests.");
  if (deciderUserId === request.userId) return fail("You can't decide your own leave request.");
  if (request.status !== "pending") return fail(`This request is already ${request.status}.`);
  if (!chain.holds(request, request.stage, decider)) return fail(chain.refusal(request));
  if (decision !== "approve" && decision !== "reject") return fail('Decision must be "approve" or "reject".');
  const text = String(note ?? "").trim();
  if (decision === "reject" && !text) return fail("Add a note saying why the request is rejected.", "note");

  const now = new Date().toISOString();
  const entry = { stage: request.stage, byUserId: deciderUserId, decision: decision === "approve" ? "approved" : "rejected", at: now, note: text };
  if (decision === "reject") return leave.update(requestId, { status: "rejected", stage: "done", history: [...request.history, entry] });
  const next = chain.nextStage(request, request.stage);
  return leave.update(requestId, {
    status: next.stage ? "pending" : "approved",
    stage: next.stage ?? "done",
    history: [...request.history, entry, ...next.skipped.map((s) => skippedEntry(s, now))],
  });
}

// Only the person who asked, only while it's pending.
export function cancelLeave(requestId, userId) {
  const request = leave.get(requestId);
  if (!request) return fail(`No leave request ${requestId}.`);
  if (request.userId !== userId) return fail("Only the person who asked for this leave can cancel it.");
  if (request.status !== "pending") return fail(`This request is already ${request.status}, so it can't be cancelled.`);
  const entry = { stage: request.stage, byUserId: userId, decision: "cancelled", at: new Date().toISOString(), note: "" };
  return leave.update(requestId, { status: "cancelled", stage: "done", history: [...request.history, entry] });
}

// ---------- reads (always deep copies) ----------

export function allRequests() {
  return leave.getAll();
}

export function getRequest(id) {
  return leave.get(id);
}

export function requestsFor(userId) {
  return leave.getAll().filter((r) => r.userId === userId);
}

// Everything still pending at a stage this person may decide: as the
// requester's manager, or as HR / an Admin. Never their own. [] for an unknown
// or inactive person, or a roleKey that isn't theirs.
export function pendingFor(deciderUserId, roleKey) {
  const decider = getUser(deciderUserId);
  if (!decider || decider.status === "inactive" || decider.role !== roleKey) return [];
  return leave.getAll().filter((r) => r.status === "pending" && chain.holds(r, r.stage, decider));
}

// Other people's pending or approved requests in the same department whose
// dates overlap this one, e.g. to check team cover before approving.
export function overlaps(requestId) {
  const request = leave.get(requestId);
  if (!request) return [];
  const department = getUser(request.userId)?.department;
  if (!department) return [];
  const sameTeam = new Set(getAllUsers().filter((u) => u.department === department).map((u) => u.id));
  return leave.getAll().filter((r) => r.id !== request.id && r.userId !== request.userId
    && sameTeam.has(r.userId) && COUNTED.includes(r.status) && clash(r, request));
}

// The id of the manager a new request from this person would go to first, or
// null (no manager, or the name doesn't match exactly one active user). Pages
// use it to show the approval chain before anything is sent.
export function managerFor(userId) {
  const user = getUser(userId);
  return user ? resolveManager(user) : null;
}

// Who a pending request is waiting on, for display: the manager's current
// name, or "HR" (also when the manager can no longer decide it: HR or an
// Admin decides that stage instead). "" once decided.
export function currentApproverName(request) {
  if (!request || request.status !== "pending") return "";
  if (request.stage === "manager" && chain.managerCanDecide(request)) return getUser(request.managerId).name;
  return "HR";
}

// Who a new leave request or attendance correction from this person goes to,
// in words, as the profile pages show it: "Approved automatically (Admin)",
// "<manager>, then HR or an Admin", or "HR or an Admin" (no manager on file).
export function approvalChainText(userId) {
  const user = getUser(userId);
  if (!user) return "—";
  if (user.role === "admin") return "Approved automatically (Admin)";
  const managerId = resolveManager(user);
  return managerId ? `${getUser(managerId).name}, then HR or an Admin` : "HR or an Admin";
}

// Did this person approve or reject this request at some stage?
export const decidedBy = (request, userId) => request.history.some((h) => h.byUserId === userId && (h.decision === "approved" || h.decision === "rejected"));

// ---------- safety net ----------

// Throws away every change to leave requests and holidays in this browser.
export function resetLeaveData() {
  leave.reset();
  resetHolidays();
}