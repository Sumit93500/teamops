// data/import-history.js (I1, 2026-11-23): the record of every import and export: who, when, which form or module, the file's name, size
// and sha256, how many rows were read, imported and skipped, the per-row problems as row, column and a reason with no value in it, the
// confirm token, and the ids of what was made. Never a file's contents and never personal data beyond ids.
//   "officeos:import-history" { version: 1, next, entries: [entry] }; entry { id "IH-n", kind "import" | "export", status, at, actorId, ... }
//   import status: "checked" (looked at, not imported yet: an abandoned one stays this way), "imported", "refused" (the file itself was
//   refused), "failed" (the write failed and was rolled back); export status: "exported", "refused"
// Reads are for import:history-view (HR, Admin) only; the writers are the engine and data/export.js.
import { load, save, remove } from "../core/storage.js";
import { getUser } from "./store.js";
import { hasPermission } from "../config/roles.js";

const KEY = "import-history";
const empty = () => ({ version: 1, next: 1, entries: [] });
const read = () => { const b = load(KEY); return b && b.version === 1 && Array.isArray(b.entries) && Number.isInteger(b.next) ? b : empty(); };
const copy = (v) => JSON.parse(JSON.stringify(v));
export const ERRORS_KEPT = 200;   // the per-row problems kept with an entry (the counts are always whole)

export function addHistory(entry, now = Date.now()) {
  const b = read();
  const e = { id: `IH-${b.next}`, at: new Date(now).toISOString(), ...copy(entry) };
  if (Array.isArray(e.problems) && e.problems.length > ERRORS_KEPT) { e.problemsCut = e.problems.length - ERRORS_KEPT; e.problems = e.problems.slice(0, ERRORS_KEPT); }
  b.entries.push(e);
  b.next += 1;
  return save(KEY, b) ? copy(e) : null;
}

// The entry an applied import left for a token (the engine's double-confirm check reads it whatever the viewer).
export const importedWithToken = (token) => copy(read().entries.find((e) => e.kind === "import" && e.status === "imported" && e.token === token) ?? null);

// Everything, newest first, for import:history-view. Filters: kind, status, from / to (YYYY-MM-DD, office time).
export function historyFor(viewerId, { kind = null, status = null, from = null, to = null } = {}) {
  const v = getUser(viewerId);
  if (!v || v.status === "inactive" || !hasPermission(v, "import:history-view")) return [];
  const day = (iso) => new Date(Date.parse(iso) + 330 * 60000).toISOString().slice(0, 10);
  return copy(read().entries.filter((e) => (!kind || e.kind === kind) && (!status || e.status === status) && (!from || day(e.at) >= from) && (!to || day(e.at) <= to))).reverse();
}

export function resetImportHistory() { remove(KEY); }