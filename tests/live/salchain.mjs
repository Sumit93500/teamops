// usage: node salchain.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12X (R9c-1, ruling (b) of round-12x-scoping.md): Finance proposes a salary change, an Admin approves it, store
// only. payroll-store.js proposeSalary() / decideSalaryProposal() / withdrawSalaryProposal() and the reads; runProblems()'s
// "salary change waiting for a decision" line; store.js's guards. ./js-pre12X, ./html-pre12X and ./css-pre12X are the
// code, pages and css before this round (office-os 69ae7ad).
//   G  before: no proposals; a change is final at once
//   P  a proposal: the record exactly; nothing in effect; refusals (setSalary()'s, then one waiting per person, then
//      nobody could decide it), in order
//   A  an Admin's own change: final at once, kept as an approved proposal
//   D  deciding: approve writes through setSalary(); reject needs a note; refusals in order; setSalary()'s rules checked
//      again at approval
//   W  withdrawing: only who proposed it, only while pending
//   B  a pending proposal blocks preparing and approving the months it would be in effect for; the line's place
//   S  store.js: a role change / deactivation / deletion leaving a pending proposal undecidable is refused; so is
//      deleting the person it would pay
//   R  the reads;  N  setSalary() unchanged (the shared checks);  Z  reset;  X  scope
import fs from "fs";

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
setNow(2026, 11, 20);

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", MEERA = "EMP-1023", SNEHA = "EMP-1029", ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const safe = (fn) => { try { return fn(); } catch (e) { return { ok: false, error: `threw: ${e.message}` }; } };
const errOf = (r) => (r?.ok ? "ok" : r?.error ?? "no result");

const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const OLDPS = await import("./js-pre12X/data/payroll-store.js");   // before this round, on the same storage
const has = (name) => typeof PS[name] === "function";

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
const setup = (r, what) => { if (!r?.ok) console.log(`setup (${what}):`, errOf(r)); return r; };
// Seeded Fri 30 Oct 2026 19:00 (as salwrite), every pending leave request cancelled and correction rejected (so October and November can settle),
// Vikram given a joining date; October prepared by Kabir and approved by Aarav (for real, on 9 Nov's clock) when
// `october`; `sneha` makes Sneha a second Admin. Then 20 Nov.
function seeded({ october = true, sneha = false } = {}) {
  mem.clear(); setNow(2026, 10, 30, 19); S.getAllUsers(); PS.allSalaries(); PS.payrollRun(2026, 10);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
  if (sneha) setup(safe(() => S.updateUser(AARAV, SNEHA, { role: "admin" })), "Sneha an Admin");
  if (october) {
    setNow(2026, 11, 9);
    setup(safe(() => PS.prepareRun(KABIR, 2026, 10)), "prepare 2026-10"); setup(safe(() => PS.approveRun(AARAV, 2026, 10)), "approve 2026-10");
  }
  setNow(2026, 11, 20);
}
// November approved behind a proposal's back: its run written into storage as approved (as salwrite writes September),
// to reach the re-check at approval that the blocking line otherwise keeps out of reach.
function novemberApprovedInStorage() {
  const box = JSON.parse(mem.get("officeos:payroll-runs"));
  const rows = PS.payrollRun(2026, 11).rows;
  box.records.push({ id: `PR-${box.nextNum}`, month: "2026-11", status: "approved", preparedBy: KABIR, preparedAt: "2026-12-09T11:00", approvedBy: AARAV, approvedAt: "2026-12-09T12:00", rows, totals: PS.runTotals({ rows }), history: [] });
  box.nextNum += 1;
  mem.set("officeos:payroll-runs", JSON.stringify(box));
}
const propose = (actor, who, gross, effectiveFrom) => (has("proposeSalary") ? safe(() => PS.proposeSalary(actor, who, { gross, effectiveFrom })) : { ok: false, error: "no proposeSalary" });
const decide = (actor, id, decision, note) => (has("decideSalaryProposal") ? safe(() => PS.decideSalaryProposal(actor, id, decision, note)) : { ok: false, error: "no decideSalaryProposal" });
const withdraw = (actor, id) => (has("withdrawSalaryProposal") ? safe(() => PS.withdrawSalaryProposal(actor, id)) : { ok: false, error: "no withdrawSalaryProposal" });
const set = (actor, who, gross, effectiveFrom) => safe(() => PS.setSalary(actor, who, { gross, effectiveFrom }));
const box = (key) => (mem.has(`officeos:${key}`) ? JSON.parse(mem.get(`officeos:${key}`)) : null);
const salaries = () => mem.get("officeos:salaries");
const proposalsRaw = () => mem.get("officeos:salary-proposals") ?? null;
const proposal = (id) => box("salary-proposals")?.records.find((p) => p.id === id) ?? null;
const usersRaw = () => mem.get("officeos:users");
const OCT = "October 2026's payroll is already approved, so a salary can take effect only after it.";
const NOV = "November 2026's payroll is already approved, so a salary can take effect only after it.";
const FIRST = "A salary takes effect on the 1st of a month.";
const GROSS = "Enter the monthly gross in whole rupees, more than ₹0.";
const NOBODY_AARAV = "No one else could approve a change to Aarav Mehta's salary: make someone else an Admin first.";
const WAITING = (name, id) => `${name} already has a salary change waiting for a decision (${id}).`;
// Every figure a proposal must not touch: each tracked person's salaryFor, run row gross and net for Nov-Jan, and
// their payslips on 20 Nov.
const figures = () => j(S.getAllUsers().map((u) => [u.id, ...[[2026, 11], [2026, 12], [2027, 1]].map(([y, m]) => [PS.salaryFor(u.id, y, m)?.gross ?? null,
  PS.payrollRunFor(u.id, y, m)?.gross ?? null, PS.payrollRunFor(u.id, y, m)?.net ?? null]), PS.payslipsFor(u.id, "2026-11-20").map((s) => [s.month, s.gross, s.net])]));

