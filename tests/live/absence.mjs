// usage: node absence.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 8D: an unexplained absence costs a day's pay, once it's settled. A working day with no check-in at all, not on
// approved leave, on or after the person's readable joining date, is lop.absenceDays (its own field, not unpaid leave):
// 1 a day, 0.5 when approved half-day leave covers the other half. It counts only after its 7-day correction window
// (requestWindowDays) has closed and no correction or leave request for it is pending; until then it's listed as not
// deducted yet. ./js is the build, ./js-pre8D a824947 (HEAD, 8C) for the contrast. Each section sets its own clock.
//   A  payroll.js: absenceDays as a third loss-of-pay input, its own field on lop
//   B  the settle window: immediate vs settled, to the minute; the evening flap of the sign-in identities
//   C  pending requests pause it: a correction, and a leave request the same way; rejection / approval / WFH / cancel
//   D  the joining-date gate: a new hire, the joining day itself, unreadable dates, the seeded people without one
//   E  half-day leave: half an absence, never a double count; short days left out (decision 2)
//   F  pages: the run's checks card, payslip notes, the regularization Policy card
//   G  known limitations, pinned (logged, not fixed this round): pre-join days read "absent"; a correction approved
//      onto an approved-leave day
//   H  source: what changed, what didn't
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HTML = {
  run: fs.readFileSync(`${DIR}/payroll/payroll-run.html`, "utf8"),
  view: fs.readFileSync(`${DIR}/payroll/payslip-view.html`, "utf8"),
};
const SCRIPT = { run: "payroll-run", view: "payslip-view" };
const FILE = { run: "payroll/payroll-run.html", view: "payroll/payslip-view.html" };

