// data/pay-engine.js
// P2: one person's month under the new rules, start to finish (data only: NEW functions; data/payroll.js and
// data/payroll-store.js still compute every payslip, payroll run and tax figure exactly as before, and nothing on
// screen calls these yet).
//
// NOT TAX OR LEGAL ADVICE: demo values, to be checked by a Chartered Accountant (see data/pay-rules.js).
//
// The order (the scoping note's C5):
//   1  the month's gross after loss of pay            as now: payroll-store.js payrollRunFor() (payFor reads it)
//   2  the components                                 the person's template (data/pay-structure.js)
//   3  statutory wages                                basic + the 50% add-back (data/statutory.js)
//   4  PF  5  ESI  6  professional tax  7  LWF         by the dated rules, the office's state and the month
//   8  TDS                                            the tax year's projection: the regime's standard deduction, slabs,
//                                                     rebate, cess; the old regime with the declaration (salary TDS is
//                                                     section 392 of the Income-tax Act, 2025 from 1 Apr 2026)
//   9  net, never below zero; the employer's contributions and the gratuity accrual shown apart (cost to company)
// Rounding: every deduction is whole rupees, half up; the year's tax is kept unrounded until a month's TDS is taken.
//
//   taxOn(taxable, regime, taxYearStartDate)       -> { slabTax, rebate, tax, cess, total, ... }   a year's tax
//   hraExemption({ hra, salary, rent, metro }, date)   the old regime's HRA exemption for the same period
//   oldRegimeDeductions({ declaration, basicAnnual, hraAnnual }, date)   -> { hra, investments, other, total, ... }
//   tdsFor({ regime, paidGross, incomeSoFar, tdsSoFar, monthsBefore, monthsLeft, monthlyGross, finalMonth, deductions }, taxYearStartDate)
//                                                  -> { tds, projected, taxable, annual, ... }     ONE month's TDS
//   compareRegimes({ annualGross, declaration, basicAnnual, hraAnnual }, taxYearStartDate)   -> { new, old, lower }
// A month's rules are the ones in force on its FIRST day (ruled 2026-11-14): a rule starting on the 1st applies that month,
// one starting later in the month applies from the next month. payMonth / payFor / ctcFor say so: `rulesAsOf`.
//   payMonth({ gross, monthlyGross, template, lta, state, year, month, regime, declaration, soFar, finalMonth, onFullWages })
//                                                  -> the whole month, from numbers alone (no storage but the rules)
//   payFor(userId, year, month)                    -> the same for a person on file, or null (no row that month)
//   ctcFor(userId, year, month)                    -> the monthly and yearly cost to company at that month's rules

import { ruleOn, isUnverified, payRuleSettings } from "./pay-rules.js";
import { statutoryFor, monthStart, rupees } from "./statutory.js";
import { payTemplate, componentsFor, structureOf, taxYearOf, regimeOf, declarationOf } from "./pay-structure.js";
import { employmentOf } from "./employment.js";
import { officeOf } from "./offices-store.js";
import { payrollRunFor } from "./payroll-store.js";
import { taxYearMonths } from "./payroll.js";

const money = (v) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);
const trace = (...rows) => {
  const used = rows.filter(Boolean);
  return { rules: used.map((r) => r.id), unverified: used.some(isUnverified) };
};
const UNVERIFIED_LABEL = "Unverified rates";

