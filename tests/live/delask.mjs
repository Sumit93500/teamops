// usage: node delask.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 13P (round-13o-scoping.md O2 (b) ruled; 13G G4.3): data/store.js deleteProblem(actorUserId, id) is deleteUser()'s
// refusal as a dry run, in its words, or null; deleteUser() fails with it. The profile page's Delete asks it first: a
// reason is the toast, with no confirm; otherwise the confirm as before (12T's held assets included). The header comment
// names the deleted-names record (M1.4). ./js-pre13P, ./html-pre13P and ./css-pre13P are the code, pages and css before
// this round (office-os 686c99d).
//   G  the code before;  S  deleteProblem() == deleteUser()'s refusal;  P  the profile page's Delete;  E  no page errors;
//   X  scope
// Fresh storage, Mon 9 Nov 2026.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");

const RealDate = Date;
let NOW = new RealDate(2026, 10, 9, 11, 0, 0).getTime();
const at = (m, d, h = 11) => { NOW = new RealDate(2026, m - 1, d, h, 0, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

let loads = 0, w = null, d = null, saved = {};
const allErrors = [];
// Opens a page; the session is whatever storage holds.
async function open(page) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) allErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(path.join(DIR, page.split("?")[0]), "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.HTMLElement.prototype.scrollIntoView = function () {};
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  await import(`./js/app.js?load=${loads}`);
  for (const m of html.matchAll(/assets\/js\/pages\/([\w-]+)\.js/g)) {
    try { await import(`./js/pages/${m[1]}.js?load=${loads}`); } catch (e) { allErrors.push(`import ${m[1]}: ${e.message}`); }
  }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }
const snapshot = () => JSON.stringify(Object.fromEntries(Object.keys(w.localStorage).sort().map((k) => [k, w.localStorage.getItem(k)])));
const restore = (snap) => { w.localStorage.clear(); Object.entries(JSON.parse(snap)).forEach(([k, v]) => w.localStorage.setItem(k, v)); };

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
const A = await import("./js/data/attendance-store.js");
const R = await import("./js/data/asset-requests-store.js");
const OLD = await import("./js-pre13P/data/store.js");
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", ROHAN = "EMP-1042", DIVYA = "EMP-1061";
const has = typeof S.deleteProblem === "function";
const dp = (actor, id) => (has ? S.deleteProblem(actor, id) : "(no deleteProblem)");
const src = (root, f) => fs.readFileSync(path.join(HERE, root, f), "utf8");

// =================================================================
section("G. The code before (js-pre13P)");
const oldPage = src("js-pre13P", "pages/user-profile.js");
check("G1", "store.js had no deleteProblem(); the profile page confirmed before deleteUser() could refuse",
  typeof OLD.deleteProblem === "undefined" && oldPage.indexOf("window.confirm(`Delete ${user.name}?") < oldPage.indexOf("deleteUser(getCurrentUserId(), user.id)") && !oldPage.includes("deleteProblem"));

// =================================================================
section("S. deleteProblem() == deleteUser()'s refusal");
check("S1", "deleteProblem is exported and takes (actorUserId, id)", has && S.deleteProblem.length === 2);
// Every person on the seed, by Aarav (Admin) and by Priya (HR: no users:delete), plus an unknown id: deleteProblem()
// first (it writes nothing), then deleteUser() on the same storage; storage restored after each.
fresh(); await open("auth/login.html");
// The first reads seed the users and the four request stores (openRequestsOf() reads them from storage: a kind never
// saved has none, round 13H), as any page's sidebar does.
S.getAllUsers(); L.allRequests(); E.allExpenses(); A.allRegularizations(); R.allAssetRequests();
const seeded = snapshot();
const ids = [...S.getAllUsers().map((u) => u.id), "EMP-9999"];
const rows = [];
for (const actor of [AARAV, PRIYA]) {
  for (const id of ids) {
    restore(seeded);
    const problem = dp(actor, id);
    const untouched = snapshot() === seeded;
    const result = S.deleteUser(actor, id);
    rows.push({ actor, id, problem, result, untouched });
  }
}
restore(seeded);
const agrees = (r) => (r.problem === null ? r.result.ok === true : r.result.ok === false && r.result.error === r.problem);
check("S2", `every person (${ids.length - 1}) and an unknown id, by Aarav and by Priya: deleteProblem() is deleteUser()'s error word for word, or null exactly when it deletes`,
  has && rows.length === ids.length * 2 && rows.every(agrees), j(rows.filter((r) => !agrees(r)).slice(0, 3)));
check("S3", "...and deleteProblem() writes nothing", rows.every((r) => r.untouched), j(rows.filter((r) => !r.untouched).map((r) => [r.actor, r.id])));
const aarav = Object.fromEntries(rows.filter((r) => r.actor === AARAV).map((r) => [r.id, r.problem]));
check("S4", "by Aarav on the seed: Meera and Divya deletable (null); Ananya's four open items 'LV-2208, and 3 more'; Rohan's 'LV-2189, and 1 more'; a demo identity; his own account; an unknown id",
  aarav[MEERA] === null && aarav[DIVYA] === null
  && aarav[ANANYA] === "Ananya Iyer has a leave request waiting for a decision (LV-2208, and 3 more), so they can't be deleted: decide it first, or deactivate them instead."
  && aarav[ROHAN] === "Rohan Gupta has a leave request waiting for a decision (LV-2189, and 1 more), so they can't be deleted: decide it first, or deactivate them instead."
  && aarav[KABIR] === "EMP-1008 is a demo sign-in identity and can't be deleted." && aarav[AARAV] === "EMP-1001 is a demo sign-in identity and can't be deleted."
  && aarav["EMP-9999"] === "No employee with id EMP-9999.", j(aarav));
check("S5", "by Priya (no users:delete): 'You can't delete employees.' for everyone", rows.filter((r) => r.actor === PRIYA).every((r) => r.problem === "You can't delete employees."));
// A salary change waiting (12X) for Meera, otherwise deletable: the same words both ways.
restore(seeded);
const sp = P.proposeSalary(KABIR, MEERA, { gross: 106251, effectiveFrom: "2026-12-01" });
const spProblem = dp(AARAV, MEERA), spResult = S.deleteUser(AARAV, MEERA);
check("S6", "Meera with a salary change waiting (12X): deleteProblem() gives 12X's refusal, and deleteUser() the same",
  sp.ok && spProblem === `Meera Joshi has a salary change waiting for a decision (${sp.record.id}), so they can't be deleted: decide or withdraw it first.` && spResult.ok === false && spResult.error === spProblem, j([spProblem, spResult]));

// =================================================================
section("P. The profile page's Delete");
const asked = [];
let answer = true;
async function profile(id) {
  await open(`users/user-profile.html?id=${id}`);
  asked.length = 0;
  w.confirm = (m) => { asked.push(m); return answer; };
  return [...d.querySelectorAll(".page-header__actions button")].find((b) => b.textContent.trim() === "Delete");
}
const toast = () => [...d.querySelectorAll(".toast__text")].map((t) => t.textContent.trim()).at(-1) ?? null;
// Each person as Aarav on fresh storage: Delete clicked, OK to any confirm.
const page = {};
for (const id of ids.slice(0, -1)) {
  fresh(); await open("auth/login.html"); AU.signIn("admin", "Aarav Mehta", AARAV);
  const btn = await profile(id);
  const problem = dp(AARAV, id);   // asked once the page has loaded (and seeded the stores), just before the click
  btn?.click();
  page[id] = { problem, asked: asked.length, toast: toast(), gone: S.getUser(id) === null };
}
const refusedIds = Object.keys(page).filter((id) => id !== AARAV && page[id].problem !== null);
check("P1", "every refused person (Ananya, Sneha, Rohan, Vikram; Priya, Kabir, Arjun, the demo identities): no confirm at all; the toast is deleteProblem()'s reason; they stay",
  refusedIds.length === 7 && refusedIds.every((id) => page[id].asked === 0 && page[id].toast === page[id].problem && !page[id].gone), j(refusedIds.map((id) => [id, page[id]])));
check("P1b", "Aarav's own profile: the page's own check, as before: 'You can't delete your own account.', no confirm",
  page[AARAV].asked === 0 && page[AARAV].toast === "You can't delete your own account." && !page[AARAV].gone, j(page[AARAV]));
check("P2", "Rohan (holding AST-0119, two open requests): refused at once; the held-asset note isn't shown, there's no dialog to show it in",
  page[ROHAN].asked === 0 && /^Rohan Gupta has a leave request waiting/.test(page[ROHAN].toast ?? ""), j(page[ROHAN]));
const CONFIRM = (name, held = "") => `Delete ${name}? They'll be removed from the employee list. Only Reset demo data brings them back.${held ? `\n\n${held}` : ""}`;
fresh(); await open("auth/login.html"); AU.signIn("admin", "Aarav Mehta", AARAV);
answer = false; (await profile(MEERA))?.click();
const meeraCancel = { asked: [...asked], gone: S.getUser(MEERA) === null };
answer = true; (await profile(MEERA))?.click();
check("P3", "Meera (deletable): the confirm as before, word for word; Cancel keeps her, OK deletes her ('Meera Joshi deleted.')",
  j(meeraCancel.asked) === j([CONFIRM("Meera Joshi")]) && !meeraCancel.gone && j(asked) === j([CONFIRM("Meera Joshi")]) && S.getUser(MEERA) === null && toast() === "Meera Joshi deleted.", j([meeraCancel, asked, toast()]));
// Rohan once his requests are settled (13H's fixture A: he cancels LV-2189 and EXP-3103 himself): deletable, so the
// confirm is back, with 12T's held-asset note.
fresh(); await open("auth/login.html");
at(11, 10);
const settled = [L.cancelLeave("LV-2189", ROHAN), E.cancelExpense("EXP-3103", ROHAN)];
at(11, 11);
AU.signIn("admin", "Aarav Mehta", AARAV);
answer = true; (await profile(ROHAN))?.click();
check("P4", "Rohan with his requests settled: no reason; the confirm as before, with 12T's note 'They still hold AST-0119 (MacBook Pro 14\"). Take it back on Asset assignment.'; OK deletes him",
  settled.every((r) => r.ok) && j(asked) === j([CONFIRM("Rohan Gupta", 'They still hold AST-0119 (MacBook Pro 14"). Take it back on Asset assignment.')]) && S.getUser(ROHAN) === null, j([settled.map((r) => r.ok), asked, toast()]));
at(11, 9);

// =================================================================
section("E. No page errors");
check("E1", "no page errors in any load", allErrors.length === 0, j(allErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const walk = (dir) => fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile())
  .map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replace(/\\/g, "/")).sort();
const changedIn = (now, then) => { const a = walk(now), b = walk(then); return { changed: a.filter((f) => b.includes(f) && fs.readFileSync(path.join(now, f), "latin1") !== fs.readFileSync(path.join(then, f), "latin1")), added: a.filter((f) => !b.includes(f)), removed: b.filter((f) => !a.includes(f)) }; };
// Round 13R (layout, X1; was the live js): 13P's change set on 13P's result, js-pre13R (8e20454) against js-pre13P;
// the live js: holipast.mjs X1
const js = changedIn(path.join(HERE, "js-pre13R"), path.join(HERE, "js-pre13P"));
check("X1", "js: exactly data/store.js and pages/user-profile.js changed; nothing added or removed", j(js) === j({ changed: ["data/store.js", "pages/user-profile.js"], added: [], removed: [] }), j(js));
// Round 13T (layout, X2; was the live pages): 13P's own pages, html-pre13T (429cf92) against html-pre13P; the live
// pages: legend.mjs X1
const pages = changedIn(path.join(HERE, "html-pre13T"), path.join(HERE, "html-pre13P")), css = /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ changedIn(path.join(HERE, "css-pre13U"), path.join(HERE, "css-pre13P"));
check("X2", "no page and no css changed, added or removed", j(pages) === j({ changed: [], added: [], removed: [] }) && j(css) === j({ changed: [], added: [], removed: [] }), j([pages, css]));
const NOWST = src("js-pree4", "data/store.js") /* Round Demo buttons part 1 (layout; was the live js): 13P's claim read from the frozen js-pree4 (office-os 8e99242); the live file's new exports: demobtn.mjs S9 */, OLDST = src("js-pre13P", "data/store.js");
const crlf = (s) => !/[^\r]\n/.test(s) && !s.endsWith("\n");
const exportsOf = (s) => [...s.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]).sort();
// deleteUser()'s refusal texts before this round (its string and template literals), each still in store.js as is.
const oldBody = OLDST.slice(OLDST.indexOf("export function deleteUser("), OLDST.indexOf("// ---------- department writes"));
const literals = [...oldBody.matchAll(/fail\((`[^`]*`|"[^"]*")\)/g)].map((m) => m[1]);
check("X3", "store.js: CRLF, no final newline; the exports as before plus deleteProblem; each of deleteUser()'s 6 refusal literals before this round still there, character for character",
  crlf(NOWST) && j(exportsOf(NOWST)) === j([...exportsOf(OLDST), "deleteProblem"].sort()) && literals.length === 6 && literals.every((l) => NOWST.includes(l)), j([literals.length, literals.filter((l) => !NOWST.includes(l))]));
check("X4", "store.js's header names the deleted-names record (M1.4)", /^\/\/ The live, editable copy of users and departments, and the names of the\r\n\/\/ people deleted \(round 13J\)/.test(NOWST.split("\r\n").slice(1, 3).join("\r\n")));
// Round 14E part 2 (layout; was the live js): 13P's claim read from the frozen js-pre14E1 (office-os 8a0aade); the live file's new lines: reasons2.mjs U and W
const NOWUP = src("js-pre14E1", "pages/user-profile.js"), OLDUP = src("js-pre13P", "pages/user-profile.js");
const code = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l));
const gone = code(OLDUP).filter((l) => !code(NOWUP).includes(l)), added = code(NOWUP).filter((l) => !code(OLDUP).includes(l));
check("X5", "user-profile.js: CRLF, no final newline; comments aside, only the import gains deleteProblem and the Delete handler asks it before its confirm",
  crlf(NOWUP) && gone.length === 1 && /deleteUser, reportingManagerName/.test(gone[0]) && added.length === 4 && /deleteUser, deleteProblem, reportingManagerName/.test(added[0])
  && added[1].trim() === "const problem = deleteProblem(getCurrentUserId(), user.id);   // round 13P: the refusal, before any confirm" && added[3].trim() === 'showToast(problem, "danger");', j({ gone, added }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
