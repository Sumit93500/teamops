// usage: node payclock.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 7B: payroll follows the clock (the run is this month's), and what isn't built is labelled, with the js in
// ./js, in jsdom. The clock is local wall time, set per check; the attendance seed is generated around "now" the
// first time storage is read, and kept, like a browser that keeps its data.
//   A  runMonth() and the sample filing rules (filingDates, tdsReturn), as pure functions
//   B  the clock matrix: seeded on one date, opened on another; the run is always that month, fully recorded,
//      and every "View payslip" link opens a payslip
//   C  payroll-run.html: month, period, notes, steps, run details, checks, as Finance and Admin
//   D  the "Attendance recorded" check: in progress, fully recorded, and days before records began
//   E  dashboard/finance.html and dashboard/admin.html: labels from the run month, the TDS date, Open payroll run
//   F  finance/tax-deductions.html: subtitle, due dates, statuses, the filing calendar across the year
//   G  payslip-view.html: hidden until drawn (no sample payslip), every path; the bank / PAN sentence
//   H  payslips.html: neutral static page; the bank / PAN sentence
//   I  sample labels: reports, audit log, notifications; settings' office-network switch
//   J  source: no fixed run month left, the rules module still has no clock
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const JS = (p) => fs.readFileSync(new URL(`./js/${p}`, import.meta.url), "utf8");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 10, 5);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const WHO = {
  aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"],
  kabir: ["fin", "Kabir Shah", "EMP-1008"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"],
};

let loads = 0, w = null, d = null, saved = {};
let jsErrors = [], navigations = [];
const allErrors = [];
// Opens a page as someone, running app.js and (unless scripts = false) every page script its HTML loads.
async function open(page, who, query = "", scripts = true) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const html = read(page);
  const vc = new VirtualConsole();
  jsErrors = []; navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else { jsErrors.push(e.message); allErrors.push(`${page}/${who}: ${e.message}`); } });
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, Event: w.Event });
  loads++;
  const auth = await import("./js/core/auth.js");
  if (!who) auth.signOut(); else auth.signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  if (!scripts) return;
  for (const [, script] of html.matchAll(/<script type="module" src="\.\.\/\.\.\/assets\/js\/pages\/([\w-]+)\.js"><\/script>/g)) {
    try { await import(`./js/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); allErrors.push(`${page}/${who} import: ${e.message}`); }
  }
}
// Empty storage and a new "now": the next read seeds attendance around it.
function fresh(y, mo, day, h = 11) { if (w) w.localStorage.clear(); saved = {}; setNow(y, mo, day, h); }
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

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const money = (n) => `₹${n.toLocaleString("en-IN")}`;
const $ = (id) => d.getElementById(id);
const stat = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return [txt(s.querySelector(".stat__label")), txt(s.querySelector(".stat__value")), txt(s.querySelector(".stat__delta"))]; };
const main = () => d.querySelector("main");
const today = () => { const x = new Date(); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const kv = () => [...d.querySelectorAll(".kv__row")].map((r) => `${txt(r.querySelector("dt"))}|${txt(r.querySelector("dd"))}`);
const steps = () => [...$("run-steps").children].map((li) => `${txt(li.querySelector("strong"))}|${txt(li.querySelector("small"))}`);
const checks = () => [...$("run-checks").children].map((c) => [c.dataset.check, txt(c.querySelector(".list__title")), txt(c.querySelector(".list__sub")), c.querySelector(".badge").className, txt(c.querySelector(".badge"))]);
const runLinks = () => [...$("run-rows").querySelectorAll("a.btn")].map((a) => new URL(a.href).searchParams);
const staticDoc = (page) => new JSDOM(read(page)).window.document;

const PS = await import("./js/data/payroll-store.js");
const PR = await import("./js/data/payroll.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const IDS = ["EMP-1001", "EMP-1003", "EMP-1008", "EMP-1017", "EMP-1023", "EMP-1029", "EMP-1042", "EMP-1088", "EMP-1105"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT = MONTHS.map((m) => m.slice(0, 3));

// =====================================================================
section("A. runMonth() and the sample filing rules");
check("A1", "runMonth: the month the date is in; December and January", j([PS.runMonth("2026-10-05"), PS.runMonth("2026-12-31"), PS.runMonth("2027-01-01")])
  === j([{ year: 2026, month: 10 }, { year: 2026, month: 12 }, { year: 2027, month: 1 }]));
const safeMonth = (x) => { try { return PS.runMonth(x); } catch (e) { return `threw: ${e.message}`; } };
const badMonths = ["", "2026-13-01", "2026-02-30", "soon", undefined].map(safeMonth);
check("A2", "runMonth: null (not an error) for a date that isn't one", badMonths.every((x) => x === null), j(badMonths));
check("A3", "PS no longer exports a fixed RUN_MONTH", !("RUN_MONTH" in PS), Object.keys(PS).join(","));
const fd = (y, m) => PR.filingDates(y, m);
check("A4", "filingDates, October 2026: TDS 7 Nov, PF 15 Nov, PT 31 Oct", j(fd(2026, 10)) === j({ tds: "2026-11-07", pf: "2026-11-15", pt: "2026-10-31" }), j(fd(2026, 10)));
check("A5", "filingDates, December 2026: TDS / PF in January 2027", j(fd(2026, 12)) === j({ tds: "2027-01-07", pf: "2027-01-15", pt: "2026-12-31" }), j(fd(2026, 12)));
check("A6", "PT on the month's last day: 30 for Apr/Jun/Sep/Nov, 31 for the rest, February 28 / 29 (2028 leap, 2100 not, 2000 leap)",
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => fd(2026, m).pt.slice(8)).join(",") === "31,28,31,30,31,30,31,31,30,31,30,31"
  && fd(2028, 2).pt === "2028-02-29" && fd(2100, 2).pt === "2100-02-28" && fd(2000, 2).pt === "2000-02-29");
const quarters = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => { const r = PR.tdsReturn(2026, m); return `${r.from}-${r.to}:${r.due}`; });
check("A7", "tdsReturn: Jan-Mar due 31 May; Apr-Jun 31 Jul; Jul-Sep 31 Oct; Oct-Dec 31 Jan next year", j(quarters) === j([
  "1-3:2026-05-31", "1-3:2026-05-31", "1-3:2026-05-31", "4-6:2026-07-31", "4-6:2026-07-31", "4-6:2026-07-31",
  "7-9:2026-10-31", "7-9:2026-10-31", "7-9:2026-10-31", "10-12:2027-01-31", "10-12:2027-01-31", "10-12:2027-01-31"]), j(quarters));
check("A8", "FILING_SAMPLE holds the numbers the dates come from", j(PR.FILING_SAMPLE) === j({ tdsDepositDay: 7, pfDay: 15, marchQuarterReturn: { month: 5, day: 31 } }));

// =====================================================================
section("B. The clock matrix: seeded on one date, opened on another");
// [seeded, opened], as [y, m, d]. Opening later keeps the seeded storage, as a browser does.
const MATRIX = [
  [[2026, 9, 30], [2026, 9, 30]], [[2026, 9, 30], [2026, 10, 5]], [[2026, 9, 30], [2026, 11, 16]],
  [[2026, 10, 5], [2026, 10, 5]], [[2026, 10, 5], [2026, 10, 30]], [[2026, 10, 5], [2026, 11, 16]], [[2026, 10, 5], [2027, 1, 11]],
  [[2026, 11, 16], [2026, 11, 16]], [[2026, 11, 16], [2026, 12, 1]], [[2027, 1, 11], [2027, 1, 11]], [[2026, 9, 30], [2027, 1, 4]],
];
let n = 0;
for (const [[sy, sm, sd], [vy, vm, vd]] of MATRIX) {
  n++;
  fresh(sy, sm, sd);
  await open("payroll/payroll-run.html", "kabir");                 // seeds storage now
  setNow(vy, vm, vd);
  await open("payroll/payroll-run.html", "kabir");                 // opened later, same storage
  const key = `${vy}-${String(vm).padStart(2, "0")}`;
  const run = PS.payrollRun(vy, vm, { preparedBy: "EMP-1008" });
  const links = runLinks();
  const linksOk = links.length === 9 && links.every((p) => p.get("month") === key && PS.payslipsFor(p.get("employee"), today()).some((s) => s.month === key));
  const unrecorded = Math.max(...run.rows.map((r) => r.attendance.noData));
  const label = `seeded ${sd} ${SHORT[sm - 1]} ${sy}, opened ${vd} ${SHORT[vm - 1]} ${vy}`;
  check(`B${n}`, `${label}: the page shows ${MONTHS[vm - 1]} ${vy}, its figures are payrollRun(${vy}, ${vm}), no day before records, every payslip link opens a payslip`,
    jsErrors.length === 0 && txt($("run-title")) === `Payroll run, ${MONTHS[vm - 1]} ${vy}` && stat("net")[1] === money(PS.runTotals(run).net)
    && unrecorded === 0 && linksOk && !/before attendance records began/.test(txt($("run-checks"))),
    j({ title: txt($("run-title")), unrecorded, links: links.map((p) => p.get("month")).slice(0, 2), errors: jsErrors }));
}
// The case the fixed month got wrong, for the record: seeded 16 Nov, September has no payslips and 22 unrecorded days.
fresh(2026, 11, 16);
await open("payroll/payroll-run.html", "kabir");
const sepThen = PS.payrollRun(2026, 9);
check(`B${++n}`, "for contrast, seeded 16 Nov: September (the old fixed month) has every working day unrecorded and no one's payslips include it",
  Math.max(...sepThen.rows.map((r) => r.attendance.noData)) === 22 && IDS.every((id) => !PS.payslipsFor(id, today()).some((s) => s.month === "2026-09")));
// A link from the run opens that payslip (not a "no payslip" message).
fresh(2026, 10, 5);
await open("payroll/payroll-run.html", "kabir");
const arjunLink = [...$("run-rows").querySelectorAll("a.btn")].find((a) => a.href.includes("EMP-1105"));
await open("payroll/payslip-view.html", "kabir", new URL(arjunLink.href).search);
check(`B${++n}`, "5 Oct: the run's link for Arjun opens his October 2026 payslip, drawn and visible",
  $("payslip").hidden === false && $("payslip-message").hidden === true && txt($("payslip-title")) === "Payslip, October 2026" && txt(d.querySelector('[data-field="name"]')) === "Arjun Kapoor", txt($("payslip-title")));

// =====================================================================
section("C. payroll-run.html, seeded and opened Mon 5 Oct 2026 11:00");
fresh(2026, 10, 5);
await open("payroll/payroll-run.html", "kabir");
const oct = PS.payrollRun(2026, 10, { preparedBy: "EMP-1008" });
const notYet = Math.max(...oct.rows.map((r) => r.attendance.notYet));
check("C1", "no JS errors, no redirect", jsErrors.length === 0 && navigations.length === 0, j([...jsErrors, ...navigations]));
check("C2", "title, tab title and subtitle: October 2026, its pay period, no pay date",
  txt($("run-title")) === "Payroll run, October 2026" && d.title === "Payroll run, October 2026 | OfficeOS" && txt($("run-subtitle")) === "Pay period 1 – 31 Oct 2026; no pay date set", txt($("run-subtitle")));
check("C3", "stats: the October run's totals; net note 'Draft, not paid yet', not green, no pay date",
  j([stat("employees")[1], stat("gross")[1], stat("deductions")[1], stat("net")[1]]) === j([String(oct.rows.length), money(PS.runTotals(oct).gross), money(PS.runTotals(oct).deductions), money(PS.runTotals(oct).net)])
  && stat("net")[2] === "Draft, not paid yet" && d.querySelector('[data-stat="net"] .stat__delta').className === "stat__delta", j(stat("net")));
// Round 11T (behaviour; was Draft created by Kabir Shah / Review: a live run has no preparer; the steps are Draft / Prepared / Approval / Payment)
check("C4", "steps: Payment says 'Not built yet' (no date); Draft (live), Prepared (not yet), Approval names the Admin (round 11T)",
  j(steps()) === j(["Draft|Worked out from the live records", "Prepared|Not prepared yet", "Approval|Aarav Mehta, Admin", "Payment|Not built yet"]), j(steps()));
// Round 11T (behaviour; was 'Attendance locked on Not built yet' and Kabir as preparer: 'Figures fixed on' is a stored run's date, and a live run has no preparer)
check("C5", "run details: figures not fixed (live), bank file 'Not built yet', pay date 'Not set', all muted; not prepared yet (round 11T)",
  j(kv()) === j(["Prepared by|Not prepared yet", "Approver|Aarav Mehta, Admin", "Figures fixed on|Not fixed: worked out live", "Pay date|Not set", "Bank file|Not built yet"])
  && [...d.querySelectorAll(".kv__row dd")].slice(2).every((dd) => dd.className === "text-muted"), j(kv()));
check("C6", "checks: 6, the new 'Attendance recorded' first (October in progress), the month named in 'No salary on file'", j(checks()) === j([
  // Round 8D (behaviour; was "so late marks and unpaid leave can still change", and 6 checks): absences named; the new rule line
  ["computed", "Attendance recorded", `October 2026 isn't over: ${notYet} working days haven't been recorded yet, so late marks, unpaid leave and absences can still change these figures.`, "badge badge--info", "In progress"],
  ["computed", "Bank details missing", "Everyone in this run has a bank account on file", "badge badge--success", "Done"],
  ["computed", "No salary on file", "Everyone in this run has a salary for October", "badge badge--success", "Done"],
  // Round 12Z (behavior; was the placeholder "Salary edits pending" / "Not checked: salary change requests aren't built yet"): computed (salinbox.mjs R1 / R2)
  ["computed", "Salary changes waiting", "No salary change for October 2026 is waiting for a decision", "badge badge--success", "Done"],
  ["computed", "Loss-of-pay days", "No one has unpaid days this month", "badge badge--success", "Done"],
  ["rule", "Approved leave included", "Approved unpaid leave is deducted; pending requests aren't counted", "badge badge--success", "Done"],
  ["rule", "Unexplained absences", "A working day with no check-in and no approved leave costs a day's pay once its 7-day correction window has closed and no correction or leave request for it is waiting; days before someone's joining date aren't counted", "badge badge--success", "Done"],
]) && txt($("run-checks-meta")) === "7 checks" && notYet > 1, j(checks()));
check("C7", "nothing invented is left on the drawn page: no 28 Sep, 25 Sep, NEFT, 248, September, 'To be paid'",
  !/28 Sep|25 Sep|NEFT|248|September|To be paid/.test(txt(main())), (txt(main()).match(/28 Sep|25 Sep|NEFT|248|September|To be paid/) ?? [""])[0]);
await open("payroll/payroll-run.html", "aarav");
// Round 11T (behaviour; was enabled, saving nothing: approving is a store write since round 11T, so it waits for a prepared run, the store's reason as the title)
check("C8", "Aarav (Admin): Approve shown but disabled until October is prepared, titled with the store's reason; a click does nothing (round 11T)",
  $("approve-run").hidden === false && $("approve-run").disabled === true && $("approve-run").title === "October 2026's run hasn't been prepared yet."
  && ($("approve-run").click(), d.querySelector(".toast") === null));
const raw = staticDoc("payroll/payroll-run.html").querySelector("main");
check("C9", "static HTML (before the script): no figures, names or dates; empty rows and checks; neutral alert",
  !/₹|\d{3}|Sep|Oct|Kabir|Aarav|Rohan|Arjun|Meera|Vikram|Ananya/.test(raw.textContent) && raw.querySelector("#run-rows").children.length === 0
  && raw.querySelector("#run-checks").children.length === 0 && txt(raw.querySelector("#run-title")) === "Payroll run"
  // Round 11T (behaviour; was 'Payroll runs aren't stored yet': runs are stored once prepared since round 11T)
  && txt(raw.querySelector("#run-alert")) === "Until a month's run is prepared, its figures are worked out from the live attendance and leave records each time the page opens."
  && raw.querySelector("#approve-run").disabled && !raw.querySelector("#approve-run").hasAttribute("title"), (raw.textContent.match(/₹|\d{3}|Sep|Oct|Kabir|Aarav|Rohan|Arjun|Meera|Vikram|Ananya/) ?? [""])[0]);
await open("payroll/payroll-run.html", "priya");
check("C10", "HR (no payroll:view): sent away, nothing drawn", navigations.length > 0 && $("run-rows").children.length === 0 && txt($("run-title")) === "Payroll run");

// =====================================================================
section("D. The 'Attendance recorded' check");
const attCheck = () => checks().find((c) => c[1] === "Attendance recorded");
fresh(2026, 10, 30, 19);   // Fri 30 Oct after the working day; the 31st is a Saturday
await decideFirst(["RG-102", "RG-103"]);   // Round 11W (restage): both October late-arrival corrections rejected first (D1 / D1b)
await open("payroll/payroll-run.html", "kabir");
// Round 8D (behaviour; was "Every working day of October 2026 is recorded", Done): at 19:00 the four sign-in identities read absent today
// (open until 6 Nov, not deducted), and Vikram's seeded 14 Oct absence is settled but uncounted (no joining date on file) -> Review.
check("D1", "Fri 30 Oct 19:00: every working day of October recorded; four open absences and Vikram's uncounted one listed -> Review",
  j(attCheck()) === j(["computed", "Attendance recorded", "4 absences aren't deducted yet: they can still be corrected until 6 Nov. Not counted, with no readable joining date on file: Vikram Singh (1 absence).", "badge badge--warning", "Review"]), j(attCheck()));
{ // Round 8D (new, keeps the Done path covered): the four check in, and Vikram is given a joining date (his absence is then deducted)
  const A8 = await import("./js/data/attendance-store.js");
  setNow(2026, 10, 30, 18); ["EMP-1001", "EMP-1003", "EMP-1008", "EMP-1105"].forEach((id) => A8.checkIn(id, "office")); setNow(2026, 10, 30, 19);   // Round 14F (restage; was at 19:00, after check-in closes): in at 18:00, read at 19:00 as before
  S.updateUser(USER_ACTOR("admin", "EMP-1088"), "EMP-1088", { dateOfJoining: "8 Jan 2024" });
  await open("payroll/payroll-run.html", "kabir");
  check("D1b", "...once nothing is open or uncounted: every working day recorded -> Done (Round 8D)",
    j(attCheck()) === j(["computed", "Attendance recorded", "Every working day of October 2026 is recorded", "badge badge--success", "Done"]), j(attCheck()));
}
// Records before 12 Oct removed: attendance appears to start mid-month, so early October is "before records began".
fresh(2026, 10, 20);
await decideFirst(["RG-102", "RG-103"]);   // Round 11W (restage): as D1 (D2)
await open("payroll/payroll-run.html", "kabir");
const stored = JSON.parse(w.localStorage.getItem("officeos:attendance"));
stored.records = stored.records.filter((r) => r.date >= "2026-10-12");
w.localStorage.setItem("officeos:attendance", JSON.stringify(stored));
await open("payroll/payroll-run.html", "kabir");
const late = PS.payrollRun(2026, 10);
const noData = Math.max(...late.rows.map((r) => r.attendance.noData));
const nyet = Math.max(...late.rows.map((r) => r.attendance.notYet));
check("D2", "records starting 12 Oct: the days before are named (paid in full, unchecked) -> Review, and the month is still in progress",
  noData >= 5 && j(attCheck()) === j(["computed", "Attendance recorded",
    `${noData} working days of October 2026 came before attendance records began; they're paid in full, without a loss-of-pay check. October 2026 isn't over: ${nyet} working days haven't been recorded yet, so late marks, unpaid leave and absences can still change these figures.` /* Round 8D (behaviour; was "late marks and unpaid leave") */,
    "badge badge--warning", "Review"]), j([noData, attCheck()]));
