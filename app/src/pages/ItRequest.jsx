// One IT request (IT2), at ?id=ITR-n: its details, the immutable timeline, comments, and the actions the desk allows this person right now
// (ui/itActions.jsx, from data/it-desk.js availableActions). Whoever raised it, IT and the Admin can open it; anyone else is told they can't
// (the desk returns nothing for them). The sign-in details a hand-over or a reset makes are shown here once, to the person who made them
// (ui/it.jsx SecretPanel), kept only in this page's state. Components: Card, Kv, Timeline, StatusChip.
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getItRequest } from "../../../assets/js/data/it-desk.js";
import { ROLES } from "../../../assets/js/config/roles.js";
import { ASSET_CATEGORIES } from "../../../assets/js/data/asset-rules.js";
import { formatDay } from "../../../assets/js/ui/leave-view.js";
import OwnPage from "../ui/OwnPage.jsx";
import { PageHeader, Card } from "../components/Layout.jsx";
import { EmptyState } from "../components/Basics.jsx";
import { Kv } from "../components/Form.jsx";
import { useData, useSession } from "../data/hooks.js";
import { pageUrl, IT_REQUEST, IT_REQUESTS, IT_MINE } from "../routes.js";
import { StatusChip, PriorityChip, DueCell, Timeline, SecretPanel, typeLabel, nameOf, stampYear } from "../ui/it.jsx";
import { RequestActions, CommentBox, Checklist } from "../ui/itActions.jsx";

const NEXT = {
  open: "Waiting for IT to pick it up.", "in-progress": "IT is working on it.", "awaiting-approval": "Waiting for an Admin's decision.", approved: "Approved: IT carries it out next.",
  rejected: "The Admin sent it back to IT.", done: "Finished.", cancelled: "Cancelled.",
};
const payloadRows = (r) => {
  const p = r.payload ?? {};
  const rows = [];
  if (p.permission) rows.push(["Permission asked for", p.permission]);
  if (p.role) rows.push(["Role asked for", ROLES[p.role]?.label ?? p.role]);
  if (p.category) rows.push(["Kind of asset", ASSET_CATEGORIES[p.category]?.label ?? p.category]);
  if (p.assetTag) rows.push(["Asset", p.assetTag]);
  if (p.software) rows.push(["Software", p.software]);
  if (r.prepared) {
    rows.push(["Prepared role", ROLES[r.prepared.role]?.label ?? r.prepared.role], ["Work email", r.prepared.email], ["Department", r.prepared.department],
      ["Manager", r.prepared.managerId ? nameOf(r.prepared.managerId) : "None"], ["Start date", formatDay(r.prepared.startDate, true)]);
  }
  return rows;
};

function Content({ id }) {
  const { userId } = useSession();
  const [secret, setSecret] = useState(null);
  const d = useData(() => ({ r: id ? getItRequest(userId, id) : null }), [userId, id]);
  useEffect(() => { setSecret(null); }, [id]);
  const r = d.r;
  if (!r) {
    return (
      <>
        <PageHeader title="IT request" breadcrumb={[{ label: "IT desk", to: pageUrl(IT_MINE) }, { label: "Request" }]} />
        <EmptyState title="You can't open this request." text="There is no request with that number that you can see. You can open the ones you raised; IT and the Admin open every one." to={pageUrl(IT_MINE)} linkText="My IT requests" />
      </>
    );
  }
  const rows = [
    ["Type", typeLabel(r.type)], ["Status", <StatusChip key="s" status={r.status} />], ["Priority", <PriorityChip key="p" priority={r.priority} />],
    ["Due", <DueCell key="d" r={r} />], ["Raised by", nameOf(r.requesterId)], r.subjectPersonId && r.subjectPersonId !== r.requesterId ? ["About", nameOf(r.subjectPersonId)] : null,
    ["Assigned to", r.assignedTo ? nameOf(r.assignedTo) : "Nobody yet", r.assignedTo ? {} : { muted: true }], ["Raised", stampYear(r.createdAt)],
    ...payloadRows(r), r.details ? ["Details", r.details] : null, r.closedNote ? ["Closing note", r.closedNote] : null,
  ];
  return (
    <>
      <PageHeader title={r.title} subtitle={`${r.id} · ${NEXT[r.status] ?? ""}`}
        breadcrumb={[{ label: "IT desk", to: pageUrl(IT_MINE) }, { label: "Request" }]} actions={<Link className="ds-btn" to={pageUrl(r.requesterId === userId ? IT_MINE : IT_REQUESTS)}>Back to the list</Link>} />
      <div className="ds-stack">
        {secret && <SecretPanel {...secret} onClose={() => setSecret(null)} />}
        <div className="it-detail">
          <Card id="request-details" className="it-d-details" title="Details"><Kv id="request-kv" rows={rows} /></Card>
          <Card id="actions-card" className="it-d-actions" title="Actions"><RequestActions request={r} onSecret={setSecret} /></Card>
          {r.type === "offboarding" && r.checklist && <Card id="offboarding-card" className="it-d-checklist" title="Offboarding checklist"><Checklist request={r} /></Card>}
          <Card id="request-timeline" className="it-d-timeline" title="Timeline" meta="Only ever added to"><Timeline entries={r.timeline} /></Card>
          <Card id="comment-card" className="it-d-comments" title="Comments"><CommentBox request={r} /></Card>
        </div>
      </div>
    </>
  );
}

export default function ItRequest() {
  const [params] = useSearchParams();
  return <OwnPage page={IT_REQUEST} title="IT request"><Content id={params.get("id") ?? ""} /></OwnPage>;
}