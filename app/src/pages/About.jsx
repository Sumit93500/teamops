// About (D2a): the app's own page, not one of the old 55, at /pages/company/about.html; the company's name in the shell links
// here. Anyone signed in may open it (signed out: sign-in, as every other page). Read-only:
//   - the company's details: data/company.js, the Settings page's own source (sample values until settings are stored);
//   - live counts from the store: active employees and departments;
//   - Overview and Mission: the company profile's (L1: Settings' Company profile saves them), "Not added yet." while empty;
//   - Offices: the active offices (name, type, state, address), with a link to the Offices page (L1).
// Nothing here is invented: every figure is the store's, every detail the Settings page's.
import { useEffect, useLayoutEffect } from "react";
import { Navigate } from "react-router-dom";
import { activeHeadcount, getAllDepartments } from "../../../assets/js/data/store.js";
import { useData, useSession, signOutNow } from "../data/hooks.js";
import { COMPANY, tabTitle } from "../data/company.js";
import { pageUrl, ABOUT, OFFICES } from "../routes.js";
import { Link } from "react-router-dom";
import { getCompanyProfile } from "../../../assets/js/data/company-store.js";
import { getOffices } from "../../../assets/js/data/offices-store.js";
import { Icon } from "../components/icons.jsx";
import Shell from "../shell/Shell.jsx";
import { PageHeader, Card, HeroCard, KpiCard, Pill } from "../components/Layout.jsx";
import { ICON } from "../components/icons.jsx";

const NOT_ADDED = "Not added yet.";
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function Details() {
  const rows = [
    ["Company name", COMPANY.name], ["Address", COMPANY.address], ["Time zone", COMPANY.timeZone],
    ["Currency", COMPANY.currency], ["Financial year starts in", COMPANY.financialYearStarts], ["Employee ID prefix", COMPANY.employeeIdPrefix],
  ];
  return (
    <dl className="about__details">
      {rows.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}
    </dl>
  );
}

function Content() {
  const headcount = useData(() => activeHeadcount());
  const departments = useData(() => getAllDepartments().length);
  const profile = useData(() => getCompanyProfile());
  const offices = useData(() => getOffices());
  return (
    <>
      <PageHeader title="About" subtitle={COMPANY.name} breadcrumb={[{ label: "Company" }, { label: "About" }]} />
      <div className="ds-stack">
        <HeroCard icon={ICON.building} title={COMPANY.name}
          pills={[{ label: COMPANY.timeZone, icon: ICON.clock }, { label: COMPANY.currency }, { label: `Financial year starts in ${COMPANY.financialYearStarts}`, icon: ICON.calendar }]}
          value={plural(headcount, "employee", "employees")} caption={`Active today, across ${plural(departments, "department", "departments")}`} />
        <div className="ds-grid" aria-label="Live counts" role="group">
          <KpiCard id="employees" label="Employees" value={String(headcount)} icon={ICON.users} />
          <KpiCard id="departments" label="Departments" value={String(departments)} icon={ICON.layers} />
          <KpiCard id="offices" label="Offices" value={String(offices.length)} icon={ICON.building} />
        </div>
        <div className="about__grid">
          <Card id="about-company" title="Company details" meta="From Settings"
            footer="The name, overview and mission are saved in Settings; the other details are the Settings page's sample values.">
            <Details />
          </Card>
          <div className="ds-stack">
            <Card id="about-overview" title="Overview">{profile.overview ? <p className="about__text">{profile.overview}</p> : <p className="about__empty">{NOT_ADDED}</p>}</Card>
            <Card id="about-mission" title="Mission">{profile.mission ? <p className="about__text">{profile.mission}</p> : <p className="about__empty">{NOT_ADDED}</p>}</Card>
            <Card id="about-offices" title="Offices" meta={plural(offices.length, "office", "offices")} actions={<Link className="ds-btn ds-btn--sm" to={pageUrl(OFFICES)}><Icon d={ICON.map} />All offices</Link>}>
              {offices.length ? (
                <ul className="about__offices">
                  {offices.map((o) => (
                    <li key={o.id} data-office={o.id}>
                      <strong>{o.name}</strong> <Pill tone={o.type === "head" ? "info" : ""}>{o.type === "head" ? "Head office" : "Branch"}</Pill>
                      <span className="about__office-line">{[o.state ?? "State not set", o.address].join(" · ")}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="about__empty">No offices yet.</p>}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export default function About() {
  const { session, user, role } = useSession();
  const stale = session && !user;
  useEffect(() => { if (stale) signOutNow(); }, [stale]);
  useLayoutEffect(() => { document.documentElement.dataset.role = role?.key ?? "admin"; }, [role]);
  useLayoutEffect(() => { document.title = tabTitle("About"); window.scrollTo(0, 0); }, []);
  if (!session || !user) return <Navigate to={pageUrl("auth/login.html")} replace />;
  return <Shell page={ABOUT} title="About"><Content /></Shell>;
}