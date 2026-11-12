// usage: node taxlabel.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 9F: every TDS amount on the payroll pages says it's worked out on sample tax rates (data/payroll.js's
// TAX_SAMPLE), in the Finance dashboard's phrase (9D). In jsdom with the js in ./js; ./js-pre9F and ./html-pre9F are
// the code and pages before this round (office-os d954a97).
//   A  payroll-run.html: Deductions "PF, PT and TDS (sample tax rates)"
//   B  payslips.html: "Tax deducted this year" note; the Year to date line
//   C  payslip-view.html: the payslip's Income tax (TDS) line
//   D  salary-structure.html: the TDS component row; the worked example's line
//   E  unchanged: tax-deductions.html ("Sample rules" on the filing dates, its alert, its TDS note) and the Finance
//      dashboard's 9D note; both byte for byte HEAD's
//   F  the sweep: every TDS amount on the payroll pages carries "sample tax rates"; one phrase, no variants
//   G  the change set, line endings, no page errors
// Clock: local wall time, Wed 7 Oct 2026 10:00 unless a test moves it.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const PAGE = {
  run: ["payroll/payroll-run.html", "payroll-run"], list: ["payroll/payslips.html", "payslips"], view: ["payroll/payslip-view.html", "payslip-view"],
  salary: ["payroll/salary-structure.html", "salary-structure"], tax: ["finance/tax-deductions.html", "tax-deductions"], fin: ["dashboard/finance.html", "finance-dashboard"],
};
const HTML = Object.fromEntries(Object.entries(PAGE).map(([k, [p]]) => [k, fs.readFileSync(`${DIR}/${p}`, "utf8")]));
const SRC = (dir, p) => fs.readFileSync(`${HERE}${dir}/${p}`, "utf8");
const PHRASE = "sample tax rates";

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 10, 7);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const WHO = { aarav: ["admin", "Aarav Mehta", "EMP-1001"], kabir: ["fin", "Kabir Shah", "EMP-1008"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"] };
let loads = 0, w = null, d = null, saved = {};
const jsErrors = [];
async function open(who, page, query = "") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) jsErrors.push(`${who} ${page}: ${e.message}`); });
  const dom = new JSDOM(HTML[page], { url: `http://localhost/office-os/pages/${PAGE[page][0]}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${PAGE[page][1]}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }
async function at(y, mo, dd, who, page, query = "") { setNow(y, mo, dd); fresh(); await open(who, page, query); }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const money = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const stat = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return [txt(s.querySelector(".stat__label")), txt(s.querySelector(".stat__value")), txt(s.querySelector(".stat__delta"))]; };
const line = (sel, field) => { const dd = d.querySelector(`${sel} [data-field="${field}"]`); return [txt(dd?.closest(".pay-line, .breakdown__row")?.querySelector("dt")), txt(dd)]; };
const parse = (html) => new JSDOM(html).window.document;
const LABEL = "Income tax (TDS), sample tax rates";
// Round 13N (behaviour; M2.2 (b)): the salary page's example card adds that its TDS is spread evenly over the year; the
// payslips keep LABEL (they follow the tax year, 13D)
const EX_LABEL = "Income tax (TDS), sample tax rates, spread evenly over the year";

const P = await import("./js/data/payroll.js");
const PS = await import("./js/data/payroll-store.js");

// =====================================================================
section("A. payroll-run.html: the Deductions note");
await at(2026, 10, 7, "kabir", "run");
const run = PS.payrollRun(2026, 10);
check("A1", "Kabir: Deductions ₹86,116, 'PF, PT and TDS (sample tax rates)'", j(stat("deductions")) === j(["Deductions", "₹86,116", "PF, PT and TDS (sample tax rates)"]), j(stat("deductions")));
check("A2", "…the figure is unchanged: the run's deductions (PF + PT + TDS)", stat("deductions")[1] === money(PS.runTotals(run).deductions));
check("A3", "the static HTML holds the same note (as it already mirrored the script's)", txt(parse(HTML.run).querySelector('[data-stat="deductions"] .stat__delta')) === "PF, PT and TDS (sample tax rates)");
await open("aarav", "run");
check("A4", "Aarav sees the same note", stat("deductions")[2] === "PF, PT and TDS (sample tax rates)");

// =====================================================================
section("B. payslips.html: the year's tax");
await at(2026, 10, 7, "aarav", "list");
const aaravSlips = PS.payslipsFor("EMP-1001");
const ytd = (slips) => slips.reduce((t, s) => t + s.deductionLines.tds, 0);
check("B1", "Aarav: 'Tax deducted this year' says 'TDS on sample tax rates, <months>'; the figure unchanged", stat("ytd-tds")[0] === "Tax deducted this year" && /^TDS on sample tax rates, /.test(stat("ytd-tds")[2]) && stat("ytd-tds")[1] !== "₹0", j(stat("ytd-tds")));
check("B2", "…the Year to date line reads 'Income tax (TDS), sample tax rates', the same amount as the stat", j(line("main", "tds")) === j([LABEL, stat("ytd-tds")[1]]), j(line("main", "tds")));
await at(2026, 10, 7, "arjun", "list");
check("B3", "Arjun (under the rebate, ₹0): 'TDS on sample tax rates, Sep to Oct'", j(stat("ytd-tds")) === j(["Tax deducted this year", "₹0", "TDS on sample tax rates, Sep to Oct"]), j(stat("ytd-tds")));
check("B4", "…his Year to date line too", j(line("main", "tds")) === j([LABEL, "₹0"]), j(line("main", "tds")));
check("B5", "the 'no payslips' wording is unchanged (no figure, nothing to label)", /: "TDS, no payslips"\);/.test(SRC("js", "pages/payslips.js")) && /TDS on sample tax rates, \$\{span\(slips\)\}/.test(SRC("js", "pages/payslips.js")));
void aaravSlips; void ytd;

// =====================================================================
section("C. payslip-view.html: the payslip's line");
await at(2026, 10, 7, "aarav", "view", "?month=2026-10");
const aaravOct = money(PS.payrollRunFor("EMP-1001", 2026, 10).deductionLines.tds);   // the store's own figure (₹14,083 on the seed)
check("C1", "Aarav's October payslip: 'Income tax (TDS), sample tax rates', his TDS from the store", j(line(".payslip", "tds")) === j([LABEL, aaravOct]) && aaravOct !== "₹0", j([line(".payslip", "tds"), aaravOct]));
await open("kabir", "view", "?month=2026-10&employee=EMP-1001");
check("C2", "Kabir (Finance) viewing Aarav's: the same line and amount", j(line(".payslip", "tds")) === j([LABEL, aaravOct]), j(line(".payslip", "tds")));
await open("arjun", "view", "?month=2026-10");
check("C3", "Arjun's own: the label, ₹0", j(line(".payslip", "tds")) === j([LABEL, "₹0"]), j(line(".payslip", "tds")));
const notes = [...d.getElementById("payslip-notes").children].map(txt);
check("C4", "no note was added: the notes box still holds only the month's own note (the label is on the line)", notes.length === 1 && /^October 2026 isn't over/.test(notes[0]) && !notes.some((n) => /sample/i.test(n)), j(notes));
check("C5", "the other deduction lines keep their labels", j(line(".payslip", "pf")[0]) === j("Provident fund") && line(".payslip", "pt")[0] === "Professional tax");

// =====================================================================
section("D. salary-structure.html: the component row and the example");
await at(2026, 10, 7, "kabir", "salary");
const comps = [...d.getElementById("salary-components").children].map((tr) => [...tr.children].slice(0, 5).map(txt));
check("D1", "the TDS component row: 'Slab-based, sample tax rates'", j(comps.find((c) => c[0] === "Income tax (TDS)")) === j(["Income tax (TDS)", "Deduction", "Slab-based, sample tax rates", "–", "Active"]), j(comps.at(-1)));
check("D2", "…from SALARY_COMPONENTS' formula (the one source), the other six rows' text unchanged",
  P.SALARY_COMPONENTS.find((c) => c.key === "tds").formula === "slab-based, sample tax rates" && j(comps.slice(0, 6).map((c) => c[2])) === j(["40% of gross", "50% of basic", "Fixed ₹1,600 a month", "Remainder of gross", "12% of basic", "Fixed ₹200 a month"]), j(comps.map((c) => c[2])));
const exTds = line("#salary-example-breakdown", "tds");
check("D3", "the worked example: 'Income tax (TDS), sample tax rates, spread evenly over the year', the example's computed TDS", exTds[0] === EX_LABEL && /^₹[\d,]+$/.test(exTds[1]) && exTds[1] !== "₹10,104", j(exTds));
check("D4", "the static HTML's row and example label carry the same text (the row's old 'Worked out from the tax slab' gone)",
  /<td>Slab-based, sample tax rates<\/td>/.test(HTML.salary) && !/Worked out from the tax slab/.test(HTML.salary) && HTML.salary.includes(`<dt>${EX_LABEL}</dt>`));

// =====================================================================
section("E. Unchanged: tax-deductions.html and the Finance dashboard");
await at(2026, 10, 7, "kabir", "tax");
const cal = [...d.querySelectorAll(".card")].find((c) => txt(c.querySelector(".card__title")) === "Filing calendar");
check("E1", "tax-deductions.html: the Filing calendar (the dates) is still 'Sample rules'", txt(cal?.querySelector(".card__meta")) === "Sample rules");
check("E2", "…its TDS stat note still 'Deposit by 7 Nov', its alert and hint as before", stat("tds")[2] === "Deposit by 7 Nov"
  && txt(d.querySelector("main .alert--warning")) === "These slabs and rates are sample values for the design. When the real app is built, use the current government rates. Professional tax also depends on the state, so it is set per work location."
  && /on the sample slabs\.$/.test(txt([...d.querySelectorAll("main .form-hint")].find((h) => /declarations/.test(txt(h))))), j(stat("tds")));
// Round 10R (layout; was the live tax-deductions.js): 10R adds the slab note to it (taxnote.mjs X1 / X5), so the script is read
// from its frozen copy (js-pre10R = HEAD 080b36b); the page is still the live one, untouched
check("E3", "…tax-deductions.html and tax-deductions.js are byte for byte HEAD's (the script as it was before 10R's slab note)", SRC("html-pre14A", "finance/tax-deductions.html") /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */ === SRC("html-pre9F", "finance/tax-deductions.html") && SRC("js-pre10R", "pages/tax-deductions.js") === SRC("js-pre9F", "pages/tax-deductions.js"));
await open("kabir", "fin");
check("E4", "the Finance dashboard: TDS still 'Sample tax rates; deposit by 7 Nov' (9D)", j(stat("tds")) === j(["Tax deducted (TDS)", "₹37,972", "Sample tax rates; deposit by 7 Nov"]), j(stat("tds")));
// Round 9H (layout; was ./js's finance-dashboard.js vs js-pre9F): 9F's own guard, read from 9F's frozen result (js-pre9H =
// HEAD 55cee02); 9H has since changed finance-dashboard.js (a cancellation's dot), not its TDS note (E4 still checks that)
check("E5", "…finance.html and finance-dashboard.js are byte for byte HEAD's (9F's result, frozen)", SRC("html-pre13Z", "dashboard/finance.html") === SRC("html-pre9F", "dashboard/finance.html") && SRC("js-pre9H", "pages/finance-dashboard.js") === SRC("js-pre9F", "pages/finance-dashboard.js"));

// =====================================================================
section("F. The sweep: every TDS amount on the payroll pages says so");
// Every stat, line or row on these pages whose label mentions TDS or tax, as each viewer sees it.
const tdsPlaces = () => [...d.querySelectorAll("main .stat, main .pay-line, main .breakdown__row, main tbody tr")]
  .filter((n) => /TDS|[Ii]ncome tax|[Tt]ax deducted/.test(txt(n.querySelector(".stat__label, dt, td")) ?? ""))
  .map((n) => txt(n));
const sweep = [];
for (const [who, page, query] of [["kabir", "run", ""], ["aarav", "list", ""], ["arjun", "list", ""], ["aarav", "view", "?month=2026-10"], ["kabir", "view", "?month=2026-09&employee=EMP-1042"], ["kabir", "salary", ""]]) {
  await at(2026, 10, 7, who, page, query);
  sweep.push(...tdsPlaces().map((t) => `${page}: ${t}`));
}
check("F1", "the Deductions stat and every place a TDS amount is shown: each carries 'sample tax rates'",
  sweep.length >= 6 && sweep.every((s) => s.includes(PHRASE)), j(sweep.filter((s) => !s.includes(PHRASE))));
check("F2", "…and payroll-run's Deductions too (it includes TDS)", (await (async () => { await at(2026, 10, 7, "kabir", "run"); return stat("deductions")[2].includes(PHRASE); })()));
const changedFiles = ["payroll/payroll-run.html", "payroll/payslips.html", "payroll/payslip-view.html", "payroll/salary-structure.html"].map((p) => fs.readFileSync(`${DIR}/${p}`, "utf8"))
  .concat(["pages/payroll-run.js", "pages/payslips.js", "data/payroll.js"].map((p) => SRC("js", p)));
check("F3", "one phrase: no other variant ('sample rates', 'sample tax rules', 'Sample rules') in the 7 changed files", !changedFiles.some((s) => /sample rates|sample tax rules|Sample rules/i.test(s.replace(/sample tax rates/gi, ""))));

// =====================================================================
section("G. Change set and hygiene");
const walk = (root, rel = "") => fs.readdirSync(`${root}/${rel}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${rel}${e.name}/`) : [`${rel}${e.name}`]));
// Round 9H (layout): 9F's own change set, read from its frozen result (js-pre9H = HEAD 55cee02); ./js now holds 9H's
const changedJs = walk(`${HERE}js-pre9H`).filter((f) => SRC("js-pre9H", f) !== SRC("js-pre9F", f)).sort();
// Round 9J (layout; was the live pages vs html-pre9F): 9F's own page change set, read from the frozen pages before 9J
// (html-pre9J = HEAD 3b6c915; 9G and 9H changed no page); the live pages now hold 9J's
const changedHtml = walk(`${HERE}html-pre9J`).filter((f) => f.endsWith(".html") && SRC("html-pre9J", f) !== SRC("html-pre9F", f)).sort();
check("G1", "js changed from HEAD: data/payroll.js, pages/payroll-run.js, pages/payslips.js; nothing added or removed",
  j(changedJs) === j(["data/payroll.js", "pages/payroll-run.js", "pages/payslips.js"]) && j(walk(`${HERE}js-pre9H`).sort()) === j(walk(`${HERE}js-pre9F`).sort()), j(changedJs));
check("G2", "pages changed from HEAD: payroll-run, payslip-view, payslips, salary-structure", j(changedHtml) === j(["payroll/payroll-run.html", "payroll/payslip-view.html", "payroll/payslips.html", "payroll/salary-structure.html"]), j(changedHtml));
check("G3", "the 7 are CRLF only, with no final newline", changedFiles.every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
// Round 13B (layout; was the live payroll.js: annualTax() has 13B's relief since, relief.mjs X3): read as 250f083 has it (js-pre13B)
check("G4", "the pay arithmetic is untouched: monthlyTds, TAX_SAMPLE and payslipFor read as HEAD's", ["monthlyTds", "payslipFor", "annualTax"].every((fn) => { const pick = (s) => s.slice(s.indexOf(`function ${fn}(`), s.indexOf("\n}", s.indexOf(`function ${fn}(`))); return pick(SRC("js-pre13B", "data/payroll.js")) === pick(SRC("js-pre9F", "data/payroll.js")); })
  // Round 11N (layout; was the live payroll-store.js: read from the frozen result js-pre11N = HEAD fcdc960; the live one has 11N's checkSalary since (roadnotes.mjs P4 / X4); the tax functions stay live)
  && SRC("js", "data/payroll.js").includes("export const TAX_SAMPLE = {") && SRC("js-pre11N", "data/payroll-store.js") === SRC("js-pre9F", "data/payroll-store.js"));
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
