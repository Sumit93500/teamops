// usage: node visits.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// CV1 / CV1b: client / official / off-site visits (data/visits-store.js, data/visits.js, data/visit-days.js) and the night shift's next-morning fix (data/night-fix.js).
//   V  validation: fields, dates, employment period, leave and visit overlap, weekly offs and holidays, month end
//   F  the flow: asking, assigning, deciding (who may, who may not), same-day visits, cancelling
//   P  punching: location required, accuracy, "location unavailable" and the approver's OK, completing
//   D  the day: On-site, Visit not started, half day, never late / absent / overtime, a night shift's visit, a month across the month end
//   N  night shift: a missed check-out fixed the next morning, wrong days and times refused, the window, day shifts unchanged
//   R  permissions, who sees what, what waits, the audit trail; reads write nothing
//   W  CV1b: a visit before the shift rules start (and across their start), a full day whatever the hours, Incomplete, HR completes a visit day,
//      a location-unavailable punch rejected, every attendance count sees the visit day, the night-shift window in hours
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
const P = await import("./js/data/payroll-store.js");
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
{ const e = fresh("2026-11-20", "10:00"); const r = req(ARJUN, { fromDate: "2026-11-25", toDate: "2026-11-25" }, e); check("V9", "before the shift rules start (1 Dec 2026) a visit is allowed (CV1b: it counts under today's rules too)", r.ok && r.record.dates[0] === "2026-11-25", r.ok ? "" : r.error); n0 = fresh(); }
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
  check("D8", "3 hours is still a FULL day (CV1b: the hours are shown, never a half day), not absent", dd(ARJUN).status === "on-site" && dd(ARJUN).onSite === true && dd(ARJUN).hours === 3);
  check("D9", "just under General's 8 h threshold and just at it are both On-site", dd(ROHAN).status === "on-site" && dd(VIKRAM).status === "on-site" && dd(VIKRAM).hours === 8 && !!ids);
  check("D10", "a visit day costs no loss of pay whatever its hours", [ARJUN, ROHAN, VIKRAM].every((p) => { const l = SD.shiftMonthLossOfPay(p, 2026, 12, clock("2027-01-20", "10:00")); return !l.open.some((o) => o.date === d1) && l.halfDay === 0 && l.absent === 0; }));
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
check("R1", "102 permissions in 43 modules, the four new ones among them", PE.ALL_PERMISSIONS.length === 126 && Object.keys(PE.PERMISSIONS).length === 49 /* I1 (behaviour; was 122: the import and export modules) */ /* IT1 (behaviour; was 114 / 46) */ /* AS1 (behaviour; was 105 / 44) */ /* FS1 (behaviour; was 102 / 43) */ && ["request", "approve", "assign", "view-all"].every((a) => PE.ALL_PERMISSIONS.includes(`visits:${a}`)));
check("R2", "Admin 102, HR 58, Finance 48, Employee 30", RO.ROLES.admin.permissions.length === 123 && RO.ROLES.hr.permissions.length === 66 /* IT2 (behaviour; was 64) */ && RO.ROLES.fin.permissions.length === 57 /* I1 (behaviour; were 119, 63, 56: imports and exports) */ /* IT1 (behaviour; were 111, 63, 54) */ /* AS1 (behaviour; were 102, 61, 50) */ /* FS1 (behaviour; were 58, 48) */ && RO.ROLES.emp.permissions.length === 31 /* IT1 (behaviour; was 30) */, j(["admin", "hr", "fin", "emp"].map((k) => RO.ROLES[k].permissions.length)));
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

