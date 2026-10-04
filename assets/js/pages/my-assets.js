// pages/my-assets.js
// Runs on my-assets.html (needs assets:view-own: every role). The equipment
// assigned to the signed-in person now, from data/inventory-store.js's
// assetsFor(): their own and nobody else's, whatever their role. Equipment
// is assigned and taken back on asset-assignment.html.
//
// "Report a problem", "Request an asset" and each row's "Report issue" stay
// placeholders, and the request card is a static sample: asset requests and
// problem reports come in later rounds.

import { getCurrentUserId } from "../core/auth.js";
import { can, applyPermissions } from "../core/rbac.js";
import { getUser } from "../data/store.js";
import { allItems, assetsFor, assetTypeOf } from "../data/inventory-store.js";
import { assetTypeLabel, conditionBadge, assetStatusBadge } from "../ui/inventory-view.js";
import { el, formatDay, plural } from "../ui/leave-view.js";
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
  const actions = el("td", "table__actions");
  const report = el("button", "btn btn--sm", "Report issue");
  report.type = "button";
  report.dataset.permission = "assets:report";
  report.dataset.notImplemented = "Report issue";
  actions.append(report);
  const tr = el("tr");
  tr.dataset.tag = asset.id;
  tr.append(tag, what, el("td", "", asset.since ? formatDay(asset.since, true) : "–"), condition, status, actions);
  return tr;
}

function render(user) {
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

// can() matters because guard.js only redirects; this script would still run.
if (can("assets:view-own") && tbody) render(getUser(getCurrentUserId()));