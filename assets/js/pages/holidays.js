// pages/holidays.js
// Runs on holidays.html (any signed-in person). The year select filters the
// month calendar, the year's list and the summary. People with
// holidays:manage can add holidays (modal) and remove them; everyone else
// just sees the calendar.

import { applyPermissions } from "../core/rbac.js";
import { getAllHolidays, addHoliday, removeHoliday, isWeekend, dayNumber, isoFromDayNumber } from "../data/holidays.js";
import { openModal, closeModal } from "../ui/modal.js";
import { showToast } from "../ui/toast.js";
import { el, escapeHtml, todayIso, formatDay, monthName, monthShort, dayOfMonth, weekdayName } from "../ui/leave-view.js";

const MODAL_ID = "holiday-modal";
const pad = (n) => String(n).padStart(2, "0");

const yearSelect = document.querySelector('.page-header__actions select[aria-label="Choose year"]');
const addBtn = document.querySelector('.page-header__actions button[data-permission="holidays:manage"]');
const calendarCard = document.getElementById("holiday-calendar");
const listCard = document.getElementById("holiday-list");
const summaryCard = document.getElementById("holiday-summary");
const modal = document.getElementById(MODAL_ID);
const form = modal?.querySelector("form");
const field = (id) => document.getElementById(id);

const thisYear = Number(todayIso().slice(0, 4));
let year = thisYear;
let month = 1;   // 1-12, the month the calendar shows

// ---------- data ----------

const holidaysOf = (y) => getAllHolidays().filter((h) => h.date.startsWith(`${y}-`));

// The month of the next upcoming holiday in that year; otherwise this month
// (this year) or the year's first holiday (other years).
function defaultMonth(y) {
  const list = holidaysOf(y);
  const next = list.find((h) => h.date >= todayIso());
  if (next) return Number(next.date.slice(5, 7));
  if (y === thisYear) return Number(todayIso().slice(5, 7));
  return list.length ? Number(list[0].date.slice(5, 7)) : 1;
}

// ---------- calendar ----------

function dayCell(iso, holiday) {
  const today = todayIso();
  let kind = "";
  if (holiday) kind = "calendar__day--holiday";
  else if (isWeekend(iso)) kind = "calendar__day--weekend";
  else if (iso > today) kind = "calendar__day--future";
  const cell = el("div", ["calendar__day", kind, iso === today ? "calendar__day--today" : ""].filter(Boolean).join(" "));
  cell.append(el("span", "calendar__date", String(Number(iso.slice(8)))));
  if (holiday) cell.append(el("span", "calendar__tag", holiday.name));
  return cell;
}

function renderCalendar() {
  const first = dayNumber(`${year}-${pad(month)}-01`);
  const next = month === 12 ? dayNumber(`${year + 1}-01-01`) : dayNumber(`${year}-${pad(month + 1)}-01`);
  const byDate = new Map(holidaysOf(year).map((h) => [h.date, h]));
  const lead = (new Date(first * 24 * 60 * 60 * 1000).getUTCDay() + 6) % 7;   // Monday-first grid

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(el("div", "calendar__day calendar__day--empty"));
  for (let n = first; n < next; n++) {
    const iso = isoFromDayNumber(n);
    cells.push(dayCell(iso, byDate.get(iso)));
  }
  while (cells.length % 7) cells.push(el("div", "calendar__day calendar__day--empty"));

  const grid = calendarCard.querySelector(".calendar__grid");
  grid.replaceChildren(...Array.from(grid.querySelectorAll(".calendar__dow")), ...cells);

  const inMonth = holidaysOf(year).filter((h) => Number(h.date.slice(5, 7)) === month).length;
  calendarCard.querySelector(".card__title").textContent = `${monthName(month)} ${year}`;
  calendarCard.querySelector(".card__meta").textContent = `${inMonth} ${inMonth === 1 ? "holiday" : "holidays"}`;
  // The year select owns the year, so the arrows stay inside it.
  calendarCard.querySelector('[data-month="prev"]').disabled = month === 1;
  calendarCard.querySelector('[data-month="next"]').disabled = month === 12;
}

// ---------- list and summary ----------

function removeOne(holiday) {
  if (!window.confirm(`Remove ${holiday.name} on ${formatDay(holiday.date, true)}?`)) return;
  const result = removeHoliday(holiday.id);
  if (result.ok) showToast("Holiday removed.", "success");
  else showToast(escapeHtml(result.error), "danger");
  render();
}

