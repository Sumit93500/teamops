// usage: node workedday.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 10V: leave can't cover a day the person already checked in for (10U U7). ./js-pre10V, ./html-pre10V and
// ./css-pre10V are the code, pages and css before this round (office-os 8d35572).
// Leave of any type but work from home, full or half day, is refused when it's sent if its dates include a working day
// with a stored check-in for that person, and checked again at the final approval (nothing is decided; it stays
// pending). Only stored attendance records count (a punch, a correction, the sample data's own); the ordinary days
// attendance works out for the sample people aren't stored and give way to approved leave.
//   A  at apply: 10U's Arjun 3 Nov cases, every type, half days, ranges and their edges, days off, other people, Admins
//   D  at the final approval: a check-in that lands after sending (a punch, an approved correction); earlier stages,
//      rejecting and cancelling untouched
//   S  the sample data: its stored days count, the days worked out after it don't
//   C  scope: with no check-in on the dates, apply / decide / balances answer exactly as before 10V (side by side);
//      10U's U7 pay effect gone; attendance's own rules (8F, check-in on a leave day) unchanged
//   P  the pages: apply-leave shows the refusal at From; the approvals inbox shows the decide-time refusal
//   X  scope: exactly leave-store.js, only 10V's lines; no import of attendance-store.js
// The clock is set per case (local time); the sample data is made at Mon 2 Nov 2026 08:00.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = new RealDate(2026, 10, 2, 8, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const at = (iso, hhmm = "10:00") => { const [y, m, d] = iso.split("-").map(Number); const [h, mi] = hhmm.split(":").map(Number); NOW = new RealDate(y, m - 1, d, h, mi, 0).getTime(); };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", SNEHA = "EMP-1029", ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const WHO = { priya: ["hr", "Priya Nair", PRIYA], arjun: ["emp", "Arjun Kapoor", ARJUN] };

let loads = 0, w = null, d = null, jsErrors = [];
const allJsErrors = [];
async function open(page, script, who) {
  const cur = globalThis.localStorage;
  const saved = Object.fromEntries(Array.from({ length: cur.length }, (_, i) => cur.key(i)).map((k) => [k, cur.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = [];
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) { jsErrors.push(e.message); allJsErrors.push(`${page}: ${e.message}`); } });
  const dom = new JSDOM(fs.readFileSync(`${DIR}/${page}.html`, "utf8"), { url: `http://localhost/office-os/pages/${page}.html`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.confirm = () => true;
  w.HTMLElement.prototype.scrollIntoView = function () {};
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); allJsErrors.push(`${page} import: ${e.message}`); }
}
const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;

// X0 first, from the source, before any store is loaded: importing attendance-store.js into leave-store.js would be a
// cycle that breaks loading (attendance-store.js imports leave-store.js and reads PAST_DAY_WINDOW at load time), so a
// crash below would otherwise be all that shows.
const LS_IMPORTS = [...fs.readFileSync(`${HERE}js/data/leave-store.js`, "utf8").matchAll(/^import .* from "([^"]+)";/gm)].map((m) => m[1]);
check("X0", "no import of attendance-store.js (it imports leave-store.js): the imports are collection, core/storage, store, holidays, approval-chain",
  j(LS_IMPORTS) === j(["./collection.js", "../core/storage.js", "./store.js", "./holidays.js", "./approval-chain.js"]), j(LS_IMPORTS));

const L = await import("./js/data/leave-store.js");
const A = await import("./js/data/attendance-store.js");
const P = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const H = await import("./js/data/holidays.js");
const HOL_ACTOR = "EMP-1003";   // Round 10W (signature; was addHoliday(fields) / removeHoliday(id)): the holiday writes take the acting person's id first and check their record (holidays:manage); every call here passes HR's (Priya). The guard itself: holiguard.mjs
// The leave store before 10V: a second copy, on the same storage.
const L0 = await import("./js-pre10V/data/leave-store.js");

