// pages/team-leave.js
// Runs on team-leave.html (Manager scoping part 2): leave:approve (HR, Admin),
// or a manager (data/reporting.js: anyone with direct reports; core/guard.js
// lets them in). Read-only: nobody decides anything here (the approvals inbox
// and leave-approvals.html do). Whose leave: everyone's with leave:approve,
// else only the signed-in person's direct reports (teamScope), in every part:
//   - the month calendar (holidays.html's grid): who is off each day,
//     approved or pending leave, not work from home
//   - "Out in the next 7 days", as on leave-approvals.html
//   - the overlap alert, leave-approvals.html's words, counting only people in
//     view (a manager is never told about anyone outside their team)
//   - the leave balance per person (balanceFor, as my-leave.html counts it),
//     for the people in view who are still active
//   - every leave request of theirs, newest first
// No pay, bank or ID details anywhere, and no export. A session without an
// employee id (an old sign-in) leaves the static page as it is.

import { getCurrentUserId } from "../core/auth.js";
import { can } from "../core/rbac.js";
import { getUser, getAllUsers } from "../data/store.js";
import { LEAVE_POLICY, allRequests, balanceFor, overlaps } from "../data/leave-store.js";
import { getAllHolidays, isWeekend, dayNumber, isoFromDayNumber } from "../data/holidays.js";
import { isManager, teamScope } from "../data/reporting.js";
import { renderPagination } from "../ui/pagination.js";
import {
  el, todayIso, formatDay, formatRange, requestDates, typeLabel, statusBadge,
  initials, avatarClass, departmentName, nameOf, personCell, monthName,
} from "../ui/leave-view.js";

const PAGE_SIZE = 10;

const userId = getCurrentUserId();
const user = getUser(userId);
const today = todayIso();
const pad = (n) => String(n).padStart(2, "0");

const calendarCard = document.getElementById("team-calendar");
const outCard = document.getElementById("out-next-week");
const overlapAlert = document.getElementById("team-overlap");
const balanceTable = document.querySelector("#team-balances table");
const requestBody = document.querySelector("#team-requests tbody");
const paginationEl = document.querySelector("#team-requests .pagination");

let year = Number(today.slice(0, 4));
let month = Number(today.slice(5, 7));
let currentPage = 1;

// ---------- whose leave ----------

const scope = teamScope(userId, can("leave:approve"));
const inView = (id) => scope === null || scope.has(id);
const people = () => getAllUsers().filter((u) => inView(u.id)).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
const requests = () => allRequests().filter((r) => inView(r.userId));
const isOff = (r) => (r.status === "pending" || r.status === "approved") && r.type !== "wfh";

// ---------- calendar ----------

function dayCell(iso, holiday, off) {
  let kind = "";
  if (holiday) kind = "calendar__day--holiday";
  else if (isWeekend(iso)) kind = "calendar__day--weekend";
  else if (off.length) kind = "calendar__day--leave";
  else if (iso > today) kind = "calendar__day--future";
  const cell = el("div", ["calendar__day", kind, iso === today ? "calendar__day--today" : ""].filter(Boolean).join(" "));
  cell.append(el("span", "calendar__date", String(Number(iso.slice(8)))));
  if (holiday) cell.append(el("span", "calendar__tag", holiday.name));
  else if (off.length && !isWeekend(iso)) cell.append(el("span", "calendar__tag", off.map((r) => (nameOf(r.userId) || r.userId).split(" ")[0]).join(", ")));
  return cell;
}

function renderCalendar() {
  const first = dayNumber(`${year}-${pad(month)}-01`);
  const next = month === 12 ? dayNumber(`${year + 1}-01-01`) : dayNumber(`${year}-${pad(month + 1)}-01`);
  const byDate = new Map(getAllHolidays().map((h) => [h.date, h]));
  const leave = requests().filter(isOff);
  const lead = (new Date(first * 24 * 60 * 60 * 1000).getUTCDay() + 6) % 7;   // Monday-first grid
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(el("div", "calendar__day calendar__day--empty"));
  for (let n = first; n < next; n++) {
    const iso = isoFromDayNumber(n);
    const off = leave.filter((r) => r.from <= iso && iso <= r.to).sort((a, b) => nameOf(a.userId).localeCompare(nameOf(b.userId)));
    cells.push(dayCell(iso, byDate.get(iso), off));
  }
  while (cells.length % 7) cells.push(el("div", "calendar__day calendar__day--empty"));
  const grid = calendarCard.querySelector(".calendar__grid");
  grid.replaceChildren(...Array.from(grid.querySelectorAll(".calendar__dow")), ...cells);
  calendarCard.querySelector(".card__title").textContent = `${monthName(month)} ${year}`;
}

// ---------- out in the next 7 days, overlaps ----------

