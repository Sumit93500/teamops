// data/import-engine.js (I1, 2026-11-23): one import engine for every form. A form definition (data/import-employees.js is the first) says
// what a file must hold; the engine reads the file, checks every row without writing any record (a dry run), and applies the good rows in
// one go, all of them or none.
//   form  { id, label, permission, mode "good-rows" | "all-or-nothing", maxRows, columns, context(actor), unique, maySensitive(actor),
//           notes(ctx, actor), example(ctx), applyRow(actor, values, ctx, now) }
//   column { key, header, required, type, validate(value, ctx, row) -> { value } | { error, reason } | { value, warning }, sensitive?, help }
//
//   readUpload({ bytes, name })          CSV (data/csv.js) or .xlsx (data/xlsx.js, loaded only then) by the file's first bytes, never its name:
//                                        at most 2 MB, an old .xls or anything else refused with what to do
//   checkImport(form, upload, actor)     the headers (a column twice, one the form doesn't have, a required one missing, a sensitive one the
//                                        person may not import: the file is refused, saying which), then every row: required, the column's
//                                        check, a cell over 1,000 characters, a formula (Excel), the same value twice in the file or already on
//                                        record (a duplicate). -> counts, rows, problems ("Row 5, Work email: not a valid email address") and
//                                        a confirm token. Writes no record: only its own line in the import history and the audit trail.
//   applyImport(form, upload, actor, token)  checks again now (the permission and the data), refuses a token that is old, someone else's, or
//                                        for another file, refuses one already used (a double click imports once), then applies the rows that
//                                        are ready inside one transaction: if any write fails, every stored key is put back as it was.
//   templateFor(form, actor, format)     the template, made now from the form and the live lists: the headers, one example row marked
//                                        EXAMPLE, and the notes (required columns, allowed values, formats)
// Cells are text: a cell starting with = + - @ is kept as text (never worked out); the apostrophe our own exports put before such a cell is
// taken off again on the way in.
import { getUser } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { logEvent } from "./audit-trail.js";
import { decodeText, parseCsv, toCsv } from "./csv.js";
import { addHistory, importedWithToken } from "./import-history.js";

export const IMPORT_LIMITS = Object.freeze({ bytes: 2 * 1024 * 1024, rows: 1000, cell: 1000 });
export const TOKEN_MINUTES = 30;
const fail = (error, code, extra = {}) => ({ ok: false, error, code, ...extra });
const active = (id) => { const u = id ? getUser(String(id)) : null; return u && u.status !== "inactive" ? u : null; };
const can = (u, p) => Boolean(u) && hasPermission(u, p);
const n = (x) => Number(x).toLocaleString("en-IN");
// a size in MB; just over the 2 MB limit never reads "2.0 MB"
const mb = (bytes) => { const t = `${(bytes / 1048576).toFixed(1)} MB`; return bytes > IMPORT_LIMITS.bytes && t === "2.0 MB" ? "just over 2 MB" : t; };

