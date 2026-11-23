# The IT desk (IT1)

Built in IT1 (2026-11-22): data, rules and permissions. The screens and four rulings on it came in IT2 (2026-11-23), below.

**Files:**

- `assets/js/data/it-rules.js`: types, sensitivity, the state machine, SLA, the separation of duties (pure).
- `data/it-store.js`: the records, and `executionGrant`, the check every credential step makes.
- `data/it-desk.js`: the workflows.
- `data/licences.js`: licences and seats.
- `data/credentials.js`: its request-verified steps.
- `config/roles.js`: the IT role.
- `data/store.js`: the IT department; the deactivation hook.

**Tests:** `tests/live/itdesk.mjs` and `tests/live/itdesk2.mjs` (3 zones), `tests/live/react/it2.mjs` (the screens, in Edge).

**Storage:** `officeos:it-desk` and `officeos:it-licences`, read through `pureBox`, so a read stores nothing.

## The IT role and department

- **The role** `it` (label IT) has 42 permissions:
  - everyone's own (self-service);
  - `it:requests-handle`, `it:licences-manage`, `it:account-prepare`, `it:offboard`;
  - AS1's custodian permissions: `assets:manage`, `assets:issue`, `assets:maintain`, `vendors:manage`, `stock:move`;
  - `assets:view-all` and `stock:view`, to see what it issues.
- **What IT never holds:** pay, bank, tax, leave approval, attendance edits, people (`users:*`, `pii:view`), stored files, accounts or approvals. So IT can't open anyone's profile, salary, bank details, PAN, expense files or documents.
- **The Admin** keeps the custodian permissions too, through every permission: the documented override.
- **Nobody is seeded with the IT role.** The designation "IT Engineer" carries it, which is how the employee form offers it.
- **The IT department** isn't in the seed's department list. It joins the stored list the first time someone is put in it, so every existing list, page and headcount chart stays as it was. The form's department choice offers it meanwhile (`departmentChoices`).

## Permissions

| permission | who | what |
|---|---|---|
| `it:requests-create` | everyone | raise IT tickets and requests for yourself (a manager also for their direct reports) |
| `it:requests-handle` | IT | see and work every IT request |
| `it:approve` | Admin | approve or reject sensitive requests |
| `it:activity-review` | Admin | the review trail |
| `it:licences-manage` | IT | licences and seats |
| `it:licences-view-costs` | Finance, Admin | licence costs |
| `it:account-prepare` | IT | prepare new-account requests (never an Admin account, unless an Admin raised it) |
| `it:offboard` | IT | work offboarding checklists |

None is overridable. 114 -> 122 permissions in 47 modules: Admin 119, HR 64, Finance 56, Employee 31, IT 42.

## Requests

**A request:** `{ id ITR-n, type, requesterId, subjectPersonId, title, details, priority, status, assignedTo, dueAt, createdAt, payload }`.

- Title: 3 to 120 characters. Details: up to 2,000. Notes: 3 to 500. None of them may hold HTML.
- Priority is low, normal, high or urgent. `dueAt` is the creation time plus the priority's SLA hours: 72, 24, 8 and 4 by default. The Admin changes them (`setSlaHours`, whole hours 1 to 720); due dates already set stay.

**Types:** new-account, password-reset, account-unlock, access-request, asset-request, asset-return, software-request, offboarding, it-issue.

**Sensitive** (the Admin approves before anything is carried out):

- new-account, access-request and offboarding, always;
- a password reset or an unlock for an account that holds Admin, HR or Finance.

Non-sensitive requests are carried out by IT alone and still land on the review trail.

**The moves** (`it-rules.js TRANSITIONS`):

