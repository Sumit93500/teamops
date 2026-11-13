# Offices, locations, devices and the company profile

Built in round 14 (2026-11-12) as **data only**: stores, rules and tests. The location page rounds (L0–L3) add the screens:
L1 the Offices page (`/pages/company/offices.html`), Settings' Company profile, About's offices, and on the users pages the
employee's office, home check-in switch, check-in places and devices; L2 and L3 the employee's own homes, devices and
check-in (L2 built My locations, the location changes in the inbox and My devices; L3 Mark attendance with the place check and
the place column on the attendance views, see [attendance.md](attendance.md)). L0 moved the seven permissions into the main list (see [rbac.md](rbac.md)), gave offices a state, and made "Reset demo data" clear these stores.

**Files:** `assets/js/data/company-store.js`, `offices-store.js`, `locations-store.js`, `devices-store.js`, `places.js`; `config/permissions.js` and `config/roles.js` (the permissions, see [rbac.md](rbac.md)); `data/attendance-store.js` (the optional check-in stamp, see [attendance.md](attendance.md)).

## Honest limits

- **Location can be faked.** The place check trusts what the browser reports, and a browser's location can be spoofed.
- **The device token can be copied.** It is a random value in browser storage, so it can be copied or cleared.
- **Nothing tracks continuously.** A place is read only at check-in and check-out.
- **Real enforcement is the backend stage.** This is a demo of the rules, not security.

## Company profile (`company-store.js`)

| | |
|---|---|
| fields | `name` (2-100 characters, one line), `overview` (up to 1,000), `mission` (up to 300); trimmed |
| seed | "Northwind Technologies Pvt. Ltd.", overview and mission empty (About says "Not added yet.") |
| who edits | Admin (`company:edit`): `updateCompanyProfile(actorUserId, changes)` |
| reads | `getCompanyProfile()`, `companyName()` |

The React app's shared name `COMPANY.name` (`app/src/data/company.js`) now reads `companyName()`, so the shell, About, the tab title and the payslip follow a saved change. The old site's pages don't read it yet.

## Offices (`offices-store.js`)

- **An office:** `{ id, name, type: head | branch, address, state, lat, lng, radiusM, active, sample, note }`.
- **State (L0):** one of `OFFICE_STATES` (28 states and 8 union territories), required when an office is created. The seeded head office is in Haryana. An office saved before L0 reads `state: null` ("Not set") until edited; editing its other fields doesn't require one.
- **The seed:** one head office at the company's address. Its coordinates are a sample, marked `sample: true` with "Sample coordinates: set the real location." Setting real coordinates clears the mark. There is no branch.
- **Rules:**
  - names are unique, ignoring case and spaces;
  - there is exactly one head office, and it can't be deactivated or turned into a branch;
  - latitude is -90 to 90, longitude -180 to 180;
  - the radius is a whole number of metres, 20 to 1,000 (150 by default).
- **Who works where:** everyone works from the head office unless an Admin moves them (`setEmployeeOffice`). The assignment is kept in this store, not on the user record. People on an inactive branch work from the head office.
- **API:**
  - Admin only (`offices:manage`): `createOffice`, `updateOffice`, `deactivateOffice`, `reactivateOffice`, `setEmployeeOffice`;
  - reads: `getOffices`, `getOffice`, `headOffice`, `officeOf`, `officeIdOf`.

## Home locations (`locations-store.js`)

- **Who:** only people HR marked home-eligible. `setHomeEligible(actorUserId, userId, true)` needs `users:edit`; the default is false.
- **Setting a home:** a permanent and a temporary home `{ address, lat, lng }` can each be set once by the employee (`setOwnHome`).
- **Changing a home** is a request:
  1. The employee sends it: `requestLocationChange(actorUserId, kind, place, reason)`, with a reason of 3-300 characters. Only one can be pending per kind.
  2. An Admin decides it (`locations:review`): `decideLocationChange(id, adminId, "approved" | "rejected", note)`. Nobody decides their own.
  3. An approval applies the new place. An Admin's own request is approved at once, as their leave is.
- **Requests:** `cancelLocationChange`, `pendingLocationChanges(deciderId, roleKey)`, `locationChangesFor(userId)`.
- **History:** every set, change and eligibility switch is kept as `{ at, byUserId, action, kind, from, to, requestId }` (`homeOf(userId).history`).
- **The inbox (L2):** location changes are a sixth kind in the React app's `app/src/data/waiting.js` (the old `ui/waiting.js` plus `pendingLocationChanges`). The approvals inbox lists them (badge "Location", type filter, Approved / Rejected tabs, Recently decided); its stat, the sidebar's Approvals count, the topbar bell and its list, the approval card and the Admin dashboard's list all count from that one function, so they never disagree. Approve and Reject go through the shared decision flow (`LOCATION_FLOW` in `components/Decision.jsx`); Reject asks for a reason, which the employee sees. There is no separate notifications store: the bell is the inbox count.
- **HR reads them (L4):** HR (`users:edit` without `locations:review`) has a read-only "Location changes" tab in the approvals inbox: every change, newest request first, with its status, who asked, when, and who decided. It has no buttons and no count, and nothing in it counts as waiting for HR: the inbox stat, the sidebar count and the bell stay as they were. Only an Admin decides.

## My locations (L2)

`/pages/account/my-locations.html`, the app's own page, open to everyone signed in; found by search, linked from My profile and Mark attendance.

