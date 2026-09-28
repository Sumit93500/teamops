// pages/approvals-inbox.js
// Runs on approvals-inbox.html (needs approvals:view). Real leave requests
// join the static sample rows (role change, purchase order, backup restore;
// marked data-static in the HTML, whose buttons stay not-implemented). Leave
// rows appear only for roles with leave:approve, and Approve / Reject use the
// same code as leave-approvals.html (ui/leave-decision.js). A session without
// an employee id (an old sign-in) leaves the static page as it is.

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { applyPermissions, can } from "../core/rbac.js";
import { getUser } from "../data/store.js";
import { allRequests, pendingFor } from "../data/leave-store.js";
import { dayNumber, isoFromDayNumber } from "../data/holidays.js";
import { approveLeave, openRejectModal } from "../ui/leave-decision.js";
import {
  el, todayIso, formatDay, formatDays, requestDates, typeLabel, statusBadge,
  initials, avatarClass, decisionOf, localDateOf,
} from "../ui/leave-view.js";

const PILL_TAB = { "Pending": "pending", "Approved": "approved", "Rejected": "rejected" };
const DAY_MS = 24 * 60 * 60 * 1000;

const userId = getCurrentUserId();
const role = getCurrentRole()?.key;
const user = getUser(userId);
const showLeave = can("leave:approve");

const inboxBody = document.querySelector("#inbox-table tbody");
const waitingHead = document.querySelector("#inbox-table thead th:nth-child(5)");
const decidedBody = document.querySelector("#decided-table tbody");
const pills = Array.from(document.querySelectorAll(".table__toolbar .tabs__tab"));
const typeSelect = document.querySelector('.table__toolbar select[aria-label="Filter by type"]');
const footerMeta = document.querySelector("#inbox-table")?.closest(".card")?.querySelector(".card__footer .card__meta");
const statStrip = document.querySelector(".stat-strip");

let tab = "pending";
let typeFilter = "";

// The static sample rows, read once from the HTML.
const readStatic = (body) => Array.from(body?.querySelectorAll("tr[data-static]") ?? []);
const staticPending = readStatic(inboxBody);
const staticDecided = readStatic(decidedBody);

// ---------- helpers ----------

const nameOf = (id) => getUser(id)?.name ?? id;
const leaveTitle = (r) => `Leave: ${nameOf(r.userId)}, ${requestDates(r)}`;
const decisionDate = (r) => localDateOf(decisionOf(r).at);
const weekStart = () => isoFromDayNumber(dayNumber(todayIso()) - 6);   // the last 7 days, today included

// "12 min", "3 hours", "1 day", "10 days" since it was sent.
function waitingSince(timestamp) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(timestamp)) / 60000));
  if (minutes < 60) return minutes <= 1 ? "Just now" : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}

const leavePending = () => (showLeave ? pendingFor(userId, role) : [])
  .sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id));
const leaveDecided = (status) => (showLeave ? allRequests().filter((r) => r.status === status) : [])
  .sort((a, b) => decisionOf(b).at.localeCompare(decisionOf(a).at));

// ---------- inbox rows ----------

function leaveRow(request) {
  const tr = el("tr");
  tr.dataset.type = "leave";
  const titleCell = el("td");
  const wrap = el("div", "table__user");
  wrap.append(el("div", avatarClass(request.userId), initials(nameOf(request.userId))), el("span", "table__user-name", leaveTitle(request)));
  titleCell.append(wrap);
  const typeCell = el("td");
  typeCell.append(el("span", "badge badge--square", "Leave"));

  const actions = el("td", "table__actions");
  if (request.status === "pending") {
    const group = el("div", "btn-group");
    const reject = el("button", "btn btn--sm", "Reject");
    reject.type = "button";
    reject.dataset.permission = "leave:approve";
    reject.addEventListener("click", () => openRejectModal(request, render));
    const approve = el("button", "btn btn--primary btn--sm", "Approve");
    approve.type = "button";
    approve.dataset.permission = "leave:approve";
    approve.addEventListener("click", () => approveLeave(request, render));
    group.append(reject, approve);
    actions.append(group);
  }

  tr.append(
    titleCell,
    typeCell,
    el("td", "", nameOf(request.userId)),
    el("td", "", `${typeLabel(request.type)}, ${formatDays(request.days)}`),
    el("td", "", request.status === "pending" ? waitingSince(request.history[0].at) : formatDay(decisionDate(request))),
    actions,
  );
  return tr;
}

