// The Admin dashboard (pages/dashboard/admin.html + assets/js/pages/admin-dashboard.js), ported: the stats (total, present
// today, this month's payroll draft, items to reorder), the attendance rate for the last 14 days (round 4's chart: its
// readout and patterns; "No data in this range." when nobody was expected on any day, round 5's rule), what waits for the
// person (the approval card's Review), headcount by department, recent activity (by permission, as before), and today's
// attendance (search, department, 10 a page, Export). Rows and list items come from the old builders (ui/Nodes.jsx), so
// their markup, words and the CSV export are the old page's own.
import { useEffect, useState } from "react";
import { bump } from "../data/bus.js";
import { Link } from "react-router-dom";
import { getUser, getAllUsers, getAllDepartments, activeHeadcount } from "../../../assets/js/data/store.js";
import { runMonth, payrollRun, runTotals } from "../../../assets/js/data/payroll-store.js";
import { addDays } from "../../../assets/js/data/holidays.js";
import { teamFor, summaryRange, allRegularizations } from "../../../assets/js/data/attendance-store.js";
import { allRequests } from "../../../assets/js/data/leave-store.js";
import { allExpenses } from "../../../assets/js/data/expenses-store.js";
import { allAssetRequests } from "../../../assets/js/data/asset-requests-store.js";
import { reorderAlerts, allMovements, getItem } from "../../../assets/js/data/inventory-store.js";
import {
  el, todayIso, formatRange, monthName, departmentName, personCell, plural, nameOf, typeLabel, requestDates, formatDays, formatDay,
  initials, avatarClass, localDateOf, showReason,
} from "../../../assets/js/ui/leave-view.js";
import { dayBadge, presentNote, checkInCell, hoursCell, correctionDetails } from "../../../assets/js/ui/attendance-view.js";
import { STAGE_NAME as EXPENSE_STAGE, categoryLabel } from "../../../assets/js/ui/expense-view.js";
import { STAGE_NAME as ASSET_STAGE, requestTitle as assetRequestTitle } from "../../../assets/js/ui/asset-request-view.js";
import { assetTypeLabel, movementTypeLabel, officeDate } from "../../../assets/js/ui/inventory-view.js";
import { attendanceRateChart, headcountChart, valuesOf } from "../../../assets/js/data/chart-data.js";
import { rupees } from "../../../assets/js/ui/money.js";
import { csvColumns, csvRows, csvStat, initExports } from "../../../assets/js/ui/csv-export.js";
import { waitingFor } from "../data/waiting.js";
import { cardLink } from "../ui/ApprovalCard.jsx";
import { can } from "../../../assets/js/core/rbac.js";
import { resolvePageLink } from "../../../assets/js/core/paths.js";
import Frame from "../ui/Frame.jsx";
import Nodes from "../ui/Nodes.jsx";
import { StatStrip, StatCard } from "../components/Basics.jsx";
import { ColumnChart } from "../components/Charts.jsx";
import { BarChart } from "../components/charts/Charts.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { pageUrl } from "../routes.js";

csvColumns("admin-dashboard-attendance", { Employee: { split: "Work email" } });   // Round Data export part 2

const PAGE = "dashboard/admin.html";
const CHART_DAYS = 14, PAGE_SIZE = 10, SHOWN_APPROVALS = 4, SHOWN_ACTIVITY = 5;
const MARK_ICON = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M8 12l3 3 5-6";   // F1: Mark attendance, as on the Employee dashboard
const ICONS = {
  total: "M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-2a4 4 0 0 0-3-3.8M16 3.2a3.5 3.5 0 0 1 0 6.6",
  present: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2",
  payroll: "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M17 14h1",
  stock: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
};

