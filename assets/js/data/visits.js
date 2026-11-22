// data/visits.js (CV1, 2026-11-16): client / official / off-site visits: asking for one, assigning one, deciding, cancelling, and punching in and out
// on a visit day. Additive: nothing older imports it except through data/visits-store.js (read by data/shift-days.js, which gives a visit day its
// "On-site" reading: data/visit-days.js).
//
// Who may do what (permissions in config/permissions.js: visits:request, visits:approve, visits:assign, visits:view-all):
//   request   everyone, for themselves; it waits for their manager (HR or an Admin for someone with no manager now, as overtime does).
//             A same-day visit ("start now") begins at once and its approval follows: rejected, the day goes back to the ordinary rules.
//   assign    a manager for their direct reports, HR and Admin for anyone (never for themselves); an assigned visit starts approved.
//   decide    the person's manager, else HR / Admin (attendance:view-all); never the person themselves; a rejection needs a reason.
//   cancel    before anything is punched: the person for a visit they asked for; the assigner, the person's manager, HR / Admin for any.
// Validation: kind, site (2-80 characters) and purpose (5-300) required; dates real, end not before start, at most 31 days, not in the past, from
// the person's joining date (data/employment-period.js; a leaver is inactive, and an inactive person has no visits), no overlap with approved
// leave or another visit; a weekly off or holiday inside the range is left out unless the assigner allows it (a single such day is refused).
// Punching: location is required for the check-in and the check-out (no 150 m office rule: any place). A reading worse than 200 m is
// refused; one over 100 m is accepted and flagged. Where the browser gives no location the person may say "location unavailable" with a reason: the
// punch is kept but doesn't count until the approver gives an explicit OK with a note.
//
//   requestVisit(personId, fields, now?)        assignVisit(assignerId, personIds, fields, now?)
//   decideVisit(deciderId, visitId, decision, note, now?)   cancelVisit(actorId, visitId, note?, now?)
//   completeVisitDay(actorId, visitId, date, { outTime, outcome, reason }, now?)   rejectVisitLocation(deciderId, visitId, date, side, note, now?)
//   visitDaysNoCheckIn(viewerId, now?)   (CV1c: the approved visit days that ended with no check-in and wait for HR / an Admin to complete them)
//   visitCheckIn(personId, reading, opts?, now?)   visitCheckOut(personId, reading, opts?, now?)   okVisitLocation(deciderId, visitId, date, side, note, now?)
//   mayDecideVisit(deciderId, personId)   mayAssignFor(assignerId, personId)   mayCancelVisit(actorId, visit)   mayViewVisit(viewerId, visit)
//   pendingVisitItems(deciderId)   visitsVisibleTo(viewerId)   onSiteToday(viewerId, now?)   phaseOf(visit, today)   mapsUrl(punch)   visitTrail(visit)

import { getUser, getAllUsers } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { managerOf, directReportsOf } from "./reporting.js";
import { employmentPeriod } from "./employment-period.js";
import { allRequests } from "./leave-store.js";
import { shiftDayFor } from "./shift-days.js";
import { storedRecord } from "./attendance-store.js";
import { officeNow, addDays, dayNo, toMin, hhmm } from "./shift-engine.js";
import { logEvent } from "./audit-trail.js";
import { readBox, writeBox, allVisits, getVisit, VISIT_KINDS, LIVE, COUNTING } from "./visits-store.js";

export const MAX_DAYS = 31;
export const ACCURACY_REFUSE_M = 200;   // a reading worse than this is refused
export const ACCURACY_FLAG_M = 100;     // worse than this (and not refused) is flagged on the record
export const SITE_MIN = 2, SITE_MAX = 80, PURPOSE_MIN = 5, PURPOSE_MAX = 300, ADDRESS_MAX = 200, NOTE_MIN = 3, NOTE_MAX = 200;

const copy = (v) => JSON.parse(JSON.stringify(v));
const fail = (error, field, code) => ({ ok: false, error, ...(field ? { field } : {}), ...(code ? { code } : {}) });
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";
const active = (id) => { const u = id ? getUser(id) : null; return u && u.status !== "inactive" ? u : null; };
const stamp = () => new Date().toISOString();

// ---------- who ----------

