// usage: node visitnone.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// CV1c: an approved visit day nobody checked in on (data/visit-days.js, data/visits.js completeVisitDay and visitDaysNoCheckIn).
//   A  before HR acts: an absence in the current rules, "Visit not started" under the shift rules (not absent); the flag's list: who sees it, what is in it
//   B  HR / an Admin completes it: full or half, a reason, audit-logged; who may not (a manager, an employee, their own visit); what is refused
//   C  after: present (or half) in the current rules, on-site (or half) under the shift rules; the month's counts, pay, the month end
//   D  nothing else moved: a person with no visit, a day with a punch, the stored records; reads write nothing
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const S = await import("./js/data/store.js");
const A = await import("./js/data/attendance-store.js");
const V = await import("./js/data/visits.js");
const VS = await import("./js/data/visits-store.js");
const SD = await import("./js/data/shift-days.js");
const P = await import("./js/data/payroll-store.js");
const AU = await import("./js/data/audit-trail.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(6)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const ADMIN = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", SNEHA = "EMP-1029", ARJUN = "EMP-1105", ROHAN = "EMP-1042";
const clock = (date, hm) => { const [y, m, d] = date.split("-").map(Number); const [h, mi] = hm.split(":").map(Number); NOW = RealDate.UTC(y, m - 1, d, h, mi) - 330 * 60000; return { date, minutes: h * 60 + mi }; };
const fresh = (date, hm = "10:00") => { mem.clear(); const n = clock(date, hm); A.monthFor(ADMIN, Number(date.slice(0, 4)), Number(date.slice(5, 7))); return n; };
const FIELDS = { kind: "client", siteName: "Acme Corp, Pune", purpose: "Quarterly review with the client", address: "Baner Road, Pune" };
const hire = (tag) => { S.addUser(ADMIN, { name: "Nia Hart", email: `nia.${tag}@northwind.com`, department: "ENG", designation: "Software Engineer", role: "emp", dateOfJoining: "2 Nov 2026", employmentType: "Full-time" }); const id = S.getAllUsers().find((u) => u.email === `nia.${tag}@northwind.com`).id; P.setSalary(ADMIN, id, { gross: 62000, effectiveFrom: "2026-01-01" }); return id; };
// an approved visit for `who` on the dates (approved by Priya, HR, the day it is asked for)
const approved = (who, from, to, askedOn, by = PRIYA) => { const now = clock(askedOn, "10:00"); const r = V.requestVisit(who, { ...FIELDS, fromDate: from, toDate: to }, now); const d = V.decideVisit(by, r.record.id, "approved", "", now); return r.ok && d.ok ? r.record.id : null; };
const GPS = { lat: 19.076, lng: 72.8777, accuracyM: 20 };
const auditKinds = () => AU.allEvents().map((e) => e.kind);
const absentDays = (id, y, m) => A.monthFor(id, y, m).counts.absent;
const lop = (id, y, m) => P.payrollRunFor(id, y, m).lop;

// ---------- A: before HR acts ----------
section("A. Before HR acts");
{ fresh("2026-11-20"); const NH = hire("a"); const id = approved(NH, "2026-11-24", "2026-11-24", "2026-11-20");
  clock("2026-12-10", "10:00");
  const d = A.dayFor(NH, "2026-11-24"), run = lop(NH, 2026, 11);
  check("A1", "the visit was approved with nothing punched", Boolean(id) && VS.getVisit(id).status === "approved" && !VS.getVisit(id).days["2026-11-24"]);
  check("A2", "current rules: the day is an absence, as for any day with no check-in", d.status === "absent" && !d.onSite && absentDays(NH, 2026, 11) >= 1, d.status);
  check("A3", "...and pay charges it once its correction window has closed (the control the rest compare with)", run.absenceDays >= 1, j(run));
  const flag = V.visitDaysNoCheckIn(PRIYA, clock("2026-12-10", "10:00"));
  check("A4", "HR's flag lists it: the person, the place, the day, the visit", flag.length === 1 && flag[0].personId === NH && flag[0].siteName === FIELDS.siteName && flag[0].date === "2026-11-24" && flag[0].visitId === id && flag[0].name === "Nia Hart", j(flag));
  check("A5", "the Admin sees the same list", j(V.visitDaysNoCheckIn(ADMIN, clock("2026-12-10", "10:00"))) === j(flag));
  check("A6", "a manager (Sneha), a finance person (Kabir) and an employee get no list", V.visitDaysNoCheckIn(SNEHA).length === 0 && V.visitDaysNoCheckIn(KABIR).length === 0 && V.visitDaysNoCheckIn(ARJUN).length === 0 && V.visitDaysNoCheckIn("EMP-9999").length === 0);
  check("A7", "today's visit day is not on the list yet (the day isn't over), the next morning it is", (() => { fresh("2026-11-20"); const n = hire("a7"); approved(n, "2026-11-24", "2026-11-24", "2026-11-20"); const t = V.visitDaysNoCheckIn(PRIYA, clock("2026-11-24", "23:30")).length; const nx = V.visitDaysNoCheckIn(PRIYA, clock("2026-11-25", "08:00")).length; return t === 0 && nx === 1; })());
  check("A8", "a person's own visit is not on their own list: the Admin's visit shows for HR, not for the Admin", (() => { fresh("2026-11-20"); const id2 = approved(ADMIN, "2026-11-24", "2026-11-24", "2026-11-20", PRIYA); const now = clock("2026-11-26", "10:00"); return Boolean(id2) && V.visitDaysNoCheckIn(ADMIN, now).length === 0 && V.visitDaysNoCheckIn(PRIYA, now).length === 1; })());
  check("A9", "a pending, a rejected and a cancelled visit are not on the list", (() => { fresh("2026-11-20"); const n = hire("a9"); const now = clock("2026-11-20", "10:00");
    const a = V.requestVisit(n, { ...FIELDS, fromDate: "2026-11-23", toDate: "2026-11-23" }, now).record.id;   // stays pending
    const b = V.requestVisit(n, { ...FIELDS, fromDate: "2026-11-24", toDate: "2026-11-24" }, now).record.id; V.decideVisit(PRIYA, b, "rejected", "Not needed", now);
    const c = V.requestVisit(n, { ...FIELDS, fromDate: "2026-11-25", toDate: "2026-11-25" }, now).record.id; V.decideVisit(PRIYA, c, "approved", "", now); V.cancelVisit(n, c, "", now);
    return a && b && c && V.visitDaysNoCheckIn(PRIYA, clock("2026-12-10", "10:00")).length === 0; })());
  check("A10", "a day with a check-in is not on the list (it is Incomplete, a different flag)", (() => { fresh("2026-11-20"); const n = hire("a10"); approved(n, "2026-11-24", "2026-11-24", "2026-11-20"); V.visitCheckIn(n, GPS, {}, clock("2026-11-24", "10:00")); return V.visitDaysNoCheckIn(PRIYA, clock("2026-12-10", "10:00")).length === 0; })());
  check("A11", "a 3-day visit with nothing punched is 3 entries, oldest first", (() => { fresh("2026-11-20"); const n = hire("a11"); approved(n, "2026-11-24", "2026-11-26", "2026-11-20"); const l = V.visitDaysNoCheckIn(PRIYA, clock("2026-12-10", "10:00")); return j(l.map((x) => x.date)) === j(["2026-11-24", "2026-11-25", "2026-11-26"]); })()); }
{ fresh("2026-12-18"); const n = clock("2026-12-18", "10:00"); const NH = hire("a12"); const id = approved(NH, "2026-12-22", "2026-12-22", "2026-12-18");
  const now = clock("2026-12-24", "10:00");
  const d = SD.shiftDayFor(NH, "2026-12-22", now), l = SD.shiftMonthLossOfPay(NH, 2026, 12, now);
  check("A12", "shift rules: the day reads Visit not started, flagged Incomplete, never absent", Boolean(id) && d.status === "visit-planned" && d.incomplete === true && d.onSite === true, j([d.status, d.incomplete]));
  check("A13", "...with no loss of pay for that day while it waits (the person's other days are what they are)", !l.open.some((o) => o.date === "2026-12-22") && l.halfDay === 0, j(l.open.map((o) => o.date)));
  check("A14", "...and it is on HR's list", V.visitDaysNoCheckIn(PRIYA, now).some((x) => x.date === "2026-12-22" && x.personId === NH)); }

// ---------- B: who may complete it, what is refused ----------
section("B. Completing a day nobody checked in on");
{ fresh("2026-11-20"); const NH = hire("b"); const id = approved(NH, "2026-11-24", "2026-11-25", "2026-11-20"); const now = clock("2026-12-10", "10:00");
  const C = (who, f, date = "2026-11-24", vid = id) => { try { return V.completeVisitDay(who, vid, date, f, now); } catch (e) { return { ok: true, error: "threw: " + e.message }; } };   // a throw is a failure, not a crash of the suite
  const before = j(VS.readBox());
  check("B1", "a manager can't, an employee can't, Finance can't", !C(SNEHA, { outcome: "full", reason: "Was at the client" }).ok && !C(ARJUN, { outcome: "full", reason: "Was at the client" }).ok && !C(KABIR, { outcome: "full", reason: "Was at the client" }).ok && /Only HR or an Admin/.test(C(SNEHA, { outcome: "full", reason: "Was at the client" }).error));
  check("B2", "...and nothing was written by those attempts", j(VS.readBox()) === before);
  check("B3", "a reason is required: none, two letters and 201 characters are refused with the reason field named", ["", "ab", "x".repeat(201)].every((r) => { const x = C(PRIYA, { outcome: "full", reason: r }); return !x.ok && x.field === "reason"; }));
  check("B4", "a choice is required: nothing given is refused ('Mark the day full or half.')", (() => { const x = C(PRIYA, { reason: "Was at the client" }); return !x.ok && x.field === "outcome" && /Mark the day full or half/.test(x.error); })());
  check("B5", "a check-out time can't be given (nobody checked in), an unknown choice is refused", (() => { const x = C(PRIYA, { outTime: "18:00", reason: "Was at the client" }); const y = C(PRIYA, { outcome: "quarter", reason: "Was at the client" }); return !x.ok && x.field === "outTime" && !y.ok && y.field === "outcome"; })());
  check("B6", "a day outside the visit and a made-up visit are refused", !C(PRIYA, { outcome: "full", reason: "Was at the client" }, "2026-11-23").ok && !C(PRIYA, { outcome: "full", reason: "Was at the client" }, "2026-11-24", "VS-99").ok);
  check("B7", "a day that isn't over (today, tomorrow) is refused", (() => { const t = V.completeVisitDay(PRIYA, id, "2026-11-25", { outcome: "full", reason: "Was at the client" }, clock("2026-11-25", "20:00")); const f = V.completeVisitDay(PRIYA, id, "2026-11-25", { outcome: "full", reason: "Was at the client" }, clock("2026-11-24", "20:00")); clock("2026-12-10", "10:00"); return !t.ok && !f.ok && /isn't over|hasn't happened/.test(t.error + f.error); })());
  check("B8", "a pending visit can't be completed (only an approved one counts)", (() => { const n = fresh("2026-11-20"); const nh = hire("b8"); const r = V.requestVisit(nh, { ...FIELDS, fromDate: "2026-11-24", toDate: "2026-11-24" }, n); const x = V.completeVisitDay(PRIYA, r.record.id, "2026-11-24", { outcome: "full", reason: "Was at the client" }, clock("2026-12-10", "10:00")); return r.ok && !x.ok; })());
  check("B9", "nobody completes their own visit: the Admin's own day is refused for the Admin and fine for HR", (() => { fresh("2026-11-20"); const own = approved(ADMIN, "2026-11-24", "2026-11-24", "2026-11-20"); const n2 = clock("2026-12-10", "10:00"); const a = V.completeVisitDay(ADMIN, own, "2026-11-24", { outcome: "full", reason: "Was at the client" }, n2); const h = V.completeVisitDay(PRIYA, own, "2026-11-24", { outcome: "full", reason: "Was at the client" }, n2); return !a.ok && /own visit/.test(a.error) && h.ok; })());
  fresh("2026-11-20"); const NH2 = hire("b10"); const id2 = approved(NH2, "2026-11-24", "2026-11-25", "2026-11-20"); const n2 = clock("2026-12-10", "10:00");
  const ok = V.completeVisitDay(PRIYA, id2, "2026-11-24", { outcome: "full", reason: "Worked at the client's site" }, n2); const row = VS.getVisit(id2);
  check("B10", "HR completes it: ok, the day now holds the decision (who, what, why) and still no punches", ok.ok && row.days["2026-11-24"]?.decision?.outcome === "full" && row.days["2026-11-24"]?.decision?.by === PRIYA && row.days["2026-11-24"]?.decision?.reason === "Worked at the client's site" && row.days["2026-11-24"]?.in === null && row.days["2026-11-24"]?.out === null, j(row.days));
  check("B11", "it is in the visit's history and the audit trail, naming the visit and the day", row.history.some((h) => h.action === "day-completed" && /2026-11-24/.test(h.note) && /no check-in/.test(h.note)) && auditKinds().includes("visit-day-completed") && AU.allEvents().some((e) => e.kind === "visit-day-completed" && /VS-\d+: 2026-11-24 no check-in, marked full/.test(e.detail)), j(row.history.slice(-1)));
  check("B12", "the same day can't be completed twice", !V.completeVisitDay(PRIYA, id2, "2026-11-24", { outcome: "half", reason: "Changed my mind" }, n2).ok);
  check("B13", "it is gone from the flag; the other day stays", j(V.visitDaysNoCheckIn(PRIYA, n2).map((x) => x.date)) === j(["2026-11-25"]));
  check("B14", "the visit can no longer be cancelled (a decided day counts as started)", !V.cancelVisit(PRIYA, id2, "", n2).ok && /has started/.test(V.cancelVisit(PRIYA, id2, "", n2).error));
  check("B15", "completing the visit's last day completes the visit", (() => { const x = V.completeVisitDay(PRIYA, id2, "2026-11-25", { outcome: "half", reason: "Half the day at the site" }, n2); return x.ok && VS.getVisit(id2).status === "completed"; })()); }

// ---------- C: after ----------
section("C. After HR has decided");
{ fresh("2026-11-20"); const NA = hire("c1"), NB = hire("c2"), NC = hire("c3");
  const ia = approved(NA, "2026-11-24", "2026-11-24", "2026-11-20"), ib = approved(NB, "2026-11-24", "2026-11-24", "2026-11-20"), ic = approved(NC, "2026-11-24", "2026-11-24", "2026-11-20");
  const now = clock("2026-12-10", "10:00");
  const before = { run: lop(NA, 2026, 11), abs: absentDays(NA, 2026, 11), pres: A.monthFor(NA, 2026, 11).counts.present, other: j(A.monthFor(NC, 2026, 11)) };
  const full = V.completeVisitDay(PRIYA, ia, "2026-11-24", { outcome: "full", reason: "Worked at the client's site" }, now);
  const half = V.completeVisitDay(ADMIN, ib, "2026-11-24", { outcome: "half", reason: "Half the day at the site" }, now);
  const da = A.dayFor(NA, "2026-11-24"), db = A.dayFor(NB, "2026-11-24");
  check("C1", "current rules, full: present and on-site, nothing late, no punches, the visit named", full.ok && da.status === "present" && da.onSite === true && da.checkIn === null && da.checkOut === null && da.minutesLate === 0 && da.visit?.siteName === FIELDS.siteName && da.visit?.decision?.outcome === "full" && da.visit?.decision?.by === PRIYA, j([da.status, da.checkIn]));
  check("C2", "current rules, half: a half day", half.ok && db.status === "half-day" && db.onSite === true && db.visit?.decision?.outcome === "half", db.status);
  check("C3", "the month counts the full day as present and not absent any more", absentDays(NA, 2026, 11) === before.abs - 1 && A.monthFor(NA, 2026, 11).counts.present === before.pres + 1, j(A.monthFor(NA, 2026, 11).counts));
  const ra = lop(NA, 2026, 11), rb = lop(NB, 2026, 11), rc = lop(NC, 2026, 11);
  check("C4", "pay: the full day is no longer charged (one absence day less than before)", ra.absenceDays === before.run.absenceDays - 1 && ra.absenceDays === rc.absenceDays - 1, j([before.run.absenceDays, ra.absenceDays, rc.absenceDays]));
  check("C5", "pay: the half day costs half of what the absence did (the half-day's own rule), the other person's absence is untouched", rb.absenceDays + (rb.halfDays ?? 0) * 0.5 <= rc.absenceDays && rc.absenceDays === before.run.absenceDays && j(A.monthFor(NC, 2026, 11)) === before.other, j([rb, rc.absenceDays]));
  check("C6", "the flag is empty for them now", V.visitDaysNoCheckIn(PRIYA, now).filter((x) => [NA, NB].includes(x.personId)).length === 0 && V.visitDaysNoCheckIn(PRIYA, now).some((x) => x.personId === NC)); }
{ fresh("2026-12-18"); const NH = hire("c7"), NI = hire("c8"); const ia = approved(NH, "2026-12-22", "2026-12-22", "2026-12-18"), ib = approved(NI, "2026-12-22", "2026-12-22", "2026-12-18");
  const now = clock("2026-12-24", "10:00");
  const m0 = SD.shiftMonthFor(NH, 2026, 12, now);
  V.completeVisitDay(PRIYA, ia, "2026-12-22", { outcome: "full", reason: "Worked at the client's site" }, now); V.completeVisitDay(PRIYA, ib, "2026-12-22", { outcome: "half", reason: "Half the day at the site" }, now);
  const da = SD.shiftDayFor(NH, "2026-12-22", now), db = SD.shiftDayFor(NI, "2026-12-22", now), m1 = SD.shiftMonthFor(NH, 2026, 12, now);
  check("C7", "shift rules, full: On-site, no longer Incomplete, never late or overtime, counted as a day worked", da.status === "on-site" && da.incomplete === false && da.onSite === true && da.minutesLate === 0 && da.overtimeMinutes === 0 && m1.daysWorked === m0.daysWorked + 1, j([da.status, da.incomplete, m0.daysWorked, m1.daysWorked]));
  const lh = SD.shiftMonthLossOfPay(NI, 2026, 12, now), lf = SD.shiftMonthLossOfPay(NH, 2026, 12, now);
  check("C8", "shift rules, half: a half day, costing half a day of pay (waiting out its window); the full day costs nothing", db.status === "half-day" && lh.open.some((o) => o.date === "2026-12-22" && o.days === 0.5) && !lf.open.some((o) => o.date === "2026-12-22"), j([db.status, lh.open.filter((o) => o.date === "2026-12-22")])); }
// the month end: a visit across 30 Nov / 1 Dec (the rules start), nothing punched, the first two days completed
{ fresh("2026-11-20"); const NH = hire("c9"); const id = approved(NH, "2026-11-30", "2026-12-02", "2026-11-20"); const now = clock("2026-12-31", "10:00");
  const novBefore = A.dayFor(NH, "2026-11-30").status, decBefore = SD.shiftDayFor(NH, "2026-12-01", now).status;
  V.completeVisitDay(PRIYA, id, "2026-11-30", { outcome: "full", reason: "Worked at the client's site" }, now); V.completeVisitDay(PRIYA, id, "2026-12-01", { outcome: "half", reason: "Half the day at the site" }, now);
  check("C9", "month end: 30 Nov (current rules) was an absence and is present; 1 Dec (shift rules) was Visit not started and is a half day; 2 Dec, not decided, still waits", novBefore === "absent" && A.dayFor(NH, "2026-11-30").status === "present" && decBefore === "visit-planned" && SD.shiftDayFor(NH, "2026-12-01", now).status === "half-day" && SD.shiftDayFor(NH, "2026-12-02", now).status === "visit-planned" && j(V.visitDaysNoCheckIn(PRIYA, now).map((x) => x.date)) === j(["2026-12-02"]));
  check("C10", "November's month and pay show 30 Nov as a day worked, December's pay owes only the half day", A.monthFor(NH, 2026, 11).days.find((d) => d.date === "2026-11-30").status === "present" && SD.shiftMonthLossOfPay(NH, 2026, 12, now).halfDay === 0.5); }

// ---------- D: nothing else moved ----------
section("D. Nothing else moved");
{ fresh("2026-11-20"); const NA = hire("d1"), NB = hire("d2"); const ia = approved(NA, "2026-11-24", "2026-11-24", "2026-11-20"); approved(NB, "2026-11-25", "2026-11-25", "2026-11-20"); const now = clock("2026-12-10", "10:00");
  const snap = () => j([A.monthFor(NB, 2026, 11), A.monthFor(ROHAN, 2026, 11), A.monthFor(ARJUN, 2026, 11), lop(NB, 2026, 11), lop(ROHAN, 2026, 11)]);
  const s0 = snap(), store0 = j(VS.readBox()); V.visitDaysNoCheckIn(PRIYA, now); V.visitDaysNoCheckIn(ADMIN, now);
  check("D1", "reading the flag writes nothing", j(VS.readBox()) === store0 && snap() === s0);
  V.completeVisitDay(PRIYA, ia, "2026-11-24", { outcome: "full", reason: "Worked at the client's site" }, now);
  check("D2", "completing one person's day changes no one else's month, pay or attendance (another visit with no punch, the sample people)", snap() === s0);
  check("D3", "a day with a plain punch and no visit is the same object read as before", (() => { const d = A.dayFor(ROHAN, "2026-11-12"); return d.onSite === undefined && d.visit === undefined; })());
  check("D4", "a visit day with a punch keeps its old reading (present, the check-in time, On-site)", (() => { fresh("2026-11-20"); const n = hire("d4"); approved(n, "2026-11-24", "2026-11-24", "2026-11-20"); V.visitCheckIn(n, GPS, {}, clock("2026-11-24", "10:00")); V.visitCheckOut(n, GPS, {}, clock("2026-11-24", "18:00")); clock("2026-12-10", "10:00"); const d = A.dayFor(n, "2026-11-24"); return d.status === "present" && d.checkIn === "10:00" && d.checkOut === "18:00" && d.onSite === true; })()); }

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;