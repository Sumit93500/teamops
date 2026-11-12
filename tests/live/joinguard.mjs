// usage: node joinguard.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 10H: no attendance before the joining date (10G, G3: a new hire could check in, and ask for and get corrections,
// for days before their joiningDate). ./js-pre10H, ./html-pre10H and ./css-pre10H are the code, pages and css before
// this round (office-os f777a00).
// A movable clock: it starts at Wed 14 Oct 2026 09:20 local; at() moves it within October 2026.
//   C  checkIn: refused before the joining date (the message names it); the joining day itself is fine; unreadable
//      dates refuse nothing; where it sits among the other refusals; checkOut needs no guard of its own
//   R  requestRegularization: the request's date (not today) before the joining date is refused at the date field,
//      after the future / window refusals; the joining day itself is fine; an Admin's auto-approval writes nothing
//   D  the decision isn't re-checked (decision pin: a request sent in time can be decided later, 10G G3)
//   U  scope creep: reads and every other write behave exactly as before (the pre-10H store, side by side)
//   P  the pages: mark-attendance.html disables Check in before the joining date, a fourth case beside holiday / weekend /
//      leave (the store's refusal stays the backstop); my-attendance.html shows the store's refusal at the date field
//   X  scope: exactly attendance-store.js and mark-attendance.js, only 10H's lines
// Round 12D (behaviour, C9): a working day before the joining date reads "not-joined" whatever is on record (the
// mirror of 11Y's "left"), so C9's stored check-in, from before a joining date moved later, no longer reads present.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const at = (day, hour = 9, minute = 20) => { NOW = new RealDate(2026, 9, day, hour, minute, 0).getTime(); };   // a day in October 2026, local
at(14);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const AARAV = "EMP-1001", PRIYA = "EMP-1003", ARJUN = "EMP-1105";
const WHO = { aarav: ["admin", "Aarav Mehta", AARAV], arjun: ["emp", "Arjun Kapoor", ARJUN] };

