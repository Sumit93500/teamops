// data/it-desk.js (IT1, 2026-11-22): the IT desk's workflows. Data, rules and permissions only: the IT screens come next round.
// Records: data/it-store.js; rules: data/it-rules.js; licences: data/licences.js; credentials: data/credentials.js (every credential
// step goes through its request-verified functions, which check the approval themselves).
//
// A request moves only along it-rules.js TRANSITIONS: open -> in progress (when an IT person is assigned) -> awaiting approval
// (sensitive ones, submitted by IT) -> approved or rejected (the Admin; a rejected one goes back to IT) -> done; or cancelled. Every
// step is a timeline entry, only ever added. Sensitive: new-account, access-request, offboarding, and a password reset or unlock for an
// account that holds Admin, HR or Finance. Non-sensitive ones are executed by IT alone and still land on the Admin's review trail.
//
// Who sees a request: whoever raised it, IT (it:requests-handle) and the Admin (it:approve). A manager sees what they raised, nothing
// more. Who works it: its IT assignee; an Admin only through the documented override (a reason; flagged on the trail), never the
// new-account hand-over. Who approves: it:approve, never the requester, the subject or anyone who worked on it; IT never.
//
// The main case (point 14): HR adds an employee -> newSignIn opens a new-account request (no credential exists) -> IT prepares it
// (prepareNewAccount: role, work email, department, manager, start date; never the Admin role unless an Admin raised it) and submits
// it -> the Admin approves (the prepared details are applied to the record as the Admin) or rejects with a reason (back to IT) -> the
// IT person who prepared it hands over (handOverAccount): the temporary password and the 48-hour link are made then and returned once,
// to them only. An Admin adding an employee keeps the direct flow (credentials.js createAccount: flagged "admin override").
//
//   requests   createRequest  newSignIn  openNewAccountRequest  assignRequest  addComment  prepareNewAccount  submitForApproval
//              approveRequest  rejectRequest  resumeRequest  cancelRequest
//   executing  handOverAccount  executeReset  executeUnlock  fulfilAssetRequest  fulfilAssetReturn  fulfilSoftwareRequest  resolveIssue
//   offboarding  openOffboarding  tickChecklist  executeOffboardingDisable  waiveOffboardingItem  completeOffboarding
//   reads      requestsFor  getItRequest  pendingItApprovals (IT_WAITING_KIND)  itQueue  overdueRequests  exitsWithoutOffboarding
//              itActivity  unreviewedCount  itNoticesFor   writes: markReviewed  markNoticeRead  setSlaHours   slaHours

import { getUser, getAllUsers, updateUser, onDeactivated, leavingDate, departmentChoices } from "./store.js";
import { hasPermission, permissionsOf, overridesOf, ROLES, ROLE_KEYS, OVERRIDABLE } from "../config/roles.js";
import { logEvent } from "./audit-trail.js";
import { readItBox, writeItBox, pushTimeline, pushActivity, pushNotice, executionGrant } from "./it-store.js";
import {
  TYPES, isSensitive, canMove, STATUSES, OPEN_STATUSES, PRIORITIES, SLA_DEFAULTS, SLA_MAX, dueAtFor, CHECKLIST, CHECKLIST_KEYS,
  approvalRefusal, executionRefusal, titleCheck, detailsCheck, noteCheck,
} from "./it-rules.js";
import { accountOf, createAccount, createAccountForRequest, resetForRequest, unlockForRequest, disableForRequest } from "./credentials.js";
import { issueAsset, returnAsset, getAssetFor, listAssets } from "./asset-register.js";
import { issuedTo } from "./stock-ledger.js";
import { assignSeat, seatsHeldBy } from "./licences.js";
import { managerOf } from "./reporting.js";
import { ASSET_CATEGORIES, EMAIL, text, date as dateCheck } from "./asset-rules.js";

export const IT_WAITING_KIND = "itApprovals";   // the waiting kind the inbox, bell, sidebar and Admin dashboard will count (screens round)

const copy = (v) => JSON.parse(JSON.stringify(v));
const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";
const officeDay = (now) => new Date(now + 330 * 60000).toISOString().slice(0, 10);
const active = (id) => { const u = id ? getUser(String(id)) : null; return u && u.status !== "inactive" ? u : null; };
const can = (u, p) => Boolean(u) && u.status !== "inactive" && hasPermission(u, p);
const isIT = (u) => can(u, "it:requests-handle") && u.role === "it";
const isApprover = (u) => can(u, "it:approve") && u.role !== "it";
const sees = (u, r) => Boolean(u) && (isIT(u) || isApprover(u) || r.requesterId === u.id);
const findReq = (b, id) => b.requests.find((r) => r.id === id) ?? null;
const subjectOf = (r) => (r.subjectPersonId ? getUser(r.subjectPersonId) : null);
const sensitiveNow = (r) => isSensitive(r.type, subjectOf(r)?.role);
const worked = (r, id) => { r.workedBy = [...new Set([...(r.workedBy ?? []), id])]; };
const nameOf = (id) => getUser(id)?.name ?? id;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const showDate = (iso) => `${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

// One status move, checked against TRANSITIONS, with its timeline entry.
function move(b, r, to, actorId, note, now) {
  if (!canMove(r.status, to)) return `This request is ${STATUSES[r.status]?.label.toLowerCase() ?? r.status}: it can't become ${STATUSES[to]?.label.toLowerCase() ?? to}.`;
  pushTimeline(b, r.id, actorId, "status", `${r.status} -> ${to}${note ? `: ${note}` : ""}`, now);
  r.status = to;
  return null;
}
function save(b) { return writeItBox(b); }
const audit = (actorId, kind, r, extra = "") => ({ actorId, userId: r.subjectPersonId ?? null, kind, detail: `${r.id} (${r.type})${extra ? `: ${extra}` : ""}` });

