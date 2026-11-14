// usage: node adjacent.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 4G: payroll-adjacent content on other pages, with the js in ./js, in jsdom. The clock is local wall
// time, Wed 30 Sep 2026 11:00 unless a check says otherwise; the seed is generated around "now".
//   A  #1 the sidebar headcount, on every page with a sidebar, from the live employee list
//   B  #2 dashboard/finance.html: stats, gross by department, the run table, against payrollRun() and payroll-run.html
//   C  #3 dashboard/admin.html: total employees and the payroll stat
//   D  #4 dashboard/employee.html: the payslip card, against payslipsFor() and payslips.html
//   E  #5 finance/tax-deductions.html: totals against runTotals() / the rows; the slab table untouched
//   F  #6-#10 approvals inbox, notifications, user profile, audit log, reports, approval workflows
//   G  #11 access/role-editor.html: the payroll row offers only real permissions; the count (redrawn by Round 6H)
//   H  who may not see payroll figures: nothing drawn, nothing in the DOM, nothing exported
//   S  the "248" sweep: every in-scope page, as every seeded role that can open it
//   L  source layout, on frozen copies only: js-pre4G / js-post4G and html-pre4G / html-post4G
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const frozen = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 9, 30, 11, 0);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
let blobs = [];
URL.createObjectURL = (blob) => { blobs.push(blob); return "blob:test"; };
URL.revokeObjectURL = () => {};

