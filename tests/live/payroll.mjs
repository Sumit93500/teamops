// usage: node payroll.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 4B: the payroll data layer. ./js is the new code, ./js-pre4B the code before this round.
//   A  earnings split and statutory deductions (data/payroll.js, pure)
//   B  income tax against the sample slab table on finance/tax-deductions.html, and the rebate boundary
//   C  loss of pay, pure: days and rupees for 0, 1 and several penalty / unpaid days
//   D  data/payroll-store.js against the real stores (fixed clock: Wed 30 Sep 2026 11:00 local)
//   E  the five people the static pages hardcoded: new numbers vs old, every difference explained
//   F  source layout: what changed, nothing wired to a page, payroll.js pure, no import cycle
import fs from "fs";

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; },
};
const RealDate = Date;
let NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();   // Round 8F (setup): let, so takeUnpaid can file a past request on its date
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;

const P = await import("./js/data/payroll.js");
const PS = await import("./js/data/payroll-store.js");
const A = await import("./js/data/attendance-store.js");
const L = await import("./js/data/leave-store.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const H = await import("./js/data/holidays.js");
const OLD = await import("./js-pre4B/data/payroll.js");

// =====================================================================
section("A. Earnings split and statutory deductions");
let bad = [];
for (let g = 0; g <= 300000; g++) {
  const s = P.splitGross(g);
  if (s.basic + s.hra + s.conveyance + s.special !== g || Object.values(s).some((v) => v < 0 || !Number.isInteger(v))) bad.push(g);
}
check("A1", "splitGross(g): whole, non-negative parts that add up to g, for every g from ₹0 to ₹3,00,000", bad.length === 0, bad.slice(0, 5).join(" "));
bad = [];
for (let g = 5000; g <= 300000; g += 7) {
  const s = P.splitGross(g);
  if (s.basic !== Math.round(g * 0.4) || s.hra !== Math.round(s.basic * 0.5) || s.conveyance !== 1600 || P.providentFund(s.basic) !== Math.round(s.basic * 0.12) || P.professionalTax(g) !== 200) bad.push(g);
}
check("A2", "basic = 40% of gross, HRA = 50% of basic, conveyance ₹1,600, PF = 12% of basic, PT ₹200 (rounded to the rupee)", bad.length === 0, bad.slice(0, 5).join(" "));
const tiny = [0, 1, 1000, 2500, 4000, 4001].map((g) => [g, P.splitGross(g), P.professionalTax(g)]);
check("A3", "a gross too small for the full conveyance: conveyance shrinks to what's left, special is 0, still adds up; PT 0 only at gross 0",
  tiny.every(([g, s]) => s.basic + s.hra + s.conveyance + s.special === g && s.special >= 0) && tiny[0][2] === 0 && tiny[1][2] === 200 && P.splitGross(2500).conveyance === 1000,
  j(tiny.map(([g, s]) => [g, s.conveyance, s.special])));
const card = (g) => { const s = P.splitGross(g); const pf = P.providentFund(s.basic); return [s.basic, s.hra, s.conveyance, s.special, pf, (g + pf) * 12]; };
check("A4", "the static cards: salary-structure's Rohan (92,000) and payslip-view's Arjun (88,000) components, PF and annual cost",
  j(card(92000)) === j([36800, 18400, 1600, 35200, 4416, 1156992]) && j(card(88000)) === j([35200, 17600, 1600, 33600, 4224, 1106688]), j([card(92000), card(88000)]));
const keep = (c) => ({ name: c.name, type: c.type, formula: c.formula, taxable: c.taxable });
check("A5", "SALARY_COMPONENTS: the same 7 names, types, formula text and taxable flags as before (text now built from PAY_RULES), plus a key",
  // Round 9F (behaviour; was: the TDS formula equal to pre-4B's "slab-based"): it now reads "slab-based, sample tax rates"
  j(P.SALARY_COMPONENTS.map(keep)) === j(OLD.SALARY_COMPONENTS.map(keep).map((c) => (c.name === "Income tax (TDS)" ? { ...c, formula: "slab-based, sample tax rates" } : c))) && j(P.SALARY_COMPONENTS.map((c) => c.key)) === j(["basic", "hra", "conveyance", "special", "pf", "pt", "tds"]),
  j(P.SALARY_COMPONENTS.map((c) => c.formula)));

// =====================================================================
section("B. Income tax (sample slabs)");
const html = fs.readFileSync(`${DIR}/finance/tax-deductions.html`, "utf8");
const num = (s) => Number(s.replace(/[₹,]/g, ""));
const parsed = [...html.matchAll(/<tr class="slab-row[^"]*"><td>([^<]*)<\/td><td class="table__num">([^<]*)<\/td><\/tr>/g)].map(([, range, rate]) => {
  const upTo = /^Above/.test(range) ? null : num(range.match(/₹[\d,]+$/)[0]);
  return { upTo, rate: rate === "Nil" ? 0 : Number(rate.replace("%", "")) / 100 };
});
check("B1", `TAX_SAMPLE.slabs == the ${parsed.length} rows of the slab table on finance/tax-deductions.html`, parsed.length === 7 && j(P.TAX_SAMPLE.slabs) === j(parsed), j(parsed.map((s) => `${s.upTo ?? "above"}@${s.rate}`)));
check("B2", "the page and the module both say the slabs are sample values",
  /sample values for the design/.test(html) && /SAMPLE VALUES/.test(src("js", "data/payroll.js")) && P.TAX_SAMPLE.standardDeduction === 75000 && P.TAX_SAMPLE.rebateLimit === 1200000);