// ---------- raising requests ----------
const PERSONAL = ["password-reset", "account-unlock", "access-request", "asset-request", "asset-return", "software-request"];

function payloadOf(type, payload, subject) {
  const p = payload ?? {};
  if (type === "access-request") {
    if (p.permission && p.role) return fail("Ask for one permission or one role, not both.", "payload");
    if (p.permission) {
      if (!OVERRIDABLE.includes(p.permission)) return fail(`${p.permission} can't be granted on request: it stays with the role.`, "payload");
      if (permissionsOf(subject).includes(p.permission)) return fail(`${subject.name} already holds ${p.permission}.`, "payload");
      return { ok: true, payload: { permission: p.permission } };
    }
    if (p.role) {
      if (!ROLE_KEYS.includes(p.role)) return fail("Choose a role.", "payload");
      if (p.role === "admin") return fail("The Admin role is given by an Admin in the employee form, not on request.", "payload");
      if (subject.role === p.role) return fail(`${subject.name} already has the ${ROLES[p.role].label} role.`, "payload");
      return { ok: true, payload: { role: p.role } };
    }
    return fail("Say which permission or role is needed.", "payload");
  }
  if (type === "asset-request") {
    if (!Object.hasOwn(ASSET_CATEGORIES, String(p.category ?? ""))) return fail("Choose the kind of asset.", "payload");
    return { ok: true, payload: { category: p.category } };
  }
  if (type === "asset-return") {
    const tag = text(p.assetTag, "Asset tag", { min: 3, max: 20, required: true });
    return tag.error ? fail(tag.error, "payload") : { ok: true, payload: { assetTag: tag.value.toUpperCase() } };
  }
  if (type === "software-request") {
    const s = text(p.software, "Software", { min: 2, max: 80, required: true });
    return s.error ? fail(s.error, "payload") : { ok: true, payload: { software: s.value } };
  }
  return { ok: true, payload: {} };
}

function addRequest(b, actor, { type, subject, title, details, priority, payload }, now) {
  const createdAt = new Date(now).toISOString();
  const r = { id: `ITR-${b.next.req}`, type, requesterId: actor.id, subjectPersonId: subject?.id ?? null, title, details, priority, status: "open", assignedTo: null,
    dueAt: dueAtFor(createdAt, priority, b.sla ?? SLA_DEFAULTS), createdAt, payload, prepared: null, preparedBy: null, approvedBy: null, workedBy: [],
    checklist: type === "offboarding" ? CHECKLIST.map((c) => ({ key: c.key, done: false, by: null, at: null, waived: null })) : null, closedNote: null };
  b.requests.push(r);
  b.next.req += 1;
  pushTimeline(b, r.id, actor.id, "created", title, now);
  return r;
}

// Anyone (it:requests-create) raises a request for themself; for someone else only their manager, IT or HR / the Admin (users:edit).
// fields: { type, subjectPersonId, title, details, priority, payload }. new-account and offboarding have their own ways in.
export function createRequest(actorId, fields = {}, now = Date.now()) {
  const actor = active(actorId);
  if (!can(actor, "it:requests-create")) return fail("You can't raise IT requests.");
  const type = String(fields.type ?? "");
  if (!Object.hasOwn(TYPES, type)) return fail("Choose a type of request.", "type");
  if (type === "new-account") return fail("A new-account request opens when HR adds the employee.", "type");
  if (type === "offboarding") return fail("Offboarding opens when someone is given a last working day (or HR or IT opens it).", "type");
  let subject = null;
  if (PERSONAL.includes(type)) {
    subject = getUser(String(fields.subjectPersonId ?? actor.id));
    if (!subject) return fail("Choose a person from the list.", "subjectPersonId");
    if (subject.id !== actor.id && !(managerOf(subject.id) === actor.id || isIT(actor) || can(actor, "users:edit"))) return fail("You can raise this only for yourself or for your direct reports.", "subjectPersonId");
    if (type !== "asset-return" && subject.status === "inactive") return fail(`${subject.name} has left: no request can be raised for them.`, "subjectPersonId");
  }
  const title = titleCheck(fields.title);
  if (title.error) return fail(title.error, "title");
  const details = detailsCheck(fields.details);
  if (details.error) return fail(details.error, "details");
  const priority = fields.priority ?? "normal";
  if (!PRIORITIES.includes(priority)) return fail("Choose low, normal, high or urgent.", "priority");
  const payload = payloadOf(type, fields.payload, subject);
  if (!payload.ok) return payload;
  const b = readItBox();
  const r = addRequest(b, actor, { type, subject, title: title.value, details: details.value, priority, payload: payload.payload }, now);
  if (!save(b)) return fail(SAVE_FAILED);
  logEvent(audit(actor.id, "it-request-created", r), now);
  return { ok: true, record: copy(r) };
}

