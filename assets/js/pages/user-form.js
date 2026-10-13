// pages/user-form.js
// Runs on user-form.html. Adds a new employee, or edits one when the URL has
// ?id=EMP-xxxx. Dropdowns come from live data; saving writes to the store.

import { getUser, getAllUsers, addUser, updateUser, peekNextId, getAllDepartments } from "../data/store.js";
import { DESIGNATIONS } from "../data/users.js";
import { ROLES, OVERRIDABLE, overridesOf, permissionsOf } from "../config/roles.js";
import { ALL_PERMISSIONS } from "../config/permissions.js";
import { showToast } from "../ui/toast.js";
import { resolvePageLink } from "../core/paths.js";
import { getCurrentRole, getCurrentUserId } from "../core/auth.js";

const form = document.querySelector("form");
const field = (id) => document.getElementById(id);
const designationSelect = field("designation");
const defaultRoleInput = field("default-role");
const submitBtn = form?.querySelector('[type="submit"]');

const editId = new URLSearchParams(window.location.search).get("id");
const editing = editId ? getUser(editId) : null;
// Who is saving: only an Admin may give someone the Admin role (designations.html: "Admin roles need an Admin").
const byRole = getCurrentRole()?.key;

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
function ensureOption(select, value, label = value, role = null) {
  if (!select || !value || Array.from(select.options).some((o) => o.value === value)) return;
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  if (role) option.dataset.role = role;
  select.append(option);
}

fillSelect(field("department"), "Select department",
  getAllDepartments().map((d) => ({ value: d.code, label: d.name })));

// A designation that carries the Admin role is offered only to an Admin.
fillSelect(designationSelect, "Select designation",
  DESIGNATIONS.filter((d) => d.defaultRole !== "admin" || byRole === "admin")
    .map((d) => ({ value: d.title, label: d.title, role: d.defaultRole })));

// Valued by id, so two people with the same name are two choices, and a rename doesn't lose anyone.
fillSelect(field("manager"), "No reporting manager",
  getAllUsers()
    .filter((u) => u.status === "active" && u.id !== editId)
    .map((u) => ({ value: u.id, label: u.name })));

function updateDefaultRole() {
  renderOverrideOptions();
  renderEffectivePermissions();
  if (!designationSelect || !defaultRoleInput) return;
  const roleKey = designationSelect.selectedOptions[0]?.dataset.role;
  defaultRoleInput.value = ROLES[roleKey]?.label ?? "";
}

// The role saving would store (buildRecord's rule): the designation's default
// role, else the employee's current one, else Employee.
const roleOnSave = () => DESIGNATIONS.find((d) => d.title === designationSelect?.value)?.defaultRole ?? editing?.role ?? "emp";

// "Effective permissions": what can() will check (round 11R): that role's
// permissions, plus the ticked extra ones, minus the ticked denied ones
// (config/roles.js permissionsOf()). A granted one says so on hover.
function renderEffectivePermissions() {
  const box = field("effective-permissions");
  if (!box) return;
  const draft = { role: roleOnSave(), grantPermissions: offeredTicked("grant"), denyPermissions: offeredTicked("deny") };
  const permissions = permissionsOf(draft);
  const held = ROLES[draft.role]?.permissions ?? [];
  const count = field("effective-count");
  if (count) count.textContent = String(permissions.length);
  if (permissions.length === ALL_PERMISSIONS.length) {
    box.replaceChildren(Object.assign(document.createElement("span"), { className: "text-sm text-muted", textContent: `Every permission (${permissions.length})` }));
    return;
  }
  box.replaceChildren(...permissions.map((perm) => Object.assign(document.createElement("span"),
    { className: "perm-chip", textContent: perm }, held.includes(perm) ? {} : { title: "Granted to this person" })));
}

designationSelect?.addEventListener("change", updateDefaultRole);

// ---------- permission overrides (round 11R) ----------

const checkedValues = (name) =>
  Array.from(form.querySelectorAll(`input[name="${name}"]`)).filter((c) => c.checked).map((c) => c.value);

