// Payslip (pages/payroll/payslip-view.html + assets/js/pages/payslip-view.js), ported (round 11): one person's payslip for one
// month, ?employee=EMP-xxxx&month=YYYY-MM, from data/payroll-store.js. Your own always; anyone else's only with payslips:view,
// else the 403 page (the same answer whether or not that person exists). Without ?employee it's your own; without ?month the
// newest. A month with no payslip, an unknown employee or a link that doesn't name a month shows a message instead (no Print).
// Print or save as PDF is the browser's print dialog; print.css prints the payslip alone on one A4 page. Nothing here works
// out pay; the store does.
import { useEffect } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { payslipsFor } from "../../../assets/js/data/payroll-store.js";
import { ATTENDANCE_RULES } from "../../../assets/js/data/attendance-store.js";
import { getUser, joiningDate } from "../../../assets/js/data/store.js";
import { can } from "../../../assets/js/core/rbac.js";
import { todayIso, monthName, formatRange, departmentName, plural, formatDays, formatDay } from "../../../assets/js/ui/leave-view.js";
import { rupeesInWords } from "../../../assets/js/ui/money.js";
import { maskAccount, maskPan } from "../../../assets/js/ui/pii.js";
import Frame from "../ui/Frame.jsx";
import { Badge, badgeOf, NO_DATA } from "../components/Basics.jsx";
import { KeepWhole, rupees } from "../ui/payroll.jsx";
import { useData, useSession } from "../data/hooks.js";
import { pageUrl } from "../routes.js";

const PAGE = "payroll/payslip-view.html";
const STATUS = {
  draft: { label: "Draft", badge: "badge badge--warning badge--dot" },
  "on-hold": { label: "On hold", badge: "badge badge--danger badge--dot" },
  approved: { label: "Approved", badge: "badge badge--success badge--dot" },
};
const NO_SALARY = "No salary on file for this month";
const REGIME = { new: "New regime" };
const orDash = (value) => (value ? String(value) : "—");
const monthLabel = (month) => `${monthName(Number(month.slice(5, 7)))} ${month.slice(0, 4)}`;
const approved = (slip) => slip.runStatus === "approved";
const statusLine = (slip) => (slip.status === "on-hold" ? `${approved(slip) ? "On hold when approved" : "On hold"}: ${slip.holdReason}` : approved(slip) ? "Approved: not paid yet" : "Draft: not approved or paid yet");
const listed = (items) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0] ?? "");
const openAbsence = (a) => `${formatDay(a.date)}${a.days === 0.5 ? ", half a day" : ""} (${a.waiting ? "a correction or leave request is waiting for a decision" : `can still be corrected until ${formatDay(a.until)}`})`;