// ---------- pending approvals (admin-dashboard.js renderApprovals) ----------
const sentOn = (request) => request.appliedOn ?? (request.requestedAt ? localDateOf(request.requestedAt) : request.enteredAt.slice(0, 10));
const APPROVAL_TEXT = {
  leave: (r) => [`${nameOf(r.userId)}, ${typeLabel(r.type).toLowerCase()}`, `${requestDates(r)}, ${formatDays(r.days)}`],
  corrections: (r) => [`Regularization: ${nameOf(r.userId)}`, `${formatDay(r.date)}: ${correctionDetails(r)}`],
  expenses: (c) => [`Expense claim: ${nameOf(c.userId)}`, `${rupees(c.amount)}, ${categoryLabel(c.category)}, ${EXPENSE_STAGE[c.stage]} stage`],
  assets: (r) => [`Asset request: ${nameOf(r.userId)}`, `${assetRequestTitle(r)}, ${ASSET_STAGE[r.stage]} stage`],
  salary: (p) => [`Salary change: ${nameOf(p.userId)}`, `${rupees(p.gross)} a month from ${formatDay(p.effectiveFrom, true)}, proposed by ${nameOf(p.enteredBy)}`],
  locations: (r) => [`Home location change: ${nameOf(r.userId)}`, `${r.kind === "permanent" ? "Permanent" : "Temporary"} home to ${r.place.address}`],
};
function approvalItems(waiting, refresh) {
  const shown = waiting.slice(0, SHOWN_APPROVALS);
  if (!shown.length) return [el("p", "card__body text-sm text-muted", "Nothing is waiting for you.")];
  return shown.map(({ kind, request }) => {
    const [title, sub] = APPROVAL_TEXT[kind](request);
    const item = el("div", "list__item");
    item.dataset.requestId = request.id;
    const content = el("div", "list__content");
    content.append(el("span", "list__title", title), el("span", "list__sub", sub));
    const open = el("a", "btn btn--sm", "Review");
    open.href = resolvePageLink("requests/approvals-inbox.html");
    cardLink(open, kind, request.id, { refresh });   // the approval card (round 14G); still a link to the inbox
    item.append(el("div", avatarClass(request.userId), initials(nameOf(request.userId))), content, open);
    return item;
  });
}

// ---------- recent activity (admin-dashboard.js renderActivity) ----------
const STEP_DOT = { applied: "warning", approved: "success", rejected: "danger", cancelled: "muted", paid: "success", fulfilled: "success", closed: "primary" };
const MOVEMENT_DOT = { in: "success", return: "success", out: "primary", adjustment: "warning" };
const chainEvents = (records, sent, what) => records.flatMap((r) => r.history
  .filter((h) => STEP_DOT[h.decision])
  .map((h) => ({ at: h.at, date: localDateOf(h.at), dot: STEP_DOT[h.decision], text: h.decision === "applied" ? sent(r) : `${what(r)} ${h.decision} by ${nameOf(h.byUserId)}` })));
