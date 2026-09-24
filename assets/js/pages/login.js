// pages/login.js
// Runs only on login.html. Signs in with the picked role and redirects.

import { signIn } from "../core/auth.js";
import { redirectToLanding } from "../core/guard.js";
import { ROLES } from "../config/roles.js";

const DEMO_USERS = {
  admin: "Aarav Mehta",
  hr: "Priya Nair",
  fin: "Kabir Shah",
  emp: "Arjun Kapoor",
};

document.querySelectorAll("[data-demo-role]").forEach((button) => {
  button.addEventListener("click", (e) => {
    e.preventDefault();
    const roleKey = button.dataset.demoRole;
    if (!ROLES[roleKey]) return;
    signIn(roleKey, DEMO_USERS[roleKey]);
    redirectToLanding();
  });
});

const loginForm = document.querySelector(".auth__panel form");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    signIn("admin", DEMO_USERS.admin);
    redirectToLanding();
  });
}