// Leave approvals (pages/leave/leave-approvals.html + assets/js/pages/leave-approvals.js), ported (round 10), for leave:approve:
// Pending / Approved / Rejected with counts, the name search and the type filter, 10 a page, Export (the old exporter: every
// filtered row, Employee split into Department, ISO dates); on Pending, Approve / Reject where the viewer may decide now
// (Decision.jsx), else who it waits for; the stats, out in the next 7 days, how approval works and the overlap alert.
// The table, tabs, stats, badges and person cells are the round 4 components.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUser } from "../../../assets/js/data/store.js";
import { LEAVE_POLICY, allRequests, pendingFor, overlaps, currentApproverName } from "../../../assets/js/data/leave-store.js";
import { csvColumns, initExports } from "../../../assets/js/ui/csv-export.js";
import { todayIso, formatDay, requestDates, requestDatesIso, typeLabel, departmentName, decisionOf, localDateOf, nameOf, oldestPendingNote } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { StatStrip, StatCard, PersonCell, Badge, Tabs, Stepper } from "../components/Basics.jsx";
import { useDecision, LEAVE_FLOW, DecisionButtons } from "../components/Decision.jsx";
import { StatusBadge, OutNextWeek } from "../ui/leave.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { pageUrl } from "../routes.js";
import { outcomeOf, leavePolicyOn } from "../ui/leaveband.jsx";

csvColumns("leave-requests", { Employee: { split: "Department" }, Days: { number: true } });   // Round Data export (part 2: the split)