// An independent slab calculation (no rebate), to check annualTax against.
const slabTax = (x) => parsed.reduce(([t, lo], { upTo, rate }) => { const hi = upTo ?? Infinity; return [t + Math.max(0, Math.min(x, hi) - lo) * rate, hi]; }, [0, 0])[0];
const POINTS = [0, 400000, 800000, 1199999, 1200000, 1200001, 1600000, 2000000, 2400000, 3000000, 5000000];
// Round 13B (behavior; was "the plain slab sum above it"): marginal relief caps it at the income over the limit (relief.mjs R1 / R2)
check("B3", "annualTax(taxable) = 0 up to and including ₹12,00,000 (rebate), above it the plain slab sum or the income over ₹12,00,000, whichever is less (13B: marginal relief)",
  POINTS.every((x) => P.annualTax(x) === (x <= 1200000 ? 0 : Math.min(slabTax(x), x - 1200000))) && P.annualTax(1600000) === 120000 && P.annualTax(2400000) === 300000 && P.annualTax(3000000) === 480000,
  j(POINTS.map((x) => [x, P.annualTax(x)])));
let jumps = [];
// Round 13B (behavior; was "never by more than 30% of the extra income"): inside the relief band (to ₹12,70,588) each
// extra rupee is a rupee of tax (a step starting in it may end above it); from there the slabs' 30% at most, as before
for (let x = 1200001; x < 3000000; x += 997) { const d = P.annualTax(x + 997) - P.annualTax(x); if (d > (x < 1270588 ? 997 : 997 * 0.3) + 1e-6 || d < 0) jumps.push(x); }
check("B4", "above the rebate limit tax only rises: never by more than the extra income in the relief band, nor 30% of it above (no other jumps; 13B)", jumps.length === 0, jumps.slice(0, 3).join(" "));
// Monthly gross at the rebate boundary: 12 x 1,06,250 - 75,000 = 12,00,000 exactly.
const edge = [106249, 106250, 106251, 106260].map((g) => [g, g * 12 - 75000, P.monthlyTds(g)]);
// Round 13B (behavior; was ₹5,000 / ₹5,002, "the cliff"): marginal relief (relief.mjs R4 / G1)
check("B5", "rebate boundary: monthly gross ₹1,06,250 (taxable exactly ₹12,00,000) pays 0; ₹1,06,251 pays ₹1 a month, ₹1,06,260 ₹10 (13B: marginal relief, no cliff)",
  j(edge.map((e) => e[2])) === j([0, 0, 1, 10]), j(edge));
