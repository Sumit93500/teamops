// The Finance dashboard (pages/dashboard/finance.html + assets/js/pages/finance-dashboard.js), ported: the stats (this month's
// payroll draft, reimbursements due, TDS, net pay; each only with its permission, hidden otherwise as before), the monthly cost
// card (the page's own note), expense claims waiting for the person (the approval card's Review), gross pay by department
// ("No data in this range." when no department has gross pay, round 5's rule), recent expense activity, and the run's
// employees (the search box filters the rows as ui/table-filter.js did; Export).
import { useEffect, useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import pageHtml from "../../../pages/dashboard/finance.html?raw";
import { runMonth, payrollRun, runTotals, payslipTotals } from "../../../assets/js/data/payroll-store.js";
import { csvValue, csvColumns, csvStat, initExports } from "../../../assets/js/ui/csv-export.js";
import { filingDates } from "../../../assets/js/data/payroll.js";
import { getUser } from "../../../assets/js/data/store.js";
import { allExpenses, pendingFor, expenseTotals } from "../../../assets/js/data/expenses-store.js";
import { resolvePageLink } from "../../../assets/js/core/paths.js";
import { STAGE_NAME, categoryLabel } from "../../../assets/js/ui/expense-view.js";
import { cardLink } from "../../../assets/js/ui/approval-card.js";
import { el, plural, departmentName, personCell, nameOf, initials, avatarClass, formatDay, localDateOf, todayIso, monthShort, showReason } from "../../../assets/js/ui/leave-view.js";
import { barRow } from "../../../assets/js/ui/chart.js";
import { payrollByDepartmentChart, valuesOf } from "../../../assets/js/data/chart-data.js";
import { rupees } from "../../../assets/js/ui/money.js";
import Frame from "../ui/Frame.jsx";
import Nodes from "../ui/Nodes.jsx";
import { StatStrip, StatCard } from "../components/Basics.jsx";
import { NoData } from "../components/Charts.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { pageUrl } from "../routes.js";

csvColumns("finance-dashboard-payroll", { Employee: { split: "Department" }, Gross: { number: true, header: "Gross (₹)" }, Deductions: { number: true, header: "Deductions (₹)" }, "Net pay": { number: true, header: "Net pay (₹)" } });   // Round Data export

const PAGE = "dashboard/finance.html";
const ROW_STATUS = { draft: { label: "Draft", badge: "badge badge--warning badge--dot" }, "on-hold": { label: "On hold", badge: "badge badge--danger badge--dot" } };
const ICONS = {
  payroll: "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M17 14h1", reimbursements: "M3 6h18v12H3zM3 10h18",
  tds: "M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5", net: "M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6",
};
// The monthly cost card's words, from the old page.
const COST_NOTE = (() => {
  const doc = new DOMParser().parseFromString(pageHtml, "text/html");
  const card = [...doc.querySelectorAll("section.card")].find((s) => s.querySelector(".card__title")?.textContent === "Monthly payroll cost");
  return card?.querySelector(".card__body")?.innerHTML ?? "";
})();
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
  const canExport = useCan("reports:export"), canPay = useCan("payroll:view"), canExp = useCan("expenses:view");
  const [query, setQuery] = useState("");
  const d = useData(() => {
    const today = todayIso();
    const out = { claims: (getUser(userId) ? pendingFor(userId, role?.key) : []).sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id, "en", { numeric: true })) };
    if (canPay) {
      const { year, month } = runMonth(today);
      const run = payrollRun(year, month);
      Object.assign(out, { run, year, month, totals: runTotals(run), tds: payslipTotals(run.rows).tds, depts: payrollByDepartmentChart(run) });
    }
    if (canExp) Object.assign(out, { approved: expenseTotals(allExpenses()).byStatus.approved, expenses: allExpenses() });
    return out;
  }, [userId, role?.key, canPay, canExp]);

  const gross = d.depts ? valuesOf(d.depts, "Gross") : [];
  const top = Math.max(1, ...gross);

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
          <section className="card">
            <div className="card__header">
              <h3 className="card__title">Monthly payroll cost</h3>
              <span className="card__meta">Not charted yet</span>
            </div>
            <div className="card__body" dangerouslySetInnerHTML={{ __html: COST_NOTE }} />
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
            <Nodes className="card__body" id="fin-dept-bars" hidden={d.depts?.empty || undefined}
              build={() => (d.depts ? d.depts.labels.map((name, i) => barRow(name || "No department", rupees(gross[i]), Math.round((gross[i] / top) * 100))) : [])} deps={[d]} />
            {d.depts?.empty && <NoData />}
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
