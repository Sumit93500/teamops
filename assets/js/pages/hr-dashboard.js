// pages/hr-dashboard.js
// Runs on dashboard/hr.html (needs leave:approve). The leave and attendance
// widgets, all from the real stores: who is on leave today, pending leave and
// how long the oldest has waited, leave requests sent per day for the last 14
// days, a preview of what's waiting for this person's decision (leave and, with
// attendance:approve, attendance corrections) with working Approve / Reject,
// recent decisions, and every leave request with a status filter and a name
// search. Approve / Reject go through the same flows as leave-approvals.html
// and regularization.html (ui/leave-decision.js), so a decision here is the
// same store write as there. The recruitment widgets and the interview line
// are static samples (data-static) and stay as they are. A session without an
// employee id (an old sign-in) leaves the static page as it is.

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { applyPermissions, can } from "../core/rbac.js";
import { getUser } from "../data/store.js";
import { dayNumber, isoFromDayNumber, dayOffChecker } from "../data/holidays.js";
import { allRequests, pendingFor } from "../data/leave-store.js";
import { summaryFor, allRegularizations, pendingRegularizations } from "../data/attendance-store.js";
import { approveLeave, openRejectModal, approveCorrection, openRejectCorrectionModal, decisionButtons } from "../ui/leave-decision.js";
import {
  el, todayIso, formatDay, formatDays, formatRange, weekdayName, monthName, dayOfMonth, requestDates,
  typeLabel, statusBadge, initials, avatarClass, decisionOf, localDateOf, nameOf, oldestPendingNote,
} from "../ui/leave-view.js";

const CHART_DAYS = 14;
const CHART_FLOOR = 5;       // the chart's top is at least 5 requests, so one request isn't a full-height bar
const SHOWN_APPROVALS = 3;
const SHOWN_DECISIONS = 3;
const TABLE_ROWS = 10;
const ISSUE_LABEL = { "late-arrival": "Late arrival", "missed-check-in": "Missed check-in", "missed-check-out": "Missed check-out" };

const userId = getCurrentUserId();
const role = getCurrentRole()?.key;
const user = getUser(userId);
const showCorrections = can("attendance:approve");
const today = todayIso();

const subtitle = document.getElementById("dash-subtitle");
const stats = document.getElementById("dash-stats");
const leaveRange = document.getElementById("leave-range");
const chart = document.getElementById("leave-chart");
const leaveNote = document.getElementById("leave-note");
const approvalsMeta = document.getElementById("approvals-meta");
const approvalsList = document.getElementById("approvals-list");
const activity = document.getElementById("activity");
const searchInput = document.getElementById("leave-search");
const statusSelect = document.getElementById("leave-status");
const leaveRows = document.getElementById("leave-rows");
const leaveRowsMeta = document.getElementById("leave-rows-meta");

// The static sample that stays (the interview line), read once from the HTML.
const staticActivity = Array.from(activity?.querySelectorAll("[data-static]") ?? []);

let search = "";
let statusFilter = "";

// ---------- helpers ----------

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const percent = (part, whole) => `${Math.round((part / whole) * 1000) / 10}%`;
const shortDate = (iso) => `${weekdayName(iso).slice(0, 3)}, ${formatDay(iso)}`;
const addDays = (iso, n) => isoFromDayNumber(dayNumber(iso) + n);
const issueLabel = (r) => ISSUE_LABEL[r.issue] ?? r.issue;
// "Late arrival, 10:24 to 09:30", or "Missed check-out, 18:00" when nothing was recorded (as in the inbox).
const correctionDetails = (r) => `${issueLabel(r)}, ${r.recordedTime ? `${r.recordedTime} to ${r.time}` : r.time}`;
// Newest sent first; the id breaks ties between two sent the same day.
const newestSent = (a, b) => b.appliedOn.localeCompare(a.appliedOn) || b.id.localeCompare(a.id, "en", { numeric: true });

