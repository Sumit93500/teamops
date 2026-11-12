// usage: node admdash.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 3F-3: dashboard/admin.html with the js in ./js, in jsdom, plus summaryRange() in the store.
// The clock is local wall time, Wed 30 Sep 2026 11:00 unless a test moves it; the seed is generated
// around "now" when storage is first read, so each scenario sets the clock before fresh().
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HTML = fs.readFileSync(`${DIR}/dashboard/admin.html`, "utf8");
const TEAM = fs.readFileSync(`${DIR}/attendance/team-attendance.html`, "utf8");
const SCRIPT = fs.readFileSync(new URL("./js/pages/admin-dashboard.js", import.meta.url), "utf8");

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
  kabir: ["fin", "Kabir Shah", "EMP-1008"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"], old: ["hr", "Priya Nair", undefined],
};

let loads = 0, w = null, d = null, saved = {};
const jsErrors = [], htmlWrites = [];
let navigations = [];
async function open(who = "aarav", page = "admin") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(`${who}: ${e.message}`); else jsErrors.push(`${who}: ${e.message}`); });
  const path = page === "admin" ? "dashboard/admin.html" : "attendance/team-attendance.html";
  const dom = new JSDOM(page === "admin" ? HTML : TEAM, { url: `http://localhost/office-os/pages/${path}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  const proto = w.Element.prototype;
  const inner = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", { get: inner.get, set(v) { htmlWrites.push(String(v)); inner.set.call(this, v); }, configurable: true });
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  navigations = [];
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  const script = page === "admin" ? "admin-dashboard" : "team-attendance";
  try { await import(`./js/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }
async function at(y, mo, dd, h, mi, who = "aarav") { setNow(y, mo, dd, h, mi); fresh(); await open(who); }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;

// ---- readers ----
const $ = (id) => d.getElementById(id);
function parts(node) {
  const out = [];
  const walker = node.ownerDocument.createTreeWalker(node, 4);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) { if (t.parentElement.closest(".avatar")) continue; const v = t.textContent.replace(/\s+/g, " ").trim(); if (v) out.push(v); }
  return out.join(" ");
}
const stat = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return `${txt(s.querySelector(".stat__value"))} (${txt(s.querySelector(".stat__delta"))})`; };
const bars = () => [...$("rate-chart").querySelectorAll(".chart__bar")].map((b) => `${b.title}|${b.className.replace("chart__bar", "").replace("chart__bar--", "").trim()}|${b.style.getPropertyValue("--h")}`);
const barOn = (label) => bars().find((b) => b.startsWith(label));
const rows = () => [...$("admin-rows").querySelectorAll("tr")].map((tr) => [...tr.children].map(parts));
const names = () => [...$("admin-rows").querySelectorAll(".table__user-name")].map(txt);
const rowOf = (name) => rows().find((r) => r[0].startsWith(name));
const badgeOf = (name) => [...$("admin-rows").querySelectorAll("tr")].find((tr) => txt(tr.querySelector(".table__user-name")) === name)?.children[3].querySelector(".badge")?.className.replace("badge ", "");
const meta = () => txt($("admin-rows-meta"));
const heads = () => [...$("headcount-bars").querySelectorAll(".bar-row")].map((b) => `${txt(b.children[0])}=${txt(b.children[2])}@${b.querySelector(".bar-row__fill").style.getPropertyValue("--w")}`);
const search = (v) => { const i = $("admin-search"); i.value = v; i.dispatchEvent(new w.Event("input", { bubbles: true })); };
const pickDept = (v) => { const s = $("admin-dept"); s.value = v; s.dispatchEvent(new w.Event("change", { bubbles: true })); };
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => txt(t.querySelector(".toast__text")));

const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const A = await import("./js/data/attendance-store.js");
const L = await import("./js/data/leave-store.js");
const ROUTES = (await import("./js/config/routes.js")).ROUTES;
const STATIC = new JSDOM(HTML).window.document;
const sameMain = () => d.querySelector("main").innerHTML.replaceAll(' hidden=""', "") === STATIC.querySelector("main").innerHTML;
const same = (sel) => d.querySelector(sel)?.outerHTML === STATIC.querySelector(sel)?.outerHTML;
const ALL9 = ["Aarav Mehta", "Ananya Iyer", "Arjun Kapoor", "Kabir Shah", "Meera Joshi", "Priya Nair", "Rohan Gupta", "Sneha Rao", "Vikram Singh"];

