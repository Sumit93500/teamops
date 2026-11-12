// usage: node vendorpages.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 6F: inventory/vendors.html wired to data/inventory-store.js's vendors, in jsdom, and the new vendors:view.
// ./js-pre6F and ./html-pre6F are the code and pages before this round (6E's result). Fixed clock: Wed 30 Sep 2026
// 11:00 local.
//   A  vendors.html for Aarav on the seed: the table, contacts, badges, avatars, placeholders
//   B  the status filter and search;  C  pagination;  D  Export;  E  the page follows the store
//   F  the purchase-order card: a labelled static sample with real vendors (6A decision 5)
//   G  access: vendors:view (route, nav, Export, the script), people without it, a role with view only
//   H  the static page (neutral, nothing invented);  L  source layout
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const VENDORS = "inventory/vendors.html";

const RealDate = Date;
const NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
let lastBlob = null;
URL.createObjectURL = (blob) => { lastBlob = blob; return "blob:test"; };
URL.revokeObjectURL = () => {};

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ARJUN = "EMP-1105";
const WHO = {
  aarav: ["admin", "Aarav Mehta", AARAV], priya: ["hr", "Priya Nair", PRIYA], kabir: ["fin", "Kabir Shah", KABIR],
  arjun: ["emp", "Arjun Kapoor", ARJUN], oldAdmin: ["admin", "Aarav Mehta", undefined], nobody: null,
};

