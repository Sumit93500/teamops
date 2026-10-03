// pages/expenses.js
// Runs on expenses.html (needs expenses:view: Finance and Admin). Every claim
// in data/expenses-store.js, in Pending / Approved / Paid / Rejected tabs, with
// search, a category filter and pagination; the stat strip, spend by
// category, the policy card (built from EXPENSE_POLICY) and the alert, all
// from the same claims. Figures cover every claim held now, not a calendar
// month. Cancelled claims have no tab: nothing is left to do with them.
//
// Approve and Reject (ui/leave-decision.js's createDecisionFlow) are offered
// only at the Finance and Admin stages, to whoever holds that stage. A claim
// at its manager stage waits for the manager, who can't decide it from this
// page (that comes with the approvals inbox). "Pay approved claims" marks
// paid every approved claim the signed-in person may pay (payableFor); it
// records the payment, nothing more. Receipts are names only: no file is
// stored, so they aren't links.

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { can, applyPermissions } from "../core/rbac.js";
import { getUser } from "../data/store.js";
import { EXPENSE_POLICY, CATEGORIES, CATEGORY_KEYS, chainFor, needsReceipt } from "../data/expenses.js";
import {
  allExpenses, decideExpense, payExpense, pendingFor, payableFor, waitingOn, expenseTotals, averageProcessingDays,
} from "../data/expenses-store.js";
import { createDecisionFlow, decisionButtons } from "../ui/leave-decision.js";
import { el, formatDay, localDateOf, plural, nameOf, departmentName, personCell } from "../ui/leave-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";
import { barRow } from "../ui/chart.js";
import { renderPagination } from "../ui/pagination.js";
import { rupees } from "../ui/money.js";
import { showToast } from "../ui/toast.js";

const PAGE_SIZE = 10;
const PILL_TAB = { "Pending": "pending", "Approved": "approved", "Paid": "paid", "Rejected": "rejected" };
// The stages decided on this page; the manager stage isn't (see the top).
const PAGE_STAGES = ["finance", "admin"];
const STAGE_NAME = { manager: "manager", finance: "Finance", admin: "Admin" };
const BADGE = {
  manager:  { label: "With manager", badge: "badge badge--warning badge--dot" },
  finance:  { label: "With Finance", badge: "badge badge--info badge--dot" },
  admin:    { label: "With Admin",   badge: "badge badge--warning badge--dot" },
  approved: { label: "Approved",     badge: "badge badge--success badge--dot" },
  paid:     { label: "Paid",         badge: "badge badge--success badge--dot" },
  rejected: { label: "Rejected",     badge: "badge badge--danger badge--dot" },
};
const EMPTY = {
  pending: "No claims are waiting for approval.",
  approved: "No approved claims are waiting to be paid.",
  paid: "No claims have been paid yet.",
  rejected: "No claims have been rejected.",
};

const $ = (id) => document.getElementById(id);
const stat = (key) => document.querySelector(`[data-stat="${key}"]`);
const claimsText = (n) => plural(n, "claim", "claims");
const categoryLabel = (key) => CATEGORIES[key]?.label ?? key;

const userId = getCurrentUserId();
const role = getCurrentRole()?.key;

const pills = Array.from(document.querySelectorAll(".table__toolbar .tabs__tab"));
const tbody = $("expense-rows");
const payButton = $("pay-approved");

let tab = "pending";
let search = "";
let categoryFilter = "";   // "" = all, or a category key
let currentPage = 1;

// ---------- data ----------

const lastAt = (claim) => claim.history.at(-1)?.at ?? "";
const entryOf = (claim, decision) => [...claim.history].reverse().find((h) => h.decision === decision) ?? null;

// Pending and approved: oldest sent first, like a queue. Paid and rejected:
// the most recent first.
function tabClaims(claims, which) {
  const list = claims.filter((c) => c.status === which);
  if (which === "pending" || which === "approved") {
    return list.sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id, "en", { numeric: true }));
  }
  return list.sort((a, b) => lastAt(b).localeCompare(lastAt(a)) || b.id.localeCompare(a.id, "en", { numeric: true }));
}

