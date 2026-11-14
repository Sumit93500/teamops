// usage: node financeperm.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round Manager scoping part 1 (JS stage), item 1, in jsdom with the js in ./js; the permission tables before the round from the frozen copy
// cfg-prems (office-os 49af1a4's config/):
//   P  the tables: dashboard:finance added to PERMISSIONS, held by Finance and Admin only; every role's other permissions, OVERRIDABLE and every
//      other route as they were; finance.html routed to dashboard:finance; every role still opens its landing
//   G  the guard (core/guard.js, a stand-in window): an Employee, HR, a manager who is an Employee (Sneha Rao) and Meera (on leave) are sent to the
//      403 page and stay signed in; Finance and Admin open it; a granted payroll:view doesn't open it, a denied one doesn't close it to Finance;
//      dashboard:finance can't be granted on a record
//   N  the sidebar and the search never offer it to an Employee, HR or Sneha; Finance's Dashboard item is still it; it draws for Finance and Admin; N4 the page's own gates (Finance with payroll:view and expenses:view denied)
//   E99 no js errors
// The clock is local wall time (Mon 28 Sep 2026 10:00); storage is in memory, seeded when first read.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const read = (...p) => (fs.existsSync(path.join(...p)) ? fs.readFileSync(path.join(...p), "utf8") : "");

const RealDate = Date;
const NOW = new RealDate(2026, 8, 28, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", MEERA = "EMP-1023", SNEHA = "EMP-1029", ARJUN = "EMP-1105";
const SESS = { admin: ["admin", "Aarav Mehta", AARAV], hr: ["hr", "Priya Nair", PRIYA], fin: ["fin", "Kabir Shah", KABIR], emp: ["emp", "Arjun Kapoor", ARJUN],
  sneha: ["emp", "Sneha Rao", SNEHA], meera: ["emp", "Meera Joshi", MEERA] };
const session = () => JSON.parse(mem.get("officeos:session") ?? "null");
const fresh = (who) => { mem.clear(); timers = []; if (who) mem.set("officeos:session", JSON.stringify({ roleKey: SESS[who][0], userLabel: SESS[who][1], employeeId: SESS[who][2], signedInAt: NOW })); };

let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, query = "") {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) allJsErrors.push(`${page}${query}: ${e.message}`); });
  const html = read(DIR, `${page}.html`);
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, getComputedStyle: w.getComputedStyle.bind(w) });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`./js/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); }
  }
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} timer: ${e.message}`); } });
}
// guard.js with a stand-in window: the page's path, and every href assigned (jsdom can't follow a navigation).
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
const FIN = "dashboard/finance.html";

const { PERMISSIONS, ALL_PERMISSIONS } = await import("./js/config/permissions.js");
const { ROLES, OVERRIDABLE } = await import("./js/config/roles.js");
const { ROUTES } = await import("./js/config/routes.js");
const pre = { perms: await import("./cfg-prems/permissions.js"), roles: await import("./cfg-prems/roles.js"), routes: await import("./cfg-prems/routes.js") };
const S = await import("./js/data/store.js");
const G = await import("./js/core/guard.js");
function editRecord(id, field, value) {
  S.getAllUsers();   // seed if empty
  const box = JSON.parse(mem.get("officeos:users"));
  box.records.find((u) => u.id === id)[field] = value;
  mem.set("officeos:users", JSON.stringify(box));
}

// =================================================================
section("P. The permission tables, before and after");
const L0_PERMS = ["offices:view", "offices:manage", "company:edit", "locations:set-own", "locations:review", "devices:view-own", "devices:reset", "payroll-rules:verify", "leave-policy:edit", "declarations:submit-own", "declarations:manage", "attendance:any-office"];   // L0: the seven moved into PERMISSIONS; P4: and the two rules ones; F1: attendance:any-office
check("P1", "PERMISSIONS: dashboard is [view, finance] (was [view]); every other module as it was; ALL_PERMISSIONS one longer, the new one dashboard:finance",
  j(PERMISSIONS.dashboard) === j(["view", "finance"]) && j(pre.perms.PERMISSIONS.dashboard) === j(["view"])
  && j(Object.entries(PERMISSIONS).filter(([m]) => m !== "dashboard" && !["offices", "company", "locations", "devices", "payroll-rules", "leave-policy", "declarations"].includes(m)).map(([m, a]) => [m, a.filter((x) => !L0_PERMS.includes(`${m}:${x}`))])) === j(Object.entries(pre.perms.PERMISSIONS).filter(([m]) => m !== "dashboard"))   // L0 (behaviour): without the four L0 modules; F1: attendance without any-office
  && j(ALL_PERMISSIONS.filter((p) => !pre.perms.ALL_PERMISSIONS.includes(p) && !L0_PERMS.includes(p))) === j(["dashboard:finance"]) && ALL_PERMISSIONS.length === pre.perms.ALL_PERMISSIONS.length + 1 + L0_PERMS.length,
  j({ dashboard: PERMISSIONS.dashboard, all: [pre.perms.ALL_PERMISSIONS.length, ALL_PERMISSIONS.length] }));
