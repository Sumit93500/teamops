// data/import-attendance.js (I2, 2026-11-28): the attendance corrections import form, for import:attendance-corrections (HR, the Admin).
// One row per correction to someone else's past day, recorded as approved by the importer through data/attendance-store.js
// importCorrection: the same checks a person's own correction request meets, in HR's words, then the same write as an approved one.
//   Columns  Employee (employee ID, employee code or work email; not yourself), Date (not in the future, not before they joined, not in
//            an approved payroll month), What to correct (Late arrival, Missed check-in, Missed check-out), Correct time (HH:MM, 24-hour;
//            "9:40" and "6:30 PM" are read too), Reason (3 to 200 characters).
//   The day  from the shift rules' start date (data/shift-settings.js) the person's shift decides it (data/shift-days.js): its weekly off,
//            whether they were late (the late-mark policy then counts the corrected day as it counts any other), and when check-in
//            closes; before it, the old rules do. A visit day is the visit's: its own check-in and check-out count, so it is refused here.
//            A holiday, weekend, weekly off or leave day with no check-in needs no attendance; a day with sample times isn't a record.
//   Refused  your own attendance, the same person and day twice in the file, a day with a correction already waiting.
//   Mode     good rows; the history keeps a generic file name.
import { getAllUsers, approvedMonthCovering } from "./store.js";
import { correctionProblem, importCorrection, ISSUES } from "./attendance-store.js";
import { shiftDayFor } from "./shift-days.js";
import { shiftRulesApply } from "./shift-settings.js";
import { visitOnDate } from "./visits-store.js";
import { readDate, displayDate, lower, ok, bad, plain, officeToday, peopleIndex } from "./import-common.js";
import { ISSUE_LABEL } from "../ui/attendance-view.js";

