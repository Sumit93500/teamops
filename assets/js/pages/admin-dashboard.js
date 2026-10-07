// pages/admin-dashboard.js
// Runs on dashboard/admin.html (needs attendance:view-all, like team
// attendance). The attendance widgets and the headcount card, from the real
// stores: who is present today out of who is expected, the attendance rate for
// the last 14 days, today's attendance for every active employee with a name
// search, a department filter and Previous / Next, and headcount by
// department; the total employees stat (the sidebar's count); and, for roles
// with payroll:view, the payroll stat (the gross of the run payroll-run.html
// shows). Also from the real stores: the low-stock stat (with inventory:view),
// the pending approvals card and the activity feed, each described where it's
// drawn below. A session without an employee id (an old sign-in) leaves the
// static page as it is.

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { can } from "../core/rbac.js";
import { resolvePageLink } from "../core/paths.js";
import { getUser, getAllUsers, getAllDepartments, headcountByDepartment, activeHeadcount } from "../data/store.js";
import { runMonth, payrollRun, runTotals } from "../data/payroll-store.js";
import { addDays } from "../data/holidays.js";
import { ATTENDANCE_RULES, teamFor, summaryRange, toMinutes, nowMinutes, allRegularizations } from "../data/attendance-store.js";
import { allRequests } from "../data/leave-store.js";
import { allExpenses } from "../data/expenses-store.js";
import { allAssetRequests } from "../data/asset-requests-store.js";
import { reorderAlerts, allMovements, getItem } from "../data/inventory-store.js";
import {
  el, todayIso, formatRange, monthName, departmentName, fillDepartmentSelect, personCell, plural, nameOf, typeLabel,
  requestDates, formatDays, formatDay, initials, avatarClass, localDateOf,
} from "../ui/leave-view.js";
import { dayBadge, presentNote, checkInCell, hoursCell, correctionDetails } from "../ui/attendance-view.js";
import { STAGE_NAME as EXPENSE_STAGE, categoryLabel } from "../ui/expense-view.js";
import { STAGE_NAME as ASSET_STAGE, requestTitle as assetRequestTitle } from "../ui/asset-request-view.js";
import { assetTypeLabel, movementTypeLabel, officeDate } from "../ui/inventory-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";
import { chartColumns, barRow } from "../ui/chart.js";
import { rupees } from "../ui/money.js";
import { waitingFor } from "../ui/waiting.js";

const CHART_DAYS = 14;
const PAGE_SIZE = 10;

const user = getUser(getCurrentUserId());
const today = todayIso();

const subtitle = document.getElementById("dash-subtitle");
const stats = document.getElementById("dash-stats");
const rateRange = document.getElementById("rate-range");
const chart = document.getElementById("rate-chart");
const rateNote = document.getElementById("rate-note");
const approvalsCard = document.getElementById("admin-approvals");
const headcountMeta = document.getElementById("headcount-meta");
const headcountBars = document.getElementById("headcount-bars");
const activity = document.getElementById("admin-activity");
const activityMeta = document.getElementById("admin-activity-meta");
const searchInput = document.getElementById("admin-search");
const deptSelect = document.getElementById("admin-dept");
const tbody = document.getElementById("admin-rows");
const rowsMeta = document.getElementById("admin-rows-meta");

let search = "";
let dept = "";
let page = 1;

// ---------- helpers ----------

function setStat(key, value, note, tone = "") {
  const stat = stats.querySelector(`[data-stat="${key}"]`);
  if (!stat) return;
  setStatValue(stat, value);
  setStatNote(stat, note, tone);
}

// ---------- total employees and payroll ----------

// The same count as the sidebar: everyone not inactive.
function renderTotal() {
  const inactive = getAllUsers().length - activeHeadcount();
  setStat("total", String(activeHeadcount()), inactive ? `Not counting ${plural(inactive, "inactive employee", "inactive employees")}` : "No inactive employees");
}

// This month's run's gross, as the payroll run page and the Finance dashboard
// show it, labelled with the month.
function renderPayroll() {
  const { year, month } = runMonth(today);
  const run = payrollRun(year, month);
  const label = stats.querySelector('[data-stat="payroll"] .stat__label');
  if (label) label.textContent = `Payroll, ${monthName(month).slice(0, 3)}`;
  setStat("payroll", rupees(runTotals(run).gross), `Gross for ${plural(run.rows.length, "employee", "employees")}, draft`);
}

// ---------- low stock ----------