function matches(claim) {
  const query = search.trim().toLowerCase();
  return (!categoryFilter || claim.category === categoryFilter)
    && (!query || nameOf(claim.userId).toLowerCase().includes(query));
}

// The ids of the claims the signed-in person may approve or reject here.
function decidableIds() {
  if (!userId) return new Set();
  return new Set(pendingFor(userId, role).filter((c) => PAGE_STAGES.includes(c.stage)).map((c) => c.id));
}

const names = (ids) => ids.map(nameOf).join(", ");

// ---------- approve / reject ----------

const flow = createDecisionFlow({
  decide: decideExpense,
  describe: (claim) => `${nameOf(claim.userId)}: ${categoryLabel(claim.category)}, ${rupees(claim.amount)}, spent ${formatDay(claim.date)} (${claim.id})`,
  modalId: "reject-expense-modal",
  noteId: "reject-expense-note",
  labels: {
    title: "Reject expense claim",
    approved: (result) => (result.record.status === "approved"
      ? "Claim approved. It's ready to be paid."
      : `Claim approved. It goes to ${result.record.stage === "admin" ? "an Admin" : "Finance"} next.`),
    rejected: "Claim rejected.",
  },
});

// ---------- table ----------

// The category, and the claimant's reason under it.
function categoryCell(claim) {
  const td = el("td");
  td.append(el("div", "", categoryLabel(claim.category)), el("div", "text-sm text-muted", claim.reason));
  return td;
}

function receiptCell(claim) {
  const td = el("td");
  if (claim.receipt) {
    const name = el("span", "text-sm", claim.receipt);
    name.title = "The claimant's name for the receipt. No file is stored in this demo.";
    td.append(name);
  } else if (needsReceipt(claim.amount)) {
    td.append(el("span", "receipt receipt--missing", "No receipt"));
  } else {
    td.append(el("span", "text-sm text-muted", "Not needed"));
  }
  return td;
}

function stageCell(claim) {
  const look = BADGE[claim.status === "pending" ? claim.stage : claim.status];
  const td = el("td");
  td.append(el("span", look?.badge ?? "badge", look?.label ?? claim.status));
  return td;
}

const muted = (text) => el("span", "text-sm text-muted", text);

// What happens next, or what happened: the buttons for whoever may decide the
// claim here, otherwise who it's waiting on, who paid it, or why it was
// rejected. Present on every row so each has as many cells as the header (the
// CSV export relies on that; it leaves this column out).
function actionsCell(claim, decidable) {
  const td = el("td", "table__actions");
  if (claim.status === "pending") {
    if (decidable.has(claim.id)) {
      td.append(decisionButtons("expenses:approve", () => flow.openReject(claim, render), () => flow.approve(claim, render)));
      return td;
    }
    const ids = waitingOn(claim);
    if (!ids.length) td.append(muted("Nobody can decide this now"));
    else td.append(muted(claim.stage === "manager" ? `Waiting for the manager, ${names(ids)}` : `Waiting for ${names(ids)}`));
  } else if (claim.status === "approved") {
    const ids = waitingOn(claim);
    if (userId && ids.includes(userId)) td.append(muted("You can pay this"));
    else td.append(muted(ids.length ? `To be paid by ${names(ids)}` : "Nobody can pay this now"));
  } else if (claim.status === "paid") {
    const paid = entryOf(claim, "paid");
    td.append(el("div", "text-sm text-muted", paid ? `Paid ${formatDay(localDateOf(paid.at))} by ${nameOf(paid.byUserId)}` : "Paid"));
    if (paid?.note) td.append(el("div", "text-sm text-muted", paid.note));
  } else if (claim.status === "rejected") {
    td.append(muted(entryOf(claim, "rejected")?.note || "Rejected"));
  }
  return td;
}

