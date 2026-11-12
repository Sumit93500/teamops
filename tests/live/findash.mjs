// usage: node findash.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 9D: dashboard/finance.html's three label / feed fixes from 9C, in jsdom with the js in ./js. ./js-pre9D and
// ./html-pre9D are the code and pages before this round (office-os 52f5703).
//   A  the "Pending approvals" card retitled "Pending expense approvals"; its list (pendingFor()) untouched
//   B  cancelled claims in the expense activity, read exactly as the Admin dashboard's feed reads them (9C's
//      cancel-and-compare)
//   C  the TDS note says the figure uses sample tax rates; tax-deductions.html, payroll-run.html and the payslips
//      untouched
//   D  the change set, line endings, no innerHTML, no page errors
// Clock: local wall time, Wed 7 Oct 2026 10:00 unless a test moves it; each scenario sets the clock before fresh().
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const PAGE = {
  fin: ["dashboard/finance.html", "finance-dashboard"], admin: ["dashboard/admin.html", "admin-dashboard"],
  tax: ["finance/tax-deductions.html", "tax-deductions"], run: ["payroll/payroll-run.html", "payroll-run"],
};
const HTML = Object.fromEntries(Object.entries(PAGE).map(([k, [p]]) => [k, fs.readFileSync(`${DIR}/${p}`, "utf8")]));
const SRC = (dir, p) => fs.readFileSync(`${HERE}${dir}/${p}`, "utf8");
const FIN_JS = SRC("js", "pages/finance-dashboard.js"), FIN_JS0 = SRC("js-pre9D", "pages/finance-dashboard.js");

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
  aarav: ["admin", "Aarav Mehta", "EMP-1001"], kabir: ["fin", "Kabir Shah", "EMP-1008"], priya: ["hr", "Priya Nair", "EMP-1003"],
  sneha: ["emp", "Sneha Rao", "EMP-1029"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"],
};
let loads = 0, w = null, d = null, saved = {};
const jsErrors = [], htmlWrites = [];
async function open(who, page) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) jsErrors.push(`${who} ${page}: ${e.message}`); });
  const dom = new JSDOM(HTML[page], { url: `http://localhost/office-os/pages/${PAGE[page][0]}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  const proto = w.Element.prototype;
  const inner = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", { get: inner.get, set(v) { htmlWrites.push(String(v)); inner.set.call(this, v); }, configurable: true });
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
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
const stat = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return [txt(s.querySelector(".stat__label")), txt(s.querySelector(".stat__value")), txt(s.querySelector(".stat__delta"))]; };
function parts(node) {
  const out = [];
  const walker = node.ownerDocument.createTreeWalker(node, 4);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) { if (t.parentElement.closest(".avatar")) continue; const v = t.textContent.replace(/\s+/g, " ").trim(); if (v) out.push(v); }
  return out.join(" | ");
}
const finFeed = () => [...$("fin-activity").children].map(parts);
const finDots = () => [...$("fin-activity").querySelectorAll(".activity__dot")].map((s) => s.className.replace("activity__dot activity__dot--", ""));
const adminFeed = () => [...$("admin-activity").children].map(parts);
const adminDots = () => [...$("admin-activity").querySelectorAll(".activity__dot")].map((s) => s.className.replace("activity__dot activity__dot--", ""));
const card = () => $("fin-approvals");
const cardTitle = () => txt(card().querySelector(".card__title"));
const cardMeta = () => txt(card().querySelector(".card__meta"));
const cardIds = () => [...card().querySelectorAll(".list__item")].map((i) => i.dataset.claimId);
const fnText = (src, name) => { const i = src.indexOf(`function ${name}(`); return i < 0 ? null : src.slice(i, src.indexOf("\n}\n".replace(/\n/g, src.includes("\r\n") ? "\r\n" : "\n"), i)); };
const visible = (node) => Boolean(node) && !node.closest("[hidden]");

const S = await import("./js/data/store.js");
const E = await import("./js/data/expenses-store.js");
const PS = await import("./js/data/payroll-store.js");
const parse = (html) => new JSDOM(html).window.document;
const STATIC = parse(HTML.fin);

// =====================================================================
section("A. The card's title says what it lists");
await at(2026, 10, 7, "kabir", "fin");
check("A1", "Kabir: the card is titled 'Pending expense approvals'", cardTitle() === "Pending expense approvals", cardTitle());
const kabirPending = E.pendingFor("EMP-1008", "fin").sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id, "en", { numeric: true }));
check("A2", "…its list is unchanged: pendingFor()'s claims, oldest first, '2 open', each linking to the inbox", j(cardIds()) === j(kabirPending.map((c) => c.id)) && cardMeta() === "2 open"
  && [...card().querySelectorAll(".list__item a.btn")].every((a) => a.getAttribute("href").endsWith("requests/approvals-inbox.html")), j([cardIds(), cardMeta()]));
await open("priya", "fin");
check("A3", "HR: still '0 open' and 'No expense claims are waiting for you.' (cleanup.mjs B9's behaviour), now under a title that says it's expense claims only",
  cardTitle() === "Pending expense approvals" && cardMeta() === "0 open" && txt(card().querySelector(".list")) === "No expense claims are waiting for you.", j([cardTitle(), cardMeta()]));
await open("aarav", "fin");
check("A4", "Aarav: the one expense claim waiting for him, as before (his leave and corrections stay in the inbox and the sidebar's count)", cardTitle() === "Pending expense approvals" && cardMeta() === "1 open" && cardIds().length === 1, j([cardMeta(), cardIds()]));
check("A5", "the static HTML carries the new title, and no other card on the page is titled 'Pending approvals'", txt(STATIC.querySelector("#fin-approvals .card__title")) === "Pending expense approvals"
  && ![...STATIC.querySelectorAll(".card__title")].some((t) => txt(t) === "Pending approvals"));
// Round 14G (wiring; was byte for byte HEAD's): Review opens the approval card, one line; everything else in the function is still HEAD's (cardbell.mjs D5 has the card)
const without14G = (s) => s?.split(/\r?\n/).filter((l) => !/^\s*cardLink\(open, "expenses", claim\.id, \{ refresh: \(\) => renderPendingApprovals\(card\) \}\);   \/\/ the approval card \(round 14G\); still a link to the inbox$/.test(l)).join("\n") ?? null;
check("A6", "the list's code is untouched: renderPendingApprovals() is byte for byte HEAD's (a label fix, not a rewiring), apart from 14G's one line wiring Review to the card", fnText(FIN_JS, "renderPendingApprovals") !== null && fnText(FIN_JS, "renderPendingApprovals") !== fnText(FIN_JS0, "renderPendingApprovals") && without14G(fnText(FIN_JS, "renderPendingApprovals")) === without14G(fnText(FIN_JS0, "renderPendingApprovals")));

// =====================================================================
section("B. Cancelled claims: the same event reads the same on both dashboards");
await at(2026, 10, 7, "kabir", "fin");
const before = finFeed();
setNow(2026, 10, 7, 11, 0);
const cancel1 = E.cancelExpense("EXP-3106", "EMP-1105");   // Arjun's ₹1,850, pending at his manager
await open("kabir", "fin");
const fin1 = finFeed(), finDots1 = finDots();
await open("aarav", "admin");
const admin1 = adminFeed(), adminDots1 = adminDots();
check("B1", "Arjun cancels his ₹1,850 claim: Finance's feed leads with '₹1,850 claim from Arjun Kapoor cancelled by Arjun Kapoor | 7 Oct' (9C found it missing)",
  cancel1.ok && fin1[0] === "₹1,850 claim from Arjun Kapoor cancelled by Arjun Kapoor | 7 Oct" && !before.some((s) => /cancelled/.test(s)), j(fin1));
// Round 9H (behaviour; was finDots1[0] === "primary" && adminDots1[0] === "primary"): a cancellation's dot is the
// neutral grey on both dashboards (the Finance accent, which primary uses, is all but the warning of a sent claim)
check("B2", "…exactly the Admin dashboard's line for the same event, with the same dot (Round 9H: muted, was primary)", fin1[0] === admin1[0] && finDots1[0] === "muted" && adminDots1[0] === "muted", j([fin1[0], admin1[0], finDots1[0], adminDots1[0]]));
check("B3", "…the claim's earlier 'sent' event stays, now followed by what became of it", fin1.includes("Expense claim from Arjun Kapoor, ₹1,850 | 25 Sep"), j(fin1));
setNow(2026, 10, 7, 12, 0);
const cancel2 = E.cancelExpense("EXP-3103", "EMP-1042");   // Rohan's ₹62,000, already approved twice, pending at the Admin stage
await open("kabir", "fin");
const fin2 = finFeed();
await open("aarav", "admin");
check("B4", "a claim cancelled after two approvals: '₹62,000 claim from Rohan Gupta cancelled by Rohan Gupta', newest first, the same on both dashboards",
  cancel2.ok && fin2[0] === "₹62,000 claim from Rohan Gupta cancelled by Rohan Gupta | 7 Oct" && fin2[1] === fin1[0] && adminFeed()[0] === fin2[0] && adminFeed()[1] === fin1[0], j([fin2.slice(0, 2), adminFeed().slice(0, 2)]));
check("B5", "every expense line in the Admin feed reads exactly as in Finance's (the newest five of each, expense lines only)",
  (() => { const exp = adminFeed().filter((s) => / claim from |^Expense claim from /.test(s)); return exp.length >= 2 && exp.every((s) => fin2.includes(s)); })(), j(adminFeed()));
await open("priya", "fin");
// Round Manager scoping part 1 (behaviour; was: let in, the card hidden: HR can't open finance.html now (dashboard:finance); the page's script, which jsdom still runs, draws no feed)
check("B6", "HR can't open finance.html (dashboard:finance), and no feed is drawn", (await import("./js/config/routes.js")).ROUTES["dashboard/finance.html"] === "dashboard:finance" && !(await import("./js/config/roles.js")).ROLES.hr.permissions.includes("dashboard:finance") && $("fin-activity").children.length === 0);
await open("sneha", "fin");
// Round Manager scoping part 1 (behaviour; was: let in, the feed hidden: an Employee can't open finance.html now; the page's script, which jsdom still runs, draws no feed and no cancelled claim)
check("B7", "Sneha (Employee, Arjun's manager) can't open finance.html (dashboard:finance); no feed drawn, and her card no longer lists the cancelled claim", (await import("./js/config/routes.js")).ROUTES["dashboard/finance.html"] === "dashboard:finance" && !(await import("./js/config/roles.js")).ROLES.emp.permissions.includes("dashboard:finance") && $("fin-activity").children.length === 0 && cardMeta() === "0 open" && cardIds().length === 0, j([cardMeta(), cardIds()]));
await at(2026, 10, 7, "kabir", "fin");
setNow(2026, 10, 7, 12, 30);
E.submitExpense("EMP-1001", { category: "software", amount: 4999, date: "2026-10-06", reason: "Licence", receipt: "inv.pdf" });   // Aarav's own: auto-approved
await open("kabir", "fin");
check("B8", "an Admin's own claim: one 'sent' event; its automatic approvals still aren't events (unchanged rule)", finFeed()[0] === "Expense claim from Aarav Mehta, ₹4,999 | 7 Oct" && !finFeed().some((s) => /auto|approved by Aarav Mehta \| 7 Oct/.test(s)), j(finFeed()));
check("B9", "the event map gains 'cancelled' and nothing else (skipped and auto-approved still left out)",
  // Round 9H (behaviour; was dot: "primary")
  /cancelled: \{ dot: "muted",   text: \(c, h\) => `\$\{claimText\(c\)\} cancelled by \$\{nameOf\(h\.byUserId\)\}` \},/.test(FIN_JS) && !/skipped:|"auto-approved":/.test(FIN_JS.slice(FIN_JS.indexOf("const EVENT"), FIN_JS.indexOf("const ACTIVITY_SHOWN"))));

// =====================================================================
section("C. TDS: the note says the rates are sample ones");
await at(2026, 10, 7, "kabir", "fin");
const finTds = stat("tds");
check("C1", "Kabir, 7 Oct: 'Tax deducted (TDS)' ₹37,972, 'Sample tax rates; deposit by 7 Nov'", j(finTds) === j(["Tax deducted (TDS)", "₹37,972", "Sample tax rates; deposit by 7 Nov"]), j(finTds));
const run = PS.payrollRun(2026, 10);
check("C2", "…the figure is unchanged: the run's TDS (payslipTotals)", finTds[1] === `₹${PS.payslipTotals(run.rows).tds.toLocaleString("en-IN")}`);
await open("kabir", "tax");
const taxTds = stat("tds");
check("C3", "tax-deductions.html is untouched: the same ₹37,972, its own note still 'Deposit by 7 Nov' (it labels the rules itself)", taxTds[1] === finTds[1] && taxTds[2] === "Deposit by 7 Nov", j(taxTds));
await open("kabir", "run");
const runStats = [...d.querySelectorAll("main .stat")].map((s) => `${txt(s.querySelector(".stat__label"))}=${txt(s.querySelector(".stat__delta"))}`);
// Round 9F (behaviour; was "payroll-run.html is untouched: Deductions still 'PF, PT and TDS', no sample-rates note (that's a
// later, wider change)"): 9F is that change; payroll-run.html now says "PF, PT and TDS (sample tax rates)"
check("C4", "Round 9F: payroll-run.html's Deductions now 'PF, PT and TDS (sample tax rates)' (9D left it unlabelled; 9F is the wider change)", runStats.includes("Deductions=PF, PT and TDS (sample tax rates)"), j(runStats));
await open("aarav", "fin");
check("C5", "Aarav sees the same note", stat("tds")[2] === "Sample tax rates; deposit by 7 Nov");
blobs = [];
d.querySelector("[data-export]").click();
const files = await Promise.all(blobs.map(async (b) => (await b.text()).replace(/^﻿/, "").split("\r\n")));
check("C6", "the stats export still carries the figure (the export reads labels and values, not notes)", (files.find((f) => f[0] === "Metric,Value") ?? []).includes("Tax deducted (TDS) (₹),37972") /* Round Data export part 2 (behaviour; was "₹37,972" under a plain metric: a plain number, the unit in the metric) */, j(files.find((f) => f[0] === "Metric,Value")));
await at(2026, 12, 30, "kabir", "fin");
check("C7", "30 Dec: 'Sample tax rates; deposit by 7 Jan' (into the next year)", stat("tds")[2] === "Sample tax rates; deposit by 7 Jan", j(stat("tds")));
await at(2026, 10, 7, "priya", "fin");
// Round Manager scoping part 1 (behaviour; was: let in, the stat hidden: HR can't open finance.html now (dashboard:finance); nothing drawn in the stat)
check("C8", "HR can't open finance.html (dashboard:finance); the TDS stat '—', no note (the page's own gate, payroll:view, unchanged)", (await import("./js/config/routes.js")).ROUTES["dashboard/finance.html"] === "dashboard:finance" && !(await import("./js/config/roles.js")).ROLES.hr.permissions.includes("dashboard:finance") && j(stat("tds")) === j(["Tax deducted (TDS)", "—", ""]));
// Round 9F (behaviour; was: payroll-run / payslip-view / payslips js and HTML and payroll.js byte for byte 9D's HEAD too): 9F
// labels those; what still stays untouched is tax-deductions (its own labels) and the pay arithmetic's store
check("C9", "Round 9F: tax-deductions.html / .js, payslip-view.js and payroll-store.js are still byte for byte 52f5703's (9F labels only the other payroll pages)",
  // Round 10R (layout; was the live tax-deductions.js too): 10R adds the slab note to tax-deductions.js (taxnote.mjs X1 / X5), so
  // that file is read from its frozen copy (js-pre10R = HEAD 080b36b); payslip-view.js, payroll-store.js and the page stay live
  // Round 11N (layout; was the live payroll-store.js: read from the frozen result js-pre11N = HEAD fcdc960; the live one has 11N's checkSalary since (roadnotes.mjs P4 / X4); payslip-view.js and the page stay live)
  // Round 11T (layout; layout; was the live payslip-view.js: read from the frozen result js-pre11T = HEAD 75fa644; 11T adds the Approved status line, payruns.mjs I2, the live tree has 11T's stored payroll runs since (payruns.mjs X1 / X2))
  ["pages/payslip-view.js"].every((p) => SRC("js-pre11T", p) === SRC("js-pre9D", p)) && SRC("js-pre11N", "data/payroll-store.js") === SRC("js-pre9D", "data/payroll-store.js")
  && SRC("js-pre10R", "pages/tax-deductions.js") === SRC("js-pre9D", "pages/tax-deductions.js")
  && ["finance/tax-deductions.html"].every((p) => SRC("html-pre14A", p) /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */ === SRC("html-pre9D", p)));

// =====================================================================
section("D. Change set and hygiene");
const walk = (root, rel = "") => fs.readdirSync(`${root}/${rel}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${rel}${e.name}/`) : [`${rel}${e.name}`]));
// Round 9F (layout): 9D's own change set, read from its frozen result (js-pre9F / html-pre9F = HEAD d954a97); ./js and the
// pages now hold 9F's
const changedJs = walk(`${HERE}js-pre9F`).filter((f) => SRC("js-pre9F", f) !== SRC("js-pre9D", f));
const changedHtml = walk(`${HERE}html-pre9F`).filter((f) => f.endsWith(".html") && SRC("html-pre9F", f) !== SRC("html-pre9D", f));
check("D1", "js changed from HEAD: only pages/finance-dashboard.js; nothing added or removed", j(changedJs) === j(["pages/finance-dashboard.js"]) && j(walk(`${HERE}js-pre9F`).sort()) === j(walk(`${HERE}js-pre9D`).sort()), j(changedJs));
check("D2", "pages changed from HEAD: only dashboard/finance.html", j(changedHtml) === j(["dashboard/finance.html"]), j(changedHtml));
check("D3", "both are CRLF only, with no final newline", [FIN_JS, HTML.fin].every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
check("D4", "the script never uses innerHTML / outerHTML / insertAdjacentHTML; no name went through an HTML string", !/innerHTML|outerHTML|insertAdjacentHTML/.test(FIN_JS) && !htmlWrites.some((h) => /Kapoor|Gupta|Mehta|Shah|Nair|Rao/.test(h)));
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
