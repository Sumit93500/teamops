// Salary structure (pages/payroll/salary-structure.html + assets/js/pages/salary-structure.js), ported (round 12), for
// salary:view: the salary components (data/payroll.js), every tracked person's salary this month (search, department), and the
// example card (one person's monthly breakdown and salary history; a row's Breakdown picks it). A person's Edit (salary:edit)
// opens the new-salary form for proposeSalary() (its refusals under the field it names, else a toast); an Admin's change takes
// effect at once, anyone else's waits. A waiting change shows in its row with Approve / Reject (Decision.jsx SALARY_FLOW) for
// those who may decide it and Withdraw (asked in the in-app dialog) for whoever proposed it. Export writes both tables with
// the old exporter. A component's Edit and Add component stay placeholders. Nothing here works out pay; computePay() does.
import { useEffect, useId, useState } from "react";
import { SALARY_COMPONENTS, computePay } from "../../../assets/js/data/payroll.js";
import { csvColumns, initExports } from "../../../assets/js/ui/csv-export.js";
import { salaryFor, salaryHistory, proposeSalary, pendingSalaryProposal, proposalDecidersFor, withdrawSalaryProposal } from "../../../assets/js/data/payroll-store.js";
import { getAllUsers, getUser, getAllDepartments } from "../../../assets/js/data/store.js";
import { permissionsOf } from "../../../assets/js/config/roles.js";
import { getCurrentUserId } from "../../../assets/js/core/auth.js";
import { todayIso, formatDay, plural, nameOf } from "../../../assets/js/ui/leave-view.js";
import { describeChange } from "../../../assets/js/ui/salary-change-view.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../ui/Toast.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { useDecision, SALARY_FLOW, DecisionButtons } from "../components/Decision.jsx";
import { Badge, badgeOf, PersonCell, NotBuilt, Reason } from "../components/Basics.jsx";
import { rupees } from "../ui/payroll.jsx";
import { useData, useCan, useSession } from "../data/hooks.js";
import { bump } from "../data/bus.js";

csvColumns("employee-salaries", { Employee: { split: "Employee ID" }, "Gross per month": { number: true, header: "Gross per month (₹)" }, "Annual cost": { number: true, header: "Annual cost (₹)" } });   // Round Data export

const PAGE = "payroll/salary-structure.html";
const TYPE = { earning: { label: "Earning", badge: "badge badge--success badge--square" }, deduction: { label: "Deduction", badge: "badge badge--danger badge--square" } };
const TAXABLE = new Map([[true, "Yes"], ["partly", "Partly"], [false, "No"], [null, "–"]]);
const ACTIVE = "badge badge--success badge--dot", DUE = "badge badge--warning badge--dot", NONE = "badge badge--danger badge--dot", WAITING = "badge badge--info badge--dot";
const people = (n) => plural(n, "employee", "employees");
const byName = (a, b) => a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id, "en", { numeric: true });
const B = ({ cls, children, ...props }) => <Badge {...badgeOf(cls)} {...props}>{children}</Badge>;
const monthlyCost = (pay) => pay.gross + pay.employerPf;
const signed = (n) => (n > 0 ? `+${rupees(n)}` : n < 0 ? `−${rupees(-n)}` : "no change");

