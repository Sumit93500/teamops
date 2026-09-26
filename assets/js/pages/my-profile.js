// pages/my-profile.js
// Runs on my-profile.html. Replaces the placeholder profile with the signed-in
// person's details. If there's no matching demo user, the HTML is left as-is.

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { PROFILE_DETAILS, getUserById, DEPARTMENTS } from "../data/users.js";

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

// Sets defaultValue (not just value) so the form's Discard button resets to
// these values rather than the placeholder ones in the HTML.
function setField(id, value) {
  const field = document.getElementById(id);
  if (field) field.defaultValue = value;
}

const user = getUserById(getCurrentUserId());
const details = user ? PROFILE_DETAILS[user.id] : null;
const role = getCurrentRole();

if (user && details && role) {
  const departmentName = DEPARTMENTS.find((d) => d.code === user.department)?.name ?? user.department;

  // Header card
  setText(".profile .avatar--xl", initialsFrom(user.name));
  setText(".profile__name", user.name);
  setText(".profile__meta", `${user.designation}, ${departmentName}`);
  setText(".profile__badges .badge--primary", role.label);
  setText(".profile__badges .badge:last-child", user.id);

  // Work details
  setKv("Employee ID", user.id);
  setKv("Designation", user.designation);
  setKv("Department", departmentName);
  setKv("Reporting manager", details.reportingManager);
  setKv("Date of joining", details.dateOfJoining);
  setKv("Location", details.location);
  setKv("Employment type", details.employmentType);

  // Your access
  setKv("Role", role.label);
  setKv("Data scope", role.dataScope === "all" ? "All records" : "Own records");
  setKv("Leave approved by", details.leaveApprovedBy);

  // Contact details
  setField("p-name", user.name.split(" ")[0]);
  setField("p-phone", details.phone);
  setField("p-email", details.personalEmail);
  setField("p-city", details.city);
  setField("p-address", details.address);

  // Emergency contact
  setField("e-name", details.emergencyContactName);
  setField("e-rel", details.emergencyContactRelation);
  setField("e-phone", details.emergencyContactPhone);
}