let loads = 0, w = null, d = null, saved = {}, jsErrors = [], navigations = [];
async function open(page, who) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = []; navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else jsErrors.push(e.message); });
  const dom = new JSDOM(fs.readFileSync(`${DIR}/${page}`, "utf8"), { url: `http://localhost/office-os/pages/${page}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.HTMLAnchorElement.prototype.click = function () {};
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  const auth = await import("./js/core/auth.js");
  if (WHO[who]) auth.signIn(...WHO[who]); else auth.signOut?.();
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/vendors.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;

const I = await import("./js/data/inventory-store.js");
const { PERMISSIONS, ALL_PERMISSIONS } = await import("./js/config/permissions.js");
const { ROLES } = await import("./js/config/roles.js");
const { ROUTES } = await import("./js/config/routes.js");
const { NAV } = await import("./js/config/nav.js");

// ---- readers ----
const $ = (id) => d.getElementById(id);
const rows = () => [...($("vendor-rows")?.children ?? [])];
const ids = () => rows().map((tr) => tr.dataset.vendorId ?? null);
const pieces = (node) => { const out = []; const it = node.ownerDocument.createTreeWalker(node, 4); for (let n = it.nextNode(); n; n = it.nextNode()) { const t = n.textContent.replace(/\s+/g, " ").trim(); if (t) out.push(t); } return out.join(" "); };
const cells = (tr) => [...tr.children].map(pieces);
const rowOf = (id) => rows().find((tr) => tr.dataset.vendorId === id);
const typeIn = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event("input", { bubbles: true })); };
const choose = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event("change", { bubbles: true })); };
const pageText = () => txt(d.querySelector(".pagination > span")) ?? "";
const pageBtn = (label) => [...d.querySelectorAll(".pagination__btn")].find((b) => txt(b) === label);
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => ({ type: t.className.replace("toast toast--", ""), text: txt(t.querySelector(".toast__text")) }));
const clearToasts = () => d.querySelectorAll(".toast").forEach((t) => t.remove());
const headerBtn = (label) => [...d.querySelectorAll(".page-header__actions button")].find((b) => txt(b) === label);
const setVendors = (records) => { const box = JSON.parse(w.localStorage.getItem("officeos:vendors")); box.records = records; w.localStorage.setItem("officeos:vendors", JSON.stringify(box)); };
async function csvRows() {
  lastBlob = null;
  d.querySelector("[data-export]").click();
  if (!lastBlob) return null;
  return new TextDecoder("utf-8").decode(new Uint8Array(await lastBlob.arrayBuffer())).replace(/^﻿/, "").split("\r\n");
}

// The seed, written out here (not read from the app): vendors.html's five, in its order. A row's first cell reads
// avatar initials, name, contact (the CSV leaves the initials out).
const SEED_CELLS = [
  ["VEN-1", ["SO Sharma Office Supplies Rajiv Sharma, +91 98110 22334", "Stationery, pantry", "Net 30 days", "Active", "Edit"]],
  ["VEN-2", ["TD TechNova Distributors Meenal Kapoor, +91 98180 45521", "Laptops, accessories", "Net 45 days", "Active", "Edit"]],
  ["VEN-3", ["FI FurniCraft India Sanjay Bhatia, +91 99101 87650", "Office furniture", "Net 30 days", "Active", "Edit"]],
  ["VEN-4", ["CS CoolAir Services Amit Verma, +91 98730 11098", "AC maintenance", "Yearly contract", "Active", "Edit"]],
  ["VEN-5", ["QS QuickPrint Solutions Neeraj Jain, +91 98999 30412", "Printing, id cards", "Advance payment", "On hold", "Edit"]],
];
const SEED_IDS = SEED_CELLS.map(([id]) => id);

// =====================================================================
section("A. vendors.html for Aarav (Admin) on the seed");
fresh();
await open(VENDORS, "aarav");
check("A1", "no JS errors, no redirect", jsErrors.length === 0 && navigations.length === 0, jsErrors.join(" | "));
check("A2", "the store's five vendors, in the page's order (VEN-1..5)", j(ids()) === j(SEED_IDS), j(ids()));
check("A3", "each row: vendor + contact name and phone (plain data), supplies, payment terms, status, Edit",
  SEED_CELLS.every(([id, want]) => j(cells(rowOf(id))) === j(want)), j(rows().map(cells)));
check("A4", "the headers: Vendor, Supplies, Payment terms, Status, Actions (no Open orders: there are no purchase orders, Q5)",
  j([...d.querySelectorAll("thead th")].map(txt)) === j(["Vendor", "Supplies", "Payment terms", "Status", "Actions"]) && rows().every((tr) => tr.children.length === 5));
const badgeOf = (id) => rowOf(id)?.querySelector("td:nth-child(4) .badge");
check("A5", "status badges in the page's colours: Active green, On hold amber", SEED_IDS.slice(0, 4).every((id) => badgeOf(id).className === "badge badge--success badge--dot")
  && badgeOf("VEN-5").className === "badge badge--warning badge--dot" && txt(badgeOf("VEN-5")) === "On hold");
const avatars = rows().map((tr) => [tr.querySelector(".avatar").className, txt(tr.querySelector(".avatar"))]);
check("A6", "initials avatars, coloured by the vendor's place in the list (avatar--1..4, then 1 again, as the static page had them)",
  j(avatars) === j([["avatar avatar--1", "SO"], ["avatar avatar--2", "TD"], ["avatar avatar--3", "FI"], ["avatar avatar--4", "CS"], ["avatar avatar--1", "QS"]]), j(avatars));
const edits = rows().map((tr) => tr.querySelector(".table__actions button"));
clearToasts();
edits[1].click();
check("A7", "every Edit (vendors:edit) is still a placeholder: an info toast, nothing else, nothing stored changed",
  edits.every((b) => b.dataset.permission === "vendors:edit" && b.dataset.notImplemented === "Edit" && !b.hidden)
  && j(toasts()) === j([{ type: "info", text: "Edit isn't available in this demo." }]) && j(I.allVendors().map((v) => v.id)) === j(SEED_IDS));
clearToasts();
headerBtn("Add vendor")?.click();
check("A8", "'Add vendor' stays a placeholder on vendors:create", headerBtn("Add vendor")?.dataset.notImplemented === "Add vendor" && headerBtn("Add vendor").dataset.permission === "vendors:create"
  && !headerBtn("Add vendor").hidden && j(toasts()) === j([{ type: "info", text: "Add vendor isn't available in this demo." }]));
check("A9", "five vendors fit one page: no pagination bar (renderPagination's is-empty)", $("vendor-pagination").classList.contains("is-empty") && pageText() === "");
const subRaw = rowOf("VEN-1").querySelector(".table__user-sub").textContent;
check("A11", "the phone number's spaces don't break (browser-checked: a narrow column wrapped inside the number), the comma's does", subRaw === "Rajiv Sharma, +91 98110 22334", j(subRaw));
check("A10", "nothing about vendors is written by opening the page except the store's own seed", JSON.parse(w.localStorage.getItem("officeos:vendors")).records.length === 5);

// =====================================================================
section("B. The status filter and search");
const opts = [...$("vendor-status").options].map((o) => [o.value, txt(o)]);
check("B1", "the status filter: All statuses + the store's two (VENDOR_STATUSES), with keys", j(opts) === j([["", "All statuses"], ["active", "Active"], ["on-hold", "On hold"]]), j(opts));
choose("vendor-status", "on-hold");
check("B2", "On hold: QuickPrint only", j(ids()) === j(["VEN-5"]), j(ids()));
choose("vendor-status", "active");
check("B3", "Active: the other four", j(ids()) === j(["VEN-1", "VEN-2", "VEN-3", "VEN-4"]), j(ids()));
choose("vendor-status", "");
typeIn("vendor-search", "kapoor");
check("B4", "search finds a vendor by its contact's name (Meenal Kapoor -> TechNova)", j(ids()) === j(["VEN-2"]), j(ids()));
typeIn("vendor-search", "FURNITURE");
check("B5", "search finds a vendor by what it supplies, ignoring case", j(ids()) === j(["VEN-3"]), j(ids()));
typeIn("vendor-search", "  coolair ");
check("B6", "search by name, spaces around the words ignored", j(ids()) === j(["VEN-4"]), j(ids()));
typeIn("vendor-search", "s");
choose("vendor-status", "on-hold");
check("B7", "search and status combine", j(ids()) === j(["VEN-5"]), j(ids()));
typeIn("vendor-search", "sharma");
const none = rows();
check("B8", "nothing matching: one row 'No vendors match these filters.' across all five columns", none.length === 1 && txt(none[0]) === "No vendors match these filters." && none[0].firstElementChild.colSpan === 5);
choose("vendor-status", "");
typeIn("vendor-search", "98110");
check("B9", "the phone number isn't searched (vendor, contact and supplies only; all statuses)", txt(rows()[0]) === "No vendors match these filters." && rows().length === 1);
choose("vendor-status", "");
typeIn("vendor-search", "");
check("B10", "clearing both shows all five again", j(ids()) === j(SEED_IDS));
check("B11", "the search box is the page's own (data-table-filter=off, so table-filter.js doesn't also hide rows)", $("vendor-search").dataset.tableFilter === "off"
  && rows().every((tr) => !tr.hidden && tr.style.display !== "none"));

// =====================================================================
section("C. Pagination (renderPagination, 10 a page) and the empty list");
{ const extra = Array.from({ length: 8 }, (_, i) => ({ id: `VEN-${i + 6}`, name: `Extra Vendor ${i + 6}`, contactName: "", phone: "", supplies: "Spares", terms: "Net 30 days", status: i === 7 ? "on-hold" : "active" }));
  setVendors([...I.allVendors(), ...extra.slice(0, 4), { ...extra[4], id: "VEN-100" }, ...extra.slice(5)]); }
await open(VENDORS, "aarav");
check("C1", "13 vendors (VEN-1..9, 11..13, 100): 10 on page 1 in id order, 'Showing 1 to 10 of 13'", ids().length === 10 && ids()[9] === "VEN-11" && pageText() === "Showing 1 to 10 of 13", j([ids(), pageText()]));
pageBtn("2").click();
check("C2", "page 2: the last three, VEN-100 after VEN-13 (numeric, not text, order)", j(ids()) === j(["VEN-12", "VEN-13", "VEN-100"]) && pageText() === "Showing 11 to 13 of 13", j([ids(), pageText()]));
check("C3", "a vendor keeps its avatar colour on page 2 (its place in the full list: the 11th is avatar--3)", rowOf("VEN-12").querySelector(".avatar").className === "avatar avatar--3");
check("C4", "a vendor with no contact on file: just its name, no empty sub-line", rowOf("VEN-12").querySelector(".table__user-sub") === null && cells(rowOf("VEN-12"))[0] === "EV Extra Vendor 12");
choose("vendor-status", "on-hold");
check("C5", "changing the filter goes back to page 1 (VEN-5 and the on-hold extra)", j(ids()) === j(["VEN-5", "VEN-13"]) && $("vendor-pagination").classList.contains("is-empty"), j(ids()));
choose("vendor-status", "");
pageBtn("2").click();
choose("vendor-status", "active");
check("C5b", "from page 2, a filter that still needs two pages starts at page 1 (11 active)", ids()[0] === "VEN-1" && pageText() === "Showing 1 to 10 of 11", j([ids(), pageText()]));
choose("vendor-status", "");
pageBtn("2").click();
typeIn("vendor-search", "e");
check("C6b", "from page 2, a search that still needs two pages starts at page 1 (all 13 have an 'e')", ids()[0] === "VEN-1" && pageText() === "Showing 1 to 10 of 13", j([ids(), pageText()]));
pageBtn("2").click();
typeIn("vendor-search", "extra");
check("C6", "typing a search goes back to page 1 too (the 8 extras, one page)", ids()[0] === "VEN-6" && ids().length === 8 && $("vendor-pagination").classList.contains("is-empty"), j([ids(), pageText()]));
setVendors([]);
await open(VENDORS, "aarav");
check("C7", "no vendors at all: 'No vendors yet.'", rows().length === 1 && txt(rows()[0]) === "No vendors yet." && rows()[0].firstElementChild.colSpan === 5);
fresh();

// =====================================================================
section("D. Export");
await open(VENDORS, "aarav");
let csv = await csvRows();
check("D1", "Export writes the five real vendors (no Open orders column, no Actions)", j(csv) === j([
  "Vendor,Supplies,Payment terms,Status",
  "\"Sharma Office Supplies Rajiv Sharma, +91 98110 22334\",\"Stationery, pantry\",Net 30 days,Active",
  "\"TechNova Distributors Meenal Kapoor, +91 98180 45521\",\"Laptops, accessories\",Net 45 days,Active",
  "\"FurniCraft India Sanjay Bhatia, +91 99101 87650\",Office furniture,Net 30 days,Active",
  "\"CoolAir Services Amit Verma, +91 98730 11098\",AC maintenance,Yearly contract,Active",
  "\"QuickPrint Solutions Neeraj Jain, +91 98999 30412\",\"Printing, id cards\",Advance payment,On hold",
]), j(csv));
choose("vendor-status", "on-hold");
csv = await csvRows();
check("D2", "Export follows the filter (only what's shown)", csv?.length === 2 && csv[1].startsWith("\"QuickPrint Solutions"), j(csv));
check("D3", "Export is on vendors:view (was reports:export)", d.querySelector("[data-export]").dataset.permission === "vendors:view" && !d.querySelector("[data-export]").hidden);

// =====================================================================
section("E. The page follows the store");
fresh();
await open(VENDORS, "aarav");
setVendors(I.allVendors().map((v) => (v.id === "VEN-2" ? { ...v, status: "on-hold", terms: "Net 60 days", name: "<b>TechNova</b> & Co" } : v)));
await open(VENDORS, "aarav");
const tn = rowOf("VEN-2");
check("E1", "a vendor changed in the store shows as stored (status, terms) after reload", j(cells(tn).slice(1, 4)) === j(["Laptops, accessories", "Net 60 days", "On hold"]) && badgeOf("VEN-2").className === "badge badge--warning badge--dot");
check("E2", "names are text, never markup", tn.querySelector("b") === null && txt(tn.querySelector(".table__user-name")) === "<b>TechNova</b> & Co" && txt(tn.querySelector(".avatar")) === "<&", j(cells(tn)));
setVendors(I.allVendors().map((v) => (v.id === "VEN-3" ? { ...v, status: "closed" } : v)));
await open(VENDORS, "aarav");
check("E3", "a status the rules don't know is shown as stored, grey, and filtered out of both named statuses", txt(badgeOf("VEN-3")) === "closed" && badgeOf("VEN-3").className === "badge badge--dot"
  && (choose("vendor-status", "active"), !ids().includes("VEN-3")) && (choose("vendor-status", "on-hold"), !ids().includes("VEN-3")));
fresh();

// =====================================================================
section("F. The purchase-order card: a labelled static sample");
await open(VENDORS, "aarav");
const poCard = [...d.querySelectorAll("aside .card")].find((c) => txt(c.querySelector(".card__title")) === "Recent purchase orders");
const poRows = [...(poCard?.querySelectorAll(".list__item") ?? [])].map((li) => [txt(li.querySelector(".asset-tag")), txt(li.querySelector(".list__title")), txt(li.querySelector(".list__sub")), txt(li.querySelector(".po__amount")), txt(li.querySelector(".badge"))]);
check("F1", "labelled 'Sample, not built yet' (tax-deductions / 6D convention) with a hint saying nothing is saved or sent for approval",
  txt(poCard?.querySelector(".card__meta")) === "Sample, not built yet"
  && !poCard.querySelector(".form-hint").closest("[hidden]") && txt(poCard.querySelector(".form-hint")) === "Purchase orders aren't part of OfficeOS. These three show how orders could look here; nothing on this card is saved or sent for approval.");
check("F2", "the three sample orders, with the real vendors' full names", j(poRows) === j([
  ["PO-2291", "PO-2291 TechNova Distributors", "10 laptops and 20 keyboards", "₹9,75,000", "Awaiting approval"],   // the store's prices since Round 6G
  ["PO-2270", "PO-2270 FurniCraft India", "6 ergonomic chairs", "₹76,800", "Received"],
  ["PO-2264", "PO-2264 Sharma Office Supplies", "12 kg coffee beans", "₹10,200", "Received"],
]), j(poRows));
const names = new Set(I.allVendors().map((v) => v.name));
check("F3", "every vendor the sample names is one in the store", poRows.every(([tag, title]) => names.has(title.slice(tag.length + 1))));
const mv = (ref) => I.allMovements().filter((m) => m.reference === ref);
const coffee = I.getItem("PAN-4002"), chair = I.getItem("FUR-2010");
check("F4", "the two 'Received' orders agree with the ledger's stock-ins they are the reference of: PO-2264 = 12 coffee (12 x ₹850 = ₹10,200), PO-2270 = 6 chairs (6 x ₹12,800 = ₹76,800)",
  mv("PO-2264").length === 1 && mv("PO-2264")[0].sku === "PAN-4002" && mv("PO-2264")[0].change === 12 && mv("PO-2264")[0].type === "in" && 12 * coffee.unitPrice === 10200
  && mv("PO-2270").length === 1 && mv("PO-2270")[0].sku === "FUR-2010" && mv("PO-2270")[0].change === 6 && 6 * chair.unitPrice === 76800);
check("F5", "the sample has no buttons and no links (nothing to act on)", poCard.querySelectorAll("button, a").length === 0);
check("F6", "the Store Manager alert is gone (no such role; nothing in the inbox behind it), and no other alert on the page", !/Store Manager/.test(d.body.textContent) && d.querySelectorAll("main .alert").length === 0);

// =====================================================================
section("G. Access: the new vendors:view");
const prePerms = (await import("./js-pre6F/config/permissions.js")).ALL_PERMISSIONS;
// Round 11N (layout; was the live ALL_PERMISSIONS, in G2: 6F's own addition, read as 11N found it (js-pre11N = HEAD fcdc960); users:delete was added since (roadnotes.mjs U1))
const ALL11N = (await import("./js-pre11N/config/permissions.js")).ALL_PERMISSIONS;
check("G1", "permissions.js: vendors = create, edit, view (one new action, appended)", j(PERMISSIONS.vendors) === j(["create", "edit", "view"]));
check("G2", "ALL_PERMISSIONS = before + vendors:view right after vendors:edit; 77 in all", ALL11N.length === 77 && prePerms.length === 76
  && j(ALL11N.filter((p) => p !== "vendors:view")) === j(prePerms) && ALL11N.indexOf("vendors:view") === ALL11N.indexOf("vendors:edit") + 1);
const preRoles = (await import("./js-pre6F/config/roles.js")).ROLES;
const ROLES7B = (await import("./js-pre7C/config/roles.js")).ROLES;   // Round 7C: Finance lost pii:view; this check is about an earlier round
check("G3", "only Admin holds it (through ALL_PERMISSIONS); every other role's permissions unchanged", ROLES.admin.permissions.includes("vendors:view")
  && ["hr", "fin", "emp"].every((k) => !ROLES[k].permissions.includes("vendors:view") && j(ROLES7B[k].permissions) === j(preRoles[k].permissions)));
const navItem = NAV.flatMap((g) => g.items).find((i) => i.href === VENDORS);
const preRoutes = (await import("./js-pre6F/config/routes.js")).ROUTES;
// Round Manager scoping part 1 (layout; finance.html's route moved since, to dashboard:finance: compared without it)
check("G4", "the route and the nav item use vendors:view (were vendors:create); no other route changed (but finance.html's, since: Manager scoping part 1)", ROUTES[VENDORS] === "vendors:view" && navItem?.permission === "vendors:view" && preRoutes[VENDORS] === "vendors:create"
  && j(Object.entries(ROUTES).filter(([p]) => p !== VENDORS && p !== "dashboard/finance.html" && p !== "leave/team-leave.html")) === j(Object.entries(preRoutes).filter(([p]) => p !== VENDORS && p !== "dashboard/finance.html")));   // Round Manager scoping part 2 (layout: team-leave.html is a new route)
check("G5", "the Vendors nav link shows for Aarav", [...d.querySelectorAll(".sidebar a")].some((a) => a.getAttribute("href")?.endsWith("inventory/vendors.html") && !a.hidden && !a.closest("[hidden]")));
for (const who of ["priya", "kabir", "arjun"]) {
  fresh();
  await open(VENDORS, who);
  const seen = { redirects: navigations.length, errs: jsErrors.length, rows: rows().length, options: $("vendor-status").options.length, stored: w.localStorage.getItem("officeos:vendors"),
    nav: [...d.querySelectorAll(".sidebar a")].filter((a) => a.getAttribute("href")?.endsWith("inventory/vendors.html") && !a.hidden && !a.closest("[hidden]")).length };
  check(`G6-${who}`, `${who} (no vendors:view): redirected by guard.js; the script draws nothing and reads nothing; no Vendors nav link`,
    j(seen) === j({ redirects: 1, errs: 0, rows: 0, options: 1, stored: null, nav: 0 }), j(seen));
}
{ fresh();
  const preHr = [...ROLES.hr.permissions];
  ROLES.hr.permissions.push("vendors:view");   // a role with vendors:view but not vendors:create / edit (none exists today)
  await open(VENDORS, "priya");
  const seen = { redirects: navigations.length, rows: ids().length, edits: rows().filter((tr) => !tr.querySelector(".table__actions button").hidden).length,
    add: headerBtn("Add vendor").hidden, export: d.querySelector("[data-export]").hidden };
  ROLES.hr.permissions.splice(0, ROLES.hr.permissions.length, ...preHr);
  check("G7", "with vendors:view only: the list shows, every Edit and 'Add vendor' are hidden, Export shown",
    j(seen) === j({ redirects: 0, rows: 5, edits: 0, add: true, export: false }), j(seen)); }
fresh();
await open(VENDORS, "oldAdmin");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("G8", "an old Admin session with no employee id: signed out and sent to sign in (round 11P, N2); nothing drawn, as for nobody signed in (G9)", navigations.length === 1 && localStorage.getItem("officeos:session") === null && rows().length === 0 && jsErrors.length === 0, j([ids().length, rows().length]));
fresh();
await open(VENDORS, "nobody");
check("G9", "nobody signed in: redirected to sign in, nothing drawn", navigations.length === 1 && rows().length === 0 && jsErrors.length === 0);
fresh();

// =====================================================================
section("H. The static page");
const html = fs.readFileSync(`${DIR}/${VENDORS}`, "utf8");
const sd = new JSDOM(html).window.document;
check("H1", "the static fallback is neutral (as items.html's): no rows, an empty pagination bar, only 'All statuses'",
  !sd.querySelector("#vendor-rows tr") && sd.querySelector("#vendor-pagination").classList.contains("is-empty") && sd.querySelectorAll("#vendor-status option").length === 1
  && sd.querySelector("#vendor-status option").value === "");
check("H2", "no invented figures or roles left: '5 of 12', Open orders, Store Manager, 'Last 30 days', 'Coffee beans and paper', the static rows' names",
  !/of 12 vendors|Open orders|Store Manager|Last 30 days|Coffee beans and paper|Rajiv Sharma|Meenal Kapoor|Neeraj Jain|Approvals inbox/.test(html));
check("H7", "the table uses 5F's table--fit (browser-checked: the static table was wider than its card at 1280 / 1440 / 1920)", sd.querySelector("#vendor-rows").closest("table").className === "table table--fit");
check("H3", "the subtitle no longer promises purchase orders", txt(sd.querySelector(".page-header__subtitle")) === "Suppliers, their contacts and payment terms");
const before = (p) => src("html-pre6F", p).replace(/\r\n/g, "\n");
const keep = (h) => h.replace(/\r\n/g, "\n").split("<main")[0];
check("H4", "everything before <main> (head, sidebar, topbar) is unchanged", keep(src("html-pre14A", VENDORS)) === keep(before(VENDORS)) /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */);
check("H5", "the page loads its script after app.js", /src="\.\.\/\.\.\/assets\/js\/app\.js"><\/script>\r?\n<script type="module" src="\.\.\/\.\.\/assets\/js\/pages\/vendors\.js"><\/script>/.test(html));
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const linking = walk(DIR).filter((p) => p.endsWith(".html")).map((p) => p.replaceAll("\\", "/"))
  .filter((p) => { const body = fs.readFileSync(`${DIR}/${p}`, "utf8").split("<main")[1] ?? ""; return /href="[^"]*vendors\.html/.test(body); });
check("H6", "no page links to vendors.html from its content (items.html's 'View orders' went in 6C); only the nav reaches it", j(linking) === j([]), j(linking));

// =====================================================================
section("L. Source layout");
const root = (dd) => new URL(`./${dd}`, import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
// L1 / L2: what 6F changed, read from 6F's result frozen (js-pre6G / html-pre6G); 6G's own changes are backlog L1-L3.
const live = walk(root("js-pre6G")).sort(), pre = walk(root("js-pre6F")).sort();
const changedJs = live.filter((p) => !pre.includes(p) || src("js-pre6G", p) !== src("js-pre6F", p)).map((p) => p.replaceAll("\\", "/"));
check("L1", "js: pages/vendors.js (new), inventory-view.js and the three config files; the store, the rules and roles untouched",
  j(changedJs) === j(["config/nav.js", "config/permissions.js", "config/routes.js", "pages/vendors.js", "ui/inventory-view.js"]) && pre.every((p) => live.includes(p)), j(changedJs));
const pagesNow = walk(root("html-pre6G")).filter((p) => p.endsWith(".html")).sort().map((p) => p.replaceAll("\\", "/"));
const pagesPre = walk(root("html-pre6F")).filter((p) => p.endsWith(".html")).sort().map((p) => p.replaceAll("\\", "/"));
const changedHtml = pagesNow.filter((p) => !pagesPre.includes(p) || src("html-pre6G", p) !== src("html-pre6F", p));
check("L2", "pages: only vendors.html changed", j(changedHtml) === j([VENDORS]) && j(pagesNow) === j(pagesPre), j(changedHtml));
const lf = (p) => src("js-pre7C", p).replace(/\r\n/g, "\n"), lfPre = (p) => src("js-pre6F", p).replace(/\r\n/g, "\n");   // js-pre7C: Round 7C edited nav.js / permissions.js
check("L3", "the config changes are exactly the one action, the route and the nav permission",
  lf("config/permissions.js") === lfPre("config/permissions.js").replace('  vendors:       ["create", "edit"],\n', '  vendors:       ["create", "edit", "view"],   // view: the vendor list (vendors.html); Admin only for now\n')
  && lf("config/routes.js") === lfPre("config/routes.js").replace('"inventory/vendors.html":          "vendors:create",', '"inventory/vendors.html":          "vendors:view",')
  && lf("config/nav.js") === lfPre("config/nav.js").replace('href: "inventory/vendors.html",          permission: "vendors:create" }', 'href: "inventory/vendors.html",          permission: "vendors:view" }'));
const gone = lfPre("ui/inventory-view.js").split("\n").filter((l) => !lf("ui/inventory-view.js").split("\n").includes(l));
check("L4", "inventory-view.js only gains the vendor status label and badge (the lines it lost are the header comment and the import line)",
  gone.length === 4 && gone.every((l) => l.startsWith("//") || l.startsWith("import {")) && /export const vendorStatusLabel/.test(lf("ui/inventory-view.js")) && /export function vendorStatusBadge/.test(lf("ui/inventory-view.js")), j(gone));
const code = (p) => src("js", p).split(/\r?\n/).filter((l) => !l.trim().startsWith("//")).join("\n");
check("L5", "no innerHTML in vendors.js or inventory-view.js", ["pages/vendors.js", "ui/inventory-view.js"].every((p) => !/innerHTML|insertAdjacentHTML|outerHTML/.test(code(p))));
const storeUse = [...code("pages/vendors.js").matchAll(/import \{([^}]+)\} from "\.\.\/data\/inventory-store\.js"/g)].flatMap((m) => m[1].split(",").map((s) => s.trim())).filter(Boolean);
check("L6", "the page uses the store's existing allVendors() only (no store change; no vendor writes exist)", j(storeUse) === j(["allVendors"]) && typeof I.allVendors === "function"
  && !["addVendor", "updateVendor"].some((f) => f in I), j(storeUse));
check("L7", "the script checks can('vendors:view') before drawing (guard.js only redirects)", /if \(can\("vendors:view"\) && tbody\)/.test(code("pages/vendors.js")));
check("L8", "the six files: CRLF only, no final newline", [...["config/permissions.js", "config/routes.js", "config/nav.js", "ui/inventory-view.js", "pages/vendors.js"].map((p) => src("js", p)), html]
  .every((s) => !/[^\r]\n/.test(s) && !/\r(?!\n)/.test(s) && !s.endsWith("\n")));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
