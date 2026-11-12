// usage: node leftreqs.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12B: 11Y Y9.9, ruled 2026-10-19 (round-12a-notes.md A9). A leaver's pending request that covers only days after
// their last working day doesn't hold up the payroll run: deciding it can't change the pay. It stays pending and
// decidable; nothing is cancelled; the run page gets no new line. ./js-pre12B, ./html-pre12B and ./css-pre12B are the
// code, pages and css before this round (office-os babb144).
//   R  October: Ananya's seeded correction RG-104 (22 Oct) after a 21 Oct last working day: no longer blocks; on the last
//      day, or a request before it (LV-2208, 9 Oct), still blocks; it stays pending, and deciding it changes nothing paid
//   N  November: Rohan's unpaid leave 16-17 Nov after a 6 Nov last working day: no longer blocks; one starting on the
//      last day or spanning it still blocks; deciding it changes nothing paid
//   O  what stays: nobody leaving; someone else's request after a leaver's date; an inactive person with no date
//   U  the run page: Prepare enabled, the store's words, no new line (pristine: blocked)
//   E  what stays; X scope
// Storage seeded Fri 30 Oct 2026 19:00 (the pending requests other than the kept ones cancelled / rejected then, as
// leavers.mjs settles October); Vikram given a joining date on Mon 9 Nov; October read on 9 Nov (its window shut
// 7 Nov), November on Wed 9 Dec.
// Round 12C (layout; was the live js, in X1): 12B's own change set, read from the frozen result (js-pre12C = 3ec5a73).
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
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", SNEHA = "EMP-1029", ROHAN = "EMP-1042", VIKRAM = "EMP-1088";
const SESS = { fin: ["fin", "Kabir Shah", KABIR] };
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, { query = "", js = "js" } = {}) {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) allJsErrors.push(`${page} (${js}): ${e.message}`); });
  const html = fs.readFileSync(`${DIR}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = () => true;
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`./${js}/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} (${js}) import: ${e.message}`); }
  }
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} (${js}) timer: ${e.message}`); } });
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const safe = (fn) => { try { return fn(); } catch (e) { return { ok: false, error: `threw: ${e.message}` }; } };

const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const A = await import("./js/data/attendance-store.js");
const L = await import("./js/data/leave-store.js");
const OLD = await import("./js-pre12B/data/payroll-store.js");   // before this round, on the same storage

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
// Seeded on Fri 30 Oct 19:00; every pending request (not WFH) but `keep` settled then; the clock left at Mon 9 Nov.
function seed(keep = [], { between } = {}) {
  mem.clear(); setNow(2026, 10, 30, 19); PS.payrollRun(2026, 10);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh" && !keep.includes(r.id), (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending" && !keep.includes(r.id), (r) => { r.status = "rejected"; });
  if (between) between();
  setNow(2026, 11, 9);
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
}
const leave = (id, date) => safe(() => S.deactivateUser(PRIYA, id, date));
const rowOf = (y, m, id) => j(PS.payrollRun(y, m).rows.find((r) => r.userId === id));
const both = (y, m) => [PS.runProblems(y, m), OLD.runProblems(y, m)];
const RG104 = "1 attendance correction is waiting for a decision (Ananya Iyer)";
const ROHAN_LV = "1 leave request is waiting for a decision (Rohan Gupta)";
// Rohan's unpaid leave, sent on Mon 9 Nov while he's active.
const rohanLeave = (from, to) => L.applyLeave(ROHAN, { type: "unpaid", from, to, duration: "full", reason: "Round 12B" });
function decideAll(get, decide, id) {
  for (let q = get(id); q && q.status === "pending"; q = get(id)) {
    const who = q.stage === "manager" && q.managerId && S.getUser(q.managerId)?.status === "active" ? S.getUser(q.managerId) : S.getUser(PRIYA);
    const r = decide(id, who.id, who.role, "approve");
    if (!r.ok) return r;
  }
  return { ok: true };
}

// =================================================================
section("R. October: Ananya's correction RG-104 (22 Oct)");
seed(["RG-104"]);
const r0 = leave(ANANYA, "2026-10-21");
const [r1new, r1old] = both(2026, 10);
check("R1", "last working day 21 Oct: RG-104 (22 Oct) no longer holds up October; before 12B it did",
  r0.ok && j(r1new) === "[]" && j(r1old) === j([RG104]), j([r0.ok, r1new, r1old]));
