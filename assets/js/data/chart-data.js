// data/chart-data.js
// The numbers behind each chart, one function per chart, kept apart from the
// drawing so a page's drawing (ui/chart.js today) can be replaced, by a React
// component for instance, without touching them. Every function returns the
// same shape:
//   { title, unit, labels: [...], series: [{ name, values: [...] }], ... }
// labels and every series' values run in the same order. Values are plain
// numbers (null where a point has none), never formatted: the page turns them
// into bars, words and money. A chart that needs more than numbers per point (a
// day off, today still filling in) adds marks: [{ ... }], also in label order,
// and a dated chart adds period. Everything is read through the stores' own
// functions; no rule is decided here.

import { ATTENDANCE_RULES, toMinutes, nowMinutes, summaryOfDays } from "./attendance-store.js";
import { addDays, dayOffChecker } from "./holidays.js";
import { LEAVE_POLICY, LEAVE_TYPES, allRequests, balanceFor } from "./leave-store.js";
import { getUser, getAllDepartments, headcountByDepartment } from "./store.js";
import { CATEGORY_KEYS as EXPENSE_CATEGORIES } from "./expenses.js";
import { expenseTotals } from "./expenses-store.js";
import { CATEGORY_KEYS as INVENTORY_CATEGORIES } from "./inventory.js";
import { inventoryTotals } from "./inventory-store.js";

const series = (name, values) => ({ name, values });
const percentOf = (part, whole) => (whole ? Math.round((part / whole) * 100) : null);

// A chart's values by series name ([] when it has no such series).
export const valuesOf = (chart, name) => chart.series.find((s) => s.name === name)?.values ?? [];

// The admin dashboard's attendance rate: one point per day of range
// (summaryRange()'s days, oldest first), up to today. Rate is present out of
// expected, in percent (null when nobody was expected); marks say whether the
// day was off for anyone and whether it is today while the shift is still on.
export function attendanceRateChart(range, today) {
  const todayOpen = nowMinutes() < toMinutes(ATTENDANCE_RULES.shiftEnd);
  return {
    title: "Attendance rate",
    unit: "%",
    period: { from: range[0]?.date ?? today, to: today, todayOpen },
    labels: range.map((s) => s.date),
    series: [
      series("Rate", range.map((s) => percentOf(s.present, s.expected))),
      series("Present", range.map((s) => s.present)),
      series("Expected", range.map((s) => s.expected)),
    ],
    marks: range.map((s) => ({ off: s.off > 0, partial: s.date === today && todayOpen })),
  };
}

// The admin dashboard's headcount: active people per department, in the
// departments' order (headcountByDepartment(), the sidebar's count).
export function headcountChart() {
  const counts = headcountByDepartment();
  const departments = getAllDepartments();
  const values = departments.map((d) => counts[d.code] ?? 0);
  return {
    title: "Headcount by department",
    unit: "employees",
    labels: departments.map((d) => d.name),
    keys: departments.map((d) => d.code),
    series: [series("Employees", values)],
    total: values.reduce((sum, n) => sum + n, 0),
  };
}

// What a day on the hours chart is, in the order the chart decides it: a day
// off first, then a day with no record to draw, then hours.
function dayKind(day) {
  if (day.status === "weekend" || day.status === "holiday") return "off";
  if (["no-data", "not-joined", "left", "on-leave"].includes(day.status)) return day.status;
  if (day.minutesWorked !== null) return day.inProgress ? "in-progress" : "worked";
  if (day.incomplete) return "incomplete";
  if (day.status === "absent") return "absent";
  return "not-yet";
}

// The employee dashboard's working hours: one point per day of days (one
// person's rangeFor() days, oldest first), up to today, in minutes worked
// (null when none were recorded).
export function hoursChart(days, today) {
  return {
    title: "Working hours",
    unit: "minutes",
    period: { from: days[0]?.date ?? today, to: today },
    labels: days.map((d) => d.date),
    series: [series("Worked", days.map((d) => d.minutesWorked))],
    marks: days.map((d) => ({
      kind: dayKind(d),
      status: d.status,
      inProgress: !!d.inProgress,
      overdue: !!d.overdue,
      checkIn: d.checkIn,
      holiday: d.holiday && d.status === "holiday" ? d.holiday.name : null,
    })),
  };
}

// One person's leave balance, every leave type in policy order (balanceFor()):
// Allowance is null for a type with no limit (unpaid), and so is Left. marks
// say what each allowance is counted over ("year" or "month").
export function leaveBalanceChart(userId, year, month) {
  const balance = balanceFor(userId, year, month);
  const of = (field) => LEAVE_TYPES.map((type) => balance[type][field]);
  return {
    title: "Leave balance",
    unit: "days",
    labels: [...LEAVE_TYPES],
    series: [series("Allowance", of("allowance")), series("Approved", of("approved")), series("Pending", of("pending")), series("Left", of("left"))],
    marks: LEAVE_TYPES.map((type) => ({ per: LEAVE_POLICY[type].per })),
  };
}

