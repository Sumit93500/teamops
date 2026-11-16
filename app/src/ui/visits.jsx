// CV1 (2026-11-16): the visit pieces the pages share: words, the status pill, the "On-site / Client visit" chip (an icon and a hatched
// look, not colour alone), the request and assign dialogs and the "accept without a location" dialog. Tokens only.
import { useMemo, useState } from "react";
import { getUser, getAllUsers } from "../../../assets/js/data/store.js";
import { Link } from "react-router-dom";
import { managerOf, directReportsOf, isManager } from "../../../assets/js/data/reporting.js";
import { visitsFor, COUNTING } from "../../../assets/js/data/visits-store.js";
import { hasPermission } from "../../../assets/js/config/roles.js";
import { formatDay, nameOf } from "../../../assets/js/ui/leave-view.js";
import { requestVisit, assignVisit, okVisitLocation, phaseOf, onSiteToday, MAX_DAYS, SITE_MAX, PURPOSE_MAX, ADDRESS_MAX } from "../../../assets/js/data/visits.js";
import { KIND_LABEL, VISIT_KINDS } from "../../../assets/js/data/visits-store.js";
import { officeNow } from "../../../assets/js/data/shift-engine.js";
import { shiftRulesFrom } from "../../../assets/js/data/shift-settings.js";
import { useSession, useData } from "../data/hooks.js";
import { pageUrl, MY_VISITS, TEAM_VISITS } from "../routes.js";
import { bump } from "../data/bus.js";
import Modal from "../components/Modal.jsx";
import { Pill, Card } from "../components/Layout.jsx";
import { Field, Input, Select, TextArea } from "../components/Form.jsx";
import { useToast } from "./Toast.jsx";
import "../design/visits.css";

export const PIN = "M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5";
const TICK = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M8 12l3 3 5-6", CLOCK = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2", CROSS = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M9 9l6 6M15 9l-6 6", CAL = "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z";
const Svg = ({ d }) => <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;

export const kindLabel = (k) => KIND_LABEL[k] ?? k;
export const visitDates = (v) => (v.fromDate === v.toDate ? formatDay(v.fromDate, true) : `${formatDay(v.fromDate, v.fromDate.slice(0, 4) !== v.toDate.slice(0, 4))} to ${formatDay(v.toDate, true)}`);
export const visitDays = (v) => `${v.dates.length} ${v.dates.length === 1 ? "day" : "days"}`;
export const visitTitle = (v) => `${kindLabel(v.kind)}: ${v.siteName}`;

const LOOK = { pending: ["warning", CLOCK, "Pending"], planned: ["info", CAL, "Planned"], approved: ["info", TICK, "Approved"], "in-progress": ["success", PIN, "In progress"], completed: ["success", TICK, "Completed"], rejected: ["danger", CROSS, "Rejected"], cancelled: ["", CROSS, "Cancelled"] };
// The visit's status as a pill with an icon (so it isn't colour alone). A same-day visit still waiting for approval says so.
export function VisitStatus({ visit }) {
  const phase = phaseOf(visit, officeNow().date);
  const [tone, icon, label] = LOOK[phase] ?? ["", CLOCK, phase];
  return <span className="ds-chips"><Pill tone={tone} icon={icon}>{label}</Pill>{visit.approvalPending && visit.sameDay && <Pill tone="warning" icon={CLOCK}>Approval pending</Pill>}</span>;
}

// "On-site / Client visit" for a day read under a visit (data/visit-days.js): its own chip, a hatched look and a pin; a half day and a
// not-started or awaiting-OK day say so.
export function OnSiteChip({ day }) {
  const v = day.visit;
  if (day.status === "visit-planned") return <span className="visit-chip visit-chip--warn" title={v?.awaitingOk ? "Location unavailable: waiting for an OK" : `${v?.siteName ?? "Visit"}: no check-in yet`}><Svg d={PIN} />{v?.awaitingOk ? "Visit: OK needed" : "Visit not started"}</span>;
  return <span className={`visit-chip${day.status === "half-day" ? " visit-chip--half" : ""}`} title={v ? `${kindLabel(v.kind)}: ${v.siteName}` : "On-site"}><Svg d={PIN} />{day.status === "half-day" ? "On-site, half day" : "On-site / Client visit"}</span>;
}

