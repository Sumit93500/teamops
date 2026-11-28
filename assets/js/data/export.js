// data/export.js (I1, 2026-11-23): one export helper, and its first two modules. A file holds only what its exporter may see: the same
// people (the row scope of the list it comes from), the same fields (config/employee-fields.js, through data/employee-record.js
// exportReader), sensitive ones masked as on the profile. The full values of Aadhaar, bank account and PAN only for someone who may Show them
// (pii:view) AND who ticks "Include full sensitive values": that choice is written to the audit trail with the export.
//   modules   "employees" (export:employees: HR, Admin): the people list; "employees-pay" (export:employees-pay: Finance, the Admin): the pay
//             and bank columns Finance already sees, masked
//   exportFile(viewerId, module, { ids, includeSensitive, format, filters, now })
//             ids: the rows that match the list's filters (any id outside the exporter's scope is left out), or null for all they can see;
//             format "csv" | "xlsx"; filters: the words of the filters, for the log. -> { ok, name, mime, text | bytes, rows, columns } or a
//             refusal. At most 5,000 rows: more is refused, saying so.
// Every cell is protected against formula injection (data/csv.js protectCell: = + - @, a tab or a carriage return gets a leading
// apostrophe). CSV is UTF-8 with a BOM; dates are YYYY-MM-DD, as the column names say; the file is called <module>-<office date>.
// Every export (and every refused one) goes to the audit trail and the Import history: who, the module, the filters, the row count and
// whether sensitive values were in full. Never the file's contents.
import { getAllUsers, getUser, getAllDepartments, joiningDate } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { FIELD } from "../config/employee-fields.js";
import { exportReader, relationOf } from "./employee-record.js";
import { officeOf } from "./offices-store.js";
import { officeNow } from "./shift-engine.js";
import { logEvent } from "./audit-trail.js";
import { addHistory } from "./import-history.js";
import { toCsv } from "./csv.js";
import { RECORD_MODULES, isRecordModule } from "./export-records.js";   // I2: leave, attendance, expenses, visits, work tasks, the payroll register

export const EXPORT_LIMIT = 5000;
const STATUS = { active: "Active", "on-leave": "On leave", inactive: "Inactive" };
const DATE_KEYS = new Set(["dob", "dateOfJoining"]);
const fail = (error, code) => ({ ok: false, error, code });
const active = (id) => { const u = id ? getUser(String(id)) : null; return u && u.status !== "inactive" ? u : null; };

// what each module may put in a file: its own columns (from the user record) and the record fields (in this order), kept to what the viewer sees
export const EXPORT_MODULES = Object.freeze({
  employees: {
    label: "Employees", permission: "export:employees", relations: ["people"],
    own: ["id", "employeeCode", "status", "office"],
    fields: ["name", "email", "phone", "department", "designation", "manager", "dateOfJoining", "employmentType", "location", "role", "dob", "personalEmail", "address",
      "aadhaar", "bankAccount", "ifsc", "bankName", "branch", "accountHolder", "pan", "uan", "esi"],
  },
  "employees-pay": {
    label: "Employees' pay details", permission: "export:employees-pay", relations: ["people", "finance"],
    own: ["id", "status"],
    fields: ["name", "department", "bankAccount", "ifsc", "bankName", "branch", "accountHolder", "pan", "uan", "esi"],
  },
});
const OWN = { id: "Employee ID", employeeCode: "Employee code", status: "Status", office: "Office" };
const header = (key) => (OWN[key] ?? (FIELD[key].label + (DATE_KEYS.has(key) ? " (YYYY-MM-DD)" : "")));

// The relation the viewer has to everyone else (their own row may show more; the columns follow the others').
const relationToOthers = (viewer) => (hasPermission(viewer, "users:view") ? "people" : hasPermission(viewer, "salary:edit") ? "finance" : null);
const SEES = { people: ["team", "pay", "people"], finance: ["team", "pay"] };
// may this viewer have full sensitive values in a file: they may Show them on a profile (pii:view)
export const mayExportSensitive = (viewerId) => { const v = active(viewerId); return Boolean(v) && hasPermission(v, "pii:view"); };

