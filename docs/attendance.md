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

- **Check-In From:** only the places this person may check in from (`placesFor`): their office (head office or branch) and, when HR turned home check-in on, the homes they've set. A home means work from home; the office means office.
- **Use my location:** the browser's position, read once when pressed. The line under it says the distance to the chosen place and its radius ("You're 40 m from Head office, inside its 150 m radius."). A reading less accurate than 100 m asks to try again; a denied permission and a browser without location say what to do.
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

## Not built yet

- Shifts (the page is a sample).
- The old site's Mark attendance has no place check (the React app does).
