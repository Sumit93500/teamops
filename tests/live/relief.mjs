// usage: node relief.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 13B (R10's U4c, 10U; round-13a-scoping.md): marginal relief above the rebate limit. data/payroll.js annualTax()
// caps the tax above ₹12,00,000 at the income above it, on the annual figure; monthlyTds() divides by 12 and rounds as
// before. The tax page's note says so. ./js-pre13B, ./html-pre13B and ./css-pre13B are the code, pages and css before
// this round (office-os 250f083).
//   G  before: the cliff;  R  the rule (annualTax(), monthlyTds(), computePay(), net never falls by more than ₹1);
//   S  nothing seeded moves, and a raise across the limit through the real store;  U  U4d unchanged (TDS on the full
//   monthly gross);  N  the tax page's note;  E  no page errors;  X  scope
// Storage seeded Fri 30 Oct 2026 19:00 (salchain's fixture where a case says); the pages opened 20 Nov 11:00.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
setNow(2026, 11, 20);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", KABIR = "EMP-1008", MEERA = "EMP-1023";

let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, who, js = "./js") {
  mem.set("officeos:session", JSON.stringify({ roleKey: who[0], userLabel: who[1], employeeId: who[2], signedInAt: NOW }));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${DIR}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`${js}/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); }
  }
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

const P = await import("./js/data/payroll.js");
const OLDP = await import("./js-pre13B/data/payroll.js");   // before this round
const PS = await import("./js/data/payroll-store.js");
const OLDPS = await import("./js-pre13B/data/payroll-store.js");   // before this round, on the same storage
const S = await import("./js/data/store.js");
const LIMIT = 1200000;

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
function plain() { mem.clear(); setNow(2026, 10, 30, 19); S.getAllUsers(); PS.allSalaries(); setNow(2026, 11, 20); }
// salchain's fixture: pending leave cancelled and corrections rejected (so Sep-Nov settle), Vikram given a joining date.
function settled() {
  mem.clear(); setNow(2026, 10, 30, 19); S.getAllUsers(); PS.allSalaries(); PS.payrollRun(2026, 10);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, "EMP-1088", { dateOfJoining: "8 Jan 2024" });
}

// =================================================================
section("G. Before");
check("G1", "the code before: at ₹12,00,000 taxable no tax; ₹1 over it the whole slab tax (₹60,000 a year), so a ₹1,06,251 gross pays ₹5,000 TDS and nets ₹4,999 less than ₹1,06,250",
  OLDP.annualTax(LIMIT) === 0 && Math.round(OLDP.annualTax(LIMIT + 1)) === 60000 && OLDP.computePay(106251).deductionLines.tds === 5000 && OLDP.computePay(106250).net - OLDP.computePay(106251).net === 4999);

// =================================================================
section("R. The rule");
const at = (t) => [t, P.annualTax(t), OLDP.annualTax(t)];
const R1 = [at(0), at(825000), at(LIMIT), at(LIMIT + 1), at(1210000), at(1250000), at(1270588), at(1270589), at(1300000), at(1600000), at(2500000)];
check("R1", "annualTax(): ₹0 up to ₹12,00,000 as before; above it the income over the limit (₹1 at ₹12,00,001, ₹10,000 at ₹12,10,000, ₹50,000 at ₹12,50,000) until the slab tax is smaller, from ₹12,70,588 on the same as before",
  j(R1.map(([t, n]) => [t, n])) === j([[0, 0], [825000, 0], [LIMIT, 0], [LIMIT + 1, 1], [1210000, 10000], [1250000, 50000], [1270588, 70588], [1270589, 70588.35], [1300000, 75000], [1600000, 120000], [2500000, 330000]])
  && R1.slice(7).every(([, n, o]) => n === o), j(R1));
let r2 = 0, r2bad = null;
for (let t = 1150000; t <= 1350000; t++) { r2++; const want = Math.min(OLDP.annualTax(t), Math.max(0, t - LIMIT)); if (P.annualTax(t) !== want && !r2bad) r2bad = [t, P.annualTax(t), want]; }
check("R2", `annualTax(t) == min(the slab tax, t − ₹12,00,000) for every t from ₹11,50,000 to ₹13,50,000 (${r2.toLocaleString("en-IN")} values)`, r2bad === null, j(r2bad));
const R3 = [106250, 106251, 107000, 110000, 112131, 112132, 135000, 160000].map((g) => [g, P.monthlyTds(g), Math.round(P.annualTax(Math.max(0, 12 * g - 75000)) / 12)]);
check("R3", "monthlyTds(G) is still round(annualTax(12·G − ₹75,000) / 12): ₹0, ₹1, ₹750, ₹3,750, ₹5,881, ₹5,882, ₹9,313, ₹14,083",
  R3.every(([, a, b]) => a === b) && j(R3.map(([, a]) => a)) === j([0, 1, 750, 3750, 5881, 5882, 9313, 14083]), j(R3));
const net = (g) => P.computePay(g).net;
check("R4", "computePay(): ₹1,06,251 pays ₹1 TDS and nets ₹1,00,950, the same as ₹1,06,250 (was ₹5,000 and ₹95,951)", P.computePay(106251).deductionLines.tds === 1 && net(106251) === 100950 && net(106250) === 100950);
let worst = [0, 0], drops = 0;
for (let g = 90000; g < 140000; g++) { const dn = net(g) - net(g + 1); if (dn > 0) { drops++; if (dn > worst[1]) worst = [g, dn]; } }
check("R5", "from ₹90,000 to ₹1,40,000 a month, ₹1 more gross never nets more than ₹1 less (before: ₹4,999 at ₹1,06,250); the ₹1 steps are rounding",
  worst[1] <= 1 && drops > 0, j({ drops, worst }));
check("R6", "net first matches ₹1,06,250's again at ₹1,06,251 (before: ₹1,12,484), and above ₹1,12,132 it's the same as before",
  net(106251) >= net(106250) && [112132, 112484, 120000, 135000, 160000].every((g) => net(g) === OLDP.computePay(g).net));

// =================================================================
section("S. Nothing seeded moves; a raise across the limit, through the store");
settled(); setNow(2026, 12, 9);
const months = [[2026, 9], [2026, 10], [2026, 11]];
const same = months.map(([y, m]) => j(PS.payrollRun(y, m).rows) === j(OLDPS.payrollRun(y, m).rows));
check("S1", "every seeded salary is outside ₹1,06,251-₹1,12,131 a month (Meera ₹1,05,000, Sneha ₹1,18,000 nearest), so September-November's runs are the same as before, row for row",
  same.every(Boolean) && PS.allSalaries().every((s) => s.gross <= 106250 || s.gross >= 112132), j(same));
plain();
const raise = PS.proposeSalary(AARAV, MEERA, { gross: 106251, effectiveFrom: "2026-12-01" });
const nov = PS.payrollRunFor(MEERA, 2026, 11), dec = PS.payrollRunFor(MEERA, 2026, 12), decOld = OLDPS.payrollRunFor(MEERA, 2026, 12);
// Round 13D (behavior; was TDS ₹1, net ₹1,00,950, ₹1,190 more): TDS is on the year's pay now, and her year stays under the limit (tdsyear.mjs S7)
check("S2", "Aarav raises Meera ₹1,05,000 → ₹1,06,251 from 1 Dec (final at once): December's TDS ₹0 (13D: her year stays under the limit; 13B alone ₹1), net ₹1,00,951, ₹1,191 more than November's (the code before 13B: ₹5,000, ₹3,809 less)",
  raise.ok && dec.deductionLines.tds === 0 && dec.net === 100951 && dec.net - nov.net === 1191 && decOld.deductionLines.tds === 5000 && decOld.net - nov.net === -3809, j([dec.deductionLines.tds, dec.net, decOld.deductionLines.tds]));

// =================================================================
section("U. computePay() without a year (the salary page's example) is still monthlyTds() of the full monthly gross");
const lop = (P_, g, n, wd) => P_.computePay(g, { unpaidLeaveDays: n, workingDays: wd }).deductionLines.tds;
check("U1", "with loss of pay, TDS is still monthlyTds() of the full monthly gross: ₹1,60,000 with 2 of 21 days unpaid ₹14,083 (as before); ₹1,06,251 with 1 of 22 unpaid ₹1 (its relief figure)",
  lop(P, 160000, 2, 21) === 14083 && lop(OLDP, 160000, 2, 21) === 14083 && lop(P, 106251, 1, 22) === 1);

// =================================================================
section("N. The tax page's note");
const NOTE = "These rates apply only after a ₹75,000 standard deduction. If what's left is ₹12,00,000 or less there's no tax at all, and above it the tax is never more than the amount over ₹12,00,000, so the highlighted ₹9,00,000 pays nothing.";
plain(); await open("finance/tax-deductions", ["fin", "Kabir Shah", KABIR]);
const n1 = d.getElementById("slab-note"), main1 = txt(d.querySelector("main")).replace(txt(n1), "<note>");
await open("finance/tax-deductions", ["fin", "Kabir Shah", KABIR], "./js-pre13B");
const n0 = d.getElementById("slab-note"), main0 = txt(d.querySelector("main")).replace(txt(n0), "<note>");
check("N1", "Kabir's tax page: the note after the slab card says the relief, in place of the old sentence", txt(n1) === NOTE && n1?.className === "form-hint"
  && txt(n0) === "These rates apply only after a ₹75,000 standard deduction, and if what's left is ₹12,00,000 or less there's no tax at all, so the highlighted ₹9,00,000 pays nothing.", j(txt(n1)));
check("N2", "the rest of the page reads the same as before (stats, slabs, the filing calendar)", main1 === main0 && main1.length > 500);

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
// Round 13D (layout, X1; was the live js): 13B's own change set (js-pre13D = 2d67e81); the live js: tdsyear.mjs X1
const jsNow = walk("./js-pre13D"), jsPre = walk("./js-pre13B");
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre13D", p) !== srcAt("./js-pre13B", p));
check("X1", "exactly two js files changed, none added or removed: data/payroll.js, pages/tax-deductions.js", j(changedJs) === j(["data/payroll.js", "pages/tax-deductions.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 13N (layout, X2; was the live pages): 13B's own pages; the live pages: resetcard.mjs X2
const pagesNow = walk("./html-pre13N").filter((f) => f.endsWith(".html"));
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre13B").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre13N", p) === srcAt("./html-pre13B", p))
  && walk("./css-pre13B").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre13B", p)));
const crlf = (s) => !s.endsWith("\n") && !/(^|[^\r])\n/.test(s);
const codeOf = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l));
const added = (now, pre) => codeOf(now).filter((l) => !codeOf(pre).includes(l));
// Round 13D (layout, X3; was the live payroll.js and its exports): payroll.js as 2d67e81 has it (js-pre13D); the live one: tdsyear.mjs X3
const P13B = await import("./js-pre13D/data/payroll.js");
const [py, pyP, tx, txP] = [srcAt("./js-pre13D", "data/payroll.js"), srcAt("./js-pre13B", "data/payroll.js"), srcAt("./js", "pages/tax-deductions.js"), srcAt("./js-pre13B", "pages/tax-deductions.js")];
check("X3", "both CRLF, no final newline; payroll.js: comments aside, annualTax()'s return is the one code line changed (and no export added or removed)",
  crlf(py) && crlf(tx) && j(added(py, pyP)) === j(["  return Math.min(tax, taxable - TAX_SAMPLE.rebateLimit);"]) && j(added(pyP, py)) === j(["  return tax;"])
  && j(Object.keys(P13B).sort()) === j(Object.keys(OLDP).sort()), j([added(py, pyP), added(pyP, py)]));
check("X4", "tax-deductions.js: comments aside, only the note's sentence changed (its three lines)",
  // Round Data export (layout: the five cells it now writes through csvValue, and its csvColumns line and import, aside)
  // Round Chart data (layout: the regime counts it now reads from taxRegimeChart(), and that import, aside)
  j(added(txP, tx).filter((l) => !/^\s+(amountCell|dueCell)\(/.test(l) && !/withSalary|const onNew|const onOld|regime-meta/.test(l))) === j(["  const note = el(\"p\", \"form-hint\", `These rates apply only after a ${rupees(TAX_SAMPLE.standardDeduction)} standard deduction, and if what's left is `",
    "    + `${rupees(TAX_SAMPLE.rebateLimit)} or less there's no tax at all, so the highlighted ${rupees(SLAB_EXAMPLE)} pays ${tax ? `${rupees(tax)} a year` : \"nothing\"}.`);"])
  && added(tx, txP).filter((l) => !/csvValue\(|csvColumns\(|csv-export\.js/.test(l) && !/chart-data\.js|taxRegimeChart\(|valuesOf\(data|regime-meta|Math\.max\(1, data\.total\)/.test(l)).length === 3 /* the five cells now written through csvValue; the regime lines read from chart-data.js */, j([added(txP, tx), added(tx, txP)]));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
