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
