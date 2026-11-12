// usage: node reg.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 3D: regularization.html, the correction rows in approvals-inbox.html, and the effect of a
// decision on my-attendance.html, with the js in ./js, in jsdom. localStorage carries over between
// page loads. The clock is pinned to Mon 28 Sep 2026 10:00 local; setTimeout is captured.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("./pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const PAGES = {
  reg: ["attendance/regularization.html", "regularization"],
  inbox: ["requests/approvals-inbox.html", "approvals-inbox"],
  myatt: ["attendance/my-attendance.html", "my-attendance"],
};

const RealDate = Date;
const NOW = new RealDate(2026, 8, 28, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
let lastBlob = null;
URL.createObjectURL = (blob) => { lastBlob = blob; return "blob:test"; };
URL.revokeObjectURL = () => {};

const WHO = {
  priya: ["hr", "Priya Nair", "EMP-1003"], aarav: ["admin", "Aarav Mehta", "EMP-1001"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"],
  kabir: ["fin", "Kabir Shah", "EMP-1008"], old: ["hr", "Priya Nair", undefined],
};

let loads = 0, w = null, d = null, saved = {}, navigations = [];
const jsErrors = [], confirms = [];
let confirmAnswer = true;
async function open(page, who) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const [path, script] = PAGES[page];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(`${page}/${who}`); else jsErrors.push(`${page}/${who}: ${e.message}`); });
  const dom = new JSDOM(read(path), { url: `http://localhost/office-os/pages/${path}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.confirm = (m) => { confirms.push(m); return confirmAnswer; };
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  navigations = [];
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`${page} import: ${e.message}`); }
}

const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const L = await import("./js/data/leave-store.js");
const A = await import("./js/data/attendance-store.js");
console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const fresh = () => { if (w) w.localStorage.clear(); saved = {}; };

// ---- readers ----
function parts(node) {
  const out = [];
  const walker = node.ownerDocument.createTreeWalker(node, 4);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (t.parentElement.closest(".avatar")) continue;
    const v = t.textContent.replace(/\s+/g, " ").trim();
    if (v) out.push(v);
  }
  return out.join(" ");
}
const rowsOf = (tbody) => [...tbody.querySelectorAll("tr")].map((tr) => [...tr.children].filter((td) => !td.hidden).map((td) => parts(td)));
const regBody = () => d.querySelector("table[data-export-name] tbody");
const regRows = () => rowsOf(regBody());
// Round 8C: the requester's name cell first, then any text (a row with a manager now says "Waiting for <manager>").
const regRowFor = (text) => { const rows = [...regBody().querySelectorAll("tr")]; return rows.find((tr) => (txt(tr.querySelector(".table__user-name")) ?? "").includes(text)) ?? rows.find((tr) => txt(tr).includes(text)); };
const pill = (label) => [...d.querySelectorAll(".table__toolbar .tabs__tab")].find((p) => txt(p.childNodes[0]) === label);
const pills = () => [...d.querySelectorAll(".table__toolbar .tabs__tab")].map((p) => `${txt(p.childNodes[0])}=${txt(p.querySelector(".badge"))}`).join(" ");
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => ({ type: t.className.replace("toast toast--", ""), text: txt(t.querySelector(".toast__text")), html: t.querySelector(".toast__text").innerHTML.trim() }));
const toastTexts = () => j(toasts().map((t) => t.text));
const clearToasts = () => d.querySelectorAll(".toast").forEach((t) => t.remove());
const button = (row, label) => [...row.querySelectorAll("button")].find((b) => b.textContent.trim() === label);
const cmodal = () => d.getElementById("reject-correction-modal");
const noteError = () => { const e = cmodal()?.querySelector(".form-error"); return e ? { text: e.textContent, linked: d.getElementById("reject-correction-note").getAttribute("aria-describedby") === e.id } : null; };
const rejectWith = (note) => { const n = d.getElementById("reject-correction-note"); n.value = note; n.dispatchEvent(new w.Event("input", { bubbles: true })); cmodal().querySelector('button[type="submit"]').click(); };
const pager = () => txt(d.querySelector(".pagination > span")) ?? "(no pager)";
const search = (q) => { const i = d.querySelector(".table__toolbar .input--search"); i.value = q; i.dispatchEvent(new w.Event("input", { bubbles: true })); };
const sameMain = (html) => d.querySelector("main").innerHTML.replaceAll(' hidden=""', "") === new JSDOM(html).window.document.querySelector("main").innerHTML;
// Round 8C: the page's Pending is every request still waiting but the viewer's own, at either stage (was: pendingRegularizations, only what they may decide)
const storeCounts = (userId, role) => `Pending=${A.allRegularizations().filter((r) => r.status === "pending" && r.userId !== userId).length} Approved=${A.allRegularizations().filter((r) => r.status === "approved").length} Rejected=${A.allRegularizations().filter((r) => r.status === "rejected").length}`;
const req = (id) => A.getRegularization(id);
const lastRg = () => A.allRegularizations().sort((a, b) => Number(b.id.slice(3)) - Number(a.id.slice(3)))[0];
async function csvRows() {
  lastBlob = null;
  d.querySelector("[data-export]").click();
  const text = new TextDecoder("utf-8").decode(new Uint8Array(await lastBlob.arrayBuffer())).replace(/^﻿/, "");
  return text.split("\r\n");
}
// The visible data cells of the table, joined the way csv-export.js joins them (Actions left out).
const visibleCsv = () => [...regBody().querySelectorAll("tr")].filter((tr) => !tr.hidden && tr.children.length === 7)
  .map((tr) => [...tr.children].slice(0, 6).map((td) => { const v = parts(td); return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }).join(","));
// my-attendance readers
const dayCells = () => [...d.querySelectorAll("#attendance-calendar .calendar__grid .calendar__day")].filter((c) => !c.classList.contains("calendar__day--empty"));
const look = (n) => { const c = dayCells()[n - 1]; return `${[...c.classList].filter((k) => k !== "calendar__day").map((k) => k.replace("calendar__day--", "")).join("+")}${c.querySelector(".calendar__tag") ? `:${txt(c.querySelector(".calendar__tag"))}` : ""}`; };
const lateStat = () => { const s = [...d.querySelectorAll("#month-stats .stat")].find((x) => txt(x.querySelector(".stat__label")) === "Late marks"); return `${txt(s.querySelector(".stat__value"))} (${txt(s.querySelector(".stat__delta"))})`; };
const logRow = (label) => [...d.querySelectorAll("#daily-log tbody tr")].map((tr) => [...tr.children].map((td) => txt(td))).find((r) => r[0] === label);

// =====================================================================
section("Priya (HR), seeded data, Mon 28 Sep 10:00");
await open("reg", "priya"); fresh(); await open("reg", "priya");
console.log("       Priya pending: " + regRows().map((r) => r.join(" / ")).join("  ||  "));
check("R1", "tab counts are real and equal the store (Pending 3, Approved 1, Rejected 1); the static 4 / 18 / 2 are gone", pills() === "Pending=3 Approved=1 Rejected=1" && pills() === storeCounts("EMP-1003", "hr"), pills());
check("R2", "Pending rows, oldest sent first: Ananya (missed check-out), Sneha, Vikram (late arrivals)",
  j(regRows()) === j([
    ["Ananya Iyer Sales", "18 Sep", "Missed check-out", "– 18:00", "Forgot to check out before leaving", "Pending", "Reject Approve"],
    ["Sneha Rao Engineering", "21 Sep", "Late arrival", "10:02 09:30", "Client call from home before commuting", "Pending", "Reject Approve"],
    ["Vikram Singh Operations", "23 Sep", "Late arrival", "10:24 09:30", "Bus breakdown, informed the manager by phone", "Pending", "Reject Approve"],
  ]), regRows().map((r) => r.join(" / ")).join(" || "));
const firstRow = regBody().querySelector("tr");
check("R3", "employee cell: initials avatar (users-list colour), name, department; times: recorded, arrow icon, requested in <strong>",
  firstRow.querySelector(".avatar").className === "avatar avatar--4" && txt(firstRow.querySelector(".avatar")) === "AI"
  && txt(firstRow.querySelector(".table__user-name")) === "Ananya Iyer" && txt(firstRow.querySelector(".table__user-sub")) === "Sales"
  && txt(regRowFor("Vikram").querySelector(".reg-times__old")) === "10:24" && txt(regRowFor("Vikram").querySelector(".reg-times strong")) === "09:30" && !!regRowFor("Vikram").querySelector(".reg-times svg[aria-hidden='true']")
  && txt(regRowFor("Vikram").querySelector(".badge")) === "Pending" && regRowFor("Vikram").querySelector(".badge").className === "badge badge--warning badge--dot",
  `${firstRow.querySelector(".avatar").className} ${txt(firstRow.querySelector(".avatar"))}`);
check("R4", "static sample rows (Divya, Ishita, 14 Sep) and the fake footer are gone; 3 rows need no pager",
  !/Divya Menon|Ishita Bose|check-in page was down/.test(regBody().textContent) && !/Showing 5 of 24/.test(d.body.textContent) && d.querySelector(".pagination").classList.contains("is-empty") && pager() === "(no pager)");
check("R5", "Pending buttons are real (no placeholder marker), permission-tagged attendance:approve, visible to HR; Actions header shown",
  [...regBody().querySelectorAll("button")].every((b) => !b.dataset.notImplemented && b.dataset.permission === "attendance:approve" && !b.hidden) && regBody().querySelectorAll("button").length === 6
  && !d.querySelector("thead th.table__actions").hidden);
pill("Approved").click();
check("R6", "Approved tab: RG-101 (Arjun, 24 Sep, 10:12 to 09:30, recorded time as sent); no Actions column",
  j(regRows()) === j([["Arjun Kapoor Engineering", "24 Sep", "Late arrival", "10:12 09:30", "Client call ran over before I left home; Sneha knew in the morning", "Approved"]])
  && d.querySelector("thead th.table__actions").hidden && regBody().querySelectorAll("button").length === 0, regRows().map((r) => r.join(" / ")).join(" || "));
pill("Rejected").click();
const rg105Day = Number(req("RG-105").date.slice(8));
check("R7", `Rejected tab: RG-105 (Rohan, ${rg105Day} Sep, 09:58 to 09:30), danger badge`, regRows().length === 1 && regRows()[0].slice(0, 6).join(" / ") === `Rohan Gupta Engineering / ${rg105Day} Sep / Late arrival / 09:58 09:30 / Heavy traffic on the expressway / Rejected`
  && regBody().querySelector(".badge").className === "badge badge--danger badge--dot", regRows()[0]?.join(" / "));
check("R8", "no JS errors so far", jsErrors.length === 0, jsErrors.join(" | "));

// ---------- policy card and alert ----------
const kv = [...d.querySelectorAll(".kv__row")].map((r) => `${txt(r.querySelector("dt"))}: ${txt(r.querySelector("dd"))}`);
check("P1", "policy lines match the rules: window 7 days, every 3rd late mark = half day taken from pay, first step shown only, HR or Admin decide",
  j(kv) === j([`Request window: ${A.ATTENDANCE_RULES.requestWindowDays} days after the date`, `Every ${A.ATTENDANCE_RULES.penaltyEvery}rd late mark: Counts as a half day, taken from pay when payroll is processed; leave isn't deducted`,
    "Absent, no leave or correction: A day's pay (half with half-day leave), taken once the 7-day window has closed and no correction or leave request for the day is waiting; not before" /* Round 8D (behaviour): the absence rule, beside the late-mark one */,
    "First step: Reporting manager approves; skipped with no manager on file", "Final step: HR or an Admin; the record is corrected then"] /* Round 8C: the real chain (was "shown as a step only", "at any step") */), kv.join(" | "));
