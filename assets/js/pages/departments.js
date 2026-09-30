// pages/departments.js
// Runs on departments.html. Draws the department cards and the stat strip
// from the live store, and adds or edits a department through #dept-modal.
// Saving re-renders in place; the page never reloads.

import { getAllDepartments, getDepartment, getAllUsers, addDepartment, updateDepartment, headcountByDepartment } from "../data/store.js";
import { openModal, closeModal } from "../ui/modal.js";
import { showToast } from "../ui/toast.js";
import { resolvePageLink } from "../core/paths.js";
import { applyPermissions } from "../core/rbac.js";
import { plural } from "../ui/leave-view.js";
import { setStatValue, setOptionalStatNote } from "../ui/stats.js";

const MODAL_ID = "dept-modal";

const grid = document.querySelector(".dept-grid");
const statStrip = document.querySelector(".stat-strip");
const addBtn = Array.from(document.querySelectorAll(".page-header__actions button"))
  .find((b) => b.textContent.trim() === "Add department");

const modal = document.getElementById(MODAL_ID);
const form = modal?.querySelector("form");
const field = (id) => document.getElementById(id);
const titleEl = field("dept-modal-title");
const descEl = modal?.querySelector(".modal__desc");
const nameInput = field("dept-name");
const codeInput = field("dept-code");
const headSelect = field("dept-head");
const activeInput = field("dept-active");

let editingCode = null;   // null = adding a new department