function row(claim, decidable) {
  const person = getUser(claim.userId);
  const amount = el("td", "table__num");
  amount.append(el("span", "expense-amount", rupees(claim.amount)));
  const tr = el("tr");
  tr.dataset.claimId = claim.id;
  tr.append(
    personCell(claim.userId, person, departmentName(person?.department)),
    categoryCell(claim),
    el("td", "", formatDay(claim.date)),
    amount,
    receiptCell(claim),
    stageCell(claim),
    actionsCell(claim, decidable),
  );
  return tr;
}

function renderTable(claims) {
  const rows = tabClaims(claims, tab).filter(matches);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (pageRows.length) {
    const decidable = decidableIds();
    tbody.replaceChildren(...pageRows.map((c) => row(c, decidable)));
  } else {
    const td = el("td", "text-muted", search || categoryFilter ? "No claims match these filters." : EMPTY[tab]);
    td.colSpan = 7;
    const tr = el("tr");
    tr.append(td);
    tbody.replaceChildren(tr);
  }
  applyPermissions(tbody);

  renderPagination($("expense-pagination"), {
    totalItems: rows.length,
    pageSize: PAGE_SIZE,
    currentPage,
    onPageChange: (page) => {
      currentPage = page;
      renderTable(allExpenses());
    },
  });
}

