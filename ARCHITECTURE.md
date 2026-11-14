# Architecture

## Layers

```text
assets/js/config   roles.js, permissions.js, routes.js, nav.js      what exists and who may do what
assets/js/core     auth.js, rbac.js, guard.js, storage.js, paths.js the session, can(), page guards, localStorage
assets/js/data     *-store.js (records) + rule files (payroll.js, expenses.js, inventory.js, holidays.js, chart-data.js ...)
assets/js/ui       DOM helpers for the static pages (tables, charts, dialogs, phone cards, exports)
assets/js/pages    one script per static page
pages/*.html       the static pages                              app/src   the React app, on the same URLs
```

Nothing in `config/`, `core/`, `data/` or `ui/` touches `window`, `document` or localStorage when it is imported; every DOM or storage access is inside a function. That is why the React app can import them as they are.

## The data layer (`assets/js/data`)

- **Stores keep records in localStorage** under `officeos:<key>`, through `data/collection.js`: `{ version, nextNum, records }`. A missing or older box is seeded again.
- **Reads return deep copies**, so a caller can't change a record by accident.
- **Writes validate, save and return a result**: `{ ok, record }` or `{ ok: false, error, field }`. A page shows `error` under `field`.
- **Derived figures are never stored.** Leave balances, attendance status, a stock level and a month's pay are worked out from the records on each read, so they can't drift. Approved payroll runs are the exception: they fix their figures.
- **Rules are plain functions with no storage and no clock:** `payroll.js` (earnings, PF, professional tax, TDS), `expenses.js` (categories, approval stages), `inventory.js`, `holidays.js` (date maths in UTC on whole days).
- **No store has a change event.** The React app adds one (below).

Area notes: [docs/attendance.md](docs/attendance.md), [docs/leave.md](docs/leave.md), [docs/payroll.md](docs/payroll.md), [docs/expenses.md](docs/expenses.md), [docs/assets.md](docs/assets.md), [docs/charts.md](docs/charts.md).

## How the React app uses it

`app/src/data/` wraps the stores; it doesn't replace them.
- `bus.js`: a version counter. A successful write bumps it, and a `storage` event from another tab does too.
- `hooks.js`:
  - `useData(read, deps)` re-reads through the store's own function whenever the version changes;
  - `useAction(write)` calls the store's write unchanged and bumps the bus when it worked;
  - `useSession()` and `useCan(permission)` read `core/auth.js` and `core/rbac.js`.

Pages import the stores directly (`../../../assets/js/data/...`). Vite bundles them, with `fs.allow: [".."]`. See [docs/react-app.md](docs/react-app.md).

## RBAC

- **Four roles** (`config/roles.js`): Admin, HR Manager, Finance Manager and Employee.
- **91 permissions** in 40 modules (`config/permissions.js`), each a `module:action` string. Admin holds all 91, HR 49, Finance 42 and Employee 24 (F1 added `attendance:any-office`, Admin only).
- **`can(permission)`** (`core/rbac.js`) checks the signed-in person's permissions on record: their role's, plus any per-person overrides. It is the only check pages use.
- **Each page needs one permission** (`config/routes.js`, 48 signed-in pages). `core/guard.js` sends a person without it to 403. The React app's `RequireRoute` does the same.
- **Being a manager is a relationship, not a role.** Someone is a manager when a request from a direct report would reach them (`data/reporting.js`, `managerFor()` in `leave-store.js`). Managers see their direct reports' attendance and leave, and decide the manager stage of their requests. Direct reports only.

More: [docs/rbac.md](docs/rbac.md).

## Routes

Every page keeps its URL, `/pages/<area>/<page>.html`, in both sites. `config/routes.js` names each page and the permission it needs. `config/nav.js` builds the sidebar and search from the same keys. Seven pages need no sign-in: login, forgot and reset password, two-factor, and the 403, 404 and 500 pages.

## Charts

Each chart's numbers come from one function in `data/chart-data.js` that returns `{ title, unit, labels, series: [{ name, values }], marks?, period?, empty, emptyReason }`. Values are plain numbers; drawing them (bars, words, money) is the page's job. A chart with nothing in range has `empty: true` and shows "No data in this range." See [docs/charts.md](docs/charts.md).

## Deploy

- **The live static site** is a Render static site (`teamops-eh3c.onrender.com`) that publishes the repo root. Render's build filter ignores `app/**`, so a push that changes only `app/` doesn't redeploy it.
- **The React app** builds with `npm ci && npm run build` in `app/` into `app/dist`. At cutover (round 28) the same service switches to publish it.
- **Cloudflare** in front may serve a cached HTML page for up to 5 minutes after a deploy.

See [docs/deploy.md](docs/deploy.md).

## The rule for data rounds

The React rounds change only `app/`; `assets/` and `pages/` stay byte for byte as they were, and each round proves it by hash. A round that must change the data layer (a "data round": 5, 14, 17–20) changes `assets/js` **additively only**: new fields, functions and stores, with every existing record and behaviour kept, because the live static site still runs on it. Those rounds run the full suite set before and after.
