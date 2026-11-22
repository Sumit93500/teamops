// usage: node assetimport.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// AS2: the old site's inventory imported into the AS1 register and stock ledger (data/inventory-import.js, data/inventory-migrate.js)
//   S  the source: the copied defaults are exactly what a fresh old store reads; the saved old records are what the import reads
//   R  what moved: the same tags, ids, SKUs and names; statuses, holders and dates mapped; on-hand figures equal the old store's
//   M  nothing invented: no purchase price or date on an imported asset ("details missing"), no depreciation until they are added
//   H  the history: the old entries as lifecycle events with their own dates, null where the old data doesn't say
//   C  completing the details: who may, the rules (date, price, salvage default)
//   I  idempotent: the builder, the seed, and the merge run twice change nothing; a merge adds only what is missing and edits nothing there
//   O  the old store untouched: nothing here writes its keys; the seed follows its saved records until the new box is first written
//   V  who sees what of the imported data (no values for anyone without assets:view-values)
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const clock = (date, hm = "10:00") => { const [y, m, d] = date.split("-").map(Number); const [h, mi] = hm.split(":").map(Number); NOW = RealDate.UTC(y, m - 1, d, h, mi) - 330 * 60000; };
clock("2026-11-22");
import { readFileSync } from "node:fs";

const S = await import("./js/data/store.js");
const INV = await import("./js/data/inventory-store.js");
const IM = await import("./js/data/inventory-import.js");
const AU = await import("./js/data/audit-trail.js");
const AR = await import("./js/data/asset-register.js");
const SL = await import("./js/data/stock-ledger.js");
const MG = await import("./js/data/inventory-migrate.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(6)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 300)}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const ADMIN = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", SNEHA = "EMP-1029", ROHAN = "EMP-1042", DIVYA = "EMP-1061", ARJUN = "EMP-1105";
const OLD_KEYS = ["officeos:assets", "officeos:inventory-items", "officeos:stock-movements", "officeos:vendors"];
const oldBytes = () => j(OLD_KEYS.map((k) => mem.get(k) ?? null));
const FX = (n) => readFileSync(`./as1-${n}.json`, "utf8");
const fresh = () => { mem.clear(); clock("2026-11-22"); };
// IT: made through the store (nobody is seeded with the role)
const makeIt = () => S.addUser(ADMIN, { name: "Isha Kulkarni", email: "isha.kulkarni@northwind.com", department: "IT", designation: "IT Engineer", role: "it", dateOfJoining: "2 Nov 2026" }).record.id;

// ---------- S ----------
section("S. The source");
fresh();
const defaults = IM.oldDefaults();
const oldAssets = INV.allAssets(), oldVendors = INV.allVendors(), oldMoves = INV.allMovements(), oldItems = INV.allItems();   // seeds the old store, as its own pages would
check("S1", "the copied defaults are exactly what a fresh old store reads: 7 assets (history included), 5 vendors, 9 movements, 12 items", j(defaults.assets) === j(oldAssets) && j(defaults.vendors) === j(oldVendors) && j(defaults.movements.slice().sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id, "en", { numeric: true }))) === j(oldMoves)
  && j(defaults.items) === j(oldItems.map(({ stock, status, value, ...rest }) => rest)), j([oldAssets.length, oldVendors.length, oldMoves.length, oldItems.length]));
check("S2", "with nothing saved, the import's source is those defaults; with the old store saved, it is the saved records", j(IM.oldSource().assets) === j(oldAssets) && j(IM.oldSource().vendors) === j(oldVendors));
mem.clear();
check("S3", "reading the source never seeds the old store (no old key appears)", (() => { IM.oldSource(); return OLD_KEYS.every((k) => !mem.has(k)) && mem.size === 0; })());