fresh(2026, 10, 30, 19);
await decideFirst(["RG-102", "RG-103"]);   // Round 11W (restage): as D1 (D3)
await open("payroll/payroll-run.html", "kabir");
const stored2 = JSON.parse(w.localStorage.getItem("officeos:attendance"));
stored2.records = stored2.records.filter((r) => r.date >= "2026-10-14");
w.localStorage.setItem("officeos:attendance", JSON.stringify(stored2));
await open("payroll/payroll-run.html", "kabir");
const noData3 = Math.max(...PS.payrollRun(2026, 10).rows.map((r) => r.attendance.noData));
check("D3", "days before records but none left to record: only the first sentence, still Review",
  // Round 8D (behaviour; was the first sentence alone): still no "isn't over" sentence; D1's open and uncounted absences follow
  noData3 > noData && j(attCheck()) === j(["computed", "Attendance recorded", `${noData3} working days of October 2026 came before attendance records began; they're paid in full, without a loss-of-pay check. 4 absences aren't deducted yet: they can still be corrected until 6 Nov. Not counted, with no readable joining date on file: Vikram Singh (1 absence).`, "badge badge--warning", "Review"]), j(attCheck()));
fresh(2026, 10, 29);   // Thu: one working day left after today
await open("payroll/payroll-run.html", "kabir");
check("D4", "Thu 29 Oct 11:00: today and Friday left -> '2 working days haven't'", /isn't over: 2 working days haven't been recorded yet/.test(attCheck()[2]), attCheck()[2]);
fresh(2026, 10, 30, 11);
await open("payroll/payroll-run.html", "kabir");
check("D5", "Fri 30 Oct 11:00 (today not over, nothing after): '1 working day hasn't been recorded yet'", /isn't over: 1 working day hasn't been recorded yet/.test(attCheck()[2]), attCheck()[2]);

