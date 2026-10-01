// data/payroll.js
// The pay rules, as numbers and pure functions: how a monthly gross splits
// into earnings, the PF / professional tax / income tax (TDS) deductions, and
// how loss-of-pay days reduce a month's gross. Nothing here reads storage or
// the clock; data/payroll-store.js gathers each person's salary, attendance
// and leave and calls these.
//
// All amounts are whole rupees a month unless a name says annual.

// ---------- earnings and statutory deductions ----------

export const PAY_RULES = {
  basicShare: 0.40,          // basic = 40% of gross
  hraShareOfBasic: 0.50,     // HRA = 50% of basic
  conveyance: 1600,          // fixed a month (less only if gross can't cover it)
  pfShareOfBasic: 0.12,      // employee PF = 12% of basic (no wage ceiling); the employer pays the same
  professionalTax: 200,      // fixed a month (one state's sample figure; it really depends on the state)
};

const pct = (share) => `${Math.round(share * 100)}%`;

// The components as salary-structure.html lists them. `formula` is display text
// built from PAY_RULES, so the words and the arithmetic can't drift apart.
export const SALARY_COMPONENTS = [
  { key: "basic",      name: "Basic salary",         type: "earning",   formula: `${pct(PAY_RULES.basicShare)} of gross`,           taxable: true },
  { key: "hra",        name: "House rent allowance", type: "earning",   formula: `${pct(PAY_RULES.hraShareOfBasic)} of basic`,      taxable: "partly" },
  { key: "conveyance", name: "Conveyance allowance", type: "earning",   formula: `fixed ${PAY_RULES.conveyance}`,                    taxable: false },
  { key: "special",    name: "Special allowance",    type: "earning",   formula: "remainder of gross",                              taxable: true },
  { key: "pf",         name: "Provident fund",       type: "deduction", formula: `${pct(PAY_RULES.pfShareOfBasic)} of basic`,       taxable: null },
  { key: "pt",         name: "Professional tax",     type: "deduction", formula: `fixed ${PAY_RULES.professionalTax}`,               taxable: null },
  { key: "tds",        name: "Income tax (TDS)",     type: "deduction", formula: "slab-based",                                      taxable: null },
];

// gross -> { basic, hra, conveyance, special }, whole rupees that always add up
// to gross: special takes whatever is left after rounding.
export function splitGross(gross) {
  const g = Math.max(0, Math.round(gross));
  const basic = Math.round(g * PAY_RULES.basicShare);
  const hra = Math.round(basic * PAY_RULES.hraShareOfBasic);
  const conveyance = Math.min(PAY_RULES.conveyance, g - basic - hra);
  return { basic, hra, conveyance, special: g - basic - hra - conveyance };
}

export const providentFund = (basic) => Math.round(basic * PAY_RULES.pfShareOfBasic);
export const professionalTax = (gross) => (gross > 0 ? PAY_RULES.professionalTax : 0);

// ---------- income tax (TDS) ----------

// SAMPLE VALUES, copied from the slab table on finance/tax-deductions.html, which
// says the same: "sample values for the design. When the real app is built, use
// the current government rates." Not current tax law. New regime only; no cess,
// no surcharge, no marginal relief, no old regime.
export const TAX_SAMPLE = {
  standardDeduction: 75000,   // annual
  rebateLimit: 1200000,       // taxable income up to this pays no tax at all
  slabs: [                    // annual taxable income up to `upTo` (null = no limit) at `rate`
    { upTo: 400000, rate: 0 },
    { upTo: 800000, rate: 0.05 },
    { upTo: 1200000, rate: 0.10 },
    { upTo: 1600000, rate: 0.15 },
    { upTo: 2000000, rate: 0.20 },
    { upTo: 2400000, rate: 0.25 },
    { upTo: null, rate: 0.30 },
  ],
};

// Annual taxable income (after the standard deduction) -> annual tax, in rupees
// (may have paise). Zero at or under the rebate limit.
export function annualTax(taxable) {
  if (!(taxable > TAX_SAMPLE.rebateLimit)) return 0;
  let tax = 0;
  let from = 0;
  for (const { upTo, rate } of TAX_SAMPLE.slabs) {
    const top = upTo ?? Infinity;
    if (taxable > from) tax += (Math.min(taxable, top) - from) * rate;
    from = top;
  }
  return tax;
}

// The monthly TDS for a monthly gross: that gross for 12 months, less the
// standard deduction, through the slabs, spread evenly over 12 months.
export function monthlyTds(monthlyGross) {
  const taxable = Math.max(0, monthlyGross * 12 - TAX_SAMPLE.standardDeduction);
  return Math.round(annualTax(taxable) / 12);
}

// ---------- loss of pay ----------

// Loss-of-pay days for a month: each late-mark penalty half day is 0.5, each
// unpaid leave day 1 (a half day 0.5), never more than the month's working days.
export function lossOfPayDays({ penaltyHalfDays = 0, unpaidLeaveDays = 0, workingDays = 0 } = {}) {
  return Math.min(workingDays, penaltyHalfDays * 0.5 + unpaidLeaveDays);
}

// The rupees a month's gross loses: gross / working days for each LOP day.
export function lossOfPayAmount(monthlyGross, lopDays, workingDays) {
  if (!(workingDays > 0) || !(lopDays > 0)) return 0;
  return Math.round((monthlyGross * Math.min(lopDays, workingDays)) / workingDays);
}

// ---------- one person's month ----------

// Everything a payslip needs from a monthly gross and that month's LOP inputs.
// The earnings and PF are worked out on the gross actually paid (after LOP);
// TDS on the full monthly gross, capped so net pay never goes below zero.
export function computePay(monthlyGross, { penaltyHalfDays = 0, unpaidLeaveDays = 0, workingDays = 0 } = {}) {
  const lopDays = lossOfPayDays({ penaltyHalfDays, unpaidLeaveDays, workingDays });
  const lopAmount = lossOfPayAmount(monthlyGross, lopDays, workingDays);
  const gross = monthlyGross - lopAmount;
  const earnings = splitGross(gross);
  const pf = providentFund(earnings.basic);
  const pt = professionalTax(gross);
  const tds = Math.min(monthlyTds(monthlyGross), Math.max(0, gross - pf - pt));
  const deductions = pf + pt + tds;
  return {
    monthlyGross,
    workingDays,
    lop: { penaltyHalfDays, unpaidLeaveDays, days: lopDays, amount: lopAmount },
    gross,
    earnings,
    deductionLines: { pf, pt, tds },
    deductions,
    net: gross - deductions,
    employerPf: pf,
  };
}