// usage: node latepause.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 11W: R8 part (ii), G4's pause (round-11u-notes.md U2 / U-D2), parked by 11V's split (round-11v-notes.md V2 / V3)
// and landed by ruling (V3 option 2: the suites are restaged so RG-102 is decided before the canonical clock; the
// documented figures stand). A late mark whose late-arrival correction is waiting for a decision isn't counted toward
// the late-mark penalty yet; the run page and the payslip say so. ./js-pre11W, ./html-pre11W and ./css-pre11W are the
// code, pages and css before this round (office-os 81bcd41).
//   P  11U's finding, as corrected in 11V (dates labelled from local fields): over 153 seed dates the pause changes pay
//      on 72, always Vikram's late-mark half day 1 -> 0, 30 Sep among them; decided first, RG-102 changes nothing
//   A  the store: which late marks pause, and the penalty on what's left
//   B  the run page's line ("N late marks aren't counted yet: ...") and its badge
//   C  the payslip's note ("Not counted yet: ...")
//   E  the canonical September with RG-102 decided (rejected) first: the figures as they always were
//   X  scope
// The clock is local wall time: Wed 30 Sep 2026 11:00 unless a check moves it. Seeded there, Vikram (EMP-1088) has
// three September late marks: 21 Sep, 25 Sep (RG-102, a late-arrival correction pending with HR) and 30 Sep (today,
// in at 10:24). Sneha (EMP-1029) has one, 23 Sep (RG-103, pending too).
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 9, 30);
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", SNEHA = "EMP-1029", VIKRAM = "EMP-1088";
const SESS = { fin: ["fin", "Kabir Shah", KABIR], vikram: ["emp", "Vikram Singh", VIKRAM] };
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
const A = await import("./js/data/attendance-store.js");
const OLD = await import("./js-pre11W/data/payroll-store.js");   // the live computation before this round, on the same storage
const OLDA = await import("./js-pre11W/data/attendance-store.js");

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
// Seeded and read at 30 Sep 11:00 (or the clock given): every collection the month's run reads.
function september(y = 2026, mo = 9, day = 30, h = 11) { mem.clear(); setNow(y, mo, day, h); PS.payrollRun(y, mo); }
const reject = (id) => errOf(A.decideRegularization(id, PRIYA, "hr", "reject", "Round 11W: decided before the clock"));
const sepRow = (id = VIKRAM) => PS.payrollRunFor(id, 2026, 9);
const oldRow = (id = VIKRAM) => OLD.payrollRunFor(id, 2026, 9);
const noField = (row) => { if (!row) return row; const { attendance: { pausedLateMarks: _p, ...att }, ...rest } = row; return { ...rest, attendance: att }; };
const pad = (n) => String(n).padStart(2, "0");

// =================================================================
section("P. 11U's finding, as corrected (local date labels)");
const hits = {};
const decidedDiffs = [];
let dates = 0;
for (let t = new RealDate(2026, 8, 1, 11); t <= new RealDate(2027, 0, 31, 11); t = new RealDate(t.getFullYear(), t.getMonth(), t.getDate() + 1, 11)) {
  dates++;
  const label = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;   // local fields, never toISOString
  const months = [[t.getFullYear(), t.getMonth() + 1], t.getMonth() ? [t.getFullYear(), t.getMonth()] : [t.getFullYear() - 1, 12]];
  for (const decide of [false, true]) {
    mem.clear(); NOW = t.getTime(); A.allRegularizations();
    if (decide && A.allRegularizations().find((r) => r.id === "RG-102")?.status === "pending") reject("RG-102");
    for (const u of S.getAllUsers()) for (const [y, m] of months) {
      const mine = PS.payrollRunFor(u.id, y, m), theirs = OLD.payrollRunFor(u.id, y, m);
      if (j(noField(mine)) === j(theirs)) continue;
      if (decide) decidedDiffs.push(`${label} ${u.id}`);
      else (hits[label] ??= []).push(`${u.id} ${y}-${pad(m)} ${theirs.lop.penaltyHalfDays}->${mine.lop.penaltyHalfDays} paused ${mine.attendance.pausedLateMarks}`);
    }
  }
}
const hitDates = Object.keys(hits);
const hitRows = Object.values(hits).flat();
check("P1", "over 153 seed dates (1 Sep 2026 - 31 Jan 2027, 11:00 local), the pause changes pay on 72, one row each, always Vikram's late-mark half day 1 -> 0 with 1 mark paused",
  dates === 153 && hitDates.length === 72 && hitRows.length === 72 && hitRows.every((r) => /^EMP-1088 \d{4}-\d\d 1->0 paused 1$/.test(r)), j([dates, hitDates.length, hitRows.length, hitRows.filter((r) => !/^EMP-1088 .* 1->0 paused 1$/.test(r)).slice(0, 3)]));
