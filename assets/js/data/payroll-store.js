// data/payroll-store.js
// Salaries, kept in localStorage through data/collection.js, and a month's pay
// worked out from them. Nothing about a month's pay is stored: payrollRunFor()
// reads the salary in effect, the month's attendance (late-mark penalties,
// working days, unexplained absences) and approved unpaid leave, and runs
// data/payroll.js's rules, so a payslip can't disagree with the data it came
// from.
//
// A salary record: { id, userId, gross (monthly, rupees), effectiveFrom
// ("YYYY-MM-DD"), regime: "new" }. A revision is a new record with a later
// effectiveFrom; a month uses the record in effect on its first day.
//
// Nothing writes salaries yet (salary-structure.html only shows them). The
// Reset demo data button (users-list.js) calls resetPayrollData().

import { createCollection } from "./collection.js";
import { getUser, getAllUsers } from "./store.js";
import { dayNumber, isoFromDayNumber, isValidDate, dayOffChecker } from "./holidays.js";
import { allRequests } from "./leave-store.js";
import { monthFor, ATTENDANCE_RULES } from "./attendance-store.js";
import { computePay } from "./payroll.js";

// ---------- seed ----------

// Every tracked (not inactive) seeded person. Rohan, Ananya, Vikram, Meera and
// Arjun keep the gross the static pages showed; Aarav, Priya, Kabir and Sneha
// are new figures in line with their roles. Effective dates follow
// salary-structure.html's "Last revised" column (1 Apr 2026, Vikram 1 Jan 2026).
// Vikram also keeps the salary his 1 Jan 2026 revision replaced (SAL-10), so
// one person has a real revision history. Divya Menon (inactive) has none.
const SEED = [
  { id: "SAL-1", userId: "EMP-1001", gross: 160000, effectiveFrom: "2026-04-01", regime: "new" },   // Aarav Mehta, Administrator
  { id: "SAL-2", userId: "EMP-1003", gross: 125000, effectiveFrom: "2026-04-01", regime: "new" },   // Priya Nair, HR Manager
  { id: "SAL-3", userId: "EMP-1008", gross: 135000, effectiveFrom: "2026-04-01", regime: "new" },   // Kabir Shah, Finance Manager
  { id: "SAL-4", userId: "EMP-1017", gross: 78500,  effectiveFrom: "2026-04-01", regime: "new" },   // Ananya Iyer, Sales Executive
  { id: "SAL-5", userId: "EMP-1023", gross: 105000, effectiveFrom: "2026-04-01", regime: "new" },   // Meera Joshi, Accountant
  { id: "SAL-6", userId: "EMP-1029", gross: 118000, effectiveFrom: "2026-04-01", regime: "new" },   // Sneha Rao, Team Lead
  { id: "SAL-7", userId: "EMP-1042", gross: 92000,  effectiveFrom: "2026-04-01", regime: "new" },   // Rohan Gupta, Senior Software Engineer
  { id: "SAL-8", userId: "EMP-1088", gross: 64000,  effectiveFrom: "2026-01-01", regime: "new" },   // Vikram Singh, Store Keeper
  { id: "SAL-9", userId: "EMP-1105", gross: 88000,  effectiveFrom: "2026-04-01", regime: "new" },   // Arjun Kapoor, Software Engineer
  { id: "SAL-10", userId: "EMP-1088", gross: 60000, effectiveFrom: "2025-01-01", regime: "new" },   // Vikram Singh, before his 1 Jan 2026 raise
];

// Version 2 adds SAL-10; a saved version-1 copy is replaced with the new seed.
const salaries = createCollection({ key: "salaries", version: 2, seed: () => SEED, idPrefix: "SAL-" });

// ---------- reads ----------

const pad = (n) => String(n).padStart(2, "0");
const validMonth = (year, month) => Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12;
const byName = (a, b) => a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id, "en", { numeric: true });
const newestFirst = (a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.id.localeCompare(a.id, "en", { numeric: true });

export function allSalaries() {
  return salaries.getAll();
}

// Every salary record of one person, newest effectiveFrom first ([] if none).
export function salaryHistory(userId) {
  return salaries.getAll().filter((s) => s.userId === userId).sort(newestFirst);
}

// The salary record in effect on the first day of the month, or null.
export function salaryFor(userId, year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!validMonth(y, m)) return null;
  const first = `${y}-${pad(m)}-01`;
  return salaryHistory(userId).find((s) => s.effectiveFrom <= first) ?? null;
}

