// users/user-profile.html (L1), built in the design system. What the old page (pages/user-profile.js) does, in its words:
// the employee from ?id= ("Employee not found" otherwise); header (name, designation and department, role, status, id,
// Email, View attendance); Details (with a leaver's last working day and tenure, "(N days away)"); Sensitive details
// (masked, Reveal / Hide with pii:view, "Not on file"; the salary with salary:view); Access (approval chain; two-factor and
// last sign-in "Not recorded yet"); Permission overrides; Leave balance; Assets; Recent activity ("No recent activity").
// Actions: Reset password (a toast: nothing is sent), Edit, Deactivate (asks for the last working day) / Reactivate (asks),
// Delete (refusals first, then asks, naming held equipment), each refusal's reason under its button.
// New (L1): Check-in places (office, home check-in, homes, open change requests) and Devices (list; Admin reset, asked first).
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getUser, getAllDepartments, deactivateUser, reactivateUser, deleteUser, deleteProblem, reportingManagerName, leavingDate, leavingPeriods } from "../../../assets/js/data/store.js";
import { DEPARTMENTS } from "../../../assets/js/data/users.js";
import { ROLES, overridesOf } from "../../../assets/js/config/roles.js";
import { formatDay, plural, todayIso } from "../../../assets/js/ui/leave-view.js";
import { maskAccount, maskPan } from "../../../assets/js/ui/pii.js";
import { salaryFor } from "../../../assets/js/data/payroll-store.js";
import { approvalChainText } from "../../../assets/js/data/leave-store.js";
import { leaveBalanceChart, valuesOf } from "../../../assets/js/data/chart-data.js";
import { rupees } from "../../../assets/js/ui/money.js";
import { allItems, assetsFor } from "../../../assets/js/data/inventory-store.js";
import { conditionBadge } from "../../../assets/js/ui/inventory-view.js";
import { officeOf } from "../../../assets/js/data/offices-store.js";
import { homeOf, locationChangesFor } from "../../../assets/js/data/locations-store.js";
import { devicesFor, resetDevices } from "../../../assets/js/data/devices-store.js";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { tabTitle } from "../data/company.js";
import { pageUrl, OFFICES } from "../routes.js";
import Frame from "../ui/Frame.jsx";
import Modal from "../components/Modal.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { useToast } from "../ui/Toast.jsx";
import { EmptyState, Badge, badgeOf, Reason } from "../components/Basics.jsx";
import { PageHeader, Card, Pill } from "../components/Layout.jsx";
import { Field, Input, Kv, initialsOf } from "../components/Form.jsx";
import { STATUS } from "./UsersList.jsx";

const PAGE = "users/user-profile.html";
const LIST = pageUrl("users/users-list.html");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const orDash = (v) => (v ? String(v) : "—");
const departmentName = (code) => getAllDepartments().find((d) => d.code === code)?.name ?? DEPARTMENTS.find((d) => d.code === code)?.name ?? code ?? "";
const formatAccount = (digits) => String(digits).replace(/(\d{4})(?=\d)/g, "$1 ");
const LEAVE_SHORT = { casual: "Casual", sick: "Sick", earned: "Earned", wfh: "WFH" };
const DEVICE_NOTE = "A browser can't prove who is using it: a device here is a random token kept in that browser. The backend stage will enforce devices for real.";