export function mayDecideVisit(deciderId, personId) {
  const d = active(deciderId);
  if (!d || d.id === personId || !hasPermission(d, "visits:approve")) return false;
  const mgr = managerOf(personId);
  return mgr ? mgr === d.id : hasPermission(d, "attendance:view-all");
}
export function mayAssignFor(assignerId, personId) {
  const a = active(assignerId);
  if (!a || a.id === personId || !hasPermission(a, "visits:assign") || !active(personId)) return false;
  return managerOf(personId) === a.id || hasPermission(a, "attendance:view-all");
}
export function mayCancelVisit(actorId, visit) {
  const a = active(actorId);
  if (!a || !visit) return false;
  if (visit.source === "self" && visit.personId === a.id) return true;
  if (visit.assignedBy === a.id) return true;
  return mayAssignFor(a.id, visit.personId) || mayDecideVisit(a.id, visit.personId);
}
export function mayViewVisit(viewerId, visit) {
  const v = active(viewerId);
  if (!v || !visit) return false;
  return visit.personId === v.id || hasPermission(v, "visits:view-all") || managerOf(visit.personId) === v.id;
}
export function visitsVisibleTo(viewerId) {
  return allVisits().filter((x) => mayViewVisit(viewerId, x)).sort((a, b) => b.fromDate.localeCompare(a.fromDate) || b.id.localeCompare(a.id, undefined, { numeric: true }));
}

// ---------- validation ----------

const text = (v) => String(v ?? "").trim();
// -> { ok, fields, dates } | a failure. `assigner`: the assigner may allow weekly offs and holidays.
function validate(personId, f, today, assigner) {
  const person = active(personId);
  if (!person) return fail(`${getUser(personId)?.name ?? personId} is inactive.`, "person");
  const kind = text(f.kind);
  if (!VISIT_KINDS.includes(kind)) return fail("Choose the kind of visit.", "kind");
  const siteName = text(f.siteName), purpose = text(f.purpose), address = text(f.address);
  if (siteName.length < SITE_MIN) return fail(`Give the client or place name (at least ${SITE_MIN} characters).`, "siteName");
  if (siteName.length > SITE_MAX) return fail(`The name can be ${SITE_MAX} characters at most.`, "siteName");
  if (purpose.length < PURPOSE_MIN) return fail(`Say what the visit is for (at least ${PURPOSE_MIN} characters).`, "purpose");
  if (purpose.length > PURPOSE_MAX) return fail(`The purpose can be ${PURPOSE_MAX} characters at most.`, "purpose");
  if (address.length > ADDRESS_MAX) return fail(`The address can be ${ADDRESS_MAX} characters at most.`, "address");
  const fromDate = text(f.fromDate), toDate = text(f.toDate || f.fromDate);
  if (dayNo(fromDate) === null) return fail("Pick the first day.", "fromDate");
  if (dayNo(toDate) === null) return fail("Pick the last day.", "toDate");
  if (toDate < fromDate) return fail("The last day can't be before the first day.", "toDate");
  if (dayNo(toDate) - dayNo(fromDate) + 1 > MAX_DAYS) return fail(`A visit can be ${MAX_DAYS} days at most. Split a longer one.`, "toDate");
  if (fromDate < today) return fail("A visit can't start in the past.", "fromDate");
  const period = employmentPeriod(person);
  if (period.from && fromDate < period.from) return fail(`${person.name} joins on ${period.from}; a visit can't start before that.`, "fromDate");
  const clash = allRequests().find((r) => r.userId === personId && r.status === "approved" && r.type !== "wfh" && r.from <= toDate && r.to >= fromDate);
  if (clash) return fail(`${person.name} is on approved leave from ${clash.from} to ${clash.to}, which overlaps these days.`, "fromDate", "leave");
  const allowOff = Boolean(assigner && f.allowOffDay);
  const dates = [];
  for (let d = fromDate; d <= toDate; d = addDays(d, 1)) {
    const day = shiftDayFor(personId, d);
    const off = day && (day.status === "holiday" || day.status === "weekly-off" || day.status === "weekend");
    if (!off || allowOff) dates.push(d);
  }
  if (!dates.length) return fail(fromDate === toDate ? "That day is a weekly off or a holiday." : "Every day in that range is a weekly off or a holiday.", "fromDate", "off-day");
  const other = readBox().visits.find((v) => v.personId === personId && LIVE.includes(v.status) && v.dates.some((d) => dates.includes(d)));
  if (other) return fail(`${person.name} already has a visit (${other.id}, ${other.siteName}) on ${other.dates.find((d) => dates.includes(d))}.`, "fromDate", "overlap");
  return { ok: true, fields: { kind, siteName, address, purpose, fromDate, toDate }, dates, allowOff };
}

