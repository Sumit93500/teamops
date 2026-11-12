// usage: node delnames.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 13J (round-13i-scoping.md I3 (b); I4, I5 ruled): a deleted person keeps their name for what still names them.
// data/store.js deleteUser() writes { id: name } into "deleted-names" once the delete is saved, deletedName(id) reads it,
// resetDemoData() clears it; ui/leave-view.js nameOf() falls back to it before the bare id; employee-dashboard.js and
// my-requests.js look names up through nameOf(); user-profile.js's Delete comment rewritten. ./js-pre13J, ./html-pre13J
// and ./css-pre13J are the code, pages and css before this round (office-os f893d25).
//   G  the code before: the bare id;  N  the record;  A  Asset assignment (12T's T9);  H  the HR dashboard's requests
//   table;  I  the inbox's decided tabs;  D  a deleted decider;  U  ids with no name;  R  Reset demo data, a bad record;
//   F  the profile's not-found page;  S  what a delete writes;  E  no page errors;  X  scope
// Fresh storage made Mon 9 Nov 2026 09:00 (the admin dashboard opened as Aarav); each step at 11:00 on its own day;
// the pages opened Thu 12 Nov 11:00.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");

const RealDate = Date;
let NOW = new RealDate(2026, 10, 9, 9, 0, 0).getTime();
const at = (m, d, h = 11) => { NOW = new RealDate(2026, m - 1, d, h, 0, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", SNEHA = "EMP-1029", ROHAN = "EMP-1042",
  VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const WHO = { aarav: ["admin", "Aarav Mehta", AARAV], priya: ["hr", "Priya Nair", PRIYA], arjun: ["emp", "Arjun Kapoor", ARJUN] };

let loads = 0, w = null, d = null, saved = {};
const allErrors = [];
// Opens a page as `who`; its own scripts from ./js (the build) or ./js-pre13J (the code before).
async function open(page, who = "aarav", { query = "", js = "js" } = {}) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) allErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(path.join(DIR, page), "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.HTMLElement.prototype.scrollIntoView = function () {};
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  if (js !== "js") (await import(`./${js}/core/auth.js`)).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  for (const m of html.matchAll(/assets\/js\/pages\/([\w-]+)\.js/g)) {
    try { await import(`./${js}/pages/${m[1]}.js?load=${loads}`); } catch (e) { allErrors.push(`import ${m[1]}: ${e.message}`); }
  }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }
const snapshot = () => Object.fromEntries(Object.keys(w.localStorage).sort().map((k) => [k, w.localStorage.getItem(k)]));
const txt = (n) => n?.textContent.replace(/\s+/g, " ").trim() ?? "";
const main = () => txt(d.querySelector("main") ?? d.body);

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;

async function start() { fresh(); at(11, 9, 9); await open("dashboard/admin.html"); }
await start();
const S = await import("./js/data/store.js");
const L = await import("./js/data/leave-store.js");
const A = await import("./js/data/attendance-store.js");
const E = await import("./js/data/expenses-store.js");
const R = await import("./js/data/asset-requests-store.js");
const V = await import("./js/ui/leave-view.js");
const OLD = await import("./js-pre13J/data/store.js");
const NAMES = "officeos:deleted-names";
const stored = () => JSON.parse(w.localStorage.getItem(NAMES) ?? "null");
// The code before has no deletedName(): read through a guard, so that code fails here rather than crashing.
const dn = (id) => (S.deletedName ? S.deletedName(id) : undefined);

// Rohan with nothing open (13H): A, he cancels LV-2189 and EXP-3103 himself; B, both decided (LV-2189 approved by Sneha
// then Priya, EXP-3103 approved by Aarav and paid by Kabir). Then deleted, by `store` (the build's, or the code before's).
async function rohanGone(kind = "A", store = S) {
  await start();
  const steps = [];
  at(11, 10);
  if (kind === "A") steps.push(L.cancelLeave("LV-2189", ROHAN), E.cancelExpense("EXP-3103", ROHAN));
  else {
    steps.push(L.decideLeave("LV-2189", SNEHA, S.getUser(SNEHA).role, "approve"), L.decideLeave("LV-2189", PRIYA, "hr", "approve"));
    steps.push(E.decideExpense("EXP-3103", AARAV, "admin", "approve"), E.payExpense("EXP-3103", KABIR));
  }
  at(11, 11);
  steps.push(store.deleteUser(AARAV, ROHAN));
  at(11, 12);
  return steps.every((r) => r.ok === true);
}
const ALERT = (who) => `1 asset is still assigned to people who are inactive: AST-0119 (${who}). Take it back with Update, then Return to the store.`;
const alertText = () => { const a = d.getElementById("inactive-alert"); return a && !a.hidden ? txt(a) : null; };
const assetRow = () => txt([...d.querySelectorAll("tr")].find((tr) => txt(tr).includes("AST-0119")));
const hrRows = () => [...d.querySelectorAll(".table__user-name")].map((n) => [txt(n.previousElementSibling), txt(n)]).filter(([, name]) => /Rohan|EMP-1042/.test(name));

// =================================================================
section("G. The code before (js-pre13J): the bare id");
let ok = await rohanGone("A", OLD);
await open("inventory/asset-assignment.html", "aarav", { js: "js-pre13J" });
const gAlert = alertText();
await open("dashboard/hr.html", "priya", { js: "js-pre13J" });
const gHr = hrRows();
check("G1", "deleted by the code before: no deleted-names record; Asset assignment's alert says AST-0119 (EMP-1042); the HR table's rows read EMP-1042, initials 'E'",
  ok && stored() === null && gAlert === ALERT("EMP-1042") && gHr.length > 0 && gHr.every(([ini, name]) => name === "EMP-1042" && ini === "E"), j([stored(), gAlert, gHr]));

// =================================================================
section("N. The record");
ok = await rohanGone("A");
check("N1", "Rohan deleted (nothing open): { version: 1, names: { EMP-1042: 'Rohan Gupta' } } stored; deletedName() reads it; getUser() is null",
  ok && j(stored()) === j({ version: 1, names: { [ROHAN]: "Rohan Gupta" } }) && dn(ROHAN) === "Rohan Gupta" && S.getUser(ROHAN) === null, j(stored()));
const refused = S.deleteUser(AARAV, ANANYA);
check("N2", "a refused delete (Ananya, with requests open) keeps no name: the record as it was", !refused.ok && j(stored()) === j({ version: 1, names: { [ROHAN]: "Rohan Gupta" } }), j(stored()));
at(11, 12, 12);
const vSettle = [A.regularizationsFor(VIKRAM).filter((r) => r.status === "pending").map((r) => A.cancelRegularization(r.id, VIKRAM)), E.cancelExpense("EXP-3105", VIKRAM)].flat();
const n3 = S.deleteUser(AARAV, VIKRAM);
check("N3", "a second delete (Vikram, after cancelling his own) adds his name beside Rohan's", vSettle.every((r) => r.ok) && n3.ok
  && j(stored()) === j({ version: 1, names: { [ROHAN]: "Rohan Gupta", [VIKRAM]: "Vikram Singh" } }), j([vSettle.map((r) => r.ok), stored()]));

// =================================================================
section("A. Asset assignment (12T's T9)");
ok = await rohanGone("A");
await open("inventory/asset-assignment.html");
check("A1", "the alert names him: 'AST-0119 (Rohan Gupta)', not EMP-1042", ok && alertText() === ALERT("Rohan Gupta"), j(alertText()));
const row = assetRow(), rowIni = txt([...d.querySelectorAll("tr")].find((tr) => txt(tr).includes("AST-0119"))?.querySelector(".table__user > div"));
check("A2", "AST-0119's row (personCell): 'Rohan Gupta', initials 'RG', still 'No longer on the employee list'; no EMP-1042", /Rohan Gupta/.test(row) && rowIni === "RG" && /No longer on the employee list/.test(row) && !/EMP-1042/.test(row), j([row, rowIni]));

// =================================================================
section("H. The HR dashboard's requests table");
await open("dashboard/hr.html", "priya");
const hr = hrRows();
check("H1", "his closed requests read 'Rohan Gupta' with initials 'RG' (the avatar follows nameOf())", hr.length > 0 && hr.every(([ini, name]) => name === "Rohan Gupta" && ini === "RG"), j(hr));

// =================================================================
section("I. The inbox's decided tabs (B: both his requests decided before the delete)");
ok = await rohanGone("B");
await open("requests/approvals-inbox.html");
const inbox = main();
check("I1", "as Aarav: 'Leave: Rohan Gupta, 13 – 15 Oct' and 'Expense: Rohan Gupta, ₹62,000'; no EMP-1042",
  ok && inbox.includes("Leave: Rohan Gupta, 13 – 15 Oct") && inbox.includes("Expense: Rohan Gupta, ₹62,000") && !inbox.includes("EMP-1042"), j(inbox.match(/(Leave|Expense): [^,]+, [^ ]+/g)));
await open("requests/approvals-inbox.html", "priya");
check("I2", "as Priya: 'Leave: Rohan Gupta, 13 – 15 Oct'; no EMP-1042", main().includes("Leave: Rohan Gupta, 13 – 15 Oct") && !main().includes("EMP-1042"));

// =================================================================
section("D. A deleted decider");
await start();
at(11, 10);
const d1 = R.decideAssetRequest("ARQ-1", SNEHA, S.getUser(SNEHA).role, "approve");
const own = [L.cancelLeave("LV-2202", SNEHA), ...A.regularizationsFor(SNEHA).filter((r) => r.status === "pending").map((r) => A.cancelRegularization(r.id, SNEHA))];
at(11, 11);
const dDel = S.deleteUser(AARAV, SNEHA);
at(11, 12);
await open("inventory/my-assets.html", "arjun");
const mine = main();
check("D1", "Sneha approves Arjun's ARQ-1 (manager stage), then is deleted: Arjun's My assets says 'Approved by Sneha Rao, 10 Nov', not EMP-1029",
  d1.ok && own.every((r) => r.ok) && dDel.ok && mine.includes("Approved by Sneha Rao, 10 Nov") && !mine.includes("EMP-1029"), j([d1.ok, own.map((r) => r.ok), dDel.ok ?? dDel, mine.match(/Approved by [^,]+, \d+ \w+/g)]));

// =================================================================
section("U. Ids with no name");
check("U1", "an id never on record: nameOf('EMP-9999') is the id itself", V.nameOf("EMP-9999") === "EMP-9999" && dn("EMP-9999") === null);
const cell = V.personCell("EMP-9999", undefined, "sub");
check("U3", "...and its table cell (personCell) is the id with '?' initials, as before", txt(cell.querySelector(".table__user-name")) === "EMP-9999" && txt(cell.querySelector(".table__user > div")) === "?", txt(cell));
ok = await rohanGone("A", OLD);
await open("inventory/asset-assignment.html");
check("U2", "deleted by the code before (no name kept): the build's page still shows AST-0119 (EMP-1042)", ok && stored() === null && alertText() === ALERT("EMP-1042"), j(alertText()));

// =================================================================
section("R. Reset demo data; a bad record");
ok = await rohanGone("A");
S.resetDemoData();
check("R1", "Reset demo data (resetDemoData()) removes the record with the users: no deleted-names key; deletedName() null; Rohan back from the seed",
  ok && !Object.keys(w.localStorage).includes(NAMES) && dn(ROHAN) === null && S.getUser(ROHAN)?.name === "Rohan Gupta");
w.localStorage.setItem(NAMES, JSON.stringify({ version: 2, names: { [ROHAN]: "Someone Else" } }));
const v2 = dn(ROHAN);
w.localStorage.setItem(NAMES, JSON.stringify({ version: 1, names: { [ROHAN]: 7 } }));
const notText = dn(ROHAN);
w.localStorage.setItem(NAMES, "not json");
const garbled = dn(ROHAN);
check("R2", "a record of another version, a name that isn't text, or unreadable JSON: null each time; inherited names ('__proto__', 'constructor', 'toString') null",
  v2 === null && notText === null && garbled === null && ["__proto__", "constructor", "toString"].every((id) => dn(id) === null), j([v2, notText, garbled]));

// =================================================================
section("F. The profile's not-found page");
ok = await rohanGone("A");
await open("users/user-profile.html", "aarav", { query: `?id=${ROHAN}` });
const nf = main();
await open("users/user-profile.html", "aarav", { query: `?id=${ROHAN}`, js: "js-pre13J" });
check("F1", "user-profile.html?id=EMP-1042 after the delete: 'There's no employee with ID EMP-1042. …', exactly as the code before",
  ok && nf.includes("There's no employee with ID EMP-1042. They may have been deleted, or the link is wrong.") && nf === main(), j(nf.slice(0, 120)));

// =================================================================
section("S, E. What a delete writes; no page errors");
await start();
at(11, 10); L.cancelLeave("LV-2189", ROHAN); E.cancelExpense("EXP-3103", ROHAN);
const before = snapshot();
S.deleteUser(AARAV, ROHAN);
const after = snapshot();
const moved = Object.keys({ ...before, ...after }).filter((k) => before[k] !== after[k]).sort();
check("S1", "a delete writes exactly two keys: users and deleted-names", j(moved) === j(["officeos:deleted-names", "officeos:users"]), j(moved));
check("E1", "no page errors in any load", allErrors.length === 0, j(allErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const walk = (dir) => fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile())
  .map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replace(/\\/g, "/")).sort();
const changedIn = (now, then) => { const a = walk(now), b = walk(then); return { changed: a.filter((f) => b.includes(f) && fs.readFileSync(path.join(now, f), "latin1") !== fs.readFileSync(path.join(then, f), "latin1")), added: a.filter((f) => !b.includes(f)), removed: b.filter((f) => !a.includes(f)) }; };
// Round 13L (layout; was the live js): 13J's change set on 13J's result, js-pre13L (2b12e51) against js-pre13J; the
// live js: sessrole.mjs X1.
const js = changedIn(path.join(HERE, "js-pre13L"), path.join(HERE, "js-pre13J"));
const FIVE = ["data/store.js", "pages/employee-dashboard.js", "pages/my-requests.js", "pages/user-profile.js", "ui/leave-view.js"];
check("X1", "js: exactly the five changed (store.js, leave-view.js, employee-dashboard.js, my-requests.js, user-profile.js); nothing added or removed",
  j(js) === j({ changed: FIVE, added: [], removed: [] }), j(js));
// Round 13N (layout, X2; was the live pages): 13J's own pages; the live pages: resetcard.mjs X2
const pages = changedIn(path.join(HERE, "html-pre13N"), path.join(HERE, "html-pre13J")), css = /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ changedIn(path.join(HERE, "css-pre13U"), path.join(HERE, "css-pre13J"));
check("X2", "no page and no css changed, added or removed", j(pages) === j({ changed: [], added: [], removed: [] }) && j(css) === j({ changed: [], added: [], removed: [] }), j([pages, css]));
const src = (root, f) => fs.readFileSync(path.join(HERE, root, f), "utf8");
const code = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l));
// Round 13P (layout, X3; was the live js): 13J's change set on 13J's result, js-pre13P (686c99d) against js-pre13J;
// the live store.js and user-profile.js: delask.mjs X3 / X5
const diffOf = (f) => { const a = code(src("js-pre13J", f)), b = code(src("js-pre13P", f)); return { gone: a.filter((l) => !b.includes(l)), added: b.filter((l) => !a.includes(l)) }; };
const crlf = (s) => !/[^\r]\n/.test(s) && !s.endsWith("\n");
const exportsOf = (s) => [...s.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]).sort();
const st = diffOf("data/store.js"), lv = diffOf("ui/leave-view.js"), ed = diffOf("pages/employee-dashboard.js"), mr = diffOf("pages/my-requests.js"), up = diffOf("pages/user-profile.js");
check("X3", "every changed file CRLF, no final newline; store.js exports deletedName added, nothing else; leave-view.js: the import, nameOf() and personCell()'s name only; the two pages: the import and the lookup line each; user-profile.js: comments only",
  FIVE.every((f) => crlf(src("js-pre13P", f)))
  && j(exportsOf(src("js-pre13P", "data/store.js"))) === j([...exportsOf(src("js-pre13J", "data/store.js")), "deletedName"].sort())
  && j(st.gone) === j(["  return commit(USERS_KEY, box, removed);"])
  && lv.gone.length === 4 && lv.added.length === 5 && lv.added.some((l) => l.includes("getUser(id)?.name ?? deletedName(id) ?? id")) && lv.added.includes("  const name = user?.name ?? deletedName(userId);")
  && ed.gone.length === 2 && ed.added.length === 2 && ed.added.includes("const assetApprovers = (r) => assetWaitingOn(r).map(nameOf).join(\", \");")
  && mr.gone.length === 2 && mr.added.length === 2 && mr.added.includes("const names = (ids) => ids.map(nameOf).join(\", \");")
  && up.gone.length === 0 && up.added.length === 0,
  j({ st: st.gone, lv, ed, mr, up }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
