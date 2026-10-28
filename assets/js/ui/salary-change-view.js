// ui/salary-change-view.js
// A salary change waiting for an Admin (data/payroll-store.js's proposals,
// round 12X): its one-line description, and Approve / Reject through
// ui/leave-decision.js's flow (Approve asks with confirm(), Reject needs a
// note). salary-structure.html (round 12Y) and approvals-inbox.html (round
// 12Z) both use them, so the two behave the same: each decides as the
// signed-in person through decideSalaryProposal(), and its refusals show
// escaped. Toasts are fixed text.

import { decideSalaryProposal } from "../data/payroll-store.js";
import { createDecisionFlow } from "./leave-decision.js";
import { formatDay, nameOf } from "./leave-view.js";
import { rupees } from "./money.js";

// "Rohan Gupta: ₹1,00,000 a month from 1 Nov 2026, proposed by Kabir Shah"
export const describeChange = (p) => `${nameOf(p.userId)}: ${rupees(p.gross)} a month from ${formatDay(p.effectiveFrom, true)}, proposed by ${nameOf(p.enteredBy)}`;

// The employee never sees a salary change (R9c's ruling), so the note's
// placeholder says so.
export const salaryChangeFlow = createDecisionFlow({
  decide: (proposalId, actorUserId, _role, decision, note) => decideSalaryProposal(actorUserId, proposalId, decision, note),
  describe: describeChange,
  modalId: "reject-salary-modal",
  noteId: "reject-salary-note",
  labels: {
    title: "Reject salary change",
    approved: "Salary change approved.",
    rejected: "Salary change rejected.",
    submit: "Reject change",
    placeholder: "Kept with the salary change; the employee doesn't see it",
  },
});