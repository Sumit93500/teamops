// My requests (pages/requests/my-requests.html + assets/js/pages/my-requests.js), ported (round 13a): the signed-in person's
// leave requests, attendance corrections, expense claims and asset requests (data/own-requests.js), newest sent first, with
// All / Pending / Approved / Rejected, the type filter, Cancel while it can be cancelled (asked in the in-app dialog), and the
// newest pending request's progress. Components: Table, Tabs, Badge, Stepper; the progress steps' words come from the old
// helpers (leave-view.js pendingSteps, expense-view.js expenseSteps, asset-request-view.js assetRequestSteps), read off the
// steps they build and drawn by Stepper.
import { useState } from "react";
import { Link } from "react-router-dom";
import { getUser } from "../../../assets/js/data/store.js";
import { requestsFor, cancelLeave, currentApproverName } from "../../../assets/js/data/leave-store.js";
import { regularizationsFor, cancelRegularization } from "../../../assets/js/data/attendance-store.js";
import { expensesFor, cancelExpense, waitingOn } from "../../../assets/js/data/expenses-store.js";
import { assetRequestsFor, cancelAssetRequest, waitingOn as assetWaitingOn } from "../../../assets/js/data/asset-requests-store.js";
import { ownRequests } from "../../../assets/js/data/own-requests.js";
import { categoryLabel, stageBadge, expenseSteps } from "../../../assets/js/ui/expense-view.js";
import { requestTitle as assetTitle, statusBadgeOf, endNote, assetRequestSteps } from "../../../assets/js/ui/asset-request-view.js";
import { formatDay, requestDates, requestTitle, typeLabel, rejectionNote, newestPending, pendingSteps, nameOf } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { useToast } from "../ui/Toast.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { Badge, badgeOf, Tabs, Stepper } from "../components/Basics.jsx";
import { StatusBadge } from "../ui/leave.jsx";
import { rupees } from "../ui/payroll.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { pageUrl } from "../routes.js";

const PAGE = "requests/my-requests.html";
const TABS = [["all", "All"], ["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"]];
const TYPES = [["", "All types"], ["leave", "Leave"], ["asset", "Asset"], ["attendance", "Attendance"], ["expense", "Expense"]];
const BADGE_TEXT = { leave: "Leave", attendance: "Attendance", expense: "Expense", asset: "Asset" };
const names = (ids) => ids.map(nameOf).join(", ");
const correctionTitle = (r) => `Regularization, ${formatDay(r.date)}`;
const expenseTitle = (c) => `${categoryLabel(c.category)}, ${rupees(c.amount)}`;
// An old helper's badge node as a Badge.
const FromNode = ({ node }) => <Badge {...badgeOf(node.className)}>{node.textContent}</Badge>;
// An old helper's stepper steps (li nodes) as Stepper's data.
const stepsOf = (nodes) => nodes.map((li) => ({ state: li.classList.contains("is-done") ? "done" : li.classList.contains("is-current") ? "current" : "", title: li.querySelector("strong")?.textContent ?? "", detail: li.querySelector("small")?.textContent ?? "" }));

function withText(kind, r) {
  if (kind === "expense" || kind === "asset") {
    const open = kind === "expense" ? ["pending", "approved"] : ["pending", "approved"];
    if (open.includes(r.status)) {
      const ids = kind === "expense" ? waitingOn(r) : assetWaitingOn(r);
      if (!ids.length) return "Nobody yet";
      return r.status === "approved" ? `${kind === "expense" ? "Payment" : "Assign"}: ${names(ids)}` : names(ids);
    }
    const ends = kind === "expense" ? ["paid", "rejected"] : ["fulfilled", "rejected", "closed"];
    const last = [...r.history].reverse().find((h) => ends.includes(h.decision));
    return last ? names([last.byUserId]) : "—";
  }
  if (r.status === "pending") return currentApproverName(r);
  if (r.status === "cancelled") return "—";
  const decision = [...r.history].reverse().find((h) => ["approved", "rejected", "auto-approved"].includes(h.decision));
  if (decision?.decision === "auto-approved") return "Auto-approved";
  return getUser(decision?.byUserId)?.name ?? "HR";
}

