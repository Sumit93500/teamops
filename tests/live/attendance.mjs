// usage: TZ=<zone> node attendance.mjs
// Data-layer tests for data/attendance-store.js (staged copy in ./js), with the
// real leave, holiday and user modules. "Today" starts pinned to Mon 28 Sep 2026,
// 10:00 local time; setNow() moves the clock to punch in and out on other days.

// ---- in-memory localStorage (core/storage.js reads the global) ----
class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  key(i) { return [...this.map.keys()][i] ?? null; }
  get length() { return this.map.size; }
}
globalThis.localStorage = new MemoryStorage();
console.error = () => {};   // storage.js logs expected parse failures

// ---- movable clock (local time) ----
const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [NOW])); }
  static now() { return NOW; }
};
const BASE = () => setNow(2026, 9, 28, 10, 0);    // Mon 28 Sep 2026, 10:00
const LATER = () => setNow(2026, 10, 31, 12, 0);  // Sat 31 Oct 2026: every October working day is in the past
BASE();

const A = await import("./js/data/attendance-store.js");
const L = await import("./js/data/leave-store.js");
const H = await import("./js/data/holidays.js");
const HOL_ACTOR = "EMP-1003";   // Round 10W (signature; was addHoliday(fields) / removeHoliday(id)): the holiday writes take the acting person's id first and check their record (holidays:manage); every call here passes HR's (Priya). The guard itself: holiguard.mjs
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const raw = (key) => JSON.parse(localStorage.getItem(`officeos:${key}`));
const fresh = () => { L.resetLeaveData(); S.resetDemoData(); A.resetAttendanceData(); BASE(); };

const hm = (t) => t.split(":").map(Number);
// Check in at `inT` (and out at `outT`) on `date`, by moving the clock.
function punch(userId, date, inT, outT, mode) {
  const [y, m, d] = date.split("-").map(Number);
  setNow(y, m, d, ...hm(inT));
  const a = A.checkIn(userId, mode);
  let b = null;
  if (outT) { setNow(y, m, d, ...hm(outT)); b = A.checkOut(userId); }
  return { a, b };
}
const day = (userId, date) => A.dayFor(userId, date);
const brief = (d) => (d ? `${d.status}${d.checkIn ? ` ${d.checkIn}-${d.checkOut ?? "…"}` : ""}${d.minutesLate ? ` late ${d.minutesLate}m` : ""}${d.minutesWorked !== null ? ` worked ${d.minutesWorked}m` : ""}` : "null");
// Apply for leave and have it approved (HR decides, Admin for HR's own).
// Round 8C (setup): a request with a manager on file is approved by the manager first.
function approvedLeave(userId, fields, M = L) {   // Round 10V: M, the leave store to use (default the live one)
  // Round 8F (setup): leave can't be dated more than 7 days back, so a request for a past date is filed on its first
  // day, and the clock put back.
  const saved = NOW;
  const [fy, fm, fd] = fields.from.split("-").map(Number);
  if (new RealDate(fy, fm - 1, fd, 10, 0, 0).getTime() < NOW - 7 * 864e5) setNow(fy, fm, fd, 10, 0);
  const r = M.applyLeave(userId, { reason: "test", ...fields });
  NOW = saved;
  if (!r.ok || r.record.status === "approved") return r;
  if (r.record.stage === "manager") { const m = S.getUser(r.record.managerId); M.decideLeave(r.record.id, m.id, m.role, "approve"); }
  const decider = userId === "EMP-1003" ? ["EMP-1001", "admin"] : ["EMP-1003", "hr"];
  return M.decideLeave(r.record.id, decider[0], decider[1], "approve");
}
const monthDays = (userId, y, m) => A.monthFor(userId, y, m).days;

