// SD1: what each role's dashboard offers, in one place: the "Do next" tiles (that role's main pages, one click each, each shown only when the
// person may open it, some with a count) and the attention list (what is waiting on the person, in words, each with its page). The
// dashboards draw them with ui/DashFrame.jsx; the numbers and charts stay each page's own.
//   kinds  admin, hr, fin, emp (the employee dashboard: everyone's landing who isn't Admin, HR or Finance; it adds the manager's tiles when
//          people report to the person, and the IT desk's when they hold it:requests-handle), it (the IT desk's page)
// Counts read the stores (they decide who sees what); a tile with nothing to count shows no number.
import { openable } from "../shell/appNav.js";
import { can } from "../../../assets/js/core/rbac.js";
import { waitingCount } from "../data/waiting.js";
import { taskSummary } from "../../../assets/js/data/tasks-store.js";
import { itSummary, itNoticesFor, exitsWithoutOffboarding } from "../../../assets/js/data/it-desk.js";
import { expiringRenewals } from "../../../assets/js/data/licences.js";
import { openRequests } from "../../../assets/js/data/own-requests.js";
import { pendingFor as leavePending } from "../../../assets/js/data/leave-store.js";
import { payableFor } from "../../../assets/js/data/expenses-store.js";
import { announcementNoticesFor } from "../../../assets/js/data/announcements.js";
import { isManager } from "../../../assets/js/data/reporting.js";
import { MY_TODO, TEAM_TASKS, IT_DASHBOARD, IT_REQUESTS, IT_NEW, IT_MINE, IT_LICENCES, IT_OFFBOARDING, ANNOUNCEMENTS, EXPORT_DATA, IMPORT_EMPLOYEES, HELP } from "../routes.js";

const INBOX = "requests/approvals-inbox.html";
// The tile catalogue: label, page, icon (assets/js/ui/icons.js names) and, where one helps, what it counts.
const TILES = {
  mark: { label: "Mark attendance", href: "attendance/mark-attendance.html", icon: "clock" },
  applyLeave: { label: "Apply for leave", href: "leave/apply-leave.html", icon: "calendar" },
  todo: { label: "My to-do", href: MY_TODO, icon: "tick", count: (c) => c.tasks?.open },
  myRequests: { label: "My requests", href: "requests/my-requests.html", icon: "chat", count: (c) => c.myPending },
  claim: { label: "Claim an expense", href: "requests/claim-expense.html", icon: "cash" },
  payslips: { label: "My payslips", href: "payroll/payslips.html", icon: "wallet" },
  myAttendance: { label: "My attendance", href: "attendance/my-attendance.html", icon: "calendar" },
  raiseIt: { label: "Ask IT for help", href: IT_NEW, icon: "laptop" },
  myIt: { label: "My IT requests", href: IT_MINE, icon: "laptop", count: (c) => c.itUpdates },
  approvals: { label: "Approvals", href: INBOX, icon: "check", count: (c) => c.waiting },
  teamAttendance: { label: "Team attendance", href: "attendance/team-attendance.html", icon: "users" },
  teamLeave: { label: "Team leave", href: "leave/team-leave.html", icon: "calendar" },
  teamTasks: { label: "Team tasks", href: TEAM_TASKS, icon: "list", count: (c) => c.tasks?.team?.overdue },
  leaveApprovals: { label: "Leave approvals", href: "leave/leave-approvals.html", icon: "calendar", count: (c) => c.leaveToDecide },
  users: { label: "Employees", href: "users/users-list.html", icon: "users" },
  shifts: { label: "Shifts", href: "attendance/shifts.html", icon: "sun" },
  importPeople: { label: "Import employees", href: IMPORT_EMPLOYEES, icon: "doc" },
  announcements: { label: "Announcements", href: ANNOUNCEMENTS, icon: "megaphone", count: (c) => c.newPosts },
  exportData: { label: "Export data", href: EXPORT_DATA, icon: "doc" },
  payrollRun: { label: "Payroll run", href: "payroll/payroll-run.html", icon: "wallet" },
  expenses: { label: "Expenses", href: "finance/expenses.html", icon: "cash", count: (c) => c.toPay },
  salary: { label: "Salary structure", href: "payroll/salary-structure.html", icon: "bars" },
  tax: { label: "Tax and deductions", href: "finance/tax-deductions.html", icon: "percent" },
  roles: { label: "Roles and access", href: "access/roles-list.html", icon: "lock" },
  settings: { label: "Settings", href: "system/settings.html", icon: "gear" },
  inventory: { label: "Inventory", href: "inventory/items.html", icon: "box" },
  itDesk: { label: "IT desk", href: IT_DASHBOARD, icon: "laptop", count: (c) => c.it?.awaiting },
  itRequests: { label: "Open IT requests", href: `${IT_REQUESTS}?view=open`, page: IT_REQUESTS, icon: "list", count: (c) => c.it?.open },
  itQueue: { label: "My queue", href: `${IT_REQUESTS}?view=mine`, page: IT_REQUESTS, icon: "tick", count: (c) => c.it?.mine },
  licences: { label: "Licences", href: IT_LICENCES, icon: "tag", count: (c) => c.expiring },
  offboarding: { label: "Offboarding", href: IT_OFFBOARDING, icon: "swap", count: (c) => c.exits },
  help: { label: "Help", href: HELP, icon: "chat" },
};
const LISTS = {
  admin: ["approvals", "users", "roles", "itDesk", "payrollRun", "inventory", "announcements", "settings"],
  hr: ["approvals", "leaveApprovals", "users", "teamAttendance", "shifts", "importPeople", "announcements", "exportData"],
  fin: ["approvals", "payrollRun", "expenses", "salary", "tax", "exportData"],
  emp: ["mark", "applyLeave", "todo", "myRequests", "claim", "payslips", "myAttendance", "raiseIt"],
  manager: ["approvals", "teamAttendance", "teamLeave", "teamTasks"],
  itdesk: ["itRequests", "itQueue", "licences", "offboarding"],
  it: ["itRequests", "itQueue", "licences", "offboarding", "inventory", "raiseIt"],
};

