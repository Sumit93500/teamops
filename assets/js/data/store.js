// data/store.js
// The live, editable copy of users and departments, kept in localStorage so
// changes survive a reload in the same browser. Pages read and write through
// here, never through the constants in data/users.js.
//
// Why the constants can never be mutated:
//   - USERS, DEPARTMENTS and PROFILE_DETAILS are only read inside the two seed
//     functions below, and only through JSON.parse(JSON.stringify(...)). That
//     builds brand-new objects, so the seeded copy shares no references with
//     the constants: changing a seeded record cannot reach the original.
//   - After seeding, every read and write goes through load()/save(), which
//     themselves serialise to and from JSON text, so each call works on yet
//     another fresh copy.
//   - Read functions return deep copies too, so a page that edits the object
//     it was given changes nothing until it calls a write function.

import { save, load, remove } from "../core/storage.js";
import { USERS, DEPARTMENTS, DESIGNATIONS, PROFILE_DETAILS, MANAGER_OF } from "./users.js";
import { isValidDate } from "./holidays.js";

// The four demo sign-in identities (Admin, HR, Finance, Employee). Deactivating
// or deleting one would break signing in as that role, so it is refused.
const PROTECTED_IDS = ["EMP-1001", "EMP-1003", "EMP-1008", "EMP-1105"];

const USERS_KEY = "users";
const DEPARTMENTS_KEY = "departments";
const VERSION = 3;   // bump when the saved shape changes; old copies are then re-seeded (2: managers from MANAGER_OF, 3: full bank account)

// Demo-only sensitive values for the Reveal feature. Rohan's and Arjun's match
// what user-profile.html and my-profile.html already show masked. The full
// account number is what Reveal shows; it always ends in bankAccountLast4.
const DEMO_PII = {
  "EMP-1001": { bankAccount: "501734812290", bankAccountLast4: "2290", pan: "AMKPM5528Q" },
  "EMP-1003": { bankAccount: "609218456614", bankAccountLast4: "6614", pan: "BHNPN8091L" },
  "EMP-1008": { bankAccount: "318845203057", bankAccountLast4: "3057", pan: "CKSPS2746D" },
  "EMP-1017": { bankAccount: "724501398142", bankAccountLast4: "8142", pan: "DQRPI6630H" },
  "EMP-1023": { bankAccount: "452913675906", bankAccountLast4: "5906", pan: "EWTPJ1187M" },
  "EMP-1029": { bankAccount: "810366241473", bankAccountLast4: "1473", pan: "FLVPR9354B" },
  "EMP-1042": { bankAccount: "902457137305", bankAccountLast4: "7305", pan: "GJZPG4172K" },
  "EMP-1061": { bankAccount: "367082549218", bankAccountLast4: "9218", pan: "HTXPM3809C" },
  "EMP-1088": { bankAccount: "548129604561", bankAccountLast4: "4561", pan: "JNYPS7025R" },
  "EMP-1105": { bankAccount: "671540284821", bankAccountLast4: "4821", pan: "KPBPK3421F" },
};

const copy = (value) => JSON.parse(JSON.stringify(value));
const idNum = (id) => Number(String(id).replace(/^EMP-/, ""));
const formatId = (num) => `EMP-${num}`;
// `field` (optional) names the form field the error is about, so a page can show it there.
const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });

// Only an Admin may give someone the Admin role, directly or through a designation that carries it. A write that says
// who is saving ({ byRole }: the signed-in role's key) is held to that; one that doesn't (the seed, scripts) isn't.
const carriesAdmin = (fields) => fields.role === "admin" || DESIGNATIONS.find((d) => d.title === fields.designation)?.defaultRole === "admin";
const adminOnly = (byRole, fields) => byRole !== undefined && byRole !== "admin" && carriesAdmin(fields);
const ADMIN_ONLY = "Only an Admin can give someone the Admin role or save an Admin's details.";

// ---------- seeding and loading ----------

function seedUsers() {
  const managerName = (id) => USERS.find((u) => u.id === MANAGER_OF[id])?.name;
  const records = copy(USERS).map((user) => ({
    ...user,
    ...(managerName(user.id) ? { reportingManager: managerName(user.id) } : {}),   // PROFILE_DETAILS below wins if it has one
    ...copy(PROFILE_DETAILS[user.id] ?? {}),
    ...(DEMO_PII[user.id] ?? { bankAccount: null, bankAccountLast4: null, pan: null }),
  }));
  records.forEach((user) => { user.reportingManagerId = user.reportingManager ? managerIdByName(records, user.id, user.reportingManager) : null; });
  const nextIdNum = Math.max(...records.map((u) => idNum(u.id))) + 1;
  const box = { version: VERSION, nextIdNum, records };
  save(USERS_KEY, box);
  return box;
}

function seedDepartments() {
  const records = copy(DEPARTMENTS).map((dept) => ({ ...dept, active: true }));
  const box = { version: VERSION, records };
  save(DEPARTMENTS_KEY, box);
  return box;
}

