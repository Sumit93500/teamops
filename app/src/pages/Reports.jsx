// system/reports.html, a faithful sample (round 23; ruled 2026-11-11: the sample pages are ported as they are): written as JSX from
// the old page's HTML (tools/react/html2jsx.py), with what app.js gave it: controls the person may not use hidden (perm),
// "isn't available in this demo" on the placeholders (NotBuilt), the tables as Table (the phone cards come with it), a
// search box hiding its table's rows (ui/sample.js), links through the router.
import Frame from "../ui/Frame.jsx";
import { ColumnChart } from "../components/Charts.jsx";
import Table from "../components/Table.jsx";
import { NotBuilt } from "../components/Basics.jsx";
import { usePerm } from "../ui/perm.js";

const PAGE = "system/reports.html";
// The sample headcount chart, as the old HTML drew it: [label, height, value]
const HEADCOUNT = [["O", 37, "Oct 2025: 212"], ["N", 43, "Nov 2025: 216"], ["D", 48, "Dec 2025: 219"], ["J", 55, "Jan 2026: 223"], ["F", 60, "Feb 2026: 226"], ["M", 65, "Mar 2026: 229"],
  ["A", 70, "Apr 2026: 232"], ["M", 73, "May 2026: 234"], ["J", 77, "Jun 2026: 236"], ["J", 83, "Jul 2026: 240"], ["A", 90, "Aug 2026: 244"], ["S", 97, "Sep 2026: 248"]]
  .map(([label, height, name]) => ({ key: name, label, height, name }));