console.log(`TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);

// Sep 2026 working days before Mon 28 Sep, newest first: 25 24 23 22 21 18 17 16 15 14 11 10 9 8 (…4 3 2 1)
const W = ["2026-09-25", "2026-09-24", "2026-09-23", "2026-09-22", "2026-09-21", "2026-09-18", "2026-09-17",
  "2026-09-16", "2026-09-15", "2026-09-14", "2026-09-11", "2026-09-10", "2026-09-09", "2026-09-08"];

// =====================================================================
section("seed: generated around today (Mon 28 Sep 2026, 10:00)");
fresh();
A.dayFor("EMP-1105", "2026-09-28");   // first read creates the sample data
const box = raw("attendance");
const recs = box.records;
const ACTIVE = ["EMP-1001", "EMP-1003", "EMP-1008", "EMP-1017", "EMP-1023", "EMP-1029", "EMP-1042", "EMP-1088", "EMP-1105"];
const dates = [...new Set(recs.map((r) => r.date))].sort();
check("S1", "records only for the 9 active real users; none for Divya (inactive) or anyone else", recs.every((r) => ACTIVE.includes(r.userId)) && !recs.some((r) => r.userId === "EMP-1061"),
  `${recs.length} records, users ${[...new Set(recs.map((r) => r.userId))].length}`);
check("S2", "window: every working day from 1 Sep (start of this month, >= 14 working days) to today; nothing on weekends, holidays or in the future",
  dates[0] === "2026-09-01" && dates.at(-1) === "2026-09-28" && dates.length === 20 && recs.every((r) => !H.isDayOff(r.date) && r.date <= "2026-09-28"),
  `${dates[0]} .. ${dates.at(-1)}, ${dates.length} dates`);
const todayRecs = recs.filter((r) => r.date === "2026-09-28");
check("S3", "today: only check-ins already past at 10:00 (Rohan 09:12, Sneha 09:20, Ananya 09:31), none for the 4 sign-in identities, Vikram's 10:24 not yet",
  j(todayRecs.map((r) => `${r.userId} ${r.checkIn} ${r.checkOut}`).sort()) === j(["EMP-1017 09:31 null", "EMP-1029 09:20 null", "EMP-1042 09:12 null"]),
  todayRecs.map((r) => `${r.userId} ${r.checkIn}`).join(", "));
check("S4", "stored fields only: userId, date, checkIn, checkOut, mode, source, original times, history (+ id)",
  recs.every((r) => j(Object.keys(r).sort()) === j(["checkIn", "checkOut", "date", "history", "id", "mode", "originalCheckIn", "originalCheckOut", "source", "userId"])) && recs.every((r) => r.source === "seed"),
  j(Object.keys(recs[0])));
check("S5", "ids AT-1.. in date order per person; nextNum after the last", recs[0].id === "AT-1" && box.nextNum === recs.length + 1, `${recs[0].id}, nextNum ${box.nextNum}`);

const meera = monthDays("EMP-1023", 2026, 9);
check("S6", "Meera follows her approved earned leave (21 Sep – 1 Oct): on-leave 21–25 and 28 Sep, no records then, present before",
  ["21", "22", "23", "24", "25", "28", "29", "30"].every((d) => meera[Number(d) - 1].status === "on-leave") && !recs.some((r) => r.userId === "EMP-1023" && r.date >= "2026-09-21")
  && meera.slice(0, 18).filter((d) => !["weekend"].includes(d.status)).every((d) => d.status === "present"),
  meera.filter((d) => d.status === "on-leave").map((d) => d.date.slice(8)).join(","));
check("S7", "Rohan's WFH on 16 Sep was cancelled, so he worked from the office; Kabir chose WFH that day (free choice)",
  day("EMP-1042", "2026-09-16").mode === "office" && day("EMP-1008", "2026-09-16").mode === "wfh", `${day("EMP-1042", "2026-09-16").mode} / ${day("EMP-1008", "2026-09-16").mode}`);
check("S8", "Sneha, Rohan and Arjun: their only leave around now is pending (5, 13–15, 14 Oct), so nothing blocks September",
  ["EMP-1029", "EMP-1042", "EMP-1105"].every((u) => monthDays(u, 2026, 9).every((d) => d.status !== "on-leave" && !d.conflict)));

const arjun24 = day("EMP-1105", "2026-09-24"), arjun22 = day("EMP-1105", "2026-09-22");
const rg101 = A.getRegularization("RG-101");
check("S9", "Arjun 24 Sep: a regularized late day (10:12 corrected to 09:30, approved by Priya on 25 Sep) -> present",
  arjun24.status === "present" && arjun24.regularized && arjun24.checkIn === "09:30" && arjun24.originalCheckIn === "10:12"
  && rg101.status === "approved" && rg101.history.at(-1).byUserId === "EMP-1003" && raw("attendance").records.find((r) => r.id === arjun24.recordId).history.at(-1).regularizationId === "RG-101",
  `${brief(arjun24)}; RG-101 ${rg101.status}`);
check("S10", "Arjun 22 Sep: a plain late day (10:05, 35 min after 09:30), no request", arjun22.status === "late" && arjun22.minutesLate === 35 && !arjun22.regularization, brief(arjun22));
const regs = A.allRegularizations();
const pending = regs.filter((r) => r.status === "pending");
check("S11", "5 seeded corrections: 3 pending (Vikram 23 Sep, Sneha 21 Sep, Ananya 18 Sep), Arjun's approved, Rohan's rejected with a note",
  j(pending.map((r) => `${r.userId} ${r.date} ${r.issue}`)) === j(["EMP-1088 2026-09-23 late-arrival", "EMP-1029 2026-09-21 late-arrival", "EMP-1017 2026-09-18 missed-check-out"])
  && regs.find((r) => r.id === "RG-105").status === "rejected" && regs.find((r) => r.id === "RG-105").history.at(-1).note !== "",
  regs.map((r) => `${r.id} ${r.status}`).join(", "));
check("S12", "each pending request matches its record: the late ones' recordedTime is the check-in; Ananya's record has no check-out",
  pending.every((r) => { const d = day(r.userId, r.date); return r.issue === "late-arrival" ? d.checkIn === r.recordedTime && d.status === "late" : d.checkOut === null && d.incomplete; }));
check("S13", "first step from managerFor(), as with leave: Arjun and Rohan -> Sneha (manager stage); the rest -> HR",
  regs.every((r) => r.managerId === L.managerFor(r.userId)) && A.getRegularization("RG-102").stage === "hr" && A.getRegularization("RG-101").managerId === "EMP-1029",
  regs.map((r) => `${r.id}:${r.managerId ?? "HR"}`).join(" "));
check("S14", "Vikram absent on 11 Sep (no record); Ananya a half day on 14 Sep (09:20–13:40); Ananya 18 Sep incomplete (no check-out)",
  day("EMP-1088", "2026-09-11").status === "absent" && day("EMP-1017", "2026-09-14").status === "half-day" && day("EMP-1017", "2026-09-18").incomplete,
  `${brief(day("EMP-1088", "2026-09-11"))} | ${brief(day("EMP-1017", "2026-09-14"))} | ${brief(day("EMP-1017", "2026-09-18"))}`);
check("S15", "no seeded day conflicts with approved leave", ACTIVE.every((u) => monthDays(u, 2026, 9).every((d) => !d.conflict)));

const firstBox = localStorage.getItem("officeos:attendance"), firstRegs = localStorage.getItem("officeos:regularizations");
A.resetAttendanceData(); A.dayFor("EMP-1105", "2026-09-28");
check("S16", "deterministic: reset and re-seed at the same moment gives exactly the same data", localStorage.getItem("officeos:attendance") === firstBox && localStorage.getItem("officeos:regularizations") === firstRegs);

// An approved WFH day inside the window is seeded as wfh.
fresh();
approvedLeave("EMP-1017", { type: "wfh", from: "2026-09-10", to: "2026-09-10" });
A.dayFor("EMP-1017", "2026-09-10");
check("S17", "an approved WFH day inside the window is seeded with mode wfh", day("EMP-1017", "2026-09-10").mode === "wfh" && day("EMP-1017", "2026-09-10").suggestedMode === "wfh");

// Seeding on another day moves the window.
L.resetLeaveData(); S.resetDemoData(); A.resetAttendanceData(); setNow(2027, 3, 15, 10, 0);
A.dayFor("EMP-1105", "2027-03-15");
const later = [...new Set(raw("attendance").records.map((r) => r.date))].sort();
check("S18", "seeding on Mon 15 Mar 2027 builds the window around that day (14 working days back into February)",
  later[0] === "2027-02-23" && later.at(-1) === "2027-03-15" && later.length === 15 && A.allRegularizations().every((r) => r.date >= "2027-02-23"), `${later[0]} .. ${later.at(-1)}`);

// =====================================================================
section("status derivation");
fresh(); A.dayFor("EMP-1105", "2026-09-28");
punch("EMP-1008", "2026-10-05", "09:45", "18:00");
punch("EMP-1008", "2026-10-06", "09:46", "18:30");
LATER();
check("D1", "check-in at 09:45 is on time: present, minutesLate 0", day("EMP-1008", "2026-10-05").status === "present" && day("EMP-1008", "2026-10-05").minutesLate === 0, brief(day("EMP-1008", "2026-10-05")));
check("D2", "check-in at 09:46 is late: minutesLate 16 (counted from the 09:30 start)", day("EMP-1008", "2026-10-06").status === "late" && day("EMP-1008", "2026-10-06").minutesLate === 16, brief(day("EMP-1008", "2026-10-06")));
check("D3", "hours: 09:45–18:00 = 495 min, hours 8.3 (one decimal)", day("EMP-1008", "2026-10-05").minutesWorked === 495 && day("EMP-1008", "2026-10-05").hours === 8.3);
punch("EMP-1008", "2026-10-07", "09:30", "17:29");
punch("EMP-1008", "2026-10-08", "09:30", "13:30");
punch("EMP-1008", "2026-10-09", "09:30", "13:29");
punch("EMP-1008", "2026-10-12", "09:30", "17:30");
LATER();
check("D4", "7h59 -> half-day; exactly 4h -> half-day; 3h59 -> absent (with a record, still expected); exactly 8h -> present",
  day("EMP-1008", "2026-10-07").status === "half-day" && day("EMP-1008", "2026-10-08").status === "half-day" && day("EMP-1008", "2026-10-09").status === "absent"
  && day("EMP-1008", "2026-10-09").expected && day("EMP-1008", "2026-10-12").status === "present",
  ["07", "08", "09", "12"].map((d) => brief(day("EMP-1008", `2026-10-${d}`))).join(" | "));

// Half-day leave: the other half is a working half (starts 14:00, or ends 14:00).
approvedLeave("EMP-1008", { type: "casual", from: "2026-10-13", to: "2026-10-13", duration: "first-half" });
approvedLeave("EMP-1008", { type: "casual", from: "2026-10-14", to: "2026-10-14", duration: "first-half" });
approvedLeave("EMP-1008", { type: "casual", from: "2026-10-15", to: "2026-10-15", duration: "second-half" });
approvedLeave("EMP-1008", { type: "casual", from: "2026-10-16", to: "2026-10-16", duration: "second-half" });
const halfIn = punch("EMP-1008", "2026-10-13", "14:15", "18:15");
punch("EMP-1008", "2026-10-14", "14:16", "18:30");
punch("EMP-1008", "2026-10-15", "09:30", "13:30");
punch("EMP-1008", "2026-10-16", "09:30", "13:29");
LATER();
check("D5", "first-half leave: check-in allowed; 14:15 is on time, 4h worked -> present", halfIn.a.ok && day("EMP-1008", "2026-10-13").status === "present" && day("EMP-1008", "2026-10-13").halfDayLeave === "first-half",
  brief(day("EMP-1008", "2026-10-13")));
check("D6", "first-half leave: 14:16 -> late by 16 min (from 14:00)", day("EMP-1008", "2026-10-14").status === "late" && day("EMP-1008", "2026-10-14").minutesLate === 16, brief(day("EMP-1008", "2026-10-14")));
check("D7", "second-half leave: 09:30–13:30 (4h) -> present; 09:30–13:29 -> absent", day("EMP-1008", "2026-10-15").status === "present" && day("EMP-1008", "2026-10-16").status === "absent",
  `${brief(day("EMP-1008", "2026-10-15"))} | ${brief(day("EMP-1008", "2026-10-16"))}`);

BASE();
check("D8", "no record: today before 18:30 -> not-yet; a future working day -> not-yet; a past working day -> absent",
  day("EMP-1008", "2026-09-28").status === "not-yet" && day("EMP-1008", "2026-09-29").status === "not-yet" && day("EMP-1088", "2026-09-11").status === "absent");
setNow(2026, 9, 28, 18, 29); const at1829 = day("EMP-1008", "2026-09-28").status;
setNow(2026, 9, 28, 18, 30); const at1830 = day("EMP-1008", "2026-09-28").status;
BASE();
check("D9", "today with no check-in turns absent at the end of the shift (18:29 not-yet, 18:30 absent)", at1829 === "not-yet" && at1830 === "absent", `${at1829} / ${at1830}`);
check("D10", "approved full-day leave -> on-leave, not expected", day("EMP-1023", "2026-09-22").status === "on-leave" && !day("EMP-1023", "2026-09-22").expected && day("EMP-1023", "2026-09-22").leave.id === "LV-2172");
LATER();
check("D11", "pending leave changes nothing: Arjun's pending 5 Oct -> a computed present day once past (Round 8B; was absent), not on-leave", day("EMP-1105", "2026-10-05").status === "present" && day("EMP-1105", "2026-10-05").leave === null);
BASE();
check("D12", "weekend -> weekend; national holiday (2 Oct) -> holiday with its name; company holiday (20 Oct) -> holiday",
  day("EMP-1008", "2026-10-03").status === "weekend" && day("EMP-1008", "2026-10-02").status === "holiday" && day("EMP-1008", "2026-10-02").holiday.name === "Gandhi Jayanti"
  && day("EMP-1008", "2026-10-20").status === "holiday");
setNow(2026, 12, 28, 10, 0);
const xmas = day("EMP-1008", "2026-12-25");
BASE();
check("D13", "optional holiday (Christmas, Fri 25 Dec) is a working day: expected, a computed present day once past (Round 8B; was absent), holiday shown as optional",
  xmas.status === "present" && xmas.expected && xmas.holiday.kind === "optional", brief(xmas));
check("D14", "a holiday on a weekend shows as holiday (Independence Day, Sat 15 Aug)", day("EMP-1008", "2026-08-15").status === "holiday");
check("D15", "before attendance was recorded at all (31 Aug, the seed starts 1 Sep) -> no-data, never absent", day("EMP-1008", "2026-08-31").status === "no-data" && !day("EMP-1008", "2026-08-31").expected);

// Check-in wins over leave approved afterwards.
punch("EMP-1008", "2026-10-21", "09:20", "18:20");
// Round 10V (decision; was the leave sent and approved through the live store): leave can't be sent for a day already
// checked in on any more (workedday.mjs A1-A14), so the live store's refusal is pinned, and the conflict day itself is
// now only data made before 10V: written through the pre-10V leave store (js-pre10V)
const L10V0 = await import("./js-pre10V/data/leave-store.js");
const liveRefusal = approvedLeave("EMP-1008", { type: "casual", from: "2026-10-21", to: "2026-10-21" });
const lateLeave = approvedLeave("EMP-1008", { type: "casual", from: "2026-10-21", to: "2026-10-21" }, L10V0);
LATER();
const clash = day("EMP-1008", "2026-10-21");
check("D16", "leave over an existing check-in is refused now (round 10V); made before 10V, the check-in wins (present), conflict:true, leave shown", liveRefusal.error === "You checked in on 2026-10-21, so leave can't cover that day. If the check-in times are wrong, ask for a correction instead." && lateLeave.ok && clash.status === "present" && clash.conflict && clash.leave.type === "casual",
  `${brief(clash)} conflict=${clash.conflict}`);
check("D17", "summaryFor that day counts Kabir as present, not on leave, and 1 conflict", A.summaryFor("2026-10-21").conflicts === 1 && A.teamFor("2026-10-21").find((d) => d.userId === "EMP-1008").status === "present");

// A new holiday changes a day without touching records.
// Round 10O (behaviour; was a plain H.removeHoliday() with the clock at LATER, 31 Oct): a holiday already past can't be
// removed now (holileave.mjs B1 / B2), so each removal here happens on the holiday's own day, which is still allowed,
// and the clock goes back to LATER.
const removeOnItsDay = (id, iso) => { const [y, m, dd] = iso.split("-").map(Number); setNow(y, m, dd, 8, 0); const r = H.removeHoliday(HOL_ACTOR, id); LATER(); return r; };
const before22 = day("EMP-1008", "2026-10-22").status;
const hol = H.addHoliday(HOL_ACTOR, { date: "2026-10-22", name: "Office closed", kind: "company" });
const with22 = day("EMP-1008", "2026-10-22");
const refused22 = H.removeHoliday(HOL_ACTOR, hol.record.id);   // 31 Oct: 22 Oct is past
const removed22 = removeOnItsDay(hol.record.id, "2026-10-22");
const after22 = day("EMP-1008", "2026-10-22").status;
// Round 10O (behaviour; was "…removing it turns it back"): removing it is refused once the day has passed; removed on the day itself, it turns back
check("D18", "adding a company holiday turns a working day into holiday; removing it is refused once the day has passed, and removed on the day itself it turns back (Round 8B: a computed present day; was absent)",
  before22 === "present" && with22.status === "holiday" && !with22.expected && !refused22.ok && removed22.ok && after22 === "present",
  `${before22} -> ${with22.status} -> ${after22} (later: ${refused22.ok ? "removed" : refused22.error})`);
const optHol = H.addHoliday(HOL_ACTOR, { date: "2026-10-22", name: "Optional day", kind: "optional" });
check("D19", "an optional holiday added on that day leaves it a working day (Round 8B: computed present; was absent)", day("EMP-1008", "2026-10-22").status === "present" && day("EMP-1008", "2026-10-22").holiday.kind === "optional");
removeOnItsDay(optHol.record.id, "2026-10-22");   // Round 10O (was H.removeHoliday() at LATER, now refused): on its day
punch("EMP-1008", "2026-10-23", "09:10", "18:10");
LATER();
const hol23 = H.addHoliday(HOL_ACTOR, { date: "2026-10-23", name: "Late holiday", kind: "company" });
check("D20", "a holiday added over a day with a check-in keeps the check-in (present) and shows the holiday", day("EMP-1008", "2026-10-23").status === "present" && day("EMP-1008", "2026-10-23").holiday.name === "Late holiday");
removeOnItsDay(hol23.record.id, "2026-10-23");   // Round 10O (was H.removeHoliday() at LATER, now refused): on its day
const recordsBefore = localStorage.getItem("officeos:attendance");

// Approving leave changes a day without touching records.
const before26 = day("EMP-1008", "2026-10-26").status;
approvedLeave("EMP-1008", { type: "sick", from: "2026-10-26", to: "2026-10-26" });
const rejected = L.applyLeave("EMP-1008", { type: "casual", from: "2026-10-27", to: "2026-10-27", reason: "x" });
L.decideLeave(rejected.record.id, "EMP-1003", "hr", "reject", "No cover");
check("D21", "approving leave turns a working day into on-leave; a rejected request leaves it as it was; no attendance record was written (Round 8B: computed present; was absent)",
  before26 === "present" && day("EMP-1008", "2026-10-26").status === "on-leave" && day("EMP-1008", "2026-10-27").status === "present" && localStorage.getItem("officeos:attendance") === recordsBefore);

// WFH: free choice, an approved WFH day pre-selects it.
BASE();
L.decideLeave("LV-2211", "EMP-1001", "admin", "approve");   // Priya's WFH on Wed 7 Oct
L.decideLeave("LV-2211", "EMP-1001", "admin", "approve");   // Round 8C (setup): Aarav is her manager and the HR-stage approver (the known double approval)
check("D22", "approved WFH day: suggestedMode wfh, still a working day (not-yet)", day("EMP-1003", "2026-10-07").suggestedMode === "wfh" && day("EMP-1003", "2026-10-07").status === "not-yet");
const wfhIn = punch("EMP-1003", "2026-10-07", "09:10");
approvedLeave("EMP-1003", { type: "wfh", from: "2026-10-08", to: "2026-10-08" });
const officeIn = punch("EMP-1003", "2026-10-08", "09:10", null, "office");
const aaravWfh = punch("EMP-1001", "2026-10-09", "09:10", null, "wfh");
check("D23", "check-in with no mode on a WFH day stores wfh; choosing office anyway is allowed; anyone may choose wfh on any day",
  wfhIn.a.ok && wfhIn.a.record.mode === "wfh" && officeIn.a.ok && officeIn.a.record.mode === "office" && aaravWfh.a.record.mode === "wfh" && day("EMP-1001", "2026-10-02").suggestedMode === "office");

// In progress and incomplete.
BASE();
const rohanNow = day("EMP-1042", "2026-09-28");
check("D24", "today, checked in, not out: inProgress, hours so far (09:12 -> 10:00 = 48 min, 0.8 h), status from the check-in", rohanNow.inProgress && rohanNow.minutesWorked === 48 && rohanNow.hours === 0.8 && rohanNow.status === "present", brief(rohanNow));
check("D25", "an earlier day with no check-out: incomplete, status from the check-in, no hours", day("EMP-1017", "2026-09-18").incomplete && day("EMP-1017", "2026-09-18").status === "present" && day("EMP-1017", "2026-09-18").hours === null);
check("D26", "derived values are never stored (no status, hours or minutesLate in storage)", raw("attendance").records.every((r) => !("status" in r) && !("hours" in r) && !("minutesLate" in r)));

check("D27", "inactive or unknown person, or a bad date: dayFor and monthFor return null", day("EMP-1061", "2026-09-28") === null && day("EMP-9999", "2026-09-28") === null && day("EMP-1008", "2026-02-30") === null
  && A.monthFor("EMP-1061", 2026, 9) === null);
const deact = S.deactivateUser(USER_ACTOR("admin", "EMP-1042"), "EMP-1042", LEAVING_11Y());
const teamWithout = A.teamFor("2026-09-25").map((d) => d.userId);
const totalWithout = A.summaryFor("2026-09-25").total;
S.reactivateUser(USER_ACTOR("admin", "EMP-1042"), "EMP-1042");
check("D28", "deactivating someone (Rohan) takes them out of teamFor and summaryFor (never counted absent); reactivating brings them back",
  deact.ok && !teamWithout.includes("EMP-1042") && totalWithout === 8 && A.summaryFor("2026-09-25").total === 9, `${totalWithout} -> ${A.summaryFor("2026-09-25").total}`);
check("D29", "Meera's profile status is 'on-leave' but she's tracked from her leave requests (present on 11 Sep)", S.getUser("EMP-1023").status === "on-leave" && day("EMP-1023", "2026-09-11").status === "present");

// =====================================================================
section("check in / check out rules");
fresh(); A.dayFor("EMP-1105", "2026-09-28");
setNow(2026, 10, 3, 10, 0);
const wk = A.checkIn("EMP-1008", "office");
setNow(2026, 10, 2, 10, 0);
const nat = A.checkIn("EMP-1008", "office");
setNow(2026, 10, 20, 10, 0);
const comp = A.checkIn("EMP-1008", "office");
setNow(2026, 12, 25, 9, 30);
const opt = A.checkIn("EMP-1008", "office");
check("K1", "blocked on a weekend, a national holiday and a company holiday", !wk.ok && /weekend/.test(wk.error) && !nat.ok && /holiday/.test(nat.error) && !comp.ok && /holiday/.test(comp.error), `${wk.error} | ${nat.error}`);
check("K2", "allowed on an optional holiday", opt.ok && opt.record.date === "2026-12-25");
BASE();
const onLeave = A.checkIn("EMP-1023", "office");
check("K3", "blocked on a day of approved full-day leave (Meera today)", !onLeave.ok && /leave/.test(onLeave.error), onLeave.error);
const inactive = A.checkIn("EMP-1061", "office"), nobody = A.checkIn("EMP-9999", "office");
check("K4", "blocked for an inactive person and an unknown id", !inactive.ok && /inactive/.test(inactive.error) && !nobody.ok, `${inactive.error} | ${nobody.error}`);
const first = A.checkIn("EMP-1105", "office"), second = A.checkIn("EMP-1105", "wfh");
check("K5", "check-in stores today at the current local time; a second check-in is refused", first.ok && first.record.date === "2026-09-28" && first.record.checkIn === "10:00" && !second.ok && second.error === "You already checked in today at 10:00.",
  second.error);
check("K6", "the new record: source punch, mode as chosen, history 'checked-in' by the person; result carries the derived day",
  first.record.source === "punch" && first.record.mode === "office" && first.record.history.length === 1 && first.record.history[0].action === "checked-in" && first.record.history[0].byUserId === "EMP-1105"
  && first.day.status === "late" && first.day.minutesLate === 30, brief(first.day));
const noIn = A.checkOut("EMP-1008");
check("K7", "check-out without a check-in is refused", !noIn.ok && noIn.error === "Check in first.");
setNow(2026, 9, 28, 18, 45);
const out1 = A.checkOut("EMP-1105"), out2 = A.checkOut("EMP-1105");
check("K8", "check-out records the time and a history entry; a second check-out is refused", out1.ok && out1.record.checkOut === "18:45" && out1.record.history.at(-1).action === "checked-out" && !out2.ok && /already checked out/.test(out2.error),
  out2.error);
BASE();
const badMode = A.checkIn("EMP-1008", "remote");
check("K9", "a mode other than office / wfh is refused on the mode field", !badMode.ok && badMode.field === "mode", badMode.error);
setNow(2026, 10, 13, 9, 0);
const pendingDay = A.checkIn("EMP-1042", "office");
check("K10", "pending leave doesn't block check-in (Rohan's pending 13 Oct)", pendingDay.ok);
check("K11", "a day with a first-half leave allows check-in (D5 above)", halfIn.a.ok);
BASE();

// =====================================================================
section("regularization: asking");
fresh(); A.dayFor("EMP-1105", "2026-09-28");
const ask = (userId, f) => A.requestRegularization(userId, { reason: "test", ...f });
const e = (r) => `${r.field ?? "-"}: ${r.error}`;
const r1 = ask("EMP-1105", { issue: "oops", date: "2026-09-22", time: "09:30" });
const r2 = ask("EMP-1105", { issue: "late-arrival", date: "2026-09-31", time: "09:30" });
const r3 = ask("EMP-1105", { issue: "late-arrival", date: "2026-09-29", time: "09:30" });
const r4 = ask("EMP-1105", { issue: "late-arrival", date: "2026-09-22", time: "9:30" });
const r5 = ask("EMP-1105", { issue: "late-arrival", date: "2026-09-22", time: "24:00" });
const r6 = A.requestRegularization("EMP-1105", { issue: "late-arrival", date: "2026-09-22", time: "09:30", reason: "   " });
check("R1", "fields checked in order: issue, date (real, not future), time (HH:MM), reason",
  r1.field === "issue" && r2.field === "date" && r3.field === "date" && /hasn't happened/.test(r3.error) && r4.field === "time" && r5.field === "time" && r6.field === "reason",
  [r1, r2, r3, r4, r6].map(e).join(" | "));
setNow(2026, 9, 18, 10, 0);
const in7 = ask("EMP-1088", { issue: "missed-check-in", date: "2026-09-11", time: "09:10" });
setNow(2026, 9, 19, 10, 0);
const in8 = ask("EMP-1088", { issue: "missed-check-in", date: "2026-09-12", time: "09:10" });
const in8b = ask("EMP-1088", { issue: "missed-check-in", date: "2026-09-11", time: "09:10" });
BASE();
check("R2", "window: 7 days back is allowed (11 Sep asked on 18 Sep); 8 days back is refused", in7.ok && !in8b.ok && in8b.field === "date" && /within 7 days/.test(in8b.error), `${e(in8b)}`);
check("R3", "weekend, holiday and full-leave days are refused (nothing was expected)", !in8.ok && in8.field === "date" && /No attendance/.test(in8.error)
  && ask("EMP-1023", { issue: "missed-check-in", date: "2026-09-25", time: "09:30" }).error === "You were on approved leave that day.", e(in8));
const la1 = ask("EMP-1088", { issue: "late-arrival", date: "2026-09-25", time: "09:00" });
const la2 = ask("EMP-1105", { issue: "late-arrival", date: "2026-09-22", time: "10:05" });
const la3 = ask("EMP-1008", { issue: "late-arrival", date: "2026-09-25", time: "09:00" });
const noInDay = ask("EMP-1088", { issue: "late-arrival", date: "2026-09-28", time: "09:30" });
check("R4", "late arrival: the corrected time must be earlier than the check-in; the day must have been late; there must be a check-in",
  la2.field === "time" && la3.field === "issue" && /weren't marked late/.test(la3.error) && noInDay.field === "issue" && /no check-in/.test(noInDay.error),
  [la1, la2, la3, noInDay].map(e).join(" | "));
const mi = ask("EMP-1105", { issue: "missed-check-in", date: "2026-09-22", time: "09:20" });
const mo1 = ask("EMP-1088", { issue: "missed-check-out", date: "2026-09-28", time: "18:00" });
const mo2 = ask("EMP-1105", { issue: "missed-check-out", date: "2026-09-22", time: "18:00" });
const mo3 = ask("EMP-1042", { issue: "missed-check-out", date: "2026-09-28", time: "18:00" });
check("R5", "missed check-in refused when there is one; missed check-out needs a check-in without a check-out, and not today",
  mi.field === "issue" && /Choose Late arrival/.test(mi.error) && mo1.field === "issue" && mo2.field === "issue" && /already recorded/.test(mo2.error) && mo3.field === "date" && /still check out today/.test(mo3.error),
  [mi, mo1, mo2, mo3].map(e).join(" | "));
const dup = ask("EMP-1088", { issue: "late-arrival", date: "2026-09-23", time: "09:40" });
check("R6", "one pending request per person per date", !dup.ok && dup.field === "date" && /already have a correction waiting/.test(dup.error), e(dup));
check("R7", "inactive and unknown people are refused", /inactive/.test(ask("EMP-1061", { issue: "missed-check-in", date: "2026-09-25", time: "09:30" }).error) && !ask("EMP-9999", { issue: "missed-check-in", date: "2026-09-25", time: "09:30" }).ok);
const arjunReq = ask("EMP-1105", { issue: "late-arrival", date: "2026-09-22", time: "09:40" });
check("R8", "a valid request: pending, first step Arjun's manager (Sneha), recordedTime 10:05, sent today, history 'applied'",
  arjunReq.ok && arjunReq.record.status === "pending" && arjunReq.record.stage === "manager" && arjunReq.record.managerId === "EMP-1029" && arjunReq.record.recordedTime === "10:05"
  && arjunReq.record.appliedOn === "2026-09-28" && arjunReq.record.history[0].decision === "applied" && arjunReq.record.id === "RG-107", j(arjunReq.record));
check("R9", "asking changes nothing in the attendance record", day("EMP-1105", "2026-09-22").checkIn === "10:05" && day("EMP-1105", "2026-09-22").regularization.status === "pending");

// =====================================================================
section("regularization: deciding");
const pendingIds = (u, role) => A.pendingRegularizations(u, role).map((r) => r.id).join(",");
check("R10", "pendingRegularizations follow the chain (Round 8C; was: HR and Admin see every pending request, managers none): HR and Admin the HR-stage ones (no manager on file), Sneha her report Arjun's RG-107; a role that isn't the decider's own, Finance and other employees nothing",
  pendingIds("EMP-1003", "hr") === "RG-102,RG-103,RG-104,RG-106" && pendingIds("EMP-1001", "admin") === "RG-102,RG-103,RG-104,RG-106"
  && pendingIds("EMP-1029", "emp") === "RG-107" && pendingIds("EMP-1088", "hr") === "" && pendingIds("EMP-1008", "fin") === "" && pendingIds("EMP-1105", "emp") === "",
  `hr: ${pendingIds("EMP-1003", "hr")}`);
const d1 = A.decideRegularization("RG-102", "EMP-1008", "fin", "approve");
const d2 = A.decideRegularization("RG-102", "EMP-1105", "emp", "approve");
const d3 = A.decideRegularization("RG-102", "EMP-1008", "hr", "approve");
const d4 = A.decideRegularization("RG-102", "EMP-1003", "hr", "maybe");
const d5 = A.decideRegularization("RG-102", "EMP-1003", "hr", "reject", "  ");
const d6 = A.decideRegularization("RG-999", "EMP-1003", "hr", "approve");
check("R11", "refused: Finance, an employee, a role that isn't the person's, an unknown decision, a reject with a blank note (field note), an unknown id",
  !d1.ok && !d2.ok && !d3.ok && !d4.ok && d5.field === "note" && !d6.ok && A.getRegularization("RG-102").status === "pending", [d1, d3, d5].map(e).join(" | "));
setNow(2026, 9, 29, 10, 30); A.checkIn("EMP-1003", "office");
setNow(2026, 9, 29, 11, 0);
const priyaReq = ask("EMP-1003", { issue: "late-arrival", date: "2026-09-29", time: "09:30" });
const own = A.decideRegularization(priyaReq.record.id, "EMP-1003", "hr", "approve");
A.decideRegularization(priyaReq.record.id, "EMP-1001", "admin", "approve");   // Round 8C (setup): Aarav as her manager first (the known double approval)
const byAdmin = A.decideRegularization(priyaReq.record.id, "EMP-1001", "admin", "approve");
BASE();
check("R12", "nobody decides their own request (Priya); an Admin can decide it", !own.ok && /your own/.test(own.error) && byAdmin.ok && day("EMP-1003", "2026-09-29").checkIn === "09:30", e(own));

const vikBefore = A.monthFor("EMP-1088", 2026, 9).lateMarks;
const ok1 = A.decideRegularization("RG-102", "EMP-1003", "hr", "approve");
const vik23 = day("EMP-1088", "2026-09-23");
const vikRec = raw("attendance").records.find((r) => r.id === vik23.recordId);
check("R13", "approving a late arrival: check-in becomes 09:30, 10:24 kept as the original, history 'regularized' (RG-102, by Priya); day late -> present",
  ok1.ok && vik23.checkIn === "09:30" && vik23.originalCheckIn === "10:24" && vik23.status === "present" && vik23.regularized
  && vikRec.history.at(-1).action === "regularized" && vikRec.history.at(-1).regularizationId === "RG-102" && vikRec.history.at(-1).byUserId === "EMP-1003", brief(vik23));
check("R14", "the request is approved and done, with the decision in its history; Vikram's late marks go down by one",
  ok1.record.status === "approved" && ok1.record.stage === "done" && ok1.record.history.at(-1).decision === "approved" && A.monthFor("EMP-1088", 2026, 9).lateMarks === vikBefore - 1,
  `${vikBefore} -> ${A.monthFor("EMP-1088", 2026, 9).lateMarks}`);
check("R15", "a decided request can't be decided again", /already approved/.test(A.decideRegularization("RG-102", "EMP-1001", "admin", "reject", "x").error));
const sneBefore = localStorage.getItem("officeos:attendance");
const rej = A.decideRegularization("RG-103", "EMP-1003", "hr", "reject", "No proof of the client call");
check("R16", "rejecting keeps the note and leaves the attendance record untouched (Sneha still late)",
  rej.ok && rej.record.status === "rejected" && rej.record.history.at(-1).note === "No proof of the client call" && localStorage.getItem("officeos:attendance") === sneBefore && day("EMP-1029", "2026-09-21").status === "late");
const ok2 = A.decideRegularization("RG-104", "EMP-1001", "admin", "approve");
const ana18 = day("EMP-1017", "2026-09-18");
check("R17", "approving a missed check-out: 18:00 recorded, no longer incomplete, present (09:31–18:00)", ok2.ok && ana18.checkOut === "18:00" && !ana18.incomplete && ana18.status === "present" && ana18.minutesWorked === 509, brief(ana18));
const ok3 = A.decideRegularization(in7.record.id, "EMP-1003", "hr", "approve");
const vik11 = day("EMP-1088", "2026-09-11");
check("R18", "approving a missed check-in creates a record (source regularization, office): Vikram 11 Sep absent -> present, incomplete (no check-out)",
  ok3.ok && vik11.status === "present" && vik11.checkIn === "09:10" && vik11.incomplete && raw("attendance").records.find((r) => r.id === vik11.recordId).source === "regularization", brief(vik11));

// The record changed after asking: approval refused, request stays pending.
const kabirAsk = ask("EMP-1008", { issue: "missed-check-in", date: "2026-09-28", time: "09:20" });
setNow(2026, 9, 28, 10, 5); A.checkIn("EMP-1008", "office"); BASE();
A.decideRegularization(kabirAsk.record.id, "EMP-1001", "admin", "approve");   // Round 8C (setup): Aarav, Kabir's manager, first (changes no record)
const stale = A.decideRegularization(kabirAsk.record.id, "EMP-1003", "hr", "approve");
check("R19", "if the record changed so the correction no longer fits (Kabir checked in meanwhile), approval is refused and the request stays pending",
  kabirAsk.ok && !stale.ok && /no longer matches/.test(stale.error) && A.getRegularization(kabirAsk.record.id).status === "pending" && day("EMP-1008", "2026-09-28").checkIn === "10:05", stale.error);
const c1 = A.cancelRegularization(kabirAsk.record.id, "EMP-1105");
const c2 = A.cancelRegularization(kabirAsk.record.id, "EMP-1008");
const c3 = A.cancelRegularization(kabirAsk.record.id, "EMP-1008");
const c4 = A.cancelRegularization("RG-102", "EMP-1088");
check("R20", "cancel: only the person who asked, only while pending", !c1.ok && c2.ok && c2.record.status === "cancelled" && c2.record.history.at(-1).decision === "cancelled" && !c3.ok && !c4.ok && /already approved/.test(c4.error),
  [c1, c3].map(e).join(" | "));
setNow(2026, 9, 29, 10, 10); A.checkIn("EMP-1001", "office");
setNow(2026, 9, 29, 11, 0);
const adminAsk = ask("EMP-1001", { issue: "late-arrival", date: "2026-09-29", time: "09:35" });
BASE();
const aar29 = day("EMP-1001", "2026-09-29");
check("R21", "an Admin's own request is approved straight away (as with leave) and applied: 10:10 -> 09:35",
  adminAsk.ok && adminAsk.record.status === "approved" && adminAsk.record.history.at(-1).decision === "auto-approved" && aar29.checkIn === "09:35" && aar29.originalCheckIn === "10:10" && aar29.regularized,
  brief(aar29));
check("R22", "while Arjun's 22 Sep request (RG-107) is pending, a second one for that date is refused",
  !ask("EMP-1105", { issue: "late-arrival", date: "2026-09-22", time: "09:35" }).ok);

// =====================================================================
section("monthFor");
fresh(); A.dayFor("EMP-1105", "2026-09-28");
const balBefore = j(L.balanceFor("EMP-1008", 2026, 10));
const am = A.monthFor("EMP-1105", 2026, 9);
check("M1", "Arjun, Sep 2026 on the 28th: 18 present, 1 late, 8 weekend, 3 not yet (28–30), no absences",
  j(am.counts) === j({ present: 18, late: 1, halfDay: 0, absent: 0, onLeave: 0, holiday: 0, weekend: 8, notYet: 3, noData: 0, notJoined: 0 } /* Round 8F (shape): + notJoined */), j(am.counts));
check("M2", "22 working days, 2 left after today, 19 worked, 1 late mark, no penalty, 1 regularized day",
  am.workingDays === 22 && am.workingDaysLeft === 2 && am.daysWorked === 19 && am.lateMarks === 1 && am.penaltyHalfDays === 0 && am.regularized === 1 && am.days.length === 30,
  `working ${am.workingDays}, left ${am.workingDaysLeft}, worked ${am.daysWorked}, late ${am.lateMarks}, avg ${am.averageMinutes}m`);
const finished = am.days.filter((d) => d.checkOut);
check("M3", "averageMinutes = mean of finished days' minutes", am.averageMinutes === Math.round(finished.reduce((s, d) => s + d.minutesWorked, 0) / finished.length), String(am.averageMinutes));
punch("EMP-1008", "2026-10-05", "09:50", "18:30");
punch("EMP-1008", "2026-10-06", "10:00", "18:30");
LATER();
const k2 = A.monthFor("EMP-1008", 2026, 10);
punch("EMP-1008", "2026-10-07", "09:47", "18:30");
LATER();
const k3 = A.monthFor("EMP-1008", 2026, 10);
let octWorking = 0; for (let d = 1; d <= 31; d++) if (!H.isDayOff(`2026-10-${String(d).padStart(2, "0")}`)) octWorking++;
check("M4", "late-mark penalty: 2 late marks -> none; the 3rd -> 1 half-day (deducted from pay by payroll)", k2.lateMarks === 2 && k2.penaltyHalfDays === 0 && k3.lateMarks === 3 && k3.penaltyHalfDays === 1);
check("M5", "October: 2 holidays (2 and 20 Oct), working days = weekdays minus holidays", k3.counts.holiday === 2 && k3.workingDays === octWorking && octWorking === 20, `${k3.workingDays}`);
check("M6", "the penalty doesn't touch leave balances (Kabir's October balance is the same as before the late days)", j(L.balanceFor("EMP-1008", 2026, 10)) === balBefore && L.allRequests().every((r) => r.userId !== "EMP-1008"));
BASE();
check("M7", "a month before any records (Aug) is no-data on working days, never absent", A.monthFor("EMP-1105", 2026, 8).counts.absent === 0 && A.monthFor("EMP-1105", 2026, 8).counts.noData === 21);
check("M8", "bad month or inactive person -> null", A.monthFor("EMP-1105", 2026, 13) === null && A.monthFor("EMP-1105", "x", 1) === null && A.monthFor("EMP-1061", 2026, 9) === null);

// =====================================================================
section("summaryFor / teamFor");
fresh(); A.dayFor("EMP-1105", "2026-09-28");
const sNow = A.summaryFor("2026-09-28");
check("T1", "today 10:00: 9 people, 8 expected, 3 present (none late), Meera on leave, 5 not in yet, 0 absent",
  sNow.total === 9 && sNow.expected === 8 && sNow.present === 3 && sNow.late === 0 && sNow.onLeave === 1 && sNow.notYet === 5 && sNow.absent === 0, j(sNow));
const s23 = A.summaryFor("2026-09-23");
check("T2", "23 Sep: 8 present, of which 1 late (Vikram); Meera on leave; 8 expected", s23.present === 8 && s23.late === 1 && s23.onLeave === 1 && s23.expected === 8 && s23.absent === 0, j(s23));
const s11 = A.summaryFor("2026-09-11");
check("T3", "11 Sep: 8 present, Vikram absent, 9 expected", s11.present === 8 && s11.absent === 1 && s11.expected === 9, j(s11));
const s14 = A.summaryFor("2026-09-14"), s16 = A.summaryFor("2026-09-16"), s26 = A.summaryFor("2026-09-26");
check("T4", "14 Sep: Ananya's half day counts in present and halfDay; 16 Sep: 1 working from home; Sat 26 Sep: all off, 0 expected",
  s14.halfDay === 1 && s14.present === 9 && s16.wfh === 1 && s26.off === 9 && s26.expected === 0 && s26.present === 0, `14: ${s14.present}/${s14.halfDay}, 16 wfh ${s16.wfh}, 26 off ${s26.off}`);
const team = A.teamFor("2026-09-28");
check("T5", "teamFor: 9 active people by name, no Divya; a bad date gives []",
  j(team.map((d) => S.getUser(d.userId).name)) === j(["Aarav Mehta", "Ananya Iyer", "Arjun Kapoor", "Kabir Shah", "Meera Joshi", "Priya Nair", "Rohan Gupta", "Sneha Rao", "Vikram Singh"])
  && j(A.teamFor("nope")) === "[]");
setNow(2026, 9, 28, 19, 0);
const sEve = A.summaryFor("2026-09-28");
BASE();
check("T6", "today after 18:30: the 5 who never checked in become absent", sEve.absent === 5 && sEve.notYet === 0, j(sEve));

// =====================================================================
section("time zones and dates");
fresh(); A.dayFor("EMP-1105", "2026-09-28");
const stamp = raw("attendance").records.find((r) => r.userId === "EMP-1105" && r.date === "2026-09-22").history[0].at;
const back = new Date(stamp);
check("Z1", "stored timestamps are the local moment: Arjun's 22 Sep check-in stamp reads back as 22 Sep 10:05 local",
  back.getFullYear() === 2026 && back.getMonth() === 8 && back.getDate() === 22 && back.getHours() === 10 && back.getMinutes() === 5, stamp);
// Round 14F (restage; was a check-in at 23:30 and at 00:30, which check-in's closing at 18:30 and opening at 08:30 now refuse): the same local dates, through what still punches.
setNow(2026, 9, 28, 18, 29);
const lateNight = A.checkIn("EMP-1008", "office");
setNow(2026, 9, 28, 23, 30);
const lateOut = A.checkOut("EMP-1008");
setNow(2026, 9, 29, 0, 30);
const pastMidnightOut = A.checkOut("EMP-1008"), pastMidnight = A.checkIn("EMP-1008", "office");
setNow(2026, 9, 29, 8, 30);
const morning = A.checkIn("EMP-1008", "office");
BASE();
check("Z2", "'today' is the local date: 23:30 on the 28th stays the 28th (the check-out lands on that day); 00:30 is the 29th (nothing to check out, check-in not open yet); 08:30 on the 29th is a new check-in",
  lateNight.ok && lateNight.record.date === "2026-09-28" && lateNight.record.checkIn === "18:29" && lateOut.ok && lateOut.record.date === "2026-09-28" && lateOut.record.checkOut === "23:30"
  && pastMidnightOut.error === "Check in first." && pastMidnight.error === "Check-in opens at 8:30 AM." && morning.ok && morning.record.date === "2026-09-29" && morning.record.checkIn === "08:30",
  JSON.stringify([lateNight.record?.date, lateOut.record?.checkOut, pastMidnightOut.error, pastMidnight.error, morning.record?.date]));
check("Z3", "week-day maths is UTC whole days: 2 Oct is a Friday holiday, 3–4 Oct weekend, in every zone",
  day("EMP-1008", "2026-10-02").status === "holiday" && day("EMP-1008", "2026-10-03").status === "weekend" && day("EMP-1008", "2026-10-04").status === "weekend" && day("EMP-1008", "2026-10-05").status === "not-yet");

// =====================================================================
section("resetAttendanceData()");
A.checkIn("EMP-1105", "office");
A.requestRegularization("EMP-1105", { issue: "late-arrival", date: "2026-09-22", time: "09:40", reason: "x" });
S.updateUser(USER_ACTOR("admin", "EMP-1017"), "EMP-1017", { phone: "111" });
const leaveCount = L.allRequests().length;
A.resetAttendanceData();
check("X1", "reset removes both boxes; the next read re-seeds (Arjun not checked in, 5 corrections)",
  localStorage.getItem("officeos:attendance") === null && localStorage.getItem("officeos:regularizations") === null
  && day("EMP-1105", "2026-09-28").status === "not-yet" && A.allRegularizations().length === 5);
check("X2", "reset leaves users and leave alone", S.getUser("EMP-1017").phone === "111" && L.allRequests().length === leaveCount);
localStorage.setItem("officeos:attendance", "{not json");
check("X3", "a corrupt saved box is re-seeded instead of crashing", day("EMP-1105", "2026-09-22").status === "late");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
