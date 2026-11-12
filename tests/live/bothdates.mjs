// usage: node bothdates.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12O: round-12n-notes.md N12 / round-12g-notes.md G7.4, ruling approved. One updateUser save that deactivates
// (a last working day) and sets the joining date together is judged on the record as the whole save leaves it, as 12G
// did for a reactivation: leavingProblem() reads the joining date the save sets, joiningProblem() the last working day it
// sets. Store API only (no page sends both): defense-in-depth. No new string.
// ./js-pre12O, ./html-pre12O and ./css-pre12O are the code, pages and css before this round (office-os 12db2f0).
//   G  N12 reproduced (g74.mjs): Vikram (joined 8 Jan 2024): one save, last working day 6 Nov + joining date 20 Nov
//   B  boundaries and the history: the same day allowed; with a past period, 12N's rule answers in one save too
//   O  order: the earlier refusals first; the approved-month rule as before
//   I  the three date invariants are unreachable: 12M's and 12N's write paths re-run, plus combined saves over a grid
//   N  nothing changes for a save that sets one of the two (every result == 12db2f0's)
//   P  no page sends both (the edit form can't deactivate; the profile's Deactivate sends no joining date)
//   E what stays; X scope
// Storage seeded Fri 30 Oct 2026 19:00 (as firstleft.mjs does).
import fs from "fs";

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
setNow(2026, 11, 20);

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ROHAN = "EMP-1042", VIKRAM = "EMP-1088";

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const safe = (fn) => { try { return fn(); } catch (e) { return { ok: false, error: `threw: ${e.message}` }; } };
const errOf = (r) => (r?.ok ? "ok" : r?.error ?? "no result");

const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const A = await import("./js/data/attendance-store.js");
const OLDS = await import("./js-pre12O/data/store.js");   // before this round, on the same storage

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
  setNow(2026, 11, 20);
}
const setup = (r, what) => { if (!r?.ok) console.log(`setup (${what}):`, errOf(r)); return r; };
const both = (mod, id, last, joined) => safe(() => mod.updateUser(AARAV, id, { status: "inactive", dateOfLeaving: last, dateOfJoining: joined }));
const BEFORE_JOIN = (dd) => `The last working day can't be before the joining date (${dd}).`;
const JOIN_AFTER = (dd) => `The joining date can't be after the last working day (${dd}).`;
// Rohan: last working day 6 Nov (set 9 Nov), back Mon 16 Nov, punches 16 / 18 / 19 Nov; read on 20 Nov.
function cameBack() {
  seeded(); setNow(2026, 11, 9); setup(S.deactivateUser(PRIYA, ROHAN, "2026-11-06"), "leaves"); setNow(2026, 11, 16); setup(S.reactivateUser(AARAV, ROHAN), "back");
  for (const dd of [16, 18, 19]) { setNow(2026, 11, dd, 9, 10); setup(A.checkIn(ROHAN, "office"), `in ${dd}`); setNow(2026, 11, dd, 18, 30); setup(A.checkOut(ROHAN), `out ${dd}`); }
  setNow(2026, 11, 20);
}
// The three date invariants (12E, 12N, 12M): joining date not after the live last working day, nor after any past
// period's; the live last working day not before the newest return.
function contradictions(mod) {
  return mod.getAllUsers().flatMap((u) => {
    const joined = mod.joiningDate(u.dateOfJoining), left = mod.leavingDate(u);
    const lasts = (u.leavingPeriods ?? []).map((p) => mod.joiningDate(p.dateOfLeaving)).filter(Boolean);
    const backs = (u.leavingPeriods ?? []).map((p) => mod.joiningDate(p.reactivatedOn)).filter(Boolean).sort();
    const out = [];
    if (joined && left && joined > left) out.push(`${u.id}: joined ${u.dateOfJoining} > left ${u.dateOfLeaving}`);
    if (joined && lasts.some((x) => joined > x)) out.push(`${u.id}: joined ${u.dateOfJoining} > a past last day`);
    if (left && backs.length && left < backs.at(-1)) out.push(`${u.id}: left ${u.dateOfLeaving} < back`);
    return out;
  });
}

