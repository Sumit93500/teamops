// usage: node i2.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// I2: the I1 engine reused for four more imports and six record exports (data/import-assets.js, import-licences.js, import-leave.js,
// leave-openings.js, import-attendance.js, attendance-store.js importCorrection, export-records.js, export.js; the engine's genericName,
// two-column keys and the id-free "already imported"; the 11 new permissions)
//   P  permissions: who holds each new one, the pinned counts, none overridable, the Admin without export:expenses
//   G  the engine: a generic file name in the history and the audit trail, never the uploaded one (employees keep theirs); a two-column
//      duplicate key; "already imported" without an id; the check writes no record; nothing half-imported (rolled back)
//   AS the asset register        ST the stock opening counts        LI licences
//   LB leave balances (the stored adjustment, the balance on and after its date, nothing before it or in another year)
//   AC attendance corrections (the old rules and, from 1 Dec 2026, the shift's; visit days; late marks; a correction waiting; sample days)
//   EX the record exports: who, the rows of the range, the columns, masking, personal tasks never, ranges, xlsx, formula injection, the log
//   C  no import makes a sign-in
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const mem = new Map();
let failWrite = null;   // G: a write to this key throws (the transaction test)
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { if (failWrite && failWrite(k)) throw new Error("QuotaExceededError"); mem.set(k, String(v)); }, removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const clock = (date, hm = "10:00") => { const [y, m, d] = date.split("-").map(Number); const [h, mi] = hm.split(":").map(Number); NOW = RealDate.UTC(y, m - 1, d, h, mi) - 330 * 60000; };
clock("2026-11-23");

const S = await import("./js/data/store.js");
const RO = await import("./js/config/roles.js");
const PM = await import("./js/config/permissions.js");
const E = await import("./js/data/import-engine.js");
const IE = await import("./js/data/import-employees.js");
const IA = await import("./js/data/import-assets.js");
const IL = await import("./js/data/import-licences.js");
const LB = await import("./js/data/import-leave.js");
const LO = await import("./js/data/leave-openings.js");
const AC = await import("./js/data/import-attendance.js");
const AT = await import("./js/data/attendance-store.js");
const X = await import("./js/data/export.js");
const XR = await import("./js/data/export-records.js");
const XL = await import("./js/data/xlsx.js");
const AR = await import("./js/data/asset-register.js");
const SL = await import("./js/data/stock-ledger.js");
const LI = await import("./js/data/licences.js");
const LP = await import("./js/data/leave-policy.js");
const LS = await import("./js/data/leave-store.js");
const SA = await import("./js/data/shift-assignments.js");
const SD = await import("./js/data/shift-days.js");
const VS = await import("./js/data/visits-store.js");
const TK = await import("./js/data/tasks-store.js");
const PR = await import("./js/data/payroll-store.js");
const EX = await import("./js/data/expenses-store.js");
const CM = await import("./js/data/import-common.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(6)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 300)}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const ADMIN = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", SNEHA = "EMP-1029", ROHAN = "EMP-1042", DIVYA = "EMP-1061", ARJUN = "EMP-1105";
const enc = (s) => new TextEncoder().encode(s);
const up = (text, name = "Rohan Gupta's list.csv") => ({ bytes: typeof text === "string" ? enc(text) : text, name });
const csv = (rows) => rows.map((r) => r.join(",")).join("\r\n");
const chk = (form, text, who, name) => E.checkImport(form, up(text, name), who, NOW);
const probs = (r) => (r.problems ?? []).map(E.problemText);
async function imp(form, text, who, name) {
  const c = await chk(form, text, who, name);
  if (!c.ok) return { check: c, apply: c };
  return { check: c, apply: await E.applyImport(form, up(text, name), who, c.token, NOW) };
}
const hist = () => JSON.parse(mem.get("officeos:import-history") ?? "{\"entries\":[]}").entries;
const audit = () => JSON.parse(mem.get("officeos:audit-trail") ?? "{\"events\":[]}").events ?? [];
const snapKeys = () => new Map([...mem].filter(([k]) => k.startsWith("officeos:") && k !== "officeos:import-history" && k !== "officeos:audit-trail"));
const sameSnap = (a, b) => a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);
const ISO = /\b\d{4}-\d{2}-\d{2}\b/;
const IDS = /\b(?:FA|ITM|SM|LIC|SEAT|EMP|IH|LO|RG|AT|LV|EXP|WT|PT)-\d+\b/;

const IT1 = S.addUser(ADMIN, { name: "Isha Kulkarni", email: "isha.kulkarni@northwind.com", department: "IT", designation: "IT Engineer", role: "it", dateOfJoining: "2 Nov 2026" }).record.id;
const HIRE = S.addUser(ADMIN, { name: "Tara Bose", email: "tara.bose@northwind.com", department: "ENG", designation: "Software Engineer", role: "emp", dateOfJoining: "25 Nov 2026", reportingManagerId: SNEHA }).record.id;
const INTERN = S.addUser(ADMIN, { name: "Kiran Das", email: "kiran.das@northwind.com", department: "ENG", designation: "Software Engineer", role: "emp", dateOfJoining: "3 Aug 2026", employmentType: "Intern", reportingManagerId: SNEHA }).record.id;
AT.dayFor(ROHAN, "2026-11-20");   // the attendance seed is made today (23 Nov): from today the sample people's days are generated, not stored

// ---------- P ----------
section("P  permissions");
const NEW = ["import:assets", "import:stock-opening", "import:licences", "import:leave-balances", "import:attendance-corrections", "export:leave", "export:attendance", "export:expenses", "export:visits", "export:tasks", "export:payroll"];
const holders = (p) => RO.ROLE_KEYS.filter((k) => RO.ROLES[k].permissions.includes(p)).join(",");
check("P1", "141 permissions in 50 modules (I2: 130 -> 141)", PM.ALL_PERMISSIONS.length === 141 && Object.keys(PM.PERMISSIONS).length === 50, `${PM.ALL_PERMISSIONS.length} / ${Object.keys(PM.PERMISSIONS).length}`);
check("P2", "role counts (I2): Admin 137, HR 77, Finance 62, Employee 34, IT 48", j(RO.ROLE_KEYS.map((k) => RO.ROLES[k].permissions.length)) === j([137, 77, 62, 34, 48]), j(RO.ROLE_KEYS.map((k) => RO.ROLES[k].permissions.length)));
const want = { "import:assets": "admin,it", "import:stock-opening": "admin,it", "import:licences": "admin,it", "import:leave-balances": "admin,hr", "import:attendance-corrections": "admin,hr",
  "export:leave": "admin,hr", "export:attendance": "admin,hr", "export:expenses": "fin", "export:visits": "admin,hr", "export:tasks": "admin,hr", "export:payroll": "admin,hr,fin" };
