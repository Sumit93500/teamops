// pages/mark-attendance.js
// Runs on mark-attendance.html. Check in and check out for the signed-in
// person, today only, through data/attendance-store.js: the status badge,
// buttons, work mode, today's times and hours, this month's late marks and
// the last few working days all come from the store and redraw after every
// punch and once a minute. A session without an employee id (an old sign-in)
// leaves the static page as it is.

import { getCurrentUserId } from "../core/auth.js";
import { getUser } from "../data/store.js";
import { ATTENDANCE_RULES, checkIn, checkOut, dayFor, monthFor, toMinutes } from "../data/attendance-store.js";
import { typeLabel, el, todayIso, weekdayName, monthName, dayOfMonth, shortDate } from "../ui/leave-view.js";
import { dayNumber, isoFromDayNumber } from "../data/holidays.js";
import { showToast } from "../ui/toast.js";
import { hoursText, dayBadge } from "../ui/attendance-view.js";

const RECENT_DAYS = 5;
const R = ATTENDANCE_RULES;

const userId = getCurrentUserId();

const subtitle = document.getElementById("today-date");
const statusBadge = document.getElementById("punch-status");
const clock = document.getElementById("punch-clock");
const ruleLine = document.getElementById("punch-rule");
const modeInputs = Array.from(document.querySelectorAll('input[name="mode"]'));
const inBtn = document.getElementById("check-in-btn");
const outBtn = document.getElementById("check-out-btn");
const note = document.getElementById("punch-note");
const errorLine = document.getElementById("punch-error");
const statIn = document.getElementById("stat-check-in");
const statOut = document.getElementById("stat-check-out");
const statHours = document.getElementById("stat-hours");
const timing = document.getElementById("shift-timing");
const grace = document.getElementById("shift-grace");
const lateMarks = document.getElementById("late-marks");
const lateNote = document.getElementById("late-note");
const recentBody = document.querySelector("#recent-punches tbody");

let modeTouched = false;   // once the person picks a mode, redraws keep it

// ---------- formatting ----------

const pad = (n) => String(n).padStart(2, "0");

// 570 -> "9:30 AM"
function twelveHour(minutes) {
  const h = Math.floor(minutes / 60);
  return `${h % 12 || 12}:${pad(minutes % 60)} ${h < 12 ? "AM" : "PM"}`;
}

// "Monday, 28 September 2026"
function longDate(iso) {
  return `${weekdayName(iso)}, ${dayOfMonth(iso)} ${monthName(Number(iso.slice(5, 7)))} ${iso.slice(0, 4)}`;
}

// ---------- the punch card ----------

function setNote(text) {
  note.textContent = text;
  note.hidden = !text;
}

function showError(text) {
  errorLine.textContent = text;
  errorLine.hidden = !text;
}

function renderClock() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const [time, half] = twelveHour(minutes).split(" ");
  const tag = el("time", "", time.padStart(5, "0"));
  tag.setAttribute("datetime", `${pad(now.getHours())}:${pad(now.getMinutes())}`);
  clock.replaceChildren(tag, el("small", "", half));
}

function renderRule(day) {
  let start = toMinutes(R.shiftStart);
  let end = toMinutes(R.shiftEnd);
  if (day?.halfDayLeave === "first-half") start = toMinutes(R.halfSplit);
  if (day?.halfDayLeave === "second-half") end = toMinutes(R.halfSplit);
  const half = day?.halfDayLeave ? `You're on leave for the ${day.halfDayLeave === "first-half" ? "first" : "second"} half today. ` : "";
  ruleLine.textContent = `${half}Shift ${twelveHour(start)} – ${twelveHour(end)}. Checking in after ${twelveHour(start + R.graceMinutes)} is marked late.`;
}

// The badge, the buttons and the line under them, from today's derived day
// (null for an inactive person).
function renderStatus(day, user) {
  let badge = ["badge badge--warning badge--dot", "Not checked in yet"];
  let canIn = false;
  let canOut = false;
  let why = "";

  if (!day) {
    badge = ["badge badge--danger badge--dot", "Account inactive"];
    why = user ? "Your account is inactive, so attendance can't be recorded." : "Your employee record wasn't found, so attendance can't be recorded.";
  } else if (day.checkOut) {
    badge = ["badge badge--dot", `Checked out at ${day.checkOut}`];
    why = "You're done for today.";
  } else if (day.checkIn) {
    badge = day.minutesLate
      ? ["badge badge--warning badge--dot", `Checked in at ${day.checkIn}, late by ${day.minutesLate} min`]
      : ["badge badge--success badge--dot", `Checked in at ${day.checkIn}`];
    canOut = true;
  } else if (day.status === "on-leave") {
    badge = ["badge badge--info badge--dot", "On leave today"];
    why = `You're on approved ${day.leave ? typeLabel(day.leave.type).toLowerCase() : "leave"} today, so there's nothing to check in for.`;
  } else if (day.status === "weekend") {
    badge = ["badge badge--dot", "Weekend"];
    why = "No attendance is needed on weekends.";
  } else if (day.status === "holiday") {
    badge = ["badge badge--dot", `Holiday: ${day.holiday.name}`];
    why = "No attendance is needed on holidays.";
  } else if (day.status === "absent") {
    badge = ["badge badge--danger badge--dot", "Not checked in, the shift has ended"];
    canIn = true;
  } else {
    canIn = true;
  }

  statusBadge.className = badge[0];
  statusBadge.textContent = badge[1];
  inBtn.disabled = !canIn;
  outBtn.disabled = !canOut;
  setNote(why);

  // Work mode: the saved one once checked in; before that, the person's pick
  // or the day's suggestion (Work from home on an approved WFH day).
  const locked = Boolean(day?.checkIn) || !canIn;
  const mode = day?.mode ?? (modeTouched ? selectedMode() : day?.suggestedMode ?? "office");
  modeInputs.forEach((input) => {
    input.checked = input.value === mode;
    input.disabled = locked;
  });
}