const monthlyCheck = [64000, 78500, 88000, 92000, 105000, 118000, 125000, 135000, 160000].map((g) => [g, P.monthlyTds(g), Math.round(Math.max(0, g * 12 - 75000) <= 1200000 ? 0 : slabTax(g * 12 - 75000) / 12)]);
check("B6", "monthlyTds(g) = round(slab tax on 12g - 75,000, rebate applied / 12) for all 9 seeded salaries", monthlyCheck.every(([, a, b]) => a === b), j(monthlyCheck.map(([g, t]) => [g, t])));

// =====================================================================
section("C. Loss of pay (pure)");
const D = (penaltyHalfDays, unpaidLeaveDays, workingDays = 22) => P.lossOfPayDays({ penaltyHalfDays, unpaidLeaveDays, workingDays });
check("C1", "LOP days: 0 / 1 penalty half day = 0.5 / 2 = 1 / 1 unpaid day = 1 / half day = 0.5 / 3 penalties + 2.5 unpaid = 4 / capped at working days",
  j([D(0, 0), D(1, 0), D(2, 0), D(0, 1), D(0, 0.5), D(3, 2.5), D(10, 30), D(4, 0, 0)]) === j([0, 0.5, 1, 1, 0.5, 4, 22, 0]),
  j([D(0, 0), D(1, 0), D(2, 0), D(0, 1), D(0, 0.5), D(3, 2.5), D(10, 30), D(4, 0, 0)]));
const amounts = [0, 0.5, 1, 2, 3.5, 22].map((d) => P.lossOfPayAmount(88000, d, 22));
check("C2", "LOP rupees are proportional: ₹88,000 over 22 working days is ₹4,000 a day (0, 0.5, 1, 2, 3.5, all 22 days)",
  j(amounts) === j([0, 2000, 4000, 8000, 14000, 88000]), j(amounts));
const odd = [[64000, 0.5, 22], [64000, 1.5, 22], [92000, 3.5, 20], [78500, 1, 21]].map(([g, d, w]) => [P.lossOfPayAmount(g, d, w), Math.round((g * d) / w)]);
check("C3", "... rounded to the rupee where the day rate isn't whole (64,000 x 0.5 / 22 = 1,454.55 -> 1,455)", odd.every(([a, b]) => a === b) && odd[0][0] === 1455, j(odd));
const pays = [[88000, 0, 0], [88000, 1, 0], [88000, 0, 1], [88000, 3, 2.5], [160000, 2, 3]].map(([g, pen, unp]) => [g, pen, unp, P.computePay(g, { penaltyHalfDays: pen, unpaidLeaveDays: unp, workingDays: 22 })]);
check("C4", "computePay: gross = monthly - LOP; earnings split that gross; PF on its basic; PT 200; TDS on the full monthly gross; net = gross - deductions",
  pays.every(([g, , , p]) => {
    const e = p.earnings;
    return p.gross === g - p.lop.amount && e.basic + e.hra + e.conveyance + e.special === p.gross && p.deductionLines.pf === Math.round(e.basic * 0.12)
      && p.deductionLines.pt === 200 && p.deductionLines.tds === P.monthlyTds(g) && p.deductions === p.deductionLines.pf + 200 + p.deductionLines.tds && p.net === p.gross - p.deductions;
  }), j(pays.map(([g, pen, unp, p]) => [g, pen, unp, p.lop.days, p.lop.amount, p.gross, p.deductions, p.net])));
const allOff = P.computePay(160000, { unpaidLeaveDays: 22, workingDays: 22 });
const nearly = P.computePay(160000, { unpaidLeaveDays: 21.5, workingDays: 22 });
check("C5", "a whole month unpaid pays 0 with 0 deductions; TDS is capped so net never goes below 0",
  allOff.gross === 0 && allOff.deductions === 0 && allOff.net === 0 && nearly.net >= 0 && nearly.deductionLines.tds < P.monthlyTds(160000),
  j([allOff.gross, allOff.net, nearly.gross, nearly.deductionLines, nearly.net]));