function build(box, v, base) {
  const row = { id: `VS-${box.seq}`, personId: v.personId, kind: base.fields.kind, siteName: base.fields.siteName, address: base.fields.address, purpose: base.fields.purpose,
    fromDate: base.fields.fromDate, toDate: base.fields.toDate, dates: base.dates, allowOffDay: base.allowOff, source: v.source, assignedBy: v.assignedBy ?? null,
    sameDay: Boolean(v.sameDay), approvalPending: Boolean(v.approvalPending), managerId: managerOf(v.personId), status: v.status,
    approvedBy: v.approvedBy ?? null, approvedAt: v.approvedAt ?? null, decisionReason: "", createdAt: stamp(), days: {}, history: [] };
  box.seq += 1;
  return row;
}
const note = (row, by, action, text = "") => row.history.push({ at: stamp(), by, action, note: text });

// ---------- ask, assign ----------

export function requestVisit(personId, fields = {}, now = officeNow()) {
  const person = active(personId);
  if (!person) return fail("Your account isn't active.");
  if (!hasPermission(person, "visits:request")) return fail("You can't ask for visits.");
  const sameDay = Boolean(fields.sameDay);
  const f = sameDay ? { ...fields, fromDate: now.date } : fields;
  const base = validate(personId, f, now.date, false);
  if (!base.ok) return base;
  if (sameDay && base.fields.fromDate !== now.date) return fail("A same-day visit starts today.", "fromDate");
  const box = readBox();
  const row = build(box, { personId, source: "self", sameDay, approvalPending: sameDay, status: sameDay ? "in-progress" : "pending" }, base);
  note(row, personId, sameDay ? "started-same-day" : "requested");
  box.visits.push(row);
  if (!writeBox(box)) return fail(SAVE_FAILED);
  logEvent({ actorId: personId, userId: personId, kind: "visit-requested", detail: `${row.id}: ${row.siteName}, ${row.fromDate}${row.toDate !== row.fromDate ? ` to ${row.toDate}` : ""}${sameDay ? " (same day)" : ""}` });
  return { ok: true, record: copy(row) };
}

// personIds: one or more people. All or nothing: if any is refused, nothing is saved and `errors` names each.
export function assignVisit(assignerId, personIds, fields = {}, now = officeNow()) {
  const assigner = active(assignerId);
  if (!assigner || !hasPermission(assigner, "visits:assign")) return fail("You can't assign visits.");
  const ids = [...new Set(Array.isArray(personIds) ? personIds : [personIds])].filter(Boolean);
  if (!ids.length) return fail("Choose who the visit is for.", "people");
  const plans = [], errors = [];
  for (const id of ids) {
    if (id === assigner.id) { errors.push({ personId: id, error: "You can't assign a visit to yourself: ask for one." }); continue; }
    if (!mayAssignFor(assigner.id, id)) { errors.push({ personId: id, error: `${getUser(id)?.name ?? id} isn't one of your direct reports.` }); continue; }
    const base = validate(id, fields, now.date, true);
    if (!base.ok) errors.push({ personId: id, error: base.error, field: base.field }); else plans.push({ id, base });
  }
  if (errors.length) return { ok: false, error: errors[0].error, field: errors[0].field, errors };
  const box = readBox(), rows = [];
  for (const p of plans) {
    const row = build(box, { personId: p.id, source: "assigned", assignedBy: assigner.id, status: "approved", approvedBy: assigner.id, approvedAt: stamp() }, p.base);
    note(row, assigner.id, "assigned");
    box.visits.push(row);
    rows.push(row);
  }
  if (!writeBox(box)) return fail(SAVE_FAILED);
  for (const row of rows) logEvent({ actorId: assigner.id, userId: row.personId, kind: "visit-assigned", detail: `${row.id}: ${row.siteName}, ${row.fromDate}${row.toDate !== row.fromDate ? ` to ${row.toDate}` : ""}` });
  return { ok: true, records: copy(rows) };
}

// ---------- decide, cancel ----------

