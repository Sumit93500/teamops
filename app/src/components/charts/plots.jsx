// The Recharts drawings behind Charts.jsx (D2b), loaded on first use in their own chunk. They only draw: the frame owns the
// readout, the legend and the table. The active point comes in as `active` (an index) and goes out through onActive (pointer
// over, tap or click). Colours are the theme's tokens; animation is off.
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot, LabelList } from "recharts";
import { PatternDefs, colorVar, dashFor } from "./patterns.jsx";
// The words for labels and values (labelText, withUnit) come in as props from Charts.jsx: this chunk imports nothing of the
// app's but patterns.jsx (no imports of its own), so the bundler keeps the app's modules and css in the main chunk, in order.

const TICK = { fill: "var(--ds-text-2)", fontSize: 12 };
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
const axisNumber = (unit) => (v) => (unit === "%" ? `${v}%` : unit === "₹" ? `₹${compact.format(v)}` : compact.format(v));
const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
// Recharts gives the point under the pointer as activeTooltipIndex (a string or a number)
const indexOf = (state) => {
  const i = state?.activeTooltipIndex ?? state?.activeIndex;
  return i == null || i === "" || Number.isNaN(Number(i)) ? null : Number(i);
};
const pointer = (onActive) => ({
  onMouseMove: (s) => { const i = indexOf(s); if (i != null) onActive(i); },
  onClick: (s) => { const i = indexOf(s); if (i != null) onActive(i); },
});
// Definitions (gradients, patterns) live in a zero-size svg beside the chart: url(#id) finds them anywhere in the page.
const Defs = ({ children }) => <svg className="ds-chart__defs" width="0" height="0" aria-hidden="true" focusable="false">{children}</svg>;

