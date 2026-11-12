// usage: node notjoined.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12L: round-12k-notes.md K7.1 / K12, ruling approved. A working day before the joining date carries no record on
// the day, as 12K did for a day away: when the joining date is set after the sample data or a stored day, that day kept
// the generator's or the stored check-in / check-out (team-attendance showed it, and a WFH one counted as working from
// home). ./js-pre12L, ./html-pre12L and ./css-pre12L are the code, pages and css before this round (office-os 97da44e).
//   G  K7.1 reproduced: Arjun, joining date set to 16 Nov on 19 Nov: a generated day (12 Nov) and a stored seed day
//      (29 Oct) before it; team-attendance's day view
//   W  the WFH count: summarize()'s wfh (summaryFor, and summaryRange, which the admin dashboard's chart reads), checked
//      on its own with a generated WFH day before the joining date
//   S  what the store, payroll and corrections say is unchanged (statuses, counts, pay, the joining-date refusal)
//   N  nothing changes for anyone else, nor for days away (12K); Arjun's own pages as before
//   E what stays; X scope
// Storage seeded Fri 30 Oct 2026 19:00 (as leftpages.mjs does).
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const PRE_DIR = new URL("./html-pre12L", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

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
const SESS = { arjun: ["emp", "Arjun Kapoor", ARJUN], admin: ["admin", "Aarav Mehta", AARAV] };
const setSession = ([roleKey, userLabel, employeeId]) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

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
const OLDA = await import("./js-pre12L/data/attendance-store.js");   // before this round, on the same storage
const OLDP = await import("./js-pre12L/data/payroll-store.js");

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
let added = 0;
function rawAdd(key, fields) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  const id = box.records[0].id.replace(/\d+$/, String(9000 + ++added));
  box.records.push({ ...box.records[0], history: [], id, ...fields });
  mem.set(`officeos:${key}`, JSON.stringify(box));
  return id;
}
function seeded() {
  mem.clear(); setNow(2026, 10, 30, 19); PS.payrollRun(2026, 10);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
}
const setup = (r, what) => { if (!r?.ok) console.log(`setup (${what}):`, r?.error); return r; };
// Arjun's joining date set to 16 Nov on 19 Nov (nothing approved: allowed, 12E). `before` runs first (e.g. a WFH day).
function joinsLate({ before = () => {} } = {}) { seeded(); before(); setNow(2026, 11, 19); setup(S.updateUser(AARAV, ARJUN, { dateOfJoining: "16 Nov 2026" }), "Arjun joins 16 Nov"); }
const storedArjun = () => (JSON.parse(mem.get("officeos:attendance")).records ?? []).filter((r) => r.userId === ARJUN && r.date >= "2026-10-26" && r.date <= "2026-10-29" && r.checkIn).map((r) => `${r.id}:${r.date}:${r.checkIn}-${r.checkOut}`);
async function teamOn(date, js, name) {
  setSession(SESS.admin);
  await open("attendance/team-attendance", "", js);
  const pick = d.getElementById("team-date");
  pick.value = date; pick.dispatchEvent(new w.Event("change", { bubbles: true })); pick.dispatchEvent(new w.Event("input", { bubbles: true }));
  const tr = [...d.querySelectorAll("tr")].find((x) => txt(x).includes(name));
  return { row: txt(tr), badge: txt(tr?.querySelector(".badge")) };
}

// =================================================================
section("G. K7.1 reproduced: Arjun, joining date set to 16 Nov");
joinsLate();
const g1 = A.dayFor(ARJUN, "2026-11-12"), g1old = OLDA.dayFor(ARJUN, "2026-11-12");
check("G1", "a generated day before joining (12 Nov): \"not-joined\", no check-in / check-out / record / mode / minutes; the code before had the generator's times",
  g1.status === "not-joined" && g1.checkIn === null && g1.checkOut === null && g1.recordId === null && g1.mode === null && g1.minutesWorked === null && g1old.status === "not-joined" && /^\d\d:\d\d$/.test(g1old.checkIn), j([g1.checkIn, g1old.checkIn]));
const st0 = storedArjun();
const g2 = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29"].map((x) => A.dayFor(ARJUN, x));
A.monthFor(ARJUN, 2026, 10);
check("G2", "his stored seed days before joining (26-29 Oct): none on the day; the records in storage the same before and after the days are read (the code before: the record on the day)",
  st0.length === 4 && j(storedArjun()) === j(st0) && g2.every((x) => x.status === "not-joined" && x.checkIn === null && x.recordId === null) && OLDA.dayFor(ARJUN, "2026-10-29").recordId !== null, j([st0, g2.map((x) => x.recordId)]));
