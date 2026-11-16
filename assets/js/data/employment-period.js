// data/employment-period.js (F2, 2026-11-15): ONE answer to "when was this person employed?". Additive: it reads data/store.js's
// joiningDate / leavingDate / leavingPeriods and changes nothing there.
//
//   employmentPeriod(person)   { from, to, away }  from = the joining date ("YYYY-MM-DD", null when none can be read), to = the last
//                              working day (null while employed), away = [{ lastDay, back }] past periods away (a leaver who came back)
//   employmentState(person, date)  "before" (not yet joined) | "during" | "after" (left, or away in a past period)
//   isEmployedOn(person, date)     employmentState(...) === "during"
//   joinsOn(person, today)         the joining date when it is after today ("Joins on 1 Dec"), else null
//   isAppCreated(userId)           created in the app (not one of the seeded people): data/users.js's seed ids are the others. Such a
//                                  person starts with no history and their leave comes from the policy engine whatever the start date
//
// Everything that walks dates for a person (attendance, payroll days, leave accrual, the shift engine, overtime, the charts) goes
// through data/attendance-store.js deriveDay / data/payroll-store.js / data/leave-policy.js, which read the same three store functions;
// this module is the one named place that says what they mean, so a new walker has one thing to call.

import { getUser, joiningDate, leavingDate, leavingPeriods } from "./store.js";
import { USERS } from "./users.js";
import { createdOnOf } from "./created-on.js";   // F2b
import { allEvents } from "./audit-trail.js";   // F2b

const SEEDED = new Set(USERS.map((u) => u.id));

// F2b: the day a person was created in the app: the created-on key the add-employee write makes; failing that, the audit trail's first
// "account-created" event for them (people made before the key existed); null for anyone else.
function createdDay(userId) {
  const own = createdOnOf(userId);
  if (own) return own;
  const event = allEvents().reverse().find((e) => e.kind === "account-created" && e.userId === userId);
  return event ? new Date(Date.parse(event.at) + 330 * 60000).toISOString().slice(0, 10) : null;
}

// F2b: the joining date everything reads. The stored one; and for a person created in the app with none, the day they were
// created, never "long ago". Seeded people never fall back (their stored date, or none, is what it always was).
export function joinedOn(user) {
  const own = joiningDate(user?.dateOfJoining);
  if (own || !user || !isAppCreated(user.id)) return own;
  return createdDay(user.id);
}

export function employmentPeriod(person) {
  const user = typeof person === "string" ? getUser(person) : person;
  if (!user) return { from: null, to: null, away: [] };
  return { from: joinedOn(user), to: leavingDate(user), away: leavingPeriods(user) };
}

export function employmentState(person, date) {
  const { from, to, away } = employmentPeriod(person);
  if (from && date < from) return "before";
  if ((to && date > to) || away.some((p) => date > p.lastDay && date < p.back)) return "after";
  return "during";
}

export const isEmployedOn = (person, date) => employmentState(person, date) === "during";

export function joinsOn(person, today) {
  const { from } = employmentPeriod(person);
  return from && from > today ? from : null;
}

export const isAppCreated = (userId) => Boolean(userId) && !SEEDED.has(userId);