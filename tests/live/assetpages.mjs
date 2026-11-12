// usage: node assetpages.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 6D: inventory/asset-assignment.html, inventory/my-assets.html and user-profile's Assets card wired to
// data/inventory-store.js, plus the new assets:view permission. ./js-pre6D and ./html-pre6D are the code and pages
// before this round (6C's result). Fixed clock: Wed 30 Sep 2026 11:00 local.
//   A  asset-assignment.html for Aarav on the seed: stats, rows, holders, dates, badges, actions
//   B  status tabs, type filter, search;  C  pagination
//   D  the Assign form: what it offers, errors at their fields, success, a row's Assign
//   E  the Update modal: actions by state, Return / Send for repair / Back from repair, errors
//   F  Q8: inactive or deleted holders (a badge on the row, an alert above the table; never blocked)
//   G  my-assets.html: each person sees only their own;  H  user-profile's Assets card
//   I  access: assets:view (new), who is redirected, what each role sees;  J  the static pages;  L  source layout
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const ASSIGN = "inventory/asset-assignment.html", MINE = "inventory/my-assets.html", PROFILE = "users/user-profile.html";
const SCRIPT = { [ASSIGN]: "asset-assignment", [MINE]: "my-assets", [PROFILE]: "user-profile" };

const RealDate = Date;
const NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
let lastBlob = null;
URL.createObjectURL = (blob) => { lastBlob = blob; return "blob:test"; };
URL.revokeObjectURL = () => {};

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029",
  ROHAN = "EMP-1042", DIVYA = "EMP-1061", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const WHO = {
  aarav: ["admin", "Aarav Mehta", AARAV], priya: ["hr", "Priya Nair", PRIYA], kabir: ["fin", "Kabir Shah", KABIR],
  arjun: ["emp", "Arjun Kapoor", ARJUN], rohan: ["emp", "Rohan Gupta", ROHAN], oldEmp: ["emp", "Arjun Kapoor", undefined], nobody: null,
};

let loads = 0, w = null, d = null, saved = {}, jsErrors = [], navigations = [];
async function open(page, who, query = "") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = []; navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else jsErrors.push(e.message); });
  const dom = new JSDOM(fs.readFileSync(`${DIR}/${page}`, "utf8"), { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.HTMLAnchorElement.prototype.click = function () {};
  w.HTMLElement.prototype.scrollIntoView = function () {};
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  const auth = await import("./js/core/auth.js");
  if (WHO[who]) auth.signIn(...WHO[who]); else auth.signOut();
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
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const { PERMISSIONS, ALL_PERMISSIONS } = await import("./js/config/permissions.js");
const { ROLES } = await import("./js/config/roles.js");
const { ROUTES } = await import("./js/config/routes.js");
const { NAV } = await import("./js/config/nav.js");

// ---- readers ----
const $ = (id) => d.getElementById(id);
const pieces = (node) => { const out = []; const it = node.ownerDocument.createTreeWalker(node, 4); for (let n = it.nextNode(); n; n = it.nextNode()) { const t = n.textContent.replace(/\s+/g, " ").trim(); if (t) out.push(t); } return out.join(" "); };
const stat = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return [txt(s.querySelector(".stat__value")), txt(s.querySelector(".stat__delta")), s.querySelector(".stat__delta").className]; };
const rows = () => [...$("asset-rows").children];
const tags = () => rows().map((tr) => tr.dataset.tag ?? null);
const rowOf = (tag) => rows().find((tr) => tr.dataset.tag === tag);
const cells = (tr) => [...tr.children].map(pieces);
const pill = (label) => [...d.querySelectorAll(".table__toolbar .tabs__tab")].find((p) => txt(p) === label);
const typeIn = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event("input", { bubbles: true })); };
const choose = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event("change", { bubbles: true })); };
const pageText = () => txt(d.querySelector(".pagination > span")) ?? "";
const pageBtn = (label) => [...d.querySelectorAll(".pagination__btn")].find((b) => txt(b) === label);
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => ({ type: t.className.replace("toast toast--", ""), text: txt(t.querySelector(".toast__text")) }));
const clearToasts = () => d.querySelectorAll(".toast").forEach((t) => t.remove());
const errorAt = (id) => txt($(id).closest(".form-field").querySelector(".form-error"));
const errors = (scope = d) => [...scope.querySelectorAll(".form-error")].map(txt);
const btn = (tr, label) => [...tr.querySelectorAll("button")].find((b) => txt(b) === label);
const modalOpen = () => $("asset-modal").classList.contains("is-open");
const options = (id) => [...$(id).options].map((o) => [o.value, txt(o)]);
const submit = (formId) => { clearToasts(); $(formId).querySelector('[type="submit"]').click(); };
async function csvRows() {
  lastBlob = null;
  d.querySelector("[data-export]").click();
  if (!lastBlob) return null;
  return new TextDecoder("utf-8").decode(new Uint8Array(await lastBlob.arrayBuffer())).replace(/^﻿/, "").split("\r\n");
}

// =====================================================================
section("A. asset-assignment.html for Aarav (Admin) on the seed");
await open(ASSIGN, "aarav");
check("A1", "no JS errors, no redirect", jsErrors.length === 0 && navigations.length === 0, jsErrors.join(" | "));
check("A2", "Total 7: '5 laptops, 1 monitor, 1 access card' (the static 128 gone)", j(stat("total").slice(0, 2)) === j(["7", "5 laptops, 1 monitor, 1 access card"]), j(stat("total")));
check("A3", "Assigned 5, '71% of all assets'; Available 1, 'Ready to assign' (up)", j(stat("assigned").slice(0, 2)) === j(["5", "71% of all assets"])
  && j(stat("available")) === j(["1", "Ready to assign", "stat__delta stat__delta--up"]), j([stat("assigned"), stat("available")]));