// =================================================================
section("G. N12 reproduced (g74.mjs)");
seeded();
const u0 = mem.get("officeos:users");
const g1 = both(S, VIKRAM, "2026-11-06", "20 Nov 2026");
check("G1", "Vikram (joined 8 Jan 2024), one save: last working day 6 Nov + joining date 20 Nov: refused with the existing \"before the joining date\" refusal (the new date), on the last-working-day field",
  errOf(g1) === BEFORE_JOIN("20 Nov 2026") && g1.field === "dateOfLeaving", j(g1));
check("G2", "nothing stored: still active, still joined 8 Jan 2024, no last working day", mem.get("officeos:users") === u0 && S.getUser(VIKRAM).status === "active" && S.getUser(VIKRAM).dateOfJoining === "8 Jan 2024" && !("dateOfLeaving" in S.getUser(VIKRAM)));
seeded();
const g3 = [errOf(both(S, VIKRAM, "2026-11-06", "1 Jan 2024")), S.getUser(VIKRAM).dateOfJoining, S.getUser(VIKRAM).dateOfLeaving];
setNow(2026, 12, 9);
check("G3", "the consistent one (6 Nov + 1 Jan 2024): allowed, both stored; 2-6 Nov worked; November pays him to 6 Nov (₹15,238, as the code before)",
  j(g3) === j(["ok", "1 Jan 2024", "6 Nov 2026"]) && A.monthFor(VIKRAM, 2026, 11).days.filter((x) => x.date >= "2026-11-02" && x.date <= "2026-11-06").every((x) => x.status === "present") && PS.payrollRunFor(VIKRAM, 2026, 11)?.gross === 15238, j(g3));
seeded();
const g4 = errOf(both(OLDS, VIKRAM, "2026-11-06", "20 Nov 2026"));
check("G4", "the code before took it: joined 20 Nov, left 6 Nov, 2-6 Nov \"not-joined\"", g4 === "ok" && j(contradictions(S)).includes("EMP-1088: joined 20 Nov 2026 > left 6 Nov 2026"), j([g4, contradictions(S)]));

// =================================================================
section("B. Boundaries and the history");
seeded();
const b1 = errOf(both(S, VIKRAM, "2026-11-06", "6 Nov 2026"));
check("B1", "the same day for both (joined and left 6 Nov): allowed", b1 === "ok", b1);
seeded();
const b2 = [errOf(both(S, VIKRAM, "2026-11-06", "7 Nov 2026")), errOf(both(S, VIKRAM, "2026-11-13", "10 Nov 2026"))];
check("B2", "a joining date the day after (7 Nov): refused; 13 Nov + 10 Nov: allowed", b2[0] === BEFORE_JOIN("7 Nov 2026") && b2[1] === "ok", j(b2));
// With a past period (Rohan left 6 Nov, back 16 Nov): one save, last working day 19 Nov + joining date 10 Nov.
cameBack();
const b3 = both(S, ROHAN, "2026-11-19", "10 Nov 2026");
check("B3", "with a past period (left 6 Nov, back 16 Nov): last working day 19 Nov + joining date 10 Nov in one save: 12N's rule answers (the joining date after the first leaving), on the joining-date field",
  errOf(b3) === JOIN_AFTER("6 Nov 2026") && b3.field === "dateOfJoining" && S.getUser(ROHAN).status === "active", j(b3));
cameBack();
const b4 = errOf(both(S, ROHAN, "2026-11-10", "1 Jan 2024"));
check("B4", "...and a last working day before his return (10 Nov) with an earlier joining date: 12M's rule answers", b4 === "The last working day can't be before Rohan Gupta came back (16 Nov 2026).", b4);
// Found by the mutations (#6, the whole save merged in): a history sent in the same save must not be what's read.
cameBack();
const b5 = errOf(safe(() => S.updateUser(AARAV, ROHAN, { status: "inactive", dateOfLeaving: "2026-11-10", dateOfJoining: "1 Jan 2024", leavingPeriods: [] })));
check("B5", "the same save sending an empty history alongside: still 12M's refusal (the stored history is what's read; the save can't write one)",
  b5 === "The last working day can't be before Rohan Gupta came back (16 Nov 2026)." && S.getUser(ROHAN).status === "active" && (S.getUser(ROHAN).leavingPeriods ?? []).length === 1, b5);