// The items at or below their reorder level, the list items.html's reorder
// card shows (reorderAlerts()). Inventory is Admin-only (inventory:view) and HR
// can open this page by URL, so it's drawn only with that permission; the HTML
// hides the stat too and holds "—", so a stats export without the permission
// carries no figure (a hidden stat exports as an empty row).
function renderStock() {
  const alerts = reorderAlerts();
  const out = alerts.filter((item) => item.status === "out").length;
  const low = alerts.length - out;
  const note = alerts.length
    ? [out ? `${out} out of stock` : "", low ? `${low} low` : ""].filter(Boolean).join(", ")
    : "Nothing below its reorder level";
  setStat("stock", String(alerts.length), note, alerts.length ? "down" : "");
}

// ---------- present today ----------

// Present (on time, late or a half day) out of who is expected, as on team-attendance.html.
function renderPresent(summary, days) {
  setStat("present", String(summary.present), presentNote(summary, days));
}

// ---------- attendance rate chart ----------

// Today is still filling in until the shift ends, so its bar is drawn faded and
// its title says "so far"; after the shift ends it's a normal bar.
function renderChart(range) {
  const from = range[0].date;
  const todayOpen = nowMinutes() < toMinutes(ATTENDANCE_RULES.shiftEnd);
  rateRange.textContent = formatRange(from, today);
  chart.replaceChildren(...chartColumns(range, (s) => {
    if (!s.expected) return { modifier: "chart__bar--muted", height: 0, what: s.off ? "day off" : "nobody expected" };
    const partial = s.date === today && todayOpen;
    const height = Math.round((s.present / s.expected) * 100);
    return {
      modifier: partial ? "chart__bar--progress" : "",
      height,
      what: `${height}%${partial ? " so far" : ""} (${s.present} of ${s.expected} expected)`,
    };
  }));
  const rates = range.filter((s) => s.expected && !(s.date === today && todayOpen)).map((s) => Math.round((s.present / s.expected) * 100));
  chart.setAttribute("aria-label", rates.length
    ? `Attendance rate, ${formatRange(from, today)}: between ${Math.min(...rates)} and ${Math.max(...rates)} percent on working days`
    : `Attendance rate, ${formatRange(from, today)}: no finished working days`);
  rateNote.textContent = todayOpen
    ? "Present out of expected. Weekends and holidays are shown lighter; today is faded until the shift ends."
    : "Present out of expected. Weekends and holidays are shown lighter.";
}

// ---------- pending approvals ----------

// What waits for the signed-in person's own decision: ui/waiting.js's
// waitingFor(), the rows the approvals inbox's Pending tab lists and the
// sidebar's Approvals count counts, so the three agree. Each person sees only
// what they could decide (HR opening this page sees its own). The newest few,
// each linking to the inbox, where it's decided; nothing is decided here.
const SHOWN_APPROVALS = 4;

const APPROVAL_TEXT = {
  leave: (r) => [`${nameOf(r.userId)}, ${typeLabel(r.type).toLowerCase()}`, `${requestDates(r)}, ${formatDays(r.days)}`],
  corrections: (r) => [`Regularization: ${nameOf(r.userId)}`, `${formatDay(r.date)}: ${correctionDetails(r)}`],
  expenses: (c) => [`Expense claim: ${nameOf(c.userId)}`, `${rupees(c.amount)}, ${categoryLabel(c.category)}, ${EXPENSE_STAGE[c.stage]} stage`],
  assets: (r) => [`Asset request: ${nameOf(r.userId)}`, `${assetRequestTitle(r)}, ${ASSET_STAGE[r.stage]} stage`],
};

function renderApprovals() {
  if (!approvalsCard) return;
  const waiting = Object.entries(waitingFor(user.id, getCurrentRole()?.key))
    .flatMap(([kind, list]) => list.map((request) => ({ kind, request })))
    .sort((a, b) => b.request.appliedOn.localeCompare(a.request.appliedOn) || b.request.id.localeCompare(a.request.id, "en", { numeric: true }));
  const shown = waiting.slice(0, SHOWN_APPROVALS);
  approvalsCard.querySelector(".card__meta").textContent = waiting.length ? `${shown.length} of ${waiting.length} shown` : "None";
  const list = approvalsCard.querySelector(".list");
  if (!shown.length) {
    list.replaceChildren(el("p", "card__body text-sm text-muted", "Nothing is waiting for you."));
    return;
  }
  list.replaceChildren(...shown.map(({ kind, request }) => {
    const [title, sub] = APPROVAL_TEXT[kind](request);
    const item = el("div", "list__item");
    item.dataset.requestId = request.id;
    const content = el("div", "list__content");
    content.append(el("span", "list__title", title), el("span", "list__sub", sub));
    const open = el("a", "btn btn--sm", "Review");
    open.href = resolvePageLink("requests/approvals-inbox.html");
    item.append(el("div", avatarClass(request.userId), initials(nameOf(request.userId))), content, open);
    return item;
  }));
}

