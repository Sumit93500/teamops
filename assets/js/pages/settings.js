// pages/settings.js
// Runs on settings.html. Scrolls to a section when its sidebar link is clicked,
// and saves the Appearance card's theme.

import { applyTheme, savedTheme, onAppearanceChange } from "../ui/theme.js";
import { showToast } from "../ui/toast.js";

document.querySelectorAll(".settings__nav .settings__link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const id = link.getAttribute("href")?.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ behavior: "smooth" });

    document.querySelectorAll(".settings__nav .settings__link").forEach((l) => l.classList.remove("is-active"));
    link.classList.add("is-active");
  });
});

// Appearance: this device's theme, the same setting as the topbar's menu.
const themeRadios = document.querySelectorAll('input[name="theme"]');
const showSavedTheme = () => themeRadios.forEach((radio) => { radio.checked = radio.value === (savedTheme() ?? "light"); });
showSavedTheme();
onAppearanceChange(showSavedTheme);

document.getElementById("save-appearance")?.addEventListener("click", () => {
  const chosen = document.querySelector('input[name="theme"]:checked')?.value;
  if (!chosen) return;
  applyTheme(chosen);
  showToast("Appearance saved.", "success");
});