// =================================================================
section("G. Before: no proposals; a change is final at once");
seeded();
const g1 = OLDPS.setSalary(KABIR, ROHAN, { gross: 100000, effectiveFrom: "2026-12-01" });
check("G1", "the code before: payroll-store.js has no proposeSalary / decideSalaryProposal / withdrawSalaryProposal; Kabir's change is a salary record at once, read for December",
  ["proposeSalary", "decideSalaryProposal", "withdrawSalaryProposal", "salaryProposals", "pendingSalaryProposal"].every((n) => !(n in OLDPS))
  && g1.ok && OLDPS.salaryFor(ROHAN, 2026, 12)?.gross === 100000, j([errOf(g1), OLDPS.salaryFor(ROHAN, 2026, 12)?.gross]));

// =================================================================
section("P. A proposal");
seeded();
const f0 = figures(), s0 = salaries();
const p1 = propose(KABIR, ROHAN, 100000, "2026-12-01");
check("P1", "Kabir (Finance) proposes Rohan ₹1,00,000 from 1 Dec: the proposal exactly (SP-1, pending, entered by Kabir at 20 Nov 11:00, history 'proposed')",
  p1.ok && j(p1.record) === j({ userId: ROHAN, gross: 100000, effectiveFrom: "2026-12-01", status: "pending", enteredBy: KABIR, enteredAt: "2026-11-20T11:00",
    decidedBy: null, decidedAt: null, salaryId: null, history: [{ byUserId: KABIR, decision: "proposed", at: "2026-11-20T11:00", note: "" }], id: "SP-1" })
  && j(proposal("SP-1")) === j(p1.record), j(p1.record ?? errOf(p1)));
check("P2", "nothing in effect: the salaries untouched byte for byte; every salaryFor / run row / payslip, Nov-Jan, for everyone, as before",
  salaries() === s0 && figures() === f0 && PS.salaryFor(ROHAN, 2026, 12)?.gross === 92000);
