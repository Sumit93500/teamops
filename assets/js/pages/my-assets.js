// pages/my-assets.js
// Runs on my-assets.html (needs assets:view-own: every role). The equipment
// assigned to the signed-in person now, from data/inventory-store.js's
// assetsFor(): their own and nobody else's, whatever their role. Equipment
// is assigned and taken back on asset-assignment.html.
//
// "Request an asset" (assets:request) opens a form sent through
// data/asset-requests-store.js's submitAssetRequest(): what's needed (a type,
// never a specific tag), optionally which of their own assets it replaces,
// and why. Every refusal comes from the store and is shown at the field it
// names (the form is novalidate). The "My asset requests" card shows their
// newest request and how far it has got. my-requests.html's "Request an
// asset" links here with #request, which opens the form.
//
// "Report a problem" (assets:report) and each row's "Report issue" open one
// form sent through data/inventory-store.js's reportProblem(): which of their
// assets (the row's, when opened from a row) and what's wrong. An asset with
// an open report has a disabled "Reported" button instead (its tooltip: the
// day and what was said) until an Admin settles it on asset-assignment.html.

import { getCurrentUserId } from "../core/auth.js";
import { can, applyPermissions } from "../core/rbac.js";
import { getUser } from "../data/store.js";
import { ASSET_TYPE_KEYS } from "../data/inventory.js";
import { allItems, assetsFor, assetTypeOf, openReportOf, reportProblem } from "../data/inventory-store.js";
import { submitAssetRequest, assetRequestsFor, previewRoute } from "../data/asset-requests-store.js";
import { assetTypeLabel, conditionBadge, assetStatusBadge, officeDate } from "../ui/inventory-view.js";
import { requestTitle, requestBadge, endNote, assetRequestSteps } from "../ui/asset-request-view.js";
import { el, escapeHtml, formatDay, plural, nameOf } from "../ui/leave-view.js";
import { openModal, closeModal } from "../ui/modal.js";
import { showToast } from "../ui/toast.js";
import { initPlaceholders } from "../ui/placeholder.js";

const COLUMNS = 6;
const $ = (id) => document.getElementById(id);
const tbody = $("my-asset-rows");

// The laptop icon, or the card for an access card (as the static page had them).
const ICON = { "access-card": "M3 6h18v12H3zM3 10h18", other: "M4 5h16v11H4zM2 19h20" };

function icon(path) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", path);
  svg.append(p);
  return svg;
}

function row(asset, item) {
  const type = assetTypeOf(asset);
  const tag = el("td");
  tag.append(el("span", "asset-tag", asset.id));
  const what = el("td");
  const wrap = el("div", "item");
  const thumb = el("span", "item__thumb");
  thumb.append(icon(ICON[type] ?? ICON.other));
  const text = el("div");
  text.append(el("span", "item__name", item?.name ?? asset.sku), el("span", "item__sku", assetTypeLabel(type)));
  wrap.append(thumb, text);
  what.append(wrap);
  const condition = el("td");
  condition.append(conditionBadge(asset.condition));
  const status = el("td");
  status.append(assetStatusBadge(asset.status));
  // An open report: the button itself says so (no badge: one would widen the table past its card at 1280).
  const open = openReportOf(asset);
  const actions = el("td", "table__actions");
  const report = el("button", "btn btn--sm", open ? "Reported" : "Report issue");
  report.type = "button";
  report.dataset.permission = "assets:report";
  report.dataset.reportTag = asset.id;
  if (open) {
    report.disabled = true;
    report.title = `Reported ${formatDay(officeDate(open.at), true)}: ${open.note}. An Admin will look at it.`;
  }
  actions.append(report);
  const tr = el("tr");
  tr.dataset.tag = asset.id;
  tr.append(tag, what, el("td", "", asset.since ? formatDay(asset.since, true) : "–"), condition, status, actions);
  return tr;
}

