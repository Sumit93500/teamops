// pages/user-form.js
// Runs on user-form.html. Fills in the default role when a designation is picked.

import { DESIGNATIONS } from "../data/users.js";
import { ROLES } from "../config/roles.js";

const designationSelect = document.getElementById("designation");
const defaultRoleInput = document.getElementById("default-role");

if (designationSelect && defaultRoleInput) {
  designationSelect.addEventListener("change", () => {
    const title = designationSelect.selectedOptions[0]?.textContent.trim();
    const match = DESIGNATIONS.find((d) => d.title === title);
    const role = match ? ROLES[match.defaultRole] : null;
    defaultRoleInput.value = role ? role.label : "";
  });
}