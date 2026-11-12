// usage: node comeback.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12M: round-12l-notes.md L12, ruling approved. A last working day can't be before the day the person last came
// back (their newest reactivation, 12H): "The last working day can't be before {name} came back ({date})." Before, it
// was accepted and turned days they had worked (and punched) since into unpaid "left" days, and the record contradicted
// itself (back on 16 Nov from a leaving on 6 Nov, yet a last working day of 10 Nov).
// ./js-pre12M, ./html-pre12M and ./css-pre12M are the code, pages and css before this round (office-os 0353366).
//   L  L12 reproduced (relv.mjs): back 16 Nov, punches 16 / 18 / 19 Nov, re-left on 20 Nov with a last working day of 10 Nov
//   B  boundaries: the day they came back and after are allowed; the days before refused; the newest return counts
//   O  order: the earlier refusals first; this one before the approved-month rule
//   I  the contradiction is unreachable: every write path to a last working day, tried over a grid of dates, never
//      leaves a live last working day before the newest return (the code before: reached)
//   N  nothing changes for anyone never reactivated
//   P  the page: the profile's Deactivate dialog shows the refusal under the date
//   E what stays; X scope
// Storage seeded Fri 30 Oct 2026 19:00 (as gap.mjs does).
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
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ROHAN = "EMP-1042", ARJUN = "EMP-1105", VIKRAM = "EMP-1088";
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
  w.HTMLDialogElement && (w.HTMLDialogElement.prototype.showModal ??= function () { this.open = true; });
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
const OLDS = await import("./js-pre12M/data/store.js");   // before this round, on the same storage

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
// Rohan: last working day 6 Nov (set 9 Nov), back Mon 16 Nov, punches in and out 16, 18 and 19 Nov (17 Nov his sample day).
function cameBack() {
  seeded(); setup(leaves(S, 2026, 11, 9, "2026-11-06"), "leaves"); setup(back(S, 2026, 11, 16), "back");
  for (const dd of [16, 18, 19]) { setNow(2026, 11, dd, 9, 10); setup(A.checkIn(ROHAN, "office"), `in ${dd}`); setNow(2026, 11, dd, 18, 30); setup(A.checkOut(ROHAN), `out ${dd}`); }
  setNow(2026, 11, 20);
}
const BACK = (name, dd) => `The last working day can't be before ${name} came back (${dd}).`;
const week = () => A.monthFor(ROHAN, 2026, 11).days.filter((x) => x.date >= "2026-11-16" && x.date <= "2026-11-19").map((x) => `${x.date.slice(8)}:${x.status}${x.checkIn ? "@" + x.checkIn : ""}`);
// The invariant: nobody holds a live last working day before their newest return.
const contradictions = (mod) => mod.getAllUsers().filter((u) => {
  const left = mod.leavingDate(u), backs = (u.leavingPeriods ?? []).map((p) => mod.joiningDate(p.reactivatedOn)).filter(Boolean).sort();
  return left && backs.length && left < backs.at(-1);
}).map((u) => `${u.id}:${u.dateOfLeaving}<${u.leavingPeriods.at(-1).reactivatedOn}`);

// =================================================================
section("L. L12 reproduced");
cameBack();
const w0 = week(), users0 = mem.get("officeos:users");
const l1 = leaves(S, 2026, 11, 20, "2026-11-10");
check("L1", "Rohan (back 16 Nov, punched 16 / 18 / 19 Nov) deactivated on 20 Nov with a last working day of 10 Nov: refused, naming the day he came back, on the date field",
  errOf(l1) === BACK("Rohan Gupta", "16 Nov 2026") && l1.field === "dateOfLeaving", j(l1));
check("L2", "nothing stored: still active, no live last working day, the history as it was; 16-19 Nov still read worked, with his times",
  mem.get("officeos:users") === users0 && S.getUser(ROHAN).status === "active" && !("dateOfLeaving" in S.getUser(ROHAN)) && j(week()) === j(w0) && w0.every((x) => /present@/.test(x)), j(week()));
setNow(2026, 12, 9);
const l3 = PS.payrollRunFor(ROHAN, 2026, 11);
check("L3", "November pays the days he worked: only the 5 days away come off (₹70,095 gross), no live last working day", l3?.gross === 70095 && l3.lop.leftDays === 5 && !("lastDay" in l3.attendance), j(l3 && { gross: l3.gross, lop: l3.lop }));
cameBack();
const l4 = leaves(OLDS, 2026, 11, 20, "2026-11-10");
check("L4", "the code before took it: 16-19 Nov became \"left\", and the record contradicted itself (back 16 Nov, last working day 10 Nov)",
  l4.ok && week().every((x) => /:left$/.test(x)) && j(contradictions(S)) === j(["EMP-1042:10 Nov 2026<16 Nov 2026"]), j([errOf(l4), week(), contradictions(S)]));

