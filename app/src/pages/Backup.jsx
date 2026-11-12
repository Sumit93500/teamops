// system/backup.html, a faithful sample (round 23; ruled 2026-11-11: the sample pages are ported as they are): written as JSX from
// the old page's HTML (tools/react/html2jsx.py), with what app.js gave it: controls the person may not use hidden (perm),
// "isn't available in this demo" on the placeholders (NotBuilt), the tables as Table (the phone cards come with it), a
// search box hiding its table's rows (ui/sample.js), links through the router.
import { Link } from "react-router-dom";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { NotBuilt } from "../components/Basics.jsx";
import { usePerm } from "../ui/perm.js";
import { pageUrl } from "../routes.js";

const PAGE = "system/backup.html";

export default function Backup() {
  const perm = usePerm();
  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Backup</h1>
          <p className="page-header__subtitle">Keep a safe copy of company data, and restore it if something goes wrong</p>
        </div>
        <div className="page-header__actions"><Link to={pageUrl("system/settings.html")} className="btn">Settings</Link>{" "}<NotBuilt what="Back up now" className="btn btn--primary" {...perm("backup:create")}>Back up now</NotBuilt></div>
      </div>
      <div className="stack">
        <div className="alert alert--info">Sample, not built yet: backups aren't part of OfficeOS yet. This page shows how they could look; nothing is backed up or restored, and the backups, storage and schedule listed are examples.</div>
        <section className="card backup-hero">
          <div className="backup-hero__state">
            <span className="backup-hero__icon"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M8 12l3 3 5-6" /></svg></span>
            {" "}
            <div>
              <h2 className="backup-hero__title">Last backup completed</h2>
              <p className="text-muted">18 Sep 2026, 02:00 AM. 1.2 GB, took 4 minutes.</p>
            </div>
          </div>
          <div className="btn-group">
            <span className="tooltip">
              <span className="badge badge--success badge--dot">Encrypted</span>
              {" "}
              <span className="tooltip__text" role="tooltip">Backups are encrypted with AES-256 before they leave the server.</span>
            </span>
            {" "}
            <NotBuilt what="Download latest" className="btn btn--sm" {...perm("backup:download")}>Download latest</NotBuilt>
          </div>
        </section>
        <div className="grid grid-main-aside">
          <section className="card">
            <div className="card__header"><h3 className="card__title">Backups</h3>{" "}<span className="card__meta">Sample, not built yet</span></div>
            <Table bare pager={false} columns={T1_COLUMNS} rows={T1_ROWS(perm)} rowKey={(r) => r.key} rowProps={(r) => r.r ?? {}} empty={null} />
            <div className="card__footer">
              <span className="card__meta">Showing 6 of 30 backups</span>
              {" "}
              <div className="btn-group"><button className="btn btn--sm" type="button" disabled>Previous</button>{" "}<NotBuilt what="Next page" className="btn btn--sm">Next</NotBuilt></div>
            </div>
          </section>
          <aside className="stack">
            <section className="card">
              <div className="card__header"><h3 className="card__title">Storage</h3>{" "}<span className="card__meta">Sample, not built yet</span></div>
              <div className="card__body">
                <p className="fw-medium mb-2">34.8 GB of 50 GB used</p>
                <div className="progress progress--warning"><span className="progress__bar" style={{ "--w": "70%" }} /></div>
                <p className="form-hint mt-2">At the current pace the space is full in about 3 months. Old backups are deleted automatically after 30.</p>
              </div>
            </section>
            <section className="card">
              <div className="card__header"><h3 className="card__title">Schedule</h3><span className="card__meta">Sample, not built yet</span></div>
              <div className="card__body">
                <form className="form" action="backup.html">
                  <div className="form-grid">
                    <div className="form-field">
                      <label className="form-label" htmlFor="b-freq">How often</label>
                      {" "}
                      <select defaultValue="Every day" className="select" id="b-freq"><option>Every day</option><option>Every week</option></select>
                    </div>
                    <div className="form-field"><label className="form-label" htmlFor="b-time">At</label>{" "}<input className="input" id="b-time" type="time" defaultValue="02:00" /></div>
                    <div className="form-field">
                      <label className="form-label" htmlFor="b-keep">Keep the last</label>
                      {" "}
                      <select defaultValue="30 backups" className="select" id="b-keep">
                        <option>14 backups</option>
                        <option>30 backups</option>
                        <option>60 backups</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label className="form-label" htmlFor="b-where">Stored in</label>
                      {" "}
                      <select className="select" id="b-where"><option>Cloud storage</option><option>Company server</option></select>
                    </div>
                  </div>
                  <div className="toggle-list">
                    <label className="switch"><input type="checkbox" defaultChecked />{" "}Email Admins if a backup fails</label>
                  </div>
                  {" "}
                  <NotBuilt what="Save schedule" className="btn btn--primary btn--block" {...perm("backup:manage")}>Save schedule</NotBuilt>
                </form>
              </div>
            </section>
          </aside>
        </div>
        <div className="grid grid-main-aside">
          <section className="card">
            <div className="card__header">
              <h3 className="card__title">How a restore works</h3>
              {" "}
              <span className="card__meta">Sample, not built yet</span>
            </div>
            <div className="card__body">
              <ol className="stepper">
                <li className="stepper__step is-done">
                  <span className="stepper__dot"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg></span>
                  {" "}
                  <div className="stepper__text"><strong>An Admin asks</strong><small className="text-muted">Chooses the backup and gives a reason</small></div>
                </li>
                <li className="stepper__step is-current">
                  <span className="stepper__dot">2</span>
                  {" "}
                  <div className="stepper__text"><strong>Another Admin approves</strong><small className="text-muted">Waiting in the Approvals inbox</small></div>
                </li>
                <li className="stepper__step">
                  <span className="stepper__dot">3</span>
                  {" "}
                  <div className="stepper__text"><strong>Data is restored</strong><small className="text-muted">The system is read-only meanwhile</small></div>
                </li>
                <li className="stepper__step">
                  <span className="stepper__dot">4</span>
                  {" "}
                  <div className="stepper__text"><strong>Kept with the request</strong><small className="text-muted">Who asked, who approved, which backup and when</small></div>
                </li>
              </ol>
            </div>
          </section>
          <div className="alert alert--warning">Restoring replaces today's company data with the data in the backup. Anything entered after that backup is lost, so restore only when it is truly needed.</div>
        </div>
      </div>
    </Frame>
  );
}