// A fresh browser: the sample data made at Mon 2 Nov 2026 08:00, then the clock set.
function fresh(iso = "2026-11-02", hhmm = "08:00") {
  globalThis.localStorage = MEM; mem.clear(); if (w) w.localStorage.clear();
  at("2026-11-02", "08:00");
  L.allRequests(); A.allRegularizations(); A.dayFor(ARJUN, "2026-11-02"); S.getAllUsers(); H.getAllHolidays(); P.allSalaries();
  at(iso, hhmm);
}
const roleOf = (id) => S.getUser(id)?.role;
const work = (who, date, inAt = "09:20", outAt = "18:30") => { at(date, inAt); const a = A.checkIn(who, "office"); at(date, outAt); const b = A.checkOut(who); return a.ok && b.ok; };
const leaveOf = (who, type, from, to = from, duration = "full", M = L) => M.applyLeave(who, { type, from, to, duration, reason: "probe" });
// Decide the request's current stage, by whoever holds it (the stored manager, else HR).
function decider(id, M = L) { const r = M.getRequest(id); return r.stage === "manager" && r.managerId ? r.managerId : (r.userId === PRIYA ? AARAV : PRIYA); }
const step = (id, decision = "approve", note = "", M = L) => { const who = decider(id, M); return M.decideLeave(id, who, roleOf(who), decision, note); };
const approveAll = (id, M = L) => { let r; for (let i = 0; i < 3 && M.getRequest(id).status === "pending"; i++) { r = step(id, "approve", "", M); if (!r.ok) return r; } return { ok: true, record: M.getRequest(id) }; };
const st = (id) => { const r = L.getRequest(id); return r ? `${r.status}/${r.stage}` : "none"; };
const net = (who, y = 2026, m = 11) => P.payrollRunFor(who, y, m).net;
const MSG1 = (dates, many = false) => `You checked in on ${dates}, so leave can't cover ${many ? "those days" : "that day"}. If the check-in times are wrong, ask for a correction instead.`;
const MSGD = (name, dates, many = false) => `This request no longer matches the attendance record: ${name} checked in on ${dates}, so leave can't cover ${many ? "those days" : "that day"}.`;

// =================================================================
section("A. At apply: 10U's cases (Arjun works Tue 3 Nov 09:20-18:30, then sends leave dated 3 Nov on 4 Nov)");
fresh();
const base = net(ARJUN);
const nReq = L.allRequests().length;
const worked = work(ARJUN, "2026-11-03");
at("2026-11-04");
const a1 = leaveOf(ARJUN, "unpaid", "2026-11-03");
check("A1", "unpaid, full day: refused at From with the new message; nothing stored; November pay and the unpaid balance unchanged",
  worked && a1.ok === false && a1.error === MSG1("2026-11-03") && a1.field === "from" && L.allRequests().length === nReq && net(ARJUN) === base && L.balanceFor(ARJUN, 2026, 11).unpaid.approved === 0,
  j([a1, net(ARJUN), base]));
