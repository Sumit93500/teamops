// usage: node labels.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 9J: 9I's findings as decided (round-9i-notes.md), in jsdom with the js in ./js. ./js-pre9J, ./html-pre9J and
// ./css-pre9J are the code, pages and styles before this round (office-os 3b6c915).
//   A  tagged stock: items.html's rows and stock-movements.html's item list and toast say how much of a tagged item's
//      stock is tagged and ready to assign, when that isn't all of it; the stock figures themselves are unchanged
//   B  the Admin dashboard's "Items to reorder" (was "Low-stock items"); its comment says "below", as the code is
//   C  mark-attendance.html: "Ask for a correction from My attendance" (was "Ask HR to correct it")
//   D  shifts.html: the two invented stats labelled "Sample, not built yet"; the late-mark stat and the sample rules
//      form say the app's rule (2 a month free, every 3rd costs half a day)
//   E  data/attendance.js: only its header comment
//   F  the change set, line endings, no page errors
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const PAGE = {
  items: ["inventory/items.html", "items"], moves: ["inventory/stock-movements.html", "stock-movements"],
  admin: ["dashboard/admin.html", "admin-dashboard"], mark: ["attendance/mark-attendance.html", "mark-attendance"],
  myatt: ["attendance/my-attendance.html", "my-attendance"],
};
const HTML = Object.fromEntries(Object.entries(PAGE).map(([k, [p]]) => [k, fs.readFileSync(`${DIR}/${p}`, "utf8")]));
const RAW = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const SRC = (dir, p) => fs.readFileSync(`${HERE}${dir}/${p}`, "utf8");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 10, 7);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
let blobs = [];
URL.createObjectURL = (blob) => { blobs.push(blob); return "blob:test"; };
URL.revokeObjectURL = () => {};

const WHO = { aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"] };
let loads = 0, w = null, d = null, saved = {};
const jsErrors = [];
async function open(who, page) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) jsErrors.push(`${who} ${page}: ${e.message}`); });
  const dom = new JSDOM(HTML[page], { url: `http://localhost/office-os/pages/${PAGE[page][0]}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${PAGE[page][1]}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const $ = (id) => d.getElementById(id);
const parse = (html) => new JSDOM(html).window.document;
// A row's cells, each cell's text pieces joined with " | " (so a sub-line stays visible as its own piece).
// Round 14E part 2 (layout): a cell's pieces without the reason line under the ready note (class reason); reasons2.mjs I1 pins that line
const pieces = (node) => { const out = []; const wk = node.ownerDocument.createTreeWalker(node, 4); for (let t = wk.nextNode(); t; t = wk.nextNode()) { if (t.parentElement.closest(".reason")) continue; const v = t.textContent.replace(/\s+/g, " ").trim(); if (v) out.push(v); } return out.join(" | "); };
const rowOf = (sku) => d.querySelector(`#item-rows tr[data-sku="${sku}"]`);
const cellsOf = (sku) => [...rowOf(sku).children].map(pieces);
const noteOf = (sku) => [...rowOf(sku).children[1].querySelectorAll("div")].find((x) => / ready to assign$/.test(x.textContent)) ?? null;
const statOf = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return [txt(s.querySelector(".stat__label")), txt(s.querySelector(".stat__value")), txt(s.querySelector(".stat__delta")), s.hidden]; };
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => txt(t.querySelector(".toast__text")));
const exportCsv = async () => {
  blobs = [];
  d.querySelector("[data-export]").click();
  return Promise.all(blobs.map(async (b) => (await b.text()).replace(/^﻿/, "").split("\r\n")));
};
const TIP = "Untagged units are counted in stock but can't be assigned until they're tagged.";

const I = await import("./js/data/inventory-store.js");
const V = await import("./js/ui/inventory-view.js");
const A = await import("./js/data/attendance-store.js");

// =====================================================================
section("A. Tagged stock: how much is tagged and ready to assign");
setNow(2026, 10, 7); fresh(); await open("aarav", "items");
check("A1", "items.html, the Dell 24\" monitor (4 in stock, no monitor tagged and available): '0 of 4 ready to assign' under 'Tagged: Monitor', with the why as its tooltip",
  txt(noteOf("IT-1060")) === "0 of 4 ready to assign" && noteOf("IT-1060").title === TIP && noteOf("IT-1060").className === "text-sm text-muted", j(cellsOf("IT-1060")));