// =====================================================================
section("summaryRange() in the store");
await at(2026, 9, 30, 11, 0);
const range = A.summaryRange("2026-09-17", "2026-09-30");
check("SR1", "14 summaries, oldest first, both ends included", range.length === 14 && range[0].date === "2026-09-17" && range[13].date === "2026-09-30");
check("SR2", "each equals summaryFor() for its date (same shape and numbers)", range.every((s) => j(s) === j(A.summaryFor(s.date))));
check("SR3", "across a holiday (5 Oct range): 2 Oct is off for everyone", (() => { const r = A.summaryRange("2026-09-28", "2026-10-05"); return r.length === 8 && r.find((s) => s.date === "2026-10-02").off === 9 && r.find((s) => s.date === "2026-10-02").expected === 0; })());
check("SR4", "one day when from = to; [] when to is before from; null for a bad date; capped at 366", A.summaryRange("2026-09-30", "2026-09-30").length === 1 && j(A.summaryRange("2026-09-30", "2026-09-29")) === "[]" && A.summaryRange("2026-02-30", "2026-03-01") === null && A.summaryRange("2024-01-01", "2026-09-30").length === 366);
check("SR5", "inactive people aren't counted (total 9, Divya left out)", range.every((s) => s.total === 9));

section("Aarav (Admin), Wed 30 Sep 11:00");
const sum = A.summaryFor("2026-09-30");
check("A1", "subtitle uses the real month", txt($("dash-subtitle")) === "Company overview for September 2026");
check("A2", "Present today: 4 = 50% of 8 expected (not of 9, not of 248)", stat("present") === "4 (50% of 8 expected)" && sum.present === 4 && sum.expected === 8, stat("present"));
check("A3", "chart: 17 – 30 Sep, weekends muted with no rate, past working days real (100%), today faded 'so far'", txt($("rate-range")) === "17 – 30 Sep" && j(bars()) === j([
  "Thu, 17 Sep: 100% (9 of 9 expected)||100", "Fri, 18 Sep: 100% (9 of 9 expected)||100", "Sat, 19 Sep: day off|muted|0", "Sun, 20 Sep: day off|muted|0",
  "Mon, 21 Sep: 100% (8 of 8 expected)||100", "Tue, 22 Sep: 100% (8 of 8 expected)||100", "Wed, 23 Sep: 100% (8 of 8 expected)||100", "Thu, 24 Sep: 100% (8 of 8 expected)||100",
  "Fri, 25 Sep: 100% (8 of 8 expected)||100", "Sat, 26 Sep: day off|muted|0", "Sun, 27 Sep: day off|muted|0", "Mon, 28 Sep: 100% (8 of 8 expected)||100",
  "Tue, 29 Sep: 100% (8 of 8 expected)||100", "Wed, 30 Sep: 50% so far (4 of 8 expected)|progress|50"]), j(bars()));
check("A4", "…aria-label leaves the partial day out; note explains the faded bar", $("rate-chart").getAttribute("aria-label") === "Attendance rate, 17 – 30 Sep: between 100 and 100 percent on working days" && txt($("rate-note")) === "Present out of expected. Weekends and holidays are shown lighter; today is faded until the shift ends.", $("rate-chart").getAttribute("aria-label"));
check("A5", "table: all 9 active employees by name, 'Showing 1–9 of 9 employees'", j(names()) === j(ALL9) && meta() === "Showing 1–9 of 9 employees", `${j(names())} ${meta()}`);
check("A6", "late, on leave and overdue rows show correctly with the shared badges", j(rowOf("Vikram Singh")) === j(["Vikram Singh vikram.singh@northwind.com", "EMP-1088", "Operations", "Late", "10:24", "0h 36m so far"])
  && j(rowOf("Meera Joshi")) === j(["Meera Joshi meera.joshi@northwind.com", "EMP-1023", "Finance", "On leave", "–", "–"])
  && badgeOf("Aarav Mehta") === "badge--dot badge--overdue" && badgeOf("Vikram Singh") === "badge--warning badge--dot", j([rowOf("Vikram Singh"), rowOf("Meera Joshi"), badgeOf("Aarav Mehta")]));
