// usage: node invpages.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 6C: inventory/items.html and inventory/stock-movements.html wired to data/inventory-store.js, in jsdom.
// ./js-pre6C and ./html-pre6C are the code and pages before this round (6B's result). Fixed clock: Wed 30 Sep 2026
// 11:00 local.
//   A  items.html for Aarav on the seed: stats, rows, bars, badges, reorder alerts, value by category
//   B  category tabs, the stock-status filter, search;  C  pagination;  D  Export
//   E  items.html follows the ledger (a movement changes the figures)
//   F  stock-movements.html: rows, office time in every time zone, references, tags, departments
//   G  type tabs (Returns included) and search;  H  pagination and Export
//   I  the Record a movement form: what it offers, inline errors from the store, success, adjustments, tagged items
//   J  people without inventory:view / inventory:create; an old session;  K  the static pages (neutral, nothing invented)
//   L  source layout
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const ITEMS = "inventory/items.html", MOVES = "inventory/stock-movements.html";
const SCRIPT = { [ITEMS]: "items", [MOVES]: "stock-movements" };

const RealDate = Date;
const NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
let lastBlob = null;
URL.createObjectURL = (blob) => { lastBlob = blob; return "blob:test"; };
URL.revokeObjectURL = () => {};

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", SNEHA = "EMP-1029", ARJUN = "EMP-1105";
const WHO = {
  aarav: ["admin", "Aarav Mehta", AARAV], priya: ["hr", "Priya Nair", PRIYA], kabir: ["fin", "Kabir Shah", KABIR],
  arjun: ["emp", "Arjun Kapoor", ARJUN], oldAdmin: ["admin", "Aarav Mehta", undefined],
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
  auth.signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${SCRIPT[page]}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;

const I = await import("./js/data/inventory-store.js");
const V = await import("./js/data/inventory.js");

// ---- independent arithmetic (not the app's code) ----
const money = (n) => `₹${n.toLocaleString("en-IN")}`;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ist = (ms) => { const x = new RealDate(ms + 330 * 60000); return `${x.getUTCDate()} ${MON[x.getUTCMonth()]}, ${String(x.getUTCHours()).padStart(2, "0")}:${String(x.getUTCMinutes()).padStart(2, "0")}`; };

// ---- readers ----
const $ = (id) => d.getElementById(id);
const stat = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return [txt(s.querySelector(".stat__value")), txt(s.querySelector(".stat__delta")), s.querySelector(".stat__delta").className]; };
const itemRows = () => [...$("item-rows").children];
const skus = () => itemRows().map((tr) => tr.dataset.sku ?? null);
const moveRows = () => [...$("movement-rows").children];
const moveIds = () => moveRows().map((tr) => tr.dataset.movementId ?? null);
// Round 14E part 2 (layout): a cell's pieces without the reason line under the ready note (class reason); reasons2.mjs I1 pins that line
const pieces = (node) => { const out = []; const it = node.ownerDocument.createTreeWalker(node, 4); for (let n = it.nextNode(); n; n = it.nextNode()) { if (n.parentElement.closest(".reason")) continue; const t = n.textContent.replace(/\s+/g, " ").trim(); if (t) out.push(t); } return out.join(" "); };
const cells = (tr) => [...tr.children].map(pieces);
const pills = () => [...d.querySelectorAll(".table__toolbar .tabs__tab")];
const pill = (label) => pills().find((p) => txt(p) === label);
const typeIn = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event("input", { bubbles: true })); };
const choose = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event("change", { bubbles: true })); };
const pageText = () => txt(d.querySelector(".pagination > span")) ?? "";
const pageBtn = (label) => [...d.querySelectorAll(".pagination__btn")].find((b) => txt(b) === label);
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => ({ type: t.className.replace("toast toast--", ""), text: txt(t.querySelector(".toast__text")) }));
const clearToasts = () => d.querySelectorAll(".toast").forEach((t) => t.remove());
const errorAt = (id) => txt($(id).closest(".form-field").querySelector(".form-error"));
const errors = () => [...d.querySelectorAll(".form-error")].map(txt);
async function csvRows() {
  lastBlob = null;
  d.querySelector("[data-export]").click();
  if (!lastBlob) return null;
  return new TextDecoder("utf-8").decode(new Uint8Array(await lastBlob.arrayBuffer())).replace(/^﻿/, "").split("\r\n");
}
function submitMovement(f) {
  clearToasts();
  if ("sku" in f) choose("m-item", f.sku);
  if ("type" in f) choose("m-type", f.type);
  if ("quantity" in f) typeIn("m-qty", f.quantity);
  if ("reference" in f) typeIn("m-ref", f.reference);
  if ("department" in f) choose("m-dept", f.department);
  if ("note" in f) typeIn("m-note", f.note);
  $("movement-form").querySelector('[type="submit"]').click();
}

// =====================================================================
section("A. items.html for Aarav (Admin) on the seed");
await open(ITEMS, "aarav");
check("A1", "no JS errors, no redirect", jsErrors.length === 0 && navigations.length === 0, jsErrors.join(" | "));
check("A2", "Total items 12, '4 categories' (the static 342 / '5 categories' gone)", j(stat("items").slice(0, 2)) === j(["12", "4 categories"]), j(stat("items")));
check("A3", "Stock value = the store's ₹7,74,040 in full rupees, '167 units in stock'", j(stat("value").slice(0, 2)) === j([money(774040), "167 units in stock"]), j(stat("value")));
check("A4", "Low stock 3 (MX Keys, A4, coffee) and Out of stock 1 (HDMI), each with a 'down' note", j(stat("low")) === j(["3", "Below their reorder level", "stat__delta stat__delta--down"])
  && j(stat("out")) === j(["1", "Reorder now", "stat__delta stat__delta--down"]), j([stat("low"), stat("out")]));