// =====================================================================
section("D. The payroll store against the real stores");
const SEED_GROSS = { "EMP-1001": 160000, "EMP-1003": 125000, "EMP-1008": 135000, "EMP-1017": 78500, "EMP-1023": 105000, "EMP-1029": 118000, "EMP-1042": 92000, "EMP-1088": 64000, "EMP-1105": 88000 };
localStorage.clear();
{ const r = A.decideRegularization("RG-102", "EMP-1003", "hr", "reject", "Decided before the clock (round 11W)"); if (!r.ok) throw new Error(`round 11W restage, RG-102: ${r.error}`); }   // Round 11W (restage): RG-102 rejected at 30 Sep 11:00 (D4 / D5 / D11)
const sal = PS.allSalaries();
const tracked = S.getAllUsers().filter((u) => u.status !== "inactive").map((u) => u.id).sort();
// Round 4F seeds Vikram's earlier salary (SAL-10) as well, so the seed has 10 records.
const current = sal.filter((s) => s.id !== "SAL-10");
check("D1", "one current salary record per tracked person (9; none for inactive Divya Menon), plus Vikram's earlier one (SAL-10, ₹60,000 from 1 Jan 2025): 10, kept in storage as a collection",
  j(current.map((s) => s.userId).sort()) === j(tracked) && current.every((s) => s.gross === SEED_GROSS[s.userId] && s.regime === "new") && !sal.some((s) => s.userId === "EMP-1061")
    && j(sal.find((s) => s.id === "SAL-10")) === j({ id: "SAL-10", userId: "EMP-1088", gross: 60000, effectiveFrom: "2025-01-01", regime: "new" })
    && JSON.parse(localStorage.getItem("officeos:salaries")).records.length === 10, j(sal.map((s) => `${s.userId}:${s.gross}@${s.effectiveFrom}`)));
check("D2", "salaryFor uses the record in effect on the 1st: Vikram from Jan 2026, everyone else from Apr 2026; none before",
  PS.salaryFor("EMP-1088", 2026, 1)?.id === "SAL-8" && PS.salaryFor("EMP-1105", 2026, 3) === null && PS.salaryFor("EMP-1105", 2026, 4)?.id === "SAL-9" && PS.salaryFor("EMP-1105", 2026, 13) === null);
const march = PS.payrollRunFor("EMP-1105", 2026, 3);
check("D3", "a month with no salary in effect: the row is on hold, amounts 0", march.status === "on-hold" && march.holdReason === "No salary on file for this month" && march.gross === 0 && march.net === 0, j([march.status, march.holdReason, march.net]));
// A revision effective mid-month (stored directly; no write API yet) applies from the next month.
const before = localStorage.getItem("officeos:salaries");
const rbox = JSON.parse(before);
rbox.records.push({ id: `SAL-${rbox.nextNum}`, userId: "EMP-1105", gross: 95000, effectiveFrom: "2026-10-15", regime: "new" });
localStorage.setItem("officeos:salaries", JSON.stringify(rbox));
const rev = [9, 10, 11].map((m) => [PS.salaryFor("EMP-1105", 2026, m)?.gross, PS.payrollRunFor("EMP-1105", 2026, m).monthlyGross]);
localStorage.setItem("officeos:salaries", before);
check("D3b", "a revision effective 15 Oct: September and October still use ₹88,000, November uses ₹95,000", j(rev) === j([[88000, 88000], [88000, 88000], [95000, 95000]]), j(rev));
const sep = PS.payrollRun(2026, 9, { preparedBy: "EMP-1008" });
const att = Object.fromEntries(sep.rows.map((r) => [r.userId, A.monthFor(r.userId, 2026, 9)]));
check("D4", "September 2026: 9 rows (by name), 22 working days each, LOP only from monthFor's penaltyHalfDays (Vikram: 3 late marks -> 1 penalty half day -> 0.5 day)",
  sep.rows.length === 9 && sep.rows.every((r) => r.workingDays === 22 && r.workingDays === att[r.userId].workingDays && r.lop.penaltyHalfDays === att[r.userId].penaltyHalfDays && r.lop.unpaidLeaveDays === 0)
    && j(sep.rows.filter((r) => r.lop.days).map((r) => [r.userId, att[r.userId].lateMarks, r.lop.days, r.lop.amount])) === j([["EMP-1088", 3, 0.5, 1455]]),
  j(sep.rows.map((r) => `${r.userId}:${r.lop.days}`)));
