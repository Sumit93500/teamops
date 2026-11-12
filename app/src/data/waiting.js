// What waits for a person's decision, in the React app (L2): ui/waiting.js's five kinds plus home location changes
// (data/locations-store.js pendingLocationChanges: an Admin with locations:review, never their own). The inbox lists
// them; its stat, the sidebar's Approvals count, the topbar's bell and the Admin dashboard's card count them from here,
// so they can't disagree. The old site's ui/waiting.js is unchanged (it has no location pages).
import { waitingFor as oldWaitingFor } from "../../../assets/js/ui/waiting.js";
import { pendingLocationChanges } from "../../../assets/js/data/locations-store.js";
import { getUser } from "../../../assets/js/data/store.js";

// { leave, corrections, expenses, assets, salary, locations }: arrays, in store order.
export function waitingFor(userId, roleKey) {
  return { ...oldWaitingFor(userId, roleKey), locations: getUser(userId) ? pendingLocationChanges(userId, roleKey) : [] };
}

export function waitingCount(userId, roleKey) {
  return Object.values(waitingFor(userId, roleKey)).reduce((n, list) => n + list.length, 0);
}