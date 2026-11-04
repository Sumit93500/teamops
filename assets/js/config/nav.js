// config/nav.js
// The sidebar, described as data. One list for the whole app.
// Each section is a module: an icon in the rail (ui/icons.js, SECTION_ICONS) and a
// flyout of its pages. A section the person can see one page of goes straight there.
// Each item says which permission is needed to see it. Nothing here mentions a role.
// ui/sidebar.js keeps only the items the signed-in person's permissions allow.
// alsoForManagers: true also shows the item to managers: anyone who has people
// reporting to them, or an expense claim waiting on them as its manager (they
// decide it at the manager stage).
// countWaiting: true shows how many requests wait for the person's decision (the
// approvals inbox's real Pending rows, ui/waiting.js), to everyone who sees the
// item; no count when nothing waits.
//
// href is relative to the "pages" folder. The special value "@landing" means
// "the signed-in role's own dashboard" (see config/roles.js).

export const NAV = [
  {
    group: "Dashboard", icon: "dashboard",
    items: [
      { label: "Dashboard", icon: "home",  href: "@landing", permission: "dashboard:view" },
    ],
  },
  {
    group: "Approvals", icon: "approvals",
    items: [
      { label: "Approvals", icon: "check", href: "requests/approvals-inbox.html", permission: "approvals:view", countWaiting: true, alsoForManagers: true },
    ],
  },
  {
    group: "Attendance", icon: "attendance",
    items: [
      { label: "My attendance",   icon: "clock",    href: "attendance/my-attendance.html",   permission: "attendance:view-own" },
      { label: "Mark attendance", icon: "tick",     href: "attendance/mark-attendance.html", permission: "attendance:mark" },
      { label: "Team attendance",      icon: "clock",  href: "attendance/team-attendance.html", permission: "attendance:view-all" },
      { label: "Shifts",               icon: "sun",    href: "attendance/shifts.html",       permission: "shifts:manage" },
    ],
  },
  {
    group: "Leave", icon: "leave",
    items: [
      { label: "My leave",        icon: "calendar", href: "leave/my-leave.html",             permission: "leave:view-own" },
      { label: "Leave approvals",      icon: "calendar", href: "leave/leave-approvals.html", permission: "leave:approve" },
    ],
  },
  {
    group: "Payroll", icon: "payroll",
    items: [
      { label: "My payslips",     icon: "doc",      href: "payroll/payslips.html",           permission: "payslip:view-own" },
      { label: "Payroll run",        icon: "cash",  href: "payroll/payroll-run.html",        permission: "payroll:view" },
      { label: "Salary structure",   icon: "bars",  href: "payroll/salary-structure.html",   permission: "salary:view" },
      { label: "Tax & deductions",   icon: "percent", href: "finance/tax-deductions.html",   permission: "tax:view" },
    ],
  },
  {
    group: "Requests & expenses", icon: "requests",
    items: [
      { label: "Requests",        icon: "chat",     href: "requests/my-requests.html",       permission: "requests:view-own" },
      { label: "Claim expense",   icon: "wallet",   href: "requests/claim-expense.html",     permission: "expenses:create" },
      { label: "Expenses",           icon: "wallet", href: "finance/expenses.html",          permission: "expenses:view" },
    ],
  },
  {
    group: "People", icon: "people",
    items: [
      { label: "Users",                icon: "users",  href: "users/users-list.html",        permission: "users:view" },
      { label: "Departments",          icon: "grid",   href: "users/departments.html",       permission: "departments:create" },
      { label: "Roles & permissions",  icon: "lock",   href: "access/roles-list.html",       permission: "roles:manage" },
      { label: "Designations",         icon: "tag",    href: "access/designations.html",     permission: "designations:manage" },
      { label: "Approval workflows",   icon: "flow",   href: "access/approval-workflows.html", permission: "workflows:view" },
      { label: "Delegation",           icon: "swap",   href: "access/delegation.html",       permission: "delegation:create" },
      { label: "Recruitment",          icon: "brief",  href: "recruitment/job-openings.html", permission: "recruitment:view" },
    ],
  },
  {
    group: "Assets & inventory", icon: "assets",
    items: [
      { label: "My assets",       icon: "laptop",   href: "inventory/my-assets.html",        permission: "assets:view-own" },
      { label: "Inventory",          icon: "box",   href: "inventory/items.html",            permission: "inventory:view" },
      { label: "Stock movements",    icon: "arrows", href: "inventory/stock-movements.html", permission: "inventory:view" },
      { label: "Asset assignment",   icon: "laptop", href: "inventory/asset-assignment.html", permission: "assets:view" },
      { label: "Vendors",            icon: "truck", href: "inventory/vendors.html",          permission: "vendors:view" },
    ],
  },
  {
    group: "Announcements", icon: "announcements",
    items: [
      { label: "Announcements", icon: "megaphone", href: "announcements/announcements.html", permission: "announcements:view" },
    ],
  },
  {
    group: "System", icon: "system",
    items: [
      { label: "Reports",    icon: "chart", href: "system/reports.html",    permission: "reports:view" },
      { label: "Audit log",  icon: "list",  href: "system/audit-log.html",  permission: "audit:view" },
      { label: "Settings",   icon: "gear",  href: "system/settings.html",   permission: "settings:edit" },
      { label: "Backup",     icon: "cloud", href: "system/backup.html",     permission: "backup:manage" },
    ],
  },
];