// One visit (CV1, 2026-11-16), opened from My visits, Team visits and the approvals: who, where, why, the days, and the punch trail. CV1b: the trail is
// one list, a day at a time, each day's check-in and check-out on their own line with the time, the coordinates, the accuracy and an "Open in maps" link
// for each (the flags: low accuracy, a location that wasn't available, the approver's OK or the day completed by HR). The person, their manager, HR
// and Admin may open it; anyone else is told they can't. Approve / Reject (while it waits), Cancel (before it starts), Accept or Reject a punch made
// without a location, and "Complete day" (HR, Admin: a check-out time, or the day marked full or half, with a reason) are here too.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getUser } from "../../../assets/js/data/store.js";
import { getVisit } from "../../../assets/js/data/visits-store.js";
import { visitTrail, mayViewVisit, mayDecideVisit, mayCancelVisit, cancelVisit } from "../../../assets/js/data/visits.js";
import { officeNow } from "../../../assets/js/data/shift-engine.js";
import { formatDay, nameOf, localDateOf } from "../../../assets/js/ui/leave-view.js";
import OwnPage from "../ui/OwnPage.jsx";
import { PageHeader, Card, Pill } from "../components/Layout.jsx";
import { Kv } from "../components/Form.jsx";
import { EmptyState } from "../components/Basics.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { useDecision, VISIT_FLOW, VISIT_LOCATION_FLOW } from "../components/Decision.jsx";
import { useToast } from "../ui/Toast.jsx";
import { VisitStatus, CompleteVisitDayModal, mayCompleteVisitDay, kindLabel, visitDates, visitDays, PIN } from "../ui/visits.jsx";
import { useData, useSession } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { pageUrl, MY_VISITS, TEAM_VISITS, VISIT_PAGE } from "../routes.js";

