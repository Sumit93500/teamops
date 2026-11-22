// data/files.js (FS1, 2026-11-22): the file storage adapter. The app talks only to these functions, so the backend stage can swap the storage
// underneath for a server (signed URLs, scanning, encryption at rest) without touching a page.
//
// What is kept: the bytes behind a backend (the demo's is IndexedDB, database "officeos-files"; tests plug in a memory one), and one metadata
// record per file in "officeos:files" { version: 1, seq, files: [meta] }:
//   { id "FL-n", ownerId, kind: expense-payslip | profile-photo | employee-document, linkTo: { type, id, slot? }, name (sanitised, for display),
//     mime (from the file's magic bytes), size, sha256, uploadedBy, uploadedAt, status: active | removed, removedBy?, removedAt?, replacedBy?, docType? }
//   linkTo: an expense claim { type: "expense", id: "EX-n" }, a person { type: "user", id } (their photo), or one of a person's document rows
//   { type: "document", id: userId, slot: "<row number>" } (docType: the row's document type when the file was added).
//
// Who may see a file: canViewFile(viewer, meta), the one check every read, preview, download and list goes through:
//   expense-payslip    the claimant; the claimant's manager now (data/reporting.js managerOf); files:view-expense (HR, Finance). Not the Admin
//                      by default (the Admin role doesn't hold it: a ruling item), not other employees, not other managers.
//   profile-photo      the person; anyone who can open that person's profile (data/employee-record.js relationOf: HR and the Admin, Finance,
//                      the manager). A photo is a face, not a secret: it shows wherever the viewer already sees the person's details.
//   employee-document  the person; files:view-documents: HR for every document, Finance only for bank or tax proof (the row's type names a bank,
//                      a cheque, a passbook, a PAN, Form 16 or a tax return). Not the Admin by default (a ruling item).
// Who may add one: expense-payslip the claimant, once, right after sending the claim (then it is locked: there is no "returned to you" step in
// claims yet); profile-photo the person or users:edit (HR, Admin); employee-document the person for their own rows or files:manage-documents (HR).
// Replace and remove: whoever may add it (an expense file is locked once added). Every view, add, replace, remove and purge is in the audit
// trail (who, which file id and name, what; never the contents). A removed file is kept as a record (removed) and its bytes are deleted.
//
//   putFile(actorId, linkTo, file, opts { kind, docType? })   getFileFor(viewerId, id)   listFilesFor(viewerId, linkTo)   fileInfo(viewerId, id)
//   replaceFile(actorId, id, file)   removeFile(actorId, id)   purgeFor(linkTo, actorId?)   canViewFile(viewer, meta)   mayAddFile(actorId, kind, linkTo)
//   useFileBackend(backend)   memoryBackend()   indexedDbBackend()   allFileMeta()   resetFiles()
// file: a Blob / File, an ArrayBuffer, a Uint8Array, or { name, bytes }; its name is read from file.name (opts.name overrides).

import { getUser } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { managerOf } from "./reporting.js";
import { getExpense } from "./expenses-store.js";
import { relationOf } from "./employee-record.js";
import { logEvent } from "./audit-trail.js";
import { pureBox } from "./places.js";
import { remove } from "../core/storage.js";
import { checkFile, sha256Hex, readBytes, KINDS } from "./file-rules.js";

const KEY = "files";
const store = pureBox(KEY, 1, () => ({ seq: 1, files: [] }), (b) => Array.isArray(b.files) && Number.isInteger(b.seq));
const copy = (v) => JSON.parse(JSON.stringify(v));
const fail = (error, code, field) => ({ ok: false, error, ...(code ? { code } : {}), ...(field ? { field } : {}) });
const active = (id) => { const u = id ? getUser(id) : null; return u && u.status !== "inactive" ? u : null; };
const LINK_FOR = { "expense-payslip": "expense", "profile-photo": "user", "employee-document": "document" };
const sameLink = (a, b) => a && b && a.type === b.type && a.id === b.id && (a.slot ?? null) === (b.slot ?? null);
export const BANK_OR_TAX = /bank|cheque|check|passbook|statement|pan\b|form\s*16|tax|itr|salary slip/i;
export const NO_ACCESS = "You don't have access to this file.";
export const UNAVAILABLE = "Files can't be kept in this browser right now: private browsing or blocked site storage stops it. Open OfficeOS in a normal window, or another browser, and try again.";
export const QUOTA = "There isn't enough space in this browser to keep this file. Remove a file you no longer need, or try a smaller one.";