// The HR dashboard's leave requests: how many were sent (appliedOn) on each of
// the last days days up to today, whatever became of them later; marks say
// which days are off (weekends and holidays).
export function leaveRequestsChart(today, days) {
  const from = addDays(today, -(days - 1));
  const isOff = dayOffChecker();
  const perDay = new Map();
  allRequests().forEach((r) => perDay.set(r.appliedOn, (perDay.get(r.appliedOn) ?? 0) + 1));
  const labels = Array.from({ length: days }, (_, i) => addDays(from, i));
  return {
    title: "Leave requests sent per day",
    unit: "requests",
    period: { from, to: today },
    labels,
    series: [series("Requests", labels.map((date) => perDay.get(date) ?? 0))],
    marks: labels.map((date) => ({ off: isOff(date) })),
  };
}

// The expenses page's spend: approved and paid claims (of claims) per category,
// in rupees; labels are the category keys.
export function expenseSpendChart(claims) {
  const spent = expenseTotals(claims.filter((c) => c.status === "approved" || c.status === "paid")).byCategory;
  return {
    title: "Spend by category",
    unit: "₹",
    labels: [...EXPENSE_CATEGORIES],
    series: [series("Approved and paid", EXPENSE_CATEGORIES.map((k) => spent[k].amount))],
  };
}

// The finance dashboard's gross pay per department for a payroll run: every
// department in the store, in its order (0 for an empty one), then anyone whose
// department isn't in the list, labelled with their department's code ("" for
// none).
export function payrollByDepartmentChart(run) {
  const gross = new Map(getAllDepartments().map((d) => [d.code, { name: d.name, amount: 0 }]));
  for (const row of run.rows) {
    const code = getUser(row.userId)?.department ?? "";
    if (!gross.has(code)) gross.set(code, { name: code, amount: 0 });
    gross.get(code).amount += row.gross;
  }
  return {
    title: "Gross pay by department",
    unit: "₹",
    period: { month: run.month },
    labels: [...gross.values()].map((g) => g.name),
    keys: [...gross.keys()],
    series: [series("Gross", [...gross.values()].map((g) => g.amount))],
  };
}

// The items page's stock value per category (inventoryTotals() of items), in
// rupees; labels are the category keys.
export function inventoryValueChart(items) {
  const { byCategory } = inventoryTotals(items);
  return {
    title: "Value by category",
    unit: "₹",
    labels: [...INVENTORY_CATEGORIES],
    series: [series("Value", INVENTORY_CATEGORIES.map((k) => byCategory[k].value))],
  };
}

// My attendance's month so far: of done (the working days so far), how many
// were on time, late, a half day (only when there was one), on leave or
// absent; labels are the day statuses, total is done's length.
export function monthAttendanceChart(done) {
  const count = (status) => done.filter((d) => d.status === status).length;
  const labels = ["present", "late", ...(count("half-day") ? ["half-day"] : []), "on-leave", "absent"];
  return {
    title: "This month so far",
    unit: "days",
    labels,
    series: [series("Days", labels.map(count))],
    total: done.length,
  };
}

// The tax page's regimes: people in a payroll run with a salary (a regime), on
// the new and the old regime; total is everyone with one.
export function taxRegimeChart(run) {
  const withSalary = run.rows.filter((r) => r.regime);
  return {
    title: "Tax regime",
    unit: "employees",
    labels: ["new", "old"],
    series: [series("Employees", ["new", "old"].map((regime) => withSalary.filter((r) => r.regime === regime).length))],
    total: withSalary.length,
  };
}

// Team attendance's departments on one date: of rows (the page's
// [{ user, day }], already its scope), who is in (present, late or a half
// day) out of who is expected, per department, as summaryFor() counts them.
// Every department, or with a scope (a manager's reports) only those with
// someone in rows. Rate is in percent, null when nobody was expected.
export function departmentPresenceChart(date, rows, scope) {
  const departments = getAllDepartments().filter((d) => scope === null || rows.some((r) => r.user?.department === d.code));
  const sums = departments.map((d) => summaryOfDays(date, rows.filter((r) => r.user?.department === d.code).map((r) => r.day)));
  return {
    title: "Present by department",
    unit: "%",
    period: { date },
    labels: departments.map((d) => d.name),
    keys: departments.map((d) => d.code),
    series: [
      series("Rate", sums.map((s) => percentOf(s.present, s.expected))),
      series("Present", sums.map((s) => s.present)),
      series("Expected", sums.map((s) => s.expected)),
    ],
  };
}