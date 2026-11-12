# The React app (`app/`)

**Stack:** Vite 8, React 19.3, React Router 7. `npm run dev`, `npm run build`, `npm run preview`.

## Shape

```text
app/src/main.jsx          imports assets/css/style.css, mounts the router
app/src/router.jsx        every page on its old URL behind RequireRoute; PORTED maps a page to its component, else NotPorted
app/src/routes.js         ALL_PAGES from config/routes.js + the 7 public pages; pageUrl("leave/holidays.html")
app/src/data/             bus.js (version counter), hooks.js (useData, useAction, useSession, useCan)
app/src/shell/            Shell, Sidebar (rail + flyouts), Topbar (search, bell, theme menu), phone drawer
app/src/components/       the round 4 components: Table, Basics (StatCard, Badge, PersonCell, Stepper, EmptyState,
                          NotBuilt, Tabs, Reason), Charts (ColumnChart, BarRows, NoData), Modal, Confirm, Decision
app/src/pages/            one component per page
app/src/ui/               Frame, Toast, phone.jsx (phone cards), ApprovalCard (bell + card), perm.js, sample.js,
                          Nodes.jsx (the old-helper bridge, still used on the round 6-9 pages until round 23b)
```

## Rules the rounds follow

- **Parity first.** A ported page shows the same text, controls, rows, toasts and exports as the old page, as every role, at 412 and 1280 px, light and dark. Design changes wait for rounds 25–26.
- **The data layer is imported, never copied.** Writes go through the stores' own functions.
- **Components first.** Pages use the round 4 components. The bridge to old DOM helpers (`ui/Nodes.jsx`) is used only where parity needs it, and each use is listed.
- **Sample pages are JSX components, not raw HTML** (`?raw` only for a large static table, listed). Ten pages are faithful samples.
- **Scope is frozen per round.** New ideas go to the parking lot (outside the repo).

## Status (2026-11-12)

- **Ported:** 46 of 55 pages.
- **Left:** users (round 15) and inventory (rounds 21–22, after the data rounds 17–20).
- **Bundle:** one 954 kB file. Route-level code splitting is planned for round 27.

## Checks

See [../tests/TEST-CATALOG.md](../tests/TEST-CATALOG.md).
- **smoke:** every route × every role, plus signed out.
- **parity harnesses:** one per page group, old page against new route; their shots are compared by pixel.
- **gallery:** the components in both themes.

They live in `tests/live/react/` and run with `python tools/run-tests.py --react`, which needs Microsoft Edge.

The repo run compares against the repo's old pages, so it leaves out the sections where a round gave the new page "No data in this range." and the old page has nothing: attendance's Y (my attendance's earlier months) and payroll's R and V (payroll run, payslip view). Rounds 9b, 11 and 13c ran those against a reference tree with the new wording, outside the repo.