// a note that names a day as 2026-12-22 says 22 Dec 2026
const inWords = (s) => String(s).replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (d) => formatDay(d, true));
const ACTION_WORDS = { requested: "Asked for", "started-same-day": "Started today", assigned: "Assigned", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled", started: "Started", "check-in": "Checked in", "check-out": "Checked out", completed: "Completed", "location-ok": "Location accepted", "location-rejected": "Location rejected", "day-completed": "Day completed" };

// One punch on its own line: label, time, where, flags, map.
function PunchRow({ label, p, maps, past = false }) {
  if (!p) return <li className="visit-punch-row visit-punch-row--empty"><span className="visit-punch-row__label">{label}</span><span className="visit-punch-row__time">{past ? "Not recorded" : "Not yet"}</span></li>;
  return (
    <li className="visit-punch-row" data-punch={label.toLowerCase()}>
      <span className="visit-punch-row__label">{label}</span>
      <span className="visit-punch-row__time">{p.time}</span>
      <span className="visit-punch-row__where">
        {p.source === "gps" ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}, accurate to ${p.accuracy} m` : p.source === "hr" ? `Set by ${nameOf(p.okBy)}${p.okNote ? `: ${p.okNote}` : ""}` : `Location unavailable: ${p.reason}`}
      </span>
      <span className="visit-punch-row__flags">
        {p.lowAccuracy && <Pill tone="warning">Low accuracy</Pill>}
        {p.source === "unavailable" && !p.okBy && <Pill tone="warning">Waiting for an OK</Pill>}
        {p.source === "unavailable" && p.okBy && <Pill tone="success">{`OK'd by ${nameOf(p.okBy)}`}</Pill>}
      </span>
      {maps && <a className="ds-btn ds-btn--sm visit-punch-row__map" href={maps} target="_blank" rel="noopener noreferrer">Open in maps<span className="visually-hidden"> (opens in a new tab)</span></a>}
      {p.source === "unavailable" && p.okNote && <span className="visit-punch-row__note">{p.okNote}</span>}
    </li>
  );
}

function Content({ id }) {
  const { userId } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const flow = useDecision(VISIT_FLOW);
  const locFlow = useDecision(VISIT_LOCATION_FLOW);
  const [completing, setCompleting] = useState(null);
  const d = useData(() => { const v = getVisit(id); return v ? { v, can: mayViewVisit(userId, v), decide: mayDecideVisit(userId, v.personId), cancel: mayCancelVisit(userId, v), complete: mayCompleteVisitDay(userId, v) } : null; }, [id, userId]);
  if (!d) return <><PageHeader title="Visit" /><EmptyState title="That visit doesn't exist" text="It may have been removed, or the link is wrong." to={pageUrl(MY_VISITS)} linkText="My visits" /></>;
  if (!d.can) return <><PageHeader title="Visit" /><EmptyState title="You can't open this visit" text="Only the person, their manager, HR and an Admin can see a visit." to={pageUrl(MY_VISITS)} linkText="My visits" /></>;
  const { v } = d;
  const person = getUser(v.personId);
  const trail = visitTrail(v);
  const today = officeNow().date;
  const started = Object.values(v.days).some((x) => x.in || x.out);
  const waiting = v.status === "pending" || (v.status === "in-progress" && v.approvalPending);
  const forApproval = { id: v.id, userId: v.personId, siteName: v.siteName, date: v.fromDate, toDate: v.toDate, sameDay: v.sameDay };
  const cancel = async () => {
    if (!(await confirm({ message: `Cancel the visit to ${v.siteName} (${visitDates(v)})?`, confirmLabel: "Cancel visit", cancelLabel: "Keep it", danger: true }))) return;
    const r = cancelVisit(userId, v.id, "");
    toast(r.ok ? "Visit cancelled." : r.error, r.ok ? "success" : "danger"); bump();
  };
  const actions = <>
    {waiting && d.decide && <><button className="ds-btn" type="button" onClick={() => flow.reject(forApproval)}>Reject</button><button className="ds-btn ds-btn--primary" type="button" onClick={() => flow.approve(forApproval)}>Approve</button></>}
    {d.cancel && (v.status === "pending" || v.status === "approved") && !started && <button className="ds-btn ds-btn--danger" type="button" onClick={cancel}>Cancel visit</button>}
  </>;
  const locItem = (t, side) => ({ id: `${v.id}:${t.date}:${side}`, userId: v.personId, siteName: v.siteName, date: t.date, side, reason: t[side].reason });
  const validIn = (t) => t.in && (!t.in.needsOk || t.in.okBy);
  return (
    <>
      <PageHeader title={v.siteName} subtitle={`${kindLabel(v.kind)} for ${person?.name ?? v.personId}`} actions={actions}
        breadcrumb={[{ label: v.personId === userId ? "My visits" : "Team visits", to: pageUrl(v.personId === userId ? MY_VISITS : TEAM_VISITS) }, { label: v.id }]} />
      <div className="ds-stack">
        <div className="ds-two-col ds-two-col--main">
          <Card id="visit-summary" title="The visit" meta={<VisitStatus visit={v} />}>
            <Kv rows={[
              ["Person", person?.name ?? v.personId], ["Kind", kindLabel(v.kind)], ["Place", v.siteName], v.address && ["Address", v.address], ["Purpose", v.purpose],
              ["Days", `${visitDates(v)} (${visitDays(v)})`],
              ["Set up by", v.source === "assigned" ? `Assigned by ${getUser(v.assignedBy)?.name ?? "someone"}` : `${person?.name ?? "The person"} asked for it`],
              v.approvedBy && ["Decided by", `${nameOf(v.approvedBy)}${v.approvedAt ? `, ${formatDay(localDateOf(v.approvedAt), true)}` : ""}`],
              v.decisionReason && ["Reason", v.decisionReason],
              v.sameDay && ["Started", "Same day: it began before approval"],
            ]} />
          </Card>
          <Card id="visit-history" title="History">
            <ol className="visit-history">
              {v.history.map((h, i) => <li className="visit-history__item" key={i}><strong>{ACTION_WORDS[h.action] ?? h.action}</strong><span>{`${nameOf(h.by)}, ${formatDay(localDateOf(h.at), true)}`}</span>{h.note && <span>{inWords(h.note)}</span>}</li>)}
            </ol>
          </Card>
        </div>
        <Card id="visit-trail" title="Check-in trail" meta={started ? `${trail.filter((t) => t.in).length} of ${trail.length} ${trail.length === 1 ? "day" : "days"} started` : "Nothing punched yet"}>
          <ul className="visit-trail">
            {trail.map((t) => {
              const done = v.days[t.date]?.decision ?? null;
              const none = !t.in && !t.out;   // CV1c: nothing punched that day
              const noShow = none && !done && t.date < today;
              const canComplete = d.complete && !done && ((validIn(t) && t.date <= today) || noShow);
              return (
                <li className="visit-trail__day" key={t.date} data-date={t.date}>
                  <span className="visit-trail__date"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true" width="14" height="14"><path d={PIN} /></svg>{` ${formatDay(t.date, true)}`}
                    {done && <Pill tone={done.outcome === "half" ? "warning" : "success"}>{`Completed by ${nameOf(done.by)}: ${done.outcome === "half" ? "half day" : "full day"}`}</Pill>}
                    {!done && validIn(t) && !t.out && t.date < today && <Pill tone="warning">Incomplete</Pill>}
                    {noShow && <Pill tone="warning">Approved visit, no check-in</Pill>}
                  </span>
                  <ul className="visit-punches"><PunchRow label="Check-in" p={t.in} maps={t.inMaps} past={t.date < today} /><PunchRow label="Check-out" p={t.out} maps={t.outMaps} past={t.date < today} /></ul>
                  {done && <p className="visit-trail__note">{done.reason}</p>}
                  <div className="visit-trail__actions">
                    {["in", "out"].map((side) => { const p = t[side]; return p && p.needsOk && !p.okBy && d.decide ? (
                      <span key={side} className="ds-btn-group"><button className="ds-btn ds-btn--sm" type="button" onClick={() => locFlow.reject(locItem(t, side))}>{`Reject ${side === "out" ? "check-out" : "check-in"}`}</button><button className="ds-btn ds-btn--sm ds-btn--primary" type="button" onClick={() => locFlow.approve(locItem(t, side))}>{`Accept ${side === "out" ? "check-out" : "check-in"} without location`}</button></span>) : null; })}
                    {canComplete && <button className="ds-btn ds-btn--sm" type="button" onClick={() => setCompleting({ visit: v, date: t.date })}>Complete day</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
        <p className="ds-note"><Link className="link" to={pageUrl(v.personId === userId ? MY_VISITS : TEAM_VISITS)}>Back to the list</Link></p>
      </div>
      {completing && <CompleteVisitDayModal visit={completing.visit} date={completing.date} onClose={() => setCompleting(null)} />}
      <span style={{ display: "contents" }}>{flow.modal}{locFlow.modal}</span>
    </>
  );
}

export default function VisitDetail() {
  const [params] = useSearchParams();
  return <OwnPage page={VISIT_PAGE} title="Visit"><Content id={params.get("id") ?? ""} /></OwnPage>;
}
