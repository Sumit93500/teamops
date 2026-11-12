// usage: node leftpages.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12K: round-12j-notes.md J12. The attendance pages never learned the "left" status (round 12H): before it, no
// active person could have one. A reactivated person's days away now carry no record (deriveDay: no times), are left
// out of "Days present" as days before joining are, and are labelled "After leaving" wherever "Before joining" is.
// ./js-pre12K, ./html-pre12K and ./css-pre12K are the code, pages and css before this round (office-os c1ac890).
//   J  J12 reproduced: Rohan away 9-13 Nov (last working day 6 Nov), back 16 Nov, read 19 Nov: the pages, now and before
//   T  the times: a day away has none, from the generator or from a stored day; the record itself is untouched
//   S  what the store and payroll say is unchanged (statuses, counts, pay, corrections)
//   N  nothing changes for anyone else, nor for days before joining (every page and read == c1ac890's)
//   E what stays; X scope
// Storage seeded Fri 30 Oct 2026 19:00 (as gap.mjs does).
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const PRE_DIR = new URL("./html-pre12K", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
setNow(2026, 11, 19);
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", ROHAN = "EMP-1042", ARJUN = "EMP-1105", VIKRAM = "EMP-1088";
const SESS = { rohan: ["emp", "Rohan Gupta", ROHAN], arjun: ["emp", "Arjun Kapoor", ARJUN], admin: ["admin", "Aarav Mehta", AARAV] };
const setSession = ([roleKey, userLabel, employeeId]) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

// open(page, query, js): the page's scripts from ./js (the build) or ./js-pre12K (the code before), with that code's
// own pages; the stored data is the same either way.
let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, query = "", js = "js") {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) allJsErrors.push(`${js} ${page}: ${e.message}`); });
  const html = fs.readFileSync(`${js === "js" ? DIR : PRE_DIR}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = () => true;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`./${js}/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${js} ${page} import: ${e.message}`); }
  }
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${js} ${page} timer: ${e.message}`); } });
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
// Round 14E part 2 (layout): a node's text without the reason lines showReason() adds under a badge or note (class reason); reasons2.mjs pins those lines
const txt = (el) => { if (!el) return ""; const c = el.cloneNode(true); c.querySelectorAll?.(".reason").forEach((r) => r.remove()); return (c.textContent ?? "").replace(/\s+/g, " ").trim(); };

const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const A = await import("./js/data/attendance-store.js");
const OLDA = await import("./js-pre12K/data/attendance-store.js");   // before this round, on the same storage
const OLDP = await import("./js-pre12K/data/payroll-store.js");

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
function seeded() {
  mem.clear(); setNow(2026, 10, 30, 19); PS.payrollRun(2026, 10);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
}
const setup = (r, what) => { if (!r?.ok) console.log(`setup (${what}):`, r?.error); return r; };
// Rohan: last working day Fri 6 Nov (set Mon 9 Nov), reactivated Mon 16 Nov; read Thu 19 Nov.
function gapped() { seeded(); setNow(2026, 11, 9); setup(S.deactivateUser(PRIYA, ROHAN, "2026-11-06"), "leaves"); setNow(2026, 11, 16); setup(S.reactivateUser(AARAV, ROHAN), "back"); setNow(2026, 11, 19); }
const GAP = ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"];

// The page reads this suite uses (the same selectors for the new code and the code before).
const statText = (i) => txt(d.querySelectorAll(".stat")[i]);
const calCell = (n) => [...d.querySelectorAll(".calendar__day")].find((c) => /^(\d+)/.exec(txt(c))?.[1] === String(n));
const historyRows = () => [...d.querySelectorAll("table tbody tr")].map(txt);
const chartTitles = () => [...d.querySelectorAll("[class*=chart__bar]")].map((b) => b.getAttribute("title") ?? b.getAttribute("aria-label") ?? "").filter(Boolean);
const rowFor = (name) => [...d.querySelectorAll("tr")].find((tr) => txt(tr).includes(name));
async function pagesAs(who, js) {
  setSession(SESS[who]);
  await open("attendance/my-attendance", "", js);
  const my = { present: statText(0), avg: statText(2), cells: GAP.map((x) => txt(calCell(Number(x.slice(8))))), cellClass: GAP.map((x) => calCell(Number(x.slice(8)))?.className ?? null), rows: historyRows() };
  await open("dashboard/employee", "", js);
  const dash = { present: statText(0), chart: chartTitles() };
  return { my, dash };
}
async function teamOn(date, js, name) {
  setSession(SESS.admin);
  await open("attendance/team-attendance", "", js);
  const pick = d.getElementById("team-date");
  pick.value = date; pick.dispatchEvent(new w.Event("change", { bubbles: true })); pick.dispatchEvent(new w.Event("input", { bubbles: true }));
  const tr = rowFor(name);
  return { row: txt(tr), week: tr?.querySelector(".week")?.getAttribute("aria-label") ?? null, titles: [...(tr?.querySelectorAll(".week__day") ?? [])].map((x) => x.title), codes: txt(tr?.querySelector(".week .sr-only")), badge: txt(tr?.querySelector(".badge")) };
}

