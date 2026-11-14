// usage: node mark.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Loads mark-attendance.html (staged by default) with the js in ./js, in jsdom.
// localStorage carries over between page loads. The clock starts at Mon 28 Sep
// 2026 10:00 local and can be moved; setTimeout/setInterval are captured so the
// minute tick can be fired on demand.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? "__REPO__/pages";
const HTML = fs.readFileSync(`${DIR}/attendance/mark-attendance.html`, "utf8");
const SCRIPT = fs.readFileSync(new URL("./js/pages/mark-attendance.js", import.meta.url), "utf8");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const BASE = () => setNow(2026, 9, 28, 10, 0);
BASE();
let timeouts = [], intervals = [];
globalThis.setTimeout = (fn, ms) => { timeouts.push({ fn, ms }); return timeouts.length; };
globalThis.setInterval = (fn, ms) => { intervals.push({ fn, ms }); return 1000 + intervals.length; };
// One minute passes: pending timeouts fire once (the first one starts the interval), then each interval once.
function tick() {
  const due = timeouts; timeouts = [];
  due.forEach((t) => t.fn());
  intervals.forEach((t) => t.fn());
}

const WHO = {
  arjun: ["emp", "Arjun Kapoor", "EMP-1105"], priya: ["hr", "Priya Nair", "EMP-1003"], sneha: ["emp", "Sneha Rao", "EMP-1029"],
  meera: ["emp", "Meera Joshi", "EMP-1023"], kabir: ["fin", "Kabir Shah", "EMP-1008"], aarav: ["admin", "Aarav Mehta", "EMP-1001"],
  vikram: ["emp", "Vikram Singh", "EMP-1088"], divya: ["emp", "Divya Menon", "EMP-1061"], old: ["hr", "Priya Nair", undefined],
};

let loads = 0, w = null, d = null, saved = {};
const jsErrors = [];
async function open(who) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) jsErrors.push(`${who}: ${e.message}`); });
  const dom = new JSDOM(HTML, { url: "http://localhost/office-os/pages/attendance/mark-attendance.html", virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, HTMLElement: w.HTMLElement });
  timeouts = []; intervals = [];
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/mark-attendance.js?load=${loads}`); } catch (e) { jsErrors.push(`${who} import: ${e.message}`); }
}
// Fresh demo data (users, leave, holidays, attendance) and the clock back to 28 Sep 10:00.
async function fresh() {
  BASE();
  if (w) w.localStorage.clear();   // the next open() copies this (now empty) storage, plus anything written before it
  saved = {};
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
const A = await import("./js/data/attendance-store.js");
const L = await import("./js/data/leave-store.js");
const H = await import("./js/data/holidays.js");
const HOL_ACTOR = "EMP-1003";   // Round 10W (signature; was addHoliday(fields) / removeHoliday(id)): the holiday writes take the acting person's id first and check their record (holidays:manage); every call here passes HR's (Priya). The guard itself: holiguard.mjs
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
// Round 14E part 2 (layout): a node's text without the reason lines showReason() adds under a badge or note (class reason); reasons2.mjs pins those lines
const txt = (node) => { if (!node) return null; const c = node.cloneNode(true); c.querySelectorAll?.(".reason").forEach((r) => r.remove()); return c.textContent.replace(/\s+/g, " ").trim(); };
const j = JSON.stringify;

// ---- readers ----
const $ = (id) => d.getElementById(id);
const badge = () => `${txt($("punch-status"))} {${$("punch-status").className.split(" ").filter((c) => c !== "badge" && c !== "badge--dot").join(" ")}}`;
const buttons = () => `in:${$("check-in-btn").disabled ? "off" : "on"} out:${$("check-out-btn").disabled ? "off" : "on"}`;
const noteText = () => ($("punch-note").hidden ? "" : txt($("punch-note")));
const errorText = () => ($("punch-error").hidden ? "" : txt($("punch-error")));
const modes = () => [...d.querySelectorAll('input[name="mode"]')].map((i) => `${i.value}${i.checked ? "*" : ""}${i.disabled ? "(off)" : ""}`).join(" ");
const stats = () => [txt($("stat-check-in")), txt($("stat-check-out")), txt($("stat-hours"))].join(" | ");
const clockText = () => `${txt($("punch-clock").querySelector("time"))} ${txt($("punch-clock").querySelector("small"))} [${$("punch-clock").querySelector("time").getAttribute("datetime")}]`;
const recent = () => [...d.querySelectorAll("#recent-punches tbody tr")].map((tr) => [...tr.children].map((td) => txt(td)).join(" / "));
const shift = () => `${txt($("shift-timing"))} | ${txt($("shift-grace"))} | ${txt($("late-marks"))}`;
const lateNote = () => ($("late-note").hidden ? "" : txt($("late-note")));
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${t.className.replace("toast toast--", "")}:${t.querySelector(".toast__text").innerHTML.trim()}`);
const clearToasts = () => d.querySelectorAll(".toast").forEach((t) => t.remove());
const click = (id) => $(id).click();
const pickMode = (value) => { const i = d.querySelector(`input[name="mode"][value="${value}"]`); i.checked = true; i.dispatchEvent(new w.Event("change", { bubbles: true })); };