// =====================================================================
section("E. Finance and Admin dashboards");
fresh(2026, 10, 5);
await open("dashboard/finance.html", "kabir");
const finRun = PS.payrollRun(2026, 10);
// Round 9D (behaviour; was TDS "Deposit by 7 Nov"): the Finance dashboard's note names its sample tax rates
check("E1", "Finance, 5 Oct: Payroll, Oct / Net pay, Oct = the October run; TDS 'Sample tax rates; deposit by 7 Nov' (Round 9D)",
  j(stat("payroll")) === j(["Payroll, Oct", money(PS.runTotals(finRun).gross), "Gross for 9 employees, draft"])
  && j(stat("net")) === j(["Net pay, Oct", money(PS.runTotals(finRun).net), "Draft, not paid yet"])
  && j(stat("tds")) === j(["Tax deducted (TDS)", money(PS.payslipTotals(finRun.rows).tds), "Sample tax rates; deposit by 7 Nov"]), j([stat("payroll"), stat("net"), stat("tds")]));
check("E2", "card labels: 'Gross pay, Oct 2026', 'Payroll run, Oct 2026'; subtitle names no month",
  txt($("fin-dept-meta")) === "Gross pay, Oct 2026" && txt($("fin-run-title")) === "Payroll run, Oct 2026" && txt(d.querySelector(".page-header__subtitle")) === "Payroll and expenses");
