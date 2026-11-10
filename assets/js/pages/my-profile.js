// pages/my-profile.js
// Runs on my-profile.html. Replaces the placeholder profile with the signed-in
// person's details from the live store. If there's no matching user (e.g. a
// session saved before employee ids were stored), the HTML is left as-is.
//
// Save changes (round Demo buttons part 1) saves the person's own contact
// details and emergency contact through the store's updateOwnContact(), which
// takes only those fields and only for their own record. Preferred name is
// shown, not saved: it's the first part of the name on record, which HR changes.
// Change photo is still a placeholder.

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { getUser, getAllDepartments, reportingManagerName, updateOwnContact } from "../data/store.js";
import { DEPARTMENTS } from "../data/users.js";
import { maskAccount, maskPan } from "../ui/pii.js";
import { showToast } from "../ui/toast.js";
import { approvalChainText } from "../data/leave-store.js";

const STATUS = {
  "active":   { label: "Active",   badge: "badge badge--success badge--dot" },
  "on-leave": { label: "On leave", badge: "badge badge--info badge--dot" },
  "inactive": { label: "Inactive", badge: "badge badge--dot" },
};

// Same as initialsFrom() in ui/topbar.js (not exported there).
function initialsFrom(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Live departments first, so renamed or added ones show correctly; the
// built-in list covers any code that isn't in the store.
function departmentName(code) {
  return getAllDepartments().find((d) => d.code === code)?.name
    ?? DEPARTMENTS.find((d) => d.code === code)?.name
    ?? code ?? "";
}

const orDash = (value) => (value ? String(value) : "—");

function setText(selector, text) {
  const el = document.querySelector(selector);
  if (el) el.textContent = text;
}

// Sets the <dd> of the .kv__row whose <dt> reads `label`. If the <dd> holds a
// badge, the badge text is changed instead so its styling is kept.
function setKv(label, text) {
  const row = Array.from(document.querySelectorAll(".kv__row"))
    .find((r) => r.querySelector("dt")?.textContent.trim() === label);
  const dd = row?.querySelector("dd");
  if (!dd) return;
  (dd.querySelector(".badge") ?? dd).textContent = text;
}

// Masked value, or "Not on file" (muted) when there's nothing stored.
function setSensitive(label, masked) {
  const dd = Array.from(document.querySelectorAll(".kv__row"))
    .find((r) => r.querySelector("dt")?.textContent.trim() === label)?.querySelector("dd");
  if (!dd) return;
  dd.textContent = masked || "Not on file";
  dd.classList.toggle("masked", Boolean(masked));
  dd.classList.toggle("text-muted", !masked);
}

// Sets defaultValue (not just value) so the form's Discard button resets to
// these values rather than the placeholder ones in the HTML.
function setField(id, value) {
  const field = document.getElementById(id);
  if (field) field.defaultValue = value ?? "";
}

// ---------- Save changes (round Demo buttons part 1) ----------

// What Save changes sends: input id -> the record's field, the store's
// OWN_CONTACT_FIELDS. Preferred name (p-name) is shown, not saved.
const SAVED = {
  "p-phone": "phone", "p-email": "personalEmail", "p-city": "city", "p-address": "address",
  "e-name": "emergencyContactName", "e-rel": "emergencyContactRelation", "e-phone": "emergencyContactPhone",
};
const form = document.querySelector("main form");

// An error next to its field, as user-form.js shows one (change-password.js's pattern).
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

// The browser checks Personal email first (type="email", as on user-form's work
// email); the store checks it again, and refuses any other field or anyone
// else's record.
function save(e) {
  e.preventDefault();
  clearError();
  const changes = {};
  for (const [id, key] of Object.entries(SAVED)) changes[key] = document.getElementById(id).value.trim();
  const result = updateOwnContact(getCurrentUserId(), user.id, changes);
  if (!result.ok) {
    const id = Object.keys(SAVED).find((k) => SAVED[k] === result.field);
    if (id) showError(document.getElementById(id), result.error);
    else showToast(result.error, "danger");
    return;
  }
  // Discard now goes back to what was just saved.
  for (const [id, key] of Object.entries(SAVED)) {
    const field = document.getElementById(id);
    field.defaultValue = result.record[key] ?? "";
    field.value = field.defaultValue;
  }
  showToast("Saved.", "success");
}

const user = getUser(getCurrentUserId());
const role = getCurrentRole();

if (user && role) {
  const dept = departmentName(user.department);

  // Header card
  setText(".profile .avatar--xl", initialsFrom(user.name));
  setText(".profile__name", user.name);
  setText(".profile__meta", [user.designation, dept].filter(Boolean).join(", "));
  setText(".profile__badges .badge--primary", role.label);
  setText(".profile__badges .badge:last-child", user.id);
  const statusBadge = document.querySelectorAll(".profile__badges .badge")[1];
  if (statusBadge) {
    const status = STATUS[user.status] ?? STATUS.active;
    statusBadge.className = status.badge;
    statusBadge.textContent = status.label;
  }

  // Work details
  setKv("Employee ID", user.id);
  setKv("Designation", orDash(user.designation));
  setKv("Department", orDash(dept));
  setKv("Reporting manager", orDash(reportingManagerName(user)));
  setKv("Date of joining", orDash(user.dateOfJoining));
  setKv("Location", orDash(user.location));
  setKv("Employment type", orDash(user.employmentType));

  // Sensitive details (masked by ui/pii.js, as on the employee profile page; no Reveal here)
  setSensitive("Bank account", maskAccount(user.bankAccountLast4));
  setSensitive("PAN", maskPan(user.pan));

  // Your access. The role comes from the session: it's what this person can do right now.
  setKv("Role", role.label);
  setKv("Data scope", role.scopeLabel);
  setKv("Leave approved by", approvalChainText(user.id));   // the real chain (the stored leaveApprovedBy text is no longer shown)

  // Contact details
  setField("p-name", String(user.name ?? "").split(" ")[0]);
  setField("p-phone", user.phone);
  setField("p-email", user.personalEmail);
  setField("p-city", user.city);
  setField("p-address", user.address);

  // Emergency contact
  setField("e-name", user.emergencyContactName);
  setField("e-rel", user.emergencyContactRelation);
  setField("e-phone", user.emergencyContactPhone);

  form?.addEventListener("submit", save);
  form?.addEventListener("input", clearError);
}