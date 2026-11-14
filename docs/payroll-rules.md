# Payroll rules (P1): the dated statutory table

> **Not tax or legal advice.** Every number here is a demo value from the scoping research (the workspace's `notes/payroll-rules-scoping.md`). A Chartered Accountant or payroll professional must check each row, and an Admin must mark it verified, before any real use.

**Files:** `assets/js/data/pay-rules.js` (the table, `ruleOn`, verify / add / the PF switch), `assets/js/data/statutory.js` (the calculations). Tests: `tests/live/payrules.mjs` (3 time zones).
This page is generated from the table's seed rows (P1, 2026-11-14).

## How the table works

- **A row** carries: key, scope ("all" or a state), employee rate, employer rate, value (ceilings, slabs), effective from, source URL, confidence, note, and who verified it and when.
- **`ruleOn(key, date, scope)`** gives the row in force on that date: the newest one on or before it (of two with the same date, the one added last). A month's pay passes the month's last day, so a rule starting mid-month applies to that whole month (September 2026's PF uses the ₹25,000 ceiling).
- **A rate change is a new row, not a code change:** `addRule` (Admin) adds one. Rows are never edited or deleted, so past months keep their rule.
- **Confidence:** `confirmed` (read on an official page or PDF), `secondary` (an official page's search extract; the page itself wasn't opened), `unverified` (not confirmed, a commonly used value, or empty).
- **Verify rates:** `verifyRule(adminId, rowId)` stores the Admin's id, name and the date on that row, with an audit entry. Permission `payroll-rules:verify`, Admin only, not overridable. It is kept in `pay-rules.js` (`PAY_RULE_PERMISSIONS`) until the page round, so the role pages' permission count is unchanged. `readyForRealUse()` lists every row not yet verified: all of them, today.
- **"Unverified rates":** every calculation says which rows it used and whether any is unverified and not verified by an Admin. Pages will show the label; nothing refuses to compute (ruled).
- **PF switch:** `setPfOnFullWages(adminId, on)`: PF on the wages capped at the ceiling (default, ruled) or on the full wages.
- **Stored:** `officeos:pay-rules` holds only what an Admin added, verified or switched, and the audit; the seed rows live in code. Reading writes nothing.

## The calculations (`statutory.js`)

| function | what |
|---|---|
| `statutoryWages` | wages = basic + DA + retaining allowance; other pay above 50% of the total is added back (from 21 Nov 2025) |
| `pfFor` | employee 12%, employer 12% of the wages up to the ceiling (or full wages); employer split EPS 8.33% (on the capped wages) + EPF; EDLI and admin charge on top |
| `esiFor` | 0.75% / 3.25% when the month's gross (the full monthly gross if loss of pay cut it) is at or under ₹21,000; employee exempt at a daily wage up to ₹176 |
| `professionalTaxFor` | by the office's state and month; February amounts; half-yearly schedules in their months; empty rows give 0 and say "missing" |
| `labourWelfareFor` | by state and period; a rate with a cap (Haryana) or fixed amounts in their months |
| `gratuityAccrualFor` | employer accrual only (cost to company), never a deduction |
| `statutoryFor` | all of the above for one month, with the totals off the pay and on the employer |

Interns (ruled): no PF, no ESI, no gratuity. Professional tax and LWF apply to them as to anyone. Rounding: whole rupees, half up (how the PF and ESI portals round is not confirmed).

## Every row

| key | scope | from | employee | employer | value | confidence | source | note |
|---|---|---|---|---|---|---|---|---|
| wages.addback | all | 2025-11-21 |  |  | allowanceShare 0.5 | secondary | <https://www.labour.gov.in/static/uploads/2026/01/de4758d5bfeffc456d7de97a801891b0.pdf> | Wages are basic + DA + retaining allowance; other allowances above 50% of total pay are added back. Before this date there is no add-back (no row). |
| pf | all | 2014-09-01 | 12% | 12% | wageCeiling 15000; epsRate 0.0833 | secondary | <https://www.epfindia.gov.in/site_docs/PDFs/MiscPDFs/Employer_Information_Booklet.pdf> | The ceiling before 17 Sep 2026. Its own start date (1 Sep 2014) is not from the scoping note: check it. The employer's 12% splits into EPS 8.33% (on wages up to the ceiling) and EPF, the rest. |
| pf | all | 2026-09-17 | 12% | 12% | wageCeiling 25000; epsRate 0.0833 | secondary | <https://www.labour.gov.in/static/uploads/2026/09/4f607a88c5342aeb980c6b999997caab.pdf> | Wage ceiling 25,000 a month from 17 Sep 2026 (EPS at most 2,083). A month uses the rule in force on its last day, so September 2026 is computed on 25,000: check how EPFO treats the part-month. |
| pf.edli | all | 2014-09-01 |  | 0.5% | onCeiling true | secondary | <https://www.epfindia.gov.in/site_docs/PDFs/MiscPDFs/Employer_Information_Booklet.pdf> | Employer only. Taken on wages up to the PF ceiling; the base and the start date are not confirmed. |
| pf.admin | all | 2014-09-01 |  | 0.5% | onCeiling false; minimum null | unverified | <https://www.epfindia.gov.in/site_docs/PDFs/MiscPDFs/Employer_Information_Booklet.pdf> | Employer only. EPFO pages conflict on the current rate, on a minimum and on EDLI admin charges; no minimum is applied. |
| esi | all | 2019-07-01 | 0.75% | 3.25% |  | confirmed | <https://esic.gov.in/contribution> | Rates from 1 Jul 2019. The contribution-period rule (someone who crosses the ceiling mid-period stays covered to its end) is not confirmed and not applied. |
| esi.ceiling | all | 2019-07-01 |  |  | wageCeiling 21000 | secondary | <https://esic.gov.in/contribution> | Coverage up to 21,000 a month, from a regional ESIC page; its start date and whether the Code on Social Security changed it are not confirmed. |
| esi.exempt | all | 2019-07-01 |  |  | dailyWageUpTo 176 | confirmed | <https://esic.gov.in/contribution> | At a daily average wage up to 176 the employee's share is not deducted; the employer still pays. |
| pt | Maharashtra | 2023-04-01 |  |  | to 7,500: 0; to 10,000: 175; above: 200 (Feb 300) | confirmed | <https://www.mahagst.gov.in/en/profession-tax-and-other-rate-schedule> | The schedule for men, applied to everyone: the women's slab (nil up to 25,000) is not applied (ruled: no gender rule now). 2,500 a year: 200 a month and 300 in February. |
| pt | Karnataka | not known |  |  | to 24,999: 0; above: 200 | secondary | <https://ptax.karnataka.gov.in/Home> | 200 a month from 25,000 a month, as the schedule read on the site says. A 2026 amendment act exists and its effect was not read; the start date is not known. |
| pt | West Bengal | 2014-04-01 |  |  | to 10,000: 0; to 15,000: 110; to 25,000: 130; to 40,000: 150; above: 200 | secondary | <https://wbprofessiontax.gov.in/professiontax_adm/writereaddata/upload/schedules/2016-08-22-161823Ptax-Schedule-New_(w.e.f._1-4-2014).pdf> |  |
| pt | Tamil Nadu | 2024-04-01 |  |  | to 21,000: 0; to 30,000: 180; above: not known (half-yearly, months 9, 3) | unverified | <https://chennaicorporation.gov.in/gcc/department/revenue/> | Partial: Chennai's 2024-25 schedule only (half-yearly income; local bodies differ). The slabs above 30,000 were not read: the amount there is not known and is computed as 0. The months it is deducted in (September and March) are an assumption. |
| pt | Haryana | not known |  |  | above: 0 | unverified | none | No professional-tax schedule was found for Haryana; whether it is levied at all is not confirmed. Ruled: 0, flagged unverified. |
| lwf | Haryana | 2025-01-01 | 0.2% |  | period monthly; employeeCap 34; employerMultiple 2 | confirmed | <https://hrylabour.gov.in/content/cms/MTU> | 0.2% of wages, at most 34 a month; the employer pays twice the employee's. |
| lwf | Haryana | 2026-01-01 | 0.2% |  | period monthly; employeeCap 35; employerMultiple 2 | confirmed | <https://hrylabour.gov.in/content/cms/MTU> | 0.2% of wages, at most 35 a month from January 2026; the employer pays twice the employee's. |
| lwf | Tamil Nadu | 2022-01-01 |  |  | period yearly; months 12; employeeAmount 20; employerAmount 40 | unverified | <https://www.lwb.tn.gov.in/about.php> | 20 + 40 a year (G.O. 161, 2022), from a search extract. The month it is deducted in (December) and the start date are assumptions. |
| lwf | Karnataka | 2025-01-01 |  |  | period yearly; months 12; employeeAmount 50; employerAmount 100 | unverified | <https://www.indiacode.nic.in/bitstream/123456789/7601/1/15_of_1965_(e).pdf> | 50 + 100 a year, from a fragment of the 2025 amendment. The month (December) and the start date are assumptions. |
| lwf | Maharashtra | not known |  |  | period half-yearly; months 6, 12; employeeAmount 25; employerMultiple 3 | unverified | <https://www.indiacode.nic.in/bitstream/123456789/19974/1/the_maharashtra_labour_welfare_fund_act..pdf> | The Act's base amount (25, the employer three times that), half-yearly; it may have been raised by a later government order. The months (June and December) are an assumption. |
| gratuity | all | 2025-11-21 |  | 4.8077% | daysPerYear 15; monthDays 26; ceiling 2000000 | unverified | <https://www.labour.gov.in/static/uploads/2026/03/a4ccf4c6d97c4f1f36a6d83f8c64213d.pdf> | The formula and the ceiling were not confirmed: the commonly used 15 days' wages for each year of service (a 26-day month), accrued monthly as wages x 15 / 26 / 12. Employer cost only; never a payslip deduction. Eligibility (5 years; 1 year fixed-term) is not applied to the accrual. |
| tax.section | all | not known |  |  | act Income-tax Act, 1961; salaryTds 192 | secondary | <https://www.pib.gov.in/PressReleasePage.aspx?PRID=2221416> |  |
| tax.section | all | 2026-04-01 |  |  | act Income-tax Act, 2025; salaryTds 392 | secondary | <https://www.pib.gov.in/PressReleasePage.aspx?PRID=2221416> | The new Act applies from 1 Apr 2026: salary TDS is section 392 (was 192). |
| tax.new | all | 2025-04-01 |  |  | slabs to 4,00,000 0%, to 8,00,000 5%, to 12,00,000 10%, to 16,00,000 15%, to 20,00,000 20%, to 24,00,000 25%, above 30%; standard deduction 75,000; rebate to 12,00,000 (max 60,000); marginal relief | secondary | <https://www.pib.gov.in/PressReleasePage.aspx?PRID=2098406> | The new regime (the default). That the same slabs continue for tax year 2026-27 isn't stated explicitly on the pages read. |
| tax.old | all | 2025-04-01 |  |  | slabs to 2,50,000 0%, to 5,00,000 5%, to 10,00,000 20%, above 30%; standard deduction 50,000; rebate to 5,00,000 (max 12,500); 80C-type cap 1,50,000 | unverified | <https://www.incometaxindia.gov.in/w/tds-rates> | NOT CONFIRMED: the official rates page refused automated reads. Commonly used old-regime values (under 60 years of age; 1,50,000 as the cap on 80C-type investments), shipped by ruling and flagged unverified. |
| tax.cess | all | 2025-04-01 |  |  | rate 0.04 | unverified | <https://www.incometaxindia.gov.in/w/tds-rates> | NOT CONFIRMED: health and education cess, the commonly used 4% of the tax, shipped by ruling and flagged unverified. |
| tax.surcharge | all | not known |  |  |  | unverified | <https://www.incometaxindia.gov.in/w/tds-rates> | NOT CONFIRMED: no number is known. No surcharge is computed. |
| tax.hra | all | not known |  |  | metroShare 0.5; otherShare 0.4; metros Mumbai, Kolkata, Delhi, Chennai; rentLessShareOfSalary 0.1 | secondary | <https://wm.incometaxindia.gov.in/w/what-is-the-taxability-of-house-rent-allowance-hra-> | Old regime only: the least of the HRA received, rent paid less 10% of salary (basic + DA), and 50% of salary in the four metros or 40% elsewhere (Gurugram: 40%). A 2026 page lists 8 cities at 50% for another allowance; whether HRA follows is not known. |
| tax.allowances | all | not known |  |  | medical taxable; lta taxable; conveyance taxable | unverified | <https://wm.incometaxindia.gov.in/w/what-is-the-taxability-of-house-rent-allowance-hra-> | NOT CONFIRMED: the treatment of medical allowance, LTA and conveyance. All are taken as fully taxable until a Chartered Accountant confirms. |

"from: not known" is stored as 2000-01-01, so the row applies to every date the app shows.

## Empty rows (no number known: 0, flagged unverified)

- **Professional tax (31 states and territories):** Andhra Pradesh, Arunachal Pradesh, Assam, Bihar, Chhattisgarh, Goa, Gujarat, Himachal Pradesh, Jharkhand, Kerala, Madhya Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Odisha, Punjab, Rajasthan, Sikkim, Telangana, Tripura, Uttar Pradesh, Uttarakhand, Andaman and Nicobar Islands, Chandigarh, Dadra and Nagar Haveli and Daman and Diu, Delhi, Jammu and Kashmir, Ladakh, Lakshadweep, Puducherry.
- **Labour welfare fund (32):** Andhra Pradesh, Arunachal Pradesh, Assam, Bihar, Chhattisgarh, Goa, Gujarat, Himachal Pradesh, Jharkhand, Kerala, Madhya Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Odisha, Punjab, Rajasthan, Sikkim, Telangana, Tripura, Uttar Pradesh, Uttarakhand, West Bengal, Andaman and Nicobar Islands, Chandigarh, Dadra and Nagar Haveli and Daman and Diu, Delhi, Jammu and Kashmir, Ladakh, Lakshadweep, Puducherry.

An Admin gives a state numbers with `addRule` (a new row with its source).

## Flagged unverified

- `pf.admin@all@2014-09-01`: Employer only. EPFO pages conflict on the current rate, on a minimum and on EDLI admin charges; no minimum is applied.
- `pt@Tamil Nadu@2024-04-01`: Partial: Chennai's 2024-25 schedule only (half-yearly income; local bodies differ). The slabs above 30,000 were not read: the amount there is not known and is computed as 0. The months it is deducted in (September and March) are an assumption.
- `lwf@Tamil Nadu@2022-01-01`: 20 + 40 a year (G.O. 161, 2022), from a search extract. The month it is deducted in (December) and the start date are assumptions.
- `lwf@Karnataka@2025-01-01`: 50 + 100 a year, from a fragment of the 2025 amendment. The month (December) and the start date are assumptions.
- `lwf@Maharashtra@2000-01-01`: The Act's base amount (25, the employer three times that), half-yearly; it may have been raised by a later government order. The months (June and December) are an assumption.
- `gratuity@all@2025-11-21`: The formula and the ceiling were not confirmed: the commonly used 15 days' wages for each year of service (a 26-day month), accrued monthly as wages x 15 / 26 / 12. Employer cost only; never a payslip deduction. Eligibility (5 years; 1 year fixed-term) is not applied to the accrual.
- `tax.old@all@2025-04-01`: NOT CONFIRMED: the official rates page refused automated reads. Commonly used old-regime values (under 60 years of age; 1,50,000 as the cap on 80C-type investments), shipped by ruling and flagged unverified.
- `tax.cess@all@2025-04-01`: NOT CONFIRMED: health and education cess, the commonly used 4% of the tax, shipped by ruling and flagged unverified.
- `tax.surcharge@all@2000-01-01`: NOT CONFIRMED: no number is known. No surcharge is computed.
- `tax.allowances@all@2000-01-01`: NOT CONFIRMED: the treatment of medical allowance, LTA and conveyance. All are taken as fully taxable until a Chartered Accountant confirms.
- `pt@Haryana@2000-01-01`: Haryana professional tax 0 (ruled), not confirmed whether it is levied.
- every empty row above.

Totals: 90 rows; 5 confirmed, 11 secondary, 74 unverified (63 of them empty).
