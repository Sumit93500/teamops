// usage: node paygate.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 11V: 11M's R8 part (ii), as scoped in round-11u-notes.md with U-D1, U-D3 and U-D6b decided (U-D2, G4's pause,
// split out by ruling: round-11v-notes.md V2 / V3). ./js-pre11V,
// ./html-pre11V and ./css-pre11V are the code, pages and css before this round (office-os 9f58fee).
//   A  U-D1: once a month has ended, it can't be prepared or approved until its request window has closed (last day +
//      7); then nothing can reach it (11U's probe p1, closed)
//   C  U-D3: no holiday of any kind can be added to a month whose payroll is approved
//   D  U-D6b: an approved month's held payslip says "On hold when approved: {reason}"
//   E  what stays: the canonical September figures and the whole live computation (no pause this round)
//   X  scope
// The clock is local wall time. The October fixture is payruns.mjs's: seeded Fri 30 Oct 2026 19:00 (attendance back to
// 1 Oct), read Mon 9 Nov 11:00, settled (pending non-WFH leave cancelled, pending corrections rejected, Vikram given a
// joining date).
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 11, 9);
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const SESS = { admin: ["admin", "Aarav Mehta", AARAV], fin: ["fin", "Kabir Shah", KABIR], emp: ["emp", "Arjun Kapoor", ARJUN] };
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, query = "") {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${DIR}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
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
const safe = (fn) => { try { return fn(); } catch (e) { return `threw: ${e.message}`; } };
const errOf = (r) => (typeof r === "string" ? r : r?.ok ? "ok" : r?.error ?? "no result");

const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const H = await import("./js/data/holidays.js");
const A = await import("./js/data/attendance-store.js");
const L = await import("./js/data/leave-store.js");
const OLD = await import("./js-pre11V/data/payroll-store.js");   // the live computation before this round, on the same storage
const OLDA = await import("./js-pre11V/data/attendance-store.js");

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
// Seeded 30 Oct 19:00, read on `day` Nov; settled unless told not to (keep: request ids left pending).
function october(day = 9, { settle = true, keep = [] } = {}) {
  mem.clear();
  setNow(2026, 10, 30, 19);
  PS.payrollRun(2026, 10);
  setNow(2026, 11, day);
  if (!settle) return;
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh" && !keep.includes(r.id), (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending" && !keep.includes(r.id), (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
}
const prepare = (id, y = 2026, m = 10) => safe(() => PS.prepareRun(id, y, m));
const approve = (id, y = 2026, m = 10) => safe(() => PS.approveRun(id, y, m));
const problems = (y = 2026, m = 10) => safe(() => PS.runProblems(y, m));
const WINDOW = (until) => `its request window is still open until ${until}`;

// =================================================================
section("A. U-D1: the request window");
october(9);
check("A0", "the settled October fixture on 9 Nov has nothing in the way (the window closed on 7 Nov)", j(problems()) === "[]", j(problems()));
october(1);
check("A1", "Sun 1 Nov, October just ended: the window reason alone, naming 7 Nov (31 Oct + 7)", j(problems()) === j([WINDOW("7 Nov")]), j(problems()));
october(7);
const a2 = [problems(), errOf(prepare(KABIR))];
check("A2", "Sat 7 Nov, the window's last day: still refused, Prepare says so in the store's words",
  j(a2[0]) === j([WINDOW("7 Nov")]) && a2[1] === `October 2026 can't be prepared yet: ${WINDOW("7 Nov")}.`, j(a2));
october(8);
check("A3", "Sun 8 Nov: open; Kabir prepares and Aarav approves", j(problems()) === "[]" && errOf(prepare(KABIR)) === "ok" && errOf(approve(AARAV)) === "ok", j(problems()));
setNow(2026, 11, 9);
const late = A.monthFor(VIKRAM, 2026, 10).days.filter((x) => x.status === "late").map((x) => x.date);
const a4 = [late.map((date) => errOf(A.requestRegularization(VIKRAM, { date, issue: "late-arrival", time: "09:30", reason: "probe" }))),
  errOf(L.applyLeave(ROHAN, { type: "unpaid", from: "2026-10-30", to: "2026-10-30", duration: "full", reason: "probe" }))];
check("A4", "11U's route is closed: once October is approved (8 Nov), none of Vikram's October late marks can be corrected and no leave can be dated in it; live == the snapshot",
  late.length === 3 && a4[0].every((e) => e === "Corrections must be asked for within 7 days of the date.") && /^Leave can be dated at most 7 days back/.test(a4[1])
  && j(PS.storedRun(2026, 10)?.rows.find((r) => r.userId === VIKRAM)?.net) === j(PS.payrollRunFor(VIKRAM, 2026, 10).net), j(a4));
october(8);
prepare(KABIR);
setNow(2026, 11, 7);
const a5 = errOf(approve(AARAV));
check("A5", "the window is checked at Approve too: prepared on 8 Nov, an Approve with the clock back on 7 Nov is refused", a5 === `October 2026 can't be approved yet: ${WINDOW("7 Nov")}.`, a5);
october(9);
setNow(2026, 10, 31);
check("A6", "Sat 31 Oct: the month hasn't ended, so only that is said (no window reason before the month ends)", j(problems()) === j(["it hasn't ended yet"]), j(problems()));
mem.clear(); setNow(2027, 1, 3); const a7 = problems(2026, 12);
mem.clear(); setNow(2026, 3, 5); const a7b = problems(2026, 2);
check("A7", "the closing date across a year and in February: December closes 7 Jan, February 2026 closes 7 Mar (other reasons may follow)",
  Array.isArray(a7) && a7.includes(WINDOW("7 Jan")) && Array.isArray(a7b) && a7b.includes(WINDOW("7 Mar")), j([a7, a7b]));
check("A8", "the window is the longer of the two request windows, 7 days each (attendance's requestWindowDays, leave's PAST_DAY_WINDOW)",
  A.ATTENDANCE_RULES.requestWindowDays === 7 && L.PAST_DAY_WINDOW === 7);
october(4, { keep: ["LV-2201"] });
const a9 = problems();
check("A9", "with other reasons: the window comes first, then the rest in their order", j(a9) === j([WINDOW("7 Nov"), "1 leave request is waiting for a decision (Arjun Kapoor)"]), j(a9));

// =================================================================
// =================================================================
section("C. U-D3: no holiday in an approved payroll month");
const NO_HOLIDAY = "October 2026's payroll is approved, so a holiday can't be added to it.";
october(9);
prepare(KABIR);
const c1 = errOf(H.addHoliday(PRIYA, { date: "2026-10-21", name: "Company day", kind: "company" }));
H.removeHoliday(PRIYA, H.getAllHolidays().find((h) => h.date === "2026-10-21")?.id);
check("C1", "a prepared (not approved) October still takes a holiday (Approve then asks for it to be prepared again)", c1 === "ok", c1);
october(9);
prepare(KABIR); approve(AARAV);
const runs = mem.get("officeos:payroll-runs");
const c2 = ["national", "company", "optional"].map((kind) => H.addHoliday(PRIYA, { date: "2026-10-22", name: "Probe", kind }));
check("C2", "October approved: a holiday of each kind (national, company, optional) on 22 Oct is refused with the message, naming the date field; nothing is stored, the run is unchanged",
  c2.every((r) => r.ok === false && r.error === NO_HOLIDAY && r.field === "date") && !H.getAllHolidays().some((h) => h.date === "2026-10-22") && mem.get("officeos:payroll-runs") === runs, j(c2));
const c3 = [errOf(H.addHoliday(PRIYA, { date: "2026-10-01", name: "Probe", kind: "company" })), errOf(H.addHoliday(PRIYA, { date: "2026-10-31", name: "Probe", kind: "company" })),
  errOf(H.addHoliday(PRIYA, { date: "2026-09-30", name: "Probe", kind: "company" })), errOf(H.addHoliday(PRIYA, { date: "2026-11-02", name: "Probe", kind: "company" }))];
check("C3", "the whole month and only it: 1 Oct and 31 Oct refused; 30 Sep and 2 Nov (months not approved) added", j(c3) === j([NO_HOLIDAY, NO_HOLIDAY, "ok", "ok"]), j(c3));
const c4 = [errOf(H.addHoliday(ARJUN, { date: "2026-10-22", name: "Probe", kind: "company" })), errOf(H.addHoliday(PRIYA, { date: "2026-10-40", name: "Probe", kind: "company" })),
  errOf(H.removeHoliday(PRIYA, H.getAllHolidays().find((h) => h.date === "2026-10-20").id))];
check("C4", "the earlier refusals keep their place: someone without holidays:manage, a date that isn't one; removing a past holiday is still refused (10O)",
  // Round 13R (behaviour; round-13q-scoping.md Q3: D): the refusal's date as the pages write it
  j(c4) === j(["You can't add holidays.", "Pick a valid date.", "Can't remove a past holiday (20 Oct 2026)."]), j(c4));
const box = JSON.parse(mem.get("officeos:payroll-runs")); box.version = 0; mem.set("officeos:payroll-runs", j(box));
const c5 = errOf(H.addHoliday(PRIYA, { date: "2026-10-22", name: "Probe", kind: "company" }));
check("C5", "a stored copy that isn't intact counts as no run (as the store reads it): the holiday is added", c5 === "ok", c5);
october(9);
setSession(...SESS.admin); prepare(KABIR); approve(AARAV);
await open("leave/holidays");
const form = d.querySelector("#holiday-modal form");
if (form) {
  d.getElementById("holiday-date").value = "2026-10-22"; d.getElementById("holiday-name").value = "Probe"; d.getElementById("holiday-kind").value = "company";
  form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
}
check("C6", "through holidays.html's own form, as an Admin would: refused, the message shown under the date, nothing added",
  Boolean(form) && txt(d.getElementById("holiday-date-error")) === NO_HOLIDAY && !H.getAllHolidays().some((h) => h.date === "2026-10-22"), j([Boolean(form), txt(d.getElementById("holiday-date-error"))]));

// =================================================================
section("D. U-D6b: 'On hold when approved'");
october(9);
S.updateUser(AARAV, ARJUN, { bankAccount: null });
prepare(KABIR); approve(AARAV);
S.updateUser(AARAV, ARJUN, { bankAccount: "671540284821" });
setSession(...SESS.emp); await open("payroll/payslip-view", "?month=2026-10");
const d1 = txt(d.getElementById("payslip-subtitle"));
await open("payroll/payslips");
const d2 = txt(d.querySelector('[data-stat="latest"] .stat__delta'));
check("D1", "Arjun, held when October was approved and given a bank account since: both payslip pages say 'On hold when approved: No bank account on file'",
  d1 === "On hold when approved: No bank account on file" && d2 === "On hold when approved: No bank account on file", j([d1, d2]));
october(9);
S.updateUser(AARAV, ARJUN, { bankAccount: null });
setSession(...SESS.emp); await open("payroll/payslip-view", "?month=2026-10");
check("D2", "a live (not approved) held payslip still says 'On hold: …'", txt(d.getElementById("payslip-subtitle")) === "On hold: No bank account on file", txt(d.getElementById("payslip-subtitle")));

// =================================================================
section("E. What stays");
mem.clear(); setNow(2026, 9, 30, 11);
{ const r = A.decideRegularization("RG-102", "EMP-1003", "hr", "reject", "Decided before the clock (round 11W)"); if (!r.ok) throw new Error(`round 11W restage, RG-102: ${r.error}`); }   // Round 11W (restage): RG-102 rejected first (E1)
const sep = PS.payrollRun(2026, 9);
const totals = PS.runTotals(sep);
const vSep = sep.rows.find((r) => r.userId === VIKRAM);
check("E1", "the canonical September (seeded and read Wed 30 Sep 11:00): 9 rows, gross ₹9,64,045, deductions ₹86,046, net ₹8,77,999, Vikram's ₹1,455 for 0.5 day (3 late marks; RG-102, pending on one of them, rejected first: all counted, round 11W)",
  sep.rows.length === 9 && totals.gross === 964045 && totals.net === 877999 && totals.deductions === 86046 && vSep.lop.amount === 1455 && vSep.lop.days === 0.5 && vSep.lop.penaltyHalfDays === 1, j([totals, vSep.lop]));
// Round 11W (shape): payrollRunFor's attendance block gains pausedLateMarks (G4's pause); the code compared with has
// none, so it's left out here (every figure is still compared).
const noPause = (row) => (row?.attendance ? { ...row, attendance: Object.fromEntries(Object.entries(row.attendance).filter(([k]) => k !== "pausedLateMarks")) } : row);
const noPauseRun = (run) => (run ? { ...run, rows: run.rows.map(noPause) } : run);
const e2 = [];
for (const [seed, view, y, m] of [[[2026, 9, 30, 11], [2026, 9, 30, 11], 2026, 9], [[2026, 9, 30, 11], [2026, 9, 30, 17], 2026, 9], [[2026, 10, 5, 10], [2026, 10, 28, 12], 2026, 10],
  [[2026, 10, 30, 19], [2026, 11, 9, 11], 2026, 10], [[2026, 11, 16, 11], [2026, 11, 30, 19], 2026, 11], [[2026, 10, 16, 9], [2027, 1, 11, 10], 2027, 1]]) {
  mem.clear(); setNow(...seed); A.dayFor(ARJUN, `${seed[0]}-${String(seed[1]).padStart(2, "0")}-${String(seed[2]).padStart(2, "0")}`); { const r = A.decideRegularization("RG-102", "EMP-1003", "hr", "reject", "Decided before the clock (round 11W)"); if (!r.ok) throw new Error(`round 11W restage, RG-102: ${r.error}`); } setNow(...view);   // Round 11W (restage)
  e2.push(j(noPauseRun(PS.payrollRun(y, m, { preparedBy: KABIR }))) === j(OLD.payrollRun(y, m, { preparedBy: KABIR }))
    && S.getAllUsers().every((u) => j(noPause(PS.payrollRunFor(u.id, y, m))) === j(OLD.payrollRunFor(u.id, y, m)) && j(A.monthFor(u.id, y, m)) === j(OLDA.monthFor(u.id, y, m))));
}
check("E2", "payrollRun(), payrollRunFor() and monthFor() byte-identical to before this round over six seed / view clocks, including the four where the pause would move Vikram's penalty (30 Sep 11:00 and 17:00, 30 Oct -> 9 Nov, 16 Nov -> 30 Nov), with RG-102 rejected at each seed (round 11W; pausedLateMarks aside)",
  e2.every(Boolean), j(e2));
check("E3", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre14A"), jsPre = walk("./js-pre11V");   // Round 14A (layout; was the live js): 9c7423e's, frozen; the live js: jsguard.mjs
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre14A", p) !== srcAt("./js-pre11V", p));
// Round 11W (layout; was the live js: 11V's change set read from the frozen result it left, js-pre11W = office-os 81bcd41;
// the live js has 11W's pause since (latepause.mjs X1))
const js11V = walk("./js-pre11W"), changed11V = js11V.filter((p) => !jsPre.includes(p) || srcAt("./js-pre11W", p) !== srcAt("./js-pre11V", p));
check("X1", "exactly these 4 js files changed, none added or removed: holidays, payroll-store, payslip-view, payslips (attendance-store.js, leave-store.js and payroll-run.js untouched)",
  j(changed11V) === j(["data/holidays.js", "data/payroll-store.js", "pages/payslip-view.js", "pages/payslips.js"]) && j(js11V) === j(jsPre), j(changed11V));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
const pagesPre = walk("./html-pre11V").filter((p) => p.endsWith(".html"));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const cssDir = new URL("./css-pre13U", HERE).pathname.replace(/^\/(\w:)/, "$1");
const pagesSame = j(pagesNow) === j(pagesPre) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre11V", p));
const cssSame = walk("./css-pre11V").every((p) => fs.existsSync(`${cssDir}/${p}`) && fs.readFileSync(`${cssDir}/${p}`, "utf8") === srcAt("./css-pre11V", p));
check("X2", "no page and no css changed", pagesSame && cssSame);
const crlf = (s) => !s.endsWith("\n") && !/(^|[^\r])\n/.test(s);
check("X3", "every changed file CRLF with no final newline", changedJs.every((p) => crlf(srcAt("./js-pre14A", p))));
const imports = (s) => s.match(/^import .*$/gm);
// Round 11Y (layout; was the live js: 11V's imports read from the frozen result it left, js-pre11W, as X1 / X5 since
// 11W; 11Y adds leavingDate to payroll-store's store import (leavers.mjs X4))
const added = (f) => imports(srcAt("./js-pre11W", f)).filter((l) => !imports(srcAt("./js-pre11V", f)).includes(l));
check("X4", "imports: payroll-store.js only adds PAST_DAY_WINDOW to its leave-store import; holidays.js only core/storage.js (a leaf: no cycle); the pages none",
  j(added("data/payroll-store.js")) === j(['import { allRequests, PAST_DAY_WINDOW } from "./leave-store.js";']) && j(added("data/holidays.js")) === j(['import { load } from "../core/storage.js";'])
  && ["pages/payslip-view.js", "pages/payslips.js"].every((f) => added(f).length === 0), j([added("data/payroll-store.js"), added("data/holidays.js")]));
const fnText = (s, name) => { const i = s.search(new RegExp(`(function|const) ${name}\\b`)); return i < 0 ? null : s.slice(i, s.indexOf("\r\n\r\n", i)); };
// Round 11W (layout; was the live payroll-store.js: 11V's read from js-pre11W, as X1; 11W's pause changes payrollRunFor since)
const PSN = srcAt("./js-pre11W", "data/payroll-store.js"), PSP = srcAt("./js-pre11V", "data/payroll-store.js");
const kept = ["payrollRunFor", "absencesIn", "unpaidLeaveDays", "salaryFor", "payrollRun", "runTotals", "payslipTotals", "payslipsFor", "prepareProblem", "prepareRun", "approveProblem", "approveRun", "canApprove", "approversFor", "storedRun"];
check("X5", "only runProblems (the window) changes in payroll-store: payrollRunFor (no pause this round), absencesIn, unpaidLeaveDays, the stored-run functions and the rest as they were; payroll.js unchanged",
  kept.every((f) => fnText(PSN, f) !== null && fnText(PSN, f) === fnText(PSP, f)) && fnText(PSN, "runProblems") !== fnText(PSP, "runProblems")
  && srcAt("./js-pre11W", "data/payroll.js") === srcAt("./js-pre11V", "data/payroll.js"), kept.filter((f) => fnText(PSN, f) !== fnText(PSP, f)).join(","));
const pages = ["pages/payslip-view.js", "pages/payslips.js"].map((p) => srcAt("./js", p));
check("X6", "no page works out a pay figure: none imports payroll.js or names a pay rule", pages.every((s) => !/data\/payroll\.js"|computePay|splitGross|monthlyTds|annualTax|lossOfPayDays|lossOfPayAmount/.test(s)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
