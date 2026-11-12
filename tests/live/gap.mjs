// usage: node gap.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12H: round-12g-notes.md G12, ruling approved 2026-10-26: keep the time away on the record. Reactivating a
// leaver used to delete their last working day and nothing else, so the days between it and the reactivation read as
// days worked (the sample data works them out as "present") and were paid in full. Now each reactivation adds
// { dateOfLeaving, reactivatedOn } to user.leavingPeriods, and attendance reads a working day inside any of them as
// "left", as it does after a current leaver's last working day; payroll follows it where it reads that day itself.
// ./js-pre12H, ./html-pre12H and ./css-pre12H are the code, pages and css before this round (office-os 90982d2).
//   G  G12 reproduced (scan-gap.mjs): Rohan leaves 2 Nov, is reactivated 16 Nov; November pays 2 Nov and 16-30 Nov
//   R  repeated leaving and coming back; a month wholly away (no row, payslips walk past it)
//   U  requests on days away: approved unpaid leave isn't taken off twice; a pending one covering only days away
//      doesn't hold up the run (12B), one reaching a day after the reactivation does
//   P  approved months: their rows still match the live figures; a refused reactivation records nothing
//   N  nothing changes for someone who never left, nor for a current leaver (11Y), read by this and the code before
//   W  the history is written only by a reactivation; E what stays; X scope
// Storage seeded Fri 30 Oct 2026 19:00 (as rejoin.mjs does).
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
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ROHAN = "EMP-1042", ARJUN = "EMP-1105", VIKRAM = "EMP-1088";
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, query = "") {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${DIR}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = () => true;
  w.HTMLElement.prototype.scrollIntoView = () => {};
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
const errOf = (r) => (r?.ok ? "ok" : r?.error ?? "no result");

const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const A = await import("./js/data/attendance-store.js");
const OLD = await import("./js-pre12H/data/payroll-store.js");   // before this round, on the same storage
const OLDA = await import("./js-pre12H/data/attendance-store.js");

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
// A request stored as-is (a copy of the first stored one with these fields), as if made and decided earlier.
let added = 0;
function rawAdd(key, fields) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  const id = box.records[0].id.replace(/\d+$/, String(9000 + ++added));
  box.records.push({ ...box.records[0], history: [], id, ...fields });
  mem.set(`officeos:${key}`, JSON.stringify(box));
  return id;
}
// Seeded Fri 30 Oct 19:00; October's seeded pending requests settled and Vikram given a joining date (as rejoin.mjs's
// october() does), so a month can be prepared and approved once its window shuts.
function seeded() {
  mem.clear(); setNow(2026, 10, 30, 19); PS.payrollRun(2026, 10);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
}
const setup = (r, what) => { if (!r?.ok) console.log(`setup (${what}):`, errOf(r)); return r; };
const leaves = (y, mo, dd, last) => { setNow(y, mo, dd); return setup(S.deactivateUser(PRIYA, ROHAN, last), `leaves ${last}`); };
const back = (y, mo, dd) => { setNow(y, mo, dd); return setup(S.reactivateUser(AARAV, ROHAN), `back ${dd}/${mo}`); };
const approve = (y, m) => { setup(safe(() => PS.prepareRun(KABIR, y, m)), `prepare ${m}`); return setup(safe(() => PS.approveRun(AARAV, y, m)), `approve ${m}`); };
// The working days of a month that read "left", by day of the month.
const leftIn = (mod, id, y, m) => (mod.monthFor(id, y, m)?.days ?? []).filter((x) => x.status === "left").map((x) => Number(x.date.slice(8)));
const statusOn = (id, date) => A.monthFor(id, Number(date.slice(0, 4)), Number(date.slice(5, 7)))?.days.find((x) => x.date === date)?.status ?? null;
const history = (id) => S.getUser(id).leavingPeriods ?? null;
const grossFor = (leftDays) => 92000 - Math.round((92000 * leftDays) / 21);   // Rohan's November: 21 working days
const row = (mod, id, y, m) => mod.payrollRunFor(id, y, m);
const pick = (r) => r && { gross: r.gross, net: r.net, lop: r.lop, attendance: r.attendance };
// After every reactivation and approval this suite makes, each approved run's rows == the live figures (P1 / P2).
const pBad = [];
function approvedMatch(tag) {
  for (const run of [[2026, 10], [2026, 11], [2026, 12]].map(([y, m]) => PS.storedRun(y, m)).filter((x) => x?.status === "approved")) {
    const [y, m] = run.month.split("-").map(Number);
    for (const u of S.getAllUsers()) {
      const fixed = run.rows.find((x) => x.userId === u.id)?.net ?? null, live = PS.payrollRunFor(u.id, y, m)?.net ?? null;
      if (fixed !== live) pBad.push(`${tag}: ${run.month} ${u.id} ${fixed} vs ${live}`);
    }
  }
}