check("P2", "alert reworded; no payroll-inputs or audit-log claim left", txt(d.querySelector(".alert")) === "Approving a request corrects that day's attendance record." && !/payroll inputs|audit log/i.test(d.querySelector("main").textContent));

// =====================================================================
section("own requests: Priya's goes to Aarav, Aarav's is auto-approved");
const priyaOwn = A.requestRegularization("EMP-1003", { date: "2026-09-28", issue: "missed-check-in", time: "09:25", reason: "Badge reader was offline" });
await open("reg", "priya");
check("O1", "Priya's own pending request is not in her Pending (still 3); the store agrees", priyaOwn.ok && pills() === "Pending=3 Approved=1 Rejected=1" && pills() === storeCounts("EMP-1003", "hr") && !regRowFor("Priya Nair"), pills());
check("O2", "decideRegularization refuses Priya on her own request", A.decideRegularization(priyaOwn.record.id, "EMP-1003", "hr", "approve").error === "You can't decide your own correction request.");
await open("reg", "aarav");
check("O3", "Aarav sees Priya's request in his Pending (4)", pills() === "Pending=4 Approved=1 Rejected=1" && pills() === storeCounts("EMP-1001", "admin") && regRowFor("Priya Nair")?.children[2].textContent === "Missed check-in", pills());
const aaravOwn = A.requestRegularization("EMP-1001", { date: "2026-09-28", issue: "missed-check-in", time: "09:10", reason: "Came in before the kiosk was on" });
await open("reg", "aarav");
check("O4", "Aarav's own request is auto-approved: in nobody's Pending, in Approved for both", aaravOwn.ok && req(aaravOwn.record.id).status === "approved" && pills() === "Pending=4 Approved=2 Rejected=1" && !regRowFor("Aarav Mehta"), pills());
pill("Approved").click();
const aaravApproved = regRowFor("Aarav Mehta");
await open("reg", "priya");
check("O5", "Priya: Pending 3, Approved 2 (Aarav's shown as approved, recorded '–')", pills() === "Pending=3 Approved=2 Rejected=1" && !!aaravApproved && parts(aaravApproved.children[3]) === "– 09:10", pills());
A.decideRegularization(priyaOwn.record.id, "EMP-1001", "admin", "reject", "Use the kiosk log instead");

