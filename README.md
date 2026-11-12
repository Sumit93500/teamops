# TeamOps (OfficeOS)

TeamOps is a role-based internal operations app for a small software company: attendance, leave, payroll, expenses, assets, approvals and access control in one place. Inside the app it calls itself OfficeOS. It is a front-end demo: every record lives in the browser's localStorage, seeded with a fictional company (Northwind Technologies), and there is no backend yet.

## Two sites, one data layer

| site | where | what it is |
|---|---|---|
| **Static site** (live) | repo root: `index.html`, `pages/`, `assets/` | 55 HTML pages, plain ES-module JavaScript, CSS. This is what the live site serves today. |
| **React app** (in progress) | `app/` | A Vite + React 19 app on the same URLs (`/pages/<area>/<page>.html`). It imports the static site's `assets/js` data layer and `assets/css` unchanged. |

Both read and write the same stores (`assets/js/data`) under the same localStorage keys, so a page behaves the same in either. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Run it

**Static site:** serve the repo root over HTTP (ES modules don't load from `file://`):

```bash
python -m http.server 8000
# then open http://localhost:8000/
```

**React app** (Node 22.12 or newer):

```bash
cd app
npm ci
npm run dev        # http://localhost:5173/
npm run build      # app/dist
```

Sign in by picking a demo person on the sign-in page; there are no passwords.

## Tests

```bash
tests/run.cmd          # Windows
sh tests/run.sh        # macOS / Linux
```

Both call `python tools/run-tests.py`. It runs the 143 live suites in three time zones (India, UTC, Los Angeles) and prints `passed / failed (total)` per area. Add `--react` to also build `app/` and run the React harnesses (they need Microsoft Edge). See [tests/TEST-CATALOG.md](tests/TEST-CATALOG.md) for every suite, [tests/index.html](tests/index.html) to search the cases, and [tests/RESULTS.csv](tests/RESULTS.csv) for each round's totals.

## Folders

```text
index.html          the static site's entry (sends you to sign-in or your dashboard)
pages/              the 55 static pages, by area (attendance, leave, payroll, finance, requests, inventory, users, access, ...)
assets/js/          config/ (roles, permissions, routes, nav), core/ (auth, rbac, guard, storage),
                    data/ (the stores and rules), ui/ (DOM helpers), pages/ (one script per page), app.js
assets/css/         tokens, base, layout, components, page styles
app/                the React app (src/pages, src/components, src/shell, src/ui, src/data)
docs/               one short note per area: rbac, attendance, leave, payroll, expenses, assets, charts, deploy, react-app, graph
tests/              live/ (suites that run), archive/ (static-page suites and frozen baselines, one file), cases/, catalog, results
tools/              run-tests.py, gen-docs.py, pack-archive.py
_templates/         the page template the static pages were built from
```

## Status (2026-11-12)

- **React app:** 46 of 55 pages ported (39 signed-in pages and the 7 sign-in and error pages).
- **Not ported yet (9):**
  - users list, user form, user profile and departments (round 15);
  - items, stock movements, asset assignment, vendors and my assets (rounds 17–22, which come after new asset data rules).
- **Not built yet:**
  - a backend and real passwords;
  - offices and locations (round 14);
  - the asset register, depreciation and maintenance (rounds 17–20);
  - the cutover of the live site to the React app (round 28).

In the React app, ten pages are samples (marked on the page), and Settings is a sample apart from its theme choice: delegation, sessions, notifications, reports, audit log, backup, job openings, candidates, announcements and shifts.

Every decision so far is in [DECISIONS.md](DECISIONS.md). Notes for agent sessions are in [CLAUDE.md](CLAUDE.md).

## Role and permission model

| Role | Typical access |
| --- | --- |
| Admin | Full system access, user management, permissions, settings, backups, and platform administration |
| HR | Employee records, role assignments, attendance insights, onboarding and compliance-related workflows |
| Manager | Team dashboards, approvals, attendance, role-based operational tools for assigned teams |
| Employee | Personal profile, attendance, leave, payroll access, and assigned self-service actions |

In the code there are four roles: Admin, HR Manager, Finance Manager and Employee. "Manager" is not a role: anyone with direct reports decides their team's requests (see [docs/rbac.md](docs/rbac.md)).

## Author
- Sumit Yadav
- GitHub: @Sumit93500
- LinkedIn: https://linkedin.com/in/sumit-yadav-423016317
