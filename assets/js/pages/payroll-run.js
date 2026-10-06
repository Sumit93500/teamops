// pages/payroll-run.js
// Runs on payroll-run.html. Draws this month's run (runMonth()) from
// data/payroll-store.js: the stat cards, the run's progress, every employee in
// it (with search and a status filter), the checks before approval and who
// prepared it. Nothing here works out pay; the store does.
//
// The run isn't stored yet: payrollRun() works it out from salaries,
// attendance and leave each time the page opens, so it is always a draft, and
// the month is still in progress. "Approve run" is guarded the way approving
// will be (payroll:approve, and not the person who prepared it, through
// canApprove()), but approving can't be saved until a stored run record
// exists; clicking it says so. Paying, the pay date, locking attendance and
// the bank file aren't built; the page says so where they'd appear.

import { payrollRun, canApprove, runTotals, runMonth } from "../data/payroll-store.js";
import { ATTENDANCE_RULES } from "../data/attendance-store.js";
import { getUser, getAllUsers } from "../data/store.js";
import { ROLES } from "../config/roles.js";
import { can, applyPermissions } from "../core/rbac.js";
import { getCurrentUserId } from "../core/auth.js";
import { el, nameOf, plural, departmentName, personCell, step, todayIso, monthName, formatRange, formatDay } from "../ui/leave-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";
import { initPlaceholders } from "../ui/placeholder.js";
import { showToast } from "../ui/toast.js";

// Kabir Shah (Finance Manager) is shown as the run's preparer, as the page
// always said; with no stored run there is no one else it could be.
const PREPARED_BY = "EMP-1008";

const ROW_STATUS = {
  "draft":   { label: "Draft",   badge: "badge badge--warning badge--dot" },
  "on-hold": { label: "On hold", badge: "badge badge--danger badge--dot" },
};
const RUN_STATUS = {
  draft: { label: "Draft", badge: "badge badge--warning badge--dot", currentStep: 2 },
};
const NO_BANK = "No bank account on file";
const NO_SALARY = "No salary on file for this month";

const $ = (id) => document.getElementById(id);
const stat = (key) => document.querySelector(`[data-stat="${key}"]`);
const rupees = (n) => `₹${n.toLocaleString("en-IN")}`;
const people = (n) => plural(n, "employee", "employees");
const workingDays = (n) => plural(n, "working day", "working days");

// "2026-10" -> "October 2026"
const monthLabel = (month) => `${monthName(Number(month.slice(5, 7)))} ${month.slice(0, 4)}`;

let searchText = "";
let statusFilter = "";   // "" = all, or a row status

// ---------- who can approve ----------

// Everyone active whose role holds payroll:approve, except the preparer.
function approverNames(run) {
  return getAllUsers()
    .filter((u) => u.status !== "inactive" && u.id !== run.preparedBy && ROLES[u.role]?.permissions.includes("payroll:approve"))
    .map((u) => `${u.name}, ${ROLES[u.role].label}`);
}

// Why the signed-in person can't approve, or "" if they can.
function approveBlock(run, me) {
  if (!can("payroll:approve")) return "Approving a run needs the payroll:approve permission";
  if (!me) return "This session has no employee ID; sign out and back in to approve";
  if (!canApprove(run, me)) return "You prepared this run, so someone else has to approve it";
  return "";
}

// ---------- top of the page ----------

// The month's name in the title and its pay period from the month's days. No
// pay date: there's no payroll calendar.
function renderHeader(run) {
  const label = monthLabel(run.month);
  const period = run.rows[0]?.period;
  document.title = `Payroll run, ${label} | OfficeOS`;
  $("run-title").textContent = `Payroll run, ${label}`;
  $("run-subtitle").textContent = period
    ? `Pay period ${formatRange(period.from, period.to)} ${run.month.slice(0, 4)}; no pay date set`
    : "No pay date set";
}

function renderStats(run) {
  const totals = runTotals(run);
  const onHold = run.rows.filter((r) => r.status === "on-hold").length;
  setStatValue(stat("employees"), String(run.rows.length));
  setStatNote(stat("employees"), `${onHold} on hold`);
  setStatValue(stat("gross"), rupees(totals.gross));
  setStatNote(stat("gross"), totals.lossOfPay > 0 ? `After ${rupees(totals.lossOfPay)} loss of pay` : "No loss of pay");
  setStatValue(stat("deductions"), rupees(totals.deductions));
  setStatNote(stat("deductions"), "PF, PT and TDS");
  setStatValue(stat("net"), rupees(totals.net));
  setStatNote(stat("net"), "Draft, not paid yet");
}

function renderProgress(run, approvers) {
  const status = RUN_STATUS[run.status];
  const badge = $("run-status");
  badge.className = status.badge;
  badge.textContent = status.label;
  const steps = [
    ["Draft created", `Prepared by ${nameOf(run.preparedBy)}`],
    ["Review", "Finance checks the figures"],
    ["Approval", approvers.join("; ") || "No one can approve it yet"],
    ["Payment", "Not built yet"],
  ];
  const stateOf = (n) => (n < status.currentStep ? "done" : n === status.currentStep ? "current" : "");
  $("run-steps").replaceChildren(...steps.map(([title, detail], i) => step(stateOf(i + 1), i + 1, title, detail)));
}