function formulaText(formula) {
  const fixed = /^fixed (\d+)$/.exec(formula);
  if (fixed) return `Fixed ${rupees(Number(fixed[1]))} a month`;
  return `${formula.charAt(0).toUpperCase()}${formula.slice(1)}`;
}
function salaryRows() {
  const today = todayIso();
  const [year, month] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  return getAllUsers().filter((u) => u.status !== "inactive").sort(byName).map((user) => {
    const current = salaryFor(user.id, year, month);
    const history = salaryHistory(user.id);
    const upcoming = current ? history.slice(0, history.findIndex((s) => s.id === current.id)) : history;
    return { id: user.id, user, current, history, upcoming, pending: pendingSalaryProposal(user.id), pay: current ? computePay(current.gross) : null };
  });
}
function statusOf(row) {
  const next = row.upcoming.at(-1);
  if (!row.current && next) return { label: `Starts ${formatDay(next.effectiveFrom, true)}`, badge: DUE, title: `${rupees(next.gross)} a month from ${formatDay(next.effectiveFrom, true)}` };
  if (!row.current) return { label: "No salary on file", badge: NONE, title: "" };
  if (next) return { label: `Revision due ${formatDay(next.effectiveFrom, true)}`, badge: DUE, title: `${rupees(next.gross)} a month from ${formatDay(next.effectiveFrom, true)}` };
  return { label: "Active", badge: ACTIVE, title: "" };
}
const changesAtOnce = () => permissionsOf(getUser(getCurrentUserId())).includes("payroll:approve");
function editBlocked(row) {
  const me = getCurrentUserId();
  if (row.user.id === me) return "You can't change your own salary.";
  if (!changesAtOnce() && !proposalDecidersFor({ userId: row.user.id, enteredBy: me }).length) return `No one else could approve a change to ${row.user.name}'s salary: make someone else an Admin first.`;
  return "";
}

// A row's status: the badge (the coming salary under it), and a waiting change with who proposed it under that.
function StatusCell({ row }) {
  const [a, b] = [useId(), useId()];
  const s = statusOf(row);
  const p = row.pending;
  const proposed = p && `Proposed by ${nameOf(p.enteredBy)} on ${formatDay(p.enteredAt.slice(0, 10), true)} (${p.id})`;
  return (
    <>
      <B cls={s.badge} title={s.title || undefined} aria-describedby={s.title ? a : undefined}>{s.label}</B>
      <Reason id={a} text={s.title} />
      {p && <div className="mt-2" title={proposed} aria-describedby={b}><B cls={WAITING}>Waiting</B><div className="text-muted text-xs">{`${rupees(p.gross)} from ${formatDay(p.effectiveFrom, true)}`}</div></div>}
      {p && <Reason id={b} text={proposed} />}
    </>
  );
}
// A row's actions: Breakdown and Edit (why Edit can't be used under them); a waiting change's Reject / Approve and Withdraw.
function ActionsCell({ row, shown, onShow, onEdit, canEdit, decision, onWithdraw }) {
  const id = useId();
  const me = getCurrentUserId();
  const blocked = row.pending ? "" : editBlocked(row);
  const p = row.pending;
  const decides = p && proposalDecidersFor(p).some((u) => u.id === me);
  const mine = p && p.enteredBy === me;
  return (
    <>
      <div className="btn-group">
        <button className={`btn btn--sm${shown ? " btn--primary" : ""}`} type="button" aria-pressed={String(shown)} onClick={onShow}>Breakdown</button>
        {!p && <button className="btn btn--sm" type="button" data-permission="salary:edit" hidden={!canEdit || undefined} disabled={Boolean(blocked) || undefined} title={blocked || undefined}
          aria-describedby={blocked ? id : undefined} onClick={onEdit}>Edit</button>}
      </div>
      <Reason id={id} text={blocked} permission="salary:edit" hidden={!canEdit} />
      {(decides || mine) && (
        <div className="mt-2">
          {decides && <DecisionButtons onReject={() => decision.reject(p)} onApprove={() => decision.approve(p)} />}
          {mine && <button className="btn btn--sm" type="button" onClick={() => onWithdraw(p)}>Withdraw</button>}
        </div>
      )}
    </>
  );
}

