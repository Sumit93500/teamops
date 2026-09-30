// pages/team-attendance.js
// Runs on team-attendance.html (needs attendance:view-all). Everything follows
// the date picker (today by default, never later than today): the stat strip,
// a table of every active employee for that date with their Monday to Friday,
// attendance by department, and who needs attention. The table has tabs
// (All / Present / Late / On leave / Absent), a name search, a department
// filter, a name sort and pagination; Export (csv-export.js) writes the rows
// the table is showing. Inactive employees never appear: the attendance store
// leaves them out. A session without an employee id (an old sign-in) leaves the
// static page as it is.
//
// Someone not in yet is counted under Absent once they're overdue (past the
// grace time, see attendance-store.js); before that they appear only under All.

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { can } from "../core/rbac.js";
import { getUser, getAllUsers, getAllDepartments } from "../data/store.js";
import { isValidDate } from "../data/holidays.js";
import { allRequests } from "../data/leave-store.js";
import { teamWeekFor, summaryFor, pendingRegularizations } from "../data/attendance-store.js";
import { renderPagination } from "../ui/pagination.js";
import { initPlaceholders } from "../ui/placeholder.js";
import { showToast } from "../ui/toast.js";
import { el, formatDay, weekdayName, todayIso, initials, avatarClass, departmentName } from "../ui/leave-view.js";
import { hoursText, dayBadge } from "../ui/attendance-view.js";

const PAGE_SIZE = 10;

const userId = getCurrentUserId();
const role = getCurrentRole()?.key;
const user = getUser(userId);
const today = todayIso();

const dateInput = document.getElementById("team-date");
const regLink = document.getElementById("team-reg-link");
const stats = document.getElementById("team-stats");
const pills = Array.from(document.querySelectorAll(".table__toolbar .tabs__tab[data-tab]"));
const searchInput = document.getElementById("team-search");
const deptSelect = document.getElementById("team-dept");
const sortButton = document.getElementById("team-sort");
const tbody = document.getElementById("team-rows");
const paginationEl = document.getElementById("team-pagination");
const deptBars = document.getElementById("team-dept-bars");
const deptDate = document.getElementById("team-dept-date");
const attentionList = document.getElementById("team-attention");
const attentionCount = document.getElementById("team-attention-count");

let date = today;
let tab = "all";
let search = "";
let dept = "";
let ascending = true;
let currentPage = 1;

// ---------- formatting ----------

const percent = (part, whole) => `${Math.round((part / whole) * 1000) / 10}%`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const shortDate = (iso) => `${weekdayName(iso).slice(0, 3)}, ${formatDay(iso)}`;

// Week dots: [class suffix, export code, words]. The code is what CSV export writes ("P,P,L,P,P").
const WEEK = {
  present: ["p", "P", "present"],
  late: ["l", "L", "late"],
  "half-day": ["hd", "HD", "half day"],
  absent: ["a", "A", "absent"],
  "on-leave": ["lv", "LV", "on leave"],
  holiday: ["hol", "HOL", "holiday"],
  weekend: ["nd", "W", "weekend"],
  "not-yet": ["ny", "NY", "not in yet"],
  "no-data": ["nd", "ND", "no data"],
};
const weekPart = (day) => WEEK[day.status] ?? ["nd", "?", day.status];

// ---------- data ----------

const isPresent = (day) => ["present", "late", "half-day"].includes(day.status);
const isAbsent = (day) => day.status === "absent" || day.overdue;
// No check-in, and it's too late to count as on time: past days, today after the shift, or overdue.
const isMissing = (day) => !day.checkIn && isAbsent(day);

const TABS = {
  all: () => true,
  present: isPresent,
  late: (day) => day.status === "late",
  "on-leave": (day) => day.status === "on-leave",
  absent: isAbsent,
};

// Every active employee for the date: { day, week, user }, by name.
function loadRows() {
  const people = new Map(getAllUsers().map((u) => [u.id, u]));
  return teamWeekFor(date).map(({ day, week }) => ({ day, week, user: people.get(day.userId) }));
}

// Why nobody is expected: a holiday, a weekend, a date before records began.
function offNote(rows) {
  const holiday = rows.find((r) => r.day.status === "holiday")?.day.holiday;
  if (holiday) return `Holiday: ${holiday.name}`;
  if (rows.some((r) => r.day.status === "weekend")) return "Weekend";
  if (rows.some((r) => r.day.status === "no-data")) return "No attendance records for this date";
  if (rows.length && rows.every((r) => r.day.status === "on-leave")) return "Everyone is on leave";
  return "No active employees";
}

