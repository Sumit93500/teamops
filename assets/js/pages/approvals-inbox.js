// pages/approvals-inbox.js
// Runs on approvals-inbox.html, a personal inbox: any signed-in person can open
// it (route null) and it shows only what waits for them. Real leave requests,
// attendance corrections, expense claims and asset requests join the static
// sample rows (role change, purchase order, backup restore; marked data-static
// in the HTML, whose buttons stay not-implemented).
//   - samples: only with approvals:view (taken off the page otherwise)
//   - leave requests and attendance corrections: what waits at a stage this
//     person holds (ui/waiting.js): the requester's manager by relationship,
//     then HR / an Admin (leave:approve, attendance:approve). Approved /
//     Rejected list every decided one for HR / Admin, and for a manager the
//     ones they decided at some stage.
//   - expense claims: pendingFor() in data/expenses-store.js, which checks each
//     stage on its own: the claimant's manager (by relationship, no permission:
//     how a Team Lead such as Sneha Rao, role Employee, decides), Finance and
//     Admin (by role + expenses:approve). Approved / Rejected list only the
//     claims this person decided themselves.
//   - asset requests: pendingFor() in data/asset-requests-store.js, the same
//     way: the requester's manager (by relationship), then an Admin (by role +
//     assets:approve). Approved / Rejected list only this person's decisions.
// Approve / Reject use the same flows as leave-approvals.html,
// regularization.html, finance/expenses.html and asset-assignment.html
// (ui/leave-decision.js, ui/expense-view.js, ui/asset-request-view.js). A
// session without an employee id (an old sign-in) leaves the static page as
// it is with approvals:view, and an empty inbox without it.

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { applyPermissions, can } from "../core/rbac.js";
import { getUser } from "../data/store.js";
import { allRequests, decidedBy } from "../data/leave-store.js";
import { allRegularizations } from "../data/attendance-store.js";
import { dayNumber, isoFromDayNumber } from "../data/holidays.js";
import { expenseDecisionsBy, managesAnyone } from "../data/expenses-store.js";
import { EXPENSE_POLICY } from "../data/expenses.js";
import { approveLeave, openRejectModal, approveCorrection, openRejectCorrectionModal, decisionButtons } from "../ui/leave-decision.js";
import { STAGE_NAME, categoryLabel, chainText, expenseFlow } from "../ui/expense-view.js";
import { assetRequestDecisionsBy } from "../data/asset-requests-store.js";
import { STAGE_NAME as ASSET_STAGE_NAME, requestTitle as assetRequestTitle, assetRequestFlow } from "../ui/asset-request-view.js";
import { assetTypeLabel } from "../ui/inventory-view.js";
import { rupees } from "../ui/money.js";
import {
  el, todayIso, formatDay, formatDays, requestDates, typeLabel, statusBadge,
  initials, avatarClass, decisionOf, localDateOf, nameOf,
} from "../ui/leave-view.js";
import { setStatValue, setOptionalStatNote } from "../ui/stats.js";
import { correctionDetails } from "../ui/attendance-view.js";
import { waitingFor } from "../ui/waiting.js";

const PILL_TAB = { "Pending": "pending", "Approved": "approved", "Rejected": "rejected" };
const DAY_MS = 24 * 60 * 60 * 1000;

const userId = getCurrentUserId();
const role = getCurrentRole()?.key;
const user = getUser(userId);
// HR / an Admin see every decided leave request and correction; anyone else,
// the ones they decided themselves (a manager's stage).
const allLeave = can("leave:approve");
const allCorrections = can("attendance:approve");
const showSamples = can("approvals:view");

const inboxBody = document.querySelector("#inbox-table tbody");
const waitingHead = document.querySelector("#inbox-table thead th:nth-child(5)");
const decidedBody = document.querySelector("#decided-table tbody");
const pills = Array.from(document.querySelectorAll(".table__toolbar .tabs__tab"));
const typeSelect = document.querySelector('.table__toolbar select[aria-label="Filter by type"]');
const footerMeta = document.querySelector("#inbox-table")?.closest(".card")?.querySelector(".card__footer .card__meta");
const statStrip = document.querySelector(".stat-strip");

