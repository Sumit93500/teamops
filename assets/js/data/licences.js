// data/licences.js (IT1, 2026-11-22): software licences and their seats. Data only (the IT screens come next round).
//
// "officeos:it-licences" { version: 1, next: { lic, seat }, licences, seats }, read through pureBox (a read stores nothing):
//   licence  { id "LIC-n", software, vendorId (data/asset-register.js), seats, costPerYear, renewalDate, status active | cancelled, sample? }
//   seat     { id "SEAT-n", licenceId, personId, assignedAt (date), assignedBy, revokedAt (date | null), revokedBy, sample? }: a seat is
//            revoked, never deleted
// Rules: a licence's seats in use never exceed its seats (nor can its seats drop below those in use); one seat per person per licence;
// nobody who has left is given a seat; their seats are listed for revocation.
// Who: it:licences-manage (IT, Admin) adds and edits licences and assigns and revokes seats, and reads them; it:licences-view-costs
// (Finance, Admin) reads them with costs. A cost is a value field: every read leaves costPerYear out for anyone without
// it:licences-view-costs. IT may type a cost when adding a licence (from the invoice) but changing one needs it:licences-view-costs.
// A person reads their own seats (mySeats). Every write is in the audit trail (ids, never a cost).

import { getUser } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { logEvent } from "./audit-trail.js";
import { pureBox } from "./places.js";
import { remove } from "../core/storage.js";
import { employmentState } from "./employment-period.js";
import { vendorsFor } from "./asset-register.js";
import { text, money, date as dateCheck } from "./asset-rules.js";

const KEY = "it-licences";
const AARAV = "EMP-1001";
const seat = (n, personId, assignedAt) => ({ id: `SEAT-${n}`, licenceId: "LIC-1", personId, assignedAt, assignedBy: AARAV, revokedAt: null, revokedBy: null, sample: true });
// The sample (marked sample): one licence, four seats; Divya Menon has left, so hers is listed for revocation.
const SAMPLE = () => ({
  next: { lic: 2, seat: 5 },
  licences: [{ id: "LIC-1", software: "Microsoft 365 Business Standard", vendorId: "VN-1", seats: 10, costPerYear: 129600, renewalDate: "2027-01-31", status: "active", sample: true }],
  seats: [seat(1, "EMP-1029", "2025-04-15"), seat(2, "EMP-1042", "2024-07-03"), seat(3, "EMP-1105", "2024-01-08"), seat(4, "EMP-1061", "2024-02-01")],
});
const store = pureBox(KEY, 1, SAMPLE, (b) => b.next && Number.isInteger(b.next.lic) && Number.isInteger(b.next.seat) && Array.isArray(b.licences) && Array.isArray(b.seats));
export function resetLicences() { remove(KEY); }

const copy = (v) => JSON.parse(JSON.stringify(v));
const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";
const officeDay = (now) => new Date(now + 330 * 60000).toISOString().slice(0, 10);
const addDaysIso = (iso, k) => new Date(Date.parse(`${iso}T00:00:00Z`) + k * 86400000).toISOString().slice(0, 10);
const active = (id) => { const u = id ? getUser(String(id)) : null; return u && u.status !== "inactive" ? u : null; };
const can = (u, p) => Boolean(u) && hasPermission(u, p);
const hasLeft = (person, on) => !person || person.status === "inactive" || employmentState(person, on) === "after";
const inUse = (b, licenceId) => b.seats.filter((s) => s.licenceId === licenceId && !s.revokedAt);

const view = (b, l, costs) => {
  const used = inUse(b, l.id).length;
  const out = { id: l.id, software: l.software, vendorId: l.vendorId, seats: l.seats, used, free: Math.max(0, l.seats - used), renewalDate: l.renewalDate, status: l.status, sample: Boolean(l.sample) };
  if (costs) out.costPerYear = l.costPerYear;
  return out;
};
const reader = (viewerId) => { const v = active(viewerId); return can(v, "it:licences-manage") || can(v, "it:licences-view-costs") ? v : null; };

