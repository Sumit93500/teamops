// The HR dashboard (pages/dashboard/hr.html + assets/js/pages/hr-dashboard.js), ported: the stats (open positions, a sample;
// on leave today; leave for you to decide; new joiners this month), leave requests sent per day for 14 days (round 4's chart;
// "No data in this range." when none was sent, round 5's rule), what waits for your decision with working Approve / Reject
// (components/Decision.jsx: the in-app question, the reject modal), the approval card from each title, recent decisions with
// the page's static sample line, the recruitment sample card, and every leave request (search, status, the first 10, Export).
// L3: Flagged check-ins, the last 7 days (with attendance:view-all): who, the day, where they checked in and out, and why.
// F1: the leave chart had no data on the live site (the seed's requests were all sent by 26 Sep 2026, so a 14-day window
// ending today is empty from 10 Oct on): it now shows the requests sent per month for the last 6 months, with the design
// system's BarChart (the shared chart theme); "No data in this range." only when none was sent in those months. And the
// header has Mark attendance, as the Employee dashboard has.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import pageHtml from "../../../pages/dashboard/hr.html?raw";
import { requestDatesIso } from "../../../assets/js/ui/leave-view.js";
import { csvValue, csvColumns, csvRows, initExports } from "../../../assets/js/ui/csv-export.js";
import { getAllUsers, joiningDate } from "../../../assets/js/data/store.js";
import { allRequests, pendingFor } from "../../../assets/js/data/leave-store.js";
import { summaryFor, allRegularizations, pendingRegularizations } from "../../../assets/js/data/attendance-store.js";
import {
  el, todayIso, formatDay, formatDays, monthName, requestDates, typeLabel, statusBadge, initials, avatarClass,
  decisionOf, localDateOf, nameOf, oldestPendingNote, whenText, percent, monthShort,
} from "../../../assets/js/ui/leave-view.js";
import { leaveRequestsByMonthChart } from "../../../assets/js/data/chart-data.js";
import { correctionDetails } from "../../../assets/js/ui/attendance-view.js";
import { cardOpener } from "../ui/ApprovalCard.jsx";
import Frame from "../ui/Frame.jsx";
import Nodes from "../ui/Nodes.jsx";
import { StatStrip, StatCard } from "../components/Basics.jsx";
import { BarChart, monthSpan } from "../components/charts/Charts.jsx";
import { useDecision, DecisionButtons, LEAVE_FLOW, CORRECTION_FLOW } from "../components/Decision.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { pageUrl } from "../routes.js";
import { stampsBy, flagText } from "../data/stamps.js";
import { PlaceCell } from "../ui/attendance.jsx";
import { dayNumber, isoFromDayNumber } from "../../../assets/js/data/holidays.js";

csvColumns("hr-dashboard-leave-requests", { Days: { number: true } });   // Round Data export

const PAGE = "dashboard/hr.html";
const CHART_MONTHS = 6, SHOWN_APPROVALS = 3, SHOWN_DECISIONS = 3, TABLE_ROWS = 10;
const ICONS = {
  positions: "M4 8h16v11H4zM9 8V5h6v3", onLeave: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", pending: "M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6",
  joiners: "M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-2a4 4 0 0 0-3-3.8M16 3.2a3.5 3.5 0 0 1 0 6.6",
  mark: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M8 12l3 3 5-6",
};
// The static samples, read from the old page: the interview line and the recruitment card's rows.
const SAMPLE = (() => {
  const doc = new DOMParser().parseFromString(pageHtml, "text/html");
  const card = [...doc.querySelectorAll("section.card")].find((s) => s.querySelector(".card__title")?.textContent === "Applicants by stage");
  return { activity: [...doc.querySelectorAll("#activity [data-static]")].map((n) => n.outerHTML), applicants: card?.querySelector(".card__body")?.innerHTML ?? "" };
})();
const newestSent = (a, b) => b.appliedOn.localeCompare(a.appliedOn) || b.id.localeCompare(a.id, "en", { numeric: true });

