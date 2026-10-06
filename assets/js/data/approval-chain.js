// data/approval-chain.js
// The two-step approval chain shared by leave requests (data/leave-store.js)
// and attendance corrections (data/attendance-store.js):
//   manager  the requester's manager: request.managerId, stored when the
//            request is sent (managerFor() in leave-store.js: the reporting
//            manager's name matched to exactly one active user). Decided by
//            relationship, not by permission, as the manager stage of an
//            expense claim or an asset request is.
//   hr       anyone active whose role holds the kind's permission
//            (leave:approve or attendance:approve: HR and Admin).
// Nobody decides their own request at either stage. A request with no manager
// on file starts at "hr". If the manager can no longer decide (made inactive or
// removed after the request reached them), whoever holds the HR stage may
// decide the manager stage instead, so a request is never stuck.
// Someone who is both the manager and an HR-stage holder decides both stages
// (Aarav for Priya and for Kabir): the same accepted limitation as on expense
// claims and asset requests (round-5b-notes.md).
// Expense claims and asset requests keep their own chain (data/expenses.js).

import { getUser, getAllUsers } from "./store.js";
import { ROLES } from "../config/roles.js";

export const CHAIN_STAGES = ["manager", "hr"];

const isActive = (user) => Boolean(user) && user.status !== "inactive";

// permission: the one that holds the HR stage. Returns that kind's rules.
export function createChain(permission) {
  const holdsHr = (user) => Boolean(ROLES[user.role]?.permissions.includes(permission));

  // Can the request's manager still decide it? Active, and not the requester.
  function managerCanDecide(request) {
    const manager = request.managerId ? getUser(request.managerId) : null;
    return isActive(manager) && manager.id !== request.userId;
  }

  // May this user (a stored user record) decide this stage of the request?
  function holds(request, stage, user) {
    if (!isActive(user) || user.id === request.userId) return false;
    if (stage === "manager") return managerCanDecide(request) ? user.id === request.managerId : holdsHr(user);
    return stage === "hr" && holdsHr(user);
  }

  // The ids of everyone who may decide this stage of the request.
  const holdersOf = (request, stage) => getAllUsers().filter((u) => holds(request, stage, u)).map((u) => u.id);

  // After `stage` is approved: { stage, skipped }. "hr" after the manager if
  // anyone holds it; otherwise null (approved) with "hr" passed over.
  function nextStage(request, stage) {
    if (stage !== "manager") return { stage: null, skipped: [] };
    return holdersOf(request, "hr").length ? { stage: "hr", skipped: [] } : { stage: null, skipped: ["hr"] };
  }

  // Why someone who doesn't hold the request's current stage can't decide it, in words.
  function refusal(request) {
    if (request.stage === "manager" && managerCanDecide(request)) {
      return `Only ${getUser(request.managerId).name}, the requester's manager, can decide this request now.`;
    }
    return request.stage === "manager"
      ? "Only HR or an Admin can decide this request now: its manager can no longer decide it."
      : "Only HR or an Admin can decide this request at the HR stage.";
  }

  return { holds, holdersOf, nextStage, managerCanDecide, refusal };
}

// The history entry for a stage passed over because nobody else can decide it.
export const skippedEntry = (stage, at) => ({
  stage, byUserId: null, decision: "skipped", at, note: `Nobody else can decide the ${stage === "hr" ? "HR" : "manager"} stage`,
});