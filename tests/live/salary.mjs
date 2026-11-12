// usage: node salary.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 4F: payroll/salary-structure.html with the js in ./js, in jsdom. The clock is local wall time, Wed 30 Sep
// 2026 11:00, except where a section moves it (1 Oct, 2 Nov); the seed is generated around "now" when storage is
// first read.
//   A  the store: salaryHistory(), salaryFor() on top of it, Vikram's earlier salary (seed v2), a stale v1 copy
//   B  who can open the page: Finance and Admin (salary:view) yes; HR and Employee sent to 403, nothing drawn
//   C  the components table against data/payroll.js's SALARY_COMPONENTS
//   D  the employee salaries table: every tracked person, gross, annual cost, last revised, status
//   E  search by name and the department filter (Customer Support included), combined
//   F  the example card: computePay() for the person shown; picking another row; Rohan vs the old static card
//   G  revision history: Vikram's real one; a scheduled revision (30 Sep, 1 Oct, 2 Nov); a pay cut; no salary
//   H  Export: the CSV files' content against the table on screen (filters included)
//   I  the alert, Export / Edit / Add component gating, the placeholders
//   J  sessions: old session with no employee id, nobody signed in
//   K  what this round leaves alone on the page (vs the frozen pre-4F HTML)
//   L  source layout, on frozen copies only: js-pre4F / js-post4F and html-pre4F / html-post4F
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HTML = fs.readFileSync(`${DIR}/payroll/salary-structure.html`, "utf8");
const PRE = fs.readFileSync(new URL("./html-pre4F/salary-structure.html", import.meta.url), "utf8");

const RealDate = Date;
const SEP30 = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
const OCT1 = new RealDate(2026, 9, 1, 11, 0, 0).getTime();
const NOV2 = new RealDate(2026, 10, 2, 11, 0, 0).getTime();
let NOW = SEP30;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
let blobs = [];
URL.createObjectURL = (blob) => { blobs.push(blob); return "blob:test"; };
URL.revokeObjectURL = () => {};

