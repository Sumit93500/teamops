// recruitment/job-openings.html, a faithful sample (round 23; ruled 2026-11-11: the sample pages are ported as they are): written as JSX from
// the old page's HTML (tools/react/html2jsx.py), with what app.js gave it: controls the person may not use hidden (perm),
// "isn't available in this demo" on the placeholders (NotBuilt), the tables as Table (the phone cards come with it), a
// search box hiding its table's rows (ui/sample.js), links through the router.
import { Link } from "react-router-dom";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { NotBuilt, Tabs } from "../components/Basics.jsx";
import { usePerm } from "../ui/perm.js";
import { onSearch } from "../ui/sample.js";
import { pageUrl } from "../routes.js";

const PAGE = "recruitment/job-openings.html";

export default function JobOpenings() {
  const perm = usePerm();
  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div><h1>Recruitment</h1><p className="page-header__subtitle">Positions you are hiring for right now</p></div>
        <div className="page-header__actions">
          <Link to={pageUrl("recruitment/candidates.html")} className="btn">Candidates</Link>
          {" "}
          <NotBuilt what="Post job opening" className="btn btn--primary" {...perm("recruitment:create")}><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>{" "}Post job opening</NotBuilt>
        </div>
      </div>
      <div className="stack">
        <div className="alert alert--info">Sample, not built yet: recruitment isn't part of OfficeOS yet. This page shows how it could look; nothing here is saved, and the openings, candidates and figures listed are examples.</div>
        <section className="stat-strip" aria-label="Key numbers">
          <div className="stat">
            <div className="stat__icon stat__icon--1"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16v11H4zM9 8V5h6v3" /></svg></div>
            <div>
              <span className="stat__label">Open positions</span>
              {" "}
              <strong className="stat__value">9</strong>
              {" "}
              <span className="stat__delta stat__delta--down">2 closing this week</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat__icon stat__icon--2"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-2a4 4 0 0 0-3-3.8M16 3.2a3.5 3.5 0 0 1 0 6.6" /></svg></div>
            <div>
              <span className="stat__label">Applicants in pipeline</span>
              {" "}
              <strong className="stat__value">221</strong>
              {" "}
              <span className="stat__delta stat__delta--up">+38 this week</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat__icon stat__icon--3"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" /></svg></div>
            <div>
              <span className="stat__label">Interviews this week</span>
              {" "}
              <strong className="stat__value">14</strong>
              {" "}
              <span className="stat__delta">5 are for Frontend Developer</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat__icon stat__icon--4"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2" /></svg></div>
            <div>
              <span className="stat__label">Average time to hire</span>
              {" "}
              <strong className="stat__value">26 days</strong>
              {" "}
              <span className="stat__delta stat__delta--up">4 days faster than 2025</span>
            </div>
          </div>
        </section>
        <div className="grid grid-main-aside">
          <section className="card">
            <div className="table__toolbar">
              {/* the tabs only mark the one picked (ui/tabs.js): the table is the same sample */}
              <Tabs pill tabs={[{ label: "Open", count: "9" }, { label: "Closed", count: "14" }, { label: "Drafts", count: "1" }]} />
              <div className="table__filters">
                <div className="input-group">
                  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  {" "}
                  <input onChange={onSearch} className="input input--sm input--search" type="search" placeholder="Search job titles" aria-label="Search jobs" />
                </div>
                {" "}
                <select className="select select--sm" aria-label="Filter by department">
                  <option>All departments</option>
                  <option>Engineering</option>
                  <option>Sales</option>
                  <option>Operations</option>
                  <option>Customer Support</option>
                </select>
              </div>
            </div>
            <Table bare pager={false} columns={T1_COLUMNS} rows={T1_ROWS(perm)} rowKey={(r) => r.key} rowProps={(r) => r.r ?? {}} empty={null} />
            <div className="card__footer">
              <span className="card__meta">Showing 6 of 9 open positions</span>
              {" "}
              <div className="btn-group"><button className="btn btn--sm" type="button" disabled>Previous</button>{" "}<NotBuilt what="Next page" className="btn btn--sm">Next</NotBuilt></div>
            </div>
          </section>
          <aside className="stack">
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Applicants by stage</h3>
                {" "}
                <span className="card__meta">221 in pipeline</span>
              </div>
              <div className="card__body">
                <div className="bar-row">
                  <span>Applied</span>
                  <div className="bar-row__track"><span className="bar-row__fill" style={{ "--w": "100%" }} /></div>
                  <span className="bar-row__value">120</span>
                </div>
                <div className="bar-row">
                  <span>Screening</span>
                  <div className="bar-row__track"><span className="bar-row__fill" style={{ "--w": "53%" }} /></div>
                  <span className="bar-row__value">64</span>
                </div>
                <div className="bar-row">
                  <span>Interview</span>
                  <div className="bar-row__track"><span className="bar-row__fill" style={{ "--w": "23%" }} /></div>
                  <span className="bar-row__value">28</span>
                </div>
                <div className="bar-row">
                  <span>Offer</span>
                  <div className="bar-row__track"><span className="bar-row__fill" style={{ "--w": "8%" }} /></div>
                  <span className="bar-row__value">9</span>
                </div>
              </div>
            </section>
            <section className="card">
              <div className="card__header"><h3 className="card__title">Open roles by department</h3>{" "}<span className="card__meta">9 total</span></div>
              <div className="card__body">
                <div className="bar-row">
                  <span>Engineering</span>
                  <div className="bar-row__track"><span className="bar-row__fill" style={{ "--w": "100%" }} /></div>
                  <span className="bar-row__value">4</span>
                </div>
                <div className="bar-row">
                  <span>Sales</span>
                  <div className="bar-row__track"><span className="bar-row__fill" style={{ "--w": "50%" }} /></div>
                  <span className="bar-row__value">2</span>
                </div>
                <div className="bar-row">
                  <span>Support</span>
                  <div className="bar-row__track"><span className="bar-row__fill" style={{ "--w": "50%" }} /></div>
                  <span className="bar-row__value">2</span>
                </div>
                <div className="bar-row">
                  <span>Operations</span>
                  <div className="bar-row__track"><span className="bar-row__fill" style={{ "--w": "25%" }} /></div>
                  <span className="bar-row__value">1</span>
                </div>
              </div>
            </section>
            <section className="card">
              <div className="card__header"><h3 className="card__title">Post a job opening</h3></div>
              <div className="card__body">
                <form className="form" action="job-openings.html">
                  <div className="form-field"><label className="form-label form-label--required" htmlFor="j-title">Job title</label>{" "}<input className="input" id="j-title" type="text" placeholder="e.g. Business Analyst" required /></div>
                  <div className="form-grid">
                    <div className="form-field">
                      <label className="form-label form-label--required" htmlFor="j-dept">Department</label>
                      {" "}
                      <select className="select" id="j-dept" required>
                        <option value="">Select</option>
                        <option>Engineering</option>
                        <option>Sales</option>
                        <option>Operations</option>
                        <option>Customer Support</option>
                        <option>Finance</option>
                        <option>HR</option>
                      </select>
                    </div>
                    <div className="form-field"><label className="form-label" htmlFor="j-open">Positions</label>{" "}<input className="input" id="j-open" type="number" min="1" defaultValue="1" /></div>
                    <div className="form-field">
                      <label className="form-label" htmlFor="j-loc">Location</label>
                      {" "}
                      <select className="select" id="j-loc"><option>Gurugram</option><option>Remote</option></select>
                    </div>
                    <div className="form-field"><label className="form-label" htmlFor="j-close">Closes on</label>{" "}<input className="input" id="j-close" type="date" /></div>
                  </div>
                  {" "}
                  <NotBuilt what="Post job opening" className="btn btn--primary btn--block" {...perm("recruitment:create")}>Post job opening</NotBuilt>
                </form>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </Frame>
  );
}

