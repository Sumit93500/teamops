// pages/tax-deductions.js
// Runs on finance/tax-deductions.html. This month's statutory deductions, from
// the same run payroll-run.html shows (runMonth() in data/payroll-store.js):
// TDS, PF (the employee's share and the employer's), professional tax, and how
// many people are on each tax regime. Nothing here works out pay; the store
// does. The due dates and the filing calendar come from data/payroll.js's
// sample filing rules for that month; filing itself (challans) isn't built.
// The tax slab table stays static.

import { runMonth, payrollRun, payslipTotals } from "../data/payroll-store.js";
import { PAY_RULES, TAX_SAMPLE, annualTax, filingDates, tdsReturn } from "../data/payroll.js";
import { dayNumber } from "../data/holidays.js";
import { can } from "../core/rbac.js";
import { el, plural, todayIso, monthName, monthShort, formatDay } from "../ui/leave-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";
import { barRow } from "../ui/chart.js";
import { rupees } from "../ui/money.js";

const $ = (id) => document.getElementById(id);
const stat = (key) => document.querySelector(`[data-stat="${key}"]`);
const amountCell = (key) => document.querySelector(`[data-amount="${key}"]`);
const dueCell = (key) => document.querySelector(`[data-due="${key}"]`);
const people = (n) => plural(n, "person", "people");

// A deadline this close (in days) is "Due soon".
const SOON = 7;

function render(run, year, month) {
  const totals = payslipTotals(run.rows);
  const employerPf = run.rows.reduce((sum, r) => sum + r.employerPf, 0);
  const ptPayers = run.rows.filter((r) => r.deductionLines.pt > 0).length;
  const due = filingDates(year, month);
  const label = `${monthName(month)} ${year}`;

  $("tax-subtitle").textContent = `Statutory deductions, filing dates and tax slabs for ${label}`;
  $("tax-month").textContent = label;

  setStatValue(stat("tds"), rupees(totals.tds));
  setStatNote(stat("tds"), `Deposit by ${formatDay(due.tds)}`);
  setStatValue(stat("pf"), rupees(totals.pf + employerPf));
  setStatValue(stat("pt"), rupees(totals.pt));
  setStatNote(stat("pt"), `${people(ptPayers)} at ${rupees(PAY_RULES.professionalTax)}`);

  amountCell("pf").textContent = rupees(totals.pf);
  amountCell("employer-pf").textContent = rupees(employerPf);
  amountCell("pt").textContent = rupees(totals.pt);
  amountCell("tds").textContent = rupees(totals.tds);
  for (const [key, date] of [["pf", due.pf], ["employer-pf", due.pf], ["pt", due.pt], ["tds", due.tds]]) {
    dueCell(key).textContent = formatDay(date);
  }

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

// The line after the slab card: what comes off before the slabs, from the same
// constants monthlyTds() uses, and what the card's highlighted example really
// pays, so the words can't drift from the arithmetic (round 10R).
const SLAB_EXAMPLE = 900000;   // the card's highlighted annual income (its meta line)

function renderSlabNote() {
  const card = document.querySelector('table[data-export-name="tax-slabs"]')?.closest("section");
  if (!card) return;
  const tax = Math.round(annualTax(Math.max(0, SLAB_EXAMPLE - TAX_SAMPLE.standardDeduction)));
  const note = el("p", "form-hint", `These rates apply only after a ${rupees(TAX_SAMPLE.standardDeduction)} standard deduction, and if what's left is `
    + `${rupees(TAX_SAMPLE.rebateLimit)} or less there's no tax at all, so the highlighted ${rupees(SLAB_EXAMPLE)} pays ${tax ? `${rupees(tax)} a year` : "nothing"}.`);
  note.id = "slab-note";
  card.after(note);
}

// ---------- filing calendar ----------

// The TDS return still to file: the last quarter's while its due date hasn't
// passed, otherwise the quarter this month is in.
function returnToFile(year, month, today) {
  const [py, pm] = month <= 3 ? [year - 1, month + 9] : [year, month - 3];
  const last = tdsReturn(py, pm);
  return last.due >= today ? last : tdsReturn(year, month);
}

function calendarItem({ date, title, sub }, today) {
  const item = el("div", "list__item");
  item.dataset.due = date;
  const tile = el("div", "date-tile");
  tile.append(el("span", "date-tile__month", monthShort(date)), el("span", "date-tile__day", String(Number(date.slice(8)))));
  const content = el("div", "list__content");
  content.append(el("span", "list__title", title), el("span", "list__sub", sub));
  const soon = dayNumber(date) - dayNumber(today) <= SOON;
  item.append(tile, content, el("span", soon ? "badge badge--warning" : "badge", soon ? "Due soon" : "Upcoming"));
  return item;
}

// This month's deposits and the TDS return still to file, soonest first.
function renderCalendar(year, month, today) {
  const due = filingDates(year, month);
  const name = monthName(month);
  const ret = returnToFile(year, month, today);
  const items = [
    { date: due.pt, title: "Professional tax", sub: `For ${name} salaries` },
    { date: due.tds, title: "Deposit TDS", sub: `For ${name} salaries` },
    { date: due.pf, title: "Provident fund", sub: `Employee and employer share, ${name}` },
    { date: ret.due, title: "TDS return", sub: `Quarter ${monthName(ret.from)} to ${monthName(ret.to)}` },
  ].sort((a, b) => a.date.localeCompare(b.date));
  $("tax-calendar").replaceChildren(...items.map((i) => calendarItem(i, today)));
}

// The guard sends anyone without tax:view to the 403 page; this stops the
// figures being drawn in the moment before that happens.
if (can("tax:view")) {
  const today = todayIso();
  const { year, month } = runMonth(today);
  render(payrollRun(year, month), year, month);
  renderCalendar(year, month, today);
  renderSlabNote();
}