// The employee form's sign-in step for someone just added (and the profile's "make sign-in details"): an Admin makes them directly
// (credentials.js createAccount, the flagged override); anyone else (HR) opens a new-account request for IT instead.
export async function newSignIn(actorId, personId, now = Date.now()) {
  const actor = active(actorId);
  if (actor?.role === "admin") return createAccount(actorId, personId, now);
  const opened = openNewAccountRequest(actorId, personId, now);
  return opened.ok ? { ok: true, requested: true, requestId: opened.record.id } : opened;
}

export function openNewAccountRequest(actorId, personId, now = Date.now()) {
  const actor = active(actorId);
  if (!can(actor, "users:create")) return fail("You can't ask for sign-in details for someone.");
  const person = getUser(String(personId ?? ""));
  if (!person) return fail("That employee doesn't exist.", "subjectPersonId");
  if (person.status === "inactive") return fail(`${person.name} has left: no sign-in can be made for them.`, "subjectPersonId");
  if (accountOf(person.id, now).status !== "none") return fail(`${person.name} already has a sign-in.`, "subjectPersonId");
  const b = readItBox();
  if (b.requests.some((r) => r.type === "new-account" && r.subjectPersonId === person.id && OPEN_STATUSES.includes(r.status))) return fail(`There is already an open sign-in request for ${person.name}.`, "subjectPersonId");
  const r = addRequest(b, actor, { type: "new-account", subject: person, title: `Sign-in for ${person.name}`, details: "", priority: "high", payload: {} }, now);
  if (!save(b)) return fail(SAVE_FAILED);
  logEvent(audit(actor.id, "it-request-created", r), now);
  return { ok: true, record: copy(r) };
}

// ---------- working requests ----------
// IT (or the Admin) gives a request to an IT person; an open one starts then (in progress). The requester is told.
export function assignRequest(actorId, requestId, assigneeId, now = Date.now()) {
  const actor = active(actorId);
  if (!(isIT(actor) || isApprover(actor))) return fail("Only IT or an Admin assigns IT requests.");
  const assignee = active(assigneeId);
  if (!isIT(assignee)) return fail("Assign it to someone in IT.", "assignedTo");
  const b = readItBox();
  const r = findReq(b, requestId);
  if (!r) return fail(`No request ${requestId}.`);
  if (!["open", "in-progress", "rejected", "approved"].includes(r.status)) return fail(`This request is ${STATUSES[r.status].label.toLowerCase()}: it can't be reassigned now.`);
  if (r.subjectPersonId === assignee.id || r.requesterId === assignee.id) return fail("Assign it to someone in IT other than the person it's about or who raised it.", "assignedTo");
  r.assignedTo = assignee.id;
  pushTimeline(b, r.id, actor.id, "assigned", assignee.id, now);
  if (r.status === "open") move(b, r, "in-progress", actor.id, "", now);
  pushNotice(b, r.requesterId, r.id, "assigned", now);
  if (!save(b)) return fail(SAVE_FAILED);
  logEvent(audit(actor.id, "it-request-assigned", r, `to ${assignee.id}`), now);
  return { ok: true, record: copy(r) };
}

export function addComment(actorId, requestId, note, now = Date.now()) {
  const actor = active(actorId);
  const b = readItBox();
  const r = findReq(b, requestId);
  if (!r || !sees(actor, r)) return fail("You can't see this request.");
  const n = noteCheck(note, "Comment");
  if (n.error) return fail(n.error, "note");
  const entry = pushTimeline(b, r.id, actor.id, "comment", n.value, now);
  if (!save(b)) return fail(SAVE_FAILED);
  return { ok: true, record: copy(entry) };
}

const assigneeOnly = (actor, r) => (isIT(actor) && r.assignedTo === actor.id ? null : "Only the IT person it's assigned to can do this.");

// IT prepares a new-account request: { role, email, department, managerId, startDate "YYYY-MM-DD" }. Never the Admin role unless an
// Admin raised the request. Stored on the request; applied to the record only when the Admin approves.
export function prepareNewAccount(actorId, requestId, fields = {}, now = Date.now()) {
  const actor = active(actorId);
  const b = readItBox();
  const r = findReq(b, requestId);
  if (!r || r.type !== "new-account") return fail(`No new-account request ${requestId}.`);
  const why = assigneeOnly(actor, r) ?? (can(actor, "it:account-prepare") ? null : "You can't prepare accounts.");
  if (why) return fail(why);
  if (r.status !== "in-progress") return fail(`This request is ${STATUSES[r.status].label.toLowerCase()}: prepare it while it's in progress.`);
  const subject = subjectOf(r);
  if (!subject || subject.status === "inactive") return fail("The employee has left or no longer exists: cancel the request.");
  const role = String(fields.role ?? "");
  if (!ROLE_KEYS.includes(role)) return fail("Choose a role.", "role");
  if (role === "admin" && getUser(r.requesterId)?.role !== "admin") return fail("IT can't prepare an Admin account: only an Admin can ask for one.", "role");
  const email = String(fields.email ?? "").trim();
  if (!EMAIL.test(email) || email.length > 120) return fail("Enter a valid work email.", "email");
  if (getAllUsers().some((u) => u.id !== subject.id && String(u.email ?? "").toLowerCase() === email.toLowerCase())) return fail(`${email} is already used by another employee.`, "email");
  const department = String(fields.department ?? "");
  if (!departmentChoices().some((d) => d.code === department)) return fail("Choose a department.", "department");
  const managerId = String(fields.managerId ?? "").trim() || null;
  if (managerId && (!active(managerId) || managerId === subject.id)) return fail("Choose an active manager other than the employee.", "managerId");
  const start = dateCheck(fields.startDate, "Start date");
  if (start.error) return fail(start.error, "startDate");
  r.prepared = { role, email, department, managerId, startDate: start.value };
  r.preparedBy = actor.id;
  worked(r, actor.id);
  pushTimeline(b, r.id, actor.id, "comment", `Prepared: ${ROLES[role].label}, ${department}, starts ${start.value}`, now);
  if (!save(b)) return fail(SAVE_FAILED);
  return { ok: true, record: copy(r) };
}