const ALL_ORDER = ["IT-1019", "IT-1020", "IT-1021", "IT-1031", "IT-1044", "IT-1060", "IT-1080", "IT-1102", "FUR-2010", "STA-3001", "STA-3015", "PAN-4002"];
check("A5", "rows in the tabs' category order then SKU, 10 on page 1", j(skus()) === j(ALL_ORDER.slice(0, 10)), j(skus()));
const row1021 = itemRows().find((tr) => tr.dataset.sku === "IT-1021");
// Round 9J (behaviour; was "IT equipment Tagged: Laptop"): the category cell also says how much of a tagged item's
// stock is ready to assign (1 of the 6: AST-0218, the one tagged and available); the stock cell stays "6"
check("A6", "a row's cells: item + SKU, category (+ what it's tagged as, + how much is ready to assign: Round 9J), stock, reorder level, price, location, status, Edit",
  j(cells(row1021)) === j(["Dell Latitude 5440 IT-1021", "IT equipment Tagged: Laptop 1 of 6 ready to assign", "6", "5", "₹78,500", "Store room A", "In stock", "Edit"]), j(cells(row1021)));
const barOf = (sku) => itemRows().find((tr) => tr.dataset.sku === sku)?.querySelector(".progress__bar").style.getPropertyValue("--w");
const barsWant = I.allItems().filter((i) => ALL_ORDER.slice(0, 10).includes(i.sku)).map((i) => [i.sku, `${Math.round(Math.min(100, i.stock <= 0 ? 0 : i.reorderLevel <= 0 ? 100 : i.stock / (2 * i.reorderLevel) * 100))}%`]);
check("A7", "every bar width is stock / twice the reorder level (capped at 100; none for 0 stock)", barsWant.every(([sku, want]) => barOf(sku) === want) && barOf("IT-1021") === "60%" && barOf("IT-1044") === "15%",
  j(barsWant.map(([s]) => [s, barOf(s)])));
const badge = (sku) => itemRows().find((tr) => tr.dataset.sku === sku)?.querySelector("td:nth-child(7) .badge");
check("A8", "status badges: In stock green, Low stock amber, Out of stock red, Not stocked grey (no colour) for the three older laptops",
  badge("IT-1021").className === "badge badge--success badge--dot" && badge("IT-1044").className === "badge badge--warning badge--dot" && badge("IT-1102").className === "badge badge--danger badge--dot"
  && ["IT-1019", "IT-1020", "IT-1031"].every((s) => badge(s).className === "badge badge--dot" && txt(badge(s)) === "Not stocked"));
const stockDiv = (sku) => itemRows().find((tr) => tr.dataset.sku === sku)?.querySelector(".stock");
check("A9", "the stock cell's colours follow the status (low amber, out red)", stockDiv("IT-1044").className === "stock stock--low" && stockDiv("IT-1102").className === "stock stock--out"
  && stockDiv("IT-1021").className === "stock" && itemRows().find((tr) => tr.dataset.sku === "IT-1102").querySelector(".progress").className === "progress progress--sm progress--danger");
const edits = itemRows().map((tr) => tr.querySelector(".table__actions button"));
d.querySelectorAll(".toast").forEach((t) => t.remove());
edits[0].click();
check("A10", "every Edit (inventory:edit) is still a placeholder: an info toast, nothing else", edits.every((b) => b.dataset.permission === "inventory:edit" && b.dataset.notImplemented === "Edit" && !b.hidden)
  && j(toasts()) === j([{ type: "info", text: "Edit isn't available in this demo." }]));
const addItem = [...d.querySelectorAll(".page-header__actions button")].find((b) => txt(b) === "Add item");
check("A11", "'Add item' stays a placeholder on inventory:create", addItem?.dataset.notImplemented === "Add item" && addItem.dataset.permission === "inventory:create" && !addItem.hidden);
const alerts = [...$("reorder-list").children].map((li) => [txt(li.querySelector(".list__title")), txt(li.querySelector(".list__sub")), txt(li.querySelector(".badge"))]);
check("A12", "Reorder alerts: the store's four, emptiest first, with the page's wording; meta '4 items'", j(alerts) === j([
  ["HDMI cable, 2 m", "0 left, reorder level is 20", "Out"], ["Logitech MX Keys keyboard", "3 left, reorder level is 10", "Low"],
  ["Coffee beans, 1 kg", "8 left, reorder level is 10", "Low"], ["A4 paper ream", "42 left, reorder level is 50", "Low"]]) && txt($("reorder-meta")) === "4 items", j(alerts));
