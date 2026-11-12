// Approval workflows (pages/access/approval-workflows.html + assets/js/pages/approval-workflows.js), ported (round 16).
// The stat strip's three request figures come from five kinds of request: leave, attendance corrections, expense claims,
// asset requests and salary changes (those only with salary:view, as ui/waiting.js counts them); a payroll run isn't sent as
// a request, so it isn't counted.
//   Requests this month    sent this calendar month (by the local day), and the change from last month
//   Average decision time  from sending to the final decision, over requests that got one (approved, rejected, paid,
//                          fulfilled or closed); auto-approved ones are left out, and so is an Admin's own salary change
//   Waiting over 2 days    still pending, sent more than 2 days ago
// The workflows table and the side cards are the page's own description, as the old HTML had them (the samples marked).
// The "₹62,000 example" follows the real ₹62,000 claim (EXP-3103) at the stage it is really at; without it (an old saved
// copy) the steps stay as the HTML drew them. Components: StatCard, Table, Badge, Stepper, NotBuilt.
import { Link } from "react-router-dom";
import { can } from "../../../assets/js/core/rbac.js";
import { allRequests } from "../../../assets/js/data/leave-store.js";
import { allRegularizations } from "../../../assets/js/data/attendance-store.js";
import { allExpenses, getExpense } from "../../../assets/js/data/expenses-store.js";
import { allAssetRequests } from "../../../assets/js/data/asset-requests-store.js";
import { salaryProposals } from "../../../assets/js/data/payroll-store.js";
import { todayIso, monthName, plural } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { StatStrip, StatCard, Badge, Stepper, NotBuilt } from "../components/Basics.jsx";
import { useData, useSession } from "../data/hooks.js";
import { usePerm } from "../ui/perm.js";
import { pageUrl } from "../routes.js";

const PAGE = "access/approval-workflows.html";
const DAY_MS = 24 * 60 * 60 * 1000;
const DECIDED = ["approved", "rejected", "paid", "fulfilled", "closed"];
const DECISIONS = ["approved", "rejected", "auto-approved"];
const ICONS = {
  workflows: "M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0", requests: "M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6",
  decision: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2", waiting: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0",
};
const PLUS = "M12 5v14M5 12h14";
const ACTIVE = { label: "Active", tone: "success", dot: true };
const NOT_BUILT = { label: "Not built", tone: "", dot: true };
// The workflows, as the old page described them: [request, what it covers, the chain, the condition, status]
const WORKFLOWS = [
  ["Leave", "Casual, sick, earned, work from home, unpaid", ["Employee", "Manager", "HR"], "All leave types. No manager on file: straight to HR", ACTIVE],
  ["Attendance regularization", "Late or missed punches", ["Employee", "Manager", "HR"], "Sent within 7 days. No manager on file: straight to HR", ACTIVE],
  ["Expense claim", "Travel and reimbursements", ["Employee", "Manager", "Finance", "Admin"], "Admin added above ₹50,000. A stage nobody else can decide is skipped", ACTIVE],
  ["Purchase order", "Stock and equipment", ["Admin", "Another Admin"], "Two other Admins above ₹1,00,000", NOT_BUILT],
  ["Role change", "Giving or removing access", ["HR", "Admin"], "Every change", NOT_BUILT],
  ["Salary revision", "Changes to pay", ["Finance", "Admin"], "Every change. An Admin's own takes effect at once", ACTIVE],
  ["Payroll run", "Monthly salaries", ["Finance", "Admin"], "The person who prepared it can't approve it", ACTIVE],
  ["Asset request", "Laptops, monitors, cards", ["Employee", "Manager", "Admin"], "Every request", ACTIVE],
  ["Backup restore", "Rolling back company data", ["Admin", "Another Admin"], "Admin only", NOT_BUILT],
];
// The example claim's stages after "Employee sends" (always done), as the HTML drew them without the claim.
const EXAMPLE_CLAIM = "EXP-3103";
const PASSED = ["approved", "auto-approved", "skipped"];
const EXAMPLE = [
  { stage: "manager", title: "Manager", detail: "The person they report to confirms the trip happened", state: "done" },
  { stage: "finance", title: "Finance", detail: "Checks the bill and budget", state: "done" },
  { stage: "admin", title: "Admin", detail: "Needed because it is above ₹50,000", state: "current" },
];