const head = d.querySelector(".page-header__actions a.btn--primary");
check("E3", "header link is 'Open payroll run' to payroll-run.html, gated payroll:view; nothing on the page uses payroll:create",
  txt(head) === "Open payroll run" && head.getAttribute("href") === "../payroll/payroll-run.html" && head.dataset.permission === "payroll:view" && !head.hidden
  && !d.querySelector('[data-permission="payroll:create"]') && !/Run payroll/.test(txt(main())));
await open("dashboard/finance.html", "priya");
// Round Manager scoping part 1 (behaviour; was: let in, the link hidden: HR can't open finance.html now (dashboard:finance), so the guard sends them to the 403 page)
check("E4", "HR on the Finance dashboard: sent to the 403 page; payroll labels stay plain, no month, no figures",
  navigations.length > 0 && j(stat("payroll")) === j(["Payroll", "—", ""]) && j(stat("net")) === j(["Net pay", "—", ""]) && stat("tds")[2] === "");
fresh(2026, 12, 30);
await decideFirst();   // Round 13L (restage; 11W's leftovers, K2.2): RG-102 rejected first (E5's December card)
await open("dashboard/finance.html", "kabir");
// Round 9D (behaviour; was "Deposit by 7 Jan")
check("E5", "Finance, 30 Dec: 'Payroll, Dec', TDS 'Sample tax rates; deposit by 7 Jan' (into the next year; Round 9D: sample label)", stat("payroll")[0] === "Payroll, Dec" && stat("tds")[2] === "Sample tax rates; deposit by 7 Jan", j([stat("payroll"), stat("tds")]));
fresh(2026, 10, 5);
await open("dashboard/admin.html", "aarav");
check("E6", "Admin, 5 Oct: 'Payroll, Oct' = the October run's gross", j(stat("payroll")) === j(["Payroll, Oct", money(PS.runTotals(PS.payrollRun(2026, 10)).gross), "Gross for 9 employees, draft"]), j(stat("payroll")));
await open("dashboard/admin.html", "priya");
check("E7", "HR on the Admin dashboard: the payroll stat stays hidden and plain", d.querySelector('[data-stat="payroll"]').hidden === true && j(stat("payroll")) === j(["Payroll", "—", ""]));
check("E8", "static labels carry no month: finance.html and admin.html",
  !/Sep|Oct|Filing due/.test(txt(staticDoc("dashboard/finance.html").querySelector(".stat-strip"))) && txt(staticDoc("dashboard/admin.html").querySelector('[data-stat="payroll"] .stat__label')) === "Payroll");

