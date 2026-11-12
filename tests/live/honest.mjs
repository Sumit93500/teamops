// usage: node honest.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 13Z (round-13v-scoping.md V6 A6 to A11; J1, J2, J3): the honest shell. The topbar's search and bell do what they look
// like, the Inbox's stat is the sidebar's number, finance.html's note is true, Admin's Add employee is a link, and the Users
// list has no checkboxes. ./js-pre13Z, ./html-pre13Z and ./css-pre13X are the code, pages and css before this round (office-os 6ee21bc).
//   G  before;  R  who sees what in the search (RBAC);  S  the search's behaviour;  B  the bell;  I  the Inbox's stat
//   F  finance's note;  A  Add employee;  U  the Users list;  C  css rules;  E  no page errors;  X  scope
// jsdom applies no stylesheet, so css is checked here as rules and in Edge by b-check13z.mjs.
// Fresh storage, Mon 9 Nov 2026 11:00.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const CSS = path.join(DIR, "..", "assets", "css");

const RealDate = Date;
const NOW = new RealDate(2026, 10, 9, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

let loads = 0, w = null, d = null, saved = {};
const allErrors = [];
async function open(target) {
  const page = target.split("?")[0];
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation|reload/i.test(e.message)) allErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(path.join(DIR, page), "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${target}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.confirm = () => true;
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, getComputedStyle: w.getComputedStyle.bind(w) });
  loads++;
  try { await import(`./js/app.js?load=${loads}`); } catch (e) { allErrors.push(`app.js on ${page}: ${e.message}`); }
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
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "");   // a missing file fails its check, on pristine, rather than crashing

fresh(); await open("auth/login.html");
const AU = await import("./js/core/auth.js");
const { NAV } = await import("./js/config/nav.js");
const { ROUTES } = await import("./js/config/routes.js");
const { ROLES, permissionsOf } = await import("./js/config/roles.js");
const { waitingCount } = await import("./js/ui/waiting.js");
const { getAllUsers, getUser } = await import("./js/data/store.js");

const WHO = { admin: ["admin", "Aarav Mehta", "EMP-1001"], hr: ["hr", "Priya Nair", "EMP-1003"], fin: ["fin", "Kabir Shah", "EMP-1008"], emp: ["emp", "Arjun Kapoor", "EMP-1105"], mgr: ["emp", "Sneha Rao", "EMP-1029"] };
const LANDING = { admin: "dashboard/admin.html", hr: "dashboard/hr.html", fin: "dashboard/finance.html", emp: "dashboard/employee.html", mgr: "dashboard/employee.html" };
async function as(who, page) { fresh(); await open("auth/login.html"); AU.signIn(...WHO[who]); await open(page); }
// A field on a person's stored record, then the page again: overrides and fixtures are read from the record.
async function withRecord(id, field, value, page) {
  getAllUsers();
  const box = JSON.parse(w.localStorage.getItem("officeos:users"));
  box.records.find((u) => u.id === id)[field] = value;
  w.localStorage.setItem("officeos:users", JSON.stringify(box));
  await open(page);
}
const missing = () => d.createElement("i");   // what a check reads when the element isn't there: it fails, rather than crashing the suite and dropping the rest from the total
const input = () => d.querySelector(".topbar__search input") ?? missing();
const list = () => d.getElementById("search-results") ?? missing();
const options = () => [...list().querySelectorAll("a")];
const option = (n) => options()[n] ?? missing();
const labelOf = (o) => txt(o.children[0]);
const type = (q) => { const i = input(); i.value = q; i.dispatchEvent(new w.Event("input", { bubbles: true })); return options(); };
const key = (k, opts = {}, target = input()) => { const e = new w.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...opts }); target.dispatchEvent(e); return e; };
const bare = (href) => (href ?? "").replace(/^(\.\.\/)+/, "");
const isPerson = (o) => /user-profile\.html\?id=/.test(o.getAttribute("href") ?? "");
// Every page the search will offer this person: each NAV label typed in full (so no cap hides one).
const offered = () => {
  const found = new Map();
  NAV.flatMap((g) => g.items).forEach((item) => type(item.label).filter((o) => !isPerson(o)).forEach((o) => found.set(labelOf(o), bare(o.getAttribute("href")))));
  type("");
  return found;
};
const hrefOf = (who, item) => (item.href === "@landing" ? LANDING[who] : item.href);