check("P2", "the canonical clock is among them: 30 Sep 11:00, September (11U's p3 read it as unaffected: its toISOString label for 30 Sep was 1 Oct's row)",
  j(hits["2026-09-30"]) === j(["EMP-1088 2026-09 1->0 paused 1"]) && !hits["2026-10-01"], j([hits["2026-09-30"], hits["2026-10-01"]]));
check("P3", "with RG-102 decided (rejected) first at each of the 153 clocks, every row's pay is what it was before this round", decidedDiffs.length === 0, j(decidedDiffs.slice(0, 4)));

// =================================================================
section("A. The store: which late marks pause");
september();
const a1 = sepRow();
check("A1", "as seeded at 30 Sep 11:00: Vikram's 3 September late marks, 1 with RG-102 pending: 1 paused, so 2 count: no penalty half day, no loss of pay (was 1, ₹1,455)",
  a1.attendance.pausedLateMarks === 1 && a1.lop.penaltyHalfDays === 0 && a1.lop.amount === 0 && a1.lop.days === 0 && oldRow().lop.penaltyHalfDays === 1 && oldRow().lop.amount === 1455, j([a1.attendance.pausedLateMarks, a1.lop]));
check("A2", "only pay waits: monthFor() still counts all 3 late marks and its own penalty (the attendance pages), byte-identical to before",
  A.monthFor(VIKRAM, 2026, 9).lateMarks === 3 && A.monthFor(VIKRAM, 2026, 9).penaltyHalfDays === 1 && j(A.monthFor(VIKRAM, 2026, 9)) === j(OLDA.monthFor(VIKRAM, 2026, 9)));
const others = S.getAllUsers().filter((u) => u.id !== VIKRAM).map((u) => [u.id, sepRow(u.id)]).filter(([, r]) => r);
check("A3", "everyone else's pay as before; Sneha's 1 late mark (RG-103 pending) is paused but costs nothing either way; the rest pause none",
  others.every(([id, r]) => j(noField(r)) === j(oldRow(id)) && r.attendance.pausedLateMarks === (id === SNEHA ? 1 : 0)) && others.length === 8,
  j(others.map(([id, r]) => `${id}:${r.attendance.pausedLateMarks}`)));
september(); reject("RG-102");
const a4 = sepRow();
check("A4", "RG-102 rejected: nothing paused, the mark counts: 1 penalty half day, ₹1,455 for 0.5 day, the row as before",
  a4.attendance.pausedLateMarks === 0 && a4.lop.penaltyHalfDays === 1 && a4.lop.amount === 1455 && a4.lop.days === 0.5 && j(noField(a4)) === j(oldRow()), j(a4.lop));
september();
const a5 = errOf(A.decideRegularization("RG-102", PRIYA, "hr", "approve"));
const a5r = sepRow();
check("A5", "RG-102 approved: the correction removes the late mark itself (2 left), nothing paused, no penalty, as before",
  a5 === "ok" && A.monthFor(VIKRAM, 2026, 9).lateMarks === 2 && a5r.attendance.pausedLateMarks === 0 && a5r.lop.penaltyHalfDays === 0 && j(noField(a5r)) === j(oldRow()), j([a5, a5r.lop]));
september();
const a6 = errOf(A.cancelRegularization("RG-102", VIKRAM));
check("A6", "RG-102 cancelled by Vikram: nothing paused, the mark counts (₹1,455)", a6 === "ok" && sepRow().attendance.pausedLateMarks === 0 && sepRow().lop.amount === 1455, j([a6, sepRow().lop]));
september();
rawEdit("regularizations", (r) => r.id === "RG-102", (r) => { r.issue = "missed-check-out"; r.time = "18:30"; r.recordedTime = null; });
check("A7", "only a late-arrival correction pauses: the same pending request as a missed check-out leaves the mark counted (₹1,455)",
  sepRow().attendance.pausedLateMarks === 0 && sepRow().lop.penaltyHalfDays === 1 && sepRow().lop.amount === 1455, j([sepRow().attendance.pausedLateMarks, sepRow().lop]));
