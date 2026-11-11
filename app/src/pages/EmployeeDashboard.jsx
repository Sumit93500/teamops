// My dashboard (pages/dashboard/employee.html + assets/js/pages/employee-dashboard.js), ported: the stats (days present,
// leave balance, next payslip, open requests), my working hours for the last 14 days (round 4's chart: readout and patterns;
// "No data in this range." when nothing of the person's is on any day, round 5's rule), the newest pending request, the leave
// balance bars, updates (decisions on my requests merged with the page's static samples) and my last 5 working days.
// Rows, list items and badges come from the old builders (ui/Nodes.jsx).
import { Link } from "react-router-dom";
import pageHtml from "../../../pages/dashboard/employee.html?raw";
import { getUser } from "../../../assets/js/data/store.js";
import { addDays } from "../../../assets/js/data/holidays.js";
import { LEAVE_TYPES, balanceFor, requestsFor, currentApproverName } from "../../../assets/js/data/leave-store.js";
import { monthFor, rangeFor, regularizationsFor } from "../../../assets/js/data/attendance-store.js";
import { payslipsFor } from "../../../assets/js/data/payroll-store.js";
import { assetRequestsFor, waitingOn as assetWaitingOn } from "../../../assets/js/data/asset-requests-store.js";
import { openRequests } from "../../../assets/js/data/own-requests.js";
import { assetTypeLabel } from "../../../assets/js/ui/inventory-view.js";
import {
  el, todayIso, formatDay, formatRange, monthName, typeLabel, requestDates, statusBadge, newestPending, decisionOf, localDateOf,
  shortDate, whenText, plural, monthShort, nameOf, showReason,
} from "../../../assets/js/ui/leave-view.js";
import { hoursText, dayBadge } from "../../../assets/js/ui/attendance-view.js";
import { barRow } from "../../../assets/js/ui/chart.js";
import { hoursChart, leaveBalanceChart, valuesOf } from "../../../assets/js/data/chart-data.js";
import Frame from "../ui/Frame.jsx";
import Nodes from "../ui/Nodes.jsx";
import { StatStrip, StatCard } from "../components/Basics.jsx";
import { ColumnChart } from "../components/Charts.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { pageUrl } from "../routes.js";

const PAGE = "dashboard/employee.html";
const CHART_DAYS = 14, RECENT_DAYS = 5, LOOK_BACK = 31, SHOWN_DECISIONS = 3, MARKER = 6;
const SHORT = { casual: "Casual", sick: "Sick", earned: "Earned", wfh: "WFH" };
const ICONS = {
  present: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2",
  balance: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  payslip: "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M17 14h1",
  requests: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
};
// The static samples that stay (the old page's [data-static] updates), read from its HTML.
const STATIC_UPDATES = (() => {
  const doc = new DOMParser().parseFromString(pageHtml, "text/html");
  return [...doc.querySelectorAll("#updates [data-static]")].map((n) => n.outerHTML);
})();

const isAsset = (r) => r.id.startsWith("ARQ-");
const assetName = (r) => `${assetTypeLabel(r.assetType)} request`;
const isOff = (day) => day.status === "weekend" || day.status === "holiday";
const requestName = (r) => (r.issue ? `Regularization, ${formatDay(r.date)}` : `${typeLabel(r.type)}, ${requestDates(r)}`);

// One day's bar (employee-dashboard.js barLook), as round 4's chart takes it.
function barLook(date, minutes, mark) {
  const look = (modifier, height, what) => ({ date, modifier, height, what });
  switch (mark.kind) {
    case "off": return look("muted", 0, mark.holiday !== null ? `${mark.holiday}, day off` : "day off");
    case "no-data": return look("muted", 0, "no data");
    case "not-joined": return look("muted", 0, "before joining");
    case "left": return look("muted", 0, "after leaving");
    case "on-leave": return look("leave", MARKER, "on leave");
    case "in-progress":
    case "worked": {
      const hours = (minutes / 60).toFixed(1);
      const height = Math.min(100, Math.round(minutes / 6));
      if (mark.kind === "in-progress") return look("progress", height, `${hours} hours so far`);
      const note = { late: ", late", "half-day": ", half day", absent: ", under 4 hours (absent)" }[mark.status] ?? "";
      return look("", height, `${hours} hours${note}`);
    }
    case "incomplete": return look("incomplete", MARKER, `checked in at ${mark.checkIn}, no check-out`);
    case "absent": return look("absent", MARKER, "absent");
    default: return look("", 0, mark.overdue ? "not checked in yet (overdue)" : "not in yet");
  }
}

