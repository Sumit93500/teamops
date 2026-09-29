// pages/approvals-inbox.js
// Runs on approvals-inbox.html (needs approvals:view). Real leave requests and
// attendance corrections join the static sample rows (role change, purchase
// order, backup restore; marked data-static in the HTML, whose buttons stay
// not-implemented). Leave rows appear only for roles with leave:approve and
// correction rows only for roles with attendance:approve; Approve / Reject use
// the same flow as leave-approvals.html and regularization.html
// (ui/leave-decision.js). A session without an employee id (an old sign-in)
// leaves the static page as it is.

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { applyPermissions, can } from "../core/rbac.js";
import { getUser } from "../data/store.js";
import { allRequests, pendingFor } from "../data/leave-store.js";
import { allRegularizations, pendingRegularizations, decideRegularization } from "../data/attendance-store.js";
import { dayNumber, isoFromDayNumber } from "../data/holidays.js";
import { approveLeave, openRejectModal, createDecisionFlow } from "../ui/leave-decision.js";
import {
  el, todayIso, formatDay, formatDays, requestDates, typeLabel, statusBadge,
  initials, avatarClass, decisionOf, localDateOf,
} from "../ui/leave-view.js";

const PILL_TAB = { "Pending": "pending", "Approved": "approved", "Rejected": "rejected" };
const ISSUE_LABEL = { "late-arrival": "Late arrival", "missed-check-in": "Missed check-in", "missed-check-out": "Missed check-out" };
const DAY_MS = 24 * 60 * 60 * 1000;

const userId = getCurrentUserId();
const role = getCurrentRole()?.key;
const user = getUser(userId);
const showLeave = can("leave:approve");
const showCorrections = can("attendance:approve");

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
const correctionTitle = (r) => `Regularization: ${nameOf(r.userId)}, ${formatDay(r.date)}`;
const issueLabel = (r) => ISSUE_LABEL[r.issue] ?? r.issue;
// "Late arrival, 10:12 to 09:30", or "Missed check-out, 18:00" when nothing was recorded.
const correctionDetails = (r) => `${issueLabel(r)}, ${r.recordedTime ? `${r.recordedTime} to ${r.time}` : r.time}`;
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
const correctionsPending = () => (showCorrections ? pendingRegularizations(userId, role) : [])
  .sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id, "en", { numeric: true }));
const correctionsDecided = (status) => (showCorrections ? allRegularizations().filter((r) => r.status === status) : [])
  .sort((a, b) => decisionOf(b).at.localeCompare(decisionOf(a).at));

const corrections = createDecisionFlow({
  decide: decideRegularization,
  describe: (r) => `${nameOf(r.userId)}: ${issueLabel(r)}, ${formatDay(r.date)}, corrected to ${r.time}`,
  modalId: "reject-correction-modal",
  noteId: "reject-correction-note",
  labels: {
    title: "Reject correction request",
    approved: "Correction approved. The attendance record is updated.",
    rejected: "Correction request rejected.",
    approveFailed: "Couldn't approve the request. It may already have been decided, or the attendance record has changed.",
    rejectFailed: "Couldn't reject the request. It may already have been decided.",
  },
});

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

function correctionRow(request) {
  const tr = el("tr");
  tr.dataset.type = "attendance";
  const titleCell = el("td");
  const wrap = el("div", "table__user");
  wrap.append(el("div", avatarClass(request.userId), initials(nameOf(request.userId))), el("span", "table__user-name", correctionTitle(request)));
  titleCell.append(wrap);
  const typeCell = el("td");
  typeCell.append(el("span", "badge badge--square", "Attendance"));

  const actions = el("td", "table__actions");
  if (request.status === "pending") {
    const group = el("div", "btn-group");
    const reject = el("button", "btn btn--sm", "Reject");
    reject.type = "button";
    reject.dataset.permission = "attendance:approve";
    reject.addEventListener("click", () => corrections.openReject(request, render));
    const approve = el("button", "btn btn--primary btn--sm", "Approve");
    approve.type = "button";
    approve.dataset.permission = "attendance:approve";
    approve.addEventListener("click", () => corrections.approve(request, render));
    group.append(reject, approve);
    actions.append(group);
  }

  tr.append(
    titleCell,
    typeCell,
    el("td", "", nameOf(request.userId)),
    el("td", "", correctionDetails(request)),
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

// Leave and corrections together: pending by date sent (oldest first), decided
// by decision (newest first). The sort is stable, so each kind keeps its own order.
function realRows(which) {
  const leave = which === "pending" ? leavePending() : leaveDecided(which);
  const fixes = which === "pending" ? correctionsPending() : correctionsDecided(which);
  const rows = [...leave.map((r) => ({ r, node: leaveRow(r) })), ...fixes.map((r) => ({ r, node: correctionRow(r) }))];
  if (which === "pending") rows.sort((a, b) => a.r.appliedOn.localeCompare(b.r.appliedOn));
  else rows.sort((a, b) => decisionOf(b.r).at.localeCompare(decisionOf(a.r).at));
  return rows.map((x) => x.node);
}

function inboxRows(which) {
  if (which === "pending") return [...staticPending, ...realRows("pending")];
  return [...staticDecided.filter((tr) => tr.dataset.status === which).map(decidedClone), ...realRows(which)];
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
  if (!showLeave && !showCorrections) {
    ["Approved this week", "Rejected this week", "Average response"].forEach((label) => setStat(label, "—"));
    return;
  }
  const since = weekStart();
  const decided = [...leaveDecided("approved"), ...leaveDecided("rejected"), ...correctionsDecided("approved"), ...correctionsDecided("rejected")];
  setStat("Approved this week", String(decided.filter((r) => r.status === "approved" && decisionDate(r) >= since).length));
  setStat("Rejected this week", String(decided.filter((r) => r.status === "rejected" && decisionDate(r) >= since).length));
  const times = decided.filter((r) => decisionOf(r).decision !== "auto-approved")
    .map((r) => (Date.parse(decisionOf(r).at) - Date.parse(r.history[0].at)) / DAY_MS);
  setStat("Average response", times.length ? `${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)} days` : "—");
}

function decidedRow(r, titleText, typeText) {
  const tr = el("tr");
  tr.dataset.date = decisionDate(r);
  const title = el("td");
  title.append(el("span", "table__user-name", titleText));
  const type = el("td");
  type.append(el("span", "badge badge--square", typeText));
  const decision = el("td");
  decision.append(statusBadge(r.status));
  tr.append(title, type, el("td", "", nameOf(r.userId)), decision, el("td", "", formatDay(decisionDate(r))));
  return tr;
}

function renderRecentlyDecided() {
  const since = weekStart();
  const recent = (r) => decisionDate(r) >= since;
  const leave = [...leaveDecided("approved"), ...leaveDecided("rejected")].filter(recent)
    .map((r) => decidedRow(r, leaveTitle(r), "Leave"));
  const fixes = [...correctionsDecided("approved"), ...correctionsDecided("rejected")].filter(recent)
    .map((r) => decidedRow(r, correctionTitle(r), "Attendance"));
  decidedBody.replaceChildren(...[...staticDecided, ...leave, ...fixes].sort((a, b) => (b.dataset.date ?? "").localeCompare(a.dataset.date ?? "")));
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