check("A13", "the purchase-order footer is gone (Q5: no purchase orders)", !/PO-2291|View orders|Purchase order/.test(d.querySelector("main").textContent));
const bars = [...$("value-by-category").children].map((r) => [txt(r.children[0]), txt(r.querySelector(".bar-row__value")), r.querySelector(".bar-row__fill").style.getPropertyValue("--w")]);
check("A14", "Stock value by category: the four categories in full rupees, bars against the largest", j(bars) === j([
  ["IT equipment", money(565000), "100%"], ["Furniture", money(179200), `${Math.round(179200 / 565000 * 100)}%`],
  ["Stationery", money(23040), `${Math.round(23040 / 565000 * 100)}%`], ["Pantry", money(6800), `${Math.round(6800 / 565000 * 100)}%`]]) && txt(d.querySelector("#value-by-category")?.closest(".card").querySelector(".card__meta")) === "At current unit prices", j(bars));

// =====================================================================
section("B. Category tabs, stock-status filter, search");
const byCat = {};
for (const label of ["IT equipment", "Furniture", "Stationery", "Pantry"]) { pill(label).click(); byCat[label] = skus(); }
check("B1", "each category tab shows exactly that category's items (IT 8 split 8, Furniture 1, Stationery 2, Pantry 1)",
  j(byCat) === j({ "IT equipment": ALL_ORDER.slice(0, 8), "Furniture": ["FUR-2010"], "Stationery": ["STA-3001", "STA-3015"], "Pantry": ["PAN-4002"] }), j(byCat));
pill("All").click();
check("B2", "All brings every item back", j(skus()) === j(ALL_ORDER.slice(0, 10)) && pageText() === "Showing 1 to 10 of 12");
check("B3", "the status filter offers All stock levels + In stock / Low stock / Out of stock / Not stocked (values = status keys)",
  j([...$("item-status").options].map((o) => [o.value, txt(o)])) === j([["", "All stock levels"], ["in", "In stock"], ["low", "Low stock"], ["out", "Out of stock"], ["none", "Not stocked"]]));
const byStatus = {};
for (const s of ["in", "low", "out", "none"]) { choose("item-status", s); byStatus[s] = skus(); }
check("B4", "each status shows exactly those items", j(byStatus) === j({ in: ["IT-1021", "IT-1060", "IT-1080", "FUR-2010", "STA-3015"], low: ["IT-1044", "STA-3001", "PAN-4002"],
  out: ["IT-1102"], none: ["IT-1019", "IT-1020", "IT-1031"] }), j(byStatus));
pill("IT equipment").click(); choose("item-status", "low");
check("B5", "tab and filter together: IT equipment + Low stock = the keyboard", j(skus()) === j(["IT-1044"]));
choose("item-status", "");
typeIn("item-search", "latitude");
check("B6", "search by name, case-insensitive, within the tab (IT equipment: three Latitudes)", j(skus()) === j(["IT-1019", "IT-1020", "IT-1021"]));
pill("All").click(); typeIn("item-search", "sta-30");
check("B7", "search by SKU", j(skus()) === j(["STA-3001", "STA-3015"]));
typeIn("item-search", "LATITUDE 54");
check("B7b", "search ignores case in what is typed too ('LATITUDE 54', 'Sta-3001')", j(skus()) === j(["IT-1019", "IT-1020", "IT-1021"]) && (typeIn("item-search", "Sta-3001"), j(skus()) === j(["STA-3001"])));
typeIn("item-search", "nothing like this");
check("B8", "no match: one row 'No items match these filters.' across all 8 columns, no pagination", itemRows().length === 1 && txt(itemRows()[0]) === "No items match these filters."
  && itemRows()[0].firstChild.colSpan === 8 && d.querySelector(".pagination").classList.contains("is-empty"));
typeIn("item-search", "");
check("B9", "the search box is the page's own (data-table-filter=off), so table-filter.js doesn't also hide rows", $("item-search").dataset.tableFilter === "off" && itemRows().every((tr) => !tr.hidden));

// =====================================================================
section("C. Pagination (renderPagination, 10 a page)");
pageBtn("Next").click();
check("C1", "Next: page 2 holds the last two items, 'Showing 11 to 12 of 12'", j(skus()) === j(ALL_ORDER.slice(10)) && pageText() === "Showing 11 to 12 of 12");
pageBtn("1").click();
check("C2", "page 1 again", j(skus()) === j(ALL_ORDER.slice(0, 10)) && pageText() === "Showing 1 to 10 of 12");
pageBtn("2").click(); choose("item-status", "low");
check("C3", "changing a filter goes back to page 1", pageText() === "" && j(skus()) === j(["IT-1044", "STA-3001", "PAN-4002"]));
choose("item-status", "");
pageBtn("2").click(); choose("item-status", "");
check("C4", "from page 2, a status change that still leaves two pages (All stock levels picked again) shows page 1", pageText() === "Showing 1 to 10 of 12" && j(skus()) === j(ALL_ORDER.slice(0, 10)));
pageBtn("2").click(); typeIn("item-search", "");
check("C5", "typing in search goes back to page 1 too", pageText() === "Showing 1 to 10 of 12");

// =====================================================================
section("D. Export");
const exportBtn = d.querySelector(".page-header__actions [data-export]");
check("D1", "items.html now has an Export button, gated on inventory:view (not reports:export), and its table an export name",
  exportBtn?.dataset.permission === "inventory:view" && !exportBtn.hidden && d.querySelector("table[data-export-name]")?.dataset.exportName === "inventory-items");