check("P3", "who holds each new permission", NEW.every((p) => holders(p) === want[p]), j(Object.fromEntries(NEW.map((p) => [p, holders(p)]))));
check("P4", "the Admin has no export:expenses (held back with the expense files)", RO.ADMIN_HELD_BACK.includes("export:expenses") && !S.getUser(ADMIN) === false && !RO.hasPermission(S.getUser(ADMIN), "export:expenses"));
check("P5", "none of them can be granted by an override", NEW.every((p) => !RO.OVERRIDABLE.includes(p)) && !RO.hasPermission({ ...S.getUser(ARJUN), grantPermissions: NEW }, "export:leave"));
check("P6", "the naming pattern: import:<form> / export:<module>, in the existing modules", PM.PERMISSIONS.import.length === 7 && PM.PERMISSIONS.export.length === 8);

// ---------- AS ----------
section("AS  the asset register");
const AH = ["Name", "Category", "Make and model", "Serial number", "Purchase date", "Purchase price", "Vendor", "Invoice reference", "Warranty end", "Office"];
const vendor = AR.vendorsFor(ADMIN).find((v) => v.active)?.name ?? "";
const tA = await E.templateFor(IA.ASSETS_FORM, IT1, "csv", NOW);
check("AS1", "IT's template: the headers, the EXAMPLE row, notes with the categories and offices", tA.ok && tA.text.split("\r\n")[0].replace(/^\uFEFF/, "") === AH.join(",") && tA.text.split("\r\n")[1].startsWith("EXAMPLE,") && /Categories: Laptop, Monitor/.test(tA.text) && /Offices: /.test(tA.text), tA.text?.slice(0, 200));
for (const [n, who] of [["AS2", PRIYA], ["AS3", KABIR], ["AS4", ARJUN]]) {
  const r = await chk(IA.ASSETS_FORM, csv([AH, ["X1 Carbon", "Laptop", "", "", "2026-10-01", "90000", "", "", "", "Head office"]]), who);
  check(n, `${S.getUser(who).name} may not import assets`, !r.ok && r.code === "not-allowed" && r.error === "You can't import assets.", r.error);
}
const regBefore = AR.listAssets(ADMIN).length;
const snap0 = snapKeys();
const aFile = csv([AH,
  ["Lenovo X1 Carbon", "Laptop", "Lenovo X1 G11", "SN-I2-001", "2026-10-01", "\"1,25,000.50\"", vendor, "INV-77", "2029-10-01", "Head office"],
  ["Chair", "Access card", "", "", "2026-10-01", "5000", "", "", "", "Head office"],
  ["HP LaserJet", "Printer", "", "SN-I2-001", "2027-01-01", "abc", "Nobody & Co", "", "", "Nowhere"],
  ["Dell monitor", "monitor", "", "", "02-11-2026", "18000", "", "", "2026-10-01", "Head office"],
  ["Desk", "Furniture", "", "", "2 Nov 2026", "12000", "", "", "", "head office"]]);
const ca = await chk(IA.ASSETS_FORM, aFile, IT1);
check("AS5", "the check: 2 ready, 2 with errors, 1 duplicate", ca.ok && j(ca.summary) === j({ read: 5, ready: 2, errors: 2, duplicates: 1, templateRows: 0 }), j(ca.summary));
check("AS6", "each problem in plain words", j(probs(ca)) === j(["Row 3, Category: access cards are stock items: import them as stock opening balances", "Row 4, Purchase date: can't be in the future", "Row 4, Purchase price: an amount in rupees, like 85000 (at most 2 decimals)",
  "Row 4, Vendor: no active vendor called \"Nobody & Co\"", "Row 4, Office: no active office called \"Nowhere\"", "Row 4, Serial number: also in row 2", "Row 5, Warranty end: before the purchase date"]), j(probs(ca)));
check("AS7", "the check writes no record", sameSnap(snap0, snapKeys()) && AR.listAssets(ADMIN).length === regBefore);
const ra = await E.applyImport(IA.ASSETS_FORM, up(aFile), IT1, ca.token, NOW);
const made = ra.ok ? ra.created.map((c) => AR.getAssetFor(ADMIN, c.id)) : [];
check("AS8", "the import adds the 2 ready assets: tagged, in store, the category's depreciation, the price to the paisa", ra.ok && ra.created.length === 2 && AR.listAssets(ADMIN).length === regBefore + 2
  && made.every((a) => /^AST-\d{4}$/.test(a.tag)) && made[0].purchasePrice === 125000.5 && made[0].depreciationMethod === "slm" && made[0].usefulLifeYears === 3 && made[1].category === "furniture" && made[1].purchaseDate === "2026-11-02", j(made.map((a) => [a?.tag, a?.purchasePrice, a?.category, a?.purchaseDate])));
check("AS9", "dates as people type them: 02-11-2026 is day first; 2 Nov 2026", IE.readDate("02-11-2026") === "2026-11-02" && made[1]?.purchaseDate === "2026-11-02");
const ca2 = await chk(IA.ASSETS_FORM, csv([AH, ["Spare", "Laptop", "", "sn-i2-001", "2026-10-01", "1000", "", "", "", "Head office"]]), IT1);
check("AS10", "a serial already on the register (any case): a duplicate naming the asset", ca2.ok && probs(ca2)[0] === "Row 2, Serial number: already on the register (Lenovo X1 Carbon)" && ca2.summary.duplicates === 1, probs(ca2)[0]);
check("AS11", "the Admin may import assets too", (await chk(IA.ASSETS_FORM, csv([AH, ["Spare", "Laptop", "", "", "2026-10-01", "1000", "", "", "", "Head office"]]), ADMIN)).ok);
const vOff = AR.vendorsFor(ADMIN).filter((v) => v.active)[1];
AR.setVendorActive(ADMIN, vOff.id, false, NOW);
const cv = await chk(IA.ASSETS_FORM, csv([AH, ["Spare", "Laptop", "", "", "2026-10-01", "1000", vOff.name, "", "", "Head office"]]), IT1);
check("AS13", "an inactive vendor is refused like an unknown one", probs(cv)[0] === `Row 2, Vendor: no active vendor called "${vOff.name}"`, probs(cv)[0]);
check("AS12", "the audit trail: asset-added for each, import-done; no uploaded file name anywhere in it", audit().filter((e) => e.kind === "asset-added").length >= 2 && audit().some((e) => e.kind === "import-done" && /Assets: assets-file\.csv: 2 imported/.test(e.detail)) && !j(audit()).includes("Rohan Gupta's list"));

