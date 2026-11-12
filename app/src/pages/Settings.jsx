// Settings (pages/system/settings.html + assets/js/pages/settings.js), ported as it is (round 23): a sample page apart from
// the Appearance card, as its notice says. Written as JSX from the old page (tools/react/html2jsx.py), with what app.js and
// settings.js gave it: controls the person may not use hidden (perm), "isn't available in this demo" on the placeholders
// (NotBuilt), the role colours as Table; "Always on" under the Payroll and Expenses modules (round 14E part 2, the Reason
// line); a section link scrolls to its card and is marked; Appearance: the theme saved on this device (theme.js, the same
// setting as the topbar's menu), shown again whenever it changes, and Save appearance applies the one picked.
// The inventory settings (round 17, a data round) aren't built, so the page is as it was.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { applyTheme, savedTheme } from "../../../assets/js/ui/theme.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { NotBuilt, Reason } from "../components/Basics.jsx";
import { useToast } from "../ui/Toast.jsx";
import { usePerm } from "../ui/perm.js";
import { pageUrl } from "../routes.js";

const PAGE = "system/settings.html";
const APPEARANCE_CHANGED = "officeos:appearance";   // theme.js announces a change on document under this name

export default function Settings() {
  const perm = usePerm();
  const showToast = useToast();
  const [section, setSection] = useState("company");
  const [chosen, setChosen] = useState(() => savedTheme() ?? "light");
  useEffect(() => {
    const show = () => setChosen(savedTheme() ?? "light");
    document.addEventListener(APPEARANCE_CHANGED, show);
    return () => document.removeEventListener(APPEARANCE_CHANGED, show);
  }, []);
  const go = (e) => {
    e.preventDefault();
    const id = e.currentTarget.getAttribute("href").slice(1);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setSection(id);
  };
  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-header__subtitle">Company details, security rules and which modules are switched on</p>
        </div>
        <div className="page-header__actions"><Link to={pageUrl("system/backup.html")} className="btn">Backup</Link>{" "}<Link to={pageUrl("system/audit-log.html")} className="btn">Audit log</Link></div>
      </div>
      <div className="settings">
        <nav className="settings__nav" aria-label="Settings sections">
          <a className={`settings__link${section === "company" ? " is-active" : ""}`} href="#company" onClick={go}>Company</a>
          {" "}
          <a className={`settings__link${section === "hours" ? " is-active" : ""}`} href="#hours" onClick={go}>Working hours</a>
          {" "}
          <a className={`settings__link${section === "security" ? " is-active" : ""}`} href="#security" onClick={go}>Security</a>
          {" "}
          <a className={`settings__link${section === "modules" ? " is-active" : ""}`} href="#modules" onClick={go}>Modules</a>
          {" "}
          <a className={`settings__link${section === "appearance" ? " is-active" : ""}`} href="#appearance" onClick={go}>Appearance</a>
        </nav>
        <div className="stack">
          <div className="alert alert--info">Sample, not built yet: company settings aren't part of OfficeOS yet. This page shows how they could look; apart from the Appearance theme, which saves on this device, nothing here is saved or applied, and the rules and values listed are examples.</div>
          <section className="card" id="company">
            <div className="card__header"><h3 className="card__title">Company</h3></div>
            <form action="settings.html">
              <div className="card__body">
                <div className="form-grid">
                  <div className="form-field form-field--full"><label className="form-label form-label--required" htmlFor="c-name">Company name</label>{" "}<input className="input" id="c-name" type="text" defaultValue="Northwind Technologies Pvt. Ltd." /></div>
                  <div className="form-field form-field--full">
                    <label className="form-label" htmlFor="c-addr">Address</label>
                    {" "}
                    <textarea defaultValue="Sector 44, Gurugram, Haryana 122003" className="textarea" id="c-addr" />
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="c-tz">Time zone</label>
                    {" "}
                    <select className="select" id="c-tz"><option>India Standard Time (UTC+5:30)</option></select>
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="c-cur">Currency</label>
                    {" "}
                    <select className="select" id="c-cur"><option>Indian rupee (₹)</option></select>
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="c-fy">Financial year starts in</label>
                    {" "}
                    <select className="select" id="c-fy"><option>April</option><option>January</option></select>
                  </div>
                  <div className="form-field"><label className="form-label" htmlFor="c-emp">Employee ID prefix</label>{" "}<input className="input" id="c-emp" type="text" defaultValue="EMP-" /></div>
                </div>
              </div>
              <div className="card__footer">
                <span className="card__meta">Shown on payslips and reports.</span>
                {" "}
                <NotBuilt what="Save company" className="btn btn--primary btn--sm" {...perm("settings:edit")}>Save company</NotBuilt>
              </div>
            </form>
          </section>
          <section className="card" id="hours">
            <div className="card__header"><h3 className="card__title">Working hours and leave</h3></div>
            <div>
              <div className="setting-row">
                <div className="setting-row__text">
                  <strong>Shifts and late-mark rules</strong>
                  <span>Timings, grace period and half-day rules live on their own page</span>
                </div>
                <div className="setting-row__control"><Link to={pageUrl("attendance/shifts.html")} className="btn btn--sm">Open shifts</Link></div>
              </div>
              <div className="setting-row">
                <div className="setting-row__text"><strong>Week starts on</strong><span>Used by calendars and weekly reports</span></div>
                <div className="setting-row__control">
                  <select className="select select--sm" aria-label="Week starts on"><option>Monday</option><option>Sunday</option></select>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-row__text"><strong>Leave year</strong><span>When leave balances reset</span></div>
                <div className="setting-row__control">
                  <select className="select select--sm" aria-label="Leave year"><option>January to December</option><option>April to March</option></select>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-row__text"><strong>Carry forward unused leave</strong><span>Up to 5 days of casual leave</span></div>
                <div className="setting-row__control">
                  <label className="switch"><input type="checkbox" aria-label="Carry forward unused leave" defaultChecked /></label>
                </div>
              </div>
            </div>
          </section>
          <section className="card" id="security">
            <div className="card__header"><h3 className="card__title">Security</h3></div>
            <div>
              <div className="setting-row">
                <div className="setting-row__text">
                  <strong>Two-factor sign-in for sensitive roles</strong>
                  <span>Not enforced yet: every role, Admin, HR and Finance included, signs in without a code.</span>
                </div>
                <div className="setting-row__control">
                  <label className="switch"><input type="checkbox" aria-label="Two-factor sign-in for sensitive roles" disabled /></label>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-row__text">
                  <strong>
                    {"Sign out after being idle "}
                    <span className="tooltip"><button className="info-dot" type="button" aria-label="About idle sign-out">i</button><span className="tooltip__text" role="tooltip">People are signed out after this long without any activity.</span></span>
                  </strong>
                  {" "}
                  <span>Protects screens left open</span>
                </div>
                <div className="setting-row__control">
                  <select defaultValue="30 minutes" className="select select--sm" aria-label="Idle sign-out">
                    <option>15 minutes</option>
                    <option>30 minutes</option>
                    <option>60 minutes</option>
                  </select>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-row__text">
                  <strong>Minimum password length</strong>
                  <span>Also needs upper case, lower case, a number and a symbol</span>
                </div>
                <div className="setting-row__control"><input className="input input--sm" type="number" min="8" defaultValue="12" aria-label="Minimum password length" /></div>
              </div>
              <div className="setting-row">
                <div className="setting-row__text"><strong>Ask for a new password every</strong><span>Reminders start 7 days before</span></div>
                <div className="setting-row__control">
                  <select defaultValue="90 days" className="select select--sm" aria-label="Password expiry"><option>Never</option><option>90 days</option><option>180 days</option></select>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-row__text"><strong>Lock an account after failed sign-ins</strong><span>Unlocked by HR or an Admin</span></div>
                <div className="setting-row__control">
                  <select defaultValue="5 attempts" className="select select--sm" aria-label="Failed sign-in limit">
                    <option>3 attempts</option>
                    <option>5 attempts</option>
                    <option>10 attempts</option>
                  </select>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-row__text">
                  <strong>Payroll only from the office network</strong>
                  <span>Not built yet: nothing checks which network a page is opened from</span>
                </div>
                <div className="setting-row__control">
                  <label className="switch"><input type="checkbox" aria-label="Payroll only from the office network" disabled /></label>
                </div>
              </div>
            </div>
            <div className="card__footer">
              <span className="card__meta">Changes apply the next time each person signs in.</span>
              {" "}
              <NotBuilt what="Save security" className="btn btn--primary btn--sm" {...perm("settings:edit")}>Save security</NotBuilt>
            </div>
          </section>
          <section className="card" id="modules">
            <div className="card__header">
              <h3 className="card__title">Modules</h3>
              {" "}
              <span className="card__meta">Switched off modules disappear for everyone</span>
            </div>
            <div>
              <div className="setting-row">
                <div className="setting-row__text"><strong>Payroll</strong><span>Salary structure, payroll runs and payslips</span><Reason id="reason-payroll" text="Always on" /></div>
                <div className="setting-row__control">
                  <label className="switch"><input type="checkbox" aria-label="Payroll module" defaultChecked disabled aria-describedby="reason-payroll" /></label>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-row__text"><strong>Inventory and assets</strong><span>Items, stock, vendors and asset assignment</span></div>
                <div className="setting-row__control">
                  <label className="switch"><input type="checkbox" aria-label="Inventory module" defaultChecked /></label>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-row__text"><strong>Recruitment</strong><span>Job openings and candidates</span></div>
                <div className="setting-row__control">
                  <label className="switch"><input type="checkbox" aria-label="Recruitment module" defaultChecked /></label>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-row__text"><strong>Expenses</strong><span>Claims and reimbursements</span><Reason id="reason-expenses" text="Always on" /></div>
                <div className="setting-row__control">
                  <label className="switch"><input type="checkbox" aria-label="Expenses module" defaultChecked disabled aria-describedby="reason-expenses" /></label>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-row__text"><strong>Announcements</strong><span>Company news and notices</span></div>
                <div className="setting-row__control">
                  <label className="switch"><input type="checkbox" aria-label="Announcements module" defaultChecked /></label>
                </div>
              </div>
            </div>
          </section>
          <section className="card" id="appearance">
            <div className="card__header"><h3 className="card__title">Appearance</h3></div>
            <div className="card__body">
              <p className="form-label mb-2">Theme on this device</p>
              <div className="choice-grid" role="radiogroup" aria-label="Theme on this device">
                <label className="choice"><input type="radio" name="theme" value="light" checked={chosen === "light"} onChange={() => setChosen("light")} /><span className="choice__title">Light</span><span className="choice__meta">Bright background</span></label>
                {" "}
                <label className="choice">
                  <input type="radio" name="theme" value="dark" checked={chosen === "dark"} onChange={() => setChosen("dark")} />
                  <span className="choice__title">Dark</span>
                  <span className="choice__meta">Easier on the eyes at night</span>
                </label>
                {" "}
                <label className="choice">
                  <input type="radio" name="theme" value="system" checked={chosen === "system"} onChange={() => setChosen("system")} />
                  <span className="choice__title">Match the device</span>
                  <span className="choice__meta">Follows this device's setting</span>
                </label>
              </div>
            </div>
            <Table bare pager={false} columns={T1_COLUMNS} rows={T1_ROWS(perm)} rowKey={(r) => r.key} rowProps={(r) => r.r ?? {}} empty={null} />
            <div className="card__footer">
              <span className="card__meta">Each role's accent colour is set from its role, unless someone picks their own in the Appearance menu.</span>
              {" "}
              <button className="btn btn--primary btn--sm" type="button" {...perm("settings:edit")} id="save-appearance" onClick={() => { applyTheme(chosen); showToast("Appearance saved.", "success"); }}>Save appearance</button>
            </div>
          </section>
        </div>
      </div>
    </Frame>
  );
}

// table 1
const T1_COLUMNS = [
  { key: "c0", label: "Role", render: (r) => r.c[0], cellProps: (r) => r.p[0] },
  { key: "c1", label: "Accent colour", render: (r) => r.c[1], cellProps: (r) => r.p[1] },
  { key: "c2", label: "Colour code", render: (r) => r.c[2], cellProps: (r) => r.p[2] },
];
const T1_ROWS = (perm) => [
  { key: 0, c: [<><span className="table__user-name">Admin</span></>, <><span className="swatch swatch--admin" />Indigo</>, <><code>#4F46E5</code></>], p: [{}, {}, {}] },
  { key: 1, c: [<><span className="table__user-name">HR</span></>, <><span className="swatch swatch--hr" />Teal</>, <><code>#0F766E</code></>], p: [{}, {}, {}] },
  { key: 2, c: [<><span className="table__user-name">Finance</span></>, <><span className="swatch swatch--fin" />Amber brown</>, <><code>#B45309</code></>], p: [{}, {}, {}] },
  { key: 3, c: [<><span className="table__user-name">Employee</span></>, <><span className="swatch swatch--emp" />Blue</>, <><code>#2563EB</code></>], p: [{}, {}, {}] },
];
