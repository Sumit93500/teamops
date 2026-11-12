# Charts

**Files:** `assets/js/data/chart-data.js` (the numbers), `assets/js/ui/chart.js` (the static site's drawing), `app/src/components/Charts.jsx` (the React drawing that ported pages still use: `ColumnChart`, `BarRows`, `NoData`), `app/src/components/charts/` (the design system's charts, D2b, below).

## The contract

One function per chart, and every one returns the same shape:

```js
{ title, unit, labels: [...], series: [{ name, values: [...] }], marks?: [...], period?, empty, emptyReason? }
```

- `labels` and each series' `values` run in the same order. Values are plain numbers (`null` where a point has none), never formatted: the page turns them into bars, words and money.
- `marks` carries what isn't a number (a day off, today still filling in); `period` dates a dated chart.
- `empty` is true when no point has a value. `emptyReason` is `"nobody-expected"` (every day had nobody expected at work) or `"no-records"`. The page then shows "No data in this range." in the chart's place (round 5, ruled).
- Everything is read through the stores' own functions; no rule is decided in chart-data.

## Drawing rules (ruled 2026-11-10)

- **The value readout:** a column chart names a bar's value under it at every width: "Select a bar for its value", or "Tap a bar for its value" on a phone. Each column takes focus.
- **Not by colour alone:** leave is hatched, absent striped across, a missing check-out dotted, a day off hatched the other way.

## The design system's charts (D2b)

**Files:** `app/src/components/charts/`: `Charts.jsx` (main bundle: the frame and `AreaChart`, `BarChart`, `DonutChart`, `IndiaMap`), `plots.jsx` (Recharts, a lazy chunk), `IndiaPlot.jsx` (the map's shapes, a lazy chunk), `patterns.jsx`, `charts.css`. Colours are tokens (`--ds-chart-1..6`, `--ds-seq-1..5`, `--ds-map-*`, see [design.md](design.md)).

Each takes a contract object as `chart` and draws it:

| component | for | options |
|---|---|---|
| `AreaChart` | values over dates or steps; smooth line with a gradient | `dateFilter` + `today`: a FilterBar with the date presets and Clear All |
| `BarChart` | values per label; rounded bars | `horizontal` (long labels), `stacked`; several series are grouped |
| `DonutChart` | shares of one series | the share is printed outside the ring and in the legend |
| `IndiaMap` | one value per state (labels are the map's state names) | five equal steps from 0, a legend with the numbers, zoom in / out / reset, drag when zoomed |

What every chart does:
- **Empty:** "No data in this range." when `empty` is true or the chosen range holds no value.
- **Readout:** a line under the plot, at every width: the point under the pointer, the tapped one, or the one picked with the arrow keys (the plot is one Tab stop; Home / End). Before that: the latest point (area) or the highest (bars, donut, map).
- **Not by colour alone:** lines are solid or dashed; bars and slices carry a pattern per series; the legend names each; the map's states are outlined, a state with no value is hatched, and the value is in the readout, a tooltip and the table.
- **Table:** a data table is always there for screen readers; "Show as table" shows it on screen. It has no `data-export-name`, so a page's Export doesn't pick it up.
- **Calm:** no animation (reduced motion needs nothing more); dark mode through the tokens.

**Keep the lazy chunks lean:** `plots.jsx` and `IndiaPlot.jsx` import only their library and `patterns.jsx` (which imports nothing). Formatters come in as props, and the map draws its own zoom buttons. If a lazy chunk imports an app module, the bundler moves the shared modules and their css (ds.css) into a separate chunk that loads before the old css, and the D2a look changes (D2b's first build did this; the pixel baseline caught it).

**Libraries:** Recharts 3.10.1 (MIT; its dependencies MIT, ISC and BSD-3-Clause) and @svg-maps/india 2.0.0 (MapSVG's map, CC BY 4.0: the map shows the credit under it). The map's shapes predate 2019: Jammu and Kashmir includes Ladakh, and Dadra and Nagar Haveli and Daman and Diu are separate.

**In use:** the Admin dashboard's "Headcount by department" (`BarChart`, horizontal), and every chart and case in `/gallery`. The other dashboard charts move in the restyle sweep. The map has no store data yet (no state on employees): gallery only.

**Checks:** `tests/live/react/charts.mjs` (loading, empty, one point, many points, long labels, negative values, keyboard, phone taps, the map's zoom and keys, the table, dark colours, the Admin headcount against the store).
