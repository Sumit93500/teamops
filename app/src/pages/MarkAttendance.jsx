// Mark attendance (pages/attendance/mark-attendance.html + assets/js/pages/mark-attendance.js), ported: today's status badge,
// the clock, the shift rule, work mode, Check in / Check out through the attendance store (the store's error under the
// buttons, "Checked in." / "Checked out." toasts), today's times and hours, the shift card with this month's late marks, and the
// last 5 working days. It all redraws after a punch (the bus) and at the start of every minute, as before.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUser } from "../../../assets/js/data/store.js";
import { ATTENDANCE_RULES as R, checkIn, checkOut, checkInWindow, dayFor, monthFor, nowMinutes, toMinutes } from "../../../assets/js/data/attendance-store.js";
import { typeLabel, el, todayIso, weekdayName, monthName, dayOfMonth, shortDate, showReason } from "../../../assets/js/ui/leave-view.js";
import { dayNumber, isoFromDayNumber } from "../../../assets/js/data/holidays.js";
import { hoursText, dayBadge } from "../../../assets/js/ui/attendance-view.js";
import Frame from "../ui/Frame.jsx";
import Nodes from "../ui/Nodes.jsx";
import { useToast } from "../ui/Toast.jsx";
import { useData, useAction, useSession, useCan } from "../data/hooks.js";
import { pageUrl } from "../routes.js";

const PAGE = "attendance/mark-attendance.html";
const RECENT_DAYS = 5;
const pad = (n) => String(n).padStart(2, "0");
const twelveHour = (minutes) => { const h = Math.floor(minutes / 60); return `${h % 12 || 12}:${pad(minutes % 60)} ${h < 12 ? "AM" : "PM"}`; };
const longDate = (iso) => `${weekdayName(iso)}, ${dayOfMonth(iso)} ${monthName(Number(iso.slice(5, 7)))} ${iso.slice(0, 4)}`;
const ordinal = (n) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

// mark-attendance.js renderStatus: the badge, which buttons work, and the line under them
function statusOf(day, user) {
  if (!day) return { badge: ["badge badge--danger badge--dot", "Account inactive"], why: user ? "Your account is inactive, so attendance can't be recorded." : "Your employee record wasn't found, so attendance can't be recorded." };
  if (day.checkOut) return { badge: ["badge badge--dot", `Checked out at ${day.checkOut}`], why: "You're done for today." };
  if (day.checkIn) return { badge: day.minutesLate ? ["badge badge--warning badge--dot", `Checked in at ${day.checkIn}, late by ${day.minutesLate} min`] : ["badge badge--success badge--dot", `Checked in at ${day.checkIn}`], canOut: true, why: "" };
  if (day.status === "on-leave") return { badge: ["badge badge--info badge--dot", "On leave today"], why: `You're on approved ${day.leave ? typeLabel(day.leave.type).toLowerCase() : "leave"} today, so there's nothing to check in for.` };
  if (day.status === "weekend") return { badge: ["badge badge--dot", "Weekend"], why: "No attendance is needed on weekends." };
  if (day.status === "holiday") return { badge: ["badge badge--dot", `Holiday: ${day.holiday.name}`], why: "No attendance is needed on holidays." };
  if (day.status === "not-joined") return { badge: ["badge badge--dot", "Not joined yet"], why: `Attendance starts on your joining date, ${user.dateOfJoining}.` };
  if (day.status === "absent") return { badge: ["badge badge--danger badge--dot", "Not checked in, the shift has ended"], why: `Check-in closed at ${twelveHour(checkInWindow(day).closes)}. If you were working today, use Request fix on My attendance.` };
  if (nowMinutes() < checkInWindow(day).opens) return { badge: ["badge badge--warning badge--dot", "Not checked in yet"], why: `Check-in opens at ${twelveHour(checkInWindow(day).opens)}.` };
  return { badge: ["badge badge--warning badge--dot", "Not checked in yet"], canIn: true, why: "" };
}

