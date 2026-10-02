// pages/tax-deductions.js
// Runs on finance/tax-deductions.html. This month's statutory deductions, from
// the same run payroll-run.html shows (RUN_MONTH in data/payroll-store.js):
// TDS, PF (the employee's share and the employer's), professional tax, and how
// many people are on each tax regime. Nothing here works out pay; the store
// does. The tax slab table, the filing calendar and the due dates stay static.

import { RUN_MONTH, payrollRun, payslipTotals } from "../data/payroll-store.js";
import { PAY_RULES } from "../data/payroll.js";
import { can } from "../core/rbac.js";
import { plural } from "../ui/leave-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";
import { barRow } from "../ui/chart.js";
import { rupees } from "../ui/money.js";

const $ = (id) => document.getElementById(id);
const stat = (key) => document.querySelector(`[data-stat="${key}"]`);
const amountCell = (key) => document.querySelector(`[data-amount="${key}"]`);
const people = (n) => plural(n, "person", "people");

function render(run) {
  const totals = payslipTotals(run.rows);
  const employerPf = run.rows.reduce((sum, r) => sum + r.employerPf, 0);
  const ptPayers = run.rows.filter((r) => r.deductionLines.pt > 0).length;

  setStatValue(stat("tds"), rupees(totals.tds));
  setStatValue(stat("pf"), rupees(totals.pf + employerPf));
  setStatValue(stat("pt"), rupees(totals.pt));
  setStatNote(stat("pt"), `${people(ptPayers)} at ${rupees(PAY_RULES.professionalTax)}`);

  amountCell("pf").textContent = rupees(totals.pf);
  amountCell("employer-pf").textContent = rupees(employerPf);
  amountCell("pt").textContent = rupees(totals.pt);
  amountCell("tds").textContent = rupees(totals.tds);

  // Regimes as the salary records hold them; a row with no salary has none.
  // Every seeded salary is "new": the old regime has no tax rules here.
  const withSalary = run.rows.filter((r) => r.regime);
  const onNew = withSalary.filter((r) => r.regime === "new").length;
  const onOld = withSalary.filter((r) => r.regime === "old").length;
  setStatValue(stat("regime"), String(onNew));
  setStatNote(stat("regime"), `${onOld} on the old regime`);
  $("regime-meta").textContent = plural(withSalary.length, "employee", "employees");
  const top = Math.max(1, withSalary.length);
  $("regime-bars").replaceChildren(
    barRow("New regime", String(onNew), Math.round((onNew / top) * 100)),
    barRow("Old regime", String(onOld), Math.round((onOld / top) * 100)),
  );
}

// The guard sends anyone without tax:view to the 403 page; this stops the
// figures being drawn in the moment before that happens.
if (can("tax:view")) render(payrollRun(RUN_MONTH.year, RUN_MONTH.month));