// ---------- R ----------
section("R. What moved");
fresh();
const imp = IM.buildImport(IM.oldSource());
const regAssets = AR.listAssets(ADMIN).filter((a) => a.imported);
check("R1", "the 7 tagged assets keep their tags, in the old order, and their names are their items' names", j(regAssets.map((a) => a.tag)) === j(oldAssets.map((a) => a.id)) && regAssets.every((a) => a.name === oldItems.find((i) => i.sku === oldAssets.find((o) => o.id === a.tag).sku).name), j(regAssets.map((a) => a.tag)));
const wantState = { available: "in-store", assigned: "assigned", "in-repair": "under-maintenance" };
check("R2", "status maps to the lifecycle (available -> in store, assigned -> assigned, in repair -> under maintenance); holders and 'since' dates are the old ones", oldAssets.every((o) => { const a = regAssets.find((x) => x.tag === o.id); return a.status === wantState[o.status] && (a.holderId ?? null) === (o.holderId ?? null) && (a.since ?? null) === (o.since ?? null); }));
check("R3", "the category follows the type (laptops, a monitor, the access card -> other); every asset is at the head office; AST-0218's store room is kept as text", j(regAssets.map((a) => a.category)) === j(["laptop", "laptop", "laptop", "laptop", "laptop", "monitor", "other"]) && regAssets.every((a) => a.locationId === "OFF-1") && regAssets.find((a) => a.tag === "AST-0218").storeRoom === "Store room A");
check("R4", "the last recorded condition is the old one (poor, good, fair, good, good, good, good)", j(regAssets.map((a) => a.condition)) === j(oldAssets.map((o) => o.condition)), j(regAssets.map((a) => a.condition)));
const vendors = AR.vendorsFor(ADMIN);
check("R5", "the 5 vendors keep ids, names, contacts and phones; supplies and terms are kept; QuickPrint (on hold) is not active and flagged on hold; no email, GSTIN or address is made up", j(vendors.map((v) => v.id).sort()) === j(oldVendors.map((v) => v.id).sort()) && oldVendors.every((o) => { const v = vendors.find((x) => x.id === o.id); return v.name === o.name && v.contactPerson === o.contactName && v.phone === o.phone && v.supplies === o.supplies && v.terms === o.terms && v.active === (o.status === "active") && v.onHold === (o.status === "on-hold") && v.email === "" && v.gstin === null && v.address === ""; }));
const items = SL.stockItems(ADMIN);
check("R6", "the 12 stock items keep ids (ITM-n), SKUs, names, categories and reorder levels; the unit is 'unit' and no price is carried", oldItems.every((o) => { const i = items.find((x) => x.id === o.id); return i && i.sku === o.sku && i.name === o.name && i.category === o.category && i.reorderLevel === o.reorderLevel && i.unit === "unit" && !("unitPrice" in i) && i.tagged === (o.assetType ?? null); }) && items.length === 12);
const sampleOut = (id) => SL.stockMovements(ADMIN, { itemId: id }).filter((m) => m.sample).reduce((s, m) => s + (m.kind === "out" ? m.qty : 0), 0);
check("R7", "on hand equals the old store's figure for every item (the two sample issues aside): paper 42, coffee 8, HDMI 0, chairs 14, laptops 6 / 0 / 0 / 0, monitors 4, cards 30", oldItems.every((o) => items.find((x) => x.id === o.id).onHand === o.stock - sampleOut(o.id)) && j(oldItems.map((o) => o.stock)) === j([6, 5 - 2, 0, 14, 42, 60, 8, 0, 0, 0, 4, 30]), j(items.map((i) => [i.id, i.onHand])));
check("R8", "the untagged movements are kept with their dates and words (paper out 10 'Finance department request'); a PO number becomes the reference; an adjustment is a write-off", (() => { const m = SL.stockMovements(ADMIN, { itemId: "ITM-5" }); const po = SL.stockMovements(ADMIN, { itemId: "ITM-7" }).find((x) => x.reference === "PO-2264"); const adj = SL.stockMovements(ADMIN, { itemId: "ITM-3" }).find((x) => x.kind === "remove"); return m.some((x) => x.kind === "out" && x.qty === 10 && x.date === "2026-09-18" && /Finance department request/.test(x.reason)) && po?.kind === "in" && po.qty === 12 && po.date === "2026-09-15" && adj?.qty === 3 && /Stock count correction/.test(adj.reason); })());
check("R9", "a tagged item is one count carried over (the old laptop movements are the asset history): ITM-1 has one movement, ITM-8 none (0 left)", SL.stockMovements(ADMIN, { itemId: "ITM-1" }).length === 1 && SL.stockMovements(ADMIN, { itemId: "ITM-8" }).length === 0);
check("R10", "the opening counts are dated the day before the first old movement (7 Sep 2026) and say the date isn't recorded", SL.stockMovements(ADMIN, { itemId: "ITM-6" }).filter((m) => !m.sample).every((m) => m.date === "2026-09-07" && /date not recorded/.test(m.reason)));
check("R11", "the register's own extras are marked sample (3 assets, 1 maintenance record, 2 stock issues) and sit beside the import; none of them has an imported tag and none is held by anyone", AR.listAssets(ADMIN).filter((a) => a.sample).map((a) => a.tag).join() === "AST-0009,AST-0010,AST-0011" && AR.listAssets(ADMIN).filter((a) => a.sample).every((a) => !a.holderId) && SL.stockMovements(ADMIN).filter((m) => m.sample).length === 2);
check("R12", "the low-stock list leaves out items that are no longer reordered (reorder level 0): paper, coffee, keyboards and HDMI cables only", j(SL.lowStock(ADMIN).map((i) => i.id).sort()) === j(["ITM-2", "ITM-3", "ITM-5", "ITM-7"]), j(SL.lowStock(ADMIN).map((i) => i.id)));