// =====================================================================
section("Arjun asks to fix 22 Sep; Priya approves; Arjun's month changes");
await open("myatt", "arjun");
const before = { look: look(22), late: lateStat(), row: logRow("Tue, 22 Sep"), marks: A.monthFor("EMP-1105", 2026, 9).lateMarks };
check("A1", "before: 22 Sep is late (10:05) with Request fix; 1 late mark", before.look === "late:Late" && before.late === "1 (2 more before a half day)" && j(before.row) === j(["Tue, 22 Sep", "10:05", "18:20", "8h 15m", "Late", "Request fix"]) && before.marks === 1, `${before.look} | ${before.late}`);
[...d.querySelectorAll("#daily-log tbody button")].find((b) => b.closest("tr").children[0].textContent === "Tue, 22 Sep").click();
d.getElementById("reg-time").value = "09:30";
d.getElementById("reg-reason").value = "Metro stopped between stations";
d.querySelector("#regularize-modal form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const arjunReq = lastRg();
check("A2", "Arjun's request is stored as pending (late arrival, 10:05 recorded, 09:30 asked)", arjunReq.userId === "EMP-1105" && arjunReq.date === "2026-09-22" && arjunReq.status === "pending" && arjunReq.recordedTime === "10:05" && arjunReq.time === "09:30", j(arjunReq));
A.decideRegularization(arjunReq.id, "EMP-1029", "emp", "approve");   // Round 8C (setup): Sneha, his manager, first; Priya's approval below is the final one
await open("reg", "priya");
check("A3", "Priya's Pending now has Arjun's row (4 rows), oldest sent first so it comes last", pills() === "Pending=4 Approved=2 Rejected=2" && pills() === storeCounts("EMP-1003", "hr") && regRows()[3].slice(0, 5).join(" / ") === "Arjun Kapoor Engineering / 22 Sep / Late arrival / 10:05 09:30 / Metro stopped between stations", regRows()[3]?.join(" / "));
confirmAnswer = false; confirms.length = 0;
button(regRowFor("Arjun Kapoor"), "Approve").click();
check("A4", "Approve asks with confirm(); Cancel there changes nothing", confirms.length === 1 && confirms[0] === "Approve this request?\nArjun Kapoor: Late arrival, 22 Sep, corrected to 09:30" && req(arjunReq.id).status === "pending" && toasts().length === 0, confirms[0]);
confirmAnswer = true; clearToasts();
button(regRowFor("Arjun Kapoor"), "Approve").click();
const decided = req(arjunReq.id);
check("A5", "OK: approved by Priya in the store; fixed success toast; counts update without reload", decided.status === "approved" && decided.stage === "done" && decided.history.at(-1).byUserId === "EMP-1003"
  && toastTexts() === '["Correction approved. The attendance record is updated."]' && toasts()[0].type === "success" && pills() === "Pending=3 Approved=3 Rejected=2" && pills() === storeCounts("EMP-1003", "hr") && !regRowFor("Arjun Kapoor"), `${pills()} ${toastTexts()}`);
const rec = A.dayFor("EMP-1105", "2026-09-22");
check("A6", "the attendance record is corrected: check-in 09:30, original 10:05 kept, regularized, not late", rec.checkIn === "09:30" && rec.originalCheckIn === "10:05" && rec.regularized && rec.minutesLate === 0 && rec.status === "present", j({ in: rec.checkIn, orig: rec.originalCheckIn, st: rec.status }));
pill("Approved").click();
check("A7", "Approved tab: Arjun's newest decision first; recorded time shown as sent (10:05)", regRows()[0].slice(0, 6).join(" / ") === "Arjun Kapoor Engineering / 22 Sep / Late arrival / 10:05 09:30 / Metro stopped between stations / Approved", regRows()[0]?.join(" / "));
await open("myatt", "arjun");
check("A8", "Arjun's my-attendance: 22 Sep now on time and Regularized; late marks 1 -> 0; equals monthFor()",
  look(22) === "present:On time" && j(logRow("Tue, 22 Sep")) === j(["Tue, 22 Sep", "09:30", "18:20", "8h 50m", "Present", "Regularized"])
  && lateStat() === "0 (3 more before a half day)" && A.monthFor("EMP-1105", 2026, 9).lateMarks === 0 && d.getElementById("late-alert").hidden, `${look(22)} | ${logRow("Tue, 22 Sep")} | ${lateStat()}`);

// =====================================================================
section("reject needs a note");
await open("reg", "priya");
clearToasts();
button(regRowFor("Vikram Singh"), "Reject").click();
check("J1", "Reject opens the correction modal with the request described (textContent) and focus in the note",
  cmodal()?.classList.contains("is-open") && txt(cmodal().querySelector(".modal__title")) === "Reject correction request" && txt(cmodal().querySelector(".modal__desc")) === "Vikram Singh: Late arrival, 23 Sep, corrected to 09:30"
  && d.activeElement?.id === "reject-correction-note" && !d.getElementById("reject-leave-modal"));
rejectWith("   ");
check("J2", "empty note refused inline (linked with aria-describedby); still pending; modal stays open", j(noteError()) === j({ text: "Add a note saying why the request is rejected.", linked: true }) && req("RG-102").status === "pending" && cmodal().classList.contains("is-open") && toasts().length === 0, j(noteError()));
d.getElementById("reject-correction-note").value = "x"; d.getElementById("reject-correction-note").dispatchEvent(new w.Event("input", { bubbles: true }));
check("J3", "typing clears the error", noteError() === null);
cmodal().querySelector("[data-modal-close]").click();
check("J4", "Cancel closes the modal without deciding", !cmodal().classList.contains("is-open") && req("RG-102").status === "pending");
button(regRowFor("Vikram Singh"), "Reject").click();
check("J5", "reopened: note cleared", d.getElementById("reject-correction-note").value === "" && noteError() === null);
rejectWith("Bus delays are covered by the monthly allowance");
const vik = req("RG-102");
check("J6", "with a note: rejected, note stored, fixed toast, counts update, modal closed", vik.status === "rejected" && vik.history.at(-1).note === "Bus delays are covered by the monthly allowance" && vik.history.at(-1).byUserId === "EMP-1003"
  && toastTexts() === '["Correction request rejected."]' && pills() === "Pending=2 Approved=3 Rejected=3" && pills() === storeCounts("EMP-1003", "hr") && !cmodal().classList.contains("is-open"), `${pills()} ${toastTexts()}`);
check("J7", "Vikram's 23 Sep stays late (record untouched)", A.dayFor("EMP-1088", "2026-09-23").checkIn === "10:24" && A.dayFor("EMP-1088", "2026-09-23").status === "late");

// =====================================================================
section("stale approvals are refused");
await open("reg", "priya");
const snehaRow = regRowFor("Sneha Rao");
A.decideRegularization("RG-103", "EMP-1001", "admin", "approve");   // Aarav, in another tab, after Priya's page drew
clearToasts();
button(snehaRow, "Approve").click();
check("S1", "already decided elsewhere: refused with a fixed toast, only Aarav's decision stored, row drops, counts from the store",
  req("RG-103").history.filter((h) => h.decision === "approved").length === 1 && req("RG-103").history.at(-1).byUserId === "EMP-1001"
  && toastTexts() === `["Couldn't approve the request. It may already have been decided, or the attendance record has changed."]` && toasts()[0].type === "danger"
  && !regRowFor("Sneha Rao") && pills() === storeCounts("EMP-1003", "hr"), `${toastTexts()} ${pills()}`);
// Record changed under a pending request: Ananya's missed check-out of 18 Sep gets a check-out another way.
const box = JSON.parse(w.localStorage.getItem("officeos:attendance"));
box.records.find((r) => r.userId === "EMP-1017" && r.date === "2026-09-18").checkOut = "17:55";
w.localStorage.setItem("officeos:attendance", JSON.stringify(box));
await open("reg", "priya");
check("S2", "the recorded time is read from the record while pending (now 17:55)", parts(regRowFor("Ananya Iyer").children[3]) === "17:55 18:00", parts(regRowFor("Ananya Iyer").children[3]));
clearToasts();
button(regRowFor("Ananya Iyer"), "Approve").click();
check("S3", "a correction that no longer fits the record is refused; request stays pending; record unchanged", req("RG-104").status === "pending" && A.dayFor("EMP-1017", "2026-09-18").checkOut === "17:55"
  && toastTexts() === `["Couldn't approve the request. It may already have been decided, or the attendance record has changed."]` && !!regRowFor("Ananya Iyer"), toastTexts());
// Cancelled by its owner after the page drew, then rejected here.
const kabirReq = A.requestRegularization("EMP-1008", { date: "2026-09-28", issue: "missed-check-in", time: "09:20", reason: "Phone died before check-in" });
A.decideRegularization(kabirReq.record.id, "EMP-1001", "admin", "approve");   // Round 8C (setup): Aarav, Kabir's manager, first
await open("reg", "priya");
const beforeCancel = pills();
check("S4", "setup: Kabir's missed check-in for today is pending (2 rows)", kabirReq.ok && regRows().length === 2 && !!regRowFor("Kabir Shah"), `${kabirReq.error ?? "ok"} | ${regRows().length}`);
A.cancelRegularization(kabirReq.record.id, "EMP-1008");   // Kabir cancels after Priya's page drew
clearToasts();
button(regRowFor("Kabir Shah"), "Reject").click();
rejectWith("Too late");
check("S5", "rejecting a request cancelled meanwhile: fixed toast, modal closed, stays cancelled, row gone", req(kabirReq.record.id).status === "cancelled" && toastTexts() === `["Couldn't reject the request. It may already have been decided."]`
  && !cmodal().classList.contains("is-open") && !regRowFor("Kabir Shah") && beforeCancel === "Pending=2 Approved=4 Rejected=3" && pills() === "Pending=1 Approved=4 Rejected=3", `${beforeCancel} -> ${pills()} ${toastTexts()}`);

// =====================================================================
section("cancelled requests appear in no tab");
const cancelled = A.allRegularizations().filter((r) => r.status === "cancelled");
const allTabsText = [];
for (const t of ["Pending", "Approved", "Rejected"]) { pill(t).click(); allTabsText.push(regBody().textContent); }
check("C1", "the cancelled request (Kabir's) is in no tab and in no count (counts add up to the non-cancelled total, less Priya's own pending)", cancelled.length === 1 && cancelled[0].userId === "EMP-1008" && !allTabsText.some((t) => t.includes("Kabir Shah"))
  && pills().split(" ").map((p) => Number(p.split("=")[1])).reduce((a, b) => a + b, 0) === A.allRegularizations().filter((r) => r.status !== "cancelled" && !(r.status === "pending" && r.userId === "EMP-1003")).length, pills());

// =====================================================================
section("search, tabs, pagination (12 more pending requests)");
{
  const b = JSON.parse(w.localStorage.getItem("officeos:regularizations"));
  const people = ["EMP-1042", "EMP-1029", "EMP-1088", "EMP-1105"];
  for (let i = 0; i < 12; i++) {
    const userId = people[i % 4];
    const date = `2026-08-${String(10 + i).padStart(2, "0")}`;
    b.records.push({ id: `RG-${b.nextNum++}`, userId, date, issue: "missed-check-in", time: "09:15", recordedTime: null, reason: `Batch ${i + 1}`,
      status: "pending", stage: "hr", managerId: null, appliedOn: date, history: [{ stage: "hr", byUserId: userId, decision: "applied", at: `${date}T04:00:00.000Z`, note: "" }] });
  }
  w.localStorage.setItem("officeos:regularizations", JSON.stringify(b));
}
await open("reg", "priya");
check("G1", "13 pending: page 1 shows 10, oldest sent first; pager 'Showing 1 to 10 of 13'", pills() === "Pending=13 Approved=4 Rejected=3" && pills() === storeCounts("EMP-1003", "hr") && regRows().length === 10 && pager() === "Showing 1 to 10 of 13" && regRows()[0][4] === "Batch 1", `${pills()} | ${pager()}`);
[...d.querySelectorAll(".pagination button")].find((b) => b.textContent === "2").click();
check("G2", "page 2: the other 3 (Ananya's 18 Sep last)", regRows().length === 3 && pager() === "Showing 11 to 13 of 13" && regRows()[2][0] === "Ananya Iyer Sales", pager());
search("  ROHAN ");
check("G3", "search (trimmed, any case) goes back to page 1 and filters by name: Rohan's 3", regRows().length === 3 && regRows().every((r) => r[0] === "Rohan Gupta Engineering") && pager() === "(no pager)", regRows().map((r) => r[0]).join());
pill("Rejected").click();
check("G4", "search + Rejected tab combine: Rohan's rejected RG-105 only; counts unchanged by search", regRows().length === 1 && regRows()[0][1] === `${rg105Day} Sep` && pills() === "Pending=13 Approved=4 Rejected=3", regRows().map((r) => r.slice(0, 2).join(" ")).join());
pill("Approved").click();
check("G5", "search + Approved: nothing for Rohan -> 'No requests match this search.' across all columns", regRows().length === 1 && regRows()[0][0] === "No requests match this search." && regBody().querySelector("td").colSpan === 7);
search("sneha");
check("G6", "Approved + 'sneha': RG-103 (approved by Aarav)", regRows().length === 1 && regRows()[0][0] === "Sneha Rao Engineering" && regRows()[0][5] === "Approved");
search("");
pill("Pending").click();
check("G7", "clearing the search: back to all 13, page 1", regRows().length === 10 && pager() === "Showing 1 to 10 of 13");

// =====================================================================
section("export reflects the visible rows");
let csv = await csvRows();
// Round Data export (behaviour; was the rows equal to the screen's text: the Date column is ISO now, so the rows are matched by their first cell)
const firsts = (lines) => lines.map((l) => l.split(",")[0]);
// Round Data export part 2 (behaviour; was page 1's 10 rows, the name and department in one cell: every page's 13 rows now, page 1's first, the department a column of its own)
const named = (csvLines, shown) => csvLines.length === shown.length && csvLines.every((l, i) => firsts(shown)[i] === l.split(",").slice(0, 2).join(" "));
check("E1", "header without Actions; every page's 13 rows, page 1's 10 first", csv[0] === "Employee,Department,Date,Issue,\"Recorded, requested\",Reason,Status" && csv.length === 14 && named(csv.slice(1, 11), visibleCsv()), `${csv[0]} | ${csv.length - 1} rows`);
[...d.querySelectorAll(".pagination button")].find((b) => b.textContent === "2").click();
csv = await csvRows();
check("E2", "page 2 exports every page's 13 rows too, page 2's 3 last", csv.length === 14 && named(csv.slice(11), visibleCsv()) && csv[13].startsWith("Ananya Iyer,Sales,2026-09-18,Missed check-out,17:55 18:00,") /* Round Data export (behaviour; was 18 Sep); Round Data export part 2 (behaviour; was page 2's 3 rows, the department in the name's cell) */, csv[13]);
search("vikram"); pill("Rejected").click();
csv = await csvRows();
check("E3", "Rejected + 'vikram' exports just that row", csv.length === 2 && csv[1] === "Vikram Singh,Operations,2026-09-23,Late arrival,10:24 09:30,\"Bus breakdown, informed the manager by phone\",Rejected" /* Round Data export (behaviour; was 23 Sep); Round Data export part 2 (behaviour; was "Vikram Singh Operations" in one cell) */, csv[1]);
search(""); pill("Pending").click();

// =====================================================================
section("approvals inbox: both kinds, one flow, synced with regularization");
L.decideLeave("LV-2189", "EMP-1029", "emp", "approve"); L.decideLeave("LV-2201", "EMP-1029", "emp", "approve");   // Round 8C (setup): Sneha, their manager, first
await open("inbox", "priya");
const inbox = () => rowsOf(d.querySelector("#inbox-table tbody"));
const decidedRows = () => rowsOf(d.querySelector("#decided-table tbody"));
const inboxRow = (text) => [...d.querySelectorAll("#inbox-table tbody tr")].find((tr) => txt(tr).includes(text));
const stat = (label) => txt([...d.querySelectorAll(".stat")].find((x) => txt(x.querySelector(".stat__label")) === label).querySelector(".stat__value"));
const kinds = inbox().map((r) => r[1]);
check("I1", "Priya's inbox: 3 static, 4 leave and 13 correction rows; tab counts include corrections", kinds.filter((k) => k === "Attendance").length === 13 && kinds.filter((k) => k === "Leave").length === 4 && inbox().length === 20
  && pills() === `Pending=20 Approved=${1 + 4 + 4} Rejected=${1 + 1 + 3}`, pills());   // 6E: the static approved headset row is gone (2 -> 1)
check("I2", "correction row: title, type badge, requested by, details, waiting; real buttons tagged attendance:approve",
  inboxRow("Regularization: Ananya Iyer, 18 Sep") && parts(inboxRow("Regularization: Ananya Iyer, 18 Sep")).startsWith("Regularization: Ananya Iyer, 18 Sep Attendance Ananya Iyer Missed check-out, 18:00")
  && [...inboxRow("Regularization: Ananya Iyer").querySelectorAll("button")].every((b) => b.dataset.permission === "attendance:approve" && !b.dataset.notImplemented), parts(inboxRow("Regularization: Ananya Iyer, 18 Sep")));
const tsel = d.querySelector('select[aria-label="Filter by type"]');
const pickType = (v) => { tsel.value = v; tsel.dispatchEvent(new w.Event("change")); };
check("I3", "type filter has an Attendance option (value 'attendance')", [...tsel.options].some((o) => o.textContent === "Attendance" && o.value === "attendance"));
pickType("attendance");
check("I4", "Attendance filter: only the 13 corrections; footer counts", inbox().length === 13 && inbox().every((r) => r[1] === "Attendance") && txt(d.querySelector("#inbox-table").closest(".card").querySelector(".card__footer .card__meta")) === "Showing 13 of 20 pending requests");
const statsBefore = [stat("Waiting for you"), stat("Approved this week"), stat("Rejected this week")];
// Round 13Z (behaviour, A8): the stat is the 17 real rows; the tab and the footer count the 3 samples shown too
check("I5", "stats include corrections: Waiting 17; this week approved = RG-101 + Arjun + Aarav's own + RG-103 = 4; rejected = Priya's + Vikram's = 2", j(statsBefore) === j(["17", "4", "2"]), j(statsBefore));
clearToasts(); confirms.length = 0;
button(inboxRow("Regularization: Sneha Rao, 11 Aug"), "Approve").click();
const batch2 = A.allRegularizations().find((r) => r.reason === "Batch 2");
check("I6", "Approve a correction from the inbox: same confirm() + store + fixed toast; counts and stats move", batch2.status === "approved" && confirms[0]?.startsWith("Approve this request?\nSneha Rao: Missed check-in, 11 Aug")
  && toastTexts() === '["Correction approved. The attendance record is updated."]' && pills() === `Pending=19 Approved=10 Rejected=5` && stat("Approved this week") === "5" && stat("Waiting for you") === "16"
  && decidedRows().some((r) => r.join(" / ") === "Regularization: Sneha Rao, 11 Aug / Attendance / Sneha Rao / Approved / 28 Sep"), `${pills()} | ${stat("Approved this week")}`);
button(inboxRow("Regularization: Vikram Singh, 12 Aug"), "Reject").click();
rejectWith("");
const batch3 = () => A.allRegularizations().find((r) => r.reason === "Batch 3");
check("I7", "Reject from the inbox: correction modal, empty note refused inline", noteError()?.text === "Add a note saying why the request is rejected." && batch3().status === "pending");
rejectWith("No badge record for that day");
check("I8", "with a note: rejected, fixed toast, Recently decided shows it as Attendance", batch3().status === "rejected" && toastTexts().includes('"Correction request rejected."')
  && decidedRows().some((r) => r[0] === "Regularization: Vikram Singh, 12 Aug" && r[1] === "Attendance" && r[3] === "Rejected") && stat("Rejected this week") === "3");
pickType("leave");
button(inboxRow("Leave: Rohan Gupta"), "Reject").click();
check("I9", "leave Reject on the same page still opens its own modal (#reject-leave-modal, #reject-note); ids unique",
  d.getElementById("reject-leave-modal")?.classList.contains("is-open") && !!d.getElementById("reject-note") && d.querySelectorAll("#reject-correction-modal").length === 1 && d.querySelectorAll("#reject-note").length === 1
  && txt(d.querySelector("#reject-leave-modal .modal__title")) === "Reject leave request");
d.querySelector("#reject-leave-modal [data-modal-close]").click();
await open("reg", "priya");
pill("Approved").click(); const regApproved = regRows().map((r) => r[4]);
pill("Rejected").click(); const regRejected = regRows().map((r) => r[4]);
check("I10", "decisions made in the inbox show on regularization (Batch 2 approved, Batch 3 rejected) and its counts equal the store",
  regApproved[0] === "Batch 2" && regRejected[0] === "Batch 3" && pills() === storeCounts("EMP-1003", "hr") && pills() === "Pending=11 Approved=5 Rejected=4", `${regApproved[0]} / ${regRejected[0]} / ${pills()}`);
pill("Pending").click();
button(regRowFor("Batch 4"), "Approve").click();
const batch4 = A.allRegularizations().find((r) => r.reason === "Batch 4");
await open("inbox", "priya");
check("I11", "a decision on regularization shows in the inbox (row gone from Pending, in Recently decided, counts 3+4+10 / 1+4+6 / 1+1+4; 6E: one static approved row fewer)", batch4.status === "approved" && !inboxRow("Regularization: Arjun Kapoor, 13 Aug")
  && decidedRows().some((r) => r[0] === "Regularization: Arjun Kapoor, 13 Aug" && r[3] === "Approved") && pills() === "Pending=17 Approved=11 Rejected=6" && stat("Approved this week") === "6", `${pills()} | ${stat("Approved this week")}`);
await open("inbox", "aarav");
check("I12", "Aarav's inbox has the corrections too, his own excluded from Pending", inbox().filter((r) => r[1] === "Attendance").length === 10 && !inbox().some((r) => r[0].startsWith("Regularization: Aarav")));
await open("inbox", "kabir");
// Round 5E: Kabir's own expense claims join his inbox; apart from them, only the samples.
check("I13", "Kabir (no attendance:approve): no Attendance rows anywhere", !inbox().some((r) => r[1] === "Attendance") && !decidedRows().some((r) => r[1] === "Attendance") && inbox().filter((r) => r[1] !== "Expense").length === 3, pills());

// =====================================================================
section("guard, old session");
for (const who of ["kabir", "arjun"]) {
  await open("reg", who);
  check(`G-${who}`, `${who}: the guard redirects (403) and the script draws nothing (static rows, static counts)`, navigations.length === 1 && regRows().length === 5 && regRows()[0][0] === "Vikram Singh Operations" && pills() === "Pending=4 Approved=18 Rejected=2", `${navigations.join()} | ${pills()}`);
}
await open("reg", "old");
check("OLD1", "old session: main is the static page", sameMain(read("attendance/regularization.html")));
clearToasts();
const staticRow = regBody().querySelector("tr");
check("OLD2", "the static Approve/Reject keep their placeholder markers and toasts", button(staticRow, "Approve").dataset.notImplemented === "Approve" && button(staticRow, "Reject").dataset.notImplemented === "Reject"
  && (button(staticRow, "Approve").click(), button(staticRow, "Reject").click(), toastTexts() === `["Approve isn't available in this demo.","Reject isn't available in this demo."]`), toastTexts());

// =====================================================================
section("no markup from data");
const evil = '<img src=x onerror="window.__pwn=1">';
const evilRes = A.requestRegularization("EMP-1088", { date: "2026-09-28", issue: "missed-check-in", time: "09:00", reason: evil });   // Vikram isn't in yet today
const renamed = S.updateUser(USER_ACTOR("admin", "EMP-1088"), "EMP-1088", { name: `Vikram ${evil}` });
await open("reg", "priya");
search("vikram");
const evilRow = [...regBody().querySelectorAll("tr")].find((tr) => tr.querySelector(".reg-reason")?.textContent === evil);
check("X1", "a reason (and a name, if the store accepts it) with markup shows as text; no element is created", evilRes.ok && !!evilRow && !d.querySelector("main img") && w.__pwn === undefined && evilRow.querySelector(".reg-reason").textContent === evil
  && (!renamed.ok || evilRow.querySelector(".table__user-name").textContent === `Vikram ${evil}`), `request: ${evilRes.error ?? "ok"}, name stored: ${renamed.ok}`);
clearToasts();
button(evilRow, "Reject").click();
check("X2", "the modal description is text", !cmodal().querySelector("img") && cmodal().querySelector(".modal__desc").textContent.includes(evil));
rejectWith(evil);
check("X3", "toast innerHTML is the fixed text, not the note or name", j(toasts().map((t) => t.html)) === '["Correction request rejected."]' && !d.querySelector("img"));
await open("inbox", "priya");
pill("Rejected").click();
check("X4", "inbox: the same request and note render as text", !d.querySelector("main img") && w.__pwn === undefined);
const SRC = ["pages/regularization.js", "pages/approvals-inbox.js", "ui/leave-decision.js"].map((p) => fs.readFileSync(new URL(`./js/${p}`, import.meta.url), "utf8"));
const code = (s) => s.split(/\r?\n/).filter((l) => !l.trim().startsWith("//")).join("\n");
check("X5", "no innerHTML / outerHTML / insertAdjacentHTML / document.write in the three scripts (comments aside)", SRC.every((s) => !/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(code(s))));
check("X6", "toasts in the correction flow are fixed strings; the only escaped-error path is leave's (no approveFailed/rejectFailed given)",
  /approveFailed: "Couldn't approve/.test(SRC[2]) && /rejectFailed: "Couldn't reject/.test(SRC[2]) && !/createDecisionFlow/.test(SRC[0]) && !/createDecisionFlow/.test(SRC[1]) && /approved: \(result\) => \(result\.record\.status === "approved" \? "Leave request approved\." : "Approved\. It now goes to HR or an Admin\."\)/.test(SRC[2]) && /rejected: "Leave request rejected\."/.test(SRC[2]));   // Round 8C: two fixed strings, by the stage reached (was one)

check("Z1", "no JS errors in the whole run", jsErrors.length === 0, jsErrors.join(" | "));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