function activityText(request, decision) {
  const what = request.issue ? `${nameOf(request.userId)}'s regularization for ${formatDay(request.date)}` : `${nameOf(request.userId)}'s ${typeLabel(request.type).toLowerCase()} for ${requestDates(request)}`;
  if (decision.decision === "auto-approved") return `${what} was approved automatically`;
  return `${nameOf(decision.byUserId)} ${decision.decision} ${what}`;
}
function activityNodes(requests, today) {
  const decided = requests.map((request) => ({ request, decision: decisionOf(request) })).filter((x) => x.decision)
    .sort((a, b) => b.decision.at.localeCompare(a.decision.at)).slice(0, SHOWN_DECISIONS)
    .map(({ request, decision }) => {
      const item = el("div", "activity__item");
      const text = el("div", "activity__text", activityText(request, decision));
      text.append(el("span", "activity__time", whenText(localDateOf(decision.at), today)));
      item.append(el("span", `activity__dot activity__dot--${decision.decision === "rejected" ? "danger" : "success"}`), text);
      return item;
    });
  const statics = SAMPLE.activity.map((html) => { const t = document.createElement("template"); t.innerHTML = html; return t.content.firstElementChild; });
  return [...decided, ...statics];
}
function leaveRow(request) {
  const tr = el("tr");
  const person = el("td");
  const wrap = el("div", "table__user");
  wrap.append(el("div", avatarClass(request.userId), initials(nameOf(request.userId))), el("span", "table__user-name", nameOf(request.userId)));
  person.append(wrap);
  const status = el("td");
  status.append(statusBadge(request.status));
  tr.append(person, el("td", "", typeLabel(request.type)), csvValue(el("td", "", requestDates(request)), requestDatesIso(request)), el("td", "table__num", String(request.days)), status);
  return tr;
}
function emptyRow(text) { const td = el("td", "text-muted", text); td.colSpan = 5; const tr = el("tr"); tr.append(td); return tr; }

// A pending request's title opens its approval card (round 14G): the old cardOpener on the drawn span.
function CardTitle({ kind, id, children }) {
  return <span className="list__title" ref={(n) => { if (n && !n.dataset.card) cardOpener(n, kind, id, { refresh: bump }); }}>{children}</span>;
}
const Icon = ({ d }) => <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;

// Flagged check-ins from..to (ISO dates), newest first: [{ userId, date, stamp }].
function flaggedSince(from, to) {
  return [...stampsBy()].map(([key, stamp]) => { const [userId, date] = key.split("|"); return { userId, date, stamp }; })
    .filter((x) => x.stamp.flagged && x.date >= from && x.date <= to).sort((a, b) => b.date.localeCompare(a.date) || nameOf(a.userId).localeCompare(nameOf(b.userId)));
}

