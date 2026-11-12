// usage: node forward.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 8B: attendance no longer goes stale. Days after the seed are worked out on every read (never stored) for all
// nine sample people; the seed day's "checked in today" records get their check-out; both collections seed from one
// saved anchor. The js under test is ./js; ./js-pre8B is 7C's committed result (HEAD before 8B), run side by side as
// the contrast and for payroll's byte-for-byte comparison. Local wall clock set per check; storage survives clock
// moves, like a browser keeping its data.
//   A  the seed anchor: saved on the first read, kept, removed by reset, derived for data seeded before it existed
//   B  staleness: seeded 5 Oct 10:00, viewed at 17:00 0 / 1 / 3 / 7 / 14 / 30 days later: present, not absent
//   C  computed days: the seed's times, never late, never stored, stable, live to leave / holidays, real data wins
//   D  the seed day's in-progress records are completed; a real punch without a check-out isn't
//   E  two seeds on different days now agree: the three corrections that failed on HEAD approve
//   F  corrections are judged against the day the page shows
//   G  payroll: every run figure byte-identical to HEAD's across the date matrix 8B investigated
//   H  pages a week / a month after the seed: team attendance, admin and employee dashboards, my-attendance
//   I  source: only data/attendance-store.js changed; payroll-store, collection, storage untouched
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");

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
setNow("2026-10-05");

const A = await import("./js/data/attendance-store.js");
const L = await import("./js/data/leave-store.js");
const H = await import("./js/data/holidays.js");
const HOL_ACTOR = "EMP-1003";   // Round 10W (signature; was addHoliday(fields) / removeHoliday(id)): the holiday writes take the acting person's id first and check their record (holidays:manage); every call here passes HR's (Priya). The guard itself: holiguard.mjs
const P = await import("./js/data/payroll-store.js");
const A0 = await import("./js-pre8B/data/attendance-store.js");
const P0 = await import("./js-pre8B/data/payroll-store.js");

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const safe = (fn) => { try { return fn(); } catch (e) { return `threw: ${e.message}`; } };
const NAME = { "EMP-1001": "Aarav", "EMP-1003": "Priya", "EMP-1008": "Kabir", "EMP-1017": "Ananya", "EMP-1023": "Meera", "EMP-1029": "Sneha", "EMP-1042": "Rohan", "EMP-1088": "Vikram", "EMP-1105": "Arjun" };
const IDS = Object.keys(NAME);
const SIGN_IN = ["EMP-1001", "EMP-1003", "EMP-1008", "EMP-1105"];
const add = (iso, k) => H.isoFromDayNumber(H.dayNumber(iso) + k);
const working = (from, to) => { const out = []; for (let n = H.dayNumber(from); n <= H.dayNumber(to); n++) { const d = H.isoFromDayNumber(n); if (!H.isDayOff(d)) out.push(d); } return out; };
const anchor = () => JSON.parse(localStorage.getItem("officeos:attendance-seed"));
const stored = () => JSON.parse(localStorage.getItem("officeos:attendance")).records;
const SEED = "2026-10-05";
const seedAt = (Store, iso = SEED, h = 10, m = 0) => { fresh(); setNow(iso, h, m); Store.dayFor("EMP-1105", iso); };

// =====================================================================
section("A. The seed anchor");
seedAt(A, SEED, 10, 0);
check("A1", "the first read saves the anchor: the local date and minute of the seed", j(anchor()) === j({ date: SEED, minutes: 600 }), j(anchor()));
setNow("2026-10-12", 17, 0); A.summaryFor("2026-10-12"); A.allRegularizations();
check("A2", "a week of later reads leaves it as it was", j(anchor()) === j({ date: SEED, minutes: 600 }), j(anchor()));
A.resetAttendanceData();
check("A3", "Reset demo data removes it with both collections", localStorage.getItem("officeos:attendance-seed") === null && localStorage.getItem("officeos:attendance") === null && localStorage.getItem("officeos:regularizations") === null);
setNow("2026-10-12", 17, 5); A.dayFor("EMP-1105", "2026-10-12");
check("A4", "...and the next read makes a new one at that moment", j(anchor()) === j({ date: "2026-10-12", minutes: 17 * 60 + 5 }), j(anchor()));
seedAt(A0, SEED, 10, 0);
check("A5", "data seeded before 8B has no anchor (contrast: HEAD's code)", localStorage.getItem("officeos:attendance-seed") === null && stored().length > 0);
setNow("2026-10-12", 17, 0); A.dayFor("EMP-1105", "2026-10-12");
check("A6", "this code derives one from that data's last seeded date, as if made at the end of that day, and saves it",
  j(anchor()) === j({ date: SEED, minutes: 24 * 60 - 1 }), j(anchor()));