// The person's manager line for the request dialog.
const sentTo = (userId) => { const m = managerOf(userId); return m ? `${getUser(m).name}` : "HR or an Admin"; };

export function RequestVisitModal({ open, onClose }) {
  const { userId } = useSession();
  const toast = useToast();
  const today = officeNow().date;
  const from = shiftRulesFrom() > today ? shiftRulesFrom() : today;
  const blank = { kind: "client", siteName: "", address: "", purpose: "", fromDate: from, toDate: from };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => { const v = e.target.value; setF((s) => ({ ...s, [k]: v, ...(k === "fromDate" && s.toDate < v ? { toDate: v } : {}) })); setErr(null); };
  const close = () => { setF(blank); setErr(null); onClose(); };
  const save = (e) => {
    e.preventDefault();
    const r = requestVisit(userId, f);
    if (!r.ok) { setErr({ field: r.field ?? "siteName", text: r.error }); document.getElementById(`visit-${r.field ?? "siteName"}`)?.focus(); return; }
    toast("Visit request sent.", "success"); bump(); setF(blank); setErr(null); onClose();
  };
  const e = (k) => (err?.field === k ? err.text : undefined);
  return (
    <Modal open={open} onClose={close} id="request-visit-modal" size="md" title="Request a visit" desc={`Your manager decides it: ${sentTo(userId)}.`}
      footer={<><button className="ds-btn" type="button" onClick={close}>Cancel</button><button className="ds-btn ds-btn--primary" type="submit" form="request-visit-form">Send request</button></>}>
      <form id="request-visit-form" noValidate onSubmit={save}>
        <div className="ds-form-grid">
          <Field id="visit-kind" label="Kind of visit" required error={e("kind")}><Select id="visit-kind" value={f.kind} onChange={set("kind")} options={VISIT_KINDS.map((k) => [k, kindLabel(k)])} /></Field>
          <Field id="visit-siteName" label="Client or place" required error={e("siteName")}><Input id="visit-siteName" maxLength={SITE_MAX} value={f.siteName} onChange={set("siteName")} placeholder="Acme Corp, Pune" /></Field>
          <Field id="visit-fromDate" label="First day" required error={e("fromDate")}><Input id="visit-fromDate" type="date" min={from} value={f.fromDate} onChange={set("fromDate")} /></Field>
          <Field id="visit-toDate" label="Last day" required error={e("toDate")} hint={`Up to ${MAX_DAYS} days. Weekly offs and holidays are left out.`}><Input id="visit-toDate" type="date" min={f.fromDate || from} value={f.toDate} onChange={set("toDate")} /></Field>
          <Field id="visit-address" label="Address (optional)" full error={e("address")}><Input id="visit-address" maxLength={ADDRESS_MAX} value={f.address} onChange={set("address")} /></Field>
          <Field id="visit-purpose" label="Purpose" required full error={e("purpose")} hint="Your manager sees this."><TextArea id="visit-purpose" rows={3} maxLength={PURPOSE_MAX} value={f.purpose} onChange={set("purpose")} /></Field>
        </div>
      </form>
    </Modal>
  );
}

// People the signed-in person may assign a visit to: a manager's direct reports; with attendance:view-all, everyone active (not themselves).
export const assignable = (userId) => {
  const me = getUser(userId);
  if (!me || !hasPermission(me, "visits:assign")) return [];
  const all = hasPermission(me, "attendance:view-all");
  const mine = new Set(directReportsOf(userId).map((u) => u.id));
  return getAllUsers().filter((u) => u.status !== "inactive" && u.id !== userId && (all || mine.has(u.id))).sort((a, b) => a.name.localeCompare(b.name));
};

