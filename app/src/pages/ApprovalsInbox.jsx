// Approvals (pages/requests/approvals-inbox.html + assets/js/pages/approvals-inbox.js), ported (round 13a): a personal inbox,
// for anyone signed in, showing what waits for them: leave requests, attendance corrections, expense claims, asset requests
// and (with salary:view) salary changes, from ui/waiting.js and the stores, with the old page's sample rows (role change,
// purchase order, backup restore) for approvals:view only, their buttons placeholders. Pending / Approved / Rejected with
// counts, the type filter, the stats, who approves what, and Recently decided. A pending row's title opens the approval card
// (without More); Approve / Reject go through the same flows as the other pages (Decision.jsx). Components: Table, Tabs,
// StatCard, Badge, DecisionButtons, NotBuilt; the card is still ui/approval-card.js (its React rewrite is round 13b).
import { useState } from "react";
import { Link } from "react-router-dom";
import { can } from "../../../assets/js/core/rbac.js";
import { getUser } from "../../../assets/js/data/store.js";
import { allRequests, decidedBy } from "../../../assets/js/data/leave-store.js";
import { allRegularizations } from "../../../assets/js/data/attendance-store.js";
import { dayNumber, isoFromDayNumber } from "../../../assets/js/data/holidays.js";
import { expenseDecisionsBy, managesAnyone } from "../../../assets/js/data/expenses-store.js";
import { EXPENSE_POLICY } from "../../../assets/js/data/expenses.js";
import { STAGE_NAME, categoryLabel, chainText } from "../../../assets/js/ui/expense-view.js";
import { assetRequestDecisionsBy } from "../../../assets/js/data/asset-requests-store.js";
import { STAGE_NAME as ASSET_STAGE_NAME, requestTitle as assetRequestTitle } from "../../../assets/js/ui/asset-request-view.js";
import { assetTypeLabel } from "../../../assets/js/ui/inventory-view.js";
import { salaryFor, salaryProposals } from "../../../assets/js/data/payroll-store.js";
import { todayIso, formatDay, formatDays, requestDates, typeLabel, initials, avatarClass, decisionOf, localDateOf, nameOf } from "../../../assets/js/ui/leave-view.js";
import { correctionDetails } from "../../../assets/js/ui/attendance-view.js";
import { waitingFor, waitingCount } from "../data/waiting.js";
import { allLocationChanges } from "../../../assets/js/data/locations-store.js";
import { openApprovalCard } from "../ui/ApprovalCard.jsx";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { StatStrip, StatCard, Badge, Tabs, NotBuilt } from "../components/Basics.jsx";
import { useDecision, LEAVE_FLOW, CORRECTION_FLOW, EXPENSE_FLOW, ASSET_FLOW, SALARY_FLOW, LOCATION_FLOW, DecisionButtons } from "../components/Decision.jsx";
import { StatusBadge } from "../ui/leave.jsx";
import { rupees } from "../ui/payroll.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { pageUrl } from "../routes.js";

const PAGE = "requests/approvals-inbox.html";
const DAY_MS = 24 * 60 * 60 * 1000;
const TABS = [["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"]];
const TYPES = ["Access", "Purchase", "System", "Leave", "Attendance", "Expense", "Asset", "Salary", "Location"];
const STATS = [["Waiting for you", 3, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2"], ["Approved this week", 2, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M8 12l3 3 5-6"],
  ["Rejected this week", 4, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M9 9l6 6M15 9l-6 6"], ["Average response", 1, "M4 20V10M10 20V4M16 20v-7M22 20H2"]];
// The old page's sample rows (data-static in its HTML): pending ones wait for nobody, their buttons are placeholders.
const SAMPLE_PENDING = [
  { type: "access", av: "avatar avatar--1", ini: "RC", title: "Role change: an employee", badge: "Access", by: "An HR Manager", details: "Employee to Team Lead", when: "2 hours" },
  { type: "purchase", av: "avatar avatar--3", ini: "PO", title: "Purchase order PO-2291", badge: "Purchase", by: "An Admin", details: "₹9,75,000, TechNova", when: "1 day" },
  { type: "system", av: "avatar avatar--4", ini: "BR", title: "Backup restore request", badge: "System", by: "An Admin", details: "Backup of 14 Sep, 1.2 GB", when: "3 hours" },
];
const SAMPLE_DECIDED = [
  { type: "access", status: "approved", date: "2026-09-16", title: "Role change: an employee", badge: "Access", by: "An HR Manager", when: "16 Sep" },
  { type: "system", status: "rejected", date: "2026-09-11", title: "Backup restore request", badge: "System", by: "An Admin", when: "11 Sep" },
];

function waitingSince(timestamp) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(timestamp)) / 60000));
  if (minutes < 60) return minutes <= 1 ? "Just now" : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}
