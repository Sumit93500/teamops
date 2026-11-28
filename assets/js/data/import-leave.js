// data/import-leave.js (I2, 2026-11-28): the leave balances import form, for import:leave-balances (HR, the Admin). One row per person and
// leave type: the days they had left on a date, as the old records say. Saved as data/leave-openings.js rows: the balance on that date
// becomes the file's, and the year counts on from it by the leave policy (data/leave-policy.js). Nothing else is written: no leave
// request, no pay record.
//   Columns  Employee (their employee ID, employee code or work email: an active employee, joined by the date and not left),
//            Leave type (casual, sick or earned; one the person's band has: an intern has no sick or earned leave), Days left (whole or
//            half days, 0 to 365), As of (this calendar year, not in the future, and after the newest approved payroll month, so no
//            approved month's pay can change).
//   Refused  your own balance (someone else imports it), a person and type already imported for that year, or twice in the file.
//   Mode     good rows; the history keeps a generic file name.
import { getAllUsers, approvedMonthCovering } from "./store.js";
import { employmentState } from "./employment-period.js";
import { leaveAccount, tenureBand, bandPolicy } from "./leave-policy.js";
import { leaveFrom } from "./pay-settings.js";
import { openingKeys, addOpening, OPENING_TYPES } from "./leave-openings.js";
import { readDate, displayDate, lower, ok, bad, readDays, officeToday, peopleIndex } from "./import-common.js";

export const TYPE_LABEL = { casual: "Casual leave", sick: "Sick leave", earned: "Earned leave" };

function context(actor, now = Date.now()) {
  const users = getAllUsers();
  const keys = openingKeys();
  const today = officeToday(now);
  return { actor, today, year: today.slice(0, 4), people: peopleIndex(users), done: new Map([...keys].map((k) => [k.toLowerCase(), true])), policyFrom: leaveFrom() };
}

const COLUMNS = [
  { key: "employee", header: "Employee", required: true, help: "Their employee ID, employee code or work email.",
    validate: (v, ctx) => {
      const u = ctx.people.get(lower(v));
      if (!u) return bad("no employee has this ID, code or work email", "unknown employee");
      if (u.id === ctx.actor.id) return bad("your own balance can't be imported by you: someone else in HR imports it", "own balance");
      if (u.status === "inactive") return bad(`${u.name} is inactive`, "inactive");
      return ok(u.id);
    } },
  { key: "type", header: "Leave type", required: true, help: "Casual, Sick or Earned.",
    validate: (v) => { const t = OPENING_TYPES.find((k) => lower(k) === lower(v) || lower(TYPE_LABEL[k]) === lower(v)); return t ? ok(t) : bad("use Casual, Sick or Earned (work from home and unpaid leave have no balance)", "unknown type"); } },
  { key: "days", header: "Days left", required: true, help: "Whole or half days, like 7.5.",
    validate: (v) => { const d = readDays(v); return d === null ? bad("whole or half days from 0 to 365, like 7.5", "not days") : ok(d); } },
  { key: "asOf", header: "As of", required: true, help: "The day the balance is from, this year; not in the future.",
    validate: (v, ctx) => {
      const d = readDate(v);
      if (!d) return bad("not a date: write it like 2026-11-15", "not a date");
      if (d > ctx.today) return bad("can't be in the future", "in the future");
      if (d.slice(0, 4) !== ctx.year) return bad(`must be in ${ctx.year}: balances are imported for the current leave year`, "another year");
      if (approvedMonthCovering(d)) return bad("in a payroll month that is already approved: use a later date", "approved month");
      return ok(d);
    } },
];

function checkRow(v, ctx) {
  const person = getAllUsers().find((u) => u.id === v.employee);
  const state = employmentState(person, v.asOf);
  if (state === "before") return { column: "As of", message: `before ${person.name} joined`, reason: "before joining" };
  if (state === "after") return { column: "As of", message: `after ${person.name} left`, reason: "after leaving" };
  const band = tenureBand(person.id, v.asOf);
  if (!band || !leaveAccount(person.id, v.asOf)) return { column: "Employee", message: `${person.name} has no joining date on file, so no leave balance can be worked out`, reason: "no balance" };
  if (bandPolicy(band)[v.type].accrual === "none") return { column: "Leave type", message: `${person.name} gets no ${TYPE_LABEL[v.type].toLowerCase()} (${band === "intern" ? "interns don't" : "their band doesn't"})`, reason: "not in the band" };
  return null;
}

// One good row: the adjustment that makes the balance on the date the file's (worked out now, inside the import's transaction).
function applyRow(actor, v, ctx, now) {
  const a = leaveAccount(v.employee, v.asOf)?.types?.[v.type];
  if (!a || a.usable === null) return { ok: false, error: "no balance can be worked out for this person" };
  const adjust = Math.round((v.days - (a.usable - a.taken)) * 2) / 2;
  const r = addOpening({ userId: v.employee, type: v.type, asOf: v.asOf, balance: v.days, adjust, byId: actor.id }, now);
  if (!r.ok) return r;
  const person = getAllUsers().find((u) => u.id === v.employee);
  return { ok: true, record: { id: r.record.id, name: person.name, personId: person.id, type: TYPE_LABEL[v.type], days: v.days, asOf: displayDate(v.asOf) } };
}

function example(ctx) {
  const someone = [...new Set(ctx.people.values())].find((u) => u.status === "active" && u.id !== ctx.actor.id && u.role === "emp");
  return { employee: someone?.email ?? "", type: "Earned", days: "7.5", asOf: ctx.today };
}

function notes(ctx, actor, cols) {
  return [
    "Delete the EXAMPLE row and these notes, or leave them: they are never imported.",
    `Required: ${cols.filter((c) => c.required).map((c) => c.header).join(", ")}.`,
    "Employee: their employee ID, employee code or work email. Your own balance is imported by someone else.",
    "Leave types: Casual, Sick, Earned. Work from home and unpaid leave have no balance to import. Interns have no sick or earned leave.",
    `Days left: whole or half days on the As of date. As of: a day in ${ctx.year}, YYYY-MM-DD, not in the future and after the newest approved payroll month.`,
    "Each person and type is imported once a year; from the As of date the balance counts on by the leave policy.",
    ...(ctx.today < ctx.policyFrom ? [`The app shows these balances from the leave policy's start, ${displayDate(ctx.policyFrom)}.`] : []),
    "At most 1,000 rows and 2 MB per file. Save as CSV UTF-8 or .xlsx.",
  ];
}

export const LEAVE_BALANCES_FORM = Object.freeze({
  id: "leave-balances", label: "Leave balances", permission: "import:leave-balances", mode: "good-rows", maxRows: 1000, genericName: true,
  columns: COLUMNS,
  unique: [{ id: "person-type", key: "employee", value: (v) => (v.employee && v.type && v.asOf ? `${v.employee}|${v.type}|${v.asOf.slice(0, 4)}` : null),
    existing: (ctx) => ctx.done, onRecord: () => "this person's balance of this leave type is already imported for this year" }],
  maySensitive: () => false, context, checkRow, applyRow, example, notes,
});