// the three corrections' words are ui/attendance-view.js's, the one place they are written (issues.mjs C1, C2)
const ISSUE_WORDS = `${ISSUE_LABEL["late-arrival"]}, ${ISSUE_LABEL["missed-check-in"]} or ${ISSUE_LABEL["missed-check-out"]}`;
// a store's sentence after "Row 5, Date: " starts in lower case, as every other problem does (a name like "Rohan Gupta" stays)
const lowerFirst = (t) => (/^[A-Z][a-z']*\s/.test(t) && !/^[A-Z][a-z]+ [A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t);
const FIELD_COLUMN = { date: "Date", issue: "What to correct", time: "Correct time", reason: "Reason" };

// "09:40", "9:40", "6:30 PM", "18:30" -> "HH:MM" (24-hour) or null
export function readTime(text) {
  const s = String(text ?? "").trim().toLowerCase().replace(/\./g, ":");
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/.exec(s);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (m[3]) { if (h < 1 || h > 12) return null; h = (h % 12) + (m[3] === "pm" ? 12 : 0); }
  return h <= 23 && min <= 59 ? `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}` : null;
}

function context(actor, now = Date.now()) {
  return { actor, today: officeToday(now), people: peopleIndex(getAllUsers()), now };
}

const COLUMNS = [
  { key: "employee", header: "Employee", required: true, help: "Their employee ID, employee code or work email.",
    validate: (v, ctx) => {
      const u = ctx.people.get(lower(v));
      if (!u) return bad("no employee has this ID, code or work email", "unknown employee");
      if (u.id === ctx.actor.id) return bad("your own attendance can't be corrected by you: someone else in HR does it", "own attendance");
      if (u.status === "inactive") return bad(`${u.name} is inactive`, "inactive");
      return ok(u.id);
    } },
  { key: "date", header: "Date", required: true, help: "The day to correct, like 2026-11-20; not in the future.",
    validate: (v, ctx) => {
      const d = readDate(v);
      if (!d) return bad("not a date: write it like 2026-11-20", "not a date");
      if (d > ctx.today) return bad("can't be in the future", "in the future");
      if (approvedMonthCovering(d)) return bad("in a payroll month that is already approved: its pay can't change", "approved month");
      return ok(d);
    } },
  { key: "issue", header: "What to correct", required: true, help: `${ISSUE_WORDS}.`,
    validate: (v) => { const k = ISSUES.find((x) => lower(x) === lower(v) || lower(ISSUE_LABEL[x]) === lower(v)); return k ? ok(k) : bad(`use ${ISSUE_WORDS}`, "unknown issue"); } },
  { key: "time", header: "Correct time", required: true, help: "24-hour, like 09:40 (a check-out next morning on a night shift too).",
    validate: (v) => { const t = readTime(v); return t ? ok(t) : bad("not a time: write it like 09:40 or 18:30", "not a time"); } },
  { key: "reason", header: "Reason", required: true, help: "3 to 200 characters.",
    validate: (v) => (v.length < 3 || v.length > 200 ? bad("use 3 to 200 characters", "length") : /[<>]/.test(v) ? bad("can't contain < or >", "characters") : ok(v)) },
];

const shiftDayOf = (userId, date, ctx) => (shiftRulesApply(date) ? shiftDayFor(userId, date) : null);

function checkRow(v, ctx, actor) {
  const person = getAllUsers().find((u) => u.id === v.employee);
  if (visitOnDate(v.employee, v.date)) return { column: "Date", message: `${person.name} was on a visit that day: the visit's own check-in and check-out count`, reason: "visit day" };
  const p = correctionProblem(actor.id, v.employee, { date: v.date, issue: v.issue, time: v.time, reason: v.reason }, { shiftDay: shiftDayOf(v.employee, v.date, ctx) });
  return p ? { column: FIELD_COLUMN[p.field] ?? "Date", message: lowerFirst(plain(p.error).replace(/\.$/, "")), reason: p.field ? `refused: ${p.field}` : "refused" } : null;
}

function applyRow(actor, v, ctx) {
  const r = importCorrection(actor.id, v.employee, { date: v.date, issue: v.issue, time: v.time, reason: v.reason }, { shiftDay: shiftDayOf(v.employee, v.date, ctx) });
  if (!r.ok) return { ok: false, error: plain(r.error) };
  const person = getAllUsers().find((u) => u.id === v.employee);
  return { ok: true, record: { id: r.record.id, name: person.name, personId: person.id, date: displayDate(v.date), issue: ISSUE_LABEL[v.issue], time: v.time } };
}

function example(ctx) {
  const someone = [...new Set(ctx.people.values())].find((u) => u.status === "active" && u.id !== ctx.actor.id && u.role === "emp");
  return { employee: someone?.email ?? "", date: ctx.today, issue: ISSUE_LABEL["missed-check-out"], time: "18:35", reason: "Forgot to check out; left with the team at 6:35 PM" };
}

function notes(ctx, actor, cols) {
  return [
    "Delete the EXAMPLE row and these notes, or leave them: they are never imported.",
    `Required: ${cols.map((c) => c.header).join(", ")}.`,
    "Employee: their employee ID, employee code or work email. Your own attendance is corrected by someone else.",
    `What to correct: ${ISSUE_LABEL["late-arrival"]} (an earlier check-in), ${ISSUE_LABEL["missed-check-in"]}, ${ISSUE_LABEL["missed-check-out"]} (after the check-in).`,
    "Date: YYYY-MM-DD, like 2026-11-20; not in the future and not in an approved payroll month. Correct time: 24-hour HH:MM.",
    "Each correction is recorded as approved by you. Lateness, half days and late marks then follow the day's rules (the person's shift from the shift rules' start).",
    "Not for a visit day, a holiday, weekend, weekly off or leave day, a day with a correction waiting, or a day with sample times.",
    "At most 1,000 rows and 2 MB per file. Save as CSV UTF-8 or .xlsx.",
  ];
}

export const ATTENDANCE_CORRECTIONS_FORM = Object.freeze({
  id: "attendance-corrections", label: "Attendance corrections", permission: "import:attendance-corrections", mode: "good-rows", maxRows: 1000, genericName: true,
  columns: COLUMNS,
  unique: [{ id: "person-day", key: "employee", value: (v) => (v.employee && v.date ? `${v.employee}|${v.date}` : null), existing: () => new Map() }],
  maySensitive: () => false, context, checkRow, applyRow, example, notes,
});