// =================================================================
section("O. Order");
seeded();
const o1 = [errOf(both(S, VIKRAM, "2026-11-25", "20 Nov 2026")), errOf(both(S, VIKRAM, "", "20 Nov 2026"))];
check("O1", "the earlier refusals keep their place: a last working day later than today, and none", o1[0] === "The last working day can't be later than today (20 Nov 2026)." && o1[1] === "Enter their last working day.", j(o1));
// October approved paying Vikram in full: one save with a last working day of 6 Nov and a joining date of 15 Oct.
seeded(); setNow(2026, 11, 9); setup(safe(() => PS.prepareRun(KABIR, 2026, 10)), "prepare Oct"); setup(safe(() => PS.approveRun(AARAV, 2026, 10)), "approve Oct"); setNow(2026, 11, 20);
const o2 = [errOf(both(S, VIKRAM, "2026-11-06", "15 Oct 2026")), errOf(both(OLDS, VIKRAM, "2026-11-06", "15 Oct 2026"))];
check("O2", "October approved: last working day 6 Nov + joining date 15 Oct (changes October): the approved-month refusal, as before", o2[0] === "October 2026's payroll is already approved for Vikram Singh; the joining date can't be changed in a way that changes that month." && o2[0] === o2[1], j(o2));

// =================================================================
section("I. The date invariants are unreachable");
const LASTS = ["2026-11-02", "2026-11-06", "2026-11-10", "2026-11-16", "2026-11-19", "2026-11-20"];
const JOINS = ["1 Jan 2024", "2 Nov 2026", "6 Nov 2026", "7 Nov 2026", "10 Nov 2026", "17 Nov 2026", "20 Nov 2026"];
function battery(mod) {
  const found = new Set();
  const note = () => contradictions(mod).forEach((x) => found.add(x));
  for (const last of LASTS) for (const joined of JOINS) {
    // the combined save (this round), from a plain record and from one with a past period
    seeded(); both(mod, VIKRAM, last, joined); note();
    cameBack(); both(mod, ROHAN, last, joined); note();
    // ...with a history sent alongside (added after the mutations: #6)
    cameBack(); safe(() => mod.updateUser(AARAV, ROHAN, { status: "inactive", dateOfLeaving: last, dateOfJoining: joined, leavingPeriods: [] })); note();
  }
  for (const joined of JOINS) {
    // 12N's paths: the joining date alone; with a history; in a reactivating save; while away then reactivated
    cameBack(); safe(() => mod.updateUser(AARAV, ROHAN, { dateOfJoining: joined })); note();
    cameBack(); safe(() => mod.updateUser(AARAV, ROHAN, { dateOfJoining: joined, leavingPeriods: [] })); note();
    cameBack(); safe(() => mod.deactivateUser(PRIYA, ROHAN, "2026-11-19")); setNow(2026, 11, 23); safe(() => mod.updateUser(AARAV, ROHAN, { status: "active", dateOfJoining: joined })); note();
    cameBack(); safe(() => mod.deactivateUser(PRIYA, ROHAN, "2026-11-19")); safe(() => mod.updateUser(AARAV, ROHAN, { dateOfJoining: joined })); setNow(2026, 11, 23); safe(() => mod.reactivateUser(AARAV, ROHAN)); note();
    safe(() => mod.addUser(AARAV, { name: `Test ${joined}`, email: `t${S.joiningDate(joined)}@example.com`, dateOfJoining: joined, leavingPeriods: [{ dateOfLeaving: "2 Nov 2026", reactivatedOn: "9 Nov 2026" }] })); note();
  }
  for (const last of LASTS) {
    // 12M's paths: deactivate; the edit's status + date; a date on its own; a second return then a re-leave
    cameBack(); safe(() => mod.deactivateUser(PRIYA, ROHAN, last)); note();
    cameBack(); safe(() => mod.updateUser(AARAV, ROHAN, { status: "inactive", dateOfLeaving: last })); note();
    cameBack(); safe(() => mod.deactivateUser(PRIYA, ROHAN, "2026-11-19")); safe(() => mod.updateUser(AARAV, ROHAN, { dateOfLeaving: last })); note();
    cameBack(); safe(() => mod.deactivateUser(PRIYA, ROHAN, "2026-11-19")); setNow(2026, 11, 23); safe(() => mod.reactivateUser(AARAV, ROHAN)); setNow(2026, 11, 25); safe(() => mod.deactivateUser(PRIYA, ROHAN, last)); note();
  }
  return [...found];
}
const iNew = battery(S), iOld = battery(OLDS);
check("I1", `the combined save (${LASTS.length} x ${JOINS.length} pairs, plain and with a history) and 12M's and 12N's write paths re-run: none of the three date invariants is ever broken`,
  iNew.length === 0, j(iNew.slice(0, 4)));