export async function sha256Hex(bytes) {
  const d = await crypto.subtle.digest("SHA-256", bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const startsWith = (b, sig) => sig.every((x, i) => b[i] === x);
// What the file is, by its first bytes: "xlsx", "csv", or a refusal.
export function fileKind(bytes, name = "") {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const ext = /\.([a-z0-9]+)$/i.exec(String(name))?.[1]?.toLowerCase() ?? "";
  if (startsWith(b, [0x50, 0x4b, 0x03, 0x04])) return ext === "xlsx" || ext === "" ? { ok: true, kind: "xlsx" } : fail(`This file is a packed (zip) file named .${ext}. Upload a CSV or an Excel (.xlsx) file.`, "wrong-type");
  if (startsWith(b, [0xd0, 0xcf, 0x11, 0xe0])) return fail("Old Excel files (.xls) can't be read. Open it in Excel and save it as .xlsx, or as \"CSV UTF-8\".", "wrong-type");
  if (startsWith(b, [0x25, 0x50, 0x44, 0x46]) || startsWith(b, [0x89, 0x50, 0x4e, 0x47]) || startsWith(b, [0xff, 0xd8, 0xff])) return fail("This is a PDF or an image, not a spreadsheet. Upload a CSV or an Excel (.xlsx) file.", "wrong-type");
  if (ext && !["csv", "txt"].includes(ext)) return fail(`A .${ext} file can't be imported. Upload a CSV or an Excel (.xlsx) file.`, "wrong-type");
  return { ok: true, kind: "csv" };
}

// -> { ok, kind, records: [{ row, cells }], formulas: [{ row, col }] } or a refusal
export async function readUpload({ bytes, name }) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes ?? []);
  if (!b.length) return fail("The file is empty.", "empty");
  if (b.length > IMPORT_LIMITS.bytes) return fail(`The file is ${mb(b.length)}; at most 2 MB can be imported. Split it, or remove what isn't needed.`, "too-big");
  const k = fileKind(b, name);
  if (!k.ok) return k;
  if (k.kind === "xlsx") {
    const { readXlsx } = await import("./xlsx.js");
    const r = readXlsx(b, { rows: IMPORT_LIMITS.rows });
    return r.ok ? { ok: true, kind: "xlsx", records: r.records, formulas: r.formulas } : r;
  }
  const t = decodeText(b);
  if (!t.ok) return fail(t.error, "encoding");
  const r = parseCsv(t.text, { rows: IMPORT_LIMITS.rows });
  return r.ok ? { ok: true, kind: "csv", records: r.records, formulas: [] } : fail(r.error, r.code ?? "bad-csv");
}

