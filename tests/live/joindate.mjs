// usage: node joindate.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12E: round-12d-notes.md D12, ruled 2026-10-19. Since 12D the joining date moves pay, so, as 11Y holds a last
// working day: a joining date can't be changed in a way that changes a month whose payroll is already approved (in
// either direction), nor be after a leaver's last working day. ./js-pre12E, ./html-pre12E and ./css-pre12E are the code,
// pages and css before this round (office-os 95da400).
//   J  approved October: later into it; past it (no row); earlier out of it; within it; into it from after it: all
//      refused, nothing stored; changes that leave every approved month as it was: allowed; a prepared month doesn't count
//   F  the edit form: unchanged re-save allowed; a changed joining date refused as a toast
//   L  a leaver: not after the last working day (on it: allowed); an inactive person from before 11Y: not checked
//   O  the earlier refusals keep their place; a refusal stores nothing
//   E  what stays; X scope
// Storage seeded Fri 30 Oct 2026 19:00, October settled on Mon 9 Nov (as leavers.mjs does) and, unless told not to,
// prepared by Kabir and approved by Aarav. Rohan Gupta (EMP-1042) is the person edited.
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
// The settled October on Mon 9 Nov; Rohan given `joined` first (if any); prepared and approved unless told not to.
function october({ joined, approve = true, prepare = approve } = {}) {
  mem.clear(); setNow(2026, 10, 30, 19); PS.payrollRun(2026, 10); setNow(2026, 11, 9);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
  if (joined) S.updateUser(AARAV, ROHAN, { dateOfJoining: joined });
  if (prepare) safe(() => PS.prepareRun(KABIR, 2026, 10));
  if (approve) safe(() => PS.approveRun(AARAV, 2026, 10));
}
const join = (date, actor = AARAV) => errOf(safe(() => S.updateUser(actor, ROHAN, { dateOfJoining: date })));
const stored = () => S.getUser(ROHAN).dateOfJoining ?? null;
const APPROVED = "October 2026's payroll is already approved for Rohan Gupta; the joining date can't be changed in a way that changes that month.";
const AFTER = (dd) => `The joining date can't be after the last working day (${dd}).`;

// =================================================================
section("J. A month whose payroll is approved");
october();
const before = stored(), run = j(PS.storedRun(2026, 10));
const j1 = join("19 Oct 2026");
check("J1", "later, into approved October (he was paid all of it): refused, naming the month; nothing stored", j1 === APPROVED && stored() === before && j(PS.storedRun(2026, 10)) === run, j([j1, stored()]));
const j2 = join("2 Dec 2026");
check("J2", "later, past October altogether (he'd have no row in it): refused", j2 === APPROVED && stored() === before, j2);
october({ joined: "19 Oct 2026" });
const j3 = [join("1 Jan 2020"), join("1 Oct 2026")];
check("J3", "earlier, out of October (approved with 11 days before joining unpaid): refused, to 2020 and to 1 Oct (both would pay all of it)",
  j(j3) === j([APPROVED, APPROVED]) && stored() === "19 Oct 2026", j(j3));
check("J4", "within October (19 -> 20 Oct): refused", join("20 Oct 2026") === APPROVED && stored() === "19 Oct 2026");
october({ joined: "2 Dec 2026" });
const noRow = !PS.storedRun(2026, 10).rows.some((r) => r.userId === ROHAN);
check("J5", "earlier, into October from after it (approved without a row for him): refused", noRow && join("15 Oct 2026") === APPROVED && stored() === "2 Dec 2026", j([noRow]));
october({ joined: "2 Dec 2026" });
const j6 = [join("9 Dec 2026"), join("1 Nov 2026")];
october({ joined: "15 Jul 2020" });
j6.push(join("1 Jan 2019"), join("1 Oct 2026"));
check("J6", "changes that leave every approved month as it was are allowed: after October (2 -> 9 Dec, -> 1 Nov); on or before its first day (2020 -> 2019 -> 1 Oct)",
  j(j6) === j(["ok", "ok", "ok", "ok"]) && stored() === "1 Oct 2026", j(j6));