function recentRow(day) {
  const tr = el("tr");
  const inCell = el("td", "", day.checkIn ? `${day.checkIn}${day.mode === "wfh" ? " (WFH)" : ""}` : "–");
  const outText = day.incomplete ? "Not recorded" : (day.checkOut ?? "–");
  const hours = el("td", "table__num", day.minutesWorked === null ? "–" : hoursText(day.minutesWorked));
  const status = el("td");
  const badge = dayBadge(day);
  status.append(badge);
  showReason(badge, badge.title);
  if (day.regularized) status.append(" ", el("span", "badge badge--success badge--square", "Regularized"));
  tr.append(el("td", "", shortDate(day.date)), inCell, el("td", "", outText), hours, status);
  return tr;
}
function recentRows(userId, today) {
  const days = [];
  for (let n = dayNumber(today); days.length < RECENT_DAYS && n > dayNumber(today) - 31; n--) {
    const day = dayFor(userId, isoFromDayNumber(n));
    if (!day || day.status === "no-data" || day.status === "not-joined") break;
    if (day.status === "weekend" || day.status === "holiday") continue;
    days.push(day);
  }
  if (days.length) return days.map(recentRow);
  const td = el("td", "text-muted", "No attendance recorded yet."); td.colSpan = 5;
  const tr = el("tr"); tr.append(td);
  return [tr];
}

// A minute tick, from the start of the next minute (mark-attendance.js startTicking).
function useMinute() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const now = new Date();
    let interval = 0;
    const timer = setTimeout(() => { setTick((t) => t + 1); interval = setInterval(() => setTick((t) => t + 1), 60 * 1000); }, (60 - now.getSeconds()) * 1000 - now.getMilliseconds());
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, []);
  return tick;
}

