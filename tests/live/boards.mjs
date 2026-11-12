// usage: node boards.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 9B: the dashboards' static content, in jsdom with the js in ./js.
//   A  HR dashboard: New joiners, this calendar month's, from store.js's joiningDate(); the no-date note; zero
//   B  Admin dashboard: Low-stock items from reorderAlerts(), only with inventory:view (HR by URL sees none of it)
//   C  Admin dashboard: Pending approvals from ui/waiting.js's waitingFor(), = the sidebar count = the inbox's real rows
//   D  Admin dashboard: Recent activity, each source only with the permission that shows it elsewhere
//   E  "Sample, not built yet": the HR recruitment parts, job-openings, candidates, the Employee offsite line,
//      announcements.html's false alert replaced
//   F  hygiene: the changed files, line endings, no innerHTML, no page errors
// The clock is local wall time, Wed 7 Oct 2026 10:00 unless a test moves it; the seed is generated around "now"
// when storage is first read, so each scenario sets the clock before fresh().
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const PAGE = {
  admin: ["dashboard/admin.html", "admin-dashboard"], hr: ["dashboard/hr.html", "hr-dashboard"], emp: ["dashboard/employee.html", "employee-dashboard"],
  inbox: ["requests/approvals-inbox.html", "approvals-inbox"], items: ["inventory/items.html", "items"],
};
const HTML = Object.fromEntries(Object.entries(PAGE).map(([k, [p]]) => [k, fs.readFileSync(`${DIR}/${p}`, "utf8")]));
const RAW = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const SRC = (p) => fs.readFileSync(new URL(`./js/${p}`, import.meta.url), "utf8");
const ADMIN_JS = SRC("pages/admin-dashboard.js"), HR_JS = SRC("pages/hr-dashboard.js");

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

