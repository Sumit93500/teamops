// usage: node rules.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 6J: approval-workflows.html's "Rules for every workflow" card, in jsdom. ./js-pre6J, ./html-pre6J and
// ./css-pre6J are the code, pages and styles before this round (6I's result). Fixed clock: Wed 30 Sep 2026 11:00 local.
//   A  the two real rules: one card, "Always on", both locked on, a hint saying so
//   B  the two unbuilt ones (remind, escalate): their own card, a labelled sample, both locked off
//   C  the page as a whole: no switch on it can be flipped; the cards' order; nothing else on the page moved
//   D  what the "Always on" card claims, checked against the four built workflows' stores
//   E  what the sample card claims: nothing reminds or escalates (no notifications store; the bell is a placeholder)
//   L  source layout
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const WF = "access/approval-workflows.html";
const SAMPLE = "Sample, not built yet";

const RealDate = Date;
const NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const WHO = {
  aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"], kabir: ["fin", "Kabir Shah", "EMP-1008"],
  sneha: ["emp", "Sneha Rao", "EMP-1029"],
};

let loads = 0, w = null, d = null, jsErrors = [], navigations = [];
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
const cardTitled = (title) => [...d.querySelectorAll(".card")].find((c) => txt(c.querySelector(".card__title")) === title);
const visible = (node) => Boolean(node) && !node.closest("[hidden]");
// Each switch in a card as [label, checked, disabled]; a missing card gives [] (a FAIL with a reason, not a crash).
const switches = (card) => [...(card?.querySelectorAll(".switch") ?? [])].map((s) => [txt(s), s.querySelector("input")?.checked, s.querySelector("input")?.disabled]);

const OWN = "Nobody approves their own request", REASON = "A reason is required when rejecting";
const REMIND = "Remind the approver after 1 day", ESCALATE = "Escalate after 2 days with no decision";

// =====================================================================
section("A. The real rules");
await open(WF, "aarav");
check("A0", "the page opens for an Admin with no script error and no redirect", jsErrors.length === 0 && navigations.length === 0, j([jsErrors, navigations]));
const rules = cardTitled("Rules for every workflow");
check("A1", "'Rules for every workflow' keeps its title, now with the meta 'Always on'", txt(rules?.querySelector(".card__meta")) === "Always on");
check("A2", "it holds exactly the two enforced rules, in order, each checked and locked (disabled)",
  j(switches(rules)) === j([[OWN, true, true], [REASON, true, true]]), j(switches(rules)));
const rulesHint = rules?.querySelector(".form-hint");
// Round 12Z (behavior; was "All four active workflows enforce both, ... An Admin's own requests are approved automatically."): six active (salinbox.mjs W2)
check("A3", "a visible hint after the switches: every active workflow enforces both (a payroll run is never rejected), neither can be turned off, an Admin's own requests and salary changes are approved automatically",
  visible(rulesHint) && txt(rulesHint) === "Every active workflow enforces both (a payroll run is never rejected: it's approved, or prepared again), and neither can be turned off. An Admin's own requests and salary changes are approved automatically."
  && rulesHint.previousElementSibling?.className === "toggle-list" && rulesHint.classList.contains("mt-4"));
check("A4", "neither unbuilt rule is in this card", !/Remind|Escalate/.test(txt(rules) ?? "Remind"));

// =====================================================================
section("B. The unbuilt rules: a labelled sample");
const sample = cardTitled("Reminders and escalation");
check("B1", "'Reminders and escalation' card, meta 'Sample, not built yet' (the Purchase order limits card's wording)",
  txt(sample?.querySelector(".card__meta")) === SAMPLE && txt(cardTitled("Purchase order limits")?.querySelector(".card__meta")) === SAMPLE);
const sampleHint = sample?.querySelector(".form-hint");
check("B2", "a visible hint first in its body: nothing sends reminders or passes a request on; points at 'Waiting over 2 days'",
  visible(sampleHint) && sampleHint === sample.querySelector(".card__body").firstElementChild
  && txt(sampleHint) === "Nothing in OfficeOS sends reminders or passes a request on when it waits, so these don't apply to anything. \"Waiting over 2 days\" above counts the requests that have waited that long.");
check("B3", "the two unbuilt rules, wording unchanged, each off and locked: neither reads as switched on",
  j(switches(sample)) === j([[REMIND, false, true], [ESCALATE, false, true]]), j(switches(sample)));
const statLabels = [...d.querySelectorAll(".stat__label")].map(txt);
check("B4", "the stat the hint names exists, word for word, in the strip above", statLabels.includes("Waiting over 2 days"), j(statLabels));
check("B5", "no button, link or other control in the sample card", sample?.querySelectorAll("button, select, textarea, a").length === 0);