// =================================================================
section("B. Boundaries");
cameBack();
const b1 = errOf(leaves(S, 2026, 11, 20, "2026-11-16"));
check("B1", "a last working day on the day he came back (16 Nov) is allowed (he worked it)", b1 === "ok" && S.leavingDate(S.getUser(ROHAN)) === "2026-11-16", b1);
cameBack();
const b2 = [errOf(leaves(S, 2026, 11, 20, "2026-11-15")), errOf(leaves(S, 2026, 11, 20, "2026-11-13")), errOf(leaves(S, 2026, 11, 20, "2026-11-19"))];
check("B2", "the day before (15 Nov) and the last day away (13 Nov) refused; 19 Nov allowed", j(b2) === j([BACK("Rohan Gupta", "16 Nov 2026"), BACK("Rohan Gupta", "16 Nov 2026"), "ok"]), j(b2));
// Two periods away: left 2 Nov, back 9 Nov; left 11 Nov, back 18 Nov; re-left on 20 Nov.
seeded();
setup(leaves(S, 2026, 11, 2, "2026-11-02"), "leaves 2 Nov"); setup(back(S, 2026, 11, 9), "back 9 Nov");
setup(leaves(S, 2026, 11, 11, "2026-11-11"), "leaves 11 Nov"); setup(back(S, 2026, 11, 18), "back 18 Nov");
const b3 = [errOf(leaves(S, 2026, 11, 20, "2026-11-10")), errOf(leaves(S, 2026, 11, 20, "2026-11-16"))];
check("B3", "two periods away (back 9 Nov, then 18 Nov): the newest return counts; 10 Nov (after the first return) and 16 Nov both refused, naming 18 Nov",
  j(b3) === j([BACK("Rohan Gupta", "18 Nov 2026"), BACK("Rohan Gupta", "18 Nov 2026")]), j(b3));
const b4 = errOf(leaves(S, 2026, 11, 20, "2026-11-18"));
check("B4", "...and 18 Nov allowed", b4 === "ok", b4);
// Never left: the rule doesn't apply. A pre-11Y inactive (no last working day) reactivated keeps no period (12H W5).
seeded(); rawEdit("users", (u) => u.id === ROHAN, (u) => { u.status = "inactive"; }); setNow(2026, 11, 16); setup(S.reactivateUser(AARAV, ROHAN), "back without a date");
const b5 = errOf(leaves(S, 2026, 11, 20, "2026-11-10"));
check("B5", "reactivated with no period kept (no last working day on file before): nothing to be before; 10 Nov allowed", b5 === "ok" && (S.getUser(ROHAN).leavingPeriods ?? []).length === 0, b5);

// =================================================================
section("O. Order");
cameBack();
const o1 = [errOf(leaves(S, 2026, 11, 20, "2026-11-25")), errOf(leaves(S, 2026, 11, 20, ""))];
check("O1", "the earlier refusals keep their place: a date later than today, and no date", o1[0] === "The last working day can't be later than today (20 Nov 2026)." && o1[1] === "Enter their last working day.", j(o1));
// October approved paying him in full; away 7-15 Nov; back 16 Nov; a last working day of 20 Oct breaks both rules.
seeded(); setNow(2026, 11, 9); setup(safe(() => PS.prepareRun(KABIR, 2026, 10)), "prepare Oct"); setup(safe(() => PS.approveRun(AARAV, 2026, 10)), "approve Oct");
setup(leaves(S, 2026, 11, 9, "2026-11-06"), "leaves"); setup(back(S, 2026, 11, 16), "back");
const o2 = errOf(leaves(S, 2026, 11, 20, "2026-10-20"));
check("O2", "before both the day he came back and the end of approved October: this refusal comes first", o2 === BACK("Rohan Gupta", "16 Nov 2026"), o2);
seeded(); setNow(2026, 11, 20); rawEdit("users", (u) => u.id === VIKRAM, (u) => { u.dateOfJoining = "12 Nov 2026"; });
const o3 = [errOf(safe(() => S.deactivateUser(PRIYA, VIKRAM, "2026-11-10"))), errOf(safe(() => OLDS.deactivateUser(PRIYA, VIKRAM, "2026-11-10")))];
check("O3", "someone never reactivated (Vikram, joined 12 Nov; Arjun is a demo sign-in identity): a last working day before the joining date meets that refusal, as before",
  o3[0] === "The last working day can't be before the joining date (12 Nov 2026)." && o3[0] === o3[1], j(o3));