const prep = safe(() => PS.prepareRun(KABIR, 2026, 10));
check("R2", "October can be prepared (Kabir)", prep.ok === true, j(prep.error ?? ""));
seed(["RG-104"]); leave(ANANYA, "2026-10-21");
const pend = A.pendingRegularizations(PRIYA, "hr").map((r) => r.id);
const before = rowOf(2026, 10, ANANYA);
const dec = decideAll(A.getRegularization ?? ((id) => A.allRegularizations().find((r) => r.id === id)), A.decideRegularization, "RG-104");
check("R3", "RG-104 stays pending, in Priya's inbox, and can still be decided; approving it changes nothing in Ananya's October row",
  pend.includes("RG-104") && dec.ok && A.allRegularizations().find((r) => r.id === "RG-104").status === "approved" && rowOf(2026, 10, ANANYA) === before, j([pend, dec]));
seed(["RG-104"]);
const r4 = leave(ANANYA, "2026-10-22");
check("R4", "a correction on the last working day itself (22 Oct) still holds it up, as before", r4.ok && j(both(2026, 10)) === j([[RG104], [RG104]]), j(both(2026, 10)));
seed(["RG-104", "LV-2208"]); leave(ANANYA, "2026-10-21");
const [r5new, r5old] = both(2026, 10);
check("R5", "a request before the last working day (LV-2208, 9 Oct) still holds it up; only the one after is left out",
  j(r5new) === j(["1 leave request is waiting for a decision (Ananya Iyer)"]) && j(r5old) === j(["1 leave request is waiting for a decision (Ananya Iyer)", RG104]), j([r5new, r5old]));

// =================================================================
section("N. November: Rohan's unpaid leave");
seed(); const n0 = rohanLeave("2026-11-16", "2026-11-17"); const n0b = leave(ROHAN, "2026-11-06");
setNow(2026, 12, 9);
const [n1new, n1old] = both(2026, 11);
check("N1", "last working day 6 Nov, leave 16-17 Nov pending: November isn't held up (Wed 9 Dec); before 12B it was",
  n0.ok && n0b.ok && j(n1new) === "[]" && j(n1old) === j([ROHAN_LV]), j([n0.ok, n0b.ok, n1new, n1old]));
const nPrep = safe(() => PS.prepareRun(KABIR, 2026, 11));
check("N2", "November can be prepared", nPrep.ok === true, j(nPrep.error ?? ""));
seed(); const n3l = rohanLeave("2026-11-16", "2026-11-17"); leave(ROHAN, "2026-11-06"); setNow(2026, 12, 9);
const nBefore = rowOf(2026, 11, ROHAN);
const n3 = decideAll(L.getRequest, L.decideLeave, n3l.record?.id);
// Round 12J (round-12i-notes.md I12): the final approval now refuses it (16-17 Nov aren't his days); it stays pending
// and can be rejected. Was: approved (both stages).
const n3pending = L.getRequest(n3l.record?.id)?.status, n3row = rowOf(2026, 11, ROHAN);
const n3r = safe(() => L.decideLeave(n3l.record?.id, PRIYA, "hr", "reject", "Left on 6 Nov."));
check("N3", "the leave stays decidable: its final approval is refused (round 12J: days after the last working day), it stays pending, and rejecting it works; Rohan's November row never changes",
  n3.error === "This request no longer matches the attendance record: Rohan Gupta wasn't working here on 2026-11-16 and 2026-11-17, so leave can't cover those days."
  && n3pending === "pending" && n3r.ok && L.getRequest(n3l.record.id).status === "rejected" && n3row === nBefore && rowOf(2026, 11, ROHAN) === nBefore, j([n3, n3pending, n3r.ok]));
