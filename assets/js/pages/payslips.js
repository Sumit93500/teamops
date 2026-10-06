// pages/payslips.js
// Runs on payslips.html ("My payslips"). The signed-in person's own payslips
// from data/payroll-store.js, newest first, for the chosen financial year
// (April to March), with the year's totals and the stat cards. Nothing here
// works out pay; the store does. Anyone else's payslip is opened from the
// payroll run, not from here.
//
// How far back: payslipsFor() starts at this month and goes back to the first
// month with attendance records, or the month the person joined; before that,
// loss of pay can't be checked, so there's no payslip. When the list stops at
// the joining month, the history says so rather than just ending. No payroll run is stored or approved yet, so every
// payslip is a Draft (or On hold) and none has a pay date.

import { payslipsFor, payslipTotals } from "../data/payroll-store.js";
import { getUser, joiningDate } from "../data/store.js";
import { isSignedIn, getCurrentUserId } from "../core/auth.js";
import { applyPermissions } from "../core/rbac.js";
import { el, todayIso, monthName, monthShort, formatRange, formatDay, plural } from "../ui/leave-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";
import { initPlaceholders } from "../ui/placeholder.js";
import { rupees } from "../ui/money.js";

const STATUS = {
  "draft":   { label: "Draft",   badge: "badge badge--warning badge--dot" },
  "on-hold": { label: "On hold", badge: "badge badge--danger badge--dot" },
};
const NO_SALARY = "No salary on file for this month";

const $ = (id) => document.getElementById(id);
const stat = (key) => document.querySelector(`[data-stat="${key}"]`);
const field = (name) => document.querySelector(`[data-field="${name}"]`);

const yearOf = (slip) => Number(slip.month.slice(0, 4));
const monthOf = (slip) => Number(slip.month.slice(5, 7));
const label = (slip) => `${monthName(monthOf(slip))} ${yearOf(slip)}`;

// The financial year (April to March) a payslip belongs to, by its first year: 2026 = 2026-27.
const financialYear = (slip) => (monthOf(slip) >= 4 ? yearOf(slip) : yearOf(slip) - 1);
const yearLabel = (fy) => `${fy} – ${String(fy + 1).slice(2)}`;

const short = (slip) => monthShort(slip.period.from);

// "Sep" or "Sep to Oct", over payslips listed newest first.
const span = (slips) => (slips.length === 1 ? short(slips[0]) : `${short(slips.at(-1))} to ${short(slips[0])}`);

// "Sep 2026", "Sep – Oct 2026" or "Dec 2026 – Jan 2027".
function spanWithYear(slips) {
  const [a, b] = [slips.at(-1), slips[0]];
  if (slips.length === 1) return `${short(a)} ${yearOf(a)}`;
  return yearOf(a) === yearOf(b) ? `${short(a)} – ${short(b)} ${yearOf(b)}` : `${short(a)} ${yearOf(a)} – ${short(b)} ${yearOf(b)}`;
}

// A no-salary payslip has nothing worked out, so its amounts show as a dash, not ₹0.
const amount = (slip, n) => (slip.holdReason === NO_SALARY ? "—" : rupees(n));

const statusNote = (slip) => (slip.status === "on-hold" ? `On hold: ${slip.holdReason}` : "Draft, not paid yet");

// ---------- stat cards ----------

// Net pay for the newest month before this one; this month's if there's none.
function renderLatest(slips, thisMonth) {
  const card = stat("latest");
  const slip = slips.find((s) => s.month < thisMonth) ?? slips[0];
  if (!slip) {
    card.querySelector(".stat__label").textContent = "Net pay";
    setStatValue(card, "—");
    setStatNote(card, "No payslips yet");
    return;
  }
  card.querySelector(".stat__label").textContent = `Net pay, ${monthName(monthOf(slip))}`;
  setStatValue(card, amount(slip, slip.net));
  setStatNote(card, statusNote(slip));
}

// The payslip for the month in progress. There's no pay date to show: no run
// is stored or approved, and there's no payroll calendar.
function renderNext(slips, thisMonth) {
  const card = stat("next");
  const slip = slips.find((s) => s.month === thisMonth);
  setStatValue(card, slip ? `${short(slip)} ${yearOf(slip)}` : "—");
  setStatNote(card, slip ? `${statusNote(slip)}; no pay date set` : "No payslip yet");
}

function renderYearStats(slips, totals) {
  setStatValue(stat("ytd-net"), rupees(totals.net));
  setStatNote(stat("ytd-net"), slips.length ? `${span(slips)}, ${plural(slips.length, "payslip", "payslips")}` : "No payslips");
  setStatValue(stat("ytd-tds"), rupees(totals.tds));
  setStatNote(stat("ytd-tds"), slips.length ? `TDS, ${span(slips)}` : "TDS, no payslips");
}

