// The leave pages' small pieces, as ui/leave-view.js builds them: the status badge and the request's
// progress steps. The words and classes come from leave-view's own data (STATUS) and the leave store.
import { STATUS, formatDay } from "../../../assets/js/ui/leave-view.js";
import { currentApproverName } from "../../../assets/js/data/leave-store.js";

export function StatusBadge({ status }) {
  return <span className={STATUS[status]?.badge ?? "badge"}>{STATUS[status]?.label ?? status}</span>;
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
