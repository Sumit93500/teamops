// pages/my-attendance.js
// Runs on my-attendance.html. The signed-in person's attendance for the chosen
// month (this month and the three before it), all from data/attendance-store.js:
// the stat strip, the calendar, the month summary, the late-mark alert and the
// daily log with Request fix / Cancel. Also the "Request regularization" modal,
// which sends a correction request through the store. A session without an
// employee id (an old sign-in) leaves the static page as it is, apart from
// keeping the modal's Send request from reloading the page.

import { getCurrentUserId } from "../core/auth.js";
import { applyPermissions } from "../core/rbac.js";
import { getUser } from "../data/store.js";
import { managerFor } from "../data/leave-store.js";
import { dayNumber } from "../data/holidays.js";
import {
  ATTENDANCE_RULES, monthFor, requestRegularization, cancelRegularization, regularizationsFor,
} from "../data/attendance-store.js";
import { renderPagination } from "../ui/pagination.js";
import { openModal, closeModal } from "../ui/modal.js";
import { showToast } from "../ui/toast.js";
import { el, todayIso, formatDay, monthName, localDateOf, shortDate, plural } from "../ui/leave-view.js";
import { hoursText, dayBadge } from "../ui/attendance-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";
import { barRow } from "../ui/chart.js";

const PAGE_SIZE = 10;
const MONTHS_BACK = 3;
const MODAL_ID = "regularize-modal";
const R = ATTENDANCE_RULES;

const userId = getCurrentUserId();
const user = getUser(userId);

const monthSelect = document.getElementById("month-select");
const requestBtn = document.getElementById("request-btn");
const stats = document.getElementById("month-stats");
const calendarCard = document.getElementById("attendance-calendar");
const summaryCard = document.getElementById("month-summary");
const lateAlert = document.getElementById("late-alert");
const logCard = document.getElementById("daily-log");
const logBody = logCard?.querySelector("tbody");
const paginationEl = logCard?.querySelector(".pagination");
const modal = document.getElementById(MODAL_ID);
const form = modal?.querySelector("form");
const field = (id) => document.getElementById(id);
const FIELDS = { date: "reg-date", issue: "reg-issue", time: "reg-time", reason: "reg-reason" };

let year = 0;
let month = 0;
let currentPage = 1;

// ---------- formatting ----------

const pad = (n) => String(n).padStart(2, "0");
const ordinal = (n) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

// Working days of the month up to today that have data: not weekends or
// holidays, not before attendance was recorded, not today while nothing's in yet.
const isOffOrEmpty = (day) => ["weekend", "holiday", "no-data", "not-joined"].includes(day.status);
const soFar = (days, today) => days.filter((d) => d.date <= today && !isOffOrEmpty(d) && d.status !== "not-yet");

// ---------- stat strip ----------

function setStat(index, value, note) {
  const stat = stats.querySelectorAll(".stat")[index];
  if (!stat) return;
  setStatValue(stat, value);
  setStatNote(stat, note).hidden = !note;
}

// "Approved on 25 Sep", "Pending since 24 Sep", "Rejected on 16 Sep", "Cancelled on 24 Sep"
function latestNote(request) {
  if (request.status === "pending") return `Latest: pending since ${formatDay(request.appliedOn)}`;
  const last = request.history[request.history.length - 1];
  const verb = { approved: "approved", rejected: "rejected", cancelled: "cancelled" }[request.status] ?? request.status;
  return `Latest: ${verb} on ${formatDay(localDateOf(last.at))}`;
}