const legacyAbsent = working(add(SEED, 1), "2026-10-09").map((d) => A.summaryFor(d).absent).reduce((a, b) => a + b, 0);
check("A7", "...so a browser holding old data stops going stale: 6-9 Oct, 0 absent", legacyAbsent === 0, legacyAbsent);
// Old data where someone really punched after the seed (Arjun on 8 Oct, with HEAD's code): the anchor is still the
// last *seeded* date, so the days between the seed and that punch are filled in too.
seedAt(A0, SEED, 10, 0); setNow("2026-10-08", 9, 20); A0.checkIn("EMP-1105"); setNow("2026-10-08", 18, 30); A0.checkOut("EMP-1105");
setNow("2026-10-12", 17, 0); A.dayFor("EMP-1105", "2026-10-12");
const gap = working("2026-10-06", "2026-10-09").map((d) => A.summaryFor(d).absent).reduce((a, b) => a + b, 0);
check("A9", "old data with a real punch after its seed: the anchor is the last seeded date, not the punch's; 6-9 Oct still 0 absent",
  j(anchor()) === j({ date: SEED, minutes: 24 * 60 - 1 }) && gap === 0 && A.dayFor("EMP-1105", "2026-10-08").checkIn === "09:20", j([anchor(), gap]));
fresh(); localStorage.setItem("officeos:attendance-seed", JSON.stringify({ date: "2026-02-30", minutes: "ten" })); setNow(SEED, 11, 0); A.dayFor("EMP-1105", SEED);
check("A8", "a damaged anchor is replaced, not trusted", j(anchor()) === j({ date: SEED, minutes: 660 }), j(anchor()));

// =====================================================================
section("B. Staleness: seeded 5 Oct 10:00, viewed at 17:00 later");
const MATRIX = [0, 1, 3, 7, 14, 30];
const view = (Store, k) => {
  setNow(add(SEED, k), 17, 0);
  const past = working(add(SEED, 1), add(SEED, k - 1));
  const sums = past.map((d) => Store.summaryFor(d));
  return { days: past.length, present: sums.reduce((t, x) => t + x.present, 0), absent: sums.reduce((t, x) => t + x.absent, 0), expected: sums.reduce((t, x) => t + x.expected, 0) };
};
seedAt(A0); const head = Object.fromEntries(MATRIX.map((k) => [k, view(A0, k)]));
seedAt(A); const now = Object.fromEntries(MATRIX.map((k) => [k, view(A, k)]));
check("B1", "contrast, HEAD: 0 / 0 / 18 / 36 / 81 / 180 absent person-days (8A's numbers)", j(MATRIX.map((k) => head[k].absent)) === j([0, 0, 18, 36, 81, 180]), j(MATRIX.map((k) => head[k].absent)));
check("B2", "8B: every complete working day since the seed has all 9 present, 0 absent, at every view (0 / 1 / 3 / 7 / 14 / 30 days)",
  MATRIX.every((k) => now[k].absent === 0 && now[k].present === 9 * now[k].days && now[k].expected === 9 * now[k].days), j(MATRIX.map((k) => [now[k].days, now[k].present, now[k].absent])));
check("B3", "...the same days HEAD counted: 0 / 0 / 2 / 4 / 9 / 20 complete days", j(MATRIX.map((k) => now[k].days)) === j([0, 0, 2, 4, 9, 20]) && MATRIX.every((k) => now[k].days === head[k].days));
setNow("2026-10-12", 17, 0);
const today12 = A.summaryFor("2026-10-12");
const notYet = A.teamFor("2026-10-12").filter((d) => d.status === "not-yet").map((d) => d.userId).sort();
check("B4", "a later day at 17:00: the 5 who never sign in are in; the 4 sign-in identities are 'not yet' (today is theirs to mark)",
  today12.present === 5 && today12.notYet === 4 && j(notYet) === j([...SIGN_IN].sort()), j([today12.present, today12.notYet, notYet.map((i) => NAME[i])]));
setNow("2026-10-12", 19, 0);
check("B5", "...after the shift ends the 4 unmarked are absent today, as before; nothing is filled in for them today", A.summaryFor("2026-10-12").absent === 4);
setNow("2026-10-13", 11, 0);
const signedPast = SIGN_IN.map((id) => A.dayFor(id, "2026-10-12"));
check("B6", "...and the next day their 12 Oct is filled in like everyone's (Q1 = A: the sign-in identities are backfilled too)",
  signedPast.every((d) => d.status === "present" && d.checkIn && d.checkOut), j(signedPast.map((d) => `${NAME[d.userId]} ${d.status} ${d.checkIn}-${d.checkOut}`)));

// =====================================================================
section("C. What a computed day is");
setNow("2026-11-04", 17, 0);
const pastDays = working(add(SEED, 1), "2026-11-03");
const all = pastDays.flatMap((d) => IDS.map((id) => A.dayFor(id, d)));
const inT = all.map((d) => d.checkIn), outT = all.map((d) => d.checkOut);
check("C1", "every computed day: in 09:05-09:30, out 18:00-18:45 (the seed's own ranges), office, nothing regularized",
  inT.every((t) => t >= "09:05" && t <= "09:30") && outT.every((t) => t >= "18:00" && t <= "18:45") && all.every((d) => d.mode === "office" && !d.regularized && d.recordId === null),
  `${all.length} days; in ${[...inT].sort()[0]}-${[...inT].sort().at(-1)}, out ${[...outT].sort()[0]}-${[...outT].sort().at(-1)}`);