export default function Reports() {
  const perm = usePerm();
  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="page-header__subtitle">Run, schedule and export reports. You only see what your role allows.</p>
        </div>
        <div className="page-header__actions">
          <select className="select select--sm" aria-label="Choose period">
            <option>This month</option>
            <option>Last month</option>
            <option>This quarter</option>
            <option>This year</option>
          </select>
          {" "}
          <NotBuilt what="Create report" className="btn btn--primary" {...perm("reports:create")}><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>{" "}Create report</NotBuilt>
        </div>
      </div>
      <div className="stack">
        <div className="alert alert--info">Sample, not built yet: reports aren't part of OfficeOS yet. This page shows how they could look; nothing here runs, downloads or is scheduled, and the figures and exports listed are examples.</div>
        <section className="stat-strip" aria-label="Key numbers">
          <div className="stat">
            <div className="stat__icon stat__icon--1"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg></div>
            <div>
              <span className="stat__label">Reports run</span>
              {" "}
              <strong className="stat__value">63</strong>
              {" "}
              <span className="stat__delta stat__delta--up">+9 vs August</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat__icon stat__icon--2"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" /></svg></div>
            <div>
              <span className="stat__label">Scheduled</span>
              {" "}
              <strong className="stat__value">7</strong>
              {" "}
              <span className="stat__delta">Next run Monday, 21 Sep</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat__icon stat__icon--3"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6" /></svg></div>
            <div>
              <span className="stat__label">Exports</span>
              {" "}
              <strong className="stat__value">28</strong>
              {" "}
              <span className="stat__delta">18 CSV, 10 PDF</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat__icon stat__icon--4"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2" /></svg></div>
            <div>
              <span className="stat__label">Last generated</span>
              {" "}
              <strong className="stat__value">20 min</strong>
              {" "}
              <span className="stat__delta">Payroll summary</span>
            </div>
          </div>
        </section>
        <div className="grid grid-main-aside">
          <section className="card">
            <div className="card__header">
              <h3 className="card__title">Headcount, last 12 months</h3>
              {" "}
              <span className="card__meta">Oct 2025 – Sep 2026</span>
            </div>
            <div className="card__body">
              {/* the readout under the chart at every width (the chart ruling of 2026-11-10; phone.js drew it at 560px and under) */}
              <ColumnChart className="chart--12" label="Headcount growing from 212 to 248 over 12 months" cols={HEADCOUNT} />
              <p className="text-xs text-muted mt-2">The scale starts at 190 people so the changes are visible.</p>
            </div>
          </section>
          <aside className="stack">
            <section className="card">
              <div className="card__header"><h3 className="card__title">Scheduled reports</h3>{" "}<span className="card__meta">7 active</span></div>
              <div className="list">
                <div className="list__item">
                  <div className="list__content"><span className="list__title">Attendance summary</span><span className="list__sub">Every Monday, to HR</span></div>
                  {" "}
                  <span className="badge badge--success badge--dot">Active</span>
                </div>
                <div className="list__item">
                  <div className="list__content"><span className="list__title">Payroll register</span><span className="list__sub">28th of each month, to Finance</span></div>
                  {" "}
                  <span className="badge badge--success badge--dot">Active</span>
                </div>
                <div className="list__item">
                  <div className="list__content"><span className="list__title">Low stock alert</span><span className="list__sub">Every day at 9 AM, to the Store</span></div>
                  {" "}
                  <span className="badge badge--success badge--dot">Active</span>
                </div>
              </div>
            </section>
            <div className="alert alert--info">Salary columns are hidden in a report unless the person running it has salary:view. The same report shows different columns to different roles.</div>
          </aside>
        </div>
        <section aria-label="Report library">
          <div className="page-header" style={{ marginBottom: "var(--space-3)" }}>
            <div><h2>Report library</h2></div>
          </div>
          <div className="grid grid-3">
            <article className="card report">
              <div className="report__top">
                <span className="report__icon report__icon--1"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-2a4 4 0 0 0-3-3.8M16 3.2a3.5 3.5 0 0 1 0 6.6" /></svg></span>
                {" "}
                <div><span className="report__title">Headcount and turnover</span><span className="report__desc">Joiners, leavers and team size by department</span></div>
              </div>
              <div className="report__foot">
                <span className="perm-chip">users:view</span>
                <div className="btn-group"><NotBuilt what="Download" className="btn btn--sm" {...perm("reports:export")}>Download</NotBuilt><NotBuilt what="Run" className="btn btn--primary btn--sm">Run</NotBuilt></div>
              </div>
            </article>
            <article className="card report">
              <div className="report__top">
                <span className="report__icon report__icon--2"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2" /></svg></span>
                {" "}
                <div><span className="report__title">Attendance summary</span><span className="report__desc">Present, late and absent days for any period</span></div>
              </div>
              <div className="report__foot">
                <span className="perm-chip">attendance:view-all</span>
                <div className="btn-group"><NotBuilt what="Download" className="btn btn--sm" {...perm("reports:export")}>Download</NotBuilt><NotBuilt what="Run" className="btn btn--primary btn--sm">Run</NotBuilt></div>
              </div>
            </article>
            <article className="card report">
              <div className="report__top">
                <span className="report__icon report__icon--3"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" /></svg></span>
                {" "}
                <div><span className="report__title">Leave balances</span><span className="report__desc">Days taken and left for every employee</span></div>
              </div>
              <div className="report__foot">
                <span className="perm-chip">leave:approve</span>
                <div className="btn-group"><NotBuilt what="Download" className="btn btn--sm" {...perm("reports:export")}>Download</NotBuilt><NotBuilt what="Run" className="btn btn--primary btn--sm">Run</NotBuilt></div>
              </div>
            </article>
            <article className="card report">
              <div className="report__top">
                <span className="report__icon report__icon--4"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M17 14h1" /></svg></span>
                {" "}
                <div><span className="report__title">Payroll register</span><span className="report__desc">Gross, deductions and net pay for each run</span></div>
              </div>
              <div className="report__foot">
                <span className="perm-chip">salary:view</span>
                <div className="btn-group"><NotBuilt what="Download" className="btn btn--sm" {...perm("salary:view")}>Download</NotBuilt><NotBuilt what="Run" className="btn btn--primary btn--sm">Run</NotBuilt></div>
              </div>
            </article>
            <article className="card report">
              <div className="report__top">
                <span className="report__icon report__icon--1"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3zM3 10h18" /></svg></span>
                {" "}
                <div><span className="report__title">Expense summary</span><span className="report__desc">Claims by category, person and status</span></div>
              </div>
              <div className="report__foot">
                <span className="perm-chip">expenses:view</span>
                <div className="btn-group"><NotBuilt what="Download" className="btn btn--sm" {...perm("expenses:view")}>Download</NotBuilt><NotBuilt what="Run" className="btn btn--primary btn--sm">Run</NotBuilt></div>
              </div>
            </article>
            <article className="card report">
              <div className="report__top">
                <span className="report__icon report__icon--2"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" /></svg></span>
                {" "}
                <div><span className="report__title">Inventory and assets</span><span className="report__desc">Stock levels, movements and who holds what</span></div>
              </div>
              <div className="report__foot">
                <span className="perm-chip">inventory:view</span>
                <div className="btn-group"><NotBuilt what="Download" className="btn btn--sm" {...perm("reports:export")}>Download</NotBuilt><NotBuilt what="Run" className="btn btn--primary btn--sm">Run</NotBuilt></div>
              </div>
            </article>
          </div>
        </section>
        <div className="grid grid-main-aside">
          <section className="card">
            <div className="card__header"><h3 className="card__title">Recent exports</h3>{" "}<span className="card__meta">Last 7 days</span></div>
            <Table bare pager={false} columns={T1_COLUMNS} rows={T1_ROWS(perm)} rowKey={(r) => r.key} rowProps={(r) => r.r ?? {}} empty={null} />
          </section>
          <section className="card">
            <div className="card__header"><h3 className="card__title">Attendance summary, Q3</h3>{" "}<span className="badge badge--info badge--dot">Generating</span></div>
            <div className="card__body">
              <div className="skeleton skeleton--title" />
              <div className="skeleton skeleton--text" />
              <div className="skeleton skeleton--text" />
              <div className="skeleton skeleton--block" />
              <p className="form-hint mt-2">Large reports take a minute. You'll get a notification when it is ready.</p>
            </div>
          </section>
        </div>
      </div>
    </Frame>
  );
}

