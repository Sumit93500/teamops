// usage: node exports.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round Data export (JS stage), in jsdom with the js in ./js. Every CSV the app writes, as the roles that have it:
//   W  who gets an export: each page's Export button shows for exactly the roles that hold its permission; a manager (Sneha, Kabir) gets no team
//      attendance export; an Employee with no reports (Arjun) opens none of the export pages
//   B  every file: a UTF-8 BOM (the bytes EF BB BF), CRLF rows, "<lower-case-name>-<YYYY-MM-DD>.csv"
//   P  RFC 4180: each file parses with a strict CSV parser and writes back to the same bytes; header width = every row's width
//   V  the rows are the page's: as many as the table shows (all its visible rows), and a search narrows the CSV as it narrows the table
//   D  ISO dates in date columns (YYYY-MM-DD, an interval a/b, or "YYYY-MM-DD HH:MM" for a stock movement); N money and counts as plain numbers,
//      the unit in the heading where the page shows rupees
//   F  no bank account, PAN, IFSC, address or emergency-contact column, and no stored value of those anywhere in any file
//   I  formula injection: cells starting = + - @ tab CR are written with a leading '; a real negative in a numeric column stays a number; end to
//      end through planted values (a vendor, a user's name, a correction's reason) and the stock-out -6
//   E99 no js errors
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const RealDate = Date;
const NOW = new RealDate(2026, 8, 28, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
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
const fresh = (who) => { mem.clear(); mem.set("officeos:session", JSON.stringify({ roleKey: WHO[who][0], userLabel: WHO[who][1], employeeId: WHO[who][2], signedInAt: NOW })); };
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
// Clicks Export and returns the files: { name, bytes (Uint8Array), text (no BOM), rows (parsed) }
async function exportFiles() {
  blobs = []; names = [];
  exportButton()?.click();
  timers.splice(0).forEach((fn) => { try { fn(); } catch {} });
  return Promise.all(blobs.map(async (b, i) => { const bytes = new Uint8Array(await b.arrayBuffer()); const all = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes); const parsed = parse(all.replace(/^﻿/, ""));
    // parsed: the strict parse (null when malformed: P fails); rows: the same, or one empty row, so the other checks fail rather than crash
    return { name: names[i] ?? "?", bytes, raw: all, text: all.replace(/^﻿/, ""), parsed, rows: parsed ?? [["unparseable"]] }; }));
}
// A strict RFC 4180 parser: fields split by commas, records by CRLF, a quoted field may hold commas, quotes ("") and line breaks; null when malformed.
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
const visibleRows = (name) => [...d.querySelectorAll(`table[data-export-name="${name}"] tbody tr`)].filter((r) => !r.hidden && r.style.display !== "none" && r.children.length === d.querySelector(`table[data-export-name="${name}"] thead tr:last-child`).children.length).length;

