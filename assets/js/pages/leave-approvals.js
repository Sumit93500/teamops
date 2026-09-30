// pages/leave-approvals.js
// Runs on leave-approvals.html (needs leave:approve). Pending / Approved /
// Rejected tabs from the leave store, with search, type filter and pagination;
// Approve and Reject go through ui/leave-decision.js. Also the stat strip,
// "Out next week" and the team-overlap alert, all from real data. A session
// without an employee id (an old sign-in) leaves the static page as it is.

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { applyPermissions, can } from "../core/rbac.js";
import { getUser } from "../data/store.js";
import { LEAVE_POLICY, allRequests, pendingFor, overlaps } from "../data/leave-store.js";
import { dayNumber, isoFromDayNumber } from "../data/holidays.js";
import { renderPagination } from "../ui/pagination.js";
import { approveLeave, openRejectModal, decisionButtons } from "../ui/leave-decision.js";
import {
  el, todayIso, formatDay, formatRange, requestDates, typeLabel, statusBadge,
  initials, avatarClass, departmentName, decisionOf, localDateOf, nameOf, oldestPendingNote,
} from "../ui/leave-view.js";
import { setStatValue, setOptionalStatNote } from "../ui/stats.js";

const PAGE_SIZE = 10;
const PILL_TAB = { "Pending": "pending", "Approved": "approved", "Rejected": "rejected" };
const DAY_MS = 24 * 60 * 60 * 1000;

const userId = getCurrentUserId();
const role = getCurrentRole()?.key;
const user = getUser(userId);

const pills = Array.from(document.querySelectorAll(".table__toolbar .tabs__tab"));
const searchInput = document.querySelector(".table__toolbar .input--search");
const typeSelect = document.querySelector('.table__toolbar select[aria-label="Filter by leave type"]');
const table = document.querySelector("table[data-export-name]");
const tbody = table?.querySelector("tbody");
const actionsHead = table?.querySelector("thead th.table__actions");
const paginationEl = document.querySelector(".pagination");
const statStrip = document.querySelector(".stat-strip");
const outCard = document.getElementById("out-next-week");
const overlapAlert = document.getElementById("overlap-alert");

let tab = "pending";
let search = "";
let typeFilter = "";
let currentPage = 1;

// ---------- data ----------

const decidedAt = (r) => decisionOf(r)?.at ?? "";

// Pending: oldest sent first, like a queue. Decided: most recent decision first.
function tabRequests(which) {
  if (which === "pending") {
    return pendingFor(userId, role).sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id));
  }
  return allRequests().filter((r) => r.status === which).sort((a, b) => decidedAt(b).localeCompare(decidedAt(a)));
}

function matches(request) {
  const query = search.trim().toLowerCase();
  return (!typeFilter || request.type === typeFilter)
    && (!query || nameOf(request.userId).toLowerCase().includes(query));
}

// ---------- table ----------

