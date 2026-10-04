// pages/asset-assignment.js
// Runs on asset-assignment.html (needs assets:view: Admin). The asset register
// in data/inventory-store.js: All / Assigned / Available / In repair tabs, a
// type filter, search by tag, asset or person, and pagination; the stat strip
// from the same assets.
//
// With assets:assign (Admin):
//   - "Assign an asset" hands an available asset to an active person
//     (assignAsset: a stock-out of one unit of its item). A row's Assign fills
//     the form with that asset.
//   - Each row's Update opens one modal with what fits the asset now: Return
//     to the store or Send for repair while assigned, Send for repair while
//     available, Back from repair while in repair (returnAsset,
//     sendForRepair, returnFromRepair).
// Every refusal comes from the store and is shown at the field it names (the
// stock-movements.js pattern). People can leave while holding equipment
// (Q8: warn, don't block): such rows say "Inactive" next to the name, and an
// alert above the table counts them.
//
// The "Pending asset requests" card is a static sample: asset requests come in
// a later round.

import { getCurrentUserId } from "../core/auth.js";
import { can, applyPermissions } from "../core/rbac.js";
import { getUser, getAllUsers } from "../data/store.js";
import { dayNumber } from "../data/holidays.js";
import { ASSET_TYPE_KEYS, CONDITION_KEYS, LOCATION_KEYS } from "../data/inventory.js";
import {
  allAssets, allItems, assetTypeOf, assetTotals, assetsHeldByInactive, assignAsset, returnAsset, sendForRepair, returnFromRepair,
} from "../data/inventory-store.js";
import {
  assetTypeLabel, conditionLabel, locationLabel, conditionBadge, assetStatusBadge, officeDate,
} from "../ui/inventory-view.js";
import { el, escapeHtml, formatDay, plural, nameOf, departmentName, personCell, todayIso } from "../ui/leave-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";
import { renderPagination } from "../ui/pagination.js";
import { openModal, closeModal } from "../ui/modal.js";
import { showToast } from "../ui/toast.js";

const PAGE_SIZE = 10;
const COLUMNS = 7;
const LONG_REPAIR_DAYS = 14;   // "over 2 weeks", as the stat has always said
const PILL_TAB = { "All": "", "Assigned": "assigned", "Available": "available", "In repair": "in-repair" };
const EMPTY = {
  "": "No assets on the register yet.",
  assigned: "No assets are assigned.",
  available: "No assets are available to assign.",
  "in-repair": "Nothing is in repair.",
};

const $ = (id) => document.getElementById(id);
const stat = (key) => document.querySelector(`[data-stat="${key}"]`);

const pills = Array.from(document.querySelectorAll(".table__toolbar .tabs__tab"));
const tbody = $("asset-rows");

let tab = "";
let type = "";     // "" = all types, or an asset type key
let search = "";
let currentPage = 1;

// ---------- data ----------

const itemsBySku = () => new Map(allItems().map((i) => [i.sku, i]));
const isActive = (user) => Boolean(user) && user.status !== "inactive";
const byTag = (a, b) => a.id.localeCompare(b.id, "en", { numeric: true });

// The history entry that sent an asset in repair to the vendor (the latest one).
const repairEntry = (asset) => [...asset.history].reverse().find((h) => h.action === "sent-to-repair") ?? null;

// The office-time day it went to the vendor, or null (sent before the register was kept).
const repairDay = (asset) => (repairEntry(asset) ? officeDate(repairEntry(asset).at) : null);

function matches(asset, items) {
  if (tab && asset.status !== tab) return false;
  if (type && assetTypeOf(asset) !== type) return false;
  const query = search.trim().toLowerCase();
  if (!query) return true;
  const holder = asset.holderId ? nameOf(asset.holderId) : "";
  return [asset.id, items.get(asset.sku)?.name ?? "", holder].some((text) => text.toLowerCase().includes(query));
}

// ---------- table ----------

function assetCell(asset, item) {
  const td = el("td");
  td.append(el("span", "table__user-name", item?.name ?? asset.sku), el("div", "text-sm text-muted", assetTypeLabel(assetTypeOf(asset))));
  return td;
}

