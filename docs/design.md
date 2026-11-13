# Design system

Built in D2a (2026-11-12). One look across the React app, light and dark. Old pages restyle through the tokens alone; their own CSS is rewritten in a later restyle round.

## Tokens: `app/src/design/tokens.css`

Imported after `assets/css/style.css`. Where a name overlaps (`--color-*`, `--radius-*`, `--shadow-float`, `--transition`), the new value wins. New code uses the `--ds-*` names.

| group | tokens |
|---|---|
| surfaces | `--ds-bg` (page), `--ds-surface-1` (card), `-2` (well), `-3` (raised, hover), `--ds-border`, `--ds-border-strong`, `--ds-border-control` |
| text | `--ds-text`, `--ds-text-2` (secondary), `--ds-text-3` (small print) |
| semantic | `--ds-primary` (the role's colour, or the person's accent), `--ds-success`, `--ds-warning`, `--ds-danger`, `--ds-info`, each with `-soft` |
| hero | `--ds-hero-bg` (dark in both themes), `--ds-hero-text`, `--ds-hero-text-2`, `--ds-hero-line`, `--ds-hero-hatch` |
| type | `--ds-text-xs` 12 to `--ds-text-3xl` 34 px (Inter), weights 400 / 500 / 600 |
| spacing | `--ds-space-1` to `--ds-space-10` (4 px steps) |
| radius | `--ds-radius-sm` 8, `-md` 10, `-lg` 14, `-xl` 18, `-pill` |
| shadow | `--ds-shadow-1` (cards), `-2` (hero), `--ds-shadow-float` (menus) |
| motion | `--ds-fast` 120 ms, `--ds-normal` 200 ms. With `prefers-reduced-motion` both are 0 and every transition finishes at once |
| focus | a 2 px ring in the role colour (`--ds-focus-color`), with a 2 px gap |
| charts (D2b) | `--ds-chart-1` to `-6` (series; each 3:1 or more on every surface), `--ds-chart-ink` (pattern marks), `--ds-chart-grid`, `--ds-seq-1` to `-5` (the map's steps, light to dark), `--ds-map-none`, `--ds-map-edge` (3:1). See [charts.md](charts.md) |

**Contrast:** every text pair is at least 4.5:1, and every field edge, focus ring, knob and chart line at least 3:1 (WCAG AA). That holds in both themes, for every role and accent. It is measured in Edge on the built app by `Target/tools/react/contrast.mjs`; D2a's table is in `Target/shots/shots-D2a/contrast.md`.

## Components: `app/src/components`

| component | file | what |
|---|---|---|
| PageHeader | Layout.jsx | title, breadcrumb, subtitle, actions |
| Card | Layout.jsx | a titled surface: header, body, footer |
| HeroCard | Layout.jsx | the dark glass summary: pills, a big value, a small plot with a hatched band; the band and lines are named in words |
| KpiCard | Layout.jsx | a value and label. The change is an arrow and words ("▲ 3.4% vs last month"); colour only repeats them. An optional mini trend has its own name |
| Pill | Layout.jsx | a rounded label with a tone and an icon |
| FilterBar, DateRange, FilterSelect, FilterSearch | Controls.jsx | the filter row. Date presets are Today, Last 7 days, Last 30 days, This month and Custom, and the range is said in words. Clear All is disabled while nothing is set |
| SelectField | Controls.jsx | a labelled select with an icon, a helper line and a status line (a dot and words) |
| Segmented, Toggle | Controls.jsx | a radio group (one Tab stop, arrow keys) and a switch that says On / Off |
| IconButton, DownloadMenu | Controls.jsx | icon-only, named by `aria-label`. The menu opens on its first item; arrows move, Esc closes |
| AreaChart, BarChart, DonutChart, IndiaMap | charts/Charts.jsx | D2b's charts; the drawing loads on first use. See [charts.md](charts.md) |

The old Tabs, Badge, Table, Modal, Toast and EmptyState keep their behaviour and take the tokens. Tabs gain the arrow, Home and End keys.

Every component is on `/gallery` under "Design foundation".

## Shell and branding

- **Company details:** `app/src/data/company.js` holds them. The Settings page, the shell, About, the tab title and the payslip all read it. OfficeOS doesn't store company settings yet, so these are the Settings page's sample values (ruled 2026-11-12).
- **Brand:** the company's name, or its mark on phones and in the rail, is a link to About (`/pages/company/about.html`). The tab title is "page | company". "Powered by OfficeOS" ends every page, including sign-in and the error pages.
- **The sidebar collapses (S1, desktop only):** a chevron button under the company's mark ("Collapse sidebar" / "Expand sidebar", `aria-expanded`).
  - **Expanded** (240 px): every item's icon and label under its group's heading, the company's name beside its mark, the person's avatar, name and role, and the Approvals count as a pill. A thin scrollbar shows when the list is taller than the window.
  - **Collapsed** (64 px): the rail as before. Icons only, each label as a chip on hover and on keyboard focus, sections open as flyouts, the active item filled, the count a small number on its icon, the brand only its mark (its name stays the link's accessible name). The person's avatar stays in the header.
  - **Default:** expanded from 1280 px, collapsed below it, following the window until the person chooses. The choice is kept in `officeos:sidebar` and applied by the page's head script before the first paint, so nothing flashes. `app/src/shell/navWide.js` and `app/src/design/sidebar.css`.
  - The width moves in 0.2 s, not at all with reduced motion; the content, charts and tables re-measure. At 820 px and below the drawer is unchanged.
  - A1: the person's "Sidebar on a computer" preference comes first (Expanded or Collapsed on every page); "Remember my last choice" (the default) is the rule above.

## Appearance preferences (A1)

One store, `app/src/data/prefs.js`, read and written by the header's Appearance menu, the Appearance page (`/pages/account/appearance.html`, everyone signed in) and Settings > Appearance (the same panel). A change shows everywhere at once, other open tabs included (the storage event).

| preference | choices (default first) | how it applies |
|---|---|---|
| Theme | Light, Dark, Match the device | `data-theme`; Match the device follows the device's setting live |
| Accent colour | My role's colour, Indigo, Blue, Teal, Violet, Slate, Pink | `data-accent` sets `--primary-base`: the header, buttons and links. Charts keep `--ds-chart-*` |
| Density | Comfortable, Compact | `data-density="compact"`: the spacing scale and the padding tokens (`--ds-pad-*`, `--ds-control-h`) shrink |
| Text size | Default, Small, Large | `data-text`: the type scale (`--text-*`, `--ds-text-*`) steps down or up; chart text follows `--ds-text-xs` |
| Sidebar on a computer | Remember my last choice, Expanded, Collapsed | the S1 sidebar's opening state |
| Motion | Follow the device, Always reduce | `data-motion="reduce"`: as the device's reduced-motion setting |

- **Saved per person:** under `officeos:prefs:<employee id>` (before sign-in: `officeos:prefs`, this device's). The theme and accent are also written to the old keys (`officeos:theme`, `officeos:accent`). A person with nothing saved starts from them.
- **Before the first paint:** index.html's head script sets the same attributes, so nothing flashes.
- **Defaults look exactly as before:** at the defaults no density, text or motion attribute is set, and `design/prefs.css` applies nothing.
- **Storage blocked:** every choice still applies for the visit (kept in memory) and the panel says so.
- **The panel:** every choice applies and saves at once and says "Saved". There is no Save button. Reset to default puts every choice back.

## Checks

| check | file | what it covers |
|---|---|---|
| design | `tests/live/react/design.mjs` | branding, About, the public pages, reduced motion |
| gallery | `tests/live/react/gallery.mjs` | sections N and K: the components and the keyboard |
| prefs | `tests/live/react/prefs.mjs` | A1's appearance store: header and Settings in sync, two tabs, per person, Match the device, density and text sizes measured, accent, reset, sidebar default, no flash, blocked storage, keyboard and names, 412 and combinations, contrast for every accent x theme |
| side | `tests/live/react/side.mjs` | S1's sidebar: defaults by width, the toggle and its memory, no flash, labels on focus, every role's items, keyboard, layout at 1440 / 1280 / 1024, contrast, the drawer at 412 |
| pixel baseline | `Target/tools/react/xbase.mjs` (outside the repo) | each round compares the app's own look with D2a's recording |