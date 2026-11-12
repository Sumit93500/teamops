// usage: node payruns.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 11T: 11M's roadmap item 7, R8 part (i): stored payroll runs and approval on record, as scoped in
// round-11s-notes.md S9 with S-D1-S-D12 decided. ./js-pre11T, ./html-pre11T and ./css-pre11T are the code, pages and
// css before this round (office-os 75fa644).
//   A  the payroll-runs collection: nothing stored until Prepare (reading never adds the key); one run per month; the
//      snapshot's shape (payrollRunFor()'s rows + name and department, totals, history)
//   B  Prepare on the record: refused for HR, Employee, someone inactive, an unknown id, an old session (no id), a
//      demoted record; an Admin who'd be the only approver (S4 route 1)
//   C  Approve on the record: canApprove(run, id) resolves the record; refused for HR, Finance, Employee, someone
//      inactive, an unknown id, an old session, the preparer; not prepared; already approved
//   D  the gate (S-D3), each reason alone, for Prepare and for Approve; what doesn't stop it (work from home, a joiner,
//      on-hold rows: S-D5)
//   E  Prepare again; Approve refused after a live change, until it's prepared again
//   F  an approved run is immutable (S-D6); Reset demo data clears runs (S-D11)
//   G  S4's three routes to a run nobody can approve, each refused (store.js, S-D7), and their recoveries
//   H  snapshots survive the person being deactivated or deleted (S-D10)
//   I  payslips read the approved snapshot (S-D1): payslips.html, payslip-view.html
//   J  the live preview: payrollRun() / payrollRunFor() byte-identical to before this round (S-D9)
//   K  payroll-run.html: Draft / Prepared / Approved, Prepare / Approve through the page, the alert and run details
//   X  scope
// The clock is local wall time, set per section. The October fixture: storage seeded Fri 30 Oct 2026 19:00
// (attendance back to 1 Oct), opened Mon 9 Nov 2026 11:00, with October settled: the seeded pending leave (not work
// from home) cancelled, the seeded pending corrections rejected, Vikram given a joining date.
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
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029", ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const SESS = { admin: ["admin", "Aarav Mehta", AARAV], hr: ["hr", "Priya Nair", PRIYA], fin: ["fin", "Kabir Shah", KABIR], emp: ["emp", "Arjun Kapoor", ARJUN] };
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null, navigations = [];
const allJsErrors = [];
async function open(page, query = "") {
  const vc = new VirtualConsole();
  navigations = []; timers = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message.slice(0, 60)); else allJsErrors.push(`${page}: ${e.message}`); });
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
const safe = (fn) => { try { return fn(); } catch (e) { return `threw: ${e.message}`; } };   // a tree without the new API fails, not crashes

const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const H = await import("./js/data/holidays.js");
const OLD = await import("./js-pre11T/data/payroll-store.js");   // the live computation as it was, on the same storage
const has = (name) => typeof PS[name] === "function";
const storedRun = (y, m) => (has("storedRun") ? PS.storedRun(y, m) : null);
const prepare = (id, y = 2026, m = 10) => safe(() => PS.prepareRun(id, y, m));
const approve = (id, y = 2026, m = 10) => safe(() => PS.approveRun(id, y, m));
const errOf = (r) => (typeof r === "string" ? r : r?.ok ? "ok" : r?.error ?? "no result");
const runsBox = () => JSON.parse(mem.get("officeos:payroll-runs") ?? "null");