// ---------- the backend (where the bytes live) ----------
export function memoryBackend({ quota = Infinity } = {}) {
  const m = new Map();
  const used = () => [...m.values()].reduce((s, v) => s + v.bytes.length, 0);
  return {
    name: "memory",
    async put(id, bytes, mime) { if (used() + bytes.length > quota) { const e = new Error("quota"); e.name = "QuotaExceededError"; throw e; } m.set(id, { bytes: new Uint8Array(bytes), mime }); },
    async get(id) { const v = m.get(id); return v ? { bytes: new Uint8Array(v.bytes), mime: v.mime } : null; },
    async delete(id) { m.delete(id); },
    has: (id) => m.has(id),
    size: () => m.size,
  };
}
export function indexedDbBackend() {
  let opening = null;
  const open = () => (opening ??= new Promise((resolve, reject) => {
    const idb = globalThis.indexedDB;
    if (!idb) { reject(Object.assign(new Error("no indexedDB"), { name: "Unavailable" })); return; }
    let req;
    try { req = idb.open("officeos-files", 1); } catch (e) { reject(Object.assign(new Error(String(e)), { name: "Unavailable" })); return; }
    req.onupgradeneeded = () => req.result.createObjectStore("blobs");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(Object.assign(new Error(String(req.error)), { name: "Unavailable" }));
  }).catch((e) => { opening = null; throw e; }));
  const run = async (mode, fn) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("blobs", mode), st = tx.objectStore("blobs");
      let out;
      fn(st, (v) => { out = v; });
      tx.oncomplete = () => resolve(out);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? Object.assign(new Error("aborted"), { name: "QuotaExceededError" }));
    });
  };
  return {
    name: "indexeddb",
    put: (id, bytes, mime) => run("readwrite", (st) => st.put({ bytes, mime }, id)),
    get: (id) => run("readonly", (st, set) => { const r = st.get(id); r.onsuccess = () => set(r.result ? { bytes: new Uint8Array(r.result.bytes), mime: r.result.mime } : null); }),
    delete: (id) => run("readwrite", (st) => st.delete(id)),
  };
}
let backend = null;
export function useFileBackend(b) { backend = b; }
const theBackend = () => (backend ??= indexedDbBackend());
const storageError = (e) => (e && (e.name === "QuotaExceededError" || /quota/i.test(e.message ?? "")) ? fail(QUOTA, "quota") : fail(UNAVAILABLE, "unavailable"));

// ---------- who ----------
// May this viewer (an id or a user record) see this file? The one check for every read; refuses anything removed.
export function canViewFile(viewer, meta) {
  const v = active(typeof viewer === "string" ? viewer : viewer?.id);
  if (!v || !meta || meta.status !== "active") return false;
  const owner = ownerOfLink(meta.kind, meta.linkTo);   // from the claim or the person the link names, never from the stored record alone
  if (!owner || owner !== meta.ownerId) return false;
  if (owner === v.id) return true;
  if (meta.kind === "expense-payslip") return managerOf(owner) === v.id || hasPermission(v, "files:view-expense");
  if (meta.kind === "profile-photo") return relationOf(v.id, meta.ownerId) !== null;
  if (meta.kind === "employee-document") {
    if (!hasPermission(v, "files:view-documents")) return false;
    return hasPermission(v, "users:view") || BANK_OR_TAX.test(meta.docType ?? "");
  }
  return false;
}

