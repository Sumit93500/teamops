// usage: node recordrole.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 11P: 11M's roadmap row 5 (R6), scoped in round-11o-notes.md O4 / O7, N1-N5 approved. ./js-pre11P,
// ./html-pre11P and ./css-pre11P are the code, pages and css before this round (office-os 3a1eb42).
//   A  core/auth.js: getCurrentUser() resolves the session's employee id to its stored record (null when it isn't on
//      record, is inactive, or there is no id); getCurrentRole() is that record's role, never the role picked at sign-in,
//      read on every call (nothing kept in module scope).
//   B  core/guard.js: signed in but not on record -> signed out, to the login page (N1 / N2); a role on record without
//      the route's permission -> 403, still signed in; redirectToLanding() is the record role's landing (N3).
//   C  the pages: O5's four ways (deleted / deactivated / no employee id / demoted) on every role's own page, now signed
//      out (or 403 for the demoted); a demotion and a promotion take effect at the next load (N4); colour, role label,
//      sidebar and my-profile follow the record (N5); the login picker's role loses to the record (N3).
//   P  pre-11P side by side: the same cases opened with stale permissions.
//   X  scope: exactly core/auth.js and core/guard.js.
// A fixed clock: Mon 2 Nov 2026 10:00 local time.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
const NOW = new RealDate(2026, 10, 2, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", MEERA = "EMP-1023", ROHAN = "EMP-1042", DIVYA = "EMP-1061", ARJUN = "EMP-1105";
const SESS = { admin: ["admin", "Aarav Mehta", AARAV], hr: ["hr", "Priya Nair", PRIYA], fin: ["fin", "Kabir Shah", KABIR], emp: ["emp", "Arjun Kapoor", ARJUN] };
const session = () => JSON.parse(mem.get("officeos:session") ?? "null");
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify(employeeId === undefined ? { roleKey, userLabel, signedInAt: NOW } : { roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null, navigations = [];
const allJsErrors = [];
// Opens a page from `dir` with the js under `js` (./js or ./js-pre11P), on the shared storage as it is (the test sets
// the session and the records up first), running the module scripts its HTML loads.
async function open(page, { dir = DIR, js = "js" } = {}) {
  const vc = new VirtualConsole();
  navigations = []; timers = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message.slice(0, 60)); else if (!/form submission/i.test(e.message)) allJsErrors.push(`${page} (${js}): ${e.message}`); });
  const html = fs.readFileSync(`${dir}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = () => true;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`./${js}/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} (${js}) import: ${e.message}`); }
  }
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} (${js}) timer: ${e.message}`); } });
}
// guard.js / redirectToLanding with a stand-in window: the page's path, and every href assigned (jsdom can't follow a
// navigation, so this is where it shows which page the guard sends someone to).
let hrefs = [];
function stubWindow(page) {
  hrefs = [];
  globalThis.window = { location: { pathname: `/office-os/pages/${page}`, set href(v) { hrefs.push(v); }, get href() { return `http://localhost/office-os/pages/${page}`; } } };
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const fresh = () => { mem.clear(); timers = []; };
// The stored users box, edited directly: the UI refuses deleting or deactivating a demo identity (PROTECTED_IDS), so
// O5's cases are set up the way round-11o-notes O5's probe did.
const S = await import("./js/data/store.js");
function editRecord(id, how, value) {
  S.getAllUsers();   // seed if empty
  const box = JSON.parse(mem.get("officeos:users"));
  const i = box.records.findIndex((u) => u.id === id);
  if (how === "delete") box.records.splice(i, 1);
  else box.records[i][how] = value;
  mem.set("officeos:users", JSON.stringify(box));
}
const A = await import("./js/core/auth.js");
const G = await import("./js/core/guard.js");
const A0 = await import("./js-pre11P/core/auth.js");
const navItems = () => [...d.querySelectorAll(".sidebar__nav .nav__item")].map(txt);
const role = () => A.getCurrentRole()?.key ?? null;
const me = () => A.getCurrentUser?.()?.id ?? null;   // guarded: a tree without the fix fails these checks, not crashes

// =================================================================
section("A. auth.js: the role on record");
fresh();
const a1 = Object.entries(SESS).map(([k, s]) => { fresh(); setSession(...s); return [k, me(), role()]; });
check("A1", "each demo sign-in resolves to its own record, and its role on record is the one it signed in as (as seeded)",
  j(a1) === j([["admin", AARAV, "admin"], ["hr", PRIYA, "hr"], ["fin", KABIR, "fin"], ["emp", ARJUN, "emp"]]), j(a1));
fresh(); setSession("admin", "Arjun Kapoor", ARJUN);
const a2 = [role(), me(), session().roleKey];
fresh(); setSession("emp", "Priya Nair", PRIYA); editRecord(PRIYA, "role", "emp");
const a2b = role();
check("A2", "the record wins over the session's role: an 'admin' session on Arjun's record is Employee (the session still says admin); Priya made an Employee is Employee",
  j(a2) === j(["emp", ARJUN, "admin"]) && a2b === "emp", j([a2, a2b]));
fresh(); setSession(...SESS.hr); editRecord(PRIYA, "delete");
const delR = [me(), role(), A.isSignedIn(), A.getCurrentUserId()];
fresh(); setSession(...SESS.hr); editRecord(PRIYA, "status", "inactive");
const inaR = [me(), role(), A.isSignedIn()];
fresh(); setSession("emp", "Meera Joshi", MEERA);
const onLeave = [S.getUser(MEERA).status, me(), role()];
check("A3", "deleted -> no record, no role (still 'signed in' until a page's guard runs, id kept); inactive -> the same; on leave (Meera, seeded) still resolves: only 'inactive' doesn't",
  j(delR) === j([null, null, true, PRIYA]) && j(inaR) === j([null, null, true]) && j(onLeave) === j(["on-leave", MEERA, "emp"]), j([delR, inaR, onLeave]));
fresh(); setSession("hr", "Priya Nair");
const oldS = [me(), role(), A.isSignedIn(), A.getCurrentUserId()];
fresh();
const out = [me(), role(), A.isSignedIn()];
fresh(); setSession("hr", "Nobody", "EMP-9999");
const unknown = [me(), role()];
fresh(); setSession(...SESS.emp); editRecord(DIVYA, "status", "inactive"); setSession("emp", "Divya Menon", DIVYA);
const divya = [S.getUser(DIVYA).status, me(), role()];
check("A4", "an old session (no employee id), signed out, an id not on record, and Divya (seeded inactive): no record and no role",
  j(oldS) === j([null, null, true, null]) && j(out) === j([null, null, false]) && j(unknown) === j([null, null]) && j(divya) === j(["inactive", null, null]), j([oldS, out, unknown, divya]));
fresh(); setSession(...SESS.hr);
const a5 = [role()];
editRecord(PRIYA, "role", "emp"); a5.push(role());
editRecord(PRIYA, "role", "admin"); a5.push(role());
editRecord(PRIYA, "status", "inactive"); a5.push(role());
editRecord(PRIYA, "status", "active"); a5.push(role());
editRecord(PRIYA, "delete"); a5.push(role());
check("A5", "read on every call, nothing kept: in one module instance, the role follows each change to the record at once (hr, emp, admin, gone when inactive, back, gone when deleted)",
  j(a5) === j(["hr", "emp", "admin", null, "admin", null]), j(a5));
fresh(); A.signIn("fin", "Kabir Shah", KABIR);
const a6 = session();
// Round 13L (behavior; was "the same session (roleKey, …)"): the session no longer keeps the picked role (sessrole.mjs).
check("A6", "signIn() saves the session without the role (userLabel, employeeId, signedInAt; round 13L), and getSession / getCurrentUserId / getCurrentUserLabel read it as before",
  j(Object.keys(a6)) === j(["userLabel", "employeeId", "signedInAt"]) && !("roleKey" in a6) && A.getCurrentUserId() === KABIR && A.getCurrentUserLabel() === "Kabir Shah" && A.getSession().roleKey === undefined, j(a6));

// =================================================================
section("B. guard.js: signed out when not on record, 403 when the role on record lacks the page");
const realWindow = globalThis.window;
function guard(page) { stubWindow(page); const ok = G.guardPage(); return { ok, hrefs: [...hrefs], session: session() ? "kept" : "none" }; }
const b1 = {};
for (const [way, setup] of [["deleted", () => editRecord(PRIYA, "delete")], ["inactive", () => editRecord(PRIYA, "status", "inactive")], ["no id", null]]) {
  fresh(); if (way === "no id") setSession("hr", "Priya Nair"); else { setSession(...SESS.hr); setup(); }
  b1[way] = guard("leave/leave-approvals.html");
}
const toLogin = { ok: false, hrefs: ["../auth/login.html"], session: "none" };
check("B1", "N1: Priya deleted, or deactivated, on leave-approvals (her HR page): signed out (the session key removed) and sent to ../auth/login.html, not the 403 page",
  j(b1.deleted) === j(toLogin) && j(b1.inactive) === j(toLogin), j(b1));
check("B2", "N2: an old HR session with no employee id: the same, signed out and sent to sign in", j(b1["no id"]) === j(toLogin), j(b1["no id"]));
fresh(); setSession(...SESS.hr); editRecord(PRIYA, "role", "emp");
const b3 = guard("leave/leave-approvals.html");
fresh(); setSession(...SESS.hr); editRecord(PRIYA, "role", "emp");
const b3b = guard("dashboard/employee.html");
check("B3", "on record but the role lacks the page (Priya's HR session, her record Employee): the 403 page, still signed in; the Employee dashboard lets her in",
  j(b3) === j({ ok: false, hrefs: ["../errors/403.html"], session: "kept" }) && j(b3b) === j({ ok: true, hrefs: [], session: "kept" }), j([b3, b3b]));
const b4 = ["requests/approvals-inbox.html", "auth/login.html", "errors/403.html"].map((p) => { fresh(); setSession(...SESS.hr); editRecord(PRIYA, "delete"); return guard(p); });
check("B4", "the record check comes before the route: a page any signed-in person may open (approvals-inbox, route null) still signs a deleted person out; public pages (login, 403) don't: they pass, the session left",
  j(b4[0]) === j(toLogin) && j(b4[1]) === j({ ok: true, hrefs: [], session: "kept" }) && j(b4[2]) === j({ ok: true, hrefs: [], session: "kept" }), j(b4));
fresh();
const b5 = guard("leave/leave-approvals.html");
const b5b = Object.entries(SESS).map(([k, s]) => { fresh(); setSession(...s); return [k, guard(`dashboard/${{ admin: "admin", hr: "hr", fin: "finance", emp: "employee" }[k]}.html`).ok]; });
check("B5", "unchanged: nobody signed in -> ../auth/login.html (nothing removed); each demo role opens its own dashboard",
  j(b5) === j({ ok: false, hrefs: ["../auth/login.html"], session: "none" }) && b5b.every(([, ok]) => ok), j([b5, b5b]));
function landing(setup) { fresh(); setup(); stubWindow("auth/login.html"); G.redirectToLanding(); return hrefs[0]; }
const b6 = [
  landing(() => setSession(...SESS.hr)),
  landing(() => { setSession(...SESS.hr); editRecord(PRIYA, "role", "emp"); }),
  landing(() => { setSession(...SESS.emp); editRecord(ARJUN, "role", "hr"); }),
  landing(() => { setSession(...SESS.admin); editRecord(AARAV, "role", "fin"); }),
  landing(() => { setSession(...SESS.hr); editRecord(PRIYA, "delete"); }),
];
check("B6", "N3: redirectToLanding() goes to the record role's dashboard: Priya hr.html; Priya demoted employee.html; Arjun promoted hr.html; Aarav made Finance finance.html; deleted -> the login page",
  j(b6) === j(["../dashboard/hr.html", "../dashboard/employee.html", "../dashboard/hr.html", "../dashboard/finance.html", "../auth/login.html"]), j(b6));
globalThis.window = realWindow;

// =================================================================
section("C. The pages");
const OWN = { admin: "users/users-list", hr: "leave/leave-approvals", fin: "payroll/payroll-run", emp: "dashboard/employee" };
// The sidebar items the page's HTML carries before any script draws it.
const staticNav = (page) => [...new JSDOM(fs.readFileSync(`${DIR}/${page}.html`, "utf8")).window.document.querySelectorAll(".sidebar__nav .nav__item")].map(txt);
const c1 = [];
for (const [k, s] of Object.entries(SESS)) {
  for (const way of ["deleted", "inactive", "no id"]) {
    fresh();
    if (way === "no id") setSession(s[0], s[1]); else { setSession(...s); editRecord(s[2], way === "deleted" ? "delete" : "status", "inactive"); }
    await open(OWN[k]);
    c1.push([k, way, navigations.length, session() ? "kept" : "none", j(navItems()) === j(staticNav(OWN[k])), d.documentElement.dataset.role ?? null]);
  }
}
const c1ok = c1.every(([, , n, s, nav]) => n === 1 && s === "none" && nav);
check("C1", "O5's cases now signed out: each demo role's own page (users-list / leave-approvals / payroll-run / employee dashboard) with its record deleted, deactivated, or an old session with no id -> one navigation, the session gone, the sidebar not drawn (the HTML's own static one left) (12 loads)",
  c1ok && c1.length === 12, j(c1.filter(([, , n, s, nav]) => !(n === 1 && s === "none" && nav))));
const staticRole = (page) => /<html[^>]*data-role="(\w+)"/.exec(fs.readFileSync(`${DIR}/${page}.html`, "utf8"))?.[1] ?? null;
check("C2", "…and those pages keep their own static colour: <html data-role> is the HTML's value, not set from the session (app.js sets it only once the guard passes)",
  c1.every(([k, , , , , r]) => r === staticRole(OWN[k])), j(c1.map(([k, , , , , r]) => [k, r, staticRole(OWN[k])])));
// Demoted: Priya's HR session, her record Employee.
fresh(); setSession(...SESS.emp); await open("dashboard/employee"); const arjunNav = navItems();
fresh(); setSession(...SESS.hr); await open("dashboard/hr"); const priyaNav = navItems();
fresh(); setSession(...SESS.hr); editRecord(PRIYA, "role", "emp");
await open("leave/leave-approvals");
const c3a = [navigations.length, session() ? "kept" : "none"];
await open("dashboard/employee");
const c3b = { navs: navigations.length, nav: navItems(), role: d.documentElement.dataset.role };
check("C3", "N4 (a demotion): Priya's HR session with her record Employee is turned away from leave-approvals (403: one navigation, still signed in) and opens the Employee dashboard",
  j(c3a) === j([1, "kept"]) && c3b.navs === 0, j([c3a, c3b.navs]));
check("C4", "N5: there, the sidebar is exactly an Employee's (Arjun's), not HR's, and the page colour is Employee's (data-role emp)",
  j(c3b.nav) === j(arjunNav) && j(c3b.nav) !== j(priyaNav) && c3b.role === "emp", j([c3b.nav.length, arjunNav.length, priyaNav.length, c3b.role]));
await open("account/my-profile");
const c5 = [txt(d.querySelector(".profile__badges .badge--primary")), navigations.length];
check("C5", "N5: my-profile's role badge says the role on record, 'Employee' (was the session's 'HR Manager')", j(c5) === j(["Employee", 0]), j(c5));
// Promoted: Arjun's Employee session, his record HR.
// A row gets Approve / Reject only when pendingFor(id, role) lists it as this person's to decide (else "Waiting for …").
// Counted only once the script has drawn the table: the static HTML carries 6 sample rows with Approve buttons.
const staticBody = new JSDOM(fs.readFileSync(`${DIR}/leave/leave-approvals.html`, "utf8")).window.document.querySelector("table tbody").innerHTML;
const approves = () => (d.querySelector("table tbody").innerHTML === staticBody ? -1 : [...d.querySelectorAll("tbody button")].filter((b) => txt(b) === "Approve").length);
fresh(); setSession(...SESS.hr); await open("leave/leave-approvals"); const priyaRows = approves();
fresh(); setSession(...SESS.emp); editRecord(ARJUN, "role", "hr");
await open("leave/leave-approvals");
const c6 = { navs: navigations.length, nav: navItems(), role: d.documentElement.dataset.role, rows: approves(), session: session().roleKey };
check("C6", "N4 (a promotion): Arjun's Employee session with his record HR opens leave-approvals without signing in again; HR's sidebar and colour; the session itself still says emp",
  c6.navs === 0 && j(c6.nav) === j(priyaNav) && c6.role === "hr" && c6.session === "emp", j({ ...c6, nav: c6.nav.length, priya: priyaNav.length }));
check("C7", "…and the stores get his role on record, so he can decide what waits for HR: rows with Approve (leave-store's pendingFor refuses a role key that isn't the record's)",
  c6.rows > 0 && priyaRows > 0, j([c6.rows, priyaRows]));
// The login picker (N3): Priya demoted, then "HR Manager" picked.
fresh(); editRecord(PRIYA, "role", "emp");
await open("auth/login");
d.querySelector('[data-demo-role="hr"]').click();
const c8 = { navs: navigations.length, session: session(), role: role() };
// Round 13L (behavior; was "the session says hr, as it always did"): the picked role isn't kept at all now.
check("C8", "N3: on the sign-in page, picking 'HR Manager' while Priya's record is Employee signs her in (the session keeps no role, round 13L) and she is sent on (one navigation); her role is the record's, Employee",
  c8.navs === 1 && !!c8.session && !("roleKey" in c8.session) && c8.session?.employeeId === PRIYA && c8.role === "emp", j(c8));
stubWindow("auth/login.html"); G.redirectToLanding(); globalThis.window = w;
check("C9", "…and the landing it is sent to is the Employee dashboard (../dashboard/employee.html), not HR's", j(hrefs) === j(["../dashboard/employee.html"]), j(hrefs));
fresh(); setSession(...SESS.admin); editRecord(AARAV, "role", "fin");
await open("dashboard/finance");
const c10 = [navigations.length, d.documentElement.dataset.role, txt(d.querySelector(".avatar")), w.document.querySelector(".avatar")?.title];
check("C10", "N5 for an Admin made Finance: the Finance dashboard opens, Finance's colour; the avatar still shows the session's name (Aarav Mehta: names aren't part of N5)",
  j(c10) === j([0, "fin", "AM", "Aarav Mehta"]), j(c10));

// =================================================================
section("P. Pre-11P, side by side (js-pre11P = office-os 3a1eb42)");
const p1 = [];
for (const way of ["deleted", "inactive", "no id"]) {
  fresh();
  if (way === "no id") setSession("hr", "Priya Nair"); else { setSession(...SESS.hr); editRecord(PRIYA, way === "deleted" ? "delete" : "status", "inactive"); }
  await open("leave/leave-approvals", { js: "js-pre11P" });
  p1.push([way, navigations.length, session() ? "kept" : "none", navItems().length]);
}
check("P1", "pre-11P: Priya deleted, deactivated or with no id still opens leave-approvals with HR's full sidebar, still signed in (O5)",
  p1.every(([, n, s, nav]) => n === 0 && s === "kept" && nav === priyaNav.length - 1 /* Round Manager scoping part 2 (layout: the pre-11P sidebar has no Team leave, today's has) */), j(p1));
fresh(); setSession(...SESS.hr); editRecord(PRIYA, "role", "emp");
await open("leave/leave-approvals", { js: "js-pre11P" });
const p2 = [navigations.length, d.documentElement.dataset.role];
fresh(); setSession(...SESS.emp); editRecord(ARJUN, "role", "hr");
await open("leave/leave-approvals", { js: "js-pre11P" });
const p2b = navigations.length;
check("P2", "pre-11P: a demoted Priya still opens HR's leave-approvals in HR's colour; a promoted Arjun is turned away until he signs in again",
  j(p2) === j([0, "hr"]) && p2b === 1, j([p2, p2b]));
fresh(); setSession(...SESS.hr); editRecord(PRIYA, "role", "emp");
const p3 = A0.getCurrentRole()?.key;
check("P3", "pre-11P: getCurrentRole() was the session's role (hr), whatever the record says; and auth.js had no getCurrentUser", p3 === "hr" && !("getCurrentUser" in A0), j(p3));
check("E1", "no JS errors on any load", allJsErrors.length === 0, allJsErrors.slice(0, 5).join(" | "));

// =================================================================
section("X. Scope: exactly core/auth.js and core/guard.js");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
// Round 11R (layout; layout; was the live js: read from the frozen result js-pre11R = HEAD 86414a0, the live tree has 11R's permission overrides since (overrides.mjs X1))
const jsNow = walk(`${HERE}js-pre11R`).sort(), jsPre = walk(`${HERE}js-pre11P`).sort();
const jsChanged = jsNow.filter((f) => !jsPre.includes(f) || SRC("js-pre11R", f) !== SRC("js-pre11P", f));
check("X1", "js changed: exactly core/auth.js and core/guard.js; nothing added or removed (rbac.js, store.js and every page untouched)",
  j(jsChanged) === j(["core/auth.js", "core/guard.js"]) && j(jsNow) === j(jsPre), j(jsChanged));
// Round 11R (layout; layout; was the live pages and css: read from the frozen result html-pre11R / css-pre11R = HEAD 86414a0, the live tree has 11R's permission overrides since (overrides.mjs X1))
const pagesNow = walk(`${HERE}html-pre11R`).sort(), pagesPre = walk(`${HERE}html-pre11P`).sort();
const CSS = `${HERE}css-pre11R`;
const cssChanged = walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== (fs.existsSync(`${HERE}css-pre11P/${f}`) ? SRC("css-pre11P", f) : null));
check("X2", "no page and no css changed, added or removed",
  j(pagesNow) === j(pagesPre) && pagesNow.every((f) => SRC("html-pre11R", f) === SRC("html-pre11P", f)) && cssChanged.length === 0 && j(walk(CSS).sort()) === j(walk(`${HERE}css-pre11P`).sort()), j(cssChanged));