// =====================================================================
section("Arjun (nothing today yet), Mon 28 Sep 10:00");
await fresh(); await open("arjun");
check("A1", "subtitle is today's real date", txt($("today-date")) === "Monday, 28 September 2026", txt($("today-date")));
check("A2", "clock shows the current time (10:00 AM, datetime 10:00)", clockText() === "10:00 AM [10:00]", clockText());
check("A3", "badge 'Not checked in yet'; Check in on, Check out off; no note, no error", badge() === "Not checked in yet {badge--warning}" && buttons() === "in:on out:off" && noteText() === "" && errorText() === "",
  `${badge()} ${buttons()}`);
check("A4", "work mode: Office pre-selected and changeable", modes() === "office* wfh", modes());
check("A5", "punch stats empty: – | – | 0h 00m", stats() === "– | – | 0h 00m", stats());
check("A6", "rule line and shift card from the store's rules", txt($("punch-rule")) === "Shift 9:30 AM – 6:30 PM. Checking in after 9:45 AM is marked late." && shift() === "9:30 AM – 6:30 PM | 15 minutes | 1 of 3" && lateNote() === "",
  `${txt($("punch-rule"))} || ${shift()}`);
check("A7", "no Location card (F1: removed with its 'not part of this demo' line), nothing invented: the aside starts with Today's shift", !/part of this demo|Location check/.test(d.body.textContent) && txt(d.querySelector(".grid aside .card .card__title")) === "Today's shift" && !/12 m|Wi-Fi|Chrome/.test(d.body.textContent),
  txt(d.querySelector(".grid aside .card .card__title")));
check("A8", "Recent punches: today and the 4 working days before, newest first, from the store (24 Sep regularized, 22 Sep late)",
  j(recent().map((r) => r.split(" / ").slice(0, 2).concat(r.split(" / ").slice(4)).join(" / "))) === j([
    "Mon, 28 Sep / – / Overdue", "Fri, 25 Sep / " + A.dayFor("EMP-1105", "2026-09-25").checkIn + " / Present",
    "Thu, 24 Sep / 09:30 / Present Regularized", "Wed, 23 Sep / " + A.dayFor("EMP-1105", "2026-09-23").checkIn + " / Present", "Tue, 22 Sep / 10:05 / Late"]),
  recent().join(" || "));
check("A9", "hours column from the store (22 Sep 10:05–18:20 = 8h 15m)", recent()[4] === "Tue, 22 Sep / 10:05 / 18:20 / 8h 15m / Late", recent()[4]);

click("check-in-btn");
const arjunRec = A.dayFor("EMP-1105", "2026-09-28");
check("A10", "Check in: saved by the store (10:00, office), fixed-text success toast", arjunRec.checkIn === "10:00" && arjunRec.mode === "office" && j(toasts()) === j(["success:Checked in."]), j(toasts()));
check("A11", "without a reload: badge 'Checked in at 10:00, late by 30 min', Check in off, Check out on, mode locked",
  badge() === "Checked in at 10:00, late by 30 min {badge--warning}" && buttons() === "in:off out:on" && modes() === "office*(off) wfh(off)", `${badge()} ${buttons()} ${modes()}`);
