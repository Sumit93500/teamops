// usage: node shifts.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// SH1: shift-based attendance (data/shifts-store.js, shift-assignments.js, shift-settings.js, shift-engine.js,
// shift-days.js, shift-punch.js, overtime-store.js, comp-off.js; the hooks in pay-engine.js and leave-policy.js). ./js is the build.
//   P  permissions: shifts:view / assign / swap-team, overtime:approve; the counts (102 in 43 modules)
//   S  the shifts store: the seed, General = today's rules, every validation, dated versions, deactivate blocked while in use
//   A  assignments: a person (with and without an end), a department default, a date swap (manager: own reports only),
//      back-to-back overlap refused, history; shiftOn is the pure order swap > person > department > General
//   E  the engine's boundaries: exactly at grace and one minute either side, at each threshold, overtime blocks, the
//      night shift's next-morning times, short leave, half-day leave, in progress / incomplete
//   G  General reproduces today's rules: every seeded day of every person (October and November 2026) at three clocks
//   N  a night shift by punches: one day per night, the check-out next morning completes it, a late check-in after
//      midnight, an open shift refuses a new check-in, back-to-back shifts, weekly off by the shift
//   W  the check-in window and its words ("Your shift starts at 22:00, check-in opens at 21:30.")
//   L  leave, holiday and weekly-off overlaps; a mid-month change; a one-date swap
//   B  the rules start date: before it the old days exactly, from it the shift; the setting's checks
//   Y  pay: the shift loss of pay replaces the old attendance part from the start month; the late-mark rule on / off
//   O  overtime: pending, who decides, immutable decisions, a reason to reject, the month's minutes
//   C  comp-off: off by default, credits, expiry, counted in earned leave
//   I  an incomplete night (no check-out): HR completes it
//   Z  office time from instants, whatever the machine's zone
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
setNow(2026, 11, 20, 10);
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const P = await import("./js/config/permissions.js");
const R = await import("./js/config/roles.js");
const S = await import("./js/data/store.js");
const A = await import("./js/data/attendance-store.js");
const HOL = await import("./js/data/holidays.js");
const LP = await import("./js/data/leave-policy.js");
const E = await import("./js/data/pay-engine.js");
const PS = await import("./js/data/payroll-store.js");
const PAY = await import("./js/data/payroll.js");
const SH = await import("./js/data/shifts-store.js");
const AS = await import("./js/data/shift-assignments.js");
const SS = await import("./js/data/shift-settings.js");
const EN = await import("./js/data/shift-engine.js");
const SD = await import("./js/data/shift-days.js");
const SP = await import("./js/data/shift-punch.js");
const OT = await import("./js/data/overtime-store.js");
const CO = await import("./js/data/comp-off.js");
const REP = await import("./js/data/reporting.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const at = (date, t) => ({ date, minutes: EN.toMin(t) });
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", SNEHA = "EMP-1029", ARJUN = "EMP-1105";
const T0 = "2026-11-20";   // the office date the assignments are made on

A.monthFor(AARAV, 2026, 11);   // the attendance seed, made on 20 Nov 2026
const neel = S.addUser(AARAV, { name: "Neel Shah", email: "neel.shah@northwind.com", department: "ENG", designation: "Software Engineer", role: "emp", dateOfJoining: "2 Nov 2026" });
const NEEL = neel.record?.id ?? neel.user?.id ?? S.getAllUsers().find((u) => u.name === "Neel Shah")?.id;

// ---------- P ----------
section("P. Permissions");
const role = (k) => R.ROLES[k].permissions;
check("P1", "102 permissions in 43 modules (98 / 42 before CV1)", P.ALL_PERMISSIONS.length === 114 && Object.keys(P.PERMISSIONS).length === 46 /* AS1 (behaviour; was 105 / 44) */ /* FS1 (behaviour; was 102 / 43) */, `${P.ALL_PERMISSIONS.length} / ${Object.keys(P.PERMISSIONS).length}`);
check("P2", "the shifts module: manage, view, assign, swap-team; overtime: approve", j(P.PERMISSIONS.shifts) === j(["manage", "view", "assign", "swap-team"]) && j(P.PERMISSIONS.overtime) === j(["approve"]));
check("P3", "role counts: Admin 102, HR 58, Finance 48, Employee 30", j(Object.values(R.ROLES).map((r) => r.permissions.length)) === j([111, 63, 54, 30]) /* AS1 (behaviour; were 102, 61, 50) */ /* FS1 (behaviour) */, j(Object.values(R.ROLES).map((r) => r.permissions.length)));
check("P4", "everyone holds shifts:view, shifts:swap-team and overtime:approve (they act only on direct reports)", ["hr", "fin", "emp"].every((k) => ["shifts:view", "shifts:swap-team", "overtime:approve"].every((p) => role(k).includes(p))));
check("P5", "shifts:assign and shifts:manage: Admin and HR only", role("hr").includes("shifts:assign") && role("hr").includes("shifts:manage") && !role("fin").includes("shifts:assign") && !role("emp").includes("shifts:assign") && !role("emp").includes("shifts:manage"));
check("P6", "none of the new ones is overridable", ["shifts:view", "shifts:assign", "shifts:swap-team", "overtime:approve"].every((p) => !R.OVERRIDABLE.includes(p)));

// ---------- S ----------
section("S. The shifts store");
const G = SH.getShift(SH.GENERAL_ID, "2026-12-01"), NIGHT = SH.getShift("SH-3", "2026-12-01"), EARLY = SH.getShift("SH-2", "2026-12-01"), PART = SH.getShift("SH-4", "2026-12-01");
const AR = A.ATTENDANCE_RULES;
check("S1", "four sample shifts: General, Early, Night, Part-time, all marked sample and active", j(SH.getShifts().map((s) => [s.name, s.sample, s.active])) === j([["General", true, true], ["Early", true, true], ["Night", true, true], ["Part-time", true, true]]));
check("S2", "General is today's rules exactly: 09:30-18:30, 15 min grace, no break, half day under 8 h, absent under 4 h, no short-leave band, check-in from 08:30, Saturday and Sunday off",
  G.start === AR.shiftStart && G.end === AR.shiftEnd && G.graceMin === AR.graceMinutes && G.breakMin === 0 && G.halfDayBelowHours * 60 === AR.fullDayMinutes && G.absentBelowHours * 60 === AR.halfDayMinutes
  && G.shortLeaveBelowHours === G.halfDayBelowHours && EN.toMin(G.start) - G.earliestCheckInMin === EN.toMin(AR.earliestCheckIn) && j(G.weeklyOffDays) === j([0, 6]));
check("S3", "General's half-day split is the old one (14:00) and its window the old checkInWindow", EN.hhmm(EN.shiftShape(G).split) === AR.halfSplit && j(EN.checkInWindowOf(G)) === j(A.checkInWindow(null)));
check("S4", "Night 22:00-07:00 crosses midnight (derived), 9 h, net 8 h 30", NIGHT.crossesMidnight === true && NIGHT.lengthMin === 540 && NIGHT.netMin === 510 && G.crossesMidnight === false);
check("S5", "the plain words: General", j(SH.shiftSummary(G)) === j(["09:30 to 18:30, 9 h.", "Check-in opens at 08:30.", "Late after 09:45.", "Half day under 8 h.", "Absent under 4 h.", "Overtime after 18:45 in 30 min blocks.", "Weekly off: Saturday, Sunday."]), j(SH.shiftSummary(G)));
check("S6", "the plain words: Night (the next morning, the break, short leave)", j(SH.shiftSummary(NIGHT).slice(0, 4)) === j(["22:00 to 07:00 the next morning (night shift), 9 h with a 30 min unpaid break.", "Check-in opens at 21:30.", "Late after 22:15.", "Short leave under 8 h."]), j(SH.shiftSummary(NIGHT)));
const base = { name: "Swing", start: "14:00", end: "22:00", graceMin: 10, breakMin: 30, absentBelowHours: 3, halfDayBelowHours: 5, shortLeaveBelowHours: 7, earliestCheckInMin: 30, overtimeAfterMin: 30, overtimeMinBlockMin: 30, weeklyOffDays: [0] };
const prob = (ch) => SH.shiftProblems({ ...base, ...ch });
check("S7", "a good shift has no problems", j(prob({})) === "{}", j(prob({})));
check("S8", "end = start refused", Boolean(prob({ end: "14:00" }).end));
check("S9", "thresholds ordered: absent above half day, half day above short leave", Boolean(prob({ absentBelowHours: 6 }).absentBelowHours) && Boolean(prob({ halfDayBelowHours: 7.5 }).shortLeaveBelowHours));
check("S10", "thresholds within the shift: short leave over the hours worked (7.5 h) refused; 7.5 allowed", Boolean(prob({ shortLeaveBelowHours: 7.75 }).shortLeaveBelowHours) && !prob({ shortLeaveBelowHours: 7.5 }).shortLeaveBelowHours);
check("S11", "absent must be under half the shift (4 h of 8): 4 refused, 3.75 allowed", Boolean(prob({ absentBelowHours: 4, halfDayBelowHours: 5 }).absentBelowHours) && !prob({ absentBelowHours: 3.75 }).absentBelowHours);
check("S12", "grace must be shorter than the shift (480 refused, 479 allowed)", Boolean(prob({ graceMin: 480 }).graceMin) && !prob({ graceMin: 479 }).graceMin);
check("S13", "no duplicate names (case and spaces ignored), bad times, quarter hours, weekly off with no working day", Boolean(prob({ name: " night " }).name) && Boolean(prob({ start: "25:00" }).start) && Boolean(prob({ halfDayBelowHours: 5.1 }).halfDayBelowHours) && Boolean(prob({ weeklyOffDays: [0, 1, 2, 3, 4, 5, 6] }).weeklyOffDays));
check("S14", "an Employee can't create a shift; HR can (not sample, rules from the day it's made)", !SH.createShift(ARJUN, base, T0).ok && SH.createShift(PRIYA, base, T0).ok && SH.getShifts().find((s) => s.name === "Swing")?.sample === false);
const SWING = SH.getShifts().find((s) => s.name === "Swing").id;
const ed1 = SH.updateShift(PRIYA, "SH-2", { graceMin: 5 }, "2026-11-25");
check("S15", "editing a sample shift adds a dated version and clears the mark; a day before keeps the old rules", ed1.ok && SH.getShift("SH-2", "2026-11-25").graceMin === 5 && SH.getShift("SH-2", "2026-11-24").graceMin === 10 && SH.getShift("SH-2").sample === false);
const ed2 = SH.updateShift(PRIYA, "SH-2", { graceMin: 7 }, "2026-11-25");
check("S16", "a second edit the same day replaces that day's version (no new one)", ed2.ok && SH.getShift("SH-2", "2026-11-25").graceMin === 7 && SH.getShift("SH-2", "2026-11-25").versions === 2);
SH.updateShift(PRIYA, "SH-2", { graceMin: 10 }, "2026-11-25");
check("S17", "General can't be deactivated", !SH.deactivateShift(AARAV, SH.GENERAL_ID, T0).ok);

// ---------- A ----------
section("A. Assignments");
check("A1", "nobody assigned: General, from the default", AS.shiftOn(ARJUN, "2026-12-07").shift.id === SH.GENERAL_ID && AS.shiftOn(ARJUN, "2026-12-07").source === "default");
check("A2", "an Employee and Finance can't assign; nobody assigns their own shift", !AS.assignShift(ARJUN, NEEL, "SH-3", "2026-12-01", null, "", T0).ok && !AS.assignShift(KABIR, NEEL, "SH-3", "2026-12-01", null, "", T0).ok && !AS.assignShift(PRIYA, PRIYA, "SH-3", "2026-12-01", null, "", T0).ok);
check("A3", "a date already passed is refused", !AS.assignShift(PRIYA, NEEL, "SH-3", "2026-11-19", null, "", T0).ok);
check("A4", "HR assigns Neel to Night from 1 December, no end", AS.assignShift(PRIYA, NEEL, "SH-3", "2026-12-01", null, "Night desk", T0).ok);
check("A5", "an assignment without an end goes on: Night on 1 Dec and 30 Jan; General the day before it starts", AS.shiftIdOn(NEEL, "2026-12-01") === "SH-3" && AS.shiftIdOn(NEEL, "2027-01-30") === "SH-3" && AS.shiftIdOn(NEEL, "2026-11-30") === SH.GENERAL_ID);
check("A6", "a later assignment wins from its own start (General from 21 Dec); the night before stays Night", AS.assignShift(PRIYA, NEEL, SH.GENERAL_ID, "2026-12-21", null, "", T0).ok && AS.shiftIdOn(NEEL, "2026-12-20") === "SH-3" && AS.shiftIdOn(NEEL, "2026-12-21") === SH.GENERAL_ID && AS.shiftIdOn(NEEL, "2027-02-01") === SH.GENERAL_ID);
check("A7", "an assignment with an end: Part-time 4-6 Jan 2027, back to the shift underneath on the 7th", AS.assignShift(PRIYA, NEEL, "SH-4", "2027-01-04", "2027-01-06", "", T0).ok && AS.shiftIdOn(NEEL, "2027-01-05") === "SH-4" && AS.shiftIdOn(NEEL, "2027-01-07") === SH.GENERAL_ID);
check("A8", "a department default: Sales on Early from 1 Dec (Ananya, from the department)", AS.setDepartmentShift(PRIYA, "SAL", "SH-2", "2026-12-01", T0).ok && AS.shiftOn(ANANYA, "2026-12-02").shift.id === "SH-2" && AS.shiftOn(ANANYA, "2026-12-02").source === "department" && AS.shiftIdOn(ANANYA, "2026-11-30") === SH.GENERAL_ID);
check("A9", "a manager swaps one date for a direct report, with a reason (Sneha: Arjun to Night on 15 Dec)", REP.managerOf(ARJUN) === SNEHA && AS.swapShift(SNEHA, ARJUN, "2026-12-15", "SH-3", "Covering the night desk", T0).ok);
check("A10", "the swap is that date only: General the day before and after, source swap with its reason", AS.shiftOn(ARJUN, "2026-12-15").source === "swap" && AS.shiftOn(ARJUN, "2026-12-15").swap.reason === "Covering the night desk" && AS.shiftIdOn(ARJUN, "2026-12-14") === SH.GENERAL_ID && AS.shiftIdOn(ARJUN, "2026-12-16") === SH.GENERAL_ID);
check("A11", "a manager can't swap someone outside their team, or their own; an employee with no reports can't swap", !AS.swapShift(SNEHA, ANANYA, "2026-12-15", "SH-3", "Cover", T0).ok && !AS.swapShift(SNEHA, SNEHA, "2026-12-15", "SH-3", "Cover", T0).ok && !AS.swapShift(ARJUN, SNEHA, "2026-12-15", "SH-3", "Cover", T0).ok);
check("A12", "a swap needs a reason (3+ characters)", AS.swapShift(SNEHA, ARJUN, "2026-12-17", "SH-2", "ab", T0).field === "reason");
const ov = AS.swapShift(SNEHA, ARJUN, "2026-12-16", "SH-2", "Early cover", T0);
check("A13", "back-to-back: Early (opens 05:30) the morning after Night (ends 07:00) is refused as an overlap", !ov.ok && /overlap Night the day before/.test(ov.error), ov.error);
check("A14", "HR swaps anyone (Ananya to General on 2 Dec); the same shift as already on is refused", AS.swapShift(PRIYA, ANANYA, "2026-12-03", SH.GENERAL_ID, "Training", T0).ok && !AS.swapShift(PRIYA, ANANYA, "2026-12-04", "SH-2", "Again", T0).ok);
check("A15", "history: every assignment and swap, newest first, with who made it", AS.historyFor(NEEL).length === 3 && AS.historyFor(NEEL)[0].shiftId === "SH-4" && AS.historyFor(NEEL).every((h) => h.byName === "Priya Nair") && AS.historyFor(ARJUN).map((h) => h.kind).join() === "swap");
check("A16", "who is on a shift on a date (Night on 7 Dec: Neel)", AS.peopleOnShift("SH-3", "2026-12-07").map((u) => u.id).join() === NEEL);
const inUse = SH.deactivateShift(PRIYA, "SH-3", T0);
check("A17", "a shift in use (an assignment, a swap) can't be deactivated", !inUse.ok && inUse.code === "in-use" && /Neel Shah/.test(inUse.error), inUse.error);
check("A18", "nor a department's default (Early for Sales)", SH.deactivateShift(PRIYA, "SH-2", T0).code === "in-use");
check("A19", "an unused shift deactivates and reactivates; an inactive one can't be assigned", SH.deactivateShift(PRIYA, SWING, T0).ok && !AS.assignShift(PRIYA, ARJUN, SWING, "2026-12-01", null, "", T0).ok && SH.reactivateShift(PRIYA, SWING, T0).ok);

// ---------- E ----------
section("E. The engine's boundaries");
const cls = (rules, inT, outT, extra = {}) => EN.classifyDay({ date: "2026-12-07", rules, checkIn: inT, checkOut: outT, now: at("2026-12-20", "10:00"), ...extra });
const st = (rules, inT, outT, extra) => cls(rules, inT, outT, extra).status;
check("E1", "General: in at 09:45 (exactly the grace) is on time; 09:46 is late by 16 min; 09:44 on time", st(G, "09:45", "18:30") === "present" && cls(G, "09:46", "18:30").status === "late" && cls(G, "09:46", "18:30").minutesLate === 16 && st(G, "09:44", "18:30") === "present");
check("E2", "General: 8 h exactly is a full day; 7 h 59 a half day; 4 h a half day; 3 h 59 absent", st(G, "09:30", "17:30") === "present" && st(G, "09:30", "17:29") === "half-day" && st(G, "09:30", "13:30") === "half-day" && st(G, "09:30", "13:29") === "absent");
check("E3", "General overtime after 18:45 in 30 min blocks: 19:14 none, 19:15 30, 19:44 30, 19:45 60", [cls(G, "09:30", "19:14"), cls(G, "09:30", "19:15"), cls(G, "09:30", "19:44"), cls(G, "09:30", "19:45")].map((c) => c.overtimeMinutes).join() === "0,30,30,60");
check("E4", "overtime only on a full day (a half day leaving late has none)", cls(G, "13:00", "20:00").status === "half-day" && cls(G, "13:00", "20:00").overtimeMinutes === 0);
check("E5", "Night: 22:15 on time, 22:16 late; out at 07:00 next morning is a full day (9 h less the 30 min break)", st(NIGHT, "22:15", "07:00") === "present" && st(NIGHT, "22:16", "07:00") === "late" && cls(NIGHT, "22:00", "07:00").minutesWorked === 510);
check("E6", "Night overtime after 07:30: 07:59 none, 08:00 30, 08:29 30, 08:30 60", [cls(NIGHT, "22:00", "07:59"), cls(NIGHT, "22:00", "08:00"), cls(NIGHT, "22:00", "08:29"), cls(NIGHT, "22:00", "08:30")].map((c) => c.overtimeMinutes).join() === "0,30,30,60");
check("E7", "Night short leave (under 8 h worked): out 06:29 short leave, 06:30 present", st(NIGHT, "22:00", "06:29") === "short-leave" && st(NIGHT, "22:00", "06:30") === "present");
check("E8", "Night half day under 6 h, absent under 4 h: out 04:29 short leave? no: 04:29 is 5 h 59 worked, a half day; 04:30 short leave", st(NIGHT, "22:00", "04:29") === "half-day" && st(NIGHT, "22:00", "04:30") === "short-leave");
check("E9", "Night absent under 4 h: out 02:29 absent, 02:30 half day", st(NIGHT, "22:00", "02:29") === "absent" && st(NIGHT, "22:00", "02:30") === "half-day");
check("E10", "a late check-in after midnight (00:40) is the same night, late by 160 min", cls(NIGHT, "00:40", "07:00").minutesLate === 160 && cls(NIGHT, "00:40", "07:00").status === "half-day");
check("E11", "a check-in at 21:30 (the window's opening) is the start date's evening, not the next morning", cls(NIGHT, "21:30", "07:00").minutesWorked === 540);
check("E12", "Early: 8 h worked (06:00-14:30 less the break) present, 14:29 short leave", st(EARLY, "06:00", "14:30") === "present" && st(EARLY, "06:00", "14:29") === "short-leave");
check("E13", "first-half leave on General: due at 14:00, late after 14:15; under 4 h absent", st(G, "14:15", "18:30", { halfDayLeave: "first-half" }) === "present" && st(G, "14:16", "18:30", { halfDayLeave: "first-half" }) === "late" && st(G, "14:30", "18:29", { halfDayLeave: "first-half" }) === "absent");
const ip = EN.classifyDay({ date: "2026-12-07", rules: NIGHT, checkIn: "22:00", checkOut: null, now: at("2026-12-08", "10:59") });
const inc = EN.classifyDay({ date: "2026-12-07", rules: NIGHT, checkIn: "22:00", checkOut: null, now: at("2026-12-08", "11:00") });
check("E14", "a night with no check-out is in progress until 4 h after its end (10:59), then incomplete (11:00)", ip.inProgress && !ip.incomplete && inc.incomplete && !inc.inProgress && inc.status === "present");
check("E15", "General with no check-out: incomplete from the next day (the old rule), status present / late", EN.classifyDay({ date: "2026-12-07", rules: G, checkIn: "09:50", checkOut: null, now: at("2026-12-08", "00:00") }).incomplete && EN.classifyDay({ date: "2026-12-07", rules: G, checkIn: "09:50", checkOut: null, now: at("2026-12-07", "23:59") }).inProgress);
check("E16", "no check-in: not yet until the end, overdue after the grace, absent from the end", EN.classifyDay({ date: "2026-12-07", rules: NIGHT, now: at("2026-12-08", "06:59") }).status === "not-yet" && EN.classifyDay({ date: "2026-12-07", rules: NIGHT, now: at("2026-12-08", "06:59") }).overdue && EN.classifyDay({ date: "2026-12-07", rules: NIGHT, now: at("2026-12-08", "07:00") }).status === "absent" && !EN.classifyDay({ date: "2026-12-07", rules: NIGHT, now: at("2026-12-07", "22:15") }).overdue);
check("E17", "loss of pay per day: absent 1 (0.5 with half-day leave), half day 0.5, short leave 0.25", j(["absent", "half-day", "short-leave", "present", "late"].map((s) => EN.dayLossOfPay(s, null))) === j([1, 0.5, 0.25, 0, 0]) && EN.dayLossOfPay("absent", "first-half") === 0.5);

// ---------- G ----------
section("G. General reproduces today's rules on every seeded day");
function sameAsOld(h, m) {
  setNow(2026, 11, 20, h, m);
  const d = new Date();
  const local = { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, minutes: d.getHours() * 60 + d.getMinutes() };
  let n = 0;
  const bad = [];
  for (const u of S.getAllUsers()) for (const mo of [10, 11]) {
    const month = A.monthFor(u.id, 2026, mo);
    if (!month) continue;
    for (const old of month.days) {
      if (old.status === "left" || old.status === "not-joined") continue;
      const c = EN.classifyDay({ date: old.date, rules: G, checkIn: old.checkIn, checkOut: old.checkOut, holiday: Boolean(old.holiday && old.holiday.kind !== "optional"), leaveFull: Boolean(old.leave && old.leave.type !== "wfh" && !old.halfDayLeave), halfDayLeave: old.halfDayLeave, noData: old.status === "no-data", now: local });
      const want = { ...old, status: old.status === "weekend" ? "weekly-off" : old.status };
      n++;
      for (const k of ["status", "expected", "minutesLate", "minutesWorked", "hours", "inProgress", "overdue", "incomplete"]) if (j(c[k]) !== j(want[k])) { bad.push(`${u.id} ${old.date} ${k}: ${j(want[k])} vs ${j(c[k])}`); break; }
    }
  }
  return { n, bad };
}
for (const [label, h, m] of [["10:00", 10, 0], ["09:50 (overdue)", 9, 50], ["19:00", 19, 0]]) {
  const r = sameAsOld(h, m);
  check(`G.${h}${m}`, `at ${label}: every day of every person, October and November 2026, reads the same under General (${r.n} days)`, r.n > 500 && r.bad.length === 0, r.bad.slice(0, 3).join(" | "));
}
setNow(2026, 11, 20, 10);

// ---------- N ----------
section("N. A night shift by punches (Neel, Night from 1 Dec)");
const inN = SP.shiftCheckIn(NEEL, "office", undefined, at("2026-12-07", "22:05"));
check("N1", "Mon 7 Dec 22:05: checks in to Monday's night", inN.ok && inN.date === "2026-12-07" && A.storedRecord(NEEL, "2026-12-07").checkIn === "22:05");
const outN = SP.shiftCheckOut(NEEL, undefined, at("2026-12-08", "07:10"));
check("N2", "Tue 8 Dec 07:10: the check-out completes MONDAY (the day it started), nothing on Tuesday", outN.ok && outN.date === "2026-12-07" && A.storedRecord(NEEL, "2026-12-07").checkOut === "07:10" && A.storedRecord(NEEL, "2026-12-08") === null);
check("N3", "Monday reads one full day: present, 8 h 35 worked (9 h 5 less the break), no overtime before 07:30", (() => { const d = SD.shiftDayFor(NEEL, "2026-12-07", at("2026-12-20", "10:00")); return d.status === "present" && d.minutesWorked === 515 && d.overtimeMinutes === 0 && d.shiftName === "Night"; })());
SP.shiftCheckIn(NEEL, "office", undefined, at("2026-12-08", "22:00"));
const open = SP.shiftCheckInRefusal(NEEL, "office", at("2026-12-09", "00:20"));
check("N4", "while Tuesday's night is open, a check-in at 00:20 is refused (check out first)", open?.code === "open-shift" && /Tuesday's Night shift: check out first/.test(open.error), open?.error);
SP.shiftCheckOut(NEEL, undefined, at("2026-12-09", "08:05"));
const late = SP.shiftCheckIn(NEEL, "office", undefined, at("2026-12-10", "00:40"));
check("N5", "Wed 9 Dec: no check-in by midnight; 00:40 on Thursday checks in to WEDNESDAY's night, late by 160 min", late.ok && late.date === "2026-12-09" && SD.shiftDayFor(NEEL, "2026-12-09", at("2026-12-10", "02:00")).minutesLate === 160);
SP.shiftCheckOut(NEEL, undefined, at("2026-12-10", "07:00"));
SP.shiftCheckIn(NEEL, "office", undefined, at("2026-12-10", "22:00"));
SP.shiftCheckOut(NEEL, undefined, at("2026-12-11", "09:30"));
const dec = SD.shiftMonthFor(NEEL, 2026, 12, at("2026-12-12", "12:00"));
const byDate = Object.fromEntries(dec.days.map((d) => [d.date, d]));
check("N6", "four nights, four days: 7th present, 8th present (out 08:05: 30 min overtime), 9th a half day (5 h 50), 10th present with 120 min", j(["07", "08", "09", "10"].map((d) => [byDate[`2026-12-${d}`].status, byDate[`2026-12-${d}`].overtimeMinutes])) === j([["present", 0], ["present", 30], ["half-day", 0], ["present", 120]]), j(["07", "08", "09", "10"].map((d) => [byDate[`2026-12-${d}`].status, byDate[`2026-12-${d}`].overtimeMinutes])));
check("N7", "a night is never counted twice: the month's present + late + half days with a check-in = 4 records, and 11 Dec (its night not worked, ended at 07:00 on the 12th) is absent, once", dec.days.filter((d) => d.checkIn).length === 4 && dec.counts.present + dec.counts.late + dec.counts.halfDay === 4 && byDate["2026-12-11"].status === "absent" && !byDate["2026-12-11"].checkIn);
check("N8", "the night shift's weekly off: Saturday 12 and Sunday 13 Dec", byDate["2026-12-12"].status === "weekly-off" && byDate["2026-12-13"].status === "weekly-off" && dec.counts.overtimeMinutes === 150);
// back-to-back: Arjun's swapped night on 15 Dec, then his General day on the 16th
SP.shiftCheckIn(ARJUN, "office", undefined, at("2026-12-15", "21:50"));
SP.shiftCheckOut(ARJUN, undefined, at("2026-12-16", "07:00"));
const b2b = SP.shiftCheckIn(ARJUN, "office", undefined, at("2026-12-16", "09:10"));
SP.shiftCheckOut(ARJUN, undefined, at("2026-12-16", "18:40"));
check("N9", "back-to-back shifts: the 07:00 check-out closes the 15th's night; 09:10 checks in to the 16th's General day; each its own day", b2b.ok && b2b.date === "2026-12-16" && A.storedRecord(ARJUN, "2026-12-15").checkOut === "07:00" && SD.shiftDayFor(ARJUN, "2026-12-15", at("2026-12-20", "10:00")).status === "present" && SD.shiftDayFor(ARJUN, "2026-12-16", at("2026-12-20", "10:00")).status === "present");

// ---------- W ----------
section("W. The check-in window");
const w1 = SP.shiftCheckInRefusal(NEEL, "office", at("2026-12-14", "21:29"));
check("W1", "Night, 21:29: \"Your shift starts at 22:00, check-in opens at 21:30.\"", w1?.error === "Your shift starts at 22:00, check-in opens at 21:30." && w1.code === "too-early", w1?.error);
check("W2", "Night, 21:30: open", SP.shiftCheckInRefusal(NEEL, "office", at("2026-12-14", "21:30")) === null);
check("W3", "General, 08:29: \"Your shift starts at 09:30, check-in opens at 08:30.\"; 08:30 open", SP.shiftCheckInRefusal(ARJUN, "office", at("2026-12-17", "08:29"))?.error === "Your shift starts at 09:30, check-in opens at 08:30." && SP.shiftCheckInRefusal(ARJUN, "office", at("2026-12-17", "08:30")) === null);
check("W4", "General, 18:30: \"Check-in closed at 18:30.\" (18:29 still open)", SP.shiftCheckInRefusal(ARJUN, "office", at("2026-12-17", "18:30"))?.error === "Check-in closed at 18:30." && SP.shiftCheckInRefusal(ARJUN, "office", at("2026-12-17", "18:29")) === null);
check("W5", "the shift's weekly off: \"Today is your weekly off, so no attendance is needed.\"", SP.shiftCheckInRefusal(NEEL, "office", at("2026-12-19", "22:00"))?.error === "Today is your weekly off, so no attendance is needed.");
const nx = SP.nextCheckIn(NEEL, at("2026-12-18", "23:30"));
check("W6", "the next window: Friday's night is open at 23:30; from Saturday it's Monday 21 Dec on General (the new assignment), opening 08:30", SP.nextCheckIn(NEEL, at("2026-12-18", "21:40"))?.openNow === true && nx?.openNow === true && nx.date === "2026-12-18" && SP.nextCheckIn(NEEL, at("2026-12-19", "12:00"))?.date === "2026-12-21" && SP.nextCheckIn(NEEL, at("2026-12-19", "12:00"))?.opens === "08:30", j([nx, SP.nextCheckIn(NEEL, at("2026-12-19", "12:00"))]));
const ps = SP.punchState(NEEL, at("2026-12-14", "21:00"));
check("W7", "punchState: the shift (Night 22:00 to 07:00), closed with the window's words, next window tonight at 21:30", ps.shift.name === "Night" && ps.shift.start === "22:00" && ps.shift.end === "07:00" && ps.action === "closed" && /check-in opens at 21:30/.test(ps.message) && ps.next.opens === "21:30");

// ---------- L ----------
section("L. Leave, holiday, weekly off; a mid-month change");
HOL.addHoliday(AARAV, { date: "2026-12-23", name: "Founders' Day", kind: "company" });
const leaveBox = JSON.parse(mem.get("officeos:leave-requests"));
leaveBox.records.push({ id: "LV-9901", userId: ARJUN, type: "casual", from: "2026-12-22", to: "2026-12-22", duration: "full", days: 1, status: "approved", reason: "Family", history: [], createdAt: "2026-11-20T05:00:00.000Z" });
leaveBox.records.push({ id: "LV-9902", userId: ARJUN, type: "casual", from: "2026-12-24", to: "2026-12-24", duration: "first-half", days: 0.5, status: "approved", reason: "Doctor", history: [], createdAt: "2026-11-20T05:00:00.000Z" });
mem.set("officeos:leave-requests", j(leaveBox));
const L1 = SD.shiftDayFor(ARJUN, "2026-12-22", at("2026-12-28", "10:00")), L2 = SD.shiftDayFor(ARJUN, "2026-12-23", at("2026-12-28", "10:00"));
check("L1", "a full day of approved leave: on leave; a closed holiday: holiday (not absent)", L1.status === "on-leave" && L2.status === "holiday", `${L1.status} ${L2.status}`);
SP.shiftCheckIn(ARJUN, "office", undefined, at("2026-12-24", "14:10"));
SP.shiftCheckOut(ARJUN, undefined, at("2026-12-24", "18:30"));
check("L2", "first-half leave: due at 14:00, 14:10 is on time, 4 h 20 worked is present", SD.shiftDayFor(ARJUN, "2026-12-24", at("2026-12-28", "10:00")).status === "present");
check("L3", "a check-in on a holiday still counts (the old rule)", (() => { SP.shiftCheckIn(PRIYA, "office", undefined, at("2026-12-23", "09:30")); return SD.shiftDayFor(PRIYA, "2026-12-23", at("2026-12-28", "10:00")).status !== "holiday" || A.storedRecord(PRIYA, "2026-12-23") === null; })());
const MID = SH.createShift(PRIYA, { ...base, name: "Mid-week off", weeklyOffDays: [3] }, T0).record.id;
AS.swapShift(PRIYA, ARJUN, "2026-12-30", MID, "Rota", T0);
check("L4", "weekly off by the shift: a Wednesday off on a Wednesday-off shift (a swap); Saturday is General's off", SD.shiftDayFor(ARJUN, "2026-12-30", at("2027-01-05", "10:00")).status === "weekly-off" && SD.shiftDayFor(ARJUN, "2026-12-26", at("2027-01-05", "10:00")).status === "weekly-off");
const nd = SD.shiftMonthFor(NEEL, 2026, 12, at("2027-01-05", "10:00"));
check("L5", "a shift change mid-month: Neel is Night to 20 Dec and General from the 21st, in one month", nd.days.find((d) => d.date === "2026-12-18").shiftName === "Night" && nd.days.find((d) => d.date === "2026-12-21").shiftName === "General" && nd.days.find((d) => d.date === "2026-12-21").shiftStart === "09:30");
check("L6", "a one-date swap shows on that date only, with its reason (Arjun 15 Dec: Night)", SD.shiftDayFor(ARJUN, "2026-12-15", at("2026-12-20", "10:00")).shiftName === "Night" && SD.shiftDayFor(ARJUN, "2026-12-15", at("2026-12-20", "10:00")).swapReason === "Covering the night desk" && SD.shiftDayFor(ARJUN, "2026-12-14", at("2026-12-20", "10:00")).shiftName === "General");

// ---------- B ----------
section("B. The shift rules start date");
check("B1", "default 2026-12-01: 30 Nov reads the old rules, 1 Dec the shift", SS.shiftRulesFrom() === "2026-12-01" && SD.shiftDayFor(NEEL, "2026-11-30", at("2026-12-20", "10:00")).rules === "old" && SD.shiftDayFor(NEEL, "2026-12-01", at("2026-12-20", "10:00")).rules === "shift");
const novOld = A.monthFor(ARJUN, 2026, 11), novNew = SD.shiftMonthFor(ARJUN, 2026, 11);
check("B2", "a month before it is the old month exactly (every day's fields, the counts, the penalty), each day named General", novNew.rules === "old" && novNew.days.every((d, i) => j({ ...d, shiftId: undefined, shiftName: undefined, shiftStart: undefined, shiftEnd: undefined, crossesMidnight: undefined, shiftSource: undefined, overtimeMinutes: undefined, rules: undefined }) === j(novOld.days[i])) && novNew.penaltyHalfDays === novOld.penaltyHalfDays && novNew.days.every((d) => d.shiftName === "General"));
check("B3", "the setting: Admin only, the 1st of a month, not in the past", !SS.setShiftRulesFrom(PRIYA, "2027-01-01", T0).ok && SS.setShiftRulesFrom(AARAV, "2027-01-15", T0).field === "date" && SS.setShiftRulesFrom(AARAV, "2026-11-01", T0).field === "date");
check("B4", "moved to 1 Jan 2027: December reads the old rules again (Neel's night of the 7th: no shift, no overtime); back to 1 Dec", SS.setShiftRulesFrom(AARAV, "2027-01-01", T0).ok && SD.shiftDayFor(NEEL, "2026-12-08", at("2026-12-20", "10:00")).rules === "old" && SD.shiftDayFor(NEEL, "2026-12-08", at("2026-12-20", "10:00")).overtimeMinutes === 0 && SS.setShiftRulesFrom(AARAV, "2026-12-01", T0).ok && SD.shiftDayFor(NEEL, "2026-12-08", at("2026-12-20", "10:00")).overtimeMinutes === 30);

// ---------- Y ----------
section("Y. Pay (Neel: Night to 20 Dec, General from the 21st; no sample days of his own)");
setNow(2027, 1, 20, 12);   // December's correction windows have all closed
const sal = PS.setSalary(AARAV, NEEL, { gross: 62000, effectiveFrom: "2026-11-01" });
const yOld = E.payFor(NEEL, 2026, 11);
check("Y1", "November (before the start month) has no shift loss of pay", sal.ok && yOld && yOld.lop.shiftDays === undefined, sal.error ?? "");
const sl = SD.shiftMonthLossOfPay(NEEL, 2026, 12), row = PS.payrollRunFor(NEEL, 2026, 12), py = E.payFor(NEEL, 2026, 12);
check("Y2", "December: payFor's shift days are the shift engine's settled days (absences on nights not worked)", py.lop.shiftDays === sl.days && sl.absent > 0, j({ shiftDays: py.lop.shiftDays, sl }));
const replaced = (row.lop.penaltyHalfDays ?? 0) * 0.5 + (row.lop.absenceDays ?? 0);
const wantDays = Math.min(row.workingDays, row.lop.days - replaced + sl.days);
check("Y3", "the old attendance part is replaced, not added to: days = old - (late half days + absences) + shift days, at the same daily rate",
  py.lop.replacedDays === replaced && py.lop.days === wantDays + (py.lop.policyDays ?? 0) && py.gross === row.monthlyGross - PAY.lossOfPayAmount(row.monthlyGross, wantDays, row.workingDays) - (py.lop.policyAmount ?? 0),
  j({ replaced, wantDays, days: py.lop.days, gross: py.gross, monthly: row.monthlyGross }));
const beforeL = SD.shiftMonthLossOfPay(NEEL, 2026, 12), before = beforeL.days;
SP.shiftCheckIn(NEEL, "office", undefined, at("2026-12-28", "09:30"));
SP.shiftCheckOut(NEEL, undefined, at("2026-12-28", "15:00"));
const halfNow = SD.shiftMonthLossOfPay(NEEL, 2026, 12);
check("Y4", "an absence turned into a half day (5 h 30 on General) costs 0.5, not 1: the month's days drop by 0.5", halfNow.days === before - 0.5 && halfNow.halfDay === beforeL.halfDay + 0.5, `${before} -> ${halfNow.days}`);
SP.shiftCheckIn(NEEL, "office", undefined, at("2026-12-29", "09:30"));
SP.shiftCheckOut(NEEL, undefined, at("2026-12-29", "17:00"));
check("Y4b", "a short day on General (7 h 30) is a half day there (no short-leave band): 0.5", SD.shiftMonthLossOfPay(NEEL, 2026, 12).days === before - 1);
for (const d of ["2026-12-30", "2026-12-22"]) { SP.shiftCheckIn(NEEL, "office", undefined, at(d, "09:50")); SP.shiftCheckOut(NEEL, undefined, at(d, "18:40")); }
const lateAt = (d, h = "09:50") => { SP.shiftCheckIn(NEEL, "office", undefined, at(d, h)); SP.shiftCheckOut(NEEL, undefined, at(d, "18:40")); };
const p2 = SD.shiftMonthLossOfPay(NEEL, 2026, 12), m2 = SD.shiftMonthFor(NEEL, 2026, 12);
check("Y5", "SH1b: the late-mark rule is ON by default, every 3: two late marks (22 and 30 Dec) cost nothing, pay or the month's view", SS.latePolicy().on === true && SS.latePolicy().every === 3 && m2.lateMarks === 2 && m2.penaltyHalfDays === 0 && p2.penaltyHalfDays === 0, j([SS.latePolicy(), m2.lateMarks]));
lateAt("2026-12-31");
const p3 = SD.shiftMonthLossOfPay(NEEL, 2026, 12), m3 = SD.shiftMonthFor(NEEL, 2026, 12);
check("Y6", "the 3rd late mark costs a half day (the month's view too): 31 Dec stops being an absence (-1) and the half day is added (+0.5)", m3.lateMarks === 3 && m3.penaltyHalfDays === 1 && p3.penaltyHalfDays === 1 && p3.days === p2.days - 1 + 0.5, j([m3.lateMarks, m3.penaltyHalfDays, p3.days, p2.days]));
check("Y7", "pay takes the penalty too (payFor's shift days include it)", E.payFor(NEEL, 2026, 12).lop.shiftDays === p3.days);
lateAt("2026-12-21"); lateAt("2026-12-24");
check("Y6b", "the 4th and 5th late marks add nothing", SD.shiftMonthFor(NEEL, 2026, 12).lateMarks === 5 && SD.shiftMonthLossOfPay(NEEL, 2026, 12).penaltyHalfDays === 1);
lateAt("2026-12-25");
const p6 = SD.shiftMonthLossOfPay(NEEL, 2026, 12);
check("Y6c", "the 6th late mark costs a second half day (21, 24 and 25 Dec stop being absences: -3, +0.5)", SD.shiftMonthFor(NEEL, 2026, 12).lateMarks === 6 && SD.shiftMonthFor(NEEL, 2026, 12).penaltyHalfDays === 2 && p6.penaltyHalfDays === 2 && p6.days === p3.days - 3 + 0.5);
check("Y8", "only an Admin sets it; every is 2 to 10; a change is dated from the day it is made", !SS.setLatePolicy(PRIYA, { on: false }).ok && SS.setLatePolicy(AARAV, { on: true, every: 1 }).field === "every" && SS.setLatePolicy(AARAV, { on: true, every: 3 }, "2026-12-23").record.from === "2026-12-23");
// a change mid-month applies from its effective date only: the 3rd late mark (24 Dec) and the 6th (25 Dec was the 6th: dates 21, 22, 24, 25, 30, 31)
const lateDates = SD.shiftMonthFor(NEEL, 2026, 12).days.filter((x) => x.status === "late").map((x) => x.date);
check("Y8a", "the late marks, in order: 21, 22, 24, 25, 30, 31 Dec (the 3rd is the 24th, the 6th the 31st)", j(lateDates) === j(["2026-12-21", "2026-12-22", "2026-12-24", "2026-12-25", "2026-12-30", "2026-12-31"]), j(lateDates));
SS.setLatePolicy(AARAV, { on: false, every: 3 }, "2026-12-31");
check("Y8b", "off from 31 Dec: the 3rd (24 Dec, before it) still costs its half day, the 6th (31 Dec, on it) doesn't", SD.shiftMonthFor(NEEL, 2026, 12).penaltyHalfDays === 1 && SD.shiftMonthLossOfPay(NEEL, 2026, 12).penaltyHalfDays === 1 && SS.latePolicy("2026-12-30").on === true && SS.latePolicy("2026-12-31").on === false);
SS.setLatePolicy(AARAV, { on: true, every: 4 }, "2026-12-25");
check("Y8c", "every 4 from 25 Dec (and off from the 31st): the 3rd (24th) keeps its half day, the 4th (25th) costs one too; the 6th isn't judged by 4", SD.shiftMonthFor(NEEL, 2026, 12).penaltyHalfDays === 2, String(SD.shiftMonthFor(NEEL, 2026, 12).penaltyHalfDays));
SS.resetShiftSettings();
SS.setLatePolicy(AARAV, { on: false, every: 3 }, "2026-12-01");
check("Y8d", "policy OFF from the start: no dock at all (6 late marks, 0 half days)", SD.shiftMonthFor(NEEL, 2026, 12).lateMarks === 6 && SD.shiftMonthFor(NEEL, 2026, 12).penaltyHalfDays === 0 && SD.shiftMonthLossOfPay(NEEL, 2026, 12).penaltyHalfDays === 0 && SD.shiftMonthLossOfPay(NEEL, 2026, 12).days === p6.days - 1);
SS.resetShiftSettings();
check("Y8e", "reset: back to the default (on, every 3)", SS.latePolicy().on === true && SS.latePolicy().every === 3);
check("Y9", "a sample person's generated days follow their shift: Ananya (Sales: Early) reads on time, with no overtime", (() => { const m = SD.shiftMonthFor(ANANYA, 2026, 12); const worked = m.days.filter((d) => d.checkIn); return worked.length > 10 && worked.every((d) => d.status === "present" && d.overtimeMinutes === 0 && (d.shiftName !== "Early" || d.checkIn < "06:11")) && worked.filter((d) => d.shiftName === "Early").length > 10; })());

// ---------- O ----------
section("O. Overtime");
const now0 = at("2027-01-05", "10:00");
setNow(2026, 12, 1, 0, 1);   // punched on the day itself (a past day would show the sample day the seed generates)
SP.shiftCheckIn(ARJUN, "office", undefined, at("2026-12-01", "09:20"));
SP.shiftCheckOut(ARJUN, undefined, at("2026-12-01", "19:20"));
setNow(2027, 1, 20, 12);
check("O1", "Arjun's 1 Dec (out 19:20): 30 min pending; it is his manager's (Sneha's) to decide, not HR's or the Admin's", (() => { const o = OT.overtimeDays(ARJUN, "2026-12-01", "2026-12-01", now0)[0]; return o?.minutes === 30 && o.status === "pending" && OT.mayDecideOvertime(SNEHA, ARJUN) && !OT.mayDecideOvertime(PRIYA, ARJUN) && !OT.mayDecideOvertime(AARAV, ARJUN); })());
check("O2", "Neel has no manager: HR or the Admin decides; nobody their own", REP.managerOf(NEEL) === null && OT.mayDecideOvertime(PRIYA, NEEL) && OT.mayDecideOvertime(AARAV, NEEL) && !OT.mayDecideOvertime(NEEL, NEEL) && !OT.mayDecideOvertime(SNEHA, NEEL));
const pp = OT.pendingOvertime(PRIYA, now0), sp = OT.pendingOvertime(SNEHA, now0);
check("O3", "pending lists: HR sees Neel's (8th: 30, 10th: 120), Sneha sees Arjun's", j(pp.filter((o) => o.userId === NEEL).map((o) => [o.date, o.minutes])) === j([["2026-12-08", 30], ["2026-12-10", 120]]) && sp.some((o) => o.userId === ARJUN && o.date === "2026-12-01") && !pp.some((o) => o.userId === ARJUN), j(pp.map((o) => [o.userId, o.date, o.minutes])));
check("O4", "a rejection needs a reason", OT.decideOvertime(PRIYA, NEEL, "2026-12-10", "rejected", "", now0).field === "note");
check("O5", "HR approves Neel's 8th (30 min); a second decision is refused", OT.decideOvertime(PRIYA, NEEL, "2026-12-08", "approved", "", now0).ok && OT.decideOvertime(AARAV, NEEL, "2026-12-08", "rejected", "Not agreed in advance", now0).error === "This overtime was already approved." && OT.allOvertimeDecisions().filter((d) => d.userId === NEEL && d.date === "2026-12-08").length === 1);
check("O6", "Sneha can't decide Neel's; HR can't decide Arjun's", !OT.decideOvertime(SNEHA, NEEL, "2026-12-10", "approved", "", now0).ok && !OT.decideOvertime(PRIYA, ARJUN, "2026-12-01", "approved", "", now0).ok);
check("O7", "rejected with a reason (Neel's 10th); Sneha approves Arjun's 1st", OT.decideOvertime(PRIYA, NEEL, "2026-12-10", "rejected", "Not pre-approved", now0).ok && OT.decideOvertime(SNEHA, ARJUN, "2026-12-01", "approved", "", now0).ok);
const recBox = JSON.parse(mem.get("officeos:attendance"));
recBox.records.find((r) => r.userId === NEEL && r.date === "2026-12-08").checkOut = "09:05";
mem.set("officeos:attendance", j(recBox));
const mo = OT.monthOvertime(NEEL, 2026, 12, now0);
check("O8", "approved minutes are fixed: the record later says 90, the approved month still says 30", OT.overtimeDays(NEEL, "2026-12-08", "2026-12-08", now0)[0].engineMinutes === 90 && mo.approved === 30 && mo.rejected === 120, j({ approved: mo.approved, rejected: mo.rejected }));
check("O9", "nothing waits once decided (HR's list has no Neel day from the 8th or 10th)", !OT.pendingOvertime(PRIYA, now0).some((o) => o.userId === NEEL && (o.date === "2026-12-08" || o.date === "2026-12-10")));
check("O10", "no overtime before the shift rules start (November's long days have none)", OT.overtimeDays(ARJUN, "2026-11-01", "2026-11-30", now0).length === 0);
const item = OT.overtimeItem(`OT:${NEEL}:2026-12-08`, now0);
check("O11", "an item by its id (the approval card's): decided, with when it began to wait (the check-out's instant, office time: 09:05 on the 9th)", item?.status === "approved" && item.requestedAt === EN.officeInstant("2026-12-09", EN.toMin("09:05")) && OT.overtimeItem("OT:nobody", now0) === null, j(item));
check("O12", "a sample person's generated day is never overtime (only stored records count)", OT.overtimeDays(ANANYA, "2026-12-01", "2026-12-31", now0).length === 0);

// ---------- C ----------
section("C. Comp-off");
check("C1", "off by default: approving overtime made no comp-off", SS.compOffRule().on === false && CO.compOffFor(NEEL, "2027-01-05").active === 0 && LP.leaveAccount(NEEL, "2027-01-05")?.types.earned.compOff === undefined);
check("C2", "only an Admin turns it on; 60 to 720 minutes a day, 7 to 365 days", !SS.setCompOff(PRIYA, { on: true }).ok && SS.setCompOff(AARAV, { on: true, minutesPerDay: 30 }).field === "minutesPerDay" && SS.setCompOff(AARAV, { on: true, minutesPerDay: 60, expiryDays: 30 }).ok);
SP.shiftCheckIn(NEEL, "office", undefined, at("2026-12-14", "22:00"));
SP.shiftCheckOut(NEEL, undefined, at("2026-12-15", "08:30"));   // 60 min overtime
const earnedBefore = LP.leaveAccount(NEEL, "2027-01-05").types.earned;
const dc = OT.decideOvertime(PRIYA, NEEL, "2026-12-14", "approved", "", now0);
check("C3", "approving 60 min with comp-off on (60 a day) makes one comp-off day, expiring 30 days on", dc.ok && dc.credits.length === 1 && dc.credits[0].earnedOn === "2027-01-05" && dc.credits[0].expiresOn === "2027-02-04");
const earnedAfter = LP.leaveAccount(NEEL, "2027-01-05").types.earned;
check("C4", "it counts in earned leave through the leave policy (available and usable +1, compOff 1)", earnedAfter.compOff === 1 && earnedAfter.available === earnedBefore.available + 1 && earnedAfter.usable === earnedBefore.usable + 1, j([earnedBefore, earnedAfter]));
check("C5", "expired on 4 Feb 2027 (it counted on the 3rd)", LP.leaveAccount(NEEL, "2027-02-03").types.earned.compOff === 1 && LP.leaveAccount(NEEL, "2027-02-04").types.earned.compOff === undefined);
SS.setCompOff(AARAV, { on: false });
check("C6", "turned off again: the day already earned stays; new approvals make none", CO.compOffFor(NEEL, "2027-01-10").active === 1);

// ---------- I ----------
section("I. An incomplete night");
SP.shiftCheckIn(NEEL, "office", undefined, at("2026-12-16", "22:00"));
const incD = SD.shiftDayFor(NEEL, "2026-12-16", at("2026-12-17", "11:30"));
check("I1", "no check-out by 11:00 next morning: incomplete (shown for HR), counted present (the old rule)", incD.incomplete && incD.status === "present");
check("I2", "the employee can't check out any more, nor complete their own day; an employee can't complete anyone's", SP.shiftCheckOutRefusal(NEEL, at("2026-12-17", "11:30"))?.code === "not-in" && !SP.completeShiftDay(NEEL, NEEL, "2026-12-16", "07:00", "Forgot", at("2026-12-17", "11:30")).ok && !SP.completeShiftDay(ARJUN, NEEL, "2026-12-16", "07:00", "Forgot", at("2026-12-17", "11:30")).ok);
const done = SP.completeShiftDay(PRIYA, NEEL, "2026-12-16", "07:05", "Forgot to check out", at("2026-12-17", "11:30"));
check("I3", "HR completes it (07:05 next morning, with a reason): present, no longer incomplete, the history says so", done.ok && !done.day.incomplete && done.day.status === "present" && A.storedRecord(NEEL, "2026-12-16").history.at(-1).action === "regularized");

// ---------- Z ----------
section("Z. Office time, whatever the machine's zone");
check("Z1", "18:30 UTC is 00:00 the next day in India", j(EN.officeNow(RealDate.UTC(2026, 11, 7, 18, 30))) === j({ date: "2026-12-08", minutes: 0 }));
check("Z2", "18:29 UTC is 23:59 the same day", j(EN.officeNow(RealDate.UTC(2026, 11, 7, 18, 29))) === j({ date: "2026-12-07", minutes: 1439 }));
check("Z3", "officeInstant is its inverse", EN.officeInstant("2026-12-08", 0) === "2026-12-07T18:30:00.000Z");
check("Z4", "whole-day maths in UTC: weekday of 7 Dec 2026 is Monday, 1 Jan 2027 a Friday", EN.weekdayOf("2026-12-07") === 1 && EN.weekdayOf("2027-01-01") === 5);

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;