const WHO = {
  aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"],
  kabir: ["fin", "Kabir Shah", "EMP-1008"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"],
  vikram: ["emp", "Vikram Singh", "EMP-1088"],
  oldAdmin: ["admin", "Aarav Mehta", undefined], oldFin: ["fin", "Kabir Shah", undefined],
};
const ROLES4 = ["aarav", "priya", "kabir", "arjun"];

let loads = 0, w = null, d = null, saved = {};
let jsErrors = [], navigations = [], htmlWrites = [];
const allErrors = [];
// Opens a page as someone, running app.js and every page script its HTML loads.
async function open(page, who, query = "") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const html = read(page);
  const vc = new VirtualConsole();
  jsErrors = []; navigations = []; htmlWrites = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else { jsErrors.push(e.message); allErrors.push(`${page}/${who}: ${e.message}`); } });
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.confirm = () => true;
  const proto = w.Element.prototype;
  const inner = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", { get: inner.get, set(v) { htmlWrites.push(String(v)); inner.set.call(this, v); }, configurable: true });
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, Event: w.Event });
  loads++;
  const auth = await import("./js/core/auth.js");
  if (!who) auth.signOut(); else auth.signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  for (const [, script] of html.matchAll(/<script type="module" src="\.\.\/\.\.\/assets\/js\/pages\/([\w-]+)\.js"><\/script>/g)) {
    try { await import(`./js/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); allErrors.push(`${page}/${who} import: ${e.message}`); }
  }
}
function fresh(y = 2026, mo = 9, day = 30, h = 11) { if (w) w.localStorage.clear(); saved = {}; setNow(y, mo, day, h); }
// Round 11W (restage; G4's pause, round-11v-notes.md V3 option 2): the seed's pending late-arrival corrections named
// here are rejected by Priya Nair (HR) at the check's clock, before any page reads storage. A pending one now pauses
// its late mark (payroll-store.js pausedLateMarks); decided first, every late mark counts, so the figures and wording
// below are the ones they always were. RG-102 is Vikram's (one of his three September late marks: the ₹1,455 case);
// RG-103, Sneha's, is decided too only where a check reads the run page's "Attendance recorded" wording.
async function decideFirst(ids = ["RG-102"]) {
  const box = new Map();
  globalThis.localStorage = w ? w.localStorage : { getItem: (k) => (box.has(k) ? box.get(k) : null), setItem: (k, v) => box.set(k, String(v)), removeItem: (k) => box.delete(k), clear: () => box.clear(), key: (i) => [...box.keys()][i] ?? null, get length() { return box.size; } };
  const A11W = await import("./js/data/attendance-store.js");
  for (const id of ids) { const r = A11W.decideRegularization(id, "EMP-1003", "hr", "reject", "Decided before the clock (round 11W)"); if (!r.ok) throw new Error(`round 11W restage, ${id}: ${r.error}`); }
  if (!w) saved = Object.fromEntries(box);
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const money = (n) => `₹${n.toLocaleString("en-IN")}`;

// ---- readers ----
const $ = (id) => d.getElementById(id);
const stat = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return s ? [txt(s.querySelector(".stat__label")), txt(s.querySelector(".stat__value")), txt(s.querySelector(".stat__delta"))] : null; };
const footer = () => txt(d.querySelector(".sidebar__footer"));
// Round 14E part 1 (layout): the reason line under a badge (class reason) is set aside like an avatar; reasons.mjs F2 pins it
function parts(node) {
  const out = [];
  const walker = node.ownerDocument.createTreeWalker(node, 4);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) { if (t.parentElement.closest(".avatar, .reason")) continue; const v = t.textContent.replace(/\s+/g, " ").trim(); if (v) out.push(v); }
  return out.join(" ");
}
const tableRows = (tbody) => [...tbody.querySelectorAll("tr")].map((tr) => [...tr.children].map(parts));
const bars = (id) => [...$(id).querySelectorAll(".bar-row")].map((b) => `${txt(b.children[0])}=${txt(b.children[2])}@${b.querySelector(".bar-row__fill").style.getPropertyValue("--w")}`);
const csvFiles = async () => Object.fromEntries(await Promise.all(blobs.map(async (b, i) => [i, (await b.text()).replace(/^﻿/, "").split("\r\n")])));
// Everything a person can read on the page: text and the title / aria-label / placeholder attributes.
const visibleText = () => [d.body.textContent, ...[...d.body.querySelectorAll("[title],[aria-label],[placeholder]")].flatMap((e) => [e.getAttribute("title"), e.getAttribute("aria-label"), e.getAttribute("placeholder")])].filter(Boolean).join(" | ");

const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const PS = await import("./js/data/payroll-store.js");
const P = await import("./js/data/payroll.js");
const { ALL_PERMISSIONS } = await import("./js/config/permissions.js");
const { ROUTES } = await import("./js/config/routes.js");
const { ROLES } = await import("./js/config/roles.js");
const sep = () => PS.payrollRun(2026, 9);
const dept = (code) => S.getAllDepartments().find((x) => x.code === code)?.name;
// Independent sums over a run's rows (not through runTotals / payslipTotals).
const sumOf = (run, f) => run.rows.reduce((s, r) => s + f(r), 0);
const ROW_STATUS = { "draft": "Draft", "on-hold": "On hold" };
const sidebarPages = fs.readdirSync(DIR, { recursive: true }).map((p) => p.replaceAll("\\", "/")).filter((p) => p.endsWith(".html") && read(p).includes('class="sidebar__footer"')).sort();

// =====================================================================
section("A. #1 the sidebar headcount, every page with a sidebar");
fresh(); await open("dashboard/admin.html", "aarav");
const active = S.getAllUsers().filter((u) => u.status !== "inactive");
check("A1", "the store: activeHeadcount() = everyone not inactive = 9 (Meera, on leave, counted; Divya, inactive, not) = the September run's rows",
  S.activeHeadcount() === 9 && active.length === 9 && active.some((u) => u.status === "on-leave") && !active.some((u) => u.id === "EMP-1061") && sep().rows.length === 9 && j(sep().rows.map((r) => r.userId).sort()) === j(active.map((u) => u.id).sort()));
// Round Manager scoping part 2 (behaviour; was 47: team-leave.html is a 48th page with a sidebar)
check("A2", `the HTML: all ${sidebarPages.length} pages with a sidebar have one empty #sidebar-headcount, and none says '248 active employees'`,
  sidebarPages.length === 48 && sidebarPages.every((p) => (read(p).match(/<span id="sidebar-headcount"><\/span>/g) ?? []).length === 1 && !read(p).includes("248 active employees")));
const footers = {};
for (const p of sidebarPages) {
  for (const who of ["aarav", "arjun"]) {
    fresh(); await open(p, who);
    if (!navigations.length) (footers[footer()] ??= []).push(`${who}:${p}`);
  }
}
const openedAsArjun = Object.values(footers).flat().filter((x) => x.startsWith("arjun:")).length;
// Round Manager scoping part 2 (behaviour; was 47: team-leave.html)
// Round 14E part 4 (behaviour; was "9 active employees": the same count, "9 employees")
check("A3", `rendered: every page shows 'Northwind Technologies 9 employees' (Admin on all 48; Employee on the ${openedAsArjun} it may open)`,
  j(Object.keys(footers)) === j(["Northwind Technologies 9 employees"]) && footers["Northwind Technologies 9 employees"].length === 48 + openedAsArjun && openedAsArjun > 10, j(Object.fromEntries(Object.entries(footers).map(([k, v]) => [k, v.length]))));
fresh(); await open("users/users-list.html", "aarav");
S.deactivateUser(USER_ACTOR("admin", "EMP-1088"), "EMP-1088", LEAVING_11Y());
await open("leave/holidays.html", "aarav");
const afterDeactivate = footer();
S.reactivateUser(USER_ACTOR("admin", "EMP-1088"), "EMP-1088"); S.addUser(USER_ACTOR("admin", null), { name: "Test Person", email: "test.person@northwind.com", department: "SUP", role: "emp", designation: "Support Agent" });
await open("leave/holidays.html", "arjun");
check("A4", "it follows the store: Vikram deactivated -> 8; reactivated and a new employee added -> 10",
  afterDeactivate === "Northwind Technologies 8 employees" && footer() === "Northwind Technologies 10 employees" /* Round 14E part 4 (behaviour; was "N active employees") */ && S.activeHeadcount() === 10, `${afterDeactivate} / ${footer()}`);
fresh(); await open("leave/holidays.html", "arjun");
const box = JSON.parse(w.localStorage.getItem("officeos:users"));
box.records.forEach((u) => { if (u.id !== "EMP-1105") u.status = "inactive"; });
w.localStorage.setItem("officeos:users", JSON.stringify(box));
await open("leave/holidays.html", "arjun");
check("A5", "one active person: '1 employee' (singular)", footer() === "Northwind Technologies 1 employee" /* Round 14E part 4 (behaviour; was "1 active employee") */, footer());
fresh(); await open("payroll/payroll-run.html", "kabir");
check("A6", "payroll-run.html: the same line, now from app.js (its own copy is gone), and its run still has the same 9 people",
  footer() === "Northwind Technologies 9 employees" /* Round 14E part 4 (behaviour; was "9 active employees") */ && stat("employees")[1] === "9" && jsErrors.length === 0);
fresh(); await open("auth/login.html", null);
check("A7", "a public page (login): no sidebar, nothing drawn, no error", !d.querySelector(".sidebar__footer") && jsErrors.length === 0);
fresh(); await open("dashboard/hr.html", null);
check("A8", "nobody signed in on a page with a sidebar: sent to login, the line stays empty", navigations.length === 1 && footer() === "Northwind Technologies");

// =====================================================================
section("B. #2 dashboard/finance.html as Kabir (Finance)");
fresh(); await decideFirst(); await open("dashboard/finance.html", "kabir");   // Round 11W (restage): RG-102 rejected first (B1 / B3 / B10)
let run = sep();
const fin = { payroll: stat("payroll"), tds: stat("tds"), net: stat("net") };
check("B1", "Payroll, Sep = the run's gross (₹9,64,045 = runTotals and the rows' own sum); note says what it is",
  j(fin.payroll) === j(["Payroll, Sep", money(PS.runTotals(run).gross), "Gross for 9 employees, draft"]) && PS.runTotals(run).gross === sumOf(run, (r) => r.gross) && fin.payroll[1] === "₹9,64,045", j(fin.payroll));
// Round 9D (behaviour; was "Deposit by 7 Oct"): the note says the figure uses sample tax rates, as tax-deductions.html's
// "Sample rules" does; the deposit date is unchanged (and tax-deductions.html's own note, checked below, is untouched)
check("B2", "Tax deducted (TDS) = the rows' TDS (₹37,972); the note is September's TDS deposit date (Round 7B: 'Deposit by 7 Oct', was the static 'Filing due 7 Oct'); Round 9D: prefixed 'Sample tax rates;'",
  j(fin.tds) === j(["Tax deducted (TDS)", money(sumOf(run, (r) => r.deductionLines.tds)), "Sample tax rates; deposit by 7 Oct"]) && fin.tds[1] === "₹37,972", j(fin.tds));
check("B3", "'Bonuses queued' (not modelled) is replaced by the run's net pay: ₹8,77,999, 'Draft, not paid yet'",
  j(fin.net) === j(["Net pay, Sep", money(sumOf(run, (r) => r.net)), "Draft, not paid yet"]) && fin.net[1] === "₹8,77,999" && !/Bonus/.test(d.body.textContent), j(fin.net));
const finRows = tableRows($("fin-run-rows"));
const expectFinRows = run.rows.map((r) => { const u = S.getUser(r.userId); return [`${u.name} ${dept(u.department)}`, money(r.gross), money(r.deductions), money(r.net), ROW_STATUS[r.status]]; });
check("B4", "run table: every one of the 9 people, by name, figures and status from payrollRun(); meta 'All 9 employees in the run'",
  j(finRows) === j(expectFinRows) && finRows.length === 9 && txt($("fin-run-meta")) === "All 9 employees in the run", j(finRows[0]));
const deptExpect = S.getAllDepartments().map((x) => [x.name, sumOf({ rows: run.rows.filter((r) => S.getUser(r.userId).department === x.code) }, (r) => r.gross)]);
const top = Math.max(...deptExpect.map(([, g]) => g));
check("B5", "gross by department: every store department in order (Customer Support ₹0, 'Human Resources'), relative to the largest; adds up to the gross",
  j(bars("fin-dept-bars")) === j(deptExpect.map(([n, g]) => `${n}=${money(g)}@${Math.round((g / top) * 100)}%`)) && deptExpect.reduce((s, [, g]) => s + g, 0) === PS.runTotals(run).gross
  && bars("fin-dept-bars")[0] === "Engineering=₹4,58,000@100%" && bars("fin-dept-bars")[3] === "Customer Support=₹0@0%", j(bars("fin-dept-bars")));
// Round 13Z (behaviour, A9): runs have been stored since 11T; the note says so
check("B6", "the 14-month chart is gone: a note instead, no bars, no lakh figures",
  !d.querySelector("main .chart") && /this card doesn't chart them yet/.test(d.body.textContent) && !/lakh|₹5\d(\.\d)?L/.test(d.querySelector("main").textContent));
const finApprovals = [...d.querySelectorAll(".grid-main-aside .list__title")].map(txt);
check("B7", "pending approvals: only expense claims (no salary revision, no bonus payout); since 5F the claims waiting for the viewer, from the store",
  finApprovals.length > 0 && finApprovals.every((t) => t.startsWith("Expense claim: ")) && txt(d.querySelector(".grid-main-aside .card + .card .card__meta")) === `${finApprovals.length} open`, j(finApprovals));
const activity = [...d.querySelectorAll(".activity__text")].map(txt);
check("B8", "recent activity: no payroll events (draft ready / 248 payslips / PF challan / salary structure edits); since 5F real expense events",
  activity.length > 0 && !activity.some((a) => /payroll|payslip|PF challan|salary/i.test(a)), j(activity));
check("B9", "the fake status filter (Processing / Paid) is gone; the search still filters the run table",
  !d.querySelector('select[aria-label="Filter by status"]') && !/Processing/.test(d.querySelector("main").textContent) && (() => {
    const s = d.querySelector('input[aria-label="Search employees"]'); s.value = "sneha"; s.dispatchEvent(new w.Event("input"));
    const shown = [...$("fin-run-rows").children].filter((tr) => !tr.hidden).map((tr) => tr.dataset.userId);
    s.value = ""; s.dispatchEvent(new w.Event("input"));
    return j(shown) === j(["EMP-1029"]);
  })());
blobs = [];
d.querySelector("main [data-export]").click();
const finCsv = await csvFiles();
check("B10", "Export (Finance): the run table file has the 9 people with the same figures; the stats file has the three payroll stats",
  // Round Data export (behaviour; was ₹ figures and plain headings: plain numbers, the unit in the heading)
  // Round Data export part 2 (behaviour; was "Aarav Mehta Engineering" in one cell and the stats as ₹ text: the Employee cell split, the stats plain numbers with (₹) in the metric)
  finCsv[0]?.length === 10 && finCsv[0][0] === "Employee,Department,Gross (₹),Deductions (₹),Net pay (₹),Status" && finCsv[0][1] === `Aarav Mehta,Engineering,160000,${7680 + 200 + 14083},138037,Draft`
  && finCsv[1]?.includes(`"Payroll, Sep (₹)",964045`) && finCsv[1]?.includes(`"Net pay, Sep (₹)",877999`) && finCsv[1]?.includes(`Tax deducted (TDS) (₹),37972`), j([finCsv[0]?.[1], finCsv[1]]));
check("B11", "no page errors; no HTML strings written by the page script (text only)", jsErrors.length === 0 && !htmlWrites.some((h) => /Mehta|Gupta|₹/.test(h)));

fresh(); await decideFirst(); await open("dashboard/finance.html", "kabir");   // Round 13L (restage; 11W's leftovers, K2.2): RG-102 rejected first (B12)
const finAgain = { payroll: stat("payroll")[1], net: stat("net")[1], rows: tableRows($("fin-run-rows")) };
await open("payroll/payroll-run.html", "kabir");
const runPage = { gross: stat("gross")[1], net: stat("net")[1], rows: tableRows($("run-rows")).map((r) => [r[0].replace(/, .*$/, ""), r[1], r[2], r[3], r[4]]) };
check("B12", "agrees with payroll-run.html: Payroll = its Gross, Net = its Net, and the same rows (person, gross, deductions, net, status)",
  finAgain.payroll === runPage.gross && finAgain.net === runPage.net && j(finAgain.rows) === j(runPage.rows), j([finAgain.payroll, runPage.gross, finAgain.net, runPage.net]));
S.updateUser(USER_ACTOR("admin", "EMP-1042"), "EMP-1042", { bankAccount: null, bankAccountLast4: null });
await open("dashboard/finance.html", "aarav");
const held = tableRows($("fin-run-rows")).find((r) => r[0].startsWith("Rohan"));
const heldTitle = [...$("fin-run-rows").children].find((tr) => tr.dataset.userId === "EMP-1042").querySelector(".badge").title;
const aaravPay = stat("payroll")[1];
await open("payroll/payroll-run.html", "aarav");
check("B13", "Aarav (Admin), Rohan with no bank account: his row is On hold (reason in the title), and the totals still agree with the run page",
  held[4] === "On hold" && heldTitle === "No bank account on file" && aaravPay === stat("gross")[1], j([held, heldTitle]));

fresh(); await decideFirst(); await open("dashboard/finance.html", "kabir");   // Round 13L (restage; 11W's leftovers, K2.2): RG-102 rejected first (B14)
const ub = JSON.parse(w.localStorage.getItem("officeos:users"));
ub.records.forEach((u) => { if (u.id === "EMP-1105") u.department = "XYZ"; if (u.id === "EMP-1042") u.department = ""; });
w.localStorage.setItem("officeos:users", JSON.stringify(ub));
await open("dashboard/finance.html", "kabir");
const odd = bars("fin-dept-bars");
check("B14", "someone in a department that isn't in the list, and someone with none: each still counted, under 'XYZ' and 'No department'; the bars still add up to the gross",
  j(odd.slice(-2)) === j(["XYZ=₹88,000@32%", "No department=₹92,000@33%"]) && odd[0] === "Engineering=₹2,78,000@100%" && odd.length === 8
  && odd.reduce((s, b) => s + Number(b.split("=")[1].split("@")[0].replace(/[₹,]/g, "")), 0) === PS.runTotals(sep()).gross, j(odd));

// =====================================================================
section("C. #3 dashboard/admin.html");
fresh(); await decideFirst(); await open("dashboard/admin.html", "aarav");   // Round 11W (restage): as section B, which C2 compares with
const admin = { total: stat("total"), payroll: stat("payroll") };
check("C1", "Total employees = the sidebar's count (9), 'Not counting 1 inactive employee' (not 248, not '+12 this quarter')",
  j(admin.total) === j(["Total employees", "9", "Not counting 1 inactive employee"]) && footer().endsWith(" 9 employees") /* Round 14E part 4 (behaviour; was " 9 active employees") */, j(admin.total));
check("C2", "Payroll, Sep = the run's gross, same text as the Finance dashboard's card",
  j(admin.payroll) === j(["Payroll, Sep", money(PS.runTotals(sep()).gross), "Gross for 9 employees, draft"]) && admin.payroll[1] === fin.payroll[1] && admin.payroll[2] === fin.payroll[2], j(admin.payroll));
// Round 9B (behaviour; was "the other three lines kept": three invented system events): the feed is real now, the
// newest 5 events from the stores, and none of the invented ones
check("C3", "recent activity: no 'Payroll draft for September created'; Round 9B: the feed is real, 5 events, the three invented lines gone",
  ![...d.querySelectorAll(".activity__text")].some((a) => /[Pp]ayroll/.test(a.textContent)) && d.querySelectorAll(".activity__item").length === 5
  && ![...d.querySelectorAll(".activity__text")].some((a) => /Team Lead access|Backup completed|failed logins/.test(a.textContent)));
fresh(); await open("dashboard/admin.html", "priya");
check("C4", "Priya (HR: may open the page, no payroll:view): payroll card hidden and never drawn; total drawn",
  d.querySelector('[data-stat="payroll"]').hidden && stat("payroll")[1] === "—" && stat("payroll")[2] === "" && stat("total")[1] === "9" && !d.body.textContent.includes("9,64,045"));
fresh(); await open("dashboard/admin.html", "kabir");
check("C5", "Kabir (no attendance:view-all): sent to 403, neither stat drawn", navigations.length === 1 && stat("payroll")[1] === "—" && stat("total")[1] === "—");
fresh(); await open("dashboard/admin.html", "oldAdmin");
check("C6", "an old session (no employee id) keeps the static page: both stats show the neutral '—', not 248 / ₹58.4L", stat("total")[1] === "—" && stat("payroll")[1] === "—" && !/₹58\.4L|\+12 this quarter/.test(d.body.textContent));
fresh(); await open("dashboard/admin.html", "aarav");
S.deactivateUser(USER_ACTOR("admin", "EMP-1088"), "EMP-1088", LEAVING_11Y());
await open("dashboard/admin.html", "aarav");
const adminAfter = [stat("total"), stat("payroll")[1]];
await open("payroll/payroll-run.html", "aarav");
// Round 11Y (behaviour; was "payroll = the run page's new gross" without him, ₹9,64,045 - ₹62,545): his last working day
// is today (30 Sep), so September is his final month and still pays him, in full (round-11x-notes.md X-D2)
check("C7", "Vikram deactivated (last working day today, 30 Sep): total 8 'Not counting 2 inactive employees', sidebar 8; payroll = the run page's gross, which still pays him for September (round 11Y)",
  j(adminAfter[0]) === j(["Total employees", "8", "Not counting 2 inactive employees"]) && adminAfter[1] === stat("gross")[1] && adminAfter[1] === money(sumOf(sep(), (r) => r.gross))
  && sep().rows.length === 9 && sep().rows.some((r) => r.userId === "EMP-1088" && r.attendance.lastDay === "2026-09-30") && footer().endsWith(" 8 employees") /* Round 14E part 4 (behaviour; was " 8 active employees") */, j(adminAfter));

// =====================================================================
section("D. #4 dashboard/employee.html: the payslip card");
async function payslipCards(who) {
  await open("dashboard/employee.html", who);
  const dash = stat("payslip");
  const updates = [...d.querySelectorAll("#updates .activity__text")].map(txt);
  await open("payroll/payslips.html", who);
  return { dash, mine: stat("next"), updates };
}
fresh();
let cards = await payslipCards("arjun");
const arjunSep = PS.payslipsFor("EMP-1105", "2026-09-30")[0];
check("D1", "Arjun, 30 Sep: 'Sep 2026', 'Draft, not paid yet; no pay date set' = payslips.html's Next payslip card (value and note)",
  j(cards.dash) === j(["Next payslip", "Sep 2026", "Draft, not paid yet; no pay date set"]) && cards.dash[1] === cards.mine[1] && cards.dash[2] === cards.mine[2] && arjunSep.month === "2026-09" && arjunSep.status === "draft", j([cards.dash, cards.mine]));
check("D2", "no pay date or calendar is claimed ('Credited in', '30 Sep'), and the 'August payslip is ready' update is gone",
  !/Credited in|August payslip|30 Sep\b/.test(j(cards.dash)) && !cards.updates.some((u) => /payslip/i.test(u)), j(cards.updates));
fresh();
S.updateUser(USER_ACTOR("admin", "EMP-1105"), "EMP-1105", { bankAccount: null, bankAccountLast4: null });
cards = await payslipCards("arjun");
check("D3", "no bank account: 'On hold: No bank account on file; no pay date set', the same as payslips.html",
  cards.dash[2] === "On hold: No bank account on file; no pay date set" && cards.dash[2] === cards.mine[2] && cards.dash[1] === cards.mine[1], j(cards));
fresh(2026, 10, 1, 11);
cards = await payslipCards("vikram");
check("D4", "Vikram on Thu 1 Oct: the month in progress, 'Oct 2026', Draft (the same as payslips.html)",
  j(cards.dash) === j(["Next payslip", "Oct 2026", "Draft, not paid yet; no pay date set"]) && cards.dash[2] === cards.mine[2], j(cards.dash));
fresh();
const newcomer = S.addUser(USER_ACTOR("admin", null), { name: "New Joiner", email: "new.joiner@northwind.com", department: "SUP", role: "emp", designation: "Support Agent" }).record;
WHO.newcomer = ["emp", "New Joiner", newcomer.id];
cards = await payslipCards("newcomer");
check("D5", "a new employee (no salary record): this month's payslip, On hold for no salary (the store's rule), as payslips.html",
  j(cards.dash) === j(["Next payslip", "Sep 2026", "On hold: No salary on file for this month; no pay date set"]) && j(cards.dash.slice(1)) === j(cards.mine.slice(1)), j([cards.dash, cards.mine]));
S.deactivateUser(USER_ACTOR("admin", newcomer.id), newcomer.id, LEAVING_11Y());
cards = await payslipCards("newcomer");
// Round 11P (behaviour; behaviour; N1: a deactivated person's session is now signed out at the guard and sent to sign in, so the page script draws nothing for them)
check("D5b", "…deactivated: signed out at the guard (round 11P, N1), so both pages keep their static, neutral card ('—', no line), as an old session's (D6)", localStorage.getItem("officeos:session") === null && navigations.length === 1 && j(cards.dash) === j(["Next payslip", "—", ""]) && j(cards.mine) === j(cards.dash), j([cards.dash, cards.mine]));
fresh(); await open("dashboard/employee.html", "oldAdmin");
check("D6", "an old session: the static card, now the neutral '—' (no '30 Sep', no 'Credited in 11 days')", j(stat("payslip")) === j(["Next payslip", "—", ""]));

// =====================================================================
section("E. #5 finance/tax-deductions.html as Kabir");
fresh(); await decideFirst(); await open("finance/tax-deductions.html", "kabir");   // Round 11W (restage): RG-102 rejected first (E1 / E3)
run = sep();
const tax = { tds: stat("tds"), pf: stat("pf"), pt: stat("pt"), regime: stat("regime") };
const amounts = Object.fromEntries([...d.querySelectorAll("[data-amount]")].map((c) => [c.dataset.amount, txt(c)]));
const T = { tds: sumOf(run, (r) => r.deductionLines.tds), pf: sumOf(run, (r) => r.deductionLines.pf), er: sumOf(run, (r) => r.employerPf), pt: sumOf(run, (r) => r.deductionLines.pt) };
check("E1", "TDS + employee PF + PT on this page add up to runTotals(run).deductions (₹37,972 + ₹46,274 + ₹1,800 = ₹86,046)",
  [amounts.tds, amounts.pf, amounts.pt].map((s) => Number(s.replace(/[₹,]/g, ""))).reduce((a, b) => a + b, 0) === PS.runTotals(run).deductions && PS.runTotals(run).deductions === 86046, j(amounts));
check("E2", "Income tax (TDS) stat and table row = the rows' TDS; the same figure as the Finance dashboard's TDS card",
  tax.tds[1] === money(T.tds) && amounts.tds === money(T.tds) && tax.tds[1] === fin.tds[1] && tax.tds[2] === "Deposit by 7 Oct", j(tax.tds));
check("E3", "Provident fund: employee ₹46,274 + employer ₹46,274 = ₹92,548 (stat), each share in its own row",
  amounts.pf === money(T.pf) && amounts["employer-pf"] === money(T.er) && tax.pf[1] === money(T.pf + T.er) && tax.pf[1] === "₹92,548" && tax.pf[2] === "Employee plus employer", j(tax.pf));
check("E4", "Professional tax: ₹1,800, '9 people at ₹200' (the count of rows that pay it, the amount from PAY_RULES)",
  tax.pt[1] === money(T.pt) && amounts.pt === "₹1,800" && tax.pt[2] === `9 people at ${money(P.PAY_RULES.professionalTax)}` && run.rows.filter((r) => r.deductionLines.pt > 0).length === 9, j(tax.pt));
const statRows = tableRows(d.querySelector('table[data-export-name="statutory-deductions"] tbody')).map((r) => r.slice(0, 6).join(" | "));
check("E5", "statutory table: 4 rows for September (the August TDS row is gone: no August payroll exists); status 'Not built' (Round 7B; was 'Draft'); rates match PAY_RULES",
  j(statRows) === j([`Provident fund, employee | 12% of basic | Employee | ${money(T.pf)} | 15 Oct | Not built`, `Provident fund, employer | 12% of basic | Company | ${money(T.er)} | 15 Oct | Not built`,
    `Professional tax | ₹200 a month | Employee | ${money(T.pt)} | 30 Sep | Not built`, `Income tax (TDS) | As per slab | Employee | ${money(T.tds)} | 7 Oct | Not built`])
  && P.PAY_RULES.pfShareOfBasic === 0.12 && P.PAY_RULES.professionalTax === 200, j(statRows));
check("E6", "tax regime: from the salary records, 9 on the new regime, 0 on the old; bars 100% / 0%; meta '9 employees'; says choosing a regime isn't built",
  j(tax.regime) === j(["On the new regime", "9", "0 on the old regime"]) && j(bars("regime-bars")) === j(["New regime=9@100%", "Old regime=0@0%"]) && txt($("regime-meta")) === "9 employees"
  && /choosing a regime isn't built yet/.test(d.body.textContent), j([tax.regime, bars("regime-bars")]));
check("E7", "tax declarations: no '171 of 248', no progress bar, no reminder button; says they aren't collected",
  !/171|77 employees|Send a reminder/.test(d.body.textContent) && !d.querySelector("main .progress") && /Tax declarations aren't collected yet/.test(d.body.textContent));
const slab = (doc) => doc.querySelector('table[data-export-name="tax-slabs"]').closest("section").outerHTML;
const preTax = new JSDOM(frozen("html-pre4G", "finance/tax-deductions.html")).window.document;
const slabRows = [...d.querySelectorAll('table[data-export-name="tax-slabs"] tbody tr')].map((tr) => [...tr.children].map(txt));
const parsed = slabRows.map(([range, rate]) => [range.match(/[\d,]+/g).map((x) => Number(x.replace(/,/g, ""))).at(-1), rate === "Nil" ? 0 : Number(rate.replace("%", "")) / 100]);
check("E8", "the slab table is untouched (byte-identical to the frozen pre-4G page, 'sample values' alert too) and still equals TAX_SAMPLE",
  slab(d) === slab(preTax) && txt(d.querySelector(".alert--warning")) === txt(preTax.querySelector(".alert--warning"))
  && j(parsed.map(([, r]) => r)) === j(P.TAX_SAMPLE.slabs.map((s) => s.rate)) && j(parsed.slice(0, -1).map(([u]) => u)) === j(P.TAX_SAMPLE.slabs.slice(0, -1).map((s) => s.upTo)) && parsed.at(-1)[0] === 2400000, j(parsed));
fresh();
PS.allSalaries();
const salBox = JSON.parse(w.localStorage.getItem("officeos:salaries"));
salBox.records = salBox.records.map((s) => (s.userId === "EMP-1042" ? { ...s, regime: "old" } : s));
w.localStorage.setItem("officeos:salaries", JSON.stringify(salBox));
await open("finance/tax-deductions.html", "kabir");
check("E9", "a salary record on the old regime moves the counts: 8 new, 1 old, bars 89% / 11%", j(stat("regime")) === j(["On the new regime", "8", "1 on the old regime"]) && j(bars("regime-bars")) === j(["New regime=8@89%", "Old regime=1@11%"]), j(bars("regime-bars")));
fresh(); await open("finance/tax-deductions.html", "kabir");
S.updateUser(USER_ACTOR("admin", "EMP-1088"), "EMP-1088", { status: "inactive", dateOfLeaving: LEAVING_11Y() });
await open("finance/tax-deductions.html", "aarav");
run = sep();
// Round 11Y (behaviour; was 8 people, PT ₹1,600: September is Vikram's final month, so its run still pays him)
check("E10", "Aarav (Admin), Vikram inactive since today: every figure follows the run, which still has him for September (PT ₹1,800, '9 people at ₹200'; round 11Y)",
  stat("pt")[1] === "₹1,800" && stat("pt")[2] === "9 people at ₹200" && stat("tds")[1] === money(sumOf(run, (r) => r.deductionLines.tds)) && stat("regime")[1] === "9" && run.rows.length === 9
  && run.rows.some((r) => r.userId === "EMP-1088"));

fresh(); await open("finance/tax-deductions.html", "kabir");
S.addUser(USER_ACTOR("admin", null), { name: "No Salary Yet", email: "no.salary@northwind.com", department: "SUP", role: "emp", designation: "Support Agent" });
await open("finance/tax-deductions.html", "kabir");
run = sep();
check("E11", "a person with no salary record (on hold, ₹0): in the run (10 rows) but not counted as paying PT or as on a regime ('9 people', '9 employees')",
  run.rows.length === 10 && stat("pt")[2] === "9 people at ₹200" && stat("pt")[1] === "₹1,800" && txt($("regime-meta")) === "9 employees" && stat("regime")[1] === "9");

// =====================================================================
section("F. #6-#10 approvals inbox, notifications, user profile, audit log, reports, approval workflows");
fresh(); await open("requests/approvals-inbox.html", "aarav");
check("F1", "#6 approvals inbox: no 'Salary revision: Meera Joshi' row and no Payroll type; 2 static decided rows left (6E removed the headset row)",
  !/Salary revision: Meera|Meera Joshi \/ Payroll/.test(d.body.textContent) && ![...d.querySelectorAll('select[aria-label="Filter by type"] option')].some((o) => txt(o) === "Payroll")
  && (read("requests/approvals-inbox.html").match(/<tr data-static data-type="\w+" data-status="(approved|rejected)"/g) ?? []).length === 2);
// Round 6G: the flagged policy line now says what's true: salary revisions have no approval step yet.
// Round 12Z (behavior; was "says salary revisions aren't built yet"): built in R9c (salinbox.mjs H1)
check("F2", "#6 …Meera's salary really never changed (one record, ₹1,05,000 from 1 Apr 2026); the 'Who approves what' line says salary revisions go Finance, then an Admin (Round 6G; 12Z)",
  j(PS.salaryHistory("EMP-1023").map((s) => [s.gross, s.effectiveFrom])) === j([[105000, "2026-04-01"]]) && /Salary revisions\s*Finance, then an Admin/.test(d.body.textContent));
fresh(); await open("account/notifications.html", "arjun");
const notes = [...d.querySelectorAll(".notif__title")].map(txt);
const preNotes = [...new JSDOM(frozen("html-pre4G", "account/notifications.html")).window.document.querySelectorAll(".notif__title")].map(txt);
check("F3", "#7 notifications: 'Your August payslip is ready / Paid on 31 Aug' removed, the other 5 unchanged and in order (6E: the laptop one is with your manager, not IT Support)",
  j(notes) === j(preNotes.filter((t) => t !== "Your August payslip is ready").map((t) => (t === "Your laptop request is with IT Support" ? "Your laptop request is with your manager" : t))
    .map((t) => (t === "Your leave request for 3 Oct was sent to Sneha Rao" ? "Your leave request for 3 Oct was sent to your manager" : t))) && notes.length === 5   /* Round 9R (behaviour; was "…sent to Sneha Rao" kept): no real person (roster.mjs N1) */ && !/payslip|Paid on/i.test(d.querySelector(".card").textContent), j(notes));
const kv = (label) => [...d.querySelectorAll(".kv__row")].find((r) => txt(r.querySelector("dt")) === label)?.querySelector("dd");
// Round Forms (layout; was no id, which drew Rohan): Rohan asked for by id; no id is "not found" now (forms.mjs P1)
fresh(); await open("users/user-profile.html", "aarav", "?id=EMP-1042");
const rohanSalary = [txt(kv("Salary")), kv("Salary").className];
await open("users/user-profile.html", "kabir", "?id=EMP-1088");
const vikramSalary = txt(kv("Salary"));
await open("users/user-profile.html", "aarav", "?id=EMP-1061");
const divyaSalary = [txt(kv("Salary")), kv("Salary").className];
await open("users/user-profile.html", "priya", "?id=EMP-1088");
const hrSalary = txt(kv("Salary"));
check("F4", "#7 user profile, Salary row: Rohan ₹92,000 a month (not muted), Vikram ₹64,000 (his current record, not the old ₹60,000), Divya (no salary) 'Not on file', HR 'Hidden'",
  j(rohanSalary) === j(["₹92,000 a month", ""]) && rohanSalary[0] === `${money(PS.salaryFor("EMP-1042", 2026, 9).gross)} a month` && vikramSalary === "₹64,000 a month"
  && j(divyaSalary) === j(["Not on file", "text-muted"]) && hrSalary === "Hidden, needs salary:view", j([rohanSalary, vikramSalary, divyaSalary, hrSalary]));
fresh();
PS.allSalaries();
const sb = JSON.parse(w.localStorage.getItem("officeos:salaries"));
sb.records.push({ id: "SAL-99", userId: "EMP-1042", gross: 99000, effectiveFrom: "2026-10-01", regime: "new" });
w.localStorage.setItem("officeos:salaries", JSON.stringify(sb));
await open("users/user-profile.html", "aarav", "?id=EMP-1042");   // Round Forms (layout): Rohan by id, as F4
const beforeRaise = txt(kv("Salary"));
setNow(2026, 10, 2, 11);
await open("users/user-profile.html", "aarav", "?id=EMP-1042");
check("F5", "#7 …a raise from 1 Oct shows only from October (the first-of-month rule), the same as salaryFor", beforeRaise === "₹92,000 a month" && txt(kv("Salary")) === "₹99,000 a month", `${beforeRaise} / ${txt(kv("Salary"))}`);
check("F6", "#7 user-profile.html's static Recent activity has no 'August payslip was generated'", !/payslip/i.test(read("users/user-profile.html").slice(read("users/user-profile.html").indexOf("<main"))));
fresh(); await open("system/audit-log.html", "aarav");
const audit = tableRows(d.querySelector('table[data-export-name="audit-log"] tbody'));
check("F7", "#8 audit log: the 'Created payroll draft … 248 payslips' and 'Edited salary structure (Arjun ₹88,000 -> ₹92,000)' entries are gone; 6 rows, 'Showing 1 to 6'",
  audit.length === 6 && !audit.some((r) => r[3] === "Payroll") && !/payroll draft|salary structure|248/i.test(d.querySelector("main table").textContent) && /Showing 1 to 6 of/.test(d.body.textContent));
check("F8", "#8 …and Arjun's salary was never ₹92,000 (one record, ₹88,000)", j(PS.salaryHistory("EMP-1105").map((s) => s.gross)) === j([88000]));
const registerDownload = () => [...d.querySelectorAll(".report")].find((r) => txt(r.querySelector(".report__title")) === "Payroll register").querySelector('[data-not-implemented="Download"]');
// Since 5F the Expense summary Download needs expenses:view too (the same pattern), so it isn't among HR's others.
const otherDownloads = () => [...d.querySelectorAll(".report")].filter((r) => !["Payroll register", "Expense summary"].includes(txt(r.querySelector(".report__title")))).map((r) => r.querySelector('[data-not-implemented="Download"]'));
fresh(); await open("system/reports.html", "priya");
const hrReg = [registerDownload().hidden, otherDownloads().every((b) => !b.hidden)];
await open("system/reports.html", "kabir");
const finReg = registerDownload().hidden;
check("F9", "#9 reports: Payroll register keeps its salary:view chip; its Download now needs salary:view (HR, with reports:export but no salary:view, doesn't see it; still sees the others); Finance does",
  txt([...d.querySelectorAll(".report")].find((r) => /Payroll register/.test(r.textContent)).querySelector(".perm-chip")) === "salary:view" && registerDownload().dataset.permission === "salary:view"
  && j(hrReg) === j([true, true]) && finReg === false && ROLES.hr.permissions.includes("reports:export") && !ROLES.hr.permissions.includes("salary:view"), j([hrReg, finReg]));
fresh(); await open("access/approval-workflows.html", "aarav");
const prep = sep(); prep.preparedBy = "EMP-1008";
// Round 12Z (behavior; was "...approving a run isn't built yet."): approving a run was built in 11T (salinbox.mjs W2)
check("F10", "#10 approval workflows: the preparer of a payroll run can't approve it, an Admin who didn't prepare it does (Round 7C; 12Z: approving is built; was 'can't be turned off') (canApprove: the preparer no, anyone else yes)",
  /The person who prepared a payroll run can't approve it: an Admin who didn't prepare it approves it on the run page\./.test(d.body.textContent) && !/creates a payroll run/.test(d.body.textContent)
  && PS.canApprove(prep, "EMP-1008") === false && PS.canApprove(prep, "EMP-1001") === true);

// =====================================================================
section("G. #11 access/role-editor.html");
// Round 6H: the role page is drawn from roles.js / permissions.js (one row per module, its real actions as read-only
// ticks), so 4G's intent - only real payroll permissions, a true count - is checked against the drawn page.
fresh(); await open("access/role-editor.html", "aarav", "?role=hr");
const payrollRow = [...d.querySelectorAll("#matrix-rows tr")].find((tr) => txt(tr.querySelector(".matrix__module-name")) === "Payroll");
// A missing row (e.g. the old static page) is a FAIL with a reason, not a crash: the 6E pieces() / btn() pattern.
const offered = [...(payrollRow?.querySelectorAll(".perm-tick") ?? [])].map((t) => t.dataset.permissionKey);
check("G1", "the Payroll row shows exactly payroll's real permissions, view / create / approve / export, each in permissions.js",
  j(offered) === j(["payroll:view", "payroll:create", "payroll:approve", "payroll:export"]) && offered.every((p) => ALL_PERMISSIONS.includes(p)),
  payrollRow ? j(offered) : "(missing) no drawn Payroll row in #matrix-rows");
check("G2", "no payroll:edit / payroll:delete anywhere on the page; payroll:export is now shown (it had no column before 6H)",
  !/payroll:(edit|delete)/.test(d.documentElement.outerHTML) && j(ALL_PERMISSIONS.filter((p) => p.startsWith("payroll:") && !offered.includes(p))) === j([]));
const permMeta = () => txt(d.querySelector(".matrix")?.closest(".card")?.querySelector(".card__meta"));
const usersMeta = () => txt([...d.querySelectorAll(".card")].find((c) => /Users with this role/.test(c.textContent))?.querySelector(".card__meta"));
const ticked = () => [...d.querySelectorAll("#matrix-rows .perm-tick")].filter((t) => t.querySelector(".matrix__yes")).map((t) => t.dataset.permissionKey);
// Round 11N (behaviour; behaviour; was 77: users:delete (round 11N) is a 78th permission, so the page draws it)
// Round Manager scoping part 1 (behaviour; was 45 of 78: dashboard:finance is a 79th permission)
check("G3", "the count is on the Permissions card: HR's '49 of 91' (what roles.js grants; F1: was 49 of 90; L0: was 45 of 79); 'Users with this role' is the store's 1",
  permMeta() === `${ticked().length} of ${ALL_PERMISSIONS.length}` && permMeta() === "49 of 91" && usersMeta() === "1", `${permMeta()} / ${usersMeta()}`);
const hrPayroll = offered.filter((p) => ticked().includes(p));
await open("access/role-editor.html", "aarav", "?role=fin");
// Round 11N (behaviour; behaviour; was 77: users:delete (round 11N) is a 78th permission, so the page draws it)
// Round Manager scoping part 1 (behaviour; was 36 of 78: Finance also holds dashboard:finance, the 79th)
check("G4", "nothing to tick: HR holds no payroll permission; Finance (?role=fin) holds view / create / export, not approve; '42 of 91' (F1: was 42 of 90; L0: was 37 of 79; Round 7C: no pii:view; Manager scoping part 1: dashboard:finance)",
  hrPayroll.length === 0 && j(ticked().filter((p) => p.startsWith("payroll:"))) === j(["payroll:view", "payroll:create", "payroll:export"]) && permMeta() === "42 of 91" && !d.querySelector(".matrix input"), permMeta());

// =====================================================================
section("H. Who may not see payroll figures");
const runFigures = (r) => [money(PS.runTotals(r).gross), money(PS.runTotals(r).net), ...r.rows.map((x) => money(x.gross))];
for (const who of ["priya", "arjun", "oldAdmin"]) {
  fresh(); await open("dashboard/finance.html", who);
  // Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
  if (who === "oldAdmin") { check("H3", "an old Admin session (no employee id) is signed out and sent to sign in (round 11P, N2): no payroll figures drawn", navigations.length === 1 && localStorage.getItem("officeos:session") === null && stat("payroll")[1] !== "₹9,64,045" && tableRows($("fin-run-rows")).length !== 9, j([navigations.length, stat("payroll")])); continue; }
  const gated = [...d.querySelectorAll('main [data-permission="payroll:view"]')];
  blobs = [];
  d.querySelector("main [data-export]")?.click();
  const files = await csvFiles();
  const leaked = runFigures(sep()).filter((f) => d.documentElement.outerHTML.includes(f));
  // Round Manager scoping part 1 (behaviour; was: let in, the payroll cards hidden by the page's own gate: finance.html needs dashboard:finance now, which neither holds,
  // so the guard sends them to the 403 page; the page's own gates are checked on Finance with payroll:view denied, financeperm.mjs N4)
  check(who === "priya" ? "H1" : "H2", `${who} (no dashboard:finance) on finance.html: sent to the 403 page, and no payroll figure drawn: empty run table and bars, '—', no run figure anywhere in the DOM${who === "priya" ? ", none in an export" : ""}`,
    navigations.length === 1 && gated.length === 6 && $("fin-run-rows").children.length === 0 && $("fin-dept-bars").children.length === 0 && stat("payroll")[1] === "—" && leaked.length === 0
    && (who !== "priya" || !runFigures(sep()).some((f) => j(files).includes(f))), j([navigations.length, leaked, files]));
}
fresh(); await open("finance/tax-deductions.html", "priya");
check("H4", "tax page without tax:view (HR): sent to 403, nothing drawn", navigations.length === 1 && stat("tds")[1] === "—" && $("regime-bars").children.length === 0);
fresh(); await open("dashboard/finance.html", null);
check("H5", "finance.html with nobody signed in: sent to login, nothing drawn", navigations.length === 1 && stat("payroll")[1] === "—" && $("fin-run-rows").children.length === 0);

// =====================================================================
section("S. The '248' sweep: every in-scope page, as every seeded role that can open it");
const IN_SCOPE = ["dashboard/finance.html", "dashboard/admin.html", "dashboard/employee.html", "finance/tax-deductions.html", "requests/approvals-inbox.html", "account/notifications.html",
  "users/user-profile.html", "system/audit-log.html", "system/reports.html", "access/approval-workflows.html", "access/role-editor.html", "payroll/payroll-run.html"];
// Left on purpose (out of scope, reported): reports.html's 12-month headcount chart (headcount history, not payroll;
// there's no data to replace it with).
const ALLOWED = { "system/reports.html": ["Headcount growing from 212 to 248 over 12 months", "Sep 2026: 248"] };
const hits = [];
let opened = 0;
for (const page of IN_SCOPE) {
  for (const who of ROLES4) {
    fresh(); await open(page, who);
    if (navigations.length) continue;
    opened++;
    const text = visibleText().replace(/\s+/g, " ");
    const allowed = ALLOWED[page] ?? [];
    const rest = allowed.reduce((t, a) => t.replaceAll(a, ""), text);
    for (const m of rest.matchAll(/.{0,40}\b248\b.{0,20}/g)) hits.push(`${page}/${who}: ${m[0]}`);
  }
}
check("S1", `rendered: no '248' on any of the ${IN_SCOPE.length} pages, in text, titles or aria-labels, for any role that can open them (${opened} page loads), apart from reports.html's headcount chart`,
  hits.length === 0 && opened > 20, j(hits.slice(0, 5)));
const staticHits = IN_SCOPE.flatMap((p) => [...read(p).matchAll(/.{0,50}\b248\b.{0,30}/g)].map((m) => `${p}: ${m[0].trim()}`));
check("S2", "static HTML: the only '248's left are reports.html's chart and pre-script fallbacks that a page script always replaces (admin attendance card/table; payroll-run's went in Round 7B)",
  j(staticHits.map((h) => h.replace(/^([^:]+):.*?(248 total|of 248|>248<|212 to 248|: 248).*$/, "$1 $2"))) === j([
    "dashboard/admin.html 248 total", "dashboard/admin.html of 248",
    "system/reports.html 212 to 248", "system/reports.html : 248"]), j(staticHits));
fresh(); await open("dashboard/admin.html", "aarav");
const adminFallbacks = [txt($("headcount-meta")), txt($("admin-rows-meta"))];
check("S3", "…those admin fallbacks are replaced for a signed-in Admin ('9 total', 'Showing 1–9 of 9 employees')", j(adminFallbacks) === j(["9 total", "Showing 1–9 of 9 employees"]), j(adminFallbacks));
check("S4", "no '248' in any sidebar on any page, and no page anywhere says '248 active employees', '248 payslips' or '248 people'",
  sidebarPages.every((p) => !/248/.test(read(p).slice(read(p).indexOf('class="sidebar"'), read(p).indexOf("</aside>")))) && sidebarPages.every((p) => !/248 (active employees|payslips|people)/.test(read(p))));

// =====================================================================
section("L. Source layout (frozen copies: js-pre4G / js-post4G, html-pre4G / html-post4G)");
const walk = (root, sub = "") => fs.readdirSync(new URL(`./${root}/${sub}`, import.meta.url), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(root, `${sub}${e.name}/`) : [`${sub}${e.name}`])).sort();
const changedIn = (pre, post) => [...new Set([...walk(pre), ...walk(post)])].filter((p) => { try { return frozen(pre, p) !== frozen(post, p); } catch { return true; } }).sort();
const lines = (dir, p) => { try { return frozen(dir, p).split("\r\n"); } catch { return []; } };
// Lines removed / added between two versions (a multiset diff, enough for these small edits).
function delta(p, preDir = "js-pre4G", postDir = "js-post4G") {
  const a = lines(preDir, p), b = lines(postDir, p);
  const count = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
  const ca = count(a), cb = count(b);
  const removed = [...ca].flatMap(([x, n]) => Array(Math.max(0, n - (cb.get(x) ?? 0))).fill(x));
  const added = [...cb].flatMap(([x, n]) => Array(Math.max(0, n - (ca.get(x) ?? 0))).fill(x));
  return { removed, added };
}
const JS_CHANGED = ["app.js", "data/payroll-store.js", "data/store.js", "pages/admin-dashboard.js", "pages/employee-dashboard.js", "pages/finance-dashboard.js",
  "pages/payroll-run.js", "pages/role-editor.js", "pages/tax-deductions.js", "pages/user-profile.js", "ui/sidebar.js"];
check("L1", "js: exactly these 11 files changed or added (2 new page scripts); config/, data/payroll.js and every other module untouched", j(changedIn("js-pre4G", "js-post4G")) === j(JS_CHANGED), j(changedIn("js-pre4G", "js-post4G")));
const pr = delta("pages/payroll-run.js");
check("L2", "payroll-run.js: only renderHeadcount() (its comment, body and call) removed, nothing added; it still imports getAllUsers (the approver list uses it)",
  pr.added.length === 0 && pr.removed.length === 10 && pr.removed.some((l) => l === "function renderHeadcount() {") && pr.removed.includes("  renderHeadcount();") && /getAllUsers\(\)/.test(frozen("js-post4G", "pages/payroll-run.js")), j(pr.removed));
const ps = delta("data/payroll-store.js");
check("L3", "payroll-store.js: only RUN_MONTH added (5 comment/code lines + a blank), nothing removed; no pay logic touched",
  ps.removed.length === 0 && ps.added.filter((l) => l.trim()).length === 5 && ps.added.includes("export const RUN_MONTH = { year: 2026, month: 9 };"), j(ps.added));
const st = delta("data/store.js");
check("L4", "store.js: only activeHeadcount() added, nothing removed", st.removed.length === 0 && st.added.includes("export function activeHeadcount() {") && st.added.filter((l) => l.trim()).length === 5, j(st.added));
const PAGE_SCRIPTS = ["pages/finance-dashboard.js", "pages/tax-deductions.js", "pages/admin-dashboard.js", "pages/employee-dashboard.js", "pages/user-profile.js", "ui/sidebar.js"];
check("L5", "no new or changed script formats rupees itself: no toLocaleString / '₹' template, rupees comes from ui/money.js; no innerHTML in the new scripts",
  PAGE_SCRIPTS.every((p) => !/toLocaleString|`₹/.test(frozen("js-post4G", p))) && ["pages/finance-dashboard.js", "pages/tax-deductions.js", "pages/admin-dashboard.js", "pages/user-profile.js"].every((p) => /import \{[^}]*\brupees\b[^}]*\} from "\.\.\/ui\/money\.js";/.test(frozen("js-post4G", p)))
  && ["pages/finance-dashboard.js", "pages/tax-deductions.js"].every((p) => !/innerHTML|outerHTML|insertAdjacentHTML/.test(frozen("js-post4G", p))));
check("L6", "the new page scripts read the run through payrollRun(RUN_MONTH) and work out no pay (no computePay / splitGross / monthlyTds / salary maths)",
  ["pages/finance-dashboard.js", "pages/tax-deductions.js", "pages/admin-dashboard.js"].every((p) => /payrollRun\(RUN_MONTH\.year, RUN_MONTH\.month\)/.test(frozen("js-post4G", p)) && !/computePay|splitGross|monthlyTds|annualTax|\* 0\.\d|\* 12\b/.test(frozen("js-post4G", p))));
const htmlChanged = changedIn("html-pre4G", "html-post4G");
const footerOnly = htmlChanged.filter((p) => { const x = delta(p, "html-pre4G", "html-post4G"); return x.removed.length === 1 && x.added.length === 1 && x.added[0] === '      <span id="sidebar-headcount"></span>'; });
const CONTENT = ["access/approval-workflows.html", "access/role-editor.html", "account/notifications.html", "dashboard/admin.html", "dashboard/employee.html", "dashboard/finance.html",
  "finance/tax-deductions.html", "requests/approvals-inbox.html", "system/audit-log.html", "system/reports.html", "users/user-profile.html"];
check("L7", "HTML: 46 pages changed; 35 only in the sidebar line (payroll-run.html: its span emptied), the other 11 are this round's pages",
  htmlChanged.length === 46 && footerOnly.length === 35 && j(htmlChanged.filter((p) => !footerOnly.includes(p))) === j(CONTENT), j(htmlChanged.filter((p) => !footerOnly.includes(p))));
const prh = delta("payroll/payroll-run.html", "html-pre4G", "html-post4G");
check("L8", "payroll-run.html: one line, the span's '248 active employees' text emptied; payslips / payslip-view / salary-structure HTML: the sidebar line only; their js untouched",
  j(prh) === j({ removed: ['      <span id="sidebar-headcount">248 active employees</span>'], added: ['      <span id="sidebar-headcount"></span>'] })
  && ["payroll/payslips.html", "payroll/payslip-view.html", "payroll/salary-structure.html"].every((p) => footerOnly.includes(p))
  && ["pages/payslips.js", "pages/payslip-view.js", "pages/salary-structure.js"].every((p) => frozen("js-pre4G", p) === frozen("js-post4G", p)));
check("L9", "every changed file keeps CRLF line endings and no final newline",
  [...JS_CHANGED.map((p) => frozen("js-post4G", p)), ...htmlChanged.map((p) => frozen("html-post4G", p))].every((s) => !/[^\r]\n/.test(s) && !s.startsWith("\n") && !s.endsWith("\n")));
check("L10", "both new scripts are loaded by their pages, after app.js",
  /assets\/js\/app\.js"><\/script>\r\n<script type="module" src="\.\.\/\.\.\/assets\/js\/pages\/finance-dashboard\.js"><\/script>/.test(frozen("html-post4G", "dashboard/finance.html"))
  && /assets\/js\/app\.js"><\/script>\r\n<script type="module" src="\.\.\/\.\.\/assets\/js\/pages\/tax-deductions\.js"><\/script>/.test(frozen("html-post4G", "finance/tax-deductions.html")));
// Round Manager scoping part 1 (behaviour; was finance.html dashboard:view: it needs dashboard:finance now, Finance and Admin; the page still gates its payroll parts itself)
check("L11", "routes: finance.html dashboard:finance (Manager scoping part 1), admin.html attendance:view-all, tax page tax:view",
  ROUTES["dashboard/finance.html"] === "dashboard:finance" && ROUTES["dashboard/admin.html"] === "attendance:view-all" && ROUTES["finance/tax-deductions.html"] === "tax:view");

check("ERR", "no uncaught JS errors across all page loads", allErrors.length === 0, allErrors.slice(0, 3).join(" / ") || `none (${loads} page loads)`);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
