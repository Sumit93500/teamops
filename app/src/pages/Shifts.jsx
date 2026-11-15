// Shifts (SH1, 2026-11-15): pages/attendance/shifts.html, which was a sample page, built on data/shifts-store.js,
// shift-assignments.js and shift-settings.js. HR and the Admin (shifts:manage) see every shift with its rules in plain
// words, who is on it today, create and edit one (a live preview of the rules, the night-shift mark, each field's own
// message), deactivate one nobody is on (asked first; refused with who is on it), assign people in bulk, set a
// department's default, and read every assignment and swap (a date range). The Admin (settings:edit) also sets when the
// shift rules start, the late-mark rule and comp-off.
import { useState } from "react";
import { getAllUsers, getAllDepartments, getUser } from "../../../assets/js/data/store.js";
import { formatDay, plural } from "../../../assets/js/ui/leave-view.js";
import { getShifts, getShift, createShift, updateShift, deactivateShift, reactivateShift, shiftProblems, shiftSummary, shiftHours, WEEKDAYS, GENERAL_ID } from "../../../assets/js/data/shifts-store.js";
import { assignmentReader, allAssignmentRows, allSwaps, allDepartmentDefaults, setDepartmentShift, departmentShiftOn } from "../../../assets/js/data/shift-assignments.js";
import { shiftRulesFrom, setShiftRulesFrom, latePolicy, setLatePolicy, compOffRule, setCompOff } from "../../../assets/js/data/shift-settings.js";
import { officeNow, toMin, DAY } from "../../../assets/js/data/shift-engine.js";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import Modal from "../components/Modal.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { useToast } from "../ui/Toast.jsx";
import { PageHeader, Card, Pill, KpiCard } from "../components/Layout.jsx";
import { Field, Input, Select, Switch } from "../components/Form.jsx";
import { DateRange, FilterBar, FilterSelect, FilterSearch } from "../components/Controls.jsx";
import { EmptyState, NO_DATA } from "../components/Basics.jsx";
import { AssignShiftModal, MOON } from "../ui/shifts.jsx";
import { usePhone } from "../ui/phone.jsx";

const PAGE = "attendance/shifts.html";
const NUM = ["graceMin", "breakMin", "absentBelowHours", "halfDayBelowHours", "shortLeaveBelowHours", "earliestCheckInMin", "overtimeAfterMin", "overtimeMinBlockMin"];
const BLANK = { name: "", start: "09:00", end: "18:00", graceMin: "15", breakMin: "60", absentBelowHours: "4", halfDayBelowHours: "6", shortLeaveBelowHours: "8", earliestCheckInMin: "60", overtimeAfterMin: "30", overtimeMinBlockMin: "30", weeklyOffDays: [0, 6] };
const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];
const asForm = (s) => ({ ...Object.fromEntries(Object.keys(BLANK).map((k) => [k, k === "weeklyOffDays" ? [...s[k]] : String(s[k])])) });
const asFields = (f) => ({ ...f, ...Object.fromEntries(NUM.map((k) => [k, f[k] === "" ? NaN : Number(f[k])])) });