// The person holding it (with "Inactive" if they've left: Q8), or where it is.
function holderCell(asset) {
  if (asset.status === "assigned") {
    const user = getUser(asset.holderId);
    const td = personCell(asset.holderId, user, user ? departmentName(user.department) : "No longer on the employee list");
    if (!isActive(user)) td.querySelector(".table__user-name").after(" ", el("span", "badge badge--dot", "Inactive"));
    return td;
  }
  return el("td", "text-muted", asset.status === "in-repair" ? "With vendor" : locationLabel(asset.location));
}

function sinceCell(asset) {
  if (asset.status === "assigned" && asset.since) return el("td", "", formatDay(asset.since, true));
  const day = asset.status === "in-repair" ? repairDay(asset) : null;
  return el("td", day ? "text-muted" : "", day ? `Sent ${formatDay(day, true)}` : "–");
}

function actionsCell(asset) {
  const td = el("td", "table__actions");
  const group = el("div", "btn-group");
  if (asset.status === "available") {
    const assign = el("button", "btn btn--primary btn--sm", "Assign");
    assign.type = "button";
    assign.dataset.permission = "assets:assign";
    assign.addEventListener("click", () => startAssign(asset.id));
    group.append(assign);
  }
  const update = el("button", "btn btn--sm", "Update");
  update.type = "button";
  update.dataset.permission = "assets:assign";
  update.addEventListener("click", () => openUpdate(asset.id));
  group.append(update);
  td.append(group);
  return td;
}

function row(asset, items) {
  const tag = el("td");
  tag.append(el("span", "asset-tag", asset.id));
  const condition = el("td");
  condition.append(conditionBadge(asset.condition));
  const status = el("td");
  status.append(assetStatusBadge(asset.status));
  const tr = el("tr");
  tr.dataset.tag = asset.id;
  tr.append(tag, assetCell(asset, items.get(asset.sku)), holderCell(asset), sinceCell(asset), condition, status, actionsCell(asset));
  return tr;
}

function renderTable(assets) {
  const items = itemsBySku();
  const rows = assets.filter((a) => matches(a, items)).sort(byTag);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (pageRows.length) {
    tbody.replaceChildren(...pageRows.map((a) => row(a, items)));
  } else {
    const td = el("td", "text-muted", search.trim() || type ? "No assets match these filters." : EMPTY[tab]);
    td.colSpan = COLUMNS;
    const tr = el("tr");
    tr.append(td);
    tbody.replaceChildren(tr);
  }
  applyPermissions(tbody);

  renderPagination($("asset-pagination"), {
    totalItems: rows.length,
    pageSize: PAGE_SIZE,
    currentPage,
    onPageChange: (page) => {
      currentPage = page;
      renderTable(allAssets());
    },
  });
}

// ---------- stat strip and the Q8 alert ----------

function renderStats(assets) {
  const totals = assetTotals(assets);
  const { assigned, available } = totals.byStatus;
  const repair = totals.byStatus["in-repair"];
  setStatValue(stat("total"), String(totals.total));
  setStatNote(stat("total"), ASSET_TYPE_KEYS.map((k) => `${totals.byType[k]} ${assetTypeLabel(k).toLowerCase()}${totals.byType[k] === 1 ? "" : "s"}`).join(", "));
  setStatValue(stat("assigned"), String(assigned));
  setStatNote(stat("assigned"), totals.total ? `${Math.round((assigned / totals.total) * 100)}% of all assets` : "No assets yet");
  setStatValue(stat("available"), String(available));
  setStatNote(stat("available"), available ? "Ready to assign" : "Nothing to assign", available ? "up" : "");
  setStatValue(stat("repair"), String(repair));
  const today = dayNumber(todayIso());
  const long = assets.filter((a) => a.status === "in-repair" && repairDay(a) && today - dayNumber(repairDay(a)) > LONG_REPAIR_DAYS).length;
  setStatNote(stat("repair"), repair ? (long ? `${long} for over 2 weeks` : "None for over 2 weeks") : "Nothing in repair", long ? "down" : "");
}

