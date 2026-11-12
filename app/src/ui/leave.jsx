// The leave pages' small pieces, as ui/leave-view.js builds them: the status badge and the request's
// progress steps. The words and classes come from leave-view's own data (STATUS) and the leave store.
import { STATUS, formatDay, formatRange, requestDates, nameOf, initials, avatarClass, departmentName } from "../../../assets/js/ui/leave-view.js";
import { currentApproverName } from "../../../assets/js/data/leave-store.js";
import { getUser } from "../../../assets/js/data/store.js";
import { dayNumber, isoFromDayNumber } from "../../../assets/js/data/holidays.js";
import { Badge } from "../components/Basics.jsx";

export function StatusBadge({ status }) {
  return <span className={STATUS[status]?.badge ?? "badge"}>{STATUS[status]?.label ?? status}</span>;
}

// "Out in the next 7 days" (leave-approvals.js / team-leave.js renderOutNextWeek): approved or pending leave, not work from
// home, from today to six days on, by start date then name (round 10).
export function OutNextWeek({ requests, today }) {
  const end = isoFromDayNumber(dayNumber(today) + 6);
  const out = requests.filter((r) => (r.status === "pending" || r.status === "approved") && r.type !== "wfh" && r.from <= end && r.to >= today)
    .sort((a, b) => a.from.localeCompare(b.from) || nameOf(a.userId).localeCompare(nameOf(b.userId)));
  return (
    <section className="card" id="out-next-week">
      <div className="card__header">
        <h3 className="card__title">Out in the next 7 days</h3>
        <span className="card__meta">{formatRange(today, end)}</span>
      </div>
      <div className="list">
        {out.length ? out.map((r) => {
          const p = getUser(r.userId);
          return (
            <div className="list__item" key={r.id}>
              <div className={avatarClass(r.userId)}>{initials(p?.name)}</div>
              <div className="list__content"><span className="list__title">{p?.name ?? r.userId}</span><span className="list__sub">{`${requestDates(r)}, ${departmentName(p?.department)}`}</span></div>
              {r.status === "approved" ? <Badge tone="success">Approved</Badge> : <Badge tone="warning">Pending</Badge>}
            </div>
          );
        }) : <div className="list__item"><span className="list__sub">Nobody is off in the next 7 days.</span></div>}
      </div>
    </section>
  );
}

const CheckIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
);

// One step: state "done", "current" or "" (not reached yet).
export function Step({ state, number, title, detail }) {
  return (
    <li className={`stepper__step${state ? ` is-${state}` : ""}`}>
      <span className="stepper__dot">{state === "done" ? <CheckIcon /> : String(number)}</span>
      <div className="stepper__text"><strong>{title}</strong><small className="text-muted">{detail}</small></div>
    </li>
  );
}

// A pending request's steps (leave-view.js pendingSteps()): sent, then who it waits on; at the manager stage
// the manager, then HR or an Admin.
export function PendingSteps({ request }) {
  const sent = <Step key="sent" state="done" number={1} title="Sent" detail={`${formatDay(request.appliedOn)} by you`} />;
  if (request.stage === "manager") {
    return [sent,
      <Step key="first" state="current" number={2} title="First approval" detail={`Waiting for ${currentApproverName(request)}`} />,
      <Step key="final" state="" number={3} title="Final approval" detail="HR or an Admin" />];
  }
  return [sent, <Step key="one" state="current" number={2} title="Approval" detail={`Waiting for ${currentApproverName(request)}`} />];
}
