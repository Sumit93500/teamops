// usage: node tdsyear.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 13D (R10's U4d, 10U; round-13a-scoping.md option (c), round-13c-scoping.md C1 / C2 / C5): TDS on what's
// actually paid. data/payroll.js yearTds() works a month's TDS out from the tax year so far (an annual projection with
// catch-up, "plan" rounding, the last month or a leaver's settling the year, floored at ₹0, capped as before);
// computePay() takes the year as an optional third argument (without it, monthlyTds() as before); taxYearMonths() is
// April-March. data/payroll-store.js yearRows() walks a person's year forward (approved months from their stored rows),
// and payrollRunFor() / payslipsFor() go through it. ./js-pre13D, ./html-pre13D and ./css-pre13D are the code, pages and
// css before this round (office-os 2d67e81).
//   G  before: TDS on the full monthly gross;  R  the rule (pure);  S  through the real store (13C's cases, the walk,
//   staleness, the row's shape);  P  the payslips page;  E  no page errors;  X  scope
// Storage seeded Fri 30 Oct 2026 19:00 (salchain's fixture where a case says); clocks fixed per step.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
setNow(2026, 11, 20);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", MEERA = "EMP-1023", SNEHA = "EMP-1029";

let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, who, js = "./js") {
  mem.set("officeos:session", JSON.stringify({ roleKey: who[0], userLabel: who[1], employeeId: who[2], signedInAt: NOW }));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${DIR}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`${js}/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); }
  }
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const safe = (f) => { try { return f(); } catch (e) { return `threw: ${e.message}`; } };

const P = await import("./js/data/payroll.js");
const OLDP = await import("./js-pre13D/data/payroll.js");   // before this round
const PS = await import("./js/data/payroll-store.js");
const OLDPS = await import("./js-pre13D/data/payroll-store.js");   // before this round, on the same storage
const S = await import("./js/data/store.js");
const L = await import("./js/data/leave-store.js");
const A = await import("./js/data/attendance-store.js");
const SD = 75000;
// the new functions, guarded so the suite fails rather than crashes on the code before (js-pre13D has neither)
const tym = (...a) => (P.taxYearMonths ? P.taxYearMonths(...a) : [[null]]);
const ytd = (...a) => (P.yearTds ? P.yearTds(...a) : null);
const FY = [[2026, 4], [2026, 5], [2026, 6], [2026, 7], [2026, 8], [2026, 9], [2026, 10], [2026, 11], [2026, 12], [2027, 1], [2027, 2], [2027, 3]];

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
function plain() { mem.clear(); setNow(2026, 10, 30, 19); S.getAllUsers(); PS.allSalaries(); setNow(2026, 11, 20); }
// salchain's fixture: pending leave cancelled and corrections rejected (so Sep-Nov settle), Vikram given a joining date;
// october: October prepared (Kabir) and approved (Aarav) on 9 Nov.
function settled({ october = false } = {}) {
  mem.clear(); setNow(2026, 10, 30, 19); S.getAllUsers(); PS.allSalaries(); PS.payrollRun(2026, 10);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, "EMP-1088", { dateOfJoining: "8 Jan 2024" });
  if (october) { setNow(2026, 11, 9); PS.prepareRun(KABIR, 2026, 10); PS.approveRun(AARAV, 2026, 10); }
}
// An unpaid leave applied on `at` and approved through its chain (an Admin's own is approved at once).
function unpaid(u, from, to, at = [2026, 11, 20]) {
  setNow(...at);
  const r = L.applyLeave(u, { type: "unpaid", from, to, duration: "full", reason: "Round 13D" });
  if (!r.ok) return r.error;
  for (let n = 0; n < 4; n++) {
    const q = L.allRequests().find((x) => x.id === r.record.id);
    if (q.status !== "pending") return q.status;
    const by = q.stage === "manager" && q.managerId && q.managerId !== PRIYA ? q.managerId : (q.userId === PRIYA ? AARAV : PRIYA);
    const dec = L.decideLeave(q.id, by, S.getUser(by).role, "approve");
    if (!dec.ok) return dec.error;
  }
  return L.allRequests().find((x) => x.id === r.record.id).status;
}
// A person's tax year through payrollRunFor(), month by month, from 9 Apr 2027: [{ paid, tds, old (the code before) }]
function year(u, Q = PS) {
  setNow(2027, 4, 9);
  return FY.map(([y, m]) => { const r = Q.payrollRunFor(u, y, m), o = OLDPS.payrollRunFor(u, y, m); return { paid: r?.gross ?? 0, tds: r?.deductionLines.tds ?? 0, old: o?.deductionLines.tds ?? 0 }; });
}
const tdsOf = (rows) => rows.map((r) => r.tds);
const sum = (a) => a.reduce((t, x) => t + x, 0);
const taxOnPaid = (rows) => P.annualTax(Math.max(0, sum(rows.map((r) => r.paid)) - SD));

// =================================================================
section("G. Before");
settled({ october: true }); unpaid(AARAV, "2026-11-23", "2026-11-24"); setNow(2026, 12, 9);
const g1 = OLDPS.payrollRunFor(AARAV, 2026, 11);
check("G1", "the code before: Aarav with 2 of 21 November days unpaid is paid ₹1,44,762 and still has ₹14,083 TDS, the tax on a full ₹1,60,000 month, every month of the year (₹1,68,996)",
  g1.gross === 144762 && g1.deductionLines.tds === 14083 && j(tdsOf(year(AARAV, OLDPS))) === j(Array(12).fill(14083)), j([g1.gross, g1.deductionLines.tds]));

// =================================================================
section("R. The rule (data/payroll.js)");
check("R1", "taxYearMonths(): the April-March year a month is in, in order (Nov 2026, Apr 2026 and Mar 2027 all give April 2026 to March 2027; Feb 2026 the year before)",
  [[2026, 11], [2026, 4], [2027, 3]].every(([y, m]) => j(tym(y, m)) === j(FY)) && j(tym(2026, 2)[0]) === j([2025, 4]) && j(tym(2026, 2).at(-1)) === j([2026, 3]));
// a whole year through yearTds() with nothing changing, at each of a sweep of grosses
let r2bad = null, r2n = 0;
for (let G = 60000; G <= 400000; G += 1013) {
  r2n++;
  let soFar = 0, ded = 0; const t = [];
  for (let i = 0; i < 12; i++) { const x = ytd({ paidGross: G, incomeSoFar: soFar, tdsSoFar: ded, monthsBefore: i, monthsLeft: 12 - i, monthlyGross: G }); t.push(x); soFar += G; ded += x; }
  const annual = Math.round(P.annualTax(Math.max(0, 12 * G - SD)));
  if ((t.slice(0, 11).some((x) => x !== P.monthlyTds(G)) || ded !== annual) && !r2bad) r2bad = [G, t, annual];
}
check("R2", `a year nothing changes ("plan" rounding): April-February are monthlyTds() exactly and March takes the remainder, so the year adds up to the annual tax (${r2n} grosses, ₹60,000-₹4,00,000; ₹1,60,000: 11 × ₹14,083 + ₹14,087 = ₹1,69,000)`,
  r2bad === null, j(r2bad));
let r3bad = null;
for (let G = 50000; G <= 300000; G += 2511) for (const [n, wd] of [[0, 22], [1, 22], [2, 21], [11, 22], [22, 22]]) {
  const a = P.computePay(G, { unpaidLeaveDays: n, workingDays: wd }), b = OLDP.computePay(G, { unpaidLeaveDays: n, workingDays: wd });
  if (j(a) !== j(b) && !r3bad) r3bad = [G, n, a.deductionLines.tds, b.deductionLines.tds];
}
check("R3", "computePay() without the year (the salary page's example card) is exactly as before, loss of pay or not: TDS monthlyTds() of the full monthly gross", r3bad === null && P.computePay(160000, { unpaidLeaveDays: 2, workingDays: 21 }).deductionLines.tds === 14083, j(r3bad));
// November (month 7) for ₹1,60,000 with 2 of 21 days unpaid, April-October at ₹14,083
const nov = (extra = {}) => P.computePay(160000, { unpaidLeaveDays: 2, workingDays: 21 }, { incomeSoFar: 7 * 160000, tdsSoFar: 7 * 14083, monthsBefore: 7, monthsLeft: 5, ...extra });
check("R4", "with the year: Aarav's November (₹1,44,762 paid) has ₹13,473 TDS, the year's tax on what's paid (₹1,65,952) less what's gone, spread; the rest of the row is as before",
  nov().deductionLines.tds === 13473 && j({ ...nov(), deductionLines: null, deductions: null, net: null }) === j({ ...OLDP.computePay(160000, { unpaidLeaveDays: 2, workingDays: 21 }), deductionLines: null, deductions: null, net: null }),
  j(nov().deductionLines));
const fin = (G, extra) => ytd({ paidGross: 56435, incomeSoFar: 8 * 118000, tdsSoFar: 0, monthsBefore: 8, monthsLeft: 4, monthlyGross: G, ...extra });
check("R5", "the last month settles the year: a leaver's final month (finalMonth) and March take round(the year's tax − TDS so far), projecting nothing after (₹1,18,000 for 8 months with no TDS yet, then ₹56,435: ₹0 tax on ₹10,00,435, so ₹0; ₹1,60,000 × 11 + March: March ₹14,087)",
  fin(118000, { finalMonth: true }) === 0 && fin(500000, { finalMonth: true }) === 0 && fin(118000, {}) > 0
  && ytd({ paidGross: 160000, incomeSoFar: 11 * 160000, tdsSoFar: 11 * 14083, monthsBefore: 11, monthsLeft: 1, monthlyGross: 999999 }) === 14087
  && ytd({ paidGross: 300000, incomeSoFar: 8 * 160000, tdsSoFar: 0, monthsBefore: 8, monthsLeft: 4, monthlyGross: 300000, finalMonth: true }) === Math.round(P.annualTax(1580000 - SD)),
  j([fin(118000, { finalMonth: true }), fin(118000, {})]));
const band = ytd({ paidGross: 107000 - 5095, incomeSoFar: 7 * 107000, tdsSoFar: 7 * 750, monthsBefore: 7, monthsLeft: 5, monthlyGross: 107000 });
const capped = P.computePay(160000, { unpaidLeaveDays: 21, workingDays: 22 }, { incomeSoFar: 7 * 160000, tdsSoFar: 0, monthsBefore: 7, monthsLeft: 5 });
check("R6", "never below ₹0 (in the relief band one unpaid day takes the year's tax under what's gone: ₹0, not a refund), then capped at what's left of pay as before (a month with 1 of 22 days paid: TDS = gross − PF − PT)",
  band === 0 && capped.deductionLines.tds === capped.gross - capped.deductionLines.pf - capped.deductionLines.pt && capped.net === 0
  && ytd({ paidGross: 0, incomeSoFar: 0, tdsSoFar: 50000, monthsBefore: 11, monthsLeft: 1, monthlyGross: 0 }) === 0, j([band, capped.deductionLines, capped.net]));
// a year with loss of pay in one month (early / late), through computePay() and the year, as the store would carry it
function yearWith(G, lopAt, days) {
  let soFar = 0, ded = 0; const t = [];
  for (let i = 0; i < 12; i++) { const p = P.computePay(G, { unpaidLeaveDays: i === lopAt ? days : 0, workingDays: 22 }, { incomeSoFar: soFar, tdsSoFar: ded, monthsBefore: i, monthsLeft: 12 - i }); t.push(p.deductionLines.tds); soFar += p.gross; ded += p.deductionLines.tds; }
  return { t, ded, tax: Math.round(P.annualTax(Math.max(0, soFar - SD))) };
}
const R7 = [0, 5, 7, 10, 11].map((i) => yearWith(160000, i, 5));
check("R7", "5 of 22 days unpaid in April, September, November, February or March: the year's TDS is ₹1,61,727 each time, the tax on what's paid (the code before: ₹1,68,996); the later the month, the bigger each remaining month's drop",
  R7.every((r) => r.ded === 161727 && r.tax === 161727) && R7[0].t[0] > R7[2].t[7] && R7[2].t[7] > R7[3].t[10] && R7[3].t[10] > R7[4].t[11], j(R7.map((r) => [r.ded, r.t.find((x) => x !== 14083)])));

// =================================================================
section("S. Through the store");
settled({ october: true }); setNow(2026, 12, 9);
const runsSame = [[2026, 9], [2026, 10], [2026, 11]].map(([y, m]) => j(PS.payrollRun(y, m).rows) === j(OLDPS.payrollRun(y, m).rows));
check("S1", "no loss of pay on a taxed row: September-November's runs are the same as before, row for row, and so are Aarav's payslips (October from its approved run)",
  runsSame.every(Boolean) && j(PS.payslipsFor(AARAV, "2026-12-09")) === j(OLDPS.payslipsFor(AARAV, "2026-12-09")), j(runsSame));
const marchTds = () => { setNow(2027, 4, 9); return [AARAV, KABIR, PRIYA, SNEHA].map((u) => PS.payrollRunFor(u, 2027, 3).deductionLines.tds); };
const aYear = year(AARAV);
check("S2", "March 2027 takes each taxed person's rounding remainder: Aarav ₹14,087, Kabir ₹9,307, Priya ₹7,807, Sneha ₹6,757 (before: ₹14,083 / ₹9,313 / ₹7,813 / ₹6,763); April-February unchanged; Aarav's year ₹1,69,000 = the annual tax",
  j(marchTds()) === j([14087, 9307, 7807, 6757]) && j(tdsOf(aYear).slice(0, 11)) === j(Array(11).fill(14083)) && sum(tdsOf(aYear)) === 169000, j(marchTds()));
settled({ october: true }); unpaid(AARAV, "2026-11-23", "2026-11-24");
const bYear = year(AARAV);
check("S3", "Aarav, 2 unpaid days 23-24 Nov (approved at once): November ₹13,473, then ₹13,474 / ₹13,473 / ₹13,474, March ₹13,477; the year ₹1,65,952 = the tax on what's paid (before: ₹14,083 every month, ₹1,68,996)",
  j(tdsOf(bYear).slice(7)) === j([13473, 13474, 13473, 13474, 13477]) && sum(tdsOf(bYear)) === 165952 && Math.round(taxOnPaid(bYear)) === 165952 && sum(bYear.map((r) => r.old)) === 168996, j(tdsOf(bYear).slice(7)));
setNow(2026, 12, 9);
const bSlips = PS.payslipsFor(AARAV, "2026-12-09");
check("S4", "payslipsFor() gives the same live rows as payrollRunFor() (December ₹13,474, November ₹13,473) and October's approved row (₹14,083)",
  j(bSlips.map((s) => [s.month, s.deductionLines.tds, s.runStatus ?? null])) === j([["2026-12", 13474, null], ["2026-11", 13473, null], ["2026-10", 14083, "approved"]])
  && j(bSlips[0]) === j(PS.payrollRunFor(AARAV, 2026, 12)) && j(bSlips[1]) === j(PS.payrollRunFor(AARAV, 2026, 11)), j(bSlips.map((s) => s.deductionLines.tds)));
// the walk reads an approved month's stored row, and not a prepared one's
settled({ october: true }); setNow(2026, 12, 9);
rawEdit("payroll-runs", (r) => r.month === "2026-10", (r) => { r.rows.find((x) => x.userId === AARAV).deductionLines.tds += 1000; });
const fromStored = PS.payrollRunFor(AARAV, 2026, 11).deductionLines.tds;
settled(); setNow(2026, 11, 9); PS.prepareRun(KABIR, 2026, 10);
rawEdit("payroll-runs", (r) => r.month === "2026-10", (r) => { r.rows.find((x) => x.userId === AARAV).deductionLines.tds += 1000; });
setNow(2026, 12, 9);
const fromPrepared = PS.payrollRunFor(AARAV, 2026, 11).deductionLines.tds;
check("S5", "an approved month counts as the figures its run fixed: ₹1,000 more TDS stored in October's approved row takes ₹200 off November (₹13,883); a prepared, not approved run isn't read (₹14,083)",
  fromStored === 13883 && fromPrepared === 14083, j([fromStored, fromPrepared]));
// the floor, reached through the app
settled(); setNow(2026, 10, 30, 19);
const cRaise = PS.proposeSalary(AARAV, MEERA, { gross: 107000, effectiveFrom: "2026-04-01" });
const cLeave = unpaid(MEERA, "2026-11-23", "2026-11-23");
const cYear = year(MEERA);
check("S6", "the floor: Meera ₹1,07,000 from 1 Apr (relief TDS ₹750) with 1 unpaid day in November: her year's tax falls to ₹3,905 with ₹5,250 gone, so November-March are ₹0, not negative (before: ₹750 every month)",
  cRaise.ok && cLeave === "approved" && j(tdsOf(cYear)) === j([...Array(7).fill(750), 0, 0, 0, 0, 0]) && Math.round(taxOnPaid(cYear)) === 3905 && cYear.every((r) => r.old === 750), j([cLeave, tdsOf(cYear)]));
plain();
const dRaise = PS.proposeSalary(AARAV, MEERA, { gross: 106251, effectiveFrom: "2026-12-01" });
const dNov = PS.payrollRunFor(MEERA, 2026, 11), dDec = PS.payrollRunFor(MEERA, 2026, 12), dOld = OLDPS.payrollRunFor(MEERA, 2026, 12);
check("S7", "13B's raise into the relief band (₹1,06,251 from 1 Dec): her year (8 × ₹1,05,000 + 4 × ₹1,06,251) stays under ₹12,75,000, so December's TDS is ₹0 and net ₹1,00,951, ₹1,191 more than November's (13B alone: ₹1, ₹1,00,950)",
  dRaise.ok && dDec.deductionLines.tds === 0 && dDec.net === 100951 && dDec.net - dNov.net === 1191 && dOld.deductionLines.tds === 1 && dOld.net === 100950, j([dDec.deductionLines.tds, dDec.net]));
plain();
const eRaise = PS.proposeSalary(AARAV, KABIR, { gross: 150000, effectiveFrom: "2027-02-01" });
const eYear = year(KABIR);
check("S8", "a raise entered ahead (Kabir ₹1,50,000 from 1 Feb 2027): the months before it are untouched (₹9,313; the later months are projected at the month's own gross), February ₹11,563 and March ₹11,557 catch up; the year ₹1,16,250 = the tax on what's paid (before: ₹12,083 from February, ₹1,17,296)",
  eRaise.ok && j(tdsOf(eYear)) === j([...Array(10).fill(9313), 11563, 11557]) && Math.round(taxOnPaid(eYear)) === 116250, j(tdsOf(eYear).slice(9)));
plain(); setNow(2026, 10, 30, 19);
const hire = S.addUser(AARAV, { name: "Neha Kapoor", email: "neha.kapoor@northwind.com", department: "ENG", designation: "Software Engineer", dateOfJoining: "3 Nov 2026" }).record?.id;
PS.proposeSalary(AARAV, hire, { gross: 150000, effectiveFrom: "2026-11-01" });
for (let day = 3; day <= 30; day++) { setNow(2026, 11, day, 9, 30); if (A.checkIn(hire, "office").ok) { setNow(2026, 11, day, 18, 30); A.checkOut(hire); } }
setNow(2026, 12, 9);
const fNov = PS.payrollRunFor(hire, 2026, 11), fOld = OLDPS.payrollRunFor(hire, 2026, 11);
check("S9", "a joiner's first month (3 Nov, ₹1,50,000, checked in every working day): the months before joining count ₹0, so her year (₹1,42,857 + 4 × ₹1,50,000) is under the limit and November's TDS is ₹0 (before: ₹12,083)",
  fNov?.gross === 142857 && fNov.deductionLines.tds === 0 && fOld.deductionLines.tds === 12083, j([fNov?.gross, fNov?.deductionLines.tds]));
settled({ october: true }); setNow(2026, 12, 20);
const gGone = S.deactivateUser(AARAV, SNEHA, "2026-12-15");
const gYear = year(SNEHA);
check("S10", "a leaver (Sneha, last working day 15 Dec): her final month settles the year; with ₹10,00,435 paid there's no tax, so December is ₹0, not negative (before: ₹6,763), and no month after it has a row",
  gGone.ok && gYear[8].paid === 56435 && j(tdsOf(gYear)) === j([...Array(8).fill(6763), 0, 0, 0, 0]) && gYear[8].old === 6763, j(tdsOf(gYear).slice(7)));
// a leaver who still owes tax: the final month settles it, projecting nothing after
settled({ october: true }); setNow(2026, 11, 20);
const hRaise = PS.proposeSalary(AARAV, SNEHA, { gross: 600000, effectiveFrom: "2026-12-01" });
setNow(2026, 12, 31); const hGone = S.deactivateUser(AARAV, SNEHA, "2026-12-31");
const hYear = year(SNEHA);
const hOwed = Math.round(P.annualTax(8 * 118000 + 600000 - SD)) - 8 * 6763;
check("S13", `a leaver who still owes tax (Sneha raised to ₹6,00,000 from 1 Dec, last working day 31 Dec): December settles her year, ₹${hOwed.toLocaleString("en-IN")} (the tax on ₹15,44,000 less ₹54,104 gone), with no month projected after it; nothing after December (before: ₹1,43,125, a full ₹6,00,000 month's)`,
  hRaise.ok && hGone.ok && hYear[8].paid === 600000 && hYear[8].tds === hOwed && hOwed === 46246 && sum(tdsOf(hYear)) === Math.round(taxOnPaid(hYear)) && hYear.slice(9).every((r) => r.paid === 0)
  && hYear[8].old === 143125 && P.monthlyTds(600000) === 143125, j([hYear[8], hOwed]));
// staleness: whole rows are compared, and nothing new is in them
settled({ october: true }); setNow(2026, 12, 9);
PS.prepareRun(KABIR, 2026, 11);
const sA = PS.approveProblem(AARAV, 2026, 11);
settled({ october: true }); unpaid(AARAV, "2026-11-23", "2026-11-24"); setNow(2026, 12, 9);
OLDPS.prepareRun(KABIR, 2026, 11);
const sB = PS.approveProblem(AARAV, 2026, 11);
const again = PS.prepareRun(KABIR, 2026, 11), done = PS.approveRun(AARAV, 2026, 11);
settled(); unpaid(AARAV, "2026-11-23", "2026-11-24"); setNow(2026, 12, 9);
PS.prepareRun(KABIR, 2026, 10); PS.prepareRun(KABIR, 2026, 11); PS.approveRun(AARAV, 2026, 10);
const sC = PS.approveProblem(AARAV, 2026, 11);
check("S11", "staleness is the whole-row comparison, as before: a November prepared with no loss of pay on a taxed row can still be approved; one prepared by the code before with Aarav's unpaid days must be prepared again (then ₹13,473 is approved); approving October after November was prepared doesn't make November stale",
  sA === null && sB === "The figures have changed since this run was prepared: prepare it again." && again.ok && done.ok && done.record.rows.find((r) => r.userId === AARAV).deductionLines.tds === 13473 && sC === null, j([sA, sB, sC]));
settled(); setNow(2026, 12, 9);
check("S12", "no new field on a row: every row of November's run has the same keys as before (so nothing makes a prepared run stale but a figure)",
  PS.payrollRun(2026, 11).rows.every((r, i) => j(Object.keys(r)) === j(Object.keys(OLDPS.payrollRun(2026, 11).rows[i]))) && j(Object.keys(PS.payrollRun(2026, 11).rows[0].deductionLines)) === j(["pf", "pt", "tds"]));

// =================================================================
section("P. The payslips page");
settled({ october: true }); unpaid(AARAV, "2026-11-23", "2026-11-24"); setNow(2026, 12, 9);
const ytdLine = () => [txt(d.querySelector('[data-stat="ytd-tds"] .stat__value')), txt(d.querySelector('[data-field="tds"]'))];
await open("payroll/payslips", ["admin", "Aarav Mehta", AARAV]);
const p1 = ytdLine();
await open("payroll/payslips", ["admin", "Aarav Mehta", AARAV], "./js-pre13D");
const p0 = ytdLine();
check("P1", "Aarav's payslips page (9 Dec, 2 unpaid days in November): this year's TDS ₹41,030 (October ₹14,083 + November ₹13,473 + December ₹13,474), the stat and the year-to-date line (before: ₹42,249)",
  j(p1) === j(["₹41,030", "₹41,030"]) && j(p0) === j(["₹42,249", "₹42,249"]), j([p1, p0]));

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
// Round 13F (layout; was the live js): 13F changes pages/approval-workflows.js. 13D's change set, on 13D's result
// (js-pre13F = dbde089) against js-pre13D; the live js: wfsalary.mjs X1.
const jsNow = walk("./js-pre13F"), jsPre = walk("./js-pre13D");
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre13F", p) !== srcAt("./js-pre13D", p));
check("X1", "exactly two js files changed, none added or removed: data/payroll-store.js, data/payroll.js", j(changedJs) === j(["data/payroll-store.js", "data/payroll.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 13N (layout, X2; was the live pages): 13D's own pages; the live pages: resetcard.mjs X2
const pagesNow = walk("./html-pre13N").filter((f) => f.endsWith(".html"));
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre13D").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre13N", p) === srcAt("./html-pre13D", p))
  && walk("./css-pre13D").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre13D", p)));
const crlf = (s) => !s.endsWith("\n") && !/(^|[^\r])\n/.test(s);
const codeOf = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l));
const gone = (now, pre) => codeOf(pre).filter((l) => !codeOf(now).includes(l));
const [py, pyP, ps, psP] = [srcAt("./js", "data/payroll.js"), srcAt("./js-pre13D", "data/payroll.js"), srcAt("./js-pretu", "data/payroll-store.js") /* React round 5 (layout; was the live js): office-os 9c21988's copy; the live js: jsguard.mjs C1 */, srcAt("./js-pre13D", "data/payroll-store.js")];
const fn = (s, name) => s.slice(s.indexOf(`export function ${name}(`), s.indexOf("\r\n}", s.indexOf(`export function ${name}(`)));
check("X3", "payroll.js: CRLF, no final newline; exports taxYearMonths and yearTds added, none removed; annualTax() and monthlyTds() as before; comments aside, only computePay()'s signature and TDS line replaced",
  crlf(py) && j(Object.keys(P).sort()) === j([...Object.keys(OLDP), "taxYearMonths", "yearTds"].sort()) && ["annualTax", "monthlyTds"].every((n) => fn(py, n) === fn(pyP, n))
  && j(gone(py, pyP)) === j(["export function computePay(monthlyGross, { penaltyHalfDays = 0, unpaidLeaveDays = 0, absenceDays = 0, leftDays = 0, notJoinedDays = 0, workingDays = 0 } = {}) {",
    "  const tds = Math.min(monthlyTds(monthlyGross), Math.max(0, gross - pf - pt));"]), j(gone(py, pyP)));
check("X4", "payroll-store.js: CRLF, no final newline; the same exports; comments aside, only the import line and payslipsFor()'s push of a live row replaced (payrollRunFor()'s body moved into rowFor())",
  crlf(ps) && j(Object.keys(PS).filter((k) => k !== "runMonthState").sort()) === j(Object.keys(OLDPS).sort())   /* React round 5 (behaviour): runMonthState() added; emptyrange.mjs S2 */
  && j(gone(ps, psP)) === j(['import { computePay } from "./payroll.js";', '    if (!away) slips.push(fixed ? { ...fixed, runStatus: "approved" } : payrollRunFor(userId, y, m));']), j(gone(ps, psP)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