function selectedMode() {
  return modeInputs.find((input) => input.checked)?.value ?? "office";
}

function renderStats(day) {
  statIn.textContent = day?.checkIn ? `${day.checkIn}${day.mode === "wfh" ? " (WFH)" : ""}` : "–";
  statOut.textContent = day?.checkOut ?? "–";
  statHours.textContent = hoursText(day?.minutesWorked ?? 0);
}

// ---------- side card ----------

function renderShift(today) {
  timing.textContent = `${twelveHour(toMinutes(R.shiftStart))} – ${twelveHour(toMinutes(R.shiftEnd))}`;
  grace.textContent = `${R.graceMinutes} minutes`;
  const month = monthFor(userId, Number(today.slice(0, 4)), Number(today.slice(5, 7)));
  if (!month) {
    lateMarks.textContent = "–";
    lateNote.hidden = true;
    return;
  }
  lateMarks.textContent = `${month.lateMarks} of ${R.penaltyEvery}`;
  let text = "";
  if (month.penaltyHalfDays) {
    text = `Every ${ordinal(R.penaltyEvery)} late mark in a month counts as half a day: ${month.penaltyHalfDays} this month. `
      + "Each half day is taken from your pay, not your leave balance, when payroll is processed.";
  } else if (month.lateMarks === R.penaltyEvery - 1) {
    text = `One more late mark this month counts as half a day. Each half day is taken from your pay, not your leave balance, when payroll is processed.`;
  }
  lateNote.textContent = text;
  lateNote.hidden = !text;
}

const ordinal = (n) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

// ---------- recent punches ----------

// The last few working days, today included, newest first. Weekends and
// holidays are skipped; days before any attendance was recorded end the list.
function recentDays(today) {
  const days = [];
  for (let n = dayNumber(today); days.length < RECENT_DAYS && n > dayNumber(today) - 31; n--) {
    const day = dayFor(userId, isoFromDayNumber(n));
    if (!day || day.status === "no-data") break;
    if (day.status === "weekend" || day.status === "holiday") continue;
    days.push(day);
  }
  return days;
}

function recentRow(day) {
  const tr = el("tr");
  const inCell = el("td", "", day.checkIn ? `${day.checkIn}${day.mode === "wfh" ? " (WFH)" : ""}` : "–");
  let outText = day.checkOut ?? "–";
  if (day.incomplete) outText = "Not recorded";
  const hours = el("td", "table__num", day.minutesWorked === null ? "–" : hoursText(day.minutesWorked));
  const status = el("td");
  status.append(dayBadge(day));
  if (day.regularized) status.append(" ", el("span", "badge badge--success badge--square", "Regularized"));
  tr.append(el("td", "", shortDate(day.date)), inCell, el("td", "", outText), hours, status);
  return tr;
}

function renderRecent(today) {
  const days = recentDays(today);
  if (days.length) {
    recentBody.replaceChildren(...days.map(recentRow));
    return;
  }
  const td = el("td", "text-muted", "No attendance recorded yet.");
  td.colSpan = 5;
  const tr = el("tr");
  tr.append(td);
  recentBody.replaceChildren(tr);
}

// ---------- everything ----------

function render() {
  const today = todayIso();
  const user = getUser(userId);
  const day = dayFor(userId, today);
  subtitle.textContent = longDate(today);
  renderClock();
  renderRule(day);
  renderStatus(day, user);
  renderStats(day);
  renderShift(today);
  renderRecent(today);
}

function punch(action, doneText) {
  showError("");
  const result = action();
  if (result.ok) showToast(doneText, "success");
  else showError(result.error);   // shown with textContent, so the store's wording is safe here
  render();
}

// Redraw at the start of every minute: the clock, hours so far, the end of
// the shift, and a new day after midnight.
function startTicking() {
  const now = new Date();
  const untilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
  setTimeout(() => {
    render();
    setInterval(render, 60 * 1000);
  }, untilNextMinute);
}

if (userId && statusBadge && inBtn && outBtn && recentBody) {
  modeInputs.forEach((input) => input.addEventListener("change", () => { modeTouched = true; }));
  inBtn.addEventListener("click", () => punch(() => checkIn(userId, selectedMode()), "Checked in."));
  outBtn.addEventListener("click", () => punch(() => checkOut(userId), "Checked out."));
  render();
  startTicking();
}