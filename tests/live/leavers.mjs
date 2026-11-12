// usage: node leavers.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 11Y: R8 part (iii), leavers, on the rulings in round-11x-notes.md X16: X-D1 option 1 with (a) (a last working
// day, required on deactivation, no later than today, refused before the end of a month an approved run pays them for);
// X-D2 option 1 (the final month prorated to it; joiners unchanged, logged for R10); X-D3 (a) 1 (Finance / Admin see
// all their payslips), (b) 1 (the leaver gets no access), (c) 1 (nobody an approved run pays can be deleted).
// ./js-pre11Y, ./html-pre11Y and ./css-pre11Y are the code, pages and css before this round (office-os 8ae4c9c).
//   D  the store: the date and its refusals; reactivating; deleting
//   A  attendance: "left" days; a leaver's months
//   P  pay: the final month prorated; the runs; unpaid leave; payslips; everyone else as before
//   U  the pages: the profile's dialog and row; the run page's line; the payslip's reason and note
//   E  what stays: the canonical September; the live computation for everyone who hasn't left
//   X  scope
// The clock is local wall time, Mon 9 Nov 2026 11:00. The fixture is payruns.mjs's settled October (seeded Fri 30 Oct
// 19:00, attendance back to 1 Oct; pending non-WFH leave cancelled, pending corrections rejected, Vikram given a joining
// date), prepared by Kabir and approved by Aarav. Rohan Gupta (EMP-1042, ₹92,000 a month) is the leaver.
// Round 12A (layout; was the live js, in X1): 11Y's own change set, read from the frozen result (js-pre11Z = 9a608c4).
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
setNow(2026, 11, 9);
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const SESS = { admin: ["admin", "Aarav Mehta", AARAV], hr: ["hr", "Priya Nair", PRIYA], fin: ["fin", "Kabir Shah", KABIR] };
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, query = "") {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${DIR}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = () => true;
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`./js/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); }
  }
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} timer: ${e.message}`); } });
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const safe = (fn) => { try { return fn(); } catch (e) { return { ok: false, error: `threw: ${e.message}` }; } };
const errOf = (r) => (r?.ok ? "ok" : r?.error ?? "no result");

const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const A = await import("./js/data/attendance-store.js");
const L = await import("./js/data/leave-store.js");
const OLD = await import("./js-pre11Y/data/payroll-store.js");   // before this round, on the same storage
const OLDA = await import("./js-pre11Y/data/attendance-store.js");

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
// The settled October on Mon 9 Nov, prepared and approved unless told not to.
function october({ approve = true } = {}) {
  mem.clear(); setNow(2026, 10, 30, 19); PS.payrollRun(2026, 10); setNow(2026, 11, 9);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
  if (approve) { safe(() => PS.prepareRun(KABIR, 2026, 10)); safe(() => PS.approveRun(AARAV, 2026, 10)); }
}
const leave = (date) => safe(() => S.deactivateUser(PRIYA, ROHAN, date));
const field = (r) => r?.field ?? null;
const lastDayOf = (u) => (typeof S.leavingDate === "function" ? S.leavingDate(u) : null);   // a tree without it fails, not crashes
const hasKey = (o, k) => Boolean(o) && Object.prototype.hasOwnProperty.call(o, k);

// =================================================================
section("D. The store");
october();
const d1 = [leave(undefined), leave(""), leave("6 Nov")];
check("D1", "deactivating without a last working day (none, empty, not a date) is refused, naming the field; nothing changes",
  d1.every((r) => r.ok === false && r.error === "Enter their last working day." && field(r) === "dateOfLeaving") && S.getUser(ROHAN).status === "active", j(d1.map(errOf)));
const d2 = safe(() => S.updateUser(PRIYA, ROHAN, { status: "inactive" }));
check("D2", "the edit form's 'account active' box can't deactivate (it gives no date): refused, pointing to the profile",
  d2.ok === false && d2.error === "Deactivate them from their profile, which asks for their last working day." && field(d2) === "status" && S.getUser(ROHAN).status === "active", j(d2));