function parseDate(text) {
  const iso = String(text ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]) - 1, day: Number(iso[3]) };
  const m = String(text ?? "").match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  return month === -1 ? null : { year: Number(m[3]), month, day: Number(m[1]) };
}
// Whole months from joining to today (a leaver: to the last working day): "5 years, 6 months", "Less than a month"
function tenureText(joined, today) {
  const start = parseDate(joined);
  if (!start) return null;
  let months = (today.getFullYear() - start.year) * 12 + (today.getMonth() - start.month);
  if (today.getDate() < start.day) months -= 1;
  if (months < 0) return "Not joined yet";
  if (months === 0) return "Less than a month";
  const years = Math.floor(months / 12), rest = months % 12;
  return [years && plural(years, "year", "years"), rest && plural(rest, "month", "months")].filter(Boolean).join(", ");
}
function daysAway(person) {
  const day = (iso) => { const d = parseDate(iso); return Date.UTC(d.year, d.month, d.day) / 86400000; };
  return leavingPeriods(person).reduce((sum, p) => sum + Math.max(0, day(p.back) - day(p.lastDay) - 1), 0);
}
function heldText(userId) {
  const held = assetsFor(userId).sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
  if (!held.length) return "";
  const names = new Map(allItems().map((i) => [i.sku, i.name]));
  return `They still hold ${held.map((a) => `${a.id} (${names.get(a.sku) ?? a.sku})`).join(", ")}. Take ${held.length === 1 ? "it" : "them"} back on Asset assignment.`;
}

function Sensitive({ label, masked, full, canReveal }) {
  const [shown, setShown] = useState(false);
  if (!full) return [label, "Not on file", { muted: true }];
  return [label, <span className="ds-reveal"><span className={shown ? undefined : "masked"}>{shown ? full : masked}</span>{canReveal && <> <button type="button" className="ds-btn ds-btn--ghost ds-btn--sm" onClick={() => setShown(!shown)}>{shown ? "Hide" : "Reveal"}</button></>}</span>];
}

function DeactivateDialog({ user, onClose, onDone }) {
  const { userId } = useSession();
  const toast = useToast();
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState(null);
  const held = heldText(user.id);
  const submit = (e) => {
    e.preventDefault();
    setError(null);
    const result = deactivateUser(userId, user.id, date);
    if (!result.ok && result.field === "dateOfLeaving") { setError(result.error); return; }
    onClose();
    if (!result.ok) { toast(result.error, "danger"); return; }
    bump();
    onDone();
    toast(`${result.record.name} deactivated. Last working day: ${formatDay(leavingDate(result.record), true)}.`, "success");
  };
  return (
    <Modal open onClose={onClose} id="deactivate-modal" size="sm" title={`Deactivate ${user.name}`} desc="They'll no longer show as active. Their pay runs to their last working day."
      footer={<><button type="button" className="ds-btn" onClick={onClose}>Cancel</button><button type="submit" form="deactivate-form" className="ds-btn ds-btn--danger">Deactivate</button></>}>
      <form id="deactivate-form" noValidate onSubmit={submit} className="ds-stack">
        <Field id="deactivate-date" label="Last working day" required error={error}>
          <Input id="deactivate-date" type="date" value={date} max={todayIso()} error={error} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {held && <p className="ds-note ds-note--warning" id="deactivate-modal-assets">{held}</p>}
      </form>
    </Modal>
  );
}

function Places({ user }) {
  const office = useData(() => officeOf(user.id), [user.id]);
  const home = useData(() => homeOf(user.id), [user.id]);
  const waiting = useData(() => locationChangesFor(user.id).filter((r) => r.status === "pending").length, [user.id]);
  const place = (h) => (h ? h.address : "Not set");
  return (
    <Card id="profile-places" title="Check-in places" actions={<Link className="ds-btn ds-btn--sm" to={pageUrl(OFFICES)}>Offices</Link>}>
      <Kv rows={[
        ["Office", office ? `${office.name} (${office.type === "head" ? "head office" : "branch"}${office.state ? `, ${office.state}` : ""})` : "—"],
        ["Home check-in", home.homeEligible ? "Allowed" : "Not allowed", { muted: !home.homeEligible }],
        ["Permanent home", place(home.permanent), { muted: !home.permanent }],
        ["Temporary home", place(home.temporary), { muted: !home.temporary }],
        ["Change requests waiting", String(waiting)],
      ]} />
    </Card>
  );
}

