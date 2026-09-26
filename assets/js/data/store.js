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
import { USERS, DEPARTMENTS, PROFILE_DETAILS, MANAGER_OF } from "./users.js";

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

// ---------- seeding and loading ----------

function seedUsers() {
  const managerName = (id) => USERS.find((u) => u.id === MANAGER_OF[id])?.name;
  const records = copy(USERS).map((user) => ({
    ...user,
    ...(managerName(user.id) ? { reportingManager: managerName(user.id) } : {}),   // PROFILE_DETAILS below wins if it has one
    ...copy(PROFILE_DETAILS[user.id] ?? {}),
    ...(DEMO_PII[user.id] ?? { bankAccount: null, bankAccountLast4: null, pan: null }),
  }));
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
  return isValidBox(box) && Number.isInteger(box.nextIdNum) ? box : seedUsers();
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

function emailTaken(records, email, exceptId) {
  const wanted = String(email).trim().toLowerCase();
  return records.some((u) => u.id !== exceptId && String(u.email).trim().toLowerCase() === wanted);
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

// ---------- user writes ----------

export function addUser(fields = {}) {
  const box = loadUsers();
  const { id: _ignored, ...rest } = fields;   // ids are always generated here
  if (!String(rest.name ?? "").trim()) return fail("Name is required.");
  if (!String(rest.email ?? "").trim()) return fail("Work email is required.");
  if (emailTaken(box.records, rest.email, null)) return fail(`${rest.email} is already used by another employee.`, "email");
  if (rest.department && !loadDepartments().records.some((d) => d.code === rest.department)) {
    return fail(`Unknown department "${rest.department}".`);
  }

  const record = {
    role: "emp",
    status: "active",
    bankAccount: null,
    bankAccountLast4: null,
    pan: null,
    ...copy(rest),
    id: formatId(box.nextIdNum),
  };
  box.records.push(record);
  box.nextIdNum += 1;   // only ever goes up, so a deleted id is never handed out again
  return commit(USERS_KEY, box, record);
}

export function updateUser(id, changes = {}) {
  const box = loadUsers();
  const record = box.records.find((u) => u.id === id);
  if (!record) return fail(`No employee with id ${id}.`);
  if ("id" in changes && changes.id !== id) return fail("An employee's id can't be changed.");
  // Same rule as deactivateUser(), so an edit form can't get round it.
  if (PROTECTED_IDS.includes(id) && changes.status === "inactive" && record.status !== "inactive") {
    return fail(`${id} is a demo sign-in identity and can't be deactivated.`);
  }
  if ("email" in changes && emailTaken(box.records, changes.email, id)) {
    return fail(`${changes.email} is already used by another employee.`, "email");
  }
  if (changes.department && !loadDepartments().records.some((d) => d.code === changes.department)) {
    return fail(`Unknown department "${changes.department}".`);
  }

  const { id: _ignored, ...rest } = changes;
  Object.assign(record, copy(rest));
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
  const [removed] = box.records.splice(index, 1);
  return commit(USERS_KEY, box, removed);
}

// ---------- department writes ----------

export function addDepartment(fields = {}) {
  const box = loadDepartments();
  const code = String(fields.code ?? "").trim();
  if (!/^[A-Z]{2,4}$/.test(code)) return fail("Department code must be 2 to 4 capital letters, e.g. MKT.");
  if (box.records.some((d) => d.code === code)) return fail(`Department code ${code} is already in use.`);
  if (!String(fields.name ?? "").trim()) return fail("Department name is required.");

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