// data/payroll.js
// Salary structure and one payroll run (September 2026), used by the
// Finance dashboard, payroll-run.html, payslips.html and payslip-view.html.

export const SALARY_COMPONENTS = [
  { name: "Basic salary",        type: "earning",   formula: "40% of gross", taxable: true },
  { name: "House rent allowance", type: "earning",  formula: "50% of basic", taxable: "partly" },
  { name: "Conveyance allowance", type: "earning",  formula: "fixed 1600",   taxable: false },
  { name: "Special allowance",    type: "earning",  formula: "remainder of gross", taxable: true },
  { name: "Provident fund",       type: "deduction", formula: "12% of basic", taxable: null },
  { name: "Professional tax",     type: "deduction", formula: "fixed 200",   taxable: null },
  { name: "Income tax (TDS)",     type: "deduction", formula: "slab-based",  taxable: null },
];

// One payroll run. Each row is one employee's numbers for that month.
export const PAYROLL_RUN = {
  month: "2026-09",
  status: "draft",       // draft | processing | approved | paid
  preparedBy: "EMP-1008", // Kabir Shah — Finance prepared it, so Finance can't approve it
  rows: [
    { userId: "EMP-1042", gross: 92000,  deductions: 14720, net: 77280, status: "draft" },
    { userId: "EMP-1017", gross: 78500,  deductions: 11240, net: 67260, status: "draft" },
    { userId: "EMP-1088", gross: 64000,  deductions: 8960,  net: 55040, status: "on-hold" },
    { userId: "EMP-1023", gross: 105000, deductions: 17850, net: 87150, status: "draft" },
    { userId: "EMP-1105", gross: 88000,  deductions: 13900, net: 74100, status: "paid" },   // Arjun's Aug payslip, already paid
  ],
};

export function payrollRowFor(userId) {
  return PAYROLL_RUN.rows.find((r) => r.userId === userId) ?? null;
}

export function totalNetPay() {
  return PAYROLL_RUN.rows.reduce((sum, r) => sum + r.net, 0);
}