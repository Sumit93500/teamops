// SH1 (2026-11-15): the shift pieces the attendance pages, dashboards and profiles share. DOM helpers for the ported
// pages' Nodes tables (shiftBadge, shiftCell, otCell) and React parts: the "Your shift" line, the date swap, HR's
// "Complete day", the assign dialog and a profile's shift card with its history. Tokens only (design system classes).
import { useMemo, useState } from "react";
import { getUser, getAllUsers, getAllDepartments } from "../../../assets/js/data/store.js";
import { el, formatDay } from "../../../assets/js/ui/leave-view.js";
import { dayBadge } from "../../../assets/js/ui/attendance-view.js";
import { getShifts, getShift, shiftSummary, shiftHours, GENERAL_ID } from "../../../assets/js/data/shifts-store.js";
import { shiftOn, historyFor, assignShift, assignMany, swapShift, maySwap, mayAssign, endAssignment, REASON_MAX } from "../../../assets/js/data/shift-assignments.js";
import { shiftRulesFrom, shiftRulesApply } from "../../../assets/js/data/shift-settings.js";
import { nextCheckIn, completeShiftDay } from "../../../assets/js/data/shift-punch.js";
import { officeNow, addDays } from "../../../assets/js/data/shift-engine.js";
import { useData, useSession } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import Modal from "../components/Modal.jsx";
import Table from "../components/Table.jsx";
import { useToast } from "./Toast.jsx";
import { Card, Pill } from "../components/Layout.jsx";
import { Field, Input, Select, TextArea, Kv } from "../components/Form.jsx";
import { DateRange } from "../components/Controls.jsx";
import { EmptyState, NO_DATA } from "../components/Basics.jsx";
import "../design/shifts.css";
import "../design/visits.css";   // CV1

export const MOON = "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z";
export const SUN = "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4";
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayWords = (iso) => `${WEEKDAY[new Date(`${iso}T00:00:00Z`).getUTCDay()]} ${formatDay(iso, false)}`;

// "1h 30m", "30m", "1h", "–" (the Hours column's look)
export function otText(minutes) {
  if (!minutes) return "–";
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return [h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ");
}
// The status badge of a shift day: short leave and weekly off are the shift's own; the rest are the old badges.
// CV1: a day under an approved visit: its own chip (a pin icon and a hatched look, not colour alone); "Visit not started" and "OK needed" are the warning look.
const VISIT_PIN = "M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5";
export function visitBadge(day) {
  const planned = day.status === "visit-planned", half = day.status === "half-day";
  const chip = el("span", `visit-chip${planned ? " visit-chip--warn" : half ? " visit-chip--half" : ""}`);
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "icon"); icon.setAttribute("viewBox", "0 0 24 24"); icon.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path"); path.setAttribute("d", VISIT_PIN); icon.append(path);
  chip.append(icon, planned ? (day.visit?.awaitingOk ? "Visit: OK needed" : "Visit not started") : half ? "On-site, half day" : "On-site / Client visit");
  chip.title = day.visit ? `${day.visit.siteName}${planned ? (day.visit.awaitingOk ? ": location unavailable, waiting for an OK" : ": no check-in yet") : ""}` : "On a visit";
  return chip;
}
export function shiftBadge(day) {
  if (day.onSite) return visitBadge(day);
  if (day.status === "short-leave") return el("span", "badge badge--warning badge--dot", "Short leave");
  if (day.status === "weekly-off") return el("span", "badge badge--dot", "Weekly off");
  if (day.status === "not-joined") return el("span", "badge badge--dot", "Not yet joined");   // F2: the old badge says "Before joining"
  if (day.status === "left") return el("span", "badge badge--dot", "After leaving");
  const badge = dayBadge(day);
  if (day.overdue && day.lateAfter) badge.title = `Not checked in by ${day.lateAfter}`;
  return badge;
}
// The badge plus "Incomplete" (a day without a check-out, under the shift rules: HR completes it).
export function statusNodes(day) {
  const nodes = [shiftBadge(day)];
  if (day.incomplete && (day.rules === "shift" || day.onSite)) {   // CV1b: a visit day with no check-out is Incomplete too
    const tag = el("span", "badge badge--warning badge--square", "Incomplete");
    tag.title = "No check-out recorded: HR can complete the day";
    nodes.push(" ", tag);
  }
  return nodes;
}
// The Shift column: the name (a moon for a night shift), the hours under it, and a swap's reason.
export function shiftCell(day) {
  const td = el("td");
  const wrap = el("div", "shift-cell");
  const name = el("span", "shift-cell__name", day.shiftName ?? "General");
  if (day.crossesMidnight) {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "icon shift-cell__icon"); icon.setAttribute("viewBox", "0 0 24 24"); icon.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path"); path.setAttribute("d", MOON); icon.append(path);
    name.prepend(icon);
    name.title = "Night shift: the check-out is the next morning";
  }
  const sub = el("span", "shift-cell__sub", day.shiftStart ? `${day.shiftStart}–${day.shiftEnd}${day.crossesMidnight ? " +1" : ""}` : "");
  if (day.crossesMidnight) sub.title = `${day.shiftStart} to ${day.shiftEnd} the next morning`;
  wrap.append(name, sub);
  if (day.shiftSource === "swap") {
    const sw = el("span", "shift-cell__swap", "Swapped for this date");
    if (day.swapReason) sw.title = day.swapReason;
    wrap.append(sw);
  }
  td.append(wrap);
  return td;
}
export const otCell = (day) => el("td", "table__num", otText(day.overtimeMinutes));

