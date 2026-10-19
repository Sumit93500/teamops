// pages/payroll-run.js
// Runs on payroll-run.html. Draws one month's run from data/payroll-store.js:
// the stat cards, the run's progress, every employee in it (with search and a
// status filter), the checks before approval and who prepared and approved it.
// Nothing here works out pay; the store does.
//
// The month is ?month=YYYY-MM, else this month (runMonth()). A month nobody
// has prepared is a live draft: payrollRun() works it out from salaries,
// attendance and leave each time the page opens. Prepare (payroll:create)
// stores the month's figures as they are; Approve (payroll:approve, and not
// the person who prepared it) approves exactly those, and they don't change
// after that. Both are the store's writes, checked there on the acting
// person's record (round 11T), and each button shows the store's reason when
// it would refuse. A month can be prepared once it has ended and nothing in it
// is still open, so this month never can; the page links to the month before.
// Paying, the pay date and the bank file aren't built; the page says so where
// they'd appear.

import { payrollRun, storedRun, approversFor, canApprove, runProblems, prepareProblem, approveProblem, prepareRun, approveRun, runTotals, runMonth } from "../data/payroll-store.js";
import { ATTENDANCE_RULES } from "../data/attendance-store.js";
import { getUser } from "../data/store.js";
import { ROLES } from "../config/roles.js";
import { can, applyPermissions } from "../core/rbac.js";
import { getCurrentUserId } from "../core/auth.js";
import { el, escapeHtml, nameOf, plural, departmentName, personCell, step, todayIso, monthName, formatRange, formatDay } from "../ui/leave-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";
import { initPlaceholders } from "../ui/placeholder.js";
import { showToast } from "../ui/toast.js";

const ROW_STATUS = {
  "draft":   { label: "Draft",   badge: "badge badge--warning badge--dot" },
  "on-hold": { label: "On hold", badge: "badge badge--danger badge--dot" },
};
// The run's state. done / current: its progress steps (1 Draft, 2 Prepared,
// 3 Approval, 4 Payment), current 0 for none. A row that isn't on hold shows
// the run's label.
const RUN_STATUS = {
  draft:    { label: "Draft",    badge: "badge badge--warning badge--dot", done: 1, current: 2, net: "Draft, not paid yet" },
  prepared: { label: "Prepared", badge: "badge badge--info badge--dot",    done: 2, current: 3, net: "Prepared, not approved yet" },
  approved: { label: "Approved", badge: "badge badge--success badge--dot", done: 3, current: 0, net: "Approved, not paid yet" },
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
// "2026-11-09T10:00" -> "9 Nov 2026"
const dayOf = (stamp) => formatDay(stamp.slice(0, 10), true);

let searchText = "";
let statusFilter = "";   // "" = all, or a row status

// ---------- which month, and whose rows ----------

// ?month=YYYY-MM, else this month.
function viewedMonth() {
  const asked = (new URLSearchParams(window.location.search).get("month") ?? "").trim();
  const match = /^(\d{4})-(\d{2})$/.exec(asked);
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) return { year: Number(match[1]), month: Number(match[2]) };
  return runMonth(todayIso());
}

// A stored row keeps the name and department it was prepared with (the person
// may have left since); a live row is read from today's record.
const rowName = (row) => row.name ?? getUser(row.userId)?.name ?? row.userId;
const rowDepartment = (row) => ("department" in row ? row.department : getUser(row.userId)?.department);

// Who can approve, from the store (approversFor()): "Aarav Mehta, Admin".
const approverNames = (run) => approversFor(run).map((u) => `${u.name}, ${ROLES[u.role]?.label ?? u.role}`);

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

// Links to the month before and, up to this month, the one after. This month
// can't be prepared until it has ended, so the month before is the latest one
// that can be.
function renderMonths(run) {
  const y = Number(run.month.slice(0, 4));
  const m = Number(run.month.slice(5, 7));
  const key = (year, month) => `${year}-${String(month).padStart(2, "0")}`;
  const link = (month, text) => Object.assign(el("a", "link", text), { href: `payroll-run.html?month=${month}`, title: monthLabel(month) });
  const before = m === 1 ? key(y - 1, 12) : key(y, m - 1);
  const after = m === 12 ? key(y + 1, 1) : key(y, m + 1);
  const links = [link(before, "Previous month")];
  if (after <= todayIso().slice(0, 7)) links.push(" · ", link(after, "Next month"));
  $("run-months").replaceChildren(...links);
}

function renderStats(run) {
  const totals = run.totals ?? runTotals(run);
  const onHold = run.rows.filter((r) => r.status === "on-hold").length;
  setStatValue(stat("employees"), String(run.rows.length));
  setStatNote(stat("employees"), `${onHold} on hold`);
  setStatValue(stat("gross"), rupees(totals.gross));
  setStatNote(stat("gross"), totals.lossOfPay > 0 ? `After ${rupees(totals.lossOfPay)} loss of pay` : "No loss of pay");
  setStatValue(stat("deductions"), rupees(totals.deductions));
  setStatNote(stat("deductions"), "PF, PT and TDS (sample tax rates)");   // TDS is worked out on data/payroll.js's TAX_SAMPLE
  setStatValue(stat("net"), rupees(totals.net));
  setStatNote(stat("net"), RUN_STATUS[run.status].net);
}

