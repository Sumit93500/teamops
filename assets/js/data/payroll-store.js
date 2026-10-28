// data/payroll-store.js
// Salaries, kept in localStorage through data/collection.js, a month's pay
// worked out from them, and the payroll runs prepared and approved from that
// (round 11T). payrollRunFor() reads the salary in effect, the month's
// attendance (late-mark penalties, working days, unexplained absences) and
// approved unpaid leave, and runs data/payroll.js's rules, so a live payslip
// can't disagree with the data it came from. Once a month's run is approved,
// its payslips are the figures it fixed (see "stored runs" below).
//
// A salary record: { id, userId, gross (monthly, rupees), effectiveFrom
// ("YYYY-MM-DD"), regime: "new" }. A revision is a new record with a later
// effectiveFrom; a month uses the record in effect on its first day.
//
// setSalary() (below, round 12V) is the only writer: it adds records, and
// never edits or deletes one. salary-structure.html's Edit calls it directly
// (round 12W) until R9c-2 moves it to proposeSalary() (round 12X), where a
// change Finance proposes waits until an Admin approves it, and approving it
// writes it through setSalary(). The Reset demo data button (users-list.js)
// calls resetPayrollData().

import { createCollection, fail } from "./collection.js";
import { load } from "../core/storage.js";
import { getUser, getAllUsers, joiningDate, leavingDate, awayOn, approvedMonthCovering } from "./store.js";
import { permissionsOf } from "../config/roles.js";
import { dayNumber, isoFromDayNumber, dayOffChecker, isValidDate } from "./holidays.js";
import { allRequests, PAST_DAY_WINDOW } from "./leave-store.js";
import { monthFor, allRegularizations, ATTENDANCE_RULES } from "./attendance-store.js";
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
const monthKey = (year, month) => `${year}-${pad(month)}`;   // 2026, 10 -> "2026-10"
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
  const user = getUser(userId);   // a leaver's leave after their last working day isn't counted (round 11Y), nor in a period away (round 12H)
  const last = (m === 12 ? dayNumber(`${y + 1}-01-01`) : dayNumber(`${y}-${pad(m + 1)}-01`)) - 1;
  const isOff = dayOffChecker();
  let days = 0;
  for (const r of allRequests()) {
    if (r.userId !== userId || r.type !== "unpaid" || r.status !== "approved") continue;
    const from = Math.max(first, dayNumber(r.from));
    const to = Math.min(last, dayNumber(r.to));
    for (let n = from; n <= to; n++) {
      if (!isOff(isoFromDayNumber(n)) && !awayOn(user, isoFromDayNumber(n))) days += r.duration === "full" ? 1 : 0.5;
    }
  }
  return days;
}

// Whether every day from `from` to `to` ("YYYY-MM-DD") is one this person was
// away (store.js awayOn(): after a last working day, live or in a past period;
// round 12H).
function awayThrough(user, from, to) {
  const [a, b] = [dayNumber(from), dayNumber(to)];
  if (a === null || b === null || a > b) return false;
  for (let n = a; n <= b; n++) if (!awayOn(user, isoFromDayNumber(n))) return false;
  return true;
}

// ---------- unexplained absences ----------

// The joining-date parser lives in store.js, beside the user records (attendance reads it too); re-exported here.
export { joiningDate };

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

