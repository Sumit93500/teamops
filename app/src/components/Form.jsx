// The design system's form pieces (L1), drawn by design/forms.css from the tokens. Native elements, so the keyboard,
// screen readers and phones behave as usual; each field's label names its control, its hint and error describe it.
//   Field      a label, the control (children), an optional hint and error; required marks the label
//   Input      <input> in a .ds-control; Select <select> in one (options: [value, label] or strings); TextArea
//   Switch     a checkbox drawn as a switch, its label beside it
//   Kv         a definition list: [[term, value, { muted }], ...]
//   Person     initials, a name (a link when `to` is given) and a line under it
import { Link } from "react-router-dom";
import "../design/forms.css";

export function Field({ id, label, required = false, hint, error, full = false, children, hidden }) {
  return (
    <div className={`ds-field${full ? " ds-field--full" : ""}`} hidden={hidden || undefined}>
      <label className={`ds-field__label${required ? " ds-field__label--required" : ""}`} htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="ds-field__helper" id={`${id}-hint`}>{hint}</span>}
      {error && <span className="ds-field__error" id={`${id}-error`} role="alert">{error}</span>}
    </div>
  );
}

const described = (id, hint, error) => [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

export function Input({ id, hint, error, ...props }) {
  return (
    <div className={`ds-control${error ? " ds-control--invalid" : ""}`}>
      <input id={id} aria-invalid={error ? "true" : undefined} aria-describedby={described(id, hint, error)} {...props} />
    </div>
  );
}

export function Select({ id, options, placeholder, hint, error, ...props }) {
  return (
    <div className={`ds-control ds-control--select${error ? " ds-control--invalid" : ""}`}>
      <select id={id} aria-invalid={error ? "true" : undefined} aria-describedby={described(id, hint, error)} {...props}>
        {placeholder != null && <option value="">{placeholder}</option>}
        {options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}
      </select>
    </div>
  );
}

export function TextArea({ id, hint, error, ...props }) {
  return (
    <div className={`ds-control${error ? " ds-control--invalid" : ""}`}>
      <textarea id={id} aria-invalid={error ? "true" : undefined} aria-describedby={described(id, hint, error)} {...props} />
    </div>
  );
}

export function Switch({ id, label, checked, onChange, disabled, describedBy }) {
  return (
    <label className="ds-switch" htmlFor={id}>
      <input id={id} type="checkbox" role="switch" checked={checked} disabled={disabled} aria-describedby={describedBy} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Kv({ rows, id }) {
  return (
    <dl className="ds-kv" id={id}>
      {rows.filter(Boolean).map(([term, value, opts = {}]) => (
        <div key={term} data-kv={term}><dt>{term}</dt><dd className={opts.muted ? "is-muted" : undefined}>{value}</dd></div>
      ))}
    </dl>
  );
}

export const initialsOf = (name) => (name ? String(name).split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() : "?");

export function Person({ name, sub, to, xl = false }) {
  return (
    <div className="ds-person">
      <span className={`ds-avatar${xl ? " ds-avatar--xl" : ""}`} aria-hidden="true">{initialsOf(name)}</span>
      <div>
        {to ? <Link className="ds-person__name" to={to}>{name}</Link> : <span className="ds-person__name">{name}</span>}
        {sub && <span className="ds-person__sub">{sub}</span>}
      </div>
    </div>
  );
}