function Devices({ user }) {
  const { userId } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const canReset = useCan("devices:reset");
  const list = useData(() => devicesFor(userId, user.id), [userId, user.id]);
  const reset = async () => {
    if (!(await confirm({ message: `Reset ${user.name}'s devices?\nTheir next check-in registers the device it comes from, up to 2.`, confirmLabel: "Reset devices", danger: true }))) return;
    const r = resetDevices(userId, user.id);
    if (!r.ok) { toast(r.error, "danger"); return; }
    bump();
    toast(`${user.name}'s devices were reset (${plural(r.removed, "device", "devices")} removed).`, "success");
  };
  return (
    <Card id="profile-devices" title="Devices" meta={list.ok ? `${list.records.length} of 2` : undefined}
      actions={canReset && list.ok && list.records.length > 0 ? <button type="button" className="ds-btn ds-btn--sm ds-btn--danger" onClick={reset}>Reset devices</button> : null}
      footer={DEVICE_NOTE}>
      {!list.ok ? <p className="ds-hint">{list.error}</p>
        : list.records.length === 0 ? <p className="ds-hint">No devices registered yet.</p>
          : <Kv rows={list.records.map((d) => [d.label, `Registered ${formatDay(d.registeredAt.slice(0, 10), true)}, last used ${formatDay(d.lastUsedAt.slice(0, 10), true)}`])} />}
    </Card>
  );
}