// =====================================================================
section("C. The page as a whole");
const allSwitches = [...d.querySelectorAll("main .switch input")];
check("C1", "every switch on the page is locked: nothing can be flipped to look like a setting was changed", allSwitches.length === 4 && allSwitches.every((i) => i.disabled), allSwitches.length);
check("C2", "each rule appears exactly once on the page", [OWN, REASON, REMIND, ESCALATE].every((r) => [...d.querySelectorAll(".switch")].filter((s) => txt(s) === r).length === 1));
const aside = d.querySelector("main aside.stack");
const asideOrder = [...(aside?.children ?? [])].map((el) => txt(el.querySelector(".card__title")) ?? el.className);
check("C3", "the aside reads: Purchase order limits, Rules for every workflow, Reminders and escalation, then the payroll alert",
  j(asideOrder) === j(["Purchase order limits", "Rules for every workflow", "Reminders and escalation", "alert alert--info"]), j(asideOrder));
// Everything but the rules card(s) is byte-for-byte as before: cut that region out of both versions and compare.
const before = src("html-pre6J", WF), after = src("html-pre7C", WF);   // html-pre7C: 6J's result before Round 7C changed this page
const cut = (s) => s.replace(/        <section class="card">\r\n          <div class="card__header">(<h3 class="card__title">Rules|\r\n            <h3 class="card__title">Rules)[\s\S]*?(?=\r\n\r\n        <div class="alert alert--info">The person who prepared)/, "<RULES>");
check("C4", "outside the rules card(s) the page is unchanged: head, nav, stat strip, table, Purchase order limits, payroll alert, example",
  cut(before) !== before && cut(after) !== after && cut(before) === cut(after));
for (const who of ["priya", "kabir"]) {
  await open(WF, who);
  check(`C5${who[0]}`, `${who} (no workflows:view) is still sent away (6I's guard); no script error`, navigations.length === 1 && jsErrors.length === 0, j([navigations.length, jsErrors]));
}

// =====================================================================
section("D. 'Always on' is true in the four built workflows (the stores, fresh data)");
globalThis.localStorage = new JSDOM("", { url: "http://localhost/" }).window.localStorage;
const L = await import("./js/data/leave-store.js");
const A = await import("./js/data/attendance-store.js");
const E = await import("./js/data/expenses-store.js");
const R = await import("./js/data/asset-requests-store.js");
const refusal = (r) => [r.ok, r.error ?? null, r.field ?? null];

// HR's and the Admin's seeded days have nothing to correct, so each checks in late today (11:00) and asks for 09:00.
const tryReg = (userId) => { A.checkIn(userId, "office"); return A.requestRegularization(userId, { date: "2026-09-30", issue: "late-arrival", time: "09:00", reason: "x" }); };
const lv = L.applyLeave("EMP-1003", { type: "casual", from: "2026-11-02", to: "2026-11-02", reason: "x" });
const rg = tryReg("EMP-1003");
const ex = E.submitExpense("EMP-1008", { category: "travel", amount: 1200, date: "2026-09-29", reason: "x", receipt: "r" });
const ar = R.submitAssetRequest("EMP-1029", { assetType: "monitor", reason: "x" });
check("D0", "four pending requests from people who can decide others' (HR leave and correction, Finance claim, a manager's asset request)",
  [lv, rg, ex, ar].every((r) => r.ok && r.record.status === "pending"), j([lv, rg, ex, ar].map((r) => r.error ?? r.record.status)));
check("D1", "own request: leave refused", j(refusal(L.decideLeave(lv.record?.id, "EMP-1003", "hr", "approve"))) === j([false, "You can't decide your own leave request.", null]));
check("D2", "own request: attendance correction refused", j(refusal(A.decideRegularization(rg.record?.id, "EMP-1003", "hr", "approve"))) === j([false, "You can't decide your own correction request.", null]));
check("D3", "own request: expense claim refused", j(refusal(E.decideExpense(ex.record?.id, "EMP-1008", "fin", "approve"))) === j([false, "You can't decide your own expense claim.", null]));
check("D4", "own request: asset request refused", j(refusal(R.decideAssetRequest(ar.record?.id, "EMP-1029", "emp", "approve"))) === j([false, "You can't decide your own asset request.", null]));
const roleOf = { "EMP-1001": "admin", "EMP-1003": "hr", "EMP-1008": "fin" };
const exDecider = ex.ok ? E.waitingOn(E.getExpense(ex.record.id))[0] : null;
const arDecider = ar.ok ? R.waitingOn(R.getAssetRequest(ar.record.id))[0] : null;
check("D5", "reject with no reason (spaces only): refused in all four, at the note field, each still pending", j([
  refusal(L.decideLeave(lv.record?.id, "EMP-1001", "admin", "reject", "  ")),
  refusal(A.decideRegularization(rg.record?.id, "EMP-1001", "admin", "reject", "  ")),
  refusal(E.decideExpense(ex.record?.id, exDecider, roleOf[exDecider], "reject", "  ")),
  refusal(R.decideAssetRequest(ar.record?.id, arDecider, roleOf[arDecider], "reject", "  ")),
]) === j([[false, "Add a note saying why the request is rejected.", "note"], [false, "Add a note saying why the request is rejected.", "note"],
  [false, "Add a note saying why the claim is rejected.", "note"], [false, "Add a note saying why the request is rejected.", "note"]])
  && [L.getRequest(lv.record?.id), A.getRegularization(rg.record?.id), E.getExpense(ex.record?.id), R.getAssetRequest(ar.record?.id)].every((r) => r?.status === "pending"), j([exDecider, arDecider]));