october({ approve: false, prepare: true });
check("J7", "a prepared month that isn't approved doesn't count (19 Oct: allowed), as for a last working day", join("19 Oct 2026") === "ok" && stored() === "19 Oct 2026");
october({ approve: false });
check("J8", "nothing approved: any date (19 Oct, then none)", j([join("19 Oct 2026"), join("")]) === j(["ok", "ok"]));

// =================================================================
section("F. The edit form");
october({ joined: "19 Oct 2026" });
setSession("admin", "Aarav Mehta", AARAV); await open("users/user-form", `?id=${ROHAN}`);
const at = S.getUser(ROHAN);
d.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const f1 = txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
check("F1", "re-saving the form unchanged (it always sends the joining date) is allowed: 'Employee saved.'", f1 === "Employee saved." && S.getUser(ROHAN).dateOfJoining === at.dateOfJoining, f1);
await open("users/user-form", `?id=${ROHAN}`);
d.getElementById("joining").value = "2026-10-26";
d.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const f2 = txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
check("F2", "changing it on the form to 26 Oct: refused as a toast, nothing stored", f2 === APPROVED && stored() === "19 Oct 2026", f2);
october({ joined: "15 Jul 2020" });
check("F3", "the same date in another form is no change (15 Jul 2020 stored, 2020-07-15 sent): allowed", join("2020-07-15") === "ok" && S.joiningDate(stored()) === "2020-07-15");

// =================================================================
section("L. Leavers");
october({ approve: false });
const left = safe(() => S.deactivateUser(PRIYA, ROHAN, "2026-11-06"));
const l1 = [join("7 Nov 2026"), join("16 Nov 2026")];
check("L1", "a leaver (last working day 6 Nov): a joining date after it is refused, naming it", left.ok && j(l1) === j([AFTER("6 Nov 2026"), AFTER("6 Nov 2026")]), j([errOf(left), l1]));
check("L2", "on the last working day itself: allowed", join("6 Nov 2026") === "ok" && stored() === "6 Nov 2026");
october();
const l3 = errOf(safe(() => S.updateUser(AARAV, DIVYA, { dateOfJoining: "19 Oct 2026" })));
check("L3", "an inactive person from before 11Y (no last working day; in no run): not checked, as before", l3 === "ok", l3);

// =================================================================
section("O. Order and storage");
october();
const o1 = errOf(safe(() => S.updateUser(ARJUN, ROHAN, { dateOfJoining: "19 Oct 2026" })));
check("O1", "the earlier refusals keep their place: an Employee can't edit employees at all", o1 === "You can't edit employees.", o1);
october(); const usersAt = mem.get("officeos:users"); join("19 Oct 2026"); join("2 Dec 2026");
check("O2", "a refusal stores nothing", mem.get("officeos:users") === usersAt);
const o3 = safe(() => S.updateUser(AARAV, ROHAN, { dateOfJoining: "19 Oct 2026" }));
check("O3", "the refusal names the field (dateOfJoining)", o3.ok === false && o3.field === "dateOfJoining", j(o3));

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12F"), jsPre = walk("./js-pre12E");   // Round 12H (layout; was the live js): 12E's own change set (js-pre12F = 0b098d4)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12F", p) !== srcAt("./js-pre12E", p));
check("X1", "exactly one js file changed, none added or removed: data/store.js (payroll, the form and the profile untouched)", j(changedJs) === j(["data/store.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12E").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12E", p))
  && walk("./css-pre12E").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12E", p)));
const now = srcAt("./js", "data/store.js"), pre = srcAt("./js-pre12E", "data/store.js");
check("X3", "CRLF with no final newline; no import changed (store.js still imports no store: it reads the runs from storage)",
  !now.endsWith("\n") && !/(^|[^\r])\n/.test(now) && j(now.match(/^import .*$/gm)) === j(pre.match(/^import .*$/gm)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
