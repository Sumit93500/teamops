// pages/my-requests.js
// Runs on my-requests.html. The signed-in person's leave requests come from
// the leave store, their attendance corrections from the attendance store,
// their expense claims from the expense store and their asset requests from
// the asset-request store, all with a working Cancel while pending (an asset
// request also while approved, until an asset is handed over). The tabs, type
// filter and side stepper cover all of them. A session without an employee
// id (an old sign-in) leaves the static page as it is.

import { getCurrentUserId } from "../core/auth.js";
import { applyPermissions } from "../core/rbac.js";
import { getUser } from "../data/store.js";
import { requestsFor, cancelLeave, currentApproverName } from "../data/leave-store.js";
import { regularizationsFor, cancelRegularization } from "../data/attendance-store.js";
import { expensesFor, cancelExpense, waitingOn } from "../data/expenses-store.js";
import { assetRequestsFor, cancelAssetRequest, waitingOn as assetWaitingOn } from "../data/asset-requests-store.js";
import { categoryLabel, stageBadge, expenseSteps } from "../ui/expense-view.js";
import { requestTitle as assetTitle, statusBadgeOf, endNote, assetRequestSteps } from "../ui/asset-request-view.js";
import { rupees } from "../ui/money.js";
import { showToast } from "../ui/toast.js";
import {
  el, escapeHtml, formatDay, requestDates, requestTitle, typeLabel, statusBadge,
  rejectionNote, newestPending, pendingSteps,
} from "../ui/leave-view.js";

const PILL_STATUS = { "All": "all", "Pending": "pending", "Approved": "approved", "Rejected": "rejected" };
const TYPE_FILTER = { "All types": "", "Leave": "leave", "Asset": "asset", "Attendance": "attendance", "Expense": "expense" };

const user = getUser(getCurrentUserId());

const tbody = document.querySelector(".table tbody");
const pills = Array.from(document.querySelectorAll(".table__toolbar .tabs__tab"));
const typeSelect = document.querySelector('.table__toolbar select[aria-label="Filter by type"]');
const footerMeta = document.querySelector(".card__footer .card__meta");
const progressCard = document.getElementById("request-progress");

let statusFilter = "all";
let typeFilter = "";

// ---------- leave rows ----------

// Who it's with: the current approver while pending, then whoever decided.
function withText(request) {
  if (request.status === "pending") return currentApproverName(request);
  if (request.status === "cancelled") return "—";
  const decision = [...request.history].reverse().find((h) => ["approved", "rejected", "auto-approved"].includes(h.decision));
  if (decision?.decision === "auto-approved") return "Auto-approved";
  return getUser(decision?.byUserId)?.name ?? "HR";
}

function cancelRequest(request) {
  if (!window.confirm(`Cancel your ${typeLabel(request.type).toLowerCase()} request for ${requestDates(request)}?`)) return;
  const result = cancelLeave(request.id, user.id);
  if (!result.ok) showToast(escapeHtml(result.error), "danger");
  else showToast("Leave request cancelled.", "success");
  render();
}

function leaveRow(request) {
  const tr = el("tr");
  const titleCell = el("td");
  titleCell.append(el("span", "table__user-name", requestTitle(request)));
  const typeCell = el("td");
  typeCell.append(el("span", "badge badge--square", "Leave"));
  const statusCell = el("td");
  statusCell.append(statusBadge(request.status));

  const actions = el("td", "table__actions");
  if (request.status === "pending") {
    const cancel = el("button", "btn btn--sm btn--danger", "Cancel");
    cancel.type = "button";
    cancel.dataset.permission = "requests:cancel";
    cancel.addEventListener("click", () => cancelRequest(request));
    actions.append(cancel);
  } else if (request.status === "rejected" && rejectionNote(request)) {
    actions.append(el("span", "text-sm text-muted", rejectionNote(request)));
  }

  tr.append(titleCell, typeCell, el("td", "", formatDay(request.appliedOn)), el("td", "", withText(request)), statusCell, actions);
  return tr;
}

// ---------- attendance correction rows ----------

const correctionTitle = (request) => `Regularization, ${formatDay(request.date)}`;

function cancelCorrection(request) {
  if (!window.confirm(`Cancel your correction request for ${formatDay(request.date)}?`)) return;
  const result = cancelRegularization(request.id, user.id);
  if (!result.ok) showToast("Couldn't cancel the request. It may already have been decided.", "danger");
  else showToast("Correction request cancelled.", "success");
  render();
}