const csv = await csvRows();
// Round Data export part 2 (behaviour; was the visible rows, page 1's 10 items: the file now has all 12, every page)
check("D2", "the CSV: header without Actions, every item (both pages, 12 items), item and SKU together", csv?.[0] === "Item,Category,In stock,Reorder level,Unit price (₹),Location,Status"
  // Round 9J (behaviour; was "IT equipment Tagged: Laptop"): the note travels with the Category column; In stock stays 6
  // Round Data export (behaviour; was Unit price, "₹78,500")
  && csv.length === 13 && csv[3] === "Dell Latitude 5440 IT-1021,IT equipment Tagged: Laptop 1 of 6 ready to assign,6,5,78500,Store room A,In stock", j(csv?.slice(0, 4)));

// =====================================================================
section("E. items.html follows the ledger");
fresh();
I.recordMovement(AARAV, { sku: "STA-3001", type: "out", quantity: 42, reference: "Audit" });
I.recordMovement(AARAV, { sku: "PAN-4002", type: "in", quantity: 10, reference: "PO-1" });
await open(ITEMS, "aarav");
const a4 = itemRows().find((tr) => tr.dataset.sku === "STA-3001");
check("E1", "after 42 reams out and 10 coffee in: Low 1 (keyboard), Out 2 (HDMI, A4), value down by 42 x ₹320 and up by 10 x ₹850",
  stat("low")[0] === "1" && stat("out")[0] === "2" && stat("value")[0] === money(774040 - 42 * 320 + 10 * 850) && txt(a4.children[2]) === "0" && txt(badge("STA-3001")) === "Out of stock");
check("E2", "reorder alerts follow: HDMI and A4 out (tied at 0, by SKU), the keyboard low; coffee (18 / 10) gone", j([...$("reorder-list").children].map((li) => txt(li.querySelector(".list__title"))))
  === j(["HDMI cable, 2 m", "A4 paper ream", "Logitech MX Keys keyboard"]) && txt($("reorder-meta")) === "3 items");
fresh();
I.recordMovement(AARAV, { sku: "IT-1102", type: "in", quantity: 30, reference: "PO-2" });
I.recordMovement(AARAV, { sku: "IT-1044", type: "in", quantity: 10, reference: "PO-3" });
I.recordMovement(AARAV, { sku: "STA-3001", type: "in", quantity: 10, reference: "PO-4" });
I.recordMovement(AARAV, { sku: "PAN-4002", type: "in", quantity: 5, reference: "PO-5" });
await open(ITEMS, "aarav");
check("E3", "nothing to reorder: both stats 0 with plain notes, the list says so, meta '0 items'", j(stat("low")) === j(["0", "Nothing below its reorder level", "stat__delta"])
  && j(stat("out")) === j(["0", "Nothing out of stock", "stat__delta"]) && txt($("reorder-list")) === "Nothing to reorder." && txt($("reorder-meta")) === "0 items");
fresh();

// =====================================================================
section("F. stock-movements.html for Aarav on the seed");
await open(MOVES, "aarav");
check("F1", "no JS errors, no redirect", jsErrors.length === 0 && navigations.length === 0, jsErrors.join(" | "));
const seedMoves = I.allMovements();
check("F2", "every movement, newest first (9; no pagination at 10 a page)", j(moveIds()) === j(seedMoves.map((m) => m.id)) && moveIds().length === 9 && d.querySelector(".pagination").classList.contains("is-empty"));
const when = moveRows().map((tr) => txt(tr.children[0]));
check("F3", "times in India office time whatever the browser's zone: MOV-8 '18 Sep, 16:40', MOV-1 '8 Sep, 11:00' (each checked against the stored instant + 05:30)",
  when[1] === "18 Sep, 16:40" && when[8] === "8 Sep, 11:00" && when.every((t, i) => t === ist(RealDate.parse(seedMoves[i].at))), j(when));
const rowOf = (id) => moveRows().find((tr) => tr.dataset.movementId === id);
check("F4", "a row: time, item + SKU, type, signed quantity, reference, recorded by (Aarav, from the user list)",
  j(cells(rowOf("MOV-7"))) === j(["18 Sep, 11:05", "A4 paper ream STA-3001", "Stock out", "-10", "Finance department request Issued to Finance", "Aarav Mehta"]), j(cells(rowOf("MOV-7"))));
check("F5", "asset movements: 'Assigned to Sneha Rao' / 'Returned by Divya Menon' (names from the user list) with the tag; repairs say so with the tag",
  pieces(rowOf("MOV-8").children[4]) === "Assigned to Sneha Rao AST-0217" && pieces(rowOf("MOV-2").children[4]) === "Returned by Divya Menon AST-0217"
  && pieces(rowOf("MOV-1").children[4]) === "Sent for repair AST-0099" && rowOf("MOV-8").querySelector(".asset-tag")?.textContent === "AST-0217");
check("F6", "quantities signed and coloured (+ green, - red); type badges in the page's colours (out info, in success, adjustment warning, return primary)",
  rowOf("MOV-6").querySelector(".qty").className === "qty qty--in" && txt(rowOf("MOV-6").children[3]) === "+6" && rowOf("MOV-4").querySelector(".qty").className === "qty qty--out"
  && rowOf("MOV-8").querySelector(".badge").className === "badge badge--info badge--square" && rowOf("MOV-6").querySelector(".badge").className === "badge badge--success badge--square"
  && rowOf("MOV-4").querySelector(".badge").className === "badge badge--warning badge--square" && rowOf("MOV-2").querySelector(".badge").className === "badge badge--primary badge--square");