check("D5", "every September row == computePay(its salary, its month's inputs), plus its period and attendance coverage (Round 7B); all draft (everyone has a bank account)",
  sep.rows.every((r) => j({ ...r }) === j({ userId: r.userId, month: "2026-09", salaryId: PS.salaryFor(r.userId, 2026, 9).id, regime: "new",
    ...P.computePay(SEED_GROSS[r.userId], { penaltyHalfDays: att[r.userId].penaltyHalfDays, unpaidLeaveDays: 0, workingDays: 22 }), status: "draft", holdReason: null,
    period: { from: "2026-09-01", to: "2026-09-30" }, attendance: { noData: att[r.userId].counts.noData, notYet: att[r.userId].counts.notYet,
      openAbsences: [], uncountedAbsences: r.userId === "EMP-1088" ? 1 : 0,
      // Round 11W (shape): + pausedLateMarks; Sneha's one late mark has RG-103 pending (it costs nothing either way)
      pausedLateMarks: r.userId === "EMP-1029" ? 1 : 0,
      // Round 8F (shape): + beforeJoining (0: everyone joined years ago) and joined (the readable joining dates; five have none)
      beforeJoining: 0, joined: { "EMP-1001": "2019-04-04", "EMP-1003": "2020-07-15", "EMP-1008": "2020-11-02", "EMP-1105": "2023-01-12" }[r.userId] ?? null } })));   // Round 8D (shape + behaviour): rows carry openAbsences / uncountedAbsences; Vikram's settled seeded absence is uncounted (no joining date on file), so his pay is unchanged
check("D6", "the run: month, draft, preparedBy as given, approvedBy null; the preparer can't approve, someone else can, nobody (null) can't",
  sep.month === "2026-09" && sep.status === "draft" && sep.preparedBy === "EMP-1008" && sep.approvedBy === null
    && !PS.canApprove(sep, "EMP-1008") && PS.canApprove(sep, "EMP-1001") && !PS.canApprove(sep, null) && PS.totalNetPay(sep) === sep.rows.reduce((s, r) => s + r.net, 0),
  `total net ${PS.totalNetPay(sep)}`);
check("D7", "inactive (Divya), unknown id, month 0/13: payrollRunFor null; payrollRun skips inactive people and refuses a bad month",
  PS.payrollRunFor("EMP-1061", 2026, 9) === null && PS.payrollRunFor("EMP-9999", 2026, 9) === null && PS.payrollRunFor("EMP-1105", 2026, 13) === null
    && PS.payrollRunFor("EMP-1105", 2026, 0) === null && PS.payrollRun(2026, 13) === null && !sep.rows.some((r) => r.userId === "EMP-1061"));

