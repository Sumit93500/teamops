// data/import-employees.js (I1, 2026-11-23): the first import form: new employees from a file (create only: nobody on record is changed).
// The engine (data/import-engine.js) reads and checks the file; this says what each column must hold and how one good row is saved.
//   Columns  Employee code (optional, unique), Full name, Work email (unique), Mobile, Department, Designation, Manager's work email,
//            Office (any active office), Employment type, Joining date (at most a year ahead, after the newest approved payroll month),
//            Shift (optional); and, only for someone who may see and change them (pii:view and users:edit: HR, Admin), Bank account,
//            IFSC (fills the bank name), Bank name, PAN, Aadhaar, checked by the employee form's own rules (config/employee-fields.js).
//   A row    is saved the way the employee form saves one person: addUser, the record's bank and Aadhaar fields (saveFields), the office
//            (setEmployeeOffice: only with offices:manage, as on the form; the Work location is the office's name either way), the shift
//            from the joining day (or today, when they joined before), and ONE new-account request to IT (it-desk.js
//            openNewAccountRequest). No sign-in is ever made here, not even for an Admin: IT prepares each one and an Admin approves it.
//   Mode     good rows: the rows with problems are skipped and listed (and can be downloaded as an error report).
import { getAllUsers, getAllDepartments, addUser, approvedMonthCovering, IT_DEPARTMENT } from "./store.js";
import { DESIGNATIONS } from "./users.js";
import { EMPLOYMENT_TYPES } from "./employment.js";
import { getOffices, setEmployeeOffice } from "./offices-store.js";
import { getShifts } from "./shifts-store.js";
import { assignShift } from "./shift-assignments.js";
import { officeNow, addDays } from "./shift-engine.js";
import { saveFields } from "./employee-record.js";
import { openNewAccountRequest } from "./it-desk.js";
import { hasPermission } from "../config/roles.js";
import { RULES } from "../config/employee-fields.js";
import { bankFromIfsc } from "../config/ifsc-banks.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const lower = (s) => String(s ?? "").trim().toLowerCase();
const ok = (value, warning) => (warning ? { value, warning } : { value });
const bad = (error, reason) => ({ error, reason: reason ?? error });
const isoOk = (y, m, d) => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; };
const iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
export const displayDate = (s) => { const [y, m, d] = s.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

// A date as people type it: 2026-12-01, 01-12-2026 or 01/12/2026 (day first, as in India), 1 Dec 2026, or Excel's day number. -> "YYYY-MM-DD" or null
export function readDate(text) {
  const s = String(text ?? "").trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return isoOk(+m[1], +m[2], +m[3]) ? iso(+m[1], +m[2], +m[3]) : null;
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s);
  if (m) return isoOk(+m[3], +m[2], +m[1]) ? iso(+m[3], +m[2], +m[1]) : null;
  m = /^(\d{1,2})[ -]([A-Za-z]{3})[A-Za-z]*[ -,]*(\d{4})$/.exec(s);
  if (m) { const k = MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase()); return k >= 0 && isoOk(+m[3], k + 1, +m[1]) ? iso(+m[3], k + 1, +m[1]) : null; }
  if (/^\d{5}$/.test(s)) { const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000); return d.toISOString().slice(0, 10); }   // Excel's day number (1900 system)
  return null;
}

// Who may bring in the bank, PAN and Aadhaar columns: someone who may see them in full and change them (HR, Admin).
export const maySensitive = (actor) => Boolean(actor) && hasPermission(actor, "pii:view") && hasPermission(actor, "users:edit");

function context(actor, now = Date.now()) {
  const users = getAllUsers();
  const departments = getAllDepartments();
  if (!departments.some((d) => d.code === IT_DEPARTMENT.code)) departments.push({ ...IT_DEPARTMENT });   // IT joins the list with its first person
  const today = officeNow(now).date;
  return {
    actor, today, latest: `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`,
    departments, designations: DESIGNATIONS.filter((d) => d.defaultRole !== "admin" || actor.role === "admin"), allDesignations: DESIGNATIONS,
    offices: getOffices(), shifts: getShifts(), managers: users.filter((u) => u.status === "active"),
    emails: new Map(users.map((u) => [lower(u.email), u.name])),
    codes: new Map(users.flatMap((u) => [[lower(u.id), u.name], ...(u.employeeCode ? [[lower(u.employeeCode), u.name]] : [])])),
  };
}

const byName = (list, v, ...keys) => list.find((x) => keys.some((k) => lower(x[k]) === lower(v)));
const rule = (name) => (v) => (RULES[name][0](v) ? ok(v) : bad(RULES[name][1], `not a valid ${name}`));