// =====================================================================
section("F. finance/tax-deductions.html");
const due = () => [...d.querySelectorAll("[data-due]")].filter((x) => x.tagName === "TD").map(txt);
const statuses = () => [...d.querySelectorAll("table[data-export-name='statutory-deductions'] tbody tr")].map((tr) => txt(tr.children[5]));
const cal = () => [...$("tax-calendar").children].map((i) => `${txt(i.querySelector(".date-tile__month"))} ${txt(i.querySelector(".date-tile__day"))}|${txt(i.querySelector(".list__title"))}|${txt(i.querySelector(".list__sub"))}|${txt(i.querySelector(".badge"))}`);
fresh(2026, 10, 5);
await open("finance/tax-deductions.html", "kabir");
const taxRun = PS.payrollRun(2026, 10);
check("F1", "5 Oct: subtitle and table meta name October 2026; TDS 'Deposit by 7 Nov'",
  txt($("tax-subtitle")) === "Statutory deductions, filing dates and tax slabs for October 2026" && txt($("tax-month")) === "October 2026" && stat("tds")[2] === "Deposit by 7 Nov" && jsErrors.length === 0);
check("F2", "amounts are the October run's (TDS, PF both shares, PT)", stat("tds")[1] === money(PS.payslipTotals(taxRun.rows).tds) && stat("pt")[1] === money(PS.payslipTotals(taxRun.rows).pt)
  && stat("pf")[1] === money(PS.payslipTotals(taxRun.rows).pf + taxRun.rows.reduce((s, r) => s + r.employerPf, 0)));
