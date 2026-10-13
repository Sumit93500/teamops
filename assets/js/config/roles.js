// config/roles.js
// The four roles in the app and what each one is allowed to do.
// The key ("admin", "hr", "fin", "emp") is also the value used in <html data-role="...">,
// which is what recolors the page in tokens.css.

import { ALL_PERMISSIONS } from "./permissions.js";

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
];

export const ROLES = {
  admin: {
    key: "admin",
    label: "Admin",
    landing: "dashboard/admin.html",   // page opened after sign-in, relative to the pages folder
    dataScope: "all",                  // whose records this role can reach
    permissions: ALL_PERMISSIONS,      // the admin can do everything
  },

  hr: {
    key: "hr",
    label: "HR Manager",
    landing: "dashboard/hr.html",
    dataScope: "all",
    permissions: [
      ...SELF_SERVICE,
      "approvals:view", "approvals:decide",
      "users:view", "users:create", "users:edit", "users:reset-password", "users:deactivate",
      "pii:view",
      "departments:create", "departments:edit",
      "designations:manage", "designations:create", "designations:edit",
      "attendance:view-all", "attendance:approve",
      "leave:approve",
      "holidays:manage", "shifts:manage",
      "recruitment:view", "recruitment:create", "recruitment:edit",
      "announcements:create",
      "reports:view", "reports:export",
      "audit:view",
    ],
  },

  fin: {
    key: "fin",
    label: "Finance Manager",
    landing: "dashboard/finance.html",
    dataScope: "all",
    permissions: [
      ...SELF_SERVICE,
      "approvals:view", "approvals:decide",
      // no pii:view: nothing Finance does needs a full bank account or PAN yet (Round 7C)
      "payroll:view", "payroll:create", "payroll:export",   // note: no payroll:approve
      "payslips:view",
      "salary:view", "salary:edit",
      "expenses:view", "expenses:approve", "expenses:pay",
      "tax:view", "tax:manage",
      "reports:view", "reports:export", "reports:create",
    ],
  },

  emp: {
    key: "emp",
    label: "Employee",
    landing: "dashboard/employee.html",
    dataScope: "own",
    permissions: [...SELF_SERVICE],
  },
};

export const ROLE_KEYS = Object.keys(ROLES);   // ["admin", "hr", "fin", "emp"]

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