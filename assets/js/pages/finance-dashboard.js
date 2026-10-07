// pages/finance-dashboard.js
// Runs on dashboard/finance.html. The payroll parts of the page, from
// data/payroll-store.js: the payroll, TDS and net pay stats, gross pay by
// department, and every employee in the run. It is the same run that
// payroll-run.html shows (this month's, runMonth()), so the two pages agree,
// and the month's name in the labels comes from it. TDS is worked out on
// data/payroll.js's sample tax rates and its deposit date is the sample filing
// rule for that month, so its note says so, as tax-deductions.html's "Sample
// rules" does. Nothing here works out pay; the store does.
//
// The page is open to anyone with dashboard:view, and these are everyone's
// salaries, so nothing is drawn without payroll:view (the HTML also hides
// those parts).
//
// Expenses, from data/expenses-store.js, the same way:
//   - "Reimbursements due" (approved claims waiting to be paid, the figure
//     expenses.html calls Approved) and the recent expense activity: every
//     claim, so drawn only with expenses:view (the HTML hides both without it,
//     and a stats export then says "—").
//   - Pending expense approvals: only the claims waiting for the signed-in
//     person's own decision (pendingFor(), the approvals inbox's rule), each
//     linking to the inbox, where it's decided. Nobody sees a claim they
//     couldn't decide. Expense claims only, as its title says: the inbox and
//     the sidebar's count also hold leave, corrections and asset requests.

import { runMonth, payrollRun, runTotals, payslipTotals } from "../data/payroll-store.js";
import { filingDates } from "../data/payroll.js";
import { getUser, getAllDepartments } from "../data/store.js";
import { allExpenses, pendingFor, expenseTotals } from "../data/expenses-store.js";
import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { can } from "../core/rbac.js";
import { resolvePageLink } from "../core/paths.js";
import { STAGE_NAME, categoryLabel } from "../ui/expense-view.js";
import { el, plural, departmentName, personCell, nameOf, initials, avatarClass, formatDay, localDateOf, todayIso, monthShort } from "../ui/leave-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";
import { barRow } from "../ui/chart.js";
import { rupees } from "../ui/money.js";

const ROW_STATUS = {
  "draft":   { label: "Draft",   badge: "badge badge--warning badge--dot" },
  "on-hold": { label: "On hold", badge: "badge badge--danger badge--dot" },
};

const $ = (id) => document.getElementById(id);
const stat = (key) => document.querySelector(`[data-stat="${key}"]`);
const people = (n) => plural(n, "employee", "employees");

// ---------- stats ----------

// "Oct" and "Oct 2026" for the run's month.
const short = (run) => monthShort(`${run.month}-01`);
const shortWithYear = (run) => `${short(run)} ${run.month.slice(0, 4)}`;

function renderStats(run, year, month) {
  const totals = runTotals(run);
  stat("payroll").querySelector(".stat__label").textContent = `Payroll, ${short(run)}`;
  setStatValue(stat("payroll"), rupees(totals.gross));
  setStatNote(stat("payroll"), `Gross for ${people(run.rows.length)}, draft`);
  setStatValue(stat("tds"), rupees(payslipTotals(run.rows).tds));
  setStatNote(stat("tds"), `Sample tax rates; deposit by ${formatDay(filingDates(year, month).tds)}`);
  stat("net").querySelector(".stat__label").textContent = `Net pay, ${short(run)}`;
  setStatValue(stat("net"), rupees(totals.net));
  setStatNote(stat("net"), "Draft, not paid yet");
}

// ---------- gross pay by department ----------

// Every department in the store, in its order, with the gross of the people in
// it (0 for an empty one); bars are relative to the largest. Someone whose
// department isn't in the list still counts, under their own row.
function renderDepartments(run) {
  const gross = new Map(getAllDepartments().map((d) => [d.code, { name: d.name, amount: 0 }]));
  for (const row of run.rows) {
    const code = getUser(row.userId)?.department ?? "";
    if (!gross.has(code)) gross.set(code, { name: departmentName(code) || "No department", amount: 0 });
    gross.get(code).amount += row.gross;
  }
  const top = Math.max(1, ...[...gross.values()].map((g) => g.amount));
  $("fin-dept-meta").textContent = `Gross pay, ${shortWithYear(run)}`;
  $("fin-dept-bars").replaceChildren(...[...gross.values()].map((g) => barRow(g.name, rupees(g.amount), Math.round((g.amount / top) * 100))));
}

// ---------- the run's employees ----------