section("W. CV1b: before the rules start, a full day, HR completes it, locations, the numbers");
const GPSw = (acc = 20) => ({ lat: 19.076, lng: 72.8777, accuracyM: acc });
const punch = (who, date, inT, outT) => { const a = V.visitCheckIn(who, GPSw(), {}, clock(date, inT)); const b = outT ? V.visitCheckOut(who, GPSw(), {}, clock(date, outT)) : null; return [a, b]; };
// W1-W5: a current November date, end to end, for a person created in the app (no sample days: a day with no check-in is a real absence)
const hireNH = () => { S.addUser(ADMIN, { name: "Nia Hart", email: "nia.cv1b@northwind.com", department: "ENG", designation: "Software Engineer", role: "emp", dateOfJoining: "2 Nov 2026", employmentType: "Full-time" }); const id = S.getAllUsers().find((u) => u.email === "nia.cv1b@northwind.com").id; P.setSalary(ADMIN, id, { gross: 62000, effectiveFrom: "2026-01-01" }); return id; };
{ fresh("2026-11-20", "10:00"); const n1 = clock("2026-11-20", "10:00"); const NH = hireNH();
  const r = req(NH, { fromDate: "2026-11-24", toDate: "2026-11-24" }, n1); const ap = V.decideVisit(PRIYA, r.record.id, "approved", "", n1);
  const [pi, po] = punch(NH, "2026-11-24", "10:00", "18:40");
  clock("2026-12-10", "10:00");
  const old = A.dayFor(NH, "2026-11-24"), mo = A.monthFor(NH, 2026, 11), run = P.payrollRunFor(NH, 2026, 11), sh = SD.shiftDayFor(NH, "2026-11-24", clock("2026-12-10", "10:00"));
  check("W1", "a visit on a current November date: asked, approved, checked in and out, all ok", r.ok && ap.ok && pi.ok && po.ok && po.completed, j([r.ok, ap.ok, pi.ok, po.ok]));
  check("W2", "the current rules read that day as present (On-site), never absent, with the visit's times", old.status === "present" && old.onSite === true && old.checkIn === "10:00" && old.checkOut === "18:40" && old.minutesLate === 0 && old.visit.siteName === FIELDS.siteName, j([old.status, old.checkIn, old.checkOut]));
  check("W3", "the month counts it as a day worked (present) and not as an absence", mo.days.find((d) => d.date === "2026-11-24").status === "present" && mo.counts.present >= 1, j(mo.counts));
  check("W4", "...and the shift view (which reads the old days before the rules start) says On-site too", sh.status === "on-site" && sh.onSite === true);
  // the control: the same approved visit with NO check-in is charged as the absence it was
  fresh("2026-11-20", "10:00"); const NC = hireNH(); const rc = req(NC, { fromDate: "2026-11-24", toDate: "2026-11-24" }, clock("2026-11-20", "10:00")); V.decideVisit(PRIYA, rc.record.id, "approved", "", clock("2026-11-20", "10:00"));
  clock("2026-12-10", "10:00"); const runc = P.payrollRunFor(NC, 2026, 11);
  check("W5", "payroll: with the check-in the visit day is not charged; the same visit with no check-in is one more absence day (the control)", A.dayFor(NC, "2026-11-24").status === "absent" && runc.lop.absenceDays === run.lop.absenceDays + 1 && run.lop.absenceDays >= 1, j([run.lop, runc.lop])); }
// W6-W8: across the shift rules start (30 Nov to 2 Dec) and the month end
{ fresh("2026-11-20", "10:00"); const n1 = clock("2026-11-20", "10:00"); const NH = hireNH();
  const r = req(NH, { fromDate: "2026-11-30", toDate: "2026-12-02" }, n1); V.decideVisit(PRIYA, r.record.id, "approved", "", n1);
  for (const d of ["2026-11-30", "2026-12-01", "2026-12-02"]) punch(NH, d, "09:30", "18:30");
  const now = clock("2026-12-31", "10:00");
  const nov = A.monthFor(NH, 2026, 11), dec = SD.shiftMonthFor(NH, 2026, 12, now), lop = SD.shiftMonthLossOfPay(NH, 2026, 12, now);
  check("W6", "a visit across the rules start: the dates are 30 Nov, 1 Dec and 2 Dec", j(r.record.dates) === j(["2026-11-30", "2026-12-01", "2026-12-02"]), j(r.record.dates));
  check("W7", "30 Nov (current rules) reads present, 1 and 2 Dec (shift rules) read On-site; none is absent", nov.days.find((d) => d.date === "2026-11-30").status === "present" && ["2026-12-01", "2026-12-02"].every((d) => dec.days.find((x) => x.date === d).status === "on-site"), j(nov.days.find((d) => d.date === "2026-11-30").status));
  check("W8", "no loss of pay for any of the three days: the shift month has no open or settled loss on 1 and 2 Dec and counts both On-site", !lop.open.some((o) => ["2026-12-01", "2026-12-02"].includes(o.date)) && dec.counts.onSite === 2 && P.payrollRunFor(NH, 2026, 11).lop.absenceDays === nov.days.filter((d) => d.status === "absent" && d.date >= "2026-11-02").length && !nov.days.some((d) => d.date === "2026-11-30" && d.status === "absent"), j([lop.open.map((o) => o.date), P.payrollRunFor(NH, 2026, 11).lop.absenceDays])); }