// =================================================================
section("G. G12 reproduced: away 3-13 Nov, back 16 Nov");
seeded();
leaves(2026, 11, 2, "2026-11-02");
const g1 = back(2026, 11, 16);
check("G1", "Rohan (left 2 Nov) reactivated on 16 Nov: allowed; active, no last working day, and the time away kept: [{ 2 Nov 2026, 16 Nov 2026 }]",
  g1?.ok && S.getUser(ROHAN).status === "active" && !("dateOfLeaving" in S.getUser(ROHAN)) && j(history(ROHAN)) === j([{ dateOfLeaving: "2 Nov 2026", reactivatedOn: "16 Nov 2026" }]), j(history(ROHAN)));
check("G2", "on 16 Nov: November's working days 3-13 read \"left\" (9 of them); 2 Nov (his last working day) and 16 Nov (the day he came back) are worked",
  j(leftIn(A, ROHAN, 2026, 11)) === j([3, 4, 5, 6, 9, 10, 11, 12, 13]) && statusOn(ROHAN, "2026-11-02") === "present" && statusOn(ROHAN, "2026-11-16") === "present", j([leftIn(A, ROHAN, 2026, 11), statusOn(ROHAN, "2026-11-16")]));
setNow(2026, 12, 9);
const g3 = row(PS, ROHAN, 2026, 11), g3old = row(OLD, ROHAN, 2026, 11);
check("G3", "9 Dec: November pays him for 2 Nov and 16-30 Nov: gross ₹52,571 (₹39,429 off for 9 days away), no absence; the code before paid ₹92,000",
  g3?.gross === 52571 && g3.lop.leftDays === 9 && g3.lop.amount === 39429 && g3.lop.absenceDays === 0 && g3.workingDays === 21 && g3old?.gross === 92000, j([pick(g3), g3old?.gross]));
check("G4", "nothing holds November up, and it's approved with his row as the live figures",
  j(PS.runProblems(2026, 11)) === "[]" && approve(2026, 11)?.ok && PS.storedRun(2026, 11).rows.find((r) => r.userId === ROHAN)?.gross === 52571, j(PS.runProblems(2026, 11)));
check("G5", "the days away are labelled, not absences: his November payslip names 9 days after the last working day and no last day of its own (he's not a leaver now)",
  PS.payslipsFor(ROHAN, "2026-12-09").find((s) => s.month === "2026-11")?.lop.leftDays === 9 && !("lastDay" in g3.attendance), j(g3.attendance));
