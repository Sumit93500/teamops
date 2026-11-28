// The IT desk's dashboard (IT2; SD1 rebuilt on the shared frame, ui/DashFrame.jsx). Live: every number is read from data/it-desk.js and
// data/licences.js on each draw, and the app re-reads when a request changes here, in another tab (the storage event) or when the window
// comes back into focus (data/bus.js), so nothing needs a reload. The numbers: open requests, awaiting an Admin's approval, the person's
// own queue, licences renewing in 30 days, offboarding due (open offboarding requests, and anyone who left with none). Then open requests by type and by status, the latest changes, what is overdue, the queue,
// and the latest changes. For IT (it:requests-handle) and the Admin (it:approve).
import { Link } from "react-router-dom";
import { itSummary, overdueRequests, requestsFor, exitsWithoutOffboarding, slaHours } from "../../../assets/js/data/it-desk.js";
import { expiringRenewals } from "../../../assets/js/data/licences.js";
import { STATUSES, PRIORITIES, TYPE_KEYS } from "../../../assets/js/data/it-rules.js";
import { formatDay } from "../../../assets/js/ui/leave-view.js";
import OwnPage from "../ui/OwnPage.jsx";
import DashFrame from "../ui/DashFrame.jsx";
import Table from "../components/Table.jsx";
import { KpiCard, Card } from "../components/Layout.jsx";
import { EmptyState } from "../components/Basics.jsx";
import { BarRows } from "../components/Charts.jsx";
import { ICON } from "../components/icons.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { pageUrl, IT_DASHBOARD, IT_REQUESTS, IT_REQUEST, IT_LICENCES, IT_OFFBOARDING } from "../routes.js";
import { StatusChip, PriorityChip, DueCell, typeLabel, PRIORITY_LABEL } from "../ui/it.jsx";

const TITLE = "IT desk";
const view = (v) => `${pageUrl(IT_REQUESTS)}?view=${v}`;
const percentOf = (n, max) => (max ? Math.round((n / max) * 100) : 0);
const latest = (r) => (r.timeline ?? []).reduce((m, t) => (t.at > m ? t.at : m), r.createdAt ?? "");

function RequestTable({ rows, id, empty }) {
  const columns = [
    { key: "title", label: "Request", className: "it-title-col", render: (r) => <span className="it-cell"><Link to={`${pageUrl(IT_REQUEST)}?id=${encodeURIComponent(r.id)}`}><strong>{r.title}</strong></Link><span className="it-sub">{typeLabel(r.type)}</span></span> },
    { key: "status", label: "Status", className: "it-status-col", render: (r) => <span className="it-cell"><StatusChip status={r.status} /><PriorityChip priority={r.priority} /></span> },
    { key: "due", label: "Due", className: "it-due-col", render: (r) => <DueCell r={r} /> },
  ];
  return <Table bare pager={false} columns={columns} rows={rows} rowKey={(r) => r.id} empty={empty} tableId={id} tableClass="table table--tight it-table" />;
}

// The live numbers: { open, awaiting, mine, expiring, exits, ... } (null for someone who may not see the desk)
export function itDeskNumbers(userId, now = Date.now()) {
  const sum = itSummary(userId, now);
  if (!sum) return null;
  const exits = exitsWithoutOffboarding(userId);
  const offboarding = requestsFor(userId).filter((r) => r.type === "offboarding" && !["done", "cancelled"].includes(r.status));
  return { sum, expiring: expiringRenewals(userId, 30, now), exits, offboardingDue: offboarding.length + exits.length };
}

