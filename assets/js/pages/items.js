// pages/items.js
// Runs on items.html (needs inventory:view: Admin). Every item in
// data/inventory-store.js with its stock worked out from the ledger: category
// tabs, a stock-status filter, search by name or SKU, pagination; the stat
// strip, reorder alerts and stock value by category, all from the same items.
// Stock value is quantity x current unit price (no costing method). A tagged
// item's row also says how much of its stock is ready to assign (its tagged,
// available assets) when that's less than all of it: ui/inventory-view.js's
// readyToAssign().
//
// Nothing here changes an item: "Add item" and each row's Edit stay
// placeholders (no item writes exist yet). Stock changes on
// stock-movements.html and the asset register.

import { can, applyPermissions } from "../core/rbac.js";
import { CATEGORY_KEYS, STOCK_STATUS_KEYS, LOCATIONS, stockBarPercent } from "../data/inventory.js";
import { allItems, allAssets, inventoryTotals, reorderAlerts } from "../data/inventory-store.js";
import { categoryLabel, assetTypeLabel, stockStatusLabel, stockLook, stockBadge, readyToAssign, READY_SHORT, UNTAGGED_TIP } from "../ui/inventory-view.js";
import { el, plural } from "../ui/leave-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";
import { barRow } from "../ui/chart.js";
import { renderPagination } from "../ui/pagination.js";
import { initPlaceholders } from "../ui/placeholder.js";
import { rupees } from "../ui/money.js";

const PAGE_SIZE = 10;
const COLUMNS = 8;

const $ = (id) => document.getElementById(id);
const stat = (key) => document.querySelector(`[data-stat="${key}"]`);

const pills = Array.from(document.querySelectorAll(".table__toolbar .tabs__tab"));
const tbody = $("item-rows");

let category = "";   // "" = All, or a category key (the pill tabs)
let status = "";     // "" = all stock levels, or a stock status key
let search = "";
let currentPage = 1;

// ---------- data ----------

// Category order (the tabs'), then SKU.
const byCategory = (a, b) => CATEGORY_KEYS.indexOf(a.category) - CATEGORY_KEYS.indexOf(b.category)
  || a.sku.localeCompare(b.sku, "en", { numeric: true });

function matches(item) {
  const query = search.trim().toLowerCase();
  return (!category || item.category === category)
    && (!status || item.status === status)
    && (!query || item.name.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query));
}

// ---------- table ----------

