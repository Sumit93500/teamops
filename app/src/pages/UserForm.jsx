// users/user-form.html (L1), built in the design system. What the old page (pages/user-form.js) does, in its words:
// Add employee, or Edit employee with ?id= ("Employee not found" for an id that isn't one); dropdowns from live data
// (departments, designations: one carrying the Admin role only for an Admin, managers by id: active people but the
// employee); the default role follows the designation; Access summary and Effective permissions follow every change;
// permission overrides (round 11R: Admin only, not on your own record, nothing for an Admin); Account active only when
// editing; saving through addUser / updateUser, the email's error at the field, any other in a toast; "Employee saved."
// then the list. New (L1): the employee's Office (offices:manage, Admin) and whether they may check in from home
// (users:edit, HR / Admin), both saved after the employee.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getUser, getAllUsers, addUser, updateUser, peekNextId, getAllDepartments } from "../../../assets/js/data/store.js";
import { DESIGNATIONS } from "../../../assets/js/data/users.js";
import { ROLES, OVERRIDABLE, overridesOf, permissionsOf } from "../../../assets/js/config/roles.js";
import { ALL_PERMISSIONS } from "../../../assets/js/config/permissions.js";
import { approvalChainFor } from "../../../assets/js/data/leave-store.js";
import { getOffices, officeIdOf, setEmployeeOffice } from "../../../assets/js/data/offices-store.js";
import { isHomeEligible, setHomeEligible } from "../../../assets/js/data/locations-store.js";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { tabTitle } from "../data/company.js";
import { pageUrl } from "../routes.js";
import Frame from "../ui/Frame.jsx";
import { useToast } from "../ui/Toast.jsx";
import { EmptyState, NotBuilt } from "../components/Basics.jsx";
import { PageHeader, Card, Pill } from "../components/Layout.jsx";
import { Field, Input, Select, Switch, Kv, initialsOf } from "../components/Form.jsx";

