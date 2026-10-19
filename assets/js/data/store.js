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
import { ROLES, OVERRIDABLE, permissionsOf } from "../config/roles.js";
import { ROUTES } from "../config/routes.js";

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

// Only an Admin may give someone the Admin role, directly or through a designation that carries it. byRole is the
// acting person's role on record: every user write passes it since round 10Y (it was optional, the signed-in role's key).
const carriesAdmin = (fields) => fields.role === "admin" || DESIGNATIONS.find((d) => d.title === fields.designation)?.defaultRole === "admin";
const adminOnly = (byRole, fields) => byRole !== undefined && byRole !== "admin" && carriesAdmin(fields);
const ADMIN_ONLY = "Only an Admin can give someone the Admin role or save an Admin's details.";
// …and only an Admin may take it away: demote someone who holds it, or delete them (round 9W). The same opt-in: a write
// that says who is saving ({ byRole }) is held to it; every user write does since round 10Y.
const byNonAdmin = (byRole) => byRole !== undefined && byRole !== "admin";
const ADMIN_ONLY_REMOVE = "Only an Admin can take the Admin role away from someone or delete an Admin.";
const ADMIN_ONLY_DEACTIVATE = "Only an Admin can deactivate another Admin.";   // the same opt-in (round 9Y)

// Permission overrides (round 11R; round-11r-notes.md R0): only an Admin may change someone's grantPermissions /
// denyPermissions, never their own, and an Admin's record has none (an Admin holds every permission), so promoting
// someone who has overrides is refused too. Every value must be in OVERRIDABLE, none both granted and denied, and a deny
// may not take away what opens the role's own landing page. Checked only when a write changes a list (in any order) or
// promotes to Admin, so a form that re-sends the stored lists, or leaves them out, saves as before.
const OVERRIDE_FIELDS = ["grantPermissions", "denyPermissions"];
const OVERRIDES_ADMIN_ONLY = "Only an Admin can change permission overrides.";
const OVERRIDES_SELF = "You can't change your own permission overrides.";
const OVERRIDES_ON_ADMIN = "An Admin holds every permission, so an Admin can't have permission overrides.";
const isList = (list) => Array.isArray(list) && list.every((p) => typeof p === "string");
const sameList = (a, b) => JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort());
const storedList = (record, key) => (isList(record?.[key]) ? record[key] : []);
const overridesChange = (record, fields) =>
  OVERRIDE_FIELDS.some((k) => k in fields && !(isList(fields[k]) && sameList(fields[k], storedList(record, k))));
// Lists a write doesn't change aren't written: a re-sent copy (another order, a repeat) leaves the stored ones as they are.
const withoutUnchanged = (record, fields) =>
  (overridesChange(record, fields) ? fields : Object.fromEntries(Object.entries(fields).filter(([k]) => !OVERRIDE_FIELDS.includes(k))));

// What's wrong with this write's overrides, in words, or null. record: the stored record (null when adding).
function overridesProblem(actor, record, fields) {
  const role = "role" in fields ? fields.role : record?.role ?? "emp";
  const changed = overridesChange(record, fields);
  if (!changed && !(role === "admin" && record?.role !== "admin")) return null;
  if (changed && byNonAdmin(actor.role)) return OVERRIDES_ADMIN_ONLY;
  if (changed && record && actor.id === record.id) return OVERRIDES_SELF;
  const [grants, denies] = OVERRIDE_FIELDS.map((k) => (k in fields ? fields[k] : record?.[k] ?? []));
  if (!isList(grants) || !isList(denies)) return "Permission overrides must be lists of permissions.";
  if (role === "admin") return grants.length || denies.length ? OVERRIDES_ON_ADMIN : null;
  const landing = ROUTES[ROLES[role]?.landing];
  if (landing && denies.includes(landing)) return `${landing} can't be denied: it opens the ${ROLES[role].label} dashboard.`;
  const fixed = [...grants, ...denies].find((p) => !OVERRIDABLE.includes(p));
  if (fixed) return `${fixed} can't be granted or denied: it stays with the role.`;
  const both = grants.find((p) => denies.includes(p));
  return both ? `${both} can't be both granted and denied.` : null;
}

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

