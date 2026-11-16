# Shifts (SH1)

Shift-based attendance, built in SH1 (2026-11-15). Additive: the old attendance, leave and pay code is unchanged and the old static site keeps today's rules (the old site's `shifts.html` is still a sample). The React app reads days by shift from the **shift rules start date**.

**Files:** `assets/js/data/shifts-store.js` (the shifts and their dated rules), `shift-assignments.js` (who is on which shift), `shift-settings.js` (the start date, the late-mark rule, comp-off), `shift-engine.js` (one day, pure), `shift-days.js` (days by shift), `shift-punch.js` (check-in and check-out by shift), `overtime-store.js` (overtime and its decisions), `comp-off.js` (comp-off days). Hooks: `pay-engine.js` (`shiftLossOfPay`), `leave-policy.js` (comp-off in earned leave), `attendance-store.js` and `locations-store.js` (new exports only). Tests: `tests/live/shifts.mjs` (3 time zones; 23 mutants, all caught), the React harness `sh1`.

## The start date

`shiftRulesFrom()`: default **2026-12-01** (as the leave policy's). Always the 1st of a month (pay months start on the 1st), never in the past, never on or before an approved payroll month. The Admin changes it on the Shifts page.

- **Before it**, every day, month and payslip is exactly what the old rules give: a dump of every existing attendance, leave and pay month is byte-identical before and after SH1, in India, UTC and Los Angeles.
- **From it**, the shift engine decides each day, and pay takes its loss of pay (below).

## A shift

| field | what |
|---|---|
| `start`, `end` | wall-clock "HH:MM" in office time; an end before the start crosses midnight (`crossesMidnight`, derived) |
| `graceMin` | late = checking in more than this after the start |
| `breakMin` | unpaid, taken off the time worked on a full day |
| `absentBelowHours`, `halfDayBelowHours`, `shortLeaveBelowHours` | worked under each: absent, half day, short leave (equal half day and short leave: no short-leave band) |
| `earliestCheckInMin` | check-in opens this long before the start |
| `overtimeAfterMin`, `overtimeMinBlockMin` | overtime counts after end + this, in whole blocks |
| `weeklyOffDays` | 0 Sunday to 6 Saturday |

**Checks:** a name of 2-40 characters, unique ignoring case and spaces; real times, end not the start; grace shorter than the shift; a break that leaves an hour; thresholds in quarter hours with absent at or under half day, at or under short leave, all within the hours worked, absent under half the shift; check-in opening 0-240 minutes before and not before midnight; overtime after 0-240 minutes, blocks of 5-240; at least one working day.

**Dated rules:** an edit is a new version from the day it is made (two edits the same day: one version), so a day already worked keeps its rules. An edit clears the sample mark.

**The seed (marked sample):** General 09:30-18:30, which is **today's rules exactly** (15 min grace, no break, half day under 8 h, absent under 4 h, no short-leave band, check-in from 08:30, Saturday and Sunday off; overtime after 18:45 in 30 min blocks, which changes no status); Early 06:00-15:00; Night 22:00-07:00; Part-time 10:00-14:00. `tests/live/shifts.mjs` G reads every seeded day of every person (October and November 2026) under General at three clocks: identical to the old rules.

**Deactivate:** refused while anyone is on the shift now or later (an assignment, a department default, a date swap), naming them; General can't be. Nothing is deleted.

## Who is on which shift (`shiftOn(person, date)`, a pure function)

1. a **swap** for that person and date (one date, with a reason);
2. else their **assignments** covering the date (from, optional to): the one made last;
3. else their **department's default** on the date;
4. else **General**.

Dates are office dates and can't be in the past. Nobody changes their own shift. A swap that would overlap the shift before or after it is refused ("That would overlap Night the day before, which ends at 07:00."). Every assignment and swap is kept: the profile's history.

## One day (`classifyDay`)

The old `deriveDay` step for step, by the shift: a check-in always counts; then a closed holiday, the shift's weekly off, a full day of leave, no data, else expected (not yet, overdue, absent).

- **Late:** after start + grace (exactly at it is on time). With first-half leave the start is the shift's midpoint.
- **Worked:** check-out minus check-in, less the break on a full day. Under absent / half day / short leave hours: that status; else present or late. With a half-day leave: under half the half-day hours is absent, else present or late.
- **Overtime:** on a full day, the minutes after end + `overtimeAfterMin`, rounded down to whole blocks.
- **A night shift is one day, the date it starts on.** Its record is that date's; a check-out next morning ("07:10") completes it, and a late check-in after midnight ("00:40") belongs to it while it comes before the start date's check-in window.
- **No check-out:** in progress until the end of the day (General), or 4 h after a night shift's end; then **incomplete**, counted as present / late as today (the existing rule), shown with an Incomplete chip. HR or an Admin completes it ("Complete day": the check-out and a reason; never their own).
- **Office time:** every office is in India, so "now" is India Standard Time (UTC+05:30, no daylight saving) whatever the machine's zone; dates are whole UTC days.
- The sample people's generated days (no stored record) follow their shift: their times keep their distance from the shift's start and end.

## Checking in (`shift-punch.js`, the React Mark attendance from the start date)

The window opens before the start ("Your shift starts at 22:00, check-in opens at 21:30.") and closes at the shift's end; a night shift's runs past midnight. A check-out goes on today's open record, else on last night's (until 4 h after its end). While a night is open, a new check-in is refused ("You're checked in for Tuesday's Night shift: check out first."). The weekly off is the shift's ("Today is your weekly off, so no attendance is needed."). The place and device checks are the existing ones, in the same order.

## Pay

From the shift rules month, `payFor` (the new engine) **replaces** the old row's attendance part (its late-mark half days and settled absences) with the shift engine's settled days, at the same daily rate: absent 1 (0.5 with a half-day leave), half day 0.5, **short leave 0.25**, plus the late-mark half days the policy gives. Settled as today: once the 7-day correction window has closed and no correction or leave request is waiting. Unpaid leave, before joining and after leaving stay as the old row has them; the leave policy's loss of pay is added on top as before. No pay maths changed.

**Late-mark rule (SH1b ruling):** ON by default, every 3rd late mark in a month costs a half day: today's rule, so pay from the start date matches it. The Admin edits it in the shift settings (on / off, 2 to 10). It is **dated**: a change applies from the day it is made, and a late mark is judged by the policy in force on its own date, counted in the month's running order (the 3rd costs a half day, the 6th another; the 2nd and 4th-5th nothing). Marks whose late-arrival correction is pending wait, as before. The old site and months before the start keep the old every-3rd rule, byte for byte.

## Overtime and comp-off

- A day's overtime is pending until decided. **Who decides:** the person's manager; HR or an Admin for someone without one; nobody their own; `overtime:approve` (everyone holds it, it acts on direct reports). A rejection needs a reason. Only a stored record's day can be overtime.
- **Decisions are stored once and never change:** the approved minutes of a month are fixed, whatever the record says later.
- **The approval card:** overtime is an eighth kind in `app/src/data/waiting.js` (the inbox with type Overtime, the bell, the sidebar count, the Admin dashboard), decided through `OVERTIME_FLOW`.
- **Comp-off** (off by default): each approval adds its minutes to the person's bank; every `minutesPerDay` (480) makes a comp-off day, expiring `expiryDays` (90) after it is earned. Comp-off days count in earned leave (available and usable at once) while they last; an expired day still covers earned leave already taken with it. My leave shows the comp-off line when it is on or any was earned.
- **Paying for overtime is not worked out** (a Finance rule; the parking lot).

## Permissions (102 in 43 modules)

| permission | who |
|---|---|
| `shifts:manage` | Admin, HR: the Shifts page, create / edit / deactivate |
| `shifts:assign` | Admin, HR: assign people, several at once, a department's default; swap anyone's date |
| `shifts:view` | everyone (your own shift; a manager also their team's) |
| `shifts:swap-team` | everyone: swap one date for your direct reports (only a manager has any) |
| `overtime:approve` | everyone: decide your direct reports' overtime; HR and the Admin for people without a manager |

None is overridable. Admin 102, HR 58, Finance 48, Employee 30 (CV1 added the four `visits` ones: see [rbac.md](rbac.md)).

## The screens

| screen | what |
|---|---|
| Shifts (`attendance/shifts.html`, was a sample) | the shifts with their rules in words, who is on each today, the night mark; New / Edit with a live preview and each field's message; deactivate (asked first); Assign shift (search, department, select all); department defaults; Assignments and swaps (date range, "No data in this range."); the Admin's settings (start date, late-mark rule, comp-off) |
| Profile, My profile | the Shift card: today's shift and where it comes from, its rules, Assign shift (HR, Admin), the history (date range) |
| My attendance | "Your shift" with the next check-in window; Shift and Overtime columns; Short leave, Weekly off, Incomplete; the late-mark words follow the rule |
| Team attendance | Shift and Overtime columns; filters by shift and by every active office; Swap shift (HR, Admin, a manager for a report); Complete day (HR, Admin) |
| Mark attendance | from the start date: the shift path, the shift card (shift, timing, window, grace, late marks) |
| Dashboards | Employee: "Your shift: Night, 22:00 to 07:00 (next morning)" and the next window; Admin: a Shift column; HR: Shifts today |
| Approvals | Overtime rows, the card, the bell |
| My leave | comp-off in earned leave |
