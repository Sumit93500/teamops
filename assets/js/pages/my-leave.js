// pages/my-leave.js
// Runs on my-leave.html. Balances, leave history (year filter, pagination,
// Cancel on pending rows), the newest pending request's progress and the
// next holidays, all for the signed-in person only. A session without an
// employee id (an old sign-in) leaves the static page as it is.

import { getCurrentUserId } from "../core/auth.js";
import { applyPermissions } from "../core/rbac.js";
import { getUser } from "../data/store.js";
import { LEAVE_POLICY, LEAVE_TYPES, balanceFor, requestsFor, cancelLeave } from "../data/leave-store.js";
import { getAllHolidays } from "../data/holidays.js";
import { renderPagination } from "../ui/pagination.js";
import { showToast } from "../ui/toast.js";
import {
  el, escapeHtml, todayIso, formatDay, formatDays, requestDates, requestTitle, typeLabel, monthName,
  monthShort, dayOfMonth, weekdayName, statusBadge, rejectionNote, newestPending, byNewest, pendingSteps,
} from "../ui/leave-view.js";

const PAGE_SIZE = 10;

const user = getUser(getCurrentUserId());

const balanceGrid = document.querySelector(".balance-grid");
const yearSelect = document.querySelector('select[aria-label="Filter by year"]');
const tbody = document.querySelector(".table tbody");
const paginationEl = document.querySelector(".pagination");
const pendingCard = document.getElementById("pending-request");
const holidayList = document.getElementById("upcoming-holidays");

let year = Number(todayIso().slice(0, 4));
let currentPage = 1;

// ---------- balances ----------

const BAR = { casual: "progress", sick: "progress progress--success", earned: "progress", wfh: "progress progress--warning", unpaid: "progress progress--info" };

function balanceCard(type, b, month) {
  const policy = LEAVE_POLICY[type];
  const card = el("div", "balance");

  const head = el("div", "balance__head");
  const limit = policy.allowance === null ? "No limit" : `${policy.allowance} a ${policy.per}`;
  head.append(el("span", "balance__type", typeLabel(type)), el("span", "badge badge--square", limit));

  const amount = policy.allowance === null ? b.approved : b.left;
  const unit = amount === 1 || amount === 0.5 ? "day" : "days";
  const value = el("div", "balance__value", String(amount));
  value.append(el("small", "", policy.allowance === null ? `${unit} taken` : `${unit} left`));

  // The bar is the share still left; unpaid has no limit to measure against.
  const share = policy.allowance ? Math.min(100, Math.max(0, Math.round((b.left / policy.allowance) * 100))) : 0;
  const progress = el("div", BAR[type]);
  const bar = el("span", "progress__bar");
  bar.style.setProperty("--w", `${share}%`);
  progress.append(bar);

  const pending = b.pending ? `, ${b.pending} pending` : "";
  let meta;
  if (policy.allowance === null) meta = `Salary is deducted if used${pending}`;
  else if (policy.per === "month") meta = `${b.approved} used in ${monthName(month)}${pending}`;
  else meta = `${b.approved} used${pending}`;

  card.append(head, value, progress, el("p", "balance__meta", meta));
  return card;
}

function renderBalances() {
  const [y, m] = todayIso().split("-").map(Number);
  const balances = balanceFor(user.id, y, m);
  balanceGrid.replaceChildren(...LEAVE_TYPES.map((type) => balanceCard(type, balances[type], m)));
}

// ---------- history ----------

function fillYears() {
  const thisYear = Number(todayIso().slice(0, 4));
  const years = new Set([thisYear, thisYear - 1, ...requestsFor(user.id).map((r) => Number(r.from.slice(0, 4)))]);
  yearSelect.replaceChildren(...[...years].sort((a, b) => b - a).map((y) => {
    const option = el("option", "", String(y));
    option.value = String(y);
    return option;
  }));
  yearSelect.value = String(year);
}

function cancelRequest(request) {
  if (!window.confirm(`Cancel your ${typeLabel(request.type).toLowerCase()} request for ${requestDates(request)}?`)) return;
  const result = cancelLeave(request.id, user.id);
  if (!result.ok) {
    showToast(escapeHtml(result.error), "danger");
  } else {
    showToast("Leave request cancelled.", "success");
  }
  render();
}

function historyRow(request) {
  const tr = el("tr");
  const typeCell = el("td");
  typeCell.append(el("span", "table__user-name", typeLabel(request.type)));
  const statusCell = el("td");
  statusCell.append(statusBadge(request.status));

  const actions = el("td", "table__actions");
  if (request.status === "pending") {
    const cancel = el("button", "btn btn--sm btn--danger", "Cancel");
    cancel.type = "button";
    cancel.dataset.permission = "leave:cancel";
    cancel.addEventListener("click", () => cancelRequest(request));
    actions.append(cancel);
  } else if (request.status === "rejected" && rejectionNote(request)) {
    actions.append(el("span", "text-sm text-muted", rejectionNote(request)));
  }

  tr.append(
    typeCell,
    el("td", "", requestDates(request)),
    el("td", "table__num", String(request.days)),
    el("td", "", formatDay(request.appliedOn)),
    statusCell,
    actions,
  );
  return tr;
}

function renderHistory() {
  const rows = requestsFor(user.id).filter((r) => Number(r.from.slice(0, 4)) === year).sort(byNewest);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (pageRows.length) {
    tbody.replaceChildren(...pageRows.map(historyRow));
  } else {
    const td = el("td", "text-muted", `No leave requests in ${year}.`);
    td.colSpan = 6;
    const tr = el("tr");
    tr.append(td);
    tbody.replaceChildren(tr);
  }
  applyPermissions(tbody);

  renderPagination(paginationEl, {
    totalItems: rows.length,
    pageSize: PAGE_SIZE,
    currentPage,
    onPageChange: (page) => {
      currentPage = page;
      renderHistory();
    },
  });
}

// ---------- side cards ----------

function renderPending() {
  const request = newestPending(requestsFor(user.id));
  pendingCard.hidden = !request;
  if (!request) return;
  const body = pendingCard.querySelector(".card__body");
  const stepper = el("ol", "stepper stepper--vertical");
  stepper.append(...pendingSteps(request));
  body.replaceChildren(el("p", "fw-medium mb-4", requestTitle(request)), stepper);
}

function renderHolidays() {
  const today = todayIso();
  const upcoming = getAllHolidays().filter((h) => h.date >= today).slice(0, 3);
  if (!upcoming.length) {
    const item = el("div", "list__item");
    item.append(el("span", "list__sub", "No upcoming holidays."));
    holidayList.replaceChildren(item);
    return;
  }
  holidayList.replaceChildren(...upcoming.map((h) => {
    const item = el("div", "list__item");
    const tile = el("div", "date-tile");
    tile.append(el("span", "date-tile__month", monthShort(h.date)), el("span", "date-tile__day", String(dayOfMonth(h.date))));
    const content = el("div", "list__content");
    content.append(el("span", "list__title", h.name), el("span", "list__sub", `${weekdayName(h.date)}, ${h.kind} holiday`));
    item.append(tile, content);
    return item;
  }));
}

// ---------- start ----------

function render() {
  renderBalances();
  fillYears();
  renderHistory();
  renderPending();
}

if (user && balanceGrid && yearSelect && tbody && paginationEl && pendingCard && holidayList) {
  render();
  renderHolidays();
  yearSelect.addEventListener("change", () => {
    year = Number(yearSelect.value);
    currentPage = 1;
    renderHistory();
  });
}