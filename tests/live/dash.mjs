// usage: node dash.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 3F-1: dashboard/employee.html with the js in ./js, in jsdom, plus rangeFor() in the store.
// The clock is local wall time; each scenario sets it before a fresh seed. "Today" is Wed 30 Sep 2026
// 11:00 unless a test says otherwise. localStorage carries over between page loads until fresh().
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HTML = fs.readFileSync(`${DIR}/dashboard/employee.html`, "utf8");
const MYATT = fs.readFileSync(`${DIR}/attendance/my-attendance.html`, "utf8");
const SCRIPT = fs.readFileSync(new URL("./js/pages/employee-dashboard.js", import.meta.url), "utf8");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 9, 30, 11, 0);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const WHO = {
  arjun: ["emp", "Arjun Kapoor", "EMP-1105"], sneha: ["emp", "Sneha Rao", "EMP-1029"], rohan: ["emp", "Rohan Gupta", "EMP-1042"],
  vikram: ["emp", "Vikram Singh", "EMP-1088"], meera: ["emp", "Meera Joshi", "EMP-1023"], ananya: ["emp", "Ananya Iyer", "EMP-1017"],
  kabir: ["fin", "Kabir Shah", "EMP-1008"], priya: ["hr", "Priya Nair", "EMP-1003"], aarav: ["admin", "Aarav Mehta", "EMP-1001"],
  old: ["emp", "Arjun Kapoor", undefined],
};

