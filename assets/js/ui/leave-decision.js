// ui/leave-decision.js
// Approve and Reject for requests that need a decision, shared by the approval
// pages so they behave the same. Approve asks with confirm(); Reject opens a
// small modal (the same markup pattern as the department modal) that needs a
// note. Both go through the kind's decide function as the signed-in person,
// then call back so the page can re-render. Whatever the outcome, the
// sidebar's Approvals count is brought up to date first (what waits may have
// changed, here or elsewhere).
//
// createDecisionFlow() builds that pair for one kind of request. Both kinds
// are built once, here: the leave pair (approveLeave, openRejectModal) for
// leave-approvals.html, approvals-inbox.html and the HR dashboard, and the
// correction pair (approveCorrection, openRejectCorrectionModal) for
// regularization.html, approvals-inbox.html and the HR dashboard.
// decisionButtons() draws the Reject + Approve buttons those pages show.
//
// Toasts use fixed text only: toast.js uses innerHTML, so names and notes are
// never put in them.

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { decideLeave } from "../data/leave-store.js";
import { decideRegularization } from "../data/attendance-store.js";
import { openModal, closeModal } from "./modal.js";
import { showToast } from "./toast.js";
import { el, escapeHtml, requestTitle, formatDay, nameOf } from "./leave-view.js";
import { issueLabel } from "./attendance-view.js";
import { refreshWaitingCount } from "./sidebar.js";

const decider = () => ({ id: getCurrentUserId(), role: getCurrentRole()?.key });

function closeIcon() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M6 6l12 12M18 6 6 18");
  svg.append(path);
  return svg;
}