const COLUMNS = [
  { key: "code", header: "Employee code", required: false, help: "Optional. 2 to 20 letters, digits or dashes; unique.",
    validate: (v) => (/^[A-Za-z0-9-]{2,20}$/.test(v) ? ok(v.toUpperCase()) : bad("use 2 to 20 letters, digits or dashes", "not a valid code")) },
  { key: "name", header: "Full name", required: true, help: "2 to 80 characters.",
    validate: (v) => { const s = v.replace(/\s+/g, " "); return s.length < 2 || s.length > 80 ? bad("use 2 to 80 characters", "length") : /[<>]/.test(s) ? bad("can't contain < or >", "characters") : /^[=+@-]/.test(s) ? bad("can't start with = + - or @", "characters") : ok(s); } },
  { key: "email", header: "Work email", required: true, help: "Unique: nobody on record has it.",
    validate: (v) => (RULES.email[0](v) ? ok(v.toLowerCase()) : bad("not a valid email address", "not a valid email")) },
  { key: "phone", header: "Mobile", required: true, help: "At least 10 digits, like +91 98765 43210.",
    validate: (v) => (RULES.phone[0](v) ? ok(v) : bad("enter a number with at least 10 digits, like +91 98765 43210", "not a valid phone")) },
  { key: "department", header: "Department", required: true, help: "A department's name or code.",
    validate: (v, ctx) => { const d = byName(ctx.departments, v, "name", "code"); return d ? ok(d.code) : bad(`no department called "${v}"`, "unknown department"); } },
  { key: "designation", header: "Designation", required: true, help: "One of the designations; it sets the default role.",
    validate: (v, ctx) => {
      const d = byName(ctx.designations, v, "title");
      if (d) return ok(d.title);
      return byName(ctx.allDesignations, v, "title") ? bad("only an Admin can import someone with this designation (it carries the Admin role)", "admin designation") : bad(`no designation called "${v}"`, "unknown designation");
    } },
  { key: "manager", header: "Manager's work email", required: true, help: "The work email of an active employee.",
    validate: (v, ctx) => { const m = ctx.managers.find((u) => lower(u.email) === lower(v)); return m ? ok(m.id) : bad("no active employee has this work email", "unknown manager"); } },
  { key: "office", header: "Office", required: true, help: "An active office's name.",
    validate: (v, ctx) => { const o = byName(ctx.offices, v, "name", "id"); return o ? ok(o.id) : bad(`no active office called "${v}"`, "unknown office"); } },
  { key: "employmentType", header: "Employment type", required: true, help: EMPLOYMENT_TYPES.join(", "),
    validate: (v) => { const t = EMPLOYMENT_TYPES.find((x) => lower(x) === lower(v)); return t ? ok(t) : bad(`use one of ${EMPLOYMENT_TYPES.join(", ")}`, "unknown type"); } },
  { key: "joining", header: "Joining date", required: true, help: "Like 2026-12-01 (or 01-12-2026, day first); at most a year ahead.",
    validate: (v, ctx) => {
      const d = readDate(v);
      if (!d) return bad("not a date: write it like 2026-12-01", "not a date");
      if (d > ctx.latest) return bad("more than a year ahead", "too far ahead");
      if (approvedMonthCovering(d)) return bad("on or before a payroll month that is already approved: use a later date", "approved month");
      return ok(d);
    } },
  { key: "shift", header: "Shift", required: false, help: "Optional: an active shift's name. Empty: the department's shift.",
    validate: (v, ctx) => { const s = byName(ctx.shifts, v, "name", "id"); return s ? ok(s.id) : bad(`no active shift called "${v}"`, "unknown shift"); } },
  // the sensitive ones: only for maySensitive()
  { key: "bankAccount", header: "Bank account", required: false, sensitive: true, help: "9 to 18 digits; needs the IFSC.",
    validate: (v) => rule("account")(v.replace(/\s/g, "")) },
  { key: "ifsc", header: "IFSC", required: false, sensitive: true, help: "Like HDFC0001234; it fills the bank name.",
    validate: (v) => rule("ifsc")(v.toUpperCase()) },
  { key: "bankName", header: "Bank name", required: false, sensitive: true, help: "Optional: filled from the IFSC for the main banks.",
    validate: (v) => (v.length <= 80 && !/[<>]/.test(v) ? ok(v) : bad("use up to 80 characters, without < or >", "not a valid bank name")) },
  { key: "pan", header: "PAN", required: false, sensitive: true, help: "Like ABCPE1234F.",
    validate: (v) => rule("pan")(v.toUpperCase()) },
  { key: "aadhaar", header: "Aadhaar", required: false, sensitive: true, help: "12 digits; the last one is checked.",
    validate: (v) => rule("aadhaar")(v.replace(/\s/g, "")) },
];