function Content() {
  const { userId } = useSession();
  const d = useData(() => {
    const n = itDeskNumbers(userId);
    if (!n) return null;
    const all = requestsFor(userId);
    const open = all.filter((r) => !["done", "cancelled"].includes(r.status));
    return { ...n, overdue: overdueRequests(userId).slice(0, 5), mine: open.filter((r) => r.assignedTo === userId).slice(0, 5),
      recent: all.slice().sort((a, b) => latest(b).localeCompare(latest(a))).slice(0, 6), sla: slaHours() };
  }, [userId]);
  if (!d) return <EmptyState title="You can't see the IT desk." text="It is for IT and the Admin." />;
  const s = d.sum;
  const statusKeys = Object.keys(STATUSES);
  const maxStatus = Math.max(0, ...statusKeys.map((k) => s.byStatus[k]));
  const maxType = Math.max(0, ...TYPE_KEYS.map((t) => s.byType[t]));
  const typeRows = TYPE_KEYS.filter((t) => s.byType[t] > 0 || maxType === 0).map((t) => ({ label: typeLabel(t), percent: percentOf(s.byType[t], maxType), value: String(s.byType[t]) })).sort((a, b) => Number(b.value) - Number(a.value));
  const statusRows = statusKeys.map((k) => ({ label: STATUSES[k].label, percent: percentOf(s.byStatus[k], maxStatus), value: String(s.byStatus[k]) }));
  const numbers = (
    <div className="ds-grid it-kpis" role="group" aria-label="Key numbers" id="it-numbers">
      <Link className="it-link" to={view("open")}><KpiCard id="kpi-open" label="Open requests" value={String(s.open)} icon={ICON.layers} /></Link>
      <Link className="it-link" to={view("awaiting")}><KpiCard id="kpi-awaiting" label="Awaiting an Admin" value={String(s.awaiting)} icon={ICON.progress} /></Link>
      <Link className="it-link" to={view("mine")}><KpiCard id="kpi-mine" label="My queue" value={String(s.mine)} icon={ICON.users} /></Link>
      <Link className="it-link" to={pageUrl(IT_LICENCES)}><KpiCard id="kpi-expiring" label="Renewals in 30 days" value={String(d.expiring.length)} icon={ICON.calendar} /></Link>
      <Link className="it-link" to={pageUrl(IT_OFFBOARDING)}><KpiCard id="kpi-exits" label="Offboarding due" value={String(d.offboardingDue)} icon={ICON.clock} /></Link>
    </div>
  );
  return (
    <DashFrame kind="it" numbers={numbers}>
      <div className="it-two">
        <Card id="by-type" title="Open requests by type" meta={`${s.open} open`}>
          {s.open === 0 ? <EmptyState title="Nothing is open." text="Every request is finished." /> : <BarRows id="type-bars" rows={typeRows} />}
        </Card>
        <Card id="by-status" title="Requests by status" meta={`${s.total} in all`}>
          {s.total === 0 ? <EmptyState title="No requests yet." text="Requests appear here as people raise them." /> : <BarRows id="status-bars" rows={statusRows} />}
        </Card>
      </div>
      <Card id="recent-card" title="Latest changes" meta={d.recent.length ? `${d.recent.length} shown` : "None"}>
        {d.recent.length === 0 ? <p className="text-muted text-sm">Nothing has happened yet.</p> : (
          <ul className="dh-list" id="it-recent">
            {d.recent.map((r) => (
              <li key={r.id} className="dh-list__item"><Link to={`${pageUrl(IT_REQUEST)}?id=${encodeURIComponent(r.id)}`}>{r.title}: {STATUSES[r.status]?.label ?? r.status}, {formatDay(latest(r).slice(0, 10), true)}</Link></li>
            ))}
          </ul>
        )}
      </Card>
      <Card id="overdue-card" title="Overdue" meta={s.overdue ? `${Math.min(5, s.overdue)} of ${s.overdue} shown` : "None"} actions={s.overdue > 5 ? <Link className="ds-btn ds-btn--sm" to={view("overdue")}>See all</Link> : null}>
        <RequestTable rows={d.overdue} id="overdue-table" empty="Nothing is overdue." />
      </Card>
      <Card id="mine-card" title="My queue" meta={s.mine ? `${Math.min(5, s.mine)} of ${s.mine} shown` : "None"} actions={s.mine > 5 ? <Link className="ds-btn ds-btn--sm" to={view("mine")}>See all</Link> : null}>
        <RequestTable rows={d.mine} id="mine-table" empty="Nothing is in your queue." />
      </Card>
      <p className="text-muted text-sm" id="sla-note">Response times: {PRIORITIES.slice().reverse().map((p) => `${PRIORITY_LABEL[p]} ${d.sla[p]} h`).join(", ")}.</p>
    </DashFrame>
  );
}

export default function ItDashboard() {
  const handle = useCan("it:requests-handle"), approve = useCan("it:approve");
  return <OwnPage page={IT_DASHBOARD} title={TITLE} allowed={handle || approve}><Content /></OwnPage>;
}