check("F7", "nobody fictional: no Vikram Singh as recorder, no static row left", !moveRows().some((tr) => /Vikram/.test(txt(tr))));
fresh();
await open(MOVES, "aarav");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
S.updateUser(USER_ACTOR("admin", SNEHA), SNEHA, { name: "Sneha Rao-Iyer" });
pill("All").click();
check("F8", "a holder's name is read from the user list, never a stored copy (renaming Sneha renames the row)", pieces(rowOf("MOV-8").children[4]) === "Assigned to Sneha Rao-Iyer AST-0217");
fresh();

// =====================================================================
section("G. Type tabs and search");
await open(MOVES, "aarav");
check("G1", "five tabs: All / Stock in / Stock out / Adjustments / Returns (Returns added, decision 1)", j(pills().map(txt)) === j(["All", "Stock in", "Stock out", "Adjustments", "Returns"]));
const byType = {};
for (const label of ["Stock in", "Stock out", "Adjustments", "Returns"]) { pill(label).click(); byType[label] = moveIds(); }
check("G2", "each tab shows exactly its type: in 2, out 5 (incl. the repair and the assignment), adjustments 1, returns 1",
  j(byType) === j({ "Stock in": ["MOV-6", "MOV-3"], "Stock out": ["MOV-9", "MOV-8", "MOV-7", "MOV-5", "MOV-1"], "Adjustments": ["MOV-4"], "Returns": ["MOV-2"] }), j(byType));
pill("All").click();
const find = (q) => { typeIn("movement-search", q); return moveIds(); };
const found = { sneha: find("sneha"), tag: find("ast-0099"), finance: find("finance"), po: find("PO-2270"), sku: find("pan-4002"), coffee: find("coffee") };
check("G3", "search: holder name, asset tag, department / reference, PO text, SKU, item name (case-insensitive)",
  j(found) === j({ sneha: ["MOV-8"], tag: ["MOV-1"], finance: ["MOV-7"], po: ["MOV-6"], sku: ["MOV-9", "MOV-3"], coffee: ["MOV-9", "MOV-3"] }), j(found));
pill("Stock in").click();
check("G4", "search within a tab (Stock in + 'coffee' = the 15 Sep delivery only)", j(find("coffee")) === j(["MOV-3"]));
find("zzz");
check("G5", "no match: one row across all 6 columns, 'No movements match this search.'", moveRows().length === 1 && txt(moveRows()[0]) === "No movements match this search." && moveRows()[0].firstChild.colSpan === 6);
find("");
check("G6", "the search box is the page's own (data-table-filter=off)", $("movement-search").dataset.tableFilter === "off");

// =====================================================================
section("H. Pagination and Export");
fresh();
for (let i = 0; i < 3; i++) I.recordMovement(AARAV, { sku: "STA-3015", type: "out", quantity: 1, reference: `Desk ${i + 1}` });
await open(MOVES, "aarav");
check("H1", "12 movements: 10 on page 1, 'Showing 1 to 10 of 12'; Next shows the oldest two", moveIds().length === 10 && pageText() === "Showing 1 to 10 of 12"
  && (pageBtn("Next").click(), j(moveIds()) === j(["MOV-2", "MOV-1"])));
pill("Stock out").click();
check("H2", "a tab click goes back to page 1", pageText() === "" && moveIds().length === 8);
pill("All").click();
const mExport = d.querySelector("[data-export]");
check("H3", "Export gated on inventory:view (was reports:export)", mExport.dataset.permission === "inventory:view" && !mExport.hidden);
const mcsv = await csvRows();
// Round Data export part 2 (behaviour; was the visible rows, page 1's 10: the file now has every movement, as many as the pager's "of N")
check("H4", "the CSV: Date,Item,Type,Quantity,Reference,Recorded by and every movement (every page)", mcsv?.[0] === "Date,Item,Type,Quantity,Reference,Recorded by" && mcsv.length === Number(d.querySelector("#movement-pagination > span")?.textContent.match(/of (\d+)/)?.[1] ?? 0) + 1 && mcsv.length > 11
  // Round Data export (behaviour; was "30 Sep, 11:00" and '-1: an ISO office time, and a stock-out's -1 stays a number)
  && mcsv[1] === `${new RealDate(NOW + 330 * 60000).toISOString().slice(0, 16).replace("T", " ")},\"Whiteboard markers, pack of 4 STA-3015\",Stock out,-1,Desk 3,Aarav Mehta`, j(mcsv?.slice(0, 2)));
fresh();

// =====================================================================
section("I. Record a movement");
await open(MOVES, "aarav");
const opts = [...$("m-item").options];
check("I1", "the form is shown (inventory:create), novalidate, its Record button real (no placeholder)", !$("movement-form").closest(".card").hidden && $("movement-form").noValidate
  && !$("movement-form").querySelector('[type="submit"]').dataset.notImplemented);
check("I2", "Item offers 'Select item' + all 12 items with SKU and stock now; Type the four types by key",
  opts.length === 13 && opts[0].value === "" && opts.find((o) => o.value === "STA-3001")?.textContent === "A4 paper ream (STA-3001), 42 in stock"
  && j([...$("m-type").options].map((o) => [o.value, o.textContent])) === j([["in", "Stock in"], ["out", "Stock out"], ["adjustment", "Adjustment"], ["return", "Return"]]));