function ShiftForm({ editing, onClose }) {
  const { userId } = useSession();
  const toast = useToast();
  const [f, setF] = useState(editing ? asForm(editing) : BLANK);
  const [tried, setTried] = useState(false);
  const [err, setErr] = useState(null);
  const fields = asFields(f);
  const problems = shiftProblems(fields, editing?.id ?? null);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErr(null); };
  const toggleDay = (d) => setF((s) => ({ ...s, weeklyOffDays: s.weeklyOffDays.includes(d) ? s.weeklyOffDays.filter((x) => x !== d) : [...s.weeklyOffDays, d] }));
  const night = toMin(f.start) !== null && toMin(f.end) !== null && toMin(f.end) < toMin(f.start);
  const length = toMin(f.start) !== null && toMin(f.end) !== null && f.start !== f.end ? (toMin(f.end) - toMin(f.start) + DAY) % DAY : null;
  const preview = Object.keys(problems).length ? null : shiftSummary(fields);
  const save = (e) => {
    e.preventDefault();
    setTried(true);
    if (Object.keys(problems).length) { document.getElementById(`shift-${Object.keys(problems)[0]}`)?.focus(); return; }
    const r = editing ? updateShift(userId, editing.id, fields) : createShift(userId, fields);
    if (!r.ok) { setErr({ field: r.field, text: r.error }); return; }
    toast(editing ? `${r.record.name} saved. The new rules apply from today; days already worked keep theirs.` : `${r.record.name} added.`, "success");
    bump(); onClose();
  };
  const e = (k) => (err?.field === k ? err.text : tried ? problems[k] : undefined);
  const num = (k, label, hint, step = "1") => (
    <Field id={`shift-${k}`} label={label} required error={e(k)} hint={hint}><Input id={`shift-${k}`} type="number" inputMode="decimal" step={step} min="0" value={f[k]} onChange={set(k)} /></Field>
  );
  return (
    <Modal open onClose={onClose} id="shift-modal" size="lg" title={editing ? `Edit ${editing.name}` : "New shift"}
      desc={editing ? "Changes apply from today. Days already worked keep the rules they were worked under." : "Times are the office's clock (India). A shift ending before it starts runs past midnight."}
      footer={<><button className="ds-btn" type="button" onClick={onClose}>Cancel</button><button className="ds-btn ds-btn--primary" type="submit" form="shift-form">{editing ? "Save changes" : "Add shift"}</button></>}>
      <form id="shift-form" noValidate onSubmit={save}>
        <div className="ds-form-grid">
          <Field id="shift-name" label="Name" required error={e("name")}><Input id="shift-name" maxLength={40} value={f.name} onChange={set("name")} /></Field>
          <div className="shift-times">
            <Field id="shift-start" label="Starts" required error={e("start")}><Input id="shift-start" type="time" value={f.start} onChange={set("start")} /></Field>
            <Field id="shift-end" label="Ends" required error={e("end")} hint={night ? "The next morning." : undefined}><Input id="shift-end" type="time" value={f.end} onChange={set("end")} /></Field>
          </div>
          <div className="ds-field--full shift-form__mark" aria-live="polite">
            {night && <Pill tone="info" icon={MOON} id="night-mark">Night shift: one day, the date it starts on</Pill>}
            {length !== null && <span className="text-muted">{`${Math.floor(length / 60)} h${length % 60 ? ` ${length % 60} min` : ""} long`}</span>}
          </div>
          {num("graceMin", "Grace (minutes)", "Late after the start plus this.")}
          {num("breakMin", "Unpaid break (minutes)", "Taken off the hours worked.")}
          {num("earliestCheckInMin", "Check-in opens (minutes before)", undefined)}
          {num("shortLeaveBelowHours", "Short leave under (hours)", "Equal to the half-day hours: no short leave.", "0.25")}
          {num("halfDayBelowHours", "Half day under (hours)", undefined, "0.25")}
          {num("absentBelowHours", "Absent under (hours)", "Under half the shift.", "0.25")}
          {num("overtimeAfterMin", "Overtime after the end (minutes)", undefined)}
          {num("overtimeMinBlockMin", "Overtime blocks (minutes)", undefined)}
          <fieldset className="ds-field ds-field--full shift-days" aria-describedby={e("weeklyOffDays") ? "shift-weeklyOffDays-error" : undefined}>
            <legend className="ds-field__label">Weekly off</legend>
            <div className="shift-days__row" id="shift-weeklyOffDays" tabIndex={-1}>
              {MON_FIRST.map((d) => <label key={d} className="ds-check"><input type="checkbox" checked={f.weeklyOffDays.includes(d)} onChange={() => toggleDay(d)} />{WEEKDAYS[d].slice(0, 3)}</label>)}
            </div>
            {e("weeklyOffDays") && <span className="ds-field__error" id="shift-weeklyOffDays-error" role="alert">{e("weeklyOffDays")}</span>}
          </fieldset>
          <div className="ds-field--full shift-preview" id="shift-preview" aria-live="polite">
            <span className="shift-preview__title">In plain words</span>
            {preview ? <p>{preview.join(" ")}</p> : <p className="shift-preview__fix">{`To see the rules, fix ${plural(Object.keys(problems).length, "field", "fields")}: `}{Object.values(problems).join(" ")}</p>}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function DepartmentDefaults({ canAssign }) {
  const { userId } = useSession();
  const toast = useToast();
  const today = officeNow().date;
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState({ shiftId: "", from: today });
  const [err, setErr] = useState(null);
  const rows = useData(() => getAllDepartments().map((d) => {
    const later = allDepartmentDefaults().filter((x) => x.departmentId === d.code && x.from > today).sort((a, b) => a.from.localeCompare(b.from))[0];
    return { ...d, now: getShift(departmentShiftOn(d.code, today)), next: later ? { ...later, shift: getShift(later.shiftId) } : null };
  }), []);
  const open = (d) => { setEditing(d); setF({ shiftId: d.now.id, from: shiftRulesFrom() > today ? shiftRulesFrom() : today }); setErr(null); };
  const save = (e) => {
    e.preventDefault();
    const r = setDepartmentShift(userId, editing.code, f.shiftId, f.from);
    if (!r.ok) { setErr({ field: r.field ?? "shiftId", text: r.error }); return; }
    toast(`${editing.name}: ${getShift(f.shiftId).name} from ${formatDay(f.from, true)} for everyone without their own shift.`, "success");
    bump(); setEditing(null);
  };
  const columns = [
    { key: "name", label: "Department", render: (d) => <span className="table__user-name">{d.name}</span>, sort: (d) => d.name },
    { key: "now", label: "Default today", render: (d) => d.now.name },
    { key: "next", label: "Next change", render: (d) => (d.next ? `${d.next.shift.name} from ${formatDay(d.next.from, true)}` : "None") },
    ...(canAssign ? [{ key: "act", label: "Actions", actions: true, render: (d) => <button className="ds-btn ds-btn--sm" type="button" data-dept={d.code} onClick={() => open(d)}>Change</button> }] : []),
  ];
  return (
    <Card id="dept-defaults" title="Department defaults" meta="Everyone without a shift of their own works their department's">
      <Table bare pageSize={10} columns={columns} rows={rows} rowKey={(d) => d.code} empty="No departments yet." />
      {editing && (
        <Modal open onClose={() => setEditing(null)} id="dept-shift-modal" size="sm" title={`${editing.name}'s default shift`} desc="People with a shift of their own keep it."
          footer={<><button className="ds-btn" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="ds-btn ds-btn--primary" type="submit" form="dept-shift-form">Save</button></>}>
          <form id="dept-shift-form" noValidate onSubmit={save}>
            <div className="ds-form-grid">
              <Field id="dept-shift" label="Shift" required error={err?.field === "shiftId" ? err.text : undefined}><Select id="dept-shift" value={f.shiftId} onChange={(x) => setF({ ...f, shiftId: x.target.value })} options={getShifts().map((s) => [s.id, `${s.name} (${shiftHours(s)})`])} /></Field>
              <Field id="dept-from" label="From" required error={err?.field === "from" ? err.text : undefined}><Input id="dept-from" type="date" min={today} value={f.from} onChange={(x) => setF({ ...f, from: x.target.value })} /></Field>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

function Changes() {
  const today = officeNow().date;
  const [range, setRange] = useState({ preset: "", from: "", to: "" });
  const [kind, setKind] = useState("");
  const rows = useData(() => [
    ...allAssignmentRows().map((r) => ({ ...r, kind: "assignment", start: r.from, end: r.to ?? "9999-12-31" })),
    ...allSwaps().map((s) => ({ ...s, kind: "swap", start: s.date, end: s.date })),
  ].sort((a, b) => b.seq - a.seq), []);
  const shown = rows.filter((r) => (!kind || r.kind === kind) && (!range.preset || (r.start <= range.to && r.end >= range.from)));
  const name = (id) => getUser(id)?.name ?? id;
  const columns = [
    { key: "who", label: "Employee", render: (r) => <span className="table__user-name">{name(r.userId)}</span>, sort: (r) => name(r.userId) },
    { key: "kind", label: "Change", render: (r) => (r.kind === "swap" ? <Pill tone="info">Date swap</Pill> : <Pill>Assignment</Pill>), sort: (r) => r.kind },
    { key: "shift", label: "Shift", render: (r) => getShift(r.shiftId)?.name ?? r.shiftId },
    { key: "dates", label: "Dates", render: (r) => (r.kind === "swap" ? formatDay(r.date, true) : `${formatDay(r.from, true)} to ${r.to ? formatDay(r.to, true) : "no end"}`), sort: (r) => r.start },
    { key: "why", label: "Reason", render: (r) => r.reason || r.note || "—" },
    { key: "by", label: "By", render: (r) => name(r.by) },
    { key: "state", label: "Status", render: (r) => (r.cancelled ? <Pill>Cancelled</Pill> : r.end < today ? <Pill>Past</Pill> : <Pill tone="success">In force</Pill>) },
  ];
  return (
    <Card id="shift-changes" title="Assignments and swaps" meta={`Showing ${shown.length} of ${rows.length}`}>
      <FilterBar label="Filter the changes" active={Boolean(kind || range.preset)} onClearAll={() => { setKind(""); setRange({ preset: "", from: "", to: "" }); }}>
        <DateRange value={range} onChange={setRange} today={today} />
        <FilterSelect label="Change" value={kind} onChange={setKind} allLabel="All changes" options={[{ value: "assignment", label: "Assignments" }, { value: "swap", label: "Date swaps" }]} />
      </FilterBar>
      {!rows.length ? <EmptyState title="No assignments yet" text="Everyone is on their department's default shift, or General. Assign a shift to start." />
        : !shown.length ? <EmptyState title={NO_DATA} text="No assignment or swap touches these dates." />
        : <Table bare pageSize={10} columns={columns} rows={shown} rowKey={(r) => `${r.kind}-${r.id}`} />}
    </Card>
  );
}

function Settings() {
  const { userId } = useSession();
  const toast = useToast();
  const today = officeNow().date;
  const s = useData(() => ({ from: shiftRulesFrom(), late: latePolicy(), comp: compOffRule() }), []);
  const [from, setFrom] = useState(s.from);
  const [every, setEvery] = useState(String(s.late.every));
  const [comp, setComp] = useState({ minutesPerDay: String(s.comp.minutesPerDay), expiryDays: String(s.comp.expiryDays) });
  const [err, setErr] = useState(null);
  const done = (r, text, field) => { if (!r.ok) { setErr({ field: r.field ? `${field}-${r.field}` : field, text: r.error }); return; } setErr(null); toast(text, "success"); bump(); };
  const e = (k) => (err?.field === k ? err.text : undefined);
  return (
    <Card id="shift-settings" title="Shift settings" meta="The Admin's">
      <div className="shift-settings">
        <form className="shift-settings__row" noValidate onSubmit={(x) => { x.preventDefault(); done(setShiftRulesFrom(userId, from), `Shift rules start on ${formatDay(from, true)}.`, "from"); }}>
          <Field id="set-from" label="Shift rules start on" error={e("from-date") ?? e("from")} hint="The 1st of a month. Before it attendance and pay keep today's rules exactly."><Input id="set-from" type="date" min={today} value={from} onChange={(x) => setFrom(x.target.value)} /></Field>
          <button className="ds-btn" type="submit">Save date</button>
        </form>
        <div className="shift-settings__row">
          <Switch id="set-late" label={`Late marks cost pay: every ${s.late.every === 3 ? "3rd" : `${s.late.every}th`} late mark in a month = half a day`} checked={s.late.on} onChange={(on) => done(setLatePolicy(userId, { on, every: Number(every) }), on ? "The late-mark rule is on." : "The late-mark rule is off.", "late")} />
          <Field id="set-every" label="Late marks per half day" error={e("late-every")} hint="A change applies from today; earlier days keep the policy they had."><Input id="set-every" type="number" min="2" max="10" value={every} onChange={(x) => setEvery(x.target.value)} onBlur={() => Number(every) !== s.late.every && done(setLatePolicy(userId, { on: s.late.on, every: Number(every) }), `Every ${every} late marks.`, "late")} /></Field>
        </div>
        <div className="shift-settings__row">
          <Switch id="set-comp" label="Approved overtime earns comp-off days (added to earned leave)" checked={s.comp.on} onChange={(on) => done(setCompOff(userId, { on, minutesPerDay: Number(comp.minutesPerDay), expiryDays: Number(comp.expiryDays) }), on ? "Comp-off is on." : "Comp-off is off.", "comp")} />
          <Field id="set-comp-min" label="Overtime minutes per day" error={e("comp-minutesPerDay")}><Input id="set-comp-min" type="number" min="60" max="720" value={comp.minutesPerDay} onChange={(x) => setComp({ ...comp, minutesPerDay: x.target.value })} /></Field>
          <Field id="set-comp-exp" label="Expires after (days)" error={e("comp-expiryDays")}><Input id="set-comp-exp" type="number" min="7" max="365" value={comp.expiryDays} onChange={(x) => setComp({ ...comp, expiryDays: x.target.value })} /></Field>
          <button className="ds-btn" type="button" onClick={() => done(setCompOff(userId, { on: s.comp.on, minutesPerDay: Number(comp.minutesPerDay), expiryDays: Number(comp.expiryDays) }), "Comp-off rule saved.", "comp")}>Save rule</button>
        </div>
        <p className="text-muted shift-settings__note">Overtime is approved by each person's manager (HR or the Admin for people without one). Paying for overtime isn't worked out yet: that rule is Finance's.</p>
      </div>
    </Card>
  );
}

function Content() {
  const { userId } = useSession();
  const canAssign = useCan("shifts:assign"), canSettings = useCan("settings:edit");
  const confirm = useConfirm();
  const toast = useToast();
  const today = officeNow().date;
  const [form, setForm] = useState(null);   // { editing } while open
  const [bulk, setBulk] = useState(false);
  const [status, setStatus] = useState("active");
  const [q, setQ] = useState("");
  const phone = usePhone();   // on a phone the long rules go behind Details: the card shows hours and who is on it
  const d = useData(() => {
    const read = assignmentReader();
    const people = getAllUsers().filter((u) => u.status !== "inactive");
    const on = new Map();
    for (const u of people) { const id = read(u.id, today).shiftId; on.set(id, [...(on.get(id) ?? []), u.name]); }
    return { shifts: getShifts({ includeInactive: true }).map((s) => ({ ...s, people: (on.get(s.id) ?? []).sort() })), from: shiftRulesFrom(), total: people.length };
  }, [today]);
  const shown = d.shifts.filter((s) => (status === "" || (status === "active" ? s.active : !s.active)) && (!q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase())));
  const toggle = async (s) => {
    if (s.active) {
      if (!(await confirm({ message: `Deactivate ${s.name}?\nNobody can be assigned to it until it's active again. Days already worked keep it.`, confirmLabel: "Deactivate", danger: true }))) return;
      const r = deactivateShift(userId, s.id);
      if (!r.ok) { toast(r.error, "danger"); return; }
      toast(`${s.name} is inactive.`, "success");
    } else {
      const r = reactivateShift(userId, s.id);
      if (!r.ok) { toast(r.error, "danger"); return; }
      toast(`${s.name} is active again.`, "success");
    }
    bump();
  };
  const columns = [
    { key: "name", label: "Shift", sort: (s) => s.name, render: (s) => (
      <div className="shift-name">
        <span className="table__user-name">{s.crossesMidnight && <svg className="icon shift-cell__icon" viewBox="0 0 24 24" aria-hidden="true"><path d={MOON} /></svg>}{s.name}</span>
        <span className="shift-name__pills">{s.crossesMidnight && <Pill tone="info">Overnight</Pill>}{s.sample && <Pill tone="warning">Sample</Pill>}{s.id === GENERAL_ID && <Pill>Default</Pill>}</span>
      </div>
    ) },
    { key: "hours", label: "Hours", render: (s) => shiftHours(s), sort: (s) => s.start },
    { key: "rules", label: "Rules", render: (s) => <span className="shift-rules">{shiftSummary(s).slice(1).join(" ")}</span> },
    { key: "people", label: "On it today", sort: (s) => s.people.length, render: (s) => (s.people.length ? <span title={s.people.join(", ")}>{plural(s.people.length, "person", "people")}</span> : <span className="text-muted">Nobody</span>) },
    { key: "status", label: "Status", sort: (s) => (s.active ? 0 : 1), render: (s) => (s.active ? <Pill tone="success">Active</Pill> : <Pill>Inactive</Pill>) },
    { key: "actions", label: "Actions", actions: true, render: (s) => (
      <div className="ds-btn-group">
        <button className="ds-btn ds-btn--sm" type="button" data-edit={s.id} onClick={() => setForm({ editing: s })} aria-label={`Edit ${s.name}`}>Edit</button>
        {s.id !== GENERAL_ID && <button className="ds-btn ds-btn--sm ds-btn--ghost" type="button" data-toggle={s.id} onClick={() => toggle(s)} aria-label={`${s.active ? "Deactivate" : "Reactivate"} ${s.name}`}>{s.active ? "Deactivate" : "Reactivate"}</button>}
      </div>
    ) },
  ];
  const ordered = phone ? ["name", "hours", "people", "status", "rules", "actions"].map((k) => columns.find((c) => c.key === k)) : columns;
  const started = today >= d.from;
  const night = d.shifts.filter((s) => s.active && s.crossesMidnight).reduce((n, s) => n + s.people.length, 0);
  return (
    <>
      <PageHeader title="Shifts" subtitle="Working hours, grace, half-day and overtime rules, and who works which shift"
        breadcrumb={[{ label: "Attendance", to: "/pages/attendance/team-attendance.html" }, { label: "Shifts" }]}
        actions={<>{canAssign && <button className="ds-btn" type="button" id="bulk-assign" onClick={() => setBulk(true)}>Assign shift</button>}<button className="ds-btn ds-btn--primary" type="button" id="new-shift" onClick={() => setForm({ editing: null })}>New shift</button></>} />
      <div className={`ds-note ${started ? "ds-note--info" : "ds-note--warning"}`} id="rules-start" role="note">
        {started ? <><strong>{`Shift rules apply since ${formatDay(d.from, true)}.`}</strong>{" "}Each day is read by the person's shift on that date; earlier days keep the rules they had.</>
          : <><strong>{`Shift rules start on ${formatDay(d.from, true)}.`}</strong>{" "}Until then everyone keeps today's rules (the same as General). Assignments made now take effect from that date.</>}
      </div>
      <div className="ds-grid" role="group" aria-label="Key numbers" id="shift-kpis">
        <KpiCard id="k-shifts" label="Active shifts" value={String(d.shifts.filter((s) => s.active).length)} />
        <KpiCard id="k-general" label="On General today" value={String(d.shifts.find((s) => s.id === GENERAL_ID)?.people.length ?? 0)} />
        <KpiCard id="k-night" label="On a night shift today" value={String(night)} />
        <KpiCard id="k-people" label="Active people" value={String(d.total)} />
      </div>
      <FilterBar label="Filter the shifts" active={Boolean(status !== "active" || q)} onClearAll={() => { setStatus("active"); setQ(""); }}>
        <FilterSelect label="Status" value={status} onChange={setStatus} allLabel="All shifts" options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
        <FilterSearch label="Search" value={q} onChange={setQ} placeholder="Search shifts" />
      </FilterBar>
      <Card id="shift-list" title="Shifts" meta={`Showing ${shown.length} of ${d.shifts.length}`}>
        {shown.length ? <Table bare pageSize={10} columns={ordered} rows={shown} rowKey={(s) => s.id} rowProps={(s) => ({ "data-shift": s.id })} />
          : <EmptyState title="No shifts match" text={status === "inactive" ? "No shift is inactive." : "Try another search."} />}
      </Card>
      <DepartmentDefaults canAssign={canAssign} />
      <Changes />
      {canSettings && <Settings />}
      {form && <ShiftForm editing={form.editing} onClose={() => setForm(null)} />}
      {canAssign && <AssignShiftModal open={bulk} onClose={() => setBulk(false)} />}
    </>
  );
}

export default function Shifts() {
  return <Frame page={PAGE}><Content /></Frame>;
}