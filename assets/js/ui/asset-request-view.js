// ui/asset-request-view.js
// How an asset request is shown wherever someone sees or acts on it, written
// once so my-assets.html, my-requests.html, the approvals inbox, the asset
// register and the employee dashboard can't word it differently: its title,
// its badges, the one-line description, the Approve / Reject flow, the Close
// flow, and its progress steps for the requester. Every decision goes through
// data/asset-requests-store.js via these flows.
//
// Toasts use fixed text only (toast.js uses innerHTML); names appear only in
// confirm() and the modals' descriptions, which are plain text.

import { decideAssetRequest, closeAssetRequest, waitingOn, STAGE_NAME } from "../data/asset-requests-store.js";
import { assetTypeLabel } from "./inventory-view.js";
import { createDecisionFlow } from "./leave-decision.js";
import { el, formatDay, localDateOf, nameOf, statusBadge, step } from "./leave-view.js";

// The stage names are the store's, so a page and the store's messages agree.
export { STAGE_NAME };

// "Laptop, replaces AST-0188", or just "Monitor".
export const requestTitle = (request) => (request.replacesTag
  ? `${assetTypeLabel(request.assetType)}, replaces ${request.replacesTag}`
  : assetTypeLabel(request.assetType));

// "Arjun Kapoor: Laptop, replaces AST-0188 (ARQ-1). My laptop is over 3 years old"
export const describeRequest = (request) => `${nameOf(request.userId)}: ${requestTitle(request)} (${request.id}). ${request.reason}`;

// Where a request is: a pending one by its stage, an approved one waiting for
// an asset, then how it ended.
const BADGE = {
  manager:   { label: "With manager",         badge: "badge badge--warning badge--dot" },
  admin:     { label: "With Admin",           badge: "badge badge--warning badge--dot" },
  approved:  { label: "Waiting for an asset", badge: "badge badge--info badge--dot" },
  fulfilled: { label: "Fulfilled",            badge: "badge badge--success badge--dot" },
  rejected:  { label: "Rejected",             badge: "badge badge--danger badge--dot" },
  cancelled: { label: "Cancelled",            badge: "badge badge--dot" },
  closed:    { label: "Closed",               badge: "badge badge--dot" },
};

export function requestBadge(request) {
  const look = BADGE[request.status === "pending" ? request.stage : request.status];
  return el("span", look?.badge ?? "badge", look?.label ?? request.status);
}

// The badge my-requests.html shows: the same words as every other request
// there (Pending, Approved, ...), plus Fulfilled and Closed.
export function statusBadgeOf(request) {
  return request.status === "fulfilled" || request.status === "closed" ? requestBadge(request) : statusBadge(request.status);
}

// The note on the entry that ended it (a rejection or closing), or "".
export function endNote(request) {
  if (request.status !== "rejected" && request.status !== "closed") return "";
  const ending = request.status === "rejected" ? "rejected" : "closed";
  return [...request.history].reverse().find((h) => h.decision === ending)?.note ?? "";
}

// ---------- approve / reject / close ----------

// The toast after an approval says where the request went: to an Admin, or
// waiting for an asset after the last stage.
export const assetRequestFlow = createDecisionFlow({
  decide: decideAssetRequest,
  describe: describeRequest,
  modalId: "reject-asset-request-modal",
  noteId: "reject-asset-request-note",
  labels: {
    title: "Reject asset request",
    approved: (result) => (result.record.status === "approved"
      ? "Request approved. It's waiting for an asset to be assigned."
      : "Request approved. It goes to an Admin next."),
    rejected: "Asset request rejected.",
  },
});

// Closing an approved request without an asset: the reject modal's shape (a
// required note the requester sees), with its own wording.
const closeFlow = createDecisionFlow({
  decide: (requestId, actorUserId, _role, _decision, note) => closeAssetRequest(requestId, actorUserId, note),
  describe: describeRequest,
  modalId: "close-asset-request-modal",
  noteId: "close-asset-request-note",
  labels: { title: "Close asset request", submit: "Close request", approved: "", rejected: "Request closed." },
});

export const openCloseModal = closeFlow.openReject;

// ---------- progress ----------

const STEP_TITLE = { manager: "Manager approval", admin: "Admin approval" };
const names = (ids) => ids.map(nameOf).join(", ");
const onDay = (at) => formatDay(localDateOf(at));
const lastEntry = (request, test) => [...request.history].reverse().find(test) ?? null;

// The steps of a request for its requester, from what its history recorded:
// sent; each approval stage (done by whom, skipped and why, current with whom
// it waits, or still to come); then the asset being handed over.
export function assetRequestSteps(request) {
  const steps = [step("done", 1, "Sent", `${formatDay(request.appliedOn)} by you`)];
  for (const stage of ["manager", "admin"]) {
    const n = steps.length + 1;
    const entry = lastEntry(request, (h) => h.stage === stage && h.decision !== "applied" && h.decision !== "cancelled");
    if (request.status === "pending" && request.stage === stage) {
      const ids = waitingOn(request);
      steps.push(step("current", n, STEP_TITLE[stage], ids.length ? `Waiting for ${names(ids)}` : "Nobody can decide this now"));
    } else if (entry?.decision === "skipped") {
      steps.push(step("done", n, `${STEP_TITLE[stage]} skipped`, entry.note));
    } else if (entry?.decision === "approved") {
      steps.push(step("done", n, STEP_TITLE[stage], `Approved by ${nameOf(entry.byUserId)}, ${onDay(entry.at)}`));
    } else if (entry?.decision === "auto-approved") {
      steps.push(step("done", n, STEP_TITLE[stage], "Approved automatically (Admin)"));
    } else if (entry?.decision === "rejected") {
      steps.push(step("done", n, STEP_TITLE[stage], `Rejected by ${nameOf(entry.byUserId)}, ${onDay(entry.at)}`));
    } else {
      steps.push(step("", n, STEP_TITLE[stage], stage === "manager" ? (request.managerId ? nameOf(request.managerId) : "Your manager") : "An Admin"));
    }
  }
  const n = steps.length + 1;
  const ended = lastEntry(request, (h) => h.decision === "fulfilled" || h.decision === "closed");
  if (ended?.decision === "fulfilled") {
    steps.push(step("done", n, "Asset handed over", `${request.assetTag}, from ${nameOf(ended.byUserId)}, ${onDay(ended.at)}`));
  } else if (ended?.decision === "closed") {
    steps.push(step("done", n, "Closed without an asset", `By ${nameOf(ended.byUserId)}: ${ended.note}`));
  } else if (request.status === "approved") {
    const ids = waitingOn(request);
    steps.push(step("current", n, "Asset handed over", ids.length ? `Waiting for ${names(ids)}` : "Nobody can assign one now"));
  } else {
    steps.push(step("", n, "Asset handed over", "An Admin assigns one once it's approved"));
  }
  return steps;
}