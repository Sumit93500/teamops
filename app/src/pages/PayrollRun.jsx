// Payroll run (pages/payroll/payroll-run.html + assets/js/pages/payroll-run.js), ported (round 11), for payroll:view. One month's
// run from data/payroll-store.js (?month=YYYY-MM, else runMonth()): the title and pay period, the month links, the stats, the
// run's progress, every employee in it (search, status filter, View payslip), the checks before approval, the run details and
// the alert, and Prepare / Approve (the store's writes; a disabled button says why under the buttons). A link whose month isn't
// one says so (Round Forms); a month with no data (runMonthState(), round 5) says "No data in this range." and why, as the
// stopped Empty ranges round drew it. Nothing here works out pay; the store does. P4a: a month from the statutory rules start
// month (Settings > Payroll) is shown by the new engine (data/pay-engine.js payFor): PF, ESI, professional tax, LWF and TDS by
// person with the office's state, the employer's cost, the statutory totals (the challan and filing figures stay samples) and
// an Unverified banner; earlier months are as they were. Components: StatCard, Stepper, Table, Badge,
// PersonCell, EmptyState, NotBuilt, Reason.
import { useEffect, useId, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { payrollRun, storedRun, approversFor, canApprove, runProblems, prepareProblem, approveProblem, prepareRun, approveRun, runTotals, runMonth, waitingSalaryChanges, runMonthState } from "../../../assets/js/data/payroll-store.js";
import { ATTENDANCE_RULES } from "../../../assets/js/data/attendance-store.js";
import { getUser } from "../../../assets/js/data/store.js";
import { prepareRunWithSnapshot, approveRunWithSnapshot, approveSnapshotProblem, payForFinal } from "../../../assets/js/data/pay-runs.js";
import { usesNewRules, statutoryFrom } from "../../../assets/js/data/pay-settings.js";
import { officeOf } from "../../../assets/js/data/offices-store.js";
import { ROLES } from "../../../assets/js/config/roles.js";
import { getCurrentUserId } from "../../../assets/js/core/auth.js";
import { nameOf, plural, departmentName, todayIso, monthName, formatRange, formatDay } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { useToast } from "../ui/Toast.jsx";
import { StatStrip, StatCard, Stepper, Badge, badgeOf, PersonCell, EmptyState, NotBuilt, Reason, NO_DATA } from "../components/Basics.jsx";
import { KeepWhole, rupees, UnverifiedNote } from "../ui/payroll.jsx";
import { Card } from "../components/Layout.jsx";
import { useData, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { pageUrl } from "../routes.js";

const PAGE = "payroll/payroll-run.html";
const RUN_URL = pageUrl(PAGE);
const ROW_STATUS = { draft: { label: "Draft", badge: "badge badge--warning badge--dot" }, "on-hold": { label: "On hold", badge: "badge badge--danger badge--dot" } };
const RUN_STATUS = {
  draft: { label: "Draft", badge: "badge badge--warning badge--dot", done: 1, current: 2, net: "Draft, not paid yet" },
  prepared: { label: "Prepared", badge: "badge badge--info badge--dot", done: 2, current: 3, net: "Prepared, not approved yet" },
  approved: { label: "Approved", badge: "badge badge--success badge--dot", done: 3, current: 0, net: "Approved, not paid yet" },
};
const NO_BANK = "No bank account on file", NO_SALARY = "No salary on file for this month";
const STATS = [
  ["employees", "Employees", 1, "M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-2a4 4 0 0 0-3-3.8M16 3.2a3.5 3.5 0 0 1 0 6.6"],
  ["gross", "Gross pay", 3, "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M17 14h1"],
  ["deductions", "Deductions", 4, "M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"],
  ["net", "Net pay", 2, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M8 12l3 3 5-6"],
];
const people = (n) => plural(n, "employee", "employees");
const workingDays = (n) => plural(n, "working day", "working days");
const monthLabel = (month) => `${monthName(Number(month.slice(5, 7)))} ${month.slice(0, 4)}`;
const dayOf = (stamp) => formatDay(stamp.slice(0, 10), true);
const rowName = (row) => row.name ?? getUser(row.userId)?.name ?? row.userId;
const rowDepartment = (row) => ("department" in row ? row.department : getUser(row.userId)?.department);
const approverNames = (run) => approversFor(run).map((u) => `${u.name}, ${ROLES[u.role]?.label ?? u.role}`);
const B = ({ cls, children, ...props }) => <Badge {...badgeOf(cls)} {...props}>{children}</Badge>;

// The month links: the month before and, up to this month, the one after.
function Months({ month }) {
  const y = Number(month.slice(0, 4)), m = Number(month.slice(5, 7));
  const key = (year, mm) => `${year}-${String(mm).padStart(2, "0")}`;
  const before = m === 1 ? key(y - 1, 12) : key(y, m - 1);
  const after = m === 12 ? key(y + 1, 1) : key(y, m + 1);
  const link = (mm, text) => <Link className="link" to={`${RUN_URL}?month=${mm}`} title={monthLabel(mm)}>{text}</Link>;
  return <p className="page-header__subtitle" id="run-months">{link(before, "Previous month")}{after <= todayIso().slice(0, 7) && <>{" · "}{link(after, "Next month")}</>}</p>;
}

function openAbsencesText(open) {
  const waiting = open.filter((a) => a.waiting).length;
  const correctable = open.filter((a) => !a.waiting);
  const until = correctable.map((a) => a.until).sort().at(-1);
  const which = (n) => (n < open.length ? String(n) : n === 1 ? "it" : "they");
  const why = [correctable.length ? `${which(correctable.length)} can still be corrected until ${formatDay(until)}` : "",
    waiting ? `${which(waiting)} ${waiting === 1 ? "has" : "have"} a correction or leave request waiting for a decision` : ""].filter(Boolean).join("; ");
  return `${plural(open.length, "absence isn't", "absences aren't")} deducted yet: ${why}.`;
}
const DONE = ["badge badge--success", "Done"];
// The checks before approval (payroll-run.js renderChecks): [title, sub, badge class, badge text, kind]
function checks(run) {
  const label = monthLabel(run.month);
  const most = (key) => Math.max(0, ...run.rows.map((r) => r.attendance[key]));
  const noData = most("noData"), notYet = most("notYet");
  const open = run.rows.flatMap((r) => r.attendance.openAbsences);
  const uncounted = run.rows.filter((r) => r.attendance.uncountedAbsences > 0);
  const paused = run.rows.filter((r) => r.attendance.pausedLateMarks > 0);
  const parts = [];
  if (noData) parts.push(`${workingDays(noData)} of ${label} came before attendance records began; they're paid in full, without a loss-of-pay check.`);
  if (notYet) parts.push(`${label} isn't over: ${plural(notYet, "working day hasn't", "working days haven't")} been recorded yet, so late marks, unpaid leave and absences can still change these figures.`);
  if (open.length) parts.push(openAbsencesText(open));
  if (paused.length) {
    const marks = paused.reduce((sum, r) => sum + r.attendance.pausedLateMarks, 0);
    parts.push(`${plural(marks, "late mark isn't", "late marks aren't")} counted yet: a late-arrival correction for ${marks === 1 ? "it is" : "each is"} waiting for a decision (${paused.map(rowName).join(", ")}).`);
  }
  if (uncounted.length) parts.push(`Not counted, with no readable joining date on file: ${uncounted.map((r) => `${rowName(r)} (${plural(r.attendance.uncountedAbsences, "absence", "absences")})`).join(", ")}.`);
  const joiners = run.rows.filter((r) => r.attendance.beforeJoining > 0);
  if (joiners.length) parts.push(`Joined during ${label}: ${joiners.map((r) => `${rowName(r)} (joined ${formatDay(r.attendance.joined)}, ${workingDays(r.attendance.beforeJoining)} before)`).join(", ")}. The month is paid from the joining date.`);
  const leavers = run.rows.filter((r) => r.attendance.lastDay);
  if (leavers.length) parts.push(`Left during ${label}: ${leavers.map((r) => `${rowName(r)} (last working day ${formatDay(r.attendance.lastDay)}, ${workingDays(r.lop.leftDays ?? 0)} after)`).join(", ")}. The month is paid up to the last working day.`);
  const attBadge = noData || uncounted.length || joiners.length || leavers.length ? ["badge badge--warning", "Review"] : notYet || open.length || paused.length ? ["badge badge--info", "In progress"] : DONE;

  const waiting = waitingSalaryChanges(Number(run.month.slice(0, 4)), Number(run.month.slice(5, 7)));
  const salary = waiting.length
    ? [`${plural(waiting.length, "salary change is", "salary changes are")} waiting for a decision (${[...new Set(waiting.map((p) => nameOf(p.userId)))].sort((a, b) => a.localeCompare(b, "en")).join(", ")})`, "badge badge--info", "In progress"]
    : [`No salary change for ${label} is waiting for a decision`, ...DONE];
  const noBank = run.rows.filter((r) => r.holdReason === NO_BANK).length;
  const noSalary = run.rows.filter((r) => r.holdReason === NO_SALARY).length;
  const lopRows = run.rows.filter((r) => r.lop.days > 0);
  const lopDays = lopRows.reduce((sum, r) => sum + r.lop.days, 0);
  const month = monthName(Number(run.month.slice(5, 7)));
  return [
    ["Attendance recorded", parts.join(" ") || `Every working day of ${label} is recorded`, ...attBadge, "computed"],
    ["Bank details missing", noBank ? `${people(noBank)} can't be paid until a bank account is added` : "Everyone in this run has a bank account on file", ...(noBank ? ["badge badge--danger", "Fix"] : DONE), "computed"],
    ["No salary on file", noSalary ? `${people(noSalary)} on hold with no salary for ${month}` : `Everyone in this run has a salary for ${month}`, ...(noSalary ? ["badge badge--danger", "Fix"] : DONE), "computed"],
    ["Salary changes waiting", ...salary, "computed"],
    ["Loss-of-pay days", lopRows.length ? `${plural(lopRows.length, "employee has", "employees have")} unpaid days (${plural(lopDays, "day", "days")}, ${rupees((run.totals ?? runTotals(run)).lossOfPay)})` : "No one has unpaid days this month",
      ...(lopRows.length ? ["badge badge--info", "Review"] : DONE), "computed"],
    ["Approved leave included", "Approved unpaid leave is deducted; pending requests aren't counted", ...DONE, "rule"],
    ["Unexplained absences", `A working day with no check-in and no approved leave costs a day's pay once its ${ATTENDANCE_RULES.requestWindowDays}-day correction window has closed and no correction or leave request for it is waiting; days before someone's joining date aren't counted`, ...DONE, "rule"],
  ];
}
function alertText(run, me, approveBlock) {
  const label = monthLabel(run.month);
  if (run.status === "approved") return `${nameOf(run.approvedBy)} approved this run on ${dayOf(run.approvedAt)}. Its figures are final: the payslips for ${label} show them, and they can't be changed. Paying isn't built yet.`;
  if (run.status === "prepared") {
    const preparer = nameOf(run.preparedBy);
    let lead;
    if (me && me === run.preparedBy) lead = "You prepared this run, so someone else has to approve it.";
    else if (!approveBlock) lead = `${preparer} prepared this run. You can approve it.`;
    else if (canApprove(run, me)) lead = `${preparer} prepared this run. ${approveBlock}`;
    else lead = `${preparer} prepared this run. An Admin who didn't prepare it has to approve it.`;
    return `${lead} Its figures were fixed when it was prepared, on ${dayOf(run.preparedAt)}; if attendance or leave changes them before it's approved, it has to be prepared again.`;
  }
  const problems = runProblems(Number(run.month.slice(0, 4)), Number(run.month.slice(5, 7)));
  const gate = problems.length ? `It can't be prepared yet: ${problems.join("; ")}.` : "It can be prepared now, which fixes these figures for approval.";
  return `This run isn't prepared yet, so these figures are worked out from the live attendance and leave records each time the page opens. ${gate}`;
}

// The page without a run: a link whose month isn't one, or a month with no data. The heading stays; the actions are hidden
// (as the old page hid its .page-header__actions, buttons and all).
function NoRun({ title, months, card }) {
  const canPrepare = useCan("payroll:create"), canApproveIt = useCan("payroll:approve"), canExport = useCan("payroll:export");
  return (
    <>
      <div className="page-header">
        <div>
          <h1 id="run-title">{title}</h1>
          <p className="page-header__subtitle" id="run-subtitle"></p>
          {months ? <Months month={months} /> : <p className="page-header__subtitle" id="run-months"></p>}
        </div>
        <div className="page-header__actions" hidden>
          <NotBuilt what="Export bank file" data-permission="payroll:export" hidden={!canExport || undefined} />
          <button className="btn" type="button" id="prepare-run" data-permission="payroll:create" hidden={!canPrepare || undefined} disabled>Prepare run</button>
          <button className="btn btn--primary" type="button" id="approve-run" data-permission="payroll:approve" hidden={!canApproveIt || undefined} disabled>Approve run</button>
        </div>
      </div>
      <div className="stack"><section className="card">{card}</section></div>
    </>
  );
}

function Run({ asked }) {
  const showToast = useToast();
  const canPrepare = useCan("payroll:create"), canApproveIt = useCan("payroll:approve"), canExport = useCan("payroll:export"), canSlips = useCan("payslips:view");
  const ids = { prepare: useId(), approve: useId() };
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const match = /^(\d{4})-(\d{2})$/.exec(asked);
  const viewed = match && Number(match[2]) >= 1 && Number(match[2]) <= 12 ? { year: Number(match[1]), month: Number(match[2]) } : asked ? null : runMonth(todayIso());
  const state = viewed && runMonthState(viewed.year, viewed.month, todayIso());
  const d = useData(() => {
    if (!viewed || state?.empty) return null;
    const run = storedRun(viewed.year, viewed.month) ?? payrollRun(viewed.year, viewed.month);
    const me = getCurrentUserId();
    const key = `${viewed.year}-${String(viewed.month).padStart(2, "0")}`;
    // P5: an approved month reads its frozen snapshot; any other month is live (a draft, not final)
    const finals = usesNewRules(key) ? Object.fromEntries(run.rows.map((r) => [r.userId, payForFinal(r.userId, viewed.year, viewed.month)])) : null;
    const newPay = finals ? Object.fromEntries(Object.entries(finals).map(([id, f]) => [id, f?.pay ?? null])) : null;
    const final = Boolean(finals) && Object.values(finals).every((f) => f?.final);
    return { run, me, newPay, final, approvers: run.status === "approved" ? [] : approverNames(run), prepareBlock: prepareProblem(me, viewed.year, viewed.month), approveBlock: approveSnapshotProblem(me, viewed.year, viewed.month) };
  }, [asked]);
  const emptyKey = viewed && `${viewed.year}-${String(viewed.month).padStart(2, "0")}`;
  const title = d ? `Payroll run, ${monthLabel(d.run.month)}` : state?.empty ? `Payroll run, ${monthLabel(emptyKey)}` : "Payroll run";
  useEffect(() => { if (viewed) document.title = `${title} | OfficeOS`; });

  if (!viewed) {
    return <NoRun title="Payroll run" card={<EmptyState title="That isn't a month" text={<KeepWhole text={`The link asks for "${asked}". A month looks like 2026-09.`} />} to={RUN_URL} linkText="Back to payroll run" />} />;
  }
  if (state?.empty) {
    const label = monthLabel(emptyKey);
    let why = "Nothing is on record yet, so there's no run to work out.";
    if (state.emptyReason === "after-current") why = `${label} comes after the current payroll month, ${monthLabel(state.currentMonth)}, so there's nothing to work out yet.`;
    else if (state.firstMonth) why = `Attendance records start in ${monthLabel(state.firstMonth)}, so there's no run before that.`;
    return <NoRun title={title} months={emptyKey} card={<EmptyState title={NO_DATA} text={<KeepWhole text={why} />} to={RUN_URL} linkText="Back to this month's run" />} />;
  }
  const { run, me, approvers, prepareBlock, approveBlock, newPay, final } = d;
  const label = monthLabel(run.month);
  const st = RUN_STATUS[run.status];
  const totals = run.totals ?? runTotals(run);
  const onHold = run.rows.filter((r) => r.status === "on-hold").length;
  const values = {
    employees: [String(run.rows.length), `${onHold} on hold`], gross: [rupees(totals.gross), totals.lossOfPay > 0 ? `After ${rupees(totals.lossOfPay)} loss of pay` : "No loss of pay"],
    deductions: [rupees(totals.deductions), "PF, PT and TDS (sample tax rates)"], net: [rupees(totals.net), st.net],
  };
  // P4a: from the start month the figures are the new engine's
  const pays = newPay ? run.rows.map((r) => newPay[r.userId]).filter(Boolean) : [];
  const sum = (f) => pays.reduce((s, p) => s + f(p), 0);
  const nt = newPay ? { gross: sum((p) => p.gross), pf: sum((p) => p.deductions.pf), esi: sum((p) => p.deductions.esi), pt: sum((p) => p.deductions.pt), lwf: sum((p) => p.deductions.lwf), tds: sum((p) => p.deductions.tds),
    deductions: sum((p) => p.deductionsTotal), net: sum((p) => p.net), employer: sum((p) => p.employer.total), ctc: sum((p) => p.costToCompany), unverified: pays.some((p) => p.unverified) } : null;
  if (nt) Object.assign(values, { gross: [rupees(nt.gross), "After loss of pay, by the new rules"], deductions: [rupees(nt.deductions), "PF, ESI, PT, LWF and TDS"], net: [rupees(nt.net), st.net], employer: [rupees(nt.employer), `Cost to company ${rupees(nt.ctc)}`] });
  const money = (r, pick) => { const p = newPay?.[r.userId]; return p ? rupees(pick(p)) : "—"; };
  const period = run.rows[0]?.period;
  const stepState = (n) => (n <= st.done ? "done" : n === st.current ? "current" : "");
  const steps = [["Draft", "Worked out from the live records"],
    ["Prepared", run.status === "draft" ? "Not prepared yet" : `By ${nameOf(run.preparedBy)} on ${dayOf(run.preparedAt)}`],
    ["Approval", run.status === "approved" ? `By ${nameOf(run.approvedBy)} on ${dayOf(run.approvedAt)}` : approvers.join("; ") || "No one can approve it yet"],
    ["Payment", "Not built yet"]].map(([t, detail], i) => ({ state: stepState(i + 1), title: t, detail }));
  const query = search.trim().toLowerCase();
  const shown = run.rows.filter((r) => (!status || r.status === status) && (!query || rowName(r).toLowerCase().includes(query)));
  const columns = [
    { key: "employee", label: "Employee", render: (r) => <PersonCell userId={r.userId} name={rowName(r)} sub={[departmentName(rowDepartment(r)), r.holdReason].filter(Boolean).join(", ")} /> },
    ...(newPay ? [
      { key: "state", label: "State", render: (r) => newPay[r.userId]?.state ?? "Not set" },
      { key: "gross", label: "Gross", num: true, render: (r) => money(r, (p) => p.gross) },
      { key: "pf", label: "PF", num: true, render: (r) => money(r, (p) => p.deductions.pf) },
      { key: "esi", label: "ESI", num: true, render: (r) => money(r, (p) => p.deductions.esi) },
      { key: "pt", label: "PT", num: true, render: (r) => money(r, (p) => p.deductions.pt) },
      { key: "lwf", label: "LWF", num: true, render: (r) => money(r, (p) => p.deductions.lwf) },
      { key: "tds", label: "TDS", num: true, render: (r) => money(r, (p) => p.deductions.tds) },
      { key: "net", label: "Net pay", num: true, render: (r) => money(r, (p) => p.net) },
      { key: "employer", label: "Employer cost", num: true, render: (r) => money(r, (p) => p.employer.total) },
    ] : [
      { key: "gross", label: "Gross", num: true, render: (r) => rupees(r.gross) },
      { key: "deductions", label: "Deductions", num: true, render: (r) => rupees(r.deductions) },
      { key: "net", label: "Net pay", num: true, render: (r) => rupees(r.net) },
    ]),
    { key: "status", label: "Status", render: (r) => { const s = r.status === "draft" ? st : ROW_STATUS[r.status]; return <B cls={s?.badge ?? "badge"} title={r.holdReason || undefined}>{s?.label ?? r.status}</B>; } },
    { key: "actions", label: "Actions", actions: true, render: (r) => <Link className="btn btn--sm" to={`${pageUrl("payroll/payslip-view.html")}?employee=${encodeURIComponent(r.userId)}&month=${r.month}`} data-permission="payslips:view" hidden={!canSlips || undefined}>View payslip</Link> },
  ];
  const decide = (write, done) => () => {
    const result = write(getCurrentUserId(), viewed.year, viewed.month);
    if (!result.ok) { showToast(result.error, "danger"); return; }
    showToast(done(monthLabel(result.record.month)), "success");
    bump();
  };
  const stored = run.status !== "draft";

  return (
    <>
      <div className="page-header">
        <div>
          <h1 id="run-title">{title}</h1>
          <p className="page-header__subtitle" id="run-subtitle">{period ? `Pay period ${formatRange(period.from, period.to)} ${run.month.slice(0, 4)}; no pay date set` : "No pay date set"}</p>
          <Months month={run.month} />
        </div>
        <div className="page-header__actions">
          <NotBuilt what="Export bank file" data-permission="payroll:export" hidden={!canExport || undefined} />
          <button className="btn" type="button" id="prepare-run" data-permission="payroll:create" hidden={!canPrepare || undefined} disabled={Boolean(prepareBlock)}
            title={prepareBlock || (run.status === "prepared" ? `Fix ${label}'s figures again, as they are now` : `Fix ${label}'s figures for approval`)}
            aria-describedby={prepareBlock ? ids.prepare : undefined} onClick={decide(prepareRunWithSnapshot, (l) => `${l}'s run is prepared: its figures are fixed for approval.`)}>
            {run.status === "prepared" ? "Prepare again" : "Prepare run"}
          </button>
          <button className="btn btn--primary" type="button" id="approve-run" data-permission="payroll:approve" hidden={!canApproveIt || undefined} disabled={Boolean(approveBlock)}
            title={approveBlock || `Approve the ${monthName(viewed.month)} run`} aria-describedby={approveBlock ? ids.approve : undefined}
            onClick={decide(approveRunWithSnapshot, (l) => `${l}'s run is approved.`)}>Approve run</button>
          <Reason id={ids.prepare} text={prepareBlock} permission="payroll:create" hidden={!canPrepare} />
          <Reason id={ids.approve} text={approveBlock} permission="payroll:approve" hidden={!canApproveIt} />
        </div>
      </div>
      <div className="stack">
        <StatStrip label="Key numbers">
          {[...STATS, ...(nt ? [["employer", "Employer cost", 1, STATS[1][3]]] : [])].map(([key, l, tone, icon]) => <StatCard key={key} id={key} icon={icon} tone={tone} label={l} value={values[key][0]} note={values[key][1]} />)}
        </StatStrip>
        {nt && (
          <Card id="run-statutory" title="Statutory totals" meta={`${final ? "Final" : "Draft, not final"}; rules as of ${formatDay(`${run.month}-01`, true)}; the new rules start with ${monthLabel(statutoryFrom())}`}
            footer={<span className="ds-card__meta">Challan and filing figures are samples: nothing is filed or paid from this page.</span>}>
            {nt.unverified && <UnverifiedNote id="run-unverified" />}
            <dl className="kv" id="run-statutory-totals">
              {[["pf", "Provident fund (employees)", nt.pf], ["esi", "Employee state insurance (employees)", nt.esi], ["pt", "Professional tax", nt.pt], ["lwf", "Labour welfare fund (employees)", nt.lwf], ["tds", "Income tax (TDS)", nt.tds],
                ["employer", "Employer contributions, all", nt.employer], ["ctc", "Cost to company", nt.ctc]].map(([k, t, n]) => <div className="kv__row" key={k}><dt>{t}</dt><dd data-field={k}>{rupees(n)}</dd></div>)}
            </dl>
          </Card>
        )}
        <section className="card">
          <div className="card__header">
            <h3 className="card__title">Run progress</h3>
            <B cls={st.badge} id="run-status">{st.label}</B>
          </div>
          <div className="card__body"><Stepper id="run-steps" vertical={false} steps={steps} /></div>
        </section>
        <div className="grid grid-main-aside">
          <section className="card">
            <div className="table__toolbar">
              <h3 className="card__title">Employees in this run</h3>
              <div className="table__filters">
                <div className="input-group">
                  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  <input className="input input--sm input--search" id="run-search" type="search" placeholder="Search employees" aria-label="Search employees" data-table-filter="off" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select className="select select--sm" id="run-status-filter" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All statuses</option><option value="draft">{st.label}</option><option value="on-hold">On hold</option>
                </select>
              </div>
            </div>
            <Table bare pager={false} tbodyId="run-rows" columns={columns} rows={shown} rowKey={(r) => r.userId} rowProps={(r) => ({ "data-user-id": r.userId })} empty="No employees match these filters." />
            <div className="card__footer"><span className="card__meta" id="run-rows-meta">{`Showing ${shown.length} of ${people(run.rows.length)}`}</span></div>
          </section>
          <aside className="stack">
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Checks before approval</h3>
                <span className="card__meta" id="run-checks-meta">{`${checks(run).length} checks`}</span>
              </div>
              <div className="list" id="run-checks">
                {checks(run).map(([t, sub, cls, text, kind]) => (
                  <div className="list__item" data-check={kind} key={t}>
                    <div className="list__content"><span className="list__title">{t}</span><span className="list__sub">{sub}</span></div>
                    <B cls={cls}>{text}</B>
                  </div>
                ))}
              </div>
            </section>
            <section className="card">
              <div className="card__header"><h3 className="card__title">Run details</h3></div>
              <div className="card__body">
                <dl className="kv">
                  <div className="kv__row"><dt>Prepared by</dt><dd id="run-prepared-by">{stored ? nameOf(run.preparedBy) : "Not prepared yet"}</dd></div>
                  <div className="kv__row"><dt>Approver</dt><dd id="run-approver">{run.status === "approved" ? `Approved by ${nameOf(run.approvedBy)} on ${dayOf(run.approvedAt)}` : approvers.join("; ") || "No one"}</dd></div>
                  <div className="kv__row"><dt>Figures fixed on</dt><dd className={stored ? undefined : "text-muted"} id="run-fixed-on">{stored ? dayOf(run.preparedAt) : "Not fixed: worked out live"}</dd></div>
                  {newPay && <div className="kv__row"><dt>Figures</dt><dd id="run-rules-note">{final ? "Final: frozen when the run was approved. Later rule, template or declaration changes don't alter them." : "Draft, not final: worked out from the live records. Preparing stores them; approving freezes them."}</dd></div>}
                  <div className="kv__row"><dt>Pay date</dt><dd className="text-muted">Not set</dd></div>
                  <div className="kv__row"><dt>Bank file</dt><dd className="text-muted">Not built yet</dd></div>
                </dl>
              </div>
            </section>
            <div className="alert alert--warning" id="run-alert">{alertText(run, me, approveBlock)}</div>
          </aside>
        </div>
      </div>
    </>
  );
}

export default function PayrollRun() {
  const asked = (new URLSearchParams(useLocation().search).get("month") ?? "").trim();
  return <Frame page={PAGE}><Run key={asked} asked={asked} /></Frame>;
}
