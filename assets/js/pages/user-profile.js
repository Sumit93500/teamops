// pages/user-profile.js
// Runs on user-profile.html. Shows the employee from ?id=EMP-xxxx (Rohan,
// EMP-1042, when there's no id) and wires Reveal, Deactivate/Reactivate and
// Reset password. Cards with no data behind them yet stay as static HTML.

import { getUser, getAllUsers, getAllDepartments, deactivateUser, reactivateUser } from "../data/store.js";
import { DEPARTMENTS } from "../data/users.js";
import { ROLES } from "../config/roles.js";
import { showToast } from "../ui/toast.js";
import { resolvePageLink } from "../core/paths.js";
import { getCurrentUserId } from "../core/auth.js";
import { applyPermissions, can } from "../core/rbac.js";
import { plural, todayIso } from "../ui/leave-view.js";
import { maskAccount, maskPan } from "../ui/pii.js";
import { salaryFor } from "../data/payroll-store.js";
import { rupees } from "../ui/money.js";

const DEFAULT_ID = "EMP-1042";
const id = new URLSearchParams(window.location.search).get("id") || DEFAULT_ID;
let user = getUser(id);

const STATUS = {
  "active":   { label: "Active",   badge: "badge badge--success badge--dot" },
  "on-leave": { label: "On leave", badge: "badge badge--info badge--dot" },
  "inactive": { label: "Inactive", badge: "badge badge--dot" },
};

const main = document.querySelector("main");
const actions = document.querySelector(".page-header__actions");
const actionButton = (text) => Array.from(actions?.querySelectorAll("button") ?? []).find((b) => b.textContent.trim() === text);
const resetBtn = actionButton("Reset password");
const statusBtn = actionButton("Deactivate");

// ---------- helpers ----------

// Same as initialsFrom() in ui/topbar.js.
function initialsFrom(name) {
  if (!name) return "?";
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function departmentName(code) {
  return getAllDepartments().find((d) => d.code === code)?.name
    ?? DEPARTMENTS.find((d) => d.code === code)?.name
    ?? code ?? "";
}

const orDash = (value) => (value ? String(value) : "—");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Reads "12 Jan 2023" (or "2023-01-12"), the same formats as toInputDate() in
// user-form.js. Returns { year, month (0-11), day } or null.
function parseDate(text) {
  const iso = String(text ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]) - 1, day: Number(iso[3]) };
  const m = String(text ?? "").match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  return month === -1 ? null : { year: Number(m[3]), month, day: Number(m[1]) };
}

// Whole months from the joining date to today, as "5 years, 6 months",
// "3 months" or "Less than a month". Null when there's no usable date.
function tenureText(joined, today = new Date()) {
  const start = parseDate(joined);
  if (!start) return null;
  let months = (today.getFullYear() - start.year) * 12 + (today.getMonth() - start.month);
  if (today.getDate() < start.day) months -= 1;   // the current month isn't complete yet
  if (months < 0) return "Not joined yet";
  if (months === 0) return "Less than a month";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years && plural(years, "year", "years"), rest && plural(rest, "month", "months")].filter(Boolean).join(", ");
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

const kvDd = (label) => Array.from(document.querySelectorAll(".kv__row"))
  .find((r) => r.querySelector("dt")?.textContent.trim() === label)?.querySelector("dd");

function renderStatus() {
  const badge = document.querySelectorAll(".profile__badges .badge")[1];
  const status = STATUS[user.status] ?? { label: user.status, badge: "badge" };
  if (badge) {
    badge.className = status.badge;
    badge.textContent = status.label;
  }
  if (statusBtn) {
    const inactive = user.status === "inactive";
    statusBtn.textContent = inactive ? "Reactivate" : "Deactivate";
    statusBtn.classList.toggle("btn--danger", !inactive);
  }
}

// ---------- not found ----------

