// data/asset-requests-store.js
// Asset requests, kept in localStorage through data/collection.js. Anyone may
// ask for equipment (assets:request, every role). A request describes what is
// wanted, never a specific tag: the asset type, why, and optionally which of
// the requester's own assets it replaces. The tag is chosen when the asset is
// handed over, so nothing is reserved while a request waits.
//
// A request: { id, userId, assetType (a key of ASSET_TYPES), reason,
// replacesTag (one of the requester's assets when it was sent, or null),
// status, stage, managerId, appliedOn, assetTag (the asset that fulfilled it,
// else null), history }.
//   status: "pending" | "approved" (every stage done, waiting for an asset) |
//           "fulfilled" | "rejected" | "cancelled" | "closed" (approved, then
//           closed without an asset)
//   stage:  whose turn it is: "manager" | "admin" while pending,
//           "fulfilment" once approved, "done" after that.
// history entries are { stage, byUserId, decision, at, note }, as on expense
// claims, with decision "applied", "skipped" (byUserId null), "approved",
// "auto-approved", "rejected", "cancelled", "fulfilled" (note: the tag
// handed over) or "closed" (note: why).
//
// Two approval stages, decided as an expense claim's manager and Admin stages
// are:
//   manager  the requester's manager (managerFor(), worked out when the
//            request is sent). Goes by relationship, not by permission.
//   admin    an Admin (role "admin", with assets:approve).
// Nobody decides their own request, and a stage nobody holds is skipped (no
// manager on file: straight to an Admin). An Admin's own request is approved
// at both stages at once. Someone who is both the manager and an Admin
// decides both stages, as with expense claims. The stage order and the
// skipping are expenses.js's nextStage() / firstStage(), so the two chains
// can't drift apart.
//
// Fulfilment is a separate step (assets:approve and assets:assign stay
// separate permissions): someone with assets:assign hands over an available
// asset of the requested type through fulfilAssetRequest(), which assigns it
// with inventory-store.js's assignAsset() (its stock-out and history) and
// records the tag here. The asset it replaces isn't taken back by this; that
// stays the asset register's Update, Return. An approved request that can't
// be fulfilled can be cancelled by the requester, or closed with a note by
// someone with assets:assign.
//
// The Reset demo data button (users-list.js) calls resetAssetRequestData().

import { createCollection, fail } from "./collection.js";
import { getUser, getAllUsers } from "./store.js";
import { managerFor } from "./leave-store.js";
import { nextStage, firstStage } from "./expenses.js";
import { ASSET_TYPES } from "./inventory.js";
import { getAsset, assetTypeOf, assignAsset } from "./inventory-store.js";
import { ROLES } from "../config/roles.js";

// ---------- seed ----------

// The two requests asset-assignment.html's sample card showed, with real
// people. Arjun's laptop upgrade is with his manager (Sneha Rao), sent on
// 17 Sep as my-requests.html's static row said. Ananya has no manager on
// file, so her monitor request went straight to the Admin stage.
const at = (date, time) => new Date(`${date}T${time}:00+05:30`).toISOString();   // office time (India), stored as the instant
const NO_MANAGER = "No manager on file";

const SEED = [
  { id: "ARQ-1", userId: "EMP-1105", assetType: "laptop", reason: "My laptop is over 3 years old and too slow for builds",
    replacesTag: "AST-0188", status: "pending", stage: "manager", managerId: "EMP-1029", appliedOn: "2026-09-17", assetTag: null,
    history: [{ stage: "manager", byUserId: "EMP-1105", decision: "applied", at: at("2026-09-17", "10:15"), note: "" }] },
  { id: "ARQ-2", userId: "EMP-1017", assetType: "monitor", reason: "A second monitor for the weekly sales reports",
    replacesTag: null, status: "pending", stage: "admin", managerId: null, appliedOn: "2026-09-24", assetTag: null,
    history: [{ stage: "manager", byUserId: "EMP-1017", decision: "applied", at: at("2026-09-24", "12:40"), note: "" },
      { stage: "manager", byUserId: null, decision: "skipped", at: at("2026-09-24", "12:40"), note: NO_MANAGER }] },
];

