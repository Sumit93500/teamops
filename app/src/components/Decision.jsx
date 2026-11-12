// Approve and Reject (ui/leave-decision.js createDecisionFlow), shared by the pages that decide requests (the HR dashboard
// first; the approval pages later). Approve asks "Approve this request?" and the request's line, now in the in-app dialog
// (round 4); Reject opens a small modal that needs a reason (the shared Modal: its focus rules and the unsaved-changes guard,
// as ui/modal.js gave the old one). Each goes through the kind's decide function as the signed-in person, shows the old
// toasts (fixed text; a store error only when no fixed failure text is set), then bumps the data bus, so the page, the
// sidebar's count and the bell redraw from the stores.
//   const leave = useDecision(LEAVE_FLOW);  leave.approve(request); leave.reject(request); render {leave.modal}
import { useState } from "react";
import { decideLeave } from "../../../assets/js/data/leave-store.js";
import { decideRegularization } from "../../../assets/js/data/attendance-store.js";
import { requestTitle, formatDay, nameOf } from "../../../assets/js/ui/leave-view.js";
import { issueLabel } from "../../../assets/js/ui/attendance-view.js";
import { decideSalaryProposal } from "../../../assets/js/data/payroll-store.js";
import { describeChange } from "../../../assets/js/ui/salary-change-view.js";
import { decideExpense } from "../../../assets/js/data/expenses-store.js";
import { describeClaim } from "../../../assets/js/ui/expense-view.js";
import { decideAssetRequest } from "../../../assets/js/data/asset-requests-store.js";
import { describeRequest } from "../../../assets/js/ui/asset-request-view.js";
import { decideLocationChange } from "../../../assets/js/data/locations-store.js";
import { getCurrentUserId, getCurrentRole } from "../../../assets/js/core/auth.js";
import { bump } from "../data/bus.js";
import { useToast } from "../ui/Toast.jsx";
import { useConfirm } from "./Confirm.jsx";
import Modal from "./Modal.jsx";

export const LEAVE_FLOW = {
  decide: decideLeave,
  describe: (request) => `${nameOf(request.userId)}: ${requestTitle(request)}`,
  noteId: "reject-note",
  labels: {
    title: "Reject leave request",
    approved: (result) => (result.record.status === "approved" ? "Leave request approved." : "Approved. It now goes to HR or an Admin."),
    rejected: "Leave request rejected.",
  },
};
export const CORRECTION_FLOW = {
  decide: decideRegularization,
  describe: (r) => `${nameOf(r.userId)}: ${issueLabel(r)}, ${formatDay(r.date)}, corrected to ${r.time}`,
  noteId: "reject-correction-note",
  labels: {
    title: "Reject correction request",
    approved: (result) => (result.record.status === "approved" ? "Correction approved. The attendance record is updated." : "Approved. It now goes to HR or an Admin."),
    rejected: "Correction request rejected.",
    approveFailed: "Couldn't approve the request. It may already have been decided, or the attendance record has changed.",
    rejectFailed: "Couldn't reject the request. It may already have been decided.",
  },
};

// A salary change waiting for an Admin (ui/salary-change-view.js salaryChangeFlow, round 12): salary structure and the inbox.
export const SALARY_FLOW = {
  decide: (proposalId, actorUserId, _role, decision, note) => decideSalaryProposal(actorUserId, proposalId, decision, note),
  describe: describeChange,
  noteId: "reject-salary-note",
  labels: {
    title: "Reject salary change",
    approved: "Salary change approved.",
    rejected: "Salary change rejected.",
    submit: "Reject change",
    placeholder: "Kept with the salary change; the employee doesn't see it",
  },
};

// An expense claim at the Finance or Admin stage (ui/expense-view.js expenseFlow, round 12): expenses and the inbox.
export const EXPENSE_FLOW = {
  decide: decideExpense,
  describe: describeClaim,
  noteId: "reject-expense-note",
  labels: {
    title: "Reject expense claim",
    approved: (result) => (result.record.status === "approved" ? "Claim approved. It's ready to be paid." : `Claim approved. It goes to ${result.record.stage === "admin" ? "an Admin" : "Finance"} next.`),
    rejected: "Claim rejected.",
  },
};