// The person a link belongs to, or null.
function ownerOfLink(kind, linkTo) {
  if (!linkTo || LINK_FOR[kind] !== linkTo.type) return null;
  if (kind === "expense-payslip") return getExpense(linkTo.id)?.userId ?? null;
  return getUser(linkTo.id)?.id ?? null;
}
// May this person add (or replace, or remove) a file of this kind on this link? -> { ok, ownerId } | a failure
export function mayAddFile(actorId, kind, linkTo) {
  const a = active(actorId);
  if (!a) return fail("Your account isn't active.", "who");
  if (!KINDS.includes(kind)) return fail("That isn't a kind of file OfficeOS keeps.", "kind");
  const ownerId = ownerOfLink(kind, linkTo);
  if (!ownerId) return fail("That file has nowhere to go.", "link");
  if (kind === "expense-payslip") {
    if (ownerId !== a.id) return fail("Only the person who sent the claim can add its file.", "who");
    const claim = getExpense(linkTo.id);
    const decided = claim.history.some((h) => !["applied", "skipped", "auto-approved"].includes(h.decision));
    if (!["pending", "approved"].includes(claim.status) || decided) return fail("This claim's file is locked: it can't be changed after the claim was sent.", "locked");
    return { ok: true, ownerId };
  }
  if (kind === "profile-photo") return ownerId === a.id || hasPermission(a, "users:edit") ? { ok: true, ownerId } : fail("You can't change this person's photo.", "who");
  return ownerId === a.id || hasPermission(a, "files:manage-documents") ? { ok: true, ownerId } : fail("You can't add a file to this person's documents.", "who");
}

// ---------- writes ----------
const audit = (actorId, meta, kind, what) => logEvent({ actorId, userId: meta.ownerId, kind, detail: `${meta.id} (${meta.kind}, ${meta.name})${what ? `: ${what}` : ""}` });

async function prepare(kind, file, name) {
  let bytes;
  try { bytes = await readBytes(file); } catch { bytes = null; }
  const checked = checkFile(kind, name ?? file?.name ?? "", bytes);
  if (!checked.ok) return { ...checked, field: "file" };
  return { ok: true, bytes, checked, sha256: await sha256Hex(bytes) };
}

export async function putFile(actorId, linkTo, file, opts = {}) {
  const kind = opts.kind;
  const may = mayAddFile(actorId, kind, linkTo);
  if (!may.ok) return may;
  const p = await prepare(kind, file, opts.name);
  if (!p.ok) return p;
  const box = store.read();
  const here = box.files.filter((f) => f.status === "active" && sameLink(f.linkTo, linkTo));
  if (here.some((f) => f.sha256 === p.sha256)) return fail("This exact file is already attached here.", "duplicate", "file");
  if (kind === "expense-payslip" && here.length) return fail("This claim already has its file, and it's locked now.", "locked", "file");
  const id = `FL-${box.seq}`;
  const meta = { id, ownerId: may.ownerId, kind, linkTo: { type: linkTo.type, id: linkTo.id, ...(linkTo.slot != null ? { slot: String(linkTo.slot) } : {}) }, name: p.checked.name, mime: p.checked.mime, size: p.bytes.length,
    sha256: p.sha256, uploadedBy: actorId, uploadedAt: new Date().toISOString(), status: "active", ...(kind === "employee-document" ? { docType: String(opts.docType ?? "").slice(0, 80) } : {}) };
  try { await theBackend().put(id, p.bytes, meta.mime); } catch (e) { return storageError(e); }
  const fresh = store.read();
  fresh.seq = Math.max(fresh.seq, box.seq) + 1;
  // a new photo, or a new file on a document row, replaces the one there
  const replaced = kind === "expense-payslip" ? [] : fresh.files.filter((f) => f.status === "active" && sameLink(f.linkTo, linkTo));
  for (const old of replaced) Object.assign(old, { status: "removed", removedBy: actorId, removedAt: meta.uploadedAt, replacedBy: id });
  fresh.files.push(meta);
  if (!store.write(fresh)) { await theBackend().delete(id).catch(() => {}); return fail("Couldn't save. Browser storage may be full or disabled.", "save"); }
  for (const old of replaced) { await theBackend().delete(old.id).catch(() => {}); audit(actorId, old, "file-replaced", `by ${id}`); }
  audit(actorId, meta, "file-added", `${meta.size} bytes`);
  return { ok: true, meta: copy(meta), replaced: replaced.map((f) => f.id) };
}

