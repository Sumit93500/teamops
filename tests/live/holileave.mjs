// usage: node holileave.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 10O: holidays and leave balances (10N). ./js-pre10O, ./html-pre10O and ./css-pre10O are the code, pages and css
// before this round (office-os 81e43ee).
//   A  fix 1: a leave request's days in a period are always counted live (leave-store.js daysIn), so a holiday added
//      inside approved or pending leave gives the day back, the same as a request crossing a boundary and payroll
//   B  fix 2: a holiday dated before today (the local calendar day) can't be removed; today's and later ones can, and
//      adding a past one still works
//   C  scope: payroll, attendance's day-off reads, the stored `days`, applyLeave: as before (the pre-10O store side by side)
//   P  the pages: holidays.html shows the refusal; my-leave.html still shows the stored days
//   X  scope: exactly leave-store.js and holidays.js, only 10O's lines
// A movable clock: at(iso, hh, mm) sets local time; the seed is made at Mon 2 Nov 2026 08:00.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const at = (iso, h = 10, m = 0) => { const [y, mo, d] = iso.split("-").map(Number); NOW = new RealDate(y, mo - 1, d, h, m, 0).getTime(); };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const AARAV = "EMP-1001", PRIYA = "EMP-1003", ROHAN = "EMP-1042", ARJUN = "EMP-1105";
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
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const res = (r) => (r.ok ? [true] : [false, r.error, r.field ?? null]);

const H = await import("./js/data/holidays.js");
const HOL_ACTOR = "EMP-1003";   // Round 10W (signature; was addHoliday(fields) / removeHoliday(id)): the holiday writes take the acting person's id first and check their record (holidays:manage); every call here passes HR's (Priya). The guard itself: holiguard.mjs
const L = await import("./js/data/leave-store.js");
const A = await import("./js/data/attendance-store.js");
const P = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
// The stores before 10O: a second copy, on the same storage.
const H0 = await import("./js-pre10O/data/holidays.js");
const L0 = await import("./js-pre10O/data/leave-store.js");
const A0 = await import("./js-pre10O/data/attendance-store.js");
const P0 = await import("./js-pre10O/data/payroll-store.js");

function fresh(iso = "2026-11-02", h = 8) {
  globalThis.localStorage = MEM; mem.clear(); if (w) w.localStorage.clear();
  at(iso, h);
  A.allRegularizations(); A.teamFor(iso); L.allRequests(); H.getAllHolidays();   // seed every collection at the seed moment
}
// Approve a pending leave request through its stages (the manager, then HR).
function approve(id) {
  for (let i = 0; i < 2 && L.getRequest(id).status === "pending"; i++) {
    const r = L.getRequest(id); const who = r.stage === "manager" && r.managerId ? r.managerId : PRIYA;
    L.decideLeave(id, who, S.getUser(who).role, "approve");
  }
  return L.getRequest(id).status;
}
const apply = (who, type, from, to, duration = "full") => L.applyLeave(who, { type, from, to, duration, reason: "Round 10O" });
const casual = (who, y = 2026) => L.balanceFor(who, y).casual;
const holidayId = (name) => H.getAllHolidays().find((h) => h.name === name)?.id;
// Round 13R (behaviour; round-13q-scoping.md Q3: D): the refusal writes the date as the pages do, "20 Oct 2026"
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pastMsg = (date) => `Can't remove a past holiday (${Number(date.slice(8, 10))} ${MON[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}).`;

// =====================================================================
section("A. Fix 1: leave balances count a request's days live");
fresh();
at("2026-11-03");
const a1big = apply(ARJUN, "casual", "2026-11-23", "2026-11-27"); approve(a1big.record.id);
const a1 = apply(ARJUN, "casual", "2026-11-16", "2026-11-18"); approve(a1.record.id);
const a1before = casual(ARJUN);
H.addHoliday(HOL_ACTOR, { date: "2026-11-17", name: "Late-announced holiday", kind: "company" });
const a1after = casual(ARJUN);
check("A1", "10N's case (B2): Arjun's approved 16–18 Nov casual (stored 3), HR adds 17 Nov as a holiday: the day is given back (approved 10 -> 9); the stored days stay 3",
  a1before.approved === 10 && a1after.approved === 9 && L.getRequest(a1.record.id).days === 3 && A.dayFor(ARJUN, "2026-11-17").status === "holiday", j([a1before, a1after]));