check("A12", "stats and tables update at once: 10:00 | – | 0h 00m; today's row Late; late marks 2 of 3 with the heads-up note",
  stats() === "10:00 | – | 0h 00m" && recent()[0] === "Mon, 28 Sep / 10:00 / – / 0h 00m / Late" && txt($("late-marks")) === "2 of 3"
  && lateNote() === "One more late mark this month counts as half a day. Each half day is taken from your pay, not your leave balance, when payroll is processed.", `${stats()} || ${recent()[0]} || ${lateNote()}`);
clearToasts();
setNow(2026, 9, 28, 12, 30); tick();
check("A13", "the minute tick: clock 12:30 PM, hours today 2h 30m, today's row 2h 30m", clockText() === "12:30 PM [12:30]" && txt($("stat-hours")) === "2h 30m" && recent()[0] === "Mon, 28 Sep / 10:00 / – / 2h 30m / Late",
  `${clockText()} ${txt($("stat-hours"))}`);
check("A14", "the tick started a 60-second interval (after waiting for the next minute)", intervals.length === 1 && intervals[0].ms === 60000);
setNow(2026, 9, 28, 18, 45);
click("check-out-btn");
check("A15", "Check out: 'Checked out at 18:45', both buttons off, 'done for today'; stats 10:00 | 18:45 | 8h 45m",
  badge() === "Checked out at 18:45 {}" && buttons() === "in:off out:off" && noteText() === "You're done for today." && stats() === "10:00 | 18:45 | 8h 45m" && j(toasts()) === j(["success:Checked out."]),
  `${badge()} ${stats()}`);
check("A16", "today's row: 10:00 / 18:45 / 8h 45m / Late", recent()[0] === "Mon, 28 Sep / 10:00 / 18:45 / 8h 45m / Late", recent()[0]);

// =====================================================================
section("double check-in, late edge, Admin");
await fresh(); setNow(2026, 9, 28, 9, 0); await open("priya");
A.checkIn("EMP-1003", "office");            // e.g. from another tab: this page still shows Check in
click("check-in-btn");
check("B1", "a second check-in is refused by the store: shown inline, no success toast, page redraws as checked in",
  errorText() === "You already checked in today at 09:00." && toasts().length === 0 && badge() === "Checked in at 09:00 {badge--success}" && buttons() === "in:off out:on", `${errorText()} | ${badge()}`);
click("check-out-btn");
check("B2", "the next successful action clears the error", errorText() === "" && /Checked out at 09:00/.test(badge()));
setNow(2026, 9, 28, 9, 46); await open("kabir");
click("check-in-btn");
check("B3", "check-in at 09:46 is late by 16 min", badge() === "Checked in at 09:46, late by 16 min {badge--warning}", badge());
setNow(2026, 9, 28, 9, 45); await open("aarav");
check("B4", "Admin sees their own page (nothing today)", badge() === "Not checked in yet {badge--warning}" && buttons() === "in:on out:off");
click("check-in-btn");
check("B5", "Admin check-in at 09:45 is on time", badge() === "Checked in at 09:45 {badge--success}" && A.dayFor("EMP-1001", "2026-09-28").checkIn === "09:45", badge());

// =====================================================================
section("Sneha (already in), Meera (on leave)");
await fresh(); await open("sneha");
check("C1", "Sneha checked in at 09:20 (seed): success badge, Check out on, mode locked; stats 09:20 | – | 0h 40m",
  badge() === "Checked in at 09:20 {badge--success}" && buttons() === "in:off out:on" && modes() === "office*(off) wfh(off)" && stats() === "09:20 | – | 0h 40m", `${badge()} ${stats()}`);