function buildRow(row) {
  const user = getUser(row.userId);
  const tr = el("tr");
  tr.dataset.userId = row.userId;
  const statusCell = el("td");
  const badge = el("span", ROW_STATUS[row.status]?.badge ?? "badge", ROW_STATUS[row.status]?.label ?? row.status);
  if (row.holdReason) badge.title = row.holdReason;
  statusCell.append(badge);
  tr.append(
    personCell(row.userId, user, departmentName(user?.department)),
    el("td", "table__num", rupees(row.gross)),
    el("td", "table__num", rupees(row.deductions)),
    el("td", "table__num", rupees(row.net)),
    statusCell,
  );
  return tr;
}

function renderRows(run) {
  $("fin-run-title").textContent = `Payroll run, ${shortWithYear(run)}`;
  $("fin-run-rows").replaceChildren(...run.rows.map(buildRow));
  $("fin-run-meta").textContent = `All ${people(run.rows.length)} in the run`;
}

// ---------- expenses ----------

const claimsText = (n) => plural(n, "claim", "claims");
const claimText = (claim) => `${rupees(claim.amount)} claim from ${nameOf(claim.userId)}`;

function renderReimbursements() {
  const { approved } = expenseTotals(allExpenses()).byStatus;
  setStatValue(stat("reimbursements"), rupees(approved.amount));
  setStatNote(stat("reimbursements"), approved.count ? `${claimsText(approved.count)} waiting to be paid` : "Nothing waiting to be paid", approved.count ? "up" : "");
}

// Oldest first, as the inbox lists them.
function renderPendingApprovals(card) {
  const user = getUser(getCurrentUserId());
  const claims = (user ? pendingFor(user.id, getCurrentRole()?.key) : [])
    .sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id, "en", { numeric: true }));
  card.querySelector(".card__meta").textContent = `${claims.length} open`;
  const list = card.querySelector(".list");
  if (!claims.length) {
    list.replaceChildren(el("p", "card__body text-sm text-muted", "No expense claims are waiting for you."));
    return;
  }
  list.replaceChildren(...claims.map((claim) => {
    const item = el("div", "list__item");
    item.dataset.claimId = claim.id;
    const content = el("div", "list__content");
    content.append(
      el("span", "list__title", `Expense claim: ${nameOf(claim.userId)}`),
      el("span", "list__sub", `${rupees(claim.amount)}, ${categoryLabel(claim.category)}, ${STAGE_NAME[claim.stage]} stage`),
    );
    const open = el("a", "btn btn--sm", "Review");
    open.href = resolvePageLink("requests/approvals-inbox.html");
    item.append(el("div", avatarClass(claim.userId), initials(nameOf(claim.userId))), content, open);
    return item;
  }));
}

// What happened to claims lately: sent, approved, rejected, paid, cancelled
// (each read as the Admin dashboard's activity feed reads it). Skipped stages
// and an Admin's own automatic approvals aren't events anyone did.
const EVENT = {
  applied:  { dot: "warning", text: (c) => `Expense claim from ${nameOf(c.userId)}, ${rupees(c.amount)}` },
  approved: { dot: "success", text: (c, h) => `${claimText(c)} approved by ${nameOf(h.byUserId)}` },
  rejected: { dot: "danger",  text: (c, h) => `${claimText(c)} rejected by ${nameOf(h.byUserId)}` },
  paid:     { dot: "success", text: (c, h) => `${claimText(c)} paid by ${nameOf(h.byUserId)}` },
  cancelled: { dot: "primary", text: (c, h) => `${claimText(c)} cancelled by ${nameOf(h.byUserId)}` },
};
const ACTIVITY_SHOWN = 5;

function renderActivity(list) {
  const events = allExpenses()
    .flatMap((claim) => claim.history.filter((h) => EVENT[h.decision]).map((h) => ({ claim, h })))
    .sort((a, b) => b.h.at.localeCompare(a.h.at))
    .slice(0, ACTIVITY_SHOWN);
  if (!events.length) {
    list.replaceChildren(el("p", "card__body text-sm text-muted", "No expense activity yet."));
    return;
  }
  list.replaceChildren(...events.map(({ claim, h }) => {
    const item = el("div", "activity__item");
    const text = el("div", "activity__text", EVENT[h.decision].text(claim, h));
    text.append(el("span", "activity__time", formatDay(localDateOf(h.at))));
    item.append(el("span", `activity__dot activity__dot--${EVENT[h.decision].dot}`), text);
    return item;
  }));
}

// ---------- start ----------

if (can("payroll:view")) {
  const { year, month } = runMonth(todayIso());
  const run = payrollRun(year, month);
  renderStats(run, year, month);
  renderDepartments(run);
  renderRows(run);
}

if (can("expenses:view")) {
  renderReimbursements();
  const activity = $("fin-activity");
  if (activity) renderActivity(activity);
}

const approvalsCard = $("fin-approvals");
if (approvalsCard) renderPendingApprovals(approvalsCard);