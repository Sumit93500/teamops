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