- **Your office:** name, address and radius.
- **Not home-eligible:** "Home check-in isn't on for you", and whom to ask by name (active people with `users:edit`). No forms.
- **Home-eligible:** a card per home with a status chip ("Not set", "Set", "Change waiting").
  - Not set: a form (address, "Use my current location" read once on press, latitude and longitude typed as the fallback; no map). Saved once.
  - Set: the address, position, radius and day; "Request change" opens a dialog (the new place and a reason). A waiting change can be cancelled (asked first).
  - An Admin's own change applies at once and is logged ("Changed", decided by You).
- **Change requests:** every request with its status chip and who decided it, with the note.
- **History:** every set, change and switch, from and to, by whom.
- The privacy line: "Your location is read only when you check in or out, never in the background."

## The place check

`checkPlace({ lat, lng, accuracyM }, employee, now) -> { ok, place, placeName, distanceM, reason, code, at }`

- **Allowed places:**
  - the employee's office: `place` is `head` or `branch`, with the office's own radius;
  - their homes, only if home-eligible and set: `homePermanent` and `homeTemporary`, 150 m each (`HOME_RADIUS_M`).
- **Distance:** haversine on the earth's mean sphere, judged in whole metres. Exactly the radius is inside. The nearest place inside wins.

| case | ok | code | reason |
|---|---|---|---|
| inside a place | yes | `ok` | "" |
| accuracy over 100 m, or none | no | `inaccurate` | "location not accurate enough, try again" |
| no usable latitude / longitude | no | `no-location` | "No location from this browser. Allow location and try again." |
| outside every place | no | `outside` | "N m from <nearest place>" |
| no place at all | no | `no-place` | "No office is set for you. Ask an Admin." |

`judgePlace(reading, places)` is the pure core; `placesFor(employee)` lists the places.

**The chosen place (L4):** `checkPlace(reading, employee, now, placeId)` and `judgePlace(reading, places, placeId)` take an optional `placeId`, one of the employee's `place` values (`head`, `branch`, `homePermanent`, `homeTemporary`).

- Given, the reading is judged against **that place only**. Two overlapping places (an office and a home close by) can't name the other one, and "outside" names the chosen place: "N m from <chosen place>".
- A `placeId` that isn't one of the employee's places is refused: code `not-allowed`, "That place isn't one you may check in from. Choose one of your places." The reading's own checks (`no-location`, `inaccurate`) and `no-place` still come first.
- Left out (`undefined` or `null`), everything is exactly as before: the nearest place inside wins.

## Devices (`devices-store.js`)

- **The token:** each browser gets a random 32-hex token on first use (`deviceToken()`, kept in `officeos:device-token`).
- **The label:** short and harmless, from the user agent: "Edge on Windows".
- **Registering:** a device registers when it is first used for a check-in or check-out, at most 2 per employee. A third is refused with code `device-limit` until an Admin resets that person's devices (`resetDevices`, `devices:reset`).
- **Who sees devices:** everyone sees their own (`devicesFor`). An Admin sees anyone's.
- **My devices (L2):** My profile lists your devices ("N of 2"), marks this browser's, warns when this browser is unregistered and the limit is reached, and says that a browser can't prove who uses it. Reading the page makes no token. The Admin's reset is on the user profile (L1).

## Check-in and check-out with a place

`checkInAt(userId, mode, reading, token?, placeId?)` and `checkOutAt(userId, reading, token?, placeId?)` run these steps in order. Nothing is written when one refuses. With a `placeId` (L4) the place check is made against the chosen place and the record names it; without one it is as before. The React Mark attendance passes the chosen place for a check-in, and for a check-out the check-in's place when the reading is inside it (else the nearest place inside, which is flagged when it differs).

1. The place check.
2. The device check.
3. Attendance's own checks, with their own words.
4. Register or touch the device.
5. Write the record with its stamp and `flagged` (see [attendance.md](attendance.md)).

Refusals carry a `code`.

## Storage

Each store writes its key on its first change. Reading never writes, so a page that only reads adds nothing. Old saved data without the new fields loads and behaves as before.

| key | holds |
|---|---|
| `officeos:company-profile` | the company profile |
| `officeos:offices` | offices and assignments |
| `officeos:home-locations` | home-eligible flags, homes, history |
| `officeos:location-changes` | change requests |
| `officeos:devices` | registered devices |
| `officeos:device-token` | this browser's token |

The users page's "Reset demo data" clears all of these back to the seed (L0): `resetLocationData()` calls `resetCompanyProfile`, `resetOffices`, `resetLocations` and `resetAllDevices`. This browser's own device token stays; it isn't demo data.

## Tests

`tests/live`, each in India, UTC and Los Angeles time:

- `company`;
- `offices`;
- `homes`;
- `devices`;
- `places`: the place check;
- `punch14`: check-in and check-out, flags, old data;
- `perms14`: the permissions matrix for all four roles and a manager;
- `chosen` (L4): the chosen place: chosen vs nearest with overlapping places, outside the chosen one, a place that isn't yours, no `placeId` as before, and the records check-in and check-out write.

The React harness `tests/live/react/att3.mjs` (L3) checks in and out with a mocked location: inside, at the radius, just outside, far, bad accuracy, denied, no location, in India, UTC and Los Angeles time; home not set, not home-eligible, a branch, a shared device, the device limit, a flagged check-out; and the place column, Flagged badge and filters on the views.

The React harness `tests/live/react/locs.mjs` (L2) covers My locations, the location changes in the inbox, card, bell, counts and Admin dashboard, My devices, Offices in the sidebar, keyboard, and 412 / 1280 in both themes. Its V section (L4) covers HR's read-only Location changes tab. att3's C and X sections (L4) cover the chosen place with overlapping places and Team attendance's Export.