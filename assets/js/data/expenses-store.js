// data/expenses-store.js
// Expense claims, kept in localStorage through data/collection.js. Pages send,
// decide, pay, cancel and read through here; the rules (categories, amounts,
// which stages a claim needs) are in data/expenses.js.
//
// A claim: { id, userId, category, amount (whole rupees), date (the day of
// the spending, "YYYY-MM-DD"), reason, receipt (what the claimant calls the
// bill, e.g. "bill.pdf", or null; no file is stored), status, stage,
// managerId, appliedOn, history }.
//   status: "pending" | "approved" (every stage done, waiting to be paid) |
//           "paid" | "rejected" | "cancelled"
//   stage:  whose turn it is: "manager" | "finance" | "admin" while pending,
//           "payment" once approved, "done" after that.
// history entries are { stage, byUserId, decision, at, note }, as on leave
// requests, with decision "applied", "skipped" (byUserId null: nobody holds
// that stage), "approved", "auto-approved", "rejected", "paid" or "cancelled".
//
// Each stage is decided by someone different:
//   manager  the claimant's manager, worked out when the claim is sent (as
//            leave's managerId is). Needs no permission: it goes by who the
//            claimant reports to, not by role.
//   finance  a Finance Manager (role "fin", with expenses:approve).
//   admin    an Admin (role "admin", with expenses:approve).
// Nobody decides their own claim. A stage nobody else holds (no manager on
// file; the claimant is the only Finance Manager) is skipped. An Admin's own
// claim is approved at every stage straight away, as an Admin's leave is.
// Paying is a separate step (expenses:pay), never by the claimant, and not by
// whoever gave the final approval unless nobody else can pay (a deliberate
// fallback, like sending an all-skipped claim to the Admin stage; see
// round-5b-notes.md).
//
// The Reset demo data button (users-list.js) calls resetExpenseData().

import { createCollection, fail } from "./collection.js";
import { getUser, getAllUsers } from "./store.js";
import { dayNumber } from "./holidays.js";
import { managerFor } from "./leave-store.js";
import { EXPENSE_POLICY, CATEGORIES, CATEGORY_KEYS, chainFor, nextStage, firstStage, needsReceipt } from "./expenses.js";
import { ROLES } from "../config/roles.js";

// ---------- seed ----------

// Real users only. Each claim was sent within 30 days of the spending, and its
// managerId and stages are what the rules give for the seeded users. Arjun's
// ₹3,200, Rohan's ₹2,150, Ananya's ₹8,400 and Vikram's ₹4,800 are from the
// static expenses.html; the ₹62,000 client visit is now Rohan's (Meenal Arora
// isn't a user) and the ₹6,200 software subscription Aarav's (nor is Neha
// Kulkarni).
const at = (date, time = "10:00") => `${date}T${time}:00.000Z`;
const applied = (userId, date) => ({ stage: "manager", byUserId: userId, decision: "applied", at: at(date, "09:30"), note: "" });
const skipped = (stage, date, note) => ({ stage, byUserId: null, decision: "skipped", at: at(date, "09:30"), note });
const by = (stage, userId, decision, date, note = "") => ({ stage, byUserId: userId, decision, at: at(date), note });
const auto = (stage, userId, date) => ({ stage, byUserId: userId, decision: "auto-approved", at: at(date, "09:30"), note: "Auto-approved (Admin)" });
const NO_MANAGER = "No manager on file";
const APPROVER_PAID = "Paid by the final approver: nobody else can pay this claim";

