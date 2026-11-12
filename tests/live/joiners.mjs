// usage: node joiners.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12D: 11Y Y8 / ruling X-D2, approved 2026-10-19. A joiner's first month is prorated to the joining date, the
// mirror image of 11Y's leavers: the working days before it are "not-joined" whatever is on record, and are loss of pay
// (lop.notJoinedDays); no run row before the joining month. ./js-pre12D, ./html-pre12D and ./css-pre12D are the code,
// pages and css before this round (office-os 1179ecb).
//   A  attendance: not-joined wins over a record; weekends / holidays kept; from the joining date on, as before
//   P  pay: November prorated (exact); no October row; December full; joined on the 1st: full, no key; with unpaid
//      leave; joining and leaving in one month; everyone else byte-identical; problems as before; payslips
//   U  the run page's line, the payslip's reason and note (plural / singular); the old wording gone
//   E  what stays; X scope
// Storage seeded Fri 30 Oct 2026 19:00 (the pending requests settled, Vikram given a joining date on Mon 9 Nov, as
// leavers.mjs settles October); Rohan Gupta (EMP-1042) given a joining date on Mon 9 Nov; November read on Wed 9 Dec.
// Round 12E (layout; was the live js, in X1): 12D's own change set, read from the frozen result (js-pre12E = 95da400).
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
setNow(2026, 11, 9);
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ROHAN = "EMP-1042", VIKRAM = "EMP-1088";
const SESS = { fin: ["fin", "Kabir Shah", KABIR] };
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
  w.confirm = () => true;
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
const safe = (fn) => { try { return fn(); } catch (e) { return { ok: false, error: `threw: ${e.message}` }; } };
const hasKey = (o, k) => Boolean(o) && Object.prototype.hasOwnProperty.call(o, k);

const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const A = await import("./js/data/attendance-store.js");
const L = await import("./js/data/leave-store.js");
const OLD = await import("./js-pre12D/data/payroll-store.js");   // before this round, on the same storage
const OLDA = await import("./js-pre12D/data/attendance-store.js");

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
// Seeded Fri 30 Oct 19:00, settled on Mon 9 Nov; Rohan given `joined` then (none: nobody joins); the clock left at 9 Nov.
function seed(joined) {
  mem.clear(); setNow(2026, 10, 30, 19); PS.payrollRun(2026, 10); setNow(2026, 11, 9);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
  if (joined) S.updateUser(AARAV, ROHAN, { dateOfJoining: joined });
}
const dec9 = () => setNow(2026, 12, 9);
const row = (y, m) => PS.payrollRunFor(ROHAN, y, m);
const statuses = (mod, y, m, id = ROHAN) => mod.monthFor(id, y, m).days.map((x) => `${x.date.slice(8)}:${x.status}`);
const cut = (gross, days, wd) => gross - Math.round((gross * days) / wd);

// =================================================================
section("A. Attendance");
seed("16 Nov 2026"); dec9();
const nov = A.monthFor(ROHAN, 2026, 11).days, novOld = OLDA.monthFor(ROHAN, 2026, 11).days;
const before = nov.filter((x) => x.date < "2026-11-16");
// Round 12L (round-12k-notes.md K7.1): a day before joining carries no record on it, so no check-in. Was: some had one.
check("A1", "Rohan, joining Mon 16 Nov, read on 9 Dec: every working day before it is not-joined, with no check-in on the day though the sample data has one (before 12D: present)",
  before.filter((x) => x.status === "not-joined").length === 10 && before.filter((x) => x.status === "not-joined").every((x) => x.checkIn === null && x.recordId === null) && novOld.filter((x) => x.date < "2026-11-16" && x.status === "present").length === 10,
  j(before.map((x) => `${x.date.slice(8)}:${x.status}${x.checkIn ? "*" : ""}`)));
check("A2", "weekends and the holiday keep their status", before.filter((x) => x.status !== "not-joined").every((x) => ["weekend", "holiday"].includes(x.status)) && before.some((x) => x.status === "holiday"),
  j(before.filter((x) => x.status !== "not-joined").map((x) => `${x.date.slice(8)}:${x.status}`)));
