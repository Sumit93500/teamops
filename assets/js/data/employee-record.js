// data/employee-record.js (E1): the whole employee record. The user record (data/store.js) keeps what it always held; the
// rest is kept here:
//   "officeos:employee-records"  { version: 1, people: { "<id>": { <record field>: value } }, history: [HISTORY],
//                                  requests: [REQUEST], nextReq }
//   HISTORY  { at, actorId, userId, field, from, to, how: "edit" | "request" }   (sensitive values masked, never in full)
//   REQUEST  { id "PC-n", userId, changes: { field: value }, status "pending" | "approved" | "rejected", requestedAt,
//              decidedBy, decidedAt, note }
// What each person may see, edit and reveal comes from config/employee-fields.js, decided here for every read and write:
//   relation  "self" (their own), "people" (users:view: HR, Admin), "finance" (salary:edit: Finance), "manager" (the
//             person's manager), or none (nothing at all)
//   see       a field outside the viewer's reach isn't returned (so a page can't put it in the DOM)
//   sensitive returned masked (last 4); revealField() gives the value to whoever may Show it, and logs that it did
//   edit      saveFields() refuses any field the actor may not change (and anything that isn't a field: a role, a
//             permission); the person's own bank or tax change is a request (requestChange), decided by Finance or HR
import { load, save, remove } from "../core/storage.js";
import { getUser, getAllDepartments, reportingManagerName, updateUser, updateOwnContact, setPayDetails } from "./store.js";
import { hasPermission, ROLES } from "../config/roles.js";
import { FIELDS, FIELD, PROFILE_SECTIONS, RULES } from "../config/employee-fields.js";
import { bankFromIfsc } from "../config/ifsc-banks.js";   // F2
import { managerOf } from "./reporting.js";
import { approvalChainText } from "./leave-store.js";
import { salaryFor } from "./payroll-store.js";
import { logEvent } from "./audit-trail.js";

const KEY = "employee-records";
const MAX_ROWS = 20;
const empty = () => ({ version: 1, people: {}, history: [], requests: [], nextReq: 1 });
function read() {
  const box = load(KEY);
  return box && box.version === 1 && box.people && Array.isArray(box.history) && Array.isArray(box.requests) ? box : empty();
}
const write = (box) => save(KEY, box);
const fail = (error, field) => ({ ok: false, error, ...(field ? { field } : {}) });
const active = (id) => { const u = getUser(id); return u && u.status !== "inactive" ? u : null; };

// ---------- who is who ----------
export function relationOf(viewerId, userId) {
  const viewer = active(viewerId), user = getUser(userId);
  if (!viewer || !user) return null;
  if (viewer.id === user.id) return "self";
  if (hasPermission(viewer, "users:view")) return "people";
  if (hasPermission(viewer, "salary:edit")) return "finance";
  if (managerOf(user.id) === viewer.id) return "manager";
  return null;
}
const SEES = { self: ["team", "pay", "people"], people: ["team", "pay", "people"], finance: ["team", "pay"], manager: ["team"] };
// E1b: may this viewer open this person's profile from a team page: HR / Admin (users:view) or the person's manager.
// Direct reports only for a manager (managerOf); your own row links only when you may open the profile page (HR, Admin);
// Finance and everyone else get no link (they can't open anyone's from a team page).
export const profileLinkable = (viewerId, userId) => {
  const rel = relationOf(viewerId, userId);
  return rel === "people" || rel === "manager" || (rel === "self" && hasPermission(active(viewerId), "users:view"));
};
export const canSee = (relation, field) => Boolean(relation && SEES[relation]?.includes(field.see));
// "direct" (saveFields), "request" (requestChange), or null
export function editMode(viewerId, relation, field) {
  const viewer = active(viewerId);
  if (!viewer || !canSee(relation, field)) return null;
  const people = hasPermission(viewer, "users:edit");
  if (field.edit === "own") return relation === "self" ? (hasPermission(viewer, "profile:edit-own") ? "direct" : null) : people ? "direct" : null;
  if (field.edit === "finance") return relation === "self" ? "request" : people || hasPermission(viewer, "salary:edit") ? "direct" : null;
  if (field.edit === "hr") return people ? "direct" : null;
  return null;
}
export function canReveal(viewerId, relation, field) {
  const viewer = active(viewerId);
  if (!viewer || !field.sensitive || !canSee(relation, field)) return false;
  if (relation === "self") return true;
  return hasPermission(viewer, field.sensitive === "salary" ? "salary:view" : "pii:view");
}

