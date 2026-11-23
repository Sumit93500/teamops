// IT requests (IT2): every request IT and the Admin can see, newest first, with filters (type, status, priority, assignee, who raised it, the
// shared date range) and a search; the dashboard's numbers open it on their view (?view=). A row opens the request's own page. The list is
// data/it-desk.js requestsFor, so who sees what is the desk's rule. Components: Table, FilterBar, DateRange.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { requestsFor, itQueue } from "../../../assets/js/data/it-desk.js";
import { TYPE_KEYS, STATUSES, PRIORITIES, OPEN_STATUSES } from "../../../assets/js/data/it-rules.js";
import { todayIso, localDateOf } from "../../../assets/js/ui/leave-view.js";
import OwnPage from "../ui/OwnPage.jsx";
import Table from "../components/Table.jsx";
import { PageHeader, Card } from "../components/Layout.jsx";
import { EmptyState, NO_DATA } from "../components/Basics.jsx";
import { DateRange, FilterBar, FilterSelect, FilterSearch } from "../components/Controls.jsx";
import { Icon } from "../components/icons.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { countText } from "../data/counts.js";
import { pageUrl, IT_REQUESTS, IT_REQUEST, IT_NEW } from "../routes.js";
import { StatusChip, PriorityChip, DueCell, typeLabel, nameOf, PRIORITY_LABEL, itPeople } from "../ui/it.jsx";

const NONE = { preset: "", from: "", to: "" };
const VIEWS = { open: "Open requests", overdue: "Overdue requests", mine: "Assigned to you", unassigned: "Unassigned requests", awaiting: "Awaiting approval" };

function Content() {
  const { userId } = useSession();
  const [params, setParams] = useSearchParams();
  const view = VIEWS[params.get("view")] ? params.get("view") : "";
  const [f, setF] = useState({ type: "", status: "", priority: "", assignee: "", requester: "" });
  const [range, setRange] = useState(NONE);
  const [query, setQuery] = useState("");
  const d = useData(() => ({ all: requestsFor(userId), overdue: new Set(itQueue(userId).filter((r) => r.dueAt < new Date().toISOString() && r.status !== "awaiting-approval").map((r) => r.id)) }), [userId]);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const q = query.trim().toLowerCase();
  const byView = (r) => !view || (view === "open" ? OPEN_STATUSES.includes(r.status) : view === "overdue" ? d.overdue.has(r.id) : view === "mine" ? r.assignedTo === userId && OPEN_STATUSES.includes(r.status)
    : view === "unassigned" ? !r.assignedTo && r.status === "open" : r.status === "awaiting-approval");
  const rows = d.all.filter((r) => byView(r) && (!f.type || r.type === f.type) && (!f.status || r.status === f.status) && (!f.priority || r.priority === f.priority)
    && (!f.assignee || (f.assignee === "none" ? !r.assignedTo : r.assignedTo === f.assignee)) && (!f.requester || r.requesterId === f.requester)
    && (!range.preset || (localDateOf(r.createdAt) >= range.from && localDateOf(r.createdAt) <= range.to))
    && (!q || [r.id, r.title, r.details, nameOf(r.requesterId), nameOf(r.subjectPersonId)].join(" ").toLowerCase().includes(q)));
  const active = Boolean(view || Object.values(f).some(Boolean) || range.preset || q);
  const clear = () => { setF({ type: "", status: "", priority: "", assignee: "", requester: "" }); setRange(NONE); setQuery(""); setParams({}); };
  const requesters = [...new Set(d.all.map((r) => r.requesterId))].map((id) => ({ value: id, label: nameOf(id) })).sort((a, b) => a.label.localeCompare(b.label));
  const assignees = [{ value: "none", label: "Unassigned" }, ...itPeople().map((u) => ({ value: u.id, label: u.name }))];
  const columns = [
    { key: "title", label: "Request", className: "it-title-col", sort: (r) => r.title, csv: (r) => `${r.id} ${r.title}`, render: (r) => <span className="it-cell"><Link to={`${pageUrl(IT_REQUEST)}?id=${r.id}`}><strong>{r.title}</strong></Link><span className="it-sub">{r.id}, {typeLabel(r.type)}</span></span> },
    { key: "status", label: "Status", className: "it-status-col", sort: (r) => r.status, render: (r) => <span className="it-cell"><StatusChip status={r.status} /><PriorityChip priority={r.priority} /></span> },
    { key: "who", label: "Raised by", className: "it-who-col", sort: (r) => nameOf(r.requesterId), render: (r) => <span className="it-cell">{nameOf(r.requesterId)}{r.subjectPersonId && r.subjectPersonId !== r.requesterId && <span className="it-sub">About {nameOf(r.subjectPersonId)}</span>}<span className="it-sub">{r.assignedTo ? `With ${nameOf(r.assignedTo)}` : "Not assigned"}</span></span> },
    { key: "due", label: "Due", className: "it-due-col", sort: (r) => r.dueAt, render: (r) => <DueCell r={r} /> },
  ];
  return (
    <>
      <PageHeader title="IT requests" subtitle="Everything raised with IT" breadcrumb={[{ label: "IT desk", to: pageUrl("it/dashboard.html") }, { label: "Requests" }]}
        actions={<Link className="ds-btn ds-btn--primary" to={pageUrl(IT_NEW)}><Icon d="M12 5v14M5 12h14" />Raise a request</Link>} />
      <div className="ds-stack">
        <Card id="requests-card" title={view ? VIEWS[view] : "All requests"} meta={<span id="requests-count">{countText(rows.length, d.all.length, "request", { filtered: active })}</span>}>
          <div className="ds-stack">
            <div className="as-filters"><FilterBar label="Filter the requests" active={active} onClearAll={clear}>
              <FilterSelect label="Type" value={f.type} onChange={set("type")} allLabel="All types" options={TYPE_KEYS.map((t) => ({ value: t, label: typeLabel(t) }))} />
              <FilterSelect label="Status" value={f.status} onChange={set("status")} allLabel="All statuses" options={Object.entries(STATUSES).map(([k, s]) => ({ value: k, label: s.label }))} />
              <FilterSelect label="Priority" value={f.priority} onChange={set("priority")} allLabel="All priorities" options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} />
              <FilterSelect label="Assigned to" value={f.assignee} onChange={set("assignee")} allLabel="Anyone" options={assignees} />
              <FilterSelect label="Raised by" value={f.requester} onChange={set("requester")} allLabel="Anyone" options={requesters} />
              <DateRange value={range} onChange={setRange} today={todayIso()} label="Raised in" />
              <FilterSearch label="Search" value={query} onChange={setQuery} placeholder="Title, id or person" />
            </FilterBar></div>
            {d.all.length === 0 ? <EmptyState title="No requests yet." text="Requests appear here as people raise them." />
              : rows.length === 0 ? <p className="text-muted" id="requests-table">{range.preset ? NO_DATA : "No requests match these filters."}</p>
              : <Table bare columns={columns} rows={rows} rowKey={(r) => r.id} empty="" tableId="requests-table" tableClass="table table--tight it-table" />}
          </div>
        </Card>
      </div>
    </>
  );
}

export default function ItRequests() {
  const handle = useCan("it:requests-handle"), approve = useCan("it:approve");
  return <OwnPage page={IT_REQUESTS} title="IT requests" allowed={handle || approve}><Content /></OwnPage>;
}