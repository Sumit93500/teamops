// pages/user-profile.js
// Runs on user-profile.html. Shows the employee from ?id=EMP-xxxx (Rohan,
// EMP-1042, when there's no id) and wires Reveal, Deactivate/Reactivate,
// Delete and Reset password. Cards with no data behind them yet stay as static
// HTML.

import { getUser, getAllUsers, getAllDepartments, deactivateUser, reactivateUser, deleteUser, reportingManagerName, leavingDate, leavingPeriods } from "../data/store.js";
import { DEPARTMENTS } from "../data/users.js";
import { ROLES, overridesOf } from "../config/roles.js";
import { showToast } from "../ui/toast.js";
import { openModal, closeModal } from "../ui/modal.js";
import { resolvePageLink } from "../core/paths.js";
import { getCurrentUserId } from "../core/auth.js";
import { applyPermissions, can } from "../core/rbac.js";
import { el, formatDay, plural, todayIso } from "../ui/leave-view.js";
import { maskAccount, maskPan } from "../ui/pii.js";
import { salaryFor } from "../data/payroll-store.js";
import { approvalChainText, LEAVE_TYPES, balanceFor } from "../data/leave-store.js";
import { barRow } from "../ui/chart.js";
import { rupees } from "../ui/money.js";
import { allItems, assetsFor } from "../data/inventory-store.js";
import { conditionBadge } from "../ui/inventory-view.js";

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
const deleteBtn = actionButton("Delete");

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

// Whole months from the joining date to today (or to `today` as given), as
// "5 years, 6 months", "3 months" or "Less than a month". Null when there's no
// usable date.
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
  renderLastDay();
  renderTenure();
}

// Days away in someone's past periods (store.js leavingPeriods(), round 12H):
// in each, the days after the last working day and before the day they came
// back, as awayOn() reads them. Whole days, counted in UTC.
function daysAway(person) {
  const day = (iso) => { const d = parseDate(iso); return Date.UTC(d.year, d.month, d.day) / 86400000; };
  return leavingPeriods(person).reduce((sum, p) => sum + Math.max(0, day(p.back) - day(p.lastDay) - 1), 0);
}

// Tenure runs from the joining date to today, or for a leaver to their last
// working day (round 12A; 11Y Y9.9): it stops counting when they leave, and
// follows Deactivate / Reactivate on this page. It keeps its static text when
// there's no joining date on record. Time away in past periods isn't taken off;
// it's noted beside it, "(11 days away)" (round 12Q; round-12h-notes.md H10).
function renderTenure() {
  const last = parseDate(leavingDate(user));
  const tenure = tenureText(user.dateOfJoining, last ? new Date(last.year, last.month, last.day) : new Date());
  const away = daysAway(user);
  if (tenure) setKv("Tenure", away ? `${tenure} (${plural(away, "day", "days")} away)` : tenure);
}

// A leaver's last working day (round 11Y), in a row after "Date of joining";
// no row for anyone else.
function renderLastDay() {
  const rows = Array.from(document.querySelectorAll(".kv__row"));
  const joining = rows.find((r) => r.querySelector("dt")?.textContent.trim() === "Date of joining");
  let row = rows.find((r) => r.querySelector("dt")?.textContent.trim() === "Last working day");
  const last = leavingDate(user);
  if (!last) { row?.remove(); return; }
  if (!row && joining) {
    row = el("div", "kv__row");
    row.append(el("dt", null, "Last working day"), el("dd"));
    joining.after(row);
  }
  if (row) row.querySelector("dd").textContent = formatDay(last, true);
}

// Deactivating asks for the last working day (round 11Y; R8 part iii): the
// store records it, and refuses one later than today, before the joining date,
// or before the end of a month an approved payroll run pays them for. It opens
// on today. Same closing rules as ui/modal.js: the ✕, Cancel, or the backdrop.
const DEACTIVATE_ID = "deactivate-modal";
// The modals' ✕, as ui/leave-decision.js draws it.
function closeIcon() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M6 6l12 12M18 6 6 18");
  svg.append(path);
  return svg;
}
// The equipment they still hold, in words (round 12S; round-12r-notes.md
// R11.3): "They still hold AST-0119 (MacBook Pro 14"). Take it back on Asset
// assignment." Shown, not acted on: taking it back stays on Asset assignment.
// "" when they hold none. The Deactivate dialog notes it (heldNote()), and the
// Delete confirmation adds it (round 12T; round-12s-notes.md S9).
function heldText() {
  const held = assetsFor(user.id).sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
  if (!held.length) return "";
  const names = new Map(allItems().map((i) => [i.sku, i.name]));
  const list = held.map((a) => `${a.id} (${names.get(a.sku) ?? a.sku})`).join(", ");
  return `They still hold ${list}. Take ${held.length === 1 ? "it" : "them"} back on Asset assignment.`;
}