function renderStats(summary, today, requests) {
  const done = soFar(summary.days, today);
  const isCurrent = today.slice(0, 7) === `${year}-${pad(month)}`;
  if (!done.length) {
    setStat(0, "–", isCurrent && summary.workingDaysLeft ? `${plural(summary.workingDaysLeft, "working day", "working days")} left` : "No attendance recorded");
  } else {
    setStat(0, `${summary.daysWorked} / ${done.length}`, isCurrent ? `${plural(summary.workingDaysLeft, "working day", "working days")} left` : "Working days in the month");
  }

  const left = R.penaltyEvery - (summary.lateMarks % R.penaltyEvery);
  let lateNote = `${left} more before a half day`;
  if (summary.penaltyHalfDays) lateNote = `${plural(summary.penaltyHalfDays, "half day", "half days")} this month; ${left} more before the next`;
  setStat(1, String(summary.lateMarks), lateNote);

  setStat(2, summary.averageMinutes === null ? "–" : hoursText(summary.averageMinutes), `Target is ${R.fullDayMinutes / 60}h`);

  const inMonth = requests.filter((r) => r.date.startsWith(`${year}-${pad(month)}-`))
    .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn) || b.id.localeCompare(a.id, "en", { numeric: true }));
  setStat(3, String(inMonth.length), inMonth.length ? latestNote(inMonth[0]) : "None this month");
}

// ---------- calendar ----------

// The calendar__day modifier and tag for one day.
function cellLook(day, today) {
  const wfh = day.mode === "wfh" ? " (WFH)" : "";
  switch (day.status) {
    case "present": return ["present", day.incomplete ? "No check-out" : `On time${wfh}`];
    case "late": return ["late", day.incomplete ? "Late, no check-out" : `Late${wfh}`];
    case "half-day": return ["late", "Half day"];
    case "absent": return ["absent", "Absent"];
    case "on-leave": return ["leave", "On leave"];
    case "holiday": return ["holiday", day.holiday?.name ?? "Holiday"];
    case "weekend": return ["weekend", ""];
    case "no-data": return ["future", "No data"];
    case "not-joined": return ["future", "Before joining"];
    default: return ["future", day.date === today ? "Not in yet" : ""];   // not-yet
  }
}

function renderCalendar(summary, today) {
  const first = summary.days[0].date;
  const lead = (new Date(dayNumber(first) * 24 * 60 * 60 * 1000).getUTCDay() + 6) % 7;   // Monday first
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(el("div", "calendar__day calendar__day--empty"));
  summary.days.forEach((day) => {
    const [kind, tag] = cellLook(day, today);
    const cell = el("div", `calendar__day calendar__day--${kind}${day.date === today ? " calendar__day--today" : ""}`);
    cell.dataset.date = day.date;
    cell.append(el("span", "calendar__date", String(Number(day.date.slice(8)))));
    if (tag) cell.append(el("span", "calendar__tag", tag));
    cells.push(cell);
  });
  while (cells.length % 7) cells.push(el("div", "calendar__day calendar__day--empty"));

  const grid = calendarCard.querySelector(".calendar__grid");
  grid.replaceChildren(...Array.from(grid.querySelectorAll(".calendar__dow")), ...cells);
  calendarCard.querySelector(".card__title").textContent = `${monthName(month)} ${year}`;
}

// ---------- month summary and late-mark alert ----------

function renderSummary(summary, today) {
  const done = soFar(summary.days, today);
  summaryCard.querySelector(".card__meta").textContent = `${plural(done.length, "working day", "working days")} so far`;
  // Counted over the days so far only, so leave booked later this month doesn't show yet.
  const count = (status) => done.filter((d) => d.status === status).length;
  const rows = [["On time", count("present")], ["Late", count("late")]];
  if (count("half-day")) rows.push(["Half day", count("half-day")]);
  rows.push(["On leave", count("on-leave")], ["Absent", count("absent")]);
  summaryCard.querySelector(".card__body").replaceChildren(...rows.map(([label, count]) => (
    barRow(label, String(count), done.length ? Math.round((count / done.length) * 100) : 0)
  )));
}