// refusals: each the store's words (setSalary()'s where they're its rules), nothing stored
const r0 = [salaries(), proposalsRaw()];
const P3 = [
  ["Priya (HR, no salary:edit)", PRIYA, ARJUN, 100000, "2026-12-01", "You can't change salaries."],
  ["no actor", null, ARJUN, 100000, "2026-12-01", "You can't change salaries."],
  ["an unknown person", KABIR, "EMP-9999", 100000, "2026-12-01", "No employee with id EMP-9999."],
  ["Kabir's own", KABIR, KABIR, 140000, "2026-12-01", "You can't change your own salary."],
  ["gross 92000.5", KABIR, ARJUN, 92000.5, "2026-12-01", GROSS],
  ["gross 0", KABIR, ARJUN, 0, "2026-12-01", GROSS],
  ["the 15th", KABIR, ARJUN, 95000, "2026-12-15", FIRST],
  ["approved October", KABIR, ARJUN, 95000, "2026-10-01", OCT],
  ["a second for Rohan", KABIR, ROHAN, 105000, "2027-01-01", WAITING("Rohan Gupta", "SP-1")],
  ["Aarav's (the only Admin)", KABIR, AARAV, 170000, "2026-12-01", NOBODY_AARAV],
];
const p3 = P3.map(([label, actor, who, gross, from, msg]) => {
  // Round 12Y (behavior; was setSalary() itself, which now refuses a non-Admin first, salpage.mjs S1): setSalary() before
  // this round's gate (js-pre12X: the same rules, N1)
  const r = propose(actor, who, gross, from), direct = safe(() => OLDPS.setSalary(actor, who, { gross, effectiveFrom: from }));
  return [label, !r.ok && r.error === msg, r.error, direct.ok ? "set ok" : direct.error === r.error ? "== setSalary()" : direct.error];
});
// the setSalary() calls above refused too (all but Rohan's second and Aarav's, which setSalary() would take): undo those
check("P3", "10 refusals, each in the store's words; where setSalary() has the rule, word for word its refusal for the same input; the proposals unchanged",
  p3.every(([, ok]) => ok) && p3.slice(0, 8).every(([, , , d]) => d === "== setSalary()") && proposalsRaw() === r0[1], j(p3.filter(([, ok, , d]) => !ok || d !== "== setSalary()").slice(0, 4)));
const fieldOf = (r) => r.field ?? null;
check("P4", "the fields: gross and effectiveFrom where setSalary() names them; none for the waiting and nobody-could refusals",
  fieldOf(propose(KABIR, ARJUN, 0, "2026-12-01")) === "gross" && fieldOf(propose(KABIR, ARJUN, 95000, "2026-12-15")) === "effectiveFrom"
  && fieldOf(propose(KABIR, ARJUN, 95000, "2026-10-01")) === "effectiveFrom" && fieldOf(propose(KABIR, ROHAN, 105000, "2027-01-01")) === null && fieldOf(propose(KABIR, AARAV, 170000, "2026-12-01")) === null);
seeded();
propose(KABIR, ROHAN, 100000, "2026-12-01");
const order = [
  [propose(PRIYA, "EMP-9999", 0, "x"), "You can't change salaries."],
  [propose(KABIR, "EMP-9999", 0, "x"), "No employee with id EMP-9999."],
  [propose(KABIR, KABIR, 0, "x"), "You can't change your own salary."],
  [propose(KABIR, ROHAN, 0, "x"), GROSS],
  [propose(KABIR, ROHAN, 105000, "x"), FIRST],
  [propose(KABIR, ROHAN, 105000, "2026-10-01"), OCT],
  [propose(KABIR, ROHAN, 105000, "2027-01-01"), WAITING("Rohan Gupta", "SP-1")],
  [propose(KABIR, AARAV, 0, "x"), GROSS],
];
check("P5", "the order: permission, person, own salary, gross, the 1st, the approved month (setSalary()'s), then one waiting per person; nobody-could comes last",
  order.every(([r, m]) => r.error === m), j(order.filter(([r, m]) => r.error !== m).map(([r]) => r.error)));
seeded({ sneha: true });
const p6 = propose(KABIR, AARAV, 170000, "2026-12-01");
check("P6", "with Sneha a second Admin, Kabir's change to Aarav's salary waits for her (the only one who could decide it)",
  p6.ok && p6.record.status === "pending" && has("proposalDecidersFor") && j(PS.proposalDecidersFor(p6.record).map((u) => u.id)) === j([SNEHA]), j(p6.record?.status ?? errOf(p6)));

// =================================================================
section("A. An Admin's own change: final at once");
seeded();
const a1 = propose(AARAV, ROHAN, 105000, "2026-12-01");
const sal11 = box("salaries")?.records.find((s) => s.id === "SAL-11");
check("A1", "Aarav proposes Rohan ₹1,05,000 from 1 Dec: in effect at once (SAL-11, as setSalary() writes it); kept as SP-1, approved by Aarav at once, salaryId SAL-11",
  a1.ok && j(sal11) === j({ userId: ROHAN, gross: 105000, effectiveFrom: "2026-12-01", regime: "new", id: "SAL-11" }) && PS.salaryFor(ROHAN, 2026, 12)?.gross === 105000
  && j(a1.record) === j({ userId: ROHAN, gross: 105000, effectiveFrom: "2026-12-01", status: "approved", enteredBy: AARAV, enteredAt: "2026-11-20T11:00", decidedBy: AARAV,
    decidedAt: "2026-11-20T11:00", salaryId: "SAL-11", history: [{ byUserId: AARAV, decision: "proposed", at: "2026-11-20T11:00", note: "" }, { byUserId: AARAV, decision: "approved", at: "2026-11-20T11:00", note: "" }], id: "SP-1" }),
  j(a1.record ?? errOf(a1)));
