# Charts

**Files:** `assets/js/data/chart-data.js` (the numbers), `assets/js/ui/chart.js` (the static site's drawing), `app/src/components/Charts.jsx` (the React drawing: `ColumnChart`, `BarRows`, `NoData`).

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

## Not built yet

The graph design from the user's photos (round 25) and the country map (round 24).
