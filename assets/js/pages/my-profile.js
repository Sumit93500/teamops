// pages/my-profile.js
// Runs on my-profile.html. Replaces the placeholder profile with the signed-in
// person's details from the live store. If there's no matching user (e.g. a
// session saved before employee ids were stored), the HTML is left as-is.

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { getUser, getAllDepartments, reportingManagerName } from "../data/store.js";
import { DEPARTMENTS } from "../data/users.js";
import { maskAccount, maskPan } from "../ui/pii.js";
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
  setKv("Data scope", role.dataScope === "all" ? "All records" : "Own records");
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
}