const autoOf = (r) => r.ok && r.record.history.some((h) => h.decision === "auto-approved") && r.record.status !== "pending";
const adminOwn = [
  L.applyLeave("EMP-1001", { type: "casual", from: "2026-11-09", to: "2026-11-09", reason: "x" }),
  tryReg("EMP-1001"),
  E.submitExpense("EMP-1001", { category: "travel", amount: 1200, date: "2026-09-29", reason: "x", receipt: "r" }),
  R.submitAssetRequest("EMP-1001", { assetType: "monitor", reason: "x" }),
];
check("D6", "the hint's second sentence: an Admin's own request is approved automatically in all four", adminOwn.every(autoOf), j(adminOwn.map((r) => r.error ?? r.record.status)));

// =====================================================================
section("E. 'Not built' is true: nothing reminds or escalates");
const root = (dd) => new URL(`./${dd}`, import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const walk = (dir, rel = "") => fs.readdirSync(`${dir}/${rel}`, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(dir, `${rel}${e.name}/`) : [`${rel}${e.name}`]);
const code = (p) => fs.readFileSync(`${root("js")}/${p}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const hits = walk(root("js")).filter((p) => /remind|escalat/i.test(code(p)));
check("E1", "no code in js/ (comments aside) mentions reminding or escalating", j(hits) === j([]), j(hits));
check("E2", "there is no notifications store: no data file mentions notifications", walk(root("js")).filter((p) => p.startsWith("data/") && /notif/i.test(fs.readFileSync(`${root("js")}/${p}`, "utf8"))).length === 0);
await open(WF, "aarav");
// Round 13Z (behaviour, A7): the bell links to the Approvals Inbox; honest.mjs B has the rest. Still no notifications store (E2).
const bell = d.querySelector(".topbar .topbar__icon-btn--dot");
// Round 14G (ruling 7; was a link to the Inbox): the bell opens the list of what waits, whose See all goes to the Inbox; still no notifications page
check("E3", "the topbar bell on this page opens the list of what waits (its See all is the Approvals Inbox), not a notifications page", bell?.tagName === "BUTTON" && bell.getAttribute("aria-haspopup") === "dialog" && !bell.hasAttribute("href") && !bell.hasAttribute("data-not-implemented"));
const notifPage = new JSDOM(fs.readFileSync(`${DIR}/account/notifications.html`, "utf8")).window.document;
check("E4", "account/notifications.html loads no page script (its list is static markup)", ![...notifPage.querySelectorAll("script[src]")].some((s) => /pages\//.test(s.getAttribute("src"))));

// =====================================================================
section("L. Source layout");
const changed = (a, b) => walk(a).sort().filter((p) => !fs.existsSync(`${b}/${p}`) || fs.readFileSync(`${a}/${p}`, "utf8") !== fs.readFileSync(`${b}/${p}`, "utf8"));
check("L1", "js: unchanged (no file added, removed or edited)", j(changed(root("js-pre7B"), root("js-pre6J"))) === j([]) && walk(root("js-pre7B")).length === walk(root("js-pre6J")).length);
check("L2", "pages: only access/approval-workflows.html", j(changed(root("html-pre7B"), root("html-pre6J"))) === j([WF]) && walk(root("html-pre7B")).length === walk(root("html-pre6J")).length, j(changed(root("html-pre7B"), root("html-pre6J"))));
// Round 9H (layout; was the live css, `${DIR}/../assets/css`): 6J's "css unchanged" read from the frozen css before 9H
// (css-pre9H = HEAD 55cee02), the last tree in which no round had touched the css since 6J; 9H adds one dot rule
const cssDir = root("css-pre9H");
check("L3", "css: unchanged", fs.existsSync(cssDir) && j(changed(cssDir, root("css-pre6J"))) === j([]) && walk(cssDir).length === walk(root("css-pre6J")).length);
check("L4", "the page: CRLF only, no final newline", !/[^\r]\n/.test(after) && !/\r(?!\n)/.test(after) && !after.endsWith("\n"));
check("L5", "no inline style in <main>; every class the new markup uses is defined in the CSS",
  !/style="/.test(after.slice(after.indexOf("<main"))) && ["card__meta", "form-hint", "mt-4", "toggle-list", "switch"].every((c) => walk(cssDir).some((p) => fs.readFileSync(`${cssDir}/${p}`, "utf8").includes(`.${c}`))));

console.log(`\n${passed} passed, ${failed} failed`);
