// system/audit-log.html, a faithful sample (round 23; ruled 2026-11-11: the sample pages are ported as they are): written as JSX from
// the old page's HTML (tools/react/html2jsx.py), with what app.js gave it: controls the person may not use hidden (perm),
// "isn't available in this demo" on the placeholders (NotBuilt), the tables as Table (the phone cards come with it), a
// search box hiding its table's rows (ui/sample.js), links through the router.
import { useEffect } from "react";
import { initExports } from "../../../assets/js/ui/csv-export.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { NotBuilt } from "../components/Basics.jsx";
import { usePerm } from "../ui/perm.js";
import { onSearch } from "../ui/sample.js";

const PAGE = "system/audit-log.html";

export default function AuditLog() {
  const perm = usePerm();
  useEffect(() => { initExports(document.getElementById("main")); }, []);   // the Export button, as app.js wired it
  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Audit log</h1>
          <p className="page-header__subtitle">A permanent record of who did what, and when</p>
        </div>
        <div className="page-header__actions"><input className="input input--sm" type="date" defaultValue="2026-09-18" aria-label="Choose date" style={{ width: "auto" }} /></div>
      </div>
      <div className="stack">
        <div className="alert alert--info">Sample, not built yet: OfficeOS doesn't keep an audit log yet. This page shows how it could look; nothing is recorded, and the events and figures listed are examples.</div>
        <section className="stat-strip" aria-label="Key numbers">
          <div className="stat">
            <div className="stat__icon stat__icon--1"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6" /></svg></div>
            <div>
              <span className="stat__label">Events today</span>
              {" "}
              <strong className="stat__value">342</strong>
              {" "}
              <span className="stat__delta">Across all modules</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat__icon stat__icon--4"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" /></svg></div>
            <div>
              <span className="stat__label">Permission changes</span>
              {" "}
              <strong className="stat__value">6</strong>
              {" "}
              <span className="stat__delta">2 waiting for approval</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat__icon stat__icon--3"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6" /></svg></div>
            <div>
              <span className="stat__label">Sensitive views</span>
              {" "}
              <strong className="stat__value">11</strong>
              {" "}
              <span className="stat__delta">Bank, PAN and salary</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat__icon stat__icon--2"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0" /></svg></div>
            <div>
              <span className="stat__label">Failed sign-ins</span>
              {" "}
              <strong className="stat__value">3</strong>
              {" "}
              <span className="stat__delta stat__delta--down">From a new device</span>
            </div>
          </div>
        </section>
        <section className="card">
          <div className="table__toolbar">
            <h3 className="card__title">Activity</h3>
            <div className="table__filters">
              <div className="input-group">
                <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                {" "}
                <input onChange={onSearch} className="input input--sm input--search" type="search" placeholder="Search action or record" aria-label="Search the log" />
              </div>
              {" "}
              <select className="select select--sm" aria-label="Filter by module">
                <option>All modules</option>
                <option>Access</option>
                <option>Users</option>
                <option>Payroll</option>
                <option>Attendance</option>
                <option>Inventory</option>
                <option>System</option>
              </select>
              {" "}
              <select className="select select--sm" aria-label="Filter by result">
                <option>All results</option>
                <option>Success</option>
                <option>Pending approval</option>
                <option>Blocked</option>
              </select>
            </div>
          </div>
          <Table bare pager={false} columns={T1_COLUMNS} rows={T1_ROWS(perm)} rowKey={(r) => r.key} rowProps={(r) => r.r ?? {}} empty={null} oldExport exportName="audit-log" />
          <div className="pagination">
            <span>Showing 1 to 6 of 342 events today</span>
            {" "}
            <div className="pagination__pages">
              <button className="pagination__btn" type="button" disabled>Prev</button>
              {" "}
              <button className="pagination__btn is-active" type="button">1</button>
              {" "}
              <NotBuilt what="Page 2" className="pagination__btn">2</NotBuilt>
              {" "}
              <NotBuilt what="Page 3" className="pagination__btn">3</NotBuilt>
              {" "}
              <span className="pagination__gap">...</span>
              {" "}
              <NotBuilt what="Page 43" className="pagination__btn">43</NotBuilt>
              {" "}
              <NotBuilt what="Next page" className="pagination__btn">Next</NotBuilt>
            </div>
          </div>
        </section>
        <div className="grid grid-2">
          <section className="card">
            <div className="card__header"><h3 className="card__title">What is recorded</h3></div>
            <div className="card__body">
              <dl className="kv">
                <div className="kv__row"><dt>Who</dt><dd>Name, role and device</dd></div>
                <div className="kv__row"><dt>What</dt><dd>The action and the record it touched</dd></div>
                <div className="kv__row"><dt>Change</dt><dd>The old value and the new value</dd></div>
                <div className="kv__row"><dt>When and where</dt><dd>Exact time and IP address</dd></div>
                <div className="kv__row"><dt>Sensitive views</dt><dd>Bank, PAN and salary reveals</dd></div>
              </dl>
            </div>
          </section>
          <section className="card">
            <div className="card__header"><h3 className="card__title">Keeping the log</h3>{" "}<span className="card__meta">Company policy</span></div>
            <div className="card__body">
              <dl className="kv">
                <div className="kv__row"><dt>Kept for</dt><dd>7 years</dd></div>
                <div className="kv__row"><dt>Who can read it</dt><dd>Admin and HR Manager</dd></div>
                <div className="kv__row"><dt>Can it be edited</dt><dd>Never</dd></div>
                <div className="kv__row"><dt>Can it be deleted</dt><dd>Never</dd></div>
              </dl>
              <div className="alert alert--info mt-4">Nobody, an Admin included, can change or delete an entry. A mistake is corrected with a new entry, so the history stays complete.</div>
            </div>
          </section>
        </div>
      </div>
    </Frame>
  );
}