// ---------- helpers ----------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Same as initialsFrom() in ui/topbar.js.
function initialsFrom(name) {
  if (!name) return "?";
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

// ---------- rendering ----------

// Built with DOM calls rather than an HTML string, so a name typed into the
// modal can never inject markup.
function buildCard(dept, index, counts) {
  const card = el("article", "card dept");

  const top = el("div", "dept__top");
  const titles = el("div");
  titles.append(el("h3", "dept__name", dept.name), el("span", "dept__code", dept.code));
  top.append(titles, dept.active === false
    ? el("span", "badge badge--dot", "Inactive")
    : el("span", "badge badge--success badge--dot", "Active"));

  const head = el("div", "dept__head");
  const headText = el("div");
  headText.append(
    el("span", dept.head ? "fw-medium" : "fw-medium text-muted", dept.head || "No head assigned"),
    el("small", "", "Department head"),
  );
  head.append(el("div", `avatar avatar--${(index % 4) + 1}`, initialsFrom(dept.head)), headText);

  const stats = el("div", "dept__stats");
  const employees = el("div", "dept__stat");
  employees.append(el("span", "", "Employees"), el("strong", "", String(counts[dept.code] ?? 0)));
  const openRoles = el("div", "dept__stat");
  openRoles.append(el("span", "", "Open roles"), el("strong", "", "—"));   // no recruitment data yet
  stats.append(employees, openRoles);

  const foot = el("div", "dept__foot");
  const view = el("a", "link text-sm", "View people");
  view.href = resolvePageLink(`users/users-list.html?dept=${encodeURIComponent(dept.code)}`);
  const edit = el("button", "btn btn--sm", "Edit");
  edit.type = "button";
  edit.dataset.permission = "departments:edit";
  edit.addEventListener("click", () => openForEdit(dept.code));
  foot.append(view, edit);

  card.append(top, head, stats, foot);
  return card;
}

// Finds a stat by its label, e.g. "Employees", and sets its number and the
// line under it. An empty note removes that line.
function setStat(label, value, note) {
  const stat = Array.from(statStrip?.querySelectorAll(".stat") ?? [])
    .find((s) => s.querySelector(".stat__label")?.textContent.trim() === label);
  if (!stat) return;
  setStatValue(stat, value);
  setOptionalStatNote(stat, note);
}

function renderStats(departments, counts) {
  const employees = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const headless = departments.filter((d) => !d.head).length;
  const headNote = headless ? `${headless} ${headless === 1 ? "has" : "have"} no head` : "All have a head";
  setStat("Departments", String(departments.length), departments.length ? headNote : "");

  setStat("Employees", String(employees), "");
  setStat("Open positions", "—", "");   // no recruitment data yet

  // Rounded to one decimal: with a small team, 1.5 says more than 2.
  const average = departments.length ? Math.round((employees / departments.length) * 10) / 10 : 0;
  const largest = departments.reduce((best, d) => ((counts[d.code] ?? 0) > (counts[best?.code] ?? 0) ? d : best), null);
  setStat("Average team size", departments.length ? String(average) : "—",
    largest ? `Largest is ${largest.name}` : "");
}

function render() {
  const departments = getAllDepartments();
  const counts = headcountByDepartment();
  if (grid) {
    grid.replaceChildren(...departments.map((d, i) => buildCard(d, i, counts)));
    applyPermissions(grid);   // hide Edit for roles without departments:edit
  }
  renderStats(departments, counts);
}

// ---------- errors (same pattern as user-form.js) ----------

function clearError() {
  form?.querySelectorAll(".form-error").forEach((error) => {
    error.closest(".form-field")?.querySelector("[aria-describedby]")?.removeAttribute("aria-describedby");
    error.remove();
  });
}

function showError(input, message) {
  clearError();
  const error = document.createElement("span");
  error.className = "form-error";
  error.id = `${input.id}-error`;
  error.textContent = message;
  input.closest(".form-field").appendChild(error);
  input.setAttribute("aria-describedby", error.id);
  input.focus();
}

// ---------- modal ----------

// Keeps a saved value selectable even if it's no longer in the list (e.g. a
// head who isn't an active employee), so editing never loses it.
function ensureOption(select, value) {
  if (!select || !value || Array.from(select.options).some((o) => o.value === value)) return;
  select.append(el("option", "", value));
}

function fillHeadSelect(currentHead) {
  const empty = el("option", "", "No head");
  empty.value = "";
  headSelect.replaceChildren(empty, ...getAllUsers()
    .filter((u) => u.status === "active")
    .map((u) => el("option", "", u.name)));
  ensureOption(headSelect, currentHead);
  headSelect.value = currentHead ?? "";
}

const normaliseCode = () => { codeInput.value = codeInput.value.trim().toUpperCase(); };

function openModalFor(dept) {
  editingCode = dept?.code ?? null;
  form.reset();
  clearError();
  if (titleEl) titleEl.textContent = dept ? "Edit department" : "Add department";
  if (descEl) descEl.textContent = dept ? "The code can't be changed, because employees are linked to it." : "Create a new department. The code is used on employee records.";
  nameInput.value = dept?.name ?? "";
  codeInput.value = dept?.code ?? "";
  codeInput.disabled = Boolean(dept);
  fillHeadSelect(dept?.head ?? "");
  activeInput.checked = dept ? dept.active !== false : true;
  openModal(MODAL_ID);
  nameInput.focus();
}

function openForEdit(code) {
  const dept = getDepartment(code);
  if (!dept) {
    showToast("That department no longer exists.", "danger");
    render();
    return;
  }
  openModalFor(dept);
}

function save() {
  clearError();
  const record = { name: nameInput.value.trim(), head: headSelect.value, active: activeInput.checked };

  if (editingCode) {
    const before = getDepartment(editingCode);
    const people = headcountByDepartment()[editingCode] ?? 0;
    if (before?.active !== false && !record.active && people > 0
      && !window.confirm(`This department has ${plural(people, "employee", "employees")}. Deactivate anyway?`)) {
      return;   // nothing saved; the modal stays open as it was
    }
  } else {
    normaliseCode();   // Enter can submit without the field ever losing focus
  }

  const result = editingCode ? updateDepartment(editingCode, record) : addDepartment({ ...record, code: codeInput.value });
  if (!result.ok) {
    const input = { code: codeInput, name: nameInput }[result.field];
    if (input) showError(input, result.error);
    else showToast(result.error, "danger");
    return;
  }

  closeModal(MODAL_ID);
  showToast(editingCode ? "Department saved." : "Department added.", "success");
  editingCode = null;
  render();
}

// ---------- wiring ----------

if (modal && form) {
  // The browser only fires "submit" once required fields are filled, so native
  // validation still runs before this.
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    save();
  });
  codeInput.addEventListener("blur", normaliseCode);
  nameInput.addEventListener("input", clearError);
  codeInput.addEventListener("input", clearError);
  addBtn?.addEventListener("click", () => openModalFor(null));
}

render();