export default function SalaryStructure() {
  useSession();
  const canEdit = useCan("salary:edit"), canView = useCan("salary:view");
  const showToast = useToast();
  const confirm = useConfirm();
  const decision = useDecision(SALARY_FLOW);
  const d = useData(() => ({ rows: salaryRows(), departments: getAllDepartments() }), []);
  const [exampleId, setExampleId] = useState(() => { const r = salaryRows(); return (r.find((x) => x.current) ?? r[0])?.user.id ?? null; });
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [dialog, setDialog] = useState(null);   // { row, gross, month, atOnce }
  const [error, setError] = useState(null);
  useEffect(() => { initExports(document.getElementById("main")); }, []);

  const query = search.trim().toLowerCase();
  const shown = d.rows.filter((r) => (!dept || r.user.department === dept) && (!query || r.user.name.toLowerCase().includes(query)));
  const example = d.rows.find((r) => r.user.id === exampleId);
  const open = (row) => { setError(null); setDialog({ row, gross: row.current ? String(row.current.gross) : "", month: todayIso().slice(0, 7), atOnce: changesAtOnce() }); setTimeout(() => document.getElementById("salary-gross")?.focus()); };
  const save = (e) => {
    e.preventDefault();
    setError(null);
    const amount = dialog.gross.trim() === "" ? undefined : Number(dialog.gross);
    const from = /^\d{4}-\d{2}$/.test(dialog.month) ? `${dialog.month}-01` : dialog.month;
    const result = proposeSalary(getCurrentUserId(), dialog.row.user.id, { gross: amount, effectiveFrom: from });
    const fieldId = { gross: "salary-gross", effectiveFrom: "salary-month" }[result.field];
    if (!result.ok && fieldId) { setError({ field: result.field, message: result.error }); document.getElementById(fieldId)?.focus(); return; }
    const name = dialog.row.user.name;
    setDialog(null);
    if (!result.ok) { showToast(result.error, "danger"); return; }
    bump();
    const change = `${rupees(result.record.gross)} a month from ${formatDay(result.record.effectiveFrom, true)}`;
    showToast(result.record.status === "approved" ? `${name}'s salary is ${change}.` : `${name}'s new salary, ${change}, is waiting for an Admin's approval.`, "success");
  };
  const withdraw = async (p) => {
    if (!(await confirm({ message: `Withdraw this salary change?\n${describeChange(p)}`, confirmLabel: "Withdraw change", cancelLabel: "Keep it", danger: true }))) return;
    const result = withdrawSalaryProposal(getCurrentUserId(), p.id);
    showToast(result.ok ? "Salary change withdrawn." : result.error, result.ok ? "success" : "danger");
    bump();
  };
  if (!canView) return <Frame page={PAGE}><div /></Frame>;

  const componentColumns = [
    { key: "name", label: "Component", render: (c) => <span className="table__user-name">{c.name}</span> },
    { key: "type", label: "Type", render: (c) => <B cls={TYPE[c.type]?.badge ?? "badge"}>{TYPE[c.type]?.label ?? c.type}</B> },
    { key: "formula", label: "How it is worked out", render: (c) => formulaText(c.formula) },
    { key: "taxable", label: "Taxable", render: (c) => TAXABLE.get(c.taxable) ?? "–" },
    { key: "status", label: "Status", render: () => <B cls={ACTIVE}>Active</B> },
    { key: "actions", label: "Actions", actions: true, render: () => <NotBuilt what="Edit" className="btn btn--sm" data-permission="salary:edit" hidden={!canEdit || undefined}>Edit</NotBuilt> },
  ];
  const salaryColumns = [
    { key: "employee", label: "Employee", render: (r) => <PersonCell userId={r.user.id} name={r.user.name} sub={r.user.id} /> },
    { key: "designation", label: "Designation", render: (r) => r.user.designation || "—" },
    { key: "gross", label: "Gross per month", num: true, render: (r) => (r.pay ? rupees(r.pay.gross) : "—"), cellProps: (r) => ({ "data-csv": r.pay ? String(r.pay.gross) : "" }) },
    { key: "annual", label: "Annual cost", num: true, render: (r) => (r.pay ? rupees(monthlyCost(r.pay) * 12) : "—"), cellProps: (r) => ({ "data-csv": r.pay ? String(monthlyCost(r.pay) * 12) : "" }) },
    { key: "revised", label: "Last revised", render: (r) => (r.current ? formatDay(r.current.effectiveFrom, true) : "—"), cellProps: (r) => ({ "data-csv": r.current ? r.current.effectiveFrom : "" }) },
    { key: "status", label: "Status", render: (r) => <StatusCell row={r} /> },
    { key: "actions", label: "Actions", actions: true, render: (r) => <ActionsCell row={r} shown={r.user.id === exampleId} onShow={() => setExampleId(r.user.id)} onEdit={() => open(r)} canEdit={canEdit} decision={decision} onWithdraw={withdraw} /> },
  ];
  const pay = example?.pay;
  const lines = pay ? {
    basic: pay.earnings.basic, hra: pay.earnings.hra, conveyance: pay.earnings.conveyance, special: pay.earnings.special, gross: pay.gross, pf: pay.deductionLines.pf, pt: pay.deductionLines.pt,
    tds: pay.deductionLines.tds, deductions: pay.deductions, net: pay.net, "cost-gross": pay.gross, "employer-pf": pay.employerPf, "monthly-cost": monthlyCost(pay), "annual-cost": monthlyCost(pay) * 12,
  } : {};
  const kv = (rows) => rows.map(([key, term, cls = ""]) => <div className={`breakdown__row${cls}`} key={key}><dt>{term}</dt><dd data-field={key}>{key in lines ? rupees(lines[key]) : "—"}</dd></div>);
  const fieldError = (name, idOf) => (error?.field === name ? <span className="form-error" id={`${idOf}-error`}>{error.message}</span> : null);

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Salary structure</h1>
          <p className="page-header__subtitle">How gross pay is built, and what gets deducted</p>
        </div>
        <div className="page-header__actions">
          <button className="btn" type="button" data-permission="salary:view" data-export>Export</button>
          <NotBuilt what="Add component" className="btn btn--primary" data-permission="salary:edit" hidden={!canEdit || undefined}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>{" "}Add component
          </NotBuilt>
        </div>
      </div>
      <div className="stack">
        <div className="grid grid-main-aside">
          <section className="card">
            <div className="card__header">
              <h3 className="card__title">Salary components</h3>
              <span className="card__meta" id="salary-components-meta">{plural(SALARY_COMPONENTS.length, "component", "components")}</span>
            </div>
            <Table bare pager={false} oldExport exportName="salary-components" tbodyId="salary-components" columns={componentColumns} rows={SALARY_COMPONENTS} rowKey={(c) => c.key} rowProps={(c) => ({ "data-component": c.key })} />
          </section>
          <aside className="stack">
            <section className="card">
              <div className="card__header">
                <h3 className="card__title" id="salary-example-title">{example ? `Example: ${example.user.name}` : "Example: Rohan Gupta"}</h3>
                <span className="card__meta">Per month</span>
              </div>
              <div className="card__body">
                <p className="text-muted" id="salary-example-empty" hidden={Boolean(!example || pay) || undefined}>No salary on file for this month, so there's nothing to break down.</p>
                <div id="salary-example-breakdown" hidden={Boolean(example && !pay) || undefined}>
                  <h4 className="breakdown__title">Earnings</h4>
                  <dl className="breakdown">{kv([["basic", "Basic salary"], ["hra", "House rent allowance"], ["conveyance", "Conveyance allowance"], ["special", "Special allowance"], ["gross", "Gross pay", " breakdown__row--total"]])}</dl>
                  <h4 className="breakdown__title">Deductions</h4>
                  <dl className="breakdown">{kv([["pf", "Provident fund"], ["pt", "Professional tax"], ["tds", "Income tax (TDS), sample tax rates, spread evenly over the year"], ["deductions", "Total deductions", " breakdown__row--total"], ["net", "Net pay", " breakdown__row--total breakdown__row--net"]])}</dl>
                  <h4 className="breakdown__title">Cost to company</h4>
                  <dl className="breakdown">{kv([["cost-gross", "Gross pay"], ["employer-pf", "Employer provident fund"], ["monthly-cost", "Monthly cost"], ["annual-cost", "Annual cost", " breakdown__row--total"]])}</dl>
                </div>
                <h4 className="breakdown__title">Salary history</h4>
                <dl className="breakdown" id="salary-history">
                  {example && example.history.length ? example.history.map((s, i) => {
                    const before = example.history[i + 1];
                    return <div className="breakdown__row" key={s.id}><dt>{`From ${formatDay(s.effectiveFrom, true)}${example.upcoming.includes(s) ? " (not in effect yet)" : ""}`}</dt><dd>{before ? `${rupees(s.gross)} (${signed(s.gross - before.gross)})` : rupees(s.gross)}</dd></div>;
                  }) : <div className="breakdown__row"><dt>No salary records</dt><dd>—</dd></div>}
                </dl>
              </div>
            </section>
            <div className="alert alert--info">Salary figures are only visible to roles with the salary:view permission. A person's Edit sets a new monthly gross from the 1st of a month (not your own): an Admin's change takes effect at once, anyone else's waits for an Admin to approve it. A component's Edit and Add component aren't built yet, so they don't save anything. A revised salary is used from the first payroll month that starts on or after its effective date.</div>
          </aside>
        </div>
        <section className="card">
          <div className="table__toolbar">
            <h3 className="card__title">Employee salaries</h3>
            <div className="table__filters">
              <div className="input-group">
                <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input className="input input--sm input--search" type="search" placeholder="Search employees" aria-label="Search employees" id="salary-search" data-table-filter="off" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="select select--sm" aria-label="Filter by department" id="salary-department" value={dept} onChange={(e) => setDept(e.target.value)}>
                <option value="">All departments</option>
                {d.departments.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
              </select>
            </div>
          </div>
          <Table bare pager={false} oldExport exportName="employee-salaries" tbodyId="salary-rows" columns={salaryColumns} rows={shown} rowKey={(r) => r.user.id} rowProps={(r) => ({ "data-user-id": r.user.id })} empty="No employees match these filters." />
          <div className="card__footer"><span className="card__meta" id="salary-rows-meta">{`Showing ${shown.length} of ${people(d.rows.length)}`}</span></div>
        </section>
      </div>

      <Modal open={Boolean(dialog)} onClose={() => setDialog(null)} id="salary-modal" size="sm" title={dialog ? `Change ${dialog.row.user.name}'s salary` : ""}
        desc={dialog?.atOnce ? "The new monthly gross is used from the 1st of the month you choose." : "The new monthly gross is used from the 1st of the month you choose, once an Admin approves it."}
        footer={<><button className="btn" type="button" data-modal-close onClick={() => setDialog(null)}>Cancel</button><button className="btn btn--primary" type="submit" form="salary-form">{dialog?.atOnce ? "Save salary" : "Send for approval"}</button></>}>
        {dialog && (
          <form id="salary-form" noValidate onSubmit={save}>
            <div className="form-field">
              <label className="form-label form-label--required" htmlFor="salary-gross">Monthly gross (₹)</label>
              <input className="input" id="salary-gross" type="number" min="1" step="1" value={dialog.gross} aria-describedby={error?.field === "gross" ? "salary-gross-error" : undefined}
                onChange={(e) => setDialog({ ...dialog, gross: e.target.value })} />
              {fieldError("gross", "salary-gross")}
            </div>
            <div className="form-field mt-4">
              <label className="form-label form-label--required" htmlFor="salary-month">Takes effect from</label>
              <input className="input" id="salary-month" type="month" value={dialog.month} aria-describedby={error?.field === "effectiveFrom" ? "salary-month-error" : undefined}
                onChange={(e) => setDialog({ ...dialog, month: e.target.value })} />
              {fieldError("effectiveFrom", "salary-month")}
            </div>
          </form>
        )}
      </Modal>
      {decision.modal}
    </Frame>
  );
}