fresh(); work(ARJUN, "2026-11-03", "10:05"); at("2026-11-04");
const a2 = leaveOf(ARJUN, "unpaid", "2026-11-03");
check("A2", "…a late check-in (10:05) the same: refused, and the day stays a late mark", a2.error === MSG1("2026-11-03") && A.dayFor(ARJUN, "2026-11-03").status === "late", j(a2));
fresh(); work(ARJUN, "2026-11-03"); at("2026-11-04");
const halves = ["first-half", "second-half"].map((h) => leaveOf(ARJUN, "unpaid", "2026-11-03", "2026-11-03", h));
check("A3", "half days too: unpaid first half and second half both refused (10U's first-half row docked ½ day)", halves.every((r) => r.error === MSG1("2026-11-03")), j(halves));
const types = ["casual", "sick", "earned"].map((t) => [t, leaveOf(ARJUN, t, "2026-11-03")]);
check("A4", "every capped type too: casual, sick and earned refused, so the balance isn't charged a day worked (8E's casual case)", types.every(([, r]) => r.error === MSG1("2026-11-03")), j(types));
fresh(); work(ARJUN, "2026-11-03"); at("2026-11-04");
const wfh = leaveOf(ARJUN, "wfh", "2026-11-03");
check("A5", "work from home is exempt: accepted (pending), and the day still reads present", wfh.ok && wfh.record.status === "pending" && A.dayFor(ARJUN, "2026-11-03").status === "present", j([wfh.ok, wfh.error]));
// Ranges and their edges
fresh(); work(ARJUN, "2026-11-02", "09:10"); work(ARJUN, "2026-11-03"); at("2026-11-04");
const a6 = leaveOf(ARJUN, "casual", "2026-11-02", "2026-11-06");
check("A6", "a range over two days worked and three not yet: refused, naming both days worked", a6.error === MSG1("2026-11-02 and 2026-11-03", true), j(a6));
fresh(); work(ARJUN, "2026-11-03"); at("2026-11-04");
const edges = { endsOn: leaveOf(ARJUN, "casual", "2026-11-02", "2026-11-03"), startsOn: leaveOf(ARJUN, "casual", "2026-11-03", "2026-11-05") };
check("A7", "a range that ends on the day worked, and one that starts on it: both refused, naming only 3 Nov",
  edges.endsOn.error === MSG1("2026-11-03") && edges.startsOn.error === MSG1("2026-11-03"), j(edges));
fresh(); work(ARJUN, "2026-11-03"); at("2026-11-04");
const next = leaveOf(ARJUN, "casual", "2026-11-04", "2026-11-05");
fresh(); work(ARJUN, "2026-11-03"); at("2026-11-04");
const before = leaveOf(ARJUN, "casual", "2026-11-02");
check("A8", "the days either side aren't covered: leave from 4 Nov, and leave for 2 Nov alone (Arjun not in that day), both accepted",
  next.ok && before.ok, j([next.error, before.error]));
fresh(); work(ARJUN, "2026-11-04", "09:20", "13:00"); at("2026-11-04", "13:05");
const today = leaveOf(ARJUN, "sick", "2026-11-04", "2026-11-04", "second-half");
check("A9", "today counts once checked in: second-half sick leave sent at 13:05 after a 09:20-13:00 morning is refused (the rule as specified; flagged in the notes)",
  today.error === MSG1("2026-11-04"), j(today));
// A check-in on a day that is now off isn't covered by the leave
fresh(); work(ARJUN, "2026-11-03"); at("2026-11-04");
const hol = H.addHoliday(HOL_ACTOR, { date: "2026-11-03", name: "Late-announced", kind: "company" });
const a10 = leaveOf(ARJUN, "casual", "2026-11-03", "2026-11-05");
check("A10", "a check-in on a day since made a holiday doesn't block leave around it: casual 3-5 Nov accepted, counted as 2 days",
  hol.ok && a10.ok && a10.record.days === 2 && L.balanceFor(ARJUN, 2026, 11).casual.pending >= 2, j([a10.error, a10.record?.days]));
fresh(); work(ARJUN, "2026-11-03"); at("2026-11-04");
H.addHoliday(HOL_ACTOR, { date: "2026-11-03", name: "Optional one", kind: "optional" });
const a11 = leaveOf(ARJUN, "casual", "2026-11-03");
check("A11", "…but an optional holiday isn't a day off: still refused", a11.error === MSG1("2026-11-03"), j(a11));
// Only the person's own check-ins
fresh(); work(KABIR, "2026-11-03"); at("2026-11-04");
const a12 = leaveOf(ARJUN, "casual", "2026-11-03");
check("A12", "someone else's check-in doesn't count: Kabir worked 3 Nov, Arjun didn't punch; Arjun's casual for 3 Nov accepted, Kabir's refused",
  a12.ok && leaveOf(KABIR, "casual", "2026-11-03").error === MSG1("2026-11-03"), j(a12.error));
