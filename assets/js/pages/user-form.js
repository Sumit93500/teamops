// pages/user-form.js
// Runs on user-form.html. Adds a new employee, or edits one when the URL has
// ?id=EMP-xxxx. Dropdowns come from live data; saving writes to the store.

import { getUser, getAllUsers, addUser, updateUser, peekNextId, getAllDepartments } from "../data/store.js";
import { DESIGNATIONS } from "../data/users.js";
import { ROLES } from "../config/roles.js";
import { showToast } from "../ui/toast.js";
import { resolvePageLink } from "../core/paths.js";

const form = document.querySelector("form");
const field = (id) => document.getElementById(id);
const designationSelect = field("designation");
const defaultRoleInput = field("default-role");
const submitBtn = form?.querySelector('[type="submit"]');

const editId = new URLSearchParams(window.location.search).get("id");
const editing = editId ? getUser(editId) : null;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Profile pages show joining dates as "12 Jan 2023"; <input type="date"> needs "2023-01-12".
function toInputDate(text) {
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const m = String(text).match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  return month === -1 ? "" : `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function toDisplayDate(iso) {
  const m = String(iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : "";
}

// Same as initialsFrom() in ui/topbar.js.
function initialsFrom(name) {
  if (!name) return "?";
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

// ---------- errors (same pattern as change-password.js) ----------

function clearError() {
  form.querySelector(".form-error")?.remove();
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

// ---------- dropdowns ----------

function fillSelect(select, placeholder, options) {
  if (!select) return;
  const items = options.map(({ value, label, role }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    if (role) option.dataset.role = role;
    return option;
  });
  if (placeholder !== null) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = placeholder;
    items.unshift(empty);
  }
  select.replaceChildren(...items);
}

// Keeps a saved value selectable even if it's no longer in the list
// (e.g. a manager who isn't an active user), so editing never loses it.
function ensureOption(select, value, label = value) {
  if (!select || !value || Array.from(select.options).some((o) => o.value === value)) return;
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.append(option);
}

fillSelect(field("department"), "Select department",
  getAllDepartments().map((d) => ({ value: d.code, label: d.name })));

fillSelect(designationSelect, "Select designation",
  DESIGNATIONS.map((d) => ({ value: d.title, label: d.title, role: d.defaultRole })));

fillSelect(field("manager"), "No reporting manager",
  getAllUsers()
    .filter((u) => u.status === "active" && u.id !== editId)
    .map((u) => ({ value: u.name, label: u.name })));

function updateDefaultRole() {
  if (!designationSelect || !defaultRoleInput) return;
  const roleKey = designationSelect.selectedOptions[0]?.dataset.role;
  defaultRoleInput.value = ROLES[roleKey]?.label ?? "";
}

designationSelect?.addEventListener("change", updateDefaultRole);

// ---------- access checkboxes (saved as-is, no extra behaviour) ----------

const checkedValues = (name) =>
  Array.from(form.querySelectorAll(`input[name="${name}"]`)).filter((c) => c.checked).map((c) => c.value);

function setChecked(name, values = []) {
  form.querySelectorAll(`input[name="${name}"]`).forEach((c) => { c.checked = values.includes(c.value); });
}

// ---------- mode ----------

if (editId && !editing) {
  showToast("Employee not found", "danger");
  setTimeout(() => {
    window.location.href = resolvePageLink("users/users-list.html");
  }, 1200);
} else if (editing) {
  const [firstName, ...rest] = String(editing.name ?? "").split(" ");
  document.title = "Edit employee | OfficeOS";
  const heading = document.querySelector(".page-header h1");
  if (heading) heading.textContent = "Edit employee";
  const crumb = document.querySelector('.breadcrumb__item[aria-current="page"]');
  if (crumb) crumb.textContent = "Edit employee";
  if (submitBtn) submitBtn.textContent = "Save changes";
  const avatar = form.querySelector(".photo-row .avatar");
  if (avatar) avatar.textContent = initialsFrom(editing.name);

  field("first-name").value = firstName;
  field("last-name").value = rest.join(" ");
  field("work-email").value = editing.email ?? "";
  field("phone").value = editing.phone ?? "";
  field("dob").value = editing.dob ?? "";
  field("emp-id").value = editing.id;
  if (field("bank-account")) field("bank-account").value = editing.bankAccount ?? "";
  if (field("pan")) field("pan").value = editing.pan ?? "";

  ensureOption(field("department"), editing.department);
  field("department").value = editing.department ?? "";
  ensureOption(designationSelect, editing.designation);
  designationSelect.value = editing.designation ?? "";
  ensureOption(field("manager"), editing.reportingManager);
  field("manager").value = editing.reportingManager ?? "";
  field("joining").value = toInputDate(editing.dateOfJoining);
  if (editing.employmentType) { ensureOption(field("emp-type"), editing.employmentType); field("emp-type").value = editing.employmentType; }
  if (editing.location) { ensureOption(field("location"), editing.location); field("location").value = editing.location; }

  setChecked("extraRole", editing.extraRoles);
  setChecked("grant", editing.grantPermissions);
  setChecked("deny", editing.denyPermissions);
  const active = field("account-active");
  if (active) active.checked = editing.status !== "inactive";
} else {
  field("emp-id").value = peekNextId();
}
updateDefaultRole();

// ---------- save ----------

// Bank account and PAN, only when the form has those fields. Empty saves as
// null so the profile shows "Not on file". No format checks: this is a demo.
function sensitiveFields() {
  const bankInput = field("bank-account");
  const panInput = field("pan");
  const out = {};
  if (bankInput) {
    const account = bankInput.value.trim().replace(/\s+/g, " ");
    const digits = account.replace(/\D/g, "");
    out.bankAccount = account || null;
    out.bankAccountLast4 = digits ? digits.slice(-4) : null;
  }
  if (panInput) out.pan = panInput.value.trim().toUpperCase() || null;
  return out;
}

function buildRecord() {
  const designation = designationSelect.value;
  const managerSelect = field("manager");
  const active = field("account-active");

  // The checkbox only says active or not. Someone on leave who stays "active"
  // keeps their on-leave status instead of being flipped to plain active.
  let status = editing?.status ?? "active";
  if (active) status = active.checked ? (status === "inactive" ? "active" : status) : "inactive";

  return {
    name: `${field("first-name").value.trim()} ${field("last-name").value.trim()}`,
    email: field("work-email").value.trim(),
    department: field("department").value,
    designation,
    role: DESIGNATIONS.find((d) => d.title === designation)?.defaultRole ?? editing?.role ?? "emp",
    status,
    phone: field("phone").value.trim(),
    dob: field("dob").value,
    dateOfJoining: toDisplayDate(field("joining").value),
    employmentType: field("emp-type").value,
    location: field("location").value,
    reportingManager: managerSelect.value ? managerSelect.selectedOptions[0].textContent : "",
    extraRoles: checkedValues("extraRole"),
    grantPermissions: checkedValues("grant"),
    denyPermissions: checkedValues("deny"),
    ...sensitiveFields(),
  };
}

if (form && !(editId && !editing)) {
  // The browser only fires "submit" once required fields are filled, so native
  // validation still runs before this.
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearError();

    const record = buildRecord();
    const result = editing ? updateUser(editing.id, record) : addUser(record);

    if (!result.ok) {
      if (result.field === "email") showError(field("work-email"), result.error);
      else showToast(result.error, "danger");
      return;
    }

    showToast("Employee saved.", "success");
    setTimeout(() => {
      window.location.href = resolvePageLink("users/users-list.html");
    }, 1200);
  });

  field("work-email")?.addEventListener("input", clearError);
}