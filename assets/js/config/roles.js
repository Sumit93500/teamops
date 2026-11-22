// config/roles.js
// The four roles in the app and what each one is allowed to do.
// The key ("admin", "hr", "fin", "emp") is also the value used in <html data-role="...">,
// which is what recolors the page in tokens.css.

import { ALL_PERMISSIONS, ALL_LOCATION_PERMISSIONS } from "./permissions.js";

// What EVERY signed-in person can do with their own data.
// Written once here, then reused by the roles below.
const SELF_SERVICE = [
  "dashboard:view",
  "attendance:view-own", "attendance:mark", "attendance:regularize",
  "leave:view-own", "leave:create", "leave:cancel",
  "expenses:create",
  "payslip:view-own", "payslip:download",
  "requests:view-own", "requests:cancel",
  "assets:view-own", "assets:request", "assets:report",
  "announcements:view",
  "profile:edit-own", "password:change-own", "sessions:end-own", "notifications:edit-own",
  // L0: see the offices, your own devices, and set your own home places (HR's home-eligible flag still decides that)
  "offices:view", "devices:view-own", "locations:set-own",
  // P5: your own tax regime and old-regime declaration
  "declarations:submit-own",
  // SH1: see your own shift (a manager also their team's), swap a date for your direct reports and decide their overtime
  // (both act only on direct reports: managing people is a relationship, not a permission)
  "shifts:view", "shifts:swap-team", "overtime:approve",
  // CV1: ask for a client / official visit; decide and assign them for direct reports (a relationship, as overtime)
  "visits:request", "visits:approve", "visits:assign",
  // IT1: raise IT tickets and requests for yourself
  "it:requests-create",
];

// FS1 (2026-11-22): the stored-file permissions the Admin role does NOT hold by default: seeing other people's expense files and employee
// documents is HR's and Finance's. Held back until Sumit rules on it (the Admin still sees and changes profile photos through users:edit).
export const ADMIN_HELD_BACK = ["files:view-expense", "files:view-documents", "files:manage-documents"];

export const ROLES = {
  admin: {
    key: "admin",
    label: "Admin",
    landing: "dashboard/admin.html",   // page opened after sign-in, relative to the pages folder
    dataScope: "all",                  // whose records this role can reach
    scopeLabel: "All records",         // the Data scope pages show: only what is enforced (Manager scoping part 2)
    permissions: ALL_PERMISSIONS.filter((p) => !ADMIN_HELD_BACK.includes(p)),   // the admin can do everything, except see other people's stored files (FS1)
  },

  hr: {
    key: "hr",
    label: "HR Manager",
    landing: "dashboard/hr.html",
    dataScope: "all",
    scopeLabel: "All records",
    permissions: [
      ...SELF_SERVICE,
      "approvals:view", "approvals:decide",
      "users:view", "users:create", "users:edit", "users:reset-password", "users:deactivate",
      "pii:view",
      "departments:create", "departments:edit",
      "designations:manage", "designations:create", "designations:edit",
      "attendance:view-all", "attendance:approve",
      "visits:view-all",   // CV1: every visit
      "leave:approve",
      "holidays:manage", "shifts:manage",
      "shifts:assign",   // SH1: put people and departments on shifts, swap anyone's date
      "recruitment:view", "recruitment:create", "recruitment:edit",
      "announcements:create",
      "reports:view", "reports:export",
      "audit:view",
      "accounts:reset",   // E1: a reset link or a new temporary password for someone (not an Admin)
      "files:view-expense", "files:view-documents", "files:manage-documents",   // FS1: expense files, every document file, add them for anyone
      "assets:view-all", "stock:view",   // AS1: every asset in the register (no values) and the stock ledger
    ],
  },

  fin: {
    key: "fin",
    label: "Finance Manager",
    landing: "dashboard/finance.html",
    dataScope: "all",
    scopeLabel: "All finance records",
    permissions: [
      ...SELF_SERVICE,
      "dashboard:finance",   // its landing, dashboard/finance.html (Manager scoping part 1); not overridable, as no landing page's permission is
      "approvals:view", "approvals:decide",
      // no pii:view: nothing Finance does needs a full bank account or PAN yet (Round 7C)
      "payroll:view", "payroll:create", "payroll:export",   // note: no payroll:approve
      "payslips:view",
      "salary:view", "salary:edit",
      "expenses:view", "expenses:approve", "expenses:pay",
      "tax:view", "tax:manage",
      "declarations:manage",   // P5: edit, verify and lock anyone's declaration; the cutoff
      "reports:view", "reports:export", "reports:create",
      "files:view-expense", "files:view-documents",   // FS1: expense files; bank and tax proof among document files (data/files.js)
      "assets:view-all", "assets:view-values", "stock:view", "depreciation:configure",   // AS1: every asset with its values; the stock ledger; depreciation settings
      "it:licences-view-costs",   // IT1: licence costs
    ],
  },

  emp: {
    key: "emp",
    label: "Employee",
    landing: "dashboard/employee.html",
    dataScope: "own",
    scopeLabel: "Own records, plus your direct reports if you manage people",
    permissions: [...SELF_SERVICE],
  },

  // IT1 (2026-11-22): the IT desk. Works IT requests, prepares accounts (never an Admin's) and offboarding, keeps licences, and is
  // the asset custodian: AS1's assets:manage, assets:issue, assets:maintain, vendors:manage and stock:move (the Admin keeps them
  // too, through every permission: the documented override). No pay, bank, tax, leave-approval, attendance-edit, people (users:*,
  // pii:view) or stored-file permission, and never it:approve: an Admin approves what IT prepares. Nobody is seeded with it.
  it: {
    key: "it",
    label: "IT",
    landing: "dashboard/employee.html",
    dataScope: "own",
    scopeLabel: "Own records, plus IT requests, licences and the asset register",
    permissions: [
      ...SELF_SERVICE,
      "it:requests-handle", "it:licences-manage", "it:account-prepare", "it:offboard",
      "assets:manage", "assets:issue", "assets:maintain", "vendors:manage", "stock:move",
      "assets:view-all", "stock:view",   // to see what it issues and keeps (no values: not assets:view-values)
    ],
  },
};

