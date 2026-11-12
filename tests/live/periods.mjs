// usage: node periods.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 8F: 8A's remaining decisions and 8D's two found-in-passing bugs. ./js is the build, ./js-pre8F 8d1a23b (HEAD,
// 8D) for the contrast. Clock Tue 6 Oct 2026 10:00 local unless a check moves it.
//   A  D4: leave can be dated at most PAST_DAY_WINDOW (7) days back, checked when sent, never when decided; the same
//      boundary day as corrections and 8D's settle point
//   B  D5: a request's days split by period (year; month, for work from home), each against its own balance
//   C  bug a: the final approval of a correction re-runs the day checks (approved leave, holiday) made when it was sent
//   D  bug b: the joining-date parser in store.js; pre-joining working days read "not-joined"; payroll pages and the
//      payslips list explain it
//   E  D7 / D8 comments and shifts.html's sample labels
//   F  source
// Round 12D (behaviour + wording, ruling X-D2): a joiner's first month is prorated to the joining date (D4), and the
// payslip note and the run page line say so (D10, D11).
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const PAGE = {
  apply: ["leave/apply-leave.html", "apply-leave"], list: ["payroll/payslips.html", "payslips"], view: ["payroll/payslip-view.html", "payslip-view"],
  run: ["payroll/payroll-run.html", "payroll-run"], myatt: ["attendance/my-attendance.html", "my-attendance"],
  emp: ["dashboard/employee.html", "employee-dashboard"], mark: ["attendance/mark-attendance.html", "mark-attendance"], team: ["attendance/team-attendance.html", "team-attendance"],
};
const HTML = Object.fromEntries(Object.entries(PAGE).map(([k, [f]]) => [k, fs.readFileSync(`${DIR}/${f}`, "utf8")]));

