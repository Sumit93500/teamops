// data/statutory.js
// P1: the statutory calculations, as functions of an amount, a date and a state. Every number comes from the dated
// rules table (data/pay-rules.js ruleOn); nothing here writes, reads the clock or knows a rate. Nothing on screen calls
// these yet: data/payroll.js still computes every payslip exactly as before.
//
// NOT TAX OR LEGAL ADVICE: demo values, to be checked by a Chartered Accountant (see data/pay-rules.js).
//
// Every amount is whole rupees a month, rounded half up (how the PF and ESI portals round is not confirmed). `date` is
// any "YYYY-MM-DD" day. A PAYROLL MONTH is looked up as of its FIRST day (monthStart; ruled 2026-11-14, P-fix): a rule that
// starts on the 1st applies that month, one that starts later in the month (the PF ceiling's 17 Sep 2026) applies from the
// next full month. Each answer names the rule rows it used (`rules`, their ids) and says whether any of them is
// unverified (`unverified`: pages then show "unverified rates"), so a figure can always be traced to its row.
//
//   monthStart(year, month)                                 "YYYY-MM-DD", the month's first day: the date a month's rules are taken as of
//   isIntern(employmentType)                                "Intern" in any case
//   statutoryWages({ gross, basic, da, retaining }, date)   -> { wages, base, others, addBack, ... }
//   pfFor({ wages, employmentType }, date, { onFullWages }) -> { applies, wageBase, employee, employer, eps, epfEmployer, edli, admin, employerTotal, ... }
//   esiFor({ gross, coverageGross, employmentType, dailyWage }, date)   -> { applies, employee, employer, ... }
//   professionalTaxFor({ gross }, date, state)              -> { amount, ... }
//   labourWelfareFor({ gross }, date, state)                -> { employee, employer, ... }
//   gratuityAccrualFor({ wages, employmentType }, date)     -> { applies, employer, ... }   employer cost only
//   statutoryFor({ gross, basic, da, retaining, employmentType, dailyWage, coverageGross }, date, state, { onFullWages })
//                                                           -> all of the above in one object, with the totals
//
// Interns (ruled): a stipend, with no PF, no ESI and no gratuity. Professional tax and the labour welfare fund are not
// in that ruling, so they are computed for an intern as for anyone.

import { ruleOn, isUnverified, payRuleSettings } from "./pay-rules.js";

// Whole rupees, half up (the epsilon keeps 2082.5 from landing on 2082 through binary fractions).
export const rupees = (x) => Math.floor(x + 0.5 + 1e-9);
const two = (n) => String(n).padStart(2, "0");
export const monthStart = (year, month) => `${year}-${two(month)}-01`;
const monthOf = (date) => Number(date.slice(5, 7));
export const isIntern = (employmentType) => typeof employmentType === "string" && employmentType.trim().toLowerCase() === "intern";
const money = (v) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

// What every answer carries about its rows.
const trace = (...rows) => {
  const used = rows.filter(Boolean);
  return { rules: used.map((r) => r.id), unverified: used.some(isUnverified) };
};

// ---------- wages ----------
// The Code on Wages: wages are basic + DA + retaining allowance (the base). When everything else in the month's pay is
// more than the rule's share (50%) of the total, the part above it is added back. With no rule in force (before 21 Nov
// 2025) the wages are the base.
export function statutoryWages({ gross = 0, basic = 0, da = 0, retaining = 0 } = {}, date) {
  const total = money(gross);
  const base = Math.min(total, money(basic) + money(da) + money(retaining));
  const others = total - base;
  const rule = ruleOn("wages.addback", date);
  const share = rule?.value?.allowanceShare;
  const limit = typeof share === "number" ? rupees(total * share) : null;
  const addBack = limit === null ? 0 : Math.max(0, others - limit);
  return { wages: base + addBack, base, others, addBack, allowanceLimit: limit, ...trace(rule) };
}

