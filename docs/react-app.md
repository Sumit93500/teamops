# The React app (`app/`)

**Stack:** Vite 8, React 19.3, React Router 7. `npm run dev`, `npm run build`, `npm run preview`.

## Shape

```text
app/src/main.jsx          imports assets/css/style.css, then design/tokens.css + design/shell.css (D2a), mounts the router
app/src/router.jsx        every page on its old URL behind RequireRoute; PORTED maps a page to its component, else NotPorted;
                          /pages/company/about.html (About, D2a), /pages/company/offices.html (Offices, L1) and /gallery
                          are the app's own
app/src/routes.js         ALL_PAGES from config/routes.js + the 7 public pages; ABOUT; pageUrl("leave/holidays.html")
app/src/design/           tokens.css (the design system's tokens, see design.md), shell.css
app/src/data/             bus.js (version counter), hooks.js (useData, useAction, useSession, useCan), company.js (the
                          company's details: Settings, the shell, About, the tab title and the payslip read them)
app/src/shell/            Shell, Sidebar (rail + flyouts), Topbar (search, bell, theme menu), phone drawer, Brand (the
                          company's mark, "Powered by OfficeOS")
app/src/components/       the round 4 components: Table, Basics (StatCard, Badge, PersonCell, Stepper, EmptyState,
                          NotBuilt, Tabs, Reason), Charts (ColumnChart, BarRows, NoData), Modal, Confirm, Decision;
                          D2a's: Layout (PageHeader, Card, HeroCard, KpiCard, Pill), Controls (FilterBar, DateRange,
                          FilterSelect, FilterSearch, SelectField, Segmented, Toggle, IconButton, DownloadMenu), icons;
                          D2b's charts/ (AreaChart, BarChart, DonutChart, IndiaMap; drawing in lazy chunks, see charts.md)
app/src/pages/            one component per page
app/src/ui/               Frame, Toast, phone.jsx (phone cards), ApprovalCard (bell + card), perm.js, sample.js,
                          Nodes.jsx (the old-helper bridge, still used on the round 6-9 pages until round 23b)
```

## Rules the rounds follow

- **Parity first.** A ported page shows the same text, controls, rows, toasts and exports as the old page, as every role, at 412 and 1280 px, light and dark.
- **From D2 on, pixels follow the design system, not the old site.** Text, behaviour and role access still match the old pages. The pixel reference is the app's own baseline, recorded after D2a (`Target/tools/react/xbase.mjs`). See [design.md](design.md).
- **The data layer is imported, never copied.** Writes go through the stores' own functions.
- **Components first.** Pages use the round 4 components. The bridge to old DOM helpers (`ui/Nodes.jsx`) is used only where parity needs it, and each use is listed.
- **Sample pages are JSX components, not raw HTML** (`?raw` only for a large static table, listed). Ten pages are faithful samples.
- **Scope is frozen per round.** New ideas go to the parking lot (outside the repo).

## Status (2026-11-12)

- **Ported:** 50 of 55 pages. L1 ported the four users pages (list, form, profile, departments) straight into the design system:
  same text, behaviour and role access as the old pages, new look. The form adds the employee's office and home check-in; the
  profile adds check-in places and devices (Admin reset).
- **New screens (L1):** Offices (everyone reads; an Admin adds branches, edits, deactivates, moves people; the position from
  this device or typed), Settings' Company profile (Admin), About with the overview, mission and offices; the sign-in and
  error pages end with "© <year> <company> · Powered by OfficeOS".
- **New screens (L2):** My locations (`/pages/account/my-locations.html`: your office, your homes set once, change requests, history),
  location changes in the approvals inbox, card, bell, sidebar count and Admin dashboard (`app/src/data/waiting.js`), My devices
  and check-in places on My profile, and Offices in the sidebar's Attendance section for every role (`app/src/shell/appNav.js`).
- **L3:** Mark attendance in the design system with the place check (Check-In From, Use my location, distance and radius, the
  device, one big button, a flagged check-out asked first); a Place column, Flagged badge and filter on My attendance and Team
  attendance; the HR dashboard's Flagged check-ins.
- **L4:** Mark attendance passes the chosen place to the store (the record names it; overlapping places no longer mislabel);
  HR's read-only Location changes tab in the approvals inbox (no buttons, no count); Team attendance's Export with Place and
  Flagged columns.