// The columns a viewer's file of this module has: [{ key, header, sensitive }]
export function exportColumns(viewerId, module) {
  const m = EXPORT_MODULES[module], v = active(viewerId);
  if (!m || !v) return [];
  const rel = relationToOthers(v);
  const seen = (k) => rel && SEES[rel].includes(FIELD[k].see);
  return [...m.own.map((k) => ({ key: k, header: header(k), sensitive: false })), ...m.fields.filter(seen).map((k) => ({ key: k, header: header(k), sensitive: Boolean(FIELD[k].sensitive) }))];
}

// The people this viewer's file of this module may hold: their own record, and everyone they relate to as the module allows (relationOf's
// order: users:view makes everyone else "people", else salary:edit "finance"; a manager's relation is in no module's list).
export function exportScope(viewerId, module) {
  const m = EXPORT_MODULES[module], v = active(viewerId);
  if (!m || !v || !hasPermission(v, m.permission)) return [];
  const others = relationToOthers(v);
  return getAllUsers().filter((u) => u.id === v.id || (others ? m.relations.includes(others) : m.relations.includes(relationOf(v.id, u.id))));
}

function cellOf(user, key, values, departments) {
  if (key === "id") return user.id;
  if (key === "employeeCode") return user.employeeCode ?? "";
  if (key === "status") return STATUS[user.status] ?? user.status ?? "";
  if (key === "office") return officeOf(user.id)?.name ?? "";   // the offices box is small: read per row
  if (key === "department") return departments.find((d) => d.code === user.department)?.name ?? values.department ?? "";
  const v = values[key];
  if (DATE_KEYS.has(key)) return joiningDate(v) ?? String(v ?? "");
  return v == null ? "" : String(v);
}

// I2: from / to ("YYYY-MM-DD", office days) are the date range of a record module (data/export-records.js); the people modules ignore them.
export async function exportFile(viewerId, module, { ids = null, includeSensitive = false, format = "csv", filters = "", from = null, to = null, now = Date.now() } = {}) {
  const m = EXPORT_MODULES[module] ?? (isRecordModule(module) ? RECORD_MODULES[module] : null), v = active(viewerId);
  const refuse = (error, code, rows = 0) => {
    if (v) {
      logEvent({ actorId: v.id, kind: "export-refused", detail: `${m?.label ?? module}: export refused (${code})` }, now);
      if (m && hasPermission(v, m.permission)) addHistory({ kind: "export", module, actorId: v.id, status: "refused", reason: error, rows, filters: String(filters).slice(0, 200), sensitive: Boolean(includeSensitive), format }, now);
    }
    return fail(error, code);
  };
  if (!m) return refuse("There is no such export.", "unknown");
  if (!v || !hasPermission(v, m.permission)) return refuse(`You can't export ${m.label.toLowerCase()}.`, "not-allowed");
  if (includeSensitive && !mayExportSensitive(v.id)) return refuse("You can't export full Aadhaar, bank account or PAN numbers: they stay masked.", "sensitive");
  if (!["csv", "xlsx"].includes(format)) return refuse("Choose CSV or Excel.", "format");
  if (isRecordModule(module)) return recordFile(v, module, m, { includeSensitive, format, filters, from, to, now }, refuse);
  const scope = exportScope(v.id, module);
  const wanted = Array.isArray(ids) ? new Set(ids.map(String)) : null;
  const people = wanted ? scope.filter((u) => wanted.has(u.id)) : scope;
  if (!people.length) return refuse("There are no rows to export.", "empty");
  if (people.length > EXPORT_LIMIT) return refuse(`That's ${people.length.toLocaleString("en-IN")} rows; at most ${EXPORT_LIMIT.toLocaleString("en-IN")} can be exported at once. Narrow the filters and export in parts.`, "too-many", people.length);
  const cols = exportColumns(v.id, module);
  const read = exportReader(v.id);
  const departments = getAllDepartments();
  const keys = cols.map((c) => c.key).filter((k) => FIELD[k]);
  const rows = [cols.map((c) => c.header), ...people.map((u) => { const values = read(u, keys, includeSensitive) ?? {}; return cols.map((c) => cellOf(u, c.key, values, departments)); })];
  const day = officeNow(now).date;
  const base = `${module}-${day}`;
  const file = format === "xlsx"
    ? { name: `${base}.xlsx`, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: (await import("./xlsx.js")).writeXlsx(rows) }
    : { name: `${base}.csv`, mime: "text/csv;charset=utf-8", text: toCsv(rows) };
  const sensitive = includeSensitive && cols.some((c) => c.sensitive);
  const entry = addHistory({ kind: "export", module, actorId: v.id, status: "exported", rows: people.length, filters: String(filters).slice(0, 200), sensitive, format, fileName: file.name }, now);
  logEvent({ actorId: v.id, kind: "export-done", detail: `${m.label}: ${people.length} rows (${filters || "all they can see"}), ${format.toUpperCase()}, sensitive values ${sensitive ? "IN FULL" : "masked"}${entry ? ` (${entry.id})` : ""}` }, now);
  return { ok: true, ...file, rows: people.length, columns: cols.map((c) => c.header), historyId: entry?.id ?? null };
}