const RealDate = Date;
let NOW = 0;
const setNow = (iso, h = 10, mi = 0) => { const [y, m, d] = iso.split("-").map(Number); NOW = new RealDate(y, m - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
const mem = new Map();
const shim = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = shim;
const fresh = (at = "2026-10-06", h = 10) => { mem.clear(); globalThis.localStorage = shim; setNow(at, h); };
const snap = () => new Map(mem);
const restore = (s) => { mem.clear(); for (const [k, v] of s) mem.set(k, v); globalThis.localStorage = shim; };
fresh();

const A = await import("./js/data/attendance-store.js");
const L = await import("./js/data/leave-store.js");
const H = await import("./js/data/holidays.js");
const HOL_ACTOR = "EMP-1003";   // Round 10W (signature; was addHoliday(fields) / removeHoliday(id)): the holiday writes take the acting person's id first and check their record (holidays:manage); every call here passes HR's (Priya). The guard itself: holiguard.mjs
const P = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const A0 = await import("./js-pre8F/data/attendance-store.js");
const L0 = await import("./js-pre8F/data/leave-store.js");
const P0 = await import("./js-pre8F/data/payroll-store.js");

const WHO = { kabir: ["fin", "Kabir Shah", "EMP-1008"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"] };
let loads = 0, w = null, d = null, jsErrors = [], allErrors = [];
async function open(page, who, query = "") {
  const vc = new VirtualConsole();
  jsErrors = [];
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) { jsErrors.push(e.message); allErrors.push(e.message); } });
  const dom = new JSDOM(HTML[page], { url: `http://localhost/office-os/pages/${PAGE[page][0]}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  for (const [k, v] of mem) w.localStorage.setItem(k, v);
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  const auth = await import("./js/core/auth.js");
  auth.signIn(...(Array.isArray(who) ? who : WHO[who]));
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${PAGE[page][1]}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); allErrors.push(`import: ${e.message}`); }
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
const res = (x) => (x.ok ? `${x.record.status}/${x.record.stage}` : `refused: ${x.error}`);
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029", ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const NINE = [AARAV, PRIYA, KABIR, ANANYA, MEERA, SNEHA, ROHAN, VIKRAM, ARJUN];
const leave = (id, f) => L.applyLeave(id, { reason: "x", duration: "full", ...f });
const approveLeave = (lvId) => { L.decideLeave(lvId, SNEHA, "emp", "approve"); return L.decideLeave(lvId, PRIYA, "hr", "approve"); };
let salaryN = 950;
function hire(name, doj) {
  const fields = { name, email: `${name.toLowerCase().replace(/\W+/g, ".")}@example.com`, department: "ENG", reportingManager: "Sneha Rao", bankAccount: "1234567890", bankAccountLast4: "7890" };
  if (doj !== undefined) fields.dateOfJoining = doj;
  const id = S.addUser(USER_ACTOR("admin", null), fields).record.id;
  P.allSalaries();
  const box = JSON.parse(localStorage.getItem("officeos:salaries"));
  box.records.push({ id: `SAL-${salaryN++}`, userId: id, gross: 60000, effectiveFrom: "2026-01-01", regime: "new" });
  localStorage.setItem("officeos:salaries", JSON.stringify(box));
  return id;
}
const work = (id, day) => { setNow(day, 9, 20); A.checkIn(id, "office"); setNow(day, 18, 40); A.checkOut(id); };

// =====================================================================
section("A. D4: leave dated at most 7 days back, checked when sent");
const at7 = leave(ARJUN, { type: "sick", from: "2026-09-29", to: "2026-09-29" });
const at8 = leave(ARJUN, { type: "sick", from: "2026-09-28", to: "2026-09-28" });
check("A1", "Tue 6 Oct: a request starting 29 Sep (7 days back) is accepted; 28 Sep (8 back) is refused on its start date, naming the earliest date",
  at7.ok && !at8.ok && at8.field === "from" && at8.error === "Leave can be dated at most 7 days back, so the earliest start date today is 2026-09-29.", j([res(at7), res(at8)]));
fresh();
const types = ["casual", "sick", "earned", "wfh", "unpaid"];
const eight = types.map((type) => leave(ROHAN, { type, from: "2026-09-28", to: "2026-09-28" }).ok);
const seven = types.map((type, i) => { fresh(); return leave(ROHAN, { type, from: "2026-09-29", to: "2026-09-29" }).ok; });
check("A2", "one rule for every type: casual, sick, earned, work from home and unpaid all refused at 8 days back and accepted at 7", eight.every((x) => !x) && seven.every(Boolean), j([eight, seven]));
fresh();
const span = leave(ROHAN, { type: "casual", from: "2026-09-30", to: "2026-10-09" });
const lastYear = leave(ARJUN, { type: "casual", from: "2025-12-10", to: "2025-12-10" });
const lastYear0 = L0.applyLeave(ARJUN, { type: "casual", from: "2025-12-10", to: "2025-12-10", reason: "x", duration: "full" });
check("A3", "a request that started last week and ends next week is fine; a day of last year's casual leave is refused (HEAD accepted it, spending 2025's allowance in Oct 2026)",
  span.ok && !lastYear.ok && lastYear0.ok, j([res(span), res(lastYear), res(lastYear0)]));
fresh();
const longAgo = leave(ROHAN, { type: "casual", from: "2026-09-25", to: "2026-10-08" });
check("A10", "measured from the first day: a request starting 25 Sep (11 days back) is refused even though it ends in the future",
  !longAgo.ok && longAgo.field === "from", res(longAgo));
fresh();
const sent = leave(ROHAN, { type: "casual", from: "2026-09-29", to: "2026-09-29" }).record;
setNow("2026-12-01");
const lateDecide = approveLeave(sent.id);
L.decideLeave("LV-2201", SNEHA, "emp", "approve");
const seedDecide = L.decideLeave("LV-2201", PRIYA, "hr", "approve");
check("A4", "never checked when deciding: on 1 Dec, Rohan's 29 Sep request and the seeded LV-2201 (5 Oct) are approved",
  lateDecide.ok && lateDecide.record.status === "approved" && seedDecide.ok && seedDecide.record.status === "approved", j([res(lateDecide), res(seedDecide)]));
fresh();
const adminOld = L.applyLeave(AARAV, { type: "casual", from: "2026-09-28", to: "2026-09-28", reason: "x" });
check("A5", "an Admin's own request (approved at once) is bounded the same way", !adminOld.ok && adminOld.field === "from", res(adminOld));
fresh();
const past3 = leave(ROHAN, { type: "sick", from: "2026-09-29", to: "2026-10-01" });
const soon3 = leave(ROHAN, { type: "casual", from: "2026-10-07", to: "2026-10-09" });
check("A6", "the short-notice advisory ('…at least 7 days ahead') isn't given for a request that has already started; still given for one starting tomorrow",
  past3.ok && !past3.advisories.some((a) => a.code === "short-notice") && soon3.ok && soon3.advisories.some((a) => a.code === "short-notice"), j([past3.advisories, soon3.advisories?.map((a) => a.code)]));
fresh();
A.dayFor(ARJUN, "2026-10-06");
const fix29 = A.requestRegularization(ROHAN, { date: "2026-09-29", issue: "missed-check-out", time: "18:00", reason: "x" });
const fix28 = A.requestRegularization(ROHAN, { date: "2026-09-28", issue: "missed-check-out", time: "18:00", reason: "x" });
check("A7", "one window: PAST_DAY_WINDOW is requestWindowDays (7); a correction for 28 Sep is refused for the same reason (window), 29 Sep isn't refused for it",
  L.PAST_DAY_WINDOW === 7 && A.ATTENDANCE_RULES.requestWindowDays === L.PAST_DAY_WINDOW && /within 7 days/.test(fix28.error ?? "") && !/within 7 days/.test(fix29.error ?? ""), j([fix29.ok ? "ok" : fix29.error, fix28.error]));
// 8D: an absence settles on the first day it can no longer be explained, by leave or by a correction.
fresh("2026-10-01", 9);
A.dayFor(ARJUN, "2026-10-01");
const NINA = hire("Nina Das", "1 Oct 2026");
for (const day of ["2026-10-01", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-12"]) work(NINA, day);   // not Mon 5 Oct
setNow("2026-10-12", 19);
const s12 = snap();
const lv12 = leave(NINA, { type: "casual", from: "2026-10-05", to: "2026-10-05" });
const open12 = P.payrollRunFor(NINA, 2026, 10).attendance.openAbsences.some((a) => a.date === "2026-10-05");
restore(s12); setNow("2026-10-13", 10);
const lv13 = leave(NINA, { type: "casual", from: "2026-10-05", to: "2026-10-05" });
const settled13 = !P.payrollRunFor(NINA, 2026, 10).attendance.openAbsences.some((a) => a.date === "2026-10-05");
check("A8", "with 8D: Nina's no-check-in Mon 5 Oct can still be explained by leave on 12 Oct (open); on 13 Oct leave is refused and the absence is settled, the same day",
  lv12.ok && open12 && !lv13.ok && lv13.field === "from" && settled13, j([res(lv12), open12, res(lv13), settled13]));
fresh();
await open("apply", "arjun");
const fromIn = d.getElementById("from-date");
const hint = txt(fromIn.closest(".form-field").querySelector(".form-hint"));
check("A9", "apply-leave: the From date's min is 29 Sep (7 days back) and its hint says 'Leave can be dated up to 7 days back.'",
  fromIn.min === "2026-09-29" && hint === "Leave can be dated up to 7 days back." && jsErrors.length === 0, j([fromIn.min, hint, jsErrors]));

// =====================================================================
section("B. D5: each period's own balance");
fresh();
const pr = (f, type) => j(L.periodsOf({ duration: "full", ...f }, type));
check("B1", "periodsOf: casual 30 Dec – 5 Jan -> 2026: 2, 2027: 3; work from home 27 Nov – 3 Dec -> Nov 2, Dec 3; one period -> one entry; a half day 0.5; bad dates []",
  pr({ from: "2026-12-30", to: "2027-01-05" }, "casual") === j([{ year: 2026, month: null, days: 2 }, { year: 2027, month: null, days: 3 }])
  && pr({ from: "2026-11-27", to: "2026-12-03" }, "wfh") === j([{ year: 2026, month: 11, days: 2 }, { year: 2026, month: 12, days: 3 }])
  && pr({ from: "2026-10-12", to: "2026-10-16" }, "casual") === j([{ year: 2026, month: null, days: 5 }])
  && pr({ from: "2026-10-12", to: "2026-10-12", duration: "first-half" }, "sick") === j([{ year: 2026, month: null, days: 0.5 }])
  && pr({ from: "2026-10-12", to: "2026-10-01" }, "casual") === "[]", pr({ from: "2026-12-30", to: "2027-01-05" }, "casual"));
setNow("2026-11-02");
const arj = leave(ARJUN, { type: "casual", from: "2026-12-30", to: "2027-01-05" });
const b26 = L.balanceFor(ARJUN, 2026).casual, b27 = L.balanceFor(ARJUN, 2027).casual, h26 = L0.balanceFor(ARJUN, 2026).casual, h27 = L0.balanceFor(ARJUN, 2027).casual;
check("B2", "Arjun's 30 Dec – 5 Jan (5 days): 2 pending in 2026 and 3 in 2027 (HEAD: all 5 in 2026, none in 2027); the stored request still says 5 days",
  arj.ok && arj.record.days === 5 && b26.pending === 1 + 2 && b27.pending === 3 && h26.pending === 1 + 5 && h27.pending === 0, j([b26, b27, h26, h27]));
fresh(); setNow("2026-11-02");
const rNY = leave(ROHAN, { type: "casual", from: "2026-12-29", to: "2027-01-08" });
const s0 = snap();
const rFeb = leave(ROHAN, { type: "casual", from: "2027-02-01", to: "2027-02-16" });
restore(s0);
const rFeb0 = L0.applyLeave(ROHAN, { type: "casual", from: "2027-02-01", to: "2027-02-16", reason: "x", duration: "full" });
check("B3", "Rohan (the case that breaks on HEAD): 29 Dec – 8 Jan accepted (3 in 2026, 6 in 2027); 12 more days in Feb 2027 refused, 6 of 12 free. HEAD accepted it: 18 casual days in 2027",
  rNY.ok && !rFeb.ok && rFeb.error === "Not enough casual leave: 6 of 12 days free in 2027 (0 approved, 6 pending), and this request is 12." && rFeb0.ok,
  j([res(rNY), res(rFeb), res(rFeb0)]));
fresh(); setNow("2026-11-02");
const rMar = leave(ROHAN, { type: "casual", from: "2027-03-01", to: "2027-03-12" });
const rNY2 = leave(ROHAN, { type: "casual", from: "2026-12-29", to: "2027-01-08" });
check("B4", "a request across New Year is refused when its later year is short, naming that year and its share: '…2 of 12 days free in 2027 (0 approved, 10 pending), and 6 of this request's 9 days fall in 2027.'",
  rMar.ok && !rNY2.ok && rNY2.error === "Not enough casual leave: 2 of 12 days free in 2027 (0 approved, 10 pending), and 6 of this request's 9 days fall in 2027.", res(rNY2));
fresh(); setNow("2026-11-02");
const wSpan = leave(SNEHA, { type: "wfh", from: "2026-11-27", to: "2026-12-03" });
const wDec = leave(SNEHA, { type: "wfh", from: "2026-12-07", to: "2026-12-08" });
check("B5", "work from home 27 Nov – 3 Dec: 2 in November, 3 in December, so no over-the-limit advisory (HEAD: 5 in November, advised); 2 more December days then go over, naming December",
  wSpan.ok && wSpan.advisories.length === 0 && L.balanceFor(SNEHA, 2026, 11).wfh.pending === 2 && L.balanceFor(SNEHA, 2026, 12).wfh.pending === 3 + 2
  && j(wDec.advisories) === j([{ code: "wfh-limit", message: "This goes over the 4 work-from-home days allowed in December 2026." }]), j([wSpan.advisories, wDec.advisories]));
fresh();
const allBal = (Lm) => j(NINE.map((id) => [2025, 2026, 2027].map((y) => Lm.balanceFor(id, y, 10)).concat([...Array(12)].map((_, i) => Lm.balanceFor(id, 2026, i + 1).wfh))));
check("B6", "the seed (no request crosses a period): every balance of all nine, 2025–2027 and every 2026 month's work from home, is HEAD's", allBal(L) === allBal(L0));
fresh(); setNow("2026-11-02");
await open("apply", "arjun");
const setDates = (from, to) => { d.getElementById("from-date").value = from; d.getElementById("to-date").value = to; d.getElementById("to-date").dispatchEvent(new w.Event("change", { bubbles: true })); };
const kv = () => [...d.querySelectorAll("#balance-after .kv__row")].map((r) => [txt(r.querySelector("dt")), txt(r.querySelector("dd"))]);
setDates("2026-12-30", "2027-01-05");
const split = kv();
setDates("2026-11-16", "2026-11-17");
const single = kv();
check("B7", "apply-leave across New Year: 'Balance after this request' gives each year's own balance and share; within one year it's the usual block",
  j(split) === j([["Casual leave left in 2026", "10 days"], ["Already pending in 2026", "1 day"], ["This request in 2026", "2 days"], ["Balance after, 2026", "7 days"],
    ["Casual leave left in 2027", "12 days"], ["This request in 2027", "3 days"], ["Balance after, 2027", "9 days"]])
  && j(single) === j([["Casual leave now", "10 days"], ["Already pending", "1 day"], ["This request", "2 days"], ["Balance after", "7 days"]]) && jsErrors.length === 0, j([split, single]));

// =====================================================================
section("C. Bug a: the final approval re-checks the day");
fresh("2026-10-01", 9);
A.dayFor(ARJUN, "2026-10-01");
const NINA2 = hire("Nina Das", "1 Oct 2026");
setNow("2026-10-06", 10);
const rg = A.requestRegularization(NINA2, { date: "2026-10-05", issue: "missed-check-in", time: "09:25", reason: "Forgot" }).record;
const lv = leave(NINA2, { type: "casual", from: "2026-10-05", to: "2026-10-05" }).record;
approveLeave(lv.id);
const mgr = A.decideRegularization(rg.id, SNEHA, "emp", "approve");
check("C1", "a missed check-in for Mon 5 Oct is sent; casual leave for the same day is then approved; the manager step still moves the correction to HR (it writes nothing)",
  rg.status === "pending" && mgr.ok && mgr.record.stage === "hr" && A.dayFor(NINA2, "2026-10-05").status === "on-leave", res(mgr));
const C1 = snap();
const head = A0.decideRegularization(rg.id, PRIYA, "hr", "approve");
const headDay = A0.dayFor(NINA2, "2026-10-05");
restore(C1);
const fin = A.decideRegularization(rg.id, PRIYA, "hr", "approve");
const stored5 = JSON.parse(localStorage.getItem("officeos:attendance")).records.filter((r) => r.userId === NINA2 && r.date === "2026-10-05");
check("C2", "HR's final approval is refused: 'This request no longer matches the attendance record: approved leave now covers that day.' Nothing is written; the day stays on leave. (HEAD approved it: present, conflict)",
  !fin.ok && fin.error === "This request no longer matches the attendance record: approved leave now covers that day." && stored5.length === 0
  && A.dayFor(NINA2, "2026-10-05").status === "on-leave" && head.ok && headDay.status === "present" && headDay.conflict === true, j([fin.error, stored5.length, head.ok, headDay.status]));
const still = A.getRegularization(rg.id);
const rej = A.decideRegularization(rg.id, PRIYA, "hr", "reject", "Covered by your leave");
check("C3", "it stays pending at HR until the approver rejects it (a note is required, as before)", still.status === "pending" && still.stage === "hr" && rej.ok && rej.record.status === "rejected", res(rej));
fresh("2026-10-01", 9);
A.dayFor(ARJUN, "2026-10-01");
const NINA3 = hire("Nina Das", "1 Oct 2026");
setNow("2026-10-06", 10);
const rgH = A.requestRegularization(NINA3, { date: "2026-10-01", issue: "missed-check-in", time: "09:25", reason: "Forgot" }).record;
const C4 = snap();
H.addHoliday(HOL_ACTOR, { date: "2026-10-01", name: "Office closed", kind: "company" });
A.decideRegularization(rgH.id, SNEHA, "emp", "approve");
const finH = A.decideRegularization(rgH.id, PRIYA, "hr", "approve");
check("C4", "a holiday added after it was sent: refused, '…no attendance is needed that day (a holiday or weekend).'",
  !finH.ok && finH.error === "This request no longer matches the attendance record: no attendance is needed that day (a holiday or weekend).", res(finH));
restore(C4);
A.decideRegularization(rgH.id, SNEHA, "emp", "approve");
const finOk = A.decideRegularization(rgH.id, PRIYA, "hr", "approve");
check("C5", "...with nothing changed, the same correction is approved and the day reads present, as before", finOk.ok && finOk.record.status === "approved" && A.dayFor(NINA3, "2026-10-01").status === "present", res(finOk));
fresh("2026-10-01", 9);
A.dayFor(ARJUN, "2026-10-01");
const NINA4 = hire("Nina Das", "1 Oct 2026");
setNow("2026-10-06", 10);
approveLeave(leave(NINA4, { type: "casual", from: "2026-10-05", to: "2026-10-05" }).record.id);
const sentLeave = A.requestRegularization(NINA4, { date: "2026-10-05", issue: "missed-check-in", time: "09:25", reason: "x" });
const sentHol = A.requestRegularization(NINA4, { date: "2026-10-02", issue: "missed-check-in", time: "09:25", reason: "x" });
check("C6", "when sending, the messages are unchanged: 'You were on approved leave that day.' / 'No attendance is needed on that day.'",
  sentLeave.error === "You were on approved leave that day." && sentHol.error === "No attendance is needed on that day.", j([sentLeave.error, sentHol.error]));
// A real punch on a day that later gets leave (a conflict day): the check-in still counts, so correcting its time is
// still allowed at the final approval, exactly as when it was sent.
fresh("2026-10-01", 9);
A.dayFor(ARJUN, "2026-10-01");
const NINA5 = hire("Nina Das", "1 Oct 2026");
setNow("2026-10-05", 10, 30); A.checkIn(NINA5, "office"); setNow("2026-10-05", 18, 40); A.checkOut(NINA5);
setNow("2026-10-06", 10);
const rgLate = A.requestRegularization(NINA5, { date: "2026-10-05", issue: "late-arrival", time: "09:30", reason: "Bus" }).record;
// Round 10V (decision; was the leave sent and approved through the live store): leave can't be sent for a day already
// checked in on any more (workedday.mjs), so the live refusal is pinned and the conflict day is data made before 10V,
// through the pre-10V leave store (js-pre10V); 8F's correction check on such a day is what C7 is about
const LV10 = await import("./js-pre10V/data/leave-store.js");
const c7live = leave(NINA5, { type: "casual", from: "2026-10-05", to: "2026-10-05" });
const c7lv = LV10.applyLeave(NINA5, { reason: "x", duration: "full", type: "casual", from: "2026-10-05", to: "2026-10-05" }).record;
LV10.decideLeave(c7lv?.id, SNEHA, "emp", "approve"); LV10.decideLeave(c7lv?.id, PRIYA, "hr", "approve");
const conflictDay = A.dayFor(NINA5, "2026-10-05");
A.decideRegularization(rgLate.id, SNEHA, "emp", "approve");
const finLate = A.decideRegularization(rgLate.id, PRIYA, "hr", "approve");
check("C7", "a late-arrival correction on a day with a real check-in that later got approved leave (conflict) is still approved: the day check only blocks days with no check-in",
  c7live.error === "You checked in on 2026-10-05, so leave can't cover that day. If the check-in times are wrong, ask for a correction instead." && conflictDay.conflict === true && finLate.ok && finLate.record.status === "approved" && A.dayFor(NINA5, "2026-10-05").checkIn === "09:30", res(finLate));

// =====================================================================
section("D. Bug b: before the joining date");
check("D1", "joiningDate lives in store.js; payroll-store re-exports the same function (8D's callers unchanged)",
  typeof S.joiningDate === "function" && P.joiningDate === S.joiningDate && S.joiningDate("19 Oct 2026") === "2026-10-19" && S.joiningDate("31 Feb 2026") === null);
// Seeded 1 Oct; Ravi added Wed 21 Oct, joining Mon 19 Oct; works 22 – 30 Oct.
fresh("2026-10-01", 9);
A.dayFor(ARJUN, "2026-10-01");
setNow("2026-10-21", 9);
const RAVI = hire("Ravi Kumar", "19 Oct 2026");
for (const day of ["2026-10-22", "2026-10-23", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"]) work(RAVI, day);
const RAVI_BASE = snap();
setNow("2026-11-30", 10);
const oct = A.monthFor(RAVI, 2026, 10), oct0 = A0.monthFor(RAVI, 2026, 10);
const before = oct.days.filter((x) => x.date < "2026-10-19" && !H.isDayOff(x.date)).map((x) => x.status);
check("D2", "Ravi's 11 working days before 19 Oct read 'not-joined' (HEAD: absent), counted as notJoined; 19 and 21 Oct (no check-in) are still absent; a new status in STATUSES",
  before.length === 11 && before.every((s) => s === "not-joined") && oct.counts.notJoined === 11 && oct.counts.noData === 0 && oct.counts.absent === 2
  && oct0.counts.absent === 13 && A.dayFor(RAVI, "2026-10-19").status === "absent" && A.STATUSES.includes("not-joined"), j([oct.counts, oct0.counts.absent]));
const sep = A.monthFor(RAVI, 2026, 9);
check("D3", "September, wholly before he joined: not-joined and weekends only (HEAD: 14 absent, 8 no-data)", sep.counts.notJoined === 22 && sep.counts.absent === 0 && sep.counts.noData === 0, j(sep.counts));
const row = P.payrollRunFor(RAVI, 2026, 10), row0 = P0.payrollRunFor(RAVI, 2026, 10);
// Round 12D (behaviour; was "payroll's counting is unchanged ... = HEAD's"): the 11 working days before 19 Oct are loss of pay too.
check("D4", "(Round 12D) October's loss of pay: the 2 absences plus the 11 working days before the joining date (13 of 20, ₹39,000 of ₹60,000); the row adds beforeJoining 11 and joined",
  row.lop.absenceDays === row0.lop.absenceDays && row.lop.notJoinedDays === 11 && row.lop.days === row0.lop.days + 11 && row.lop.days === 13 && row.lop.amount === 39000 && row.gross === 21000
  && row.attendance.beforeJoining === 11 && row.attendance.joined === "2026-10-19" && row.attendance.noData === 0, j([row.lop, row.attendance]));
const slips = P.payslipsFor(RAVI, "2026-11-30").map((s) => s.month), slips0 = P0.payslipsFor(RAVI, "2026-11-30").map((s) => s.month);
check("D5", "payslips: November and October (HEAD also had September, a month before he joined, made of absences)", j(slips) === j(["2026-11", "2026-10"]) && j(slips0) === j(["2026-11", "2026-10", "2026-09"]), j([slips, slips0]));
const sum15 = A.summaryFor("2026-10-15"), sum15h = A0.summaryFor("2026-10-15");
check("D6", "the company's 15 Oct: Ravi isn't absent or expected (HEAD: 1 absent)", sum15.absent === sum15h.absent - 1 && sum15.expected === sum15h.expected - 1, j([sum15.absent, sum15h.absent]));
const nineSame = NINE.every((id) => j(A.monthFor(id, 2026, 10).days.map((x) => x.status)) === j(A0.monthFor(id, 2026, 10).days.map((x) => x.status)));
check("D7", "the nine sample people read exactly as on HEAD (four have joining dates long before records; five have none, so nothing is checked)", nineSame);
const RAVI_WHO = ["emp", "Ravi Kumar", RAVI];
await open("list", RAVI_WHO);
const listRows = [...d.querySelectorAll("#payslip-rows tr")].map(txt);
check("D8", "Ravi's payslips list ends with why there's no earlier one: 'No payslips before October 2026: you joined on 19 Oct 2026.'",
  listRows.length === 3 && listRows[0].startsWith("November 2026") && listRows[1].startsWith("October 2026") && listRows[2] === "No payslips before October 2026: you joined on 19 Oct 2026." && jsErrors.length === 0, j(listRows));
await open("view", RAVI_WHO, "?month=2026-09");
const ownMsg = txt(d.getElementById("payslip-message-text"));
await open("view", "kabir", `?employee=${RAVI}&month=2026-09`);
const kabMsg = txt(d.getElementById("payslip-message-text"));
check("D9", "asking for September's payslip says why: 'Payslips start in October 2026, the month you joined (19 Oct 2026). There's no payslip before that.' (Finance sees his name)",
  ownMsg === "Payslips start in October 2026, the month you joined (19 Oct 2026). There's no payslip before that."
  && kabMsg === "Payslips start in October 2026, the month Ravi Kumar joined (19 Oct 2026). There's no payslip before that.", j([ownMsg, kabMsg]));
await open("view", "kabir", `?employee=${RAVI}&month=2026-10`);
const octNotes = [...d.getElementById("payslip-notes").children].map(txt);
check("D10", "(Round 12D wording) his October payslip: 'The joining date was 19 Oct 2026; the 11 working days of October 2026 before it aren't paid.'",
  octNotes.includes("The joining date was 19 Oct 2026; the 11 working days of October 2026 before it aren't paid.")
  && !octNotes.some((n) => /before attendance records began/.test(n)), j(octNotes));
restore(RAVI_BASE); setNow("2026-10-30", 19);
await open("run", "kabir");
const att = [...d.getElementById("run-checks").children].map((c) => [txt(c.querySelector(".list__title")), txt(c.querySelector(".list__sub")), txt(c.querySelector(".badge"))]).find((c) => c[0] === "Attendance recorded");
check("D11", "(Round 12D wording) the October run: 'Joined during October 2026: Ravi Kumar (joined 19 Oct, 11 working days before). The month is paid from the joining date.' -> Review",
  att[1].includes("Joined during October 2026: Ravi Kumar (joined 19 Oct, 11 working days before). The month is paid from the joining date.") && att[2] === "Review", j(att));
await open("myatt", RAVI_WHO);
const cell = d.querySelector('[data-date="2026-10-15"]');
check("D12", "his my-attendance calendar marks 15 Oct 'Before joining'", txt(cell?.querySelector(".calendar__tag")) === "Before joining" && cell.className.includes("calendar__day--future") && jsErrors.length === 0, cell?.className);
restore(RAVI_BASE); setNow("2026-10-21", 10);
const ZED = hire("Zed Ali", "2 Nov 2026");
setNow("2026-10-30", 10);
await open("list", ["emp", "Zed Ali", ZED]);
const zRows = [...d.querySelectorAll("#payslip-rows tr")].map(txt);
check("D13", "someone joining later (2 Nov): no payslips yet, and the list says why: 'No payslips yet: you join on 2 Nov 2026.'",
  P.payslipsFor(ZED, "2026-10-30").length === 0 && zRows.includes("No payslips yet: you join on 2 Nov 2026."), j(zRows));
// Ravi again, viewed Fri 23 Oct 10:00 (not in yet today): joined Mon 19 Oct, absent 19 and 21 Oct (20 Oct is Dussehra), worked 22 Oct.
fresh("2026-10-01", 9);
A.dayFor(ARJUN, "2026-10-01");
setNow("2026-10-21", 9);
const RAVI2 = hire("Ravi Kumar", "19 Oct 2026");
work(RAVI2, "2026-10-22");
setNow("2026-10-23", 10);
const R2 = ["emp", "Ravi Kumar", RAVI2];
await open("emp", R2);
const presentStat = txt(d.querySelector('[data-stat="present"] .stat__value'));
const myDays = d.querySelectorAll("#my-days tr").length;
const bar16 = [...d.querySelectorAll("#hours-chart [title]")].map((b) => b.title).find((t) => t.includes("16 Oct"));
check("D15", "his employee dashboard: '1 / 3' days worked so far (19, 21, 22 Oct; not the 11 before he joined); recent days stop at the joining date (4: 23, 22, 21, 19 Oct); the chart marks 16 Oct 'before joining'",
  presentStat === "1 / 3" && myDays === 4 && bar16 === "Fri, 16 Oct: before joining" && jsErrors.length === 0, j([presentStat, myDays, bar16]));
await open("mark", R2);
const punches = d.querySelectorAll("#recent-punches tbody tr").length;
check("D16", "mark-attendance's recent days also stop at the joining date (4 rows, not 16 Oct)", punches === 4 && jsErrors.length === 0, String(punches));
await open("team", ["hr", "Priya Nair", PRIYA]);
const dateIn = d.getElementById("team-date");
dateIn.value = "2026-10-15";
dateIn.dispatchEvent(new w.Event("change", { bubbles: true }));
const raviDots = [...d.querySelectorAll(".week__day")].map((x) => x.title).filter((t) => t.startsWith("Thu, 15 Oct: before joining"));
const raviRow = [...d.querySelectorAll("#team-rows tr")].find((tr) => txt(tr.querySelector(".table__user-name")) === "Ravi Kumar");
const raviBadge = txt(raviRow?.querySelector(".badge"));
check("D17", "team-attendance on 15 Oct: Ravi's badge reads 'Before joining', and his week of 12–16 Oct is 'before joining'",
  raviBadge === "Before joining" && raviDots.length === 1 && jsErrors.length === 0, j([raviBadge, raviDots]));
check("D14", "no page errors on any of the loads above", allErrors.length === 0, j(allErrors));

// =====================================================================
section("E. D7 / D8 and shifts.html");
// Round 11N (layout; was the live permissions.js and roles: 8F's own change, read as 11N found them (js-pre11N = HEAD fcdc960); permissions.js has users:delete since (roadnotes.mjs U1))
const perms = fs.readFileSync(`${HERE}js-pre11N/config/permissions.js`, "utf8"), perms0 = fs.readFileSync(`${HERE}js-pre8F/config/permissions.js`, "utf8");
const ROLES = (await import("./js-pre11N/config/roles.js")).ROLES, ROLES0 = (await import("./js-pre8F/config/roles.js")).ROLES;
check("E1", "D7: shifts:manage stays defined and granted (roles unchanged), with a 'reserved' comment in permissions.js",
  /shifts:\s+\["manage"\],\s+\/\/ manage: .*reserved/.test(perms) && j(ROLES) === j(ROLES0) && perms.replace(/\s+\/\/ manage: .*reserved[^\r\n]*/, "") === perms0);
const routes = fs.readFileSync(`${HERE}js/config/routes.js`, "utf8");
const { ROUTES } = await import("./js/config/routes.js");
check("E5", "D8: dashboard/admin.html stays on attendance:view-all, with a comment naming 193e5c0", ROUTES["dashboard/admin.html"] === "attendance:view-all" && /"dashboard\/admin\.html":\s+"attendance:view-all",\s+\/\/ deliberate \(193e5c0\)/.test(routes));
const shifts = new JSDOM(fs.readFileSync(`${DIR}/attendance/shifts.html`, "utf8")).window.document;
const metas = [...shifts.querySelectorAll(".card__header")].map((h) => [txt(h.querySelector(".card__title")), txt(h.querySelector(".card__meta"))]);
const alerts = [...shifts.querySelectorAll(".alert")].map(txt);
check("E2", "shifts.html: one page alert starting 'Sample, not built yet:' with the real General shift's rules; its three cards labelled; the false 'changes apply from the next month' alert gone",
  alerts.length === 1 && alerts[0].startsWith("Sample, not built yet: shifts aren't part of OfficeOS yet. Everyone works the one General shift")
  && j(metas) === j([["All shifts", "Sample, not built yet"], ["Attendance rules", "Sample, not built yet"], ["Assign a shift", "Sample, not built yet"]])
  && !/changes apply from the next month/.test(shifts.body.textContent), j([alerts, metas]));
check("E3", "the alert's numbers are the real rules (09:30, 18:30, grace to 09:45, 4 h, 8 h, every 3rd late mark)",
  A.ATTENDANCE_RULES.shiftStart === "09:30" && A.ATTENDANCE_RULES.shiftEnd === "18:30" && A.ATTENDANCE_RULES.graceMinutes === 15 && A.ATTENDANCE_RULES.halfDayMinutes === 240
  && A.ATTENDANCE_RULES.fullDayMinutes === 480 && A.ATTENDANCE_RULES.penaltyEvery === 3 && /09:30 to 18:30, late after 09:45, under 4 hours worked is absent and under 8 hours a half day, and every 3rd late mark/.test(alerts[0]));
check("E4", "its placeholders are still gated by shifts:manage (7)", shifts.querySelectorAll('[data-permission="shifts:manage"]').length === 7);

// =====================================================================
section("F. Source");
const walk = (root, rel = "") => fs.readdirSync(`${root}/${rel}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${rel}${e.name}/`) : [`${rel}${e.name}`]));
const JS = `${HERE}js`, JS0 = `${HERE}js-pre8F`;
const JS8F = `${HERE}js-pre9B`;   // Round 9B (layout): 8F's own change set, read from its frozen result (HEAD b7033c5); ./js now holds 9B's
const changedJs = walk(JS8F).filter((f) => fs.readFileSync(`${JS8F}/${f}`, "utf8") !== fs.readFileSync(`${JS0}/${f}`, "utf8")).sort();
check("F1", "js changed from HEAD: exactly these 15 files; nothing added or removed",
  j(changedJs) === j(["config/permissions.js", "config/routes.js", "data/attendance-store.js", "data/leave-store.js", "data/payroll-store.js", "data/store.js",
    "pages/apply-leave.js", "pages/employee-dashboard.js", "pages/mark-attendance.js", "pages/my-attendance.js", "pages/payroll-run.js", "pages/payslip-view.js",
    "pages/payslips.js", "pages/team-attendance.js", "ui/attendance-view.js"]) && j(walk(JS8F).sort()) === j(walk(JS0).sort()), j(changedJs));
const src = (f) => fs.readFileSync(`${JS}/${f}`, "utf8");
const imports = (f) => src(f).split("\n").filter((l) => l.startsWith("import "));
// Round 10W (decision; was "holidays.js doesn't import store.js"): the holiday writes now read the acting person's record,
// so holidays.js imports store.js's getUser (and nothing else from it). Neither module uses the other while loading, so the
// cycle is safe: holiguard.mjs X0 loads each first in a fresh process. store.js's own imports are still 8F's.
// Round 10X (decision; was "store.js imports only storage, users and holidays"): the department writes read the role table
// (departments:create / :edit), so store.js also imports config/roles.js, a leaf (it imports only permissions.js, which
// imports nothing): deptguard.mjs X0 loads every store first and pins that
// Round 11R (invariant; store.js also imports config/routes.js, for the landing-page deny rule: a leaf that imports nothing (overrides.mjs X5))
check("F2", "no load-time import cycle: store.js imports only storage, users, holidays, the role table (round 10X) and the route table (round 11R); holidays.js imports only getUser from store.js (round 10W); payroll-store no longer defines the parser",
  imports("data/store.js").every((l) => /core\/storage|\.\/users|\.\/holidays|\.\.\/config\/roles|\.\.\/config\/routes/.test(l)) && j(imports("data/holidays.js").filter((l) => /store\.js/.test(l)).map((l) => l.trim())) === j(['import { getUser } from "./store.js";'])
  && !/export function joiningDate/.test(src("data/payroll-store.js")) && /export function joiningDate/.test(src("data/store.js")));
// Round 11Y (layout; was the live payroll-store.js: 8F's statement read from the frozen result 11X left, js-pre11Y =
// office-os 8ae4c9c; 11Y stops a leaver's unpaid leave at their last working day since (leavers.mjs P4))
const ps = fs.readFileSync(`${HERE}js-pre11Y/data/payroll-store.js`, "utf8"), ps0 = fs.readFileSync(`${JS0}/data/payroll-store.js`, "utf8");
const fnText = (s, name) => { const i = s.indexOf(`function ${name}(`); return s.slice(i, s.indexOf("\n}", i) + 2); };
check("F3", "payroll's absence counting (absencesIn) and unpaidLeaveDays are byte-identical to HEAD", fnText(ps, "absencesIn") === fnText(ps0, "absencesIn") && fnText(ps, "unpaidLeaveDays") === fnText(ps0, "unpaidLeaveDays"));
check("F4", "the window has one home: leave-store's PAST_DAY_WINDOW; attendance-store uses it (no literal 7 for requestWindowDays)",
  /export const PAST_DAY_WINDOW = 7;/.test(src("data/leave-store.js")) && /requestWindowDays: PAST_DAY_WINDOW,/.test(src("data/attendance-store.js")));
const changedAll = changedJs.map((f) => src(f)).concat(["attendance/shifts.html", "leave/apply-leave.html"].map((f) => fs.readFileSync(`${DIR}/${f}`, "utf8")));
check("F5", "every changed file is CRLF only, with no final newline", changedAll.every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
