// usage: node emptyrange.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// React round 5 (D: Empty ranges), from round Empty ranges (JS stage), in jsdom with the js in ./js. The data rules only: sections D and S;
// the drawing helpers (U) and the pages (P) come with the React pages that show the message. "No data in this range.":
//   S  the stores: recordsStart() (the first day with attendance data) and runMonthState() (a payroll month with no data: before records,
//      after the current payroll month; a stored run never empty)
//      line after the chart hidden with it, the block after the line), noDataRow(), setStatNoData(), NO_DATA
//   E99 no js errors
// The clock is local wall time (Mon 28 Sep 2026 10:00); storage is in memory, seeded when first read.
import path from "path";
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const read = (...p) => (fs.existsSync(path.join(...p)) ? fs.readFileSync(path.join(...p), "utf8") : "");

const RealDate = Date;
const NOW = new RealDate(2026, 8, 28, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const SESS = { admin: ["admin", "Aarav Mehta", "EMP-1001"], hr: ["hr", "Priya Nair", "EMP-1003"], fin: ["fin", "Kabir Shah", "EMP-1008"], emp: ["emp", "Arjun Kapoor", "EMP-1105"],
  mgr: ["emp", "Sneha Rao", "EMP-1029"], nina: ["emp", "Nina New", "EMP-1999"] };
const signIn = (who) => mem.set("officeos:session", JSON.stringify({ roleKey: SESS[who][0], userLabel: SESS[who][1], employeeId: SESS[who][2], signedInAt: NOW }));
const fresh = (who) => { mem.clear(); signIn(who); };
// A stored box, changed in place (the stores read it on the next call).
const edit = (key, fn) => { const box = JSON.parse(mem.get(`officeos:${key}`)); fn(box); mem.set(`officeos:${key}`, JSON.stringify(box)); };
const emptyOut = (key) => edit(key, (b) => { b.records = []; });

let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, query = "") {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) allJsErrors.push(`${page}${query}: ${e.message}`); });
  const html = read(DIR, `${page}.html`);
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, getComputedStyle: w.getComputedStyle.bind(w) });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`./js/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); }
  }
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} timer: ${e.message}`); } });
}
const change = (el, value) => { el.value = value; el.dispatchEvent(new w.Event("change")); timers.splice(0).forEach((fn) => fn()); };

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const MSG = "No data in this range.";
const $ = (id) => d.getElementById(id);

// A chart's state as drawn: hidden, and the message in the .empty block right after it (or neither).
function chartState(el) {
  const next = el?.nextElementSibling;
  const box = next && next.dataset.noData === "" ? next : null;
  return { found: !!el, hidden: !!el?.hidden, message: box ? txt(box.querySelector(".empty__text")) : null, boxClass: box?.className ?? null };
}
const chartEmpty = (el) => { const s = chartState(el); return s.found && s.hidden && s.message === MSG && s.boxClass === "empty"; };
const chartShown = (el) => { const s = chartState(el); return s.found && !s.hidden && s.message === null; };
// Stat cards: [value, note] of each.
const statsOf = (root) => [...(root?.querySelectorAll(".stat") ?? [])].map((s) => [txt(s.querySelector(".stat__value")), txt(s.querySelector(".stat__delta"))]);
const allNoData = (list) => list.length > 0 && list.every(([v, n]) => v === "–" && n === MSG);
// A table body that is exactly the one message row across every column.
function oneRow(tbody, columns) {
  const rows = [...(tbody?.querySelectorAll("tr") ?? [])];
  const td = rows[0]?.querySelector("td");
  return rows.length >= 1 && txt(td) === MSG && td?.colSpan === columns && td.className === "text-muted";
}

// =================================================================
section("D. chart-data.js: every function says whether it is empty");
fresh("admin"); await open("dashboard/admin");
const CD = await import("./js/data/chart-data.js");
const A = await import("./js/data/attendance-store.js");
const PS = await import("./js/data/payroll-store.js");
const IS = await import("./js/data/inventory-store.js");
const ES = await import("./js/data/expenses-store.js");
const today = "2026-09-28";
const shape = (c) => Array.isArray(c.labels) && Array.isArray(c.series) && c.series.every((s) => s.values.length === c.labels.length);
const flags = (c) => [c.empty, c.emptyReason];

const range14 = A.summaryRange("2026-09-15", today);
const rateLive = CD.attendanceRateChart(range14, today);
const rateNone = CD.attendanceRateChart(range14.map((s) => ({ ...s, present: 0, expected: 0 })), today);
const rateZeroPresent = CD.attendanceRateChart(range14.map((s) => ({ ...s, present: 0 })), today);
check("D1", "attendanceRateChart: nobody expected on any day -> empty, 'nobody-expected'; with someone expected (even if nobody came) -> not empty, reason null; an empty range -> empty",
  j(flags(rateNone)) === j([true, "nobody-expected"]) && j(flags(rateLive)) === j([false, null]) && rateZeroPresent.empty === false
  && CD.attendanceRateChart([], today).empty === true && shape(rateNone) && rateNone.labels.length === 14, j([flags(rateNone), flags(rateLive), rateZeroPresent.empty]));
