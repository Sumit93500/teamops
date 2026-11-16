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

## Where a check-in comes from (round 14, data only)

`checkIn(userId, mode, stamp)` and `checkOut(userId, stamp)` take an optional stamp. Without it they write exactly what they wrote before. Since L3 the React Mark attendance always checks in and out through `checkInAt()` / `checkOutAt()` in `data/locations-store.js`, which make the stamp after two checks:

1. **The place:** `checkPlace()` must say ok (the employee's office, or a home if they're allowed one).
2. **The device:** at most 2 per employee.

The record then carries `checkInPlace`, `checkInDistanceM`, `checkInDeviceId` (and the same three for the check-out), plus `flagged` / `flagReasons`:

- `place-changed`: checked out somewhere other than where they checked in;
- `device-changed`: checked out on another device;
- `shared-device`: the device is registered to someone else too.

`checkInRefusal()` / `checkOutRefusal()` answer "would this be refused?" without writing. See [locations.md](locations.md).

## Mark attendance with a place (L3, the React app)

- **Check-In From:** only the places this person may check in from (`placesFor`): their office (head office or branch) and, when HR turned home check-in on, the homes they've set. A home means work from home; the office means office. The Admin (`attendance:any-office`, F1) also has every other active office, and the check is made against the one chosen.
- **Use my location:** the browser's position, read once when pressed. The line under it says the check's answer with the place's real name, the distance and, when outside, the radius (F1): "You are 40 m from Head office, check-in allowed" or "You are 2.3 km from Head office (limit 150 m), check-in not allowed" (metres under 1 km, else km to one decimal; check-out the same). A reading less accurate than 100 m asks to try again; a denied permission and a browser without location say what to do.
- **The device:** "Registered device", "New device" (checking in registers it, N of 2 used), or "Device limit reached" (ask an Admin). A device registered to someone else too checks in, flagged.
- **The button:** one big Check in (or Check out), enabled only when the reading is inside the chosen place and the device is allowed. Every refusal the store gives is said in plain words.
- **Check-out from another place:** a "Flagged" notice before pressing, and a question before it's done; the day is flagged `place-changed`.
- **The chosen place is enforced (L4):** the page passes the chosen place to `checkInAt()`, which checks that place only, and the record names it. With an office and a home that overlap, the place chosen is the one stamped. Check-Out From shows the check-in's place; a check-out inside it counts there and isn't flagged, one outside it is judged at the nearest of your places (flagged when it differs, asked first).
- Today's card shows where you checked in and out from, with the distance; the recent punches show the place.
- The privacy line: "Your location is read only when you check in or out, never in the background."

## Where check-ins came from, in the views (L3)

- **My attendance:** a Place column (icon and name, the distance, the check-out's place when it differs), a Flagged badge beside the status, and "Flagged only".
- **Team attendance:** the same column and badge, and a "Flagged only" filter. A manager still sees only their direct reports (`teamScope`).
- **Team attendance's Export (L4):** the file has the Place in words ("Head office, 40 m; out: Permanent home, 0 m", empty when none was recorded), the Status without the flag, and a Flagged column after it. Since L5 the Flagged cell gives the reason from the store's reason codes: "Yes: checked out from a different place" (`place-changed`), "Yes: checked out from a different device" (`device-changed`), "Yes: shared device" (`shared-device`), several joined with "; ", a code without wording as it is, and "No" otherwise (`app/src/data/stamps.js` `flaggedCell`). It follows the page's filters and tab, every page of them. The file is made from a copy of the table with that extra column, so the page's table and phone cards are unchanged.
- **HR dashboard:** Flagged check-ins, the last 7 days (with `attendance:view-all`): who, the day, the places and why.
- The stamps are read from the saved records (`app/src/data/stamps.js`); a day without one says "Not recorded".

## Shifts (SH1)

From the shift rules start date (default 2026-12-01) each day is read by the person's shift (the every-3rd late-mark rule stays, as a dated, Admin-editable policy): see [shifts.md](shifts.md). Before it everything above holds exactly. The old site keeps these rules and its sample Shifts page.

## Client and official visits (CV1, 2026-11-16)

A person works at a client's or another place for a day or more. Data: `assets/js/data/visits-store.js` (the saved visits and their per-day punches), `assets/js/data/visits.js` (asking, assigning, deciding, cancelling, checking in and out, what waits, who is on site today), `assets/js/data/visit-days.js` (how a visit day reads; `assets/js/data/shift-days.js` hands each day to it) and the permissions `visits:request`, `visits:approve`, `visits:assign`, `visits:view-all` (see [rbac.md](rbac.md)).

- **Asking and assigning.** A person asks for a visit (kind, place, purpose, up to 31 days, from today, from the shift rules start date, not before their joining date); their manager decides it (HR or an Admin for someone with no manager now). A manager (direct reports), HR or an Admin assigns a visit to one or more people: it starts approved, and if any one person can't have it nothing is saved. A visit can't overlap approved leave or another visit; a weekly off or holiday inside a range is left out unless the assigner allows it. A same-day visit starts at once and its approval follows; rejected, the day goes back to the ordinary rules. A visit can be cancelled before anything is punched.
- **Checking in and out.** Location is required for both, and there is no 150 m office rule. A reading worse than 200 m is refused; one over 100 m is accepted and flagged as low accuracy. Where the browser gives no location the person says so with a reason; the approver's explicit OK (with a note) makes the day count.
- **The day.** An approved visit day with a valid check-in reads **On-site / Client visit**: present, never late, never absent, never overtime; under the shift's half-day threshold it is a half day (as any half day). No check-in yet reads **Visit not started** (flagged; not absent; after the day it is incomplete for HR). Days without a visit are untouched.
- **Where.** Mark attendance (third choice "Client / official visit"), My visits, Team visits, the visit's own page (the punch trail with an Open in maps link), the approvals inbox, the bell, the dashboards' "On site today", My attendance and Team attendance (the chip, the "On a visit" tab).
- **Night shift's next-morning fix.** `assets/js/data/night-fix.js`: a missed check-out on a night shift's start date is judged against the shift day: the time is read as the next morning and may be as late as the shift's end plus a window (default 6 hours; HR and the Admin set it). The form shows the shift and a "next day" label. Day shifts are judged as before.

## Not built yet

- The old site's Mark attendance has no place check (the React app does). F1 removed its "Location check" card, whose only line said location and network checks weren't part of the demo.
- **Mark attendance on every dashboard (F1):** the Admin, HR and Finance dashboards have the Employee dashboard's Mark attendance in their headers (a secondary button beside the page's own main action); a manager has the Employee dashboard's.

## The employment period (F2, 2026-11-15)

`assets/js/data/employment-period.js`: `employmentPeriod(person)` = { from: the joining date, to: the exit date, away: periods away }, `employmentState(person, date)` (before / during / after), `joinsOn(person, today)`. Nothing is expected, counted or shown as absent before joining or after exit: those days read "Not yet joined" / left. Someone added in the employee form with the joining date left empty joins on the day they are added (the form sends today's date; `addUser` itself is unchanged, the data layer additive), so they never inherit earlier history. A future joiner's Mark attendance says "Joins on 1 Dec 2026" and check-in stays off until that day. The seeded people's existing attendance, leave and pay are byte-identical (dumped in 3 zones). Checks: `tests/live/employment.mjs`.
