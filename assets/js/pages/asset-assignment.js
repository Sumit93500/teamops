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
// Problem reports (my-assets.html's "Report a problem";
// data/inventory-store.js's openReportOf()): a reported asset shows "Problem
// reported" by its status, and an alert above the table lists them. Its Update
// modal shows the report and settles it: Send for repair (what's wrong starts
// as the report's text) or Return to the store close it, or "Close the report,
// no action needed" with a note (closeReport).
//
// "Open asset requests" lists every request still open
// (data/asset-requests-store.js), oldest first:
//   - waiting for a decision: Approve / Reject for whoever the store's
//     pendingFor() says decides it now (an Admin with assets:approve at the
//     Admin stage; the requester's manager, by relationship, at the manager
//     stage), the same flow as the approvals inbox (ui/asset-request-view.js).
//     Anyone else sees who it's with.
//   - approved, waiting for an asset (assets:assign): Assign fills the Assign
//     form for that request (the requester, and only available assets of the
//     requested type) and hands one over through fulfilAssetRequest(); Close
//     ends it without an asset, with a note.

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { can, applyPermissions } from "../core/rbac.js";
import { getUser, getAllUsers } from "../data/store.js";
import { dayNumber } from "../data/holidays.js";
import { ASSET_TYPE_KEYS, CONDITION_KEYS, LOCATION_KEYS } from "../data/inventory.js";
import {
  allAssets, allItems, assetTypeOf, assetTotals, assetsHeldByInactive, assignAsset, returnAsset, sendForRepair, returnFromRepair,
  openReportOf, assetsWithOpenReports, closeReport,
} from "../data/inventory-store.js";
import { allAssetRequests, pendingFor, waitingOn, fulfilAssetRequest } from "../data/asset-requests-store.js";
import {
  assetTypeLabel, conditionLabel, locationLabel, conditionBadge, assetStatusBadge, reportBadge, officeDate,
} from "../ui/inventory-view.js";
import { requestTitle, requestBadge, assetRequestFlow, openCloseModal } from "../ui/asset-request-view.js";
import { decisionButtons } from "../ui/leave-decision.js";
import {
  el, escapeHtml, formatDay, plural, nameOf, departmentName, personCell, todayIso, initials, avatarClass,
} from "../ui/leave-view.js";
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
  const report = openReportOf(asset);
  if (report) status.append(" ", reportBadge(report));
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

// Assets with an open problem report, oldest report first.
function renderReportAlert() {
  const alert = $("report-alert");
  if (!alert) return;
  const reported = assetsWithOpenReports();
  alert.hidden = reported.length === 0;
  if (!reported.length) return;
  const list = reported.map((a) => `${a.id} (${nameOf(a.holderId)}, ${formatDay(officeDate(openReportOf(a).at), true)})`).join(", ");
  alert.textContent = `${plural(reported.length, "asset has", "assets have")} a problem reported: ${list}. Open Update to send ${reported.length === 1 ? "it" : "them"} for repair, take ${reported.length === 1 ? "it" : "them"} back, or close the report.`;
}

// ---------- open asset requests ----------

const isOpenRequest = (r) => r.status === "pending" || r.status === "approved";
const oldestFirst = (a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id, "en", { numeric: true });

// What it waits for, and on whom.
function requestStatusText(request, decidable) {
  if (request.status === "approved") return "Approved, waiting for an asset";
  if (decidable) return request.stage === "manager" ? "Waiting for you, as their manager" : "Waiting for your approval";
  const ids = waitingOn(request);
  return ids.length ? `With ${ids.map(nameOf).join(", ")}` : "Nobody can decide this now";
}

// decidable: the store's pendingFor() puts it with the signed-in person now.
function requestItem(request, decidable) {
  const item = el("div", "list__item");
  item.dataset.request = request.id;
  const content = el("div", "list__content");
  content.append(
    el("span", "list__title", `${nameOf(request.userId)}: ${requestTitle(request)}`),
    el("span", "list__sub", request.reason),
    el("span", "list__sub", requestStatusText(request, decidable)),
  );
  let side;
  if (decidable) {
    // The manager stage goes by relationship, so its buttons carry no permission.
    side = decisionButtons(request.stage === "manager" ? null : "assets:approve",
      () => assetRequestFlow.openReject(request, render), () => assetRequestFlow.approve(request, render));
  } else if (request.status === "approved") {
    side = el("div", "btn-group");
    const close = el("button", "btn btn--sm", "Close");
    close.type = "button";
    close.dataset.permission = "assets:assign";
    close.addEventListener("click", () => openCloseModal(request, render));
    const assign = el("button", "btn btn--primary btn--sm", "Assign");
    assign.type = "button";
    assign.dataset.permission = "assets:assign";
    assign.addEventListener("click", () => startFulfil(request));
    side.append(close, assign);
  } else {
    side = requestBadge(request);
  }
  item.append(el("div", avatarClass(request.userId), initials(nameOf(request.userId))), content, side);
  return item;
}