// IT sends a sensitive request to the Admin (a new-account one only once prepared).
export function submitForApproval(actorId, requestId, note = "", now = Date.now()) {
  const actor = active(actorId);
  const b = readItBox();
  const r = findReq(b, requestId);
  if (!r) return fail(`No request ${requestId}.`);
  const why = assigneeOnly(actor, r);
  if (why) return fail(why);
  if (!sensitiveNow(r)) return fail("This request doesn't need an Admin's approval: carry it out.");
  if (r.type === "new-account" && !r.prepared) return fail("Prepare the account first.");
  const n = String(note ?? "").trim() ? noteCheck(note) : { value: "" };
  if (n.error) return fail(n.error, "note");
  const bad = move(b, r, "awaiting-approval", actor.id, n.value, now);
  if (bad) return fail(bad);
  worked(r, actor.id);
  if (!save(b)) return fail(SAVE_FAILED);
  logEvent(audit(actor.id, "it-request-submitted", r), now);
  return { ok: true, record: copy(r) };
}

// The Admin approves (it:approve; never their own, about themself, or one they worked on). A new-account request's prepared details
// are applied to the record (as the Admin); an access request's permission or role is applied through the override mechanism (as the
// Admin) and the request is done; an offboarding's access overrides are removed. No credential is made here.
export function approveRequest(actorId, requestId, note = "", now = Date.now()) {
  const actor = active(actorId);
  const b = readItBox();
  const r = findReq(b, requestId);
  if (!r) return fail(`No request ${requestId}.`);
  const why = approvalRefusal(r, actor, permissionsOf);
  if (why) return fail(why);
  const n = String(note ?? "").trim() ? noteCheck(note) : { value: "" };
  if (n.error) return fail(n.error, "note");
  const subject = subjectOf(r);
  let applied = null;
  if (r.type === "new-account") {
    const p = r.prepared;
    if (!p) return fail("This request was never prepared.");
    const dept = departmentChoices().find((d) => d.code === p.department);
    const manager = p.managerId ? getUser(p.managerId) : null;
    const changes = { role: p.role, email: p.email, department: dept.code, dateOfJoining: showDate(p.startDate),
      reportingManagerId: p.managerId, reportingManager: manager?.name ?? "" };
    const keep = Object.fromEntries(Object.entries(changes).filter(([k, v]) => String(subject[k] ?? "") !== String(v ?? "")));
    if (Object.keys(keep).length) {
      const res = updateUser(actor.id, subject.id, keep);
      if (!res.ok) return fail(`The prepared details can't be applied: ${res.error}`);
      applied = Object.keys(keep).join(", ");
    }
  } else if (r.type === "access-request") {
    const res = r.payload.permission
      ? updateUser(actor.id, subject.id, { grantPermissions: [...new Set([...(overridesOf(subject).grants), r.payload.permission])], denyPermissions: overridesOf(subject).denies.filter((x) => x !== r.payload.permission) })
      : updateUser(actor.id, subject.id, { role: r.payload.role });
    if (!res.ok) return fail(`The change can't be applied: ${res.error}`);
    applied = r.payload.permission ?? `role ${r.payload.role}`;
  } else if (r.type === "offboarding") {
    const o = overridesOf(subject);
    if (o.grants.length || o.denies.length) {
      const res = updateUser(actor.id, subject.id, { grantPermissions: [], denyPermissions: [] });
      if (!res.ok) return fail(`The access overrides can't be removed: ${res.error}`);
      applied = "access overrides removed";
    }
  }
  move(b, r, "approved", actor.id, n.value, now);
  r.approvedBy = actor.id;
  pushTimeline(b, r.id, actor.id, "approved", n.value || (applied ? `Applied: ${applied}` : ""), now);
  pushActivity(b, { actorId: actor.id, kind: "approved", requestId: r.id, personId: r.subjectPersonId, summary: `Approved ${TYPES[r.type].label.toLowerCase()} ${r.id}${applied ? ` (applied: ${applied})` : ""}` }, now);
  pushNotice(b, r.requesterId, r.id, "approved", now);
  if (r.type === "access-request") {
    pushTimeline(b, r.id, actor.id, "executed", `Applied through the permission overrides: ${applied}`, now);
    move(b, r, "done", actor.id, "", now);
    pushNotice(b, r.requesterId, r.id, "done", now);
    if (r.subjectPersonId !== r.requesterId) pushNotice(b, r.subjectPersonId, r.id, "done", now);
  }
  if (!save(b)) return fail(SAVE_FAILED);
  logEvent(audit(actor.id, "it-request-approved", r, applied ? `applied ${applied}` : ""), now);
  return { ok: true, record: copy(r) };
}