// "Your shift: Night, 22:00 to 07:00" and the next check-in window.
export function ShiftLine({ userId, id = "my-shift", compact = false }) {
  const info = useData(() => {
    const now = officeNow();
    const on = shiftOn(userId, now.date);
    const shift = shiftRulesApply(now.date) ? on.shift : getShift(GENERAL_ID, now.date);
    return { shift, next: nextCheckIn(userId, now), now, upcoming: !shiftRulesApply(now.date) && on.shift.id !== GENERAL_ID ? { shift: on.shift, from: shiftRulesFrom() } : null };
  }, [userId]);
  if (!info.shift) return null;
  const { shift, next, now } = info;
  const when = !next ? "No check-in is due in the next month." : next.openNow ? `Check-in is open now, until ${next.closes}${next.crossesMidnight ? " (next morning)" : ""}.`
    : `Next check-in: ${next.date === now.date ? "today" : next.date === addDays(now.date, 1) ? "tomorrow" : dayWords(next.date)}, opens at ${next.opens}.`;
  return (
    <div className={`shift-line${compact ? " shift-line--compact" : ""}`} id={id} role="note">
      <span className="shift-line__icon" aria-hidden="true"><svg className="icon" viewBox="0 0 24 24"><path d={shift.crossesMidnight ? MOON : SUN} /></svg></span>
      <span className="shift-line__text"><strong>{`Your shift: ${shift.name}, ${shift.start} to ${shift.end}${shift.crossesMidnight ? " (next morning)" : ""}`}</strong><span className="shift-line__sub">{when}{info.upcoming ? ` From ${formatDay(info.upcoming.from, true)}: ${info.upcoming.shift.name}.` : ""}</span></span>
    </div>
  );
}

const shiftOptions = (all = false) => getShifts({ includeInactive: all }).map((s) => [s.id, `${s.name} (${shiftHours(s)})`]);

// A manager's (or HR's) one-date swap. people: [{ id, name }] the actor may swap.
export function SwapShiftModal({ open, onClose, people, initialUser = "" }) {
  const { userId } = useSession();
  const toast = useToast();
  const today = officeNow().date;
  const blank = { userId: initialUser || people[0]?.id || "", date: addDays(today, 1), shiftId: "", reason: "" };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErr(null); };
  const current = f.userId && f.date ? shiftOn(f.userId, f.date) : null;
  const save = (e) => {
    e.preventDefault();
    const r = swapShift(userId, f.userId, f.date, f.shiftId, f.reason);
    if (!r.ok) { setErr({ field: r.field ?? "shiftId", text: r.error }); return; }
    toast(`${getUser(f.userId)?.name}: ${getShift(f.shiftId)?.name} on ${formatDay(f.date, true)}.`, "success");
    bump(); setF(blank); onClose();
  };
  const e = (k) => (err?.field === k ? err.text : undefined);
  return (
    <Modal open={open} onClose={onClose} id="swap-shift-modal" size="md" title="Swap a shift for one date" desc="The person works another shift on that date only; the days around it don't change."
      footer={<><button className="ds-btn" type="button" onClick={onClose}>Cancel</button><button className="ds-btn ds-btn--primary" type="submit" form="swap-shift-form">Swap shift</button></>}>
      <form id="swap-shift-form" noValidate onSubmit={save}>
        <div className="ds-form-grid">
          <Field id="swap-user" label="Employee" required error={e("userId")}><Select id="swap-user" value={f.userId} onChange={set("userId")} options={people.map((p) => [p.id, p.name])} /></Field>
          <Field id="swap-date" label="Date" required error={e("date")}><Input id="swap-date" type="date" min={today} value={f.date} onChange={set("date")} /></Field>
          <Field id="swap-shift" label="Shift that day" required error={e("shiftId")} hint={current ? `Now: ${current.shift.name} (${shiftHours(current.shift)})` : undefined}>
            <Select id="swap-shift" value={f.shiftId} onChange={set("shiftId")} placeholder="Choose a shift" options={shiftOptions()} />
          </Field>
          <Field id="swap-reason" label="Reason" required full error={e("reason")} hint="The employee and HR see it."><TextArea id="swap-reason" rows={2} maxLength={REASON_MAX} value={f.reason} onChange={set("reason")} /></Field>
        </div>
      </form>
    </Modal>
  );
}