function renderAssets(user) {
  const items = new Map(allItems().map((i) => [i.sku, i]));
  const mine = user ? assetsFor(user.id).sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true })) : [];
  const meta = $("my-assets-meta");
  if (meta) meta.textContent = plural(mine.length, "asset", "assets");
  if (mine.length) {
    tbody.replaceChildren(...mine.map((a) => row(a, items.get(a.sku))));
  } else {
    const td = el("td", "text-muted", user ? "No equipment is assigned to you." : "Your employee record wasn't found, so your equipment can't be shown.");
    td.colSpan = COLUMNS;
    const tr = el("tr");
    tr.append(td);
    tbody.replaceChildren(tr);
  }
  applyPermissions(tbody);
  initPlaceholders(tbody);
}

// ---------- the "My asset requests" card ----------

const isOpen = (r) => r.status === "pending" || r.status === "approved";
const newestFirst = (a, b) => b.appliedOn.localeCompare(a.appliedOn) || b.id.localeCompare(a.id, "en", { numeric: true });

// The newest request still open (waiting for a decision or an asset), else
// the newest of any kind: its title, badge, reason and steps.
function renderRequestCard(user) {
  const body = $("request-card-body");
  if (!body) return;
  const mine = user ? assetRequestsFor(user.id).sort(newestFirst) : [];
  const shown = mine.find(isOpen) ?? mine[0];
  if (!shown) {
    body.replaceChildren(el("p", "text-muted", user
      ? "You haven't asked for any equipment. Use Request an asset when you need something."
      : "Your employee record wasn't found, so your requests can't be shown."));
    return;
  }
  const head = el("div", "flex items-center justify-between gap-2 mb-2");
  head.append(el("span", "fw-medium", requestTitle(shown)), requestBadge(shown));
  const parts = [head, el("p", "text-sm text-muted mb-4", shown.reason)];
  const note = endNote(shown);
  if (note) parts.push(el("p", "text-sm mb-4", `${shown.status === "rejected" ? "Reason" : "Note"}: ${note}`));
  const stepper = el("ol", "stepper stepper--vertical");
  stepper.append(...assetRequestSteps(shown));
  parts.push(stepper);
  const others = mine.filter((r) => r !== shown && isOpen(r)).length;
  if (others) parts.push(el("p", "text-xs text-muted mt-4", `${plural(others, "other request is", "other requests are")} open too.`));
  body.replaceChildren(...parts);
}

// ---------- the request form ----------

const requestBtn = $("request-asset-btn");
const form = $("request-form");
const typeSelect = $("r-type");
const replacesSelect = $("r-replaces");
const reasonInput = $("r-reason");

// Where each field named by submitAssetRequest()'s result.field shows its error.
const FIELD = { assetType: typeSelect, replacesTag: replacesSelect, reason: reasonInput };

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

const option = (value, text) => { const o = el("option", "", text); o.value = value; return o; };

// What it could replace: the person's own assets of the chosen type.
function fillReplaces(user) {
  const items = new Map(allItems().map((i) => [i.sku, i]));
  const own = typeSelect.value ? assetsFor(user.id).filter((a) => assetTypeOf(a) === typeSelect.value)
    .sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true })) : [];
  replacesSelect.replaceChildren(option("", "Nothing, it's in addition"), ...own.map((a) => option(a.id, `${a.id}, ${items.get(a.sku)?.name ?? a.sku}`)));
}

// Who it would go to, from the store's own rules.
function chainText(user) {
  if (user.role === "admin") return "As an Admin, your request is approved as soon as you send it. Then an asset is assigned to you.";
  const route = previewRoute(user.id).filter((r) => r.holderIds.length);
  if (!route.some((r) => r.stage === "admin")) return "Nobody can approve a request from you at the moment. Ask an Admin.";
  const who = route.map((r) => (r.stage === "manager" ? nameOf(r.holderIds[0]) : "an Admin")).join(", then ");
  return `Your request goes to ${who}${route.length === 1 ? " (no manager on file)" : ""}. Once it's approved, an asset is assigned to you.`;
}

function openRequestForm(user) {
  form.reset();
  clearError();
  typeSelect.replaceChildren(option("", "Choose a type"), ...ASSET_TYPE_KEYS.map((k) => option(k, assetTypeLabel(k))));
  fillReplaces(user);
  $("request-chain").textContent = chainText(user);
  openModal("request-modal");
  typeSelect.focus();
}

