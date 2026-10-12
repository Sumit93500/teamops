// pages/change-password.js
// Runs on change-password.html. Checks that the new password was typed the
// same twice, then says plainly that nothing was changed: there are no
// passwords in OfficeOS yet (sign-in is picking a demo role), so there's
// nothing to update (round 11B; it used to say "Password updated.").

import { showToast } from "../ui/toast.js";

const form = document.querySelector("form");

function clearError() {
  form.querySelector(".form-error")?.remove();
}

function showError(field, message) {
  clearError();
  const error = document.createElement("span");
  error.className = "form-error";
  error.id = `${field.id}-error`;
  error.textContent = message;
  field.closest(".form-field").appendChild(error);
  field.setAttribute("aria-describedby", error.id);
  field.focus();
}

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const current = form.elements.current.value;
    const newPassword = form.elements.new.value;
    const confirm = form.elements.confirm.value;

    if (newPassword !== confirm) {
      showError(form.elements.confirm, "Passwords don't match.");
      return;
    }

    clearError();
    showToast("Passwords aren't part of OfficeOS yet: nothing was changed.", "info");
  });

  form.elements.confirm.addEventListener("input", clearError);
}
