// pages/payroll-run.js
// Runs on payroll-run.html. Draws September 2026's run from
// data/payroll-store.js: the stat cards, the run's progress, every employee in
// it (with search and a status filter), the checks before approval and who
// prepared it. Nothing here works out pay; the store does.
//
// The run isn't stored yet: payrollRun() works it out from salaries,
// attendance and leave each time the page opens, so it is always a draft.
// "Approve run" is guarded the way approving will be (payroll:approve, and not
// the person who prepared it, through canApprove()), but approving can't be
// saved until a stored run record exists; clicking it says so.

import { payrollRun, canApprove, runTotals } from "../data/payroll-store.js";
import { getUser, getAllUsers } from "../data/store.js";
import { ROLES } from "../config/roles.js";
import { can, applyPermissions } from "../core/rbac.js";
import { getCurrentUserId } from "../core/auth.js";
import { el, nameOf, plural, departmentName, personCell, step } from "../ui/leave-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";
import { initPlaceholders } from "../ui/placeholder.js";
import { showToast } from "../ui/toast.js";

// The run this page shows. Kabir Shah (Finance Manager) prepared it, as the
// page always said; with no stored run there is no one else it could be.
const YEAR = 2026;
const MONTH = 9;
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
  setStatNote(stat("net"), "To be paid on 28 Sep", "up");
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
    ["Payment", "28 Sep"],
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

  // payslip-view.html isn't wired yet (it always shows one sample payslip), so
  // the link carries the employee and month for the payslip round to read, and
  // until then shows a "not available" toast instead of the wrong person's payslip.
  const actions = el("td", "table__actions");
  const link = el("a", "btn btn--sm", "View payslip");
  link.href = `payslip-view.html?employee=${encodeURIComponent(row.userId)}&month=${row.month}`;
  link.dataset.permission = "payslips:view";
  link.dataset.notImplemented = "Viewing a September payslip";
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

function renderChecks(run) {
  const noBank = run.rows.filter((r) => r.holdReason === NO_BANK).length;
  const noSalary = run.rows.filter((r) => r.holdReason === NO_SALARY).length;
  const lopRows = run.rows.filter((r) => r.lop.days > 0);
  const lopDays = lopRows.reduce((sum, r) => sum + r.lop.days, 0);
  const lopAmount = runTotals(run).lossOfPay;
  const done = ["badge badge--success", "Done"];
  const items = [
    checkItem("Bank details missing",
      noBank ? `${people(noBank)} can't be paid until a bank account is added` : "Everyone in this run has a bank account on file",
      ...(noBank ? ["badge badge--danger", "Fix"] : done), "computed"),
    checkItem("No salary on file",
      noSalary ? `${people(noSalary)} on hold with no salary for September` : "Everyone in this run has a salary for September",
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
  button.title = block || "Approve the September run";
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

// ---------- sidebar ----------

// The shared sidebar says "248 active employees" on every page; this page
// shows the real count (everyone not inactive, the same people as the run).
function renderHeadcount() {
  const n = getAllUsers().filter((u) => u.status !== "inactive").length;
  $("sidebar-headcount").textContent = `${n} active ${n === 1 ? "employee" : "employees"}`;
}

// ---------- start ----------

// The guard already sends anyone without payroll:view to the 403 page; this
// stops the figures being drawn in the moment before that happens.
if (can("payroll:view")) {
  const run = payrollRun(YEAR, MONTH, { preparedBy: PREPARED_BY });
  const approvers = approverNames(run);
  renderHeadcount();
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