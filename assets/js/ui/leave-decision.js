// ui/leave-decision.js
// Approve and Reject for leave requests, shared by leave-approvals.html and
// approvals-inbox.html so the two pages behave the same. Approve asks with
// confirm(); Reject opens a small modal (the same markup pattern as the
// department modal) that needs a note. Both go through decideLeave() as the
// signed-in person, then call back so the page can re-render.
//
// Toasts use fixed text only: toast.js uses innerHTML, so names and notes are
// never put in them.

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { getUser } from "../data/store.js";
import { decideLeave } from "../data/leave-store.js";
import { openModal, closeModal } from "./modal.js";
import { showToast } from "./toast.js";
import { el, escapeHtml, requestTitle } from "./leave-view.js";

const MODAL_ID = "reject-leave-modal";

let modal = null;
let current = null;   // { request, onDone } while the modal is open

const decider = () => ({ id: getCurrentUserId(), role: getCurrentRole()?.key });
const describe = (request) => `${getUser(request.userId)?.name ?? request.userId}: ${requestTitle(request)}`;

// ---------- approve ----------

export function approveLeave(request, onDone) {
  if (!window.confirm(`Approve this request?\n${describe(request)}`)) return;
  const { id, role } = decider();
  const result = decideLeave(request.id, id, role, "approve");
  if (result.ok) showToast("Leave request approved.", "success");
  else showToast(escapeHtml(result.error), "danger");
  onDone?.(result);
}

// ---------- reject (modal) ----------

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

// Built once per page, with the same classes as #dept-modal on departments.html.
function buildModal() {
  const root = el("div", "modal");
  root.id = MODAL_ID;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", `${MODAL_ID}-title`);

  const dialog = el("div", "modal__dialog modal__dialog--sm");
  const header = el("div", "modal__header");
  const heading = el("div");
  const title = el("h3", "modal__title", "Reject leave request");
  title.id = `${MODAL_ID}-title`;
  heading.append(title, el("p", "modal__desc"));
  const close = el("button", "modal__close");
  close.type = "button";
  close.setAttribute("aria-label", "Close");
  close.append(closeIcon());
  header.append(heading, close);

  // novalidate: an empty note is refused by decideLeave() and shown inline,
  // the same way as every other error.
  const form = el("form");
  form.noValidate = true;
  const body = el("div", "modal__body");
  const wrap = el("div", "form");
  const field = el("div", "form-field");
  const label = el("label", "form-label form-label--required", "Reason");
  label.htmlFor = "reject-note";
  const note = el("textarea", "textarea");
  note.id = "reject-note";
  note.required = true;
  note.placeholder = "The employee sees this note";
  field.append(label, note);
  wrap.append(field);
  body.append(wrap);

  const footer = el("div", "modal__footer");
  const cancel = el("button", "btn", "Cancel");
  cancel.type = "button";
  cancel.dataset.modalClose = "";
  const submit = el("button", "btn btn--danger", "Reject request");
  submit.type = "submit";
  footer.append(cancel, submit);
  form.append(body, footer);
  dialog.append(header, form);
  root.append(dialog);
  document.body.append(root);

  // Same closing rules as ui/modal.js: the ✕, Cancel, or a click on the backdrop.
  const hide = () => { closeModal(MODAL_ID); current = null; };
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
  modal?.querySelector("#reject-note")?.removeAttribute("aria-describedby");
}

function showError(message) {
  clearError();
  const note = modal.querySelector("#reject-note");
  const error = el("span", "form-error", message);
  error.id = "reject-note-error";
  note.closest(".form-field").append(error);
  note.setAttribute("aria-describedby", error.id);
  note.focus();
}

function submitReject() {
  if (!current) return;
  const { request, onDone } = current;
  const { id, role } = decider();
  const result = decideLeave(request.id, id, role, "reject", modal.querySelector("#reject-note").value);
  if (!result.ok) {
    if (result.field === "note") {
      showError(result.error);
      return;
    }
    closeModal(MODAL_ID);
    current = null;
    showToast(escapeHtml(result.error), "danger");
    onDone?.(result);
    return;
  }
  closeModal(MODAL_ID);
  current = null;
  showToast("Leave request rejected.", "success");
  onDone?.(result);
}

export function openRejectModal(request, onDone) {
  // A page swap (or a test) can leave an old modal behind in another document.
  if (!modal || !document.body.contains(modal)) modal = buildModal();
  current = { request, onDone };
  modal.querySelector("form").reset();
  clearError();
  modal.querySelector(".modal__desc").textContent = describe(request);
  openModal(MODAL_ID);
  modal.querySelector("#reject-note").focus();
}