// =================================================================
section("G. Before (frozen): what this round changes");
const pre = (f) => read(path.join(HERE, "html-pre13Z", f));
const preAdmin = pre("dashboard/admin.html");
check("G1", "the bell was a placeholder with a permanent dot, and the box said 'Search people, modules'", preAdmin.includes('topbar__icon-btn--dot" type="button" aria-label="Notifications" data-not-implemented="Notifications"') && preAdmin.includes('placeholder="Search people, modules"'));
check("G2", "the Inbox's stat counted the rows shown, samples included", read(path.join(HERE, "js-pre13Z", "pages", "approvals-inbox.js")).includes("renderStats(counts.pending)"));
check("G3", "finance.html said payroll runs aren't stored", pre("dashboard/finance.html").includes("and payroll runs aren't stored, so no month's totals are kept.") && pre("dashboard/finance.html").includes('<span class="card__meta">No history yet</span>'));
check("G4", "Add employee on Admin's dashboard was a placeholder", preAdmin.includes('data-permission="users:create" data-not-implemented="Add employee"'));
check("G5", "the Users list had checkboxes wired to nothing", pre("users/users-list.html").includes('aria-label="Select all"') && read(path.join(HERE, "js-pre13Z", "pages", "users-list.js")).includes("Select ${user.name}"));

// =================================================================
section("R. Who sees what in the search: a role never sees a page or a person it can't open");
const EMP_PAGES = ["Dashboard", "My attendance", "Mark attendance", "My leave", "My payslips", "My requests", "Claim expense", "My assets", "Announcements"];   // Round Small leftovers (behaviour: the sidebar says My requests, smallleft.mjs C5)
for (const [n, who] of [["R1", "admin"], ["R2", "hr"], ["R3", "fin"], ["R4", "emp"], ["R5", "mgr"]]) {
  await as(who, LANDING[who]);
  const user = getUser(WHO[who][2]), perms = permissionsOf(user);
  // Round Manager scoping part 2 (behaviour; the guard's rule now also opens the team pages to a manager, and the sidebar lists them: Kabir (fin) and Sneha (mgr) have reports)
  const manages = ["fin", "mgr"].includes(who);
  const opens = (href) => !ROUTES[href] || perms.includes(ROUTES[href]) || (manages && ["attendance/team-attendance.html", "leave/team-leave.html"].includes(href));
  const seesInNav = (item) => perms.includes(item.permission) || (item.alsoForManagers && who === "mgr") || (item.alsoForReports && manages);
  const want = NAV.flatMap((g) => g.items).filter((item) => seesInNav(item) && opens(hrefOf(who, item))).map((item) => [item.label, hrefOf(who, item)]);
  const got = offered();
  check(n, `${ROLES[WHO[who][0]].label} (${WHO[who][1]}): exactly the pages they can open and the sidebar lists, each to its own page`, want.length > 0 && j([...got.entries()].sort()) === j(want.sort()), j([...got.keys()]));
  const opened = [...got.values()].filter((href) => !opens(href));
  check(`${n}b`, "...and every page offered passes the guard's own rule", got.size > 0 && opened.length === 0, j(opened));
}
await as("emp", LANDING.emp);
check("R6", "a plain Employee, exactly: their nine pages", j([...offered().keys()]) === j(EMP_PAGES), j([...offered().keys()]));
const NEVER = { emp: ["Users", "Payroll run", "Salary structure", "Settings", "Audit log", "Backup", "Approvals", "Roles & permissions", "Inventory", "Expenses", "Reports"], fin: ["Users", "Settings", "Audit log", "Backup", "Departments"], hr: ["Payroll run", "Salary structure", "Settings", "Backup", "Inventory"], mgr: ["Users", "Payroll run", "Settings", "Audit log", "Attendance"] };
for (const [n, who] of [["R7", "emp"], ["R8", "fin"], ["R9", "hr"], ["R10", "mgr"]]) {
  await as(who, LANDING[who]);
  const got = offered();
  const leak = NEVER[who].filter((l) => got.has(l));
  check(n, `${WHO[who][1]} is never offered: ${NEVER[who].join(", ")}`, got.size > 0 && leak.length === 0, j(leak));
}
await as("mgr", LANDING.mgr);
check("R11", "a manager (Sneha Rao, role Employee) is offered Approvals, as her sidebar shows it", offered().has("Approvals"));