const SEED = [
  { id: "EXP-3101", userId: "EMP-1105", category: "meals", amount: 3200, date: "2026-08-02", reason: "Team dinner after the release",
    receipt: null, status: "rejected", stage: "done", managerId: "EMP-1029", appliedOn: "2026-08-02",
    history: [applied("EMP-1105", "2026-08-02"), by("manager", "EMP-1029", "approved", "2026-08-03"),
      by("finance", "EMP-1008", "rejected", "2026-08-04", "Bill missing: claims above ₹500 need a receipt.")] },
  { id: "EXP-3102", userId: "EMP-1042", category: "meals", amount: 2150, date: "2026-09-15", reason: "Team lunch after the sprint review",
    receipt: "bill.jpg", status: "paid", stage: "done", managerId: "EMP-1029", appliedOn: "2026-09-15",
    history: [applied("EMP-1042", "2026-09-15"), by("manager", "EMP-1029", "approved", "2026-09-16"),
      by("finance", "EMP-1008", "approved", "2026-09-17"), by("payment", "EMP-1001", "paid", "2026-09-22")] },
  { id: "EXP-3103", userId: "EMP-1042", category: "travel", amount: 62000, date: "2026-09-14", reason: "Client visit, Bengaluru: flights and four nights' hotel",
    receipt: "bills.zip", status: "pending", stage: "admin", managerId: "EMP-1029", appliedOn: "2026-09-18",
    history: [applied("EMP-1042", "2026-09-18"), by("manager", "EMP-1029", "approved", "2026-09-21"),
      by("finance", "EMP-1008", "approved", "2026-09-23")] },
  { id: "EXP-3104", userId: "EMP-1017", category: "travel", amount: 8400, date: "2026-09-16", reason: "Client travel: train and cabs to Jaipur",
    receipt: "bill.pdf", status: "pending", stage: "finance", managerId: null, appliedOn: "2026-09-17",
    history: [applied("EMP-1017", "2026-09-17"), skipped("manager", "2026-09-17", NO_MANAGER)] },
  { id: "EXP-3105", userId: "EMP-1088", category: "fuel", amount: 4800, date: "2026-09-12", reason: "Fuel for store deliveries, 1 to 12 Sep",
    receipt: "fuel-sep.pdf", status: "pending", stage: "finance", managerId: null, appliedOn: "2026-09-12",
    history: [applied("EMP-1088", "2026-09-12"), skipped("manager", "2026-09-12", NO_MANAGER)] },
  { id: "EXP-3106", userId: "EMP-1105", category: "travel", amount: 1850, date: "2026-09-24", reason: "Cab to the client office in Noida and back",
    receipt: "cab-receipts.pdf", status: "pending", stage: "manager", managerId: "EMP-1029", appliedOn: "2026-09-25",
    history: [applied("EMP-1105", "2026-09-25")] },
  { id: "EXP-3107", userId: "EMP-1001", category: "software", amount: 6200, date: "2026-09-10", reason: "Design tool subscription, one year",
    receipt: "invoice.pdf", status: "approved", stage: "payment", managerId: null, appliedOn: "2026-09-10",
    history: [applied("EMP-1001", "2026-09-10"), auto("manager", "EMP-1001", "2026-09-10"), auto("finance", "EMP-1001", "2026-09-10")] },
];

const expenses = createCollection({ key: "expense-claims", version: 1, seed: () => SEED, idPrefix: "EXP-" });

// ---------- small helpers ----------

const pad = (n) => String(n).padStart(2, "0");

// Today's date where the person is (local calendar), as ISO.
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const STAGE_ROLE = { finance: "fin", admin: "admin" };
// Each stage as words say it ("the Finance stage"); ui/expense-view.js shows the same names.
export const STAGE_NAME = { manager: "manager", finance: "Finance", admin: "Admin" };
const roleCan = (roleKey, permission) => Boolean(ROLES[roleKey]?.permissions.includes(permission));
const isActive = (user) => Boolean(user) && user.status !== "inactive";

// May this user (a stored user record) decide the claim at its current stage?
// Never their own claim; otherwise the stage's rule above.
function holdsStage(claim, stage, user) {
  if (!isActive(user) || user.id === claim.userId) return false;
  if (stage === "manager") return user.id === claim.managerId;
  return user.role === STAGE_ROLE[stage] && roleCan(user.role, "expenses:approve");
}

// The ids of everyone who may decide this stage of the claim.
function holdersOf(claim, stage) {
  return getAllUsers().filter((u) => holdsStage(claim, stage, u)).map((u) => u.id);
}

const isHeldFor = (claim) => (stage) => holdersOf(claim, stage).length > 0;

// The last approval entry (a person's, or an Admin's own auto-approval), or null.
function finalApprovalOf(claim) {
  return [...claim.history].reverse().find((h) => h.decision === "approved" || h.decision === "auto-approved") ?? null;
}

// Who gave the last approval, or null.
const finalApproverOf = (claim) => finalApprovalOf(claim)?.byUserId ?? null;

