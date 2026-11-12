// Series fills (D2b): each series has a colour (--ds-chart-N) AND a pattern, so two series never differ by colour alone; a line
// series is solid or dashed instead. The plots and the legends' swatches draw from the same definitions.
export const SERIES_COUNT = 6;
export const colorVar = (i) => `var(--ds-chart-${(i % SERIES_COUNT) + 1})`;
export const dashFor = (i) => (i % 2 ? "6 4" : undefined);

// The marks over the colour: none, diagonal, dots, horizontal, cross, vertical.
const MARKS = [
  null,
  <path d="M-2 2l4-4M0 8l8-8M6 10l4-4" />,
  <circle cx="4" cy="4" r="1.4" />,
  <path d="M0 4h8" />,
  <path d="M0 0l8 8M8 0l-8 8" />,
  <path d="M4 0v8" />,
];

// One <pattern> per series, ids `${prefix}-p0`..; ink is the marks' colour (a token: light marks on light themes' strong fills).
export function PatternDefs({ prefix, count = SERIES_COUNT }) {
  return (
    <defs>
      {Array.from({ length: count }, (_, i) => (
        <pattern key={i} id={`${prefix}-p${i}`} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" style={{ fill: colorVar(i) }} />
          {MARKS[i % SERIES_COUNT] && <g style={{ stroke: "var(--ds-chart-ink)", fill: "var(--ds-chart-ink)" }} strokeWidth="1.3">{MARKS[i % SERIES_COUNT]}</g>}
        </pattern>
      ))}
    </defs>
  );
}

// A legend's swatch: a patterned square (fills) or a short solid/dashed line (lines).
export function Swatch({ index, line = false, prefix }) {
  const id = `${prefix}-sw${index}`;
  return (
    <svg className="ds-chart__swatch" viewBox="0 0 16 12" aria-hidden="true">
      {line ? (
        <path d="M1 6h14" style={{ stroke: colorVar(index) }} strokeWidth="2.5" strokeDasharray={dashFor(index) ? "4 2.5" : undefined} strokeLinecap="round" />
      ) : (
        <>
          <defs>
            <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" style={{ fill: colorVar(index) }} />
              {MARKS[index % SERIES_COUNT] && <g style={{ stroke: "var(--ds-chart-ink)", fill: "var(--ds-chart-ink)" }} strokeWidth="1.3">{MARKS[index % SERIES_COUNT]}</g>}
            </pattern>
          </defs>
          <rect x="1" y="1" width="14" height="10" rx="2.5" fill={`url(#${id})`} />
        </>
      )}
    </svg>
  );
}

// useId's value, safe inside url(#...)
export const cleanId = (id) => id.replace(/[^a-zA-Z0-9_-]/g, "");