function pillTab(pill) {
  const label = Array.from(pill.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim();
  return PILL_TAB[label] ?? "pending";
}

function renderCounts(claims) {
  pills.forEach((pill) => {
    const badge = pill.querySelector(".badge--count");
    if (badge) badge.textContent = String(tabClaims(claims, pillTab(pill)).length);
  });
}

// ---------- stat strip ----------

function renderStats(claims) {
  const { pending, approved, rejected } = expenseTotals(claims).byStatus;
  setStatValue(stat("open"), String(pending.count));
  setStatNote(stat("open"), `${rupees(pending.amount)} to review`, pending.count ? "down" : "");
  setStatValue(stat("approved"), rupees(approved.amount));
  setStatNote(stat("approved"), approved.count ? `${claimsText(approved.count)} waiting to be paid` : "Nothing waiting to be paid", approved.count ? "up" : "");
  setStatValue(stat("rejected"), String(rejected.count));
  setStatNote(stat("rejected"), rejected.count ? `${rupees(rejected.amount)} in total` : "None so far");

  // From sending to the final approval, over approved and paid claims (see processingDays()).
  const average = averageProcessingDays(claims);
  const target = EXPENSE_POLICY.processingTargetDays;
  setStatValue(stat("processing"), average === null ? "—" : `${average.toFixed(1)} days`);
  setStatNote(stat("processing"), `Target is ${target} days`, average === null ? "" : average <= target ? "up" : "down");
}

// ---------- side cards ----------

// Approved and paid claims: the money the company has agreed to pay back.
function renderSpend(claims) {
  const body = $("expense-spend");
  if (!body) return;
  const spent = expenseTotals(claims.filter((c) => c.status === "approved" || c.status === "paid")).byCategory;
  const top = Math.max(...CATEGORY_KEYS.map((k) => spent[k].amount));
  body.replaceChildren(...CATEGORY_KEYS.map((k) =>
    barRow(categoryLabel(k), rupees(spent[k].amount), top ? Math.round((spent[k].amount / top) * 100) : 0)));
}

// Built from the rules, so the card can't disagree with what the store does.
function renderPolicy() {
  const list = $("expense-policy");
  if (!list) return;
  const { adminAbove, receiptAbove, claimWithinDays, payWithinWorkingDays } = EXPENSE_POLICY;
  const stageText = (stage, i) => (i === 0 ? STAGE_NAME[stage].charAt(0).toUpperCase() + STAGE_NAME[stage].slice(1) : STAGE_NAME[stage]);
  const always = chainFor(adminAbove);
  const extra = chainFor(adminAbove + 1).filter((s) => !always.includes(s));
  const rows = [
    ["Every claim", always.map(stageText).join(", then ")],
    [`Above ${rupees(adminAbove)}`, `Then ${extra.map((s) => (s === "admin" ? "an Admin" : STAGE_NAME[s])).join(", then ")} too`],
    ["Receipt needed above", rupees(receiptAbove)],
    ["Claim within", `${claimWithinDays} days of spending`],
    ["Paid", `Within ${payWithinWorkingDays} working days (target)`],
  ];
  list.replaceChildren(...rows.map(([term, value]) => {
    const item = el("div", "kv__row");
    item.append(el("dt", "", term), el("dd", "", value));
    return item;
  }));
}

// The oldest pending claim above the Admin limit, if there is one.
function renderAlert(claims) {
  const alert = $("expense-alert");
  if (!alert) return;
  const big = tabClaims(claims, "pending").find((c) => c.amount > EXPENSE_POLICY.adminAbove);
  alert.hidden = !big;
  if (!big) return;
  const lead = `${nameOf(big.userId)}'s ${rupees(big.amount)} claim is above ${rupees(EXPENSE_POLICY.adminAbove)}.`;
  alert.textContent = big.stage === "admin"
    ? `${lead} It's waiting for an Admin, who gives the last approval.`
    : `${lead} It's at the ${STAGE_NAME[big.stage]} stage now; an Admin gives the last approval.`;
}

// ---------- pay approved claims ----------

const myPayable = () => (userId ? payableFor(userId) : []);

function renderPayButton(claims) {
  if (!payButton) return;
  const mine = myPayable();
  payButton.disabled = mine.length === 0;
  if (mine.length) payButton.title = `${claimsText(mine.length)}, ${rupees(mine.reduce((sum, c) => sum + c.amount, 0))}`;
  else if (!claims.some((c) => c.status === "approved")) payButton.title = "No approved claims are waiting to be paid";
  else if (!userId) payButton.title = "This session has no employee ID; sign out and back in to pay claims";
  else payButton.title = "Someone else has to pay the approved claims";
}

function payApproved() {
  const mine = myPayable();
  if (!mine.length) return;
  const total = mine.reduce((sum, c) => sum + c.amount, 0);
  if (!window.confirm(`Mark ${claimsText(mine.length)} as paid, ${rupees(total)} in total?\nThis records the payment; no money is sent from here.`)) return;
  const paid = mine.map((c) => payExpense(c.id, userId)).filter((r) => r.ok).length;
  // Fixed text and counts only: toast.js uses innerHTML.
  if (paid) showToast(`${claimsText(paid)} marked paid.`, "success");
  const unpaid = mine.length - paid;
  if (unpaid) showToast(`${claimsText(unpaid)} couldn't be marked paid. ${unpaid === 1 ? "It" : "They"} may have changed since the page was drawn, or browser storage may be full.`, "danger");
  render();
}

// ---------- start ----------

function render() {
  const claims = allExpenses();
  renderCounts(claims);
  renderTable(claims);
  renderStats(claims);
  renderSpend(claims);
  renderAlert(claims);
  renderPayButton(claims);
}

// can() matters because guard.js only redirects; this script would still run.
if (can("expenses:view") && tbody) {
  const select = $("expense-category");
  if (select) {
    const all = el("option", "", "All categories");
    all.value = "";
    select.replaceChildren(all, ...CATEGORY_KEYS.map((key) => {
      const option = el("option", "", categoryLabel(key));
      option.value = key;
      return option;
    }));
    select.addEventListener("change", () => {
      categoryFilter = select.value;
      currentPage = 1;
      renderTable(allExpenses());
    });
  }
  $("expense-search")?.addEventListener("input", (e) => {
    search = e.target.value;
    currentPage = 1;
    renderTable(allExpenses());
  });
  // ui/tabs.js already moves the is-active highlight between pills on click.
  pills.forEach((pill) => pill.addEventListener("click", () => {
    tab = pillTab(pill);
    currentPage = 1;
    renderTable(allExpenses());
  }));
  payButton?.addEventListener("click", payApproved);
  renderPolicy();
  render();
}