// =================================================================
section("I. The contradiction is unreachable");
// Every write path to a last working day, over a grid of dates, from a store where Rohan came back on 16 Nov.
const DATES = ["2026-11-01", "2026-11-05", "2026-11-06", "2026-11-10", "2026-11-13", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-19", "2026-11-20"];
function battery(mod) {
  const found = new Set();
  const note = () => contradictions(mod).forEach((x) => found.add(x));
  for (const day of DATES) {
    cameBack(); setNow(2026, 11, 20);
    safe(() => mod.deactivateUser(PRIYA, ROHAN, day)); note();
    cameBack(); setNow(2026, 11, 20);
    safe(() => mod.updateUser(AARAV, ROHAN, { status: "inactive", dateOfLeaving: day })); note();
    // already inactive (left 19 Nov): the date changed on its own
    cameBack(); setNow(2026, 11, 20); safe(() => mod.deactivateUser(PRIYA, ROHAN, "2026-11-19"));
    safe(() => mod.updateUser(AARAV, ROHAN, { dateOfLeaving: day })); note();
    safe(() => mod.updateUser(AARAV, ROHAN, { leavingPeriods: [], dateOfLeaving: day })); note();
    // a new record that tries to arrive contradicting itself
    safe(() => mod.addUser(AARAV, { name: `Test ${day}`, email: `t${day}@example.com`, status: "inactive", dateOfLeaving: day, leavingPeriods: [{ dateOfLeaving: "2 Nov 2026", reactivatedOn: "20 Nov 2026" }] })); note();
    // leave and come back again, then re-leave on the day
    cameBack(); setNow(2026, 11, 20); safe(() => mod.deactivateUser(PRIYA, ROHAN, "2026-11-19")); setNow(2026, 11, 23); safe(() => mod.reactivateUser(AARAV, ROHAN));
    setNow(2026, 11, 25); safe(() => mod.deactivateUser(PRIYA, ROHAN, day)); note();
  }
  return [...found];
}
const iNew = battery(S), iOld = battery(OLDS);
check("I1", `every write path (deactivate, the edit's status + date, a date on its own, a history sent with it, a new record, a second return) x ${DATES.length} dates: never a live last working day before the newest return`,
  iNew.length === 0, j(iNew.slice(0, 4)));
check("I2", "the same battery on the code before reaches it (deactivate, and a second return)", iOld.length > 0 && iOld.some((x) => x.startsWith("EMP-1042:")), j(iOld.slice(0, 4)));

// =================================================================
section("N. Nothing changes for anyone never reactivated");
seeded(); setNow(2026, 11, 20);
const snap = new Map(mem);
const restore = () => { mem.clear(); for (const [k, v] of snap) mem.set(k, v); };
const nBad = [];
for (const u of S.getAllUsers().filter((x) => x.status !== "inactive" && ![AARAV, PRIYA].includes(x.id))) {
  for (const day of ["2026-10-31", "2026-11-02", "2026-11-13", "2026-11-20", "2026-11-25"]) {
    restore(); const a = j(safe(() => S.deactivateUser(PRIYA, u.id, day))); restore(); const b = j(safe(() => OLDS.deactivateUser(PRIYA, u.id, day)));
    if (a !== b) nBad.push(`${u.id} ${day}`);
  }
}
restore();
check("N1", "everyone never reactivated: deactivating them on 5 dates gives the same result as the code before", nBad.length === 0, j(nBad.slice(0, 4)));

// =================================================================
section("P. The page");
cameBack();
setSession("hr", "Priya Nair", PRIYA);
await open("users/user-profile", `?id=${ROHAN}`);
const p0 = mem.get("officeos:users");
[...d.querySelectorAll(".page-header__actions button")].find((b) => txt(b) === "Deactivate")?.click();
const dateIn = d.getElementById("deactivate-date");
if (dateIn) { dateIn.value = "2026-11-10"; dateIn.dispatchEvent(new w.Event("input", { bubbles: true })); }
d.querySelector("#deactivate-modal button[type=submit]")?.click();
d.querySelector("#deactivate-modal form")?.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const p1 = txt(d.getElementById("deactivate-date-error"));
check("P1", "the profile's Deactivate (Priya), last working day 10 Nov: the refusal under the date; nothing stored; still active",
  p1 === BACK("Rohan Gupta", "16 Nov 2026") && mem.get("officeos:users") === p0 && S.getUser(ROHAN).status === "active", p1);

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12N"), jsPre = walk("./js-pre12M");   // Round 12N (layout; was the live js): 12M's own change set (js-pre12N = 4a05f28)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12N", p) !== srcAt("./js-pre12M", p));
check("X1", "exactly one js file changed, none added or removed: data/store.js (the profile untouched)", j(changedJs) === j(["data/store.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12M").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12M", p))
  && walk("./css-pre12M").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12M", p)));
const now = srcAt("./js-pre12N", "data/store.js"), pre = srcAt("./js-pre12M", "data/store.js");   // Round 12N (layout; was the live js)
check("X3", "CRLF with no final newline; no import changed", !now.endsWith("\n") && !/(^|[^\r])\n/.test(now) && j(now.match(/^import .*$/gm)) === j(pre.match(/^import .*$/gm)));
const fn = (s, name) => s.slice(s.indexOf(`function ${name}(`), s.indexOf("\n}", s.indexOf(`function ${name}(`)));
check("X4", "joiningProblem(), reactivationProblem() and changeUser() unchanged (only leavingProblem gains the rule)",
  ["joiningProblem", "reactivationProblem", "changeUser"].every((f) => fn(now, f) === fn(pre, f) && fn(now, f).length > 50) && fn(now, "leavingProblem") !== fn(pre, "leavingProblem"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
