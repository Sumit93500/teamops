// A role (pages/access/role-editor.html + assets/js/pages/role-editor.js), ported (round 16): the role named in ?role=
// (admin | hr | fin | emp; "Role not found" for none, or a name that isn't a role), from config/roles.js, config/permissions.js
// and the employee list: its details, who holds it (inactive people included), and every permission in the app by module,
// ticked where the role has it. Nothing is editable. The matrix is drawn from PERMISSIONS, so a new permission shows here
// with no change to this page; a module the groups don't name shows under "Other". Components: EmptyState.
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ROLES } from "../../../assets/js/config/roles.js";
import { PERMISSIONS, ALL_PERMISSIONS } from "../../../assets/js/config/permissions.js";
import { getAllUsers } from "../../../assets/js/data/store.js";
import { initials, avatarClass, plural } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import { EmptyState } from "../components/Basics.jsx";
import { useData } from "../data/hooks.js";
import { pageUrl } from "../routes.js";

const PAGE = "access/role-editor.html";
// How the matrix groups modules, and their names (role-editor.js GROUPS).
const GROUPS = [
  ["Overview", { dashboard: "Dashboard", announcements: "Announcements" }],
  ["People", { users: "Users", pii: "Personal details (bank account, PAN)", departments: "Departments", roles: "Roles & permissions", designations: "Designations", recruitment: "Recruitment" }],
  ["Time", { attendance: "Attendance", leave: "Leave", "leave-policy": "Leave policy", holidays: "Holidays", shifts: "Shifts" }],   // P4: leave-policy
  ["Requests & approvals", { approvals: "Approvals", requests: "Requests", workflows: "Approval workflows", delegation: "Delegation" }],
  ["Finance", { payroll: "Payroll", payslips: "Everyone's payslips", payslip: "Own payslip", salary: "Salaries", "payroll-rules": "Pay rates and rules", expenses: "Expenses", tax: "Tax" }],   // P4: payroll-rules
  ["Operations", { inventory: "Inventory", assets: "Assets", vendors: "Vendors" }],
  ["Offices & locations", { offices: "Offices", company: "Company profile", locations: "Home locations", devices: "Devices" }],   // L0
  ["System", { reports: "Reports", audit: "Audit log", settings: "Settings", backup: "Backup" }],
  ["Your own account", { profile: "Profile", password: "Password", sessions: "Sessions", notifications: "Notifications" }],
];
const ROLES_LIST = pageUrl("access/roles-list.html");

function matrixGroups() {
  const named = new Set(GROUPS.flatMap(([, modules]) => Object.keys(modules)));
  const other = Object.fromEntries(Object.keys(PERMISSIONS).filter((m) => !named.has(m)).map((m) => [m, m]));
  return [...GROUPS, ["Other", other]]
    .map(([group, modules]) => [group, Object.entries(modules).filter(([module]) => Object.hasOwn(PERMISSIONS, module))])
    .filter(([, present]) => present.length);
}

function Tick({ role, module, action }) {
  const key = `${module}:${action}`;
  const held = role.permissions.includes(key);
  return (
    <span className={held ? "perm-tick" : "perm-tick perm-tick--off"} data-permission-key={key} title={key} aria-label={`${key}: ${held ? "yes" : "no"}`}>
      {held ? <span className="matrix__yes"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg></span> : <span className="matrix__no" />}
      <span>{action}</span>
    </span>
  );
}

function Holder({ user }) {
  return (
    <div className="list__item">
      <div className={avatarClass(user.id)}>{initials(user.name)}</div>
      <div className="list__content">
        <Link className="list__title link" to={`${pageUrl("users/user-profile.html")}?id=${encodeURIComponent(user.id)}`}>{user.name}</Link>
        <span className="list__sub">{user.status === "inactive" ? `${user.designation}, inactive` : user.designation}</span>
      </div>
    </div>
  );
}

