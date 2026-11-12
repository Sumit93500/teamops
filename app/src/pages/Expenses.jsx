// Expenses (pages/finance/expenses.html + assets/js/pages/expenses.js), ported (round 12), for expenses:view (Finance, Admin):
// every claim in Pending / Approved / Paid / Rejected with search, a category filter and 10 a page; the stats, spend by
// category, the policy card (from EXPENSE_POLICY) and the alert. Approve / Reject (Decision.jsx EXPENSE_FLOW) at the Finance
// and Admin stages for whoever holds the stage; otherwise who it waits for, who paid it or why it was rejected. "Pay approved
// claims" marks paid every approved claim the signed-in person may pay (asked in the in-app dialog; a disabled button says
// why under it). Export: every filtered row with the old exporter. Receipts are names only.
import { useEffect, useId, useState } from "react";
import { getCurrentUserId } from "../../../assets/js/core/auth.js";
import { csvColumns, initExports } from "../../../assets/js/ui/csv-export.js";
import { getUser } from "../../../assets/js/data/store.js";
import { EXPENSE_POLICY, CATEGORY_KEYS, needsReceipt } from "../../../assets/js/data/expenses.js";
import { allExpenses, payExpense, pendingFor, payableFor, waitingOn, expenseTotals, averageProcessingDays } from "../../../assets/js/data/expenses-store.js";
import { STAGE_NAME, categoryLabel, chainText } from "../../../assets/js/ui/expense-view.js";
import { formatDay, localDateOf, plural, nameOf, departmentName } from "../../../assets/js/ui/leave-view.js";
import { expenseSpendChart, valuesOf } from "../../../assets/js/data/chart-data.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { useToast } from "../ui/Toast.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { useDecision, EXPENSE_FLOW, DecisionButtons } from "../components/Decision.jsx";
import { StatStrip, StatCard, Badge, badgeOf, PersonCell, Tabs, Reason } from "../components/Basics.jsx";
import { BarRows } from "../components/Charts.jsx";
import { rupees } from "../ui/payroll.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";

csvColumns("expense-claims", { Employee: { split: "Department" }, Amount: { number: true, header: "Amount (₹)" } });   // Round Data export

const PAGE = "finance/expenses.html";
const TABS = [["pending", "Pending"], ["approved", "Approved"], ["paid", "Paid"], ["rejected", "Rejected"]];
const PAGE_STAGES = ["finance", "admin"];
const EMPTY = { pending: "No claims are waiting for approval.", approved: "No approved claims are waiting to be paid.", paid: "No claims have been paid yet.", rejected: "No claims have been rejected." };
const BADGE = {
  manager: ["With manager", "badge badge--warning badge--dot"], finance: ["With Finance", "badge badge--info badge--dot"], admin: ["With Admin", "badge badge--warning badge--dot"],
  approved: ["Approved", "badge badge--success badge--dot"], paid: ["Paid", "badge badge--success badge--dot"], rejected: ["Rejected", "badge badge--danger badge--dot"],
};
const ICONS = { open: [3, "M3 6h18v12H3zM3 10h18"], approved: [2, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M8 12l3 3 5-6"], rejected: [4, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M9 9l6 6M15 9l-6 6"], processing: [1, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2"] };
const claimsText = (n) => plural(n, "claim", "claims");
const lastAt = (claim) => claim.history.at(-1)?.at ?? "";
const entryOf = (claim, decision) => [...claim.history].reverse().find((h) => h.decision === decision) ?? null;
const names = (ids) => ids.map(nameOf).join(", ");
const Muted = ({ children }) => <span className="text-sm text-muted">{children}</span>;
function tabClaims(claims, which) {
  const list = claims.filter((c) => c.status === which);
  if (which === "pending" || which === "approved") return list.sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id, "en", { numeric: true }));
  return list.sort((a, b) => lastAt(b).localeCompare(lastAt(a)) || b.id.localeCompare(a.id, "en", { numeric: true }));
}
function StageBadge({ claim }) {
  const look = BADGE[claim.status === "pending" ? claim.stage : claim.status];
  return <Badge {...badgeOf(look?.[1] ?? "badge")}>{look?.[0] ?? claim.status}</Badge>;
}
function Receipt({ claim }) {
  if (claim.receipt) return <span className="text-sm" title="The claimant's name for the receipt. No file is stored in this demo.">{claim.receipt}</span>;
  if (needsReceipt(claim.amount)) return <span className="receipt receipt--missing">No receipt</span>;
  return <span className="text-sm text-muted">Not needed</span>;
}
function Actions({ claim, decidable, me, decision }) {
  if (claim.status === "pending") {
    if (decidable.has(claim.id)) return <DecisionButtons permission="expenses:approve" onReject={() => decision.reject(claim)} onApprove={() => decision.approve(claim)} />;
    const ids = waitingOn(claim);
    return <Muted>{!ids.length ? "Nobody can decide this now" : claim.stage === "manager" ? `Waiting for the manager, ${names(ids)}` : `Waiting for ${names(ids)}`}</Muted>;
  }
  if (claim.status === "approved") {
    const ids = waitingOn(claim);
    return <Muted>{me && ids.includes(me) ? "You can pay this" : ids.length ? `To be paid by ${names(ids)}` : "Nobody can pay this now"}</Muted>;
  }
  if (claim.status === "paid") {
    const paid = entryOf(claim, "paid");
    return <><div className="text-sm text-muted">{paid ? `Paid ${formatDay(localDateOf(paid.at))} by ${nameOf(paid.byUserId)}` : "Paid"}</div>{paid?.note && <div className="text-sm text-muted">{paid.note}</div>}</>;
  }
  if (claim.status === "rejected") return <Muted>{entryOf(claim, "rejected")?.note || "Rejected"}</Muted>;
  return null;
}

