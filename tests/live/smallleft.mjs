// usage: node smallleft.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round Small leftovers (JS stage), in jsdom with the js in ./js; css read only from the frozen copy, css-prelo:
//   N  every routed page has a name (13Z J-Z1): a sidebar item, one of nav.js's OTHER_PAGES, or a role's landing (the Dashboard item); each
//      OTHER_PAGES name is its page's own <title>, under a sidebar section or My account
//   Q  the topbar search finds those pages by name, for whoever can open them; the two that need a link parameter aren't offered alone
//   C  the renamed pages: Claim expense, Recruitment (and candidates' breadcrumb to it), Regularization, the sidebar's My requests
//   K  .table__check is gone: no css rule (frozen), no page's markup
//   M  "That isn't a month" (payroll-run, payslip-view): the asked month and 2026-09 each a kept-whole span, the words unchanged; the css rule
//   E99 no js errors
// The clock is local wall time (Mon 28 Sep 2026 10:00); storage is in memory, seeded when first read.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const read = (...p) => (fs.existsSync(path.join(...p)) ? fs.readFileSync(path.join(...p), "utf8") : "");
const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replaceAll("\\", "/")).sort() : []);
const CSS = path.join(HERE, "css-prelo");

const RealDate = Date;
const NOW = new RealDate(2026, 8, 28, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const SESS = { admin: ["admin", "Aarav Mehta", "EMP-1001"], hr: ["hr", "Priya Nair", "EMP-1003"], emp: ["emp", "Arjun Kapoor", "EMP-1105"] };
const fresh = (who) => { mem.clear(); mem.set("officeos:session", JSON.stringify({ roleKey: SESS[who][0], userLabel: SESS[who][1], employeeId: SESS[who][2], signedInAt: NOW })); };

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

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const $ = (id) => d.getElementById(id);
const titleOf = (html) => (/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "").replace(/\s*\|\s*OfficeOS$/, "").trim();

// =================================================================
section("N. Every routed page has a name");
const { ROUTES } = await import("./js/config/routes.js");
const nav = await import("./js/config/nav.js");
const { ROLES } = await import("./js/config/roles.js");
const OTHER = nav.OTHER_PAGES ?? [];
const inNav = new Set(nav.NAV.flatMap((g) => g.items.map((i) => i.href)));
const landings = new Set(Object.values(ROLES).map((r) => r.landing));
const named = (r) => inNav.has(r) || OTHER.some((p) => p.href === r) || landings.has(r);
const routes = Object.keys(ROUTES);
check("N1", `all ${routes.length} routed pages have a name: a sidebar item, an OTHER_PAGES entry, or a role's landing (the Dashboard item)`, routes.length === 48 /* Round Manager scoping part 2 (behaviour; was 47: team-leave.html, a sidebar item) */ && routes.every(named), j(routes.filter((r) => !named(r))));
check("N2", "OTHER_PAGES: the 12 routed pages the sidebar doesn't list, each once, none also in the sidebar or a landing", OTHER.length === 12 && new Set(OTHER.map((p) => p.href)).size === 12 && OTHER.every((p) => ROUTES[p.href] !== undefined && !inNav.has(p.href) && !landings.has(p.href)), j(OTHER.map((p) => p.href)));
const groups = new Set([...nav.NAV.map((g) => g.group), "My account"]);
const titles = OTHER.map((p) => [p.href, p.label, titleOf(read(DIR, p.href))]);
check("N3", "each name is its page's own <title>, under a sidebar section or My account", titles.every(([, l, t]) => l === t) && OTHER.every((p) => groups.has(p.group)), j(titles.filter(([, l, t]) => l !== t)));
check("N4", "the names as ruled: Add employee, Employee profile, Role, Candidates, Regularization, Apply for leave, Holidays, Payslip, My profile, Change password, Sessions, Notifications; user-profile needs an id, role-editor a role",
  j(OTHER.map((p) => [p.label, p.group, p.needs ?? ""])) === j([["Add employee", "People", ""], ["Employee profile", "People", "id"], ["Role", "People", "role"], ["Candidates", "People", ""], ["Regularization", "Attendance", ""], ["Apply for leave", "Leave", ""], ["Holidays", "Leave", ""], ["Payslip", "Payroll", ""], ["My profile", "My account", ""], ["Change password", "My account", ""], ["Sessions", "My account", ""], ["Notifications", "My account", ""]]), j(OTHER));

// =================================================================
section("Q. The topbar search finds them");
const search = (q) => { const i = d.querySelector(".topbar__search input"); i.value = q; i.dispatchEvent(new w.Event("input")); return [...d.querySelectorAll("#search-results [role=option]")].map((o) => [...o.children].map(txt).join(" / ") || txt(o)); };
fresh("emp"); await open("dashboard/employee");
const emp = Object.fromEntries(["holi", "apply", "payslip", "sessions", "my req", "regul", "add emp", "employee prof"].map((q) => [q, search(q)]));
check("Q1", "an Employee finds Holidays, Apply for leave, Payslip (after My payslips), Sessions and My requests, each with its section", j([emp.holi, emp.apply, emp.payslip, emp.sessions, emp["my req"]]) === j([["Holidays / Leave"], ["Apply for leave / Leave"], ["My payslips / Payroll", "Payslip / Payroll"], ["Sessions / My account"], ["My requests / Requests & expenses"]]), j(emp));
check("Q2", "an Employee doesn't find what they can't open (Regularization, Add employee), nor the profile page alone", [emp.regul, emp["add emp"], emp["employee prof"]].every((x) => j(x) === j(["No matches"])), j([emp.regul, emp["add emp"], emp["employee prof"]]));
fresh("hr"); await open("dashboard/hr");
const hr = Object.fromEntries(["regul", "add emp", "candid", "role"].map((q) => [q, search(q)]));
check("Q3", "HR finds Regularization, Add employee and Candidates; \"role\" finds Roles & permissions only if they may, never the bare Role page", j([hr.regul, hr["add emp"], hr.candid]) === j([["Regularization / Attendance"], ["Add employee / People"], ["Candidates / People"]]) && !hr.role.some((x) => x.startsWith("Role /")), j(hr));
fresh("admin"); await open("dashboard/admin");
const ad = Object.fromEntries(["role", "profile", "notif", "e"].map((q) => [q, search(q)]));
check("Q4", "Admin: \"role\" gives Roles & permissions, not Role; \"profile\" My profile; still at most 5 pages before people", j(ad.role) === j(["Roles & permissions / People"]) && j(ad.profile) === j(["My profile / My account"]) && j(ad.notif) === j(["Notifications / My account"]) && ad.e.filter((x) => !/^(Aarav|Ananya|Arjun|Kabir|Meera|Priya|Rohan|Sneha|Vikram|Ishaan)/.test(x)).length <= 5, j(ad));

// =================================================================
section("C. The renamed pages (each to the sidebar's wording)");
const names = () => [d.title, txt(d.querySelector(".topbar strong")), txt(d.querySelector('main .breadcrumb__item[aria-current="page"]')), txt(d.querySelector("main h1"))];
fresh("admin"); await open("requests/claim-expense");
check("C1", "claim-expense: <title>, topbar, breadcrumb and h1 say Claim expense, as the sidebar (was Claim an expense)", j(names()) === j(["Claim expense | OfficeOS", "Claim expense", "Claim expense", "Claim expense"]), j(names()));
await open("recruitment/job-openings");
check("C2", "job-openings: <title>, topbar and h1 say Recruitment, as the sidebar (was Job openings)", j(names()) === j(["Recruitment | OfficeOS", "Recruitment", "", "Recruitment"]), j(names()));
await open("recruitment/candidates");
const back = d.querySelector("main .breadcrumb__item a");
check("C3", "candidates: its breadcrumb goes back to Recruitment (job-openings.html)", txt(back) === "Recruitment" && back.getAttribute("href") === "job-openings.html", j([txt(back), back?.getAttribute("href")]));
await open("attendance/regularization");
check("C4", "regularization: the h1 says Regularization, as its <title>, topbar and breadcrumb (was Regularization requests)", j(names()) === j(["Regularization | OfficeOS", "Regularization", "Regularization", "Regularization"]), j(names()));
fresh("emp"); await open("requests/my-requests");
const item = [...d.querySelectorAll(".nav__item")].find((a) => a.getAttribute("href")?.endsWith("my-requests.html"));
check("C5", "my-requests: the sidebar says My requests, as the page's <title>, topbar and h1 (the sidebar's other own pages: My attendance, My leave, My payslips, My assets)", txt(item) === "My requests" && j(names().filter((x, i) => i !== 2)) === j(["My requests | OfficeOS", "My requests", "My requests"]), j([txt(item), names()]));

// =================================================================
section("K. .table__check is gone");
const cssFiles = walk(CSS).filter((f) => f.endsWith(".css"));
const HTML = path.join(HERE, "html-prelo");   // the frozen pages: pagefreeze.mjs F1 holds the live ones to them; only its named readers walk the live tree
const pages = walk(HTML).filter((f) => f.endsWith(".html"));
check("K1", `no css rule for it (frozen css, ${cssFiles.length} files), and the rule beside it kept`, cssFiles.length > 30 && cssFiles.every((f) => !read(CSS, f).includes("table__check")) && read(CSS, "components", "table.css").includes(".table__actions { text-align: right; white-space: nowrap; }"), j(cssFiles.filter((f) => read(CSS, f).includes("table__check"))));
check("K2", `no page's markup uses it (${pages.length} pages, frozen)`, pages.length > 40 && pages.every((f) => !read(HTML, f).includes("table__check")), j(pages.filter((f) => read(HTML, f).includes("table__check"))));

// =================================================================
section("M. \"That isn't a month\": each month kept whole");
const month = () => { const p = [...d.querySelectorAll("main .empty__text")].find((x) => !x.closest("[hidden]")); return p ? [txt(p), [...p.querySelectorAll(".empty__keep")].map(txt), p.children.length] : null; };
fresh("admin"); await open("payroll/payroll-run", "?month=abc");
const m1 = month();
check("M1", "payroll-run ?month=abc: the line as it was, with \"abc\" and 2026-09 as kept-whole spans", j(m1) === j(['The link asks for "abc". A month looks like 2026-09.', ['"abc"', "2026-09"], 2]), j(m1));
await open("payroll/payslip-view", "?month=2026-13");
const m2 = month();
check("M2", "payslip-view ?month=2026-13: the same", j(m2) === j(['The link asks for "2026-13". A month looks like 2026-09.', ['"2026-13"', "2026-09"], 2]), j(m2));
await open("payroll/payslip-view", "?month=2026-09");
check("M3", "payslip-view with a good month (2026-09): its payslip, no message, no span", month() === null && !d.querySelector(".empty__keep") && !$("payslip").hidden, j(month()));
const rule = /\.empty__keep \{ display: inline-block; overflow-wrap: anywhere; \}/.test(read(CSS, "components", "empty-state.css"));
check("M4", "the css (frozen): .empty__keep { display: inline-block; overflow-wrap: anywhere; } (whole when it fits, wraps only when longer than the line)", rule);

check("E99", "no js errors", allJsErrors.length === 0, j(allJsErrors.slice(0, 5)));
console.log(`\n${passed} passed, ${failed} failed`);
