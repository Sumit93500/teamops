// pages/payslip-view.js
// Runs on payslip-view.html. Shows one person's payslip for one month,
// ?employee=EMP-xxxx&month=YYYY-MM, from data/payroll-store.js. Nothing here
// works out pay; the store does.
//
// Whose payslip: your own, always; anyone else's only with payslips:view
// (Finance and Admin). Asking for someone else's without it sends you to the
// 403 page, the same answer whether or not that person exists, and nothing is
// drawn. Without ?employee it's your own; without ?month it's the newest one.
// A month with no payslip (before attendance records began, not started yet,
// or a link that doesn't name a month) shows a message instead of figures.
//
// No payroll run is stored or approved yet (see payroll-run.js), so a payslip
// is never "Paid" and has no pay date: it's a Draft, or On hold with the
// store's reason.

import { payslipsFor } from "../data/payroll-store.js";
import { getUser } from "../data/store.js";
import { can } from "../core/rbac.js";
import { isSignedIn, getCurrentUserId } from "../core/auth.js";
import { resolvePageLink } from "../core/paths.js";
import { el, todayIso, monthName, formatRange, departmentName, plural, formatDays } from "../ui/leave-view.js";
import { rupees, rupeesInWords } from "../ui/money.js";
import { maskAccount, maskPan } from "../ui/pii.js";

const STATUS = {
  "draft":   { label: "Draft",   badge: "badge badge--warning badge--dot" },
  "on-hold": { label: "On hold", badge: "badge badge--danger badge--dot" },
};
const NO_SALARY = "No salary on file for this month";
const REGIME = { new: "New regime" };

const $ = (id) => document.getElementById(id);
const field = (name) => document.querySelector(`[data-field="${name}"]`);
const orDash = (value) => (value ? String(value) : "—");

// "2026-09" -> "September 2026"
const monthLabel = (month) => `${monthName(Number(month.slice(5, 7)))} ${month.slice(0, 4)}`;

// "Draft: not approved or paid yet" / "On hold: No bank account on file"
const statusLine = (slip) => (slip.status === "on-hold" ? `On hold: ${slip.holdReason}` : "Draft: not approved or paid yet");

// ---------- which payslip ----------

const params = new URLSearchParams(window.location.search);
const asked = { employee: (params.get("employee") ?? "").trim(), month: (params.get("month") ?? "").trim() };

// "own", "other" (allowed by payslips:view), "forbidden", or "no-id" (an old
// session with no employee id asking for its own payslip).
function scopeOf(me, employee) {
  if (!employee || employee === me) return me ? "own" : "no-id";
  return can("payslips:view") ? "other" : "forbidden";
}

// Why the asked-for month has no payslip, given the ones that exist (newest first).
function missingMonthText(month, slips) {
  if (month > slips[0].month) return `${monthLabel(month)} hasn't started yet. The newest payslip is for ${monthLabel(slips[0].month)}.`;
  return `Payslips start in ${monthLabel(slips.at(-1).month)}, the first month with attendance records. Before that, loss of pay can't be checked.`;
}

// ---------- drawing ----------

function setText(node, text) {
  if (node) node.textContent = text;
}

// Instead of a payslip: a title and a line saying why there isn't one. With
// no payslip there's nothing to download or print.
function showMessage(title, text) {
  document.title = "Payslip | OfficeOS";
  setText($("payslip-title"), "Payslip");
  setText($("payslip-crumb"), "Payslip");
  setText($("payslip-subtitle"), "");
  $("payslip").hidden = true;
  $("payslip-download").hidden = true;
  $("payslip-print").hidden = true;
  setText($("payslip-message-title"), title);
  setText($("payslip-message-text"), text);
  $("payslip-message").hidden = false;
}

// Someone else's payslip: the way back is the payroll run they came from.
function linkBack(own) {
  if (own || !can("payroll:view")) return;
  const crumb = $("payslip-crumb-parent");
  crumb.href = "payroll-run.html";
  crumb.textContent = "Payroll run";
  const back = $("payslip-back");
  back.href = "payroll-run.html";
  back.textContent = "Back to payroll run";
}

function renderHeader(user, slip, own) {
  const label = monthLabel(slip.month);
  const whose = own ? "" : `, ${user.name}`;
  document.title = `Payslip, ${label}${whose} | OfficeOS`;
  setText($("payslip-crumb"), own ? label : `${user.name}, ${label}`);
  setText($("payslip-title"), `Payslip, ${label}`);
  setText($("payslip-subtitle"), own ? statusLine(slip) : `${user.name} (${user.id}). ${statusLine(slip)}`);
  $("payslip").setAttribute("aria-label", `Payslip for ${label}${whose}`);
  setText($("payslip-month"), label);
  setText($("payslip-period"), `Pay period ${formatRange(slip.period.from, slip.period.to)} ${slip.month.slice(0, 4)}`);
}

// A <dd> that holds a masked value, or a muted "Not on file".
function setSensitive(name, masked) {
  const dd = field(name);
  dd.textContent = masked || "Not on file";
  dd.classList.toggle("masked", Boolean(masked));
  dd.classList.toggle("text-muted", !masked);
}