const crlf = (s) => !/[^\r]\n/.test(s);
check("X3", "both CRLF only, and still no final newline (as at HEAD)",
  ["core/auth.js", "core/guard.js"].every((f) => crlf(SRC("js", f)) && SRC("js", f).endsWith("\n") === SRC("js-pre11P", f).endsWith("\n") && !SRC("js", f).endsWith("\n")));
const lines = (s) => s.split("\r\n");
function delta(f) {
  // Round 11R (layout; layout; was the live js: read from the frozen result js-pre11R = HEAD 86414a0, the live tree has 11R's permission overrides since (overrides.mjs X1))
  const a = lines(SRC("js-pre11P", f)), b = lines(SRC("js-pre11R", f));
  const ca = new Map(); a.forEach((l) => ca.set(l, (ca.get(l) ?? 0) + 1));
  const cb = new Map(); b.forEach((l) => cb.set(l, (cb.get(l) ?? 0) + 1));
  let added = 0, removed = 0;
  new Set([...a, ...b]).forEach((l) => { const x = (cb.get(l) ?? 0) - (ca.get(l) ?? 0); if (x > 0) added += x; else removed -= x; });
  return [added, removed];
}
const dA = delta("core/auth.js"), dG = delta("core/guard.js");
check("X4", "line deltas: auth.js +17 -4 (the store import; getCurrentUser; getCurrentRole on it, with its comment); guard.js +12 -2 (the comment; the import; the not-on-record sign-out)",
  j(dA) === j([17, 4]) && j(dG) === j([12, 2]), j([dA, dG]));