const d3 = leave("2026-11-10");
check("D3", "later than today (Tue 10 Nov) is refused, naming today", d3.ok === false && d3.error === "The last working day can't be later than today (9 Nov 2026)." && field(d3) === "dateOfLeaving", j(d3));
const d4 = leave("2026-10-20");
check("D4", "inside approved October: refused (the approved run pays him for all of it), naming the earliest date allowed",
  d4.ok === false && d4.error === "October 2026's payroll is approved and pays Rohan Gupta for all of it, so the last working day can't be before 31 Oct 2026." && field(d4) === "dateOfLeaving", j(d4));
const d4b = leave("2026-09-30");
check("D4b", "before approved October too (30 Sep): refused the same way (October would have paid him for nothing)",
  d4b.ok === false && d4b.error === "October 2026's payroll is approved and pays Rohan Gupta for all of it, so the last working day can't be before 31 Oct 2026.", j(d4b));
october({ approve: false }); safe(() => PS.prepareRun(KABIR, 2026, 10));
const d14 = leave("2026-10-20");
check("D14", "a prepared month that isn't approved doesn't restrict the date (20 Oct: allowed; Approve then asks for it to be prepared again)",
  d14.ok === true && lastDayOf(S.getUser(ROHAN)) === "2026-10-20", j(errOf(d14)));
// Round 12E (fixture): the joining date first, then October prepared and approved; given after approval it's refused
// (joindate.mjs J2: his approved October row would go).
october({ approve: false }); S.updateUser(AARAV, ROHAN, { dateOfJoining: "2 Nov 2026" }); safe(() => PS.prepareRun(KABIR, 2026, 10)); safe(() => PS.approveRun(AARAV, 2026, 10));
const d5 = leave("2026-10-30");
check("D5", "before the joining date is refused, naming it", d5.ok === false && d5.error === "The last working day can't be before the joining date (2 Nov 2026)." && field(d5) === "dateOfLeaving", j(d5));
const d5b = leave("2026-11-02");
check("D5b", "the joining date itself is allowed (the boundary)", d5b.ok === true && lastDayOf(S.getUser(ROHAN)) === "2026-11-02", j(errOf(d5b)));
october();
const d6 = leave("2026-10-31");
check("D6", "the approved month's last day itself is allowed (the boundary)", d6.ok === true && lastDayOf(S.getUser(ROHAN)) === "2026-10-31", j(errOf(d6)));
october();
const d7 = leave("2026-11-06");
check("D7", "6 Nov: deactivated; kept like the joining date ('6 Nov 2026'); leavingDate() reads it",
  d7.ok === true && S.getUser(ROHAN).status === "inactive" && S.getUser(ROHAN).dateOfLeaving === "6 Nov 2026" && lastDayOf(S.getUser(ROHAN)) === "2026-11-06", j(S.getUser(ROHAN).dateOfLeaving));
