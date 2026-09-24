// ui/password-toggle.js
// Toggles a password input between hidden and visible when its eye button is clicked.

export function initPasswordToggles(root = document) {
  root.querySelectorAll(".input-group__action").forEach((button) => {
    const input = button.closest(".input-group")?.querySelector("input");
    if (!input) return;

    button.addEventListener("click", () => {
      input.type = input.type === "password" ? "text" : "password";
    });
  });
}