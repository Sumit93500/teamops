// pages/employee-dashboard.js
// Runs on dashboard/employee.html. The signed-in person's own attendance and
// leave, whatever their role: days present and late marks this month, leave
// left, open requests, working hours for the last 14 days, the newest pending
// request, the leave balance card, decisions on their own requests (merged
// with the static updates) and their last 5 working days. Everything comes
// from data/attendance-store.js and data/leave-store.js. The payslip, the
// laptop request and the announcement lines are static samples (marked
// data-static in the HTML) and stay as they are. A session without an
// employee id (an old sign-in) leaves the static page as it is.

import { getCurrentUserId } from "../core/auth.js";
import { getUser } from "../data/store.js";
import { addDays } from "../data/holidays.js";
import { LEAVE_TYPES, balanceFor, requestsFor, currentApproverName } from "../data/leave-store.js";
import { monthFor, rangeFor, regularizationsFor } from "../data/attendance-store.js";
import {
  el, todayIso, formatDay, formatRange, monthName, typeLabel, requestDates,
  statusBadge, newestPending, decisionOf, localDateOf, shortDate, whenText, plural,
} from "../ui/leave-view.js";
import { hoursText, dayBadge } from "../ui/attendance-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";
import { chartColumns, barRow } from "../ui/chart.js";

const CHART_DAYS = 14;
const RECENT_DAYS = 5;
const LOOK_BACK = 31;       // days read for the chart and the recent days (5 working days are always inside it)
const SHOWN_DECISIONS = 3;
const MARKER = 6;           // bar height (of 100) for a day with no hours to draw: leave, absent, no check-out
const SHORT = { casual: "Casual", sick: "Sick", earned: "Earned", wfh: "WFH" };

const user = getUser(getCurrentUserId());
const today = todayIso();
const year = Number(today.slice(0, 4));
const month = Number(today.slice(5, 7));

const subtitle = document.getElementById("dash-subtitle");
const stats = document.getElementById("dash-stats");
const hoursRange = document.getElementById("hours-range");
const chart = document.getElementById("hours-chart");
const hoursNote = document.getElementById("hours-note");
const requestList = document.getElementById("my-requests-list");
const balanceCard = document.getElementById("balance-card");
const updates = document.getElementById("updates");
const recentBody = document.getElementById("my-days");

// The static samples that stay, read once from the HTML.
const staticRequests = Array.from(requestList?.querySelectorAll("[data-static]") ?? []);
const staticUpdates = Array.from(updates?.querySelectorAll("[data-static]") ?? []);

// ---------- formatting ----------

const isPending = (r) => r.status === "pending";
const isOff = (day) => day.status === "weekend" || day.status === "holiday";

// "Casual leave, 5 Oct" or "Regularization, 25 Sep", as on my-requests.
const requestName = (r) => (r.issue ? `Regularization, ${formatDay(r.date)}` : `${typeLabel(r.type)}, ${requestDates(r)}`);

function setStat(key, value, note, tone = "") {
  const stat = stats.querySelector(`[data-stat="${key}"]`);
  if (!stat) return;
  setStatValue(stat, value);
  setStatNote(stat, note, tone);
}

// ---------- stat strip ----------

// Working days so far this month, as on my-attendance: today counts once it isn't "not in yet".
function renderPresent(summary) {
  if (!summary) {
    setStat("present", "–", "Attendance isn't tracked");
    return;
  }
  const soFar = summary.days.filter((d) => d.date <= today && !isOff(d) && d.status !== "no-data" && d.status !== "not-yet");
  const late = summary.lateMarks;
  setStat("present", soFar.length ? `${summary.daysWorked} / ${soFar.length}` : "–",
    late ? plural(late, "late mark", "late marks") : "No late marks", late ? "down" : "");
}

// Leave types with a limit (not unpaid), in policy order.
function limitedBalance() {
  const balance = balanceFor(user.id, year, month);
  return LEAVE_TYPES.filter((type) => balance[type].allowance !== null).map((type) => ({ type, ...balance[type] }));
}