// The page paths: the profile's Reactivate and the edit form's Account active box.
seeded(); leaves(2026, 11, 2, "2026-11-02"); setNow(2026, 11, 16);
setSession("admin", "Aarav Mehta", AARAV); await open("users/user-profile", `?id=${ROHAN}`);
[...d.querySelectorAll(".page-header__actions button")].find((b) => txt(b) === "Reactivate")?.click();
check("G6", "the profile's Reactivate keeps the time away the same way", S.getUser(ROHAN).status === "active" && j(history(ROHAN)) === j([{ dateOfLeaving: "2 Nov 2026", reactivatedOn: "16 Nov 2026" }]), j(history(ROHAN)));
seeded(); leaves(2026, 11, 2, "2026-11-02"); setNow(2026, 11, 16);
setSession("admin", "Aarav Mehta", AARAV); await open("users/user-form", `?id=${ROHAN}`);
const box = d.getElementById("account-active");
if (box) box.checked = true;
d.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
check("G7", "so does the edit form's Account active box; 3-13 Nov read \"left\"", S.getUser(ROHAN).status === "active" && history(ROHAN)?.length === 1 && j(leftIn(A, ROHAN, 2026, 11)) === j([3, 4, 5, 6, 9, 10, 11, 12, 13]), j(history(ROHAN)));

// =================================================================
section("R. Leaving and coming back more than once");
seeded();
leaves(2026, 11, 2, "2026-11-02"); back(2026, 11, 9);
leaves(2026, 11, 13, "2026-11-13");
setNow(2026, 11, 18);
check("R1", "away again (left 13 Nov), on 18 Nov: the first period still reads \"left\" (3-6 Nov), and so does everything after 13 Nov; one past period, the live last working day 13 Nov",
  j(leftIn(A, ROHAN, 2026, 11)) === j([3, 4, 5, 6, 16, 17, 18, 19, 20, 23, 24, 25, 26, 27, 30]) && history(ROHAN)?.length === 1 && S.leavingDate(S.getUser(ROHAN)) === "2026-11-13"
  && row(PS, ROHAN, 2026, 11)?.attendance.lastDay === "2026-11-13", j(leftIn(A, ROHAN, 2026, 11)));
back(2026, 11, 20);
check("R2", "back on 20 Nov: both periods kept, in order (appended, not overwritten); 3-6 and 16-19 Nov read \"left\"; 9, 13 and 20 Nov are worked",
  j(history(ROHAN)) === j([{ dateOfLeaving: "2 Nov 2026", reactivatedOn: "9 Nov 2026" }, { dateOfLeaving: "13 Nov 2026", reactivatedOn: "20 Nov 2026" }])
  && j(leftIn(A, ROHAN, 2026, 11)) === j([3, 4, 5, 6, 16, 17, 18, 19]) && ["2026-11-09", "2026-11-13", "2026-11-20"].every((x) => statusOn(ROHAN, x) === "present"), j([history(ROHAN), leftIn(A, ROHAN, 2026, 11)]));
leaves(2026, 11, 25, "2026-11-25");
setNow(2026, 12, 9);
const r3 = row(PS, ROHAN, 2026, 11);
check("R3", "a third leaving (25 Nov), still away on 9 Dec: November's \"left\" days are the two past periods and the days after 25 Nov; he's a leaver with that last working day",
  j(leftIn(A, ROHAN, 2026, 11)) === j([3, 4, 5, 6, 16, 17, 18, 19, 26, 27, 30]) && r3?.lop.leftDays === 11 && r3.gross === grossFor(11) && r3.attendance.lastDay === "2026-11-25" && history(ROHAN)?.length === 2, j(pick(r3)));
back(2026, 12, 9);
const r4 = row(PS, ROHAN, 2026, 11);
check("R4", "back again on 9 Dec: three periods; November pays 2, 9-13, 20-25 Nov (gross for 11 days away), and December's working days 1-8 Dec read \"left\" (9 Dec is worked)",
  history(ROHAN)?.length === 3 && r4?.gross === grossFor(11) && j(leftIn(A, ROHAN, 2026, 12)) === j([1, 2, 3, 4, 7, 8]), j([pick(r4), leftIn(A, ROHAN, 2026, 12)]));
// A month wholly away: left Fri 30 Oct, back Tue 1 Dec.
seeded();
leaves(2026, 10, 30, "2026-10-30"); back(2026, 12, 1);
setNow(2026, 12, 9);
check("R5", "left 30 Oct, back 1 Dec: no November row for him (as after a leaver's final month), and he's not in November's run; the code before paid him all of it",
  row(PS, ROHAN, 2026, 11) === null && !PS.payrollRun(2026, 11).rows.some((r) => r.userId === ROHAN) && row(OLD, ROHAN, 2026, 11)?.gross === 92000, j(pick(row(PS, ROHAN, 2026, 11))));