check("F3", "due dates: PF 15 Nov (both rows), PT 31 Oct, TDS 7 Nov", j(due()) === j(["15 Nov", "15 Nov", "31 Oct", "7 Nov"]), j(due()));
check("F4", "status: 'Not built' on all four rows (no challans), not 'Draft'", j(statuses()) === j(["Not built", "Not built", "Not built", "Not built"]), j(statuses()));
check("F5", "calendar, 5 Oct: PT 31 Oct, the Jul-Sep return 31 Oct, TDS 7 Nov, PF 15 Nov, all Upcoming; meta 'Sample rules'", j(cal()) === j([
  "Oct 31|Professional tax|For October salaries|Upcoming", "Oct 31|TDS return|Quarter July to September|Upcoming",
  "Nov 7|Deposit TDS|For October salaries|Upcoming", "Nov 15|Provident fund|Employee and employer share, October|Upcoming"])
  && txt($("tax-calendar").closest(".card").querySelector(".card__meta")) === "Sample rules", j(cal()));
fresh(2026, 10, 26);
await open("finance/tax-deductions.html", "kabir");
check("F6", "26 Oct: the two 31 Oct items are 'Due soon' (5 days), the November ones aren't", j(cal().map((c) => c.split("|")[3])) === j(["Due soon", "Due soon", "Upcoming", "Upcoming"]), j(cal()));
fresh(2026, 10, 24);
await open("finance/tax-deductions.html", "kabir");
check("F7", "24 Oct: 7 days before 31 Oct is still 'Due soon'", cal()[0].endsWith("Due soon"), cal()[0]);
fresh(2026, 10, 23);
await open("finance/tax-deductions.html", "kabir");
check("F8", "23 Oct (8 days before): 'Upcoming'", cal()[0].endsWith("Upcoming"), cal()[0]);
fresh(2026, 10, 31);
await open("finance/tax-deductions.html", "kabir");
check("F8b", "31 Oct, the Jul-Sep return's own due date: still listed (due today), not replaced by Oct-Dec's", j(cal().slice(0, 2)) === j([
  "Oct 31|Professional tax|For October salaries|Due soon", "Oct 31|TDS return|Quarter July to September|Due soon"]), j(cal()));