check("C2", "never late, never a half day, never incomplete, so no late mark and no penalty is ever added",
  all.every((d) => d.status === "present" && d.minutesLate === 0 && !d.incomplete) && IDS.every((id) => A.monthFor(id, 2026, 11).lateMarks === 0));
check("C3", "nothing after the seed day is stored (a month of reads later)", stored().filter((r) => r.date > SEED).length === 0, stored().filter((r) => r.date > SEED).length);
const twice = [A.dayFor("EMP-1029", "2026-10-21"), A.dayFor("EMP-1029", "2026-10-21")];
check("C4", "a day reads the same every time", twice[0].checkIn === twice[1].checkIn && twice[0].checkOut === twice[1].checkOut, `${twice[0].checkIn}-${twice[0].checkOut}`);
const offDays = ["2026-10-10", "2026-10-11", "2026-10-20"].map((d) => A.dayFor("EMP-1042", d).status);
check("C5", "weekends and holidays get nothing (10-11 Oct weekend, 20 Oct Dussehra)", j(offDays) === j(["weekend", "weekend", "holiday"]), j(offDays));
check("C6", "days before the seed day are exactly HEAD's (the seed is unchanged): the window's late marks and absences stay", (() => {
  const mine = A.monthFor("EMP-1088", 2026, 9).days.map((d) => `${d.date}${d.status}${d.checkIn}${d.checkOut}`);
  setNow("2026-11-04", 17, 0);
  const save = new Map(mem); seedAt(A0); setNow("2026-11-04", 17, 0);
  const theirs = A0.monthFor("EMP-1088", 2026, 9).days.map((d) => `${d.date}${d.status}${d.checkIn}${d.checkOut}`);
  mem.clear(); save.forEach((v, k) => mem.set(k, v));
  return j(mine) === j(theirs);
})());
// live inputs
setNow("2026-10-26", 10, 0);   // Round 8F (setup): filed within 7 days of 22 Oct (leave can't be dated further back), then the clock put back
const lv = L.applyLeave("EMP-1042", { type: "sick", from: "2026-10-22", to: "2026-10-22", duration: "full", reason: "Fever" });
setNow("2026-11-04", 17, 0);
const before = A.dayFor("EMP-1042", "2026-10-22").status;
L.decideLeave(lv.record.id, "EMP-1029", "emp", "approve");   // Round 8C (setup): Sneha, the requester's manager, approves first
L.decideLeave(lv.record.id, "EMP-1003", "hr", "approve");
const after = A.dayFor("EMP-1042", "2026-10-22");
check("C7", "sick leave approved afterwards for a computed day: it reads on-leave, with no 'conflict'", before === "present" && after.status === "on-leave" && !after.conflict, `${before} -> ${after.status}`);
setNow("2026-10-26", 10, 0);   // Round 8F (setup): filed within 7 days, as above
const wfh = L.applyLeave("EMP-1017", { type: "wfh", from: "2026-10-23", to: "2026-10-23", duration: "full", reason: "Plumber" });
setNow("2026-11-04", 17, 0);
L.decideLeave(wfh.record.id, "EMP-1003", "hr", "approve");
check("C8", "an approved work-from-home day is computed as worked from home", A.dayFor("EMP-1017", "2026-10-23").mode === "wfh" && A.dayFor("EMP-1017", "2026-10-23").status === "present");
H.addHoliday(HOL_ACTOR, { date: "2026-10-27", name: "Test closure", kind: "company" });
check("C9", "a holiday HR adds afterwards: the computed day disappears, it reads holiday", A.dayFor("EMP-1029", "2026-10-27").status === "holiday");
fresh(); setNow(SEED, 10, 0); A.dayFor("EMP-1105", SEED);
setNow("2026-10-07", 9, 58); A.checkIn("EMP-1105"); setNow("2026-10-07", 18, 40); A.checkOut("EMP-1105");
setNow("2026-10-09", 11, 0);
const real = A.dayFor("EMP-1105", "2026-10-07");
check("C10", "real data wins: Arjun's own late punch on 7 Oct stays 09:58, late", real.status === "late" && real.checkIn === "09:58" && real.checkOut === "18:40" && real.recordId !== null, `${real.status} ${real.checkIn}-${real.checkOut}`);
check("C11", "...and the day he didn't punch (8 Oct) is computed (Q1 = A)", A.dayFor("EMP-1105", "2026-10-08").status === "present" && A.dayFor("EMP-1105", "2026-10-08").recordId === null);
// today for the people who don't sign in
fresh(); setNow(SEED, 10, 0); A.dayFor("EMP-1105", SEED);
const todayAt = (h, m) => { setNow("2026-10-08", h, m); return A.dayFor("EMP-1029", "2026-10-08"); };
const t1 = todayAt(8, 0), t2 = todayAt(11, 0), tIn = t2.checkIn, t3 = todayAt(18, 45);
check("C12", "today, someone who never signs in: not yet before their time; in progress once it's passed; checked out once that's passed",
  t1.status === "not-yet" && !t1.checkIn && t2.inProgress && t2.checkOut === null && t3.checkOut !== null && !t3.inProgress && t3.checkIn === tIn, j([t1.status, t2.checkIn, t3.checkOut]));
