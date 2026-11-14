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
