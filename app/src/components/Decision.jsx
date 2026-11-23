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
import { decideChange, changeText } from "../../../assets/js/data/employee-record.js";
import { decideOvertimeItem } from "../../../assets/js/data/overtime-store.js";
import { resolveUnlockRequest } from "../../../assets/js/data/lockouts.js";
import { decideVisit, okVisitLocation, rejectVisitLocation } from "../../../assets/js/data/visits.js";   // CV1
import { correctionContext } from "../../../assets/js/data/night-fix.js";
import { approveRequest, rejectRequest, needsBreakGlass } from "../../../assets/js/data/it-desk.js";   // IT2
import { TYPES as IT_TYPES, BREAK_GLASS_MIN } from "../../../assets/js/data/it-rules.js";
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
  describe: (r) => `${nameOf(r.userId)}: ${issueLabel(r)}, ${formatDay(r.date)}, corrected to ${r.time}${correctionContext(r.userId, r.date, r.time)?.nextDay ? " (next day)" : ""}`,
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

// E1: a person's own bank or tax change, for Finance or HR: approved, it applies at once; rejected, the reason is kept for them.
export const PROFILE_FLOW = {
  decide: (requestId, actorUserId, _role, action, note) => decideChange(actorUserId, requestId, action === "approve" ? "approved" : "rejected", note ?? ""),
  describe: (r) => `${nameOf(r.userId)}: ${changeText(r).map(([label, value]) => `${label} ${value}`).join(", ")}`,
  noteId: "reject-profile-note",
  labels: {
    title: "Reject bank or tax change",
    approved: "Change approved. It applies now.",
    rejected: "Change rejected.",
  },
};

// SH1: a day's overtime, for the person's manager (HR or an Admin when they have none). Approved minutes are fixed for the
// month; with comp-off on they also earn comp-off days. A rejection needs a reason, which the employee sees.
const otWords = (m) => [Math.floor(m / 60) ? `${Math.floor(m / 60)} h` : "", m % 60 ? `${m % 60} min` : ""].filter(Boolean).join(" ");
export const OVERTIME_FLOW = {
  decide: (id, actorUserId, _role, action, note) => decideOvertimeItem(actorUserId, id, action === "approve" ? "approved" : "rejected", note ?? ""),
  describe: (o) => `${nameOf(o.userId)}: ${otWords(o.minutes)} overtime on ${formatDay(o.date)} (${o.shiftName}, out at ${o.checkOut})`,
  noteId: "reject-overtime-note",
  labels: {
    title: "Reject overtime",
    approved: (res) => (res.credits?.length ? `Overtime approved. ${res.credits.length === 1 ? "1 comp-off day" : `${res.credits.length} comp-off days`} earned.` : "Overtime approved."),
    rejected: "Overtime rejected.",
  },
};

// F2: a locked account waiting for the Admin: Unlock now (clears the lock and the count; audited) or Dismiss (the lock stays until it
// expires). Dismiss asks for nothing more than a yes in its own small form (a note is optional).
const timeOf = (ms) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
export const UNLOCK_FLOW = {
  decide: (id, actorUserId, _role, action) => resolveUnlockRequest(actorUserId, id, action === "approve" ? "unlock" : "dismiss"),
  describe: (q) => `${nameOf(q.userId)}: locked after ${q.attempts} failed sign-ins, until ${timeOf(q.lockedUntil)}`,
  noteId: "dismiss-unlock-note",
  noteOptional: true,
  labels: {
    title: "Dismiss the unlock request",
    question: "Unlock this account now?",
    confirm: "Unlock now",
    buttons: ["Dismiss", "Unlock now"],
    submit: "Dismiss",
    placeholder: "Optional: why it stays locked",
    approved: "Unlocked. They can sign in now.",
    rejected: "Dismissed. The account stays locked until the lock expires.",
  },
};

