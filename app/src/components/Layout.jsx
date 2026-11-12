// The design system's layout pieces (D2a), drawn by ds.css from the tokens:
//   PageHeader  title, breadcrumb (links), subtitle, actions
//   Card        a titled surface: header (title, meta, actions), body, footer
//   HeroCard    the dark "glass" summary card: icon, title, pills, a big value and its caption, a small two-line plot with a
//               hatched band over a range; the band and each line are named in words (legend, band label), not by colour alone
//   KpiCard     a number with its label; the change is an arrow AND words ("▲ 3.4% vs last month"); an optional mini trend
//   Pill        a rounded label, with a tone and an icon
import { Link } from "react-router-dom";
import { Icon } from "./icons.jsx";
import "./ds.css";

export function PageHeader({ title, subtitle, breadcrumb = [], actions, level = 1, id }) {
  const H = `h${level}`;
  return (
    <header className="ds-page-header">
      {breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="ds-breadcrumb">
            {breadcrumb.map((b, i) => (
              <li key={b.label}>{b.to && i < breadcrumb.length - 1 ? <Link to={b.to}>{b.label}</Link> : <span aria-current={i === breadcrumb.length - 1 ? "page" : undefined}>{b.label}</span>}</li>
            ))}
          </ol>
        </nav>
      )}
      <div className="ds-page-header__row">
        <div>
          <H className="ds-page-header__title" id={id}>{title}</H>
          {subtitle && <p className="ds-page-header__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="ds-page-header__actions">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({ title, meta, actions, footer, children, id, className = "", headingLevel = 2 }) {
  const H = `h${headingLevel}`;
  return (
    <section className={`ds-card${className ? ` ${className}` : ""}`} id={id} aria-labelledby={id && title ? `${id}-title` : undefined}>
      {(title || actions) && (
        <div className="ds-card__header">
          <div>{title && <H className="ds-card__title" id={id ? `${id}-title` : undefined}>{title}</H>}{meta && <span className="ds-card__meta">{meta}</span>}</div>
          {actions && <div className="ds-card__actions">{actions}</div>}
        </div>
      )}
      <div className="ds-card__body">{children}</div>
      {footer && <div className="ds-card__footer">{footer}</div>}
    </section>
  );
}

export function Pill({ tone = "", icon, children, ...props }) {
  return <span {...props} className={`ds-pill${tone ? ` ds-pill--${tone}` : ""}`}>{icon && <Icon d={icon} />}{children}</span>;
}

// Points (0..1 on each axis) of a series, for a small SVG plot; min/max shared by every series drawn together.
function linePath(values, min, max, w, h) {
  const span = max - min || 1;
  return values.map((v, i) => `${i ? "L" : "M"}${((i / Math.max(1, values.length - 1)) * w).toFixed(1)},${(h - ((v - min) / span) * h).toFixed(1)}`).join(" ");
}

// series: [{ name, values, dashed? }] (two at most look right); band: { from, to, label } as indexes into the values.
export function HeroCard({ icon, title, pills = [], value, caption, series = [], band, plotLabel, children }) {
  const all = series.flatMap((s) => s.values);
  const min = Math.min(...all), max = Math.max(...all);
  const n = Math.max(1, (series[0]?.values.length ?? 1) - 1);
  return (
    <section className="ds-hero" aria-label={title}>
      <div className="ds-hero__head">
        {icon && <span className="ds-hero__icon"><Icon d={icon} /></span>}
        <h2 className="ds-hero__title">{title}</h2>
      </div>
      {pills.length > 0 && <div className="ds-hero__pills">{pills.map((p) => <Pill key={p.label} icon={p.icon}>{p.label}</Pill>)}</div>}
      {value != null && <p className="ds-hero__value">{value}</p>}
      {caption && <p className="ds-hero__caption">{caption}</p>}
      {series.length > 0 && (
        <>
          <div className="ds-hero__plot" role="img" aria-label={plotLabel}>
            {band && (
              <div className="ds-hero__band" style={{ left: `${(band.from / n) * 100}%`, width: `${((band.to - band.from) / n) * 100}%` }}>
                <span className="ds-hero__band-label">{band.label}</span>
              </div>
            )}
            <svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
              {series.map((s, i) => (
                <path key={s.name} d={linePath(s.values, min, max, 300, 100)} fill="none" stroke={i === 0 ? "#7cc4fa" : "#f5b25c"} strokeWidth="2"
                  strokeDasharray={s.dashed ? "6 4" : undefined} vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
          </div>
          <ul className="ds-hero__legend">
            {series.map((s, i) => (
              <li key={s.name}><span className={`ds-hero__swatch${s.dashed ? " ds-hero__swatch--dashed" : ""}`} style={{ color: i === 0 ? "#7cc4fa" : "#f5b25c" }} />{s.name}</li>
            ))}
          </ul>
        </>
      )}
      {children}
    </section>
  );
}

const ARROW = { up: "▲", down: "▼", flat: "■" };
// change: { direction: "up" | "down" | "flat", text, good?: whether this change is good news (default: up is good) }
// The tone (green good / red bad) only repeats what the arrow and the words already say.
export function KpiCard({ label, value, icon, change, trend, trendLabel, id }) {
  const good = change?.good ?? change?.direction === "up";
  const tone = change && change.direction !== "flat" ? (good ? "good" : "bad") : "";
  return (
    <div className="ds-kpi" data-kpi={id}>
      <div className="ds-kpi__top">
        <span className="ds-kpi__label">{label}</span>
        {icon && <span className="ds-kpi__icon"><Icon d={icon} /></span>}
      </div>
      <strong className="ds-kpi__value">{value}</strong>
      {(change || trend) && (
        <div className="ds-kpi__bottom">
          {change ? (
            <span className={`ds-kpi__change${tone ? ` ds-kpi__change--${tone}` : ""}`}>
              <span className="ds-kpi__arrow" aria-hidden="true">{ARROW[change.direction]}</span>
              <span className="visually-hidden">{change.direction === "up" ? "Up" : change.direction === "down" ? "Down" : "No change"}: </span>
              {change.text}
            </span>
          ) : <span />}
          {trend && trend.length > 1 && (
            <svg className="ds-kpi__trend" viewBox="0 0 84 28" role="img" aria-label={trendLabel ?? `Trend: ${trend.join(", ")}`}>
              <path d={linePath(trend, Math.min(...trend), Math.max(...trend), 84, 24)} transform="translate(0 2)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}