| from | may go to |
|---|---|
| open | in progress (when assigned), cancelled |
| in progress | awaiting approval (sensitive), done (not sensitive), cancelled |
| awaiting approval | approved, rejected, cancelled |
| approved | done, cancelled |
| rejected | in progress (back to IT, with the Admin's reason), cancelled |
| done, cancelled | nothing (final) |

**The timeline:** entries `{ at, actorId, kind, note }`, where kind is created, assigned, comment, status, approved, rejected, executed, cancelled or reviewed. They are only ever added.

**Who sees what:**

- whoever raised the request;
- IT (`it:requests-handle`);
- the Admin (`it:approve`).

An employee sees only what they raised, and a manager only what they raised for their reports.

### Separation of duties (in the data layer)

- **Approving:** only `it:approve` (the Admin), never IT. Never the person who raised it, the person it is about, or anyone who worked on it (prepared it, ticked an item, carried out a step).
- **Carrying out:** IT, and only the request's assignee. An Admin only through the **override**: a reason, flagged "admin override" on the trail and audited (`it-override`). An Admin who approved a request can't also carry it out. The new-account hand-over has no override, so the Admin never sees a new person's password.
- **Credential steps check it themselves:**
  - `credentials.js`: `createAccountForRequest`, `resetForRequest`, `unlockForRequest`, `disableForRequest` ask `it-store.js executionGrant` first, so a direct call can't skip the approval;
  - IT holds none of `accounts:*`, so `issueReset`, `unlockAccount`, `setSignInEnabled` and `createAccount` refuse it.

## Account creation by IT, approved by the Admin

1. **HR adds an employee.** The employee form calls `newSignIn`, which opens a new-account request. No credential exists; the profile says "No sign-in details have been made yet". One open request per person. Never for someone who has left or already has a sign-in.
2. **IT is assigned and prepares it** (`prepareNewAccount`): role, work email, department, manager, start date. Each is checked. Never the Admin role, unless an Admin raised the request. IT then submits it.
3. **The Admin decides.**
   - **Approve:** the prepared details are applied to the record, as the Admin. Still no credential.
   - **Reject, with a reason:** the request goes back to IT.
4. **Hand-over:** the IT person who prepared it calls `handOverAccount`, and only then are the temporary password and the 48-hour set-password link made (the existing credentials module: PBKDF2, a hashed link, a forced change at first sign-in). They come back **once**, to that IT person, and nothing secret is kept. The request is done; the trail notes "credential issued" without the secret.

- **An Admin adding an employee** keeps E1's direct flow (`createAccount`). It is flagged "admin override" on the trail, and it cancels any open new-account request for that person.
- **HR calling `createAccount` is refused** (code `needs-it`). A reset can't make a first sign-in either: `issueReset` refuses someone with none (code `none`).
- **The profile's "Make sign-in details"** goes through `newSignIn` too: details for an Admin, a request for HR.

## Other flows

- **Password reset, unlock:** `executeReset` (link or temporary password, returned once), `executeUnlock`. Sensitive when the account holds Admin, HR or Finance; every execution is on the trail.
- **Access requests:** one grantable permission (`OVERRIDABLE`) or a role other than Admin, for yourself or a direct report.
  - IT reviews it and submits it.
  - The Admin's approval applies it through the permission-override mechanism (or the role, through `updateUser`), as the Admin. The request is then done, and the person and the requester are told.
  - IT never changes a permission itself.
- **Assets:** `fulfilAssetRequest` issues an asset through AS1's `issueAsset`; the request closes with the asset's tag. `fulfilAssetReturn` takes back the asset named on the request, only from the person it is about.
- **Software:** `fulfilSoftwareRequest` assigns a seat.
- **General tickets:** `resolveIssue`, with a note.

## Offboarding

**Opening:** when someone is deactivated (their last working day is recorded), `store.js` runs its deactivation hooks, and `it-desk.js` opens their offboarding, with HR or the Admin as the requester. HR or the Admin (`users:deactivate`) or IT (`it:offboard`) can also open one; there is one open per person.

**The checklist:**

| item | how it is done |
|---|---|
| disable sign-in | **sensitive.** Only once the Admin approved the offboarding, on or after the last working day, through `accounts:disable`'s path (`disableForRequest`). Nothing is deleted: the record and its history stay |
| return assets | ticked by IT only when nothing is still with them (the register and stock). Otherwise only the Admin waives it, with a reason, flagged and audited |
| revoke licences | ticked when they hold no seat |
| remove access overrides | removed at the Admin's approval (the override mechanism); ticked after |

Each item records who and when. The offboarding is done only once approved and every item is done or waived.

`exitsWithoutOffboarding` lists people who have left with none on record (Divya Menon, from before IT1).

## Licences

- **A licence:** `{ id LIC-n, software, vendorId, seats, costPerYear, renewalDate, status }`.
- **A seat:** `{ id SEAT-n, licenceId, personId, assignedAt, assignedBy, revokedAt, revokedBy }`. A seat is revoked, never deleted.
- **Rules:** never above the licence's seats; one seat per person per licence; nobody who has left gets one. The seats can't be lowered below those in use.
- **Lists:** renewals within 30 / 60 / 90 days, under-used licences (free seats) and seats held by people who have left.
- **Costs** are value fields: only `it:licences-view-costs` (Finance, Admin) reads them. IT may type one when adding a licence, but can't read it back or change it.
- **The sample:** one licence (Microsoft 365, 10 seats, 4 in use, one of them Divya Menon's), marked sample.

## The Admin's review trail and the notices

**The trail:** every execution, approval, rejection, override, credential issue (never the secret), disable and SLA change, in `itActivity` (filters: kind, actor, person, override, reviewed).

- `markReviewed` sets who and when, once. An Admin's own override is reviewed by someone else.
- `unreviewedCount` gives the dashboard's number.

**Notices:** requesters are told when a request is assigned, approved, rejected and done (`itNoticesFor`, `markNoticeRead`). No email (backend stage).

**The waiting kind** `IT_WAITING_KIND` ("itApprovals"): `pendingItApprovals(viewer)` lists what waits for this Admin's decision. The inbox, the bell, the sidebar count and the Admin dashboard get it, with its card, in the screens round. A kind without a card would break them, so it isn't wired yet.

## The screens (IT2)

The pages are the app's own (not in `config/routes.js`): each carries its guard (`ui/OwnPage.jsx`), from the same rule as `shell/itAccess.js`, which the sidebar and the search use too. The data layer says who may do what; a page draws it. Nothing is decided only on a page.

| page | who | what |
|---|---|---|
| IT dashboard (`it/dashboard.html`) | `it:requests-handle`, the Admin | open, overdue, assigned to you, unassigned, awaiting approval (each opens the list on that view); open requests by type and requests by status as horizontal bars; the overdue and your own lists; people who left with no offboarding |
| IT requests (`it/requests.html`) | the same | every request: filters for type, status, priority, assignee, who raised it, the shared date range ("No data in this range."), a search, the shared counter |
| One request (`it/request.html?id=`) | whoever may see it | details, the immutable timeline, a comment box, and the buttons `availableActions` returns; anyone else is told they can't open it |
| Raise a request (`it/new.html`) | everyone | every type; the desk's words at the field; the due time the priority gives. A new account is not raised here (it opens when HR adds the employee); Offboarding only for `users:deactivate` or `it:offboard` |
| My IT requests (`it/mine.html`) | everyone | only their own, open / finished / all, each with its timeline; what changed since they last looked; Request an asset ends here |
| Licences (`it/licences.html`) | `it:licences-manage`, `it:licences-view-costs` | licences and seats (give, take back), renewals in 30 / 60 / 90 days, seats of people who left, licences with free seats |
| Offboarding (`it/offboarding.html`) | `it:offboard`, the Admin | each checklist, what is still with the person, the buttons, the Admin's waiver; people who left with none |
| IT review trail (`it/review.html`) | `it:activity-review` | the feed with filters, "Reviewed", the unreviewed count and break-glass |
| Complete details (`inventory/complete-details.html`) | `assets:manage` | the imported assets that still lack a purchase date, price, vendor or serial |

**What a request's page offers** (`it-desk.js availableActions`, the one list): comment; assign; prepare (a new account); send to the Admin (a sensitive request, prepared first); approve and reject (the Admin); take it back (after a rejection); cancel (whoever raised it, or IT); the type's own step (reset, unlock, issue an asset, take one back, give a seat, resolve, make the sign-in details, complete the offboarding); for an offboarding tick, disable the sign-in and the Admin's waiver; and the Admin's flagged override of an IT step, drawn apart. A move the state machine or the separation of duties refuses is not offered.

**Sign-in details are shown once.** A hand-over (and an IT reset) returns the secret to the IT person who made it; the page keeps it in its own state only: a panel "Share these sign-in details" with Copy buttons, gone when it is closed or the page is left, never stored, never shown to the Admin (the desk refuses the Admin a hand-over, and the Admin's page has no panel).

**The IT approvals kind** (`itApprovals`, `data/waiting.js`): the Approvals inbox (pending, approved, rejected), the approval card, the bell's list, the sidebar's count and the Admin dashboard's list all count it from one place, once each. Approve asks for an optional note; Reject needs a reason. **Updates on your own requests** (assigned, approved, rejected, done) are in the bell under "Your IT requests", counted apart ("Waiting for you: 0, 1 new update on your IT requests"), and on My IT requests.

## Rulings built in IT2

1. **HR no longer resets passwords directly.** `accounts:reset` is the Admin's (HR holds one permission fewer). HR's "reset password" on a profile is "Ask IT to reset the password": `openPasswordReset` raises a password-reset request (one open per person). The Admin keeps the direct reset: audited as before and now **flagged "admin override" on the review trail** (never the secret).
2. **Break-glass.** A sensitive request about or raised by an Admin needs a different Admin. When only one Admin exists, that Admin may approve it with a written reason of at least 20 characters (`approveRequest(..., { breakGlass })`; `needsBreakGlass` tells a dialog to ask). It is flagged `breakGlass` on the trail, listed on the Admin dashboard (`breakGlassOpen`) until another Admin marks it reviewed (not the one who approved it), and a banner recommends a second Admin (`soleAdmin`). A second Admin, a non-Admin and IT never get it; rejecting your own isn't break-glass.
3. **The old asset-request chain is closed** (manager, then an Admin, then fulfilment): "Request an asset" makes only the IT request; the chain's waiting kind is no longer counted or shown and its approval steps are gone from the inbox, card, bell and sidebar. Its history is still readable in My requests (with "This old process is closed"); its store is untouched, and every existing record reads byte for byte as before.
4. **Complete details**: `detailsToComplete` lists the imported assets and which of the four fields (purchase date, price, vendor, serial) each lacks; `completeDetails` fills them with Edit's own validation (the price needs `assets:view-values`; a filled field is refused; nothing outside the four). Each field is its own flag; the "Details missing" label goes once the date and price are in. **Access cards are stock items, not fixed assets** (`STOCK_ONLY_CATEGORIES`): the register and an asset request refuse the category and say so; existing records, the imported access cards included, are not changed.

**Choices where the brief was silent:** the break-glass approval can't be reviewed by the Admin who made it (so it stays on the dashboard while there is only one Admin); a rejection is never break-glass; the dashboards' response times are shown but changing them (`setSlaHours`) has no screen yet; the bell's updates are marked read by opening them.

## Not built yet

- **The role's colour** (tokens). The IT role lands on the employee dashboard; the IT dashboard is in its sidebar.
- **A screen for the response times** (`setSlaHours` has no page), and email (backend stage).
- **The old static site:** it is frozen, and its roles list still shows four roles. Its user form, which reads the same designations, offers "IT Engineer".
- **Email, and a server owning accounts, approvals and the trail** (backend stage).
