// pages/two-factor.js
// Runs on two-factor.html. Checks that all six code boxes are filled, then
// signs in and redirects. UI only: the code itself is not verified.

import { signIn } from "../core/auth.js";
import { redirectToLanding } from "../core/guard.js";
import { showToast } from "../ui/toast.js";

const form = document.querySelector("form");
const inputs = Array.from(document.querySelectorAll(".otp__input"));

function clearError() {
  form.querySelector(".form-error")?.remove();
}

function showError(group, message) {
  clearError();
  const error = document.createElement("span");
  error.className = "form-error";
  error.id = "otp-error";
  error.textContent = message;
  group.closest(".form-field").appendChild(error);
  group.setAttribute("aria-describedby", error.id);
}

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const firstEmpty = inputs.find((input) => !input.value.trim());

    if (firstEmpty) {
      showError(firstEmpty.closest(".otp"), "Enter all 6 digits of the code.");
      firstEmpty.focus();
      return;
    }

    clearError();
    showToast("Verified.", "success");
    setTimeout(() => {
      signIn("admin", "Aarav Mehta", "EMP-1001");
      redirectToLanding();
    }, 1200);
  });

  inputs.forEach((input) => input.addEventListener("input", clearError));
}
