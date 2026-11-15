// What waits for a person's decision, in the React app (L2): ui/waiting.js's five kinds plus home location changes
// (data/locations-store.js pendingLocationChanges: an Admin with locations:review, never their own). The inbox lists
// them; its stat, the sidebar's Approvals count, the topbar's bell and the Admin dashboard's card count them from here,
// so they can't disagree. The old site's ui/waiting.js is unchanged (it has no location pages).
import { waitingFor as oldWaitingFor } from "../../../assets/js/ui/waiting.js";
import { pendingLocationChanges } from "../../../assets/js/data/locations-store.js";
import { getUser } from "../../../assets/js/data/store.js";
import { pendingProfileChanges } from "../../../assets/js/data/employee-record.js";
import { pendingOvertime } from "../../../assets/js/data/overtime-store.js";
import { pendingUnlockRequests } from "../../../assets/js/data/lockouts.js";

// { leave, corrections, expenses, assets, salary, locations, profile, overtime }: arrays, in store order. E1: profile, a person's own bank or
// tax change waiting for Finance (salary:edit) or HR / Admin (users:edit), never for themself (data/employee-record.js).
// F2: unlock, a locked account waiting for the Admin (accounts:unlock; data/lockouts.js), while the lock is on.
// SH1: overtime, a day's overtime waiting for the person's manager (HR or an Admin for someone without one; data/overtime-store.js).
export function waitingFor(userId, roleKey) {
  const known = Boolean(getUser(userId));
  return { ...oldWaitingFor(userId, roleKey), locations: known ? pendingLocationChanges(userId, roleKey) : [], profile: known ? pendingProfileChanges(userId) : [], overtime: known ? pendingOvertime(userId) : [], unlock: known ? pendingUnlockRequests(userId) : [] };
}

export function waitingCount(userId, roleKey) {
  return Object.values(waitingFor(userId, roleKey)).reduce((n, list) => n + list.length, 0);
}