export async function replaceFile(actorId, id, file, opts = {}) {
  const meta = store.read().files.find((f) => f.id === id);
  if (!meta || meta.status !== "active") return fail("That file isn't there any more.", "gone");
  if (meta.kind === "expense-payslip") return fail("This claim's file is locked: it can't be changed after the claim was sent.", "locked");
  return putFile(actorId, meta.linkTo, file, { kind: meta.kind, docType: opts.docType ?? meta.docType, name: opts.name });
}

export async function removeFile(actorId, id) {
  const box = store.read();
  const meta = box.files.find((f) => f.id === id);
  if (!meta || meta.status !== "active") return fail("That file isn't there any more.", "gone");
  if (meta.kind === "expense-payslip") return fail("This claim's file is locked: it can't be changed after the claim was sent.", "locked");
  const may = mayAddFile(actorId, meta.kind, meta.linkTo);
  if (!may.ok) return may;
  Object.assign(meta, { status: "removed", removedBy: actorId, removedAt: new Date().toISOString() });
  if (!store.write(box)) return fail("Couldn't save. Browser storage may be full or disabled.", "save");
  await theBackend().delete(id).catch(() => {});
  audit(actorId, meta, "file-removed", "");
  return { ok: true };
}

// Deletes every file of a link for good (records and bytes): a claim that couldn't keep its file, a person's data at the backend's deletion
// rules. actorId: who asked (for the audit trail).
export async function purgeFor(linkTo, actorId = null) {
  const box = store.read();
  const gone = box.files.filter((f) => sameLink(f.linkTo, linkTo));
  if (!gone.length) return { ok: true, purged: 0 };
  box.files = box.files.filter((f) => !sameLink(f.linkTo, linkTo));
  store.write(box);
  for (const f of gone) { await theBackend().delete(f.id).catch(() => {}); audit(actorId, f, "file-purged", ""); }
  return { ok: true, purged: gone.length };
}

// ---------- reads ----------
// The file itself, only after the check; every call is in the audit trail. -> { ok, blob, meta } | a failure (never a hint of what is there)
export async function getFileFor(viewerId, id) {
  const meta = store.read().files.find((f) => f.id === id) ?? null;
  if (!meta || !canViewFile(viewerId, meta)) return fail(NO_ACCESS, "no-access");
  let got;
  try { got = await theBackend().get(id); } catch (e) { return storageError(e); }
  if (!got) return fail("This file can't be found in this browser any more.", "missing");
  audit(viewerId, meta, "file-viewed", "");
  return { ok: true, blob: new Blob([got.bytes], { type: meta.mime }), meta: copy(meta) };
}
// The records of a link's active files this viewer may see (no bytes, no audit).
export const listFilesFor = (viewerId, linkTo) => copy(store.read().files.filter((f) => f.status === "active" && sameLink(f.linkTo, linkTo) && canViewFile(viewerId, f)));
// One file's record for this viewer, or null.
export function fileInfo(viewerId, id) {
  const meta = store.read().files.find((f) => f.id === id);
  return meta && canViewFile(viewerId, meta) ? copy(meta) : null;
}
// Is there an active file on this link at all (whoever may see it)? For "You don't have access to this file" instead of nothing.
export const hasFileOn = (linkTo) => store.read().files.some((f) => f.status === "active" && sameLink(f.linkTo, linkTo));
export const allFileMeta = () => copy(store.read().files);
export function resetFiles() { remove(KEY); }