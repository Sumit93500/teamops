// ui/modal.js
// Opens and closes .modal dialogs by id.

// Where focus was when a dialog opened, to go back to when it closes.
const openedFrom = new Map();

export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  if (!modal.classList.contains("is-open")) openedFrom.set(id, document.activeElement);
  modal.classList.add("is-open");
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("is-open");
  openedFrom.get(id)?.focus?.();
  openedFrom.delete(id);
}

export function initModals(root = document) {
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