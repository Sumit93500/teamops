# RBAC

**Files:** `assets/js/config/roles.js`, `config/permissions.js`, `config/routes.js`, `core/rbac.js`, `core/guard.js`, `core/auth.js`, `data/reporting.js`.

## Roles

| key | label | permissions | landing page | Data scope (as the pages word it) |
|---|---|---|---|---|
| admin | Admin | all 79 | dashboard/admin.html | All records |
| hr | HR Manager | 45 | dashboard/hr.html | All records |
| fin | Finance Manager | 37 | dashboard/finance.html | All finance records |
| emp | Employee | 20 (self-service) | dashboard/employee.html | Own records, plus your direct reports if you manage people |

Roles come from the configuration: they can't be created, edited or deleted in the app (the roles pages say so).

## Permissions

- `module:action` strings, 33 modules, 79 in all.
- Examples: `payroll:create` (prepare a run), `payroll:approve`, `salary:view`, `dashboard:finance`, `users:delete` (Admin only), `pii:view` (bank account and PAN).
- A page needs one permission (`config/routes.js`). A control on a page needs its own, through `data-permission="..."` on the static pages and `perm()` / `useCan()` in the React app.

## Round 14's permissions (data only, kept apart for now)

Seven new permissions are checked by the data layer through `hasPermission(user, permission)` (`config/roles.js`). They live in `LOCATION_PERMISSIONS` (`config/permissions.js`), each role's share in `LOCATION_GRANTS`:

| permission | who |
|---|---|
| `offices:view` | everyone |
| `offices:manage` | Admin |
| `company:edit` | Admin |
| `locations:set-own` | whoever HR marked home-eligible (a flag, not a role) |
| `locations:review` | Admin |
| `devices:view-own` | everyone |
| `devices:reset` | Admin |

They aren't in `PERMISSIONS` / `ALL_PERMISSIONS` or any role's `permissions` yet. The role editor and roles list draw their matrix and "N of M" counts from those, and this round changes no screen, so the counts above still hold. They aren't overridable. Managers get nothing extra. The page round that adds the screens moves them into `PERMISSIONS`.

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