const everyone = () => getAllUsers();
await as("hr", LANDING.hr);
const hrPeople = everyone().filter((u) => { const o = type(u.id); return o.length === 1 && isPerson(o[0]) && o[0].getAttribute("href") === `../users/user-profile.html?id=${encodeURIComponent(u.id)}` && labelOf(o[0]) === u.name; });
check("R12", "HR (users:view): every person, by id, to their profile, named", everyone().length > 0 && hrPeople.length === everyone().length, `${hrPeople.length} of ${everyone().length}`);
const priya = type("EMP-1042")[0];
check("R13", "...and what a person's result says: name and designation, no email or phone", txt(priya) === "Rohan GuptaSenior Software Engineer", txt(priya));
await as("admin", LANDING.admin);
const rohan = type("Rohan");
check("R14", "Admin too", rohan.length === 1 && labelOf(rohan[0]) === "Rohan Gupta" && isPerson(rohan[0]));
for (const [n, who] of [["R15", "fin"], ["R16", "emp"], ["R17", "mgr"]]) {
  await as(who, LANDING[who]);
  const leaked = everyone().flatMap((u) => [u.id, u.name]).filter((q) => type(q).some(isPerson));
  check(n, `${WHO[who][1]} (no users:view): no person, for anyone's name or id`, everyone().length > 0 && leaked.length === 0, j(leaked));
  check(`${n}b`, "...and the words 'No matches' for one", (type("EMP-1042"), txt(list())) === "No matches", txt(list()));
}
// A role without a permission (users:view and the like can't be overridden per person, so it's taken from the role's own list).
async function withoutPermission(role, permission, page, test) {
  const list = ROLES[role].permissions, i = list.indexOf(permission);
  list.splice(i, 1);
  await as(role, page);
  await test();
  list.splice(i, 0, permission);
}
await withoutPermission("hr", "users:view", LANDING.hr, () => check("R18", "HR's role without users:view: no people, and no Users page", !type("Rohan").some(isPerson) && !offered().has("Users")));
await as("hr", LANDING.hr);
await withRecord("EMP-1003", "denyPermissions", ["reports:view"], LANDING.hr);
check("R18b", "an override counts: HR denied reports:view isn't offered Reports", !offered().has("Reports"));
await as("emp", LANDING.emp);
await withRecord("EMP-1105", "grantPermissions", ["reports:view"], LANDING.emp);
check("R19", "an Employee granted reports:view: Reports is offered, and still no people", offered().has("Reports") && !type("Rohan").some(isPerson));
await withoutPermission("hr", "leave:approve", "account/my-profile.html", () => check("R20", "HR's role without leave:approve: the sidebar still has Dashboard (dashboard:view), but its route says no, so the search doesn't offer it", !offered().has("Dashboard") && !offered().has("Leave approvals") && [...d.querySelectorAll(".sidebar__nav a")].some((a) => txt(a) === "Dashboard"), j([...offered().keys()])));
// The routes, not the sidebar's permissions, are what the guard enforces: a route tightened alone.
const held = { reports: ROUTES["system/reports.html"], profile: ROUTES["users/user-profile.html"], inbox: ROUTES["requests/approvals-inbox.html"] };
ROUTES["system/reports.html"] = "backup:manage";
await as("hr", LANDING.hr);
check("R21", "a page's route tightened: gone from the search, though the sidebar still lists it", !offered().has("Reports") && [...d.querySelectorAll(".sidebar__nav a")].some((a) => txt(a) === "Reports"));
ROUTES["system/reports.html"] = held.reports;
ROUTES["users/user-profile.html"] = "backup:manage";
await as("hr", LANDING.hr);
check("R22", "the profile's route tightened: no people, though HR has users:view", !type("Rohan").some(isPerson));
ROUTES["users/user-profile.html"] = held.profile;
const searchSrc = read(path.join(HERE, "js", "ui", "search.js"));
check("R23", "nothing listed by hand: search.js names one page, the profile, and takes the rest from NAV and the guard's rule", (searchSrc.match(/\.html/g) ?? []).length === 1 && /from "..\/config\/nav\.js"/.test(searchSrc) && /canOpenPage/.test(searchSrc) && /can\("users:view"\)/.test(searchSrc));