setNow("2026-10-08", 11, 0);
check("C13", "today, the sign-in identities get nothing computed, so Mark attendance still works for them", A.dayFor("EMP-1105", "2026-10-08").checkIn === null && A.checkIn("EMP-1105").ok === true);
const future = ["EMP-1029", "EMP-1105"].map((id) => A.dayFor(id, "2026-10-09"));
check("C14", "nothing is computed ahead: tomorrow is 'not yet' with no times, for everyone", future.every((x) => x.status === "not-yet" && x.checkIn === null), j(future.map((x) => x.status)));
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const newbie = S.addUser(USER_ACTOR("admin", null), { name: "Late Joiner", email: "late.joiner@northwind.com", department: "SUP", role: "emp", designation: "Support Agent" }).record;
setNow("2026-10-09", 11, 0);
const nb = A.dayFor(newbie.id, "2026-10-08");
check("C15", "someone added after the seed isn't a sample person: nothing is computed for them (their missed day is absent)", nb?.status === "absent" && nb.checkIn === null, j(nb?.status));

// =====================================================================
section("D. The seed day's in-progress records");
const SEEDDAY = ["EMP-1042", "EMP-1017", "EMP-1029", "EMP-1088"];
fresh(); setNow(SEED, 10, 30); A.dayFor("EMP-1105", SEED);
const seedDay = (h, d = SEED) => { setNow(d, h, 0); return SEEDDAY.map((id) => A.dayFor(id, SEED)); };
const noon = seedDay(12), evening = seedDay(19), next = seedDay(11, "2026-10-06");
check("D1", "seed day at noon: the 4 seeded check-ins are in progress (no check-out yet)", noon.every((d) => d.inProgress && d.checkOut === null), j(noon.map((d) => d.checkIn)));
check("D2", "the same evening: each has its check-out (18:10-18:29), statuses unchanged (Vikram's 10:24 still late)",
  evening.every((d) => d.checkOut >= "18:00" && d.checkOut <= "18:45" && !d.inProgress) && j(evening.map((d) => d.status)) === j(["present", "present", "present", "late"]), j(evening.map((d) => `${d.checkIn}-${d.checkOut} ${d.status}`)));
check("D3", "the next day: none is 'incomplete' any more, each has hours", next.every((d) => !d.incomplete && d.hours > 8), j(next.map((d) => d.hours)));
fresh(); setNow(SEED, 10, 30); A0.dayFor("EMP-1105", SEED); setNow("2026-10-06", 11, 0);
check("D4", "contrast, HEAD: the same 4 are incomplete forever", SEEDDAY.every((id) => A0.dayFor(id, SEED).incomplete));
fresh(); setNow(SEED, 10, 30); A.dayFor("EMP-1105", SEED);
setNow("2026-10-06", 9, 20); A.checkIn("EMP-1105"); setNow("2026-10-07", 11, 0);
check("D5", "only those 4: Arjun's own punch on 6 Oct with no check-out stays incomplete (a real missed check-out)", A.dayFor("EMP-1105", "2026-10-06").incomplete === true);
const missedOut = A.requestRegularization("EMP-1042", { date: SEED, issue: "missed-check-out", time: "18:00", reason: "x" });
check("D6", "a missed check-out request for a completed seed day is refused: the page shows a check-out", !missedOut.ok && /already recorded/.test(missedOut.error), missedOut.error);
check("D7", "nothing about it is stored: Rohan's stored seed-day record still has no check-out", stored().find((r) => r.userId === "EMP-1042" && r.date === SEED).checkOut === null);
// Only the seed's own records are completed. A 07:00 first load stores no seed-day check-in for Vikram; his missed
// check-in that morning is corrected (HR approves): that record is real, so with no check-out it stays incomplete.
fresh(); setNow(SEED, 7, 0); A.dayFor("EMP-1105", SEED);
setNow(SEED, 11, 0);
const fixIn = A.requestRegularization("EMP-1088", { date: SEED, issue: "missed-check-in", time: "09:30", reason: "Card reader down" });
const fixOk = fixIn.ok && A.decideRegularization(fixIn.record.id, "EMP-1003", "hr", "approve").ok;
setNow("2026-10-06", 11, 0);
const fixed = A.dayFor("EMP-1088", SEED);
check("D7b", "a corrected (real) seed-day record without a check-out isn't completed: Vikram's approved 09:30 check-in stays incomplete",
  fixOk && fixed.checkIn === "09:30" && fixed.checkOut === null && fixed.incomplete === true && fixed.regularized, j([fixIn.ok, fixOk, fixed.checkIn, fixed.checkOut, fixed.incomplete]));