export default function MyRequests() {
  const { userId } = useSession();
  const canCancel = useCan("requests:cancel"), canLeave = useCan("leave:create"), canClaim = useCan("expenses:create"), canAsset = useCan("assets:request");
  const showToast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState(0);
  const [type, setType] = useState("");
  const d = useData(() => {
    if (!getUser(userId)) return null;
    const rows = ownRequests(userId).map(({ kind, request, status }) => ({ kind, r: request, status, id: request.id, sent: request.appliedOn }))
      .sort((a, b) => b.sent.localeCompare(a.sent) || b.id.localeCompare(a.id));
    const pending = newestPending([...requestsFor(userId), ...regularizationsFor(userId), ...expensesFor(userId), ...assetRequestsFor(userId)]);
    return { rows, pending };
  }, [userId]);
  if (!d) return <Frame page={PAGE}><div /></Frame>;

  const cancel = async (kind, r) => {
    const ask = {   // only the kind's own question is built: each reads its own fields
      leave: () => [`Cancel your ${typeLabel(r.type).toLowerCase()} request for ${requestDates(r)}?`, "Cancel request"],
      attendance: () => [`Cancel your correction request for ${formatDay(r.date)}?`, "Cancel request"],
      expense: () => [`Cancel your expense claim for ${expenseTitle(r)}?`, "Cancel claim"],
      asset: () => [`Cancel your asset request (${assetTitle(r)})?`, "Cancel request"],
    }[kind]();
    if (!(await confirm({ message: ask[0], confirmLabel: ask[1], cancelLabel: "Keep it", danger: true }))) return;
    if (kind === "leave") { const res = cancelLeave(r.id, userId); showToast(res.ok ? "Leave request cancelled." : res.error, res.ok ? "success" : "danger"); }
    if (kind === "attendance") { const res = cancelRegularization(r.id, userId); showToast(res.ok ? "Correction request cancelled." : "Couldn't cancel the request. It may already have been decided.", res.ok ? "success" : "danger"); }
    if (kind === "expense") { const res = cancelExpense(r.id, userId); showToast(res.ok ? "Expense claim cancelled." : "Couldn't cancel the claim. It may already have been decided.", res.ok ? "success" : "danger"); }
    if (kind === "asset") { const res = cancelAssetRequest(r.id, userId); showToast(res.ok ? "Asset request cancelled." : "Couldn't cancel the request. An asset may already have been handed over.", res.ok ? "success" : "danger"); }
    bump();
  };
  const which = TABS[tab][0];
  const counts = { all: d.rows.length };
  ["pending", "approved", "rejected"].forEach((s) => { counts[s] = d.rows.filter((x) => x.status === s).length; });
  const shown = d.rows.filter((x) => (which === "all" || x.status === which) && (!type || x.kind === type));
  const title = (x) => ({ leave: requestTitle, attendance: correctionTitle, expense: expenseTitle, asset: assetTitle }[x.kind](x.r));
  const status = (x) => (x.kind === "asset" ? <FromNode node={statusBadgeOf(x.r)} /> : x.kind === "expense" && x.r.status === "paid" ? <FromNode node={stageBadge(x.r)} /> : <StatusBadge status={x.r.status} />);
  const actions = (x) => {
    const r = x.r;
    const cancellable = x.kind === "asset" ? ["pending", "approved"].includes(r.status) : r.status === "pending";
    if (cancellable) return <button className="btn btn--sm btn--danger" type="button" data-permission="requests:cancel" hidden={!canCancel || undefined} onClick={() => cancel(x.kind, r)}>Cancel</button>;
    const note = x.kind === "asset" ? endNote(r) : r.status === "rejected" ? rejectionNote(r) : "";
    return note ? <span className="text-sm text-muted">{note}</span> : null;
  };
  const columns = [
    { key: "title", label: "Request", render: (x) => <span className="table__user-name">{title(x)}</span> },
    { key: "type", label: "Type", render: (x) => <Badge square>{BADGE_TEXT[x.kind]}</Badge> },
    { key: "sent", label: "Sent", render: (x) => formatDay(x.r.appliedOn) },
    { key: "with", label: "With", render: (x) => withText(x.kind, x.r) },
    { key: "status", label: "Status", render: status },
    { key: "actions", label: "Actions", actions: true, render: actions },
  ];
  // the newest pending request's progress
  const p = d.pending;
  const isClaim = p?.id.startsWith("EXP-"), isAsset = p?.id.startsWith("ARQ-");
  const progressTitle = p && (isClaim ? `Expense: ${expenseTitle(p)}` : isAsset ? `Asset: ${assetTitle(p)}` : p.issue ? correctionTitle(p) : `${typeLabel(p.type)}, ${requestDates(p)}`);
  const steps = p ? stepsOf(isClaim ? expenseSteps(p) : isAsset ? assetRequestSteps(p) : pendingSteps(p)) : [];

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>My requests</h1>
          <p className="page-header__subtitle">Track everything you have asked for, in one place</p>
        </div>
        <div className="page-header__actions">
          <Link className="btn" to={pageUrl("leave/apply-leave.html")} data-permission="leave:create" hidden={!canLeave || undefined}>Apply for leave</Link>
          <Link className="btn" to={pageUrl("requests/claim-expense.html")} data-permission="expenses:create" hidden={!canClaim || undefined}>Claim an expense</Link>
          <Link className="btn btn--primary" to={`${pageUrl("inventory/my-assets.html")}#request`} data-permission="assets:request" hidden={!canAsset || undefined}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>{" "}Request an asset
          </Link>
        </div>
      </div>
      <div className="grid grid-main-aside">
        <section className="card">
          <div className="table__toolbar">
            <Tabs pill active={tab} onChange={setTab} tabs={TABS.map(([k, label]) => ({ label, count: String(counts[k]) }))} />
            <select className="select select--sm" aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map(([v, label]) => <option key={label} value={v}>{label}</option>)}
            </select>
          </div>
          <Table bare pager={false} tableClass="table table--fit" columns={columns} rows={shown} rowKey={(x) => `${x.kind}-${x.id}`}
            rowProps={(x) => (x.kind === "expense" ? { "data-claim-id": x.id } : x.kind === "asset" ? { "data-request-id": x.id } : {})} empty="No requests match these filters." />
          <div className="card__footer"><span className="card__meta">{`Showing ${shown.length} of ${d.rows.length} requests`}</span></div>
        </section>
        <aside className="stack">
          <section className="card" id="request-progress" hidden={!p || undefined}>
            <div className="card__header">
              <h3 className="card__title">{progressTitle ?? "Casual leave, 3 Oct"}</h3>
              <span className="badge badge--warning badge--dot">In review</span>
            </div>
            <div className="card__body"><Stepper steps={steps} /></div>
          </section>
          <div className="alert alert--info">You can cancel a request while it is still pending. Once it is approved or rejected, it can't be changed.</div>
        </aside>
      </div>
    </Frame>
  );
}