// Someone active with expenses:pay, never the claimant.
const mayPay = (claim, user) => isActive(user) && roleCan(user.role, "expenses:pay") && user.id !== claim.userId;

// Approving and paying are kept apart, but when nobody other than the final
// approver may pay (e.g. Kabir's own claim, approved by Aarav), the approver
// pays rather than leaving the claim stuck. Worked out at payment time, from
// the people as they are then.
function approverMustPay(claim) {
  const approver = finalApproverOf(claim);
  return !getAllUsers().some((u) => u.id !== approver && mayPay(claim, u));
}

function canPay(claim, user) {
  return mayPay(claim, user) && (user.id !== finalApproverOf(claim) || approverMustPay(claim));
}

// One "skipped" history entry per stage passed over.
const skipEntries = (stages, now) => stages.map((stage) => ({
  stage, byUserId: null, decision: "skipped", at: now,
  note: stage === "manager" ? NO_MANAGER : `Nobody else can decide the ${STAGE_NAME[stage]} stage`,
}));

// ---------- writes ----------

// fields: { category, amount, date, reason, receipt }. Anything else is ignored.
// Success: { ok: true, record, advisories: [{ code, message }] }, as applyLeave.
export function submitExpense(userId, fields = {}) {
  const user = getUser(userId);
  if (!user) return fail(`No employee with id ${userId}.`);
  if (user.status === "inactive") return fail(`${user.name} is inactive and can't send expense claims.`);

  const category = String(fields.category ?? "");
  const amount = typeof fields.amount === "number" ? fields.amount : Number(String(fields.amount ?? "").trim() || NaN);
  const date = String(fields.date ?? "").trim();
  const reason = String(fields.reason ?? "").trim();
  const receipt = String(fields.receipt ?? "").trim() || null;

  if (!Object.hasOwn(CATEGORIES, category)) return fail("Choose a category.", "category");   // not inherited names like "constructor"
  if (!Number.isSafeInteger(amount) || amount <= 0) return fail("Enter the amount in whole rupees, more than ₹0.", "amount");
  if (dayNumber(date) === null) return fail("Pick a valid date.", "date");
  const today = todayIso();
  const age = dayNumber(today) - dayNumber(date);
  if (age < 0) return fail("The date can't be in the future.", "date");
  if (age > EXPENSE_POLICY.claimWithinDays) return fail(`Claims must be sent within ${EXPENSE_POLICY.claimWithinDays} days of the spending.`, "date");
  if (!reason) return fail("Reason is required.", "reason");

  const advisories = [];
  if (needsReceipt(amount) && !receipt) {
    advisories.push({ code: "receipt", message: `Claims above ₹${EXPENSE_POLICY.receiptAbove} need a receipt. Without one, this claim may be rejected.` });
  }

  const managerId = managerFor(user.id);
  const chain = chainFor(amount);
  const now = new Date().toISOString();
  const draft = { userId: user.id, category, amount, date, reason, receipt, managerId, appliedOn: today };
  const history = [{ stage: chain[0], byUserId: user.id, decision: "applied", at: now, note: "" }];

  let status = "pending";
  let stage;
  if (user.role === "admin") {
    chain.forEach((s) => history.push({ stage: s, byUserId: user.id, decision: "auto-approved", at: now, note: "Auto-approved (Admin)" }));
    status = "approved";
    stage = "payment";
  } else {
    const first = firstStage(chain, isHeldFor(draft));
    if (!first.stage) return fail("Nobody can approve this claim at the moment. Ask an Admin.");
    history.push(...skipEntries(first.skipped, now));
    stage = first.stage;
  }

  const result = expenses.add({ ...draft, status, stage, history });
  return result.ok ? { ...result, advisories } : result;
}