function renderLateAlert(summary) {
  if (!summary.lateMarks) {
    lateAlert.hidden = true;
    return;
  }
  const left = R.penaltyEvery - (summary.lateMarks % R.penaltyEvery);
  const penalty = summary.penaltyHalfDays
    ? ` That's ${plural(summary.penaltyHalfDays, "half day", "half days")} this month.`
    : ` ${left === 1 ? "The next one" : `${left} more`} would count as half a day.`;
  lateAlert.textContent = `You have ${plural(summary.lateMarks, "late mark", "late marks")} this month. Every ${ordinal(R.penaltyEvery)} late mark counts as half a day.`
    + `${penalty} Each half day is taken from your pay, not your leave balance, when payroll is processed.`;
  lateAlert.hidden = false;
}

// ---------- daily log ----------

// What can be corrected on this day, or "" if nothing: inside the request
// window, nothing pending, not already corrected.
function fixableIssue(day, today) {
  if (day.regularized || day.regularization?.status === "pending") return "";
  const age = dayNumber(today) - dayNumber(day.date);
  if (age < 0 || age > R.requestWindowDays) return "";
  if (day.checkIn && day.minutesLate > 0) return "late-arrival";
  if (day.incomplete) return "missed-check-out";
  if (day.status === "absent" && !day.checkIn) return "missed-check-in";
  return "";
}

function logRow(day, today) {
  const tr = el("tr");
  tr.dataset.date = day.date;
  const inText = day.checkIn ? `${day.checkIn}${day.mode === "wfh" ? " (WFH)" : ""}` : "–";
  const outText = day.incomplete ? "Not recorded" : (day.checkOut ?? "–");
  const status = el("td");
  status.append(dayBadge(day));

  const actions = el("td", "table__actions");
  const pending = day.regularization?.status === "pending" ? day.regularization : null;
  const issue = fixableIssue(day, today);
  if (day.regularized) {
    actions.append(el("span", "badge badge--success badge--square", "Regularized"));
  } else if (pending) {
    const group = el("div", "btn-group");
    const cancel = el("button", "btn btn--sm btn--ghost", "Cancel");
    cancel.type = "button";
    cancel.dataset.permission = "attendance:regularize";
    cancel.addEventListener("click", () => cancelRequest(pending.id, day.date));
    group.append(el("span", "badge badge--warning badge--square", "Pending"), cancel);
    actions.append(group);
  } else if (issue) {
    const fix = el("button", "btn btn--sm", "Request fix");
    fix.type = "button";
    fix.dataset.permission = "attendance:regularize";
    fix.addEventListener("click", () => openRequest(day.date, issue));
    actions.append(fix);
  }

  tr.append(el("td", "", shortDate(day.date)), el("td", "", inText), el("td", "", outText),
    el("td", "table__num", day.minutesWorked === null ? "–" : hoursText(day.minutesWorked)), status, actions);
  return tr;
}

