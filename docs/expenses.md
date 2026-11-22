# Expenses

**Files:** `assets/js/data/expenses.js` (categories, amounts, stages: pure functions), `data/expenses-store.js` (claims).

## Policy (`EXPENSE_POLICY`)

| rule | value |
|---|---|
| Admin approval too | above ₹50,000 (exactly ₹50,000 doesn't need it) |
| receipt expected | above ₹500 |
| send within | 30 days of the spending |
| pay within | 5 working days of approval (a target the page shows; not enforced) |
| processing target | 3 days on average (shown; not enforced) |

## A claim

- **Fields:** `{ id, userId, category, amount, date, reason, receipt, status, stage, managerId, appliedOn, history }`.
  - `receipt` is the receipt's name. Since FS1 the file itself is kept through `data/files.js` (kind `expense-payslip`, linked to the claim; see [files.md](files.md)); claims from before keep only their text, shown as "Entered as text".
- **Status:** pending → approved → paid; or rejected, or cancelled.
- **Stages:** manager → Finance → Admin (above ₹50,000) → payment.
  - Each stage is decided by someone different.
  - A stage nobody can decide is skipped, and the history says so.
- **History entries:** `{ stage, byUserId, decision, at, note }`.

The approvals inbox, the bell and the approval card list a claim at the stage it waits at.

## Not built yet

Real payments. Returning a claim to the claimant (so its file can be changed) isn't a step yet.
