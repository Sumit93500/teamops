// Tax & deductions (pages/finance/tax-deductions.html + assets/js/pages/tax-deductions.js), ported (round 12), for tax:view:
// this month's statutory deductions from the run payroll-run.html shows (runMonth()): TDS, PF (both shares), professional tax,
// the regimes; the filing calendar from data/payroll.js's sample rules; the static slab table and the note under it worked out
// from the same constants monthlyTds() uses. Export writes the deductions and the slabs with the old exporter. Filing and
// challans aren't built (placeholders). Nothing here works out pay; the store does. P4a: for the signed-in person, how this
// year's TDS is worked out under the new rules and a Compare regimes panel (ui/paycards.jsx), above the company's figures.
import { useEffect } from "react";
import { runMonth, payrollRun, payslipTotals } from "../../../assets/js/data/payroll-store.js";
import { csvColumns, initExports } from "../../../assets/js/ui/csv-export.js";
import { PAY_RULES, TAX_SAMPLE, annualTax, filingDates, tdsReturn } from "../../../assets/js/data/payroll.js";
import { dayNumber } from "../../../assets/js/data/holidays.js";
import { plural, todayIso, monthName, monthShort, formatDay } from "../../../assets/js/ui/leave-view.js";
import { taxRegimeChart, valuesOf } from "../../../assets/js/data/chart-data.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { StatStrip, StatCard, Badge, NotBuilt } from "../components/Basics.jsx";
import { BarRows } from "../components/Charts.jsx";
import { rupees } from "../ui/payroll.jsx";
import { useData, useCan, useSession } from "../data/hooks.js";
import { TaxExplain } from "../ui/paycards.jsx";
import { MyDeclaration, DeclarationsReview } from "../ui/declarations.jsx";

csvColumns("statutory-deductions", { "This month": { number: true, header: "This month (₹)" } });   // Round Data export

const PAGE = "finance/tax-deductions.html";
const SOON = 7;
const SLAB_EXAMPLE = 900000;
const people = (n) => plural(n, "person", "people");
const ICONS = {
  tds: [1, "M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"], pf: [2, "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M17 14h1"],
  pt: [3, "M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6"], regime: [4, "M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"],
};
const DEDUCTIONS = [["pf", "Provident fund, employee", "12% of basic", "Employee"], ["employer-pf", "Provident fund, employer", "12% of basic", "Company"],
  ["pt", "Professional tax", "₹200 a month", "Employee"], ["tds", "Income tax (TDS)", "As per slab", "Employee"]];
const SLABS = [["Up to ₹4,00,000", "Nil"], ["₹4,00,001 to ₹8,00,000", "5%"], ["₹8,00,001 to ₹12,00,000", "10%", true], ["₹12,00,001 to ₹16,00,000", "15%"],
  ["₹16,00,001 to ₹20,00,000", "20%"], ["₹20,00,001 to ₹24,00,000", "25%"], ["Above ₹24,00,000", "30%"]];

function returnToFile(year, month, today) {
  const [py, pm] = month <= 3 ? [year - 1, month + 9] : [year, month - 3];
  const last = tdsReturn(py, pm);
  return last.due >= today ? last : tdsReturn(year, month);
}