// =================================================================
section("J. J12 reproduced: Rohan's own pages, days away 9-13 Nov");
gapped();
const now = await pagesAs("rohan", "js"), before = await pagesAs("rohan", "js-pre12K");
check("J1", "my-attendance: Days present 9 / 9 (the code before: 9 / 14, the 5 days away counted as working days not worked)",
  /^Days present 9 \/ 9\b/.test(now.my.present) && /^Days present 9 \/ 14\b/.test(before.my.present), j([now.my.present, before.my.present]));
check("J2", "the employee dashboard: Days present 9 / 9 (before: 9 / 14)", /^Days present 9 \/ 9\b/.test(now.dash.present) && /^Days present 9 \/ 14\b/.test(before.dash.present), j([now.dash.present, before.dash.present]));
check("J3", "my-attendance's calendar: each day away reads \"After leaving\" (before: a blank cell)",
  now.my.cells.every((c, i) => c === `${Number(GAP[i].slice(8))}After leaving`) && before.my.cells.every((c, i) => c === String(Number(GAP[i].slice(8)))), j([now.my.cells, before.my.cells]));
check("J4", "my-attendance's history: no row for a day away (as for days before joining; before: a row with times and \"left\")",
  !now.my.rows.some((r) => /^\w{3}, (9|10|11|12|13) Nov/.test(r)) && before.my.rows.some((r) => /^Fri, 13 Nov\d\d:\d\d\d\d:\d\d.*left$/.test(r)), j([now.my.rows.slice(0, 3), before.my.rows.filter((r) => / 1[0-3] Nov| 9 Nov/.test(r)).slice(0, 2)]));
check("J5", "the dashboard's hours chart: \"after leaving\" for 9-13 Nov (before: \"not in yet\")",
  GAP.every((x) => now.dash.chart.some((t) => t.endsWith(`${Number(x.slice(8))} Nov: after leaving`))) && before.dash.chart.some((t) => /9 Nov: not in yet$/.test(t)), j(now.dash.chart.filter((t) => /(9|1[0-3]) Nov/.test(t))));
const tNow = await teamOn("2026-11-12", "js", "Rohan Gupta"), tOld = await teamOn("2026-11-12", "js-pre12K", "Rohan Gupta");
check("J6", "team-attendance on 12 Nov (Aarav): Rohan's row has no times and the badge \"After leaving\" (before: 09:20 and \"left\")",
  !/\d\d:\d\d/.test(tNow.row) && tNow.badge === "After leaving" && /09:20/.test(tOld.row) && tOld.badge === "left", j([tNow.row, tOld.row]));
check("J7", "its week grid: \"after leaving\" for each day away, AL in the export text (before: \"?\" and the raw status)",
  /Monday after leaving, Tuesday after leaving, Wednesday after leaving, Thursday after leaving, Friday after leaving/.test(tNow.week ?? "") && tNow.codes === "AL,AL,AL,AL,AL" && tNow.titles.every((t) => t.endsWith(": after leaving"))
  && tOld.codes === "?,?,?,?,?", j([tNow.week, tNow.codes, tOld.codes]));

