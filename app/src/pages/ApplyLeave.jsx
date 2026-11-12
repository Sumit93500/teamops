// Apply for leave (pages/leave/apply-leave.html + assets/js/pages/apply-leave.js), ported (round 10): the type cards with the
// live balances, the dates (from up to PAST_DAY_WINDOW days back) and duration with the working days counted as they change,
// "Balance after this request" (per period across a New Year or a month end), the approval chain and who it goes to, and
// Send request through applyLeave(): its errors under their fields, the advisories and the old toasts, then My leave.
// The browser's own required-field check still runs first (no noValidate, as before). The chain is the round 4 Stepper.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser } from "../../../assets/js/data/store.js";
import { LEAVE_POLICY, LEAVE_TYPES, PAST_DAY_WINDOW, balanceFor, workingDays, applyLeave, managerFor, periodsOf } from "../../../assets/js/data/leave-store.js";
import { dayNumber, isoFromDayNumber } from "../../../assets/js/data/holidays.js";
import { formatDays, typeLabel, monthName, todayIso } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import { useToast } from "../ui/Toast.jsx";
import { Stepper } from "../components/Basics.jsx";
import { useData, useSession } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { pageUrl } from "../routes.js";

const PAGE = "leave/apply-leave.html";
const ERROR_ID = { type: "leave-type-error", from: "from-date-error", to: "to-date-error", duration: "duration-error", reason: "leave-reason-error" };
const FOCUS = { type: () => document.querySelector('.choice-grid input:checked'), from: () => document.getElementById("from-date"), to: () => document.getElementById("to-date"),
  duration: () => document.getElementById("duration"), reason: () => document.getElementById("leave-reason") };

function typeMeta(type, balance) {
  if (balance.allowance === null) return "Salary is deducted for these days";
  const pending = balance.pending ? `, ${balance.pending} pending` : "";
  if (LEAVE_POLICY[type].per === "month") return `${formatDays(balance.left)} left this month${pending}`;
  return `${balance.left} of ${balance.allowance} days left${pending}`;
}
const Kv = ({ term, children }) => <div className="kv__row"><dt>{term}</dt><dd>{children}</dd></div>;

// "Balance after this request" (apply-leave.js renderBalanceAfter): the rows as [term, value, badge tone or null]
function balanceRows(userId, type, from, to, duration, days) {
  const policy = LEAVE_POLICY[type];
  const period = dayNumber(from) !== null ? from : todayIso();
  const [y, m] = period.split("-").map(Number);
  const b = balanceFor(userId, y, m)[type];
  const request = days === null ? "—" : formatDays(days);
  if (policy.allowance === null) return [[typeLabel(type), "No limit"], ["This request", request], ["Salary deducted for", days === null ? "—" : formatDays(days)]];
  const toneOf = (after) => (after >= 0 ? "badge--success" : policy.per === "month" ? "badge--warning" : "badge--danger");
  const periods = days === null ? [] : periodsOf({ from, to, duration }, type);
  if (periods.length > 1) {
    return periods.flatMap((p) => {
      const pb = balanceFor(userId, p.year, p.month ?? 1)[type];
      const name = p.month ? `${monthName(p.month)} ${p.year}` : String(p.year);
      const after = pb.left - pb.pending - p.days;
      return [[`${typeLabel(type)} left in ${name}`, formatDays(pb.left)], ...(pb.pending ? [[`Already pending in ${name}`, formatDays(pb.pending)]] : []),
        [`This request in ${name}`, formatDays(p.days)], [`Balance after, ${name}`, formatDays(after), toneOf(after)]];
    });
  }
  const rows = [[`${typeLabel(type)} ${policy.per === "month" ? `left in ${monthName(m)}` : "now"}`, formatDays(b.left)]];
  if (b.pending) rows.push(["Already pending", formatDays(b.pending)]);
  rows.push(["This request", request]);
  if (days === null) rows.push(["Balance after", "—"]);
  else { const after = b.left - b.pending - days; rows.push(["Balance after", formatDays(after), toneOf(after)]); }
  return rows;
}

