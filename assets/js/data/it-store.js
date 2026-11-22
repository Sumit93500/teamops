// data/it-store.js (IT1, 2026-11-22): where the IT desk keeps its records, and the one check every credential step made for a request
// goes through. data/it-desk.js runs the workflows; data/credentials.js asks executionGrant() before it makes, resets, unlocks or
// disables a sign-in for a request, so a direct call can't skip the approval.
//
// "officeos:it-desk" { version: 1, next: { req, tl, act, note }, requests, timeline, activity, notices, sla }, read through pureBox (a
// read stores nothing):
//   request   { id "ITR-n", type, requesterId, subjectPersonId, title, details, priority, status, assignedTo, dueAt, createdAt,
//               payload (the type's own fields), prepared, preparedBy, approvedBy, workedBy [ids], checklist (offboarding), closedNote }
//   timeline  { id "TL-n", requestId, at, actorId, kind, note }: only ever added (it-rules.js TIMELINE_KINDS)
//   activity  { id "IA-n", at, actorId, kind, requestId, personId, override, summary, reviewedBy, reviewedAt }: the Admin's review
//             trail; only reviewedBy / reviewedAt are ever set afterwards, once
//   notices   { id "NT-n", personId, requestId, kind assigned | approved | rejected | done, at, readAt }: what the bell will show
//   sla       null (the defaults) or { low, normal, high, urgent } hours

import { pureBox } from "./places.js";
import { getUser } from "./store.js";
import { permissionsOf } from "../config/roles.js";
import { remove } from "../core/storage.js";
import { executionRefusal, isSensitive } from "./it-rules.js";

const KEY = "it-desk";
const box = pureBox(KEY, 1, () => ({ next: { req: 1, tl: 1, act: 1, note: 1 }, requests: [], timeline: [], activity: [], notices: [], sla: null }),
  (b) => b.next && ["req", "tl", "act", "note"].every((k) => Number.isInteger(b.next[k])) && ["requests", "timeline", "activity", "notices"].every((k) => Array.isArray(b[k])));
export const readItBox = () => box.read();
export const writeItBox = (b) => box.write(b);
export function resetItDesk() { remove(KEY); }

export const pushTimeline = (b, requestId, actorId, kind, note, now) => {
  const entry = { id: `TL-${b.next.tl}`, requestId, at: new Date(now).toISOString(), actorId, kind, note: note ?? "" };
  b.timeline.push(entry);
  b.next.tl += 1;
  return entry;
};
export const pushActivity = (b, { actorId, kind, requestId = null, personId = null, override = false, summary }, now) => {
  const entry = { id: `IA-${b.next.act}`, at: new Date(now).toISOString(), actorId, kind, requestId, personId, override: Boolean(override), summary, reviewedBy: null, reviewedAt: null };
  b.activity.push(entry);
  b.next.act += 1;
  return entry;
};
export const pushNotice = (b, personId, requestId, kind, now) => {
  if (!personId) return null;
  const entry = { id: `NT-${b.next.note}`, personId, requestId, kind, at: new Date(now).toISOString(), readAt: null };
  b.notices.push(entry);
  b.next.note += 1;
  return entry;
};

// Records an Admin's direct action on the review trail, flagged as an override (credentials.js: an Admin making someone's sign-in
// details from the employee form or the profile). Cancels any open new-account request for that person, which is no longer needed.
export function recordAdminOverride(actorId, personId, kind, summary, now) {
  const b = box.read();
  pushActivity(b, { actorId, kind, personId, override: true, summary }, now);
  for (const r of b.requests.filter((x) => x.type === "new-account" && x.subjectPersonId === personId && !["done", "cancelled"].includes(x.status))) {
    r.status = "cancelled";
    r.closedNote = "An Admin made the sign-in details directly.";
    pushTimeline(b, r.id, actorId, "cancelled", r.closedNote, now);
  }
  return box.write(b);
}

// May this person carry out this credential step for this request now? -> { ok, request, subject } or { ok: false, error }.
// types: the request types the step belongs to; preparerOnly: only whoever prepared it (the new-account hand-over, never an override).
export function executionGrant(requestId, actorId, types, { override = null, preparerOnly = false } = {}) {
  const request = box.read().requests.find((r) => r.id === requestId);
  if (!request || !types.includes(request.type)) return { ok: false, error: "No such request for this step." };
  const actor = getUser(actorId);
  const subject = request.subjectPersonId ? getUser(request.subjectPersonId) : null;
  if (preparerOnly && (override || request.preparedBy !== actor?.id)) return { ok: false, error: "Only the IT person who prepared it hands the sign-in details over." };
  const why = executionRefusal(request, actor, permissionsOf, { override, sensitive: isSensitive(request.type, subject?.role) });
  return why ? { ok: false, error: why } : { ok: true, request: JSON.parse(JSON.stringify(request)), subject };
}