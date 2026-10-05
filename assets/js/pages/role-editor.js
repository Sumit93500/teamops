// pages/role-editor.js
// Runs on role-editor.html (needs roles:manage: Admin). Shows the role named in
// ?role=admin|hr|fin|emp (HR Manager when there's none, or it isn't a role),
// all from config/roles.js, config/permissions.js and the employee list:
// its details, who holds it, and every permission in the app, ticked where the
// role has it.
//
// Nothing here is editable: roles come from the app's configuration, as
// roles-list.html says. The matrix is drawn from PERMISSIONS, so a permission
// added there shows up here with no change to this page.

import { ROLES } from "../config/roles.js";
import { PERMISSIONS, ALL_PERMISSIONS } from "../config/permissions.js";
import { getAllUsers } from "../data/store.js";
import { resolvePageLink } from "../core/paths.js";
import { el, initials, avatarClass, plural } from "../ui/leave-view.js";

const DEFAULT_ROLE = "hr";
const asked = new URLSearchParams(window.location.search).get("role");
const role = ROLES[Object.hasOwn(ROLES, asked ?? "") ? asked : DEFAULT_ROLE];

// How the matrix groups modules, and their names. A module missing here still
// shows, under "Other", named by its key.
const GROUPS = [
  ["Overview", { dashboard: "Dashboard", announcements: "Announcements" }],
  ["People", { users: "Users", pii: "Personal details (bank account, PAN)", departments: "Departments", roles: "Roles & permissions", designations: "Designations", recruitment: "Recruitment" }],
  ["Time", { attendance: "Attendance", leave: "Leave", holidays: "Holidays", shifts: "Shifts" }],
  ["Requests & approvals", { approvals: "Approvals", requests: "Requests", workflows: "Approval workflows", delegation: "Delegation" }],
  ["Finance", { payroll: "Payroll", payslips: "Everyone's payslips", payslip: "Own payslip", salary: "Salaries", expenses: "Expenses", tax: "Tax" }],
  ["Operations", { inventory: "Inventory", assets: "Assets", vendors: "Vendors" }],
  ["System", { reports: "Reports", audit: "Audit log", settings: "Settings", backup: "Backup" }],
  ["Your own account", { profile: "Profile", password: "Password", sessions: "Sessions", notifications: "Notifications" }],
];

const $ = (id) => document.getElementById(id);

function tickBox(held) {
  if (!held) return el("span", "matrix__no");
  const box = el("span", "matrix__yes");
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M5 12l5 5L20 7");
  svg.append(path);
  box.append(svg);
  return box;
}

function moduleRow(module, name) {
  const tr = el("tr");
  const nameCell = el("td");
  nameCell.append(el("span", "matrix__module-name", name), el("span", "matrix__module-desc", module));
  const actions = el("td", "matrix__actions");
  const list = el("div", "perm-ticks");
  list.append(...PERMISSIONS[module].map((action) => {
    const key = `${module}:${action}`;
    const held = role.permissions.includes(key);
    const tick = el("span", held ? "perm-tick" : "perm-tick perm-tick--off");
    tick.dataset.permissionKey = key;
    tick.title = key;
    tick.setAttribute("aria-label", `${key}: ${held ? "yes" : "no"}`);
    tick.append(tickBox(held), el("span", "", action));
    return tick;
  }));
  actions.append(list);
  tr.append(nameCell, actions);
  return tr;
}

function renderMatrix() {
  const named = new Set(GROUPS.flatMap(([, modules]) => Object.keys(modules)));
  const other = Object.fromEntries(Object.keys(PERMISSIONS).filter((m) => !named.has(m)).map((m) => [m, m]));
  const rows = [];
  for (const [group, modules] of [...GROUPS, ["Other", other]]) {
    const present = Object.entries(modules).filter(([module]) => Object.hasOwn(PERMISSIONS, module));
    if (!present.length) continue;
    const head = el("tr", "matrix__group");
    const cell = el("td", "", group);
    cell.colSpan = 2;
    head.append(cell);
    rows.push(head, ...present.map(([module, name]) => moduleRow(module, name)));
  }
  $("matrix-rows").replaceChildren(...rows);
  $("permission-count").textContent = `${role.permissions.length} of ${ALL_PERMISSIONS.length}`;
}

function renderDetails(holders) {
  document.title = `${role.label} | OfficeOS`;
  $("role-crumb").textContent = role.label;
  $("role-title").textContent = role.label;
  $("role-subtitle").textContent = `System role, held by ${plural(holders.length, "person", "people")}`;
  $("role-key").textContent = role.key;
  const landing = el("a", "link", role.landing);
  landing.href = resolvePageLink(role.landing);
  $("role-landing").replaceChildren(landing);
  // Same wording as the profile pages' "Data scope".
  $("role-scope").textContent = role.dataScope === "all" ? "All records" : "Own records";
}

// Everyone holding the role, inactive people included (as roles-list counts them).
function renderHolders(holders) {
  $("role-user-count").textContent = String(holders.length);
  if (!holders.length) {
    $("role-users").replaceChildren(el("div", "list__item text-muted", "Nobody holds this role."));
    return;
  }
  $("role-users").replaceChildren(...holders.map((user) => {
    const item = el("div", "list__item");
    const content = el("div", "list__content");
    const name = el("a", "list__title link", user.name);
    name.href = `../users/user-profile.html?id=${encodeURIComponent(user.id)}`;
    const sub = user.status === "inactive" ? `${user.designation}, inactive` : user.designation;
    content.append(name, el("span", "list__sub", sub));
    item.append(el("div", avatarClass(user.id), initials(user.name)), content);
    return item;
  }));
}

if ($("matrix-rows")) {
  const holders = getAllUsers().filter((u) => u.role === role.key);
  renderDetails(holders);
  renderHolders(holders);
  renderMatrix();
}