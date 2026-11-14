// The design system's charts (D2b): AreaChart, BarChart, DonutChart and IndiaMap, each drawing the chart-data contract
// (assets/js/data/chart-data.js): { title, unit, labels, series: [{ name, values }], empty, emptyReason }.
// This file stays in the main bundle and is small: the frame (readout, legend, "Show as table", the empty state). The drawing
// is loaded on first use, in its own chunks: plots.jsx (Recharts) and IndiaPlot.jsx (the map's shapes).
// Every chart:
//   - says "No data in this range." when the contract is empty (or a chosen date range holds no value);
//   - has a readout line under the plot at every width: the point under the pointer, the tapped one, or the one picked with
//     the arrow keys (the plot is one Tab stop); before that, the latest (area) or highest (bars, donut, map) point;
//   - never tells series apart by colour alone: lines are solid or dashed, fills carry a pattern, the legend names each;
//   - has an accessible name, and a data table (screen readers always have it; "Show as table" shows it on screen);
//   - draws without animation (calm, and nothing to wait for with reduced motion), in the theme's colours.
import { lazy, Suspense, useId, useMemo, useState } from "react";
import { NO_DATA } from "../Basics.jsx";
import { FilterBar, DateRange } from "../Controls.jsx";
import { ICON, Icon } from "../icons.jsx";
import { formatDay, monthShort } from "../../../../assets/js/ui/leave-view.js";
import { Swatch, cleanId } from "./patterns.jsx";
import "./charts.css";

const AreaPlot = lazy(() => import("./plots.jsx").then((m) => ({ default: m.AreaPlot })));
const BarPlot = lazy(() => import("./plots.jsx").then((m) => ({ default: m.BarPlot })));
const DonutPlot = lazy(() => import("./plots.jsx").then((m) => ({ default: m.DonutPlot })));
const IndiaPlot = lazy(() => import("./IndiaPlot.jsx"));

// ---------- words for numbers and labels ----------
const nf = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
export function withUnit(v, unit) {
  if (v == null || Number.isNaN(v)) return "no value";
  const n = nf.format(v);
  if (!unit) return n;
  if (unit === "%") return `${n}%`;
  if (unit === "₹") return `₹${n}`;
  return `${n} ${Math.abs(v) === 1 && unit.endsWith("s") ? unit.slice(0, -1) : unit}`;
}
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;   // F1: a month ("2026-11") reads "Nov 2026"
export const labelText = (l) => (ISO.test(String(l)) ? formatDay(l, false) : MONTH.test(String(l)) ? `${monthShort(`${l}-01`)} ${String(l).slice(0, 4)}` : String(l));
// F1: two months in words, the year once when they share it: "Jun – Nov 2026", "Sep 2026 – Feb 2027"
export function monthSpan(from, to) {
  const [a, b] = [labelText(from), labelText(to)];
  return String(from).slice(0, 4) === String(to).slice(0, 4) ? `${a.slice(0, -5)} – ${b}` : `${a} – ${b}`;
}
const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