function renderInactiveAlert() {
  const alert = $("inactive-alert");
  if (!alert) return;
  const held = assetsHeldByInactive().sort(byTag);
  alert.hidden = held.length === 0;
  if (!held.length) return;
  const list = held.map((a) => `${a.id} (${nameOf(a.holderId)})`).join(", ");
  alert.textContent = `${plural(held.length, "asset is", "assets are")} still assigned to people who are inactive: ${list}. Take ${held.length === 1 ? "it" : "them"} back with Update, then Return to the store.`;
}

// ---------- the Assign form ----------

const form = $("assign-form");
const assetSelect = $("a-asset");
const personSelect = $("a-person");
const dateInput = $("a-date");
const condSelect = $("a-cond");

function clearError(input, scope = form) {
  const where = input ? input.closest(".form-field") : scope;
  where?.querySelectorAll(".form-error").forEach((error) => error.remove());
  if (input) input.removeAttribute("aria-describedby");
  else scope?.querySelectorAll("[aria-describedby]").forEach((i) => i.removeAttribute("aria-describedby"));
}

function showError(input, message, scope = form) {
  clearError(null, scope);
  const error = el("span", "form-error", message);
  error.id = `${input.id}-error`;
  input.closest(".form-field").appendChild(error);
  input.setAttribute("aria-describedby", error.id);
  input.focus();
}

const option = (value, text) => { const o = el("option", "", text); o.value = value; return o; };

function fillAssignForm() {
  const items = itemsBySku();
  const available = allAssets().filter((a) => a.status === "available").sort(byTag);
  const chosen = assetSelect.value;
  assetSelect.replaceChildren(option("", available.length ? "Select available asset" : "Nothing available to assign"),
    ...available.map((a) => option(a.id, `${a.id}, ${items.get(a.sku)?.name ?? a.sku}`)));
  if (available.some((a) => a.id === chosen)) assetSelect.value = chosen;

  const people = getAllUsers().filter(isActive).sort((a, b) => a.name.localeCompare(b.name, "en"));
  const person = personSelect.value;
  personSelect.replaceChildren(option("", "Select employee"), ...people.map((u) => option(u.id, `${u.name}, ${departmentName(u.department)}`)));
  if (people.some((u) => u.id === person)) personSelect.value = person;

  condSelect.replaceChildren(...CONDITION_KEYS.map((k) => option(k, conditionLabel(k))));
  syncCondition();
}

// The condition starts as the chosen asset's own.
function syncCondition() {
  const asset = allAssets().find((a) => a.id === assetSelect.value);
  if (asset) condSelect.value = asset.condition;
}

const ASSIGN_FIELD = { holderId: personSelect, date: dateInput, condition: condSelect };

function submitAssign(e) {
  e.preventDefault();
  clearError();
  if (!assetSelect.value) {
    showError(assetSelect, "Choose an asset.");
    return;
  }
  const tag = assetSelect.value;
  const result = assignAsset(getCurrentUserId(), tag, { holderId: personSelect.value, date: dateInput.value, condition: condSelect.value });
  if (!result.ok) {
    const input = ASSIGN_FIELD[result.field];
    if (input) showError(input, result.error);
    else showError(assetSelect, result.error);
    return;
  }
  showToast(escapeHtml(`${tag} assigned to ${nameOf(result.record.holderId)}.`), "success");
  form.reset();
  render();
}

// A row's Assign: the form, with that asset chosen.
function startAssign(tag) {
  fillAssignForm();
  assetSelect.value = tag;
  syncCondition();
  clearError();
  form.scrollIntoView?.({ block: "nearest" });
  personSelect.focus();
}

// ---------- the Update modal ----------

const modal = $("asset-modal");
const modalForm = $("asset-modal-form");
const actionSelect = $("u-action");
const uCond = $("u-cond");
const uLoc = $("u-loc");
const uNote = $("u-note");
let updating = null;   // the tag the modal is open for

// What can happen next, by status (data/inventory-store.js's own rules).
const ACTIONS = {
  assigned: [["return", "Return to the store"], ["repair", "Send for repair"]],
  available: [["repair", "Send for repair"]],
  "in-repair": [["repaired", "Back from repair"]],
};

// Return and Back from repair ask where it goes and in what state; Send for repair asks what's wrong.
function syncModal() {
  const repair = actionSelect.value === "repair";
  $("u-cond-field").hidden = repair;
  $("u-loc-field").hidden = repair;
  $("u-note-field").hidden = !repair;
}