const PAGE = "users/user-form.html";
const LIST = pageUrl("users/users-list.html");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const toInputDate = (text) => {
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const m = String(text).match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  return month === -1 ? "" : `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
};
const toDisplayDate = (iso) => { const m = String(iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : ""; };
const withValue = (list, value, label = value) => (value && !list.some((o) => o[0] === value) ? [...list, [value, label]] : list);
export const OVERRIDES_HINT = "Applied on top of the default role, everywhere the app checks: extra permissions are added, denied ones taken away. Only an Admin can change them, and not on their own record. Approvals, dashboards, Admin-only powers, managing people and everyone's own pages stay with the role.";

function Form({ editing, editId }) {
  const { role, userId } = useSession();
  const byRole = role?.key;
  const toast = useToast();
  const navigate = useNavigate();
  const canCreate = useCan("users:create"), canManageOffices = useCan("offices:manage"), canEditPeople = useCan("users:edit");
  const departments = useData(() => getAllDepartments());
  const users = useData(() => getAllUsers());
  const offices = useData(() => getOffices());
  const [first, ...rest] = String(editing?.name ?? "").split(" ");
  const managerKey0 = editing ? editing.reportingManagerId ?? (editing.reportingManager ? `name:${editing.reportingManager}` : "") : "";
  const [f, setF] = useState(() => ({
    first: editing ? first : "", last: editing ? rest.join(" ") : "", email: editing?.email ?? "", phone: editing?.phone ?? "", dob: editing?.dob ?? "",
    bank: editing?.bankAccount ?? "", pan: editing?.pan ?? "", department: editing?.department ?? "", designation: editing?.designation ?? "",
    manager: managerKey0, joining: toInputDate(editing?.dateOfJoining), empType: editing?.employmentType || "Full-time", location: editing?.location || "Gurugram office",
    active: editing ? editing.status !== "inactive" : true,
    office: editing ? officeIdOf(editing.id) : officeIdOf(null), home: editing ? isHomeEligible(editing.id) : false,
  }));
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v && v.target ? v.target.value : v }));
  const [ticked, setTicked] = useState(() => ({ grant: new Set(overridesOf(editing).grants), deny: new Set(overridesOf(editing).denies) }));
  const [emailError, setEmailError] = useState(null);
  const [saving, setSaving] = useState(false);

  const deptOptions = withValue(departments.map((d) => [d.code, d.name]), editing?.department);
  const designations = DESIGNATIONS.filter((d) => d.defaultRole !== "admin" || byRole === "admin");
  const designationOptions = withValue(designations.map((d) => [d.title, d.title]), editing?.designation);
  const managerOptions = withValue(users.filter((u) => u.status === "active" && u.id !== editId).map((u) => [u.id, u.name]), managerKey0,
    getUser(editing?.reportingManagerId)?.name ?? editing?.reportingManager);
  const empTypes = withValue([["Full-time", "Full-time"], ["Contract", "Contract"], ["Intern", "Intern"]], editing?.employmentType);
  const locations = withValue([["Gurugram office", "Gurugram office"], ["Remote", "Remote"]], editing?.location);

  // The role saving would store: the designation's default role, else the employee's current one, else Employee.
  const roleOnSave = DESIGNATIONS.find((d) => d.title === f.designation)?.defaultRole ?? editing?.role ?? "emp";
  const lock = byRole !== "admin" ? "Only an Admin can change permission overrides." : editing && editing.id === userId ? "You can't change your own permission overrides."
    : roleOnSave === "admin" ? "An Admin holds every permission, so there's nothing to grant or deny." : "";
  const offered = (name) => (roleOnSave === "admin" ? [] : OVERRIDABLE.filter((p) => (ROLES[roleOnSave]?.permissions ?? []).includes(p) === (name === "deny")));
  const offeredTicked = (name) => offered(name).filter((p) => ticked[name].has(p));
  const effective = permissionsOf({ role: roleOnSave, grantPermissions: offeredTicked("grant"), denyPermissions: offeredTicked("deny") });
  const held = ROLES[roleOnSave]?.permissions ?? [];
  const chain = useMemo(() => approvalChainFor({ id: editing?.id ?? null, role: roleOnSave, reportingManagerId: f.manager.startsWith("name:") ? null : f.manager || null }), [editing, roleOnSave, f.manager]);
  const toggle = (name, perm) => setTicked((t) => { const next = new Set(t[name]); if (next.has(perm)) next.delete(perm); else next.add(perm); return { ...t, [name]: next }; });

  const save = (e) => {
    e.preventDefault();
    setEmailError(null);
    let status = editing?.status ?? "active";
    if (editing) status = f.active ? (status === "inactive" ? "active" : status) : "inactive";
    const account = f.bank.trim().replace(/\s+/g, " "), digits = account.replace(/\D/g, "");
    const manager = f.manager.startsWith("name:") ? { reportingManager: f.manager.slice(5) }
      : { reportingManagerId: f.manager || null, reportingManager: f.manager ? (managerOptions.find((o) => o[0] === f.manager)?.[1] ?? "") : "" };
    const overrides = byRole !== "admin" || (editing && editing.id === userId) ? {} : { grantPermissions: offeredTicked("grant"), denyPermissions: offeredTicked("deny") };
    const record = {
      name: `${f.first.trim()} ${f.last.trim()}`, email: f.email.trim(), department: f.department, designation: f.designation, role: roleOnSave, status,
      phone: f.phone.trim(), dob: f.dob, dateOfJoining: toDisplayDate(f.joining), employmentType: f.empType, location: f.location,
      ...manager, ...overrides, bankAccount: account || null, bankAccountLast4: digits ? digits.slice(-4) : null, pan: f.pan.trim().toUpperCase() || null,
    };
    const result = editing ? updateUser(userId, editing.id, record) : addUser(userId, record);
    if (!result.ok) {
      if (result.field === "email") setEmailError(result.error);
      else toast(result.error, "danger");
      return;
    }
    // L1: the office and home check-in, after the employee (each by its own permission; unchanged ones aren't sent)
    const id = result.record.id;
    if (canManageOffices && f.office && f.office !== officeIdOf(id)) setEmployeeOffice(userId, id, f.office);
    if (canEditPeople && f.home !== isHomeEligible(id)) setHomeEligible(userId, id, f.home);
    bump();
    setSaving(true);
    toast("Employee saved.", "success");
    setTimeout(() => navigate(LIST), 1200);
  };

  return (
    <div className="ds-two-col">
      <Card id="user-form-card">
        <form className="ds-form" onSubmit={save} id="user-form">
          <section className="ds-form-section" aria-labelledby="s-personal">
            <div><h3 className="ds-form-section__title" id="s-personal">Personal details</h3><p className="ds-form-section__desc">Basic information about the employee.</p></div>
            <div className="ds-person">
              <span className="ds-avatar ds-avatar--xl" aria-hidden="true">{initialsOf(editing?.name ?? `${f.first} ${f.last}`.trim())}</span>
              <div className="ds-stack" style={{ gap: 6 }}>
                <NotBuilt what="Upload photo" className="ds-btn ds-btn--sm">Upload photo</NotBuilt>
                <p className="ds-hint">JPG or PNG, up to 2 MB.</p>
              </div>
            </div>
            <div className="ds-form-grid">
              <Field id="first-name" label="First name" required><Input id="first-name" type="text" placeholder="Sneha" required value={f.first} onChange={set("first")} /></Field>
              <Field id="last-name" label="Last name" required><Input id="last-name" type="text" placeholder="Rao" required value={f.last} onChange={set("last")} /></Field>
              <Field id="work-email" label="Work email" required error={emailError}><Input id="work-email" type="email" placeholder="name@northwind.com" required value={f.email} error={emailError} onChange={(e) => { set("email")(e); setEmailError(null); }} /></Field>
              <Field id="phone" label="Phone"><Input id="phone" type="tel" placeholder="+91 98765 43210" value={f.phone} onChange={set("phone")} /></Field>
              <Field id="dob" label="Date of birth"><Input id="dob" type="date" value={f.dob} onChange={set("dob")} /></Field>
              <Field id="emp-id" label="Employee ID" hint="Generated automatically."><Input id="emp-id" type="text" disabled value={editing ? editing.id : peekNextId()} hint="Generated automatically." /></Field>
              <Field id="bank-account" label="Bank account number"><Input id="bank-account" type="text" inputMode="numeric" autoComplete="off" placeholder="e.g. 9024 5713 7305" value={f.bank} onChange={set("bank")} /></Field>
              <Field id="pan" label="PAN"><Input id="pan" type="text" autoComplete="off" placeholder="ABCDE1234F" value={f.pan} onChange={set("pan")} /></Field>
            </div>
          </section>
          <section className="ds-form-section" aria-labelledby="s-employment">
            <div><h3 className="ds-form-section__title" id="s-employment">Employment</h3><p className="ds-form-section__desc">Where this person sits in the company.</p></div>
            <div className="ds-form-grid">
              <Field id="department" label="Department" required><Select id="department" required placeholder="Select department" options={deptOptions} value={f.department} onChange={set("department")} /></Field>
              <Field id="designation" label="Designation" required hint="The designation sets the default role."><Select id="designation" required placeholder="Select designation" options={designationOptions} value={f.designation} hint="The designation sets the default role." onChange={set("designation")} /></Field>
              <Field id="manager" label="Reporting manager"><Select id="manager" placeholder="No reporting manager" options={managerOptions} value={f.manager} onChange={set("manager")} /></Field>
              <Field id="joining" label="Date of joining"><Input id="joining" type="date" value={f.joining} onChange={set("joining")} /></Field>
              <Field id="emp-type" label="Employment type"><Select id="emp-type" options={empTypes} value={f.empType} onChange={set("empType")} /></Field>
              <Field id="location" label="Work location"><Select id="location" options={locations} value={f.location} onChange={set("location")} /></Field>
            </div>
          </section>
          <section className="ds-form-section" aria-labelledby="s-office">
            <div><h3 className="ds-form-section__title" id="s-office">Office and check-in places</h3><p className="ds-form-section__desc">Where this person checks in from.</p></div>
            <div className="ds-form-grid">
              <Field id="office" label="Office" hint={canManageOffices ? "Check-ins are measured from this office." : "Only an Admin can change someone's office."}>
                <Select id="office" disabled={!canManageOffices} options={offices.map((o) => [o.id, `${o.name}${o.state ? `, ${o.state}` : ""}`])} value={f.office ?? ""}
                  hint={canManageOffices ? "Check-ins are measured from this office." : "Only an Admin can change someone's office."} onChange={set("office")} />
              </Field>
              <div className="ds-field">
                <span className="ds-field__label">Home check-in</span>
                <Switch id="home-eligible" label="Can check in from home" checked={f.home} disabled={!canEditPeople} onChange={set("home")} describedBy="home-eligible-hint" />
                <span className="ds-field__helper" id="home-eligible-hint">{canEditPeople ? "They can then set a permanent and a temporary home once each; changes need an Admin's approval." : "Only HR or an Admin can change this."}</span>
              </div>
            </div>
          </section>
          <section className="ds-form-section" aria-labelledby="s-access">
            <div><h3 className="ds-form-section__title" id="s-access">Access</h3><p className="ds-form-section__desc">What this person can do in OfficeOS.</p></div>
            <div className="ds-form-grid">
              <Field id="default-role" label="Default role" hint="Comes from the designation. Change the designation to change this."><Input id="default-role" type="text" disabled value={ROLES[DESIGNATIONS.find((d) => d.title === f.designation)?.defaultRole]?.label ?? ""} hint="Comes from the designation. Change the designation to change this." /></Field>
            </div>
            <h4 className="ds-form-section__title">Permission overrides</h4>
            <p className="ds-hint">{OVERRIDES_HINT}</p>
            {lock && <p className="ds-note ds-note--warning" id="overrides-reason">{lock}</p>}
            {["grant", "deny"].map((name) => (
              <fieldset key={name} className="ds-field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="ds-field__label">{name === "grant" ? "Extra permissions" : "Denied permissions"}</legend>
                <div className="ds-checks" id={`${name}-options`}>
                  {offered(name).length ? offered(name).map((perm) => (
                    <label className="ds-check" key={perm} title={lock}>
                      <input type="checkbox" name={name} value={perm} checked={ticked[name].has(perm)} disabled={Boolean(lock)} onChange={() => toggle(name, perm)} />{perm}
                    </label>
                  )) : <span className="ds-hint">None</span>}
                </div>
              </fieldset>
            ))}
            {editing && (
              <div className="ds-field">
                <span className="ds-field__label">Account</span>
                <Switch id="account-active" label="Account active" checked={f.active} onChange={set("active")} />
              </div>
            )}
          </section>
          <div className="ds-form-actions">
            <span className="ds-hint">Fields marked * are required.</span>
            <div className="ds-form-actions__buttons">
              <Link className="ds-btn" to={LIST}>Cancel</Link>
              {canCreate && <button className="ds-btn ds-btn--primary" type="submit" disabled={saving}>{editing ? "Save changes" : "Save employee"}</button>}
            </div>
          </div>
        </form>
      </Card>
      <aside className="ds-stack">
        <Card id="access-summary" title="Access summary">
          <Kv rows={[["Designation", f.designation || "—"], ["Default role", <Pill tone="info">{ROLES[roleOnSave]?.label ?? roleOnSave}</Pill>],
            ["Data scope", ROLES[roleOnSave]?.scopeLabel ?? ROLES.emp.scopeLabel], ["Approval chain", chain], ["Two-factor sign-in", "Not recorded yet", { muted: true }]]} />
        </Card>
        <Card id="effective" title="Effective permissions" meta={<span id="effective-count">{String(effective.length)}</span>}
          footer="What the app checks: the default role's permissions, plus the extra ones, minus the denied ones. Updates as you change the designation or the overrides.">
          <div className="ds-chips" id="effective-permissions">
            {effective.length === ALL_PERMISSIONS.length ? <span className="ds-hint">{`Every permission (${effective.length})`}</span>
              : effective.map((p) => <span key={p} className={`ds-chip${held.includes(p) ? "" : " ds-chip--granted"}`} title={held.includes(p) ? undefined : "Granted to this person"}>{p}</span>)}
          </div>
        </Card>
      </aside>
    </div>
  );
}

function Content() {
  const [params] = useSearchParams();
  const editId = params.get("id");
  const editing = editId ? getUser(editId) : null;
  const notFound = Boolean(editId && !editing);
  const heading = editId ? "Edit employee" : "Add employee";
  // after the route's own title (RequireRoute's layout effect: the page's static title), as the old script set it on load
  useEffect(() => { document.title = tabTitle(notFound ? "Employee not found" : editing ? "Edit employee" : "Add employee"); });
  return (
    <>
      <PageHeader title={heading} subtitle={notFound ? null : "Create the account, choose a designation, and the role is set for you."}
        breadcrumb={[{ label: "Users", to: LIST }, { label: notFound ? "Not found" : heading }]} />
      {notFound
        ? <Card id="not-found"><EmptyState title="Employee not found" text={`There's no employee with ID ${editId}. They may have been deleted, or the link is wrong.`} to={LIST} linkText="Back to users" /></Card>
        : <Form key={editId ?? "new"} editing={editing} editId={editId} />}
    </>
  );
}

export default function UserForm() {
  return <Frame page={PAGE}><Content /></Frame>;
}