// data/reporting.js
// Who reports to whom, in one place (Manager scoping part 2). The rule is the
// approval chain's manager stage, not a second one: a person's manager is
// managerFor() in leave-store.js (their reportingManagerId, while that person
// is active and isn't themselves), the manager every leave request, attendance
// correction, expense claim and asset request is sent to. So someone is a
// manager exactly when a request from a report would reach them, and stops
// being one while they're on leave or inactive (their reports' requests go to
// HR then). Direct reports only: a report's own reports are never included.
// Being a manager is a relationship, not a role or a permission: Sneha Rao
// (Employee) manages Rohan and Arjun, Kabir Shah (Finance) manages Meera.
// expenses-store.js managesAnyone() is isManager() below.

import { getAllUsers } from "./store.js";
import { managerFor } from "./leave-store.js";

// The manager's id, or null (none on record, or they can't act as one now).
export function managerOf(userId) {
  return userId ? managerFor(userId) : null;
}

// The user records whose manager is this person, by name; [] for nobody.
// Everyone on record counts, inactive people too (their old requests may still
// be listed); a page that shows only active people leaves them out itself.
export function directReportsOf(userId) {
  if (!userId) return [];
  return getAllUsers().filter((u) => u.id !== userId && managerFor(u.id) === userId).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

// Does anyone report to this person?
export function isManager(userId) {
  return directReportsOf(userId).length > 0;
}

// Whose records a page shows this person: null for everyone (seesAll: they
// hold the page's own permission, e.g. attendance:view-all), else the ids of
// their direct reports (an empty Set for nobody).
export function teamScope(userId, seesAll) {
  return seesAll ? null : new Set(directReportsOf(userId).map((u) => u.id));
}