check("I3", "'Issued to' only for Stock out: hidden for Stock in, shown for Stock out (Not issued + every department)", (choose("m-type", "in"), $("m-dept-field").hidden)
  && (choose("m-type", "out"), !$("m-dept-field").hidden) && $("m-dept").options.length === S.getAllDepartments().length + 1 && $("m-dept").options[0].textContent === "Not issued to a department");
choose("m-dept", "FIN"); choose("m-type", "in");
check("I4", "switching away from Stock out clears the department", $("m-dept").value === "" && $("m-dept-field").hidden);
choose("m-type", "adjustment");
check("I5", "Adjustment: Quantity may be below 0 (no min), with the store's own hint", !$("m-qty").hasAttribute("min") && txt($("m-qty-hint")) === "A whole number other than 0. Below 0 takes stock away.");
choose("m-type", "in");
check("I6", "other types: min 1 and 'A whole number, at least 1.'", $("m-qty").getAttribute("min") === "1" && txt($("m-qty-hint")) === "A whole number, at least 1.");
choose("m-type", "out"); choose("m-item", "IT-1021");
const tOpt = (v) => [...$("m-type").options].find((o) => o.value === v);
check("I7", "a tagged item (Latitude 5440): Stock out and Return disabled, Type moved to Stock in, the hint shown",
  tOpt("out").disabled && tOpt("return").disabled && !tOpt("in").disabled && !tOpt("adjustment").disabled && $("m-type").value === "in" && !$("m-type-hint").hidden);
choose("m-item", "STA-3001");
check("I8", "a counted item again: every type enabled, hint hidden", [...$("m-type").options].every((o) => !o.disabled) && $("m-type-hint").hidden);
$("movement-form").reset();
choose("m-item", "");
submitMovement({ type: "in", quantity: "5", reference: "PO-9" });
check("I9", "no item: the store's 'Choose an item.' under Item, nothing stored", errorAt("m-item") === "Choose an item." && errors().length === 1 && I.allMovements().length === 9);
submitMovement({ sku: "STA-3001", type: "in", quantity: "0", reference: "PO-9" });
check("I10", "quantity 0: under Quantity (one error at a time: the earlier one cleared)", errorAt("m-qty") === "Enter a whole number of units, at least 1." && errors().length === 1);
submitMovement({ sku: "STA-3001", type: "in", quantity: "5", reference: "  " });
check("I11", "blank reference: under Reference", errorAt("m-ref") === "Reference is required." && errors().length === 1);
submitMovement({ sku: "STA-3001", type: "out", quantity: "43", reference: "Floor 2" });
check("I12", "more than in stock: 'Only 42 in stock.' under Quantity", errorAt("m-qty") === "Only 42 in stock." && I.allMovements().length === 9);
typeIn("m-qty", "4");
check("I13", "typing in the field clears its error", errors().length === 0);
submitMovement({ sku: "STA-3001", type: "out", quantity: "4", reference: "Floor 2", department: "FIN", note: "Quarter-end printing" });
const added = I.allMovements()[0];
check("I14", "success: stored by the signed-in Admin with the department and note; a success toast with the new stock",
  j([added.sku, added.type, added.change, added.reference, added.department, added.note, added.recordedBy]) === j(["STA-3001", "out", -4, "Floor 2", "FIN", "Quarter-end printing", AARAV])
  && j(toasts()) === j([{ type: "success", text: "Recorded: Stock out, -4 A4 paper ream. 38 in stock now." }]), j(toasts()));
check("I15", "the new movement tops the table in office time, recorded by Aarav, 'Issued to Finance'", moveIds()[0] === added.id
  && j(cells(moveRows()[0])) === j([ist(NOW), "A4 paper ream STA-3001", "Stock out", "-4", "Floor 2 Issued to Finance Quarter-end printing", "Aarav Mehta"]), j(cells(moveRows()[0])));
check("I16", "the form is cleared and the item list shows the new stock", $("m-item").value === "" && $("m-qty").value === "" && $("m-ref").value === "" && $("m-note").value === ""
  && $("m-dept-field").hidden && [...$("m-item").options].find((o) => o.value === "STA-3001").textContent === "A4 paper ream (STA-3001), 38 in stock");