september();
rawEdit("regularizations", (r) => r.id === "RG-102", (r) => { r.date = "2026-09-24"; });
check("A8", "only a late day pauses: a pending late-arrival correction on a day that wasn't late (24 Sep) pauses nothing; 25 Sep, no longer under it, counts",
  A.monthFor(VIKRAM, 2026, 9).days.find((x) => x.date === "2026-09-24").status !== "late" && sepRow().attendance.pausedLateMarks === 0 && sepRow().lop.penaltyHalfDays === 1,
  j([A.monthFor(VIKRAM, 2026, 9).days.find((x) => x.date === "2026-09-24").status, sepRow().attendance.pausedLateMarks]));
september();
const a9 = errOf(A.requestRegularization(VIKRAM, { date: "2026-09-30", issue: "late-arrival", time: "09:30", reason: "Round 11W" }));
const a9r = sepRow();
check("A9", "two pending (RG-102 and one Vikram sends for today): 2 paused, 1 counts: no penalty", a9 === "ok" && a9r.attendance.pausedLateMarks === 2 && a9r.lop.penaltyHalfDays === 0, j([a9, a9r.attendance.pausedLateMarks]));
september();
const rec29 = JSON.parse(mem.get("officeos:attendance")).records.find((r) => r.userId === VIKRAM && r.date === "2026-09-29");
rawEdit("attendance", (r) => r.userId === VIKRAM && r.date === "2026-09-29", (r) => { r.checkIn = "10:05"; });
const a10 = sepRow();
const a10b = (A.requestRegularization(VIKRAM, { date: "2026-09-30", issue: "late-arrival", time: "09:30", reason: "Round 11W" }), sepRow());
check("A10", "the penalty is on what's left: 4 late marks (29 Sep made late) with 1 paused -> 3 count -> 1 half day; with 2 paused -> 2 count -> none",
  Boolean(rec29) && A.monthFor(VIKRAM, 2026, 9).lateMarks === 4 && a10.attendance.pausedLateMarks === 1 && a10.lop.penaltyHalfDays === 1 && a10b.attendance.pausedLateMarks === 2 && a10b.lop.penaltyHalfDays === 0,
  j([Boolean(rec29), a10.attendance.pausedLateMarks, a10.lop.penaltyHalfDays, a10b.attendance.pausedLateMarks, a10b.lop.penaltyHalfDays]));
// A stored run never holds a paused mark: a month with a pending correction can't be prepared (runProblems, unchanged).
september(2026, 10, 30, 19); setNow(2026, 11, 9);
rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
rawEdit("regularizations", (r) => r.status === "pending" && r.id !== "RG-102", (r) => { r.status = "rejected"; });
S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
const octV = PS.payrollRunFor(VIKRAM, 2026, 10);
const a11 = errOf(safe(() => PS.prepareRun(KABIR, 2026, 10)));
check("A11", "a stored run never holds one: October on 9 Nov, settled but for RG-102 (pending, on a late day: paused), can't be prepared; nothing stored",
  octV.attendance.pausedLateMarks === 1 && a11 === "October 2026 can't be prepared yet: 1 attendance correction is waiting for a decision (Vikram Singh)." && PS.storedRun(2026, 10) === null, j([octV.attendance.pausedLateMarks, a11]));

// =================================================================
section("B. The run page");
const attendanceCheck = () => { const li = [...(d.getElementById("run-checks")?.children ?? [])].find((c) => txt(c.querySelector(".list__title")) === "Attendance recorded"); return [txt(li?.querySelector(".list__sub")), txt(li?.querySelector(".badge"))]; };
const TWO = "2 late marks aren't counted yet: a late-arrival correction for each is waiting for a decision (Sneha Rao, Vikram Singh).";
const ONE = (who) => `1 late mark isn't counted yet: a late-arrival correction for it is waiting for a decision (${who}).`;
september(); setSession(...SESS.fin); await open("payroll/payroll-run");
const b1 = attendanceCheck();
const ISNT = "September 2026 isn't over: 1 working day hasn't been recorded yet, so late marks, unpaid leave and absences can still change these figures. ", UNCOUNTED = " Not counted, with no readable joining date on file: Vikram Singh (1 absence).";
check("B1", "30 Sep as seeded, Kabir: 'Attendance recorded' says 2 late marks aren't counted yet, naming Sneha and Vikram in the run's order, after the month-in-progress sentence and before the uncounted absence; still Review",
  j(b1) === j([ISNT + TWO + UNCOUNTED, "Review"]), j(b1));
