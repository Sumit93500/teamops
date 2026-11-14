// usage: node payrules.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// P1: the dated statutory rules table (data/pay-rules.js) and the calculations on it (data/statutory.js). Data only:
// nothing on screen reads them, and data/payroll.js computes as before (K). ./js is the build. Clock Tue 6 Oct 2026, 10:00 local.
//   A  the table: every row's shape, ids, sources, confidence; a row for every state (PT, LWF)
//   B  ruleOn at the exact effective dates (the day before, the day, after), scopes, bad input
//   C  statutory wages: the Labour Codes' 50% add-back, and none before 21 Nov 2025
//   D  PF at ceiling - 1 / at / above, both ceilings by date, EPS / EPF split, EDLI, admin, the full-wages switch
//   E  ESI at ceiling - 1 / at / above, the daily-wage exemption
//   F  professional tax per state, the February rule, half-yearly, empty and unknown states
//   G  labour welfare fund per state and period
//   H  gratuity accrual; statutoryFor (everything for one person's month); interns
//   J  verify, add a row, the switch: Admin only (four roles + a manager), the audit entries, reads never write
//   K  nothing existing changed: data/payroll.js's figures, and no key written by reading
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
NOW = new RealDate(2026, 9, 6, 10, 0, 0).getTime();
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const R = await import("./js/data/pay-rules.js");
const T = await import("./js/data/statutory.js");
const keysAfterImport = [...mem.keys()];
const S = await import("./js/data/store.js");
const O = await import("./js/data/offices-store.js");
const PAY = await import("./js/data/payroll.js");
console.log(`TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const PEOPLE = { admin: "EMP-1001", hr: "EMP-1003", fin: "EMP-1008", emp: "EMP-1105", manager: "EMP-1029" };
const on = (key, date, scope) => R.ruleOn(key, date, scope);

section("A. The table");
const rows = R.allRules();
check("A1", "every row has the fields: id, key, scope, effectiveFrom, employee and employer rate, value, source, confidence, note, verifiedBy, verifiedByName, verifiedOn",
  rows.length > 80 && rows.every((r) => j(Object.keys(r)) === j(["id", "key", "scope", "effectiveFrom", "employeeRate", "employerRate", "value", "source", "confidence", "note", "verifiedBy", "verifiedByName", "verifiedOn"])), rows.length);
check("A2", "ids are unique and spell key@scope@effectiveFrom", new Set(rows.map((r) => r.id)).size === rows.length && rows.every((r) => r.id === `${r.key}@${r.scope}@${r.effectiveFrom}`));
check("A3", "every date is a real YYYY-MM-DD; every confidence is confirmed, secondary or unverified; nothing is verified at the start",
  rows.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.effectiveFrom) && R.CONFIDENCE.includes(r.confidence) && r.verifiedBy === null && r.verifiedOn === null));
check("A4", "every row with a number names its source (an https page); only empty rows and Haryana's ruled 0 have none",
  rows.every((r) => (r.source.startsWith("https://") ? true : r.confidence === "unverified" && (r.value === null || r.id === `pt@Haryana@${R.START_UNKNOWN}`))), j(rows.filter((r) => !r.source).length));
check("A5", "a confirmed or secondary row always has a source and a number", rows.filter((r) => r.confidence !== "unverified").every((r) => r.source && (r.value !== null || r.employeeRate !== null || r.employerRate !== null)));
check("A6", "the rules", j(R.PAY_RULE_KEYS) === j(["wages.addback", "pf", "pf.edli", "pf.admin", "esi", "esi.ceiling", "esi.exempt", "pt", "lwf", "gratuity", "tax.section", "tax.new", "tax.old", "tax.cess", "tax.surcharge", "tax.hra", "tax.allowances"]), j(R.PAY_RULE_KEYS));
check("A7", "professional tax: a row for every one of the 36 states and territories (31 of them empty and unverified)",
  O.OFFICE_STATES.every((s) => on("pt", "2026-10-31", s)) && O.OFFICE_STATES.filter((s) => on("pt", "2026-10-31", s).value === null).length === 31 && rows.filter((r) => r.key === "pt" && r.value === null).every((r) => r.confidence === "unverified"));
check("A8", "labour welfare fund: a row for every state (32 empty and unverified); Haryana's two are confirmed, the other three states' unverified",
  O.OFFICE_STATES.every((s) => on("lwf", "2026-10-31", s)) && O.OFFICE_STATES.filter((s) => on("lwf", "2026-10-31", s).value === null).length === 32
  && rows.filter((r) => r.key === "lwf" && r.scope === "Haryana").every((r) => r.confidence === "confirmed") && ["Tamil Nadu", "Karnataka", "Maharashtra"].every((s) => on("lwf", "2026-12-31", s).confidence === "unverified"));
const conf = (id) => rows.find((r) => r.id === id)?.confidence;
check("A9", "confidence as ruled: Haryana PT, cess, the old regime, surcharge, gratuity, the PF admin charge, Tamil Nadu PT unverified; ESI rates and Maharashtra PT confirmed; the PF ceiling and the ESI ceiling secondary",
  j(["pt@Haryana@2000-01-01", "tax.cess@all@2025-04-01", "tax.old@all@2025-04-01", "tax.surcharge@all@2000-01-01", "gratuity@all@2025-11-21", "pf.admin@all@2014-09-01", "pt@Tamil Nadu@2024-04-01"].map(conf)) === j(Array(7).fill("unverified"))
  && conf("esi@all@2019-07-01") === "confirmed" && conf("pt@Maharashtra@2023-04-01") === "confirmed" && conf("pf@all@2026-09-17") === "secondary" && conf("esi.ceiling@all@2019-07-01") === "secondary");
check("A10", "the ruled values: cess 4%, the old regime's slabs and 50,000 deduction, the new regime's slabs, 75,000 and the 12,00,000 rebate, Haryana PT 0",
  on("tax.cess", "2026-10-31").value.rate === 0.04 && j(on("tax.old", "2026-10-31").value.slabs.map((s) => [s.upTo, s.rate])) === j([[250000, 0], [500000, 0.05], [1000000, 0.2], [null, 0.3]]) && on("tax.old", "2026-10-31").value.standardDeduction === 50000
  && j(on("tax.new", "2026-10-31").value.slabs.map((s) => [s.upTo, s.rate])) === j(PAY.TAX_SAMPLE.slabs.map((s) => [s.upTo, s.rate])) && on("tax.new", "2026-10-31").value.standardDeduction === 75000 && on("tax.new", "2026-10-31").value.rebate.upTo === 1200000
  && j(on("pt", "2026-10-31", "Haryana").value.slabs) === j([{ upTo: null, amount: 0 }]));
check("A11", "a row read is a copy: changing it changes nothing", (() => { const r = on("pf", "2026-10-31"); r.value.wageCeiling = 1; r.employeeRate = 9; return on("pf", "2026-10-31").value.wageCeiling === 25000 && on("pf", "2026-10-31").employeeRate === 0.12; })());

section("B. The rule in force on a date");
const ceil = (d) => on("pf", d)?.value.wageCeiling ?? null;
check("B1", "PF ceiling: none before 1 Sep 2014; 15,000 from that day to 16 Sep 2026; 25,000 from 17 Sep 2026", j(["2014-08-31", "2014-09-01", "2026-09-16", "2026-09-17", "2026-09-18", "2030-01-01"].map(ceil)) === j([null, 15000, 15000, 25000, 25000, 25000]), j(["2014-08-31", "2014-09-01", "2026-09-16", "2026-09-17", "2026-09-18"].map(ceil)));
check("B2", "the wages add-back: no rule on 20 Nov 2025, in force from 21 Nov 2025", on("wages.addback", "2025-11-20") === null && on("wages.addback", "2025-11-21").value.allowanceShare === 0.5 && on("wages.addback", "2025-11-22").id === "wages.addback@all@2025-11-21");
const cap = (d) => on("lwf", d, "Haryana")?.value.employeeCap ?? null;
check("B3", "Haryana LWF: none on 31 Dec 2024; cap 34 from 1 Jan 2025 to 31 Dec 2025; cap 35 from 1 Jan 2026", j(["2024-12-31", "2025-01-01", "2025-12-31", "2026-01-01", "2026-01-02"].map(cap)) === j([null, 34, 34, 35, 35]), j(["2024-12-31", "2025-01-01", "2025-12-31", "2026-01-01"].map(cap)));
check("B4", "ESI: no rule on 30 Jun 2019; 0.75% / 3.25% from 1 Jul 2019", on("esi", "2019-06-30") === null && j([on("esi", "2019-07-01").employeeRate, on("esi", "2019-07-01").employerRate]) === j([0.0075, 0.0325]));
check("B5", "the salary TDS section: 192 on 31 Mar 2026, 392 from 1 Apr 2026", on("tax.section", "2026-03-31").value.salaryTds === "192" && on("tax.section", "2026-04-01").value.salaryTds === "392");
check("B6", "Maharashtra PT: no rule on 31 Mar 2023, the schedule from 1 Apr 2023; West Bengal from 1 Apr 2014", on("pt", "2023-03-31", "Maharashtra") === null && on("pt", "2023-04-01", "Maharashtra").value.slabs.length === 3 && on("pt", "2014-03-31", "West Bengal") === null && on("pt", "2014-04-01", "West Bengal") !== null);
check("B7", "the scope is exact: a state's rule isn't the country's and the other way round", on("pt", "2026-10-31") === null && on("pf", "2026-10-31", "Haryana") === null && on("lwf", "2026-10-31", "all") === null);
check("B8", "an unknown rule, an unknown state, a date that isn't one: null", on("nope", "2026-10-31") === null && on("pt", "2026-10-31", "Atlantis") === null && on("pf", "2026-02-30") === null && on("pf", "31-10-2026") === null && on("pf", null) === null && on("pf", 20261031) === null);
check("B9", "the history of a rule, oldest first", j(R.ruleHistory("pf").map((r) => r.effectiveFrom)) === j(["2014-09-01", "2026-09-17"]) && j(R.ruleHistory("lwf", "Haryana").map((r) => r.value.employeeCap)) === j([34, 35]) && R.ruleHistory("pt").length === 0);

section("C. Statutory wages (the 50% add-back)");
const W = (gross, basic, date = "2026-10-31", more = {}) => T.statutoryWages({ gross, basic, ...more }, date);
const pickW = (w) => [w.wages, w.base, w.others, w.addBack];
check("C1", "basic 40% of 1,00,000: the other 60,000 is 10,000 over half, so wages are 50,000", j(pickW(W(100000, 40000))) === j([50000, 40000, 60000, 10000]), j(pickW(W(100000, 40000))));
check("C2", "basic exactly 50%: nothing added back, wages = basic", j(pickW(W(100000, 50000))) === j([50000, 50000, 50000, 0]));
check("C3", "one rupee under and over half: 49,999 basic adds back 1; 50,001 adds nothing", j(pickW(W(100000, 49999))) === j([50000, 49999, 50001, 1]) && j(pickW(W(100000, 50001))) === j([50001, 50001, 49999, 0]));
check("C4", "basic 60%: wages are the basic, 60,000", j(pickW(W(100000, 60000))) === j([60000, 60000, 40000, 0]));
check("C5", "DA and a retaining allowance count as wages: 30,000 + 15,000 + 5,000 of 1,00,000 is exactly half", j(pickW(W(100000, 30000, "2026-10-31", { da: 15000, retaining: 5000 }))) === j([50000, 50000, 50000, 0]));
check("C6", "before 21 Nov 2025 there is no add-back: wages are the basic; from that day there is", W(100000, 40000, "2025-11-20").wages === 40000 && W(100000, 40000, "2025-11-20").rules.length === 0 && W(100000, 40000, "2025-11-21").wages === 50000);
check("C7", "an odd gross: half of 78,501 rounds up to 39,251, so basic 31,400 (40%) gives wages 39,250", j(pickW(W(78501, 31400))) === j([39250, 31400, 47101, 7850]), j(pickW(W(78501, 31400))));
check("C8", "nothing paid, or a basic above the gross: never more than the gross, never negative", j(pickW(W(0, 0))) === j([0, 0, 0, 0]) && j(pickW(W(1000, 5000))) === j([1000, 1000, 0, 0]) && j(pickW(W(-5, -5))) === j([0, 0, 0, 0]));
check("C9", "the answer names its row and its confidence (secondary: not flagged unverified)", j(W(100000, 40000).rules) === j(["wages.addback@all@2025-11-21"]) && W(100000, 40000).unverified === false);

section("D. Provident fund");
const PF = (wages, date = "2026-10-31", opt = { onFullWages: false }, employmentType = "Full-time") => T.pfFor({ wages, employmentType }, date, opt);
const pickP = (p) => [p.wageBase, p.employee, p.employer, p.eps, p.epfEmployer, p.edli, p.admin, p.employerTotal];
check("D1", "ceiling 25,000 (Oct 2026): one under, at, and one over", j([24999, 25000, 25001].map((w) => pickP(PF(w)))) === j([[24999, 3000, 3000, 2082, 918, 125, 125, 3250], [25000, 3000, 3000, 2083, 917, 125, 125, 3250], [25000, 3000, 3000, 2083, 917, 125, 125, 3250]]), j([24999, 25000, 25001].map((w) => pickP(PF(w)))));
check("D2", "ceiling 15,000 (Aug 2026): one under, at, and one over", j([14999, 15000, 15001].map((w) => pickP(PF(w, "2026-08-31")))) === j([[14999, 1800, 1800, 1249, 551, 75, 75, 1950], [15000, 1800, 1800, 1250, 550, 75, 75, 1950], [15000, 1800, 1800, 1250, 550, 75, 75, 1950]]), j([14999, 15000, 15001].map((w) => pickP(PF(w, "2026-08-31")))));
check("D3", "the same 50,000 wages: 1,800 on 16 Sep 2026, 3,000 from 17 Sep 2026; a payroll month is taken as of its first day: August and September 2026 on 15,000 (1,800), October on 25,000 (3,000)", PF(50000, "2026-09-16").employee === 1800 && PF(50000, "2026-09-17").employee === 3000 && PF(50000, T.monthStart(2026, 8)).employee === 1800 && PF(50000, T.monthStart(2026, 9)).employee === 1800 && PF(50000, T.monthStart(2026, 10)).employee === 3000);
check("D4", "low wages: 12% of 10,000 = 1,200 each; EPS 833, EPF 367; EDLI 50; admin 50", j(pickP(PF(10000))) === j([10000, 1200, 1200, 833, 367, 50, 50, 1300]), j(pickP(PF(10000))));
check("D5", "the full-wages switch: 50,000 wages give 6,000 each; EPS stays capped at 2,083 (EPF 3,917); EDLI on the ceiling (125); admin on the full wages (250)", j(pickP(PF(50000, "2026-10-31", { onFullWages: true }))) === j([50000, 6000, 6000, 2083, 3917, 125, 250, 6375]), j(pickP(PF(50000, "2026-10-31", { onFullWages: true }))));
check("D6", "the switch changes nothing under the ceiling", j(pickP(PF(20000, "2026-10-31", { onFullWages: true }))) === j(pickP(PF(20000))));
check("D7", "an intern: no PF at all, whatever the wages or the switch", j(pickP(PF(50000, "2026-10-31", { onFullWages: true }, "Intern"))) === j([0, 0, 0, 0, 0, 0, 0, 0]) && PF(50000, "2026-10-31", {}, "intern").applies === false && PF(50000, "2026-10-31", {}, " INTERN ").reason === "intern" && PF(50000, "2026-10-31", {}, "Contract").applies === true);
check("D8", "no wages: nothing; before the first PF row: no rule", j(pickP(PF(0))) === j([0, 0, 0, 0, 0, 0, 0, 0]) && PF(50000, "2014-08-31").applies === false && PF(50000, "2014-08-31").reason === "no-rule");
check("D9", "the rows used are named; the unverified admin-charge row flags the answer", j(PF(50000).rules) === j(["pf@all@2026-09-17", "pf.edli@all@2014-09-01", "pf.admin@all@2014-09-01"]) && PF(50000).unverified === true && PF(50000).ceiling === 25000);
check("D10", "rounding is half up: 12% of 12,504 = 1,500.48 -> 1,500; of 12,505 = 1,500.6 -> 1,501; EPS 8.33% of 25,000 = 2,082.5 -> 2,083", PF(12504).employee === 1500 && PF(12505).employee === 1501 && PF(25000).eps === 2083 && T.rupees(0.5) === 1 && T.rupees(0.49) === 0 && T.rupees(2.5) === 3);

section("E. ESI");
const ESI = (gross, more = {}, date = "2026-10-31") => T.esiFor({ gross, employmentType: "Full-time", ...more }, date);
const pickE = (e) => [e.applies, e.employee, e.employer];
check("E1", "ceiling 21,000: one under (157 / 682), at (158 / 683: both halves round up), one over (not covered)", j([20999, 21000, 21001].map((g) => pickE(ESI(g)))) === j([[true, 157, 682], [true, 158, 683], [false, 0, 0]]), j([20999, 21000, 21001].map((g) => pickE(ESI(g)))));
check("E2", "above the ceiling says why; 10,000 gives 75 and 325", ESI(21001).reason === "above-ceiling" && ESI(60000).applies === false && j(pickE(ESI(10000))) === j([true, 75, 325]));
check("E3", "a daily wage up to 176: the employee pays nothing, the employer still pays; at 177 both pay", j(pickE(ESI(4500, { dailyWage: 176 }))) === j([true, 0, 146]) && ESI(4500, { dailyWage: 176 }).employeeExempt === true && j(pickE(ESI(4500, { dailyWage: 177 }))) === j([true, 34, 146]) && j(pickE(ESI(4500))) === j([true, 34, 146]));
check("E4", "an intern: no ESI, even under the ceiling", j(pickE(ESI(15000, { employmentType: "Intern" }))) === j([false, 0, 0]) && ESI(15000, { employmentType: "Intern" }).reason === "intern");
check("E7", "a month cut short by loss of pay: the full monthly gross decides coverage (30,000 with 12,000 paid: not covered; 20,000 with 12,000 paid: 90 + 390)", j(pickE(ESI(12000, { coverageGross: 30000 }))) === j([false, 0, 0]) && j(pickE(ESI(12000, { coverageGross: 20000 }))) === j([true, 90, 390]) && j(pickE(ESI(12000, { coverageGross: 21000 }))) === j([true, 90, 390]) && j(pickE(ESI(12000, { coverageGross: 21001 }))) === j([false, 0, 0]));
check("E5", "before 1 Jul 2019 there is no rule; no wages, no ESI", ESI(15000, {}, "2019-06-30").reason === "no-rule" && j(pickE(ESI(0))) === j([false, 0, 0]));
check("E6", "the rows used: rates confirmed, ceiling secondary, so not flagged unverified", j(ESI(15000).rules) === j(["esi@all@2019-07-01", "esi.ceiling@all@2019-07-01"]) && ESI(15000).unverified === false && ESI(15000).ceiling === 21000);

section("F. Professional tax, by state");
const PT = (gross, state, date = "2026-10-31") => T.professionalTaxFor({ gross }, date, state);
const amounts = (state, list, date) => list.map((g) => PT(g, state, date).amount);
check("F1", "Maharashtra: nil to 7,500; 175 to 10,000; then 200", j(amounts("Maharashtra", [7500, 7501, 10000, 10001, 100000])) === j([0, 175, 175, 200, 200]), j(amounts("Maharashtra", [7500, 7501, 10000, 10001, 100000])));
check("F2", "Maharashtra in February: 300 above 10,000; the 175 band stays 175; nil stays nil; a leap February too", j(amounts("Maharashtra", [7500, 9000, 10001, 100000], "2027-02-28")) === j([0, 175, 300, 300]) && PT(50000, "Maharashtra", "2028-02-29").amount === 300 && PT(50000, "Maharashtra", "2027-01-31").amount === 200 && PT(50000, "Maharashtra", "2027-03-31").amount === 200);
check("F3", "a year in Maharashtra adds up to 2,500", [4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((s, m) => s + PT(50000, "Maharashtra", T.monthStart(2026, m)).amount, 0) + [1, 2, 3].reduce((s, m) => s + PT(50000, "Maharashtra", T.monthStart(2027, m)).amount, 0) === 2500);
check("F4", "Karnataka: nil under 25,000; 200 from 25,000; February is 200 too", j(amounts("Karnataka", [24999, 25000, 25001])) === j([0, 200, 200]) && PT(50000, "Karnataka", "2027-02-28").amount === 200);
check("F5", "West Bengal: nil to 10,000; 110 to 15,000; 130 to 25,000; 150 to 40,000; then 200", j(amounts("West Bengal", [10000, 10001, 15000, 15001, 25000, 25001, 40000, 40001])) === j([0, 110, 110, 130, 130, 150, 150, 200]), j(amounts("West Bengal", [10000, 10001, 15000, 15001, 25000, 25001, 40000, 40001])));
check("F6", "Tamil Nadu (half-yearly, partial): due in September and March only, on six months' pay: nil to 21,000, 180 to 30,000",
  j(amounts("Tamil Nadu", [3500, 3501, 5000], "2026-09-30")) === j([0, 180, 180]) && j(amounts("Tamil Nadu", [3500, 3501, 5000], "2027-03-31")) === j([0, 180, 180]) && PT(5000, "Tamil Nadu", "2026-10-31").amount === 0 && PT(5000, "Tamil Nadu", "2026-10-31").due === false);
const tn = PT(5001, "Tamil Nadu", "2026-09-30");
check("F7", "Tamil Nadu above 30,000 a half-year: the slab was not read, so 0, marked incomplete and unverified", tn.amount === 0 && tn.incomplete === true && tn.reason === "slab-not-known" && tn.unverified === true, j(tn));
const hr = PT(100000, "Haryana");
check("F8", "Haryana (the head office): 0 at any pay, flagged unverified, in February too", hr.amount === 0 && hr.unverified === true && j(hr.rules) === j(["pt@Haryana@2000-01-01"]) && PT(100000, "Haryana", "2027-02-28").amount === 0 && !hr.missing);
const pb = PT(100000, "Punjab");
check("F9", "a state with an empty row (Punjab, Delhi, Gujarat): 0, marked missing and unverified", pb.amount === 0 && pb.missing === true && pb.reason === "empty-row" && pb.unverified === true && PT(100000, "Delhi").missing === true && PT(100000, "Gujarat").missing === true);
check("F10", "no state, an unknown state, or a date before the state's schedule: 0, missing, flagged", PT(100000, null).reason === "no-state" && PT(100000, "Atlantis").reason === "no-rule" && PT(100000, "Maharashtra", "2023-03-31").reason === "no-rule" && [PT(100000, null), PT(100000, "Atlantis"), PT(100000, "Maharashtra", "2023-03-31")].every((p) => p.amount === 0 && p.missing && p.unverified));
check("F11", "nothing paid, nothing due; a confirmed schedule is not flagged", PT(0, "Maharashtra").amount === 0 && PT(50000, "Maharashtra").unverified === false && PT(50000, "West Bengal").unverified === false);

section("G. Labour welfare fund, by state");
const LWF = (gross, state, date = "2026-10-31") => { const l = T.labourWelfareFor({ gross }, date, state); return [l.employee, l.employer]; };
check("G1", "Haryana 2026: 0.2% of wages, at most 35; the employer twice that. 10,000 -> 20 + 40; 17,499 -> 35; 17,500 -> 35; 1,00,000 -> 35 + 70", j([10000, 17499, 17500, 100000].map((g) => LWF(g, "Haryana"))) === j([[20, 40], [35, 70], [35, 70], [35, 70]]), j([10000, 17499, 17500, 100000].map((g) => LWF(g, "Haryana"))));
check("G2", "just under the cap: 17,249 -> 34 (34.498); 17,250 -> 35 (34.5 rounds up)", j([17249, 17250].map((g) => LWF(g, "Haryana"))) === j([[34, 68], [35, 70]]), j([17249, 17250].map((g) => LWF(g, "Haryana"))));
check("G3", "Haryana in 2025: capped at 34 (employer 68); on 31 Dec 2025 still 34, on 1 Jan 2026 35; in 2024 no rule", j(LWF(100000, "Haryana", "2025-06-30")) === j([34, 68]) && j(LWF(100000, "Haryana", "2025-12-31")) === j([34, 68]) && j(LWF(100000, "Haryana", "2026-01-01")) === j([35, 70]) && T.labourWelfareFor({ gross: 100000 }, "2024-12-31", "Haryana").reason === "no-rule");
check("G4", "Haryana is monthly, confirmed, not flagged; every month the same", [1, 2, 6, 12].every((m) => j(LWF(100000, "Haryana", T.monthStart(2026, m))) === j([35, 70])) && T.labourWelfareFor({ gross: 100000 }, "2026-10-31", "Haryana").unverified === false);
check("G5", "Tamil Nadu: 20 + 40 once a year (December), nothing in other months; Karnataka 50 + 100 in December", j(LWF(50000, "Tamil Nadu", "2026-12-31")) === j([20, 40]) && j(LWF(50000, "Tamil Nadu", "2026-11-30")) === j([0, 0]) && j(LWF(50000, "Karnataka", "2026-12-31")) === j([50, 100]) && j(LWF(50000, "Karnataka", "2026-06-30")) === j([0, 0]));
check("G6", "Maharashtra: 25 + 75 in June and December, nothing in other months; all three flagged unverified", j(LWF(50000, "Maharashtra", "2026-06-30")) === j([25, 75]) && j(LWF(50000, "Maharashtra", "2026-12-31")) === j([25, 75]) && j(LWF(50000, "Maharashtra", "2026-07-31")) === j([0, 0])
  && ["Tamil Nadu", "Karnataka", "Maharashtra"].every((s) => T.labourWelfareFor({ gross: 50000 }, "2026-12-31", s).unverified === true));
const lp = T.labourWelfareFor({ gross: 100000 }, "2026-10-31", "Punjab");
check("G7", "a state with an empty row, no state, an unknown state: 0 + 0, missing, flagged", j([lp.employee, lp.employer, lp.missing, lp.unverified, lp.reason]) === j([0, 0, true, true, "empty-row"]) && T.labourWelfareFor({ gross: 1 }, "2026-10-31", null).reason === "no-state" && T.labourWelfareFor({ gross: 1 }, "2026-10-31", "Atlantis").missing === true);
check("G8", "nothing paid, nothing due", j(LWF(0, "Haryana")) === j([0, 0]));

section("H. Gratuity accrual, everything together, interns");
const GR = (wages, type = "Full-time", date = "2026-10-31") => T.gratuityAccrualFor({ wages, employmentType: type }, date);
check("H1", "gratuity accrues to the employer at wages x 15 / 26 / 12: 26,000 -> 1,250; 50,000 -> 2,404; flagged unverified", GR(26000).employer === 1250 && GR(50000).employer === 2404 && GR(50000).unverified === true && GR(50000).applies === true);
check("H2", "no accrual for an intern, or before the row's date", GR(50000, "Intern").employer === 0 && GR(50000, "Intern").reason === "intern" && GR(50000, "Full-time", "2025-11-20").reason === "no-rule");
const one = T.statutoryFor({ gross: 100000, basic: 50000, employmentType: "Full-time" }, "2026-10-31", "Haryana", { onFullWages: false });
check("H3", "Haryana, 1,00,000 gross, basic 50%, Oct 2026: wages 50,000; PF 3,000; no ESI; PT 0; LWF 35; off the pay 3,035",
  one.wages.wages === 50000 && one.pf.employee === 3000 && one.esi.applies === false && one.pt.amount === 0 && one.lwf.employee === 35 && one.employee === 3035, j([one.wages.wages, one.pf.employee, one.esi.employee, one.pt.amount, one.lwf.employee, one.employee]));
check("H4", "the employer's side: PF 3,000 + EDLI 125 + admin 125 + LWF 70 + gratuity 2,404 = 5,724", one.employer === 5724 && one.pf.employerTotal === 3250 && one.lwf.employer === 70 && one.gratuity.employer === 2404, one.employer);
check("H5", "it is flagged unverified (Haryana PT, the admin charge, gratuity) and lists every row used", one.unverified === true && j(one.rules) === j(["wages.addback@all@2025-11-21", "pf@all@2026-09-17", "pf.edli@all@2014-09-01", "pf.admin@all@2014-09-01", "esi@all@2019-07-01", "esi.ceiling@all@2019-07-01", "pt@Haryana@2000-01-01", "lwf@Haryana@2026-01-01", "gratuity@all@2025-11-21"]), j(one.rules));
const old40 = T.statutoryFor({ gross: 100000, basic: 40000 }, "2026-10-31", "Haryana", { onFullWages: true });
check("H6", "basic 40% on full wages: the add-back makes wages 50,000, so PF is 6,000, not 4,800", old40.wages.addBack === 10000 && old40.pf.employee === 6000 && old40.pf.wageBase === 50000);
const low = T.statutoryFor({ gross: 18000, basic: 9000, employmentType: "Full-time" }, "2026-10-31", "Maharashtra", { onFullWages: false });
check("H7", "a junior in Maharashtra at 18,000: PF 1,080 on 9,000 wages; ESI 135 + 585; PT 200; no LWF row due in October", low.pf.employee === 1080 && low.esi.employee === 135 && low.esi.employer === 585 && low.pt.amount === 200 && low.lwf.employee === 0 && low.employee === 1415, j([low.pf.employee, low.esi.employee, low.esi.employer, low.pt.amount, low.lwf.employee, low.employee]));
const intern = T.statutoryFor({ gross: 18000, basic: 18000, employmentType: "Intern" }, "2026-10-31", "Haryana", { onFullWages: true });
check("H8", "an intern's stipend of 18,000 in Haryana: no PF, no ESI, no gratuity; professional tax (0) and LWF (35 + 70) as for anyone", intern.pf.applies === false && intern.esi.applies === false && intern.gratuity.applies === false && intern.pt.amount === 0 && intern.lwf.employee === 35 && intern.employee === 35 && intern.employer === 70, j([intern.employee, intern.employer]));
check("H9", "monthStart: the first day, two digits", j([T.monthStart(2026, 9), T.monthStart(2026, 10), T.monthStart(2027, 2), T.monthStart(2028, 12)]) === j(["2026-09-01", "2026-10-01", "2027-02-01", "2028-12-01"]) && T.monthEnd === undefined);

section("J. Verify, add a row, the switch: Admin only");
check("J0", "nothing was saved by all the reads above", !mem.has("officeos:pay-rules"));
check("J1", "the permission: payroll-rules:verify, held by the Admin role only", j(R.PAY_RULE_PERMISSIONS) === j(["payroll-rules:verify"]) && j(R.PAY_RULE_GRANTS) === j({ admin: ["payroll-rules:verify"], hr: [], fin: [], emp: [] }));
const holds = Object.fromEntries(Object.entries(PEOPLE).map(([k, id]) => [k, R.holdsPayRulePermission(S.getUser(id), "payroll-rules:verify")]));
check("J2", "who holds it: Admin yes; HR, Finance, an employee and a manager no", j(holds) === j({ admin: true, hr: false, fin: false, emp: false, manager: false }), j(holds));
check("J3", "a stored grant doesn't give it (not overridable); nobody, or an unknown permission: no", !R.holdsPayRulePermission({ ...S.getUser(PEOPLE.hr), grantPermissions: ["payroll-rules:verify"] }, "payroll-rules:verify") && !R.holdsPayRulePermission(null, "payroll-rules:verify") && !R.holdsPayRulePermission(S.getUser(PEOPLE.admin), "payroll-rules:edit"));
const CESS = "tax.cess@all@2025-04-01";
const refused = ["hr", "fin", "emp", "manager"].map((k) => R.verifyRule(PEOPLE[k], CESS, "2026-10-06"));
check("J4", "HR, Finance, an employee and a manager can't verify a row: refused, nothing saved", refused.every((r) => r.ok === false && r.error === "Only an Admin can verify or change pay rules.") && !mem.has("officeos:pay-rules") && R.verifyRule(null, CESS).ok === false && R.verifyRule("EMP-9999", CESS).ok === false);
check("J5", "nor add a row or flip the switch", ["hr", "fin", "emp", "manager"].every((k) => !R.addRule(PEOPLE[k], { key: "tax.cess", effectiveFrom: "2027-04-01", value: { rate: 0.05 }, source: "https://example.org" }).ok && !R.setPfOnFullWages(PEOPLE[k], true).ok) && !mem.has("officeos:pay-rules"));
check("J6", "before: the cess row is unverified, its status says so, and real use is not ready", R.isUnverified(on("tax.cess", "2026-10-31")) && R.ruleStatus(on("tax.cess", "2026-10-31")) === "unverified" && R.readyForRealUse().ok === false && R.readyForRealUse().waiting.length === rows.length && R.unverifiedRules().length === rows.filter((r) => r.confidence === "unverified").length);
const v = R.verifyRule(PEOPLE.admin, CESS, "2026-10-06");
const after = on("tax.cess", "2026-10-31");
check("J7", "the Admin verifies it: the row carries who (id and name) and the date", v.ok && j([after.verifiedBy, after.verifiedByName, after.verifiedOn]) === j(["EMP-1001", "Aarav Mehta", "2026-10-06"]) && j([v.record.verifiedBy, v.record.verifiedOn]) === j(["EMP-1001", "2026-10-06"]), j([after.verifiedBy, after.verifiedByName, after.verifiedOn]));
check("J8", "it is no longer unverified (status verified); its confidence is kept; one row fewer waits", !R.isUnverified(after) && R.ruleStatus(after) === "verified" && after.confidence === "unverified" && R.readyForRealUse().waiting.length === rows.length - 1 && !R.unverifiedRules().some((r) => r.id === CESS));
check("J9", "only that row: the old regime's row is still unverified", R.isUnverified(on("tax.old", "2026-10-31")) && on("pf", "2026-10-31").verifiedBy === null);
const audit1 = R.payRuleAudit();
check("J10", "an audit entry: who, the action, the row, the date", audit1.length === 1 && j([audit1[0].by, audit1[0].name, audit1[0].action, audit1[0].ruleId, audit1[0].on]) === j(["EMP-1001", "Aarav Mehta", "verify", CESS, "2026-10-06"]) && typeof audit1[0].at === "string", j(audit1));
check("J11", "without a date given, today's local date is stored (6 Oct 2026 in every time zone)", R.verifyRule(PEOPLE.admin, "pt@Haryana@2000-01-01").record.verifiedOn === "2026-10-06");
check("J12", "an unknown row, or a date that isn't one: refused", R.verifyRule(PEOPLE.admin, "nope@all@2026-01-01").error === "No pay rule with id nope@all@2026-01-01." && R.verifyRule(PEOPLE.admin, CESS, "06/10/2026").ok === false);
check("J13", "verifying again replaces the date", R.verifyRule(PEOPLE.admin, CESS, "2026-11-01").ok && on("tax.cess", "2026-10-31").verifiedOn === "2026-11-01" && R.payRuleAudit().length === 3);
check("J14", "a calculation that used only verified or confirmed rows is no longer flagged: Haryana PT after its row is verified", T.professionalTaxFor({ gross: 100000 }, "2026-10-31", "Haryana").unverified === false && T.professionalTaxFor({ gross: 100000 }, "2026-10-31", "Punjab").unverified === true);

// a rate change is a new row
const bad = (f) => R.addRule(PEOPLE.admin, { key: "tax.cess", effectiveFrom: "2027-04-01", value: { rate: 0.05 }, source: "https://example.org/cess", ...f });
check("J15", "a new row is checked: the rule, the scope, the date, the rates, the value, the source, the confidence, no stray field",
  j([bad({ key: "nope" }).field, bad({ scope: "Atlantis" }).field, bad({ effectiveFrom: "2027-02-30" }).field, bad({ employeeRate: 12 }).field, bad({ employerRate: -0.1 }).field, bad({ value: [1] }).field, bad({ source: " " }).field, bad({ confidence: "sure" }).field, bad({ id: "x" }).field])
  === j(["key", "scope", "effectiveFrom", "employeeRate", "employerRate", "value", "source", "confidence", "id"]));
const added = bad({});
check("J16", "a cess row from 1 Apr 2027 at 5%: saved, unverified, not verified by anyone", added.ok && added.record.id === "tax.cess@all@2027-04-01" && added.record.confidence === "unverified" && added.record.verifiedBy === null && R.isUnverified(added.record));
check("J17", "it applies from its date and not a day before; the old row (still verified) keeps the earlier months", on("tax.cess", "2027-03-31").value.rate === 0.04 && on("tax.cess", "2027-03-31").verifiedOn === "2026-11-01" && on("tax.cess", "2027-04-01").value.rate === 0.05 && on("tax.cess", "2027-04-01").verifiedBy === null);
const pfNew = R.addRule(PEOPLE.admin, { key: "pf", effectiveFrom: "2027-04-01", employeeRate: 0.12, employerRate: 0.12, value: { wageCeiling: 30000, epsRate: 0.0833 }, source: "https://example.org/pf", confidence: "confirmed" });
check("J18", "a PF ceiling change is a row, not code: 30,000 from 1 Apr 2027 gives 3,600; March 2027 still 3,000", pfNew.ok && PF(50000, "2027-04-30").employee === 3600 && PF(50000, "2027-03-31").employee === 3000 && j(R.ruleHistory("pf").map((r) => r.value.wageCeiling)) === j([15000, 25000, 30000]));
const fix = R.addRule(PEOPLE.admin, { key: "pf", effectiveFrom: "2027-04-01", employeeRate: 0.12, employerRate: 0.12, value: { wageCeiling: 28000, epsRate: 0.0833 }, source: "https://example.org/pf-corrected" });
check("J19", "a correction with the same date: the row added last wins, with its own id; the first is kept in the history", fix.ok && fix.record.id === "pf@all@2027-04-01#2" && on("pf", "2027-04-30").value.wageCeiling === 28000 && R.ruleHistory("pf").length === 4);
const lwfNew = R.addRule(PEOPLE.admin, { key: "lwf", scope: "Punjab", effectiveFrom: "2026-11-01", value: { period: "monthly", employeeAmount: 5, employerAmount: 20 }, source: "https://example.org/punjab" });
check("J20", "a state's empty row gets numbers by a new row: Punjab LWF 5 + 20 from November 2026, still missing in October", lwfNew.ok && j(LWF(50000, "Punjab", "2026-11-30")) === j([5, 20]) && T.labourWelfareFor({ gross: 50000 }, "2026-10-31", "Punjab").missing === true);

// the company switch
check("J21", "the PF switch is off at the start; the Admin turns it on: PF then uses full wages by default", R.payRuleSettings().pfOnFullWages === true ? false : (R.setPfOnFullWages(PEOPLE.admin, true, "2026-10-06").ok && R.payRuleSettings().pfOnFullWages === true && T.pfFor({ wages: 50000 }, "2026-10-31").employee === 6000 && T.statutoryFor({ gross: 100000, basic: 50000 }, "2026-10-31", "Haryana").pf.employee === 6000));
check("J22", "and off again: capped at the ceiling; only on / off are accepted", R.setPfOnFullWages(PEOPLE.admin, false, "2026-10-06").ok && T.pfFor({ wages: 50000 }, "2026-10-31").employee === 3000 && R.setPfOnFullWages(PEOPLE.admin, "yes").ok === false);
const audit2 = R.payRuleAudit();
check("J23", "the audit trail has every change in order: 3 verifies, 4 added rows, the switch on and off", j(audit2.map((a) => a.action)) === j(["verify", "verify", "verify", "add", "add", "add", "add", "pf-on-full-wages", "pf-on-full-wages"]) && j(audit2.slice(-2).map((a) => a.detail)) === j(["on", "off"]) && audit2.every((a) => a.by === "EMP-1001"), j(audit2.map((a) => a.action)));
const box = JSON.parse(mem.get("officeos:pay-rules"));
check("J24", "what is saved: only the added rows, the verifications, the switch and the audit (the seed rows stay in code)", box.version === 1 && box.added.length === 4 && j(Object.keys(box.verified).sort()) === j(["pt@Haryana@2000-01-01", CESS].sort()) && box.settings.pfOnFullWages === false && box.audit.length === 9);
const users = JSON.parse(mem.get("officeos:users"));
users.records.find((u) => u.id === PEOPLE.admin).status = "inactive";
mem.set("officeos:users", JSON.stringify(users));
check("J25", "an inactive Admin can't verify, add or switch", !R.verifyRule(PEOPLE.admin, CESS).ok && !bad({ effectiveFrom: "2028-04-01" }).ok && !R.setPfOnFullWages(PEOPLE.admin, true).ok && R.payRuleAudit().length === 9);
users.records.find((u) => u.id === PEOPLE.admin).status = "active";
mem.set("officeos:users", JSON.stringify(users));
mem.set("officeos:pay-rules", j({ version: 99, added: "x" }));
check("J26", "a saved box of another version or shape is ignored: the seed, nothing verified", R.allRules().length === rows.length && on("tax.cess", "2026-10-31").verifiedBy === null && R.payRuleSettings().pfOnFullWages === false);
mem.set("officeos:pay-rules", j(box));
R.resetPayRules();
check("J27", "reset: the key is gone, the seed is back, nothing verified, the switch off", !mem.has("officeos:pay-rules") && R.allRules().length === rows.length && R.payRuleAudit().length === 0 && on("pf", "2027-04-30").value.wageCeiling === 25000);

section("K. Nothing existing changed");
check("K1", "importing the two new modules wrote nothing", keysAfterImport.length === 0, j(keysAfterImport));
check("K2", "data/payroll.js still has its own rules: basic 40%, PF 12% of basic with no ceiling, PT 200", j(PAY.PAY_RULES) === j({ basicShare: 0.4, hraShareOfBasic: 0.5, conveyance: 1600, pfShareOfBasic: 0.12, professionalTax: 200 }));
const pay = PAY.computePay(200000);
check("K3", "computePay(2,00,000) is what it was: basic 80,000, PF 9,600 (no ceiling), PT 200, TDS 23,438, net 1,66,762", j([pay.earnings.basic, pay.deductionLines.pf, pay.deductionLines.pt, pay.deductionLines.tds, pay.net, pay.employerPf]) === j([80000, 9600, 200, 23438, 166762, 9600]), j([pay.earnings, pay.deductionLines, pay.net]));
check("K4", "the old result has no new fields", j(Object.keys(pay)) === j(["monthlyGross", "workingDays", "lop", "gross", "earnings", "deductionLines", "deductions", "net", "employerPf"]));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);