// usage: node team.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 3E: team-attendance.html with the js in ./js, in jsdom. localStorage carries over between
// page loads unless fresh() is called. The clock is local wall time and can be moved; the seed is
// generated around whatever "now" is when storage is first read, so each scenario sets the clock
// before fresh() + open(). "Today" is Tue 29 Sep 2026 unless a test says otherwise.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HTML = fs.readFileSync(`${DIR}/attendance/team-attendance.html`, "utf8");
const SCRIPT = fs.readFileSync(new URL("./js/pages/team-attendance.js", import.meta.url), "utf8");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 9, 29, 11, 0);
globalThis.setTimeout = () => 0;
let lastBlob = null, blobs = 0;
URL.createObjectURL = (blob) => { lastBlob = blob; blobs++; return "blob:test"; };
URL.revokeObjectURL = () => {};

const WHO = {
  priya: ["hr", "Priya Nair", "EMP-1003"], aarav: ["admin", "Aarav Mehta", "EMP-1001"],
  kabir: ["fin", "Kabir Shah", "EMP-1008"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"], old: ["hr", "Priya Nair", undefined],
};

let loads = 0, w = null, d = null, saved = {};
let jsErrors = [], navigations = [], htmlWrites = [];
async function open(who = "priya") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(`${who}: ${e.message}`); else jsErrors.push(`${who}: ${e.message}`); });
  const dom = new JSDOM(HTML, { url: "http://localhost/office-os/pages/attendance/team-attendance.html", virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  // Record every innerHTML / insertAdjacentHTML write made while the page runs.
  const proto = w.Element.prototype;
  const inner = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", { get: inner.get, set(v) { htmlWrites.push(String(v)); inner.set.call(this, v); }, configurable: true });
  const adj = proto.insertAdjacentHTML;
  proto.insertAdjacentHTML = function (pos, v) { htmlWrites.push(String(v)); return adj.call(this, pos, v); };
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  navigations = [];
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/team-attendance.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }
// Set the clock, wipe storage, open as who.
async function at(y, mo, dd, h, mi, who = "priya") { setNow(y, mo, dd, h, mi); fresh(); await open(who); }

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

// ---- readers ----
const $ = (id) => d.getElementById(id);
function parts(node) {   // text pieces like the CSV export reads them (skips avatars, aria-hidden, hidden)
  const out = [];
  const walker = node.ownerDocument.createTreeWalker(node, 4);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (t.parentElement.closest(".avatar, svg, [hidden], [aria-hidden='true']")) continue;
    const v = t.textContent.replace(/\s+/g, " ").trim();
    if (v) out.push(v);
  }
  return out.join(" ");
}
const stat = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return `${txt(s.querySelector(".stat__value"))} (${txt(s.querySelector(".stat__delta"))})`; };
const stats = () => ["present", "late", "on-leave", "absent"].map((k) => `${k}=${stat(k)}`).join(" | ");
const trs = () => [...$("team-rows").querySelectorAll("tr")];
const rows = () => trs().map((tr) => [...tr.children].map(parts));
const names = () => trs().map((tr) => txt(tr.querySelector(".table__user-name"))).filter(Boolean);
const rowOf = (name) => rows().find((r) => r[0].startsWith(name));
const badgeOf = (name) => { const tr = trs().find((t) => txt(t.querySelector(".table__user-name")) === name); const b = tr?.lastElementChild.querySelector(".badge"); return b ? `${txt(b)}[${[...b.classList].filter((c) => c !== "badge" && c !== "badge--dot").join(" ")}]` : null; };
const weekOf = (name) => rowOf(name)?.[4];
const weekClasses = (name) => [...(trs().find((t) => txt(t.querySelector(".table__user-name")) === name)?.querySelectorAll(".week__day") ?? [])].map((i) => i.className.replace("week__day week__day--", "")).join(",");
const pills = () => [...d.querySelectorAll(".tabs__tab[data-tab]")].map((p) => `${p.dataset.tab}=${txt(p.querySelector(".badge--count"))}`).join(" ");
const pill = (tab) => d.querySelector(`.tabs__tab[data-tab="${tab}"]`);
const pager = () => txt(d.querySelector("#team-pagination > span")) ?? "(no pager)";
const pagerEmpty = () => $("team-pagination").classList.contains("is-empty");
const bars = () => [...$("team-dept-bars").querySelectorAll(".bar-row")].map((b) => `${txt(b.children[0])}=${txt(b.querySelector(".bar-row__value"))}@${b.querySelector(".bar-row__fill").style.getPropertyValue("--w")}`);
const attention = () => [...$("team-attention").querySelectorAll(".list__item")].map((i) => `${txt(i.querySelector(".list__title")) ?? ""}|${txt(i.querySelector(".list__sub"))}`);
const attentionMeta = () => txt($("team-attention-count"));
const regBadge = () => txt($("team-reg-link").querySelector(".badge--count"));
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${t.className.replace("toast toast--", "")}:${txt(t.querySelector(".toast__text"))}`);
const click = (node) => node.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const type = (value) => { const i = $("team-search"); i.value = value; i.dispatchEvent(new w.Event("input", { bubbles: true })); };
const pickDept = (code) => { const s = $("team-dept"); s.value = code; s.dispatchEvent(new w.Event("change", { bubbles: true })); };
const pickDate = (iso) => { const i = $("team-date"); i.value = iso; i.dispatchEvent(new w.Event("change", { bubbles: true })); };
async function exportCsv() {
  lastBlob = null;
  click(d.querySelector("[data-export]"));
  const text = lastBlob ? (await lastBlob.text()).replace(/^﻿/, "") : "";
  return text.split("\r\n");
}
const ACTIVE9 = ["Aarav Mehta", "Ananya Iyer", "Arjun Kapoor", "Kabir Shah", "Meera Joshi", "Priya Nair", "Rohan Gupta", "Sneha Rao", "Vikram Singh"];
const DEPTS = ["Engineering", "Sales", "Operations", "Customer Support", "Finance", "Human Resources"];

// =====================================================================
section("Today (Tue 29 Sep) at 11:00, signed in as Priya (HR)");
await at(2026, 9, 29, 11, 0);
const sum11 = A.summaryFor("2026-09-29");
check("T1", "date picker defaults to today, max = today", $("team-date").value === "2026-09-29" && $("team-date").max === "2026-09-29", `${$("team-date").value} max=${$("team-date").max}`);
check("T2", "table lists exactly the 9 active employees, by name", j(names()) === j(ACTIVE9), j(names()));
check("T3", "store summary at 11:00: 9 active, 8 expected, 4 present (1 late), 1 on leave, 0 absent, 4 not yet, all 4 overdue",
  sum11.total === 9 && sum11.expected === 8 && sum11.present === 4 && sum11.late === 1 && sum11.onLeave === 1 && sum11.absent === 0 && sum11.notYet === 4 && sum11.overdue === 4, j(sum11));
check("T4", "stat strip: present 4 = 50% of 8 expected (not of 9); late 1; on leave 1; absent 4 incl. 4 overdue",
  stats() === "present=4 (50% of 8 expected) | late=1 (Included in present) | on-leave=1 (Not counted in expected) | absent=4 (Includes 4 overdue)", stats());
check("T5", "tab counts match the stat strip", pills() === "all=9 present=4 late=1 on-leave=1 absent=4", pills());
check("T6", "not-in-yet rows get the Overdue badge (outlined red), not Absent", ["Aarav Mehta", "Arjun Kapoor", "Kabir Shah", "Priya Nair"].every((n) => badgeOf(n) === "Overdue[badge--overdue]"),
  ["Aarav Mehta", "Arjun Kapoor", "Kabir Shah", "Priya Nair"].map(badgeOf).join(" "));
check("T7", "Overdue badge says why on hover", trs().find((t) => txt(t).includes("Aarav"))?.querySelector(".badge--overdue")?.title === "Not checked in by 09:45");
check("T8", "Rohan: 09:12, 1h 48m so far, Present; Vikram: 10:24, Late (today's dot L); Meera: On leave with no times",
  j(rowOf("Rohan Gupta")) === j(["Rohan Gupta EMP-1042", "Engineering", "09:12", "1h 48m so far", "P,P,NY,NY,HOL", "Present"])
  && j(rowOf("Vikram Singh")) === j(["Vikram Singh EMP-1088", "Operations", "10:24", "0h 36m so far", "P,L,NY,NY,HOL", "Late"])
  && j(rowOf("Meera Joshi")) === j(["Meera Joshi EMP-1023", "Finance", "–", "–", "LV,LV,LV,LV,HOL", "On leave"]),
  j([rowOf("Rohan Gupta"), rowOf("Vikram Singh"), rowOf("Meera Joshi")]));
check("T9", "week dots use the new classes: today/future = ny, Fri 2 Oct = hol, leave = lv", weekClasses("Rohan Gupta") === "p,p,ny,ny,hol" && weekClasses("Meera Joshi") === "lv,lv,lv,lv,hol", `${weekClasses("Rohan Gupta")} / ${weekClasses("Meera Joshi")}`);
const wk = trs()[0].querySelector(".week");
check("T10", "week strip has an accessible label per day and sr-only codes for export", wk.getAttribute("role") === "img" && wk.getAttribute("aria-label") === "Monday present, Tuesday not in yet, Wednesday not in yet, Thursday not in yet, Friday holiday" && txt(wk.querySelector(".sr-only")) === "P,NY,NY,NY,HOL", wk.getAttribute("aria-label"));
check("T11", "department bars: every real department, full names, % of expected, Customer Support '–'",
  j(bars()) === j(["Engineering=50%@50%", "Sales=100%@100%", "Operations=100%@100%", "Customer Support=–@0%", "Finance=0%@0%", "Human Resources=0%@0%"]), j(bars()));
check("T12", "department card says Today", txt($("team-dept-date")) === "Today");
check("T13", "Needs attention: the 4 overdue, 'no check-in or leave request'; Meera (approved leave) not listed",
  j(attention()) === j(["Aarav Mehta|Engineering, no check-in or leave request", "Arjun Kapoor|Engineering, no check-in or leave request", "Kabir Shah|Finance, no check-in or leave request", "Priya Nair|Human Resources, no check-in or leave request"])
  && attentionMeta() === "4 need attention", `${attentionMeta()} ${j(attention())}`);
// Round Demo buttons part 1 (behaviour; were "Message buttons stay placeholders (no mailto)" and "clicking Message shows 'Message isn't available in this demo.'")
check("T14", "Message is a mailto: link to each person's work email, subject 'Attendance on 29 Sep'; no button left in the list",
  j([...$("team-attention").querySelectorAll(".list__item a")].map((a) => [txt(a), a.getAttribute("href")])) === j(["aarav.mehta", "arjun.kapoor", "kabir.shah", "priya.nair"].map((n) => ["Message", `mailto:${n}@northwind.com?subject=Attendance%20on%2029%20Sep`])) && !$("team-attention").querySelector("button"),
  j([...$("team-attention").querySelectorAll(".list__item a")].map((a) => a.getAttribute("href"))));
click($("team-attention").querySelector("a"));
check("T15", "…clicking Message shows no demo toast (the browser opens the email)", toasts().length === 0, j(toasts()));
check("T16", "Regularization button shows the real pending count (RG-102, RG-103, RG-104 = 3)", regBadge() === "3 pending" && A.pendingRegularizations("EMP-1003", "hr").length === 3, regBadge());
check("T17", "department select: All + the 6 real departments, by code", j([...$("team-dept").options].map((o) => `${o.value}:${o.textContent}`)) === j(["" + ":All departments", "ENG:Engineering", "SAL:Sales", "OPS:Operations", "SUP:Customer Support", "FIN:Finance", "HR:Human Resources"]), j([...$("team-dept").options].map((o) => o.textContent)));
check("T18", "no page errors", jsErrors.length === 0, j(jsErrors));

section("Divya Menon (EMP-1061, inactive) is excluded everywhere");
const everywhere = () => [txt($("team-rows")), txt($("team-attention")), txt($("team-dept-bars")), pills()].join(" ");
check("D1", "not in the table, Needs attention, or counts (All = 9)", !/Divya|EMP-1061/.test(everywhere()) && pills().startsWith("all=9"));
check("D2", "not in the store's team or week helpers either", !A.teamFor("2026-09-29").some((x) => x.userId === "EMP-1061") && !A.teamWeekFor("2026-09-29").some((x) => x.day.userId === "EMP-1061") && A.weekFor("EMP-1061", "2026-09-29") === null);
pickDate("2026-09-18"); type("div");
check("D3", "not on a past date either, not even by search", names().length === 0 && txt($("team-rows")) === "Nobody matches these filters.", txt($("team-rows")));
type(""); pickDate("2026-09-29");
check("D4", "Human Resources bar counts only Priya (1 expected), not Divya", $("team-dept-bars").querySelectorAll(".bar-row")[5].title === "0 of 1 expected are in", $("team-dept-bars").querySelectorAll(".bar-row")[5].title);

section("Store helpers: weekFor / teamWeekFor / overdue");
const codeOf = (days) => days.map((x) => ({ present: "P", late: "L", absent: "A", "on-leave": "LV", holiday: "HOL", "not-yet": "NY", "half-day": "HD" }[x.status] ?? x.status)).join(",");
const vw = A.weekFor("EMP-1088", "2026-09-18");
check("S1", "weekFor(Vikram, Fri 18 Sep): Mon 14 - Fri 18, 'A,P,P,P,L'", j(vw.map((x) => x.date)) === j(["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18"]) && codeOf(vw) === "A,P,P,P,L", codeOf(vw));
check("S2", "a Sunday belongs to the week before (Sun 27 Sep -> Mon 21 - Fri 25); a Monday starts its own", A.weekFor("EMP-1088", "2026-09-27")[0].date === "2026-09-21" && A.weekFor("EMP-1088", "2026-09-28")[0].date === "2026-09-28" && A.weekFor("EMP-1088", "2026-10-02")[4].date === "2026-10-02");
check("S3", "teamWeekFor gives the same days as weekFor/teamFor, one entry per active person", j(A.teamWeekFor("2026-09-18").find((x) => x.day.userId === "EMP-1088").week) === j(vw) && j(A.teamWeekFor("2026-09-29").map((x) => x.day)) === j(A.teamFor("2026-09-29")));
check("S4", "weekFor / teamWeekFor reject bad input (unknown person, bad date)", A.weekFor("EMP-9999", "2026-09-18") === null && A.weekFor("EMP-1088", "2026-02-30") === null && j(A.teamWeekFor("nope")) === "[]");
check("S5", "overdue is only on today's not-yet days: past absences and future days aren't overdue", A.teamFor("2026-09-29").filter((x) => x.overdue).every((x) => x.status === "not-yet") && !A.teamFor("2026-09-14").some((x) => x.overdue) && !A.teamFor("2026-09-30").some((x) => x.overdue) && A.dayFor("EMP-1088", "2026-09-14").status === "absent");

section("Today at different times of day");
await at(2026, 9, 29, 9, 40);
let s = A.summaryFor("2026-09-29");
check("C1", "09:40 (before grace): 3 in, 5 not in yet, none overdue; Absent stat 0", stats() === "present=3 (37.5% of 8 expected) | late=0 (Included in present) | on-leave=1 (Not counted in expected) | absent=0 (5 people not in yet, not counted)" && s.overdue === 0 && s.notYet === 5, stats());
check("C2", "…not-in-yet rows show a neutral outlined 'Not in yet' badge; Absent tab empty", badgeOf("Aarav Mehta") === "Not in yet[badge--not-yet]" && badgeOf("Vikram Singh") === "Not in yet[badge--not-yet]" && pills() === "all=9 present=3 late=0 on-leave=1 absent=0", `${badgeOf("Aarav Mehta")} ${pills()}`);
check("C3", "…Needs attention empty: 'Everyone is accounted for.'", j(attention()) === j(["|Everyone is accounted for."]) && attentionMeta() === "None", j(attention()));
await at(2026, 9, 29, 9, 45);
check("C4", "09:45 exactly: still not overdue (a 09:45 check-in is on time)", A.summaryFor("2026-09-29").overdue === 0 && pills().endsWith("absent=0"), pills());
await at(2026, 9, 29, 9, 46);
check("C5", "09:46: the 5 not in yet become overdue (Vikram is not in until 10:24)", A.summaryFor("2026-09-29").overdue === 5 && pills().endsWith("absent=5") && badgeOf("Vikram Singh") === "Overdue[badge--overdue]", pills());
click(pill("absent"));
check("C6", "…Absent tab lists them", j(names()) === j(["Aarav Mehta", "Arjun Kapoor", "Kabir Shah", "Priya Nair", "Vikram Singh"]), j(names()));
await at(2026, 9, 29, 18, 29);
s = A.summaryFor("2026-09-29");
check("C7", "18:29 (before shift end): still not-yet + overdue, absent 0", s.absent === 0 && s.overdue === 4 && stat("absent") === "4 (Includes 4 overdue)", `${j(s)} ${stat("absent")}`);
await at(2026, 9, 29, 18, 31);
s = A.summaryFor("2026-09-29");
check("C8", "18:31 (after shift end): the 4 are Absent (status), no longer overdue; stat absent 4", s.absent === 4 && s.overdue === 0 && s.notYet === 0 && stat("absent") === "4 (No check-in or approved leave)", `${j(s)} ${stat("absent")}`);
check("C9", "…their badges are the solid Absent badge", badgeOf("Aarav Mehta") === "Absent[badge--danger]", badgeOf("Aarav Mehta"));
check("C10", "…Needs attention still lists the 4", attention().length === 4 && attentionMeta() === "4 need attention", attentionMeta());
check("C11", "…in-progress hours say 'so far' (Rohan 09:12 -> 9h 19m so far)", rowOf("Rohan Gupta")[3] === "9h 19m so far", rowOf("Rohan Gupta")[3]);

section("First-half leave moves the deadline to 14:15 (Arjun)");
setNow(2026, 9, 29, 8, 0); fresh(); await open("priya");
let lv = L.applyLeave("EMP-1105", { type: "casual", from: "2026-09-29", to: "2026-09-29", duration: "first-half", reason: "Clinic" });
if (lv.ok) L.decideLeave(lv.record.id, "EMP-1029", "emp", "approve");   // Round 8C (setup): Sneha, the requester's manager, approves first
let dec = lv.ok ? L.decideLeave(lv.record.id, "EMP-1003", "hr", "approve") : lv;
check("H1", "approved first-half leave for Arjun today", lv.ok && dec.ok, j(dec));
setNow(2026, 9, 29, 14, 15); await open("priya");
check("H2", "14:15: Arjun not overdue (others are); Absent tab/attention leave him out", A.dayFor("EMP-1105", "2026-09-29").overdue === false && badgeOf("Arjun Kapoor") === "Not in yet[badge--not-yet]" && !attention().some((a) => a.startsWith("Arjun")), `${badgeOf("Arjun Kapoor")} ${j(attention())}`);
setNow(2026, 9, 29, 14, 16); await open("priya");
check("H3", "14:16: Arjun overdue, badge title 'Not checked in by 14:15', listed in Needs attention", A.dayFor("EMP-1105", "2026-09-29").overdue === true && trs().find((t) => txt(t).includes("Arjun"))?.querySelector(".badge--overdue")?.title === "Not checked in by 14:15" && attention().some((a) => a.startsWith("Arjun")), j(attention()));

section("Needs attention notes: correction pending, leave request pending, approved leave excluded");
await at(2026, 9, 29, 11, 0);
const rq = A.requestRegularization("EMP-1105", { date: "2026-09-29", issue: "missed-check-in", time: "09:20", reason: "Badge reader down" });
const lp = L.applyLeave("EMP-1008", { type: "casual", from: "2026-09-29", to: "2026-09-29", duration: "full", reason: "Unwell" });
const lf = L.applyLeave("EMP-1001", { type: "sick", from: "2026-09-29", to: "2026-09-29", duration: "full", reason: "Fever" });   // admin: auto-approved
await open("priya");
check("N1", "setup: Arjun's missed-check-in pending, Kabir's leave pending, Aarav's leave auto-approved", rq.ok && lp.ok && lp.record.status === "pending" && lf.ok && lf.record.status === "approved", j([rq.ok, lp.record?.status, lf.record?.status]));
check("N2", "Arjun 'correction pending', Kabir 'leave request pending', Priya 'no check-in or leave request'; Aarav (approved leave) gone",
  j(attention()) === j(["Arjun Kapoor|Engineering, correction pending", "Kabir Shah|Finance, leave request pending", "Priya Nair|Human Resources, no check-in or leave request"]), j(attention()));
check("N3", "Aarav now On leave: stat 2 on leave, expected drops to 7, present 4 = 57.1% of 7", stat("present") === "4 (57.1% of 7 expected)" && stat("on-leave").startsWith("2 ") && badgeOf("Aarav Mehta") === "On leave[badge--info]", `${stat("present")} ${stat("on-leave")}`);
check("N4", "Regularization count stays 3: Arjun's new request waits on Sneha, his manager, first (Round 8C; was 4)", regBadge() === "3 pending", regBadge());
const ok1 = A.decideRegularization("RG-102", "EMP-1003", "hr", "approve");
const ok2 = A.decideRegularization("RG-103", "EMP-1003", "hr", "reject", "No");
await open("priya");
check("N5", "after approving RG-102 and rejecting RG-103: count 1 (Round 8C; was 2: Arjun's is still with Sneha)", ok1.ok && ok2.ok && regBadge() === "1 pending", regBadge());
await open("aarav");
check("N6", "Admin (attendance:approve) sees the same count; no double badge (Round 8C: 1, was 2)", regBadge() === "1 pending" && $("team-reg-link").querySelectorAll(".badge--count").length === 1, regBadge());
A.decideRegularization("RG-104", "EMP-1003", "hr", "reject", "No"); A.decideRegularization(rq.record.id, "EMP-1003", "hr", "reject", "No");
await open("priya");
check("N7", "no pending corrections -> no badge on the button", regBadge() === null && txt($("team-reg-link")) === "Regularization" /* Round Small tidy-ups (behaviour; was "Regularization requests") */, txt($("team-reg-link")));

section("A past date: Fri 18 Sep");
await at(2026, 9, 29, 11, 0);
pickDate("2026-09-18");
check("P1", "all 9 present (Vikram late at 09:58), 100% of 9 expected, nobody absent", stats() === "present=9 (100% of 9 expected) | late=1 (Included in present) | on-leave=0 (Not counted in expected) | absent=0 (No check-in or approved leave)", stats());
check("P2", "Meera is Present on 18 Sep (her leave LV-2172 runs 21 Sep – 1 Oct), week P x5", badgeOf("Meera Joshi") === "Present[badge--success]" && weekOf("Meera Joshi") === "P,P,P,P,P", `${badgeOf("Meera Joshi")} ${weekOf("Meera Joshi")}`);
check("P3", "Vikram's real week 14-18 Sep: absent Mon (seeded), late Fri", weekOf("Vikram Singh") === "A,P,P,P,L" && rowOf("Vikram Singh")[2] === "09:58", `${weekOf("Vikram Singh")} ${rowOf("Vikram Singh")[2]}`);
check("P4", "finished hours are plain (no 'so far'); department card shows 'Fri, 18 Sep'", /^\d+h \d\dm$/.test(rowOf("Rohan Gupta")[3]) && txt($("team-dept-date")) === "Fri, 18 Sep", `${rowOf("Rohan Gupta")[3]} ${txt($("team-dept-date"))}`);
check("P5", "Needs attention empty on 18 Sep", attentionMeta() === "None" && j(attention()) === j(["|Everyone is accounted for."]));
pickDate("2026-09-14");
check("P6", "Mon 14 Sep: Vikram Absent, in Needs attention as 'no check-in or leave request'", badgeOf("Vikram Singh") === "Absent[badge--danger]" && j(attention()) === j(["Vikram Singh|Operations, no check-in or leave request"]) && stat("absent") === "1 (No check-in or approved leave)", j(attention()));
pickDate("2026-09-21");
check("P7", "Mon 21 Sep (first day of Meera's leave): Meera On leave, week LV x5", badgeOf("Meera Joshi") === "On leave[badge--info]" && weekOf("Meera Joshi") === "LV,LV,LV,LV,LV", weekOf("Meera Joshi"));
pickDate("2026-09-25");
check("P8", "Fri 25 Sep: Arjun's regularized check-in shows 'was 10:12' and counts as Present", rowOf("Arjun Kapoor")[2] === "09:30 was 10:12" && badgeOf("Arjun Kapoor") === "Present[badge--success]", `${rowOf("Arjun Kapoor")[2]} ${badgeOf("Arjun Kapoor")}`);
pickDate("2026-09-21");
check("P9", "Mon 21 Sep: Ananya's forgotten check-out says 'No check-out' (not '–')", rowOf("Ananya Iyer")[3] === "No check-out", rowOf("Ananya Iyer")[3]);
pickDate("2026-09-17");
check("P10", "Thu 17 Sep: Kabir's WFH day shows a WFH badge", rowOf("Kabir Shah")[2] === "09:15 WFH", rowOf("Kabir Shah")[2]);
pickDate("2026-09-15");
check("P11", "Tue 15 Sep: Ananya's short day (09:20-13:40) is a Half day with an hd week dot / HD code", badgeOf("Ananya Iyer") === "Half day[badge--info]" && weekClasses("Ananya Iyer").split(",")[1] === "hd" && weekOf("Ananya Iyer").split(",")[1] === "HD" && rowOf("Ananya Iyer")[3] === "4h 20m", `${badgeOf("Ananya Iyer")} ${weekOf("Ananya Iyer")} ${rowOf("Ananya Iyer")[3]}`);
pickDate("2026-09-23");
check("P12", "Wed 23 Sep: Arjun's plain late day (10:05) is Late, week of 21-25 'P,P,L,P,P'", badgeOf("Arjun Kapoor") === "Late[badge--warning]" && weekOf("Arjun Kapoor") === "P,P,L,P,P", `${badgeOf("Arjun Kapoor")} ${weekOf("Arjun Kapoor")}`);

section("A future date is blocked");
await at(2026, 9, 29, 11, 0);
const before = rows();
pickDate("2026-09-30");
check("F1", "picking 30 Sep (tomorrow) snaps back to 29 Sep and warns; nothing re-rendered", $("team-date").value === "2026-09-29" && j(rows()) === j(before) && j(toasts()) === j(["warning:Attendance can't be shown for a future date. Pick today or an earlier date."]), `${$("team-date").value} ${j(toasts())}`);
d.querySelectorAll(".toast").forEach((t) => t.remove());
pickDate("");
check("F2", "clearing the date snaps back without a toast", $("team-date").value === "2026-09-29" && toasts().length === 0);

section("A holiday, a weekend, a date before records");
await at(2026, 10, 5, 11, 0);
pickDate("2026-10-02");
check("O1", "Fri 2 Oct (Gandhi Jayanti): 0 expected, stat says 'Holiday: Gandhi Jayanti', everyone Holiday", stats().startsWith("present=0 (Holiday: Gandhi Jayanti)") && names().length === 9 && ACTIVE9.every((n) => badgeOf(n) === "Holiday[]"), stats());
check("O2", "…tabs all=9 others 0; bars all '–'; Needs attention 'Nobody is expected at work on this date.'", pills() === "all=9 present=0 late=0 on-leave=0 absent=0" && bars().every((b) => b.includes("=–@0%")) && j(attention()) === j(["|Nobody is expected at work on this date."]), `${pills()} ${j(bars())}`);
pickDate("2026-09-27");
check("O3", "Sun 27 Sep: 'Weekend', everyone Weekend; week strip is Mon 21 - Fri 25", stats().startsWith("present=0 (Weekend)") && badgeOf("Rohan Gupta") === "Weekend[]" && weekOf("Meera Joshi") === "LV,LV,LV,LV,LV", `${stats()} ${weekOf("Meera Joshi")}`);
pickDate("2026-08-03");
check("O4", "Mon 3 Aug (before records began): 'No attendance records for this date', No data badges, ND dots", stats().startsWith("present=0 (No attendance records for this date)") && badgeOf("Rohan Gupta") === "No data[]" && weekOf("Rohan Gupta") === "ND,ND,ND,ND,ND" && weekClasses("Rohan Gupta") === "nd,nd,nd,nd,nd", `${stats()} ${weekOf("Rohan Gupta")}`);

section("Tabs + search + department combine; sort; pagination");
await at(2026, 9, 29, 11, 0);
pickDept("ENG");
check("F10", "Engineering: 4 people; tab counts follow the filter", j(names()) === j(["Aarav Mehta", "Arjun Kapoor", "Rohan Gupta", "Sneha Rao"]) && pills() === "all=4 present=2 late=0 on-leave=0 absent=2", `${j(names())} ${pills()}`);
click(pill("absent"));
check("F11", "…+ Absent tab: Aarav, Arjun", j(names()) === j(["Aarav Mehta", "Arjun Kapoor"]), j(names()));
type("arj");
check("F12", "…+ search 'arj': Arjun only; counts follow search", j(names()) === j(["Arjun Kapoor"]) && pills() === "all=1 present=0 late=0 on-leave=0 absent=1", pills());
click(pill("present"));
check("F13", "…Present tab with that search: empty row 'Nobody matches these filters.'", names().length === 0 && txt($("team-rows")) === "Nobody matches these filters.", txt($("team-rows")));
type("EMP-1105");
check("F14", "search is by name only (an ID matches nothing)", pills().startsWith("all=0"), pills());
type(""); pickDept(""); click(pill("late"));
check("F15", "clear filters + Late tab: Vikram only", j(names()) === j(["Vikram Singh"]), j(names()));
click(pill("on-leave"));
check("F16", "On leave tab: Meera only", j(names()) === j(["Meera Joshi"]), j(names()));
click(pill("all")); pickDept("SUP");
check("F17", "Customer Support (nobody in it): empty row, pager hidden", names().length === 0 && txt($("team-rows")) === "Nobody matches these filters." && pagerEmpty(), txt($("team-rows")));
pickDept(""); click(pill("on-leave")); pickDate("2026-09-18");
check("F17b", "no filters, On leave tab on a day nobody is on leave: 'Nobody in this group on this date.'", txt($("team-rows")) === "Nobody in this group on this date.", txt($("team-rows")));
pickDate("2026-09-29"); click(pill("all"));
pickDept("");
click($("team-sort"));
check("F18", "sort by name toggles to descending (aria-sort, arrow)", j(names()) === j([...ACTIVE9].reverse()) && $("team-sort").closest("th").getAttribute("aria-sort") === "descending" && txt($("team-sort").querySelector("[aria-hidden]")) === "▼", j(names()));
click($("team-sort"));
check("F19", "…and back to ascending", j(names()) === j(ACTIVE9) && $("team-sort").closest("th").getAttribute("aria-sort") === "ascending");
check("F20", "9 people: no pagination controls", pagerEmpty() && pager() === "(no pager)");
["Zara Khan", "Yusuf Ali", "Xavier Dsouza"].forEach((name, i) => S.addUser(USER_ACTOR("admin", null), { name, email: `x${i}@northwind.com`, department: "SAL", designation: "Sales Executive", role: "emp", status: "active" }));
await open("priya");
check("F21", "12 active: page 1 shows 10, 'Showing 1 to 10 of 12'", names().length === 10 && pager() === "Showing 1 to 10 of 12", pager());
click([...d.querySelectorAll("#team-pagination .pagination__btn")].find((b) => txt(b) === "2"));
check("F22", "page 2 shows the last 2 (Yusuf Ali, Zara Khan)", j(names()) === j(["Yusuf Ali", "Zara Khan"]) && pager() === "Showing 11 to 12 of 12", `${j(names())} ${pager()}`);
check("F23", "new people without records are overdue (in Absent), counted in expected", pills() === "all=12 present=4 late=1 on-leave=1 absent=7" && stat("present") === "4 (36.4% of 11 expected)", `${pills()} ${stat("present")}`);
pickDept("SAL");
check("F24", "a filter resets to page 1 and hides the pager when it fits", pagerEmpty() && j(names()) === j(["Ananya Iyer", "Xavier Dsouza", "Yusuf Ali", "Zara Khan"]), j(names()));

section("Export reflects the rows shown, week as text");
pickDept(""); await open("priya");
click([...d.querySelectorAll("#team-pagination .pagination__btn")].find((b) => txt(b) === "2"));
let csv = await exportCsv();
// Round Data export part 2 (behaviour; was page 2's 2 rows, the employee ID in the name's cell: every page's 12 people now, the ID a column of its own)
check("X1", "page 2 export: every page's 12 people (page 2's 2 last), week column as codes", csv.length === 13 && csv[0] === "Employee,Employee ID,Department,Check-in,Hours,This week,Status" && csv[11] === 'Yusuf Ali,EMP-1107,Sales,–,–,"A,NY,NY,NY,HOL",Overdue' && csv[12] === 'Zara Khan,EMP-1106,Sales,–,–,"A,NY,NY,NY,HOL",Overdue', j(csv));
await at(2026, 9, 29, 11, 0);
pickDept("ENG"); click(pill("absent"));
csv = await exportCsv();
check("X2", "Engineering + Absent export: exactly Aarav and Arjun", j(csv) === j(["Employee,Employee ID,Department,Check-in,Hours,This week,Status", 'Aarav Mehta,EMP-1001,Engineering,–,–,"P,NY,NY,NY,HOL",Overdue', 'Arjun Kapoor,EMP-1105,Engineering,–,–,"P,NY,NY,NY,HOL",Overdue']) /* Round Data export part 2 (behaviour; the Employee ID column) */, j(csv));
pickDept(""); click(pill("all")); pickDate("2026-09-18");
csv = await exportCsv();
check("X3", "past date, all: 9 rows, Vikram's week 'A,P,P,P,L', no Divya", csv.length === 10 && csv.some((l) => l.startsWith("Vikram Singh,EMP-1088,Operations,09:58,") /* Round Data export part 2 (behaviour; the Employee ID column) */ && l.endsWith('"A,P,P,P,L",Late')) && !csv.some((l) => l.includes("Divya")), j(csv.filter((l) => l.startsWith("Vikram"))));
type("zzz");
csv = await exportCsv();
check("X4", "no matches: header only (the empty-state row is skipped)", j(csv) === j(["Employee,Employee ID,Department,Check-in,Hours,This week,Status"]) /* Round Data export part 2 (behaviour; the Employee ID column) */, j(csv));

section("Guard, old session, no innerHTML with data");
const STATIC_MAIN = new JSDOM(HTML).window.document.querySelector("main").innerHTML;
const sameMain = () => d.querySelector("main").innerHTML.replaceAll(' hidden=""', "") === STATIC_MAIN;
// Round Manager scoping part 2 (behaviour; was: Kabir sent to 403 too: he is Meera's manager, so he opens it and sees Meera only (mgrscope.mjs T))
for (const who of ["kabir", "arjun"]) {
  await at(2026, 9, 29, 11, 0, who);
  if (who === "kabir") { check("G", "kabir (no attendance:view-all, but Meera's manager): opens it, and the rows are Meera alone", navigations.length === 0 && j(names()) === j(["Meera Joshi"]), j([navigations.length, names()])); continue; }
  check("G", `${who} (no attendance:view-all): guard sends them to 403, page script draws nothing`, navigations.length === 1 && /403|navigation/i.test(navigations[0]) && sameMain() && $("team-date").value === "", `nav=${navigations.length}`);
}
await at(2026, 9, 29, 11, 0, "aarav");
check("G3", "Admin can use it (has attendance:view-all)", names().length === 9 && navigations.length === 0);
await at(2026, 9, 29, 11, 0, "old");
check("G4", "old session (no employee id): the static page is left alone", sameMain() && txt($("team-rows")) === "No attendance to show." && jsErrors.length === 0);
check("G5", "static page has no fake people, dates or numbers", !/Rohan|Divya|Rahul|Neha|248|231|2026-09-18|95%/.test(HTML.slice(HTML.indexOf('<main'))));
check("I1", "page script never uses innerHTML / outerHTML / insertAdjacentHTML", !/innerHTML|outerHTML|insertAdjacentHTML/.test(SCRIPT));
check("I2", "at run time no HTML string written by any script contained a person's name or id", !htmlWrites.some((h) => /EMP-\d|Mehta|Nair|Kapoor|Singh|Joshi|Gupta|Iyer|Shah|Rao|Khan/.test(h)), `${htmlWrites.length} writes, all from sidebar.js (fixed nav labels) and toast.js (fixed messages)`);
// A name with markup is shown as text, never parsed.
await at(2026, 9, 29, 11, 0);
const evil = S.addUser(USER_ACTOR("admin", null), { name: '<img src=x onerror="window.pwned=1">Eve', email: "eve@northwind.com", department: "ENG", designation: "Software Engineer", role: "emp", status: "active" });
await open("priya");
check("I3", "a name containing markup renders as text (no <img> created) in the table and Needs attention", evil.ok && !d.querySelector("#team-rows img, #team-attention img") && txt($("team-rows")).includes('<img src=x onerror="window.pwned=1">Eve') && attention().some((a) => a.startsWith("<img")) && !w.pwned);
check("E1", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
