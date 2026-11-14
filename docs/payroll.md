# Payroll

> **P1 (2026-11-14), data only:** the statutory rules are now a dated table with sources and confidence, and new pure calculations for PF, ESI, professional tax, LWF, statutory wages and gratuity read it: see [payroll-rules.md](payroll-rules.md). Nothing below changed: the payslips, payroll runs and the tax page still compute with `data/payroll.js` exactly as before (proved by a before / after dump of every month). The page round (P4) switches them over.

**Files:** `assets/js/data/payroll.js` (the rules: pure functions, no storage, no clock), `data/payroll-store.js` (salaries, runs, proposals).

## Pay rules (`PAY_RULES`)

| part | rule |
|---|---|
| Basic | 40% of gross |
| HRA | 50% of basic |
| Conveyance | ₹1,600 a month |
| Special allowance | whatever is left, so the parts always add up to gross |
| Employee PF | 12% of basic, with no wage ceiling |
| Professional tax | ₹200 a month (one state's sample figure) |
| Income tax (TDS) | sample new-regime rates, on what is actually paid, with an annual catch-up (round 13D) and marginal relief above the rebate limit (13B) |

Loss of pay reduces a month's gross for:
- late-mark half days;
- approved unpaid leave;
- unexplained absences, once their correction window has closed.

## Runs

- `payrollRunFor()` works a month out live from the salary in effect, the month's attendance, unpaid leave and the tax year so far, so a draft payslip can't disagree with its data.
- Finance or an Admin prepares a run (`payroll:create`). Only an Admin approves it (`payroll:approve`), and never the one who prepared it.
- Once approved, a run's payslips are the figures it fixed.
- A month with no data says so ("No data in this range.", round 5).

## Salaries

- A salary record is `{ userId, gross, effectiveFrom, regime: "new" }`. A revision is a new record; none is edited or deleted.
- `setSalary()` is the only writer, and only an Admin may call it.
- Finance proposes a change (`proposeSalary()`), and an Admin approves it. An Admin's own change takes effect at once.

## Not built yet

- Paying anyone; the bank file.
- The old tax regime: only the new one has rules.
- Payslip download (a placeholder).