// ---------- reads ----------
export function licencesFor(viewerId) {
  const v = reader(viewerId);
  if (!v) return [];
  const b = store.read();
  return b.licences.map((l) => view(b, l, can(v, "it:licences-view-costs"))).sort((x, y) => x.software.localeCompare(y.software));
}
// A licence's seats in use (and, with all: revoked ones too), oldest first.
export function seatsOf(viewerId, licenceId, { all = false } = {}) {
  if (!reader(viewerId)) return [];
  return copy(store.read().seats.filter((s) => s.licenceId === licenceId && (all || !s.revokedAt)));
}
// The viewer's own seats, with the software's name; no cost.
export function mySeats(viewerId) {
  const v = active(viewerId);
  if (!v) return [];
  const b = store.read();
  return b.seats.filter((s) => s.personId === v.id && !s.revokedAt).map((s) => ({ seatId: s.id, licenceId: s.licenceId, software: b.licences.find((l) => l.id === s.licenceId)?.software ?? s.licenceId, assignedAt: s.assignedAt }));
}
// Active licences renewing within `days` days from today (today counted).
export function expiringRenewals(viewerId, days = 30, now = Date.now()) {
  const v = reader(viewerId);
  if (!v || !Number.isInteger(days) || days < 0 || days > 366) return [];
  const today = officeDay(now), until = addDaysIso(today, days);
  const b = store.read();
  return b.licences.filter((l) => l.status === "active" && l.renewalDate >= today && l.renewalDate <= until).map((l) => view(b, l, can(v, "it:licences-view-costs")))
    .sort((x, y) => x.renewalDate.localeCompare(y.renewalDate));
}
// Active licences with seats nobody uses, the most unused first.
export function underUsedLicences(viewerId) {
  return licencesFor(viewerId).filter((l) => l.status === "active" && l.free > 0).sort((x, y) => y.free - x.free || x.software.localeCompare(y.software));
}
// Seats in use by people who have left: to revoke.
export function seatsOfLeavers(viewerId, now = Date.now()) {
  if (!reader(viewerId)) return [];
  const today = officeDay(now);
  const b = store.read();
  return b.seats.filter((s) => !s.revokedAt && hasLeft(getUser(s.personId), today)).map((s) => ({ ...copy(s), software: b.licences.find((l) => l.id === s.licenceId)?.software ?? s.licenceId }));
}
// A person's seats in use (for offboarding), for it:licences-manage.
export function seatsHeldBy(viewerId, personId) {
  const v = active(viewerId);
  if (!can(v, "it:licences-manage")) return [];
  return copy(store.read().seats.filter((s) => s.personId === personId && !s.revokedAt));
}

// ---------- writes (it:licences-manage) ----------
const manager = (actorId) => { const a = active(actorId); return can(a, "it:licences-manage") ? a : null; };
const LICENCE_FIELDS = ["software", "vendorId", "seats", "costPerYear", "renewalDate", "status"];

function licenceFields(actor, fields, current = null) {
  const out = {};
  const has = (k) => !current || k in fields;
  if (has("software")) {
    const r = text(fields.software, "Software", { min: 2, max: 80, required: true });
    if (r.error) return fail(r.error, "software");
    out.software = r.value;
  }
  if (has("vendorId")) {
    const id = String(fields.vendorId ?? "").trim();
    const vendor = id ? vendorsFor(actor.id).find((x) => x.id === id) : null;
    if (id && !vendor) return fail("Choose a vendor from the list.", "vendorId");
    if (vendor && !vendor.active && vendor.id !== current?.vendorId) return fail(`${vendor.name} is inactive: choose an active vendor.`, "vendorId");
    out.vendorId = id || null;
  }
  if (has("seats")) {
    const n = typeof fields.seats === "string" && /^\s*\d+\s*$/.test(fields.seats) ? Number(fields.seats) : fields.seats;
    if (!Number.isInteger(n) || n < 1 || n > 100000) return fail("Enter the number of seats, 1 to 100,000.", "seats");
    out.seats = n;
  }
  if (has("costPerYear")) {
    const r = money(fields.costPerYear ?? 0, "Cost per year");
    if (r.error) return fail(r.error, "costPerYear");
    out.costPerYear = r.value;
  }
  if (has("renewalDate")) {
    const r = dateCheck(fields.renewalDate, "Renewal date");
    if (r.error) return fail(r.error, "renewalDate");
    out.renewalDate = r.value;
  }
  if ("status" in fields || !current) {
    const s = fields.status ?? "active";
    if (!["active", "cancelled"].includes(s)) return fail("A licence is active or cancelled.", "status");
    out.status = s;
  }
  return { ok: true, fields: out };
}