fresh(); setNow(SEED, 10, 30); A.dayFor("EMP-1105", SEED); setNow("2026-10-07", 11, 0);
// Every seed date from September to December at 11:00 (all four seeded check-ins past, Vikram's 10:24 included):
// viewed the next day, each seed-day status is exactly HEAD's (late stays late; completing never makes a half day).
const sweep = [];
for (const seedIso of working("2026-09-01", "2026-12-31")) {
  const nextIso = add(seedIso, 1);
  fresh(); setNow(seedIso, 11, 0); A.dayFor("EMP-1105", seedIso); setNow(nextIso, 11, 0);
  const mine = SEEDDAY.map((id) => A.dayFor(id, seedIso)?.status);
  fresh(); setNow(seedIso, 11, 0); A0.dayFor("EMP-1105", seedIso); setNow(nextIso, 11, 0);
  const theirs = SEEDDAY.map((id) => A0.dayFor(id, seedIso)?.status);
  if (j(mine) !== j(theirs)) sweep.push(`${seedIso}: ${mine} vs ${theirs}`);
}
check("D13", "completing a seed day never changes its status: every seed date Sep-Dec 2026 at 11:00, viewed next day, the 4 seeded check-ins read as on HEAD (Vikram late, not half-day)",
  sweep.length === 0, sweep.length ? sweep.slice(0, 3).join(" | ") : `${working("2026-09-01", "2026-12-31").length} seed dates`);
fresh(); setNow(SEED, 10, 30); A.dayFor("EMP-1105", SEED);
const forgot = stored().find((r) => r.userId === "EMP-1017" && r.source === "seed" && r.checkOut === null && r.date < SEED);
check("D12", "the seed's deliberate 'forgot to check out' day (Ananya, before the seed day) stays incomplete: it's part of the sample, not an artifact",
  forgot && A.dayFor("EMP-1017", forgot.date).incomplete === true, forgot?.date);
// The seed day itself: whoever has nothing stored (the sign-in identities, Meera, a morning load's not-yet check-ins)
// is filled in once the day is over, like any other past day (Q1 = A); while it's today, the sign-in four are theirs.
const NOSTORE = ["EMP-1001", "EMP-1003", "EMP-1008", "EMP-1105", "EMP-1023"];
fresh(); setNow(SEED, 10, 30); A.dayFor("EMP-1105", SEED);
setNow(SEED, 17, 0);
const sameDay = NOSTORE.map((id) => A.dayFor(id, SEED));
check("D8", "seed day at 17:00, still today: nothing is computed for it; the seed says who is in (all five here are 'not yet', as on HEAD)",
  sameDay.every((x) => x.status === "not-yet" && x.checkIn === null), j(sameDay.map((x) => `${NAME[x.userId]} ${x.status}`)));
setNow(SEED, 19, 0);
const seedEve = [...NOSTORE, "EMP-1088"].map((id) => A.dayFor(id, SEED).status);
setNow(SEED, 19, 0); fresh(); setNow(SEED, 10, 30); A0.dayFor("EMP-1105", SEED); setNow(SEED, 19, 0);
const seedEveHead = [...NOSTORE, "EMP-1088"].map((id) => A0.dayFor(id, SEED).status);
fresh(); setNow(SEED, 10, 30); A.dayFor("EMP-1105", SEED); setNow(SEED, 19, 0);
check("D8b", "...and that evening the seed day reads exactly as HEAD (who never came in is absent; Vikram's stored 10:24 is late)",
  j(seedEve) === j(seedEveHead) && j([...NOSTORE, "EMP-1088"].map((id) => A.dayFor(id, SEED).status)) === j(seedEveHead), j([seedEve, seedEveHead]));
setNow("2026-10-06", 11, 0);
const dayAfter = NOSTORE.map((id) => A.dayFor(id, SEED));
check("D9", "the next day: all five are filled in for the seed day (present, on time), as on any later day", dayAfter.every((x) => x.status === "present" && x.checkOut), j(dayAfter.map((x) => `${NAME[x.userId]} ${x.status} ${x.checkIn}-${x.checkOut}`)));
fresh(); setNow(SEED, 10, 30); A0.dayFor("EMP-1105", SEED); setNow("2026-10-06", 11, 0);
check("D10", "contrast, HEAD: the same five are absent on the seed day forever", NOSTORE.every((id) => A0.dayFor(id, SEED).status === "absent"));
fresh(); setNow(SEED, 7, 0); A.dayFor("EMP-1105", SEED); setNow("2026-10-06", 11, 0);
const morning = ["EMP-1042", "EMP-1017", "EMP-1029", "EMP-1088"].map((id) => A.dayFor(id, SEED));
check("D11", "a 07:00 first load (nobody's seed check-in had passed): the seed day is filled in on time for them, so no late mark appears that HEAD didn't have (Vikram's 10:24 is only ever a stored seed record)",
  morning.every((x) => x.status === "present" && x.minutesLate === 0) && stored().filter((r) => r.date === SEED).length === 0, j(morning.map((x) => `${NAME[x.userId]} ${x.checkIn}`)));