// ---------- values ----------
const LEGACY_EMERGENCY = (user) => (user.emergencyContactName ? [{ name: user.emergencyContactName, relation: user.emergencyContactRelation ?? "", phone: user.emergencyContactPhone ?? "" }] : []);
function rawValue(user, rec, field) {
  if (field.from === "record") return rec[field.key] ?? (field.key === "emergencyContacts" ? LEGACY_EMERGENCY(user) : field.kind === "list" ? [] : "");
  if (field.from === "user") return user[field.key] ?? "";
  switch (field.key) {
    case "department": return getAllDepartments().find((d) => d.code === user.department)?.name ?? user.department ?? "";
    case "manager": return reportingManagerName(user) ?? "";
    case "salary": { const now = new Date(); const s = salaryFor(user.id, now.getFullYear(), now.getMonth() + 1); return s ? s.gross : ""; }
    case "role": return ROLES[user.role]?.label ?? user.role ?? "";
    case "scope": return (ROLES[user.role] ?? ROLES.emp).scopeLabel;
    case "chain": return approvalChainText(user.id);
    default: return "";
  }
}
const last4 = (v) => String(v ?? "").replace(/\s/g, "").slice(-4);
export function maskValue(field, value) {
  if (value === "" || value == null) return "";
  if (field.sensitive === "salary") return "₹ ••,•••";
  if (field.key === "pan") return `••••••${last4(value)}`;
  return `•••• •••• ${last4(value)}`;
}
const maskRows = (field, rows) => rows.map((r) => Object.fromEntries(field.columns.map((c) => [c.key, c.sensitive && r[c.key] ? `•••• ${last4(r[c.key])}` : r[c.key] ?? ""])));
const isFilled = (v) => (Array.isArray(v) ? v.length > 0 : v !== "" && v != null);

// The profile as this viewer may see it: { relation, sections: [{ key, title, desc, fields: [{ key, label, kind, value,
// masked, canReveal, edit, columns, hint }] }] }; null when they may see none of it. A sensitive field's value is masked
// (never the full value: revealField() gives that); a list with a sensitive column has that column masked.
export function profileView(viewerId, userId) {
  const relation = relationOf(viewerId, userId);
  if (!relation) return null;
  const user = getUser(userId);
  const rec = read().people[userId] ?? {};
  const sections = PROFILE_SECTIONS.map((s) => ({
    ...s,
    fields: FIELDS.filter((f) => f.section === s.key && canSee(relation, f)).map((f) => {
      const raw = rawValue(user, rec, f);
      const out = { key: f.key, label: f.label, kind: f.kind, columns: f.columns ?? null, hint: f.hint ?? null, edit: editMode(viewerId, relation, f), canReveal: canReveal(viewerId, relation, f) };
      if (f.kind === "list") {
        const rows = Array.isArray(raw) ? raw : [];
        const hasSecret = f.columns.some((c) => c.sensitive);
        return { ...out, value: hasSecret ? maskRows(f, rows) : rows, masked: hasSecret && rows.length > 0, canReveal: hasSecret && relation !== "manager" && (relation === "self" || hasPermission(active(viewerId), "pii:view")) };
      }
      return f.sensitive ? { ...out, value: maskValue(f, raw), masked: raw !== "" && raw != null } : { ...out, value: raw, masked: false };
    }),
  })).filter((s) => s.fields.length);
  return { relation, sections };
}

// Show: the full value of a sensitive field, for whoever may see it in full; written to the audit trail.
export function revealField(viewerId, userId, key, now = Date.now()) {
  const field = FIELD[key];
  const relation = relationOf(viewerId, userId);
  const isList = field?.kind === "list" && field.columns.some((c) => c.sensitive);
  const allowed = field && (isList ? relation === "self" || (relation === "people" && hasPermission(active(viewerId), "pii:view")) : canReveal(viewerId, relation, field));
  if (!allowed) return fail("You can't see this in full.");
  const user = getUser(userId);
  const value = rawValue(user, read().people[userId] ?? {}, field);
  logEvent({ actorId: viewerId, userId, kind: "field-revealed", detail: `${field.label} shown in full.` }, now);
  return { ok: true, value };
}