const auth = SRC("js", "core/auth.js"), storeSrc = SRC("js", "data/store.js");
const callers = jsNow.filter((f) => f !== "core/rbac.js" && /\b(canAll|canAny|currentDataScope)\(/.test(SRC("js", f)));
check("X5", "no import cycle through auth.js: store.js still imports nothing from core/ but storage.js (never auth.js); auth.js imports store.js; nothing is kept in auth.js's module scope (no top-level let / var); canAll / canAny / currentDataScope still have no callers",
  !/core\/auth\.js|\.\/auth\.js|core\/guard/.test(storeSrc) && /import \{ getUser \} from "\.\.\/data\/store\.js";/.test(auth) && !/^(let|var) /m.test(auth) && callers.length === 0, j(callers));
const roleKeyReaders = (dir) => walk(`${HERE}${dir}`).filter((f) => /session\??\.roleKey/.test(SRC(dir, f))).sort();
// Round 13L (behavior; was "signIn still writes it"): it doesn't any more.
check("X6", "nothing in the js reads roleKey off the session any more (pre-11P: only auth.js's getCurrentRole did); signIn no longer writes it (round 13L)",
  j(roleKeyReaders("js")) === j([]) && j(roleKeyReaders("js-pre11P")) === j(["core/auth.js"]) && /save\(SESSION_KEY, \{ userLabel, employeeId, signedInAt: Date\.now\(\) \}\)/.test(auth), j(roleKeyReaders("js")));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
