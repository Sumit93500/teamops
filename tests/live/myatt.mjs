// usage: node myatt.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Loads my-attendance.html and my-requests.html (staged by default) with the js in ./js, in jsdom.
// localStorage carries over between page loads. The clock starts at Mon 28 Sep 2026 10:00 local
// and can be moved; setTimeout is captured (toast timers).
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? "__REPO__/pages";
const PAGES = {
  "my-attendance": ["attendance", fs.readFileSync(`${DIR}/attendance/my-attendance.html`, "utf8")],
  "my-requests": ["requests", fs.readFileSync(`${DIR}/requests/my-requests.html`, "utf8")],
};
const SOURCES = ["my-attendance", "my-requests"].map((p) => fs.readFileSync(new URL(`./js/pages/${p}.js`, import.meta.url), "utf8"));

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const BASE = () => setNow(2026, 9, 28, 10, 0);
BASE();
globalThis.setTimeout = () => 0;

const WHO = {
  arjun: ["emp", "Arjun Kapoor", "EMP-1105"], rohan: ["emp", "Rohan Gupta", "EMP-1042"], vikram: ["emp", "Vikram Singh", "EMP-1088"],
  meera: ["emp", "Meera Joshi", "EMP-1023"], ananya: ["emp", "Ananya Iyer", "EMP-1017"], aarav: ["admin", "Aarav Mehta", "EMP-1001"],
  old: ["emp", "Arjun Kapoor", undefined],
};

let loads = 0, w = null, d = null, saved = {};
const jsErrors = [], confirms = [], navigations = [];
let confirmAnswer = true;
async function open(page, who) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const [folder, html] = PAGES[page];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (/navigation|form submission/i.test(e.message)) navigations.push(`${page}/${who}: ${e.message}`); else jsErrors.push(`${page}/${who}: ${e.message}`); });
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${folder}/${page}.html`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.confirm = (m) => { confirms.push(m); return confirmAnswer; };
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${page}.js?load=${loads}`); } catch (e) { jsErrors.push(`${page} import: ${e.message}`); }
}
function fresh() { BASE(); if (w) w.localStorage.clear(); saved = {}; }

const A = await import("./js/data/attendance-store.js");
const H = await import("./js/data/holidays.js");
const HOL_ACTOR = "EMP-1003";   // Round 10W (signature; was addHoliday(fields) / removeHoliday(id)): the holiday writes take the acting person's id first and check their record (holidays:manage); every call here passes HR's (Priya). The guard itself: holiguard.mjs
console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
// Round 14E part 2 (layout): a node's text without the reason lines showReason() adds under a badge or note (class reason); reasons2.mjs pins those lines
const txt = (node) => { if (!node) return null; const c = node.cloneNode(true); c.querySelectorAll?.(".reason").forEach((r) => r.remove()); return c.textContent.replace(/\s+/g, " ").trim(); };
const j = JSON.stringify;

