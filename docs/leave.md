# Leave

**Files:** `assets/js/data/leave-store.js` (requests, balances, the policy), `data/approval-chain.js`, `data/holidays.js` (holidays and working-day maths). (`data/leave.js` is an old demo file nothing imports.)

## Policy (`LEAVE_POLICY`)

| type | allowance |
|---|---|
| Casual leave | 12 a year |
| Sick leave | 8 a year |
| Earned leave | 10 a year |
| Work from home | 4 a month |
| Unpaid leave | no limit |

A request is a full day, or the first or second half of one. Balances are always worked out from the requests, never stored.

## The chain

1. The requester's manager decides first.
2. Then HR or an Admin (`leave:approve`).

- With no manager on file, the request starts at HR.
- If the manager can no longer decide, HR decides that stage instead, so a request is never stuck.
- Nobody decides their own request.
- An Admin's own leave is approved automatically.

## Dates

Dates are ISO strings, and the date maths is done in UTC on whole days, so a browser's time zone can't shift a day.

A past day can be explained by a leave request for 7 days (`PAST_DAY_WINDOW`). After that, payroll treats an unexplained absence as final.

## Holidays

The company calendar is a store: HR and Admin add and remove holidays (`holidays:manage`). A past holiday can't be removed.

## P4b (2026-11-14): the leave screens

From the **leave policy's start date** (the Leave policy page; `data/pay-settings.js`; default **2026-12-01**, the first of the month after the policy shipped; never in the past) the leave pages use the P3 policy; before it every leave page, balance and history is exactly as it was, and leave already taken is never rewritten.

| screen | from the start date |
|---|---|
| My leave | the **band badge** (Intern / Under 1 year / Over 1 year) and the next change; five cards by the policy (left, accrued so far, carried forward, used, pending, usable-from date); **carry-forward and encashment** lines; **loss of pay** shown on the card and in its own card; "How your balance is worked out" in plain words |
| Apply for leave | "Under the leave policy": covered, or how many days are beyond the balance and would be unpaid; **Apply anyway?** is asked before such a request is sent |
| Team leave | a Band column and the policy's balances (a manager sees only reports) |
| Leave approvals | a Pay column on Pending: Paid, or Would be unpaid: n days |
| Leave policy (new, app-own) | the numbers by band, marked sample; HR reads, an Admin edits through the module's checks, sets the start date, sees the history, and closes a leave year (once, with a preview of what is carried and paid out) |
| Profile, user form | the leave band, read-only |

**Limits, said on the pages (until P5):** payroll deducted only leave applied for as Unpaid leave, and applyLeave refused requests above the old flat allowance, so the policy's loss of pay was shown, not deducted. P5 made it binding:

## P5 (2026-11-14): the policy is binding

- **From the policy's start date** (by the leave's first day, `from`), Apply for leave goes through `applyLeaveUnderPolicy()` (`data/leave-policy.js`), which checks the band's balance instead of the flat allowance. A leave that starts before the start date keeps the flat 12 / 8 / 10 and its checks.
- **Beyond the balance:** the store refuses unless the request explicitly accepts loss of pay (`acceptLossOfPay: true`; code `loss-of-pay`, with the paid and unpaid days). The page asks "Apply anyway? ... would be unpaid (loss of pay)." (Apply anyway / Go back) and sends it again only on Apply anyway. WFH and Unpaid leave are never loss of pay.
- **The request records it:** `underPolicy: true`, `policyBand`, `lopDays`. The approvals show a **Pay** column on every tab (Paid, or the unpaid days), read from the request; deciding doesn't re-check the flat allowance for such a request.
- **Payroll** deducts those days from the later of the pay rules' start month and the leave start month (see [payroll.md](payroll.md#p5-2026-11-14-the-rules-are-binding)). History is never rewritten: requests made before stay as they were.

## P3 (2026-11-14): leave by tenure (data only)

`assets/js/data/leave-policy.js`. Nothing here is on a page yet: `data/leave-store.js` still gives every page its flat policy (casual 12, sick 8, earned 10 a year, WFH 4 a month) and its checks, exactly as before. The page round (P4) switches over.

**Bands** (`tenureBand(user, date)`, computed, never stored): an intern is always `intern`; anyone else `under1` before their first work anniversary and `over1` from that day (a 29 Feb joiner moves up on 28 Feb). No joining date on file: `over1`. Joining date and type come from `data/employment.js` (the profile, else the sample).

**The policy (sample numbers, ruled; the Admin can change them, `leave-policy:edit`):**

| band | casual | sick | earned | WFH | unpaid |
|---|---|---|---|---|---|
| intern | 1 a month | none | none | 4 a month | no limit |
| under 1 year | 12 a year, pro-rated | 8 a year, pro-rated | 1 per 20 days worked from joining, usable 6 months after joining; carries up to 30, not encashed | 4 a month | no limit |
| 1 year or more | 12 a year | 8 a year | 1 per 20 days worked; carries up to 30, encashed above 30 at year end | 4 a month | no limit |

**Choices made (please confirm):** the leave year is the calendar year; a month counts when the person is employed on its 15th; pro-rated amounts round down to the half day; "days worked" = working days (no weekends or closed holidays) less approved unpaid leave, paid leave counting as worked (attendance records don't cover the past); interns have no sick leave (the brief named only casual and earned); casual and sick lapse at year end.

**`leaveAccount(userId, date)`**, per type: entitled, carried in, taken, pending, available, usable, left, and `lop`: days taken beyond what is usable (loss of pay). `requestOutcome(userId, type, days, date)` splits a request into paid days and loss of pay, counting what is already pending.

**Year close (`closeLeaveYear`, Admin, once, after 31 Dec):** for each person, earned leave left on 31 December by their band that day: carried forward up to 30; over a year, encashed above that; the rest lapses; interns carry nothing. Next year's earned starts with what was carried.

**Statutory notes (not enforced):** OSH Code annual leave (1 day per 20 days worked after 180 days, carry-forward 30, encashment): whether it covers this office or the Haryana Shops and Establishments Act does is not confirmed. Maternity benefit not modelled. Interns' status under leave law not confirmed.

What the sample shows today (6 Oct 2026): Meera Joshi, under a year, took 9 earned days but has 7 under the new policy: 2 days would be loss of pay. Everyone over a year has accrued 9 earned days by then (about 12 a year, against today's flat 10).

Tests: `tests/live/leavebands.mjs` (3 time zones; 45 mutants, all caught).