const leaveWhat = (r) => `${typeLabel(r.type).toLowerCase()} for ${requestDates(r)}`;
const assetWhat = (r) => assetTypeLabel(r.assetType).toLowerCase();
function movementEvent(m) {
  const change = m.change > 0 ? `+${m.change}` : String(m.change);
  const tag = m.assetTag ? ` (${m.assetTag})` : "";
  return { at: m.at, date: officeDate(m.at), dot: MOVEMENT_DOT[m.type] ?? "primary", text: `${movementTypeLabel(m.type)}: ${change} ${getItem(m.sku)?.name ?? m.sku}${tag}, by ${nameOf(m.recordedBy)}` };
}
const ACTIVITY_SOURCES = [
  { permission: "leave:approve", name: "leave", events: () => chainEvents(allRequests(), (r) => `Leave request from ${nameOf(r.userId)}: ${leaveWhat(r)}`, (r) => `${nameOf(r.userId)}'s ${leaveWhat(r)}`) },
  { permission: "attendance:approve", name: "corrections", events: () => chainEvents(allRegularizations(), (r) => `Regularization request from ${nameOf(r.userId)} for ${formatDay(r.date)}`, (r) => `${nameOf(r.userId)}'s regularization for ${formatDay(r.date)}`) },
  { permission: "expenses:view", name: "expenses", events: () => chainEvents(allExpenses(), (c) => `Expense claim from ${nameOf(c.userId)}, ${rupees(c.amount)}`, (c) => `${rupees(c.amount)} claim from ${nameOf(c.userId)}`) },
  { permission: "assets:view", name: "asset requests", events: () => chainEvents(allAssetRequests(), (r) => `Asset request from ${nameOf(r.userId)}: ${assetWhat(r)}`, (r) => `${nameOf(r.userId)}'s ${assetWhat(r)} request`) },
  { permission: "inventory:view", name: "stock", events: () => allMovements().map(movementEvent) },
];
const listText = (names) => {
  const text = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names.join("");
  return text.charAt(0).toUpperCase() + text.slice(1);
};
function activityItems(sources) {
  const events = sources.flatMap((source) => source.events()).sort((a, b) => b.at.localeCompare(a.at)).slice(0, SHOWN_ACTIVITY);
  if (!events.length) return [el("p", "card__body text-sm text-muted", sources.length ? "No activity yet." : "Nothing here you have access to.")];
  return events.map((event) => {
    const item = el("div", "activity__item");
    const text = el("div", "activity__text", event.text);
    text.append(el("span", "activity__time", formatDay(event.date)));
    item.append(el("span", `activity__dot activity__dot--${event.dot}`), text);
    return item;
  });
}

// ---------- today's attendance (admin-dashboard.js row) ----------
function row({ person, day }) {
  const tr = el("tr");
  const status = el("td");
  const badge = dayBadge(day);
  status.append(badge);
  showReason(badge, badge.title);   // an Overdue badge's time in words too, not only on hover (round 14E part 2)
  tr.append(personCell(day.userId, person, person?.email ?? ""), el("td", "", day.userId), el("td", "", departmentName(person?.department)), status, checkInCell(day), hoursCell(day));
  return tr;
}
function emptyRow(text) {
  const td = el("td", "text-muted", text);
  td.colSpan = 6;
  const tr = el("tr");
  tr.append(td);
  return tr;
}

const Icon = ({ d }) => <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;