// CV1: a client / official visit waiting for the person's manager (HR or an Admin when they have none). A same-day visit is already under way: rejecting
// it afterwards sends the day back to the ordinary rules. A rejection needs a reason, which the employee sees.
const visitDates = (v) => (v.toDate && v.toDate !== v.date ? `${formatDay(v.date)} to ${formatDay(v.toDate)}` : formatDay(v.date));
export const VISIT_FLOW = {
  decide: (id, actorUserId, _role, action, note) => decideVisit(actorUserId, id, action === "approve" ? "approved" : "rejected", note ?? ""),
  describe: (v) => `${nameOf(v.userId)}: visit to ${v.siteName}, ${visitDates(v)}${v.sameDay ? " (same day, already under way)" : ""}`,
  noteId: "reject-visit-note",
  labels: {
    title: "Reject visit",
    approved: "Visit approved.",
    rejected: "Visit rejected.",
  },
};

// CV1b: a punch made as "location unavailable" waiting for the person's approver. The item's id is "<visit>:<date>:<in|out>". Accepting asks for a
// note (approveNote, the same form as a rejection), because the day then counts without a location; rejecting takes the punch back (they check in
// again with a location) and needs a reason.
const locParts = (id) => { const [visitId, date, side] = String(id).split(":"); return { visitId, date, side }; };
export const VISIT_LOCATION_FLOW = {
  decide: (id, actorUserId, _role, action, note) => { const p = locParts(id); return action === "approve" ? okVisitLocation(actorUserId, p.visitId, p.date, p.side, note ?? "") : rejectVisitLocation(actorUserId, p.visitId, p.date, p.side, note ?? ""); },
  describe: (v) => `${nameOf(v.userId)}: ${v.side === "out" ? "check-out" : "check-in"} at ${v.siteName} on ${formatDay(v.date)} without a location ("${v.reason}")`,
  noteId: "visit-location-note",
  approveNote: { title: "Accept without a location", submit: "Accept", placeholder: "Why you accept it (kept with the visit)" },
  labels: {
    title: "Reject the punch",
    submit: "Reject",
    placeholder: "The employee sees this; they check in again with a location",
    approved: "Accepted without a location. The day counts now.",
    rejected: "Rejected. They can check in again with a location.",
  },
};

// IT2: an IT request waiting for an Admin (the inbox, the card and the bell). Approve asks for an optional note; when the request is about or from
// the only Admin it asks for their written reason (break-glass, at least 20 characters), which the desk checks and flags. Reject needs a reason.
const toNote = (r) => (r.ok || !r.field ? r : { ...r, field: "note" });
export const IT_FLOW = {
  decide: (id, actorUserId, _role, action, note) => {
    if (action === "approve") {
      const glass = needsBreakGlass(actorUserId, id);
      return toNote(approveRequest(actorUserId, id, glass ? "" : note, Date.now(), { breakGlass: glass ? note : null }));
    }
    return toNote(rejectRequest(actorUserId, id, note));
  },
  describe: (r) => `${nameOf(r.userId)}: ${IT_TYPES[r.type]?.label ?? r.type}, ${r.title}${needsBreakGlass(getCurrentUserId(), r.id) ? `. You are the only Admin: a written reason of at least ${BREAK_GLASS_MIN} characters is needed (break-glass).` : ""}`,
  noteId: "reject-it-note",
  approveNote: { title: "Approve the IT request", submit: "Approve", optional: true, placeholder: "Optional note. If it is about you or from you and you are the only Admin, give your reason (at least 20 characters)." },
  labels: {
    title: "Reject the IT request",
    submit: "Reject request",
    placeholder: "IT and the person who raised it see this",
    approved: (res) => (res.breakGlass ? "Approved as the only Admin. It is flagged for review." : "Request approved. IT carries it out next."),
    rejected: "Request rejected. It goes back to IT.",
  },
};

const decider = () => ({ id: getCurrentUserId(), role: getCurrentRole()?.key });