// ---- readers: my-attendance ----
const $ = (id) => d.getElementById(id);
const statsRead = () => [...d.querySelectorAll("#month-stats .stat")].map((s) => `${txt(s.querySelector(".stat__label"))}: ${txt(s.querySelector(".stat__value"))}${s.querySelector(".stat__delta").hidden ? "" : ` (${txt(s.querySelector(".stat__delta"))})`}`);
const cells = () => [...d.querySelectorAll("#attendance-calendar .calendar__grid .calendar__day")];
const dayCells = () => cells().filter((c) => !c.classList.contains("calendar__day--empty"));
const cell = (n) => dayCells()[n - 1];
const look = (n) => { const c = cell(n); return `${[...c.classList].filter((k) => k !== "calendar__day").map((k) => k.replace("calendar__day--", "")).join("+")}${c.querySelector(".calendar__tag") ? `:${txt(c.querySelector(".calendar__tag"))}` : ""}`; };
const summaryRows = () => [...d.querySelectorAll("#month-summary .bar-row")].map((r) => `${txt(r.children[0])}=${txt(r.querySelector(".bar-row__value"))}@${r.querySelector(".bar-row__fill").style.getPropertyValue("--w")}`);
const logRows = () => [...d.querySelectorAll("#daily-log tbody tr")].map((tr) => [...tr.children].map((td) => txt(td)));
const logRow = (label) => logRows().find((r) => r[0] === label);
const actionOf = (label) => [...d.querySelectorAll("#daily-log tbody tr")].find((tr) => txt(tr.children[0]) === label)?.querySelector(".table__actions");
const pager = () => txt(d.querySelector("#daily-log .pagination > span")) ?? "(no pager)";
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${t.className.replace("toast toast--", "")}:${t.querySelector(".toast__text").innerHTML.trim()}`);
const clearToasts = () => d.querySelectorAll(".toast").forEach((t) => t.remove());
const modalOpen = () => $("regularize-modal").classList.contains("is-open");
const errors = () => [...d.querySelectorAll("#regularize-modal .form-error")].map((e) => { const input = e.closest(".form-field").querySelector("input, select, textarea"); return `${input.id}:${e.textContent}${input.getAttribute("aria-describedby") === e.id ? "" : "(unlinked)"}`; });
const setField = (id, value) => { const i = $(id); i.value = value; i.dispatchEvent(new w.Event("input", { bubbles: true })); };
const submit = () => d.querySelector("#regularize-modal form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const chooseMonth = (value) => { const s = $("month-select"); s.value = value; s.dispatchEvent(new w.Event("change", { bubbles: true })); };
// ---- readers: my-requests ----
const reqRows = () => [...d.querySelectorAll(".table tbody tr")].map((tr) => [...tr.children].map((td) => txt(td)));
const pillCounts = () => [...d.querySelectorAll(".table__toolbar .tabs__tab")].map((p) => `${txt(p.childNodes[0])}=${txt(p.querySelector(".badge--count"))}`).join(" ");
const progress = () => { const c = $("request-progress"); return c.hidden ? "hidden" : `${txt(c.querySelector(".card__title"))} | ${[...c.querySelectorAll(".stepper__step")].map((s) => `${s.className.replace("stepper__step", "").trim() || "-"}:${txt(s.querySelector("strong"))} (${txt(s.querySelector("small"))})`).join(" > ")}`; };
const pill = (label) => [...d.querySelectorAll(".table__toolbar .tabs__tab")].find((p) => txt(p.childNodes[0]) === label).click();
const typeFilter = (label) => { const s = d.querySelector('.table__toolbar select[aria-label="Filter by type"]'); s.value = [...s.options].find((o) => o.textContent === label).value; s.dispatchEvent(new w.Event("change", { bubbles: true })); };

// =====================================================================
section("Arjun, September (seeded), Mon 28 Sep 10:00");
fresh(); await open("my-attendance", "arjun");
const sep = A.monthFor("EMP-1105", 2026, 9);
check("M1", "month select: this month and the 3 before, current selected", j([...$("month-select").options].map((o) => `${o.value}=${o.textContent}`)) === j(["2026-09=September 2026", "2026-08=August 2026", "2026-07=July 2026", "2026-06=June 2026"]) && $("month-select").value === "2026-09");
check("M2", "stat strip from monthFor(): 19 / 19 days, 2 left; 1 late mark, 2 more before a half day; average hours; 1 correction (approved 25 Sep)",
  j(statsRead()) === j(["Days present: 19 / 19 (2 working days left)", "Late marks: 1 (2 more before a half day)", `Average hours: ${Math.floor(sep.averageMinutes / 60)}h ${String(sep.averageMinutes % 60).padStart(2, "0")}m (Target is 8h)`, "Correction requests: 1 (Latest: approved on 25 Sep)"]),
  statsRead().join(" | "));
check("M3", "calendar title and 30 day cells, Monday first: 1 Sep (a Tuesday) after 1 empty cell, 4 empty at the end", txt($("attendance-calendar").querySelector(".card__title")) === "September 2026" && dayCells().length === 30
  && cells()[0].classList.contains("calendar__day--empty") && cells()[1] === cell(1) && cells().length === 35);
check("M4", "cells: on time, late (22), regularized day on time (24), weekends, today not in yet (28, with today ring), future (29, 30)",
  look(21) === "present:On time" && look(22) === "late:Late" && look(24) === "present:On time" && look(26) === "weekend" && look(27) === "weekend" && look(28) === "future+today:Not in yet" && look(29) === "future" && look(30) === "future",
  [21, 22, 24, 26, 28, 29].map(look).join(" | "));
const cls = (k) => dayCells().filter((c) => c.classList.contains(`calendar__day--${k}`)).length;
check("M5", "calendar cells match monthFor() counts (present 18, late 1, weekend 8, 3 not yet)", cls("present") === sep.counts.present && cls("late") === sep.counts.late + sep.counts.halfDay && cls("weekend") === sep.counts.weekend && cls("future") === sep.counts.notYet + sep.counts.noData,
  `present ${cls("present")}, late ${cls("late")}, weekend ${cls("weekend")}, future ${cls("future")}`);
check("M6", "month summary: 19 working days so far; On time 18 (95%), Late 1 (5%), On leave 0, Absent 0", txt($("month-summary").querySelector(".card__meta")) === "19 working days so far"
  && j(summaryRows()) === j(["On time=18@95%", "Late=1@5%", "On leave=0@0%", "Absent=0@0%"]), summaryRows().join(" "));
check("M7", "late-mark alert: real text, half days taken from pay", !$("late-alert").hidden && txt($("late-alert")) === "You have 1 late mark this month. Every 3rd late mark counts as half a day. 2 more would count as half a day. Each half day is taken from your pay, not your leave balance, when payroll is processed.",
  txt($("late-alert")));
check("M8", "daily log: 20 working days so far (today included), newest first, 10 a page", txt($("daily-log").querySelector(".card__meta")) === "September, 20 working days so far" && logRows().length === 10
  && logRows()[0][0] === "Mon, 28 Sep" && logRows()[9][0] === "Tue, 15 Sep" && pager() === "Showing 1 to 10 of 20", `${logRows().map((r) => r[0]).join(", ")} | ${pager()}`);
check("M9", "rows: 22 Sep late 10:05–18:20 8h 15m with Request fix; 24 Sep 09:30 Regularized; today (10:00, past 09:45) Overdue with no action",
  j(logRow("Tue, 22 Sep")) === j(["Tue, 22 Sep", "10:05", "18:20", "8h 15m", "Late", "Request fix"]) && j(logRow("Thu, 24 Sep")) === j(["Thu, 24 Sep", "09:30", "18:30", "9h 00m", "Present", "Regularized"])
  && j(logRow("Mon, 28 Sep")) === j(["Mon, 28 Sep", "–", "–", "–", "Overdue", ""]), `${logRow("Tue, 22 Sep")} || ${logRow("Thu, 24 Sep")}`);
check("M10", "only days that can be corrected get a button (here just 22 Sep)", [...d.querySelectorAll("#daily-log tbody button")].map((b) => b.closest("tr").children[0].textContent).join() === "Tue, 22 Sep");
[...d.querySelectorAll("#daily-log .pagination button")].find((b) => b.textContent === "2").click();
check("M11", "page 2: 14 Sep back to 1 Sep", logRows().length === 10 && logRows()[0][0] === "Mon, 14 Sep" && logRows()[9][0] === "Tue, 1 Sep" && pager() === "Showing 11 to 20 of 20", pager());
check("M12", "old sample rows and the static 'Request fix' are gone", !/Thu, 10 Sep \/ 10:05/.test(logRows().map((r) => r.join(" / ")).join()) && !d.querySelector('#daily-log button[data-modal]'));

// Other months: weekday alignment and no-data.
const alignOk = (y, m) => {
  const lead = cells().findIndex((c) => !c.classList.contains("calendar__day--empty"));
  const days = new RealDate(Date.UTC(y, m, 0)).getUTCDate();
  return dayCells().length === days && dayCells().every((c, i) => {
    const weekdayMon0 = (new RealDate(Date.UTC(y, m - 1, i + 1)).getUTCDay() + 6) % 7;
    return (lead + i) % 7 === weekdayMon0 && Number(txt(c.querySelector(".calendar__date"))) === i + 1;
  }) && cells().length % 7 === 0;
};
const aligned = [];
for (const [value, y, m] of [["2026-08", 2026, 8], ["2026-07", 2026, 7], ["2026-06", 2026, 6], ["2026-09", 2026, 9]]) { chooseMonth(value); aligned.push(`${value}:${alignOk(y, m)}:${cells().findIndex((c) => !c.classList.contains("calendar__day--empty"))}`); }
check("M13", "every day sits under its real weekday for Aug (starts Sat), Jul (Wed), Jun (Mon) and Sep (Tue)", aligned.every((a) => a.includes(":true:")) && aligned.join(" ") === "2026-08:true:5 2026-07:true:2 2026-06:true:0 2026-09:true:1", aligned.join(" "));
chooseMonth("2026-08");
check("M14", "August (before any records): no-data cells, holiday still shown (Independence Day, a Saturday), stats say nothing recorded",
  look(3) === "future:No data" && look(15) === "holiday:Independence Day" && look(16) === "weekend"
  && j(statsRead()) === j(["Days present: – (No attendance recorded)", "Late marks: 0 (3 more before a half day)", "Average hours: – (Target is 8h)", "Correction requests: 0 (None this month)"]), `${look(3)} | ${statsRead().join(" | ")}`);
check("M15", "August: log empty state, no pager, late alert hidden, 0 working days so far", j(logRows()) === j([["No attendance recorded for this month."]]) && pager() === "(no pager)" && $("late-alert").hidden && txt($("month-summary").querySelector(".card__meta")) === "0 working days so far");
chooseMonth("2026-09");
check("M16", "switching back returns to page 1", logRows()[0][0] === "Mon, 28 Sep" && pager() === "Showing 1 to 10 of 20");

// =====================================================================
section("the request modal (Arjun)");
actionOf("Tue, 22 Sep").querySelector("button").click();
check("R1", "Request fix opens the modal with the date and issue filled in, sent-to from managerFor, time focused",
  modalOpen() && $("reg-date").value === "2026-09-22" && $("reg-issue").value === "late-arrival" && $("reg-time").value === "" && $("reg-manager").value === "Sneha Rao first, then HR or an Admin" /* Round 8C wording */ && d.activeElement === $("reg-time"),
  `${$("reg-date").value} ${$("reg-issue").value} | ${$("reg-manager").value}`);
check("R2", "date limited to the 7-day window (min 21 Sep, max today)", $("reg-date").min === "2026-09-21" && $("reg-date").max === "2026-09-28");
submit();
check("R3", "no time: inline error on the time field, modal stays open, nothing saved", j(errors()) === j(["reg-time:Enter the correct time as HH:MM."]) && modalOpen() && A.regularizationsFor("EMP-1105").length === 1, errors().join());
setField("reg-time", "10:10");
check("R4", "typing clears the error", errors().length === 0);
setField("reg-reason", "Traffic");
submit();
check("R5", "a time not earlier than the check-in: error on time", j(errors()) === j(["reg-time:The corrected time must be earlier than the recorded check-in (10:05)."]), errors().join());
setField("reg-time", "09:40"); setField("reg-reason", "   ");
submit();
check("R6", "blank reason: error on reason", j(errors()) === j(["reg-reason:Reason is required."]) && d.activeElement === $("reg-reason"), errors().join());
setField("reg-reason", "<b>Metro</b> was down");
clearToasts(); submit();
const sent = A.regularizationsFor("EMP-1105").find((r) => r.status === "pending");
check("R7", "valid: saved (pending, 09:40), modal closed, fixed-text toast (typed text never echoed)", sent && sent.time === "09:40" && sent.reason === "<b>Metro</b> was down" && !modalOpen() && j(toasts()) === j(["success:Correction request sent."]), j(toasts()));
check("R8", "re-rendered without a reload: 22 Sep shows Pending + Cancel; correction stat 2, latest pending since 28 Sep",
  j(logRow("Tue, 22 Sep")) === j(["Tue, 22 Sep", "10:05", "18:20", "8h 15m", "Late", "PendingCancel"]) && statsRead()[3] === "Correction requests: 2 (Latest: pending since 28 Sep)", `${logRow("Tue, 22 Sep")} | ${statsRead()[3]}`);
$("request-btn").click();
check("R9", "header button opens the modal empty (earlier values cleared)", modalOpen() && $("reg-date").value === "" && $("reg-issue").value === "" && $("reg-time").value === "" && $("reg-reason").value === "" && errors().length === 0);
submit();
check("R10", "empty form: the first problem (what went wrong) shown inline", j(errors()) === j(["reg-issue:Choose what went wrong."]), errors().join());
setField("reg-issue", "missed-check-in"); setField("reg-date", "2026-09-18"); setField("reg-time", "09:20"); setField("reg-reason", "x");
submit();
check("R11", "outside the 7-day window: error on the date", j(errors()) === j(["reg-date:Corrections must be asked for within 7 days of the date."]), errors().join());
setField("reg-date", "2026-09-22"); setField("reg-issue", "late-arrival"); setField("reg-time", "09:35");
submit();
check("R12", "a second request for a date with one pending: error on the date", j(errors()) === j(["reg-date:You already have a correction waiting for that date."]), errors().join());
setField("reg-date", "2026-09-27");
submit();
check("R13", "a weekend: error on the date", j(errors()) === j(["reg-date:No attendance is needed on that day."]), errors().join());
d.querySelector("#regularize-modal [data-modal-close]").click();
check("R14", "Cancel closes the modal; nothing saved", !modalOpen() && A.regularizationsFor("EMP-1105").length === 2);
check("R15", "the Send request placeholder marker is gone", !d.querySelector("#regularize-modal [data-not-implemented]"));

// Cancel from my-attendance.
confirmAnswer = false; actionOf("Tue, 22 Sep").querySelector("button").click();
check("C1", "Cancel asks first; No keeps it", confirms.at(-1) === "Cancel your correction request for 22 Sep?" && A.regularizationsFor("EMP-1105").some((r) => r.status === "pending"));
confirmAnswer = true; clearToasts(); actionOf("Tue, 22 Sep").querySelector("button").click();
check("C2", "Yes: cancelled, fixed toast, the row offers Request fix again, stat shows the cancel", !A.regularizationsFor("EMP-1105").some((r) => r.status === "pending") && j(toasts()) === j(["success:Correction request cancelled."])
  && logRow("Tue, 22 Sep")[5] === "Request fix" && statsRead()[3] === "Correction requests: 2 (Latest: cancelled on 28 Sep)", `${logRow("Tue, 22 Sep")} | ${statsRead()[3]}`);

// =====================================================================
section("my-requests (Arjun)");
actionOf("Tue, 22 Sep").querySelector("button").click();
setField("reg-time", "09:45"); setField("reg-reason", "Metro was down");
submit();
await open("my-requests", "arjun");
const arjunReqs = reqRows();
const corrRows = () => reqRows().filter((r) => r[1] === "Attendance").map((r) => `${r[0]}|${r[2]}|${r[3]}|${r[4]}|${r[5]}`).join(" ; ");
check("Q1", "attendance rows from the store, newest first: the new pending one (with Sneha, Cancel), the cancelled one, RG-101 (approved by Priya); the static sample row is gone",
  corrRows() === "Regularization, 22 Sep|28 Sep|Sneha Rao|Pending|Cancel ; Regularization, 22 Sep|28 Sep|—|Cancelled| ; Regularization, 24 Sep|24 Sep|Priya Nair|Approved|" && !reqRows().some((r) => r[0] === "Regularization, 17 Sep"),
  corrRows());
// Round 5D: Arjun's two real expense claims replace the static expense row (one more row, one more pending).
check("Q2", "tab counts include corrections: All 11, Pending 4 (leave + correction + expense claim + static asset), Approved 4, Rejected 2", pillCounts() === "All=11 Pending=4 Approved=4 Rejected=2", pillCounts());
check("Q3", "the stepper follows the newest pending request of any kind: the correction sent today, waiting for Sneha", progress() === "Regularization, 22 Sep | is-done:Sent (28 Sep by you) > is-current:First approval (Waiting for Sneha Rao) > -:Final approval (HR or an Admin)" /* Round 8C wording */, progress());
typeFilter("Attendance");
check("Q4", "type filter Attendance: only the 3 correction rows", reqRows().length === 3 && reqRows().every((r) => r[1] === "Attendance") && txt(d.querySelector(".card__footer .card__meta")) === "Showing 3 of 11 requests");
pill("Pending");
check("Q5", "Attendance + Pending: just the new one", reqRows().length === 1 && reqRows()[0][4] === "Pending");
confirmAnswer = true; clearToasts();
d.querySelector(".table tbody tr .btn--danger").click();
check("Q6", "Cancel from my-requests: cancelled, fixed toast, row now Cancelled under All", confirms.at(-1) === "Cancel your correction request for 22 Sep?" && j(toasts()) === j(["success:Correction request cancelled."]) && !A.regularizationsFor("EMP-1105").some((r) => r.status === "pending")
  && j(reqRows()) === j([["No requests match these filters."]]), j(toasts()));
// Round 5D: the newest pending request of any kind is now his expense claim (sent 25 Sep), not the leave of 18 Sep.
check("Q7", "the stepper falls back to the newest pending request left: his expense claim (EXP-3106, sent 25 Sep)", progress().startsWith("Expense: Travel, ₹1,850 | is-done:Sent (25 Sep by you) > is-current:Manager approval (Waiting for Sneha Rao)"), progress());
await open("my-requests", "rohan");
const rg105 = reqRows().find((r) => r[1] === "Attendance");
check("Q8", "Rohan: his rejected correction shows who decided and the note", j(rg105) === j(["Regularization, 15 Sep", "Attendance", "16 Sep", "Priya Nair", "Rejected", "Traffic delays aren't corrected; the late mark stays."]), j(rg105));
await open("my-requests", "vikram");
check("Q9", "Vikram: his pending correction is with HR (no manager), with Cancel; stepper shows it", reqRows().some((r) => r.join("|") === "Regularization, 23 Sep|Attendance|24 Sep|HR|Pending|Cancel") && progress().startsWith("Regularization, 23 Sep | is-done:Sent (24 Sep by you) > is-current:Approval (Waiting for HR)"), progress());

// =====================================================================
section("Vikram, Meera, Ananya, Rohan (other days), Admin");
fresh(); await open("my-attendance", "vikram");
check("V1", "Vikram: 23 Sep late with a pending request -> Pending + Cancel; 17 Sep late but outside the window -> no button; 11 Sep absent (old) -> no button",
  logRow("Wed, 23 Sep")[5] === "PendingCancel" && logRow("Thu, 17 Sep")[4] === "Late" && logRow("Thu, 17 Sep")[5] === "" && statsRead()[1] === "Late marks: 2 (1 more before a half day)", `${logRow("Wed, 23 Sep")} | ${logRow("Thu, 17 Sep")} | ${statsRead()[1]}`);
[...d.querySelectorAll("#daily-log .pagination button")].find((b) => b.textContent === "2").click();
check("V2", "Vikram 11 Sep: Absent, no hours, no button (outside the window); calendar shows it absent", j(logRow("Fri, 11 Sep")) === j(["Fri, 11 Sep", "–", "–", "–", "Absent", ""]) && look(11) === "absent:Absent");
await open("my-attendance", "meera");
const meeraSep = A.monthFor("EMP-1023", 2026, 9);
check("L1", "Meera: leave days are 'On leave' cells (21–25, 28–30) and log rows; summary counts match monthFor()",
  [21, 22, 23, 24, 25].every((n) => look(n) === "leave:On leave") && look(28) === "leave+today:On leave" && look(29) === "leave:On leave" && logRow("Mon, 28 Sep")[4] === "On leave"
  && summaryRows().includes(`On leave=${meeraSep.counts.onLeave - 2}@${Math.round(((meeraSep.counts.onLeave - 2) / 20) * 100)}%`) && txt($("month-summary").querySelector(".card__meta")) === "20 working days so far",
  `${look(28)} | ${summaryRows().join(" ")}`);
check("L2", "Meera: 14 days worked of 20 so far; no late marks -> alert hidden", statsRead()[0] === "Days present: 14 / 20 (2 working days left)" && $("late-alert").hidden, statsRead()[0]);
await open("my-attendance", "ananya");
check("N1", "Ananya: half day (14 Sep) is a late-coloured 'Half day' cell and a 'Half day' bar; today's check-in in progress; 18 Sep no check-out with a pending request",
  look(14) === "late:Half day" && summaryRows().some((r) => r.startsWith("Half day=1@")) && look(28) === "present+today:On time" && look(18) === "present:No check-out" && logRow("Fri, 18 Sep")[2] === "Not recorded" && logRow("Fri, 18 Sep")[5] === "PendingCancel",
  `${look(14)} | ${look(18)} | ${logRow("Fri, 18 Sep")}`);
setNow(2026, 9, 29, 10, 0); await open("my-attendance", "rohan");
check("N2", "Rohan's 28 Sep (the seed day's in-progress record, seen on the 29th) now has its check-out, so no fix is offered (Round 8B: the seed day is completed; was 'Not recorded' with Request fix)",
  /^\d\d:\d\d$/.test(logRow("Mon, 28 Sep")[2]) && logRow("Mon, 28 Sep")[5] === "", j(logRow("Mon, 28 Sep")));
setNow(2026, 9, 28, 19, 0); await open("my-attendance", "arjun");
check("N4", "after the shift with no check-in, today is absent and offers Request fix (missed check-in)", logRow("Mon, 28 Sep")[4] === "Absent" && logRow("Mon, 28 Sep")[5] === "Request fix" && look(28) === "absent+today:Absent");
actionOf("Mon, 28 Sep").querySelector("button").click();
check("N5", "…as a missed check-in", $("reg-issue").value === "missed-check-in");
// Round 8B: a real missing check-out (was N2 / N3 on the seed's record). Arjun checks in on time at 09:20 on Tue 29 Sep
// and never out; seen on the 30th.
setNow(2026, 9, 29, 9, 20); A.checkIn("EMP-1105", "office");
setNow(2026, 9, 30, 10, 0); await open("my-attendance", "arjun");
check("N2b", "a real missing check-out inside the window (Arjun's own 29 Sep punch, seen on the 30th) offers Request fix for a missed check-out",
  logRow("Tue, 29 Sep")[1] === "09:20" && logRow("Tue, 29 Sep")[2] === "Not recorded" && logRow("Tue, 29 Sep")[5] === "Request fix", j(logRow("Tue, 29 Sep")));
actionOf("Tue, 29 Sep")?.querySelector("button")?.click();
check("N3", "…and the modal opens as missed check-out; Arjun's first step is Sneha", $("reg-issue").value === "missed-check-out" && $("reg-date").value === "2026-09-29" && $("reg-manager").value === "Sneha Rao first, then HR or an Admin" /* Round 8C wording */,
  j([$("reg-issue").value, $("reg-date").value, $("reg-manager").value]));
fresh(); setNow(2026, 9, 29, 10, 10); await open("my-attendance", "aarav"); A.checkIn("EMP-1001", "office");
setNow(2026, 9, 29, 11, 0); await open("my-attendance", "aarav");
$("request-btn").click();
check("N6", "Admin: the modal says his own request is approved straight away", $("reg-manager").value === "Approved straight away (Admin)");
setField("reg-date", "2026-09-29"); setField("reg-issue", "late-arrival"); setField("reg-time", "09:35"); setField("reg-reason", "Stuck in a meeting call");
clearToasts(); submit();
check("N7", "Admin submit: 'Correction applied.', today's row now 09:35 and Regularized", j(toasts()) === j(["success:Correction applied."]) && j(logRow("Tue, 29 Sep").slice(0, 2)) === j(["Tue, 29 Sep", "09:35"]) && logRow("Tue, 29 Sep")[5] === "Regularized", j(logRow("Tue, 29 Sep")));
H.addHoliday(HOL_ACTOR, { date: "2026-09-30", name: "<i>Office</i> day", kind: "company" });
await open("my-attendance", "aarav");
check("N8", "a holiday name with markup shows as text in its calendar cell", look(30) === "holiday:<i>Office</i> day" && !d.querySelector("#attendance-calendar i"));

// =====================================================================
section("old session, safety");
fresh(); await open("my-attendance", "old");
check("O1", "old session: the static page stays (static stats, calendar, 7 sample rows, static month list)", statsRead()[0] === "Days present: 14 / 22 (8 working days left)" && logRows().length === 7 && [...$("month-select").options].length === 3 && look(20) === "weekend+today");
d.querySelector('#daily-log button[data-modal="regularize-modal"]').click();
setField("reg-reason", "Typed before sending"); clearToasts();
const navBefore = navigations.length;
let prevented = null;
d.querySelector("#regularize-modal form").addEventListener("submit", (e) => { prevented = e.defaultPrevented; });   // runs after the page's handler
d.querySelector("#regularize-modal form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));   // Round Demo buttons part 1: a submit event, not a click (jsdom has no requestSubmit, and no page handler stops it now)
check("O1b", "old session (signed out by the guard, the login page opening): nothing on the page handles Send request any more: not prevented, no toast (Round Demo buttons part 1, behaviour; was prevented, with 'Send request isn't available in this demo.'); the typed text and the open modal stay",
  prevented === false && navigations.length === navBefore && toasts().length === 0 && $("reg-reason").value === "Typed before sending" && modalOpen(),
  `prevented=${prevented}; navigations ${navigations.length - navBefore}; ${j(toasts())}`);
await open("my-requests", "old");
check("O2", "old session my-requests: static rows incl. the sample attendance row stay", reqRows().some((r) => r[0] === "Regularization, 17 Sep"));
check("O3", "the page scripts never use innerHTML / outerHTML / insertAdjacentHTML", SOURCES.every((s) => !/innerHTML|outerHTML|insertAdjacentHTML/.test(s)));
check("O4", "every toast in my-attendance.js is fixed text", [...SOURCES[0].matchAll(/showToast\(([^;]*)\);/g)].every((m) => /^(result\.record\.status === "approved" \? "Correction applied\." : "Correction request sent\.", "success"|"[^"`$]+", "(success|danger|info)")$/.test(m[1])),
  [...SOURCES[0].matchAll(/showToast\(([^;]*)\);/g)].map((m) => m[1]).join(" || "));
fresh(); await open("my-attendance", "arjun");
check("O5", "only the signed-in person's data: none of Sneha's or Rohan's times appear, and the numbers equal monthFor(Arjun)", !/09:20|09:12/.test(d.querySelector("#daily-log tbody").textContent) && statsRead()[1] === `Late marks: ${A.monthFor("EMP-1105", 2026, 9).lateMarks} (2 more before a half day)`);
// Round 9J (behaviour; was "Ask HR to correct it from"): a correction goes to the manager first, then HR or an Admin
check("O6", "mark-attendance alert reworded (Round 9J: 'Ask for a correction from', was 'Ask HR to correct it from')", /Ask for a correction from <a class="link" href="my-attendance.html">My attendance<\/a>\./.test(fs.readFileSync(`${DIR}/attendance/mark-attendance.html`, "utf8")));
check("O7", "no JS errors across all page loads", jsErrors.length === 0, jsErrors.join(" / ") || `none (${loads} loads)`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