let tab = "pending";
let typeFilter = "";

// The static sample rows, read once from the HTML; without approvals:view
// they're taken off the page.
const readStatic = (body) => {
  const rows = Array.from(body?.querySelectorAll("tr[data-static]") ?? []);
  if (!showSamples) rows.forEach((tr) => tr.remove());
  return showSamples ? rows : [];
};
const staticPending = readStatic(inboxBody);
const staticDecided = readStatic(decidedBody);

// ---------- helpers ----------

const leaveTitle = (r) => `Leave: ${nameOf(r.userId)}, ${requestDates(r)}`;
const correctionTitle = (r) => `Regularization: ${nameOf(r.userId)}, ${formatDay(r.date)}`;
const decisionDate = (r) => localDateOf(decisionOf(r).at);
const weekStart = () => isoFromDayNumber(dayNumber(todayIso()) - 6);   // the last 7 days, today included

// "12 min", "3 hours", "1 day", "10 days" since it was sent.
function waitingSince(timestamp) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(timestamp)) / 60000));
  if (minutes < 60) return minutes <= 1 ? "Just now" : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}

// What waits for this person (ui/waiting.js, which the sidebar's Approvals
// count also uses): leave and corrections by permission, expense claims by
// pendingFor(), which is the only judge of who may decide which claim (a claim
// keeps the manager it was sent to, even after that person's reports change).
const leavePending = () => waitingFor(userId, role).leave
  .sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id));
// A manager's own decision on a request: the request as it stood when they decided (their entry last, their decision
// as its status), so their tabs, dates and stats show what they decided, as expense claims and asset requests do.
// null if they never decided it.
function asDecidedBy(request) {
  const i = request.history.map((h) => h.byUserId === userId && (h.decision === "approved" || h.decision === "rejected")).lastIndexOf(true);
  return i < 0 ? null : { ...request, status: request.history[i].decision, history: request.history.slice(0, i + 1) };
}
const leaveDecided = (status) => (allLeave ? allRequests().filter((r) => r.status === status) : allRequests().map(asDecidedBy).filter((r) => r?.status === status))
  .sort((a, b) => decisionOf(b).at.localeCompare(decisionOf(a).at));
const correctionsPending = () => waitingFor(userId, role).corrections
  .sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id, "en", { numeric: true }));
const correctionsDecided = (status) => (allCorrections ? allRegularizations().filter((r) => r.status === status) : allRegularizations().map(asDecidedBy).filter((r) => r?.status === status))
  .sort((a, b) => decisionOf(b).at.localeCompare(decisionOf(a).at));
const expensesPending = () => waitingFor(userId, role).expenses
  .sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id, "en", { numeric: true }));
// [{ claim, entry }]: this person's own decision ("approved" or "rejected").
const expensesDecided = (decision) => (user ? expenseDecisionsBy(userId) : []).filter((d) => d.entry.decision === decision);
const assetsPending = () => waitingFor(userId, role).assets
  .sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id, "en", { numeric: true }));
// [{ request, entry }]: this person's own decision ("approved" or "rejected").
const assetsDecided = (decision) => (user ? assetRequestDecisionsBy(userId) : []).filter((d) => d.entry.decision === decision);
// Whether expense and asset-request figures belong in the stats: anyone who
// can decide a stage, has one waiting, or has decided one.
const showsExpenses = () => Boolean(user) && (can("expenses:approve") || managesAnyone(userId) || expensesPending().length > 0 || expenseDecisionsBy(userId).length > 0);
const showsAssets = () => Boolean(user) && (can("assets:approve") || managesAnyone(userId) || assetsPending().length > 0 || assetRequestDecisionsBy(userId).length > 0);
// The same for leave and corrections: HR / Admin, a manager, or anyone with one waiting or decided.
const showLeave = Boolean(user) && (allLeave || managesAnyone(userId) || leavePending().length > 0 || allRequests().some((r) => decidedBy(r, userId)));
const showCorrections = Boolean(user) && (allCorrections || managesAnyone(userId) || correctionsPending().length > 0 || allRegularizations().some((r) => decidedBy(r, userId)));