export default function MarkAttendance() {
  const { userId } = useSession();
  const canMark = useCan("attendance:mark");
  const showToast = useToast();
  const tick = useMinute();
  const [touched, setTouched] = useState(null);   // the mode the person picked, once they pick one
  const [error, setError] = useState("");
  const d = useData(() => {
    const today = todayIso();
    const day = dayFor(userId, today);
    return { today, day, user: getUser(userId), month: monthFor(userId, Number(today.slice(0, 4)), Number(today.slice(5, 7))), minutes: new Date().getHours() * 60 + new Date().getMinutes() };
  }, [userId, tick]);
  const doIn = useAction(checkIn), doOut = useAction(checkOut);

  const { day, user, month, today } = d;
  const st = statusOf(day, user);
  const locked = Boolean(day?.checkIn) || !st.canIn;
  const mode = day?.mode ?? touched ?? day?.suggestedMode ?? "office";
  let start = toMinutes(R.shiftStart), end = toMinutes(R.shiftEnd);
  if (day?.halfDayLeave === "first-half") start = toMinutes(R.halfSplit);
  if (day?.halfDayLeave === "second-half") end = toMinutes(R.halfSplit);
  const half = day?.halfDayLeave ? `You're on leave for the ${day.halfDayLeave === "first-half" ? "first" : "second"} half today. ` : "";
  const [time, ampm] = twelveHour(d.minutes).split(" ");
  let lateNote = "";
  if (month?.penaltyHalfDays) lateNote = `Every ${ordinal(R.penaltyEvery)} late mark in a month counts as half a day: ${month.penaltyHalfDays} this month. Each half day is taken from your pay, not your leave balance, when payroll is processed.`;
  else if (month && month.lateMarks === R.penaltyEvery - 1) lateNote = "One more late mark this month counts as half a day. Each half day is taken from your pay, not your leave balance, when payroll is processed.";

  const punch = (result, doneText) => { setError(result.ok ? "" : result.error); if (result.ok) showToast(doneText, "success"); };

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Mark attendance</h1>
          <p className="page-header__subtitle" id="today-date">{longDate(today)}</p>
        </div>
        <div className="page-header__actions">
          <Link className="btn" to={pageUrl("attendance/my-attendance.html")}>View my attendance</Link>
        </div>
      </div>
      <div className="stack">
        <div className="grid grid-main-aside">
          <section className="card">
            <div className="punch__body">
              <span className={st.badge[0]} id="punch-status">{st.badge[1]}</span>
              <div className="punch__time" id="punch-clock"><time dateTime={`${pad(Math.floor(d.minutes / 60))}:${pad(d.minutes % 60)}`}>{time.padStart(5, "0")}</time><small>{ampm}</small></div>
              <p className="punch__date" id="punch-rule">{`${half}Shift ${twelveHour(start)} – ${twelveHour(end)}. Checking in after ${twelveHour(start + R.graceMinutes)} is marked late.`}</p>
              <div className="punch__mode" role="radiogroup" aria-label="Work mode">
                {[["office", "Office"], ["wfh", "Work from home"]].map(([value, label]) => (
                  <label className="check" key={value}><input type="radio" name="mode" value={value} checked={mode === value} disabled={locked} onChange={() => setTouched(value)} />{` ${label}`}</label>
                ))}
              </div>
              <div className="punch__actions">
                <button className="btn btn--primary btn--lg" type="button" id="check-in-btn" data-permission="attendance:mark" hidden={!canMark || undefined} disabled={!st.canIn}
                  onClick={() => punch(doIn(userId, mode), "Checked in.")}>Check in</button>
                <button className="btn btn--lg" type="button" id="check-out-btn" disabled={!st.canOut} onClick={() => punch(doOut(userId), "Checked out.")}>Check out</button>
              </div>
              <p className="text-sm text-muted" id="punch-note" hidden={!st.why || undefined}>{st.why}</p>
              <p className="form-error" id="punch-error" role="alert" hidden={!error || undefined}>{error}</p>
            </div>
            <div className="punch__stats">
              <div className="punch__stat"><span>Check-in</span><strong id="stat-check-in">{day?.checkIn ? `${day.checkIn}${day.mode === "wfh" ? " (WFH)" : ""}` : "–"}</strong></div>
              <div className="punch__stat"><span>Check-out</span><strong id="stat-check-out">{day?.checkOut ?? "–"}</strong></div>
              <div className="punch__stat"><span>Hours today</span><strong id="stat-hours">{hoursText(day?.minutesWorked ?? 0)}</strong></div>
            </div>
          </section>
          <aside className="stack">
            <section className="card">
              <div className="card__header"><h3 className="card__title">Location check</h3></div>
              <div className="card__body"><p className="text-sm text-muted">Location and network checks aren't part of this demo, so where you check in from isn't verified.</p></div>
            </section>
            <section className="card">
              <div className="card__header"><h3 className="card__title">Today's shift</h3></div>
              <div className="card__body">
                <dl className="kv">
                  <div className="kv__row"><dt>Shift</dt><dd>General</dd></div>
                  <div className="kv__row"><dt>Timing</dt><dd id="shift-timing">{`${twelveHour(toMinutes(R.shiftStart))} – ${twelveHour(toMinutes(R.shiftEnd))}`}</dd></div>
                  <div className="kv__row"><dt>Grace period</dt><dd id="shift-grace">{`${R.graceMinutes} minutes`}</dd></div>
                  <div className="kv__row"><dt>Late marks this month</dt><dd id="late-marks">{month ? `${month.lateMarks} of ${R.penaltyEvery}` : "–"}</dd></div>
                </dl>
                <p className="text-sm text-muted mt-2" id="late-note" hidden={!lateNote || undefined}>{lateNote}</p>
              </div>
            </section>
          </aside>
        </div>
        <section className="card">
          <div className="card__header">
            <h3 className="card__title">Recent punches</h3>
            <Link className="link text-sm" to={pageUrl("attendance/my-attendance.html")}>View full month</Link>
          </div>
          <div className="table-wrap">
            <table className="table" id="recent-punches">
              <thead><tr><th>Date</th><th>Check-in</th><th>Check-out</th><th className="table__num">Hours</th><th>Status</th></tr></thead>
              <Nodes as="tbody" build={() => recentRows(userId, today)} deps={[d]} />
            </table>
          </div>
        </section>
        <div className="alert alert--info">Forgot to punch, or the system was down? Ask for a correction from <Link className="link" to={pageUrl("attendance/my-attendance.html")}>My attendance</Link>.</div>
      </div>
    </Frame>
  );
}