function submitRequest(e, user) {
  e.preventDefault();
  clearError();
  const result = submitAssetRequest(user.id, { assetType: typeSelect.value, replacesTag: replacesSelect.value, reason: reasonInput.value });
  if (!result.ok) {
    const input = FIELD[result.field];
    if (input) showError(input, result.error);
    else showToast(escapeHtml(result.error), "danger");
    return;
  }
  closeModal("request-modal");
  showToast(result.record.status === "approved"
    ? "Request approved. Admin requests are approved automatically."
    : "Asset request sent.", "success");
  renderRequestCard(user);
}

// ---------- the report form ----------

const reportBtn = $("report-btn");
const reportForm = $("report-form");
const tagSelect = $("p-tag");
const noteInput = $("p-note");

// Where each field named by reportProblem()'s result.field shows its error.
const REPORT_FIELD = { tag: tagSelect, note: noteInput };

function clearReportError(input) {
  const scope = input ? input.closest(".form-field") : reportForm;
  scope?.querySelectorAll(".form-error").forEach((error) => error.remove());
  (input ? [input] : Object.values(REPORT_FIELD)).forEach((i) => i?.removeAttribute("aria-describedby"));
}

function showReportError(input, message) {
  clearReportError();
  const error = el("span", "form-error", message);
  error.id = `${input.id}-error`;
  input.closest(".form-field").appendChild(error);
  input.setAttribute("aria-describedby", error.id);
  input.focus();
}

// Their assets; one already reported stays listed, but can't be chosen again.
function openReportForm(user, tag = "") {
  reportForm.reset();
  clearReportError();
  const items = new Map(allItems().map((i) => [i.sku, i]));
  const mine = assetsFor(user.id).sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
  tagSelect.replaceChildren(option("", "Choose an asset"), ...mine.map((a) => {
    const o = option(a.id, `${a.id}, ${items.get(a.sku)?.name ?? a.sku}${openReportOf(a) ? " (already reported)" : ""}`);
    o.disabled = Boolean(openReportOf(a));
    return o;
  }));
  tagSelect.value = mine.some((a) => a.id === tag && !openReportOf(a)) ? tag : "";
  openModal("report-modal");
  (tagSelect.value ? noteInput : tagSelect).focus();
}

function submitReport(e, user) {
  e.preventDefault();
  clearReportError();
  const result = reportProblem(user.id, tagSelect.value, noteInput.value);
  if (!result.ok) {
    const input = REPORT_FIELD[result.field];
    if (input) showReportError(input, result.error);
    else showToast(escapeHtml(result.error), "danger");
    return;
  }
  closeModal("report-modal");
  showToast("Problem reported. An Admin will look at it.", "success");
  renderAssets(user);
}

// ---------- start ----------

// can() matters because guard.js only redirects; this script would still run.
if (can("assets:view-own") && tbody) {
  const user = getUser(getCurrentUserId());
  renderAssets(user);
  renderRequestCard(user);

  if (requestBtn) requestBtn.disabled = !user;   // an old session: nothing can be sent for nobody
  if (user && can("assets:request") && requestBtn && form && typeSelect && replacesSelect && reasonInput) {
    requestBtn.addEventListener("click", () => openRequestForm(user));
    Object.values(FIELD).forEach((input) => input.addEventListener("input", () => clearError(input)));
    typeSelect.addEventListener("change", () => { clearError(typeSelect); clearError(replacesSelect); fillReplaces(user); });
    replacesSelect.addEventListener("change", () => clearError(replacesSelect));
    form.addEventListener("submit", (e) => submitRequest(e, user));
    if (window.location.hash === "#request") openRequestForm(user);
  }

  // Nothing to report on without a record, or with nothing assigned.
  if (reportBtn) reportBtn.disabled = !user || !assetsFor(user.id).length;
  if (user && can("assets:report") && reportBtn && reportForm && tagSelect && noteInput) {
    reportBtn.addEventListener("click", () => openReportForm(user));
    tbody.addEventListener("click", (e) => {
      const button = e.target.closest("button[data-report-tag]");
      if (button && !button.disabled) openReportForm(user, button.dataset.reportTag);
    });
    Object.values(REPORT_FIELD).forEach((input) => input.addEventListener("input", () => clearReportError(input)));
    tagSelect.addEventListener("change", () => clearReportError(tagSelect));
    reportForm.addEventListener("submit", (e) => submitReport(e, user));
  }
}