function correctionRow(request) {
  const tr = el("tr");
  const titleCell = el("td");
  titleCell.append(el("span", "table__user-name", correctionTitle(request)));
  const typeCell = el("td");
  typeCell.append(el("span", "badge badge--square", "Attendance"));
  const statusCell = el("td");
  statusCell.append(statusBadge(request.status));

  const actions = el("td", "table__actions");
  if (request.status === "pending") {
    const cancel = el("button", "btn btn--sm btn--danger", "Cancel");
    cancel.type = "button";
    cancel.dataset.permission = "requests:cancel";
    cancel.addEventListener("click", () => cancelCorrection(request));
    actions.append(cancel);
  } else if (request.status === "rejected" && rejectionNote(request)) {
    actions.append(el("span", "text-sm text-muted", rejectionNote(request)));
  }

  tr.append(titleCell, typeCell, el("td", "", formatDay(request.appliedOn)), el("td", "", withText(request)), statusCell, actions);
  return tr;
}

// ---------- expense claim rows ----------

const expenseTitle = (claim) => `${categoryLabel(claim.category)}, ${rupees(claim.amount)}`;
const names = (ids) => ids.map((id) => getUser(id)?.name ?? id).join(", ");

// Who it's with: whoever may decide it now, whoever may pay it once approved,
// then whoever paid or rejected it.
function expenseWith(claim) {
  if (claim.status === "pending" || claim.status === "approved") {
    const ids = waitingOn(claim);
    if (!ids.length) return "Nobody yet";
    return claim.status === "approved" ? `Payment: ${names(ids)}` : names(ids);
  }
  const last = [...claim.history].reverse().find((h) => h.decision === "paid" || h.decision === "rejected");
  return last ? names([last.byUserId]) : "—";
}

function cancelClaim(claim) {
  if (!window.confirm(`Cancel your expense claim for ${expenseTitle(claim)}?`)) return;
  const result = cancelExpense(claim.id, user.id);
  if (!result.ok) showToast("Couldn't cancel the claim. It may already have been decided.", "danger");
  else showToast("Expense claim cancelled.", "success");
  render();
}

function expenseRow(claim) {
  const tr = el("tr");
  tr.dataset.claimId = claim.id;
  const titleCell = el("td");
  titleCell.append(el("span", "table__user-name", expenseTitle(claim)));
  const typeCell = el("td");
  typeCell.append(el("span", "badge badge--square", "Expense"));
  // A paid claim says so; every other status reads like the other requests.
  const statusCell = el("td");
  statusCell.append(claim.status === "paid" ? stageBadge(claim) : statusBadge(claim.status));

  const actions = el("td", "table__actions");
  if (claim.status === "pending") {
    const cancel = el("button", "btn btn--sm btn--danger", "Cancel");
    cancel.type = "button";
    cancel.dataset.permission = "requests:cancel";
    cancel.addEventListener("click", () => cancelClaim(claim));
    actions.append(cancel);
  } else if (claim.status === "rejected" && rejectionNote(claim)) {
    actions.append(el("span", "text-sm text-muted", rejectionNote(claim)));
  }

  tr.append(titleCell, typeCell, el("td", "", formatDay(claim.appliedOn)), el("td", "", expenseWith(claim)), statusCell, actions);
  return tr;
}

// ---------- asset request rows ----------

// Who it's with: whoever may decide it now, whoever may hand over an asset
// once approved, then whoever handed one over, rejected or closed it.
function assetWith(request) {
  if (request.status === "pending" || request.status === "approved") {
    const ids = assetWaitingOn(request);
    if (!ids.length) return "Nobody yet";
    return request.status === "approved" ? `Assign: ${names(ids)}` : names(ids);
  }
  const last = [...request.history].reverse().find((h) => ["fulfilled", "rejected", "closed"].includes(h.decision));
  return last ? names([last.byUserId]) : "—";
}

function cancelAsset(request) {
  if (!window.confirm(`Cancel your asset request (${assetTitle(request)})?`)) return;
  const result = cancelAssetRequest(request.id, user.id);
  if (!result.ok) showToast("Couldn't cancel the request. An asset may already have been handed over.", "danger");
  else showToast("Asset request cancelled.", "success");
  render();
}

function assetRow(request) {
  const tr = el("tr");
  tr.dataset.requestId = request.id;
  const titleCell = el("td");
  titleCell.append(el("span", "table__user-name", assetTitle(request)));
  const typeCell = el("td");
  typeCell.append(el("span", "badge badge--square", "Asset"));
  const statusCell = el("td");
  statusCell.append(statusBadgeOf(request));

  const actions = el("td", "table__actions");
  if (request.status === "pending" || request.status === "approved") {
    const cancel = el("button", "btn btn--sm btn--danger", "Cancel");
    cancel.type = "button";
    cancel.dataset.permission = "requests:cancel";
    cancel.addEventListener("click", () => cancelAsset(request));
    actions.append(cancel);
  } else if (endNote(request)) {
    actions.append(el("span", "text-sm text-muted", endNote(request)));
  }

  tr.append(titleCell, typeCell, el("td", "", formatDay(request.appliedOn)), el("td", "", assetWith(request)), statusCell, actions);
  return tr;
}