// "2026-10" and the month before it, by the local calendar (appliedOn is a local date).
function monthKeys() {
  const [year, month] = todayIso().split("-").map(Number);
  const prev = month === 1 ? [year - 1, 12] : [year, month - 1];
  const key = (y, m) => `${y}-${String(m).padStart(2, "0")}`;
  return { current: key(year, month), previous: key(...prev), previousMonth: prev[1] };
}
// Days from sending to the final decision, or null (not decided, or auto-approved).
function decisionDays(request) {
  if (!DECIDED.includes(request.status)) return null;
  const last = [...request.history].reverse().find((h) => DECISIONS.includes(h.decision));
  if (!last || last.decision === "auto-approved") return null;
  return (Date.parse(last.at) - Date.parse(request.history[0].at)) / DAY_MS;
}
// A salary change read as a request: sent on the day it was entered, and an Admin's own change (final at once, decided by
// who entered it) counted as auto-approved, as an Admin's own leave is.
function asRequest(change) {
  const own = Boolean(change.decidedBy) && change.decidedBy === change.enteredBy;
  return { ...change, appliedOn: change.enteredAt.slice(0, 10),
    history: own ? change.history.map((h) => (h.decision === "approved" ? { ...h, decision: "auto-approved" } : h)) : change.history };
}
function figures() {
  const salary = can("salary:view") ? salaryProposals().map(asRequest) : [];
  const requests = [...allRequests(), ...allRegularizations(), ...allExpenses(), ...allAssetRequests(), ...salary];
  const { current, previous, previousMonth } = monthKeys();
  const now = requests.filter((r) => r.appliedOn?.startsWith(current)).length;
  const change = now - requests.filter((r) => r.appliedOn?.startsWith(previous)).length;
  const times = requests.map(decisionDays).filter((d) => d !== null);
  const pending = requests.filter((r) => r.status === "pending");
  const waiting = pending.filter((r) => (Date.now() - Date.parse(r.history[0].at)) / DAY_MS > 2).length;
  return {
    requests: [String(now), change === 0 ? `Same as ${monthName(previousMonth)}` : `${change > 0 ? "+" : "−"}${Math.abs(change)} vs ${monthName(previousMonth)}`, change > 0 ? "up" : change < 0 ? "down" : ""],
    decision: [times.length ? `${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)} days` : "—", times.length ? `Over ${plural(times.length, "decision", "decisions")}` : "No decisions yet", ""],
    waiting: [String(waiting), pending.length ? `Of ${plural(pending.length, "request", "requests")} waiting for a decision` : "Nothing waiting for a decision", waiting ? "down" : ""],
  };
}
// The example's steps at the stage the claim is really at: done once its history approves (or skips) the stage, current while
// it waits there, rejected if it was turned down there.
function exampleSteps(claim) {
  const steps = EXAMPLE.map((s) => {
    if (!claim) return s;
    const done = claim.history.some((h) => h.stage === s.stage && PASSED.includes(h.decision));
    const rejected = claim.status === "rejected" && claim.history.some((h) => h.stage === s.stage && h.decision === "rejected");
    const current = claim.status === "pending" && claim.stage === s.stage;
    return { ...s, state: done ? "done" : current ? "current" : rejected ? "rejected" : "" };
  });
  return [{ title: "Employee sends", detail: "Bill attached", state: "done" }, ...steps];
}