await open("meera");
check("C2", "Meera: 'On leave today', both buttons off, the reason, mode locked", badge() === "On leave today {badge--info}" && buttons() === "in:off out:off"
  && noteText() === "You're on approved earned leave today, so there's nothing to check in for." && modes() === "office*(off) wfh(off)", `${badge()} | ${noteText()}`);
check("C3", "Meera's recent days are on leave (28, 25, 24, 23, 22 Sep)", recent().every((r) => r.endsWith("On leave")) && recent().length === 5, recent().join(" || "));

// =====================================================================
section("weekend, holiday, after the shift, midnight");
await fresh(); setNow(2026, 10, 3, 10, 0); await open("arjun");
check("D1", "Saturday: 'Weekend', buttons off, reason; subtitle Saturday, 3 October 2026", badge() === "Weekend {}" && buttons() === "in:off out:off" && noteText() === "No attendance is needed on weekends." && txt($("today-date")) === "Saturday, 3 October 2026",
  badge());
check("D2", "recent days skip the weekend and the 2 Oct holiday: 1 Oct, 30, 29, 28, 25 Sep", j(recent().map((r) => r.split(" / ")[0])) === j(["Thu, 1 Oct", "Wed, 30 Sep", "Tue, 29 Sep", "Mon, 28 Sep", "Fri, 25 Sep"]), recent().map((r) => r.split(" / ")[0]).join(", "));
setNow(2026, 10, 2, 10, 0); await open("arjun");
check("D3", "holiday: 'Holiday: Gandhi Jayanti', buttons off, reason", badge() === "Holiday: Gandhi Jayanti {}" && buttons() === "in:off out:off" && noteText() === "No attendance is needed on holidays.", badge());
H.addHoliday(HOL_ACTOR, { date: "2026-10-13", name: "<b>Office</b> day", kind: "company" });
setNow(2026, 10, 13, 10, 0); await open("arjun");
check("D4", "a holiday name with markup is shown as text, never as HTML", badge() === "Holiday: <b>Office</b> day {}" && !d.querySelector("#punch-status b"), badge());
await fresh(); setNow(2026, 9, 28, 19, 0); await open("priya");
check("D5", "after 18:30 with no check-in: 'Not checked in, the shift has ended' (danger), Check in closed, the note points to Request fix", badge() === "Not checked in, the shift has ended {badge--danger}" && buttons() === "in:off out:off" && noteText() === "Check-in closed at 6:30 PM. If you were working today, use Request fix on My attendance.", `${badge()} ${buttons()} ${noteText()}`);   // Round 14F (rule; was: Check in still allowed): closing.mjs B1
setNow(2026, 9, 28, 23, 59); await open("arjun");
setNow(2026, 9, 29, 0, 1); tick();
check("D6", "past midnight the page moves to the new day on its own", txt($("today-date")) === "Tuesday, 29 September 2026" && badge() === "Not checked in yet {badge--warning}" && recent()[0].startsWith("Tue, 29 Sep / –"),
  `${txt($("today-date"))} | ${recent()[0]}`);

// =====================================================================
section("work from home");
await fresh();
L.decideLeave("LV-2211", "EMP-1001", "admin", "approve");      // Priya's WFH on Wed 7 Oct
L.decideLeave("LV-2211", "EMP-1001", "admin", "approve");      // Round 8C (setup): Aarav is her manager and the HR-stage approver (the known double approval)
setNow(2026, 10, 7, 9, 5); await open("priya");
check("W1", "approved WFH day: Work from home pre-selected (still changeable)", modes() === "office wfh*", modes());
click("check-in-btn");
check("W2", "the check-in is saved as wfh and shown as (WFH)", A.dayFor("EMP-1003", "2026-10-07").mode === "wfh" && stats().startsWith("09:05 (WFH)") && recent()[0].startsWith("Wed, 7 Oct / 09:05 (WFH)"), stats());
const wfh8 = L.applyLeave("EMP-1003", { type: "wfh", from: "2026-10-08", to: "2026-10-08", reason: "x" });
L.decideLeave(wfh8.record.id, "EMP-1001", "admin", "approve");
L.decideLeave(wfh8.record.id, "EMP-1001", "admin", "approve");   // Round 8C (setup): both of Priya's steps are Aarav's
setNow(2026, 10, 8, 9, 5); await open("priya");
pickMode("office");
setNow(2026, 10, 8, 9, 6); tick();
check("W3", "choosing Office on a WFH day survives the minute redraw", modes() === "office* wfh", modes());
click("check-in-btn");
check("W4", "…and is what gets saved", A.dayFor("EMP-1003", "2026-10-08").mode === "office");
setNow(2026, 10, 9, 9, 5); await open("arjun");
pickMode("wfh"); click("check-in-btn");
check("W5", "anyone may pick Work from home on an ordinary day (free choice)", A.dayFor("EMP-1105", "2026-10-09").mode === "wfh");