export default function TaxDeductions() {
  const { userId: me } = useSession();
  const canView = useCan("tax:view"), canManage = useCan("tax:manage"), canExport = useCan("reports:export");
  const today = todayIso();
  const d = useData(() => { const { year, month } = runMonth(today); return { year, month, run: payrollRun(year, month) }; }, []);
  useEffect(() => { initExports(document.getElementById("main")); }, []);
  if (!canView) return <Frame page={PAGE}><div /></Frame>;

  const { year, month, run } = d;
  const totals = payslipTotals(run.rows);
  const employerPf = run.rows.reduce((sum, r) => sum + r.employerPf, 0);
  const ptPayers = run.rows.filter((r) => r.deductionLines.pt > 0).length;
  const due = filingDates(year, month);
  const label = `${monthName(month)} ${year}`;
  const chart = taxRegimeChart(run);
  const [onNew, onOld] = valuesOf(chart, "Employees");
  const top = Math.max(1, chart.total);
  const amounts = { pf: totals.pf, "employer-pf": employerPf, pt: totals.pt, tds: totals.tds };
  const dues = { pf: due.pf, "employer-pf": due.pf, pt: due.pt, tds: due.tds };
  const stats = [["tds", "Income tax (TDS)", rupees(totals.tds), `Deposit by ${formatDay(due.tds)}`], ["pf", "Provident fund", rupees(totals.pf + employerPf), "Employee plus employer"],
    ["pt", "Professional tax", rupees(totals.pt), `${people(ptPayers)} at ${rupees(PAY_RULES.professionalTax)}`], ["regime", "On the new regime", String(onNew), `${onOld} on the old regime`]];
  const ret = returnToFile(year, month, today);
  const calendar = [
    { date: due.pt, title: "Professional tax", sub: `For ${monthName(month)} salaries` },
    { date: due.tds, title: "Deposit TDS", sub: `For ${monthName(month)} salaries` },
    { date: due.pf, title: "Provident fund", sub: `Employee and employer share, ${monthName(month)}` },
    { date: ret.due, title: "TDS return", sub: `Quarter ${monthName(ret.from)} to ${monthName(ret.to)}` },
  ].sort((a, b) => a.date.localeCompare(b.date));
  const tax = Math.round(annualTax(Math.max(0, SLAB_EXAMPLE - TAX_SAMPLE.standardDeduction)));
  const challan = <NotBuilt what="Challan" className="btn btn--sm" data-permission="tax:manage" hidden={!canManage || undefined}>Challan</NotBuilt>;
  const deductionColumns = [
    { key: "name", label: "Deduction", render: (r) => <span className="table__user-name">{r[1]}</span> },
    { key: "rate", label: "Rate", render: (r) => r[2] },
    { key: "by", label: "Paid by", render: (r) => r[3] },
    { key: "amount", label: "This month", num: true, render: (r) => rupees(amounts[r[0]]), cellProps: (r) => ({ "data-amount": r[0], "data-csv": String(amounts[r[0]]) }) },
    { key: "due", label: "Due date", render: (r) => formatDay(dues[r[0]]), cellProps: (r) => ({ "data-due": r[0], "data-csv": dues[r[0]] }) },
    { key: "status", label: "Status", render: () => <Badge dot title="Filing and challans aren't built yet">Not built</Badge> },
    { key: "actions", label: "Actions", actions: true, render: () => challan },
  ];
  const slabColumns = [{ key: "income", label: "Annual income", render: (r) => r[0] }, { key: "rate", label: "Tax rate", num: true, render: (r) => r[1] }];

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Tax &amp; deductions</h1>
          <p className="page-header__subtitle" id="tax-subtitle">{`Statutory deductions, filing dates and tax slabs for ${label}`}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn" type="button" data-permission="reports:export" hidden={!canExport || undefined} data-export>Export</button>
          <NotBuilt what="Generate challans" className="btn btn--primary" data-permission="tax:manage" hidden={!canManage || undefined}>Generate challans</NotBuilt>
        </div>
      </div>
      <div className="stack">
        {me && <TaxExplain userId={me} />}
        {me && <MyDeclaration />}
        <DeclarationsReview />
        <StatStrip label="Key numbers">
          {stats.map(([key, l, value, note]) => <StatCard key={key} id={key} icon={ICONS[key][1]} tone={ICONS[key][0]} label={l} value={value} note={note} />)}
        </StatStrip>
        <div className="grid grid-main-aside">
          <div className="stack">
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Statutory deductions</h3>
                <span className="card__meta" id="tax-month">{label}</span>
              </div>
              <Table bare pager={false} oldExport exportName="statutory-deductions" tableClass="table table--fit" columns={deductionColumns} rows={DEDUCTIONS} rowKey={(r) => r[0]} />
            </section>
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Tax slabs, new regime</h3>
                <span className="card__meta">Highlighted: annual income of ₹9,00,000</span>
              </div>
              <Table bare pager={false} oldExport exportName="tax-slabs" columns={slabColumns} rows={SLABS} rowKey={(r) => r[0]} rowProps={(r) => ({ className: r[2] ? "slab-row is-current" : "slab-row" })} />
            </section>
            <p className="form-hint" id="slab-note">{`These rates apply only after a ${rupees(TAX_SAMPLE.standardDeduction)} standard deduction. If what's left is ${rupees(TAX_SAMPLE.rebateLimit)} or less there's no tax at all, and above it the tax is never more than the amount over ${rupees(TAX_SAMPLE.rebateLimit)}, so the highlighted ${rupees(SLAB_EXAMPLE)} pays ${tax ? `${rupees(tax)} a year` : "nothing"}.`}</p>
            <div className="alert alert--warning">These slabs and rates are sample values for the design. When the real app is built, use the current government rates. Professional tax also depends on the state, so it is set per work location.</div>
          </div>
          <aside className="stack">
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Filing calendar</h3>
                <span className="card__meta">Sample rules</span>
              </div>
              <div className="list" id="tax-calendar">
                {calendar.map((i) => {
                  const soon = dayNumber(i.date) - dayNumber(today) <= SOON;
                  return (
                    <div className="list__item" data-due={i.date} key={i.title}>
                      <div className="date-tile"><span className="date-tile__month">{monthShort(i.date)}</span><span className="date-tile__day">{String(Number(i.date.slice(8)))}</span></div>
                      <div className="list__content"><span className="list__title">{i.title}</span><span className="list__sub">{i.sub}</span></div>
                      {soon ? <Badge tone="warning">Due soon</Badge> : <Badge>Upcoming</Badge>}
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Tax regime</h3>
                <span className="card__meta" id="regime-meta">{plural(chart.total, "employee", "employees")}</span>
              </div>
              <div className="card__body">
                <BarRows id="regime-bars" className={null} rows={[{ label: "New regime", value: String(onNew), percent: Math.round((onNew / top) * 100) }, { label: "Old regime", value: String(onOld), percent: Math.round((onOld / top) * 100) }]} empty={chart.empty} />
                <p className="form-hint mt-2">From each person's salary record. Only the new regime has tax rules in this demo, and choosing a regime isn't built yet.</p>
              </div>
            </section>
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Tax declarations</h3>
                <span className="card__meta">Not built yet</span>
              </div>
              <div className="card__body">
                <p className="form-hint">Tax declarations aren't collected yet, so everyone's TDS is worked out without any exemptions: the standard deduction only, on the sample slabs.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </Frame>
  );
}