const a2 = apply(ARJUN, "casual", "2026-12-01", "2026-12-02");
check("A2", "…and the 2-day request 10N saw refused (1 of 12 free) now goes through (2 free)", a2.ok && a2.record.days === 2, j(res(a2)));
fresh();
at("2026-11-03");
const a3 = apply(ARJUN, "casual", "2026-11-16", "2026-11-18");
const a3before = casual(ARJUN).pending;
H.addHoliday(HOL_ACTOR, { date: "2026-11-17", name: "Late-announced holiday", kind: "company" });
check("A3", "a PENDING request counts the same way: pending 3 -> 2 when a holiday lands inside it", a3before - casual(ARJUN).pending === 1 && L.getRequest(a3.record.id).status === "pending", j([a3before, casual(ARJUN).pending]));
const a4 = H.removeHoliday(HOL_ACTOR, holidayId("Late-announced holiday"));   // still in the future, so it can be removed
check("A4", "the rule runs both ways: removing that (future) holiday charges the day again (pending back to 3)", a4.ok && casual(ARJUN).pending === a3before, j([res(a4), casual(ARJUN).pending]));
fresh();
at("2026-12-20");
const a5 = apply(ROHAN, "casual", "2026-12-31", "2027-01-01"); approve(a5.record.id);
const a5b = [casual(ROHAN, 2026).approved, casual(ROHAN, 2027).approved];
H.addHoliday(HOL_ACTOR, { date: "2027-01-01", name: "New Year", kind: "company" });
const a5a = [casual(ROHAN, 2026).approved, casual(ROHAN, 2027).approved];
const a5pre = [L0.balanceFor(ROHAN, 2026).casual.approved, L0.balanceFor(ROHAN, 2027).casual.approved];
check("A5", "a request crossing a year is unchanged by 10O: 31 Dec – 1 Jan, 1 Jan made a holiday: 2026 stays 1, 2027 1 -> 0, the same as the pre-10O store",
  j(a5b) === j([1, 1]) && j(a5a) === j([1, 0]) && j(a5pre) === j(a5a), j([a5b, a5a, a5pre]));
fresh();
at("2026-11-03");
const a6 = apply(ARJUN, "wfh", "2026-11-18", "2026-11-19"); approve(a6.record.id);
const wfh = () => L.balanceFor(ARJUN, 2026, 11).wfh.approved;
const a6b = wfh();
H.addHoliday(HOL_ACTOR, { date: "2026-11-19", name: "Mid-wfh holiday", kind: "company" });
check("A6", "a monthly type (work from home) too: 18–19 Nov inside November, 19 Nov made a holiday: November's approved wfh 2 -> 1", a6b === 2 && wfh() === 1, j([a6b, wfh()]));
fresh();
at("2026-11-03");
const a7 = apply(ARJUN, "casual", "2026-11-20", "2026-11-20", "first-half"); approve(a7.record.id);
const a7b = casual(ARJUN).approved;
H.addHoliday(HOL_ACTOR, { date: "2026-11-20", name: "Friday off", kind: "company" });
const a7a = casual(ARJUN).approved;
check("A7", "a half day: 0.5 on a working day, 0 once that day is a holiday (the duration is kept)", a7b - a7a === 0.5 && L.getRequest(a7.record.id).days === 0.5, j([a7b, a7a]));
fresh();
at("2026-11-20");
const people = S.getAllUsers().map((u) => u.id);
const grid = (X) => people.flatMap((id) => [2026, 2027].map((y) => X.balanceFor(id, y, 10)));
check("A8", "with no holiday changed, every balance (every person, both years, October for wfh) equals the pre-10O store's: the seed's stored days are its working days",
  j(grid(L)) === j(grid(L0)), `${people.length} people`);
