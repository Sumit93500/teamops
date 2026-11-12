// usage: node resetcard.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 13N (round-13m-scoping.md M2 ruled; M1.3, M2.2 (b)): two texts that didn't quite say what the app does.
//   users-list.js: the Reset button's confirmation also names salary changes (cleared since 12X) and deleted people's
//   names (cleared since 13J) among what it discards.
//   salary-structure.html: the example card's TDS label says its figure is spread evenly over the year (the card works
//   it out from the monthly gross, 13C C5.10; the person's payslip follows the tax year so far, since 13D).
// ./js-pre13N and ./html-pre13N are the code and pages before this round (office-os 173c8ce); ./css-pre13N its css.
//   G  the texts before;  R  the Reset button: the wording and what it clears;  T  the example card;  E  no page errors;
//   X  scope
// Fresh storage, from Mon 9 Nov 2026.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const PRE = path.join(HERE, "html-pre13N");

const RealDate = Date;
let NOW = new RealDate(2026, 10, 9, 9, 0, 0).getTime();
const at = (m, d, h = 11) => { NOW = new RealDate(2026, m - 1, d, h, 0, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

let loads = 0, w = null, d = null, saved = {}, navigations = [];
const allErrors = [];
// Opens a page from `dir` (the pages under test by default); the session is whatever storage holds.
async function open(page, dir = DIR) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else allErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(path.join(dir, page), "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.HTMLElement.prototype.scrollIntoView = function () {};
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  await import(`./js/app.js?load=${loads}`);
  if (navigations.length) return;
  for (const m of html.matchAll(/assets\/js\/pages\/([\w-]+)\.js/g)) {
    try { await import(`./js/pages/${m[1]}.js?load=${loads}`); } catch (e) { allErrors.push(`import ${m[1]}: ${e.message}`); }
  }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }
const txt = (n) => n?.textContent.replace(/\s+/g, " ").trim() ?? "";

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;

fresh(); await open("auth/login.html");
const AU = await import("./js/core/auth.js");
const S = await import("./js/data/store.js");
const L = await import("./js/data/leave-store.js");
const E = await import("./js/data/expenses-store.js");
const P = await import("./js/data/payroll-store.js");
const AARAV = "EMP-1001", KABIR = "EMP-1008", MEERA = "EMP-1023", ROHAN = "EMP-1042";
const OLD_CONFIRM = "This discards every change made to users, departments, leave, holidays, attendance, salaries, payroll runs, expense claims, inventory and asset requests in this browser. Continue?";
// L0 (behaviour): the reset also clears the company profile, offices, home locations and registered devices, and says so
const NEW_CONFIRM_13N = "This discards every change made to users, departments, leave, holidays, attendance, salaries, salary changes, payroll runs, expense claims, inventory, asset requests and deleted people's names in this browser. Continue?";   // L0: round 13N's wording, for X3 (13N's change between two frozen copies)
const NEW_CONFIRM = "This discards every change made to users, departments, leave, holidays, attendance, salaries, salary changes, payroll runs, expense claims, inventory, asset requests, deleted people's names, the company profile, offices, home locations and registered devices in this browser. Continue?";
const OLD_LABEL = "Income tax (TDS), sample tax rates";
const NEW_LABEL = "Income tax (TDS), sample tax rates, spread evenly over the year";
const source = (root, f) => fs.readFileSync(path.join(HERE, root, f), "utf8");

// =================================================================
section("G. The texts before (js-pre13N, html-pre13N)");
check("G1", "the confirmation before named neither salary changes nor deleted people's names", source("js-pre13N", "pages/users-list.js").includes(`window.confirm(${j(OLD_CONFIRM)})`));
check("G2", "the example card's TDS line before: 'Income tax (TDS), sample tax rates'", fs.readFileSync(path.join(PRE, "payroll", "salary-structure.html"), "utf8").includes(`<dt>${OLD_LABEL}</dt><dd data-field="tds">`));

// =================================================================
section("R. The Reset button: the wording and what it clears");
// A deleted person (Rohan, after cancelling his own open leave and claim: 13H) and a salary change waiting (Meera's, from
// Kabir), both through the stores; then Aarav opens Users and clicks Reset demo data.
let confirms = [], answer = false;
async function usersPage() {
  await open("users/users-list.html");
  confirms = [];
  w.confirm = (m) => { confirms.push(m); return answer; };
  return [...d.querySelectorAll(".page-header__actions button")].find((b) => b.textContent === "Reset demo data");
}
fresh(); await open("auth/login.html");
at(11, 10);
const steps = [L.cancelLeave("LV-2189", ROHAN), E.cancelExpense("EXP-3103", ROHAN)];
at(11, 11);
steps.push(S.deleteUser(AARAV, ROHAN));
const sp = P.proposeSalary(KABIR, MEERA, { gross: 106251, effectiveFrom: "2026-12-01" });
at(11, 12);
AU.signIn("admin", "Aarav Mehta", AARAV);
const state = () => j([S.deletedName(ROHAN), P.salaryProposals(MEERA).map((p) => p.id), w.localStorage.getItem("officeos:deleted-names") !== null, w.localStorage.getItem("officeos:salary-proposals") !== null]);
check("R1", "set-up: Rohan deleted (his name kept: 13J) and a salary change for Meera saved (12X)",
  steps.every((r) => r.ok === true) && sp.ok && S.deletedName(ROHAN) === "Rohan Gupta" && P.salaryProposals(MEERA).length === 1, j([steps.map((r) => r.ok), sp.ok ?? sp]));
const before = state();
answer = false; (await usersPage())?.click();
check("R2", "Cancel: the deleted name and the salary change both kept", confirms.length === 1 && state() === before, j([confirms.length, state()]));
answer = true; const btn = await usersPage(); btn?.click();
check("R3", "OK: the confirmation reads the new wording", j(confirms) === j([NEW_CONFIRM]), j(confirms));
const NAMED = ["users", "departments", "leave", "holidays", "attendance", "salaries", "salary changes", "payroll runs", "expense claims", "inventory", "asset requests", "deleted people's names"];
check("R4", "...naming all twelve things it clears, salary changes and deleted people's names among them", NAMED.every((x) => (confirms[0] ?? "").includes(x)), j(NAMED.filter((x) => !(confirms[0] ?? "").includes(x))));
check("R5", "...and the click does clear both: Rohan's name no longer kept, Meera's salary change gone",
  (S.deletedName(ROHAN) ?? null) === null && P.salaryProposals(MEERA).length === 0 && w.localStorage.getItem("officeos:deleted-names") === null, j([S.deletedName(ROHAN), P.salaryProposals(MEERA).length]));

// =================================================================
section("T. The example card (salary-structure.html)");
const card = () => [...d.querySelectorAll("#salary-example-breakdown .breakdown__row")].map((r) => [txt(r.querySelector("dt")), txt(r.querySelector("dd")), r.querySelector("dd")?.dataset.field ?? null]);
fresh(); at(11, 9);
await open("auth/login.html"); AU.signIn("fin", "Kabir Shah", KABIR);
await open("payroll/salary-structure.html");
const now = card(), title = txt(d.getElementById("salary-example-title"));
await open("payroll/salary-structure.html", PRE);
const then = card(), titleThen = txt(d.getElementById("salary-example-title"));
const tds = now.find((r) => r[2] === "tds");
check("T1", "Kabir opens the salary page: the example names the same person as before (the first row); its TDS line reads 'Income tax (TDS), sample tax rates, spread evenly over the year' and a figure",
  /^Example: \S/.test(title) && title === titleThen && tds?.[0] === NEW_LABEL && /^₹[\d,]+$/.test(tds?.[1] ?? ""), j([title, titleThen, tds]));
check("T2", "...the only change on the card: every figure as before, every other label as before",
  now.length === then.length && now.length > 0 && now.every((r, i) => r[1] === then[i][1] && r[2] === then[i][2] && (r[2] === "tds" ? then[i][0] === OLD_LABEL : r[0] === then[i][0])), j(now.map((r, i) => [r, then[i]]).filter(([a, b]) => j(a) !== j(b))));
const page = (f) => fs.readFileSync(path.join(DIR, "payroll", f), "utf8");
check("T3", "the payslips keep 'Income tax (TDS), sample tax rates' (they follow the tax year, 13D); the component row keeps 'Slab-based, sample tax rates'",
  page("payslips.html").includes(`<dt>${OLD_LABEL}</dt>`) && page("payslip-view.html").includes(`<dt>${OLD_LABEL}</dt>`) && page("salary-structure.html").includes("<td>Slab-based, sample tax rates</td>"));

// =================================================================
section("E. No page errors");
check("E1", "no page errors in any load", allErrors.length === 0, j(allErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const walk = (dir) => fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile())
  .map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replace(/\\/g, "/")).sort();
const changedIn = (now, then) => { const a = walk(now), b = walk(then); return { changed: a.filter((f) => b.includes(f) && fs.readFileSync(path.join(now, f), "latin1") !== fs.readFileSync(path.join(then, f), "latin1")), added: a.filter((f) => !b.includes(f)), removed: b.filter((f) => !a.includes(f)) }; };
// Round 13P (layout, X1; was the live js): 13N's change set on 13N's result, js-pre13P (686c99d) against js-pre13N;
// the live js: delask.mjs X1
const js = changedIn(path.join(HERE, "js-pre13P"), path.join(HERE, "js-pre13N"));
check("X1", "js: exactly pages/users-list.js changed; nothing added or removed", j(js) === j({ changed: ["pages/users-list.js"], added: [], removed: [] }), j(js));
// Round 13T (layout, X2; was the live pages): 13N's own change, html-pre13T (429cf92) against html-pre13N (PRE); the
// live pages: legend.mjs X1
const pages = changedIn(path.join(HERE, "html-pre13T"), PRE), css = /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ changedIn(path.join(HERE, "css-pre13U"), path.join(HERE, "css-pre13N"));
check("X2", "pages: exactly payroll/salary-structure.html changed; no css changed; nothing added or removed",
  j(pages) === j({ changed: ["payroll/salary-structure.html"], added: [], removed: [] }) && j(css) === j({ changed: [], added: [], removed: [] }), j([pages, css]));
// Each file: CRLF, no final newline, exactly one line replaced (the one named).
const oneLine = (a, b) => { const x = a.split("\r\n"), y = b.split("\r\n"); return x.length === y.length ? x.map((l, i) => [l, y[i]]).filter(([p, q]) => p !== q) : null; };
const crlf = (s) => !/[^\r]\n/.test(s) && !s.endsWith("\n");
const UL = [source("js-pre13Z", "pages/users-list.js"), source("js-pre13N", "pages/users-list.js")];   // Round 13Z (scope; was the live js)
const ul = oneLine(UL[1], UL[0]);
check("X3", "users-list.js: CRLF, no final newline; only the confirm() line replaced, old wording for new",
  crlf(UL[0]) && ul?.length === 1 && ul[0][0].trim() === `if (!window.confirm(${j(OLD_CONFIRM)})) return;` && ul[0][1].trim() === `if (!window.confirm(${j(NEW_CONFIRM_13N)})) return;`, j(ul));
const SS = [fs.readFileSync(path.join(HERE, "html-pre14A", "payroll", "salary-structure.html"), "utf8") /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */, fs.readFileSync(path.join(PRE, "payroll", "salary-structure.html"), "utf8")];
const ss = oneLine(SS[1], SS[0]);
check("X4", "salary-structure.html: CRLF, no final newline; only the example's TDS line replaced, the label alone",
  crlf(SS[0]) && ss?.length === 1 && ss[0][1] === ss[0][0].replace(`<dt>${OLD_LABEL}</dt>`, `<dt>${NEW_LABEL}</dt>`) && ss[0][0] !== ss[0][1], j(ss));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