// ---------- I2: the record modules' files ----------
// The range is checked here (real days, the start not after the end, at most the module's days or months); the rows are the module's own
// read (data/export-records.js), the file and its log as above. The name: <module>-<from>-to-<to>.csv, like leave-2026-11-01-to-2026-11-30.csv.
const dayNumberOf = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d ?? "")); if (!m) return null; const t = Date.UTC(+m[1], +m[2] - 1, +m[3]); const x = new Date(t); return x.getUTCDate() === +m[3] && x.getUTCMonth() === +m[2] - 1 ? t / 86400000 : null; };
async function recordFile(v, module, m, { includeSensitive, format, filters, from, to, now }, refuse) {
  const a = dayNumberOf(from), b = dayNumberOf(to);
  if (a === null || b === null) return refuse("Choose the dates to export: a start and an end.", "range");
  if (a > b) return refuse("The start date is after the end date: swap them.", "range");
  if (b - a + 1 > m.maxDays) return refuse(`That's ${(b - a + 1).toLocaleString("en-IN")} days; at most ${m.maxDays} can be exported at once. Choose a shorter range.`, "range");
  if (m.maxMonths && (Number(to.slice(0, 4)) * 12 + Number(to.slice(5, 7))) - (Number(from.slice(0, 4)) * 12 + Number(from.slice(5, 7))) + 1 > m.maxMonths) return refuse(`At most ${m.maxMonths} months can be exported at once. Choose a shorter range.`, "range");
  const cols = m.columns();
  const rows = m.rows(v.id, { from, to, full: Boolean(includeSensitive) }, now);
  if (!rows.length) return refuse("There is nothing to export between those dates.", "empty");
  if (rows.length > EXPORT_LIMIT) return refuse(`That's ${rows.length.toLocaleString("en-IN")} rows; at most ${EXPORT_LIMIT.toLocaleString("en-IN")} can be exported at once. Choose a shorter range.`, "too-many", rows.length);
  const table = [cols.map((c) => c.header), ...rows.map((r) => cols.map((c) => (r[c.key] == null ? "" : String(r[c.key]))))];
  const base = `${module}-${from}-to-${to}`;
  const file = format === "xlsx"
    ? { name: `${base}.xlsx`, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: (await import("./xlsx.js")).writeXlsx(table) }
    : { name: `${base}.csv`, mime: "text/csv;charset=utf-8", text: toCsv(table) };
  const sensitive = Boolean(includeSensitive) && cols.some((c) => c.sensitive);
  const entry = addHistory({ kind: "export", module, actorId: v.id, status: "exported", rows: rows.length, filters: String(filters || `${from} to ${to}`).slice(0, 200), from, to, sensitive, format, fileName: file.name }, now);
  logEvent({ actorId: v.id, kind: "export-done", detail: `${m.label}: ${rows.length} rows (${filters || `${from} to ${to}`}), ${format.toUpperCase()}, sensitive values ${sensitive ? "IN FULL" : cols.some((c) => c.sensitive) ? "masked" : "none"}${entry ? ` (${entry.id})` : ""}` }, now);
  return { ok: true, ...file, rows: rows.length, columns: cols.map((c) => c.header), historyId: entry?.id ?? null };
}