function renderProgress(run, approvers) {
  const status = RUN_STATUS[run.status];
  const badge = $("run-status");
  badge.className = status.badge;
  badge.textContent = status.label;
  const steps = [
    ["Draft", "Worked out from the live records"],
    ["Prepared", run.status === "draft" ? "Not prepared yet" : `By ${nameOf(run.preparedBy)} on ${dayOf(run.preparedAt)}`],
    ["Approval", run.status === "approved" ? `By ${nameOf(run.approvedBy)} on ${dayOf(run.approvedAt)}` : approvers.join("; ") || "No one can approve it yet"],
    ["Payment", "Not built yet"],
  ];
  const stateOf = (n) => (n <= status.done ? "done" : n === status.current ? "current" : "");
  $("run-steps").replaceChildren(...steps.map(([title, detail], i) => step(stateOf(i + 1), i + 1, title, detail)));
}

// ---------- employees in this run ----------

function visibleRows(run) {
  const query = searchText.trim().toLowerCase();
  return run.rows.filter((r) =>
    (!statusFilter || r.status === statusFilter)
    && (!query || rowName(r).toLowerCase().includes(query)));
}

function buildRow(run, row) {
  const sub = [departmentName(rowDepartment(row)), row.holdReason].filter(Boolean).join(", ");
  const tr = el("tr");
  tr.dataset.userId = row.userId;

  const statusCell = el("td");
  const shown = row.status === "draft" ? RUN_STATUS[run.status] : ROW_STATUS[row.status];
  const badge = el("span", shown?.badge ?? "badge", shown?.label ?? row.status);
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
    personCell(row.userId, { name: rowName(row) }, sub),
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
    tbody.replaceChildren(...shown.map((row) => buildRow(run, row)));
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
  const paused = run.rows.filter((r) => r.attendance.pausedLateMarks > 0);   // G4 (round 11W): not counted while a late-arrival correction waits
  const parts = [];
  if (noData) parts.push(`${workingDays(noData)} of ${label} came before attendance records began; they're paid in full, without a loss-of-pay check.`);
  if (notYet) parts.push(`${label} isn't over: ${plural(notYet, "working day hasn't", "working days haven't")} been recorded yet, so late marks, unpaid leave and absences can still change these figures.`);
  if (open.length) parts.push(openAbsencesText(open));
  if (paused.length) {
    const marks = paused.reduce((sum, r) => sum + r.attendance.pausedLateMarks, 0);
    parts.push(`${plural(marks, "late mark isn't", "late marks aren't")} counted yet: a late-arrival correction for ${marks === 1 ? "it is" : "each is"} waiting for a decision (${paused.map(rowName).join(", ")}).`);
  }
  if (uncounted.length) {
    const who = uncounted.map((r) => `${rowName(r)} (${plural(r.attendance.uncountedAbsences, "absence", "absences")})`).join(", ");
    parts.push(`Not counted, with no readable joining date on file: ${who}.`);
  }
  // Someone who joined during the month (round 12D): paid from the joining
  // date; the working days before it are loss of pay.
  const joiners = run.rows.filter((r) => r.attendance.beforeJoining > 0);
  if (joiners.length) {
    const who = joiners.map((r) => `${rowName(r)} (joined ${formatDay(r.attendance.joined)}, ${workingDays(r.attendance.beforeJoining)} before)`).join(", ");
    parts.push(`Joined during ${label}: ${who}. The month is paid from the joining date.`);
  }
  // Someone who left during the month (round 11Y): paid up to their last
  // working day; the days after it are loss of pay.
  const leavers = run.rows.filter((r) => r.attendance.lastDay);
  if (leavers.length) {
    const who = leavers.map((r) => `${rowName(r)} (last working day ${formatDay(r.attendance.lastDay)}, ${workingDays(r.lop.leftDays ?? 0)} after)`).join(", ");
    parts.push(`Left during ${label}: ${who}. The month is paid up to the last working day.`);
  }
  const badge = noData || uncounted.length || joiners.length || leavers.length ? ["badge badge--warning", "Review"] : notYet || open.length || paused.length ? ["badge badge--info", "In progress"] : done;
  return checkItem("Attendance recorded", parts.join(" ") || `Every working day of ${label} is recorded`, ...badge, "computed");
}