// ---------- headcount ----------

function renderHeadcount() {
  const counts = headcountByDepartment();
  const departments = getAllDepartments();
  const total = departments.reduce((sum, d) => sum + (counts[d.code] ?? 0), 0);
  const top = Math.max(1, ...departments.map((d) => counts[d.code] ?? 0));
  headcountMeta.textContent = `${total} total`;
  headcountBars.replaceChildren(...departments.map((d) => {
    const count = counts[d.code] ?? 0;
    return barRow(d.name, String(count), Math.round((count / top) * 100));
  }));
}

// ---------- recent activity ----------

// What people did lately, from the records themselves: each step of the four
// approval chains (sent, approved, rejected, cancelled; paid, for expense
// claims; fulfilled or closed, for asset requests) and each stock movement.
// Every source is drawn only with the permission that shows it elsewhere, the
// way finance-dashboard.js draws its expense activity only with expenses:view:
//   leave requests           leave:approve       (leave-approvals.html, hr.html)
//   attendance corrections   attendance:approve  (regularization.html)
//   expense claims           expenses:view       (expenses.html, finance.html)
//   asset requests           assets:view         (asset-assignment.html)
//   stock movements          inventory:view      (stock-movements.html)
// So HR, who can open this page by URL, sees leave and corrections only, as on
// its own dashboard. Skipped stages and an Admin's own automatic approvals
// aren't events anyone did (finance-dashboard.js's rule). Sign-ins, access
// changes and backups aren't here: OfficeOS keeps no audit log yet.
const SHOWN_ACTIVITY = 5;

const STEP_DOT = { applied: "warning", approved: "success", rejected: "danger", cancelled: "primary", paid: "success", fulfilled: "success", closed: "primary" };
const MOVEMENT_DOT = { in: "success", return: "success", out: "primary", adjustment: "warning" };

// A chain's steps: "sent" reads as the request itself, every other step as
// "<what> <step> by <who>". Dated in the browser's own time zone, as the
// Finance and HR dashboards date theirs.
const chainEvents = (records, sent, what) => records.flatMap((r) => r.history
  .filter((h) => STEP_DOT[h.decision])
  .map((h) => ({ at: h.at, date: localDateOf(h.at), dot: STEP_DOT[h.decision], text: h.decision === "applied" ? sent(r) : `${what(r)} ${h.decision} by ${nameOf(h.byUserId)}` })));

const leaveWhat = (r) => `${typeLabel(r.type).toLowerCase()} for ${requestDates(r)}`;
const assetWhat = (r) => assetTypeLabel(r.assetType).toLowerCase();

// "Stock in: +12 Coffee beans, 1 kg, by Aarav Mehta". Dated in office time, as
// stock-movements.html shows it.
function movementEvent(m) {
  const change = m.change > 0 ? `+${m.change}` : String(m.change);
  const tag = m.assetTag ? ` (${m.assetTag})` : "";
  return { at: m.at, date: officeDate(m.at), dot: MOVEMENT_DOT[m.type] ?? "primary", text: `${movementTypeLabel(m.type)}: ${change} ${getItem(m.sku)?.name ?? m.sku}${tag}, by ${nameOf(m.recordedBy)}` };
}

const ACTIVITY_SOURCES = [
  { permission: "leave:approve", name: "leave",
    events: () => chainEvents(allRequests(), (r) => `Leave request from ${nameOf(r.userId)}: ${leaveWhat(r)}`, (r) => `${nameOf(r.userId)}'s ${leaveWhat(r)}`) },
  { permission: "attendance:approve", name: "corrections",
    events: () => chainEvents(allRegularizations(), (r) => `Regularization request from ${nameOf(r.userId)} for ${formatDay(r.date)}`, (r) => `${nameOf(r.userId)}'s regularization for ${formatDay(r.date)}`) },
  { permission: "expenses:view", name: "expenses",
    events: () => chainEvents(allExpenses(), (c) => `Expense claim from ${nameOf(c.userId)}, ${rupees(c.amount)}`, (c) => `${rupees(c.amount)} claim from ${nameOf(c.userId)}`) },
  { permission: "assets:view", name: "asset requests",
    events: () => chainEvents(allAssetRequests(), (r) => `Asset request from ${nameOf(r.userId)}: ${assetWhat(r)}`, (r) => `${nameOf(r.userId)}'s ${assetWhat(r)} request`) },
  { permission: "inventory:view", name: "stock",
    events: () => allMovements().map(movementEvent) },
];

