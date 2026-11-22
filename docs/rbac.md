# RBAC

**Files:** `assets/js/config/roles.js`, `config/permissions.js`, `config/routes.js`, `core/rbac.js`, `core/guard.js`, `core/auth.js`, `data/reporting.js`.

## Roles

| key | label | permissions | landing page | Data scope (as the pages word it) |
|---|---|---|---|---|
| admin | Admin | 119 of 122 (not the three `files` ones: FS1, a ruling item) | dashboard/admin.html | All records |
| hr | HR Manager | 64 | dashboard/hr.html | All records |
| fin | Finance Manager | 56 | dashboard/finance.html | All finance records |
| emp | Employee | 31 (self-service) | dashboard/employee.html | Own records, plus your direct reports if you manage people |
| it | IT | 42 (IT1: nobody seeded) | dashboard/employee.html | Own records, plus IT requests, licences and the asset register |

Roles come from the configuration: they can't be created, edited or deleted in the app (the roles pages say so).

## Permissions

- `module:action` strings, 47 modules, 122 in all (114 before IT1, 105 before AS1, 102 before FS1, 98 before CV1, 94 before SH1, 93 before E1b, 91 before E1, 90 before F1, 88 before P5, 86 before P4, 79 before L0). F1 (2026-11-14) added `attendance:any-office`: check in from any active office, not only your own (the Admin only, through every permission; not overridable), so Admin 91 and the others unchanged. P5 (2026-11-14) added the module `declarations`: `declarations:submit-own` (everyone, self-service: fill in and submit your own tax declaration) and `declarations:manage` (Finance and the Admin: edit anyone's, verify and lock, unlock, set the cutoff). Managers get neither for their team, so Admin 90, HR 49, Finance 42, Employee 24. P4 (2026-11-14) moved `payroll-rules:verify` (the Rates and rules page: verify a row, add a dated row) and `leave-policy:edit` (the Leave policy page: edit the numbers, close a leave year) here from their data modules: Admin only, not overridable, so Admin 88, HR 48, Finance 40, Employee 23.
- Examples: `payroll:create` (prepare a run), `payroll:approve`, `salary:view`, `dashboard:finance`, `users:delete` (Admin only), `pii:view` (bank account and PAN).
- A page needs one permission (`config/routes.js`). A control on a page needs its own, through `data-permission="..."` on the static pages and `perm()` / `useCan()` in the React app.

## Sign-in accounts (E1)

E1 (2026-11-14) added the module `accounts` (see [accounts.md](accounts.md)): `accounts:reset` (Admin and HR: issue someone a reset link or a new temporary password; HR not for an Admin) and `accounts:unlock` (Admin: unlock, disable or enable someone's sign-in). Neither is overridable. Admin 93, HR 50, Finance 42, Employee 24.

The employee record's field rules (who sees, edits and reveals each field) are in `config/employee-fields.js` and `data/employee-record.js`, see [employee-record.md](employee-record.md). The React app also opens a profile to a manager (their direct reports) and Finance; the old site's guard is unchanged.

E1b (2026-11-15) added `accounts:disable` (Admin only, not overridable: stop or allow someone's sign-in); `accounts:unlock` now only unlocks. Admin 94, HR 50, Finance 42, Employee 24.

## Shifts and overtime (SH1)

SH1 (2026-11-15) added `shifts:view`, `shifts:assign` and `shifts:swap-team` to the module `shifts` (beside `shifts:manage`), and the module `overtime` with `overtime:approve`. Everyone holds `shifts:view`, `shifts:swap-team` and `overtime:approve` (self-service: they act only on your direct reports, so only a manager uses them; HR and the Admin decide overtime for people without a manager); HR and the Admin hold `shifts:manage` and `shifts:assign`. None is overridable. Admin 98, HR 54, Finance 45, Employee 27. See [shifts.md](shifts.md). The old site's role editor lists the new module under "Other" (as accounts was, ruled).

## Visits (CV1)

CV1 (2026-11-16) added the module `visits`: `visits:request` (ask for a visit; everyone), `visits:approve` (decide a visit; everyone holds it, and it acts on direct reports only: HR and the Admin decide for people without a manager, as overtime does), `visits:assign` (put a visit on people; everyone holds it: a manager for direct reports, HR and the Admin for anyone) and `visits:view-all` (every visit; HR and the Admin). None is overridable. 98 -> 102 in 43 modules; Admin 102, HR 58, Finance 48, Employee 30. See [attendance.md](attendance.md).

## Stored files (FS1)

FS1 (2026-11-22) added the module `files`: `files:view-expense` (HR, Finance), `files:view-documents` (HR, Finance: bank and tax proof only) and `files:manage-documents` (HR). The Admin role does **not** hold the three (`ADMIN_HELD_BACK`, a ruling item), so the Admin is no longer "every permission": 102 of 105. None is overridable. 102 -> 105 in 44 modules; Admin 102, HR 61, Finance 50, Employee 30. See [files.md](files.md).

## The IT desk (IT1)

IT1 (2026-11-22) added the role `it` (label IT; the designation "IT Engineer" carries it; nobody is seeded with it) and the module `it` (see [it-desk.md](it-desk.md)): `it:requests-create` (everyone), `it:requests-handle`, `it:licences-manage`, `it:account-prepare`, `it:offboard` (IT), `it:approve` and `it:activity-review` (the Admin), `it:licences-view-costs` (Finance, Admin). The IT role also holds AS1's custodian permissions (`assets:manage`, `assets:issue`, `assets:maintain`, `vendors:manage`, `stock:move`; the Admin keeps them as the documented override) and `assets:view-all`, `stock:view`; never a pay, bank, tax, leave-approval, attendance-edit, people, file, account or approval permission. None is overridable. 114 -> 122 in 47 modules; Admin 119, HR 64, Finance 56, Employee 31, IT 42. HR keeps `accounts:reset` for people who already have a sign-in; a new employee's first sign-in details come from IT's approved new-account request (or an Admin's direct flow).

## Assets and stock (AS1)

AS1 (2026-11-22) added nine permissions for the assets and inventory data layer (see [assets.md](assets.md)): `assets:view-all` (HR, Finance), `assets:view-values` (Finance), `assets:manage`, `assets:issue`, `assets:maintain`, `vendors:manage` and the new module `stock` with `stock:view` (HR, Finance) and `stock:move`, and the new module `depreciation` with `depreciation:configure` (Finance). The Admin holds all nine. `assets:manage`, `assets:issue`, `assets:maintain`, `vendors:manage` and `stock:move` are the custodian's: the Admin's only until the IT round's role. `assets:view-own` (everyone, already there) also opens the register's own rows. None is overridable. A manager gets no asset access to the team. 105 -> 114 in 46 modules; Admin 111, HR 63, Finance 54, Employee 30. The role editors list `stock` and `depreciation` under "Other".

## Offices and locations (round 14, in the main list since L0)

Round 14 added seven permissions for its data layer. L0 moved them into `PERMISSIONS`, so the role editor shows them (group "Offices & locations") and the roles list counts them:

| permission | who |
|---|---|
| `offices:view` | everyone (self-service) |
| `offices:manage` | Admin |
| `company:edit` | Admin |
| `locations:set-own` | everyone holds it (self-service); HR's home-eligible flag decides whether it can be used |
| `locations:review` | Admin |
| `devices:view-own` | everyone (self-service) |
| `devices:reset` | Admin |

- `hasPermission(user, permission)` (`config/roles.js`) is now the same check as `permissionsOf(user).includes(permission)`. `LOCATION_PERMISSIONS` and `LOCATION_GRANTS` remain as the round-14 subset.
- None is overridable. Managers get nothing extra.
- L2: only `locations:review` (an Admin) sees and decides location changes in the inbox; HR and managers don't. Offices is in the sidebar for everyone (`offices:view`).

## The check

- `can(permission)` checks the signed-in person's record: their role's permissions with their per-person overrides (round 11R).
- The session holds who is signed in. Since round R6 the role is read from the person's record, not chosen at sign-in.
- **Rules a store enforces itself:**
  - only an Admin may give someone the Admin role (directly, or through a designation that carries it);
  - there is always an Admin;
  - nobody decides their own request.

## Managers

- A manager is anyone a direct report's request would reach: `managerOf()` / `directReportsOf()` / `isManager()` in `data/reporting.js`, the same rule as the approval chains' manager stage.
- Direct reports only. Someone stops being a manager while on leave or inactive; their reports' requests then go to HR.
- Managers see their direct reports' attendance and leave (Manager scoping, 2026-11-09). They don't see pay, assets or exports.

## Not built yet

- Custom roles; editing a role.
- Delegation: the page is a sample.
- A backend check. Every check runs in the browser, so this is a demo, not security.
- The old site's static inventory pages still use their own permissions (`inventory:*`, `assets:assign`, `assets:view`, `vendors:view`). The React pages (AS2, 2026-11-22) use the AS1 ones instead: My assets `assets:view-own`; Inventory, Asset assignment and Vendors `assets:view-all`; Stock movements `stock:view` (see [assets.md](assets.md)). So HR and Finance open four of them in the app where the old pages send them to 403, and an employee given only `inventory:view`, `assets:view` or `vendors:view` still does not open them. No permission was added or moved: 122 in 47 modules, as after IT1.