const PAGE = "leave/leave-approvals.html";
const DAY_MS = 24 * 60 * 60 * 1000;
const TABS = [["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"]];
const decidedAt = (r) => decisionOf(r)?.at ?? "";
const STATS = [
  ["Waiting, all stages", 3, "M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6"],
  ["Approved this month", 2, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M8 12l3 3 5-6"],
  ["Rejected this month", 4, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M9 9l6 6M15 9l-6 6"],
  ["Average decision time", 1, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2"],
];

function stageBadge(request) {
  if (request.status !== "pending") return <StatusBadge status={request.status} />;
  return request.stage === "manager" ? <Badge tone="warning" dot>With manager</Badge> : <Badge tone="info" dot>With HR</Badge>;
}

export default function LeaveApprovals() {
  const { userId, role } = useSession();
  const canExport = useCan("reports:export");
  const leave = useDecision(LEAVE_FLOW);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const which = TABS[tab][0];
  const d = useData(() => {
    const all = allRequests();
    const lists = {
      pending: all.filter((r) => r.status === "pending" && r.userId !== userId).sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id)),
      approved: all.filter((r) => r.status === "approved").sort((a, b) => decidedAt(b).localeCompare(decidedAt(a))),
      rejected: all.filter((r) => r.status === "rejected").sort((a, b) => decidedAt(b).localeCompare(decidedAt(a))),
    };
    return { all, lists, mine: new Set(pendingFor(userId, role?.key).map((r) => r.id)) };
  }, [userId, role?.key]);
  useEffect(() => { initExports(document.getElementById("main")); }, []);

  const today = todayIso();
  const query = search.trim().toLowerCase();
  const rows = d.lists[which].filter((r) => (!type || r.type === type) && (!query || nameOf(r.userId).toLowerCase().includes(query)));
  // the stats (renderStats)
  const decided = d.all.filter((r) => r.status === "approved" || r.status === "rejected");
  const thisMonth = (r) => decisionOf(r) && localDateOf(decisionOf(r).at).slice(0, 7) === today.slice(0, 7);
  const times = decided.filter((r) => decisionOf(r)?.decision !== "auto-approved").map((r) => (Date.parse(decisionOf(r).at) - Date.parse(r.history[0].at)) / DAY_MS);
  const values = [
    [String(d.lists.pending.length), oldestPendingNote(d.lists.pending, today)],
    [String(decided.filter((r) => r.status === "approved" && thisMonth(r)).length), ""],
    [String(decided.filter((r) => r.status === "rejected" && thisMonth(r)).length), ""],
    [times.length ? `${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)} days` : "—", ""],
  ];
  // the overlap alert: the first pending request in queue order whose dates clash with others in its department
  let overlap = null;
  for (const request of d.lists.pending) {
    const clashes = overlaps(request.id);
    if (!clashes.length) continue;
    const people = new Set(clashes.map((r) => r.userId)).size;
    const p = getUser(request.userId);
    overlap = `${p?.name ?? request.userId}'s dates overlap with ${people} other ${people === 1 ? "person" : "people"} from ${departmentName(p?.department)}. Check team cover before approving.`;
    break;
  }
  const columns = [
    { key: "employee", label: "Employee", render: (r) => { const p = getUser(r.userId); return <PersonCell userId={r.userId} name={p?.name ?? nameOf(r.userId) ?? r.userId} sub={departmentName(p?.department)} />; } },
    { key: "type", label: "Type", render: (r) => typeLabel(r.type) },
    { key: "dates", label: "Dates", render: (r) => requestDates(r), cellProps: (r) => ({ "data-csv": requestDatesIso(r) }) },
    { key: "days", label: "Days", num: true, render: (r) => String(r.days) },
    { key: "applied", label: "Applied", render: (r) => formatDay(r.appliedOn), cellProps: (r) => ({ "data-csv": r.appliedOn }) },
    { key: "stage", label: "Stage", render: stageBadge },
    ...(leavePolicyOn() ? [{ key: "pay", label: "Pay", render: (r) => { const o = outcomeOf(r, today); return o.lop > 0 ? <Badge tone="warning" dot>{`Would be unpaid: ${o.lop} ${o.lop === 1 ? "day" : "days"}`}</Badge> : <Badge tone="success" dot>Paid</Badge>; }, cellProps: (r) => ({ "data-csv": outcomeOf(r, today).lop > 0 ? "Unpaid" : "Paid" }) }] : []),
    { key: "actions", label: "Actions", actions: true, hidden: which !== "pending", render: (r) => (which !== "pending" ? null : d.mine.has(r.id)
      ? <DecisionButtons permission="leave:approve" onReject={() => leave.reject(r)} onApprove={() => leave.approve(r)} />
      : <span className="text-muted text-sm">{`Waiting for ${currentApproverName(r)}`}</span>) },
  ];

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Leave approvals</h1>
          <p className="page-header__subtitle">Requests waiting for a decision</p>
        </div>
        <div className="page-header__actions">
          <Link className="btn" to={pageUrl("leave/holidays.html")}>Holiday calendar</Link>
          <button className="btn btn--primary" type="button" data-permission="reports:export" hidden={!canExport || undefined} data-export>Export</button>
        </div>
      </div>
      <div className="stack">
        <StatStrip label="Key numbers">
          {STATS.map(([label, tone, icon], i) => <StatCard key={label} icon={icon} tone={tone} label={label} value={values[i][0]} note={values[i][1] || null} />)}
        </StatStrip>
        {/* --wide (13c, ruled): the aside goes under the table below 1440px, so the Actions column shows (the inbox's rule) */}
        <div className="grid grid-main-aside grid-main-aside--wide">
          <section className="card">
            <div className="table__toolbar">
              <Tabs pill active={tab} onChange={(i) => { setTab(i); setPage(1); }} tabs={TABS.map(([key, label]) => ({ label, count: String(d.lists[key].length) }))} />
              <div className="table__filters">
                <div className="input-group">
                  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  <input className="input input--sm input--search" type="search" placeholder="Search employees" aria-label="Search requests" data-table-filter="off"
                    value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="select select--sm" aria-label="Filter by leave type" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
                  <option value="">All types</option>
                  {Object.keys(LEAVE_POLICY).map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
                </select>
              </div>
            </div>
            <Table bare oldExport exportName="leave-requests" columns={columns} rows={rows} page={page} onPageChange={setPage}
              empty={which === "pending" && !search && !type ? "Nothing is waiting for a decision." : "No requests match these filters."} />
          </section>
          <aside className="stack">
            <OutNextWeek requests={d.all} today={today} />
            <section className="card">
              <div className="card__header"><h3 className="card__title">How approval works</h3></div>
              <div className="card__body">
                <Stepper steps={[
                  { title: "Employee sends", detail: "Balance is checked automatically" },
                  { title: "Reporting manager", detail: "Approves first; skipped when there's no manager on file, and decided by HR or an Admin if the manager can't" },
                  { title: "HR or an Admin", detail: "Final approval, updates balance and attendance" },
                ]} />
              </div>
            </section>
            <div className="alert alert--warning" id="overlap-alert" hidden={!overlap || undefined}>{overlap}</div>
          </aside>
        </div>
      </div>
      {leave.modal}
    </Frame>
  );
}