// ---------- a year's tax ----------
// The regime's slabs on the year's taxable income, the rebate (no tax up to its limit), marginal relief above it where
// the rule has it (the new regime: the tax is never more than the income above the limit), then the cess on the tax.
// No surcharge is computed (no number is known): above 50,00,000 the answer says so. Rupees, unrounded.
export function taxOn(taxable, regime, taxYearStartDate) {
  const income = money(taxable);
  const rule = ruleOn(regime === "old" ? "tax.old" : "tax.new", taxYearStartDate);
  const cessRule = ruleOn("tax.cess", taxYearStartDate);
  const none = { taxable: income, regime: regime === "old" ? "old" : "new", slabTax: 0, rebate: 0, tax: 0, cess: 0, total: 0 };
  if (!rule?.value) return { ...none, missing: true, rules: rule ? [rule.id] : [], unverified: true };
  let slabTax = 0, from = 0;
  for (const { upTo, rate } of rule.value.slabs) {
    const top = upTo ?? Infinity;
    if (income > from) slabTax += (Math.min(income, top) - from) * rate;
    from = top;
  }
  const limit = rule.value.rebate;
  let tax = slabTax, rebate = 0;
  if (limit && income <= limit.upTo) { rebate = Math.min(slabTax, limit.max); tax = slabTax - rebate; }
  else if (limit && rule.value.marginalRelief) tax = Math.min(slabTax, income - limit.upTo);
  const cessRate = cessRule?.value?.rate ?? 0;
  const cess = tax * cessRate;
  const surchargeNotComputed = income > 5000000;
  const t = trace(rule, cessRule);
  return { ...none, slabTax, rebate, tax, cess, total: tax + cess, standardDeduction: rule.value.standardDeduction, ...(surchargeNotComputed ? { surchargeNotComputed } : {}), rules: t.rules, unverified: t.unverified || surchargeNotComputed };
}

// ---------- the old regime's deductions ----------
// HRA: the least of the HRA received, the rent paid less 10% of salary (basic + DA), and 50% of salary in a metro or
// 40% elsewhere; nothing without rent. All three figures are for the same period (a month, or a year).
export function hraExemption({ hra = 0, salary = 0, rent = 0, metro = false } = {}, date) {
  const rule = ruleOn("tax.hra", date);
  if (!rule?.value || !(money(rent) > 0)) return { exempt: 0, ...trace(rule) };
  const v = rule.value;
  const overTen = Math.max(0, money(rent) - v.rentLessShareOfSalary * money(salary));
  const share = (metro ? v.metroShare : v.otherShare) * money(salary);
  return { exempt: Math.max(0, Math.min(money(hra), overTen, share)), received: money(hra), rentOverShare: overTen, salaryShare: share, ...trace(rule) };
}
// What the declaration takes off the year's income: the HRA exemption, the 80C-type investments up to the rule's cap,
// and the other deductions as declared (not capped: unverified).
export function oldRegimeDeductions({ declaration = null, basicAnnual = 0, hraAnnual = 0 } = {}, date) {
  if (!declaration) return { hra: 0, investments: 0, other: 0, total: 0, rules: [], unverified: false };
  const hra = hraExemption({ hra: hraAnnual, salary: basicAnnual, rent: money(declaration.rentMonthly) * 12, metro: declaration.metro === true }, date);
  const cap = ruleOn("tax.old", date)?.value?.investmentsCap ?? 0;
  const investments = Math.min(money(declaration.investments), cap);
  const other = money(declaration.other);
  return { hra: hra.exempt, investments, other, total: hra.exempt + investments + other, rules: hra.rules, unverified: hra.unverified || other > 0 };
}

// ---------- one month's TDS ----------
// The year's income projected from what was actually paid (incomeSoFar over the months before this one, then this
// month's paidGross) and each month left after this one at the full monthlyGross; less the regime's standard deduction
// and, in the old regime, the declared deductions; through taxOn(). The month takes the year's monthly figure plus
// whatever was deducted short of it so far, spread over the months left (this one included). The year's last month, or
// a leaver's (finalMonth), takes what is left of the year's tax. Never below zero. Whole rupees.
export function tdsFor({ regime = "new", paidGross = 0, incomeSoFar = 0, tdsSoFar = 0, monthsBefore = 0, monthsLeft = 12, monthlyGross = 0, finalMonth = false, deductions = 0 } = {}, taxYearStartDate) {
  const last = finalMonth || monthsLeft <= 1;
  const projected = money(incomeSoFar) + money(paidGross) + (last ? 0 : (monthsLeft - 1) * money(monthlyGross));
  const probe = taxOn(0, regime, taxYearStartDate);
  const standardDeduction = probe.standardDeduction ?? 0;
  const taxable = Math.max(0, projected - standardDeduction - (regime === "old" ? money(deductions) : 0));
  const annual = taxOn(taxable, regime, taxYearStartDate);
  const base = rupees(annual.total / 12);
  const raw = last ? rupees(Math.max(0, annual.total - tdsSoFar)) : base + Math.round((base * monthsBefore - tdsSoFar) / monthsLeft);
  return { tds: Math.max(0, raw), projected, standardDeduction, deductions: regime === "old" ? money(deductions) : 0, taxable, annual, monthly: base, regime: annual.regime, rules: annual.rules, unverified: annual.unverified };
}

