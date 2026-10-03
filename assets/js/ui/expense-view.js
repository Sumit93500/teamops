// ui/expense-view.js
// How an expense claim is shown wherever someone can act on it, written once
// so finance/expenses.html and the approvals inbox can't word it differently:
// the category, the stage badge, the one-line description, the approval chain
// as text, the Approve / Reject flow, and a claim's progress steps for its
// claimant (my-requests.html). Both pages decide through the same
// decideExpense() (data/expenses-store.js) via this one flow.
//
// Toasts use fixed text only (toast.js uses innerHTML); names appear only in
// confirm() and the reject modal's description, which are plain text.

import { EXPENSE_POLICY, CATEGORIES, STAGES, chainFor } from "../data/expenses.js";
import { decideExpense, waitingOn, STAGE_NAME } from "../data/expenses-store.js";
import { createDecisionFlow } from "./leave-decision.js";
import { el, formatDay, localDateOf, nameOf, step } from "./leave-view.js";
import { rupees } from "./money.js";

// The stage names are the store's, so a page and the store's messages agree.
export { STAGE_NAME };

export const categoryLabel = (key) => CATEGORIES[key]?.label ?? key;

// A pending claim's badge names its current stage; any other claim's, its status.
const BADGE = {
  manager:  { label: "With manager", badge: "badge badge--warning badge--dot" },
  finance:  { label: "With Finance", badge: "badge badge--info badge--dot" },
  admin:    { label: "With Admin",   badge: "badge badge--warning badge--dot" },
  approved: { label: "Approved",     badge: "badge badge--success badge--dot" },
  paid:     { label: "Paid",         badge: "badge badge--success badge--dot" },
  rejected: { label: "Rejected",     badge: "badge badge--danger badge--dot" },
};

export function stageBadge(claim) {
  const look = BADGE[claim.status === "pending" ? claim.stage : claim.status];
  return el("span", look?.badge ?? "badge", look?.label ?? claim.status);
}

// "Rohan Gupta: Travel, ₹62,000, spent 14 Sep (EXP-3103)"
export const describeClaim = (claim) =>
  `${nameOf(claim.userId)}: ${categoryLabel(claim.category)}, ${rupees(claim.amount)}, spent ${formatDay(claim.date)} (${claim.id})`;

// The approval chain in words, from the rules: { always: "Manager, then
// Finance", extra: "an Admin" } (the stages every claim needs, and the ones
// added above EXPENSE_POLICY.adminAbove).
export function chainText() {
  const name = (s) => (s === "admin" ? "an Admin" : STAGE_NAME[s]);
  const always = chainFor(EXPENSE_POLICY.adminAbove);
  const extra = chainFor(EXPENSE_POLICY.adminAbove + 1).filter((s) => !always.includes(s));
  const first = STAGE_NAME[always[0]];
  return {
    always: [first.charAt(0).toUpperCase() + first.slice(1), ...always.slice(1).map((s) => STAGE_NAME[s])].join(", then "),
    extra: extra.map(name).join(", then "),
  };
}

// ---------- approve / reject ----------

// The toast after an approval says where the claim went: to the next stage,
// or ready to be paid after the last one.
export const expenseFlow = createDecisionFlow({
  decide: decideExpense,
  describe: describeClaim,
  modalId: "reject-expense-modal",
  noteId: "reject-expense-note",
  labels: {
    title: "Reject expense claim",
    approved: (result) => (result.record.status === "approved"
      ? "Claim approved. It's ready to be paid."
      : `Claim approved. It goes to ${result.record.stage === "admin" ? "an Admin" : "Finance"} next.`),
    rejected: "Claim rejected.",
  },
});

// ---------- progress ----------

const STEP_TITLE = { manager: "Manager approval", finance: "Finance approval", admin: "Admin approval" };
// Who decides a stage the claim hasn't reached yet.
const LATER = { finance: "Finance", admin: "An Admin" };

// The stages this claim goes through: its chain for the amount, plus any stage
// its history shows or that it's waiting at now (the Admin stage of a claim
// whose every stage was skipped, which has no history entry until decided),
// in STAGES order.
function stagesOf(claim) {
  const seen = new Set([...chainFor(claim.amount), ...claim.history.map((h) => h.stage), claim.stage].filter((s) => STAGES.includes(s)));
  return STAGES.filter((s) => seen.has(s));
}

const names = (ids) => ids.map(nameOf).join(", ");
const onDay = (at) => formatDay(localDateOf(at));

// The steps of a claim for its claimant (my-requests.html), from what its
// history recorded, not from the rules as they are now: sent; each approval
// stage (done by whom, skipped and why, current with whom it waits, or still
// to come); then payment.
export function expenseSteps(claim) {
  const steps = [step("done", 1, "Sent", `${formatDay(claim.appliedOn)} by you`)];
  for (const stage of stagesOf(claim)) {
    const n = steps.length + 1;
    const entry = [...claim.history].reverse().find((h) => h.stage === stage && h.decision !== "applied" && h.decision !== "cancelled");
    if (claim.status === "pending" && claim.stage === stage) {
      const ids = waitingOn(claim);
      steps.push(step("current", n, STEP_TITLE[stage], ids.length ? `Waiting for ${names(ids)}` : "Nobody can decide this now"));
    } else if (entry?.decision === "skipped") {
      steps.push(step("done", n, `${STEP_TITLE[stage]} skipped`, entry.note));
    } else if (entry?.decision === "approved") {
      steps.push(step("done", n, STEP_TITLE[stage], `Approved by ${nameOf(entry.byUserId)}, ${onDay(entry.at)}`));
    } else if (entry?.decision === "auto-approved") {
      steps.push(step("done", n, STEP_TITLE[stage], "Approved automatically (Admin)"));
    } else if (entry?.decision === "rejected") {
      steps.push(step("done", n, STEP_TITLE[stage], `Rejected by ${nameOf(entry.byUserId)}, ${onDay(entry.at)}`));
    } else {
      steps.push(step("", n, STEP_TITLE[stage], stage === "manager" ? (claim.managerId ? nameOf(claim.managerId) : "Your manager") : LATER[stage]));
    }
  }
  const n = steps.length + 1;
  const paid = [...claim.history].reverse().find((h) => h.decision === "paid");
  if (paid) {
    steps.push(step("done", n, "Payment", `Paid by ${nameOf(paid.byUserId)}, ${onDay(paid.at)}`));
  } else if (claim.status === "approved") {
    const ids = waitingOn(claim);
    steps.push(step("current", n, "Payment", ids.length ? `Waiting for ${names(ids)}` : "Nobody can pay this now"));
  } else {
    steps.push(step("", n, "Payment", "Finance or an Admin pays approved claims"));
  }
  return steps;
}