const a2 = propose(AARAV, KABIR, 150000, "2027-01-01");
check("A2", "Aarav's change to Kabir's salary (Finance's only member): final at once too", a2.ok && a2.record.status === "approved" && PS.salaryFor(KABIR, 2027, 1)?.gross === 150000, errOf(a2));
seeded();
propose(KABIR, ROHAN, 100000, "2026-12-01");
const s2 = salaries();
const a3 = propose(AARAV, ROHAN, 105000, "2026-12-01");
check("A3", "an Admin's change while one waits for that person: refused the same way (decide the waiting one first); nothing written",
  !a3.ok && a3.error === WAITING("Rohan Gupta", "SP-1") && salaries() === s2, errOf(a3));
seeded();
const a4 = propose(AARAV, ARJUN, 95000, "2026-10-01");
check("A4", "an Admin's change meets setSalary()'s rules first: approved October refused, no salary and no proposal written", !a4.ok && a4.error === OCT && proposalsRaw() === null, errOf(a4));

// =================================================================
section("D. Deciding");
seeded();
propose(KABIR, ROHAN, 100000, "2026-12-01");
setNow(2026, 11, 21, 9, 30);
const d1 = decide(AARAV, "SP-1", "approve", "");
check("D1", "Aarav approves SP-1 on 21 Nov: a salary record (SAL-11, from 1 Dec, as setSalary() writes it); the proposal approved, decided by Aarav at 21 Nov 09:30, salaryId SAL-11",
  d1.ok && j(box("salaries").records.find((s) => s.id === "SAL-11")) === j({ userId: ROHAN, gross: 100000, effectiveFrom: "2026-12-01", regime: "new", id: "SAL-11" })
  && PS.salaryFor(ROHAN, 2026, 12)?.gross === 100000 && PS.salaryFor(ROHAN, 2026, 11)?.gross === 92000
  && d1.record.status === "approved" && d1.record.decidedBy === AARAV && d1.record.decidedAt === "2026-11-21T09:30" && d1.record.salaryId === "SAL-11"
  && j(d1.record.history.at(-1)) === j({ byUserId: AARAV, decision: "approved", at: "2026-11-21T09:30", note: "" }), j(d1.record ?? errOf(d1)));
const d2 = [
  ["Kabir (no payroll:approve)", decide(KABIR, "SP-1", "approve"), "You can't decide salary changes."],
  ["Priya (HR)", decide(PRIYA, "SP-1", "approve"), "You can't decide salary changes."],
  ["an unknown proposal", decide(AARAV, "SP-9", "approve"), "No salary change SP-9."],
  ["decided already", decide(AARAV, "SP-1", "reject", "late"), "This salary change is already approved."],
];
check("D2", "refused: no payroll:approve (Kabir, Priya), an unknown id, one decided already", d2.every(([, r, m]) => r.error === m), j(d2.filter(([, r, m]) => r.error !== m).map(([l, r]) => [l, r.error])));
seeded({ sneha: true });
propose(KABIR, AARAV, 170000, "2026-12-01");
propose(KABIR, ROHAN, 100000, "2026-12-01");
const s3 = [salaries(), proposalsRaw()];
const d3 = [
  ["Aarav on his own (SP-1)", decide(AARAV, "SP-1", "approve"), "You can't decide a change to your own salary."],
  ["a decision that isn't one", decide(AARAV, "SP-2", "maybe"), 'Decision must be "approve" or "reject".'],
  ["reject with no note", decide(AARAV, "SP-2", "reject", "  "), "Add a note saying why the salary change is rejected."],
];
setup(safe(() => S.updateUser(AARAV, KABIR, { role: "admin" })), "Kabir an Admin");
d3.push(["Kabir, made an Admin, on his own proposal", decide(KABIR, "SP-2", "approve"), "You proposed this salary change, so someone else has to decide it."]);
check("D3", "refused: the person it would pay (Aarav, with Sneha the other Admin), a decision that isn't one, a rejection with no note (field note), its own proposer made an Admin since; nothing stored",
  d3.every(([, r, m]) => r.error === m) && d3[2][1].field === "note" && salaries() === s3[0] && proposalsRaw() === s3[1], j(d3.filter(([, r, m]) => r.error !== m).map(([l, r]) => [l, r.error])));