// The same year's income under both regimes (the old one with the declaration): which is lower, and by how much.
export function compareRegimes({ annualGross = 0, declaration = null, basicAnnual = 0, hraAnnual = 0 } = {}, taxYearStartDate) {
  const std = (regime) => taxOn(0, regime, taxYearStartDate).standardDeduction ?? 0;
  const ded = oldRegimeDeductions({ declaration, basicAnnual, hraAnnual }, taxYearStartDate);
  const fresh = taxOn(Math.max(0, money(annualGross) - std("new")), "new", taxYearStartDate);
  const old = taxOn(Math.max(0, money(annualGross) - std("old") - ded.total), "old", taxYearStartDate);
  const a = rupees(fresh.total), b = rupees(old.total);
  return { new: a, old: b, lower: b < a ? "old" : "new", saving: Math.abs(a - b), deductions: ded, unverified: fresh.unverified || old.unverified || ded.unverified };
}

// ---------- the whole month, from numbers ----------
// gross: what the month pays after loss of pay. monthlyGross: the full monthly gross (the projection of the months
// left, and the ESI coverage test). template: a pay-structure template. soFar: the tax year before this month.
export function payMonth({ gross = 0, monthlyGross = gross, template, lta = false, state = null, year, month, regime = "new", declaration = null,
  soFar = { incomeSoFar: 0, tdsSoFar: 0, monthsBefore: 0, monthsLeft: 12 }, finalMonth = false, onFullWages = payRuleSettings().pfOnFullWages } = {}) {
  const date = monthStart(year, month);   // the month's rules are the ones in force on its first day (rulesAsOf)
  const taxYear = taxYearOf(year, month);
  const paid = Math.max(0, Math.round(money(gross)));
  const components = componentsFor(template, paid, { lta });
  const full = componentsFor(template, monthlyGross, { lta });
  const intern = template?.kind === "intern";
  const statutory = statutoryFor({ gross: paid, basic: components.wages, employmentType: intern ? "Intern" : "Full-time", coverageGross: monthlyGross }, date, state, { onFullWages });
  const deductionsOld = regime === "old" ? oldRegimeDeductions({ declaration, basicAnnual: full.basic * 12, hraAnnual: full.hra * 12 }, taxYear.startDate) : null;
  const tax = tdsFor({ regime, paidGross: paid, monthlyGross, ...soFar, finalMonth, deductions: deductionsOld?.total ?? 0 }, taxYear.startDate);
  const section = ruleOn("tax.section", date);
  // nothing takes the pay below zero: each deduction in order takes at most what is left
  let left = paid;
  const take = (amount) => { const a = Math.min(left, Math.max(0, amount)); left -= a; return a; };
  const deductions = { pf: take(statutory.pf.employee), esi: take(statutory.esi.employee), pt: take(statutory.pt.amount), lwf: take(statutory.lwf.employee), tds: take(tax.tds) };
  const total = deductions.pf + deductions.esi + deductions.pt + deductions.lwf + deductions.tds;
  const employer = { pf: statutory.pf.employer, eps: statutory.pf.eps, epf: statutory.pf.epfEmployer, edli: statutory.pf.edli, pfAdmin: statutory.pf.admin, esi: statutory.esi.employer, lwf: statutory.lwf.employer,
    gratuity: statutory.gratuity.employer, total: statutory.employer };
  const rules = [...new Set([...statutory.rules, ...tax.rules, ...(deductionsOld?.rules ?? []), ...(section ? [section.id] : [])])];
  const unverified = statutory.unverified || tax.unverified || Boolean(deductionsOld?.unverified);
  return {
    month: `${year}-${String(month).padStart(2, "0")}`, rulesAsOf: date, taxYear: taxYear.label, templateId: template?.id ?? null, kind: intern ? "intern" : "employee", state, regime: tax.regime,
    monthlyGross, gross: paid, components: components.lines, wages: statutory.wages,
    statutory: { pf: statutory.pf, esi: statutory.esi, pt: statutory.pt, lwf: statutory.lwf, gratuity: statutory.gratuity },
    tax: { ...tax, section: section?.value?.salaryTds ?? null, act: section?.value?.act ?? null, oldRegime: deductionsOld },
    deductions, deductionsTotal: total, net: paid - total,
    employer, costToCompany: paid + employer.total,
    rules, unverified, label: unverified ? UNVERIFIED_LABEL : null,
  };
}