// ---------- ST ----------
section("ST  stock opening counts");
const SH = ["Item", "Category", "Unit", "Reorder level", "Opening quantity", "As of", "Reference"];
const moved = SL.stockItems(ADMIN).find((i) => SL.stockMovements(ADMIN, { itemId: i.id }).length > 0);
SL.addStockItem(IT1, { name: "Whiteboard markers", category: "stationery", unit: "box", reorderLevel: 2 }, NOW);
const sFile = csv([SH,
  ["A4 paper 75 gsm", "Stationery", "ream", "10", "40", "2026-11-01", "Stock-take Nov"],
  [moved.name, "", "", "", "5", "2026-11-01", ""],
  ["Whiteboard markers", "", "", "", "2.5", "2026-11-02", ""],
  ["Coffee beans", "", "kg", "", "3", "2026-11-01", ""],
  ["a4 paper 75 gsm", "Stationery", "ream", "", "1", "2026-11-01", ""],
  ["Mugs", "Pantry", "piece", "", "0", "2026-11-01", ""],
  ["Whiteboard markers", "Pantry", "", "", "1", "2026-11-01", ""], ["Tea bags", "Pantry", "", "", "3", "2026-11-01", ""]]);
const cs = await chk(IA.STOCK_OPENING_FORM, sFile, IT1);
check("ST1", "the check: 2 ready (a new item, one with no movement yet), the rest refused", cs.ok && cs.summary.ready === 2, j(cs.summary));
check("ST2", "an item with movements, a new item without its category, a quantity of 0, twice in the file, a category unlike the record's", j(probs(cs)) === j([
  `Row 3, Item: already has stock movements, so its opening count is on record: record a stock in instead`, "Row 5, Category: required for a new item", "Row 6, Item: also in row 2",
  "Row 7, Opening quantity: more than 0, up to 10,00,000, at most 2 decimals", "Row 8, Item: also in row 4", "Row 9, Unit: required for a new item"]), j(probs(cs)));
const rs = await E.applyImport(IA.STOCK_OPENING_FORM, up(sFile), IT1, cs.token, NOW);
const paper = SL.stockItems(ADMIN).find((i) => i.name === "A4 paper 75 gsm");
const pm = paper ? SL.stockMovements(ADMIN, { itemId: paper.id }) : [];
check("ST3", "a new item is added, then ONE stock in: the quantity, the As of date, the reason, the reference", rs.ok && paper?.unit === "ream" && paper.reorderLevel === 10 && pm.length === 1 && pm[0].kind === "in" && pm[0].qty === 40 && pm[0].date === "2026-11-01" && pm[0].reason === "Opening balance (imported)" && pm[0].reference === "Stock-take Nov", j(pm));
const mk = SL.stockItems(ADMIN).find((i) => i.name === "Whiteboard markers");
check("ST4", "an item with no movement takes its opening count (2.5 box); on hand is the count", SL.onHand(ADMIN, mk.id) === 2.5 && SL.stockMovements(ADMIN, { itemId: mk.id }).length === 1, SL.onHand(ADMIN, mk.id));
const cs2 = await chk(IA.STOCK_OPENING_FORM, csv([SH, ["Whiteboard markers", "", "", "", "3", "2026-11-03", ""], ["Toner", "Stationery", "piece", "", "1.234", "2026-11-28", ""]]), IT1);
check("ST5", "once counted, an item can't take another opening; 3 decimals and a future date refused", j(probs(cs2)) === j(["Row 2, Item: already has stock movements, so its opening count is on record: record a stock in instead", "Row 3, Opening quantity: more than 0, up to 10,00,000, at most 2 decimals", "Row 3, As of: can't be in the future"]), j(probs(cs2)));
check("ST6", "HR and Finance may not import stock counts", !(await chk(IA.STOCK_OPENING_FORM, sFile, PRIYA)).ok && !(await chk(IA.STOCK_OPENING_FORM, sFile, KABIR)).ok);

// ---------- LI ----------
section("LI  licences");
const LH = ["Software", "Vendor", "Seats", "Cost per year", "Renewal date"];
const lFile = csv([LH, ["Adobe Acrobat Pro", vendor, "15", "54000", "2027-06-30"], ["Microsoft 365 Business Standard", "", "10", "", "2027-01-31"], ["Figma", "", "0", "", "2027-03-01"],
  ["Slack", "", "\"1,000\"", "", "2026-11-01"], ["adobe acrobat pro", "", "3", "", "2027-06-30"], ["Zoom", "", "100001", "x", "2027-02-30"]]);
const cl = await chk(IL.LICENCES_FORM, lFile, IT1);
check("LI1", "the check: 1 ready; an active licence, seats 0 and over 100,000, a past renewal, twice in the file, a cost and a date that aren't", cl.ok && j(probs(cl)) === j(["Row 3, Software: already has an active licence", "Row 4, Seats: a whole number from 1 to 100,000",
  "Row 5, Renewal date: already past: give the next renewal date", "Row 6, Software: also in row 2", "Row 7, Seats: a whole number from 1 to 100,000", "Row 7, Cost per year: an amount in rupees, like 129600 (at most 2 decimals)", "Row 7, Renewal date: not a date: write it like 2027-01-31"]), j(probs(cl)));
const rl = await E.applyImport(IL.LICENCES_FORM, up(lFile), IT1, cl.token, NOW);
const acro = LI.licencesFor(KABIR).find((l) => l.software === "Adobe Acrobat Pro");
check("LI2", "the licence is added: 15 seats, the renewal, the cost (Finance reads it; IT's read leaves it out), no seat given", rl.ok && acro?.seats === 15 && acro.renewalDate === "2027-06-30" && acro.costPerYear === 54000
  && !("costPerYear" in (LI.licencesFor(IT1).find((l) => l.id === acro.id) ?? { costPerYear: 1 })) && LI.seatsOf(ADMIN, acro.id).length === 0, j(acro));