// =====================================================================
section("E. Two seeds on different days now agree");
const twoSeeds = (Store) => {
  fresh(); setNow(SEED, 10, 0); const regs = Store.allRegularizations();
  setNow("2026-10-07", 10, 0); Store.dayFor("EMP-1105", "2026-10-07");
  const r101 = regs.find((r) => r.id === "RG-101");
  const rec = stored().find((x) => x.userId === r101.userId && x.date === r101.date);
  const results = regs.filter((r) => r.status === "pending").map((r) => [r.id, safe(() => Store.decideRegularization(r.id, "EMP-1003", "hr", "approve"))]);
  return { rec, results };
};
const h2 = twoSeeds(A0), n2 = twoSeeds(A);
check("E1", "contrast, HEAD: corrections seeded 5 Oct, records 7 Oct: RG-102 / 103 / 104 can't be approved", h2.results.length === 3 && h2.results.every(([, r]) => !r.ok && /no longer matches/.test(r.error)), j(h2.results.map(([id, r]) => `${id} ${r.ok}`)));
check("E2", "8B: the same three approve cleanly", j(n2.results.map(([id, r]) => `${id} ${r.ok}`)) === j(["RG-102 true", "RG-103 true", "RG-104 true"]), j(n2.results.map(([id, r]) => `${id} ${r.ok === true ? "ok" : r.error ?? r}`)));
check("E3", "RG-101 (approved) matches its record: 09:30, original 10:12, marked regularized (HEAD: an uncorrected late record)",
  n2.rec?.checkIn === "09:30" && n2.rec?.originalCheckIn === "10:12" && n2.rec.history.some((h) => h.regularizationId === "RG-101") && h2.rec?.originalCheckIn === null,
  j([n2.rec?.checkIn, n2.rec?.originalCheckIn, h2.rec?.checkIn]));
fresh(); setNow(SEED, 10, 0); A.allRegularizations(); A.dayFor("EMP-1105", SEED);
const same = j(A.allRegularizations().map((r) => [r.id, r.date]));
fresh(); setNow(SEED, 10, 0); A.allRegularizations(); setNow("2026-10-19", 10, 0); A.dayFor("EMP-1105", "2026-10-19");
check("E4", "a fortnight apart, both collections hold exactly what a same-day seed holds", j(A.allRegularizations().map((r) => [r.id, r.date])) === same
  && stored().filter((r) => r.source === "seed").every((r) => r.date <= SEED), same);

// =====================================================================
section("F. Corrections are judged against the day the page shows");
fresh(); setNow(SEED, 10, 0); A.dayFor("EMP-1105", SEED); setNow("2026-10-09", 11, 0);
const missed = A.requestRegularization("EMP-1042", { date: "2026-10-07", issue: "missed-check-in", time: "09:20", reason: "x" });
const lateFix = A.requestRegularization("EMP-1042", { date: "2026-10-07", issue: "late-arrival", time: "09:00", reason: "x" });
check("F1", "a computed day shows a check-in, so 'missed check-in' is refused with the time shown", !missed.ok && /You checked in at \d\d:\d\d that day/.test(missed.error), missed.error);
check("F2", "...and 'late arrival' is refused: it wasn't late", !lateFix.ok && lateFix.error === "You weren't marked late that day.", lateFix.error);
const seededFix = A.allRegularizations().find((r) => r.id === "RG-103");
check("F3", "the seeded corrections still work as before (RG-103 approves)", seededFix.status === "pending" && A.decideRegularization("RG-103", "EMP-1003", "hr", "approve").ok === true);

// =====================================================================
section("G. Payroll: byte-identical to HEAD");
const COMBOS = [["2026-09-30", 11, "2026-09-30", 17], ["2026-09-30", 11, "2026-10-20", 17], ["2026-10-05", 10, "2026-10-28", 12],
  ["2026-10-05", 7, "2026-10-05", 20], ["2026-11-16", 11, "2026-11-30", 19], ["2026-10-16", 9, "2027-01-11", 10]];