// W9-W11: a full day whatever the hours; a missing check-out is Incomplete, not absent
n0 = fresh("2026-12-21", "10:00");
{ const id = V.assignVisit(PRIYA, [ARJUN], { ...FIELDS, fromDate: "2026-12-22", toDate: "2026-12-23" }, n0).records[0].id;
  punch(ARJUN, "2026-12-22", "10:00", "11:00");
  const d1 = SD.shiftDayFor(ARJUN, "2026-12-22", clock("2026-12-23", "09:00")), o1 = A.dayFor(ARJUN, "2026-12-22");
  check("W9", "one hour on site is a full day in both readings (hours shown, never a half day)", d1.status === "on-site" && d1.hours === 1 && o1.status === "present" && o1.hours === 1, j([d1.status, o1.status]));
  V.visitCheckIn(ARJUN, GPSw(), {}, clock("2026-12-23", "09:00"));
  const later = clock("2026-12-25", "09:00"), d2 = SD.shiftDayFor(ARJUN, "2026-12-23", later), o2 = A.dayFor(ARJUN, "2026-12-23");
  check("W10", "a check-in with no check-out, after the day: flagged Incomplete in both readings, not absent", d2.status === "on-site" && d2.incomplete === true && o2.status === "present" && o2.incomplete === true, j([d2.status, d2.incomplete, o2.status, o2.incomplete]));
  const l = SD.shiftMonthLossOfPay(ARJUN, 2026, 12, clock("2027-01-20", "10:00"));
  check("W11", "...and it costs no loss of pay until HR decides", l.absent === 0 && l.halfDay === 0 && !l.open.some((o) => o.date === "2026-12-23"), j(l));
  // W12-W22: Complete visit day
  const C = (who, over = {}, date = "2026-12-23") => V.completeVisitDay(who, id, date, { reason: "Client confirmed the visit", ...over }, later);
  check("W12", "a manager can't complete a visit day (Sneha); nor can an employee", !C(SNEHA, { outTime: "17:00" }).ok && !C(ROHAN, { outTime: "17:00" }).ok && !C(ARJUN, { outTime: "17:00" }).ok && /Only HR or an Admin/.test(C(SNEHA, { outTime: "17:00" }).error));
  check("W13", "it needs a check-out time or a full / half mark", C(PRIYA, {}).field === "outcome" && C(PRIYA, { outcome: "most" }).field === "outcome");
  check("W14", "it needs a reason of 3 to 200 characters", C(PRIYA, { outTime: "17:00", reason: "no" }).field === "reason" && C(PRIYA, { outTime: "17:00", reason: "x".repeat(201) }).field === "reason" && C(PRIYA, { outTime: "17:00", reason: "" }).field === "reason");
  check("W15", "the check-out can't be before the check-in, and must be a real time", C(PRIYA, { outTime: "08:00" }).field === "outTime" && C(PRIYA, { outTime: "25:00" }).field === "outTime");
  check("W16", "a day with no check-in, a day of another visit and a future day are refused", V.completeVisitDay(PRIYA, id, "2026-12-24", { outcome: "full", reason: "abc" }, later).ok === false && C(PRIYA, { outcome: "full" }, "2026-12-30").ok === false && V.completeVisitDay(PRIYA, id, "2026-12-23", { outcome: "full", reason: "abc" }, clock("2026-12-22", "20:00")).ok === false);
  const done = C(PRIYA, { outTime: "17:00" });
  const d3 = SD.shiftDayFor(ARJUN, "2026-12-23", later), o3 = A.dayFor(ARJUN, "2026-12-23");
  check("W17", "HR sets the check-out: the day is complete (17:00, 8 h), no longer Incomplete, in both readings", done.ok && d3.incomplete === false && d3.checkOut === "17:00" && d3.hours === 8 && d3.status === "on-site" && o3.incomplete === false && o3.checkOut === "17:00", j([done.ok, d3.incomplete, d3.checkOut]));
  check("W18", "it is audited (visit-day-completed) and in the visit's history, and the visit is completed (last day)", auditKinds().includes("visit-day-completed") && VS.getVisit(id).history.some((h) => h.action === "day-completed" && h.by === PRIYA) && VS.getVisit(id).status === "completed");
  check("W19", "a day can't be completed twice", C(PRIYA, { outcome: "half" }).error === "This day has already been completed.");
  check("W20", "HR can't complete their own visit day (the Admin assigns Priya one)", (() => { const a = V.assignVisit(ADMIN, [PRIYA], { ...FIELDS, fromDate: "2026-12-28", toDate: "2026-12-28" }, n0); punch(PRIYA, "2026-12-28", "10:00"); return a.ok && /own/.test(V.completeVisitDay(PRIYA, a.records[0].id, "2026-12-28", { outcome: "full", reason: "abc" }, clock("2026-12-29", "09:00")).error ?? ""); })());
  // half: only when HR marks it
  const id2 = V.assignVisit(PRIYA, [ROHAN], { ...FIELDS, fromDate: "2026-12-29", toDate: "2026-12-29" }, n0).records[0].id; punch(ROHAN, "2026-12-29", "10:00");
  const lat2 = clock("2026-12-30", "09:00");
  const h = V.completeVisitDay(ADMIN, id2, "2026-12-29", { outcome: "half", reason: "Left the site at noon" }, lat2);
  const hs = SD.shiftDayFor(ROHAN, "2026-12-29", lat2), ho = A.dayFor(ROHAN, "2026-12-29");
  check("W21", "HR marks a day half: it is a half day in both readings (the only way a visit day is half) and costs half a day", h.ok && hs.status === "half-day" && hs.onSite && ho.status === "half-day" && SD.shiftMonthLossOfPay(ROHAN, 2026, 12, clock("2027-01-20", "10:00")).halfDay === 0.5, j([h.ok, hs.status, ho.status]));
  check("W21b", "HR can also mark a day half that has a check-out (a short visit confirmed by phone)", (() => { const id4 = V.assignVisit(PRIYA, [ANANYA], { ...FIELDS, fromDate: "2026-12-29", toDate: "2026-12-29" }, n0).records[0].id; punch(ANANYA, "2026-12-29", "10:00", "17:00"); const r = V.completeVisitDay(PRIYA, id4, "2026-12-29", { outcome: "half", reason: "Visit cut short" }, lat2); return r.ok && SD.shiftDayFor(ANANYA, "2026-12-29", lat2).status === "half-day" && A.dayFor(ANANYA, "2026-12-29").status === "half-day"; })());
  check("W22", "marking a day full (the Admin) clears Incomplete with no check-out and no cost", (() => { const id3 = V.assignVisit(PRIYA, [VIKRAM], { ...FIELDS, fromDate: "2026-12-29", toDate: "2026-12-29" }, n0).records[0].id; punch(VIKRAM, "2026-12-29", "10:00"); const r = V.completeVisitDay(ADMIN, id3, "2026-12-29", { outcome: "full", reason: "Confirmed by phone" }, lat2); return r.ok && SD.shiftDayFor(VIKRAM, "2026-12-29", lat2).incomplete === false && SD.shiftMonthLossOfPay(VIKRAM, 2026, 12, clock("2027-01-20", "10:00")).days === 0; })()); }