const delta = Object.fromEntries(Object.keys(ROLES).map((k) => [k, {
  added: ROLES[k].permissions.filter((p) => !pre.roles.ROLES[k].permissions.includes(p) && !L0_PERMS.includes(p)),   // L0 (behaviour): compared without the seven
  removed: pre.roles.ROLES[k].permissions.filter((p) => !ROLES[k].permissions.includes(p)),
  count: [pre.roles.ROLES[k].permissions.length, ROLES[k].permissions.length] }]));
console.log("      per role, before -> after:", j(delta));
check("P2", "per role: Admin and Finance gain dashboard:finance and nothing else; HR and Employee unchanged; nobody loses one",
  j(Object.keys(ROLES)) === j(["admin", "hr", "fin", "emp"])
  && j(delta.admin.added) === j(["dashboard:finance"]) && j(delta.fin.added) === j(["dashboard:finance"]) && !delta.hr.added.length && !delta.emp.added.length
  && Object.values(delta).every((x) => !x.removed.length), j(delta));
check("P3", "who holds dashboard:finance: Admin and Finance only; every role keeps dashboard:view (the Dashboard item, each one's own landing)",
  j(Object.keys(ROLES).filter((k) => ROLES[k].permissions.includes("dashboard:finance"))) === j(["admin", "fin"]) && Object.values(ROLES).every((r) => r.permissions.includes("dashboard:view")),
  j(Object.keys(ROLES).filter((k) => ROLES[k].permissions.includes("dashboard:finance"))));
check("P4", "OVERRIDABLE as it was, without dashboard:finance (no landing page's permission is), and the roles' landings, labels and data scopes as they were",
  j(OVERRIDABLE) === j(pre.roles.OVERRIDABLE) && !OVERRIDABLE.includes("dashboard:finance")
  && j(Object.values(ROLES).map((r) => [r.key, r.label, r.landing, r.dataScope])) === j(Object.values(pre.roles.ROLES).map((r) => [r.key, r.label, r.landing, r.dataScope])), "");
const routeDiff = Object.keys({ ...ROUTES, ...pre.routes.ROUTES }).filter((k) => ROUTES[k] !== pre.routes.ROUTES[k]).map((k) => [k, pre.routes.ROUTES[k], ROUTES[k]]);
check("P5", "ROUTES: only finance.html changed, dashboard:view -> dashboard:finance; employee.html still dashboard:view", j(routeDiff) === j([[FIN, "dashboard:view", "dashboard:finance"], ["leave/team-leave.html", null, "leave:approve"]]) /* Round Manager scoping part 2 (behaviour: a new page's route) */ && ROUTES["dashboard/employee.html"] === "dashboard:view", j(routeDiff));

// =================================================================
section("G. The guard: who opens dashboard/finance.html");
function guard(who, page = FIN, edit = null) { fresh(who); if (edit) editRecord(...edit); stubWindow(page); const ok = G.guardPage(); return { ok, hrefs: [...hrefs], session: session() ? "kept" : "none" }; }
const REFUSED = { ok: false, hrefs: ["../errors/403.html"], session: "kept" }, OPENS = { ok: true, hrefs: [], session: "kept" };
const g1 = Object.fromEntries(["emp", "hr", "sneha", "meera"].map((k) => [k, guard(k)]));
check("G1", "an Employee (Arjun), HR (Priya), a manager who is an Employee (Sneha Rao, two reports) and Meera (on leave): the 403 page, one navigation, still signed in",
  Object.values(g1).every((r) => j(r) === j(REFUSED)), j(g1));
const g2 = Object.fromEntries(["fin", "admin"].map((k) => [k, guard(k)]));
check("G2", "Finance (Kabir, his landing) and Admin (Aarav) open it", Object.values(g2).every((r) => j(r) === j(OPENS)), j(g2));
const g3 = { grantPayroll: guard("emp", FIN, [ARJUN, "grantPermissions", ["payroll:view"]]), grantFinance: guard("emp", FIN, [ARJUN, "grantPermissions", ["dashboard:finance"]]),
  finDenied: guard("fin", FIN, [KABIR, "denyPermissions", ["payroll:view", "expenses:view"]]), finDeniedNew: guard("fin", FIN, [KABIR, "denyPermissions", ["dashboard:finance"]]) };
check("G3", "on a record: a granted payroll:view doesn't open it, dashboard:finance can't be granted (not OVERRIDABLE), and Finance with payroll:view and expenses:view denied, or dashboard:finance 'denied', still lands on it",
  j(g3.grantPayroll) === j(REFUSED) && j(g3.grantFinance) === j(REFUSED) && j(g3.finDenied) === j(OPENS) && j(g3.finDeniedNew) === j(OPENS), j(g3));