function openUpdate(tag) {
  const asset = allAssets().find((a) => a.id === tag);
  if (!asset || !modal) return;
  updating = tag;
  const item = itemsBySku().get(asset.sku);
  $("asset-modal-title").textContent = `Update ${tag}`;
  const where = asset.status === "assigned" ? `assigned to ${nameOf(asset.holderId)}`
    : asset.status === "available" ? `available in ${locationLabel(asset.location)}` : "in repair, with the vendor";
  $("asset-modal-desc").textContent = `${item?.name ?? asset.sku}, ${where}.`;
  actionSelect.replaceChildren(...ACTIONS[asset.status].map(([v, t]) => option(v, t)));
  uCond.replaceChildren(option("", "Select condition"), ...CONDITION_KEYS.map((k) => option(k, conditionLabel(k))));
  uCond.value = asset.condition;
  uLoc.replaceChildren(option("", "Select location"), ...LOCATION_KEYS.map((k) => option(k, locationLabel(k))));
  uLoc.value = item?.location ?? "";
  uNote.value = "";
  clearError(null, modalForm);
  syncModal();
  openModal("asset-modal");
}

const UPDATE_FIELD = { condition: uCond, location: uLoc, note: uNote };
const DONE = { return: "returned to the store", repair: "sent for repair", repaired: "back from repair" };

function submitUpdate(e) {
  e.preventDefault();
  clearError(null, modalForm);
  const tag = updating;
  const action = actionSelect.value;
  const actor = getCurrentUserId();
  const fields = { condition: uCond.value, location: uLoc.value };
  const result = action === "return" ? returnAsset(actor, tag, fields)
    : action === "repaired" ? returnFromRepair(actor, tag, fields)
    : sendForRepair(actor, tag, uNote.value);
  if (!result.ok) {
    const input = UPDATE_FIELD[result.field];
    if (input) showError(input, result.error, modalForm);
    else showToast(escapeHtml(result.error), "danger");
    return;
  }
  closeModal("asset-modal");
  updating = null;
  showToast(escapeHtml(`${tag} ${DONE[action]}.`), "success");
  render();
}

// ---------- start ----------

function render() {
  const assets = allAssets();
  renderTable(assets);
  renderStats(assets);
  renderInactiveAlert();
  if (can("assets:assign") && form) fillAssignForm();
}

// can() matters because guard.js only redirects; this script would still run.
if (can("assets:view") && tbody) {
  const typeFilter = $("asset-type");
  if (typeFilter) {
    typeFilter.replaceChildren(option("", "All types"), ...ASSET_TYPE_KEYS.map((k) => option(k, assetTypeLabel(k))));
    typeFilter.addEventListener("change", () => {
      type = typeFilter.value;
      currentPage = 1;
      renderTable(allAssets());
    });
  }
  $("asset-search")?.addEventListener("input", (e) => {
    search = e.target.value;
    currentPage = 1;
    renderTable(allAssets());
  });
  // ui/tabs.js already moves the is-active highlight between pills on click.
  pills.forEach((pill) => pill.addEventListener("click", () => {
    tab = PILL_TAB[pill.textContent.trim()] ?? "";
    currentPage = 1;
    renderTable(allAssets());
  }));

  if (can("assets:assign") && form && assetSelect && personSelect && dateInput && condSelect) {
    dateInput.max = todayIso();
    Object.values({ assetSelect, ...ASSIGN_FIELD }).forEach((input) => input.addEventListener("input", () => clearError(input)));
    assetSelect.addEventListener("change", () => { clearError(assetSelect); syncCondition(); });
    personSelect.addEventListener("change", () => clearError(personSelect));
    form.addEventListener("submit", submitAssign);
  }
  if (can("assets:assign") && modalForm && actionSelect && uCond && uLoc && uNote) {
    actionSelect.addEventListener("change", () => { clearError(null, modalForm); syncModal(); });
    Object.values(UPDATE_FIELD).forEach((input) => input.addEventListener("input", () => clearError(input)));
    modalForm.addEventListener("submit", submitUpdate);
  }
  render();
}