fresh(2026, 11, 2);
await open("finance/tax-deductions.html", "kabir");
check("F9", "2 Nov: November's dates; the Jul-Sep return has passed, so Oct-Dec's (31 Jan) is shown", j(cal()) === j([
  "Nov 30|Professional tax|For November salaries|Upcoming", "Dec 7|Deposit TDS|For November salaries|Upcoming",
  "Dec 15|Provident fund|Employee and employer share, November|Upcoming", "Jan 31|TDS return|Quarter October to December|Upcoming"]) && j(due()) === j(["15 Dec", "15 Dec", "30 Nov", "7 Dec"]), j(cal()));
fresh(2027, 1, 10);
await open("finance/tax-deductions.html", "kabir");
check("F10", "10 Jan 2027: Oct-Dec's return (31 Jan) is still to file; January's deposits in February", j(cal()) === j([
  "Jan 31|Professional tax|For January salaries|Upcoming", "Jan 31|TDS return|Quarter October to December|Upcoming",
  "Feb 7|Deposit TDS|For January salaries|Upcoming", "Feb 15|Provident fund|Employee and employer share, January|Upcoming"]), j(cal()));
fresh(2027, 2, 15);
await open("finance/tax-deductions.html", "kabir");
check("F11", "15 Feb 2027: PT 28 Feb; Oct-Dec's return has passed, so Jan-Mar's (31 May) is shown", j(cal()) === j([
  "Feb 28|Professional tax|For February salaries|Upcoming", "Mar 7|Deposit TDS|For February salaries|Upcoming",
  "Mar 15|Provident fund|Employee and employer share, February|Upcoming", "May 31|TDS return|Quarter January to March|Upcoming"]), j(cal()));
const taxRaw = staticDoc("finance/tax-deductions.html").querySelector("main");
check("F12b", "the statutory table is table--fit (it overflowed its card at every width before Round 7B)", taxRaw.querySelector("table[data-export-name='statutory-deductions']").classList.contains("table--fit"));
check("F12", "static HTML: no month or date in the subtitle, due cells or calendar; no 'Draft' status",
  txt(taxRaw.querySelector("#tax-subtitle")) === "Statutory deductions, filing dates and tax slabs" && taxRaw.querySelector("#tax-calendar").children.length === 0
  && [...taxRaw.querySelectorAll("td[data-due]")].every((td) => txt(td) === "—") && !/Draft|Sep|Oct|Nov/.test(txt(taxRaw.querySelector("table[data-export-name='statutory-deductions']"))));

// =====================================================================
section("G. payslip-view.html: nothing shown until drawn");
const BANK_SENTENCE = "Bank and PAN details are always masked on payslips. HR and Admins can see them in full on the employee's profile.";
const pvRaw = staticDoc("payroll/payslip-view.html");
check("G1", "static HTML: the payslip and Print start hidden; no sample person, figures, bank or PAN",
  pvRaw.getElementById("payslip").hasAttribute("hidden") && pvRaw.getElementById("payslip-print").hasAttribute("hidden")
  && !/Arjun|EMP-1105|4821|3421|₹|August|Paid|Software Engineer|12 Jan 2023/.test(pvRaw.querySelector("main").textContent) && pvRaw.title === "Payslip | OfficeOS",
  (pvRaw.querySelector("main").textContent.match(/Arjun|EMP-1105|4821|3421|₹|August|Paid|Software Engineer|12 Jan 2023/) ?? [""])[0]);
fresh(2026, 10, 5);
await open("payroll/payslip-view.html", "arjun", "?employee=EMP-1042", false);
check("G2", "after app.js but before the page script (the moment the guard leaves): still hidden, for any viewer", $("payslip").hidden === true && $("payslip-print").hidden === true);
await open("payroll/payslip-view.html", "arjun", "?employee=EMP-1042");
check("G3", "Arjun asking for Rohan's payslip: sent to 403, the payslip never shown", navigations.length > 0 && $("payslip").hidden === true && txt(d.querySelector('[data-field="name"]')) === "—");
await open("payroll/payslip-view.html", "arjun");
check("G4", "Arjun's own: drawn, then shown, with Print", $("payslip").hidden === false && $("payslip-print").hidden === false && txt(d.querySelector('[data-field="name"]')) === "Arjun Kapoor" && txt(d.querySelector('[data-field="bank"]')) === "•••• •••• 4821");
await open("payroll/payslip-view.html", "arjun", "?month=2026-01");
check("G5", "a month with no payslip: message shown; payslip and Print stay hidden", $("payslip").hidden === true && $("payslip-print").hidden === true && $("payslip-message").hidden === false);
await open("payroll/payslip-view.html", "kabir", "?employee=EMP-1105&month=2026-10");
check("G6", "Kabir (payslips:view) opening Arjun's: shown", $("payslip").hidden === false && $("payslip-print").hidden === false && txt(d.querySelector('[data-field="name"]')) === "Arjun Kapoor");
check("G7", "footer: the bank / PAN sentence says who really can see them (HR and Admins, on the profile)",
  txt(d.querySelector(".payslip__foot").children[1]) === BANK_SENTENCE && !/Only HR and Finance/.test(read("payroll/payslip-view.html")));