check("A4", "In repair 1: AST-0099, sent 8 Sep (22 days ago), so '1 for over 2 weeks' (down)", j(stat("repair")) === j(["1", "1 for over 2 weeks", "stat__delta stat__delta--down"]), j(stat("repair")));
check("A5", "every asset, by tag (7; no pagination at 10 a page)", j(tags()) === j(["AST-0099", "AST-0119", "AST-0188", "AST-0217", "AST-0218", "AST-0302", "AST-0455"])
  && d.querySelector(".pagination").classList.contains("is-empty"));
check("A6", "an assigned row: tag, asset + type, the holder with avatar and department, since, condition, status, Update",
  j(cells(rowOf("AST-0217"))) === j(["AST-0217", "Dell Latitude 5440 Laptop", "SR Sneha Rao Engineering", "18 Sep 2026", "Good", "Assigned", "Update"]), j(cells(rowOf("AST-0217"))));
check("A7", "the available row: where it is (Store room A), no since date, Assign and Update",
  j(cells(rowOf("AST-0218"))) === j(["AST-0218", "Dell Latitude 5440 Laptop", "Store room A", "–", "Good", "Available", "Assign Update"]), j(cells(rowOf("AST-0218"))));
check("A8", "the repair row: 'With vendor', 'Sent 8 Sep 2026' (from its history, in office time), Poor, In repair, Update",
  j(cells(rowOf("AST-0099"))) === j(["AST-0099", "Dell Latitude 5410 Laptop", "With vendor", "Sent 8 Sep 2026", "Poor", "In repair", "Update"]), j(cells(rowOf("AST-0099"))));
const cls = (tag, n) => rowOf(tag).children[n].querySelector(".badge").className;
check("A9", "badge colours as the static page had them: Good green, Fair amber, Poor red; Assigned info, Available green, In repair amber",
  cls("AST-0217", 4) === "badge badge--success badge--square" && cls("AST-0188", 4) === "badge badge--warning badge--square" && cls("AST-0099", 4) === "badge badge--danger badge--square"
  && cls("AST-0217", 5) === "badge badge--info badge--dot" && cls("AST-0218", 5) === "badge badge--success badge--dot" && cls("AST-0099", 5) === "badge badge--warning badge--dot");
check("A10", "every action button is gated on assets:assign and visible to Aarav; no placeholders", rows().every((tr) => [...tr.querySelectorAll("button")].every((b) => b.dataset.permission === "assets:assign" && !b.hidden && !b.dataset.notImplemented)));
check("A11", "no inactive holder on the seed: the alert stays hidden", $("inactive-alert").hidden && !rows().some((tr) => /Inactive/.test(txt(tr))));
const exportBtn = d.querySelector("[data-export]");
check("A12", "Export is gated on the new assets:view (was reports:export)", exportBtn.dataset.permission === "assets:view" && !exportBtn.hidden);
const csv = await csvRows();
check("A13", "the CSV: header without Actions, the 7 rows, the holder's name and department together",
  csv?.[0] === "Tag,Asset,Assigned to,Since,Condition,Status" && csv.length === 8 && csv[4] === "AST-0217,Dell Latitude 5440 Laptop,Sneha Rao Engineering,2026-09-18,Good,Assigned" /* Round Data export (behaviour; was 18 Sep 2026) */, j(csv?.slice(0, 5)));

// =====================================================================
section("B. Status tabs, type filter, search");
const byTab = {};
for (const label of ["Assigned", "Available", "In repair"]) { pill(label).click(); byTab[label] = tags(); }
check("B1", "each status tab shows exactly those assets", j(byTab) === j({ Assigned: ["AST-0119", "AST-0188", "AST-0217", "AST-0302", "AST-0455"], Available: ["AST-0218"], "In repair": ["AST-0099"] }), j(byTab));
pill("All").click();
check("B2", "the type filter offers All types + Laptop / Monitor / Access card (by key)", j(options("asset-type")) === j([["", "All types"], ["laptop", "Laptop"], ["monitor", "Monitor"], ["access-card", "Access card"]]));
const byType = {};
for (const t of ["laptop", "monitor", "access-card"]) { choose("asset-type", t); byType[t] = tags(); }
check("B3", "each type shows exactly its assets (by the item's asset type)", j(byType) === j({ laptop: ["AST-0099", "AST-0119", "AST-0188", "AST-0217", "AST-0218"], monitor: ["AST-0302"], "access-card": ["AST-0455"] }), j(byType));
pill("Assigned").click(); choose("asset-type", "laptop");
check("B4", "tab and type together: assigned laptops", j(tags()) === j(["AST-0119", "AST-0188", "AST-0217"]));
choose("asset-type", ""); pill("All").click();
const find = (q) => { typeIn("asset-search", q); return tags(); };
const found = { tag: find("ast-0302"), person: find("SNEHA"), asset: find("macbook"), arjun: find("arjun") };
check("B5", "search: tag, person (case-insensitive), asset name", j(found) === j({ tag: ["AST-0302"], person: ["AST-0217"], asset: ["AST-0119"], arjun: ["AST-0188", "AST-0302", "AST-0455"] }), j(found));
find("nobody here");
check("B6", "no match: one row 'No assets match these filters.' across all 7 columns", rows().length === 1 && txt(rows()[0]) === "No assets match these filters." && rows()[0].firstChild.colSpan === 7);
find("");
check("B7", "the search box is the page's own (data-table-filter=off)", $("asset-search").dataset.tableFilter === "off" && rows().every((tr) => !tr.hidden));

