// usage: node firstleft.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12N: round-12m-notes.md M12, ruling approved. A joining date can't be after the earliest last working day in
// the person's history (the first time they ever left, 12H): the mirror of 12M. The existing refusal is reused
// verbatim, naming that day: "The joining date can't be after the last working day ({date})." Before, it was accepted,
// the record said they left before they joined, and days they worked became unpaid "not-joined" days.
// ./js-pre12N, ./html-pre12N and ./css-pre12N are the code, pages and css before this round (office-os 4a05f28).
//   M  M12 reproduced (rejoin-date.mjs): Rohan left 6 Nov, back 16 Nov, punches 16 / 18 / 19 Nov; joining date -> 20 / 17 / 10 Nov
//   B  boundaries: on the first last working day and before it allowed; after it refused; several periods: the first counts
//   O  order: a current leaver's rule first, as before; this before the approved-month rule
//   I  the contradiction is unreachable: every write path, over a grid of dates, never leaves a joining date after any
//      last working day on record (the code before: reached)
//   N  nothing changes for anyone never away
//   P  the page: the edit form shows the refusal as a toast
//   E what stays; X scope
// Storage seeded Fri 30 Oct 2026 19:00 (as comeback.mjs does).
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
setNow(2026, 11, 20);
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ROHAN = "EMP-1042", VIKRAM = "EMP-1088";
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, query = "") {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${DIR}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = () => true;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`./js/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); }
  }
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} timer: ${e.message}`); } });
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const safe = (fn) => { try { return fn(); } catch (e) { return { ok: false, error: `threw: ${e.message}` }; } };
const errOf = (r) => (r?.ok ? "ok" : r?.error ?? "no result");

const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const A = await import("./js/data/attendance-store.js");
const OLDS = await import("./js-pre12N/data/store.js");   // before this round, on the same storage

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
const setup = (r, what) => { if (!r?.ok) console.log(`setup (${what}):`, errOf(r)); return r; };
const leaves = (mod, y, mo, dd, last) => { setNow(y, mo, dd); return safe(() => mod.deactivateUser(PRIYA, ROHAN, last)); };
const back = (mod, y, mo, dd) => { setNow(y, mo, dd); return safe(() => mod.reactivateUser(AARAV, ROHAN)); };
const joins = (mod, date) => safe(() => mod.updateUser(AARAV, ROHAN, { dateOfJoining: date }));
// Rohan: last working day 6 Nov (set 9 Nov), back Mon 16 Nov, punches in and out 16, 18 and 19 Nov; read on 20 Nov.
function cameBack() {
  seeded(); setup(leaves(S, 2026, 11, 9, "2026-11-06"), "leaves"); setup(back(S, 2026, 11, 16), "back");
  for (const dd of [16, 18, 19]) { setNow(2026, 11, dd, 9, 10); setup(A.checkIn(ROHAN, "office"), `in ${dd}`); setNow(2026, 11, dd, 18, 30); setup(A.checkOut(ROHAN), `out ${dd}`); }
  setNow(2026, 11, 20);
}
const AFTER = (dd) => `The joining date can't be after the last working day (${dd}).`;
const nov = () => A.monthFor(ROHAN, 2026, 11).days.filter((x) => x.date >= "2026-11-02" && x.date <= "2026-11-19" && !["weekend", "holiday"].includes(x.status)).map((x) => x.status);
// The invariant: nobody's joining date is after a last working day on their record (live, or in a past period).
const contradictions = (mod) => mod.getAllUsers().filter((u) => {
  const joined = mod.joiningDate(u.dateOfJoining);
  const lasts = [mod.leavingDate(u), ...(u.leavingPeriods ?? []).map((p) => mod.joiningDate(p.dateOfLeaving))].filter(Boolean);
  return joined && lasts.some((x) => joined > x);
}).map((u) => `${u.id}:joined ${u.dateOfJoining}`);

// =================================================================
section("M. M12 reproduced");
cameBack();
const u0 = mem.get("officeos:users"), n0 = nov();
const m1 = ["20 Nov 2026", "17 Nov 2026", "10 Nov 2026"].map((x) => joins(S, x));
check("M1", "Rohan (left 6 Nov, back 16 Nov, punched 16 / 18 / 19 Nov): joining date 20, 17 or 10 Nov each refused with the existing string, naming 6 Nov, on the joining-date field",
  m1.every((r) => errOf(r) === AFTER("6 Nov 2026") && r.field === "dateOfJoining"), j(m1.map(errOf)));
setNow(2026, 12, 9);
const m2row = PS.payrollRunFor(ROHAN, 2026, 11);
check("M2", "nothing stored; every November working day still reads worked or away (none \"not-joined\"); November ₹70,095 (the 5 days away only)",
  mem.get("officeos:users") === u0 && j(nov()) === j(n0) && !n0.includes("not-joined") && m2row?.gross === 70095 && !m2row.lop.notJoinedDays, j([n0, m2row?.gross]));