// ---------- a person on file ----------
// Their months of the tax year up to this one, each from the gross the existing payroll pays that month (after loss of
// pay; payrollRunFor), so TDS is on what was actually paid. null when the existing payroll has no row for the month
// (unknown or inactive person, before joining, after leaving, a bad month).
export function payFor(userId, year, month) {
  const y = Number(year), m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return null;
  const employment = employmentOf(userId);
  const structure = employment ? structureOf(userId) : null;
  if (!structure) return null;
  const template = payTemplate(structure.templateId);
  const taxYear = taxYearOf(y, m);
  const regime = regimeOf(userId, taxYear.label), declaration = declarationOf(userId, taxYear.label);
  const state = officeOf(userId)?.state ?? null;
  const upto = (m + 8) % 12;   // April is 0
  let incomeSoFar = 0, tdsSoFar = 0, out = null;
  for (const [i, [yy, mm]] of taxYearMonths(y, m).slice(0, upto + 1).entries()) {
    const old = payrollRunFor(userId, yy, mm);
    if (!old) { out = null; continue; }
    const pay = payMonth({ gross: old.gross, monthlyGross: old.monthlyGross, template, lta: structure.lta, state, year: yy, month: mm, regime, declaration,
      soFar: { incomeSoFar, tdsSoFar, monthsBefore: i, monthsLeft: 12 - i }, finalMonth: Boolean(old.attendance?.lastDay) });
    incomeSoFar += pay.gross;
    tdsSoFar += pay.deductions.tds;
    out = { userId, employmentType: employment.employmentType, joiningDate: employment.joiningDate, salaryId: old.salaryId, status: old.status, holdReason: old.holdReason, period: old.period, workingDays: old.workingDays, lop: old.lop, ...pay };
  }
  return out;
}

// The cost to company at this month's rules, on the full monthly gross (no loss of pay): the gross plus the employer's
// PF (with EDLI and the admin charge), ESI, LWF and the gratuity accrual; a year is twelve such months.
export function ctcFor(userId, year, month) {
  const row = payFor(userId, year, month);
  if (!row) return null;
  const structure = structureOf(userId);
  const full = payMonth({ gross: row.monthlyGross, monthlyGross: row.monthlyGross, template: payTemplate(structure.templateId), lta: structure.lta, state: row.state, year: Number(year), month: Number(month) });
  return { userId, month: row.month, rulesAsOf: row.rulesAsOf, monthly: { gross: full.gross, employer: full.employer, total: full.costToCompany }, yearly: { gross: full.gross * 12, employer: full.employer.total * 12, total: full.costToCompany * 12 },
    unverified: full.unverified, label: full.label };
}