seed(); const n4l = rohanLeave("2026-11-06", "2026-11-06"); leave(ROHAN, "2026-11-06"); setNow(2026, 12, 9);
check("N4", "leave starting on the last working day (6 Nov) still holds it up, as before", n4l.ok && j(both(2026, 11)) === j([[ROHAN_LV], [ROHAN_LV]]), j([n4l.ok, both(2026, 11)]));
seed([], { between: () => { setNow(2026, 11, 2, 10); const r = rohanLeave("2026-11-03", "2026-11-04"); if (!r.ok) console.log("N5 setup:", r.error); } });
const n5 = leave(ROHAN, "2026-11-03"); setNow(2026, 12, 9);
check("N5", "leave spanning the last working day (3-4 Nov, last day 3 Nov) still holds it up", n5.ok && j(both(2026, 11)) === j([[ROHAN_LV], [ROHAN_LV]]), j([n5.ok, both(2026, 11)]));

// =================================================================
section("O. What stays");
const clocks = [[2026, 11, 9], [2026, 12, 9], [2026, 12, 14]];
const months = [[2026, 9], [2026, 10], [2026, 11]];
const same = () => clocks.every(([y, m, dd]) => { setNow(y, m, dd); return months.every(([yy, mm]) => j(PS.runProblems(yy, mm)) === j(OLD.runProblems(yy, mm))); });
seed(["RG-102", "RG-103", "RG-104", "LV-2189", "LV-2201", "LV-2202", "LV-2208"]);
check("O1", "nobody leaving, every seeded request pending: September-November's problems exactly as before, on three clocks", same());
seed(["RG-103"]); leave(ANANYA, "2026-10-21");
check("O2", "someone else's request after a leaver's date (Sneha's RG-103, 23 Oct) still holds it up",
  j(PS.runProblems(2026, 10)) === j(["1 attendance correction is waiting for a decision (Sneha Rao)"]), j(PS.runProblems(2026, 10)));
seed(["RG-104"]); rawEdit("users", (u) => u.id === ANANYA, (u) => { u.status = "inactive"; });
check("O3", "an inactive person with no last working day (from before 11Y) isn't in the run: as before", same());

// =================================================================
section("U. The run page");
async function runPage(js) {
  seed(["RG-104"]); leave(ANANYA, "2026-10-21");
  setSession(...SESS.fin); await open("payroll/payroll-run", { query: "?month=2026-10", js });
  const prepare = d.getElementById("prepare-run");
  return { disabled: prepare?.disabled, title: prepare?.title, alert: txt(d.getElementById("run-alert")), checks: txt(d.getElementById("run-checks")) };
}
const u = await runPage("js"), up = await runPage("js-pre12B");
check("U1", "Kabir's October page: Prepare enabled; the alert says it can be prepared now", u.disabled === false && u.alert.endsWith("It can be prepared now, which fixes these figures for approval."), j(u));
// Round 12Z (behavior; the salary item was 12B's placeholder): 12Z computes "Salary changes waiting" (salinbox.mjs R2), put back before comparing
const salaryItem12Z = "Salary changes waitingNo salary change for October 2026 is waiting for a decisionDone", salaryItem12B = "Salary edits pendingNot checked: salary change requests aren't built yetNot tracked";
check("U2", "no new line: the checks list reads exactly as before 12B (12Z's salary item aside), and nothing names RG-104", u.checks.includes(salaryItem12Z) && u.checks.replace(salaryItem12Z, salaryItem12B) === up.checks && !/RG-104/.test(u.alert + u.checks), j([u.checks.slice(0, 120)]));
check("U3", "before 12B, the same: Prepare disabled, in the store's words", up.disabled === true && up.title.includes(RG104) && up.alert.includes(`It can't be prepared yet: ${RG104}.`), j([up.disabled, up.title]));

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12C"), jsPre = walk("./js-pre12B");   // Round 12C (layout)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12C", p) !== srcAt("./js-pre12B", p));
check("X1", "exactly one js file changed, none added or removed: data/payroll-store.js (the stores, the run page untouched)", j(changedJs) === j(["data/payroll-store.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12B").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12B", p))
  && walk("./css-pre12B").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12B", p)));
const now = srcAt("./js-pre12C", "data/payroll-store.js"), pre = srcAt("./js-pre12B", "data/payroll-store.js");   // Round 12H (layout; was the live js)
check("X3", "CRLF with no final newline; no import changed", !now.endsWith("\n") && !/(^|[^\r])\n/.test(now) && j(now.match(/^import .*$/gm)) === j(pre.match(/^import .*$/gm)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