check("A7", "department names are the real ones, incl. Customer Support; select values are codes", j([...$("admin-dept").options].map((o) => `${o.value}:${o.textContent}`)) === j([":All departments", "ENG:Engineering", "SAL:Sales", "OPS:Operations", "SUP:Customer Support", "FIN:Finance", "HR:Human Resources"]) && rowOf("Priya Nair")[2] === "Human Resources");
check("A8", "headcount by department: real counts (9 active; SUP 0), bars relative to the largest", txt($("headcount-meta")) === "9 total" && j(heads()) === j(["Engineering=4@100%", "Sales=1@25%", "Operations=1@25%", "Customer Support=0@0%", "Finance=2@50%", "Human Resources=1@25%"]), j(heads()));
check("A9", "Divya (inactive) appears nowhere", !/Divya|EMP-1061/.test(txt(d.querySelector("#admin-rows"))));
check("A10", "one page: Previous and Next both disabled, Next is no longer a placeholder", $("admin-prev").disabled && $("admin-next").disabled && !$("admin-next").dataset.notImplemented);
// Round 9B (behaviour; was "out-of-scope parts untouched: Low-stock stat, Pending approvals, Recent activity", each
// equal to the static HTML): 9B draws all three from the stores (boards.mjs B / C / D test them in full). Add employee
// is still out of scope and untouched.
const I9 = await import("./js/data/inventory-store.js"), W9 = await import("./js/ui/waiting.js");
const waiting9 = W9.waitingCount("EMP-1001", "admin");
check("A11", "Round 9B: Low-stock (reorderAlerts()), Pending approvals (waitingFor()) and Recent activity (the stores' histories) are drawn, no longer static samples; Add employee untouched",
  stat("stock") === `${I9.reorderAlerts().length} (1 out of stock, 3 low)` && txt(d.querySelector("#admin-approvals .card__meta")) === `${Math.min(4, waiting9)} of ${waiting9} shown`
  && d.querySelectorAll("#admin-activity .activity__item").length === 5 && txt($("admin-activity-meta")) === "Leave, corrections, expenses, asset requests and stock"
  && same('main [data-not-implemented="Add employee"]'), `${stat("stock")} | ${txt(d.querySelector("#admin-approvals .card__meta"))} | ${d.querySelectorAll("#admin-activity .activity__item").length}`);
check("A12", "no page errors", jsErrors.length === 0, j(jsErrors));

section("Admin and HR see the same numbers; team-attendance agrees");
const aaravView = [stat("present"), j(bars()), j(rows()), j(heads())];
await open("priya");
check("H1", "Priya (HR, has attendance:view-all) sees exactly what Aarav sees for the same moment", j([stat("present"), j(bars()), j(rows()), j(heads())]) === j(aaravView) && navigations.length === 0);
await open("aarav", "team");
const teamPresent = `${txt(d.querySelector('[data-stat="present"] .stat__value'))} (${txt(d.querySelector('[data-stat="present"] .stat__delta'))})`;
check("H2", "team-attendance.html shows the same Present stat", teamPresent === aaravView[0], teamPresent);

