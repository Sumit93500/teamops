// pages/salary-structure.js
// Runs on salary-structure.html. Draws the salary components straight from
// data/payroll.js's SALARY_COMPONENTS, every tracked person's salary from
// data/payroll-store.js (with search and a department filter), and the example
// card: one person's monthly breakdown and salary history. A row's "Breakdown"
// button makes that person the example; it starts as the first person in the
// table. Nothing here works out pay; computePay() does.
//
// A person's Edit (salary:edit) opens a small form and saves a new salary
// through payroll-store.js setSalary() (round 12W; R9b): a monthly gross from
// the 1st of a month, with setSalary()'s refusals shown as it words them. A
// component's Edit and Add component stay placeholders.

import { SALARY_COMPONENTS, computePay } from "../data/payroll.js";
import { salaryFor, salaryHistory, setSalary } from "../data/payroll-store.js";
import { getAllUsers } from "../data/store.js";
import { can, applyPermissions } from "../core/rbac.js";
import { el, todayIso, formatDay, plural, personCell, fillDepartmentSelect } from "../ui/leave-view.js";
import { initPlaceholders } from "../ui/placeholder.js";
import { rupees } from "../ui/money.js";
import { getCurrentUserId } from "../core/auth.js";
import { openModal, closeModal } from "../ui/modal.js";
import { showToast } from "../ui/toast.js";

const TYPE = {
  earning:   { label: "Earning",   badge: "badge badge--success badge--square" },
  deduction: { label: "Deduction", badge: "badge badge--danger badge--square" },
};
const TAXABLE = new Map([[true, "Yes"], ["partly", "Partly"], [false, "No"], [null, "–"]]);
const ACTIVE = "badge badge--success badge--dot";
const DUE = "badge badge--warning badge--dot";
const NONE = "badge badge--danger badge--dot";

const $ = (id) => document.getElementById(id);
const field = (name) => document.querySelector(`[data-field="${name}"]`);
const people = (n) => plural(n, "employee", "employees");
const byName = (a, b) => a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id, "en", { numeric: true });

let searchText = "";
let departmentFilter = "";   // "" = all, or a department code
let exampleId = null;
let allRows = [];   // salaryRows() for this month; read again after a salary is saved

// ---------- salary components ----------

// The formula text as data/payroll.js writes it, with a capital letter; a fixed
// amount ("fixed 1600") is shown in rupees a month, like the rest of the page.
function formulaText(formula) {
  const fixed = /^fixed (\d+)$/.exec(formula);
  if (fixed) return `Fixed ${rupees(Number(fixed[1]))} a month`;
  return `${formula.charAt(0).toUpperCase()}${formula.slice(1)}`;
}

function editButton() {
  const button = el("button", "btn btn--sm", "Edit");
  button.type = "button";
  button.dataset.permission = "salary:edit";
  button.dataset.notImplemented = "Edit";
  return button;
}

// Every component is "Active": computePay() applies all of them.
function renderComponents() {
  const rows = SALARY_COMPONENTS.map((c) => {
    const name = el("td");
    name.append(el("span", "table__user-name", c.name));
    const type = el("td");
    type.append(el("span", TYPE[c.type]?.badge ?? "badge", TYPE[c.type]?.label ?? c.type));
    const status = el("td");
    status.append(el("span", ACTIVE, "Active"));
    const actions = el("td", "table__actions");
    actions.append(editButton());
    const tr = el("tr");
    tr.dataset.component = c.key;
    tr.append(name, type, el("td", "", formulaText(c.formula)), el("td", "", TAXABLE.get(c.taxable) ?? "–"), status, actions);
    return tr;
  });
  const tbody = $("salary-components");
  tbody.replaceChildren(...rows);
  applyPermissions(tbody);
  initPlaceholders(tbody);
  $("salary-components-meta").textContent = plural(SALARY_COMPONENTS.length, "component", "components");
}

// ---------- each person's salary ----------

// One row per tracked (not inactive) person, by name: the salary record in
// effect this month (salaryFor), a month's pay on it with no loss of pay
// (computePay), every record newest first (salaryHistory), and the ones newer
// than the one in effect, which payroll hasn't started using yet.
function salaryRows(year, month) {
  return getAllUsers().filter((u) => u.status !== "inactive").sort(byName).map((user) => {
    const current = salaryFor(user.id, year, month);
    const history = salaryHistory(user.id);
    const upcoming = current ? history.slice(0, history.findIndex((s) => s.id === current.id)) : history;
    return { user, current, history, upcoming, pay: current ? computePay(current.gross) : null };
  });
}

// Cost to the company: gross plus the employer's PF, each month.
const monthlyCost = (pay) => pay.gross + pay.employerPf;