september(); reject("RG-102"); setSession(...SESS.fin); await open("payroll/payroll-run");
const b2 = attendanceCheck();
check("B2", "RG-102 rejected first: the singular, naming Sneha only", j(b2) === j([ISNT + ONE("Sneha Rao") + UNCOUNTED, "Review"]), j(b2));
september(); reject("RG-102"); reject("RG-103"); setSession(...SESS.fin); await open("payroll/payroll-run");
const b3 = attendanceCheck();
check("B3", "both decided: no such line (the text as it was before this round)", j(b3) === j([ISNT.trim() + UNCOUNTED, "Review"]), j(b3));
september(); reject("RG-103"); A.requestRegularization(VIKRAM, { date: "2026-09-30", issue: "late-arrival", time: "09:30", reason: "Round 11W" }); setSession(...SESS.fin); await open("payroll/payroll-run");
const b5 = attendanceCheck();
check("B5", "the count is of late marks, not people: Vikram alone with two paused (RG-102 and today's)", b5[0] === ISNT + "2 late marks aren't counted yet: a late-arrival correction for each is waiting for a decision (Vikram Singh)." + UNCOUNTED, j(b5));
const october = (keep) => {
  september(2026, 10, 30, 19); setNow(2026, 11, 9);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending" && !keep.includes(r.id), (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
};
october([]); setSession(...SESS.fin); await open("payroll/payroll-run", "?month=2026-10");
const b4a = attendanceCheck();
october(["RG-102"]); setSession(...SESS.fin); await open("payroll/payroll-run", "?month=2026-10");
const b4b = attendanceCheck();
check("B4", "the badge: October settled on 9 Nov is 'Done'; with only RG-102 left pending it's 'In progress', with the line naming Vikram",
  b4a[1] === "Done" && b4b[1] === "In progress" && b4b[0] === ONE("Vikram Singh"), j([b4a, b4b]));

// =================================================================
section("C. The payslip");
const notes = () => [...(d.getElementById("payslip-notes")?.children ?? [])].map(txt);
const NOTE1 = "Not counted yet: 1 late mark with a late-arrival correction waiting for a decision. Every 3 late marks in a month cost half a day; it counts only if the correction is rejected.";
september(); setSession(...SESS.vikram); await open("payroll/payslip-view", "?month=2026-09");
const c1 = notes();
check("C1", "Vikram's own September payslip, 30 Sep as seeded: the note, before the uncounted-absence note, and no loss-of-pay line",
  j(c1) === j([NOTE1, "1 day with no check-in isn't counted as an absence: there's no readable joining date on file to count from."]), j(c1));
september(); A.requestRegularization(VIKRAM, { date: "2026-09-30", issue: "late-arrival", time: "09:30", reason: "Round 11W" });
setSession(...SESS.vikram); await open("payroll/payslip-view", "?month=2026-09");
const c2 = notes();
check("C2", "two paused: the plural", c2.includes("Not counted yet: 2 late marks, each with a late-arrival correction waiting for a decision. Every 3 late marks in a month cost half a day; each counts only if its correction is rejected."), j(c2));
september(); reject("RG-102"); setSession(...SESS.vikram); await open("payroll/payslip-view", "?month=2026-09");
const c3 = notes();
check("C3", "RG-102 rejected first: no such note; the loss-of-pay line is back (₹1,455 for 0.5 day)",
  !c3.some((n) => n.startsWith("Not counted yet: 1 late mark")) && c3.some((n) => n.startsWith("Loss of pay: ₹1,455 for 0.5 day")), j(c3));
september(); reject("RG-102"); setSession(...["emp", "Sneha Rao", SNEHA]); await open("payroll/payslip-view", "?month=2026-09");
const c4 = notes();
check("C4", "Sneha's own payslip: her paused mark is noted (it costs nothing yet either way)", c4.includes(NOTE1), j(c4));

// =================================================================
section("E. The canonical September, RG-102 decided first");
september(); reject("RG-102");
const sep = PS.payrollRun(2026, 9);
const totals = PS.runTotals(sep);
const vSep = sep.rows.find((r) => r.userId === VIKRAM);
check("E1", "seeded 30 Sep 11:00, RG-102 rejected before it's read: 9 rows, gross ₹9,64,045, deductions ₹86,046, net ₹8,77,999; Vikram ₹1,455 for 0.5 day off ₹64,000 (3 late marks, all counted)",
  sep.rows.length === 9 && totals.gross === 964045 && totals.deductions === 86046 && totals.net === 877999 && vSep.lop.amount === 1455 && vSep.lop.days === 0.5 && vSep.lop.penaltyHalfDays === 1
  && PS.salaryFor(VIKRAM, 2026, 9).gross === 64000, j([totals, vSep.lop]));