check("D4", "refusal order: permission, the proposal, pending, its proposer, the person paid, the decision, the note",
  decide(PRIYA, "SP-9", "x").error === "You can't decide salary changes." && decide(SNEHA, "SP-9", "x").error === "No salary change SP-9."
  && decide(KABIR, "SP-2", "x").error === "You proposed this salary change, so someone else has to decide it."
  && decide(AARAV, "SP-1", "x").error === "You can't decide a change to your own salary." && decide(SNEHA, "SP-1", "x").error === 'Decision must be "approve" or "reject".');
seeded();
propose(KABIR, ROHAN, 100000, "2026-12-01");
const s5 = salaries();
const d5 = decide(AARAV, "SP-1", "reject", "Not in this cycle.");
const d5b = propose(KABIR, ROHAN, 98000, "2027-01-01");
check("D5", "Aarav rejects SP-1 with a note: rejected, the note kept, no salary written; Rohan can be proposed for again (SP-2)",
  d5.ok && d5.record.status === "rejected" && d5.record.decidedBy === AARAV && j(d5.record.history.at(-1)) === j({ byUserId: AARAV, decision: "rejected", at: "2026-11-20T11:00", note: "Not in this cycle." })
  && d5.record.salaryId === null && salaries() === s5 && d5b.ok && d5b.record.id === "SP-2", j([errOf(d5), errOf(d5b)]));
seeded();
propose(KABIR, ROHAN, 100000, "2026-11-01");
novemberApprovedInStorage();
const s6 = [salaries(), proposalsRaw()];
const d6 = decide(AARAV, "SP-1", "approve");
const d6s = [salaries() === s6[0], proposalsRaw() === s6[1], proposal("SP-1")?.status];
const d6b = decide(AARAV, "SP-1", "reject", "November is approved.");
check("D6", "setSalary()'s rules checked again at approval: November approved since SP-1 (from 1 Nov) was proposed: refused in setSalary()'s words, nothing stored, still pending; it can be rejected",
  !d6.ok && d6.error === NOV && d6.field === "effectiveFrom" && j(d6s) === j([true, true, "pending"]) && d6b.ok && d6b.record.status === "rejected", j([errOf(d6), d6s, errOf(d6b)]));

// =================================================================
section("W. Withdrawing");
seeded();
propose(KABIR, ROHAN, 100000, "2026-12-01");
const w0 = [salaries(), proposalsRaw()];
const w1 = [["Aarav", withdraw(AARAV, "SP-1"), "Only the person who proposed this salary change can withdraw it."], ["Rohan himself", withdraw(ROHAN, "SP-1"), "Only the person who proposed this salary change can withdraw it."],
  ["an unknown id", withdraw(KABIR, "SP-7"), "No salary change SP-7."]];
check("W1", "refused: anyone but who proposed it (Aarav, Rohan), an unknown id; nothing stored", w1.every(([, r, m]) => r.error === m) && salaries() === w0[0] && proposalsRaw() === w0[1], j(w1.filter(([, r, m]) => r.error !== m).map(([l, r]) => [l, r.error])));
setNow(2026, 11, 22, 15, 5);
const w2 = withdraw(KABIR, "SP-1");
check("W2", "Kabir withdraws SP-1: withdrawn, nobody decided it, the history ends 'withdrawn' by Kabir at 22 Nov 15:05; no salary written",
  w2.ok && w2.record.status === "withdrawn" && w2.record.decidedBy === null && j(w2.record.history.at(-1)) === j({ byUserId: KABIR, decision: "withdrawn", at: "2026-11-22T15:05", note: "" }) && salaries() === w0[0], j(w2.record ?? errOf(w2)));
check("W3", "after it: withdrawing again or deciding it is refused ('already withdrawn'); a new proposal for Rohan goes through",
  withdraw(KABIR, "SP-1").error === "This salary change is already withdrawn, so it can't be withdrawn." && decide(AARAV, "SP-1", "approve").error === "This salary change is already withdrawn."
  && propose(KABIR, ROHAN, 99000, "2026-12-01").ok);