submitMovement({ sku: "IT-1102", type: "adjustment", quantity: "-1", reference: "Count" });
check("I17", "an adjustment below 0 that would go under 0 is refused at Quantity ('Only 0 in stock.')", errorAt("m-qty") === "Only 0 in stock.");
submitMovement({ sku: "IT-1044", type: "adjustment", quantity: "-2", reference: "Stock count" });
check("I18", "a negative adjustment: stored as -2, the keyboard at 1", I.allMovements()[0].change === -2 && I.stockOf("IT-1044") === 1 && txt(moveRows()[0].children[3]) === "-2");
const tagged = I.recordMovement(AARAV, { sku: "IT-1021", type: "out", quantity: 1, reference: "x" });
typeIn("movement-search", "human resources");
const hrOnly = moveIds();
submitMovement({ sku: "STA-3015", type: "out", quantity: "2", reference: "Floor 3", department: "HR" });
typeIn("movement-search", "human resources");
check("I18b", "search finds a movement by its department's name even when the reference doesn't say it (before it exists: only the no-match row)", j(hrOnly) === j([null]) && j(moveIds()) === j([I.allMovements()[0].id]) && I.allMovements()[0].department === "HR", j({ hrOnly, ids: moveIds(), top: I.allMovements()[0], errs: errors(), toasts: toasts() }));
typeIn("movement-search", "");
check("I19", "the page's disabled options match the store: a tagged item's stock-out is refused there too", tagged.ok === false && tagged.field === "type");
fresh();
I.allItems();
{ const box = JSON.parse(w.localStorage.getItem("officeos:inventory-items")); box.records.find((r) => r.sku === "STA-3001").name = "<b>Bold</b> paper"; w.localStorage.setItem("officeos:inventory-items", JSON.stringify(box)); }
await open(MOVES, "aarav");
submitMovement({ sku: "STA-3001", type: "in", quantity: "5", reference: "PO-9" });
const toastEl = d.querySelector(".toast__text");
check("I20", "the toast is built with escaped text: an item named '<b>Bold</b> paper' shows as that text, no <b> element (toast.js uses innerHTML)",
  toastEl?.textContent.trim() === "Recorded: Stock in, +5 <b>Bold</b> paper. 47 in stock now." && !toastEl.querySelector("b") && txt(moveRows()[0].children[1]) === "<b>Bold</b> paperSTA-3001" && !$("movement-rows").querySelector("b"));
fresh();

// =====================================================================
section("J. Who sees what");
for (const who of ["priya", "kabir", "arjun"]) {
  await open(ITEMS, who);
  const itemsSeen = { errs: jsErrors.length, redirects: navigations.length, rows: $("item-rows").children.length, stats: ["items", "value", "low", "out"].map((k) => stat(k)[0]), alerts: $("reorder-list").children.length,
    bars: $("value-by-category").children.length, stored: w.localStorage.getItem("officeos:inventory-items") };
  await open(MOVES, who);
  const movesSeen = { errs: jsErrors.length, redirects: navigations.length, rows: $("movement-rows").children.length, items: $("m-item").options.length, stored: w.localStorage.getItem("officeos:stock-movements") };
  check(`J-${who}`, `${who} (no inventory:view): redirected by guard.js on both pages; the scripts draw nothing and read nothing (the neutral static page is all that shows)`,
    j(itemsSeen) === j({ errs: 0, redirects: 1, rows: 0, stats: ["—", "—", "—", "—"], alerts: 0, bars: 0, stored: null }) && j(movesSeen) === j({ errs: 0, redirects: 1, rows: 0, items: 1, stored: null }), j([itemsSeen, movesSeen]));
}
fresh();
await open(MOVES, "oldAdmin");
submitMovement({ sku: "STA-3001", type: "in", quantity: "5", reference: "PO-9" });
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("J1", "an old Admin session with no employee id: signed out and sent to sign in (round 11P, N2); the form isn't wired, so the movement does nothing (jsdom's only complaint is that the unwired form's requestSubmit isn't implemented); nothing stored",
  navigations.length === 1 && localStorage.getItem("officeos:session") === null && toasts().length === 0 && I.allMovements().length === 9 && jsErrors.every((e) => /requestSubmit/.test(e)), j([navigations.length, localStorage.getItem("officeos:session"), moveRows().length, toasts(), I.allMovements().length, jsErrors]));
fresh();

// =====================================================================
section("K. The static pages");
const itemsHtml = fs.readFileSync(`${DIR}/${ITEMS}`, "utf8"), movesHtml = fs.readFileSync(`${DIR}/${MOVES}`, "utf8");
const staticItems = new JSDOM(itemsHtml).window.document, staticMoves = new JSDOM(movesHtml).window.document;
check("K1", "items.html's static fallback is neutral (as expenses.html's): stats '—', no rows, no alerts, no bars, no pagination text",
  [...staticItems.querySelectorAll(".stat__value")].every((s) => s.textContent === "—") && !staticItems.querySelector("#item-rows tr") && !staticItems.querySelector("#reorder-list .list__item")
  && !staticItems.querySelector("#value-by-category .bar-row") && staticItems.querySelector("#item-pagination").classList.contains("is-empty") && txt(staticItems.querySelector("#reorder-meta")) === "—");
check("K2", "no invented figures left on items.html (342, ₹18.6L, '5 categories', '3 awaiting approval', PO-2291, ₹ lakh)",
  !/342|18\.6L|5 categories|awaiting approval|PO-2291|₹ lakh|\+₹1\.4L/.test(itemsHtml));
check("K3", "stock-movements.html's static fallback: no rows, no pagination text, an empty item list, no Vikram, no '186'",
  !staticMoves.querySelector("#movement-rows tr") && staticMoves.querySelector("#movement-pagination").classList.contains("is-empty") && staticMoves.querySelectorAll("#m-item option").length === 1 && !/Vikram|186/.test(movesHtml));
check("K4", "Q12: the alert no longer promises an audit log; the form card is gated on inventory:create; Reference marked required",
  /history always stays complete\.</.test(movesHtml) && !/audit log/.test(movesHtml) && staticMoves.querySelector("#movement-form").closest(".card").dataset.permission === "inventory:create"
  && staticMoves.querySelector('label[for="m-ref"]').classList.contains("form-label--required"));