const head = CD.headcountChart();
edit("users", (b) => b.records.forEach((u) => { u.status = "inactive"; }));
const headNone = CD.headcountChart();
fresh("admin"); await open("dashboard/admin");
check("D2", "headcountChart: someone active -> not empty; nobody active in any department -> empty, 'no-records', every department still labelled",
  j(flags(head)) === j([false, null]) && j(flags(headNone)) === j([true, "no-records"]) && headNone.labels.length === head.labels.length && headNone.total === 0, j([flags(head), flags(headNone)]));
const arjunDays = A.rangeFor("EMP-1105", "2026-09-15", today);
const day = (status, extra = {}) => ({ date: "2026-09-22", status, minutesWorked: null, inProgress: false, incomplete: false, checkIn: null, holiday: null, ...extra });
const hoursOf = (days) => flags(CD.hoursChart(days, today));
check("D3", "hoursChart: only days off / no-data / before joining / after leaving / not in yet -> empty, 'no-records'; a worked day, leave, an absence or a missing check-out -> not empty",
  j(hoursOf([day("weekend"), day("no-data"), day("not-joined"), day("left"), day("not-yet")])) === j([true, "no-records"])
  && hoursOf([day("present", { minutesWorked: 480 })])[0] === false && hoursOf([day("on-leave")])[0] === false && hoursOf([day("absent")])[0] === false
  && hoursOf([day("present", { incomplete: true, checkIn: "09:30" })])[0] === false && j(hoursOf(arjunDays)) === j([false, null]),
  j([hoursOf([day("no-data")]), hoursOf(arjunDays)]));
const bal = CD.leaveBalanceChart("EMP-1105", 2026, 9);
check("D4", "leaveBalanceChart is never empty (the policy's allowances): empty false, reason null", j(flags(bal)) === j([false, null]), j(flags(bal)));
const leaveLive = CD.leaveRequestsChart(today, 14);
const leaveOld = CD.leaveRequestsChart("2021-03-31", 14);
check("D5", "leaveRequestsChart: no request sent on any day of the range -> empty, 'no-records', 14 days still labelled; requests sent -> not empty",
  j(flags(leaveOld)) === j([true, "no-records"]) && leaveOld.labels.length === 14 && j(flags(leaveLive)) === j([false, null]), j([flags(leaveOld), flags(leaveLive)]));
const claims = ES.allExpenses();
const spendLive = CD.expenseSpendChart(claims);
const spendNone = CD.expenseSpendChart([]);
const spendPending = CD.expenseSpendChart(claims.filter((c) => c.status === "pending"));
check("D6", "expenseSpendChart: no claims, or only pending ones (nothing approved or paid) -> empty, 'no-records'; approved or paid claims -> not empty",
  j(flags(spendNone)) === j([true, "no-records"]) && spendPending.empty === true && j(flags(spendLive)) === j([false, null]) && claims.length > 0, j([flags(spendNone), spendPending.empty, flags(spendLive), claims.length]));
const run = PS.payrollRun(2026, 9);
check("D7", "payrollByDepartmentChart: no gross pay in any department (no rows, or all on hold) -> empty, 'no-records'; this month's run -> not empty",
  j(flags(CD.payrollByDepartmentChart({ month: "2026-09", rows: [] }))) === j([true, "no-records"])
  && CD.payrollByDepartmentChart({ ...run, rows: run.rows.map((r) => ({ ...r, gross: 0 })) }).empty === true && j(flags(CD.payrollByDepartmentChart(run))) === j([false, null]),
  j(flags(CD.payrollByDepartmentChart(run))));
const items = IS.allItems();
check("D8", "inventoryValueChart: no items, or none in stock -> empty, 'no-records'; the store's items -> not empty",
  j(flags(CD.inventoryValueChart([]))) === j([true, "no-records"]) && CD.inventoryValueChart(items.map((i) => ({ ...i, stock: 0, value: 0 }))).empty === true
  && j(flags(CD.inventoryValueChart(items))) === j([false, null]), j(flags(CD.inventoryValueChart(items))));
const doneDays = [day("present"), day("late"), day("absent")];
check("D9", "monthAttendanceChart: no working day done -> empty, 'no-records', its five labels kept and total 0; days done -> not empty",
  j(flags(CD.monthAttendanceChart([]))) === j([true, "no-records"]) && CD.monthAttendanceChart([]).labels.length === 4 && CD.monthAttendanceChart([]).total === 0
  && j(flags(CD.monthAttendanceChart(doneDays))) === j([false, null]), j(CD.monthAttendanceChart([]).labels));
check("D10", "taxRegimeChart: nobody in the run with a salary (a regime) -> empty, 'no-records'; this month's run -> not empty",
  j(flags(CD.taxRegimeChart({ rows: [] }))) === j([true, "no-records"]) && CD.taxRegimeChart({ rows: run.rows.map((r) => ({ ...r, regime: null })) }).empty === true
  && j(flags(CD.taxRegimeChart(run))) === j([false, null]), j(flags(CD.taxRegimeChart(run))));
