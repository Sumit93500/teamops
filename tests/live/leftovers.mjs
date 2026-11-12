// usage: node leftovers.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 7C: four items left from 7A / 7B, with the js in ./js, in jsdom.
//   A  approval-workflows.html: a Payroll run row (Finance -> Admin, Not built); the stat and meta agree with the table;
//      the side note no longer claims an enforced rule
//   B  nav: no duplicate "Payslips" item; one "My payslips" link for every role; static sidebars relabelled;
//      payslips:view keeps its real uses
//   C  (a role change) Finance no longer holds pii:view; nothing else in any role changed
//   D  payroll:create: still defined and granted, reserved, used by nothing
//   E  source: only the expected files changed (against js-pre7C / html-pre7C, 7B's committed result)
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const JS = (p) => fs.readFileSync(new URL(`./js/${p}`, import.meta.url), "utf8");
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const WHO = {
  aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"],
  kabir: ["fin", "Kabir Shah", "EMP-1008"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"],
};

let loads = 0, w = null, d = null;
let jsErrors = [], navigations = [];
const allErrors = [];
// Opens a page as someone, running app.js and every page script its HTML loads (fresh storage each time).
async function open(page, who, query = "") {
  const html = read(page);
  const vc = new VirtualConsole();
  jsErrors = []; navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else { jsErrors.push(e.message); allErrors.push(`${page}/${who}: ${e.message}`); } });
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, Event: w.Event });
  loads++;
  const auth = await import("./js/core/auth.js");
  auth.signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  for (const [, script] of html.matchAll(/<script type="module" src="\.\.\/\.\.\/assets\/js\/pages\/([\w-]+)\.js"><\/script>/g)) {
    try { await import(`./js/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); allErrors.push(`${page}/${who} import: ${e.message}`); }
  }
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const staticDoc = (page) => new JSDOM(read(page)).window.document;

const { NAV } = await import("./js/config/nav.js");
const { ROUTES } = await import("./js/config/routes.js");
const { ROLES } = await import("./js/config/roles.js");
const { PERMISSIONS, ALL_PERMISSIONS } = await import("./js/config/permissions.js");
const PRE = await import("./js-pre7C/config/roles.js");
const PREP = await import("./js-pre7C/config/permissions.js");
// Round 11N (layout; the config as 11N found it, for C2 / D1: permissions.js gained users:delete since, and Admin holds every permission, so the live ROLES.admin grew too (roadnotes.mjs U1))
const P11N = await import("./js-pre11N/config/permissions.js"), R11N = (await import("./js-pre11N/config/roles.js")).ROLES;
const PS = await import("./js/data/payroll-store.js");

// =====================================================================
section("A. approval-workflows.html: the Payroll run row");
await open("access/approval-workflows.html", "aarav");
const rows = [...d.querySelectorAll("main table tbody tr")];
const name = (tr) => txt(tr.querySelector(".table__user-name"));
const badge = (tr) => tr.querySelector("td:nth-child(4) .badge");
check("A1", "9 rows, in order: Payroll run follows Salary revision; the other 8 as they were",
  j(rows.map(name)) === j(["Leave", "Attendance regularization", "Expense claim", "Purchase order", "Role change", "Salary revision", "Payroll run", "Asset request", "Backup restore"]),
  j(rows.map(name)));
const pay = rows.find((tr) => name(tr) === "Payroll run");
const chain = [...(pay?.querySelectorAll(".chain__step") ?? [])];
check("A2", "Payroll run: 'Monthly salaries'; chain Finance (start) -> Admin (end), the Salary revision shape",
  txt(pay?.querySelector(".table__user-sub")) === "Monthly salaries" && j(chain.map(txt)) === j(["Finance", "Admin"])
  && chain[0].classList.contains("chain__step--start") && chain[1].classList.contains("chain__step--end")
  && j(chain.map((s) => s.className)) === j([...rows.find((tr) => name(tr) === "Salary revision").querySelectorAll(".chain__step")].map((s) => s.className)),
  j(chain.map(txt)));
// Round 12Z (behavior; was "Not built", plain dot): the run is built (11T) and the page says so (salinbox.mjs W1)
check("A3", "Payroll run: condition 'The person who prepared it can't approve it'; status 'Active' (as the other built rows; 12Z)",
  txt(pay?.querySelector("td:nth-child(3)")) === "The person who prepared it can't approve it" && txt(badge(pay)) === "Active" && badge(pay).className === "badge badge--success badge--dot");
const edit = pay?.querySelector("td.table__actions button");
check("A4", "Payroll run: its Edit is the same workflows:manage placeholder as every row (hidden for nobody: Admin)",
  edit?.dataset.permission === "workflows:manage" && edit?.dataset.notImplemented === "Edit" && txt(edit) === "Edit");
const active = rows.filter((tr) => txt(badge(tr)) === "Active").map(name), notBuilt = rows.filter((tr) => txt(badge(tr)) === "Not built").map(name);
// Round 12Z (behavior; was 4 Active, 5 Not built): Salary revision and Payroll run built (salinbox.mjs W1)
check("A5", "statuses: 6 Active (the six built chains), 3 Not built; every row is one or the other",
  j(active) === j(["Leave", "Attendance regularization", "Expense claim", "Salary revision", "Payroll run", "Asset request"]) && j(notBuilt) === j(["Purchase order", "Role change", "Backup restore"])
  && active.length + notBuilt.length === rows.length, j([active, notBuilt]));
const wf = [...d.querySelectorAll(".stat")].find((s) => txt(s.querySelector(".stat__label")) === "Workflows");
// Round 12Z (behavior, label only; was "'4 active, 5 not built yet'"): the check is the agreement, which still holds (salinbox.mjs W3)
check("A6", "the Workflows stat agrees with the table: 9; '6 active, 3 not built yet' (12Z)",
  txt(wf.querySelector(".stat__value")) === String(rows.length) && txt(wf.querySelector(".stat__delta")) === `${active.length} active, ${notBuilt.length} not built yet`
  && txt(wf.querySelector(".stat__value")) === "9", txt(wf));
check("A7", "the card meta agrees too: '9 request types'",
  txt(d.querySelector("main table").closest(".card").querySelector(".card__meta")) === `${rows.length} request types`);
const alerts = [...d.querySelectorAll("main .alert")].map(txt);
// Round 12Z (behavior; was "...approving a run isn't built yet."): approving is built (11T; salinbox.mjs W2)
check("A8", "the side note says who approves a run (not its preparer: an Admin, on the run page); it no longer says the rule 'can't be turned off'",
  alerts.includes("The person who prepared a payroll run can't approve it: an Admin who didn't prepare it approves it on the run page.")
  && !/can't be turned off|separation of duties/.test(txt(d.querySelector("main"))), j(alerts));
const prep = { preparedBy: "EMP-1008" };
check("A9", "...and the run page's check is real: canApprove() refuses the preparer, allows anyone else",
  PS.canApprove(prep, "EMP-1008") === false && PS.canApprove(prep, "EMP-1001") === true);
const strip = [...d.querySelectorAll(".stat")].map((s) => [txt(s.querySelector(".stat__label")), txt(s.querySelector(".stat__value"))]);
check("A10", "the script's three stats still draw (a payroll row adds no requests); no page errors",
  /^\d+$/.test(strip[1][1]) && strip[2][1] !== null && /^\d+$/.test(strip[3][1]) && jsErrors.length === 0, j([strip, jsErrors]));
// Round 12Z (behavior; was "All four active workflows enforce both"): six are active now (salinbox.mjs W2)
check("A11", "'Rules for every workflow' says every active workflow enforces both rules (12Z: six active; a payroll run is never rejected)",
  /Every active workflow enforces both \(a payroll run is never rejected: it's approved, or prepared again\)/.test(txt(d.querySelector("main"))));

// =====================================================================
section("B. Nav: one link to your own payslips");
const items = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })));
check("B1", "nav.js: no 'Payslips' item; no two items share an href", !items.some((i) => i.label === "Payslips")
  && new Set(items.map((i) => i.href)).size === items.length, j(items.filter((i, k) => items.findIndex((x) => x.href === i.href) !== k).map((i) => i.label)));
const toList = items.filter((i) => i.href === "payroll/payslips.html");
check("B2", "the only item for payroll/payslips.html is 'My payslips' (Payroll, payslip:view-own)",
  j(toList.map((i) => [i.label, i.group, i.permission])) === j([["My payslips", "Payroll", "payslip:view-own"]]), j(toList));
const navLinks = () => [...d.querySelectorAll(".sidebar__nav a.nav__item")].filter((a) => /payroll\/payslips\.html$/.test(new URL(a.href).pathname)).map((a) => [txt(a), a.classList.contains("is-active")]);
const perRole = {};
for (const who of ["aarav", "kabir", "priya", "arjun"]) { await open("leave/holidays.html", who); perRole[who] = navLinks(); }
check("B3", "drawn sidebar, every role: exactly one link to payslips.html, 'My payslips'",
  Object.values(perRole).every((l) => j(l) === j([["My payslips", false]])), j(perRole));
await open("payroll/payslips.html", "kabir");
const activeItems = [...d.querySelectorAll(".sidebar__nav a.nav__item.is-active")].map(txt);
check("B4", "on payslips.html (Finance): one active item, 'My payslips' (before: two)", j(activeItems) === j(["My payslips"]), j(activeItems));
const FIVE = ["dashboard/finance.html", "finance/expenses.html", "finance/tax-deductions.html", "payroll/payroll-run.html", "payroll/salary-structure.html"];
const staticLink = (p) => [...staticDoc(p).querySelectorAll(".sidebar__nav a.nav__item")].filter((a) => a.getAttribute("href") === "../payroll/payslips.html").map((a) => [txt(a), a.dataset.permission]);
check("B5", "static sidebars of the five Finance pages: 'My payslips' on payslip:view-own (was 'Payslips' on payslips:view)",
  FIVE.every((p) => j(staticLink(p)) === j([["My payslips", "payslip:view-own"]])), j(FIVE.map(staticLink)));
const allPages = fs.readdirSync(DIR, { recursive: true }).filter((f) => f.endsWith(".html")).map((f) => f.replaceAll("\\", "/"));
const staticViews = allPages.filter((p) => [...staticDoc(p).querySelectorAll(".sidebar__nav [data-permission='payslips:view']")].length);
check("B6", "no page's static sidebar links on payslips:view any more", staticViews.length === 0, j(staticViews));
await open("payroll/payroll-run.html", "kabir");
const runLinks = [...d.querySelectorAll("#run-rows a")].filter((a) => a.dataset.permission === "payslips:view");
check("B7", "payslips:view keeps its real uses: the run's 'View payslip' links (shown to Finance)...",
  runLinks.length > 0 && runLinks.every((a) => !a.hidden && /payslip-view\.html\?employee=/.test(a.getAttribute("href"))), runLinks.length);
await open("payroll/payslip-view.html", "kabir", "?employee=EMP-1105");
check("B8", "...and opening someone else's payslip (Kabir -> Arjun's), whose way back is the payroll run",
  d.getElementById("payslip").hidden === false && txt(d.querySelector('[data-field="name"]')) === "Arjun Kapoor"
  && d.getElementById("payslip-crumb-parent").getAttribute("href") === "payroll-run.html");
const routesSrc = JS("config/routes.js");
check("B9", "routes.js: payslips.html still needs no single permission; its comment no longer claims data 'by scope'",
  ROUTES["payroll/payslips.html"] === null && !/shows different data by scope/.test(routesSrc) && /your own payslips only/.test(routesSrc));

// =====================================================================
section("C. (role change) Finance no longer holds pii:view");
check("C1", "roles.js: Finance doesn't hold pii:view; HR and Admin still do; Employee never did",
  !ROLES.fin.permissions.includes("pii:view") && ROLES.hr.permissions.includes("pii:view") && ROLES.admin.permissions.includes("pii:view") && !ROLES.emp.permissions.includes("pii:view"));
const without = (list, p) => list.filter((x) => x !== p && !L0_PERMS.includes(x));   // L0 (behaviour): the seven moved into PERMISSIONS are compared without
const L0_PERMS = ["offices:view", "offices:manage", "company:edit", "locations:set-own", "locations:review", "devices:view-own", "devices:reset"];   // L0: the seven moved into PERMISSIONS
check("C2", "the only change to any role: Finance's list is the old one minus pii:view, in order; HR, Admin, Employee identical",
  // Round Manager scoping part 1 (layout; Finance also holds dashboard:finance, financeperm.mjs P2: compared without it)
  j(without(ROLES.fin.permissions, "dashboard:finance")) === j(without(PRE.ROLES.fin.permissions, "pii:view")) && PRE.ROLES.fin.permissions.includes("pii:view")
  // Round 11N (layout; was the live roles: read as 11N found them (R11N))
  && ["hr", "admin", "emp"].every((r) => j(R11N[r]) === j(PRE.ROLES[r])) && j(Object.keys(ROLES)) === j(Object.keys(PRE.ROLES)));
const ticked = () => [...d.querySelectorAll("#matrix-rows .perm-tick")].filter((t) => t.querySelector(".matrix__yes")).map((t) => t.dataset.permissionKey);
const permMeta = () => txt(d.querySelector(".matrix")?.closest(".card")?.querySelector(".card__meta"));
await open("access/role-editor.html", "aarav", "?role=fin");
// Round 11N (behaviour; behaviour; was 77: users:delete (round 11N) is a 78th permission, so the page draws it)
// Round Manager scoping part 1 (behaviour; was 36 of 78: dashboard:finance, the 79th, held by Finance)
check("C3", "role editor, Finance: pii:view not ticked; '40 of 86' (L0: was 37 of 79)", !ticked().includes("pii:view") && permMeta() === "40 of 86", permMeta());
await open("access/role-editor.html", "aarav", "?role=hr");
// Round 11N (behaviour; behaviour; was 77: users:delete (round 11N) is a 78th permission, so the page draws it)
// Round Manager scoping part 1 (behaviour; was 45 of 78: dashboard:finance is a 79th permission)
check("C4", "role editor, HR: pii:view still ticked; '48 of 86' (L0: was 45 of 79)", ticked().includes("pii:view") && permMeta() === "48 of 86", permMeta());
const dd = (label) => [...d.querySelectorAll(".kv__row")].find((r) => txt(r.querySelector("dt")) === label)?.querySelector("dd");
const reveal = () => ["Bank account", "PAN"].map((l) => dd(l)?.querySelector("button")?.hidden);
await open("users/user-profile.html", "kabir", "?id=EMP-1105");
const finReveal = reveal(), finNav = navigations.length;
check("C5", "user-profile, Finance: the guard sends Finance away (no users:view), and even its page script now hides both Reveals",
  finNav > 0 && j(finReveal) === j([true, true]), j([finNav, finReveal]));
await open("users/user-profile.html", "priya", "?id=EMP-1105");
check("C6", "user-profile, HR: both Reveals shown, as before", navigations.length === 0 && j(reveal()) === j([false, false]), j(reveal()));
await open("payroll/payslip-view.html", "kabir", "?employee=EMP-1105");
const masked = [txt(d.querySelector('[data-field="bank"]')), txt(d.querySelector('[data-field="pan"]'))];
check("C7", "Finance still sees Arjun's payslip with bank / PAN masked (unchanged), and no Reveal",
  j(masked) === j(["•••• •••• 4821", "•••••3421F"]) && !d.querySelector("#payslip button"), j(masked));
check("C8", "the payslip's sentence stays true: 'HR and Admins can see them in full on the employee's profile'",
  /HR and Admins can see them in full on the employee's profile/.test(txt(d.querySelector("main"))));

// =====================================================================
section("D. payroll:create: kept, reserved, used by nothing");
check("D1", "permissions.js: the definition is unchanged (all 33 modules, 77 permissions, payroll view / create / approve / export)",
  // Round 11N (layout; was the live permissions.js: read as 11N found it (P11N))
  j(P11N.PERMISSIONS) === j(PREP.PERMISSIONS) && P11N.ALL_PERMISSIONS.length === 77 && j(P11N.PERMISSIONS.payroll) === j(["view", "create", "approve", "export"]));
check("D2", "payroll:create is still granted: Finance and Admin", ROLES.fin.permissions.includes("payroll:create") && ROLES.admin.permissions.includes("payroll:create"));
// Round 11T (behaviour; runs are stored and Prepare checks payroll:create on record since round 11T, so the comment says so)
check("D3", "permissions.js says what it's for and where it's checked (prepareRun, round 11T)", /create: prepare a run \(payroll-store\.js prepareRun checks it on record\)/.test(JS("config/permissions.js")));
const walk = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => /\.(js|html)$/.test(f)).map((f) => path.join(dir, f));
const users = [...walk(path.join(HERE, "js")).filter((f) => !/config[\\/](roles|permissions)\.js$/.test(f)), ...walk(DIR)].filter((f) => fs.readFileSync(f, "utf8").includes('"payroll:create"'));
// Round 11T (invariant; was used by nothing; round 11T's Prepare uses it in exactly one data function and one page (payruns.mjs X6))
check("D4", "used by exactly payroll-store.js (prepareProblem) and payroll-run.html's Prepare button, config aside (round 11T)", j(users.map((f) => path.relative(HERE, f).replaceAll("\\", "/").replace(/^.*pages\//, "pages/")).sort()) === j(["js/data/payroll-store.js", "pages/payroll/payroll-run.html"]), j(users));

// =====================================================================
section("E. Source: only the expected files changed");
const changed = (a, b) => walk(a).map((f) => path.relative(a, f).replaceAll("\\", "/")).filter((f) => !fs.existsSync(path.join(b, f)) || fs.readFileSync(path.join(a, f), "utf8") !== fs.readFileSync(path.join(b, f), "utf8")).sort();
const jsChanged = changed(path.join(HERE, "js-pre8B"), path.join(HERE, "js-pre7C"));   // js-pre8B: 7C's result (Round 8B changed data/attendance-store.js)
check("E1", "js: only config/nav.js, permissions.js, roles.js, routes.js; no file added or removed",
  j(jsChanged) === j(["config/nav.js", "config/permissions.js", "config/roles.js", "config/routes.js"]) && walk(path.join(HERE, "js-pre8B")).length === walk(path.join(HERE, "js-pre7C")).length, j(jsChanged));
const htmlChanged = changed(path.join(HERE, "html-pre8C"), path.join(HERE, "html-pre7C"));   // Round 8C (layout): 7C's result, not the live pages
check("E2", "pages: approval-workflows.html and the five Finance pages; no file added or removed",
  j(htmlChanged) === j(["access/approval-workflows.html", ...FIVE].sort()) && walk(path.join(HERE, "html-pre8C")).length === walk(path.join(HERE, "html-pre7C")).length, j(htmlChanged));

console.log(`\nerrors across all loads: ${allErrors.length ? j(allErrors) : "none"}`);
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