function recentRow(day) {
  const tr = el("tr");
  const outText = day.incomplete ? "Not recorded" : (day.checkOut ?? "–");
  const status = el("td");
  const badge = dayBadge(day);
  status.append(badge);
  showReason(badge, badge.title);
  if (day.regularized) status.append(" ", el("span", "badge badge--success badge--square", "Regularized"));
  tr.append(el("td", "", shortDate(day.date)), el("td", "", day.checkIn ? `${day.checkIn}${day.mode === "wfh" ? " (WFH)" : ""}` : "–"), el("td", "", outText),
    el("td", "table__num", day.minutesWorked === null ? "–" : hoursText(day.minutesWorked)), status);
  return tr;
}
function recentRows(days) {
  const recent = [];
  for (const day of [...days].reverse()) {
    if (recent.length === RECENT_DAYS || day.status === "no-data" || day.status === "not-joined") break;
    if (!isOff(day)) recent.push(day);
  }
  if (recent.length) return recent.map(recentRow);
  const td = el("td", "text-muted", days.length ? "No attendance recorded yet." : "Attendance isn't tracked.");
  td.colSpan = 5;
  const tr = el("tr"); tr.append(td);
  return [tr];
}

const assetApprovers = (r) => assetWaitingOn(r).map(nameOf).join(", ");
function requestItems(leave, corrections, assets) {
  const request = newestPending([...leave, ...corrections, ...assets]);
  if (!request) return [];
  const item = el("div", "list__item");
  const content = el("div", "list__content");
  const waiting = isAsset(request) ? assetApprovers(request) : currentApproverName(request);
  content.append(el("span", "list__title", isAsset(request) ? assetName(request) : requestName(request)),
    el("span", "list__sub", waiting ? `Waiting for ${waiting}` : "Nobody can decide it now"));
  item.append(el("div", isAsset(request) ? "avatar avatar--4" : "avatar avatar--2", isAsset(request) ? "A" : request.issue ? "R" : "L"), content, statusBadge("pending"));
  return [item];
}

function balanceNodes(data) {
  const [allowance, pending, left] = ["Allowance", "Pending", "Left"].map((name) => valuesOf(data, name));
  const rows = data.labels.map((type, i) => ({ type, allowance: allowance[i], pending: pending[i], left: left[i] })).filter((r) => r.allowance !== null);
  const bars = rows.map((r) => barRow(SHORT[r.type], String(r.left), r.allowance ? Math.min(100, Math.max(0, Math.round((r.left / r.allowance) * 100))) : 0));
  const lines = rows.map((r) => `${typeLabel(r.type)} is ${r.left} of ${plural(r.allowance, "day", "days")}${r.type === "wfh" ? " this month" : ""}${r.pending ? ` (${r.pending} pending)` : ""}.`);
  bars.push(el("p", "text-xs text-muted mt-4", lines.join(" ")));
  return bars;
}

