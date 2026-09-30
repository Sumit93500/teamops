// ui/chart.js
// The small bar charts drawn with DOM calls: a column chart of days (.chart on
// the dashboards) and horizontal bar rows (.bar-row). The styling is in
// css/components and pages/attendance.css; this only builds the markup.

import { el, shortDate, dayOfMonth } from "./leave-view.js";

// One .chart__col per day, oldest first: a bar in a track, and the day of the
// month under it. look(day) says how that day's bar looks:
//   modifier  "" or one bar class, e.g. "chart__bar--muted", "chart__bar--progress"
//   height    0-100, the bar's --h
//   what      the tooltip after the date: "Mon, 28 Sep: <what>"
// days only need a .date (ISO); look() gets the whole day as given.
export function chartColumns(days, look) {
  return days.map((day) => {
    const { modifier, height, what } = look(day);
    const bar = el("span", `chart__bar${modifier ? ` ${modifier}` : ""}`);
    bar.style.setProperty("--h", String(height));
    bar.title = `${shortDate(day.date)}: ${what}`;
    const track = el("div", "chart__track");
    track.append(bar);
    const col = el("div", "chart__col");
    col.append(track, el("span", "chart__label", String(dayOfMonth(day.date))));
    return col;
  });
}

// One .bar-row: the label, a track filled to percent (a number, 0-100) and the
// value, already formatted as text ("6", "75%", "–").
export function barRow(label, value, percent) {
  const row = el("div", "bar-row");
  const track = el("div", "bar-row__track");
  const fill = el("span", "bar-row__fill");
  fill.style.setProperty("--w", `${percent}%`);
  track.append(fill);
  row.append(el("span", "", label), track, el("span", "bar-row__value", value));
  return row;
}