cameBack();
const m3 = errOf(joins(OLDS, "20 Nov 2026"));
check("M3", "the code before took it: worked days became \"not-joined\", and the record said he left (6 Nov) before he joined (20 Nov)",
  m3 === "ok" && nov().includes("not-joined") && j(contradictions(S)) === j(["EMP-1042:joined 20 Nov 2026"]), j([m3, contradictions(S)]));

// =================================================================
section("B. Boundaries");
cameBack();
const b1 = [errOf(joins(S, "6 Nov 2026")), S.joiningDate(S.getUser(ROHAN).dateOfJoining)];
check("B1", "a joining date on the first last working day (6 Nov) is allowed", j(b1) === j(["ok", "2026-11-06"]), j(b1));
cameBack();
const b2 = [errOf(joins(S, "7 Nov 2026")), errOf(joins(S, "1 Jan 2024")), errOf(joins(S, "2 Nov 2026"))];
check("B2", "7 Nov (the day after) refused; 1 Jan 2024 and 2 Nov allowed", j(b2) === j([AFTER("6 Nov 2026"), "ok", "ok"]), j(b2));
// Two periods away: left 2 Nov, back 9 Nov; left 11 Nov, back 18 Nov.
seeded();
setup(leaves(S, 2026, 11, 2, "2026-11-02"), "leaves 2 Nov"); setup(back(S, 2026, 11, 9), "back 9 Nov");
setup(leaves(S, 2026, 11, 11, "2026-11-11"), "leaves 11 Nov"); setup(back(S, 2026, 11, 18), "back 18 Nov"); setNow(2026, 11, 20);
const b3 = [errOf(joins(S, "3 Nov 2026")), errOf(joins(S, "12 Nov 2026"))];
check("B3", "two periods away (left 2 Nov, then 11 Nov): the first counts; 3 Nov and 12 Nov both refused naming 2 Nov", j(b3) === j([AFTER("2 Nov 2026"), AFTER("2 Nov 2026")]), j(b3));
const b4 = errOf(joins(S, "2 Nov 2026"));
check("B4", "...and 2 Nov allowed", b4 === "ok", b4);
cameBack();
const b5 = [errOf(joins(S, "")), S.getUser(ROHAN).dateOfJoining ?? null];
check("B5", "the edit form re-sending no joining date (none on file) is no change: allowed", b5[0] === "ok", j(b5));

// =================================================================
section("O. Order");
// A current leaver with a past period too: left 6 Nov, back 16 Nov, left again 19 Nov (set 20 Nov).
cameBack(); setup(leaves(S, 2026, 11, 20, "2026-11-19"), "leaves again 19 Nov");
const o1 = [errOf(joins(S, "20 Nov 2026")), errOf(joins(OLDS, "20 Nov 2026")), errOf(joins(S, "10 Nov 2026"))];
check("O1", "a current leaver with a past period: after the live last working day, the live rule answers as before (19 Nov); before it but after the first one (10 Nov), this rule (6 Nov)",
  o1[0] === AFTER("19 Nov 2026") && o1[0] === o1[1] && o1[2] === AFTER("6 Nov 2026"), j(o1));
// October approved paying him in full; away 7-15 Nov; back 16 Nov.
seeded(); setNow(2026, 11, 9); setup(safe(() => PS.prepareRun(KABIR, 2026, 10)), "prepare Oct"); setup(safe(() => PS.approveRun(AARAV, 2026, 10)), "approve Oct");
setup(leaves(S, 2026, 11, 9, "2026-11-06"), "leaves"); setup(back(S, 2026, 11, 16), "back"); setNow(2026, 11, 20);
const o2 = [errOf(joins(S, "10 Nov 2026")), errOf(joins(S, "15 Oct 2026"))];
check("O2", "October approved: 10 Nov (after his first leaving, and would change October) names the leaving first; 15 Oct (before it) still meets the approved-month rule",
  o2[0] === AFTER("6 Nov 2026") && o2[1] === "October 2026's payroll is already approved for Rohan Gupta; the joining date can't be changed in a way that changes that month.", j(o2));