// =====================================================================
section("C. Pagination (renderPagination, 10 a page)");
fresh();
I.allAssets();
{ const box = JSON.parse(w.localStorage.getItem("officeos:assets"));
  for (let n = 1; n <= 5; n++) box.records.push({ id: `AST-090${n}`, sku: "IT-1060", condition: "good", status: "available", holderId: null, since: null, location: "store-a", history: [] });
  box.records.push({ id: "AST-456", sku: "IT-1060", condition: "good", status: "available", holderId: null, since: null, location: "store-a", history: [] });   // unpadded, stored last
  w.localStorage.setItem("officeos:assets", JSON.stringify(box)); }
await open(ASSIGN, "aarav");
check("C1", "13 assets: 'Showing 1 to 10 of 13'; Next shows the last three by tag, numerically (AST-456 stored last but sorted after AST-0455, not after AST-0905)",
  pageText() === "Showing 1 to 10 of 13" && (pageBtn("Next").click(), j(tags()) === j(["AST-0903", "AST-0904", "AST-0905"])) && (pageBtn("1").click(), tags().slice(6, 9).join() === "AST-0455,AST-456,AST-0901"), j(tags()));
pageBtn("2").click(); choose("asset-type", "");
check("C2", "a filter change (even to the same) goes back to page 1", pageText() === "Showing 1 to 10 of 13" && tags()[0] === "AST-0099");
pageBtn("2").click(); pill("All").click();
check("C3", "a tab click goes back to page 1", pageText() === "Showing 1 to 10 of 13");
pageBtn("2").click(); typeIn("asset-search", "");
check("C4", "typing in search goes back to page 1", pageText() === "Showing 1 to 10 of 13");
fresh();

// =====================================================================
section("D. The Assign form");
await open(ASSIGN, "aarav");
check("D1", "the form card shows (assets:assign), novalidate, a real submit (no placeholder); the header's 'Assign asset' links to it",
  !$("assign-form").closest(".card").hidden && $("assign-form").noValidate && !$("assign-form").querySelector('[type="submit"]').dataset.notImplemented
  && d.querySelector('.page-header__actions a[href="#assign-form"]')?.dataset.permission === "assets:assign");
check("D2", "Asset offers only the available tagged asset (AST-0218)", j(options("a-asset")) === j([["", "Select available asset"], ["AST-0218", "AST-0218, Dell Latitude 5440"]]));
const people = options("a-person");
check("D3", "Employee offers every active person by name with department (9: not Divya, inactive), no invented names",
  people.length === 10 && people[0][0] === "" && !people.some(([id]) => id === DIVYA) && people[1][1] === "Aarav Mehta, Engineering"
  && !/Ishita|Neha/.test(j(people)) && j(people.slice(1).map(([, t]) => t)) === j([...people.slice(1).map(([, t]) => t)].sort((a, b) => a.localeCompare(b, "en"))), j(people.map(([, t]) => t)));
I.returnAsset(AARAV, "AST-0188", { condition: "poor", location: "store-a" });
await open(ASSIGN, "aarav");
choose("a-asset", "AST-0188");
check("D4b", "the condition starts as the chosen asset's own (AST-0188 came back Poor), and follows a change of asset", $("a-cond").value === "poor" && (choose("a-asset", "AST-0218"), $("a-cond").value === "good"));
fresh();
await open(ASSIGN, "aarav");
check("D4", "Condition: Good / Fair / Poor by key, starting as the chosen asset's own", j(options("a-cond")) === j([["good", "Good"], ["fair", "Fair"], ["poor", "Poor"]]) && (choose("a-asset", "AST-0218"), $("a-cond").value === "good"));
check("D5", "the date can't be picked in the future (max = today) and may be left empty for today", $("a-date").max === "2026-09-30");
choose("a-asset", "");
submit("assign-form");
check("D6", "no asset: 'Choose an asset.' under Asset, nothing stored", errorAt("a-asset") === "Choose an asset." && errors().length === 1 && I.getAsset("AST-0218").status === "available");
choose("a-asset", "AST-0218");
submit("assign-form");
check("D7", "no employee: the store's 'Choose an employee.' under Employee (one error at a time)", errorAt("a-person") === "Choose an employee." && errors().length === 1);
choose("a-person", ANANYA); typeIn("a-date", "2026-10-02");
submit("assign-form");
check("D8", "a future date: the store's refusal under Assigned on", errorAt("a-date") === "The date can't be in the future." && errors().length === 1);
typeIn("a-date", "");
check("D9", "typing in a field clears its error", errors().length === 0);
choose("a-cond", "fair");
submit("assign-form");
const a218 = I.getAsset("AST-0218");
check("D10", "success: stored for Ananya today, condition Fair; a success toast; IT-1021 6 -> 5 (Q1's stock-out)",
  a218.status === "assigned" && a218.holderId === ANANYA && a218.since === "2026-09-30" && a218.condition === "fair" && I.stockOf("IT-1021") === 5
  && j(toasts()) === j([{ type: "success", text: "AST-0218 assigned to Ananya Iyer." }]), j(toasts()));
