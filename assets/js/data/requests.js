// data/requests.js
// A generic list of things waiting for someone's decision — role changes,
// purchase orders, asset requests, backup restores. This feeds both the
// approvals inbox (for approvers) and "my requests" (for the requester).

export const REQUESTS = [
  {
    id: "REQ-4401",
    type: "role-change",
    title: "Role change: Sneha Rao",
    requestedBy: "EMP-1003",     // Priya Nair, HR
    subjectUserId: "EMP-1029",   // Sneha Rao
    detail: "Employee to Team Lead",
    status: "pending",
    waitingOn: "admin",
  },
  {
    id: "REQ-4398",
    type: "purchase-order",
    title: "Purchase order PO-2291",
    requestedBy: "EMP-1088",     // Vikram Singh, Store
    detail: "10 laptops and 20 keyboards, ₹1,40,000",
    status: "pending",
    waitingOn: "admin",          // above ₹1,00,000, so it escalated past the Store Manager
  },
  {
    id: "REQ-4390",
    type: "asset-request",
    title: "Laptop upgrade",
    requestedBy: "EMP-1105",     // Arjun Kapoor
    detail: "Replaces AST-0188, 3 years old",
    status: "pending",
    waitingOn: "it-support",
  },
];

export function requestsFor(userId) {
  return REQUESTS.filter((r) => r.requestedBy === userId);
}

export function pendingApprovals() {
  return REQUESTS.filter((r) => r.status === "pending");
}