function missingMonthText(month, slips, user, own) {
  if (month > slips[0].month) return `${monthLabel(month)} hasn't started yet. The newest payslip is for ${monthLabel(slips[0].month)}.`;
  const first = slips.at(-1).month;
  const joined = joiningDate(user.dateOfJoining);
  if (joined && joined.slice(0, 7) === first) return `Payslips start in ${monthLabel(first)}, the month ${own ? "you" : user.name} joined (${formatDay(joined, true)}). There's no payslip before that.`;
  return `Payslips start in ${monthLabel(first)}, the first month with attendance records. Before that, loss of pay can't be checked.`;
}
// The lines under the figures (payslip-view.js renderNotes).
function notesOf(slip) {
  const label = monthLabel(slip.month);
  const notes = [];
  if (slip.holdReason === NO_SALARY) notes.push(`On hold: ${slip.holdReason}. Nothing can be worked out or paid for ${label} until a salary is added.`);
  else if (slip.status === "on-hold") notes.push(`On hold: ${slip.holdReason}. The pay above is worked out, but it can't be paid until a bank account is added.`);
  if (slip.lop.days > 0) {
    const why = listed([
      slip.lop.penaltyHalfDays ? plural(slip.lop.penaltyHalfDays, "late-mark half day", "late-mark half days") : "",
      slip.lop.unpaidLeaveDays ? `${formatDays(slip.lop.unpaidLeaveDays)} of unpaid leave` : "",
      slip.lop.absenceDays ? `${formatDays(slip.lop.absenceDays)} of unexplained absence` : "",
      slip.lop.leftDays ? `${formatDays(slip.lop.leftDays)} after the last working day` : "",
      slip.lop.notJoinedDays ? `${formatDays(slip.lop.notJoinedDays)} before the joining date` : "",
    ].filter(Boolean));
    notes.push(`Loss of pay: ${rupees(slip.lop.amount)} for ${formatDays(slip.lop.days)} (${why}), out of ${slip.workingDays} working days, taken off the monthly salary of ${rupees(slip.monthlyGross)}. The earnings above are on the ${rupees(slip.gross)} left.`);
  }
  const open = slip.attendance.openAbsences;
  if (open.length) notes.push(`Not deducted yet: ${plural(open.length, "absence", "absences")} with no check-in, on ${listed(open.map(openAbsence))}. Each costs a day's pay (half with half-day leave) once its ${ATTENDANCE_RULES.requestWindowDays}-day correction window has closed and nothing for it is waiting for a decision.`);
  const paused = slip.attendance.pausedLateMarks ?? 0;
  if (paused > 0) notes.push(`Not counted yet: ${plural(paused, "late mark with", "late marks, each with")} a late-arrival correction waiting for a decision. Every ${ATTENDANCE_RULES.penaltyEvery} late marks in a month cost half a day; ${paused === 1 ? "it counts only if the correction is" : "each counts only if its correction is"} rejected.`);
  const uncounted = slip.attendance.uncountedAbsences;
  if (uncounted > 0) notes.push(`${plural(uncounted, "day", "days")} with no check-in ${uncounted === 1 ? "isn't" : "aren't"} counted as an absence: there's no readable joining date on file to count from.`);
  if (slip.attendance.beforeJoining > 0) {
    const before = slip.attendance.beforeJoining;
    notes.push(`The joining date was ${formatDay(slip.attendance.joined, true)}; ${before === 1 ? "the 1 working day" : `the ${before} working days`} of ${label} before it ${before === 1 ? "isn't" : "aren't"} paid.`);
  }
  if (slip.attendance.lastDay) {
    const after = slip.lop.leftDays ?? 0;
    notes.push(`The last working day was ${formatDay(slip.attendance.lastDay, true)}${after ? `; ${after === 1 ? "the 1 working day" : `the ${after} working days`} of ${label} after it ${after === 1 ? "isn't" : "aren't"} paid.` : "."}`);
  }
  if (slip.attendance.noData > 0) notes.push(`${plural(slip.attendance.noData, "working day", "working days")} of ${label} came before attendance records began; they're paid in full, without a loss-of-pay check.`);
  if (slip.attendance.notYet > 0) notes.push(`${label} isn't over: ${plural(slip.attendance.notYet, "working day hasn't", "working days haven't")} been recorded yet, so late marks, unpaid leave and absences can still change this payslip.`);
  return notes;
}
const Sensitive = ({ name, masked }) => <dd data-field={name} className={masked ? "masked" : "text-muted"}>{masked || "Not on file"}</dd>;

