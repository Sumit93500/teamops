// pages/stock-movements.js
// Runs on stock-movements.html (needs inventory:view: Admin). The stock
// ledger in data/inventory-store.js, newest first, in All / Stock in / Stock
// out / Adjustments / Returns tabs, with search and pagination. Times are
// office time (ui/inventory-view.js).
//
// "Record a movement" (inventory:create) sends the form through
// recordMovement(): every refusal comes from the store and is shown at the
// field it names (the form is novalidate, so there's one source of errors;
// the apply-leave.js / claim-expense.js pattern). Movements are never edited
// or deleted; a mistake is put right with an adjustment, which may be below 0.
// Tagged items (laptops, monitors, access cards) go out and come back on the
// asset register, so Stock out and Return aren't offered for them here; their
// stock figures say how much is tagged and ready to assign when that isn't all
// of it (ui/inventory-view.js's readyToAssign()).

import { getCurrentUserId } from "../core/auth.js";
import { can } from "../core/rbac.js";
import { getAllDepartments } from "../data/store.js";
import { CATEGORY_KEYS, MOVEMENT_TYPE_KEYS } from "../data/inventory.js";
import { allItems, allAssets, allMovements, recordMovement } from "../data/inventory-store.js";
import { movementTypeLabel, movementBadge, signedQty, officeTime, readyToAssign, READY_WORDS } from "../ui/inventory-view.js";
import { el, escapeHtml, nameOf, departmentName } from "../ui/leave-view.js";
import { renderPagination } from "../ui/pagination.js";
import { showToast } from "../ui/toast.js";

const PAGE_SIZE = 10;
const COLUMNS = 6;
const PILL_TAB = { "All": "", "Stock in": "in", "Stock out": "out", "Adjustments": "adjustment", "Returns": "return" };
const EMPTY = {
  "": "No stock movements yet.",
  in: "No stock has come in yet.",
  out: "No stock has gone out yet.",
  adjustment: "No adjustments yet.",
  return: "Nothing has been returned yet.",
};

const $ = (id) => document.getElementById(id);
const pills = Array.from(document.querySelectorAll(".table__toolbar .tabs__tab"));
const tbody = $("movement-rows");

const form = $("movement-form");
const itemSelect = $("m-item");
const typeSelect = $("m-type");
const qtyInput = $("m-qty");
const qtyHint = $("m-qty-hint");
const typeHint = $("m-type-hint");
const refInput = $("m-ref");
const deptField = $("m-dept-field");
const deptSelect = $("m-dept");
const noteInput = $("m-note");

let tab = "";   // "" = All, or a movement type
let search = "";
let currentPage = 1;

// ---------- data ----------

const itemsBySku = () => new Map(allItems().map((i) => [i.sku, i]));

// "6 in stock", or for a tagged item not all of whose stock can be assigned
// "6 in stock, 1 tagged and ready to assign"; when: "now" after recording.
function stockText(item, assets, when = "") {
  const ready = readyToAssign(item, assets);
  return `${item.stock} in stock${when ? ` ${when}` : ""}${ready === null ? "" : `, ${ready} ${READY_WORDS}`}`;
}

// What the Reference column says. A tagged asset's movement names the person
// from the user list (never a stored copy of the name): handed to someone,
// back from someone; without a person it went to or came back from repair.
function referenceText(m) {
  if (m.assetTag && m.holderId) return m.type === "out" ? `Assigned to ${nameOf(m.holderId)}` : `Returned by ${nameOf(m.holderId)}`;
  return m.reference;
}

function matches(m, items) {
  const query = search.trim().toLowerCase();
  if (tab && m.type !== tab) return false;
  if (!query) return true;
  const item = items.get(m.sku);
  return [item?.name ?? "", m.sku, referenceText(m), m.assetTag ?? "", m.department ? departmentName(m.department) : "", m.note]
    .some((text) => text.toLowerCase().includes(query));
}

// ---------- table ----------

function itemCell(m, item) {
  const td = el("td");
  td.append(el("span", "table__user-name", item?.name ?? m.sku), el("div", "text-sm text-muted", m.sku));
  return td;
}

// The reference, the asset's tag, and the department stock was issued to.
function referenceCell(m) {
  const td = el("td");
  td.append(el("span", "", referenceText(m)));
  if (m.assetTag) td.append(" ", el("span", "asset-tag", m.assetTag));
  if (m.department) td.append(el("div", "text-sm text-muted", `Issued to ${departmentName(m.department)}`));
  if (m.note) td.append(el("div", "text-sm text-muted", m.note));
  return td;
}

function row(m, item) {
  const type = el("td");
  type.append(movementBadge(m.type));
  const qty = el("td", "table__num");
  qty.append(signedQty(m.change));
  const tr = el("tr");
  tr.dataset.movementId = m.id;
  tr.append(el("td", "", officeTime(m.at)), itemCell(m, item), type, qty, referenceCell(m), el("td", "", nameOf(m.recordedBy)));
  return tr;
}