// =================================================================
section("S. The search's behaviour");
await as("admin", "system/settings.html");
check("S1", "placeholder 'Search', its name 'Search', and the Ctrl K hint stays", input()?.placeholder === "Search" && input()?.getAttribute("aria-label") === "Search" && txt(d.querySelector(".topbar__search kbd")) === "Ctrl K");
check("S2", "aria: a combobox controlling a listbox, closed", input()?.getAttribute("role") === "combobox" && input()?.getAttribute("aria-autocomplete") === "list" && input()?.getAttribute("aria-controls") === "search-results" && input()?.getAttribute("aria-expanded") === "false" && list()?.getAttribute("role") === "listbox" && list()?.getAttribute("aria-label") === "Search results" && list()?.hidden === true);
check("S3", "the box is no longer a <label> around the list, and keeps its class", d.querySelector(".topbar__search")?.tagName === "DIV" && !d.querySelector("label.topbar__search") && !!d.querySelector(".topbar__search #search-results"));
let o = type("payroll");
check("S4", "typing lists matches, case aside, each an option; first active, and named for a screen reader", o.map(labelOf).join() === "Payroll run" && o.every((x) => x.getAttribute("role") === "option") && list().hidden === false && input().getAttribute("aria-expanded") === "true" && o[0].classList.contains("is-active") && o[0].getAttribute("aria-selected") === "true" && input().getAttribute("aria-activedescendant") === o[0].id, j(o.map(labelOf)));
check("S5", "links resolve from where you are (two folders down)", o[0]?.getAttribute("href") === "../payroll/payroll-run.html" && txt(o[0]?.children[1]) === "Payroll");   // Round 14C: its section
await open("auth/login.html"); AU.signIn(...WHO.admin); await open("requests/approvals-inbox.html");
check("S6", "...and the landing page: Dashboard is the role's own", type("Dashboard")[0]?.getAttribute("href") === "../dashboard/admin.html");
await open("system/settings.html");
type("zzzq");
check("S7", "no match: 'No matches', a disabled option, no link, nothing active", txt(list()) === "No matches" && options().length === 0 && list().querySelector('[role="option"]')?.getAttribute("aria-disabled") === "true" && list().hidden === false && !input().hasAttribute("aria-activedescendant"));
check("S8", "Enter with no matches does nothing", key("Enter").defaultPrevented && list().hidden === false);
type("   ");
check("S9", "blank: the list closes", list().hidden === true && input().getAttribute("aria-expanded") === "false");
type("(");
check("S10", "regex characters are just characters", txt(list()) === "No matches");
const cap = type("a");
check("S11", "capped: at most 5 pages and 5 people, pages first; typing narrows", cap.filter((x) => !isPerson(x)).length === 5 && cap.filter(isPerson).length === 5 && cap.slice(0, 5).every((x) => !isPerson(x)), `${cap.length}`);
o = type("attendance");
check("S12", "matches names only, not their group: 'attendance' is the three attendance pages", o.map(labelOf).join() === "My attendance,Mark attendance,Team attendance", j(o.map(labelOf)));   // Round 14C: J-C2's rename
type("operations");
check("S12b", "...and a group's name alone finds nothing", txt(list()) === "No matches", txt(list()));
o = type("attendance");
const down = key("ArrowDown");
check("S13", "Down moves the active result; aria follows", down.defaultPrevented && option(1).classList.contains("is-active") && option(1).getAttribute("aria-selected") === "true" && option(0).getAttribute("aria-selected") === "false" && !option(0).classList.contains("is-active") && input().getAttribute("aria-activedescendant") === option(1).id);
key("ArrowDown"); key("ArrowDown");
check("S14", "Down wraps to the first", option(0).classList.contains("is-active") && d.querySelectorAll("#search-results a.is-active").length === 1);
key("ArrowUp");
check("S15", "Up wraps to the last", option(2).classList.contains("is-active"));
let followed = null;
d.addEventListener("click", (e) => { const a = e.target.closest?.("#search-results a"); if (a) { followed = a.getAttribute("href"); e.preventDefault(); } });
const enter = key("Enter");
check("S16", "Enter opens the active result", enter.defaultPrevented && followed === "../attendance/team-attendance.html", followed);
input().focus();
const esc = key("Escape");
check("S17", "Esc closes the list, keeps what's typed and the focus, and stops the box clearing itself", esc.defaultPrevented && list().hidden === true && input().value === "attendance" && input().getAttribute("aria-expanded") === "false" && !input().hasAttribute("aria-activedescendant") && d.activeElement === input());
check("S18", "a second Esc is left to the browser", !key("Escape").defaultPrevented);
key("ArrowDown");
check("S19", "Down opens it again", list().hidden === false && options().length === 3);
input().blur();
check("S20", "leaving the box closes it", list().hidden === true);
input().focus(); type("attendance");
const press = new w.MouseEvent("mousedown", { bubbles: true, cancelable: true });
option(0).dispatchEvent(press);
check("S21", "pressing on a result keeps focus in the box, so the click lands", press.defaultPrevented);
input().blur();
(d.querySelector(".topbar__search svg") ?? missing()).dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
check("S22", "clicking the box's icon focuses it, as the label did", d.activeElement === input());
input().blur();
const ctrl = key("k", { ctrlKey: true }, d.body);
check("S23", "Ctrl+K focuses the box, and the browser's own Ctrl+K is stopped", ctrl.defaultPrevented && d.activeElement === input());
input().blur();
const cmd = key("K", { metaKey: true }, d.body);
check("S24", "Cmd+K too, and a capital", cmd.defaultPrevented && d.activeElement === input());
input().blur();
const plain = key("k", {}, d.body), shifted = key("k", { ctrlKey: true, shiftKey: true }, d.body);
check("S25", "plain K and Ctrl+Shift+K are left alone", !plain.defaultPrevented && !shifted.defaultPrevented && d.activeElement !== input());
(d.querySelector(".topbar__search") ?? missing()).style.display = "none";
const hidden = key("k", { ctrlKey: true }, d.body);
check("S26", "with the box hidden (820 px and under) Ctrl+K opens it across the topbar", hidden.defaultPrevented && d.activeElement === input() && !!d.querySelector(".topbar.is-searching"));   // Round 14H (J-H6; was: left to the browser): findsort.mjs B13, B14
key("Escape", {}, input());   // Round 14H: shuts it again, focus to the icon
(d.querySelector(".topbar__search") ?? missing()).style.display = "";
const modal = d.createElement("div"); modal.className = "modal is-open"; d.body.append(modal);
const under = key("k", { ctrlKey: true }, d.body);
check("S27", "with a dialog open, focus doesn't go behind it", !under.defaultPrevented && d.activeElement !== input());
modal.remove();
await as("admin", LANDING.admin);
await withRecord("EMP-1042", "name", '<img src=x onerror="window.hacked=1">Zed Tester', "system/settings.html");
o = type("zed");
check("S28", "a name with markup in it is text", o.length === 1 && !list().querySelector("img") && labelOf(o[0]) === '<img src=x onerror="window.hacked=1">Zed Tester', list()?.innerHTML.slice(0, 120));
await as("admin", LANDING.admin);
await withRecord("EMP-1042", "status", "inactive", "system/settings.html");
check("S29", "an inactive person is still found, as the Users list has them and their profile opens", type("Rohan").some(isPerson));
await open("auth/login.html");
check("S30", "a page with no topbar: nothing drawn, no error", !d.querySelector(".topbar__search") && !d.getElementById("search-results"));

