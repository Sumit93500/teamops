// pages/my-requests.js
// Runs on my-requests.html. The signed-in person's leave requests come from
// the leave store, with a working Cancel. The asset, attendance and expense
// rows are still static samples (marked data-static in the HTML) and are kept
// as they are. The tabs, type filter and side stepper cover both. A session
// without an employee id (an old sign-in) leaves the static page as it is.

import { getCurrentUserId } from "../core/auth.js";
import { applyPermissions } from "../core/rbac.js";
import { getUser } from "../data/store.js";
import { requestsFor, cancelLeave, currentApproverName } from "../data/leave-store.js";
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

// The static sample rows that stay, read once from the HTML.
const staticRows = Array.from(tbody?.querySelectorAll("tr[data-static]") ?? []).map((node) => ({
  node, type: node.dataset.type, status: node.dataset.status, sent: node.dataset.sent ?? "", id: "",
}));

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

// ---------- rendering ----------

function allRows() {
  const leave = requestsFor(user.id).map((r) => ({ node: leaveRow(r), type: "leave", status: r.status, sent: r.appliedOn, id: r.id }));
  // Newest sent first; the leave id breaks ties between two sent the same day.
  return [...leave, ...staticRows].sort((a, b) => b.sent.localeCompare(a.sent) || b.id.localeCompare(a.id));
}

function pillStatus(pill) {
  const label = Array.from(pill.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim();
  return PILL_STATUS[label] ?? "all";
}

function renderProgress() {
  const request = newestPending(requestsFor(user.id));
  progressCard.hidden = !request;
  if (!request) return;
  progressCard.querySelector(".card__title").textContent = `${typeLabel(request.type)}, ${requestDates(request)}`;
  const stepper = el("ol", "stepper stepper--vertical");
  stepper.append(...pendingSteps(request));
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
  tbody.querySelectorAll("tr[data-sample]").forEach((tr) => tr.remove());   // replaced by the real leave rows

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