export default function HrDashboard() {
  const { userId, role } = useSession();
  const canExport = useCan("reports:export"), canMark = useCan("attendance:mark"), canPost = useCan("recruitment:create"), canLeave = useCan("leave:approve"), canCorrect = useCan("attendance:approve"), canAll = useCan("attendance:view-all");
  const today = todayIso();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const leaveDecision = useDecision(LEAVE_FLOW), correctionDecision = useDecision(CORRECTION_FLOW);

  const d = useData(() => {
    const month = today.slice(0, 7);
    const people = getAllUsers().filter((u) => u.status !== "inactive");
    const dates = people.map((u) => joiningDate(u.dateOfJoining));
    const pendingLeave = pendingFor(userId, role?.key);
    return { summary: summaryFor(today), pendingLeave, waiting: [...pendingLeave, ...(canCorrect ? pendingRegularizations(userId, role?.key) : [])].sort(newestSent),
      people, dates, month, chart: leaveRequestsByMonthChart(today, CHART_MONTHS), all: allRequests(), decided: [...allRequests(), ...(canCorrect ? allRegularizations() : [])],
      flagged: canAll ? flaggedSince(isoFromDayNumber(dayNumber(today) - 6), today) : [] };
  }, [userId, role?.key, today, canCorrect, canAll]);

  // stats (hr-dashboard.js renderStats, renderJoiners)
  const joiners = d.dates.filter((date) => date?.startsWith(d.month));
  const toJoin = joiners.filter((date) => date > today).length;
  const missing = d.dates.filter((date) => !date).length;
  const joinNotes = [!joiners.length ? "No one joins this month" : toJoin ? `${toJoin} still to join` : joiners.length === 1 ? "Already started" : "All already started"];
  if (missing) joinNotes.push(`no joining date on file for ${missing} of ${d.people.length}`);

  // the chart (F1): requests sent per month, the last 6 months
  const chartSpan = monthSpan(d.chart.labels[0], d.chart.labels.at(-1));

  // the table (hr-dashboard.js renderTable)
  const query = search.trim().toLowerCase();
  const rows = d.all.filter((r) => (!status || r.status === status) && (!query || nameOf(r.userId).toLowerCase().includes(query))).sort(newestSent);
  const shown = rows.slice(0, TABLE_ROWS);
  const noun = `${status || query ? "matching " : ""}${rows.length === 1 ? "request" : "requests"}`;

  useEffect(() => { initExports(document.getElementById("main")); }, []);
  useEffect(() => { csvRows("hr-dashboard-leave-requests", () => rows.map(leaveRow)); });

  const shownApprovals = d.waiting.slice(0, SHOWN_APPROVALS);
  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-header__subtitle" id="dash-subtitle">{`People operations for ${monthName(Number(today.slice(5, 7)))} ${today.slice(0, 4)}`}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn" type="button" data-permission="reports:export" hidden={!canExport || undefined} data-export data-export-stats="hr-dashboard-stats">Export</button>
          <Link className="btn" to={pageUrl("attendance/mark-attendance.html")} data-permission="attendance:mark" hidden={!canMark || undefined} id="dash-mark">
            <Icon d={ICONS.mark} />
            Mark attendance
          </Link>
          <Link className="btn btn--primary" to={pageUrl("recruitment/job-openings.html")} data-permission="recruitment:create" hidden={!canPost || undefined}>
            <Icon d="M12 5v14M5 12h14" />
            Post job opening
          </Link>
        </div>
      </div>
      <div className="stack">
        <StatStrip label="Key numbers">
          <StatCard id="positions" icon={ICONS.positions} tone={1} label="Open positions" value="9" note="Sample, not built yet" />
          <StatCard id="on-leave" icon={ICONS.onLeave} tone={2} label="On leave today" value={String(d.summary.onLeave)}
            note={d.summary.total ? `${percent(d.summary.onLeave, d.summary.total)} of ${d.summary.total} employees, ${d.summary.expected} expected at work` : "No active employees"} />
          <StatCard id="pending" icon={ICONS.pending} tone={3} label="Leave for you to decide" value={String(d.pendingLeave.length)}
            note={oldestPendingNote(d.pendingLeave, today) || "Nothing waiting"} noteTone={d.pendingLeave.length ? "down" : ""} />
          <StatCard id="joiners" icon={ICONS.joiners} tone={4} label={`New joiners, ${monthShort(`${d.month}-01`)}`} value={String(joiners.length)} note={joinNotes.join("; ")} />
        </StatStrip>

        <div className="grid grid-main-aside">
          <section className="card">
            <div className="card__header">
              <h3 className="card__title">Leave requests, last 6 months</h3>
              <span className="card__meta" id="leave-range">{chartSpan}</span>
            </div>
            <div className="card__body">
              <BarChart id="leave-chart" chart={d.chart} label={`Leave requests sent per month, ${chartSpan}`} labelHeader="Month" latest />
              <p className="text-xs text-muted mt-2" id="leave-note">Each request counts in the month it was sent, whatever its status. This month is still filling in.</p>
            </div>
          </section>
          <section className="card">
            <div className="card__header">
              <h3 className="card__title">Pending approvals</h3>
              <span className="card__meta" id="approvals-meta">{d.waiting.length ? `${shownApprovals.length} of ${d.waiting.length} shown` : "None"}</span>
            </div>
            <div className="list" id="approvals-list">
              {shownApprovals.length ? shownApprovals.map((request) => {
                const leave = !request.issue;
                const flow = leave ? leaveDecision : correctionDecision;
                return (
                  <div className="list__item" key={request.id}>
                    <div className={avatarClass(request.userId)}>{initials(nameOf(request.userId))}</div>
                    <div className="list__content">
                      <CardTitle kind={leave ? "leave" : "corrections"} id={request.id}>
                        {leave ? `${nameOf(request.userId)}, ${typeLabel(request.type).toLowerCase()}` : `Regularization: ${nameOf(request.userId)}`}
                      </CardTitle>
                      <span className="list__sub">{leave ? `${requestDates(request)}, ${formatDays(request.days)}` : `${formatDay(request.date)}: ${correctionDetails(request)}`}</span>
                    </div>
                    <DecisionButtons permission={leave ? "leave:approve" : "attendance:approve"} onReject={() => flow.reject(request)} onApprove={() => flow.approve(request)} />
                  </div>
                );
              }) : (
                <div className="list__item"><div className="list__content"><span className="list__sub">Nothing is waiting for your decision.</span></div></div>
              )}
            </div>
            <div className="card__footer">
              <Link className="link text-sm" to={pageUrl("leave/leave-approvals.html")} data-permission="leave:approve" hidden={!canLeave || undefined}>All leave requests</Link>
              <Link className="link text-sm" to={pageUrl("attendance/regularization.html")} data-permission="attendance:approve" hidden={!canCorrect || undefined}>Regularization</Link>
            </div>
          </section>
        </div>

        <div className="grid grid-2">
          <section className="card">
            <div className="card__header">
              <h3 className="card__title">Applicants by stage</h3>
              <span className="card__meta">Sample, not built yet</span>
            </div>
            <div className="card__body" dangerouslySetInnerHTML={{ __html: SAMPLE.applicants }} />
          </section>
          <section className="card">
            <div className="card__header">
              <h3 className="card__title">Recent activity</h3>
              <Link className="link text-sm" to={pageUrl("attendance/team-attendance.html")}>View attendance</Link>
            </div>
            <Nodes className="activity" id="activity" build={() => activityNodes(d.decided, today)} deps={[d, today]} />
          </section>
        </div>

        {canAll && (
          <section className="card" id="flagged-card">
            <div className="card__header">
              <h3 className="card__title">Flagged check-ins</h3>
              <span className="card__meta">Last 7 days</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Employee</th><th>Date</th><th>Place</th><th>Why</th></tr></thead>
                <tbody>
                  {d.flagged.length ? d.flagged.map((x) => (
                    <tr key={`${x.userId}-${x.date}`}><td>{nameOf(x.userId)}</td><td>{formatDay(x.date)}</td><td><PlaceCell stamp={x.stamp} /></td><td>{flagText(x.stamp.reasons)}</td></tr>
                  )) : <tr><td className="text-muted" colSpan={4}>No flagged check-ins in the last 7 days.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}
        <section className="card">
          <div className="table__toolbar">
            <h3 className="card__title">Leave requests</h3>
            <div className="table__filters">
              <div className="input-group">
                <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input className="input input--sm input--search" id="leave-search" type="search" placeholder="Search employees" aria-label="Search employees" data-table-filter="off"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="select select--sm" id="leave-status" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table" data-export-name="hr-dashboard-leave-requests">
              <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th className="table__num">Days</th><th>Status</th></tr></thead>
              <Nodes as="tbody" id="leave-rows" build={() => (shown.length ? shown.map(leaveRow) : [emptyRow(d.all.length ? "No requests match these filters." : "No leave requests yet.")])} deps={[d, search, status]} />
            </table>
          </div>
          <div className="card__footer">
            <span className="card__meta" id="leave-rows-meta">{`Showing ${shown.length} of ${rows.length} ${noun}`}</span>
            <Link className="btn btn--sm" to={pageUrl("leave/leave-approvals.html")}>View all</Link>
          </div>
        </section>
      </div>
      {leaveDecision.modal}
      {correctionDecision.modal}
    </Frame>
  );
}
