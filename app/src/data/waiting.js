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
import { pendingVisitItems } from "../../../assets/js/data/visits.js";   // CV1
import { pendingItApprovals } from "../../../assets/js/data/it-desk.js";   // IT2

// { leave, corrections, expenses, assets, salary, locations, profile, overtime }: arrays, in store order. E1: profile, a person's own bank or
// tax change waiting for Finance (salary:edit) or HR / Admin (users:edit), never for themself (data/employee-record.js).
// F2: unlock, a locked account waiting for the Admin (accounts:unlock; data/lockouts.js), while the lock is on.
// CV1: visits, a client / official visit waiting for the person's manager (HR or an Admin for someone without one; data/visits.js).
// CV1b: visitLocations, a punch made as "location unavailable" waiting for the same approver's OK (Accept with a note, or Reject with a reason).
// SH1: overtime, a day's overtime waiting for the person's manager (HR or an Admin for someone without one; data/overtime-store.js).
// IT2: itApprovals, an IT request waiting for this Admin (data/it-desk.js pendingItApprovals; the inbox, the card, the bell, the sidebar's count and the
// Admin dashboard all count it from here, once). The card shows who it is about, so each carries that as userId. assets: the old asset-request chain
// (manager, then an Admin) is closed: nothing new is made and nothing waits on it; its history stays readable in My requests.
const itItem = (r) => ({ ...r, userId: r.subjectPersonId ?? r.requesterId, requestedAt: r.createdAt });
export function waitingFor(userId, roleKey) {
  const known = Boolean(getUser(userId));
  return { ...oldWaitingFor(userId, roleKey), assets: [], itApprovals: known ? pendingItApprovals(userId).map(itItem) : [], locations: known ? pendingLocationChanges(userId, roleKey) : [], profile: known ? pendingProfileChanges(userId) : [], overtime: known ? pendingOvertime(userId) : [], unlock: known ? pendingUnlockRequests(userId) : [], visits: known ? pendingVisitItems(userId).filter((x) => x.kind === "visit") : [], visitLocations: known ? pendingVisitItems(userId).filter((x) => x.kind === "location") : [] };
}

export function waitingCount(userId, roleKey) {
  return Object.values(waitingFor(userId, roleKey)).reduce((n, list) => n + list.length, 0);
}