// table 1
const T1_COLUMNS = [
  { key: "c0", label: "Time", render: (r) => r.c[0], cellProps: (r) => r.p[0] },
  { key: "c1", label: "User", render: (r) => r.c[1], cellProps: (r) => r.p[1] },
  { key: "c2", label: "Action", render: (r) => r.c[2], cellProps: (r) => r.p[2] },
  { key: "c3", label: "Module", render: (r) => r.c[3], cellProps: (r) => r.p[3] },
  { key: "c4", label: "Record and change", render: (r) => r.c[4], cellProps: (r) => r.p[4] },
  { key: "c5", label: "IP address", render: (r) => r.c[5], cellProps: (r) => r.p[5] },
  { key: "c6", label: "Result", render: (r) => r.c[6], cellProps: (r) => r.p[6] },
];
const T1_ROWS = (perm) => [
  { key: 0, c: ["16:42", <><div className="table__user"><div className="avatar avatar--2">HR</div><span className="table__user-name">An HR Manager</span></div></>, "Changed a designation", <><span className="badge badge--square">Users</span></>, <><span className="table__user-name">An employee</span><span className="diff"><span className="diff__old">Old designation</span><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg><span className="diff__new">New designation</span></span></>, "x.x.x.x", <><span className="badge badge--success badge--dot">Success</span></>], p: [{}, {}, {}, {}, {}, {}, {}] },
  { key: 1, c: ["15:05", <><div className="table__user"><div className="avatar avatar--3">AD</div><span className="table__user-name">An Admin</span></div></>, <>{"Revealed a bank account "}<span className="tooltip"><button className="info-dot" type="button" aria-label="About sensitive views">i</button><span className="tooltip__text" role="tooltip">In a real audit log, viewing full bank or PAN details would be recorded with the viewer's name. OfficeOS doesn't record it yet.</span></span>{" "}</>, <><span className="badge badge--square">Users</span></>, "An employee's record, needs pii:view", "x.x.x.x", <><span className="badge badge--info badge--dot">Sensitive</span></>], p: [{}, {}, {}, {}, {}, {}, {}] },
  { key: 2, c: ["14:30", <><div className="table__user"><div className="avatar avatar--3">AD</div><span className="table__user-name">An Admin</span></div></>, "Recorded stock movement", <><span className="badge badge--square">Inventory</span></>, <><span className="table__user-name">An item</span><span className="diff"><span className="diff__old">10</span><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg><span className="diff__new">9 in stock</span></span></>, "x.x.x.x", <><span className="badge badge--success badge--dot">Success</span></>], p: [{}, {}, {}, {}, {}, {}, {}] },
  { key: 3, c: ["11:12", <><div className="table__user"><div className="avatar avatar--1">?</div><span className="table__user-name">Unknown</span></div></>, "Failed sign-in, 3 attempts", <><span className="badge badge--square">System</span></>, "An employee's email, new device", "x.x.x.x", <><span className="badge badge--danger badge--dot">Blocked</span></>], p: [{}, {}, {}, {}, {}, {}, {}] },
  { key: 4, c: ["10:02", <><div className="table__user"><div className="avatar avatar--2">HR</div><span className="table__user-name">An HR Manager</span></div></>, "Approved regularization", <><span className="badge badge--square">Attendance</span></>, <><span className="table__user-name">An employee, a past date</span><span className="diff"><span className="diff__old">10:20</span><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg><span className="diff__new">09:30</span></span></>, "x.x.x.x", <><span className="badge badge--success badge--dot">Success</span></>], p: [{}, {}, {}, {}, {}, {}, {}] },
  { key: 5, c: ["02:00", <><div className="table__user"><div className="avatar avatar--3">S</div><span className="table__user-name">System</span></div></>, "Backup completed", <><span className="badge badge--square">System</span></>, "Automatic backup", "–", <><span className="badge badge--success badge--dot">Success</span></>], p: [{}, {}, {}, {}, {}, {}, {}] },
];