- **S1:** the desktop sidebar collapses and expands (expanded from 1280 px by default, collapsed below; the choice is
  remembered and applied before the first paint). See [design.md](design.md#shell-and-branding).
- **The repo's layout (O1, 2026-11-13):** unchanged. `assets/`, `pages/`, `app/`, `tests/`, `tools/`, `docs/`, `_templates/` and
  the root `index.html` stay where they are: the harnesses, the gate, the baselines and the live site read these paths. The
  old static site retires at cutover (round 28); the final layout is decided then. Notes, shots and the round tooling
  live outside the repo, in the workspace (its `README.md` maps the folders).
- **A1:** appearance preferences in one store (theme, accent, density, text size, sidebar default, motion), saved per
  person, synced between the header's menu, the new Appearance page (for everyone) and Settings > Appearance, and across
  tabs; applied before the first paint. See [design.md](design.md#appearance-preferences-a1).
- **A2:** a person with nothing saved starts at the defaults (the theme follows the device), not at the previous person's
  theme and accent; the old browser-wide keys carry over once, to whoever is signed in at the first load after the update.
- **P4a (2026-11-14):** the pay screens use the new engine from the statutory rules start month (Settings > Payroll, default 2026-11; months before it are exactly as they were). Payslip and payslip view (template earnings, PF / ESI / PT / LWF / TDS, the regime, "Rules as of", the Unverified note, the employer contributions box for the person themself and anyone with payslips:view, never a manager's view of a report); the salary page (the components table is the salary templates, with Admin edits; a person's template, cost to company, regime and old-regime declaration); the payroll run (State, PF, ESI, PT, LWF, TDS, Employer cost, statutory totals, challans still samples); the tax page and My payslips (how this year's TDS is worked out, Compare regimes); the new Rates and rules page (`/pages/payroll/rates-rules.html`: Finance reads, Admin verifies and adds dated rows). See [payroll.md](payroll.md#p4a).
- **L5:** Team attendance's export says why a day is flagged ("Yes: checked out from a different place"), "No" otherwise.
- **E0:** the Add / Edit employee form by sections (Personal, Contact, Employment, Pay and tax, Role and access, Review),
  per-section checks, a leave guard, the profile's Edit links into a section. The same fields, rules and permissions; the
  fields a complete form still needs are listed in the workspace's notes/react-parking-lot.md (E1).
- **Left:** inventory (rounds 21–22, after the data rounds 17–20).
- **Bundle:** what loads first is one 1,090 kB file (L1; 1,013 kB at D2b); the charts' drawing (Recharts, 418 kB) and the map (179 kB) load on first use. Route-level code splitting is planned for round 27.

## Checks

See [../tests/TEST-CATALOG.md](../tests/TEST-CATALOG.md).
- **smoke:** every route plus About, as every role and signed out.
- **parity harnesses:** one per page group, old page against new route (text, controls, behaviour).
- **gallery:** the components in both themes, with the design foundation's components and their keyboard use.
- **design:** the company branding, About, the sign-in and error pages, and reduced motion.
- **charts:** the D2b charts and map in the gallery (cases, keyboard, phone taps, zoom, table) and the Admin headcount chart.
- **users:** E0's sectioned form (S: sections, checks, Review, Create, Edit at a section, the leave guard, 412 / 1280,
  contrast); L1's users pages against the old ones (role access, every cell, field and flow, read by meaning, not by CSS), and the
  new screens: offices (with a mocked device location), company profile, About, the public pages' footer, keyboard, 412 / 1280.
- **att3:** L3's check-in with a place, mocked locations in three time zones, devices, places, flagged check-outs, the views;
  L4's chosen place with overlapping places (C) and Team attendance's Export (X).
- **locs:** L2's new screens: My locations (set once, change, cancel, with a mocked location), location changes decided by an
  Admin (inbox, card, bell, counts, dashboard), HR and managers deciding none, HR's read-only Location changes tab (V, L4),
  My devices, keyboard, 412 / 1280, light and dark.
- **pay4:** P4a's pay screens under the new statutory rules (payslip with the employer box and who sees it, the start-month boundary, payslips list and the tax explanation, payroll run, salary templates / CTC / regime / declaration, Rates and rules: filters, verify, add a row, Settings > Payroll, keyboard, contrast).
- **prefs:** A1's appearance preferences (sync, tabs, per person, sizes measured, reset, no flash, blocked storage, contrast), and A2's (N: two people on one browser, the carry-over once, defaults for a new person, the device's theme).
- **side:** S1's collapsible sidebar (defaults, toggle, memory, no flash, labels on focus, roles, keyboard, layout, contrast).

They live in `tests/live/react/` and run with `python tools/run-tests.py --react`, which needs Microsoft Edge.

The repo run compares against the repo's old pages, so it leaves out the sections where a round gave the new page "No data in this range." and the old page has nothing: attendance's Y (my attendance's earlier months) and payroll's R and V (payroll run, payslip view). Rounds 9b, 11 and 13c ran those against a reference tree with the new wording, outside the repo.