section("Filters: department + search, empty states");
await open("aarav");
pickDept("ENG");
check("F1", "Engineering: 4 people; footer shows the filtered count and the total", j(names()) === j(["Aarav Mehta", "Arjun Kapoor", "Rohan Gupta", "Sneha Rao"]) && meta() === "Showing 1–4 of 4 employees (9 active)", meta());
search("ar");
check("F2", "Engineering + 'ar': Aarav and Arjun", j(names()) === j(["Aarav Mehta", "Arjun Kapoor"]) && meta() === "Showing 1–2 of 2 employees (9 active)", meta());
search("zzz");
check("F3", "no match: 'No employees match these filters.' and 'Showing 0 of 0 employees (9 active)'", txt($("admin-rows")) === "No employees match these filters." && meta() === "Showing 0 of 0 employees (9 active)", meta());
search(""); pickDept("SUP");
check("F4", "Customer Support (nobody in it): the empty row", txt($("admin-rows")) === "No employees match these filters.");
pickDept(""); search("NAIR");
check("F5", "search ignores case: 'NAIR' finds Priya; one match says 'employee'", j(names()) === j(["Priya Nair"]) && meta() === "Showing 1–1 of 1 employee (9 active)", meta());
search("");
check("F6", "cleared: all 9 again", names().length === 9 && meta() === "Showing 1–9 of 9 employees");
check("F7", "the generic table filter is off for this search box", $("admin-search").dataset.tableFilter === "off");
blobs = [];
pickDept("OPS");
d.querySelector("[data-export]").click();
const files = await Promise.all(blobs.map(async (b) => (await b.text()).replace(/^﻿/, "").split("\r\n")));
const csv = files.find((f) => f[0].startsWith("Employee")) ?? [];
check("F8", "Export (the generic one) writes the table's visible rows (plus its existing stat-card file)", files.length === 2 && csv.length === 2 && csv[1].startsWith("Vikram Singh,vikram.singh@northwind.com,EMP-1088,Operations,Late,10:24") /* Round Data export part 2 (behaviour; was the name and work email in one cell) */ && files.some((f) => f[0] === "Metric,Value"), j(csv));

section("Pagination with more people");
await at(2026, 9, 30, 11, 0);
["Zara Khan", "Yusuf Ali", "Xavier Dsouza"].forEach((name, i) => S.addUser(USER_ACTOR("admin", null), { name, email: `x${i}@northwind.com`, department: "SUP", designation: "Support", role: "emp", status: "active" }));
await open("aarav");
check("P1", "12 active: page 1 shows 10, 'Showing 1–10 of 12 employees'; Previous off, Next on", names().length === 10 && meta() === "Showing 1–10 of 12 employees" && $("admin-prev").disabled && !$("admin-next").disabled, meta());
$("admin-next").click();
check("P2", "Next: 11–12 (Yusuf Ali, Zara Khan); Next off, Previous on; no placeholder toast", j(names()) === j(["Yusuf Ali", "Zara Khan"]) && meta() === "Showing 11–12 of 12 employees" && $("admin-next").disabled && !$("admin-prev").disabled && toasts().length === 0, `${meta()} ${j(toasts())}`);
$("admin-prev").click();
check("P3", "Previous: back to page 1", names().length === 10 && meta() === "Showing 1–10 of 12 employees");
check("P4", "headcount and the stat follow: Customer Support 3, 12 total; present 4 of 11 expected", txt($("headcount-meta")) === "12 total" && heads()[3] === "Customer Support=3@75%" && stat("present") === "4 (36.4% of 11 expected)", `${j(heads())} ${stat("present")}`);
pickDept("SUP");
check("P5", "a filter goes back to page 1 and the pager turns off", meta() === "Showing 1–3 of 3 employees (12 active)" && $("admin-next").disabled);