// =====================================================================
section("H. payslips.html");
const psRaw = staticDoc("payroll/payslips.html").querySelector("main");
check("H1", "static HTML: no sample history, figures or months; neutral stat cards",
  psRaw.querySelector("#payslip-rows").children.length === 0 && !/₹|August|Credited|Paid|Apr|30 Sep/.test(psRaw.textContent)
  && [...psRaw.querySelectorAll(".stat__value")].every((v) => txt(v) === "—"), (psRaw.textContent.match(/₹|August|Credited|Paid|Apr|30 Sep/) ?? [""])[0]);
fresh(2026, 10, 5);
await open("payroll/payslips.html", "arjun");
check("H2", "drawn as before: October and September for Arjun, 'Net pay, September'", [...$("payslip-rows").children].length === 2 && stat("latest")[0] === "Net pay, September" && jsErrors.length === 0);
check("H3", "alert: always masked; HR and Admins see them in full on the employee profile",
  txt(d.querySelector("aside .alert")) === "Your bank account and PAN are always masked on payslips. HR and Admins can see them in full on your employee profile."
  && !/Only HR and Finance/.test(read("payroll/payslips.html")));

// =====================================================================
section("I. Sample labels");
const SAMPLE = {
  "system/reports.html": "Sample, not built yet: reports aren't part of OfficeOS yet. This page shows how they could look; nothing here runs, downloads or is scheduled, and the figures and exports listed are examples.",
  "system/audit-log.html": "Sample, not built yet: OfficeOS doesn't keep an audit log yet. This page shows how it could look; nothing is recorded, and the events and figures listed are examples.",
  "account/notifications.html": "Sample, not built yet: notifications aren't part of OfficeOS yet. This tab shows how they could look; nothing sends notifications or saves these choices, and the notifications listed are examples.",
};
let k = 0;
for (const [page, text] of Object.entries(SAMPLE)) {
  const first = staticDoc(page).querySelector("main .stack").firstElementChild;
  check(`I${++k}`, `${page}: the first thing in the page body is the sample alert, delegation's wording pattern`, first.className === "alert alert--info" && txt(first) === text, txt(first));
}
const delegation = txt(staticDoc("access/delegation.html").querySelector("main .stack").firstElementChild);
check(`I${++k}`, "delegation.html's own alert, the pattern followed, is unchanged", delegation.startsWith("Sample, not built yet: delegation isn't part of OfficeOS yet. This page shows how it could look;"));
await open("system/reports.html", "aarav");
check(`I${++k}`, "reports.html as Admin: the alert is visible (no permission hides it), no JS errors", !d.querySelector("main .stack").firstElementChild.hidden && jsErrors.length === 0);
const net = [...staticDoc("system/settings.html").querySelectorAll(".setting-row")].find((r) => /office network/.test(r.textContent));
const box = net.querySelector("input");
check(`I${++k}`, "settings: 'Payroll only from the office network' is off, locked, and says it isn't built",
  box.disabled && !box.checked && txt(net.querySelector(".setting-row__text span")) === "Not built yet: nothing checks which network a page is opened from");

// =====================================================================
section("J. Source");
const jsFiles = (dir) => fs.readdirSync(new URL(`./js/${dir}`, import.meta.url)).filter((f) => f.endsWith(".js")).map((f) => `${dir}/${f}`);
const all = ["data", "pages", "ui", "core", "config"].flatMap(jsFiles);
check("J1", "no RUN_MONTH anywhere in the js", all.every((f) => !JS(f).includes("RUN_MONTH")), all.filter((f) => JS(f).includes("RUN_MONTH")).join(","));
check("J2", "payroll-run.js has no month of its own (YEAR / MONTH constants) and reads runMonth()", !/const (YEAR|MONTH) =/.test(JS("pages/payroll-run.js")) && /runMonth\(todayIso\(\)\)/.test(JS("pages/payroll-run.js")));
check("J3", "the run month comes from runMonth() on every page that shows a run", ["pages/finance-dashboard.js", "pages/admin-dashboard.js", "pages/tax-deductions.js"].every((f) => /runMonth\(/.test(JS(f))));
check("J4", "data/payroll.js still has no clock, storage or imports", !/\bDate\b|localStorage|^import /m.test(JS("data/payroll.js")));
// Round 11T (invariant; was no page at all: round 11T's Prepare button is the one page use (payruns.mjs X6); the old 'Run payroll' link is still gone, E3)
check("J5", "only payroll-run.html's Prepare button uses payroll:create (round 11T); it stays defined and granted in config",
  fs.readdirSync(DIR, { recursive: true }).filter((f) => f.endsWith(".html")).filter((f) => read(f).includes('"payroll:create"')).map((f) => f.replaceAll("\\", "/")).join() === "payroll/payroll-run.html"
  && JS("config/permissions.js").includes('"create"') && JS("config/roles.js").includes('"payroll:create"'));
check("J6", "no page script failed to load anywhere in this suite", allErrors.length === 0, j(allErrors.slice(0, 3)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