// ---------- stat strip ----------

function setStat(key, value, note, tone = "") {
  const stat = stats.querySelector(`[data-stat="${key}"]`);
  if (!stat) return;
  stat.querySelector(".stat__value").textContent = String(value);
  const delta = stat.querySelector(".stat__delta");
  delta.className = `stat__delta${tone ? ` stat__delta--${tone}` : ""}`;
  delta.textContent = note;
}

function renderStats(summary, rows) {
  const { expected } = summary;
  setStat("present", summary.present, expected ? `${percent(summary.present, expected)} of ${expected} expected` : offNote(rows));
  setStat("late", summary.late, "Included in present");
  setStat("on-leave", summary.onLeave, "Not counted in expected");

  const absent = summary.absent + summary.overdue;
  const waiting = summary.notYet - summary.overdue;
  let note = "No check-in or approved leave";
  if (summary.overdue) note = `Includes ${summary.overdue} overdue${waiting ? `; ${waiting} more not in yet` : ""}`;
  else if (waiting) note = `${plural(waiting, "person", "people")} not in yet, not counted`;
  setStat("absent", absent, note, absent ? "down" : "");
}

// ---------- table ----------

function personCell(row) {
  const td = el("td");
  const wrap = el("div", "table__user");
  const text = el("div");
  text.append(el("span", "table__user-name", row.user?.name ?? row.day.userId), el("span", "table__user-sub", row.day.userId));
  wrap.append(el("div", avatarClass(row.day.userId), initials(row.user?.name)), text);
  td.append(wrap);
  return td;
}

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

function weekCell(week) {
  const td = el("td");
  const strip = el("span", "week");
  strip.setAttribute("role", "img");
  strip.setAttribute("aria-label", week.map((d) => `${weekdayName(d.date)} ${weekPart(d)[2]}`).join(", "));
  week.forEach((d) => {
    const [suffix, , words] = weekPart(d);
    const dot = el("i", `week__day week__day--${suffix}`);
    dot.title = `${shortDate(d.date)}: ${words}`;
    strip.append(dot);
  });
  // Not shown; it's the text the CSV export reads for this column.
  strip.append(el("span", "sr-only", week.map((d) => weekPart(d)[1]).join(",")));
  td.append(strip);
  return td;
}

function row(r) {
  const tr = el("tr");
  const status = el("td");
  status.append(dayBadge(r.day));
  tr.append(
    personCell(r),
    el("td", "", departmentName(r.user?.department)),
    checkInCell(r.day),
    hoursCell(r.day),
    weekCell(r.week),
    status,
  );
  return tr;
}

function emptyRow(text) {
  const td = el("td", "text-muted", text);
  td.colSpan = 6;
  const tr = el("tr");
  tr.append(td);
  return tr;
}

// Department and search narrow the list; the tab counts follow them.
function filtered(rows) {
  const query = search.trim().toLowerCase();
  return rows.filter((r) => (!dept || r.user?.department === dept) && (!query || (r.user?.name ?? "").toLowerCase().includes(query)));
}

function renderTable(rows) {
  const narrowed = filtered(rows);
  pills.forEach((pill) => {
    const badge = pill.querySelector(".badge--count");
    if (badge) badge.textContent = String(narrowed.filter((r) => TABS[pill.dataset.tab](r.day)).length);
  });

  const byName = (a, b) => (a.user?.name ?? "").localeCompare(b.user?.name ?? "") || a.day.userId.localeCompare(b.day.userId);
  const shown = narrowed.filter((r) => TABS[tab](r.day)).sort((a, b) => (ascending ? byName(a, b) : byName(b, a)));
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageRows = shown.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  let empty = "Nobody matches these filters.";
  if (!rows.length) empty = "No active employees.";
  else if (!search.trim() && !dept) empty = "Nobody in this group on this date.";
  tbody.replaceChildren(...(pageRows.length ? pageRows.map(row) : [emptyRow(empty)]));

  renderPagination(paginationEl, {
    totalItems: shown.length,
    pageSize: PAGE_SIZE,
    currentPage,
    onPageChange: (page) => {
      currentPage = page;
      renderTable(rows);
    },
  });
}

// ---------- side cards ----------