// ---------- provident fund ----------
// Employee 12% and employer 12% of the wage base: the wages up to the ceiling, or the full wages when the company's
// switch (or onFullWages here) says so. The employer's share splits into EPS (8.33% of wages up to the ceiling, always
// capped) and EPF (the rest). EDLI and the admin charge are the employer's, on top.
export function pfFor({ wages = 0, employmentType = null } = {}, date, { onFullWages = payRuleSettings().pfOnFullWages } = {}) {
  const none = { applies: false, wageBase: 0, employee: 0, employer: 0, eps: 0, epfEmployer: 0, edli: 0, admin: 0, employerTotal: 0, ceiling: null, onFullWages: Boolean(onFullWages) };
  if (isIntern(employmentType)) return { ...none, reason: "intern", ...trace() };
  const rule = ruleOn("pf", date);
  if (!rule || !rule.value) return { ...none, reason: "no-rule", ...trace(rule) };
  const edliRule = ruleOn("pf.edli", date), adminRule = ruleOn("pf.admin", date);
  const w = money(wages), ceiling = rule.value.wageCeiling;
  const capped = Math.min(w, ceiling);
  const wageBase = onFullWages ? w : capped;
  const employee = rupees(wageBase * rule.employeeRate);
  const employer = rupees(wageBase * rule.employerRate);
  const eps = Math.min(employer, rupees(capped * rule.value.epsRate));
  const edli = edliRule ? rupees((edliRule.value?.onCeiling === false ? wageBase : capped) * edliRule.employerRate) : 0;
  const admin = adminRule ? rupees((adminRule.value?.onCeiling === true ? capped : wageBase) * adminRule.employerRate) : 0;
  return { applies: true, wageBase, employee, employer, eps, epfEmployer: employer - eps, edli, admin, employerTotal: employer + edli + admin, ceiling, onFullWages: Boolean(onFullWages),
    ...trace(rule, edliRule, adminRule) };
}

// ---------- ESI ----------
// Covered when the month's gross wages are at or under the ceiling (coverageGross, when given, is the figure tested: the
// full monthly gross of a month that loss of pay cut short; the contributions are still on what was paid). The
// employee's share is not deducted at a daily average wage up to the exempt figure (when dailyWage is given); the
// employer still pays.
export function esiFor({ gross = 0, coverageGross = null, employmentType = null, dailyWage = null } = {}, date) {
  const none = { applies: false, employee: 0, employer: 0, ceiling: null };
  if (isIntern(employmentType)) return { ...none, reason: "intern", ...trace() };
  const rule = ruleOn("esi", date), ceilingRule = ruleOn("esi.ceiling", date), exemptRule = ruleOn("esi.exempt", date);
  const ceiling = ceilingRule?.value?.wageCeiling ?? null;
  if (!rule || ceiling === null) return { ...none, reason: "no-rule", ...trace(rule, ceilingRule) };
  const g = money(gross);
  if (Math.max(g, money(coverageGross)) > ceiling) return { ...none, ceiling, reason: "above-ceiling", ...trace(rule, ceilingRule) };
  if (g === 0) return { ...none, ceiling, reason: "no-wages", ...trace(rule, ceilingRule) };
  const exempt = typeof dailyWage === "number" && exemptRule?.value && dailyWage <= exemptRule.value.dailyWageUpTo;
  return { applies: true, employee: exempt ? 0 : rupees(g * rule.employeeRate), employer: rupees(g * rule.employerRate), ceiling, employeeExempt: Boolean(exempt),
    ...trace(rule, ceilingRule, exempt ? exemptRule : null) };
}