// An Admin's own leave is approved as it's sent: refused before that
fresh(); work(AARAV, "2026-11-03"); at("2026-11-04");
const nA = L.allRequests().length;
const a13 = leaveOf(AARAV, "casual", "2026-11-03");
check("A13", "an Admin's own leave (approved as it's sent) is refused the same, and nothing is stored", a13.error === MSG1("2026-11-03") && L.allRequests().length === nA, j(a13));
// Order: it's checked after the dates are known to hold working days, before the overlap and allowance checks
fresh(); at("2026-11-02", "08:10");
const pend = leaveOf(ARJUN, "casual", "2026-11-03");
work(ARJUN, "2026-11-03"); at("2026-11-04");
const both = leaveOf(ARJUN, "unpaid", "2026-11-03");
const allOff = leaveOf(ARJUN, "casual", "2026-11-07", "2026-11-08");
check("A14", "order: overlapping a pending request AND covering a day worked gives the check-in refusal; a weekend-only request still gets 'nothing to take'",
  pend.ok && both.error === MSG1("2026-11-03") && allOff.error === "Those dates are all weekends or holidays, so there's nothing to take.", j([both.error, allOff.error]));

// =================================================================
section("D. At the final approval");
fresh(); at("2026-11-02", "08:10");
const d1 = leaveOf(ARJUN, "unpaid", "2026-11-03");
const mgr = step(d1.record.id);
work(ARJUN, "2026-11-03"); at("2026-11-04");
const h0 = j(L.getRequest(d1.record.id).history);
const fin = step(d1.record.id);
check("D1", "sent 2 Nov for 3 Nov, manager approved, then Arjun worked 3 Nov: HR's approval is refused with the new message; still pending at HR, history unchanged",
  d1.ok && mgr.ok && st(d1.record.id) === "pending/hr" && fin.ok === false && fin.error === MSGD("Arjun Kapoor", "2026-11-03") && j(L.getRequest(d1.record.id).history) === h0,
  j([fin, st(d1.record.id)]));
check("D2", "…so November pay keeps the day (no unpaid day, net as with no leave at all)", P.payrollRunFor(ARJUN, 2026, 11).lop.unpaidLeaveDays === 0 && A.dayFor(ARJUN, "2026-11-03").conflict === false, j(P.payrollRunFor(ARJUN, 2026, 11).lop));
const adminFin = L.decideLeave(d1.record.id, AARAV, "admin", "approve");
check("D3", "an Admin at that stage gets the same refusal", adminFin.error === MSGD("Arjun Kapoor", "2026-11-03"), j(adminFin));
const noNote = step(d1.record.id, "reject");
const rej = step(d1.record.id, "reject", "He was in that day");
check("D4", "rejecting isn't blocked (still needs a note): rejected", noNote.ok === false && rej.ok && st(d1.record.id) === "rejected/done", j([noNote.error, rej.error, st(d1.record.id)]));
fresh(); at("2026-11-02", "08:10");
const d5 = leaveOf(ARJUN, "unpaid", "2026-11-03");
step(d5.record.id); work(ARJUN, "2026-11-03"); at("2026-11-04");
const can = L.cancelLeave(d5.record.id, ARJUN);
check("D5", "…or Arjun cancels it: cancelled", can.ok && st(d5.record.id) === "cancelled/done", j(can.error));
// Only the final approval
fresh(); at("2026-11-02", "08:10");
const d6 = leaveOf(ARJUN, "casual", "2026-11-03");
work(ARJUN, "2026-11-03"); at("2026-11-04");
const d6m = step(d6.record.id);
check("D6", "the manager stage isn't checked (only the final approval is): Sneha's approval goes through, to HR", d6m.ok && st(d6.record.id) === "pending/hr", j([d6m.error, st(d6.record.id)]));
const d6f = step(d6.record.id);
check("D7", "…then HR's final approval is refused", d6f.error === MSGD("Arjun Kapoor", "2026-11-03") && st(d6.record.id) === "pending/hr", j(d6f));
// No manager: HR's is the only (final) stage
fresh(); at("2026-11-02", "08:10");
const d8 = leaveOf(SNEHA, "sick", "2026-11-03", "2026-11-03", "first-half");
work(SNEHA, "2026-11-03"); at("2026-11-04");
const d8f = step(d8.record.id);
check("D8", "a half day with no manager on file (Sneha's goes straight to HR): HR's approval is refused", d8.ok && L.getRequest(d8.record.id).stage === "hr" && d8f.error === MSGD("Sneha Rao", "2026-11-03"), j([d8.error, d8f]));
// A check-in written by an approved missed-check-in correction
fresh(); at("2026-11-02", "08:10");
const nu = S.addUser(USER_ACTOR("admin", null), { name: "Probe Joiner", email: "probe.joiner@officeos.test", department: "ENG", reportingManagerId: SNEHA, dateOfJoining: "12 Jan 2023" });
const NU = nu.record?.id;
const d9 = leaveOf(NU, "casual", "2026-11-03");
const d9m = step(d9.record.id);
at("2026-11-04");
const rg = A.requestRegularization(NU, { date: "2026-11-03", issue: "missed-check-in", time: "09:30", reason: "Forgot to punch" });
const rgm = A.decideRegularization(rg.record?.id, SNEHA, roleOf(SNEHA), "approve");
const rgh = A.decideRegularization(rg.record?.id, PRIYA, "hr", "approve");
const d9f = step(d9.record.id);
check("D9", "a check-in written by an approved missed-check-in correction (a joiner with no sample days): the leave's final approval is refused",
  nu.ok && d9m.ok && rg.ok && rgm.ok && rgh.ok && A.dayFor(NU, "2026-11-03").checkIn === "09:30" && d9f.error === MSGD("Probe Joiner", "2026-11-03"),
  j([nu.error, d9.error, rg.error, rgm.error, rgh.error, d9f]));
