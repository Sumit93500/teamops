// usage: node leavebands.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// P3: leave by tenure (data/leave-policy.js). Data only: data/leave-store.js's balances and checks are as before (K).
// ./js is the build. Clock Tue 6 Oct 2026, 10:00 local.
//   A  the policy: the sample numbers per band, WFH 4 a month for all, the statutory notes
//   B  tenureBand: intern always, the exact move-up day, a 29 Feb joiner, no joining date, bad input
//   C  pro-rating and monthly accrual: the 15th rule, a mid-month joiner, accrual over the months
//   D  earned leave: 1 per 20 days worked, unpaid leave not worked, usable 6 months after joining
//   E  the accounts of the seeded people; loss of pay when a balance is exhausted; a request's outcome
//   F  closing a leave year: carry-forward cap 30, encashment above 30 over a year, interns nothing, once only
//   G  the Admin edits a band (four roles + a manager), the audit, reset
//   K  nothing existing changed
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
NOW = new RealDate(2026, 9, 6, 10, 0, 0).getTime();
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const LP = await import("./js/data/leave-policy.js");
const S = await import("./js/data/store.js");
const L = await import("./js/data/leave-store.js");
console.log(`TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const PEOPLE = { admin: "EMP-1001", hr: "EMP-1003", fin: "EMP-1008", emp: "EMP-1105", manager: "EMP-1029" };
const ROLES5 = ["admin", "hr", "fin", "emp", "manager"];
const ARJUN = "EMP-1105", ROHAN = "EMP-1042", MEERA = "EMP-1023", ANANYA = "EMP-1017";
const T = (id, d = "2026-10-06") => LP.leaveAccount(id, d).types;
const policyBefore = j(L.LEAVE_POLICY);

section("A. The policy");
const pol = LP.leavePolicy();
const pick = (x) => [x.accrual, x.amount, x.per, x.usableAfterMonths, x.carryForwardMax, x.encashAbove];
check("A1", "interns: casual 1 a month, no sick, no earned, no carry-forward", j(["casual", "sick", "earned"].map((t) => pick(pol.intern[t]))) === j([["perMonth", 1, null, 0, 0, null], ["none", 0, null, 0, 0, null], ["none", 0, null, 0, 0, null]]));
check("A2", "under 1 year: casual 12 and sick 8 a year (pro-rated), earned 1 per 20 days usable after 6 months, carry up to 30, no encashment", j(["casual", "sick", "earned"].map((t) => pick(pol.under1[t]))) === j([["perYear", 12, null, 0, 0, null], ["perYear", 8, null, 0, 0, null], ["per20Days", 1, 20, 6, 30, null]]));
check("A3", "over 1 year: casual 12, sick 8, earned 1 per 20 days, carry up to 30, encash above 30", j(["casual", "sick", "earned"].map((t) => pick(pol.over1[t]))) === j([["perYear", 12, null, 0, 0, null], ["perYear", 8, null, 0, 0, null], ["per20Days", 1, 20, 0, 30, 30]]));
check("A4", "work from home 4 a month and unpaid unlimited in every band (unchanged)", LP.LEAVE_BANDS.every((b) => j(pick(pol[b].wfh)) === j(["perMonthReset", 4, null, 0, 0, null]) && pol[b].unpaid.accrual === "unlimited") && L.LEAVE_POLICY.wfh.allowance === 4);
check("A5", "statutory notes: the OSH Code's annual leave is a note, not enforced, with its source", LP.STATUTORY_NOTES.every((n) => n.enforced === false) && LP.STATUTORY_NOTES[0].key === "osh-annual-leave" && LP.STATUTORY_NOTES[0].source.startsWith("https://"));
check("A6", "nothing saved by reading", !mem.has("officeos:leave-policy"));

section("B. The band");
check("B1", "the seed's bands on 6 Oct 2026: interns Ananya and Divya; under a year Meera and Rohan; the other six over a year", j(S.getAllUsers().map((u) => [u.id, LP.tenureBand(u.id, "2026-10-06")])) === j([["EMP-1001", "over1"], ["EMP-1003", "over1"], ["EMP-1008", "over1"], [ANANYA, "intern"], [MEERA, "under1"], ["EMP-1029", "over1"], [ROHAN, "under1"], ["EMP-1061", "intern"], ["EMP-1088", "over1"], [ARJUN, "over1"]]));
check("B2", "the exact move-up day: Rohan (joined 2 Feb 2026) is under1 on 1 Feb 2027 and over1 on 2 Feb 2027", j(["2026-02-02", "2027-02-01", "2027-02-02", "2027-02-03"].map((d) => LP.tenureBand(ROHAN, d))) === j(["under1", "under1", "over1", "over1"]) && LP.anniversaryOf("2026-02-02") === "2027-02-02");
check("B3", "Meera (16 Mar 2026): under1 on 15 Mar 2027, over1 on 16 Mar 2027", LP.tenureBand(MEERA, "2027-03-15") === "under1" && LP.tenureBand(MEERA, "2027-03-16") === "over1");
check("B4", "an intern stays an intern after years", LP.tenureBand(ANANYA, "2030-01-01") === "intern" && LP.tenureBand("EMP-1061", "2026-10-06") === "intern");
check("B5", "a 29 Feb joiner's anniversary is 28 Feb the next year; 31 Jan works as itself", LP.anniversaryOf("2028-02-29") === "2029-02-28" && LP.anniversaryOf("2026-01-31") === "2027-01-31" && LP.anniversaryOf("2026-02-30") === null);
const none = S.addUser(PEOPLE.admin, { name: "Omar Sheikh", email: "omar.sheikh@northwind.com", department: "SAL", designation: "Sales Executive", role: "emp" });
check("B6", "no joining date on file: over1 (the flat policy's band)", none.ok && LP.tenureBand(none.record.id, "2026-10-06") === "over1");
check("B7", "an unknown person, a bad date: null", LP.tenureBand("EMP-9999", "2026-10-06") === null && LP.tenureBand(ARJUN, "2026-13-01") === null && LP.tenureBand(ARJUN, null) === null && LP.leaveAccount("EMP-9999", "2026-10-06") === null);
check("B8", "a user record or an id give the same band", LP.tenureBand(S.getUser(ROHAN), "2027-02-02") === "over1");
const u = S.updateUser(PEOPLE.admin, ROHAN, { employmentType: "Intern" });
check("B9", "the band follows the profile: Rohan made an intern on his record is an intern", u.ok && LP.tenureBand(ROHAN, "2026-10-06") === "intern");
S.updateUser(PEOPLE.admin, ROHAN, { employmentType: "" });

section("C. Pro-rating and monthly accrual");
check("C1", "the 15th rule: a joiner on the 15th gets that month, on the 16th not", LP.monthsCounted("2026-03-15", 2026) === 10 && LP.monthsCounted("2026-03-16", 2026) === 9 && LP.monthsCounted(null, 2026) === 12 && LP.monthsCounted("2025-06-01", 2026) === 12 && LP.monthsCounted("2027-01-01", 2026) === 0);
check("C2", "Meera (16 Mar 2026, under1): casual 9 (12 x 9/12), sick 6", T(MEERA).casual.entitled === 9 && T(MEERA).sick.entitled === 6);
check("C3", "Rohan (2 Feb 2026): 11 months: casual 11, sick 7.33 rounded down to the half day: 7", T(ROHAN).casual.entitled === 11 && T(ROHAN).sick.entitled === 7);
const hire = (name, date, type = "Full-time") => S.addUser(PEOPLE.admin, { name, email: `${name.toLowerCase().replace(" ", ".")}@northwind.com`, department: "ENG", designation: "Software Engineer", role: "emp", dateOfJoining: date, employmentType: type });
const mid = hire("Kiran Das", "20 Jul 2026"), intern = hire("Lata Roy", "10 Aug 2026", "Intern");
check("C4", "a mid-month joiner (20 Jul 2026): July doesn't count: casual 5 (Aug-Dec), sick 3 (3.33 down)", mid.ok && T(mid.record.id).casual.entitled === 5 && T(mid.record.id).sick.entitled === 3, j(mid.error ?? T(mid.record.id).casual));
const li = intern.record?.id;
check("C5", "an intern from 10 Aug 2026 accrues 1 casual a month: 1 in August, 2 in September, 3 on 6 October, 5 in December", intern.ok && j(["2026-08-20", "2026-09-30", "2026-10-06", "2026-12-31"].map((d) => T(li, d).casual.entitled)) === j([1, 2, 3, 5]), j(intern.error));
check("C6", "accrual over the months: Ananya (intern from 5 Jan 2026) has 1 in January, 10 on 6 October, 12 in December; in 2027 it starts again at 1", j(["2026-01-05", "2026-10-06", "2026-12-31", "2027-01-31"].map((d) => T(ANANYA, d).casual.entitled)) === j([1, 10, 12, 1]));
check("C7", "an intern has no sick or earned leave at any time", T(ANANYA).sick.entitled === 0 && T(ANANYA).earned.entitled === 0 && T(ANANYA, "2026-12-31").earned.usable === 0);
check("C8", "over a year, the full year from 1 January: casual 12, sick 8", T(ARJUN, "2026-01-02").casual.entitled === 12 && T(ARJUN, "2026-01-02").sick.entitled === 8);

section("D. Earned leave");
const work = (from, to) => LP.daysWorked(ARJUN, from, to);
check("D1", "days worked: the working days (no weekend, no holiday); 1-30 Oct 2026 as the leave store counts them; a full week is 5, a weekend 0", work("2026-10-01", "2026-10-30") === L.workingDays("2026-10-01", "2026-10-30") && work("2026-10-05", "2026-10-09") === 5 && work("2026-10-10", "2026-10-11") === 0, work("2026-10-01", "2026-10-30"));
check("D2", "earned is 1 per 20 days worked in the year: Arjun on 6 Oct 2026 (over1) has floor(days / 20)", T(ARJUN).earned.entitled === Math.floor(work("2026-01-01", "2026-10-06") / 20) && T(ARJUN).earned.entitled === 9, T(ARJUN).earned.entitled);
check("D3", "the exact 20th day: on the day worked days reach 20, earned goes 0 -> 1", (() => { let d = "2026-01-01", prev = 0; for (let i = 0; i < 40; i++) { const n = T(ARJUN, d).earned.entitled; const w = work("2026-01-01", d); if (n !== Math.floor(w / 20)) return false; if (n === 1 && prev === 0 && w !== 20) return false; prev = n; d = new RealDate(Date.UTC(2026, 0, 2 + i)).toISOString().slice(0, 10); } return true; })());
check("D4", "under a year it accrues from joining: Rohan from 2 Feb 2026", T(ROHAN).earned.entitled === Math.floor(LP.daysWorked(ROHAN, "2026-02-02", "2026-10-06") / 20));
check("D5", "usable after 6 months: Rohan's earned is usable from 2 Aug 2026; on 1 Aug 0 is usable though some has accrued", T(ROHAN, "2026-08-01").earned.usable === 0 && T(ROHAN, "2026-08-01").earned.entitled > 0 && T(ROHAN, "2026-08-02").earned.usable === T(ROHAN, "2026-08-02").earned.entitled && T(ROHAN, "2026-08-01").earned.usableFrom === "2026-08-02");
check("D6", "a 31 Aug joiner's six months end on 28 Feb (the month's last day)", (() => { const h = hire("Mohan Lal", "31 Aug 2026"); return h.ok && T(h.record.id, "2027-02-27").earned.usableFrom === "2027-02-28"; })());
check("D7", "over a year there's no waiting: usable = entitled", T(ARJUN).earned.usable === T(ARJUN).earned.entitled && T(ARJUN).earned.usableFrom === undefined);
const lv = L.applyLeave(ARJUN, { type: "unpaid", from: "2026-10-12", to: "2026-10-16", duration: "full", reason: "Personal work" });
const ok = lv.ok && L.decideLeave(lv.record.id, PEOPLE.manager, "emp", "approve").ok && L.decideLeave(lv.record.id, PEOPLE.hr, "hr", "approve").ok;
check("D8", "approved unpaid leave isn't days worked: 5 days of it take 5 off", ok && work("2026-10-12", "2026-10-16") === 0 && work("2026-10-01", "2026-10-30") === L.workingDays("2026-10-01", "2026-10-30") - 5, j(lv.error));
check("D9", "paid leave counts as worked: Arjun's 2 casual days in May still count", work("2026-05-14", "2026-05-15") === 2);

section("E. Accounts and loss of pay");
const meera = T(MEERA).earned;
check("E1", "Meera (under1) took 9 earned days (21 Sep - 1 Oct) but has 7 usable (from 16 Sep): 2 days are loss of pay", meera.taken === 9 && meera.entitled === 7 && meera.usable === 7 && meera.left === 0 && meera.lop === 2 && LP.leaveAccount(MEERA, "2026-10-06").lop === 2, j(meera));
const arj = T(ARJUN);
check("E2", "Arjun's casual and sick: 2 taken each of 12 and 8: 10 and 6 left, no loss of pay", j([arj.casual.taken, arj.casual.left, arj.sick.taken, arj.sick.left, arj.casual.lop]) === j([2, 10, 2, 6, 0]));
check("E3", "the account shows band, joining date, type, and each type's working: entitled, carried in, taken, pending, available, usable, left, loss of pay", (() => { const a = LP.leaveAccount(ROHAN, "2026-10-06"); return a.band === "under1" && a.joiningDate === "2026-02-02" && a.employmentType === "Full-time" && j(Object.keys(a.types.casual)) === j(["type", "band", "accrual", "entitled", "carriedIn", "taken", "pending", "available", "usable", "left", "lop"]); })());
check("E4", "unpaid leave: no limit (null), never loss of pay by the balance", T(ARJUN).unpaid.entitled === null && T(ARJUN).unpaid.taken === 5 && T(ARJUN).unpaid.lop === 0);
check("E5", "work from home: 4 a month in every band", [ARJUN, ROHAN, ANANYA].every((id) => T(id).wfh.entitled === 4));
check("E6", "a request's outcome: Rohan has 11 casual days, 3 of them asked for already (pending): 12 more gives 8 paid and 4 loss of pay; 3 days: all paid", T(ROHAN).casual.pending === 3 && j(LP.requestOutcome(ROHAN, "casual", 12, "2026-10-06")) === j({ paid: 8, lop: 4 }) && j(LP.requestOutcome(ROHAN, "casual", 3, "2026-10-06")) === j({ paid: 3, lop: 0 }));
check("E7", "an intern asking for sick leave: all of it is loss of pay; unpaid leave is just unpaid; bad input null", j(LP.requestOutcome(ANANYA, "sick", 2, "2026-10-06")) === j({ paid: 0, lop: 2 }) && j(LP.requestOutcome(ANANYA, "unpaid", 2, "2026-10-06")) === j({ paid: 2, lop: 0 }) && LP.requestOutcome(ANANYA, "bonus", 2, "2026-10-06") === null && LP.requestOutcome(ANANYA, "sick", 0, "2026-10-06") === null);
check("E8", "Rohan's earned before it is usable: a request on 1 Aug is all loss of pay", j(LP.requestOutcome(ROHAN, "earned", 2, "2026-08-01")) === j({ paid: 0, lop: 2 }));
const pend = L.applyLeave(ROHAN, { type: "casual", from: "2026-10-19", to: "2026-10-23", duration: "full", reason: "Trip" });
check("E9", "4 more pending (19-23 Oct has a holiday): 7 of 11 asked for, so a 7-day request: 4 paid, 3 loss of pay", pend.ok && pend.record.days === 4 && T(ROHAN).casual.pending === 7 && j(LP.requestOutcome(ROHAN, "casual", 7, "2026-10-06")) === j({ paid: 4, lop: 3 }), j(pend.error));

section("F. Closing a leave year");
const who = Object.fromEntries(ROLES5.filter((k) => k !== "admin").map((k) => [k, LP.closeLeaveYear(PEOPLE[k], 2026, "2027-01-02").ok]));
check("F1", "HR, Finance, an employee and a manager can't close a year", Object.values(who).every((x) => x === false) && !mem.has("officeos:leave-policy"));
check("F2", "a year that hasn't ended can't be closed (on 31 Dec it hasn't)", LP.closeLeaveYear(PEOPLE.admin, 2026, "2026-12-31").error === "2026 hasn't ended yet." && LP.closeLeaveYear(PEOPLE.admin, 2026.5, "2027-01-02").field === "year");
const c = LP.closeLeaveYear(PEOPLE.admin, 2026, "2027-01-02");
const row = (id) => c.record.rows[id];
const arjEnd = LP.leaveAccount(ARJUN, "2026-12-31").types.earned;
check("F3", "2026 closed by the Admin: who and when are kept", c.ok && j([c.record.closedBy, c.record.closedByName, c.record.closedOn]) === j(["EMP-1001", "Aarav Mehta", "2027-01-02"]));
check("F4", "Arjun (over1): his earned left on 31 Dec is carried (under 30: nothing encashed)", j(row(ARJUN)) === j({ band: "over1", earnedLeft: arjEnd.available - arjEnd.taken, carried: arjEnd.available - arjEnd.taken, encashed: 0, lapsed: 0 }) && row(ARJUN).carried > 9, j(row(ARJUN)));
const meeraEnd = LP.leaveAccount(MEERA, "2026-12-31").types.earned;
check("F5", "interns carry nothing; Meera (under1) carries what she has left on 31 Dec after the 9 she took, not encashed", j(row(ANANYA)) === j({ band: "intern", earnedLeft: 0, carried: 0, encashed: 0, lapsed: 0 }) && row(MEERA).earnedLeft === Math.max(0, meeraEnd.available - 9) && row(MEERA).carried === row(MEERA).earnedLeft && row(MEERA).encashed === 0, j([row(MEERA), meeraEnd.available]));
check("F6", "carried in: Arjun's 2027 earned starts with what 2026 carried, and accrues on top", T(ARJUN, "2027-01-04").earned.carriedIn === row(ARJUN).carried && T(ARJUN, "2027-01-04").earned.available === row(ARJUN).carried + T(ARJUN, "2027-01-04").earned.entitled);
check("F7", "once only", LP.closeLeaveYear(PEOPLE.admin, 2026, "2027-01-05").error === "2026 is already closed." && LP.yearClose(2026).closedOn === "2027-01-02" && LP.yearClose(2025) === null);
// a long-serving person with a big balance: give them 2025's close with 25 carried, then 2026 accrues on top
const box = JSON.parse(mem.get("officeos:leave-policy"));
box.closes[2025] = { closedBy: "EMP-1001", closedByName: "Aarav Mehta", closedOn: "2026-01-02", rows: { "EMP-1003": { band: "over1", earnedLeft: 25, carried: 25, encashed: 0, lapsed: 0 }, [ROHAN]: { band: "under1", earnedLeft: 0, carried: 0, encashed: 0, lapsed: 0 } } };
delete box.closes[2026];
mem.set("officeos:leave-policy", j(box));
const c2 = LP.closeLeaveYear(PEOPLE.admin, 2026, "2027-01-02");
const priya = c2.record.rows["EMP-1003"], priyaEnd = LP.leaveAccount("EMP-1003", "2026-12-31").types.earned;
check("F8", "over a year with 25 carried in: 25 + the year's accrual, capped at 30 carried; the rest encashed, nothing lapses", c2.ok && priya.earnedLeft === 25 + priyaEnd.entitled && priya.carried === 30 && priya.encashed === priya.earnedLeft - 30 && priya.lapsed === 0, j(priya));
const box2 = JSON.parse(mem.get("officeos:leave-policy"));
box2.closes[2025].rows[ROHAN] = { band: "under1", earnedLeft: 28, carried: 28, encashed: 0, lapsed: 0 };
delete box2.closes[2026];
mem.set("officeos:leave-policy", j(box2));
const c3 = LP.closeLeaveYear(PEOPLE.admin, 2026, "2027-03-01");   // closed after Rohan's anniversary: his band on 31 Dec decides
check("F9", "under a year on 31 Dec 2026 (Rohan; closed on 1 Mar 2027, when he is over a year) with more than 30: 30 carried, nothing encashed, the rest lapses", c3.ok && c3.record.rows[ROHAN].band === "under1" && c3.record.rows[ROHAN].carried === 30 && c3.record.rows[ROHAN].encashed === 0 && c3.record.rows[ROHAN].lapsed === c3.record.rows[ROHAN].earnedLeft - 30 && c3.record.rows[ROHAN].earnedLeft > 30, j(c3.record?.rows[ROHAN]));
check("F10", "people who joined after the year are left out (Lata: no; a joiner of 2027 would be)", c3.record.rows[li] !== undefined && Object.keys(c3.record.rows).length === S.getAllUsers().length);
check("F11", "casual and sick are not carried: 2027 starts at the year's allowance", T(ARJUN, "2027-01-04").casual.entitled === 12 && T(ARJUN, "2027-01-04").casual.carriedIn === 0);

section("G. The Admin edits a band");
const tries = Object.fromEntries(ROLES5.map((k) => [k, LP.updateLeavePolicy(PEOPLE[k], "intern", "casual", { amount: 1.5 }, "2026-10-06").ok]));
check("G1", "only the Admin: HR, Finance, an employee and a manager are refused", j(tries) === j({ admin: true, hr: false, fin: false, emp: false, manager: false }), j(tries));
check("G2", "interns now accrue 1.5 a month: Ananya has 15 on 6 Oct; the seed is unchanged", T(ANANYA).casual.entitled === 15 && LP.LEAVE_POLICY_SEED.intern.casual.amount === 1);
const bad = (band, type, ch) => LP.updateLeavePolicy(PEOPLE.admin, band, type, ch);
check("G3", "refused: an unknown band or type, unpaid, a field that can't change, a quarter day, a negative, per 0, nothing", j([bad("gold", "casual", { amount: 1 }).field, bad("intern", "bonus", { amount: 1 }).field, bad("intern", "unpaid", { amount: 1 }).field, bad("intern", "casual", { accrual: "none" }).field, bad("intern", "casual", { amount: 1.25 }).field, bad("intern", "casual", { amount: -1 }).field, bad("over1", "earned", { per: 0 }).field, bad("over1", "earned", {}).ok]) === j(["band", "type", "type", "accrual", "amount", "amount", "per", false]));
check("G4", "earned per 10 days over a year doubles Arjun's accrual; encashAbove null switches encashment off", bad("over1", "earned", { per: 10 }).ok && T(ARJUN).earned.entitled === Math.floor(work("2026-01-01", "2026-10-06") / 10) && bad("over1", "earned", { encashAbove: null }).ok && LP.bandPolicy("over1").earned.encashAbove === null);
check("G5", "under1's usable-after to 3 months: Rohan's earned is usable from 2 May 2026", bad("under1", "earned", { usableAfterMonths: 3 }).ok && T(ROHAN, "2026-05-02").earned.usable > 0 && T(ROHAN, "2026-05-01").earned.usable === 0);
const audit = LP.leavePolicyAudit();
check("G6", "every change and close is in the audit: who, what", j(audit.map((a) => a.action)) === j(["close-year", "close-year", "close-year", "policy", "policy", "policy", "policy"]) && audit.every((a) => a.by === "EMP-1001") && j(audit[3].changes) === j({ amount: 1.5 }), j(audit.map((a) => a.action)));
const users = JSON.parse(mem.get("officeos:users"));
users.records.find((x) => x.id === PEOPLE.admin).status = "inactive";
mem.set("officeos:users", j(users));
check("G7", "an inactive Admin can't; a stored grant doesn't give the permission", !bad("intern", "casual", { amount: 2 }).ok && !LP.holdsLeavePolicyPermission({ ...S.getUser(PEOPLE.hr), grantPermissions: ["leave-policy:edit"] }, "leave-policy:edit") && j(LP.LEAVE_POLICY_GRANTS) === j({ admin: ["leave-policy:edit"], hr: [], fin: [], emp: [] }));
users.records.find((x) => x.id === PEOPLE.admin).status = "active";
mem.set("officeos:users", j(users));
LP.resetLeavePolicy();
check("G8", "reset: the seed is back, no closes, no audit", !mem.has("officeos:leave-policy") && T(ANANYA).casual.entitled === 10 && LP.yearClose(2026) === null && LP.leavePolicyAudit().length === 0);

section("K. Nothing existing changed");
check("K1", "data/leave-store.js's flat policy is as it was (casual 12, sick 8, earned 10 a year, WFH 4 a month, unpaid unlimited)", j(L.LEAVE_POLICY) === policyBefore && j(L.LEAVE_POLICY) === j({ casual: { label: "Casual leave", allowance: 12, per: "year" }, sick: { label: "Sick leave", allowance: 8, per: "year" }, earned: { label: "Earned leave", allowance: 10, per: "year" }, wfh: { label: "Work from home", allowance: 4, per: "month" }, unpaid: { label: "Unpaid leave", allowance: null, per: "year" } }));
check("K2", "Meera's existing balance still says earned 10, 9 taken, 1 left (the old pages are unchanged)", j(L.balanceFor(MEERA, 2026, 10).earned) === j({ allowance: 10, approved: 9, pending: 0, left: 1 }));
check("K3", "the existing applyLeave still checks the flat allowance: an intern can still ask for sick leave", (() => { const r = L.applyLeave(ANANYA, { type: "sick", from: "2026-10-26", to: "2026-10-26", duration: "full", reason: "Fever" }); return r.ok; })());

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);