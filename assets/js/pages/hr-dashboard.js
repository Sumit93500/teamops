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
// (data-static) are samples, labelled "Sample, not built yet" in the HTML
// (recruitment isn't built), and stay as they are. A session without an
// employee id (an old sign-in) leaves the static page as it is.
//
// New joiners: this calendar month's, by the joining date on each person's
// record (renderJoiners()).

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { applyPermissions, can } from "../core/rbac.js";
import { getUser, getAllUsers, joiningDate } from "../data/store.js";
import { addDays, dayOffChecker } from "../data/holidays.js";
import { allRequests, pendingFor } from "../data/leave-store.js";
import { summaryFor, allRegularizations, pendingRegularizations } from "../data/attendance-store.js";
import { approveLeave, openRejectModal, approveCorrection, openRejectCorrectionModal, decisionButtons } from "../ui/leave-decision.js";
import {
  el, todayIso, formatDay, formatDays, formatRange, monthName, requestDates,
  typeLabel, statusBadge, initials, avatarClass, decisionOf, localDateOf, nameOf, oldestPendingNote,
  whenText, plural, percent, monthShort,
} from "../ui/leave-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";
import { chartColumns } from "../ui/chart.js";
import { correctionDetails } from "../ui/attendance-view.js";

const CHART_DAYS = 14;
const CHART_FLOOR = 5;       // the chart's top is at least 5 requests, so one request isn't a full-height bar
const SHOWN_APPROVALS = 3;
const SHOWN_DECISIONS = 3;
const TABLE_ROWS = 10;

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

// Newest sent first; the id breaks ties between two sent the same day.
const newestSent = (a, b) => b.appliedOn.localeCompare(a.appliedOn) || b.id.localeCompare(a.id, "en", { numeric: true });

function setStat(key, value, note, tone = "") {
  const stat = stats.querySelector(`[data-stat="${key}"]`);
  if (!stat) return;
  setStatValue(stat, value);
  setStatNote(stat, note, tone);
}

// What this person may decide now (the Approve / Reject buttons on
// leave-approvals.html and regularization.html). leave-approvals.html's
// "Waiting, all stages" counts more: every request still waiting, at either
// stage, so the two figures can differ, and each stat's label says which it is.
const pendingLeave = () => pendingFor(userId, role);
const pendingCorrections = () => (showCorrections ? pendingRegularizations(userId, role) : []);

// ---------- stat strip ----------

function renderStats() {
  const summary = summaryFor(today);
  setStat("on-leave", String(summary.onLeave), summary.total
    ? `${percent(summary.onLeave, summary.total)} of ${summary.total} active, ${summary.expected} expected at work`
    : "No active employees");

  // "Leave for you to decide": what this person may decide now, with the
  // oldest one's age (worded as on leave-approvals.html).
  const pending = pendingLeave();
  setStat("pending", String(pending.length), oldestPendingNote(pending, today) || "Nothing waiting", pending.length ? "down" : "");
  renderJoiners();
}

// New joiners this calendar month: everyone not inactive (the headcount's
// rule) whose joining date (store.js's joiningDate(), the date payroll reads)
// falls in it, including dates later this month. Not everyone has a joining
// date on file, so the note says how many don't rather than leaving them out
// silently (an unreadable date counts as none, as payroll treats it).
function renderJoiners() {
  const month = today.slice(0, 7);
  const people = getAllUsers().filter((u) => u.status !== "inactive");
  const dates = people.map((u) => joiningDate(u.dateOfJoining));
  const joiners = dates.filter((date) => date?.startsWith(month));
  const toJoin = joiners.filter((date) => date > today).length;
  const missing = dates.filter((date) => !date).length;
  const label = stats.querySelector('[data-stat="joiners"] .stat__label');
  if (label) label.textContent = `New joiners, ${monthShort(`${month}-01`)}`;
  const notes = [!joiners.length ? "No one joins this month"
    : toJoin ? `${toJoin} still to join`
    : joiners.length === 1 ? "Already started" : "All already started"];
  if (missing) notes.push(`no joining date on file for ${missing} of ${people.length}`);
  setStat("joiners", String(joiners.length), notes.join("; "));
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
  chart.replaceChildren(...chartColumns(days, (day) => ({
    modifier: day.off ? "chart__bar--muted" : "",
    height: Math.round((day.count / top) * 100),
    what: plural(day.count, "request", "requests"),
  })));
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
      text.append(el("span", "activity__time", whenText(localDateOf(decision.at), today)));
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