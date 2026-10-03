// ui/expense-view.js
// How an expense claim is shown wherever someone can act on it, written once
// so finance/expenses.html and the approvals inbox can't word it differently:
// the category, the stage badge, the one-line description, the approval chain
// as text, and the Approve / Reject flow. Both pages decide through the same
// decideExpense() (data/expenses-store.js) via this one flow.
//
// Toasts use fixed text only (toast.js uses innerHTML); names appear only in
// confirm() and the reject modal's description, which are plain text.

import { EXPENSE_POLICY, CATEGORIES, chainFor } from "../data/expenses.js";
import { decideExpense, STAGE_NAME } from "../data/expenses-store.js";
import { createDecisionFlow } from "./leave-decision.js";
import { el, formatDay, nameOf } from "./leave-view.js";
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