// table 1
const T1_COLUMNS = [
  { key: "c0", label: "Job title", render: (r) => r.c[0], cellProps: (r) => r.p[0] },
  { key: "c1", label: "Department", render: (r) => r.c[1], cellProps: (r) => r.p[1] },
  { key: "c2", label: "Location", render: (r) => r.c[2], cellProps: (r) => r.p[2] },
  { key: "c3", label: "Type", render: (r) => r.c[3], cellProps: (r) => r.p[3] },
  { key: "c4", label: "Applicants", num: true, render: (r) => r.c[4], cellProps: (r) => r.p[4] },
  { key: "c5", label: "Closes", render: (r) => r.c[5], cellProps: (r) => r.p[5] },
  { key: "c6", label: "Status", render: (r) => r.c[6], cellProps: (r) => r.p[6] },
  { key: "c7", label: "Actions", actions: true, render: (r) => r.c[7], cellProps: (r) => r.p[7] },
];
const T1_ROWS = (perm) => [
  { key: 0, c: [<><span className="table__user-name">Frontend Developer</span><span className="table__user-sub">Posted 2 Sep</span></>, "Engineering", "Gurugram", "Full-time", "48", "25 Sep", <><span className="badge badge--warning badge--dot">Closing soon</span></>, <><div className="btn-group"><Link to={pageUrl("recruitment/candidates.html")} className="btn btn--sm">Candidates</Link><NotBuilt what="Edit" className="btn btn--sm" {...perm("recruitment:edit")}>Edit</NotBuilt></div></>], p: [{}, {}, {}, {}, {}, {}, {}, {}] },
  { key: 1, c: [<><span className="table__user-name">Backend Developer</span><span className="table__user-sub">Posted 2 Sep</span></>, "Engineering", "Gurugram", "Full-time", "39", "10 Oct", <><span className="badge badge--success badge--dot">Open</span></>, <><div className="btn-group"><Link to={pageUrl("recruitment/candidates.html")} className="btn btn--sm">Candidates</Link><NotBuilt what="Edit" className="btn btn--sm" {...perm("recruitment:edit")}>Edit</NotBuilt></div></>], p: [{}, {}, {}, {}, {}, {}, {}, {}] },
  { key: 2, c: [<><span className="table__user-name">QA Engineer</span><span className="table__user-sub">Posted 5 Sep</span></>, "Engineering", "Gurugram", "Full-time", "27", "15 Oct", <><span className="badge badge--success badge--dot">Open</span></>, <><div className="btn-group"><Link to={pageUrl("recruitment/candidates.html")} className="btn btn--sm">Candidates</Link><NotBuilt what="Edit" className="btn btn--sm" {...perm("recruitment:edit")}>Edit</NotBuilt></div></>], p: [{}, {}, {}, {}, {}, {}, {}, {}] },
  { key: 3, c: [<><span className="table__user-name">DevOps Engineer</span><span className="table__user-sub">Posted 8 Sep</span></>, "Engineering", "Remote", "Full-time", "21", "20 Oct", <><span className="badge badge--success badge--dot">Open</span></>, <><div className="btn-group"><Link to={pageUrl("recruitment/candidates.html")} className="btn btn--sm">Candidates</Link><NotBuilt what="Edit" className="btn btn--sm" {...perm("recruitment:edit")}>Edit</NotBuilt></div></>], p: [{}, {}, {}, {}, {}, {}, {}, {}] },
  { key: 4, c: [<><span className="table__user-name">Sales Executive</span><span className="table__user-sub">Posted 1 Sep</span></>, "Sales", "Gurugram", "Full-time", "35", "24 Sep", <><span className="badge badge--warning badge--dot">Closing soon</span></>, <><div className="btn-group"><Link to={pageUrl("recruitment/candidates.html")} className="btn btn--sm">Candidates</Link><NotBuilt what="Edit" className="btn btn--sm" {...perm("recruitment:edit")}>Edit</NotBuilt></div></>], p: [{}, {}, {}, {}, {}, {}, {}, {}] },
  { key: 5, c: [<><span className="table__user-name">Account Manager</span><span className="table__user-sub">Posted 9 Sep</span></>, "Sales", "Gurugram", "Full-time", "22", "25 Oct", <><span className="badge badge--success badge--dot">Open</span></>, <><div className="btn-group"><Link to={pageUrl("recruitment/candidates.html")} className="btn btn--sm">Candidates</Link><NotBuilt what="Edit" className="btn btn--sm" {...perm("recruitment:edit")}>Edit</NotBuilt></div></>], p: [{}, {}, {}, {}, {}, {}, {}, {}] },
];