const RealDate = Date;
let NOW = 0;
const setNow = (iso, h = 10, mi = 0) => { const [y, m, d] = iso.split("-").map(Number); NOW = new RealDate(y, m - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
const mem = new Map();
const shim = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = shim;
const fresh = () => { mem.clear(); globalThis.localStorage = shim; };
const snap = () => new Map(mem);
const restore = (s) => { mem.clear(); for (const [k, v] of s) mem.set(k, v); globalThis.localStorage = shim; };
setNow("2026-10-01", 9, 0);

const A = await import("./js/data/attendance-store.js");
const L = await import("./js/data/leave-store.js");
const H = await import("./js/data/holidays.js");
const P = await import("./js/data/payroll-store.js");
const PR = await import("./js/data/payroll.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const P0 = await import("./js-pre8D/data/payroll-store.js");
const PR0 = await import("./js-pre8D/data/payroll.js");

const WHO = {
  kabir: ["fin", "Kabir Shah", "EMP-1008"], aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"],
};
let loads = 0, w = null, d = null, jsErrors = [], allErrors = [];
// A page in jsdom, on the shim's storage (copied in, and back out afterwards).
async function open(page, who, query = "") {
  const vc = new VirtualConsole();
  jsErrors = [];
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) { jsErrors.push(e.message); allErrors.push(e.message); } });
  const dom = new JSDOM(HTML[page], { url: `http://localhost/office-os/pages/${FILE[page]}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  for (const [k, v] of mem) w.localStorage.setItem(k, v);
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  const auth = await import("./js/core/auth.js");
  auth.signIn(...(Array.isArray(who) ? who : WHO[who]));
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${SCRIPT[page]}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); allErrors.push(`import: ${e.message}`); }
  mem.clear();
  for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); mem.set(k, w.localStorage.getItem(k)); }
  globalThis.localStorage = shim;
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029", ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";

// ---- scenario helpers ----
let salaryN = 900;
// A new person added now, with a salary (nothing in the app writes salaries) and a bank account; doj undefined = no field.
function hire(name, doj, gross = 60000) {
  const fields = { name, email: `${name.toLowerCase().replace(/\W+/g, ".")}@example.com`, department: "ENG", reportingManager: "Sneha Rao", bankAccount: "1234567890", bankAccountLast4: "7890" };
  if (doj !== undefined) fields.dateOfJoining = doj;
  const id = S.addUser(USER_ACTOR("admin", null), fields).record.id;
  P.allSalaries();
  const box = JSON.parse(localStorage.getItem("officeos:salaries"));
  box.records.push({ id: `SAL-${salaryN++}`, userId: id, gross, effectiveFrom: "2026-01-01", regime: "new" });
  localStorage.setItem("officeos:salaries", JSON.stringify(box));
  return id;
}
const work = (id, day, inAt = [9, 20], outAt = [18, 40]) => { setNow(day, ...inAt); A.checkIn(id, "office"); setNow(day, ...outAt); A.checkOut(id); };
function workRange(id, from, to, skip = []) {
  for (let n = H.dayNumber(from); n <= H.dayNumber(to); n++) { const day = H.isoFromDayNumber(n); if (!H.isDayOff(day) && !skip.includes(day)) work(id, day); }
}
const leave = (id, fields) => L.applyLeave(id, { reason: "x", duration: "full", ...fields });
const approveLeave = (lvId) => { L.decideLeave(lvId, SNEHA, "emp", "approve"); return L.decideLeave(lvId, PRIYA, "hr", "approve"); };
const row = (id, y = 2026, m = 10) => P.payrollRunFor(id, y, m);
const open8 = (r) => r.attendance.openAbsences;
const lopOf = (r) => r.lop;
const statusOn = (id, day) => A.dayFor(id, day).status;
const perDay = (r) => Math.round(r.monthlyGross / r.workingDays);

// =====================================================================
section("A. payroll.js: absenceDays, a third loss-of-pay input with its own field");
check("A1", "lossOfPayDays adds absence days at 1 each (0.5 a half), with late-mark half days and unpaid leave, capped at the working days",
  PR.lossOfPayDays({ absenceDays: 1, workingDays: 22 }) === 1 && PR.lossOfPayDays({ penaltyHalfDays: 1, unpaidLeaveDays: 1, absenceDays: 1.5, workingDays: 22 }) === 3
  && PR.lossOfPayDays({ unpaidLeaveDays: 10, absenceDays: 30, workingDays: 22 }) === 22 && PR.lossOfPayDays({ workingDays: 22 }) === 0);
const grid = [];
for (const g of [0, 64000, 92000, 160000]) for (const p of [0, 1, 3]) for (const u of [0, 0.5, 2]) for (const wd of [0, 21, 22]) grid.push([g, { penaltyHalfDays: p, unpaidLeaveDays: u, workingDays: wd }]);
const sameAsHead = grid.every(([g, x]) => { const now = PR.computePay(g, x), head = PR0.computePay(g, x); return j({ ...now, lop: { ...now.lop, absenceDays: undefined } }) === j({ ...head, lop: { ...head.lop, absenceDays: undefined } }) && now.lop.absenceDays === 0; });
check("A2", `with no absence days, computePay is HEAD's to the rupee for ${grid.length} gross / late-mark / unpaid-leave / working-day combinations; lop.absenceDays is 0`, sameAsHead);
const asAbsence = PR.computePay(64000, { absenceDays: 1, workingDays: 22 }), asLeave = PR.computePay(64000, { unpaidLeaveDays: 1, workingDays: 22 });
check("A3", "an absence day costs exactly what a day of unpaid leave costs, but is reported as its own field (not folded into unpaidLeaveDays)",
  asAbsence.lop.amount === asLeave.lop.amount && asAbsence.net === asLeave.net && j(asAbsence.lop) === j({ penaltyHalfDays: 0, unpaidLeaveDays: 0, absenceDays: 1, days: 1, amount: 2909 })
  && asLeave.lop.absenceDays === 0, j([asAbsence.lop, asLeave.lop]));

// =====================================================================
section("B. The settle window: shown at once, deducted only once the 7-day correction window has closed");
// Seeded 1 Oct 09:00; Nina added then, joining 1 Oct, ₹60,000; works every October working day but Fri 30 Oct.
fresh(); setNow("2026-10-01", 9, 0); A.dayFor(ARJUN, "2026-10-01");
const NINA = hire("Nina Das", "1 Oct 2026");
workRange(NINA, "2026-10-01", "2026-10-29");
const NINA_BASE = snap();
setNow("2026-10-30", 17, 0);
let r = row(NINA);
check("B1", "30 Oct 17:00, not in yet: the day is not-yet; nothing open, nothing deducted", statusOn(NINA, "2026-10-30") === "not-yet" && open8(r).length === 0 && r.lop.absenceDays === 0);
setNow("2026-10-30", 19, 0);
r = row(NINA);
const head30 = P0.payrollRunFor(NINA, 2026, 10);
check("B2", "30 Oct 19:00, the day is over with no check-in: it reads absent (an immediate rule would deduct it now), but it's open, not deducted: correctable until Fri 6 Nov",
  statusOn(NINA, "2026-10-30") === "absent" && r.lop.absenceDays === 0 && r.lop.days === 0
  && j(open8(r)) === j([{ date: "2026-10-30", days: 1, until: "2026-11-06", waiting: false }]), j([r.lop, open8(r)]));
check("B3", "...so the October figures are HEAD's exactly while it's open (HEAD never deducts an absence)", r.net === head30.net && r.gross === head30.gross && r.lop.amount === head30.lop.amount, j([r.net, head30.net]));
const OCT_WD = r.workingDays;
setNow("2026-11-06", 10, 0); r = row(NINA);
const s6 = snap();
const lastDay = A.requestRegularization(NINA, { date: "2026-10-30", issue: "missed-check-in", time: "09:25", reason: "Forgot" });
restore(s6);
check("B4", "6 Nov (day 7): a correction is still accepted, and it's still open, not deducted", lastDay.ok && r.lop.absenceDays === 0 && open8(r).length === 1, lastDay.ok ? lastDay.record.id : lastDay.error);
setNow("2026-11-06", 23, 59); r = row(NINA);
check("B5", "6 Nov 23:59: still open", r.lop.absenceDays === 0 && open8(r).length === 1);
setNow("2026-11-07", 0, 0); r = row(NINA);
const firstRefused = A.requestRegularization(NINA, { date: "2026-10-30", issue: "missed-check-in", time: "09:25", reason: "Forgot" });
check("B6", "7 Nov 00:00 (day 8), the first moment a correction is refused: settled, 1 day deducted, nothing open",
  !firstRefused.ok && firstRefused.error === "Corrections must be asked for within 7 days of the date." && r.lop.absenceDays === 1 && r.lop.days === 1 && open8(r).length === 0,
  j([firstRefused.error, r.lop]));
check("B7", `...a day's pay: ₹60,000 / ${OCT_WD} working days, net down by the same amount the matching unpaid-leave day would take`,
  r.lop.amount === Math.round(60000 / OCT_WD) && r.net === PR.computePay(60000, { unpaidLeaveDays: 1, workingDays: OCT_WD }).net && r.net < head30.net, j([r.lop.amount, r.net, head30.net]));
const slipOct = P.payslipsFor(NINA, "2026-11-07").find((s) => s.month === "2026-10");
check("B8", "the October payslip, seen from November, says the same (1 day, nothing open)", slipOct.lop.absenceDays === 1 && slipOct.attendance.openAbsences.length === 0);
setNow("2026-11-30", 10, 0); r = row(NINA);
check("B9", "30 Nov: still exactly 1 (a settled absence doesn't grow or move)", r.lop.absenceDays === 1 && open8(r).length === 0);
// The evening flap (8B fills the sign-in identities' past days; today is theirs to punch).
fresh(); setNow("2026-10-05", 11, 0); A.dayFor(ARJUN, "2026-10-05");
setNow("2026-10-06", 19, 0);
const four = [AARAV, PRIYA, KABIR, ARJUN];
const eve = four.map((id) => row(id));
const eveHead = four.map((id) => P0.payrollRunFor(id, 2026, 10));
check("B10", "6 Oct 19:00: the four sign-in identities read absent today (nobody punched as them); each is open until 13 Oct, nothing deducted, pay = HEAD's",
  four.every((id) => statusOn(id, "2026-10-06") === "absent") && eve.every((x) => x.lop.absenceDays === 0 && j(open8(x)) === j([{ date: "2026-10-06", days: 1, until: "2026-10-13", waiting: false }]))
  && eve.every((x, i) => x.net === eveHead[i].net), j(eve.map((x) => [x.lop.absenceDays, open8(x).length, x.net])));
setNow("2026-10-07", 9, 0);
const morning = four.map((id) => row(id));
check("B11", "7 Oct 09:00: 6 Oct is filled in as present again, nothing open: the flap never reaches pay",
  four.every((id) => statusOn(id, "2026-10-06") === "present") && morning.every((x) => x.lop.absenceDays === 0 && open8(x).length === 0));

// =====================================================================
section("C. A pending correction or leave request pauses it, the same way");
restore(NINA_BASE);
setNow("2026-11-02", 10, 0);
const rg = A.requestRegularization(NINA, { date: "2026-10-30", issue: "missed-check-in", time: "09:25", reason: "Forgot to punch" }).record;
r = row(NINA);
check("C1", "2 Nov: Nina asks for a missed check-in (pending at Sneha): open and waiting", rg.stage === "manager" && j(open8(r)) === j([{ date: "2026-10-30", days: 1, until: "2026-11-06", waiting: true }]) && r.lop.absenceDays === 0);
setNow("2026-11-09", 10, 0); r = row(NINA);
const corrWaiting = open8(r);
check("C2", "9 Nov, the window closed but the correction still pending at the manager: not deducted", r.lop.absenceDays === 0 && corrWaiting.length === 1 && corrWaiting[0].waiting === true);
const C2 = snap();
A.decideRegularization(rg.id, SNEHA, "emp", "approve"); r = row(NINA);
check("C3", "Sneha approves (manager step): still pending, at HR: still not deducted", A.getRegularization(rg.id).stage === "hr" && r.lop.absenceDays === 0 && open8(r)[0]?.waiting === true);
A.decideRegularization(rg.id, PRIYA, "hr", "approve"); r = row(NINA);
check("C4", "Priya approves (final): 30 Oct reads present; nothing open, nothing deducted", statusOn(NINA, "2026-10-30") === "present" && r.lop.absenceDays === 0 && open8(r).length === 0);
restore(C2);
A.decideRegularization(rg.id, SNEHA, "emp", "reject", "You weren't in"); r = row(NINA);
const reAsk = A.requestRegularization(NINA, { date: "2026-10-30", issue: "missed-check-in", time: "09:25", reason: "Again" });
check("C5", "...or Sneha rejects it on 9 Nov: with the window closed and nothing pending it settles at once (1 day), and can't be asked again",
  r.lop.absenceDays === 1 && open8(r).length === 0 && !reAsk.ok, j([r.lop.absenceDays, reAsk.error]));
restore(NINA_BASE);
setNow("2026-11-02", 10, 0);
const rg2 = A.requestRegularization(NINA, { date: "2026-10-30", issue: "missed-check-in", time: "09:25", reason: "x" }).record;
setNow("2026-11-03", 10, 0); A.decideRegularization(rg2.id, SNEHA, "emp", "reject", "No");
const afterRej = open8(row(NINA));
setNow("2026-11-04", 10, 0);
const rg3 = A.requestRegularization(NINA, { date: "2026-10-30", issue: "missed-check-in", time: "09:25", reason: "Really" });
const afterReAsk = open8(row(NINA));
check("C6", "rejected inside the window: open, not waiting (it can be asked again until 6 Nov); asked again: waiting again",
  j(afterRej) === j([{ date: "2026-10-30", days: 1, until: "2026-11-06", waiting: false }]) && rg3.ok && afterReAsk[0]?.waiting === true);
A.cancelRegularization(rg3.record.id, NINA);
setNow("2026-11-09", 10, 0); r = row(NINA);
check("C7", "a cancelled correction doesn't pause it: on 9 Nov it's settled (1 day)", r.lop.absenceDays === 1 && open8(r).length === 0);
// The same with a leave request instead of a correction.
restore(NINA_BASE);
setNow("2026-11-02", 10, 0);
const lv = leave(NINA, { type: "casual", from: "2026-10-30", to: "2026-10-30" }).record;
setNow("2026-11-09", 10, 0); r = row(NINA);
check("C8", "a pending leave request for 30 Oct (sent 2 Nov, still with Sneha on 9 Nov) pauses it exactly as the pending correction did",
  lv.status === "pending" && r.lop.absenceDays === 0 && j(open8(r)) === j(corrWaiting), j([open8(r), corrWaiting]));
const C8 = snap();
approveLeave(lv.id); r = row(NINA);
check("C9", "the casual leave approved: 30 Oct is on leave; no absence and no unpaid leave (it's paid leave)", statusOn(NINA, "2026-10-30") === "on-leave" && r.lop.absenceDays === 0 && r.lop.unpaidLeaveDays === 0 && open8(r).length === 0);
restore(C8);
L.decideLeave(lv.id, SNEHA, "emp", "reject", "No");
r = row(NINA);
check("C10", "...or rejected on 9 Nov: settles at once, 1 day", r.lop.absenceDays === 1 && open8(r).length === 0);
restore(NINA_BASE);
setNow("2026-11-02", 10, 0);
const ul = leave(NINA, { type: "unpaid", from: "2026-10-30", to: "2026-10-30" }).record;
setNow("2026-11-09", 10, 0);
approveLeave(ul.id); r = row(NINA);
check("C11", "unpaid leave approved for the day instead: 1 day of unpaid leave, 0 absence: 1 day in all, never 2",
  r.lop.unpaidLeaveDays === 1 && r.lop.absenceDays === 0 && r.lop.days === 1 && P.unpaidLeaveDays(NINA, 2026, 10) === 1, j(r.lop));
restore(NINA_BASE);
setNow("2026-11-02", 10, 0);
const wfh = leave(NINA, { type: "wfh", from: "2026-10-30", to: "2026-10-30" });
setNow("2026-11-09", 10, 0); r = row(NINA);
check("C12", "a pending work-from-home request doesn't pause it (approving one wouldn't explain a day with no check-in): settled on 9 Nov",
  wfh.ok && wfh.record.status === "pending" && r.lop.absenceDays === 1 && open8(r).length === 0, wfh.ok ? "" : wfh.error);
restore(NINA_BASE);
setNow("2026-11-02", 10, 0);
const half = leave(NINA, { type: "casual", from: "2026-10-30", to: "2026-10-30", duration: "first-half" }).record;
// Round 10V (setup; was casual leave for 29 Oct, a day she worked): leave can't cover a day already checked in on any
// more, so the other date is one she hasn't worked yet (3 Nov), and 29 Oct's refusal is pinned
const otherWorked = leave(NINA, { type: "casual", from: "2026-10-29", to: "2026-10-29" });
const other = leave(NINA, { type: "casual", from: "2026-11-03", to: "2026-11-03" }).record;
setNow("2026-11-09", 10, 0); r = row(NINA);
check("C13", "a pending half-day leave for the day pauses the whole day; a pending leave for another date doesn't count",
  r.lop.absenceDays === 0 && j(open8(r)) === j([{ date: "2026-10-30", days: 1, until: "2026-11-06", waiting: true }]) && other.status === "pending" && otherWorked.error === "You checked in on 2026-10-29, so leave can't cover that day. If the check-in times are wrong, ask for a correction instead.");
approveLeave(half.id); r = row(NINA);
check("C14", "...the half-day leave approved (window closed, nothing else pending): the other half settles, 0.5 day",
  r.lop.absenceDays === 0.5 && open8(r).length === 0, j(r.lop));
restore(NINA_BASE);
setNow("2026-11-30", 10, 0);
const before = row(NINA).lop.absenceDays;
// Round 8F (behaviour; was: leave had no window, so late leave paused the settled absence again and, once approved,
// refunded it): leave can now be dated at most 7 days back, the same day an absence settles, so a settled absence stays.
const late = leave(NINA, { type: "sick", from: "2026-10-30", to: "2026-10-30" });
const after = row(NINA);
check("C15", "leave filed after the day settled is refused (8F: at most 7 days back), so the settled absence stays deducted",
  before === 1 && !late.ok && late.field === "from" && after.lop.absenceDays === 1 && after.attendance.openAbsences.length === 0,
  j([before, late.ok ? "accepted" : late.error, after.lop.absenceDays]));

// =====================================================================
section("D. The joining-date gate");
const parse = [["12 Jan 2023", "2023-01-12"], ["4 Apr 2019", "2019-04-04"], ["1 Oct 2026", "2026-10-01"], ["2026-10-19", "2026-10-19"], [" 19 Oct 2026 ", "2026-10-19"],
  ["19 October 2026", null], ["19 oct 2026", null], ["31 Feb 2026", null], ["2026-13-01", null], ["sometime in Oct", null], ["", null], [undefined, null], [null, null]];
const parsed = parse.map(([t]) => P.joiningDate(t));
check("D1", "joiningDate reads the stored text ('12 Jan 2023', as profiles show it, or '2026-10-19'); anything else, or a date that doesn't exist, is null",
  parse.every(([, want], i) => parsed[i] === want), j(parsed));
// Seeded 1 Oct; Ravi added Wed 21 Oct, joining Mon 19 Oct (20 Oct is Dussehra); first check-in 22 Oct.
fresh(); setNow("2026-10-01", 9, 0); A.dayFor(ARJUN, "2026-10-01");
setNow("2026-10-21", 9, 0);
const RAVI = hire("Ravi Kumar", "19 Oct 2026");
workRange(RAVI, "2026-10-22", "2026-10-30");
const RAVI_BASE = snap();
setNow("2026-11-30", 10, 0);
r = row(RAVI);
const raviAbsent = A.monthFor(RAVI, 2026, 10).days.filter((x) => x.status === "absent").map((x) => x.date);
check("D2", "a new hire: only 19 Oct (his joining day) and 21 Oct count, 2 days; the absent-looking days before 19 Oct don't",
  // Round 8F (behaviour; was "raviAbsent includes 16 Oct": the days before he joined read absent): they read not-joined now
  r.lop.absenceDays === 2 && open8(r).length === 0 && r.attendance.uncountedAbsences === 0 && !raviAbsent.includes("2026-10-16") && A.dayFor(RAVI, "2026-10-16").status === "not-joined"
  && raviAbsent.includes("2026-10-19"), j([r.lop.absenceDays, raviAbsent.length]));
const sep = P.payslipsFor(RAVI, "2026-11-30").find((s) => s.month === "2026-09");
// Round 8F (behaviour; was: a September payslip existed, made of absent days, with nothing counted): a month wholly
// before joining has no payslip now; the payslips list and payslip-view say why (periods D8 / D9)
check("D3", "he has no September payslip (wholly before he joined); October's is his first", !sep && P.payslipsFor(RAVI, "2026-11-30").at(-1).month === "2026-10");
const withDoj = (doj) => { restore(RAVI_BASE); S.updateUser(USER_ACTOR("admin", RAVI), RAVI, { dateOfJoining: doj }); setNow("2026-11-30", 10, 0); return row(RAVI); };
const r16 = withDoj("16 Oct 2026"), r22 = withDoj("22 Oct 2026"), rIso = withDoj("2026-10-19");
check("D4", "the joining day is the first counted: joining 16 Oct counts 16, 19, 21 Oct (3); joining 22 Oct counts none; '2026-10-19' = '19 Oct 2026'",
  r16.lop.absenceDays === 3 && r22.lop.absenceDays === 0 && rIso.lop.absenceDays === 2, j([r16.lop.absenceDays, r22.lop.absenceDays, rIso.lop.absenceDays]));
const unreadable = ["", "sometime in Oct", "31 Feb 2026", "19 October 2026"].map((t) => withDoj(t));
restore(RAVI_BASE); { const box = JSON.parse(localStorage.getItem("officeos:users")); delete box.records.find((u) => u.id === RAVI).dateOfJoining; localStorage.setItem("officeos:users", JSON.stringify(box)); }
setNow("2026-11-30", 10, 0); unreadable.push(row(RAVI));
check("D5", "no joining date, or one that can't be read: nothing is counted (lop 0, nothing open), and every no-check-in absent day is reported as uncounted",
  // Round 8F (behaviour; was raviAbsent.length, which 8F's not-joined days make 2): with no readable date attendance
  // can't place the joining date either, so all 13 no-check-in days read absent and are reported uncounted, as in 8D
  unreadable.every((x) => x.lop.absenceDays === 0 && x.lop.amount === 0 && open8(x).length === 0 && x.attendance.uncountedAbsences === 13),
  j(unreadable.map((x) => [x.lop.absenceDays, x.attendance.uncountedAbsences])));
fresh(); setNow("2026-10-01", 9, 0); A.dayFor(ARJUN, "2026-10-01");
const noDate = S.getAllUsers().filter((u) => u.status !== "inactive" && !P.joiningDate(u.dateOfJoining)).map((u) => u.id);
check("D6", "the seed: Aarav, Priya, Kabir and Arjun have readable joining dates; Ananya, Meera, Sneha, Rohan and Vikram have none on file",
  j(noDate) === j([ANANYA, MEERA, SNEHA, ROHAN, VIKRAM]) && [AARAV, PRIYA, KABIR, ARJUN].every((id) => P.joiningDate(S.getUser(id).dateOfJoining)), j(noDate));
// The investigation's census case: seeded 30 Sep 11:00, viewed 6 Oct; Vikram's seeded absence is 15 Sep.
fresh(); setNow("2026-09-30", 11, 0); A.dayFor(ARJUN, "2026-09-30");
{ const r = A.decideRegularization("RG-102", "EMP-1003", "hr", "reject", "Decided before the clock (round 11W)"); if (!r.ok) throw new Error(`round 11W restage, RG-102: ${r.error}`); }   // Round 11W (restage): RG-102 rejected at the seed (D7 / D8)
setNow("2026-10-06", 10, 0);
const vSep = row(VIKRAM, 2026, 9), vSepHead = P0.payrollRunFor(VIKRAM, 2026, 9);
check("D7", "so Vikram's seeded absence (15 Sep) isn't counted (decision 3: no readable date, nothing counted): uncounted 1, his September pay = HEAD's (₹1,455 loss of pay)",
  statusOn(VIKRAM, "2026-09-15") === "absent" && vSep.lop.absenceDays === 0 && vSep.attendance.uncountedAbsences === 1 && vSep.lop.amount === 1455 && vSep.net === vSepHead.net,
  j([vSep.lop, vSep.attendance.uncountedAbsences]));
S.updateUser(USER_ACTOR("admin", VIKRAM), VIKRAM, { dateOfJoining: "8 Jan 2024" });
const vDated = row(VIKRAM, 2026, 9);
check("D8", "given a joining date, the same absence is settled (15 Sep + 7 days is long past): 0.5 late-mark + 1 absence = 1.5 days, ₹4,364, the investigation's figure",
  vDated.lop.absenceDays === 1 && vDated.lop.days === 1.5 && vDated.lop.amount === 4364 && vDated.attendance.uncountedAbsences === 0, j(vDated.lop));
// Seeded Fri 16 Oct 09:00, before anyone's seeded check-in: that evening the seed day reads absent for the five who don't
// sign in (8B fills it in from the next day). With no joining date, only settled absences are reported as uncounted.
fresh(); setNow("2026-10-16", 9, 0); A.dayFor(ARJUN, "2026-10-16");
setNow("2026-10-16", 19, 0);
const evening = [MEERA, VIKRAM].map((id) => row(id));
const vSepEve = row(VIKRAM, 2026, 9);
check("D9", "seed-day evening: Meera and Vikram read absent today but nothing is reported for it (not settled; with no date nothing is listed as open); Vikram's settled 30 Sep is uncounted",
  statusOn(MEERA, "2026-10-16") === "absent" && evening.every((x) => x.attendance.uncountedAbsences === 0 && open8(x).length === 0 && x.lop.absenceDays === 0)
  && vSepEve.attendance.uncountedAbsences === 1, j([evening.map((x) => x.attendance), vSepEve.attendance.uncountedAbsences]));
setNow("2026-10-19", 9, 0);
check("D10", "the next working morning the seed day reads present for Meera: the uncounted report never flapped", statusOn(MEERA, "2026-10-16") === "present" && row(MEERA).attendance.uncountedAbsences === 0);

// =====================================================================
section("E. Half-day leave: half an absence, never a double count; short days left out");
// Nina again; October with: 6 Oct unpaid first-half leave + no check-in; 7 Oct casual second-half + no check-in; 8 Oct a short
// day (09:20-12:00); 9 Oct casual first-half + unpaid second-half (both halves on leave); 12 Oct a full day of unpaid
// leave; 13 Oct a half day by hours (09:20-15:00). Every other working day worked.
fresh(); setNow("2026-10-01", 9, 0); A.dayFor(ARJUN, "2026-10-01");
const NINA2 = hire("Nina Das", "1 Oct 2026");
setNow("2026-10-01", 9, 5);
for (const f of [{ type: "unpaid", from: "2026-10-06", to: "2026-10-06", duration: "first-half" }, { type: "casual", from: "2026-10-07", to: "2026-10-07", duration: "second-half" },
  { type: "casual", from: "2026-10-09", to: "2026-10-09", duration: "first-half" }, { type: "unpaid", from: "2026-10-09", to: "2026-10-09", duration: "second-half" },
  { type: "unpaid", from: "2026-10-12", to: "2026-10-12" }]) {
  const x = leave(NINA2, f);
  if (!x.ok) console.log(`  (setup) leave refused: ${x.error}`); else approveLeave(x.record.id);
}
workRange(NINA2, "2026-10-01", "2026-10-30", ["2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-12", "2026-10-13"]);
work(NINA2, "2026-10-08", [9, 20], [12, 0]);
work(NINA2, "2026-10-13", [9, 20], [15, 0]);
const E_BASE = snap();
setNow("2026-10-08", 19, 0);
const early8 = open8(row(NINA2));
check("E1", "8 Oct 19:00: 6 Oct (first half on unpaid leave, no check-in afterwards) and 7 Oct are open at half a day each, until 13 / 14 Oct; the short day isn't listed",
  j(early8) === j([{ date: "2026-10-06", days: 0.5, until: "2026-10-13", waiting: false }, { date: "2026-10-07", days: 0.5, until: "2026-10-14", waiting: false }]), j(early8));
setNow("2026-11-30", 10, 0);
r = row(NINA2);
const st = ["2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-12", "2026-10-13"].map((x) => statusOn(NINA2, x));
check("E2", "the days read absent, absent, absent (short), on-leave, on-leave, half-day", j(st) === j(["absent", "absent", "absent", "on-leave", "on-leave", "half-day"]), j(st));
check("E3", "settled: absence 0.5 (6 Oct) + 0.5 (7 Oct) = 1; unpaid leave 0.5 (6 Oct) + 0.5 (9 Oct) + 1 (12 Oct) = 2; 3 days in all. 6 Oct costs 1 day, not 1.5",
  r.lop.absenceDays === 1 && r.lop.unpaidLeaveDays === 2 && r.lop.days === 3 && r.lop.amount === Math.round((60000 * 3) / r.workingDays), j(r.lop));
check("E4", "the short day (checked in, 2 h 40 m) is neither counted, open nor uncounted (decision 2: out of scope); the 4-8 h half day costs nothing",
  open8(r).length === 0 && r.attendance.uncountedAbsences === 0 && A.dayFor(NINA2, "2026-10-08").checkIn === "09:20");

// =====================================================================
section("F. Pages: the run's checks card, payslip notes, the Policy card");
// Seeded Mon 26 Oct 09:00, so Vikram's seeded absence falls on 8 Oct; viewed Fri 30 Oct 19:00 (the sign-in four absent today).
fresh(); setNow("2026-10-26", 9, 0); A.dayFor(ARJUN, "2026-10-26");
const F_BASE = snap();
// Round 11W (restage): both October late-arrival corrections rejected at the seed, after F_BASE (F1's wording)
["RG-102", "RG-103"].forEach((id) => { const r = A.decideRegularization(id, PRIYA, "hr", "reject", "Decided before the clock (round 11W)"); if (!r.ok) throw new Error(`round 11W restage, ${id}: ${r.error}`); });
setNow("2026-10-30", 19, 0);
const checksOf = () => [...d.getElementById("run-checks").children].map((c) => [c.dataset.check, txt(c.querySelector(".list__title")), txt(c.querySelector(".list__sub")), txt(c.querySelector(".badge"))]);
await open("run", "kabir");
let cks = checksOf();
const attCheck = cks.find((c) => c[1] === "Attendance recorded");
check("F1", "run page, 30 Oct 19:00: 'Attendance recorded' lists the four open absences with their correction date, and Vikram's uncounted one, badge Review",
  j(attCheck) === j(["computed", "Attendance recorded", "4 absences aren't deducted yet: they can still be corrected until 6 Nov. Not counted, with no readable joining date on file: Vikram Singh (1 absence).", "Review"]),
  j(attCheck));
const rule = cks.find((c) => c[1] === "Unexplained absences");
check("F2", "a rule line says what an absence costs and when; the card now has 7 checks",
  j(rule) === j(["rule", "Unexplained absences", "A working day with no check-in and no approved leave costs a day's pay once its 7-day correction window has closed and no correction or leave request for it is waiting; days before someone's joining date aren't counted", "Done"])
  && cks.length === 7 && txt(d.getElementById("run-checks-meta")) === "7 checks" && jsErrors.length === 0, j([rule, cks.length, jsErrors]));
A.requestRegularization(PRIYA, { date: "2026-10-30", issue: "missed-check-in", time: "09:20", reason: "Forgot" });
await open("run", "kabir");
check("F3", "Priya asks for a correction for today: '3 can still be corrected until 6 Nov; 1 has a correction or leave request waiting for a decision'",
  checksOf().find((c) => c[1] === "Attendance recorded")[2].startsWith("4 absences aren't deducted yet: 3 can still be corrected until 6 Nov; 1 has a correction or leave request waiting for a decision."), checksOf().find((c) => c[1] === "Attendance recorded")[2]);
restore(F_BASE); setNow("2026-10-30", 19, 0);
S.updateUser(USER_ACTOR("admin", VIKRAM), VIKRAM, { dateOfJoining: "8 Jan 2024" });
const vOct = row(VIKRAM);
await open("run", "kabir");
cks = checksOf();
check("F4", "Vikram given a joining date: his 8 Oct absence is settled and deducted; 'Attendance recorded' is In progress; 'Loss-of-pay days' counts it",
  vOct.lop.absenceDays === 1 && cks.find((c) => c[1] === "Attendance recorded")[3] === "In progress"
  && cks.find((c) => c[1] === "Loss-of-pay days")[2].includes(`${vOct.lop.days} day`), j([vOct.lop, cks.find((c) => c[1] === "Loss-of-pay days")]));
const notes = () => [...d.getElementById("payslip-notes").children].map(txt);
await open("view", "kabir", `?employee=${VIKRAM}&month=2026-10`);
const lopNote = notes().find((n) => n.startsWith("Loss of pay:"));
check("F5", "Vikram's October payslip: the loss-of-pay note names '1 day of unexplained absence' (not unpaid leave); the LOP days field is the row's",
  Boolean(lopNote) && lopNote.includes("1 day of unexplained absence") && !lopNote.includes("unpaid leave") && txt(d.querySelector('[data-field="lop-days"]')) === String(vOct.lop.days) && jsErrors.length === 0,
  j([lopNote, txt(d.querySelector('[data-field="lop-days"]'))]));
restore(F_BASE); setNow("2026-10-30", 19, 0);
await open("view", "kabir", `?employee=${VIKRAM}&month=2026-10`);
check("F6", "without a joining date, his payslip says the day isn't counted and why",
  notes().includes("1 day with no check-in isn't counted as an absence: there's no readable joining date on file to count from."), j(notes()));
await open("view", "aarav");
check("F7", "Aarav's own payslip at 19:00: 'Not deducted yet: 1 absence with no check-in, on 30 Oct (can still be corrected until 6 Nov). ...'",
  notes().includes("Not deducted yet: 1 absence with no check-in, on 30 Oct (can still be corrected until 6 Nov). Each costs a day's pay (half with half-day leave) once its 7-day correction window has closed and nothing for it is waiting for a decision."),
  j(notes()));
restore(F_BASE); setNow("2026-10-27", 10, 0);
await open("run", "kabir");
const inProg = checksOf().find((c) => c[1] === "Attendance recorded")[2];
await open("view", "aarav");
check("F8", "mid-month, the 'isn't over' notes say absences can still change the figures (run page and payslip)",
  inProg.includes("so late marks, unpaid leave and absences can still change these figures.") && notes().some((n) => n.endsWith("so late marks, unpaid leave and absences can still change this payslip.")), j([inProg, notes()]));
// Nina's payslip: a waiting absence, and a half day.
restore(NINA_BASE); setNow("2026-11-02", 10, 0);
A.requestRegularization(NINA, { date: "2026-10-30", issue: "missed-check-in", time: "09:25", reason: "x" });
setNow("2026-11-09", 10, 0);
await open("view", "kabir", `?employee=${NINA}&month=2026-10`);
check("F9", "Nina's October payslip on 9 Nov: '30 Oct (a correction or leave request is waiting for a decision)'",
  notes().some((n) => n.startsWith("Not deducted yet: 1 absence with no check-in, on 30 Oct (a correction or leave request is waiting for a decision).")), j(notes()));
const policy = new JSDOM(fs.readFileSync(`${DIR}/attendance/regularization.html`, "utf8")).window.document;
const kv = [...policy.querySelectorAll(".kv__row")].map((x) => [txt(x.querySelector("dt")), txt(x.querySelector("dd"))]);
check("F10", "regularization.html's Policy card states the rule beside the late-mark one, with the same 7-day window",
  j(kv.find((x) => x[0] === "Absent, no leave or correction")) === j(["Absent, no leave or correction", "A day's pay (half with half-day leave), taken once the 7-day window has closed and no correction or leave request for the day is waiting; not before"])
  && j(kv.find((x) => x[0] === "Request window")) === j(["Request window", "7 days after the date"]) && A.ATTENDANCE_RULES.requestWindowDays === 7, j(kv));

// Absences with different correction dates (section E's October, 8 Oct 19:00: Nina's two half days, the four today).
restore(E_BASE); setNow("2026-10-08", 19, 0);
await open("run", "kabir");
const e8 = checksOf().find((c) => c[1] === "Attendance recorded")[2];
await open("view", "kabir", `?employee=${NINA2}&month=2026-10`);
check("F11", "different correction dates: the run page gives the latest (15 Oct), not the earliest (13 Oct); Nina's payslip lists each day, half days marked",
  e8.includes("6 absences aren't deducted yet: they can still be corrected until 15 Oct.")
  && notes().some((n) => n.startsWith("Not deducted yet: 2 absences with no check-in, on 6 Oct, half a day (can still be corrected until 13 Oct) and 7 Oct, half a day (can still be corrected until 14 Oct).")),
  j([e8, notes()]));
// Three reasons on one payslip: Vikram (dated) in the census case, with a day of unpaid leave added for 29 Sep.
fresh(); setNow("2026-09-30", 11, 0); A.dayFor(ARJUN, "2026-09-30");
{ const r = A.decideRegularization("RG-102", "EMP-1003", "hr", "reject", "Decided before the clock (round 11W)"); if (!r.ok) throw new Error(`round 11W restage, RG-102: ${r.error}`); }   // Round 11W (restage): RG-102 rejected at the seed (F12's late-mark half day)
setNow("2026-10-06", 10, 0);
S.updateUser(USER_ACTOR("admin", VIKRAM), VIKRAM, { dateOfJoining: "8 Jan 2024" });
// Round 10V (decision; was the unpaid day sent and approved through the live store): 29 Sep is a stored sample day
// Vikram checked in on, and leave can't cover such a day any more (workedday.mjs S1), so the live refusal is pinned and
// the unpaid day is data made before 10V, through the pre-10V leave store (js-pre10V): F12 is about the payslip's wording
const L10V0 = await import("./js-pre10V/data/leave-store.js");
const vulLive = leave(VIKRAM, { type: "unpaid", from: "2026-09-29", to: "2026-09-29" });
const vul = L10V0.applyLeave(VIKRAM, { reason: "x", duration: "full", type: "unpaid", from: "2026-09-29", to: "2026-09-29" });
const vulOk = vulLive.ok === false && vul.ok && L10V0.decideLeave(vul.record.id, PRIYA, "hr", "approve").ok;
await open("view", "kabir", `?employee=${VIKRAM}&month=2026-09`);
check("F12", "three reasons read as a list: '(1 late-mark half day, 1 day of unpaid leave and 1 day of unexplained absence)'",
  vulOk && notes().some((n) => n.includes("(1 late-mark half day, 1 day of unpaid leave and 1 day of unexplained absence)")), j([vulOk, notes()]));
check("F13", "no page errors on any of the loads above", allErrors.length === 0 && loads === 12, j([loads, allErrors]));

// =====================================================================
section("G. Known limitations, pinned (logged in the round notes, not fixed in 8D)");
restore(RAVI_BASE); setNow("2026-11-30", 10, 0);
const preJoin = A.monthFor(RAVI, 2026, 10).days.filter((x) => x.date < "2026-10-19" && !H.isDayOff(x.date)).map((x) => x.status);
// Round 8F (behaviour; was KNOWN: they read "absent"): fixed in 8F, they read "not-joined"
check("G1", "FIXED in 8F: a new hire's working days before their joining date read 'not-joined', not 'absent'",
  preJoin.length > 0 && preJoin.every((s) => s === "not-joined"), `${preJoin.length} days, ${[...new Set(preJoin)]}`);
// 27 Oct was worked in NINA_BASE: remove that record first, so the day has no check-in.
restore(NINA_BASE);
{ const box = JSON.parse(localStorage.getItem("officeos:attendance")); box.records = box.records.filter((x) => !(x.userId === NINA && x.date === "2026-10-27")); localStorage.setItem("officeos:attendance", JSON.stringify(box)); }
setNow("2026-10-28", 10, 0);
const g2 = A.requestRegularization(NINA, { date: "2026-10-27", issue: "missed-check-in", time: "09:25", reason: "Forgot" }).record;
const g2lv = leave(NINA, { type: "casual", from: "2026-10-27", to: "2026-10-27" }).record;
approveLeave(g2lv.id);
const onLeave = statusOn(NINA, "2026-10-27");
A.decideRegularization(g2.id, SNEHA, "emp", "approve");
const g2fin = A.decideRegularization(g2.id, PRIYA, "hr", "approve");
const g2day = A.dayFor(NINA, "2026-10-27");
// Round 8F (behaviour; was KNOWN: the final approval wrote a check-in onto the leave day, present with conflict)
check("G2", "FIXED in 8F: a correction still pending when leave for the same day is approved is refused at its final approval; the day stays on leave",
  onLeave === "on-leave" && !g2fin.ok && /approved leave now covers that day/.test(g2fin.error) && g2day.status === "on-leave", j([onLeave, g2fin.ok, g2day.status, g2day.conflict]));

// =====================================================================
section("H. Source");
const JS = `${HERE}js`, JS0 = `${HERE}js-pre8D`;
const walk = (root, rel = "") => fs.readdirSync(`${root}/${rel}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${rel}${e.name}/`) : [`${rel}${e.name}`]));
const JS8D = `${HERE}js-pre8F`;   // Round 8F (layout): 8D's own change set, read from its frozen result (HEAD 8d1a23b); ./js now holds 8F's
const files = walk(JS8D).sort(), files0 = walk(JS0).sort();
const changedJs = files.filter((f) => !files0.includes(f) || fs.readFileSync(`${JS8D}/${f}`, "utf8") !== fs.readFileSync(`${JS0}/${f}`, "utf8"));
check("H1", "js changed from HEAD: exactly payroll.js, payroll-store.js, payroll-run.js, payslip-view.js; nothing added or removed",
  j(changedJs) === j(["data/payroll-store.js", "data/payroll.js", "pages/payroll-run.js", "pages/payslip-view.js"]) && j(files) === j(files0), j(changedJs));
check("H2", "attendance-store.js is byte-identical to HEAD: no status changes, the pre-join display isn't patched any other way (decision 3)",
  fs.readFileSync(`${JS8D}/data/attendance-store.js`, "utf8") === fs.readFileSync(`${JS0}/data/attendance-store.js`, "utf8") /* Round 8F (layout) */);
const pr = fs.readFileSync(`${JS}/data/payroll.js`, "utf8");
check("H3", "payroll.js stays pure: no imports, no storage, no clock", !/\bimport\b/.test(pr) && !/localStorage|new Date|Date\.now/.test(pr));
const fnText = (src, name) => { const i = src.indexOf(`export function ${name}(`); return src.slice(i, src.indexOf("\n}", i) + 2); };
// Round 11Y (layout; was the live payroll-store.js: 8D's statement read from the frozen result 11X left, js-pre11Y =
// office-os 8ae4c9c; 11Y stops a leaver's unpaid leave at their last working day since (leavers.mjs P4))
const ps = fs.readFileSync(`${HERE}js-pre11Y/data/payroll-store.js`, "utf8"), ps0 = fs.readFileSync(`${JS0}/data/payroll-store.js`, "utf8");
check("H4", "unpaidLeaveDays() is unchanged (absences aren't folded into unpaid leave); the window is the one constant, requestWindowDays",
  fnText(ps, "unpaidLeaveDays") === fnText(ps0, "unpaidLeaveDays") && ps.includes("ATTENDANCE_RULES.requestWindowDays") && !/\b7\b/.test(ps.slice(ps.indexOf("// ---------- unexplained absences"), ps.indexOf("export function payrollRunFor"))));
check("H5", "attendance-store.js doesn't import payroll-store.js (no cycle)", !fs.readFileSync(`${JS}/data/attendance-store.js`, "utf8").split("\n").some((l) => /^import .*payroll-store/.test(l)));
const crlf = ["data/payroll.js", "data/payroll-store.js", "pages/payroll-run.js", "pages/payslip-view.js"].map((f) => fs.readFileSync(`${JS}/${f}`, "utf8"))
  .concat([fs.readFileSync(`${DIR}/attendance/regularization.html`, "utf8")]);
check("H6", "the five changed files are CRLF only, with no final newline", crlf.every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