// decision: "approve" | "reject", for the claim's current stage only (see the
// top of the file for who holds each). Approving moves the claim to the next
// stage someone holds, or to "payment" after the last; rejecting ends it at
// any stage and needs a note.
export function decideExpense(claimId, deciderUserId, deciderRole, decision, note = "") {
  const claim = expenses.get(claimId);
  if (!claim) return fail(`No expense claim ${claimId}.`);
  const decider = getUser(deciderUserId);
  if (!isActive(decider) || decider.role !== deciderRole) return fail("You can't decide expense claims.");
  if (deciderUserId === claim.userId) return fail("You can't decide your own expense claim.");
  if (claim.status !== "pending") return fail(`This claim is already ${claim.status}.`);
  if (!holdsStage(claim, claim.stage, decider)) {
    const who = { manager: "the claimant's manager", finance: "Finance", admin: "an Admin" }[claim.stage];
    return fail(`Only ${who} can decide this claim at the ${STAGE_NAME[claim.stage]} stage.`);
  }
  if (decision !== "approve" && decision !== "reject") return fail('Decision must be "approve" or "reject".');
  const text = String(note ?? "").trim();
  if (decision === "reject" && !text) return fail("Add a note saying why the claim is rejected.", "note");

  const now = new Date().toISOString();
  const entry = { stage: claim.stage, byUserId: deciderUserId, decision: decision === "approve" ? "approved" : "rejected", at: now, note: text };
  if (decision === "reject") {
    return expenses.update(claimId, { status: "rejected", stage: "done", history: [...claim.history, entry] });
  }
  const next = nextStage(chainFor(claim.amount), claim.stage, isHeldFor(claim));
  return expenses.update(claimId, {
    status: next.stage ? "pending" : "approved",
    stage: next.stage ?? "payment",
    history: [...claim.history, entry, ...skipEntries(next.skipped, now)],
  });
}

// Marks an approved claim paid. Only someone with expenses:pay, never on their
// own claim, and not the person who gave the final approval while anyone else
// can pay (approving and paying are kept apart, as preparing and approving a
// payroll run are). When the approver pays, the entry's note says why.
export function payExpense(claimId, payerUserId) {
  const claim = expenses.get(claimId);
  if (!claim) return fail(`No expense claim ${claimId}.`);
  const payer = getUser(payerUserId);
  if (!isActive(payer) || !roleCan(payer.role, "expenses:pay")) return fail("Only Finance or an Admin can pay expense claims.");
  if (payerUserId === claim.userId) return fail("You can't pay your own expense claim.");
  if (claim.status === "pending") return fail("This claim is still waiting for approval.");
  if (claim.status !== "approved") return fail(`This claim is already ${claim.status}.`);
  const byApprover = payerUserId === finalApproverOf(claim);
  if (byApprover && !approverMustPay(claim)) return fail("Whoever gave the final approval can't also pay the claim while someone else can.");

  const entry = { stage: "payment", byUserId: payerUserId, decision: "paid", at: new Date().toISOString(), note: byApprover ? APPROVER_PAID : "" };
  return expenses.update(claimId, { status: "paid", stage: "done", history: [...claim.history, entry] });
}

// Only the person who sent it, only while it's waiting for approval.
export function cancelExpense(claimId, userId) {
  const claim = expenses.get(claimId);
  if (!claim) return fail(`No expense claim ${claimId}.`);
  if (claim.userId !== userId) return fail("Only the person who sent this claim can cancel it.");
  if (claim.status !== "pending") return fail(`This claim is already ${claim.status}, so it can't be cancelled.`);
  const entry = { stage: claim.stage, byUserId: userId, decision: "cancelled", at: new Date().toISOString(), note: "" };
  return expenses.update(claimId, { status: "cancelled", stage: "done", history: [...claim.history, entry] });
}

// ---------- reads (always deep copies) ----------

export function allExpenses() {
  return expenses.getAll();
}

export function getExpense(id) {
  return expenses.get(id);
}

export function expensesFor(userId) {
  return expenses.getAll().filter((c) => c.userId === userId);
}

// Pending claims waiting on this person at their current stage: as their
// manager, or as Finance / Admin. Never their own. [] for an unknown or
// inactive person, or a roleKey that isn't theirs.
export function pendingFor(deciderUserId, roleKey) {
  const decider = getUser(deciderUserId);
  if (!isActive(decider) || decider.role !== roleKey) return [];
  return expenses.getAll().filter((c) => c.status === "pending" && holdsStage(c, c.stage, decider));
}

// Approved claims this person may mark paid.
export function payableFor(payerUserId) {
  const payer = getUser(payerUserId);
  return expenses.getAll().filter((c) => c.status === "approved" && canPay(c, payer));
}

