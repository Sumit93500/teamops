// ui/dropdown.js
// Opens and closes .dropdown menus, and closes them when you click elsewhere or press Esc.

const triggerOf = (dropdown) => dropdown.querySelector("button, [role='button']");

export function initDropdowns(root = document) {
  root.querySelectorAll(".dropdown").forEach((dropdown) => {
    const trigger = triggerOf(dropdown);
    if (!trigger) return;

    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains("is-open");
      closeAllDropdowns();
      if (!isOpen) {
        dropdown.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });
  });

  document.addEventListener("click", closeAllDropdowns);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const open = document.querySelector(".dropdown.is-open");
    if (!open) return;
    closeAllDropdowns();
    triggerOf(open)?.focus();
  });
}

function closeAllDropdowns() {
  document.querySelectorAll(".dropdown.is-open").forEach((d) => {
    d.classList.remove("is-open");
    triggerOf(d)?.setAttribute("aria-expanded", "false");
  });
}