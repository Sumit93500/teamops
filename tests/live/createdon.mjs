// usage: node createdon.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// F2b: a person created with no joining date is not "joined long ago" (data/created-on.js, data/employment-period.js joinedOn()).
//   C  addUser itself is unchanged (the record has no new field); the day goes to the separate created-on key, in office time
//   P  employmentPeriod / attendance / payroll / leave for such a person start on the created day
//   S  seeded people are unchanged: no entry, no fallback
//   G  a given joining date still wins (the form path); a failed addUser writes nothing
//   A  a person with no created-on entry falls back to the audit trail's account-created day; with neither, as before
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const S = await import("./js/data/store.js");
const A = await import("./js/data/attendance-store.js");
const P = await import("./js/data/payroll-store.js");
const LP = await import("./js/data/leave-policy.js");
const EP = await import("./js/data/employment-period.js");
const EM = await import("./js/data/employment.js");
const CO = await import("./js/data/created-on.js");
const AU = await import("./js/data/audit-trail.js");
const SD = await import("./js/data/shift-days.js");
const SP = await import("./js/data/shift-punch.js");
const EN = await import("./js/data/shift-engine.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(6)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const AARAV = "EMP-1001";
const SEEDED = ["EMP-1001", "EMP-1003", "EMP-1008", "EMP-1017", "EMP-1023", "EMP-1029", "EMP-1042", "EMP-1061", "EMP-1088", "EMP-1105"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const show = (iso) => `${Number(iso.slice(8))} ${MON[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
let seq = 0;
function fresh(y, mo, d) { mem.clear(); setNow(y, mo, d, 10); A.monthFor(AARAV, y, mo); }
// addUser called directly, the way a future import or an account-creation path would: no joining date unless given
function hire(joining) {
  seq += 1;
  const r = S.addUser(AARAV, { name: `Created ${seq}`, email: `created${seq}@northwind.com`, department: "ENG", designation: "Software Engineer", role: "emp", ...(joining ? { dateOfJoining: show(joining) } : {}), employmentType: "Full-time" });
  const id = S.getAllUsers().find((u) => u.email === `created${seq}@northwind.com`)?.id;
  if (id) P.setSalary(AARAV, id, { gross: 62000, effectiveFrom: "2026-01-01" });
  return { id, ok: r.ok, record: r.record };
}
const days = (id, y, m) => A.monthFor(id, y, m).days;
const createdKey = () => JSON.parse(mem.get("officeos:created-on") ?? "null");

section("C. addUser is unchanged; the day is kept apart");
fresh(2026, 11, 20);
const h = hire(null);
check("C1", "addUser with no joining date succeeds and the record has no joining date, as before", h.ok && !String(S.getUser(h.id).dateOfJoining ?? "").trim());
check("C2", "...and no new field on the record (the created day lives in its own key)", !Object.keys(S.getUser(h.id)).some((k) => /creat/i.test(k)) && !Object.keys(h.record).some((k) => /creat/i.test(k)), Object.keys(h.record).join(","));
check("C3", "the created-on key holds today's date for this person, and only this person", j(createdKey()?.days) === j({ [h.id]: "2026-11-20" }), j(createdKey()));
setNow(2026, 11, 20, 0, 30);
const ist = hire(null);
NOW = RealDate.UTC(2026, 10, 19, 19, 0);   // 20 Nov 00:30 IST is still 19 Nov in UTC
const early = hire(null);
check("C4", "the day is the office (IST) day: 00:30 IST on 20 Nov is 20 Nov, not the UTC 19th", CO.createdOnOf(early.id) === "2026-11-20", String(CO.createdOnOf(early.id)));
NOW = RealDate.UTC(2026, 10, 20, 18, 45);   // 21 Nov 00:15 IST
const late = hire(null);
check("C5", "...and 18:45 UTC on 20 Nov is 21 Nov in the office", CO.createdOnOf(late.id) === "2026-11-21", String(CO.createdOnOf(late.id)));

section("P. Nothing before the created day");
fresh(2026, 11, 20);
const p = hire(null);
const per = EP.employmentPeriod(p.id);
check("P1", "employmentPeriod().from is the created day", per.from === "2026-11-20", j(per));
check("P2", "the days before it are 'before' and today is 'during'", EP.employmentState(p.id, "2026-11-19") === "before" && EP.employmentState(p.id, "2026-11-20") === "during");
const m = A.monthFor(p.id, 2026, 11);
check("P3", "attendance: every earlier working day is not-joined, no absences", m.counts.absent === 0 && m.days.filter((d) => d.date < "2026-11-20" && !["weekend", "holiday"].includes(d.status)).every((d) => d.status === "not-joined" && !d.checkIn), j(m.counts));
check("P4", "attendance: October (the month before) holds no absence at all", days(p.id, 2026, 10).every((d) => d.status !== "absent"));
check("P5", "payroll: no row for October; November is pro-rated from the created day", P.payrollRunFor(p.id, 2026, 10) === null && P.payrollRunFor(p.id, 2026, 11)?.lop.notJoinedDays > 0, j(P.payrollRunFor(p.id, 2026, 11)?.lop));
const acc = LP.leaveAccount(p.id, "2026-11-20");
check("P6", "leave: the policy's balance for under a year (pro-rata), not a full year's grant", acc.band === "under1" && acc.types.casual.entitled === 1 && acc.types.earned.entitled === 0, j(acc.types.casual));
check("P7", "employmentOf (the leave and pay rules' reader) says the created day", EM.employmentOf(p.id).joiningDate === "2026-11-20", j(EM.employmentOf(p.id)));
check("P8", "joinedOn() reads the same", EP.joinedOn(S.getUser(p.id)) === "2026-11-20");
setNow(2026, 12, 3, 10);
check("P9", "two weeks on, the created day does not move", EP.employmentPeriod(p.id).from === "2026-11-20" && EP.employmentState(p.id, "2026-11-19") === "before");

section("Q. The shift engine and the shift punch read the created day");
fresh(2026, 12, 10);
const q = hire(null);
const qNow = { date: "2027-01-20", minutes: 600 };
const qm = SD.shiftMonthFor(q.id, 2026, 12, qNow), ql = SD.shiftMonthLossOfPay(q.id, 2026, 12, qNow);
const qAfter = qm.days.filter((d) => d.date >= "2026-12-10" && d.status === "absent").length;
check("Q1", "shift month: nothing before the created day is absent; loss of pay counts the absent days from it on", qm.days.filter((d) => d.date < "2026-12-10").every((d) => d.status !== "absent") && qAfter > 0 && ql?.absent === qAfter, j([qAfter, ql?.absent]));
let qRef; try { qRef = SP.shiftCheckInRefusal(q.id, "office", { date: "2026-12-09", minutes: EN.toMin("09:00") }); } catch (e) { qRef = { error: `threw: ${e.message}` }; }
check("Q2", "the shift check-in is refused for a day before the created day, naming it", /before your joining date \(2026-12-10\)/.test(qRef?.error ?? ""), String(qRef?.error));

section("S. Seeded people unchanged");
fresh(2026, 11, 20);
hire(null);
const seededFrom = SEEDED.map((id) => [id, EP.employmentPeriod(id).from, EP.joinedOn(S.getUser(id)), EM.employmentOf(id)?.joiningDate]);
check("S1", "a seeded person's period starts at their own stored joining date, or none", seededFrom.every(([id, from, joined]) => from === joined && from === S.joiningDate(S.getUser(id)?.dateOfJoining)), j(seededFrom.map((r) => r.slice(0, 3))));
check("S2", "no seeded person has a created-on entry", SEEDED.every((id) => CO.createdOnOf(id) === null));
check("S3", "a seeded person with no stored date is not given today's date by joinedOn", EP.joinedOn({ id: "EMP-1017", dateOfJoining: "" }) === null);
{ // even a stray created-on entry for a seeded person is never read (they keep their stored date, or none)
  const box = JSON.parse(mem.get("officeos:created-on")); box.days["EMP-1017"] = "2026-11-19"; box.days[AARAV] = "2026-11-19"; mem.set("officeos:created-on", JSON.stringify(box));
  check("S5", "a created-on entry for a seeded person is ignored: the stored date (Aarav) or none (Ananya) as before", EP.employmentPeriod(AARAV).from === S.joiningDate(S.getUser(AARAV).dateOfJoining) && EP.employmentPeriod("EMP-1017").from === S.joiningDate(S.getUser("EMP-1017").dateOfJoining) && EP.joinedOn({ id: "EMP-1017", dateOfJoining: "" }) === null, j([EP.employmentPeriod(AARAV).from, EP.employmentPeriod("EMP-1017").from]));
}
check("S4", "isAppCreated: the seeded are not, the created are", !EP.isAppCreated(AARAV) && EP.isAppCreated("EMP-9999"));

section("G. A given date wins; a refusal writes nothing");
fresh(2026, 11, 20);
const g = hire("2026-11-09");
check("G1", "a stored joining date is the one used, not the created day", EP.employmentPeriod(g.id).from === "2026-11-09" && S.getUser(g.id).dateOfJoining === "9 Nov 2026");
const before = j(createdKey());
const bad = S.addUser(AARAV, { name: "", email: "x@northwind.com" });
check("G2", "an addUser that is refused writes nothing to created-on", !bad.ok && j(createdKey()) === before);
const fut = hire("2026-12-01");
check("G3", "a future date given is the joining date (joinsOn), not the created day", EP.joinsOn(fut.id, "2026-11-20") === "2026-12-01");

section("A. Created before the key existed");
fresh(2026, 11, 20);
const old = hire(null);
mem.delete("officeos:created-on");
check("A1", "no created-on entry and no audit event: no start date (as before this round)", EP.employmentPeriod(old.id).from === null);
AU.logEvent({ actorId: AARAV, userId: old.id, kind: "account-created", detail: "Account created" }, RealDate.UTC(2026, 10, 18, 20, 0));   // 19 Nov 01:30 IST
check("A2", "the audit trail's account-created day is used (office time)", EP.employmentPeriod(old.id).from === "2026-11-19", String(EP.employmentPeriod(old.id).from));
AU.logEvent({ actorId: AARAV, userId: old.id, kind: "account-created", detail: "Again" }, RealDate.UTC(2026, 10, 25, 5, 0));
check("A3", "the first account-created event counts, not a later one", EP.employmentPeriod(old.id).from === "2026-11-19");
check("A4", "reading never writes the created-on key", mem.get("officeos:created-on") === undefined);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