function renderTable() {
  const items = itemsBySku();
  const rows = allMovements().filter((m) => matches(m, items));
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (pageRows.length) {
    tbody.replaceChildren(...pageRows.map((m) => row(m, items.get(m.sku))));
  } else {
    const td = el("td", "text-muted", search.trim() ? "No movements match this search." : EMPTY[tab]);
    td.colSpan = COLUMNS;
    const tr = el("tr");
    tr.append(td);
    tbody.replaceChildren(tr);
  }

  renderPagination($("movement-pagination"), {
    totalItems: rows.length,
    pageSize: PAGE_SIZE,
    currentPage,
    onPageChange: (page) => {
      currentPage = page;
      renderTable();
    },
  });
}

function pillTab(pill) {
  return PILL_TAB[pill.textContent.trim()] ?? "";
}

// ---------- the form: errors (the apply-leave.js pattern) ----------

// Where each field named by recordMovement()'s result.field shows its error.
const FIELD = { sku: itemSelect, type: typeSelect, quantity: qtyInput, reference: refInput, department: deptSelect };

function clearError(input) {
  const scope = input ? input.closest(".form-field") : form;
  scope?.querySelectorAll(".form-error").forEach((error) => error.remove());
  (input ? [input] : Object.values(FIELD)).forEach((i) => i?.removeAttribute("aria-describedby"));
}

function showError(input, message) {
  clearError();
  const error = el("span", "form-error", message);
  error.id = `${input.id}-error`;
  input.closest(".form-field").appendChild(error);
  input.setAttribute("aria-describedby", error.id);
  input.focus();
}

// ---------- the form: what it offers ----------

function fillItems() {
  const choose = el("option", "", "Select item");
  choose.value = "";
  const items = allItems().sort((a, b) => CATEGORY_KEYS.indexOf(a.category) - CATEGORY_KEYS.indexOf(b.category)
    || a.sku.localeCompare(b.sku, "en", { numeric: true }));
  const assets = allAssets();
  itemSelect.replaceChildren(choose, ...items.map((item) => {
    const option = el("option", "", `${item.name} (${item.sku}), ${stockText(item, assets)}`);
    option.value = item.sku;
    option.dataset.tagged = String(Boolean(item.assetType));
    return option;
  }));
}

function fillTypes() {
  typeSelect.replaceChildren(...MOVEMENT_TYPE_KEYS.map((key) => {
    const option = el("option", "", movementTypeLabel(key));
    option.value = key;
    return option;
  }));
}

function fillDepartments() {
  const none = el("option", "", "Not issued to a department");
  none.value = "";
  deptSelect.replaceChildren(none, ...getAllDepartments().map((d) => {
    const option = el("option", "", d.name);
    option.value = d.code;
    return option;
  }));
}

// Keeps the form in step with the item and type chosen: a tagged item can't
// go out or come back here; an adjustment may be below 0; only a stock-out
// can be issued to a department.
function updateForm() {
  const tagged = itemSelect.selectedOptions[0]?.dataset.tagged === "true";
  for (const option of typeSelect.options) option.disabled = tagged && (option.value === "out" || option.value === "return");
  if (typeSelect.selectedOptions[0]?.disabled) typeSelect.value = "in";
  typeHint.hidden = !tagged;

  const adjustment = typeSelect.value === "adjustment";
  if (adjustment) qtyInput.removeAttribute("min");
  else qtyInput.min = "1";
  qtyHint.textContent = adjustment ? "A whole number other than 0. Below 0 takes stock away." : "A whole number, at least 1.";

  const out = typeSelect.value === "out";
  deptField.hidden = !out;
  if (!out) deptSelect.value = "";
}

// ---------- the form: sending ----------

function submit(e) {
  e.preventDefault();
  clearError();
  const result = recordMovement(getCurrentUserId(), {
    sku: itemSelect.value,
    type: typeSelect.value,
    quantity: qtyInput.value,
    reference: refInput.value,
    note: noteInput.value,
    department: deptSelect.value,
  });

  if (!result.ok) {
    const input = FIELD[result.field];
    if (input) showError(input, result.error);
    else showToast(escapeHtml(result.error), "danger");
    return;
  }

  const item = allItems().find((i) => i.sku === result.record.sku);
  const change = result.record.change > 0 ? `+${result.record.change}` : String(result.record.change);
  showToast(escapeHtml(`Recorded: ${movementTypeLabel(result.record.type)}, ${change} ${item?.name ?? result.record.sku}. ${item ? stockText(item, allAssets(), "now") : ""}.`), "success");
  form.reset();
  fillItems();   // the stock counts in the item list
  updateForm();
  currentPage = 1;
  renderTable();
}

// ---------- start ----------

// can() matters because guard.js only redirects; this script would still run.
if (can("inventory:view") && tbody) {
  $("movement-search")?.addEventListener("input", (e) => {
    search = e.target.value;
    currentPage = 1;
    renderTable();
  });
  // ui/tabs.js already moves the is-active highlight between pills on click.
  pills.forEach((pill) => pill.addEventListener("click", () => {
    tab = pillTab(pill);
    currentPage = 1;
    renderTable();
  }));
  renderTable();

  if (can("inventory:create") && form && itemSelect && typeSelect && qtyInput && refInput && deptSelect) {
    fillItems();
    fillTypes();
    fillDepartments();
    updateForm();
    Object.values(FIELD).forEach((input) => input.addEventListener("input", () => clearError(input)));
    itemSelect.addEventListener("change", () => { clearError(itemSelect); updateForm(); });
    typeSelect.addEventListener("change", () => { clearError(typeSelect); updateForm(); });
    form.addEventListener("submit", submit);
  }
}