const clean = (v) => String(v ?? "").replace(/^'(?=[=+\-@\t\r])/, "").trim();
const norm = (h) => clean(h).toLowerCase().replace(/\s+/g, " ").replace(/\s*\*$/, "");
const colLetter = (i) => { let s = ""; for (let x = i + 1; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s; return s; };
// the template's own rows: the example (first cell EXAMPLE) and notes (a first cell starting #) are never data
const isTemplateRow = (cells) => { const first = clean(cells.find((c) => clean(c) !== "") ?? ""); return first.toUpperCase() === "EXAMPLE" || first.startsWith("#"); };

export function columnsFor(form, actor) {
  return form.columns.filter((c) => !c.sensitive || form.maySensitive(actor));
}

// The header row against the form: -> { ok, index: { key: cellIndex } } or { ok: false, error, problems }
function headers(form, actor, cells) {
  const all = new Map(form.columns.map((c) => [norm(c.header), c]));
  const problems = [];
  const index = {};
  cells.forEach((h, i) => {
    const key = norm(h);
    if (!key) return;
    const col = all.get(key);
    if (!col) { problems.push(`Column ${colLetter(i)} is "${clean(h)}", which this import doesn't have: remove it or check its spelling.`); return; }
    if (col.sensitive && !form.maySensitive(actor)) { problems.push(`The column "${col.header}" can't be imported by you: only someone who may see and change bank, PAN and Aadhaar details can. Remove the column and upload again.`); return; }
    if (col.key in index) { problems.push(`The column "${col.header}" appears twice (columns ${colLetter(index[col.key])} and ${colLetter(i)}). Keep one.`); return; }
    index[col.key] = i;
  });
  const missing = columnsFor(form, actor).filter((c) => c.required && !(c.key in index)).map((c) => `"${c.header}"`);
  if (missing.length) problems.push(`${missing.length === 1 ? `The required column ${missing[0]} is` : `These required columns are`} missing${missing.length === 1 ? "" : `: ${missing.join(", ")}`}. Download the template to see the columns.`);
  return problems.length ? { ok: false, error: problems[0], problems } : { ok: true, index };
}

// The rows against the form, with no write. -> { ok, rows, summary, problems } or a refusal (the file, or its headers)
export function checkTable(form, upload, actor, now = Date.now()) {
  const data = upload.records.filter((r) => !isTemplateRow(r.cells));
  const skipped = upload.records.length - data.length;
  const head = data[0];
  if (!head) return fail("The file has no header row. Download the template and fill it in.", "no-header");
  const h = headers(form, actor, head.cells);
  if (!h.ok) return fail(h.error, "headers", { problems: h.problems.map((message) => ({ row: head.row, column: null, message, reason: "header" })) });
  const rows = data.slice(1);
  if (!rows.length) return fail("The file has headers but no rows to import.", "no-rows");
  if (rows.length > (form.maxRows ?? IMPORT_LIMITS.rows)) return fail(`The file has ${n(rows.length)} rows; at most ${n(form.maxRows ?? IMPORT_LIMITS.rows)} can be imported at once. Split it into smaller files.`, "too-many-rows");
  const ctx = form.context(actor, now);
  const cols = columnsFor(form, actor);
  const formulaAt = new Set((upload.formulas ?? []).map((f) => `${f.row}:${f.col}`));
  const seen = Object.fromEntries((form.unique ?? []).map((u) => [u.id ?? u.key, new Map()]));
  const out = rows.map((rec) => {
    const values = {}, errors = [], warnings = [];
    let duplicate = false;
    const raw = Object.fromEntries(cols.map((c) => [c.key, c.key in h.index ? clean(rec.cells[h.index[c.key]]) : ""]));
    for (const c of cols) {
      const v = raw[c.key];
      if (c.key in h.index && formulaAt.has(`${rec.row}:${h.index[c.key]}`)) { errors.push({ column: c.header, message: "a formula: type the value itself", reason: "formula" }); continue; }
      if (v.length > IMPORT_LIMITS.cell) { errors.push({ column: c.header, message: `longer than ${n(IMPORT_LIMITS.cell)} characters`, reason: "too long" }); continue; }
      if (!v) { if (c.required) errors.push({ column: c.header, message: "required", reason: "required" }); else values[c.key] = null; continue; }
      const r = c.validate ? c.validate(v, ctx, raw) : { value: v };
      if (r.error) errors.push({ column: c.header, message: r.error, reason: r.reason ?? r.error });
      else { values[c.key] = r.value; if (r.warning) warnings.push({ column: c.header, message: r.warning }); }
    }
    for (const u of form.unique ?? []) {
      // I2: a key of two columns (value: the person and the date, say; id names it) and its own words for one already on record (onRecord)
      const val = u.value ? u.value(values) : values[u.key];
      if (val == null || val === "") continue;
      const k = String(val).toLowerCase();
      const header = form.columns.find((c) => c.key === u.key).header;
      const owner = u.existing(ctx).get(k);
      if (owner) { errors.push({ column: header, message: u.onRecord ? u.onRecord(owner) : `already belongs to ${owner}`, reason: "already on record" }); duplicate = true; }
      else if (seen[u.id ?? u.key].has(k)) { errors.push({ column: header, message: `also in row ${seen[u.id ?? u.key].get(k)}`, reason: "twice in the file" }); duplicate = true; }
      else seen[u.id ?? u.key].set(k, rec.row);
    }
    if (!errors.length && form.checkRow) { const extra = form.checkRow(values, ctx, actor); if (extra) errors.push(extra); }
    return { row: rec.row, values, raw, errors, warnings, status: !errors.length ? "ready" : duplicate ? "duplicate" : "error" };
  });
  const summary = { read: out.length, ready: out.filter((r) => r.status === "ready").length, errors: out.filter((r) => r.status === "error").length, duplicates: out.filter((r) => r.status === "duplicate").length, templateRows: skipped };
  const problems = out.flatMap((r) => r.errors.map((e) => ({ row: r.row, column: e.column, message: e.message, reason: e.reason })));
  return { ok: true, rows: out, summary, problems };
}

export const problemText = (p) => (p.column ? `Row ${p.row}, ${p.column}: ${p.message}` : p.message);
// the words of the check's outcome: "38 will be imported, 4 have errors, 2 duplicates"
export const summaryText = (s, form) => [`${n(s.ready)} will be imported`, `${n(s.errors)} ${s.errors === 1 ? "has" : "have"} errors`, `${n(s.duplicates)} ${s.duplicates === 1 ? "duplicate" : "duplicates"}`].join(", ")
  + (form?.mode === "all-or-nothing" && (s.errors || s.duplicates) ? " (this form imports all rows or none, so fix them first)" : "");

// ---------- the confirm token ----------
const tokenHash = (actorId, formId, sha, issued) => sha256Hex(new TextEncoder().encode(`${actorId}|${formId}|${sha}|${issued}`));
export async function makeToken(actorId, formId, sha, now = Date.now()) { return `${now.toString(36)}.${(await tokenHash(actorId, formId, sha, now)).slice(0, 40)}`; }
export async function tokenRefusal(token, actorId, formId, sha, now = Date.now()) {
  const [t, h] = String(token ?? "").split(".");
  const issued = parseInt(t, 36);
  if (!t || !h || !Number.isFinite(issued)) return "This check isn't valid any more: upload the file again.";
  if ((await tokenHash(actorId, formId, sha, issued)).slice(0, 40) !== h) return "This check was made by someone else, or for another file: upload the file again.";
  if (issued > now + 60000 || now - issued > TOKEN_MINUTES * 60000) return `This check is more than ${TOKEN_MINUTES} minutes old: upload the file again to check it.`;
  return null;
}

const keepProblems = (problems) => problems.map((p) => ({ row: p.row, column: p.column, reason: p.reason }));   // no values
// I2: a form with genericName keeps no uploaded file's name (it may name a person): the history and the audit trail say "<form>-file.csv"
export const keptName = (form, name) => {
  const base = String(name ?? "").split(/[\\/]/).pop().slice(0, 120);
  if (!form?.genericName) return base;
  const ext = /\.(csv|xlsx|txt)$/i.exec(base)?.[1]?.toLowerCase();
  return `${form.id}-file${ext ? `.${ext}` : ""}`;
};
const sizeAndName = (upload, sha, form) => ({ fileName: keptName(form, upload.name), size: upload.bytes?.length ?? upload.bytes?.byteLength ?? 0, sha256: sha });

// Upload -> Check. Writes no record. -> the check's result with { sha256, token, kind } or a refusal (logged as refused)
// someone without the permission tried: the audit trail says so (no history entry: the history is for those who may import)
const notAllowed = (actor, form, what, now) => {
  if (actor) logEvent({ actorId: actor.id, kind: "import-refused", detail: `${form.label}: ${what} refused: no permission` }, now);
  return fail(`You can't import ${form.label.toLowerCase()}.`, "not-allowed");
};

export async function checkImport(form, upload, actorId, now = Date.now()) {
  const actor = active(actorId);
  if (!can(actor, form.permission)) return notAllowed(actor, form, "a check", now);
  const bytes = upload.bytes instanceof Uint8Array ? upload.bytes : new Uint8Array(upload.bytes ?? []);
  const sha = bytes.length ? await sha256Hex(bytes) : "";
  const read = await readUpload({ bytes, name: upload.name });
  const res = read.ok ? checkTable(form, read, actor, now) : read;
  const base = { kind: "import", form: form.id, actorId: actor.id, ...sizeAndName({ ...upload, bytes }, sha, form) };
  if (!res.ok) {
    addHistory({ ...base, status: "refused", reason: res.error, problems: keepProblems(res.problems ?? []) }, now);
    logEvent({ actorId: actor.id, kind: "import-refused", detail: `${form.label}: ${base.fileName} refused (${res.code})` }, now);
    return res;
  }
  const token = await makeToken(actor.id, form.id, sha, now);
  addHistory({ ...base, status: "checked", token, rowsRead: res.summary.read, ready: res.summary.ready, errors: res.summary.errors, duplicates: res.summary.duplicates, problems: keepProblems(res.problems) }, now);
  logEvent({ actorId: actor.id, kind: "import-checked", detail: `${form.label}: ${base.fileName} checked: ${res.summary.read} rows, ${res.summary.ready} ready, ${res.summary.errors} with errors, ${res.summary.duplicates} duplicates` }, now);
  return { ...res, kind: read.kind, sha256: sha, token };
}

// A file the page refuses before reading it (over 2 MB: it isn't read into memory to be hashed): logged as refused all the same, without a
// sha256. -> the refusal, in the engine's words
export function refuseUnread(form, actorId, { name, size }, now = Date.now()) {
  const actor = active(actorId);
  if (!can(actor, form.permission)) return notAllowed(actor, form, "a check", now);
  const res = size > IMPORT_LIMITS.bytes ? fail(`The file is ${mb(size)}; at most 2 MB can be imported. Split it, or remove what isn't needed.`, "too-big") : fail("The file is empty.", "empty");
  const fileName = keptName(form, name);
  addHistory({ kind: "import", form: form.id, actorId: actor.id, fileName, size, sha256: "", status: "refused", reason: res.error, problems: [] }, now);
  logEvent({ actorId: actor.id, kind: "import-refused", detail: `${form.label}: ${fileName} refused (${res.code})` }, now);
  return res;
}

// ---------- the transaction ----------
const allKeys = () => { const out = []; for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); if (k && k.startsWith("officeos:")) out.push(k); } return out; };
function snapshot() { return new Map(allKeys().map((k) => [k, localStorage.getItem(k)])); }
function restore(snap) {
  for (const k of allKeys()) if (!snap.has(k)) localStorage.removeItem(k);
  for (const [k, v] of snap) localStorage.setItem(k, v);
}