function renderNotFound() {
  document.title = "Employee not found | OfficeOS";
  setText('.breadcrumb__item[aria-current="page"]', "Not found");
  if (actions) actions.hidden = true;
  document.querySelector("main > .stack > .tabs")?.setAttribute("hidden", "");
  document.querySelector("main .grid-main-aside")?.setAttribute("hidden", "");

  const card = document.querySelector(".card.profile");
  if (!card) return;
  const empty = document.createElement("div");
  empty.className = "empty";
  const title = document.createElement("h3");
  title.className = "empty__title";
  title.textContent = "Employee not found";
  const text = document.createElement("p");
  text.className = "empty__text";
  text.textContent = `There's no employee with ID ${id}. They may have been deleted, or the link is wrong.`;
  const back = document.createElement("a");
  back.className = "btn";
  back.href = resolvePageLink("users/users-list.html");
  back.textContent = "Back to users";
  empty.append(title, text, back);
  card.classList.remove("profile");
  card.replaceChildren(empty);
}

// ---------- sensitive details ----------

// Shows the masked value with a Reveal/Hide toggle, or "Not on file".
function setupSensitive(label, masked, full) {
  const dd = kvDd(label);
  if (!dd) return;
  const value = dd.querySelector(".masked");
  const button = dd.querySelector("button");
  if (!full) {
    dd.replaceChildren("Not on file");
    dd.classList.add("text-muted");
    return;
  }
  value.textContent = masked;
  let revealed = false;
  button?.addEventListener("click", () => {
    revealed = !revealed;
    value.textContent = revealed ? full : masked;
    value.classList.toggle("masked", !revealed);
    button.textContent = revealed ? "Hide" : "Reveal";
  });
}

const formatAccount = (digits) => String(digits).replace(/(\d{4})(?=\d)/g, "$1 ");

// ---------- cards with no data source yet, and permission overrides ----------

const cardTitled = (title) => Array.from(document.querySelectorAll(".card"))
  .find((c) => c.querySelector(".card__title")?.textContent.trim() === title);

function note(text) {
  const p = document.createElement("p");
  p.className = "text-sm text-muted";
  p.textContent = text;
  return p;
}

// Swaps a card's content (everything after its header) for a one-line message.
// The card and its header stay, so real data can drop in later.
function emptyCard(title, text, count) {
  const card = cardTitled(title);
  if (!card) return;
  const body = document.createElement("div");
  body.className = "card__body";
  body.append(note(text));
  Array.from(card.children).filter((c) => !c.classList.contains("card__header")).forEach((c) => c.remove());
  card.append(body);
  if (count !== undefined) {
    const meta = card.querySelector(".card__meta");
    if (meta) meta.textContent = String(count);
  }
}

function renderOverrides() {
  const card = cardTitled("Permission overrides");
  if (!card) return;
  const grants = user.grantPermissions ?? [];
  const denies = user.denyPermissions ?? [];
  const meta = card.querySelector(".card__meta");
  if (meta) meta.textContent = String(grants.length + denies.length);

  const body = card.querySelector(".card__body");
  if (!grants.length && !denies.length) {
    body?.replaceChildren(note("No overrides"));
    return;
  }
  const [grantChips, denyChips] = card.querySelectorAll(".perm-chips");
  const fill = (box, list) => box?.replaceChildren(...(list.length
    ? list.map((perm) => Object.assign(document.createElement("span"), { className: "perm-chip", textContent: perm }))
    : [Object.assign(document.createElement("span"), { className: "text-sm text-muted", textContent: "None" })]));
  fill(grantChips, grants);
  fill(denyChips, denies);
}

// ---------- render ----------

