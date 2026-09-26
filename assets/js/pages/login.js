// pages/login.js
// Runs only on login.html. Signs in with the picked role and redirects.

import { signIn } from "../core/auth.js";
import { redirectToLanding } from "../core/guard.js";
import { ROLES } from "../config/roles.js";

const DEMO_USERS = {
  admin: { name: "Aarav Mehta",  id: "EMP-1001" },
  hr:    { name: "Priya Nair",   id: "EMP-1003" },
  fin:   { name: "Kabir Shah",   id: "EMP-1008" },
  emp:   { name: "Arjun Kapoor", id: "EMP-1105" },
};

document.querySelectorAll("[data-demo-role]").forEach((button) => {
  button.addEventListener("click", (e) => {
    e.preventDefault();
    const roleKey = button.dataset.demoRole;
    if (!ROLES[roleKey]) return;
    signIn(roleKey, DEMO_USERS[roleKey].name, DEMO_USERS[roleKey].id);
    redirectToLanding();
  });
});

const loginForm = document.querySelector(".auth__panel form");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    signIn("admin", DEMO_USERS.admin.name, DEMO_USERS.admin.id);
    redirectToLanding();
  });
}