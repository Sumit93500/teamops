// pages/users-list.js
// Runs on users-list.html. Draws the employee table from the live store and
// wires the status pills, search box, department/role filters, pagination and
// CSV export. All filters combine: a row must match every one that's set.

import { getAllUsers, getAllDepartments, resetDemoData } from "../data/store.js";
import { DEPARTMENTS } from "../data/users.js";
import { ROLES } from "../config/roles.js";
import { renderPagination } from "../ui/pagination.js";
import { resolvePageLink } from "../core/paths.js";
import { applyPermissions } from "../core/rbac.js";
import { getCurrentRole } from "../core/auth.js";

const pageSize = 10;
let currentPage = 1;
let activeStatusFilter = "all";   // "all" | "active" | "on-leave" | "inactive"
let searchText = "";
let departmentFilter = "";        // department code, "" = all
let roleFilter = "";              // role key, "" = all

const STATUS = {
  "active":   { label: "Active",   badge: "badge badge--success badge--dot" },
  "on-leave": { label: "On leave", badge: "badge badge--info badge--dot" },
  "inactive": { label: "Inactive", badge: "badge badge--dot" },
};
const PILL_STATUS = { "All": "all", "Active": "active", "On leave": "on-leave", "Inactive": "inactive" };

const tbody = document.querySelector(".table tbody");
const pills = Array.from(document.querySelectorAll(".table__toolbar .tabs__tab"));
const searchInput = document.querySelector(".table__toolbar .input--search");
const departmentSelect = document.querySelector('.table__toolbar select[aria-label="Filter by department"]');
const roleSelect = document.querySelector('.table__toolbar select[aria-label="Filter by role"]');
const paginationEl = document.querySelector(".pagination");
const subtitle = document.querySelector(".page-header__subtitle");
const exportBtn = Array.from(document.querySelectorAll(".page-header__actions button"))
  .find((b) => b.textContent.trim() === "Export");

// ---------- lookups ----------

// Live departments first, so ones added later have names too; the built-in
// list covers any code that isn't in the store.
function departmentName(code) {
  return getAllDepartments().find((d) => d.code === code)?.name
    ?? DEPARTMENTS.find((d) => d.code === code)?.name
    ?? code ?? "";
}

const roleLabel = (key) => ROLES[key]?.label ?? key ?? "";
const statusLabel = (status) => STATUS[status]?.label ?? status ?? "";

// Same idea as initialsFrom() in ui/topbar.js.
function initials(name) {
  return String(name ?? "?").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

// The static page cycled avatar--1..4 down the rows. Here the colour comes from
// the person's position in the full list, so it stays the same while filtering.
function avatarClass(id, allUsers) {
  const index = allUsers.findIndex((u) => u.id === id);
  return `avatar avatar--${(Math.max(index, 0) % 4) + 1}`;
}

// ---------- filtering ----------

function getFilteredUsers() {
  const query = searchText.trim().toLowerCase();
  return getAllUsers().filter((u) =>
    (activeStatusFilter === "all" || u.status === activeStatusFilter)
    && (!departmentFilter || u.department === departmentFilter)
    && (!roleFilter || u.role === roleFilter)
    && (!query || [u.name, u.email, u.id].some((v) => String(v ?? "").toLowerCase().includes(query))));
}

// ---------- rendering ----------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Built with DOM calls rather than an HTML string, so names typed into the
// user form can never inject markup.
function buildRow(user, allUsers) {
  const tr = document.createElement("tr");

  const checkCell = el("td", "table__check");
  const checkLabel = el("label", "check");
  const checkbox = el("input");
  checkbox.type = "checkbox";
  checkbox.setAttribute("aria-label", `Select ${user.name}`);
  checkLabel.append(checkbox);
  checkCell.append(checkLabel);

  const userCell = el("td");
  const userWrap = el("div", "table__user");
  const nameLink = el("a", "table__user-name", user.name);
  nameLink.href = resolvePageLink(`users/user-profile.html?id=${encodeURIComponent(user.id)}`);
  const textWrap = el("div");
  textWrap.append(nameLink, el("span", "table__user-sub", user.email));
  userWrap.append(el("div", avatarClass(user.id, allUsers), initials(user.name)), textWrap);
  userCell.append(userWrap);

  const roleCell = el("td");
  roleCell.append(el("span", "badge badge--primary", roleLabel(user.role)));

  const statusCell = el("td");
  statusCell.append(el("span", STATUS[user.status]?.badge ?? "badge", statusLabel(user.status)));

  const actionsCell = el("td", "table__actions");
  const edit = el("a", "btn btn--sm", "Edit");
  edit.href = resolvePageLink(`users/user-form.html?id=${encodeURIComponent(user.id)}`);
  edit.dataset.permission = "users:edit";
  actionsCell.append(edit);

  tr.append(
    checkCell,
    userCell,
    el("td", "", user.id),
    el("td", "", user.designation ?? ""),
    el("td", "", departmentName(user.department)),
    roleCell,
    statusCell,
    actionsCell,
  );
  return tr;
}

function emptyRow() {
  const tr = document.createElement("tr");
  const td = el("td", "text-muted", "No employees match these filters.");
  td.colSpan = document.querySelectorAll(".table thead th").length || 8;
  tr.append(td);
  return tr;
}

function updateCounts(allUsers) {
  const counts = {
    "all": allUsers.length,
    "active": allUsers.filter((u) => u.status === "active").length,
    "on-leave": allUsers.filter((u) => u.status === "on-leave").length,
    "inactive": allUsers.filter((u) => u.status === "inactive").length,
  };
  pills.forEach((pill) => {
    const badge = pill.querySelector(".badge--count");
    if (badge) badge.textContent = counts[pillStatus(pill)] ?? "";
  });

  if (subtitle) {
    const depts = getAllDepartments().length;
    subtitle.textContent = `${allUsers.length} ${allUsers.length === 1 ? "employee" : "employees"} across ${depts} ${depts === 1 ? "department" : "departments"}`;
  }
}

function renderTable() {
  if (!tbody) return;
  const allUsers = getAllUsers();
  const filtered = getFilteredUsers();

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);   // e.g. after a filter shrinks the list
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  tbody.replaceChildren(...(pageRows.length ? pageRows.map((u) => buildRow(u, allUsers)) : [emptyRow()]));
  applyPermissions(tbody);   // hide Edit for roles without users:edit, as on the static rows

  updateCounts(allUsers);

  renderPagination(paginationEl, {
    totalItems: filtered.length,
    pageSize,
    currentPage,
    onPageChange: (page) => {
      currentPage = page;
      renderTable();
    },
  });
}