// Confirm. -> { ok, created: [{ row, id, ...form's own }], skipped, summary, historyId } or a refusal
export async function applyImport(form, upload, actorId, token, now = Date.now()) {
  const actor = active(actorId);
  if (!can(actor, form.permission)) return notAllowed(actor, form, "an import", now);
  // a second confirm of the same check while the first still runs (a double click): refused at once, before anything is awaited
  const key = String(token ?? "");
  if (inFlight.has(key)) {
    logEvent({ actorId: actor.id, kind: "import-refused", detail: `${form.label}: confirm refused (in-progress)` }, now);
    return fail("This file is being imported already: wait for it to finish.", "in-progress");
  }
  inFlight.add(key);
  try {
    return await confirmOnce(form, upload, actor, token, now);
  } finally {
    inFlight.delete(key);
  }
}
const inFlight = new Set();

async function confirmOnce(form, upload, actor, token, now) {
  const bytes = upload.bytes instanceof Uint8Array ? upload.bytes : new Uint8Array(upload.bytes ?? []);
  const sha = await sha256Hex(bytes);
  const base = { kind: "import", form: form.id, actorId: actor.id, token: String(token ?? "").slice(0, 60), ...sizeAndName({ ...upload, bytes }, sha, form) };
  // every confirm that doesn't import is logged too: in the history (as refused) and the audit trail
  const refused = (r, extra = {}) => {
    addHistory({ ...base, status: "refused", reason: r.error, ...extra }, now);
    logEvent({ actorId: actor.id, kind: "import-refused", detail: `${form.label}: ${base.fileName}: confirm refused (${r.code})` }, now);
    return r;
  };
  const why = await tokenRefusal(token, actor.id, form.id, sha, now);
  if (why) return refused(fail(why, "token"));
  const done = importedWithToken(token);
  if (done) return refused(fail("This file was already imported: nothing was imported again.", "already-imported", { historyId: done.id, created: done.created }));
  return applyChecked(form, upload, actor, bytes, base, refused, now);
}

