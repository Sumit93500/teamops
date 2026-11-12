// usage: node backlog.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 6G: the cleanup backlog, in jsdom. ./js-pre6G, ./html-pre6G and ./css-pre6G are the code, pages and styles
// before this round (6F's result). Fixed clock: Wed 30 Sep 2026 11:00 local.
//   A  admin dashboard: the Pending approvals card is a labelled sample (role change, PO, backup restore)
//   B  approvals inbox: every static sample row says so (pending, Approved tab, Recently decided); Who approves what;
//      PO-2291 at the store's prices; the grid stacks early (item 4)
//   C  approval workflows: the four unbuilt chains "Not built", the stat agrees, the PO limits card is a sample
//   D  delegation: a page-level "not built yet" note;  E  vendors.html's PO-2291 amount
//   F  expenses.html's Spend by category uses value-bars (item 5);  G  expenses-store: only real categories (item 6)
//   H  Report a problem stays deferred (item 7);  L  source layout (the role editor untouched: item 3 is its own round)
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const ADMIN = "dashboard/admin.html", INBOX = "requests/approvals-inbox.html", WF = "access/approval-workflows.html", DELEG = "access/delegation.html";
const EXP = "finance/expenses.html", VENDORS = "inventory/vendors.html", MINE = "inventory/my-assets.html";
const SAMPLE = "Sample, not built yet";

const RealDate = Date;
const NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
URL.createObjectURL = () => "blob:test";
URL.revokeObjectURL = () => {};

