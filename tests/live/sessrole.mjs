// usage: node sessrole.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 13L (round-13k-scoping.md K1.2 / K2 ruled; 11P P9.3): core/auth.js signIn() no longer saves the role picked at
// sign-in. The session is { userLabel, employeeId, signedInAt }; signIn() keeps its roleKey argument and checks it
// against ROLES (K2.6); can() and getCurrentRole() read the person's record, as since round 11P. ./js-pre13L,
// ./html-pre13L and ./css-pre13L are the code, pages and css before this round (office-os 2b12e51).
//   G  the code before: roleKey saved;  S  the saved session;  L  sign-in on the real login page, each demo role;
//   R  the record decides;  O  a session saved before this round;  E  no page errors;  X  scope
// Fresh storage, Mon 9 Nov 2026 11:00.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");

const RealDate = Date;
const NOW = new RealDate(2026, 10, 9, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

let loads = 0, w = null, d = null, saved = {}, navigations = [];
const allErrors = [];
// Opens a page; the session is whatever storage holds (nobody is signed in here).
async function open(page) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else allErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(path.join(DIR, page), "utf8");
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
const session = () => JSON.parse(w.localStorage.getItem("officeos:session") ?? "null");
const keysOf = (o) => (o ? Object.keys(o).sort() : null);

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;

fresh(); await open("auth/login.html");
const AU = await import("./js/core/auth.js");
const RB = await import("./js/core/rbac.js");
const S = await import("./js/data/store.js");
const OLD = await import("./js-pre13L/core/auth.js");
const NEW_KEYS = ["employeeId", "signedInAt", "userLabel"];

// =================================================================
section("G. The code before (js-pre13L)");
fresh(); OLD.signIn("emp", "Arjun Kapoor", "EMP-1105");
check("G1", "the code before saved { roleKey, userLabel, employeeId, signedInAt }", j(keysOf(session())) === j(["employeeId", "roleKey", "signedInAt", "userLabel"]) && session().roleKey === "emp", j(session()));

// =================================================================
section("S. The saved session");
fresh();
const s1 = AU.signIn("emp", "Arjun Kapoor", "EMP-1105");
check("S1", "signIn('emp', 'Arjun Kapoor', 'EMP-1105'): true; saved { userLabel, employeeId, signedInAt } and nothing else (no roleKey)",
  s1 === true && j(keysOf(session())) === j(NEW_KEYS) && j([session().userLabel, session().employeeId, session().signedInAt]) === j(["Arjun Kapoor", "EMP-1105", NOW]), j(session()));
fresh();
const s2 = AU.signIn("boss", "Nobody", "EMP-1105");
check("S2", "an unknown role is still refused (K2.6: the argument is still checked): false, nothing saved", s2 === false && session() === null, j([s2, session()]));
check("S3", "signIn() still takes the role as its first argument (three parameters)", AU.signIn.length === 3);

// =================================================================
section("L. Sign-in on the real login page, each demo role");
const DEMO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"] };
const ROLES = (await import("./js/config/roles.js")).ROLES;
const L = {};
for (const role of Object.keys(DEMO)) {
  fresh(); await open("auth/login.html");
  d.querySelector(`[data-demo-role="${role}"]`)?.click();
  const s = session(), redirected = navigations.length;
  const landing = AU.getCurrentRole()?.landing;
  await open(landing);
  L[role] = { keys: keysOf(s), who: s && [s.userLabel, s.employeeId], redirected, role: AU.getCurrentRole()?.key, landing, opened: navigations.length === 0 };
}
check("L1", "each demo button (Admin, HR, Finance, Employee): a session without roleKey for the right person; sent on to the role's landing page, which opens",
  Object.entries(DEMO).every(([role, who]) => j(L[role].keys) === j(NEW_KEYS) && j(L[role].who) === j(who) && L[role].redirected === 1 && L[role].role === role
    && L[role].landing === ROLES[role].landing && L[role].opened), j(L));

// =================================================================
section("R. The record decides");
fresh(); AU.signIn("admin", "Arjun Kapoor", "EMP-1105");
check("R1", "signed in with the 'admin' button's role but Arjun's id: getCurrentRole() is Employee (his record), can('users:view') false, can('leave:create') true",
  AU.getCurrentRole()?.key === "emp" && RB.can("users:view") === false && RB.can("leave:create") === true, j([AU.getCurrentRole()?.key]));
fresh(); await open("auth/login.html");
const g = S.updateUser("EMP-1001", "EMP-1008", { grantPermissions: ["inventory:view"] });
AU.signIn("fin", "Kabir Shah", "EMP-1008");
check("R2", "Kabir granted inventory:view on his record: can('inventory:view') true, though nothing about it is in the session",
  g.ok && RB.can("inventory:view") === true && j(keysOf(session())) === j(NEW_KEYS), j([g.ok ?? g, session()]));

// =================================================================
section("O. A session saved before this round");
fresh(); await open("auth/login.html");
w.localStorage.setItem("officeos:session", JSON.stringify({ roleKey: "emp", userLabel: "Arjun Kapoor", employeeId: "EMP-1105", signedInAt: NOW }));
await open("leave/my-leave.html");
check("O1", "a session that still has roleKey (saved before 13L): Arjun is still signed in, getCurrentRole() Employee, his My leave opens, nothing rewritten",
  AU.isSignedIn() && AU.getCurrentUser()?.id === "EMP-1105" && AU.getCurrentRole()?.key === "emp" && navigations.length === 0 && session().roleKey === "emp", j(session()));
const stale = w.localStorage.getItem("officeos:session");
w.localStorage.setItem("officeos:session", JSON.stringify({ ...JSON.parse(stale), roleKey: "admin" }));
check("O2", "...and a stale roleKey in it ('admin') changes nothing: still Employee, can('users:view') false, can('leave:create') true", AU.getCurrentRole()?.key === "emp" && RB.can("users:view") === false);
AU.signOut(); AU.signIn("emp", "Arjun Kapoor", "EMP-1105");
check("O3", "signing out and in again: the new shape, roleKey gone", j(keysOf(session())) === j(NEW_KEYS), j(session()));

// =================================================================
section("E. No page errors");
check("E1", "no page errors in any load", allErrors.length === 0, j(allErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const walk = (dir) => fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile())
  .map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replace(/\\/g, "/")).sort();
const changedIn = (now, then) => { const a = walk(now), b = walk(then); return { changed: a.filter((f) => b.includes(f) && fs.readFileSync(path.join(now, f), "latin1") !== fs.readFileSync(path.join(then, f), "latin1")), added: a.filter((f) => !b.includes(f)), removed: b.filter((f) => !a.includes(f)) }; };
// Round 13N (layout, X1; was the live js): 13L's change set on 13L's result, js-pre13N (173c8ce) against js-pre13L; the
// live js: resetcard.mjs X1.
const js = changedIn(path.join(HERE, "js-pre13N"), path.join(HERE, "js-pre13L"));
check("X1", "js: exactly core/auth.js changed; nothing added or removed", j(js) === j({ changed: ["core/auth.js"], added: [], removed: [] }), j(js));
// Round 13N (layout, X2; was the live pages): 13L's own pages; the live pages: resetcard.mjs X2
const pages = changedIn(path.join(HERE, "html-pre13N"), path.join(HERE, "html-pre13L")), css = /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ changedIn(path.join(HERE, "css-pre13U"), path.join(HERE, "css-pre13L"));
check("X2", "no page and no css changed, added or removed", j(pages) === j({ changed: [], added: [], removed: [] }) && j(css) === j({ changed: [], added: [], removed: [] }), j([pages, css]));
const src = (root) => fs.readFileSync(path.join(HERE, root, "core", "auth.js"), "utf8");
const code = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l));
const NOWJS = src("js"), OLDJS = src("js-pre13L");
const gone = code(OLDJS).filter((l) => !code(NOWJS).includes(l)), added = code(NOWJS).filter((l) => !code(OLDJS).includes(l));
const exportsOf = (s) => [...s.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]).sort();
check("X3", "auth.js: CRLF, no final newline, the same exports; comments aside, only the saved session's line replaced",
  !/[^\r]\n/.test(NOWJS) && !NOWJS.endsWith("\n") && j(exportsOf(NOWJS)) === j(exportsOf(OLDJS))
  && j(gone) === j(["  save(SESSION_KEY, { roleKey, userLabel, employeeId, signedInAt: Date.now() });"])
  && j(added) === j(["  save(SESSION_KEY, { userLabel, employeeId, signedInAt: Date.now() });"]), j({ gone, added }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