check("D11", "the page follows: the row shows Ananya, stats Assigned 6 / Available 0, the form has nothing left to assign and is cleared",
  pieces(rowOf("AST-0218").children[2]) === "AI Ananya Iyer Sales" && stat("assigned")[0] === "6" && j(stat("available")) === j(["0", "Nothing to assign", "stat__delta"])
  && j(options("a-asset")) === j([["", "Nothing available to assign"]]) && $("a-person").value === "");
fresh();
await open(ASSIGN, "aarav");
btn(rowOf("AST-0218"), "Assign").click();
check("D12", "a row's Assign fills the form with that asset (and its condition) and moves to Employee", $("a-asset").value === "AST-0218" && $("a-cond").value === "good" && d.activeElement === $("a-person"));
submit("assign-form");
check("D13", "the assign refusal of an asset no longer available shows under Asset (the store's own message)", (() => {
  I.assignAsset(AARAV, "AST-0218", { holderId: ROHAN });   // someone else got there first
  choose("a-person", ARJUN);
  submit("assign-form");
  return errorAt("a-asset") === "AST-0218 is assigned, not available.";
})(), errors().join(" | "));
fresh();

// =====================================================================
section("E. The Update modal");
await open(ASSIGN, "aarav");
btn(rowOf("AST-0188"), "Update").click();
check("E1", "Update on an assigned asset: the modal opens, titled with the tag, saying where it is; Return or Send for repair",
  modalOpen() && txt($("asset-modal-title")) === "Update AST-0188" && txt($("asset-modal-desc")) === "Dell Latitude 5420, assigned to Arjun Kapoor."
  && j(options("u-action")) === j([["return", "Return to the store"], ["repair", "Send for repair"]]));
check("E2", "Return asks condition (starts as the asset's: Fair) and location (starts as its item's: Store room A); no note",
  $("u-cond").value === "fair" && $("u-loc").value === "store-a" && !$("u-cond-field").hidden && !$("u-loc-field").hidden && $("u-note-field").hidden
  && j(options("u-loc")) === j([["", "Select location"], ["store-a", "Store room A"], ["store-b", "Store room B"], ["warehouse", "Warehouse"], ["pantry", "Pantry store"]]));
choose("u-action", "repair");
check("E3", "Send for repair asks what's wrong instead", $("u-cond-field").hidden && $("u-loc-field").hidden && !$("u-note-field").hidden);
choose("u-action", "return"); choose("u-loc", "");
submit("asset-modal-form");
check("E4", "no location: the store's 'Choose a location.' under Location, the modal stays open, nothing stored",
  errorAt("u-loc") === "Choose a location." && modalOpen() && I.getAsset("AST-0188").status === "assigned");
choose("u-loc", "store-b"); choose("u-cond", "poor");
submit("asset-modal-form");
const a188 = I.getAsset("AST-0188");
check("E5", "Return: available in Store room B, Poor; a Return movement of the 5420 naming Arjun; the modal closes; a toast",
  a188.status === "available" && a188.location === "store-b" && a188.condition === "poor" && I.allMovements()[0].type === "return" && I.allMovements()[0].holderId === ARJUN
  && !modalOpen() && j(toasts()) === j([{ type: "success", text: "AST-0188 returned to the store." }]), j(toasts()));
check("E6", "the page follows: the row is Available in Store room B with Assign + Update; Available 2", j(cells(rowOf("AST-0188")).slice(2)) === j(["Store room B", "–", "Poor", "Available", "Assign Update"])
  && stat("available")[0] === "2");
btn(rowOf("AST-0188"), "Update").click();
check("E7", "Update on an available asset: only Send for repair", j(options("u-action")) === j([["repair", "Send for repair"]]) && !$("u-note-field").hidden);
submit("asset-modal-form");
check("E8", "no note: the store's 'Say what's wrong with it.' under What's wrong?", errorAt("u-note") === "Say what's wrong with it." && modalOpen());
typeIn("u-note", "Hinge cracked");
submit("asset-modal-form");
check("E9", "Send for repair from the store: in repair, a stock-out, 'Sent 30 Sep 2026' on the row", I.getAsset("AST-0188").status === "in-repair" && I.allMovements()[0].reference === "Sent for repair"
  && txt(rowOf("AST-0188").children[3]) === "Sent 30 Sep 2026" && j(toasts()) === j([{ type: "success", text: "AST-0188 sent for repair." }]));
btn(rowOf("AST-0099"), "Update").click();
check("E10", "Update on an asset in repair: only Back from repair (condition + location)", j(options("u-action")) === j([["repaired", "Back from repair"]]) && $("u-note-field").hidden && !$("u-loc-field").hidden);
choose("u-cond", "");
submit("asset-modal-form");
check("E11", "no condition: under Condition", errorAt("u-cond") === "Choose a condition.");
choose("u-cond", "good");
submit("asset-modal-form");
check("E12", "Back from repair: available in its item's store room, Good; a Return 'Back from repair'", I.getAsset("AST-0099").status === "available" && I.getAsset("AST-0099").location === "store-a"
  && I.allMovements()[0].reference === "Back from repair" && j(toasts()) === j([{ type: "success", text: "AST-0099 back from repair." }]));
btn(rowOf("AST-0302"), "Update").click(); choose("u-action", "repair"); typeIn("u-note", "Flickers");
submit("asset-modal-form");
check("E13", "Send for repair from a person: no stock movement, the holder cleared", I.getAsset("AST-0302").status === "in-repair" && I.getAsset("AST-0302").holderId === null
  && I.allMovements()[0].reference === "Back from repair");