check("LI3", "HR and Finance may not import licences", !(await chk(IL.LICENCES_FORM, lFile, PRIYA)).ok && !(await chk(IL.LICENCES_FORM, lFile, KABIR)).ok);

// ---------- LB ----------
section("LB  leave balances");
clock("2026-11-28");
const BH = ["Employee", "Leave type", "Days left", "As of"];
const acc = (id, d, t) => LP.leaveAccount(id, d)?.types?.[t];
const before = { on: acc(ROHAN, "2026-11-20", "earned"), prev: acc(ROHAN, "2026-11-19", "earned"), next: acc(ROHAN, "2027-01-05", "earned"), casual: acc(ARJUN, "2026-11-25", "casual") };
const leaveReqs = LS.allRequests().length;
// an approved payroll month (the seed has none): June 2026, stored as payroll-store.js keeps runs (as importexport.mjs does)
mem.set("officeos:payroll-runs", j({ version: 1, nextNum: 2, records: [{ id: "PR-1", month: "2026-06", status: "approved", rows: [] }] }));
let approvedDay = null;
for (let m = 1; m <= 11 && !approvedDay; m += 1) { const d = `2026-${String(m).padStart(2, "0")}-15`; if (S.approvedMonthCovering(d)) approvedDay = d; }
const bFile = csv([BH,
  [ROHAN, "Earned", "7.5", "2026-11-20"], ["arjun.kapoor@northwind.com", "Casual leave", "3", "25-11-2026"], ["priya.nair@northwind.com", "Casual", "3", "2026-11-20"],
  [ROHAN, "earned", "2", "2026-11-21"], [INTERN, "Sick", "2", "2026-11-20"], [DIVYA, "Casual", "1", "2026-11-20"], [HIRE, "Casual", "1", "2026-11-20"],
  [SNEHA, "Work from home", "2", "2026-11-20"], [SNEHA, "Casual", "7.25", "2026-11-20"], [SNEHA, "Sick", "3", "2026-12-01"], [SNEHA, "Earned", "3", "2025-12-30"],
  ...(approvedDay ? [[SNEHA, "Casual", "1", approvedDay]] : [])]);
const cb = await chk(LB.LEAVE_BALANCES_FORM, bFile, PRIYA);
check("LB1", "the check: 2 ready; your own balance, twice in the file, an intern's sick leave, an inactive person, before joining, no balance types, half days only, future, another year, an approved month", cb.ok && cb.summary.ready === 2 && j(probs(cb)) === j([
  "Row 4, Employee: your own balance can't be imported by you: someone else in HR imports it", "Row 5, Employee: also in row 2", "Row 6, Leave type: Kiran Das gets no sick leave (interns don't)", "Row 7, Employee: Divya Menon is inactive",
  "Row 8, As of: before Tara Bose joined", "Row 9, Leave type: use Casual, Sick or Earned (work from home and unpaid leave have no balance)", "Row 10, Days left: whole or half days from 0 to 365, like 7.5", "Row 11, As of: can't be in the future",
  "Row 12, As of: must be in 2026: balances are imported for the current leave year", ...(approvedDay ? ["Row 13, As of: in a payroll month that is already approved: use a later date"] : [])]), j(probs(cb)));
check("LB2", "an approved payroll month was there to try (the seed's)", Boolean(approvedDay), approvedDay);
const rb = await E.applyImport(LB.LEAVE_BALANCES_FORM, up(bFile), PRIYA, cb.token, NOW);
const after = { on: acc(ROHAN, "2026-11-20", "earned"), prev: acc(ROHAN, "2026-11-19", "earned"), later: acc(ROHAN, "2026-11-27", "earned"), next: acc(ROHAN, "2027-01-05", "earned"), casual: acc(ARJUN, "2026-11-25", "casual") };
check("LB3", "on its date the balance left is the file's (7.5 earned; 3 casual)", rb.ok && after.on.left === 7.5 && after.on.usable - after.on.taken === 7.5 && after.casual.left === 3, j([after.on, after.casual]));
check("LB4", "the day before, and the next year, are as they were", j(after.prev) === j(before.prev) && j(after.next) === j(before.next), j([before.prev, after.prev]));
check("LB5", "after the date it counts on from the file's balance (accrual added, never back to the old figure)", after.later.left >= 7.5 && after.later.opening === after.on.opening && after.on.opening === Math.round((7.5 - (before.on.usable - before.on.taken)) * 2) / 2, j([after.later, before.on]));
check("LB6", "stored: one row per person and type, with the balance, its date, the adjustment and who; no leave request made", LO.openingsFor(ROHAN).length === 1 && LO.openingsFor(ROHAN)[0].balance === 7.5 && LO.openingsFor(ROHAN)[0].asOf === "2026-11-20" && LO.openingsFor(ROHAN)[0].byId === PRIYA && LS.allRequests().length === leaveReqs, j(LO.openingsFor(ROHAN)));
const cb2 = await chk(LB.LEAVE_BALANCES_FORM, csv([BH, [ROHAN, "Earned", "4", "2026-11-26"]]), PRIYA);
check("LB7", "the same person and type again this year: a duplicate", cb2.ok && probs(cb2)[0] === "Row 2, Employee: this person's balance of this leave type is already imported for this year" && cb2.summary.duplicates === 1, probs(cb2)[0]);
const out = LP.requestOutcome(ARJUN, "casual", 4, "2026-11-27"), a27 = acc(ARJUN, "2026-11-27", "casual");
check("LB8", "a request is judged against the imported balance (4 casual days against the 3 left, less any pending)", a27.usable - a27.taken === 3 && out?.paid === Math.min(4, Math.max(0, 3 - a27.pending)) && out.paid + out.lop === 4, j([out, a27.pending]));
for (const [n, who] of [["LB9", KABIR], ["LB10", IT1], ["LB11", ARJUN]]) check(n, `${S.getUser(who).name} may not import leave balances`, (await chk(LB.LEAVE_BALANCES_FORM, bFile, who)).code === "not-allowed");
check("LB12", "the Admin may (and Priya's own balance from the Admin is fine)", (await chk(LB.LEAVE_BALANCES_FORM, csv([BH, ["priya.nair@northwind.com", "Casual", "3", "2026-11-20"]]), ADMIN)).summary?.ready === 1);
check("LB13", "an opening adds nothing with none stored (0 for anyone else)", LO.openingAdjust(SNEHA, "casual", "2026-11-27") === 0 && LO.openingAdjust(ROHAN, "earned", "2026-11-19") === 0 && LO.openingAdjust(ROHAN, "earned", "2027-01-05") === 0);

