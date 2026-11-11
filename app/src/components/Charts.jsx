// ColumnChart and BarRows (ui/chart.js chartColumns / barRow), with the two chart rulings of 2026-11-10:
//   - the value readout at every width: each column takes focus and names its value; a click, tap or focus shows it in the
//     line under the chart (phone.js did this at 560px and under only). The line's hint: "Tap a bar for its value" on a
//     phone (approved wording), "Select a bar for its value" above it.
//   - a non-colour cue for colour-only meaning: each kind of bar also carries a pattern (components.css): leave hatched,
//     absent striped across, a missing check-out dotted, a day off (muted) hatched the other way; the readout and the
//     column's name say it in words.
//   days: [{ date, height (0-100), modifier ("muted" | "leave" | "absent" | "incomplete" | "progress" | ""), what }]
import { useState } from "react";
import { shortDate, dayOfMonth } from "../../../assets/js/ui/leave-view.js";
import { usePhone } from "../ui/phone.jsx";
import "./components.css";

export function ColumnChart({ days, label }) {
  const phone = usePhone();
  const [selected, setSelected] = useState(null);
  const hint = phone ? "Tap a bar for its value" : "Select a bar for its value";
  const nameOf = (d) => `${shortDate(d.date)}: ${d.what}`;
  return (
    <>
      <div className="chart" role="group" aria-label={label}>
        {days.map((d, i) => (
          <div key={d.date} className={`chart__col${selected === i ? " is-selected" : ""}`} tabIndex={0} role="button" aria-label={nameOf(d)}
            onClick={() => setSelected(i)} onFocus={() => setSelected(i)}>
            <div className="chart__track">
              <span className={`chart__bar${d.modifier ? ` chart__bar--${d.modifier}` : ""}`} style={{ "--h": String(d.height) }} title={nameOf(d)} />
            </div>
            <span className="chart__label">{String(dayOfMonth(d.date))}</span>
          </div>
        ))}
      </div>
      <p className="chart__readout chart__readout--all" aria-live="polite">{selected === null ? hint : nameOf(days[selected])}</p>
    </>
  );
}

export function BarRows({ rows }) {
  return (
    <div className="bar-rows">
      {rows.map((r) => (
        <div className="bar-row" key={r.label}>
          <span>{r.label}</span>
          <div className="bar-row__track"><span className="bar-row__fill" style={{ "--w": `${r.percent}%` }} /></div>
          <span className="bar-row__value">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