btn(rowOf("AST-0455"), "Update").click();
const first = $("u-action").value;
choose("u-loc", "");
submit("asset-modal-form");
const hadError = errors($("asset-modal")).length === 1;
btn(rowOf("AST-0099"), "Update").click();
check("E14", "re-opening for another asset after an error starts clean (no old errors, its own actions)", first === "return" && hadError && j(options("u-action")) === j([["repair", "Send for repair"]]) && errors($("asset-modal")).length === 0);
$("asset-modal").querySelector("[data-modal-close]").click();
check("E15", "Cancel closes the modal and changes nothing", !modalOpen() && I.getAsset("AST-0099").status === "available");
fresh();

// =====================================================================
section("F. Q8: inactive or deleted holders (warn, don't block)");
fresh();
await open(ASSIGN, "aarav");
S.deactivateUser(USER_ACTOR("admin", ROHAN), ROHAN, LEAVING_11Y());
await open(ASSIGN, "aarav");
const rohanRow = rowOf("AST-0119");
check("F1", "Rohan deactivated (not blocked): his row keeps him and shows a grey 'Inactive' badge next to his name",
  pieces(rohanRow.children[2]) === "RG Rohan Gupta Inactive Engineering" && rohanRow.querySelector(".table__user-name + .badge, .badge")?.className === "badge badge--dot");
check("F2", "the alert above the table names it and says what to do", !$("inactive-alert").hidden && $("inactive-alert").className === "alert alert--warning"
  && txt($("inactive-alert")) === "1 asset is still assigned to people who are inactive: AST-0119 (Rohan Gupta). Take it back with Update, then Return to the store.");
I.returnAsset(AARAV, "AST-0218", { condition: "good", location: "store-a" });
I.assignAsset(AARAV, "AST-0218", { holderId: MEERA });
S.deleteUser(USER_ACTOR("admin", MEERA), MEERA);
await open(ASSIGN, "aarav");
// Round 13J (behavior; was her id and '?' initials, "AST-0218 (EMP-1023)"): the name kept at delete (delnames.mjs).
check("F3", "someone deleted from the list while holding an asset: their name kept at delete (round 13J), 'No longer on the employee list', Inactive; the alert counts both",
  pieces(rowOf("AST-0218").children[2]) === "MJ Meera Joshi Inactive No longer on the employee list"
  && txt($("inactive-alert")).startsWith("2 assets are still assigned to people who are inactive: AST-0119 (Rohan Gupta), AST-0218 (Meera Joshi)."), pieces(rowOf("AST-0218").children[2]));
btn(rowOf("AST-0119"), "Update").click(); choose("u-loc", "store-a");
submit("asset-modal-form");
check("F4", "taking it back from a leaver works, and the alert drops to the other one", I.getAsset("AST-0119").status === "available"
  && txt($("inactive-alert")).startsWith("1 asset is still assigned to people who are inactive: AST-0218"));
check("F5", "the inactive person can't be picked in the Assign form", !options("a-person").some(([id]) => id === ROHAN));
fresh();

// =====================================================================
I.allAssets();
{ const box = JSON.parse(w.localStorage.getItem("officeos:assets"));
  box.records.find((a) => a.id === "AST-0099").history[0].at = "2026-09-20T19:00:00.000Z";   // 21 Sep, 00:30 in India
  w.localStorage.setItem("officeos:assets", JSON.stringify(box)); }
await open(ASSIGN, "aarav");
check("F6", "the repair date is the office (India) day: sent at 00:30 on 21 Sep IST (still 20 Sep in UTC) reads 'Sent 21 Sep 2026'", txt(rowOf("AST-0099").children[3]) === "Sent 21 Sep 2026", txt(rowOf("AST-0099").children[3]));
fresh();

// =====================================================================
section("G. my-assets.html: your own equipment only");
await open(MINE, "arjun");
const mineRows = () => [...$("my-asset-rows").children];
check("G1", "Arjun: his three, by tag, with type, since, condition and status; '3 assets'; no JS errors", jsErrors.length === 0 && txt($("my-assets-meta")) === "3 assets"
  && j(mineRows().map((tr) => cells(tr))) === j([["AST-0188", "Dell Latitude 5420 Laptop", "12 Jan 2023", "Fair", "Assigned", "Report issue"],
    ["AST-0302", "Dell 24\" monitor Monitor", "12 Jan 2023", "Good", "Assigned", "Report issue"], ["AST-0455", "Office access card Access card", "12 Jan 2023", "Good", "Assigned", "Report issue"]]), j(mineRows().map(cells)));