// A month's late marks left out of the penalty for now (G4, round 11W,
// round-11u-notes.md U2 / U-D2): a late day whose late-arrival correction is
// waiting for a decision. It's the absences' rule (absencesIn, above): a draft
// doesn't deduct what a pending request may undo. Only a late-arrival
// correction pauses a late mark: G4 is about late arrivals, so a pending
// missed-check-out or missed-check-in correction on a late day doesn't, even
// though deciding one could change the day too. attendance-store.js's monthFor
// keeps counting every late mark (the attendance pages show them all); only
// pay waits. A stored run never holds one: runProblems() refuses a month with
// a pending correction, and closes its window first.
const pausedLateMarks = (attendance) => attendance.days.filter((d) => d.status === "late"
  && d.regularization?.status === "pending" && d.regularization.issue === "late-arrival").length;

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
//   pausedLateMarks     late marks not counted toward the penalty yet: a
//                       late-arrival correction for each is pending (G4)
//   beforeJoining, joined   working days before the joining date (not-joined:
//                       not absences; taken off as loss of pay, lop.notJoinedDays,
//                       so the first month is prorated: round 12D) and that date
//                       (null if none can be read). There's no row for a month
//                       before the joining month, as there's none after a
//                       leaver's final month
//   lastDay             only in a leaver's final month (round 11Y): their last
//                       working day; the working days after it are taken off
//                       as loss of pay (lop.leftDays), so the month is prorated
export function payrollRunFor(userId, year, month) {
  const y = Number(year);
  const m = Number(month);
  const user = getUser(userId);
  const attendance = validMonth(y, m) ? monthFor(userId, y, m) : null;
  if (!user || !attendance) return null;
  const joinedOn = joiningDate(user.dateOfJoining);
  if (joinedOn && joinedOn.slice(0, 7) > `${y}-${pad(m)}`) return null;   // not joined yet (round 12D)
  if (awayThrough(user, attendance.days[0].date, attendance.days.at(-1).date)) return null;   // away all month (round 12H)
  const salary = salaryFor(userId, y, m);
  const absences = absencesIn(user, attendance, todayIso());
  const paused = pausedLateMarks(attendance);
  const pay = computePay(salary?.gross ?? 0, {
    penaltyHalfDays: Math.floor((attendance.lateMarks - paused) / ATTENDANCE_RULES.penaltyEvery),
    unpaidLeaveDays: unpaidLeaveDays(userId, y, m),
    absenceDays: absences.days,
    leftDays: attendance.days.filter((d) => d.status === "left").length,
    notJoinedDays: attendance.counts.notJoined,   // round 12D: the first month is prorated
    workingDays: attendance.workingDays,
  });
  const left = leavingDate(user);
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
      pausedLateMarks: paused,
      beforeJoining: attendance.counts.notJoined,
      joined: joiningDate(user.dateOfJoining),
      ...(left && left.slice(0, 7) === `${y}-${pad(m)}` ? { lastDay: left } : {}),
    },
  };
}