const requests = createCollection({ key: "asset-requests", version: 1, seed: () => SEED, idPrefix: "ARQ-" });

// ---------- small helpers ----------

const CHAIN = ["manager", "admin"];
// Each stage as words say it ("the Admin stage"); ui/asset-request-view.js shows the same names.
export const STAGE_NAME = { manager: "manager", admin: "Admin" };

const pad = (n) => String(n).padStart(2, "0");

// Today's date where the person is (local calendar), as ISO.
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const roleCan = (roleKey, permission) => Boolean(ROLES[roleKey]?.permissions.includes(permission));
const isActive = (user) => Boolean(user) && user.status !== "inactive";
const typeWord = (key) => ASSET_TYPES[key]?.label.toLowerCase() ?? key;

// May this user (a stored user record) decide the request at this stage?
// Never their own; otherwise the stage's rule above.
function holdsStage(request, stage, user) {
  if (!isActive(user) || user.id === request.userId) return false;
  if (stage === "manager") return user.id === request.managerId;
  return stage === "admin" && user.role === "admin" && roleCan(user.role, "assets:approve");
}

// The ids of everyone who may decide this stage of the request.
function holdersOf(request, stage) {
  return getAllUsers().filter((u) => holdsStage(request, stage, u)).map((u) => u.id);
}

const isHeldFor = (request) => (stage) => holdersOf(request, stage).length > 0;

// Someone active whose role may hand over assets (assets:assign).
const mayAssign = (user) => isActive(user) && roleCan(user.role, "assets:assign");

// One "skipped" history entry per stage passed over.
const skipEntries = (stages, now) => stages.map((stage) => ({
  stage, byUserId: null, decision: "skipped", at: now,
  note: stage === "manager" ? NO_MANAGER : `Nobody else can decide the ${STAGE_NAME[stage]} stage`,
}));

// ---------- writes ----------

// fields: { assetType, reason, replacesTag }. Anything else is ignored.
// replacesTag is optional: one of the requester's own assets, of the same type.
export function submitAssetRequest(userId, fields = {}) {
  const user = getUser(userId);
  if (!user) return fail(`No employee with id ${userId}.`);
  if (!isActive(user)) return fail(`${user.name} is inactive and can't request equipment.`);

  const assetType = String(fields.assetType ?? "");
  const reason = String(fields.reason ?? "").trim();
  const replacesTag = String(fields.replacesTag ?? "").trim() || null;

  if (!Object.hasOwn(ASSET_TYPES, assetType)) return fail("Choose what you need.", "assetType");
  if (replacesTag) {
    const old = getAsset(replacesTag);
    if (!old || old.status !== "assigned" || old.holderId !== user.id) return fail("You can only replace equipment assigned to you.", "replacesTag");
    if (assetTypeOf(old) !== assetType) return fail(`${replacesTag} isn't a ${typeWord(assetType)}.`, "replacesTag");
  }
  if (!reason) return fail("Say why you need it.", "reason");

  const now = new Date().toISOString();
  const draft = { userId: user.id, assetType, reason, replacesTag, managerId: managerFor(user.id), appliedOn: todayIso(), assetTag: null };
  const history = [{ stage: CHAIN[0], byUserId: user.id, decision: "applied", at: now, note: "" }];

  let status = "pending";
  let stage;
  if (user.role === "admin") {
    CHAIN.forEach((s) => history.push({ stage: s, byUserId: user.id, decision: "auto-approved", at: now, note: "Auto-approved (Admin)" }));
    status = "approved";
    stage = "fulfilment";
  } else {
    const first = firstStage(CHAIN, isHeldFor(draft));
    if (!first.stage) return fail("Nobody can approve this request at the moment. Ask an Admin.");
    history.push(...skipEntries(first.skipped, now));
    stage = first.stage;
  }
  return requests.add({ ...draft, status, stage, history });
}