// =================================================================
section("B. A pending proposal holds up the months it would be in effect for");
seeded();
const LINE1 = "1 salary change is waiting for a decision (Rohan Gupta)";
propose(KABIR, ROHAN, 100000, "2026-11-01");
setNow(2026, 12, 9);
const b1 = safe(() => PS.prepareRun(KABIR, 2026, 11));
check("B1", "9 Dec, November otherwise settled: its problems are exactly the waiting change; Kabir's Prepare refused naming it",
  j(PS.runProblems(2026, 11)) === j([LINE1]) && !b1.ok && b1.error === `November 2026 can't be prepared yet: ${LINE1}.`, j([PS.runProblems(2026, 11), errOf(b1)]));
setNow(2026, 12, 9, 12);
decide(AARAV, "SP-1", "approve");
const b2 = safe(() => PS.prepareRun(KABIR, 2026, 11));
check("B2", "approved: nothing holds November up; prepared, Rohan's row ₹1,00,000", j(PS.runProblems(2026, 11)) === "[]" && b2.ok && b2.record.rows.find((r) => r.userId === ROHAN)?.gross === 100000, errOf(b2));
const b3p = propose(KABIR, MEERA, 110000, "2026-11-01");
const b3 = safe(() => PS.approveRun(AARAV, 2026, 11));
check("B3", "a change proposed after November was prepared, dated 1 Nov: Aarav's Approve is refused naming it",
  b3p.ok && !b3.ok && b3.error === "November 2026 can't be approved yet: 1 salary change is waiting for a decision (Meera Joshi).", errOf(b3));
seeded();
propose(KABIR, ROHAN, 100000, "2026-12-01");
propose(KABIR, ARJUN, 95000, "2026-11-01");
setNow(2026, 12, 9);
check("B4", "the months it would be in effect for: Rohan's (from 1 Dec) not November, Arjun's (from 1 Nov) November and December too; two named in order",
  j(PS.runProblems(2026, 11)) === j(["1 salary change is waiting for a decision (Arjun Kapoor)"])
  && PS.runProblems(2026, 12).at(-1) === "2 salary changes are waiting for a decision (Arjun Kapoor, Rohan Gupta)", j([PS.runProblems(2026, 11), PS.runProblems(2026, 12).at(-1)]));
check("B5", "the line comes last, after every other problem (20 Nov: November hasn't ended, days not recorded yet, ... then the salary change)",
  (setNow(2026, 11, 20), PS.runProblems(2026, 11).length > 1 && PS.runProblems(2026, 11).at(-1) === "1 salary change is waiting for a decision (Arjun Kapoor)"), j(PS.runProblems(2026, 11)));
seeded();
setNow(2026, 11, 20);
propose(KABIR, ROHAN, 100000, "2026-11-01");
setup(set(AARAV, ROHAN, 96000, "2026-12-01"), "a record from 1 Dec");
setup(safe(() => S.deactivateUser(AARAV, "EMP-1017", "20 Nov 2026")), "Ananya leaves 20 Nov");
propose(KABIR, "EMP-1017", 80000, "2026-12-01");
setNow(2026, 12, 9);
check("B6", "not held up: a month where a later record takes over (Rohan's from 1 Nov vs Aarav's from 1 Dec: December), or one that doesn't pay the person (Ananya left 20 Nov, hers from 1 Dec)",
  PS.runProblems(2026, 11).at(-1) === LINE1 && !PS.runProblems(2026, 12).some((p) => /salary change/.test(p)), j([PS.runProblems(2026, 11).at(-1), PS.runProblems(2026, 12)]));

// =================================================================
section("S. store.js: nobody left to decide it, nobody left to pay");
seeded({ sneha: true });
propose(KABIR, AARAV, 170000, "2026-12-01");
const STUCK = "Sneha Rao is the last person who can decide Aarav Mehta's salary change SP-1: decide it first, or make sure someone else can.";
const u0 = usersRaw();
const s1 = [["demoted", safe(() => S.updateUser(AARAV, SNEHA, { role: "emp" }))], ["deactivated", safe(() => S.deactivateUser(AARAV, SNEHA, "20 Nov 2026"))], ["deleted", safe(() => S.deleteUser(AARAV, SNEHA))]];
check("S1", "Sneha, the only one who could decide Kabir's change to Aarav's salary: demoting, deactivating or deleting her is refused naming it; nobody changed",
  s1.every(([, r]) => r.error === STUCK) && usersRaw() === u0, j(s1.map(([l, r]) => [l, errOf(r)])));