function listItem(holiday) {
  const past = holiday.date < todayIso();
  const item = el("div", "list__item");
  const tile = el("div", past ? "date-tile date-tile--muted" : "date-tile");
  tile.append(el("span", "date-tile__month", monthShort(holiday.date)), el("span", "date-tile__day", String(dayOfMonth(holiday.date))));
  const content = el("div", "list__content");
  content.append(el("span", "list__title", holiday.name), el("span", "list__sub", `${weekdayName(holiday.date)}, ${holiday.kind}`));
  const badge = past ? el("span", "badge", "Past") : el("span", "badge badge--primary", "Upcoming");
  const remove = el("button", "btn btn--sm btn--ghost", "Remove");
  remove.type = "button";
  remove.dataset.permission = "holidays:manage";
  remove.setAttribute("aria-label", `Remove ${holiday.name}`);
  remove.addEventListener("click", () => removeOne(holiday));
  item.append(tile, content, badge, remove);
  return item;
}

function renderList() {
  const list = holidaysOf(year);
  listCard.querySelector(".card__title").textContent = `${year} holidays`;
  listCard.querySelector(".card__meta").textContent = `${list.length} listed`;
  const box = listCard.querySelector(".list");
  if (list.length) {
    box.replaceChildren(...list.map(listItem));
  } else {
    const item = el("div", "list__item");
    item.append(el("span", "list__sub", `No holidays listed for ${year}.`));
    box.replaceChildren(item);
  }
  applyPermissions(box);
}

function renderSummary() {
  const list = holidaysOf(year);
  const count = (kind) => list.filter((h) => h.kind === kind).length;
  const rows = [["National holidays", count("national")], ["Company holidays", count("company")], ["Optional holidays", count("optional")], ["Total listed", list.length]];
  summaryCard.querySelector(".kv").replaceChildren(...rows.map(([term, value]) => {
    const row = el("div", "kv__row");
    row.append(el("dt", "", term), el("dd", "", String(value)));
    return row;
  }));
}

function fillYears() {
  const years = new Set([thisYear, ...getAllHolidays().map((h) => Number(h.date.slice(0, 4)))]);
  yearSelect.replaceChildren(...[...years].sort((a, b) => b - a).map((y) => {
    const option = el("option", "", String(y));
    option.value = String(y);
    return option;
  }));
  yearSelect.value = String(year);
}

function render() {
  fillYears();
  renderCalendar();
  renderList();
  renderSummary();
}

// ---------- add holiday (modal) ----------

const FIELDS = { date: "holiday-date", name: "holiday-name", kind: "holiday-kind" };

function clearError() {
  form.querySelectorAll(".form-error").forEach((e) => e.remove());
  Object.values(FIELDS).forEach((id) => field(id)?.removeAttribute("aria-describedby"));
}

function showError(input, message) {
  clearError();
  const error = el("span", "form-error", message);
  error.id = `${input.id}-error`;
  input.closest(".form-field").append(error);
  input.setAttribute("aria-describedby", error.id);
  input.focus();
}

function save(e) {
  e.preventDefault();
  clearError();
  const result = addHoliday({ date: field(FIELDS.date).value, name: field(FIELDS.name).value, kind: field(FIELDS.kind).value });
  if (!result.ok) {
    const input = field(FIELDS[result.field]);
    if (input) showError(input, result.error);
    else showToast(escapeHtml(result.error), "danger");
    return;
  }
  closeModal(MODAL_ID);
  showToast("Holiday added.", "success");
  // Show where it went.
  year = Number(result.record.date.slice(0, 4));
  month = Number(result.record.date.slice(5, 7));
  render();
}

// ---------- start ----------

if (yearSelect && calendarCard && listCard && summaryCard) {
  month = defaultMonth(year);
  render();

  yearSelect.addEventListener("change", () => {
    year = Number(yearSelect.value);
    month = defaultMonth(year);
    render();
  });
  calendarCard.querySelector('[data-month="prev"]').addEventListener("click", () => { if (month > 1) { month -= 1; renderCalendar(); } });
  calendarCard.querySelector('[data-month="next"]').addEventListener("click", () => { if (month < 12) { month += 1; renderCalendar(); } });

  if (addBtn && modal && form) {
    addBtn.addEventListener("click", () => {
      form.reset();
      clearError();
      openModal(MODAL_ID);
      field(FIELDS.date).focus();
    });
    form.addEventListener("submit", save);
    Object.values(FIELDS).forEach((id) => field(id).addEventListener("input", clearError));
  }
}