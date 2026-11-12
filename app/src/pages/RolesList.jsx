// Roles & permissions (pages/access/roles-list.html + assets/js/pages/roles-list.js), ported (round 16): the app's four roles
// from config/roles.js, each with how many people hold it (inactive people included: they still hold it) and how many of the
// app's permissions it has, and View into the role editor. Nothing is editable: roles come from the configuration. The
// search box hides the rows whose text doesn't have it, as ui/table-filter.js did (no "No matches." row). Components: Table, Badge.
import { useState } from "react";
import { Link } from "react-router-dom";
import { ROLES } from "../../../assets/js/config/roles.js";
import { ALL_PERMISSIONS } from "../../../assets/js/config/permissions.js";
import { getAllUsers } from "../../../assets/js/data/store.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { Badge, NotBuilt } from "../components/Basics.jsx";
import { useData } from "../data/hooks.js";
import { usePerm } from "../ui/perm.js";
import { pageUrl } from "../routes.js";

const PAGE = "access/roles-list.html";
// The rows' order and descriptions, as the old page's HTML had them.
const ROWS = [
  ["admin", "Full access to everything, including roles and backup"],
  ["hr", "People operations, leave and attendance"],
  ["fin", "Payroll, expenses and financial reports"],
  ["emp", "Own attendance, leave, payslips, requests and expense claims"],
];
const LOCK = "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4";
const PLUS = "M12 5v14M5 12h14";
const SEARCH = <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
const Icon = ({ d }) => <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;

export default function RolesList() {
  const perm = usePerm();
  const [query, setQuery] = useState("");
  const users = useData(() => getAllUsers(), []);
  const total = ALL_PERMISSIONS.length;
  const rows = ROWS.filter(([key]) => ROLES[key]).map(([key, description]) => {
    const role = ROLES[key];
    return { key, label: role.label, description, users: users.filter((u) => u.role === key).length, n: role.permissions.length };
  });
  // the row's text as table-filter.js read it (textContent: the cells' words run together)
  const rowText = (r) => [`${r.label}${r.key}`, r.description, String(r.users), `${r.n} / ${total}`, "System", "View"].join("\n").toLowerCase();
  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => rowText(r).includes(q)) : rows;
  const columns = [
    { key: "role", label: "Role", render: (r) => (
      <div className="role-name">
        <span className="role-name__icon role-name__icon--system"><Icon d={LOCK} /></span>
        <div><span className="table__user-name">{r.label}</span><span className="table__user-sub">{r.key}</span></div>
      </div>
    ) },
    { key: "description", label: "Description", className: "text-muted", render: (r) => r.description },
    { key: "users", label: "Users", render: (r) => String(r.users), cellProps: () => ({ "data-cell": "users" }) },
    { key: "permissions", label: "Permissions", cellProps: () => ({ "data-cell": "permissions" }), render: (r) => (
      <div className="meter-cell">
        <span className="meter"><span className="meter__fill" style={{ "--w": `${Math.round((r.n / total) * 100)}%` }} /></span>
        <span className="text-sm text-muted">{`${r.n} / ${total}`}</span>
      </div>
    ) },
    { key: "type", label: "Type", render: () => <Badge tone="info" square>System</Badge> },
    { key: "actions", label: "Actions", actions: true, render: (r) => <Link className="btn btn--sm" to={`${pageUrl("access/role-editor.html")}?role=${r.key}`}>View</Link> },
  ];

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Roles &amp; permissions</h1>
          <p className="page-header__subtitle">Control what each role can see and do.</p>
        </div>
        <div className="page-header__actions">
          <Link to={pageUrl("access/designations.html")} className="btn">Designations</Link>
          {" "}
          <NotBuilt what="Create role" className="btn btn--primary" {...perm("roles:manage")}><Icon d={PLUS} />{" "}Create role</NotBuilt>
        </div>
      </div>
      <div className="stack">
        <div className="alert alert--info">These are the app's four roles, set in its configuration. They can't be deleted, and custom roles can't be created yet.</div>
        <section className="card">
          <div className="table__toolbar">
            <h3 className="card__title">All roles</h3>
            <div className="input-group">
              {SEARCH}
              {" "}
              <input className="input input--sm input--search" type="search" placeholder="Search roles" aria-label="Search roles" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
          <Table bare pager={false} columns={columns} rows={shown} rowKey={(r) => r.key} rowProps={(r) => ({ "data-role": r.key })} empty={null} />
        </section>
      </div>
    </Frame>
  );
}