const slips = PS.payslipsFor(ROHAN, "2026-12-09").map((s) => s.month);
check("R6", "his payslips walk past November: December, then October (paid in full, nothing after 30 Oct in it)",
  j(slips) === j(["2026-12", "2026-10"]) && PS.payslipsFor(ROHAN, "2026-12-09")[1].lop.leftDays === undefined, j(slips));
check("R7", "December reads nothing \"left\": 1 Dec, the day he came back, is worked", j(leftIn(A, ROHAN, 2026, 12)) === "[]" && statusOn(ROHAN, "2026-12-01") === "present", j(leftIn(A, ROHAN, 2026, 12)));

// =================================================================
section("U. Requests on days away");
const UNPAID = (from, to, status = "approved") => ({ userId: ROHAN, type: "unpaid", from, to, duration: "full", status });
seeded();
rawAdd("leave-requests", UNPAID("2026-11-10", "2026-11-12"));
leaves(2026, 11, 2, "2026-11-02"); back(2026, 11, 16);
setNow(2026, 12, 9);
const u1 = row(PS, ROHAN, 2026, 11);
check("U1", "approved unpaid leave 10-12 Nov (days away): not counted; the loss of pay is the 9 days away, not 12 (the code before took off the 3 days and paid the rest)",
  PS.unpaidLeaveDays(ROHAN, 2026, 11) === 0 && u1?.lop.days === 9 && u1.gross === 52571 && OLD.unpaidLeaveDays(ROHAN, 2026, 11) === 3, j(pick(u1)));
seeded();
rawAdd("leave-requests", UNPAID("2026-11-12", "2026-11-17"));
leaves(2026, 11, 2, "2026-11-02"); back(2026, 11, 16);
setNow(2026, 12, 9);
const u2 = row(PS, ROHAN, 2026, 11);
check("U2", "approved unpaid leave 12-17 Nov: only 16-17 Nov count (after he came back): 9 days away + 2 unpaid", PS.unpaidLeaveDays(ROHAN, 2026, 11) === 2 && u2?.lop.days === 11 && u2.gross === grossFor(11), j(pick(u2)));
seeded();
rawAdd("leave-requests", { ...UNPAID("2026-11-10", "2026-11-12", "pending"), type: "casual" });
rawAdd("regularizations", { userId: ROHAN, date: "2026-11-11", status: "pending" });
leaves(2026, 11, 2, "2026-11-02"); back(2026, 11, 16);
setNow(2026, 12, 9);
check("U3", "a pending leave request (10-12 Nov) and attendance correction (11 Nov) covering only days away don't hold up November (12B's rule); both stay pending",
  j(PS.runProblems(2026, 11)) === "[]" && j(OLD.runProblems(2026, 11)) !== "[]", j([PS.runProblems(2026, 11), OLD.runProblems(2026, 11)]));
seeded();
rawAdd("leave-requests", { ...UNPAID("2026-11-12", "2026-11-17", "pending"), type: "casual" });
rawAdd("regularizations", { userId: ROHAN, date: "2026-11-16", status: "pending" });
leaves(2026, 11, 2, "2026-11-02"); back(2026, 11, 16);
setNow(2026, 12, 9);
const u4 = PS.runProblems(2026, 11);
check("U4", "ones reaching a day after he came back (12-17 Nov; 16 Nov) still hold it up",
  j(u4) === j(["1 leave request is waiting for a decision (Rohan Gupta)", "1 attendance correction is waiting for a decision (Rohan Gupta)"]), j(u4));