// "Today", "Yesterday", "28 Sep", or "20 Jan 2025" for another year.
function whenText(iso) {
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  return formatDay(iso, iso.slice(0, 4) !== today.slice(0, 4));
}

function setStat(key, value, note, tone = "") {
  const stat = stats.querySelector(`[data-stat="${key}"]`);
  if (!stat) return;
  stat.querySelector(".stat__value").textContent = value;
  const delta = stat.querySelector(".stat__delta");
  delta.className = `stat__delta${tone ? ` stat__delta--${tone}` : ""}`;
  delta.textContent = note;
}

// What this person may decide, as on leave-approvals.html and regularization.html.
const pendingLeave = () => pendingFor(userId, role);
const pendingCorrections = () => (showCorrections ? pendingRegularizations(userId, role) : []);

// ---------- stat strip ----------

function renderStats() {
  const summary = summaryFor(today);
  setStat("on-leave", String(summary.onLeave), summary.total
    ? `${percent(summary.onLeave, summary.total)} of ${summary.total} active, ${summary.expected} expected at work`
    : "No active employees");

  // The same wording as leave-approvals.html's Pending stat.
  const pending = pendingLeave();
  setStat("pending", String(pending.length), oldestPendingNote(pending, today) || "Nothing waiting", pending.length ? "down" : "");
}

// ---------- leave requests chart ----------

// Requests sent per day (appliedOn), whatever became of them later.
function renderChart() {
  const from = addDays(today, -(CHART_DAYS - 1));
  const isOff = dayOffChecker();
  const perDay = new Map();
  allRequests().forEach((r) => perDay.set(r.appliedOn, (perDay.get(r.appliedOn) ?? 0) + 1));
  const days = Array.from({ length: CHART_DAYS }, (_, i) => addDays(from, i)).map((date) => ({ date, count: perDay.get(date) ?? 0, off: isOff(date) }));
  const top = Math.max(CHART_FLOOR, ...days.map((d) => d.count));

  leaveRange.textContent = formatRange(from, today);
  chart.replaceChildren(...days.map((day) => {
    const bar = el("span", `chart__bar${day.off ? " chart__bar--muted" : ""}`);
    bar.style.setProperty("--h", String(Math.round((day.count / top) * 100)));
    bar.title = `${shortDate(day.date)}: ${plural(day.count, "request", "requests")}`;
    const track = el("div", "chart__track");
    track.append(bar);
    const col = el("div", "chart__col");
    col.append(track, el("span", "chart__label", String(dayOfMonth(day.date))));
    return col;
  }));
  const total = days.reduce((sum, d) => sum + d.count, 0);
  chart.setAttribute("aria-label", `Leave requests sent per day, ${formatRange(from, today)}: ${plural(total, "request", "requests")} in all, at most ${Math.max(...days.map((d) => d.count))} on one day`);
  leaveNote.textContent = "Requests counted on the day they were sent. Weekends and holidays are shown lighter.";
}

// ---------- pending approvals ----------

function approvalItem(request) {
  const leave = !request.issue;
  const item = el("div", "list__item");
  const content = el("div", "list__content");
  content.append(
    el("span", "list__title", leave ? `${nameOf(request.userId)}, ${typeLabel(request.type).toLowerCase()}` : `Regularization: ${nameOf(request.userId)}`),
    el("span", "list__sub", leave ? `${requestDates(request)}, ${formatDays(request.days)}` : `${formatDay(request.date)}: ${correctionDetails(request)}`),
  );
  const buttons = leave
    ? decisionButtons("leave:approve", () => openRejectModal(request, render), () => approveLeave(request, render))
    : decisionButtons("attendance:approve", () => openRejectCorrectionModal(request, render), () => approveCorrection(request, render));
  item.append(el("div", avatarClass(request.userId), initials(nameOf(request.userId))), content, buttons);
  return item;
}

