// data/it-rules.js (IT1, 2026-11-22): the IT desk's rules as lists and pure functions: request types, which are sensitive, the
// statuses and the moves between them, priorities and their SLA hours, the offboarding checklist, and the separation of duties
// (who may approve, who may execute). Nothing here reads storage or the clock; data/it-store.js keeps the records and
// data/it-desk.js runs the workflows.
//
// Separation of duties (held here, used by it-desk.js and by data/credentials.js before any credential step):
//   - nobody approves a request they raised, are the subject of, or worked on (prepared or executed a step of);
//   - approving needs it:approve (the Admin); IT never holds it;
//   - executing needs the IT role (it:requests-handle) and being the request's assignee; an Admin executes only through the
//     documented override (a reason, flagged on the review trail);
//   - a sensitive request is executed only once approved; a non-sensitive one only while in progress.

import { text } from "./asset-rules.js";

export const TYPES = {
  "new-account":      { label: "New account" },
  "password-reset":   { label: "Password reset" },
  "account-unlock":   { label: "Account unlock" },
  "access-request":   { label: "Access request" },
  "asset-request":    { label: "Asset request" },
  "asset-return":     { label: "Asset return" },
  "software-request": { label: "Software request" },
  offboarding:        { label: "Offboarding" },
  "it-issue":         { label: "IT issue" },
};
export const TYPE_KEYS = Object.keys(TYPES);
// Always sensitive; a password reset or an unlock is sensitive when the account holds Admin, HR or Finance.
export const ALWAYS_SENSITIVE = ["new-account", "access-request", "offboarding"];
export const PRIVILEGED_ROLES = ["admin", "hr", "fin"];
export const isSensitive = (type, subjectRole) => ALWAYS_SENSITIVE.includes(type) || ((type === "password-reset" || type === "account-unlock") && PRIVILEGED_ROLES.includes(subjectRole));

export const STATUSES = {
  open:                { label: "Open" },
  "in-progress":       { label: "In progress" },
  "awaiting-approval": { label: "Awaiting approval" },
  approved:            { label: "Approved" },
  rejected:            { label: "Rejected" },
  done:                { label: "Done" },
  cancelled:           { label: "Cancelled" },
};
// The only moves. A rejected request goes back to IT (in progress) with the Admin's reason, or is cancelled.
export const TRANSITIONS = {
  open:                ["in-progress", "cancelled"],
  "in-progress":       ["awaiting-approval", "done", "cancelled"],
  "awaiting-approval": ["approved", "rejected", "cancelled"],
  approved:            ["done", "cancelled"],
  rejected:            ["in-progress", "cancelled"],
  done:                [],
  cancelled:           [],
};
export const canMove = (from, to) => Object.hasOwn(TRANSITIONS, from) && TRANSITIONS[from].includes(to);
export const OPEN_STATUSES = ["open", "in-progress", "awaiting-approval", "approved", "rejected"];

export const PRIORITIES = ["low", "normal", "high", "urgent"];
export const SLA_DEFAULTS = { low: 72, normal: 24, high: 8, urgent: 4 };   // hours, configurable by the Admin (it:approve)
export const SLA_MAX = 720;
// The due instant (ISO) of a request made at createdAt (ISO) with this priority and these SLA hours.
export const dueAtFor = (createdAt, priority, sla = SLA_DEFAULTS) => new Date(Date.parse(createdAt) + (sla[priority] ?? SLA_DEFAULTS.normal) * 3600000).toISOString();

export const TIMELINE_KINDS = ["created", "assigned", "comment", "status", "approved", "rejected", "executed", "cancelled", "reviewed"];

export const CHECKLIST = [
  { key: "disable-signin",   label: "Disable sign-in on the exit date", sensitive: true },
  { key: "return-assets",    label: "Return assets" },
  { key: "revoke-licences",  label: "Revoke licences" },
  { key: "remove-overrides", label: "Remove access overrides" },
];
export const CHECKLIST_KEYS = CHECKLIST.map((c) => c.key);

export const TITLE_MAX = 120, DETAILS_MAX = 2000, NOTE_MIN = 3, NOTE_MAX = 500;
export const titleCheck = (v) => text(v, "Title", { min: 3, max: TITLE_MAX, required: true });
export const detailsCheck = (v) => text(v, "Details", { max: DETAILS_MAX });
export const noteCheck = (v, label = "Note") => text(v, label, { min: NOTE_MIN, max: NOTE_MAX, required: true });

// ---------- the separation of duties ----------
const holds = (user, permission, perms) => Boolean(user) && user.status !== "inactive" && perms(user).includes(permission);

// May this person approve or reject this request? perms(user) -> their permissions (config/roles.js permissionsOf).
export function approvalRefusal(request, user, perms) {
  if (!holds(user, "it:approve", perms)) return "Only an Admin can approve IT requests.";
  if (user.role === "it") return "IT can't approve IT requests.";
  if (request.requesterId === user.id) return "You can't approve a request you raised.";
  if (request.subjectPersonId === user.id) return "You can't approve a request about yourself.";
  if ((request.workedBy ?? []).includes(user.id)) return "You can't approve a request you worked on.";
  if (request.status !== "awaiting-approval") return `This request is ${STATUSES[request.status]?.label.toLowerCase() ?? request.status}, not awaiting approval.`;
  return null;
}

// May this person execute a step of this request now? override: the Admin's reason (required for an Admin, refused for anyone else).
export function executionRefusal(request, user, perms, { override = null, sensitive = false } = {}) {
  if (!user || user.status === "inactive") return "You can't work IT requests.";
  const isAdmin = holds(user, "it:approve", perms) && user.role !== "it";
  if (isAdmin) {
    if (!override || String(override).trim().length < NOTE_MIN) return "An Admin works an IT step only through the override, with a reason.";
    if ((request.approvedBy ?? null) === user.id) return "You approved this request, so you can't also carry it out.";
  } else {
    if (override) return "Only an Admin uses the override.";
    if (!holds(user, "it:requests-handle", perms) || user.role !== "it") return "Only IT works IT requests.";
    if (request.assignedTo !== user.id) return "This request is assigned to someone else.";
  }
  if (sensitive) {
    if (request.status !== "approved") return "This request needs the Admin's approval first.";
  } else if (request.status !== "in-progress") {
    return `This request is ${STATUSES[request.status]?.label.toLowerCase() ?? request.status}, not in progress.`;
  }
  return null;
}