async function applyChecked(form, upload, actor, bytes, base, refused, now) {
  const read = await readUpload({ bytes, name: upload.name });
  const res = read.ok ? checkTable(form, read, actor, now) : read;
  if (!res.ok) return refused(res, { problems: keepProblems(res.problems ?? []) });
  const ready = res.rows.filter((r) => r.status === "ready");
  base.rowsRead = res.summary.read;
  if (form.mode === "all-or-nothing" && ready.length !== res.rows.length) return refused(fail("Some rows have problems and this form imports all rows or none: fix them and upload again.", "not-all", { summary: res.summary }));
  if (!ready.length) return refused(fail("No row is ready to import: fix the problems and upload again.", "nothing", { summary: res.summary }));
  const snap = snapshot();
  const created = [];
  try {
    const ctx = form.context(actor, now);
    for (const r of ready) {
      const made = form.applyRow(actor, r.values, ctx, now);
      if (!made.ok) throw Object.assign(new Error(made.error), { row: r.row });
      created.push({ row: r.row, ...made.record });
    }
    const entry = addHistory({ ...base, status: "imported", imported: created.length, skipped: res.rows.length - created.length, created: created.map((c) => c.id), requests: created.map((c) => c.requestId).filter(Boolean), problems: keepProblems(res.problems) }, now);
    if (!entry) throw new Error("Couldn't save. Browser storage may be full or disabled.");
    logEvent({ actorId: actor.id, kind: "import-done", detail: `${form.label}: ${base.fileName}: ${created.length} imported, ${res.rows.length - created.length} skipped (${entry.id})` }, now);
    return { ok: true, created, skipped: res.rows.filter((r) => r.status !== "ready"), summary: res.summary, historyId: entry.id };
  } catch (e) {
    restore(snap);
    const message = e.row ? `Row ${e.row} couldn't be saved (${e.message}), so nothing was imported.` : `Nothing was imported: ${e.message}`;
    addHistory({ ...base, status: "failed", reason: e.row ? `Row ${e.row} couldn't be saved: everything was rolled back.` : "The import couldn't be saved: everything was rolled back.", problems: keepProblems(res.problems) }, now);   // no value from the row
    logEvent({ actorId: actor.id, kind: "import-failed", detail: `${form.label}: ${base.fileName}: rolled back` }, now);
    return fail(message, "rolled-back");
  }
}