// Approved unpaid leave on the month's working days: 1 a full day, 0.5 a half
// day. Read from the leave requests, not from the attendance day objects: a
// day can hold two half-day leaves of different types, and a day object names
// only one of them.
export function unpaidLeaveDays(userId, year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!validMonth(y, m)) return 0;
  const first = dayNumber(`${y}-${pad(m)}-01`);
  const last = (m === 12 ? dayNumber(`${y + 1}-01-01`) : dayNumber(`${y}-${pad(m + 1)}-01`)) - 1;
  const isOff = dayOffChecker();
  let days = 0;
  for (const r of allRequests()) {
    if (r.userId !== userId || r.type !== "unpaid" || r.status !== "approved") continue;
    const from = Math.max(first, dayNumber(r.from));
    const to = Math.min(last, dayNumber(r.to));
    for (let n = from; n <= to; n++) {
      if (!isOff(isoFromDayNumber(n))) days += r.duration === "full" ? 1 : 0.5;
    }
  }
  return days;
}

// ---------- unexplained absences ----------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The stored joining date, as profiles show it ("12 Jan 2023") or as
// "2023-01-12", -> "2023-01-12". null when there's none or it can't be read.
export function joiningDate(text) {
  const s = String(text ?? "").trim();
  const m = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/.exec(s);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  const iso = month === -1 ? s : `${m[3]}-${pad(month + 1)}-${pad(Number(m[1]))}`;
  return isValidDate(iso) ? iso : null;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// The last day a correction for the date can be asked for (requestWindowDays later).
export const correctableUntil = (date) => isoFromDayNumber(dayNumber(date) + ATTENDANCE_RULES.requestWindowDays);

// A month's unexplained absences: working days marked absent with no check-in
// at all, on or after the person's joining date. A short day (checked in and
// out, under 4 hours) is marked absent too but isn't one: the person was there.
// Each costs a day's pay, half when approved half-day leave covers the other
// half (that half is leave: unpaidLeaveDays counts it if it's unpaid).
//
// An absence is deducted only once it's settled: its correction window has
// closed and no correction or leave request for that date is waiting for a
// decision. Until then it's open: listed, not deducted. A pending
// work-from-home request doesn't pause it; approving one wouldn't explain a
// day with no check-in.
//
// No readable joining date: nothing is counted or listed as open, and
// uncounted says how many settled absences (ones that would be deducted now)
// that leaves out. Days before the joining date aren't counted; the
// attendance pages still show them absent (a known display issue, not handled
// here).
// -> { days (settled, deducted), open: [{ date, days, until, waiting }], uncounted }
function absencesIn(user, attendance, today) {
  const joined = joiningDate(user.dateOfJoining);
  const pendingLeave = allRequests().filter((r) => r.userId === user.id && r.status === "pending" && r.type !== "wfh");
  let days = 0;
  let uncounted = 0;
  const open = [];
  for (const d of attendance.days) {
    if (d.status !== "absent" || d.checkIn || (joined && d.date < joined)) continue;
    const share = d.halfDayLeave ? 0.5 : 1;
    const until = correctableUntil(d.date);
    const waiting = d.regularization?.status === "pending" || pendingLeave.some((r) => r.from <= d.date && d.date <= r.to);
    const settled = today > until && !waiting;
    if (!joined) uncounted += settled ? 1 : 0;
    else if (settled) days += share;
    else open.push({ date: d.date, days: share, until, waiting });
  }
  return { days, open, uncounted };
}

// One person's pay for a month, or null for an unknown or inactive person or a
// bad month. A row is "on-hold" (with holdReason) when there's no salary for
// the month (all amounts 0) or no bank account to pay into; otherwise "draft".
// It also carries period { from, to } (the month's first and last day) and
// attendance:
//   noData, notYet      how many of its working days came before records began
//                       (paid in full, with no loss-of-pay check) and how many
//                       haven't been recorded yet
//   openAbsences        absences not deducted yet: [{ date, days (1 or 0.5),
//                       until (the last day to ask for a correction), waiting
//                       (a correction or leave request is pending) }]
//   uncountedAbsences   settled absences not deducted: no readable joining date
export function payrollRunFor(userId, year, month) {
  const y = Number(year);
  const m = Number(month);
  const user = getUser(userId);
  const attendance = validMonth(y, m) ? monthFor(userId, y, m) : null;
  if (!user || !attendance) return null;
  const salary = salaryFor(userId, y, m);
  const absences = absencesIn(user, attendance, todayIso());
  const pay = computePay(salary?.gross ?? 0, {
    penaltyHalfDays: attendance.penaltyHalfDays,
    unpaidLeaveDays: unpaidLeaveDays(userId, y, m),
    absenceDays: absences.days,
    workingDays: attendance.workingDays,
  });
  const holdReason = !salary ? "No salary on file for this month" : !user.bankAccount ? "No bank account on file" : null;
  return {
    userId,
    month: `${y}-${pad(m)}`,
    salaryId: salary?.id ?? null,
    regime: salary?.regime ?? null,
    ...pay,
    status: holdReason ? "on-hold" : "draft",
    holdReason,
    period: { from: attendance.days[0].date, to: attendance.days.at(-1).date },
    attendance: {
      noData: attendance.counts.noData,
      notYet: attendance.counts.notYet,
      openAbsences: absences.open,
      uncountedAbsences: absences.uncounted,
    },
  };
}

// The month the payroll run page, the Finance and Admin dashboards and the tax
// page show: the one `today` ("YYYY-MM-DD") falls in, the same month
// payslipsFor() starts from. Runs aren't stored yet, so there is no "latest
// run" to look up. It's the current month because attendance is seeded back
// to the 1st of the month it's first created in: an earlier month can have
// days from before records began, the current month never does. null for a
// bad date.
export function runMonth(today) {
  if (dayNumber(today) === null) return null;
  return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

// The month's run for everyone tracked, by name. preparedBy is whoever creates
// the run; approvedBy stays null (runs aren't stored, so nothing is approved).
// The person who prepared a run may not approve it: see canApprove().
export function payrollRun(year, month, { preparedBy = null } = {}) {
  const y = Number(year);
  const m = Number(month);
  if (!validMonth(y, m)) return null;
  const rows = getAllUsers().filter((u) => u.status !== "inactive").sort(byName)
    .map((u) => payrollRunFor(u.id, y, m)).filter(Boolean);
  return { month: `${y}-${pad(m)}`, status: "draft", preparedBy, approvedBy: null, rows };
}

export const totalNetPay = (run) => run.rows.reduce((sum, r) => sum + r.net, 0);

// A run's totals over every row (on-hold rows too): gross paid, deductions and
// net, and the loss of pay already taken off the gross.
export const runTotals = (run) => run.rows.reduce((t, r) => ({
  gross: t.gross + r.gross,
  deductions: t.deductions + r.deductions,
  net: t.net + r.net,
  lossOfPay: t.lossOfPay + r.lop.amount,
}), { gross: 0, deductions: 0, net: 0, lossOfPay: 0 });

// Separation of duties: someone must approve, and not the person who prepared it.
export const canApprove = (run, userId) => Boolean(userId) && userId !== run.preparedBy;

// ---------- payslips ----------

// Day statuses that mean attendance was being recorded for the person (or will
// be, later this month). A month with none of them is from before records
// began, so its loss of pay can't be checked: it has no payslip.
const RECORDED = ["present", "late", "half-day", "absent", "not-yet"];

// Every payslip this person has, newest first: the month `today`
// ("YYYY-MM-DD") falls in, then each month before it, back to the last one in
// a row with attendance recorded. Each is payrollRunFor()'s row (with its
// period and attendance counts). [] for an unknown or inactive person or a bad
// date.
export function payslipsFor(userId, today) {
  if (dayNumber(today) === null) return [];
  let y = Number(today.slice(0, 4));
  let m = Number(today.slice(5, 7));
  const slips = [];
  for (let n = 0; n < 120; n++) {   // ten years at most
    const attendance = monthFor(userId, y, m);
    if (!attendance?.days.some((d) => RECORDED.includes(d.status))) break;
    slips.push(payrollRunFor(userId, y, m));
    [y, m] = m === 1 ? [y - 1, 12] : [y, m - 1];
  }
  return slips;
}

// Totals over payslips (on-hold ones too, as runTotals counts on-hold rows):
// gross paid, each deduction, all deductions and net.
export const payslipTotals = (slips) => slips.reduce((t, s) => ({
  gross: t.gross + s.gross,
  pf: t.pf + s.deductionLines.pf,
  pt: t.pt + s.deductionLines.pt,
  tds: t.tds + s.deductionLines.tds,
  deductions: t.deductions + s.deductions,
  net: t.net + s.net,
}), { gross: 0, pf: 0, pt: 0, tds: 0, deductions: 0, net: 0 });

// ---------- reset ----------

export function resetPayrollData() {
  salaries.reset();
}