const d8 = [errOf(safe(() => S.deleteUser(AARAV, ROHAN))), S.getUser(ROHAN) !== null];
check("D8", "deleting him is refused: approved October pays him", j(d8) === j(["Rohan Gupta is paid in an approved payroll run (October 2026), so they can't be deleted. Deactivate them instead.", true]), j(d8));
const d9 = errOf(safe(() => S.reactivateUser(PRIYA, ROHAN)));
check("D9", "reactivating clears the date (no key left on the record)", d9 === "ok" && S.getUser(ROHAN).status === "active" && !hasKey(S.getUser(ROHAN), "dateOfLeaving") && lastDayOf(S.getUser(ROHAN)) === null, j(S.getUser(ROHAN)));
const d10 = safe(() => S.updateUser(PRIYA, ANANYA, { dateOfLeaving: "2026-11-01" }));
check("D10", "a last working day can't be set except when deactivating", d10.ok === false && d10.error === "A last working day is recorded only when someone is deactivated." && field(d10) === "dateOfLeaving", j(d10));
october({ approve: false });
const d11 = errOf(safe(() => S.deleteUser(AARAV, ROHAN)));
check("D11", "with nothing approved, deleting still works as before", d11 === "ok" && S.getUser(ROHAN) === null, d11);
october();
const d12 = [errOf(safe(() => S.deactivateUser(PRIYA, ARJUN, "2026-11-06"))), errOf(safe(() => S.deactivateUser(ARJUN, ROHAN, "2026-11-06"))), errOf(safe(() => S.deactivateUser(PRIYA, PRIYA, "2026-11-06")))];
check("D12", "the earlier refusals keep their place: a demo identity, someone without users:deactivate, yourself",
  j(d12) === j(["EMP-1105 is a demo sign-in identity and can't be deactivated.", "You can't deactivate employees.", "EMP-1003 is a demo sign-in identity and can't be deactivated."]), j(d12));
october();
rawEdit("users", (u) => u.id === ROHAN, (u) => { u.status = "inactive"; });   // deactivated before 11Y: no date
check("D13", "an inactive person with no last working day on file (from before this round) is gone everywhere, as before",
  PS.payrollRunFor(ROHAN, 2026, 11) === null && PS.payrollRunFor(ROHAN, 2026, 10) === null && j(PS.payslipsFor(ROHAN, "2026-11-09")) === "[]" && !PS.payrollRun(2026, 11).rows.some((r) => r.userId === ROHAN)
  && A.monthFor(ROHAN, 2026, 11) === null);

// =================================================================
section("A. Attendance");
october(); leave("2026-11-06");
const nov = A.monthFor(ROHAN, 2026, 11) ?? { days: [] };
const after = nov.days.filter((x) => x.date > "2026-11-06");
const isOff = (x) => ["weekend", "holiday"].includes(x.status);
check("A1", "every working day after 6 Nov is 'left' (not expected, not an absence); weekends and holidays keep their status",
  after.length === 24 && after.every((x) => isOff(x) || (x.status === "left" && x.expected === false)) && after.filter((x) => x.status === "left").length === 16, j([...new Set(after.map((x) => x.status))]));
const mon9 = nov.days.find((x) => x.date === "2026-11-09") ?? {};
// Round 12K (round-12j-notes.md J12): a day away carries no record, so no check-in either. Was: mon9.checkIn !== null.
check("A2", "even today (9 Nov), when the sample data has a check-in for him: 'left', with no check-in or record on the day (round 12K)", mon9.status === "left" && mon9.checkIn === null && mon9.recordId === null, j([mon9.status, mon9.checkIn]));
const upTo = nov.days.filter((x) => x.date <= "2026-11-06");
const oldUpTo = (() => { const keep = S.getUser(ROHAN); rawEdit("users", (u) => u.id === ROHAN, (u) => { u.status = "active"; delete u.dateOfLeaving; }); const o = OLDA.monthFor(ROHAN, 2026, 11).days.filter((x) => x.date <= "2026-11-06"); rawEdit("users", (u) => u.id === ROHAN, (u) => { Object.assign(u, keep); }); return o; })();
check("A3", "the days up to the last one read exactly as they would for someone still here", j(upTo) === j(oldUpTo), j(upTo.map((x) => x.status)));
check("A4", "his months are readable up to November; December isn't; the attendance lists and dayFor still leave him out",
  A.monthFor(ROHAN, 2026, 10) !== null && A.monthFor(ROHAN, 2026, 12) === null && A.dayFor(ROHAN, "2026-11-05") === null && Array.isArray(A.teamFor("2026-11-05")) && A.teamFor("2026-11-05").length > 0 && !A.teamFor("2026-11-05").some((x) => x.userId === ROHAN));