// ---------- M ----------
section("M. Nothing invented");
check("M1", "no imported asset has a purchase date, price, vendor, invoice, warranty or serial; each is flagged 'details missing'", regAssets.every((a) => a.detailsMissing && a.purchaseDate === null && a.purchasePrice === null && a.vendorId === null && a.invoiceRef === "" && a.warrantyUntil === null && a.serial === "" && a.salvageValue === null));
check("M2", "the sample assets with details are not flagged; an imported one has the category's default method, life and rate", AR.listAssets(ADMIN).filter((a) => a.sample).every((a) => !a.detailsMissing) && AR.getAssetFor(KABIR, "AST-0119").usefulLifeYears === 3 && AR.getAssetFor(KABIR, "AST-0119").depreciationMethod === "slm" && AR.getAssetFor(KABIR, "AST-0119").wdvRatePercent === 63.16);
const dm = AR.depreciationOf(KABIR, "AST-0119", "2026-11-22", { schedule: true });
check("M3", "Finance asking for an imported asset's depreciation gets 'no purchase date or price yet', not a made-up figure", !dm.ok && dm.code === "details-missing" && /no purchase date or price/.test(dm.error));
check("M4", "the unknown dates are null, not guessed: the 'added' event of every imported asset has no date, and AST-0217's first holder (Divya) has no start date", AR.assetEvents(ADMIN, "AST-0119").find((e) => e.kind === "added").date === null && AR.assignmentHistory(ADMIN, "AST-0217")[0].from === null);