// W23-W27: a location-unavailable punch the approver turns down
n0 = fresh("2026-12-21", "10:00");
{ const id = approvedFor(ARJUN, { fromDate: "2026-12-22", toDate: "2026-12-22" }, n0).id; const t = clock("2026-12-22", "11:00");
  V.visitCheckIn(ARJUN, null, { unavailable: true, reason: "No signal in the basement" }, t);
  const item = V.pendingVisitItems(SNEHA).find((x) => x.kind === "location");
  check("W22b", "a punch waiting for the location OK is not counted by the current rules either (not on site, not present)", A.dayFor(ARJUN, "2026-12-22").onSite !== true && SD.shiftDayFor(ARJUN, "2026-12-22", t).status === "visit-planned");
  check("W23", "the location item is one waiting item for the manager only (no duplicate), with its visit and side", V.pendingVisitItems(SNEHA).filter((x) => x.kind === "location").length === 1 && V.pendingVisitItems(PRIYA).length === 0 && item.visitId === id && item.side === "in" && item.userId === ARJUN && new Set(V.pendingVisitItems(SNEHA).map((x) => x.id)).size === V.pendingVisitItems(SNEHA).length);
  check("W24", "only the person's approver may turn it down: not HR (he has a manager), not a colleague, not himself; it needs a reason", !V.rejectVisitLocation(PRIYA, id, "2026-12-22", "in", "Not accepted", t).ok && !V.rejectVisitLocation(ROHAN, id, "2026-12-22", "in", "Not accepted", t).ok && !V.rejectVisitLocation(ARJUN, id, "2026-12-22", "in", "Not accepted", t).ok && V.rejectVisitLocation(SNEHA, id, "2026-12-22", "in", "no", t).field === "note");
  const rj = V.rejectVisitLocation(SNEHA, id, "2026-12-22", "in", "Please check in with your location", t);
  check("W25", "turned down: the punch is taken back, the visit goes back to approved, nothing waits, it is audited and in the history", rj.ok && !VS.getVisit(id).days["2026-12-22"].in && VS.getVisit(id).status === "approved" && V.pendingVisitItems(SNEHA).length === 0 && auditKinds().includes("visit-location-rejected") && VS.getVisit(id).history.some((h) => h.action === "location-rejected"), j(rj.ok && VS.getVisit(id).status));
  check("W26", "...and the day reads as not started again (never counted)", SD.shiftDayFor(ARJUN, "2026-12-22", t).status === "visit-planned" && A.dayFor(ARJUN, "2026-12-22").onSite !== true);
  check("W27", "he can check in again, now with a location", V.visitCheckIn(ARJUN, GPSw(), {}, clock("2026-12-22", "11:30")).ok && !V.rejectVisitLocation(SNEHA, id, "2026-12-22", "in", "Not accepted", t).ok); }
