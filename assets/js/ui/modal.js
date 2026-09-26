// ui/modal.js
// Opens and closes .modal dialogs by id.

export function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("is-open");
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("is-open");
}

export function initModals(root = document) {
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