fresh(); at("2026-11-02", "08:10");
const d10 = leaveOf(ARJUN, "wfh", "2026-11-03");
work(ARJUN, "2026-11-03"); at("2026-11-04");
const d10f = approveAll(d10.record.id);
check("D10", "work from home at the final approval: approved, untouched", d10f.ok && st(d10.record.id) === "approved/done", j(d10f.error));
fresh(); at("2026-11-02", "08:10");
const d11 = leaveOf(ARJUN, "casual", "2026-11-05");
work(ARJUN, "2026-11-03"); at("2026-11-04");
const d11f = approveAll(d11.record.id);
check("D11", "a check-in on another day doesn't block it: casual for 5 Nov approved after Arjun worked 3 Nov", d11f.ok && st(d11.record.id) === "approved/done", j(d11f.error));

// =================================================================
section("S. The sample data");
fresh("2026-11-02", "10:00");
const s1 = leaveOf(ROHAN, "casual", "2026-10-30");
const s1old = leaveOf(ROHAN, "casual", "2026-10-30", "2026-10-30", "full", L0);
check("S1", "the sample data's stored days count: on 2 Nov Rohan's casual for Fri 30 Oct (a stored sample check-in) is refused (before 10V: accepted)",
  s1.error === MSG1("2026-10-30") && s1old.ok, j([s1.error, s1old.error]));
fresh("2026-11-05", "10:00");
const s2day = A.dayFor(ROHAN, "2026-11-03");
const s2 = leaveOf(ROHAN, "casual", "2026-11-03");
const s2a = approveAll(s2.record?.id ?? "x");
const s2after = A.dayFor(ROHAN, "2026-11-03");
check("S2", "the days worked out after the sample data aren't stored: on 5 Nov Rohan's 3 Nov reads present (09:xx, generated), his casual for it is accepted and approved, and the day then reads on-leave with no conflict",
  s2day.status === "present" && Boolean(s2day.checkIn) && s2.ok && s2a.ok && s2after.status === "on-leave" && s2after.conflict === false, j([s2day.checkIn, s2.error, s2a.error, s2after.status]));
fresh("2026-11-02", "10:00");
const s3 = leaveOf(VIKRAM, "unpaid", "2026-10-27", "2026-10-30");
check("S3", "a range over several stored sample days names each (Vikram, unpaid 27-30 Oct)", s3.error === MSG1("2026-10-27, 2026-10-28, 2026-10-29 and 2026-10-30", true), j(s3));
fresh("2026-11-02", "10:00");
const s4 = leaveOf(ROHAN, "wfh", "2026-10-30");
check("S4", "work from home on a stored sample day: accepted", s4.ok, j(s4.error));

