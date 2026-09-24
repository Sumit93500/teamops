// ui/otp.js
// Auto-advances focus between the six one-time-code boxes on two-factor.html.

export function initOtpInputs(root = document) {
  root.querySelectorAll(".otp").forEach((group) => {
    const inputs = Array.from(group.querySelectorAll(".otp__input"));

    inputs.forEach((input, index) => {
      input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(0, 1);
        if (input.value && inputs[index + 1]) {
          inputs[index + 1].focus();
        }
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && inputs[index - 1]) {
          inputs[index - 1].focus();
        }
      });
    });
  });
}