// A saved copy is used only if it's intact and the current version; anything
// else (missing, corrupt, old shape) is replaced with a fresh seed.
function isValidBox(box) {
  return box && box.version === VERSION && Array.isArray(box.records);
}

function loadUsers() {
  const box = load(USERS_KEY);
  if (!(isValidBox(box) && Number.isInteger(box.nextIdNum))) return seedUsers();
  // Saved before managers were kept by id (round 9V): match each one's manager by name once, as it was then.
  const unkeyed = box.records.filter((u) => !("reportingManagerId" in u));
  unkeyed.forEach((user) => { user.reportingManagerId = user.reportingManager ? managerIdByName(box.records, user.id, user.reportingManager) : null; });
  if (unkeyed.length) save(USERS_KEY, box);
  return box;
}

function loadDepartments() {
  const box = load(DEPARTMENTS_KEY);
  return isValidBox(box) ? box : seedDepartments();
}

function commit(key, box, record) {
  return save(key, box)
    ? { ok: true, record: copy(record) }
    : fail("Couldn't save. Browser storage may be full or disabled.");
}

// Is this person the only one on record with the Admin role? (updateUser / deleteUser keep at least one.)
const isLastAdmin = (records, id) => !records.some((u) => u.id !== id && u.role === "admin");
const LAST_ADMIN = "There must always be an Admin: make someone else an Admin first.";

// The reporting manager is kept by id (reportingManagerId), with their name beside it (reportingManager), for display
// and for a manager who isn't on record (a department head). A name given without an id is matched once, when it's
// saved: the one active person with that exact name, else the one person with it at all; none, or two or more, is no
// manager. A namesake added or a rename later doesn't change who it is (round-9v-notes.md).
function managerIdByName(records, selfId, name) {
  const named = records.filter((u) => u.id !== selfId && u.name === name);
  const active = named.filter((u) => u.status === "active");
  return active.length === 1 ? active[0].id : named.length === 1 ? named[0].id : null;
}

// The manager fields to save for `fields` (selfId: the record's own id, null when adding): { reportingManagerId,
// reportingManager }, { error }, or null when `fields` names no manager.
function managerFields(records, selfId, fields) {
  if ("reportingManagerId" in fields) {
    const id = fields.reportingManagerId || null;
    if (!id) return { reportingManagerId: null, reportingManager: "" };
    const manager = records.find((u) => u.id === id);
    if (!manager) return { error: `No employee with id ${id}.` };
    if (id === selfId) return { error: "Someone can't be their own reporting manager." };
    return { reportingManagerId: id, reportingManager: manager.name };
  }
  if ("reportingManager" in fields) {
    const name = fields.reportingManager;
    return { reportingManagerId: name ? managerIdByName(records, selfId, name) : null, reportingManager: name };
  }
  return null;
}

function emailTaken(records, email, exceptId) {
  const wanted = String(email).trim().toLowerCase();
  return records.some((u) => u.id !== exceptId && String(u.email).trim().toLowerCase() === wanted);
}