// What the page shows: { forbidden } | { message: [title, text, keepWhole] } | { user, slip, own }
function pick(me, asked) {
  const employee = asked.employee;
  const scope = !employee || employee === me ? (me ? "own" : "no-id") : can("payslips:view") ? "other" : "forbidden";
  if (scope === "forbidden") return { forbidden: true };
  if (scope === "no-id") return { message: ["Your payslip can't be shown", "This session has no employee ID. Sign out and back in to see your payslips."] };
  const own = scope === "own";
  const userId = employee || me;
  const user = getUser(userId);
  if (!user) return { own, message: ["No such employee", `There's no employee with the ID ${userId}.`] };
  const slips = payslipsFor(user.id, todayIso());
  if (!slips.length) return { own, message: [`No payslips for ${user.name}`, user.status === "inactive" ? `${user.name} is inactive and isn't in payroll.` : "There's no month with attendance records yet, so no payslip can be worked out."] };
  let slip = slips[0];
  if (asked.month) {
    const match = /^(\d{4})-(\d{2})$/.exec(asked.month);
    if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) return { own, message: ["That isn't a month", `The link asks for "${asked.month}". A month looks like 2026-09.`, true] };
    slip = slips.find((s) => s.month === asked.month);
    // 13c, rer's empty range: the one message as the title, then why
    if (!slip) return { own, message: [NO_DATA, missingMonthText(asked.month, slips, user, own)] };
  }
  return { own, user, slip };
}