// ---------- H ----------
section("H. The history");
const ev217 = AR.assetEvents(ADMIN, "AST-0217");
check("H1", "AST-0217: added, issued to Divya (start not recorded), returned 14 Sep, issued to Sneha 18 Sep, with the old condition on the last", j(ev217.map((e) => [e.kind, e.date, e.personId, e.condition])) === j([["added", null, null, null], ["issued", null, DIVYA, null], ["returned", "2026-09-14", DIVYA, null], ["issued", "2026-09-18", SNEHA, "good"]]), j(ev217.map((e) => [e.kind, e.date])));
check("H2", "the assignment rows pair them: Divya (no start) to 14 Sep, Sneha from 18 Sep, still holding", j(AR.assignmentHistory(ADMIN, "AST-0217").map((r) => [r.personId, r.from, r.to])) === j([[DIVYA, null, "2026-09-14"], [SNEHA, "2026-09-18", null]]));
const mr = AR.maintenanceOf(ADMIN, "AST-0099");
check("H3", "AST-0099 (in repair): an open maintenance record from 8 Sep with the old words, no cost, no vendor (nothing made up); its events end under maintenance", mr.length === 1 && mr[0].status === "open" && mr[0].date === "2026-09-08" && mr[0].issue === "Sent to the vendor for repair" && !("cost" in mr[0] && mr[0].cost !== null) && mr[0].vendorId === null && AR.assetEvents(ADMIN, "AST-0099").at(-1).kind === "maintenance-opened");
check("H4", "an asset with no history but a 'since' date (AST-0119) is issued on that date; the available one (AST-0218) is just in store", AR.assetEvents(ADMIN, "AST-0119").map((e) => [e.kind, e.date]).join("|") === "added,|issued,2025-03-03" && AR.assetEvents(ADMIN, "AST-0218").length === 1);
check("H5", "closing the open repair (the register's own rules) brings AST-0099 back to the store; the imported record keeps its words", (() => { const it = makeIt(); const r = AR.closeMaintenance(it, mr[0].id, { date: "2026-11-20", notes: "Battery replaced" }, NOW); return r.ok && AR.getAssetFor(ADMIN, "AST-0099").status === "in-store"; })());

// ---------- C ----------
section("C. Completing the details");
fresh();
const IT = makeIt();
const dateFirst = AR.editAsset(IT, "AST-0119", { purchaseDate: "2025-03-10" }, NOW);
check("C1", "a purchase date after the asset was first used (issued 3 Mar 2025) is refused", !dateFirst.ok && dateFirst.field === "purchaseDate" && /2025-03-03/.test(dateFirst.error));
check("C2", "IT (assets:manage, no values) can add the purchase date but not the price", AR.editAsset(IT, "AST-0119", { purchaseDate: "2025-02-20" }, NOW).ok && !AR.editAsset(IT, "AST-0119", { purchasePrice: 189900 }, NOW).ok && AR.getAssetFor(IT, "AST-0119").purchaseDate === "2025-02-20" && AR.getAssetFor(IT, "AST-0119").detailsMissing);
const priced = AR.editAsset(ADMIN, "AST-0119", { purchasePrice: 189900 }, NOW);
check("C3", "the Admin adds the price: no longer missing; salvage takes the category default (5%: 9,495); depreciation then works", priced.ok && priced.record.salvageValue === 9495 && !priced.record.detailsMissing && AR.depreciationOf(KABIR, "AST-0119", "2026-11-22").ok && AR.depreciationOf(KABIR, "AST-0119", "2026-11-22").bookValue < 189900);
check("C4", "a purchase date can't be changed again once anything has happened to the asset", !AR.editAsset(ADMIN, "AST-0119", { purchaseDate: "2025-02-21" }, NOW).ok);
check("C5", "the price can't go below an existing salvage value; a date in the future or a negative price is refused", !AR.editAsset(ADMIN, "AST-0188", { purchasePrice: -5 }, NOW).ok && AR.editAsset(ADMIN, "AST-0188", { purchaseDate: "2026-11-23" }, NOW).field === "purchaseDate");

