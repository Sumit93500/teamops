// The IT desk's dashboard (IT2): what is waiting for IT, by status and type, what is overdue, what is assigned to the person, what nobody has
// taken and what waits for an Admin. For IT (it:requests-handle) and the Admin (it:approve); the numbers come from data/it-desk.js itSummary,
// so the page decides nothing. Each number opens the requests list on that view. Components: KpiCard, BarRows (horizontal bars), Table.
import { Link } from "react-router-dom";
import { itSummary, overdueRequests, requestsFor, exitsWithoutOffboarding, slaHours } from "../../../assets/js/data/it-desk.js";
import { TYPE_KEYS, STATUSES, PRIORITIES } from "../../../assets/js/data/it-rules.js";
import OwnPage from "../ui/OwnPage.jsx";
import Table from "../components/Table.jsx";
import { PageHeader, KpiCard, Card } from "../components/Layout.jsx";
import { EmptyState } from "../components/Basics.jsx";
import { BarRows } from "../components/Charts.jsx";
import { ICON, Icon } from "../components/icons.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { pageUrl, IT_DASHBOARD, IT_REQUESTS, IT_REQUEST, IT_NEW, IT_OFFBOARDING } from "../routes.js";
import { StatusChip, PriorityChip, DueCell, typeLabel, nameOf, PRIORITY_LABEL } from "../ui/it.jsx";

const TITLE = "IT desk";
const view = (v) => `${pageUrl(IT_REQUESTS)}?view=${v}`;
const percentOf = (n, max) => (max ? Math.round((n / max) * 100) : 0);

function RequestTable({ rows, id, empty }) {
  const columns = [
    { key: "title", label: "Request", className: "it-title-col", render: (r) => <span className="it-cell"><Link to={`${pageUrl(IT_REQUEST)}?id=${r.id}`}><strong>{r.title}</strong></Link><span className="it-sub">{r.id}, {typeLabel(r.type)}</span></span> },
    { key: "status", label: "Status", className: "it-status-col", render: (r) => <span className="it-cell"><StatusChip status={r.status} /><PriorityChip priority={r.priority} /></span> },
    { key: "due", label: "Due", className: "it-due-col", render: (r) => <DueCell r={r} /> },
  ];
  return <Table bare pager={false} columns={columns} rows={rows} rowKey={(r) => r.id} empty={empty} tableId={id} tableClass="table table--tight it-table" />;
}

function Content() {
  const { userId } = useSession();
  const d = useData(() => {
    const sum = itSummary(userId);
    const open = requestsFor(userId).filter((r) => !["done", "cancelled"].includes(r.status));
    return { sum, overdue: overdueRequests(userId).slice(0, 5), mine: open.filter((r) => r.assignedTo === userId).slice(0, 5), exits: exitsWithoutOffboarding(userId), sla: slaHours() };
  }, [userId]);
  const s = d.sum;
  if (!s) return <EmptyState title="You can't see the IT desk." text="It is for IT and the Admin." />;
  const maxType = Math.max(0, ...TYPE_KEYS.map((t) => s.byType[t]));
  const typeRows = TYPE_KEYS.filter((t) => s.byType[t] > 0 || maxType === 0).map((t) => ({ label: typeLabel(t), percent: percentOf(s.byType[t], maxType), value: String(s.byType[t]) })).sort((a, b) => Number(b.value) - Number(a.value));
  const statusKeys = Object.keys(STATUSES);
  const maxStatus = Math.max(0, ...statusKeys.map((k) => s.byStatus[k]));
  const statusRows = statusKeys.map((k) => ({ label: STATUSES[k].label, percent: percentOf(s.byStatus[k], maxStatus), value: String(s.byStatus[k]) }));
  return (
    <>
      <PageHeader title="IT desk" subtitle="Requests waiting for IT, and what needs a decision"
        actions={<><Link className="ds-btn" to={pageUrl(IT_REQUESTS)}>All requests</Link><Link className="ds-btn ds-btn--primary" to={pageUrl(IT_NEW)} id="raise-request"><Icon d="M12 5v14M5 12h14" />Raise a request</Link></>} />
      <div className="ds-stack">
        <div className="ds-grid it-kpis" role="group" aria-label="Key numbers">
          <Link className="it-link" to={view("open")}><KpiCard id="kpi-open" label="Open" value={String(s.open)} icon={ICON.layers} /></Link>
          <Link className="it-link" to={view("overdue")}><KpiCard id="kpi-overdue" label="Overdue" value={String(s.overdue)} icon={ICON.clock} /></Link>
          <Link className="it-link" to={view("mine")}><KpiCard id="kpi-mine" label="Assigned to you" value={String(s.mine)} icon={ICON.users} /></Link>
          <Link className="it-link" to={view("unassigned")}><KpiCard id="kpi-unassigned" label="Unassigned" value={String(s.unassigned)} icon={ICON.table} /></Link>
          <Link className="it-link" to={view("awaiting")}><KpiCard id="kpi-awaiting" label="Awaiting approval" value={String(s.awaiting)} icon={ICON.progress} /></Link>
        </div>
        {s.total === 0 ? <EmptyState title="No requests yet." text="Requests appear here as people raise them." /> : (
          <div className="it-two">
            <Card id="by-type" title="Open requests by type" meta={`${s.open} open`}>
              {s.open === 0 ? <EmptyState title="Nothing is open." text="Every request is finished." /> : <BarRows id="type-bars" rows={typeRows} />}
            </Card>
            <Card id="by-status" title="Requests by status" meta={`${s.total} in all`}>
              <BarRows id="status-bars" rows={statusRows} />
            </Card>
          </div>
        )}
        <div className="ds-stack">
          <Card id="overdue-card" title="Overdue" meta={s.overdue ? `${Math.min(5, s.overdue)} of ${s.overdue} shown` : "None"} actions={s.overdue > 5 ? <Link className="ds-btn ds-btn--sm" to={view("overdue")}>See all</Link> : null}>
            <RequestTable rows={d.overdue} id="overdue-table" empty="Nothing is overdue." />
          </Card>
          <Card id="mine-card" title="Assigned to you" meta={s.mine ? `${Math.min(5, s.mine)} of ${s.mine} shown` : "None"} actions={s.mine > 5 ? <Link className="ds-btn ds-btn--sm" to={view("mine")}>See all</Link> : null}>
            <RequestTable rows={d.mine} id="mine-table" empty="Nothing is assigned to you." />
          </Card>
        </div>
        {d.exits.length > 0 && (
          <p className="ds-note it-banner" id="exits-note"><Icon d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0" />{d.exits.length === 1 ? `${d.exits[0].name} has left with no offboarding on record.` : `${d.exits.length} people have left with no offboarding on record.`} <Link to={pageUrl(IT_OFFBOARDING)}>Open Offboarding</Link></p>
        )}
        <p className="text-muted text-sm" id="sla-note">Response times: {PRIORITIES.slice().reverse().map((p) => `${PRIORITY_LABEL[p]} ${d.sla[p]} h`).join(", ")}.</p>
      </div>
    </>
  );
}

export default function ItDashboard() {
  const handle = useCan("it:requests-handle"), approve = useCan("it:approve");
  return <OwnPage page={IT_DASHBOARD} title={TITLE} allowed={handle || approve}><Content /></OwnPage>;
}