check("A2", "…the Latitude 5440 '1 of 6' (AST-0218 is the one), the access card '0 of 30'",
  txt(noteOf("IT-1021")) === "1 of 6 ready to assign" && txt(noteOf("IT-1080")) === "0 of 30 ready to assign", j([cellsOf("IT-1021"), cellsOf("IT-1080")]));
check("A3", "the note sits in the Category cell under 'Tagged: …'; the In stock cell is still the number alone, and status and price are as before",
  j(cellsOf("IT-1060")) === j(["Dell 24\" monitor | IT-1060", "IT equipment | Tagged: Monitor | 0 of 4 ready to assign", "4", "3", "₹14,500", "Store room A", "In stock", "Edit"]), j(cellsOf("IT-1060")));
check("A4", "no note on an untagged item, nor on a tagged item with nothing in stock (the three older laptops)",
  ["IT-1044", "IT-1102", "FUR-2010", "STA-3001", "IT-1019", "IT-1020", "IT-1031"].every((s) => noteOf(s) === null && !/ready to assign/.test(rowOf(s).textContent)));
const statsBefore = [...d.querySelectorAll(".stat")].map((s) => txt(s));
check("A5", "the stock figures are unchanged: 12 items, ₹7,74,040 for 167 units, 3 low, 1 out (no seed change)",
  j(statsBefore) === j(["Total items 12 4 categories", "Stock value ₹7,74,040 167 units in stock", "Low stock 3 Below their reorder level", "Out of stock 1 Reorder now"]), j(statsBefore));
const csv = (await exportCsv()).flat();
const csv1060 = csv.find((l) => /IT-1060/.test(l));
check("A6", "the items export: the In stock column stays a plain number (4); the note travels with the Category cell",
  csv1060 === '"Dell 24"" monitor IT-1060",IT equipment Tagged: Monitor 0 of 4 ready to assign,4,3,14500,Store room A,In stock' /* Round Data export (behaviour; was "₹14,500") */, csv1060);
// it follows the register: the monitor comes back to the store, then the laptop goes out
const back = I.returnAsset("EMP-1001", "AST-0302", { condition: "good", location: "store-a" });
const out = I.assignAsset("EMP-1001", "AST-0218", { holderId: "EMP-1017" });
await open("aarav", "items");
check("A7", "it follows the register: AST-0302 taken back -> the monitor '1 of 5'; AST-0218 handed out -> the 5440 '0 of 5'",
  back.ok && out.ok && txt(noteOf("IT-1060")) === "1 of 5 ready to assign" && txt(noteOf("IT-1021")) === "0 of 5 ready to assign", j([cellsOf("IT-1060")[1], cellsOf("IT-1021")[1]]));
const adj = I.recordMovement("EMP-1001", { sku: "IT-1060", type: "adjustment", quantity: -4, reference: "Count" });
await open("aarav", "items");
check("A8", "when every unit in stock is a tagged, available asset (the monitor down to its 1), there's no note",
  adj.ok && I.stockOf("IT-1060") === 1 && noteOf("IT-1060") === null && j(cellsOf("IT-1060").slice(1, 3)) === j(["IT equipment | Tagged: Monitor", "1"]), j(cellsOf("IT-1060")));
check("A9", "readyToAssign(): null for an untagged item, for no stock, and when all of it is ready; else the count",
  typeof V.readyToAssign === "function" && V.readyToAssign({ sku: "X", assetType: null, stock: 5 }, []) === null && V.readyToAssign({ sku: "X", assetType: "laptop", stock: 0 }, []) === null
  && V.readyToAssign({ sku: "X", assetType: "laptop", stock: 1 }, [{ sku: "X", status: "available" }]) === null
  && V.readyToAssign({ sku: "X", assetType: "laptop", stock: 3 }, [{ sku: "X", status: "available" }, { sku: "X", status: "assigned" }, { sku: "Y", status: "available" }]) === 1);