// ---------- I ----------
section("I. Idempotent");
fresh();
const a1 = j(IM.buildImport(IM.oldSource())), a2 = j(IM.buildImport(IM.oldSource()));
check("I1", "the builder is pure: twice gives the same bytes", a1 === a2 && a1.length > 5000);
const seedA = j([AR.listAssets(ADMIN), AR.vendorsFor(ADMIN), SL.stockItems(ADMIN), SL.stockMovements(ADMIN)]), seedB = j([AR.listAssets(ADMIN), AR.vendorsFor(ADMIN), SL.stockItems(ADMIN), SL.stockMovements(ADMIN)]);
check("I2", "reading the seed twice gives the same answer, and stores nothing", seedA === seedB && ![...mem.keys()].some((k) => /asset-register|stock-ledger/.test(k)));
const IT2 = makeIt();
const keysAfterStaff = j([...mem.entries()].sort());
const m0 = MG.importOldInventory(IT2, NOW);
check("I3", "importing onto the seed adds nothing, writes nothing and logs nothing (everything is already there)", m0.ok && j(m0.added) === j({ assets: 0, vendors: 0, items: 0, movements: 0 }) && j([...mem.entries()].sort()) === keysAfterStaff && !AU.allEvents().some((e) => e.kind === "inventory-imported"), j(m0));
// onto the AS1 sample (a browser that wrote it before): the old records are added, once
mem.set("officeos:asset-register", FX("register")); mem.set("officeos:stock-ledger", FX("stock"));
const before1 = { reg: JSON.parse(mem.get("officeos:asset-register")), stock: JSON.parse(mem.get("officeos:stock-ledger")) };
const run1 = MG.importOldInventory(IT2, NOW);
const snap1 = j([...mem.entries()].sort());
const audit1 = AU.allEvents().filter((e) => e.kind === "inventory-imported").length;
const run2 = MG.importOldInventory(IT2, NOW);
check("I4", "importing onto the AS1 sample adds the 7 assets, the 3 vendors it lacks (TechNova and FurniCraft match by name), the 8 items it lacks (paper, markers, keyboards, HDMI match by name) and their 8 movements, once", run1.ok && j(run1.added) === j({ assets: 7, vendors: 3, items: 8, movements: 8 }) && audit1 === 1, j(run1));
check("I5", "the second run finds nothing to add, changes not one stored byte, and logs nothing more", run2.ok && j(run2.added) === j({ assets: 0, vendors: 0, items: 0, movements: 0 }) && j([...mem.entries()].sort()) === snap1 && AU.allEvents().filter((e) => e.kind === "inventory-imported").length === 1);
const after = { reg: JSON.parse(mem.get("officeos:asset-register")), stock: JSON.parse(mem.get("officeos:stock-ledger")) };
check("I6", "nothing already there was edited or removed: every record of the AS1 sample is still, byte for byte, where it was", before1.reg.assets.every((a) => j(after.reg.assets.find((x) => x.id === a.id)) === j(a)) && before1.reg.events.every((e) => j(after.reg.events.find((x) => x.id === e.id)) === j(e)) && before1.reg.maintenance.every((m) => j(after.reg.maintenance.find((x) => x.id === m.id)) === j(m)) && before1.reg.vendors.every((v) => j(after.reg.vendors.find((x) => x.id === v.id)) === j(v)) && before1.stock.items.every((i) => j(after.stock.items.find((x) => x.id === i.id)) === j(i)) && before1.stock.movements.every((m) => j(after.stock.movements.find((x) => x.id === m.id)) === j(m)));
check("I7", "the new records have fresh ids after the existing ones (FA-13.., AE-33.., MR-3..), and the import's vendors keep VEN-n", after.reg.assets.slice(12).map((a) => a.id).join() === "FA-13,FA-14,FA-15,FA-16,FA-17,FA-18,FA-19" && after.reg.vendors.filter((v) => v.imported).map((v) => v.id).sort().join() === "VEN-1,VEN-4,VEN-5" && after.reg.events.length === before1.reg.events.length + imp.events.length && new Set(after.reg.events.map((e) => e.id)).size === after.reg.events.length);
check("I8", "an imported asset's events and maintenance point at its new ids; its state is the same as in the seed (AST-0217 held by Sneha, AST-0099 under maintenance)", AR.getAssetFor(ADMIN, "AST-0217").holderId === SNEHA && AR.getAssetFor(ADMIN, "AST-0099").status === "under-maintenance" && AR.maintenanceOf(ADMIN, "AST-0099")[0].assetId === AR.getAssetFor(ADMIN, "AST-0099").id);
check("I9", "only the custodian runs it: HR, Finance, an employee and an Admin-less nobody are refused, and nothing is written", [PRIYA, KABIR, ROHAN, null].every((v) => !MG.importOldInventory(v, NOW).ok) && j([...mem.entries()].sort()) === snap1);