// ---------- history and year to date ----------

function buildRow(slip) {
  const tr = el("tr");
  tr.dataset.month = slip.month;
  const month = el("td");
  month.append(el("span", "table__user-name", label(slip)));

  const statusCell = el("td");
  const badge = el("span", STATUS[slip.status]?.badge ?? "badge", STATUS[slip.status]?.label ?? slip.status);
  if (slip.holdReason) badge.title = slip.holdReason;
  statusCell.append(badge);

  const actions = el("td", "table__actions");
  const group = el("div", "btn-group");
  const view = el("a", "btn btn--sm", "View");
  view.href = `payslip-view.html?employee=${encodeURIComponent(slip.userId)}&month=${slip.month}`;
  const download = el("button", "btn btn--sm", "Download");
  download.type = "button";
  download.dataset.permission = "payslip:download";
  download.dataset.notImplemented = "Download";
  group.append(view, download);
  actions.append(group);

  tr.append(month, el("td", "", formatRange(slip.period.from, slip.period.to)),
    el("td", "table__num", amount(slip, slip.gross)), el("td", "table__num", amount(slip, slip.deductions)),
    el("td", "table__num", amount(slip, slip.net)), statusCell, actions);
  return tr;
}

function messageRow(text) {
  const tr = el("tr");
  const td = el("td", "text-muted", text);
  td.colSpan = 7;
  tr.append(td);
  return tr;
}

// The line that ends the history when payslips start because the person joined
// then (or haven't joined yet), else null.
function joinedNote(all, slips, joined, today) {
  if (!joined) return null;
  if (!all.length && joined > today) return `No payslips yet: you join on ${formatDay(joined, true)}.`;
  const first = all.at(-1);
  if (first && slips.includes(first) && joined.slice(0, 7) === first.month) {
    return `No payslips before ${label(first)}: you joined on ${formatDay(joined, true)}.`;
  }
  return null;
}

function renderHistory(slips, fy, note) {
  const tbody = $("payslip-rows");
  const rows = slips.length ? slips.map(buildRow) : [messageRow("No payslips for this financial year.")];
  if (note) rows.push(messageRow(note));
  tbody.replaceChildren(...rows);
  applyPermissions(tbody);
  initPlaceholders(tbody);
  $("payslip-history-meta").textContent = `Financial year ${yearLabel(fy)}`;
}

function renderYearToDate(slips, totals) {
  for (const key of ["gross", "pf", "pt", "tds", "deductions", "net"]) field(key).textContent = rupees(totals[key]);
  $("payslip-ytd-meta").textContent = slips.length ? spanWithYear(slips) : "No payslips";
}

// ---------- start ----------

function renderYear(all, fy, joined, today) {
  const slips = all.filter((s) => financialYear(s) === fy);
  const totals = payslipTotals(slips);
  renderYearStats(slips, totals);
  renderHistory(slips, fy, joinedNote(all, slips, joined, today));
  renderYearToDate(slips, totals);
}

// An old session with no employee id: nothing to look up.
function renderNoId() {
  for (const key of ["latest", "ytd-net", "ytd-tds", "next"]) {
    setStatValue(stat(key), "—");
    setStatNote(stat(key), "");
  }
  stat("latest").querySelector(".stat__label").textContent = "Net pay";
  $("payslip-rows").replaceChildren(messageRow("This session has no employee ID. Sign out and back in to see your payslips."));
  $("payslip-history-meta").textContent = "";
  for (const key of ["gross", "pf", "pt", "tds", "deductions", "net"]) field(key).textContent = "—";
  $("payslip-ytd-meta").textContent = "";
  $("payslip-year").disabled = true;
}

function start() {
  const me = getCurrentUserId();
  if (!me) {
    renderNoId();
    return;
  }
  const today = todayIso();
  const thisMonth = today.slice(0, 7);
  const all = payslipsFor(me, today);
  renderLatest(all, thisMonth);
  renderNext(all, thisMonth);

  // The years that have payslips, newest first; this year's if there are none.
  const years = [...new Set(all.map(financialYear))];
  if (!years.length) years.push(Number(thisMonth.slice(5, 7)) >= 4 ? Number(today.slice(0, 4)) : Number(today.slice(0, 4)) - 1);
  const select = $("payslip-year");
  select.replaceChildren(...years.map((fy) => Object.assign(el("option", "", `Financial year ${yearLabel(fy)}`), { value: String(fy) })));
  const joined = joiningDate(getUser(me)?.dateOfJoining);
  select.addEventListener("change", () => renderYear(all, Number(select.value), joined, today));
  renderYear(all, years[0], joined, today);
}

// The guard sends anyone not signed in to the login page; this stops anything
// being drawn in the moment before that happens.
if (isSignedIn()) start();