function renderBalanceStat(rows) {
  const total = rows.reduce((sum, r) => sum + r.left, 0);
  const most = [...rows].sort((a, b) => b.left - a.left);   // stable: ties keep policy order
  setStat("balance", `${total} ${total === 1 ? "day" : "days"}`, most.map((r) => `${SHORT[r.type]} ${r.left}`).join(", "));
}

function renderOpenRequests(leave, corrections) {
  const delta = stats.querySelector('[data-stat="requests"] .stat__delta');
  const otherCount = Number(delta?.dataset.staticCount ?? 0);
  const otherText = delta?.dataset.staticText ?? "";
  const leavePending = leave.filter(isPending).length;
  const correctionsPending = corrections.filter(isPending).length;
  const parts = [];
  if (leavePending) parts.push(`${leavePending} leave`);
  if (correctionsPending) parts.push(plural(correctionsPending, "correction", "corrections"));
  if (otherText) parts.push(otherText);
  setStat("requests", String(leavePending + correctionsPending + otherCount), parts.join(", ") || "None");
}

// ---------- hours chart ----------

// One day's bar for chartColumns(): { modifier, height 0-100, what happened }.
function barLook(day) {
  const look = (modifier, height, what) => ({ modifier, height, what });
  if (isOff(day)) return look("chart__bar--muted", 0, day.holiday && day.status === "holiday" ? `${day.holiday.name}, day off` : "day off");
  if (day.status === "no-data") return look("chart__bar--muted", 0, "no data");
  if (day.status === "on-leave") return look("chart__bar--leave", MARKER, "on leave");
  if (day.minutesWorked !== null) {
    const hours = (day.minutesWorked / 60).toFixed(1);
    const height = Math.min(100, Math.round(day.minutesWorked / 6));   // 10 hours = the top of the chart
    if (day.inProgress) return look("chart__bar--progress", height, `${hours} hours so far`);
    const note = { late: ", late", "half-day": ", half day", absent: ", under 4 hours (absent)" }[day.status] ?? "";
    return look("", height, `${hours} hours${note}`);
  }
  if (day.incomplete) return look("chart__bar--incomplete", MARKER, `checked in at ${day.checkIn}, no check-out`);
  if (day.status === "absent") return look("chart__bar--absent", MARKER, "absent");
  return look("", 0, day.overdue ? "not checked in yet (overdue)" : "not in yet");   // not-yet: today
}

function renderChart(days) {
  const from = days[0].date;
  hoursRange.textContent = formatRange(from, today);
  chart.replaceChildren(...chartColumns(days, barLook));
  const worked = days.filter((d) => d.minutesWorked !== null && !d.inProgress).map((d) => d.minutesWorked / 60);
  chart.setAttribute("aria-label", worked.length
    ? `Working hours, ${formatRange(from, today)}: ${plural(worked.length, "day", "days")} worked, between ${Math.min(...worked).toFixed(1)} and ${Math.max(...worked).toFixed(1)} hours`
    : `Working hours, ${formatRange(from, today)}: no finished days recorded`);
  hoursNote.textContent = "Weekends and holidays are days off. Short marks: blue is leave, red is absent, amber is a missing check-out.";
}

// ---------- my attendance ----------

function recentRow(day) {
  const tr = el("tr");
  const outText = day.incomplete ? "Not recorded" : (day.checkOut ?? "–");
  const status = el("td");
  status.append(dayBadge(day));
  if (day.regularized) status.append(" ", el("span", "badge badge--success badge--square", "Regularized"));
  tr.append(
    el("td", "", shortDate(day.date)),
    el("td", "", day.checkIn ? `${day.checkIn}${day.mode === "wfh" ? " (WFH)" : ""}` : "–"),
    el("td", "", outText),
    el("td", "table__num", day.minutesWorked === null ? "–" : hoursText(day.minutesWorked)),
    status,
  );
  return tr;
}