// =================================================================
section("P. Approved months");
seeded();
setNow(2026, 11, 9); approve(2026, 10);
leaves(2026, 11, 9, "2026-11-06"); back(2026, 11, 16);
approvedMatch("after 16 Nov");
setNow(2026, 12, 9); approve(2026, 11);
approvedMatch("Nov approved");
const p1 = PS.storedRun(2026, 11).rows.find((r) => r.userId === ROHAN);
leaves(2026, 12, 14, "2026-12-11"); back(2026, 12, 18);
approvedMatch("away 12-17 Dec");
check("P1", "October approved, then Rohan away 7-13 Nov (back 16 Nov): October's rows still equal the live figures; November approved with 5 working days away (9-13 Nov; 6 Nov his last day)",
  p1?.lop.leftDays === 5 && p1.gross === grossFor(5) && pBad.length === 0, j([p1?.lop, pBad.slice(0, 3)]));
check("P2", "away again in December (12-17 Dec): two periods; approved October and November still equal the live figures", history(ROHAN)?.length === 2 && pBad.length === 0, j(pBad.slice(0, 3)));
seeded();
leaves(2026, 10, 30, "2026-10-16");
setNow(2026, 11, 9); approve(2026, 10);
const p3at = mem.get("officeos:users");
const p3 = errOf(S.reactivateUser(AARAV, ROHAN));
check("P3", "a reactivation 12F refuses (left 16 Oct, October approved paying him up to it) records nothing: storage unchanged, no history",
  p3 !== "ok" && mem.get("officeos:users") === p3at && history(ROHAN) === null, p3);

// =================================================================
section("N. Nothing changes for anyone else");
seeded();
leaves(2026, 11, 2, "2026-11-02"); back(2026, 11, 16);
setNow(2026, 12, 9);
const nBad = [];
for (const u of S.getAllUsers().filter((x) => x.id !== ROHAN)) {
  for (const [y, m] of [[2026, 10], [2026, 11], [2026, 12]]) {
    if (j(A.monthFor(u.id, y, m)) !== j(OLDA.monthFor(u.id, y, m))) nBad.push(`${u.id} ${m} attendance`);
    if (j(row(PS, u.id, y, m)) !== j(row(OLD, u.id, y, m))) nBad.push(`${u.id} ${m} row`);
  }
  if (j(PS.payslipsFor(u.id, "2026-12-09")) !== j(OLD.payslipsFor(u.id, "2026-12-09"))) nBad.push(`${u.id} payslips`);
}
check("N1", "everyone who never left (Arjun among them): October to December, attendance, rows and payslips the same as the code before reads them", nBad.length === 0 && S.getUser(ARJUN).leavingPeriods === undefined, j(nBad.slice(0, 4)));
seeded();
leaves(2026, 11, 9, "2026-11-06");
setNow(2026, 12, 9);
const n2 = [row(PS, ROHAN, 2026, 11), row(OLD, ROHAN, 2026, 11)];
check("N2", "a current leaver (left 6 Nov, still away on 9 Dec): November's row (11Y's loss of pay, the last working day), his payslips and the run's problems as before",
  j(n2[0]) === j(n2[1]) && n2[0]?.lop.leftDays === 16 && j(PS.payslipsFor(ROHAN, "2026-12-09")) === j(OLD.payslipsFor(ROHAN, "2026-12-09")) && j(PS.runProblems(2026, 11)) === j(OLD.runProblems(2026, 11)), j(pick(n2[0])));
seeded();
rawEdit("users", (u) => u.id === ARJUN, (u) => { u.leavingPeriods = [{ dateOfLeaving: "soon", reactivatedOn: "16 Nov 2026" }, { dateOfLeaving: "2 Nov 2026" }]; });
setNow(2026, 12, 9);
check("N3", "a stored period that can't be read is skipped: Arjun's November as before", j(leftIn(A, ARJUN, 2026, 11)) === "[]" && j(row(PS, ARJUN, 2026, 11)) === j(row(OLD, ARJUN, 2026, 11)));