// ---------- controls ----------

// The pill label is the text before its count badge ("Active 236" -> "Active").
function pillStatus(pill) {
  const label = Array.from(pill.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent).join("").trim();
  return PILL_STATUS[label] ?? "all";
}

// ui/tabs.js already moves the is-active highlight between pills on click,
// so this only changes the filter.
pills.forEach((pill) => {
  pill.addEventListener("click", () => {
    activeStatusFilter = pillStatus(pill);
    currentPage = 1;
    renderTable();
  });
});

if (searchInput) {
  searchInput.addEventListener("input", () => {
    searchText = searchInput.value;
    currentPage = 1;
    renderTable();
  });
}

function fillSelect(select, allLabel, options) {
  if (!select) return;
  select.replaceChildren(el("option", "", allLabel), ...options.map(([value, label]) => {
    const option = el("option", "", label);
    option.value = value;
    return option;
  }));
  select.options[0].value = "";
}

fillSelect(departmentSelect, "All departments", getAllDepartments().map((d) => [d.code, d.name]));
fillSelect(roleSelect, "All roles", Object.values(ROLES).map((r) => [r.key, r.label]));

// "View people" on the Departments page links here as ?dept=<code>. A code
// that isn't in the dropdown is ignored, so the list isn't silently empty.
const deptParam = new URLSearchParams(window.location.search).get("dept");
if (departmentSelect && deptParam && Array.from(departmentSelect.options).some((o) => o.value === deptParam)) {
  departmentSelect.value = deptParam;
  departmentFilter = deptParam;
}

departmentSelect?.addEventListener("change", () => {
  departmentFilter = departmentSelect.value;
  currentPage = 1;
  renderTable();
});

roleSelect?.addEventListener("change", () => {
  roleFilter = roleSelect.value;
  currentPage = 1;
  renderTable();
});

// ---------- export ----------

// Quotes a value for CSV. Values starting with = + - @ are prefixed with ' so a
// spreadsheet shows them as text instead of running them as formulas.
function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildUsersCsv(users) {
  const header = ["ID", "Name", "Email", "Designation", "Department", "Role", "Status"];
  const rows = users.map((u) => [u.id, u.name, u.email, u.designation, departmentName(u.department), roleLabel(u.role), statusLabel(u.status)]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function exportCsv() {
  // The BOM tells Excel the file is UTF-8, so names with accents show correctly.
  const blob = new Blob(["﻿" + buildUsersCsv(getFilteredUsers())], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = el("a");
  link.href = url;
  link.download = `users-${todayStamp()}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

exportBtn?.addEventListener("click", exportCsv);

// ---------- reset demo data ----------

// A demo-only safety net, not a real permission, so it's a plain role check:
// only Admin and HR get the button at all.
if (["admin", "hr"].includes(getCurrentRole()?.key) && exportBtn) {
  const resetBtn = el("button", "btn btn--ghost", "Reset demo data");
  resetBtn.type = "button";
  resetBtn.addEventListener("click", () => {
    if (!window.confirm("This discards every change made to users and departments in this browser. Continue?")) return;
    resetDemoData();
    window.location.reload();
  });
  exportBtn.before(resetBtn);
}

renderTable();