// "Leave, corrections and stock"
const listText = (names) => {
  const text = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names.join("");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

function renderActivity() {
  if (!activity) return;
  const sources = ACTIVITY_SOURCES.filter((source) => can(source.permission));
  if (activityMeta) activityMeta.textContent = listText(sources.map((source) => source.name));
  const events = sources.flatMap((source) => source.events())
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, SHOWN_ACTIVITY);
  if (!events.length) {
    activity.replaceChildren(el("p", "card__body text-sm text-muted", sources.length ? "No activity yet." : "Nothing here you have access to."));
    return;
  }
  activity.replaceChildren(...events.map((event) => {
    const item = el("div", "activity__item");
    const text = el("div", "activity__text", event.text);
    text.append(el("span", "activity__time", formatDay(event.date)));
    item.append(el("span", `activity__dot activity__dot--${event.dot}`), text);
    return item;
  }));
}

// ---------- today's attendance ----------

function row({ person, day }) {
  const tr = el("tr");
  const status = el("td");
  status.append(dayBadge(day));
  tr.append(personCell(day.userId, person, person?.email ?? ""), el("td", "", day.userId), el("td", "", departmentName(person?.department)), status, checkInCell(day), hoursCell(day));
  return tr;
}

// Previous / Next in the card footer. The static Next is a placeholder button,
// so it's swapped for a clean copy that has only this page's listener.
function pagerButtons() {
  const [prev, next] = ["admin-prev", "admin-next"].map((id) => {
    const old = document.getElementById(id);
    if (!old) return null;
    const fresh = old.cloneNode(true);
    fresh.removeAttribute("data-not-implemented");
    old.replaceWith(fresh);
    return fresh;
  });
  prev?.addEventListener("click", () => { page -= 1; renderTable(); });
  next?.addEventListener("click", () => { page += 1; renderTable(); });
  return { prev, next };
}
let pager = { prev: null, next: null };

function renderTable() {
  const people = new Map(getAllUsers().map((u) => [u.id, u]));
  const all = teamFor(today).map((day) => ({ day, person: people.get(day.userId) }));
  const query = search.trim().toLowerCase();
  const rows = all.filter((r) => (!dept || r.person?.department === dept) && (!query || (r.person?.name ?? "").toLowerCase().includes(query)));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  page = Math.min(Math.max(1, page), pages);
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (shown.length) {
    tbody.replaceChildren(...shown.map(row));
  } else {
    const td = el("td", "text-muted", all.length ? "No employees match these filters." : "No active employees.");
    td.colSpan = 6;
    const tr = el("tr");
    tr.append(td);
    tbody.replaceChildren(tr);
  }
  const range = shown.length ? `${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + shown.length}` : "0";
  rowsMeta.textContent = `Showing ${range} of ${rows.length} ${rows.length === 1 ? "employee" : "employees"}${rows.length < all.length ? ` (${all.length} active)` : ""}`;
  if (pager.prev) pager.prev.disabled = page <= 1;
  if (pager.next) pager.next.disabled = page >= pages;
  return all;
}

// ---------- start ----------

// can() matters because guard.js only redirects; this script would still run.
if (user && can("attendance:view-all") && stats && chart && headcountBars && tbody) {
  subtitle.textContent = `Company overview for ${monthName(Number(today.slice(5, 7)))} ${today.slice(0, 4)}`;
  if (deptSelect) {
    fillDepartmentSelect(deptSelect);
    deptSelect.addEventListener("change", () => { dept = deptSelect.value; page = 1; renderTable(); });
  }
  searchInput?.addEventListener("input", () => { search = searchInput.value; page = 1; renderTable(); });
  pager = pagerButtons();

  const days = renderTable().map((r) => r.day);
  const range = summaryRange(addDays(today, -(CHART_DAYS - 1)), today);   // one storage read; today is the last day
  renderPresent(range[range.length - 1], days);
  renderChart(range);
  renderApprovals();
  renderHeadcount();
  renderActivity();
  renderTotal();
  // HR may open this page too; it holds no payroll permission.
  if (can("payroll:view")) renderPayroll();
  // Nor any inventory permission: it sees no stock figures here either.
  if (can("inventory:view")) renderStock();
}