const leaveTitle = (r) => `Leave: ${nameOf(r.userId)}, ${requestDates(r)}`;
const correctionTitle = (r) => `Regularization: ${nameOf(r.userId)}, ${formatDay(r.date)}`;
const expenseTitle = (c) => `Expense: ${nameOf(c.userId)}, ${rupees(c.amount)}`;
const assetTitle = (r) => `Asset: ${nameOf(r.userId)}, ${assetTypeLabel(r.assetType).toLowerCase()}`;
const salaryTitle = (p) => `Salary: ${nameOf(p.userId)}, ${rupees(p.gross)}`;
const locationTitle = (r) => `Home location: ${nameOf(r.userId)}, ${r.kind}`;
const decisionDate = (r) => localDateOf(decisionOf(r).at);
const reachedAt = (claim, entry) => claim.history[claim.history.indexOf(entry) - 1]?.at ?? claim.history[0].at;

// Everything the page shows, read from the stores for this person (approvals-inbox.js's lists).
function readInbox(userId, role) {
  const user = getUser(userId);
  const allLeave = can("leave:approve"), allCorrections = can("attendance:approve"), showSalary = can("salary:view");
  const waiting = user ? waitingFor(userId, role) : { leave: [], corrections: [], expenses: [], assets: [], salary: [], locations: [] };
  const asDecidedBy = (request) => {
    const i = request.history.map((h) => h.byUserId === userId && (h.decision === "approved" || h.decision === "rejected")).lastIndexOf(true);
    return i < 0 ? null : { ...request, status: request.history[i].decision, history: request.history.slice(0, i + 1) };
  };
  const byDecision = (a, b) => decisionOf(b).at.localeCompare(decisionOf(a).at);
  const leavePending = [...waiting.leave].sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id));
  const leaveDecided = (s) => (allLeave ? allRequests().filter((r) => r.status === s) : allRequests().map(asDecidedBy).filter((r) => r?.status === s)).sort(byDecision);
  const corrPending = [...waiting.corrections].sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id, "en", { numeric: true }));
  const corrDecided = (s) => (allCorrections ? allRegularizations().filter((r) => r.status === s) : allRegularizations().map(asDecidedBy).filter((r) => r?.status === s)).sort(byDecision);
  const expPending = [...waiting.expenses].sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id, "en", { numeric: true }));
  const expDecided = (d) => (user ? expenseDecisionsBy(userId) : []).filter((x) => x.entry.decision === d);
  const assetPending = [...waiting.assets].sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id, "en", { numeric: true }));
  const assetDecided = (d) => (user ? assetRequestDecisionsBy(userId) : []).filter((x) => x.entry.decision === d);
  const salaryPending = [...waiting.salary].sort((a, b) => a.enteredAt.localeCompare(b.enteredAt) || a.id.localeCompare(b.id, "en", { numeric: true }));
  const salaryDecided = (s) => (showSalary && user ? salaryProposals() : []).filter((p) => p.status === s && p.decidedBy !== p.enteredBy && (p.decidedBy === userId || p.enteredBy === userId))
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt) || b.id.localeCompare(a.id, "en", { numeric: true }));
  const salaryByMe = (s) => salaryDecided(s).filter((p) => p.decidedBy === userId);
  const locPending = [...waiting.locations].sort((a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.id.localeCompare(b.id, "en", { numeric: true }));
  const locDecided = (s) => (user ? allLocationChanges() : []).filter((r) => r.status === s && r.decidedBy === userId && r.userId !== userId)
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt) || b.id.localeCompare(a.id, "en", { numeric: true }));

  // The inbox rows: { type, kind, id, userId, title, badge, by, details, when, pending, record, permission } or a sample { sample }.
  const leaveRow = (r) => ({ type: "leave", kind: "leave", id: r.id, userId: r.userId, title: leaveTitle(r), badge: "Leave", by: nameOf(r.userId), details: `${typeLabel(r.type)}, ${formatDays(r.days)}`,
    when: r.status === "pending" ? waitingSince(r.history[0].at) : formatDay(decisionDate(r)), pending: r.status === "pending", record: r, permission: r.stage === "manager" ? undefined : "leave:approve" });
  const corrRow = (r) => ({ type: "attendance", kind: "corrections", id: r.id, userId: r.userId, title: correctionTitle(r), badge: "Attendance", by: nameOf(r.userId), details: correctionDetails(r),
    when: r.status === "pending" ? waitingSince(r.history[0].at) : formatDay(decisionDate(r)), pending: r.status === "pending", record: r, permission: r.stage === "manager" ? undefined : "attendance:approve" });
  const expRow = (c, decided = null) => {
    let details;
    if (decided) details = `${categoryLabel(c.category)}, you ${decided.decision} it at the ${STAGE_NAME[decided.stage]} stage`;
    else {
      details = `${categoryLabel(c.category)}, ${STAGE_NAME[c.stage]} stage`;
      const earlier = c.history.find((h) => h.byUserId === userId && h.decision === "approved" && h.stage !== c.stage);
      if (earlier) details += `. You approved it at the ${STAGE_NAME[earlier.stage]} stage on ${formatDay(localDateOf(earlier.at))}`;
    }
    return { type: "expense", kind: "expenses", id: c.id, userId: c.userId, title: expenseTitle(c), badge: "Expense", by: nameOf(c.userId), details, attrs: { "data-claim-id": c.id },
      when: decided ? formatDay(localDateOf(decided.at)) : waitingSince(c.history.at(-1).at), pending: !decided, record: c, permission: c.stage === "manager" ? undefined : "expenses:approve" };
  };
  const assetRow = (r, decided = null) => {
    let details;
    if (decided) details = `${assetRequestTitle(r)}, you ${decided.decision} it at the ${ASSET_STAGE_NAME[decided.stage]} stage`;
    else {
      details = `${assetRequestTitle(r)}, ${ASSET_STAGE_NAME[r.stage]} stage`;
      const earlier = r.history.find((h) => h.byUserId === userId && h.decision === "approved" && h.stage !== r.stage);
      if (earlier) details += `. You approved it at the ${ASSET_STAGE_NAME[earlier.stage]} stage on ${formatDay(localDateOf(earlier.at))}`;
    }
    return { type: "asset", kind: "assets", id: r.id, userId: r.userId, title: assetTitle(r), badge: "Asset", by: nameOf(r.userId), details, attrs: { "data-request-id": r.id },
      when: decided ? formatDay(localDateOf(decided.at)) : waitingSince(r.history.at(-1).at), pending: !decided, record: r, permission: r.stage === "manager" ? undefined : "assets:approve" };
  };
  const salaryRow = (p) => {
    const from = `From ${formatDay(p.effectiveFrom, true)}`;
    let details;
    if (p.status === "pending") {
      const now = salaryFor(p.userId, Number(p.effectiveFrom.slice(0, 4)), Number(p.effectiveFrom.slice(5, 7)));
      details = `${from}, now ${now ? rupees(now.gross) : "no salary on file"}`;
    } else {
      const note = p.status === "rejected" ? p.history.at(-1)?.note ?? "" : "";
      details = `${from}, ${p.decidedBy === userId ? "you" : nameOf(p.decidedBy)} ${p.status} it${note ? `: ${note}` : ""}`;
    }
    return { type: "salary", kind: "salary", id: p.id, userId: p.userId, title: salaryTitle(p), badge: "Salary", by: nameOf(p.enteredBy), details, attrs: { "data-proposal-id": p.id },
      when: p.status === "pending" ? waitingSince(p.enteredAt) : formatDay(localDateOf(p.decidedAt)), pending: p.status === "pending", record: p, permission: undefined };
  };
  const locRow = (r) => ({ type: "location", kind: "locations", id: r.id, userId: r.userId, title: locationTitle(r), badge: "Location", by: nameOf(r.userId),
    details: r.status === "rejected" && r.note ? `${r.place.address}: ${r.note}` : r.place.address, attrs: { "data-change-id": r.id },
    when: r.status === "pending" ? waitingSince(r.requestedAt) : formatDay(localDateOf(r.decidedAt)), pending: r.status === "pending", record: r, permission: "locations:review" });
  const real = (which) => {
    if (which === "pending") {
      return [...leavePending.map((r) => [r.appliedOn, leaveRow(r)]), ...corrPending.map((r) => [r.appliedOn, corrRow(r)]), ...expPending.map((c) => [c.appliedOn, expRow(c)]),
        ...assetPending.map((r) => [r.appliedOn, assetRow(r)]), ...salaryPending.map((p) => [p.enteredAt, salaryRow(p)]), ...locPending.map((r) => [localDateOf(r.requestedAt), locRow(r)])].sort((a, b) => a[0].localeCompare(b[0])).map((x) => x[1]);
    }
    return [...leaveDecided(which).map((r) => [decisionOf(r).at, leaveRow(r)]), ...corrDecided(which).map((r) => [decisionOf(r).at, corrRow(r)]),
      ...expDecided(which).map((x) => [x.entry.at, expRow(x.claim, x.entry)]), ...assetDecided(which).map((x) => [x.entry.at, assetRow(x.request, x.entry)]),
      ...salaryDecided(which).map((p) => [new Date(p.decidedAt).toISOString(), salaryRow(p)]), ...locDecided(which).map((r) => [r.decidedAt, locRow(r)])].sort((a, b) => b[0].localeCompare(a[0])).map((x) => x[1]);
  };
  const samples = can("approvals:view");
  const inbox = (which) => (which === "pending" ? [...(samples ? SAMPLE_PENDING.map((s) => ({ ...s, sample: true })) : []), ...real("pending")]
    : [...(samples ? SAMPLE_DECIDED.filter((s) => s.status === which).map((s) => ({ ...s, sample: true, details: "—", decidedClone: true })) : []), ...real(which)]);
  const lists = Object.fromEntries(TABS.map(([k]) => [k, inbox(k)]));

  // stats
  const showLeave = Boolean(user) && (allLeave || managesAnyone(userId) || leavePending.length > 0 || allRequests().some((r) => decidedBy(r, userId)));
  const showCorr = Boolean(user) && (allCorrections || managesAnyone(userId) || corrPending.length > 0 || allRegularizations().some((r) => decidedBy(r, userId)));
  const showsExp = Boolean(user) && (can("expenses:approve") || managesAnyone(userId) || expPending.length > 0 || expenseDecisionsBy(userId).length > 0);
  const showsAssets = Boolean(user) && (can("assets:approve") || managesAnyone(userId) || assetPending.length > 0 || assetRequestDecisionsBy(userId).length > 0);
  const showsSalary = salaryPending.length > 0 || salaryByMe("approved").length > 0 || salaryByMe("rejected").length > 0;
  const showsLoc = locPending.length > 0 || locDecided("approved").length > 0 || locDecided("rejected").length > 0;
  const since = isoFromDayNumber(dayNumber(todayIso()) - 6);
  let stats = [String(user ? waitingCount(userId, role) : 0), "—", "—", "—"];
  const requests = [...leaveDecided("approved"), ...leaveDecided("rejected"), ...corrDecided("approved"), ...corrDecided("rejected")]
    .map((r) => ({ status: r.status, date: decisionDate(r), auto: decisionOf(r).decision === "auto-approved", days: (Date.parse(decisionOf(r).at) - Date.parse(r.history[0].at)) / DAY_MS }));
  const claims = [...expDecided("approved"), ...expDecided("rejected")].map(({ claim, entry }) => ({ status: entry.decision, date: localDateOf(entry.at), auto: false, days: (Date.parse(entry.at) - Date.parse(reachedAt(claim, entry))) / DAY_MS }));
  const assets = [...assetDecided("approved"), ...assetDecided("rejected")].map(({ request, entry }) => ({ status: entry.decision, date: localDateOf(entry.at), auto: false, days: (Date.parse(entry.at) - Date.parse(reachedAt(request, entry))) / DAY_MS }));
  const changes = [...salaryByMe("approved"), ...salaryByMe("rejected")].map((p) => ({ status: p.status, date: localDateOf(p.decidedAt), auto: false, days: (Date.parse(p.decidedAt) - Date.parse(p.enteredAt)) / DAY_MS }));
  const homes = [...locDecided("approved"), ...locDecided("rejected")].map((r) => ({ status: r.status, date: localDateOf(r.decidedAt), auto: false, days: (Date.parse(r.decidedAt) - Date.parse(r.requestedAt)) / DAY_MS }));
  if (showLeave || showCorr || showsExp || showsAssets || showsSalary || showsLoc) {
    const decided = [...requests, ...claims, ...assets, ...changes, ...homes];
    const times = decided.filter((x) => !x.auto).map((x) => x.days);
    stats = [stats[0], String(decided.filter((x) => x.status === "approved" && x.date >= since).length), String(decided.filter((x) => x.status === "rejected" && x.date >= since).length),
      times.length ? `${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)} days` : "—"];
  }
  // Recently decided: the last 7 days, newest first
  const recent = [
    ...(samples ? SAMPLE_DECIDED.map((s) => ({ sample: true, title: s.title, badge: s.badge, by: s.by, status: s.status, date: s.date, dateText: s.when })) : []),
    ...[...leaveDecided("approved"), ...leaveDecided("rejected")].filter((r) => decisionDate(r) >= since).map((r) => ({ title: leaveTitle(r), badge: "Leave", by: nameOf(r.userId), status: r.status, date: decisionDate(r) })),
    ...[...corrDecided("approved"), ...corrDecided("rejected")].filter((r) => decisionDate(r) >= since).map((r) => ({ title: correctionTitle(r), badge: "Attendance", by: nameOf(r.userId), status: r.status, date: decisionDate(r) })),
    ...[...expDecided("approved"), ...expDecided("rejected")].map(({ claim, entry }) => ({ title: expenseTitle(claim), badge: "Expense", by: nameOf(claim.userId), status: entry.decision, date: localDateOf(entry.at) })).filter((x) => x.date >= since),
    ...[...assetDecided("approved"), ...assetDecided("rejected")].map(({ request, entry }) => ({ title: assetTitle(request), badge: "Asset", by: nameOf(request.userId), status: entry.decision, date: localDateOf(entry.at) })).filter((x) => x.date >= since),
    ...[...salaryByMe("approved"), ...salaryByMe("rejected")].map((p) => ({ title: salaryTitle(p), badge: "Salary", by: nameOf(p.enteredBy), status: p.status, date: localDateOf(p.decidedAt) })).filter((x) => x.date >= since),
    ...[...locDecided("approved"), ...locDecided("rejected")].map((r) => ({ title: locationTitle(r), badge: "Location", by: nameOf(r.userId), status: r.status, date: localDateOf(r.decidedAt) })).filter((x) => x.date >= since),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return { user, lists, stats, recent };
}

