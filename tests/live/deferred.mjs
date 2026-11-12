// usage: node deferred.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 9M: the backlog deferred from 9K and 9L, in jsdom with the js in ./js. ./js-pre9M, ./html-pre9M and
// ./css-pre9M are the code, pages and styles before this round (office-os fb6165b).
//   A  backup.html's restore steps: no "IT Support", no audit log; the "View request" link leads to the matching sample
//   B  approval-workflows.html's "₹62,000 example" at the stage the real claim (EXP-3103) is at, and following it
//   C  user-form.html: no leave:apply override
//   D  holidays.html's subtitle names the selected year
//   Z  the change set, line endings, no page errors
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const RAW = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const SRC = (dir, p) => fs.readFileSync(`${HERE}${dir}/${p}`, "utf8");
const OLD = (p) => SRC("html-pre9M", p);

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 10, 7);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
URL.createObjectURL = () => "blob:test";
URL.revokeObjectURL = () => {};

const WHO = { aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"] };
let loads = 0, w = null, d = null, saved = {};
const jsErrors = [];
async function open(who, page, script, query = "") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) jsErrors.push(`${who} ${page}: ${e.message}`); });
  const dom = new JSDOM(RAW(page), { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  if (script) { try { await import(`./js/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); } }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const parse = (html) => new JSDOM(html).window.document;
// The lines of a file that aren't in its frozen copy and the reverse, as [removed, added] (by content, not position).
const lineDiff = (now, before) => { const a = before.split("\r\n"), b = now.split("\r\n"); return [a.filter((l) => !b.includes(l)), b.filter((l) => !a.includes(l))]; };
const code = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l)).join("\r\n");

const E = await import("./js/data/expenses-store.js");
const H = await import("./js/data/holidays.js");
const HOL_ACTOR = "EMP-1003";   // Round 10W (signature; was addHoliday(fields) / removeHoliday(id)): the holiday writes take the acting person's id first and check their record (holidays:manage); every call here passes HR's (Priya). The guard itself: holiguard.mjs
const { ROLES } = await import("./js/config/roles.js");
const { ALL_PERMISSIONS } = await import("./js/config/permissions.js");

// =====================================================================
section("A. backup.html: the restore steps");
const BK = "system/backup.html";
setNow(2026, 10, 7); fresh();
await open("aarav", BK, null);
const restoreCard = [...d.querySelectorAll(".card")].find((c) => txt(c.querySelector(".card__title")) === "How a restore works");
const steps = [...restoreCard.querySelectorAll(".stepper__text")].map((s) => [txt(s.querySelector("strong")), txt(s.querySelector("small"))]);
check("A1", "the four steps: An Admin asks / Another Admin approves / Data is restored / Kept with the request",
  j(steps) === j([["An Admin asks", "Chooses the backup and gives a reason"], ["Another Admin approves", "Waiting in the Approvals inbox"],
    ["Data is restored", "The system is read-only meanwhile"], ["Kept with the request", "Who asked, who approved, which backup and when"]]), j(steps));
const holders = Object.values(ROLES).filter((r) => r.permissions.includes("backup:restore")).map((r) => r.label);
check("A2", "…which is true to the app: only the Admin role holds backup:restore (and backup:manage, the page's own)",
  j(holders) === j(["Admin"]) && j(Object.values(ROLES).filter((r) => r.permissions.includes("backup:manage")).map((r) => r.label)) === j(["Admin"]), j(holders));
const bkMain = txt(d.querySelector("main"));
check("A3", "no 'IT Support' and no audit log anywhere in the page's main", !/IT Support/.test(bkMain) && !/audit log/i.test(bkMain));
const view = [...d.querySelectorAll("main a")].find((a) => txt(a) === "View request");
const viewTarget = view && new URL(view.getAttribute("href"), `http://localhost/office-os/pages/${BK}`).pathname.replace("/office-os/pages/", "");
const viewRow = view?.closest("tr");
check("A4", "the 'View request' link is kept, on the 14 Sep, 1.2 GB backup marked 'Restore requested', and goes to requests/approvals-inbox.html (a page that exists)",
  viewTarget === "requests/approvals-inbox.html" && fs.existsSync(`${DIR}/${viewTarget}`) && /^14 Sep, 02:00 Automatic 1\.2 GB Restore requested/.test(txt(viewRow)), j([viewTarget, txt(viewRow)]));
await open("aarav", viewTarget, "approvals-inbox");
const sampleRow = [...d.querySelectorAll("#approvals-table tbody tr, table tbody tr")].find((tr) => /Backup restore request/.test(txt(tr)) && !tr.hidden);
check("A5", "…where Aarav (the role that can open backup.html) sees the matching labelled sample on the tab it opens on: 'Backup restore request', 'Sample, not built yet', 'Backup of 14 Sep, 1.2 GB'",
  Boolean(sampleRow) && /Sample, not built yet/.test(txt(sampleRow)) && /Backup of 14 Sep, 1\.2 GB/.test(txt(sampleRow)), txt(sampleRow));
const bk = parse(RAW(BK));
check("A6", "9L's labels stay: the page alert first and the four cards' 'Sample, not built yet'",
  /^Sample, not built yet: backups aren't part of OfficeOS yet\./.test(txt(bk.querySelector(".stack > .alert")))
  && [...bk.querySelectorAll(".card__header .card__meta")].filter((m) => txt(m) === "Sample, not built yet").length === 4);
const bkD = lineDiff(SRC("html-pre14A", BK), OLD(BK));   // Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs
check("A7", "backup.html: exactly the three step lines changed (same line count; the link line untouched)",
  SRC("html-pre14A", BK).split("\r\n").length === OLD(BK).split("\r\n").length && bkD[0].length === 3 && bkD[1].length === 3 && bkD[0].every((l) => /stepper__text/.test(l)), j(bkD.map((x) => x.length)));

// =====================================================================
section("B. approval-workflows.html: the ₹62,000 example follows EXP-3103");
const WF = "access/approval-workflows.html";
const exampleSteps = (doc) => [...doc.querySelectorAll("#expense-example .stepper__step")].map((s) =>
  `${txt(s.querySelector("strong"))}:${["is-done", "is-current", "is-rejected"].filter((c) => s.classList.contains(c)).join("+") || "-"}:${s.querySelector(".stepper__dot svg") ? "tick" : txt(s.querySelector(".stepper__dot"))}`);
const SEED_STEPS = ["Employee sends:is-done:tick", "Manager:is-done:tick", "Finance:is-done:tick", "Admin:is-current:4"];
setNow(2026, 10, 7); fresh();
await open("aarav", WF, "approval-workflows");
const claim = E.getExpense("EXP-3103");
check("B1", "the real claim: EXP-3103, ₹62,000, pending at the Admin stage, with the manager (Sneha) and Finance (Kabir) approvals in its history",
  claim.amount === 62000 && claim.status === "pending" && claim.stage === "admin"
  && claim.history.some((h) => h.stage === "manager" && h.decision === "approved") && claim.history.some((h) => h.stage === "finance" && h.decision === "approved"), j([claim.status, claim.stage]));
check("B2", "as drawn for Aarav on 7 Oct: sent, Manager and Finance done (ticks), Admin current (was Manager current)", j(exampleSteps(d)) === j(SEED_STEPS), j(exampleSteps(d)));
check("B3", "…and the page's static HTML says the same before the script runs", j(exampleSteps(parse(RAW(WF)))) === j(SEED_STEPS), j(exampleSteps(parse(RAW(WF)))));
check("B4", "the card's title and badge are unchanged ('Example: an expense claim of ₹62,000', 'Needs 3 approvals': manager, Finance, Admin above ₹50,000)",
  txt(d.querySelector("#expense-example .card__title")) === "Example: an expense claim of ₹62,000" && txt(d.querySelector("#expense-example .badge")) === "Needs 3 approvals"
  && j(E.previewRoute("EMP-1042", 62000).map((s) => s.stage)) === j(["manager", "finance", "admin"]));
setNow(2026, 10, 7, 11, 0);
const ok = E.decideExpense("EXP-3103", "EMP-1001", "admin", "approve");
await open("aarav", WF, "approval-workflows");
check("B5", "once Aarav approves it, the card follows: every step done, none current", ok.ok && j(exampleSteps(d)) === j(["Employee sends:is-done:tick", "Manager:is-done:tick", "Finance:is-done:tick", "Admin:is-done:tick"]), j([ok.ok, exampleSteps(d)]));
setNow(2026, 10, 7); fresh();
await open("aarav", WF, "approval-workflows");
setNow(2026, 10, 7, 11, 0);
const no = E.decideExpense("EXP-3103", "EMP-1001", "admin", "reject", "Over the trip budget");
await open("aarav", WF, "approval-workflows");
check("B6", "if Aarav rejects it instead: Admin marked rejected (not done, not current), the earlier steps still done",
  no.ok && j(exampleSteps(d)) === j(["Employee sends:is-done:tick", "Manager:is-done:tick", "Finance:is-done:tick", "Admin:is-rejected:4"]), j([no.ok, exampleSteps(d)]));
// Same line count, so compare line by line: [line number, new line] for each that differs.
// Round 9N (layout; was the live page vs html-pre9M): 9M's own lines, read from its frozen result (html-pre9N =
// HEAD 5369081); the live page now also lists unpaid leave in its Leave row (remnants.mjs C4)
const wfNow = SRC("html-pre9N", WF).split("\r\n"), wfOld = OLD(WF).split("\r\n");
const wfD = wfNow.length === wfOld.length ? wfNow.map((l, i) => [i + 1, l.trim()]).filter(([i]) => wfNow[i - 1] !== wfOld[i - 1]) : null;
check("B7", "approval-workflows.html: only the example card changed: its id, the three steps' classes, and the Manager and Finance dots (now ticks)",
  wfD?.length === 6 && wfD.filter(([, l]) => /^<li class="stepper__step is-(done|current)" data-stage="(manager|finance|admin)">$/.test(l)).length === 3
  && wfD.filter(([, l]) => l.startsWith('<span class="stepper__dot"><svg')).length === 2 && wfD.some(([, l]) => l === '<section class="card" id="expense-example">'), j(wfD));
// Round 13F (layout; was the live js): render()'s first line now adds salary changes (round 13F). 9N's claim on 9N's
// result, approval-workflows.js as dbde089 has it (js-pre13F); the live file: wfsalary.mjs X3.
const WJ = SRC("js-pre13F", "pages/approval-workflows.js"), WJ0 = SRC("js-pre9M", "pages/approval-workflows.js");
const fn = (s, name) => s.slice(s.indexOf(`function ${name}(`), s.indexOf("\r\n}\r\n", s.indexOf(`function ${name}(`)));
check("B8", "approval-workflows.js: the stat strip's code is untouched (render, decisionDays, monthKeys byte for byte)",
  ["render", "decisionDays", "monthKeys"].every((f) => fn(WJ, f) === fn(WJ0, f) && fn(WJ, f).length > 50));
setNow(2026, 10, 7); fresh();
await open("priya", WF, "approval-workflows");
check("B9", "HR (no workflows:view) opening it by URL: the script draws nothing, so the card keeps its static steps", j(exampleSteps(d)) === j(SEED_STEPS));

// =====================================================================
section("C. user-form.html: no leave:apply override");
const UF = "users/user-form.html";
setNow(2026, 10, 7); fresh();
await open("aarav", UF, "user-form", "?id=EMP-1105");
const opts = (name) => [...d.querySelectorAll(`input[name="${name}"]`)].map((i) => i.value);
// Round 11R (behaviour; R0 test 4: everyone's own pages can't be overridden, so payslip:view-own went; an Employee holds none of the 25, so nothing is offered to deny)
check("C1", "Denied permissions offers nothing for Arjun, an Employee (leave:apply gone; payslip:view-own gone in round 11R); the 25 grant options are each a real permission",
  opts("deny").length === 0 && opts("grant").length === 25 && opts("grant").every((p) => ALL_PERMISSIONS.includes(p)) && !ALL_PERMISSIONS.includes("leave:apply"), j([opts("grant").length, opts("deny")]));
// Round 11R (behaviour; overrides are applied since round 11R, so the block's note says so)
check("C2", "…editing Arjun opens with no page error and the overrides block with its note (applied on top of the default role, round 11R)",
  jsErrors.length === 0 && /Applied on top of the default role, everywhere the app checks: extra permissions are added, denied ones taken away\./.test(txt(d.querySelector("main"))));
// Round 9N (layout; was the live page vs html-pre9M): 9M's own line, read from its frozen result (html-pre9N =
// HEAD 5369081); the live page has also lost the Auditor option since (remnants.mjs B4)
const ufD = lineDiff(SRC("html-pre9N", UF), OLD(UF));
check("C3", "user-form.html: exactly that one line removed, nothing added", ufD[1].length === 0 && j(ufD[0].map((l) => l.trim())) === j(['<label class="check"><input type="checkbox" name="deny" value="leave:apply"> leave:apply</label>'])
  && SRC("html-pre9N", UF).split("\r\n").length === OLD(UF).split("\r\n").length - 1, j(ufD));

// =====================================================================
section("D. holidays.html: the subtitle names the selected year");
const HO = "leave/holidays.html";
const sub = () => txt(d.querySelector(".page-header__subtitle"));
const yearSel = () => d.querySelector('select[aria-label="Choose year"]');
setNow(2026, 10, 7); fresh();
H.addHoliday(HOL_ACTOR, { date: "2025-12-25", name: "Christmas Day", kind: "national" });
await open("arjun", HO, "holidays");
check("D1", "Arjun on 7 Oct 2026: 'Company holiday calendar for 2026', the select on 2026", sub() === "Company holiday calendar for 2026" && yearSel().value === "2026", j([sub(), yearSel().value]));
yearSel().value = "2025"; yearSel().dispatchEvent(new w.Event("change"));
check("D2", "choosing 2025 (a year with a holiday): 'Company holiday calendar for 2025', with the list's title '2025 holidays'",
  sub() === "Company holiday calendar for 2025" && txt(d.querySelector("#holiday-list .card__title")) === "2025 holidays", j([sub(), txt(d.querySelector("#holiday-list .card__title"))]));
yearSel().value = "2026"; yearSel().dispatchEvent(new w.Event("change"));
check("D3", "…and back to 2026", sub() === "Company holiday calendar for 2026");
setNow(2027, 1, 5); fresh();
await open("arjun", HO, "holidays");
check("D4", "on 5 Jan 2027 the page opens on 2027 and says so (was a fixed 2026)", sub() === "Company holiday calendar for 2027" && yearSel().value === "2027", j([sub(), yearSel().value]));
setNow(2026, 10, 7); fresh();
await open("priya", HO, "holidays");
const f = (id) => d.getElementById(id);
f("holiday-date").value = "2027-01-26"; f("holiday-name").value = "Republic Day"; f("holiday-kind").value = "national";
d.querySelector("#holiday-modal form").dispatchEvent(new w.Event("submit", { cancelable: true }));
check("D5", "HR adds a 2027 holiday while on 2026: the page moves to 2027 and the subtitle follows", sub() === "Company holiday calendar for 2027" && yearSel().value === "2027", j([sub(), yearSel().value]));
check("D6", "holidays.html is untouched (its static subtitle still reads 2026 before the script runs)", SRC("html-pre14A", HO) /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */ === OLD(HO) && txt(parse(SRC("html-pre14A", HO)).querySelector(".page-header__subtitle")) === "Company holiday calendar for 2026");
// Round 10W (layout; was the live pages/holidays.js): 10W passes the signed-in id to the two writes (holiguard.mjs X4), so
// 9M's claim is read from the page before 10W (js-pre10W = HEAD eba4336)
const HJ = SRC("js-pre10W", "pages/holidays.js"), HJ0 = SRC("js-pre9M", "pages/holidays.js");
check("D7", "holidays.js: only the subtitle (one lookup, one line in render) and its comment",
  code(HJ).replace('const subtitle = document.querySelector(".page-header__subtitle");\r\n', "").replace("  if (subtitle) subtitle.textContent = `Company holiday calendar for ${year}`;\r\n", "") === code(HJ0));

// =====================================================================
section("Z. Change set and hygiene");
const walk = (root, rel = "") => fs.readdirSync(`${root}/${rel}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${rel}${e.name}/`) : [`${rel}${e.name}`]));
// Round 9N (layout; was the live js / pages / css vs the pre9M copies): 9M's own change set, read from its frozen
// result (js-pre9N, html-pre9N, css-pre9N = HEAD 5369081); the live tree now holds 9N's (remnants.mjs Z1 / Z2)
const changedJs = walk(`${HERE}js-pre9N`).filter((f) => SRC("js-pre9N", f) !== SRC("js-pre9M", f)).sort();
const changedHtml = walk(`${HERE}html-pre9N`).filter((f) => f.endsWith(".html") && SRC("html-pre9N", f) !== OLD(f)).sort();
const changedCss = walk(`${HERE}css-pre9N`).filter((f) => SRC("css-pre9N", f) !== SRC("css-pre9M", f));
check("Z1", "js changed from HEAD: pages/approval-workflows.js, pages/holidays.js; nothing added or removed",
  j(changedJs) === j(["pages/approval-workflows.js", "pages/holidays.js"]) && j(walk(`${HERE}js-pre9N`).sort()) === j(walk(`${HERE}js-pre9M`).sort()), j(changedJs));
check("Z2", "pages changed: access/approval-workflows, system/backup, users/user-form (not the Approvals inbox, not holidays.html); css unchanged",
  j(changedHtml) === j(["access/approval-workflows.html", "system/backup.html", "users/user-form.html"]) && changedCss.length === 0 && j(walk(`${HERE}html-pre9N`).sort()) === j(walk(`${HERE}html-pre9M`).sort()), j([changedHtml, changedCss]));
check("Z3", "the 5 are CRLF only, with no final newline", [...changedJs.map((f) => SRC("js-pre9N", f)), ...changedHtml.map((f) => SRC("html-pre9N", f))].every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
