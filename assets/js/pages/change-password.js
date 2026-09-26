// pages/change-password.js
// Runs on change-password.html. Checks that the new password was typed the
// same twice, then shows a success message. UI only: no password is changed.

import { showToast } from "../ui/toast.js";
import { resolvePageLink } from "../core/paths.js";

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
    showToast("Password updated.", "success");
    setTimeout(() => {
      window.location.href = resolvePageLink("account/my-profile.html");
    }, 1200);
  });

  form.elements.confirm.addEventListener("input", clearError);
}