// ---- fixtures ----
function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
// October settled (see the header). keep: a seeded pending leave / correction id left pending.
function october({ settle = true, keep = [] } = {}) {
  mem.clear();
  setNow(2026, 10, 30, 19);
  PS.payrollRun(2026, 10);   // seeds everything around 30 Oct
  setNow(2026, 11, 9);
  if (!settle) return;
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh" && !keep.includes(r.id), (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending" && !keep.includes(r.id), (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
}
const rawRemove = (key, match) => { const box = JSON.parse(mem.get(`officeos:${key}`)); box.records = box.records.filter((r) => !match(r)); mem.set(`officeos:${key}`, JSON.stringify(box)); };
const repend = (key, id) => rawEdit(key, (r) => r.id === id, (r) => { r.status = "pending"; });   // a request the fixture settled, waiting again
const promote = (id, by = AARAV) => S.updateUser(by, id, { role: "admin" });
const LABEL = "October 2026";
const CANT_PREPARE = "You can't prepare payroll runs.";
const CANT_APPROVE = "You can't approve payroll runs.";
const PREPARER = "You prepared this run, so someone else has to approve it.";
const CHANGED = "The figures have changed since this run was prepared: prepare it again.";
const gate = (verb, ...why) => `${LABEL} can't be ${verb} yet: ${why.join("; ")}.`;
const lastApprover = (who, preparer) => `${who} is the only Admin who can approve October 2026's payroll run (${preparer} prepared it): make someone else an Admin first.`;
const NOBODY_ELSE = "No one else could approve October 2026's run: make someone else an Admin first.";
// A run's rows without the name and department a stored row keeps.
const figures = (rows) => j(rows.map(({ name: _n, department: _d, ...r }) => r));

// =================================================================
section("A. The payroll-runs collection");
october();
for (const id of [ARJUN, ROHAN]) PS.payslipsFor(id, "2026-11-09");
safe(() => PS.runProblems(2026, 10)); safe(() => PS.prepareProblem(KABIR, 2026, 10)); storedRun(2026, 10);
setSession(...SESS.fin); await open("payroll/payroll-run", "?month=2026-10");
setSession(...SESS.emp); await open("payroll/payslips");
check("A1", "nothing is stored until someone prepares: the run page, payslips, storedRun(), runProblems() and prepareProblem() read without adding officeos:payroll-runs; storedRun(2026, 10) is null",
  !mem.has("officeos:payroll-runs") && has("storedRun") && PS.storedRun(2026, 10) === null, j([...mem.keys()].filter((k) => /run/.test(k))));
const live = PS.payrollRun(2026, 10);
const r1 = prepare(KABIR);
const run = storedRun(2026, 10);
const users = Object.fromEntries(S.getAllUsers().map((u) => [u.id, u]));
check("A2", "Kabir (Finance) prepares October: stored as PR-1, prepared by him at 9 Nov 11:00 (local), not approved; one record in the box",
  r1.ok && run?.id === "PR-1" && run.month === "2026-10" && run.status === "prepared" && run.preparedBy === KABIR && run.preparedAt === "2026-11-09T11:00"
  && run.approvedBy === null && run.approvedAt === null && runsBox()?.version === 1 && runsBox().records.length === 1, j([errOf(r1), run && { ...run, rows: run.rows.length }]));
check("A3", "S-D2 / S-D10: the snapshot is payrollRun()'s rows at that moment, each with the person's name and department added; totals = runTotals of them; history one 'prepared' entry",
  run && figures(run.rows) === j(live.rows) && run.rows.every((r) => r.name === users[r.userId].name && r.department === users[r.userId].department)
  && j(run.totals) === j(PS.runTotals(live)) && j(run.history) === j([{ byUserId: KABIR, decision: "prepared", at: "2026-11-09T11:00", note: "" }]),
  j(run && { totals: run.totals, history: run.history, row0: Object.keys(run.rows[0]) }));
check("A4", "October's figures as fixed: 9 rows, gross ₹9,60,700, deductions ₹85,886, net ₹8,74,814, loss of pay ₹4,800",
  run?.rows.length === 9 && j(run.totals) === j({ gross: 960700, deductions: 85886, net: 874814, lossOfPay: 4800 }), j(run?.totals));
setNow(2026, 11, 10, 9, 30);
const r2 = prepare(KABIR);
check("A5", "one run per month: preparing October again updates PR-1 (still one record), with the new time and a second history entry",
  r2.ok && runsBox().records.length === 1 && storedRun(2026, 10)?.id === "PR-1" && storedRun(2026, 10)?.preparedAt === "2026-11-10T09:30"
  && j(storedRun(2026, 10)?.history.map((h) => [h.decision, h.at])) === j([["prepared", "2026-11-09T11:00"], ["prepared", "2026-11-10T09:30"]]), j([errOf(r2), runsBox()?.records.length]));
const r3 = approve(AARAV);
check("A6", "Aarav approves: same record, status approved, approvedBy / approvedAt set, an 'approved' history entry; rows and totals untouched",
  r3.ok && runsBox().records.length === 1 && storedRun(2026, 10)?.status === "approved" && storedRun(2026, 10)?.approvedBy === AARAV && storedRun(2026, 10)?.approvedAt === "2026-11-10T09:30"
  && storedRun(2026, 10)?.history.at(-1).decision === "approved" && j(storedRun(2026, 10)?.rows) === j(r2.record.rows), errOf(r3));
const box = runsBox(); if (box) { box.version = 0; mem.set("officeos:payroll-runs", j(box)); }
check("A7", "a stored copy that isn't intact (an old version) counts as none: storedRun is null, payslips are live again", box !== null && storedRun(2026, 10) === null && !PS.payslipsFor(ARJUN, "2026-11-10").some((s) => s.runStatus), j(storedRun(2026, 10)));

// =================================================================
section("B. Prepare: who, on the record");
october();
const b1 = [PRIYA, ARJUN, "EMP-9999", null, undefined, ""].map((id) => errOf(prepare(id)));
check("B1", "refused, nothing stored: Priya (HR), Arjun (Employee), an unknown id, an old session with no id (null / undefined / '')",
  b1.every((e) => e === CANT_PREPARE) && !mem.has("officeos:payroll-runs"), j(b1));
S.updateUser(AARAV, MEERA, { role: "fin" }); S.deactivateUser(AARAV, MEERA, LEAVING_11Y());
S.updateUser(AARAV, KABIR, { role: "emp" });
const b2 = [errOf(prepare(MEERA)), errOf(prepare(KABIR))];
check("B2", "the record decides, not the session: Meera made Finance then deactivated, and Kabir (a Finance session) demoted to Employee on record, are both refused", j(b2) === j([CANT_PREPARE, CANT_PREPARE]), j(b2));
S.updateUser(AARAV, KABIR, { role: "fin" });
const b3 = errOf(prepare(AARAV));
check("B3", "S4 route 1: Aarav, the only active Admin, can't prepare: no one else could approve it", b3 === NOBODY_ELSE && !mem.has("officeos:payroll-runs"), b3);
const b4 = [safe(() => PS.prepareProblem(KABIR, 2026, 13)), safe(() => PS.prepareProblem(KABIR, "x", 1))];
check("B4", "a month that isn't one is refused", j(b4) === j(["That isn't a month.", "That isn't a month."]), j(b4));
S.updateUser(AARAV, MEERA, { status: "active" });
const b5 = errOf(prepare(MEERA));
check("B5", "Meera, Finance on record and active again, can prepare (payroll:create held on record)", b5 === "ok" && storedRun(2026, 10)?.preparedBy === MEERA, b5);

// =================================================================
section("C. Approve: canApprove() and approveRun() on the record");
october();
prepare(KABIR);
const prep = storedRun(2026, 10);
S.updateUser(AARAV, SNEHA, { role: "admin" }); S.deactivateUser(AARAV, SNEHA, LEAVING_11Y());
const c1 = [AARAV, KABIR, PRIYA, ARJUN, SNEHA, "EMP-9999", null, undefined].map((id) => safe(() => PS.canApprove(prep, id)));
check("C1", "canApprove(run, id) looks the record up: Aarav yes; Kabir (preparer, Finance), Priya (HR), Arjun, Sneha (an inactive Admin), an unknown id, none: no",
  j(c1) === j([true, false, false, false, false, false, false, false]), j(c1));
const c2 = [safe(() => PS.canApprove({ preparedBy: AARAV }, AARAV)), safe(() => PS.canApprove({ preparedBy: null }, AARAV)), safe(() => PS.canApprove({ preparedBy: KABIR }, "EMP-1001"))];
check("C2", "the signature is still (run, userId): an Admin who prepared it can't; a run with no preparer (the live preview) can be by an Admin", j(c2) === j([false, true, true]), j(c2));
const c3 = [PRIYA, KABIR, ARJUN, SNEHA, "EMP-9999", null].map((id) => errOf(approve(id)));
check("C3", "approveRun refused, run still prepared: HR, Finance (the preparer, no payroll:approve), Employee, the inactive Admin, unknown, an old session",
  c3.every((e) => e === CANT_APPROVE) && storedRun(2026, 10)?.status === "prepared", j(c3));
S.updateUser(AARAV, SNEHA, { status: "active" });
S.updateUser(AARAV, KABIR, { role: "admin" });
const c4 = errOf(approve(KABIR));
check("C4", "Kabir made an Admin can't approve the run he prepared", c4 === PREPARER && storedRun(2026, 10)?.status === "prepared", c4);
const c5 = [errOf(approve(SNEHA, 2026, 9)), errOf(approve(SNEHA, 2026, 13))];
check("C5", "a month nobody prepared / that isn't one", j(c5) === j(["September 2026's run hasn't been prepared yet.", "That isn't a month."]), j(c5));
const c6 = [errOf(approve(SNEHA)), errOf(approve(AARAV))];
check("C6", "Sneha (an active Admin again) approves; then Aarav is refused: already approved", j(c6) === j(["ok", "October 2026's run is already approved."]) && storedRun(2026, 10)?.approvedBy === SNEHA, j(c6));

// =================================================================
section("D. The gate: ended and settled (S-D3), each reason alone");
// Prepare refused with the problem in place; and Approve refused when it appears after a clean Prepare.
const both = async (n, label, introduce, why) => {
  october();
  introduce();
  const p = errOf(prepare(KABIR));
  october();
  const ready = errOf(prepare(KABIR));
  introduce();
  const a = ready === "ok" ? errOf(approve(AARAV)) : `prepare: ${ready}`;
  check(n, label, p === gate("prepared", why) && a === gate("approved", why) && storedRun(2026, 10)?.status === "prepared", j([p, a]));
};
october();
check("D0", "the settled October fixture has nothing in the way: runProblems is []", j(safe(() => PS.runProblems(2026, 10))) === "[]", j(safe(() => PS.runProblems(2026, 10))));
await both("D1", "not ended: on Sat 31 Oct, October hasn't ended (nothing else is open)", () => setNow(2026, 10, 31), "it hasn't ended yet");
await both("D2", "a pending leave request alone (Arjun's 5 Oct casual leave, LV-2201)", () => repend("leave-requests", "LV-2201"), "1 leave request is waiting for a decision (Arjun Kapoor)");
await both("D3", "a pending late-arrival correction alone (Vikram's 27 Oct, RG-102: G4's case, so its late-mark penalty is never frozen)", () => repend("regularizations", "RG-102"), "1 attendance correction is waiting for a decision (Vikram Singh)");
await both("D4", "an uncounted absence alone: Vikram without a readable joining date",
  () => S.updateUser(AARAV, VIKRAM, { dateOfJoining: "" }), "1 absence can't be counted, with no readable joining date on file (Vikram Singh)");
// Round 11V (behaviour; was 'an open absence alone': an absence open after the month has ended is inside its window, so U-D1's window reason now comes with it)
await both("D5", "an absence still open, with the request window (round 11V): Vikram with no record on Thu 29 Oct, opened Wed 4 Nov (correctable until 5 Nov; a day from the seed date on is filled in again when read)",
  () => { rawRemove("attendance", (r) => r.userId === VIKRAM && r.date === "2026-10-29"); setNow(2026, 11, 4); }, "its request window is still open until 7 Nov; 1 absence isn't settled yet (Vikram Singh)");
await both("D6", "days from before attendance records began alone: records before 12 Oct removed",
  () => rawRemove("attendance", (r) => r.date < "2026-10-12"), "6 working days came before attendance records began");
october();
setNow(2026, 11, 2);
const d7 = safe(() => PS.runProblems(2026, 11));
check("D7", "this month (2 Nov, November): not ended and days not recorded yet, both named", j(d7) === j(["it hasn't ended yet", "21 working days haven't been recorded yet"]), j(d7));
october();
["LV-2201", "LV-2189"].forEach((id) => repend("leave-requests", id)); ["RG-102", "RG-103"].forEach((id) => repend("regularizations", id));
S.updateUser(AARAV, VIKRAM, { dateOfJoining: "" });
const d8 = errOf(prepare(KABIR));
check("D8", "several at once: every one named, in order, people sorted by name",
  d8 === gate("prepared", "1 absence can't be counted, with no readable joining date on file (Vikram Singh)", "2 leave requests are waiting for a decision (Arjun Kapoor, Rohan Gupta)", "2 attendance corrections are waiting for a decision (Sneha Rao, Vikram Singh)"), d8);
october();
const wfh = JSON.parse(mem.get("officeos:leave-requests")).records.filter((r) => r.status === "pending" && r.type === "wfh" && r.from.startsWith("2026-10"));
check("D9", "a pending work-from-home request doesn't stop it (Priya's 7 Oct, LV-2211, still pending)", wfh.map((r) => r.id).includes("LV-2211") && errOf(prepare(KABIR)) === "ok", j(wfh.map((r) => r.id)));
october();
S.updateUser(AARAV, ROHAN, { bankAccount: null, bankAccountLast4: null });
const hire = S.addUser(AARAV, { name: "Zoya Khan", email: "zoya.khan@northwind.com", role: "emp", department: "SUP", designation: "Support Executive", status: "active", dateOfJoining: "2026-10-19" });
const d10 = [errOf(prepare(KABIR)), errOf(approve(AARAV))];
const held = storedRun(2026, 10)?.rows.filter((r) => r.status === "on-hold").map((r) => [r.name, r.holdReason, r.net > 0]);
const zoya = storedRun(2026, 10)?.rows.find((r) => r.userId === hire.record?.id);
check("D10", "S-D5: on-hold rows don't stop it, and are kept as held: Rohan (no bank account, pay worked out) and a joiner (Zoya, joined 19 Oct, no salary); joining mid-month doesn't stop it either",
  j(d10) === j(["ok", "ok"]) && j(held) === j([["Rohan Gupta", "No bank account on file", true], ["Zoya Khan", "No salary on file for this month", false]]) && zoya?.attendance.beforeJoining > 0, j([d10, held, zoya?.attendance]));

october();
rawEdit("leave-requests", (r) => r.id === "LV-2201", (r) => { r.status = "pending"; r.from = "2026-11-12"; r.to = "2026-11-12"; });
rawEdit("regularizations", (r) => r.id === "RG-102", (r) => { r.status = "pending"; r.date = "2026-11-03"; });
const d11 = [safe(() => PS.runProblems(2026, 10)), safe(() => PS.runProblems(2026, 11))];
check("D11", "only what's dated in the month counts: Arjun's leave pending for 12 Nov and Vikram's correction pending for 3 Nov don't stop October, and are named for November",
  j(d11[0]) === "[]" && Array.isArray(d11[1]) && d11[1].includes("1 leave request is waiting for a decision (Arjun Kapoor)") && d11[1].includes("1 attendance correction is waiting for a decision (Vikram Singh)"), j(d11));

// =================================================================
section("E. Prepare again; Approve after a live change");
october();
prepare(KABIR);
const before = storedRun(2026, 10);
H.addHoliday(AARAV, { date: "2026-10-21", name: "Company day", kind: "company" });
const e1 = errOf(approve(AARAV));
check("E1", "a holiday added on 21 Oct after Kabir prepared moves the live figures: Approve is refused, the stored figures are as prepared",
  e1 === CHANGED && figures(PS.payrollRun(2026, 10).rows) !== figures(before.rows) && j(storedRun(2026, 10)) === j(before), e1);
S.updateUser(AARAV, MEERA, { role: "fin" });
setNow(2026, 11, 9, 15);
const e2 = errOf(prepare(MEERA));
const again = storedRun(2026, 10);
check("E2", "Meera (Finance) prepares it again: the same record, the new figures, preparedBy now Meera; the history keeps both",
  e2 === "ok" && again.id === before.id && again.preparedBy === MEERA && figures(again.rows) === figures(PS.payrollRun(2026, 10).rows) && figures(again.rows) !== figures(before.rows)
  && j(again.history.map((h) => [h.byUserId, h.decision])) === j([[KABIR, "prepared"], [MEERA, "prepared"]]), e2);
check("E3", "...and now Aarav can approve it", errOf(approve(AARAV)) === "ok" && storedRun(2026, 10)?.status === "approved");
october();
prepare(KABIR);
S.updateUser(AARAV, ROHAN, { bankAccount: null });
const e4 = errOf(approve(AARAV));
S.updateUser(AARAV, ROHAN, { bankAccount: "902457137305" });
check("E4", "a change that only moves a row's status (Rohan's bank account removed: on hold) is a change too; put back, Approve goes through", e4 === CHANGED && errOf(approve(AARAV)) === "ok", e4);
october();
prepare(KABIR);
S.updateUser(AARAV, ROHAN, { name: "Rohan G. Gupta", department: "SAL" });
check("E5", "a rename or department move after Prepare doesn't move the figures, so Approve goes through; the snapshot keeps the name and department as prepared",
  errOf(approve(AARAV)) === "ok" && j(storedRun(2026, 10)?.rows.find((r) => r.userId === ROHAN) && [storedRun(2026, 10)?.rows.find((r) => r.userId === ROHAN).name, storedRun(2026, 10)?.rows.find((r) => r.userId === ROHAN).department]) === j(["Rohan Gupta", "ENG"]));

// =================================================================
section("F. An approved run is immutable (S-D6)");
october();
prepare(KABIR); approve(AARAV);
const fixed = mem.get("officeos:payroll-runs");
S.updateUser(AARAV, MEERA, { role: "fin" }); promote(SNEHA);
const f1 = [errOf(prepare(KABIR)), errOf(prepare(MEERA)), errOf(prepare(SNEHA)), errOf(approve(SNEHA)), errOf(approve(AARAV))];
check("F1", "after approval, Prepare is refused for every preparer and Approve for every approver; the stored run is byte-identical",
  j(f1) === j([...Array(3).fill("October 2026's run is approved, so it can't be prepared again."), ...Array(2).fill("October 2026's run is already approved.")]) && mem.get("officeos:payroll-runs") === fixed, j(f1));
// Round 11V (behaviour; was 'a later holiday … moves the live figures': U-D3 refuses a holiday for an approved month, so the refusal is checked and the bank account carries the live change)
const f2h = (({ ok, error }) => (ok ? "ok" : error))(H.addHoliday(AARAV, { date: "2026-10-21", name: "Company day", kind: "company" }));
S.updateUser(AARAV, ROHAN, { bankAccount: null });
check("F2", "a holiday for approved October is refused (round 11V); a removed bank account moves October's live figures but not the approved run", f2h === "October 2026's payroll is approved, so a holiday can't be added to it." && fixed !== undefined && mem.get("officeos:payroll-runs") === fixed && figures(PS.payrollRun(2026, 10).rows) !== figures(JSON.parse(fixed).records[0].rows), f2h);
const f3 = ["approveRun", "prepareRun"].every(has) && !["unapproveRun", "deleteRun", "updateRun", "reopenRun", "discardRun"].some((n) => n in PS);
check("F3", "the store has no un-approve, edit, reopen or discard: prepareRun and approveRun are the only run writes", f3, Object.keys(PS).filter((k) => /run/i.test(k)).join(","));
const hadRuns = mem.has("officeos:payroll-runs");
PS.resetPayrollData();
check("F4", "S-D11: resetPayrollData() clears the runs too (and salaries, as before)", hadRuns && !mem.has("officeos:payroll-runs") && !mem.has("officeos:salaries") && storedRun(2026, 10) === null);

// =================================================================
section("G. S4: a prepared run's last other approver (store.js, S-D7)");
october();
promote(KABIR);
const g1 = errOf(prepare(AARAV));
check("G1", "route 1's recovery: once Kabir is an Admin too, Aarav can prepare (Kabir could approve)", g1 === "ok" && storedRun(2026, 10)?.preparedBy === AARAV, g1);
october();
prepare(KABIR);
promote(KABIR);
const g2 = errOf(S.updateUser(KABIR, AARAV, { role: "emp" }));
check("G2", "route 2 (10C C3): Kabir prepares as Finance, is made an Admin, then demotes Aarav: refused, Aarav is October's only possible approver; 9Y alone would allow it (Kabir is an active Admin)",
  g2 === lastApprover("Aarav Mehta", "Kabir Shah") && S.getUser(AARAV).role === "admin", g2);
promote(SNEHA);
const g3 = errOf(S.updateUser(KABIR, AARAV, { role: "emp" }));
check("G3", "recovery: make someone else an Admin (Sneha), and Aarav's demotion goes through", g3 === "ok" && S.getUser(AARAV).role === "emp", g3);
october();
prepare(KABIR); promote(KABIR);
const g4 = [errOf(prepare(AARAV)), errOf(S.updateUser(KABIR, AARAV, { role: "emp" }))];
check("G4", "recovery: Aarav prepares it again (Kabir is now the one who can approve it), then his demotion goes through", j(g4) === j(["ok", "ok"]), j(g4));
october();
prepare(KABIR); promote(KABIR);
const g5 = [errOf(approve(AARAV)), errOf(S.updateUser(KABIR, AARAV, { role: "emp" }))];
check("G5", "recovery: approve it; an approved run needs no approver, so the demotion goes through", j(g5) === j(["ok", "ok"]), j(g5));
october();
promote(SNEHA);
S.updateUser(SNEHA, AARAV, { role: "emp" });
promote(ROHAN, SNEHA);
const g6 = errOf(prepare(ROHAN));
const g7 = [S.deactivateUser(ROHAN, SNEHA, LEAVING_11Y()), S.updateUser(ROHAN, SNEHA, { status: "inactive", dateOfLeaving: LEAVING_11Y() }), S.updateUser(ROHAN, SNEHA, { role: "emp" }), S.deleteUser(ROHAN, SNEHA)].map(errOf);
check("G6", "route 3: Rohan prepares while he and Sneha are the active Admins (Aarav demoted earlier); deactivating Sneha (both ways in), demoting or deleting her is refused, each with the message",
  g6 === "ok" && g7.every((e) => e === lastApprover("Sneha Rao", "Rohan Gupta")) && S.getUser(SNEHA)?.role === "admin" && S.getUser(SNEHA).status === "active", j([g6, g7]));
promote(AARAV, ROHAN);
const g8 = [S.updateUser(ROHAN, SNEHA, { status: "inactive", dateOfLeaving: LEAVING_11Y() }), S.deleteUser(ROHAN, SNEHA)].map(errOf);
check("G7", "recovery: Aarav an Admin again, and Sneha can be deactivated and deleted", j(g8) === j(["ok", "ok"]) && S.getUser(SNEHA) === null, j(g8));
october();
promote(SNEHA); promote(ROHAN);
prepare(ROHAN);
const g9 = [S.updateUser(AARAV, ROHAN, { status: "inactive", dateOfLeaving: LEAVING_11Y() }), S.updateUser(AARAV, SNEHA, { phone: "+91 98450 00000" }), S.updateUser(AARAV, SNEHA, { role: "emp" })].map(errOf);
check("G8", "not refused: the preparer himself deactivated (he isn't needed), an unrelated edit, and demoting Sneha while Aarav can still approve",
  j(g9) === j(["ok", "ok", "ok"]), j(g9));
october();
prepare(KABIR); promote(KABIR);
rawEdit("users", (u) => u.id === AARAV, (u) => { u.role = "emp"; });   // straight in storage: nobody can approve October now
const g10 = [S.updateUser(KABIR, SNEHA, { phone: "+91 98450 00000" }), S.updateUser(KABIR, KABIR, { role: "admin" })].map(errOf);
check("G9", "a run already stuck (data written straight to storage) doesn't block unrelated writes: only a change that takes the last approver away is refused", j(g10) === j(["ok", "ok"]), j(g10));

// =================================================================
section("H. Snapshots survive deactivation and deletion (S-D10)");
october();
prepare(KABIR); approve(AARAV);
const runBefore = mem.get("officeos:payroll-runs");
const h1 = [errOf(S.deactivateUser(AARAV, ROHAN, LEAVING_11Y()))];
const rohanRow = () => storedRun(2026, 10)?.rows.find((r) => r.userId === ROHAN);
// Round 11Y (behaviour; was "the live run no longer has him": his last working day, today 9 Nov, is after October, so
// October's live run still pays him in full; it can't be before 31 Oct, which approved October pays)
check("H1", "Rohan deactivated after October was approved: the stored run still has his row, name and department, byte for byte; the live October run still has him (round 11Y: his last working day is after it)",
  h1[0] === "ok" && mem.get("officeos:payroll-runs") === runBefore && rohanRow()?.name === "Rohan Gupta" && rohanRow().department === "ENG" && PS.payrollRun(2026, 10).rows.some((r) => r.userId === ROHAN), j(h1));
h1.push(errOf(S.deleteUser(AARAV, ROHAN)));
// Round 11Y (behaviour; was "deleted": nobody an approved run pays can be deleted, round-11x-notes.md X-D3 (c))
check("H2", "...and deleting him is refused (approved October pays him; round 11Y): the snapshot unchanged",
  h1[1] === "Rohan Gupta is paid in an approved payroll run (October 2026), so they can't be deleted. Deactivate them instead." && S.getUser(ROHAN) !== null && mem.get("officeos:payroll-runs") === runBefore && rohanRow()?.name === "Rohan Gupta", j(h1));
setSession(...SESS.fin); await open("payroll/payroll-run", "?month=2026-10");
const rohanTr = d.querySelector(`#run-rows tr[data-user-id="${ROHAN}"]`);
check("H3", "the approved October run page still lists him from the snapshot: name, department, his net; 9 rows, the stored totals",
  txt(rohanTr?.querySelector(".table__user-name")) === "Rohan Gupta" && txt(rohanTr?.querySelector(".table__user-sub")) === "Engineering" && txt(rohanTr?.children[3]) === `₹${rohanRow().net.toLocaleString("en-IN")}`
  && d.querySelectorAll("#run-rows tr").length === 9 && txt(d.querySelector('[data-stat="net"] .stat__value')) === "₹8,74,814", txt(rohanTr));
// Round 11Y (behaviour; was "aren't shown yet": R8 part iii is built: a leaver's payslips run back from their last month)
check("H4", "his payslips are shown (round 11Y): November, live, paid to his last working day (today); October, the stored figures; nothing errors",
  j(PS.payslipsFor(ROHAN, "2026-11-09").map((s) => [s.month, s.runStatus ?? "live"])) === j([["2026-11", "live"], ["2026-10", "approved"]])
  && PS.payslipsFor(ROHAN, "2026-11-09")[1].net === rohanRow().net && allJsErrors.length === 0, j(PS.payslipsFor(ROHAN, "2026-11-09").map((s) => s.month)));
october();
prepare(KABIR);
// Round 11Y (fixture, flagged): a last working day inside prepared October (20 Oct): it's a deactivation that moves
// October's live run (he's paid to 20 Oct). Today's (9 Nov) wouldn't: October would still pay him in full
S.deactivateUser(AARAV, ROHAN, "2026-10-20");
check("H5", "before approval, a deactivation moves the live run (last working day 20 Oct: he's paid to it; round 11Y), so Approve is refused until it's prepared again", errOf(approve(AARAV)) === CHANGED && rohanRow()?.name === "Rohan Gupta");

// =================================================================
section("I. Payslips read the approved snapshot (S-D1)");
october();
prepare(KABIR); approve(AARAV);
// Round 11V (behaviour; was 'a holiday added since moved them': U-D3 refuses that holiday, so the refusal is checked and Arjun's bank account, removed and put back, moves his live row instead; the figures compare no longer counts runStatus as a difference)
const snapArjun = storedRun(2026, 10)?.rows.find((r) => r.userId === ARJUN);
const i1h = (({ ok, error }) => (ok ? "ok" : error))(H.addHoliday(AARAV, { date: "2026-10-21", name: "Company day", kind: "company" }));
S.updateUser(AARAV, ARJUN, { bankAccount: null });
const slips = PS.payslipsFor(ARJUN, "2026-11-09");
const oct = slips.find((s) => s.month === "2026-10");
const liveArjunOct = PS.payrollRunFor(ARJUN, 2026, 10), liveNov = PS.payrollRunFor(ARJUN, 2026, 11);
S.updateUser(AARAV, ARJUN, { bankAccount: "671540284821" });
check("I1", "payslipsFor: October is Arjun's snapshot row with runStatus 'approved', not the live figures (his bank account removed since put his live row on hold; a holiday for October is refused, round 11V); November is live, as payrollRunFor gives it",
  i1h === "October 2026's payroll is approved, so a holiday can't be added to it." && j(oct) === j({ ...snapArjun, runStatus: "approved" }) && oct.status === "draft" && liveArjunOct.status === "on-hold"
  && figures([(({ runStatus, ...x }) => x)(oct)]) !== figures([liveArjunOct]) && j(slips[0]) === j(liveNov) && !("runStatus" in slips[0]),
  j([i1h, slips.map((s) => [s.month, s.runStatus ?? "live", s.status, s.net])]));
setSession(...SESS.emp); await open("payroll/payslip-view", "?month=2026-10");
const field = (n) => txt(d.querySelector(`[data-field="${n}"]`));
check("I2", "payslip-view, October: 'Approved: not paid yet', an Approved badge, the snapshot's net and working days",
  txt(d.getElementById("payslip-subtitle")) === "Approved: not paid yet" && txt(d.getElementById("payslip-status")) === "Approved" && d.getElementById("payslip-status").className === "badge badge--success badge--dot"
  && field("net") === `₹${snapArjun.net.toLocaleString("en-IN")}` && field("working-days") === String(snapArjun.workingDays), j([txt(d.getElementById("payslip-subtitle")), field("net"), field("working-days")]));
await open("payroll/payslip-view", "?month=2026-11");
check("I3", "November (live): still 'Draft: not approved or paid yet'", txt(d.getElementById("payslip-subtitle")) === "Draft: not approved or paid yet" && txt(d.getElementById("payslip-status")) === "Draft");
await open("payroll/payslips");
const rowOf = (m) => d.querySelector(`#payslip-rows tr[data-month="${m}"]`);
check("I4", "payslips.html: October's row says Approved with the snapshot's net; 'Net pay, October' notes 'Approved, not paid yet'; November stays Draft",
  txt(rowOf("2026-10")?.querySelector(".badge")) === "Approved" && txt(rowOf("2026-10")?.children[4]) === `₹${snapArjun.net.toLocaleString("en-IN")}` && txt(rowOf("2026-11")?.querySelector(".badge")) === "Draft"
  && txt(d.querySelector('[data-stat="latest"] .stat__delta')) === "Approved, not paid yet", j([txt(rowOf("2026-10")), txt(d.querySelector('[data-stat="latest"]'))]));
october();
S.updateUser(AARAV, ARJUN, { bankAccount: null });
prepare(KABIR); approve(AARAV);
setSession(...SESS.emp); await open("payroll/payslip-view", "?month=2026-10");
const i5 = txt(d.getElementById("payslip-subtitle"));
await open("payroll/payslips");
// Round 11V (behaviour; was 'Approved, on hold': U-D6b says the hold is as it was when the run was approved, since it may have been put right)
check("I5", "an on-hold row in an approved month is held: 'On hold when approved: No bank account on file' on both pages (round 11V), the On hold badge",
  i5 === "On hold when approved: No bank account on file" && txt(rowOf("2026-10")?.querySelector(".badge")) === "On hold" && txt(d.querySelector('[data-stat="latest"] .stat__delta')) === "On hold when approved: No bank account on file", j([i5, txt(d.querySelector('[data-stat="latest"]'))]));
setSession(...SESS.fin); await open("payroll/payslip-view", `?employee=${ARJUN}&month=2026-10`);
// Round 11V (behaviour; was 'Approved, on hold': U-D6b's wording)
check("I6", "Kabir opening Arjun's approved October payslip: 'Arjun Kapoor (EMP-1105). On hold when approved: …' (round 11V)", txt(d.getElementById("payslip-subtitle")) === "Arjun Kapoor (EMP-1105). On hold when approved: No bank account on file", txt(d.getElementById("payslip-subtitle")));

// =================================================================
section("J. The live preview: payrollRun() and payrollRunFor() as before this round (S-D9)");
const clocks = [[[2026, 10, 30, 19], [2026, 11, 9]], [[2026, 9, 30], [2026, 9, 30]], [[2026, 10, 5], [2026, 11, 16]], [[2026, 11, 16], [2027, 1, 4]]];
// Round 11W (shape): payrollRunFor's attendance block gains pausedLateMarks (G4's pause); the code compared with has
// none, so it's left out here (every figure is still compared).
const noPause = (row) => (row?.attendance ? { ...row, attendance: Object.fromEntries(Object.entries(row.attendance).filter(([k]) => k !== "pausedLateMarks")) } : row);
const noPauseRun = (run) => (run ? { ...run, rows: run.rows.map(noPause) } : run);
const A11W = await import("./js/data/attendance-store.js");   // Round 11W (restage): RG-102 rejected at each seed clock (J1)
const j1 = [];
for (const [seed, view] of clocks) {
  mem.clear(); setNow(...seed); PS.payrollRun(seed[0], seed[1]); { const r = A11W.decideRegularization("RG-102", "EMP-1003", "hr", "reject", "Decided before the clock (round 11W)"); if (!r.ok) throw new Error(`round 11W restage, RG-102: ${r.error}`); } setNow(...view);
  for (const [y, m] of [[view[0], view[1]], [seed[0], seed[1]]]) {
    j1.push(j(noPauseRun(PS.payrollRun(y, m, { preparedBy: KABIR }))) === j(OLD.payrollRun(y, m, { preparedBy: KABIR })) && j(noPauseRun(PS.payrollRun(y, m))) === j(OLD.payrollRun(y, m))
      && [ARJUN, VIKRAM, ROHAN].every((id) => j(noPause(PS.payrollRunFor(id, y, m))) === j(OLD.payrollRunFor(id, y, m))));
  }
}
check("J1", "payrollRun() (with and without a preparer) and payrollRunFor() byte-identical to js-pre11T's, over four seed / view clocks and two months each", j1.every(Boolean), j(j1));
october();
prepare(KABIR); approve(AARAV);
const j2 = [j(noPauseRun(PS.payrollRun(2026, 10))) === j(OLD.payrollRun(2026, 10)) /* Round 11W (shape) */, PS.payrollRun(2026, 10).status, PS.payrollRun(2026, 10).approvedBy, PS.payrollRun(2026, 10, { preparedBy: KABIR }).preparedBy];
check("J2", "even with October approved, payrollRun(2026, 10) is still the live draft, byte-identical to before (the dashboards' and tax page's reader)", j(j2) === j([true, "draft", null, KABIR]), j(j2));
const j3 = [ARJUN, VIKRAM].every((id) => j(PS.payslipsFor(id, "2026-12-15").filter((s) => s.month !== "2026-10").map(noPause)) === j(OLD.payslipsFor(id, "2026-12-15").filter((s) => s.month !== "2026-10")));   // Round 11W (shape)
check("J3", "payslipsFor: every month but the approved one is exactly what it was before this round", j3);

// =================================================================
section("K. payroll-run.html");
const $ = (id) => d.getElementById(id);
const steps = () => [...$("run-steps").children].map((li) => `${li.className.replace("stepper__step", "").trim() || "-"}|${txt(li.querySelector("strong"))}|${txt(li.querySelector("small"))}`);
const kv = () => [...d.querySelectorAll(".kv__row")].map((r) => `${txt(r.querySelector("dt"))}|${txt(r.querySelector("dd"))}`);
const toast = () => txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
october();
setNow(2026, 11, 9);
setSession(...SESS.fin); await open("payroll/payroll-run");
check("K1", "this month (November) as Kabir: a live Draft; Prepare shown but disabled with the store's reason; Approve hidden (Finance); 'Previous month' links to October",
  txt($("run-status")) === "Draft" && !$("prepare-run")?.hidden && $("prepare-run")?.disabled && $("prepare-run")?.title.startsWith("November 2026 can't be prepared yet: it hasn't ended yet; ")
  && $("approve-run").hidden && d.querySelector("#run-months a")?.getAttribute("href") === "payroll-run.html?month=2026-10" && txt($("run-months")) === "Previous month",
  j([$("prepare-run")?.title, txt($("run-months"))]));
await open("payroll/payroll-run", "?month=2026-10");
const liveOct = PS.payrollRun(2026, 10);
check("K2", "October, not prepared yet: the live figures (= payrollRun), Draft, steps Draft done / Prepared current; Prepare enabled, Approve hidden; Previous and Next month",
  txt($("run-title")) === "Payroll run, October 2026" && txt(d.querySelector('[data-stat="net"] .stat__value')) === `₹${PS.runTotals(liveOct).net.toLocaleString("en-IN")}`
  && j(steps()) === j(["is-done|Draft|Worked out from the live records", "is-current|Prepared|Not prepared yet", "-|Approval|Aarav Mehta, Admin", "-|Payment|Not built yet"])
  && !$("prepare-run")?.disabled && txt($("prepare-run")) === "Prepare run" && $("prepare-run")?.title === "Fix October 2026's figures for approval" && txt($("run-months")) === "Previous month · Next month", j([steps(), $("prepare-run")?.title]));
check("K3", "its alert and run details: live, and that it can be prepared now",
  txt($("run-alert")) === "This run isn't prepared yet, so these figures are worked out from the live attendance and leave records each time the page opens. It can be prepared now, which fixes these figures for approval."
  && j(kv()) === j(["Prepared by|Not prepared yet", "Approver|Aarav Mehta, Admin", "Figures fixed on|Not fixed: worked out live", "Pay date|Not set", "Bank file|Not built yet"]), j([txt($("run-alert")), kv()]));
$("prepare-run")?.click();
check("K4", "clicking Prepare stores it (through prepareRun), toasts, and redraws: Prepared, 'Prepare again', the snapshot's figures, Kabir and today's date",
  storedRun(2026, 10)?.preparedBy === KABIR && toast() === "October 2026's run is prepared: its figures are fixed for approval." && txt($("run-status")) === "Prepared" && $("run-status").className === "badge badge--info badge--dot"
  && txt($("prepare-run")) === "Prepare again" && j(steps()) === j(["is-done|Draft|Worked out from the live records", "is-done|Prepared|By Kabir Shah on 9 Nov 2026", "is-current|Approval|Aarav Mehta, Admin", "-|Payment|Not built yet"])
  && j(kv().slice(0, 3)) === j(["Prepared by|Kabir Shah", "Approver|Aarav Mehta, Admin", "Figures fixed on|9 Nov 2026"]) && txt(d.querySelector('[data-stat="net"] .stat__delta')) === "Prepared, not approved yet", j([toast(), steps(), kv()]));
check("K5", "the preparer's alert", txt($("run-alert")) === "You prepared this run, so someone else has to approve it. Its figures were fixed when it was prepared, on 9 Nov 2026; if attendance or leave changes them before it's approved, it has to be prepared again.", txt($("run-alert")));
setSession(...SESS.admin); await open("payroll/payroll-run", "?month=2026-10");
check("K6", "Aarav: Approve enabled ('Approve the October run'); Prepare disabled with S4's reason (nobody else could approve); the alert says he can approve; rows read Prepared",
  !$("approve-run").disabled && $("approve-run").title === "Approve the October run" && $("prepare-run")?.disabled && $("prepare-run")?.title === NOBODY_ELSE
  && txt($("run-alert")).startsWith("Kabir Shah prepared this run. You can approve it. ") && [...d.querySelectorAll("#run-rows .badge")].every((b) => txt(b) === "Prepared"), j([$("approve-run").title, $("prepare-run")?.title, txt($("run-alert"))]));
setNow(2026, 11, 10, 16, 5);
$("approve-run").click();
check("K7", "clicking Approve approves it: toast, Approved (green), steps 1-3 done and none current, 'Approved by Aarav Mehta on 10 Nov 2026', both buttons disabled with the store's reasons",
  storedRun(2026, 10)?.status === "approved" && toast() === "October 2026's run is approved." && txt($("run-status")) === "Approved" && $("run-status").className === "badge badge--success badge--dot"
  && j(steps()) === j(["is-done|Draft|Worked out from the live records", "is-done|Prepared|By Kabir Shah on 9 Nov 2026", "is-done|Approval|By Aarav Mehta on 10 Nov 2026", "-|Payment|Not built yet"])
  && txt($("run-approver")) === "Approved by Aarav Mehta on 10 Nov 2026" && $("approve-run").disabled && $("approve-run").title === "October 2026's run is already approved."
  && $("prepare-run")?.title === "October 2026's run is approved, so it can't be prepared again.", j([toast(), steps(), $("approve-run").title]));
check("K8", "the approved alert; net note 'Approved, not paid yet'; rows read Approved",
  txt($("run-alert")) === "Aarav Mehta approved this run on 10 Nov 2026. Its figures are final: the payslips for October 2026 show them, and they can't be changed. Paying isn't built yet."
  && txt(d.querySelector('[data-stat="net"] .stat__delta')) === "Approved, not paid yet" && [...d.querySelectorAll("#run-rows .badge")].every((b) => txt(b) === "Approved"), txt($("run-alert")));
october();
prepare(KABIR);
H.addHoliday(AARAV, { date: "2026-10-21", name: "Company day", kind: "company" });
setSession(...SESS.admin); await open("payroll/payroll-run", "?month=2026-10");
check("K9", "after a live change, Aarav's Approve is disabled with 'prepare it again', said in the alert too; the page shows the prepared figures, not the moved ones",
  $("approve-run").disabled && $("approve-run").title === CHANGED && txt($("run-alert")).startsWith(`Kabir Shah prepared this run. ${CHANGED} `)
  && txt(d.querySelector('[data-stat="net"] .stat__value')) === "₹8,74,814", j([$("approve-run").title, txt($("run-alert"))]));
$("approve-run").disabled = false; $("approve-run").click();
check("K10", "re-enabled by hand and clicked: the store refuses, the refusal is the toast, nothing changes", toast() === CHANGED && storedRun(2026, 10)?.status === "prepared", toast());
october();
setSession(...SESS.fin); await open("payroll/payroll-run", "?month=2026-1x");
// Round Forms (behaviour; was "opens this month"): the page says so, with the way back; forms.mjs Y1 pins the words
check("K11", "a ?month that isn't one says so ('That isn't a month'), no rows", txt($("run-title")) === "Payroll run" && txt(d.querySelector("main .empty__title")) === "That isn't a month" && !d.querySelector("tbody tr"));
for (const [n, who] of [["K12", "hr"], ["K13", "emp"]]) {
  setSession(...SESS[who]); await open("payroll/payroll-run", "?month=2026-10");
  check(n, `${who}: sent away, nothing drawn, nothing stored`, navigations.length === 1 && d.getElementById("run-rows").children.length === 0 && !mem.has("officeos:payroll-runs"));
}
october();
promote(KABIR);
prepare(KABIR);
setSession(...SESS.admin); await open("payroll/payroll-run", "?month=2026-10");
check("K14", "a stored run leaves its preparer out of who can approve it: Kabir, an Admin who prepared October, isn't listed (the live preview, with no preparer, lists both: payrun.mjs F7)",
  txt($("run-approver")) === "Aarav Mehta, Admin" && steps()[2] === "is-current|Approval|Aarav Mehta, Admin" && j(safe(() => PS.approversFor(storedRun(2026, 10)).map((u) => u.id))) === j([AARAV]), j([txt($("run-approver")), steps()[2]]));
check("K15", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js"), jsPre = walk("./js-pre11T");
// Round 11V (layout; was the live js: 11T's change set read from the frozen result it left, js-pre11V = HEAD 9f58fee; the live js has 11V's since (paygate.mjs X1))
const changedJs = walk("./js-pre11V").filter((p) => !jsPre.includes(p) || srcAt("./js-pre11V", p) !== srcAt("./js-pre11T", p));
check("X1", "exactly these 7 js files changed, none added or removed: payroll-store, store, payroll-run, payslips, payslip-view, permissions, users-list",
  // Round 12Z (layout; was the live js's list: 12Z adds ui/salary-change-view.js): the list as 77b5ddb has it (js-pre12Z); the live one: salinbox.mjs X1
  j(changedJs) === j(["config/permissions.js", "data/payroll-store.js", "data/store.js", "pages/payroll-run.js", "pages/payslip-view.js", "pages/payslips.js", "pages/users-list.js"]) && j(walk("./js-pre12Z")) === j(jsPre), j(changedJs));
const pagesPre = walk("./html-pre11T");
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
// Round 12W (layout; was the live pages' text): 11T's own page claim, read from 12V's frozen result (html-pre12W = HEAD
// 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2)
const changedPages = pagesNow.filter((p) => !pagesPre.includes(p) || srcAt("./html-pre12W", p) !== srcAt("./html-pre11T", p));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const cssDir = new URL("./css-pre13U", HERE).pathname.replace(/^\/(\w:)/, "$1");
const cssSame = walk("./css-pre11T").every((p) => fs.existsSync(`${cssDir}/${p}`) && fs.readFileSync(`${cssDir}/${p}`, "utf8") === srcAt("./css-pre11T", p));
check("X2", "exactly one page changed (payroll/payroll-run.html), no css", j(changedPages) === j(["payroll/payroll-run.html"]) && j(pagesNow) === j(pagesPre.filter((p) => p.endsWith(".html"))) && cssSame, j(changedPages));
const crlf = (s) => !s.endsWith("\n") && !/(^|[^\r])\n/.test(s);
check("X3", "every changed file CRLF with no final newline", changedJs.every((p) => crlf(srcAt("./js", p))) && crlf(fs.readFileSync(`${DIR}/payroll/payroll-run.html`, "utf8")));
const fnText = (s, name) => { const i = s.search(new RegExp(`(function|const) ${name}\\b`)); return i < 0 ? null : s.slice(i, s.indexOf("\r\n\r\n", i)); };
const PSNOW = srcAt("./js", "data/payroll-store.js"), PSPRE = srcAt("./js-pre11T", "data/payroll-store.js");
// Round 11W (layout; was the live payroll-store.js: 11T's "live computation untouched" read from the frozen result it
// left, js-pre11V; 11W's G4 pause changes payrollRunFor by ruling since (latepause.mjs X5))
const PS11T = srcAt("./js-pre11V", "data/payroll-store.js");
const kept = ["payrollRunFor", "payrollRun", "absencesIn", "unpaidLeaveDays", "salaryFor", "runTotals", "payslipTotals", "runMonth", "checkSalary", "correctableUntil"];
check("X4", "the live computation's code is untouched (S-D9): payrollRunFor, payrollRun, absencesIn, unpaidLeaveDays, salaryFor, runTotals, payslipTotals, runMonth, checkSalary, correctableUntil; payroll.js unchanged",
  kept.every((f) => fnText(PS11T, f) !== null && fnText(PS11T, f) === fnText(PSPRE, f)) && srcAt("./js-pre11V", "data/payroll.js") === srcAt("./js-pre11T", "data/payroll.js"), kept.filter((f) => fnText(PS11T, f) !== fnText(PSPRE, f)).join(","));
const pages = ["pages/payroll-run.js", "pages/payslips.js", "pages/payslip-view.js"].map((p) => srcAt("./js", p));
check("X5", "no page works out a pay figure: none of the payroll pages imports payroll.js or names a pay rule (computePay, splitGross, monthlyTds, annualTax, lossOfPay*); payroll-run.js reads totals only as the stored run's, else runTotals() (both places)",
  pages.every((s) => !/data\/payroll\.js"|computePay|splitGross|monthlyTds|annualTax|lossOfPayDays|lossOfPayAmount/.test(s)) && (pages[0].match(/run\.totals \?\? runTotals\(run\)/g) ?? []).length === 2 && !/runTotals\(run\)/.test(pages[0].replace(/run\.totals \?\? runTotals\(run\)/g, "")));
check("X6", "PREPARED_BY is gone; payroll:create is checked in exactly one data function (prepareProblem) and used by exactly one page (the Prepare button)",
  !/PREPARED_BY|EMP-1008/.test(pages[0]) && (PSNOW.match(/"payroll:create"/g) ?? []).length === 1 && /prepareProblem[\s\S]{0,120}"payroll:create"/.test(PSNOW)
  && fs.readdirSync(DIR, { recursive: true }).filter((f) => f.endsWith(".html")).map((f) => f.replaceAll("\\", "/")).sort().filter((p) => fs.readFileSync(`${DIR}/${p}`, "utf8").includes('"payroll:create"')).join() === "payroll/payroll-run.html");
const STNOW = srcAt("./js", "data/store.js"), STPRE = srcAt("./js-pre11T", "data/store.js");
const imports = (s) => s.match(/^import .*$/gm).join("\n");
check("X7", "store.js: imports unchanged (no payroll-store import, no cycle), reads the runs key raw through load(); payroll-store.js imports only core/storage.js and config/roles.js besides what it had",
  // Round 11V (layout; was the live payroll-store.js: 11T's new imports read from js-pre11V = HEAD 9f58fee; 11V adds PAST_DAY_WINDOW to its leave-store import (paygate.mjs X4))
  imports(STNOW) === imports(STPRE) && /load\("payroll-runs"\)/.test(STNOW)
  && j(imports(srcAt("./js-pre11V", "data/payroll-store.js")).split("\n").filter((l) => !imports(PSPRE).split("\n").includes(l))) === j(['import { load } from "../core/storage.js";', 'import { permissionsOf } from "../config/roles.js";', 'import { monthFor, allRegularizations, ATTENDANCE_RULES } from "./attendance-store.js";']),
  j(imports(srcAt("./js-pre11V", "data/payroll-store.js")).split("\n").filter((l) => !imports(PSPRE).split("\n").includes(l))));
check("X8", "nothing seeds a payroll run (the seed is empty), and nothing but prepareRun / approveRun writes one", /seed: \(\) => \[\], idPrefix: "PR-"/.test(PSNOW) && (PSNOW.match(/runs\.(add|update)\(/g) ?? []).length === 3);

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