const tNow = await teamOn("2026-11-12", "js", "Arjun Kapoor"), tOld = await teamOn("2026-11-12", "js-pre12L", "Arjun Kapoor");
check("G3", "team-attendance on 12 Nov (Aarav): Arjun's row has no times, \"Before joining\" (the code before: 09:20)", !/\d\d:\d\d/.test(tNow.row) && tNow.badge === "Before joining" && /\d\d:\d\d/.test(tOld.row) && tOld.badge === "Before joining", j([tNow.row, tOld.row]));

// =================================================================
section("W. The WFH count, on its own");
// An approved work-from-home day for Arjun on Thu 12 Nov (sent and approved while it was his), then the joining date
// moved past it: the generator works the day out in WFH mode.
joinsLate({ before: () => rawAdd("leave-requests", { userId: ARJUN, type: "wfh", from: "2026-11-12", to: "2026-11-12", duration: "full", status: "approved", stage: "done" }) });
const wOld = OLDA.dayFor(ARJUN, "2026-11-12");
check("W1", "the setup: the code before has a generated WFH day with a check-in for him on 12 Nov, before the joining date", wOld.status === "not-joined" && wOld.mode === "wfh" && /^\d\d:\d\d$/.test(wOld.checkIn), j([wOld.status, wOld.mode, wOld.checkIn]));
const sNow = A.summaryFor("2026-11-12"), sOld = OLDA.summaryFor("2026-11-12");
check("W2", "summaryFor(12 Nov).wfh: one fewer than the code before's (his day no longer counts as working from home); every other figure the same",
  sNow.wfh === sOld.wfh - 1 && j({ ...sNow, wfh: 0 }) === j({ ...sOld, wfh: 0 }), j([sNow.wfh, sOld.wfh]));
const rNow = A.summaryRange("2026-11-09", "2026-11-19"), rOld = OLDA.summaryRange("2026-11-09", "2026-11-19");
check("W3", "summaryRange 9-19 Nov (the admin dashboard's chart): wfh one fewer on 12 Nov only; every other day and figure the same",
  rNow.length === 11 && rNow.every((x, i) => (x.date === "2026-11-12" ? x.wfh === rOld[i].wfh - 1 : x.wfh === rOld[i].wfh) && j({ ...x, wfh: 0 }) === j({ ...rOld[i], wfh: 0 })), j(rNow.map((x, i) => `${x.date.slice(8)}:${x.wfh}/${rOld[i].wfh}`)));
// A WFH day on or after the joining date still counts (17 Nov).
joinsLate({ before: () => rawAdd("leave-requests", { userId: ARJUN, type: "wfh", from: "2026-11-17", to: "2026-11-17", duration: "full", status: "approved", stage: "done" }) });
const w4 = [A.summaryFor("2026-11-17").wfh, OLDA.summaryFor("2026-11-17").wfh, A.dayFor(ARJUN, "2026-11-17").mode];
check("W4", "a WFH day after the joining date (17 Nov) counts as before", w4[0] === w4[1] && w4[2] === "wfh" && w4[0] >= 1, j(w4));

// =================================================================
section("S. What the store, payroll and corrections say is unchanged");
joinsLate();
const strip = (m) => m && { ...m, regularized: 0, days: m.days.map(({ checkIn, checkOut, recordId, mode, originalCheckIn, originalCheckOut, regularized, ...rest }) => rest) };
// The month's `regularized` (days whose record was corrected) loses a stored seed day before joining that had been
// corrected: with no record on the day, it isn't one. No page reads the month figure (they read the day's flag, on rows
// that already leave days before joining out).
check("S1", "Arjun's October and November: every day's status, the counts, days worked and hours as before; only the times on days before joining differ, and October's regularized count (1 -> 0: a corrected seed day before joining)",
  [[2026, 10], [2026, 11]].every(([y, m]) => j(strip(A.monthFor(ARJUN, y, m))) === j(strip(OLDA.monthFor(ARJUN, y, m))))
  && A.monthFor(ARJUN, 2026, 10).regularized === 0 && OLDA.monthFor(ARJUN, 2026, 10).regularized === 1 && A.monthFor(ARJUN, 2026, 11).regularized === OLDA.monthFor(ARJUN, 2026, 11).regularized,
  j([A.monthFor(ARJUN, 2026, 10).regularized, OLDA.monthFor(ARJUN, 2026, 10).regularized]));
