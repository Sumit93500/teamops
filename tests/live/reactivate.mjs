// usage: node reactivate.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12F: round-12e-notes.md E12, ruled 2026-10-20. Reactivating someone clears their last working day, so it's
// refused when a month whose payroll is already approved would read them differently: a prorated final month becoming
// full, or a later approved month gaining a row it didn't have. A genuine rehire is a new record. ./js-pre12F,
// ./html-pre12F and ./css-pre12F are the code, pages and css before this round (office-os 0b098d4).
//   R  E12 reproduced: Rohan left 16 Oct, October approved (prorated): refused, by the store, the profile's Reactivate and
//      the edit form's Account active box; nothing stored; live October still == approved
//   N  the approved month without them: a leaver from September with October approved; Divya (inactive from before 11Y)
//   A  allowed: every approved month already paid them in full (left 6 Nov; left on 31 Oct, the month's end); nothing
//      approved; a prepared month doesn't count; approved months before their joining date don't count
//   M  after every reactivation this suite allows, every approved run's rows still match the live figures
//   O  the earlier refusals keep their place; a refusal stores nothing; its field
//   E  what stays; X scope
// Storage seeded Fri 30 Oct 2026 19:00, October settled on Mon 9 Nov (as leavers.mjs does). Rohan Gupta (EMP-1042) is
// the leaver.
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
// (and approved) unless told not to.
function october({ before = () => {}, approve = true, prepare = approve } = {}) {
  mem.clear(); setNow(2026, 10, 30, 19); PS.payrollRun(2026, 10); setNow(2026, 11, 9);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
  before();
  if (prepare) safe(() => PS.prepareRun(KABIR, 2026, 10));
  if (approve) safe(() => PS.approveRun(AARAV, 2026, 10));
}
const leaves = (date) => () => { const r = S.deactivateUser(PRIYA, ROHAN, date); if (!r.ok) console.log("setup:", r.error); };
// M: after every reactivation this suite allows, each approved run's rows == the live figures.
const mBad = [];
function reactivate(id = ROHAN) {
  const r = errOf(safe(() => S.reactivateUser(AARAV, id)));
  if (r === "ok") for (const run of [[2026, 9], [2026, 10], [2026, 11]].map(([y, m]) => PS.storedRun(y, m)).filter((x) => x?.status === "approved")) {
    const [y, m] = run.month.split("-").map(Number);
    for (const u of S.getAllUsers()) {
      const fixed = run.rows.find((x) => x.userId === u.id)?.net ?? null, live = PS.payrollRunFor(u.id, y, m)?.net ?? null;
      if (fixed !== live) mBad.push(`${id}: ${run.month} ${u.id} ${fixed} vs ${live}`);
    }
  }
  return r;
}
const UP_TO = (name, dd) => `October 2026's payroll is already approved and pays ${name} up to the last working day (${dd}); they can't be reactivated.`;
const WITHOUT = (name) => `October 2026's payroll is already approved without ${name}; they can't be reactivated.`;
const net = () => [PS.storedRun(2026, 10).rows.find((r) => r.userId === ROHAN)?.net ?? null, PS.payrollRunFor(ROHAN, 2026, 10)?.net ?? null];

// =================================================================
section("R. E12, reproduced");
october({ before: leaves("2026-10-16") });
const usersAt = mem.get("officeos:users");
const r1 = reactivate();
const [fixed1, live1] = net();
check("R1", "Rohan left 16 Oct, October approved paying him up to it: reactivating him is refused, naming the month and the day",
  r1 === UP_TO("Rohan Gupta", "16 Oct 2026") && S.getUser(ROHAN).status === "inactive", r1);
check("R2", "nothing stored: still inactive with the last working day; live October == approved", mem.get("officeos:users") === usersAt && S.leavingDate(S.getUser(ROHAN)) === "2026-10-16" && fixed1 === live1, j([fixed1, live1]));
setSession("admin", "Aarav Mehta", AARAV); await open("users/user-profile", `?id=${ROHAN}`);
[...d.querySelectorAll(".page-header__actions button")].find((b) => txt(b) === "Reactivate")?.click();
const r3 = txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
check("R3", "the profile's Reactivate: the refusal as a toast; the button still says Reactivate", r3 === UP_TO("Rohan Gupta", "16 Oct 2026")
  && [...d.querySelectorAll(".page-header__actions button")].some((b) => txt(b) === "Reactivate") && S.getUser(ROHAN).status === "inactive", r3);