const g4 = Object.fromEntries(Object.entries({ emp: "dashboard/employee.html", sneha: "dashboard/employee.html", hr: "dashboard/hr.html", fin: FIN, admin: "dashboard/admin.html" }).map(([k, p]) => [k, guard(k, p)]));
check("G4", "everyone still opens their own landing (Employee and Sneha the Employee dashboard, HR's, Finance's, Admin's)", Object.values(g4).every((r) => j(r) === j(OPENS)), j(g4));
const g5 = Object.fromEntries(["emp", "hr", "sneha", "fin", "admin"].map((k) => { fresh(k); stubWindow("dashboard/employee.html"); return [k, G.canOpenPage(FIN)]; }));
check("G5", "canOpenPage (what every link asks): false for Employee, HR and Sneha, true for Finance and Admin", j(g5) === j({ emp: false, hr: false, sneha: false, fin: true, admin: true }), j(g5));

// =================================================================
section("N. Nothing offers it to those who can't open it; it still draws for those who can");
const search = (q) => { const i = d.querySelector(".topbar__search input"); i.value = q; i.dispatchEvent(new w.Event("input")); return [...d.querySelectorAll("#search-results [role=option]")].map((o) => o.getAttribute("href") ?? o.querySelector("a")?.getAttribute("href") ?? txt(o)); };
const links = () => [...d.querySelectorAll(".sidebar a, nav a, .nav a, .rail a")].map((a) => a.getAttribute("href") ?? "");
const offered = {};
for (const [who, landing] of [["emp", "dashboard/employee"], ["sneha", "dashboard/employee"], ["hr", "dashboard/hr"]]) {
  fresh(who); await open(landing);
  const found = Object.fromEntries(["dash", "fin", "finance"].map((q) => [q, search(q)]));
  offered[who] = { sidebar: links().filter((h) => h.includes("finance.html")), search: Object.values(found).flat().filter((h) => String(h).includes("finance.html")), dashItem: links().filter((h) => /dashboard\//.test(h)), found };
}
console.log("      offered:", j(offered));
check("N1", "an Employee, Sneha and HR: no sidebar link and no search result to dashboard/finance.html (searched dash, fin, finance); their Dashboard item is their own landing",
  Object.values(offered).every((o) => !o.sidebar.length && !o.search.length) && offered.emp.dashItem.length > 0 && offered.emp.dashItem.every((h) => h.endsWith("employee.html")) && offered.hr.dashItem.every((h) => h.endsWith("hr.html")),
  j(Object.fromEntries(Object.entries(offered).map(([k, o]) => [k, [o.sidebar, o.search, o.dashItem]]))));
fresh("fin"); await open("dashboard/finance");
const finView = { dashItem: links().filter((h) => /dashboard\//.test(h)), payrollLabel: txt(d.querySelector('[data-stat="payroll"] .stat__label')), reimb: txt(d.querySelector('[data-stat="reimbursements"] .stat__value')) };
check("N2", "Finance: the Dashboard item is still the finance dashboard, and the page draws its payroll and expense stats (the stat label carries the run's month)",
  finView.dashItem.length > 0 && finView.dashItem.every((h) => h.endsWith("finance.html")) && /^Payroll, [A-Z][a-z]{2}$/.test(finView.payrollLabel) && finView.reimb !== "", j(finView));
fresh("admin"); await open("dashboard/finance");
const adView = { payrollLabel: txt(d.querySelector('[data-stat="payroll"] .stat__label')), dashItem: links().filter((h) => /dashboard\//.test(h)) };
check("N3", "Admin: the page draws for them too (their Dashboard item stays their own, admin.html)", /^Payroll, [A-Z][a-z]{2}$/.test(adView.payrollLabel) && adView.dashItem.every((h) => h.endsWith("admin.html")), j(adView));

// The page's own gates, for someone who opens it without payroll:view or expenses:view (they were checked on HR, Arjun and Sneha, who can't open
// it now: adjacent H1 H2, cleanup B8 B10, findash B6 B7 C8, payclock E4)
fresh("fin"); editRecord(KABIR, "denyPermissions", ["payroll:view", "expenses:view"]); await open("dashboard/finance");
const vis = (el) => Boolean(el) && !el.hidden && !el.closest("[hidden]");
const gated = (perm) => [...d.querySelectorAll(`main [data-permission="${perm}"]`)];
const n4 = { payrollParts: gated("payroll:view").length, payrollHidden: gated("payroll:view").every((e) => !vis(e)), expenses: gated("expenses:view").length, expensesHidden: gated("expenses:view").every((e) => !vis(e)),
  runRows: d.getElementById("fin-run-rows")?.children.length, bars: d.getElementById("fin-dept-bars")?.children.length, feed: d.getElementById("fin-activity")?.children.length,
  payroll: txt(d.querySelector('[data-stat="payroll"] .stat__value')), approvals: vis(d.getElementById("fin-approvals")) };
check("N4", "Finance with payroll:view and expenses:view denied on their record: still lands here, and the page's own gates hide every payroll part (6) and expense part (2), nothing drawn in them; Pending expense approvals still shows",
  n4.payroll === "—" && n4.payrollHidden && n4.expensesHidden && n4.payrollParts === 6 && n4.expenses === 2 && n4.runRows === 0 && n4.bars === 0 && n4.feed === 0 && n4.approvals, j(n4));

check("E99", "no js errors", allJsErrors.length === 0, j(allJsErrors.slice(0, 5)));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(0);