// The ids of the people a claim is waiting on: whoever may decide its current
// stage while pending, whoever may pay it once approved, [] after that. An
// approved claim nobody may pay (nobody but the claimant holds expenses:pay)
// gives [].
export function waitingOn(claim) {
  if (!claim) return [];
  if (claim.status === "pending") return holdersOf(claim, claim.stage);
  if (claim.status === "approved") return getAllUsers().filter((u) => canPay(claim, u)).map((u) => u.id);
  return [];
}

// Where a claim of this amount from this person would go if sent now, by the
// same rules submitExpense() and decideExpense() use (nothing is stored):
// [{ stage, holderIds }] in order, holderIds [] for a stage that would be
// skipped. A later stage's holders are worked out from the people as they are
// now; the real claim checks again when it gets there. [] for an Admin (their
// claims are approved at once) or someone unknown.
export function previewRoute(userId, amount) {
  const user = getUser(userId);
  if (!isActive(user) || user.role === "admin") return [];
  const draft = { userId: user.id, managerId: managerFor(user.id) };
  const chain = chainFor(amount);
  const first = firstStage(chain, isHeldFor(draft));
  const stages = first.stage && !chain.includes(first.stage) ? [...chain, first.stage] : chain;
  return stages.map((stage) => ({ stage, holderIds: holdersOf(draft, stage) }));
}

// Does anyone (active) report to this person? Such a person decides their
// reports' claims at the manager stage, whatever their role.
export function managesAnyone(userId) {
  return Boolean(userId) && getAllUsers().some((u) => u.id !== userId && managerFor(u.id) === userId);
}

// The claims this person decided: one { claim, entry } per claim, entry being
// their latest "approved" or "rejected" history entry on it (auto-approvals
// of their own claims and payments aren't decisions). Newest decision first.
export function expenseDecisionsBy(userId) {
  return expenses.getAll()
    .map((claim) => ({ claim, entry: [...claim.history].reverse().find((h) => h.byUserId === userId && (h.decision === "approved" || h.decision === "rejected")) }))
    .filter((d) => d.entry)
    .sort((a, b) => b.entry.at.localeCompare(a.entry.at) || b.claim.id.localeCompare(a.claim.id, "en", { numeric: true }));
}

// ---------- totals ----------

const blank = () => ({ count: 0, amount: 0 });
const STATUSES = ["pending", "approved", "paid", "rejected", "cancelled"];

// Over any list of claims: how many and how much, overall, by status and by
// category (every status and category is present, at 0 if none).
export function expenseTotals(claims) {
  const out = {
    ...blank(),
    byStatus: Object.fromEntries(STATUSES.map((s) => [s, blank()])),
    byCategory: Object.fromEntries(CATEGORY_KEYS.map((c) => [c, blank()])),
  };
  for (const c of claims) {
    for (const t of [out, out.byStatus[c.status], out.byCategory[c.category]]) {
      if (!t) continue;
      t.count += 1;
      t.amount += c.amount;
    }
  }
  return out;
}

// How many and how much per department code, by each claimant's current
// department ("" for someone no longer on the list or with none).
export function totalsByDepartment(claims) {
  const out = {};
  for (const c of claims) {
    const code = getUser(c.userId)?.department ?? "";
    out[code] ??= blank();
    out[code].count += 1;
    out[code].amount += c.amount;
  }
  return out;
}

// ---------- processing time ----------

const DAY_MS = 24 * 60 * 60 * 1000;

// Days (with a fraction) from sending a claim to its final approval, for an
// approved or paid claim; null for any other status. Also null for a claim
// auto-approved when it was sent (an Admin's own): nobody processed it, so it
// would only pull an average down (leave-approvals.js leaves those out too).
export function processingDays(claim) {
  if (claim.status !== "approved" && claim.status !== "paid") return null;
  const last = finalApprovalOf(claim);
  if (!last || last.decision === "auto-approved") return null;
  return (Date.parse(last.at) - Date.parse(claim.history[0].at)) / DAY_MS;
}

// The average processingDays() over the claims that have one, or null if none do.
export function averageProcessingDays(claims) {
  const days = claims.map(processingDays).filter((d) => d !== null);
  return days.length ? days.reduce((a, b) => a + b, 0) / days.length : null;
}

// ---------- reset ----------

// Throws away every change to expense claims in this browser.
export function resetExpenseData() {
  expenses.reset();
}