// Is this person the only active Admin? An inactive Admin doesn't count: every approval stage passes over inactive
// people, so they can't decide anything (round 9Y; 9U counted everyone on record). updateUser / deleteUser keep one.
const isLastAdmin = (records, id) => !records.some((u) => u.id !== id && u.role === "admin" && u.status !== "inactive");
const LAST_ADMIN = "There must always be an Admin: make someone else an Admin first.";
const LAST_ACTIVE_ADMIN = "There must always be an active Admin: make someone else an Admin, or reactivate one, first.";

// A prepared payroll run needs someone active, other than its preparer, whose record holds payroll:approve (in practice
// an Admin: it can't be overridden). A demotion, deactivation or deletion that would take the last one away is refused
// (round 11T, round-11s-notes.md S4 / S-D7). payroll-store.js imports this file, so the runs are read from storage
// here, as it saves them; an approved run needs no one. before / after: every user record, before and after the write.
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const approvesRun = (u, run) => u.status !== "inactive" && u.id !== run.preparedBy && permissionsOf(u).includes("payroll:approve");
function lastApproverProblem(before, after, record) {
  const box = load("payroll-runs");
  const prepared = box && box.version === 1 && Number.isInteger(box.nextNum) && Array.isArray(box.records) ? box.records.filter((r) => r.status === "prepared") : [];
  const run = prepared.find((r) => before.some((u) => approvesRun(u, r)) && !after.some((u) => approvesRun(u, r)));
  if (!run) return null;
  const preparer = before.find((u) => u.id === run.preparedBy)?.name ?? run.preparedBy;
  return `${record.name} is the only Admin who can approve ${MONTH_NAMES[Number(run.month.slice(5, 7)) - 1]} ${run.month.slice(0, 4)}'s payroll run (${preparer} prepared it): make someone else an Admin first.`;
}

// A pending request that nobody but its requester could decide would be stuck
// for good (round 11Z; 11M R5, 10G G2b): a role change, deactivation or
// deletion that leaves one so is refused, as lastApproverProblem() refuses
// leaving a prepared payroll run with no approver. Each kind keeps its chain in
// its own store (approval-chain.js for leave and corrections, expenses-store.js,
// asset-requests-store.js), and those import this file, so their rules are
// restated here over a list of user records, and the requests are read from
// storage as the stores save them. The approve permissions can't be overridden
// (round-11r-notes.md R0), so only a role, a status or a removal changes who
// holds a stage. Only a stage someone held before and nobody holds after is
// refused: one already without a holder doesn't block unrelated changes.
//   key       the stored collection;  word  how a refusal names it
//   fallback  who decides the manager stage when the manager can no longer
//             (and, for leave and corrections, when there's no manager on file;
//             an expense claim or asset request with none skipped that stage)
//   holds     who holds the later stages
const PENDING_KINDS = [
  { key: "leave-requests", word: "leave request", fallback: "hr", noManagerFallsBack: true,
    holds: (stage, u) => stage === "hr" && permissionsOf(u).includes("leave:approve") },
  { key: "regularizations", word: "attendance correction", fallback: "hr", noManagerFallsBack: true,
    holds: (stage, u) => stage === "hr" && permissionsOf(u).includes("attendance:approve") },
  { key: "expense-claims", word: "expense claim", fallback: "finance", noManagerFallsBack: false,
    holds: (stage, u) => (stage === "finance" ? u.role === "fin" : stage === "admin" && u.role === "admin") && permissionsOf(u).includes("expenses:approve") },
  { key: "asset-requests", word: "asset request", fallback: "admin", noManagerFallsBack: false,
    holds: (stage, u) => stage === "admin" && u.role === "admin" && permissionsOf(u).includes("assets:approve") },
];
const STAGE_WORD = { manager: "manager", hr: "HR", finance: "Finance", admin: "Admin" };

// May this user decide the request at its current stage, with `users` as the
// people on record? Never their own; the manager while they're active and not
// the requester, else the fallback stage's holders.
function decidesStage(kind, request, user, users) {
  if (!user || user.status === "inactive" || user.id === request.userId) return false;
  if (request.stage !== "manager") return kind.holds(request.stage, user);
  const manager = request.managerId ? users.find((u) => u.id === request.managerId) : null;
  if (manager && manager.status !== "inactive" && manager.id !== request.userId) return user.id === request.managerId;
  if (!request.managerId && !kind.noManagerFallsBack) return false;
  return kind.holds(kind.fallback, user);
}

