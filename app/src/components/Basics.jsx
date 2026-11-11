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

export function Badge({ tone = "", dot = false, square = false, children }) {
  return <span className={["badge", tone && `badge--${tone}`, dot && "badge--dot", square && "badge--square"].filter(Boolean).join(" ")}>{children}</span>;
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
export function Stepper({ steps, vertical = true }) {
  return (
    <ol className={`stepper${vertical ? " stepper--vertical" : ""}`}>
      {steps.map((s, i) => (
        <li key={i} className={`stepper__step${s.state ? ` is-${s.state}` : ""}`}>
          <span className="stepper__dot">{s.state === "done" ? <Icon d={CHECK} /> : String(i + 1)}</span>
          <div className="stepper__text"><strong>{s.title}</strong><small className="text-muted">{s.detail}</small></div>
        </li>
      ))}
    </ol>
  );
}

export function NotBuilt({ what, className = "btn", children }) {
  const showToast = useToast();
  return (
    <button className={className} type="button" data-not-implemented={what}
      onClick={(e) => { e.preventDefault(); showToast(`${what} isn't available in this demo.`, "info"); }}>{children ?? what}</button>
  );
}

export function Tabs({ tabs, pill = false }) {
  const [active, setActive] = useState(0);
  return (
    <>
      <div className={`tabs${pill ? " tabs--pill" : ""}`} role="tablist">
        {tabs.map((t, i) => (
          <button key={t.label} className={`tabs__tab${i === active ? " is-active" : ""}`} type="button" role="tab" aria-selected={String(i === active)}
            onClick={() => setActive(i)}>{t.label}{t.count != null && <>{" "}<span className="badge badge--count">{t.count}</span></>}</button>
        ))}
      </div>
      {tabs.map((t, i) => <div key={t.label} className="tab-panel" role="tabpanel" hidden={i !== active}>{t.content}</div>)}
    </>
  );
}
