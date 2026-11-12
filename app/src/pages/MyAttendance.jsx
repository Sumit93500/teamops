// My attendance (pages/attendance/my-attendance.html + assets/js/pages/my-attendance.js), ported: the chosen month (this one
// and the three before it): the stats, the calendar, the month summary, the late-mark alert and the daily log (10 a page) with
// Request fix and Cancel; the "Request regularization" modal sends a correction through the store (its errors under their
// fields). Cancel asks in the in-app dialog (round 4) instead of window.confirm; the words are the old ones.
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getUser } from "../../../assets/js/data/store.js";
import { managerFor } from "../../../assets/js/data/leave-store.js";
import { dayNumber } from "../../../assets/js/data/holidays.js";
import { ATTENDANCE_RULES as R, monthFor, requestRegularization, cancelRegularization, regularizationsFor } from "../../../assets/js/data/attendance-store.js";
import { el, todayIso, formatDay, monthName, localDateOf, shortDate, plural, showReason } from "../../../assets/js/ui/leave-view.js";
import { hoursText, dayBadge } from "../../../assets/js/ui/attendance-view.js";
import { barRow } from "../../../assets/js/ui/chart.js";
import { monthAttendanceChart, valuesOf } from "../../../assets/js/data/chart-data.js";
import Frame from "../ui/Frame.jsx";
import Nodes from "../ui/Nodes.jsx";
import Pagination from "../ui/Pagination.jsx";
import { useToast } from "../ui/Toast.jsx";
import Modal from "../components/Modal.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { StatStrip, StatCard } from "../components/Basics.jsx";
import { NoData, NO_DATA } from "../components/Charts.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { pageUrl } from "../routes.js";

const PAGE = "attendance/my-attendance.html";
const PAGE_SIZE = 10, MONTHS_BACK = 3;
const pad = (n) => String(n).padStart(2, "0");
const ordinal = (n) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
const isOffOrEmpty = (day) => ["weekend", "holiday", "no-data", "not-joined", "left"].includes(day.status);
const soFar = (days, today) => days.filter((d) => d.date <= today && !isOffOrEmpty(d) && d.status !== "not-yet");
const ICONS = ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M8 12l3 3 5-6", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2", "M4 20V10M10 20V4M16 20v-7M22 20H2", "M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6"];
const TONES = [1, 3, 2, 4];
const SUMMARY_LABEL = { present: "On time", late: "Late", "half-day": "Half day", "on-leave": "On leave", absent: "Absent" };
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function latestNote(request) {
  if (request.status === "pending") return `Latest: pending since ${formatDay(request.appliedOn)}`;
  const last = request.history[request.history.length - 1];
  const verb = { approved: "approved", rejected: "rejected", cancelled: "cancelled" }[request.status] ?? request.status;
  return `Latest: ${verb} on ${formatDay(localDateOf(last.at))}`;
}
function cellLook(day, today) {
  const wfh = day.mode === "wfh" ? " (WFH)" : "";
  switch (day.status) {
    case "present": return ["present", day.incomplete ? "No check-out" : `On time${wfh}`];
    case "late": return ["late", day.incomplete ? "Late, no check-out" : `Late${wfh}`];
    case "half-day": return ["late", "Half day"];
    case "absent": return ["absent", "Absent"];
    case "on-leave": return ["leave", "On leave"];
    case "holiday": return ["holiday", day.holiday?.name ?? "Holiday"];
    case "weekend": return ["weekend", ""];
    case "no-data": return ["future", "No data"];
    case "not-joined": return ["future", "Before joining"];
    case "left": return ["future", "After leaving"];
    default: return ["future", day.date === today ? "Not in yet" : ""];
  }
}
function fixableIssue(day, today) {
  if (day.regularized || day.regularization?.status === "pending") return "";
  const age = dayNumber(today) - dayNumber(day.date);
  if (age < 0 || age > R.requestWindowDays) return "";
  if (day.checkIn && day.minutesLate > 0) return "late-arrival";
  if (day.incomplete) return "missed-check-out";
  if (day.status === "absent" && !day.checkIn) return "missed-check-in";
  return "";
}
// my-attendance.js logRow; its buttons call the page's current handlers (on.current)
function logRow(day, today, on, canFix) {
  const tr = el("tr");
  tr.dataset.date = day.date;
  const status = el("td");
  const badge = dayBadge(day);
  status.append(badge);
  showReason(badge, badge.title);
  const actions = el("td", "table__actions");
  const pending = day.regularization?.status === "pending" ? day.regularization : null;
  const issue = fixableIssue(day, today);
  if (day.regularized) actions.append(el("span", "badge badge--success badge--square", "Regularized"));
  else if (pending) {
    const group = el("div", "btn-group");
    const cancel = el("button", "btn btn--sm btn--ghost", "Cancel");
    cancel.type = "button"; cancel.dataset.permission = "attendance:regularize"; cancel.hidden = !canFix;
    cancel.addEventListener("click", () => on.current.cancel(pending.id, day.date));
    group.append(el("span", "badge badge--warning badge--square", "Pending"), cancel);
    actions.append(group);
  } else if (issue) {
    const fix = el("button", "btn btn--sm", "Request fix");
    fix.type = "button"; fix.dataset.permission = "attendance:regularize"; fix.hidden = !canFix;
    fix.addEventListener("click", () => on.current.open(day.date, issue));
    actions.append(fix);
  }
  tr.append(el("td", "", shortDate(day.date)), el("td", "", day.checkIn ? `${day.checkIn}${day.mode === "wfh" ? " (WFH)" : ""}` : "–"),
    el("td", "", day.incomplete ? "Not recorded" : (day.checkOut ?? "–")), el("td", "table__num", day.minutesWorked === null ? "–" : hoursText(day.minutesWorked)), status, actions);
  return tr;
}