export function useDecision(flow) {
  const showToast = useToast();
  const confirm = useConfirm();
  const [rejecting, setRejecting] = useState(null);   // { request, onDone, mode }: mode "approve" only for a flow that asks for a note (approveNote)
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);
  const failure = (fixed, result) => fixed ?? result.error;
  const done = (result, onDone) => { bump(); onDone?.(result); };

  async function approve(request, onDone) {
    if (flow.approveNote) { setNote(""); setError(null); setRejecting({ request, onDone, mode: "approve" }); return; }
    if (!(await confirm({ message: `${flow.labels.question ?? "Approve this request?"}\n${flow.describe(request)}`, confirmLabel: flow.labels.confirm ?? "Approve" }))) return;
    const { id, role } = decider();
    const result = flow.decide(request.id, id, role, "approve");
    if (result.ok) showToast(typeof flow.labels.approved === "function" ? flow.labels.approved(result) : flow.labels.approved, "success");
    else showToast(failure(flow.labels.approveFailed, result), "danger");
    done(result, onDone);
  }
  function reject(request, onDone) { setNote(""); setError(null); setRejecting({ request, onDone }); }
  function submit(e) {
    e.preventDefault();
    const { request, onDone, mode } = rejecting;
    const { id, role } = decider();
    const result = flow.decide(request.id, id, role, mode === "approve" ? "approve" : "reject", note);
    if (!result.ok && result.field === "note") { setError(result.error); document.getElementById(flow.noteId)?.focus(); return; }
    setRejecting(null);
    if (mode === "approve") { if (!result.ok) showToast(failure(flow.labels.approveFailed, result), "danger"); else showToast(typeof flow.labels.approved === "function" ? flow.labels.approved(result) : flow.labels.approved, "success"); }
    else if (!result.ok) showToast(failure(flow.labels.rejectFailed, result), "danger");
    else showToast(flow.labels.rejected, "success");
    done(result, onDone);
  }

  const modal = (
    <Modal open={Boolean(rejecting)} onClose={() => setRejecting(null)} title={rejecting?.mode === "approve" ? flow.approveNote.title : flow.labels.title} desc={rejecting ? flow.describe(rejecting.request) : ""} size="sm"
      footer={<>
        <button className="btn" type="button" data-modal-close onClick={() => setRejecting(null)}>Cancel</button>
        <button className={`btn ${rejecting?.mode === "approve" ? "btn--primary" : "btn--danger"}`} type="submit" form={`${flow.noteId}-form`}>{rejecting?.mode === "approve" ? flow.approveNote.submit : flow.labels.submit ?? "Reject request"}</button>
      </>}>
      <form noValidate onSubmit={submit} id={`${flow.noteId}-form`}>
        <div className="form">
          <div className="form-field">
            <label className={`form-label${(rejecting?.mode === "approve" ? flow.approveNote.optional : flow.noteOptional) ? "" : " form-label--required"}`} htmlFor={flow.noteId}>{(rejecting?.mode === "approve" ? flow.approveNote.optional : flow.noteOptional) ? "Note (optional)" : "Reason"}</label>
            <textarea className="textarea" id={flow.noteId} required={!(rejecting?.mode === "approve" ? flow.approveNote.optional : flow.noteOptional)} placeholder={(rejecting?.mode === "approve" ? flow.approveNote.placeholder : flow.labels.placeholder) ?? "The employee sees this note"} value={note}
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
// labels (F2): [reject, approve] words, e.g. ["Dismiss", "Unlock now"] for an unlock request
export function DecisionButtons({ onReject, onApprove, permission, labels = ["Reject", "Approve"] }) {
  return (
    <div className="btn-group">
      <button className="btn btn--sm" type="button" data-permission={permission} onClick={onReject}>{labels[0]}</button>
      <button className="btn btn--primary btn--sm" type="button" data-permission={permission} onClick={onApprove}>{labels[1]}</button>
    </div>
  );
}
