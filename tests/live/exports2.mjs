// usage: node exports2.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round Data export part 2 (JS stage), in jsdom with the js in ./js. Every CSV the app writes, as the roles that have it:
//   A  every page's every export, as each role that holds it: the file's rows are the page's WHOLE list (every page of it, walked with the
//      page's own Next button; the HR dashboard's ten-row table by its "Showing 10 of N"); a manager (Sneha, Kabir on team attendance) and an
//      Employee with no reports (Arjun) get no file anywhere
//   K  a paged case on each paged table: data planted to more than one page, a filter, search or tab set first (and narrowing); the file has
//      exactly the rows of every page (same rows, same order), as many as the pager's "of N", more than one page's worth; exporting leaves
//      the page as it was (same rows, same pager); K11 a pending request of the viewer's own (which the page never lists) is in no file
//   S  the Employee cell split: each file's heading row exactly (no other column); the name, then the sub-line (Department, Employee ID or
//      Work email) from the store; no Employee cell still carries its sub-line
//   T  the stats files: Value plain numbers only (or empty for a card with none); a rupee card's metric ends " (₹)" and its value is the card's
//      figure; every other metric is the card's label; a hidden card is an empty row
//   D  the file name's date is the office (India) date, computed from the fake clock: at 10:00 local, 18:15 UTC (23:45 in India), 18:45 UTC
//      (00:15 the next day in India) and 23:30 UTC (05:00 the next day in India); D2 outside India one of them is a different browser date
//   P  every file parses with a strict RFC 4180 parser and writes back to the same text; F no forbidden column or stored value
//   E99 no js errors
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const RealDate = Date;
const NOW = new RealDate(2026, 8, 28, 10, 0, 0).getTime();
let now = NOW;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } };
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;
const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
let blobs = [], names = [];
URL.createObjectURL = (blob) => { blobs.push(blob); return "blob:test"; };
URL.revokeObjectURL = () => {};
const WHO = { aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"], kabir: ["fin", "Kabir Shah", "EMP-1008"], sneha: ["emp", "Sneha Rao", "EMP-1029"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"] };
const fresh = (who) => { mem.clear(); login(who); };
const login = (who) => mem.set("officeos:session", JSON.stringify({ roleKey: WHO[who][0], userLabel: WHO[who][1], employeeId: WHO[who][2], signedInAt: now }));
let loads = 0, w, d, navigations = 0;
const allJsErrors = [];
async function open(page) {
  const vc = new VirtualConsole(); timers = []; navigations = 0;
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations++; else allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(path.join(DIR, `${page}.html`), "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.HTMLAnchorElement.prototype.click = function () { if (this.download) names.push(this.download); };
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, getComputedStyle: w.getComputedStyle.bind(w) });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) { try { await import(`./js/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); } }
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} timer: ${e.message}`); } });
}
console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const exportButton = () => [...d.querySelectorAll("main button")].find((b) => b.textContent.trim() === "Export" && !b.hidden && !b.closest("[hidden]") && !b.dataset.notImplemented);
const allFiles = [];
async function exportFiles() {
  blobs = []; names = [];
  exportButton()?.click();
  timers.splice(0).forEach((fn) => { try { fn(); } catch {} });
  const fs2 = await Promise.all(blobs.map(async (b, i) => { const bytes = new Uint8Array(await b.arrayBuffer()); const all = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes); const text = all.replace(/^﻿/, ""); const parsed = parse(text);
    const name = names[i] ?? "?";
    return { name, base: name.replace(/-\d{4}-\d{2}-\d{2}\.csv$/, ""), text, parsed, rows: parsed ?? [["unparseable"]] }; }));
  allFiles.push(...fs2);
  return fs2;
}
// A strict RFC 4180 parser (exports.mjs's): null when malformed.
function parse(text) {
  const rows = []; let row = [], field = "", i = 0, quoted = false;
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { quoted = false; i++; if (i < text.length && text[i] !== "," && text.slice(i, i + 2) !== "\r\n") return null; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { if (field !== "") return null; quoted = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (text.slice(i, i + 2) === "\r\n") { row.push(field); rows.push(row); row = []; field = ""; i += 2; continue; }
    if (c === "\n" || c === "\r") return null;
    field += c; i++;
  }
  if (quoted) return null;
  row.push(field); rows.push(row);
  return rows;
}
const writeBack = (rows) => rows.map((r) => r.map((f) => (/[",\r\n]/.test(f) ? `"${f.replace(/"/g, '""')}"` : f)).join(",")).join("\r\n");
// A cell's text as a reader sees it: each piece of text, whitespace collapsed, joined by a space; avatars, reasons, icons and hidden parts left out.
const SKIP = ".avatar, .reason, svg, [hidden], [aria-hidden='true']";
function texts(cell) {
  const out = []; const walker = d.createTreeWalker(cell, w.NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) { if (n.parentElement.closest(SKIP)) continue; const t = n.textContent.replace(/\s+/g, " ").trim(); if (t) out.push(t); }
  return out.join(" ");
}
const tableOf = (name) => d.querySelector(`table[data-export-name="${name}"]`);
const shownRows = (name) => { const t = tableOf(name); if (!t) return []; const n = t.querySelector("thead tr:last-child").children.length; return [...t.querySelectorAll("tbody tr")].filter((r) => !r.hidden && r.style.display !== "none" && r.children.length === n); };
const NAME = [(tr) => tr.children[0].querySelector(".table__user-name")?.textContent.trim() ?? texts(tr.children[0]), (r) => r[0]];
const COL0 = [(tr) => texts(tr.children[0]), (r) => r[0]];
const KEYS = { "regularization-requests": NAME, "team-attendance": NAME, "admin-dashboard-attendance": NAME, "finance-dashboard-payroll": NAME, "hr-dashboard-leave-requests": NAME,
  "expense-claims": NAME, "leave-requests": NAME, "employee-salaries": NAME, "statutory-deductions": COL0, "tax-slabs": COL0, "salary-components": COL0, "asset-assignments": COL0,
  "inventory-items": COL0, "vendors": COL0, "stock-movements": [(tr) => `${texts(tr.children[1])}|${texts(tr.children[4])}`, (r) => `${r[1]}|${r[4]}`] };
// The page's own next-page control near the table: the shared pager's Next, or the admin dashboard's own.
const nextOf = (t) => (t.closest(".card") ?? d.querySelector("main")).querySelector('button[aria-label="Next page"], #admin-next');
const pagerText = (t) => (t.closest(".card") ?? d.querySelector("main")).querySelector(".pagination > span, #admin-rows-meta, #leave-rows-meta")?.textContent ?? "";
const ofTotal = (t) => { const m = pagerText(t).match(/of (\d+)/); return m ? Number(m[1]) : null; };
// Every row the page lists, walked page by page with its own Next (ends on the last page). capped: the HR dashboard's table (no pages: "Showing 10 of N").
function walk(name) {
  const t0 = tableOf(name); const total = t0 ? ofTotal(t0) : null; const keys = [];
  for (let i = 0; i < 60; i++) {
    const t = tableOf(name); keys.push(...shownRows(name).map(KEYS[name][0]));
    const next = nextOf(t); if (!next || next.disabled || next.hidden) break;
    next.click();
  }
  return { keys, total };
}
const snapshot = (name) => { const t = tableOf(name); return t ? t.querySelector("tbody").innerHTML + "|" + pagerText(t) : ""; };
const csvKeys = (f) => f.rows.slice(1).map(KEYS[f.base][1]);
// Does a file hold the page's whole list? capped tables: the shown rows first, as many as "of N".
function whole(f, walked) {
  if (f.base === "hr-dashboard-leave-requests") return walked.total !== null && f.rows.length - 1 === walked.total && j(csvKeys(f).slice(0, walked.keys.length)) === j(walked.keys);
  return j(csvKeys(f)) === j(walked.keys) && (walked.total === null || walked.total === walked.keys.length);
}

const PAGES = [
  ["attendance/regularization", ["aarav", "priya"], ["regularization-requests"]],
  ["attendance/team-attendance", ["aarav", "priya"], ["team-attendance"]],
  ["dashboard/admin", ["aarav", "priya"], ["admin-dashboard-attendance", "admin-dashboard-stats"]],
  ["dashboard/finance", ["aarav", "kabir"], ["finance-dashboard-payroll", "finance-dashboard-stats"]],
  ["dashboard/hr", ["aarav", "priya"], ["hr-dashboard-leave-requests", "hr-dashboard-stats"]],
  ["finance/expenses", ["aarav", "kabir"], ["expense-claims"]],
  ["finance/tax-deductions", ["aarav", "kabir"], ["statutory-deductions", "tax-slabs"]],
  ["inventory/asset-assignment", ["aarav"], ["asset-assignments"]],
  ["inventory/items", ["aarav"], ["inventory-items"]],
  ["inventory/stock-movements", ["aarav"], ["stock-movements"]],
  ["inventory/vendors", ["aarav"], ["vendors"]],
  ["leave/leave-approvals", ["aarav", "priya"], ["leave-requests"]],
  ["payroll/salary-structure", ["aarav", "kabir"], ["salary-components", "employee-salaries"]],
  ["users/users-list", ["aarav", "priya"], ["users"]],
];

section("A. Every export, as every role that has it: the page's whole list");
const aRuns = [], noFile = [];
for (const [page, holders, exportsOf] of PAGES) {
  for (const who of holders) {
    fresh(who); await open(page);
    const fs2 = await exportFiles();
    for (const name of exportsOf.filter((n) => !n.endsWith("-stats") && n !== "users")) {
      const f = fs2.find((x) => x.base === name);
      const walked = walk(name);
      aRuns.push([page, who, name, f ? f.rows.length - 1 : null, walked.keys.length, walked.total, !!f && whole(f, walked)]);
    }
    if (fs2.length !== exportsOf.length) aRuns.push([page, who, "files", fs2.length, exportsOf.length, null, false]);
  }
  for (const who of ["sneha", "arjun", ...(page === "attendance/team-attendance" ? ["kabir"] : [])]) {
    fresh(who); await open(page);
    const fs2 = navigations ? [] : await exportFiles();   // a 403 leaves the page in a browser (jsdom only logs the navigation): no button to press
    noFile.push([page, who, navigations ? "403" : exportButton() ? "button" : "no button", fs2.length]);
  }
}
check("A1", "every table export, as each role that holds it, writes the page's whole list: the rows of every page, in order (the HR dashboard's ten-row table: all N it counts)", aRuns.length >= 20 && aRuns.every((r) => r[6]), j(aRuns.filter((r) => !r[6])));
check("A2", "a manager (Sneha; Kabir on team attendance) and an Employee with no reports (Arjun) get no file from any export page", noFile.every((r) => r[3] === 0) && noFile.filter((r) => r[1] === "arjun").every((r) => r[2] === "403") && noFile.some((r) => r[0] === "attendance/team-attendance" && r[1] === "sneha" && r[2] === "no button"), j(noFile.filter((r) => r[3] !== 0 || (r[1] === "arjun" && r[2] !== "403"))));

section("K. Paged cases: more than one page, filtered first");
// A store the page never seeded (its script failed) reads as empty, so the checks fail rather than crash.
const box = (k) => { try { return JSON.parse(mem.get(k) ?? "null") ?? { records: [] }; } catch { return { records: [] }; } };
const put = (k, b) => mem.set(k, JSON.stringify(b));
function plant(key, n, pick, make) {
  const b = box(key); const base = b.records.find(pick) ?? b.records[0];
  if (!base) return;
  for (let i = 0; i < n; i++) b.records.push(make(structuredClone(base), i, String(i + 1).padStart(2, "0")));
  put(key, b);
}
const type = (el, v) => { el.value = v; el.dispatchEvent(new w.Event("input", { bubbles: true })); };
const choose = (el, v) => { el.value = v; el.dispatchEvent(new w.Event("change", { bubbles: true })); };
const tabClick = (label) => [...d.querySelectorAll("main .tabs__tab")].find((t) => t.textContent.trim().startsWith(label))?.click();
const mainSearch = () => d.querySelector("main input.input--search");
const TESTERS = (b) => { const base = b.records.find((u) => u.id === "EMP-1029");
  if (!base) return b;
  for (let i = 0; i < 24; i++) { const u = structuredClone(base); const nn = String(i + 1).padStart(2, "0");
    Object.assign(u, { id: `EMP-30${nn}`, name: `Test Person ${nn}`, email: `test.person${nn}@northwind.com`, department: i % 2 ? "SAL" : "ENG", role: "emp", status: "active",
      bankAccount: `90000000${nn}77`, pan: `ZZZPZ${nn}11Z`, ifsc: `ZZZB00${nn}999`, address: `${nn} Planted Lane, Pune`, emergencyContactName: `Planted Contact ${nn}`, emergencyContactPhone: `+91 90000 400${nn}`, personalEmail: `planted${nn}@gmail.com` });
    b.records.push(u); }
  return b; };
const CASES = [
  ["K1", "regularization: 24 pending corrections planted (Ananya, Sneha); search 'Ananya'", "attendance/regularization", "aarav", "regularization-requests",
    () => plant("officeos:regularizations", 24, (r) => r.status === "pending", (r, i, nn) => Object.assign(r, { id: `RG-9${nn}`, userId: i % 2 ? "EMP-1029" : "EMP-1017" })),
    () => type(mainSearch(), "Ananya")],
  ["K2", "team attendance: 24 people planted (Engineering, Sales); department Engineering, search 'Test'", "attendance/team-attendance", "aarav", "team-attendance",
    () => put("officeos:users", TESTERS(box("officeos:users"))), () => { choose(d.getElementById("team-dept"), "ENG"); type(d.getElementById("team-search"), "Test"); }],
  ["K3", "admin dashboard: the same 24 people; department Engineering, search 'Test'", "dashboard/admin", "aarav", "admin-dashboard-attendance",
    () => put("officeos:users", TESTERS(box("officeos:users"))), () => { choose(d.getElementById("admin-dept"), "ENG"); type(d.getElementById("admin-search"), "Test"); }],
  ["K4", "HR dashboard (ten rows shown): 24 pending leave requests planted (Ananya, Sneha); status Pending, search 'Ananya'", "dashboard/hr", "priya", "hr-dashboard-leave-requests",
    () => plant("officeos:leave-requests", 24, (r) => r.status === "pending", (r, i, nn) => Object.assign(r, { id: `LV-9${nn}`, userId: i % 2 ? "EMP-1029" : "EMP-1017" })),
    () => { choose(d.getElementById("leave-status"), "pending"); type(d.getElementById("leave-search"), "Ananya"); }],
  ["K5", "expenses: 24 claims planted (Ananya, Sneha); search 'Ananya'", "finance/expenses", "kabir", "expense-claims",
    () => plant("officeos:expense-claims", 24, (r) => r.status === "pending" && r.stage === "finance", (r, i, nn) => Object.assign(r, { id: `EXP-9${nn}`, userId: i % 2 ? "EMP-1029" : "EMP-1017" })),
    () => type(d.getElementById("expense-search"), "Ananya")],
  ["K6", "asset assignment: 24 laptops planted (available, assigned); tab Available, search 'Dell'", "inventory/asset-assignment", "aarav", "asset-assignments",
    () => plant("officeos:assets", 24, (a) => a.status === "available", (a, i, nn) => Object.assign(a, { id: `AST-9${nn}`, sku: "IT-1021", condition: "good", history: [],
      ...(i % 2 ? { status: "assigned", holderId: "EMP-1017", since: "2026-09-01", location: null } : { status: "available", holderId: null, since: null, location: "store-a" }) })),
    () => { tabClick("Available"); type(d.getElementById("asset-search"), "Dell"); }],
  ["K7", "items: 24 items planted (IT equipment, furniture); tab IT equipment, search 'Test'", "inventory/items", "aarav", "inventory-items",
    () => plant("officeos:inventory-items", 24, (x) => x.category === "it", (x, i, nn) => Object.assign(x, { id: `ITM-9${nn}`, sku: `TST-9${nn}`, name: `Test item ${nn}`, ...(i % 2 ? { category: "furniture", assetType: null } : {}) })),
    () => { tabClick("IT equipment"); type(d.getElementById("item-search"), "Test"); }],
  ["K8", "stock movements: 24 planted (stock out, stock in); tab Stock out, search 'Test'", "inventory/stock-movements", "aarav", "stock-movements",
    () => plant("officeos:stock-movements", 24, (m) => m.type === "out" && !m.assetTag, (m, i, nn) => Object.assign(m, { id: `MOV-9${nn}`, reference: `Test issue ${nn}`, ...(i % 2 ? { type: "in", change: 2 } : { type: "out", change: -1 }) })),
    () => { tabClick("Stock out"); type(d.getElementById("movement-search"), "Test"); }],
  ["K9", "vendors: 24 planted (two statuses); the first status, search 'Test'", "inventory/vendors", "aarav", "vendors",
    () => { const sel = [...d.querySelectorAll("#vendor-status option")].map((o) => o.value).filter(Boolean); plant("officeos:vendors", 24, () => true, (v, i, nn) => Object.assign(v, { id: `VEN-9${nn}`, name: `Test Vendor ${nn}`, status: sel[i % 2] ?? v.status })); },
    () => { choose(d.getElementById("vendor-status"), [...d.querySelectorAll("#vendor-status option")].map((o) => o.value).filter(Boolean)[0]); type(d.getElementById("vendor-search"), "Test"); }],
  ["K10", "leave approvals: 24 pending leave requests planted (Ananya, Sneha); search 'Ananya'", "leave/leave-approvals", "priya", "leave-requests",
    () => plant("officeos:leave-requests", 24, (r) => r.status === "pending", (r, i, nn) => Object.assign(r, { id: `LV-9${nn}`, userId: i % 2 ? "EMP-1029" : "EMP-1017" })),
    () => type(mainSearch(), "Ananya")],
];
const kDetail = [];
for (const [id, label, page, who, name, setup, filter] of CASES) {
  fresh(who); await open(page); setup(); await open(page);
  const before = ofTotal(tableOf(name)) ?? shownRows(name).length;
  filter();
  const after = ofTotal(tableOf(name));
  const snap = snapshot(name);
  const f = (await exportFiles()).find((x) => x.base === name);
  const same = snapshot(name) === snap;
  const walked = walk(name);
  const ok = !!f && whole(f, walked) && f.rows.length - 1 === after && after > 10 && after < before && same;
  kDetail.push([id, { csv: f ? f.rows.length - 1 : null, walked: walked.keys.length, of: after, unfiltered: before, screenUnchanged: same }]);
  check(id, `${label}: the file has every page's rows, as many as the pager's "of N" (more than one page; fewer than before the filter); exporting leaves the page as it was`, ok, j(kDetail.at(-1)[1]));
}
// K11: a pending correction of the viewer's own: the page never lists it, so no file has it
fresh("priya"); await open("attendance/regularization");
plant("officeos:regularizations", 12, (r) => r.status === "pending", (r, i, nn) => Object.assign(r, { id: `RG-8${nn}`, userId: i < 11 ? "EMP-1017" : "EMP-1003", reason: i < 11 ? r.reason : "Planted own request" }));
await open("attendance/regularization");
const own = (await exportFiles()).find((x) => x.base === "regularization-requests");
check("K11", "scope: HR's own pending correction (planted among 11 others, more than a page) is in no file, and every file row is one the page lists", !!own && !own.text.includes("Planted own request") && own.rows.length - 1 === walk("regularization-requests").keys.length && own.rows.length - 1 > 10, j([own?.rows.length - 1]));

section("S. The Employee cell split");
const HEAD = {
  "regularization-requests": ["Employee", "Department", "Date", "Issue", "Recorded, requested", "Reason", "Status"],
  "team-attendance": ["Employee", "Employee ID", "Department", "Check-in", "Hours", "This week", "Status"],
  "admin-dashboard-attendance": ["Employee", "Work email", "ID", "Department", "Status", "Check-in", "Hours"],
  "admin-dashboard-stats": ["Metric", "Value"], "finance-dashboard-stats": ["Metric", "Value"], "hr-dashboard-stats": ["Metric", "Value"],
  "finance-dashboard-payroll": ["Employee", "Department", "Gross (₹)", "Deductions (₹)", "Net pay (₹)", "Status"],
  "hr-dashboard-leave-requests": ["Employee", "Type", "Dates", "Days", "Status"],
  "expense-claims": ["Employee", "Department", "Category", "Date", "Amount (₹)", "Receipt", "Stage"],
  "statutory-deductions": ["Deduction", "Rate", "Paid by", "This month (₹)", "Due date", "Status"], "tax-slabs": ["Annual income", "Tax rate"],
  "asset-assignments": ["Tag", "Asset", "Assigned to", "Since", "Condition", "Status"],
  "inventory-items": ["Item", "Category", "In stock", "Reorder level", "Unit price (₹)", "Location", "Status"],
  "stock-movements": ["Date", "Item", "Type", "Quantity", "Reference", "Recorded by"], "vendors": ["Vendor", "Supplies", "Payment terms", "Status"],
  "leave-requests": ["Employee", "Department", "Type", "Dates", "Days", "Applied", "Stage"],
  "salary-components": ["Component", "Type", "How it is worked out", "Taxable", "Status"],
  "employee-salaries": ["Employee", "Employee ID", "Designation", "Gross per month (₹)", "Annual cost (₹)", "Last revised", "Status"],
  "users": ["ID", "Name", "Email", "Designation", "Department", "Role", "Status"],
};
const SUB = { "regularization-requests": "Department", "team-attendance": "Employee ID", "admin-dashboard-attendance": "Work email", "finance-dashboard-payroll": "Department", "expense-claims": "Department", "leave-requests": "Department", "employee-salaries": "Employee ID" };
const bases = new Set(allFiles.map((f) => f.base));
const badHead = [...bases].map((b) => [b, allFiles.find((f) => f.base === b).rows[0]]).filter(([b, h]) => j(h) !== j(HEAD[b]));
check("S1", "every file's heading row is exactly its columns: the split adds only the sub-line's column after Employee (Department, Employee ID or Work email), nothing else", bases.size === Object.keys(HEAD).length && badHead.length === 0, j({ files: bases.size, badHead }));
fresh("aarav"); await open("users/users-list");
const users = box("officeos:users").records, depts = box("officeos:departments").records;
const byName = new Map(users.map((u) => [u.name, u]));
const subOf = (kind, u) => (kind === "Department" ? depts.find((x) => x.code === u.department)?.name ?? u.department : kind === "Employee ID" ? u.id : u.email);
const splitBad = [], splitSeen = {};
for (const f of allFiles.filter((x) => SUB[x.base] && x.rows[0][1] === SUB[x.base])) {
  for (const r of f.rows.slice(1)) {
    const u = byName.get(r[0]) ?? (r[0].startsWith("Test Person ") ? { id: `EMP-30${r[0].slice(-2)}`, name: r[0], email: `test.person${r[0].slice(-2)}@northwind.com`, department: Number(r[0].slice(-2)) % 2 ? "ENG" : "SAL" } : null);
    splitSeen[f.base] = (splitSeen[f.base] ?? 0) + 1;
    if (!u || r[1] !== subOf(SUB[f.base], u)) splitBad.push([f.base, r[0], r[1]]);
  }
}
check("S2", "every split file's rows: the Employee column is the person's name alone and the next column their department, employee ID or work email, as the store has them", Object.keys(SUB).every((b) => splitSeen[b] > 0) && splitBad.length === 0, j({ seen: splitSeen, bad: splitBad.slice(0, 5) }));
const combined = allFiles.filter((f) => SUB[f.base]).flatMap((f) => f.rows.slice(1).filter((r) => r[1] && r[0].endsWith(` ${r[1]}`)).map((r) => [f.base, r[0]]));
const joinedSub = allFiles.filter((f) => SUB[f.base]).flatMap((f) => f.rows.slice(1).filter((r) => [...byName.values()].some((u) => r[0] === `${u.name} ${subOf(SUB[f.base], u)}`)).map((r) => [f.base, r[0]]));
check("S3", "the combined cell is gone: no Employee cell is a name followed by its sub-line", allFiles.some((f) => SUB[f.base]) && combined.length === 0 && joinedSub.length === 0, j([...combined, ...joinedSub].slice(0, 5)));

section("T. The stats files");
const statCases = [];
for (const [page, who] of [["dashboard/admin", "aarav"], ["dashboard/admin", "priya"], ["dashboard/finance", "kabir"], ["dashboard/finance", "aarav"], ["dashboard/hr", "priya"], ["dashboard/hr", "aarav"]]) {
  fresh(who); await open(page);
  const cards = [...d.querySelectorAll("main .stat")].map((s) => { const hidden = !!s.closest(SKIP); const label = s.querySelector(".stat__label")?.textContent.trim() ?? ""; const value = s.querySelector(".stat__value")?.textContent.trim() ?? ""; return { hidden, label, value }; });
  const f = (await exportFiles()).find((x) => x.base.endsWith("-stats"));
  statCases.push({ page, who, cards, rows: f ? f.rows.slice(1) : null });
}
const PLAIN = /^(-?\d+(\.\d+)?)?$/;
check("T1", "every stats file's Value column is plain numbers only (no ₹, no grouping commas, no dash), or empty", statCases.every((c) => c.rows && c.rows.every((r) => PLAIN.test(r[1]))), j(statCases.flatMap((c) => (c.rows ?? [["no file"]]).filter((r) => !PLAIN.test(r[1] ?? "x")))));
const expectStat = (card) => (card.hidden ? ["", ""] : card.value.startsWith("₹") ? [`${card.label} (₹)`, card.value.replace(/[₹,]/g, "")] : [card.label, /^\d+$/.test(card.value) ? card.value : ""]);
const statBad = statCases.filter((c) => !c.rows || j(c.rows) !== j(c.cards.map(expectStat)));
check("T2", "a rupee card's metric ends ' (₹)' and its value is the card's figure; a count card's metric is its label and its value its number; one row per card, in order", statBad.length === 0 && statCases.some((c) => c.rows?.some((r) => r[0].endsWith(" (₹)"))), j(statBad.map((c) => [c.page, c.who, c.rows, c.cards.map(expectStat)]).slice(0, 2)));
const hiddenCase = statCases.find((c) => c.page === "dashboard/admin" && c.who === "priya");
check("T3", "a hidden card (the admin dashboard's payroll and stock figures, opened by HR) is an empty row: no figure leaks", !!hiddenCase && hiddenCase.cards.some((c) => c.hidden) && hiddenCase.rows?.filter((r) => r[0] === "" && r[1] === "").length === hiddenCase.cards.filter((c) => c.hidden).length, j(hiddenCase?.rows));

section("D. The file name's date: the office date");
const office = (t) => new RealDate(t + 330 * 60000).toISOString().slice(0, 10);
const browserDate = (t) => { const x = new RealDate(t); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const INSTANTS = [["10:00 local", NOW], ["18:15 UTC", RealDate.UTC(2026, 8, 28, 18, 15)], ["18:45 UTC", RealDate.UTC(2026, 8, 28, 18, 45)], ["23:30 UTC", RealDate.UTC(2026, 8, 28, 23, 30)]];
const dateBad = [], dateSeen = [];
for (const [label, t] of INSTANTS) {
  now = t;
  for (const [page, holders] of PAGES) {
    fresh(holders[0]); await open(page);
    for (const f of await exportFiles()) { dateSeen.push(f.name); if (f.name !== `${f.base}-${office(t)}.csv`) dateBad.push([label, f.name, office(t)]); }
  }
}
now = NOW;
console.log("      " + j(INSTANTS.map(([label, t]) => [label, "office " + office(t), "browser " + browserDate(t)])));
check("D1", "every export's file name is '<name>-<office date>.csv' at each of the four instants (around midnight in India too), the office date worked out from the clock", dateSeen.length >= 4 * 18 && dateBad.length === 0, j({ files: dateSeen.length, bad: dateBad.slice(0, 4) }));
const inIndia = -new RealDate().getTimezoneOffset() === 330;
check("D2", "outside India the instants include one where the browser's date is not the office date (so D1 tells them apart); in India they are always the same", inIndia ? INSTANTS.every(([, t]) => office(t) === browserDate(t)) : INSTANTS.some(([, t]) => office(t) !== browserDate(t)), j({ inIndia }));

section("P, F. Every file");
check("P1", "every file parses with a strict RFC 4180 parser, writes back to the same text, and every row is as wide as its header", allFiles.length > 0 && allFiles.every((f) => f.parsed && writeBack(f.parsed) === f.text && f.parsed.every((r) => r.length === f.parsed[0].length)), j(allFiles.filter((f) => !f.parsed || writeBack(f.parsed) !== f.text).map((f) => f.name).slice(0, 5)));
const FORBIDDEN = /bank|account no|\bpan\b|ifsc|aadhaar|passport|address|emergency|\bid number/i;
const secrets = TESTERS({ records: [users.find((u) => u.id === "EMP-1029")] }).records.slice(1).concat(users).flatMap((u) => [u.bankAccount, u.pan, u.ifsc, u.address, u.emergencyContactName, u.emergencyContactPhone, u.personalEmail].filter((v) => v && String(v).length > 4).map(String));
const leaked = allFiles.flatMap((f) => secrets.filter((s) => f.text.includes(s)).map((s) => [f.name, s]));
check("F1", "no file has a bank account, PAN, IFSC, other ID number, address or emergency-contact column, and no stored value of those (the planted people's too) appears in any file", allFiles.every((f) => !f.rows[0].some((h) => FORBIDDEN.test(h))) && secrets.length >= 100 && leaked.length === 0, j({ secrets: secrets.length, leaked: leaked.slice(0, 3) }));

check("E99", "no js errors", allJsErrors.length === 0, j(allJsErrors.slice(0, 5)));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(0);