export function decideVisit(deciderId, visitId, decision, noteText = "", now = officeNow()) {
  if (decision !== "approved" && decision !== "rejected") return fail("Approve or reject.");
  const box = readBox();
  const row = box.visits.find((v) => v.id === visitId);
  if (!row) return fail("That visit doesn't exist.");
  if (deciderId === row.personId) return fail("You can't decide your own visit.");
  if (!mayDecideVisit(deciderId, row.personId)) return fail("You can't decide this visit.");
  const waiting = row.status === "pending" || (row.status === "in-progress" && row.approvalPending);
  if (!waiting) return fail(`This visit is already ${row.status}.`);
  const why = text(noteText);
  if (decision === "rejected" && (why.length < NOTE_MIN || why.length > NOTE_MAX)) return fail(`Give a reason of ${NOTE_MIN} to ${NOTE_MAX} characters.`, "note");
  row.approvedBy = deciderId; row.approvedAt = stamp(); row.decisionReason = why.slice(0, NOTE_MAX);
  row.approvalPending = false;
  row.status = decision === "rejected" ? "rejected" : row.status === "pending" ? "approved" : row.status;
  note(row, deciderId, decision, why);
  if (!writeBox(box)) return fail(SAVE_FAILED);
  logEvent({ actorId: deciderId, userId: row.personId, kind: decision === "approved" ? "visit-approved" : "visit-rejected", detail: `${row.id}: ${row.siteName}${why ? ` (${why})` : ""}` });
  return { ok: true, record: copy(row) };
}

const punched = (row) => Object.values(row.days).some((d) => d.in || d.out || d.decision);   // CV1c: a day HR completed counts as started
export function cancelVisit(actorId, visitId, noteText = "", now = officeNow()) {
  const box = readBox();
  const row = box.visits.find((v) => v.id === visitId);
  if (!row) return fail("That visit doesn't exist.");
  if (!mayCancelVisit(actorId, row)) return fail("You can't cancel this visit.");
  if (row.status !== "pending" && row.status !== "approved") return fail(`This visit is ${row.status}, so it can't be cancelled.`);
  if (punched(row)) return fail("This visit has started, so it can't be cancelled.");
  row.status = "cancelled"; row.approvalPending = false;
  note(row, actorId, "cancelled", text(noteText).slice(0, NOTE_MAX));
  if (!writeBox(box)) return fail(SAVE_FAILED);
  logEvent({ actorId, userId: row.personId, kind: "visit-cancelled", detail: `${row.id}: ${row.siteName}` });
  return { ok: true, record: copy(row) };
}

// ---------- punching ----------

// The visit this person is on today (counting statuses), with its day record, or null.
function todayVisit(box, personId, date) {
  return box.visits.find((v) => v.personId === personId && v.dates.includes(date) && COUNTING.includes(v.status)) ?? null;
}
// -> a punch, or a refusal. reading: { lat, lng, accuracyM }; opts: { unavailable, reason }
function readingPunch(reading, opts, time) {
  if (opts?.unavailable) {
    const reason = text(opts.reason);
    if (reason.length < NOTE_MIN || reason.length > NOTE_MAX) return fail(`Say why your location isn't available (${NOTE_MIN} to ${NOTE_MAX} characters).`, "reason", "reason");
    return { ok: true, punch: { time, lat: null, lng: null, accuracy: null, source: "unavailable", lowAccuracy: false, reason, needsOk: true, okBy: null, okAt: null, okNote: "" } };
  }
  const lat = Number(reading?.lat), lng = Number(reading?.lng), acc = Number(reading?.accuracyM ?? reading?.accuracy);
  if (!reading || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !Number.isFinite(acc)) return fail("Your location wasn't read. Allow location and press Use my location, or say it isn't available.", null, "no-location");
  if (acc > ACCURACY_REFUSE_M) return fail(`Your location is only accurate to within ${Math.round(acc)} m; it needs to be within ${ACCURACY_REFUSE_M} m. Move near a window or outdoors and try again, or say it isn't available.`, null, "inaccurate");
  return { ok: true, punch: { time, lat, lng, accuracy: Math.round(acc), source: "gps", lowAccuracy: acc > ACCURACY_FLAG_M, reason: "", needsOk: false, okBy: null, okAt: null, okNote: "" } };
}

