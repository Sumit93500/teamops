# RBAC

**Files:** `assets/js/config/roles.js`, `config/permissions.js`, `config/routes.js`, `core/rbac.js`, `core/guard.js`, `core/auth.js`, `data/reporting.js`.

## Roles

| key | label | permissions | landing page | Data scope (as the pages word it) |
|---|---|---|---|---|
| admin | Admin | all 88 | dashboard/admin.html | All records |
| hr | HR Manager | 48 | dashboard/hr.html | All records |
| fin | Finance Manager | 40 | dashboard/finance.html | All finance records |
| emp | Employee | 23 (self-service) | dashboard/employee.html | Own records, plus your direct reports if you manage people |

Roles come from the configuration: they can't be created, edited or deleted in the app (the roles pages say so).

## Permissions

- `module:action` strings, 39 modules, 88 in all (86 before P4, 79 before L0). P4 (2026-11-14) moved `payroll-rules:verify` (the Rates and rules page: verify a row, add a dated row) and `leave-policy:edit` (the Leave policy page: edit the numbers, close a leave year) here from their data modules: Admin only, not overridable, so Admin 88, HR 48, Finance 40, Employee 23.
- Examples: `payroll:create` (prepare a run), `payroll:approve`, `salary:view`, `dashboard:finance`, `users:delete` (Admin only), `pii:view` (bank account and PAN).
- A page needs one permission (`config/routes.js`). A control on a page needs its own, through `data-permission="..."` on the static pages and `perm()` / `useCan()` in the React app.

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
- The B-4 inventory permissions (round 20).