// An asset request (ui/asset-request-view.js assetRequestFlow, round 13): the inbox (and asset assignment later).
export const ASSET_FLOW = {
  decide: decideAssetRequest,
  describe: describeRequest,
  noteId: "reject-asset-request-note",
  labels: {
    title: "Reject asset request",
    approved: (result) => (result.record.status === "approved" ? "Request approved. It's waiting for an asset to be assigned." : "Request approved. It goes to an Admin next."),
    rejected: "Asset request rejected.",
  },
};

// A home location change waiting for an Admin (L2): My locations' requests, in the inbox, the card and the bell. The store
// takes "approved" / "rejected" and keeps an optional note; the inbox's Reject asks for one, as every other kind does.
export const LOCATION_FLOW = {
  decide: (requestId, actorUserId, _role, action, note) => {
    if (action === "reject" && !String(note ?? "").trim()) return { ok: false, error: "Give a reason. The employee sees it.", field: "note" };
    return decideLocationChange(requestId, actorUserId, action === "approve" ? "approved" : "rejected", note ?? "");
  },
  describe: (r) => `${nameOf(r.userId)}: ${r.kind} home to ${r.place.address}`,
  noteId: "reject-location-note",
  labels: {
    title: "Reject location change",
    approved: "Location change approved. The new place counts from now.",
    rejected: "Location change rejected.",
  },
};

const decider = () => ({ id: getCurrentUserId(), role: getCurrentRole()?.key });

export function useDecision(flow) {
  const showToast = useToast();
  const confirm = useConfirm();
  const [rejecting, setRejecting] = useState(null);   // { request, onDone }
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);
  const failure = (fixed, result) => fixed ?? result.error;
  const done = (result, onDone) => { bump(); onDone?.(result); };

  async function approve(request, onDone) {
    if (!(await confirm({ message: `Approve this request?\n${flow.describe(request)}`, confirmLabel: "Approve" }))) return;
    const { id, role } = decider();
    const result = flow.decide(request.id, id, role, "approve");
    if (result.ok) showToast(typeof flow.labels.approved === "function" ? flow.labels.approved(result) : flow.labels.approved, "success");
    else showToast(failure(flow.labels.approveFailed, result), "danger");
    done(result, onDone);
  }
  function reject(request, onDone) { setNote(""); setError(null); setRejecting({ request, onDone }); }
  function submit(e) {
    e.preventDefault();
    const { request, onDone } = rejecting;
    const { id, role } = decider();
    const result = flow.decide(request.id, id, role, "reject", note);
    if (!result.ok && result.field === "note") { setError(result.error); document.getElementById(flow.noteId)?.focus(); return; }
    setRejecting(null);
    if (!result.ok) showToast(failure(flow.labels.rejectFailed, result), "danger");
    else showToast(flow.labels.rejected, "success");
    done(result, onDone);
  }

  const modal = (
    <Modal open={Boolean(rejecting)} onClose={() => setRejecting(null)} title={flow.labels.title} desc={rejecting ? flow.describe(rejecting.request) : ""} size="sm"
      footer={<>
        <button className="btn" type="button" data-modal-close onClick={() => setRejecting(null)}>Cancel</button>
        <button className="btn btn--danger" type="submit" form={`${flow.noteId}-form`}>{flow.labels.submit ?? "Reject request"}</button>
      </>}>
      <form noValidate onSubmit={submit} id={`${flow.noteId}-form`}>
        <div className="form">
          <div className="form-field">
            <label className="form-label form-label--required" htmlFor={flow.noteId}>Reason</label>
            <textarea className="textarea" id={flow.noteId} required placeholder={flow.labels.placeholder ?? "The employee sees this note"} value={note}
              aria-describedby={error ? `${flow.noteId}-error` : undefined} onChange={(e) => { setNote(e.target.value); setError(null); }} />
            {error && <span className="form-error" id={`${flow.noteId}-error`}>{error}</span>}
          </div>
        </div>
      </form>
    </Modal>
  );
  return { approve, reject, modal };
}

// Reject + Approve for one pending request (leave-decision.js decisionButtons).
export function DecisionButtons({ onReject, onApprove, permission }) {
  return (
    <div className="btn-group">
      <button className="btn btn--sm" type="button" data-permission={permission} onClick={onReject}>Reject</button>
      <button className="btn btn--primary btn--sm" type="button" data-permission={permission} onClick={onApprove}>Approve</button>
    </div>
  );
}