export function visitCheckIn(personId, reading, opts = {}, now = officeNow()) {
  const person = active(personId);
  if (!person) return fail("Your account isn't active.");
  const box = readBox();
  const row = todayVisit(box, personId, now.date);
  if (!row) {
    const wait = box.visits.find((v) => v.personId === personId && v.dates.includes(now.date) && v.status === "pending");
    return wait ? fail("This visit is waiting for approval, so you can't check in yet.", null, "not-approved") : fail("You have no approved visit today.", null, "no-visit");
  }
  const day = row.days[now.date] ?? { in: null, out: null };
  if (day.in) return fail(`You already checked in for this visit at ${day.in.time}.`, null, "done");
  if (storedRecord(personId, now.date)?.checkIn) return fail("You already checked in at the office today.", null, "office");
  const made = readingPunch(reading, opts, hhmm(now.minutes));
  if (!made.ok) return made;
  row.days[now.date] = { in: made.punch, out: null };
  if (row.status === "approved") { row.status = "in-progress"; note(row, personId, "started"); logEvent({ actorId: personId, userId: personId, kind: "visit-started", detail: `${row.id}: ${row.siteName}` }); }
  note(row, personId, "check-in", made.punch.source === "unavailable" ? `Location unavailable: ${made.punch.reason}` : "");
  if (!writeBox(box)) return fail(SAVE_FAILED);
  return { ok: true, record: copy(row), date: now.date, punch: copy(made.punch) };
}

export function visitCheckOut(personId, reading, opts = {}, now = officeNow()) {
  const person = active(personId);
  if (!person) return fail("Your account isn't active.");
  const box = readBox();
  const row = todayVisit(box, personId, now.date);
  if (!row) return fail("You have no approved visit today.", null, "no-visit");
  const day = row.days[now.date];
  if (!day?.in) return fail("Check in for the visit first.", null, "not-in");
  if (day.out) return fail(`You already checked out of this visit at ${day.out.time}.`, null, "done");
  if (now.minutes < toMin(day.in.time)) return fail("Check-out can't be earlier than your check-in.");
  const made = readingPunch(reading, opts, hhmm(now.minutes));
  if (!made.ok) return made;
  day.out = made.punch;
  note(row, personId, "check-out", made.punch.source === "unavailable" ? `Location unavailable: ${made.punch.reason}` : "");
  const last = row.dates[row.dates.length - 1] === now.date;
  if (last) { row.status = "completed"; note(row, personId, "completed"); }
  if (!writeBox(box)) return fail(SAVE_FAILED);
  if (last) logEvent({ actorId: personId, userId: personId, kind: "visit-completed", detail: `${row.id}: ${row.siteName}` });
  return { ok: true, record: copy(row), date: now.date, punch: copy(made.punch), completed: last };
}

// The approver's explicit OK for a punch made as "location unavailable". side: "in" | "out".
export function okVisitLocation(deciderId, visitId, date, side, noteText, now = officeNow()) {
  const box = readBox();
  const row = box.visits.find((v) => v.id === visitId);
  if (!row) return fail("That visit doesn't exist.");
  if (!mayDecideVisit(deciderId, row.personId)) return fail("You can't decide this visit.");
  const p = row.days[date]?.[side === "out" ? "out" : "in"];
  if (!p || !p.needsOk) return fail("That punch isn't waiting for an OK.");
  if (p.okBy) return fail("That punch has already been given an OK.");
  const why = text(noteText);
  if (why.length < NOTE_MIN || why.length > NOTE_MAX) return fail(`Give a reason of ${NOTE_MIN} to ${NOTE_MAX} characters.`, "note");
  Object.assign(p, { okBy: deciderId, okAt: stamp(), okNote: why });
  note(row, deciderId, "location-ok", `${date} ${side === "out" ? "check-out" : "check-in"}: ${why}`);
  if (!writeBox(box)) return fail(SAVE_FAILED);
  logEvent({ actorId: deciderId, userId: row.personId, kind: "visit-location-ok", detail: `${row.id}: ${date} ${side === "out" ? "check-out" : "check-in"} accepted without a location` });
  return { ok: true, record: copy(row) };
}