// ---------- templates and the error report ----------
export function templateRows(form, actor, now = Date.now()) {
  const ctx = form.context(actor, now);
  const cols = columnsFor(form, actor);
  const example = form.example(ctx, actor);
  return { headers: cols.map((c) => c.header), example: cols.map((c, i) => (i === 0 ? "EXAMPLE" : example[c.key] ?? "")), notes: form.notes(ctx, actor, cols) };
}
// -> { name, mime, bytes | text } for "csv" or "xlsx"
export async function templateFor(form, actorId, format = "csv", now = Date.now()) {
  const actor = active(actorId);
  if (!can(actor, form.permission)) return fail(`You can't import ${form.label.toLowerCase()}.`, "not-allowed");
  const t = templateRows(form, actor, now);
  const name = `${form.id}-template`;
  if (format === "xlsx") {
    const { writeXlsx } = await import("./xlsx.js");
    return { ok: true, name: `${name}.xlsx`, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: writeXlsx([t.headers, t.example], [["Notes"], ...t.notes.map((x) => [x])]) };   // the notes on their own sheet
  }
  return { ok: true, name: `${name}.csv`, mime: "text/csv", text: toCsv([t.headers, t.example, ...t.notes.map((x) => [`# ${x}`])]) };
}
// The problems as a CSV to download: row, column, problem.
export const errorReport = (problems) => toCsv([["Row", "Column", "Problem"], ...problems.map((p) => [String(p.row), p.column ?? "", p.message])]);