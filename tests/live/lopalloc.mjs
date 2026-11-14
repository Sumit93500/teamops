// usage: node lopalloc.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// P5-fix: which payroll month each unpaid (loss-of-pay) day of a policy leave request is charged to. ./js is the build.
//   G  the premise: the weekdays used here are working days, the weekends are off
//   F  the allocation (data/leave-policy.js lossOfPayDaysIn): each unpaid day is charged to the month it falls in, not to
//      the request's last month: unpaid days in both months, only in the first, only in the second, half days, a
//      fractional count, days off skipped (inside a month and across a month end); the months add up to the request's
//      lopDays; only approved requests count
//   P  in payroll (data/pay-engine.js payFor): each month deducts its own days at its own rate; leave starting before the
//      leave policy's start date has no loss of pay; days falling before the later of the two start months aren't deducted;
//      ESI eligibility stays on the full monthly salary while PF, professional tax and TDS follow the reduced pay
//   Z  an approved (frozen) month never changes: a later or backdated request into it isn't re-deducted (the leave record
//      still knows its days; the adjustment is Finance's, at the backend stage), and the next month doesn't pick them up
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
setNow(2026, 10, 30, 19);
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const S = await import("./js/data/store.js");
const PS = await import("./js/data/payroll-store.js");
const PAY = await import("./js/data/payroll.js");
const L = await import("./js/data/leave-store.js");
const LP = await import("./js/data/leave-policy.js");
const ST = await import("./js/data/pay-structure.js");
const E = await import("./js/data/pay-engine.js");
const RUNS = await import("./js/data/pay-runs.js");
const SET = await import("./js/data/pay-settings.js");
const HOL = await import("./js/data/holidays.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const AARAV = "EMP-1001", KABIR = "EMP-1008", ARJUN = "EMP-1105", ROHAN = "EMP-1042";
const rawEdit = (key, pick, change) => { const box = JSON.parse(mem.get(`officeos:${key}`)); box.records.filter(pick).forEach(change); mem.set(`officeos:${key}`, j(box)); };

// the seed made at the end of October, its pending items settled (as binding.mjs)
PS.payrollRun(2026, 10);
rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
S.updateUser(AARAV, "EMP-1088", { dateOfJoining: "8 Jan 2024" });
// an approved policy request written as the store keeps it (applyLeaveUnderPolicy's fields), for anyone
let seq = 9100;
const craft = (userId, from, to, lopDays, { duration = "full", status = "approved", type = "casual" } = {}) => {
  const box = JSON.parse(mem.get("officeos:leave-requests"));
  const id = `LV-${++seq}`;
  const policy = type === "unpaid" ? {} : { underPolicy: true, policyBand: "over1", lopDays };
  box.records.push({ id, userId, type, from, to, duration, days: 1, reason: "x", status, stage: "done", history: [], ...policy });
  mem.set("officeos:leave-requests", j(box));
  return id;
};
const inMonth = (id, y, m) => LP.lossOfPayDaysIn(id, y, m);
const months = (id, list) => list.map(([y, m]) => inMonth(id, y, m));

section("G. The premise");
const off = HOL.dayOffChecker();
const WORK = ["2026-11-30", "2026-12-01", "2026-12-02", "2026-12-04", "2026-12-07", "2026-12-30", "2026-12-31", "2027-01-04", "2027-01-05", "2027-01-29", "2027-02-01", "2027-04-28", "2027-04-29", "2027-04-30"];
const OFF = ["2026-12-05", "2026-12-06", "2027-01-30", "2027-01-31", "2027-05-01", "2027-05-02"];
check("G1", "the weekdays used are working days and the weekends off (else the expectations below are wrong)", WORK.every((d) => !off(d)) && OFF.every((d) => off(d)), j([WORK.filter(off), OFF.filter((d) => !off(d))]));

section("F. Each unpaid day is charged to the month it falls in");
// T01: Mon 30 Nov - Wed 2 Dec, all three days unpaid
const t1 = "EMP-T01"; craft(t1, "2026-11-30", "2026-12-02", 3);
check("F1", "unpaid days in both months: 30 Nov to November, 1 and 2 Dec to December (not all to the last month)", j(months(t1, [[2026, 11], [2026, 12]])) === j([1, 2]), j(months(t1, [[2026, 11], [2026, 12]])));
// T02: the same days, two unpaid: the last two working days, both in December
const t2 = "EMP-T02"; craft(t2, "2026-11-30", "2026-12-02", 2);
check("F2", "unpaid days only in the second month: the last two working days are 1 and 2 Dec; November gets none", j(months(t2, [[2026, 11], [2026, 12]])) === j([0, 2]));
// T03: Wed 28 Apr - Sun 2 May 2027, two unpaid: May's days are a weekend, so both unpaid days are in April
const t3 = "EMP-T03"; craft(t3, "2027-04-28", "2027-05-02", 2);
check("F3", "unpaid days only in the first month: the request ends on a weekend in May, so its last working days (29, 30 Apr) are April's", j(months(t3, [[2027, 4], [2027, 5]])) === j([2, 0]), j(months(t3, [[2027, 4], [2027, 5]])));
// T04: Fri 4 Dec - Mon 7 Dec, two unpaid: Saturday and Sunday are skipped, so the days are Fri 4 and Mon 7
const t4 = "EMP-T04"; craft(t4, "2026-12-04", "2026-12-07", 2);
check("F4", "days off skipped inside a month: Fri 4 and Mon 7 Dec are the two unpaid days (the weekend isn't counted)", inMonth(t4, 2026, 12) === 2);
const t4b = "EMP-T04B"; craft(t4b, "2026-12-04", "2026-12-07", 1);
const t4c = "EMP-T04C"; craft(t4c, "2026-12-04", "2026-12-07", 3);
check("F5", "...and they're working days: 1 unpaid day is Mon 7; 3 asked of a request with 2 working days charges 2, no more", inMonth(t4b, 2026, 12) === 1 && inMonth(t4c, 2026, 12) === 2, j([inMonth(t4b, 2026, 12), inMonth(t4c, 2026, 12)]));
// T05: Fri 29 Jan - Mon 1 Feb 2027, two unpaid across a weekend at the month end
const t5 = "EMP-T05"; craft(t5, "2027-01-29", "2027-02-01", 2);
check("F6", "days off skipped across a month end: Fri 29 Jan to January, Mon 1 Feb to February (30 and 31 Jan are a weekend)", j(months(t5, [[2027, 1], [2027, 2]])) === j([1, 1]), j(months(t5, [[2027, 1], [2027, 2]])));
// half days
const t6 = "EMP-T06"; craft(t6, "2026-12-31", "2026-12-31", 0.5, { duration: "first-half" });
check("F7", "a half-day request on 31 Dec: 0.5 to December, nothing to January", j(months(t6, [[2026, 12], [2027, 1]])) === j([0.5, 0]));
const t7 = "EMP-T07"; craft(t7, "2026-11-30", "2026-12-01", 1.5);
check("F8", "a fractional count (1.5 of two full days): the whole last day to December, the half to November", j(months(t7, [[2026, 11], [2026, 12]])) === j([0.5, 1]), j(months(t7, [[2026, 11], [2026, 12]])));
const t8 = "EMP-T08"; craft(t8, "2027-01-04", "2027-01-05", 1, { duration: "second-half" });
check("F9", "a two-day request of half days: 0.5 a day, the last two halves (1 day in all) in January", inMonth(t8, 2027, 1) === 1);
const t8b = "EMP-T08B"; craft(t8b, "2026-11-30", "2026-12-01", 1, { duration: "second-half" });
check("F9b", "half days across a month end: 0.5 to November and 0.5 to December (a half day is never charged as a whole one)", j(months(t8b, [[2026, 11], [2026, 12]])) === j([0.5, 0.5]), j(months(t8b, [[2026, 11], [2026, 12]])));
// the total
const all = [[2026, 11], [2026, 12], [2027, 1], [2027, 2], [2027, 3], [2027, 4], [2027, 5]];
const sum = (id) => months(id, all).reduce((a, b) => a + b, 0);
const total = [[t1, 3], [t2, 2], [t3, 2], [t4, 2], [t4b, 1], [t5, 2], [t6, 0.5], [t7, 1.5], [t8, 1], [t8b, 1]];
check("F10", "the months add up to each request's lopDays (no day charged twice, none lost)", total.every(([id, n]) => sum(id) === n), j(total.map(([id, n]) => [id, sum(id), n])));
const t9 = "EMP-T09";
craft(t9, "2026-12-01", "2026-12-02", 2, { status: "pending" }); craft(t9, "2026-12-01", "2026-12-02", 2, { status: "rejected" }); craft(t9, "2026-12-01", "2026-12-02", 2, { status: "cancelled" });
check("F11", "only approved requests count (pending, rejected and cancelled charge nothing)", inMonth(t9, 2026, 12) === 0);
const t10 = "EMP-T10"; craft(t10, "2026-11-30", "2026-12-02", 1); craft(t10, "2026-12-01", "2026-12-01", 1);
check("F12", "two requests in one month add up (the last day of each)", inMonth(t10, 2026, 12) === 2 && inMonth(t10, 2026, 11) === 0);

section("P. In payroll: each month deducts its own days");
// the leave policy's start date (1 Dec 2026): a request starting before it is under the flat rules, even where it runs into December
setNow(2026, 11, 25);
const flat = LP.applyLeaveUnderPolicy(ROHAN, { type: "casual", from: "2026-11-27", to: "2026-12-02", duration: "full", reason: "Trip" }, { acceptLossOfPay: true });
check("P1", "a request across the leave policy's start date (27 Nov - 2 Dec) is the flat rules' (it starts before): no policy fields, no loss of pay in either month", flat.ok && flat.record.underPolicy === undefined && flat.record.lopDays === undefined && inMonth(ROHAN, 2026, 11) === 0 && inMonth(ROHAN, 2026, 12) === 0, j([flat.error, flat.record?.underPolicy]));
rawEdit("leave-requests", (r) => r.id === flat.record?.id, (r) => { r.status = "cancelled"; });   // settled, so the runs below can be prepared
// Arjun: an approved request across the year end with unpaid days in both months (Wed 30 Dec - Tue 5 Jan)
setNow(2026, 12, 20);
craft(ARJUN, "2026-12-30", "2027-01-05", 4);
const decN = inMonth(ARJUN, 2026, 12), janN = inMonth(ARJUN, 2027, 1);
const lastFour = ["2027-01-05", "2027-01-04", "2027-01-03", "2027-01-02", "2027-01-01", "2026-12-31", "2026-12-30"].filter((d) => !off(d)).slice(0, 4);
check("P2", "the request's four unpaid days split by the month they fall in: " + lastFour.join(", "), decN === lastFour.filter((d) => d.startsWith("2026")).length && janN === lastFour.filter((d) => d.startsWith("2027")).length && decN + janN === 4 && decN > 0 && janN > 0, j([decN, janN]));
const dOld = PS.payrollRunFor(ARJUN, 2026, 12), dPay = E.payFor(ARJUN, 2026, 12);
const jOld = PS.payrollRunFor(ARJUN, 2027, 1), jPay = E.payFor(ARJUN, 2027, 1);
check("P3", "December deducts December's days at December's rate (monthly gross / its working days)", dPay.lop.policyDays === decN && dPay.lop.policyAmount === PAY.lossOfPayAmount(dOld.monthlyGross, decN, dOld.workingDays) && dPay.gross === dOld.gross - dPay.lop.policyAmount, j([dPay.lop, dOld.workingDays]));
check("P4", "January deducts January's days at January's rate", Boolean(jOld) && jPay.lop.policyDays === janN && jPay.lop.policyAmount === PAY.lossOfPayAmount(jOld.monthlyGross, janN, jOld.workingDays) && jPay.gross === jOld.gross - jPay.lop.policyAmount, j([jPay?.lop, jOld?.workingDays]));
// the pay rules' start month moved to January: the later of the two start months is January, so December's days aren't deducted
SET.setStatutoryFrom(AARAV, "2027-01");
const dPay2 = E.payFor(ARJUN, 2026, 12), jPay2 = E.payFor(ARJUN, 2027, 1);
check("P5", "pay rules from 2027-01: December (before the later start month) deducts no policy days; January still deducts only its own", E.policyLossOfPayFrom() === "2027-01" && dPay2.lop.policyDays === undefined && jPay2.lop.policyDays === janN, j([dPay2.lop, jPay2.lop]));
SET.resetPaySettings();
check("P6", "back to the defaults: from 2026-12, December deducts again", E.policyLossOfPayFrom() === "2026-12" && E.payFor(ARJUN, 2026, 12).lop.policyDays === decN);
// Rohan: a policy request across the pay start month boundary (Mon 30 Nov - Tue 1 Dec, both days unpaid). The pay rules
// start in November, the leave policy in December: November is before the later of the two, so only December deducts
craft(ROHAN, "2026-11-30", "2026-12-01", 2);
const rNov = E.payFor(ROHAN, 2026, 11), rDecOld = PS.payrollRunFor(ROHAN, 2026, 12);
check("P6b", "across the pay start month boundary: November (a new-rules month, before the leave policy's month) deducts none of its day; December deducts its own", rNov && rNov.lop.policyDays === undefined && inMonth(ROHAN, 2026, 11) === 1 && E.payFor(ROHAN, 2026, 12).lop.policyDays === 1, j([rNov?.lop, E.payFor(ROHAN, 2026, 12)?.lop]));
// with an unpaid-leave day already in December (the old rule), the policy day is still at the full monthly gross's daily rate
craft(ROHAN, "2026-12-08", "2026-12-08", 0, { type: "unpaid" });
const rOld = PS.payrollRunFor(ROHAN, 2026, 12), rPay = E.payFor(ROHAN, 2026, 12);
check("P6c", "the daily rate is the full monthly gross / working days, even when the month already lost a day to unpaid leave", rOld.lop.unpaidLeaveDays === 1 && rOld.gross < rOld.monthlyGross && rPay.lop.policyAmount === PAY.lossOfPayAmount(rOld.monthlyGross, 1, rOld.workingDays) && rPay.lop.days === 2, j([rOld.lop, rPay.lop, rOld.monthlyGross]));
rawEdit("leave-requests", (r) => r.userId === ROHAN && r.id.startsWith("LV-91"), (r) => { r.status = "cancelled"; });   // out of the runs below
// the rulings on what follows the reduced pay (pay-engine.js payMonth; the standard template)
const t = ST.payTemplate("standard");
const pm = (gross, monthlyGross, state) => E.payMonth({ gross, monthlyGross, template: t, state, year: 2026, month: 12 }).deductions;
check("P7", "ESI eligibility stays on the full contractual monthly salary: 15,000 paid of 22,000 has no ESI; of 20,000 it has", pm(15000, 22000, "Karnataka").esi === 0 && pm(15000, 20000, "Karnataka").esi > 0, j([pm(15000, 22000, "Karnataka").esi, pm(15000, 20000, "Karnataka").esi]));
check("P8", "PF follows the reduced pay (12% of the reduced wages)", pm(20000, 30000, "Karnataka").pf < pm(30000, 30000, "Karnataka").pf && pm(20000, 30000, "Karnataka").pf === pm(20000, 20000, "Karnataka").pf);
check("P9", "professional tax follows the month's reduced gross (Karnataka: 20,000 paid of 30,000 pays none; Maharashtra 8,000 pays the lower slab)", pm(20000, 30000, "Karnataka").pt === 0 && pm(30000, 30000, "Karnataka").pt > 0 && pm(8000, 30000, "Maharashtra").pt < pm(30000, 30000, "Maharashtra").pt, j([pm(20000, 30000, "Karnataka").pt, pm(8000, 30000, "Maharashtra").pt]));
check("P10", "TDS follows the reduced pay: a month with loss of pay takes no more tax than the same month without", dPay.deductions.tds <= E.payMonth({ gross: dOld.gross, monthlyGross: dOld.monthlyGross, template: ST.payTemplate(ST.structureOf(ARJUN).templateId), state: "Karnataka", year: 2026, month: 12 }).deductions.tds);

section("Z. An approved month is never changed");
setNow(2027, 1, 8);
const steps = [[2026, 10], [2026, 11], [2026, 12]].map(([y, m]) => [RUNS.prepareRunWithSnapshot(KABIR, y, m), RUNS.approveRunWithSnapshot(AARAV, y, m)]).flat();
check("Z1", "October, November and December prepared and approved (December frozen in a snapshot)", steps.every((s) => s.ok) && RUNS.payForFinal(ARJUN, 2026, 12).final === true, j(steps.filter((s) => !s.ok).map((s) => s.error)));
const decFrozen = j(RUNS.payForFinal(ARJUN, 2026, 12).pay), decEngine = j(E.payFor(ARJUN, 2026, 12)), janLive = j(E.payFor(ARJUN, 2027, 1));
// a backdated request into December, approved after December's run was approved (written as the store keeps it)
craft(ARJUN, "2026-12-14", "2026-12-15", 2);
check("Z2", "a backdated request into the approved December: the leave record knows its days (December now has 2 more)", inMonth(ARJUN, 2026, 12) === decN + 2);
check("Z3", "...but December's pay is unchanged, to the byte: not re-deducted automatically (a Finance adjustment, at the backend stage)", j(RUNS.payForFinal(ARJUN, 2026, 12).pay) === decFrozen && j(E.payFor(ARJUN, 2026, 12)) === decEngine);
check("Z4", "...and January doesn't pick December's days up (its own days only; its year so far from December's frozen figures)", j(E.payFor(ARJUN, 2027, 1)) === janLive && E.payFor(ARJUN, 2027, 1).lop.policyDays === janN);
// a later request into January (not approved): January is live and changes
craft(ARJUN, "2027-01-11", "2027-01-11", 1);
check("Z5", "a later request into January (live, a draft) is deducted there; December still unchanged", E.payFor(ARJUN, 2027, 1).lop.policyDays === janN + 1 && j(RUNS.payForFinal(ARJUN, 2026, 12).pay) === decFrozen);
check("Z6", "the approved month's snapshot still can't be rewritten (prepare again is refused)", !RUNS.prepareRunWithSnapshot(KABIR, 2026, 12).ok || j(RUNS.payForFinal(ARJUN, 2026, 12).pay) === decFrozen);

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;