// ---------- rendering ----------

// The tabs an asset request counts under: fulfilled as approved (it was
// approved, then handed over); closed, like cancelled, only under All.
const ASSET_TAB = { fulfilled: "approved" };

function allRows() {
  const leave = requestsFor(user.id).map((r) => ({ node: leaveRow(r), type: "leave", status: r.status, sent: r.appliedOn, id: r.id }));
  const corrections = regularizationsFor(user.id).map((r) => ({ node: correctionRow(r), type: "attendance", status: r.status, sent: r.appliedOn, id: r.id }));
  // A paid claim counts as approved for the tabs (it was approved, then paid).
  const claims = expensesFor(user.id).map((c) => ({ node: expenseRow(c), type: "expense", status: c.status === "paid" ? "approved" : c.status, sent: c.appliedOn, id: c.id }));
  const assets = assetRequestsFor(user.id).map((r) => ({ node: assetRow(r), type: "asset", status: ASSET_TAB[r.status] ?? r.status, sent: r.appliedOn, id: r.id }));
  // Newest sent first; the id breaks ties between two sent the same day.
  return [...leave, ...corrections, ...claims, ...assets].sort((a, b) => b.sent.localeCompare(a.sent) || b.id.localeCompare(a.id));
}

function pillStatus(pill) {
  const label = Array.from(pill.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim();
  return PILL_STATUS[label] ?? "all";
}

// The newest pending request of any kind: leave, an attendance correction, an
// expense claim or an asset request (the last two's steps come from their own
// history: ui/expense-view.js, ui/asset-request-view.js).
function renderProgress() {
  const request = newestPending([...requestsFor(user.id), ...regularizationsFor(user.id), ...expensesFor(user.id), ...assetRequestsFor(user.id)]);
  progressCard.hidden = !request;
  if (!request) return;
  const isClaim = request.id.startsWith("EXP-");
  const isAsset = request.id.startsWith("ARQ-");
  progressCard.querySelector(".card__title").textContent = isClaim
    ? `Expense: ${expenseTitle(request)}`
    : isAsset ? `Asset: ${assetTitle(request)}`
    : request.issue ? correctionTitle(request) : `${typeLabel(request.type)}, ${requestDates(request)}`;
  const stepper = el("ol", "stepper stepper--vertical");
  stepper.append(...(isClaim ? expenseSteps(request) : isAsset ? assetRequestSteps(request) : pendingSteps(request)));
  progressCard.querySelector(".card__body").replaceChildren(stepper);
}

function render() {
  const rows = allRows();
  const counts = { all: rows.length };
  ["pending", "approved", "rejected"].forEach((s) => { counts[s] = rows.filter((r) => r.status === s).length; });
  pills.forEach((pill) => {
    const badge = pill.querySelector(".badge--count");
    if (badge) badge.textContent = String(counts[pillStatus(pill)] ?? 0);
  });

  const shown = rows.filter((r) => (statusFilter === "all" || r.status === statusFilter) && (!typeFilter || r.type === typeFilter));
  if (shown.length) {
    tbody.replaceChildren(...shown.map((r) => r.node));
  } else {
    const td = el("td", "text-muted", "No requests match these filters.");
    td.colSpan = 6;
    const tr = el("tr");
    tr.append(td);
    tbody.replaceChildren(tr);
  }
  applyPermissions(tbody);
  if (footerMeta) footerMeta.textContent = `Showing ${shown.length} of ${rows.length} requests`;
  renderProgress();
}

// ---------- start ----------

if (user && tbody && progressCard) {
  tbody.querySelectorAll("tr[data-sample]").forEach((tr) => tr.remove());   // replaced by the real leave, correction, expense and asset rows

  // ui/tabs.js already moves the is-active highlight between pills on click.
  pills.forEach((pill) => pill.addEventListener("click", () => {
    statusFilter = pillStatus(pill);
    render();
  }));

  if (typeSelect) {
    Array.from(typeSelect.options).forEach((o) => { o.value = TYPE_FILTER[o.textContent.trim()] ?? ""; });
    typeSelect.addEventListener("change", () => {
      typeFilter = typeSelect.value;
      render();
    });
  }

  render();
}