const expenseTitle = (claim) => `Expense: ${nameOf(claim.userId)}, ${rupees(claim.amount)}`;
const assetTitle = (request) => `Asset: ${nameOf(request.userId)}, ${assetTypeLabel(request.assetType).toLowerCase()}`;
// When a claim reached the stage this entry decided: the entry just before it.
const reachedAt = (claim, entry) => claim.history[claim.history.indexOf(entry) - 1]?.at ?? claim.history[0].at;

// ---------- inbox rows ----------

function leaveRow(request) {
  const tr = el("tr");
  tr.dataset.type = "leave";
  const titleCell = el("td");
  const wrap = el("div", "table__user");
  wrap.append(el("div", avatarClass(request.userId), initials(nameOf(request.userId))), el("span", "table__user-name", leaveTitle(request)));
  titleCell.append(wrap);
  const typeCell = el("td");
  typeCell.append(el("span", "badge badge--square", "Leave"));

  const actions = el("td", "table__actions");
  if (request.status === "pending") {
    // The manager stage needs no permission (it goes by relationship); the HR stage needs leave:approve.
    actions.append(decisionButtons(request.stage === "manager" ? null : "leave:approve", () => openRejectModal(request, render), () => approveLeave(request, render)));
  }

  tr.append(
    titleCell,
    typeCell,
    el("td", "", nameOf(request.userId)),
    el("td", "", `${typeLabel(request.type)}, ${formatDays(request.days)}`),
    el("td", "", request.status === "pending" ? waitingSince(request.history[0].at) : formatDay(decisionDate(request))),
    actions,
  );
  return tr;
}

function correctionRow(request) {
  const tr = el("tr");
  tr.dataset.type = "attendance";
  const titleCell = el("td");
  const wrap = el("div", "table__user");
  wrap.append(el("div", avatarClass(request.userId), initials(nameOf(request.userId))), el("span", "table__user-name", correctionTitle(request)));
  titleCell.append(wrap);
  const typeCell = el("td");
  typeCell.append(el("span", "badge badge--square", "Attendance"));

  const actions = el("td", "table__actions");
  if (request.status === "pending") {
    actions.append(decisionButtons(request.stage === "manager" ? null : "attendance:approve", () => openRejectCorrectionModal(request, render), () => approveCorrection(request, render)));
  }

  tr.append(
    titleCell,
    typeCell,
    el("td", "", nameOf(request.userId)),
    el("td", "", correctionDetails(request)),
    el("td", "", request.status === "pending" ? waitingSince(request.history[0].at) : formatDay(decisionDate(request))),
    actions,
  );
  return tr;
}

// Pending: the claim's current stage, and, when this person already approved it
// at an earlier stage (an Admin who is also the claimant's manager), when.
// Decided: this person's own decision. Waiting counts from when the claim
// reached its current stage, not from when it was sent.
function expenseRow(claim, decided = null) {
  const tr = el("tr");
  tr.dataset.type = "expense";
  tr.dataset.claimId = claim.id;
  const titleCell = el("td");
  const wrap = el("div", "table__user");
  wrap.append(el("div", avatarClass(claim.userId), initials(nameOf(claim.userId))), el("span", "table__user-name", expenseTitle(claim)));
  titleCell.append(wrap);
  const typeCell = el("td");
  typeCell.append(el("span", "badge badge--square", "Expense"));

  let details;
  if (decided) {
    details = `${categoryLabel(claim.category)}, you ${decided.decision} it at the ${STAGE_NAME[decided.stage]} stage`;
  } else {
    details = `${categoryLabel(claim.category)}, ${STAGE_NAME[claim.stage]} stage`;
    const earlier = claim.history.find((h) => h.byUserId === userId && h.decision === "approved" && h.stage !== claim.stage);
    if (earlier) details += `. You approved it at the ${STAGE_NAME[earlier.stage]} stage on ${formatDay(localDateOf(earlier.at))}`;
  }

  const actions = el("td", "table__actions");
  if (!decided) {
    // The manager stage goes by relationship, so its buttons carry no permission.
    actions.append(decisionButtons(claim.stage === "manager" ? null : "expenses:approve",
      () => expenseFlow.openReject(claim, render), () => expenseFlow.approve(claim, render)));
  }

  tr.append(
    titleCell,
    typeCell,
    el("td", "", nameOf(claim.userId)),
    el("td", "", details),
    el("td", "", decided ? formatDay(localDateOf(decided.at)) : waitingSince(claim.history.at(-1).at)),
    actions,
  );
  return tr;
}

