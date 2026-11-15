// Settings (pages/system/settings.html + assets/js/pages/settings.js), ported as it is (round 23): a sample page apart from
// the Appearance card, as its notice says. Written as JSX from the old page (tools/react/html2jsx.py), with what app.js and
// settings.js gave it: controls the person may not use hidden (perm), "isn't available in this demo" on the placeholders
// (NotBuilt), the role colours as Table; "Always on" under the Payroll and Expenses modules (round 14E part 2, the Reason
// line); a section link scrolls to its card and is marked; Appearance (A1): the Appearance page's panel (data/prefs.js, the
// same store as the header's menu): every choice applies and saves at once.
// The inventory settings (round 17, a data round) aren't built, so the page is as it was.
import { useState } from "react";
import { Link } from "react-router-dom";
import { AppearancePanel } from "./Appearance.jsx";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { NotBuilt, Reason } from "../components/Basics.jsx";
import { usePerm } from "../ui/perm.js";
import { pageUrl } from "../routes.js";
import { COMPANY } from "../data/company.js";   // D2a: the company's details live in one module, read by the shell and About too
import CompanyProfile from "./CompanyProfile.jsx";
import PayrollSettings from "./PayrollSettings.jsx";   // P4a: when the new statutory rules start, PF on full wages   // L1: the company profile (name, overview, mission), saved

const PAGE = "system/settings.html";

export default function Settings() {
  const perm = usePerm();
  const [section, setSection] = useState("company");
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
          <p className="page-header__subtitle">The company profile, payroll and appearance</p>
        </div>
        
      </div>
      <div className="settings">
        <nav className="settings__nav" aria-label="Settings sections">
          <a className={`settings__link${section === "company-profile" ? " is-active" : ""}`} href="#company-profile" onClick={go}>Company profile</a>
          {" "}
          <a className={`settings__link${section === "payroll-settings" ? " is-active" : ""}`} href="#payroll-settings" onClick={go}>Payroll</a>
          {" "}
          <a className={`settings__link${section === "appearance" ? " is-active" : ""}`} href="#appearance" onClick={go}>Appearance</a>
        </nav>
        <div className="stack">
          <CompanyProfile />
          <PayrollSettings />
          <section className="card" id="appearance">
            <div className="card__header"><h3 className="card__title">Appearance</h3></div>
            <div className="card__body">
              <AppearancePanel idPrefix="settings-ap" />
            </div>
            <Table bare pager={false} columns={T1_COLUMNS} rows={T1_ROWS(perm)} rowKey={(r) => r.key} rowProps={(r) => r.r ?? {}} empty={null} />
            <div className="card__footer">
              <span className="card__meta">Each role's accent colour is set from its role, unless someone picks their own accent here or in the Appearance menu.</span>
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