// The Admin rejects with a reason; the request goes back to IT (resumeRequest) or is cancelled.
export function rejectRequest(actorId, requestId, reason, now = Date.now()) {
  const actor = active(actorId);
  const b = readItBox();
  const r = findReq(b, requestId);
  if (!r) return fail(`No request ${requestId}.`);
  const why = approvalRefusal(r, actor, permissionsOf);
  if (why) return fail(why);
  const n = noteCheck(reason, "Reason");
  if (n.error) return fail(n.error, "reason");
  move(b, r, "rejected", actor.id, "", now);
  pushTimeline(b, r.id, actor.id, "rejected", n.value, now);
  pushActivity(b, { actorId: actor.id, kind: "rejected", requestId: r.id, personId: r.subjectPersonId, summary: `Rejected ${TYPES[r.type].label.toLowerCase()} ${r.id}` }, now);
  pushNotice(b, r.requesterId, r.id, "rejected", now);
  if (!save(b)) return fail(SAVE_FAILED);
  logEvent(audit(actor.id, "it-request-rejected", r), now);
  return { ok: true, record: copy(r) };
}

export function resumeRequest(actorId, requestId, note = "", now = Date.now()) {
  const actor = active(actorId);
  const b = readItBox();
  const r = findReq(b, requestId);
  if (!r) return fail(`No request ${requestId}.`);
  const why = assigneeOnly(actor, r);
  if (why) return fail(why);
  const bad = move(b, r, "in-progress", actor.id, String(note ?? "").trim().slice(0, 500), now);
  if (bad) return fail(bad);
  if (!save(b)) return fail(SAVE_FAILED);
  return { ok: true, record: copy(r) };
}

// The requester or IT cancels a request that isn't finished, with a reason.
export function cancelRequest(actorId, requestId, reason, now = Date.now()) {
  const actor = active(actorId);
  const b = readItBox();
  const r = findReq(b, requestId);
  if (!r || !sees(actor, r)) return fail("You can't see this request.");
  if (!(r.requesterId === actor.id || isIT(actor))) return fail("Only whoever raised it, or IT, can cancel it.");
  const n = noteCheck(reason, "Reason");
  if (n.error) return fail(n.error, "reason");
  const bad = move(b, r, "cancelled", actor.id, "", now);
  if (bad) return fail(bad);
  r.closedNote = n.value;
  pushTimeline(b, r.id, actor.id, "cancelled", n.value, now);
  if (!save(b)) return fail(SAVE_FAILED);
  logEvent(audit(actor.id, "it-request-cancelled", r), now);
  return { ok: true, record: copy(r) };
}

// ---------- executing ----------
// Closes an executed request: the timeline, the review trail (flagged when an Admin used the override), the requester's notice.
function finish(b, r, actor, summary, override, now, kind = "executed") {
  worked(r, actor.id);
  pushTimeline(b, r.id, actor.id, "executed", `${summary}${override ? ` (admin override: ${override})` : ""}`, now);
  move(b, r, "done", actor.id, "", now);
  pushActivity(b, { actorId: actor.id, kind, requestId: r.id, personId: r.subjectPersonId, override: Boolean(override), summary: `${summary}${override ? " (admin override)" : ""}` }, now);
  pushNotice(b, r.requesterId, r.id, "done", now);
}
function closeExecuted(requestId, actorId, summary, override, now, kind) {
  const b = readItBox();
  const r = findReq(b, requestId);
  finish(b, r, getUser(actorId), summary, override, now, kind);
  if (!save(b)) return false;
  logEvent(audit(actorId, "it-request-executed", r, summary), now);
  if (override) logEvent(audit(actorId, "it-override", r, String(override)), now);
  return true;
}
// The checks every execution makes (it-rules.js executionRefusal, through it-store.js executionGrant).
const gate = (requestId, actorId, types, override) => executionGrant(requestId, actorId, types, { override });
const overrideText = (o) => (o == null ? null : String(o).trim());

// The new-account hand-over: once approved, the IT person who prepared it gets the temporary password and the link, once.
export async function handOverAccount(actorId, requestId, now = Date.now()) {
  const made = await createAccountForRequest(actorId, requestId, now);
  if (!made.ok) return made;
  closeExecuted(requestId, actorId, `Sign-in details made for ${nameOf(readItBox().requests.find((r) => r.id === requestId).subjectPersonId)} and handed over (not kept)`, null, now, "credential-issued");
  return made;
}

// A password reset (mode "link" or "temp"): the secret comes back once to whoever carries it out.
export async function executeReset(actorId, requestId, mode = "link", now = Date.now(), { override = null } = {}) {
  const res = await resetForRequest(actorId, requestId, mode, now, { override: overrideText(override) });
  if (!res.ok) return res;
  closeExecuted(requestId, actorId, `Password reset (${mode === "temp" ? "temporary password" : "reset link"}) issued, not kept`, overrideText(override), now, "credential-issued");
  return res;
}

export function executeUnlock(actorId, requestId, now = Date.now(), { override = null } = {}) {
  const res = unlockForRequest(actorId, requestId, now, { override: overrideText(override) });
  if (!res.ok) return res;
  closeExecuted(requestId, actorId, "Account unlocked", overrideText(override), now);
  return res;
}