// options:
//   decide(requestId, deciderUserId, deciderRole, "approve" | "reject", note) -> { ok, error, field }
//   describe(request)   one line naming the request, for confirm() and the modal (never a toast)
//   modalId, noteId     ids for the reject modal and its note, unique on the page
//   labels: { title, approved, rejected }        modal title and the success toasts; approved
//                                                may instead be a function of the decide
//                                                result returning fixed text (a request
//                                                with more than one approval stage)
//           { approveFailed, rejectFailed }      optional fixed failure toasts; left out,
//                                                the store's error is shown, escaped
//           { submit }                           optional text for the modal's button
//                                                (default "Reject request")
export function createDecisionFlow({ decide, describe, modalId, noteId, labels }) {
  let modal = null;
  let current = null;   // { request, onDone } while the modal is open

  const failure = (fixed, result) => fixed ?? escapeHtml(result.error);
  const approvedText = (result) => (typeof labels.approved === "function" ? labels.approved(result) : labels.approved);

  // ---------- approve ----------

  function approve(request, onDone) {
    if (!window.confirm(`Approve this request?\n${describe(request)}`)) return;
    const { id, role } = decider();
    const result = decide(request.id, id, role, "approve");
    if (result.ok) showToast(approvedText(result), "success");
    else showToast(failure(labels.approveFailed, result), "danger");
    refreshWaitingCount();
    onDone?.(result);
  }

  // ---------- reject (modal) ----------

  // Built once per page, with the same classes as #dept-modal on departments.html.
  function buildModal() {
    const root = el("div", "modal");
    root.id = modalId;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", `${modalId}-title`);

    const dialog = el("div", "modal__dialog modal__dialog--sm");
    const header = el("div", "modal__header");
    const heading = el("div");
    const title = el("h3", "modal__title", labels.title);
    title.id = `${modalId}-title`;
    heading.append(title, el("p", "modal__desc"));
    const close = el("button", "modal__close");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.append(closeIcon());
    header.append(heading, close);

    // novalidate: an empty note is refused by the decide function and shown
    // inline, the same way as every other error.
    const form = el("form");
    form.noValidate = true;
    const body = el("div", "modal__body");
    const wrap = el("div", "form");
    const field = el("div", "form-field");
    const label = el("label", "form-label form-label--required", "Reason");
    label.htmlFor = noteId;
    const note = el("textarea", "textarea");
    note.id = noteId;
    note.required = true;
    note.placeholder = "The employee sees this note";
    field.append(label, note);
    wrap.append(field);
    body.append(wrap);

    const footer = el("div", "modal__footer");
    const cancel = el("button", "btn", "Cancel");
    cancel.type = "button";
    cancel.dataset.modalClose = "";
    const submit = el("button", "btn btn--danger", labels.submit ?? "Reject request");
    submit.type = "submit";
    footer.append(cancel, submit);
    form.append(body, footer);
    dialog.append(header, form);
    root.append(dialog);
    document.body.append(root);

    // Same closing rules as ui/modal.js: the ✕, Cancel, or a click on the backdrop.
    const hide = () => { closeModal(modalId); current = null; };
    close.addEventListener("click", hide);
    cancel.addEventListener("click", hide);
    root.addEventListener("click", (e) => { if (e.target === root) hide(); });
    note.addEventListener("input", clearError);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitReject();
    });
    return root;
  }

  function clearError() {
    modal?.querySelector(".form-error")?.remove();
    modal?.querySelector(`#${noteId}`)?.removeAttribute("aria-describedby");
  }

  function showError(message) {
    clearError();
    const note = modal.querySelector(`#${noteId}`);
    const error = el("span", "form-error", message);
    error.id = `${noteId}-error`;
    note.closest(".form-field").append(error);
    note.setAttribute("aria-describedby", error.id);
    note.focus();
  }

  function submitReject() {
    if (!current) return;
    const { request, onDone } = current;
    const { id, role } = decider();
    const result = decide(request.id, id, role, "reject", modal.querySelector(`#${noteId}`).value);
    if (!result.ok) {
      if (result.field === "note") {
        showError(result.error);
        return;
      }
      closeModal(modalId);
      current = null;
      showToast(failure(labels.rejectFailed, result), "danger");
      refreshWaitingCount();
      onDone?.(result);
      return;
    }
    closeModal(modalId);
    current = null;
    showToast(labels.rejected, "success");
    refreshWaitingCount();
    onDone?.(result);
  }

  function openReject(request, onDone) {
    // A page swap (or a test) can leave an old modal behind in another document.
    if (!modal || !document.body.contains(modal)) modal = buildModal();
    current = { request, onDone };
    modal.querySelector("form").reset();
    clearError();
    modal.querySelector(".modal__desc").textContent = describe(request);
    openModal(modalId);
    modal.querySelector(`#${noteId}`).focus();
  }

  return { approve, openReject };
}

// ---------- buttons ----------

// Reject + Approve for one pending request; permission goes on both as
// data-permission, so the page's applyPermissions() can hide them. null means
// no permission gate: a decision that goes by relationship (an expense
// claim's manager stage), where the store's pendingFor() already decided who
// gets the buttons.
export function decisionButtons(permission, onReject, onApprove) {
  const group = el("div", "btn-group");
  const reject = el("button", "btn btn--sm", "Reject");
  reject.type = "button";
  if (permission) reject.dataset.permission = permission;
  reject.addEventListener("click", onReject);
  const approve = el("button", "btn btn--primary btn--sm", "Approve");
  approve.type = "button";
  if (permission) approve.dataset.permission = permission;
  approve.addEventListener("click", onApprove);
  group.append(reject, approve);
  return group;
}

// ---------- leave ----------

const leaveFlow = createDecisionFlow({
  decide: decideLeave,
  describe: (request) => `${nameOf(request.userId)}: ${requestTitle(request)}`,
  modalId: "reject-leave-modal",
  noteId: "reject-note",
  labels: { title: "Reject leave request", approved: "Leave request approved.", rejected: "Leave request rejected." },
});

export const approveLeave = leaveFlow.approve;
export const openRejectModal = leaveFlow.openReject;

// ---------- attendance corrections ----------

export const correctionFlow = createDecisionFlow({
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

export const approveCorrection = correctionFlow.approve;
export const openRejectCorrectionModal = correctionFlow.openReject;