export default function ApprovalWorkflows() {
  const perm = usePerm();
  const { role } = useSession();
  const f = useData(() => (can("workflows:view") ? figures() : null), [role?.key]);
  const claim = useData(() => getExpense(EXAMPLE_CLAIM), []);
  const stat = (key, label) => <StatCard id={key} icon={ICONS[key]} tone={{ requests: 2, decision: 3, waiting: 4 }[key]} label={label} value={f ? f[key][0] : "—"} note={f ? f[key][1] : ""} noteTone={f ? f[key][2] : ""} />;
  const columns = [
    { key: "request", label: "Request", render: (w) => <><span className="table__user-name">{w[0]}</span><span className="table__user-sub">{w[1]}</span></> },
    { key: "chain", label: "Approval chain", render: (w) => (
      <div className="chain">{w[2].map((step, i) => <span key={i} className={`chain__step${i === 0 ? " chain__step--start" : i === w[2].length - 1 ? " chain__step--end" : ""}`}>{step}</span>)}</div>
    ) },
    { key: "condition", label: "Condition", render: (w) => w[3] },
    { key: "status", label: "Status", render: (w) => <Badge tone={w[4].tone} dot={w[4].dot}>{w[4].label}</Badge> },
    { key: "actions", label: "Actions", actions: true, render: () => <NotBuilt what="Edit" className="btn btn--sm" {...perm("workflows:manage")} /> },
  ];

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <ol className="breadcrumb mb-2" aria-label="Breadcrumb">
            <li className="breadcrumb__item"><Link to={pageUrl("access/roles-list.html")}>Roles &amp; permissions</Link></li>
            <li className="breadcrumb__item" aria-current="page">Approval workflows</li>
          </ol>
          <h1>Approval workflows</h1>
          <p className="page-header__subtitle">Who approves what, in which order, and up to what amount</p>
        </div>
        <div className="page-header__actions">
          <Link to={pageUrl("access/delegation.html")} className="btn">Delegation</Link>
          {" "}
          <NotBuilt what="Add workflow" className="btn btn--primary" {...perm("workflows:manage")}><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={PLUS} /></svg>{" "}Add workflow</NotBuilt>
        </div>
      </div>
      <div className="stack">
        <StatStrip label="Key numbers">
          <StatCard icon={ICONS.workflows} tone={1} label="Workflows" value="9" note="6 active, 3 not built yet" />
          {stat("requests", "Requests this month")}
          {stat("decision", "Average decision time")}
          {stat("waiting", "Waiting over 2 days")}
        </StatStrip>
        <div className="grid grid-main-aside">
          <section className="card">
            <div className="card__header">
              <h3 className="card__title">All workflows</h3>
              {" "}
              <span className="card__meta">9 request types</span>
            </div>
            <Table bare pager={false} tableClass="table table--fit" columns={columns} rows={WORKFLOWS} rowKey={(w) => w[0]} />
          </section>
          <aside className="stack">
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Purchase order limits</h3>
                {" "}
                <span className="card__meta">Sample, not built yet</span>
              </div>
              <div className="card__body">
                <p className="form-hint">Purchase orders aren't part of OfficeOS, so these limits don't apply to anything. They show how amount tiers could look.</p>
              </div>
              <div>
                <div className="tier">
                  <div><span className="tier__range">Up to ₹1,00,000</span><span className="table__user-sub">Another Admin approves</span></div>
                  {" "}
                  <Badge tone="success" square>1 approver</Badge>
                </div>
                <div className="tier">
                  <div><span className="tier__range">Above ₹1,00,000</span><span className="table__user-sub">Two other Admins approve</span></div>
                  {" "}
                  <Badge tone="warning" square>2 approvers</Badge>
                </div>
              </div>
            </section>
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Rules for every workflow</h3>
                {" "}
                <span className="card__meta">Always on</span>
              </div>
              <div className="card__body">
                <div className="toggle-list">
                  <label className="switch"><input type="checkbox" defaultChecked disabled />{" "}Nobody approves their own request</label>
                  {" "}
                  <label className="switch"><input type="checkbox" defaultChecked disabled />{" "}A reason is required when rejecting</label>
                </div>
                <p className="form-hint mt-4">Every active workflow enforces both (a payroll run is never rejected: it's approved, or prepared again), and neither can be turned off. An Admin's own requests and salary changes are approved automatically.</p>
              </div>
            </section>
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Reminders and escalation</h3>
                {" "}
                <span className="card__meta">Sample, not built yet</span>
              </div>
              <div className="card__body">
                <p className="form-hint">Nothing in OfficeOS sends reminders or passes a request on when it waits, so these don't apply to anything. "Waiting over 2 days" above counts the requests that have waited that long.</p>
                <div className="toggle-list mt-4">
                  <label className="switch"><input type="checkbox" disabled />{" "}Remind the approver after 1 day</label>
                  {" "}
                  <label className="switch"><input type="checkbox" disabled />{" "}Escalate after 2 days with no decision</label>
                </div>
              </div>
            </section>
            <div className="alert alert--info">The person who prepared a payroll run can't approve it: an Admin who didn't prepare it approves it on the run page.</div>
          </aside>
        </div>
        <section className="card" id="expense-example">
          <div className="card__header">
            <h3 className="card__title">Example: an expense claim of ₹62,000</h3>
            {" "}
            <Badge tone="warning" dot>Needs 3 approvals</Badge>
          </div>
          <div className="card__body">
            <Stepper vertical={false} steps={exampleSteps(claim)} />
          </div>
        </section>
      </div>
    </Frame>
  );
}