// HR or an Admin (attendance:approve and attendance:view-all; never for their own visit): a visit day with a check-in that was left without a
// check-out is completed by setting the check-out time, or by marking the day full or half, with a reason. fields: { outTime "HH:MM", outcome "full" | "half", reason }.
// Until then the day is flagged Incomplete (not absent, no loss of pay); only a day marked half costs half a day.
// CV1c: a day nobody checked in on (an approved visit, the day over) is completed the same way, by marking it full or half with a reason (there is no
// check-out time to add): until then it is an absence in the current rules and "Visit not started" under the shift rules.
export function completeVisitDay(actorId, visitId, date, fields = {}, now = officeNow()) {
  const actor = active(actorId);
  if (!actor || !hasPermission(actor, "attendance:approve") || !hasPermission(actor, "attendance:view-all")) return fail("Only HR or an Admin can complete a visit day.");
  const box = readBox();
  const row = box.visits.find((v) => v.id === visitId);
  if (!row) return fail("That visit doesn't exist.");
  if (row.personId === actor.id) return fail("You can't complete your own visit day: ask HR.");
  if (!COUNTING.includes(row.status) || !row.dates.includes(date)) return fail("That isn't a day of this visit.", "date");
  if (date > now.date) return fail("That day hasn't happened yet.", "date");
  const day = row.days[date];
  const nobody = !day?.in && !day?.out;   // CV1c: nothing punched that day
  if (!nobody && (!day?.in || (day.in.needsOk && !day.in.okBy))) return fail("There is no check-in that day to complete.", "date");
  if (day?.decision) return fail("This day has already been completed.");
  if (nobody && date >= now.date) return fail("That day isn't over yet.", "date");
  const outTime = text(fields.outTime), outcome = text(fields.outcome);
  if (outcome && outcome !== "full" && outcome !== "half") return fail("Choose a full or a half day.", "outcome");
  if (!outTime && !outcome) return fail(nobody ? "Mark the day full or half." : "Give the check-out time, or mark the day full or half.", "outcome");
  if (nobody && outTime) return fail("Nobody checked in that day, so there is no check-out time to add: mark the day full or half.", "outTime");
  if (outTime) {
    if (day.out) return fail(`A check-out at ${day.out.time} is already recorded.`, "outTime");
    if (toMin(outTime) === null) return fail("Enter the check-out as HH:MM.", "outTime");
    if (toMin(outTime) < toMin(day.in.time)) return fail(`The check-out can't be before the check-in (${day.in.time}).`, "outTime");
  }
  const why = text(fields.reason);
  if (why.length < NOTE_MIN || why.length > NOTE_MAX) return fail(`Give a reason of ${NOTE_MIN} to ${NOTE_MAX} characters.`, "reason");
  if (outTime) day.out = { time: outTime, lat: null, lng: null, accuracy: null, source: "hr", lowAccuracy: false, reason: "", needsOk: false, okBy: actor.id, okAt: stamp(), okNote: why };
  const target = nobody ? (row.days[date] = { in: null, out: null }) : day;
  target.decision = { outcome: outcome || "full", by: actor.id, at: stamp(), reason: why };
  if (row.dates[row.dates.length - 1] === date) row.status = "completed";
  note(row, actor.id, "day-completed", `${date}: ${outTime ? `check-out ${outTime}` : `${nobody ? "no check-in, " : ""}marked ${target.decision.outcome}`}: ${why}`);
  if (!writeBox(box)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, userId: row.personId, kind: "visit-day-completed", detail: `${row.id}: ${date} ${outTime ? `check-out ${outTime}` : `${nobody ? "no check-in, " : ""}marked ${target.decision.outcome}`}` });
  return { ok: true, record: copy(row) };
}

// The approver's "no" to a punch made as "location unavailable": the punch is taken back (the person checks in again with a location) and the
// reason is kept in the visit's history. side: "in" | "out".
export function rejectVisitLocation(deciderId, visitId, date, side, noteText, now = officeNow()) {
  const box = readBox();
  const row = box.visits.find((v) => v.id === visitId);
  if (!row) return fail("That visit doesn't exist.");
  if (!mayDecideVisit(deciderId, row.personId)) return fail("You can't decide this visit.");
  const which = side === "out" ? "out" : "in";
  const p = row.days[date]?.[which];
  if (!p || !p.needsOk) return fail("That punch isn't waiting for an OK.");
  if (p.okBy) return fail("That punch has already been given an OK.");
  const why = text(noteText);
  if (why.length < NOTE_MIN || why.length > NOTE_MAX) return fail(`Give a reason of ${NOTE_MIN} to ${NOTE_MAX} characters.`, "note");
  if (which === "in") row.days[date] = { in: null, out: null }; else row.days[date].out = null;
  if (which === "out" && row.status === "completed" && row.dates[row.dates.length - 1] === date) row.status = "in-progress";   // the last day is no longer closed
  const punches = Object.values(row.days).some((d) => d.in || d.out);
  if (!punches && row.status === "in-progress" && !row.approvalPending) row.status = "approved";
  note(row, deciderId, "location-rejected", `${date} ${which === "out" ? "check-out" : "check-in"}: ${why}`);
  if (!writeBox(box)) return fail(SAVE_FAILED);
  logEvent({ actorId: deciderId, userId: row.personId, kind: "visit-location-rejected", detail: `${row.id}: ${date} ${which === "out" ? "check-out" : "check-in"} without a location not accepted (${why})` });
  return { ok: true, record: copy(row) };
}