// heldText() as the Deactivate dialog's note (round 12S), or null.
function heldNote() {
  const text = heldText();
  if (!text) return null;
  const note = el("div", "alert alert--warning mt-4", text);
  note.id = `${DEACTIVATE_ID}-assets`;
  return note;
}

function deactivateDialog() {
  document.getElementById(DEACTIVATE_ID)?.remove();
  const root = el("div", "modal");
  root.id = DEACTIVATE_ID;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", `${DEACTIVATE_ID}-title`);
  const dialog = el("div", "modal__dialog modal__dialog--sm");
  const header = el("div", "modal__header");
  const heading = el("div");
  const title = el("h3", "modal__title", `Deactivate ${user.name}`);
  title.id = `${DEACTIVATE_ID}-title`;
  heading.append(title, el("p", "modal__desc", "They'll no longer show as active. Their pay runs to their last working day."));
  const close = el("button", "modal__close");
  close.type = "button";
  close.append(closeIcon());
  close.setAttribute("aria-label", "Close");
  header.append(heading, close);
  const form = el("form");
  form.noValidate = true;
  const body = el("div", "modal__body");
  const field = el("div", "form-field");
  const label = el("label", "form-label form-label--required", "Last working day");
  label.htmlFor = "deactivate-date";
  const input = el("input", "input");
  input.type = "date";
  input.id = "deactivate-date";
  input.value = todayIso();
  input.max = todayIso();
  field.append(label, input);
  body.append(field);
  const held = heldNote();
  if (held) body.append(held);
  const footer = el("div", "modal__footer");
  const cancel = el("button", "btn", "Cancel");
  cancel.type = "button";
  const submit = el("button", "btn btn--danger", "Deactivate");
  submit.type = "submit";
  footer.append(cancel, submit);
  form.append(body, footer);
  dialog.append(header, form);
  root.append(dialog);
  document.body.append(root);
  const hide = () => { closeModal(DEACTIVATE_ID); root.remove(); };
  close.addEventListener("click", hide);
  cancel.addEventListener("click", hide);
  root.addEventListener("click", (e) => { if (e.target === root) hide(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    field.querySelector(".form-error")?.remove();
    const result = deactivateUser(getCurrentUserId(), user.id, input.value);
    if (!result.ok && result.field === "dateOfLeaving") {
      const error = el("span", "form-error", result.error);
      error.id = "deactivate-date-error";
      field.append(error);
      input.setAttribute("aria-describedby", error.id);
      input.focus();
      return;
    }
    hide();
    if (!result.ok) {
      showToast(result.error, "danger");
      return;
    }
    user = result.record;
    renderStatus();
    showToast(`${user.name} deactivated. Last working day: ${formatDay(leavingDate(user), true)}.`, "success");
  });
  openModal(DEACTIVATE_ID);
  input.focus();
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

// The equipment assigned to this person now (data/inventory-store.js), as
// my-assets.html shows the person themselves. users:view (the page's route)
// is enough to see it (decision 16).
function renderAssets() {
  const card = cardTitled("Assets");
  if (!card) return;
  const mine = assetsFor(user.id).sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
  if (!mine.length) {
    emptyCard("Assets", "No assets assigned", 0);
    return;
  }
  const names = new Map(allItems().map((i) => [i.sku, i.name]));
  const list = el("div", "list");
  list.append(...mine.map((asset) => {
    const item = el("div", "list__item");
    const content = el("div", "list__content");
    const sub = el("span", "list__sub");
    sub.append(el("span", "asset-tag", asset.id), ` since ${formatDay(asset.since, true)}`);
    content.append(el("span", "list__title", names.get(asset.sku) ?? asset.sku), sub);
    item.append(content, conditionBadge(asset.condition));
    return item;
  }));
  Array.from(card.children).filter((c) => !c.classList.contains("card__header")).forEach((c) => c.remove());
  card.append(list);
  const meta = card.querySelector(".card__meta");
  if (meta) meta.textContent = String(mine.length);
}

// Their leave left, from data/leave-store.js's balanceFor(), as the employee
// dashboard's Leave balance card shows it: each type with an allowance (this
// year; work from home this month), and how much of it is left.
const LEAVE_SHORT = { casual: "Casual", sick: "Sick", earned: "Earned", wfh: "WFH" };
function renderLeave() {
  const card = cardTitled("Leave balance");
  if (!card) return;
  const balance = balanceFor(user.id);
  const rows = LEAVE_TYPES.filter((type) => balance[type].allowance !== null);
  const body = el("div", "card__body");
  body.append(...rows.map((type) => {
    const b = balance[type];
    const share = Math.min(100, Math.max(0, Math.round((b.left / b.allowance) * 100)));
    return barRow(LEAVE_SHORT[type] ?? type, String(b.left), share);
  }));
  body.append(el("p", "text-xs text-muted mt-4", "Days left this year; work from home, this month."));
  Array.from(card.children).filter((c) => !c.classList.contains("card__header")).forEach((c) => c.remove());
  card.append(body);
  const meta = card.querySelector(".card__meta");
  if (meta) meta.textContent = todayIso().slice(0, 4);
}

function renderOverrides() {
  const card = cardTitled("Permission overrides");
  if (!card) return;
  // The overrides that apply (round 11R): anything stored outside the allow-list, or on an Admin, isn't shown.
  const { grants, denies } = overridesOf(user);
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

  // Details (Tenure is set with the status: renderTenure()).
  setKv("Work email", orDash(user.email));
  setKv("Phone", orDash(user.phone));
  setKv("Location", orDash(user.location));
  setKv("Employment type", orDash(user.employmentType));
  setKv("Department", orDash(dept));
  setKv("Reporting manager", orDash(reportingManagerName(user)));
  setKv("Date of joining", orDash(user.dateOfJoining));

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

  // Access. The approval chain is the one this person's leave and corrections
  // really go through. Nothing records or enforces two-factor sign-in, and no
  // sign-ins are logged (the session keeps only when this browser last picked
  // a demo role), so those two rows say so, muted, in place of the HTML's
  // static values (round 11F: "On" on every profile; round 11G: "Today, 09:10").
  setKv("Designation", orDash(user.designation));
  setKv("Default role", role?.label ?? user.role);
  setKv("Data scope", role?.dataScope === "all" ? "All records" : "Own records");
  setKv("Approval chain", approvalChainText(user.id));
  for (const label of ["Two-factor sign-in", "Last sign-in"]) {
    const dd = kvDd(label);
    if (!dd) continue;
    dd.textContent = "Not recorded yet";
    dd.classList.add("text-muted");
  }

  renderOverrides();
  renderAssets();
  renderLeave();
  // No data source exists for this yet (no activity log), so say so instead of showing Rohan's sample content.
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
  if (deactivating) {   // asks for the last working day first (round 11Y)
    deactivateDialog();
    return;
  }
  if (!window.confirm(`Reactivate ${user.name}?`)) return;

  // Who is acting: the store checks their record (round 10Y; it held a non-Admin to its rule from round 9Y).
  const result = reactivateUser(getCurrentUserId(), user.id);   // deactivating went to the dialog above (round 12R)
  if (!result.ok) {
    showToast(result.error, "danger");
    return;
  }
  user = result.record;
  renderStatus();
  showToast(`${user.name} reactivated.`, "success");
});

// Delete (round 11N; users:delete, Admin only). deleteUser() decides who can't
// be deleted (your own account, the demo sign-in identities, the last Admin, and
// anyone something still depends on: an approver, a waiting salary change, an
// approved payroll run, or a request of their own still open, round 13H) and the
// toast gives its reason. A deleted person's salary record, closed requests and
// held assets stay (named from the deleted-names record, round 13I); with nobody
// left to show, the page goes back to the list.
deleteBtn?.addEventListener("click", () => {
  if (user.id === getCurrentUserId()) {
    showToast("You can't delete your own account.", "danger");
    return;
  }
  const held = heldText();   // round 12T: what they still hold, in the Deactivate dialog's words
  if (!window.confirm(`Delete ${user.name}? They'll be removed from the employee list. Only Reset demo data brings them back.${held ? `\n\n${held}` : ""}`)) return;
  const result = deleteUser(getCurrentUserId(), user.id);
  if (!result.ok) {
    showToast(result.error, "danger");
    return;
  }
  showToast(`${user.name} deleted.`, "success");
  setTimeout(() => {
    window.location.href = resolvePageLink("users/users-list.html");
  }, 1200);
});

// Demo only: nothing is sent or saved, the note is just on screen, and the
// toast says so (round 11L; it said "Reset link sent to … (demo)." while
// Forgot password and Reset password say no reset link is sent).
resetBtn?.addEventListener("click", () => {
  if (!window.confirm(`Send a password reset to ${user.email}?`)) return;
  showToast(`Passwords aren't part of OfficeOS yet: no reset link was sent to ${user.email}.`, "info");

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