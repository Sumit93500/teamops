// usage: node assetdata.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// AS1: the assets and inventory data layer (data/stock-ledger.js, data/asset-register.js, data/depreciation.js, data/asset-rules.js): stock, the asset lifecycle, depreciation, maintenance, vendors, who sees what
//   X  nothing older moved: reading the new data writes nothing; the old inventory, users, offices and audit read the same before and after
//   S  the stock ledger: derived quantity, signs, below zero (also back-dated), returns above what was issued, corrections, low stock
//   L  the lifecycle: every allowed move, every refused one, leavers, dates, one holder, an append-only history
//   D  depreciation against hand-worked tables: day count, pro-rata, 29 Feb, before purchase, same day, life 1, salvage 0 and = cost, wdv 0 / 100, rounding, large prices, disposal
//   V  who sees what: every read function for every role; values never reach anyone without assets:view-values; own rows only; no manager access
//   P  permissions: the nine new ones, the counts, not overridable, escalation refused
//   A  the audit trail: one event per write, the right kind and ids, never an amount; nothing for a refused write
//   M  maintenance, warranty, vendors: open and close tied to the state, next service after the date, overdue, expiring, delete refused while named
//   T  tags and serials: AST-0013, edited once, unique
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const clock = (date, hm = "10:00") => { const [y, m, d] = date.split("-").map(Number); const [h, mi] = hm.split(":").map(Number); NOW = RealDate.UTC(y, m - 1, d, h, mi) - 330 * 60000; };
clock("2026-11-22");

// The older stores first, read before the new modules are even loaded (X).
const S = await import("./js/data/store.js");
const INV = await import("./js/data/inventory-store.js");
const OFF = await import("./js/data/offices-store.js");
const AU = await import("./js/data/audit-trail.js");
const RO = await import("./js/config/roles.js");
const PE = await import("./js/config/permissions.js");
const oldReads = () => JSON.stringify({ items: INV.allItems(), moves: INV.allMovements(), assets: INV.allAssets(), vendors: INV.allVendors(), users: S.getAllUsers(), offices: OFF.getOffices({ includeInactive: true }), audit: AU.allEvents() });
const before = oldReads();
const keysBefore = JSON.stringify([...mem.keys()].sort());
const storedBefore = JSON.stringify([...mem.entries()].sort());