const EMPTY_FORM = { date: "", issue: "", time: "", reason: "" };
const FIELD_ID = { date: "reg-date", issue: "reg-issue", time: "reg-time", reason: "reg-reason" };

export default function MyAttendance() {
  const { userId } = useSession();
  const canFix = useCan("attendance:regularize"), canMark = useCan("attendance:mark");
  const showToast = useToast();
  const confirm = useConfirm();
  const today = todayIso();
  const months = [];
  for (let i = 0, y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7)); i <= MONTHS_BACK; i++) { months.push([y, m]); m -= 1; if (m === 0) { m = 12; y -= 1; } }
  const [[year, month], setMonth] = useState(months[0]);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);   // the form while open
  const [error, setError] = useState(null);   // { field, message }
  const d = useData(() => ({ summary: monthFor(userId, year, month), requests: regularizationsFor(userId), user: getUser(userId) }), [userId, year, month]);

  const on = useRef({});
  on.current.cancel = async (id, date) => {
    if (!(await confirm({ message: `Cancel your correction request for ${formatDay(date)}?`, confirmLabel: "Cancel request", cancelLabel: "Keep it", danger: true }))) return;
    const result = cancelRegularization(id, userId);
    if (result.ok) showToast("Correction request cancelled.", "success");
    else showToast("Couldn't cancel the request. It may already have been decided.", "danger");
    bump();
  };
  on.current.open = (date = "", issue = "") => {
    setError(null); setModal({ ...EMPTY_FORM, date, issue });
    setTimeout(() => document.getElementById(date ? (issue ? "reg-time" : "reg-issue") : "reg-date")?.focus());
  };
  const sentTo = () => {
    if (d.user?.role === "admin") return "Approved straight away (Admin)";
    const manager = getUser(managerFor(userId));
    return manager ? `${manager.name} first, then HR or an Admin` : "HR or an Admin";
  };
  const submit = (e) => {
    e.preventDefault();
    const result = requestRegularization(userId, modal);
    if (!result.ok) {
      if (FIELD_ID[result.field]) { setError({ field: result.field, message: result.error }); document.getElementById(FIELD_ID[result.field])?.focus(); }
      else showToast("Couldn't send the request. Please try again.", "danger");
      return;
    }
    setModal(null);
    showToast(result.record.status === "approved" ? "Correction applied." : "Correction request sent.", "success");
    const [y, m] = result.record.date.split("-").map(Number);
    if (months.some(([a, b]) => a === y && b === m)) setMonth([y, m]);
    bump();
  };

  if (!d.summary) return <Frame page={PAGE}><div /></Frame>;
  const { summary } = d;
  // stats (my-attendance.js renderStats)
  const done = soFar(summary.days, today);
  const isCurrent = today.slice(0, 7) === `${year}-${pad(month)}`;
  const s0 = !done.length
    ? ["–", isCurrent && summary.workingDaysLeft ? `${plural(summary.workingDaysLeft, "working day", "working days")} left` : "No attendance recorded"]
    : [`${summary.daysWorked} / ${done.length}`, isCurrent ? `${plural(summary.workingDaysLeft, "working day", "working days")} left` : "Working days in the month"];
  const left = R.penaltyEvery - (summary.lateMarks % R.penaltyEvery);
  const s1 = [String(summary.lateMarks), summary.penaltyHalfDays ? `${plural(summary.penaltyHalfDays, "half day", "half days")} this month; ${left} more before the next` : `${left} more before a half day`];
  const s2 = [summary.averageMinutes === null ? "–" : hoursText(summary.averageMinutes), `Target is ${R.fullDayMinutes / 60}h`];
  const inMonth = d.requests.filter((r) => r.date.startsWith(`${year}-${pad(month)}-`)).sort((a, b) => b.appliedOn.localeCompare(a.appliedOn) || b.id.localeCompare(a.id, "en", { numeric: true }));
  const s3 = [String(inMonth.length), inMonth.length ? latestNote(inMonth[0]) : "None this month"];
  // a month with no logged day has no data (round 9b, as rer's renderStats): every stat "–" and the message
  const logDays = summary.days.filter((x) => x.date <= today && !isOffOrEmpty(x)).reverse();
  const noData = !logDays.length;
  const stats = [["Days present", ...s0], ["Late marks", ...s1], ["Average hours", ...s2], ["Correction requests", ...s3]]
    .map(([label, value, note]) => (noData ? [label, "–", NO_DATA] : [label, value, note]));
  // calendar
  const lead = (new Date(dayNumber(summary.days[0].date) * 86400000).getUTCDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...summary.days];
  while (cells.length % 7) cells.push(null);
  // summary, alert
  const chart = monthAttendanceChart(done);
  const counts = valuesOf(chart, "Days");
  const alert = summary.lateMarks
    ? `You have ${plural(summary.lateMarks, "late mark", "late marks")} this month. Every ${ordinal(R.penaltyEvery)} late mark counts as half a day.${summary.penaltyHalfDays ? ` That's ${plural(summary.penaltyHalfDays, "half day", "half days")} this month.` : ` ${left === 1 ? "The next one" : `${left} more`} would count as half a day.`} Each half day is taken from your pay, not your leave balance, when payroll is processed.`
    : null;
  // log
  const totalPages = Math.max(1, Math.ceil(logDays.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);
  const pageDays = logDays.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const minDate = new Date((dayNumber(today) - R.requestWindowDays) * 86400000).toISOString().slice(0, 10);
  const fieldError = (name) => (error?.field === name ? <span className="form-error" id={`${FIELD_ID[name]}-error`}>{error.message}</span> : null);
  const set = (name) => (e) => { setModal({ ...modal, [name]: e.target.value }); setError(null); };

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>My attendance</h1>
          <p className="page-header__subtitle">Your punches, late marks and working hours</p>
        </div>
        <div className="page-header__actions">
          <select className="select select--sm" id="month-select" aria-label="Choose month" value={`${year}-${pad(month)}`}
            onChange={(e) => { setMonth(e.target.value.split("-").map(Number)); setPage(1); }}>
            {months.map(([y, m]) => <option key={`${y}-${m}`} value={`${y}-${pad(m)}`}>{`${monthName(m)} ${y}`}</option>)}
          </select>
          <button className="btn" type="button" id="request-btn" data-permission="attendance:regularize" hidden={!canFix || undefined} onClick={() => on.current.open()}>Request regularization</button>
          <Link className="btn btn--primary" to={pageUrl("attendance/mark-attendance.html")} data-permission="attendance:mark" hidden={!canMark || undefined}>Mark attendance</Link>
        </div>
      </div>
      <div className="stack">
        <StatStrip label="Key numbers">
          {stats.map(([label, value, note], i) => <StatCard key={label} icon={ICONS[i]} tone={TONES[i]} label={label} value={value} note={note} hidden={false} />)}
        </StatStrip>
        <div className="grid grid-main-aside">
          <section className="card" id="attendance-calendar">
            <div className="card__header">
              <h3 className="card__title">{`${monthName(month)} ${year}`}</h3>
              <span className="card__meta">Monday to Sunday</span>
            </div>
            <div className="card__body">
              <div className="calendar__grid">
                {DOW.map((x) => <div className="calendar__dow" key={x}>{x}</div>)}
                {cells.map((day, i) => {
                  if (!day) return <div className="calendar__day calendar__day--empty" key={`e${i}`} />;
                  const [kind, tag] = cellLook(day, today);
                  return (
                    <div key={day.date} className={`calendar__day calendar__day--${kind}${day.date === today ? " calendar__day--today" : ""}`} data-date={day.date}>
                      <span className="calendar__date">{String(Number(day.date.slice(8)))}</span>
                      {tag && <span className="calendar__tag">{tag}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="calendar__legend">
                <span className="is-present">On time</span><span className="is-late">Late</span><span className="is-absent">Absent</span><span className="is-leave">On leave</span>
                <span className="is-holiday">Holiday</span><span className="is-off">Weekend</span><span style={{ "--c": "var(--color-text-muted)" }}>No record</span>
              </div>
            </div>
          </section>
          <aside className="stack">
            <section className="card" id="month-summary">
              <div className="card__header">
                <h3 className="card__title">Month summary</h3>
                <span className="card__meta">{`${plural(chart.total, "working day", "working days")} so far`}</span>
              </div>
              <Nodes className="card__body" hidden={chart.empty || undefined} build={() => chart.labels.map((st, i) => barRow(SUMMARY_LABEL[st], String(counts[i]), chart.total ? Math.round((counts[i] / chart.total) * 100) : 0))} deps={[d, year, month]} />
              {chart.empty && <NoData />}
            </section>
            <div className="alert alert--warning" id="late-alert" hidden={!alert || undefined}>{alert}</div>
          </aside>
        </div>
        <section className="card" id="daily-log">
          <div className="card__header">
            <h3 className="card__title">Daily log</h3>
            <span className="card__meta">{`${monthName(month)}, ${plural(logDays.length, "working day", "working days")} so far`}</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date</th><th>Check-in</th><th>Check-out</th><th className="table__num">Hours</th><th>Status</th><th className="table__actions">Actions</th></tr></thead>
              <Nodes as="tbody" deps={[d, year, month, current, canFix]} build={() => {
                if (pageDays.length) return pageDays.map((x) => logRow(x, today, on, canFix));
                const td = el("td", "text-muted", NO_DATA); td.colSpan = 6;
                const tr = el("tr"); tr.append(td); return [tr];
              }} />
            </table>
          </div>
          <Pagination totalItems={logDays.length} pageSize={PAGE_SIZE} currentPage={current} onPageChange={setPage} />
        </section>
      </div>

      <Modal open={Boolean(modal)} onClose={() => setModal(null)} id="regularize-modal" title="Request regularization"
        desc="Ask for a missed or late punch to be corrected. Your manager approves first, then HR or an Admin."
        footer={<><button className="btn" type="button" data-modal-close onClick={() => setModal(null)}>Cancel</button><button className="btn btn--primary" type="submit" form="regularize-form">Send request</button></>}>
        {modal && (
          <form id="regularize-form" noValidate onSubmit={submit}>
            <div className="form">
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label form-label--required" htmlFor="reg-date">Date</label>
                  <input className="input" id="reg-date" type="date" required min={minDate} max={today} value={modal.date} onChange={set("date")} aria-describedby={error?.field === "date" ? "reg-date-error" : undefined} />
                  {fieldError("date")}
                </div>
                <div className="form-field">
                  <label className="form-label form-label--required" htmlFor="reg-issue">What went wrong?</label>
                  <select className="select" id="reg-issue" required value={modal.issue} onChange={set("issue")} aria-describedby={error?.field === "issue" ? "reg-issue-error" : undefined}>
                    <option value="">Select</option><option value="late-arrival">Late arrival</option><option value="missed-check-in">Missed check-in</option><option value="missed-check-out">Missed check-out</option>
                  </select>
                  {fieldError("issue")}
                </div>
                <div className="form-field">
                  <label className="form-label form-label--required" htmlFor="reg-time">Correct time</label>
                  <input className="input" id="reg-time" type="time" required value={modal.time} onChange={set("time")} aria-describedby={error?.field === "time" ? "reg-time-error" : undefined} />
                  {fieldError("time")}
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="reg-manager">Sent to</label>
                  <input className="input" id="reg-manager" type="text" value={sentTo()} disabled readOnly />
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label form-label--required" htmlFor="reg-reason">Reason</label>
                  <textarea className="textarea" id="reg-reason" placeholder="Explain briefly so HR can decide quickly" required value={modal.reason} onChange={set("reason")} aria-describedby={error?.field === "reason" ? "reg-reason-error" : undefined} />
                  <span className="form-hint">Requests must be sent within 7 days of the date.</span>
                  {fieldError("reason")}
                </div>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </Frame>
  );
}