export default function ApplyLeave() {
  const { userId } = useSession();
  const showToast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ type: "casual", from: "", to: "", duration: "full", reason: "", phone: "" });
  const [error, setError] = useState(null);   // { field, message }
  const [sent, setSent] = useState(false);
  const d = useData(() => ({ user: getUser(userId), balances: balanceFor(userId) }), [userId]);
  const user = d.user;
  if (!user) return <Frame page={PAGE}><div /></Frame>;

  const halfOverDays = form.duration !== "full" && form.from && form.to && form.from !== form.to;
  const shownError = halfOverDays ? { field: "duration", message: "A half day must start and end on the same date." } : error;
  const days = halfOverDays || dayNumber(form.from) === null || dayNumber(form.to) === null || form.to < form.from ? null : workingDays(form.from, form.to, form.duration);
  // a field's own error goes when it changes; any change that redraws the days (type, dates, duration) also takes a duration error
  const set = (name, clears = true) => (e) => {
    setForm({ ...form, [name]: e.target.value });
    if (clears && (error?.field === name || (error?.field === "duration" && name !== "reason"))) setError(null);
  };
  // the approval chain
  const manager = managerFor(user.id) ? getUser(managerFor(user.id)) : null;
  const steps = [{ state: "current", title: "You send the request", detail: user.name }];
  let chainText;
  if (user.role === "admin") { steps.push({ state: "", title: "Approved automatically", detail: "Admin requests don't need approval" }); chainText = "As an Admin, your leave is approved as soon as you send it."; }
  else if (manager) {
    steps.push({ state: "", title: "First approval", detail: [manager.name, manager.designation].filter(Boolean).join(", ") }, { state: "", title: "Final approval", detail: "HR or an Admin" });
    chainText = `${manager.name} approves your request first, then HR or an Admin.`;
  } else { steps.push({ state: "", title: "Approval", detail: "HR or an Admin" }); chainText = "Your request goes to HR or an Admin."; }

  const submit = (e) => {
    e.preventDefault();
    setError(null);
    const result = applyLeave(user.id, { type: form.type, from: form.from, to: form.to, duration: form.duration, reason: form.reason, contactPhone: form.phone });
    if (!result.ok) {
      if (ERROR_ID[result.field]) { setError({ field: result.field, message: result.error }); setTimeout(() => FOCUS[result.field]()?.focus()); }
      else showToast(result.error, "danger");
      return;
    }
    setSent(true);   // no second request while the page moves on
    if (result.advisories.length) showToast(result.advisories.map((a) => a.message).join(" "), "warning", 8000);
    showToast(result.record.status === "approved" ? "Leave approved. Admin requests are approved automatically." : "Leave request sent.", "success");
    bump();
    setTimeout(() => navigate(pageUrl("leave/my-leave.html")), 1200);
  };
  const err = (field) => (shownError?.field === field ? <span className="form-error" id={ERROR_ID[field]}>{shownError.message}</span> : null);
  const described = (field) => (shownError?.field === field ? ERROR_ID[field] : undefined);

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <ol className="breadcrumb mb-2" aria-label="Breadcrumb">
            <li className="breadcrumb__item"><Link to={pageUrl("leave/my-leave.html")}>My leave</Link></li>
            <li className="breadcrumb__item" aria-current="page">Apply for leave</li>
          </ol>
          <h1>Apply for leave</h1>
          <p className="page-header__subtitle">{chainText}</p>
        </div>
      </div>
      <div className="grid grid-main-aside">
        <form className="card" id="leave-form" onSubmit={submit}>
          <section className="form-section">
            <div className="form-section__head">
              <h3 className="form-section__title">Leave type</h3>
              <p className="form-section__desc">Choose what you are applying for.</p>
            </div>
            <div className="choice-grid" role="radiogroup" aria-label="Leave type" aria-describedby={described("type")}>
              {LEAVE_TYPES.map((type) => (
                <label className="choice" key={type}>
                  <input type="radio" name="leaveType" value={type} checked={form.type === type} onChange={set("type")} />
                  <span className="choice__title">{typeLabel(type)}</span><span className="choice__meta">{typeMeta(type, d.balances[type])}</span>
                </label>
              ))}
            </div>
            {err("type")}
          </section>
          <section className="form-section">
            <div className="form-section__head">
              <h3 className="form-section__title">Dates</h3>
              <p className="form-section__desc">Weekends and company holidays are not counted.</p>
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label form-label--required" htmlFor="from-date">From</label>
                <input className="input" id="from-date" name="from" type="date" required min={isoFromDayNumber(dayNumber(todayIso()) - PAST_DAY_WINDOW)} value={form.from} onChange={set("from")} aria-describedby={described("from")} />
                <span className="form-hint">Leave can be dated up to 7 days back.</span>
                {err("from")}
              </div>
              <div className="form-field">
                <label className="form-label form-label--required" htmlFor="to-date">To</label>
                <input className="input" id="to-date" name="to" type="date" required value={form.to} onChange={set("to")} aria-describedby={described("to")} />
                {err("to")}
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="duration">Duration</label>
                <select className="select" id="duration" name="duration" value={form.duration} onChange={set("duration")} aria-describedby={described("duration")}>
                  <option value="full">Full day</option><option value="first-half">First half</option><option value="second-half">Second half</option>
                </select>
                {err("duration")}
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="total-days">Total days</label>
                <input className="input" id="total-days" type="text" value={days === null ? "—" : formatDays(days)} disabled readOnly />
                <span className="form-hint">Calculated from the dates you pick.</span>
              </div>
            </div>
          </section>
          <section className="form-section">
            <div className="form-section__head">
              <h3 className="form-section__title">Details</h3>
              <p className="form-section__desc">Give your manager what they need to decide.</p>
            </div>
            <div className="form-grid">
              <div className="form-field form-field--full">
                <label className="form-label form-label--required" htmlFor="leave-reason">Reason</label>
                <textarea className="textarea" id="leave-reason" name="reason" placeholder="A short reason is enough" required value={form.reason} onChange={set("reason")} aria-describedby={described("reason")} />
                {err("reason")}
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="leave-phone">Contact number during leave</label>
                <input className="input" id="leave-phone" name="phone" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set("phone", false)} />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="leave-file">Attachment</label>
                <input className="input" id="leave-file" name="attachment" type="file" />
                <span className="form-hint">A medical certificate is needed for sick leave over 2 days.</span>
                <span className="form-hint">In this demo the file isn't saved, not even its name.</span>
              </div>
            </div>
            <h4 className="form-subtitle">Notifications</h4>
            <div className="toggle-list">
              <label className="switch"><input type="checkbox" /> I can be reached for urgent work</label>
            </div>
          </section>
          <div className="card__footer">
            <span className="card__meta">Fields marked * are required.</span>
            <div className="btn-group">
              <Link className="btn" to={pageUrl("leave/my-leave.html")}>Cancel</Link>
              <button className="btn btn--primary" type="submit" data-permission="leave:create" disabled={sent || undefined}>Send request</button>
            </div>
          </div>
        </form>
        <aside className="stack aside-sticky">
          <section className="card">
            <div className="card__header"><h3 className="card__title">Balance after this request</h3></div>
            <div className="card__body">
              <dl className="kv" id="balance-after">
                {balanceRows(user.id, form.type, form.from, form.to, form.duration, days).map(([term, value, tone]) => (
                  <Kv key={term} term={term}>{tone ? <span className={`badge ${tone}`}>{value}</span> : value}</Kv>
                ))}
              </dl>
            </div>
          </section>
          <section className="card">
            <div className="card__header"><h3 className="card__title">Approval chain</h3></div>
            <div className="card__body"><Stepper id="approval-chain" steps={steps} /></div>
          </section>
          <div className="alert alert--info">Send requests for 3 or more days at least 7 days ahead, so your team can plan.</div>
        </aside>
      </div>
    </Frame>
  );
}