// =================================================================
section("P. Pay");
const row = PS.payrollRunFor(ROHAN, 2026, 11) ?? { lop: {}, attendance: {} };
check("P1", "November prorated: 21 working days, the 16 after 6 Nov taken off as loss of pay (lop.leftDays), ₹92,000 x 16 / 21 = ₹70,095; gross ₹21,905; lastDay 6 Nov",
  row.workingDays === 21 && j(row.lop) === j({ penaltyHalfDays: 0, unpaidLeaveDays: 0, absenceDays: 0, leftDays: 16, days: 16, amount: 70095 }) && row.gross === 21905 && row.attendance.lastDay === "2026-11-06" && row.status === "draft", j([row.lop, row.gross]));
check("P2", "he's in November's run, and in no later month's", PS.payrollRun(2026, 11).rows.some((r) => r.userId === ROHAN) && !PS.payrollRun(2026, 12).rows.some((r) => r.userId === ROHAN) && PS.payrollRunFor(ROHAN, 2026, 12) === null);
const slips = PS.payslipsFor(ROHAN, "2026-11-09");
check("P3", "his payslips run back from November (live, prorated) to approved October (the stored figures)",
  j(slips.map((s) => [s.month, s.runStatus ?? "live"])) === j([["2026-11", "live"], ["2026-10", "approved"]]) && slips[0]?.net === row.net && slips[1]?.net === PS.storedRun(2026, 10).rows.find((r) => r.userId === ROHAN).net, j(slips.map((s) => [s.month, s.net])));
october();
const lv1 = L.applyLeave(ROHAN, { type: "unpaid", from: "2026-11-05", to: "2026-11-05", duration: "full", reason: "Round 11Y" });
const lv2 = L.applyLeave(ROHAN, { type: "unpaid", from: "2026-11-16", to: "2026-11-17", duration: "full", reason: "Round 11Y" });
[lv1, lv2].forEach((r) => { let q = L.getRequest(r.record.id); while (q.status === "pending") { const who = q.stage === "manager" ? S.getUser(q.managerId) : S.getUser(PRIYA); L.decideLeave(q.id, who.id, who.role, "approve"); q = L.getRequest(q.id); } });
leave("2026-11-06");
const p4 = PS.payrollRunFor(ROHAN, 2026, 11) ?? { lop: {} };
check("P4", "approved unpaid leave counts up to the last working day only: 5 Nov (1), not 16-17 Nov (after it, already in leftDays)",
  PS.unpaidLeaveDays(ROHAN, 2026, 11) === 1 && p4.lop.unpaidLeaveDays === 1 && p4.lop.leftDays === 16 && p4.lop.days === 17, j(p4.lop));
october();
const before = PS.payrollRunFor(ROHAN, 2026, 11);
setNow(2026, 11, 30, 19); const p5a = leave("2026-11-30"); const p5 = PS.payrollRunFor(ROHAN, 2026, 11) ?? { lop: {}, attendance: {} };
check("P5", "a last working day on the month's last working day (30 Nov): no days after it, no leftDays key, the month paid in full",
  p5a.ok && !hasKey(p5.lop, "leftDays") && p5.lop.days === 0 && p5.gross === 92000 && p5.attendance.lastDay === "2026-11-30", j([errOf(p5a), p5.lop, p5.gross, before.gross]));
october(); leave("2026-10-31");
check("P6", "leaving on 31 Oct: not in November's run; approved October as it was; his payslips are October's",
  !PS.payrollRun(2026, 11).rows.some((r) => r.userId === ROHAN) && j(PS.payslipsFor(ROHAN, "2026-11-09").map((s) => s.month)) === j(["2026-10"]) && PS.storedRun(2026, 10).status === "approved");
october(); leave("2026-11-06");
const others = S.getAllUsers().filter((u) => u.id !== ROHAN);
check("P7", "everyone else's November and October rows are byte-identical to before this round (no leftDays, no lastDay)",
  others.every((u) => j(PS.payrollRunFor(u.id, 2026, 11)) === j(OLD.payrollRunFor(u.id, 2026, 11)) && j(PS.payrollRunFor(u.id, 2026, 10)) === j(OLD.payrollRunFor(u.id, 2026, 10))));