fresh();
at("2026-11-03");
const a9 = apply(ARJUN, "casual", "2026-11-09", "2026-11-13");
const a9pre = L0.workingDays("2026-11-09", "2026-11-13");
check("A9", "applyLeave still stores days as before (Mon–Fri: 5), and the allowance check is unchanged (12 casual: 2 approved + 1 pending + 5)",
  a9.ok && a9.record.days === 5 && a9pre === 5 && j(casual(ARJUN)) === j(L0.balanceFor(ARJUN, 2026).casual), j([casual(ARJUN), L0.balanceFor(ARJUN, 2026).casual]));

// =====================================================================
section("B. Fix 2: a past holiday can't be removed");
fresh();
at("2026-11-20");
const runs0 = j(["EMP-1001", "EMP-1003", "EMP-1008", ARJUN].map((id) => P.payrollRunFor(id, 2026, 10)?.net));
const dz = holidayId("Dussehra");
const raw0 = localStorage.getItem("officeos:holidays");
const b1 = H.removeHoliday(HOL_ACTOR, dz);
check("B1", "10N's case: removing Dussehra (20 Oct) on 20 Nov is refused, naming the date; nothing stored; 20 Oct still a holiday; October's payslips unchanged",
  j(res(b1)) === j([false, pastMsg("2026-10-20"), null]) && localStorage.getItem("officeos:holidays") === raw0 && A.dayFor(ARJUN, "2026-10-20").status === "holiday"
  && j(["EMP-1001", "EMP-1003", "EMP-1008", ARJUN].map((id) => P.payrollRunFor(id, 2026, 10)?.net)) === runs0, j(res(b1)));
fresh();
at("2026-11-20");
H.addHoliday(HOL_ACTOR, { date: "2026-11-19", name: "Yesterday", kind: "company" });
H.addHoliday(HOL_ACTOR, { date: "2026-11-20", name: "Today", kind: "company" });
H.addHoliday(HOL_ACTOR, { date: "2026-11-21", name: "Tomorrow", kind: "company" });
check("B2", "the boundary: yesterday's refused; today's and tomorrow's can be removed",
  j(res(H.removeHoliday(HOL_ACTOR, holidayId("Yesterday")))) === j([false, pastMsg("2026-11-19"), null]) && H.removeHoliday(HOL_ACTOR, holidayId("Today")).ok && H.removeHoliday(HOL_ACTOR, holidayId("Tomorrow")).ok);
check("B3", "far ahead (Christmas, 25 Dec) can be removed too", H.removeHoliday(HOL_ACTOR, holidayId("Christmas")).ok);
fresh();
at("2026-11-20");
H.addHoliday(HOL_ACTOR, { date: "2026-11-24", name: "Day X", kind: "company" });
at("2026-11-24", 23, 30);
const b4late = H.removeHoliday(HOL_ACTOR, holidayId("Day X"));
fresh();
at("2026-11-20");
H.addHoliday(HOL_ACTOR, { date: "2026-11-24", name: "Day X", kind: "company" });
at("2026-11-25", 0, 30);
const b4early = H.removeHoliday(HOL_ACTOR, holidayId("Day X"));
check("B4", `the local calendar decides, in every zone (TZ=${process.env.TZ ?? "system"}): at 23:30 on 24 Nov its holiday is still today's and can go; at 00:30 on 25 Nov it's past and can't`,
  b4late.ok && j(res(b4early)) === j([false, pastMsg("2026-11-24"), null]), j([res(b4late), res(b4early)]));
fresh();
at("2026-11-20");
check("B5", "adding a past holiday still works (it only turns absences into holidays): 15 Oct",
  H.addHoliday(HOL_ACTOR, { date: "2026-10-15", name: "Past add", kind: "company" }).ok && A.dayFor("EMP-1088", "2026-10-15").status === "holiday");
check("B6", "an unknown id is still the collection's own refusal", j(res(H.removeHoliday(HOL_ACTOR, "HOL-999"))) === j([false, "No record with id HOL-999.", null]));
H.resetHolidays();
check("B7", "resetHolidays still puts back the 7 seeded dates (past ones included)", H.getAllHolidays().length === 7 && !!holidayId("Dussehra"));