// ---------- employees in this run ----------

function visibleRows(run) {
  const query = searchText.trim().toLowerCase();
  return run.rows.filter((r) =>
    (!statusFilter || r.status === statusFilter)
    && (!query || (getUser(r.userId)?.name ?? r.userId).toLowerCase().includes(query)));
}

function buildRow(row) {
  const user = getUser(row.userId);
  const sub = [departmentName(user?.department), row.holdReason].filter(Boolean).join(", ");
  const tr = el("tr");
  tr.dataset.userId = row.userId;

  const statusCell = el("td");
  const badge = el("span", ROW_STATUS[row.status]?.badge ?? "badge", ROW_STATUS[row.status]?.label ?? row.status);
  if (row.holdReason) badge.title = row.holdReason;
  statusCell.append(badge);

  // Opens this person's payslip for the run's month (payslip-view.html reads
  // ?employee and ?month).
  const actions = el("td", "table__actions");
  const link = el("a", "btn btn--sm", "View payslip");
  link.href = `payslip-view.html?employee=${encodeURIComponent(row.userId)}&month=${row.month}`;
  link.dataset.permission = "payslips:view";
  actions.append(link);

  tr.append(
    personCell(row.userId, user, sub),
    el("td", "table__num", rupees(row.gross)),
    el("td", "table__num", rupees(row.deductions)),
    el("td", "table__num", rupees(row.net)),
    statusCell,
    actions,
  );
  return tr;
}

function renderRows(run) {
  const tbody = $("run-rows");
  const shown = visibleRows(run);
  if (shown.length) {
    tbody.replaceChildren(...shown.map(buildRow));
  } else {
    const tr = el("tr");
    const td = el("td", "text-muted", "No employees match these filters.");
    td.colSpan = 6;
    tr.append(td);
    tbody.replaceChildren(tr);
  }
  applyPermissions(tbody);
  initPlaceholders(tbody);
  $("run-rows-meta").textContent = `Showing ${shown.length} of ${people(run.rows.length)}`;
}

// ---------- checks before approval ----------

function checkItem(title, sub, badgeClass, badgeText, kind) {
  const item = el("div", "list__item");
  item.dataset.check = kind;
  const content = el("div", "list__content");
  content.append(el("span", "list__title", title), el("span", "list__sub", sub));
  item.append(content, el("span", badgeClass, badgeText));
  return item;
}

// The run's absences that aren't deducted yet (the store's openAbsences, every
// row's together): "2 absences aren't deducted yet: they can still be
// corrected until 6 Nov." Each is either inside its correction window or
// waiting for a decision on a correction or leave request.
function openAbsencesText(open) {
  const waiting = open.filter((a) => a.waiting).length;
  const correctable = open.filter((a) => !a.waiting);
  const until = correctable.map((a) => a.until).sort().at(-1);
  const which = (n) => (n < open.length ? String(n) : n === 1 ? "it" : "they");
  const why = [
    correctable.length ? `${which(correctable.length)} can still be corrected until ${formatDay(until)}` : "",
    waiting ? `${which(waiting)} ${waiting === 1 ? "has" : "have"} a correction or leave request waiting for a decision` : "",
  ].filter(Boolean).join("; ");
  return `${plural(open.length, "absence isn't", "absences aren't")} deducted yet: ${why}.`;
}

// How much of the month attendance covers, the most for anyone in the run.
// Days before records began are paid in full with no loss-of-pay check; the
// current month never has any (attendance is seeded back to its 1st), but the
// page says so rather than show those figures as checked. Days not recorded
// yet, or absences that can still be explained, mean the month is still in
// progress. Absences that can't be counted (no readable joining date) need
// someone to look.
function attendanceCheck(run, label, done) {
  const most = (key) => Math.max(0, ...run.rows.map((r) => r.attendance[key]));
  const noData = most("noData");
  const notYet = most("notYet");
  const open = run.rows.flatMap((r) => r.attendance.openAbsences);
  const uncounted = run.rows.filter((r) => r.attendance.uncountedAbsences > 0);
  const parts = [];
  if (noData) parts.push(`${workingDays(noData)} of ${label} came before attendance records began; they're paid in full, without a loss-of-pay check.`);
  if (notYet) parts.push(`${label} isn't over: ${plural(notYet, "working day hasn't", "working days haven't")} been recorded yet, so late marks, unpaid leave and absences can still change these figures.`);
  if (open.length) parts.push(openAbsencesText(open));
  if (uncounted.length) {
    const who = uncounted.map((r) => `${nameOf(r.userId)} (${plural(r.attendance.uncountedAbsences, "absence", "absences")})`).join(", ");
    parts.push(`Not counted, with no readable joining date on file: ${who}.`);
  }
  // Someone who joined during the month: their days before joining aren't
  // absences, and nothing prorates the month's salary for them.
  const joiners = run.rows.filter((r) => r.attendance.beforeJoining > 0);
  if (joiners.length) {
    const who = joiners.map((r) => `${nameOf(r.userId)} (joined ${formatDay(r.attendance.joined)}, ${workingDays(r.attendance.beforeJoining)} before)`).join(", ");
    parts.push(`Joined during ${label}: ${who}. Days before joining aren't counted as absences, and the month's salary isn't prorated for them.`);
  }
  const badge = noData || uncounted.length || joiners.length ? ["badge badge--warning", "Review"] : notYet || open.length ? ["badge badge--info", "In progress"] : done;
  return checkItem("Attendance recorded", parts.join(" ") || `Every working day of ${label} is recorded`, ...badge, "computed");
}