// =================================================================
section("C. Scope: with no check-in on the dates, exactly as before");
const CASES = [
  [ARJUN, "casual", "2026-11-05", "2026-11-06", "full"], [ARJUN, "unpaid", "2026-11-09", "2026-11-09", "first-half"], [ROHAN, "sick", "2026-11-04", "2026-11-04", "full"],
  [AARAV, "earned", "2026-11-10", "2026-11-12", "full"], [SNEHA, "casual", "2026-11-03", "2026-11-03", "second-half"], [KABIR, "wfh", "2026-10-30", "2026-10-30", "full"],
  [ARJUN, "casual", "2026-10-20", "2026-10-20", "full"], [ANANYA, "casual", "2026-10-01", "2026-10-01", "full"], [PRIYA, "unpaid", "2026-11-07", "2026-11-08", "full"],
];
const runCase = (M, [who, type, from, to, dur]) => { fresh("2026-11-03", "08:00"); const r = leaveOf(who, type, from, to, dur, M); const dec = r.ok && r.record.status === "pending" ? approveAll(r.record.id, M) : null; return j([r, dec, M.balanceFor(who, 2026, 11)]); };
const c1 = CASES.map((c) => [c.slice(0, 3).join(" "), runCase(L, c) === runCase(L0, c)]);
check("C1", "9 requests (each type, half days, an Admin's, a weekend, a holiday, before the window, work from home on a sample day): applyLeave, the whole approval and the balance equal the pre-10V store's",
  c1.every(([, same]) => same), j(c1.filter(([, s]) => !s)));
// The seeded pending requests, decided all the way through, with the sample data made on two different days. Their dates
// are fixed; the sample data's stored days run back from whenever it's made, so which of them fall on a stored check-in
// depends on that day (flagged in the notes).
function seededRun(anchor, hhmm, refusedWant) {
  const make = () => { globalThis.localStorage = MEM; mem.clear(); at(anchor, hhmm); L.allRequests(); A.allRegularizations(); A.dayFor(ARJUN, anchor); };
  make();
  const pending = L.allRequests().filter((r) => r.status === "pending").map((r) => r.id);
  const out = {};
  for (const id of pending) {
    make(); const a = approveAll(id); const after = st(id);
    make(); const b = approveAll(id, L0);
    out[id] = { same: j(a) === j(b), refused: a.ok ? null : a.error, after, oldOk: b.ok };
  }
  const refused = Object.entries(out).filter(([, o]) => o.refused).map(([id, o]) => [id, o.refused]);
  const ok = j(refused) === j(refusedWant) && Object.entries(out).every(([id, o]) => (o.refused ? o.after === "pending/hr" && o.oldOk : o.same));
  return [ok, out];
}
const [c2ok, c2] = seededRun("2026-11-02", "08:00", [["LV-2189", MSGD("Rohan Gupta", "2026-10-13, 2026-10-14 and 2026-10-15", true)], ["LV-2202", MSGD("Sneha Rao", "2026-10-14")]]);
check("C2", "the seeded pending requests, sample data made 2 Nov: LV-2189 (Rohan, 13-15 Oct) and LV-2202 (Sneha, 14 Oct) fall on stored sample check-ins and are refused at HR, left pending (before 10V: approved, as conflict days); the other three exactly as before",
  c2ok, j(c2));
const [c2bok, c2b] = seededRun("2026-10-12", "10:00", [["LV-2201", MSGD("Arjun Kapoor", "2026-10-05")], ["LV-2208", MSGD("Ananya Iyer", "2026-10-09")]]);
check("C2b", "…sample data made 12 Oct (the real date of this round): LV-2201 (Arjun, 5 Oct) and LV-2208 (Ananya, first half 9 Oct) are the ones refused at HR; the other three exactly as before",
  c2bok, j(c2b));