function renderLog(summary, today) {
  // Every working day so far, today included, newest first.
  const days = summary.days.filter((d) => d.date <= today && !isOffOrEmpty(d)).reverse();
  logCard.querySelector(".card__meta").textContent = `${monthName(month)}, ${plural(days.length, "working day", "working days")} so far`;
  const totalPages = Math.max(1, Math.ceil(days.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageDays = days.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  if (pageDays.length) {
    logBody.replaceChildren(...pageDays.map((d) => logRow(d, today)));
  } else {
    const td = el("td", "text-muted", "No attendance recorded for this month.");
    td.colSpan = 6;
    const tr = el("tr");
    tr.append(td);
    logBody.replaceChildren(tr);
  }
  applyPermissions(logBody);
  renderPagination(paginationEl, {
    totalItems: days.length,
    pageSize: PAGE_SIZE,
    currentPage,
    onPageChange: (page) => {
      currentPage = page;
      render();
    },
  });
}

// ---------- everything ----------

function render() {
  const today = todayIso();
  const summary = monthFor(userId, year, month);
  if (!summary) return;
  const requests = regularizationsFor(userId);
  renderStats(summary, today, requests);
  renderCalendar(summary, today);
  renderSummary(summary, today);
  renderLateAlert(summary);
  renderLog(summary, today);
}

function fillMonths() {
  const today = todayIso();
  let y = Number(today.slice(0, 4));
  let m = Number(today.slice(5, 7));
  const options = [];
  for (let i = 0; i <= MONTHS_BACK; i++) {
    const option = el("option", "", `${monthName(m)} ${y}`);
    option.value = `${y}-${pad(m)}`;
    options.push(option);
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  monthSelect.replaceChildren(...options);
  monthSelect.value = options[0].value;
  year = Number(today.slice(0, 4));
  month = Number(today.slice(5, 7));
}

// ---------- cancel ----------

function cancelRequest(id, date) {
  if (!window.confirm(`Cancel your correction request for ${formatDay(date)}?`)) return;
  const result = cancelRegularization(id, userId);
  if (result.ok) showToast("Correction request cancelled.", "success");
  else showToast("Couldn't cancel the request. It may already have been decided.", "danger");
  render();
}

// ---------- the request modal ----------

function clearErrors() {
  form.querySelectorAll(".form-error").forEach((e) => e.remove());
  Object.values(FIELDS).forEach((id) => field(id)?.removeAttribute("aria-describedby"));
}

function showFieldError(input, message) {
  clearErrors();
  const error = el("span", "form-error", message);
  error.id = `${input.id}-error`;
  input.closest(".form-field").append(error);
  input.setAttribute("aria-describedby", error.id);
  input.focus();
}

// Who it goes to: the manager as the first step (as with leave), or HR.
function sentToText() {
  if (user?.role === "admin") return "Approved straight away (Admin)";
  const manager = getUser(managerFor(userId));
  return manager ? `${manager.name} first, then HR or an Admin` : "HR or an Admin";
}

// Opens the modal, empty or with a day (and what went wrong) filled in.
function openRequest(date = "", issue = "") {
  form.reset();
  clearErrors();
  const today = todayIso();
  const dateInput = field(FIELDS.date);
  dateInput.value = date;
  dateInput.max = today;
  dateInput.min = new Date((dayNumber(today) - R.requestWindowDays) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  field(FIELDS.issue).value = issue;
  field("reg-manager").value = sentToText();
  openModal(MODAL_ID);
  field(date ? (issue ? FIELDS.time : FIELDS.issue) : FIELDS.date).focus();
}

function submit(e) {
  e.preventDefault();
  clearErrors();
  const result = requestRegularization(userId, {
    date: field(FIELDS.date).value,
    issue: field(FIELDS.issue).value,
    time: field(FIELDS.time).value,
    reason: field(FIELDS.reason).value,
  });
  if (!result.ok) {
    const input = field(FIELDS[result.field]);
    if (input) showFieldError(input, result.error);   // set as text, so it's safe
    else showToast("Couldn't send the request. Please try again.", "danger");
    return;
  }
  closeModal(MODAL_ID);
  showToast(result.record.status === "approved" ? "Correction applied." : "Correction request sent.", "success");
  // Show the month the request is about.
  const [y, m] = result.record.date.split("-").map(Number);
  if (monthSelect.querySelector(`option[value="${y}-${pad(m)}"]`)) {
    year = y;
    month = m;
    monthSelect.value = `${y}-${pad(m)}`;
  }
  render();
}

// ---------- start ----------

if (user && monthSelect && stats && calendarCard && summaryCard && lateAlert && logBody && paginationEl && form) {
  fillMonths();
  monthSelect.addEventListener("change", () => {
    [year, month] = monthSelect.value.split("-").map(Number);
    currentPage = 1;
    render();
  });
  // app.js already opens the modal from the header button (data-modal); this empties it first.
  requestBtn?.addEventListener("click", () => openRequest());
  form.addEventListener("submit", submit);
  Object.values(FIELDS).forEach((id) => field(id).addEventListener("input", clearErrors));
  render();
} else if (form) {
  // The static page (an old sign-in with no employee id): the modal still opens
  // from its buttons, so stop Send request from reloading the page and losing
  // what was typed.
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    showToast("Send request isn't available in this demo.", "info");
  });
}