// Unpaid leave, through the real leave store (apply as the person, approve as HR, Priya Nair).
const S8C = await import("./js/data/store.js");   // Round 8C (setup): to find the manager's role
const takeUnpaid = (userId, from, to, duration = "full", type = "unpaid") => {
  // Round 8F (setup): leave can't be dated more than 7 days back: a past request is filed on its first day, then the
  // clock is put back.
  const saved = NOW;
  const [fy, fm, fd] = from.split("-").map(Number);
  if (new RealDate(fy, fm - 1, fd, 11, 0, 0).getTime() < NOW - 7 * 864e5) NOW = new RealDate(fy, fm - 1, fd, 11, 0, 0).getTime();
  const r = L.applyLeave(userId, { type, from, to, duration, reason: "Test" });
  NOW = saved;
  if (!r.ok) throw new Error(`${userId} ${from}: ${r.error}`);
  // Round 8C (setup): a request with a manager on file is approved by the manager first.
  if (r.record.stage === "manager") { const m = S8C.getUser(r.record.managerId); L.decideLeave(r.record.id, m.id, m.role, "approve"); }
  const d = L.decideLeave(r.record.id, "EMP-1003", "hr", "approve");
  if (!d.ok) throw new Error(`approve ${r.record.id}: ${d.error}`);
  return r.record.id;
};
const octOff = ["2026-10-06", "2026-10-09", "2026-10-12", "2026-10-21", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29"].filter((x) => H.isDayOff(x));
const octWd = A.monthFor("EMP-1105", 2026, 10).workingDays;
const zero = PS.payrollRunFor("EMP-1105", 2026, 10);
takeUnpaid("EMP-1105", "2026-10-06", "2026-10-06");                       // Arjun: 1 day
takeUnpaid("EMP-1042", "2026-10-26", "2026-10-28");                       // Rohan: 3 days
takeUnpaid("EMP-1042", "2026-10-29", "2026-10-29", "first-half");         // ... and a half day
takeUnpaid("EMP-1008", "2026-10-09", "2026-10-12");                       // Kabir: Fri to Mon, over a weekend
takeUnpaid("EMP-1029", "2026-10-21", "2026-10-21", "first-half", "casual"); // Sneha: casual first half
takeUnpaid("EMP-1029", "2026-10-21", "2026-10-21", "second-half");        // ... unpaid second half, same day
const oct = Object.fromEntries(["EMP-1105", "EMP-1042", "EMP-1008", "EMP-1029", "EMP-1001"].map((id) => [id, PS.payrollRunFor(id, 2026, 10)]));
check("D8", `October (${octWd} working days; none of the test dates is a holiday): unpaid leave days 0 (Aarav), 1 (Arjun), 3.5 (Rohan), 2 (Kabir, Fri-Mon over a weekend)`,
  octOff.length === 0 && zero.lop.days === 0 && j(["EMP-1001", "EMP-1105", "EMP-1042", "EMP-1008"].map((id) => oct[id].lop.unpaidLeaveDays)) === j([0, 1, 3.5, 2]),
  j(Object.entries(oct).map(([id, r]) => [id, r.lop.unpaidLeaveDays, r.lop.amount])));
check("D9", "... and each costs gross x days / working days: Arjun 88,000 x 1/20 = 4,400; Rohan 92,000 x 3.5/20 = 16,100; Kabir 1,35,000 x 2/20 = 13,500",
  octWd === 20 && oct["EMP-1105"].lop.amount === 4400 && oct["EMP-1042"].lop.amount === 16100 && oct["EMP-1008"].lop.amount === 13500 && oct["EMP-1001"].lop.amount === 0
    && Object.values(oct).every((r) => r.gross === r.monthlyGross - r.lop.amount && r.net === r.gross - r.deductions));
const sneDay = A.monthFor("EMP-1029", 2026, 10).days.find((x) => x.date === "2026-10-21");
check("D10", "a day with a casual first half and an unpaid second half counts 0.5 unpaid (the day object names only one leave, so it isn't used for this)",
  oct["EMP-1029"].lop.unpaidLeaveDays === 0.5 && sneDay.status === "on-leave" && sneDay.leave.type === "casual", j([oct["EMP-1029"].lop.unpaidLeaveDays, sneDay.status, sneDay.leave]));
// Vikram's September: his one real absence becomes approved unpaid leave, on top of his late-mark penalty.
const vAbsent = A.monthFor("EMP-1088", 2026, 9).days.find((x) => x.status === "absent").date;
takeUnpaid("EMP-1088", vAbsent, vAbsent);
const vm = A.monthFor("EMP-1088", 2026, 9);
const v = PS.payrollRunFor("EMP-1088", 2026, 9);
check("D11", `penalty and unpaid leave together: Vikram's absence on ${vAbsent} as unpaid leave + 1 penalty half day = 1.5 days, 64,000 x 1.5/22 = 4,364`,
  vm.penaltyHalfDays === 1 && v.lop.penaltyHalfDays === 1 && v.lop.unpaidLeaveDays === 1 && v.lop.days === 1.5 && v.lop.amount === 4364 && v.gross === 59636,
  j([v.lop, v.gross, v.net]));
const pendingOnly = L.applyLeave("EMP-1017", { type: "unpaid", from: "2026-10-06", to: "2026-10-06", duration: "full", reason: "Test" });
check("D12", "pending (not yet approved) unpaid leave doesn't count", pendingOnly.ok && PS.payrollRunFor("EMP-1017", 2026, 10).lop.unpaidLeaveDays === 0);
// No bank account: give a new hire a salary through the collection's storage box (no write API yet).
const hire = S.addUser(USER_ACTOR("admin", null), { name: "Test Hire", email: "test.hire@northwind.com", department: "ENG", designation: "Intern", role: "emp" });
const box = JSON.parse(localStorage.getItem("officeos:salaries"));
box.records.push({ id: `SAL-${box.nextNum}`, userId: hire.record?.id, gross: 30000, effectiveFrom: "2026-09-01", regime: "new" });
box.nextNum += 1;
localStorage.setItem("officeos:salaries", JSON.stringify(box));
const h = PS.payrollRunFor(hire.record?.id, 2026, 9);
check("D13", "a new hire with a salary but no bank account on file: on hold, numbers still worked out",
  hire.ok && h?.status === "on-hold" && h.holdReason === "No bank account on file" && h.gross > 0 && PS.payrollRun(2026, 9).rows.length === 10, j([h?.status, h?.holdReason, h?.gross]));
PS.resetPayrollData();
check("D14", "resetPayrollData() drops the saved salaries; the next read seeds the 10 again", localStorage.getItem("officeos:salaries") === null && PS.allSalaries().length === 10);

// =====================================================================
section("E. The five people the static pages hardcoded: old numbers vs new");
localStorage.clear();
{ const r = A.decideRegularization("RG-102", "EMP-1003", "hr", "reject", "Decided before the clock (round 11W)"); if (!r.ok) throw new Error(`round 11W restage, RG-102: ${r.error}`); }   // Round 11W (restage): RG-102 rejected at 30 Sep 11:00 (E1)
const fresh = PS.payrollRun(2026, 9, { preparedBy: OLD.PAYROLL_RUN.preparedBy });
const rows = OLD.PAYROLL_RUN.rows.map((o) => {
  const n = fresh.rows.find((r) => r.userId === o.userId);
  const oldTds = o.deductions - Math.round(Math.round(o.gross * 0.4) * 0.12) - 200;
  return { id: o.userId, old: [o.gross, o.deductions, o.net, o.status, oldTds], neu: [n.gross, n.deductions, n.net, n.status, n.deductionLines.tds, n.lop.days] };
});
for (const r of rows) console.log(`      ${r.id}  old gross/ded/net/status/TDS ${j(r.old)}  new ${j(r.neu.slice(0, 5))}  LOP ${r.neu[5]}`);
check("E1", "same gross for the four with no loss of pay; Vikram's gross is 1,455 less (0.5 LOP day from his real late marks)",
  rows.every((r) => (r.id === "EMP-1088" ? r.neu[0] === r.old[0] - 1455 : r.neu[0] === r.old[0])));
check("E2", "the old PF and PT were already the formula (old deductions - 12% of basic - 200 = the old TDS); only TDS was invented",
  j(rows.map((r) => r.old[4])) === j([10104, 7272, 5688, 12610, 9476]));
check("E3", "new TDS is 0 for all five: annual gross - 75,000 is under the ₹12,00,000 rebate limit for each (highest: Meera, 12,60,000 - 75,000 = 11,85,000)",
  rows.every((r) => r.neu[4] === 0) && OLD.PAYROLL_RUN.rows.every((o) => o.gross * 12 - 75000 <= 1200000));
check("E4", "so new deductions are PF + PT only, and net is higher by the old TDS (less PF on the LOP for Vikram)",
  rows.every((r) => { const n = fresh.rows.find((x) => x.userId === r.id); return r.neu[1] === n.deductionLines.pf + 200 && (r.id === "EMP-1088" || r.neu[2] === r.old[2] + r.old[4]); }),
  j(rows.map((r) => [r.id, r.neu[2] - r.old[2]])));
check("E5", "status: old draft / draft / on-hold / draft / paid; now all draft (nothing holds Vikram; Arjun's 'paid' was his August payslip, not September)",
  j(rows.map((r) => r.old[3])) === j(["draft", "draft", "on-hold", "draft", "paid"]) && rows.every((r) => r.neu[3] === "draft"));
check("E6", "the old run had 5 rows; the derived one has all 9 tracked people", OLD.PAYROLL_RUN.rows.length === 5 && fresh.rows.length === 9);

// =====================================================================
section("F. Source layout");
const walk = (dir, base = "") => fs.readdirSync(new URL(`./${dir}/${base}`, import.meta.url), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const ALL = walk("js");
// Round 4B's own change set: its committed result (js-post4B, frozen at 212db6f) vs the code before it.
const POST_4B = walk("js-post4B");
const changed = POST_4B.filter((p) => !fs.existsSync(new URL(`./js-pre4B/${p}`, import.meta.url)) || src("js-post4B", p) !== src("js-pre4B", p));
check("F1", "the only changes in the js tree: data/payroll.js changed, data/payroll-store.js added; nothing removed",
  j(changed) === j(["data/payroll-store.js", "data/payroll.js"]) && walk("js-pre4B").every((p) => POST_4B.includes(p)), j(changed));
const importers = POST_4B.filter((p) => /from "[^"]*payroll(-store)?\.js"/.test(src("js-post4B", p)));
check("F2", "in Round 4B's result, nothing imports either payroll module except payroll-store importing payroll.js (no page or UI wired then)", j(importers) === j(["data/payroll-store.js"]), j(importers));
const pure = src("js", "data/payroll.js").split(/\r?\n/).filter((l) => !l.trim().startsWith("//")).join("\n");
check("F3", "data/payroll.js is pure: no imports, no storage, no clock", !/\bimport\b|localStorage|\bDate\b/.test(pure));
const resolve = (from, spec) => new URL(spec, `file:///x/${from}`).pathname.slice(3);
const reach = (start) => { const out = new Set(), todo = [start]; while (todo.length) { const p = todo.pop(); if (out.has(p)) continue; out.add(p); for (const m of src("js", p).matchAll(/^import [^;]*? from "([^"]+)";/gm)) todo.push(resolve(p, m[1])); } return out; };
const graph = reach("data/payroll-store.js");
check("F4", "no import cycle: nothing payroll-store.js imports leads back to it", [...graph].filter((p) => p !== "data/payroll-store.js").every((p) => !reach(p).has("data/payroll-store.js")), j([...graph].sort()));
const oldExports = Object.keys(OLD).sort();
const usedOld = walk("js-pre4B").filter((p) => p !== "data/payroll.js" && /PAYROLL_RUN|payrollRowFor|totalNetPay|data\/payroll\.js|\.\/payroll\.js/.test(src("js-pre4B", p)));
check("F5", "data/payroll.js exports before / after; the dropped ones (PAYROLL_RUN, payrollRowFor, totalNetPay) were imported by nothing",
  usedOld.length === 0 && j(oldExports) === j(["PAYROLL_RUN", "SALARY_COMPONENTS", "payrollRowFor", "totalNetPay"]),
  `before ${j(oldExports)} after ${j(Object.keys(P).sort())} | store ${j(Object.keys(PS).sort())}`);
const lines = (s) => s.split("\n").length;
check("F6", "both files CRLF with no final newline, like the rest of the repo", ["data/payroll.js", "data/payroll-store.js"].every((p) => { const s = src("js", p); return !s.endsWith("\n") && s.split("\r\n").length === lines(s); }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