// ---------- AC ----------
section("AC  attendance corrections");
// IT1 (joined 2 Nov, not a sample person: every day is a record or nothing): Mon 23 late, Tue 24 no check-out, Wed 25 nothing, Thu 26 on time
AT.writeShiftCheckIn(IT1, "2026-11-23", "10:20", "office"); AT.writeShiftCheckOut(IT1, "2026-11-23", "18:40");
AT.writeShiftCheckIn(IT1, "2026-11-24", "09:35", "office");
AT.writeShiftCheckIn(IT1, "2026-11-26", "09:30", "office"); AT.writeShiftCheckOut(IT1, "2026-11-26", "18:30");
const visitBox = VS.readBox();
visitBox.visits.push({ id: "VIS-901", personId: IT1, kind: "client", siteName: "Acme Gurugram", address: "", purpose: "Install review", fromDate: "2026-11-20", toDate: "2026-11-20", dates: ["2026-11-20"], status: "approved", days: {}, sameDay: false, approvalPending: false, source: "assigned", history: [] });
VS.writeBox(visitBox);
const pending = AT.requestRegularization(IT1, { date: "2026-11-27", issue: "missed-check-in", time: "09:40", reason: "Forgot" });
const lateBefore = AT.monthFor(IT1, 2026, 11).lateMarks;
const CH = ["Employee", "Date", "What to correct", "Correct time", "Reason"];
const cFile = csv([CH,
  [IT1, "2026-11-23", "Late arrival", "09:30", "Train cancelled; manager confirmed"], ["isha.kulkarni@northwind.com", "24-11-2026", "missed check-out", "6:45 PM", "Badge reader down"], [IT1, "2026-11-25", "Missed check-in", "9:40", "Worked from the client office"],
  [IT1, "2026-11-26", "Late arrival", "09:00", "Not late"], [IT1, "2026-11-23", "Missed check-out", "19:00", "Twice"], [IT1, "2026-11-22", "Missed check-in", "09:30", "Sunday"], [IT1, "2026-11-20", "Missed check-in", "09:30", "Visit"],
  [IT1, "2026-11-27", "Missed check-in", "09:30", "Waiting"], [PRIYA, "2026-11-24", "Missed check-in", "09:30", "Own"], [ROHAN, "2026-11-25", "Late arrival", "09:00", "Sample day"], [IT1, "2026-11-30", "Missed check-in", "09:30", "Future"],
  [IT1, "2026-11-19", "Missed check-in", "25:00", "Bad time"], [IT1, "2026-11-18", "Missed check-in", "19:00", "After the end"], [IT1, "2026-11-17", "Lunch", "09:30", "x"]]);
const snapC = snapKeys();
const cc = await chk(AC.ATTENDANCE_CORRECTIONS_FORM, cFile, PRIYA);
check("AC1", "the check: 3 ready", cc.ok && cc.summary.ready === 3, j(cc.summary));
check("AC2", "every refusal in plain words: not late, twice in the file, a Sunday, a visit day, a correction waiting, your own, a sample day, the future, a bad time, after the day's end, an unknown issue", j(probs(cc)) === j([
  "Row 5, What to correct: the day isn't marked late, so there's no late arrival to correct", "Row 6, Employee: also in row 2", "Row 7, Date: no attendance is needed that day (a holiday, weekend or weekly off)",
  "Row 8, Date: Isha Kulkarni was on a visit that day: the visit's own check-in and check-out count", "Row 9, Date: Isha Kulkarni has a correction waiting for that day: decide it first", "Row 10, Employee: your own attendance can't be corrected by you: someone else in HR does it",
  "Row 11, Date: that day's times are sample data, not a record: only a recorded day can be corrected", "Row 12, Date: can't be in the future", "Row 13, Correct time: not a time: write it like 09:40 or 18:30", "Row 14, Correct time: the corrected check-in has to be before 6:30 PM",
  "Row 15, What to correct: use Late arrival, Missed check-in or Missed check-out", "Row 15, Reason: use 3 to 200 characters"]), j(probs(cc)));
check("AC3", "no ISO date and no record id in any problem", probs(cc).every((p) => !ISO.test(p) && !IDS.test(p)), probs(cc).find((p) => ISO.test(p) || IDS.test(p)));
check("AC4", "the check writes no record", sameSnap(snapC, snapKeys()));
const rc = await E.applyImport(AC.ATTENDANCE_CORRECTIONS_FORM, up(cFile), PRIYA, cc.token, NOW);
const d23 = AT.dayFor(IT1, "2026-11-23"), d24 = AT.dayFor(IT1, "2026-11-24"), d25 = AT.dayFor(IT1, "2026-11-25");
check("AC5", "the late arrival is corrected: 09:30, not late, the 10:20 kept as the original, marked corrected", rc.ok && d23.checkIn === "09:30" && d23.minutesLate === 0 && d23.originalCheckIn === "10:20" && d23.regularized, j([d23.checkIn, d23.minutesLate, d23.originalCheckIn]));
check("AC6", "the missed check-out (6:45 PM read as 18:45) and the missed check-in are written", d24.checkOut === "18:45" && d25.checkIn === "09:40", j([d24.checkOut, d25.checkIn]));
const regs = AT.regularizationsFor(IT1).filter((r) => r.importedBy === PRIYA);
check("AC7", "each is kept as a correction, approved by the importer (the person's own request stays pending)", regs.length === 3 && regs.every((r) => r.status === "approved" && r.history.length === 1 && r.history[0].byUserId === PRIYA && r.history[0].decision === "approved") && AT.getRegularization(pending.record.id).status === "pending", j(regs.map((r) => [r.status, r.date])));
check("AC8", "the late marks follow (one fewer)", AT.monthFor(IT1, 2026, 11).lateMarks === lateBefore - 1, `${lateBefore} -> ${AT.monthFor(IT1, 2026, 11).lateMarks}`);
const cc2 = await chk(AC.ATTENDANCE_CORRECTIONS_FORM, csv([CH, [IT1, "2026-11-24", "Missed check-out", "19:00", "Again"], [IT1, "2026-11-25", "Missed check-in", "09:00", "Again"], ...(approvedDay ? [[IT1, approvedDay, "Missed check-in", "09:30", "Old"]] : [])]), PRIYA);
check("AC9", "a corrected day can't take the same correction again; an approved payroll month is refused", j(probs(cc2)) === j(["Row 2, What to correct: a check-out at 18:45 is already recorded that day", "Row 3, What to correct: a check-in at 09:40 is already recorded: use Late arrival to correct it",
  ...(approvedDay ? ["Row 4, Date: in a payroll month that is already approved: its pay can't change"] : [])]), j(probs(cc2)));