const teamRows = (date) => A.teamFor(date).map((dd) => ({ day: dd, user: null })).map((r) => ({ ...r, user: { department: null } }));
const presOld = CD.departmentPresenceChart("2020-01-06", A.teamFor("2020-01-06").map((dd) => ({ day: dd, user: { department: "ENG" } })), null);
const presToday = CD.departmentPresenceChart(today, A.teamFor(today).map((dd) => ({ day: dd, user: { department: "ENG" } })), null);
const presSunday = CD.departmentPresenceChart("2026-09-27", A.teamFor("2026-09-27").map((dd) => ({ day: dd, user: { department: "ENG" } })), null);
// a past working day on which everyone was expected and nobody came: that is data (a 0% day), not an empty range
const presAbsent = CD.departmentPresenceChart("2026-09-25", A.teamFor("2026-09-25").map((dd) => ({ day: { ...dd, status: "absent", checkIn: null, checkOut: null, minutesWorked: null }, user: { department: "ENG" } })), null);
check("D11", "departmentPresenceChart: nobody expected in any department (before records; a Sunday) -> empty, 'nobody-expected', every department labelled; today, and a day everyone was absent (0%) -> not empty",
  j(flags(presOld)) === j([true, "nobody-expected"]) && presSunday.empty === true && presOld.labels.length === 6 && j(flags(presToday)) === j([false, null]) && j(flags(presAbsent)) === j([false, null]) && teamRows(today).length > 0,
  j([flags(presOld), flags(presSunday), flags(presToday), flags(presAbsent)]));
const allCharts = [rateLive, rateNone, head, headNone, bal, leaveLive, leaveOld, spendLive, spendNone, CD.payrollByDepartmentChart(run), CD.inventoryValueChart(items), CD.monthAttendanceChart([]), CD.taxRegimeChart(run), presOld, presToday];
check("D12", "every chart has both fields, empty a boolean and emptyReason null exactly when not empty; labels and series kept either way",
  allCharts.every((c) => typeof c.empty === "boolean" && (c.empty ? typeof c.emptyReason === "string" : c.emptyReason === null) && shape(c)), j(allCharts.map(flags)));

// =================================================================
section("S. The stores");
// Crash-safe on a build without them (pristine): a missing helper fails its checks, the run goes on.
const fn = (mod, name, fallback) => (typeof mod[name] === "function" ? mod[name] : fallback);
const recordsStart = fn(A, "recordsStart", () => null);
const runMonthState = fn(PS, "runMonthState", () => ({}));
const recs = JSON.parse(mem.get("officeos:attendance")).records.map((r) => r.date).sort();
const start = recordsStart() ?? "0000-00-00";
check("S1", "recordsStart() is the earliest attendance record's date; the day before it is 'no-data' for everyone, the day itself is not",
  start === recs[0] && A.teamFor(start).every((dd) => dd.status !== "no-data") && (() => { const prev = new RealDate(`${start}T12:00:00`); prev.setDate(prev.getDate() - 1); const iso = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`; return A.teamFor(iso).every((dd) => ["no-data", "weekend", "holiday"].includes(dd.status)); })(),
  j([start, recs[0]]));
const st = (y, m) => runMonthState(y, m, today) ?? null;
check("S2", "runMonthState(): a month before records -> empty 'before-records'; after the current payroll month -> empty 'after-current'; the first month with records and the current month -> not empty; firstMonth and currentMonth given; not a month -> null",
  j([st(2020, 1)?.empty, st(2020, 1)?.emptyReason]) === j([true, "before-records"]) && j([st(2026, 8)?.empty, st(2026, 8)?.emptyReason]) === j([true, "before-records"])
  && j([st(2026, 10)?.empty, st(2026, 10)?.emptyReason]) === j([true, "after-current"]) && st(2027, 3)?.emptyReason === "after-current"
  && j(st(2026, 9)) === j({ empty: false, emptyReason: null, firstMonth: start.slice(0, 7), currentMonth: "2026-09" }) && st(2026, 13) === null,
  j([st(2020, 1), st(2026, 10), st(2026, 9)]));
// a prepared run stored for a month before records (the payroll-runs box, version 1, as payroll-store.js keeps it)
const storedBox = { version: 1, nextNum: 2, records: [{ id: "PR-1", month: "2020-01", status: "prepared", preparedBy: "EMP-1008", preparedAt: "2026-09-28T04:30:00.000Z", approvedBy: null, rows: [], totals: { gross: 0, deductions: 0, net: 0, lossOfPay: 0 } }] };
const keepRuns = mem.get("officeos:payroll-runs");
mem.set("officeos:payroll-runs", JSON.stringify(storedBox));
const storedState = st(2020, 1);
if (keepRuns === undefined) mem.delete("officeos:payroll-runs"); else mem.set("officeos:payroll-runs", keepRuns);
check("S3", "a month with a stored (prepared or approved) run is never empty, even before records", storedState?.empty === false && storedState.emptyReason === null, j(storedState));

check("E99", "no js errors on any page", allJsErrors.length === 0, j(allJsErrors.slice(0, 5)));
console.log(`\n${passed} passed, ${failed} failed`);