// HR / Admin: add the missing check-out of an incomplete day.
export function CompleteDayModal({ day, onClose }) {
  const { userId } = useSession();
  const toast = useToast();
  const [f, setF] = useState({ time: day?.crossesMidnight ? day.shiftEnd : day?.shiftEnd ?? "", note: "" });
  const [err, setErr] = useState(null);
  if (!day) return null;
  const save = (e) => {
    e.preventDefault();
    const r = completeShiftDay(userId, day.userId, day.date, f.time, f.note);
    if (!r.ok) { setErr({ field: r.field ?? "time", text: r.error }); return; }
    toast(`${getUser(day.userId)?.name}'s ${formatDay(day.date, true)} is complete.`, "success");
    bump(); onClose();
  };
  const e = (k) => (err?.field === k ? err.text : undefined);
  return (
    <Modal open onClose={onClose} id="complete-day-modal" size="sm" title="Complete the day" desc={`${getUser(day.userId)?.name}, ${formatDay(day.date, true)}: checked in at ${day.checkIn} on ${day.shiftName} (${day.shiftStart} to ${day.shiftEnd}), no check-out.`}
      footer={<><button className="ds-btn" type="button" onClick={onClose}>Cancel</button><button className="ds-btn ds-btn--primary" type="submit" form="complete-day-form">Complete day</button></>}>
      <form id="complete-day-form" noValidate onSubmit={save}>
        <div className="ds-form-grid">
          <Field id="complete-time" label="Check-out" required error={e("time")} hint={day.crossesMidnight ? "The next morning." : undefined}><Input id="complete-time" type="time" value={f.time} onChange={(x) => { setF({ ...f, time: x.target.value }); setErr(null); }} /></Field>
          <Field id="complete-note" label="Reason" required full error={e("note")}><TextArea id="complete-note" rows={2} maxLength={200} value={f.note} onChange={(x) => { setF({ ...f, note: x.target.value }); setErr(null); }} /></Field>
        </div>
      </form>
    </Modal>
  );
}

