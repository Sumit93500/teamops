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
- Once approved, a run's payslips are the figures it fixed. From the statutory rules start month the fixed figures are the new engine's snapshot (P5, below).
- A month with no data says so ("No data in this range.", round 5).

## Salaries

- A salary record is `{ userId, gross, effectiveFrom, regime: "new" }`. A revision is a new record; none is edited or deleted.
- `setSalary()` is the only writer, and only an Admin may call it.
- Finance proposes a change (`proposeSalary()`), and an Admin approves it. An Admin's own change takes effect at once.

## P4a (2026-11-14): the pay screens

The pay screens read the new engine (`data/pay-engine.js`) from the **statutory rules start month** (Settings > Payroll; `data/pay-settings.js`; **default 2026-11**, the first month whose payroll wasn't finalized when the new rules shipped). Months before it are the payslip, payroll row and tax figures they always were; from it the new engine's. The Admin can move the start month, but not on or before an approved month (its figures are fixed). Settings > Payroll also holds the company switch **PF on full wages** (off).

| screen | from the start month |
|---|---|
| Payslip, payslip view | earnings by template component; deductions PF, ESI, professional tax, LWF, TDS (section 392); net; the tax regime; "Rules as of 1 <month>"; the **Unverified rates** note ("These rates are samples until an Admin verifies them.", with a link to Rates and rules for whoever may open it); the **employer contributions box** (employer PF with EPS / EPF, EDLI, admin charge, ESI, LWF, gratuity accrual, cost to company), shown to the person themself and to anyone with `payslips:view` (Finance, Admin), never to a manager looking at a report (a manager can't open a report's payslip at all) |
| My payslips | the year to date gains ESI and LWF lines; **How your tax is worked out** (the year's projection, standard deduction, slabs, rebate, cess, the months so far) and **Compare regimes** (new against old with the declaration, the difference in rupees, in words) |
| Salary structure | the components table is the **salary templates** (Admin edits a component through the module's checks; a preview on a typed gross); the person picked gets their template (Admin / Finance), **cost to company** (monthly and yearly) and **tax regime** (new by default; old only by a declaration of rent, metro, 80C-type investments and others, recorded by Finance or an Admin; "proofs are not collected in this demo") |
| Payroll run | State, PF, ESI, PT, LWF, TDS, net and employer cost per person; statutory totals; the Unverified banner; challans and filing stay samples |
| Tax & deductions | the signed-in person's explanation and comparison above the company's figures |
| Rates and rules (new) | every dated row with its source link, confidence, who verified it and when; filters (state, status, rule, search); **Verify** (asked first; records the Admin's name and the date); **Add dated row** (the module's checks). Finance reads, an Admin verifies |

**Known limits (ruled later):** the regime and the declaration were recorded by Finance or an Admin on the employee's word, and approving a run fixed the earlier rules' figures, so the page showed the new engine's figures live. P5 replaced both (below).

## P5 (2026-11-14): the rules are binding

**Frozen snapshots** (`data/pay-snapshots.js`, storage `officeos:pay-snapshots`; orchestration in `data/pay-runs.js`). From the statutory rules start month, preparing a run (`prepareRunWithSnapshot`) also stores `payFor()` for every person in it; approving (`approveRunWithSnapshot`) freezes that snapshot (who and when). The old run row is written exactly as before (the old site reads it).

- **Approved month:** every pay screen reads the frozen snapshot (`payForFinal()` says `final: true`), and the pages say **Final**. Later rule rows, templates, declarations, salaries or leave don't alter it; the year-to-date and TDS of later months build on the frozen figures.
- **Any other month:** worked out live, and the pages say **Draft, not final**.
- **Approve refuses** a run prepared before the new rules applied to it ("prepare it again") and one whose live figures have moved since it was prepared ("The figures have changed since this run was prepared: prepare it again.").
- **Months before the start month** are byte-for-byte what they were (no snapshot is written; a before / after dump of every old-engine month is identical).
- **The start month** still can't move on or before an approved month; a month with an approved snapshot stays under the new rules even if the start month later moves after it.
- The "figures shown live" wording is gone: the run says Final or Draft, not final under **Figures**; the totals card, the payslip view's notes, the tax explanation's months (a **Figures** column) and the cost-to-company card (a projection; the approved month as frozen) say which.

**Loss of pay from the leave policy.** `payFor()` deducts the policy's loss-of-pay days (`lossOfPayDaysIn()`, `data/leave-policy.js`: approved leave recorded `underPolicy` with `lopDays`, the request's last working days, half days 0.5, off days skipped; **each unpaid day is charged to the payroll month it falls in**, not to the request's last month, so a request across a month end splits its unpaid days between the two months and the months add up to its `lopDays`) from the **later** of the statutory start month and the leave policy's start month (`policyLossOfPayFrom()`), as `monthlyGross × days ÷ working days`, capped so it and the old unpaid-leave days never pass the month's working days. The `lop` field shows `policyDays` and `policyAmount` beside the totals. Leave taken before that month, and approved months, are never rewritten. Unpaid days that fall in a month before that later start month are not deducted.

**An approved month is never changed (P5-fix, 2026-11-14).** A later or backdated leave request whose unpaid days fall in an approved (frozen) month is **not re-deducted automatically**: the leave record keeps its `lopDays`, but that month's pay stays the frozen snapshot, and the next month deducts only its own days. Correcting it is a Finance adjustment, planned for the backend stage (the workspace's notes/react-parking-lot.md).

**Rulings (2026-11-14, after P5):**

- The **old static site keeps the old pay and leave rules until cutover**: it reads its own run rows and the flat leave allowance; the snapshots and the policy fields are separate storage it never reads.
- **Declarations stay open until Finance sets a cutoff** for the tax year: there is no default date.
- **Loss of pay is taken off gross before `payMonth()`**: PF and TDS follow the reduced pay; **ESI eligibility stays on the full contractual monthly salary** (as P1: `coverageGross` is the monthly gross); **professional tax follows the month's reduced gross**.
- **Every rate stays "unverified"** until an Admin verifies it on Rates and rules, after a CA / HR check.

**Self-service declarations** (`data/pay-structure.js`, per tax year): **draft → submitted → verified and locked**.

| who | can |
|---|---|
| the employee (`declarations:submit-own`) | choose new or old regime, fill in rent, metro, 80C-type investments and others; save a draft or submit; nothing after the lock ("Your declaration is verified and locked. To change it, ask Finance.") or after the year's cutoff ("Declarations for <year> closed on <date>. To change yours, ask Finance.") |
| Finance, the Admin (`declarations:manage`) | edit anyone's (it stays or becomes submitted), verify and lock a submitted one, unlock, set the year's cutoff (none by default: open) |
| a manager | nothing for their team: they never see a report's declaration |

Only a submitted declaration's figures apply to tax; a draft doesn't. Every change is audited with who, when, from and to. Proofs are not collected in this demo. Pages: **My payslips** and **Tax & deductions** get the employee's form (from the start month); Tax & deductions gets Finance's **Declarations to verify** (verify / unlock, the cutoff).

Tests: `tests/live/binding.mjs` (60 checks, 3 time zones; mutants all caught), `tests/live/lopalloc.mjs` (P5-fix: the allocation per day, the start-month boundaries, the frozen month, the rulings on ESI / PF / PT / TDS; 32 checks, 3 time zones; 14 mutants, all caught) and the React harness `p5`.

## Not built yet

- Paying anyone; the bank file.
- The old tax regime: only the new one has rules.
- Payslip download (a placeholder).

## P2 (2026-11-14): salary templates, regime and TDS under the new rules (data only)

Nothing here is on a page yet, and the existing payroll above computes as before; the page round (P4) switches over.

| file | what |
|---|---|
| `data/employment.js` | `employmentOf(userId)`: joining date and employment type. **The user record is the source** (E0's form already keeps `dateOfJoining`, `employmentType`, `pan`, `bankAccount` there); the six seeded people without them get SAMPLE values here, used only where the record has none |
| `data/pay-structure.js` | templates (Standard, Intern stipend), `componentsFor`, the Admin's component edits, a person's structure, the regime per tax year, the old-regime declaration |
| `data/pay-engine.js` | `taxOn`, `hraExemption`, `oldRegimeDeductions`, `tdsFor`, `compareRegimes`, `payMonth`, `payFor`, `ctcFor` |

**Templates.** Standard: basic 50% of gross (ruled; the old split's 40% stays on payslips already issued), HRA 50% of basic, medical allowance 1,250, conveyance 1,600, LTA 8.33% of basic (optional, per person), special allowance the balance. Intern stipend: one line; no PF, ESI or gratuity. Each line rounds half up and never takes more than what is left, so the lines always add up to the gross. The Admin can change a line's rule (a share up to 1, or whole rupees); the balancing line has none; the percentages can't promise more than the gross.

**Sample people** (`data/employment.js`): interns Ananya Iyer (5 Jan 2026) and Divya Menon (8 Jan 2024, inactive); under a year Rohan Gupta (2 Feb 2026) and Meera Joshi (16 Mar 2026); over a year Sneha Rao (9 Aug 2021) and Vikram Singh (2 Dec 2024); Aarav, Priya, Kabir and Arjun from their own records.

**Regime.** New by default for every tax year (April to March). The old regime only by a declaration for that year (rent a month, metro yes / no, 80C-type investments, other deductions), recorded by the Admin or Finance (`salary:edit`); choosing the new regime again keeps the declaration on file, unused.

**The month (`payMonth` / `payFor`).** 1 the gross after loss of pay (from the existing payroll's row, so the attendance and leave rules are the same); 2 the template's lines; 3 statutory wages (the 50% add-back); 4 PF, 5 ESI (coverage on the full monthly gross), 6 PT and 7 LWF by the office's state and month; 8 TDS: the tax year's income projected from what was paid plus the months left at the full gross, less the standard deduction (75,000 new / 50,000 old) and, in the old regime, the declared deductions (HRA: the least of HRA received, rent less 10% of basic, 50% of basic in Mumbai / Kolkata / Delhi / Chennai or 40% elsewhere; investments up to 1,50,000; others as declared), through the slabs with the rebate (new: nil to 12,00,000 with marginal relief; old: nil to 5,00,000), plus cess 4%; spread over the months left with the shortfall caught up; a leaver's or March's month settles the year. Salary TDS is section 392 of the Income-tax Act, 2025 from 1 Apr 2026 (192 before). 9 Net: each deduction in that order takes at most what is left, so it is never below zero. Employer contributions (PF with EPS / EPF, EDLI, admin; ESI; LWF) and the gratuity accrual are shown apart: `costToCompany`. Every answer lists the rule rows it used and carries `label: "Unverified rates"` while any of them is unverified.

**Not computed:** surcharge (no number known; flagged above 50,00,000), the senior-citizen slabs, the ESI contribution-period rule, Maharashtra's women's PT slab.

Tests: `tests/live/paystructure.mjs` (3 time zones; 68 mutants, all caught).