// A static "Recently decided" row shown in the inbox's Approved/Rejected tab:
// same columns as the inbox, no details, the decision date in place of waiting.
function decidedClone(tr) {
  const cells = tr.children;
  const out = el("tr");
  out.dataset.type = tr.dataset.type;
  const title = el("td");
  title.append(cells[0].firstElementChild.cloneNode(true));
  const type = el("td");
  type.append(cells[1].firstElementChild.cloneNode(true));
  out.append(title, type, el("td", "", cells[2].textContent.trim()), el("td", "", "—"), el("td", "", cells[4].textContent.trim()), el("td", "table__actions"));
  return out;
}

function inboxRows(which) {
  if (which === "pending") return [...staticPending, ...leavePending().map(leaveRow)];
  return [...staticDecided.filter((tr) => tr.dataset.status === which).map(decidedClone), ...leaveDecided(which).map(leaveRow)];
}

// ---------- rendering ----------

function setStat(label, value) {
  const stat = Array.from(statStrip?.querySelectorAll(".stat") ?? [])
    .find((s) => s.querySelector(".stat__label")?.textContent.trim() === label);
  if (!stat) return;
  stat.querySelector(".stat__value").textContent = value;
  stat.querySelector(".stat__delta")?.remove();
}

function renderStats(pendingCount) {
  setStat("Waiting for you", String(pendingCount));
  if (!showLeave) {
    ["Approved this week", "Rejected this week", "Average response"].forEach((label) => setStat(label, "—"));
    return;
  }
  const since = weekStart();
  const decided = [...leaveDecided("approved"), ...leaveDecided("rejected")];
  setStat("Approved this week", String(decided.filter((r) => r.status === "approved" && decisionDate(r) >= since).length));
  setStat("Rejected this week", String(decided.filter((r) => r.status === "rejected" && decisionDate(r) >= since).length));
  const times = decided.filter((r) => decisionOf(r).decision !== "auto-approved")
    .map((r) => (Date.parse(decisionOf(r).at) - Date.parse(r.history[0].at)) / DAY_MS);
  setStat("Average response", times.length ? `${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)} days` : "—");
}

function renderRecentlyDecided() {
  const since = weekStart();
  const leave = [...leaveDecided("approved"), ...leaveDecided("rejected")]
    .filter((r) => decisionDate(r) >= since)
    .map((r) => {
      const tr = el("tr");
      tr.dataset.date = decisionDate(r);
      const title = el("td");
      title.append(el("span", "table__user-name", leaveTitle(r)));
      const type = el("td");
      type.append(el("span", "badge badge--square", "Leave"));
      const decision = el("td");
      decision.append(statusBadge(r.status));
      tr.append(title, type, el("td", "", nameOf(r.userId)), decision, el("td", "", formatDay(decisionDate(r))));
      return tr;
    });
  decidedBody.replaceChildren(...[...staticDecided, ...leave].sort((a, b) => (b.dataset.date ?? "").localeCompare(a.dataset.date ?? "")));
}

function render() {
  const counts = { pending: inboxRows("pending").length, approved: inboxRows("approved").length, rejected: inboxRows("rejected").length };
  pills.forEach((pill) => {
    const badge = pill.querySelector(".badge--count");
    if (badge) badge.textContent = String(counts[pillTab(pill)] ?? 0);
  });

  const all = inboxRows(tab);
  const shown = all.filter((tr) => !typeFilter || tr.dataset.type === typeFilter);
  if (shown.length) {
    inboxBody.replaceChildren(...shown);
  } else {
    const td = el("td", "text-muted", "Nothing here for these filters.");
    td.colSpan = 6;
    const tr = el("tr");
    tr.append(td);
    inboxBody.replaceChildren(tr);
  }
  if (waitingHead) waitingHead.textContent = tab === "pending" ? "Waiting" : "Decided";
  applyPermissions(inboxBody);
  if (footerMeta) footerMeta.textContent = `Showing ${shown.length} of ${all.length} ${tab} requests`;

  renderStats(counts.pending);
  renderRecentlyDecided();
}

function pillTab(pill) {
  const label = Array.from(pill.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim();
  return PILL_TAB[label] ?? "pending";
}

// ---------- start ----------

if (user && can("approvals:view") && inboxBody && decidedBody) {
  if (typeSelect) {
    Array.from(typeSelect.options).forEach((o) => { o.value = o.textContent.trim() === "All types" ? "" : o.textContent.trim().toLowerCase(); });
    typeSelect.addEventListener("change", () => {
      typeFilter = typeSelect.value;
      render();
    });
  }
  // ui/tabs.js already moves the is-active highlight between pills on click.
  pills.forEach((pill) => pill.addEventListener("click", () => {
    tab = pillTab(pill);
    render();
  }));
  render();
}