let loads = 0, w = null, d = null, saved = {};
const jsErrors = [], htmlWrites = [];
let navigations = [];
async function open(who = "arjun", page = "dash") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(`${who}: ${e.message}`); else jsErrors.push(`${who}: ${e.message}`); });
  const url = page === "dash" ? "dashboard/employee.html" : "attendance/my-attendance.html";
  const dom = new JSDOM(page === "dash" ? HTML : MYATT, { url: `http://localhost/office-os/pages/${url}`, virtualConsole: vc });
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
  const script = page === "dash" ? "employee-dashboard" : "my-attendance";
  try { await import(`./js/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }
async function at(y, mo, dd, h, mi, who = "arjun") { setNow(y, mo, dd, h, mi); fresh(); await open(who); }

const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const L = await import("./js/data/leave-store.js");
const A = await import("./js/data/attendance-store.js");
console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
// Round 14E part 2 (layout): a node's text without the reason lines showReason() adds under a badge or note (class reason); reasons2.mjs pins those lines
const txt = (node) => { if (!node) return null; const c = node.cloneNode(true); c.querySelectorAll?.(".reason").forEach((r) => r.remove()); return c.textContent.replace(/\s+/g, " ").trim(); };
const j = JSON.stringify;
const hm = (m) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;   // independent of the page's hoursText

// ---- readers ----
const $ = (id) => d.getElementById(id);
function parts(node) {
  const out = [];
  const walker = node.ownerDocument.createTreeWalker(node, 4);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) { const v = t.textContent.replace(/\s+/g, " ").trim(); if (v) out.push(v); }
  return out.join(" ");
}
const stat = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return `${txt(s.querySelector(".stat__value"))} (${txt(s.querySelector(".stat__delta"))})`; };
const bars = () => [...$("hours-chart").querySelectorAll(".chart__bar")].map((b) => ({ title: b.title, mod: b.className.replace("chart__bar", "").trim(), h: b.style.getPropertyValue("--h") }));
const barOn = (label) => bars().find((b) => b.title.startsWith(label));
const labels = () => [...$("hours-chart").querySelectorAll(".chart__label")].map(txt).join(",");
const reqItems = () => [...$("my-requests-list").querySelectorAll(".list__item")].map(parts);
const balance = () => [...$("balance-card").querySelectorAll(".bar-row")].map((b) => `${txt(b.children[0])}=${txt(b.children[2])}@${b.querySelector(".bar-row__fill").style.getPropertyValue("--w")}`);
const balanceNote = () => txt($("balance-card").querySelector("p"));
const upd = () => [...$("updates").querySelectorAll(".activity__item")].map(parts);
const days = () => [...$("my-days").querySelectorAll("tr")].map((tr) => [...tr.children].map(txt));
const badgeClass = (row) => [...$("my-days").querySelectorAll("tr")][row]?.children[4].querySelector(".badge")?.className;
const STATIC = new JSDOM(HTML).window.document;
const staticText = (sel) => txt(STATIC.querySelector(sel));
const sameMain = () => d.querySelector("main").innerHTML.replaceAll(' hidden=""', "") === STATIC.querySelector("main").innerHTML;
// The same person's Days present on my-attendance.html, to compare wording and numbers.
async function myattPresent(who) { await open(who, "myatt"); const s = d.querySelectorAll("#month-stats .stat")[0]; const v = txt(s.querySelector(".stat__value")); await open(who); return v; }

// =====================================================================
section("rangeFor() in the store");
await at(2026, 9, 30, 11, 0, "arjun");   // a window, so the store reads jsdom's localStorage
const r14 = A.rangeFor("EMP-1105", "2026-09-17", "2026-09-30");
check("R1", "14 days, oldest first, both ends included", r14.length === 14 && r14[0].date === "2026-09-17" && r14[13].date === "2026-09-30", `${r14.length} ${r14[0]?.date}..${r14[13]?.date}`);
check("R2", "each day equals dayFor() for the same person and date", r14.every((day) => j(day) === j(A.dayFor("EMP-1105", day.date))));
check("R3", "across a month boundary (25 Sep - 5 Oct): 11 days, holiday and weekend statuses from the store", (() => { const r = A.rangeFor("EMP-1105", "2026-09-25", "2026-10-05"); return r.length === 11 && r.find((x) => x.date === "2026-10-02").status === "holiday" && r.find((x) => x.date === "2026-10-03").status === "weekend"; })());
check("R4", "one day when from = to; [] when to is before from", A.rangeFor("EMP-1105", "2026-09-28", "2026-09-28").length === 1 && j(A.rangeFor("EMP-1105", "2026-09-28", "2026-09-27")) === "[]");
check("R5", "null for an unknown or inactive person or a bad date", A.rangeFor("EMP-9999", "2026-09-01", "2026-09-02") === null && A.rangeFor("EMP-1061", "2026-09-01", "2026-09-02") === null && A.rangeFor("EMP-1105", "2026-02-30", "2026-03-02") === null);
check("R6", "capped at a year (366 days)", A.rangeFor("EMP-1105", "2024-01-01", "2026-09-30").length === 366);
check("R7", "matches monthFor() for a whole month", j(A.rangeFor("EMP-1105", "2026-09-01", "2026-09-30")) === j(A.monthFor("EMP-1105", 2026, 9).days));

section("Arjun (Employee), Wed 30 Sep 11:00");
await at(2026, 9, 30, 11, 0, "arjun");
const mArjun = A.monthFor("EMP-1105", 2026, 9);
check("A1", "subtitle uses the real month", txt($("dash-subtitle")) === "Your attendance and requests for September 2026");
check("A2", "Days present 21 / 21 (today not in yet), '1 late mark' in the down colour", stat("present") === "21 / 21 (1 late mark)" && d.querySelector('[data-stat="present"] .stat__delta').className === "stat__delta stat__delta--down" && mArjun.daysWorked === 21 && mArjun.lateMarks === 1, stat("present"));
check("A3", "…same number my-attendance shows for Arjun", (await myattPresent("arjun")) === "21 / 21");
// Round 9L (behaviour; was "30 days (Casual 10, Earned 10, Sick 6, WFH 4)"): leave days only; work from home is a
// working day with a monthly allowance, so it stays on the card (below) but not in the total
check("A4", "Leave balance: 26 days = Casual 10 + Earned 10 + Sick 6, most first (Round 9L: WFH 4 no longer added)", stat("balance") === "26 days (Casual 10, Earned 10, Sick 6)", stat("balance"));
// Round 14E part 4 (behaviour; was 2 (1 leave, 1 asset): Open requests now counts what My requests lists under Pending, his expense claim too)
check("A5", "Open requests 3: 1 pending leave (LV-2201), his pending expense claim and his asset request ARQ-1 (real since 6E)", stat("requests") === "3 (1 leave, 1 claim, 1 asset)", stat("requests"));
check("A6", "Next payslip: this month's payslip as payslips.html shows it (Round 4G)", stat("payslip") === "Sep 2026 (Draft, not paid yet; no pay date set)", stat("payslip"));
check("A7", "chart: 14 bars 17 Sep – 30 Sep, labels 17..30, meta '17 – 30 Sep'", bars().length === 14 && labels() === "17,18,19,20,21,22,23,24,25,26,27,28,29,30" && txt($("hours-range")) === "17 – 30 Sep", `${labels()} ${txt($("hours-range"))}`);
check("A8", "worked days: height = hours × 10 from the store (Thu 24 Sep 8.3 h, late)", j(barOn("Thu, 24 Sep")) === j({ title: "Thu, 24 Sep: 8.3 hours, late", mod: "", h: "83" }) && barOn("Mon, 28 Sep").h === String(Math.round(r14[11].minutesWorked / 6)), j(barOn("Thu, 24 Sep")));
check("A9", "weekends are muted, height 0, 'day off'", ["Sat, 19 Sep", "Sun, 20 Sep", "Sat, 26 Sep", "Sun, 27 Sep"].every((l) => j(barOn(l)) === j({ title: `${l}: day off`, mod: "chart__bar--muted", h: "0" })));
check("A10", "today, not in yet and past 09:45: no bar, title says overdue", j(barOn("Wed, 30 Sep")) === j({ title: "Wed, 30 Sep: not checked in yet (overdue)", mod: "", h: "0" }));
check("A11", "chart aria-label summarises the real range", $("hours-chart").getAttribute("aria-label") === "Working hours, 17 – 30 Sep: 9 days worked, between 8.3 and 9.5 hours", $("hours-chart").getAttribute("aria-label"));
check("A12", "My requests: newest pending (Casual leave, 5 Oct, sent 18 Sep: newer than his asset request of 17 Sep); the static laptop row gone (6E)", j(reqItems()) === j(["L Casual leave, 5 Oct Waiting for Sneha Rao Pending"]), j(reqItems()));
check("A13", "…no static node left in the list (6E)", !$("my-requests-list").querySelector("[data-static]") && !STATIC.querySelector("#my-requests-list [data-static]"));
check("A14", "Leave balance card: all 4 limited types, % of allowance left", j(balance()) === j(["Casual=10@83%", "Sick=6@75%", "Earned=10@100%", "WFH=4@100%"]), j(balance()));
check("A15", "…note gives each allowance and the pending day", balanceNote() === "Casual leave is 10 of 12 days (1 pending). Sick leave is 6 of 8 days. Earned leave is 10 of 10 days. Work from home is 4 of 4 days this month.", balanceNote());
// Round 9B (behaviour; was "Team offsite on 12 Oct Announcement"): the static line is labelled a sample, its fixed date dropped
check("A16", "Updates: 3 newest own decisions merged by date with the static line (the 'IT Support' laptop line gone: 6E), newest first; Round 9B: the line is a labelled sample", j(upd()) === j([
  "Your regularization for 28 Sep was approved Yesterday",
  "Your work from home for 12 Aug was approved 11 Aug", "Your sick leave for 2 – 3 Jul was approved 2 Jul", "Announcement: team offsite Sample, not built yet"]), j(upd()));
check("A17", "…approved decisions use the success dot; static lines are the untouched nodes", $("updates").firstElementChild.querySelector(".activity__dot--success") && [...$("updates").querySelectorAll("[data-static]")].every((n) => [...STATIC.querySelectorAll("#updates [data-static]")].some((s) => s.outerHTML === n.outerHTML)));
check("A18", "My attendance: today + 4 previous working days, real times, shared badges", j(days()) === j([
  ["Wed, 30 Sep", "–", "–", "–", "Overdue"], ["Tue, 29 Sep", r14[12].checkIn, r14[12].checkOut, hm(r14[12].minutesWorked), "Present"],
  ["Mon, 28 Sep", "09:30", "18:30", "9h 00m", "Present Regularized"], ["Fri, 25 Sep", r14[8].checkIn, r14[8].checkOut, hm(r14[8].minutesWorked), "Present"], ["Thu, 24 Sep", "10:05", "18:20", "8h 15m", "Late"]]), j(days()));
check("A19", "…today's badge is the shared outlined 'Overdue' (badge--overdue)", badgeClass(0) === "badge badge--dot badge--overdue", badgeClass(0));
check("A20", "no page errors", jsErrors.length === 0, j(jsErrors));

section("Sneha (Employee): a pending leave AND a pending correction; in progress today");
await open("sneha");
check("B1", "Days present 22 / 22 (in today at 09:20), 1 late mark; matches my-attendance", stat("present") === "22 / 22 (1 late mark)" && (await myattPresent("sneha")) === "22 / 22", stat("present"));
check("B2", "Open requests 2: 1 leave (LV-2202), 1 correction (RG-103); no asset request of hers (6E: no static asset)", stat("requests") === "2 (1 leave, 1 correction)", stat("requests"));
check("B3", "newest pending is the correction (sent after the leave), waiting for HR (no manager)", reqItems()[0] === "R Regularization, 23 Sep Waiting for HR Pending" && reqItems().length === 1, j(reqItems()));
// Round 9L (behaviour; was "34 days (Casual 12, Earned 10, Sick 8, WFH 4)"): leave days only, as A4; the card's note
// still starts with casual leave
check("B4", "balance: nothing taken, 30 days of leave (Round 9L: was 34 with WFH 4); 1 casual day pending", stat("balance") === "30 days (Casual 12, Earned 10, Sick 8)" && balanceNote().startsWith("Casual leave is 12 of 12 days (1 pending)."), stat("balance"));
check("B5", "today in progress: faded bar, '1.7 hours so far'", j(barOn("Wed, 30 Sep")) === j({ title: "Wed, 30 Sep: 1.7 hours so far", mod: "chart__bar--progress", h: "17" }), j(barOn("Wed, 30 Sep")));
check("B6", "today's row: 09:20, no check-out yet, 1h 40m, Present", j(days()[0]) === j(["Wed, 30 Sep", "09:20", "–", "1h 40m", "Present"]), j(days()[0]));
// Round 9B (behaviour; was "Team offsite on 12 Oct Announcement")
check("B7", "no decisions yet: Updates are only the static line (6E: the laptop line gone; Round 9B: labelled, undated)", j(upd()) === j(["Announcement: team offsite Sample, not built yet"]), j(upd()));
check("B8", "different person, different data: Sneha's rows are not Arjun's", days()[1][1] !== "09:13" && $("hours-chart").getAttribute("aria-label") !== "Working hours, 17 – 30 Sep: 9 days worked, between 8.3 and 9.5 hours", `${days()[1][1]} | ${$("hours-chart").getAttribute("aria-label")}`);
const decided = A.decideRegularization("RG-103", "EMP-1003", "hr", "approve");
await open("sneha");
check("B9", "after HR approves RG-103: open 1 (1 leave); list shows the leave; update 'approved, Today' on top",
  decided.ok && stat("requests") === "1 (1 leave)" && reqItems()[0] === "L Casual leave, 14 Oct Waiting for HR Pending" && upd()[0] === "Your regularization for 23 Sep was approved Today", `${stat("requests")} ${j(reqItems()[0])} ${upd()[0]}`);
check("B10", "…the corrected day is now on time in the chart (23 Sep no longer 'late')", barOn("Wed, 23 Sep").title.endsWith("hours"), barOn("Wed, 23 Sep").title);

section("Vikram: only a pending correction; Rohan: only a pending leave, plus a rejection");
await open("vikram");
check("C1", "Vikram: open 2 (1 correction, 1 claim); newest pending 'Regularization, 25 Sep, waiting for HR'", stat("requests") === "2 (1 correction, 1 claim)" /* Round 14E part 4 (behaviour; was 1: his pending claim now counted) */ && reqItems()[0] === "R Regularization, 25 Sep Waiting for HR Pending", `${stat("requests")} ${reqItems()[0]}`);
check("C2", "Vikram: late marks from his real month", stat("present") === `${A.monthFor("EMP-1088", 2026, 9).daysWorked} / 22 (${A.monthFor("EMP-1088", 2026, 9).lateMarks} late marks)`, stat("present"));
await open("rohan");
check("C3", "Rohan: open 2 (1 leave, 1 claim); 'Casual leave, 13 – 15 Oct, waiting for Sneha Rao'", stat("requests") === "2 (1 leave, 1 claim)" /* Round 14E part 4 (behaviour; was 1: his pending claim now counted) */ && reqItems()[0] === "L Casual leave, 13 – 15 Oct Waiting for Sneha Rao Pending", `${stat("requests")} ${reqItems()[0]}`);
const rej = [...$("updates").querySelectorAll(".activity__item")].find((i) => txt(i).includes("was rejected"));
check("C4", "Rohan: his rejected correction appears with the danger dot", rej && /^Your regularization for \d+ Sep was rejected/.test(txt(rej)) && rej.querySelector(".activity__dot--danger"), txt(rej));

section("No pending requests; on leave; missing check-out");
await open("meera");
check("D1", "Meera: nothing pending: open 0 ('None'); the list is empty (6E: no static laptop row)", stat("requests") === "0 (None)" && reqItems().length === 0, `${stat("requests")} ${j(reqItems())}`);
check("D2", "Meera: leave days are short blue markers ('on leave'); days rows say On leave", ["Mon, 21 Sep", "Fri, 25 Sep", "Wed, 30 Sep"].every((l) => j(barOn(l)) === j({ title: `${l}: on leave`, mod: "chart__bar--leave", h: "6" })) && days().every((r) => r[4] === "On leave"), j(barOn("Mon, 21 Sep")));
check("D3", "Meera: Days present counts leave days as working days (same as my-attendance)", stat("present").split(" (")[0] === (await myattPresent("meera")), stat("present"));
check("D4", "Meera: earned leave used 9 → Earned 1 left", balance().includes("Earned=1@10%") && stat("balance").includes("Earned 1"), j(balance()));
await open("ananya");
check("D5", "Ananya: 22 Sep has no check-out: amber marker with the check-in time", j(barOn("Tue, 22 Sep")) === j({ title: "Tue, 22 Sep: checked in at 09:31, no check-out", mod: "chart__bar--incomplete", h: "6" }), j(barOn("Tue, 22 Sep")));
check("D6", "Ananya: a pending leave (half day), a pending correction, her pending claim and her monitor request ARQ-2: 4 (1 leave, 1 correction, 1 claim, 1 asset)", stat("requests") === "4 (1 leave, 1 correction, 1 claim, 1 asset)" /* Round 14E part 4 (behaviour; was 3: her pending claim now counted) */, stat("requests"));

section("Admin, HR and Finance opening this page see their OWN data");
for (const [who, id] of [["aarav", "EMP-1001"], ["priya", "EMP-1003"], ["kabir", "EMP-1008"]]) {
  await open(who);
  const own = A.rangeFor(id, "2026-09-17", "2026-09-30");
  const ownRows = own.filter((x) => !["weekend", "holiday"].includes(x.status)).reverse().slice(0, 5).map((x) => x.checkIn ?? "–");
  check(`O-${who}`, `${who}: the rows and chart are ${id}'s, not Arjun's`, j(days().map((r) => r[1].replace(" (WFH)", ""))) === j(ownRows) && barOn("Tue, 29 Sep").h === String(Math.round(own[12].minutesWorked / 6)) && navigations.length === 0 && stat("present") === `${A.monthFor(id, 2026, 9).daysWorked} / 21 (No late marks)`, `${j(days().map((r) => r[1]))} vs ${j(ownRows)}`);
}
await open("priya");
check("O4", "Priya (HR): her own pending WFH request, waiting for Aarav Mehta", reqItems()[0] === "L Work from home, 7 Oct Waiting for Aarav Mehta Pending", reqItems()[0]);
await open("kabir");
check("O5", "Kabir (Finance): nothing pending → '0 (None)' (6E: no static asset); his WFH day shows in the table history", stat("requests") === "0 (None)" && barOn("Fri, 18 Sep").title.endsWith("hours"), stat("requests"));

section("After the shift, month boundary, holiday in the chart");
await at(2026, 9, 30, 19, 0, "arjun");
check("M1", "19:00, Arjun never checked in: today is a red 'absent' marker and an Absent row", j(barOn("Wed, 30 Sep")) === j({ title: "Wed, 30 Sep: absent", mod: "chart__bar--absent", h: "6" }) && days()[0][4] === "Absent", j(barOn("Wed, 30 Sep")));
await at(2026, 10, 1, 11, 0, "arjun");
check("M2", "Thu 1 Oct: subtitle 'October 2026'; Days present '–' (no working day finished), no late marks", txt($("dash-subtitle")) === "Your attendance and requests for October 2026" && stat("present") === "– (No late marks)", `${txt($("dash-subtitle"))} ${stat("present")}`);
check("M3", "…My attendance reaches back into September (rangeFor): 1 Oct, 30, 29, 28, 25 Sep", j(days().map((r) => r[0])) === j(["Thu, 1 Oct", "Wed, 30 Sep", "Tue, 29 Sep", "Mon, 28 Sep", "Fri, 25 Sep"]), j(days().map((r) => r[0])));
check("M4", "…chart 18 Sep – 1 Oct across the month boundary", txt($("hours-range")) === "18 Sep – 1 Oct" && labels() === "18,19,20,21,22,23,24,25,26,27,28,29,30,1", `${txt($("hours-range"))} ${labels()}`);
check("M5", "…the script reads days with rangeFor, not monthFor, for the chart and table", /rangeFor\(user\.id, addDays\(today, -\(LOOK_BACK - 1\)\), today\)/.test(SCRIPT) && (SCRIPT.match(/monthFor\(/g) ?? []).length === 1);
await at(2026, 10, 5, 11, 0, "arjun");
check("M6", "Mon 5 Oct: Fri 2 Oct in the chart is 'Gandhi Jayanti, day off' (muted, 0); table skips it", j(barOn("Fri, 2 Oct")) === j({ title: "Fri, 2 Oct: Gandhi Jayanti, day off", mod: "chart__bar--muted", h: "0" }) && j(days().map((r) => r[0])) === j(["Mon, 5 Oct", "Thu, 1 Oct", "Wed, 30 Sep", "Tue, 29 Sep", "Mon, 28 Sep"]), j(barOn("Fri, 2 Oct")));

section("Old session, safety, static parts");
await at(2026, 9, 30, 11, 0, "old");
check("S1", "old session (no employee id): the static page is left as it is", sameMain() && jsErrors.length === 0);
check("S2", "the script never uses innerHTML / outerHTML / insertAdjacentHTML", !/innerHTML|outerHTML|insertAdjacentHTML/.test(SCRIPT));
check("S3", "no HTML string written at run time contained a person's name", !htmlWrites.some((h) => /Kapoor|Rao|Nair|Mehta|Shah|Gupta|Singh|Joshi|Iyer/.test(h)), `${htmlWrites.length} writes (sidebar, toasts)`);
await at(2026, 9, 30, 11, 0, "arjun");
S.updateUser(USER_ACTOR("admin", "EMP-1029"), "EMP-1029", { name: '<img src=x onerror="window.pwned=1">Sneha' });
await open("arjun");
check("S4", "an approver name with markup shows as text in 'Waiting for …' (no <img>)", !d.querySelector("main img") && reqItems()[0].includes('Waiting for <img src=x onerror="window.pwned=1">Sneha') && !w.pwned, reqItems()[0]);
// Round 9B (behaviour; was: the offsite update's static text, "Team offsite on 12 Oct" / "Announcement"): still the
// untouched static node, now reading as a labelled sample with no date
check("S5", "out-of-scope text is exactly the static text: the offsite update (6E: the laptop row and line gone); Round 9B: 'Announcement: team offsite', 'Sample, not built yet'",
  [...d.querySelectorAll("[data-static]")].length === 1 && [...d.querySelectorAll("[data-static]")].every((n) => [...STATIC.querySelectorAll("[data-static]")].some((s) => s.outerHTML === n.outerHTML))
  && txt(d.querySelector("[data-static]")) === "Announcement: team offsiteSample, not built yet");
check("S6", "the 'asset' part of Open requests is real (6E): no static count left in the HTML", !/data-static-count|data-static-text/.test(HTML));
check("E1", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
