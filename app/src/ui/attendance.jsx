// Attendance cells in the design system (L3): a day's status pill (ui/attendance-view.js dayBadge's words and tones), the
// place a check-in came from (an icon and its name, the distance, and the check-out's place when it differs), and the
// "Flagged" badge (its reasons as its title and in words for screen readers). Used by Mark attendance, My attendance,
// Team attendance and the HR dashboard.
import { Pill } from "../components/Layout.jsx";
import { Icon } from "../components/icons.jsx";
import { placeLabel, iconOfPlace, flagText } from "../data/stamps.js";

const DAY = {
  present: ["success", "Present"], late: ["warning", "Late"], "half-day": ["info", "Half day"], absent: ["danger", "Absent"], "on-leave": ["info", "On leave"],
  holiday: ["", "Holiday"], weekend: ["", "Weekend"], "no-data": ["", "No data"], "not-joined": ["", "Before joining"], left: ["", "After leaving"], "not-yet": ["", "Not in yet"],
};
const FLAG = "M4 22V4M4 4h12l-2 4 2 4H4";

export function DayPill({ day }) {
  if (day.overdue) return <Pill tone="danger">Overdue</Pill>;
  const [tone, label] = DAY[day.status] ?? ["", day.status];
  return <Pill tone={tone}>{label}</Pill>;
}

// stamp: data/stamps.js's shape, or null (a check-in made before places were checked, or none).
export function PlaceCell({ stamp }) {
  if (!stamp?.inPlace && !stamp?.outPlace) return <span className="ds-hint">Not recorded</span>;
  const place = stamp.inPlace ?? stamp.outPlace;
  const out = stamp.outPlace && stamp.inPlace && stamp.outPlace !== stamp.inPlace ? stamp.outPlace : null;
  return (
    <span className="ds-place" data-place={place}>
      <Icon d={iconOfPlace(place)} />
      <span>{placeLabel(place)}{stamp.inDistance ? <span className="ds-place__sub">{stamp.inDistance}</span> : null}
        {out ? <span className="ds-place__sub">{`Out: ${placeLabel(out)}${stamp.outDistance ? `, ${stamp.outDistance}` : ""}`}</span> : null}</span>
    </span>
  );
}

// The same two cells as DOM nodes, for the tables still drawn by the old builders (ui/Nodes.jsx): My attendance's daily log
// and Team attendance.
const SVG = "http://www.w3.org/2000/svg";
function svgIcon(d) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "icon"); svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path"); path.setAttribute("d", d); svg.append(path);
  return svg;
}
const span = (cls, text) => { const s = document.createElement("span"); if (cls) s.className = cls; if (text != null) s.textContent = text; return s; };
export function placeNode(stamp) {
  if (!stamp?.inPlace && !stamp?.outPlace) return span("ds-hint", "Not recorded");
  const place = stamp.inPlace ?? stamp.outPlace;
  const out = stamp.outPlace && stamp.inPlace && stamp.outPlace !== stamp.inPlace ? stamp.outPlace : null;
  const wrap = span("ds-place"); wrap.dataset.place = place;
  const text = span("", placeLabel(place));
  if (stamp.inDistance) text.append(span("ds-place__sub", stamp.inDistance));
  if (out) text.append(span("ds-place__sub", `Out: ${placeLabel(out)}${stamp.outDistance ? `, ${stamp.outDistance}` : ""}`));
  wrap.append(svgIcon(iconOfPlace(place)), text);
  return wrap;
}
export function flagNode(reasons) {
  const why = flagText(reasons);
  const pill = span("ds-pill ds-pill--warning"); pill.title = why; pill.dataset.flagged = "";
  pill.append(svgIcon(FLAG), "Flagged", span("sr-only", why ? `: ${why}` : ""));
  return pill;
}

export function FlagBadge({ reasons }) {
  const why = flagText(reasons);
  return <Pill tone="warning" icon={FLAG} title={why} data-flagged="">Flagged<span className="sr-only">{why ? `: ${why}` : ""}</span></Pill>;
}