// page, who holds it (who sees Export), export names, date columns, numeric columns (heading in the CSV)
const PAGES = [
  ["attendance/regularization", ["aarav", "priya"], ["regularization-requests"], { "regularization-requests": ["Date"] }, {}],
  ["attendance/team-attendance", ["aarav", "priya"], ["team-attendance"], {}, {}],
  ["dashboard/admin", ["aarav", "priya"], ["admin-dashboard-attendance", "admin-dashboard-stats"], {}, {}],
  ["dashboard/finance", ["aarav", "kabir"], ["finance-dashboard-payroll", "finance-dashboard-stats"], {}, { "finance-dashboard-payroll": ["Gross (₹)", "Deductions (₹)", "Net pay (₹)"] }],
  ["dashboard/hr", ["aarav", "priya"], ["hr-dashboard-leave-requests", "hr-dashboard-stats"], { "hr-dashboard-leave-requests": ["Dates"] }, { "hr-dashboard-leave-requests": ["Days"] }],
  ["finance/expenses", ["aarav", "kabir"], ["expense-claims"], { "expense-claims": ["Date"] }, { "expense-claims": ["Amount (₹)"] }],
  ["finance/tax-deductions", ["aarav", "kabir"], ["statutory-deductions", "tax-slabs"], { "statutory-deductions": ["Due date"] }, { "statutory-deductions": ["This month (₹)"] }],
  ["inventory/asset-assignment", ["aarav"], ["asset-assignments"], { "asset-assignments": ["Since"] }, {}],
  ["inventory/items", ["aarav"], ["inventory-items"], {}, { "inventory-items": ["In stock", "Reorder level", "Unit price (₹)"] }],
  ["inventory/stock-movements", ["aarav"], ["stock-movements"], { "stock-movements": ["Date"] }, { "stock-movements": ["Quantity"] }],
  ["inventory/vendors", ["aarav"], ["vendors"], {}, {}],
  ["leave/leave-approvals", ["aarav", "priya"], ["leave-requests"], { "leave-requests": ["Dates", "Applied"] }, { "leave-requests": ["Days"] }],
  ["payroll/salary-structure", ["aarav", "kabir"], ["salary-components", "employee-salaries"], { "employee-salaries": ["Last revised"] }, { "employee-salaries": ["Gross per month (₹)", "Annual cost (₹)"] }],
  ["users/users-list", ["aarav", "priya"], ["users"], {}, {}],
];
const ALL = ["aarav", "priya", "kabir", "sneha", "arjun"];
const runs = [];
section("W. Who gets an export");
const who = {};
for (const [page, holders] of PAGES) {
  who[page] = {};
  for (const k of ALL) { fresh(k); await open(page); who[page][k] = navigations ? "403" : exportButton() ? "export" : "no button"; if (holders.includes(k) && !navigations) runs.push([page, k, await exportFiles()]); }
}
console.log("      " + j(who));
check("W1", "each page's Export shows for exactly the roles that hold its permission (Admin, HR, Finance as each page allows), and nobody else gets a file", PAGES.every(([page, holders]) => ALL.every((k) => (who[page][k] === "export") === holders.includes(k))), j(who));
check("W2", "a manager gets no team export: Sneha (Employee, two reports) and Kabir (Finance, one report) open team attendance with no Export", who["attendance/team-attendance"].sneha === "no button" && who["attendance/team-attendance"].kabir === "no button", j(who["attendance/team-attendance"]));
check("W3", "an Employee with no reports (Arjun) opens none of the export pages (403) and so exports nothing", PAGES.every(([page]) => who[page].arjun === "403"), j(Object.fromEntries(PAGES.map(([p]) => [p, who[p].arjun]))));
const files = runs.flatMap(([page, k, fs]) => fs.map((f) => ({ ...f, page, who: k })));
check("W4", "every holder's export writes its files (one per exported table, plus the stats where the button says so)", runs.every(([page, , fs]) => fs.length === PAGES.find((p) => p[0] === page)[2].length) && files.length > 0, j(runs.map(([p, k, fs]) => [p, k, fs.map((f) => f.name)])));

