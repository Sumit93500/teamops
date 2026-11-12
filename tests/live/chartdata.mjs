// usage: node chartdata.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round Chart data (JS stage), in jsdom with the js in ./js. data/chart-data.js: one data function per chart, one shape, and the pages draw it.
//   S1 every function returns the shape: title and unit (text), labels, series [{ name, values }] each as long as labels, values plain numbers or
//      null (never text), marks (where given) as long as labels
//   V  each function's values against the stores, worked out here from the stores' own functions and records (not from chart-data.js)
//   D  each page draws exactly what its function returns: the labels, the bar heights and widths, the values printed beside them
//   R  scope: a manager (Sneha) sees only her reports' departments, counted over her reports alone; an Employee with no reports (Arjun) opens none of
//      the team pages (403, no chart drawn) and his own dashboard charts only his days; HR on the admin dashboard sees Admin's charts
//   E99 no js errors
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const RealDate = Date;
const NOW = new RealDate(2026, 8, 28, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;
const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const WHO = { aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"], kabir: ["fin", "Kabir Shah", "EMP-1008"], sneha: ["emp", "Sneha Rao", "EMP-1029"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"] };
let loads = 0, w, d, navigations = 0;
const allJsErrors = [];
async function open(page, who, query = "") {
  mem.clear(); mem.set("officeos:session", JSON.stringify({ roleKey: WHO[who][0], userLabel: WHO[who][1], employeeId: WHO[who][2], signedInAt: NOW }));
  const vc = new VirtualConsole(); timers = []; navigations = 0;
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations++; else allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(path.join(DIR, `${page}.html`), "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, getComputedStyle: w.getComputedStyle.bind(w) });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) { try { await import(`./js/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); } }
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} timer: ${e.message}`); } });
}
console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const num = (s) => Number(String(s).replace(/[₹,%\s]/g, ""));
const tryImport = async (p) => { try { return await import(p); } catch (e) { allJsErrors.push(`import ${p}: ${e.message}`); return {}; } };
await open("dashboard/admin", "aarav");   // seeds the stores
const CD = await tryImport("./js/data/chart-data.js");
const AS = await tryImport("./js/data/attendance-store.js");
const H = await tryImport("./js/data/holidays.js");
const LS = await tryImport("./js/data/leave-store.js");
const S = await tryImport("./js/data/store.js");
const PS = await tryImport("./js/data/payroll-store.js");
const IS = await tryImport("./js/data/inventory-store.js");
const LV = await tryImport("./js/ui/leave-view.js");
// A missing or failing function gives an empty chart, so the checks fail rather than crash (S1 names it: no title).
const EMPTY = () => ({ title: "", unit: "", labels: [], series: [], marks: [], keys: [], total: 0, period: {} });
const call = (fn, ...a) => { try { return typeof CD[fn] === "function" ? CD[fn](...a) : EMPTY(); } catch (e) { allJsErrors.push(`${fn}: ${e.message}`); return EMPTY(); } };
const vals = (chart, name) => chart?.series?.find((s) => s.name === name)?.values ?? [];
const today = LV.todayIso?.() ?? "2026-09-28";
const box = (k) => JSON.parse(mem.get(k) ?? '{"records":[]}').records;

// Every chart, built here as its page builds it (the inputs are the stores' own functions)
function charts() {
  const { year, month } = PS.runMonth(today);
  const run = PS.payrollRun(year, month);
  const arjunDays = AS.rangeFor("EMP-1105", H.addDays(today, -13), today) ?? [];
  const done = (AS.monthFor("EMP-1105", Number(today.slice(0, 4)), Number(today.slice(5, 7)))?.days ?? []).filter((dd) => dd.date <= today && !["weekend", "holiday", "no-data", "not-joined", "left", "not-yet"].includes(dd.status));
  const team = AS.teamWeekFor(today).map((r) => ({ ...r, user: S.getUser(r.day.userId) }));
  return {
    attendanceRateChart: call("attendanceRateChart", AS.summaryRange(H.addDays(today, -13), today), today),
    headcountChart: call("headcountChart"),
    hoursChart: call("hoursChart", arjunDays, today),
    leaveBalanceChart: call("leaveBalanceChart", "EMP-1105", Number(today.slice(0, 4)), Number(today.slice(5, 7))),
    leaveRequestsChart: call("leaveRequestsChart", today, 14),
    expenseSpendChart: call("expenseSpendChart", box("officeos:expense-claims")),
    payrollByDepartmentChart: call("payrollByDepartmentChart", run),
    inventoryValueChart: call("inventoryValueChart", IS.allItems()),
    monthAttendanceChart: call("monthAttendanceChart", done),
    taxRegimeChart: call("taxRegimeChart", run),
    departmentPresenceChart: call("departmentPresenceChart", today, team, null),
    _run: run, _arjunDays: arjunDays, _done: done, _team: team,
  };
}

section("S. The shape");
let C = charts();
const NAMES = Object.keys(C).filter((k) => !k.startsWith("_"));
const shapeBad = NAMES.filter((k) => { const c = C[k];
  return !c || typeof c.title !== "string" || !c.title || typeof c.unit !== "string" || !Array.isArray(c.labels) || !Array.isArray(c.series) || !c.series.length
    || !c.series.every((s) => typeof s.name === "string" && Array.isArray(s.values) && s.values.length === c.labels.length && s.values.every((v) => v === null || (typeof v === "number" && Number.isFinite(v))))
    || (c.marks !== undefined && (!Array.isArray(c.marks) || c.marks.length !== c.labels.length)); });
check("S1", `every chart function (${NAMES.length}) returns { title, unit, labels, series: [{ name, values }] }: each series as long as labels, values plain numbers or null, marks as long as labels`, NAMES.length === 11 && shapeBad.length === 0, j(shapeBad));
check("S2", "valuesOf(chart, name) reads a series by its name ([] for none)", typeof CD.valuesOf === "function" && j(CD.valuesOf({ series: [{ name: "A", values: [1] }] }, "A")) === j([1]) && j(CD.valuesOf({ series: [] }, "B")) === j([]));

section("V. The values, against the stores");
{ const c = C.attendanceRateChart, r = AS.summaryRange(H.addDays(today, -13), today);
  check("V1", "attendance rate: 14 days to today; Present and Expected as summaryRange() counts them, Rate their percent (null when nobody was expected)", !!c && c.labels.length === 14 && c.labels.at(-1) === today
    && j(vals(c, "Present")) === j(r.map((s) => s.present)) && j(vals(c, "Expected")) === j(r.map((s) => s.expected)) && j(vals(c, "Rate")) === j(r.map((s) => (s.expected ? Math.round((s.present / s.expected) * 100) : null))), j(vals(c, "Rate"))); }
{ const c = C.headcountChart, users = S.getAllUsers(), depts = S.getAllDepartments(); const counts = S.headcountByDepartment();
  check("V2", "headcount: every department in order, its count as headcountByDepartment() has it; the total the sidebar's (activeHeadcount())", !!c && j(c.labels) === j(depts.map((x) => x.name)) && j(vals(c, "Employees")) === j(depts.map((x) => counts[x.code] ?? 0)) && c.total === S.activeHeadcount() && users.length > 0, j([vals(c, "Employees"), c?.total, S.activeHeadcount()])); }
{ const c = C.hoursChart, days = C._arjunDays;
  const KINDS = ["off", "no-data", "not-joined", "left", "on-leave", "worked", "in-progress", "incomplete", "absent", "not-yet"];
  check("V3", "working hours (Arjun): his 14 days; Worked is each day's minutesWorked; every mark a known kind, a weekend or holiday 'off', a day with minutes 'worked' or 'in-progress'", !!c && c.labels.length === 14 && j(vals(c, "Worked")) === j(days.map((x) => x.minutesWorked))
    && c.marks.every((m, i) => KINDS.includes(m.kind) && (["weekend", "holiday"].includes(days[i].status) ? m.kind === "off" : days[i].minutesWorked !== null ? ["worked", "in-progress"].includes(m.kind) : true)), j(c?.marks.map((m) => m.kind))); }
{ const c = C.leaveBalanceChart, b = LS.balanceFor("EMP-1105", Number(today.slice(0, 4)), Number(today.slice(5, 7)));
  check("V4", "leave balance (Arjun): every type in policy order, Allowance, Approved, Pending and Left as balanceFor() has them, and each type's period", !!c && j(c.labels) === j(LS.LEAVE_TYPES) && ["allowance", "approved", "pending", "left"].every((f) => j(vals(c, f[0].toUpperCase() + f.slice(1))) === j(LS.LEAVE_TYPES.map((t) => b[t][f])))
    && j(c.marks.map((m) => m.per)) === j(LS.LEAVE_TYPES.map((t) => LS.LEAVE_POLICY[t].per)), j(vals(c, "Left"))); }
{ const c = C.leaveRequestsChart, reqs = box("officeos:leave-requests");
  check("V5", "leave requests per day: 14 days to today, each the requests sent (appliedOn) that day", !!c && c.labels.length === 14 && c.labels.at(-1) === today && j(vals(c, "Requests")) === j(c.labels.map((dt) => reqs.filter((r) => r.appliedOn === dt).length)), j(vals(c, "Requests"))); }
{ const c = C.expenseSpendChart, claims = box("officeos:expense-claims").filter((x) => x.status === "approved" || x.status === "paid");
  check("V6", "spend by category: approved and paid claims' amounts summed per category, every category", !!c && c.labels.length >= 3 && j(vals(c, "Approved and paid")) === j(c.labels.map((k) => claims.filter((x) => x.category === k).reduce((s, x) => s + x.amount, 0))) && vals(c, "Approved and paid").some((v) => v > 0), j(vals(c, "Approved and paid"))); }
{ const c = C.payrollByDepartmentChart, run = C._run;
  check("V7", "gross by department: the run's gross summed by each person's department, adding up to the run's total gross", !!c && c.keys.every((k, i) => vals(c, "Gross")[i] === run.rows.filter((r) => (S.getUser(r.userId)?.department ?? "") === k).reduce((s, r) => s + r.gross, 0))
    && vals(c, "Gross").reduce((a, b) => a + b, 0) === PS.runTotals(run).gross && c.period.month === run.month, j(vals(c, "Gross"))); }
{ const c = C.inventoryValueChart, per = IS.inventoryTotals(IS.allItems()).byCategory;
  check("V8", "stock value by category: inventoryTotals()' value per category", !!c && j(vals(c, "Value")) === j(c.labels.map((k) => per[k].value)) && vals(c, "Value").some((v) => v > 0), j(vals(c, "Value"))); }
{ const c = C.monthAttendanceChart, done = C._done, n = (st) => done.filter((x) => x.status === st).length;
  check("V9", "the month so far (Arjun): on time, late, (half day), on leave, absent over his working days so far; total their number", !!c && c.total === done.length && j(c.labels) === j(["present", "late", ...(n("half-day") ? ["half-day"] : []), "on-leave", "absent"]) && j(vals(c, "Days")) === j(c.labels.map(n)), j([c?.labels, vals(c, "Days"), c?.total])); }
{ const c = C.taxRegimeChart, rows = C._run.rows.filter((r) => r.regime);
  check("V10", "tax regimes: people in the run with a salary on the new and the old regime; total all of them", !!c && j(vals(c, "Employees")) === j([rows.filter((r) => r.regime === "new").length, rows.filter((r) => r.regime === "old").length]) && c.total === rows.length && c.total > 0, j([vals(c, "Employees"), c?.total])); }
{ const c = C.departmentPresenceChart, team = C._team, depts = S.getAllDepartments();
  const IN = ["present", "late", "half-day"];
  const exp = depts.map((x) => { const days = team.filter((r) => r.user?.department === x.code).map((r) => r.day); const e = days.filter((dd) => dd.expected).length; const p = days.filter((dd) => IN.includes(dd.status)).length; return [p, e, e ? Math.round((p / e) * 100) : null]; });
  check("V11", "departments on a date (everyone): who is in out of who is expected, per department, as summaryFor() counts them", !!c && j(c.labels) === j(depts.map((x) => x.name)) && j(vals(c, "Present")) === j(exp.map((x) => x[0])) && j(vals(c, "Expected")) === j(exp.map((x) => x[1])) && j(vals(c, "Rate")) === j(exp.map((x) => x[2])), j(vals(c, "Rate"))); }

section("D. Each page draws what its function returns");
const cols = (sel) => [...d.querySelectorAll(`${sel} .chart__col`)].map((col) => { const bar = col.querySelector(".chart__bar"); return { h: Number(bar.style.getPropertyValue("--h")), label: txt(col.querySelector(".chart__label")), title: bar.title }; });
const rows = (sel) => [...d.querySelectorAll(`${sel} .bar-row`)].map((r) => ({ label: txt(r.children[0]), value: txt(r.querySelector(".bar-row__value")), w: r.querySelector(".bar-row__fill").style.getPropertyValue("--w") }));
const dom = (date) => String(Number(String(date ?? "").slice(8, 10)));
await open("dashboard/admin", "aarav"); C = charts();
{ const c = C.attendanceRateChart, got = cols("#rate-chart"), rate = vals(c, "Rate"), exp = vals(c, "Expected"), pre = vals(c, "Present");
  check("D1", "admin dashboard, attendance rate: one column per label (its day of the month), each bar's height its Rate (0 when nobody was expected), the title its Present of Expected", got.length === 14 && got.every((g, i) => g.label === dom(c.labels[i]) && g.h === (exp[i] ? rate[i] : 0) && (!exp[i] || g.title.includes(`${rate[i]}%`) && g.title.includes(`(${pre[i]} of ${exp[i]} expected)`))), j(got.slice(-3)));
  const hc = C.headcountChart, gotH = rows("#headcount-bars"), v = vals(hc, "Employees"), top = Math.max(1, ...v);
  check("D2", "admin dashboard, headcount: a bar per label, its value the count, its width the count against the largest; the meta the total", gotH.length === hc.labels.length && gotH.every((g, i) => g.label === hc.labels[i] && g.value === String(v[i]) && g.w === `${Math.round((v[i] / top) * 100)}%`) && txt(d.getElementById("headcount-meta")) === `${hc.total} total`, j(gotH)); }
const priyaAdmin = (await open("dashboard/admin", "priya"), { rate: cols("#rate-chart"), head: rows("#headcount-bars") });
await open("dashboard/admin", "aarav"); const aaravAdmin = { rate: cols("#rate-chart"), head: rows("#headcount-bars") };
check("R4", "HR on the admin dashboard sees Admin's attendance rate and headcount charts, as today", priyaAdmin.rate.length === 14 && j(priyaAdmin) === j(aaravAdmin));
await open("dashboard/employee", "arjun"); C = charts();
{ const c = C.hoursChart, got = cols("#hours-chart"), mins = vals(c, "Worked");
  check("D3", "employee dashboard (Arjun), working hours: one column per label; a worked day's height its minutes (10 hours the top), its title its hours; a day off flat and muted", got.length === 14 && got.every((g, i) => g.label === dom(c.labels[i]) && (c.marks[i].kind === "worked" || c.marks[i].kind === "in-progress" ? g.h === Math.min(100, Math.round(mins[i] / 6)) && g.title.includes(`${(mins[i] / 60).toFixed(1)} hours`) : c.marks[i].kind === "off" ? g.h === 0 : true)), j(got.slice(0, 3)));
  // the heights a chart's points draw: hours (10 a full bar), a short mark (6) for leave, absence or no check-out, else none
  const heights = (ch) => ch.marks.map((m, i) => (["worked", "in-progress"].includes(m.kind) ? Math.min(100, Math.round(vals(ch, "Worked")[i] / 6)) : ["on-leave", "incomplete", "absent"].includes(m.kind) ? 6 : 0));
  const sneha = call("hoursChart", AS.rangeFor("EMP-1029", H.addDays(today, -13), today) ?? [], today);
  check("R3", "Arjun's dashboard charts his own days only: the drawn heights are his hoursChart()'s, not a colleague's (Sneha's differ)", got.length === 14 && j(got.map((g) => g.h)) === j(heights(c)) && j(heights(c)) !== j(heights(sneha)), j([got.map((g) => g.h), heights(sneha)]));
  const lb = C.leaveBalanceChart, left = vals(lb, "Left"), allow = vals(lb, "Allowance"), gotB = rows(".card:has(.bar-row)").filter((r) => ["Casual", "Sick", "Earned", "WFH"].includes(r.label));
  const want = lb.labels.map((t, i) => [t, left[i], allow[i]]).filter((x) => x[2] !== null);
  check("D4", "employee dashboard (Arjun), leave balance: a bar per type with an allowance, its value Left, its width Left of Allowance", gotB.length === want.length && gotB.every((g, i) => g.value === String(want[i][1]) && g.w === `${Math.min(100, Math.max(0, Math.round((want[i][1] / want[i][2]) * 100)))}%`), j([gotB, want])); }
await open("dashboard/hr", "priya"); C = charts();
{ const c = C.leaveRequestsChart, got = cols("#leave-chart"), n = vals(c, "Requests"), top = Math.max(5, ...n);
  check("D5", "HR dashboard, leave requests: one column per label, its height its count against the larger of 5 and the busiest day, its title the count; a day off muted", got.length === 14 && got.every((g, i) => g.label === dom(c.labels[i]) && g.h === Math.round((n[i] / top) * 100) && g.title.endsWith(n[i] === 1 ? "1 request" : `${n[i]} requests`)) && [...d.querySelectorAll("#leave-chart .chart__bar")].every((b, i) => b.classList.contains("chart__bar--muted") === !!c.marks[i].off), j(got.slice(-3))); }
await open("finance/expenses", "kabir"); C = charts();
{ const c = C.expenseSpendChart, got = rows("#expense-spend"), v = vals(c, "Approved and paid"), top = Math.max(...v);
  check("D6", "expenses, spend by category: a bar per category, its value the amount in rupees, its width against the largest", got.length === c.labels.length && got.every((g, i) => num(g.value) === v[i] && g.w === `${top ? Math.round((v[i] / top) * 100) : 0}%`), j(got)); }
await open("dashboard/finance", "kabir"); C = charts();
{ const c = C.payrollByDepartmentChart, got = rows("#fin-dept-bars"), v = vals(c, "Gross"), top = Math.max(1, ...v);
  check("D7", "finance dashboard, gross by department: a bar per label (a department with no name 'No department'), its value the gross, its width against the largest", got.length === c.labels.length && got.every((g, i) => g.label === (c.labels[i] || "No department") && num(g.value) === v[i] && g.w === `${Math.round((v[i] / top) * 100)}%`) && txt(d.getElementById("fin-dept-meta")).startsWith("Gross pay, "), j(got)); }
await open("inventory/items", "aarav"); C = charts();
{ const c = C.inventoryValueChart, got = rows("#value-by-category"), v = vals(c, "Value"), top = Math.max(...v);
  check("D8", "items, value by category: a bar per category, its value the stock value, its width against the largest", got.length === c.labels.length && got.every((g, i) => num(g.value) === v[i] && g.w === `${top ? Math.round((v[i] / top) * 100) : 0}%`), j(got)); }
await open("attendance/my-attendance", "arjun"); C = charts();
{ const c = C.monthAttendanceChart, got = rows("#month-summary"), v = vals(c, "Days");
  const LABEL = { present: "On time", late: "Late", "half-day": "Half day", "on-leave": "On leave", absent: "Absent" };
  check("D9", "my attendance (Arjun), the month so far: a bar per label, its value the days, its width the days of the working days so far; the meta their number", got.length === c.labels.length && got.every((g, i) => g.label === LABEL[c.labels[i]] && g.value === String(v[i]) && g.w === `${c.total ? Math.round((v[i] / c.total) * 100) : 0}%`) && txt(d.querySelector("#month-summary .card__meta")).startsWith(`${c.total} working day`), j(got)); }
await open("leave/my-leave", "arjun"); C = charts();
{ const c = C.leaveBalanceChart, tiles = [...d.querySelectorAll(".balance")], allow = vals(c, "Allowance"), left = vals(c, "Left"), appr = vals(c, "Approved");
  check("D10", "my leave (Arjun), balances: a tile per type; its figure Left (or days taken where there's no limit), its bar Left of Allowance (0 with no limit)", tiles.length === c.labels.length && tiles.every((t, i) => num(t.querySelector(".balance__value").firstChild.textContent) === (allow[i] === null ? appr[i] : left[i])
    && t.querySelector(".progress__bar").style.getPropertyValue("--w") === `${allow[i] ? Math.min(100, Math.max(0, Math.round((left[i] / allow[i]) * 100))) : 0}%`), j(tiles.map((t) => txt(t.querySelector(".balance__value"))))); }
await open("finance/tax-deductions", "kabir"); C = charts();
{ const c = C.taxRegimeChart, got = rows("#regime-bars"), v = vals(c, "Employees"), top = Math.max(1, c.total);
  check("D11", "tax, regimes: New and Old regime bars, their values the counts, their widths against everyone with a salary; the regime stat the new-regime count", got.length === 2 && got.every((g, i) => g.value === String(v[i]) && g.w === `${Math.round((v[i] / top) * 100)}%`) && txt(d.querySelector('[data-stat="regime"] .stat__value')) === String(v[0]), j(got)); }
await open("attendance/team-attendance", "aarav"); C = charts();
{ const c = C.departmentPresenceChart, got = rows("#team-dept-bars"), rate = vals(c, "Rate"), pre = vals(c, "Present"), exp = vals(c, "Expected");
  const bars = [...d.querySelectorAll("#team-dept-bars .bar-row")];
  check("D12", "team attendance (Admin), departments: a bar per department, its value Rate% ('–' when nobody is expected), its width the rate, its title Present of Expected", got.length === c.labels.length && got.every((g, i) => g.label === c.labels[i] && g.value === (rate[i] === null ? "–" : `${rate[i]}%`) && g.w === `${rate[i] ?? 0}%`)
    && bars.every((b, i) => b.title === (exp[i] ? `${pre[i]} of ${exp[i]} expected are in` : "Nobody expected")), j(got)); }
await open("users/user-profile", "aarav", "?id=EMP-1105"); C = charts();
{ const c = C.leaveBalanceChart, allow = vals(c, "Allowance"), left = vals(c, "Left"), got = rows(".card:has(.bar-row)").filter((r) => ["Casual", "Sick", "Earned", "WFH"].includes(r.label));
  const want = c.labels.map((t, i) => [left[i], allow[i]]).filter((x) => x[1] !== null);
  check("D13", "user profile (Arjun's, as Admin), leave balance: a bar per type with an allowance, its value Left, its width Left of Allowance", got.length === want.length && got.every((g, i) => g.value === String(want[i][0]) && g.w === `${Math.min(100, Math.max(0, Math.round((want[i][0] / want[i][1]) * 100)))}%`), j(got)); }

section("R. Scope");
await open("attendance/team-attendance", "sneha");
const RP = await tryImport("./js/data/reporting.js");
const reports = [...(RP.teamScope?.("EMP-1029", false) ?? [])];   // her direct reports, as the page scopes them
const snehaBars = rows("#team-dept-bars");
{ const team = AS.teamWeekFor(today).map((r) => ({ ...r, user: S.getUser(r.day.userId) })).filter((r) => reports.includes(r.day.userId));
  const c = call("departmentPresenceChart", today, team, new Set(reports));
  check("R1", "a manager (Sneha) on team attendance: only her reports' departments, each counted over her reports alone (the drawn bars equal the function's for her rows)", snehaBars.length > 0 && !!c && j(snehaBars.map((b) => b.label)) === j(c.labels) && j(snehaBars.map((b) => b.value)) === j(vals(c, "Rate").map((r) => (r === null ? "–" : `${r}%`))) && c.labels.length < S.getAllDepartments().length, j({ snehaBars, labels: c?.labels })); }
const denied = {};
for (const page of ["dashboard/admin", "dashboard/hr", "dashboard/finance", "attendance/team-attendance", "finance/expenses", "inventory/items", "finance/tax-deductions"]) {
  await open(page, "arjun");
  const drawn = [...d.querySelectorAll("main .chart__col, main .bar-row")].some((x) => x.querySelector(".chart__bar[title*='('], .chart__bar[title*='request']") || /^\d/.test(txt(x.querySelector(".bar-row__value"))) && x.closest("[id]")?.id);
  denied[page] = navigations ? "403" : "opened";
  if (!navigations && drawn) denied[page] += " + drawn";
}
check("R2", "an Employee with no reports (Arjun) opens none of the team pages (403): admin, HR and finance dashboards, team attendance, expenses, items, tax", Object.values(denied).every((v) => v === "403"), j(denied));

check("E99", "no js errors", allJsErrors.length === 0, j(allJsErrors.slice(0, 5)));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(0);