for (const [n, who] of [["AC10", KABIR], ["AC11", IT1], ["AC12", SNEHA]]) check(n, `${S.getUser(who).name} may not import attendance corrections (a manager neither)`, (await chk(AC.ATTENDANCE_CORRECTIONS_FORM, cFile, who)).code === "not-allowed");
// from the shift rules' start (1 Dec 2026): IT1 on the Early shift (06:00-15:00) from 1 Dec
clock("2026-12-09");
SA.assignShift(PRIYA, IT1, "SH-2", "2026-12-01", null, "Early from December", "2026-11-28");
AT.writeShiftCheckIn(IT1, "2026-12-07", "06:40", "office"); AT.writeShiftCheckOut(IT1, "2026-12-07", "15:10");
AT.writeShiftCheckIn(IT1, "2026-12-08", "09:00", "office"); AT.writeShiftCheckOut(IT1, "2026-12-08", "18:00");
const sd7 = SD.shiftDayFor(IT1, "2026-12-07");
const cs3 = await chk(AC.ATTENDANCE_CORRECTIONS_FORM, csv([CH, [IT1, "2026-12-07", "Late arrival", "06:05", "Gate pass delay"], [IT1, "2026-12-03", "Missed check-in", "15:30", "After the shift"], [IT1, "2026-12-04", "Missed check-in", "06:00", "Early start"]]), PRIYA);
check("AC13", "under the shift rules: late by the Early shift (06:40), a check-in after 3:00 PM refused (the shift's end, not 6:30 PM)", sd7.rules === "shift" && sd7.minutesLate > 0 && cs3.ok && j(probs(cs3)) === j(["Row 3, Correct time: the corrected check-in has to be before 3:00 PM"]), j([sd7.rules, sd7.minutesLate, probs(cs3)]));
const rs3 = await E.applyImport(AC.ATTENDANCE_CORRECTIONS_FORM, up(csv([CH, [IT1, "2026-12-07", "Late arrival", "06:05", "Gate pass delay"], [IT1, "2026-12-04", "Missed check-in", "06:00", "Early start"]])), PRIYA, (await chk(AC.ATTENDANCE_CORRECTIONS_FORM, csv([CH, [IT1, "2026-12-07", "Late arrival", "06:05", "Gate pass delay"], [IT1, "2026-12-04", "Missed check-in", "06:00", "Early start"]]), PRIYA)).token, NOW);
check("AC14", "applied: the shift's day reads on time", rs3.ok && SD.shiftDayFor(IT1, "2026-12-07").minutesLate === 0 && SD.shiftDayFor(IT1, "2026-12-04").checkIn === "06:00", j(SD.shiftDayFor(IT1, "2026-12-07")).slice(0, 200));
const cs4 = await chk(AC.ATTENDANCE_CORRECTIONS_FORM, csv([CH, [IT1, "2026-12-08", "Late arrival", "08:00", "Not late under General, late under Early"]]), PRIYA);
check("AC15", "a day the Early shift calls late (09:00) can be corrected though General wouldn't", cs4.ok && cs4.summary.ready === 1, probs(cs4));

// ---------- G ----------
section("G  the engine, shared");
const forms = ["assets", "stock-opening", "licences", "leave-balances", "attendance-corrections"];
const H = hist().filter((e) => e.kind === "import" && forms.includes(e.form));
check("G1", "the history keeps a generic file name for every I2 form, never the uploaded one", H.length > 10 && H.every((e) => e.fileName === `${e.form}-file.csv`) && !j(hist()).includes("Rohan Gupta's list"), j([...new Set(H.map((e) => e.fileName))]));
check("G2", "the audit trail too: no uploaded file name", !j(audit()).includes("Rohan Gupta's list"));
const em = await chk(IE.EMPLOYEES_FORM, "Full name,Work email\r\nA,b", PRIYA, "people.csv");
check("G3", "I1's employees form keeps the uploaded name as before", hist().at(-1).form === "employees" && hist().at(-1).fileName === "people.csv", hist().at(-1).fileName);
check("G4", "an .xlsx upload is named <form>-file.xlsx; a file refused unread too", E.keptName(LB.LEAVE_BALANCES_FORM, "C:\\HR\\Rohan's balances.xlsx") === "leave-balances-file.xlsx" && E.refuseUnread(LB.LEAVE_BALANCES_FORM, PRIYA, { name: "Rohan's.csv", size: 3 * 1024 * 1024 }).code === "too-big" && hist().at(-1).fileName === "leave-balances-file.csv");
const gFile = csv([LH, ["Miro", "", "5", "", "2027-05-01"]]);
const g1 = await imp(IL.LICENCES_FORM, gFile, IT1);
const again = await E.applyImport(IL.LICENCES_FORM, up(gFile), IT1, g1.check.token, NOW);
check("G5", "a token used again: refused, with no id in the words", g1.apply.ok && !again.ok && again.code === "already-imported" && again.error === "This file was already imported: nothing was imported again." && !IDS.test(again.error), again.error);
const bad = await chk(IL.LICENCES_FORM, csv([LH, ["Notion", "", "5", "", "2027-05-01"], ["Linear", "", "5", "", "2027-05-01"]]), IT1);
const licBefore = mem.get("officeos:it-licences");
let n = 0;
failWrite = (k) => k === "officeos:it-licences" && ++n === 2;
const quiet = console.error; console.error = () => {};   // the storage module reports the failed write; expected here
const rbk = await E.applyImport(IL.LICENCES_FORM, up(csv([LH, ["Notion", "", "5", "", "2027-05-01"], ["Linear", "", "5", "", "2027-05-01"]])), IT1, bad.token, NOW);
failWrite = null;
console.error = quiet;
check("G6", "nothing half-imported: the second licence's save fails, the first is taken back too", !rbk.ok && rbk.code === "rolled-back" && mem.get("officeos:it-licences") === licBefore && hist().at(-1).status === "failed", j([rbk.code, rbk.error]));
const xb = XL.writeXlsx([LH, ["Notion", "", "5", "", "2027-05-01"]]);
const cx = await E.checkImport(IL.LICENCES_FORM, { bytes: xb, name: "lic.xlsx" }, IT1, NOW);
check("G7", "an Excel file checks the same way (and is named licences-file.xlsx)", cx.ok && cx.summary.ready === 1 && hist().at(-1).fileName === "licences-file.xlsx", j(cx.summary));
const pt = await chk(LB.LEAVE_BALANCES_FORM, csv([BH, [SNEHA, "Casual", "2", "2026-11-20"], [SNEHA, "Casual", "1", "2026-11-21"], [SNEHA, "Sick", "1", "2026-11-21"]]), PRIYA);
check("G8", "a two-column key: the same person and type twice is a duplicate, another type is not", pt.ok && pt.summary.ready === 2 && pt.summary.duplicates === 1, j(pt.summary));
check("G10", "a store's sentence in plain words: an ISO date reads 22 Nov 2026, a record id goes", CM.plain("Date can't be after 2026-11-22.") === "Date can't be after 22 Nov 2026." && CM.plain("No licence LIC-7 (EMP-1042).") === "No licence." && CM.plain("Tag AST-0003 stays") === "Tag AST-0003 stays", CM.plain("No licence LIC-7 (EMP-1042)."));
check("G9", "the history's problems hold no value from a file", H.every((e) => !j(e.problems ?? []).includes("Nowhere") && !j(e.problems ?? []).includes("Nobody & Co")));

