// usage: node inventory.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 6B: the inventory data layer. ./js is the new code, ./js-pre6B the code before this round, ./html-pre6B the
// pages this round saw (the seed is checked against them; later rounds change them).
//   A  data/inventory.js alone: categories, types, locations vs the pages, changeFor, status / bar / value (exhaustive)
//   B  the seed: real people only, Admin as the actor, the pages' figures, a consistent ledger and register
//   C  recordMovement: who, validation, stock never below 0, tagged items, departments
//   D  the asset register: assign, return, repair (who, states, movements, history)
//   E  the ledger promise: append-only, no edit or delete exposed, stock always = opening + movements
//   F  reads and totals; Q8 (assets held by inactive people)
//   G  random sequences of writes keep every invariant
//   H  reset, corrupt storage, a failed save leaves no half-done move
//   L  source layout (nothing else changed, nothing wired to a page beyond the Reset button)
// Fixed clock: Wed 30 Sep 2026 11:00 local.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const page = (p) => new JSDOM(src("html-pre6B", p)).window.document;

const mem = new Map();
let failKey = null;   // set to a storage key to make saving it throw (storage full)
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { if (k === failKey) throw new Error("QuotaExceededError"); mem.set(k, String(v)); },
  removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; },
};
const RealDate = Date;
const NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;