export default function ApprovalsInbox() {
  const { userId, role } = useSession();
  const canWorkflows = useCan("workflows:view"), canDecideSamples = useCan("approvals:decide");
  const flows = { leave: useDecision(LEAVE_FLOW), corrections: useDecision(CORRECTION_FLOW), expenses: useDecision(EXPENSE_FLOW), assets: useDecision(ASSET_FLOW), salary: useDecision(SALARY_FLOW), locations: useDecision(LOCATION_FLOW) };
  const [tab, setTab] = useState(0);
  const [type, setType] = useState("");
  const d = useData(() => readInbox(userId, role?.key), [userId, role?.key]);
  const which = TABS[tab][0];
  const all = d.lists[which];
  const shown = all.filter((r) => !type || r.type === type);
  const chain = chainText();
  const sampleButtons = <div className="btn-group">
    <NotBuilt what="Reject" className="btn btn--sm" data-permission="approvals:decide" hidden={!canDecideSamples || undefined}>Reject</NotBuilt>
    <NotBuilt what="Approve" className="btn btn--primary btn--sm" data-permission="approvals:decide" hidden={!canDecideSamples || undefined}>Approve</NotBuilt>
  </div>;
  const titleCell = (r) => {
    if (r.sample) {
      return <div className="table__user">{!r.decidedClone && <div className={r.av}>{r.ini}</div>}<div><span className="table__user-name">{r.title}</span><span className="table__user-sub">Sample, not built yet</span></div></div>;
    }
    const open = (e) => openApprovalCard(r.kind, r.id, { opener: e.currentTarget, more: false, refresh: bump });
    return (
      <div className="table__user">
        <div className={avatarClass(r.userId)}>{initials(nameOf(r.userId))}</div>
        {r.pending
          ? <span className="table__user-name" role="button" aria-haspopup="dialog" tabIndex={0} data-card={r.kind} onClick={open} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(e); } }}>{r.title}</span>
          : <span className="table__user-name">{r.title}</span>}
      </div>
    );
  };
  const columns = [
    { key: "title", label: "Request", render: titleCell },
    { key: "type", label: "Type", render: (r) => <Badge square>{r.badge}</Badge> },
    { key: "by", label: "Requested by", render: (r) => r.by },
    { key: "details", label: "Details", render: (r) => r.details },
    { key: "when", label: which === "pending" ? "Waiting" : "Decided", render: (r) => r.when },
    { key: "actions", label: "Actions", actions: true, render: (r) => {
      if (r.sample) return r.decidedClone ? null : sampleButtons;
      if (!r.pending) return null;
      const flow = flows[r.kind];
      return <DecisionButtons permission={r.permission} onReject={() => flow.reject(r.record)} onApprove={() => flow.approve(r.record)} />;
    } },
  ];
  const decidedColumns = [
    { key: "title", label: "Request", render: (r) => (r.sample ? <div className="table__user"><div><span className="table__user-name">{r.title}</span><span className="table__user-sub">Sample, not built yet</span></div></div> : <span className="table__user-name">{r.title}</span>) },
    { key: "type", label: "Type", render: (r) => <Badge square>{r.badge}</Badge> },
    { key: "by", label: "Requested by", render: (r) => r.by },
    { key: "decision", label: "Decision", render: (r) => <StatusBadge status={r.status} /> },
    { key: "date", label: "Date", render: (r) => r.dateText ?? formatDay(r.date) },
  ];
  const WHO = [["Expense claims", chain.always], ["", `Then ${chain.extra} too, above ${rupees(EXPENSE_POLICY.adminAbove)}`], ["Leave requests", "Manager, then HR or an Admin"],
    ["Attendance corrections", "Manager, then HR or an Admin"], ["Purchase orders", "Not built yet"], ["Role changes", "Not built yet"], ["Salary revisions", "Finance, then an Admin"],
    ["Backup restore", "Not built yet"], ["Asset requests", "Manager, then an Admin"], ["Home location changes", "An Admin"]];

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Approvals</h1>
          <p className="page-header__subtitle">Everything waiting for your decision</p>
        </div>
        <div className="page-header__actions">
          <Link className="btn" to={pageUrl("access/approval-workflows.html")} data-permission="workflows:view" hidden={!canWorkflows || undefined}>Approval rules</Link>
        </div>
      </div>
      <div className="stack">
        <StatStrip label="Key numbers">
          {STATS.map(([label, tone, icon], i) => <StatCard key={label} icon={icon} tone={tone} label={label} value={d.stats[i]} />)}
        </StatStrip>
        <div className="grid grid-main-aside grid-main-aside--wide">
          <section className="card">
            <div className="table__toolbar">
              <Tabs pill active={tab} onChange={setTab} tabs={TABS.map(([k, label]) => ({ label, count: String(d.lists[k].length) }))} />
              <select className="select select--sm" aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">All types</option>
                {TYPES.map((t) => <option key={t} value={t.toLowerCase()}>{t}</option>)}
              </select>
            </div>
            <Table bare pager={false} tableClass="table table--fit" tableId="inbox-table" columns={columns} rows={shown} rowKey={(r) => `${r.kind ?? r.type}-${r.id ?? r.title}`}
              rowProps={(r) => ({ "data-type": r.type, ...(r.attrs ?? {}) })} empty={which === "pending" && !type ? "Nothing is waiting for you." : "Nothing here for these filters."} />
            <div className="card__footer"><span className="card__meta">{`Showing ${shown.length} of ${all.length} ${which} requests`}</span></div>
          </section>
          <aside className="stack">
            <section className="card">
              <div className="card__header"><h3 className="card__title">Who approves what</h3></div>
              <div className="card__body">
                <dl className="kv" id="who-approves">{WHO.map(([t, v], i) => <div className="kv__row" key={i}><dt>{t}</dt><dd>{v}</dd></div>)}</dl>
              </div>
            </section>
            <div className="alert alert--info">You can't approve or reject a request you raised yourself. An Admin's own requests don't come here: they're approved automatically.</div>
          </aside>
        </div>
        <section className="card">
          <div className="card__header">
            <h3 className="card__title">Recently decided</h3>
            <span className="card__meta">Recent</span>
          </div>
          <Table bare pager={false} tableId="decided-table" columns={decidedColumns} rows={d.recent} rowKey={(r) => `${r.title}-${r.date}-${r.status}`} rowProps={(r) => ({ "data-date": r.date })} empty={null} />
        </section>
      </div>
      {Object.values(flows).map((f, i) => <span key={i} style={{ display: "contents" }}>{f.modal}</span>)}
    </Frame>
  );
}