export const ROLE_KEYS = Object.keys(ROLES);   // ["admin", "hr", "fin", "emp", "it"]

// ---------- permission overrides (round 11R) ----------
// An Admin may grant someone a permission their role lacks, or deny one it
// holds, on their user record (grantPermissions / denyPermissions). Only these
// 25 can be (round-11r-notes.md R0). Never a landing page's permission, an
// approval stage (deciding, fulfilling, paying, preparing, or setting chains
// up), an Admin-only power, access administration (users, personal details,
// designations), everyone's own pages, or one kept for a feature not built yet.
export const OVERRIDABLE = [
  "departments:create", "departments:edit",
  "holidays:manage",
  "payroll:view", "payroll:export", "payslips:view", "salary:view",
  "expenses:view",
  "tax:view", "tax:manage",
  "inventory:view", "inventory:create", "inventory:edit",
  "assets:view",
  "vendors:view", "vendors:create", "vendors:edit",
  "recruitment:view", "recruitment:create", "recruitment:edit",
  "announcements:create",
  "reports:view", "reports:create", "reports:export",
  "audit:view",
];

// A record's overrides that apply: each list kept to OVERRIDABLE (anything
// else stored is ignored), and none at all for an Admin, who holds every
// permission. -> { grants, denies }
export function overridesOf(user) {
  if (!user || user.role === "admin") return { grants: [], denies: [] };
  const valid = (list) => (Array.isArray(list) ? list.filter((p) => OVERRIDABLE.includes(p)) : []);
  return { grants: valid(user.grantPermissions), denies: valid(user.denyPermissions) };
}

// Everything this person may do: their role's permissions, plus the ones
// granted to them, minus the ones denied. Worked out from the record passed in,
// on every call; nothing is kept. Whether they're active is the caller's check.
// [] for no record or a role that isn't one.
export function permissionsOf(user) {
  const role = user && Object.hasOwn(ROLES, user.role) ? ROLES[user.role] : null;
  if (!role) return [];
  const { grants, denies } = overridesOf(user);
  return [...new Set([...role.permissions, ...grants])].filter((p) => !denies.includes(p));
}

// ---------- offices, locations, devices, company profile ----------
// Since L0 (2026-11-12) the seven round-14 permissions are ordinary ones: in PERMISSIONS, held through each role's
// permissions (everyone's self-service: offices:view, devices:view-own, locations:set-own; the Admin: all). Not
// overridable. A manager gets nothing extra: managing people is a relationship, not a permission (unchanged).
// LOCATION_GRANTS: each role's share of them, read from ROLES (kept for round 14's callers).
export const LOCATION_GRANTS = Object.fromEntries(ROLE_KEYS.map((k) => [k, ROLES[k].permissions.filter((p) => ALL_LOCATION_PERMISSIONS.includes(p))]));

// Whether this person (a user record) holds a permission: permissionsOf() (role + overrides). Kept as round 14's name.
// Whether they're active is the caller's check, as with permissionsOf().
export function hasPermission(user, permission) {
  return permissionsOf(user).includes(permission);
}