// An asset request: IT issues an asset (data/asset-register.js issueAsset); the request closes with its tag.
export function fulfilAssetRequest(actorId, requestId, assetTag, { condition = "good", notes = "" } = {}, now = Date.now(), { override = null } = {}) {
  const g = gate(requestId, actorId, ["asset-request"], overrideText(override));
  if (!g.ok) return fail(g.error);
  const person = g.subject ?? getUser(g.request.requesterId);
  const res = issueAsset(actorId, assetTag, { personId: person.id, condition, notes }, now);
  if (!res.ok) return res;
  closeExecuted(requestId, actorId, `Issued ${res.record.tag} to ${person.id}`, overrideText(override), now);
  const b = readItBox(); findReq(b, requestId).closedNote = res.record.tag; save(b);
  return { ok: true, assetTag: res.record.tag };
}

// An asset return: the asset named on the request, back from the person it is about.
export function fulfilAssetReturn(actorId, requestId, { condition = "good", notes = "" } = {}, now = Date.now(), { override = null } = {}) {
  const g = gate(requestId, actorId, ["asset-return"], overrideText(override));
  if (!g.ok) return fail(g.error);
  const tag = g.request.payload.assetTag;
  const asset = getAssetFor(actorId, tag);
  if (!asset || asset.status !== "assigned" || asset.holderId !== g.request.subjectPersonId) return fail(`${tag} isn't issued to ${nameOf(g.request.subjectPersonId)}.`);
  const res = returnAsset(actorId, tag, { condition, notes }, now);
  if (!res.ok) return res;
  closeExecuted(requestId, actorId, `Took back ${tag} from ${g.request.subjectPersonId}`, overrideText(override), now);
  const b = readItBox(); findReq(b, requestId).closedNote = tag; save(b);
  return { ok: true, assetTag: tag };
}

// A software request: a seat on a licence (data/licences.js assignSeat).
export function fulfilSoftwareRequest(actorId, requestId, licenceId, now = Date.now(), { override = null } = {}) {
  const g = gate(requestId, actorId, ["software-request"], overrideText(override));
  if (!g.ok) return fail(g.error);
  const res = assignSeat(actorId, licenceId, g.request.subjectPersonId, now);
  if (!res.ok) return res;
  closeExecuted(requestId, actorId, `Seat ${res.record.id} on ${licenceId}`, overrideText(override), now);
  return { ok: true, seat: res.record };
}

// A general ticket: resolved with a note.
export function resolveIssue(actorId, requestId, note, now = Date.now(), { override = null } = {}) {
  const g = gate(requestId, actorId, ["it-issue"], overrideText(override));
  if (!g.ok) return fail(g.error);
  const n = noteCheck(note, "Resolution");
  if (n.error) return fail(n.error, "note");
  closeExecuted(requestId, actorId, `Resolved: ${n.value}`, overrideText(override), now);
  return { ok: true };
}

// ---------- offboarding ----------
// Opens a person's offboarding with its checklist (one open at a time). By HR or the Admin (users:deactivate), IT (it:offboard), or
// on its own when someone is deactivated (the store's hook, below).
export function openOffboarding(actorId, personId, now = Date.now()) {
  const actor = active(actorId);
  if (!(can(actor, "users:deactivate") || can(actor, "it:offboard"))) return fail("You can't open an offboarding.");
  const person = getUser(String(personId ?? ""));
  if (!person) return fail("That employee doesn't exist.", "subjectPersonId");
  if (person.id === actor.id) return fail("You can't open your own offboarding.", "subjectPersonId");
  const b = readItBox();
  if (b.requests.some((r) => r.type === "offboarding" && r.subjectPersonId === person.id && OPEN_STATUSES.includes(r.status))) return fail(`${person.name}'s offboarding is already open.`, "subjectPersonId");
  const r = addRequest(b, actor, { type: "offboarding", subject: person, title: `Offboarding: ${person.name}`, details: leavingDate(person) ? `Last working day ${leavingDate(person)}` : "", priority: "high", payload: {} }, now);
  if (!save(b)) return fail(SAVE_FAILED);
  logEvent(audit(actor.id, "it-request-created", r), now);
  return { ok: true, record: copy(r) };
}
onDeactivated((actorId, personId) => openOffboarding(actorId, personId, Date.now()));

function offboardingStep(actorId, requestId, override) {
  const actor = active(actorId);
  const b = readItBox();
  const r = findReq(b, requestId);
  if (!r || r.type !== "offboarding") return { error: `No offboarding ${requestId}.` };
  // the checklist's ordinary items can be worked before the approval (in progress) or after it (approved)
  const why = executionRefusal({ ...r, status: r.status === "approved" ? "in-progress" : r.status }, actor, permissionsOf, { override });
  if (why) return { error: why };
  if (!can(actor, "it:offboard") && !override) return { error: "You can't work offboarding." };
  return { actor, b, r };
}
const itemOf = (r, key) => r.checklist.find((c) => c.key === key);

