// config/routes.js
// Maps every page in the app to the permission required to open it.
// core/guard.js checks the current page against this list on every load.
// A page with permission: null means "any signed-in person can open it".
// Auth pages (login, forgot-password, etc.) are not listed — they need no sign-in at all.

export const ROUTES = {
  "dashboard/admin.html":    "attendance:view-all",
  "dashboard/hr.html":       "leave:approve",
  "dashboard/finance.html":  "dashboard:view",
  "dashboard/employee.html": "dashboard:view",

  "requests/approvals-inbox.html": "approvals:view",
  "requests/my-requests.html":     "requests:view-own",

  "users/users-list.html":   "users:view",
  "users/user-form.html":    "users:create",
  "users/user-profile.html": "users:view",
  "users/departments.html":  "departments:create",

  "access/roles-list.html":         "roles:manage",
  "access/role-editor.html":        "roles:manage",
  "access/designations.html":       "designations:manage",
  "access/approval-workflows.html": "workflows:view",
  "access/delegation.html":         "delegation:create",

  "attendance/team-attendance.html": "attendance:view-all",
  "attendance/regularization.html":  "attendance:approve",
  "attendance/shifts.html":          "shifts:manage",
  "attendance/my-attendance.html":   "attendance:view-own",
  "attendance/mark-attendance.html": "attendance:mark",

  "leave/leave-approvals.html": "leave:approve",
  "leave/my-leave.html":        "leave:view-own",
  "leave/apply-leave.html":     "leave:create",
  "leave/holidays.html":        null,   // any signed-in person can view holidays

  "payroll/payroll-run.html":      "payroll:view",
  "payroll/salary-structure.html": "salary:view",
  "payroll/payslips.html":         null,   // page shows different data by scope, not by a single permission
  "payroll/payslip-view.html":     null,

  "finance/expenses.html":       "expenses:view",
  "finance/tax-deductions.html": "tax:view",

  "inventory/items.html":            "inventory:view",
  "inventory/stock-movements.html":  "inventory:view",
  "inventory/asset-assignment.html": "assets:assign",
  "inventory/vendors.html":          "vendors:create",
  "inventory/my-assets.html":        "assets:view-own",

  "recruitment/job-openings.html": "recruitment:view",
  "recruitment/candidates.html":   "recruitment:view",

  "announcements/announcements.html": "announcements:view",

  "system/reports.html":    "reports:view",
  "system/audit-log.html":  "audit:view",
  "system/settings.html":   "settings:edit",
  "system/backup.html":     "backup:manage",

  "account/my-profile.html":       null,   // every signed-in person can open their own account pages
  "account/change-password.html":  null,
  "account/sessions.html":         null,
  "account/notifications.html":    null,
};