setNow(2026, 12, 9);
check("S2", "his November pay row (prorated from 16 Nov, 12D) and his payslips as before", j(PS.payrollRunFor(ARJUN, 2026, 11)) === j(OLDP.payrollRunFor(ARJUN, 2026, 11)) && PS.payrollRunFor(ARJUN, 2026, 11).lop.notJoinedDays > 0
  && j(PS.payslipsFor(ARJUN, "2026-12-09")) === j(OLDP.payslipsFor(ARJUN, "2026-12-09")), j(PS.payrollRunFor(ARJUN, 2026, 11)?.lop));
setNow(2026, 11, 19);
const s3 = [A.requestRegularization(ARJUN, { date: "2026-11-12", issue: "missed-check-in", time: "09:10", reason: "probe" }).error, OLDA.requestRegularization(ARJUN, { date: "2026-11-12", issue: "missed-check-in", time: "09:10", reason: "probe" }).error];
check("S3", "a correction before the joining date: the joining-date refusal, as before (it never read the record)", s3[0] === s3[1] && s3[0] === "You can't ask to correct a day before your joining date (2026-11-16).", j(s3));

// =================================================================
section("N. Nothing changes for anyone else");
joinsLate();
const nBad = [];
for (const u of S.getAllUsers().filter((x) => x.id !== ARJUN)) {
  for (const [y, m] of [[2026, 10], [2026, 11]]) if (j(A.monthFor(u.id, y, m)) !== j(OLDA.monthFor(u.id, y, m))) nBad.push(`${u.id} ${m}`);
}
for (const x of ["2026-11-02", "2026-11-12", "2026-11-19"]) {
  const a = A.teamFor(x).filter((r) => (r.userId ?? r.user?.id) !== ARJUN), b = OLDA.teamFor(x).filter((r) => (r.userId ?? r.user?.id) !== ARJUN);
  if (j(a) !== j(b)) nBad.push(`teamFor ${x}`);
}
check("N1", "everyone else (no later joining date): October and November, every day, and the team view of 2, 12 and 19 Nov, the same as the code before", nBad.length === 0, j(nBad.slice(0, 4)));
seeded(); setNow(2026, 11, 9); setup(S.deactivateUser(PRIYA, ROHAN, "2026-11-06"), "Rohan leaves"); setNow(2026, 11, 16); setup(S.reactivateUser(AARAV, ROHAN), "Rohan back"); setNow(2026, 11, 19);
check("N2", "days away (12K): Rohan's November as before, no record on them", j(A.monthFor(ROHAN, 2026, 11)) === j(OLDA.monthFor(ROHAN, 2026, 11)) && A.dayFor(ROHAN, "2026-11-12").checkIn === null);
joinsLate();
const pages = async (js) => {
  setSession(SESS.arjun);
  await open("attendance/my-attendance", "", js);
  const my = [txt(d.querySelectorAll(".stat")[0]), ...[...d.querySelectorAll("table tbody tr")].map(txt)];
  await open("dashboard/employee", "", js);
  return [my, txt(d.querySelectorAll(".stat")[0]), [...d.querySelectorAll("[class*=chart__bar]")].map((b) => b.getAttribute("title") ?? "")];
};
const pNow = await pages("js"), pOld = await pages("js-pre12L");
check("N3", "Arjun's own my-attendance and dashboard: the same text as before (they already leave days before joining out)", j(pNow) === j(pOld) && /^Days present/.test(pNow[0][0]), j([pNow[0][0], pOld[0][0]]));

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite, new code or old", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12M"), jsPre = walk("./js-pre12L");   // Round 12M (layout; was the live js): 12L's own change set (js-pre12M = 0353366)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12M", p) !== srcAt("./js-pre12L", p));
check("X1", "exactly one js file changed, none added or removed: data/attendance-store.js (the pages untouched)", j(changedJs) === j(["data/attendance-store.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12L").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12L", p))
  && walk("./css-pre12L").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12L", p)));
const now = srcAt("./js", "data/attendance-store.js"), pre = srcAt("./js-pre12L", "data/attendance-store.js");
check("X3", "CRLF with no final newline; no import changed", !now.endsWith("\n") && !/(^|[^\r])\n/.test(now) && j(now.match(/^import .*$/gm)) === j(pre.match(/^import .*$/gm)));
const fn = (s, name) => s.slice(s.indexOf(`function ${name}(`), s.indexOf("\n}", s.indexOf(`function ${name}(`)));
check("X4", "generatedRecord(), recordOn(), summarize(), dayRefusal() and checkAgainstRecord() unchanged (the count follows the day)",
  ["generatedRecord", "recordOn", "summarize", "dayRefusal", "checkAgainstRecord"].every((f) => fn(now, f) === fn(pre, f) && fn(now, f).length > 30));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