// ---------- checking values ----------
function clean(field, value) {
  if (field.kind === "list") {
    if (!Array.isArray(value)) return { error: `${field.label}: a list was expected.` };
    if (value.length > MAX_ROWS) return { error: `${field.label}: at most ${MAX_ROWS} rows.` };
    const rows = [];
    for (const [i, row] of value.entries()) {
      const r = Object.fromEntries(field.columns.map((c) => [c.key, String(row?.[c.key] ?? "").trim()]));
      for (const c of field.columns) {
        if (c.required && !r[c.key]) return { error: `${field.label}, row ${i + 1}: enter the ${c.label.toLowerCase()}.` };
        if (r[c.key] && c.rule && !RULES[c.rule][0](r[c.key])) return { error: `${field.label}, row ${i + 1}: ${RULES[c.rule][1]}` };
        if (c.kind === "yesno") r[c.key] = r[c.key] === "yes" ? "yes" : "";
      }
      rows.push(r);
    }
    if (field.key === "dependants" && rows.filter((r) => r.nominee === "yes").length > 1) return { error: "Only one dependant can be the nominee." };
    return { value: rows };
  }
  let v = String(value ?? "").trim();
  if (["pan", "ifsc"].includes(field.key)) v = v.toUpperCase();
  if (["bankAccount", "aadhaar", "uan", "esi"].includes(field.key)) v = v.replace(/\s/g, "");
  if (v && field.rule && !RULES[field.rule][0](v)) return { error: RULES[field.rule][1] };
  return { value: v };
}
// A value as history keeps it: sensitive masked, a list summed up (its sensitive column masked).
function historyText(field, value) {
  if (field.kind === "list") {
    const rows = field.columns.some((c) => c.sensitive) ? maskRows(field, value ?? []) : value ?? [];
    return rows.length ? rows.map((r) => field.columns.map((c) => r[c.key]).filter(Boolean).join(", ")).join("; ") : "None";
  }
  if (value === "" || value == null) return "Not given";
  return field.sensitive ? maskValue(field, value) : String(value);
}

// F2: bank details hang together. Whenever any of them is entered (account, bank name, branch, holder) the IFSC is needed; and the
// bank name fills in from the IFSC's first four letters when it isn't given (or still says the bank the old IFSC named).
const BANK_KEYS = ["bankAccount", "bankName", "branch", "accountHolder"];
function bankTogether(user, rec, cleaned, editable) {
  const same = (k) => JSON.stringify(cleaned[k] ?? "") === JSON.stringify(rawValue(user, rec, FIELD[k]) ?? "");
  if (![...BANK_KEYS, "ifsc"].some((k) => k in cleaned && !same(k))) return null;   // only when bank details change
  const after = (k) => (k in cleaned ? cleaned[k] : rawValue(user, rec, FIELD[k]));
  if (BANK_KEYS.some((k) => String(after(k) ?? "").trim()) && !String(after("ifsc") ?? "").trim()) return fail("Enter the IFSC: it's needed whenever bank details are entered.", "ifsc");
  if ("ifsc" in cleaned && cleaned.ifsc && editable("bankName")) {
    const named = bankFromIfsc(cleaned.ifsc), was = rawValue(user, rec, FIELD.bankName);
    const given = "bankName" in cleaned && cleaned.bankName && cleaned.bankName !== was;
    if (named && !given && (!was || was === bankFromIfsc(rawValue(user, rec, FIELD.ifsc)))) cleaned.bankName = named;
  }
  return null;
}