function render() {
  const role = ROLES[user.role];
  const dept = departmentName(user.department);
  const index = getAllUsers().findIndex((u) => u.id === user.id);

  document.title = `${user.name} | OfficeOS`;
  setText('.breadcrumb__item[aria-current="page"]', user.name);

  // Header card
  const avatar = document.querySelector(".profile .avatar--xl");
  if (avatar) {
    avatar.className = `avatar avatar--xl avatar--${(Math.max(index, 0) % 4) + 1}`;
    avatar.textContent = initialsFrom(user.name);
  }
  setText(".profile__name", user.name);
  setText(".profile__meta", [user.designation, dept].filter(Boolean).join(", "));
  const badges = document.querySelectorAll(".profile__badges .badge");
  if (badges[0]) badges[0].textContent = role?.label ?? user.role;
  if (badges[2]) badges[2].textContent = user.id;
  renderStatus();

  const mail = document.querySelector('.profile a[href^="mailto:"]');
  if (mail) mail.href = `mailto:${user.email}`;
  const edit = actions?.querySelector('a[href^="user-form.html"]');
  if (edit) edit.href = resolvePageLink(`users/user-form.html?id=${encodeURIComponent(user.id)}`);

  // Details. Tenure keeps its static text when there's no joining date on record.
  setKv("Work email", orDash(user.email));
  setKv("Phone", orDash(user.phone));
  setKv("Location", orDash(user.location));
  setKv("Employment type", orDash(user.employmentType));
  setKv("Department", orDash(dept));
  setKv("Reporting manager", orDash(user.reportingManager));
  setKv("Date of joining", orDash(user.dateOfJoining));
  const tenure = tenureText(user.dateOfJoining);
  if (tenure) setKv("Tenure", tenure);

  // Sensitive details, masked by ui/pii.js (last 4 of the account, last 5 of the PAN)
  setupSensitive("Bank account",
    maskAccount(user.bankAccountLast4) || "•••• ••••",
    user.bankAccount ? formatAccount(user.bankAccount) : "");
  setupSensitive("PAN",
    maskPan(user.pan),
    user.pan ?? "");
  Array.from(document.querySelectorAll(".form-hint"))
    .find((p) => p.textContent.includes("audit log"))?.remove();
  // The monthly gross in effect this month, from data/payroll-store.js (as
  // salary-structure.html shows it). Without salary:view the static "Hidden"
  // text stays.
  if (can("salary:view")) {
    const today = todayIso();
    const salary = salaryFor(user.id, Number(today.slice(0, 4)), Number(today.slice(5, 7)));
    setKv("Salary", salary ? `${rupees(salary.gross)} a month` : "Not on file");
    if (salary) kvDd("Salary")?.classList.remove("text-muted");
  }

  // Access. "Approval chain", "Two-factor sign-in" and "Last sign-in" stay static.
  setKv("Designation", orDash(user.designation));
  setKv("Default role", role?.label ?? user.role);
  setKv("Data scope", role?.dataScope === "all" ? "All records" : "Own records");

  renderOverrides();
  // No data source exists for these yet, so say so instead of showing Rohan's sample content.
  emptyCard("Assets", "No assets assigned", 0);
  emptyCard("Leave balance", "No leave data available yet");
  emptyCard("Recent activity", "No recent activity");

  applyPermissions(main);   // e.g. hides Reveal for roles without pii:view
}

// ---------- actions ----------

statusBtn?.addEventListener("click", () => {
  const deactivating = user.status !== "inactive";
  if (deactivating && user.id === getCurrentUserId()) {
    showToast("You can't deactivate your own account.", "danger");
    return;
  }
  const question = deactivating
    ? `Deactivate ${user.name}? They'll no longer show as active.`
    : `Reactivate ${user.name}?`;
  if (!window.confirm(question)) return;

  const result = deactivating ? deactivateUser(user.id) : reactivateUser(user.id);
  if (!result.ok) {
    showToast(result.error, "danger");
    return;
  }
  user = result.record;
  renderStatus();
  showToast(`${user.name} ${deactivating ? "deactivated" : "reactivated"}.`, "success");
});

// Demo only: nothing is sent or saved, the note is just on screen.
resetBtn?.addEventListener("click", () => {
  if (!window.confirm(`Send a password reset to ${user.email}?`)) return;
  showToast(`Reset link sent to ${user.email} (demo).`, "info");

  let note = actions.querySelector(".reset-note");
  if (!note) {
    note = document.createElement("span");
    note.className = "reset-note text-xs text-muted";
    resetBtn.after(note);
  }
  note.textContent = `Reset requested ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
});

if (user) render();
else renderNotFound();