// The numbers the tiles and the attention list read, once per draw.
export function dashCounts(userId, roleKey, now = Date.now()) {
  const it = itSummary(userId, now);
  return {
    waiting: waitingCount(userId, roleKey),
    tasks: taskSummary(userId, now),
    it,
    itUpdates: itNoticesFor(userId, { unreadOnly: true }).length,
    expiring: expiringRenewals(userId, 30, now).length,
    exits: it ? exitsWithoutOffboarding(userId).length : 0,
    myPending: openRequests(userId).length,
    leaveToDecide: can("leave:approve") ? leavePending(userId, roleKey).length : 0,
    toPay: can("expenses:pay") ? payableFor(userId).length : 0,
    newPosts: announcementNoticesFor(userId, { unreadOnly: true }, now).length,
    manager: isManager(userId),
  };
}

const tile = (key, c) => {
  const t = TILES[key];
  const n = t.count ? t.count(c) : null;
  return { key, label: t.label, href: t.href, icon: t.icon, count: Number.isFinite(n) && n > 0 ? n : null };
};
// The kind's tiles the person may open, in order, each once (at most 8).
export function dashTiles(kind, c) {
  let keys = [...LISTS[kind]];
  if (kind === "emp" && c.manager) keys = [...LISTS.manager, ...keys];
  if (kind === "emp" && can("it:requests-handle")) keys = [...LISTS.itdesk, ...keys];
  const seen = new Set();
  return keys.filter((k) => !seen.has(k) && seen.add(k) && openable(TILES[k].page ?? TILES[k].href.split("?")[0])).slice(0, 8).map((k) => tile(k, c));
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// What waits on the person, most pressing first: { id, text, href, tone }
export function attentionItems(kind, c) {
  const out = [];
  const add = (id, cond, text, href, tone) => { if (cond && openable(href.split("?")[0])) out.push({ id, text, href, tone }); };
  add("approvals", c.waiting > 0, `${plural(c.waiting, "approval is", "approvals are")} waiting for you`, INBOX, "warning");
  add("tasks-overdue", c.tasks?.overdue > 0, `${plural(c.tasks?.overdue, "of your tasks is", "of your tasks are")} overdue`, MY_TODO, "danger");
  add("tasks-today", c.tasks?.dueToday > 0, `${plural(c.tasks?.dueToday, "task is", "tasks are")} due today`, MY_TODO, "info");
  add("team-overdue", c.tasks?.team?.overdue > 0, `${plural(c.tasks?.team?.overdue, "task in your team is", "tasks in your team are")} overdue`, TEAM_TASKS, "warning");
  if (c.it && (kind === "it" || kind === "admin" || can("it:requests-handle"))) {
    add("it-awaiting", can("it:approve") && c.it.awaiting > 0, `${plural(c.it.awaiting, "IT request waits", "IT requests wait")} for your approval`, `${IT_REQUESTS}?view=awaiting`, "warning");
    add("it-overdue", c.it.overdue > 0, `${plural(c.it.overdue, "IT request is", "IT requests are")} overdue`, `${IT_REQUESTS}?view=overdue`, "danger");
    add("it-unassigned", can("it:requests-handle") && c.it.unassigned > 0, `${plural(c.it.unassigned, "IT request has", "IT requests have")} nobody on it yet`, `${IT_REQUESTS}?view=unassigned`, "info");
    add("exits", c.exits > 0, `${plural(c.exits, "person has", "people have")} left with no offboarding on record`, IT_OFFBOARDING, "warning");
  }
  add("licences", c.expiring > 0 && (kind === "it" || kind === "fin" || kind === "admin" || can("it:licences-manage")), `${plural(c.expiring, "licence renews", "licences renew")} in the next 30 days`, IT_LICENCES, "info");
  add("posts", c.newPosts > 0, `${plural(c.newPosts, "new announcement", "new announcements")}`, ANNOUNCEMENTS, "info");
  add("it-updates", c.itUpdates > 0, `${plural(c.itUpdates, "update", "updates")} on your IT requests`, IT_MINE, "info");
  add("my-pending", c.myPending > 0, `${plural(c.myPending, "of your requests waits", "of your requests wait")} for a decision`, "requests/my-requests.html", "info");
  return out;
}