// ---------- writes ----------
// changes: { field: value }. Every field must be one the actor may change directly; anything else (an unknown key, a
// role, a permission, someone else's own-only field, a field they may only ask for) refuses the whole save.
export function saveFields(actorId, userId, changes = {}, now = Date.now()) {
  const relation = relationOf(actorId, userId);
  const user = getUser(userId);
  if (!relation || !user) return fail("You can't change this record.");
  const cleaned = {};
  for (const [key, value] of Object.entries(changes)) {
    const field = FIELD[key];
    if (!field) return fail(`"${key}" can't be changed here.`, key);
    const mode = editMode(actorId, relation, field);
    if (mode === "request") return fail(`Ask for a change to ${field.label.toLowerCase()} instead: Finance or HR approves it.`, key);
    if (mode !== "direct") return fail(`You can't change ${field.label.toLowerCase()}.`, key);
    const c = clean(field, value);
    if (c.error) return fail(c.error, key);
    cleaned[key] = c.value;
  }
  const box = read();
  const rec = box.people[userId] ?? {};
  const bank = bankTogether(user, rec, cleaned, (k) => editMode(actorId, relation, FIELD[k]) === "direct");   // F2
  if (bank) return bank;
  const before = Object.fromEntries(Object.keys(cleaned).map((k) => [k, rawValue(user, rec, FIELD[k])]));
  const changed = Object.keys(cleaned).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(cleaned[k]));
  if (!changed.length) return { ok: true, changed: [] };
  // the user record's fields, each through the store's own write for this actor
  const userKeys = changed.filter((k) => FIELD[k].from === "user");
  const pay = Object.fromEntries(userKeys.filter((k) => k === "bankAccount" || k === "pan").map((k) => [k, cleaned[k]]));
  const other = Object.fromEntries(userKeys.filter((k) => k !== "bankAccount" && k !== "pan").map((k) => [k, cleaned[k]]));
  if (changed.includes("emergencyContacts")) {
    const first = cleaned.emergencyContacts[0] ?? { name: "", relation: "", phone: "" };
    Object.assign(other, { emergencyContactName: first.name, emergencyContactRelation: first.relation, emergencyContactPhone: first.phone });
  }
  if (Object.keys(pay).length) { const r = setPayDetails(actorId, userId, pay); if (!r.ok) return r; }
  if (Object.keys(other).length) {
    // the person's own contact fields go through updateOwnContact (profile:edit-own); HR / Admin, on anyone, updateUser
    const r = relation === "self" && !hasPermission(active(actorId), "users:edit") ? updateOwnContact(actorId, userId, other) : updateUser(actorId, userId, other);
    if (!r.ok) return r;
  }
  const fresh = read();
  const people = fresh.people[userId] ?? {};
  for (const k of changed) if (FIELD[k].from === "record") people[k] = cleaned[k];
  fresh.people[userId] = people;
  for (const k of changed) fresh.history.push({ at: new Date(now).toISOString(), actorId, userId, field: k, from: historyText(FIELD[k], before[k]), to: historyText(FIELD[k], cleaned[k]), how: "edit" });
  write(fresh);
  logEvent({ actorId, userId, kind: "field-changed", detail: `${changed.map((k) => FIELD[k].label).join(", ")} changed.` }, now);
  return { ok: true, changed };
}

// The person's own bank or tax change, for Finance or HR to decide: one waiting at a time.
export function requestChange(actorId, changes = {}, now = Date.now()) {
  const user = active(actorId);
  if (!user) return fail("You can't ask for changes.");
  const box = read();
  if (box.requests.some((r) => r.userId === actorId && r.status === "pending")) return fail("You already have a change waiting. Wait for it to be decided, or ask Finance.");
  const cleaned = {};
  const rec = box.people[actorId] ?? {};
  for (const [key, value] of Object.entries(changes)) {
    const field = FIELD[key];
    if (!field || editMode(actorId, "self", field) !== "request") return fail(`"${key}" can't be asked for here.`, key);
    const c = clean(field, value);
    if (c.error) return fail(c.error, key);
    // only what changes is asked for: a field sent as it already is (or left empty, as it was) isn't part of the request
    if (JSON.stringify(c.value) !== JSON.stringify(rawValue(user, rec, field) ?? "")) cleaned[key] = c.value;
  }
  const bank = bankTogether(user, rec, cleaned, (k) => editMode(actorId, "self", FIELD[k]) === "request");   // F2
  if (bank) return bank;
  if (!Object.keys(cleaned).length) return fail("Nothing to change: every value is as it is on file.");
  const request = { id: `PC-${box.nextReq}`, userId: actorId, changes: cleaned, status: "pending", requestedAt: new Date(now).toISOString(), decidedBy: null, decidedAt: null, note: "" };
  box.requests.push(request);
  box.nextReq += 1;
  write(box);
  logEvent({ actorId, userId: actorId, kind: "change-requested", detail: `${Object.keys(cleaned).map((k) => FIELD[k].label).join(", ")}: a change was asked for.` }, now);
  return { ok: true, record: { ...request } };
}