section("B. The files");
check("B1", "every file starts with the UTF-8 BOM (bytes EF BB BF)", files.every((f) => f.bytes[0] === 0xef && f.bytes[1] === 0xbb && f.bytes[2] === 0xbf), j(files.filter((f) => !(f.bytes[0] === 0xef && f.bytes[1] === 0xbb)).map((f) => f.name)));
check("B2", "every file's rows end CRLF, never a bare LF or CR", files.every((f) => !/[^\r]\n|\r(?!\n)/.test(f.text.replace(/"([^"]|"")*"/g, ""))), j(files.filter((f) => /[^\r]\n/.test(f.text)).map((f) => f.name)));
check("B3", "every file name is '<lower-case export name>-2026-09-28.csv' (no spaces, no capitals)", files.every((f) => /^[a-z0-9]+(-[a-z0-9]+)*-2026-09-28\.csv$/.test(f.name)), j([...new Set(files.map((f) => f.name))]));

section("P. RFC 4180");
check("P1", "every file parses with a strict RFC 4180 parser, and writing the parsed rows back gives the same text", files.every((f) => f.parsed && writeBack(f.parsed) === f.text), j(files.filter((f) => !f.parsed || writeBack(f.parsed) !== f.text).map((f) => f.name)));
check("P2", "the header's width is every row's width", files.every((f) => f.parsed && f.parsed.every((r) => r.length === f.parsed[0].length)), j(files.filter((f) => !f.parsed?.every((r) => r.length === f.parsed[0].length)).map((f) => f.name)));

section("V. The rows are the page's");
const counts = [];
for (const [page, holders, exportsOf] of PAGES) { if (page === "users/users-list") continue; fresh(holders[0]); await open(page); const fs = await exportFiles();
  for (const name of exportsOf.filter((n) => !n.endsWith("-stats"))) { const f = fs.find((x) => x.name.startsWith(name + "-2")); counts.push([page, name, f ? f.rows.length - 1 : null, wholeList(name)]); } }
// Round Data export part 2 (behaviour; was the table's visible rows: a paged table's file now has its whole list, the "of N" its pager or row count shows)
function wholeList(name) { const t = d.querySelector(`table[data-export-name="${name}"]`); const m = (t.closest(".card") ?? d).querySelector(".pagination > span, #admin-rows-meta, #leave-rows-meta")?.textContent.match(/of (\d+)/); return m ? Number(m[1]) : visibleRows(name); }
check("V1", "each table's CSV holds the table's whole list: every page of it (the pager's 'of N'), else the rows it shows; the empty-state row never", counts.every(([, , csv, shown]) => csv === shown), j(counts));
fresh("aarav"); await open("attendance/team-attendance");
const searchBox = d.getElementById("team-search"); searchBox.value = "an"; searchBox.dispatchEvent(new w.Event("input"));
const NONE = { rows: [[]], text: "" };   // no file: the checks below fail rather than crash
const narrowed = (await exportFiles())[0] ?? NONE;
check("V2", "a search narrows the CSV as it narrows the table: team attendance searched 'an', same rows, same names", narrowed.rows.length - 1 === visibleRows("team-attendance") && narrowed.rows.slice(1).every((r) => /an/i.test(r[0])), j([narrowed.rows.length - 1, visibleRows("team-attendance")]));
fresh("aarav"); await open("users/users-list");
const usersAll = (await exportFiles())[0] ?? NONE;
const usersSearch = d.querySelector(".table__toolbar .input--search"); if (usersSearch) { usersSearch.value = "Rao"; usersSearch.dispatchEvent(new w.Event("input", { bubbles: true })); }
const usersRao = (await exportFiles())[0] ?? NONE;
check("V3", "users-list (its own export, through the shared writer): all ten people, and a search for 'Rao' gives Sneha Rao alone", usersAll.rows.length - 1 === 10 && usersRao.rows.length === 2 && usersRao.rows[1][1] === "Sneha Rao", j([usersAll.rows.length - 1, usersRao.rows]));

section("D, N. Dates and numbers");
const colOf = (f, h) => f.rows[0].indexOf(h);
const DATE = /^(\d{4}-\d{2}-\d{2}(\/\d{4}-\d{2}-\d{2})?( \((first|second) half\))?|\d{4}-\d{2}-\d{2} \d{2}:\d{2})?$/;
const dateCells = [], numCells = [];
for (const f of files) {
  const spec = PAGES.find((p) => p[0] === f.page); const name = f.name.replace(/-2026-09-28\.csv$/, "");
  for (const h of spec[3][name] ?? []) { const c = colOf(f, h); dateCells.push([f.name, h, c, f.rows.slice(1).map((r) => r[c])]); }
  for (const h of spec[4][name] ?? []) { const c = colOf(f, h); numCells.push([f.name, h, c, f.rows.slice(1).map((r) => r[c])]); }
}
check("D1", "every date column is ISO: YYYY-MM-DD, an interval a/b (a leave's dates, with '(first half)' for a half day), 'YYYY-MM-DD HH:MM' for a stock movement, or empty", dateCells.length >= 9 && dateCells.every(([, , c, v]) => c >= 0 && v.every((x) => DATE.test(x))), j(dateCells.filter(([, , c, v]) => c < 0 || !v.every((x) => DATE.test(x)))));
check("N1", "every money and count column is plain numbers (no ₹, no grouping commas) or empty, and money columns say (₹) in the heading", numCells.length >= 12 && numCells.every(([, , c, v]) => c >= 0 && v.every((x) => /^(-?\d+(\.\d+)?)?$/.test(x))) && numCells.filter(([, h]) => /Gross|Deductions|Net pay|Amount|This month|Unit price|Annual cost/.test(h)).every(([, h]) => h.endsWith(" (₹)")), j(numCells.filter(([, , c, v]) => c < 0 || !v.every((x) => /^(-?\d+(\.\d+)?)?$/.test(x)))));
const sm = files.find((f) => f.name.startsWith("stock-movements"));
check("N2", "a real negative stays a number: the stock-outs' quantities are -6, -1 ... (no leading ')", sm && sm.rows.slice(1).some((r) => r[colOf(sm, "Quantity")] === "-6") && sm.rows.slice(1).every((r) => !r[colOf(sm, "Quantity")].startsWith("'")), j(sm?.rows.slice(1).map((r) => r[colOf(sm, "Quantity")])));

section("F. Nothing forbidden");
const FORBIDDEN = /bank|account no|\bpan\b|ifsc|aadhaar|passport|address|emergency|\bid number/i;
check("F1", "no file has a bank account, PAN, IFSC, other ID number, address or emergency-contact column", files.every((f) => !f.rows[0].some((h) => FORBIDDEN.test(h))), j(files.flatMap((f) => f.rows[0].filter((h) => FORBIDDEN.test(h)))));
fresh("aarav"); await open("users/users-list");
const box = JSON.parse(mem.get("officeos:users"));
const secrets = box.records.flatMap((u) => [u.bankAccount, u.pan, u.ifsc, u.address, u.emergencyContactName, u.emergencyContactPhone, u.personalEmail].filter((v) => v && String(v).length > 4).map(String));
const leaked = files.flatMap((f) => secrets.filter((s) => f.text.includes(s)).map((s) => [f.name, s]));
check("F2", "no stored bank account, PAN, IFSC, address, emergency contact or personal email appears in any file", secrets.length >= 10 && leaked.length === 0, j({ secrets: secrets.length, leaked: leaked.slice(0, 5) }));

section("I. Formula injection");
const CE = await import(`./js/ui/csv-export.js?unit`);
const unit = [["=cmd|' /C calc'!A0", false, "'=cmd|' /C calc'!A0"], ["+1", false, "'+1"], ["-2+3", false, "'-2+3"], ["@SUM(A1:A9)", false, "'@SUM(A1:A9)"], ["\tx", false, "'\tx"], ["\rx", false, "\"'\rx\""],
  ["-6", true, "-6"], ["-1500.5", true, "-1500.5"], ["-6", false, "'-6"], ["-2+3", true, "'-2+3"], ["=1+1", true, "'=1+1"], ["4800", true, "4800"], ['a "b", c', false, '"a ""b"", c"'], ["line\r\nnext", false, '"line\r\nnext"']];
const got = unit.map(([v, num]) => (typeof CE.csvCell === "function" ? CE.csvCell(v, num) : "no shared csvCell"));   // a tree without it fails I1, rather than crashing
check("I1", "the cell rule: = + - @ tab CR starts get a leading ' (quoted when they need it); a plain number in a numeric column stays as it is, anything else there is guarded; quotes, commas and line breaks are quoted", unit.every(([, , want], i) => got[i] === want), j(unit.map(([v, n, want], i) => [v, n, want, got[i]]).filter((x) => x[2] !== x[3])));
// end to end: plant values in storage and export them
fresh("aarav"); await open("inventory/vendors");
const vbox = JSON.parse(mem.get("officeos:vendors") ?? "null");
if (vbox) { vbox.records[0].name = "@SUM(1+1)"; vbox.records[1].name = "=cmd|' /C calc'!A0"; mem.set("officeos:vendors", JSON.stringify(vbox)); }
await open("inventory/vendors");
const vf = (await exportFiles())[0] ?? NONE;
const vcells = vf.rows.slice(1).map((r) => r[0]);
check("I2", "end to end, vendors: names planted as @SUM(1+1) and =cmd|' /C calc'!A0 export with a leading '", !!vbox && vcells.some((c) => c.startsWith("'@SUM(1+1)")) && vcells.some((c) => c.startsWith("'=cmd")), j(vcells));
fresh("aarav"); await open("users/users-list"); S_edit("EMP-1105", "name", "+1 Arjun"); S_edit("EMP-1042", "name", "\tTab Rohan"); await open("users/users-list");
const uf = (await exportFiles())[0] ?? NONE;
check("I3", "end to end, users-list (its export now the shared one; stored values, raw): names planted as '+1 Arjun' and a tab start are written with a leading '", uf.rows.slice(1).some((r) => r[1] === "'+1 Arjun") && uf.rows.slice(1).some((r) => r[1] === "'\tTab Rohan"), j(uf.rows.slice(1).map((r) => r[1])));
function S_edit(id, field, value) { const b = JSON.parse(mem.get("officeos:users")); b.records.find((u) => u.id === id)[field] = value; mem.set("officeos:users", JSON.stringify(b)); }
fresh("aarav"); await open("attendance/regularization");
const rbox = JSON.parse(mem.get("officeos:regularizations") ?? "null");
const pend = rbox?.records.filter((r) => r.status === "pending") ?? [];
if (pend[0]) pend[0].reason = "-2+3"; if (pend[1]) pend[1].reason = "\tTAB";
if (rbox) mem.set("officeos:regularizations", JSON.stringify(rbox));
await open("attendance/regularization");
const rf = (await exportFiles())[0] ?? NONE;
const reasons = rf.rows.slice(1).map((r) => r[colOf(rf, "Reason")]);
check("I4", "end to end, regularization (a table: its visible text): a reason planted as -2+3 exports with a leading ' (a text column, not a number); one planted with a tab start loses the tab with the page's whitespace, so nothing starts with a tab", reasons.includes("'-2+3") && reasons.includes("TAB") && !reasons.some((x) => /^\t/.test(x)), j(reasons));

check("E99", "no js errors", allJsErrors.length === 0, j(allJsErrors.slice(0, 5)));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(0);
