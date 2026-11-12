// usage: node taxnote.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 10R: one clarifying line right after tax-deductions.html's slab card (10Q, Q2: the card highlights ₹9,00,000 in the
// 10% row, but the app charges it nothing: a standard deduction comes off first, and taxable income up to the rebate
// limit pays no tax). ./js-pre10R, ./html-pre10R and ./css-pre10R are the code, pages and css before this round
// (office-os 080b36b). A fixed clock: Fri 20 Nov 2026 10:00 local.
//   N  the line: its text from TAX_SAMPLE / annualTax, shown, right after the slab card (made by the page script: there's
//      no HTML line); it follows the constants (no drift); its example is the card's own highlighted amount; it isn't
//      made for a role without tax:view
//   U  nothing else on the page moved: figures, due dates, calendar and both CSV exports, byte for byte vs before
//   X  scope: exactly pages/tax-deductions.js, only 10R's lines; no page and no css changed
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const PAGE = "finance/tax-deductions";

const RealDate = Date;
const NOW = new RealDate(2026, 10, 20, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const WHO = { kabir: ["fin", "Kabir Shah", "EMP-1008"], aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"] };
let loads = 0, w = null, d = null, jsErrors = [], navigations = [], downloads = [];
const allJsErrors = [];
// open(who, pre): the page as it is (pages DIR + ./js), or as it was (./html-pre10R + ./js-pre10R).
async function open(who, pre = false) {
  const cur = globalThis.localStorage;
  const saved = Object.fromEntries(Array.from({ length: cur.length }, (_, i) => cur.key(i)).map((k) => [k, cur.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = []; navigations = []; downloads = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else { jsErrors.push(e.message); allJsErrors.push(e.message); } });
  const html = fs.readFileSync(pre ? `${HERE}html-pre10R/${PAGE}.html` : `${DIR}/${PAGE}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${PAGE}.html`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  const blobs = new Map(); let n = 0;
  w.Blob = class { constructor(parts) { this.text = parts.join(""); } };
  w.URL.createObjectURL = (b) => { const u = `blob:t/${++n}`; blobs.set(u, b.text); return u; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { if (this.href.startsWith("blob:")) downloads.push({ name: this.download, csv: blobs.get(this.href) }); };
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, Blob: w.Blob, URL: w.URL });
  loads++;
  const js = pre ? "js-pre10R" : "js";
  (await import(`./${js}/core/auth.js`)).signIn(...WHO[who]);
  await import(`./${js}/app.js?load=${loads}`);
  try { await import(`./${js}/pages/tax-deductions.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); allJsErrors.push(e.message); }
}
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;

const PR = await import("./js/data/payroll.js");
const { rupees } = await import("./js/ui/money.js");
const expected = (sd, rebate, example) => {
  const tax = Math.round(PR.annualTax(Math.max(0, example - sd)));
  // Round 13B (behavior; was "...standard deduction, and if what's left is ... no tax at all, so ..."): the note says the relief (relief.mjs N1)
  return `These rates apply only after a ${rupees(sd)} standard deduction. If what's left is ${rupees(rebate)} or less there's no tax at all, and above it the tax is never more than the amount over ${rupees(rebate)}, so the highlighted ${rupees(example)} pays ${tax ? `${rupees(tax)} a year` : "nothing"}.`;
};
const note = () => d.getElementById("slab-note");
const slabCard = () => [...d.querySelectorAll("section.card")].find((c) => txt(c.querySelector(".card__title")) === "Tax slabs, new regime");

// =====================================================================
section("N. The line under the slab table");
await open("kabir");
const n1 = txt(note()) ?? "";   // read through a guard: a run without the line fails its checks rather than crashing (9Z)
check("N1", "as Finance: the line is shown, and reads the standard deduction and the rebate limit from TAX_SAMPLE, with the highlighted example's real tax (nothing)",
  note() && !note().hidden && n1 === expected(PR.TAX_SAMPLE.standardDeduction, PR.TAX_SAMPLE.rebateLimit, 900000) && /pays nothing\.$/.test(n1), j(n1));
check("N2", "it sits right after the slab card (the card's next element), outside the card and outside any table, so the card and both exported tables are untouched",
  !!slabCard() && !!note() && slabCard().nextElementSibling === note() && !note().closest("section.card") && !note().closest("table") && d.querySelectorAll("#slab-note").length === 1,
  j([note()?.previousElementSibling?.tagName, note()?.parentElement?.className]));
const meta = txt(slabCard()?.querySelector(".card__meta")) ?? "";
const metaAmount = Number((meta.match(/₹([\d,]+)/) ?? [])[1]?.replace(/,/g, ""));
check("N3", "its example is the card's own highlighted amount (the meta line's ₹9,00,000), so the two can't disagree unnoticed", metaAmount === 900000 && n1.includes(rupees(metaAmount)), j([meta, metaAmount]));
// The constants changed at run time (the module object the page reads): the line must follow.
const keep = { ...PR.TAX_SAMPLE };
PR.TAX_SAMPLE.standardDeduction = 50000; PR.TAX_SAMPLE.rebateLimit = 700000;
await open("kabir");
const n4 = txt(note()) ?? "";
const want4 = expected(50000, 700000, 900000);   // worked out while the changed constants are still in place
Object.assign(PR.TAX_SAMPLE, keep);
check("N4", "no drift: with TAX_SAMPLE changed (₹50,000 deduction, ₹7,00,000 limit) the line says so, and works out that ₹9,00,000 now pays tax",
  n4 === want4 && /pays ₹[\d,]+ a year\.$/.test(n4), j(n4));
await open("kabir");
check("N5", "…and with the constants put back, it's the original line again", !!n1 && txt(note()) === n1);
await open("aarav");
check("N6", "as Admin: the same line", !!note() && !note().hidden && !!n1 && txt(note()) === n1);
await open("priya");
check("N7", "HR (no tax:view): sent to 403, and the script's can() guard never makes the line (none in the page)", navigations.length > 0 && !note(), j([navigations.length, txt(note())]));

// =====================================================================
section("U. Nothing else on the page moved (the page before 10R, side by side)");
const readPage = () => ({
  stats: [...d.querySelectorAll("[data-stat]")].map((s) => `${s.dataset.stat}=${txt(s.querySelector(".stat__value"))}|${txt(s.querySelector(".stat__delta"))}`),
  amounts: [...d.querySelectorAll("[data-amount]")].map((c) => `${c.dataset.amount}=${txt(c)}`),
  dues: [...d.querySelectorAll("[data-due]")].map((c) => `${c.dataset.due}=${txt(c)}`),
  calendar: [...d.querySelectorAll("#tax-calendar .list__item")].map((i) => txt(i)),
  regime: txt(d.getElementById("regime-bars")), subtitle: txt(d.getElementById("tax-subtitle")),
  slabs: [...slabCard().querySelectorAll("tbody tr")].map((r) => `${r.className}:${txt(r)}`), meta: txt(slabCard().querySelector(".card__meta")),
});
const exportCsv = () => { downloads = []; d.querySelector("[data-export]").click(); return downloads.map((x) => `${x.name}\n${x.csv}`); };
await open("kabir");
const now10R = readPage(), csvNow = exportCsv();
await open("kabir", true);
const pre10R = readPage(), csvPre = exportCsv();
check("U1", "the figures, amounts and due dates are the same as before 10R (live from payroll-store)", j([now10R.stats, now10R.amounts, now10R.dues]) === j([pre10R.stats, pre10R.amounts, pre10R.dues]), j(now10R.stats));
check("U2", "the filing calendar, the regime bars and the subtitle: the same", j([now10R.calendar, now10R.regime, now10R.subtitle]) === j([pre10R.calendar, pre10R.regime, pre10R.subtitle]));
check("U3", "the slab table and its meta line: the same, row for row (the ₹8–12 lakh row still highlighted)", j([now10R.slabs, now10R.meta]) === j([pre10R.slabs, pre10R.meta]) && now10R.slabs.filter((r) => r.includes("is-current")).length === 1);
// Round Data export (behaviour; was both files byte for byte 10R's: the statutory file now has plain numbers, ISO dates and a (₹) heading)
check("U4", "Export: two CSV files; the slab file byte for byte as before, and the line in neither", csvNow.length === 2 && csvNow[1] === csvPre[1] && !csvNow.join("").includes("standard deduction"), j(csvNow.map((x) => x.split("\n")[0])));
check("U5", "no JS errors on any load", allJsErrors.length === 0, allJsErrors.join(" | "));

// =====================================================================
section("X. Scope: exactly 10R's lines");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
// Round 10T (layout; was the live js vs js-pre10R, here and in X1): 10R's own change set, read from its frozen result
// (js-pre10T = HEAD 39c7334); the live js has 10T's manager-stage fallback since (mgrfall.mjs X1 / X4)
const changedJs = walk(`${HERE}js-pre10T`).filter((f) => SRC("js-pre10T", f) !== SRC("js-pre10R", f)).sort();
// Round 11B (layout; was the live pages, here and in the check below): this round's own page claim, read from its
// frozen result (html-pre11B = HEAD 97e1e6c); the live pages have 11B's sessions.html banner since (acctpages.mjs X2)
const changedHtml = walk(`${HERE}html-pre11B`).filter((f) => fs.readFileSync(`${HERE}html-pre11B/${f}`, "utf8") !== fs.readFileSync(`${HERE}html-pre10R/${f}`, "utf8")).sort();
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre10R", f)) : [];
check("X1", "js changed: exactly pages/tax-deductions.js; nothing added or removed", j(changedJs) === j(["pages/tax-deductions.js"]) && j(walk(`${HERE}js-pre10T`).sort()) === j(walk(`${HERE}js-pre10R`).sort()), j(changedJs));
check("X2", "no page and no css changed; nothing added or removed (the line is the script's, not the HTML's)", changedHtml.length === 0 && changedCss.length === 0 && j(walk(`${HERE}html-pre11B`).sort()) === j(walk(`${HERE}html-pre10R`).sort()), j([changedHtml, changedCss]));
const count = (s) => s.split("\r\n").reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
const delta = (a0, b0) => { const a = count(a0), b = count(b0); return { removed: [...a].flatMap(([l, n]) => Array(Math.max(0, n - (b.get(l) ?? 0))).fill(l)).sort(), added: [...b].reduce((t, [l, n]) => t + Math.max(0, n - (a.get(l) ?? 0)), 0) }; };
const htmlNow = SRC("html-pre14A", `${PAGE}.html`) /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */, htmlPre = SRC("html-pre10R", `${PAGE}.html`);
check("X3", "the script is CRLF only, with no final newline (as before)", !/[^\r]\n/.test(SRC("js", "pages/tax-deductions.js")) && !SRC("js", "pages/tax-deductions.js").endsWith("\n"));
// Round 13B (layout, X5; was the live script): 10R's change as 250f083 has the file (js-pre13B); the live one: relief.mjs X4
const dh = delta(htmlPre, htmlNow), dj = delta(SRC("js-pre10R", "pages/tax-deductions.js"), SRC("js-pre13B", "pages/tax-deductions.js"));
check("X4", "the page itself is byte-identical to before 10R (no slab-note in the HTML)", htmlNow === htmlPre && !htmlNow.includes("slab-note"), j(dh));
check("X5", "the script: only the payroll.js import line replaced, 17 lines added (the note, its insertion after the card, and its call)",
  j(dj) === j({ removed: ['import { PAY_RULES, filingDates, tdsReturn } from "../data/payroll.js";'], added: 17 }), j(dj));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