// May this user pay the approved claim, with `users` as the people on record?
// expenses-store.js canPay() restated (round 12C), for the reason above: someone
// active with expenses:pay, never the claimant; the final approver only when
// nobody else may (approving and paying are kept apart unless that would leave
// the claim stuck). If payExpense's rule changes, this copy must change with it.
const mayPayClaim = (claim, u) => u.status !== "inactive" && permissionsOf(u).includes("expenses:pay") && u.id !== claim.userId;
function paysClaim(claim, user, users) {
  if (!mayPayClaim(claim, user)) return false;
  const approver = [...claim.history].reverse().find((h) => h.decision === "approved" || h.decision === "auto-approved")?.byUserId ?? null;
  return user.id !== approver || !users.some((u) => u.id !== approver && mayPayClaim(claim, u));
}

// Why going from the `before` users to the `after` ones would leave a pending
// request with nobody to decide it, or (round 12C) an approved expense claim
// with nobody but its requester able to pay it, in words, or null. `record` is
// the person changed or removed.
function strandedProblem(before, after, record) {
  for (const kind of PENDING_KINDS) {
    const box = load(kind.key);
    const pending = box && box.version === 1 && Number.isInteger(box.nextNum) && Array.isArray(box.records) ? box.records.filter((r) => r.status === "pending") : [];
    const stuck = pending.find((r) => before.some((u) => decidesStage(kind, r, u, before)) && !after.some((u) => decidesStage(kind, r, u, after)));
    if (stuck) {
      const requester = before.find((u) => u.id === stuck.userId)?.name ?? stuck.userId;
      return `${record.name} is the last person who can decide ${requester}'s ${kind.word} ${stuck.id}, now at the ${STAGE_WORD[stuck.stage] ?? stuck.stage} stage: decide it first, or make sure someone else can.`;
    }
  }
  const box = load("expense-claims");
  const approved = box && box.version === 1 && Number.isInteger(box.nextNum) && Array.isArray(box.records) ? box.records.filter((c) => c.status === "approved") : [];
  const unpaid = approved.find((c) => before.some((u) => paysClaim(c, u, before)) && !after.some((u) => paysClaim(c, u, after)));
  if (unpaid) {
    const requester = before.find((u) => u.id === unpaid.userId)?.name ?? unpaid.userId;
    return `${record.name} is the last person who can pay ${requester}'s expense claim ${unpaid.id}: pay it first, or make sure someone else can.`;
  }
  return null;
}

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

// A leaver's last working day ("YYYY-MM-DD"), or null: recorded when they're
// deactivated (deactivateUser), cleared when they're reactivated (round 11Y,
// R8 part iii; round-11x-notes.md X-D1). Kept like the joining date ("14 Nov
// 2026"); an inactive person from before 11Y has none, and is gone everywhere
// as before.
export const leavingDate = (user) => (user?.status === "inactive" ? joiningDate(user.dateOfLeaving) : null);

