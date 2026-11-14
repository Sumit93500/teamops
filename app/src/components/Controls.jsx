// The design system's controls (D2a). Native elements underneath, so the keyboard, screen readers and phones get their
// usual behaviour; ds.css draws them from the tokens.
//   FilterBar     a row of filters with Clear All at its end (disabled while nothing is set)
//   DateRange     presets Today / Last 7 days / This month / Last month / Custom (two dates); says the range in words
//   FilterSelect  a labelled select;  FilterSearch  a labelled search box
//   SelectField   a labelled select with an icon, a helper line and a status line ("Check-In From" pattern: the status is a
//                 dot AND words, e.g. "Online, 47 m away")
//   Segmented     one choice of a few: a radio group (arrow keys move and choose; one Tab stop)
//   Toggle        a switch (role switch) that says On / Off in words
//   IconButton    an icon-only button, named by aria-label (and a tooltip title)
//   DownloadMenu  an icon button that opens a short menu of downloads; Esc or a choice closes it, focus back on the button
import { useEffect, useId, useRef, useState } from "react";
import { addDays } from "../../../assets/js/data/holidays.js";
import { formatDay } from "../../../assets/js/ui/leave-view.js";
import { ICON, Icon } from "./icons.jsx";
import "./ds.css";

// ---------- DateRange ----------
// F1: Last month in; Last 30 days out of the list (no page offered it but the gallery; rangeFor still knows "30d").
export const PRESETS = [["today", "Today"], ["7d", "Last 7 days"], ["month", "This month"], ["lastMonth", "Last month"], ["custom", "Custom"]];

// The dates a preset covers, ending today (ISO, both ends included), except Last month: the whole calendar month before
// today's (1 Dec to 31 Dec on any day of January). Today is the person's own date (todayIso), so no time zone moves it.
// Custom keeps the dates given.
export function rangeFor(preset, today, custom = {}) {
  if (preset === "today") return { from: today, to: today };
  if (preset === "7d") return { from: addDays(today, -6), to: today };
  if (preset === "30d") return { from: addDays(today, -29), to: today };
  if (preset === "month") return { from: `${today.slice(0, 8)}01`, to: today };
  if (preset === "lastMonth") {
    const first = `${today.slice(0, 8)}01`;
    const end = addDays(first, -1);
    return { from: `${end.slice(0, 8)}01`, to: end };
  }
  if (preset === "custom") return { from: custom.from ?? "", to: custom.to ?? "" };
  return { from: "", to: "" };
}
export function rangeWords({ from, to }) {
  if (!from || !to) return "Pick both dates";
  if (from > to) return "The start is after the end";
  return from === to ? formatDay(from, true) : `${formatDay(from, from.slice(0, 4) !== to.slice(0, 4))} to ${formatDay(to, true)}`;
}

// value: { preset: "" | key, from, to }; "" means no range chosen (all dates).
export function DateRange({ value, onChange, today, label = "Date range" }) {
  const id = useId();
  const preset = value?.preset ?? "";
  const set = (p) => onChange(p ? { preset: p, ...rangeFor(p, today, p === "custom" ? { from: value?.from || addDays(today, -6), to: value?.to || today } : {}) } : { preset: "", from: "", to: "" });
  const range = preset ? { from: value.from, to: value.to } : null;
  return (
    <div className="ds-date-range">
      <div className="ds-field">
        <label className="ds-field__label" htmlFor={`${id}-preset`}>{label}</label>
        <div className="ds-control ds-control--select">
          <Icon d={ICON.calendar} />
          <select id={`${id}-preset`} value={preset} onChange={(e) => set(e.target.value)} aria-describedby={`${id}-sum`}>
            <option value="">All dates</option>
            {PRESETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>
      {preset === "custom" && (
        <div className="ds-date-range__custom">
          <div className="ds-field">
            <label className="ds-field__label" htmlFor={`${id}-from`}>From</label>
            <div className="ds-control"><input id={`${id}-from`} type="date" value={value.from} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} /></div>
          </div>
          <div className="ds-field">
            <label className="ds-field__label" htmlFor={`${id}-to`}>To</label>
            <div className="ds-control"><input id={`${id}-to`} type="date" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} /></div>
          </div>
        </div>
      )}
      <span className="ds-date-range__summary" id={`${id}-sum`} aria-live="polite">{range ? rangeWords(range) : "Showing all dates"}</span>
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options, allLabel = "All" }) {
  const id = useId();
  return (
    <div className="ds-field">
      <label className="ds-field__label" htmlFor={id}>{label}</label>
      <div className="ds-control ds-control--select">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{allLabel}</option>
          {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
      </div>
    </div>
  );
}

export function FilterSearch({ label, value, onChange, placeholder }) {
  const id = useId();
  return (
    <div className="ds-field ds-field--search">
      <label className="ds-field__label" htmlFor={id}>{label}</label>
      <div className="ds-control">
        <Icon d={ICON.search} />
        <input id={id} type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} autoComplete="off" />
      </div>
    </div>
  );
}