// ---------- the joining date ----------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// A user's stored dateOfJoining, as profiles show it ("12 Jan 2023") or as
// "2023-01-12", -> "2023-01-12". null when there's none or it can't be read.
// Attendance reads days before it as "not-joined"; payroll counts absences only
// from it.
export function joiningDate(text) {
  const s = String(text ?? "").trim();
  const m = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/.exec(s);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  const iso = month === -1 ? s : `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return isValidDate(iso) ? iso : null;
}

// ---------- reads (always deep copies) ----------

export function getAllUsers() {
  return copy(loadUsers().records);
}

export function getUser(id) {
  const user = loadUsers().records.find((u) => u.id === id);
  return user ? copy(user) : null;
}

export function getAllDepartments() {
  return copy(loadDepartments().records);
}

export function getDepartment(code) {
  const dept = loadDepartments().records.find((d) => d.code === code);
  return dept ? copy(dept) : null;
}

export function peekNextId() {
  return formatId(loadUsers().nextIdNum);
}

// People per department code, e.g. { ENG: 4, HR: 1 }, from the live users.
// Inactive employees aren't counted. A department nobody is in has no key.
// (data/users.js has a function of the same name that counts the fixed
// built-in list; this one follows edits.)
export function headcountByDepartment() {
  const counts = {};
  getAllUsers()
    .filter((u) => u.status !== "inactive" && u.department)
    .forEach((u) => { counts[u.department] = (counts[u.department] ?? 0) + 1; });
  return counts;
}

// The reporting manager's name as pages show it: the current name of the person on record (a rename shows at once),
// else the name saved with the record (a manager who isn't on record, e.g. a department head). "" for none.
export function reportingManagerName(user) {
  const manager = user?.reportingManagerId ? loadUsers().records.find((u) => u.id === user.reportingManagerId) : null;
  return manager?.name ?? user?.reportingManager ?? "";
}

// How many employees aren't inactive (people on leave count): the sidebar's
// "N active employees" and the Admin dashboard's total.
export function activeHeadcount() {
  return getAllUsers().filter((u) => u.status !== "inactive").length;
}

// ---------- user writes ----------

export function addUser(fields = {}, { byRole } = {}) {
  const box = loadUsers();
  const { id: _ignored, ...rest } = fields;   // ids are always generated here
  if (adminOnly(byRole, rest)) return fail(ADMIN_ONLY);
  if (!String(rest.name ?? "").trim()) return fail("Name is required.");
  if (!String(rest.email ?? "").trim()) return fail("Work email is required.");
  if (emailTaken(box.records, rest.email, null)) return fail(`${rest.email} is already used by another employee.`, "email");
  if (rest.department && !loadDepartments().records.some((d) => d.code === rest.department)) {
    return fail(`Unknown department "${rest.department}".`);
  }
  const manager = managerFields(box.records, null, rest) ?? { reportingManagerId: null };
  if (manager.error) return fail(manager.error, "manager");

  const record = {
    role: "emp",
    status: "active",
    bankAccount: null,
    bankAccountLast4: null,
    pan: null,
    ...copy(rest),
    ...manager,
    id: formatId(box.nextIdNum),
  };
  box.records.push(record);
  box.nextIdNum += 1;   // only ever goes up, so a deleted id is never handed out again
  return commit(USERS_KEY, box, record);
}

export function updateUser(id, changes = {}, { byRole } = {}) {
  const box = loadUsers();
  const record = box.records.find((u) => u.id === id);
  if (!record) return fail(`No employee with id ${id}.`);
  if (adminOnly(byRole, changes)) return fail(ADMIN_ONLY);
  if ("id" in changes && changes.id !== id) return fail("An employee's id can't be changed.");
  // Same rule as deactivateUser(), so an edit form can't get round it.
  if (PROTECTED_IDS.includes(id) && changes.status === "inactive" && record.status !== "inactive") {
    return fail(`${id} is a demo sign-in identity and can't be deactivated.`);
  }
  // Same idea for the role: the last Admin can't stop being one, whoever asks (themselves included). With no Admin,
  // every approval's Admin stage would be skipped as a stage nobody holds.
  if (record.role === "admin" && "role" in changes && changes.role !== "admin" && isLastAdmin(box.records, id)) {
    return fail(LAST_ADMIN);
  }
  if ("email" in changes && emailTaken(box.records, changes.email, id)) {
    return fail(`${changes.email} is already used by another employee.`, "email");
  }
  if (changes.department && !loadDepartments().records.some((d) => d.code === changes.department)) {
    return fail(`Unknown department "${changes.department}".`);
  }
  const manager = managerFields(box.records, id, changes);
  if (manager?.error) return fail(manager.error, "manager");

  const { id: _ignored, ...rest } = changes;
  Object.assign(record, copy(rest), manager ?? {});
  return commit(USERS_KEY, box, record);
}

export function deactivateUser(id) {
  if (PROTECTED_IDS.includes(id)) {
    return fail(`${id} is a demo sign-in identity and can't be deactivated.`);
  }
  return updateUser(id, { status: "inactive" });
}

export function reactivateUser(id) {
  return updateUser(id, { status: "active" });
}

export function deleteUser(id) {
  if (PROTECTED_IDS.includes(id)) {
    return fail(`${id} is a demo sign-in identity and can't be deleted.`);
  }
  const box = loadUsers();
  const index = box.records.findIndex((u) => u.id === id);
  if (index === -1) return fail(`No employee with id ${id}.`);
  if (box.records[index].role === "admin" && isLastAdmin(box.records, id)) return fail(LAST_ADMIN);
  const [removed] = box.records.splice(index, 1);
  return commit(USERS_KEY, box, removed);
}

// ---------- department writes ----------

export function addDepartment(fields = {}) {
  const box = loadDepartments();
  const code = String(fields.code ?? "").trim();
  if (!/^[A-Z]{2,4}$/.test(code)) return fail("Department code must be 2 to 4 capital letters, e.g. MKT.", "code");
  if (box.records.some((d) => d.code === code)) return fail(`Department code ${code} is already in use.`, "code");
  if (!String(fields.name ?? "").trim()) return fail("Department name is required.", "name");

  const record = { head: "", active: true, ...copy(fields), code };
  box.records.push(record);
  return commit(DEPARTMENTS_KEY, box, record);
}

export function updateDepartment(code, changes = {}) {
  const box = loadDepartments();
  const record = box.records.find((d) => d.code === code);
  if (!record) return fail(`No department with code ${code}.`);
  if ("code" in changes && changes.code !== code) {
    return fail("A department's code can't be changed, because employees are linked to it.");
  }

  const { code: _ignored, ...rest } = changes;
  Object.assign(record, copy(rest));
  return commit(DEPARTMENTS_KEY, box, record);
}

// ---------- safety net ----------

// Throws away every change to users and departments in this browser. The next
// read re-seeds both from the untouched constants. The sign-in session is a
// separate key, so it is kept.
export function resetDemoData() {
  remove(USERS_KEY);
  remove(DEPARTMENTS_KEY);
}