const reportBtns = mineRows().map((tr) => tr.querySelector("button"));
reportBtns[0].click();
// Round 6I: Report issue is real (closeout.mjs tests it in full); here, that the row's button opens the form for that asset.
check("G2", "'Report issue' (assets:report) opens the report form for that row's asset; no placeholder", reportBtns.every((b) => b.dataset.permission === "assets:report" && !b.dataset.notImplemented)
  && $("report-modal")?.classList.contains("is-open") && $("p-tag")?.value === "AST-0188" && !toasts().some((t) => /isn't available/.test(t.text)));
const headerBtns = [...d.querySelectorAll(".page-header__actions button")].map((b) => [txt(b), b.dataset.notImplemented]);
check("G3", "'Report a problem' is real since 6I, as 'Request an asset' is since 6E (assetreq E1): no placeholders in the header", j(headerBtns) === j([["Report a problem", null], ["Request an asset", null]]));
await open(MINE, "rohan");
check("G4", "Rohan sees only his MacBook, never Arjun's equipment", j(mineRows().map((tr) => tr.dataset.tag)) === j(["AST-0119"]) && txt($("my-assets-meta")) === "1 asset");
for (const who of ["priya", "kabir", "aarav"]) {
  await open(MINE, who);
  check(`G5-${who}`, `${who}: no equipment, says so ('0 assets'); never someone else's`, txt($("my-assets-meta")) === "0 assets" && mineRows().length === 1 && txt(mineRows()[0]) === "No equipment is assigned to you." && mineRows()[0].firstChild.colSpan === 6);
}
I.assignAsset(AARAV, "AST-0218", { holderId: PRIYA });
await open(MINE, "priya");
check("G6", "once something is assigned to Priya (HR), it shows on her page", j(mineRows().map((tr) => tr.dataset.tag)) === j(["AST-0218"]));
await open(MINE, "oldEmp");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("G7", "an old session with no employee id: signed out and sent to sign in (round 11P, N2); no one's equipment drawn", navigations.length === 1 && localStorage.getItem("officeos:session") === null && !mineRows().some((tr) => tr.dataset.tag) && jsErrors.length === 0, j(mineRows().map(txt)));
fresh();

// =====================================================================
section("H. user-profile's Assets card (users:view, decision 16)");
const assetCard = () => [...d.querySelectorAll(".card")].find((c) => txt(c.querySelector(".card__title")) === "Assets");
await open(PROFILE, "aarav", `?id=${ARJUN}`);
const items = () => [...assetCard().querySelectorAll(".list__item")].map(pieces);
check("H1", "Arjun's profile: his three assets with tag, since and condition; the count 3 (no more 'No assets assigned' for everyone)", jsErrors.length === 0
  && j(items()) === j(["Dell Latitude 5420 AST-0188 since 12 Jan 2023 Fair", "Dell 24\" monitor AST-0302 since 12 Jan 2023 Good", "Office access card AST-0455 since 12 Jan 2023 Good"])
  && txt(assetCard().querySelector(".card__meta")) === "3", j(items()));
await open(PROFILE, "priya", `?id=${SNEHA}`);
check("H2", "HR (users:view) sees Sneha's laptop on her profile", j(items()) === j(["Dell Latitude 5440 AST-0217 since 18 Sep 2026 Good"]) && txt(assetCard().querySelector(".card__meta")) === "1");
await open(PROFILE, "aarav", `?id=${KABIR}`);
check("H3", "someone with none: 'No assets assigned', 0 (and Rohan's static MacBook gone)", txt(assetCard().querySelector(".card__body")) === "No assets assigned" && txt(assetCard().querySelector(".card__meta")) === "0"
  && !/MacBook/.test(txt(assetCard())));
// Round 9L (behaviour; was "No leave data available yet"): the Leave balance card now shows the person's balance from
// data/leave-store.js's balanceFor() (claims.mjs G); Recent activity still has no data source, so it still says so
const LS9L = await import("./js/data/leave-store.js"), kabirLeave = LS9L.balanceFor(KABIR);
const leaveLeft = () => [...([...d.querySelectorAll(".card")].find((c) => txt(c.querySelector(".card__title")) === "Leave balance")?.querySelectorAll(".bar-row__value") ?? [])].map(txt);
check("H4", "the rest of user-profile: Leave balance shows their days left from the store (Round 9L, was 'No leave data available yet'); Recent activity still says it has no data",
  !/No leave data available yet/.test(txt(d.querySelector("main"))) && j(leaveLeft()) === j(LS9L.LEAVE_TYPES.filter((t) => kabirLeave[t].allowance !== null).map((t) => String(kabirLeave[t].left))) && leaveLeft().length === 4
  && /No recent activity/.test(txt(d.querySelector("main"))), j(leaveLeft()));
fresh();

// =====================================================================
section("I. Access: the new assets:view");
check("I1", "permissions.js: assets = view-own, assign, approve, report, request, view (one new action, appended)", j(PERMISSIONS.assets) === j(["view-own", "assign", "approve", "report", "request", "view"]));
// I2 / I4 / L3: what 6D changed in config, read from 6D's result frozen (js-pre6F; Round 6F added vendors:view).
const prePerms = (await import("./js-pre6D/config/permissions.js")).ALL_PERMISSIONS;
const perms6D = (await import("./js-pre6F/config/permissions.js")).ALL_PERMISSIONS;
check("I2", "ALL_PERMISSIONS = before + assets:view right after assets:request; 76 in all", perms6D.length === 76
  && j(perms6D.filter((p) => p !== "assets:view")) === j(prePerms) && perms6D.indexOf("assets:view") === perms6D.indexOf("assets:request") + 1);
const preRoles = (await import("./js-pre6D/config/roles.js")).ROLES;
const ROLES7B = (await import("./js-pre7C/config/roles.js")).ROLES;   // Round 7C: Finance lost pii:view; this check is about an earlier round
check("I3", "only Admin holds it (through ALL_PERMISSIONS); every other role's permissions unchanged", ROLES.admin.permissions.includes("assets:view")
  && ["hr", "fin", "emp"].every((k) => !ROLES[k].permissions.includes("assets:view") && j(ROLES7B[k].permissions) === j(preRoles[k].permissions)));
const navItem = NAV.flatMap((g) => g.items).find((i) => i.href === ASSIGN);
const routes6D = (await import("./js-pre6F/config/routes.js")).ROUTES;
check("I4", "the route and the nav item use assets:view; my-assets stays assets:view-own; no other route changed", ROUTES[ASSIGN] === "assets:view" && navItem?.permission === "assets:view" && ROUTES[MINE] === "assets:view-own"
  && j(Object.entries(routes6D).filter(([p]) => p !== ASSIGN)) === j(Object.entries((await import("./js-pre6D/config/routes.js")).ROUTES).filter(([p]) => p !== ASSIGN)));
for (const who of ["priya", "kabir", "arjun"]) {
  await open(ASSIGN, who);
  check(`I5-${who}`, `${who} (no assets:view): redirected; the script draws nothing and reads nothing`, navigations.length === 1 && jsErrors.length === 0 && $("asset-rows").children.length === 0
    && w.localStorage.getItem("officeos:assets") === null && [...d.querySelectorAll(".stat__value")].every((s) => s.textContent === "—"));
}
{ const preHr = [...ROLES.hr.permissions];
  ROLES.hr.permissions.push("assets:view");   // a role with assets:view but not assets:assign (none exists today)
  await open(ASSIGN, "priya");
  const seen = { redirects: navigations.length, rows: rows().length, buttons: rows().flatMap((tr) => [...tr.querySelectorAll("button")]).filter((b) => !b.hidden).length,
    form: $("assign-form").closest(".card").hidden, link: d.querySelector('.page-header__actions a[href="#assign-form"]').hidden, people: $("a-person").options.length, export: d.querySelector("[data-export]").hidden };
  ROLES.hr.permissions.splice(0, ROLES.hr.permissions.length, ...preHr);
  check("I5b", "with assets:view but not assets:assign: the register shows, every action, the header link and the Assign card are hidden, the form isn't filled; Export shown",
    j(seen) === j({ redirects: 0, rows: 7, buttons: 0, form: true, link: true, people: 1, export: false }), j(seen)); }
await open(MINE, "nobody");
check("I5c", "nobody signed in on my-assets.html: redirected to sign in, nothing drawn", navigations.length === 1 && $("my-asset-rows").children.length === 0 && jsErrors.length === 0);
fresh();
check("I6", "every role may open my-assets.html (assets:view-own)", ["admin", "hr", "fin", "emp"].every((k) => ROLES[k].permissions.includes("assets:view-own")));

// =====================================================================
section("J. The static pages");
const aHtml = fs.readFileSync(`${DIR}/${ASSIGN}`, "utf8"), mHtml = fs.readFileSync(`${DIR}/${MINE}`, "utf8");
const sa = new JSDOM(aHtml).window.document, sm = new JSDOM(mHtml).window.document;
check("J1", "asset-assignment.html's fallback is neutral: stats '—', no rows, empty filter and form lists, no pagination text",
  [...sa.querySelectorAll(".stat__value")].every((s) => s.textContent === "—") && !sa.querySelector("#asset-rows tr") && sa.querySelectorAll("#asset-type option").length === 1
  && sa.querySelectorAll("#a-asset option").length === 1 && sa.querySelectorAll("#a-person option").length === 1 && sa.querySelector("#asset-pagination").classList.contains("is-empty"));
check("J2", "nothing invented left: no 128 / 97 / 24 / '2 for over 2 weeks' / 'Showing 5 of 128', no Ishita Bose or Neha Kulkarni",
  !/>128<|>97<|>24<|2 for over 2 weeks|Showing 5 of 128|Ishita|Neha/.test(aHtml));
// 6D's sample cards (J3, J5) were made real in 6E: these two read 6D's pages as they were (html-pre6E).
const saPre = new JSDOM(src("html-pre6E", ASSIGN)).window.document, smPre = new JSDOM(src("html-pre6E", MINE)).window.document;
const pending = [...saPre.querySelectorAll(".card")].find((c) => txt(c.querySelector(".card__title")) === "Pending asset requests");
check("J3", "the Pending asset requests card is kept and clearly a sample: 'Sample, not built yet', a note saying so; its buttons still placeholders; Ananya Iyer (real) instead of Ishita Bose",
  txt(pending.querySelector(".card__meta")) === "Sample, not built yet" && /Asset requests come in a later round/.test(txt(pending)) && /Ananya Iyer, second monitor/.test(txt(pending))
  && [...pending.querySelectorAll("button")].every((b) => b.dataset.notImplemented && b.dataset.permission === "assets:approve"));
check("J4", "the Assign card is gated on assets:assign, its form novalidate; the Update modal is in the page; the Export button on assets:view",
  sa.querySelector("#assign-form").closest(".card").dataset.permission === "assets:assign" && sa.querySelector("#assign-form").hasAttribute("novalidate")
  && sa.querySelector("#asset-modal.modal #asset-modal-form") && sa.querySelector("[data-export]").dataset.permission === "assets:view");
const sample = [...smPre.querySelectorAll(".card")].find((c) => /Laptop upgrade request/.test(txt(c)));
check("J5", "my-assets.html: no static rows, '—' count; the request card a labelled sample with the decided chain (manager, then an Admin), no 'IT Support', no fixed date or name",
  !sm.querySelector("#my-asset-rows tr") && txt(sm.querySelector("#my-assets-meta")) === "—" && txt(sample.querySelector(".card__meta")) === "Sample, not built yet"
  && /Manager approval/.test(txt(sample)) && !/IT Support|17 Sep|Aarav Mehta|AST-0188/.test(txt(sample)) && !/IT Support/.test(mHtml));
check("J7", "my-assets.html's table uses 5F's table--fit (browser-checked: the static table was already wider than its card at 1280)", sm.querySelector("#my-asset-rows").closest("table").className === "table table--fit");
const before = (p) => src("html-pre6D", p).replace(/\r\n/g, "\n").split("<main")[0];
check("J6", "everything before <main> is unchanged on both pages; each loads its script after app.js", src("html-pre14A", ASSIGN).replace(/\r\n/g, "\n").split("<main")[0] === before(ASSIGN) && src("html-pre14A", MINE).replace(/\r\n/g, "\n").split("<main")[0] === before(MINE) /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */
  && /app\.js"><\/script>\r?\n<script type="module" src="\.\.\/\.\.\/assets\/js\/pages\/asset-assignment\.js"><\/script>/.test(aHtml) && /app\.js"><\/script>\r?\n<script type="module" src="\.\.\/\.\.\/assets\/js\/pages\/my-assets\.js"><\/script>/.test(mHtml));

// =====================================================================
section("L. Source layout");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const root = (dd) => new URL(`./${dd}`, import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
// L1 / L2: what 6D changed, read from 6D's result frozen (js-pre6E / html-pre6E); 6E's own changes are assetreq L1 / L2.
const live = walk(root("js-pre6E")).sort(), pre = walk(root("js-pre6D")).sort();
const changedJs = live.filter((p) => !pre.includes(p) || src("js-pre6E", p) !== src("js-pre6D", p));
check("L1", "js: the two new page scripts, inventory-view.js, user-profile.js and the three config files; the store and rules untouched",
  j(changedJs) === j(["config/nav.js", "config/permissions.js", "config/routes.js", "pages/asset-assignment.js", "pages/my-assets.js", "pages/user-profile.js", "ui/inventory-view.js"])
  && pre.every((p) => live.includes(p)), j(changedJs));
const pagesNow = walk(root("html-pre6E")).filter((p) => p.endsWith(".html")).sort().map((p) => p.replaceAll("\\", "/"));
const changedHtml = pagesNow.filter((p) => src("html-pre6E", p) !== src("html-pre6D", p));
check("L2", "pages: only asset-assignment.html and my-assets.html changed", j(changedHtml) === j([ASSIGN, MINE]), j(changedHtml));
const lf = (p) => src("js-pre6F", p).replace(/\r\n/g, "\n"), lfPre = (p) => src("js-pre6D", p).replace(/\r\n/g, "\n");
check("L3", "the config changes are exactly the one action, the route and the nav permission",
  lf("config/permissions.js") === lfPre("config/permissions.js").replace('  assets:        ["view-own", "assign", "approve", "report", "request"],\n', '  assets:        ["view-own", "assign", "approve", "report", "request", "view"],   // view: see who holds what (asset-assignment.html); Admin only for now\n')
  && lf("config/routes.js") === lfPre("config/routes.js").replace('"inventory/asset-assignment.html": "assets:assign",', '"inventory/asset-assignment.html": "assets:view",')
  && lf("config/nav.js") === lfPre("config/nav.js").replace('href: "inventory/asset-assignment.html", permission: "assets:assign" }', 'href: "inventory/asset-assignment.html", permission: "assets:view" }'));
// Since Round 6I, 6D's scripts are read frozen (js-pre6I): 6I has moved them on (problem reports).
const code = (p) => src("js-pre6I", p).split(/\r?\n/).filter((l) => !l.trim().startsWith("//")).join("\n");
const NEW = ["pages/asset-assignment.js", "pages/my-assets.js", "ui/inventory-view.js", "pages/user-profile.js"];
check("L4", "no innerHTML in the new or changed scripts (toasts go through escapeHtml)", NEW.every((p) => !/innerHTML|insertAdjacentHTML|outerHTML/.test(code(p)))
  && (code("pages/asset-assignment.js").match(/showToast\(/g) ?? []).length === (code("pages/asset-assignment.js").match(/showToast\(escapeHtml\(/g) ?? []).length);
const storeUse = [...new Set(NEW.flatMap((p) => [...code(p).matchAll(/import \{([^}]+)\} from "\.\.\/data\/inventory-store\.js"/g)].flatMap((m) => m[1].split(",").map((s) => s.trim()))))].filter(Boolean).sort();
check("L5", "the pages use the store's existing reads and asset writes only (no store change was needed)", storeUse.every((f) => typeof I[f] === "function")
  && j(storeUse) === j(["allAssets", "allItems", "assetTotals", "assetTypeOf", "assetsFor", "assetsHeldByInactive", "assignAsset", "returnAsset", "returnFromRepair", "sendForRepair"]), j(storeUse));
check("L6", "the user-profile change is the Assets card only", lfPre("pages/user-profile.js").split("\n").filter((l) => !lf("pages/user-profile.js").split("\n").includes(l)).every((l) => /emptyCard\("Assets"|plural, todayIso|No data source exists/.test(l) || l.trim() === ""),
  j(lfPre("pages/user-profile.js").split("\n").filter((l) => !lf("pages/user-profile.js").split("\n").includes(l))));
check("L7", "the nine files: CRLF only, no final newline", [...["config/permissions.js", "config/routes.js", "config/nav.js", ...NEW].map((p) => fs.readFileSync(new URL(`./js/${p}`, import.meta.url), "utf8")), aHtml, mHtml]
  .every((s) => !/[^\r]\n/.test(s) && !/\r(?!\n)/.test(s) && !s.endsWith("\n")));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