// W27b: turning down a check-out made without a location re-opens the last day
n0 = fresh("2026-12-21", "10:00");
{ const id = approvedFor(ARJUN, { fromDate: "2026-12-22", toDate: "2026-12-22" }, n0).id;
  V.visitCheckIn(ARJUN, GPSw(), {}, clock("2026-12-22", "10:00")); const o = V.visitCheckOut(ARJUN, null, { unavailable: true, reason: "Battery died" }, clock("2026-12-22", "17:00"));
  const rj = V.rejectVisitLocation(SNEHA, id, "2026-12-22", "out", "Please check out with your location", clock("2026-12-22", "17:30"));
  check("W27b", "a rejected check-out is taken back and the last day is open again (the visit is no longer completed), so they can check out again", o.ok && o.completed && rj.ok && !VS.getVisit(id).days["2026-12-22"].out && VS.getVisit(id).status === "in-progress" && V.visitCheckOut(ARJUN, GPSw(), {}, clock("2026-12-22", "18:00")).ok && VS.getVisit(id).status === "completed"); }
// W28-W33: every count sees the visit day as present
n0 = fresh("2026-12-21", "10:00");
{ const D0 = "2026-12-22"; const id = approvedFor(ARJUN, { fromDate: D0, toDate: D0 }, n0).id;
  const at = clock(D0, "15:00");
  const ch = await import("./js/data/chart-data.js");
  const before = A.summaryFor(D0), bAll = A.summaryRange("2026-12-15", D0), bRange = bAll.at(-1), bChart = ch.attendanceRateChart(bAll, D0);
  punch(ARJUN, D0, "10:00"); clock(D0, "15:00");   // the same instant for both measures
  const after = A.summaryFor(D0), aAll = A.summaryRange("2026-12-15", D0), aRange = aAll.at(-1), aChart = ch.attendanceRateChart(aAll, D0);
  check("W28", "summaryFor (HR dashboard's numbers, Team attendance): the visit day raises present by one and does not lower the rate", after.present === before.present + 1 && after.expected >= before.expected && after.present / after.expected > before.present / before.expected, j([before.present, after.present, before.expected, after.expected]));
  check("W29", "summaryRange (the Admin and HR attendance-rate charts, Present today): the same, on the day's own row", aRange.present === bRange.present + 1 && aRange.date === D0 && aRange.absent <= bRange.absent, j([bRange.present, aRange.present]));
  const pv = (c, n) => ch.valuesOf(c, n);
  check("W30", "the attendance-rate chart (Admin dashboard): the day's Present value rises by one and its Rate does not fall", pv(aChart, "Present").at(-1) === pv(bChart, "Present").at(-1) + 1 && pv(aChart, "Rate").at(-1) >= pv(bChart, "Rate").at(-1) && j(pv(aChart, "Present").slice(0, -1)) === j(pv(bChart, "Present").slice(0, -1)), j([pv(bChart, "Present").at(-1), pv(aChart, "Present").at(-1), pv(bChart, "Rate").at(-1), pv(aChart, "Rate").at(-1)]));
  const my = SD.shiftMonthFor(ARJUN, 2026, 12, at), myOld = A.monthFor(ARJUN, 2026, 12);
  check("W31", "My attendance's month (daysWorked, counts) and the old month both count the visit day", my.days.find((d) => d.date === D0).status === "on-site" && my.daysWorked === my.counts.present + my.counts.late + my.counts.halfDay + my.counts.shortLeave + my.counts.onSite && my.counts.onSite === 1 && myOld.days.find((d) => d.date === D0).status === "present" && myOld.counts.present >= 1);
  const teamDays = SD.shiftTeamFor(D0, at);
  check("W32", "the team's shift-day list marks the person On-site (what Team attendance and the dashboards' tables draw)", teamDays.find((d) => d.userId === ARJUN).status === "on-site");
  check("W33", "the old-site pages' own data (teamFor / rangeFor) read it as present too", A.teamFor(D0).find((d) => d.userId === ARJUN).status === "present" && A.rangeFor(ARJUN, D0, D0)[0].status === "present" && !!id); }