check("P8", "November's problems are the month's own: nothing about him blocks it", j(PS.runProblems(2026, 11)) === j(OLD.runProblems(2026, 11)), j(PS.runProblems(2026, 11)));
const octLive = PS.payrollRunFor(ROHAN, 2026, 10);
check("P9", "only the final month carries the last working day: his live October row has no lastDay and no leftDays, paid in full",
  Boolean(octLive) && !hasKey(octLive.attendance, "lastDay") && !hasKey(octLive.lop, "leftDays") && octLive.gross === 92000, j(octLive?.lop));

// =================================================================
section("U. The pages");
october();
setSession(...SESS.hr); await open("users/user-profile", `?id=${ROHAN}`);
const statusBtn = () => [...d.querySelectorAll(".page-header__actions button")].find((b) => ["Deactivate", "Reactivate"].includes(txt(b)));
statusBtn()?.click();
const modal = d.getElementById("deactivate-modal");
const input = d.getElementById("deactivate-date");
const u1 = [Boolean(modal?.classList.contains("is-open")), txt(modal?.querySelector(".modal__title")), input?.type, input?.value, input?.max];
check("U1", "Priya's Deactivate opens a dialog asking for the last working day, on today, no later than today",
  j(u1) === j([true, "Deactivate Rohan Gupta", "date", "2026-11-09", "2026-11-09"]), j(u1));
if (input) input.value = "2026-11-10";
modal?.querySelector("form")?.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const u2 = [txt(d.getElementById("deactivate-date-error")), S.getUser(ROHAN)?.status, Boolean(d.getElementById("deactivate-modal"))];
check("U2", "a later date: the store's refusal under the field; nothing changes; the dialog stays", j(u2) === j(["The last working day can't be later than today (9 Nov 2026).", "active", true]), j(u2));
if (d.getElementById("deactivate-date")) d.getElementById("deactivate-date").value = "2026-11-06";
d.getElementById("deactivate-modal")?.querySelector("form")?.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const kv = (label) => txt([...d.querySelectorAll(".kv__row")].find((r) => txt(r.querySelector("dt")) === label)?.querySelector("dd"));
const rowsAfterJoin = () => { const rows = [...d.querySelectorAll(".kv__row")]; const i = rows.findIndex((r) => txt(r.querySelector("dt")) === "Date of joining"); return txt(rows[i + 1]?.querySelector("dt")); };
const toast = () => txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
const u3 = [toast(), S.getUser(ROHAN)?.status, kv("Last working day"), rowsAfterJoin(), txt(statusBtn()), Boolean(d.getElementById("deactivate-modal"))];
check("U3", "6 Nov: deactivated, the toast names the date, a 'Last working day' row after 'Date of joining', the button says Reactivate, the dialog is gone",
  j(u3) === j(["Rohan Gupta deactivated. Last working day: 6 Nov 2026.", "inactive", "6 Nov 2026", "Last working day", "Reactivate", false]), j(u3));
await open("users/user-profile", `?id=${ROHAN}`);
const u4a = kv("Last working day");
statusBtn()?.click();
const u4 = [u4a, S.getUser(ROHAN).status, [...d.querySelectorAll(".kv__row")].some((r) => txt(r.querySelector("dt")) === "Last working day")];
check("U4", "opened again, the row is there; Reactivate (confirmed) brings him back and the row goes", j(u4) === j(["6 Nov 2026", "active", false]), j(u4));
october(); leave("2026-11-06");
setSession(...SESS.fin); await open("payroll/payroll-run", "?month=2026-11");
const att = [...(d.getElementById("run-checks")?.children ?? [])].find((c) => txt(c.querySelector(".list__title")) === "Attendance recorded");
const u5 = [txt(att?.querySelector(".list__sub")), txt(att?.querySelector(".badge"))];
check("U5", "the November run page, Kabir: 'Left during November 2026: Rohan Gupta (last working day 6 Nov, 16 working days after). The month is paid up to the last working day.' -> Review",
  u5[0].includes("Left during November 2026: Rohan Gupta (last working day 6 Nov, 16 working days after). The month is paid up to the last working day.") && u5[1] === "Review", j(u5));