setNow(2026, 10, 7); fresh(); await open("aarav", "moves");
const opt = (sku) => [...$("m-item").options].find((o) => o.value === sku)?.textContent;
check("A10", "stock-movements.html's item list: a tagged item says it too ('4 in stock, 0 tagged and ready to assign'); an untagged one is as before",
  opt("IT-1060") === "Dell 24\" monitor (IT-1060), 4 in stock, 0 tagged and ready to assign" && opt("IT-1021") === "Dell Latitude 5440 (IT-1021), 6 in stock, 1 tagged and ready to assign"
  && opt("STA-3001") === "A4 paper ream (STA-3001), 42 in stock" && opt("IT-1019") === "Dell Latitude 5410 (IT-1019), 0 in stock", j([opt("IT-1060"), opt("IT-1021"), opt("STA-3001"), opt("IT-1019")]));
const record = (sku, type, qty) => {
  $("m-item").value = sku; $("m-item").dispatchEvent(new w.Event("change"));
  $("m-type").value = type; $("m-type").dispatchEvent(new w.Event("change"));
  $("m-qty").value = String(qty); $("m-ref").value = "PO-9J";
  $("movement-form").dispatchEvent(new w.Event("submit", { cancelable: true }));
};
record("IT-1060", "in", 2);
record("STA-3001", "in", 5);
check("A11", "the 'recorded' toast: a stock-in of 2 monitors says '6 in stock now, 0 tagged and ready to assign'; paper as before ('47 in stock now.')",
  j(toasts()) === j(["Recorded: Stock in, +2 Dell 24\" monitor. 6 in stock now, 0 tagged and ready to assign.", "Recorded: Stock in, +5 A4 paper ream. 47 in stock now."]), j(toasts()));
check("A12", "…and the list after it: '6 in stock, 0 tagged and ready to assign'", opt("IT-1060") === "Dell 24\" monitor (IT-1060), 6 in stock, 0 tagged and ready to assign", opt("IT-1060"));

// =====================================================================
section("B. The Admin dashboard's Items to reorder");
setNow(2026, 10, 7); fresh(); await open("aarav", "admin");
check("B1", "Aarav: 'Items to reorder' 4, '1 out of stock, 3 low' (was labelled 'Low-stock items')", j(statOf("stock")) === j(["Items to reorder", "4", "1 out of stock, 3 low", false]), j(statOf("stock")));
const adminCsv = (await exportCsv()).find((f) => f[0] === "Metric,Value") ?? [];
check("B2", "…its stats export row reads 'Items to reorder,4'", adminCsv.includes("Items to reorder,4") && !adminCsv.some((l) => /Low-stock/.test(l)), j(adminCsv));
const reorder = I.reorderAlerts();
check("B3", "…4 = items.html's Low stock 3 + Out of stock 1 = the Reorder alerts card's list", reorder.length === 4 && reorder.filter((i) => i.status === "out").length === 1 && reorder.filter((i) => i.status === "low").length === 3);
await open("priya", "admin");
check("B4", "HR by URL: still hidden and '—' (9B's gate untouched)", j(statOf("stock")) === j(["Items to reorder", "—", "", true]), j(statOf("stock")));
const ADMIN_JS = SRC("js", "pages/admin-dashboard.js"), ADMIN_JS0 = SRC("js-pre9J", "pages/admin-dashboard.js");
check("B5", "the comment now says 'below their reorder level or out of stock … exactly at it is still in stock'; 'at or below' is gone",
  /\/\/ The items to reorder: below their reorder level or out of stock \(exactly\r\n\/\/ at it is still in stock, data\/inventory\.js\)/.test(ADMIN_JS) && !/at or below/.test(ADMIN_JS));
