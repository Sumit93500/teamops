// ui/modal.js
// Opens and closes .modal dialogs by id. Round Forms: the one shared focus trap (Tab and Shift+Tab stay inside the dialog on top; focus goes
// into it when it opens, and back to what opened it when it closes, as before), and a guard on a dialog someone has typed or chosen in: its ✕,
// the backdrop and Esc ask before throwing that away (Cancel and a submit don't). The approval card (ui/approval-card.js) keeps its own trap
// and closing rules, so everything here leaves it alone.

// Where focus was when a dialog opened, to go back to when it closes.
const openedFrom = new Map();

// What Tab reaches inside a dialog, in document order; its fields; the dialog on top (the last open one, the approval card aside).
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const FIELDS = 'input:not([type="hidden"]), select, textarea';
const focusables = (modal) => Array.from(modal.querySelectorAll(FOCUSABLE)).filter((n) => !n.closest("[hidden]"));
const topModal = (root) => Array.from(root.querySelectorAll(".modal.is-open")).filter((m) => !m.classList.contains("approval-card")).at(-1) ?? null;
const DISCARD = "Discard what you've entered?";

export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  if (!modal.classList.contains("is-open")) {
    openedFrom.set(id, document.activeElement);
    delete modal.dataset.changed;   // nothing entered in it yet
  }
  modal.classList.add("is-open");
  // Focus into the dialog: its first field, else the first thing Tab reaches. A page may then focus the field it wants.
  if (!modal.contains(document.activeElement)) {
    const list = focusables(modal);
    (list.find((n) => n.matches(FIELDS)) ?? list[0])?.focus();
  }
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("is-open");
  delete modal.dataset.changed;
  openedFrom.get(id)?.focus?.();
  openedFrom.delete(id);
}

export function initModals(root = document) {
  // Tab and Shift+Tab stay inside the dialog on top: past the last control to the first, before the first to the last, and from outside it
  // back in. Nothing here while the approval card is open (it has its own trap).
  root.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || e.defaultPrevented || root.querySelector(".approval-card.is-open")) return;
    const modal = topModal(root);
    if (!modal) return;
    const list = focusables(modal);
    if (!list.length) { e.preventDefault(); return; }
    const first = list[0], last = list[list.length - 1], at = document.activeElement;
    if (e.shiftKey && (at === first || !modal.contains(at))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (at === last || !modal.contains(at))) { e.preventDefault(); first.focus(); }
  });

  // Something typed or chosen in an open dialog marks it changed (people's input only: no page sets a field by sending an event).
  const mark = (e) => {
    const modal = e.target.closest?.(".modal.is-open");
    if (modal && !modal.classList.contains("approval-card")) modal.dataset.changed = "true";
  };
  root.addEventListener("input", mark, true);
  root.addEventListener("change", mark, true);
  // Its ✕ or its backdrop (Esc presses the ✕) asks first; "no" stops the click before any of the dialog's own handlers, so it stays as it was.
  root.addEventListener("click", (e) => {
    const modal = e.target.closest?.(".modal.is-open");
    if (!modal || modal.dataset.changed !== "true" || modal.classList.contains("approval-card")) return;
    if (e.target !== modal && !e.target.closest(".modal__close")) return;
    if (window.confirm(DISCARD)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  // Esc presses the ✕, not closeModal: a page's own ✕ also clears up what it drew.
  root.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const open = root.querySelectorAll(".modal.is-open");
    const modal = open[open.length - 1];
    if (!modal) return;
    const close = modal.querySelector(".modal__close");
    if (close) close.click();
    else closeModal(modal.id);
  });

  root.querySelectorAll("[data-modal]").forEach((trigger) => {
    trigger.addEventListener("click", () => openModal(trigger.dataset.modal));
  });

  root.querySelectorAll(".modal").forEach((modal) => {
    // The header ✕ (.modal__close) plus any other control marked data-modal-close, e.g. a footer Cancel.
    modal.querySelectorAll(".modal__close, [data-modal-close]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(modal.id));
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal.id);
    });
  });
}