// ---------- reads ----------

// What waits for this person's decision: visits to approve (items of kind "visit") and punches without a location to OK (kind "location").
export function pendingVisitItems(deciderId) {
  const d = active(deciderId);
  if (!d || !hasPermission(d, "visits:approve")) return [];
  const out = [];
  for (const v of readBox().visits) {
    if (!mayDecideVisit(d.id, v.personId)) continue;
    const name = getUser(v.personId)?.name ?? v.personId;
    if (v.status === "pending" || (v.status === "in-progress" && v.approvalPending)) out.push({ id: v.id, kind: "visit", visitId: v.id, personId: v.personId, userId: v.personId, reason: v.purpose, name, siteName: v.siteName, date: v.fromDate, toDate: v.toDate, sameDay: v.sameDay, requestedAt: v.createdAt });
    if (COUNTING.includes(v.status)) for (const [date, day] of Object.entries(v.days)) for (const side of ["in", "out"]) {
      if (day[side]?.needsOk && !day[side].okBy) out.push({ id: `${v.id}:${date}:${side}`, kind: "location", visitId: v.id, personId: v.personId, userId: v.personId, name, siteName: v.siteName, date, side, reason: day[side].reason, requestedAt: v.createdAt });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

// CV1c: the approved visit days that ended with nothing punched and that nobody has completed yet, for someone who may complete them (HR, an Admin:
// attendance:approve and attendance:view-all; never their own visit). Nobody else gets a list. -> [{ visitId, personId, name, siteName, date }], oldest first.
export function visitDaysNoCheckIn(viewerId, now = officeNow()) {
  const v = active(viewerId);
  if (!v || !hasPermission(v, "attendance:approve") || !hasPermission(v, "attendance:view-all")) return [];
  const out = [];
  for (const x of readBox().visits) {
    if (!COUNTING.includes(x.status) || x.personId === v.id) continue;
    for (const date of x.dates) {
      const d = x.days?.[date];
      if (date >= now.date || d?.in || d?.out || d?.decision) continue;
      out.push({ visitId: x.id, personId: x.personId, name: getUser(x.personId)?.name ?? x.personId, siteName: x.siteName, date });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

// People on a visit and checked in today (their check-in counts), for the viewer: everyone for visits:view-all, else the viewer's direct reports.
export function onSiteToday(viewerId, now = officeNow()) {
  const v = active(viewerId);
  if (!v) return [];
  const seeAll = hasPermission(v, "visits:view-all");
  const mine = new Set(directReportsOf(v.id).map((u) => u.id));
  return readBox().visits.filter((x) => COUNTING.includes(x.status) && x.days[now.date]?.in && (!x.days[now.date].in.needsOk || x.days[now.date].in.okBy) && (seeAll || mine.has(x.personId)))
    .map((x) => ({ visitId: x.id, personId: x.personId, name: getUser(x.personId)?.name ?? x.personId, siteName: x.siteName, checkIn: x.days[now.date].in.time, checkOut: x.days[now.date].out?.time ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// "planned" for an approved visit that hasn't begun, else the stored status.
export const phaseOf = (visit, today = officeNow().date) => (visit.status === "approved" && visit.dates[0] > today ? "planned" : visit.status);
export const mapsUrl = (punch) => (punch && punch.lat !== null && punch.lng !== null ? `https://www.google.com/maps?q=${punch.lat},${punch.lng}` : null);
// One row per visit day: [{ date, in, out, inMaps, outMaps }]
export function visitTrail(visit) {
  return visit.dates.map((date) => { const d = visit.days?.[date] ?? { in: null, out: null }; return { date, in: d.in, out: d.out, inMaps: mapsUrl(d.in), outMaps: mapsUrl(d.out) }; });
}
export { getVisit, allVisits };