// IT ticks an item once it holds: no assets or stock still with the person, no licence seats, no access overrides.
export function tickChecklist(actorId, requestId, key, now = Date.now(), { override = null } = {}) {
  const s = offboardingStep(actorId, requestId, overrideText(override));
  if (s.error) return fail(s.error);
  const { actor, b, r } = s;
  if (!CHECKLIST_KEYS.includes(key) || key === "disable-signin") return fail(key === "disable-signin" ? "Disabling the sign-in is carried out, once approved, not ticked." : "No such checklist item.");
  const item = itemOf(r, key);
  if (item.done || item.waived) return fail("That item is already done.");
  const person = r.subjectPersonId;
  if (key === "return-assets") {
    const held = listAssets(actor.id, { status: "assigned" }).filter((a) => a.holderId === person).map((a) => a.tag);
    const stock = issuedTo(actor.id, person);
    if (held.length || stock.length) return fail(`Still with them: ${[...held, ...stock.map((x) => `${x.qty} ${x.unit} ${x.name}`)].join(", ")}. Take them back first, or ask the Admin to waive it.`);
  }
  if (key === "revoke-licences" && seatsHeldBy(actor.id, person).length) return fail("They still hold licence seats: revoke them first.");
  if (key === "remove-overrides") { const o = overridesOf(getUser(person)); if (o.grants.length || o.denies.length) return fail("Their access overrides are still there: they go when the Admin approves the offboarding."); }
  Object.assign(item, { done: true, by: actor.id, at: new Date(now).toISOString() });
  worked(r, actor.id);
  pushTimeline(b, r.id, actor.id, "comment", `Checklist: ${CHECKLIST.find((c) => c.key === key).label} done${override ? ` (admin override: ${overrideText(override)})` : ""}`, now);
  if (override) pushActivity(b, { actorId: actor.id, kind: "override", requestId: r.id, personId: person, override: true, summary: `Ticked "${key}" through the admin override` }, now);
  if (!save(b)) return fail(SAVE_FAILED);
  logEvent(audit(actor.id, "it-checklist-ticked", r, key), now);
  return { ok: true, record: copy(r) };
}
// "Disable sign-in": a sensitive step, only once the Admin approved the offboarding, on or after the last working day.
export function executeOffboardingDisable(actorId, requestId, now = Date.now(), { override = null } = {}) {
  const res = disableForRequest(actorId, requestId, now, { override: overrideText(override) });
  const nothing = !res.ok && (res.code === "none" || res.code === "same");
  if (!res.ok && !nothing) return res;
  const b = readItBox();
  const r = findReq(b, requestId);
  const item = itemOf(r, "disable-signin");
  if (item.done) return fail("The sign-in is already disabled.");
  Object.assign(item, { done: true, by: actorId, at: new Date(now).toISOString() });
  worked(r, actorId);
  const summary = nothing ? `Sign-in for ${r.subjectPersonId}: ${res.code === "none" ? "there was none to disable" : "already disabled"}` : `Sign-in disabled for ${r.subjectPersonId} (nothing deleted)`;
  pushTimeline(b, r.id, actorId, "executed", `${summary}${override ? ` (admin override: ${overrideText(override)})` : ""}`, now);
  pushActivity(b, { actorId, kind: "disabled", requestId: r.id, personId: r.subjectPersonId, override: Boolean(override), summary }, now);
  if (!save(b)) return fail(SAVE_FAILED);
  logEvent(audit(actorId, "it-request-executed", r, "sign-in disabled"), now);
  if (override) logEvent(audit(actorId, "it-override", r, overrideText(override)), now);
  return { ok: true, record: copy(r) };
}

// The Admin waives "return assets" with a reason (the checklist can't be completed otherwise while something is still out).
export function waiveOffboardingItem(actorId, requestId, key, reason, now = Date.now()) {
  const actor = active(actorId);
  if (!isApprover(actor)) return fail("Only an Admin can waive a checklist item.");
  if (key !== "return-assets") return fail("Only returning assets can be waived.");
  const n = noteCheck(reason, "Reason");
  if (n.error) return fail(n.error, "reason");
  const b = readItBox();
  const r = findReq(b, requestId);
  if (!r || r.type !== "offboarding" || !OPEN_STATUSES.includes(r.status)) return fail(`No open offboarding ${requestId}.`);
  const item = itemOf(r, key);
  if (item.done || item.waived) return fail("That item is already done.");
  item.waived = { by: actor.id, at: new Date(now).toISOString(), reason: n.value };
  pushTimeline(b, r.id, actor.id, "comment", `Checklist: return assets waived by the Admin: ${n.value}`, now);
  pushActivity(b, { actorId: actor.id, kind: "override", requestId: r.id, personId: r.subjectPersonId, override: true, summary: `Waived "return assets" for ${r.subjectPersonId}` }, now);
  if (!save(b)) return fail(SAVE_FAILED);
  logEvent(audit(actor.id, "it-override", r, `waived return-assets: ${n.value}`), now);
  return { ok: true, record: copy(r) };
}

// Done once approved and every item done or waived.
export function completeOffboarding(actorId, requestId, now = Date.now(), { override = null } = {}) {
  const g = gate(requestId, actorId, ["offboarding"], overrideText(override));
  if (!g.ok) return fail(g.error);
  const open = g.request.checklist.filter((c) => !c.done && !c.waived).map((c) => c.key);
  if (open.length) return fail(`Not finished yet: ${open.join(", ")}.`);
  closeExecuted(requestId, actorId, `Offboarding of ${g.request.subjectPersonId} completed`, overrideText(override), now);
  return { ok: true };
}

// ---------- reads ----------
const withTimeline = (b, r) => ({ ...copy(r), timeline: copy(b.timeline.filter((t) => t.requestId === r.id)) });

