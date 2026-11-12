// usage: node rejoin.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12G: round-12f-notes.md F12, approved 2026-10-20. One save that reactivates someone AND changes their joining
// date (the edit form sends both) is judged on the record as the whole save leaves it: reactivationProblem() reads the
// new joining date. Before, it read the stored one, and joiningProblem() skips anyone inactive with no last working day,
// so one save could put someone into an approved month that two saves couldn't. ./js-pre12G, ./html-pre12G and
// ./css-pre12G are the code, pages and css before this round (office-os 1c2cacc).
//   G  F12 reproduced: Divya (no last working day) given 2 Nov while inactive, then one save: Account active + an earlier
//      joining date; refused by the store and the edit form; nothing stored; live October still == approved
//   C  the scan's controls: the same as two saves; the combined save from her seeded record
//   A  allowed: one save that changes no approved month (the A7 case as one save; nothing approved; the date unchanged)
//   L  leavers (a last working day on file) in one save: each refused, whichever rule it meets first
//   M  after every save this suite allows, every approved run's rows still match the live figures
//   O  order and storage; E what stays; X scope
// Storage seeded Fri 30 Oct 2026 19:00, October settled on Mon 9 Nov (as reactivate.mjs does).
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
setNow(2026, 11, 9);
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ROHAN = "EMP-1042", DIVYA = "EMP-1061", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
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

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
// The settled October on Mon 9 Nov. `before` runs first (a joining date, a leaving date); then October is prepared
// and approved unless told not to.
function october({ before = () => {}, approve = true } = {}) {
  mem.clear(); setNow(2026, 10, 30, 19); PS.payrollRun(2026, 10); setNow(2026, 11, 9);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
  before();
  if (approve) { safe(() => PS.prepareRun(KABIR, 2026, 10)); safe(() => PS.approveRun(AARAV, 2026, 10)); }
}
const setup = (r) => { if (!r.ok) console.log("setup:", r.error); };
const leaves = (date) => () => setup(S.deactivateUser(PRIYA, ROHAN, date));
const joins = (id, date) => () => setup(S.updateUser(AARAV, id, { dateOfJoining: date }));
// M: after every save this suite allows, each approved run's rows == the live figures.
const mBad = [];
function save(id, changes) {
  const r = safe(() => S.updateUser(AARAV, id, changes));
  if (r.ok) for (const run of [[2026, 9], [2026, 10], [2026, 11]].map(([y, m]) => PS.storedRun(y, m)).filter((x) => x?.status === "approved")) {
    const [y, m] = run.month.split("-").map(Number);
    for (const u of S.getAllUsers()) {
      const fixed = run.rows.find((x) => x.userId === u.id)?.net ?? null, live = PS.payrollRunFor(u.id, y, m)?.net ?? null;
      if (fixed !== live) mBad.push(`${id}: ${run.month} ${u.id} ${fixed} vs ${live}`);
    }
  }
  return r;
}
const both = (date) => ({ status: "active", dateOfJoining: date });   // the edit form's save: Account active + a joining date
const WITHOUT = (name) => `October 2026's payroll is already approved without ${name}; they can't be reactivated.`;
const JOIN = (name) => `October 2026's payroll is already approved for ${name}; the joining date can't be changed in a way that changes that month.`;
const AFTER = (dd) => `The joining date can't be after the last working day (${dd}).`;
const inOct = (id) => [PS.storedRun(2026, 10)?.rows.find((r) => r.userId === id)?.net ?? null, PS.payrollRunFor(id, 2026, 10)?.net ?? null];
const joined = (id) => S.joiningDate(S.getUser(id).dateOfJoining);

// =================================================================
section("G. F12, reproduced");
october({ before: joins(DIVYA, "2 Nov 2026") });
const usersAt = mem.get("officeos:users");
const g1 = save(DIVYA, both("1 Jan 2024"));
check("G1", "Divya (no last working day; 2 Nov set while inactive), October approved without her: one save with Account active and joining date 1 Jan 2024 is refused, naming October",
  errOf(g1) === WITHOUT("Divya Menon") && g1.field === "status", j(g1));
const [fixedG, liveG] = inOct(DIVYA);
check("G2", "nothing stored: still inactive, still joined 2 Nov; October still has no row for her, live or approved",
  mem.get("officeos:users") === usersAt && S.getUser(DIVYA).status === "inactive" && joined(DIVYA) === "2026-11-02" && fixedG === null && liveG === null, j([fixedG, liveG]));
setSession("admin", "Aarav Mehta", AARAV); await open("users/user-form", `?id=${DIVYA}`);
const box = d.getElementById("account-active"), when = d.getElementById("joining");
if (box) box.checked = true;
if (when) when.value = "2024-01-01";
d.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const g3 = txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
check("G3", "the edit form (Account active ticked, joining date 1 Jan 2024): the same refusal as a toast; nothing stored",
  g3 === WITHOUT("Divya Menon") && mem.get("officeos:users") === usersAt, g3);
october({ before: joins(DIVYA, "2 Nov 2026") });
const g4 = errOf(save(DIVYA, both("15 Oct 2026")));
check("G4", "the same with a joining date inside October (15 Oct: a prorated row): refused the same way", g4 === WITHOUT("Divya Menon") && S.getUser(DIVYA).status === "inactive", g4);

// =================================================================
section("C. The scan's controls");
october({ before: joins(DIVYA, "2 Nov 2026") });
const c1a = errOf(save(DIVYA, { status: "active" })), c1b = errOf(save(DIVYA, { dateOfJoining: "1 Jan 2024" }));
check("C1", "the same as two saves: reactivating is allowed (12F A7), then the joining date is refused (12E)", c1a === "ok" && c1b === JOIN("Divya Menon") && joined(DIVYA) === "2026-11-02", j([c1a, c1b]));
october();
const c2 = errOf(save(DIVYA, both("1 Jan 2024")));
check("C2", "the combined save from her seeded record (no joining date): refused, as reactivating alone is (12F N2)", c2 === WITHOUT("Divya Menon"), c2);