// As an expense row: pending shows the request's current stage (and when this
// person approved it at the manager stage, if they did); decided, their own
// decision. Waiting counts from when it reached its current stage.
function assetRow(request, decided = null) {
  const tr = el("tr");
  tr.dataset.type = "asset";
  tr.dataset.requestId = request.id;
  const titleCell = el("td");
  const wrap = el("div", "table__user");
  wrap.append(el("div", avatarClass(request.userId), initials(nameOf(request.userId))), el("span", "table__user-name", assetTitle(request)));
  titleCell.append(wrap);
  const typeCell = el("td");
  typeCell.append(el("span", "badge badge--square", "Asset"));

  let details;
  if (decided) {
    details = `${assetRequestTitle(request)}, you ${decided.decision} it at the ${ASSET_STAGE_NAME[decided.stage]} stage`;
  } else {
    details = `${assetRequestTitle(request)}, ${ASSET_STAGE_NAME[request.stage]} stage`;
    const earlier = request.history.find((h) => h.byUserId === userId && h.decision === "approved" && h.stage !== request.stage);
    if (earlier) details += `. You approved it at the ${ASSET_STAGE_NAME[earlier.stage]} stage on ${formatDay(localDateOf(earlier.at))}`;
  }

  const actions = el("td", "table__actions");
  if (!decided) {
    // The manager stage goes by relationship, so its buttons carry no permission.
    actions.append(decisionButtons(request.stage === "manager" ? null : "assets:approve",
      () => assetRequestFlow.openReject(request, render), () => assetRequestFlow.approve(request, render)));
  }

  tr.append(
    titleCell,
    typeCell,
    el("td", "", nameOf(request.userId)),
    el("td", "", details),
    el("td", "", decided ? formatDay(localDateOf(decided.at)) : waitingSince(request.history.at(-1).at)),
    actions,
  );
  return tr;
}

// A static "Recently decided" row shown in the inbox's Approved/Rejected tab:
// same columns as the inbox, no details, the decision date in place of waiting.
function decidedClone(tr) {
  const cells = tr.children;
  const out = el("tr");
  out.dataset.type = tr.dataset.type;
  const title = el("td");
  title.append(cells[0].firstElementChild.cloneNode(true));
  const type = el("td");
  type.append(cells[1].firstElementChild.cloneNode(true));
  out.append(title, type, el("td", "", cells[2].textContent.trim()), el("td", "", "—"), el("td", "", cells[4].textContent.trim()), el("td", "table__actions"));
  return out;
}

