// The Finance dashboard (pages/dashboard/finance.html + assets/js/pages/finance-dashboard.js), ported: the stats (this month's
// payroll draft, reimbursements due, TDS, net pay; each only with its permission, hidden otherwise as before), the monthly cost
// card (the page's own note), expense claims waiting for the person (the approval card's Review), gross pay by department
// ("No data in this range." when no department has gross pay, round 5's rule), recent expense activity, and the run's
// employees (the search box filters the rows as ui/table-filter.js did; Export).
// F1: the Monthly payroll cost card was a note ("Not charted yet"), so the dashboard had no graph: it now charts the gross pay
// of the last 6 months, each month's run as the payroll run page reads it (approved: its saved figures; else worked out live,
// a draft), and the department card draws with the same design-system BarChart as the Admin's headcount (the shared chart
// theme). The header has Mark attendance, as the Employee dashboard has.
import { useEffect, useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import { runMonth, payrollRun, storedRun, runTotals, payslipTotals } from "../../../assets/js/data/payroll-store.js";
import { csvValue, csvColumns, csvStat, initExports } from "../../../assets/js/ui/csv-export.js";
import { filingDates } from "../../../assets/js/data/payroll.js";
import { getUser } from "../../../assets/js/data/store.js";
import { allExpenses, pendingFor, expenseTotals } from "../../../assets/js/data/expenses-store.js";
import { resolvePageLink } from "../../../assets/js/core/paths.js";
import { STAGE_NAME, categoryLabel } from "../../../assets/js/ui/expense-view.js";
import { cardLink } from "../ui/ApprovalCard.jsx";
import { el, plural, departmentName, personCell, nameOf, initials, avatarClass, formatDay, localDateOf, todayIso, monthShort, showReason } from "../../../assets/js/ui/leave-view.js";
import { payrollByDepartmentChart, payrollByMonthChart } from "../../../assets/js/data/chart-data.js";
import { rupees } from "../../../assets/js/ui/money.js";
import Frame from "../ui/Frame.jsx";
import Nodes from "../ui/Nodes.jsx";
import { StatStrip, StatCard } from "../components/Basics.jsx";
import { BarChart, monthSpan } from "../components/charts/Charts.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { pageUrl } from "../routes.js";

csvColumns("finance-dashboard-payroll", { Employee: { split: "Department" }, Gross: { number: true, header: "Gross (₹)" }, Deductions: { number: true, header: "Deductions (₹)" }, "Net pay": { number: true, header: "Net pay (₹)" } });   // Round Data export

const PAGE = "dashboard/finance.html";
const ROW_STATUS = { draft: { label: "Draft", badge: "badge badge--warning badge--dot" }, "on-hold": { label: "On hold", badge: "badge badge--danger badge--dot" } };
const ICONS = {
  payroll: "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M17 14h1", reimbursements: "M3 6h18v12H3zM3 10h18",
  tds: "M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5", net: "M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6",
  mark: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M8 12l3 3 5-6",
};
const COST_MONTHS = 6;
// The run of record for each of the COST_MONTHS months ending with year / month, oldest first (payroll run page's rule).
function monthlyRuns(year, month) {
  return Array.from({ length: COST_MONTHS }, (_, i) => {
    const k = year * 12 + (month - 1) - (COST_MONTHS - 1 - i);
    const y = Math.floor(k / 12), m = (k % 12) + 1;
    return storedRun(y, m) ?? payrollRun(y, m);
  });
}
const people = (n) => plural(n, "employee", "employees");
const short = (run) => monthShort(`${run.month}-01`);
const shortWithYear = (run) => `${short(run)} ${run.month.slice(0, 4)}`;

function buildRow(row) {
  const user = getUser(row.userId);
  const tr = el("tr");
  tr.dataset.userId = row.userId;
  const statusCell = el("td");
  const badge = el("span", ROW_STATUS[row.status]?.badge ?? "badge", ROW_STATUS[row.status]?.label ?? row.status);
  if (row.holdReason) badge.title = row.holdReason;
  statusCell.append(badge);
  showReason(badge, row.holdReason);
  tr.append(personCell(row.userId, user, departmentName(user?.department)), csvValue(el("td", "table__num", rupees(row.gross)), row.gross),
    csvValue(el("td", "table__num", rupees(row.deductions)), row.deductions), csvValue(el("td", "table__num", rupees(row.net)), row.net), statusCell);
  return tr;
}
function claimItems(claims) {
  if (!claims.length) return [el("p", "card__body text-sm text-muted", "No expense claims are waiting for you.")];
  return claims.map((claim) => {
    const item = el("div", "list__item");
    item.dataset.claimId = claim.id;
    const content = el("div", "list__content");
    content.append(el("span", "list__title", `Expense claim: ${nameOf(claim.userId)}`), el("span", "list__sub", `${rupees(claim.amount)}, ${categoryLabel(claim.category)}, ${STAGE_NAME[claim.stage]} stage`));
    const open = el("a", "btn btn--sm", "Review");
    open.href = resolvePageLink("requests/approvals-inbox.html");
    cardLink(open, "expenses", claim.id, { refresh: bump });
    item.append(el("div", avatarClass(claim.userId), initials(nameOf(claim.userId))), content, open);
    return item;
  });
}
const claimText = (claim) => `${rupees(claim.amount)} claim from ${nameOf(claim.userId)}`;
const EVENT = {
  applied: { dot: "warning", text: (c) => `Expense claim from ${nameOf(c.userId)}, ${rupees(c.amount)}` },
  approved: { dot: "success", text: (c, h) => `${claimText(c)} approved by ${nameOf(h.byUserId)}` },
  rejected: { dot: "danger", text: (c, h) => `${claimText(c)} rejected by ${nameOf(h.byUserId)}` },
  paid: { dot: "success", text: (c, h) => `${claimText(c)} paid by ${nameOf(h.byUserId)}` },
  cancelled: { dot: "muted", text: (c, h) => `${claimText(c)} cancelled by ${nameOf(h.byUserId)}` },
};
function activityItems(expenses) {
  const events = expenses.flatMap((claim) => claim.history.filter((h) => EVENT[h.decision]).map((h) => ({ claim, h }))).sort((a, b) => b.h.at.localeCompare(a.h.at)).slice(0, 5);
  if (!events.length) return [el("p", "card__body text-sm text-muted", "No expense activity yet.")];
  return events.map(({ claim, h }) => {
    const item = el("div", "activity__item");
    const text = el("div", "activity__text", EVENT[h.decision].text(claim, h));
    text.append(el("span", "activity__time", formatDay(localDateOf(h.at))));
    item.append(el("span", `activity__dot activity__dot--${EVENT[h.decision].dot}`), text);
    return item;
  });
}
const Icon = ({ d }) => <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;

export default function FinanceDashboard() {
  const { userId, role } = useSession();
  const canExport = useCan("reports:export"), canMark = useCan("attendance:mark"), canPay = useCan("payroll:view"), canExp = useCan("expenses:view");
  const [query, setQuery] = useState("");
  const d = useData(() => {
    const today = todayIso();
    const out = { claims: (getUser(userId) ? pendingFor(userId, role?.key) : []).sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id, "en", { numeric: true })) };
    if (canPay) {
      const { year, month } = runMonth(today);
      const run = payrollRun(year, month);
      Object.assign(out, { run, year, month, totals: runTotals(run), tds: payslipTotals(run.rows).tds, depts: payrollByDepartmentChart(run), monthly: payrollByMonthChart(monthlyRuns(year, month)) });
    }
    if (canExp) Object.assign(out, { approved: expenseTotals(allExpenses()).byStatus.approved, expenses: allExpenses() });
    return out;
  }, [userId, role?.key, canPay, canExp]);

  const costSpan = d.monthly ? monthSpan(d.monthly.labels[0], d.monthly.labels.at(-1)) : "";
  const depts = d.depts ? { ...d.depts, labels: d.depts.labels.map((name) => name || "No department") } : null;

  useEffect(() => { initExports(document.getElementById("main")); }, []);
  useEffect(() => {
    const st = (k) => document.querySelector(`#main [data-stat="${k}"]`);
    if (d.run) { csvStat(st("payroll"), d.totals.gross, "₹"); csvStat(st("tds"), d.tds, "₹"); csvStat(st("net"), d.totals.net, "₹"); }
    if (d.approved) csvStat(st("reimbursements"), d.approved.amount, "₹");
  });
  // the run table's search (ui/table-filter.js): each row's text holds the words
  useLayoutEffect(() => {
    const q = query.trim().toLowerCase();
    document.querySelectorAll("#fin-run-rows tr").forEach((row) => { row.hidden = q !== "" && !row.textContent.toLowerCase().includes(q); });
  });

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-header__subtitle">Payroll and expenses</p>
        </div>
        <div className="page-header__actions">
          <button className="btn" type="button" data-permission="reports:export" hidden={!canExport || undefined} data-export data-export-stats="finance-dashboard-stats">Export</button>
          <Link className="btn" to={pageUrl("attendance/mark-attendance.html")} data-permission="attendance:mark" hidden={!canMark || undefined} id="dash-mark">
            <Icon d={ICONS.mark} />
            Mark attendance
          </Link>
          <Link className="btn btn--primary" to={pageUrl("payroll/payroll-run.html")} data-permission="payroll:view" hidden={!canPay || undefined}>
            <Icon d="M5 3l14 9-14 9z" />
            Open payroll run
          </Link>
        </div>
      </div>
      <div className="stack">
        <StatStrip label="Key numbers">
          <StatCard id="payroll" permission="payroll:view" hidden={!canPay} icon={ICONS.payroll} tone={1} label={d.run ? `Payroll, ${short(d.run)}` : "Payroll"}
            value={d.run ? rupees(d.totals.gross) : "—"} note={d.run ? `Gross for ${people(d.run.rows.length)}, draft` : ""} />
          <StatCard id="reimbursements" permission="expenses:view" hidden={!canExp} icon={ICONS.reimbursements} tone={2} label="Reimbursements due"
            value={d.approved ? rupees(d.approved.amount) : "—"} note={d.approved ? (d.approved.count ? `${plural(d.approved.count, "claim", "claims")} waiting to be paid` : "Nothing waiting to be paid") : ""}
            noteTone={d.approved?.count ? "up" : ""} />
          <StatCard id="tds" permission="payroll:view" hidden={!canPay} icon={ICONS.tds} tone={3} label="Tax deducted (TDS)" value={d.run ? rupees(d.tds) : "—"}
            note={d.run ? `Sample tax rates; deposit by ${formatDay(filingDates(d.year, d.month).tds)}` : ""} />
          <StatCard id="net" permission="payroll:view" hidden={!canPay} icon={ICONS.net} tone={4} label={d.run ? `Net pay, ${short(d.run)}` : "Net pay"}
            value={d.run ? rupees(d.totals.net) : "—"} note={d.run ? "Draft, not paid yet" : ""} />
        </StatStrip>

        <div className="grid grid-main-aside">
          <section className="card" id="fin-monthly" data-permission="payroll:view" hidden={!canPay || undefined}>
            <div className="card__header">
              <h3 className="card__title">Monthly payroll cost</h3>
              <span className="card__meta" id="fin-monthly-meta">{d.monthly ? `Gross pay, ${costSpan}` : "Gross pay"}</span>
            </div>
            <div className="card__body">
              {d.monthly && <BarChart id="fin-monthly-chart" chart={d.monthly} label={`Payroll cost per month, ${costSpan}`} labelHeader="Month" latest />}
              <p className="text-xs text-muted mt-2" id="fin-monthly-note">Months with an approved run use its saved figures; the others are worked out from attendance and leave, as drafts.</p>
            </div>
          </section>
          <section className="card" id="fin-approvals">
            <div className="card__header">
              <h3 className="card__title">Pending expense approvals</h3>
              <span className="card__meta">{`${d.claims.length} open`}</span>
            </div>
            <Nodes className="list" build={() => claimItems(d.claims)} deps={[d]} />
          </section>
        </div>

        <div className="grid grid-2">
          <section className="card" data-permission="payroll:view" hidden={!canPay || undefined}>
            <div className="card__header">
              <h3 className="card__title">Payroll cost by department</h3>
              <span className="card__meta" id="fin-dept-meta">{d.depts ? `Gross pay, ${shortWithYear(d.depts.period)}` : "Gross pay"}</span>
            </div>
            <div className="card__body">{depts && <BarChart id="fin-dept-bars" chart={depts} horizontal label={`Payroll cost by department, ${shortWithYear(d.depts.period)}`} labelHeader="Department" />}</div>
          </section>
          <section className="card" data-permission="expenses:view" hidden={!canExp || undefined}>
            <div className="card__header">
              <h3 className="card__title">Recent expense activity</h3>
              <Link className="link text-sm" to={pageUrl("finance/expenses.html")}>View expenses</Link>
            </div>
            <Nodes className="activity" id="fin-activity" build={() => (d.expenses ? activityItems(d.expenses) : [])} deps={[d]} />
          </section>
        </div>

        <section className="card" data-permission="payroll:view" hidden={!canPay || undefined}>
          <div className="table__toolbar">
            <h3 className="card__title" id="fin-run-title">{d.run ? `Payroll run, ${shortWithYear(d.run)}` : "Payroll run"}</h3>
            <div className="table__filters">
              <div className="input-group">
                <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input className="input input--sm input--search" type="search" placeholder="Search employees" aria-label="Search employees" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table" data-export-name="finance-dashboard-payroll">
              <thead><tr><th>Employee</th><th className="table__num">Gross</th><th className="table__num">Deductions</th><th className="table__num">Net pay</th><th>Status</th></tr></thead>
              <Nodes as="tbody" id="fin-run-rows" build={() => (d.run ? d.run.rows.map(buildRow) : [])} deps={[d]} />
            </table>
          </div>
          <div className="card__footer">
            <span className="card__meta" id="fin-run-meta">{d.run ? `All ${people(d.run.rows.length)} in the run` : ""}</span>
            <Link className="btn btn--sm" to={pageUrl("payroll/payroll-run.html")}>Open payroll run</Link>
          </div>
        </section>
      </div>
    </Frame>
  );
}