const old = OLD.payrollRun(2026, 9);
check("E2", "the whole run as before this round, row for row (the new pausedLateMarks, 0 for Vikram, aside)",
  j({ ...sep, rows: sep.rows.map(noField) }) === j(old) && vSep.attendance.pausedLateMarks === 0);
check("E3", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre14A"), jsPre = walk("./js-pre11W");   // Round 14A (layout; was the live js): 9c7423e's, frozen; the live js: jsguard.mjs
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre14A", p) !== srcAt("./js-pre11W", p));
// Round 11X (layout; was the live js: 11W's change set read from the frozen result it left, js-pre11X = office-os
// 28c83de; the live js has 11X's leave-store.js since (leavebal.mjs X1))
const js11W = walk("./js-pre11X"), changed11W = js11W.filter((p) => !jsPre.includes(p) || srcAt("./js-pre11X", p) !== srcAt("./js-pre11W", p));
check("X1", "exactly these 3 js files changed, none added or removed: payroll-store, payroll-run, payslip-view (attendance-store.js, payroll.js, payslips.js untouched)",
  j(changed11W) === j(["data/payroll-store.js", "pages/payroll-run.js", "pages/payslip-view.js"]) && j(js11W) === j(jsPre), j(changed11W));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
const pagesPre = walk("./html-pre11W").filter((p) => p.endsWith(".html"));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const cssDir = new URL("./css-pre13U", HERE).pathname.replace(/^\/(\w:)/, "$1");
const pagesSame = j(pagesNow) === j(pagesPre) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre11W", p));
const cssSame = walk("./css-pre11W").every((p) => fs.existsSync(`${cssDir}/${p}`) && fs.readFileSync(`${cssDir}/${p}`, "utf8") === srcAt("./css-pre11W", p));
check("X2", "no page and no css changed", pagesSame && cssSame);
const crlf = (s) => !s.endsWith("\n") && !/(^|[^\r])\n/.test(s);
check("X3", "every changed file CRLF with no final newline", changedJs.every((p) => crlf(srcAt("./js-pre14A", p))));
const imports = (s) => s.match(/^import .*$/gm);
// Round 11Y (layout; was the live js: 11W's imports read from the frozen result it left, as X1 since 11X; 11Y adds
// leavingDate to two of these files' store imports (leavers.mjs X4))
check("X4", "no import added or changed in any of the 3", changed11W.every((p) => j(imports(srcAt("./js-pre11X", p))) === j(imports(srcAt("./js-pre11W", p)))));
const fnText = (s, name) => { const i = s.search(new RegExp(`(function|const) ${name}\\b`)); return i < 0 ? null : s.slice(i, s.indexOf("\r\n\r\n", i)); };
// Round 11Y (layout; was the live payroll-store.js: 11W's, read from js-pre11X; 11Y changes payrollRun, payslipsFor and
// unpaidLeaveDays for leavers since (leavers.mjs X1))
const PSN = srcAt("./js-pre11X", "data/payroll-store.js"), PSP = srcAt("./js-pre11W", "data/payroll-store.js");
const kept = ["runProblems", "absencesIn", "unpaidLeaveDays", "salaryFor", "payrollRun", "runTotals", "payslipTotals", "payslipsFor", "prepareProblem", "prepareRun", "approveProblem", "approveRun", "canApprove", "approversFor", "storedRun"];
check("X5", "payroll-store: only payrollRunFor changes (and pausedLateMarks is new); runProblems, absencesIn, the stored-run functions and the rest as they were",
  kept.every((f) => fnText(PSN, f) !== null && fnText(PSN, f) === fnText(PSP, f)) && fnText(PSN, "payrollRunFor") !== fnText(PSP, "payrollRunFor") && fnText(PSP, "pausedLateMarks") === null && fnText(PSN, "pausedLateMarks") !== null,
  kept.filter((f) => fnText(PSN, f) !== fnText(PSP, f)).join(","));
const pages = ["pages/payroll-run.js", "pages/payslip-view.js"].map((p) => srcAt("./js", p));
check("X6", "the pages work nothing out: no pay rule, and they read the row's pausedLateMarks rather than the corrections", pages.every((s) => !/data\/payroll\.js"|computePay|splitGross|monthlyTds|annualTax|lossOfPayDays|lossOfPayAmount|regularization/i.test(s) && /attendance\.pausedLateMarks/.test(s)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
