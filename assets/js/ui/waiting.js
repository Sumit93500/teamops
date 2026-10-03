// ui/waiting.js
// What waits for a person's decision: the real rows of the approvals inbox's
// Pending tab. The inbox (pages/approvals-inbox.js) lists them and the
// sidebar's Approvals count (ui/sidebar.js) counts them, so the two can't
// disagree.
//   - leave requests: only with leave:approve
//   - attendance corrections: only with attendance:approve
//   - expense claims: pendingFor() in data/expenses-store.js judges each stage
//     itself (the claimant's manager decides by relationship, no permission)
// The inbox's static sample rows aren't counted: nothing real waits behind them.
// A session without an employee id (an old sign-in) has nothing: the inbox
// lists no real rows for it.

import { can } from "../core/rbac.js";
import { getUser } from "../data/store.js";
import { pendingFor as pendingLeave } from "../data/leave-store.js";
import { pendingRegularizations } from "../data/attendance-store.js";
import { pendingFor as pendingExpenses } from "../data/expenses-store.js";

// { leave, corrections, expenses }: arrays, in store order.
export function waitingFor(userId, roleKey) {
  if (!getUser(userId)) return { leave: [], corrections: [], expenses: [] };
  return {
    leave: can("leave:approve") ? pendingLeave(userId, roleKey) : [],
    corrections: can("attendance:approve") ? pendingRegularizations(userId, roleKey) : [],
    expenses: pendingExpenses(userId, roleKey),
  };
}

export function waitingCount(userId, roleKey) {
  const { leave, corrections, expenses } = waitingFor(userId, roleKey);
  return leave.length + corrections.length + expenses.length;
}