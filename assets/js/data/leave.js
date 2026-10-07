// data/leave.js
// Not used: nothing imports this file. These are early fixed demo leave
// constants, kept only as a record; they no longer match the requests in
// data/leave-store.js, which every leave page and dashboard reads.

export const LEAVE_TYPES = ["casual", "sick", "earned", "wfh", "unpaid"];

export const LEAVE_BALANCES = {
  "EMP-1105": { casual: { used: 6, total: 12 }, sick: { used: 3, total: 8 } },
  "EMP-1042": { casual: { used: 8, total: 12 }, sick: { used: 2, total: 8 } },
};

export const LEAVE_REQUESTS = [
  {
    id: "LV-2201",
    userId: "EMP-1105",
    type: "casual",
    from: "2026-10-03",
    to: "2026-10-03",
    days: 1,
    reason: "Personal work",
    status: "pending",          // pending | approved | rejected
    stage: "manager",           // manager | hr | done
    appliedOn: "2026-09-18",
  },
  {
    id: "LV-2189",
    userId: "EMP-1042",
    type: "casual",
    from: "2026-09-22",
    to: "2026-09-24",
    days: 3,
    reason: "Family function",
    status: "pending",
    stage: "hr",
    appliedOn: "2026-09-17",
  },
  {
    id: "LV-2160",
    userId: "EMP-1105",
    type: "wfh",
    from: "2026-08-12",
    to: "2026-08-12",
    days: 1,
    reason: "Home repairs",
    status: "approved",
    stage: "done",
    appliedOn: "2026-08-10",
  },
];

export function leaveBalanceFor(userId) {
  return LEAVE_BALANCES[userId] ?? null;
}

export function pendingLeaveFor(managerOrHr) {
  // Simplified: returns everything not yet fully approved.
  // The real approval-chain logic (who sees what) is decided in the RBAC engine, not here.
  return LEAVE_REQUESTS.filter((r) => r.status === "pending");
}