// Round 11W (restage): RG-102 rejected at the seed clock, on both sides (this code and js-pre8B's, through each one's
// own store), so the comparison with HEAD still holds with G4's pause (G1 / G2 / G4)
const decide102 = (Store) => { const r = Store.decideRegularization("RG-102", "EMP-1003", "hr", "reject", "Decided before the clock (round 11W)"); if (!r.ok) throw new Error(`round 11W restage, RG-102: ${r.error}`); };
const runOf = (Store, PS, [s, sh, v, vh]) => {
  fresh(); setNow(s, sh, 0); Store.dayFor("EMP-1105", s); decide102(Store); setNow(v, vh, 0);
  const [y, m] = v.split("-").map(Number);
  return j(PS.payrollRun(y, m, { preparedBy: "EMP-1008" }));
};
// Pay: the run with each row's attendance coverage taken out (that's what 7B's "Attendance recorded" check counts,
// not money). Coverage is compared separately below.
const payOf = (runJson) => { const r = JSON.parse(runJson); return j({ ...r, rows: r.rows.map(({ attendance, ...rest }) => {
  if (rest.lop.absenceDays === 0) { const { absenceDays, ...lop } = rest.lop; rest.lop = lop; }   // Round 8D (shape): lop.absenceDays, dropped only when 0
  return rest;
}) }); };
const runs = COMBOS.map((c) => [c, runOf(A, P, c), runOf(A0, P0, c)]);
const diffs = runs.filter(([, mine, theirs]) => payOf(mine) !== payOf(theirs)).map(([c]) => c);
check("G1", "pay is byte-identical to HEAD's in all 6 seed / view combinations: the whole run, every row's gross, loss of pay, deductions, net, period and status",
  diffs.length === 0, diffs.length ? j(diffs) : "6 / 6");
// Coverage: the only difference allowed is today's, for the people who never sign in once their computed check-in has
// passed (they're "recorded" today, as the seed's own check-ins already were on HEAD): notYet one lower, nothing else.
const coverage = runs.flatMap(([c, mine, theirs]) => {
  const a = JSON.parse(mine).rows, b = JSON.parse(theirs).rows;
  const cov = ({ noData, notYet }) => ({ noData, notYet });   // Round 8D (shape): 7B's coverage only, not 8D's absence lists
  return a.map((r, i) => [c, r.userId, cov(r.attendance), b[i].attendance]).filter(([, , x, y]) => j(x) !== j(y));
});
const NEVER = IDS.filter((id) => !SIGN_IN.includes(id));
check("G1b", "attendance coverage differs only where today counts as recorded: the 5 who never sign in, notYet exactly 1 lower, during a working day after their check-in",
  coverage.every(([c, id, x, y]) => NEVER.includes(id) && x.noData === y.noData && x.notYet === y.notYet - 1 && c[2] > c[0] && c[3] >= 10 && c[3] < 19)
  && new Set(coverage.map(([c]) => j(c))).size === 2, j([...new Set(coverage.map(([c]) => `${c[2]} ${c[3]}:00`))]));
const lop = JSON.parse(runOf(A, P, COMBOS[0])).rows.find((r) => r.userId === "EMP-1088").lop;
check("G2", "including the documented loss-of-pay case (seeded 30 Sep 11:00: Vikram 0.5 day, ₹1,455)", lop.days === 0.5 && lop.amount === 1455, j(lop));
// The seed month's run viewed the next day, for every seed date in September and October at 11:00: the seed day is
// completed by then, so this is where completing it could have moved a late mark (and loss of pay). Pay must match HEAD.
const nextDay = working("2026-09-01", "2026-10-31").filter((s) => {
  const c = [s, 11, add(s, 1), 11];
  const [y, m] = s.split("-").map(Number);
  const runIn = (Store, PS) => { fresh(); setNow(s, 11, 0); Store.dayFor("EMP-1105", s); decide102(Store); setNow(add(s, 1), 11, 0); return j(PS.payrollRun(y, m, { preparedBy: "EMP-1008" })); };
  return payOf(runIn(A, P)) !== payOf(runIn(A0, P0));
});
check("G4", "the seed month's pay, viewed the day after the seed, equals HEAD's for every seed date in Sep-Oct 2026 (completing the seed day moves no late mark)",
  nextDay.length === 0, nextDay.length ? j(nextDay) : `${working("2026-09-01", "2026-10-31").length} seed dates`);
const late = JSON.parse(runOf(A, P, COMBOS[2])).rows.map((r) => r.lop.days);
check("G3", "a month of computed days adds no loss of pay (5 Oct seed, 28 Oct view: 0 for everyone)", late.every((d) => d === 0), j(late));