// =================================================================
section("B. The bell");
const bell = () => d.querySelector(".topbar__icon-btn--dot");
const navCount = () => Number(txt(d.querySelector(".nav__item[data-count-waiting] .nav__count")) || 0);
const toasts = () => [...d.querySelectorAll(".toast-container .toast__text")].map(txt);
const click = (n) => { const e = new w.MouseEvent("click", { bubbles: true, cancelable: true }); n?.dispatchEvent(e); return e; };
const SOME = { admin: true, hr: true, fin: true, emp: false, mgr: true };
for (const [n, who] of [["B1", "admin"], ["B2", "hr"], ["B3", "fin"], ["B4", "emp"], ["B5", "mgr"]]) {
  await as(who, "account/my-profile.html");
  const count = waitingCount(WHO[who][2], WHO[who][0]);
  const label = `Waiting for you: ${count}`;
  // Round 14G (ruling 7; was a link to the Inbox): a button that opens the list of what waits (See all goes to the Inbox: B7, cardbell.mjs E3)
  check(n, `${WHO[who][1]}: a button that opens the list of what waits, labelled '${label}'; the dot ${SOME[who] ? "on" : "off"}`, bell()?.tagName === "BUTTON" && bell().getAttribute("aria-haspopup") === "dialog" && bell().getAttribute("aria-expanded") === "false" && !bell().hasAttribute("href") && bell().getAttribute("aria-label") === label && bell().title === label && bell().hasAttribute("data-waiting") === SOME[who] && (count > 0) === SOME[who], `${bell()?.tagName} ${bell()?.getAttribute("aria-label")} dot ${bell()?.hasAttribute("data-waiting")}`);
  check(`${n}b`, "...the sidebar's number, where the sidebar has one", who === "emp" ? !d.querySelector(".nav__item[data-count-waiting]") : navCount() === count, `nav ${navCount()} waitingCount ${count}`);
}
await as("emp", "account/my-profile.html");
check("B6", "the placeholder is gone: no 'Notifications' button, no toast on a click", !d.querySelector('.topbar [aria-label="Notifications"]') && !bell()?.hasAttribute("data-not-implemented") && (click(bell()), toasts().length === 0) && !!bell()?.querySelector("svg"));
await as("hr", "dashboard/hr.html");
// Round 14G (ruling 7; was the bell's own link): the list's See all resolves from this page too, and the icon comes with the bell
click(bell()); for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r));
check("B7", "the list's See all resolves to the Inbox from another page too, and the icon comes with the bell", d.querySelector("#bell-panel .bell-panel__footer a")?.href === "http://localhost/office-os/pages/requests/approvals-inbox.html" && !!bell()?.querySelector("svg path"));
ROUTES["requests/approvals-inbox.html"] = "approvals:view";
await as("emp", "account/my-profile.html");
check("B8", "someone who can't open the Inbox: it stays the honest placeholder, with no dot and no link", bell()?.tagName === "BUTTON" && bell().getAttribute("aria-label") === "Notifications" && !bell().hasAttribute("data-waiting") && !d.querySelector(".topbar a.topbar__icon-btn--dot"));
click(bell());
check("B9", "...and says so when pressed", toasts().join() === "Notifications isn't available in this demo.", j(toasts()));
ROUTES["requests/approvals-inbox.html"] = held.inbox;
// Moving: a decision brings the bell down with the sidebar and the stat.
const stat = (label) => txt([...d.querySelectorAll(".stat")].find((s) => txt(s.querySelector(".stat__label")) === label)?.querySelector(".stat__value"));
await as("hr", "requests/approvals-inbox.html");
const before = waitingCount(WHO.hr[2], "hr");
const approve = [...d.querySelectorAll("#inbox-table tbody tr:not([data-static]) button")].find((b) => txt(b) === "Approve");
approve?.click();
const after = waitingCount(WHO.hr[2], "hr");
check("B10", "Approve on the Inbox: the bell, the sidebar and the stat all drop by one, without a reload", after === before - 1 && bell()?.getAttribute("aria-label") === `Waiting for you: ${after}` && navCount() === after && stat("Waiting for you") === String(after), `${before} -> ${after}; ${bell()?.getAttribute("aria-label")}, nav ${navCount()}, stat ${stat("Waiting for you")}`);
// The last one going takes the dot with it.
await as("mgr", "requests/approvals-inbox.html");
const nextApprove = () => [...d.querySelectorAll("#inbox-table tbody tr:not([data-static]) button")].find((b) => txt(b) === "Approve");
let guard = 20;
while (guard-- && waitingCount(WHO.mgr[2], "emp") > 1 && nextApprove()) nextApprove().click();
check("B10b", "with exactly one waiting: the dot still shows", waitingCount(WHO.mgr[2], "emp") === 1 && bell()?.getAttribute("aria-label") === "Waiting for you: 1" && bell().hasAttribute("data-waiting"), `${bell()?.getAttribute("aria-label")} dot ${bell()?.hasAttribute("data-waiting")}`);
nextApprove()?.click();
check("B11", "the last decision takes the dot away", waitingCount(WHO.mgr[2], "emp") === 0 && bell()?.getAttribute("aria-label") === "Waiting for you: 0" && !bell().hasAttribute("data-waiting") && !d.querySelector(".nav__item[data-count-waiting] .nav__count"), `${bell()?.getAttribute("aria-label")} dot ${bell()?.hasAttribute("data-waiting")}`);
const topbarSrc = read(path.join(HERE, "js", "ui", "topbar.js"));
check("B12", "it counts with ui/waiting.js's function; it has no rule of its own", /import \{ waitingCount \} from "\.\/waiting\.js"/.test(topbarSrc) && !/pendingFor|pendingRegularizations|salaryProposals/.test(topbarSrc));

