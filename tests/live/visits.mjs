// usage: node visits.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// CV1: client / official / off-site visits (data/visits-store.js, data/visits.js, data/visit-days.js) and the night shift's next-morning fix (data/night-fix.js).
//   V  validation: fields, dates, employment period, leave and visit overlap, weekly offs and holidays, month end
//   F  the flow: asking, assigning, deciding (who may, who may not), same-day visits, cancelling
//   P  punching: location required, accuracy, "location unavailable" and the approver's OK, completing
//   D  the day: On-site, Visit not started, half day, never late / absent / overtime, a night shift's visit, a month across the month end
//   N  night shift: a missed check-out fixed the next morning, wrong days and times refused, the window, day shifts unchanged
//   R  permissions, who sees what, what waits, the audit trail; reads write nothing
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const S = await import("./js/data/store.js");
const A = await import("./js/data/attendance-store.js");
const L = await import("./js/data/leave-store.js");
const V = await import("./js/data/visits.js");
const VS = await import("./js/data/visits-store.js");
const SD = await import("./js/data/shift-days.js");
const SA = await import("./js/data/shift-assignments.js");
const NF = await import("./js/data/night-fix.js");
const AU = await import("./js/data/audit-trail.js");
const RO = await import("./js/config/roles.js");
const PE = await import("./js/config/permissions.js");
const EN = await import("./js/data/shift-engine.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(6)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const ADMIN = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029", ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105", DIVYA = "EMP-1061";
// the office clock: a date and "HH:MM" in India time -> the instant, and the { date, minutes } the data layer takes
const clock = (date, hm) => { const [y, m, d] = date.split("-").map(Number); const [h, mi] = hm.split(":").map(Number); NOW = RealDate.UTC(y, m - 1, d, h, mi) - 330 * 60000; return { date, minutes: h * 60 + mi }; };
const fresh = (date = "2026-12-21", hm = "10:00") => { mem.clear(); const n = clock(date, hm); A.monthFor(ADMIN, Number(date.slice(0, 4)), Number(date.slice(5, 7))); return n; };
const GPS = (acc = 20, lat = 19.076, lng = 72.8777) => ({ lat, lng, accuracyM: acc });
const FIELDS = { kind: "client", siteName: "Acme Corp, Pune", purpose: "Quarterly review with the client", address: "Baner Road, Pune", fromDate: "2026-12-22", toDate: "2026-12-22" };
const req = (who, over = {}, now) => V.requestVisit(who, { ...FIELDS, ...over }, now);
const auditKinds = () => AU.allEvents().map((e) => e.kind);
// a visit approved by its manager and checked in / out on a day: helper
function approvedFor(who, over = {}, now) { const r = req(who, over, now); const d = V.decideVisit(S.getUser(who) && (who === ARJUN || who === ROHAN ? SNEHA : PRIYA), r.record.id, "approved", "", now); return { r, d, id: r.record?.id }; }

let n0 = fresh();

section("V. Validation");
check("V1", "a plain request is saved pending, for the person, with their manager named", (() => { const r = req(ARJUN, {}, n0); return r.ok && r.record.status === "pending" && r.record.personId === ARJUN && r.record.managerId === SNEHA && r.record.source === "self" && r.record.id === "VS-1"; })());
check("V2", "no kind is refused", req(ARJUN, { kind: "" }, n0).field === "kind");
check("V3", "a one-letter site name is refused, and so is 81 characters", req(ARJUN, { siteName: "A" }, n0).field === "siteName" && req(ARJUN, { siteName: "A".repeat(81) }, n0).field === "siteName" && req(ARJUN, { siteName: "AB", fromDate: "2026-12-23", toDate: "2026-12-23" }, n0).ok);
check("V4", "a purpose under 5 characters is refused, and over 300", req(ARJUN, { purpose: "abcd" }, n0).field === "purpose" && req(ARJUN, { purpose: "x".repeat(301) }, n0).field === "purpose");
check("V5", "an address over 200 characters is refused", req(ARJUN, { address: "a".repeat(201) }, n0).field === "address");
check("V6", "a made-up date and an end before the start are refused", req(ARJUN, { fromDate: "2026-02-30" }, n0).field === "fromDate" && req(ARJUN, { fromDate: "2026-12-24", toDate: "2026-12-23" }, n0).field === "toDate");
check("V7", "more than 31 days is refused, exactly 31 is not", req(ARJUN, { fromDate: "2027-01-05", toDate: "2027-02-10" }, n0).field === "toDate" && req(ARJUN, { fromDate: "2027-01-05", toDate: "2027-02-04" }, n0).ok);
check("V8", "a visit can't start in the past", req(ARJUN, { fromDate: "2026-12-18", toDate: "2026-12-18" }, n0).error === "A visit can't start in the past.");
{ const e = fresh("2026-11-20", "10:00"); const r = req(ARJUN, { fromDate: "2026-11-25", toDate: "2026-11-25" }, e); check("V9", "before the shift rules start (1 Dec 2026) it is refused, saying when", !r.ok && /2026-12-01/.test(r.error), r.error); n0 = fresh(); }
{ const id = (S.addUser(ADMIN, { name: "New Joiner", email: "nj.v@northwind.com", department: "ENG", designation: "Software Engineer", role: "emp", dateOfJoining: "5 Jan 2027", employmentType: "Full-time" }), S.getAllUsers().find((u) => u.email === "nj.v@northwind.com").id);
  const r = V.assignVisit(PRIYA, [id], { ...FIELDS, fromDate: "2026-12-22", toDate: "2026-12-22" }, n0);
  check("V10", "before the person's joining date is refused (the employment period)", !r.ok && /joins on 2027-01-05/.test(r.error), r.error);
  check("V11", "from the joining date it is allowed", V.assignVisit(PRIYA, [id], { ...FIELDS, fromDate: "2027-01-05", toDate: "2027-01-06" }, n0).ok); }
{ const lv = L.applyLeave(ADMIN, { type: "casual", from: "2026-12-23", to: "2026-12-24", duration: "full", reason: "Family function" });
  const r = req(ADMIN, { fromDate: "2026-12-24", toDate: "2026-12-24" }, n0);
  check("V12", "approved leave overlapping the visit refuses it with code leave", lv.ok && !r.ok && r.code === "leave", j(lv.ok ? r.error : lv));
  check("V13", "a day next to the leave is fine", req(ADMIN, { fromDate: "2026-12-22", toDate: "2026-12-22" }, n0).ok); }
{ const a = req(ROHAN, { fromDate: "2026-12-28", toDate: "2026-12-29" }, n0);
  const b = req(ROHAN, { fromDate: "2026-12-29", toDate: "2026-12-30" }, n0);
  check("V14", "another visit on the same day is refused with code overlap, naming it", a.ok && !b.ok && b.code === "overlap" && b.error.includes(a.record.id), b.error);
  V.cancelVisit(ROHAN, a.record.id, "", n0);
  check("V15", "a cancelled visit no longer blocks the day", req(ROHAN, { fromDate: "2026-12-29", toDate: "2026-12-30" }, n0).ok);
  const rej = req(VIKRAM, { fromDate: "2026-12-29", toDate: "2026-12-29" }, n0); V.decideVisit(PRIYA, rej.record.id, "rejected", "Not needed", n0);
  check("V16", "a rejected visit no longer blocks the day", req(VIKRAM, { fromDate: "2026-12-29", toDate: "2026-12-29" }, n0).ok); }
check("V17", "a single Saturday is refused with code off-day", (() => { const r = req(ANANYA, { fromDate: "2026-12-26", toDate: "2026-12-26" }, n0); return !r.ok && r.code === "off-day"; })());
{ const r = req(ANANYA, { fromDate: "2027-01-08", toDate: "2027-01-11" }, n0);
  check("V18", "Friday to Monday leaves out the weekend", r.ok && j(r.record.dates) === j(["2027-01-08", "2027-01-11"]), r.ok ? j(r.record.dates) : r.error);
  const a = V.assignVisit(PRIYA, [VIKRAM], { ...FIELDS, fromDate: "2027-01-16", toDate: "2027-01-16", allowOffDay: true }, n0);
  check("V19", "an assigner may allow a weekly off day", a.ok && j(a.records[0].dates) === j(["2027-01-16"]), a.ok ? "" : a.error);
  const own = req(VIKRAM, { fromDate: "2027-01-23", toDate: "2027-01-23", allowOffDay: true }, n0);
  check("V20", "a person asking for themselves can't allow an off day", !own.ok && own.code === "off-day"); }
{ const r = req(KABIR, { fromDate: "2026-12-31", toDate: "2027-01-04" }, n0);
  check("V21", "a visit across the month end keeps both months' working days", r.ok && r.record.dates.includes("2026-12-31") && r.record.dates.some((d) => d.startsWith("2027-01")) && !r.record.dates.some((d) => EN.weekdayOf(d) === 0 || EN.weekdayOf(d) === 6), r.ok ? j(r.record.dates) : r.error); }
check("V22", "an inactive person has no visits", !V.requestVisit(DIVYA, { ...FIELDS }, n0).ok);
check("V23", "the kind must be one of the three", ["client", "official", "offsite"].every((k, i) => req(MEERA, { kind: k, fromDate: `2027-02-0${i + 1}`, toDate: `2027-02-0${i + 1}` }, n0).ok) && req(MEERA, { kind: "holiday", fromDate: "2027-02-10", toDate: "2027-02-10" }, n0).field === "kind");

section("F. The flow: who may do what");
n0 = fresh();
const f1 = req(ARJUN, { fromDate: "2026-12-22", toDate: "2026-12-23" }, n0).record;
check("F1", "the person's manager (Sneha) can decide, HR can't while the person has a manager", V.mayDecideVisit(SNEHA, ARJUN) && !V.mayDecideVisit(PRIYA, ARJUN) && !V.mayDecideVisit(ADMIN, ARJUN));
check("F2", "someone from another team can't decide", !V.decideVisit(KABIR, f1.id, "approved", "", n0).ok && !V.decideVisit(ROHAN, f1.id, "approved", "", n0).ok && VS.getVisit(f1.id).status === "pending");
check("F3", "nobody decides their own", (() => { const r = V.decideVisit(ARJUN, f1.id, "approved", "", n0); return !r.ok && /own/.test(r.error) && VS.getVisit(f1.id).status === "pending"; })());
check("F4", "a rejection needs a reason of 3 to 200 characters", V.decideVisit(SNEHA, f1.id, "rejected", "", n0).field === "note" && V.decideVisit(SNEHA, f1.id, "rejected", "no", n0).field === "note" && V.decideVisit(SNEHA, f1.id, "rejected", "x".repeat(201), n0).field === "note");
check("F5", "approving by the manager makes it approved, with who and when, and writes the audit", (() => { const r = V.decideVisit(SNEHA, f1.id, "approved", "", n0); return r.ok && r.record.status === "approved" && r.record.approvedBy === SNEHA && !!r.record.approvedAt && auditKinds().includes("visit-approved"); })());
check("F6", "it can't be decided twice", V.decideVisit(SNEHA, f1.id, "rejected", "changed my mind", n0).error === "This visit is already approved.");
{ const a = req(ANANYA, { fromDate: "2026-12-22", toDate: "2026-12-22" }, n0).record;
  check("F7", "a person with no manager is decided by HR or an Admin", V.mayDecideVisit(PRIYA, ANANYA) && V.mayDecideVisit(ADMIN, ANANYA) && !V.mayDecideVisit(SNEHA, ANANYA));
  check("F8", "...and approving works for HR", V.decideVisit(PRIYA, a.id, "approved", "", n0).ok);
  const ad = req(ADMIN, { fromDate: "2026-12-22", toDate: "2026-12-22" }, n0).record;
  check("F9", "an Admin's own request waits (no auto-approval); another approver decides it, not themselves", ad.status === "pending" && !V.mayDecideVisit(ADMIN, ADMIN) && V.mayDecideVisit(PRIYA, ADMIN) && V.decideVisit(ADMIN, ad.id, "approved", "", n0).error === "You can't decide your own visit." && V.decideVisit(PRIYA, ad.id, "approved", "", n0).ok); }
{ const r = V.assignVisit(SNEHA, [ARJUN, ROHAN], { ...FIELDS, fromDate: "2026-12-30", toDate: "2026-12-30" }, n0);
  check("F10", "a manager assigns to direct reports: both start approved, source assigned, assigner recorded", r.ok && r.records.length === 2 && r.records.every((x) => x.status === "approved" && x.source === "assigned" && x.assignedBy === SNEHA && x.approvedBy === SNEHA));
  const before = VS.allVisits().length;
  const bad = V.assignVisit(SNEHA, [ARJUN, PRIYA], { ...FIELDS, fromDate: "2027-02-02", toDate: "2027-02-02" }, n0);
  check("F11", "assigning to someone who isn't a direct report refuses everyone: nothing is saved", !bad.ok && VS.allVisits().length === before && bad.errors.length === 1 && bad.errors[0].personId === PRIYA);
  check("F12", "no one assigns to themselves; an employee can't assign at all", !V.assignVisit(SNEHA, [SNEHA], FIELDS, n0).ok && !V.assignVisit(ARJUN, [ROHAN], FIELDS, n0).ok && !V.assignVisit(ROHAN, [ARJUN], FIELDS, n0).ok);
  check("F13", "HR assigns anyone, Admin anyone", V.assignVisit(PRIYA, [VIKRAM], { ...FIELDS, fromDate: "2027-02-03", toDate: "2027-02-03" }, n0).ok && V.assignVisit(ADMIN, [ANANYA], { ...FIELDS, fromDate: "2027-02-03", toDate: "2027-02-03" }, n0).ok);
  check("F14", "an assigned visit's validation is the same (leave, overlap, off day)", !V.assignVisit(PRIYA, [VIKRAM], { ...FIELDS, fromDate: "2027-02-03", toDate: "2027-02-03" }, n0).ok && !V.assignVisit(PRIYA, [VIKRAM], { ...FIELDS, fromDate: "2027-02-06", toDate: "2027-02-06" }, n0).ok); }
{ const m = req(MEERA, { fromDate: "2027-03-01", toDate: "2027-03-01" }, n0).record;
  check("F15", "Meera's manager is Kabir (Finance): he decides, Sneha doesn't", V.mayDecideVisit(KABIR, MEERA) && !V.mayDecideVisit(SNEHA, MEERA) && V.decideVisit(KABIR, m.id, "approved", "", n0).ok); }
{ const c = req(VIKRAM, { fromDate: "2027-03-02", toDate: "2027-03-02" }, n0).record;
  check("F16", "cancelling before it starts: the person can for their own request", V.cancelVisit(VIKRAM, c.id, "plans changed", n0).ok && VS.getVisit(c.id).status === "cancelled");
  check("F17", "a cancelled visit can't be decided or cancelled again", !V.decideVisit(PRIYA, c.id, "approved", "", n0).ok && !V.cancelVisit(VIKRAM, c.id, "", n0).ok);
  const as = V.assignVisit(PRIYA, [VIKRAM], { ...FIELDS, fromDate: "2027-03-03", toDate: "2027-03-03" }, n0).records[0];
  check("F18", "the person can't cancel a visit someone assigned them; the assigner and the Admin can", !V.cancelVisit(VIKRAM, as.id, "", n0).ok && V.cancelVisit(ADMIN, as.id, "", n0).ok);
  const o = req(ROHAN, { fromDate: "2027-03-04", toDate: "2027-03-04" }, n0).record;
  check("F19", "someone else can't cancel another person's request", !V.cancelVisit(ARJUN, o.id, "", n0).ok && !V.cancelVisit(KABIR, o.id, "", n0).ok && V.cancelVisit(SNEHA, o.id, "", n0).ok); }

section("P. Punching in and out");
n0 = fresh();
const day = "2026-12-22";
const apr = approvedFor(ARJUN, { fromDate: day, toDate: day }, n0).id;
const t1 = clock(day, "10:05");
check("P1", "no check-in on a visit that is still pending", (() => { const p = req(ROHAN, { fromDate: day, toDate: day }, n0).record; const r = V.visitCheckIn(ROHAN, GPS(), {}, t1); return !r.ok && r.code === "not-approved" && !!p; })());
check("P2", "no visit today: refused with code no-visit", V.visitCheckIn(ANANYA, GPS(), {}, t1).code === "no-visit");
check("P3", "a check-in with no location is refused (code no-location), writing nothing", (() => { const r = V.visitCheckIn(ARJUN, null, {}, t1); return r.code === "no-location" && !VS.getVisit(apr).days[day]; })());
check("P4", "a reading worse than 200 m is refused, 250 m", V.visitCheckIn(ARJUN, GPS(250), {}, t1).code === "inaccurate" && !VS.getVisit(apr).days[day]);
check("P5", "non-numbers and impossible coordinates are refused", V.visitCheckIn(ARJUN, { lat: "x", lng: 1, accuracyM: 5 }, {}, t1).code === "no-location" && V.visitCheckIn(ARJUN, { lat: 95, lng: 1, accuracyM: 5 }, {}, t1).code === "no-location" && V.visitCheckIn(ARJUN, { lat: 1, lng: 200, accuracyM: 5 }, {}, t1).code === "no-location");
const ci = V.visitCheckIn(ARJUN, GPS(150, 12.9716, 77.5946), {}, t1);
check("P6", "150 m is accepted and flagged low accuracy; a place far from any office is fine (no 150 m rule)", ci.ok && ci.punch.lowAccuracy === true && ci.punch.accuracy === 150 && ci.punch.lat === 12.9716 && ci.punch.time === "10:05", ci.ok ? "" : ci.error);
check("P7", "the first check-in starts it: status in-progress, a started event in the audit", VS.getVisit(apr).status === "in-progress" && auditKinds().includes("visit-started"));
check("P8", "a second check-in the same day is refused", V.visitCheckIn(ARJUN, GPS(), {}, clock(day, "10:30")).code === "done");
check("P9", "a check-out earlier than the check-in is refused", /earlier/.test(V.visitCheckOut(ARJUN, GPS(), {}, clock(day, "10:00")).error ?? ""));
check("P10", "a check-out with no location is refused too", V.visitCheckOut(ARJUN, null, {}, clock(day, "16:00")).code === "no-location" && V.visitCheckOut(ARJUN, GPS(300), {}, clock(day, "16:00")).code === "inaccurate");
const co = V.visitCheckOut(ARJUN, GPS(30), {}, clock(day, "17:00"));
check("P11", "the check-out of the last day completes the visit", co.ok && co.completed && VS.getVisit(apr).status === "completed" && auditKinds().includes("visit-completed"));
check("P12", "no check-out before a check-in; none twice", V.visitCheckOut(ARJUN, GPS(), {}, clock(day, "17:30")).code === "done");
{ const m = approvedFor(SNEHA, { fromDate: "2027-01-12", toDate: "2027-01-13" }, n0); // Sneha has no manager: HR decides, so approve as Priya
  const id = req(ROHAN, { fromDate: "2027-01-12", toDate: "2027-01-13" }, n0).record.id; V.decideVisit(SNEHA, id, "approved", "", n0);
  V.visitCheckIn(ROHAN, GPS(), {}, clock("2027-01-12", "09:00")); const o1 = V.visitCheckOut(ROHAN, GPS(), {}, clock("2027-01-12", "18:00"));
  check("P13", "on a multi-day visit the first day's check-out doesn't complete it", o1.ok && !o1.completed && VS.getVisit(id).status === "in-progress");
  V.visitCheckIn(ROHAN, GPS(), {}, clock("2027-01-13", "09:00")); const o2 = V.visitCheckOut(ROHAN, GPS(), {}, clock("2027-01-13", "18:00"));
  check("P14", "...the last day's does", o2.ok && o2.completed && VS.getVisit(id).status === "completed" && !!m); }
n0 = fresh();
{ const id = approvedFor(ARJUN, { fromDate: day, toDate: day }, n0).id; const t = clock(day, "11:00");
  check("P15", "'location unavailable' needs a reason", V.visitCheckIn(ARJUN, null, { unavailable: true, reason: " " }, t).field === "reason");
  const u = V.visitCheckIn(ARJUN, null, { unavailable: true, reason: "No signal in the basement" }, t);
  check("P16", "...with one it is kept, marked needing the approver's OK, with no coordinates", u.ok && u.punch.needsOk && u.punch.source === "unavailable" && u.punch.lat === null && !u.punch.okBy);
  check("P17", "an unavailable punch doesn't count yet: the day reads Visit not started", SD.shiftDayFor(ARJUN, day, t).status === "visit-planned" && SD.shiftDayFor(ARJUN, day, t).visit.awaitingOk === true);
  check("P18", "it waits in the manager's list as a location item", V.pendingVisitItems(SNEHA).some((x) => x.kind === "location" && x.visitId === id && x.side === "in"));
  check("P18b", "an unavailable-location punch is not 'on site today' until it is accepted", V.onSiteToday(SNEHA, t).length === 0 && V.onSiteToday(PRIYA, t).length === 0);
  check("P19", "only the person's approver may OK it, and not without a note", !V.okVisitLocation(ARJUN, id, day, "in", "fine", t).ok && !V.okVisitLocation(PRIYA, id, day, "in", "fine", t).ok && V.okVisitLocation(SNEHA, id, day, "in", "", t).field === "note");
  const ok = V.okVisitLocation(SNEHA, id, day, "in", "Spoke to the client, was there", t);
  check("P20", "the OK is kept (who, when, why), audited, and the day now counts", ok.ok && VS.getVisit(id).days[day].in.okBy === SNEHA && SD.shiftDayFor(ARJUN, day, t).status === "on-site" && auditKinds().includes("visit-location-ok"));
  check("P20b", "...and once accepted the person is on site today", V.onSiteToday(SNEHA, t).length === 1 && V.onSiteToday(SNEHA, t)[0].personId === ARJUN);
  check("P21", "an OK can't be given twice, nor for a punch with a location", !V.okVisitLocation(SNEHA, id, day, "in", "again", t).ok && !V.okVisitLocation(SNEHA, id, day, "out", "none", t).ok); }
n0 = fresh();
{ const id = approvedFor(ARJUN, { fromDate: day, toDate: day }, n0).id;
  V.visitCheckIn(ARJUN, GPS(), {}, clock(day, "09:00"));
  check("P22", "a started visit can't be cancelled", !V.cancelVisit(ARJUN, id, "", n0).ok && !V.cancelVisit(SNEHA, id, "", n0).ok && VS.getVisit(id).status === "in-progress"); }
{ n0 = fresh(); const id = approvedFor(ARJUN, { fromDate: day, toDate: day }, n0).id;
  check("P23", "a person who already checked in at the office that day can't start the visit", (() => { A.writeShiftCheckIn(ARJUN, day, "09:40", "office", null); const r = V.visitCheckIn(ARJUN, GPS(), {}, clock(day, "10:00")); return r.code === "office" && !!id; })()); }

{ // defence in depth: a punch on a visit that is somehow still "approved" also blocks cancelling (a stored state the app doesn't make)
  n0 = fresh(); const id = approvedFor(ARJUN, { fromDate: day, toDate: day }, n0).id; V.visitCheckIn(ARJUN, GPS(), {}, clock(day, "09:00"));
  const box = VS.readBox(); box.visits.find((v) => v.id === id).status = "approved"; VS.writeBox(box);
  check("P24", "a visit with a punch can't be cancelled even if its status says approved", !V.cancelVisit(SNEHA, id, "", n0).ok && /started/.test(V.cancelVisit(SNEHA, id, "", n0).error)); }

section("D. The day");
n0 = fresh();
{ const id = approvedFor(ARJUN, { fromDate: "2026-12-22", toDate: "2026-12-22" }, n0).id; const d0 = "2026-12-22";
  const before = SD.shiftDayFor(ARJUN, d0, clock(d0, "09:00"));
  check("D1", "an approved visit day with no check-in yet reads 'Visit not started', not absent, flagged, not incomplete today", before.status === "visit-planned" && before.onSite === true && before.visit.id === id && before.incomplete === false && before.minutesLate === 0);
  const late = SD.shiftDayFor(ARJUN, d0, clock(d0, "23:30"));
  check("D2", "late in the day it is still not absent", late.status === "visit-planned" && late.status !== "absent");
  const after = SD.shiftDayFor(ARJUN, d0, clock("2026-12-23", "09:00"));
  check("D3", "after the day, with no check-in, it is incomplete (HR sees it), still not absent", after.status === "visit-planned" && after.incomplete === true);
  check("D4", "its loss of pay is nothing while it is open: the day is not in the settled loss of pay nor in the waiting list", (() => { const nw = clock("2027-01-20", "10:00"); const lop = SD.shiftMonthLossOfPay(ARJUN, 2026, 12, nw); const m = SD.shiftMonthFor(ARJUN, 2026, 12, nw); const before = lop.days; return m.days.find((d) => d.date === d0).status === "visit-planned" && !lop.open.some((o) => o.date === d0) && typeof before === "number"; })());
  V.visitCheckIn(ARJUN, GPS(), {}, clock(d0, "14:00"));
  const mid = SD.shiftDayFor(ARJUN, d0, clock(d0, "15:30"));
  check("D5", "checked in at 14:00 (late for the office shift) is still On-site, not late, in progress, 90 minutes so far", mid.status === "on-site" && mid.minutesLate === 0 && mid.inProgress === true && mid.minutesWorked === 90 && mid.checkIn === "14:00");
  V.visitCheckOut(ARJUN, GPS(), {}, clock(d0, "23:00"));
  const full = SD.shiftDayFor(ARJUN, d0, clock("2026-12-23", "09:00"));
  check("D6", "9 hours on site: On-site, hours 9, no overtime however long (General's overtime would start after 18:45)", full.status === "on-site" && full.hours === 9 && full.overtimeMinutes === 0 && full.minutesWorked === 540 && full.incomplete === false);
  check("D7", "the visit's details travel with the day for the pages", full.visit.siteName === FIELDS.siteName && full.visit.kind === "client" && full.visit.purpose === FIELDS.purpose); }
n0 = fresh();
{ const d1 = "2026-12-22"; const ids = [[ARJUN, "10:00", "13:00"], [ROHAN, "10:00", "11:59"], [VIKRAM, "09:00", "17:00"]].map(([p, a, b], i) => { const r = V.assignVisit(PRIYA, [p], { ...FIELDS, fromDate: d1, toDate: d1 }, n0); V.visitCheckIn(p, GPS(), {}, clock(d1, a)); V.visitCheckOut(p, GPS(), {}, clock(d1, b)); return r.records[0].id; });
  const dd = (p) => SD.shiftDayFor(p, d1, clock("2026-12-23", "09:00"));
  check("D8", "3 hours (under General's 8 h half-day threshold) is a half day, not absent", dd(ARJUN).status === "half-day" && dd(ARJUN).onSite === true);
  check("D9", "just under the threshold is a half day, just at it is On-site", dd(ROHAN).status === "half-day" && dd(VIKRAM).status === "on-site" && dd(VIKRAM).hours === 8 && !!ids);
  check("D10", "a half day on a visit costs what any half day costs (0.5), no more", SD.shiftMonthLossOfPay(ARJUN, 2026, 12, clock("2027-01-20", "10:00")).halfDay === 0.5 && SD.shiftMonthLossOfPay(VIKRAM, 2026, 12, clock("2027-01-20", "10:00")).days === SD.shiftMonthLossOfPay(VIKRAM, 2026, 12, clock("2027-01-20", "10:00")).penaltyHalfDays * 0.5 + SD.shiftMonthLossOfPay(VIKRAM, 2026, 12, clock("2027-01-20", "10:00")).absent);
  const mo = SD.shiftMonthFor(VIKRAM, 2026, 12, clock("2027-01-20", "10:00"));
  check("D11", "the month counts the on-site day and its days worked include it", mo.counts.onSite === 1 && mo.daysWorked >= 1); }
n0 = fresh();
{ // a month with no visits has no new keys at all
  const mo = SD.shiftMonthFor(ARJUN, 2026, 12, clock("2027-01-20", "10:00"));
  check("D12", "a month with no visit has no onSite / visitPlanned counts and no visit fields on its days", !("onSite" in mo.counts) && !("visitPlanned" in mo.counts) && mo.days.every((d) => !("onSite" in d) && !("visit" in d)));
  const dec = SD.shiftMonthFor(ARJUN, 2026, 12, clock("2027-01-20", "10:00")), a = j(dec), pristine = a;
  req(ARJUN, { fromDate: "2027-02-10", toDate: "2027-02-10" }, n0);
  check("D13", "asking for a visit in another month changes nothing in this month", j(SD.shiftMonthFor(ARJUN, 2026, 12, clock("2027-01-20", "10:00"))) === pristine); }
n0 = fresh();
{ // a night-shift person on a visit
  const shifted = SA.assignShift(PRIYA, ROHAN, "SH-3", n0.date, null, "night", n0.date);
  const id = V.assignVisit(PRIYA, [ROHAN], { ...FIELDS, fromDate: "2026-12-22", toDate: "2026-12-22" }, n0).records[0].id;
  V.visitCheckIn(ROHAN, GPS(), {}, clock("2026-12-22", "11:00")); V.visitCheckOut(ROHAN, GPS(), {}, clock("2026-12-22", "20:00"));
  const nd = SD.shiftDayFor(ROHAN, "2026-12-22", clock("2026-12-23", "09:00"));
  check("D14", "a night-shift person's visit by day reads On-site, 9 h, not late, no overtime, still a night shift on the record", shifted.ok && nd.status === "on-site" && nd.crossesMidnight === true && nd.shiftName === "Night" && nd.minutesLate === 0 && nd.overtimeMinutes === 0 && nd.hours === 9 && !!id); }
n0 = fresh();
{ const r = V.assignVisit(PRIYA, [KABIR], { ...FIELDS, fromDate: "2026-12-30", toDate: "2027-01-05" }, n0).records[0];
  for (const d of r.dates) { V.visitCheckIn(KABIR, GPS(), {}, clock(d, "09:30")); V.visitCheckOut(KABIR, GPS(), {}, clock(d, "18:30")); }
  const now = clock("2027-02-01", "10:00");
  const dm = SD.shiftMonthFor(KABIR, 2026, 12, now), jm = SD.shiftMonthFor(KABIR, 2027, 1, now);
  const dec = r.dates.filter((d) => d.startsWith("2026-12")), jan = r.dates.filter((d) => d.startsWith("2027-01"));
  check("D15", "across the month end both months read On-site on their own days", dec.every((d) => dm.days.find((x) => x.date === d).status === "on-site") && jan.every((d) => jm.days.find((x) => x.date === d).status === "on-site") && dm.counts.onSite === dec.length && jm.counts.onSite === jan.length, `${dec.length} + ${jan.length}`);
  check("D16", "neither month has an absence from the visit days", [...dm.days, ...jm.days].filter((x) => r.dates.includes(x.date)).every((x) => x.status !== "absent")); }
n0 = fresh();
{ // a same-day visit: counts at once, rejected afterwards goes back to the ordinary rules
  const d0 = n0.date, t = clock(d0, "10:00");
  const r = V.requestVisit(ARJUN, { ...FIELDS, sameDay: true, fromDate: "2026-12-01", toDate: d0 }, t);
  check("D17", "a same-day visit starts at once (in progress), approval pending, and ignores the date given", r.ok && r.record.status === "in-progress" && r.record.approvalPending === true && r.record.sameDay === true && r.record.fromDate === d0);
  V.visitCheckIn(ARJUN, GPS(), {}, clock(d0, "10:15"));
  check("D18", "it counts at once: On-site, flagged as same day, awaiting approval", (() => { const d = SD.shiftDayFor(ARJUN, d0, clock(d0, "11:00")); return d.status === "on-site" && d.visit.sameDay && d.visit.approvalPending; })());
  check("D19", "it waits in Sneha's list, flagged same day", V.pendingVisitItems(SNEHA).some((x) => x.id === r.record.id && x.sameDay === true));
  const rej = V.decideVisit(SNEHA, r.record.id, "rejected", "Not agreed beforehand", clock(d0, "11:30"));
  check("D20", "rejecting it afterwards: status rejected, and the day goes back to the ordinary office rules", rej.ok && SD.shiftDayFor(ARJUN, d0, clock(d0, "11:30")).onSite !== true && !(SD.shiftDayFor(ARJUN, d0, clock(d0, "11:30")).visit));
  const r2 = V.requestVisit(ROHAN, { ...FIELDS, sameDay: true }, t); V.visitCheckIn(ROHAN, GPS(), {}, clock(d0, "10:20"));
  const ap = V.decideVisit(SNEHA, r2.record.id, "approved", "", clock(d0, "12:00"));
  check("D21", "approving it afterwards keeps it, no longer pending", ap.ok && VS.getVisit(r2.record.id).approvalPending === false && VS.getVisit(r2.record.id).status === "in-progress"); }

section("N. A night shift's missed check-out, fixed the next morning");
n0 = fresh("2026-12-01", "10:00");
SA.assignShift(PRIYA, ROHAN, "SH-3", "2026-12-01", null, "night", "2026-12-01");
n0 = clock("2026-12-16", "15:00");
const hasShift = SA.assignmentReader()(ROHAN, "2026-12-15").shiftId === "SH-3";
A.writeShiftCheckIn(ROHAN, "2026-12-15", "22:05", "office", null);
const fixReq = (time, date = "2026-12-15", who = ROHAN) => A.requestRegularization(who, { date, issue: "missed-check-out", time, reason: "Forgot to check out" });
const clearPending = (who = ROHAN) => A.regularizationsFor(who).filter((r) => r.status === "pending").forEach((r) => A.cancelRegularization(r.id, who));
check("N1", "setup: Rohan is on the Night shift on 15 Dec with a check-in at 22:05 and no check-out", hasShift && A.storedRecord(ROHAN, "2026-12-15").checkIn === "22:05" && !A.storedRecord(ROHAN, "2026-12-15").checkOut);
check("N2", "the next morning's 06:45 is accepted for the shift day (15 Dec)", fixReq("06:45").ok);
{ clearPending();
  check("N3", "the end of the window (shift end 07:00 + 6 h = 13:00) is accepted", fixReq("13:00").ok);
  clearPending();
  const late = fixReq("13:01");
  check("N4", "one minute past it is refused, naming the limit", !late.ok && late.field === "time" && /13:00/.test(late.error), late.error);
  check("N5", "an afternoon / evening time after the window is refused", !fixReq("14:30").ok && !fixReq("21:00").ok && !fixReq("19:59").ok);
  check("N6", "the same evening (23:30) is fine, the check-in time itself is not", fixReq("23:30").ok && (() => { clearPending(); return !fixReq("22:05").ok; })()); }
globalThis.__n7 = "";
check("N7", "a wrong day is refused: the morning after (today) has nothing to complete, and a day already complete has nothing to fix", (() => { const r = fixReq("06:45", "2026-12-16"), q = fixReq("06:45", "2026-12-14"); globalThis.__n7 = j([r, q]); return !r.ok && ["date", "issue"].includes(r.field) && !q.ok && /already recorded/.test(q.error); })(), globalThis.__n7);
check("N8", "a day with no night shift on it keeps the old rule (a day-shift person's 07:00 is before their check-in)", (() => { A.writeShiftCheckIn(ARJUN, "2026-12-15", "09:40", "office", null); const r = fixReq("07:00", "2026-12-15", ARJUN); return !r.ok && /later than the check-in/.test(r.error); })());
check("N9", "a day-shift person's ordinary check-out is accepted as before", fixReq("18:40", "2026-12-15", ARJUN).ok);
{ const c = NF.correctionContext(ROHAN, "2026-12-15", "06:45");
  check("N10", "the form's context: the shift, that it crosses midnight, the next-day label and the limit", c.shiftName === "Night" && c.start === "22:00" && c.end === "07:00" && c.crossesMidnight && c.nextDay === true && c.until === "13:00" && c.window === 360);
  check("N11", "a day shift's context says it is not a next-day shift", NF.correctionContext(ARJUN, "2026-12-15", "18:40").crossesMidnight === false && NF.correctionContext(ARJUN, "2026-12-15", "18:40").nextDay === false);
  check("N12", "before the shift rules start there is no context and the judge is silent", NF.correctionContext(ROHAN, "2026-11-20", "06:45") === null && NF.nightCheckOutJudge(ROHAN, "2026-11-20", { checkIn: "22:00" }, "06:45") === null); }
check("N13", "the window is an HR / Admin setting: others can't change it, and only 0 to 720 whole minutes", !NF.setNightFixWindow(ARJUN, 120).ok && !NF.setNightFixWindow(PRIYA, -1).ok && !NF.setNightFixWindow(PRIYA, 721).ok && !NF.setNightFixWindow(PRIYA, 90.5).ok && NF.nightFixWindow() === 360);
{ NF.setNightFixWindow(PRIYA, 120);
  clearPending();
  check("N14", "with a 2 h window 09:00 is accepted and 09:01 refused", fixReq("09:00").ok && (() => { clearPending(); return !fixReq("09:01").ok; })());
  NF.setNightFixWindow(PRIYA, 360); clearPending(); }
{ const id = fixReq("06:45").record.id;
  const s1 = A.decideRegularization(id, SNEHA, "emp", "approve", "");
  const s2 = A.decideRegularization(id, PRIYA, "hr", "approve", "");
  const rec = A.storedRecord(ROHAN, "2026-12-15"); const dd = SD.shiftDayFor(ROHAN, "2026-12-15", clock("2026-12-16", "15:00"));
  check("N15", "the approval chain applies it: the record gets the 06:45 check-out and the day reads as a worked night shift (22:05 to 06:45 less the 30 minute break = 490)", s1.ok && s2.ok && rec.checkOut === "06:45" && dd.incomplete === false && dd.minutesWorked === 490 && dd.status !== "absent", j([s1.ok, s2.ok, rec.checkOut, dd.status, dd.minutesWorked, dd.incomplete])); }

section("R. Permissions, what each person sees, what waits");
n0 = fresh();
check("R1", "102 permissions in 43 modules, the four new ones among them", PE.ALL_PERMISSIONS.length === 102 && Object.keys(PE.PERMISSIONS).length === 43 && ["request", "approve", "assign", "view-all"].every((a) => PE.ALL_PERMISSIONS.includes(`visits:${a}`)));
check("R2", "Admin 102, HR 58, Finance 48, Employee 30", RO.ROLES.admin.permissions.length === 102 && RO.ROLES.hr.permissions.length === 58 && RO.ROLES.fin.permissions.length === 48 && RO.ROLES.emp.permissions.length === 30, j(["admin", "hr", "fin", "emp"].map((k) => RO.ROLES[k].permissions.length)));
check("R3", "everyone can request, approve and assign through a relationship; only HR and Admin hold view-all", ["admin", "hr", "fin", "emp"].every((k) => ["visits:request", "visits:approve", "visits:assign"].every((p) => RO.ROLES[k].permissions.includes(p))) && RO.ROLES.hr.permissions.includes("visits:view-all") && RO.ROLES.admin.permissions.includes("visits:view-all") && !RO.ROLES.fin.permissions.includes("visits:view-all") && !RO.ROLES.emp.permissions.includes("visits:view-all"));
check("R4", "none of the four can be overridden onto or off a person", !RO.OVERRIDABLE.some((p) => p.startsWith("visits:")));
{ const a = req(ARJUN, { fromDate: "2026-12-22", toDate: "2026-12-22" }, n0).record, b = req(ANANYA, { fromDate: "2026-12-22", toDate: "2026-12-22" }, n0).record;
  const ids = (v) => V.visitsVisibleTo(v).map((x) => x.id).sort();
  check("R5", "visits seen: you your own, a manager their reports', HR and Admin everyone's", j(ids(ARJUN)) === j([a.id]) && j(ids(SNEHA)) === j([a.id]) && j(ids(PRIYA)) === j([a.id, b.id].sort()) && j(ids(ADMIN)) === j([a.id, b.id].sort()) && ids(ROHAN).length === 0 && ids(KABIR).length === 0);
  check("R6", "waiting: the manager sees her report's, HR sees the one with no manager, not the first", V.pendingVisitItems(SNEHA).map((x) => x.id).join() === a.id && V.pendingVisitItems(PRIYA).map((x) => x.id).join() === b.id && V.pendingVisitItems(ROHAN).length === 0);
  check("R7", "requesting wrote audit events with the actor and person", AU.allEvents().filter((e) => e.kind === "visit-requested").length === 2 && AU.allEvents().every((e) => !/lat|lng/i.test(e.detail)));
  V.decideVisit(SNEHA, a.id, "approved", "", n0); V.decideVisit(PRIYA, b.id, "approved", "", n0);
  V.visitCheckIn(ARJUN, GPS(), {}, clock("2026-12-22", "10:00")); V.visitCheckIn(ANANYA, GPS(), {}, clock("2026-12-22", "10:10")); V.visitCheckOut(ANANYA, GPS(), {}, clock("2026-12-22", "16:00"));
  const nw = clock("2026-12-22", "17:00");
  check("R8", "on site today: HR and Admin see both, Sneha her own report only, others nobody", V.onSiteToday(PRIYA, nw).length === 2 && V.onSiteToday(ADMIN, nw).length === 2 && j(V.onSiteToday(SNEHA, nw).map((x) => x.personId)) === j([ARJUN]) && V.onSiteToday(ANANYA, nw).length === 0 && V.onSiteToday(ROHAN, nw).length === 0);
  check("R9", "on site today shows the site and the check-in / check-out times", (() => { const x = V.onSiteToday(PRIYA, nw).find((y) => y.personId === ANANYA); return x.siteName === FIELDS.siteName && x.checkIn === "10:10" && x.checkOut === "16:00"; })());
  const trail = V.visitTrail(VS.getVisit(a.id));
  check("R10", "the trail has the times, coordinates, accuracy and an Open-in-maps link", trail.length === 1 && trail[0].in.time === "10:00" && trail[0].in.accuracy === 20 && trail[0].inMaps === "https://www.google.com/maps?q=19.076,72.8777" && trail[0].out === null && trail[0].outMaps === null);
  check("R11", "phase: an approved visit not yet begun is 'planned', otherwise the stored status", V.phaseOf({ status: "approved", dates: ["2026-12-30"] }, "2026-12-22") === "planned" && V.phaseOf({ status: "approved", dates: ["2026-12-22"] }, "2026-12-22") === "approved" && V.phaseOf({ status: "completed", dates: ["2026-12-30"] }, "2026-12-22") === "completed"); }
{ mem.clear(); clock("2026-12-21", "10:00"); const before = [...mem.keys()].sort().join();
  V.visitsVisibleTo(PRIYA); V.pendingVisitItems(PRIYA); V.onSiteToday(PRIYA); VS.allVisits(); VS.visitOnDate(ARJUN, "2026-12-22"); SD.shiftDayFor(ARJUN, "2026-12-22", { date: "2026-12-21", minutes: 600 });
  check("R12", "reading never writes the visits key (nothing is saved until someone asks for a visit)", !mem.has("officeos:visits") && !before.includes("officeos:visits")); }

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;