// ---------- C ----------
section("C  no sign-ins");
const creds = JSON.parse(mem.get("officeos:credentials") ?? "{}");
check("C1", "no import made a sign-in (no account for anyone made or touched here)", !j(creds).includes(IT1) && !j(creds).includes(HIRE) && audit().filter((e) => /^account-/.test(e.kind)).length === 0, Object.keys(creds));

// ---------- EX ----------
section("EX  record exports");
const exp = (who, m, o = {}) => X.exportFile(who, m, { from: "2026-11-01", to: "2026-11-30", format: "csv", now: NOW, ...o });
const head = (r) => (r.text ?? "").replace(/^\uFEFF/, "").split("\r\n")[0];
const lines = (r) => (r.text ?? "").replace(/^\uFEFF/, "").split("\r\n").filter(Boolean);
const who6 = { leave: [ADMIN, PRIYA], attendance: [ADMIN, PRIYA], expenses: [KABIR], visits: [ADMIN, PRIYA], tasks: [ADMIN, PRIYA], payroll: [ADMIN, PRIYA, KABIR] };
for (const [k, m] of Object.entries(XR.RECORD_MODULES)) {
  const okFor = who6[k];
  const res = [];
  for (const id of [ADMIN, PRIYA, KABIR, ARJUN, IT1, SNEHA]) res.push([id, (await exp(id, k, { from: "2026-01-01", to: "2026-12-31", ...(k === "attendance" ? { from: "2026-11-01", to: "2026-11-30" } : {}) })).code ?? "ok"]);
  check(`EX-${k}`, `${m.label}: only ${okFor.map((x) => S.getUser(x).name).join(", ")} may export`, res.every(([id, c]) => (okFor.includes(id) ? c === "ok" || c === "empty" : c === "not-allowed")), j(res));
}
const lv = await exp(PRIYA, "leave", { from: "2026-01-01", to: "2026-12-31" });
const lvWant = LS.allRequests().filter((r) => r.from <= "2026-12-31" && r.to >= "2026-01-01").length;
check("EX1", "leave: one row per request touching the range, the columns, the file's name", lv.ok && lv.rows === lvWant && lines(lv).length === lvWant + 1 && head(lv) === "Request ID,Employee ID,Employee,Department,Leave type,From (YYYY-MM-DD),To (YYYY-MM-DD),Duration,Days,Status,Applied on (YYYY-MM-DD),Reason" && lv.name === "leave-2026-01-01-to-2026-12-31.csv", `${lv.rows} / ${lvWant} ${head(lv)}`);
const at = await exp(PRIYA, "attendance", { from: "2026-11-23", to: "2026-11-27" });
const isha = lines(at).filter((l) => l.startsWith(`${IT1},`));
check("EX2", "attendance: a row per person and day; the corrected day says so; days before joining are left out", at.ok && isha.length === 5 && /,2026-11-23,Present,General,09:30,18:40,[\d.]+,,Office,Yes$/.test(isha[0]) && !lines(at).some((l) => l.startsWith(`${HIRE},`) && l.includes(",2026-11-23,")) && lines(at).some((l) => l.startsWith(`${HIRE},`) && l.includes(",2026-11-25,")), isha[0]);
check("EX3", "attendance: at most 92 days", (await exp(PRIYA, "attendance", { from: "2026-08-01", to: "2026-11-01" })).code === "range" && (await exp(PRIYA, "attendance", { from: "2026-08-01", to: "2026-10-31" })).ok);
const ex26 = await exp(KABIR, "expenses", { from: "2025-12-01", to: "2026-11-30" });
const claims = EX.allExpenses().filter((c) => c.date >= "2025-12-01" && c.date <= "2026-11-30");
check("EX4", "expenses (Finance): the claims spent in the range; whether a receipt is attached, never its name", claims.length > 0 && ex26.ok && ex26.rows === claims.length && head(ex26).includes("Receipt attached") && claims.filter((c) => c.receipt).every((c) => !ex26.text.includes(c.receipt)), `${ex26.rows} / ${claims.length}`);
check("EX5", "the Admin is refused the expenses file, in plain words, and it is logged", (await exp(ADMIN, "expenses")).error === "You can't export expenses." && audit().some((e) => e.kind === "export-refused" && e.actorId === ADMIN && /Expenses/.test(e.detail)));
const vs = await exp(PRIYA, "visits", { from: "2026-11-20", to: "2026-11-20" });
check("EX6", "visits: exactly the visits touching the range, the site; no location reading or address column", vs.ok && vs.rows === VS.allVisits().filter((x) => x.fromDate <= "2026-11-20" && x.toDate >= "2026-11-20").length && vs.text.includes("VIS-901") && vs.text.includes("Acme Gurugram") && !/lat|lng|accuracy|address/i.test(head(vs)), head(vs));
check("EX6b", "visits: a range with no visit in it has nothing to export", (await exp(PRIYA, "visits", { from: "2026-10-01", to: "2026-10-02" })).code === "empty");
clock("2026-11-28");
TK.createPersonalTask(PRIYA, { title: "SECRET personal: dentist", dueDate: "2026-12-02" }, NOW);
TK.createPersonalTask(ARJUN, { title: "SECRET personal: rent", dueDate: "2026-12-02" }, NOW);
const wt = TK.createWorkTask(PRIYA, { title: "=HYPERLINK(\"x\") Prepare the audit pack", assigneeId: ARJUN, dueDate: "2026-12-03", priority: "high" }, NOW);
const tk = await exp(PRIYA, "tasks", { from: "2026-12-01", to: "2026-12-31" });
check("EX7", "work tasks: the task assigned; personal tasks never, not even the exporter's own", wt.ok && tk.ok && tk.text.includes("Prepare the audit pack") && !tk.text.includes("SECRET") && lines(tk).slice(1).every((l) => l.startsWith("WT-")), tk.error ?? tk.rows);
check("EX8", "formula injection: a title starting with = gets an apostrophe", tk.text.includes("'=HYPERLINK"));
const tkA = await exp(ADMIN, "tasks", { from: "2026-12-01", to: "2026-12-31" });
check("EX9", "the Admin's file has no personal task either", tkA.ok && !tkA.text.includes("SECRET"));
const py = await exp(KABIR, "payroll", { from: "2026-10-01", to: "2026-10-31" });
const acct = S.getUser(ADMIN).bankAccount ?? "";
check("EX10", "payroll register (Finance): a row per person, pay and deductions, bank account and PAN masked", py.ok && py.rows >= 9 && head(py).startsWith("Month (YYYY-MM),Employee ID,Employee,Department,Monthly gross") && acct.length > 4 && !py.text.includes(acct) && py.text.includes(acct.slice(-4)), `${py.rows} ${head(py)}`);
check("EX11", "Finance can't ask for the full numbers (no pii:view)", (await exp(KABIR, "payroll", { includeSensitive: true })).code === "sensitive");
const pyM = await exp(PRIYA, "payroll", { from: "2026-10-01", to: "2026-10-31" });
check("EX12b", "HR's payroll file is masked unless HR asks", pyM.ok && !pyM.text.includes(acct) && pyM.text.includes(acct.slice(-4)) && hist().at(-1).sensitive === false);
const pyH = await exp(PRIYA, "payroll", { from: "2026-10-01", to: "2026-10-31", includeSensitive: true });
check("EX12", "HR may ask for the full numbers: they are in the file, and the history and audit trail say so", pyH.ok && pyH.text.includes(acct) && hist().at(-1).sensitive === true && /IN FULL/.test(audit().filter((e) => e.kind === "export-done").at(-1).detail));
check("EX13", "payroll: at most 12 months (13 months in 336 days refused)", (await exp(KABIR, "payroll", { from: "2025-10-31", to: "2026-10-01" })).error === "At most 12 months can be exported at once. Choose a shorter range." && (await exp(KABIR, "payroll", { from: "2025-11-01", to: "2026-10-31" })).ok);
check("EX13b", "payroll: a month with a stored run reads that run (June's approved run here holds no rows), not a fresh draft", (await exp(KABIR, "payroll", { from: "2026-06-01", to: "2026-06-30" })).code === "empty" && (await exp(KABIR, "payroll", { from: "2026-07-01", to: "2026-07-31" })).ok);
check("EX14", "a range backwards, missing or not a date is refused in words", (await exp(PRIYA, "leave", { from: "2026-11-30", to: "2026-11-01" })).error === "The start date is after the end date: swap them." && (await exp(PRIYA, "leave", { from: "" })).code === "range" && (await exp(PRIYA, "leave", { to: "2026-02-30" })).code === "range");
check("EX15", "a range with nothing in it", (await exp(PRIYA, "leave", { from: "2030-01-01", to: "2030-01-31" })).error === "There is nothing to export between those dates.");
check("EX16", "more than a year refused", (await exp(PRIYA, "leave", { from: "2025-01-01", to: "2026-01-02" })).code === "range");
const xx = await exp(PRIYA, "attendance", { from: "2026-11-23", to: "2026-11-27", format: "xlsx" });
const back = xx.ok ? XL.readXlsx(xx.bytes, { rows: 2000 }) : null;
check("EX17", "Excel: the same table", xx.ok && xx.name.endsWith(".xlsx") && back?.ok && back.records[0].cells[0] === "Employee ID" && back.records.length === at.rows + 1, j([xx.name, back?.records?.length, at.rows]));
const last = hist().filter((e) => e.kind === "export" && e.status === "exported").at(-1);
check("EX18", "each export is in the history: module, range, rows, format, never the contents", last.module === "attendance" && last.from === "2026-11-23" && last.to === "2026-11-27" && last.rows === at.rows && last.format === "xlsx" && !j(last).includes("09:30"), j(last));
check("EX19", "the ids and dates in a person's words: none (a refusal names no id or ISO date)", [(await exp(ADMIN, "expenses")).error, (await exp(PRIYA, "leave", { from: "2030-01-01", to: "2030-01-31" })).error, (await exp(PRIYA, "attendance", { from: "2026-01-01", to: "2026-11-01" })).error].every((t) => !ISO.test(t) && !IDS.test(t)));
check("EX20", "recordModulesFor: HR five, Finance two, the Admin five, an employee none", j(["hr", "fin", "admin", "emp"].map((r) => XR.recordModulesFor(S.getAllUsers().find((u) => u.role === r)).length)) === j([5, 2, 5, 0]));

console.log(`\ni2: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);