// =================================================================
section("I. The Inbox's 'Waiting for you' is the sidebar's number");
const realRows = () => d.querySelectorAll("#inbox-table tbody tr:not([data-static])").length;
const samples = () => d.querySelectorAll("#inbox-table tbody tr[data-static]").length;
const pendingBadge = () => txt(d.querySelector(".tabs__tab .badge--count"));
for (const [n, who, samplesShown] of [["I1", "admin", 3], ["I2", "hr", 3], ["I3", "fin", 3], ["I4", "mgr", 0]]) {
  await as(who, "requests/approvals-inbox.html");
  const count = waitingCount(WHO[who][2], WHO[who][0]);
  check(n, `${WHO[who][1]}: stat == sidebar == bell == the real rows, samples aside`, count > 0 && stat("Waiting for you") === String(count) && navCount() === count && realRows() === count && samples() === samplesShown && bell()?.getAttribute("aria-label") === `Waiting for you: ${count}`, `stat ${stat("Waiting for you")} nav ${navCount()} real ${realRows()} samples ${samples()}`);
  check(`${n}b`, "...and the Pending tab still counts the rows it shows", pendingBadge() === String(count + samplesShown), pendingBadge());
}
await as("emp", "requests/approvals-inbox.html");
check("I5", "a plain Employee: 0, nothing shown, no samples", stat("Waiting for you") === "0" && txt(d.querySelector("#inbox-table tbody")) === "Nothing is waiting for you." && samples() === 0 && pendingBadge() === "0", `${stat("Waiting for you")} / ${pendingBadge()}`);
await as("admin", "requests/approvals-inbox.html");
const sel = d.querySelector('select[aria-label="Filter by type"]');
const statBefore = stat("Waiting for you");
sel.value = "leave"; sel.dispatchEvent(new w.Event("change"));
check("I6", "the type filter doesn't move it", stat("Waiting for you") === statBefore);
const inboxSrc = read(path.join(HERE, "js", "pages", "approvals-inbox.js"));
check("I7", "one function: the stat calls waitingCount, as the sidebar does", /setStat\("Waiting for you", String\(waitingCount\(userId, role\)\)\)/.test(inboxSrc) && /waitingCount\(getCurrentUserId\(\), getCurrentRole\(\)\?\.key\)/.test(read(path.join(HERE, "js", "ui", "sidebar.js"))));