function statusOf(row) {
  const next = row.upcoming.at(-1);   // the soonest of the records not in effect yet
  if (!row.current && next) return { label: `Starts ${formatDay(next.effectiveFrom, true)}`, badge: DUE, title: `${rupees(next.gross)} a month from ${formatDay(next.effectiveFrom, true)}` };
  if (!row.current) return { label: "No salary on file", badge: NONE, title: "" };
  if (next) return { label: `Revision due ${formatDay(next.effectiveFrom, true)}`, badge: DUE, title: `${rupees(next.gross)} a month from ${formatDay(next.effectiveFrom, true)}` };
  return { label: "Active", badge: ACTIVE, title: "" };
}

function visibleRows(rows) {
  const query = searchText.trim().toLowerCase();
  return rows.filter((r) =>
    (!departmentFilter || r.user.department === departmentFilter)
    && (!query || r.user.name.toLowerCase().includes(query)));
}

// ---------- changing a salary (round 12W; R9b) ----------

const SALARY_ID = "salary-modal";

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

// This month's rows, read again (after a save).
function currentRows() {
  const today = todayIso();
  return salaryRows(Number(today.slice(0, 4)), Number(today.slice(5, 7)));
}

// A person's Edit, on salary:edit as before. On your own row it's disabled,
// with setSalary()'s reason on hover, rather than inviting a change it refuses.
function salaryEditButton(row) {
  const button = el("button", "btn btn--sm", "Edit");
  button.type = "button";
  button.dataset.permission = "salary:edit";
  if (row.user.id === getCurrentUserId()) {
    button.disabled = true;
    button.title = "You can't change your own salary.";
  } else {
    button.addEventListener("click", () => salaryDialog(row));
  }
  return button;
}