propose(KABIR, ROHAN, 100000, "2026-12-01");
withdraw(KABIR, "SP-1");
const s2r = safe(() => S.updateUser(AARAV, SNEHA, { role: "emp" }));
check("S2", "with SP-1 withdrawn (Rohan's SP-2 still waits, Aarav can decide it): demoting Sneha goes through", s2r.ok && S.getUser(SNEHA).role === "emp", errOf(s2r));
seeded({ october: false });
propose(KABIR, ROHAN, 100000, "2026-12-01");
const u3 = usersRaw();
const s3r = safe(() => S.deleteUser(AARAV, ROHAN));
check("S3", "deleting Rohan while SP-1 would pay him: refused naming it; he stays", !s3r.ok && s3r.error === "Rohan Gupta has a salary change waiting for a decision (SP-1), so they can't be deleted: decide or withdraw it first." && usersRaw() === u3, errOf(s3r));
withdraw(KABIR, "SP-1");
const s4r = safe(() => S.deleteUser(AARAV, ROHAN));
check("S4", "withdrawn: the deletion goes through (nothing approved pays him)", s4r.ok && !S.getUser(ROHAN), errOf(s4r));
seeded();
propose(KABIR, ROHAN, 100000, "2026-12-01");
const s5r = safe(() => S.deactivateUser(AARAV, ROHAN, "20 Nov 2026"));
check("S5", "deactivating the person it would pay isn't refused (SP-1 can still be decided; a leaver may be given a salary, 12V V7.6)", s5r.ok, errOf(s5r));

// =================================================================
section("R. Reads");
seeded({ sneha: true });
propose(KABIR, ROHAN, 100000, "2026-12-01");
setNow(2026, 11, 20, 12);
propose(KABIR, ARJUN, 95000, "2026-12-01");
decide(AARAV, "SP-1", "reject", "No.");
setNow(2026, 11, 20, 13);
propose(KABIR, ROHAN, 98000, "2027-01-01");
check("R1", "salaryProposals(): newest first (SP-3, SP-2, SP-1); one person's (Rohan: SP-3, SP-1); pendingSalaryProposal(): Rohan's SP-3, Arjun's SP-2, Vikram none",
  has("salaryProposals") && j(PS.salaryProposals().map((p) => p.id)) === j(["SP-3", "SP-2", "SP-1"]) && j(PS.salaryProposals(ROHAN).map((p) => p.id)) === j(["SP-3", "SP-1"])
  && PS.pendingSalaryProposal(ROHAN)?.id === "SP-3" && PS.pendingSalaryProposal(ARJUN)?.id === "SP-2" && PS.pendingSalaryProposal(VIKRAM) === null);
check("R2", "proposalDecidersFor(): every active Admin but who proposed it and the person paid (Aarav and Sneha for Rohan's), by name",
  has("proposalDecidersFor") && j(PS.proposalDecidersFor(PS.pendingSalaryProposal(ROHAN)).map((u) => u.name)) === j(["Aarav Mehta", "Sneha Rao"]));
seeded();
const r3 = [proposalsRaw(), PS.runProblems(2026, 11)];
check("R3", "reading writes nothing: with no proposal ever made, runProblems() and the reads leave no salary-proposals key",
  r3[0] === null && (has("salaryProposals") ? (PS.salaryProposals(), PS.pendingSalaryProposal(ROHAN), proposalsRaw() === null) : false));

// =================================================================
section("N. setSalary() unchanged");
const grid = [[KABIR, ROHAN, 100000, "2026-12-01"], [AARAV, VIKRAM, 70000, "2026-11-01"], [PRIYA, ROHAN, 1, "2026-12-01"], [null, ROHAN, 1, "2026-12-01"], [KABIR, "EMP-9", 1, "2026-12-01"],
  [KABIR, KABIR, 1, "2026-12-01"], [KABIR, ROHAN, 1.5, "2026-12-01"], [KABIR, ROHAN, "100000", "2026-12-01"], [KABIR, ROHAN, 100000, "2026-12-15"], [KABIR, ROHAN, 100000, "2026-02-30"],
  [KABIR, ROHAN, 100000, undefined], [KABIR, ROHAN, 100000, "2026-10-01"], [KABIR, ROHAN, 0, "2026-10-01"], [AARAV, KABIR, 150000, "2027-01-01"]];
// Round 12Y (behavior): setSalary() now refuses a non-Admin first (salpage.mjs S1); Kabir is made an Admin on both sides,
// so the 14 calls compare its rules
const runGrid = (mod) => { seeded(); S.updateUser(AARAV, KABIR, { role: "admin" }); return j(grid.map(([a, w, g, f]) => { const r = safe(() => mod.setSalary(a, w, { gross: g, effectiveFrom: f })); return [r.ok, r.error ?? null, r.field ?? null, r.record ?? null]; })) + salaries(); };
check("N1", "14 setSalary() calls (writes, every refusal, the order), new code and the code before on fresh storage: the same results, fields, records and stored salaries",
  runGrid(PS) === runGrid(OLDPS));

