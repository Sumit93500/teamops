// IndiaMap's drawing (D2b), loaded on first use in its own chunk with the shapes: @svg-maps/india (MapSVG's map, CC BY 4.0;
// 36 states and union territories, alphabetical, in a 612 x 696 box). Its names are the ones a chart's labels use.
//   Zoom: the +, - and reset buttons (1x to 8x, about the middle of the view); drag to move when zoomed in (touch too).
//   Keyboard: the map is one Tab stop (the active state, else the first); the arrow keys move between states, alphabetically;
//   Home / End: the first / last. Every state has a name and value as its accessible name.
//   Pointer: hover or tap a state to read it. A tooltip sits over the active state; the readout under the map says the same.
import { useLayoutEffect, useRef, useState } from "react";
import india from "@svg-maps/india";

// The zoom buttons are drawn here, as Controls' IconButton draws them (ds-icon-btn, aria-label, title): importing Controls into
// this lazy chunk would make the bundler split the app's shared modules, and their css, into a chunk loaded ahead of the old css.
function ZoomButton({ label, d, ...props }) {
  return <button type="button" className="ds-icon-btn" aria-label={label} title={label} {...props}><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg></button>;
}

export const STATE_NAMES = india.locations.map((l) => l.name);
const [, , W, H] = india.viewBox.split(" ").map(Number);
const ZOOM_IN = "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3M11 8v6M8 11h6";
const ZOOM_OUT = "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3M8 11h6";
const RESET = "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5";
const clampView = ({ k, x, y }) => ({ k, x: Math.min(0, Math.max(W - W * k, x)), y: Math.min(0, Math.max(H - H * k, y)) });

export default function IndiaPlot({ values, bandOf, describe, active, onActive, prefix }) {
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [focusName, setFocusName] = useState(null);
  const [tip, setTip] = useState(null);
  const wrap = useRef(null), svg = useRef(null), paths = useRef({}), drag = useRef(null);
  const tabName = focusName ?? (typeof active === "string" ? active : null) ?? STATE_NAMES[0];

  const zoom = (f) => setView((v) => {
    const k = Math.min(8, Math.max(1, v.k * f));
    const cx = (W / 2 - v.x) / v.k, cy = (H / 2 - v.y) / v.k;   // the map point at the middle of the view stays there
    return clampView({ k, x: W / 2 - cx * k, y: H / 2 - cy * k });
  });

  // the tooltip over the active state, in the wrapper's coordinates
  useLayoutEffect(() => {
    const p = typeof active === "string" ? paths.current[active] : null;
    if (!p || !wrap.current) { setTip(null); return; }
    const a = p.getBoundingClientRect(), b = wrap.current.getBoundingClientRect();
    const text = describe(active), half = Math.min(b.width / 2, text.length * 3.4 + 12);   // about half the tip's width at 12px
    const below = a.top - b.top < 40;                                                      // no room above: under the state
    setTip({ text, below, left: Math.min(b.width - half, Math.max(half, a.left + a.width / 2 - b.left)), top: below ? Math.min(b.height - 30, a.bottom - b.top) : a.top - b.top });
  }, [active, view, describe]);

  const onKeyDown = (e) => {
    const i = STATE_NAMES.indexOf(tabName);
    const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: STATE_NAMES.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const name = STATE_NAMES[(to + STATE_NAMES.length) % STATE_NAMES.length];
    setFocusName(name); onActive(name); paths.current[name]?.focus();
  };
  const toBox = (dx) => dx * (W / (svg.current?.getBoundingClientRect().width || W));
  const onPointerDown = (e) => { if (view.k > 1) { drag.current = { x: e.clientX, y: e.clientY, v: view, moved: false }; } };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.x == null) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) { d.moved = true; svg.current?.setPointerCapture?.(e.pointerId); }
    setView(clampView({ k: d.v.k, x: d.v.x + toBox(dx), y: d.v.y + toBox(dy) }));
  };
  // a drag's own click (fired after pointerup) mustn't pick the state under it
  const onPointerUp = () => { const moved = drag.current?.moved; drag.current = moved ? { moved: true } : null; if (moved) setTimeout(() => { drag.current = null; }, 0); };

  return (
    <div className={`ds-map${view.k > 1 ? " ds-map--zoomed" : ""}`} ref={wrap}>
      <div className="ds-map__zoom">
        <ZoomButton label="Zoom in" d={ZOOM_IN} onClick={() => zoom(1.5)} disabled={view.k >= 8} />
        <ZoomButton label="Zoom out" d={ZOOM_OUT} onClick={() => zoom(1 / 1.5)} disabled={view.k <= 1} />
        <ZoomButton label="Reset zoom" d={RESET} onClick={() => setView({ k: 1, x: 0, y: 0 })} disabled={view.k === 1} />
      </div>
      <svg ref={svg} className="ds-map__svg" viewBox={india.viewBox} onKeyDown={onKeyDown}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <defs>
          <pattern id={`${prefix}-none`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" style={{ fill: "var(--ds-map-none)" }} />
            <path d="M0 0v6" style={{ stroke: "var(--ds-map-edge)" }} strokeWidth="1" opacity="0.55" />
          </pattern>
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {india.locations.map((l) => {
            const v = values.get(l.name);
            return (
              <path key={l.id} ref={(el) => { paths.current[l.name] = el; }} d={l.path} data-state={l.name}
                className={`ds-map__state${active === l.name ? " is-active" : ""}`}
                style={{ fill: v == null ? `url(#${prefix}-none)` : `var(--ds-seq-${bandOf(v) + 1})` }}
                tabIndex={l.name === tabName ? 0 : -1} role="img" aria-label={describe(l.name)}
                onPointerEnter={(e) => { if (e.pointerType === "mouse" && !drag.current?.moved) onActive(l.name); }}
                onClick={() => { if (!drag.current?.moved) { setFocusName(l.name); onActive(l.name); } }}
                onFocus={() => { setFocusName(l.name); onActive(l.name); }} />
            );
          })}
        </g>
      </svg>
      {tip && <div className={`ds-map__tip${tip.below ? " ds-map__tip--below" : ""}`} style={{ left: tip.left, top: tip.top }} aria-hidden="true">{tip.text}</div>}
    </div>
  );
}