// HR / Admin: put one person or several on a shift from a date (optionally to a date).
export function AssignShiftModal({ open, onClose, userIds = null }) {
  const { userId } = useSession();
  const toast = useToast();
  const today = officeNow().date;
  const many = !userIds;
  const everyone = useMemo(() => getAllUsers().filter((u) => u.status !== "inactive" && u.id !== userId).sort((a, b) => a.name.localeCompare(b.name)), [userId, open]);   // eslint-disable-line react-hooks/exhaustive-deps
  const depts = useMemo(() => getAllDepartments(), []);
  const blank = { shiftId: "", from: shiftRulesFrom() > today ? shiftRulesFrom() : today, to: "", note: "", picked: [], dept: "", q: "" };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErr(null); };
  const list = everyone.filter((u) => (!f.dept || u.department === f.dept) && (!f.q.trim() || u.name.toLowerCase().includes(f.q.trim().toLowerCase())));
  const toggle = (id) => setF((s) => ({ ...s, picked: s.picked.includes(id) ? s.picked.filter((x) => x !== id) : [...s.picked, id] }));
  const close = () => { setF(blank); setErr(null); onClose(); };
  const save = (e) => {
    e.preventDefault();
    const ids = many ? f.picked : userIds;
    const r = ids.length === 1 && !many ? assignShift(userId, ids[0], f.shiftId, f.from, f.to || null, f.note) : assignMany(userId, ids, f.shiftId, f.from, f.to || null, f.note);
    if (!r.ok) { setErr({ field: r.field ?? "shiftId", text: r.error }); return; }
    const s = getShift(f.shiftId);
    toast(`${ids.length === 1 ? getUser(ids[0])?.name : `${ids.length} people`} on ${s?.name} from ${formatDay(f.from, true)}.`, "success");
    bump(); close();
  };
  const e = (k) => (err?.field === k ? err.text : undefined);
  const chosen = getShift(f.shiftId);
  return (
    <Modal open={open} onClose={close} id="assign-shift-modal" size={many ? "lg" : "md"} title={many ? "Assign a shift" : `Assign ${getUser(userIds?.[0])?.name ?? ""}'s shift`}
      desc="From the start date the person works this shift; days already worked keep theirs. Leave the end empty for no end."
      footer={<><button className="ds-btn" type="button" onClick={close}>Cancel</button><button className="ds-btn ds-btn--primary" type="submit" form="assign-shift-form">{many ? `Assign ${f.picked.length || ""}`.trim() : "Assign"}</button></>}>
      <form id="assign-shift-form" noValidate onSubmit={save}>
        <div className="ds-form-grid">
          <Field id="assign-shift" label="Shift" required error={e("shiftId")}><Select id="assign-shift" value={f.shiftId} onChange={set("shiftId")} placeholder="Choose a shift" options={shiftOptions()} /></Field>
          <Field id="assign-from" label="From" required error={e("from")}><Input id="assign-from" type="date" min={today} value={f.from} onChange={set("from")} /></Field>
          <Field id="assign-to" label="To (optional)" error={e("to")} hint="Empty: no end."><Input id="assign-to" type="date" min={f.from || today} value={f.to} onChange={set("to")} /></Field>
          <Field id="assign-note" label="Note (optional)" error={e("note")}><Input id="assign-note" maxLength={REASON_MAX} value={f.note} onChange={set("note")} /></Field>
          {chosen && <div className="ds-field--full shift-preview" id="assign-preview" aria-live="polite">{shiftSummary(chosen).join(" ")}</div>}
          {many && (
            <div className="ds-field ds-field--full">
              <span className="ds-field__label ds-field__label--required" id="assign-people-label">People</span>
              <div className="assign-people__tools">
                <div className="ds-control"><input aria-label="Search people" placeholder="Search by name" value={f.q} onChange={set("q")} /></div>
                <div className="ds-control ds-control--select"><select aria-label="Department" value={f.dept} onChange={set("dept")}><option value="">All departments</option>{depts.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}</select></div>
                <button className="ds-btn ds-btn--sm" type="button" onClick={() => setF((s) => ({ ...s, picked: [...new Set([...s.picked, ...list.map((u) => u.id)])] }))}>Select all shown</button>
                {f.picked.length > 0 && <button className="ds-btn ds-btn--sm ds-btn--ghost" type="button" onClick={() => setF((s) => ({ ...s, picked: [] }))}>Clear</button>}
              </div>
              <div className="assign-people" role="group" aria-labelledby="assign-people-label" id="assign-people">
                {list.length ? list.map((u) => (
                  <label key={u.id} className="ds-check assign-people__row"><input type="checkbox" checked={f.picked.includes(u.id)} onChange={() => toggle(u.id)} /><span>{u.name}</span><span className="assign-people__sub">{shiftOn(u.id, f.from || today).shift.name}</span></label>
                )) : <p className="text-muted">Nobody matches.</p>}
              </div>
              {e("userIds") && <span className="ds-field__error" role="alert">{e("userIds")}</span>}
              <span className="ds-field__helper">{`${f.picked.length} selected`}</span>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

// A profile's Shift card: the shift today (and the next change), its rules in words, Assign (shifts:assign), and the
// assignment history (every assignment and swap, with a date range).
export function ShiftCard({ userId: personId, id = "profile-shift" }) {
  const { userId } = useSession();
  const toast = useToast();
  const today = officeNow().date;
  const [assigning, setAssigning] = useState(false);
  const [range, setRange] = useState({ preset: "", from: "", to: "" });
  const d = useData(() => ({ on: shiftOn(personId, today), history: historyFor(personId), canAssign: mayAssign(userId, personId) }), [personId, userId]);
  const rows = d.history.filter((h) => {
    if (!range.preset) return true;
    const from = h.kind === "swap" ? h.date : h.from, to = h.kind === "swap" ? h.date : h.to ?? "9999-12-31";
    return from <= range.to && to >= range.from;
  });
  const shift = shiftRulesApply(today) ? d.on.shift : getShift(GENERAL_ID, today);
  const source = { swap: "a swap for today", person: "assigned", department: "the department's default", default: "everyone's default" }[d.on.source];
  const end = async (h) => {
    const r = endAssignment(userId, h.id, today);
    if (!r.ok) { toast(r.error, "danger"); return; }
    toast("The assignment ends today.", "success"); bump();
  };
  const columns = [
    { key: "what", label: "Change", render: (h) => (h.kind === "swap" ? <><Pill tone="info">Swap</Pill> {getShift(h.shiftId)?.name}</> : getShift(h.shiftId)?.name), sort: (h) => h.kind },
    { key: "when", label: "Dates", render: (h) => (h.kind === "swap" ? formatDay(h.date, true) : `${formatDay(h.from, true)} to ${h.to ? formatDay(h.to, true) : "no end"}`), sort: (h) => (h.kind === "swap" ? h.date : h.from) },
    { key: "why", label: "Reason", render: (h) => (h.kind === "swap" ? h.reason : h.note || "—") },
    { key: "by", label: "By", render: (h) => `${h.byName}, ${formatDay(h.at.slice(0, 10), true)}` },
    { key: "state", label: "Status", render: (h) => (h.cancelled ? <Pill>Cancelled</Pill> : h.kind === "assignment" && h.to && h.to < today ? <Pill>Ended</Pill> : <Pill tone="success">In force</Pill>) },
    ...(d.canAssign ? [{ key: "act", label: "Actions", actions: true, render: (h) => (h.kind === "assignment" && !h.cancelled && h.from <= today && (!h.to || h.to > today) ? <button className="ds-btn ds-btn--sm" type="button" onClick={() => end(h)}>End today</button> : null) }] : []),
  ];
  return (
    <Card id={id} title="Shift" meta={shiftRulesApply(today) ? `Since ${formatDay(shiftRulesFrom(), true)} the shift decides attendance` : `Shift rules start on ${formatDay(shiftRulesFrom(), true)}`}
      actions={d.canAssign ? <button className="ds-btn ds-btn--sm" type="button" id="assign-shift" onClick={() => setAssigning(true)}>Assign shift</button> : null}>
      <div className="shift-now">
        <span className="shift-now__name">{shift.crossesMidnight && <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={MOON} /></svg>}{shift.name}</span>
        <span className="shift-now__hours">{shiftHours(shift)}</span>
        {shift.crossesMidnight && <Pill tone="info" icon={MOON}>Night shift</Pill>}
        {shift.sample && <Pill tone="warning">Sample</Pill>}
      </div>
      <Kv rows={[["Today", `${shift.name}, ${source}`], ["Rules", shiftSummary(shift).slice(1).join(" ")]]} />
      <h3 className="ds-section-title" id={`${id}-history`}>Assignment history</h3>
      <div className="shift-history__tools"><DateRange value={range} onChange={setRange} today={today} label="Dates" /></div>
      {d.history.length === 0 ? <EmptyState title="No changes yet" text={`${getUser(personId)?.name ?? "This person"} is on ${shift.name}, the default, until HR assigns a shift.`} />
        : rows.length === 0 ? <EmptyState title={NO_DATA} text="No assignment or swap touches these dates." />
        : (
          <ul className="shift-history" id={`${id}-list`}>
            {rows.slice(0, 12).map((h) => (
              <li key={`${h.kind}-${h.id}`} className="shift-history__item" data-kind={h.kind}>
                <div className="shift-history__main">
                  <span className="shift-history__title">{h.kind === "swap" ? <Pill tone="info">Swap</Pill> : null}{getShift(h.shiftId)?.name}</span>
                  <span className="shift-history__dates">{h.kind === "swap" ? formatDay(h.date, true) : `${formatDay(h.from, true)} to ${h.to ? formatDay(h.to, true) : "no end"}`}</span>
                  <span className="shift-history__sub">{`${(h.kind === "swap" ? h.reason : h.note) || "No reason given"} · ${h.byName}, ${formatDay(h.at.slice(0, 10), true)}`}</span>
                </div>
                <div className="shift-history__side">
                  {columns.find((c) => c.key === "state").render(h)}
                  {d.canAssign && columns.find((c) => c.key === "act")?.render(h)}
                </div>
              </li>
            ))}
            {rows.length > 12 && <li className="shift-history__more text-muted">{`${rows.length - 12} older changes not shown; narrow the dates.`}</li>}
          </ul>
        )}
      {d.canAssign && <AssignShiftModal open={assigning} onClose={() => setAssigning(false)} userIds={[personId]} />}
    </Card>
  );
}