// The requests this person may see, newest first; filters: status, type, mine (raised by them).
export function requestsFor(viewerId, { status = null, type = null, mine = false } = {}) {
  const v = active(viewerId);
  if (!v) return [];
  return copy(readItBox().requests.filter((r) => sees(v, r) && (!status || r.status === status) && (!type || r.type === type) && (!mine || r.requesterId === v.id)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || Number(b.id.slice(4)) - Number(a.id.slice(4)));
}
export function getItRequest(viewerId, requestId) {
  const v = active(viewerId);
  const b = readItBox();
  const r = findReq(b, requestId);
  return r && sees(v, r) ? withTimeline(b, r) : null;
}
// What waits for this Admin's decision (the IT_WAITING_KIND list).
export function pendingItApprovals(viewerId) {
  const v = active(viewerId);
  if (!isApprover(v)) return [];
  return copy(readItBox().requests.filter((r) => r.status === "awaiting-approval" && !approvalRefusal(r, v, permissionsOf))).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
// IT's queue: every unfinished request, the soonest due first.
export function itQueue(viewerId) {
  const v = active(viewerId);
  if (!(isIT(v) || isApprover(v))) return [];
  return copy(readItBox().requests.filter((r) => OPEN_STATUSES.includes(r.status))).sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id));
}
export function overdueRequests(viewerId, now = Date.now()) {
  const at = new Date(now).toISOString();
  return itQueue(viewerId).filter((r) => r.dueAt < at && r.status !== "awaiting-approval");
}
// People who have left with no offboarding on record.
export function exitsWithoutOffboarding(viewerId) {
  const v = active(viewerId);
  if (!(isIT(v) || isApprover(v))) return [];
  const b = readItBox();
  return getAllUsers().filter((u) => u.status === "inactive" && !b.requests.some((r) => r.type === "offboarding" && r.subjectPersonId === u.id))
    .map((u) => ({ personId: u.id, name: u.name, lastDay: leavingDate(u) }));
}
// The Admin's review trail (it:activity-review), newest first. Filters: kind, actorId, personId, override (true / false), reviewed (true / false).
export function itActivity(viewerId, { kind = null, actorId = null, personId = null, override = null, reviewed = null } = {}) {
  const v = active(viewerId);
  if (!can(v, "it:activity-review")) return [];
  return copy(readItBox().activity.filter((a) => (!kind || a.kind === kind) && (!actorId || a.actorId === actorId) && (!personId || a.personId === personId)
    && (override === null || a.override === override) && (reviewed === null || Boolean(a.reviewedBy) === reviewed))).reverse();
}
export const unreviewedCount = (viewerId) => itActivity(viewerId, { reviewed: false }).length;
export function markReviewed(actorId, activityId, now = Date.now()) {
  const actor = active(actorId);
  if (!can(actor, "it:activity-review")) return fail("Only an Admin reviews IT activity.");
  const b = readItBox();
  const a = b.activity.find((x) => x.id === activityId);
  if (!a) return fail(`No activity ${activityId}.`);
  if (a.reviewedBy) return fail("Already reviewed.");
  if (a.actorId === actor.id && a.override) return fail("Someone else reviews your own override.");
  a.reviewedBy = actor.id;
  a.reviewedAt = new Date(now).toISOString();
  if (a.requestId) pushTimeline(b, a.requestId, actor.id, "reviewed", a.id, now);
  if (!save(b)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, userId: a.personId, kind: "it-reviewed", detail: a.id }, now);
  return { ok: true, record: copy(a) };
}
// What the bell will tell this person about their requests (assigned, approved, rejected, done), newest first.
export function itNoticesFor(viewerId, { unreadOnly = false } = {}) {
  const v = active(viewerId);
  if (!v) return [];
  return copy(readItBox().notices.filter((n) => n.personId === v.id && (!unreadOnly || !n.readAt))).reverse();
}
export function markNoticeRead(viewerId, noticeId, now = Date.now()) {
  const v = active(viewerId);
  const b = readItBox();
  const n = b.notices.find((x) => x.id === noticeId && x.personId === v?.id);
  if (!n) return fail("No such notice.");
  if (!n.readAt) n.readAt = new Date(now).toISOString();
  return save(b) ? { ok: true } : fail(SAVE_FAILED);
}

// ---------- SLA ----------
export const slaHours = () => ({ ...SLA_DEFAULTS, ...(readItBox().sla ?? {}) });
// The Admin (it:approve) sets the hours per priority (whole hours, 1 to 720). New requests take them; due dates already set stay.
export function setSlaHours(actorId, changes = {}, now = Date.now()) {
  const actor = active(actorId);
  if (!isApprover(actor)) return fail("Only an Admin sets the IT response times.");
  const extra = Object.keys(changes ?? {}).filter((k) => !PRIORITIES.includes(k));
  if (extra.length) return fail(`These can't be set here: ${extra.join(", ")}.`);
  const next = slaHours();
  for (const [k, v] of Object.entries(changes)) {
    if (!Number.isInteger(v) || v < 1 || v > SLA_MAX) return fail(`${k}: whole hours from 1 to ${SLA_MAX}.`, k);
    next[k] = v;
  }
  const b = readItBox();
  b.sla = next;
  pushActivity(b, { actorId: actor.id, kind: "sla-changed", summary: `Response times: ${PRIORITIES.map((p) => `${p} ${next[p]} h`).join(", ")}` }, now);
  if (!save(b)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, kind: "it-sla-changed", detail: PRIORITIES.map((p) => `${p} ${next[p]}`).join(", ") }, now);
  return { ok: true, sla: { ...next } };
}