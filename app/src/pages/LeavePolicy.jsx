// Leave policy (P4b): the app's own page at /pages/leave/leave-policy.html. The tenure leave policy by band (data/leave-policy.js):
// intern, under 1 year, over 1 year, with the numbers clearly marked as samples. HR reads (leave:approve); an Admin
// (leave-policy:edit) edits a band's numbers through the module's own checks, sets the day the policy starts (data/pay-settings.js:
// never in the past; leave already taken is never rewritten) and closes a leave year (once, after it has ended; the page
// shows what will be carried forward and paid out before asking). The history lists every change. Nothing is worked out here.
import { useLayoutEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { leavePolicy, updateLeavePolicy, closeLeaveYear, yearClose, leavePolicyAudit, leaveAccount, tenureBand, bandPolicy, LEAVE_BANDS, BAND_LABEL } from "../../../assets/js/data/leave-policy.js";
import { leaveFrom, setLeaveFrom, paySettingsAudit } from "../../../assets/js/data/pay-settings.js";
import { employmentOf } from "../../../assets/js/data/employment.js";
import { getAllUsers } from "../../../assets/js/data/store.js";
import { formatDay, formatDays, todayIso } from "../../../assets/js/ui/leave-view.js";
import { useData, useSession, useCan, signOutNow } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { tabTitle } from "../data/company.js";
import { pageUrl, LEAVE_POLICY_PAGE } from "../routes.js";
import { mayOpenLeavePolicy } from "../shell/appNav.js";
import Shell from "../shell/Shell.jsx";
import Table from "../components/Table.jsx";
import Modal from "../components/Modal.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { useToast } from "../ui/Toast.jsx";
import { PageHeader, Card, Pill } from "../components/Layout.jsx";
import { Field, Input, Select } from "../components/Form.jsx";
import { BAND_NAME } from "../ui/leaveband.jsx";

const TYPES = [["casual", "Casual leave"], ["sick", "Sick leave"], ["earned", "Earned leave"], ["wfh", "Work from home"], ["unpaid", "Unpaid leave"]];
const d = (n) => formatDays(n);
function cell(band, x) {
  if (x.accrual === "none") return "None";
  if (x.accrual === "unlimited") return "No limit";
  if (x.accrual === "perMonth" || x.accrual === "perMonthReset") return `${d(x.amount)} a month`;
  if (x.accrual === "perYear") return `${d(x.amount)} a year${band === "under1" ? ", pro-rated by month" : ""}`;
  const bits = [`1 day per ${x.per} days worked`];
  if (x.usableAfterMonths) bits.push(`usable after ${x.usableAfterMonths} months`);
  bits.push(x.carryForwardMax ? `carry forward up to ${d(x.carryForwardMax)}` : "no carry-forward");
  bits.push(x.encashAbove != null ? `encash above ${d(x.encashAbove)}` : "no encashment");
  return bits.join("; ");
}
const FIELDS = { perMonth: ["amount"], perMonthReset: ["amount"], perYear: ["amount"], per20Days: ["amount", "per", "usableAfterMonths", "carryForwardMax", "encashAbove"] };
const FIELD_LABEL = { amount: "Days (a month, or a year)", per: "Working days per earned day", usableAfterMonths: "Usable after (months)", carryForwardMax: "Carry forward at most (days)", encashAbove: "Pay out above (days; empty for never)" };

// What closing a year will do: the same arithmetic as the module's close, shown before asking (the test compares them).
function preview(year) {
  const end = `${year}-12-31`;
  return getAllUsers().map((u) => {
    const e = employmentOf(u.id);
    if (!e || (e.joiningDate && e.joiningDate > end)) return null;
    const band = tenureBand(u.id, end), a = leaveAccount(u.id, end).types.earned, p = bandPolicy(band).earned;
    const left = Math.max(0, a.available - a.taken);
    const carried = Math.min(left, p.carryForwardMax ?? 0);
    const encashed = p.encashAbove == null ? 0 : Math.max(0, left - Math.max(p.encashAbove, carried));
    return { id: u.id, name: u.name, band, left, carried, encashed, lapsed: left - carried - encashed };
  }).filter(Boolean);
}

function EditRule({ edit, onClose }) {
  const { userId } = useSession();
  const toast = useToast();
  const x = edit?.x;
  const keys = x ? FIELDS[x.accrual] ?? [] : [];
  const [f, setF] = useState(() => Object.fromEntries(keys.map((k) => [k, x[k] == null ? "" : String(x[k])])));
  const [err, setErr] = useState(null);
  const save = (e) => {
    e.preventDefault();
    const changes = Object.fromEntries(keys.map((k) => [k, k === "encashAbove" && f[k].trim() === "" ? null : Number(f[k])]));
    const r = updateLeavePolicy(userId, edit.band, edit.type, changes);
    if (!r.ok) { setErr({ field: r.field, text: r.error }); return; }
    toast(`${BAND_NAME[edit.band]}: ${edit.label} saved.`, "success");
    bump(); onClose();
  };
  return (
    <Modal open={Boolean(edit)} onClose={onClose} id="leave-edit" size="sm" title={edit ? `${BAND_NAME[edit.band]}: ${edit.label}` : ""} desc="Sample numbers. They apply from the day the policy starts; leave already taken is never changed."
      footer={<><button className="ds-btn" type="button" onClick={onClose}>Cancel</button><button className="ds-btn ds-btn--primary" type="submit" form="leave-edit-form">Save</button></>}>
      {edit && (
        <form id="leave-edit-form" noValidate onSubmit={save}>
          {keys.map((k) => (
            <Field key={k} id={`lp-${k}`} label={FIELD_LABEL[k]} error={err?.field === k ? err.text : undefined}>
              <Input id={`lp-${k}`} type="number" step="0.5" min="0" value={f[k]} onChange={(e) => { setF({ ...f, [k]: e.target.value }); setErr(null); }} />
            </Field>
          ))}
          {err && !keys.includes(err.field) && <p className="ds-field__error" role="alert">{err.text}</p>}
        </form>
      )}
    </Modal>
  );
}

function Content() {
  const { userId } = useSession();
  const canEdit = useCan("leave-policy:edit");
  const confirm = useConfirm();
  const toast = useToast();
  const today = todayIso();
  const data = useData(() => ({ policy: leavePolicy(), from: leaveFrom(), audit: leavePolicyAudit(), settings: paySettingsAudit().filter((a) => a.action === "leave-from") }), []);
  const [edit, setEdit] = useState(null);
  const [date, setDate] = useState(null);
  const [dateErr, setDateErr] = useState("");
  const thisYear = Number(today.slice(0, 4));
  const years = [thisYear - 1, thisYear - 2].filter((y) => y >= 2000);
  const open = useData(() => years.filter((y) => !yearClose(y)), [thisYear]);
  const closed = useData(() => years.map((y) => [y, yearClose(y)]).filter(([, c]) => c), [thisYear]);
  const [year, setYear] = useState(null);
  const chosen = year ?? open[0] ?? null;
  const rows = chosen ? preview(chosen) : [];
  const dateValue = date ?? data.from;
  const saveDate = (e) => {
    e.preventDefault();
    const r = setLeaveFrom(userId, dateValue);
    if (!r.ok) { setDateErr(r.error); return; }
    setDateErr(""); setDate(null); bump();
    toast(`The leave policy starts on ${formatDay(dateValue, true)}.`, "success");
  };
  const close = async () => {
    const carried = rows.reduce((s, r) => s + r.carried, 0), encashed = rows.reduce((s, r) => s + r.encashed, 0);
    if (!(await confirm({ message: `Close the ${chosen} leave year?\nEarned leave carried forward: ${d(carried)} in all. Paid out (encashed): ${d(encashed)} in all. A leave year closes once and can't be reopened.`, confirmLabel: `Close ${chosen}`, cancelLabel: "Cancel", danger: true }))) return;
    const r = closeLeaveYear(userId, chosen);
    if (!r.ok) { toast(r.error, "danger"); return; }
    bump(); toast(`The ${chosen} leave year is closed.`, "success");
  };
  const columns = [
    { key: "type", label: "Leave", render: (r) => <span className="table__user-name">{r.label}</span> },
    ...LEAVE_BANDS.map((band) => ({ key: band, label: BAND_NAME[band], render: (r) => {
      const x = data.policy[band][r.type];
      return <><span data-cell={`${band}:${r.type}`}>{cell(band, x)}</span>{canEdit && FIELDS[x.accrual] && <>{" "}<button className="ds-btn ds-btn--sm" type="button" data-edit-policy={`${band}:${r.type}`} onClick={() => setEdit({ band, type: r.type, label: r.label, x })}>Edit</button></>}</>;
    } })),
  ];
  const history = [
    ...data.audit.map((a) => ({ at: a.at, who: a.name, what: a.action === "policy" ? `${BAND_NAME[a.band]}, ${TYPES.find(([k]) => k === a.type)?.[1] ?? a.type}: ${Object.entries(a.changes).map(([k, v]) => `${FIELD_LABEL[k] ?? k} ${v === null ? "never" : v}`).join(", ")}` : `Closed the ${a.year} leave year` })),
    ...data.settings.map((a) => ({ at: a.at, who: a.name, what: `Policy start set to ${formatDay(a.value, true)}` })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const previewColumns = [
    { key: "name", label: "Employee", render: (r) => r.name }, { key: "band", label: "Band on 31 Dec", render: (r) => BAND_NAME[r.band] },
    { key: "left", label: "Earned leave left", num: true, render: (r) => formatDays(r.left) }, { key: "carried", label: "Carried forward", num: true, render: (r) => formatDays(r.carried) },
    { key: "encashed", label: "Paid out", num: true, render: (r) => formatDays(r.encashed) }, { key: "lapsed", label: "Lapses", num: true, render: (r) => formatDays(r.lapsed) },
  ];
  return (
    <>
      <PageHeader title="Leave policy" subtitle="How casual, sick, earned and work-from-home leave works for interns and for employees under and over a year"
        breadcrumb={[{ label: "Leave", to: pageUrl("leave/my-leave.html") }, { label: "Leave policy" }]} />
      <div className="ds-note ds-note--warning" id="leave-sample" role="note"><strong>Sample numbers</strong>{" "}These numbers are samples until the company sets its own. {canEdit ? "You can edit them below." : "An Admin can edit them."}</div>
      <Card id="leave-start" title="When the policy starts" meta={`From ${formatDay(data.from, true)}`}>
        <form onSubmit={saveDate} noValidate>
          <Field id="lp-start" label="Starts on" hint="Before this day every balance and every request is shown exactly as it is today. Leave already taken is never rewritten." error={dateErr || undefined}>
            <Input id="lp-start" type="date" value={dateValue} disabled={!canEdit} onChange={(e) => { setDate(e.target.value); setDateErr(""); }} />
          </Field>
          {canEdit && <p><button className="ds-btn ds-btn--primary" type="submit" id="lp-start-save" disabled={!dateValue || dateValue === data.from}>Save start date</button></p>}
        </form>
      </Card>
      <Card id="leave-bands" title="By band" meta="Sample numbers" footer={<span className="ds-card__meta">A person is an intern if their employment type says so; otherwise Under 1 year until their first work anniversary and Over 1 year from that day. Whether the Occupational Safety, Health and Working Conditions Code's annual leave rule covers this office is not confirmed: it is a note, not enforced. Until the payroll step reads the policy, only leave applied for as Unpaid leave is deducted from pay.</span>}>
        <Table bare pager={false} columns={columns} rows={TYPES.map(([type, label]) => ({ type, label }))} rowKey={(r) => r.type} />
      </Card>
      <Card id="leave-close" title="Close a leave year" meta="Once a year, by an Admin">
        {open.length ? (
          <>
            <Field id="lp-year" label="Year to close" hint="Earned leave left on 31 December is carried forward up to the cap; above the encashment line it is paid out; interns carry nothing."><Select id="lp-year" value={String(chosen)} onChange={(e) => setYear(Number(e.target.value))} options={open.map((y) => [String(y), String(y)])} /></Field>
            <Table bare pager={false} columns={previewColumns} rows={rows} rowKey={(r) => r.id} empty="Nobody was employed that year." />
            {canEdit && <p><button className="ds-btn ds-btn--primary" type="button" id="lp-close" onClick={close}>{`Close ${chosen}`}</button></p>}
          </>
        ) : <p className="text-muted" id="lp-close-none">{`Every year that has ended is closed. The ${thisYear} leave year can be closed from 1 January ${thisYear + 1}.`}</p>}
        {closed.length > 0 && <ul id="lp-closed">{closed.map(([y, c]) => <li key={y}>{`${y}: closed by ${c.closedByName} on ${formatDay(c.closedOn, true)}`}</li>)}</ul>}
      </Card>
      <Card id="leave-history" title="History of changes">
        {history.length ? <ul id="lp-history">{history.map((h) => <li key={`${h.at}${h.what}`}>{`${formatDay(h.at.slice(0, 10), true)}: ${h.who}. ${h.what}`}</li>)}</ul> : <p className="text-muted" id="lp-history-none">No changes yet: these are the sample numbers.</p>}
      </Card>
      <EditRule key={edit ? `${edit.band}${edit.type}` : "none"} edit={edit} onClose={() => setEdit(null)} />
    </>
  );
}

export default function LeavePolicy() {
  const { session, user, role } = useSession();
  const stale = session && !user;
  useLayoutEffect(() => { if (stale) signOutNow(); }, [stale]);
  useLayoutEffect(() => { document.documentElement.dataset.role = role?.key ?? "admin"; }, [role]);
  useLayoutEffect(() => { document.title = tabTitle("Leave policy"); window.scrollTo(0, 0); }, []);
  if (!session || !user) return <Navigate to={pageUrl("auth/login.html")} replace />;
  if (!mayOpenLeavePolicy()) return <Navigate to={pageUrl("errors/403.html")} replace />;
  return <Shell page={LEAVE_POLICY_PAGE} title="Leave policy"><Content /></Shell>;
}