check("I2", "the same battery on the code before breaks one, through the combined save", iOld.length > 0 && iOld.some((x) => / > left /.test(x)), j(iOld.slice(0, 4)));

// =================================================================
section("N. Nothing changes for a save that sets one of the two");
seeded();
const snap = new Map(mem);
const restore = () => { mem.clear(); for (const [k, v] of snap) mem.set(k, v); };
const nBad = [];
for (const u of S.getAllUsers().filter((x) => x.status !== "inactive" && ![AARAV, PRIYA].includes(x.id))) {
  for (const last of ["2026-10-31", "2026-11-06", "2026-11-20"]) {
    restore(); const a = j(safe(() => S.deactivateUser(PRIYA, u.id, last))); restore(); const b = j(safe(() => OLDS.deactivateUser(PRIYA, u.id, last)));
    if (a !== b) nBad.push(`${u.id} leave ${last}`);
  }
  for (const joined of ["1 Jan 2024", "2 Nov 2026", "1 Dec 2026"]) {
    restore(); const a = j(safe(() => S.updateUser(AARAV, u.id, { dateOfJoining: joined }))); restore(); const b = j(safe(() => OLDS.updateUser(AARAV, u.id, { dateOfJoining: joined })));
    if (a !== b) nBad.push(`${u.id} join ${joined}`);
  }
}
restore();
check("N1", "everyone: a deactivation alone (3 dates) and a joining date alone (3 dates) give the same result as the code before", nBad.length === 0, j(nBad.slice(0, 4)));

// =================================================================
section("P. No page sends both");
const HERE = new URL(".", import.meta.url);
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const form = srcAt("./js", "pages/user-form.js"), profile = srcAt("./js", "pages/user-profile.js");
seeded();
const p1 = errOf(safe(() => S.updateUser(AARAV, VIKRAM, { status: "inactive", dateOfJoining: "20 Nov 2026" })));
check("P1", "the edit form sends the joining date but no last working day, and can't deactivate (the store refuses it, as before); the profile's Deactivate sends no joining date",
  !/dateOfLeaving/.test(form) && /dateOfJoining:/.test(form) && p1 === "Deactivate them from their profile, which asks for their last working day."
  && /deactivateUser\(getCurrentUserId\(\), user\.id/.test(profile) && !/dateOfJoining/.test(profile.slice(profile.indexOf("deactivateUser("), profile.indexOf("deactivateUser(") + 200)), p1);

// =================================================================
section("X. Scope");
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const jsNow = walk("./js-pre12P"), jsPre = walk("./js-pre12O");   // Round 12P (layout; was the live js): 12O's own change set (js-pre12P = ae842da)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12P", p) !== srcAt("./js-pre12O", p));
check("X1", "exactly one js file changed, none added or removed: data/store.js", j(changedJs) === j(["data/store.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12O").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12O", p))
  && walk("./css-pre12O").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12O", p)));
const now = srcAt("./js-pre12P", "data/store.js"), pre = srcAt("./js-pre12O", "data/store.js");   // Round 12P (layout; was the live js)
const strings = (s) => [...s.matchAll(/`[^`\r\n]*can't[^`\r\n]*`|"[^"\r\n]*can't[^"\r\n]*"/g)].map((m) => m[0]).sort();   // one line each
check("X3", "CRLF with no final newline; no import changed; no string added or changed (every \"can't\" message the same)",
  !now.endsWith("\n") && !/(^|[^\r])\n/.test(now) && j(now.match(/^import .*$/gm)) === j(pre.match(/^import .*$/gm)) && j(strings(now)) === j(strings(pre)));
const fn = (s, name) => s.slice(s.indexOf(`function ${name}(`), s.indexOf("\n}", s.indexOf(`function ${name}(`)));
check("X4", "leavingProblem(), joiningProblem() and reactivationProblem() unchanged (only changeUser's two calls)",
  ["leavingProblem", "joiningProblem", "reactivationProblem"].every((f) => fn(now, f) === fn(pre, f) && fn(now, f).length > 50) && fn(now, "changeUser") !== fn(pre, "changeUser"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