// 10U's U7, side by side
fresh(); work(ARJUN, "2026-11-03"); at("2026-11-04");
const u7old = leaveOf(ARJUN, "unpaid", "2026-11-03", "2026-11-03", "full", L0);
approveAll(u7old.record.id, L0);
const u7oldNet = net(ARJUN), u7oldConf = A.monthFor(ARJUN, 2026, 11).conflicts;
fresh(); work(ARJUN, "2026-11-03"); at("2026-11-04");
leaveOf(ARJUN, "unpaid", "2026-11-03");
check("C3", "10U's U7 side by side: before 10V the unpaid day is approved (net ₹83,576 → ₹79,587, one conflict day); with 10V net stays ₹83,576 and no day conflicts",
  u7oldNet === 79587 && u7oldConf === 1 && net(ARJUN) === 83576 && A.monthFor(ARJUN, 2026, 11).conflicts === 0, j([u7oldNet, u7oldConf, net(ARJUN), A.monthFor(ARJUN, 2026, 11).conflicts]));
fresh(); at("2026-11-02", "08:10");
const c4 = leaveOf(ARJUN, "casual", "2026-11-03"); approveAll(c4.record.id);
at("2026-11-03", "09:20");
const c4in = A.checkIn(ARJUN, "office");
check("C4", "attendance's own rule unchanged: with leave approved for today, check-in is still refused", c4in.error === "You're on approved leave today, so check-in is closed.", j(c4in));
at("2026-11-04");
const c5 = A.requestRegularization(ARJUN, { date: "2026-11-03", issue: "missed-check-in", time: "09:30", reason: "probe" });
check("C5", "…and a correction for a day approved leave covers is still refused (8F)", c5.error === "You were on approved leave that day.", j(c5));
check("C6", "workingDays, periodsOf and balanceFor are the pre-10V functions' answers for every person (Nov, with the C-section history)",
  ["EMP-1001", "EMP-1003", "EMP-1008", "EMP-1017", "EMP-1023", "EMP-1029", "EMP-1042", "EMP-1088", "EMP-1105"].every((u) => j(L.balanceFor(u, 2026, 11)) === j(L0.balanceFor(u, 2026, 11)))
  && L.workingDays("2026-11-02", "2026-11-13") === L0.workingDays("2026-11-02", "2026-11-13") && j(L.periodsOf({ from: "2026-12-30", to: "2027-01-04", duration: "full" }, "casual")) === j(L0.periodsOf({ from: "2026-12-30", to: "2027-01-04", duration: "full" }, "casual")));
// With no attendance stored at all, nothing is refused (and nothing is seeded by asking)
globalThis.localStorage = MEM; mem.clear(); at("2026-11-04");
const c7 = leaveOf(ARJUN, "casual", "2026-11-03");
check("C7", "with no attendance records stored yet, the check finds none (and doesn't create them): accepted, and no attendance key written", c7.ok && !mem.has("officeos:attendance"), j([c7.error, [...mem.keys()]]));

// =================================================================
section("P. The pages");
fresh(); work(ARJUN, "2026-11-03"); at("2026-11-04");
await open("leave/apply-leave", "apply-leave", "arjun");
const fill = (type, from, to = from) => {
  const r = d.querySelector(`input[name="leaveType"][value="${type}"]`); r.checked = true; r.dispatchEvent(new w.Event("change", { bubbles: true }));
  for (const [id, v] of [["from-date", from], ["to-date", to]]) { d.getElementById(id).value = v; d.getElementById(id).dispatchEvent(new w.Event("change", { bubbles: true })); }
  d.getElementById("leave-reason").value = "probe";
};
const nP = L.allRequests().length;
fill("unpaid", "2026-11-03");
d.querySelector('#leave-form [type="submit"]').click();
const fromBox = d.getElementById("from-date").closest(".form-field") ?? d.getElementById("from-date").parentElement;
const err = fromBox.querySelector(".form-error");
check("P1", "apply-leave (Arjun): sending unpaid leave for 3 Nov shows the refusal under From, linked to it; nothing stored; no JS errors",
  err?.textContent === MSG1("2026-11-03") && d.getElementById("from-date").getAttribute("aria-describedby") === err?.id && L.allRequests().length === nP && jsErrors.length === 0,
  j([err?.textContent, jsErrors]));