// Why this person's overrides can't be changed here, or "" if they can. The
// store holds the same rules (data/store.js overridesProblem()).
function overridesLock() {
  if (byRole !== "admin") return "Only an Admin can change permission overrides.";
  if (editing && editing.id === getCurrentUserId()) return "You can't change your own permission overrides.";
  if (roleOnSave() === "admin") return "An Admin holds every permission, so there's nothing to grant or deny.";
  return "";
}

// What's ticked, kept across designation changes; it starts as the record's
// overrides that apply (anything stored outside OVERRIDABLE isn't shown).
const ticked = { grant: new Set(overridesOf(editing).grants), deny: new Set(overridesOf(editing).denies) };

// Offered for the role saving would store: extra = overridable and not held,
// denied = overridable and held; nothing for an Admin.
function offered(name) {
  const role = roleOnSave();
  if (role === "admin") return [];
  const held = ROLES[role]?.permissions ?? [];
  return OVERRIDABLE.filter((p) => held.includes(p) === (name === "deny"));
}
const offeredTicked = (name) => offered(name).filter((p) => ticked[name].has(p));

function renderOverrideOptions() {
  const lock = overridesLock();
  const reason = field("overrides-reason");
  if (reason) { reason.hidden = !lock; reason.textContent = lock; }
  for (const name of ["grant", "deny"]) {
    const box = field(`${name}-options`);
    if (!box) continue;
    const list = offered(name);
    box.replaceChildren(...(list.length ? list.map((perm) => {
      const input = Object.assign(document.createElement("input"), { type: "checkbox", name, value: perm, checked: ticked[name].has(perm), disabled: Boolean(lock) });
      const label = Object.assign(document.createElement("label"), { className: "check", title: lock });
      label.append(input, ` ${perm}`);
      return label;
    }) : [Object.assign(document.createElement("span"), { className: "text-sm text-muted", textContent: "None" })]));
  }
}

for (const name of ["grant", "deny"]) {
  field(`${name}-options`)?.addEventListener("change", (e) => {
    if (e.target.checked) ticked[name].add(e.target.value);
    else ticked[name].delete(e.target.value);
    renderEffectivePermissions();
  });
}

// The two lists to save: what's ticked of what's offered, empty for an Admin;
// left out when they can't be changed here, so the stored lists stay.
function overridesToSave() {
  if (byRole !== "admin" || (editing && editing.id === getCurrentUserId())) return {};
  return { grantPermissions: offeredTicked("grant"), denyPermissions: offeredTicked("deny") };
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
  ensureOption(designationSelect, editing.designation, editing.designation, DESIGNATIONS.find((d) => d.title === editing.designation)?.defaultRole);
  designationSelect.value = editing.designation ?? "";
  // The saved manager by id; one who isn't offered (inactive) or isn't on record at all (e.g. a department head, kept
  // by name) stays selectable, so saving doesn't drop them.
  const managerKey = editing.reportingManagerId ?? (editing.reportingManager ? `name:${editing.reportingManager}` : "");
  ensureOption(field("manager"), managerKey, getUser(editing.reportingManagerId)?.name ?? editing.reportingManager);
  field("manager").value = managerKey;
  field("joining").value = toInputDate(editing.dateOfJoining);
  if (editing.employmentType) { ensureOption(field("emp-type"), editing.employmentType); field("emp-type").value = editing.employmentType; }
  if (editing.location) { ensureOption(field("location"), editing.location); field("location").value = editing.location; }

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

// The manager to save: by id, or (a manager kept by name, not on record) by that name, or none.
function managerChoice(select) {
  const value = select?.value ?? "";
  if (value.startsWith("name:")) return { reportingManager: value.slice(5) };
  return { reportingManagerId: value || null, reportingManager: value ? select.selectedOptions[0].textContent : "" };
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
    role: roleOnSave(),
    status,
    phone: field("phone").value.trim(),
    dob: field("dob").value,
    dateOfJoining: toDisplayDate(field("joining").value),
    employmentType: field("emp-type").value,
    location: field("location").value,
    ...managerChoice(managerSelect),
    ...overridesToSave(),
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
    const result = editing ? updateUser(getCurrentUserId(), editing.id, record) : addUser(getCurrentUserId(), record);

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