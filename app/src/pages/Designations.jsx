// Designations (pages/access/designations.html, a sample page until now), rebuilt from real data (round 16, the 14E4 queue):
// every job title in data/users.js DESIGNATIONS, with its department and default role (config/roles.js), and how many people
// hold it now (from the employee list, inactive people left out: they have left), plus any title someone holds that the
// list doesn't have. The department filter works on the store's departments. Adding or editing a designation needs a store
// write, which isn't built: those stay "isn't available in this demo", as before. The Add form lists the store's active
// departments, and the roles the person may grant (only an Admin may give the Admin role, store.js carriesAdmin).
// Components: Table, Badge, NotBuilt.
import { useState } from "react";
import { Link } from "react-router-dom";
import { DESIGNATIONS } from "../../../assets/js/data/users.js";
import { getAllUsers, getAllDepartments } from "../../../assets/js/data/store.js";
import { ROLES } from "../../../assets/js/config/roles.js";
import { departmentName } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { Badge, NotBuilt } from "../components/Basics.jsx";
import { useData, useSession } from "../data/hooks.js";
import { usePerm } from "../ui/perm.js";
import { pageUrl } from "../routes.js";

const PAGE = "access/designations.html";
const ROLE_ORDER = ["emp", "hr", "fin", "admin"];

function designations(users) {
  const holding = users.filter((u) => u.status !== "inactive");
  const known = DESIGNATIONS.map((d) => ({ ...d, count: holding.filter((u) => u.designation === d.title).length }));
  // a title someone holds that the list doesn't have (user-form keeps an edited person's old title): their department, no default role
  const extra = [...new Set(holding.map((u) => u.designation).filter((t) => t && !DESIGNATIONS.some((d) => d.title === t)))]
    .map((title) => ({ title, department: holding.find((u) => u.designation === title).department, defaultRole: null, count: holding.filter((u) => u.designation === title).length }));
  return [...known, ...extra];
}

export default function Designations() {
  const perm = usePerm();
  const { role } = useSession();
  const [dept, setDept] = useState("");
  const d = useData(() => ({ rows: designations(getAllUsers()), departments: getAllDepartments() }), []);
  const rows = dept ? d.rows.filter((r) => r.department === dept) : d.rows;
  const grantable = ROLE_ORDER.filter((key) => ROLES[key] && (key !== "admin" || role?.key === "admin"));
  const columns = [
    { key: "title", label: "Designation", render: (r) => <span className="table__user-name">{r.title}</span> },
    { key: "department", label: "Department", render: (r) => departmentName(r.department) },
    { key: "role", label: "Default role", render: (r) => (r.defaultRole ? <Badge tone="primary">{ROLES[r.defaultRole]?.label ?? r.defaultRole}</Badge> : <span className="text-muted">None</span>) },
    { key: "count", label: "Employees", num: true, render: (r) => String(r.count) },
    { key: "actions", label: "Actions", actions: true, render: () => <NotBuilt what="Edit" className="btn btn--sm" {...perm("designations:edit")} /> },
  ];

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Designations</h1>
          <p className="page-header__subtitle">Job titles and the default role each one gets.</p>
        </div>
        <div className="page-header__actions">
          <Link to={pageUrl("access/roles-list.html")} className="btn" {...perm("roles:manage")}>Manage roles</Link>
        </div>
      </div>
      <div className="alert alert--info mb-4">The job titles, their default roles and who holds them are the app's own. Adding or editing a designation isn't built yet.</div>
      <div className="grid grid-main-aside">
        <section className="card">
          <div className="table__toolbar">
            <h3 className="card__title">All designations</h3>
            <select className="select select--sm" aria-label="Filter by department" value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="">All departments</option>
              {d.departments.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
            </select>
          </div>
          <Table bare pager={false} columns={columns} rows={rows} rowKey={(r) => r.title} empty="No designations in this department." />
        </section>
        <aside className="stack aside-sticky">
          <section className="card">
            <div className="card__header"><h3 className="card__title">Add designation</h3></div>
            <div className="card__body">
              <form className="form" onSubmit={(e) => e.preventDefault()}>
                <div className="form-field">
                  <label className="form-label form-label--required" htmlFor="d-title">Designation title</label>
                  <input className="input" id="d-title" type="text" placeholder="e.g. Business Analyst" required />
                </div>
                <div className="form-field">
                  <label className="form-label form-label--required" htmlFor="d-dept">Department</label>
                  <select className="select" id="d-dept" required defaultValue="">
                    <option value="">Select department</option>
                    {d.departments.filter((x) => x.active !== false).map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label form-label--required" htmlFor="d-role">Default role</label>
                  <select className="select" id="d-role" required defaultValue="">
                    <option value="">Select role</option>
                    {grantable.map((key) => <option key={key} value={key}>{ROLES[key].label}</option>)}
                  </select>
                  <span className="form-hint">New employees with this title get this role automatically.</span>
                </div>
                <NotBuilt what="Add designation" className="btn btn--primary btn--block" {...perm("designations:create")} />
              </form>
            </div>
          </section>
          <div className="alert alert--info">HR can only pick roles that HR is allowed to grant. Admin roles need an Admin.</div>
        </aside>
      </div>
    </Frame>
  );
}