// =================================================================
section("A. Allowed: one save that changes no approved month");
october();
const a1 = errOf(save(DIVYA, both("2 Nov 2026")));
check("A1", "Divya, October approved without her: one save with Account active and joining date 2 Nov (after October) is allowed, as the same two saves are (12F A7)",
  a1 === "ok" && S.getUser(DIVYA).status === "active" && joined(DIVYA) === "2026-11-02" && j(inOct(DIVYA)) === j([null, null]), a1);
october({ approve: false });
const a2 = errOf(save(DIVYA, both("1 Jan 2024")));
check("A2", "nothing approved: allowed", a2 === "ok" && S.getUser(DIVYA).status === "active" && joined(DIVYA) === "2024-01-01", a2);
october({ before: leaves("2026-11-06") });
const a3 = errOf(save(ROHAN, both(S.getUser(ROHAN).dateOfJoining)));
check("A3", "Rohan (left 6 Nov, after approved October): the form re-sending his joining date unchanged doesn't stop the reactivation",
  a3 === "ok" && S.getUser(ROHAN).status === "active" && !("dateOfLeaving" in S.getUser(ROHAN)), a3);
october({ before: joins(DIVYA, "15 Oct 2026") });
const a4 = errOf(save(DIVYA, both("2 Nov 2026")));
check("A4", "Divya with 15 Oct on file (set while inactive), October approved without her: one save with Account active and joining date 2 Nov (later) is allowed: October has no row either way, and the same two saves are allowed",
  a4 === "ok" && joined(DIVYA) === "2026-11-02" && j(inOct(DIVYA)) === j([null, null]), a4);

// =================================================================
section("L. Leavers in one save: still refused");
october({ before: leaves("2026-10-16") });
const l1 = errOf(save(ROHAN, both("2 Nov 2026")));
const [fixedL, liveL] = inOct(ROHAN);
check("L1", "left 16 Oct, October approved paying him up to it; one save with joining date 2 Nov: refused (a joining date after the last working day); live October == approved",
  l1 === AFTER("16 Oct 2026") && S.getUser(ROHAN).status === "inactive" && fixedL === liveL, j([l1, fixedL, liveL]));
october({ before: leaves("2026-11-06") });
const l2 = errOf(save(ROHAN, both("15 Oct 2026")));
check("L2", "left 6 Nov, October approved paying him in full; one save with joining date 15 Oct: refused (12E: it changes October)", l2 === JOIN("Rohan Gupta") && S.getUser(ROHAN).status === "inactive", l2);
october({ before: leaves("2026-09-30") });
const l3 = errOf(save(ROHAN, both("2 Nov 2026")));
check("L3", "left 30 Sep, October approved without him; one save with joining date 2 Nov (no approved month changes, but a rehire on his old record): refused", l3 === AFTER("30 Sep 2026") && S.getUser(ROHAN).status === "inactive", l3);
october({ before: leaves("2026-11-06"), approve: false });
const l4 = errOf(save(ROHAN, both("10 Nov 2026")));
check("L4", "left 6 Nov, nothing approved; one save with joining date 10 Nov: refused, as before 12G (the date rule holds a reactivating save)", l4 === AFTER("6 Nov 2026"), l4);

// =================================================================
section("M. The approved runs still match");
check("M1", "after every save this suite allowed, every approved run's rows still equal the live figures", mBad.length === 0, j(mBad.slice(0, 3)));

// =================================================================
section("O. Order and storage");
october({ before: joins(DIVYA, "2 Nov 2026") });
const o1 = errOf(safe(() => S.updateUser(ARJUN, DIVYA, both("1 Jan 2024"))));
check("O1", "the earlier refusals keep their place: an Employee can't edit anyone", o1 === "You can't edit employees.", o1);
const o2 = mem.get("officeos:users"); save(DIVYA, both("1 Jan 2024")); save(DIVYA, both("15 Oct 2026"));
check("O2", "a refusal stores nothing", mem.get("officeos:users") === o2);
const o3 = errOf(save(DIVYA, { status: "active" }));
check("O3", "a reactivation that doesn't change the joining date reads the stored one, as before (12F A7)", o3 === "ok" && joined(DIVYA) === "2026-11-02", o3);

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12H"), jsPre = walk("./js-pre12G");   // Round 12H (layout; was the live js): 12G's own change set (js-pre12H = 90982d2)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12H", p) !== srcAt("./js-pre12G", p));
check("X1", "exactly one js file changed, none added or removed: data/store.js (the form untouched)", j(changedJs) === j(["data/store.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12G").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12G", p))
  && walk("./css-pre12G").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12G", p)));
const now = srcAt("./js-pre12H", "data/store.js"), pre = srcAt("./js-pre12G", "data/store.js");   // Round 12N (layout; was the live js): 12G's result (js-pre12H = 90982d2)
check("X3", "CRLF with no final newline; no import changed", !now.endsWith("\n") && !/(^|[^\r])\n/.test(now) && j(now.match(/^import .*$/gm)) === j(pre.match(/^import .*$/gm)));
const fn = (s, name) => s.slice(s.indexOf(`function ${name}(`), s.indexOf("\n}", s.indexOf(`function ${name}(`)));
check("X4", "joiningProblem() and reactivationProblem()'s bodies unchanged (only changeUser's call changed)", fn(now, "joiningProblem") === fn(pre, "joiningProblem") && fn(now, "reactivationProblem") === fn(pre, "reactivationProblem"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
