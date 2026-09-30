// pages/regularization.js
// Runs on regularization.html (needs attendance:approve). Pending / Approved /
// Rejected tabs of attendance correction requests from the attendance store,
// with search and pagination. Pending holds what the signed-in person may
// decide (never their own request); cancelled requests appear in no tab.
// Approve and Reject go through the shared correction flow in
// ui/leave-decision.js, so they work like leave approvals. A session without
// an employee id (an old sign-in) leaves the static page as it is.

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { applyPermissions, can } from "../core/rbac.js";
import { getUser } from "../data/store.js";
import { allRegularizations, pendingRegularizations, dayFor } from "../data/attendance-store.js";
import { renderPagination } from "../ui/pagination.js";
import { approveCorrection, openRejectCorrectionModal, decisionButtons } from "../ui/leave-decision.js";
import { el, formatDay, statusBadge, initials, avatarClass, departmentName, decisionOf, nameOf } from "../ui/leave-view.js";

const PAGE_SIZE = 10;
const PILL_TAB = { "Pending": "pending", "Approved": "approved", "Rejected": "rejected" };
const ISSUE_LABEL = { "late-arrival": "Late arrival", "missed-check-in": "Missed check-in", "missed-check-out": "Missed check-out" };

const userId = getCurrentUserId();
const role = getCurrentRole()?.key;
const user = getUser(userId);

const pills = Array.from(document.querySelectorAll(".table__toolbar .tabs__tab"));
const searchInput = document.querySelector(".table__toolbar .input--search");
const table = document.querySelector("table[data-export-name]");
const tbody = table?.querySelector("tbody");
const actionsHead = table?.querySelector("thead th.table__actions");
const paginationEl = document.querySelector(".pagination");

let tab = "pending";
let search = "";
let currentPage = 1;

// ---------- data ----------

const decidedAt = (r) => decisionOf(r)?.at ?? "";
const byId = (a, b) => a.id.localeCompare(b.id, "en", { numeric: true });

// Pending: oldest sent first, like a queue. Decided: most recent decision first.
function tabRequests(which) {
  if (which === "pending") {
    return pendingRegularizations(userId, role).sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || byId(a, b));
  }
  return allRegularizations().filter((r) => r.status === which).sort((a, b) => decidedAt(b).localeCompare(decidedAt(a)) || byId(b, a));
}

function matches(request) {
  const query = search.trim().toLowerCase();
  return !query || nameOf(request.userId).toLowerCase().includes(query);
}

// The time the attendance record holds for what's being corrected. While
// pending that's read from the record now; once decided the record already
// holds the corrected time, so it's the time recorded when the request was sent.
function recordedTime(request) {
  if (request.status !== "pending") return request.recordedTime ?? null;
  const day = dayFor(request.userId, request.date);
  return (request.issue === "missed-check-out" ? day?.checkOut : day?.checkIn) ?? null;
}

// ---------- table ----------

function arrowIcon() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M5 12h14M13 6l6 6-6 6");
  svg.append(path);
  return svg;
}

function personCell(request) {
  const person = getUser(request.userId);
  const td = el("td");
  const wrap = el("div", "table__user");
  const text = el("div");
  text.append(el("span", "table__user-name", person?.name ?? request.userId), el("span", "table__user-sub", departmentName(person?.department)));
  wrap.append(el("div", avatarClass(request.userId), initials(person?.name)), text);
  td.append(wrap);
  return td;
}

function timesCell(request) {
  const td = el("td");
  const times = el("span", "reg-times");
  times.append(el("span", "reg-times__old", recordedTime(request) ?? "–"), arrowIcon(), el("strong", "", request.time));
  td.append(times);
  return td;
}

function row(request) {
  const tr = el("tr");
  const status = el("td");
  status.append(statusBadge(request.status));

  // Always present so every row has as many cells as the header (the CSV
  // export relies on that); hidden outside the Pending tab.
  const actions = el("td", "table__actions");
  actions.hidden = tab !== "pending";
  if (tab === "pending") {
    actions.append(decisionButtons("attendance:approve", () => openRejectCorrectionModal(request, render), () => approveCorrection(request, render)));
  }

  tr.append(
    personCell(request),
    el("td", "", formatDay(request.date)),
    el("td", "", ISSUE_LABEL[request.issue] ?? request.issue),
    timesCell(request),
    el("td", "reg-reason", request.reason),
    status,
    actions,
  );
  return tr;
}

function renderTable() {
  const rows = tabRequests(tab).filter(matches);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (pageRows.length) {
    tbody.replaceChildren(...pageRows.map(row));
  } else {
    const td = el("td", "text-muted", tab === "pending" && !search.trim() ? "Nothing is waiting for a decision." : "No requests match this search.");
    td.colSpan = 7;
    const tr = el("tr");
    tr.append(td);
    tbody.replaceChildren(tr);
  }
  if (actionsHead) actionsHead.hidden = tab !== "pending";
  applyPermissions(tbody);

  renderPagination(paginationEl, {
    totalItems: rows.length,
    pageSize: PAGE_SIZE,
    currentPage,
    onPageChange: (page) => {
      currentPage = page;
      renderTable();
    },
  });
}

function renderCounts() {
  const counts = { pending: tabRequests("pending").length, approved: tabRequests("approved").length, rejected: tabRequests("rejected").length };
  pills.forEach((pill) => {
    const badge = pill.querySelector(".badge--count");
    if (badge) badge.textContent = String(counts[pillTab(pill)] ?? 0);
  });
}

// ---------- start ----------

function pillTab(pill) {
  const label = Array.from(pill.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim();
  return PILL_TAB[label] ?? "pending";
}

function render() {
  renderCounts();
  renderTable();
}

// can() matters because guard.js only redirects; this script would still run.
if (user && can("attendance:approve") && tbody && paginationEl) {
  searchInput?.addEventListener("input", () => {
    search = searchInput.value;
    currentPage = 1;
    renderTable();
  });
  // ui/tabs.js already moves the is-active highlight between pills on click.
  pills.forEach((pill) => pill.addEventListener("click", () => {
    tab = pillTab(pill);
    currentPage = 1;
    renderTable();
  }));
  render();
}