const before = (p) => src("html-pre6C", p).replace(/\r\n/g, "\n");
const keep = (html) => html.replace(/\r\n/g, "\n").split("<main")[0];
check("K5", "everything before <main> (head, sidebar, topbar) is unchanged on both pages", keep(src("html-pre14A", ITEMS)) === keep(before(ITEMS)) && keep(src("html-pre14A", MOVES)) === keep(before(MOVES)) /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */);
const lfOnly = (text) => text.replace(/\r\n/g, "\n");
// 6C's result, frozen (css-pre6G): Round 6G renamed the rule's heading when expenses.html started using it.
const invCss = lfOnly(src("css-pre6G", "pages/inventory.css")), invCssPre = lfOnly(src("css-pre6C", "inventory.css"));
const VALUE_RULE = ["/* ---------- Stock value by category (items.html) ----------",
  "   The amounts are full rupees (\"₹5,65,000\"), wider than the 36px value column",
  "   .bar-row has for counts; a fixed width keeps every bar the same length. */",
  ".value-bars .bar-row { grid-template-columns: 96px minmax(0, 1fr) 76px; }", "", ""].join("\n");
const PO_HEADING = "/* ---------- Purchase order line ---------- */";
check("K7", "layout (browser-checked): the movements table uses 5F's table--fit (the static one was already wider than its card); the value card's rupee column is widened by one page-scoped rule",
  staticMoves.querySelector("#movement-rows").closest("table").className === "table table--fit" && staticItems.querySelector("#value-by-category").className === "card__body value-bars"
  && invCss === invCssPre.replace(PO_HEADING, VALUE_RULE + PO_HEADING));
check("K6", "each page loads its own script after app.js", /src="\.\.\/\.\.\/assets\/js\/app\.js"><\/script>\r?\n<script type="module" src="\.\.\/\.\.\/assets\/js\/pages\/items\.js"><\/script>/.test(itemsHtml)
  && /app\.js"><\/script>\r?\n<script type="module" src="\.\.\/\.\.\/assets\/js\/pages\/stock-movements\.js"><\/script>/.test(movesHtml));

// =====================================================================
section("L. Source layout");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const root = (dd) => new URL(`./${dd}`, import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
// Since Round 6D, 6C's result is read frozen (./js-pre6D, ./html-pre6D): 6D wired the asset pages and added assets:view.
const live = walk(root("js-pre6D")).sort(), pre = walk(root("js-pre6C")).sort();
const changedJs = live.filter((p) => !pre.includes(p) || src("js-pre6D", p) !== src("js-pre6C", p));
check("L1", "js: only the three new files (ui/inventory-view.js, pages/items.js, pages/stock-movements.js); the store, the rules and config untouched",
  j(changedJs) === j(["pages/items.js", "pages/stock-movements.js", "ui/inventory-view.js"]) && pre.every((p) => live.includes(p)), j(changedJs));
const pagesNow = walk(root("html-pre6D")).filter((p) => p.endsWith(".html")).sort(), pagesPre = walk(root("html-pre6C")).filter((p) => p.endsWith(".html")).sort();
const changedHtml = pagesNow.filter((p) => !pagesPre.includes(p) || src("html-pre6D", p) !== src("html-pre6C", p)).map((p) => p.replaceAll("\\", "/"));
check("L2", "pages: only items.html and stock-movements.html changed", j(changedHtml) === j([ITEMS, MOVES]) && j(pagesNow) === j(pagesPre), j(changedHtml));
const code = (p) => src("js", p).split(/\r?\n/).filter((l) => !l.trim().startsWith("//")).join("\n");
const NEW = ["ui/inventory-view.js", "pages/items.js", "pages/stock-movements.js"];
check("L3", "no innerHTML in the new scripts (toast text goes through escapeHtml)", NEW.every((p) => !/innerHTML|insertAdjacentHTML|outerHTML/.test(code(p))) && /showToast\(escapeHtml\(/.test(code("pages/stock-movements.js")));
const usedStore = [...new Set(NEW.flatMap((p) => [...code(p).matchAll(/import \{([^}]+)\} from "\.\.\/data\/inventory-store\.js"/g)].flatMap((m) => m[1].split(",").map((s) => s.trim()))))].sort();
// Round 9J (behaviour; was without allAssets): the tagged-stock note reads the asset register through the store's
// existing allAssets(); still no store change (inventory-store.js is HEAD's)
check("L4", "the pages use the store's existing reads and recordMovement only (no store change was needed; Round 9J: + allAssets)", j(usedStore) === j(["allAssets", "allItems", "allMovements", "inventoryTotals", "recordMovement", "reorderAlerts"])
  && usedStore.every((f) => typeof I[f] === "function"), j(usedStore));
check("L5", "both scripts check can() before drawing (guard.js only redirects), inventory:view for the page, inventory:create for the form",
  /if \(can\("inventory:view"\) && tbody\)/.test(code("pages/items.js")) && /if \(can\("inventory:view"\) && tbody\)/.test(code("pages/stock-movements.js")) && /if \(can\("inventory:create"\) && form/.test(code("pages/stock-movements.js")));
check("L6", "the six files: CRLF only, no final newline", [...NEW.map((p) => `js/${p}`)].map((p) => fs.readFileSync(new URL(`./${p}`, import.meta.url), "utf8"))
  .concat([itemsHtml, movesHtml, fs.readFileSync(`${DIR}/../assets/css/pages/inventory.css`, "utf8")]).every((s) => !/[^\r]\n/.test(s) && !/\r(?!\n)/.test(s) && !s.endsWith("\n")));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
