// pages/finance-dashboard.js
// Runs on dashboard/finance.html. The payroll parts of the page, from
// data/payroll-store.js: the payroll, TDS and net pay stats, gross pay by
// department, and every employee in the run. It is the same run that
// payroll-run.html shows (RUN_MONTH), so the two pages agree. Nothing here
// works out pay; the store does.
//
// The page is open to anyone with dashboard:view, and these are everyone's
// salaries, so nothing is drawn without payroll:view (the HTML also hides
// those parts). Reimbursements and the pending approvals stay static samples.

import { RUN_MONTH, payrollRun, runTotals, payslipTotals } from "../data/payroll-store.js";
import { getUser, getAllDepartments } from "../data/store.js";
import { can } from "../core/rbac.js";
import { el, plural, departmentName, personCell } from "../ui/leave-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";
import { barRow } from "../ui/chart.js";
import { rupees } from "../ui/money.js";

const ROW_STATUS = {
  "draft":   { label: "Draft",   badge: "badge badge--warning badge--dot" },
  "on-hold": { label: "On hold", badge: "badge badge--danger badge--dot" },
};

const $ = (id) => document.getElementById(id);
const stat = (key) => document.querySelector(`[data-stat="${key}"]`);
const people = (n) => plural(n, "employee", "employees");

// ---------- stats ----------

function renderStats(run) {
  const totals = runTotals(run);
  setStatValue(stat("payroll"), rupees(totals.gross));
  setStatNote(stat("payroll"), `Gross for ${people(run.rows.length)}, draft`);
  setStatValue(stat("tds"), rupees(payslipTotals(run.rows).tds));
  setStatValue(stat("net"), rupees(totals.net));
  setStatNote(stat("net"), "Draft, not paid yet");
}

// ---------- gross pay by department ----------

// Every department in the store, in its order, with the gross of the people in
// it (0 for an empty one); bars are relative to the largest. Someone whose
// department isn't in the list still counts, under their own row.
function renderDepartments(run) {
  const gross = new Map(getAllDepartments().map((d) => [d.code, { name: d.name, amount: 0 }]));
  for (const row of run.rows) {
    const code = getUser(row.userId)?.department ?? "";
    if (!gross.has(code)) gross.set(code, { name: departmentName(code) || "No department", amount: 0 });
    gross.get(code).amount += row.gross;
  }
  const top = Math.max(1, ...[...gross.values()].map((g) => g.amount));
  $("fin-dept-bars").replaceChildren(...[...gross.values()].map((g) => barRow(g.name, rupees(g.amount), Math.round((g.amount / top) * 100))));
}

// ---------- the run's employees ----------

function buildRow(row) {
  const user = getUser(row.userId);
  const tr = el("tr");
  tr.dataset.userId = row.userId;
  const statusCell = el("td");
  const badge = el("span", ROW_STATUS[row.status]?.badge ?? "badge", ROW_STATUS[row.status]?.label ?? row.status);
  if (row.holdReason) badge.title = row.holdReason;
  statusCell.append(badge);
  tr.append(
    personCell(row.userId, user, departmentName(user?.department)),
    el("td", "table__num", rupees(row.gross)),
    el("td", "table__num", rupees(row.deductions)),
    el("td", "table__num", rupees(row.net)),
    statusCell,
  );
  return tr;
}

function renderRows(run) {
  $("fin-run-rows").replaceChildren(...run.rows.map(buildRow));
  $("fin-run-meta").textContent = `All ${people(run.rows.length)} in the run`;
}

// ---------- start ----------

if (can("payroll:view")) {
  const run = payrollRun(RUN_MONTH.year, RUN_MONTH.month);
  renderStats(run);
  renderDepartments(run);
  renderRows(run);
}