// =================================================================
section("F. finance.html's note");
await as("fin", "dashboard/finance.html");
const note = [...d.querySelectorAll("main .card")].find((c) => txt(c.querySelector(".card__title")) === "Monthly payroll cost");
check("F1", "it says what's true, in these words", txt(note?.querySelector(".card__body")) === "Approved payroll runs are saved with their figures, but this card doesn't chart them yet. A month with no approved run is worked out live from the attendance and leave records.", txt(note?.querySelector(".card__body")));
check("F2", "the old claim is gone, and the old corner; still no chart", !/aren't stored|no month's totals are kept|No history yet/.test(d.body.textContent) && !note?.querySelector(".chart"));
check("F3", "the card's corner says 'Not charted yet', in these words", txt(note?.querySelector(".card__meta")) === "Not charted yet", txt(note?.querySelector(".card__meta")));
const storeSrc = read(path.join(HERE, "js", "data", "payroll-store.js"));
check("F4", "the note's claim holds: an approved run is saved, and a payslip reads its fixed figures", /Once a month's run is approved,\r?\n\/\/ its payslips are the figures it fixed/.test(storeSrc) && /export function approveRun\(/.test(storeSrc));

// =================================================================
section("A. Add employee on Admin's dashboard");
const addBtn = () => [...d.querySelectorAll(".page-header__actions .btn--primary")].find((b) => txt(b) === "Add employee");
await as("admin", "dashboard/admin.html");
check("A1", "Admin: a link to the real form", addBtn()?.tagName === "A" && addBtn().getAttribute("href") === "../users/user-form.html" && addBtn().href === "http://localhost/office-os/pages/users/user-form.html" && addBtn().hidden === false && !!addBtn().querySelector("svg"));
check("A2", "no placeholder: no toast, no type attribute left over", !addBtn()?.hasAttribute("data-not-implemented") && !addBtn()?.hasAttribute("type") && (click(addBtn()), toasts().length === 0));
check("A3", "it needs users:create, the form's own route", addBtn()?.dataset.permission === "users:create" && ROUTES["users/user-form.html"] === "users:create");
await as("hr", "dashboard/admin.html");
check("A4", "HR opens this page and has users:create: it's there", addBtn()?.hidden === false);
await withoutPermission("hr", "users:create", "dashboard/admin.html", () => check("A5", "HR's role without users:create: hidden", addBtn()?.hidden === true));

// =================================================================
section("U. The Users list: no checkboxes");
await as("admin", "users/users-list.html");
const heads = [...d.querySelectorAll(".table thead th")].map(txt);
const rows = () => [...d.querySelectorAll(".table tbody tr")];
check("U1", "no checkbox anywhere in the table, drawn or static", !d.querySelector(".table input[type=checkbox]") && !d.querySelector(".table .table__check"));
check("U2", "the head has seven columns", j(heads) === j(["Employee", "ID", "Designation", "Department", "Role", "Status", "Actions"]), j(heads));
check("U3", "each row lines up with the head", rows().length > 0 && rows().every((r) => r.children.length === 7 && /^EMP-/.test(txt(r.children[1])) && r.children[6].classList.contains("table__actions")), rows()[0]?.children.length);
const search = d.querySelector('.table__toolbar input[type="search"], .table__search input, input[type="search"]:not(.topbar__search input)') ?? missing();
search.value = "zzzq"; search.dispatchEvent(new w.Event("input", { bubbles: true }));
check("U4", "the empty row spans the seven", rows().length === 1 && rows()[0].children[0].colSpan === 7 && txt(rows()[0]) === "No employees match these filters.", rows()[0]?.children[0]?.colSpan);
const staticDoc = new JSDOM(fs.readFileSync(path.join(DIR, "users", "users-list.html"), "utf8")).window.document;
check("U5", "the page's own static rows line up too (what shows before the js runs)", [...staticDoc.querySelectorAll(".table tbody tr")].length === 7 && [...staticDoc.querySelectorAll(".table tbody tr")].every((r) => r.children.length === 7));
check("U5b", "and nothing of them is left in the page's code", !/checkbox|table__check|checkCell/.test(read(path.join(HERE, "js", "pages", "users-list.js"))));
await as("admin", "users/users-list.html");
check("U6", "the first row's first cell is the person, with their link", !!rows()[0]?.children[0]?.querySelector("a.table__user-name"));

// =================================================================
section("C. css rules (ui/search.js and the bell, in layout/shell.css)");
const shell = read(path.join(CSS, "layout", "shell.css")).replace(/\r\n/g, "\n");
check("C1", "the dot only shows with data-waiting: no bare ::after on the bell", /\.topbar__icon-btn--dot\[data-waiting\]::after \{/.test(shell) && !/\.topbar__icon-btn--dot::after/.test(shell));
check("C2", "the box holds its list: position relative, and a list that isn't [hidden] shows", /\.topbar__search \{\n  position: relative;/.test(shell) && /\.topbar__search \.dropdown__menu:not\(\[hidden\]\) \{ display: block;/.test(shell));
check("C3", "the active result can be seen, whichever theme", /\.topbar__search \.dropdown__item\.is-active \{ background: var\(--color-surface-hover\); \}/.test(shell));
check("C4", "the box is still hidden below 820 px, as today", /\.topbar__search \{ display: none; \}/.test(read(path.join(CSS, "layout", "responsive.css"))));

// =================================================================
section("E. No page errors");
check("E1", "no page errors in any load", allErrors.length === 0, j(allErrors));

// =================================================================
section("X. Scope");
const walk = (dir) => fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile())
  .map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replace(/\\/g, "/")).sort();
const changedIn = (now, then) => { const a = walk(now), b = walk(then); return { changed: a.filter((f) => b.includes(f) && fs.readFileSync(path.join(now, f), "latin1") !== fs.readFileSync(path.join(then, f), "latin1")), added: a.filter((f) => !b.includes(f)), removed: b.filter((f) => !a.includes(f)) }; };
const js = changedIn(path.join(HERE, "js-pre14A"), path.join(HERE, "js-pre13Z"));   // Round 14A (layout, X1, X4; was the live js): 9c7423e's, frozen
check("X1", "js: exactly these changed; ui/search.js added", j(js) === j({ changed: ["app.js", "core/guard.js", "pages/approvals-inbox.js", "pages/users-list.js", "ui/sidebar.js", "ui/topbar.js", "ui/waiting.js"], added: ["ui/search.js"], removed: [] }), j(js));
const cssNow = changedIn(path.join(HERE, "css-pre13Z"), path.join(HERE, "css-pre13X"));   // Round 14A (layout, X2, X4; was the live css): 13Z's; the live css: cssguard.mjs
check("X2", "css: exactly layout/shell.css changed", j(cssNow) === j({ changed: ["layout/shell.css"], added: [], removed: [] }), j(cssNow));
const pages = changedIn(path.join(HERE, "html-pre14A"), path.join(HERE, "html-pre13Z"));   // Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs
check("X3", "pages: exactly admin, finance and users-list changed; nothing added or removed", j(pages) === j({ changed: ["dashboard/admin.html", "dashboard/finance.html", "users/users-list.html"], added: [], removed: [] }), j(pages));
const crlf = (s) => !/[^\r]\n/.test(s) && !s.endsWith("\n");
check("X4", "every changed file CRLF with no final newline", [...js.changed, ...js.added].every((f) => crlf(read(path.join(HERE, "js-pre14A", f)))) && cssNow.changed.every((f) => crlf(read(path.join(HERE, "css-pre13Z", f)))) && pages.changed.every((f) => crlf(read(path.join(HERE, "html-pre14A", f)))));
const page = (f) => read(path.join(HERE, "html-pre14A", f));   // X5-X7: Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs
const FINANCE_OLD = "There are no past months to chart yet. Pay is worked out live from the attendance and leave records, and payroll runs aren't stored, so no month's totals are kept.";
const FINANCE_NEW = "Approved payroll runs are saved with their figures, but this card doesn't chart them yet. A month with no approved run is worked out live from the attendance and leave records.";
check("X5", "finance.html: only that sentence and the card's corner", page("dashboard/finance.html") === pre("dashboard/finance.html").replace(FINANCE_OLD, FINANCE_NEW).replace('<span class="card__meta">No history yet</span>', '<span class="card__meta">Not charted yet</span>'));
const ADD_OLD = '<button class="btn btn--primary" type="button" data-permission="users:create" data-not-implemented="Add employee">', ADD_NEW = '<a class="btn btn--primary" href="../users/user-form.html" data-permission="users:create">';
const adminWanted = pre("dashboard/admin.html").replace(ADD_OLD, ADD_NEW).replace("            Add employee\r\n          </button>", "            Add employee\r\n          </a>");
check("X6", "admin.html: only that button, and the bell's markup is still the page's", page("dashboard/admin.html") === adminWanted);
const usersWanted = pre("users/users-list.html").replace(/^ *<th class="table__check">.*\r\n/m, "").replace(/^ *<td class="table__check">.*\r\n/gm, "");
check("X7", "users-list.html: only the checkbox cells", page("users/users-list.html") === usersWanted);
const quoted = (s) => [...s.replace(/^\s*\/\/.*$/gm, "").matchAll(/"([A-Z][a-z][^"]*)"/g)].map((m) => m[1]);
const addedLines = (f) => { const a = new Set(read(path.join(HERE, "js-pre13Z", f)).split("\r\n")); return read(path.join(HERE, "js-pre14A", f)).split("\r\n").filter((l) => !a.has(l)).join("\n"); };   // Round 14H (layout; was the live js): 13Z's, frozen; 14H's words: findsort.mjs W1; the live js: jsguard.mjs
const strs = [...new Set(["app.js", "ui/search.js", "ui/topbar.js", "ui/sidebar.js", "core/guard.js", "ui/waiting.js", "pages/approvals-inbox.js", "pages/users-list.js"].flatMap((f) => quoted(addedLines(f))))].sort();
check("X8", "the only new words in the js: Search, No matches, Search results, and the bell's label (key names aside; 'Waiting for you' is the stat's own)", j(strs) === j(["ArrowDown", "ArrowUp", "Enter", "Escape", "No matches", "Search", "Search results", "Waiting for you"]) && /`Waiting for you: \$\{n\}`/.test(topbarSrc), j(strs));
check("X9", "no HTML strings in the new code: the search and the bell are built with DOM calls", !/innerHTML/.test(searchSrc) && !/innerHTML/.test(addedLines("ui/topbar.js")));
check("X10", "the guard's rule is one function, and guardPage uses it", /export function canOpenPage\(pagePath\)/.test(read(path.join(HERE, "js", "core", "guard.js"))) && /if \(pagePath && !canOpenPage\(pagePath\)\)/.test(read(path.join(HERE, "js", "core", "guard.js"))));
check("X11", "dropdown.js and modal.js are unchanged: no second menu pattern", read(path.join(HERE, "js-pre14A", "ui", "dropdown.js")) === read(path.join(HERE, "js-pre13Z", "ui", "dropdown.js")) && read(path.join(HERE, "js-pre14A", "ui", "modal.js")) === read(path.join(HERE, "js-pre13Z", "ui", "modal.js")));   // Round 14A (layout; was the live js): 9c7423e's, frozen; the live js: jsguard.mjs

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