// =====================================================================
section("C. Scope: nothing else moved");
fresh();
at("2026-11-03");
const c1 = apply(ROHAN, "unpaid", "2026-11-10", "2026-11-12"); approve(c1.record.id);
H.addHoliday(HOL_ACTOR, { date: "2026-11-11", name: "Mid-unpaid holiday", kind: "company" });
check("C1", "payroll's own unpaid count is as before (it was already live): Rohan's November unpaid days and net equal the pre-10O payroll's; the leave balance now agrees with it (2)",
  P.unpaidLeaveDays(ROHAN, 2026, 11) === 2 && P0.unpaidLeaveDays(ROHAN, 2026, 11) === 2 && P.payrollRunFor(ROHAN, 2026, 11).net === P0.payrollRunFor(ROHAN, 2026, 11).net
  && L.balanceFor(ROHAN, 2026).unpaid.approved === 2, j([P.unpaidLeaveDays(ROHAN, 2026, 11), L.balanceFor(ROHAN, 2026).unpaid.approved]));
fresh();
at("2026-11-20");
H.addHoliday(HOL_ACTOR, { date: "2026-12-04", name: "Future", kind: "company" });
const days = Array.from({ length: 80 }, (_, i) => H.isoFromDayNumber(H.dayNumber("2026-10-01") + i));
check("C2", "attendance's day-off reads are as before: isDayOff and dayOffChecker agree with the pre-10O holidays.js for 80 days; teamFor and October's months match",
  days.every((x) => H.isDayOff(x) === H0.isDayOff(x) && H.dayOffChecker()(x) === H0.dayOffChecker()(x))
  && j(A.summaryRange("2026-10-01", "2026-10-31")) === j(A0.summaryRange("2026-10-01", "2026-10-31")) && j([ARJUN, ROHAN].map((id) => A.monthFor(id, 2026, 10))) === j([ARJUN, ROHAN].map((id) => A0.monthFor(id, 2026, 10))));
// Round 11W (shape): payrollRunFor's attendance block gains pausedLateMarks (G4's pause); the code compared with has
// none, so it's left out here (every figure is still compared).
const noPause = (row) => (row?.attendance ? { ...row, attendance: Object.fromEntries(Object.entries(row.attendance).filter(([k]) => k !== "pausedLateMarks")) } : row);
const noPauseRun = (run) => (run ? { ...run, rows: run.rows.map(noPause) } : run);
{ const r = A.decideRegularization("RG-102", "EMP-1003", "hr", "reject", "Decided before the clock (round 11W)"); if (!r.ok) throw new Error(`round 11W restage, RG-102: ${r.error}`); }   // Round 11W (restage): RG-102 rejected at C3's clock, after C2
check("C3", "payroll for every person, October and November, equals the pre-10O payroll's (same storage)", people.every((id) => j(noPause(P.payrollRunFor(id, 2026, 10))) === j(P0.payrollRunFor(id, 2026, 10)) && j(noPause(P.payrollRunFor(id, 2026, 11))) === j(P0.payrollRunFor(id, 2026, 11))));
const ids = L.allRequests().map((r) => `${r.id}:${r.days}`);
check("C4", "no stored `days` is rewritten by a holiday change (the requests' stored days are byte-identical to before it)", (() => { const before = localStorage.getItem("officeos:leave-requests"); H.addHoliday(HOL_ACTOR, { date: "2026-12-07", name: "Another", kind: "company" }); return localStorage.getItem("officeos:leave-requests") === before; })(), ids.slice(0, 3).join(" "));