october();
const lvU = L.applyLeave(ROHAN, { type: "unpaid", from: "2026-11-05", to: "2026-11-05", duration: "full", reason: "Round 11Y" });
for (let q = L.getRequest(lvU.record.id); q.status === "pending"; q = L.getRequest(q.id)) { const who = q.stage === "manager" ? S.getUser(q.managerId) : S.getUser(PRIYA); L.decideLeave(q.id, who.id, who.role, "approve"); }
leave("2026-11-06");
setSession(...SESS.fin); await open("payroll/payroll-run", "?month=2026-11");
const att10 = [...(d.getElementById("run-checks")?.children ?? [])].find((c) => txt(c.querySelector(".list__title")) === "Attendance recorded");
check("U10", "with a day of unpaid leave before it (17 loss-of-pay days), the run page still counts the 16 working days after the last one",
  txt(att10?.querySelector(".list__sub")).includes("Rohan Gupta (last working day 6 Nov, 16 working days after)") && PS.payrollRunFor(ROHAN, 2026, 11)?.lop.days === 17, txt(att10?.querySelector(".list__sub")));
october(); leave("2026-11-06");
setSession(...SESS.fin); await open("payroll/payroll-run", "?month=2026-11");
const notes = () => [...(d.getElementById("payslip-notes")?.children ?? [])].map(txt);
await open("payroll/payslip-view", `?employee=${ROHAN}&month=2026-11`);
const u6 = notes();
check("U6", "Kabir opens his November payslip: the loss of pay names the days after the last working day, and a note says what's paid",
  u6.includes("Loss of pay: ₹70,095 for 16 days (16 days after the last working day), out of 21 working days, taken off the monthly salary of ₹92,000. The earnings above are on the ₹21,905 left.")
  && u6.includes("The last working day was 6 Nov 2026; the 16 working days of November 2026 after it aren't paid."), j(u6));
await open("payroll/payslip-view", `?employee=${ROHAN}&month=2026-10`);
check("U7", "...and his approved October payslip ('Approved: not paid yet', the stored net)", txt(d.getElementById("payslip-subtitle")).includes("Approved: not paid yet") && txt(d.getElementById("payslip-subtitle")).startsWith("Rohan Gupta (EMP-1042)."), txt(d.getElementById("payslip-subtitle")));
setSession(...SESS.admin); await open("payroll/payslip-view", `?employee=${ROHAN}&month=2026-11`);
check("U8", "an Admin sees it too", notes().some((n) => n.startsWith("The last working day was 6 Nov 2026")));
october(); setNow(2026, 11, 30, 19); leave("2026-11-27");
setSession(...SESS.fin); await open("payroll/payslip-view", `?employee=${ROHAN}&month=2026-11`);
check("U9", "one working day after (last working day Fri 27 Nov; Mon 30 Nov after it): the singular", notes().includes("The last working day was 27 Nov 2026; the 1 working day of November 2026 after it isn't paid."), j(notes()));
setNow(2026, 11, 9);