// W34-W39: the night shift's window, in hours
n0 = fresh("2026-12-01", "10:00");
SA.assignShift(PRIYA, ROHAN, "SH-3", "2026-12-01", null, "night", "2026-12-01");
n0 = clock("2026-12-16", "15:00");
A.writeShiftCheckIn(ROHAN, "2026-12-15", "22:05", "office", null);
{ const clear = () => A.regularizationsFor(ROHAN).filter((r) => r.status === "pending").forEach((r) => A.cancelRegularization(r.id, ROHAN));
  const fix = (time) => A.requestRegularization(ROHAN, { date: "2026-12-15", issue: "missed-check-out", time, reason: "Forgot to check out" });
  check("W34", "the window is 6 hours by default, in hours", NF.nightFixHours() === 6 && NF.nightFixWindow() === 360);
  check("W35", "only shifts:manage (HR, Admin) can set it: the manager and the employee can't", !NF.setNightFixHours(SNEHA, 3).ok && !NF.setNightFixHours(ARJUN, 3).ok && NF.nightFixHours() === 6);
  check("W36", "1 to 12 whole hours only: 0, 13, 6.5, -1, text and nothing are refused with the hours field named", [0, 13, 6.5, -1, "abc", ""].every((h) => { const r = NF.setNightFixHours(PRIYA, h); return !r.ok && r.field === "hours"; }) && NF.nightFixHours() === 6);
  check("W37", "1 and 12 are accepted", NF.setNightFixHours(PRIYA, 1).ok && NF.nightFixHours() === 1 && NF.setNightFixHours(ADMIN, 12).ok && NF.nightFixHours() === 12);
  NF.setNightFixHours(PRIYA, 2); clear();
  check("W38", "changing it changes what Request fix accepts: with 2 hours, 09:00 is accepted and 09:01 is refused (7:00 + 2 h)", fix("09:00").ok && (() => { clear(); const r = fix("09:01"); return !r.ok && /09:00/.test(r.error); })());
  NF.setNightFixHours(PRIYA, 8); clear();
  check("W39", "with 8 hours, 15:00 is accepted and 15:01 refused; the context's limit follows", fix("15:00").ok && (() => { clear(); return !fix("15:01").ok; })() && NF.correctionContext(ROHAN, "2026-12-15", "06:45").until === "15:00");
  NF.setNightFixHours(PRIYA, 6); clear(); }

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;