// table 1
const T1_COLUMNS = [
  { key: "c0", label: "Report", render: (r) => r.c[0], cellProps: (r) => r.p[0] },
  { key: "c1", label: "Format", render: (r) => r.c[1], cellProps: (r) => r.p[1] },
  { key: "c2", label: "Run by", render: (r) => r.c[2], cellProps: (r) => r.p[2] },
  { key: "c3", label: "When", render: (r) => r.c[3], cellProps: (r) => r.p[3] },
  { key: "c4", label: "Size", num: true, render: (r) => r.c[4], cellProps: (r) => r.p[4] },
];
const T1_ROWS = (perm) => [
  { key: 0, c: [<><span className="table__user-name">Payroll register, Sep</span></>, <><span className="badge badge--square">PDF</span></>, "A Finance Manager", "20 min ago", "412 KB"], p: [{}, {}, {}, {}, {}] },
  { key: 1, c: [<><span className="table__user-name">Attendance summary, week 37</span></>, <><span className="badge badge--square">CSV</span></>, "An HR Manager", "Yesterday", "86 KB"], p: [{}, {}, {}, {}, {}] },
  { key: 2, c: [<><span className="table__user-name">Inventory and assets</span></>, <><span className="badge badge--square">CSV</span></>, "An Admin", "16 Sep", "54 KB"], p: [{}, {}, {}, {}, {}] },
  { key: 3, c: [<><span className="table__user-name">Headcount and turnover</span></>, <><span className="badge badge--square">PDF</span></>, "An Admin", "14 Sep", "238 KB"], p: [{}, {}, {}, {}, {}] },
];