section("Other days and times (HR on a later date)");
await at(2026, 9, 30, 19, 0, "priya");
check("O1", "19:00: the 4 who never came in are Absent; today's bar is final (not faded)", stat("present") === "4 (50% of 8 expected)" && badgeOf("Aarav Mehta") === "badge--danger badge--dot" && barOn("Wed, 30 Sep") === "Wed, 30 Sep: 50% (4 of 8 expected)||50", barOn("Wed, 30 Sep"));
check("O2", "…and the note no longer mentions a faded today", txt($("rate-note")) === "Present out of expected. Weekends and holidays are shown lighter.");
await at(2026, 10, 5, 11, 0, "priya");
check("O3", "Mon 5 Oct (HR): Fri 2 Oct holiday and the weekend are muted with no rate; Meera back from leave (8 → 9 expected)", barOn("Fri, 2 Oct") === "Fri, 2 Oct: day off|muted|0" && barOn("Sat, 3 Oct") === "Sat, 3 Oct: day off|muted|0" && barOn("Thu, 1 Oct").includes("of 8 expected") && stat("present").endsWith("of 9 expected)") && txt($("dash-subtitle")) === "Company overview for October 2026", `${barOn("Fri, 2 Oct")} ${barOn("Thu, 1 Oct")} ${stat("present")}`);
check("O4", "…different real data from 30 Sep: Meera is Overdue now, not On leave", badgeOf("Meera Joshi") === "badge--dot badge--overdue", badgeOf("Meera Joshi"));
await at(2026, 10, 3, 11, 0, "aarav");
check("O5", "on a weekend: nobody expected, the stat says why", stat("present") === "0 (Weekend)", stat("present"));
await at(2026, 9, 30, 11, 0, "aarav");
// Round 10V (decision; was the leave sent through the live store): Rohan checked in on 30 Sep, and leave can't cover
// such a day any more (workedday.mjs), so the live refusal is pinned and the leave is data made before 10V, through the
// pre-10V leave store (js-pre10V)
const L10V0 = await import("./js-pre10V/data/leave-store.js");
const lvLive = L.applyLeave("EMP-1042", { type: "sick", from: "2026-09-30", to: "2026-09-30", duration: "full", reason: "Fever" });
const lv = L10V0.applyLeave("EMP-1042", { type: "sick", from: "2026-09-30", to: "2026-09-30", duration: "full", reason: "Fever" });
L10V0.decideLeave(lv.record?.id, "EMP-1003", "hr", "approve");
await open("aarav");
check("O6", "a check-in on a day of approved leave (made before 10V; refused now) still counts as present (Rohan), matching team-attendance", lvLive.error === "You checked in on 2026-09-30, so leave can't cover that day. If the check-in times are wrong, ask for a correction instead." && rowOf("Rohan Gupta")[3] === "Present" && stat("present") === "4 (50% of 8 expected)", `${rowOf("Rohan Gupta")[3]} ${stat("present")}`);

section("Access");
check("G1", "admin.html needs attendance:view-all, the same as team-attendance.html", ROUTES["dashboard/admin.html"] === "attendance:view-all" && ROUTES["attendance/team-attendance.html"] === "attendance:view-all");
check("G2", "the script checks the same permission (guard.js only redirects)", /can\("attendance:view-all"\)/.test(SCRIPT));
for (const who of ["kabir", "arjun"]) {
  await at(2026, 9, 30, 11, 0, who);
  check("G", `${who} (no attendance:view-all): sent to 403, the script draws nothing`, navigations.length === 1 && sameMain(), `nav=${navigations.length}`);
}
await at(2026, 9, 30, 11, 0, "old");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("G5", "old session (no employee id): signed out and sent to sign in (round 11P, N2); the static page is left as it is", sameMain() && navigations.length === 1 && localStorage.getItem("officeos:session") === null);
// Round 9B (behaviour; was "its static Approve/Reject stay placeholders"): the sample Pending approvals card is gone, so
// the static page has no Approve/Reject buttons at all (approvals.mjs P4 expects 0 for this page now)
check("G6", "Round 9B: …and it has no Approve/Reject buttons at all (the sample card and its placeholders are gone)", [...d.querySelectorAll("main button")].filter((b) => /^(Approve|Reject)$/.test(txt(b))).length === 0);

section("No innerHTML with data");
check("I1", "the script never uses innerHTML / outerHTML / insertAdjacentHTML", !/innerHTML|outerHTML|insertAdjacentHTML/.test(SCRIPT));
check("I2", "no HTML string written at run time held a person's name or email", !htmlWrites.some((h) => /Kapoor|Rao|Nair|Mehta|Shah|Gupta|Singh|Joshi|Iyer|northwind/.test(h)), `${htmlWrites.length} writes`);
await at(2026, 9, 30, 11, 0);
S.updateUser(USER_ACTOR("admin", "EMP-1017"), "EMP-1017", { name: '<img src=x onerror="window.pwned=1">Ananya' });
await open("aarav");
check("I3", "a name with markup is plain text in the table; no <img> in main", !d.querySelector("main img") && names().includes('<img src=x onerror="window.pwned=1">Ananya') && !w.pwned);
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
