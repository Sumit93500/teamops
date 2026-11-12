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

**Contrast:** every text pair is at least 4.5:1, and every field edge, focus ring, knob and chart line at least 3:1 (WCAG AA). That holds in both themes, for every role and accent. It is measured in Edge on the built app by `Target/tools/react/contrast.mjs`; D2a's table is in `Target/shots-D2a/contrast.md`.

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

The old Tabs, Badge, Table, Modal, Toast and EmptyState keep their behaviour and take the tokens. Tabs gain the arrow, Home and End keys.

Every component is on `/gallery` under "Design foundation".

## Shell and branding

- **Company details:** `app/src/data/company.js` holds them. The Settings page, the shell, About, the tab title and the payslip all read it. OfficeOS doesn't store company settings yet, so these are the Settings page's sample values (ruled 2026-11-12).
- **Brand:** the company's name, or its mark on phones and in the rail, is a link to About (`/pages/company/about.html`). The tab title is "page | company". "Powered by OfficeOS" ends every page, including sign-in and the error pages.

## Checks

| check | file | what it covers |
|---|---|---|
| design | `tests/live/react/design.mjs` | branding, About, the public pages, reduced motion |
| gallery | `tests/live/react/gallery.mjs` | sections N and K: the components and the keyboard |
| pixel baseline | `Target/tools/react/xbase.mjs` (outside the repo) | each round compares the app's own look with D2a's recording |