fresh(); at("2026-11-02", "08:10");
const p2 = leaveOf(ARJUN, "unpaid", "2026-11-03"); step(p2.record.id);
work(ARJUN, "2026-11-03"); at("2026-11-04");
await open("requests/approvals-inbox", "approvals-inbox", "priya");
const p2row = [...d.querySelectorAll('tr[data-type="leave"]')].find((tr) => tr.textContent.includes("Arjun Kapoor") && /unpaid/i.test(tr.textContent));
p2row?.querySelector(".btn--primary")?.click();
const toast = [...d.querySelectorAll(".toast--danger .toast__text")].map((t) => t.textContent.trim()).at(-1);
check("P2", "approvals inbox (Priya): Approve on Arjun's unpaid 3 Nov shows the refusal as a danger toast; the request stays pending at HR",
  Boolean(p2row) && toast === MSGD("Arjun Kapoor", "2026-11-03") && st(p2.record.id) === "pending/hr", j([Boolean(p2row), toast, st(p2.record.id)]));
check("P3", "no JS errors on any load", allJsErrors.length === 0, allJsErrors.join(" | "));

// =================================================================
section("X. Scope: exactly 10V's lines");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
const FILE = "data/leave-store.js";
// Round 10W (layout; was the live js vs js-pre10V, here and in X1): 10V's own change set, read from its frozen result
// (js-pre10W = HEAD eba4336); the live js has 10W's holiday guard since (holiguard.mjs X1 / X4)
const changedJs = walk(`${HERE}js-pre10W`).filter((f) => !fs.existsSync(`${HERE}js-pre10V/${f}`) || SRC("js-pre10W", f) !== SRC("js-pre10V", f)).sort();
// Round 11B (layout; was the live pages, here and in the check below): this round's own page claim, read from its
// frozen result (html-pre11B = HEAD 97e1e6c); the live pages have 11B's sessions.html banner since (acctpages.mjs X2)
const changedHtml = walk(`${HERE}html-pre11B`).filter((f) => !fs.existsSync(`${HERE}html-pre10V/${f}`) || fs.readFileSync(`${HERE}html-pre11B/${f}`, "utf8") !== fs.readFileSync(`${HERE}html-pre10V/${f}`, "utf8"));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre10V", f)) : [];
check("X1", "js changed: exactly data/leave-store.js (payroll.js, payroll-store.js, attendance-store.js untouched); nothing added or removed", j(changedJs) === j([FILE]) && j(walk(`${HERE}js-pre10W`).sort()) === j(walk(`${HERE}js-pre10V`).sort()), j(changedJs));
check("X2", "no page and no css changed; nothing added or removed", changedHtml.length === 0 && changedCss.length === 0 && j(walk(`${HERE}html-pre11B`).sort()) === j(walk(`${HERE}html-pre10V`).sort()), j([changedHtml, changedCss]));
check("X3", "CRLF only, with no final newline (as before)", !/[^\r]\n/.test(SRC("js", FILE)) && !SRC("js", FILE).endsWith("\n"));
const cnt = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
// Round 11N (layout; layout; was the live js: read from the frozen result js-pre11N = HEAD fcdc960, the live tree has 11N's scripts since (roadnotes.mjs X1 / X4))
const a0 = cnt(SRC("js-pre10V", FILE).split("\r\n")), b0 = cnt(SRC("js-pre11N", FILE).split("\r\n"));
const removed = [...a0].flatMap(([l, n]) => Array(Math.max(0, n - (b0.get(l) ?? 0))).fill(l));
const added = [...b0].reduce((t, [l, n]) => t + Math.max(0, n - (a0.get(l) ?? 0)), 0);
check("X4", "…and within it only additions: no line removed, 29 added (the storage import, checkedInDays and its two text helpers, the apply check, the decide check)", removed.length === 0 && added === 29, j({ removed, added }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