// =================================================================
section("E. What stays");
mem.clear(); setNow(2026, 9, 30, 11);
const sep = PS.payrollRun(2026, 9);
check("E1", "the canonical September (30 Sep 11:00) is byte-identical to before this round", j(sep) === j(OLD.payrollRun(2026, 9)));
const e2 = [];
for (const [seed, view, y, m] of [[[2026, 9, 30, 11], [2026, 9, 30, 17], 2026, 9], [[2026, 10, 30, 19], [2026, 11, 9, 11], 2026, 10], [[2026, 11, 16, 11], [2026, 11, 30, 19], 2026, 11], [[2026, 10, 16, 9], [2027, 1, 11, 10], 2027, 1]]) {
  mem.clear(); setNow(...seed); PS.payrollRun(seed[0], seed[1]); setNow(...view);
  e2.push(j(PS.payrollRun(y, m)) === j(OLD.payrollRun(y, m)) && S.getAllUsers().every((u) => j(A.monthFor(u.id, y, m)) === j(OLDA.monthFor(u.id, y, m)) && j(PS.payslipsFor(u.id, `${y}-${String(m).padStart(2, "0")}-15`)) === j(OLD.payslipsFor(u.id, `${y}-${String(m).padStart(2, "0")}-15`))));
}
check("E2", "with nobody leaving, the runs, every monthFor() and every payslip are byte-identical to before over four clocks", e2.every(Boolean), j(e2));
check("E3", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre11Z"), jsPre = walk("./js-pre11Y");   // Round 12A (layout)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre11Z", p) !== srcAt("./js-pre11Y", p));
const SEVEN = ["data/attendance-store.js", "data/payroll-store.js", "data/payroll.js", "data/store.js", "pages/payroll-run.js", "pages/payslip-view.js", "pages/user-profile.js"];
check("X1", "exactly these 7 js files changed, none added or removed (leave-store, holidays, the attendance pages untouched)", j(changedJs) === j(SEVEN) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
const pagesPre = walk("./html-pre11Y").filter((p) => p.endsWith(".html"));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const cssDir = new URL("./css-pre13U", HERE).pathname.replace(/^\/(\w:)/, "$1");
check("X2", "no page and no css changed (the dialog and the row are drawn by the script)", j(pagesNow) === j(pagesPre) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre11Y", p))
  && walk("./css-pre11Y").every((p) => fs.existsSync(`${cssDir}/${p}`) && fs.readFileSync(`${cssDir}/${p}`, "utf8") === srcAt("./css-pre11Y", p)));
check("X3", "every changed file CRLF with no final newline", changedJs.every((p) => { const s = srcAt("./js", p); return !s.endsWith("\n") && !/(^|[^\r])\n/.test(s); }));
const imports = (s) => s.match(/^import .*$/gm) ?? [];
const added = (f) => imports(srcAt("./js-pre11Z", f)).filter((l) => !imports(srcAt("./js-pre11Y", f)).includes(l));   // Round 12H (layout; was the live js)
check("X4", "imports: leavingDate added to the store imports of attendance-store, payroll-store and user-profile; user-profile gains ui/modal.js; nothing else",
  j(added("data/attendance-store.js")) === j(['import { getUser, getAllUsers, joiningDate, leavingDate } from "./store.js";']) && j(added("data/payroll-store.js")) === j(['import { getUser, getAllUsers, joiningDate, leavingDate } from "./store.js";'])
  && j(added("pages/user-profile.js")) === j(['import { getUser, getAllUsers, getAllDepartments, deactivateUser, reactivateUser, deleteUser, reportingManagerName, leavingDate } from "../data/store.js";', 'import { openModal, closeModal } from "../ui/modal.js";'])
  && ["data/store.js", "data/payroll.js", "pages/payroll-run.js", "pages/payslip-view.js"].every((f) => added(f).length === 0), j(SEVEN.map((f) => [f, added(f).length])));
const pages = ["pages/payroll-run.js", "pages/payslip-view.js", "pages/user-profile.js"].map((p) => srcAt("./js", p));
check("X5", "no page works out pay or reads the leaving date's arithmetic itself: the run page and payslip read the row (attendance.lastDay, lop.leftDays)",
  pages.every((s) => !/data\/payroll\.js"|computePay|lossOfPayDays|lossOfPayAmount/.test(s)) && /attendance\.lastDay/.test(pages[0]) && /lop\.leftDays/.test(pages[1]));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