function renderChecks(run) {
  const noBank = run.rows.filter((r) => r.holdReason === NO_BANK).length;
  const noSalary = run.rows.filter((r) => r.holdReason === NO_SALARY).length;
  const lopRows = run.rows.filter((r) => r.lop.days > 0);
  const lopDays = lopRows.reduce((sum, r) => sum + r.lop.days, 0);
  const lopAmount = runTotals(run).lossOfPay;
  const label = monthLabel(run.month);
  const month = monthName(Number(run.month.slice(5, 7)));
  const done = ["badge badge--success", "Done"];
  const items = [
    attendanceCheck(run, label, done),
    checkItem("Bank details missing",
      noBank ? `${people(noBank)} can't be paid until a bank account is added` : "Everyone in this run has a bank account on file",
      ...(noBank ? ["badge badge--danger", "Fix"] : done), "computed"),
    checkItem("No salary on file",
      noSalary ? `${people(noSalary)} on hold with no salary for ${month}` : `Everyone in this run has a salary for ${month}`,
      ...(noSalary ? ["badge badge--danger", "Fix"] : done), "computed"),
    checkItem("Salary edits pending",
      "Not checked: salary change requests aren't built yet",
      "badge", "Not tracked", "placeholder"),
    checkItem("Loss-of-pay days",
      lopRows.length ? `${plural(lopRows.length, "employee has", "employees have")} unpaid days (${plural(lopDays, "day", "days")}, ${rupees(lopAmount)})` : "No one has unpaid days this month",
      ...(lopRows.length ? ["badge badge--info", "Review"] : done), "computed"),
    checkItem("Approved leave included",
      "Approved unpaid leave is deducted; pending requests aren't counted",
      ...done, "rule"),
    checkItem("Unexplained absences",
      `A working day with no check-in and no approved leave costs a day's pay once its ${ATTENDANCE_RULES.requestWindowDays}-day correction window has closed `
        + "and no correction or leave request for it is waiting; days before someone's joining date aren't counted",
      ...done, "rule"),
  ];
  $("run-checks").replaceChildren(...items);
  $("run-checks-meta").textContent = `${items.length} checks`;
}

// ---------- run details, the alert and Approve ----------

function renderApproval(run, approvers) {
  const me = getCurrentUserId();
  const block = approveBlock(run, me);
  $("run-prepared-by").textContent = nameOf(run.preparedBy);
  $("run-approver").textContent = approvers.join("; ") || "No one";

  const button = $("approve-run");
  button.disabled = Boolean(block);
  button.title = block || `Approve the ${monthName(Number(run.month.slice(5, 7)))} run`;
  button.addEventListener("click", () => {
    if (approveBlock(run, getCurrentUserId())) return;   // checked again, in case the button was re-enabled by hand
    showToast("Approving isn't saved yet: payroll runs aren't stored in this demo, so this run stays a draft.", "info");
  });

  const preparer = nameOf(run.preparedBy);
  const live = "Attendance locking isn't built yet, so these figures are worked out from the live attendance and leave records each time the page opens.";
  let lead;
  if (me && me === run.preparedBy) lead = "You prepared this run, so you can't approve it. An Admin has to approve it before payslips are released.";
  else if (!block) lead = `${preparer} prepared this run. You can approve it, but approving isn't saved yet in this demo, so the run stays a draft.`;
  else lead = `${preparer} prepared this run. An Admin has to approve it before payslips are released.`;
  $("run-alert").textContent = `${lead} ${live}`;
}

// ---------- start ----------

// The guard already sends anyone without payroll:view to the 403 page; this
// stops the figures being drawn in the moment before that happens.
if (can("payroll:view")) {
  const { year, month } = runMonth(todayIso());
  const run = payrollRun(year, month, { preparedBy: PREPARED_BY });
  const approvers = approverNames(run);
  renderHeader(run);
  renderStats(run);
  renderProgress(run, approvers);
  renderRows(run);
  renderChecks(run);
  renderApproval(run, approvers);

  $("run-search").addEventListener("input", (e) => {
    searchText = e.target.value;
    renderRows(run);
  });
  $("run-status-filter").addEventListener("change", (e) => {
    statusFilter = e.target.value;
    renderRows(run);
  });
}