// ---------- professional tax ----------
const slabOf = (slabs, amount) => slabs.find((s) => s.upTo === null || amount <= s.upTo) ?? null;
// By the office's state and the month. A monthly schedule looks the month's gross up in the slabs (a slab may name
// another amount for February). A half-yearly one (Tamil Nadu) looks up six months of this gross, in the rule's months
// only. An empty row, an unknown slab or an unknown state gives 0 and says so (missing / incomplete).
export function professionalTaxFor({ gross = 0 } = {}, date, state) {
  const rule = state ? ruleOn("pt", date, state) : null;
  if (!rule) return { amount: 0, missing: true, reason: state ? "no-rule" : "no-state", state: state ?? null, ...trace(), unverified: true };
  if (!rule.value) return { amount: 0, missing: true, reason: "empty-row", state, ...trace(rule) };
  const g = money(gross), month = monthOf(date), v = rule.value;
  if (g === 0) return { amount: 0, state, period: v.period, ...trace(rule) };
  if (v.period === "half-yearly") {
    if (!v.months.includes(month)) return { amount: 0, state, period: v.period, due: false, ...trace(rule) };
    const slab = slabOf(v.slabs, g * 6);
    if (!slab || slab.amount === null) return { amount: 0, incomplete: true, reason: "slab-not-known", state, period: v.period, due: true, ...trace(rule) };
    return { amount: slab.amount, state, period: v.period, due: true, ...trace(rule) };
  }
  const slab = slabOf(v.slabs, g);
  if (!slab || slab.amount === null) return { amount: 0, incomplete: true, reason: "slab-not-known", state, period: v.period, ...trace(rule) };
  return { amount: month === 2 && typeof slab.february === "number" ? slab.february : slab.amount, state, period: v.period, ...trace(rule) };
}

// ---------- labour welfare fund ----------
// By the office's state and the month. A rate (Haryana: 0.2% of the month's gross wages, capped) or a fixed amount in
// the rule's months (yearly, half-yearly); the employer pays its own amount or a multiple of the employee's.
export function labourWelfareFor({ gross = 0 } = {}, date, state) {
  const rule = state ? ruleOn("lwf", date, state) : null;
  if (!rule) return { employee: 0, employer: 0, missing: true, reason: state ? "no-rule" : "no-state", state: state ?? null, ...trace(), unverified: true };
  if (!rule.value) return { employee: 0, employer: 0, missing: true, reason: "empty-row", state, ...trace(rule) };
  const g = money(gross), month = monthOf(date), v = rule.value;
  const due = v.period === "monthly" || (Array.isArray(v.months) && v.months.includes(month));
  if (g === 0 || !due) return { employee: 0, employer: 0, state, period: v.period, due, ...trace(rule) };
  const employee = typeof rule.employeeRate === "number" ? Math.min(rupees(g * rule.employeeRate), v.employeeCap ?? Infinity) : v.employeeAmount ?? 0;
  const employer = typeof v.employerMultiple === "number" ? employee * v.employerMultiple : v.employerAmount ?? 0;
  return { employee, employer, state, period: v.period, due, ...trace(rule) };
}

// ---------- gratuity ----------
// An employer-side accrual (cost to company), never a deduction: the month's wages x the rule's rate.
export function gratuityAccrualFor({ wages = 0, employmentType = null } = {}, date) {
  if (isIntern(employmentType)) return { applies: false, employer: 0, reason: "intern", ...trace() };
  const rule = ruleOn("gratuity", date);
  if (!rule || typeof rule.employerRate !== "number") return { applies: false, employer: 0, reason: "no-rule", ...trace(rule) };
  return { applies: true, employer: rupees(money(wages) * rule.employerRate), ...trace(rule) };
}

// ---------- all of them ----------
// One month's statutory figures for one person: the wages first, then each fund on its own base. `employee` is what
// comes off the pay (PF + ESI + professional tax + LWF; TDS is not here), `employer` what the company pays on top.
export function statutoryFor({ gross = 0, basic = 0, da = 0, retaining = 0, employmentType = null, dailyWage = null, coverageGross = null } = {}, date, state, options = {}) {
  const wages = statutoryWages({ gross, basic, da, retaining }, date);
  const pf = pfFor({ wages: wages.wages, employmentType }, date, options);
  const esi = esiFor({ gross, coverageGross, employmentType, dailyWage }, date);
  const pt = professionalTaxFor({ gross }, date, state);
  const lwf = labourWelfareFor({ gross }, date, state);
  const gratuity = gratuityAccrualFor({ wages: wages.wages, employmentType }, date);
  const parts = [wages, pf, esi, pt, lwf, gratuity];
  return {
    wages, pf, esi, pt, lwf, gratuity,
    employee: pf.employee + esi.employee + pt.amount + lwf.employee,
    employer: pf.employerTotal + esi.employer + lwf.employer + gratuity.employer,
    rules: [...new Set(parts.flatMap((p) => p.rules))],
    unverified: parts.some((p) => p.unverified),
  };
}