// Round 12Z (layout; was the live file): admin-dashboard.js as 77b5ddb has it (js-pre12Z); 12Z adds the salary kind (salinbox.mjs A1)
check("B6", "…and that comment is the only change to admin-dashboard.js (code untouched)",
  SRC("js-pre12Z", "pages/admin-dashboard.js").replace(/\/\/ The items to reorder:[^\n]*\n[^\n]*\n\/\/ alerts" card shows \(reorderAlerts\(\)\)\./, "X") === ADMIN_JS0.replace(/\/\/ The items at or below[^\n]*\n\/\/ card shows \(reorderAlerts\(\)\)\./, "X"));
check("B7", "admin.html: only the label changed", SRC("html-pre13Z", "dashboard/admin.html").replace("Items to reorder", "Low-stock items") === SRC("html-pre9J", "dashboard/admin.html"));   // Round 13Z (scope; was the live page)

// =====================================================================
section("C. Mark attendance: who corrects a missed punch");
setNow(2026, 10, 7); fresh(); await open("arjun", "mark");
const tip = [...d.querySelectorAll(".alert--info")].map(txt);
check("C1", "the line reads 'Forgot to punch, or the system was down? Ask for a correction from My attendance.' ('Ask HR' gone)",
  j(tip) === j(["Forgot to punch, or the system was down? Ask for a correction from My attendance."]) && !/Ask HR/.test(RAW("attendance/mark-attendance.html")), j(tip));
check("C2", "…still linking to my-attendance.html", d.querySelector(".alert--info a")?.getAttribute("href") === "my-attendance.html");
await open("arjun", "myatt");
d.getElementById("request-btn").click();
check("C3", "…which says who decides: for Arjun, 'Sneha Rao first, then HR or an Admin' (so the page no longer contradicts it)", $("reg-manager").value === "Sneha Rao first, then HR or an Admin", $("reg-manager").value);
check("C4", "mark-attendance.html: only that sentence changed",
  SRC("html-pre14A", "attendance/mark-attendance.html") /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */.replace("Ask for a correction from", "Ask HR to correct it from") === SRC("html-pre9J", "attendance/mark-attendance.html"));

// =====================================================================
section("D. Shifts: the sample stats labelled, the late-mark rule as the app has it");
const sh = parse(RAW("attendance/shifts.html")), sh0 = parse(SRC("html-pre9J", "attendance/shifts.html"));
const shStats = (doc) => [...doc.querySelectorAll(".stat-strip .stat")].map((s) => [txt(s.querySelector(".stat__label")), txt(s.querySelector(".stat__value")), txt(s.querySelector(".stat__delta"))]);
check("D1", "the two invented stats say 'Sample, not built yet' (hr.html's sample-stat wording): Shifts 4, On the general shift 201",
  j(shStats(sh).slice(0, 2)) === j([["Shifts", "4", "Sample, not built yet"], ["On the general shift", "201", "Sample, not built yet"]]), j(shStats(sh)));
check("D2", "the grace period is the app's 15 min, unchanged", j(shStats(sh)[2]) === j(["Grace period", "15 min", "After shift start"]) && A.ATTENDANCE_RULES.graceMinutes === 15);
check("D3", "'Late marks allowed' 2, 'A month; every 3rd costs half a day' (was 3, 'Per month'): the app's penaltyEvery - 1",
  j(shStats(sh)[3]) === j(["Late marks allowed", "2", "A month; every 3rd costs half a day"]) && A.ATTENDANCE_RULES.penaltyEvery === 3 && Number(shStats(sh)[3][1]) === A.ATTENDANCE_RULES.penaltyEvery - 1, j(shStats(sh)[3]));
const lbl = (doc, id) => txt(doc.querySelector(`label[for="${id}"]`));
check("D4", "the sample rules form: 'Free late marks a month' 2, 'Every 3rd late mark counts as' (was 'Late marks a month' 3, '…over the limit…'); its options as before",
  lbl(sh, "r-late") === "Free late marks a month" && sh.getElementById("r-late").getAttribute("value") === "2" && lbl(sh, "r-third") === "Every 3rd late mark counts as"
  && j([...sh.getElementById("r-third").options].map(txt)) === j(["Half a day's pay", "A warning only", "A full day's pay"]) && !/over the limit|Late marks a month</.test(RAW("attendance/shifts.html")));
check("D5", "the page's alert and the three cards' 'Sample, not built yet' are untouched",
  j([...sh.querySelectorAll(".alert")].map(txt)) === j([...sh0.querySelectorAll(".alert")].map(txt)) && j([...sh.querySelectorAll(".card__meta")].map(txt)) === j(["Sample, not built yet", "Sample, not built yet", "Sample, not built yet"]));
check("D6", "…and the alert states the same rule the strip now does ('every 3rd late mark in a month costs half a day's pay')", /every 3rd late mark in a month costs half a day's pay/.test(txt(sh.querySelector(".alert"))));
check("D7", "shifts.html: only those lines changed (4 deltas/values, 2 labels, 1 input value)",
  (() => { const a = SRC("html-pre14A", "attendance/shifts.html").split("\r\n"), b = SRC("html-pre9J", "attendance/shifts.html").split("\r\n"); return a.length === b.length && a.filter((l, i) => l !== b[i]).length === 7; })());

// =====================================================================
section("E. data/attendance.js: only its header");
const ATT = SRC("js", "data/attendance.js"), ATT0 = SRC("js-pre9J", "data/attendance.js");
check("E1", "the header says the file isn't used and names attendance-store.js; 'should be calculated from this list' is gone",
  ATT.startsWith("// data/attendance.js\r\n// Not used: nothing imports this file.") && /worked out by data\/attendance-store\.js\./.test(ATT) && !/should be calculated from this list/.test(ATT));
check("E2", "…everything after the header is byte for byte as before (the file stays, its exports too)", SRC("js-pre14A", "data/attendance.js").split("\r\n").slice(4).join("\r\n") === ATT0.split("\r\n").slice(4).join("\r\n"));   // Round 14A (layout; was the live js): 9c7423e's, frozen; the live js: jsguard.mjs
const walk = (root, rel = "") => fs.readdirSync(`${root}/${rel}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${rel}${e.name}/`) : [`${rel}${e.name}`]));
const importers = [...walk(`${HERE}js`).map((f) => SRC("js", f)), ...walk(DIR).filter((f) => f.endsWith(".html")).map((f) => RAW(f))].filter((s) => /[/"']attendance\.js["']/.test(s));
check("E3", "…and the header is true: no js file or page imports it", importers.length === 0, String(importers.length));

// =====================================================================
section("F. Change set and hygiene");
// Round 9L (layout; was the live js / pages / css vs the pre9J copies): 9J's own change set, read from its frozen
// result (js-pre9L, html-pre9L, css-pre9L = HEAD e95a91f); the live tree now holds 9L's (claims.mjs J1 / J2)
const changedJs = walk(`${HERE}js-pre9L`).filter((f) => SRC("js-pre9L", f) !== SRC("js-pre9J", f)).sort();
const changedHtml = walk(`${HERE}html-pre9L`).filter((f) => f.endsWith(".html") && SRC("html-pre9L", f) !== SRC("html-pre9J", f)).sort();
const changedCss = walk(`${HERE}css-pre9L`).filter((f) => SRC("css-pre9L", f) !== SRC("css-pre9J", f));
check("F1", "js changed from HEAD: data/attendance.js, pages/admin-dashboard.js, pages/items.js, pages/stock-movements.js, ui/inventory-view.js; nothing added or removed",
  j(changedJs) === j(["data/attendance.js", "pages/admin-dashboard.js", "pages/items.js", "pages/stock-movements.js", "ui/inventory-view.js"]) && j(walk(`${HERE}js-pre9L`).sort()) === j(walk(`${HERE}js-pre9J`).sort()), j(changedJs));
check("F2", "pages changed: attendance/mark-attendance, attendance/shifts, dashboard/admin; css unchanged",
  j(changedHtml) === j(["attendance/mark-attendance.html", "attendance/shifts.html", "dashboard/admin.html"]) && changedCss.length === 0 && j(walk(`${HERE}html-pre9L`).sort()) === j(walk(`${HERE}html-pre9J`).sort()), j([changedHtml, changedCss]));
check("F3", "the 8 are CRLF only, with no final newline", [...changedJs.map((f) => SRC("js-pre9L", f)), ...changedHtml.map((f) => SRC("html-pre9L", f))].every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
