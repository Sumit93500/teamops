// pages/admin-dashboard.js
// Runs on dashboard/admin.html (needs attendance:view-all, like team
// attendance). The attendance widgets and the headcount card, from the real
// stores: who is present today out of who is expected, the attendance rate for
// the last 14 days, today's attendance for every active employee with a name
// search, a department filter and Previous / Next, and headcount by
// department; the total employees stat (the sidebar's count); and, for roles
// with payroll:view, the payroll stat (the gross of the run payroll-run.html
// shows). The low-stock stat, the pending approvals card and the activity feed
// are static samples and stay as they are. A session without an employee id
// (an old sign-in) leaves the static page as it is.

import { getCurrentUserId } from "../core/auth.js";
import { can } from "../core/rbac.js";
import { getUser, getAllUsers, getAllDepartments, headcountByDepartment, activeHeadcount } from "../data/store.js";
import { runMonth, payrollRun, runTotals } from "../data/payroll-store.js";
import { addDays } from "../data/holidays.js";
import { ATTENDANCE_RULES, teamFor, summaryRange, toMinutes, nowMinutes } from "../data/attendance-store.js";
import {
  el, todayIso, formatRange, monthName, departmentName, fillDepartmentSelect, personCell, plural,
} from "../ui/leave-view.js";
import { dayBadge, presentNote, checkInCell, hoursCell } from "../ui/attendance-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";
import { chartColumns, barRow } from "../ui/chart.js";
import { rupees } from "../ui/money.js";

const CHART_DAYS = 14;
const PAGE_SIZE = 10;

const user = getUser(getCurrentUserId());
const today = todayIso();

const subtitle = document.getElementById("dash-subtitle");
const stats = document.getElementById("dash-stats");
const rateRange = document.getElementById("rate-range");
const chart = document.getElementById("rate-chart");
const rateNote = document.getElementById("rate-note");
const headcountMeta = document.getElementById("headcount-meta");
const headcountBars = document.getElementById("headcount-bars");
const searchInput = document.getElementById("admin-search");
const deptSelect = document.getElementById("admin-dept");
const tbody = document.getElementById("admin-rows");
const rowsMeta = document.getElementById("admin-rows-meta");

let search = "";
let dept = "";
let page = 1;

// ---------- helpers ----------

function setStat(key, value, note) {
  const stat = stats.querySelector(`[data-stat="${key}"]`);
  if (!stat) return;
  setStatValue(stat, value);
  setStatNote(stat, note);
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
  renderHeadcount();
  renderTotal();
  // HR may open this page too; it holds no payroll permission.
  if (can("payroll:view")) renderPayroll();
}