const V = await import("./js/data/inventory.js");
const I = await import("./js/data/inventory-store.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const { ROLES } = await import("./js/config/roles.js");
const { PERMISSIONS } = await import("./js/config/permissions.js");

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029",
  ROHAN = "EMP-1042", DIVYA = "EMP-1061", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const fresh = () => { mem.clear(); failKey = null; };
const ok = (r) => r && r.ok === true;
const err = (r) => (r && r.ok === false ? r.error : "(ok)");
const quiet = (fn) => { const e = console.error; console.error = () => {}; try { return fn(); } catch (x) { return { ok: false, error: `threw: ${x.message}` }; } finally { console.error = e; } };
const move = (f = {}, who = AARAV) => I.recordMovement(who, { sku: "STA-3001", type: "in", quantity: 5, reference: "PO-1", ...f });
const today = "2026-09-30";
const stocks = () => Object.fromEntries(I.allItems().map((i) => [i.sku, i.stock]));
const text = (el) => el.textContent.replace(/\s+/g, " ").trim();

// =====================================================================
section("A. Pure rules (data/inventory.js)");
const itemsDoc = page("inventory/items.html");
const tabs = [...itemsDoc.querySelectorAll(".tabs a, .tabs button, [role=tab]")].map(text);
check("A1", "CATEGORIES: the four items.html shows (tabs and value bars), in its order", j(V.CATEGORY_KEYS.map((k) => V.CATEGORIES[k].label)) === j(["IT equipment", "Furniture", "Stationery", "Pantry"])
  && V.CATEGORY_KEYS.every((k) => tabs.includes(V.CATEGORIES[k].label)), j(tabs));
const assetDoc = page("inventory/asset-assignment.html");
const typeOptions = [...assetDoc.querySelectorAll("select option")].map(text);
check("A2", "ASSET_TYPES: Laptop, Monitor, Access card (asset-assignment.html's type filter), tagged only in IT equipment",
  j(V.ASSET_TYPE_KEYS.map((k) => V.ASSET_TYPES[k].label)) === j(["Laptop", "Monitor", "Access card"]) && ["Laptop", "Monitor", "Access card"].every((t) => typeOptions.includes(t))
  && V.TAGGED_CATEGORY === "it" && V.CATEGORIES[V.TAGGED_CATEGORY] !== undefined);
const locationsOnPage = [...new Set([...itemsDoc.querySelectorAll("tbody tr")].map((tr) => text(tr.children[5])))].sort();
check("A3", "LOCATIONS: a fixed list, exactly the locations items.html uses", j(V.LOCATION_KEYS.map((k) => V.LOCATIONS[k].label).sort()) === j(locationsOnPage), j(locationsOnPage));
const moveDoc = page("inventory/stock-movements.html");
const moveTypes = [...moveDoc.querySelectorAll("form select option")].map(text);
check("A4", "MOVEMENT_TYPES: Stock in / Stock out / Adjustment / Return, as the movement form offers", j(V.MOVEMENT_TYPE_KEYS.map((k) => V.MOVEMENT_TYPES[k].label)) === j(["Stock in", "Stock out", "Adjustment", "Return"])
  && ["Stock in", "Stock out", "Adjustment", "Return"].every((t) => moveTypes.includes(t)), j(moveTypes));
check("A5", "CONDITIONS good / fair / poor; ASSET_STATUSES available / assigned / in-repair; VENDOR_STATUSES active / on-hold (the pages' badges)",
  j(V.CONDITION_KEYS) === j(["good", "fair", "poor"]) && j(V.ASSET_STATUS_KEYS) === j(["available", "assigned", "in-repair"])
  && j(V.ASSET_STATUS_KEYS.map((k) => V.ASSET_STATUSES[k].label)) === j(["Available", "Assigned", "In repair"]) && j(V.VENDOR_STATUS_KEYS) === j(["active", "on-hold"]));
// changeFor, exhaustively over -3..3 and some non-integers
const cf = [];
for (const t of [...V.MOVEMENT_TYPE_KEYS, "bogus"]) for (const q of [-3, -1, 0, 1, 3, 1.5, NaN, Infinity, "2", null]) cf.push(`${t}:${q}=${V.changeFor(t, q)}`);
const want = (t, q) => (!Number.isSafeInteger(q) ? null : t === "adjustment" ? (q === 0 ? null : q) : q < 1 ? null : t === "in" || t === "return" ? q : t === "out" ? -q : null);
const cfWant = [];
for (const t of [...V.MOVEMENT_TYPE_KEYS, "bogus"]) for (const q of [-3, -1, 0, 1, 3, 1.5, NaN, Infinity, "2", null]) cfWant.push(`${t}:${q}=${want(t, q)}`);
check("A6", "changeFor: in / return +q, out -q (q a whole number >= 1); adjustment any whole number but 0; anything else null", j(cf) === j(cfWant));
check("A7", "changeFor spot checks: out 10 -> -10; adjustment -3 -> -3; in 0 -> null; out -1 -> null; return '2' (a string) -> null",
  V.changeFor("out", 10) === -10 && V.changeFor("adjustment", -3) === -3 && V.changeFor("in", 0) === null && V.changeFor("out", -1) === null && V.changeFor("return", "2") === null);
const st = [];
for (const r of [0, 1, 5, 10]) for (let s = 0; s <= 12; s++) st.push(V.stockStatus(s, r) === (s === 0 ? (r > 0 ? "out" : "none") : s < r ? "low" : "in"));
check("A8", "stockStatus: out at 0, low below the reorder level, in at or above it (exactly at it is in stock); reorder level 0 -> 'none' at 0", st.every(Boolean)
  && V.stockStatus(5, 5) === "in" && V.stockStatus(4, 5) === "low" && V.stockStatus(0, 5) === "out" && V.stockStatus(0, 0) === "none" && V.stockStatus(1, 0) === "in");
check("A9", "STOCK_STATUSES labels as items.html's badges; needsReorder only for low and out",
  j(V.STOCK_STATUS_KEYS.map((k) => V.STOCK_STATUSES[k].label)) === j(["In stock", "Low stock", "Out of stock", "Not stocked"])
  && j(V.STOCK_STATUS_KEYS.filter(V.needsReorder)) === j(["low", "out"]));
const bars = [...itemsDoc.querySelectorAll("tbody tr")].map((tr) => {
  const qty = Number(text(tr.querySelector(".stock__qty"))), reorder = Number(text(tr.children[3]));
  const shown = Number(tr.querySelector(".progress__bar")?.getAttribute("style").match(/--w:\s*([\d.]+)%/)?.[1] ?? 0);
  return { qty, reorder, shown, got: V.stockBarPercent(qty, reorder) };
});
check("A10", "stockBarPercent gives every bar width items.html shows (stock / twice the reorder level, capped at 100)", bars.length === 7 && bars.every((b) => Math.round(b.got) === b.shown), j(bars));
check("A11", "stockBarPercent edges: 0 stock -> 0; reorder 0 with stock -> 100; capped at 100; 7 / 10 -> 35",
  V.stockBarPercent(0, 5) === 0 && V.stockBarPercent(3, 0) === 100 && V.stockBarPercent(99, 5) === 100 && V.stockBarPercent(7, 10) === 35);
check("A12", "stockValue = quantity x current unit price", V.stockValue(6, 78500) === 471000 && V.stockValue(0, 450) === 0);
check("A13", "data/inventory.js is pure: no imports, no storage, no clock, no users", !/\bimport\b|localStorage|new Date|Date\.now|getUser/.test(src("js", "data/inventory.js")));

// =====================================================================
section("B. The seed");
fresh();
const seedItems = I.allItems(), seedMoves = I.allMovements(), seedAssets = I.allAssets(), seedVendors = I.allVendors();
const users = new Set(S.getAllUsers().map((u) => u.id));
const people = [...seedMoves.flatMap((m) => [m.recordedBy, m.holderId]), ...seedAssets.flatMap((a) => [a.holderId, ...a.history.flatMap((h) => [h.byUserId, h.holderId])])].filter(Boolean);
check("B1", "real users only: every person on a movement or asset is on the user list", people.every((p) => users.has(p)), j([...new Set(people)]));
check("B2", "Q2: Admin does the inventory work: every movement recorded by Aarav, every asset history entry by Aarav (not Vikram)",
  seedMoves.every((m) => m.recordedBy === AARAV) && seedAssets.every((a) => a.history.every((h) => h.byUserId === AARAV)));
check("B3", "nobody fictional: no Ishita Bose, Neha Kulkarni, IT Support, Store Manager or Inventory Manager anywhere in the data",
  !/Ishita|Neha|IT Support|Store Manager|Inventory Manager/.test(j([seedItems, seedMoves, seedAssets, seedVendors])));
const pageItems = [...itemsDoc.querySelectorAll("tbody tr")].map((tr) => ({
  sku: text(tr.querySelector(".item__sku")), name: text(tr.querySelector(".item__name")), category: text(tr.children[1]),
  stock: Number(text(tr.querySelector(".stock__qty"))), reorder: Number(text(tr.children[3])), price: Number(text(tr.children[4]).replace(/[₹,]/g, "")),
  location: text(tr.children[5]), status: text(tr.children[6]),
}));
const mine = (sku) => seedItems.find((i) => i.sku === sku);
const itemDiffs = pageItems.filter((p) => { const i = mine(p.sku); return !i || i.name !== p.name || V.CATEGORIES[i.category].label !== p.category || i.stock !== p.stock
  || i.reorderLevel !== p.reorder || i.unitPrice !== p.price || V.LOCATIONS[i.location].label !== p.location || V.STOCK_STATUSES[i.status].label !== p.status; });
check("B4", "items.html's 7 items: name, category, stock today, reorder level, price, location and status all as the page shows them", pageItems.length === 7 && itemDiffs.length === 0, j(itemDiffs));
check("B5", "Q1: tagged items are IT equipment only and laptops / monitors / cards; cables, keyboards and every non-IT item are counted (assetType null)",
  seedItems.every((i) => i.assetType === null || (i.category === "it" && V.ASSET_TYPES[i.assetType]))
  && ["IT-1044", "IT-1102", "FUR-2010", "STA-3001", "STA-3015", "PAN-4002"].every((s) => mine(s).assetType === null) && mine("IT-1021").assetType === "laptop");
check("B6", "every asset is a unit of a tagged item", seedAssets.every((a) => mine(a.sku)?.assetType), j(seedAssets.map((a) => [a.id, a.sku])));
check("B7", "the older IT items exist only for their assets: Latitude 5410 / 5420 and the MacBook have reorder level 0, nothing in stock ('none')",
  ["IT-1019", "IT-1020", "IT-1031"].every((s) => mine(s).reorderLevel === 0 && mine(s).stock === 0 && mine(s).status === "none"));
// the ledger
const pageMoves = [...moveDoc.querySelectorAll("tbody tr")].map((tr) => ({ when: text(tr.children[0]), item: text(tr.children[1]), qty: Number(text(tr.children[3]).replace("+", "")), ref: text(tr.children[4]) }));
const MONTHS = { Sep: "09" };
// The page's times are India office times: read each stored instant at UTC+05:30.
const whenOf = (m) => { const d = new RealDate(Date.parse(m.at) + 330 * 60000); return `${d.getUTCDate()} ${Object.keys(MONTHS)[0]}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`; };
const asRef = (m) => (m.assetTag && m.type === "out" && m.reference === "Assigned" ? `Assigned to ${S.getUser(m.holderId)?.name}`
  : m.assetTag && m.type === "return" && m.reference === "Returned" ? `Returned by ${S.getUser(m.holderId)?.name}` : m.reference);
const nameOf = (sku) => mine(sku).name.replace("HDMI cable, 2 m", "HDMI cable, 2 m");
const moveDiffs = pageMoves.filter((p) => !seedMoves.some((m) => whenOf(m) === p.when && nameOf(m.sku) === p.item && m.change === p.qty && asRef(m) === p.ref));
check("B8", "stock-movements.html's 7 rows are all in the ledger (time, item, signed quantity, reference; asset rows name the holder from the user list)",
  pageMoves.length === 7 && moveDiffs.length === 0, j(moveDiffs));
const extra = seedMoves.filter((m) => !pageMoves.some((p) => whenOf(m) === p.when && nameOf(m.sku) === p.item));
check("B9", "the ledger's two other movements: AST-0099 sent for repair (8 Sep) and the coffee used since the 15 Sep delivery (22 Sep)",
  j(extra.map((m) => [m.id, m.sku, m.type, m.change, m.reference, m.assetTag])) === j([["MOV-9", "PAN-4002", "out", -6, "Pantry refill", null], ["MOV-1", "IT-1019", "out", -1, "Sent for repair", "AST-0099"]]), j(extra.map((m) => m.id)));
// running balance, oldest first
const oldestFirst = [...seedMoves].reverse();
const running = {}; let negative = [];
for (const i of seedItems) running[i.sku] = i.openingStock;
for (const m of oldestFirst) { running[m.sku] += m.change; if (running[m.sku] < 0) negative.push(m.id); }
check("B10", "replaying the ledger from the opening stock never goes below 0 and ends at today's stock for every item", negative.length === 0 && seedItems.every((i) => running[i.sku] === i.stock), j(negative));
check("B11", "seed movements are each valid for their type (changeFor) and only stock-outs carry a department (ENG, FIN: real departments)",
  seedMoves.every((m) => V.changeFor(m.type, m.type === "out" ? -m.change : m.change) === m.change) && seedMoves.every((m) => !m.department || (m.type === "out" && S.getDepartment(m.department))));
// the register
const A = (tag) => seedAssets.find((a) => a.id === tag);
check("B12a", "seed times are stored as instants: 18 Sep 16:40 in India is 2026-09-18T11:10:00.000Z (MOV-8)", seedMoves.find((m) => m.id === "MOV-8").at === "2026-09-18T11:10:00.000Z");
check("B12", "decision 17: Sneha has the Latitude 5440 AST-0217 since 18 Sep, from the 16:40 stock-out (MOV-8), after Divya Menon returned it on 14 Sep (MOV-2)",
  A("AST-0217").status === "assigned" && A("AST-0217").holderId === SNEHA && A("AST-0217").since === "2026-09-18" && A("AST-0217").sku === "IT-1021"
  && j(A("AST-0217").history.map((h) => [h.action, h.holderId, h.movementId])) === j([["returned", DIVYA, "MOV-2"], ["assigned", SNEHA, "MOV-8"]]));
const assetPage = [...assetDoc.querySelectorAll("tbody tr")].map((tr) => text(tr.children[0]));
const myDoc = page("inventory/my-assets.html");
const myPage = [...myDoc.querySelectorAll("tbody tr")].map((tr) => text(tr.children[0]).match(/AST-\d+/)?.[0]);
check("B13", "the register holds every tag asset-assignment.html and my-assets.html show, plus AST-0218 (a second Latitude 5440, added for 6D), and nothing else",
  j(seedAssets.map((a) => a.id).sort()) === j([...new Set([...assetPage, ...myPage, "AST-0218"])].sort()), j({ assetPage, myPage }));
check("B14", "Arjun holds my-assets.html's three (laptop AST-0188, monitor AST-0302, access card AST-0455) since 12 Jan 2023 (his joining date); Rohan the MacBook AST-0119 since 3 Mar 2025",
  j(I.assetsFor(ARJUN).map((a) => [a.id, I.assetTypeOf(a), a.since])) === j([["AST-0188", "laptop", "2023-01-12"], ["AST-0302", "monitor", "2023-01-12"], ["AST-0455", "access-card", "2023-01-12"]])
  && j(I.assetsFor(ROHAN).map((a) => [a.id, a.since])) === j([["AST-0119", "2025-03-03"]]));
check("B15", "conditions as the pages show them: AST-0188 fair, AST-0099 poor (in repair, no holder, no location), the rest good",
  A("AST-0188").condition === "fair" && A("AST-0099").condition === "poor" && A("AST-0099").status === "in-repair" && A("AST-0099").holderId === null && A("AST-0099").location === null
  && seedAssets.filter((a) => !["AST-0188", "AST-0099"].includes(a.id)).every((a) => a.condition === "good"));
const seedTagged = seedItems.filter((i) => i.assetType);
check("B16", "register and stock agree: no tagged item has fewer units in stock than its available assets; every history movementId is a ledger movement of that asset",
  seedTagged.every((i) => i.stock >= seedAssets.filter((a) => a.sku === i.sku && a.status === "available").length)
  && seedAssets.every((a) => a.history.every((h) => h.movementId === null || seedMoves.some((m) => m.id === h.movementId && m.assetTag === a.id))));
check("B17", "every assigned asset has a holder and a since date and no location; one is available: AST-0218, a Latitude 5440 in Store room A, no holder, no history, counted in IT-1021's 6",
  seedAssets.filter((a) => a.status === "assigned").every((a) => a.holderId && a.since && a.location === null)
  && j(seedAssets.filter((a) => a.status === "available")) === j([{ id: "AST-0218", sku: "IT-1021", condition: "good", status: "available", holderId: null, since: null, location: "store-a", history: [] }])
  && mine("IT-1021").stock === 6);
const vendorPage = [...page("inventory/vendors.html").querySelectorAll("tbody tr")].map((tr) => ({
  name: text(tr.querySelector(".table__user-name")), sub: text(tr.querySelector(".table__user-sub")), supplies: text(tr.children[1]), terms: text(tr.children[3]), status: text(tr.children[4]) }));
const vendorDiffs = vendorPage.filter((p) => !seedVendors.some((v) => v.name === p.name && `${v.contactName}, ${v.phone}` === p.sub && v.supplies === p.supplies && v.terms === p.terms
  && V.VENDOR_STATUSES[v.status].label === p.status));
check("B18", "vendors.html's 5 vendors, contacts stored as plain data (decision 14); no open-order count (no purchase orders, Q5)",
  vendorPage.length === 5 && seedVendors.length === 5 && vendorDiffs.length === 0 && seedVendors.every((v) => !("openOrders" in v) && !users.has(v.contactName)), j(vendorDiffs));

// =====================================================================
section("C. recordMovement");
fresh();
const who = [PRIYA, KABIR, ANANYA, SNEHA, VIKRAM, ARJUN].map((u) => err(move({}, u)));
check("C1", "only a role with inventory:create records movements (Admin): HR, Finance and every Employee, Vikram the Store Keeper included, are refused",
  who.every((e) => e === "You can't record stock movements.") && ok(move()), j(who));
fresh();
S.addUser(USER_ACTOR("admin", null), { name: "Second Admin", email: "a2@x.com", role: "admin", department: "ENG" });
const a2 = S.getAllUsers().find((u) => u.name === "Second Admin").id;
const a2ok = ok(move({}, a2));
S.deactivateUser(USER_ACTOR("admin", a2), a2, LEAVING_11Y());
check("C2", "any active Admin may (a second Admin); an inactive one, or an unknown id, may not", a2ok && err(move({}, a2)) === "You can't record stock movements." && err(move({}, "EMP-9999")) === "You can't record stock movements.");
fresh();
const r = move({ quantity: 5, reference: "  PO-2301 ", note: " half pallet ", id: "MOV-1", change: 999, at: "1999-01-01", recordedBy: ARJUN, assetTag: "AST-0188" });
check("C3", "a stock-in: stored with the signed change, now, the actor, trimmed reference / note; extra fields (id, change, at, recordedBy, assetTag) ignored",
  ok(r) && j({ ...r.record }) === j({ sku: "STA-3001", type: "in", change: 5, at: new RealDate(NOW).toISOString(), recordedBy: AARAV, reference: "PO-2301", note: "half pallet", department: null, assetTag: null, holderId: null, id: "MOV-10" })
  && I.stockOf("STA-3001") === 47, j(r.record));
fresh();
const bad = {
  sku: err(move({ sku: "NOPE" })), noSku: err(move({ sku: undefined })), type: err(move({ type: "gift" })), q0: err(move({ quantity: 0 })), qneg: err(move({ type: "out", quantity: -2 })),
  qfrac: err(move({ quantity: 1.5 })), qtext: err(move({ quantity: "lots" })), adj0: err(move({ type: "adjustment", quantity: 0 })), ref: err(move({ reference: "   " })),
};
check("C4", "validation: unknown item, bad type, quantity 0 / negative / fraction / text, adjustment 0, blank reference",
  bad.sku === "Choose an item." && bad.noSku === "Choose an item." && bad.type === "Choose a movement type." && [bad.q0, bad.qneg, bad.qfrac, bad.qtext].every((e) => e === "Enter a whole number of units, at least 1.")
  && bad.adj0 === "Enter a whole number other than 0 (below 0 takes stock away)." && bad.ref === "Reference is required." && I.allMovements().length === 9, j(bad));
check("C4b", "inherited names aren't list keys: type 'constructor' / 'toString' is refused as a type", err(move({ type: "constructor" })) === "Choose a movement type." && err(move({ type: "toString" })) === "Choose a movement type.");
check("C5", "each failure names its form field", [move({ sku: "x" }).field, move({ type: "x" }).field, move({ quantity: 0 }).field, move({ reference: "" }).field].join() === "sku,type,quantity,reference");
fresh();
check("C6", "quantity may come as text from a form ('7'); an adjustment may be negative ('-2') or positive",
  ok(move({ quantity: "7" })) && ok(move({ type: "adjustment", quantity: "-2" })) && ok(move({ type: "adjustment", quantity: 4 })) && I.stockOf("STA-3001") === 42 + 7 - 2 + 4);
fresh();
const tooMany = err(move({ type: "out", quantity: 43 })), adjDown = err(move({ type: "adjustment", quantity: -43 }));
check("C7", "stock never below 0: taking 43 of 42 reams (out or adjustment) is refused; all 42 is fine, then even 1 more is refused",
  tooMany === "Only 42 in stock." && adjDown === "Only 42 in stock." && ok(move({ type: "out", quantity: 42 })) && I.stockOf("STA-3001") === 0 && err(move({ type: "out", quantity: 1 })) === "Only 0 in stock.");
fresh();
const tagOut = move({ sku: "IT-1021", type: "out", quantity: 1 }), tagRet = move({ sku: "IT-1060", type: "return", quantity: 1 });
check("C8", "Q1: a tagged item (laptop, monitor) can't go out or come back as a plain movement: the asset register does that",
  err(tagOut) === "Dell Latitude 5440 is tagged: assign or take back the asset on the asset register instead." && tagOut.field === "type" && !ok(tagRet)
  && ok(move({ sku: "IT-1021", type: "in", quantity: 2 })) && ok(move({ sku: "IT-1021", type: "adjustment", quantity: -1 })), err(tagRet));
fresh();
I.returnAsset(AARAV, "AST-0188", { condition: "fair", location: "store-a" });   // 5420: 1 in stock, 1 available tag
I.returnAsset(AARAV, "AST-0302", { condition: "good", location: "store-a" });   // monitors: 5 in stock, 1 available tag
const below = err(move({ sku: "IT-1020", type: "adjustment", quantity: -1 }));
check("C9", "an adjustment can't leave a tagged item with fewer units than its available assets (the 5420 back in store is 1 unit, 1 tag)",
  below === "1 tagged asset is available, so stock can't go below 1." && ok(move({ sku: "IT-1060", type: "adjustment", quantity: -4 })) && err(move({ sku: "IT-1060", type: "adjustment", quantity: -1 })) === "1 tagged asset is available, so stock can't go below 1.", below);
fresh();
check("C9b", "only available tags set the floor: the monitors' one tag is assigned, so all 4 monitors in stock may be adjusted away",
  ok(move({ sku: "IT-1060", type: "adjustment", quantity: -4 })) && I.stockOf("IT-1060") === 0);
fresh();
const dep = move({ type: "out", quantity: 2, department: "HR" });
check("C10", "a stock-out may name a department (a real code, kept); a stock-in may not; an unknown code is refused",
  ok(dep) && dep.record.department === "HR" && err(move({ department: "HR" })) === "Only stock going out can be issued to a department." && move({ department: "HR" }).field === "department"
  && err(move({ type: "out", quantity: 1, department: "XYZ" })) === "Choose a department from the list." && move({ type: "out", quantity: 1, department: " " }).record?.department === null);
fresh();
const before = j(I.allMovements());
[move({ sku: "x" }), move({ quantity: 0 }), move({}, ARJUN), move({ type: "out", quantity: 999 })];
check("C11", "a refused movement stores nothing", j(I.allMovements()) === before);

// =====================================================================
section("D. The asset register");
fresh();
const ret = I.returnAsset(AARAV, "AST-0188", { condition: "poor", location: "store-b" });
const after188 = I.getAsset("AST-0188");
const m188 = I.allMovements()[0];
check("D1", "returnAsset: assigned -> available at a location, condition as found, holder and since cleared; a Return of 1 Latitude 5420 naming Arjun",
  ok(ret) && after188.status === "available" && after188.location === "store-b" && after188.condition === "poor" && after188.holderId === null && after188.since === null
  && j([m188.sku, m188.type, m188.change, m188.reference, m188.assetTag, m188.holderId, m188.recordedBy]) === j(["IT-1020", "return", 1, "Returned", "AST-0188", ARJUN, AARAV])
  && I.stockOf("IT-1020") === 1 && j(after188.history.at(-1)) === j({ action: "returned", at: new RealDate(NOW).toISOString(), byUserId: AARAV, holderId: ARJUN, movementId: m188.id, note: "" }));
// Round 10F (behaviour; was date "2026-09-29", the day before AST-0188's own return just above, which is refused now:
// handover.mjs A2 / A6): dated the day it came back, the earliest it can be; a past date kept is handover.mjs A5
const asg = I.assignAsset(AARAV, "AST-0188", { holderId: ROHAN, date: "2026-09-30", condition: "fair" });
const m188b = I.allMovements()[0];
check("D2", "Q1: assignAsset is a stock-out of 1 against the asset's item; the asset is assigned with holder, the hand-over date and condition",
  ok(asg) && I.stockOf("IT-1020") === 0 && j([m188b.type, m188b.change, m188b.reference, m188b.holderId]) === j(["out", -1, "Assigned", ROHAN])
  && j(I.assetsFor(ROHAN).map((a) => a.id)) === j(["AST-0119", "AST-0188"]) && I.getAsset("AST-0188").since === "2026-09-30" && I.getAsset("AST-0188").location === null
  && j(I.getAsset("AST-0188").history.map((h) => h.action)) === j(["returned", "assigned"]));
fresh();
I.returnAsset(AARAV, "AST-0217", { condition: "good", location: "store-a" });
const def = I.assignAsset(AARAV, "AST-0217", { holderId: ARJUN });
check("D3", "assignAsset defaults: today's date and the asset's own condition", ok(def) && I.getAsset("AST-0217").since === today && I.getAsset("AST-0217").condition === "good");
fresh();
I.returnAsset(AARAV, "AST-0217", { condition: "good", location: "store-a" });
const asgBad = {
  notAvail: err(I.assignAsset(AARAV, "AST-0188", { holderId: ROHAN })), repair: err(I.assignAsset(AARAV, "AST-0099", { holderId: ROHAN })), none: err(I.assignAsset(AARAV, "AST-9999", { holderId: ROHAN })),
  holder: err(I.assignAsset(AARAV, "AST-0217", { holderId: "EMP-9999" })), noHolder: err(I.assignAsset(AARAV, "AST-0217", {})), inactive: err(I.assignAsset(AARAV, "AST-0217", { holderId: DIVYA })),
  future: err(I.assignAsset(AARAV, "AST-0217", { holderId: ROHAN, date: "2026-10-01" })), date: err(I.assignAsset(AARAV, "AST-0217", { holderId: ROHAN, date: "2026-02-30" })),
  cond: err(I.assignAsset(AARAV, "AST-0217", { holderId: ROHAN, condition: "broken" })),
};
check("D4", "assignAsset refuses: not available (assigned / in repair), unknown tag, unknown / missing / inactive person, a future or impossible date, a bad condition",
  asgBad.notAvail === "AST-0188 is assigned, not available." && asgBad.repair === "AST-0099 is in repair, not available." && asgBad.none === "No asset AST-9999."
  && asgBad.holder === "Choose an employee." && asgBad.noHolder === "Choose an employee." && asgBad.inactive === "Divya Menon is inactive and can't be given an asset."
  && asgBad.future === "The date can't be in the future." && asgBad.date === "Pick a valid date." && asgBad.cond === "Choose a condition."
  && I.getAsset("AST-0217").status === "available" && I.stockOf("IT-1021") === 7, j(asgBad));
check("D5", "assigning on today's date is fine (the boundary of 'not in the future')", ok(I.assignAsset(AARAV, "AST-0217", { holderId: ROHAN, date: today })));
fresh();
const first = I.assignAsset(AARAV, "AST-0218", { holderId: ANANYA });
check("D5b", "AST-0218 is assignable straight from the seed: handing it over is the stock-out that takes IT-1021 from 6 to 5",
  ok(first) && I.stockOf("IT-1021") === 5 && I.getAsset("AST-0218").holderId === ANANYA && I.allMovements()[0].assetTag === "AST-0218" && I.allMovements()[0].change === -1);
fresh();
const retBad = {
  notAssigned: err(I.returnAsset(AARAV, "AST-0099", { condition: "good", location: "store-a" })), cond: err(I.returnAsset(AARAV, "AST-0188", { location: "store-a" })),
  loc: err(I.returnAsset(AARAV, "AST-0188", { condition: "good", location: "Store room A" })), none: err(I.returnAsset(AARAV, "AST-1", { condition: "good", location: "store-a" })),
};
check("D6", "returnAsset refuses: not assigned, no condition, a location not on the list (Q10: labels or free text aren't keys), unknown tag",
  retBad.notAssigned === "AST-0099 is in repair, not assigned." && retBad.cond === "Choose a condition." && retBad.loc === "Choose a location." && retBad.none === "No asset AST-1."
  && I.allMovements().length === 9, j(retBad));
fresh();
I.returnAsset(AARAV, "AST-0217", { condition: "good", location: "store-a" });
const proto = { asg: err(I.assignAsset(AARAV, "AST-0217", { holderId: ROHAN, condition: "constructor" })), retC: err(I.returnAsset(AARAV, "AST-0188", { condition: "toString", location: "store-a" })),
  retL: err(I.returnAsset(AARAV, "AST-0188", { condition: "good", location: "constructor" })), repC: err(I.returnFromRepair(AARAV, "AST-0099", { condition: "__proto__", location: "store-a" })),
  repL: err(I.returnFromRepair(AARAV, "AST-0099", { condition: "good", location: "hasOwnProperty" })) };
check("D6b", "inherited names aren't conditions or locations ('constructor', 'toString', '__proto__', 'hasOwnProperty' refused everywhere)",
  proto.asg === "Choose a condition." && proto.retC === "Choose a condition." && proto.retL === "Choose a location." && proto.repC === "Choose a condition." && proto.repL === "Choose a location.", j(proto));
fresh();
S.deactivateUser(USER_ACTOR("admin", ROHAN), ROHAN, LEAVING_11Y());
const fromLeaver = I.returnAsset(AARAV, "AST-0119", { condition: "good", location: "store-a" });
check("D7", "Q8: an asset can always be taken back from someone who has left (inactive), as Divya Menon's laptop was", ok(fromLeaver) && I.allMovements()[0].holderId === ROHAN);
fresh();
const rep1 = I.sendForRepair(AARAV, "AST-0302", "  Flickering screen ");
const a302 = I.getAsset("AST-0302");
check("D8", "sendForRepair from a person: in repair, holder / since / location cleared, no stock movement (it was already out of stock); the holder and note in its history",
  ok(rep1) && a302.status === "in-repair" && a302.holderId === null && a302.since === null && I.allMovements().length === 9 && I.stockOf("IT-1060") === 4
  && j(a302.history.at(-1)) === j({ action: "sent-to-repair", at: new RealDate(NOW).toISOString(), byUserId: AARAV, holderId: ARJUN, movementId: null, note: "Flickering screen" }));
const back = I.returnFromRepair(AARAV, "AST-0302", { condition: "fair", location: "store-a" });
check("D9", "returnFromRepair: available at the location in the condition found, a Return of 1 'Back from repair'",
  ok(back) && I.getAsset("AST-0302").status === "available" && I.getAsset("AST-0302").location === "store-a" && I.getAsset("AST-0302").condition === "fair"
  && I.stockOf("IT-1060") === 5 && j([I.allMovements()[0].type, I.allMovements()[0].change, I.allMovements()[0].reference, I.allMovements()[0].holderId]) === j(["return", 1, "Back from repair", null]));
const rep2 = I.sendForRepair(AARAV, "AST-0302", "Dead pixels");
check("D10", "sendForRepair from the store: a stock-out of 1 'Sent for repair' (an available asset is in stock)",
  ok(rep2) && I.stockOf("IT-1060") === 4 && j([I.allMovements()[0].type, I.allMovements()[0].change, I.allMovements()[0].reference, I.allMovements()[0].assetTag]) === j(["out", -1, "Sent for repair", "AST-0302"])
  && I.getAsset("AST-0302").history.at(-1).movementId === I.allMovements()[0].id);
const repBad = { again: err(I.sendForRepair(AARAV, "AST-0302", "x")), note: err(I.sendForRepair(AARAV, "AST-0188", "  ")), notRep: err(I.returnFromRepair(AARAV, "AST-0188", { condition: "good", location: "store-a" })),
  cond: err(I.returnFromRepair(AARAV, "AST-0099", { location: "store-a" })), loc: err(I.returnFromRepair(AARAV, "AST-0099", { condition: "good" })), none: err(I.sendForRepair(AARAV, "AST-2", "x")) };
check("D11", "repair refusals: already in repair, no note, not in repair, no condition / location, unknown tag",
  repBad.again === "AST-0302 is already in repair." && repBad.note === "Say what's wrong with it." && repBad.notRep === "AST-0188 is assigned, not in repair."
  && repBad.cond === "Choose a condition." && repBad.loc === "Choose a location." && repBad.none === "No asset AST-2.", j(repBad));
fresh();
const perms = [PRIYA, KABIR, SNEHA, VIKRAM, ARJUN].flatMap((u) => [err(I.assignAsset(u, "AST-0217", { holderId: ROHAN })), err(I.returnAsset(u, "AST-0188", { condition: "good", location: "store-a" })),
  err(I.sendForRepair(u, "AST-0188", "x")), err(I.returnFromRepair(u, "AST-0099", { condition: "good", location: "store-a" }))]);
check("D12", "only assets:assign (Admin) assigns, takes back and repairs: HR, Finance and Employees (Vikram included) are refused every time",
  perms.every((e) => /^You can't (assign assets|take back assets|send assets for repair)\.$/.test(e)) && j(I.allAssets()) === j(seedAssets) && I.allMovements().length === 9, j([...new Set(perms)]));
fresh();
S.addUser(USER_ACTOR("admin", null), { name: "Second Admin", email: "a2@x.com", role: "admin", department: "ENG" });
const adm2 = S.getAllUsers().find((u) => u.name === "Second Admin").id;
S.deactivateUser(USER_ACTOR("admin", adm2), adm2, LEAVING_11Y());
check("D13", "an inactive Admin can't use the register", err(I.returnAsset(adm2, "AST-0188", { condition: "good", location: "store-a" })) === "You can't take back assets.");
fresh();
check("D14", "nothing in stock to assign: refused (an available tag whose unit isn't counted, e.g. after a bad saved copy)", (() => {
  I.returnAsset(AARAV, "AST-0217", { condition: "good", location: "store-a" });
  I.allItems();   // the first read stores the items
  const box = JSON.parse(mem.get("officeos:inventory-items")); box.records.find((i) => i.sku === "IT-1021").openingStock = -7; mem.set("officeos:inventory-items", j(box));
  const e1 = err(I.assignAsset(AARAV, "AST-0217", { holderId: ROHAN })), e2 = err(I.sendForRepair(AARAV, "AST-0217", "x"));
  return e1 === "No unit of IT-1021 is in stock to assign." && e2 === "No unit of IT-1021 is in stock." && I.getAsset("AST-0217").status === "available";
})());

// =====================================================================
section("E. The ledger promise (Q12)");
const exported = Object.keys(I).sort();
// Round 6I adds problem reports (reportProblem, closeReport, openReportOf, assetsWithOpenReports): history entries only.
// Round 10F (API; was the same list without earliestHandOver): + earliestHandOver, a read (the earliest hand-over date)
check("E1", "the store's API: no way to edit or delete a movement, item, asset or vendor (only these exports)", j(exported) === j([
  "allAssets", "allItems", "allMovements", "allVendors", "assetTotals", "assetTypeOf", "assetsFor", "assetsHeldByInactive", "assetsWithOpenReports", "assignAsset", "closeReport", "earliestHandOver", "getAsset", "getItem", "getVendor",
  "inventoryTotals", "movementsFor", "openReportOf", "recordMovement", "reorderAlerts", "reportProblem", "resetInventoryData", "returnAsset", "returnFromRepair", "sendForRepair", "stockOf"]), j(exported));
fresh();
const ledger0 = I.allMovements();
move(); I.returnAsset(AARAV, "AST-0188", { condition: "good", location: "store-a" }); I.sendForRepair(AARAV, "AST-0188", "x"); move({ type: "adjustment", quantity: -1 });
const ledger1 = I.allMovements();
check("E2", "writes only add: every earlier movement is unchanged, byte for byte, and ids keep counting up (MOV-10..13)",
  j(ledger1.slice(4)) === j(ledger0) && j(ledger1.slice(0, 4).map((m) => m.id).sort()) === j(["MOV-10", "MOV-11", "MOV-12", "MOV-13"]));
const got = I.allMovements()[0]; got.change = 1000;
const gi = I.getItem("STA-3001"); gi.stock = 0; gi.openingStock = 0;
check("E3", "reads are copies: editing what a read returned changes nothing", I.allMovements()[0].change !== 1000 && I.stockOf("STA-3001") === 46);
check("E4", "no stock figure is stored: an item record has openingStock, never stock / status / value",
  JSON.parse(mem.get("officeos:inventory-items")).records.every((r) => !("stock" in r) && !("status" in r) && !("value" in r) && Number.isInteger(r.openingStock)));
check("E5", "allMovements is newest first; movementsFor(sku) is that item's only", I.allMovements().every((m, i, a) => i === 0 || a[i - 1].at >= m.at)
  && j(I.movementsFor("PAN-4002").map((m) => m.id)) === j(["MOV-9", "MOV-3"]) && I.movementsFor("NOPE").length === 0);

// =====================================================================
section("F. Reads and totals");
fresh();
const T = I.inventoryTotals(I.allItems());
check("F1", "inventoryTotals(seed): 12 items, 167 units, ₹7,74,040; the 7 items.html rows alone are ₹7,08,540 (6A section 6's figure)",
  T.items === 12 && T.units === 167 && T.value === 774040 && I.inventoryTotals(I.allItems().filter((i) => pageItems.some((p) => p.sku === i.sku))).value === 708540, j(T));
check("F2", "by category (every key present): IT 8 items / ₹5,65,000, Furniture ₹1,79,200, Stationery ₹23,040, Pantry ₹6,800; by status in 5, low 3, out 1, none 3",
  j(T.byCategory) === j({ it: { items: 8, units: 43, value: 565000 }, furniture: { items: 1, units: 14, value: 179200 }, stationery: { items: 2, units: 102, value: 23040 }, pantry: { items: 1, units: 8, value: 6800 } })
  && j(T.byStatus) === j({ in: 5, low: 3, out: 1, none: 3 }));
check("F3", "inventoryTotals([]) is all zeros with every key", j(I.inventoryTotals([])) === j({ items: 0, units: 0, value: 0, byCategory: Object.fromEntries(V.CATEGORY_KEYS.map((k) => [k, { items: 0, units: 0, value: 0 }])),
  byStatus: Object.fromEntries(V.STOCK_STATUS_KEYS.map((k) => [k, 0])) }));
check("F4", "reorderAlerts: items.html's four (HDMI out; MX Keys, coffee, A4 low), emptiest first; the 'none' items aren't alerts",
  j(I.reorderAlerts().map((i) => [i.sku, i.status])) === j([["IT-1102", "out"], ["IT-1044", "low"], ["PAN-4002", "low"], ["STA-3001", "low"]]));
const AT = I.assetTotals(I.allAssets());
check("F5", "assetTotals(seed): 7 assets; assigned 5, available 1, in repair 1; 5 laptops, 1 monitor, 1 access card", j(AT) === j({ total: 7, byStatus: { available: 1, assigned: 5, "in-repair": 1 }, byType: { laptop: 5, monitor: 1, "access-card": 1 } }), j(AT));
check("F6", "getItem / stockOf / getAsset / getVendor: unknown -> null; assetTypeOf(null) and of an asset whose item is gone -> null; assetsFor(someone) -> []",
  I.getItem("NOPE") === null && I.stockOf("NOPE") === null && I.getAsset("AST-1") === null && I.getVendor("VEN-99") === null && I.getVendor("VEN-2").contactName === "Meenal Kapoor"
  && I.assetTypeOf(null) === null && I.assetTypeOf({ sku: "NOPE" }) === null && I.assetsFor(PRIYA).length === 0 && I.getItem("IT-1021").stock === 6);
check("F7", "Q8: nobody inactive holds an asset in the seed (Divya returned hers)", I.assetsHeldByInactive().length === 0);
S.deactivateUser(USER_ACTOR("admin", ROHAN), ROHAN, LEAVING_11Y()); S.deleteUser(USER_ACTOR("admin", VIKRAM), VIKRAM);
const held1 = I.assetsHeldByInactive().map((a) => a.id);
S.reactivateUser(USER_ACTOR("admin", ROHAN), ROHAN);
check("F8", "Q8: deactivating Rohan is not blocked, and his MacBook is then listed as held by someone inactive (warn, don't block); reactivated, it isn't",
  j(held1) === j(["AST-0119"]) && I.assetsHeldByInactive().length === 0);
fresh();
I.returnAsset(AARAV, "AST-0217", { condition: "good", location: "store-a" }); I.assignAsset(AARAV, "AST-0217", { holderId: MEERA });
S.deleteUser(USER_ACTOR("admin", MEERA), MEERA);
check("F9", "Q8: someone deleted from the list while holding an asset is listed too", j(I.assetsHeldByInactive().map((a) => a.id)) === j(["AST-0217"]));

// =====================================================================
section("G. Random write sequences keep every invariant");
let seed = 42;
const rand = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
const pick = (list) => list[rand(list.length)];
const SKUS = I.allItems().map((i) => i.sku), TAGS = I.allAssets().map((a) => a.id), PEOPLE = [AARAV, PRIYA, ARJUN, ROHAN, SNEHA, DIVYA, ANANYA];
const broken = [];
let accepted = 0, refused = 0;
for (let run = 0; run < 12; run++) {
  fresh();
  const opening = Object.fromEntries(I.allItems().map((i) => [i.sku, i.openingStock]));
  let prev = I.allMovements();
  for (let step = 0; step < 60; step++) {
    const kind = rand(5), actor = rand(6) ? AARAV : pick(PEOPLE), tag = pick(TAGS);
    const result = kind === 0 ? I.recordMovement(actor, { sku: pick(SKUS), type: pick(V.MOVEMENT_TYPE_KEYS), quantity: rand(9) - 4 + (rand(2) ? 0 : 20), reference: "x" })
      : kind === 1 ? I.assignAsset(actor, tag, { holderId: pick(PEOPLE) })
      : kind === 2 ? I.returnAsset(actor, tag, { condition: pick(V.CONDITION_KEYS), location: pick(V.LOCATION_KEYS) })
      : kind === 3 ? I.sendForRepair(actor, tag, "x") : I.returnFromRepair(actor, tag, { condition: "good", location: "store-a" });
    ok(result) ? accepted++ : refused++;
    const items = I.allItems(), assets = I.allAssets(), moves = I.allMovements();
    const sums = {}; for (const m of moves) sums[m.sku] = (sums[m.sku] ?? 0) + m.change;
    const problems = [
      items.some((i) => i.stock < 0) && "negative stock",
      items.some((i) => i.stock !== opening[i.sku] + (sums[i.sku] ?? 0)) && "stock != opening + movements",
      items.some((i) => i.assetType && i.stock < assets.filter((a) => a.sku === i.sku && a.status === "available").length) && "fewer units than available tags",
      assets.some((a) => (a.status === "assigned") !== Boolean(a.holderId && a.since)) && "holder / since vs status",
      assets.some((a) => (a.status === "available") !== Boolean(a.location)) && "location vs status",
      j(moves.slice(moves.length - prev.length)) !== j(prev) && "an earlier movement changed",
      moves.length - prev.length > 1 && "more than one movement per write",
      moves.length > prev.length && !ok(result) && "a refused write added a movement",
      assets.some((a) => a.history.some((h) => h.movementId && !moves.some((m) => m.id === h.movementId))) && "history points at a missing movement",
    ].filter(Boolean);
    if (problems.length) broken.push(`run ${run} step ${step}: ${problems.join(", ")}`);
    prev = moves;
  }
}
check("G1", "12 runs x 60 random writes (any actor, item, type, quantity, asset, person): stock never below 0, always opening + movements, never fewer units than available tags, states consistent, ledger append-only",
  broken.length === 0 && accepted > 150 && refused > 150, broken.slice(0, 3).join(" | ") || `${accepted} accepted, ${refused} refused`);

// =====================================================================
section("H. Reset, corrupt storage, failed saves");
fresh();
const seedAll = j([I.allItems(), I.allMovements(), I.allAssets(), I.allVendors()]);
move(); I.returnAsset(AARAV, "AST-0188", { condition: "good", location: "store-a" });
const dirty = j([I.allItems(), I.allMovements(), I.allAssets(), I.allVendors()]) !== seedAll;
I.resetInventoryData();
check("H1", "resetInventoryData() puts every collection back to the seed (keys inventory-items, stock-movements, assets, vendors; version 1)",
  dirty && j([I.allItems(), I.allMovements(), I.allAssets(), I.allVendors()]) === seedAll
  && ["inventory-items", "stock-movements", "assets", "vendors"].every((k) => JSON.parse(mem.get(`officeos:${k}`)).version === 1));
fresh();
mem.set("officeos:stock-movements", "{not json"); mem.set("officeos:assets", j({ version: 0, nextNum: 1, records: [] }));
const reseeded = quiet(() => j([I.allItems(), I.allMovements(), I.allAssets(), I.allVendors()]));
check("H2", "a corrupt or old saved copy is replaced by the seed (collection.js behaviour)", reseeded === seedAll);
fresh();
I.allItems(); I.allAssets();
failKey = "officeos:assets";
const failed1 = quiet(() => I.returnAsset(AARAV, "AST-0188", { condition: "good", location: "store-a" }));
failKey = null;
check("H3", "if the asset can't be saved (storage full), the movement just added is taken back out: no half-done move",
  !ok(failed1) && failed1.error === "Couldn't save. Browser storage may be full or disabled." && I.allMovements().length === 9 && I.getAsset("AST-0188").status === "assigned" && I.stockOf("IT-1020") === 0);
failKey = "officeos:stock-movements";
const failed2 = quiet(() => I.returnAsset(AARAV, "AST-0188", { condition: "good", location: "store-a" }));
const failed3 = quiet(() => move());
failKey = null;
check("H4", "if the movement can't be saved, nothing changes: both report the save failure (no exception) and the asset isn't touched",
  [failed2, failed3].every((x) => x.error === "Couldn't save. Browser storage may be full or disabled.") && I.allMovements().length === 9 && I.getAsset("AST-0188").status === "assigned");

// =====================================================================
section("L. Source layout");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(`${dir}/${d.name}`, base) : [`${dir}/${d.name}`.slice(base.length + 1)]));
const root = (d) => new URL(`./${d}`, import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
// Since Round 6C, 6B's result is read frozen (./js-pre6C, ./html-pre6C): 6C wired the store to two pages.
const POST = "js-pre6C";
const live = walk(root(POST)).sort(), pre = walk(root("js-pre6B")).sort();
const changedFiles = live.filter((p) => !pre.includes(p) || src(POST, p) !== src("js-pre6B", p));
check("L1", "the only differences from the code before this round: data/inventory.js rewritten, data/inventory-store.js new, pages/users-list.js",
  j(changedFiles) === j(["data/inventory-store.js", "data/inventory.js", "pages/users-list.js"]) && pre.every((p) => live.includes(p)), j(changedFiles));
const lf = (s) => s.replace(/\r\n/g, "\n");
const ul = lf(src("js-pre6B", "pages/users-list.js"))
  .replace('import { resetExpenseData } from "../data/expenses-store.js";\n', 'import { resetExpenseData } from "../data/expenses-store.js";\nimport { resetInventoryData } from "../data/inventory-store.js";\n')
  .replace("salaries and expense claims in this browser", "salaries, expense claims and inventory in this browser")
  .replace("    resetExpenseData();\n", "    resetExpenseData();\n    resetInventoryData();\n");
check("L2", "users-list.js: only the Reset button's import, confirm wording and resetInventoryData() call", ul === lf(src(POST, "pages/users-list.js")));
const importers = live.filter((p) => !/data\/inventory(-store)?\.js$/.test(p) && /inventory(-store)?\.js/.test(src(POST, p)));
const pagesDir = walk(root("html-pre6C")).filter((p) => p.endsWith(".html") && /inventory(-store)?\.js/.test(src("html-pre6C", p)));
check("L3", "nothing wired to a page yet: only users-list.js imports the store, no page loads either file", j(importers) === j(["pages/users-list.js"]) && pagesDir.length === 0, j({ importers, pagesDir }));
const storeSrc = src(POST, "data/inventory-store.js");
const deps = [...storeSrc.matchAll(/from "\.\/([\w-]+)\.js"/g)].map((m) => m[1]);
check("L4", "no import cycle: none of the store's own imports import inventory-store", deps.every((d) => !/from "\.\/inventory-store\.js"/.test(src(POST, `data/${d}.js`))), j(deps));
const used = [...new Set([...storeSrc.matchAll(/"((?:inventory|assets|vendors):[\w-]+)"/g)].map((m) => m[1]))].sort();
check("L5", "Q2: the permissions the store checks exist (inventory:create, assets:assign) and only Admin holds them; no permission, role or route changed",
  j(used) === j(["assets:assign", "inventory:create"]) && used.every((p) => PERMISSIONS[p.split(":")[0]].includes(p.split(":")[1]))
  && used.every((p) => ROLES.admin.permissions.includes(p) && !["hr", "fin", "emp"].some((r) => ROLES[r].permissions.includes(p)))
  && ["config/permissions.js", "config/roles.js", "config/routes.js", "config/nav.js"].every((p) => src(POST, p) === src("js-pre6B", p)), j(used));
check("L6", "data/requests.js (dead; 6E replaces its asset request) is untouched", src(POST, "data/requests.js") === src("js-pre6B", "data/requests.js"));
check("L7", "the three files: CRLF only, no final newline (the tree's convention)",
  ["data/inventory.js", "data/inventory-store.js", "pages/users-list.js"].every((p) => { const s = fs.readFileSync(new URL(`./${POST}/${p}`, import.meta.url)).toString("utf8"); return !/[^\r]\n/.test(s) && !/\r(?!\n)/.test(s) && !s.endsWith("\n"); }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