export function FilterBar({ label = "Filters", onClearAll, active, children, end }) {
  return (
    <div className="ds-filterbar" role="group" aria-label={label}>
      {children}
      <div className="ds-filterbar__end">
        {end}
        <button type="button" className="ds-btn" onClick={onClearAll} disabled={!active}><Icon d={ICON.close} />Clear All</button>
      </div>
    </div>
  );
}

// ---------- SelectField ----------
// status: { tone: "success" | "warning" | "danger" | "info" | "", text }
export function SelectField({ label, value, onChange, options, icon, helper, status }) {
  const id = useId();
  const described = [helper && `${id}-help`, status && `${id}-status`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="ds-field ds-select-field">
      <label className="ds-field__label" htmlFor={id}>{label}</label>
      <div className="ds-control ds-control--select">
        {icon && <Icon d={icon} />}
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={described}>
          {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
      </div>
      {helper && <span className="ds-field__helper" id={`${id}-help`}>{helper}</span>}
      {status && <span className={`ds-status${status.tone ? ` ds-status--${status.tone}` : ""}`} id={`${id}-status`} aria-live="polite">{status.text}</span>}
    </div>
  );
}

// ---------- Segmented ----------
export function Segmented({ label, options, value, onChange }) {
  const refs = useRef([]);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const move = (to) => { const i = (to + options.length) % options.length; onChange(options[i].value); refs.current[i]?.focus(); };
  const onKeyDown = (e) => {
    const go = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: options.length - 1 }[e.key];
    if (go !== undefined) { e.preventDefault(); move(go); }
  };
  return (
    <div className="ds-segmented" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((o, i) => (
        <button key={o.value} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" className="ds-segmented__option"
          aria-checked={String(i === index)} tabIndex={i === index ? 0 : -1} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Toggle({ label, checked, onChange }) {
  return (
    <button type="button" role="switch" className="ds-toggle" aria-checked={String(checked)} onClick={() => onChange(!checked)}>
      <span className="ds-toggle__track" aria-hidden="true" />
      <span>{label}</span>
      <span className="ds-toggle__state" aria-hidden="true">{checked ? "On" : "Off"}</span>
    </button>
  );
}

// ---------- IconButton and DownloadMenu ----------
export function IconButton({ label, icon, ...props }) {
  return <button type="button" className="ds-icon-btn" aria-label={label} title={label} {...props}><Icon d={icon} /></button>;
}

// items: [{ label, onSelect }]
export function DownloadMenu({ label = "Download", items }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const btn = useRef(null), list = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    list.current?.querySelector("button")?.focus();
    const onDoc = (e) => { if (!list.current?.contains(e.target) && !btn.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); setOpen(false); btn.current?.focus(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const all = [...list.current.querySelectorAll("button")], i = all.indexOf(document.activeElement);
      e.preventDefault(); all[(i + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length]?.focus();
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className="ds-menu">
      <button ref={btn} type="button" className="ds-icon-btn" aria-label={label} title={label} aria-haspopup="true" aria-expanded={String(open)}
        aria-controls={id} onClick={() => setOpen((o) => !o)}><Icon d={ICON.download} /></button>
      {open && (
        <ul className="ds-menu__list" id={id} ref={list} aria-label={label}>
          {items.map((it) => (
            <li key={it.label}><button type="button" className="ds-menu__item" onClick={() => { setOpen(false); btn.current?.focus(); it.onSelect(); }}>{it.label}</button></li>
          ))}
        </ul>
      )}
    </div>
  );
}