// table 1
const T1_COLUMNS = [
  { key: "c0", label: "Date and time", render: (r) => r.c[0], cellProps: (r) => r.p[0] },
  { key: "c1", label: "Type", render: (r) => r.c[1], cellProps: (r) => r.p[1] },
  { key: "c2", label: "Size", num: true, render: (r) => r.c[2], cellProps: (r) => r.p[2] },
  { key: "c3", label: "Status", render: (r) => r.c[3], cellProps: (r) => r.p[3] },
  { key: "c4", label: "Actions", actions: true, render: (r) => r.c[4], cellProps: (r) => r.p[4] },
];
const T1_ROWS = (perm) => [
  { key: 0, c: [<><span className="table__user-name">18 Sep, 02:00</span></>, <><span className="badge badge--square">Automatic</span></>, "1.2 GB", <><span className="badge badge--success badge--dot">Completed</span></>, <><div className="btn-group"><NotBuilt what="Download" className="btn btn--sm" {...perm("backup:download")}>Download</NotBuilt><NotBuilt what="Restore" className="btn btn--sm" {...perm("backup:restore")}>Restore</NotBuilt></div></>], p: [{}, {}, {}, {}, {}] },
  { key: 1, c: [<><span className="table__user-name">17 Sep, 02:00</span></>, <><span className="badge badge--square">Automatic</span></>, "1.2 GB", <><span className="badge badge--success badge--dot">Completed</span></>, <><div className="btn-group"><NotBuilt what="Download" className="btn btn--sm" {...perm("backup:download")}>Download</NotBuilt><NotBuilt what="Restore" className="btn btn--sm" {...perm("backup:restore")}>Restore</NotBuilt></div></>], p: [{}, {}, {}, {}, {}] },
  { key: 2, c: [<><span className="table__user-name">16 Sep, 14:12</span></>, <><span className="badge badge--primary badge--square">Manual</span></>, "1.2 GB", <><span className="badge badge--success badge--dot">Completed</span></>, <><div className="btn-group"><NotBuilt what="Download" className="btn btn--sm" {...perm("backup:download")}>Download</NotBuilt><NotBuilt what="Restore" className="btn btn--sm" {...perm("backup:restore")}>Restore</NotBuilt></div></>], p: [{}, {}, {}, {}, {}] },
  { key: 3, c: [<><span className="table__user-name">16 Sep, 02:00</span></>, <><span className="badge badge--square">Automatic</span></>, "1.2 GB", <><span className="badge badge--success badge--dot">Completed</span></>, <><div className="btn-group"><NotBuilt what="Download" className="btn btn--sm" {...perm("backup:download")}>Download</NotBuilt><NotBuilt what="Restore" className="btn btn--sm" {...perm("backup:restore")}>Restore</NotBuilt></div></>], p: [{}, {}, {}, {}, {}] },
  { key: 4, c: [<><span className="table__user-name">14 Sep, 02:00</span></>, <><span className="badge badge--square">Automatic</span></>, "1.2 GB", <><span className="badge badge--warning badge--dot">Restore requested</span></>, <><Link to={pageUrl("requests/approvals-inbox.html")} className="btn btn--sm">View request</Link></>], p: [{}, {}, {}, {}, {}] },
  { key: 5, c: [<><span className="table__user-name">13 Sep, 02:00</span></>, <><span className="badge badge--square">Automatic</span></>, "1.1 GB", <><span className="badge badge--danger badge--dot">Failed</span></>, <><span className="text-sm text-muted">Disk full, retried</span></>], p: [{}, {}, {}, {}, {}] },
];