// =================================================================
section("W. Only a reactivation writes the history");
seeded();
leaves(2026, 11, 2, "2026-11-02"); back(2026, 11, 16);
const w1 = errOf(S.updateUser(AARAV, ROHAN, { leavingPeriods: [], phone: "+91 90000 00042" }));
check("W1", "an edit sending leavingPeriods: [] saves the rest and leaves the history as it was", w1 === "ok" && S.getUser(ROHAN).phone === "+91 90000 00042" && history(ROHAN)?.length === 1, j([w1, history(ROHAN)]));
const w2 = S.addUser(AARAV, { name: "Test Person", email: "test.person@example.com", department: S.getUser(ARJUN).department, leavingPeriods: [{ dateOfLeaving: "2 Nov 2026", reactivatedOn: "16 Nov 2026" }] });
const w2user = w2?.ok ? S.getUser(w2.record.id) : null;
check("W2", "a new employee's record never starts with one", Boolean(w2user) && !("leavingPeriods" in w2user), j(w2user ? Object.keys(w2user) : w2));
setSession("admin", "Aarav Mehta", AARAV); await open("users/user-form", `?id=${ROHAN}`);
d.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
check("W3", "saving him from the edit form keeps it", j(history(ROHAN)) === j([{ dateOfLeaving: "2 Nov 2026", reactivatedOn: "16 Nov 2026" }]), j(history(ROHAN)));
await open("users/user-profile", `?id=${ROHAN}`);
const rowsShown = [...d.querySelectorAll(".kv__row dt")].map(txt);
check("W4", "his profile: no \"Last working day\" row (he's not a leaver), and the Deactivate button", !rowsShown.includes("Last working day") && [...d.querySelectorAll(".page-header__actions button")].some((b) => txt(b) === "Deactivate"), j(rowsShown));
seeded();
setNow(2026, 11, 9);
rawEdit("users", (u) => u.id === ROHAN, (u) => { u.status = "inactive"; });
const w5 = errOf(S.reactivateUser(AARAV, ROHAN));
check("W5", "someone inactive from before 11Y (no last working day on file) reactivated: nothing to keep", w5 === "ok" && history(ROHAN) === null, w5);

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12I"), jsPre = walk("./js-pre12H");   // Round 12I (layout; was the live js): 12H's own change set (js-pre12I = 9ce0d86)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12I", p) !== srcAt("./js-pre12H", p));
const THREE = ["data/attendance-store.js", "data/payroll-store.js", "data/store.js"];
check("X1", "exactly these 3 js files changed, none added or removed (payroll.js's pay math and every page untouched)", j(changedJs) === j(THREE) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12H").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12H", p))
  && walk("./css-pre12H").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12H", p)));
const imports = (s) => (s.match(/^import .*$/gm) ?? []).map((l) => l.replace(", awayOn }", " }"));
check("X3", "CRLF with no final newline; the only import change is awayOn, in attendance-store and payroll-store",
  // Round 12V (layout; was the live js): 12H's own change set, as X1 reads it since 12I (js-pre12I = 9ce0d86)
  THREE.every((p) => { const s = srcAt("./js-pre12I", p); return !s.endsWith("\n") && !/(^|[^\r])\n/.test(s); })
  && THREE.every((p) => j(imports(srcAt("./js-pre12I", p))) === j(srcAt("./js-pre12H", p).match(/^import .*$/gm) ?? []))
  && THREE.slice(0, 2).every((p) => /awayOn \} from "\.\/store\.js"/.test(srcAt("./js-pre12I", p))));
const fn = (s, name) => s.slice(s.indexOf(`function ${name}(`), s.indexOf("\n}", s.indexOf(`function ${name}(`)));
const sNow = srcAt("./js-pre12I", "data/store.js"), sPre = srcAt("./js-pre12H", "data/store.js");   // Round 12M (layout; was the live js): 12H's result (js-pre12I = 9ce0d86)
check("X4", "the leaving, joining and reactivation checks unchanged (leavingProblem, joiningProblem, reactivationProblem)",
  ["leavingProblem", "joiningProblem", "reactivationProblem"].every((f) => fn(sNow, f) === fn(sPre, f) && fn(sNow, f).length > 50));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