// =================================================================
section("Z. Reset");
seeded();
propose(KABIR, ROHAN, 100000, "2026-12-01");
PS.resetPayrollData();
check("Z1", "resetPayrollData() (Reset demo data) removes the proposals too", proposalsRaw() === null && !mem.has("officeos:salaries"));

// =================================================================
section("X. Scope");
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, import.meta.url), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, import.meta.url), "utf8");
// Round 12Y (layout, X1; was the live js): 12X's own change set (js-pre12Y = 3766ac0); the live js: salpage.mjs X1
const jsNow = walk("./js-pre12Y"), jsPre = walk("./js-pre12X");
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12Y", p) !== srcAt("./js-pre12X", p));
check("X1", "exactly two js files changed, none added or removed: data/payroll-store.js and data/store.js", j(changedJs) === j(["data/payroll-store.js", "data/store.js"]) && j(jsNow) === j(jsPre), j(changedJs));
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12X").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12Y", p) === srcAt("./html-pre12X", p))   /* Round 12Y (layout; was the live pages): 3766ac0's; salpage.mjs X2 */
  && walk("./css-pre12X").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12X", p)));
const crlf = (s) => !s.endsWith("\n") && !/(^|[^\r])\n/.test(s);
const imports = (s) => j(s.match(/^import .*$/gm));
// Round 13D (layout, X3 / X4; was the live payroll-store.js): as 2d67e81 has it (js-pre13D); store.js stays live; the live payroll-store.js: tdsyear.mjs X4
const [ps, psPre, st, stPre] = [srcAt("./js-pre13D", "data/payroll-store.js"), srcAt("./js-pre12X", "data/payroll-store.js"), srcAt("./js", "data/store.js"), srcAt("./js-pre12X", "data/store.js")];
check("X3", "both CRLF with no final newline; no import changed", crlf(ps) && crlf(st) && imports(ps) === imports(psPre) && imports(st) === imports(stPre));
const fn = (s, name) => { const a = s.search(new RegExp(`\\n(export )?(async )?function ${name}\\(`)); return a < 0 ? "" : s.slice(a, s.indexOf("\r\n}", a) + 3); };
const SAME_PS = ["salaryFor", "salaryHistory", "payrollRunFor", "payrollRun", "canApprove", "approversFor", "payslipsFor", "storedRun", "prepareProblem", "prepareRun", "approveProblem", "approveRun", "checkSalary"];
const SAME_ST = ["lastApproverProblem", "decidesStage", "updateUser", "deactivateUser", "reactivateUser", "addUser", "approvedMonthCovering"];
check("X4", `the rest the same: ${SAME_PS.length} payroll-store.js and ${SAME_ST.length} store.js functions byte for byte (setSalary(), runProblems(), resetPayrollData(), strandedProblem() and deleteUser() changed)`,
  SAME_PS.every((f) => fn(ps, f) === fn(psPre, f) && fn(ps, f).length > 40) && SAME_ST.every((f) => fn(st, f) === fn(stPre, f) && fn(st, f).length > 40),
  j([...SAME_PS.filter((f) => fn(ps, f) !== fn(psPre, f)), ...SAME_ST.filter((f) => fn(st, f) !== fn(stPre, f))]));
// Round 12Y (layout; was the live payroll-store.js): 12X's result (js-pre12Y = 3766ac0); 12Y adds one line to setSalary() (salpage.mjs X4)
const ps12X = srcAt("./js-pre12Y", "data/payroll-store.js");
check("X5", "setSalary()'s checks live in salaryProblem(), which both setSalary() and proposeSalary() call; decideSalaryProposal() writes through setSalary(); no salary record is ever updated or removed",
  /function salaryProblem\(actor, person, fields\)/.test(ps12X) && /setSalary\([\s\S]{0,400}salaryProblem\(actor, person, fields\)/.test(fn(ps12X, "setSalary")) && /salaryProblem\(actor, person, fields\)/.test(fn(ps12X, "proposeSalary"))
  && /setSalary\(actor\.id, proposal\.userId/.test(fn(ps12X, "decideSalaryProposal")) && !/salaries\.(update|remove)\(/.test(ps12X));

console.log(`\n${passed} passed, ${failed} failed`);
