// ui/dropdown.js
// Opens and closes .dropdown menus, and closes them when you click elsewhere.

export function initDropdowns(root = document) {
  root.querySelectorAll(".dropdown").forEach((dropdown) => {
    const trigger = dropdown.querySelector("button, [role='button']");
    if (!trigger) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains("is-open");
      closeAllDropdowns();
      if (!isOpen) dropdown.classList.add("is-open");
    });
  });

  document.addEventListener("click", closeAllDropdowns);
}

function closeAllDropdowns() {
  document.querySelectorAll(".dropdown.is-open").forEach((d) => d.classList.remove("is-open"));
}