// ---------- O ----------
section("O. The old store is untouched");
fresh();
INV.allAssets();   // the old store seeds itself, as its own pages do
const old0 = oldBytes();
AR.listAssets(ADMIN); SL.stockItems(ADMIN); AR.vendorsFor(ADMIN); IM.oldSource();
const IT3 = makeIt();
MG.importOldInventory(IT3, NOW);
AR.issueAsset(IT3, "AST-0218", { personId: ARJUN, condition: "good" }, NOW);
SL.recordStockMovement(IT3, { itemId: "ITM-5", kind: "out", qty: 2, reason: "Printing" }, NOW);
AR.addVendor(IT3, { name: "Print Hub" }, NOW);
check("O1", "reading, importing and writing the new stores leaves every old key byte for byte as it was", oldBytes() === old0 && old0 !== j([null, null, null, null]));
fresh();
check("O2", "a new browser: the new stores' reads don't create the old keys either", (() => { AR.listAssets(ADMIN); SL.stockItems(ADMIN); AR.vendorsFor(ADMIN); return OLD_KEYS.every((k) => !mem.has(k)); })());
fresh();
INV.assignAsset(ADMIN, "AST-0218", { holderId: ROHAN, date: "2026-11-20", condition: "good" });   // the old store changes (its own function)
const seen = AR.getAssetFor(ADMIN, "AST-0218");
check("O3", "until the new register is first written, its seed follows the old store's saved records: AST-0218 given to Rohan there shows as his here", seen.holderId === ROHAN && seen.since === "2026-11-20" && seen.status === "assigned");
AR.addVendor(makeIt(), { name: "Print Hub" }, NOW);   // the first write stores the register
INV.returnAsset(ADMIN, "AST-0218", { condition: "good", location: "store-a" });
check("O4", "after that it is the new register's own: a later change in the old store doesn't move it", AR.getAssetFor(ADMIN, "AST-0218").holderId === ROHAN);

// ---------- V ----------
section("V. Who sees the imported data");
fresh();
const noValues = (v) => !/purchasePrice|salvageValue|bookValue|annualCharge|costPerYear/.test(j(v));
check("V1", "an employee sees only what was issued to them (Arjun: AST-0188, AST-0302, AST-0455), no holder of anything else, no values; Rohan: AST-0119 now and AST-0010 (the retired laptop he handed back)", j(AR.listAssets(ARJUN).map((a) => a.tag)) === j(["AST-0188", "AST-0302", "AST-0455"]) && j(AR.listAssets(ROHAN).map((a) => a.tag)) === j(["AST-0010", "AST-0119"]) && noValues(AR.listAssets(ARJUN)));
check("V2", "a manager (Sneha, who manages Rohan and Arjun) sees her own laptop only, and none of the team's", j(AR.listAssets(SNEHA).map((a) => a.tag)) === j(["AST-0217"]) && AR.getAssetFor(SNEHA, "AST-0119") === null && AR.getAssetFor(SNEHA, "AST-0188") === null);
check("V3", "HR reads every asset with no values; Finance and the Admin carry the (empty) value fields; the 'details missing' flag is visible to all of them", AR.listAssets(PRIYA).length === 10 && noValues(AR.listAssets(PRIYA)) && AR.listAssets(PRIYA).filter((a) => a.detailsMissing).length === 7 && "purchasePrice" in AR.listAssets(KABIR)[0]);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);