function stageBadge(request) {
  if (request.status !== "pending") return statusBadge(request.status);
  return request.stage === "manager"
    ? el("span", "badge badge--warning badge--dot", "With manager")
    : el("span", "badge badge--info badge--dot", "With HR");
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

function row(request) {
  const tr = el("tr");
  const stage = el("td");
  stage.append(stageBadge(request));

  // Always present so every row has as many cells as the header (the CSV
  // export relies on that); hidden outside the Pending tab.
  const actions = el("td", "table__actions");
  actions.hidden = tab !== "pending";
  if (tab === "pending") {
    actions.append(decisionButtons("leave:approve", () => openRejectModal(request, render), () => approveLeave(request, render)));
  }

  tr.append(
    personCell(request),
    el("td", "", typeLabel(request.type)),
    el("td", "", requestDates(request)),
    el("td", "table__num", String(request.days)),
    el("td", "", formatDay(request.appliedOn)),
    stage,
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
    const td = el("td", "text-muted", tab === "pending" && !search && !typeFilter ? "Nothing is waiting for a decision." : "No requests match these filters.");
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

// ---------- stat strip ----------

// Sets a stat's number and the line under it; an empty note removes the line.
function setStat(label, value, note) {
  const stat = Array.from(statStrip?.querySelectorAll(".stat") ?? [])
    .find((s) => s.querySelector(".stat__label")?.textContent.trim() === label);
  if (!stat) return;
  setStatValue(stat, value);
  setOptionalStatNote(stat, note);
}

function renderStats() {
  const today = todayIso();
  const pending = tabRequests("pending");
  setStat("Pending", String(pending.length), oldestPendingNote(pending, today));

  const decided = allRequests().filter((r) => r.status === "approved" || r.status === "rejected");
  const thisMonth = (r) => decisionOf(r) && localDateOf(decisionOf(r).at).slice(0, 7) === today.slice(0, 7);
  setStat("Approved this month", String(decided.filter((r) => r.status === "approved" && thisMonth(r)).length), "");
  setStat("Rejected this month", String(decided.filter((r) => r.status === "rejected" && thisMonth(r)).length), "");

  // Sent -> decided, from the history timestamps. Auto-approved Admin requests
  // took no decision, so they'd only pull the average down.
  const times = decided
    .filter((r) => decisionOf(r)?.decision !== "auto-approved")
    .map((r) => (Date.parse(decisionOf(r).at) - Date.parse(r.history[0].at)) / DAY_MS);
  const average = times.length ? `${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)} days` : "—";
  setStat("Average decision time", average, "");
}

// ---------- side cards ----------

function renderOutNextWeek() {
  if (!outCard) return;
  const start = todayIso();
  const end = isoFromDayNumber(dayNumber(start) + 6);
  const meta = outCard.querySelector(".card__meta");
  if (meta) meta.textContent = formatRange(start, end);
  const list = outCard.querySelector(".list");
  const out = allRequests()
    .filter((r) => (r.status === "pending" || r.status === "approved") && r.from <= end && r.to >= start)
    .sort((a, b) => a.from.localeCompare(b.from) || nameOf(a.userId).localeCompare(nameOf(b.userId)));
  if (!out.length) {
    const item = el("div", "list__item");
    item.append(el("span", "list__sub", "Nobody is off in the next 7 days."));
    list.replaceChildren(item);
    return;
  }
  list.replaceChildren(...out.map((r) => {
    const person = getUser(r.userId);
    const item = el("div", "list__item");
    const content = el("div", "list__content");
    content.append(el("span", "list__title", person?.name ?? r.userId), el("span", "list__sub", `${requestDates(r)}, ${departmentName(person?.department)}`));
    const badge = r.status === "approved" ? el("span", "badge badge--success", "Approved") : el("span", "badge badge--warning", "Pending");
    item.append(el("div", avatarClass(r.userId), initials(person?.name)), content, badge);
    return item;
  }));
}

// The first pending request (in queue order) whose dates clash with others in
// the same department.
function renderOverlapAlert() {
  if (!overlapAlert) return;
  for (const request of tabRequests("pending")) {
    const clashes = overlaps(request.id);
    if (!clashes.length) continue;
    const people = new Set(clashes.map((r) => r.userId)).size;
    const person = getUser(request.userId);
    overlapAlert.textContent = `${person?.name ?? request.userId}'s dates overlap with ${people} other ${people === 1 ? "person" : "people"} `
      + `from ${departmentName(person?.department)}. Check team cover before approving.`;
    overlapAlert.hidden = false;
    return;
  }
  overlapAlert.hidden = true;
}

// ---------- start ----------

function pillTab(pill) {
  const label = Array.from(pill.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim();
  return PILL_TAB[label] ?? "pending";
}

function render() {
  renderCounts();
  renderTable();
  renderStats();
  renderOutNextWeek();
  renderOverlapAlert();
}

// can() matters because guard.js only redirects; this script would still run.
if (user && can("leave:approve") && tbody && paginationEl) {
  if (typeSelect) {
    const all = el("option", "", "All types");
    all.value = "";
    typeSelect.replaceChildren(all, ...Object.keys(LEAVE_POLICY).map((type) => {
      const option = el("option", "", typeLabel(type));
      option.value = type;
      return option;
    }));
    typeSelect.addEventListener("change", () => {
      typeFilter = typeSelect.value;
      currentPage = 1;
      renderTable();
    });
  }
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