// Leave, corrections, expense claims and asset requests together: pending by
// date sent (oldest first), decided by decision (newest first). The sort is
// stable, so each kind keeps its own order.
function realRows(which) {
  if (which === "pending") {
    return [
      ...leavePending().map((r) => ({ key: r.appliedOn, node: leaveRow(r) })),
      ...correctionsPending().map((r) => ({ key: r.appliedOn, node: correctionRow(r) })),
      ...expensesPending().map((c) => ({ key: c.appliedOn, node: expenseRow(c) })),
      ...assetsPending().map((r) => ({ key: r.appliedOn, node: assetRow(r) })),
    ].sort((a, b) => a.key.localeCompare(b.key)).map((x) => x.node);
  }
  return [
    ...leaveDecided(which).map((r) => ({ key: decisionOf(r).at, node: leaveRow(r) })),
    ...correctionsDecided(which).map((r) => ({ key: decisionOf(r).at, node: correctionRow(r) })),
    ...expensesDecided(which).map((d) => ({ key: d.entry.at, node: expenseRow(d.claim, d.entry) })),
    ...assetsDecided(which).map((d) => ({ key: d.entry.at, node: assetRow(d.request, d.entry) })),
  ].sort((a, b) => b.key.localeCompare(a.key)).map((x) => x.node);
}

function inboxRows(which) {
  if (which === "pending") return [...staticPending, ...realRows("pending")];
  return [...staticDecided.filter((tr) => tr.dataset.status === which).map(decidedClone), ...realRows(which)];
}

// ---------- rendering ----------

function setStat(label, value) {
  const stat = Array.from(statStrip?.querySelectorAll(".stat") ?? [])
    .find((s) => s.querySelector(".stat__label")?.textContent.trim() === label);
  if (!stat) return;
  setStatValue(stat, value);
  setOptionalStatNote(stat, "");   // no note: the line is removed
}

// Leave and corrections: every decision on them (as before), sent -> decided.
// Expense claims and asset requests: this person's own decisions, from the
// claim or request reaching their stage to their decision.
function renderStats(pendingCount) {
  setStat("Waiting for you", String(pendingCount));
  if (!showLeave && !showCorrections && !showsExpenses() && !showsAssets()) {
    ["Approved this week", "Rejected this week", "Average response"].forEach((label) => setStat(label, "—"));
    return;
  }
  const since = weekStart();
  const requests = [...leaveDecided("approved"), ...leaveDecided("rejected"), ...correctionsDecided("approved"), ...correctionsDecided("rejected")]
    .map((r) => ({ status: r.status, date: decisionDate(r), auto: decisionOf(r).decision === "auto-approved", days: (Date.parse(decisionOf(r).at) - Date.parse(r.history[0].at)) / DAY_MS }));
  const claims = [...expensesDecided("approved"), ...expensesDecided("rejected")]
    .map(({ claim, entry }) => ({ status: entry.decision, date: localDateOf(entry.at), auto: false, days: (Date.parse(entry.at) - Date.parse(reachedAt(claim, entry))) / DAY_MS }));
  const assets = [...assetsDecided("approved"), ...assetsDecided("rejected")]
    .map(({ request, entry }) => ({ status: entry.decision, date: localDateOf(entry.at), auto: false, days: (Date.parse(entry.at) - Date.parse(reachedAt(request, entry))) / DAY_MS }));
  const decided = [...requests, ...claims, ...assets];
  setStat("Approved this week", String(decided.filter((d) => d.status === "approved" && d.date >= since).length));
  setStat("Rejected this week", String(decided.filter((d) => d.status === "rejected" && d.date >= since).length));
  // Auto-approved Admin requests took no decision, so they'd only pull the average down.
  const times = decided.filter((d) => !d.auto).map((d) => d.days);
  setStat("Average response", times.length ? `${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)} days` : "—");
}

// r: a request, or an expense claim given its viewer's decision as status and
// decidedOn (the claim's own status and history aren't that person's decision).
function decidedRow(r, titleText, typeText) {
  const tr = el("tr");
  tr.dataset.date = r.decidedOn ?? decisionDate(r);
  const title = el("td");
  title.append(el("span", "table__user-name", titleText));
  const type = el("td");
  type.append(el("span", "badge badge--square", typeText));
  const decision = el("td");
  decision.append(statusBadge(r.status));
  tr.append(title, type, el("td", "", nameOf(r.userId)), decision, el("td", "", formatDay(tr.dataset.date)));
  return tr;
}