function renderRequests() {
  const list = $("asset-request-list");
  if (!list) return;
  const open = allAssetRequests().filter(isOpenRequest).sort(oldestFirst);
  const decidable = new Set(pendingFor(getCurrentUserId(), getCurrentRole()?.key).map((r) => r.id));
  const meta = $("asset-requests-meta");
  if (meta) meta.textContent = open.length ? `${open.length} open` : "None open";
  list.replaceChildren(...(open.length
    ? open.map((r) => requestItem(r, decidable.has(r.id)))
    : [el("div", "list__item text-muted", "No asset requests are open.")]));
  applyPermissions(list);
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

// The approved request the form is fulfilling, or null for a plain assignment.
let fulfilling = null;

// While fulfilling a request: only available assets of its type, and the
// requester as the only person (even if they've since left: the store then
// refuses, at Employee).
function fillAssignForm() {
  const items = itemsBySku();
  const available = allAssets().filter((a) => a.status === "available" && (!fulfilling || assetTypeOf(a) === fulfilling.assetType)).sort(byTag);
  const chosen = assetSelect.value;
  const none = fulfilling ? `No ${assetTypeLabel(fulfilling.assetType).toLowerCase()} is available to assign` : "Nothing available to assign";
  assetSelect.replaceChildren(option("", available.length ? "Select available asset" : none),
    ...available.map((a) => option(a.id, `${a.id}, ${items.get(a.sku)?.name ?? a.sku}`)));
  if (available.some((a) => a.id === chosen)) assetSelect.value = chosen;

  if (fulfilling) {
    const requester = getUser(fulfilling.userId);
    personSelect.replaceChildren(option(fulfilling.userId, requester ? `${requester.name}, ${departmentName(requester.department)}` : fulfilling.userId));
    personSelect.disabled = true;
  } else {
    const people = getAllUsers().filter(isActive).sort((a, b) => a.name.localeCompare(b.name, "en"));
    const person = personSelect.value;
    personSelect.replaceChildren(option("", "Select employee"), ...people.map((u) => option(u.id, `${u.name}, ${departmentName(u.department)}`)));
    if (people.some((u) => u.id === person)) personSelect.value = person;
    personSelect.disabled = false;
  }

  condSelect.replaceChildren(...CONDITION_KEYS.map((k) => option(k, conditionLabel(k))));
  syncCondition();
  renderFulfilNote();
}

// Says which request the form is for, with a way back to a plain assignment.
function renderFulfilNote() {
  const note = $("a-request");
  if (!note) return;
  note.hidden = !fulfilling;
  if (!fulfilling) {
    note.replaceChildren();
    return;
  }
  const replaces = fulfilling.replacesTag ? ` It replaces ${fulfilling.replacesTag}: take that back with Update once this one is handed over.` : "";
  const stop = el("button", "btn btn--ghost btn--sm", "Assign without a request");
  stop.type = "button";
  stop.addEventListener("click", () => {
    fulfilling = null;
    clearError();
    fillAssignForm();
  });
  note.replaceChildren(`For ${nameOf(fulfilling.userId)}'s ${assetTypeLabel(fulfilling.assetType).toLowerCase()} request (${fulfilling.id}).${replaces} `, stop);
}

// The condition starts as the chosen asset's own.
function syncCondition() {
  const asset = allAssets().find((a) => a.id === assetSelect.value);
  if (asset) condSelect.value = asset.condition;
}

const ASSIGN_FIELD = { holderId: personSelect, date: dateInput, condition: condSelect, tag: assetSelect };

function submitAssign(e) {
  e.preventDefault();
  clearError();
  if (!assetSelect.value) {
    showError(assetSelect, "Choose an asset.");
    return;
  }
  const tag = assetSelect.value;
  const request = fulfilling;
  const result = request
    ? fulfilAssetRequest(request.id, getCurrentUserId(), tag, { date: dateInput.value, condition: condSelect.value })
    : assignAsset(getCurrentUserId(), tag, { holderId: personSelect.value, date: dateInput.value, condition: condSelect.value });
  if (!result.ok) {
    const input = ASSIGN_FIELD[result.field];
    if (input) showError(input, result.error);
    else showError(assetSelect, result.error);
    return;
  }
  const holder = request ? request.userId : result.record.holderId;
  showToast(escapeHtml(`${tag} assigned to ${nameOf(holder)}.${request ? ` Request ${request.id} is fulfilled.` : ""}`), "success");
  fulfilling = null;
  form.reset();
  render();
}

// An open request's Assign: the form, for that request.
function startFulfil(request) {
  fulfilling = request;
  form.reset();
  clearError();
  fillAssignForm();
  form.scrollIntoView?.({ block: "nearest" });
  assetSelect.focus();
}

// A row's Assign: the form, with that asset chosen (a plain assignment).
function startAssign(tag) {
  fulfilling = null;
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
let openReport = null;   // that asset's open problem report, if any
let noteDefault = "";    // what the note was filled with for the chosen action

// What can happen next, by status (data/inventory-store.js's own rules). An
// asset with an open problem report can also have the report closed.
const ACTIONS = {
  assigned: [["return", "Return to the store"], ["repair", "Send for repair"]],
  available: [["repair", "Send for repair"]],
  "in-repair": [["repaired", "Back from repair"]],
};
const CLOSE_REPORT = ["close-report", "Close the report, no action needed"];

// Return and Back from repair ask where it goes and in what state; Send for
// repair asks what's wrong (starting as the report's text, if there is one);
// closing the report asks what was done. A note typed by hand is kept when
// the action changes.
function syncModal() {
  const action = actionSelect.value;
  const noted = action === "repair" || action === "close-report";
  $("u-cond-field").hidden = noted;
  $("u-loc-field").hidden = noted;
  $("u-note-field").hidden = !noted;
  $("u-note-label").textContent = action === "close-report" ? "What was done?" : "What's wrong?";
  const fresh = action === "repair" ? openReport?.note ?? "" : "";
  if (uNote.value === noteDefault) uNote.value = fresh;
  noteDefault = fresh;
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
  openReport = openReportOf(asset);
  const box = $("u-report");
  if (box) {
    box.hidden = !openReport;
    box.textContent = openReport ? `${nameOf(openReport.byUserId)} reported a problem on ${formatDay(officeDate(openReport.at), true)}: ${openReport.note}` : "";
  }
  actionSelect.replaceChildren(...[...ACTIONS[asset.status], ...(openReport ? [CLOSE_REPORT] : [])].map(([v, t]) => option(v, t)));
  uCond.replaceChildren(option("", "Select condition"), ...CONDITION_KEYS.map((k) => option(k, conditionLabel(k))));
  uCond.value = asset.condition;
  uLoc.replaceChildren(option("", "Select location"), ...LOCATION_KEYS.map((k) => option(k, locationLabel(k))));
  uLoc.value = item?.location ?? "";
  uNote.value = "";
  noteDefault = "";
  clearError(null, modalForm);
  syncModal();
  openModal("asset-modal");
}

const UPDATE_FIELD = { condition: uCond, location: uLoc, note: uNote };
const DONE = { return: "returned to the store", repair: "sent for repair", repaired: "back from repair", "close-report": "problem report closed" };

function submitUpdate(e) {
  e.preventDefault();
  clearError(null, modalForm);
  const tag = updating;
  const action = actionSelect.value;
  const actor = getCurrentUserId();
  const fields = { condition: uCond.value, location: uLoc.value };
  const result = action === "return" ? returnAsset(actor, tag, fields)
    : action === "repaired" ? returnFromRepair(actor, tag, fields)
    : action === "close-report" ? closeReport(actor, tag, uNote.value)
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
  renderReportAlert();
  renderRequests();
  // A request closed or cancelled meanwhile can't be fulfilled any more.
  if (fulfilling) fulfilling = allAssetRequests().find((r) => r.id === fulfilling.id && r.status === "approved") ?? null;
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