export default function AdminDashboard() {
  const { userId, role } = useSession();
  const canExport = useCan("reports:export"), canCreate = useCan("users:create"), canMark = useCan("attendance:mark");
  const canPayroll = useCan("payroll:view"), canStock = useCan("inventory:view");
  const today = todayIso();
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [page, setPage] = useState(1);

  const d = useData(() => {
    const people = new Map(getAllUsers().map((u) => [u.id, u]));
    const all = teamFor(today).map((day) => ({ day, person: people.get(day.userId) }));
    const range = summaryRange(addDays(today, -(CHART_DAYS - 1)), today);   // one storage read; today is the last day
    const waiting = Object.entries(waitingFor(userId, role?.key))
      .flatMap(([kind, list]) => list.map((request) => ({ kind, request })))
      .sort((a, b) => sentOn(b.request).localeCompare(sentOn(a.request)) || b.request.id.localeCompare(a.request.id, "en", { numeric: true }));
    const run = canPayroll ? (() => { const { year, month } = runMonth(today); const r = payrollRun(year, month); return { month, gross: runTotals(r).gross, rows: r.rows.length }; })() : null;
    return { all, range, waiting, run, alerts: canStock ? reorderAlerts() : null, users: getAllUsers().length, active: activeHeadcount(),
      rate: attendanceRateChart(range, today), heads: headcountChart(), sources: ACTIVITY_SOURCES.filter((s) => can(s.permission)), departments: getAllDepartments() };
  }, [userId, role?.key, today, canPayroll, canStock]);

  // the table: search by name, a department, 10 a page
  const query = search.trim().toLowerCase();
  const rows = d.all.filter((r) => (!dept || r.person?.department === dept) && (!query || (r.person?.name ?? "").toLowerCase().includes(query)));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);
  const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const span = shown.length ? `${(current - 1) * PAGE_SIZE + 1}–${(current - 1) * PAGE_SIZE + shown.length}` : "0";
  const rowsMeta = `Showing ${span} of ${rows.length} ${rows.length === 1 ? "employee" : "employees"}${rows.length < d.all.length ? ` (${d.all.length} active)` : ""}`;

  // the rate chart (admin-dashboard.js renderChart)
  const [rate, present, expected] = ["Rate", "Present", "Expected"].map((name) => valuesOf(d.rate, name));
  const { from, to, todayOpen } = d.rate.period;
  const days = d.rate.labels.map((date, i) => {
    if (!expected[i]) return { date, modifier: "muted", height: 0, what: d.rate.marks[i].off ? "day off" : "nobody expected" };
    const partial = d.rate.marks[i].partial;
    return { date, modifier: partial ? "progress" : "", height: rate[i], what: `${rate[i]}%${partial ? " so far" : ""} (${present[i]} of ${expected[i]} expected)` };
  });
  const rates = rate.filter((r, i) => expected[i] && !d.rate.marks[i].partial);
  const rateLabel = rates.length
    ? `Attendance rate, ${formatRange(from, to)}: between ${Math.min(...rates)} and ${Math.max(...rates)} percent on working days`
    : `Attendance rate, ${formatRange(from, to)}: no finished working days`;
  const inactive = d.users - d.active;
  const todaySummary = d.range[d.range.length - 1];
  const stockNote = d.alerts && (d.alerts.length
    ? [d.alerts.filter((i) => i.status === "out").length ? `${d.alerts.filter((i) => i.status === "out").length} out of stock` : "", d.alerts.length - d.alerts.filter((i) => i.status === "out").length ? `${d.alerts.length - d.alerts.filter((i) => i.status === "out").length} low` : ""].filter(Boolean).join(", ")
    : "Nothing below its reorder level");

  // the Export button (ui/csv-export.js): every table in main, the stats with their plain numbers
  useEffect(() => { initExports(document.getElementById("main")); }, []);
  useEffect(() => {
    csvRows("admin-dashboard-attendance", () => rows.map(row));   // the export: every page
    if (d.run) csvStat(document.querySelector('#main [data-stat="payroll"]'), d.run.gross, "₹");
  });

  return (
    <Frame page={PAGE}>
      <>
        <div className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p className="page-header__subtitle" id="dash-subtitle">{`Company overview for ${monthName(Number(today.slice(5, 7)))} ${today.slice(0, 4)}`}</p>
          </div>
          <div className="page-header__actions">
            <button className="btn" type="button" data-permission="reports:export" hidden={!canExport || undefined} data-export data-export-stats="admin-dashboard-stats">Export</button>
            <Link className="btn" to={pageUrl("attendance/mark-attendance.html")} data-permission="attendance:mark" hidden={!canMark || undefined} id="dash-mark">
              <Icon d={MARK_ICON} />
              Mark attendance
            </Link>
            <Link className="btn btn--primary" to={pageUrl("users/user-form.html")} data-permission="users:create" hidden={!canCreate || undefined}>
              <Icon d="M12 5v14M5 12h14" />
              Add employee
            </Link>
          </div>
        </div>
        <div className="stack">
          <StatStrip label="Key numbers">
            <StatCard id="total" icon={ICONS.total} tone={1} label="Total employees" value={String(d.active)}
              note={inactive ? `Not counting ${plural(inactive, "inactive employee", "inactive employees")}` : "No inactive employees"} />
            <StatCard id="present" icon={ICONS.present} tone={2} label="Present today" value={String(todaySummary.present)} note={presentNote(todaySummary, d.all.map((r) => r.day))} />
            <StatCard id="payroll" permission="payroll:view" hidden={!canPayroll} icon={ICONS.payroll} tone={3}
              label={d.run ? `Payroll, ${monthName(d.run.month).slice(0, 3)}` : "Payroll"} value={d.run ? rupees(d.run.gross) : "—"}
              note={d.run ? `Gross for ${plural(d.run.rows, "employee", "employees")}, draft` : ""} />
            <StatCard id="stock" permission="inventory:view" hidden={!canStock} icon={ICONS.stock} tone={4} label="Items to reorder"
              value={d.alerts ? String(d.alerts.length) : "—"} note={d.alerts ? stockNote : ""} noteTone={d.alerts?.length ? "down" : ""} />
          </StatStrip>

          <div className="grid grid-main-aside">
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Attendance rate, last 14 days</h3>
                <span className="card__meta" id="rate-range">{formatRange(from, to)}</span>
              </div>
              <div className="card__body">
                <ColumnChart id="rate-chart" days={days} label={rateLabel} empty={d.rate.empty} />
                <p className="text-xs text-muted mt-2" id="rate-note">{todayOpen
                  ? "Present out of expected. Weekends and holidays are shown lighter; today is faded until the shift ends."
                  : "Present out of expected. Weekends and holidays are shown lighter."}</p>
              </div>
            </section>
            <section className="card" id="admin-approvals">
              <div className="card__header">
                <h3 className="card__title">Pending approvals</h3>
                <span className="card__meta">{d.waiting.length ? `${Math.min(SHOWN_APPROVALS, d.waiting.length)} of ${d.waiting.length} shown` : "None"}</span>
              </div>
              <Nodes className="list" build={() => approvalItems(d.waiting, bump)} deps={[d]} />
            </section>
          </div>

          <div className="grid grid-2">
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Headcount by department</h3>
                <span className="card__meta" id="headcount-meta">{`${d.heads.total} total`}</span>
              </div>
              {/* D2b's proof chart: the same headcountChart() numbers, drawn by the design system's BarChart */}
              <div className="card__body"><BarChart id="headcount-bars" chart={d.heads} horizontal labelHeader="Department" /></div>
            </section>
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Recent activity</h3>
                <span className="card__meta" id="admin-activity-meta">{listText(d.sources.map((s) => s.name))}</span>
              </div>
              <Nodes className="activity" id="admin-activity" build={() => activityItems(d.sources)} deps={[d]} />
            </section>
          </div>

          <section className="card">
            <div className="table__toolbar">
              <h3 className="card__title">Today's attendance</h3>
              <div className="table__filters">
                <div className="input-group">
                  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  <input className="input input--sm input--search" id="admin-search" type="search" placeholder="Search employees" aria-label="Search employees" data-table-filter="off"
                    value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="select select--sm" id="admin-dept" aria-label="Filter by department" value={dept} onChange={(e) => { setDept(e.target.value); setPage(1); }}>
                  <option value="">All departments</option>
                  {d.departments.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
                </select>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table" data-export-name="admin-dashboard-attendance">
                <thead>
                  <tr><th>Employee</th><th>ID</th><th>Department</th><th>Status</th><th>Check-in</th><th className="table__num">Hours</th></tr>
                </thead>
                <Nodes as="tbody" id="admin-rows" build={() => (shown.length ? shown.map(row) : [emptyRow(d.all.length ? "No employees match these filters." : "No active employees.")])} deps={[d, search, dept, current]} />
              </table>
            </div>
            <div className="card__footer">
              <span className="card__meta" id="admin-rows-meta">{rowsMeta}</span>
              <div className="btn-group">
                <button className="btn btn--sm" id="admin-prev" type="button" disabled={current <= 1} onClick={() => setPage(current - 1)}>Previous</button>
                <button className="btn btn--sm" id="admin-next" type="button" disabled={current >= pages} onClick={() => setPage(current + 1)}>Next</button>
              </div>
            </div>
          </section>
        </div>
      </>
    </Frame>
  );
}
