// users/user-profile.html (L1), built in the design system. What the old page (pages/user-profile.js) does, in its words:
// the employee from ?id= ("Employee not found" otherwise); header (name, designation and department, role, status, id,
// Email, View attendance); Details (with a leaver's last working day and tenure, "(N days away)"); Sensitive details
// (masked, Reveal / Hide with pii:view, "Not on file"; the salary with salary:view); Access (approval chain; two-factor and
// last sign-in "Not recorded yet"); Permission overrides; Leave balance; Assets; Recent activity ("No recent activity").
// Actions: Reset password (a toast: nothing is sent), Edit, Deactivate (asks for the last working day) / Reactivate (asks),
// Delete (refusals first, then asks, naming held equipment), each refusal's reason under its button.
// New (L1): Check-in places (office, home check-in, homes, open change requests) and Devices (list; Admin reset, asked first).
// E1: the whole record in the form's five sections (ui/profile.jsx: view and edit, masked sensitive fields with Show, each
// field only for whoever may see it), the profile's completeness and change history (HR / Admin), bank and tax change
// requests, and the sign-in account (reset link or temporary password: accounts:reset; unlock, disable / enable:
// accounts:unlock; the account's events for an Admin). The old Reset password toast is gone (the Account card does it).
// Managers open their direct reports' profiles (team fields, leave) and Finance opens anyone's (team and pay fields): the
// app's own rule (RequireRoute), so the old site's guard is unchanged.
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getUser, getAllDepartments, deactivateUser, reactivateUser, deleteUser, deleteProblem, leavingDate, leavingPeriods } from "../../../assets/js/data/store.js";
import { DEPARTMENTS } from "../../../assets/js/data/users.js";
import { ROLES, overridesOf } from "../../../assets/js/config/roles.js";
import { formatDay, plural, todayIso } from "../../../assets/js/ui/leave-view.js";
import { leaveBalanceChart, valuesOf } from "../../../assets/js/data/chart-data.js";
import { listAssets } from "../../../assets/js/data/asset-register.js";   // AS2: the new register, not the old inventory store
import { CONDITIONS } from "../../../assets/js/data/asset-rules.js";
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
import { Avatar } from "../ui/avatar.jsx";   // FS1
import { STATUS } from "./UsersList.jsx";
import { leavePolicyOn, bandText } from "../ui/leaveband.jsx";
import { relationOf } from "../../../assets/js/data/employee-record.js";
import { PROFILE_SECTIONS } from "../../../assets/js/config/employee-fields.js";
import { ProfileRecord, ChangeRequests, Completeness, History, AccountCard } from "../ui/profile.jsx";
import { ShiftCard } from "../ui/shifts.jsx";   // SH1
import { accountOf, unlockAccount, LOCK_AFTER } from "../../../assets/js/data/credentials.js";   // F2: the lock banner

const PAGE = "users/user-profile.html";
const LIST = pageUrl("users/users-list.html");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const departmentName = (code) => getAllDepartments().find((d) => d.code === code)?.name ?? DEPARTMENTS.find((d) => d.code === code)?.name ?? code ?? "";
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
// AS2: what a person holds now, from the new register (the viewer needs assets:view-all to see it: HR and the Admin do)
const heldBy = (viewerId, personId) => listAssets(viewerId, { status: "assigned" }).filter((a) => a.holderId === personId).sort((a, b) => a.tag.localeCompare(b.tag, "en", { numeric: true }));
const CONDITION_BADGE = { good: "badge badge--success badge--square", fair: "badge badge--warning badge--square", poor: "badge badge--danger badge--square" };
function heldText(viewerId, personId) {
  const held = heldBy(viewerId, personId);
  if (!held.length) return "";
  return `They still hold ${held.map((a) => `${a.tag} (${a.name})`).join(", ")}. Take ${held.length === 1 ? "it" : "them"} back on Asset assignment.`;
}

