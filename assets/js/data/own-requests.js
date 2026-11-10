// data/own-requests.js
// One person's own requests of every kind (leave, attendance corrections,
// expense claims and asset requests), each with the tab it belongs under:
// "pending", "approved" or "rejected" (or its own status otherwise, e.g.
// "cancelled"). My requests lists them by it, and the employee dashboard's
// Open requests counts the pending ones (round 14E part 4), so the two can't
// disagree. A paid expense claim counts as approved; an asset request that was
// approved but not handed over yet is still open, so pending; a fulfilled one
// is approved.

import { requestsFor } from "./leave-store.js";
import { regularizationsFor } from "./attendance-store.js";
import { expensesFor } from "./expenses-store.js";
import { assetRequestsFor } from "./asset-requests-store.js";

const TAB = {
  leave: (r) => r.status,
  attendance: (r) => r.status,
  expense: (r) => (r.status === "paid" ? "approved" : r.status),
  asset: (r) => ({ approved: "pending", fulfilled: "approved" })[r.status] ?? r.status,
};

// [{ kind: "leave" | "attendance" | "expense" | "asset", request, status }], in
// that order (each kind as its store lists it).
export function ownRequests(userId) {
  return [
    ...requestsFor(userId).map((request) => ({ kind: "leave", request })),
    ...regularizationsFor(userId).map((request) => ({ kind: "attendance", request })),
    ...expensesFor(userId).map((request) => ({ kind: "expense", request })),
    ...assetRequestsFor(userId).map((request) => ({ kind: "asset", request })),
  ].map((r) => ({ ...r, status: TAB[r.kind](r.request) }));
}

// The ones still open: what My requests lists under Pending.
export const openRequests = (userId) => ownRequests(userId).filter((r) => r.status === "pending");