export default function RoleEditor() {
  const asked = new URLSearchParams(useLocation().search).get("role") ?? "";
  const role = Object.hasOwn(ROLES, asked) ? ROLES[asked] : null;
  const holders = useData(() => (role ? getAllUsers().filter((u) => u.role === role.key) : []), [role?.key]);
  useEffect(() => { document.title = role ? `${role.label} | OfficeOS` : "Role not found | OfficeOS"; });

  const header = (
    <div className="page-header">
      <div>
        <ol className="breadcrumb mb-2" aria-label="Breadcrumb">
          <li className="breadcrumb__item"><Link to={ROLES_LIST}>Roles &amp; permissions</Link></li>
          <li className="breadcrumb__item" aria-current="page" id="role-crumb">{role ? role.label : "Not found"}</li>
        </ol>
        <h1 id="role-title">{role ? role.label : "Role"}</h1>
        <p className="page-header__subtitle" id="role-subtitle">{role ? `System role, held by ${plural(holders.length, "person", "people")}` : ""}</p>
      </div>
      <div className="page-header__actions"><Link to={ROLES_LIST} className="btn">All roles</Link></div>
    </div>
  );
  if (!role) {   // no role, or not one of ours (Round Forms): a plain message and the way back, where the role was
    return (
      <Frame page={PAGE}>
        {header}
        <div className="stack">
          <section className="card">
            <EmptyState title="Role not found" text={asked ? `There's no role called "${asked}". The link may be wrong.` : "This link doesn't name a role."} to={ROLES_LIST} linkText="All roles" />
          </section>
        </div>
      </Frame>
    );
  }
  return (
    <Frame page={PAGE}>
      {header}
      <div className="stack">
        <div className="alert alert--info">Roles are set in the app's configuration. This page shows what the role can do; it can't be changed here yet.</div>
        <div className="grid grid-main-aside">
          <section className="card">
            <div className="card__header"><h3 className="card__title">Role details</h3></div>
            <div className="card__body">
              <dl className="kv">
                <div className="kv__row"><dt>Key</dt><dd id="role-key">{role.key}</dd></div>
                <div className="kv__row"><dt>Type</dt><dd>System</dd></div>
                <div className="kv__row"><dt>Landing page after sign-in</dt><dd id="role-landing"><Link className="link" to={pageUrl(role.landing)}>{role.landing}</Link></dd></div>
                {/* the same wording as the profile pages' "Data scope" */}
                <div className="kv__row"><dt>Data scope</dt><dd id="role-scope">{role.scopeLabel}</dd></div>
              </dl>
            </div>
          </section>
          <aside className="stack">
            <section className="card">
              <div className="card__header"><h3 className="card__title">Users with this role</h3>{" "}<span className="card__meta" id="role-user-count">{String(holders.length)}</span></div>
              <div className="list" id="role-users">
                {holders.length ? holders.map((u) => <Holder key={u.id} user={u} />) : <div className="list__item text-muted">Nobody holds this role.</div>}
              </div>
              <div className="card__footer"><Link to={pageUrl("users/users-list.html")} className="link text-sm">Manage users</Link></div>
            </section>
          </aside>
        </div>
        <section className="card">
          <div className="card__header"><h3 className="card__title">Permissions</h3>{" "}<span className="card__meta" id="permission-count">{`${role.permissions.length} of ${ALL_PERMISSIONS.length}`}</span></div>
          <div className="matrix-note">
            {"Every permission in the app, by module. A tick means this role has it; each one is a permission key such as "}
            <code>users:view</code>
            .
          </div>
          <div className="table-wrap">
            <table className="matrix matrix--perms">
              <thead>
                <tr><th>Module</th><th className="matrix__actions">Permissions</th></tr>
              </thead>
              <tbody id="matrix-rows">
                {matrixGroups().flatMap(([group, present]) => [
                  <tr className="matrix__group" key={group}><td colSpan={2}>{group}</td></tr>,
                  ...present.map(([module, name]) => (
                    <tr key={module}>
                      <td><span className="matrix__module-name">{name}</span><span className="matrix__module-desc">{module}</span></td>
                      <td className="matrix__actions"><div className="perm-ticks">{PERMISSIONS[module].map((a) => <Tick key={a} role={role} module={module} action={a} />)}</div></td>
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Frame>
  );
}