export function AssignVisitModal({ open, onClose }) {
  const { userId } = useSession();
  const toast = useToast();
  const today = officeNow().date;
  const from = shiftRulesFrom() > today ? shiftRulesFrom() : today;
  const people = useMemo(() => assignable(userId), [userId, open]);   // eslint-disable-line react-hooks/exhaustive-deps
  const blank = { kind: "client", siteName: "", address: "", purpose: "", fromDate: from, toDate: from, allowOffDay: false, picked: [], q: "" };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => { const v = e.target.value; setF((s) => ({ ...s, [k]: v, ...(k === "fromDate" && s.toDate < v ? { toDate: v } : {}) })); setErr(null); };
  const list = people.filter((u) => !f.q.trim() || u.name.toLowerCase().includes(f.q.trim().toLowerCase()));
  const toggle = (id) => { setF((s) => ({ ...s, picked: s.picked.includes(id) ? s.picked.filter((x) => x !== id) : [...s.picked, id] })); setErr(null); };
  const close = () => { setF(blank); setErr(null); onClose(); };
  const save = (e) => {
    e.preventDefault();
    const r = assignVisit(userId, f.picked, f);
    if (!r.ok) { setErr({ field: r.field ?? "people", text: r.errors?.length > 1 ? `${r.errors.map((x) => `${nameOf(x.personId)}: ${x.error}`).join(" ")}` : r.error }); return; }
    toast(`${r.records.length === 1 ? nameOf(r.records[0].personId) : `${r.records.length} people`}: visit to ${f.siteName.trim()} assigned.`, "success"); bump(); close();
  };
  const e = (k) => (err?.field === k ? err.text : undefined);
  return (
    <Modal open={open} onClose={close} id="assign-visit-modal" size="lg" title="Assign a visit" desc="The visit starts approved. Everyone chosen gets the same site and days; if any one can't, nothing is saved."
      footer={<><button className="ds-btn" type="button" onClick={close}>Cancel</button><button className="ds-btn ds-btn--primary" type="submit" form="assign-visit-form">{`Assign ${f.picked.length || ""}`.trim()}</button></>}>
      <form id="assign-visit-form" noValidate onSubmit={save}>
        <div className="ds-form-grid">
          <Field id="visit-kind" label="Kind of visit" required error={e("kind")}><Select id="visit-kind" value={f.kind} onChange={set("kind")} options={VISIT_KINDS.map((k) => [k, kindLabel(k)])} /></Field>
          <Field id="visit-siteName" label="Client or place" required error={e("siteName")}><Input id="visit-siteName" maxLength={SITE_MAX} value={f.siteName} onChange={set("siteName")} /></Field>
          <Field id="visit-fromDate" label="First day" required error={e("fromDate")}><Input id="visit-fromDate" type="date" min={from} value={f.fromDate} onChange={set("fromDate")} /></Field>
          <Field id="visit-toDate" label="Last day" required error={e("toDate")}><Input id="visit-toDate" type="date" min={f.fromDate || from} value={f.toDate} onChange={set("toDate")} /></Field>
          <Field id="visit-address" label="Address (optional)" full error={e("address")}><Input id="visit-address" maxLength={ADDRESS_MAX} value={f.address} onChange={set("address")} /></Field>
          <Field id="visit-purpose" label="Purpose" required full error={e("purpose")}><TextArea id="visit-purpose" rows={2} maxLength={PURPOSE_MAX} value={f.purpose} onChange={set("purpose")} /></Field>
          <div className="ds-field ds-field--full">
            <label className="ds-check" htmlFor="visit-allowOffDay"><input type="checkbox" id="visit-allowOffDay" checked={f.allowOffDay} onChange={(x) => setF((s) => ({ ...s, allowOffDay: x.target.checked }))} />Include weekly offs and holidays in these days</label>
          </div>
          <div className="ds-field ds-field--full">
            <span className="ds-field__label ds-field__label--required" id="visit-people-label">People</span>
            <div className="ds-control"><input aria-label="Search people" placeholder="Search by name" value={f.q} onChange={set("q")} /></div>
            <div className="visit-people" role="group" aria-labelledby="visit-people-label" id="visit-people">
              {list.length ? list.map((u) => (
                <label key={u.id} className="ds-check visit-people__row"><input type="checkbox" checked={f.picked.includes(u.id)} onChange={() => toggle(u.id)} /><span>{u.name}</span><span className="visit-people__sub">{u.designation}</span></label>
              )) : <p className="text-muted">{people.length ? "Nobody matches." : "You have nobody to assign a visit to."}</p>}
            </div>
            {e("people") && <span className="ds-field__error" id="visit-people-error" role="alert">{e("people")}</span>}
            <span className="ds-field__helper">{`${f.picked.length} selected`}</span>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// The approver's explicit OK for a punch made as "location unavailable".
export function LocationOkModal({ item, onClose }) {
  const { userId } = useSession();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [err, setErr] = useState(null);
  if (!item) return null;
  const save = (e) => {
    e.preventDefault();
    const r = okVisitLocation(userId, item.visitId, item.date, item.side, note);
    if (!r.ok) { setErr(r.error); return; }
    toast("Accepted without a location. The day counts now.", "success"); bump(); setNote(""); setErr(null); onClose();
  };
  return (
    <Modal open onClose={onClose} id="visit-ok-modal" size="sm" title="Accept without a location" desc={`${item.name} said their location wasn't available when checking ${item.side === "out" ? "out" : "in"} on ${formatDay(item.date, true)}: "${item.reason}". Accepting counts the day as on-site.`}
      footer={<><button className="ds-btn" type="button" onClick={onClose}>Cancel</button><button className="ds-btn ds-btn--primary" type="submit" form="visit-ok-form">Accept</button></>}>
      <form id="visit-ok-form" noValidate onSubmit={save}>
        <div className="ds-form-grid">
          <Field id="visit-ok-note" label="Why you accept it" required full error={err}><TextArea id="visit-ok-note" rows={2} maxLength={200} value={note} onChange={(x) => { setNote(x.target.value); setErr(null); }} /></Field>
        </div>
      </form>
    </Modal>
  );
}

// The dashboards' visit card (CV1): "On-site today" for a manager (their direct reports), HR and an Admin (everyone), and the person's own
// visit today, if they have one. Draws nothing for someone with neither.
export function VisitsToday() {
  const { userId } = useSession();
  const d = useData(() => {
    const now = officeNow();
    const me = getUser(userId);
    const own = visitsFor(userId).find((v) => v.dates.includes(now.date) && COUNTING.includes(v.status)) ?? null;
    const watches = Boolean(me) && (hasPermission(me, "visits:view-all") || isManager(userId));
    return { own, ownDay: own?.days?.[now.date] ?? null, watches, onSite: watches ? onSiteToday(userId, now) : [] };
  }, [userId]);
  if (!d.own && !d.watches) return null;
  return (
    <Card id="visits-today" title={d.watches ? "On site today" : "Your visit today"} meta={d.watches ? (d.onSite.length ? `${d.onSite.length} ${d.onSite.length === 1 ? "person" : "people"}` : "Nobody") : undefined}
      actions={d.watches ? <Link className="ds-btn ds-btn--sm" to={pageUrl(TEAM_VISITS)}>Team visits</Link> : <Link className="ds-btn ds-btn--sm" to={pageUrl(MY_VISITS)}>My visits</Link>}>
      {d.own && (
        <p className="visit-site" id="visit-today-own">
          <span className="visit-site__name">{`Your visit: ${d.own.siteName}`}</span>
          <span className="visit-site__sub">{d.ownDay?.in ? `Checked in at ${d.ownDay.in.time}${d.ownDay.out ? `, out at ${d.ownDay.out.time}` : ""}` : "Not checked in yet. Check in from Mark attendance."}</span>
        </p>
      )}
      {d.watches && (d.onSite.length
        ? <ul className="visit-onsite" aria-label="People on site today">{d.onSite.map((x) => <li className="visit-onsite__item" key={x.visitId}><strong>{x.name}</strong><small>{x.siteName}, in {x.checkIn}{x.checkOut ? `, out ${x.checkOut}` : ""}</small></li>)}</ul>
        : <p className="text-muted" id="visits-today-none">Nobody is checked in on a visit right now.</p>)}
    </Card>
  );
}
