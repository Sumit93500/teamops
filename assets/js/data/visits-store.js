// data/visits-store.js (CV1, 2026-11-16): where client / official / off-site visits are kept, and the plain reads on them. Storage only:
// nothing here decides who may do what (data/visits.js does) and nothing here reads attendance, so data/shift-days.js can read it.
//
// Saved under "officeos:visits" as { version: 1, seq, visits: [visit] }. A visit:
//   { id "VS-n", personId, kind, siteName, address, purpose, fromDate, toDate, dates: ["YYYY-MM-DD"], allowOffDay,
//     source: "self" | "assigned", assignedBy, sameDay, approvalPending, managerId,
//     status: pending | approved | rejected | cancelled | in-progress | completed,
//     approvedBy, approvedAt, decisionReason, createdAt,
//     days: { "<date>": { in: Punch | null, out: Punch | null } }, history: [{ at, by, action, note }] }
//   Punch: { time "HH:MM" (office time), lat, lng, accuracy (metres), source: "gps" | "unavailable", lowAccuracy, reason,
//            needsOk, okBy, okAt, okNote }
// `dates` are the days the visit is worked, fixed when it is made (a weekly off or holiday inside a range is left out unless the
// assigner allowed it), so a later change of the holiday list does not move a visit.
// The statuses that count in attendance: approved, in-progress, completed (a same-day visit counts while its approval is waiting).
//
//   allVisits()  getVisit(id)  visitsFor(personId)  visitOnDate(personId, date)  readBox()  writeBox(box)  resetVisits()

import { remove } from "../core/storage.js";
import { pureBox } from "./places.js";

const KEY = "visits";
export const VISIT_KINDS = ["client", "official", "offsite"];
export const KIND_LABEL = { client: "Client visit", official: "Official visit", offsite: "Off-site work" };
export const STATUS_LABEL = { pending: "Pending", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled", "in-progress": "In progress", completed: "Completed", planned: "Planned" };
export const COUNTING = ["approved", "in-progress", "completed"];
export const LIVE = ["pending", "approved", "in-progress", "completed"];   // the statuses that block another visit on the same day

const store = pureBox(KEY, 1, () => ({ visits: [], seq: 1 }), (b) => Array.isArray(b.visits));
const copy = (v) => JSON.parse(JSON.stringify(v));

export const readBox = () => store.read();
export const writeBox = (box) => store.write(box);
export const allVisits = () => copy(store.read().visits);
export const getVisit = (id) => copy(store.read().visits.find((v) => v.id === id) ?? null);
export const visitsFor = (personId) => copy(store.read().visits.filter((v) => v.personId === personId));

// The visit that counts for a person on a date, with that day's punches, or null. -> { visit fields..., day: { in, out } }
export function visitOnDate(personId, date) {
  const v = store.read().visits.find((x) => x.personId === personId && x.dates.includes(date) && COUNTING.includes(x.status));
  if (!v) return null;
  const day = v.days?.[date] ?? { in: null, out: null };
  return copy({ id: v.id, kind: v.kind, siteName: v.siteName, address: v.address, purpose: v.purpose, status: v.status, sameDay: v.sameDay, approvalPending: v.approvalPending, source: v.source, day });
}

export function resetVisits() {
  remove(KEY);
}