function renderInfo(user, slip) {
  setText(field("name"), user.name);
  setText(field("id"), user.id);
  setText(field("designation"), orDash(user.designation));
  setText(field("department"), orDash(departmentName(user.department)));
  setText(field("joined"), orDash(user.dateOfJoining));
  const payDate = field("pay-date");
  payDate.textContent = "Not set";
  payDate.className = "text-muted";
  setSensitive("bank", maskAccount(user.bankAccountLast4));
  setSensitive("pan", maskPan(user.pan));
  setText(field("regime"), REGIME[slip.regime] ?? orDash(slip.regime));
  setText(field("working-days"), String(slip.workingDays));
  setText(field("days-paid"), String(slip.workingDays - slip.lop.days));
  setText(field("lop-days"), String(slip.lop.days));
}

function renderAmounts(slip) {
  const noSalary = slip.holdReason === NO_SALARY;
  $("payslip-cols").hidden = noSalary;
  $("payslip-words").hidden = noSalary;
  for (const key of ["basic", "hra", "conveyance", "special"]) setText(field(key), rupees(slip.earnings[key]));
  setText(field("gross"), rupees(slip.gross));
  for (const key of ["pf", "pt", "tds"]) setText(field(key), rupees(slip.deductionLines[key]));
  setText(field("deductions"), rupees(slip.deductions));
  setText(field("net"), noSalary ? "—" : rupees(slip.net));
  setText($("payslip-words"), `Amount in words: ${rupeesInWords(slip.net)}`);
  const status = STATUS[slip.status];
  const badge = $("payslip-status");
  badge.className = status?.badge ?? "badge";
  badge.textContent = status?.label ?? slip.status;
  badge.title = slip.holdReason ?? "";
}

// The lines under the figures: why it's on hold, the loss of pay worked out,
// and how much of the month attendance covers.
function renderNotes(slip) {
  const label = monthLabel(slip.month);
  const notes = [];
  if (slip.holdReason === NO_SALARY) {
    notes.push(`On hold: ${slip.holdReason}. Nothing can be worked out or paid for ${label} until a salary is added.`);
  } else if (slip.status === "on-hold") {
    notes.push(`On hold: ${slip.holdReason}. The pay above is worked out, but it can't be paid until a bank account is added.`);
  }
  if (slip.lop.days > 0) {
    const why = [
      slip.lop.penaltyHalfDays ? plural(slip.lop.penaltyHalfDays, "late-mark half day", "late-mark half days") : "",
      slip.lop.unpaidLeaveDays ? `${formatDays(slip.lop.unpaidLeaveDays)} of unpaid leave` : "",
    ].filter(Boolean).join(" and ");
    notes.push(`Loss of pay: ${rupees(slip.lop.amount)} for ${formatDays(slip.lop.days)} (${why}), out of ${slip.workingDays} working days, `
      + `taken off the monthly salary of ${rupees(slip.monthlyGross)}. The earnings above are on the ${rupees(slip.gross)} left.`);
  }
  if (slip.attendance.noData > 0) {
    notes.push(`${plural(slip.attendance.noData, "working day", "working days")} of ${label} came before attendance records began; `
      + "they're paid in full, without a loss-of-pay check.");
  }
  if (slip.attendance.notYet > 0) {
    notes.push(`${label} isn't over: ${plural(slip.attendance.notYet, "working day hasn't", "working days haven't")} been recorded yet, `
      + "so late marks and unpaid leave can still change this payslip.");
  }
  $("payslip-notes").replaceChildren(...notes.map((text) => el("p", "payslip__words", text)));
  $("payslip-notes").hidden = notes.length === 0;
}

// ---------- start ----------

function start() {
  const me = getCurrentUserId();
  const scope = scopeOf(me, asked.employee);
  if (scope === "forbidden") {
    $("payslip").hidden = true;   // already hidden in the HTML; kept hidden while the 403 page loads
    window.location.href = resolvePageLink("errors/403.html");
    return;
  }
  if (scope === "no-id") {
    showMessage("Your payslip can't be shown", "This session has no employee ID. Sign out and back in to see your payslips.");
    return;
  }
  const own = scope === "own";
  linkBack(own);
  const userId = asked.employee || me;
  const user = getUser(userId);
  if (!user) {
    showMessage("No such employee", `There's no employee with the ID ${userId}.`);
    return;
  }
  const slips = payslipsFor(user.id, todayIso());
  if (!slips.length) {
    showMessage(`No payslips for ${user.name}`, user.status === "inactive"
      ? `${user.name} is inactive and isn't in payroll.`
      : "There's no month with attendance records yet, so no payslip can be worked out.");
    return;
  }
  let slip = slips[0];
  if (asked.month) {
    const match = /^(\d{4})-(\d{2})$/.exec(asked.month);
    if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
      showMessage("That isn't a month", `The link asks for "${asked.month}". A month looks like 2026-09.`);
      return;
    }
    slip = slips.find((s) => s.month === asked.month);
    if (!slip) {
      showMessage(`No payslip for ${monthLabel(asked.month)}`, missingMonthText(asked.month, slips));
      return;
    }
  }
  renderHeader(user, slip, own);
  renderInfo(user, slip);
  renderAmounts(slip);
  renderNotes(slip);
  // The payslip and Print start hidden in the HTML, so nothing shows until a
  // payslip this person may see has been drawn.
  $("payslip").hidden = false;
  $("payslip-print").hidden = false;
}

// The guard sends anyone not signed in to the login page; this stops anything
// being drawn in the moment before that happens.
if (isSignedIn()) start();