export function addLicence(actorId, fields = {}, now = Date.now()) {
  const actor = manager(actorId);
  if (!actor) return fail("You can't add licences.");
  const extra = Object.keys(fields ?? {}).filter((k) => !LICENCE_FIELDS.includes(k));
  if (extra.length) return fail(`These can't be set here: ${extra.join(", ")}.`);
  const b = store.read();
  const checked = licenceFields(actor, fields);
  if (!checked.ok) return checked;
  if (b.licences.some((l) => l.software.toLowerCase() === checked.fields.software.toLowerCase() && l.status === "active")) return fail(`${checked.fields.software} already has an active licence.`, "software");
  const record = { id: `LIC-${b.next.lic}`, ...checked.fields };
  b.licences.push(record);
  b.next.lic += 1;
  if (!store.write(b)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, kind: "licence-added", detail: `${record.id}: ${record.software}` }, now);
  return { ok: true, record: view(b, record, can(actor, "it:licences-view-costs")) };
}

export function updateLicence(actorId, licenceId, changes = {}, now = Date.now()) {
  const actor = manager(actorId);
  if (!actor) return fail("You can't change licences.");
  const extra = Object.keys(changes ?? {}).filter((k) => !LICENCE_FIELDS.includes(k));
  if (extra.length) return fail(`These can't be changed here: ${extra.join(", ")}.`);
  if ("costPerYear" in changes && !can(actor, "it:licences-view-costs")) return fail("You can't change a licence's cost.", "costPerYear");
  const b = store.read();
  const l = b.licences.find((x) => x.id === licenceId);
  if (!l) return fail(`No licence ${licenceId}.`);
  const checked = licenceFields(actor, changes, l);
  if (!checked.ok) return checked;
  const used = inUse(b, l.id).length;
  if ("seats" in checked.fields && checked.fields.seats < used) return fail(`${used} seats are in use: revoke some before lowering it to ${checked.fields.seats}.`, "seats");
  const changed = Object.keys(checked.fields).filter((k) => l[k] !== checked.fields[k]);
  if (!changed.length) return { ok: true, record: view(b, l, can(actor, "it:licences-view-costs")) };
  Object.assign(l, checked.fields);
  if (!store.write(b)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, kind: "licence-changed", detail: `${l.id}: ${changed.join(", ")}` }, now);
  return { ok: true, record: view(b, l, can(actor, "it:licences-view-costs")) };
}

// Gives a person a seat on an active licence: never above its seats, once per person, never to someone who has left.
export function assignSeat(actorId, licenceId, personId, now = Date.now()) {
  const actor = manager(actorId);
  if (!actor) return fail("You can't assign licence seats.");
  const b = store.read();
  const l = b.licences.find((x) => x.id === licenceId);
  if (!l) return fail(`No licence ${licenceId}.`, "licenceId");
  if (l.status !== "active") return fail(`${l.software}'s licence is cancelled.`, "licenceId");
  const person = getUser(String(personId ?? ""));
  if (!person) return fail("Choose a person from the list.", "personId");
  const today = officeDay(now);
  if (hasLeft(person, today)) return fail(`${person.name} has left and can't be given a seat.`, "personId");
  if (inUse(b, l.id).some((s) => s.personId === person.id)) return fail(`${person.name} already has a ${l.software} seat.`, "personId");
  if (inUse(b, l.id).length >= l.seats) return fail(`All ${l.seats} ${l.software} seats are in use.`, "licenceId");
  const record = { id: `SEAT-${b.next.seat}`, licenceId: l.id, personId: person.id, assignedAt: today, assignedBy: actor.id, revokedAt: null, revokedBy: null };
  b.seats.push(record);
  b.next.seat += 1;
  if (!store.write(b)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, userId: person.id, kind: "seat-assigned", detail: `${record.id}: ${l.id} to ${person.id}` }, now);
  return { ok: true, record: copy(record) };
}

// Revokes a seat in use (kept, marked revoked).
export function revokeSeat(actorId, seatId, now = Date.now()) {
  const actor = manager(actorId);
  if (!actor) return fail("You can't revoke licence seats.");
  const b = store.read();
  const s = b.seats.find((x) => x.id === seatId);
  if (!s) return fail(`No seat ${seatId}.`);
  if (s.revokedAt) return fail(`${seatId} is already revoked.`);
  s.revokedAt = officeDay(now);
  s.revokedBy = actor.id;
  if (!store.write(b)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, userId: s.personId, kind: "seat-revoked", detail: `${s.id}: ${s.licenceId} from ${s.personId}` }, now);
  return { ok: true, record: copy(s) };
}