// ---------- the frame ----------
// keyed: the active point is an index (arrow keys step through 0..count-1); a map passes keyed={false} and moves focus itself.
function Frame({ id, label, summary, empty, above, legend, table, describe, initial, initialWord, count, keyed = true, footnote, className = "", children }) {
  const rid = cleanId(useId());
  const [active, setActive] = useState(null);
  const [showTable, setShowTable] = useState(false);
  if (empty) {
    return (
      <div className={`ds-chart ds-chart--empty ${className}`} id={id} data-chart={label}>
        {above}
        <div className="ds-chart__empty" role="status" data-no-data=""><Icon d={ICON.pulse} /><span>{NO_DATA}</span></div>
      </div>
    );
  }
  const onKeyDown = (e) => {
    if (!keyed) return;
    const cur = active ?? initial ?? 0;
    const to = { ArrowRight: cur + 1, ArrowDown: cur + 1, ArrowLeft: cur - 1, ArrowUp: cur - 1, Home: 0, End: count - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    setActive(Math.min(count - 1, Math.max(0, to)));
  };
  const readout = active != null ? describe(active) : initial != null ? `${initialWord}: ${describe(initial)}` : "";
  return (
    <div className={`ds-chart ${className}`} id={id} data-chart={label}>
      {above}
      <div className="ds-chart__plot" role="group" aria-roledescription="chart" aria-label={summary} aria-describedby={`${rid}-readout`}
        tabIndex={keyed ? 0 : undefined} onKeyDown={onKeyDown} onFocus={(e) => { if (keyed && e.target === e.currentTarget && active == null) setActive(initial ?? 0); }}>
        <Suspense fallback={<div className="ds-chart__loading">Loading the chart…</div>}>
          {children({ active, setActive, prefix: rid })}
        </Suspense>
      </div>
      <div className="ds-chart__foot">
        <p className="ds-chart__readout" id={`${rid}-readout`} aria-live="polite">{readout}</p>
        <button type="button" className="ds-chart__toggle" aria-pressed={String(showTable)} onClick={() => setShowTable((s) => !s)}>
          <Icon d={ICON.table} />Show as table
        </button>
      </div>
      {legend && <ul className="ds-chart__legend" aria-label="Legend">{legend(rid)}</ul>}
      {footnote && <p className="ds-chart__credit">{footnote}</p>}
      <div className={showTable ? "ds-chart__table-wrap" : "visually-hidden"}>
        <table className="ds-chart__table">
          <caption>{label}</caption>
          <thead><tr>{table.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, k) => (k ? <td key={k}>{c}</td> : <th key={k} scope="row">{c}</th>))}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

// The contract's rows: [{ label, s0, s1, ... }] for the points given (indexes into labels).
const rowsOf = (chart, idx) => idx.map((i) => Object.fromEntries([["label", chart.labels[i]], ...chart.series.map((s, k) => [`s${k}`, s.values[i] ?? null])]));
const hasValue = (row, n) => Array.from({ length: n }, (_, k) => row[`s${k}`]).some((v) => v != null);
const pointWords = (chart, row) => `${labelText(row.label)}: ${chart.series.map((s, k) => (chart.series.length > 1 ? `${s.name} ${withUnit(row[`s${k}`], chart.unit)}` : withUnit(row[`s${k}`], chart.unit))).join(", ")}`;
const seriesTable = (chart, data, labelHeader) => ({
  head: [labelHeader, ...chart.series.map((s) => (chart.unit && chart.unit !== "%" && chart.unit !== "₹" ? `${s.name} (${chart.unit})` : s.name))],
  rows: data.map((r) => [labelText(r.label), ...chart.series.map((s, k) => (r[`s${k}`] == null ? "–" : withUnit(r[`s${k}`], chart.unit === "%" || chart.unit === "₹" ? chart.unit : "")))]),
});
const lineLegend = (chart) => (chart.series.length > 1 ? (p) => chart.series.map((s, k) => <li key={s.name}><Swatch index={k} line prefix={p} />{s.name}</li>) : null);
const fillLegend = (chart) => (chart.series.length > 1 ? (p) => chart.series.map((s, k) => <li key={s.name}><Swatch index={k} prefix={p} />{s.name}</li>) : null);

// ---------- AreaChart ----------
// dateFilter: the labels are ISO dates; a FilterBar above picks a range (presets, Custom) with Clear All. today: ISO, the
// presets' end.
export function AreaChart({ chart, id, label = chart.title, height = 260, dateFilter = false, today, labelHeader = "Date" }) {
  const [range, setRange] = useState({ preset: "", from: "", to: "" });
  const idx = useMemo(() => chart.labels.map((_, i) => i).filter((i) => !range.preset || !range.from || !range.to || (chart.labels[i] >= range.from && chart.labels[i] <= range.to)), [chart, range]);
  const data = useMemo(() => rowsOf(chart, idx), [chart, idx]);
  const n = chart.series.length;
  const empty = Boolean(chart.empty) || !data.some((r) => hasValue(r, n));
  const last = data.map((r, i) => (hasValue(r, n) ? i : -1)).filter((i) => i >= 0).at(-1);
  const above = dateFilter ? (
    <FilterBar label={`${label}: date range`} active={Boolean(range.preset)} onClearAll={() => setRange({ preset: "", from: "", to: "" })}>
      <DateRange value={range} onChange={setRange} today={today} />
    </FilterBar>
  ) : null;
  const span = data.length ? `${labelText(data[0].label)} to ${labelText(data.at(-1).label)}` : "";
  return (
    <Frame id={id} label={label} empty={empty} above={above} className="ds-chart--area" count={data.length} initial={last} initialWord="Latest"
      summary={`${label}: area chart, ${data.length} ${data.length === 1 ? "point" : "points"}${span ? `, ${span}` : ""}; ${chart.series.map((s) => s.name).join(" and ")}. Arrow keys read each point.`}
      describe={(i) => pointWords(chart, data[i])} legend={lineLegend(chart)} table={seriesTable(chart, data, labelHeader)}>
      {({ active, setActive, prefix }) => <AreaPlot data={data} series={chart.series} unit={chart.unit} active={active} onActive={setActive} height={height} prefix={prefix} labelText={labelText} />}
    </Frame>
  );
}

// ---------- BarChart ----------
// horizontal: bars run left to right with the labels beside them (long names); stacked: series on top of each other.
// latest (F1): the labels are in time order (months), so the readout starts at the latest point with a value, not the highest.
export function BarChart({ chart, id, label = chart.title, height, horizontal = false, stacked = false, labelHeader = "Item", latest = false }) {
  const data = useMemo(() => rowsOf(chart, chart.labels.map((_, i) => i)), [chart]);
  const n = chart.series.length;
  const empty = Boolean(chart.empty) || !data.some((r) => hasValue(r, n));
  const totals = data.map((r) => chart.series.reduce((t, _, k) => t + (r[`s${k}`] ?? 0), 0));
  const top = totals.indexOf(Math.max(...totals));
  const last = data.map((r, i) => (hasValue(r, n) ? i : -1)).filter((i) => i >= 0).at(-1);
  const h = height ?? (horizontal ? Math.max(120, data.length * (n > 1 && !stacked ? 18 * n + 14 : 34) + 40) : 260);
  return (
    <Frame id={id} label={label} empty={empty} className="ds-chart--bar" count={data.length} initial={latest ? last ?? null : top >= 0 ? top : null} initialWord={latest ? "Latest" : "Highest"}
      summary={`${label}: ${stacked ? "stacked " : n > 1 ? "grouped " : ""}bar chart, ${data.length} ${data.length === 1 ? "bar" : "bars"}${n > 1 ? ` of ${chart.series.map((s) => s.name).join(" and ")}` : ""}. Arrow keys read each bar.`}
      describe={(i) => pointWords(chart, data[i]) + (stacked && n > 1 ? `; total ${withUnit(totals[i], chart.unit)}` : "")}
      legend={fillLegend(chart)} table={seriesTable(chart, data, labelHeader)}>
      {({ active, setActive, prefix }) => <BarPlot data={data} series={chart.series} unit={chart.unit} active={active} onActive={setActive} height={h} horizontal={horizontal} stacked={stacked} prefix={prefix} labelText={labelText} withUnit={withUnit} />}
    </Frame>
  );
}

// ---------- DonutChart ----------
// One series; each slice's share is printed outside the ring and in the legend.
export function DonutChart({ chart, id, label = chart.title, height = 280, labelHeader = "Item" }) {
  const values = chart.series[0]?.values ?? [];
  const data = useMemo(() => chart.labels.map((l, i) => ({ label: l, value: values[i] ?? 0 })).filter((d) => d.value > 0), [chart, values]);
  const total = data.reduce((t, d) => t + d.value, 0);
  const empty = Boolean(chart.empty) || total === 0;
  const top = data.reduce((b, d, i) => (d.value > (data[b]?.value ?? -Infinity) ? i : b), 0);
  const words = (i) => `${labelText(data[i].label)}: ${withUnit(data[i].value, chart.unit)} (${nf.format(pct(data[i].value, total))}%)`;
  return (
    <Frame id={id} label={label} empty={empty} className="ds-chart--donut" count={data.length} initial={top} initialWord="Largest"
      summary={`${label}: donut chart, ${data.length} parts, ${withUnit(total, chart.unit)} in all. Arrow keys read each part.`}
      describe={words}
      legend={(p) => data.map((d, k) => <li key={d.label}><Swatch index={k} prefix={p} />{labelText(d.label)} <span className="ds-chart__legend-num">{`${nf.format(pct(d.value, total))}%`}</span></li>)}
      table={{ head: [labelHeader, chart.unit && chart.unit !== "%" && chart.unit !== "₹" ? `${chart.series[0]?.name ?? "Value"} (${chart.unit})` : chart.series[0]?.name ?? "Value", "Share"],
        rows: data.map((d) => [labelText(d.label), withUnit(d.value, chart.unit === "₹" ? "₹" : ""), `${nf.format(pct(d.value, total))}%`]) }}>
      {({ active, setActive, prefix }) => <DonutPlot data={data} total={total} unit={chart.unit} active={active} onActive={setActive} height={height} prefix={prefix} withUnit={withUnit} />}
    </Frame>
  );
}

// ---------- IndiaMap ----------
// labels are state or union-territory names as the map names them (see IndiaPlot.jsx: STATE_NAMES); one series. Colour steps:
// five equal bands from 0 to a round maximum, in the legend with their numbers; a state with no value is hatched ("No data").
function niceStep(x) {
  if (x <= 1) return 1;
  const p = 10 ** Math.floor(Math.log10(x));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= x);
}
export function IndiaMap({ chart, id, label = chart.title, labelHeader = "State" }) {
  const values = chart.series[0]?.values ?? [];
  const byName = useMemo(() => new Map(chart.labels.map((l, i) => [l, values[i]]).filter(([, v]) => v != null)), [chart, values]);
  const max = Math.max(0, ...byName.values());
  const step = niceStep(Math.ceil(max / 5));
  const bands = Array.from({ length: 5 }, (_, i) => [i ? i * step + (Number.isInteger(step) ? 1 : 0) : 0, (i + 1) * step]);
  const bandOf = (v) => (v <= 0 ? 0 : Math.min(4, Math.ceil(v / step) - 1));
  const empty = Boolean(chart.empty) || byName.size === 0;
  const sorted = [...byName.entries()].sort((a, b) => b[1] - a[1]);
  const words = (name) => (byName.has(name) ? `${name}: ${withUnit(byName.get(name), chart.unit)}` : `${name}: no data`);
  return (
    <Frame id={id} label={label} empty={empty} className="ds-chart--map" keyed={false} count={0} initial={sorted[0]?.[0] ?? null} initialWord="Highest"
      summary={`${label}: map of India, ${byName.size} ${byName.size === 1 ? "state" : "states"} with data. Tab to a state, then the arrow keys move between states.`}
      describe={words} footnote="Map shapes: MapSVG, CC BY 4.0 (the @svg-maps/india package)."
      legend={(p) => [
        ...bands.map(([lo, hi], i) => <li key={i}><span className="ds-chart__band" style={{ background: `var(--ds-seq-${i + 1})` }} aria-hidden="true" />{`${nf.format(lo)}–${nf.format(hi)}`}</li>),
        <li key="none"><span className="ds-chart__band ds-chart__band--none" aria-hidden="true" />No data</li>,
      ]}
      table={{ head: [labelHeader, chart.unit && chart.unit !== "%" && chart.unit !== "₹" ? `${chart.series[0]?.name ?? "Value"} (${chart.unit})` : chart.series[0]?.name ?? "Value"],
        rows: sorted.map(([name, v]) => [name, withUnit(v, chart.unit === "%" || chart.unit === "₹" ? chart.unit : "")]) }}>
      {({ active, setActive, prefix }) => <IndiaPlot values={byName} bandOf={bandOf} describe={words} active={active} onActive={setActive} prefix={prefix} />}
    </Frame>
  );
}