function DeactivateDialog({ user, onClose, onDone }) {
  const { userId } = useSession();
  const toast = useToast();
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState(null);
  const held = heldText(userId, user.id);
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
  const can = { edit: useCan("users:edit"), status: useCan("users:deactivate"), del: useCan("users:delete") };
  const user = useData(() => getUser(initial.id) ?? initial, [initial.id]);
  const relation = useData(() => relationOf(userId, initial.id), [userId, initial.id]);
  const lock = useData(() => accountOf(initial.id).lockedUntil, [initial.id]);   // F2
  const canUnlock = useCan("accounts:unlock") && userId !== initial.id;
  const people = relation === "people" || relation === "self";
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
  const { grants, denies } = overridesOf(user);
  const chart = leaveBalanceChart(user.id);
  const [allowance, left] = ["Allowance", "Left"].map((n) => valuesOf(chart, n));
  const leave = chart.labels.map((type, i) => ({ type, allowance: allowance[i], left: left[i] })).filter((r) => r.allowance !== null);
  const assets = heldBy(userId, user.id);
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
    const held = heldText(userId, user.id);
    if (!(await confirm({ message: `Delete ${user.name}? They'll be removed from the employee list. Only Reset demo data brings them back.${held ? `\n${held}` : ""}`, confirmLabel: "Delete", danger: true }))) return;
    const r = deleteUser(userId, user.id);
    if (!r.ok) { toast(r.error, "danger"); return; }
    toast(`${user.name} deleted.`, "success");
    setTimeout(() => { bump(); navigate(LIST); }, 1200);
  };

  if (!relation) {
    return (
      <>
        <PageHeader title="Employee profile" breadcrumb={[{ label: "Users", to: LIST }, { label: user.name }]} />
        <Card id="not-yours"><EmptyState title="You can't see this profile" text="You can open your direct reports' profiles. Ask HR for anyone else's details." /></Card>
      </>
    );
  }
  const leaver = leavingDate(user);
  const service = [["Tenure", tenure ? (away ? `${tenure} (${plural(away, "day", "days")} away)` : tenure) : "—", { muted: !tenure }],
    leaver ? ["Last working day", formatDay(leaver, true)] : null, leavePolicyOn() ? ["Leave band", bandText(user.id)] : null];
  return (
    <>
      <PageHeader title="Employee profile" breadcrumb={[{ label: "Users", to: LIST }, { label: user.name }]}
        actions={(can.edit || can.status || can.del) && <div className="ds-stack" style={{ gap: 6, justifyItems: "end" }}>
          <div className="ds-form-actions__buttons">
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
              <Avatar userId={user.id} name={user.name} cls="ds-avatar ds-avatar--xl" />
              <div>
                <h2 className="ds-card__title" id="profile-name">{user.name}</h2>
                <p className="ds-hint" id="profile-meta">{[user.designation, departmentName(user.department)].filter(Boolean).join(", ")}</p>
                <div className="ds-chips" id="profile-badges"><Pill tone="info">{role?.label ?? user.role}</Pill><Pill tone={status.tone}>{status.label}</Pill><Pill>{user.id}</Pill></div>
              </div>
            </div>
            <div className="ds-form-actions__buttons"><a className="ds-btn" href={`mailto:${user.email}`}>Email</a><Link className="ds-btn" to={pageUrl("attendance/team-attendance.html")}>View attendance</Link></div>
          </div>
        </section>
        {lock && (
          <div className="ds-note ds-note--warning profile-lock" id="profile-lock" role="status">
            <span><strong>Sign-in locked.</strong>{` ${LOCK_AFTER} failed sign-ins in a row; it unlocks by itself at ${new Date(lock).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}.`}</span>
            {canUnlock && <button type="button" className="ds-btn ds-btn--sm" id="profile-unlock" onClick={() => { const r = unlockAccount(userId, user.id); toast(r.ok ? `${user.name} can sign in again.` : r.error, r.ok ? "success" : "danger"); bump(); }}>Unlock</button>}
          </div>
        )}
        <nav aria-label="Profile sections" className="ds-tabs">
          {PROFILE_SECTIONS.filter((s) => people || s.key !== "access").filter((s) => relation !== "manager" || s.key !== "pay").map((s) => <a key={s.key} className="ds-tabs__tab" href={`#profile-${s.key}`}>{s.title}</a>)}
          {(people || relation === "manager") && <a className="ds-tabs__tab" href="#profile-shift">Shift</a>}
          {people && <a className="ds-tabs__tab" href="#profile-leave">Leave</a>}
          {relation === "people" && <a className="ds-tabs__tab" href="#profile-assets">Assets</a>}
        </nav>
        <div className="ds-two-col">
          <div className="ds-stack">
            <ProfileRecord userId={user.id} />
            {(relation === "people" || relation === "finance") && <ChangeRequests userId={user.id} />}
            {(people || relation === "manager") && <ShiftCard userId={user.id} />}
            {relation === "people" && <History userId={user.id} />}
          </div>
          <aside className="ds-stack">
            {relation === "people" && <Completeness userId={user.id} />}
            {relation === "people" && <AccountCard user={user} />}
            <Card id="profile-service" title="Service"><Kv rows={service} /></Card>
            {relation === "people" && (
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
            )}
            {(relation === "people" || relation === "manager") && (
              <Card id="profile-leave" title="Leave balance" meta={today.slice(0, 4)} footer="Days left this year; work from home, this month.">
                <Kv rows={leave.map((r) => [LEAVE_SHORT[r.type] ?? r.type, String(r.left)])} />
              </Card>
            )}
            {relation === "people" && (
              <Card id="profile-assets" title="Assets" meta={String(assets.length)}>
                {!assets.length ? <p className="ds-hint">No assets assigned</p> : (
                  <Kv rows={assets.map((a) => [a.name, <span>{a.tag} since {formatDay(a.since, true)} {a.condition && <Badge {...badgeOf(CONDITION_BADGE[a.condition])}>{CONDITIONS[a.condition].label}</Badge>}</span>])} />
                )}
              </Card>
            )}
            {relation === "people" && <Places user={user} />}
            {relation === "people" && <Devices user={user} />}
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