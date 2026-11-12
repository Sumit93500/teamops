// The small components, each in the old pages' own markup so the existing css draws them:
//   StatStrip / StatCard  .stat-strip > .stat (icon, label, value, delta with its tone)      (pages' stats, ui/stats.js)
//   EmptyState            .empty (icon?, title, text, a way on); "No data in this range." for a chart or table
//                         with nothing in the chosen period (the Empty ranges ruling)            (leave-view emptyState)
//   Badge                 .badge (tone, dot, square)
//   PersonCell            .table__user (avatar, name, sub-line)                                  (leave-view personCell)
//   Stepper               .stepper (done, current, not reached)                                  (leave-view step)
//   NotBuilt              a control the demo doesn't have: "<what> isn't available in this demo." (ui/placeholder.js)
//   Tabs                  .tabs (role tablist) > .tabs__tab, and the panel shown                 (ui/tabs.js)
import { useState } from "react";
import { Link } from "react-router-dom";
import { initials, avatarClass, nameOf } from "../../../assets/js/ui/leave-view.js";
import { useToast } from "../ui/Toast.jsx";

const Icon = ({ d }) => <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;

export function StatStrip({ label, children }) {
  return <section className="stat-strip" aria-label={label}>{children}</section>;
}
// hidden + permission: a stat the person may not see stays in place, hidden, with no figure (as applyPermissions left the old
// ones: a stats export then carries an empty row). note "" draws the empty delta line the old pages kept.
export function StatCard({ icon, tone = 1, label, value, note, noteTone = "", id, permission, hidden }) {
  return (
    <div className="stat" data-stat={id} data-permission={permission} hidden={hidden || undefined}>
      {icon && <div className={`stat__icon stat__icon--${tone}`}><Icon d={icon} /></div>}
      <div>
        <span className="stat__label">{label}</span>
        <strong className="stat__value">{value}</strong>
        {note != null && <span className={`stat__delta${noteTone ? ` stat__delta--${noteTone}` : ""}`}>{note}</span>}
      </div>
    </div>
  );
}

export const NO_DATA = "No data in this range.";
export function EmptyState({ title = NO_DATA, text, to, linkText, icon }) {
  return (
    <div className="empty">
      {icon && <div className="empty__icon"><Icon d={icon} /></div>}
      <h3 className="empty__title">{title}</h3>
      {text && <p className="empty__text">{text}</p>}
      {to && <Link className="btn" to={to}>{linkText}</Link>}
    </div>
  );
}

export function Badge({ tone = "", dot = false, square = false, children, ...props }) {
  return <span {...props} className={["badge", tone && `badge--${tone}`, dot && "badge--dot", square && "badge--square"].filter(Boolean).join(" ")}>{children}</span>;
}
// A badge from the old pages' class strings ("badge badge--warning badge--dot"), for status maps kept in that form (round 11).
export const badgeOf = (cls = "badge") => ({ tone: /badge--(?!dot\b|square\b)([\w-]+)/.exec(cls)?.[1] ?? "", dot: /\bbadge--dot\b/.test(cls), square: /\bbadge--square\b/.test(cls) });

// Why a control can't be used, as a line of text after it (leave-view.js showReason, round 14E): the control points at it with
// aria-describedby={id}; it takes the control's permission and hidden, so it hides with it. No text: no line (round 11).
export function Reason({ id, text, permission, hidden }) {
  if (!text) return null;
  return <span className="reason" id={id} data-permission={permission} hidden={hidden || undefined}>{text}</span>;
}

export function PersonCell({ userId, name, sub }) {
  const shown = name ?? nameOf(userId);
  return (
    <div className="table__user">
      <div className={avatarClass(userId)}>{initials(shown)}</div>
      <div><span className="table__user-name">{shown}</span><span className="table__user-sub">{sub}</span></div>
    </div>
  );
}

const CHECK = "m5 12 5 5 9-10";
export function Stepper({ steps, vertical = true, id }) {
  return (
    <ol className={`stepper${vertical ? " stepper--vertical" : ""}`} id={id}>
      {steps.map((s, i) => (
        <li key={i} className={`stepper__step${s.state ? ` is-${s.state}` : ""}`}>
          <span className="stepper__dot">{s.state === "done" ? <Icon d={CHECK} /> : String(i + 1)}</span>
          <div className="stepper__text"><strong>{s.title}</strong><small className="text-muted">{s.detail}</small></div>
        </li>
      ))}
    </ol>
  );
}

export function NotBuilt({ what, className = "btn", children, ...props }) {
  const showToast = useToast();
  return (
    <button {...props} className={className} type="button" data-not-implemented={what}
      onClick={(e) => { e.preventDefault(); showToast(`${what} isn't available in this demo.`, "info"); }}>{children ?? what}</button>
  );
}

// Controlled (round 10): active + onChange(index), for a page whose tabs filter one table; tabs without content draw no panels.
export function Tabs({ tabs, pill = false, active: activeProp, onChange }) {
  const [own, setOwn] = useState(0);
  const active = activeProp ?? own, setActive = onChange ?? setOwn;
  // D2a: the arrow keys, Home and End move to a tab and open it (each tab stays in the Tab order, as before).
  const onKeyDown = (e) => {
    const tabs2 = [...e.currentTarget.querySelectorAll('[role="tab"]')], i = tabs2.indexOf(document.activeElement);
    if (i < 0) return;
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs2.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const j = (to + tabs2.length) % tabs2.length;
    tabs2[j].focus(); setActive(j);
  };
  return (
    <>
      <div className={`tabs${pill ? " tabs--pill" : ""}`} role="tablist" onKeyDown={onKeyDown}>
        {tabs.map((t, i) => (
          <button key={t.label} className={`tabs__tab${i === active ? " is-active" : ""}`} type="button" role="tab" aria-selected={String(i === active)}
            onClick={() => setActive(i)}>{t.label}{t.count != null && <>{" "}<span className="badge badge--count">{t.count}</span></>}</button>
        ))}
      </div>
      {tabs.some((t) => t.content !== undefined) && tabs.map((t, i) => <div key={t.label} className="tab-panel" role="tabpanel" hidden={i !== active}>{t.content}</div>)}
    </>
  );
}