function Profile({ initial }) {
  const { userId } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const can = { reset: useCan("users:reset-password"), edit: useCan("users:edit"), status: useCan("users:deactivate"), del: useCan("users:delete"), pii: useCan("pii:view"), salary: useCan("salary:view") };
  const user = useData(() => getUser(initial.id) ?? initial, [initial.id]);
  const [dialog, setDialog] = useState(false);
  const role = ROLES[user.role];
  const status = STATUS[user.status] ?? { label: user.status, tone: "" };
  const own = user.id === userId;
  const inactive = user.status === "inactive";
  useEffect(() => { document.title = tabTitle(user.name); });   // after the route's static title, as the old script set it

  const last = parseDate(leavingDate(user));
  const tenure = tenureText(user.dateOfJoining, last ? new Date(last.year, last.month, last.day) : new Date());
  const away = daysAway(user);
  const today = todayIso();
  const salary = can.salary ? salaryFor(user.id, Number(today.slice(0, 4)), Number(today.slice(5, 7))) : null;
  const { grants, denies } = overridesOf(user);
  const chart = leaveBalanceChart(user.id);
  const [allowance, left] = ["Allowance", "Left"].map((n) => valuesOf(chart, n));
  const leave = chart.labels.map((type, i) => ({ type, allowance: allowance[i], left: left[i] })).filter((r) => r.allowance !== null);
  const assets = assetsFor(user.id).sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
  const names = new Map(allItems().map((i) => [i.sku, i.name]));
  const deleteWhy = own ? "You can't delete your own account." : (deleteProblem(userId, user.id) ?? "");
  const statusWhy = own && !inactive ? "You can't deactivate your own account." : "";

  const onStatus = async () => {
    if (!inactive && own) { toast("You can't deactivate your own account.", "danger"); return; }
    if (!inactive) { setDialog(true); return; }
    if (!(await confirm({ message: `Reactivate ${user.name}?`, confirmLabel: "Reactivate" }))) return;
    const r = reactivateUser(userId, user.id);
    if (!r.ok) { toast(r.error, "danger"); return; }
    bump();
    toast(`${r.record.name} reactivated.`, "success");
  };
  const onDelete = async () => {
    if (own) { toast("You can't delete your own account.", "danger"); return; }
    const problem = deleteProblem(userId, user.id);
    if (problem) { toast(problem, "danger"); return; }
    const held = heldText(user.id);
    if (!(await confirm({ message: `Delete ${user.name}? They'll be removed from the employee list. Only Reset demo data brings them back.${held ? `\n${held}` : ""}`, confirmLabel: "Delete", danger: true }))) return;
    const r = deleteUser(userId, user.id);
    if (!r.ok) { toast(r.error, "danger"); return; }
    toast(`${user.name} deleted.`, "success");
    setTimeout(() => { bump(); navigate(LIST); }, 1200);
  };

  // E0: each card's Edit opens the user form at its section (only for whoever may edit)
  const editIn = (section, name) => (can.edit ? <Link className="ds-btn ds-btn--sm" aria-label={name} data-edit-section={section}
    to={pageUrl(`users/user-form.html?id=${encodeURIComponent(user.id)}&section=${section}`)}>Edit</Link> : null);
  return (
    <>
      <PageHeader title="Employee profile" breadcrumb={[{ label: "Users", to: LIST }, { label: user.name }]}
        actions={<div className="ds-stack" style={{ gap: 6, justifyItems: "end" }}>
          <div className="ds-form-actions__buttons">
            {can.reset && <button type="button" className="ds-btn" onClick={() => toast(`Passwords aren't part of OfficeOS yet: no reset link was sent to ${user.email}.`, "info")}>Reset password</button>}
            {can.edit && <Link className="ds-btn" to={pageUrl(`users/user-form.html?id=${encodeURIComponent(user.id)}`)}>Edit</Link>}
            {can.status && <button type="button" className={`ds-btn${inactive ? "" : " ds-btn--danger"}`} onClick={onStatus}>{inactive ? "Reactivate" : "Deactivate"}</button>}
            {can.del && <button type="button" className="ds-btn ds-btn--danger" onClick={onDelete}>Delete</button>}
          </div>
          {can.status && statusWhy && <Reason id="status-reason" text={statusWhy} />}
          {can.del && deleteWhy && <Reason id="delete-reason" text={deleteWhy} />}
        </div>} />
      <div className="ds-stack">
        <section className="ds-card profile-head" aria-labelledby="profile-name">
          <div className="ds-card__body ds-form-actions">
            <div className="ds-person">
              <span className="ds-avatar ds-avatar--xl" aria-hidden="true">{initialsOf(user.name)}</span>
              <div>
                <h2 className="ds-card__title" id="profile-name">{user.name}</h2>
                <p className="ds-hint" id="profile-meta">{[user.designation, departmentName(user.department)].filter(Boolean).join(", ")}</p>
                <div className="ds-chips" id="profile-badges"><Pill tone="info">{role?.label ?? user.role}</Pill><Pill tone={status.tone}>{status.label}</Pill><Pill>{user.id}</Pill></div>
              </div>
            </div>
            <div className="ds-form-actions__buttons"><a className="ds-btn" href={`mailto:${user.email}`}>Email</a><Link className="ds-btn" to={pageUrl("attendance/team-attendance.html")}>View attendance</Link></div>
          </div>
        </section>
        <nav aria-label="Profile sections" className="ds-tabs">
          {[["Overview", "profile-details"], ["Access", "profile-access"], ["Attendance", null], ["Leave", "profile-leave"], ["Assets", "profile-assets"], ["Activity", "profile-activity"]].map(([label, to]) => (
            to ? <a key={label} className="ds-tabs__tab" href={`#${to}`}>{label}</a> : <Link key={label} className="ds-tabs__tab" to={pageUrl("attendance/team-attendance.html")}>{label}</Link>
          ))}
        </nav>
        <div className="ds-two-col">
          <div className="ds-stack">
            <Card id="profile-details" title="Details" actions={editIn("employment", "Edit employment details")}>
              <Kv rows={[["Work email", orDash(user.email)], ["Phone", orDash(user.phone)], ["Location", orDash(user.location)], ["Employment type", orDash(user.employmentType)],
                ["Department", orDash(departmentName(user.department))], ["Reporting manager", orDash(reportingManagerName(user))], ["Date of joining", orDash(user.dateOfJoining)],
                leavingDate(user) ? ["Last working day", formatDay(leavingDate(user), true)] : null,
                ["Tenure", tenure ? (away ? `${tenure} (${plural(away, "day", "days")} away)` : tenure) : "—", { muted: !tenure }]]} />
            </Card>
            <Card id="profile-sensitive" title="Sensitive details" actions={<><Pill tone="info">Needs pii:view</Pill>{editIn("pay", "Edit pay and tax details")}</>}>
              <Kv rows={[Sensitive({ label: "Bank account", masked: maskAccount(user.bankAccountLast4) || "•••• ••••", full: user.bankAccount ? formatAccount(user.bankAccount) : "", canReveal: can.pii }),
                Sensitive({ label: "PAN", masked: maskPan(user.pan), full: user.pan ?? "", canReveal: can.pii }),
                can.salary ? ["Salary", salary ? `${rupees(salary.gross)} a month` : "Not on file", { muted: !salary }] : ["Salary", "Hidden, needs salary:view", { muted: true }]]} />
            </Card>
            <Places user={user} />
            <Card id="profile-activity" title="Recent activity" meta="This month"><p className="ds-hint">No recent activity</p></Card>
          </div>
          <aside className="ds-stack">
            <Card id="profile-access" title="Access" actions={editIn("access", "Edit role and access")}>
              <Kv rows={[["Designation", orDash(user.designation)], ["Default role", <Pill tone="info">{role?.label ?? user.role}</Pill>], ["Data scope", role?.scopeLabel ?? ROLES.emp.scopeLabel],
                ["Approval chain", approvalChainText(user.id)], ["Two-factor sign-in", "Not recorded yet", { muted: true }], ["Last sign-in", "Not recorded yet", { muted: true }]]} />
            </Card>
            <Card id="profile-overrides" title="Permission overrides" meta={String(grants.length + denies.length)}>
              {!grants.length && !denies.length ? <p className="ds-hint">No overrides</p> : (
                <div className="ds-stack">
                  {[["Extra permissions", grants], ["Denied permissions", denies]].map(([label, list]) => (
                    <div key={label} className="ds-field"><span className="ds-field__label">{label}</span>
                      <div className="ds-chips">{list.length ? list.map((p) => <span key={p} className="ds-chip">{p}</span>) : <span className="ds-hint">None</span>}</div></div>
                  ))}
                  <p className="ds-hint">Applied on top of the role, everywhere the app checks: extra permissions are added, denied ones taken away. Only an Admin can change them.</p>
                </div>
              )}
            </Card>
            <Card id="profile-leave" title="Leave balance" meta={today.slice(0, 4)} footer="Days left this year; work from home, this month.">
              <Kv rows={leave.map((r) => [LEAVE_SHORT[r.type] ?? r.type, String(r.left)])} />
            </Card>
            <Card id="profile-assets" title="Assets" meta={String(assets.length)}>
              {!assets.length ? <p className="ds-hint">No assets assigned</p> : (
                <Kv rows={assets.map((a) => { const b = conditionBadge(a.condition); return [names.get(a.sku) ?? a.sku, <span>{a.id} since {formatDay(a.since, true)} <Badge {...badgeOf(b.className)}>{b.textContent}</Badge></span>]; })} />
              )}
            </Card>
            <Devices user={user} />
          </aside>
        </div>
      </div>
      {dialog && <DeactivateDialog user={user} onClose={() => setDialog(false)} onDone={() => {}} />}
    </>
  );
}

function Content() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  const user = useData(() => getUser(id), [id]);
  useEffect(() => { if (!user) document.title = tabTitle("Employee not found"); });
  if (!user) {
    return (
      <>
        <PageHeader title="Employee profile" breadcrumb={[{ label: "Users", to: LIST }, { label: "Not found" }]} />
        <Card id="not-found"><EmptyState title="Employee not found" text={id ? `There's no employee with ID ${id}. They may have been deleted, or the link is wrong.` : "This link doesn't name an employee."} to={LIST} linkText="Back to users" /></Card>
      </>
    );
  }
  return <Profile key={user.id} initial={user} />;
}

export default function UserProfile() {
  return <Frame page={PAGE}><Content /></Frame>;
}