// =================================================================
section("I. The contradiction is unreachable");
const DATES = ["1 Oct 2026", "30 Oct 2026", "2 Nov 2026", "6 Nov 2026", "7 Nov 2026", "10 Nov 2026", "13 Nov 2026", "16 Nov 2026", "17 Nov 2026", "19 Nov 2026", "20 Nov 2026"];
const ISO = (x) => S.joiningDate(x);
function battery(mod) {
  const found = new Set();
  const note = () => contradictions(mod).forEach((x) => found.add(x));
  for (const day of DATES) {
    // the edit form's joining date on its own
    cameBack(); safe(() => mod.updateUser(AARAV, ROHAN, { dateOfJoining: day })); note();
    // with a history sent alongside (12H drops it)
    cameBack(); safe(() => mod.updateUser(AARAV, ROHAN, { dateOfJoining: day, leavingPeriods: [] })); note();
    // a combined reactivation (status + joining date, the edit form's Account active box): away again from 19 Nov
    cameBack(); safe(() => mod.deactivateUser(PRIYA, ROHAN, "2026-11-19")); setNow(2026, 11, 23);
    safe(() => mod.updateUser(AARAV, ROHAN, { status: "active", dateOfJoining: day })); note();
    // the joining date while he's away again (inactive), then reactivated
    cameBack(); safe(() => mod.deactivateUser(PRIYA, ROHAN, "2026-11-19"));
    safe(() => mod.updateUser(AARAV, ROHAN, { dateOfJoining: day })); setNow(2026, 11, 23); safe(() => mod.reactivateUser(AARAV, ROHAN)); note();
    // the joining date first, then a last working day before it (12E's leavingProblem rule)
    cameBack(); safe(() => mod.updateUser(AARAV, ROHAN, { dateOfJoining: day })); safe(() => mod.deactivateUser(PRIYA, ROHAN, "2026-11-19")); note();
    // a new record arriving with both (its history dropped, 12H; its own last working day, if any, kept as given)
    safe(() => mod.addUser(AARAV, { name: `Test ${day}`, email: `t${ISO(day)}@example.com`, dateOfJoining: day, leavingPeriods: [{ dateOfLeaving: "2 Nov 2026", reactivatedOn: "9 Nov 2026" }] })); note();
  }
  return [...found];
}
const iNew = battery(S), iOld = battery(OLDS);
check("I1", `every write path (the joining date alone, with a history, in a reactivating save, while away then reactivated, before a later leaving, a new record) x ${DATES.length} dates: never a joining date after a last working day on record`,
  iNew.length === 0, j(iNew.slice(0, 4)));
check("I2", "the same battery on the code before reaches it", iOld.length > 0 && iOld.some((x) => x.startsWith("EMP-1042:")), j(iOld.slice(0, 4)));

// =================================================================
section("N. Nothing changes for anyone never away");
seeded(); setNow(2026, 11, 20);
const snap = new Map(mem);
const restore = () => { mem.clear(); for (const [k, v] of snap) mem.set(k, v); };
const nBad = [];
for (const u of S.getAllUsers().filter((x) => x.id !== ROHAN)) {
  for (const day of ["1 Jan 2024", "1 Oct 2026", "2 Nov 2026", "20 Nov 2026", "1 Dec 2026"]) {
    restore(); const a = j(safe(() => S.updateUser(AARAV, u.id, { dateOfJoining: day }))); restore(); const b = j(safe(() => OLDS.updateUser(AARAV, u.id, { dateOfJoining: day })));
    if (a !== b) nBad.push(`${u.id} ${day}`);
  }
}
restore();
check("N1", "everyone never away: a joining-date change on 5 dates gives the same result as the code before", nBad.length === 0, j(nBad.slice(0, 4)));

// =================================================================
section("P. The page");
cameBack();
setSession("admin", "Aarav Mehta", AARAV);
await open("users/user-form", `?id=${ROHAN}`);
const p0 = mem.get("officeos:users");
d.getElementById("joining").value = "2026-11-20";
d.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const p1 = txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
check("P1", "the edit form (Aarav), joining date 20 Nov: the refusal as a toast; nothing stored", p1 === AFTER("6 Nov 2026") && mem.get("officeos:users") === p0, p1);

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12O"), jsPre = walk("./js-pre12N");   // Round 12O (layout; was the live js): 12N's own change set (js-pre12O = 12db2f0)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12O", p) !== srcAt("./js-pre12N", p));
check("X1", "exactly one js file changed, none added or removed: data/store.js (the form untouched)", j(changedJs) === j(["data/store.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12N").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12N", p))
  && walk("./css-pre12N").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12N", p)));
const now = srcAt("./js-pre12O", "data/store.js"), pre = srcAt("./js-pre12N", "data/store.js");   // Round 12O (layout; was the live js)
check("X3", "CRLF with no final newline; no import changed; no new string (the refusal is the existing one)",
  !now.endsWith("\n") && !/(^|[^\r])\n/.test(now) && j(now.match(/^import .*$/gm)) === j(pre.match(/^import .*$/gm))
  && (now.match(/The joining date can't be after the last working day \(\$\{showDate\(/g) ?? []).length === 2 && (pre.match(/The joining date can't be after the last working day \(\$\{showDate\(/g) ?? []).length === 1);
const fn = (s, name) => s.slice(s.indexOf(`function ${name}(`), s.indexOf("\n}", s.indexOf(`function ${name}(`)));
check("X4", "leavingProblem(), reactivationProblem() and changeUser() unchanged (only joiningProblem gains the rule)",
  ["leavingProblem", "reactivationProblem", "changeUser"].every((f) => fn(now, f) === fn(pre, f) && fn(now, f).length > 50) && fn(now, "joiningProblem") !== fn(pre, "joiningProblem"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