check("A3", "from the joining date on, every day reads as before", j(nov.filter((x) => x.date >= "2026-11-16")) === j(novOld.filter((x) => x.date >= "2026-11-16")));
seed(); dec9();
const ids = S.getAllUsers().map((u) => u.id);
check("A4", "nobody joining: everyone's September-November days exactly as before",
  ids.every((id) => [[2026, 9], [2026, 10], [2026, 11]].every(([y, m]) => j(A.monthFor(id, y, m)) === j(OLDA.monthFor(id, y, m)))));

// =================================================================
section("P. Pay");
seed("16 Nov 2026"); dec9();
const p1 = row(2026, 11);
check("P1", "November: 10 of 21 working days before the joining date taken off (₹92,000 × 10 / 21), lop.notJoinedDays 10",
  p1?.workingDays === 21 && p1.lop.notJoinedDays === 10 && p1.lop.days === 10 && p1.gross === cut(p1.monthlyGross, 10, 21) && p1.monthlyGross === 92000, j(p1 && { gross: p1.gross, lop: p1.lop }));
const oct = row(2026, 10), decRow = row(2026, 12);
check("P2", "no October row (before the joining month) and not in October's run; December paid in full, no notJoinedDays key",
  oct === null && !PS.payrollRun(2026, 10).rows.some((r) => r.userId === ROHAN) && decRow?.gross === decRow.monthlyGross && !hasKey(decRow.lop, "notJoinedDays"), j([oct === null, decRow?.lop]));
check("P3", "in November's run, with that row", j(PS.payrollRun(2026, 11).rows.find((r) => r.userId === ROHAN)) === j(p1));
seed("2 Nov 2026"); dec9();
const p4 = row(2026, 11);
check("P4", "joined on the month's first working day (Mon 2 Nov): full pay, no notJoinedDays key", p4?.gross === p4.monthlyGross && !hasKey(p4.lop, "notJoinedDays") && p4.attendance.beforeJoining === 0, j(p4?.lop));
seed("16 Nov 2026");
const lv = L.applyLeave(ROHAN, { type: "unpaid", from: "2026-11-17", to: "2026-11-17", duration: "full", reason: "Round 12D" });
for (let q = L.getRequest(lv.record?.id); q && q.status === "pending"; q = L.getRequest(q.id)) { const who = q.stage === "manager" ? S.getUser(q.managerId) : S.getUser(PRIYA); if (!L.decideLeave(q.id, who.id, who.role, "approve").ok) break; }
dec9();
const p5 = row(2026, 11);
check("P5", "with a day of approved unpaid leave after joining: 11 days of loss of pay (10 before + 1 leave)", lv.ok && p5.lop.notJoinedDays === 10 && p5.lop.unpaidLeaveDays === 1 && p5.lop.days === 11 && p5.gross === cut(p5.monthlyGross, 11, 21), j(p5?.lop));
seed("16 Nov 2026"); dec9();
const left = safe(() => S.deactivateUser(PRIYA, ROHAN, "2026-11-20"));
const p6 = row(2026, 11);
check("P6", "joining 16 Nov and leaving 20 Nov: 10 before + 6 after, paid for 5 of 21", left.ok && p6.lop.notJoinedDays === 10 && p6.lop.leftDays === 6 && p6.lop.days === 16 && p6.gross === cut(p6.monthlyGross, 16, 21),
  j([left.ok ?? left.error, p6?.lop]));
