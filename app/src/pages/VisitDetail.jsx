// One visit (CV1, 2026-11-16), opened from My visits, Team visits and the approvals: who, where, why, the days, and the punch trail (each
// day's check-in and check-out with time, coordinates, accuracy and an "Open in maps" link, flags for a low accuracy or a location
// that wasn't available and the approver's OK). The person, their manager, HR and Admin may open it; anyone else is told they can't.
// Approve / Reject (while it waits), Cancel (before it starts) and "Accept without location" are here too.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getUser } from "../../../assets/js/data/store.js";
import { getVisit } from "../../../assets/js/data/visits-store.js";
import { visitTrail, mayViewVisit, mayDecideVisit, mayCancelVisit, cancelVisit } from "../../../assets/js/data/visits.js";
import { formatDay, nameOf, localDateOf } from "../../../assets/js/ui/leave-view.js";
import OwnPage from "../ui/OwnPage.jsx";
import { PageHeader, Card, Pill } from "../components/Layout.jsx";
import { Kv } from "../components/Form.jsx";
import { EmptyState } from "../components/Basics.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { useDecision, VISIT_FLOW } from "../components/Decision.jsx";
import { useToast } from "../ui/Toast.jsx";
import { VisitStatus, LocationOkModal, kindLabel, visitDates, visitDays, PIN } from "../ui/visits.jsx";
import { useData, useSession } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { pageUrl, MY_VISITS, TEAM_VISITS, VISIT_PAGE } from "../routes.js";

const ACTION_WORDS = { requested: "Asked for", "started-same-day": "Started today", assigned: "Assigned", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled", started: "Started", "check-in": "Checked in", "check-out": "Checked out", completed: "Completed", "location-ok": "Location accepted" };

function Punch({ label, p, maps }) {
  if (!p) return <div className="visit-punch"><span className="visit-punch__label">{label}</span><span className="visit-punch__meta">Not yet</span></div>;
  return (
    <div className="visit-punch">
      <span className="visit-punch__label">{label}</span>
      <span className="visit-punch__time">{p.time}</span>
      {p.source === "gps"
        ? <span className="visit-punch__meta">{`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}, accurate to ${p.accuracy} m`}</span>
        : <span className="visit-punch__meta">{`Location unavailable: ${p.reason}`}</span>}
      <span className="visit-punch__flags">
        {p.lowAccuracy && <Pill tone="warning">Low accuracy</Pill>}
        {p.source === "unavailable" && !p.okBy && <Pill tone="warning">Waiting for an OK</Pill>}
        {p.okBy && <Pill tone="success">{`OK'd by ${nameOf(p.okBy)}`}</Pill>}
      </span>
      {p.okNote && <span className="visit-punch__meta">{p.okNote}</span>}
      {maps && <a className="ds-btn ds-btn--sm" href={maps} target="_blank" rel="noopener noreferrer">Open in maps<span className="visually-hidden"> (opens in a new tab)</span></a>}
    </div>
  );
}

function Content({ id }) {
  const { userId } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const flow = useDecision(VISIT_FLOW);
  const [okItem, setOkItem] = useState(null);
  const d = useData(() => { const v = getVisit(id); return v ? { v, can: mayViewVisit(userId, v), decide: mayDecideVisit(userId, v.personId), cancel: mayCancelVisit(userId, v) } : null; }, [id, userId]);
  if (!d) return <><PageHeader title="Visit" /><EmptyState title="That visit doesn't exist" text="It may have been removed, or the link is wrong." to={pageUrl(MY_VISITS)} linkText="My visits" /></>;
  if (!d.can) return <><PageHeader title="Visit" /><EmptyState title="You can't open this visit" text="Only the person, their manager, HR and an Admin can see a visit." to={pageUrl(MY_VISITS)} linkText="My visits" /></>;
  const { v } = d;
  const person = getUser(v.personId);
  const trail = visitTrail(v);
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
              {v.history.map((h, i) => <li className="visit-history__item" key={i}><strong>{ACTION_WORDS[h.action] ?? h.action}</strong><span>{`${nameOf(h.by)}, ${formatDay(localDateOf(h.at), true)}`}</span>{h.note && <span>{h.note}</span>}</li>)}
            </ol>
          </Card>
        </div>
        <Card id="visit-trail" title="Check-in trail" meta={started ? `${trail.filter((t) => t.in).length} of ${trail.length} days started` : "Nothing punched yet"}>
          <ul className="visit-trail">
            {trail.map((t) => (
              <li className="visit-trail__day" key={t.date} data-date={t.date}>
                <span className="visit-trail__date"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true" width="14" height="14"><path d={PIN} /></svg>{` ${formatDay(t.date, true)}`}</span>
                <div className="visit-trail__punches"><Punch label="Check-in" p={t.in} maps={t.inMaps} /><Punch label="Check-out" p={t.out} maps={t.outMaps} /></div>
                {["in", "out"].map((side) => { const p = t[side]; return p && p.needsOk && !p.okBy && d.decide ? <div key={side}><button className="ds-btn ds-btn--sm ds-btn--primary" type="button" onClick={() => setOkItem({ visitId: v.id, name: person?.name, date: t.date, side, reason: p.reason })}>{`Accept ${side === "out" ? "check-out" : "check-in"} without location`}</button></div> : null; })}
              </li>
            ))}
          </ul>
        </Card>
        <p className="ds-note"><Link className="link" to={pageUrl(v.personId === userId ? MY_VISITS : TEAM_VISITS)}>Back to the list</Link></p>
      </div>
      <LocationOkModal item={okItem} onClose={() => setOkItem(null)} />
      <span style={{ display: "contents" }}>{flow.modal}</span>
    </>
  );
}

export default function VisitDetail() {
  const [params] = useSearchParams();
  return <OwnPage page={VISIT_PAGE} title="Visit"><Content id={params.get("id") ?? ""} /></OwnPage>;
}