const WHO = {
  kabir: ["fin", "Kabir Shah", "EMP-1008"], aarav: ["admin", "Aarav Mehta", "EMP-1001"],
  priya: ["hr", "Priya Nair", "EMP-1003"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"],
  oldFin: ["fin", "Kabir Shah", undefined],
};

let loads = 0, w = null, d = null, saved = {};
let jsErrors = [], navigations = [], htmlWrites = [], downloads = [];
async function open(who) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = []; navigations = []; htmlWrites = []; downloads = []; blobs = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else jsErrors.push(e.message); });
  const dom = new JSDOM(HTML, { url: "http://localhost/office-os/pages/payroll/salary-structure.html", virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  const proto = w.Element.prototype;
  const inner = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", { get: inner.get, set(v) { htmlWrites.push(String(v)); inner.set.call(this, v); }, configurable: true });
  w.HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  const auth = await import("./js/core/auth.js");
  if (!who) auth.signOut(); else auth.signIn(...(Array.isArray(who) ? who : WHO[who]));
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/salary-structure.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
function fresh(at = SEP30) { if (w) w.localStorage.clear(); saved = {}; NOW = at; }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
// Round 14E part 2 (layout): a node's text without the reason lines showReason() adds under a badge or note (class reason); reasons2.mjs pins those lines
const txt = (node) => { if (!node) return null; const c = node.cloneNode(true); c.querySelectorAll?.(".reason").forEach((r) => r.remove()); return c.textContent.replace(/\s+/g, " ").trim(); };
const j = JSON.stringify;

// ---- independent arithmetic and formatting (not the app's code) ----
const money = (n) => `₹${n.toLocaleString("en-IN")}`;
const pfOf = (g) => Math.round(Math.round(g * 0.4) * 0.12);
const annualOf = (g) => (g + pfOf(g)) * 12;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateText = (iso) => { const [y, m, dd] = iso.split("-").map(Number); return `${dd} ${MON[m - 1]} ${y}`; };

// ---- readers ----
const $ = (id) => d.getElementById(id);
const fld = (name) => txt(d.querySelector(`main [data-field="${name}"]`));
const CARD = ["basic", "hra", "conveyance", "special", "gross", "pf", "pt", "tds", "deductions", "net", "cost-gross", "employer-pf", "monthly-cost", "annual-cost"];
const card = () => CARD.map(fld);
const cardTitle = () => txt($("salary-example-title"));
const history = () => [...$("salary-history").children].map((r) => [txt(r.querySelector("dt")), txt(r.querySelector("dd"))]);
const rowEls = () => [...$("salary-rows").children];
// The person cell as name + id (the avatar initials aside), like the CSV export reads it.
const person = (td) => (td.querySelector(".table__user-name") ? `${txt(td.querySelector(".table__user-name"))} ${txt(td.querySelector(".table__user-sub"))}` : txt(td));
const rows = () => rowEls().map((tr) => [...tr.children].slice(0, 6).map((td, i) => (i === 0 ? person(td) : txt(td))));
const rowOf = (id) => rowEls().find((tr) => tr.dataset.userId === id);
const badgeOf = (id) => rowOf(id)?.children[5].querySelector(".badge");
const breakdownBtn = (id) => rowOf(id)?.querySelector("button[aria-pressed]");
const pressed = () => rowEls().filter((tr) => tr.querySelector('button[aria-pressed="true"]')).map((tr) => tr.dataset.userId);
const comps = () => [...$("salary-components").children].map((tr) => [...tr.children].slice(0, 5).map(txt));
const meta = () => txt($("salary-rows-meta"));
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => txt(t.querySelector(".toast__text")) ?? txt(t));
const search = (v) => { $("salary-search").value = v; $("salary-search").dispatchEvent(new w.Event("input", { bubbles: true })); };
const dept = (v) => { $("salary-department").value = v; $("salary-department").dispatchEvent(new w.Event("change", { bubbles: true })); };
const names = () => rowEls().map((tr) => txt(tr.querySelector(".table__user-name")));
const noMoneyHtml = () => !htmlWrites.some((h) => /₹|Rohan|Vikram|Aarav/.test(h));
async function csv() {
  blobs = []; downloads = [];
  d.querySelector("[data-export]").click();
  const files = [];
  for (const b of blobs) files.push(new TextDecoder("utf-8").decode(new Uint8Array(await b.arrayBuffer())).replace(/^﻿/, "").split("\r\n"));
  return files;
}
// Mirrors ui/csv-export.js's quoting, to build the expected file from the screen.
const csvCell = (v) => { let t = String(v ?? ""); if (/^[=+\-@]/.test(t)) t = "'" + t; return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
function addSalary(rec) {
  const box = JSON.parse(w.localStorage.getItem("officeos:salaries"));
  box.records.push({ id: `SAL-${box.nextNum}`, regime: "new", ...rec });
  box.nextNum += 1;
  w.localStorage.setItem("officeos:salaries", JSON.stringify(box));
}

const P = await import("./js/data/payroll.js");
const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const { ROLES } = await import("./js/config/roles.js");
const { ROUTES } = await import("./js/config/routes.js");
const tracked = () => S.getAllUsers().filter((u) => u.status !== "inactive").sort((a, b) => a.name.localeCompare(b.name, "en"));
const SEED_GROSS = { "EMP-1001": 160000, "EMP-1003": 125000, "EMP-1008": 135000, "EMP-1017": 78500, "EMP-1023": 105000, "EMP-1029": 118000, "EMP-1042": 92000, "EMP-1088": 64000, "EMP-1105": 88000 };

// =====================================================================
section("A. The store: salaryHistory(), salaryFor(), Vikram's earlier salary");
fresh(); await open("kabir");
const vh = PS.salaryHistory("EMP-1088");
check("A1", "salaryHistory(Vikram): both records, newest effectiveFrom first (SAL-8 ₹64,000 from 1 Jan 2026, SAL-10 ₹60,000 from 1 Jan 2025)",
  j(vh.map((s) => [s.id, s.gross, s.effectiveFrom])) === j([["SAL-8", 64000, "2026-01-01"], ["SAL-10", 60000, "2025-01-01"]]), j(vh));
check("A2", "salaryHistory: one record for everyone else tracked, none for inactive Divya or an unknown id",
  tracked().filter((u) => u.id !== "EMP-1088").every((u) => j(PS.salaryHistory(u.id).map((s) => s.gross)) === j([SEED_GROSS[u.id]]))
  && j(PS.salaryHistory("EMP-1061")) === "[]" && j(PS.salaryHistory("EMP-9999")) === "[]");
const vf = [[2024, 12], [2025, 1], [2025, 12], [2026, 1], [2026, 9]].map(([y, m]) => PS.salaryFor("EMP-1088", y, m)?.gross ?? null);
check("A3", "salaryFor(Vikram): nothing before Jan 2025, ₹60,000 Jan to Dec 2025, ₹64,000 from Jan 2026", j(vf) === j([null, 60000, 60000, 64000, 64000]), j(vf));
const stamp = JSON.parse(w.localStorage.getItem("officeos:salaries"));
check("A4", "the saved collection: version 2, 10 records, next id SAL-11", stamp.version === 2 && stamp.records.length === 10 && stamp.nextNum === 11, j([stamp.version, stamp.records.length, stamp.nextNum]));
// Two records on the same date: the higher id wins, in salaryFor and first in salaryHistory (as before the round).
addSalary({ userId: "EMP-1042", gross: 93000, effectiveFrom: "2026-04-01" });
check("A5", "same effectiveFrom twice: the newer record (higher id) comes first and is the one in effect",
  PS.salaryHistory("EMP-1042")[0].gross === 93000 && PS.salaryFor("EMP-1042", 2026, 9).gross === 93000 && PS.salaryHistory("EMP-1042").length === 2);
// A saved copy from before this round (version 1, 9 records) is replaced by the new seed.
const v1 = { version: 1, nextNum: 10, records: PS.allSalaries().filter((s) => !["SAL-10", "SAL-11"].includes(s.id)) };
w.localStorage.setItem("officeos:salaries", JSON.stringify(v1));
await open("kabir");
check("A6", "a saved version-1 copy (9 records) is re-seeded: the page shows Vikram's two records",
  JSON.parse(w.localStorage.getItem("officeos:salaries")).version === 2 && PS.allSalaries().length === 10 && PS.salaryHistory("EMP-1088").length === 2);
check("A7", "opening the page writes nothing but the seeded collections (no new key for this page)",
  Object.keys(w.localStorage).every((k) => !/salary-structure|example|export/i.test(k)), j(Object.keys(w.localStorage).sort()));

// =====================================================================
section("B. Who can open the page");
check("B1", "the route needs salary:view; Admin and Finance have it, HR and Employee don't",
  ROUTES["payroll/salary-structure.html"] === "salary:view" && ["admin", "fin"].every((r) => ROLES[r].permissions.includes("salary:view")) && ["hr", "emp"].every((r) => !ROLES[r].permissions.includes("salary:view")));
for (const who of ["kabir", "aarav"]) {
  fresh(); await open(who);
  check(`B2${who[0]}`, `${who}: page drawn, no redirect, no errors, 9 rows`, navigations.length === 0 && jsErrors.length === 0 && rowEls().length === 9 && comps().length === 7, j([navigations, jsErrors]));
}
const STATIC_ROWS = new JSDOM(PRE).window.document.querySelectorAll("table[data-export-name='employee-salaries'] tbody tr").length;
for (const who of ["priya", "arjun"]) {
  fresh(); await open(who);
  check(`B3${who[0]}`, `${who} (${WHO[who][0]}): sent away by the guard (403), and the script draws nothing (static rows untouched, no salary HTML written)`,
    navigations.length === 1 && jsErrors.length === 0 && $("salary-rows").children.length === STATIC_ROWS && cardTitle() === "Example: Rohan Gupta"
    && !rowEls().some((tr) => tr.dataset.userId) && noMoneyHtml() && $("salary-components").querySelector("[data-component]") === null, j([navigations.length, jsErrors]));
}

// =====================================================================
section("C. Salary components, from data/payroll.js");
fresh(); await open("kabir");
check("C1", "7 rows, in SALARY_COMPONENTS order (data-component = its key); meta '7 components'",
  j([...$("salary-components").children].map((tr) => tr.dataset.component)) === j(P.SALARY_COMPONENTS.map((c) => c.key)) && txt($("salary-components-meta")) === "7 components");
check("C2", "the rows on screen",
  j(comps()) === j([
    ["Basic salary", "Earning", "40% of gross", "Yes", "Active"],
    ["House rent allowance", "Earning", "50% of basic", "Partly", "Active"],
    ["Conveyance allowance", "Earning", "Fixed ₹1,600 a month", "No", "Active"],
    ["Special allowance", "Earning", "Remainder of gross", "Yes", "Active"],
    ["Provident fund", "Deduction", "12% of basic", "–", "Active"],
    ["Professional tax", "Deduction", "Fixed ₹200 a month", "–", "Active"],
    ["Income tax (TDS)", "Deduction", "Slab-based, sample tax rates", "–", "Active"],   // Round 9F (behaviour; was "Slab-based")
  ]), j(comps()));
const TAX = { true: "Yes", partly: "Partly", false: "No", null: "–" };
check("C3", "each row is its SALARY_COMPONENTS entry: name, type, taxable, and the formula text (capitalised; 'fixed N' in rupees a month)",
  P.SALARY_COMPONENTS.every((c, i) => { const [name, type, how, tax] = comps()[i];
    const fixed = /^fixed (\d+)$/.exec(c.formula);
    return name === c.name && type.toLowerCase() === c.type && tax === TAX[String(c.taxable)]
      && how === (fixed ? `Fixed ${money(Number(fixed[1]))} a month` : c.formula[0].toUpperCase() + c.formula.slice(1)); }));
check("C4", "the numbers in the formulas are PAY_RULES' (40% basic, 50% HRA, ₹1,600, 12% PF, ₹200), the same numbers the example card is worked out with",
  comps()[0][2].startsWith(`${P.PAY_RULES.basicShare * 100}%`) && comps()[1][2].startsWith(`${P.PAY_RULES.hraShareOfBasic * 100}%`) && comps()[2][2].includes(money(P.PAY_RULES.conveyance))
  && comps()[4][2].startsWith(`${P.PAY_RULES.pfShareOfBasic * 100}%`) && comps()[5][2].includes(money(P.PAY_RULES.professionalTax)));
const typeBadges = [...$("salary-components").children].map((tr) => tr.children[1].firstElementChild.className);
check("C5", "type badges: Earning green, Deduction red (the classes the static page used)",
  j(typeBadges) === j([...Array(4).fill("badge badge--success badge--square"), ...Array(3).fill("badge badge--danger badge--square")]));

// =====================================================================
section("D. Employee salaries (30 Sep)");
const expectRow = (u) => { const g = SEED_GROSS[u.id]; const eff = u.id === "EMP-1088" ? "2026-01-01" : "2026-04-01";
  return [`${u.name} ${u.id}`, u.designation, money(g), money(annualOf(g)), dateText(eff), "Active"]; };
check("D1", "every tracked person (9, by name; inactive Divya not listed): name + id, designation, gross, annual cost, last revised, Active",
  j(rows()) === j(tracked().map(expectRow)) && !rowOf("EMP-1061"), j(rows().map((r) => r[0])));
check("D2", "annual cost = (gross + employer PF) x 12, PF = 12% of 40% of gross: Aarav (1,60,000 + 7,680) x 12 = 20,12,160; Vikram (64,000 + 3,072) x 12 = 8,04,864",
  rows()[0][3] === "₹20,12,160" && rowOf("EMP-1088").children[3].textContent === "₹8,04,864" && annualOf(160000) === 2012160 && annualOf(64000) === 804864);
check("D3", "gross and annual cost agree with computePay (gross, employerPf) for each person's salary in effect",
  tracked().every((u) => { const p = P.computePay(PS.salaryFor(u.id, 2026, 9).gross); const r = rowOf(u.id).children;
    return txt(r[2]) === money(p.gross) && txt(r[3]) === money((p.gross + p.employerPf) * 12); }));
check("D4", "'Last revised' is the effectiveFrom of the record in effect: 1 Jan 2026 for Vikram (not his older 1 Jan 2025), 1 Apr 2026 for the rest",
  tracked().every((u) => txt(rowOf(u.id).children[4]) === dateText(PS.salaryFor(u.id, 2026, 9).effectiveFrom)) && txt(rowOf("EMP-1088").children[4]) === "1 Jan 2026");
const OLD = [...new JSDOM(PRE).window.document.querySelectorAll("table[data-export-name='employee-salaries'] tbody tr")].map((tr) => [...tr.children].slice(0, 6).map((td, i) => (i === 0 ? person(td) : txt(td))));
const oldVsNew = OLD.map((o) => { const id = o[0].split(" ").at(-1); return [id, o.slice(2, 6), rows().find((r) => r[0].endsWith(id)).slice(2, 6)]; });
console.log(oldVsNew.map(([id, o, n]) => `      ${id}  old ${j(o)}  new ${j(n)}`).join("\n"));
check("D5", "the 5 old static rows: same gross, annual cost and last revised; only Arjun's status changes ('Revision pending' had no record behind it -> Active)",
  oldVsNew.every(([id, o, n]) => j(o.slice(0, 3)) === j(n.slice(0, 3)) && (id === "EMP-1105" ? o[3] === "Revision pending" && n[3] === "Active" : o[3] === n[3])));
check("D6", "footer 'Showing 9 of 9 employees'; the fake pager (Previous / Next) is gone", meta() === "Showing 9 of 9 employees" && !d.querySelector(".card__footer .btn-group") && ![...d.querySelectorAll("button")].some((b) => /^(Next|Previous)$/.test(txt(b))));
check("D7", "status badges green 'Active' for all 9, no title", tracked().every((u) => badgeOf(u.id).className === "badge badge--success badge--dot" && !badgeOf(u.id).title));
check("D8", "avatars and the id sub-line as on the static rows", rowEls().every((tr) => /^avatar avatar--[1-4]$/.test(tr.querySelector(".avatar").className) && txt(tr.querySelector(".table__user-sub")) === tr.dataset.userId));
S.updateUser(USER_ACTOR("admin", "EMP-1017"), "EMP-1017", { designation: "" });
await open("kabir");
check("D9", "a person with no designation on file: '—' in that column", rows().find((r) => r[0].startsWith("Ananya"))[1] === "—");

// =====================================================================
section("E. Search and department filter");
const opts = [...$("salary-department").options].map((o) => [o.value, o.textContent]);
check("E1", "department filter: All, then every department from the store, Customer Support included (it was missing), HR by its full name",
  j(opts) === j([["", "All departments"], ["ENG", "Engineering"], ["SAL", "Sales"], ["OPS", "Operations"], ["SUP", "Customer Support"], ["FIN", "Finance"], ["HR", "Human Resources"]]), j(opts));
dept("ENG");
check("E2", "Engineering: Aarav, Arjun, Rohan, Sneha; 'Showing 4 of 9 employees'", j(names()) === j(["Aarav Mehta", "Arjun Kapoor", "Rohan Gupta", "Sneha Rao"]) && meta() === "Showing 4 of 9 employees", j(names()));
dept("SUP");
const empty = rowEls()[0];
check("E3", "Customer Support (nobody in it): one 'No employees match these filters.' row across all 7 columns; 'Showing 0 of 9'",
  rowEls().length === 1 && txt(empty) === "No employees match these filters." && empty.firstElementChild.colSpan === 7 && meta() === "Showing 0 of 9 employees");
dept("HR");
check("E4", "Human Resources: Priya only (Divya is inactive)", j(names()) === j(["Priya Nair"]));
dept(""); search("  ROHAN ");
check("E5", "search: name only, trimmed, any case ('  ROHAN ' -> Rohan Gupta)", j(names()) === j(["Rohan Gupta"]) && meta() === "Showing 1 of 9 employees");
search("EMP-1042");
check("E6", "search doesn't match ids or designations ('EMP-1042', 'Engineer' -> nothing)", rowEls().length === 1 && !rowEls()[0].dataset.userId && (search("Engineer"), !rowEls()[0].dataset.userId));
search("a"); dept("ENG");
const both = names();
search("a"); dept("FIN");
const fin = names();
search("rohan"); dept("FIN");
const none = rowEls().length === 1 && !rowEls()[0].dataset.userId;
check("E7", "search and filter combine (AND): 'a' + Engineering = Aarav, Arjun, Sneha Rao, Rohan Gupta (all have an 'a'); 'a' + Finance = Kabir Shah, Meera Joshi; 'rohan' + Finance = none",
  j(both) === j(["Aarav Mehta", "Arjun Kapoor", "Rohan Gupta", "Sneha Rao"]) && j(fin) === j(["Kabir Shah", "Meera Joshi"]) && none, j([both, fin]));
search("kabir"); dept("SUP");
check("E8", "a name outside the chosen department (Kabir + Customer Support): none", rowEls().length === 1 && meta() === "Showing 0 of 9 employees");
search(""); dept("");
check("E9", "clearing both brings back all 9; ui/table-filter.js stays off this box (no row hidden by it)", rowEls().length === 9 && rowEls().every((tr) => !tr.hidden) && $("salary-search").dataset.tableFilter === "off");

// =====================================================================
section("F. The example card");
fresh(); await open("kabir");
const pay = (g) => { const p = P.computePay(g); return [p.earnings.basic, p.earnings.hra, p.earnings.conveyance, p.earnings.special, p.gross, p.deductionLines.pf, p.deductionLines.pt, p.deductionLines.tds, p.deductions, p.net, p.gross, p.employerPf, p.gross + p.employerPf, (p.gross + p.employerPf) * 12].map(money); };
check("F1", "starts on the first person in the table (Aarav Mehta), his button pressed", cardTitle() === "Example: Aarav Mehta" && j(pressed()) === j(["EMP-1001"]));
check("F2", "Aarav's card = computePay(1,60,000): 64,000 / 32,000 / 1,600 / 62,400 = 1,60,000; PF 7,680, PT 200, TDS 14,083 = 21,963; net 1,38,037; cost 1,67,680 a month, 20,12,160 a year",
  j(card()) === j(pay(160000)) && j(card()) === j(["₹64,000", "₹32,000", "₹1,600", "₹62,400", "₹1,60,000", "₹7,680", "₹200", "₹14,083", "₹21,963", "₹1,38,037", "₹1,60,000", "₹7,680", "₹1,67,680", "₹20,12,160"]), j(card()));
const s = P.splitGross(160000);
check("F3", "the earnings are splitGross(gross) and add up to the gross; deductions add up; net = gross - deductions",
  j(card().slice(0, 4)) === j([s.basic, s.hra, s.conveyance, s.special].map(money)) && s.basic + s.hra + s.conveyance + s.special === 160000 && 7680 + 200 + 14083 === 21963 && 160000 - 21963 === 138037);
breakdownBtn("EMP-1042").click();
const STATIC_CARD = [...new JSDOM(PRE).window.document.querySelectorAll(".breakdown dd")].map(txt);
check("F4", "Breakdown on Rohan's row: the card becomes Rohan's, his button pressed (primary), the others not",
  cardTitle() === "Example: Rohan Gupta" && j(pressed()) === j(["EMP-1042"]) && breakdownBtn("EMP-1042").className === "btn btn--sm btn--primary" && breakdownBtn("EMP-1001").className === "btn btn--sm" && j(card()) === j(pay(92000)));
console.log(`      Rohan, old static card: ${j(STATIC_CARD)}\n      Rohan, computed:        ${j(card())}`);
const same = [0, 1, 2, 3, 4, 5, 6, 10, 11, 12, 13];
check("F5", "Rohan vs the old static card: earnings, gross, PF, PT and the whole cost block match (the static card used the same formula)", same.every((i) => STATIC_CARD[i] === card()[i]), j(same.map((i) => [STATIC_CARD[i], card()[i]])));
check("F6", "... TDS differs: static ₹10,104, now ₹0 (12 x 92,000 - 75,000 = 10,29,000, under the ₹12,00,000 rebate limit), so deductions 4,616 not 14,720 and net 87,384 not 77,280",
  j([STATIC_CARD[7], STATIC_CARD[8], STATIC_CARD[9]]) === j(["₹10,104", "₹14,720", "₹77,280"]) && j([card()[7], card()[8], card()[9]]) === j(["₹0", "₹4,616", "₹87,384"]) && P.monthlyTds(92000) === 0 && 92000 * 12 - 75000 === 1029000);
dept("SAL");
check("F7", "filtering Rohan's row away keeps the card on Rohan", cardTitle() === "Example: Rohan Gupta" && j(names()) === j(["Ananya Iyer"]) && j(pressed()) === "[]");
dept("");
check("F8", "... and his button is still the pressed one when the row comes back", j(pressed()) === j(["EMP-1042"]));
check("F9", "every person's card = computePay of their salary in effect",
  tracked().every((u) => { breakdownBtn(u.id).click(); return cardTitle() === `Example: ${u.name}` && j(card()) === j(pay(PS.salaryFor(u.id, 2026, 9).gross)); }));
check("F10", "the breakdown is shown and the 'no salary' line hidden for someone with a salary", !$("salary-example-breakdown").hidden && $("salary-example-empty").hidden);

// =====================================================================
section("G. Revision history");
fresh(); await open("kabir");
breakdownBtn("EMP-1088").click();
check("G1", "Vikram: both records, newest first, with the raise: 'From 1 Jan 2026 ₹64,000 (+₹4,000)', 'From 1 Jan 2025 ₹60,000'",
  j(history()) === j([["From 1 Jan 2026", "₹64,000 (+₹4,000)"], ["From 1 Jan 2025", "₹60,000"]]), j(history()));
check("G2", "... his card uses the record in effect (₹64,000), and his row says last revised 1 Jan 2026, Active",
  fld("gross") === "₹64,000" && j(rows().find((r) => r[0].startsWith("Vikram")).slice(2)) === j(["₹64,000", "₹8,04,864", "1 Jan 2026", "Active"]));
breakdownBtn("EMP-1042").click();
check("G3", "someone with one record: one line, no change shown", j(history()) === j([["From 1 Apr 2026", "₹92,000"]]));
// A revision recorded for Arjun effective mid-October (stored directly: nothing writes salaries yet).
addSalary({ userId: "EMP-1105", gross: 95000, effectiveFrom: "2026-10-15" });
await open("kabir");
breakdownBtn("EMP-1105").click();
const arjun = () => rows().find((r) => r[0].startsWith("Arjun"));
check("G4", "30 Sep, a revision effective 15 Oct: the row still shows ₹88,000 / last revised 1 Apr 2026; status 'Revision due 15 Oct 2026' (amber, titled with the new figure)",
  j(arjun().slice(2)) === j(["₹88,000", money(annualOf(88000)), "1 Apr 2026", "Revision due 15 Oct 2026"]) && badgeOf("EMP-1105").className === "badge badge--warning badge--dot"
  && badgeOf("EMP-1105").title === "₹95,000 a month from 15 Oct 2026", j([arjun(), badgeOf("EMP-1105").title]));
check("G5", "... history: the new record first, marked not in effect yet, with the change; the card still ₹88,000",
  j(history()) === j([["From 15 Oct 2026 (not in effect yet)", "₹95,000 (+₹7,000)"], ["From 1 Apr 2026", "₹88,000"]]) && fld("gross") === "₹88,000", j(history()));
NOW = OCT1; await open("kabir");
check("G6", "1 Oct: October starts before 15 Oct, so it still uses ₹88,000 and the revision is still due (payroll's rule: the record in effect on the month's first day)",
  j(arjun().slice(2)) === j(["₹88,000", money(annualOf(88000)), "1 Apr 2026", "Revision due 15 Oct 2026"]) && PS.salaryFor("EMP-1105", 2026, 10).gross === 88000);
NOW = NOV2; await open("kabir");
breakdownBtn("EMP-1105").click();
check("G7", "2 Nov: ₹95,000 in effect, last revised 15 Oct 2026, Active; annual cost (95,000 + 4,560) x 12 = 11,94,720; card ₹95,000",
  j(arjun().slice(2)) === j(["₹95,000", "₹11,94,720", "15 Oct 2026", "Active"]) && fld("gross") === "₹95,000" && fld("annual-cost") === "₹11,94,720"
  && j(history()) === j([["From 15 Oct 2026", "₹95,000 (+₹7,000)"], ["From 1 Apr 2026", "₹88,000"]]), j([arjun(), history()]));
// Effective on the 1st: in effect that same month.
fresh(OCT1); await open("kabir");
addSalary({ userId: "EMP-1017", gross: 74000, effectiveFrom: "2026-10-01" });
await open("kabir");
breakdownBtn("EMP-1017").click();
check("G8", "a revision effective 1 Oct seen on 1 Oct is in effect at once; a pay cut shows as '−₹4,500'",
  j(rows().find((r) => r[0].startsWith("Ananya")).slice(2)) === j(["₹74,000", money(annualOf(74000)), "1 Oct 2026", "Active"])
  && j(history()) === j([["From 1 Oct 2026", "₹74,000 (−₹4,500)"], ["From 1 Apr 2026", "₹78,500"]]), j(history()));
// A new person with no salary, then one that starts later.
fresh(); await open("kabir");
const hire = S.addUser(USER_ACTOR("admin", null), { name: "Test Hire", email: "test.hire@northwind.com", department: "SUP", designation: "Support Agent", role: "emp" });
await open("kabir");
const hireRow = () => rows().find((r) => r[0].startsWith("Test Hire"));
check("G9", "a tracked person with no salary record: listed, '—' for gross / annual cost / last revised, red 'No salary on file'; 'Showing 10 of 10'",
  hire.ok && j(hireRow()) === j([`Test Hire ${hire.record.id}`, "Support Agent", "—", "—", "—", "No salary on file"]) && badgeOf(hire.record.id).className === "badge badge--danger badge--dot" && meta() === "Showing 10 of 10 employees", j(hireRow()));
dept("SUP");
check("G10", "... and Customer Support now finds them", j(names()) === j(["Test Hire"]));
breakdownBtn(hire.record.id).click();
check("G11", "... their card: title, the 'no salary' line instead of the figures, history 'No salary records'",
  cardTitle() === "Example: Test Hire" && $("salary-example-breakdown").hidden && !$("salary-example-empty").hidden && j(history()) === j([["No salary records", "—"]]));
addSalary({ userId: hire.record.id, gross: 40000, effectiveFrom: "2026-11-01" });
await open("kabir");
check("G12", "... a salary that starts 1 Nov: 'Starts 1 Nov 2026' (amber), still '—' this month",
  j(hireRow().slice(2)) === j(["—", "—", "—", "Starts 1 Nov 2026"]) && badgeOf(hire.record.id).className === "badge badge--warning badge--dot" && badgeOf(hire.record.id).title === "₹40,000 a month from 1 Nov 2026");
addSalary({ userId: hire.record.id, gross: 42000, effectiveFrom: "2026-12-01" });
await open("kabir");
breakdownBtn(hire.record.id).click();
check("G13", "two salaries still to come (1 Nov, 1 Dec): the status names the sooner one; the history lists both, newest first, neither in effect",
  hireRow()[5] === "Starts 1 Nov 2026" && j(history()) === j([["From 1 Dec 2026 (not in effect yet)", "₹42,000 (+₹2,000)"], ["From 1 Nov 2026 (not in effect yet)", "₹40,000"]]), j([hireRow()[5], history()]));
// Someone with no salary who sorts first by name: the starting example skips to the first person with one.
S.addUser(USER_ACTOR("admin", null), { name: "Aadya Bose", email: "aadya.bose@northwind.com", department: "ENG", designation: "Software Engineer", role: "emp" });
await open("kabir");
check("G14", "the first row has no salary (Aadya Bose, new): the starting example is the first person who has one (Aarav Mehta)",
  names()[0] === "Aadya Bose" && cardTitle() === "Example: Aarav Mehta" && j(pressed()) === j(["EMP-1001"]), j([names()[0], cardTitle()]));

// =====================================================================
section("H. Export");
fresh(); await open("kabir");
let [compCsv, empCsv] = await csv();
const screenCsv = (tbodyId, headSel) => {
  const table = $(tbodyId).closest("table");
  const keep = [...table.querySelectorAll("thead th")].map((th, i) => (th.classList.contains("table__actions") ? -1 : i)).filter((i) => i >= 0);
  const cell = (c) => [...c.querySelectorAll("*:not(.avatar)")].filter((e) => !e.children.length && !e.closest(".avatar")).map((e) => txt(e)).filter(Boolean).join(" ") || txt(c);
  return [keep.map((i) => txt(table.querySelectorAll("thead th")[i])), ...[...$(tbodyId).children].filter((tr) => tr.children.length > 1).map((tr) => keep.map((i) => cell(tr.children[i])))]
    .map((r) => r.map(csvCell).join(","));
};
check("H1", "Export writes two files, salary-components and employee-salaries, dated today",
  blobs.length === 2 && j(downloads) === j(["salary-components-2026-09-30.csv", "employee-salaries-2026-09-30.csv"]), j(downloads));
check("H2", "salary-components.csv = the components table (no Actions column)", j(compCsv) === j(screenCsv("salary-components")) && compCsv[0] === "Component,Type,How it is worked out,Taxable,Status" && compCsv.length === 8, j(compCsv.slice(0, 3)));
check("H3", "employee-salaries.csv = the salaries table on screen: header + 9 rows",
  // Round Data export (behaviour; was the screen's text and plain headings: plain numbers and ISO dates now, so the rows are matched by their first cell)
  // Round Data export part 2 (behaviour; was "Aarav Mehta EMP-1001" in one cell: the name, then the employee ID in its own column)
  j(empCsv.slice(1).map((l) => l.split(",").slice(0, 2).join(" "))) === j(screenCsv("salary-rows").slice(1).map((l) => l.split(",")[0])) && empCsv[0] === "Employee,Employee ID,Designation,Gross per month (₹),Annual cost (₹),Last revised,Status" && empCsv.length === 10, j(empCsv.slice(0, 3)));
check("H4", "... the real figures, e.g. 'Aarav Mehta EMP-1001,Administrator,\"₹1,60,000\",\"₹20,12,160\",1 Apr 2026,Active'",
  // Round Data export (behaviour; was "₹1,60,000","₹20,12,160",1 Apr 2026, and every row as the screen's text: plain numbers and an ISO date now)
  // Round Data export part 2 (behaviour; was 'Aarav Mehta EMP-1001,...': the name and the employee ID two columns)
  empCsv[1] === 'Aarav Mehta,EMP-1001,Administrator,160000,2012160,2026-04-01,Active'
  && empCsv.slice(1).every((line, i) => line.startsWith(`${tracked()[i].name},${tracked()[i].id},`) && expectRow(tracked()[i])[0] === `${tracked()[i].name} ${tracked()[i].id}`), empCsv[1]);
dept("ENG"); search("ha");
[, empCsv] = await csv();
check("H5", "with filters (Engineering + 'ha'): only the rows shown (Rohan Gupta, Sneha Rao; not Aarav or Arjun), as on screen",
  j(empCsv.length) === j(screenCsv("salary-rows").length) /* Round Data export (behaviour; was the whole rows equal to the screen's text) */ && j(empCsv.slice(1).map((l) => l.split(",")[0])) === j(["Rohan Gupta", "Sneha Rao"]) /* Round Data export part 2 (behaviour; was split at " EMP": the name is a column of its own) */
  && j(tracked().filter((u) => u.department === "ENG" && u.name.toLowerCase().includes("ha")).map((u) => u.name)) === j(["Rohan Gupta", "Sneha Rao"]), j(empCsv));
dept("SUP");
[, empCsv] = await csv();
check("H6", "nothing matching: the header only (the message row isn't exported)", j(empCsv) === j(["Employee,Employee ID,Designation,Gross per month (₹),Annual cost (₹),Last revised,Status"]) /* Round Data export (behaviour; the (₹) headings); Round Data export part 2 (the Employee ID column) */);

// =====================================================================
section("I. Alert, buttons and permissions");
fresh(); await open("kabir");
// Round 12W (behavior; was "Changing a salary isn't built yet, so Edit and Add component don't save anything."): a
// person's Edit saves now (saledit.mjs S1); the alert says which buttons still don't
// Round 12Y (behavior; the clause added): the approval step exists now (salpage.mjs K1 / D1), and the alert says so
check("I1", "the alert claims no approval step that doesn't exist (12Y: a non-Admin's change waits for an Admin, as built)",
  txt(d.querySelector(".alert")) === "Salary figures are only visible to roles with the salary:view permission. A person's Edit sets a new monthly gross from the 1st of a month (not your own): an Admin's change takes effect at once, anyone else's waits for an Admin to approve it. A component's Edit and Add component aren't built yet, so they don't save anything. A revised salary is used from the first payroll month that starts on or after its effective date.");
const exportBtn = d.querySelector("[data-export]");
check("I2", "Export is gated by salary:view (was reports:export, which HR has without salary:view)", exportBtn.dataset.permission === "salary:view" && ROLES.hr.permissions.includes("reports:export") && !ROLES.hr.permissions.includes("salary:view"));
for (const who of ["kabir", "aarav"]) {
  fresh(); await open(who);
  const edits = [...d.querySelectorAll("main button")].filter((b) => txt(b) === "Edit");
  // Round 12W (behavior; was "every Edit a placeholder"): the 9 people's Edit is the salary form now (saledit.mjs C2)
  check(`I3${who[0]}`, `${who}: Export, Add component and the 16 Edit buttons (7 components + 9 people) shown, all needing salary:edit; the 7 components' Edit and Add component placeholders, the people's not`,
    !d.querySelector("[data-export]").hidden && edits.length === 16 && edits.every((b) => !b.hidden && b.dataset.permission === "salary:edit")
    && j(edits.map((b) => b.dataset.notImplemented ?? null)) === j([...Array(7).fill("Edit"), ...Array(9).fill(null)])
    && [...d.querySelectorAll("main button")].some((b) => txt(b) === "Add component" && !b.hidden && b.dataset.notImplemented === "Add component"), j(edits.length));
}
// Round 12W (behavior; was "only the 'not available' toast"): a person's Edit opens the salary form (saledit.mjs D1)
const edit = [...$("salary-rows").querySelectorAll("button")].find((b) => txt(b) === "Edit" && !b.disabled);
edit.click();
check("I4", "clicking a row's Edit (not your own) opens the salary form, no toast; no salary record is written",
  j(toasts()) === "[]" && d.getElementById("salary-modal")?.classList.contains("is-open") === true && PS.allSalaries().length === 10, j(toasts()));
[...d.querySelectorAll("#salary-modal button")].find((b) => txt(b) === "Cancel")?.click();
const compEdit = [...$("salary-components").querySelectorAll("button")][0];
compEdit.click();
check("I5", "a component's Edit: the same toast", toasts().at(-1) === "Edit isn't available in this demo.");
check("I6", "Breakdown buttons need no permission (anyone who can open the page can use them)", rowEls().every((tr) => !breakdownBtn(tr.dataset.userId).dataset.permission && !breakdownBtn(tr.dataset.userId).hidden));
check("I7", "no salary HTML written with innerHTML (the page uses DOM calls)", noMoneyHtml());
// A role that may see salaries but not change them: Finance with salary:edit taken away for this check.
const finPerms = [...ROLES.fin.permissions];
ROLES.fin.permissions.splice(ROLES.fin.permissions.indexOf("salary:edit"), 1);
fresh(); await open("kabir");
const editsHidden = () => [...d.querySelectorAll("main button")].filter((b) => /^(Edit|Add component)$/.test(txt(b))).every((b) => b.hidden);
const hiddenAtLoad = editsHidden();
dept("ENG");
breakdownBtn("EMP-1042").click();
const hiddenAfter = editsHidden();
const others = !d.querySelector("[data-export]").hidden && rowEls().every((tr) => !breakdownBtn(tr.dataset.userId).hidden) && cardTitle() === "Example: Rohan Gupta";
ROLES.fin.permissions.splice(0, ROLES.fin.permissions.length, ...finPerms);
check("I8", "a role with salary:view but not salary:edit (Finance, with it removed for this check): every Edit and Add component hidden, also after filtering and picking a row; Export and Breakdown still there",
  hiddenAtLoad && hiddenAfter && others && ROLES.fin.permissions.includes("salary:edit"), j([hiddenAtLoad, hiddenAfter, others]));

// =====================================================================
section("J. Sessions");
fresh(); await open("oldFin");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("J1", "an old Finance session with no employee id: signed out and sent to sign in (round 11P, N2); the script draws nothing, as for nobody signed in (J2)", navigations.length === 1 && localStorage.getItem("officeos:session") === null && jsErrors.length === 0 && $("salary-rows").children.length === STATIC_ROWS && cardTitle() === "Example: Rohan Gupta" && noMoneyHtml());
fresh(); await open(null);
check("J2", "nobody signed in: sent to the login page, the script draws nothing", navigations.length === 1 && jsErrors.length === 0 && $("salary-rows").children.length === STATIC_ROWS && cardTitle() === "Example: Rohan Gupta" && noMoneyHtml());

// =====================================================================
section("K. What this round leaves alone (vs the frozen pre-4F HTML)");
const STATIC = new JSDOM(PRE).window.document;
fresh(); await open("kabir");
const strip = (node) => { const c = node.cloneNode(true); c.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id")); c.removeAttribute?.("id"); return c.outerHTML.replaceAll(' hidden=""', ""); };
check("K1", "page title, heading, subtitle, both tables' headings, card titles (but the example's) unchanged",
  d.title === STATIC.title && txt(d.querySelector("h1")) === txt(STATIC.querySelector("h1")) && txt(d.querySelector(".page-header__subtitle")) === txt(STATIC.querySelector(".page-header__subtitle"))
  && j([...d.querySelectorAll("thead")].map(strip)) === j([...STATIC.querySelectorAll("thead")].map(strip))
  && j([...d.querySelectorAll(".card__title")].map(txt).filter((t) => !t.startsWith("Example:"))) === j([...STATIC.querySelectorAll(".card__title")].map(txt).filter((t) => !t.startsWith("Example:"))));
check("K2", "the example card's labels: the static ones, plus the new 'Salary history' heading",
  // Round 9F (behaviour; was: equal to the frozen pre-4F labels): the Income tax (TDS) line now names the sample tax rates
  // Round 13N (behaviour; M2.2 (b): the example's TDS is spread evenly over the year, and says so)
  j([...d.querySelectorAll("#salary-example-breakdown dt, #salary-example-breakdown h4")].map(txt)) === j([...STATIC.querySelectorAll(".breakdown dt, .breakdown__title")].map(txt).map((t) => (t === "Income tax (TDS)" ? "Income tax (TDS), sample tax rates, spread evenly over the year" : t)))
  && j([...d.querySelectorAll(".card__body > h4")].map(txt)) === j(["Salary history"]));
check("K3", "topbar unchanged; the sidebar footer is the live count every page shows since Round 4G (not '248')",
  txt(d.querySelector(".topbar__left")) === txt(STATIC.querySelector(".topbar__left")) && txt(d.querySelector(".sidebar__footer")) === "Northwind Technologies 9 employees" /* Round 14E part 4 (behaviour; was "9 active employees") */);

// =====================================================================
section("L. Source layout (frozen copies only)");
const walk = (dir, base = "") => fs.readdirSync(new URL(`./${dir}/${base}`, import.meta.url), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const POST = walk("js-post4F");
const changed = POST.filter((p) => !fs.existsSync(new URL(`./js-pre4F/${p}`, import.meta.url)) || src("js-post4F", p) !== src("js-pre4F", p));
check("L1", "Round 4F's js changes (its result vs the code before it): payroll-store.js and the new page script; nothing removed",
  j(changed) === j(["data/payroll-store.js", "pages/salary-structure.js"]) && walk("js-pre4F").every((p) => POST.includes(p)), j(changed));
check("L2", "config/roles.js, routes.js, permissions.js, data/payroll.js, ui/pii.js, ui/money.js, ui/csv-export.js: unchanged",
  ["config/roles.js", "config/routes.js", "config/permissions.js", "data/payroll.js", "ui/pii.js", "ui/money.js", "ui/csv-export.js"].every((p) => src("js-post4F", p) === src("js-pre4F", p)));
const storeUndo = src("js-post4F", "data/payroll-store.js")
  .replace("// Nothing writes salaries yet (salary-structure.html only shows them), and the\r\n// Reset demo data button doesn't call resetPayrollData() yet.",
    "// Nothing writes salaries yet (no page edits them), and the Reset demo data\r\n// button doesn't call resetPayrollData() yet; both come with the payroll pages.")
  .replace("\r\n// Vikram also keeps the salary his 1 Jan 2026 revision replaced (SAL-10), so\r\n// one person has a real revision history. Divya Menon (inactive) has none.", "\r\n// Divya Menon (inactive) has none.")
  .replace(`  { id: "SAL-10", userId: "EMP-1088", gross: 60000, effectiveFrom: "2025-01-01", regime: "new" },   // Vikram Singh, before his 1 Jan 2026 raise\r\n`, "")
  .replace(`// Version 2 adds SAL-10; a saved version-1 copy is replaced with the new seed.\r\nconst salaries = createCollection({ key: "salaries", version: 2,`, `const salaries = createCollection({ key: "salaries", version: 1,`)
  .replace(`const newestFirst = (a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.id.localeCompare(a.id, "en", { numeric: true });\r\n`, "")
  .replace(`\r\n// Every salary record of one person, newest effectiveFrom first ([] if none).\r\nexport function salaryHistory(userId) {\r\n  return salaries.getAll().filter((s) => s.userId === userId).sort(newestFirst);\r\n}\r\n`, "")
  .replace(`  return salaryHistory(userId).find((s) => s.effectiveFrom <= first) ?? null;`,
    `  return salaries.getAll()\r\n    .filter((s) => s.userId === userId && s.effectiveFrom <= first)\r\n    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.id.localeCompare(a.id, "en", { numeric: true }))[0] ?? null;`);
check("L3", "payroll-store.js: only the seed record (+ version 2), salaryHistory() and salaryFor() reading through it, and their comments; nothing else touched",
  storeUndo === src("js-pre4F", "data/payroll-store.js") && src("js-post4F", "data/payroll-store.js") !== src("js-pre4F", "data/payroll-store.js"));
const page = src("js-post4F", "pages/salary-structure.js");
const code = page.split(/\r?\n/).filter((l) => !l.trim().startsWith("//")).join("\n");
check("L4", "the page script works out no pay itself: it imports SALARY_COMPONENTS and computePay, and salaryFor / salaryHistory, and no other pay function",
  /import \{ SALARY_COMPONENTS, computePay \} from "\.\.\/data\/payroll\.js";/.test(page) && /import \{ salaryFor, salaryHistory \} from "\.\.\/data\/payroll-store\.js";/.test(page)
  && !/splitGross|monthlyTds|providentFund|professionalTax|annualTax|lossOfPay|PAY_RULES|payrollRun|0\.4|0\.12|\* 0\.|toLocaleString/.test(code));
check("L5", "rupees come from ui/money.js (no page-local formatter); no bank account or PAN on this page, so ui/pii.js isn't needed",
  /import \{ rupees \} from "\.\.\/ui\/money\.js";/.test(page) && !/const rupees|function rupees/.test(page) && !/bankAccount|\.pan\b|••••|pii\.js/.test(code));
check("L6", "no innerHTML in the page script", !/innerHTML|outerHTML|insertAdjacentHTML/.test(code));
const hpre = (f) => src("html-pre4F", f), hpost = (f) => src("html-post4F", f);
check("L7", "the other payroll pages are untouched by Round 4F: payroll-run, payslips, payslip-view",
  j(walk("html-post4F")) === j(walk("html-pre4F")) && ["payroll-run.html", "payslips.html", "payslip-view.html"].every((f) => hpost(f) === hpre(f)));
const undo = hpost("salary-structure.html")
  .replace('data-permission="salary:view" data-export>', 'data-permission="reports:export" data-export>')
  .replace(/ id="salary-[a-z-]+"/g, "").replace(/ data-field="[a-z-]+"/g, "").replace(' data-table-filter="off"', "")
  .replace(`\r\n            <p class="text-muted" hidden>No salary on file for this month, so there's nothing to break down.</p>\r\n            <div>`, "")
  .replace(`\r\n            </div>\r\n\r\n            <h4 class="breakdown__title">Salary history</h4>\r\n            <dl class="breakdown">\r\n              <div class="breakdown__row"><dt>From 1 Apr 2026</dt><dd>₹92,000</dd></div>\r\n            </dl>`, "")
  .replace("Changing a salary isn't built yet, so Edit and Add component don't save anything. A revised salary is used from the first payroll month that starts on or after its effective date.", "A salary change needs Admin approval and starts from the next payroll run.")
  .replace(`<span class="card__meta">Showing 5 of 248 employees</span>\r\n`, `<span class="card__meta">Showing 5 of 248 employees</span>\r\n        <div class="btn-group">\r\n          <button class="btn btn--sm" type="button" disabled>Previous</button>\r\n          <button class="btn btn--sm" type="button" data-not-implemented="Next page">Next</button>\r\n        </div>\r\n`)
  .replace('\r\n<script type="module" src="../../assets/js/pages/salary-structure.js"></script>', "");
check("L8", "salary-structure.html: only ids / data-field hooks, the Export permission, the example wrapper + 'no salary' line + history, the alert, the pager removed and the script tag", undo === hpre("salary-structure.html"));
check("L9", "new / changed files CRLF with no final newline",
  [...changed.map((p) => ["js-post4F", p]), ["html-post4F", "salary-structure.html"]].every(([dir, p]) => { const t = src(dir, p); return !t.endsWith("\n") && !/(^|[^\r])\n/.test(t); }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
