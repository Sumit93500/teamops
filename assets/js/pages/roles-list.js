// pages/roles-list.js
// Runs on roles-list.html. The four roles are the ones in config/roles.js (the
// rows in the HTML carry their keys); this fills in how many people hold each
// role, from the employee list, and how many of the app's permissions it has.
// Nothing is editable here: roles come from the app's configuration.

import { ROLES } from "../config/roles.js";
import { ALL_PERMISSIONS } from "../config/permissions.js";
import { getAllUsers } from "../data/store.js";

const rows = document.querySelectorAll(".table tbody tr[data-role]");

function renderRow(tr) {
  const role = ROLES[tr.dataset.role];
  if (!role) return;
  // Everyone with the role, inactive people included: they still hold it.
  const users = getAllUsers().filter((u) => u.role === role.key).length;
  tr.querySelector('[data-cell="users"]').textContent = String(users);
  const n = role.permissions.length;
  const cell = tr.querySelector('[data-cell="permissions"]');
  cell.querySelector(".meter__fill").style.setProperty("--w", `${Math.round((n / ALL_PERMISSIONS.length) * 100)}%`);
  cell.querySelector(".text-muted").textContent = `${n} / ${ALL_PERMISSIONS.length}`;
}

rows.forEach(renderRow);