function renderOutNextWeek() {
  const end = isoFromDayNumber(dayNumber(today) + 6);
  const meta = outCard.querySelector(".card__meta");
  if (meta) meta.textContent = formatRange(today, end);
  const list = outCard.querySelector(".list");
  const out = requests().filter((r) => isOff(r) && r.from <= end && r.to >= today)
    .sort((a, b) => a.from.localeCompare(b.from) || nameOf(a.userId).localeCompare(nameOf(b.userId)));
  if (!out.length) {
    const item = el("div", "list__item");
    item.append(el("span", "list__sub", "Nobody is off in the next 7 days."));
    list.replaceChildren(item);
    return;
  }
  list.replaceChildren(...out.map((r) => {
    const person = getUser(r.userId);
    const item = el("div", "list__item");
    const content = el("div", "list__content");
    content.append(el("span", "list__title", person?.name ?? r.userId), el("span", "list__sub", `${requestDates(r)}, ${departmentName(person?.department)}`));
    const badge = r.status === "approved" ? el("span", "badge badge--success", "Approved") : el("span", "badge badge--warning", "Pending");
    item.append(el("div", avatarClass(r.userId), initials(person?.name)), content, badge);
    return item;
  }));
}

// The first pending request (oldest sent first) whose dates clash with others
// in the same department, counting only the people in view.
function renderOverlapAlert() {
  const pending = requests().filter((r) => r.status === "pending").sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id));
  for (const request of pending) {
    const clashes = overlaps(request.id).filter((r) => inView(r.userId));
    if (!clashes.length) continue;
    const count = new Set(clashes.map((r) => r.userId)).size;
    const person = getUser(request.userId);
    overlapAlert.textContent = `${person?.name ?? request.userId}'s dates overlap with ${count} other ${count === 1 ? "person" : "people"} `
      + `from ${departmentName(person?.department)}. Check team cover before approving.`;
    overlapAlert.hidden = false;
    return;
  }
  overlapAlert.hidden = true;
}

// ---------- balances ----------

const CAPPED = Object.keys(LEAVE_POLICY).filter((type) => LEAVE_POLICY[type].allowance !== null);

function renderBalances() {
  const head = balanceTable.querySelector("thead tr");
  head.replaceChildren(el("th", "", "Employee"), ...CAPPED.map((type) => el("th", "", typeLabel(type))));
  const active = people().filter((u) => u.status !== "inactive");
  const body = balanceTable.querySelector("tbody");
  if (!active.length) {
    const td = el("td", "text-muted", "No active employees.");
    td.colSpan = CAPPED.length + 1;
    const tr = el("tr");
    tr.append(td);
    body.replaceChildren(tr);
    return;
  }
  body.replaceChildren(...active.map((u) => {
    const balance = balanceFor(u.id);
    const tr = el("tr");
    tr.append(personCell(u.id, u, departmentName(u.department)), ...CAPPED.map((type) => el("td", "", `${balance[type].left} days left`)));
    return tr;
  }));
}

// ---------- requests ----------

function renderRequests() {
  const rows = requests().sort((a, b) => b.appliedOn.localeCompare(a.appliedOn) || b.id.localeCompare(a.id, "en", { numeric: true }));
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  if (!pageRows.length) {
    const td = el("td", "text-muted", "No leave requests yet.");
    td.colSpan = 6;
    const tr = el("tr");
    tr.append(td);
    requestBody.replaceChildren(tr);
  } else {
    requestBody.replaceChildren(...pageRows.map((r) => {
      const person = getUser(r.userId);
      const status = el("td");
      status.append(statusBadge(r.status));
      const tr = el("tr");
      tr.append(personCell(r.userId, person, departmentName(person?.department)), el("td", "", typeLabel(r.type)), el("td", "", requestDates(r)),
        el("td", "table__num", String(r.days)), el("td", "", formatDay(r.appliedOn)), status);
      return tr;
    }));
  }
  renderPagination(paginationEl, { totalItems: rows.length, pageSize: PAGE_SIZE, currentPage, onPageChange: (page) => { currentPage = page; renderRequests(); } });
}

// ---------- start ----------

// The same test as the guard: it only redirects, and this script would still run.
if (user && (can("leave:approve") || isManager(userId)) && calendarCard && outCard && overlapAlert && balanceTable && requestBody && paginationEl) {
  calendarCard.querySelectorAll("[data-month]").forEach((button) => button.addEventListener("click", () => {
    const step = button.dataset.month === "prev" ? -1 : 1;
    month += step;
    if (month < 1) { month = 12; year -= 1; }
    if (month > 12) { month = 1; year += 1; }
    renderCalendar();
  }));
  renderCalendar();
  renderOutNextWeek();
  renderOverlapAlert();
  renderBalances();
  renderRequests();
}