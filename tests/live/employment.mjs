// usage: node employment.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// F2: employment period (data/employment-period.js) and the new-joiner rules. ./js is the build.
//   E  employmentPeriod / employmentState / joinsOn / isAppCreated: the one definition
//   J  joiners on the 1st, mid-month, the last day, 29 Feb 2028, a year boundary, an intern: nothing before joining (attendance,
//      absences, loss of pay, payslips, a pay row), the first month pro-rated from the joining date, leave accrued from it
//   N  addUser itself is unchanged without a date (the data layer is additive); the employee form sends today's date when the field
//      is left empty (f2.mjs F5), and with it the person is a joiner: no absent month, no full-year leave grant
//   F  a joiner whose date is in the future: no attendance, can't check in (before the joining day), "joins on"
//   H  no inherited history (requests, corrections, payslips of earlier months, approvals)
//   P  the shift engine and overtime read nothing before joining
//   L  leave: the policy engine from the first day for a person created in the app; the seeded people unchanged until the start date
//   X  after exit: nothing generated after the last working day
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const S = await import("./js/data/store.js");
const A = await import("./js/data/attendance-store.js");
const P = await import("./js/data/payroll-store.js");
const PAY = await import("./js/data/payroll.js");
const L = await import("./js/data/leave-store.js");
const LP = await import("./js/data/leave-policy.js");
const E = await import("./js/data/pay-engine.js");
const EP = await import("./js/data/employment-period.js");
const SD = await import("./js/data/shift-days.js");
const SP = await import("./js/data/shift-punch.js");
const OT = await import("./js/data/overtime-store.js");
const SET = await import("./js/data/pay-settings.js");
const SHS = await import("./js/data/shift-settings.js");
const EN = await import("./js/data/shift-engine.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(6)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008";
const SEEDED = ["EMP-1001", "EMP-1003", "EMP-1008", "EMP-1017", "EMP-1023", "EMP-1029", "EMP-1042", "EMP-1061", "EMP-1088", "EMP-1105"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
let seq = 0;
const show = (iso) => `${Number(iso.slice(8))} ${MON[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
// a fresh browser at the given clock, the attendance seed made, then a person created in the app
function fresh(y, mo, d) { mem.clear(); setNow(y, mo, d, 10); A.monthFor(AARAV, y, mo); }
function hire(joining, type = "Full-time", gross = 62000) {
  seq += 1;
  const r = S.addUser(AARAV, { name: `Joiner ${seq}`, email: `joiner${seq}@northwind.com`, department: "ENG", designation: "Software Engineer", role: "emp", ...(joining ? { dateOfJoining: show(joining) } : {}), employmentType: type });
  const id = S.getAllUsers().find((u) => u.email === `joiner${seq}@northwind.com`)?.id;
  if (gross && id) P.setSalary(AARAV, id, { gross, effectiveFrom: joining ? `${joining.slice(0, 7)}-01` : "2026-01-01" });
  return { id, ok: r.ok, error: r.error };
}
const monthDays = (id, y, m) => A.monthFor(id, y, m).days;
const beforeOk = (id, joining, y, m) => monthDays(id, y, m).filter((d) => d.date < joining && !["weekend", "holiday"].includes(d.status)).every((d) => d.status === "not-joined" && !d.expected && !d.checkIn);

// ---------- E ----------
section("E. One definition of the employment period");
fresh(2026, 11, 20);
const ids = hire("2026-11-13");
const per = EP.employmentPeriod(ids.id);
check("E1", "employmentPeriod: from the joining date, to null while employed, no periods away", per.from === "2026-11-13" && per.to === null && per.away.length === 0, j(per));
check("E2", "employmentState: before / during", EP.employmentState(ids.id, "2026-11-12") === "before" && EP.employmentState(ids.id, "2026-11-13") === "during" && EP.isEmployedOn(ids.id, "2026-11-20"));
check("E3", "an unknown person: no period; the seeded people are not 'created in the app', a new one is", j(EP.employmentPeriod("EMP-9999")) === j({ from: null, to: null, away: [] }) && SEEDED.every((id) => !EP.isAppCreated(id)) && EP.isAppCreated(ids.id) && !EP.isAppCreated(null));
check("E4", "joinsOn: the date for a future joiner, null once joined", EP.joinsOn(ids.id, "2026-11-12") === "2026-11-13" && EP.joinsOn(ids.id, "2026-11-13") === null);
S.deactivateUser(AARAV, ids.id, "2026-11-18");
check("E5", "after the last working day: 'after'; the last day itself still during", EP.employmentPeriod(ids.id).to === "2026-11-18" && EP.employmentState(ids.id, "2026-11-18") === "during" && EP.employmentState(ids.id, "2026-11-19") === "after");

// ---------- J ----------
section("J. Joiners: nothing before joining; the first month pro-rated");
// [label, clock, joining, casual by the policy: 12 a year from the joining month, a month counting when employed on its 15th, rounded down to the half day]
const CASES = [["the 1st", [2026, 11, 20], "2026-11-01", 2], ["mid-month (the 13th)", [2026, 11, 20], "2026-11-13", 2], ["the last day", [2026, 11, 30], "2026-11-30", 1],
  ["29 Feb 2028 (leap year)", [2028, 3, 10], "2028-02-29", 10], ["1 Feb 2027 (not a leap year)", [2027, 2, 20], "2027-02-01", 11], ["31 Dec (year boundary)", [2027, 1, 20], "2026-12-31", 0], ["1 Jan (year boundary)", [2027, 1, 20], "2027-01-01", 12]];
for (const [label, clock, joining, casual] of CASES) {
  const [y, mo] = [Number(joining.slice(0, 4)), Number(joining.slice(5, 7))];
  fresh(...clock);
  const h = hire(joining);
  const month = A.monthFor(h.id, y, mo);
  const before = month.days.filter((d) => d.date < joining && !["weekend", "holiday"].includes(d.status));
  check(`J.${label}`.slice(0, 6), `${label}: every working day before ${joining} reads not-joined (not expected, no record, not absent)`, h.ok && before.every((d) => d.status === "not-joined" && !d.expected && !d.checkIn && !d.recordId) && month.counts.notJoined === before.length && !before.some((d) => d.status === "absent"), `${before.length} days; ${h.error ?? ""}`);
  const prev = new Date(RealDate.UTC(y, mo - 2, 1));
  const pm = [prev.getUTCFullYear(), prev.getUTCMonth() + 1];
  const row = P.payrollRunFor(h.id, y, mo);
  const slips = P.payslipsFor(h.id, `${clock[0]}-${String(clock[1]).padStart(2, "0")}-${String(clock[2]).padStart(2, "0")}`).map((s) => s.month);
  check(`J.p${label}`.slice(0, 6), `${label}: the first month is pro-rated: loss of pay = the days before joining at the daily rate; no row, no payslip for any earlier month`, row && (row.lop.notJoinedDays ?? 0) === before.length && row.lop.amount === PAY.lossOfPayAmount(row.monthlyGross, row.lop.days, row.workingDays) && P.payrollRunFor(h.id, pm[0], pm[1]) === null && slips.every((m) => m >= `${y}-${String(mo).padStart(2, "0")}`), `${row?.lop.notJoinedDays ?? 0} days, amount ${row?.lop.amount}; slips ${slips.join(",")}`);
  const acc = LP.leaveAccount(h.id, `${y}-${String(mo).padStart(2, "0")}-28`);
  check(`J.l${label}`.slice(0, 6), `${label}: leave by the policy from the joining month (not the flat 12 / 8 / 10 for long-serving people): under 1 year, casual ${casual}, earned not usable yet (6 months)`, acc && acc.band === "under1" && acc.types.casual.entitled === casual && acc.types.sick.entitled <= 8 * (casual / 12) + 0.5 && acc.types.earned.usable === 0, j([acc?.types.casual.entitled, acc?.types.earned]));
}

// the first month in rupees, one case worked by hand: the 13th of November 2026
fresh(2026, 11, 20);
const h13 = hire("2026-11-13", "Full-time", 63000);
const r13 = P.payrollRunFor(h13.id, 2026, 11);
check("J8", "13 Nov 2026 on 63,000: 21 working days, 9 before joining: 9 / 21 of the gross is loss of pay (27,000); paid 36,000", r13.workingDays === 21 && r13.lop.notJoinedDays === 9 && r13.lop.amount === 27000 && r13.gross === 36000, j({ wd: r13.workingDays, nj: r13.lop.notJoinedDays, amt: r13.lop.amount, gross: r13.gross }));
const e13 = E.payFor(h13.id, 2026, 11);
check("J9", "the new engine reads the same pro-rata (gross after loss of pay 36,000)", e13 && e13.gross === 36000 && e13.lop.notJoinedDays === 9, e13 && String(e13.gross));

// an intern
fresh(2026, 11, 20);
const intern = hire("2026-11-02", "Intern", 20000);
const accI = LP.leaveAccount(intern.id, "2026-11-20");
check("J10", "an intern: the intern band; casual 1 for the month, no sick, no earned; nothing before joining", accI.band === "intern" && accI.types.casual.entitled === 1 && accI.types.sick.entitled === 0 && accI.types.earned.entitled === 0 && beforeOk(intern.id, "2026-11-02", 2026, 11), j(accI.types.casual));

// ---------- N ----------
section("N. No joining date: joins today");
fresh(2026, 11, 20);
const n0 = hire(null);
check("N0", "addUser with no joining date stores none, as before (the form fills today's date)", !String(S.getUser(n0.id).dateOfJoining ?? "").trim(), String(S.getUser(n0.id).dateOfJoining));
const nj = hire("2026-11-20");   // what the employee form sends when the field is left empty: today
const u = S.getUser(nj.id);
check("N1", "added with today's date (20 Nov 2026, the form's empty field), stored as the joining date", u.dateOfJoining === "20 Nov 2026" && EP.employmentPeriod(nj.id).from === "2026-11-20", String(u.dateOfJoining));
const mN = A.monthFor(nj.id, 2026, 11);
check("N2", "...so no day before today is absent: every earlier working day is not-joined; no absences, none to deduct", mN.counts.absent === 0 && mN.days.filter((d) => d.date < "2026-11-20" && !["weekend", "holiday"].includes(d.status)).every((d) => d.status === "not-joined"), j(mN.counts));
check("N3", "...no pay row for October, and November is pro-rated from today", P.payrollRunFor(nj.id, 2026, 10) === null && P.payrollRunFor(nj.id, 2026, 11)?.lop.notJoinedDays > 0);
const accN = LP.leaveAccount(nj.id, "2026-11-20");
check("N4", "...and the leave is the policy's for under a year: not 12 + 8 + 10 days", accN.band === "under1" && accN.types.casual.entitled === 1 && accN.types.earned.entitled === 0, j(accN.types.casual));
check("N5", "an explicit joining date is kept as given", (() => { const k = hire("2026-11-09"); return S.getUser(k.id).dateOfJoining === "9 Nov 2026"; })());

// ---------- F ----------
section("F. A future joiner");
fresh(2026, 11, 20);
const fut = hire("2026-12-01");
check("F1", "joins 1 Dec 2026: joinsOn says so; today and every earlier day is 'not-joined', nothing expected, nothing absent", EP.joinsOn(fut.id, "2026-11-20") === "2026-12-01" && A.dayFor(fut.id, "2026-11-20").status === "not-joined" && A.monthFor(fut.id, 2026, 11).days.every((d) => ["weekend", "holiday", "not-joined"].includes(d.status)), j(A.monthFor(fut.id, 2026, 11).counts));
const ref = A.checkInRefusal(fut.id, "office");
check("F2", "can't check in before the joining day (the old path's words)", ref && /before your joining date/.test(ref.error), ref?.error);
const ref2 = SP.shiftCheckInRefusal(fut.id, "office", { date: "2026-12-01", minutes: EN.toMin("09:00") });
const ref3 = SP.shiftCheckInRefusal(fut.id, "office", { date: "2026-11-30", minutes: EN.toMin("09:00") });
check("F3", "the shift path: refused the day before joining; and from the joining day on (the shift rules start 1 Dec) it opens at its window", /before your joining date/.test(ref3?.error ?? "") && ref2 === null, j([ref2, ref3?.error]));
check("F4", "no payroll row for the months before joining; the joining month pays from that day", P.payrollRunFor(fut.id, 2026, 11) === null && P.payrollRunFor(fut.id, 2026, 12) !== null);
check("F5", "a future joiner can't be asked for a correction for a day before joining", (() => { const r = A.requestRegularization(fut.id, { date: "2026-11-18", issue: "missed-check-in", time: "09:30", reason: "Forgot" }); return !r.ok; })());

// ---------- H ----------
section("H. No inherited history");
fresh(2026, 11, 20);
const hh = hire("2026-11-13");
check("H1", "no leave requests, corrections, approvals waiting, payslips before joining, no regularizations", L.requestsFor(hh.id).length === 0 && A.regularizationsFor(hh.id).length === 0 && P.payslipsFor(hh.id, "2026-11-20").every((s) => s.month >= "2026-11"), j([L.requestsFor(hh.id).length, A.regularizationsFor(hh.id).length]));
check("H2", "no sample employment record, salary history or expense claims of the seeded people leak in (their ids are not the new id)", !EP.isAppCreated("EMP-1105") && L.allRequests().every((r) => r.userId !== hh.id));
check("H3", "the leave policy's account has nothing taken, pending or carried: a clean start", (() => { const a = LP.leaveAccount(hh.id, "2026-11-20"); return Object.values(a.types).every((t) => t.taken === 0 && t.pending === 0 && t.carriedIn === 0); })());

// ---------- P ----------
section("P. The shift engine and overtime read nothing before joining");
fresh(2026, 12, 20);
const sh = hire("2026-12-10");
const dShift = SD.shiftMonthFor(sh.id, 2026, 12);
check("P1", "under the shift rules (from 1 Dec): days before 10 Dec are not-joined, no overtime, nothing absent, no loss of pay", dShift.days.filter((d) => d.date < "2026-12-10" && !["weekend", "weekly-off", "holiday"].includes(d.status)).every((d) => d.status === "not-joined" && d.overtimeMinutes === 0) && dShift.counts.notJoined > 0, j(dShift.counts));
check("P2", "...and the shift loss of pay counts only from the joining day (no day before 10 Dec is absent, so none is deducted)", (() => { const now = { date: "2027-01-20", minutes: 600 }; const m = SD.shiftMonthFor(sh.id, 2026, 12, now); const l = SD.shiftMonthLossOfPay(sh.id, 2026, 12, now); const after = m.days.filter((d) => d.date >= "2026-12-10" && d.status === "absent").length; return m.days.filter((d) => d.date < "2026-12-10").every((d) => d.status !== "absent") && l && l.absent === after; })());
check("P3", "no overtime for any date before joining", OT.overtimeDays(sh.id, "2026-12-01", "2026-12-09", EN.officeNow()).length === 0);

// ---------- L ----------
section("L. Leave: the policy engine from the first day for people created in the app");
fresh(2026, 11, 20);
const lv = hire("2026-11-02");
check("L1", "the leave policy starts 1 Dec 2026; a person created in the app is under it today (applyLeaveUnderPolicy checks the band's balance, not the flat 12 / 8 / 10)", SET.leavePolicyActive("2026-11-20") === false && (() => { const r = LP.applyLeaveUnderPolicy(lv.id, { type: "casual", from: "2026-11-23", to: "2026-11-26", duration: "full", reason: "Away" }); return !r.ok && r.code === LP.LOSS_OF_PAY; })());
const lv2 = LP.applyLeaveUnderPolicy(lv.id, { type: "casual", from: "2026-11-23", to: "2026-11-26", duration: "full", reason: "Away" }, { acceptLossOfPay: true });
check("L2", "beyond the band's balance only with the person's yes: recorded as under the policy with its loss-of-pay days (4 days asked, 2 accrued from the joining month: 2 unpaid)", lv2.ok && lv2.record.underPolicy === true && lv2.record.lopDays === 2, j(lv2.record && { u: lv2.record.underPolicy, lop: lv2.record.lopDays }));
L.decideLeave(lv2.record.id, PRIYA, "hr", "approve");
check("L3", "once approved, the loss of pay is deducted from the statutory start month (November), before the leave policy's own start month, for a person created in the app (the seeded people wait for December)", E.policyLossOfPayFrom() === "2026-12" && E.payFor(lv.id, 2026, 11).lop.policyDays === 2, String(E.payFor(lv.id, 2026, 11)?.lop.policyDays));
// a seeded person is unchanged until the start date: the flat allowance
const flat = LP.applyLeaveUnderPolicy("EMP-1105", { type: "casual", from: "2026-11-23", to: "2026-11-24", duration: "full", reason: "Away" });
check("L4", "a seeded person (Arjun) is as before: the flat policy until the start date (not underPolicy)", flat.ok && !flat.record.underPolicy, j(flat.record?.underPolicy));

// ---------- X ----------
section("X. After the last working day");
fresh(2026, 11, 20);
const lx = hire("2026-11-02");
S.deactivateUser(AARAV, lx.id, "2026-11-12");
const mx = A.monthFor(lx.id, 2026, 11);
check("X1", "days after 12 Nov read 'left': not expected, no record (the days they were employed and never punched stay absent)", mx.days.filter((d) => d.date > "2026-11-12" && !["weekend", "holiday"].includes(d.status)).every((d) => d.status === "left" && !d.expected && !d.recordId) && mx.days.filter((d) => d.date <= "2026-11-12" && d.date >= "2026-11-02" && d.status === "absent").length === 9, j(mx.counts));
check("X2", "the pay row is pro-rated after leaving (the days after the last working day are loss of pay)", (() => { const r = P.payrollRunFor(lx.id, 2026, 11); return r && r.lop.leftDays > 0 && (r.lop.notJoinedDays ?? 0) === 0; })());

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;