function assetOutcome(request) {
  if (request.status === "pending" || request.status === "cancelled") return null;
  return [...request.history].reverse().find((h) => ["approved", "auto-approved", "rejected", "fulfilled", "closed"].includes(h.decision)) ?? null;
}
const ASSET_VERB = { approved: "approved", "auto-approved": "approved automatically", rejected: "rejected", fulfilled: "fulfilled", closed: "closed without an asset" };
function updateNodes(leave, corrections, assets, today) {
  const decided = [...leave, ...corrections, ...assets]
    .map((request) => ({ request, decision: isAsset(request) ? assetOutcome(request) : decisionOf(request) }))
    .filter((x) => x.decision)
    .sort((a, b) => b.decision.at.localeCompare(a.decision.at))
    .slice(0, SHOWN_DECISIONS)
    .map(({ request, decision }) => {
      const approved = decision.decision !== "rejected" && decision.decision !== "closed";
      const what = isAsset(request) ? `${assetTypeLabel(request.assetType).toLowerCase()} request`
        : request.issue ? `regularization for ${formatDay(request.date)}` : `${typeLabel(request.type).toLowerCase()} for ${requestDates(request)}`;
      const verb = isAsset(request)
        ? `${ASSET_VERB[decision.decision]}${decision.decision === "fulfilled" ? `: ${request.assetTag}` : ""}`
        : { approved: "approved", rejected: "rejected", "auto-approved": "approved automatically" }[decision.decision];
      const date = localDateOf(decision.at);
      const item = el("div", "activity__item");
      const text = el("div", "activity__text", `Your ${what} was ${verb}`);
      text.append(el("span", "activity__time", whenText(date, today)));
      item.append(el("span", `activity__dot activity__dot--${approved ? "success" : "danger"}`), text);
      return { item, date };
    });
  const statics = STATIC_UPDATES.map((html) => {
    const t = document.createElement("template"); t.innerHTML = html;
    const item = t.content.firstElementChild;
    return { item, date: item.dataset.date ?? "" };
  });
  const all = [...decided, ...statics];
  const dated = all.filter((x) => x.date).sort((a, b) => b.date.localeCompare(a.date));
  const undated = all.filter((x) => !x.date);
  return [...dated, ...undated].map((x) => x.item);
}

const Icon = ({ d }) => <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;