// decision: "approve" | "reject", for the request's current stage only.
// Approving moves it to the Admin stage, or (after the last) to "approved",
// waiting for an asset; rejecting ends it at any stage and needs a note.
export function decideAssetRequest(requestId, deciderUserId, deciderRole, decision, note = "") {
  const request = requests.get(requestId);
  if (!request) return fail(`No asset request ${requestId}.`);
  const decider = getUser(deciderUserId);
  if (!isActive(decider) || decider.role !== deciderRole) return fail("You can't decide asset requests.");
  if (deciderUserId === request.userId) return fail("You can't decide your own asset request.");
  if (request.status !== "pending") return fail(`This request is already ${request.status}.`);
  if (!holdsStage(request, request.stage, decider)) {
    const who = request.stage === "manager" ? "the requester's manager" : "an Admin";
    return fail(`Only ${who} can decide this request at the ${STAGE_NAME[request.stage]} stage.`);
  }
  if (decision !== "approve" && decision !== "reject") return fail('Decision must be "approve" or "reject".');
  const text = String(note ?? "").trim();
  if (decision === "reject" && !text) return fail("Add a note saying why the request is rejected.", "note");

  const now = new Date().toISOString();
  const entry = { stage: request.stage, byUserId: deciderUserId, decision: decision === "approve" ? "approved" : "rejected", at: now, note: text };
  if (decision === "reject") {
    return requests.update(requestId, { status: "rejected", stage: "done", history: [...request.history, entry] });
  }
  const next = nextStage(CHAIN, request.stage, isHeldFor(request));
  return requests.update(requestId, {
    status: next.stage ? "pending" : "approved",
    stage: next.stage ?? "fulfilment",
    history: [...request.history, entry, ...skipEntries(next.skipped, now)],
  });
}

// Hands an available asset of the requested type to the requester and marks
// the request fulfilled. fields: { date, condition }, as assignAsset() takes
// them (left out: today, and the asset's own condition). Every check on the
// asset and the person is assignAsset()'s; its refusal is returned as it is.
// Success: { ok: true, record (the request), asset (the asset as assigned) }.
export function fulfilAssetRequest(requestId, actorUserId, tag, fields = {}) {
  const request = requests.get(requestId);
  if (!request) return fail(`No asset request ${requestId}.`);
  if (!mayAssign(getUser(actorUserId))) return fail("You can't assign assets.");
  if (request.status === "pending") return fail("This request is still waiting for approval.");
  if (request.status !== "approved") return fail(`This request is already ${request.status}.`);
  const assetTag = String(tag ?? "").trim();
  if (!assetTag) return fail("Choose an asset.", "tag");
  const asset = getAsset(assetTag);
  if (!asset) return fail(`No asset ${assetTag}.`, "tag");
  if (assetTypeOf(asset) !== request.assetType) return fail(`${assetTag} isn't a ${typeWord(request.assetType)}.`, "tag");

  const handOver = { holderId: request.userId };
  if (fields.date !== undefined) handOver.date = fields.date;
  if (fields.condition !== undefined) handOver.condition = fields.condition;
  const assigned = assignAsset(actorUserId, assetTag, handOver);
  if (!assigned.ok) return assigned;

  const entry = { stage: "fulfilment", byUserId: actorUserId, decision: "fulfilled", at: new Date().toISOString(), note: assetTag };
  const saved = requests.update(requestId, { status: "fulfilled", stage: "done", assetTag, history: [...request.history, entry] });
  if (!saved.ok) return fail(`${assetTag} was assigned, but the request couldn't be updated: ${saved.error}`);
  return { ...saved, asset: assigned.record };
}