export default function Expenses() {
  const { role } = useSession();
  const canPay = useCan("expenses:pay"), canApprove = useCan("expenses:approve");
  const showToast = useToast();
  const confirm = useConfirm();
  const decision = useDecision(EXPENSE_FLOW);
  const reasonId = useId();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const me = getCurrentUserId();
  const d = useData(() => ({
    claims: allExpenses(), payable: me ? payableFor(me) : [],
    decidable: new Set(me ? pendingFor(me, role?.key).filter((c) => PAGE_STAGES.includes(c.stage)).map((c) => c.id) : []),
  }), [me, role?.key]);
  useEffect(() => { initExports(document.getElementById("main")); }, []);

  const which = TABS[tab][0];
  const query = search.trim().toLowerCase();
  const rows = tabClaims(d.claims, which).filter((c) => (!category || c.category === category) && (!query || nameOf(c.userId).toLowerCase().includes(query)));
  // stats
  const { pending, approved, rejected } = expenseTotals(d.claims).byStatus;
  const average = averageProcessingDays(d.claims);
  const target = EXPENSE_POLICY.processingTargetDays;
  const stats = [
    ["open", "Open claims", String(pending.count), `${rupees(pending.amount)} to review`, pending.count ? "down" : ""],
    ["approved", "Approved, to pay", rupees(approved.amount), approved.count ? `${claimsText(approved.count)} waiting to be paid` : "Nothing waiting to be paid", approved.count ? "up" : ""],
    ["rejected", "Rejected", String(rejected.count), rejected.count ? `${rupees(rejected.amount)} in total` : "None so far", ""],
    ["processing", "Average processing", average === null ? "—" : `${average.toFixed(1)} days`, `Target is ${target} days`, average === null ? "" : average <= target ? "up" : "down"],
  ];
  // spend by category
  const spend = expenseSpendChart(d.claims);
  const spent = valuesOf(spend, "Approved and paid");
  const top = Math.max(...spent);
  // the policy card
  const chain = chainText();
  const policy = [["Every claim", chain.always], [`Above ${rupees(EXPENSE_POLICY.adminAbove)}`, `Then ${chain.extra} too`], ["Receipt needed above", rupees(EXPENSE_POLICY.receiptAbove)],
    ["Claim within", `${EXPENSE_POLICY.claimWithinDays} days of spending`], ["Paid", `Within ${EXPENSE_POLICY.payWithinWorkingDays} working days (target)`]];
  // the alert: the oldest pending claim above the Admin limit
  const big = tabClaims(d.claims, "pending").find((c) => c.amount > EXPENSE_POLICY.adminAbove);
  const lead = big && `${nameOf(big.userId)}'s ${rupees(big.amount)} claim is above ${rupees(EXPENSE_POLICY.adminAbove)}.`;
  const alert = big && (big.stage === "admin" ? `${lead} It's waiting for an Admin, who gives the last approval.` : `${lead} It's at the ${STAGE_NAME[big.stage]} stage now; an Admin gives the last approval.`);
  // pay approved claims
  const mine = d.payable;
  let payTitle;
  if (mine.length) payTitle = `${claimsText(mine.length)}, ${rupees(mine.reduce((sum, c) => sum + c.amount, 0))}`;
  else if (!d.claims.some((c) => c.status === "approved")) payTitle = "No approved claims are waiting to be paid";
  else if (!me) payTitle = "This session has no employee ID; sign out and back in to pay claims";
  else payTitle = "Someone else has to pay the approved claims";
  const payApproved = async () => {
    const list = me ? payableFor(me) : [];
    if (!list.length) return;
    const total = list.reduce((sum, c) => sum + c.amount, 0);
    if (!(await confirm({ message: `Mark ${claimsText(list.length)} as paid, ${rupees(total)} in total?\nThis records the payment; no money is sent from here.`, confirmLabel: "Mark as paid", cancelLabel: "Not now" }))) return;
    const paid = list.map((c) => payExpense(c.id, me)).filter((r) => r.ok).length;
    if (paid) showToast(`${claimsText(paid)} marked paid.`, "success");
    const unpaid = list.length - paid;
    if (unpaid) showToast(`${claimsText(unpaid)} couldn't be marked paid. ${unpaid === 1 ? "It" : "They"} may have changed since the page was drawn, or browser storage may be full.`, "danger");
    bump();
  };
  const columns = [
    { key: "employee", label: "Employee", render: (c) => { const p = getUser(c.userId); return <PersonCell userId={c.userId} name={p?.name ?? nameOf(c.userId) ?? c.userId} sub={departmentName(p?.department)} />; } },
    { key: "category", label: "Category", render: (c) => <><div>{categoryLabel(c.category)}</div><div className="text-sm text-muted">{c.reason}</div></> },
    { key: "date", label: "Date", render: (c) => formatDay(c.date), cellProps: (c) => ({ "data-csv": c.date }) },
    { key: "amount", label: "Amount", num: true, render: (c) => <span className="expense-amount">{rupees(c.amount)}</span>, cellProps: (c) => ({ "data-csv": String(c.amount) }) },
    { key: "receipt", label: "Receipt", render: (c) => <Receipt claim={c} /> },
    { key: "stage", label: "Stage", render: (c) => <StageBadge claim={c} /> },
    { key: "actions", label: "Actions", actions: true, render: (c) => <Actions claim={c} decidable={d.decidable} me={me} decision={decision} /> },
  ];

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p className="page-header__subtitle">Expense claims at every stage, from sending to payment</p>
        </div>
        <div className="page-header__actions">
          <button className="btn" type="button" data-permission="expenses:view" data-export>Export</button>
          <button className="btn btn--primary" type="button" data-permission="expenses:pay" id="pay-approved" hidden={!canPay || undefined} disabled={!mine.length || undefined} title={payTitle}
            aria-describedby={!mine.length ? reasonId : undefined} onClick={payApproved}>Pay approved claims</button>
          <Reason id={reasonId} text={!mine.length ? `${payTitle}.` : ""} permission="expenses:pay" hidden={!canPay} />
        </div>
      </div>
      <div className="stack">
        <StatStrip label="Key numbers">
          {stats.map(([key, l, value, note, tone]) => <StatCard key={key} id={key} icon={ICONS[key][1]} tone={ICONS[key][0]} label={l} value={value} note={note} noteTone={tone} />)}
        </StatStrip>
        <div className="grid grid-main-aside">
          <section className="card">
            <div className="table__toolbar">
              <Tabs pill active={tab} onChange={(i) => { setTab(i); setPage(1); }} tabs={TABS.map(([key, label]) => ({ label, count: String(tabClaims(d.claims, key).length) }))} />
              <div className="table__filters">
                <div className="input-group">
                  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  <input className="input input--sm input--search" type="search" placeholder="Search employees" aria-label="Search claims" id="expense-search" data-table-filter="off" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="select select--sm" aria-label="Filter by category" id="expense-category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                  <option value="">All categories</option>
                  {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{categoryLabel(k)}</option>)}
                </select>
              </div>
            </div>
            <Table bare oldExport exportName="expense-claims" tbodyId="expense-rows" columns={columns} rows={rows} page={page} onPageChange={setPage} rowProps={(c) => ({ "data-claim-id": c.id })}
              empty={search || category ? "No claims match these filters." : EMPTY[which]} />
          </section>
          <aside className="stack">
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Spend by category</h3>
                <span className="card__meta" id="expense-spend-meta">Approved and paid claims</span>
              </div>
              <BarRows id="expense-spend" className="card__body value-bars" rows={spend.labels.map((k, i) => ({ label: categoryLabel(k), value: rupees(spent[i]), percent: top ? Math.round((spent[i] / top) * 100) : 0 }))} empty={spend.empty} />
            </section>
            <section className="card">
              <div className="card__header"><h3 className="card__title">Expense policy</h3></div>
              <div className="card__body">
                <dl className="kv" id="expense-policy">{policy.map(([term, value]) => <div className="kv__row" key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
              </div>
            </section>
            <div className="alert alert--info" id="expense-alert" hidden={!alert || undefined}>{alert}</div>
          </aside>
        </div>
      </div>
      {decision.modal}
    </Frame>
  );
}
