// pages/admin-dashboard.js
// Runs on dashboard/admin.html (needs attendance:view-all, like team
// attendance). The attendance widgets and the headcount card, from the real
// stores: who is present today out of who is expected, the attendance rate for
// the last 14 days, today's attendance for every active employee with a name
// search, a department filter and Previous / Next, and headcount by
// department. The other stats, the pending approvals card and the activity
// feed are static samples and stay as they are. A session without an employee
// id (an old sign-in) leaves the static page as it is.

import { getCurrentUserId } from "../core/auth.js";
import { can } from "../core/rbac.js";
import { getUser, getAllUsers, getAllDepartments, headcountByDepartment } from "../data/store.js";
import { dayNumber, isoFromDayNumber } from "../data/holidays.js";
import { ATTENDANCE_RULES, teamFor, summaryRange } from "../data/attendance-store.js";
import {
  el, todayIso, formatDay, formatRange, weekdayName, monthName, dayOfMonth, initials, avatarClass, departmentName,
} from "../ui/leave-view.js";
import { hoursText, dayBadge } from "../ui/attendance-view.js";

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

const percent = (part, whole) => `${Math.round((part / whole) * 1000) / 10}%`;
const shortDate = (iso) => `${weekdayName(iso).slice(0, 3)}, ${formatDay(iso)}`;
const addDays = (iso, n) => isoFromDayNumber(dayNumber(iso) + n);
const toMinutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

// Why nobody is expected on a day (same wording as team-attendance.html).
function offNote(days) {
  const holiday = days.find((d) => d.status === "holiday")?.holiday;
  if (holiday) return `Holiday: ${holiday.name}`;
  if (days.some((d) => d.status === "weekend")) return "Weekend";
  if (days.some((d) => d.status === "no-data")) return "No attendance records for this date";
  if (days.length && days.every((d) => d.status === "on-leave")) return "Everyone is on leave";
  return "No active employees";
}

function setStat(key, value, note) {
  const stat = stats.querySelector(`[data-stat="${key}"]`);
  if (!stat) return;
  stat.querySelector(".stat__value").textContent = value;
  const delta = stat.querySelector(".stat__delta");
  delta.className = "stat__delta";
  delta.textContent = note;
}

// ---------- present today ----------

// Present (on time, late or a half day) out of who is expected, as on team-attendance.html.
function renderPresent(summary, days) {
  setStat("present", String(summary.present), summary.expected ? `${percent(summary.present, summary.expected)} of ${summary.expected} expected` : offNote(days));
}

// ---------- attendance rate chart ----------

// Today is still filling in until the shift ends, so its bar is drawn faded and
// its title says "so far"; after the shift ends it's a normal bar.
function renderChart(range) {
  const from = range[0].date;
  const todayOpen = nowMinutes() < toMinutes(ATTENDANCE_RULES.shiftEnd);
  rateRange.textContent = formatRange(from, today);
  chart.replaceChildren(...range.map((s) => {
    const partial = s.date === today && todayOpen;
    let modifier = "";
    let height = 0;
    let what;
    if (!s.expected) {
      modifier = " chart__bar--muted";
      what = s.off ? "day off" : "nobody expected";
    } else {
      height = Math.round((s.present / s.expected) * 100);
      if (partial) modifier = " chart__bar--progress";
      what = `${height}%${partial ? " so far" : ""} (${s.present} of ${s.expected} expected)`;
    }
    const bar = el("span", `chart__bar${modifier}`);
    bar.style.setProperty("--h", String(height));
    bar.title = `${shortDate(s.date)}: ${what}`;
    const track = el("div", "chart__track");
    track.append(bar);
    const col = el("div", "chart__col");
    col.append(track, el("span", "chart__label", String(dayOfMonth(s.date))));
    return col;
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
    const bar = el("div", "bar-row");
    const track = el("div", "bar-row__track");
    const fill = el("span", "bar-row__fill");
    fill.style.setProperty("--w", `${Math.round((count / top) * 100)}%`);
    track.append(fill);
    bar.append(el("span", "", d.name), track, el("span", "bar-row__value", String(count)));
    return bar;
  }));
}

// ---------- today's attendance ----------

function personCell(person, day) {
  const td = el("td");
  const wrap = el("div", "table__user");
  const text = el("div");
  text.append(el("span", "table__user-name", person?.name ?? day.userId), el("span", "table__user-sub", person?.email ?? ""));
  wrap.append(el("div", avatarClass(day.userId), initials(person?.name)), text);
  td.append(wrap);
  return td;
}

// Check-in and hours, as on team-attendance.html.
function checkInCell(day) {
  const td = el("td");
  if (!day.checkIn) {
    td.textContent = "–";
    return td;
  }
  td.append(el("span", "", day.checkIn));
  if (day.mode === "wfh") td.append(" ", el("span", "badge", "WFH"));
  if (day.originalCheckIn) td.append(el("span", "table__user-sub", `was ${day.originalCheckIn}`));
  return td;
}

function hoursCell(day) {
  const td = el("td", "table__num");
  if (day.minutesWorked === null) {
    td.textContent = day.incomplete ? "No check-out" : "–";
    return td;
  }
  td.append(el("span", "", hoursText(day.minutesWorked)));
  if (day.inProgress) td.append(el("span", "table__user-sub", "so far"));
  return td;
}

function row({ person, day }) {
  const tr = el("tr");
  const status = el("td");
  status.append(dayBadge(day));
  tr.append(personCell(person, day), el("td", "", day.userId), el("td", "", departmentName(person?.department)), status, checkInCell(day), hoursCell(day));
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
    deptSelect.replaceChildren(el("option", "", "All departments"), ...getAllDepartments().map((d) => {
      const option = el("option", "", d.name);
      option.value = d.code;
      return option;
    }));
    deptSelect.options[0].value = "";
    deptSelect.addEventListener("change", () => { dept = deptSelect.value; page = 1; renderTable(); });
  }
  searchInput?.addEventListener("input", () => { search = searchInput.value; page = 1; renderTable(); });
  pager = pagerButtons();

  const days = renderTable().map((r) => r.day);
  const range = summaryRange(addDays(today, -(CHART_DAYS - 1)), today);   // one storage read; today is the last day
  renderPresent(range[range.length - 1], days);
  renderChart(range);
  renderHeadcount();
}