function renderDepartments(rows) {
  deptDate.textContent = date === today ? "Today" : shortDate(date);
  deptBars.replaceChildren(...getAllDepartments().map((d) => {
    const days = rows.filter((r) => r.user?.department === d.code).map((r) => r.day);
    const expected = days.filter((day) => day.expected).length;
    const value = expected ? Math.round((days.filter(isPresent).length / expected) * 100) : null;
    const bar = el("div", "bar-row");
    const track = el("div", "bar-row__track");
    const fill = el("span", "bar-row__fill");
    fill.style.setProperty("--w", `${value ?? 0}%`);
    track.append(fill);
    bar.append(el("span", "", d.name), track, el("span", "bar-row__value", value === null ? "–" : `${value}%`));
    bar.title = expected ? `${days.filter(isPresent).length} of ${expected} expected are in` : "Nobody expected";
    return bar;
  }));
}

// Pending leave (not work from home) covering the date, by person.
function pendingLeaveIds() {
  return new Set(allRequests().filter((r) => r.status === "pending" && r.type !== "wfh" && r.from <= date && date <= r.to).map((r) => r.userId));
}

function attentionNote(day, pendingLeave) {
  if (day.regularization?.status === "pending" && day.regularization.issue === "missed-check-in") return "correction pending";
  if (pendingLeave.has(day.userId)) return "leave request pending";
  return "no check-in or leave request";
}

function renderAttention(rows, summary) {
  const pendingLeave = pendingLeaveIds();
  const people = rows.filter((r) => isMissing(r.day));
  attentionCount.textContent = people.length ? `${people.length} ${people.length === 1 ? "needs" : "need"} attention` : "None";

  if (!people.length) {
    const item = el("div", "list__item");
    const content = el("div", "list__content");
    content.append(el("span", "list__sub", summary.expected ? "Everyone is accounted for." : "Nobody is expected at work on this date."));
    item.append(content);
    attentionList.replaceChildren(item);
    return;
  }
  attentionList.replaceChildren(...people.map((r) => {
    const item = el("div", "list__item");
    const content = el("div", "list__content");
    content.append(
      el("span", "list__title", r.user?.name ?? r.day.userId),
      el("span", "list__sub", `${departmentName(r.user?.department)}, ${attentionNote(r.day, pendingLeave)}`),
    );
    const message = el("button", "btn btn--sm", "Message");
    message.type = "button";
    message.dataset.notImplemented = "Message";
    item.append(el("div", avatarClass(r.day.userId), initials(r.user?.name)), content, message);
    return item;
  }));
  initPlaceholders(attentionList);
}

function renderRegularizationCount() {
  if (!regLink || !can("attendance:approve")) return;
  regLink.querySelector(".badge--count")?.remove();
  const count = pendingRegularizations(userId, role).length;
  if (!count) return;
  const badge = el("span", "badge badge--count", String(count));
  badge.append(el("span", "sr-only", " pending"));
  regLink.append(" ", badge);
}

// ---------- start ----------

function render() {
  const rows = loadRows();
  const summary = summaryFor(date);
  renderStats(summary, rows);
  renderTable(rows);
  renderDepartments(rows);
  renderAttention(rows, summary);
}

// can() matters because guard.js only redirects; this script would still run.
if (user && can("attendance:view-all") && dateInput && stats && tbody && paginationEl && deptBars && attentionList) {
  dateInput.max = today;
  dateInput.value = today;
  dateInput.addEventListener("change", () => {
    const picked = dateInput.value;
    if (picked === date) return;
    if (!isValidDate(picked) || picked > today) {
      dateInput.value = date;
      if (picked > today) showToast("Attendance can't be shown for a future date. Pick today or an earlier date.", "warning");
      return;
    }
    date = picked;
    currentPage = 1;
    render();
  });

  if (deptSelect) {
    deptSelect.replaceChildren(el("option", "", "All departments"), ...getAllDepartments().map((d) => {
      const option = el("option", "", d.name);
      option.value = d.code;
      return option;
    }));
    deptSelect.options[0].value = "";
    deptSelect.addEventListener("change", () => {
      dept = deptSelect.value;
      currentPage = 1;
      renderTable(loadRows());
    });
  }
  searchInput?.addEventListener("input", () => {
    search = searchInput.value;
    currentPage = 1;
    renderTable(loadRows());
  });
  // ui/tabs.js already moves the is-active highlight between pills on click.
  pills.forEach((pill) => pill.addEventListener("click", () => {
    tab = pill.dataset.tab in TABS ? pill.dataset.tab : "all";
    currentPage = 1;
    renderTable(loadRows());
  }));
  sortButton?.addEventListener("click", () => {
    ascending = !ascending;
    sortButton.closest("th")?.setAttribute("aria-sort", ascending ? "ascending" : "descending");
    const arrow = sortButton.querySelector("[aria-hidden]");
    if (arrow) arrow.textContent = ascending ? "▲" : "▼";
    renderTable(loadRows());
  });

  renderRegularizationCount();
  render();
}