// Who decides a request: Finance (salary:edit) or HR / Admin (users:edit), never the person themself.
const decides = (deciderId, request) => {
  const decider = active(deciderId);
  return Boolean(decider && request && decider.id !== request.userId && (hasPermission(decider, "salary:edit") || hasPermission(decider, "users:edit")));
};
export const pendingProfileChanges = (deciderId) => read().requests.filter((r) => r.status === "pending" && decides(deciderId, r)).map((r) => ({ ...r }));
export const allProfileChanges = () => read().requests.map((r) => ({ ...r }));
export const getProfileChange = (id) => { const r = read().requests.find((x) => x.id === id); return r ? { ...r } : null; };
export const profileChangesFor = (userId) => read().requests.filter((r) => r.userId === userId).map((r) => ({ ...r }));
// A request's changes as anyone may read them (sensitive masked).
export const changeText = (request) => Object.entries(request.changes).map(([k, v]) => [FIELD[k]?.label ?? k, historyText(FIELD[k], v)]);

export function decideChange(deciderId, id, decision, note = "", now = Date.now()) {
  const box = read();
  const request = box.requests.find((r) => r.id === id);
  if (!request) return fail("This request no longer exists.");
  if (request.status !== "pending") return fail("This request was already decided.");
  if (!decides(deciderId, request)) return fail(request.userId === deciderId ? "Nobody decides their own request." : "You can't decide this request.");
  if (decision !== "approved" && decision !== "rejected") return fail("Approve or reject it.");
  if (decision === "rejected" && !String(note).trim()) return fail("Give a reason, so they know what to fix.", "note");
  const user = getUser(request.userId);
  const rec = box.people[request.userId] ?? {};
  if (decision === "approved") {
    const pay = Object.fromEntries(Object.entries(request.changes).filter(([k]) => k === "bankAccount" || k === "pan"));
    if (Object.keys(pay).length) { const r = setPayDetails(deciderId, request.userId, pay); if (!r.ok) return r; }
    for (const [k, v] of Object.entries(request.changes)) {
      box.history.push({ at: new Date(now).toISOString(), actorId: deciderId, userId: request.userId, field: k, from: historyText(FIELD[k], rawValue(user, rec, FIELD[k])), to: historyText(FIELD[k], v), how: "request" });
      if (FIELD[k].from === "record") rec[k] = v;
    }
    box.people[request.userId] = rec;
  }
  Object.assign(request, { status: decision, decidedBy: deciderId, decidedAt: new Date(now).toISOString(), note: String(note).trim() });
  write(box);
  logEvent({ actorId: deciderId, userId: request.userId, kind: decision === "approved" ? "change-approved" : "change-rejected", detail: `${request.id} ${decision}.` }, now);
  return { ok: true, record: { ...request } };
}

// The change history: HR / Admin only (users:view), newest first.
export function historyFor(viewerId, userId) {
  return relationOf(viewerId, userId) === "people" || (relationOf(viewerId, userId) === "self" && hasPermission(active(viewerId), "users:view"))
    ? read().history.filter((h) => h.userId === userId).reverse().map((h) => ({ ...h, label: FIELD[h.field]?.label ?? h.field })) : null;
}

// How complete the record is: { percent, missing: [labels] } over the fields marked counts.
export function completeness(userId) {
  const user = getUser(userId);
  if (!user) return null;
  const rec = read().people[userId] ?? {};
  const counted = FIELDS.filter((f) => f.counts);
  const missing = counted.filter((f) => !isFilled(rawValue(user, rec, f))).map((f) => f.label);
  return { percent: Math.round(((counted.length - missing.length) / counted.length) * 100), missing };
}

export function resetEmployeeRecords() { remove(KEY); }