// =====================================================================
section("late marks card");
await fresh(); await open("vikram");
check("L1", "Vikram (late 17 and 23 Sep): 2 of 3 with the heads-up note", txt($("late-marks")) === "2 of 3" && /One more late mark/.test(lateNote()), lateNote());
const balBefore = j(L.balanceFor("EMP-1088", 2026, 9));
setNow(2026, 9, 28, 10, 30); await open("vikram");
click("check-in-btn");
check("L2", "his 3rd late mark: 3 of 3 and the half-day note, taken from pay", txt($("late-marks")) === "3 of 3"
  && lateNote() === "Every 3rd late mark in a month counts as half a day: 1 this month. Each half day is taken from your pay, not your leave balance, when payroll is processed.", lateNote());
check("L3", "leave balances are untouched", j(L.balanceFor("EMP-1088", 2026, 9)) === balBefore);

// =====================================================================
section("old session, inactive person, safety");
await fresh(); await open("old");
const staticBody = d.body.innerHTML;
check("O1", "old session (no employee id): the static page stays as it is", txt($("today-date")) === "Friday, 18 September 2026" && badge() === "Not checked in yet {badge--warning}"
  && recent().length === 4 && recent()[0].startsWith("Thu, 17 Sep") && txt($("late-marks")) === "2 of 3");
click("check-in-btn");
check("O2", "…and Check in does nothing there (no record, no toast, page unchanged)", d.body.innerHTML === staticBody && toasts().length === 0 && A.dayFor("EMP-1003", "2026-09-28").checkIn === null);
await open("divya");
// Round 11P (behaviour; behaviour; N1: a deactivated person's session is now signed out at the guard and sent to sign in, so the page script draws nothing for them)
check("O3", "an inactive person (Divya): signed out at the guard (round 11P, N1); the static page is left (no 'Account inactive' drawn), nothing recorded", localStorage.getItem("officeos:session") === null && badge() === "Not checked in yet {badge--warning}" && A.dayFor("EMP-1061", "2026-09-28") === null,
  `${badge()} | ${noteText()}`);
check("O4", "the page script never uses innerHTML / outerHTML / insertAdjacentHTML", !/innerHTML|outerHTML|insertAdjacentHTML/.test(SCRIPT));
check("O5", "toasts only ever carry fixed text", [...SCRIPT.matchAll(/showToast\(([^)]*)\)/g)].every((m) => /^(doneText, "success")$/.test(m[1])) && /"Checked in\."/.test(SCRIPT) && /"Checked out\."/.test(SCRIPT));
await fresh(); await open("arjun");
const rows = recent().join(" ");
check("O6", "only the signed-in person's data: Arjun's page shows none of Sneha's or Rohan's times today", recent()[0].startsWith("Mon, 28 Sep / –") && !/09:20|09:12/.test(recent()[0]), rows);
check("O7", "the old fake script is gone and the page loads mark-attendance.js", /pages\/mark-attendance\.js/.test(HTML) && !/pages\/attendance\.js/.test(HTML) && !fs.existsSync(new URL("./js/pages/attendance.js", import.meta.url)));
check("O8", "no JS errors across all page loads", jsErrors.length === 0, jsErrors.join(" / ") || `none (${loads} loads)`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
