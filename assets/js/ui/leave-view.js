// ui/leave-view.js
// Display helpers shared by the leave pages (apply-leave, my-leave,
// my-requests): date and day formatting, status badges and the approval
// stepper. Everything is built with DOM calls, never innerHTML, so text that
// came from a form can't inject markup.

import { LEAVE_POLICY, currentApproverName } from "../data/leave-store.js";
import { dayNumber } from "../data/holidays.js";
import { getAllUsers, getAllDepartments } from "../data/store.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HALF = { "first-half": "first half", "second-half": "second half" };

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// For the few places that must go through toast.js, which uses innerHTML.
export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- dates ----------

const pad = (n) => String(n).padStart(2, "0");

// Today where the person is (local calendar), as ISO. Same rule as data/leave-store.js.
export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Read in UTC, like the data layer, so the time zone can't shift a date.
function parts(iso) {
  const n = dayNumber(iso);
  if (n === null) return null;
  const d = new Date(n * 24 * 60 * 60 * 1000);
  return { day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear(), weekday: d.getUTCDay() };
}

// "3 Oct", or "3 Oct 2026" with the year.
export function formatDay(iso, withYear = false) {
  const p = parts(iso);
  if (!p) return "";
  return `${p.day} ${MONTHS[p.month]}${withYear ? ` ${p.year}` : ""}`;
}

export const weekdayName = (iso) => WEEKDAYS[parts(iso)?.weekday] ?? "";
export const monthName = (month) => MONTH_NAMES[month - 1] ?? "";
export const monthShort = (iso) => MONTHS[parts(iso)?.month] ?? "";
export const dayOfMonth = (iso) => parts(iso)?.day ?? "";

// "3 Oct", "14 – 15 May", "30 Sep – 2 Oct", "28 Dec 2026 – 8 Jan 2027".
export function formatRange(from, to) {
  if (from === to) return formatDay(from);
  const a = parts(from);
  const b = parts(to);
  if (!a || !b) return "";
  if (a.year !== b.year) return `${formatDay(from, true)} – ${formatDay(to, true)}`;
  if (a.month === b.month) return `${a.day} – ${b.day} ${MONTHS[a.month]}`;
  return `${formatDay(from)} – ${formatDay(to)}`;
}

// ---------- requests ----------

export const formatDays = (n) => `${n} ${n === 1 || n === 0.5 ? "day" : "days"}`;
export const typeLabel = (type) => LEAVE_POLICY[type]?.label ?? type;

// "9 Oct, first half" for a half day, otherwise just the range.
export function requestDates(request) {
  const half = HALF[request.duration];
  return `${formatRange(request.from, request.to)}${half ? `, ${half}` : ""}`;
}

// "Casual leave, 3 Oct (1 day)"
export function requestTitle(request) {
  return `${typeLabel(request.type)}, ${requestDates(request)} (${formatDays(request.days)})`;
}

export const STATUS = {
  pending:   { label: "Pending",   badge: "badge badge--warning badge--dot" },
  approved:  { label: "Approved",  badge: "badge badge--success badge--dot" },
  rejected:  { label: "Rejected",  badge: "badge badge--danger badge--dot" },
  cancelled: { label: "Cancelled", badge: "badge badge--dot" },
};

export function statusBadge(status) {
  return el("span", STATUS[status]?.badge ?? "badge", STATUS[status]?.label ?? status);
}

// The note on the decision that rejected it, or "".
export function rejectionNote(request) {
  if (request.status !== "rejected") return "";
  return [...request.history].reverse().find((h) => h.decision === "rejected")?.note ?? "";
}

// Newest pending request (by date sent, then id), or null.
export function newestPending(requests) {
  return requests
    .filter((r) => r.status === "pending")
    .sort((a, b) => (b.appliedOn.localeCompare(a.appliedOn) || b.id.localeCompare(a.id)))[0] ?? null;
}

// Newest first: by start date, then id.
export const byNewest = (a, b) => b.from.localeCompare(a.from) || b.id.localeCompare(a.id);

// ---------- people and decisions (the approval pages) ----------

// Same as initialsFrom() in ui/topbar.js.
export function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

// avatar--1..4 from the person's place in the full list, as on users-list.
export function avatarClass(userId) {
  const index = getAllUsers().findIndex((u) => u.id === userId);
  return `avatar avatar--${(Math.max(index, 0) % 4) + 1}`;
}

export function departmentName(code) {
  return getAllDepartments().find((d) => d.code === code)?.name ?? code ?? "";
}

// The history entry that decided the request (approved, rejected or
// auto-approved), or null while it's pending or if it was cancelled.
export function decisionOf(request) {
  return [...request.history].reverse().find((h) => ["approved", "rejected", "auto-approved"].includes(h.decision)) ?? null;
}

// The local calendar date of a stored timestamp ("2026-09-28T04:30:00.000Z" -> "2026-09-28" in India).
export function localDateOf(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------- stepper ----------

function checkIcon() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "m5 12 5 5 9-10");
  svg.append(path);
  return svg;
}

// One step: state is "done", "current" or "" (not reached yet).
export function step(state, number, title, detail) {
  const li = el("li", `stepper__step${state ? ` is-${state}` : ""}`);
  const dot = el("span", "stepper__dot");
  if (state === "done") dot.append(checkIcon());
  else dot.textContent = String(number);
  const text = el("div", "stepper__text");
  text.append(el("strong", "", title), el("small", "text-muted", detail));
  li.append(dot, text);
  return li;
}

// The steps of a pending request, as on my-leave.html: sent, then who it is
// waiting on. A request with a manager shows the manager, then HR; one
// without goes straight to HR.
export function pendingSteps(request) {
  const sent = step("done", 1, "Sent", `${formatDay(request.appliedOn)} by you`);
  if (request.stage === "manager") {
    return [
      sent,
      step("current", 2, "First approval", `Waiting for ${currentApproverName(request)}`),
      step("", 3, "Final approval", "HR"),
    ];
  }
  return [sent, step("current", 2, "Approval", `Waiting for ${currentApproverName(request)}`)];
}