let loads = 0, w = null, d = null, saved = {}, jsErrors = [];
const allJsErrors = [];   // every page load's, for P3
async function open(page, who) {
  const cur = globalThis.localStorage;   // the in-memory one before the first page, then the last page's
  saved = Object.fromEntries(Array.from({ length: cur.length }, (_, i) => cur.key(i)).map((k) => [k, cur.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = [];
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) { jsErrors.push(e.message); allJsErrors.push(`${page}: ${e.message}`); } });
  const dom = new JSDOM(fs.readFileSync(`${DIR}/attendance/${page}.html`, "utf8"), { url: `http://localhost/office-os/pages/attendance/${page}.html`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.HTMLElement.prototype.scrollIntoView = function () {};
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${page}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
// The store modules read localStorage through the global; before any page is open, an in-memory one stands in.
const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
function fresh() { globalThis.localStorage.clear(); if (w) w.localStorage.clear(); saved = {}; at(14); }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const res = (r) => (r.ok ? [true] : [false, r.error, r.field ?? null]);

const A = await import("./js/data/attendance-store.js");
const A0 = await import("./js-pre10H/data/attendance-store.js");   // the store before 10H: a second copy, on the same storage
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const inMsg = (day) => `You can't check in before your joining date (${day}).`;
const reqMsg = (day) => `You can't ask to correct a day before your joining date (${day}).`;

let joiners = 0;
// A new hire: an Employee with this joining date (left out when undefined), as the users form adds one.
function joiner(doj) {
  joiners++;
  const fields = { name: `Joiner ${joiners}`, email: `joiner${joiners}@northwind.com`, department: "ENG", designation: "Engineer" };
  if (doj !== undefined) fields.dateOfJoining = doj;
  const r = S.addUser(USER_ACTOR("admin", null), fields);
  if (!r.ok) throw new Error(r.error);
  return r.record.id;
}
const records = () => JSON.parse(globalThis.localStorage.getItem("officeos:attendance") ?? "{}").records ?? [];
const stored = (id, date) => records().find((r) => r.userId === id && r.date === date) ?? null;
const missedIn = (id, date, more = {}) => A.requestRegularization(id, { date, issue: "missed-check-in", time: "09:30", reason: "Forgot to check in", ...more });

// =====================================================================
section("C. checkIn: not before the joining date");
fresh();
const c1 = joiner("16 Oct 2026");
check("C1", "joining Fri 16 Oct, checking in on Wed 14 Oct: refused, naming the joining date; nothing stored; the day still reads not-joined",
  j(res(A.checkIn(c1))) === j([false, inMsg("2026-10-16"), null]) && stored(c1, "2026-10-14") === null && A.dayFor(c1, "2026-10-14").status === "not-joined",
  j(res(A.checkIn(c1))));
const c2 = joiner("14 Oct 2026");
const c2r = A.checkIn(c2);
check("C2", "the boundary: joining today, checking in today is fine (present, 09:20, stored)",
  c2r.ok && c2r.day.status === "present" && stored(c2, "2026-10-14")?.checkIn === "09:20", j(res(c2r)));
const c3 = joiner("13 Oct 2026");
check("C3", "joined yesterday: fine", A.checkIn(c3).ok && stored(c3, "2026-10-14") !== null);
const c4 = joiner("2026-10-15");
check("C4", "an ISO joining date (2026-10-15) is read the same way: refused, naming it", j(res(A.checkIn(c4))) === j([false, inMsg("2026-10-15"), null]));
const unreadable = ["", "sometime in Oct", "31 Feb 2026", undefined].map((doj) => [doj ?? "(none)", joiner(doj)]);
check("C5", "a joining date that can't be read (empty, free text, impossible, none) refuses nothing, as payroll treats it",
  unreadable.every(([, id]) => A.checkIn(id).ok), j(unreadable.map(([doj, id]) => [doj, Boolean(stored(id, "2026-10-14"))])));
check("C6", "the mode check still comes first: a pre-joiner choosing 'car' gets the mode refusal at the mode field",
  j(res(A.checkIn(c1, "car"))) === j([false, "Choose Office or Work from home.", "mode"]));
fresh();
at(17);   // Sat 17 Oct
const c7 = joiner("19 Oct 2026");
const c7w = res(A.checkIn(c7));
at(2);    // Fri 2 Oct, Gandhi Jayanti
const c7h = joiner("5 Oct 2026");
const c7hr = res(A.checkIn(c7h));
check("C7", "before the joining date, that reason comes before the day's own: a Saturday and a holiday both get the joining-date refusal",
  j(c7w) === j([false, inMsg("2026-10-19"), null]) && j(c7hr) === j([false, inMsg("2026-10-05"), null]), j([c7w, c7hr]));
at(14);
fresh();
const c8 = joiner("14 Oct 2026");
A.checkIn(c8);
S.updateUser(USER_ACTOR("admin", c8), c8, { dateOfJoining: "16 Oct 2026" });   // the joining date moved later after a check-in was stored
// Round 12L (round-12k-notes.md K7.1): the day now reads not-joined with no record on it, so the joining-date refusal
// answers. Was: "You already checked in today at 09:20."
check("C8", "a check-in stored before the joining date moved later: a second check-in meets the joining-date refusal (round 12L: the day carries no record)",
  j(res(A.checkIn(c8))) === j([false, inMsg("2026-10-16"), null]));
at(14, 18, 40);
const c9 = A.checkOut(c8);
// Round 12D (behaviour; was "and the day reads present, as before 10H"): the day is before the joining date, so it's not-joined.
// Round 12L (round-12k-notes.md K7.1): the stored record is still closed at 18:40; the day doesn't show it. Was: the day's checkOut 18:40.
check("C9", "checkOut has no joining-date check of its own: that stored check-in can still be closed (18:40, in storage); the day, before the joining date, reads not-joined with no record on it (Round 12D; round 12L)",
  c9.ok && stored(c8, "2026-10-14")?.checkOut === "18:40" && A.dayFor(c8, "2026-10-14").status === "not-joined" && A.dayFor(c8, "2026-10-14").checkOut === null,
  j([res(c9), A.dayFor(c8, "2026-10-14").status]));
at(14);
const c10 = joiner("16 Oct 2026");
check("C10", "…and a pre-joiner can't check out without a check-in, which C1 now refuses: 'Check in first.'", j(res(A.checkOut(c10))) === j([false, "Check in first.", null]));
check("C11", "unchanged for people who joined long ago: Arjun (12 Jan 2023) and Aarav (4 Apr 2019) check in",
  A.checkIn(ARJUN).ok && A.checkIn(AARAV).ok && stored(ARJUN, "2026-10-14")?.checkIn === "09:20");

// =====================================================================
section("R. requestRegularization: not for a day before the joining date");
fresh();
const r1 = joiner("12 Oct 2026");   // Mon 12 Oct; today Wed 14 Oct
const r1a = missedIn(r1, "2026-10-09");
check("R1", "a missed check-in for Fri 9 Oct, before joining on 12 Oct (5 days back, inside the window): refused at the date field, naming the joining date; nothing stored",
  j(res(r1a)) === j([false, reqMsg("2026-10-12"), "date"]) && A.regularizationsFor(r1).length === 0, j(res(r1a)));
check("R2", "it's the request's date that counts, not today: today (14 Oct) is after joining, 9 Oct isn't (a check on today wouldn't refuse it)",
  "2026-10-14" >= S.joiningDate(S.getUser(r1).dateOfJoining) && !r1a.ok);
const r3 = missedIn(r1, "2026-10-12");
check("R3", "the boundary: the joining day itself (12 Oct, absent) is fine: pending, at HR", r3.ok && r3.record.status === "pending" && r3.record.date === "2026-10-12", j(res(r3)));
const r4 = missedIn(r1, "2026-10-13");
check("R4", "the day after it: fine", r4.ok && r4.record.status === "pending", j(res(r4)));
check("R5", "the earlier refusals still come first: a future day, then one outside the 7-day window (1 Oct, also before joining)",
  j(res(missedIn(r1, "2026-10-15"))) === j([false, "You can't ask to correct a day that hasn't happened yet.", "date"])
  && j(res(missedIn(r1, "2026-10-01"))) === j([false, "Corrections must be asked for within 7 days of the date.", "date"]));
check("R6", "…and it comes before the time and reason checks: 9 Oct with a bad time and no reason still gets the joining-date refusal",
  j(res(missedIn(r1, "2026-10-09", { time: "9am", reason: "" }))) === j([false, reqMsg("2026-10-12"), "date"]));
fresh();
const r7 = joiner("2026-10-12");
check("R7", "an ISO joining date works the same (2026-10-12): 9 Oct refused, naming it", j(res(missedIn(r7, "2026-10-09"))) === j([false, reqMsg("2026-10-12"), "date"]));
const r8 = joiner(undefined);
const r8a = missedIn(r8, "2026-10-09");
check("R8", "no readable joining date: refuses nothing (9 Oct goes through, pending)", r8a.ok && r8a.record.status === "pending", j(res(r8a)));
fresh();
const r9 = joiner("12 Oct 2026");
S.updateUser(USER_ACTOR("admin", r9), r9, { role: "admin" });
const r9a = missedIn(r9, "2026-10-09");
const r9b = missedIn(r9, "2026-10-12");
check("R9", "an Admin's own correction is auto-approved, and refused first: 9 Oct leaves no request and no record; 12 Oct is approved and written",
  j(res(r9a)) === j([false, reqMsg("2026-10-12"), "date"]) && stored(r9, "2026-10-09") === null && A.regularizationsFor(r9).length === 1
  && r9b.ok && r9b.record.status === "approved" && stored(r9, "2026-10-12")?.checkIn === "09:30", j([res(r9a), res(r9b)]));
fresh();
const late = A.dayFor(ARJUN, "2026-10-08");
const r10 = A.requestRegularization(ARJUN, { date: "2026-10-08", issue: "late-arrival", time: "09:30", reason: "Client call" });
check("R10", "unchanged for people who joined long ago: Arjun's seeded late 8 Oct (10:05) can be corrected", late.status === "late" && late.checkIn === "10:05" && r10.ok, j([late.status, late.checkIn, res(r10)]));
fresh();
const r11 = joiner("13 Oct 2026");   // Tue 13 Oct
const r11a = missedIn(r11, "2026-10-12");
check("R11", "the day right before joining (Mon 12 Oct, joining Tue 13 Oct): refused, naming 13 Oct; the joining day itself goes through",
  j(res(r11a)) === j([false, reqMsg("2026-10-13"), "date"]) && missedIn(r11, "2026-10-13").ok, j(res(r11a)));

// =====================================================================
section("D. The decision isn't re-checked (decision pin)");
fresh();
const d1 = joiner("12 Oct 2026");
const d1r = missedIn(d1, "2026-10-12");
S.updateUser(USER_ACTOR("admin", d1), d1, { dateOfJoining: "13 Oct 2026" });   // corrected after the request was sent
const d1d = d1r.ok ? A.decideRegularization(d1r.record.id, PRIYA, "hr", "approve") : { ok: false, error: "no request" };
check("D1", "a request sent in time for the joining day, whose joining date then moves later, can still be approved (only sending is checked, as with the 7-day window)",
  d1d.ok && d1d.record.status === "approved" && stored(d1, "2026-10-12")?.checkIn === "09:30", j(res(d1d)));

// =====================================================================
section("U. Scope creep: everything else as before (the pre-10H store, side by side)");
// One script of ordinary writes, run once through each store from the same fresh data; the fake clock makes every
// timestamp the same, so the stored data must match byte for byte.
function script(X) {
  fresh();
  const a = joiner("12 Oct 2026"), b = joiner(undefined);
  const log = [];
  const step = (r) => log.push(res(r));
  at(12, 9, 25); step(X.checkIn(a)); at(12, 18, 35); step(X.checkOut(a));
  at(13, 9, 50); step(X.checkIn(a)); step(X.checkIn(b, "wfh"));
  at(14, 9, 10); step(X.checkIn(ARJUN)); step(X.checkOut(ARJUN)); at(14, 18, 45); step(X.checkOut(ARJUN));
  step(X.requestRegularization(a, { date: "2026-10-13", issue: "late-arrival", time: "09:30", reason: "Bus" }));
  step(X.requestRegularization(b, { date: "2026-10-12", issue: "missed-check-in", time: "09:15", reason: "x" }));
  step(X.requestRegularization(ARJUN, { date: "2026-10-08", issue: "late-arrival", time: "09:30", reason: "Client call" }));
  step(X.requestRegularization(ARJUN, { date: "2026-10-15", issue: "missed-check-in", time: "09:30", reason: "x" }));
  const mine = X.allRegularizations().filter((r) => r.status === "pending");
  mine.forEach((r, i) => step(i % 3 === 2 ? X.cancelRegularization(r.id, r.userId) : X.decideRegularization(r.id, i % 2 ? AARAV : PRIYA, i % 2 ? "admin" : "hr", i % 3 ? "reject" : "approve", "no")));
  const keys = ["officeos:attendance", "officeos:regularizations", "officeos:attendance-seed"];
  return { log, data: keys.map((k) => globalThis.localStorage.getItem(k)), month: [a, b, ARJUN, PRIYA].map((id) => X.monthFor(id, 2026, 10)), team: X.summaryRange("2026-10-01", "2026-10-31") };
}
const now10H = script(A), pre10H = script(A0);
check("U1", "the same writes (punches, corrections, decisions, a cancel; for a new hire after joining, someone with no joining date, and Arjun) give the same results as before 10H",
  now10H.log.length >= 14 && j(now10H.log) === j(pre10H.log), j(now10H.log.map((r) => r[0])));
check("U2", "…and leave the stored attendance, corrections and seed anchor byte-identical", now10H.data.every((s, i) => s !== null && s === pre10H.data[i]));
check("U3", "…and every read on them is the same: four people's October (days, counts, penalties) and the team summary for each day",
  j(now10H.month) === j(pre10H.month) && j(now10H.team) === j(pre10H.team));
fresh();
const u4 = joiner("16 Oct 2026");
const u4days = ["2026-10-09", "2026-10-14", "2026-10-16"].map((x) => [A.dayFor(u4, x)?.status, A0.dayFor(u4, x)?.status]);
check("U4", "a pre-joiner's days read as before: not-joined until the joining date (the store's reads have no new rule)",
  j(u4days) === j([["not-joined", "not-joined"], ["not-joined", "not-joined"], ["not-yet", "not-yet"]]), j(u4days));

// =====================================================================
section("P. The pages show the store's refusal");
const $ = (id) => d.getElementById(id);
fresh();
const p1 = joiner("16 Oct 2026");
WHO.p1 = ["emp", "Joiner P1", p1];
await open("mark-attendance", "p1");
const badge = () => txt($("punch-status"));
const errorLine = () => ($("punch-error").hidden ? "" : txt($("punch-error")));
const noteLine = () => ($("punch-note").hidden ? "" : txt($("punch-note")));
const card = () => ({ badge: badge(), cls: $("punch-status").className, inOff: $("check-in-btn").disabled, outOff: $("check-out-btn").disabled,
  modesOff: [...d.querySelectorAll('input[name="mode"]')].every((i) => i.disabled), note: noteLine(), error: errorLine() });
const p1card = card();
$("check-in-btn").click();   // a disabled button: nothing happens
check("P1", "mark-attendance as a pre-joiner (joining 16 Oct): a fourth disabled state beside holiday / weekend / leave: 'Not joined yet', Check in and the mode off, the note naming the joining date; a click stores nothing and shows no error",
  j(p1card) === j({ badge: "Not joined yet", cls: "badge badge--dot", inOff: true, outOff: true, modesOff: true, note: "Attendance starts on your joining date, 16 Oct 2026.", error: "" })
  && stored(p1, "2026-10-14") === null && j(card()) === j(p1card), j(p1card));
check("P1b", "the store still refuses it as the backstop (a click the page didn't stop, e.g. a re-enabled button)", j(res(A.checkIn(p1))) === j([false, inMsg("2026-10-16"), null]) && stored(p1, "2026-10-14") === null);
S.updateUser(USER_ACTOR("admin", p1), p1, { dateOfJoining: "14 Oct 2026" });
await open("mark-attendance", "p1");
const p2card = card();
$("check-in-btn").click();
check("P2", "joining today: the ordinary state (Not checked in yet, Check in on, no note); clicked, it checks in at 09:20 with no error line",
  p2card.badge === "Not checked in yet" && !p2card.inOff && p2card.note === "" && badge() === "Checked in at 09:20" && errorLine() === "" && stored(p1, "2026-10-14")?.checkIn === "09:20", j([p2card, badge(), errorLine()]));
fresh();
const p2b = joiner("16 Oct 2026");
WHO.p2b = ["emp", "Joiner P2b", p2b];
at(16);
await open("mark-attendance", "p2b");
const p2bcard = card();
check("P2b", "the same person on their joining day (16 Oct): Check in on, no 'Not joined yet'", p2bcard.badge === "Not checked in yet" && !p2bcard.inOff && p2bcard.note === "", j(p2bcard));
at(17);   // Sat 17 Oct, before a 19 Oct start
const p2c = joiner("19 Oct 2026");
WHO.p2c = ["emp", "Joiner P2c", p2c];
await open("mark-attendance", "p2c");
const wkCard = card();
at(2);    // Fri 2 Oct, Gandhi Jayanti, before a 5 Oct start
const p2d = joiner("5 Oct 2026");
WHO.p2d = ["emp", "Joiner P2d", p2d];
await open("mark-attendance", "p2d");
const holCard = card();
check("P2c", "the existing three still show before joining: a weekend or a holiday reads as itself (the day's status ranks them above not-joined), disabled with its own note, as before 10H",
  wkCard.badge === "Weekend" && wkCard.inOff && wkCard.note === "No attendance is needed on weekends." && holCard.badge === "Holiday: Gandhi Jayanti" && holCard.inOff && holCard.note === "No attendance is needed on holidays.",
  j([wkCard, holCard]));
at(14);
check("P3", "no JS errors on mark-attendance (any of its five loads)", allJsErrors.length === 0, allJsErrors.join(" | "));
fresh();
const p4 = joiner("12 Oct 2026");
WHO.p4 = ["emp", "Joiner P4", p4];
await open("my-attendance", "p4");
const errors = () => [...d.querySelectorAll("#regularize-modal .form-error")].map((e) => { const input = e.closest(".form-field").querySelector("input, select, textarea"); return `${input.id}:${e.textContent}${input.getAttribute("aria-describedby") === e.id ? "" : "(unlinked)"}`; });
const setField = (id, value) => { const i = $(id); i.value = value; i.dispatchEvent(new w.Event("input", { bubbles: true })); };
const submitForm = () => d.querySelector("#regularize-modal form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const modalOpen = () => $("regularize-modal").classList.contains("is-open");
const logDates = () => [...d.querySelectorAll("#daily-log tbody tr")].map((tr) => txt(tr.children[0]));
check("P4", "my-attendance's daily log (unchanged): only days from the joining date (14, 13, 12 Oct); none before it, so no Request fix for them",
  j(logDates()) === j(["Wed, 14 Oct", "Tue, 13 Oct", "Mon, 12 Oct"]), j(logDates()));
$("request-btn").click();
check("P5", "the request form's date range is unchanged: the 7-day window (min 7 Oct, max today), not the joining date", modalOpen() && $("reg-date").min === "2026-10-07" && $("reg-date").max === "2026-10-14",
  j([$("reg-date").min, $("reg-date").max]));
setField("reg-issue", "missed-check-in"); setField("reg-date", "2026-10-09"); setField("reg-time", "09:30"); setField("reg-reason", "Forgot");
submitForm();
check("P6", "9 Oct typed and sent: the store's refusal at the date field (linked); the modal stays open; nothing sent",
  j(errors()) === j([`reg-date:${reqMsg("2026-10-12")}`]) && modalOpen() && A.regularizationsFor(p4).length === 0, errors().join());
setField("reg-date", "2026-10-12");
submitForm();
check("P7", "the joining day (12 Oct): sent, the modal closes", !modalOpen() && A.regularizationsFor(p4).length === 1 && errors().length === 0, j(errors()));
check("P8", "no JS errors on my-attendance", jsErrors.length === 0, jsErrors.join(" | "));

// =====================================================================
section("X. Scope: exactly 10H's lines");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
// Round 10J (layout; was the live js vs js-pre10H, here and in X1 / X3 / X4): 10H's own change set, read from its frozen
// result (js-pre10J = HEAD 23d34bc); the live js has 10J's lines since (departments.mjs JX1 / JX4)
const changedJs = walk(`${HERE}js-pre10J`).filter((f) => SRC("js-pre10J", f) !== SRC("js-pre10H", f)).sort();
// Round 11B (layout; was the live pages, here and in the check below): this round's own page claim, read from its
// frozen result (html-pre11B = HEAD 97e1e6c); the live pages have 11B's sessions.html banner since (acctpages.mjs X2)
const changedHtml = walk(`${HERE}html-pre11B`).filter((f) => fs.readFileSync(`${HERE}html-pre11B/${f}`, "utf8") !== fs.readFileSync(`${HERE}html-pre10H/${f}`, "utf8"));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre10H", f)) : [];
const FILES = ["data/attendance-store.js", "pages/mark-attendance.js"];
check("X1", "js changed: exactly data/attendance-store.js and pages/mark-attendance.js; nothing added or removed", j(changedJs) === j(FILES) && j(walk(`${HERE}js-pre10J`).sort()) === j(walk(`${HERE}js-pre10H`).sort()), j(changedJs));
check("X2", "no page and no css changed; nothing added or removed", changedHtml.length === 0 && changedCss.length === 0 && j(walk(`${HERE}html-pre11B`).sort()) === j(walk(`${HERE}html-pre10H`).sort()), j([changedHtml, changedCss]));
check("X3", "the two are CRLF only, with no final newline", changedJs.map((f) => SRC("js-pre10J", f)).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
const count = (s) => s.split("\r\n").reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
const delta = Object.fromEntries(FILES.map((f) => {
  const a = count(SRC("js-pre10H", f)), b = count(SRC("js-pre10J", f));
  const removed = [...a].flatMap(([l, n]) => Array(Math.max(0, n - (b.get(l) ?? 0))).fill(l)).sort();
  const added = [...b].reduce((t, [l, n]) => t + Math.max(0, n - (a.get(l) ?? 0)), 0);
  return [f, { removed, added }];
}));
check("X4", "…and within them, only 10H's lines (nothing removed; 4 added to the store, 3 to the page)",
  j(delta) === j({ "data/attendance-store.js": { removed: [], added: 4 }, "pages/mark-attendance.js": { removed: [], added: 3 } }), j(delta));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