// =====================================================================
section("H. Pages a week and a month after the seed");
let loads = 0, w = null, d = null, saved = {};
let jsErrors = [];
const WHO = { aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"] };
async function open(page, who, Store = "js") {
  saved = Object.fromEntries([...mem.entries()]);
  const html = read(page);
  const vc = new VirtualConsole();
  jsErrors = [];
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) jsErrors.push(e.message); });
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, Event: w.Event });
  loads++;
  (await import(`./${Store}/core/auth.js`)).signIn(...WHO[who]);
  await import(`./${Store}/app.js?load=${loads}`);
  for (const [, s] of html.matchAll(/<script type="module" src="\.\.\/\.\.\/assets\/js\/pages\/([\w-]+)\.js"><\/script>/g)) {
    try { await import(`./${Store}/pages/${s}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
  }
  // keep what the page stored, for the next open
  mem.clear(); for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); mem.set(k, w.localStorage.getItem(k)); }
  globalThis.localStorage = shim;
}
const txt = (n) => n?.textContent.replace(/\s+/g, " ").trim() ?? null;
const statOf = (key) => txt(d.querySelector(`[data-stat="${key}"] .stat__value`));
const pageAt = async (Store, page, who, viewIso, h = 17) => { fresh(); setNow(SEED, 10, 0); (Store === "js" ? A : A0).dayFor("EMP-1105", SEED); setNow(viewIso, h, 0); await open(page, who, Store); };

await pageAt("js", "attendance/team-attendance.html", "priya", "2026-10-12");
const dateInput = d.getElementById("team-date");
dateInput.value = "2026-10-09"; dateInput.dispatchEvent(new w.Event("change"));
const teamNow = [statOf("present"), statOf("absent"), jsErrors.length];
await pageAt("js-pre8B", "attendance/team-attendance.html", "priya", "2026-10-12");
d.getElementById("team-date").value = "2026-10-09"; d.getElementById("team-date").dispatchEvent(new w.Event("change"));
const teamHead = [statOf("present"), statOf("absent")];
check("H1", "team attendance a week later, showing 9 Oct: Present 9, Absent 0 (HEAD: 0 and 9)", teamNow[0] === "9" && teamNow[1] === "0" && teamNow[2] === 0 && teamHead[0] === "0" && teamHead[1] === "9", j([teamNow, teamHead]));

// 17:00: today is still open, so the chart leaves it out of the range it reports (after the shift, today correctly
// shows the 4 sign-in identities absent unless they punched: 56%).
await pageAt("js", "dashboard/admin.html", "aarav", "2026-11-04", 17);
const rateNow = d.getElementById("rate-chart")?.getAttribute("aria-label");
await pageAt("js-pre8B", "dashboard/admin.html", "aarav", "2026-11-04", 17);
const rateHead = d.getElementById("rate-chart")?.getAttribute("aria-label");
check("H2", "admin dashboard a month later: the 14-day attendance rate is 100% on every finished working day (HEAD: 0%)",
  /between 100 and 100 percent/.test(rateNow) && /between 0 and 0 percent/.test(rateHead), j([rateNow, rateHead]));

await pageAt("js", "attendance/my-attendance.html", "arjun", "2026-10-30");
const daysNow = txt(d.querySelector("#month-stats .stat__value"));
await pageAt("js-pre8B", "attendance/my-attendance.html", "arjun", "2026-10-30");
const daysHead = txt(d.querySelector("#month-stats .stat__value"));
const [worked, done] = (daysNow ?? "").split(" / ").map(Number);
check("H3", "my-attendance (Arjun) at the end of October: Days present is every finished working day (HEAD: most of them missing)",
  worked === done && done >= 19 && Number(daysHead.split(" / ")[0]) < done, j([daysNow, daysHead]));

await pageAt("js", "dashboard/employee.html", "arjun", "2026-10-30");
const empNow = statOf("present");
await pageAt("js-pre8B", "dashboard/employee.html", "arjun", "2026-10-30");
const empHead = statOf("present");
check("H4", "employee dashboard: the same Days present figure as my-attendance (HEAD: the stale one)", empNow === daysNow && empHead === daysHead, j([empNow, empHead]));

await pageAt("js", "dashboard/hr.html", "priya", "2026-10-30");
check("H5", "HR dashboard a month later loads without a page error", jsErrors.length === 0, j(jsErrors));

// =====================================================================
section("I. Source");
const walk = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith(".js")).map((f) => f.replaceAll("\\", "/"));
// Round 8C (layout): 8B's claim is about 8B's result (js-pre8C), not the live tree, which 8C changed again.
const changed = walk(path.join(HERE, "js-pre8C")).filter((f) => !fs.existsSync(path.join(HERE, "js-pre8B", f)) || fs.readFileSync(path.join(HERE, "js-pre8C", f), "utf8") !== fs.readFileSync(path.join(HERE, "js-pre8B", f), "utf8"));
check("I1", "js: only data/attendance-store.js changed; no file added or removed", j(changed) === j(["data/attendance-store.js"]) && walk(path.join(HERE, "js-pre8C")).length === walk(path.join(HERE, "js-pre8B")).length, j(changed));
const src = fs.readFileSync(path.join(HERE, "js", "data", "attendance-store.js"), "utf8");
check("I2", "the store's header says days after the seed are worked out on each read, and the old 'generated around the day it's first read' heading is gone",
  /worked out on each read/.test(src) && !/seed \(generated around the day it's first read\)/.test(src));
check("I3", "the anchor key is attendance-seed, and Reset removes it", /const ANCHOR_KEY = "attendance-seed";/.test(src) && /resetAttendanceData\(\) \{\s+removeKey\(ANCHOR_KEY\);/.test(src));

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
