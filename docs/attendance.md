# Attendance

**Files:** `assets/js/data/attendance-store.js` (records, corrections, the rules), `data/approval-chain.js`, `data/holidays.js`. (`data/attendance.js` is an old demo file nothing imports.)

## What is stored

Only what happened is stored: who, which day, the punch times, office or home, where the record came from, and any times a correction replaced. Status, hours and lateness are worked out on every read, from the rules plus weekends, holidays, approved leave and the user list. So a new holiday or an approved leave changes a day without rewriting any record.

## Rules (`ATTENDANCE_RULES`)

| rule | value |
|---|---|
| shift | 09:30–18:30 |
| check-in opens | 08:30; it closes at the day's end (round 14F) |
| late | after 09:45 (15 minutes' grace) |
| half day / absent | under 8 h worked is a half day; under 4 h is absent |
| late-mark penalty | every 3rd late mark in a month costs a half day's pay |
| corrections | a past day can be corrected (late arrival, missed check-in or check-out) within 7 days |

A day's status is one of: present, late, half-day, absent, on-leave, holiday, weekend, not-yet, no-data, not-joined, left.

## Corrections (regularization)

A correction goes to the person's manager, then HR (`approval-chain.js`). With no manager on file it starts at HR, and nobody decides their own. An unexplained absence is deducted from pay only once its 7-day window has closed (round 8D).

## Who sees what

Everyone sees their own attendance. HR and Admin see everyone's (`attendance:view-all`); managers see their direct reports'.

## Not built yet

Shifts (the page is a sample) and offices and locations (round 14).