function renderRecentlyDecided() {
  const since = weekStart();
  const recent = (r) => decisionDate(r) >= since;
  const leave = [...leaveDecided("approved"), ...leaveDecided("rejected")].filter(recent)
    .map((r) => decidedRow(r, leaveTitle(r), "Leave"));
  const fixes = [...correctionsDecided("approved"), ...correctionsDecided("rejected")].filter(recent)
    .map((r) => decidedRow(r, correctionTitle(r), "Attendance"));
  const claims = [...expensesDecided("approved"), ...expensesDecided("rejected")]
    .map(({ claim, entry }) => decidedRow({ ...claim, status: entry.decision, decidedOn: localDateOf(entry.at) }, expenseTitle(claim), "Expense"))
    .filter((tr) => tr.dataset.date >= since);
  const assets = [...assetsDecided("approved"), ...assetsDecided("rejected")]
    .map(({ request, entry }) => decidedRow({ ...request, status: entry.decision, decidedOn: localDateOf(entry.at) }, assetTitle(request), "Asset"))
    .filter((tr) => tr.dataset.date >= since);
  decidedBody.replaceChildren(...[...staticDecided, ...leave, ...fixes, ...claims, ...assets].sort((a, b) => (b.dataset.date ?? "").localeCompare(a.dataset.date ?? "")));
}

// "Who approves what": the expense lines, from the rules (ui/expense-view.js).
function renderWhoApproves() {
  const rows = document.querySelectorAll("#who-approves .kv__row");
  if (rows.length < 2) return;
  const chain = chainText();
  rows[0].querySelector("dd").textContent = chain.always;
  rows[1].querySelector("dd").textContent = `Then ${chain.extra} too, above ${rupees(EXPENSE_POLICY.adminAbove)}`;
}

function render() {
  const counts = { pending: inboxRows("pending").length, approved: inboxRows("approved").length, rejected: inboxRows("rejected").length };
  pills.forEach((pill) => {
    const badge = pill.querySelector(".badge--count");
    if (badge) badge.textContent = String(counts[pillTab(pill)] ?? 0);
  });

  const all = inboxRows(tab);
  const shown = all.filter((tr) => !typeFilter || tr.dataset.type === typeFilter);
  if (shown.length) {
    inboxBody.replaceChildren(...shown);
  } else {
    const td = el("td", "text-muted", tab === "pending" && !typeFilter ? "Nothing is waiting for you." : "Nothing here for these filters.");
    td.colSpan = 6;
    const tr = el("tr");
    tr.append(td);
    inboxBody.replaceChildren(tr);
  }
  if (waitingHead) waitingHead.textContent = tab === "pending" ? "Waiting" : "Decided";
  applyPermissions(inboxBody);
  if (footerMeta) footerMeta.textContent = `Showing ${shown.length} of ${all.length} ${tab} requests`;

  renderStats(counts.pending);
  renderRecentlyDecided();
}

function pillTab(pill) {
  const label = Array.from(pill.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim();
  return PILL_TAB[label] ?? "pending";
}

// ---------- start ----------

if (!user && !showSamples && inboxBody) {
  // An old session without approvals:view: nothing can be looked up and the
  // samples are gone, so say so rather than show an empty table.
  const td = el("td", "text-muted", "Nothing is waiting for you.");
  td.colSpan = 6;
  const tr = el("tr");
  tr.append(td);
  inboxBody.replaceChildren(tr);
}

if (user && inboxBody && decidedBody) {
  renderWhoApproves();
  if (typeSelect) {
    Array.from(typeSelect.options).forEach((o) => { o.value = o.textContent.trim() === "All types" ? "" : o.textContent.trim().toLowerCase(); });
    typeSelect.addEventListener("change", () => {
      typeFilter = typeSelect.value;
      render();
    });
  }
  // ui/tabs.js already moves the is-active highlight between pills on click.
  pills.forEach((pill) => pill.addEventListener("click", () => {
    tab = pillTab(pill);
    render();
  }));
  render();
}