// =================================================================
section("T. The times");
gapped();
const t1 = GAP.map((x) => A.dayFor(ROHAN, x)), t1old = GAP.map((x) => OLDA.dayFor(ROHAN, x));
check("T1", "a day away (generated: a sample person after the seed day): no check-in, check-out, record or mode; the code before had the generator's times",
  t1.every((x) => x.status === "left" && x.checkIn === null && x.checkOut === null && x.recordId === null && x.mode === null && x.minutesWorked === null) && t1old.every((x) => /^\d\d:\d\d$/.test(x.checkIn)), j([t1[0], t1old[0].checkIn]));
// A stored day: Rohan's sample days 27-29 Oct are stored (the seed); a last working day of 26 Oct (set on 30 Oct), back 2 Nov.
seeded(); setNow(2026, 10, 30, 20); setup(S.deactivateUser(PRIYA, ROHAN, "2026-10-26"), "leaves 26 Oct"); setNow(2026, 11, 2); setup(S.reactivateUser(AARAV, ROHAN), "back 2 Nov");
const storedDays = () => (JSON.parse(mem.get("officeos:attendance")).records ?? []).filter((r) => r.userId === ROHAN && r.date >= "2026-10-27" && r.date <= "2026-10-29" && r.checkIn).map((r) => `${r.id}:${r.checkIn}-${r.checkOut}`);
const stored = storedDays();
const t2 = ["2026-10-27", "2026-10-28", "2026-10-29"].map((x) => A.dayFor(ROHAN, x));
A.monthFor(ROHAN, 2026, 10);
// Read storage again after the days were read (found by the mutations: reading only before missed a read that clears it).
check("T2", "a stored day away (27-29 Oct, seed records): no times or record id on the day; the records themselves untouched in storage, before and after the days are read",
  stored.length === 3 && j(storedDays()) === j(stored) && t2.every((x) => x.status === "left" && x.checkIn === null && x.recordId === null) && ["2026-10-27", "2026-10-28", "2026-10-29"].every((x) => OLDA.dayFor(ROHAN, x).recordId !== null), j([stored, storedDays(), t2.map((x) => x.recordId)]));
gapped();
const t3 = A.requestRegularization(ROHAN, { date: "2026-11-12", issue: "missed-check-in", time: "09:10", reason: "probe" });
const t3b = A.requestRegularization(ROHAN, { date: "2026-11-12", issue: "late-arrival", time: "09:00", reason: "probe" });
check("T3", "a correction for a day away: still \"You weren't working here that day.\" (12I), whatever the issue", t3.error === "You weren't working here that day." && t3b.error === t3.error, j([t3.error, t3b.error]));

// =================================================================
section("S. What the store and payroll say is unchanged");
gapped();
const strip = (m) => m && { ...m, days: m.days.map(({ checkIn, checkOut, recordId, mode, originalCheckIn, originalCheckOut, regularized, ...rest }) => rest) };
const sNow = A.monthFor(ROHAN, 2026, 11), sOld = OLDA.monthFor(ROHAN, 2026, 11);
check("S1", "Rohan's November: every day's status, the counts, days worked and hours as before (only the times on days away differ)",
  j(strip(sNow)) === j(strip(sOld)) && sNow.daysWorked === 9, j(sNow.counts));
setNow(2026, 12, 9);
check("S2", "his November pay row and November's run problems as before (5 working days away of 21: ₹70,095 gross, 12H)",
  j(PS.payrollRunFor(ROHAN, 2026, 11)) === j(OLDP.payrollRunFor(ROHAN, 2026, 11)) && PS.payrollRunFor(ROHAN, 2026, 11).gross === 70095 && j(PS.runProblems(2026, 11)) === j(OLDP.runProblems(2026, 11)),
  j([PS.payrollRunFor(ROHAN, 2026, 11)?.gross, OLDP.payrollRunFor(ROHAN, 2026, 11)?.gross]));
seeded(); setNow(2026, 11, 9); setup(S.deactivateUser(PRIYA, ROHAN, "2026-11-06"), "a current leaver"); setNow(2026, 12, 9);
check("S3", "a current leaver (11Y): November's row and payslips as before", j(PS.payrollRunFor(ROHAN, 2026, 11)) === j(OLDP.payrollRunFor(ROHAN, 2026, 11)) && j(PS.payslipsFor(ROHAN, "2026-12-09")) === j(OLDP.payslipsFor(ROHAN, "2026-12-09")));