const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const showDate = (iso) => `${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const monthLabel = (month) => `${FULL_MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
const monthEnd = (month) => `${month}-${String(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()).padStart(2, "0")}`;
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// The approved payroll runs, read from storage as payroll-store.js saves them
// (it imports this file, so it can't be imported here), with the collection's
// own validity test.
function approvedRuns() {
  const box = load("payroll-runs");
  const runs = box && box.version === 1 && Number.isInteger(box.nextNum) && Array.isArray(box.records) ? box.records : [];
  return runs.filter((r) => r.status === "approved" && Array.isArray(r.rows));
}

// The months whose payroll run is approved and pays this person, newest first.
function approvedRunMonths(userId) {
  return approvedRuns().filter((r) => r.rows.some((row) => row.userId === userId)).map((r) => r.month).sort().reverse();
}

// Every month whose payroll run is approved, newest first (round 12E).
const approvedMonths = () => approvedRuns().map((r) => r.month).sort().reverse();

// Why `text` can't be this person's last working day, or null. It must be a
// date, no later than today, not before their joining date, and not before the
// end of the newest month an approved run pays them for: that month's figures
// are fixed, with the whole month paid (as a holiday can't be added to it,
// round 11V; arrears aren't built, round-11u-notes.md U-D5).
function leavingProblem(record, text) {
  const last = joiningDate(text);
  if (!last) return "Enter their last working day.";
  const today = localToday();
  if (last > today) return `The last working day can't be later than today (${showDate(today)}).`;
  const joined = joiningDate(record.dateOfJoining);
  if (joined && last < joined) return `The last working day can't be before the joining date (${showDate(joined)}).`;
  const paid = approvedRunMonths(record.id)[0];
  if (paid && last < monthEnd(paid)) {
    return `${monthLabel(paid)}'s payroll is approved and pays ${record.name} for all of it, so the last working day can't be before ${showDate(monthEnd(paid))}.`;
  }
  return null;
}

// Why this person's joining date can't change to `text`, or null (round 12E;
// round-12d-notes.md D12). Since 12D the joining date moves pay: a month is
// paid in full when it's on or before the month's first day, from that day when
// it's inside the month, and not at all (no row) when it's after it. So, as
// leavingProblem() holds a last working day:
//   - a leaver's joining date can't be after their last working day;
//   - no month whose payroll is approved may read the joining date differently
//     after the change, in either direction (its figures are fixed). Months
//     after a leaver's last working day, and anyone inactive with no last
//     working day on file (in no run since 11Y), aren't affected.
// Compared as dates, so the form re-sending the same date in another format, or
// still none, is no change.
function joiningProblem(record, text) {
  const before = joiningDate(record.dateOfJoining);
  const after = joiningDate(text);
  if (before === after) return null;
  const left = leavingDate(record);
  if (after && left && after > left) return `The joining date can't be after the last working day (${showDate(left)}).`;
  if (record.status === "inactive" && !left) return null;
  const reads = (month, date) => (!date || date <= `${month}-01` ? "in full" : date > monthEnd(month) ? "no row" : date);
  const fixed = approvedMonths().find((month) => !(left && `${month}-01` > left) && reads(month, before) !== reads(month, after));
  if (fixed) return `${monthLabel(fixed)}'s payroll is already approved for ${record.name}; the joining date can't be changed in a way that changes that month.`;
  return null;
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

// ---- who may write: each user write takes the acting person's id first and needs a permission on their record
// (actorWith(), below; round 10Y): add users:create, edit users:edit, deactivate / reactivate users:deactivate,
// delete users:delete (round 11N; Admin only: it used users:deactivate before there was one).

export function addUser(actorUserId, fields = {}) {
  const actor = actorWith(actorUserId, "users:create");
  if (!actor) return fail("You can't add employees.");
  const byRole = actor.role;
  const box = loadUsers();
  // ids are always generated here; additional roles were dropped (round 11R) and are never saved
  const { id: _ignored, extraRoles: _dropped, ...rest } = fields;
  if (adminOnly(byRole, rest)) return fail(ADMIN_ONLY);
  const overrides = overridesProblem(actor, null, rest);
  if (overrides) return fail(overrides);
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
    ...copy(withoutUnchanged(null, rest)),
    ...manager,
    id: formatId(box.nextIdNum),
  };
  box.records.push(record);
  box.nextIdNum += 1;   // only ever goes up, so a deleted id is never handed out again
  return commit(USERS_KEY, box, record);
}

export function updateUser(actorUserId, id, changes = {}) {
  const actor = actorWith(actorUserId, "users:edit");
  if (!actor) return fail("You can't edit employees.");
  return changeUser(actor, id, changes);
}

// updateUser()'s checks and save, for an acting person already checked
// (deactivateUser() and reactivateUser() come through here too).
function changeUser(actor, id, changes = {}) {
  const byRole = actor.role;
  const box = loadUsers();
  const record = box.records.find((u) => u.id === id);
  if (!record) return fail(`No employee with id ${id}.`);
  if (adminOnly(byRole, changes)) return fail(ADMIN_ONLY);
  if ("id" in changes && changes.id !== id) return fail("An employee's id can't be changed.");
  const overrides = overridesProblem(actor, record, changes);
  if (overrides) return fail(overrides);
  // Same rule as deactivateUser(), so an edit form can't get round it.
  if (PROTECTED_IDS.includes(id) && changes.status === "inactive" && record.status !== "inactive") {
    return fail(`${id} is a demo sign-in identity and can't be deactivated.`);
  }
  // Deactivating an Admin (round 9Y): only an Admin may, and never the last active one, whoever asks (themselves
  // included). Here rather than in deactivateUser(), so the form's "account active" box can't get round it.
  if (record.role === "admin" && changes.status === "inactive" && record.status !== "inactive") {
    if (isLastAdmin(box.records, id)) return fail(LAST_ACTIVE_ADMIN);
    if (byNonAdmin(byRole)) return fail(ADMIN_ONLY_DEACTIVATE);
  }
  // Same idea for the role: the last Admin can't stop being one, whoever asks (themselves included). With no Admin,
  // every approval's Admin stage would be skipped as a stage nobody holds.
  if (record.role === "admin" && "role" in changes && changes.role !== "admin" && isLastAdmin(box.records, id)) {
    return fail(LAST_ADMIN);
  }
  // Nobody deactivates their own account (the profile page's rule, held here too: round 10Y).
  if (changes.status === "inactive" && record.status !== "inactive" && actor.id === id) return fail("You can't deactivate your own account.");
  // Only an Admin may take the Admin role away from someone, however many Admins there are (round 9W).
  if (byNonAdmin(byRole) && record.role === "admin" && "role" in changes && changes.role !== "admin") return fail(ADMIN_ONLY_REMOVE);
  // A prepared payroll run's last approver (round 11T): only a role or status change can take them away.
  if ("role" in changes || "status" in changes) {
    const lastApprover = lastApproverProblem(box.records, box.records.map((u) => (u.id === id ? { ...u, ...changes } : u)), record);
    if (lastApprover) return fail(lastApprover);
    // ...and a pending request nobody else could decide (round 11Z)
    const stranded = strandedProblem(box.records, box.records.map((u) => (u.id === id ? { ...u, ...changes } : u)), record);
    if (stranded) return fail(stranded);
  }
  // A last working day with every deactivation (round 11Y; R8 part iii): the
  // profile's Deactivate asks for it. The edit form's "account active" box
  // can't give one, so it can't deactivate; and the date is set only then.
  const deactivating = changes.status === "inactive" && record.status !== "inactive";
  if (deactivating && !("dateOfLeaving" in changes)) return fail("Deactivate them from their profile, which asks for their last working day.", "status");
  if (deactivating) {
    const leaving = leavingProblem(record, changes.dateOfLeaving);
    if (leaving) return fail(leaving, "dateOfLeaving");
  } else if ("dateOfLeaving" in changes) {
    return fail("A last working day is recorded only when someone is deactivated.", "dateOfLeaving");
  }
  // ...and the joining date, which moves pay since round 12D (round 12E).
  if ("dateOfJoining" in changes) {
    const joining = joiningProblem(record, changes.dateOfJoining);
    if (joining) return fail(joining, "dateOfJoining");
  }
  if ("email" in changes && emailTaken(box.records, changes.email, id)) {
    return fail(`${changes.email} is already used by another employee.`, "email");
  }
  if (changes.department && !loadDepartments().records.some((d) => d.code === changes.department)) {
    return fail(`Unknown department "${changes.department}".`);
  }
  const manager = managerFields(box.records, id, changes);
  if (manager?.error) return fail(manager.error, "manager");

  const { id: _ignored, extraRoles: _dropped, ...rest } = changes;
  if (deactivating) rest.dateOfLeaving = showDate(joiningDate(changes.dateOfLeaving));   // kept like the joining date
  delete record.extraRoles;   // additional roles were dropped (round 11R): a stored list goes on the next save
  Object.assign(record, copy(withoutUnchanged(record, rest)), manager ?? {});
  if (record.status !== "inactive") delete record.dateOfLeaving;   // reactivated: no longer a leaver (round 11Y)
  return commit(USERS_KEY, box, record);
}

// lastDay: their last working day ("YYYY-MM-DD"), required (round 11Y).
export function deactivateUser(actorUserId, id, lastDay) {
  const actor = actorWith(actorUserId, "users:deactivate");
  if (!actor) return fail("You can't deactivate employees.");
  if (PROTECTED_IDS.includes(id)) {
    return fail(`${id} is a demo sign-in identity and can't be deactivated.`);
  }
  return changeUser(actor, id, { status: "inactive", dateOfLeaving: lastDay ?? "" });
}

export function reactivateUser(actorUserId, id) {
  const actor = actorWith(actorUserId, "users:deactivate");
  if (!actor) return fail("You can't reactivate employees.");
  return changeUser(actor, id, { status: "active" });
}

export function deleteUser(actorUserId, id) {
  const actor = actorWith(actorUserId, "users:delete");
  if (!actor) return fail("You can't delete employees.");
  const byRole = actor.role;
  if (PROTECTED_IDS.includes(id)) {
    return fail(`${id} is a demo sign-in identity and can't be deleted.`);
  }
  const box = loadUsers();
  const index = box.records.findIndex((u) => u.id === id);
  if (index === -1) return fail(`No employee with id ${id}.`);
  if (box.records[index].role === "admin" && isLastAdmin(box.records, id)) return fail(LAST_ADMIN);
  if (byNonAdmin(byRole) && box.records[index].role === "admin") return fail(ADMIN_ONLY_REMOVE);   // as in updateUser
  // Nobody deletes their own account (round 11N): updateUser's self-deactivation rule, in the same place after the
  // demo-identity and Admin rules.
  if (actor.id === id) return fail("You can't delete your own account.");
  const lastApprover = lastApproverProblem(box.records, box.records.filter((u) => u.id !== id), box.records[index]);   // as in changeUser (round 11T)
  if (lastApprover) return fail(lastApprover);
  const stranded = strandedProblem(box.records, box.records.filter((u) => u.id !== id), box.records[index]);   // as in changeUser (round 11Z)
  if (stranded) return fail(stranded);
  // Someone an approved payroll run pays keeps their record, so their payslips
  // can still be opened (round 11Y; round-11x-notes.md X-D3 (c)).
  const paid = approvedRunMonths(id);
  if (paid.length) return fail(`${box.records[index].name} is paid in an approved payroll run (${monthLabel(paid[0])}), so they can't be deleted. Deactivate them instead.`);
  const [removed] = box.records.splice(index, 1);
  return commit(USERS_KEY, box, removed);
}

// ---------- department writes ----------

// A department needs a name, and spaces alone aren't one: checked on add and on edit (round 10J).
const NAME_REQUIRED = "Department name is required.";
const hasName = (name) => String(name ?? "").trim() !== "";

// The acting person, if they are active and hold the permission on record
// (their role's, with their overrides: round 11R); else null. Their stored
// record decides, not the session
// (holidays.js's holidayManager(), round 10W; departments, round 10X; the user
// writes above, round 10Y).
function actorWith(userId, permission) {
  const user = userId ? getUser(userId) : null;
  return user && user.status !== "inactive" && permissionsOf(user).includes(permission) ? user : null;
}

export function addDepartment(actorUserId, fields = {}) {
  if (!actorWith(actorUserId, "departments:create")) return fail("You can't add departments.");
  const box = loadDepartments();
  const code = String(fields.code ?? "").trim();
  if (!/^[A-Z]{2,4}$/.test(code)) return fail("Department code must be 2 to 4 capital letters, e.g. MKT.", "code");
  if (box.records.some((d) => d.code === code)) return fail(`Department code ${code} is already in use.`, "code");
  if (!hasName(fields.name)) return fail(NAME_REQUIRED, "name");

  const record = { head: "", active: true, ...copy(fields), code };
  box.records.push(record);
  return commit(DEPARTMENTS_KEY, box, record);
}

export function updateDepartment(actorUserId, code, changes = {}) {
  if (!actorWith(actorUserId, "departments:edit")) return fail("You can't edit departments.");
  const box = loadDepartments();
  const record = box.records.find((d) => d.code === code);
  if (!record) return fail(`No department with code ${code}.`);
  if ("code" in changes && changes.code !== code) {
    return fail("A department's code can't be changed, because employees are linked to it.");
  }
  if ("name" in changes && !hasName(changes.name)) return fail(NAME_REQUIRED, "name");

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