const DEP = await import("./js/data/depreciation.js");
const RU = await import("./js/data/asset-rules.js");
const SL = await import("./js/data/stock-ledger.js");
const AR = await import("./js/data/asset-register.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(6)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 300)}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const ADMIN = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029", ROHAN = "EMP-1042", DIVYA = "EMP-1061", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const EVERYONE = [ADMIN, PRIYA, KABIR, ANANYA, MEERA, SNEHA, ROHAN, DIVYA, VIKRAM, ARJUN];
const fresh = () => { mem.clear(); clock("2026-11-22"); };
const p = (rupees) => Math.round(rupees * 100);   // compare money in paise
const events = () => AU.allEvents().length;
const lastEvent = () => AU.allEvents()[0];
// Every key anywhere in a value (objects and arrays, nested).
const keysIn = (v, out = new Set()) => { if (Array.isArray(v)) v.forEach((x) => keysIn(x, out)); else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { out.add(k); keysIn(x, out); } return out; };
const MONEY_KEYS = ["purchasePrice", "salvageValue", "usefulLifeYears", "depreciationMethod", "wdvRatePercent", "cost", "saleValue", "bookValueAtDisposal", "gainOrLoss", "accumulated", "bookValue", "annualCharge"];
const noValues = (v) => MONEY_KEYS.every((k) => !keysIn(v).has(k));
const asset = (who, tag) => AR.getAssetFor(who, tag);

// ---------- X ----------
section("X. Nothing older moved");
const readAllNew = () => [
  ...EVERYONE.flatMap((v) => [SL.stockItems(v), SL.stockMovements(v), SL.lowStock(v), SL.issuedTo(v, v), SL.onHand(v, "SI-1"), AR.listAssets(v), AR.assignmentsOf(v, v), AR.vendorsFor(v),
    AR.depreciationDefaults(v), AR.overdueService(v), AR.warrantyExpiring(v, 90), AR.assetsNotReturned(v), ...["FA-1", "FA-11"].flatMap((a) => [AR.getAssetFor(v, a), AR.assignmentHistory(v, a), AR.assetEvents(v, a), AR.maintenanceOf(v, a), AR.depreciationOf(v, a, "2026-11-22", { schedule: true })])]),
];
const firstRead = j(readAllNew());
check("X1", "reading every new list as every person stores nothing (no new key, nothing changed)", j([...mem.keys()].sort()) === keysBefore && j([...mem.entries()].sort()) === storedBefore, j([...mem.keys()]));
check("X2", "the old inventory (items, ledger, assets, vendors), the people, the offices and the audit trail read exactly as before", oldReads() === before);
check("X3", "reading twice gives the same answer (the sample is read, never re-made differently)", j(readAllNew()) === firstRead);
check("X4", "every sample record is marked sample", SL.stockItems(ADMIN).every((i) => i.sample) && SL.stockMovements(ADMIN).every((m) => m.sample) && AR.listAssets(ADMIN).every((a) => a.sample) && AR.vendorsFor(ADMIN).every((v) => v.sample) && ["FA-4", "FA-9"].every((a) => AR.maintenanceOf(ADMIN, a).every((r) => r.sample)));
check("X5", "the sample's size: 6 stock items, 13 movements, 12 assets, 2 vendors, 2 maintenance records", SL.stockItems(ADMIN).length === 6 && SL.stockMovements(ADMIN).length === 13 && AR.listAssets(ADMIN).length === 12 && AR.vendorsFor(ADMIN).length === 2 && AR.listAssets(ADMIN).flatMap((a) => AR.maintenanceOf(ADMIN, a.id)).length === 2);
check("X6", "the sample's states: 6 assigned, 3 in store, 1 under maintenance, 1 retired, 1 disposed", j(["assigned", "in-store", "under-maintenance", "retired", "disposed"].map((s) => AR.listAssets(ADMIN, { status: s }).length)) === j([6, 3, 1, 1, 1]), j(["assigned", "in-store", "under-maintenance", "retired", "disposed"].map((s) => AR.listAssets(ADMIN, { status: s }).length)));
// a write to the new stores leaves the old ones alone
SL.recordStockMovement(ADMIN, { itemId: "SI-1", kind: "out", qty: 5, toPersonId: ROHAN, reason: "Printing" }, NOW);
AR.returnAsset(ADMIN, "AST-0001", { condition: "good" }, NOW);
const oldAfter = JSON.parse(oldReads());
const oldBefore = JSON.parse(before);
check("X7", "after writes to the new ledger and register, the old site's items, ledger, assets and vendors are unchanged", j([oldAfter.items, oldAfter.moves, oldAfter.assets, oldAfter.vendors]) === j([oldBefore.items, oldBefore.moves, oldBefore.assets, oldBefore.vendors]));
check("X8", "the new data lives under its own two keys only", [...mem.keys()].filter((k) => !JSON.parse(keysBefore).includes(k)).sort().join() === "officeos:asset-register,officeos:audit-trail,officeos:stock-ledger", j([...mem.keys()]));

// ---------- S ----------
section("S. The stock ledger");
fresh();
const item = (id) => SL.getStockItem(ADMIN, id);
const sumOf = (id) => SL.stockMovements(ADMIN, { itemId: id }).reduce((s, m) => s + RU.STOCK_KINDS[m.kind].sign * p(m.qty), 0) / 100;
check("S1", "the sample's quantities on hand: paper 160, markers 60, coffee 5.5 kg, HDMI 22, keyboards 7, chargers 4", j(["SI-1", "SI-2", "SI-3", "SI-4", "SI-5", "SI-6"].map((i) => item(i).onHand)) === j([160, 60, 5.5, 22, 7, 4]), j(["SI-1", "SI-2", "SI-3", "SI-4", "SI-5", "SI-6"].map((i) => item(i).onHand)));
check("S2", "on hand is the sum of the movements (in and return add, out and remove take away), for every item", SL.stockItems(ADMIN).every((i) => i.onHand === sumOf(i.id)));
check("S3", "low stock: at or under the reorder level, emptiest first: coffee (5.5 of 10), keyboards (7 of 10), chargers (4 of 5)", j(SL.lowStock(ADMIN).map((i) => i.id)) === j(["SI-3", "SI-5", "SI-6"]), j(SL.lowStock(ADMIN).map((i) => [i.id, i.onHand])));
const mv = (fields, who = ADMIN) => SL.recordStockMovement(who, { reason: "Test movement", ...fields }, NOW);
const r1 = mv({ itemId: "SI-2", kind: "in", qty: 10 }), r2 = mv({ itemId: "SI-2", kind: "out", qty: 4, toPersonId: ANANYA }), r3 = mv({ itemId: "SI-2", kind: "return", qty: 1, toPersonId: ANANYA }), r4 = mv({ itemId: "SI-2", kind: "remove", qty: 2 });
check("S4", "in +10, out -4, return +1, remove -2: markers 60 -> 65, each step on the ledger with its sign", r1.ok && r2.ok && r3.ok && r4.ok && item("SI-2").onHand === 65 && sumOf("SI-2") === 65, j([r1, r2, r3, r4].map((r) => r.error ?? r.record.id)));
check("S5", "at reorder level exactly is low: write off markers to 30", mv({ itemId: "SI-2", kind: "remove", qty: 35 }).ok && item("SI-2").onHand === 30 && SL.lowStock(ADMIN).some((i) => i.id === "SI-2"));
const over = mv({ itemId: "SI-6", kind: "out", qty: 5, toPersonId: ROHAN });
check("S6", "an issue of more than is on hand is refused, saying so; nothing is added", !over.ok && /below zero/.test(over.error) && item("SI-6").onHand === 4, over.error);
check("S7", "a write-off of more than is on hand is refused", !mv({ itemId: "SI-6", kind: "remove", qty: 4.01 }).ok && mv({ itemId: "SI-6", kind: "remove", qty: 0.5 }).ok && item("SI-6").onHand === 3.5);
const backdated = mv({ itemId: "SI-3", kind: "out", qty: 6, date: "2026-10-21" });   // coffee: 12 in on 1 Oct, 6.5 out on 20 Oct: 5.5 left on 21 Oct
check("S8", "a back-dated issue that would take a past day below zero is refused (coffee had 5.5 kg on 21 Oct)", !backdated.ok && /21|2026-10/.test(backdated.error) && item("SI-3").onHand === 5.5, backdated.error);
const late = mv({ itemId: "SI-3", kind: "out", qty: 5, date: "2026-10-10" });   // 12 then, but taking 5 on 10 Oct leaves 7 before the 6.5 on 20 Oct: 0.5, fine
check("S9", "a back-dated issue that keeps every day at or above zero is taken (5 kg on 10 Oct: 0.5 left after 20 Oct)", late.ok && item("SI-3").onHand === 0.5);
const before12 = mv({ itemId: "SI-1", kind: "out", qty: 130, date: "2026-11-01", toPersonId: ROHAN });   // paper: 110 on 1 Nov; the 50 came on 12 Nov
check("S9b", "the check is in date order, not the order typed: 130 reams on 1 Nov is refused (110 then), though 160 are on hand now", !before12.ok && item("SI-1").onHand === 160 && mv({ itemId: "SI-1", kind: "out", qty: 130, date: "2026-11-12", toPersonId: ROHAN }).ok && item("SI-1").onHand === 30, before12.error);
mv({ itemId: "SI-1", kind: "return", qty: 130, toPersonId: ROHAN });
const tooMuch = mv({ itemId: "SI-5", kind: "return", qty: 2, toPersonId: ROHAN });   // Rohan: 2 out, 1 back: holds 1
check("S10", "a return of more than the person holds, net, is refused (Rohan holds 1 keyboard)", !tooMuch.ok && /more than was issued/.test(tooMuch.error) && mv({ itemId: "SI-5", kind: "return", qty: 1, toPersonId: ROHAN }).ok && j(SL.issuedTo(ADMIN, ROHAN).map((x) => [x.itemId, x.qty])) === j([]), tooMuch.error);
check("S11", "a return from someone never issued it is refused; a return names who handed it back", !mv({ itemId: "SI-5", kind: "return", qty: 1, toPersonId: ARJUN }).ok && mv({ itemId: "SI-5", kind: "return", qty: 1 }).field === "toPersonId");
check("S12", "issuing to someone who has left is refused; issuing with nobody named (a pantry refill) is fine", mv({ itemId: "SI-1", kind: "out", qty: 1, toPersonId: DIVYA }).field === "toPersonId" && mv({ itemId: "SI-1", kind: "out", qty: 1 }).ok);
check("S13", "stock in or a write-off can't name a person", mv({ itemId: "SI-1", kind: "in", qty: 1, toPersonId: ROHAN }).field === "toPersonId" && mv({ itemId: "SI-1", kind: "remove", qty: 1, toPersonId: ROHAN }).field === "toPersonId");
check("S14", "quantities: more than 0, at most 2 decimals, up to 1,000,000; 0, -1, 1.005, 'abc' and 1,000,001 are refused", [0, -1, 1.005, "abc", 1000001, NaN, null].every((q) => mv({ itemId: "SI-1", kind: "in", qty: q }).field === "qty") && mv({ itemId: "SI-1", kind: "in", qty: "2.25" }).ok);
check("S15", "the reason is required, 3 to 200 characters, no HTML", mv({ itemId: "SI-1", kind: "in", qty: 1, reason: "" }).field === "reason" && mv({ itemId: "SI-1", kind: "in", qty: 1, reason: "ab" }).field === "reason" && mv({ itemId: "SI-1", kind: "in", qty: 1, reason: "x".repeat(201) }).field === "reason" && mv({ itemId: "SI-1", kind: "in", qty: 1, reason: "<b>bold</b>" }).field === "reason");
check("S16", "dates: not in the future, a real day, not before 1990", mv({ itemId: "SI-1", kind: "in", qty: 1, date: "2026-11-23" }).field === "date" && mv({ itemId: "SI-1", kind: "in", qty: 1, date: "2026-02-30" }).field === "date" && mv({ itemId: "SI-1", kind: "in", qty: 1, date: "1989-12-31" }).field === "date" && mv({ itemId: "SI-1", kind: "in", qty: 1, date: "2026-11-22" }).ok);
check("S17", "an unknown kind or item is refused", mv({ itemId: "SI-1", kind: "adjustment", qty: 1 }).field === "kind" && mv({ itemId: "SI-99", kind: "in", qty: 1 }).field === "itemId");
// corrections
fresh();
const wrongIn = mv({ itemId: "SI-4", kind: "in", qty: 100, reason: "Typed 100 for 10" }).record;
const rev = SL.reverseStockMovement(ADMIN, wrongIn.id, { reason: "Typed 100 for 10" }, NOW);
check("S18", "a wrong stock-in is corrected by a write-off of the same quantity, naming it; HDMI back to 22", rev.ok && rev.record.kind === "remove" && rev.record.qty === 100 && rev.record.reverses === wrongIn.id && item("SI-4").onHand === 22);
check("S19", "a movement is reversed once only, and a correction isn't reversed", !SL.reverseStockMovement(ADMIN, wrongIn.id, { reason: "again" }, NOW).ok && !SL.reverseStockMovement(ADMIN, rev.record.id, { reason: "undo" }, NOW).ok);
const issue = mv({ itemId: "SI-1", kind: "out", qty: 3, toPersonId: SNEHA }).record;
const revIssue = SL.reverseStockMovement(ADMIN, issue.id, { reason: "Issued to the wrong person" }, NOW);
const refill = SL.stockMovements(ADMIN, { itemId: "SI-3" }).find((m) => m.id === "SM-9");
const revRefill = SL.reverseStockMovement(ADMIN, "SM-9", { reason: "Never left the store" }, NOW);
check("S20", "a wrong issue comes back as a return by the same person; one that named nobody comes back as stock in", revIssue.ok && revIssue.record.kind === "return" && revIssue.record.toPersonId === SNEHA && revRefill.ok && revRefill.record.kind === "in" && revRefill.record.qty === refill.qty && item("SI-3").onHand === 12);
const inUse = mv({ itemId: "SI-6", kind: "in", qty: 1 }).record;   // then issue all 5 and reverse the stock-in: below zero
mv({ itemId: "SI-6", kind: "out", qty: 5, toPersonId: ROHAN });
check("S21", "a correction that would take stock below zero is refused like any movement", !SL.reverseStockMovement(ADMIN, inUse.id, { reason: "was a mistake" }, NOW).ok && item("SI-6").onHand === 0);
check("S22", "nothing edits or deletes a movement: the module has no such function, and a returned record is a copy", !Object.keys(SL).some((k) => /delete|remove|edit|update.*Movement/i.test(k) && !/resetStockData|updateStockItem/.test(k)) && (() => { const m = SL.stockMovements(ADMIN)[0]; m.qty = 999; return SL.stockMovements(ADMIN)[0].qty !== 999; })());
// items
const added = SL.addStockItem(ADMIN, { name: "Sticky notes", category: "stationery", unit: "pack", reorderLevel: 5 }, NOW);
check("S23", "an item is added with no stock (SI-7, on hand 0, so it is low at once)", added.ok && added.record.id === "SI-7" && added.record.onHand === 0 && SL.lowStock(ADMIN).some((i) => i.id === "SI-7"));
check("S24", "item names are unique (any case), no HTML; the category is the old site's four", !SL.addStockItem(ADMIN, { name: "sticky NOTES", category: "stationery", unit: "pack" }, NOW).ok && SL.addStockItem(ADMIN, { name: "<i>x</i>", category: "stationery", unit: "pack" }, NOW).field === "name" && SL.addStockItem(ADMIN, { name: "Tea", category: "drinks", unit: "box" }, NOW).field === "category");
const off = SL.updateStockItem(ADMIN, "SI-7", { active: false }, NOW);
check("S25", "an item no longer in use takes no new stock or issue, and leaves the low-stock list; a write-off or return still can", off.ok && mv({ itemId: "SI-7", kind: "in", qty: 1 }).field === "itemId" && !SL.lowStock(ADMIN).some((i) => i.id === "SI-7"));
check("S26", "an item's change names only its own fields (an id, onHand or a sample flag is refused)", !SL.updateStockItem(ADMIN, "SI-1", { onHand: 999 }, NOW).ok && !SL.updateStockItem(ADMIN, "SI-1", { id: "SI-9" }, NOW).ok && item("SI-1").onHand === 160 - 3 + 3);
check("S27", "on a date: paper on 30 Sep 0, on 1 Oct 120, on 6 Oct 110 (the end of each day)", SL.onHand(ADMIN, "SI-1", "2026-09-30") === 0 && SL.onHand(ADMIN, "SI-1", "2026-10-01") === 120 && SL.onHand(ADMIN, "SI-1", "2026-10-06") === 110);

// ---------- L ----------
section("L. The asset lifecycle");
fresh();
const st = (tag) => asset(ADMIN, tag).status;
const iss = (tag, personId, extra = {}) => AR.issueAsset(ADMIN, tag, { personId, condition: "good", ...extra }, NOW);
const ret = (tag, extra = {}) => AR.returnAsset(ADMIN, tag, { condition: "good", ...extra }, NOW);
check("L1", "the moves allowed: in store -> assigned, maintenance, retired; assigned -> in store; maintenance -> in store; retired -> disposed; disposed: none",
  j(RU.TRANSITIONS) === j({ "in-store": ["assigned", "under-maintenance", "retired"], assigned: ["in-store"], "under-maintenance": ["in-store"], retired: ["disposed"], disposed: [] }));
const issueAssigned = iss("AST-0001", ROHAN);
check("L2", "issuing an asset that is already issued is refused (AST-0001 is Sneha's)", !issueAssigned.ok && /assigned/.test(issueAssigned.error) && asset(ADMIN, "AST-0001").holderId === SNEHA, issueAssigned.error);
check("L3", "issuing one under maintenance (AST-0004) or retired (AST-0010) or disposed (AST-0011) is refused", !iss("AST-0004", ROHAN).ok && !iss("AST-0010", ROHAN).ok && !iss("AST-0011", ROHAN).ok && st("AST-0004") === "under-maintenance" && st("AST-0010") === "retired");
const dispAssigned = AR.disposeAsset(ADMIN, "AST-0001", { reason: "Lost" }, NOW);
check("L4", "disposing of an issued asset is refused (retire it first), and so is disposing of one in the store", !dispAssigned.ok && /retire it/.test(dispAssigned.error) && !AR.disposeAsset(ADMIN, "AST-0008", { reason: "Broken" }, NOW).ok && st("AST-0008") === "in-store", dispAssigned.error);
check("L5", "retiring an issued asset, or one under maintenance, is refused", !AR.retireAsset(ADMIN, "AST-0001", { reason: "Old" }, NOW).ok && !AR.retireAsset(ADMIN, "AST-0004", { reason: "Old" }, NOW).ok);
check("L6", "an issued asset goes for maintenance only after it is handed back", !AR.openMaintenance(ADMIN, "AST-0001", { issue: "Keyboard" }, NOW).ok);
check("L7", "an asset can't be issued to someone who has left (Divya, inactive), or to nobody", iss("AST-0008", DIVYA).field === "personId" && iss("AST-0008", "").field === "personId" && iss("AST-0008", "EMP-9999").field === "personId" && st("AST-0008") === "in-store");
S.deactivateUser(ADMIN, ANANYA, "2026-11-20");
check("L8", "...nor to someone deactivated with a last working day; their phone is now 'not returned' with that exit date", iss("AST-0008", ANANYA).field === "personId" && AR.assetsNotReturned(ADMIN, { personId: ANANYA }).map((x) => [x.asset.tag, x.exitDate]).join() === "AST-0005,2026-11-20");
check("L9", "a return from someone who has left is taken (Ananya's phone back)", ret("AST-0005", { condition: "fair" }).ok && st("AST-0005") === "in-store" && AR.assetsNotReturned(ADMIN, { personId: ANANYA }).length === 0);
const hist0 = j(AR.assetEvents(ADMIN, "AST-0008"));
const i1 = iss("AST-0008", ROHAN, { date: "2026-11-20", notes: "Second chair" });
check("L10", "an asset in the store is issued: status assigned, holder, since, the row in the history", i1.ok && i1.record.status === "assigned" && i1.record.holderId === ROHAN && i1.record.since === "2026-11-20" && AR.assignmentHistory(ADMIN, "AST-0008").length === 1);
check("L11", "one holder at a time: issuing it again is refused until it is handed back", !iss("AST-0008", ARJUN).ok && asset(ADMIN, "AST-0008").holderId === ROHAN);
check("L12", "a return can't be dated before the issue, or in the future", ret("AST-0008", { date: "2026-11-19" }).field === "date" && ret("AST-0008", { date: "2026-11-23" }).field === "date");
const r8 = ret("AST-0008", { date: "2026-11-21", condition: "poor", notes: "Armrest loose" });
const i2 = iss("AST-0008", ARJUN, { date: "2026-11-22", condition: "poor" });
const rows8 = AR.assignmentHistory(ADMIN, "AST-0008");
check("L13", "the history: who, from, to, issued by, returned to, condition at issue and return, notes", r8.ok && i2.ok && j(rows8.map((r) => [r.personId, r.from, r.to, r.issuedBy, r.returnedTo, r.conditionAtIssue, r.conditionAtReturn, r.notes, r.returnNotes])) ===
  j([[ROHAN, "2026-11-20", "2026-11-21", ADMIN, ADMIN, "good", "poor", "Second chair", "Armrest loose"], [ARJUN, "2026-11-22", null, ADMIN, null, "poor", null, "", null]]), j(rows8));
const hist1 = AR.assetEvents(ADMIN, "AST-0008");
check("L14", "the history only grows: what was there before is still there, unchanged, first", j(hist1.slice(0, JSON.parse(hist0).length)) === hist0 && hist1.length === JSON.parse(hist0).length + 3);
check("L15", "a person's history across assets, newest first: the chair AST-0008 (now), the chair AST-0007 (since 2024), the old laptop AST-0004 (returned 28 Oct)", j(AR.assignmentsOf(ADMIN, ARJUN).map((r) => [r.tag, r.to])) === j([["AST-0008", null], ["AST-0007", null], ["AST-0004", "2026-10-28"]]), j(AR.assignmentsOf(ADMIN, ARJUN).map((r) => [r.tag, r.from, r.to])));
check("L16", "nothing edits or deletes the history: no such function, and a returned row is a copy", !Object.keys(AR).some((k) => /^(edit|update|delete|remove|set|change)/i.test(k) && /history|event|assignment/i.test(k)) && (() => { const r = AR.assignmentHistory(ADMIN, "AST-0008"); r[0].personId = ADMIN; return AR.assignmentHistory(ADMIN, "AST-0008")[0].personId === ROHAN; })());
check("L17", "an event can't be dated before the asset's last one (AST-0008's last is today)", AR.retireAsset(ADMIN, "AST-0003", { reason: "Old", date: "2026-09-13" }, NOW).field === "date");
const ret3 = AR.retireAsset(ADMIN, "AST-0003", { reason: "Hinge broken", date: "2026-11-01" }, NOW);
const disp3 = AR.disposeAsset(ADMIN, "AST-0003", { reason: "Sold to staff", date: "2026-10-31", saleValue: 20000 }, NOW);
check("L18", "in store -> retired -> disposed; a disposal can't be dated before the retirement", ret3.ok && ret3.record.status === "retired" && disp3.field === "date" && AR.disposeAsset(ADMIN, "AST-0003", { reason: "Sold to staff", date: "2026-11-15", saleValue: 20000 }, NOW).ok && st("AST-0003") === "disposed");
check("L19", "a disposed asset is final: no issue, retire, maintenance or edit", !iss("AST-0003", ROHAN).ok && !AR.retireAsset(ADMIN, "AST-0003", { reason: "x x" }, NOW).ok && !AR.openMaintenance(ADMIN, "AST-0003", { issue: "Fix it" }, NOW).ok && !AR.editAsset(ADMIN, "AST-0003", { name: "New name" }, NOW).ok);
check("L20", "the state is read from the history, never stored on the asset", !("status" in JSON.parse(mem.get("officeos:asset-register")).assets[0]) && !("holderId" in JSON.parse(mem.get("officeos:asset-register")).assets[0]));
check("L21", "add an asset: in store, the category's default depreciation, salvage 5% to the paisa", (() => { const r = AR.addAsset(ADMIN, { name: "ThinkPad E14", category: "laptop", purchaseDate: "2026-11-01", purchasePrice: 65432.10, locationId: "OFF-1" }, NOW); return r.ok && r.record.status === "in-store" && r.record.depreciationMethod === "slm" && r.record.usefulLifeYears === 3 && r.record.salvageValue === 3271.61; })());
check("L22", "an asset's purchase date can't be in the future, its price can't be negative or have 3 decimals, its office must exist", ["2026-11-23", "2026-13-01", ""].every((d) => AR.addAsset(ADMIN, { name: "X1", category: "laptop", purchaseDate: d, purchasePrice: 1, locationId: "OFF-1" }, NOW).field === "purchaseDate")
  && [-1, 1.005, "1e3", 100000000001].every((v) => AR.addAsset(ADMIN, { name: "X1", category: "laptop", purchaseDate: "2026-11-01", purchasePrice: v, locationId: "OFF-1" }, NOW).field === "purchasePrice") && AR.addAsset(ADMIN, { name: "X1", category: "laptop", purchaseDate: "2026-11-01", purchasePrice: 1, locationId: "OFF-9" }, NOW).field === "locationId");
check("L23", "names and text never take HTML; the warranty can't end before the purchase", AR.addAsset(ADMIN, { name: "<script>x</script>", category: "laptop", purchaseDate: "2026-11-01", purchasePrice: 1, locationId: "OFF-1" }, NOW).field === "name" && AR.addAsset(ADMIN, { name: "Phone", category: "phone", purchaseDate: "2026-11-01", purchasePrice: 1, locationId: "OFF-1", warrantyUntil: "2026-10-31" }, NOW).field === "warrantyUntil");
check("L24", "the purchase date can't move once anything has happened to the asset", AR.editAsset(ADMIN, "AST-0001", { purchaseDate: "2025-04-01" }, NOW).field === "purchaseDate" && AR.editAsset(ADMIN, "AST-0013", { purchaseDate: "2026-10-30" }, NOW).ok);

// ---------- D ----------
section("D. Depreciation against hand-worked tables");
const dep = (params, asOf, opts) => DEP.depreciation(params, asOf, opts);
const base = { cost: 100000, salvage: 10000, purchaseDate: "2025-04-01", method: "slm", usefulLifeYears: 3 };
// Hand table: (100,000 - 10,000) / 3 = 30,000 a year; year 1 (1 Apr 2025 - 31 Mar 2026) has 365 days: 82.1918 a day.
const table = [["2025-03-31", 0, 100000], ["2025-04-01", 82.19, 99917.81], ["2025-04-02", 164.38, 99835.62], ["2025-04-03", 246.58, 99753.42], ["2025-09-30", 15041.10, 84958.90], ["2026-03-31", 30000, 70000], ["2026-04-01", 30082.19, 69917.81], ["2027-03-31", 60000, 40000], ["2028-03-31", 90000, 10000], ["2030-01-01", 90000, 10000]];
check("D1", "straight line, hand table (cost 1,00,000, salvage 10,000, 3 years from 1 Apr 2025): 0 / 82.19 / 164.38 / 246.58 / 15,041.10 / 30,000 / 30,082.19 / 60,000 / 90,000 / 90,000", table.every(([d, a, b]) => { const r = dep(base, d); return p(r.accumulated) === p(a) && p(r.bookValue) === p(b); }), j(table.map(([d]) => dep(base, d).accumulated)));
check("D2", "the day count: the purchase day counts (one day's charge on it), each life year's own days (365 here); 183 days to 30 Sep = 30,000 x 183/365", p(dep(base, "2025-04-01").accumulated) === p(30000 / 365) && p(dep(base, "2025-09-30").accumulated) === Math.round(3000000 * 183 / 365));
check("D3", "before the purchase date: nothing taken, book value = cost, annual charge 0, not fully depreciated", (() => { const r = dep(base, "2024-01-01"); return r.accumulated === 0 && r.bookValue === 100000 && r.annualCharge === 0 && !r.fullyDepreciated; })());
check("D4", "the annual charge 30,000 while depreciating; 0 after the last life year; fully depreciated on 31 Mar 2028 and after, never below salvage", dep(base, "2026-07-01").annualCharge === 30000 && dep(base, "2028-04-01").annualCharge === 0 && dep(base, "2028-03-31").fullyDepreciated && !dep(base, "2028-03-30").fullyDepreciated && dep(base, "2028-03-30").fullyDepreciatedOn === "2028-03-31" && dep(base, "2099-12-31").bookValue === 10000);
const leap = { cost: 36600, salvage: 0, purchaseDate: "2024-02-29", method: "slm", usefulLifeYears: 2 };
// 18,300 a year. Year 1: 29 Feb 2024 - 28 Feb 2025, 366 days (50.00 a day); year 2: 1 Mar 2025 - 28 Feb 2026, 365 days (50.1370 a day).
check("D5", "29 Feb: year 1 runs to 28 Feb 2025 (366 days: 50.00 a day; 1,600 by 31 Mar), the anniversary is 1 Mar, year 2 runs to 28 Feb 2026 (365 days: 18,350.14 on 1 Mar)", p(dep(leap, "2024-02-29").accumulated) === 5000 && p(dep(leap, "2024-03-31").accumulated) === 160000 && p(dep(leap, "2025-02-28").accumulated) === 1830000 && p(dep(leap, "2025-03-01").accumulated) === Math.round(1830000 + 1830000 / 365) && dep(leap, "2026-02-28").fullyDepreciated && !dep(leap, "2026-02-27").fullyDepreciated, j(["2024-02-29", "2024-03-31", "2025-02-28", "2025-03-01"].map((d) => dep(leap, d).accumulated)));
const leapYears = dep(leap, "2024-02-29", { schedule: true }).schedule.years;
check("D6", "29 Feb's schedule: years 29 Feb 2024 - 28 Feb 2025 and 1 Mar 2025 - 28 Feb 2026, 18,300 each", j(leapYears.map((y) => [y.from, y.to, y.charge])) === j([["2024-02-29", "2025-02-28", 18300], ["2025-03-01", "2026-02-28", 18300]]), j(leapYears.map((y) => [y.from, y.to, y.charge])));
const span = { cost: 36600, salvage: 0, purchaseDate: "2023-06-01", method: "slm", usefulLifeYears: 1 };
check("D7", "a life year with 29 Feb in it has 366 days (1 Jun 2023 - 31 May 2024): 100.00 a day; life of 1 year: fully on 31 May 2024", p(dep(span, "2023-06-01").accumulated) === 10000 && dep(span, "2024-05-31").fullyDepreciated && dep(span, "2024-05-31").fullyDepreciatedOn === "2024-05-31" && p(dep(span, "2024-05-30").accumulated) === 3650000);
check("D8", "the same day: on the purchase date one day's charge (82.19), not 0 and not 2 days", p(dep(base, base.purchaseDate).accumulated) === 8219);
check("D9", "salvage 0: written down to 0.00 at the end; salvage = cost: nothing to take, book value = cost, annual 0, fully depreciated from the purchase date",
  dep({ ...base, salvage: 0 }, "2028-03-31").bookValue === 0 && (() => { const r = dep({ ...base, salvage: 100000 }, "2026-01-01"); return r.accumulated === 0 && r.bookValue === 100000 && r.annualCharge === 0 && r.fullyDepreciated && r.fullyDepreciatedOn === "2025-04-01"; })());
const wdv = { cost: 100000, salvage: 0, purchaseDate: "2025-04-01", method: "wdv", usefulLifeYears: 5, wdvRatePercent: 40 };
// Hand table at 40%: year 1 40,000 (to 60,000), year 2 24,000 (to 36,000), year 3 14,400 (to 21,600); 30 Sep 2025 is day 183 of 365: 40,000 x 183/365 = 20,054.79.
const wy = dep(wdv, "2025-04-01", { schedule: true }).schedule.years.slice(0, 3).map((y) => [y.opening, y.charge, y.closing]);
check("D10", "written-down value at 40%, hand table: 1,00,000 -> 60,000 -> 36,000 -> 21,600 (40,000, 24,000, 14,400); 20,054.79 by 30 Sep 2025", j(wy) === j([[100000, 40000, 60000], [60000, 24000, 36000], [36000, 14400, 21600]]) && p(dep(wdv, "2025-09-30").accumulated) === 2005479 && dep(wdv, "2026-03-31").bookValue === 60000 && dep(wdv, "2026-06-01").annualCharge === 24000, j(wy));
const wdvFloor = { cost: 100000, salvage: 25000, purchaseDate: "2025-04-01", method: "wdv", usefulLifeYears: 5, wdvRatePercent: 40 };
// 36,000 at the start of year 3 (1 Apr 2027 - 31 Mar 2028: 366 days, 29 Feb 2028 is in it); 14,400 a year would go to 21,600, below 25,000:
// it stops at 25,000 on the first day d with 36,000 - 14,400 d / 366 <= 25,000: d >= 279.58, so day 280 (5 Jan 2028). On day 279: 36,000 - 10,977.05 = 25,022.95.
check("D11", "written-down value never goes below salvage: stops at 25,000 on 5 Jan 2028 (day 280 of year 3's 366; 25,022.95 the day before), nothing after", dep(wdvFloor, "2030-01-01").bookValue === 25000 && dep(wdvFloor, "2028-01-04").bookValue === 25022.95 && dep(wdvFloor, "2028-01-05").fullyDepreciatedOn === "2028-01-05" && dep(wdvFloor, "2029-01-01").annualCharge === 0, j([dep(wdvFloor, "2028-01-04").bookValue, dep(wdvFloor, "2028-01-04").fullyDepreciatedOn]));
check("D12", "rate 0: nothing is ever taken, never fully depreciated", (() => { const r = dep({ ...wdv, wdvRatePercent: 0, salvage: 100 }, "2060-01-01"); return r.accumulated === 0 && r.bookValue === 100000 && !r.fullyDepreciated && r.annualCharge === 0 && r.fullyDepreciatedOn === null; })());
const hundred = { cost: 36500, salvage: 3650, purchaseDate: "2025-01-01", method: "wdv", usefulLifeYears: 1, wdvRatePercent: 100 };
// 100%: 36,500 over year 1, 100.00 a day; it reaches 3,650 after 328.5 days: on day 329 (25 Nov 2025).
check("D13", "rate 100: all of it in year 1, 100.00 a day, stopping at salvage 3,650 on 25 Nov 2025 (day 329)", p(dep(hundred, "2025-01-01").accumulated) === 10000 && dep(hundred, "2025-11-24").bookValue === 3700 && dep(hundred, "2025-11-25").bookValue === 3650 && dep(hundred, "2025-11-25").fullyDepreciatedOn === "2025-11-25" && dep({ ...hundred, salvage: 0 }, "2025-12-31").bookValue === 0);
check("D14", "rates above 100, below 0 or with 3 decimals are refused; 100 and 0 are taken", [100.01, -1, 12.345, "x"].every((r) => !dep({ ...wdv, wdvRatePercent: r }, "2026-01-01").ok) && dep({ ...wdv, wdvRatePercent: 100 }, "2026-01-01").ok && dep({ ...wdv, wdvRatePercent: 0 }, "2026-01-01").ok);
const third = { cost: 1000, salvage: 0, purchaseDate: "2025-04-01", method: "slm", usefulLifeYears: 3 };
const ty = dep(third, "2025-04-01", { schedule: true }).schedule;
// accumulated at the year ends: 333.333 -> 333.33, 666.667 -> 666.67, 1,000.00: charges 333.33, 333.34, 333.33
check("D15", "rounding: 1,000 over 3 years is 333.33 + 333.34 + 333.33 (accumulated rounded once a day, half up; charges are differences), adding to 1,000.00", j(ty.years.map((y) => y.charge)) === j([333.33, 333.34, 333.33]) && ty.years.reduce((s, y) => s + p(y.charge), 0) === 100000, j(ty.years.map((y) => y.charge)));
check("D16", "no drift: the months add up to the life exactly, and so do the financial years (36 months, 3 years)", ty.months.length === 36 && ty.months.reduce((s, m) => s + p(m.charge), 0) === 100000 && ty.financialYears.reduce((s, m) => s + p(m.charge), 0) === 100000 && j(ty.financialYears.map((f) => f.label)) === j(["2025-26", "2026-27", "2027-28"]));
// many assets: every slm schedule's years add to cost - salvage exactly, and its months to the same
const many = [];
for (let k = 0; k < 60; k += 1) {
  const cost = Math.round((k * 7919.37 + 123.45) * 100) / 100, salvage = Math.round(cost * (k % 7) * 1.3) / 100;
  const d = new RealDate(RealDate.UTC(2019 + (k % 7), (k * 5) % 12, 1 + (k * 11) % 28)).toISOString().slice(0, 10);
  many.push({ cost, salvage, purchaseDate: d, method: "slm", usefulLifeYears: 1 + (k % 9) });
}
const sums = many.map((m) => { const s = dep(m, "2030-01-01", { schedule: true }).schedule; return [s.years.reduce((a, y) => a + p(y.charge), 0), s.months.reduce((a, y) => a + p(y.charge), 0), p(m.cost) - p(m.salvage)]; });
check("D17", "60 assets (costs with paise, salvage 0-8%, lives 1-9, dates across leap years): the yearly charges and the monthly ones each add up to cost - salvage exactly", sums.every(([y, m, want]) => y === want && m === want), j(sums.filter(([y, m, want]) => y !== want || m !== want).slice(0, 3)));
check("D18", "the closing value of each year is the opening of the next; the last closing is the salvage", many.every((m) => { const ys = dep(m, "2030-01-01", { schedule: true }).schedule.years; return ys.every((y, i) => i === 0 || p(ys[i - 1].closing) === p(y.opening)) && p(ys.at(-1).closing) === p(m.salvage); }));
const huge = { cost: 99999999999.99, salvage: 0.01, purchaseDate: "2024-02-29", method: "slm", usefulLifeYears: 7 };
const hs = dep(huge, "2026-01-01", { schedule: true }).schedule;
check("D19", "a very large price (₹9,99,99,99,999.99, salvage 0.01, 7 years): exact to the paisa, years add up to 99,99,99,99,999.98", hs.years.reduce((s, y) => s + BigInt(p(y.charge)), 0n) === 9999999999998n && dep(huge, "2031-02-28").bookValue === 0.01 && p(dep(huge, "2024-02-29").accumulated) === Math.round(9999999999998 / 7 / 366), j([hs.years.length, dep(huge, "2024-02-29").accumulated]));
check("D20", "a price over ₹10,000 crore is refused, and so is a salvage above the cost or a life of 0 or 101", !dep({ ...base, cost: 100000000000.01 }, "2026-01-01").ok && !dep({ ...base, salvage: 100000.01 }, "2026-01-01").ok && !dep({ ...base, usefulLifeYears: 0 }, "2026-01-01").ok && !dep({ ...base, usefulLifeYears: 101 }, "2026-01-01").ok && dep({ ...base, usefulLifeYears: 100 }, "2026-01-01").ok);
const disp = DEP.disposalFigures(base, "2026-09-30", 50000);
// to 30 Sep 2026: 30,000 + 30,000 x 183/365 = 45,041.10; book 54,958.90; sold for 50,000: a loss of 4,958.90.
check("D21", "on disposal: book value at the disposal date (its day counted) and the gain or loss: 54,958.90 book, sold 50,000, loss 4,958.90", disp.ok && disp.bookValue === 54958.9 && disp.gainOrLoss === -4958.9 && DEP.disposalFigures(base, "2026-09-30").gainOrLoss === -54958.9 && DEP.disposalFigures(base, "2026-09-30", 60000).gainOrLoss === 5041.1, j(disp));
const stopped = dep({ ...base, disposalDate: "2026-09-30" }, "2027-06-01", { schedule: true });
check("D22", "nothing accrues after a disposal: the book value stays at 54,958.90 and the schedule ends on the disposal date", stopped.bookValue === 54958.9 && stopped.annualCharge === 0 && stopped.endsOn === "2026-09-30" && stopped.schedule.to === "2026-09-30" && stopped.schedule.years.reduce((s, y) => s + p(y.charge), 0) === 4504110);
check("D23", "an asOf or purchase date that isn't a real day is refused", !dep(base, "2026-02-30").ok && !dep({ ...base, purchaseDate: "2025-13-01" }, "2026-01-01").ok && !dep(base, "").ok);
// the register's own figures
const vals = AR.depreciationOf(KABIR, "AST-0011", "2026-11-22");
check("D24", "the register: Finance reads AST-0011's figures (wdv 63.16%: down to salvage on 9 May 2024, before its disposal on 31 Mar 2026); AST-0001's straight line matches the engine", vals.ok && vals.endsOn === "2024-05-09" && vals.bookValue === 749.95 && vals.annualCharge === 0
  && j(AR.depreciationOf(KABIR, "AST-0010", "2026-11-22")) === j(DEP.depreciation({ cost: 62000, salvage: 3100, purchaseDate: "2021-02-01", method: "slm", usefulLifeYears: 3, wdvRatePercent: 63.16 }, "2026-11-22")) && j(AR.depreciationOf(KABIR, "AST-0001", "2026-11-22")) === j(DEP.depreciation({ cost: 78500, salvage: 3925, purchaseDate: "2025-04-10", method: "slm", usefulLifeYears: 3, wdvRatePercent: 63.16 }, "2026-11-22")));
const sold = asset(KABIR, "AST-0011");
check("D25", "AST-0011's disposal as Finance reads it: book value at disposal, sale value 1,500 and the gain or loss, worked out (never stored)", sold.saleValue === 1500 && p(sold.gainOrLoss) === p(1500) - p(sold.bookValueAtDisposal) && sold.bookValueAtDisposal === DEP.disposalFigures({ cost: 14999, salvage: 749.95, purchaseDate: "2021-05-10", method: "wdv", usefulLifeYears: 3, wdvRatePercent: 63.16 }, "2026-03-31", 1500).bookValue && !("bookValueAtDisposal" in JSON.parse(localStorage.getItem("officeos:asset-register")).assets[10]));

// ---------- V ----------
section("V. Who sees what");
fresh();
// every read function, as each person: the values are only ever there for Finance and the Admin
const readsAs = (v) => ({ list: AR.listAssets(v), one: ["AST-0001", "AST-0002", "AST-0004", "AST-0009", "AST-0011", "AST-0012"].map((t) => AR.getAssetFor(v, t)), hist: ["AST-0002", "AST-0010"].map((t) => AR.assignmentHistory(v, t)),
  of: AR.assignmentsOf(v, ROHAN), events: ["AST-0011", "AST-0004"].map((t) => AR.assetEvents(v, t)), maint: ["AST-0004", "AST-0009"].map((t) => AR.maintenanceOf(v, t)), overdue: AR.overdueService(v, NOW),
  warranty: AR.warrantyExpiring(v, 90, NOW), notReturned: AR.assetsNotReturned(v, {}, NOW), vendors: AR.vendorsFor(v), defaults: AR.depreciationDefaults(v) });
for (const [n, who, name] of [["V1", PRIYA, "HR"], ["V2", ROHAN, "an employee"], ["V3", SNEHA, "a manager (Sneha manages Rohan and Arjun)"], ["V4", VIKRAM, "the Store Keeper (an employee)"], ["V5", MEERA, "someone on leave"]]) {
  check(n, `${name}: no read function returns a price, salvage, life, method, rate, cost, sale value, book value or gain`, noValues(readsAs(who)), [...keysIn(readsAs(who))].filter((k) => MONEY_KEYS.includes(k)).join());
}
check("V6", "HR reads every asset, with no value field on any of them, and can't read depreciation", AR.listAssets(PRIYA).length === 12 && !AR.depreciationOf(PRIYA, "AST-0001", "2026-11-22").ok && AR.depreciationDefaults(PRIYA) === null);
check("V7", "Finance and the Admin read the values: price, salvage, life, method, rate; maintenance costs; the sale value in the history", [KABIR, ADMIN].every((v) => AR.getAssetFor(v, "AST-0001").purchasePrice === 78500 && AR.getAssetFor(v, "AST-0001").salvageValue === 3925 && AR.maintenanceOf(v, "AST-0009")[0].cost === 2400 && AR.assetEvents(v, "AST-0011").at(-1).saleValue === 1500 && AR.depreciationOf(v, "AST-0001", "2026-11-22").ok));
check("V8", "HR's maintenance records, overdue list and history carry no cost or sale value (the fields are left out, not blanked)", !("cost" in AR.maintenanceOf(PRIYA, "AST-0009")[0]) && AR.overdueService(PRIYA, NOW).every((o) => !("cost" in o.record) && !("purchasePrice" in o.asset)) && !("saleValue" in AR.assetEvents(PRIYA, "AST-0011").at(-1)));
check("V9", "an employee sees only the assets issued to them now or before: Rohan AST-0002 (his) and AST-0010 (handed back); Sneha AST-0001; Vikram none", j(AR.listAssets(ROHAN).map((a) => a.tag)) === j(["AST-0002", "AST-0010"]) && j(AR.listAssets(SNEHA).map((a) => a.tag)) === j(["AST-0001"]) && AR.listAssets(VIKRAM).length === 0);
check("V10", "an employee's own view: held by them or not, since, their own rows; no status, holder, vendor or invoice", (() => { const a = AR.getAssetFor(ROHAN, "AST-0010"), b = AR.getAssetFor(ROHAN, "AST-0002"); return a.heldByYou === false && a.since === null && b.heldByYou === true && b.since === "2024-07-03" && ["status", "holderId", "vendorId", "invoiceRef", "purchaseDate"].every((k) => !(k in a) && !(k in b)); })());
check("V11", "an employee can't read anyone else's asset by id or tag (Rohan: AST-0001 is Sneha's)", AR.getAssetFor(ROHAN, "AST-0001") === null && AR.getAssetFor(ROHAN, "FA-1") === null && AR.assignmentHistory(ROHAN, "AST-0001").length === 0 && AR.assignmentsOf(ROHAN, SNEHA).length === 0);
check("V12", "a manager gets nothing of their team's by being their manager: Sneha can't read Rohan's or Arjun's assets or rows", AR.getAssetFor(SNEHA, "AST-0002") === null && AR.getAssetFor(SNEHA, "AST-0007") === null && AR.assignmentsOf(SNEHA, ROHAN).length === 0 && AR.assignmentsOf(SNEHA, ARJUN).length === 0 && AR.assetsNotReturned(SNEHA).length === 0);
AR.returnAsset(ADMIN, "AST-0001", { condition: "good" }, NOW);
AR.issueAsset(ADMIN, "AST-0001", { personId: ROHAN, condition: "good" }, NOW);
check("V13", "an asset two people held: each sees only their own row (Rohan doesn't see Sneha's months with AST-0001, nor she his)", j(AR.assignmentHistory(ROHAN, "AST-0001").map((r) => r.personId)) === j([ROHAN]) && j(AR.getAssetFor(ROHAN, "AST-0001").assignments.map((r) => r.personId)) === j([ROHAN]) && j(AR.assignmentHistory(SNEHA, "AST-0001").map((r) => r.personId)) === j([SNEHA]) && AR.getAssetFor(SNEHA, "AST-0001").heldByYou === false);
check("V14", "an employee reads no lifecycle, maintenance, overdue, warranty, not-returned, vendor or default list", [ROHAN, SNEHA, VIKRAM].every((v) => AR.assetEvents(v, "AST-0002").length === 0 && AR.maintenanceOf(v, "AST-0009").length === 0 && AR.overdueService(v, NOW).length === 0 && AR.warrantyExpiring(v, 90, NOW).length === 0 && AR.assetsNotReturned(v).length === 0 && AR.vendorsFor(v).length === 0 && AR.depreciationDefaults(v) === null && !AR.depreciationOf(v, "AST-0002", "2026-11-22").ok));
check("V15", "someone who has left reads nothing, even their own (Divya)", AR.listAssets(DIVYA).length === 0 && AR.getAssetFor(DIVYA, "AST-0012") === null && AR.assignmentsOf(DIVYA, DIVYA).length === 0 && SL.issuedTo(DIVYA, DIVYA).length === 0);
check("V16", "the stock ledger: HR, Finance and the Admin read it; an employee doesn't, but sees what they were issued", [PRIYA, KABIR, ADMIN].every((v) => SL.stockItems(v).length === 6 && SL.lowStock(v).length === 3) && SL.stockItems(ROHAN).length === 0 && SL.stockMovements(ROHAN).length === 0 && SL.onHand(ROHAN, "SI-1") === null && j(SL.issuedTo(SNEHA, SNEHA).map((x) => [x.itemId, x.qty])) === j([["SI-6", 2]]) && SL.issuedTo(ROHAN, SNEHA).length === 0);
check("V17", "a write's answer is cut for the writer too: HR has no issue right, Finance's register reads carry values", !AR.issueAsset(PRIYA, "AST-0008", { personId: ROHAN, condition: "good" }, NOW).ok && "purchasePrice" in AR.listAssets(KABIR)[0]);
check("V18", "an override can't open values or the register: granting assets:view-values is refused, and one stored on a record anyway is ignored", (() => {
  const refused = !S.updateUser(ADMIN, ROHAN, { grantPermissions: ["assets:view-values"] }).ok;
  const box = JSON.parse(mem.get("officeos:users") ?? "null");
  if (box) { box.records.find((u) => u.id === ROHAN).grantPermissions = ["assets:view-values", "assets:view-all"]; mem.set("officeos:users", JSON.stringify(box)); }
  const ignored = !RO.permissionsOf(S.getUser(ROHAN)).some((k) => k === "assets:view-values" || k === "assets:view-all") && !RO.permissionsOf({ role: "emp", grantPermissions: ["assets:view-values", "assets:view-all"] }).includes("assets:view-values");
  return refused && ignored && Boolean(box) && j(AR.listAssets(ROHAN).map((a) => a.tag)) === j(["AST-0001", "AST-0002", "AST-0010"]) && noValues(AR.listAssets(ROHAN)) && !AR.depreciationOf(ROHAN, "AST-0002", "2026-11-22").ok;
})());

// ---------- P ----------
section("P. Permissions");
const NEW = ["assets:view-all", "assets:view-values", "assets:manage", "assets:issue", "assets:maintain", "stock:view", "stock:move", "vendors:manage", "depreciation:configure"];
check("P1", "the nine new permissions are in the list; 114 in all, in 46 modules (105 / 44 before AS1)", NEW.every((k) => PE.ALL_PERMISSIONS.includes(k)) && PE.ALL_PERMISSIONS.length === 114 && Object.keys(PE.PERMISSIONS).length === 46 && new Set(PE.ALL_PERMISSIONS).size === 114, `${PE.ALL_PERMISSIONS.length} / ${Object.keys(PE.PERMISSIONS).length}`);
check("P2", "role counts: Admin 111, HR 63, Finance 54, Employee 30", j(Object.values(RO.ROLES).map((r) => r.permissions.length)) === j([111, 63, 54, 30]), j(Object.values(RO.ROLES).map((r) => r.permissions.length)));
const holders = (k) => RO.ROLE_KEYS.filter((r) => RO.ROLES[r].permissions.includes(k)).join(" ");
check("P3", "who holds each: view-all HR, Finance, Admin; view-values Finance, Admin; the custodian's five the Admin only; stock:view HR, Finance, Admin; configure Finance, Admin; view-own everyone",
  j(NEW.map(holders)) === j(["admin hr fin", "admin fin", "admin", "admin", "admin", "admin hr fin", "admin", "admin", "admin fin"]) && holders("assets:view-own") === "admin hr fin emp", j(NEW.map(holders)));
check("P4", "none of them is overridable", NEW.every((k) => !RO.OVERRIDABLE.includes(k)));
check("P5", "a manager gets nothing extra: Sneha's permissions are an employee's", j(RO.permissionsOf(S.getUser(SNEHA))) === j(RO.ROLES.emp.permissions));
check("P6", "writes check the permission first: an employee, HR and Finance can't add, issue, maintain, retire or record stock", [ROHAN, PRIYA, KABIR].every((v) => !AR.addAsset(v, { name: "Desk", category: "furniture", purchaseDate: "2026-11-01", purchasePrice: 1, locationId: "OFF-1" }, NOW).ok && !AR.issueAsset(v, "AST-0008", { personId: v, condition: "good" }, NOW).ok && !AR.openMaintenance(v, "AST-0008", { issue: "Wobbly" }, NOW).ok && !AR.retireAsset(v, "AST-0008", { reason: "Old chair" }, NOW).ok && !SL.recordStockMovement(v, { itemId: "SI-1", kind: "out", qty: 1, toPersonId: v, reason: "Mine now" }, NOW).ok && !AR.addVendor(v, { name: "Shady Supplies" }, NOW).ok) && st("AST-0008") === "in-store");
check("P7", "Finance sets depreciation (a category's default, an asset's own); HR and an employee can't", AR.setDepreciationDefault(KABIR, "phone", { method: "wdv" }, NOW).ok && AR.depreciationDefaults(KABIR).phone.method === "wdv" && AR.setAssetDepreciation(KABIR, "AST-0006", { usefulLifeYears: 4 }, NOW).ok && !AR.setDepreciationDefault(PRIYA, "phone", { method: "slm" }, NOW).ok && !AR.setAssetDepreciation(ROHAN, "AST-0002", { wdvRatePercent: 0 }, NOW).ok);
check("P8", "escalation through extra fields is refused whole: a status, holder, id, tag or sample flag on add; an id or tag on a stock item", ["status", "holderId", "id", "tag", "sample", "createdAt"].every((k) => !AR.addAsset(ADMIN, { name: "Desk", category: "furniture", purchaseDate: "2026-11-01", purchasePrice: 1, locationId: "OFF-1", [k]: "x" }, NOW).ok) && !AR.editAsset(ADMIN, "AST-0008", { status: "disposed" }, NOW).ok && !AR.setAssetDepreciation(KABIR, "AST-0006", { purchasePrice: 1 }, NOW).ok && st("AST-0008") === "in-store");
check("P9", "someone inactive can't write, whatever their role was", !SL.recordStockMovement(DIVYA, { itemId: "SI-1", kind: "in", qty: 1, reason: "Test it" }, NOW).ok);
check("P10", "a default change applies to assets added afterwards only: AST-0005 keeps straight line", AR.getAssetFor(ADMIN, "AST-0005").depreciationMethod === "slm" && AR.addAsset(ADMIN, { name: "Pixel 9", category: "phone", purchaseDate: "2026-11-01", purchasePrice: 59999, locationId: "OFF-1" }, NOW).record.depreciationMethod === "wdv");

// ---------- A ----------
section("A. The audit trail");
fresh();
const audited = (label, run, kind, has = [], who = ADMIN) => {
  const n = events();
  const r = run();
  const e = lastEvent();
  return r.ok && events() === n + 1 && e.kind === kind && e.actorId === who && has.every((s) => e.detail.includes(s)) && AU.AUDIT_KINDS.includes(kind) && Boolean(AU.AUDIT_LABEL[kind]);
};
const writes = [
  ["A1", "a stock item added", () => SL.addStockItem(ADMIN, { name: "Tape", category: "stationery", unit: "roll", reorderLevel: 2 }, NOW), "stock-item-added", ["SI-7"]],
  ["A2", "a stock item changed (field names)", () => SL.updateStockItem(ADMIN, "SI-7", { reorderLevel: 3 }, NOW), "stock-item-changed", ["SI-7", "reorderLevel"]],
  ["A3", "a movement", () => SL.recordStockMovement(ADMIN, { itemId: "SI-1", kind: "out", qty: 2, toPersonId: ROHAN, reason: "Printing" }, NOW), "stock-moved", ["SM-14", "SI-1", ROHAN]],
  ["A4", "a correction", () => SL.reverseStockMovement(ADMIN, "SM-14", { reason: "Wrong person" }, NOW), "stock-reversed", ["SM-15", "SM-14"]],
  ["A5", "an asset added", () => AR.addAsset(ADMIN, { name: "Standing desk", category: "furniture", purchaseDate: "2026-11-01", purchasePrice: 45000, locationId: "OFF-1" }, NOW), "asset-added", ["AST-0013", "FA-13"]],
  ["A6", "an asset edited (field names only)", () => AR.editAsset(ADMIN, "AST-0013", { name: "Sit-stand desk", purchasePrice: 44000 }, NOW), "asset-changed", ["AST-0013", "name", "purchasePrice"]],
  ["A7", "issued", () => AR.issueAsset(ADMIN, "AST-0013", { personId: SNEHA, condition: "good" }, NOW), "asset-issued", ["AST-0013", SNEHA]],
  ["A8", "returned", () => AR.returnAsset(ADMIN, "AST-0013", { condition: "good" }, NOW), "asset-returned", ["AST-0013", SNEHA]],
  ["A9", "sent for maintenance", () => AR.openMaintenance(ADMIN, "AST-0013", { issue: "Motor noise", cost: 1200, vendorId: "VN-2" }, NOW), "asset-maintenance-opened", ["AST-0013", "MR-3"]],
  ["A10", "back from maintenance", () => AR.closeMaintenance(ADMIN, "MR-3", { cost: 1500 }, NOW), "asset-maintenance-closed", ["AST-0013", "MR-3"]],
  ["A11", "retired", () => AR.retireAsset(ADMIN, "AST-0013", { reason: "Motor failed" }, NOW), "asset-retired", ["AST-0013"]],
  ["A12", "disposed of", () => AR.disposeAsset(ADMIN, "AST-0013", { reason: "Sold", saleValue: 9000 }, NOW), "asset-disposed", ["AST-0013"]],
  ["A13", "a vendor added", () => AR.addVendor(ADMIN, { name: "QuickFix Services", email: "help@quickfix.example" }, NOW), "vendor-added", ["VN-3"]],
  ["A14", "a vendor changed", () => AR.updateVendor(ADMIN, "VN-3", { phone: "+91 98111 22233" }, NOW), "vendor-changed", ["VN-3", "phone"]],
  ["A15", "a vendor deactivated", () => AR.setVendorActive(ADMIN, "VN-3", false, NOW), "vendor-changed", ["VN-3", "deactivated"]],
  ["A16", "a vendor deleted", () => AR.deleteVendor(ADMIN, "VN-3", NOW), "vendor-removed", ["VN-3"]],
  ["A17", "a category default changed (by Finance)", () => AR.setDepreciationDefault(KABIR, "laptop", { wdvRatePercent: 40 }, NOW), "depreciation-changed", ["laptop", "wdvRatePercent"], KABIR],
  ["A18", "an asset's depreciation changed", () => AR.setAssetDepreciation(ADMIN, "AST-0001", { depreciationMethod: "wdv" }, NOW), "depreciation-changed", ["AST-0001", "depreciationMethod"]],
];
for (const [n, label, run, kind, has, who] of writes) check(n, `${label}: one ${kind} event, by who, naming the ids`, audited(label, run, kind, has, who), j(lastEvent()));
const all = AU.allEvents();
check("A19", "no event names an amount (45000, 44000, 1200, 1500, 9000, 78500), and issue and return name the person as the subject", !all.some((e) => /45000|44000|1200|1500|9000|78500|45,000|₹/.test(e.detail)) && all.find((e) => e.kind === "asset-issued").userId === SNEHA && all.find((e) => e.kind === "asset-returned").userId === SNEHA);
const n0 = events();
[() => AR.issueAsset(ADMIN, "AST-0001", { personId: ROHAN, condition: "good" }, NOW), () => SL.recordStockMovement(ADMIN, { itemId: "SI-6", kind: "out", qty: 99, reason: "Too many" }, NOW), () => AR.deleteVendor(ADMIN, "VN-1", NOW), () => AR.addAsset(ROHAN, { name: "Desk" }, NOW)].forEach((f) => f());
check("A20", "a refused write logs nothing", events() === n0);

// ---------- M ----------
section("M. Maintenance, warranty, vendors");
fresh();
check("M1", "the sample's overdue list on 22 Nov 2026: the printer (next service was due 14 Nov), nothing else", j(AR.overdueService(ADMIN, NOW).map((o) => [o.asset.tag, o.due])) === j([["AST-0009", "2026-11-14"]]));
clock("2026-11-14");
check("M2", "...not on 14 Nov (due that day, not passed)", AR.overdueService(ADMIN, NOW).length === 0);
clock("2026-11-22");
const open9 = AR.openMaintenance(ADMIN, "AST-0009", { issue: "Annual service", cost: 0, nextServiceDue: "2026-11-22" }, NOW);
check("M3", "the next service must be after the record's date (the same day is refused)", open9.field === "nextServiceDue");
const o9 = AR.openMaintenance(ADMIN, "AST-0009", { issue: "Annual service", vendorId: "VN-1" }, NOW);
check("M4", "opening a record moves the asset to under maintenance; a newer record takes the printer off the overdue list", o9.ok && o9.record.status === "open" && st("AST-0009") === "under-maintenance" && AR.overdueService(ADMIN, NOW).length === 0);
check("M5", "a second record can't be opened while one is open (the asset isn't in the store)", !AR.openMaintenance(ADMIN, "AST-0009", { issue: "Again" }, NOW).ok);
const c9 = AR.closeMaintenance(ADMIN, o9.record.id, { cost: 1800.5, nextServiceDue: "2027-05-22", notes: "Fuser cleaned" }, NOW);
check("M6", "closing it brings the asset back to the store, with the cost, next service and notes; closing twice is refused", c9.ok && c9.record.status === "done" && c9.record.cost === 1800.5 && c9.record.closedOn === "2026-11-22" && st("AST-0009") === "in-store" && !AR.closeMaintenance(ADMIN, o9.record.id, {}, NOW).ok);
check("M7", "maintenance checks: an issue is required, the cost is 0 or more with 2 decimals, the vendor must be on the list", AR.openMaintenance(ADMIN, "AST-0008", { issue: "" }, NOW).field === "issue" && AR.openMaintenance(ADMIN, "AST-0008", { issue: "Wobbly", cost: -5 }, NOW).field === "cost" && AR.openMaintenance(ADMIN, "AST-0008", { issue: "Wobbly", vendorId: "VN-9" }, NOW).field === "vendorId" && st("AST-0008") === "in-store");
check("M8", "the sample's open record: AST-0004 under maintenance with MR-2; closing it returns the laptop to the store", AR.closeMaintenance(ADMIN, "MR-2", { date: "2026-11-20" }, NOW).ok && st("AST-0004") === "in-store" && AR.closeMaintenance(ADMIN, "MR-1", {}, NOW).error.includes("already closed"));
check("M9", "warranty ending within 30 days of 22 Nov: AST-0005 (15 Dec); 60 days adds the chairs (4 Jan) and AST-0006 (19 Jan); 90 the same; expired ones never", j(AR.warrantyExpiring(ADMIN, 30, NOW).map((a) => a.tag)) === j(["AST-0005"]) && j(AR.warrantyExpiring(ADMIN, 60, NOW).map((a) => a.tag)) === j(["AST-0005", "AST-0007", "AST-0008", "AST-0006"]) && j(AR.warrantyExpiring(ADMIN, 90, NOW).map((a) => a.tag)) === j(["AST-0005", "AST-0007", "AST-0008", "AST-0006"]) && j(AR.warrantyExpiring(ADMIN, 22, NOW).map((a) => a.tag)) === j([]), j(AR.warrantyExpiring(ADMIN, 90, NOW).map((a) => [a.tag, a.warrantyUntil])));
check("M10", "not returned: the monitor AST-0012 with Divya Menon, who has left (no last working day on record)", j(AR.assetsNotReturned(PRIYA).map((x) => [x.asset.tag, x.personId, x.since, x.exitDate])) === j([["AST-0012", DIVYA, "2023-02-03", null]]));
const del = AR.deleteVendor(ADMIN, "VN-2", NOW);
check("M11", "a vendor named on an asset can't be deleted (deactivate it instead)", !del.ok && /deactivate/.test(del.error) && AR.vendorsFor(ADMIN).length === 2, del.error);
check("M12", "a deactivated vendor stays on its old records but can't be named on a new asset or record", AR.setVendorActive(ADMIN, "VN-2", false, NOW).ok && AR.addAsset(ADMIN, { name: "Chair", category: "furniture", purchaseDate: "2026-11-01", purchasePrice: 1, locationId: "OFF-1", vendorId: "VN-2" }, NOW).field === "vendorId" && AR.getAssetFor(ADMIN, "AST-0007").vendorId === "VN-2" && AR.editAsset(ADMIN, "AST-0007", { name: "Ergonomic chair", vendorId: "VN-2" }, NOW).ok);
const v3 = AR.addVendor(ADMIN, { name: "Unused Vendor" }, NOW);
check("M13", "a vendor nothing names is deleted", v3.ok && AR.deleteVendor(ADMIN, v3.record.id, NOW).ok && AR.vendorsFor(ADMIN).length === 2);
check("M14", "vendor names are unique (any case); email, GSTIN and phone are checked; no HTML", !AR.addVendor(ADMIN, { name: "technova distributors" }, NOW).ok && AR.addVendor(ADMIN, { name: "A1 Co", email: "not-an-email" }, NOW).field === "email" && AR.addVendor(ADMIN, { name: "A1 Co", gstin: "06AABCT4821M1Y7" }, NOW).field === "gstin" && AR.addVendor(ADMIN, { name: "A1 Co", gstin: "40AABCT4821M1Z7" }, NOW).field === "gstin" && AR.addVendor(ADMIN, { name: "A1 Co", phone: "12345" }, NOW).field === "phone" && AR.addVendor(ADMIN, { name: "<b>A1</b>" }, NOW).field === "name" && AR.addVendor(ADMIN, { name: "A1 Co", gstin: "29aabca1234b1z5", phone: "+91 80 4123 4567", email: "a1@a1.example" }, NOW).record.gstin === "29AABCA1234B1Z5");
check("M15", "the sample vendors' details pass their own checks", AR.vendorsFor(ADMIN).filter((v) => v.sample).every((v) => RU.GSTIN.test(v.gstin) && RU.EMAIL.test(v.email) && RU.phoneOk(v.phone)));

// ---------- T ----------
section("T. Tags and serials");
fresh();
const t13 = AR.addAsset(ADMIN, { name: "Dell 27\" monitor", category: "monitor", purchaseDate: "2026-11-10", purchasePrice: 21000, locationId: "OFF-1", serial: "CN-0P2719-01" }, NOW);
check("T1", "a new asset is tagged AST-0013 (after the sample's AST-0012)", t13.ok && t13.record.tag === "AST-0013" && t13.record.id === "FA-13");
check("T2", "a serial number is unique (any case) when given; blank serials may repeat (the chairs)", AR.addAsset(ADMIN, { name: "Another", category: "monitor", purchaseDate: "2026-11-10", purchasePrice: 1, locationId: "OFF-1", serial: "cn-0p2719-01" }, NOW).field === "serial" && AR.editAsset(ADMIN, "AST-0008", { serial: "DL5440-7Q2K91" }, NOW).field === "serial" && AR.addAsset(ADMIN, { name: "Stool", category: "furniture", purchaseDate: "2026-11-10", purchasePrice: 1, locationId: "OFF-1" }, NOW).ok);
check("T3", "a tag can be changed once (to MON-0013), then no more", AR.editAsset(ADMIN, "AST-0013", { tag: "mon-0013" }, NOW).record?.tag === "MON-0013" && AR.editAsset(ADMIN, "MON-0013", { tag: "MON-13" }, NOW).field === "tag" && asset(ADMIN, "MON-0013").id === "FA-13");
check("T4", "a tag is unique and well formed: AST-0001 is taken; spaces, HTML and 2 characters are refused", AR.editAsset(ADMIN, "AST-0008", { tag: "ast-0001" }, NOW).field === "tag" && ["AB", "AST 0008", "<b>X</b>", "A".repeat(21)].every((t) => AR.editAsset(ADMIN, "AST-0008", { tag: t }, NOW).field === "tag") && asset(ADMIN, "AST-0008").tag === "AST-0008");
check("T5", "the next tag skips past any number in use (AST-0015 after AST-0013 and the stool's AST-0014)", AR.addAsset(ADMIN, { name: "Stool 2", category: "furniture", purchaseDate: "2026-11-10", purchasePrice: 1, locationId: "OFF-1" }, NOW).record.tag === "AST-0015");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);