// The month the payroll run page opens on (it shows another with ?month=), and
// the one the Finance and Admin dashboards and the tax page show: the one
// `today` ("YYYY-MM-DD") falls in, the same month payslipsFor() starts from.
// It's the current month because attendance is seeded back
// to the 1st of the month it's first created in: an earlier month can have
// days from before records began, the current month never does. null for a
// bad date.
export function runMonth(today) {
  if (dayNumber(today) === null) return null;
  return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

// The month's run for everyone tracked, by name, worked out live: always a
// draft (a leaver is in it up to the month of their last working day, round
// 11Y: payrollRunFor() is null after that, and for an inactive person with no
// last working day on file),
// draft, approvedBy null, preparedBy as given (null for a preview nobody has
// prepared). A prepared or approved run is stored: see storedRun(). The person
// who prepared a run may not approve it: see canApprove().
export function payrollRun(year, month, { preparedBy = null } = {}) {
  const y = Number(year);
  const m = Number(month);
  if (!validMonth(y, m)) return null;
  const rows = getAllUsers().sort(byName)
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

// Who may approve a run (10C C7.1, round 11T): someone active whose record
// holds payroll:approve (their role's, with their overrides: round 11R; it
// can't be overridden, so in practice an active Admin), and not the person who
// prepared it. The record decides, not the session.
const approves = (user, run) => user.status !== "inactive" && user.id !== run.preparedBy && permissionsOf(user).includes("payroll:approve");

// Separation of duties: someone must approve, and not the person who prepared
// it. userId's record is looked up: an unknown id, or none, can't approve.
export function canApprove(run, userId) {
  const user = userId ? getUser(userId) : null;
  return Boolean(user) && approves(user, run);
}

// Everyone who can approve the run, by name (user records).
export function approversFor(run) {
  return getAllUsers().filter((u) => approves(u, run)).sort(byName);
}

// ---------- payslips ----------

// Day statuses that mean attendance was being recorded for the person (or will
// be, later this month). A month with none of them is from before records
// began, or before the person joined ("not-joined" isn't one), so its loss of
// pay can't be checked: it has no payslip. The pages say which (the payslip's
// attendance.joined).
const RECORDED = ["present", "late", "half-day", "absent", "not-yet"];

// Every payslip this person has, newest first: the month `today`
// ("YYYY-MM-DD") falls in, then each month before it, back to the last one in
// a row with attendance recorded. Each is payrollRunFor()'s row (with its
// period and attendance counts), or, for a month whose run is approved, their
// row in that run: the figures it fixed, with runStatus "approved" (round 11T,
// S-D1). [] for an unknown person or a bad date, or an inactive one with no
// last working day on file. A leaver's start from the month of their last
// working day (round 11Y, R8 part iii): the pages show them to whoever may see
// other people's payslips; the leaver can't sign in.
export function payslipsFor(userId, today) {
  if (dayNumber(today) === null) return [];
  const user = getUser(userId);
  const left = leavingDate(user);
  const from = left && left < today ? left : today;
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const approved = new Map(storedRuns().filter((r) => r.status === "approved").map((r) => [r.month, r]));
  const slips = [];
  for (let n = 0; n < 120; n++) {   // ten years at most
    const attendance = monthFor(userId, y, m);
    // A month away in a past period (round 12H) has no payslip; the earlier ones still count.
    const away = attendance && awayThrough(user, attendance.days[0].date, attendance.days.at(-1).date);
    if (!away && !attendance?.days.some((d) => RECORDED.includes(d.status))) break;
    const fixed = approved.get(monthKey(y, m))?.rows.find((r) => r.userId === userId);
    if (!away) slips.push(fixed ? { ...fixed, runStatus: "approved" } : payrollRunFor(userId, y, m));
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

// ---------- stored runs (round 11T) ----------

// A month's payroll run, prepared and then approved (11M's R8 part i, as
// scoped in round-11s-notes.md S9, with S-D1 to S-D12 decided). A stored run:
//   { id: "PR-1", month: "2026-10", status: "prepared" | "approved",
//     preparedBy, preparedAt, approvedBy, approvedAt,   // user ids; "YYYY-MM-DDTHH:MM", local time
//     rows,      // payrollRunFor()'s rows when it was prepared, each with
//                // the person's name and department then
//     totals,    // runTotals() of those rows
//     history: [{ byUserId, decision: "prepared" | "approved", at, note }] }
// - One per month. Preparing fixes the month's figures as they are; preparing
//   it again replaces them, and preparedBy, until it's approved.
// - Approving approves exactly the figures prepared: it's refused if the live
//   ones have moved since. An approved run never changes (S-D6).
// - A month can be prepared or approved only once it has ended and settled
//   (runProblems()), so nothing still waiting for a decision is frozen in.
// - On-hold rows are kept, as held: their pay isn't released (S-D5).
// - Stored rows are never filtered by anyone's status now: someone
//   deactivated or deleted later keeps their row and name (S-D10).
// A month nobody has prepared stays live: payrollRun() and payrollRunFor()
// are unchanged (S-D9). store.js refuses to take away a prepared run's last
// approver; it reads the runs itself, since it can't import this file.
const RUNS_KEY = "payroll-runs";
const RUNS_VERSION = 1;
const runs = createCollection({ key: RUNS_KEY, version: RUNS_VERSION, seed: () => [], idPrefix: "PR-" });

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthLabel = (year, month) => `${MONTH_NAMES[month - 1]} ${year}`;   // 2026, 10 -> "October 2026"
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// "YYYY-MM-DDTHH:MM", local time.
function nowStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// The stored runs, read without writing anything, so a page that only shows
// pay doesn't add the key (the first Prepare does). A saved copy that isn't
// intact counts as none, as the collection itself treats it.
function storedRuns() {
  const box = load(RUNS_KEY);
  return box && box.version === RUNS_VERSION && Number.isInteger(box.nextNum) && Array.isArray(box.records) ? box.records : [];
}

// A month's stored run, or null: never prepared, or not a month.
export function storedRun(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!validMonth(y, m)) return null;
  return storedRuns().find((r) => r.month === monthKey(y, m)) ?? null;
}

// Why a month can't be prepared or approved yet, as phrases ([] when it can):
// it must have ended, with nothing in it still open (S-D3). Every one that
// applies is listed, naming who where it's someone's to sort out:
//   - the month hasn't ended;
//   - it has, but a correction or leave for one of its days can still be
//     asked for (round 11V, round-11u-notes.md U1 / U-D1): both are accepted
//     up to 7 days back, so a late mark could otherwise still be corrected
//     after the month was approved. The window closes on its last day + 7,
//     so the earliest a month can be prepared is the 8th of the next one;
//   - nobody is in its run;
//   - working days from before attendance records began, or not recorded yet;
//   - absences not settled (still correctable, or with a request waiting);
//   - absences that can't be counted (no readable joining date);
//   - leave requests (not work from home) or attendance corrections dated in
//     the month that are waiting for a decision. A pending late-arrival
//     correction is one, so a late-mark penalty it may undo is never frozen.
// Someone who joined during the month doesn't stop it: the days before the
// joining date are loss of pay (round 12D), a settled figure.
export function runProblems(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!validMonth(y, m)) return ["it isn't a month"];
  const first = `${monthKey(y, m)}-01`;
  const last = isoFromDayNumber((m === 12 ? dayNumber(`${y + 1}-01-01`) : dayNumber(`${y}-${pad(m + 1)}-01`)) - 1);
  const { rows } = payrollRun(y, m);
  const names = new Map(getAllUsers().map((u) => [u.id, u.name]));
  const who = (list) => [...new Set(list.map((r) => names.get(r.userId) ?? r.userId))].sort((a, b) => a.localeCompare(b, "en")).join(", ");
  const inRun = new Set(rows.map((r) => r.userId));
  const most = (key) => Math.max(0, ...rows.map((r) => r.attendance[key]));
  const sum = (list, count) => list.reduce((n, r) => n + count(r), 0);
  const open = rows.filter((r) => r.attendance.openAbsences.length > 0);
  const uncounted = rows.filter((r) => r.attendance.uncountedAbsences > 0);
  // A leaver's request that covers only days after their last working day can't
  // change the pay (those days are "left" whatever is decided, and approved
  // unpaid leave stops at it: round 11Y), so it doesn't hold up the run (round
  // 12B; 11Y Y9.9); nor one covering only days in a period away before they were
  // reactivated (round 12H). It stays pending, to be decided like any other; one
  // that covers the last working day or earlier still holds it up.
  const people = new Map(rows.map((r) => [r.userId, getUser(r.userId)]));
  const away = (userId, from, to) => awayThrough(people.get(userId), from, to);
  const leave = allRequests().filter((r) => r.status === "pending" && r.type !== "wfh" && inRun.has(r.userId) && r.from <= last && r.to >= first && !away(r.userId, r.from, r.to));
  const corrections = allRegularizations().filter((r) => r.status === "pending" && inRun.has(r.userId) && r.date >= first && r.date <= last && !away(r.userId, r.date, r.date));
  // A salary change waiting for a decision that would be the salary in effect
  // this month if approved (round 12X): dated on or before its 1st, with no
  // record dated after it and on or before the 1st taking over. Deciding it may
  // change the figures, so it's decided first, as a pending leave request is.
  const salaryChanges = storedProposals().filter((p) => p.status === "pending" && inRun.has(p.userId) && p.effectiveFrom <= first
    && !salaryHistory(p.userId).some((s) => s.effectiveFrom > p.effectiveFrom && s.effectiveFrom <= first));
  const problems = [];
  const windowShuts = isoFromDayNumber(dayNumber(last) + Math.max(ATTENDANCE_RULES.requestWindowDays, PAST_DAY_WINDOW));
  if (todayIso() <= last) problems.push("it hasn't ended yet");
  else if (todayIso() <= windowShuts) problems.push(`its request window is still open until ${Number(windowShuts.slice(8))} ${MONTH_NAMES[Number(windowShuts.slice(5, 7)) - 1].slice(0, 3)}`);
  if (!rows.length) problems.push("nobody is in its run");
  if (most("noData")) problems.push(`${plural(most("noData"), "working day", "working days")} came before attendance records began`);
  if (most("notYet")) problems.push(`${plural(most("notYet"), "working day hasn't", "working days haven't")} been recorded yet`);
  if (open.length) problems.push(`${plural(sum(open, (r) => r.attendance.openAbsences.length), "absence isn't", "absences aren't")} settled yet (${who(open)})`);
  if (uncounted.length) problems.push(`${plural(sum(uncounted, (r) => r.attendance.uncountedAbsences), "absence", "absences")} can't be counted, with no readable joining date on file (${who(uncounted)})`);
  if (leave.length) problems.push(`${plural(leave.length, "leave request is", "leave requests are")} waiting for a decision (${who(leave)})`);
  if (corrections.length) problems.push(`${plural(corrections.length, "attendance correction is", "attendance corrections are")} waiting for a decision (${who(corrections)})`);
  if (salaryChanges.length) problems.push(`${plural(salaryChanges.length, "salary change is", "salary changes are")} waiting for a decision (${who(salaryChanges)})`);
  return problems;
}

// The acting person, if they are active and hold the permission on record
// (their role's, with their overrides), else null: store.js's actorWith().
function actorWith(userId, permission) {
  const user = userId ? getUser(userId) : null;
  return user && user.status !== "inactive" && permissionsOf(user).includes(permission) ? user : null;
}

// A run's figures, to compare: its rows as payrollRunFor() gives them, without
// the name and department a stored row keeps beside them.
const figures = (rows) => JSON.stringify(rows.map(({ name: _name, department: _department, ...row }) => row));

// Why actorUserId can't prepare the month's run, in words, or null if they can.
// It needs payroll:create on their record (Finance, Admin), a month that has
// ended and settled, a run that isn't approved, and someone else who could
// approve it: an Admin preparing while they're the only active Admin would
// leave the run stuck (S4, S-D7).
export function prepareProblem(actorUserId, year, month) {
  if (!actorWith(actorUserId, "payroll:create")) return "You can't prepare payroll runs.";
  const y = Number(year);
  const m = Number(month);
  if (!validMonth(y, m)) return "That isn't a month.";
  const label = monthLabel(y, m);
  if (storedRun(y, m)?.status === "approved") return `${label}'s run is approved, so it can't be prepared again.`;
  const problems = runProblems(y, m);
  if (problems.length) return `${label} can't be prepared yet: ${problems.join("; ")}.`;
  if (!approversFor({ preparedBy: actorUserId }).length) return `No one else could approve ${label}'s run: make someone else an Admin first.`;
  return null;
}

// Prepares the month's run: stores its figures as payrollRunFor() works them
// out now, for everyone in it, with their names and departments (S-D2).
// Preparing it again replaces them. -> { ok: true, record } or a fail() with
// prepareProblem()'s reason.
export function prepareRun(actorUserId, year, month) {
  const problem = prepareProblem(actorUserId, year, month);
  if (problem) return fail(problem);
  const y = Number(year);
  const m = Number(month);
  const people = new Map(getAllUsers().map((u) => [u.id, u]));
  const rows = payrollRun(y, m).rows.map((r) => ({ ...r, name: people.get(r.userId).name, department: people.get(r.userId).department ?? null }));
  const at = nowStamp();
  const before = storedRun(y, m);
  const fields = {
    month: monthKey(y, m), status: "prepared", preparedBy: actorUserId, preparedAt: at, approvedBy: null, approvedAt: null,
    rows, totals: runTotals({ rows }),
    history: [...(before?.history ?? []), { byUserId: actorUserId, decision: "prepared", at, note: "" }],
  };
  return before ? runs.update(before.id, fields) : runs.add(fields);
}

// Why actorUserId can't approve the month's run, in words, or null if they
// can. It needs payroll:approve on their record and not being its preparer
// (canApprove()), a prepared run, the month still ended and settled, and the
// live figures still the ones prepared: if anything has moved them since, it
// has to be prepared again, so nobody approves figures nobody prepared.
export function approveProblem(actorUserId, year, month) {
  if (!actorWith(actorUserId, "payroll:approve")) return "You can't approve payroll runs.";
  const y = Number(year);
  const m = Number(month);
  if (!validMonth(y, m)) return "That isn't a month.";
  const label = monthLabel(y, m);
  const run = storedRun(y, m);
  if (!run) return `${label}'s run hasn't been prepared yet.`;
  if (run.status === "approved") return `${label}'s run is already approved.`;
  if (!canApprove(run, actorUserId)) return "You prepared this run, so someone else has to approve it.";
  const problems = runProblems(y, m);
  if (problems.length) return `${label} can't be approved yet: ${problems.join("; ")}.`;
  if (figures(run.rows) !== figures(payrollRun(y, m).rows)) return "The figures have changed since this run was prepared: prepare it again.";
  return null;
}

// Approves the month's prepared run; nothing about it changes after this.
// -> { ok: true, record } or a fail() with approveProblem()'s reason.
export function approveRun(actorUserId, year, month) {
  const problem = approveProblem(actorUserId, year, month);
  if (problem) return fail(problem);
  const run = storedRun(year, month);
  const at = nowStamp();
  return runs.update(run.id, {
    status: "approved", approvedBy: actorUserId, approvedAt: at,
    history: [...run.history, { byUserId: actorUserId, decision: "approved", at, note: "" }],
  });
}

// ---------- writes ----------

// The checks any salary write must pass before it stores a record (round 11N,
// 10U U4b); setSalary() calls it (round 12V). A gross that isn't a whole number of rupees would break
// payroll.js's whole-rupee chain (splitGross rounds its own copy, computePay
// keeps the original): ₹92,000.50 gave earnings of ₹92,001 and a net of
// ₹87,384.50. -> { ok: true } or a fail() naming the field "gross".
export function checkSalary(fields = {}) {
  const gross = fields.gross;
  if (!Number.isSafeInteger(gross) || gross <= 0) return fail("Enter the monthly gross in whole rupees, more than ₹0.", "gross");
  return { ok: true };
}

// Adds a salary record for userId (round 12V; R9a): fields { gross,
// effectiveFrom }. The actor needs salary:edit on record and can't change their
// own salary; the gross passes checkSalary(); it takes effect on the 1st of a
// month ("YYYY-MM-01": a month uses the record in effect on its first day, and
// a revision isn't prorated), after the newest approved payroll month (store.js
// approvedMonthCovering(), as a new employee's joining date), so no approved
// month's figures change. Records are only added: a later one takes over from
// its date on (salaryFor()), and nothing stored is edited or deleted. The
// regime carries over from their newest record ("new" if none).
// salary-structure.html's Edit calls it (round 12W); an approved salary
// proposal is written through it (round 12X). -> { ok, record } or a fail()
// naming the field.
export function setSalary(actorUserId, userId, fields = {}) {
  const actor = actorWith(actorUserId, "salary:edit");
  if (!actor) return fail("You can't change salaries.");
  const person = getUser(String(userId ?? ""));
  if (!person) return fail(`No employee with id ${userId}.`);
  const problem = salaryProblem(actor, person, fields);
  if (problem) return problem;
  const regime = salaryHistory(person.id)[0]?.regime ?? "new";
  return salaries.add({ userId: person.id, gross: fields.gross, effectiveFrom: String(fields.effectiveFrom), regime });
}

// Why `fields` can't be a new salary for person, set by actor, as a fail(), or
// null: their own salary, then checkSalary(), the 1st of a month, a month after
// the newest approved one, in that order. setSalary() asks it, and so does
// proposeSalary() (round 12X), so a proposal meets the same rules when it's
// made as when it's approved.
function salaryProblem(actor, person, fields) {
  if (person.id === actor.id) return fail("You can't change your own salary.");
  const gross = checkSalary(fields);
  if (!gross.ok) return gross;
  const from = String(fields.effectiveFrom ?? "");
  if (!/^\d{4}-\d{2}-01$/.test(from) || !isValidDate(from)) return fail("A salary takes effect on the 1st of a month.", "effectiveFrom");
  const approved = approvedMonthCovering(from);
  if (approved) {
    return fail(`${monthLabel(Number(approved.slice(0, 4)), Number(approved.slice(5, 7)))}'s payroll is already approved, so a salary can take effect only after it.`, "effectiveFrom");
  }
  return null;
}

// ---------- salary changes waiting for an Admin (round 12X; R9c-1) ----------

// A salary change Finance proposes waits here until an Admin approves it (the
// Finance -> Admin chain, round-12x-scoping.md ruling (b)). Proposals are kept
// apart from the salaries, so a salary record is still only ever a change in
// effect: salaryFor(), the runs and the payslips never read a proposal, and
// approving one adds a salary record through setSalary(), as an Admin's own
// change does. A proposal: { id ("SP-n"), userId, gross, effectiveFrom,
// status: "pending" | "approved" | "rejected" | "withdrawn", enteredBy,
// enteredAt, decidedBy, decidedAt, salaryId (the record approving it added),
// history: [{ byUserId, decision, at, note }] }, decision "proposed",
// "approved", "rejected" or "withdrawn". Only the salary:view pages are meant
// to show them (R9c-2); nothing an employee sees reads them.
// store.js reads them from storage, as it reads the runs: a role change,
// deactivation or deletion that leaves a pending one with nobody to decide it
// is refused, and so is deleting the person a pending one would pay.
const PROPOSALS_KEY = "salary-proposals";
const PROPOSALS_VERSION = 1;
const proposals = createCollection({ key: PROPOSALS_KEY, version: PROPOSALS_VERSION, seed: () => [], idPrefix: "SP-" });

// The stored proposals, read without writing anything (as storedRuns()).
function storedProposals() {
  const box = load(PROPOSALS_KEY);
  return box && box.version === PROPOSALS_VERSION && Number.isInteger(box.nextNum) && Array.isArray(box.records) ? box.records : [];
}

// Every proposal, newest first; one person's if userId is given.
export function salaryProposals(userId) {
  return storedProposals().filter((p) => !userId || p.userId === userId)
    .sort((a, b) => b.enteredAt.localeCompare(a.enteredAt) || b.id.localeCompare(a.id, "en", { numeric: true }));
}

// The person's proposal waiting for a decision, or null: there's at most one.
export function pendingSalaryProposal(userId) {
  return storedProposals().find((p) => p.userId === userId && p.status === "pending") ?? null;
}

// Who may decide a proposal: someone active whose record holds payroll:approve
// (an Admin: it can't be overridden), neither who proposed it nor the person
// it would pay. The record decides, not the session. store.js restates this in
// strandedProblem(); if it changes, that copy must change with it.
const decidesProposal = (user, proposal) => user.status !== "inactive" && user.id !== proposal.enteredBy && user.id !== proposal.userId
  && permissionsOf(user).includes("payroll:approve");

// Everyone who could decide the proposal, by name (user records).
export function proposalDecidersFor(proposal) {
  return getAllUsers().filter((u) => decidesProposal(u, proposal)).sort(byName);
}

// Proposes a new salary for userId: fields { gross, effectiveFrom }, checked as
// setSalary() checks them (salary:edit; someone else's salary; a whole-rupee
// gross; the 1st of a month after the newest approved one), and one waiting
// proposal per person: another is refused until it's decided or withdrawn.
// An Admin's own change takes effect at once (theirs is the chain's last
// stage, as with an Admin's own expense claim): it's written through
// setSalary() and kept as an approved proposal. Anyone else's waits, pending,
// for an Admin who didn't propose it and isn't the person it would pay; if
// nobody could decide it (a change to the only Admin's salary), it's refused,
// as preparing a run nobody else could approve is.
// -> { ok, record (the proposal) } or a fail() naming the field.
export function proposeSalary(actorUserId, userId, fields = {}) {
  const actor = actorWith(actorUserId, "salary:edit");
  if (!actor) return fail("You can't change salaries.");
  const person = getUser(String(userId ?? ""));
  if (!person) return fail(`No employee with id ${userId}.`);
  const problem = salaryProblem(actor, person, fields);
  if (problem) return problem;
  const waiting = pendingSalaryProposal(person.id);
  if (waiting) return fail(`${person.name} already has a salary change waiting for a decision (${waiting.id}).`);
  const at = nowStamp();
  const proposal = {
    userId: person.id, gross: fields.gross, effectiveFrom: String(fields.effectiveFrom), status: "pending",
    enteredBy: actor.id, enteredAt: at, decidedBy: null, decidedAt: null, salaryId: null,
    history: [{ byUserId: actor.id, decision: "proposed", at, note: "" }],
  };
  if (permissionsOf(actor).includes("payroll:approve")) {
    const saved = setSalary(actor.id, person.id, fields);
    if (!saved.ok) return saved;
    return proposals.add({ ...proposal, status: "approved", decidedBy: actor.id, decidedAt: at, salaryId: saved.record.id,
      history: [...proposal.history, { byUserId: actor.id, decision: "approved", at, note: "" }] });
  }
  if (!getAllUsers().some((u) => decidesProposal(u, proposal))) {
    return fail(`No one else could approve a change to ${person.name}'s salary: make someone else an Admin first.`);
  }
  return proposals.add(proposal);
}

// Approves or rejects a waiting proposal: decision "approve" | "reject"; a
// rejection needs a note. The actor needs payroll:approve on record and can't
// be who proposed it or the person it would pay. Approving writes it through
// setSalary() as the actor, so every rule a salary change meets is checked
// again now (a month approved since it was proposed is refused in setSalary()'s
// words), and the proposal stays pending if it's refused: reject or withdraw
// it then. -> { ok, record (the proposal) } or a fail().
export function decideSalaryProposal(actorUserId, proposalId, decision, note = "") {
  const actor = actorWith(actorUserId, "payroll:approve");
  if (!actor) return fail("You can't decide salary changes.");
  const proposal = storedProposals().find((p) => p.id === proposalId);
  if (!proposal) return fail(`No salary change ${proposalId}.`);
  if (proposal.status !== "pending") return fail(`This salary change is already ${proposal.status}.`);
  if (actor.id === proposal.enteredBy) return fail("You proposed this salary change, so someone else has to decide it.");
  if (actor.id === proposal.userId) return fail("You can't decide a change to your own salary.");
  if (decision !== "approve" && decision !== "reject") return fail('Decision must be "approve" or "reject".');
  const text = String(note ?? "").trim();
  if (decision === "reject" && !text) return fail("Add a note saying why the salary change is rejected.", "note");
  const at = nowStamp();
  if (decision === "reject") {
    return proposals.update(proposal.id, { status: "rejected", decidedBy: actor.id, decidedAt: at,
      history: [...proposal.history, { byUserId: actor.id, decision: "rejected", at, note: text }] });
  }
  const saved = setSalary(actor.id, proposal.userId, { gross: proposal.gross, effectiveFrom: proposal.effectiveFrom });
  if (!saved.ok) return saved;
  return proposals.update(proposal.id, { status: "approved", decidedBy: actor.id, decidedAt: at, salaryId: saved.record.id,
    history: [...proposal.history, { byUserId: actor.id, decision: "approved", at, note: text }] });
}

// Withdraws a waiting proposal: only who proposed it, only while it's pending.
// -> { ok, record (the proposal) } or a fail().
export function withdrawSalaryProposal(actorUserId, proposalId) {
  const proposal = storedProposals().find((p) => p.id === proposalId);
  if (!proposal) return fail(`No salary change ${proposalId}.`);
  if (proposal.enteredBy !== actorUserId) return fail("Only the person who proposed this salary change can withdraw it.");
  if (proposal.status !== "pending") return fail(`This salary change is already ${proposal.status}, so it can't be withdrawn.`);
  const at = nowStamp();
  return proposals.update(proposal.id, { status: "withdrawn", history: [...proposal.history, { byUserId: actorUserId, decision: "withdrawn", at, note: "" }] });
}

// ---------- reset ----------

// Salaries, payroll runs (round 11T) and salary proposals (round 12X).
export function resetPayrollData() {
  salaries.reset();
  runs.reset();
  proposals.reset();
}