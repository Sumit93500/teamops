// account/sessions.html, a faithful sample (round 23; ruled 2026-11-11: the sample pages are ported as they are): written as JSX from
// the old page's HTML (tools/react/html2jsx.py), with what app.js gave it: controls the person may not use hidden (perm),
// "isn't available in this demo" on the placeholders (NotBuilt), the tables as Table (the phone cards come with it), a
// search box hiding its table's rows (ui/sample.js), links through the router.
import { Link } from "react-router-dom";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { NotBuilt } from "../components/Basics.jsx";
import { usePerm } from "../ui/perm.js";
import { pageUrl } from "../routes.js";

const PAGE = "account/sessions.html";

export default function Sessions() {
  const perm = usePerm();
  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>My account</h1>
          <p className="page-header__subtitle">Your profile, password and sign-in security</p>
        </div>
      </div>
      <nav className="tabs acct-tabs" aria-label="Account sections">
        <Link to={pageUrl("account/my-profile.html")} className="tabs__tab">Profile</Link>
        {" "}
        <Link to={pageUrl("account/change-password.html")} className="tabs__tab">Password</Link>
        {" "}
        <Link to={pageUrl("account/sessions.html")} className="tabs__tab is-active">Sessions</Link>
        {" "}
        <Link to={pageUrl("account/notifications.html")} className="tabs__tab">Notifications</Link>
      </nav>
      <div className="stack">
        <div className="alert alert--info">Sample, not built yet: OfficeOS keeps one sign-in per browser, so there are no other devices or sessions to manage. This tab shows how it could look; nothing here signs anyone out or saves these choices, and the devices and sign-in alerts listed are examples.</div>
        <div className="grid grid-main-aside">
          <section className="card">
            <div className="card__header"><h3 className="card__title">Where you're signed in</h3>{" "}<span className="card__meta">4 devices</span></div>
            <div className="list">
              <div className="list__item device device--current">
                <span className="device__icon"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H4zM2 19h20" /></svg></span>
                {" "}
                <div className="list__content">
                  <span className="list__title">Chrome on Windows{" "}<span className="badge badge--success badge--dot">This device</span></span>
                  {" "}
                  <span className="list__sub">Gurugram, India. Active now</span>
                </div>
              </div>
              <div className="list__item device">
                <span className="device__icon"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2" /></svg></span>
                {" "}
                <div className="list__content">
                  <span className="list__title">Safari on iPhone</span>
                  {" "}
                  <span className="list__sub">New Delhi, India. Last active 2 hours ago</span>
                </div>
                {" "}
                <NotBuilt what="Sign out" className="btn btn--sm" {...perm("sessions:end-own")}>Sign out</NotBuilt>
              </div>
              <div className="list__item device">
                <span className="device__icon"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H4zM2 19h20" /></svg></span>
                {" "}
                <div className="list__content">
                  <span className="list__title">Firefox on Mac</span>
                  {" "}
                  <span className="list__sub">Noida, India. Last active 3 days ago</span>
                </div>
                {" "}
                <NotBuilt what="Sign out" className="btn btn--sm" {...perm("sessions:end-own")}>Sign out</NotBuilt>
              </div>
              <div className="list__item device">
                <span className="device__icon"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2" /></svg></span>
                {" "}
                <div className="list__content">
                  <span className="list__title">Chrome on Android</span>
                  {" "}
                  <span className="list__sub">Gurugram, India. Last active 12 days ago</span>
                </div>
                {" "}
                <NotBuilt what="Sign out" className="btn btn--sm" {...perm("sessions:end-own")}>Sign out</NotBuilt>
              </div>
            </div>
            <div className="card__footer">
              <span className="card__meta">Signing out ends that session straight away.</span>
              {" "}
              <NotBuilt what="Sign out of all other devices" className="btn btn--sm btn--danger" {...perm("sessions:end-own")}>Sign out of all other devices</NotBuilt>
            </div>
          </section>
          <aside className="stack">
            <section className="card">
              <div className="card__header"><h3 className="card__title">Sign-in security</h3></div>
              <div className="card__body">
                <dl className="kv">
                  <div className="kv__row"><dt>Password changed</dt><dd>14 Jun 2026</dd></div>
                  <div className="kv__row">
                    <dt>Two-factor sign-in</dt>
                    <dd><span className="badge badge--warning">Off</span></dd>
                  </div>
                  <div className="kv__row"><dt>Trusted devices</dt><dd>1</dd></div>
                  <div className="kv__row"><dt>Signed out after</dt><dd>30 minutes idle</dd></div>
                </dl>
                {" "}
                <Link to={pageUrl("account/change-password.html")} className="btn btn--sm mt-4">Turn on two-factor</Link>
              </div>
            </section>
            <section className="card">
              <div className="card__header"><h3 className="card__title">Sign-in alerts</h3></div>
              <div className="card__body">
                <div className="toggle-list">
                  <label className="switch"><input type="checkbox" defaultChecked />{" "}Email me when a new device signs in</label>
                  {" "}
                  <label className="switch"><input type="checkbox" defaultChecked />{" "}Email me about failed sign-ins</label>
                </div>
              </div>
            </section>
            <div className="alert alert--warning">A sign-in attempt from Frankfurt on 15 Sep was blocked. If it wasn't you,{" "}<Link to={pageUrl("account/change-password.html")} className="link">change your password</Link>{" "}now.</div>
          </aside>
        </div>
        <section className="card">
          <div className="card__header"><h3 className="card__title">Sign-in history</h3>{" "}<span className="card__meta">Last 30 days</span></div>
          <Table bare pager={false} columns={T1_COLUMNS} rows={T1_ROWS(perm)} rowKey={(r) => r.key} rowProps={(r) => r.r ?? {}} empty={null} />
        </section>
      </div>
    </Frame>
  );
}

// table 1
const T1_COLUMNS = [
  { key: "c0", label: "Date and time", render: (r) => r.c[0], cellProps: (r) => r.p[0] },
  { key: "c1", label: "Device", render: (r) => r.c[1], cellProps: (r) => r.p[1] },
  { key: "c2", label: "Place", render: (r) => r.c[2], cellProps: (r) => r.p[2] },
  { key: "c3", label: "IP address", render: (r) => r.c[3], cellProps: (r) => r.p[3] },
  { key: "c4", label: "Result", render: (r) => r.c[4], cellProps: (r) => r.p[4] },
];
const T1_ROWS = (perm) => [
  { key: 0, c: ["Today, 09:10", "Chrome on Windows", "Gurugram, India", "103.xx.xx.24", <><span className="badge badge--success badge--dot">Success</span></>], p: [{}, {}, {}, {}, {}] },
  { key: 1, c: ["18 Sep, 08:55", "Safari on iPhone", "New Delhi, India", "49.xx.xx.107", <><span className="badge badge--success badge--dot">Success</span></>], p: [{}, {}, {}, {}, {}] },
  { key: 2, c: ["15 Sep, 21:40", "Unknown browser on Linux", "Frankfurt, Germany", "185.xx.xx.12", <><span className="badge badge--danger badge--dot">Blocked</span></>], p: [{}, {}, {}, {}, {}] },
  { key: 3, c: ["14 Sep, 09:05", "Chrome on Windows", "Gurugram, India", "103.xx.xx.24", <><span className="badge badge--success badge--dot">Success</span></>], p: [{}, {}, {}, {}, {}] },
  { key: 4, c: ["12 Sep, 18:20", "Firefox on Mac", "Noida, India", "117.xx.xx.63", <><span className="badge badge--success badge--dot">Success</span></>], p: [{}, {}, {}, {}, {}] },
];