// The form for one person: the monthly gross (theirs now, to start from) and
// the month it takes effect, sent to setSalary() as that month's 1st. Its
// refusals are shown as it words them: under the field it names, else as a
// toast. Saved, the rows are read again: a record dated in a later month shows
// as "Revision due" and in the history, and becomes the gross in its month.
// Same closing rules as ui/modal.js: the ✕, Cancel, or the backdrop.
function salaryDialog(row) {
  const { user, current } = row;
  document.getElementById(SALARY_ID)?.remove();
  const root = el("div", "modal");
  root.id = SALARY_ID;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", `${SALARY_ID}-title`);
  const dialog = el("div", "modal__dialog modal__dialog--sm");
  const header = el("div", "modal__header");
  const heading = el("div");
  const title = el("h3", "modal__title", `Change ${user.name}'s salary`);
  title.id = `${SALARY_ID}-title`;
  heading.append(title, el("p", "modal__desc", "The new monthly gross is used from the 1st of the month you choose."));
  const close = el("button", "modal__close");
  close.type = "button";
  close.append(closeIcon());
  close.setAttribute("aria-label", "Close");
  header.append(heading, close);
  const form = el("form");
  form.noValidate = true;
  const body = el("div", "modal__body");
  const grossField = el("div", "form-field");
  const grossLabel = el("label", "form-label form-label--required", "Monthly gross (₹)");
  grossLabel.htmlFor = "salary-gross";
  const gross = el("input", "input");
  gross.type = "number";
  gross.id = "salary-gross";
  gross.min = "1";
  gross.step = "1";
  gross.value = current ? String(current.gross) : "";
  grossField.append(grossLabel, gross);
  const monthField = el("div", "form-field mt-4");
  const monthLabel = el("label", "form-label form-label--required", "Takes effect from");
  monthLabel.htmlFor = "salary-month";
  const month = el("input", "input");
  month.type = "month";
  month.id = "salary-month";
  month.value = todayIso().slice(0, 7);
  monthField.append(monthLabel, month);
  body.append(grossField, monthField);
  const footer = el("div", "modal__footer");
  const cancel = el("button", "btn", "Cancel");
  cancel.type = "button";
  const submit = el("button", "btn btn--primary", "Save salary");
  submit.type = "submit";
  footer.append(cancel, submit);
  form.append(body, footer);
  dialog.append(header, form);
  root.append(dialog);
  document.body.append(root);
  const hide = () => { closeModal(SALARY_ID); root.remove(); };
  close.addEventListener("click", hide);
  cancel.addEventListener("click", hide);
  root.addEventListener("click", (e) => { if (e.target === root) hide(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    body.querySelectorAll(".form-error").forEach((x) => x.remove());
    const amount = gross.value.trim() === "" ? undefined : Number(gross.value);
    const from = /^\d{4}-\d{2}$/.test(month.value) ? `${month.value}-01` : month.value;
    const result = setSalary(getCurrentUserId(), user.id, { gross: amount, effectiveFrom: from });
    const at = { gross: [grossField, gross], effectiveFrom: [monthField, month] }[result.field];
    if (!result.ok && at) {
      const [fieldEl, input] = at;
      const error = el("span", "form-error", result.error);
      error.id = `${input.id}-error`;
      fieldEl.append(error);
      input.setAttribute("aria-describedby", error.id);
      input.focus();
      return;
    }
    hide();
    if (!result.ok) {
      showToast(result.error, "danger");
      return;
    }
    allRows = currentRows();
    const saved = allRows.find((r) => r.user.id === user.id);
    if (saved && exampleId === user.id) renderExample(saved);
    renderRows(allRows);
    showToast(`${user.name}'s salary is ${rupees(result.record.gross)} a month from ${formatDay(result.record.effectiveFrom, true)}.`, "success");
  });
  openModal(SALARY_ID);
  gross.focus();
}

function buildRow(row, rows) {
  const { user, current, pay } = row;
  const status = statusOf(row);
  const tr = el("tr");
  tr.dataset.userId = user.id;

  const statusCell = el("td");
  const badge = el("span", status.badge, status.label);
  if (status.title) badge.title = status.title;
  statusCell.append(badge);

  const shown = user.id === exampleId;
  const show = el("button", `btn btn--sm${shown ? " btn--primary" : ""}`, "Breakdown");
  show.type = "button";
  show.setAttribute("aria-pressed", String(shown));
  show.addEventListener("click", () => {
    exampleId = user.id;
    renderExample(row);
    renderRows(rows);
  });
  const group = el("div", "btn-group");
  group.append(show, salaryEditButton(row));
  const actions = el("td", "table__actions");
  actions.append(group);

  tr.append(
    personCell(user.id, user, user.id),
    el("td", "", user.designation || "—"),
    el("td", "table__num", pay ? rupees(pay.gross) : "—"),
    el("td", "table__num", pay ? rupees(monthlyCost(pay) * 12) : "—"),
    el("td", "", current ? formatDay(current.effectiveFrom, true) : "—"),
    statusCell,
    actions,
  );
  return tr;
}

function renderRows(rows) {
  const tbody = $("salary-rows");
  const shown = visibleRows(rows);
  if (shown.length) {
    tbody.replaceChildren(...shown.map((row) => buildRow(row, rows)));
  } else {
    const tr = el("tr");
    const td = el("td", "text-muted", "No employees match these filters.");
    td.colSpan = 7;
    tr.append(td);
    tbody.replaceChildren(tr);
  }
  applyPermissions(tbody);
  initPlaceholders(tbody);
  $("salary-rows-meta").textContent = `Showing ${shown.length} of ${people(rows.length)}`;
}

// ---------- the example card ----------

const signed = (n) => (n > 0 ? `+${rupees(n)}` : n < 0 ? `−${rupees(-n)}` : "no change");

function historyRow(label, value) {
  const row = el("div", "breakdown__row");
  row.append(el("dt", "", label), el("dd", "", value));
  return row;
}

// Every salary record, newest first, with the change from the one before it.
function renderHistory(row) {
  const items = row.history.map((s, i) => {
    const before = row.history[i + 1];
    const label = `From ${formatDay(s.effectiveFrom, true)}${row.upcoming.includes(s) ? " (not in effect yet)" : ""}`;
    return historyRow(label, before ? `${rupees(s.gross)} (${signed(s.gross - before.gross)})` : rupees(s.gross));
  });
  $("salary-history").replaceChildren(...(items.length ? items : [historyRow("No salary records", "—")]));
}

function renderExample(row) {
  $("salary-example-title").textContent = `Example: ${row.user.name}`;
  const { pay } = row;
  $("salary-example-breakdown").hidden = !pay;
  $("salary-example-empty").hidden = Boolean(pay);
  if (pay) {
    Object.entries({
      basic: pay.earnings.basic, hra: pay.earnings.hra, conveyance: pay.earnings.conveyance, special: pay.earnings.special,
      gross: pay.gross, pf: pay.deductionLines.pf, pt: pay.deductionLines.pt, tds: pay.deductionLines.tds,
      deductions: pay.deductions, net: pay.net,
      "cost-gross": pay.gross, "employer-pf": pay.employerPf, "monthly-cost": monthlyCost(pay), "annual-cost": monthlyCost(pay) * 12,
    }).forEach(([name, value]) => { field(name).textContent = rupees(value); });
  }
  renderHistory(row);
}

// ---------- start ----------

// The guard already sends anyone without salary:view to the 403 page; this
// stops the salaries being drawn in the moment before that happens.
if (can("salary:view")) {
  allRows = currentRows();
  const first = allRows.find((r) => r.current) ?? allRows[0];
  renderComponents();
  if (first) {
    exampleId = first.user.id;
    renderExample(first);
  }
  renderRows(allRows);

  const select = $("salary-department");
  fillDepartmentSelect(select);
  $("salary-search").addEventListener("input", (e) => {
    searchText = e.target.value;
    renderRows(allRows);
  });
  select.addEventListener("change", (e) => {
    departmentFilter = e.target.value;
    renderRows(allRows);
  });
}