// Today and the working days before it, newest first; weekends and holidays are
// skipped, and days before any attendance was recorded end the list.
function renderRecent(days) {
  const recent = [];
  for (const day of [...days].reverse()) {
    if (recent.length === RECENT_DAYS || day.status === "no-data") break;
    if (!isOff(day)) recent.push(day);
  }
  if (recent.length) {
    recentBody.replaceChildren(...recent.map(recentRow));
    return;
  }
  const td = el("td", "text-muted", days.length ? "No attendance recorded yet." : "Attendance isn't tracked.");
  td.colSpan = 5;
  const tr = el("tr");
  tr.append(td);
  recentBody.replaceChildren(tr);
}

// ---------- requests, balance, updates ----------

function renderRequestList(leave, corrections) {
  const request = newestPending([...leave, ...corrections]);
  const items = [];
  if (request) {
    const item = el("div", "list__item");
    const content = el("div", "list__content");
    content.append(el("span", "list__title", requestName(request)), el("span", "list__sub", `Waiting for ${currentApproverName(request)}`));
    item.append(el("div", "avatar avatar--2", request.issue ? "R" : "L"), content, statusBadge("pending"));
    items.push(item);
  }
  requestList.replaceChildren(...items, ...staticRequests);
}

function renderBalanceCard(rows) {
  const bars = rows.map((r) => {
    const share = r.allowance ? Math.min(100, Math.max(0, Math.round((r.left / r.allowance) * 100))) : 0;
    return barRow(SHORT[r.type], String(r.left), share);
  });
  const lines = rows.map((r) => `${typeLabel(r.type)} is ${r.left} of ${plural(r.allowance, "day", "days")}${r.type === "wfh" ? " this month" : ""}${r.pending ? ` (${r.pending} pending)` : ""}.`);
  bars.push(el("p", "text-xs text-muted mt-4", lines.join(" ")));
  balanceCard.replaceChildren(...bars);
}

// The newest decisions on the person's own leave and corrections, merged with
// the static lines by date (a static line without a date stays at the end).
function renderUpdates(leave, corrections) {
  const decided = [...leave, ...corrections]
    .map((request) => ({ request, decision: decisionOf(request) }))
    .filter((x) => x.decision)
    .sort((a, b) => b.decision.at.localeCompare(a.decision.at))
    .slice(0, SHOWN_DECISIONS)
    .map(({ request, decision }) => {
      const approved = decision.decision !== "rejected";
      const what = request.issue ? `regularization for ${formatDay(request.date)}` : `${typeLabel(request.type).toLowerCase()} for ${requestDates(request)}`;
      const verb = { approved: "approved", rejected: "rejected", "auto-approved": "approved automatically" }[decision.decision];
      const date = localDateOf(decision.at);
      const item = el("div", "activity__item");
      const text = el("div", "activity__text", `Your ${what} was ${verb}`);
      text.append(el("span", "activity__time", whenText(date, today)));
      item.append(el("span", `activity__dot activity__dot--${approved ? "success" : "danger"}`), text);
      return { item, date };
    });
  const all = [...decided, ...staticUpdates.map((item) => ({ item, date: item.dataset.date ?? "" }))];
  const dated = all.filter((x) => x.date).sort((a, b) => b.date.localeCompare(a.date));   // stable: real before static on the same day
  const undated = all.filter((x) => !x.date);
  updates.replaceChildren(...[...dated, ...undated].map((x) => x.item));
}

// ---------- start ----------

if (user && stats && chart && requestList && balanceCard && updates && recentBody) {
  subtitle.textContent = `Your attendance and requests for ${monthName(month)} ${year}`;

  const leave = requestsFor(user.id);
  const corrections = regularizationsFor(user.id);
  const days = rangeFor(user.id, addDays(today, -(LOOK_BACK - 1)), today) ?? [];
  const balance = limitedBalance();

  renderPresent(monthFor(user.id, year, month));
  renderBalanceStat(balance);
  renderOpenRequests(leave, corrections);
  if (days.length) {
    renderChart(days.slice(-CHART_DAYS));
  } else {
    chart.replaceChildren();
    hoursRange.textContent = "–";
    hoursNote.textContent = "Attendance isn't tracked.";
  }
  renderRequestList(leave, corrections);
  renderBalanceCard(balance);
  renderUpdates(leave, corrections);
  renderRecent(days);
}