// =================================================================
section("N. Nothing changes for anyone else");
gapped();
const nBad = [];
for (const u of S.getAllUsers().filter((x) => x.id !== ROHAN)) {
  for (const [y, m] of [[2026, 10], [2026, 11]]) if (j(A.monthFor(u.id, y, m)) !== j(OLDA.monthFor(u.id, y, m))) nBad.push(`${u.id} ${m}`);
}
for (const x of ["2026-11-02", "2026-11-12", "2026-11-19"]) {
  const a = A.teamFor(x).filter((r) => (r.userId ?? r.user?.id) !== ROHAN), b = OLDA.teamFor(x).filter((r) => (r.userId ?? r.user?.id) !== ROHAN);
  if (j(a) !== j(b)) nBad.push(`teamFor ${x}`);
}
check("N1", "everyone who never left: October and November, every day, and the team view of 2, 12 and 19 Nov, the same as the code before reads them", nBad.length === 0, j(nBad.slice(0, 4)));
const aNow = await pagesAs("arjun", "js"), aOld = await pagesAs("arjun", "js-pre12K");
check("N2", "Arjun's own my-attendance and dashboard: the same text as the code before's", j(aNow) === j(aOld) && /^Days present/.test(aNow.my.present), j([aNow.my.present, aOld.my.present]));
const tvNow = await teamOn("2026-11-12", "js", "Arjun Kapoor"), tvOld = await teamOn("2026-11-12", "js-pre12K", "Arjun Kapoor");
check("N3", "team-attendance on 12 Nov: Arjun's row the same as before", j(tvNow) === j(tvOld) && tvNow.row !== "", j([tvNow.row, tvOld.row]));
seeded(); setNow(2026, 11, 19);
setup(S.updateUser(AARAV, ARJUN, { dateOfJoining: "16 Nov 2026" }), "Arjun joins 16 Nov");
const nj = ["2026-10-29", "2026-11-12"].map((x) => [A.dayFor(ARJUN, x), OLDA.dayFor(ARJUN, x)]);
// Round 12L (round-12k-notes.md K7.1): days before joining now carry no record either. Was: as they were, times included.
check("N4", "days before joining keep their status, with no record on the day (round 12L)", nj.every(([a, b]) => a.status === "not-joined" && b.status === "not-joined" && a.checkIn === null && a.recordId === null), j(nj.map(([a]) => a.checkIn)));

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite, new code or old", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12L"), jsPre = walk("./js-pre12K");   // Round 12M (layout; was the live js): 12K's own change set (js-pre12L = 97da44e)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12L", p) !== srcAt("./js-pre12K", p));
const FIVE = ["data/attendance-store.js", "pages/employee-dashboard.js", "pages/my-attendance.js", "pages/team-attendance.js", "ui/attendance-view.js"];
check("X1", "exactly these 5 js files changed, none added or removed (mark-attendance, payroll and the leave store untouched)", j(changedJs) === j(FIVE) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12K").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12K", p))
  && walk("./css-pre12K").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12K", p)));
// Round 14E part 2 (layout; was the live js): 12K's claim read from the frozen js-pre14E1 (office-os 8a0aade); the live imports gain showReason (reasons2.mjs W1-W3)
check("X3", "CRLF with no final newline in all 5; no import changed",
  FIVE.every((p) => { const s = srcAt("./js-pre14E1", p); return !s.endsWith("\n") && !/(^|[^\r])\n/.test(s) && j(s.match(/^import .*$/gm)) === j(srcAt("./js-pre12K", p).match(/^import .*$/gm)); }));
const fn = (s, name) => s.slice(s.indexOf(`function ${name}(`), s.indexOf("\n}", s.indexOf(`function ${name}(`)));
const aNowSrc = srcAt("./js", "data/attendance-store.js"), aPreSrc = srcAt("./js-pre12K", "data/attendance-store.js");
check("X4", "generatedRecord(), recordOn(), dayRefusal() and checkAgainstRecord() unchanged (the record isn't removed, only not put on the day)",
  ["generatedRecord", "recordOn", "dayRefusal", "checkAgainstRecord"].every((f) => fn(aNowSrc, f) === fn(aPreSrc, f) && fn(aNowSrc, f).length > 30));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