// =====================================================================
section("P. The pages");
fresh();
at("2026-11-20");
await open("leave/holidays", "holidays", "priya");
const rowOf = (name) => [...d.querySelectorAll(".list__item")].find((r) => txt(r)?.includes(name));
const removeBtn = (name) => d.querySelector(`button[aria-label="Remove ${name}"]`);
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${t.className.replace("toast toast--", "")}:${txt(t.querySelector(".toast__text"))}`);
// Round 13R (behaviour; round-13q-scoping.md Q3 / Q4.4: H): a past row has no Remove (it was offered, then refused);
// the refusal itself stays pinned in B1 / B2 / B4 and holipast.mjs R
check("P1", "holidays.html as HR: Dussehra (past) still listed, with no Remove button (13R); nothing to click, no toast",
  removeBtn("Dussehra") === null && !!rowOf("Dussehra") && !!holidayId("Dussehra") && toasts().length === 0, j(toasts()));
d.querySelectorAll(".toast").forEach((t) => t.remove());
removeBtn("Christmas")?.click();
check("P2", "…Remove on Christmas (future) works: 'Holiday removed.', gone from the list", toasts().some((t) => t === "success:Holiday removed.") && !holidayId("Christmas"), j(toasts()));
fresh();
at("2026-11-03");
const pv = apply(ARJUN, "casual", "2026-11-16", "2026-11-18"); approve(pv.record.id);
H.addHoliday(HOL_ACTOR, { date: "2026-11-17", name: "Late-announced holiday", kind: "company" });
await open("leave/my-leave", "my-leave", "arjun");
const pRow = [...d.querySelectorAll("tbody tr")].map((tr) => [...tr.children].map((td) => txt(td))).find((r) => r.some((c) => /18 Nov/.test(c ?? "")));
check("P3", "my-leave.html still shows the stored days for 16–18 Nov (3, what was asked for), with the holiday inside it", !!pRow && pRow.includes("3"), j(pRow));
check("P4", "no JS errors on either page", allJsErrors.length === 0, allJsErrors.join(" | "));

// =====================================================================
section("X. Scope: exactly 10O's lines");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
// Round 10R (layout; was the live js vs js-pre10O, here and in X1 / X3 / X4): 10O's own change set, read from its frozen
// result (js-pre10R = HEAD 080b36b); the live js has 10R's slab note since (taxnote.mjs X1 / X5)
const changedJs = walk(`${HERE}js-pre10R`).filter((f) => SRC("js-pre10R", f) !== SRC("js-pre10O", f)).sort();
// Round 11B (layout; was the live pages, here and in the check below): this round's own page claim, read from its
// frozen result (html-pre11B = HEAD 97e1e6c); the live pages have 11B's sessions.html banner since (acctpages.mjs X2)
const changedHtml = walk(`${HERE}html-pre11B`).filter((f) => fs.readFileSync(`${HERE}html-pre11B/${f}`, "utf8") !== fs.readFileSync(`${HERE}html-pre10O/${f}`, "utf8"));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre10O", f)) : [];
const FILES = ["data/holidays.js", "data/leave-store.js"];
check("X1", "js changed: exactly data/holidays.js and data/leave-store.js; nothing added or removed", j(changedJs) === j(FILES) && j(walk(`${HERE}js-pre10R`).sort()) === j(walk(`${HERE}js-pre10O`).sort()), j(changedJs));
check("X2", "no page and no css changed; nothing added or removed", changedHtml.length === 0 && changedCss.length === 0 && j(walk(`${HERE}html-pre11B`).sort()) === j(walk(`${HERE}html-pre10O`).sort()), j([changedHtml, changedCss]));
check("X3", "the two are CRLF only, with no final newline", changedJs.map((f) => SRC("js-pre10R", f)).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
const count = (s) => s.split("\r\n").reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
const delta = Object.fromEntries(FILES.map((f) => {
  const a = count(SRC("js-pre10O", f)), b = count(SRC("js-pre10R", f));
  const removed = [...a].flatMap(([l, n]) => Array(Math.max(0, n - (b.get(l) ?? 0))).fill(l)).sort();
  const added = [...b].reduce((t, [l, n]) => t + Math.max(0, n - (a.get(l) ?? 0)), 0);
  return [f, { removed, added }];
}));
const WANT = {
  "data/holidays.js": { removed: [], added: 12 },
  "data/leave-store.js": { removed: [
    "// its stored days; one that crosses into another period counts the working days",
    "// of its part here (a half day is one date, so it never crosses).",
    "// The days of a request that fall in a period. A request wholly inside it counts",
    "  if (request.from >= start && request.to <= end) return Number(request.days) || 0;",
  ].sort(), added: 4 },
};
check("X4", "…and within them, only 10O's lines (leave-store: the shortcut and its old comment out, the new comment in; holidays: the check, its helper and comments in)", j(delta) === j(WANT), j(delta));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