const WHO = {
  aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"],
  kabir: ["fin", "Kabir Shah", "EMP-1008"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"], old: ["admin", "Aarav Mehta", undefined],
};

let loads = 0, w = null, d = null, saved = {};
const jsErrors = [], htmlWrites = [];
let navigations = [];
async function open(who, page) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(`${who}: ${e.message}`); else jsErrors.push(`${who} ${page}: ${e.message}`); });
  const dom = new JSDOM(HTML[page], { url: `http://localhost/office-os/pages/${PAGE[page][0]}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  const proto = w.Element.prototype;
  const inner = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", { get: inner.get, set(v) { htmlWrites.push(String(v)); inner.set.call(this, v); }, configurable: true });
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  navigations = [];
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${PAGE[page][1]}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }
async function at(y, mo, dd, who, page, h = 10) { setNow(y, mo, dd, h); fresh(); await open(who, page); }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const $ = (id) => d.getElementById(id);
const statEl = (key) => d.querySelector(`[data-stat="${key}"]`);
const stat = (key) => { const s = statEl(key); return `${txt(s.querySelector(".stat__value"))} (${txt(s.querySelector(".stat__delta"))})`; };
const label = (key) => txt(statEl(key).querySelector(".stat__label"));
const tone = (key) => statEl(key).querySelector(".stat__delta").className;
const parse = (html) => new JSDOM(html).window.document;
const STATIC = Object.fromEntries(Object.keys(HTML).map((k) => [k, parse(HTML[k])]));
const sameMain = (page) => d.querySelector("main").innerHTML.replaceAll(' hidden=""', "") === STATIC[page].querySelector("main").innerHTML;
// The text of a list / activity item without its avatar initials.
function parts(node) {
  const out = [];
  const walker = node.ownerDocument.createTreeWalker(node, 4);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) { if (t.parentElement.closest(".avatar")) continue; const v = t.textContent.replace(/\s+/g, " ").trim(); if (v) out.push(v); }
  return out.join(" | ");
}
const approvals = () => [...$("admin-approvals").querySelectorAll(".list > *")].map(parts);
const approvalsMeta = () => txt($("admin-approvals").querySelector(".card__meta"));
const acts = () => [...$("admin-activity").children].map(parts);
const actDots = () => [...$("admin-activity").querySelectorAll(".activity__dot")].map((s) => s.className.replace("activity__dot activity__dot--", ""));
const actMeta = () => txt($("admin-activity-meta"));
const sidebarCount = () => txt(d.querySelector('.nav__item[data-count-waiting] .nav__count')) ?? "0";
const exportStats = async () => {
  blobs = [];
  d.querySelector("[data-export]").click();
  const files = await Promise.all(blobs.map(async (b) => (await b.text()).replace(/^﻿/, "").split("\r\n")));
  return files.find((f) => f[0] === "Metric,Value") ?? [];
};

const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const L = await import("./js/data/leave-store.js");
const A = await import("./js/data/attendance-store.js");
const E = await import("./js/data/expenses-store.js");
const AR = await import("./js/data/asset-requests-store.js");
const I = await import("./js/data/inventory-store.js");
const WT = await import("./js/ui/waiting.js");
const { ROLES } = await import("./js/config/roles.js");
const ROUTES = (await import("./js/config/routes.js")).ROUTES;
// Runs fn with a role missing some permissions (the page reads ROLES through auth.js's getCurrentRole()).
async function without(roleKey, drop, fn) {
  const role = ROLES[roleKey], had = role.permissions;
  role.permissions = had.filter((p) => !drop.includes(p));
  try { await fn(); } finally { role.permissions = had; }
}
const SAMPLE = "Sample, not built yet";

// =====================================================================
section("A. New joiners (HR dashboard)");
await at(2026, 10, 7, "priya", "hr");
check("A1", "seeded, Wed 7 Oct: 'New joiners, Oct' 0, with a real zero sentence and the 5 of 9 active people with no joining date on file (Ananya, Meera, Sneha, Rohan, Vikram; Divya is inactive)",
  label("joiners") === "New joiners, Oct" && stat("joiners") === "0 (No one joins this month; no joining date on file for 5 of 9)", `${label("joiners")} ${stat("joiners")}`);
check("A2", "…the count matches the store directly (active people with a joining date this month)", S.getAllUsers().filter((u) => u.status !== "inactive" && S.joiningDate(u.dateOfJoining)?.startsWith("2026-10")).length === 0
  && S.getAllUsers().filter((u) => u.status !== "inactive" && !S.joiningDate(u.dateOfJoining)).length === 5);
check("A3", "…the zero isn't blank, and the invented 'Sep: 5' and 'Onboarding in progress' are gone", txt(statEl("joiners").querySelector(".stat__delta")) !== "" && !/Onboarding|Sep/.test(txt(statEl("joiners"))) && tone("joiners") === "stat__delta");
const ravi = S.addUser(USER_ACTOR("admin", null), { name: "Ravi Kumar", email: "ravi.kumar@northwind.com", department: "ENG", designation: "Engineer", dateOfJoining: "19 Oct 2026" }).record;
await open("priya", "hr");
check("A4", "someone joining later this month (19 Oct) counts, and the note says so: 1, '1 still to join; … 5 of 10'", stat("joiners") === "1 (1 still to join; no joining date on file for 5 of 10)", stat("joiners"));
S.addUser(USER_ACTOR("admin", null), { name: "Tara Bose", email: "tara.bose@northwind.com", department: "SAL", designation: "Sales", dateOfJoining: "1 Oct 2026" });
await open("priya", "hr");
check("A5", "…plus one who joined on 1 Oct: 2, still 1 to join", stat("joiners") === "2 (1 still to join; no joining date on file for 5 of 11)", stat("joiners"));
setNow(2026, 10, 19, 10); await open("priya", "hr");
check("A6", "on 19 Oct (Ravi's first day): both have started", stat("joiners") === "2 (All already started; no joining date on file for 5 of 11)", stat("joiners"));
setNow(2026, 11, 2, 10); await open("priya", "hr");
check("A7", "on 2 Nov: 'New joiners, Nov' 0 (October's joiners don't carry over)", label("joiners") === "New joiners, Nov" && stat("joiners") === "0 (No one joins this month; no joining date on file for 5 of 11)", `${label("joiners")} ${stat("joiners")}`);
setNow(2026, 9, 15, 10); await open("priya", "hr");
check("A8", "on 15 Sep: 'New joiners, Sep' 0 (joiners of a later month aren't counted early)", label("joiners") === "New joiners, Sep" && stat("joiners").startsWith("0 (No one joins this month"), `${label("joiners")} ${stat("joiners")}`);
await at(2026, 10, 7, "priya", "hr");
S.updateUser(USER_ACTOR("admin", "EMP-1029"), "EMP-1029", { dateOfJoining: "6 Oct 2026" });
await open("priya", "hr");
check("A9", "one joiner who has started: 'Already started'; the no-date count drops to 4", stat("joiners") === "1 (Already started; no joining date on file for 4 of 9)", stat("joiners"));
S.updateUser(USER_ACTOR("admin", "EMP-1023"), "EMP-1023", { dateOfJoining: "2 Oct 2026" });   // Meera, on leave
S.updateUser(USER_ACTOR("admin", "EMP-1061"), "EMP-1061", { dateOfJoining: "5 Oct 2026" });   // Divya, inactive
await open("priya", "hr");
check("A10", "someone on leave counts (Meera, as the headcount counts her); someone inactive doesn't (Divya)", stat("joiners") === "2 (All already started; no joining date on file for 3 of 9)", stat("joiners"));
S.updateUser(USER_ACTOR("admin", "EMP-1042"), "EMP-1042", { dateOfJoining: "sometime in Oct" });
await open("priya", "hr");
check("A11", "an unreadable joining date isn't counted as a joiner and counts as no date on file (as payroll reads it)", stat("joiners") === "2 (All already started; no joining date on file for 3 of 9)", stat("joiners"));
["EMP-1017", "EMP-1042", "EMP-1088"].forEach((id, i) => S.updateUser(USER_ACTOR("admin", id), id, { dateOfJoining: `${i + 1} Mar 2021` }));
await open("priya", "hr");
check("A12", "everyone has a date: the note leaves the no-date part out", stat("joiners") === "2 (All already started)", stat("joiners"));
await at(2027, 1, 5, "priya", "hr");
S.addUser(USER_ACTOR("admin", null), { name: "Old Joiner", email: "old.joiner@northwind.com", department: "ENG", designation: "Engineer", dateOfJoining: "5 Jan 2026" });
S.addUser(USER_ACTOR("admin", null), { name: "New Joiner", email: "new.joiner@northwind.com", department: "ENG", designation: "Engineer", dateOfJoining: "4 Jan 2027" });
await open("priya", "hr");
check("A13", "across a year: on 5 Jan 2027 only January 2027 counts (5 Jan 2026 doesn't)", label("joiners") === "New joiners, Jan" && stat("joiners") === "1 (Already started; no joining date on file for 5 of 11)", `${label("joiners")} ${stat("joiners")}`);
await at(2026, 10, 7, "priya", "hr");
const hrCsv = await exportStats();
check("A14", "the HR dashboard's stats export carries the new label and value", hrCsv.includes("\"New joiners, Oct\",0") || hrCsv.includes("New joiners, Oct,0"), j(hrCsv));
check("A15", "the static HTML holds no invented figure: 'New joiners', '—', an empty note", txt(STATIC.hr.querySelector('[data-stat="joiners"] .stat__label')) === "New joiners" && txt(STATIC.hr.querySelector('[data-stat="joiners"] .stat__value')) === "—" && txt(STATIC.hr.querySelector('[data-stat="joiners"] .stat__delta')) === "");
check("A16", "the script reads the date through store.js's joiningDate() (one parser, 8F)", /import \{[^}]*joiningDate[^}]*\} from "\.\.\/data\/store\.js"/.test(HR_JS) && !/function joiningDate|MONTHS/.test(HR_JS));

// =====================================================================
section("B. Low-stock items (Admin dashboard), gated on inventory:view");
await at(2026, 10, 7, "aarav", "admin");
check("B1", "Aarav (Admin): 4, '1 out of stock, 3 low', in the down colour", stat("stock") === "4 (1 out of stock, 3 low)" && tone("stock") === "stat__delta stat__delta--down" && !statEl("stock").hidden, `${stat("stock")} ${tone("stock")}`);
check("B2", "…= reorderAlerts() (HDMI cable out; keyboard, coffee beans, A4 paper low)", I.reorderAlerts().length === 4 && j(I.reorderAlerts().map((i) => `${i.sku}:${i.status}`)) === j(["IT-1102:out", "IT-1044:low", "PAN-4002:low", "STA-3001:low"]));
const adminCsv = await exportStats();
// Round 9J (behaviour; was "Low-stock items,4"): the stat is labelled "Items to reorder"
check("B3", "…the Admin's stats export carries it (Round 9J: 'Items to reorder', was 'Low-stock items')", adminCsv.includes("Items to reorder,4"), j(adminCsv));
await open("aarav", "items");
const itemsLow = Number(txt(d.querySelector('[data-stat="low"] .stat__value'))), itemsOut = Number(txt(d.querySelector('[data-stat="out"] .stat__value')));
check("B4", "…items.html agrees: Low 3 + Out 1, and its reorder card lists 4", itemsLow === 3 && itemsOut === 1 && d.querySelectorAll("#reorder-list .list__item").length === 4, `${itemsLow} ${itemsOut}`);
await open("priya", "admin");
check("B5", "Priya (HR) opens admin.html by URL and stays (attendance:view-all), with no inventory permission", navigations.length === 0 && !ROLES.hr.permissions.some((p) => p.startsWith("inventory:")) && ROUTES["inventory/items.html"] === "inventory:view");
check("B6", "…the Low-stock stat is hidden AND never filled: '—', no note, no tone", statEl("stock").hidden && stat("stock") === "— ()" && tone("stock") === "stat__delta", `${statEl("stock").hidden} ${stat("stock")}`);
const hrAdminCsv = await exportStats();
check("B7", "…her stats export carries no stock figure (a stat hidden by its permission exports as an empty row, as the payroll one already does)", hrAdminCsv.length === 5 && hrAdminCsv.filter((l) => l === ",").length === 2 && !hrAdminCsv.some((l) => /Low-stock|stock/i.test(l)), j(hrAdminCsv));
// Round 9J (behaviour; was the whole of main): the hidden stat's own label, now "Items to reorder", holds the word
// "reorder" for every role (as "Low-stock items" held "stock"); it's a name, not a figure (B6: the value stays "—")
check("B8", "…no inventory figure or item anywhere in the page's main (Round 9J: the hidden stat's label aside)", !/out of stock|HDMI|Logitech|Coffee beans|A4 paper|reorder/i.test(txt(d.querySelector("main")).replace("Items to reorder", "")) && txt(statEl("stock").querySelector(".stat__label")) === "Items to reorder", txt(d.querySelector("main")).slice(0, 80));
await without("admin", ["inventory:view"], async () => { await open("aarav", "admin"); });
check("B9", "an Admin role without inventory:view sees it the same way (the gate is the permission, not the role)", statEl("stock").hidden && stat("stock") === "— ()");
await open("aarav", "admin");
I.recordMovement("EMP-1001", { sku: "IT-1102", type: "in", quantity: 30, reference: "PO-1" });
await open("aarav", "admin");
check("B10", "HDMI cables restocked: 3, '3 low' (no out-of-stock part)", stat("stock") === "3 (3 low)", stat("stock"));
[["IT-1044", 10], ["PAN-4002", 10], ["STA-3001", 50]].forEach(([sku, n]) => I.recordMovement("EMP-1001", { sku, type: "in", quantity: n, reference: "PO-2" }));
await open("aarav", "admin");
check("B11", "everything restocked: 0, 'Nothing below its reorder level', no down colour", stat("stock") === "0 (Nothing below its reorder level)" && tone("stock") === "stat__delta", `${stat("stock")} ${tone("stock")}`);
const outAll = (sku) => I.recordMovement("EMP-1001", { sku, type: "out", quantity: I.stockOf(sku), reference: "Used up" }).ok;
const emptied = outAll("PAN-4002") && outAll("IT-1102");
await open("aarav", "admin");
check("B12", "only out of stock: 2, '2 out of stock'", emptied && stat("stock") === "2 (2 out of stock)", stat("stock"));
check("B13", "the HTML hides it without inventory:view and holds no invented figure ('—'; '3 awaiting approval' gone: no purchase orders exist)",
  STATIC.admin.querySelector('[data-stat="stock"]').dataset.permission === "inventory:view" && txt(STATIC.admin.querySelector('[data-stat="stock"] .stat__value')) === "—" && !/awaiting approval/.test(HTML.admin));
check("B14", "the script draws it only with can(\"inventory:view\")", /if \(can\("inventory:view"\)\) renderStock\(\);/.test(ADMIN_JS));

// =====================================================================
section("C. Pending approvals (Admin dashboard), from waitingFor()");
await at(2026, 10, 7, "aarav", "admin");
const aaravWaiting = WT.waitingCount("EMP-1001", "admin");
// Round 12Z (behavior; was four lists, [3, 3, 1, 1]): waitingFor() lists salary changes too (salinbox.mjs P2)
check("C1", "Aarav: '4 of 8 shown'; 8 = waitingCount() (3 leave, 3 corrections, 1 expense claim, 1 asset request, 0 salary changes)", approvalsMeta() === "4 of 8 shown" && aaravWaiting === 8
  && j(Object.values(WT.waitingFor("EMP-1001", "admin")).map((l) => l.length)) === j([3, 3, 1, 1, 0]), `${approvalsMeta()} ${aaravWaiting}`);
check("C2", "…the sidebar's Approvals count on this same page says 8", sidebarCount() === "8", sidebarCount());
const aaravShown = approvals();
check("C3", "…newest sent first, each kind in its own words, each with a Review link to the inbox (nothing decided here)", j(aaravShown) === j([
  "Regularization: Vikram Singh | 1 Oct: Late arrival, 10:24 to 09:30 | Review",
  "Regularization: Sneha Rao | 29 Sep: Late arrival, 10:02 to 09:30 | Review",
  "Regularization: Ananya Iyer | 28 Sep: Missed check-out, 18:00 | Review",
  "Priya Nair, work from home | 7 Oct, 1 day | Review"]) && [...$("admin-approvals").querySelectorAll("a")].every((a) => a.getAttribute("href") === "../requests/approvals-inbox.html")
  && !$("admin-approvals").querySelector("button"), j(aaravShown));
await open("aarav", "inbox");
const inboxReal = () => d.querySelectorAll("#inbox-table tbody tr[data-type]:not([data-static])").length;
check("C4", "the approvals inbox's Pending tab lists the same 8 real rows (its 3 labelled samples aside)", inboxReal() === 8 && sidebarCount() === "8", `${inboxReal()} ${sidebarCount()}`);
await open("priya", "admin");
check("C5", "Priya (HR, by URL): her own 5 ('4 of 5 shown'), = waitingCount() = her sidebar count", approvalsMeta() === "4 of 5 shown" && WT.waitingCount("EMP-1003", "hr") === 5 && sidebarCount() === "5", `${approvalsMeta()} ${sidebarCount()}`);
await open("priya", "inbox");
check("C6", "…and her inbox's 5 real rows", inboxReal() === 5, inboxReal());
const exp = E.allExpenses().find((c) => c.status === "pending" && E.pendingFor("EMP-1001", "admin").some((p) => p.id === c.id));
const asset = AR.pendingFor("EMP-1001", "admin")[0];
E.decideExpense(exp.id, "EMP-1001", "admin", "approve");
AR.decideAssetRequest(asset.id, "EMP-1001", "admin", "approve");
await open("aarav", "admin");
check("C7", "Aarav decides his expense claim and asset request (in the store): 6 everywhere ('4 of 6 shown', sidebar 6)", approvalsMeta() === "4 of 6 shown" && sidebarCount() === "6" && WT.waitingCount("EMP-1001", "admin") === 6, `${approvalsMeta()} ${sidebarCount()}`);
await at(2026, 10, 7, "aarav", "admin");
const aw = WT.waitingFor("EMP-1001", "admin");
// A request at its manager stage with Aarav as the manager waits for him again at the HR stage, so decide until none is left.
for (let left = aw; left.leave.length + left.corrections.length; left = WT.waitingFor("EMP-1001", "admin")) {
  left.leave.forEach((r) => L.decideLeave(r.id, "EMP-1001", "admin", "approve"));
  left.corrections.forEach((r) => A.decideRegularization(r.id, "EMP-1001", "admin", "approve"));
}
await open("aarav", "admin");
const [wc, wa] = [aw.expenses[0], aw.assets[0]];
check("C8", "Aarav decides his leave and corrections: '2 of 2 shown', the expense claim and the asset request in their own words (newest sent first)", approvalsMeta() === "2 of 2 shown" && sidebarCount() === "2"
  && j(approvals()) === j([[wc, `Expense claim: ${S.getUser(wc.userId).name} | ₹${wc.amount.toLocaleString("en-IN")}, ${({ travel: "Travel", meals: "Meals", fuel: "Fuel", software: "Software", other: "Other" })[wc.category]}, ${E.STAGE_NAME[wc.stage]} stage | Review`],
    [wa, `Asset request: ${S.getUser(wa.userId).name} | ${({ laptop: "Laptop", monitor: "Monitor", "access-card": "Access card" })[wa.assetType]}${wa.replacesTag ? `, replaces ${wa.replacesTag}` : ""}, ${AR.STAGE_NAME[wa.stage]} stage | Review`]]
    .sort((x, y) => y[0].appliedOn.localeCompare(x[0].appliedOn)).map((x) => x[1])), j(approvals()));
await at(2026, 10, 7, "priya", "admin");
for (const r of L.pendingFor("EMP-1003", "hr")) L.decideLeave(r.id, "EMP-1003", "hr", "approve");
for (const r of A.pendingRegularizations("EMP-1003", "hr")) A.decideRegularization(r.id, "EMP-1003", "hr", "reject", "Not needed");
await open("priya", "admin");
check("C9", "nothing waiting (Priya decides all 5): 'None', 'Nothing is waiting for you.', no sidebar count", approvalsMeta() === "None" && j(approvals()) === j(["Nothing is waiting for you."]) && sidebarCount() === "0", `${approvalsMeta()} ${j(approvals())}`);
check("C10", "the HTML's sample rows are gone (role change, purchase order, backup restore: none exists), and with them its placeholder buttons",
  !STATIC.admin.querySelector("#admin-approvals [data-not-implemented]") && !/PO-2291|Backup restore|Role change/.test(HTML.admin) && txt(STATIC.admin.querySelector("#admin-approvals .card__meta")) === "");
check("C11", "the script's source is ui/waiting.js's waitingFor(), as the inbox's and sidebar's", /import \{ waitingFor \} from "\.\.\/ui\/waiting\.js";/.test(ADMIN_JS) && /waitingFor\(user\.id, getCurrentRole\(\)\?\.key\)/.test(ADMIN_JS));

// =====================================================================
section("D. Recent activity (Admin dashboard), each source behind its own permission");
await at(2026, 10, 7, "aarav", "admin");
check("D1", "Aarav: every source ('Leave, corrections, expenses, asset requests and stock'); the 5 newest events, newest first", actMeta() === "Leave, corrections, expenses, asset requests and stock" && j(acts()) === j([
  "Arjun Kapoor's regularization for 5 Oct approved by Priya Nair | 6 Oct",
  "Arjun Kapoor's regularization for 5 Oct approved by Sneha Rao | 6 Oct",
  "Regularization request from Arjun Kapoor for 5 Oct | 5 Oct",
  "Regularization request from Vikram Singh for 1 Oct | 5 Oct",
  "Regularization request from Sneha Rao for 29 Sep | 30 Sep"]) && j(actDots()) === j(["success", "success", "warning", "warning", "warning"]), `${actMeta()} ${j(acts())}`);
// One fresh event per source, all at 10:00 today, then the newest five are exactly these.
const fiveNew = async () => {
  setNow(2026, 10, 7, 10, 1); L.applyLeave("EMP-1042", { type: "casual", from: "2026-10-21", to: "2026-10-21", duration: "full", reason: "Errand" });
  setNow(2026, 10, 7, 10, 2); A.requestRegularization("EMP-1105", { date: "2026-09-30", issue: "late-arrival", time: "09:30", reason: "Card reader was down" });
  setNow(2026, 10, 7, 10, 3); E.payExpense("EXP-3107", "EMP-1008");   // Aarav's approved claim, paid by Finance
  setNow(2026, 10, 7, 10, 4); AR.submitAssetRequest("EMP-1105", { assetType: "access-card", reason: "Lost mine" });
  setNow(2026, 10, 7, 10, 5); I.recordMovement("EMP-1001", { sku: "STA-3015", type: "out", quantity: 4, reference: "Meeting rooms" });
};
await fiveNew();
await open("aarav", "admin");
const EV = {
  stock: "Stock out: -4 Whiteboard markers, pack of 4, by Aarav Mehta | 7 Oct",
  assets: "Asset request from Arjun Kapoor: access card | 7 Oct",
  expenses: "₹6,200 claim from Aarav Mehta paid by Kabir Shah | 7 Oct",
  corrections: "Regularization request from Arjun Kapoor for 30 Sep | 7 Oct",
  leave: "Leave request from Rohan Gupta: casual leave for 21 Oct | 7 Oct",
};
const has = (list, ev) => list.some((s) => (ev instanceof RegExp ? ev.test(s) : s === ev));
const aaravActs = acts();
check("D2", "one new event from each source: Aarav sees all five, newest first (stock, asset request, expense paid, correction, leave)", aaravActs.length === 5 && has([aaravActs[0]], EV.stock) && has([aaravActs[1]], EV.assets)
  && has([aaravActs[2]], EV.expenses) && has([aaravActs[3]], EV.corrections) && has([aaravActs[4]], EV.leave), j(aaravActs));
check("D3", "…dots: stock out primary, sent warning, paid success", j(actDots()) === j(["primary", "warning", "success", "warning", "warning"]), j(actDots()));
await open("priya", "admin");
const priyaActs = acts();
check("D4", "Priya (HR, by URL; no expenses:view, assets:view or inventory:view): 'Leave and corrections' only; the expense, asset and stock events aren't there",
  actMeta() === "Leave and corrections" && has(priyaActs, EV.leave) && has(priyaActs, EV.corrections) && !has(priyaActs, EV.stock) && !has(priyaActs, EV.assets) && !has(priyaActs, EV.expenses)
  && !priyaActs.some((s) => /claim|Asset request|Stock/.test(s)), `${actMeta()} ${j(priyaActs)}`);
const SOURCES = [["leave:approve", "leave", "Corrections, expenses, asset requests and stock"], ["attendance:approve", "corrections", "Leave, expenses, asset requests and stock"],
  ["expenses:view", "expenses", "Leave, corrections, asset requests and stock"], ["assets:view", "assets", "Leave, corrections, expenses and stock"], ["inventory:view", "stock", "Leave, corrections, expenses and asset requests"]];
for (const [perm, key, meta] of SOURCES) {
  await without("admin", [perm], async () => { await open("aarav", "admin"); });
  const list = acts();
  const others = Object.entries(EV).filter(([k]) => k !== key);
  check(`D5.${key}`, `an Admin role without ${perm}: that source's event is gone, the other four stay, the meta says what's included`, !has(list, EV[key]) && others.every(([, ev]) => has(list, ev)) && actMeta() === meta, `${actMeta()} ${j(list)}`);
}
await without("hr", ["leave:approve", "attendance:approve"], async () => { await open("priya", "admin"); });
check("D6", "a role with none of the five sources: no events, 'Nothing here you have access to.', an empty meta", j(acts()) === j(["Nothing here you have access to."]) && actMeta() === "", `${j(acts())} ${actMeta()}`);
await at(2026, 10, 7, "aarav", "admin");
const decided = L.pendingFor("EMP-1001", "admin")[0];
setNow(2026, 10, 7, 11, 0); L.decideLeave(decided.id, "EMP-1001", "admin", "reject", "Clash");
setNow(2026, 10, 7, 11, 1); const toCancel = L.applyLeave("EMP-1042", { type: "casual", from: "2026-10-21", to: "2026-10-21", duration: "full", reason: "x" }).record.id;
setNow(2026, 10, 7, 11, 2); L.cancelLeave(toCancel, "EMP-1042");
await open("aarav", "admin");
check("D7", "a rejection (danger dot) and a cancellation (by the requester) read as steps of the request", acts()[0] === "Rohan Gupta's casual leave for 21 Oct cancelled by Rohan Gupta | 7 Oct" && acts()[1] === "Leave request from Rohan Gupta: casual leave for 21 Oct | 7 Oct"
  // Round 9H (behaviour; was actDots()[0] === "primary"): the cancellation's dot is the neutral grey, as on the Finance dashboard
  && acts()[2].startsWith(`${S.getUser(decided.userId).name}'s `) && / rejected by Aarav Mehta \| 7 Oct$/.test(acts()[2]) && actDots()[0] === "muted" && actDots()[2] === "danger", j(acts()));
await at(2026, 10, 7, "aarav", "admin");
setNow(2026, 10, 7, 12, 0); L.applyLeave("EMP-1001", { type: "casual", from: "2026-10-22", to: "2026-10-22", duration: "full", reason: "Own" });
await open("aarav", "admin");
check("D8", "an Admin's own request: one 'sent' event; its automatic approvals aren't events anyone did (Finance's rule)", acts()[0] === "Leave request from Aarav Mehta: casual leave for 22 Oct | 7 Oct" && !acts().some((s) => /automatic|auto-approved|Aarav Mehta's casual leave for 22 Oct approved/.test(s)), j(acts()));
setNow(2026, 10, 7, 12, 1);
const noManager = AR.submitAssetRequest("EMP-1017", { assetType: "laptop", reason: "Old one is slow" });   // Ananya: no manager on file, so the manager stage is skipped
await open("aarav", "admin");
check("D9", "skipped stages aren't events either: Ananya's request (no manager on file) is one 'sent' event, the next is the earlier one",
  AR.getAssetRequest(noManager.record.id).history.some((h) => h.decision === "skipped") && acts()[0] === "Asset request from Ananya Iyer: laptop | 7 Oct" && acts()[1] === "Leave request from Aarav Mehta: casual leave for 22 Oct | 7 Oct"
  && !acts().some((s) => /skipped|No manager|by null|by undefined/.test(s)), j(acts()));
// Dates: chain steps in the browser's own zone (as Finance and HR date theirs); a stock movement in office time (as stock-movements.html).
await at(2026, 10, 7, "aarav", "admin");
const lateUtc = new RealDate(Date.UTC(2026, 9, 7, 20, 0)).getTime();   // 7 Oct 20:00 UTC = 8 Oct 01:30 in India, 7 Oct 13:00 in Los Angeles
NOW = lateUtc;
I.recordMovement("EMP-1001", { sku: "STA-3015", type: "in", quantity: 2, reference: "Late delivery" });
AR.submitAssetRequest("EMP-1105", { assetType: "monitor", reason: "Late request" });
NOW = lateUtc + 60000;
await open("aarav", "admin");
const localDay = new Date(lateUtc).getDate();
check("D10", "a movement at 01:30 office time reads 8 Oct in every zone; an asset request sent at the same moment reads the browser's own date", acts().includes("Stock in: +2 Whiteboard markers, pack of 4, by Aarav Mehta | 8 Oct") && acts().includes(`Asset request from Arjun Kapoor: monitor | ${localDay} Oct`), j(acts()));
check("D11", "the HTML's invented events are gone (access grant, backup, failed logins: nothing records them) and so is the audit-log link (a labelled sample)",
  !/Team Lead access|Backup completed|failed logins/.test(HTML.admin) && !STATIC.admin.querySelector('main a[href="../system/audit-log.html"]') && STATIC.admin.getElementById("admin-activity").children.length === 0);
check("D12", "the script names each source's permission once, in one table", ["leave:approve", "attendance:approve", "expenses:view", "assets:view", "inventory:view"].every((p) => ADMIN_JS.split(`permission: "${p}"`).length === 2));

// =====================================================================
section("E. Sample, not built yet");
await at(2026, 10, 7, "priya", "hr");
check("E1", "HR dashboard: Open positions keeps its sample figure, its note says 'Sample, not built yet' (no up colour); '2 closing this week' gone", stat("positions") === `9 (${SAMPLE})` && tone("positions") === "stat__delta" && !/closing this week/.test(HTML.hr), stat("positions"));
check("E2", "…the Applicants by stage card says so in its meta ('221 in pipeline' gone)", txt(d.querySelector(".grid-2 .card .card__title")) === "Applicants by stage" && txt(d.querySelector(".grid-2 .card .card__meta")) === SAMPLE && !/221 in pipeline/.test(HTML.hr));
const interview = [...d.querySelectorAll("#activity .activity__item")].at(-1);
check("E3", "…the interview line stays last, its time slot reading 'Sample, not built yet' ('1 hour ago' gone)", txt(interview) === `Interview scheduled: Frontend Developer${SAMPLE}` && interview.hasAttribute("data-static") && !/1 hour ago/.test(HTML.hr), txt(interview));
const REC = "Sample, not built yet: recruitment isn't part of OfficeOS yet. This page shows how it could look; nothing here is saved, and the openings, candidates and figures listed are examples.";
for (const p of ["recruitment/job-openings.html", "recruitment/candidates.html"]) {
  const doc = parse(RAW(p));
  check(`E4.${p.split("/")[1].split(".")[0]}`, `${p}: the alert, first in the page's stack`, txt(doc.querySelector("main .stack > .alert.alert--info:first-child")) === REC);
}
await at(2026, 10, 7, "arjun", "emp");
const updates = [...d.querySelectorAll("#updates .activity__item")];
check("E5", "Employee dashboard: the announcement line is a labelled sample with no date, still last in Updates", txt(updates.at(-1)) === `Announcement: team offsite${SAMPLE}` && updates.at(-1).hasAttribute("data-static") && !/12 Oct/.test(txt(d.getElementById("updates"))), txt(updates.at(-1)));
const ann = parse(RAW("announcements/announcements.html"));
check("E6", "announcements.html: the sample alert, above the posts", txt(ann.querySelector("main > .alert.alert--info")) === "Sample, not built yet: announcements aren't part of OfficeOS yet. This page shows how they could look; nothing is posted or sent, and the posts and read counts listed are examples."
  && ann.querySelector("main > .alert").nextElementSibling.classList.contains("grid"));
check("E7", "…and its false claim is gone (posts don't reach dashboards; notifications aren't built)", !/appear on each person's dashboard|in their notifications/.test(RAW("announcements/announcements.html")) && ann.querySelectorAll(".alert").length === 1);
check("E8", "routes unchanged: recruitment pages recruitment:view, announcements announcements:view, admin.html attendance:view-all, hr.html leave:approve",
  ROUTES["recruitment/job-openings.html"] === "recruitment:view" && ROUTES["recruitment/candidates.html"] === "recruitment:view" && ROUTES["announcements/announcements.html"] === "announcements:view"
  && ROUTES["dashboard/admin.html"] === "attendance:view-all" && ROUTES["dashboard/hr.html"] === "leave:approve");

// =====================================================================
section("F. Access, old sessions, hygiene");
for (const who of ["kabir", "arjun"]) {
  await at(2026, 10, 7, who, "admin");
  check(`F1.${who}`, `${who} (no attendance:view-all): sent to 403, the script draws nothing`, navigations.length === 1 && sameMain("admin"), `nav=${navigations.length}`);
}
await at(2026, 10, 7, "old", "admin");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("F2", "old session (no employee id) on admin.html: signed out and sent to sign in (round 11P, N2); the static page is left as it is (no invented figures in it now)", sameMain("admin") && navigations.length === 1 && localStorage.getItem("officeos:session") === null);
await at(2026, 10, 7, "old", "hr");
check("F3", "…and on hr.html", sameMain("hr"));
check("F4", "neither script uses innerHTML / outerHTML / insertAdjacentHTML", ![ADMIN_JS, HR_JS].some((s) => /innerHTML|outerHTML|insertAdjacentHTML/.test(s)));
check("F5", "no HTML string written at run time held a person's name", !htmlWrites.some((h) => /Kapoor|Rao|Nair|Mehta|Shah|Gupta|Singh|Joshi|Iyer|Kumar/.test(h)), `${htmlWrites.length} writes`);
const CHANGED = ["assets/js/pages/admin-dashboard.js", "assets/js/pages/hr-dashboard.js"];
check("F6", "the two changed scripts are CRLF only, with no final newline (the repo's checkout form)", CHANGED.every((p) => { const s = SRC(p.replace("assets/js/", "")); return !/[^\r]\n/.test(s) && !s.endsWith("\n"); }));
check("F7", "the six changed pages are CRLF only, with no final newline", ["dashboard/admin.html", "dashboard/hr.html", "dashboard/employee.html", "recruitment/job-openings.html", "recruitment/candidates.html", "announcements/announcements.html"]
  .every((p) => { const s = RAW(p); return !/[^\r]\n/.test(s) && !s.endsWith("\n"); }));
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