export function AreaPlot({ data, series, unit, active, onActive, height, prefix, labelText }) {
  const negative = data.some((r) => series.some((_, k) => (r[`s${k}`] ?? 0) < 0));
  const one = data.length === 1;
  const a = active != null ? data[active] : null;
  return (
    <>
      <Defs>
        {series.map((_, i) => (
          <linearGradient key={i} id={`${prefix}-g${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: colorVar(i), stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: colorVar(i), stopOpacity: 0.02 }} />
          </linearGradient>
        ))}
      </Defs>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 14, bottom: 0, left: 0 }} accessibilityLayer={false} {...pointer(onActive)}>
          <CartesianGrid vertical={false} stroke="var(--ds-chart-grid)" />
          <XAxis dataKey="label" tickFormatter={(l) => cut(labelText(l), 12)} tick={TICK} tickLine={false} axisLine={{ stroke: "var(--ds-border-strong)" }} minTickGap={28} interval="preserveStartEnd" />
          <YAxis tickFormatter={axisNumber(unit)} tick={TICK} tickLine={false} axisLine={false} width={48} />
          <Tooltip content={() => null} cursor={false} isAnimationActive={false} />
          {negative && <ReferenceLine y={0} stroke="var(--ds-border-strong)" />}
          {a && <ReferenceLine x={a.label} stroke="var(--ds-text-2)" strokeDasharray="3 3" />}
          {series.map((s, i) => (
            <Area key={s.name} type="monotone" dataKey={`s${i}`} name={s.name} stroke={colorVar(i)} strokeWidth={2.25} strokeDasharray={dashFor(i)}
              fill={`url(#${prefix}-g${i})`} isAnimationActive={false} dot={one ? { r: 4, fill: colorVar(i), strokeWidth: 0 } : false} activeDot={false} />
          ))}
          {a && series.map((s, i) => (a[`s${i}`] == null ? null : (
            <ReferenceDot key={s.name} x={a.label} y={a[`s${i}`]} r={4.5} fill="var(--ds-surface-1)" stroke={colorVar(i)} strokeWidth={2.25} />
          )))}
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}

export function BarPlot({ data, series, unit, active, onActive, height, horizontal, stacked, prefix, labelText, withUnit }) {
  const negative = data.some((r) => series.some((_, k) => (r[`s${k}`] ?? 0) < 0));
  const last = series.length - 1;
  const radius = (i) => (stacked && i !== last ? 0 : horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]);
  const longest = Math.max(...data.map((r) => labelText(r.label).length));
  const labelWidth = Math.min(150, Math.max(56, longest * 7 + 8));
  const fitChars = Math.floor((labelWidth - 8) / 7);
  const single = series.length === 1;
  return (
    <>
      <Defs><PatternDefs prefix={prefix} count={series.length} /></Defs>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 10, right: horizontal && single ? 40 : 14, bottom: 0, left: 0 }}
          barCategoryGap={horizontal ? "26%" : "22%"} barGap={3} accessibilityLayer={false} {...pointer(onActive)}>
          <CartesianGrid horizontal={!horizontal} vertical={horizontal} stroke="var(--ds-chart-grid)" />
          {horizontal ? (
            <>
              <XAxis type="number" tickFormatter={axisNumber(unit)} tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={labelWidth} tickFormatter={(l) => cut(labelText(l), fitChars)} tick={TICK} tickLine={false} axisLine={{ stroke: "var(--ds-border-strong)" }} interval={0} />
            </>
          ) : (
            <>
              <XAxis dataKey="label" tickFormatter={(l) => cut(labelText(l), 12)} tick={TICK} tickLine={false} axisLine={{ stroke: "var(--ds-border-strong)" }} minTickGap={8} />
              <YAxis tickFormatter={axisNumber(unit)} tick={TICK} tickLine={false} axisLine={false} width={48} allowDecimals={false} />
            </>
          )}
          <Tooltip content={() => null} cursor={{ fill: "var(--ds-surface-3)", opacity: 0.6 }} isAnimationActive={false} />
          {negative && (horizontal ? <ReferenceLine x={0} stroke="var(--ds-text-2)" /> : <ReferenceLine y={0} stroke="var(--ds-text-2)" />)}
          {series.map((s, i) => (
            <Bar key={s.name} dataKey={`s${i}`} name={s.name} stackId={stacked ? "all" : undefined} fill={`url(#${prefix}-p${i})`} radius={radius(i)}
              isAnimationActive={false} maxBarSize={horizontal ? 22 : 44}>
              {data.map((_, k) => <Cell key={k} fillOpacity={active == null || active === k ? 1 : 0.45} />)}
              {/* F1: drawn by hand so a zero (no bar) still says its value beside the axis, as the old bar rows did */}
              {horizontal && single && <LabelList dataKey={`s${i}`} content={({ x, y, width, height, value }) => (value == null ? null : (
                <text x={Number(x) + Math.max(0, Number(width) || 0) + 6} y={Number(y) + Number(height) / 2} dominantBaseline="central" style={{ fill: "var(--ds-text)", fontSize: 12 }}>
                  {withUnit(value, unit === "%" || unit === "₹" ? unit : "")}
                </text>))} />}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

const RAD = Math.PI / 180;
export function DonutPlot({ data, total, unit, active, onActive, height, prefix, withUnit }) {
  // the share outside the ring, beside each part (parts under 3% are named in the legend and table only)
  const outside = ({ cx, cy, midAngle, outerRadius, percent }) => {
    if (percent < 0.03) return null;
    const r = outerRadius + 16, x = cx + r * Math.cos(-midAngle * RAD), y = cy + r * Math.sin(-midAngle * RAD);
    return <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" style={{ fill: "var(--ds-text)", fontSize: 12, fontWeight: 500 }}>{`${(Math.round(percent * 1000) / 10).toLocaleString("en-IN")}%`}</text>;
  };
  return (
    <div className="ds-chart__donut" style={{ height }}>
      <Defs><PatternDefs prefix={prefix} count={data.length} /></Defs>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart margin={{ top: 16, right: 44, bottom: 16, left: 44 }} accessibilityLayer={false}>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius="58%" outerRadius="80%" startAngle={90} endAngle={-270} paddingAngle={1.5} cornerRadius={4}
            label={outside} labelLine={{ stroke: "var(--ds-border-strong)" }} isAnimationActive={false}
            onMouseEnter={(_, i) => onActive(i)} onClick={(_, i) => onActive(i)}>
            {data.map((d, i) => <Cell key={d.label} fill={`url(#${prefix}-p${i})`} stroke={active === i ? "var(--ds-text)" : "var(--ds-surface-1)"} strokeWidth={2} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="ds-chart__center" aria-hidden="true"><strong>{withUnit(total, unit === "₹" ? "₹" : "")}</strong>{unit && unit !== "₹" && unit !== "%" && <span>{unit}</span>}</div>
    </div>
  );
}