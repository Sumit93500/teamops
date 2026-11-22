// data/audit-trail.js (E1): who did what to an account or an employee record, and when. One list, newest last:
//   "officeos:audit-trail"  { version: 1, nextNum, events: [{ id "AU-n", at (ISO), actorId | null, userId | null, kind, detail }] }
// kind is one of AUDIT_KINDS. detail is plain words for people to read; callers never pass a secret (no password, no token,
// no full bank account, PAN or Aadhaar): the credentials and the employee record stores write here and mask what they name.
// Reads never write; nothing here decides a permission (the stores that log here do).
import { load, save, remove } from "../core/storage.js";

const KEY = "audit-trail";
export const AUDIT_KINDS = [
  "account-created", "link-used", "password-set", "password-changed", "reset-requested", "reset-issued", "reset-used",
  "temp-issued", "signin-failed", "locked", "unlocked", "disabled", "enabled", "signin",
  "field-changed", "field-revealed", "change-requested", "change-approved", "change-rejected",
  "visit-requested", "visit-assigned", "visit-approved", "visit-rejected", "visit-cancelled", "visit-started", "visit-completed", "visit-location-ok", "visit-location-rejected", "visit-day-completed",
  "file-added", "file-viewed", "file-replaced", "file-removed", "file-purged",   // FS1: data/files.js (the file id and name, never the contents)
  // AS1: data/stock-ledger.js and data/asset-register.js (the ids, the kind of change and the field names, never an amount)
  "stock-item-added", "stock-item-changed", "stock-moved", "stock-reversed",
  "asset-added", "asset-changed", "asset-issued", "asset-returned", "asset-maintenance-opened", "asset-maintenance-closed", "asset-retired", "asset-disposed",
  "vendor-added", "vendor-changed", "vendor-removed", "depreciation-changed",
];
export const AUDIT_LABEL = {
  "account-created": "Account created", "link-used": "Set-password link used", "password-set": "Password set",
  "password-changed": "Password changed", "reset-requested": "Reset requested", "reset-issued": "Reset link issued",
  "reset-used": "Reset link used", "temp-issued": "Temporary password issued", "signin-failed": "Failed sign-ins",
  locked: "Locked", unlocked: "Unlocked", disabled: "Sign-in disabled", enabled: "Sign-in enabled", signin: "Signed in",
  "field-changed": "Field changed", "field-revealed": "Sensitive field shown", "change-requested": "Change requested",
  "change-approved": "Change approved", "change-rejected": "Change rejected",
  "visit-requested": "Visit requested", "visit-assigned": "Visit assigned", "visit-approved": "Visit approved", "visit-rejected": "Visit rejected",
  "visit-cancelled": "Visit cancelled", "visit-started": "Visit started", "visit-completed": "Visit completed", "visit-location-ok": "Visit location accepted",
  "visit-location-rejected": "Visit location rejected", "visit-day-completed": "Visit day completed",
  "file-added": "File added", "file-viewed": "File viewed", "file-replaced": "File replaced", "file-removed": "File removed", "file-purged": "File deleted",
  "stock-item-added": "Stock item added", "stock-item-changed": "Stock item changed", "stock-moved": "Stock movement recorded", "stock-reversed": "Stock movement corrected",
  "asset-added": "Asset added", "asset-changed": "Asset changed", "asset-issued": "Asset issued", "asset-returned": "Asset returned",
  "asset-maintenance-opened": "Asset sent for maintenance", "asset-maintenance-closed": "Asset back from maintenance", "asset-retired": "Asset retired",
  "asset-disposed": "Asset disposed of", "vendor-added": "Vendor added", "vendor-changed": "Vendor changed", "vendor-removed": "Vendor deleted",
  "depreciation-changed": "Depreciation settings changed",
};

const empty = () => ({ version: 1, nextNum: 1, events: [] });
function read() {
  const box = load(KEY);
  return box && box.version === 1 && Array.isArray(box.events) && Number.isInteger(box.nextNum) ? box : empty();
}

// Adds one event; returns it (a copy). now: a Date or ms, for tests with a fixed clock.
export function logEvent({ actorId = null, userId = null, kind, detail = "" }, now = Date.now()) {
  if (!AUDIT_KINDS.includes(kind)) throw new Error(`audit: unknown kind "${kind}"`);
  const box = read();
  const event = { id: `AU-${box.nextNum}`, at: new Date(now).toISOString(), actorId, userId, kind, detail: String(detail) };
  box.events.push(event);
  box.nextNum += 1;
  save(KEY, box);
  return { ...event };
}

// Every event about one person (as the subject), newest first.
export const eventsFor = (userId) => read().events.filter((e) => e.userId === userId).reverse().map((e) => ({ ...e }));
// Every event, newest first.
export const allEvents = () => read().events.slice().reverse().map((e) => ({ ...e }));
export function resetAuditTrail() { remove(KEY); }