function renderApprovals() {
  const waiting = [...pendingLeave(), ...pendingCorrections()].sort(newestSent);
  const shown = waiting.slice(0, SHOWN_APPROVALS);
  approvalsMeta.textContent = waiting.length ? `${shown.length} of ${waiting.length} shown` : "None";
  if (!shown.length) {
    const item = el("div", "list__item");
    const content = el("div", "list__content");
    content.append(el("span", "list__sub", "Nothing is waiting for your decision."));
    item.append(content);
    approvalsList.replaceChildren(item);
    return;
  }
  approvalsList.replaceChildren(...shown.map(approvalItem));
  applyPermissions(approvalsList);
}

// ---------- recent activity ----------

// "Priya Nair approved Rohan Gupta's casual leave for 13 – 15 Oct"
function activityText(request, decision) {
  const what = request.issue
    ? `${nameOf(request.userId)}'s regularization for ${formatDay(request.date)}`
    : `${nameOf(request.userId)}'s ${typeLabel(request.type).toLowerCase()} for ${requestDates(request)}`;
  if (decision.decision === "auto-approved") return `${what} was approved automatically`;
  return `${nameOf(decision.byUserId)} ${decision.decision} ${what}`;
}

// The newest decisions on leave and corrections, then the static line (it has no date).
function renderActivity() {
  const decided = [...allRequests(), ...(showCorrections ? allRegularizations() : [])]
    .map((request) => ({ request, decision: decisionOf(request) }))
    .filter((x) => x.decision)
    .sort((a, b) => b.decision.at.localeCompare(a.decision.at))
    .slice(0, SHOWN_DECISIONS)
    .map(({ request, decision }) => {
      const item = el("div", "activity__item");
      const text = el("div", "activity__text", activityText(request, decision));
      text.append(el("span", "activity__time", whenText(localDateOf(decision.at))));
      item.append(el("span", `activity__dot activity__dot--${decision.decision === "rejected" ? "danger" : "success"}`), text);
      return item;
    });
  activity.replaceChildren(...decided, ...staticActivity);
}

// ---------- leave requests table ----------

function leaveRow(request) {
  const tr = el("tr");
  const person = el("td");
  const wrap = el("div", "table__user");
  wrap.append(el("div", avatarClass(request.userId), initials(nameOf(request.userId))), el("span", "table__user-name", nameOf(request.userId)));
  person.append(wrap);
  const status = el("td");
  status.append(statusBadge(request.status));
  tr.append(person, el("td", "", typeLabel(request.type)), el("td", "", requestDates(request)), el("td", "table__num", String(request.days)), status);
  return tr;
}

// Every request in the store, newest sent first; the filter matches the stored status.
function renderTable() {
  const query = search.trim().toLowerCase();
  const all = allRequests();
  const rows = all
    .filter((r) => (!statusFilter || r.status === statusFilter) && (!query || nameOf(r.userId).toLowerCase().includes(query)))
    .sort(newestSent);
  const shown = rows.slice(0, TABLE_ROWS);
  if (shown.length) {
    leaveRows.replaceChildren(...shown.map(leaveRow));
  } else {
    const td = el("td", "text-muted", all.length ? "No requests match these filters." : "No leave requests yet.");
    td.colSpan = 5;
    const tr = el("tr");
    tr.append(td);
    leaveRows.replaceChildren(tr);
  }
  const noun = `${statusFilter || query ? "matching " : ""}${rows.length === 1 ? "request" : "requests"}`;
  leaveRowsMeta.textContent = `Showing ${shown.length} of ${rows.length} ${noun}`;
}

// ---------- start ----------

function render() {
  renderStats();
  renderChart();
  renderApprovals();
  renderActivity();
  renderTable();
}

// can() matters because guard.js only redirects; this script would still run.
if (user && can("leave:approve") && stats && chart && approvalsList && activity && leaveRows) {
  subtitle.textContent = `People operations for ${monthName(Number(today.slice(5, 7)))} ${today.slice(0, 4)}`;
  searchInput?.addEventListener("input", () => {
    search = searchInput.value;
    renderTable();
  });
  statusSelect?.addEventListener("change", () => {
    statusFilter = statusSelect.value;
    renderTable();
  });
  render();
}