// The laptop icon for IT equipment, the box for everything else (as the static page had them).
const ICON = { it: "M4 5h16v11H4zM2 19h20", other: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" };

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

function itemCell(item) {
  const td = el("td");
  const wrap = el("div", "item");
  const thumb = el("span", "item__thumb");
  thumb.append(icon(item.category === "it" ? ICON.it : ICON.other));
  const text = el("div");
  text.append(el("span", "item__name", item.name), el("span", "item__sku", item.sku));
  wrap.append(thumb, text);
  td.append(wrap);
  return td;
}

// The category; for a tagged item what it's tagged as, and under it how much
// of its stock can be assigned when that isn't all of it ("1 of 6 ready to
// assign"; the tooltip says why). Here, not in the stock cell, so the
// exported In stock column stays a plain number.
function categoryCell(item, assets) {
  const td = el("td", "", categoryLabel(item.category));
  if (item.assetType) td.append(el("div", "text-sm text-muted", `Tagged: ${assetTypeLabel(item.assetType)}`));
  const ready = readyToAssign(item, assets);
  if (ready !== null) {
    const note = el("div", "text-sm text-muted", `${ready} of ${item.stock} ${READY_SHORT}`);
    note.title = UNTAGGED_TIP;
    td.append(note);
  }
  return td;
}

// The count and the bar: stock against twice the reorder level (data/inventory.js).
function stockCell(item) {
  const look = stockLook(item.status);
  const td = el("td");
  const wrap = el("div", look.stock);
  const progress = el("div", look.bar);
  const bar = el("span", "progress__bar");
  bar.style.setProperty("--w", `${Math.round(stockBarPercent(item.stock, item.reorderLevel))}%`);
  progress.append(bar);
  wrap.append(el("span", "stock__qty", String(item.stock)), progress);
  td.append(wrap);
  return td;
}

function row(item, assets) {
  const statusCell = el("td");
  statusCell.append(stockBadge(item.status));
  const actions = el("td", "table__actions");
  const edit = el("button", "btn btn--sm", "Edit");
  edit.type = "button";
  edit.dataset.permission = "inventory:edit";
  edit.dataset.notImplemented = "Edit";
  actions.append(edit);
  const tr = el("tr");
  tr.dataset.sku = item.sku;
  tr.append(
    itemCell(item),
    categoryCell(item, assets),
    stockCell(item),
    el("td", "table__num", String(item.reorderLevel)),
    el("td", "table__num", rupees(item.unitPrice)),
    el("td", "", LOCATIONS[item.location]?.label ?? item.location),
    statusCell,
    actions,
  );
  return tr;
}

function renderTable(items) {
  const rows = items.filter(matches).sort(byCategory);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (pageRows.length) {
    const assets = allAssets();
    tbody.replaceChildren(...pageRows.map((item) => row(item, assets)));
  } else {
    const td = el("td", "text-muted", items.length ? "No items match these filters." : "No items yet.");
    td.colSpan = COLUMNS;
    const tr = el("tr");
    tr.append(td);
    tbody.replaceChildren(tr);
  }
  applyPermissions(tbody);
  initPlaceholders(tbody);

  renderPagination($("item-pagination"), {
    totalItems: rows.length,
    pageSize: PAGE_SIZE,
    currentPage,
    onPageChange: (page) => {
      currentPage = page;
      renderTable(allItems());
    },
  });
}

// ---------- stat strip ----------

function renderStats(items) {
  const totals = inventoryTotals(items);
  setStatValue(stat("items"), String(totals.items));
  setStatNote(stat("items"), plural(CATEGORY_KEYS.length, "category", "categories"));
  setStatValue(stat("value"), rupees(totals.value));
  setStatNote(stat("value"), `${plural(totals.units, "unit", "units")} in stock`);
  const { low, out } = totals.byStatus;
  setStatValue(stat("low"), String(low));
  setStatNote(stat("low"), low ? "Below their reorder level" : "Nothing below its reorder level", low ? "down" : "");
  setStatValue(stat("out"), String(out));
  setStatNote(stat("out"), out ? "Reorder now" : "Nothing out of stock", out ? "down" : "");
}

// ---------- side cards ----------

function renderAlerts() {
  const list = $("reorder-list");
  if (!list) return;
  const alerts = reorderAlerts();
  const meta = $("reorder-meta");
  if (meta) meta.textContent = plural(alerts.length, "item", "items");
  if (!alerts.length) {
    list.replaceChildren(el("div", "list__item text-muted", "Nothing to reorder."));
    return;
  }
  list.replaceChildren(...alerts.map((item) => {
    const entry = el("div", "list__item");
    const content = el("div", "list__content");
    content.append(el("span", "list__title", item.name), el("span", "list__sub", `${item.stock} left, reorder level is ${item.reorderLevel}`));
    entry.append(content, el("span", item.status === "out" ? "badge badge--danger" : "badge badge--warning", item.status === "out" ? "Out" : "Low"));
    return entry;
  }));
}

function renderValue(items) {
  const body = $("value-by-category");
  if (!body) return;
  const { byCategory: per } = inventoryTotals(items);
  const top = Math.max(...CATEGORY_KEYS.map((k) => per[k].value));
  body.replaceChildren(...CATEGORY_KEYS.map((k) =>
    barRow(categoryLabel(k), rupees(per[k].value), top ? Math.round((per[k].value / top) * 100) : 0)));
}

// ---------- start ----------

function pillCategory(pill) {
  const label = pill.textContent.trim();
  return CATEGORY_KEYS.find((k) => categoryLabel(k) === label) ?? "";
}

function render() {
  const items = allItems();
  renderTable(items);
  renderStats(items);
  renderAlerts();
  renderValue(items);
}

// can() matters because guard.js only redirects; this script would still run.
if (can("inventory:view") && tbody) {
  const select = $("item-status");
  if (select) {
    const all = el("option", "", "All stock levels");
    all.value = "";
    select.replaceChildren(all, ...STOCK_STATUS_KEYS.map((key) => {
      const option = el("option", "", stockStatusLabel(key));
      option.value = key;
      return option;
    }));
    select.addEventListener("change", () => {
      status = select.value;
      currentPage = 1;
      renderTable(allItems());
    });
  }
  $("item-search")?.addEventListener("input", (e) => {
    search = e.target.value;
    currentPage = 1;
    renderTable(allItems());
  });
  // ui/tabs.js already moves the is-active highlight between pills on click.
  pills.forEach((pill) => pill.addEventListener("click", () => {
    category = pillCategory(pill);
    currentPage = 1;
    renderTable(allItems());
  }));
  render();
}