seed();
const clocks = [[2026, 11, 9], [2026, 12, 9], [2026, 12, 14]];
check("P7", "nobody joining: every run September-November, its problems, and everyone's payslips exactly as before, on three clocks",
  clocks.every(([y, m, dd]) => { setNow(y, m, dd); const today = `${y}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    return [[2026, 9], [2026, 10], [2026, 11]].every(([yy, mm]) => j(PS.payrollRun(yy, mm)) === j(OLD.payrollRun(yy, mm)) && j(PS.runProblems(yy, mm)) === j(OLD.runProblems(yy, mm)))
      && ids.every((id) => j(PS.payslipsFor(id, today)) === j(OLD.payslipsFor(id, today))); }));
seed("16 Nov 2026"); dec9();
check("P8", "a joiner doesn't hold up the run: November's problems as before", j(PS.runProblems(2026, 11)) === j(OLD.runProblems(2026, 11)), j(PS.runProblems(2026, 11)));
const slips = PS.payslipsFor(ROHAN, "2026-12-09").map((s) => s.month);
check("P9", "his payslips: December and November (prorated), none before", j(slips) === j(["2026-12", "2026-11"]) && PS.payslipsFor(ROHAN, "2026-12-09")[1].gross === p1.gross, j(slips));

// =================================================================
section("U. The pages");
seed("16 Nov 2026"); dec9();
setSession(...SESS.fin); await open("payroll/payroll-run", "?month=2026-11");
const att = [...(d.getElementById("run-checks")?.children ?? [])].find((c) => txt(c.querySelector(".list__title")) === "Attendance recorded");
const tr = d.querySelector(`#run-rows tr[data-user-id="${ROHAN}"]`);
const u1 = [txt(att?.querySelector(".list__sub")), txt(att?.querySelector(".badge")), tr ? txt(tr.children[1]) : null];
const inr = (n) => `₹${n.toLocaleString("en-IN")}`;
check("U1", "the November run page: 'Joined during November 2026: Rohan Gupta (joined 16 Nov, 10 working days before). The month is paid from the joining date.', Review; his row prorated",
  u1[0].includes("Joined during November 2026: Rohan Gupta (joined 16 Nov, 10 working days before). The month is paid from the joining date.") && u1[1] === "Review" && u1[2] === inr(p1.gross), j(u1));
const runText = txt(d.body);
await open("payroll/payslip-view", `?employee=${ROHAN}&month=2026-11`);
const notes = [...(d.getElementById("payslip-notes")?.children ?? [])].map((n) => txt(n));
check("U2", "his November payslip: the loss of pay names the days before the joining date",
  notes.some((n) => n.startsWith(`Loss of pay: ${inr(p1.lop.amount)} for 10 days (10 days before the joining date), out of 21 working days`)), j(notes));
check("U3", "…and the note: 'The joining date was 16 Nov 2026; the 10 working days of November 2026 before it aren't paid.'",
  notes.includes("The joining date was 16 Nov 2026; the 10 working days of November 2026 before it aren't paid."), j(notes));
check("U4", "the old wording is gone from both pages", !/isn't prorated|aren't counted as absences, and/.test(runText + notes.join(" ")));
seed("3 Nov 2026"); dec9();
setSession(...SESS.fin); await open("payroll/payslip-view", `?employee=${ROHAN}&month=2026-11`);
const one = [...(d.getElementById("payslip-notes")?.children ?? [])].map((n) => txt(n));
check("U5", "the singular (joining Tue 3 Nov): '1 day before the joining date', 'the 1 working day … isn't paid'",
  one.some((n) => n.includes("(1 day before the joining date)")) && one.includes("The joining date was 3 Nov 2026; the 1 working day of November 2026 before it isn't paid."), j(one));

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const FIVE = ["data/attendance-store.js", "data/payroll-store.js", "data/payroll.js", "pages/payroll-run.js", "pages/payslip-view.js"];
const jsNow = walk("./js-pre12E"), jsPre = walk("./js-pre12D");   // Round 12E (layout)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12E", p) !== srcAt("./js-pre12D", p));
check("X1", "exactly these 5 js files changed, none added or removed (store.js, leave-store and the other pages untouched)", j(changedJs) === j(FIVE) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12D").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12D", p))
  && walk("./css-pre12D").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12D", p)));
check("X3", "every changed file CRLF with no final newline; no import changed",
  changedJs.every((p) => { const s = srcAt("./js-pre12E", p); return !s.endsWith("\n") && !/(^|[^\r])\n/.test(s) && j(s.match(/^import .*$/gm)) === j(srcAt("./js-pre12D", p).match(/^import .*$/gm)); }));   // Round 12H (layout; was the live js)

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
