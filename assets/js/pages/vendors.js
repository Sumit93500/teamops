// pages/vendors.js
// Runs on vendors.html (needs vendors:view: Admin). Every vendor in
// data/inventory-store.js: a status filter, search by vendor, contact or what
// they supply, and pagination. A vendor's contact is plain data on the vendor
// record (a person at the vendor, not a user).
//
// Nothing here changes a vendor: "Add vendor" and each row's Edit stay
// placeholders (no vendor writes exist yet). There are no purchase orders, so
// no open-order count; the page's purchase-order card is a labelled static
// sample.

import { can, applyPermissions } from "../core/rbac.js";
import { VENDOR_STATUS_KEYS } from "../data/inventory.js";
import { allVendors } from "../data/inventory-store.js";
import { vendorStatusLabel, vendorStatusBadge } from "../ui/inventory-view.js";
import { el, initials } from "../ui/leave-view.js";
import { renderPagination } from "../ui/pagination.js";
import { initPlaceholders } from "../ui/placeholder.js";

const PAGE_SIZE = 10;
const COLUMNS = 5;

const $ = (id) => document.getElementById(id);

const tbody = $("vendor-rows");

let status = "";     // "" = all statuses, or a vendor status key
let search = "";
let currentPage = 1;

// ---------- data ----------

// The store's order (VEN-1, VEN-2, ...), the order vendors.html always had.
const byId = (a, b) => a.id.localeCompare(b.id, "en", { numeric: true });

// "Rajiv Sharma, +91 98110 22334": whichever of the two the record has. The
// number's spaces don't break, so a narrow column wraps before it, not inside it.
const contactLine = (vendor) => [vendor.contactName, vendor.phone?.replace(/ /g, "\u00a0")].filter(Boolean).join(", ");

function matches(vendor) {
  const query = search.trim().toLowerCase();
  return (!status || vendor.status === status)
    && (!query || [vendor.name, vendor.contactName, vendor.supplies].some((text) => String(text ?? "").toLowerCase().includes(query)));
}

// ---------- table ----------

// avatar--1..4 from the vendor's place in the full list (the users-list pattern), so a
// vendor keeps its colour whatever the filter.
function vendorCell(vendor, index) {
  const td = el("td");
  const wrap = el("div", "table__user");
  const text = el("div");
  text.append(el("span", "table__user-name", vendor.name));
  const contact = contactLine(vendor);
  if (contact) text.append(el("span", "table__user-sub", contact));
  wrap.append(el("div", `avatar avatar--${(Math.max(index, 0) % 4) + 1}`, initials(vendor.name)), text);
  td.append(wrap);
  return td;
}

function row(vendor, index) {
  const statusCell = el("td");
  statusCell.append(vendorStatusBadge(vendor.status));
  const actions = el("td", "table__actions");
  const edit = el("button", "btn btn--sm", "Edit");
  edit.type = "button";
  edit.dataset.permission = "vendors:edit";
  edit.dataset.notImplemented = "Edit";
  actions.append(edit);
  const tr = el("tr");
  tr.dataset.vendorId = vendor.id;
  tr.append(
    vendorCell(vendor, index),
    el("td", "", vendor.supplies),
    el("td", "", vendor.terms),
    statusCell,
    actions,
  );
  return tr;
}

function renderTable() {
  const vendors = allVendors().sort(byId);
  const place = new Map(vendors.map((v, i) => [v.id, i]));
  const rows = vendors.filter(matches);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (pageRows.length) {
    tbody.replaceChildren(...pageRows.map((v) => row(v, place.get(v.id))));
  } else {
    const td = el("td", "text-muted", vendors.length ? "No vendors match these filters." : "No vendors yet.");
    td.colSpan = COLUMNS;
    const tr = el("tr");
    tr.append(td);
    tbody.replaceChildren(tr);
  }
  applyPermissions(tbody);
  initPlaceholders(tbody);

  renderPagination($("vendor-pagination"), {
    totalItems: rows.length,
    pageSize: PAGE_SIZE,
    currentPage,
    onPageChange: (page) => {
      currentPage = page;
      renderTable();
    },
  });
}

// ---------- start ----------

// can() matters because guard.js only redirects; this script would still run.
if (can("vendors:view") && tbody) {
  const select = $("vendor-status");
  if (select) {
    const all = el("option", "", "All statuses");
    all.value = "";
    select.replaceChildren(all, ...VENDOR_STATUS_KEYS.map((key) => {
      const option = el("option", "", vendorStatusLabel(key));
      option.value = key;
      return option;
    }));
    select.addEventListener("change", () => {
      status = select.value;
      currentPage = 1;
      renderTable();
    });
  }
  $("vendor-search")?.addEventListener("input", (e) => {
    search = e.target.value;
    currentPage = 1;
    renderTable();
  });
  renderTable();
}