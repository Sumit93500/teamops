// ui/waiting.js
// What waits for a person's decision: the real rows of the approvals inbox's
// Pending tab. The inbox (pages/approvals-inbox.js) lists them and the
// sidebar's Approvals count (ui/sidebar.js) counts them, so the two can't
// disagree.
//   - leave requests and attendance corrections: pendingFor() in
//     data/leave-store.js and pendingRegularizations() in
//     data/attendance-store.js judge each stage (data/approval-chain.js): the
//     requester's manager by relationship (no permission), then HR / an Admin
//   - expense claims: pendingFor() in data/expenses-store.js judges each stage
//     itself (the claimant's manager decides by relationship, no permission)
//   - asset requests: pendingFor() in data/asset-requests-store.js, the same
//     way (the requester's manager, then an Admin with assets:approve)
//   - salary changes (round 12Z): a waiting one for whoever may decide it,
//     proposalDecidersFor() in data/payroll-store.js (by record: an Admin who
//     neither proposed it nor would be paid by it), only with salary:view (no
//     one else sees a salary change)
// The inbox's static sample rows aren't counted: nothing real waits behind them.
// A session without an employee id (an old sign-in) has nothing: the inbox
// lists no real rows for it.

import { can } from "../core/rbac.js";
import { getUser } from "../data/store.js";
import { pendingFor as pendingLeave } from "../data/leave-store.js";
import { pendingRegularizations } from "../data/attendance-store.js";
import { pendingFor as pendingExpenses } from "../data/expenses-store.js";
import { pendingFor as pendingAssetRequests } from "../data/asset-requests-store.js";
import { salaryProposals, proposalDecidersFor } from "../data/payroll-store.js";

// { leave, corrections, expenses, assets, salary }: arrays, in store order.
export function waitingFor(userId, roleKey) {
  if (!getUser(userId)) return { leave: [], corrections: [], expenses: [], assets: [], salary: [] };
  return {
    leave: pendingLeave(userId, roleKey),
    corrections: pendingRegularizations(userId, roleKey),
    expenses: pendingExpenses(userId, roleKey),
    assets: pendingAssetRequests(userId, roleKey),
    salary: can("salary:view") ? salaryProposals().filter((p) => p.status === "pending" && proposalDecidersFor(p).some((u) => u.id === userId)) : [],
  };
}

export function waitingCount(userId, roleKey) {
  const { leave, corrections, expenses, assets, salary } = waitingFor(userId, roleKey);
  return leave.length + corrections.length + expenses.length + assets.length + salary.length;
}