// Closes an approved request without an asset (e.g. nothing of that type can
// be handed over). Someone with assets:assign; the note (required) says why.
export function closeAssetRequest(requestId, actorUserId, note = "") {
  const request = requests.get(requestId);
  if (!request) return fail(`No asset request ${requestId}.`);
  if (!mayAssign(getUser(actorUserId))) return fail("You can't close asset requests.");
  if (request.status === "pending") return fail("This request is still waiting for approval.");
  if (request.status !== "approved") return fail(`This request is already ${request.status}.`);
  const text = String(note ?? "").trim();
  if (!text) return fail("Add a note saying why the request is closed.", "note");
  const entry = { stage: "fulfilment", byUserId: actorUserId, decision: "closed", at: new Date().toISOString(), note: text };
  return requests.update(requestId, { status: "closed", stage: "done", history: [...request.history, entry] });
}

// Only the person who sent it, until an asset is handed over: while it waits
// for a decision, or approved and waiting for an asset.
export function cancelAssetRequest(requestId, userId) {
  const request = requests.get(requestId);
  if (!request) return fail(`No asset request ${requestId}.`);
  if (request.userId !== userId) return fail("Only the person who sent this request can cancel it.");
  if (request.status !== "pending" && request.status !== "approved") return fail(`This request is already ${request.status}, so it can't be cancelled.`);
  const entry = { stage: request.stage, byUserId: userId, decision: "cancelled", at: new Date().toISOString(), note: "" };
  return requests.update(requestId, { status: "cancelled", stage: "done", history: [...request.history, entry] });
}

// ---------- reads (always deep copies) ----------

export function allAssetRequests() {
  return requests.getAll();
}

export function getAssetRequest(id) {
  return requests.get(id);
}

export function assetRequestsFor(userId) {
  return requests.getAll().filter((r) => r.userId === userId);
}

// Pending requests waiting on this person at their current stage: as the
// requester's manager, or as an Admin. Never their own. [] for an unknown or
// inactive person, or a roleKey that isn't theirs.
export function pendingFor(deciderUserId, roleKey) {
  const decider = getUser(deciderUserId);
  if (!isActive(decider) || decider.role !== roleKey) return [];
  return requests.getAll().filter((r) => r.status === "pending" && holdsStage(r, r.stage, decider));
}

// Approved requests waiting for an asset, oldest sent first.
export function awaitingAsset() {
  return requests.getAll().filter((r) => r.status === "approved")
    .sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id, "en", { numeric: true }));
}

// The ids of the people a request is waiting on: whoever may decide its
// current stage while pending, whoever may hand over an asset once approved,
// [] after that.
export function waitingOn(request) {
  if (!request) return [];
  if (request.status === "pending") return holdersOf(request, request.stage);
  if (request.status === "approved") return getAllUsers().filter(mayAssign).map((u) => u.id);
  return [];
}

// Where a request from this person would go if sent now, by the same rules
// submitAssetRequest() uses (nothing is stored): [{ stage, holderIds }] in
// order, holderIds [] for a stage that would be skipped. [] for an Admin
// (approved at once) or someone unknown or inactive.
export function previewRoute(userId) {
  const user = getUser(userId);
  if (!isActive(user) || user.role === "admin") return [];
  const draft = { userId: user.id, managerId: managerFor(user.id) };
  return CHAIN.map((stage) => ({ stage, holderIds: holdersOf(draft, stage) }));
}

// The requests this person decided: one { request, entry } per request, entry
// being their latest "approved" or "rejected" history entry on it (auto-
// approvals, hand-overs and closing aren't decisions). Newest decision first.
export function assetRequestDecisionsBy(userId) {
  return requests.getAll()
    .map((request) => ({ request, entry: [...request.history].reverse().find((h) => h.byUserId === userId && (h.decision === "approved" || h.decision === "rejected")) }))
    .filter((d) => d.entry)
    .sort((a, b) => b.entry.at.localeCompare(a.entry.at) || b.request.id.localeCompare(a.request.id, "en", { numeric: true }));
}

// ---------- reset ----------

// Throws away every change to asset requests in this browser.
export function resetAssetRequestData() {
  requests.reset();
}