export default function PayslipView() {
  const { userId: me } = useSession();
  const search = new URLSearchParams(useLocation().search);
  const asked = { employee: (search.get("employee") ?? "").trim(), month: (search.get("month") ?? "").trim() };
  const v = useData(() => pick(me, asked), [me, asked.employee, asked.month]);
  const label = v.slip ? monthLabel(v.slip.month) : "";
  const whose = v.slip && !v.own ? `, ${v.user.name}` : "";
  useEffect(() => { if (!v.forbidden) document.title = v.slip ? `Payslip, ${label}${whose} | OfficeOS` : "Payslip | OfficeOS"; });
  if (v.forbidden) return <Navigate to={pageUrl("errors/403.html")} replace />;

  const back = !v.own && v.own !== undefined && can("payroll:view") ? [pageUrl("payroll/payroll-run.html"), "Payroll run", "Back to payroll run"] : [pageUrl("payroll/payslips.html"), "My payslips", "Back to payslips"];
  const { user, slip } = v;
  const noSalary = slip?.holdReason === NO_SALARY;
  const status = slip && STATUS[approved(slip) && slip.status === "draft" ? "approved" : slip.status];
  const notes = slip ? notesOf(slip) : [];
  const dd = (name, text, className) => <dd data-field={name} className={className}>{text}</dd>;

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <ol className="breadcrumb mb-2" aria-label="Breadcrumb">
            <li className="breadcrumb__item"><Link to={back[0]} id="payslip-crumb-parent">{back[1]}</Link></li>
            <li className="breadcrumb__item" aria-current="page" id="payslip-crumb">{slip ? (v.own ? label : `${user.name}, ${label}`) : "Payslip"}</li>
          </ol>
          <h1 id="payslip-title">{slip ? `Payslip, ${label}` : "Payslip"}</h1>
          <p className="page-header__subtitle" id="payslip-subtitle">{slip ? (v.own ? statusLine(slip) : `${user.name} (${user.id}). ${statusLine(slip)}`) : ""}</p>
        </div>
        <div className="page-header__actions">
          <Link className="btn" to={back[0]} id="payslip-back">{back[2]}</Link>
          <button className="btn btn--primary" type="button" id="payslip-print" onClick={() => window.print()} hidden={!slip || undefined}>Print or save as PDF</button>
        </div>
      </div>
      <section className="card" id="payslip-message" hidden={Boolean(slip) || undefined}>
        <div className="empty">
          <h3 className="empty__title" id="payslip-message-title">{v.message?.[0]}</h3>
          <p className="empty__text" id="payslip-message-text">{v.message ? (v.message[2] ? <KeepWhole text={v.message[1]} /> : v.message[1]) : null}</p>
        </div>
      </section>
      <article className="payslip" id="payslip" aria-label={slip ? `Payslip for ${label}${whose}` : "Payslip"} hidden={!slip || undefined}>
        {!slip && <div id="payslip-notes" hidden />}
        {slip && (
          <>
            <header className="payslip__head">
              <div className="payslip__brand">
                <span className="payslip__logo">N</span>
                <div className="payslip__company"><strong>Northwind Technologies Pvt. Ltd.</strong><span>Sector 44, Gurugram, Haryana 122003</span></div>
              </div>
              <div className="payslip__period">
                <span>Payslip for</span>
                <strong id="payslip-month">{label}</strong>
                <small className="text-muted" id="payslip-period">{`Pay period ${formatRange(slip.period.from, slip.period.to)} ${slip.month.slice(0, 4)}`}</small>
              </div>
            </header>
            <dl className="payslip__info">
              <div><dt>Employee name</dt>{dd("name", user.name)}</div>
              <div><dt>Employee ID</dt>{dd("id", user.id)}</div>
              <div><dt>Designation</dt>{dd("designation", orDash(user.designation))}</div>
              <div><dt>Department</dt>{dd("department", orDash(departmentName(user.department)))}</div>
              <div><dt>Date of joining</dt>{dd("joined", orDash(user.dateOfJoining))}</div>
              <div><dt>Pay date</dt>{dd("pay-date", "Not set", "text-muted")}</div>
              <div><dt>Bank account</dt><Sensitive name="bank" masked={maskAccount(user.bankAccountLast4)} /></div>
              <div><dt>PAN</dt><Sensitive name="pan" masked={maskPan(user.pan)} /></div>
              <div><dt>Tax regime</dt>{dd("regime", REGIME[slip.regime] ?? orDash(slip.regime))}</div>
              <div><dt>Working days</dt>{dd("working-days", String(slip.workingDays))}</div>
              <div><dt>Days paid</dt>{dd("days-paid", String(slip.workingDays - slip.lop.days))}</div>
              <div><dt>Loss of pay days</dt>{dd("lop-days", String(slip.lop.days))}</div>
            </dl>
            <div className="payslip__cols" id="payslip-cols" hidden={noSalary || undefined}>
              <section className="payslip__col">
                <h3>Earnings</h3>
                <dl>
                  {[["basic", "Basic salary"], ["hra", "House rent allowance"], ["conveyance", "Conveyance allowance"], ["special", "Special allowance"]].map(([k, t]) => <div className="pay-line" key={k}><dt>{t}</dt>{dd(k, rupees(slip.earnings[k]))}</div>)}
                  <div className="pay-line pay-line--total"><dt>Gross earnings</dt>{dd("gross", rupees(slip.gross))}</div>
                </dl>
              </section>
              <section className="payslip__col">
                <h3>Deductions</h3>
                <dl>
                  {[["pf", "Provident fund"], ["pt", "Professional tax"], ["tds", "Income tax (TDS), sample tax rates"]].map(([k, t]) => <div className="pay-line" key={k}><dt>{t}</dt>{dd(k, rupees(slip.deductionLines[k]))}</div>)}
                  <div className="pay-line pay-line--total"><dt>Total deductions</dt>{dd("deductions", rupees(slip.deductions))}</div>
                </dl>
              </section>
            </div>
            <div className="payslip__net">
              <div><span>Net pay (gross earnings minus deductions)</span><strong data-field="net">{noSalary ? "—" : rupees(slip.net)}</strong></div>
              <Badge {...badgeOf(status?.badge ?? "badge")} id="payslip-status" title={slip.holdReason ?? ""}>{status?.label ?? slip.status}</Badge>
            </div>
            <p className="payslip__words" id="payslip-words" hidden={noSalary || undefined}>{`Amount in words: ${rupeesInWords(slip.net)}`}</p>
            <div id="payslip-notes" hidden={!notes.length || undefined}>{notes.map((t) => <p className="payslip__words" key={t}>{t}</p>)}</div>
            <footer className="payslip__foot">
              <span>This is a computer-generated payslip and does not need a signature.</span>
              <span>Bank and PAN details are always masked on payslips. HR and Admins can see them in full on the employee's profile.</span>
            </footer>
          </>
        )}
      </article>
    </Frame>
  );
}