export default function EmployeeDashboard() {
  const { userId } = useSession();
  const canApply = useCan("leave:create"), canMark = useCan("attendance:mark");
  const today = todayIso();
  const year = Number(today.slice(0, 4)), month = Number(today.slice(5, 7));

  const d = useData(() => {
    const user = getUser(userId);
    const balance = balanceFor(userId, year, month);
    const limited = LEAVE_TYPES.filter((type) => balance[type].allowance !== null).map((type) => ({ type, ...balance[type] }));
    const days = rangeFor(userId, addDays(today, -(LOOK_BACK - 1)), today) ?? [];
    return { user, limited, days, summary: monthFor(userId, year, month), open: openRequests(userId), slip: payslipsFor(userId, today).find((s) => s.month === today.slice(0, 7)),
      leave: requestsFor(userId), corrections: regularizationsFor(userId), assets: assetRequestsFor(userId),
      hours: days.length ? hoursChart(days.slice(-CHART_DAYS), today) : null, balanceChart: leaveBalanceChart(userId, year, month) };
  }, [userId, today]);
  if (!d.user) return <Frame page={PAGE}><div /></Frame>;

  // stats (employee-dashboard.js renderPresent, renderBalanceStat, renderOpenRequests, renderPayslip)
  let present = { value: "–", note: "Attendance isn't tracked", tone: "" };
  if (d.summary) {
    const soFar = d.summary.days.filter((x) => x.date <= today && !isOff(x) && !["no-data", "not-joined", "left", "not-yet"].includes(x.status));
    const late = d.summary.lateMarks;
    present = { value: soFar.length ? `${d.summary.daysWorked} / ${soFar.length}` : "–", note: late ? plural(late, "late mark", "late marks") : "No late marks", tone: late ? "down" : "" };
  }
  const leaveOnly = d.limited.filter((r) => r.type !== "wfh");
  const total = leaveOnly.reduce((sum, r) => sum + r.left, 0);
  const most = [...leaveOnly].sort((a, b) => b.left - a.left);
  const count = (kind) => d.open.filter((r) => r.kind === kind).length;
  const parts = [];
  if (count("leave")) parts.push(`${count("leave")} leave`);
  if (count("attendance")) parts.push(plural(count("attendance"), "correction", "corrections"));
  if (count("expense")) parts.push(plural(count("expense"), "claim", "claims"));
  if (count("asset")) parts.push(plural(count("asset"), "asset", "assets"));
  const slip = d.slip
    ? { value: `${monthShort(d.slip.period.from)} ${d.slip.month.slice(0, 4)}`, note: `${d.slip.status === "on-hold" ? `On hold: ${d.slip.holdReason}` : "Draft, not paid yet"}; no pay date set` }
    : { value: "—", note: "No payslip yet" };

  // the hours chart (employee-dashboard.js renderChart)
  let chart = null;
  if (d.hours) {
    const minutes = valuesOf(d.hours, "Worked");
    const { from, to } = d.hours.period;
    const worked = minutes.filter((m, i) => m !== null && !d.hours.marks[i].inProgress).map((m) => m / 60);
    chart = {
      range: formatRange(from, to),
      days: d.hours.labels.map((date, i) => barLook(date, minutes[i], d.hours.marks[i])),
      label: worked.length
        ? `Working hours, ${formatRange(from, to)}: ${plural(worked.length, "day", "days")} worked, between ${Math.min(...worked).toFixed(1)} and ${Math.max(...worked).toFixed(1)} hours`
        : `Working hours, ${formatRange(from, to)}: no finished days recorded`,
    };
  }

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>My dashboard</h1>
          <p className="page-header__subtitle" id="dash-subtitle">{`Your attendance and requests for ${monthName(month)} ${year}`}</p>
        </div>
        <div className="page-header__actions">
          <Link className="btn" to={pageUrl("leave/apply-leave.html")} data-permission="leave:create" hidden={!canApply || undefined}>Apply for leave</Link>
          <Link className="btn btn--primary" to={pageUrl("attendance/mark-attendance.html")} data-permission="attendance:mark" hidden={!canMark || undefined}>
            <Icon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M8 12l3 3 5-6" />
            Mark attendance
          </Link>
        </div>
      </div>
      <div className="stack">
        <StatStrip label="Key numbers">
          <StatCard id="present" icon={ICONS.present} tone={1} label="Days present" value={present.value} note={present.note} noteTone={present.tone} />
          <StatCard id="balance" icon={ICONS.balance} tone={2} label="Leave balance" value={`${total} ${total === 1 ? "day" : "days"}`} note={most.map((r) => `${SHORT[r.type]} ${r.left}`).join(", ")} />
          <StatCard id="payslip" icon={ICONS.payslip} tone={3} label="Next payslip" value={slip.value} note={slip.note} />
          <StatCard id="requests" icon={ICONS.requests} tone={4} label="Open requests" value={String(d.open.length)} note={parts.join(", ") || "None"} />
        </StatStrip>

        <div className="grid grid-main-aside">
          <section className="card">
            <div className="card__header">
              <h3 className="card__title">My working hours, last 14 days</h3>
              <span className="card__meta" id="hours-range">{chart ? chart.range : "–"}</span>
            </div>
            <div className="card__body">
              {chart ? <ColumnChart id="hours-chart" days={chart.days} label={chart.label} empty={d.hours.empty} /> : <div className="chart" id="hours-chart" />}
              <p className="text-xs text-muted mt-2" id="hours-note">{chart
                ? "Weekends and holidays are days off. Short marks: blue is leave, red is absent, amber is a missing check-out."
                : "Attendance isn't tracked."}</p>
            </div>
          </section>
          <section className="card">
            <div className="card__header">
              <h3 className="card__title">My requests</h3>
              <Link className="link text-sm" to={pageUrl("requests/my-requests.html")}>View all</Link>
            </div>
            <Nodes className="list" id="my-requests-list" build={() => requestItems(d.leave, d.corrections, d.assets)} deps={[d]} />
          </section>
        </div>

        <div className="grid grid-2">
          <section className="card">
            <div className="card__header">
              <h3 className="card__title">Leave balance</h3>
              <Link className="link text-sm" to={pageUrl("leave/my-leave.html")}>Details</Link>
            </div>
            <Nodes className="card__body" id="balance-card" build={() => balanceNodes(d.balanceChart)} deps={[d]} />
          </section>
          <section className="card">
            <div className="card__header">
              <h3 className="card__title">Updates</h3>
              <Link className="link text-sm" to={pageUrl("announcements/announcements.html")}>All announcements</Link>
            </div>
            <Nodes className="activity" id="updates" build={() => updateNodes(d.leave, d.corrections, d.assets, today)} deps={[d, today]} />
          </section>
        </div>

        <section className="card">
          <div className="card__header">
            <h3 className="card__title">My attendance</h3>
            <Link className="link text-sm" to={pageUrl("attendance/my-attendance.html")}>View full month</Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Date</th><th>Check-in</th><th>Check-out</th><th className="table__num">Hours</th><th>Status</th></tr>
              </thead>
              <Nodes as="tbody" id="my-days" build={() => recentRows(d.days)} deps={[d]} />
            </table>
          </div>
        </section>
      </div>
    </Frame>
  );
}