const WHO = {
  aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"], kabir: ["fin", "Kabir Shah", "EMP-1008"],
  sneha: ["emp", "Sneha Rao", "EMP-1029"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"],
};

let loads = 0, w = null, d = null, jsErrors = [], navigations = [];
// Opens a page as someone, running app.js and the page's own scripts (whatever the HTML loads from js/pages/).
async function open(page, who) {
  const vc = new VirtualConsole();
  jsErrors = []; navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else jsErrors.push(e.message); });
  const html = fs.readFileSync(`${DIR}/${page}`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  for (const [, script] of html.matchAll(/assets\/js\/pages\/([a-z-]+)\.js/g)) {
    try { await import(`./js/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
  }
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const $ = (id) => d.getElementById(id);
const cardTitled = (title) => [...d.querySelectorAll(".card")].find((c) => txt(c.querySelector(".card__title")) === title);
const hintOf = (card) => card?.querySelector(".form-hint");
const visible = (node) => Boolean(node) && !node.closest("[hidden]");

// The store reads localStorage when called; give it a fresh one for the price lookups below (pages bring their own).
globalThis.localStorage = new JSDOM("", { url: "http://localhost/" }).window.localStorage;
const I = await import("./js/data/inventory-store.js");
const E = await import("./js/data/expenses-store.js");
const PRICE = (sku) => I.getItem(sku).unitPrice;
const inr = (n) => `₹${n.toLocaleString("en-IN")}`;
const PO_2291 = 10 * PRICE("IT-1021") + 20 * PRICE("IT-1044");   // 10 Dell Latitude 5440 + 20 MX Keys, at the store's prices

// =====================================================================
section("A. Admin dashboard: Pending approvals is a labelled sample");
await open(ADMIN, "aarav");
const pending = cardTitled("Pending approvals");
check("A1", "no JS errors, no redirect", jsErrors.length === 0 && navigations.length === 0, jsErrors.join(" | "));
// Round 9B (behaviour; was: meta "Sample, not built yet" and a visible hint naming the three unbuilt kinds): 9B wires
// the card to ui/waiting.js (what waits for this person's decision), so it's real and carries neither
check("A2", "Round 9B: the card is real now: meta 'N of M shown' (what waits for Aarav), no sample label, no hint",
  /^\d+ of \d+ shown$/.test(txt(pending?.querySelector(".card__meta"))) && !hintOf(pending), txt(pending?.querySelector(".card__meta")));
const pRows = [...(pending?.querySelectorAll(".list__item") ?? [])];
// Round 9B (behaviour; was: the three sample rows unchanged, every button a placeholder): role changes, purchase orders
// and backup restores still don't exist, so their sample rows went with the card; each real row links to the inbox
check("A3", "Round 9B: the three sample rows are gone (role change, PO-2291, backup restore), no placeholder buttons; real rows each link to the inbox",
  pRows.length > 0 && !pRows.some((r) => /Role change|PO-2291|Backup restore/.test(txt(r))) && !pending.querySelector("button")
  && pRows.every((r) => r.querySelector("a")?.getAttribute("href") === "../requests/approvals-inbox.html"), j(pRows.map((r) => txt(r.querySelector(".list__title")))));
check("A4", "only this card changed on the page (its meta and the hint)", (() => {
  const now = src("html-pre6H", ADMIN).replace(/\r\n/g, "\n"), pre = src("html-pre6G", ADMIN).replace(/\r\n/g, "\n");
  return now === pre.replace('<span class="card__meta">3 open</span>\n            </div>\n            <div class="list">',
    `<span class="card__meta">${SAMPLE}</span>\n            </div>\n            <div class="card__body"><p class="form-hint">Role changes, purchase orders and backup restores can't be requested yet. These three show how they would look here; their buttons don't save anything.</p></div>\n            <div class="list">`);
})());

// =====================================================================
section("B. Approvals inbox");
await open(INBOX, "aarav");
const inboxRows = () => [...d.querySelectorAll("#inbox-table tbody tr")];
const statics = () => inboxRows().filter((tr) => tr.hasAttribute("data-static"));
const subOf = (tr) => txt(tr.querySelector("td .table__user-sub"));
check("B1", "no JS errors", jsErrors.length === 0, jsErrors.join(" | "));
// Round 9Q (behaviour; was "Role change: Sneha Rao"): the sample names no real person (generic.mjs A1)
check("B2", "each of the three static pending rows says 'Sample, not built yet' under its name; no real row does",
  j(statics().map((tr) => [txt(tr.querySelector(".table__user-name")), subOf(tr)])) === j([["Role change: an employee", SAMPLE], ["Purchase order PO-2291", SAMPLE], ["Backup restore request", SAMPLE]])
  && inboxRows().filter((tr) => !tr.hasAttribute("data-static")).length > 0 && inboxRows().filter((tr) => !tr.hasAttribute("data-static")).every((tr) => !tr.querySelector(".table__user-sub")),
  j(statics().map((tr) => [txt(tr.querySelector(".table__user-name")), subOf(tr)])));
const poRow = statics().find((tr) => /PO-2291/.test(txt(tr)));
check("B3", `PO-2291's amount is 10 x ₹78,500 + 20 x ₹9,500 at the store's prices (${inr(PO_2291)}), not ₹1,40,000`, PO_2291 === 975000 && txt(poRow.children[3]) === `${inr(PO_2291)}, TechNova`, txt(poRow?.children[3]));
check("B4", "the sample rows' buttons are still placeholders", statics().every((tr) => [...tr.querySelectorAll("button")].every((b) => b.dataset.notImplemented)));
const pill = (label) => [...d.querySelectorAll(".tabs__tab")].find((p) => txt(p).startsWith(label));
pill("Approved").click();
// Round 9Q (behaviour; was /Role change: Divya Menon/): the decided sample names no real person (generic.mjs C1).
// Also guarded: a missing row now fails B5 instead of throwing (which stopped the suite before C1-L5)
const roleClone = inboxRows().find((tr) => /Role change: an employee/.test(txt(tr)));
check("B5", "Approved tab: the static role change (decidedClone) keeps its sample line", !!roleClone && subOf(roleClone) === SAMPLE, txt(roleClone));
pill("Rejected").click();
const backupClone = inboxRows().find((tr) => /Backup restore request/.test(txt(tr)));
check("B6", "Rejected tab: the static backup restore keeps it too", subOf(backupClone) === SAMPLE, txt(backupClone));
const decided = [...d.querySelectorAll("#decided-table tbody tr[data-static]")];
check("B7", "Recently decided: both static rows say so", decided.length === 2 && decided.every((tr) => subOf(tr) === SAMPLE));
const who = [...d.querySelectorAll("#who-approves .kv__row")].map((r) => [txt(r.querySelector("dt")), txt(r.querySelector("dd"))]);
// Round 12Z (behavior; was salary revisions "Not built yet", four unbuilt): built in R9c (salinbox.mjs H1)
check("B8", "Who approves what: the expense chain (set by the script) and asset requests as before; salary revisions Finance, then an Admin; the three unbuilt kinds 'Not built yet'", j(who) === j([
  ["Expense claims", "Manager, then Finance"], ["", "Then an Admin too, above ₹50,000"], ["Leave requests", "Manager, then HR or an Admin"], ["Attendance corrections", "Manager, then HR or an Admin"] /* Round 8C */, ["Purchase orders", "Not built yet"], ["Role changes", "Not built yet"],
  ["Salary revisions", "Finance, then an Admin"], ["Backup restore", "Not built yet"], ["Asset requests", "Manager, then an Admin"]]), j(who));
check("B9", "item 4: the inbox's grid carries grid-main-aside--wide (stacks below 1440px; browser-checked)", d.querySelector("#inbox-table").closest(".grid").className === "grid grid-main-aside grid-main-aside--wide");
await open(INBOX, "sneha");
check("B10", "someone without approvals:view still sees no sample rows", d.querySelectorAll("#inbox-table tbody tr[data-static], #decided-table tbody tr[data-static]").length === 0 && jsErrors.length === 0);

// =====================================================================
section("C. Approval workflows");
await open(WF, "aarav");
const wfRows = [...d.querySelectorAll(".table tbody tr")].map((tr) => [txt(tr.querySelector(".table__user-name")), txt(tr.querySelector("td:nth-child(4) .badge")), tr.querySelector("td:nth-child(4) .badge").className]);
const ACTIVE = "badge badge--success badge--dot", GREY = "badge badge--dot";
// Round 12Z (behavior; was Salary revision and Payroll run "Not built"): both built (R9c, 11T; salinbox.mjs W1)
check("C1", "the unbuilt chains say 'Not built' (grey); the six real ones Active (Round 7C: + Payroll run after Salary revision; 12Z: both Active)", j(wfRows) === j([
  ["Leave", "Active", ACTIVE], ["Attendance regularization", "Active", ACTIVE], ["Expense claim", "Active", ACTIVE], ["Purchase order", "Not built", GREY],
  ["Role change", "Not built", GREY], ["Salary revision", "Active", ACTIVE], ["Payroll run", "Active", ACTIVE], ["Asset request", "Active", ACTIVE], ["Backup restore", "Not built", GREY]]), j(wfRows));
const wfStat = [...d.querySelectorAll(".stat")].find((s) => txt(s.querySelector(".stat__label")) === "Workflows");
check("C2", "the Workflows stat agrees with the table (8; 4 active, 4 not built yet)", txt(wfStat.querySelector(".stat__value")) === String(wfRows.length)
  && txt(wfStat.querySelector(".stat__delta")) === `${wfRows.filter((r) => r[1] === "Active").length} active, ${wfRows.filter((r) => r[1] === "Not built").length} not built yet`);
const limits = cardTitled("Purchase order limits");
check("C3", "Purchase order limits: meta 'Sample, not built yet', a visible hint, the two tiers kept, no 'Add tier' button", txt(limits?.querySelector(".card__meta")) === SAMPLE && visible(hintOf(limits))
  && txt(hintOf(limits)) === "Purchase orders aren't part of OfficeOS, so these limits don't apply to anything. They show how amount tiers could look."
  && limits.querySelectorAll(".tier").length === 2 && !limits.querySelector("button"));
check("C4", "the workflows table uses table--fit (browser-checked: it was already wider than its card at 1280, and 'Not built' widened it)", d.querySelector(".table").className === "table table--fit");

// =====================================================================
section("D. Delegation");
const delegHtml = fs.readFileSync(`${DIR}/${DELEG}`, "utf8"), sdDeleg = new JSDOM(delegHtml).window.document;
const note = sdDeleg.querySelector("main .stack > .alert");
check("D1", "a page-level note first in the page body: sample, not built, nothing saved", note?.className === "alert alert--info" && note === sdDeleg.querySelector("main .stack").firstElementChild
  && txt(note) === "Sample, not built yet: delegation isn't part of OfficeOS yet. This page shows how it could look; nothing here is saved, and the delegations listed are examples.");
// Round 9R (layout; was the live page): 6G's own claim, read from its frozen result (html-pre9R = HEAD f16d1ac, where
// delegation is still 6G's page plus the alert); the live page's names are role-based since (roster.mjs W1)
check("D2", "nothing else on the page changed", src("html-pre9R", DELEG).replace(/\r\n/g, "\n").replace(/\n\n    <div class="alert alert--info">Sample, not built yet: delegation[^\n]*\n/, "\n") === src("html-pre6G", DELEG).replace(/\r\n/g, "\n"));

// =====================================================================
section("E. vendors.html's sample PO-2291");
const vHtml = fs.readFileSync(`${DIR}/${VENDORS}`, "utf8");
check("E1", `the sample's PO-2291 is ${inr(PO_2291)} (10 laptops and 20 keyboards at the store's prices), the only change on the page`,
  src("html-pre14A", VENDORS) /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */ === src("html-pre6G", VENDORS).replace('<span class="po__amount">₹1,40,000</span>', `<span class="po__amount">${inr(PO_2291)}</span>`) && vHtml.includes("10 laptops and 20 keyboards"));
check("E2", "no ₹1,40,000 left on any page", fs.readdirSync(DIR, { recursive: true }).filter((p) => p.endsWith(".html")).every((p) => !fs.readFileSync(`${DIR}/${p}`, "utf8").includes("1,40,000")));

// =====================================================================
section("F. expenses.html: Spend by category (item 5)");
await open(EXP, "kabir");
check("F1", "the card body carries value-bars (6C's 76px value column; browser-checked: '₹2,150' was 44px in 36px), and the bars are drawn", $("expense-spend").className === "card__body value-bars"
  && $("expense-spend").querySelectorAll(".bar-row").length === 5 && jsErrors.length === 0);
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3. liveCss: F2's and F3's rules, which stay live
const liveCss = (p) => fs.readFileSync(`${DIR}/../assets/css/${p}`, "utf8").replace(/\r\n/g, "\n");
const css = (p) => src("css-pre13U", p).replace(/\r\n/g, "\n"), cssPre = (p) => src("css-pre6G", p).replace(/\r\n/g, "\n");
check("F2", "the value-bars rule itself is unchanged; only its heading names both pages", css("pages/inventory.css") === cssPre("pages/inventory.css").replace(
  "/* ---------- Stock value by category (items.html) ----------", "/* ---------- Value by category (items.html's stock value, expenses.html's spend) ----------")
  && liveCss("pages/inventory.css").includes(".value-bars .bar-row { grid-template-columns: 96px minmax(0, 1fr) 76px; }"));
check("F3", "item 4's rule: .grid-main-aside--wide stacks below 1440px, added before the 1100px block; nothing else in responsive.css changed", (() => {
  const now = css("layout/responsive.css"), pre = cssPre("layout/responsive.css");
  const added = now.replace(pre.slice(pre.indexOf("/* ---------- Small laptop")), "").slice(pre.indexOf("/* ---------- Small laptop"));
  return now.endsWith(pre.slice(pre.indexOf("/* ---------- Small laptop"))) && now.startsWith(pre.slice(0, pre.indexOf("/* ---------- Small laptop")))
    && /@media \(max-width: 1439px\) \{\n  \.grid-main-aside--wide \{ grid-template-columns: minmax\(0, 1fr\); \}\n\}/.test(added)
    && /@media \(max-width: 1439px\) \{\n  \.grid-main-aside--wide \{ grid-template-columns: minmax\(0, 1fr\); \}\n\}/.test(liveCss("layout/responsive.css"));
})());

// =====================================================================
section("G. expenses-store: only real categories (item 6)");
globalThis.localStorage = new JSDOM("", { url: "http://localhost/" }).window.localStorage;
E.resetExpenseData?.();
const before = E.allExpenses().length;
const tryCat = (category) => E.submitExpense("EMP-1105", { category, amount: 500, date: "2026-09-28", reason: "Taxi" });
const inherited = ["constructor", "toString", "__proto__", "hasOwnProperty", "valueOf", "isPrototypeOf"].map((c) => [c, tryCat(c)]);
check("G1", "inherited names are refused at the category field, like any unknown one", inherited.every(([, r]) => r.ok === false && r.error === "Choose a category." && r.field === "category"),
  j(inherited.map(([c, r]) => [c, r.ok, r.error])));
check("G2", "nothing was stored for them", E.allExpenses().length === before);
const real = tryCat("travel");
check("G3", "a real category is still accepted", real.ok === true && real.record.category === "travel" && E.allExpenses().length === before + 1, j(real));
check("G4", "an unknown plain word is still refused", tryCat("snacks").error === "Choose a category.");
const exLf = (dir) => src(dir, "data/expenses-store.js").replace(/\r\n/g, "\n");
// Since Round 6I (which guards expenseTotals() too), 6G's change is read frozen (js-pre6I).
check("G5", "the change is that one line (Object.hasOwn, as inventory-store's listed())", exLf("js-pre6I") === exLf("js-pre6G").replace('  if (!CATEGORIES[category]) return fail("Choose a category.", "category");',
  '  if (!Object.hasOwn(CATEGORIES, category)) return fail("Choose a category.", "category");   // not inherited names like "constructor"'));

// =====================================================================
section("H. Report a problem (item 7): deferred in 6G, built in 6I");
await open(MINE, "arjun");
const report = [...d.querySelectorAll(".page-header__actions button")].find((b) => txt(b) === "Report a problem");
const rowReports = [...d.querySelectorAll("#my-asset-rows .table__actions button")];
check("H1", "'Report a problem' and every row's 'Report issue' are real on assets:report (no placeholders)", report && !report.dataset.notImplemented && report.dataset.permission === "assets:report"
  && rowReports.length === 3 && rowReports.every((b) => !b.dataset.notImplemented && b.dataset.permission === "assets:report"));
check("H2", "the store functions are inventory-store's own (no ticketing store): reportProblem, closeReport, openReportOf, assetsWithOpenReports",
  j(Object.keys(I).filter((k) => /report/i.test(k)).sort()) === j(["assetsWithOpenReports", "closeReport", "openReportOf", "reportProblem"]) && !Object.keys(await import("./js/data/asset-requests-store.js")).some((k) => /report/i.test(k)));

// =====================================================================
section("L. Source layout");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1).replaceAll("\\", "/")]));
const root = (dd) => new URL(`./${dd}`, import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
// Since Round 6H, 6G's result is read frozen (js-pre6H, html-pre6H, css-pre6H): 6H has moved the live tree on.
const changed = (a, b) => walk(a).sort().filter((p) => !fs.existsSync(`${b}/${p}`) || fs.readFileSync(`${a}/${p}`, "utf8") !== fs.readFileSync(`${b}/${p}`, "utf8"));
check("L1", "js: only data/expenses-store.js changed", j(changed(root("js-pre6H"), root("js-pre6G"))) === j(["data/expenses-store.js"]) && walk(root("js-pre6H")).length === walk(root("js-pre6G")).length);
check("L2", "pages: the six (admin, inbox, workflows, delegation, expenses, vendors); the role editor untouched (item 3 is its own round)",
  j(changed(root("html-pre6H"), root("html-pre6G"))) === j([WF, DELEG, ADMIN, EXP, VENDORS, INBOX]), j(changed(root("html-pre6H"), root("html-pre6G"))));
check("L3", "css: layout/responsive.css and pages/inventory.css", j(changed(root("css-pre6H"), root("css-pre6G"))) === j(["layout/responsive.css", "pages/inventory.css"]));
const importsRequests = walk(root("js")).filter((p) => p.endsWith(".js") && /from "[^"]*\/requests\.js"|from "\.\/requests\.js"/.test(src("js", p)));
check("L4", "data/requests.js is still imported by nothing (dead) and unchanged, so its old PO-2291 text is never shown", j(importsRequests) === j([]) && src("js-pre14A", "data/requests.js") === src("js-pre6G", "data/requests.js"));   // Round 14A (layout; was the live js): 9c7423e's, frozen; the live js: jsguard.mjs
const keep = (h) => h.replace(/\r\n/g, "\n").split("<main")[0];
check("L5", "everything before <main> is unchanged on the six pages", [WF, DELEG, ADMIN, EXP, VENDORS, INBOX].every((p) => keep(src("html-pre7C", p)) === keep(src("html-pre6G", p))));
const files = [...[WF, DELEG, ADMIN, EXP, VENDORS, INBOX].map((p) => fs.readFileSync(`${DIR}/${p}`, "utf8")), css("layout/responsive.css") && fs.readFileSync(`${DIR}/../assets/css/layout/responsive.css`, "utf8"),
  fs.readFileSync(`${DIR}/../assets/css/pages/inventory.css`, "utf8"), src("js", "data/expenses-store.js")];
check("L6", "the nine files: CRLF only, no final newline", files.every((s) => !/[^\r]\n/.test(s) && !/\r(?!\n)/.test(s) && !s.endsWith("\n")));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