await open("users/user-form", `?id=${ROHAN}`);
const box = d.getElementById("account-active");
if (box) box.checked = true;
d.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const r4 = txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
check("R4", "the edit form's Account active box: the same refusal as a toast; still inactive", r4 === UP_TO("Rohan Gupta", "16 Oct 2026") && S.getUser(ROHAN).status === "inactive", r4);

// =================================================================
section("N. An approved month without them");
october({ before: leaves("2026-09-30") });
const n0 = !PS.storedRun(2026, 10).rows.some((r) => r.userId === ROHAN);
check("N1", "a leaver from September (last working day 30 Sep), October approved without him: refused, naming October", n0 && reactivate() === WITHOUT("Rohan Gupta"), j([n0]));
october();
const n2 = reactivate(DIVYA);
check("N2", "Divya, inactive from before 11Y (no last working day; in no run), October approved: refused the same way", n2 === WITHOUT("Divya Menon") && S.getUser(DIVYA).status === "inactive", n2);

// =================================================================
section("A. Allowed");
october({ approve: true });
const a1l = S.deactivateUser(PRIYA, ROHAN, "2026-11-06");
const a1 = reactivate();
check("A1", "every approved month already paid him in full (left 6 Nov, after approved October): allowed; the last working day cleared",
  a1l.ok && a1 === "ok" && S.getUser(ROHAN).status === "active" && !("dateOfLeaving" in S.getUser(ROHAN)), j([errOf(a1l), a1]));
october({ before: leaves("2026-10-31") });
check("A2", "left on 31 Oct, October's last day (paid in full): allowed", reactivate() === "ok");
october({ before: leaves("2026-10-16"), approve: false });
check("A3", "nothing approved: allowed", reactivate() === "ok");
october({ before: leaves("2026-10-16"), approve: false, prepare: true });
check("A4", "a prepared month that isn't approved doesn't count: allowed", reactivate() === "ok");
october({ before: () => { S.updateUser(AARAV, ROHAN, { dateOfJoining: "2 Nov 2026" }); leaves("2026-11-06")(); } });
const a5 = !PS.storedRun(2026, 10).rows.some((r) => r.userId === ROHAN);
check("A5", "approved months before the joining date don't count (joined 2 Nov, left 6 Nov; October approved without him): allowed", a5 && reactivate() === "ok", j([a5]));
october({ before: () => S.updateUser(AARAV, DIVYA, { dateOfJoining: "2 Nov 2026" }) });
check("A7", "Divya (no last working day) with a joining date after approved October (2 Nov): October had no row for her either way: allowed",
  S.joiningDate(S.getUser(DIVYA).dateOfJoining) === "2026-11-02" && reactivate(DIVYA) === "ok");
october();
check("A6", "Divya with nothing approved: allowed", (() => { mem.clear(); setNow(2026, 11, 9); S.getAllUsers(); return reactivate(DIVYA) === "ok"; })());

// =================================================================
section("M. The approved runs still match");
check("M1", "after every reactivation this suite allowed, every approved run's rows still equal the live figures", mBad.length === 0, j(mBad.slice(0, 3)));

// =================================================================
section("O. Order and storage");
october({ before: leaves("2026-10-16") });
const o1 = errOf(safe(() => S.reactivateUser(ARJUN, ROHAN)));
check("O1", "the earlier refusals keep their place: an Employee can't reactivate anyone", o1 === "You can't reactivate employees.", o1);
const o2 = mem.get("officeos:users"); reactivate(); safe(() => S.updateUser(AARAV, ROHAN, { status: "active" }));
check("O2", "a refusal stores nothing (the store call and the form's)", mem.get("officeos:users") === o2);
const o3 = safe(() => S.reactivateUser(AARAV, ROHAN));
check("O3", "the refusal names the field (status)", o3.ok === false && o3.field === "status", j(o3));

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12G"), jsPre = walk("./js-pre12F");   // Round 12H (layout; was the live js): 12F's own change set (js-pre12G = 1c2cacc)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12G", p) !== srcAt("./js-pre12F", p));
check("X1", "exactly one js file changed, none added or removed: data/store.js (the profile and the form untouched)", j(changedJs) === j(["data/store.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12F").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12F", p))
  && walk("./css-pre12F").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12F", p)));
const now = srcAt("./js", "data/store.js"), pre = srcAt("./js-pre12F", "data/store.js");
check("X3", "CRLF with no final newline; no import changed", !now.endsWith("\n") && !/(^|[^\r])\n/.test(now) && j(now.match(/^import .*$/gm)) === j(pre.match(/^import .*$/gm)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