function renderChecks(run) {
  const noBank = run.rows.filter((r) => r.holdReason === NO_BANK).length;
  const noSalary = run.rows.filter((r) => r.holdReason === NO_SALARY).length;
  const lopRows = run.rows.filter((r) => r.lop.days > 0);
  const lopDays = lopRows.reduce((sum, r) => sum + r.lop.days, 0);
  const lopAmount = (run.totals ?? runTotals(run)).lossOfPay;
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

// ---------- run details, the alert, Prepare and Approve ----------

// What the alert says about the run: a live draft (and whether it can be
// prepared yet, in the store's words), a prepared run (who can approve it, and
// that its figures are the ones fixed), or an approved one.
function alertText(run, me, approveBlock) {
  const label = monthLabel(run.month);
  if (run.status === "approved") {
    return `${nameOf(run.approvedBy)} approved this run on ${dayOf(run.approvedAt)}. Its figures are final: the payslips for ${label} show them, and they can't be changed. Paying isn't built yet.`;
  }
  if (run.status === "prepared") {
    const preparer = nameOf(run.preparedBy);
    let lead;
    if (me && me === run.preparedBy) lead = "You prepared this run, so someone else has to approve it.";
    else if (!approveBlock) lead = `${preparer} prepared this run. You can approve it.`;
    else if (canApprove(run, me)) lead = `${preparer} prepared this run. ${approveBlock}`;
    else lead = `${preparer} prepared this run. An Admin who didn't prepare it has to approve it.`;
    return `${lead} Its figures were fixed when it was prepared, on ${dayOf(run.preparedAt)}; if attendance or leave changes them before it's approved, it has to be prepared again.`;
  }
  const problems = runProblems(Number(run.month.slice(0, 4)), Number(run.month.slice(5, 7)));
  const gate = problems.length ? `It can't be prepared yet: ${problems.join("; ")}.` : "It can be prepared now, which fixes these figures for approval.";
  return `This run isn't prepared yet, so these figures are worked out from the live attendance and leave records each time the page opens. ${gate}`;
}

function renderApproval(run, approvers) {
  const me = getCurrentUserId();
  const year = Number(run.month.slice(0, 4));
  const month = Number(run.month.slice(5, 7));
  const label = monthLabel(run.month);
  const stored = run.status !== "draft";
  $("run-prepared-by").textContent = stored ? nameOf(run.preparedBy) : "Not prepared yet";
  $("run-approver").textContent = run.status === "approved"
    ? `Approved by ${nameOf(run.approvedBy)} on ${dayOf(run.approvedAt)}`
    : approvers.join("; ") || "No one";
  const fixed = $("run-fixed-on");
  fixed.textContent = stored ? dayOf(run.preparedAt) : "Not fixed: worked out live";
  fixed.className = stored ? "" : "text-muted";

  const prepareBlock = prepareProblem(me, year, month);
  const prepare = $("prepare-run");
  prepare.textContent = run.status === "prepared" ? "Prepare again" : "Prepare run";
  prepare.disabled = Boolean(prepareBlock);
  prepare.title = prepareBlock || (run.status === "prepared" ? `Fix ${label}'s figures again, as they are now` : `Fix ${label}'s figures for approval`);

  const approveBlock = approveProblem(me, year, month);
  const approve = $("approve-run");
  approve.disabled = Boolean(approveBlock);
  approve.title = approveBlock || `Approve the ${monthName(month)} run`;

  $("run-alert").textContent = alertText(run, me, approveBlock);
}

// ---------- start ----------

// The guard already sends anyone without payroll:view to the 403 page; this
// stops the figures being drawn in the moment before that happens.
if (can("payroll:view")) {
  const { year, month } = viewedMonth();
  let run;
  const draw = () => {
    run = storedRun(year, month) ?? payrollRun(year, month);
    const approvers = run.status === "approved" ? [] : approverNames(run);
    $("run-status-filter").querySelector('option[value="draft"]').textContent = RUN_STATUS[run.status].label;
    renderHeader(run);
    renderMonths(run);
    renderStats(run);
    renderProgress(run, approvers);
    renderRows(run);
    renderChecks(run);
    renderApproval(run, approvers);
  };
  draw();

  // Each is the store's write, which checks everything again (in case a
  // button was re-enabled by hand); a refusal is shown in its words.
  $("prepare-run").addEventListener("click", () => {
    const result = prepareRun(getCurrentUserId(), year, month);
    if (!result.ok) {
      showToast(escapeHtml(result.error), "danger");
      return;
    }
    showToast(`${monthLabel(result.record.month)}'s run is prepared: its figures are fixed for approval.`, "success");
    draw();
  });
  $("approve-run").addEventListener("click", () => {
    const result = approveRun(getCurrentUserId(), year, month);
    if (!result.ok) {
      showToast(escapeHtml(result.error), "danger");
      return;
    }
    showToast(`${monthLabel(result.record.month)}'s run is approved.`, "success");
    draw();
  });
  $("run-search").addEventListener("input", (e) => {
    searchText = e.target.value;
    renderRows(run);
  });
  $("run-status-filter").addEventListener("change", (e) => {
    statusFilter = e.target.value;
    renderRows(run);
  });
}