// After every column passed: what needs two columns together.
function checkRow(v) {
  if ((v.bankAccount || v.bankName) && !v.ifsc) return { column: "IFSC", message: "needed when a bank account or bank name is given", reason: "IFSC missing" };
  return null;
}

// One good row, saved the way the employee form saves a person. -> { ok, record: { id, name, requestId } } or { ok: false, error }
function applyRow(actor, v, ctx, now) {
  const office = ctx.offices.find((o) => o.id === v.office);
  const role = DESIGNATIONS.find((d) => d.title === v.designation)?.defaultRole ?? "emp";
  const digits = v.bankAccount ?? "";
  const added = addUser(actor.id, {
    name: v.name, email: v.email, department: v.department, designation: v.designation, role, status: "active", phone: v.phone,
    dateOfJoining: displayDate(v.joining), employmentType: v.employmentType, location: office.name, reportingManagerId: v.manager,
    bankAccount: digits || null, bankAccountLast4: digits ? digits.slice(-4) : null, pan: v.pan || null,
    ...(v.code ? { employeeCode: v.code } : {}),
  });
  if (!added.ok) return added;
  const id = added.record.id;
  const record = Object.fromEntries([["ifsc", v.ifsc], ["bankName", v.bankName || (v.ifsc ? bankFromIfsc(v.ifsc) ?? "" : "")], ["aadhaar", v.aadhaar]].filter(([, x]) => x));
  if (Object.keys(record).length) { const r = saveFields(actor.id, id, record, now); if (!r.ok) return r; }
  if (office.type !== "head" && hasPermission(actor, "offices:manage")) { const r = setEmployeeOffice(actor.id, id, office.id); if (!r.ok) return r; }
  if (v.shift) { const r = assignShift(actor.id, id, v.shift, v.joining > ctx.today ? v.joining : ctx.today, null, "Imported", ctx.today); if (!r.ok) return r; }
  const req = openNewAccountRequest(actor.id, id, now);
  if (!req.ok) return req;
  return { ok: true, record: { id, name: v.name, requestId: req.record.id } };
}

function example(ctx) {
  const o = ctx.offices.find((x) => x.type === "head") ?? ctx.offices[0];
  const m = ctx.managers.find((u) => u.role === "hr") ?? ctx.managers[0];
  return {
    code: "", name: "Asha Verma", email: "asha.verma@example.com", phone: "+91 98765 43210", department: ctx.departments.find((d) => d.code === "ENG")?.name ?? ctx.departments[0]?.name ?? "",
    designation: "Software Engineer", manager: m?.email ?? "", office: o?.name ?? "", employmentType: "Full-time", joining: addDays(ctx.today, 7), shift: "",
    bankAccount: "", ifsc: "", bankName: "", pan: "", aadhaar: "",
  };
}

function notes(ctx, actor, cols) {
  const list = (xs) => xs.join(", ");
  return [
    "Delete the EXAMPLE row and these notes, or leave them: they are never imported.",
    `Required: ${list(cols.filter((c) => c.required).map((c) => c.header))}.`,
    `Departments: ${list(ctx.departments.map((d) => d.name))}.`,
    `Designations: ${list(ctx.designations.map((d) => d.title))}.`,
    `Offices: ${list(ctx.offices.map((o) => o.name))}.`,
    `Shifts (optional): ${list(ctx.shifts.map((s) => s.name))}.`,
    `Employment types: ${list(EMPLOYMENT_TYPES)}.`,
    "Manager's work email: the work email of an active employee.",
    "Dates: YYYY-MM-DD, like 2026-12-01 (01-12-2026 is read day first). Joining at most a year ahead.",
    ...(cols.some((c) => c.sensitive) ? ["Bank account: 9 to 18 digits, with the IFSC. PAN like ABCPE1234F. Aadhaar: 12 digits."] : []),
    "Each new employee gets no sign-in from the import: a sign-in request goes to IT for each one.",
    "At most 1,000 rows and 2 MB per file. Save as CSV UTF-8 or .xlsx.",
  ];
}

export const EMPLOYEES_FORM = Object.freeze({
  id: "employees", label: "Employees", permission: "import:employees", mode: "good-rows", maxRows: 1000,
  columns: COLUMNS, unique: [
    { key: "email", existing: (ctx) => ctx.emails },
    { key: "code", existing: (ctx) => ctx.codes },
  ],
  maySensitive, context, checkRow, applyRow, example, notes,
});