// data/asset-register.js (AS1, 2026-11-22): the fixed-asset register: assets, their lifecycle and assignment history, maintenance, vendors
// and the company's depreciation defaults. Data only: no page reads this yet (the screens come next round). The old site's register
// (data/inventory-store.js, its assets and vendors) is separate and unchanged.
//
// Kept in "officeos:asset-register" { version: 1, next: { asset, event, maint, vendor }, assets, events, maintenance, vendors, defaults },
// read through places.js pureBox: a read never writes, so until the first write the sample below is what everyone reads.
//   asset    { id "FA-n", tag (AST-0001, unique; changed at most once: tagEdited), name, category (asset-rules.js ASSET_CATEGORIES), makeModel,
//              serial (unique when given), purchaseDate, purchasePrice, vendorId, invoiceRef, warrantyUntil, usefulLifeYears, salvageValue,
//              depreciationMethod slm | wdv, wdvRatePercent, locationId (an office, data/offices-store.js), createdAt, sample? }
//   event    { id "AE-n", assetId, kind, date, at, byId, from, to, personId, condition, notes, maintenanceId, saleValue }: the lifecycle and the
//              assignment history, append-only (nothing here edits or deletes one). kind: added (-> in store), issued (in store -> assigned),
//              returned (assigned -> in store), maintenance-opened (in store -> under maintenance), maintenance-closed (-> in store), retired
//              (in store -> retired), disposed (retired -> disposed). An asset's status and holder are never stored: they are its last event's.
//   maintenance { id "MR-n", assetId, date, issue, cost, vendorId, nextServiceDue, status open | done, notes, openedBy, closedOn, closedBy, sample? }
//   vendor   { id "VN-n", name (unique), contactPerson, phone, email, gstin, address, active, sample? }
//   defaults { <category>: { method, usefulLifeYears, wdvRatePercent, salvagePercent } }: only what Admin or Finance changed; the rest is
//              asset-rules.js's. A default applies to assets added afterwards; an asset keeps its own method and rate.
//
// The lifecycle is asset-rules.js TRANSITIONS: in store -> assigned -> in store (returned) -> under maintenance -> in store; in store ->
// retired -> disposed. One holder at a time; nobody who has left (inactive, or past their last working day) is issued an asset; every date
// is a real day from 1990, never in the future and never before the asset's purchase or its last event.
//
// Who (config/permissions.js). Every read takes the viewer and returns only what they may see; every write checks the permission, then the
// lifecycle:
//   assets:view-own      everyone: the assets issued to them now or before, and only their own assignment rows; no values, no other holder
//   assets:view-all      HR, Finance, the Admin: every asset, its history, maintenance (as assets:maintain), who still holds what after leaving
//   assets:view-values   Finance, the Admin: the price, salvage value, life, method and rate, depreciation, maintenance costs, sale values and
//                        gain or loss. Anyone else's reads never carry these fields (they are left out, not blanked).
//   assets:manage        add, edit, retire, dispose; assets:issue issue and take back; assets:maintain maintenance; vendors:manage vendors;
//                        depreciation:configure the defaults and an asset's own method, rate, life and salvage (Admin, Finance). The first
//                        four are the custodian's: the Admin's only, until the IT round gives them to its role.
// A manager sees nothing of their team's assets by being their manager. Every write goes to the audit trail with who, the ids and what
// happened (field names, never amounts).
//
//   reads   listAssets(viewerId, { status, category })  getAssetFor(viewerId, idOrTag)  assignmentHistory(viewerId, assetId)
//           assignmentsOf(viewerId, personId)  assetEvents(viewerId, assetId)  depreciationOf(viewerId, assetId, asOf, { schedule })
//           maintenanceOf(viewerId, assetId)  overdueService(viewerId, now)  warrantyExpiring(viewerId, days, now)
//           assetsNotReturned(viewerId, { personId }, now)  vendorsFor(viewerId)  depreciationDefaults(viewerId)
//   writes  addAsset  editAsset  setAssetDepreciation  setDepreciationDefault  issueAsset  returnAsset  openMaintenance  closeMaintenance
//           retireAsset  disposeAsset  addVendor  updateVendor  setVendorActive  deleteVendor   (actorId first; now: ms, last)
//   resetAssetRegister()

import { getUser, leavingDate } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { logEvent } from "./audit-trail.js";
import { pureBox } from "./places.js";
import { remove } from "../core/storage.js";
import { getOffice } from "./offices-store.js";
import { employmentState } from "./employment-period.js";
import { depreciation, disposalFigures, toPaise, rupees } from "./depreciation.js";
import {
  ASSET_CATEGORIES, ASSET_STATES, METHODS, CONDITIONS, TAG_PATTERN, tagOf, tagNumber, moveRefusal,
  text, money, percent, lifeYears, date as dateCheck, EMAIL, phoneOk, GSTIN,
} from "./asset-rules.js";

const KEY = "asset-register";
const AARAV = "EMP-1001";
const NOTES_MAX = 500;

// ---------- the sample (marked sample) ----------
// Twelve assets across laptops, phones, chairs, a monitor and a printer, in every state: issued to seeded people, one handed back, one under
// maintenance, one retired, one disposed of (sold), and a monitor still with Divya Menon, who has left (the "not returned" list). Two vendors,
// two maintenance records (the printer's is past its next service date). Values are rupees.
const SAMPLE_AT = (d) => `${d}T04:30:00.000Z`;   // 10:00 in India
function sample() {
  const assets = [], events = [];
  let ev = 1;
  const asset = (n, name, category, makeModel, serial, purchaseDate, purchasePrice, vendorId, invoiceRef, warrantyUntil, usefulLifeYears, salvageValue, method = "slm") => {
    assets.push({ id: `FA-${n}`, tag: tagOf(n), tagEdited: false, name, category, makeModel, serial, purchaseDate, purchasePrice, vendorId, invoiceRef, warrantyUntil,
      usefulLifeYears, salvageValue, depreciationMethod: method, wdvRatePercent: ASSET_CATEGORIES[category].defaults.wdvRatePercent, locationId: "OFF-1",
      createdAt: SAMPLE_AT(purchaseDate), sample: true });
    event(n, "added", purchaseDate, null, "in-store");
  };
  function event(n, kind, d, from, to, extra = {}) {
    events.push({ id: `AE-${ev++}`, assetId: `FA-${n}`, kind, date: d, at: SAMPLE_AT(d), byId: AARAV, from, to, personId: null, condition: null, notes: "",
      maintenanceId: null, saleValue: null, sample: true, ...extra });
  }
  const issued = (n, d, personId, condition = "good") => event(n, "issued", d, "in-store", "assigned", { personId, condition });
  const returned = (n, d, personId, condition, notes = "") => event(n, "returned", d, "assigned", "in-store", { personId, condition, notes });

  asset(1, "Dell Latitude 5440", "laptop", "Dell Latitude 5440", "DL5440-7Q2K91", "2025-04-10", 78500, "VN-1", "TN/25-26/0412", "2028-04-09", 3, 3925);
  issued(1, "2025-04-15", "EMP-1029");
  asset(2, "MacBook Pro 14\"", "laptop", "Apple MacBook Pro 14 (M3)", "C02FX1MBP14", "2024-07-01", 189900, "VN-1", "TN/24-25/0188", "2025-06-30", 3, 9495, "wdv");
  issued(2, "2024-07-03", "EMP-1042");
  asset(3, "Dell Latitude 5440", "laptop", "Dell Latitude 5440", "DL5440-7Q2K92", "2025-04-10", 78500, "VN-1", "TN/25-26/0412", "2028-04-09", 3, 3925);
  issued(3, "2025-04-20", "EMP-1061");
  returned(3, "2026-09-14", "EMP-1061", "fair", "Handed back before leaving");
  asset(4, "Dell Latitude 5420", "laptop", "Dell Latitude 5420", "DL5420-3MZ810", "2022-03-15", 68000, "VN-1", "TN/21-22/0950", "2025-03-14", 3, 3400);
  issued(4, "2022-03-20", "EMP-1105");
  returned(4, "2026-10-28", "EMP-1105", "poor", "Battery swelling");
  event(4, "maintenance-opened", "2026-11-02", "in-store", "under-maintenance", { maintenanceId: "MR-2" });
  asset(5, "Samsung Galaxy A55", "phone", "Samsung Galaxy A55 5G", "R5CX20A55K", "2025-08-01", 39999, "VN-1", "TN/25-26/0733", "2026-12-15", 3, 1999.95);
  issued(5, "2025-08-04", "EMP-1017");
  asset(6, "iPhone 15", "phone", "Apple iPhone 15 128 GB", "F2LXQ15PH", "2025-01-20", 79900, "VN-1", "TN/24-25/0611", "2027-01-19", 3, 3995);
  issued(6, "2025-01-22", "EMP-1008");
  asset(7, "Ergonomic office chair", "furniture", "FurniCraft ErgoPro", "", "2024-01-05", 12800, "VN-2", "FC/23-24/1102", "2027-01-04", 10, 640);
  issued(7, "2024-01-08", "EMP-1105");
  asset(8, "Ergonomic office chair", "furniture", "FurniCraft ErgoPro", "", "2024-01-05", 12800, "VN-2", "FC/23-24/1102", "2027-01-04", 10, 640);
  asset(9, "HP LaserJet Pro printer", "printer", "HP LaserJet Pro M404dn", "PHBQK40412", "2023-06-12", 32500, "VN-1", "TN/23-24/0301", "2024-06-11", 5, 1625);
  event(9, "maintenance-opened", "2026-08-14", "in-store", "under-maintenance", { maintenanceId: "MR-1" });
  event(9, "maintenance-closed", "2026-08-16", "under-maintenance", "in-store", { maintenanceId: "MR-1" });
  asset(10, "Dell Latitude 5410", "laptop", "Dell Latitude 5410", "DL5410-1AB220", "2021-02-01", 62000, "VN-1", "TN/20-21/0870", "2024-01-31", 3, 3100);
  issued(10, "2021-02-03", "EMP-1042", "good");
  returned(10, "2024-07-03", "EMP-1042", "fair", "Replaced by AST-0002");
  event(10, "retired", "2026-06-30", "in-store", "retired", { notes: "Past its useful life" });
  asset(11, "Redmi Note 10", "phone", "Xiaomi Redmi Note 10", "RN10-88341", "2021-05-10", 14999, "VN-1", "TN/21-22/0101", "2022-05-09", 3, 749.95, "wdv");
  issued(11, "2021-05-12", "EMP-1017");
  returned(11, "2025-08-04", "EMP-1017", "poor", "Screen cracked; replaced by AST-0005");
  event(11, "retired", "2025-09-30", "in-store", "retired", { notes: "Screen cracked, not worth repairing" });
  event(11, "disposed", "2026-03-31", "retired", "disposed", { notes: "Sold for scrap", saleValue: 1500 });
  asset(12, "Dell 24\" monitor", "monitor", "Dell P2419H", "CN-0P2419H-77", "2023-02-01", 14500, "VN-1", "TN/22-23/0905", "2026-01-31", 3, 725);
  issued(12, "2023-02-03", "EMP-1061");

  const vendors = [
    { id: "VN-1", name: "TechNova Distributors", contactPerson: "Meenal Kapoor", phone: "+91 98180 45521", email: "orders@technova.example",
      gstin: "06AABCT4821M1Z7", address: "Plot 14, Udyog Vihar Phase IV, Gurugram, Haryana 122015", active: true, sample: true },
    { id: "VN-2", name: "FurniCraft India", contactPerson: "Sanjay Bhatia", phone: "+91 99101 87650", email: "sales@furnicraft.example",
      gstin: "07AAFCF2210K1Z3", address: "B-42, Okhla Industrial Area Phase II, New Delhi 110020", active: true, sample: true },
  ];
  const maintenance = [
    { id: "MR-1", assetId: "FA-9", date: "2026-08-14", issue: "Paper jams; pick-up roller replaced", cost: 2400, vendorId: "VN-1", nextServiceDue: "2026-11-14",
      status: "done", notes: "", openedBy: AARAV, closedOn: "2026-08-16", closedBy: AARAV, sample: true },
    { id: "MR-2", assetId: "FA-4", date: "2026-11-02", issue: "Battery swelling; sent for a battery replacement", cost: 6500, vendorId: "VN-1", nextServiceDue: null,
      status: "open", notes: "Quoted by the vendor", openedBy: AARAV, closedOn: null, closedBy: null, sample: true },
  ];
  return { next: { asset: 13, event: ev, maint: 3, vendor: 3 }, assets, events, maintenance, vendors, defaults: {} };
}
const store = pureBox(KEY, 1, sample, (b) => b.next && ["asset", "event", "maint", "vendor"].every((k) => Number.isInteger(b.next[k]))
  && ["assets", "events", "maintenance", "vendors"].every((k) => Array.isArray(b[k])) && b.defaults && typeof b.defaults === "object");

// ---------- small helpers ----------
const copy = (v) => JSON.parse(JSON.stringify(v));
const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";
const officeDay = (now) => new Date(now + 330 * 60000).toISOString().slice(0, 10);
const addDaysIso = (iso, k) => new Date(Date.parse(`${iso}T00:00:00Z`) + k * 86400000).toISOString().slice(0, 10);
const active = (id) => { const u = id ? getUser(String(id)) : null; return u && u.status !== "inactive" ? u : null; };
const holding = (id, permission) => { const u = active(id); return u && hasPermission(u, permission) ? u : null; };
const can = (u, permission) => Boolean(u) && hasPermission(u, permission);
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, copy(o[k])]));
const num = (id) => Number(String(id).replace(/^\D+-/, ""));
function save(box) { return store.write(box); }
function findAsset(box, idOrTag) {
  const key = String(idOrTag ?? "");
  return box.assets.find((a) => a.id === key) ?? box.assets.find((a) => a.tag.toLowerCase() === key.toLowerCase()) ?? null;
}
// Has this person left (inactive, or after their last working day or in a past period away, on this date)?
const hasLeft = (person, on) => !person || person.status === "inactive" || employmentState(person, on) === "after";

// ---------- the state, from the events ----------
const eventsOf = (box, assetId) => box.events.filter((e) => e.assetId === assetId).sort((a, b) => num(a.id) - num(b.id));
function stateOf(box, assetId) {
  const evs = eventsOf(box, assetId);
  const last = evs.at(-1) ?? null;
  const status = last?.to ?? "in-store";
  const issue = status === "assigned" ? [...evs].reverse().find((e) => e.kind === "issued") : null;
  const retired = evs.find((e) => e.kind === "retired") ?? null;
  const disposed = evs.find((e) => e.kind === "disposed") ?? null;
  // The earliest day the next event may have: the purchase date, or the last event's (the "added" event carries the purchase date).
  const floor = evs.filter((e) => e.kind !== "added").reduce((d, e) => (e.date > d ? e.date : d), box.assets.find((a) => a.id === assetId)?.purchaseDate ?? "1990-01-01");
  return { status, holderId: issue?.personId ?? null, since: issue?.date ?? null, retired, disposed, floor, events: evs };
}
// Assignment rows: each issue with the return that ended it (none while held).
function rowsOf(box, assetId) {
  const rows = [];
  for (const e of eventsOf(box, assetId)) {
    if (e.kind === "issued") rows.push({ assetId, personId: e.personId, from: e.date, to: null, issuedBy: e.byId, returnedTo: null, conditionAtIssue: e.condition,
      conditionAtReturn: null, notes: e.notes, returnNotes: null });
    if (e.kind === "returned" && rows.length && rows.at(-1).to === null) Object.assign(rows.at(-1), { to: e.date, returnedTo: e.byId, conditionAtReturn: e.condition, returnNotes: e.notes });
  }
  return rows;
}

// ---------- what a viewer gets ----------
const BASE = ["id", "tag", "name", "category", "makeModel", "serial", "purchaseDate", "vendorId", "invoiceRef", "warrantyUntil", "locationId"];
export const VALUE_FIELDS = ["purchasePrice", "salvageValue", "usefulLifeYears", "depreciationMethod", "wdvRatePercent"];
const OWN = ["id", "tag", "name", "category", "makeModel", "serial", "warrantyUntil", "locationId"];
const paramsOf = (a, disposalDate = null) => ({ cost: a.purchasePrice, salvage: a.salvageValue, purchaseDate: a.purchaseDate, method: a.depreciationMethod,
  usefulLifeYears: a.usefulLifeYears, wdvRatePercent: a.wdvRatePercent, disposalDate });

function fullView(box, a, values) {
  const s = stateOf(box, a.id);
  const out = { ...pick(a, BASE), status: s.status, holderId: s.holderId, since: s.since, sample: Boolean(a.sample) };
  if (s.retired) Object.assign(out, { retiredOn: s.retired.date, retireReason: s.retired.notes });
  if (s.disposed) Object.assign(out, { disposedOn: s.disposed.date, disposalReason: s.disposed.notes });
  if (values) {
    Object.assign(out, pick(a, VALUE_FIELDS));
    if (s.disposed) {
      const f = disposalFigures(paramsOf(a), s.disposed.date, s.disposed.saleValue ?? 0);
      if (f.ok) Object.assign(out, { saleValue: f.saleValue, bookValueAtDisposal: f.bookValue, gainOrLoss: f.gainOrLoss });
    }
  }
  return out;
}
function ownView(box, a, viewerId) {
  const s = stateOf(box, a.id);
  const heldByYou = s.status === "assigned" && s.holderId === viewerId;
  return { ...pick(a, OWN), heldByYou, since: heldByYou ? s.since : null, sample: Boolean(a.sample), assignments: rowsOf(box, a.id).filter((r) => r.personId === viewerId) };
}
const everHeld = (box, assetId, personId) => box.events.some((e) => e.assetId === assetId && e.kind === "issued" && e.personId === personId);
// What this viewer gets for this asset, or null.
function viewFor(box, v, a) {
  if (!v || !a) return null;
  if (can(v, "assets:view-all")) return fullView(box, a, can(v, "assets:view-values"));
  if (can(v, "assets:view-own") && everHeld(box, a.id, v.id)) return ownView(box, a, v.id);
  return null;
}
const maintView = (r, values) => {
  const out = pick(r, ["id", "assetId", "date", "issue", "vendorId", "nextServiceDue", "status", "notes", "openedBy", "closedOn", "closedBy"]);
  if (values) out.cost = r.cost;
  out.sample = Boolean(r.sample);
  return out;
};

// ---------- reads ----------
// Every asset the viewer may see, by tag; filters: status, category.
export function listAssets(viewerId, { status = null, category = null } = {}) {
  const v = active(viewerId);
  const box = store.read();
  return box.assets.map((a) => viewFor(box, v, a)).filter(Boolean)
    .filter((a) => (!status || a.status === status) && (!category || a.category === category))
    .sort((a, b) => a.tag.localeCompare(b.tag, "en", { numeric: true }));
}
export function getAssetFor(viewerId, idOrTag) {
  const box = store.read();
  return viewFor(box, active(viewerId), findAsset(box, idOrTag));
}
// Who held the asset, from when to when: every row for assets:view-all; the viewer's own rows for an asset they held; else [].
export function assignmentHistory(viewerId, assetId) {
  const v = active(viewerId);
  const box = store.read();
  const a = findAsset(box, assetId);
  if (!v || !a) return [];
  const rows = rowsOf(box, a.id);
  if (can(v, "assets:view-all")) return rows;
  return can(v, "assets:view-own") ? rows.filter((r) => r.personId === v.id) : [];
}
// Every asset a person has held, newest first, with the tag: for the person themself, or assets:view-all.
export function assignmentsOf(viewerId, personId) {
  const v = active(viewerId);
  if (!v || !(can(v, "assets:view-all") || (v.id === personId && can(v, "assets:view-own")))) return [];
  const box = store.read();
  return box.assets.flatMap((a) => rowsOf(box, a.id).filter((r) => r.personId === personId).map((r) => ({ ...r, tag: a.tag, name: a.name })))
    .sort((a, b) => b.from.localeCompare(a.from) || b.tag.localeCompare(a.tag));
}
// The asset's lifecycle, oldest first (assets:view-all); a sale value only for assets:view-values.
export function assetEvents(viewerId, assetId) {
  const v = active(viewerId);
  if (!can(v, "assets:view-all")) return [];
  const box = store.read();
  const a = findAsset(box, assetId);
  if (!a) return [];
  const values = can(v, "assets:view-values");
  return eventsOf(box, a.id).map((e) => {
    const out = pick(e, ["id", "assetId", "kind", "date", "at", "byId", "from", "to", "personId", "condition", "notes", "maintenanceId"]);
    if (values && e.saleValue !== null) out.saleValue = e.saleValue;
    return out;
  });
}
// The depreciation on a date (assets:view-values only): data/depreciation.js's answer, stopped at the disposal date for a disposed asset.
export function depreciationOf(viewerId, assetId, asOf, opts = {}) {
  if (!holding(viewerId, "assets:view-values")) return fail("You can't see asset values.");
  const box = store.read();
  const a = findAsset(box, assetId);
  if (!a) return fail(`No asset ${assetId}.`);
  const s = stateOf(box, a.id);
  return depreciation(paramsOf(a, s.disposed?.date ?? null), asOf, opts);
}
const seesUpkeep = (v) => can(v, "assets:view-all") || can(v, "assets:maintain");
export function maintenanceOf(viewerId, assetId) {
  const v = active(viewerId);
  if (!seesUpkeep(v)) return [];
  const box = store.read();
  const a = findAsset(box, assetId);
  const values = can(v, "assets:view-values");
  return a ? box.maintenance.filter((r) => r.assetId === a.id).sort((x, y) => y.date.localeCompare(x.date) || num(y.id) - num(x.id)).map((r) => maintView(r, values)) : [];
}
// Assets whose latest maintenance record's next service date has passed (no newer record since). Not retired or disposed ones.
export function overdueService(viewerId, now = Date.now()) {
  const v = active(viewerId);
  if (!seesUpkeep(v)) return [];
  const box = store.read();
  const today = officeDay(now);
  const values = can(v, "assets:view-values");
  const out = [];
  for (const a of box.assets) {
    const s = stateOf(box, a.id);
    if (s.status === "retired" || s.status === "disposed") continue;
    const latest = box.maintenance.filter((r) => r.assetId === a.id).sort((x, y) => y.date.localeCompare(x.date) || num(y.id) - num(x.id))[0];
    if (latest?.nextServiceDue && latest.nextServiceDue < today) out.push({ asset: fullView(box, a, values), record: maintView(latest, values), due: latest.nextServiceDue });
  }
  return out.sort((x, y) => x.due.localeCompare(y.due) || x.asset.tag.localeCompare(y.asset.tag));
}
// Assets whose warranty ends within the next `days` days (today counted; 30, 60 or 90 on the screens). Not retired or disposed ones.
export function warrantyExpiring(viewerId, days = 30, now = Date.now()) {
  const v = active(viewerId);
  if (!(can(v, "assets:view-all") || can(v, "assets:manage")) || !Number.isInteger(days) || days < 0 || days > 366) return [];
  const box = store.read();
  const today = officeDay(now), until = addDaysIso(today, days);
  const values = can(v, "assets:view-values");
  return box.assets.filter((a) => a.warrantyUntil && a.warrantyUntil >= today && a.warrantyUntil <= until)
    .map((a) => fullView(box, a, values)).filter((a) => a.status !== "retired" && a.status !== "disposed")
    .sort((x, y) => x.warrantyUntil.localeCompare(y.warrantyUntil) || x.tag.localeCompare(y.tag));
}
// Assets still issued to someone who has left (inactive, or past their last working day): for the offboarding round. personId narrows it to
// one person. assets:view-all. -> [{ asset, personId, since, exitDate (their last working day, or null when none is recorded) }]
export function assetsNotReturned(viewerId, { personId = null } = {}, now = Date.now()) {
  const v = active(viewerId);
  if (!can(v, "assets:view-all")) return [];
  const box = store.read();
  const today = officeDay(now);
  const values = can(v, "assets:view-values");
  const out = [];
  for (const a of box.assets) {
    const s = stateOf(box, a.id);
    if (s.status !== "assigned" || (personId && s.holderId !== personId)) continue;
    const person = getUser(s.holderId);
    if (hasLeft(person, today)) out.push({ asset: fullView(box, a, values), personId: s.holderId, since: s.since, exitDate: leavingDate(person) });
  }
  return out.sort((x, y) => x.asset.tag.localeCompare(y.asset.tag, "en", { numeric: true }));
}
export function vendorsFor(viewerId) {
  const v = active(viewerId);
  if (!(can(v, "vendors:manage") || can(v, "assets:view-all"))) return [];
  return copy(store.read().vendors).sort((a, b) => a.name.localeCompare(b.name));
}
// The company's depreciation defaults by category (depreciation:configure or assets:view-values), or null.
export function depreciationDefaults(viewerId) {
  const v = active(viewerId);
  if (!(can(v, "depreciation:configure") || can(v, "assets:view-values"))) return null;
  return defaultsIn(store.read());
}
const defaultsIn = (box) => Object.fromEntries(Object.entries(ASSET_CATEGORIES).map(([k, c]) => [k, { ...c.defaults, ...(box.defaults[k] ?? {}) }]));

// ---------- writes: assets ----------
const ASSET_FIELDS = ["name", "category", "makeModel", "serial", "purchaseDate", "purchasePrice", "vendorId", "invoiceRef", "warrantyUntil", "locationId"];
const DEP_FIELDS = ["depreciationMethod", "usefulLifeYears", "wdvRatePercent", "salvageValue"];

// Checks the asset's own fields (all of them when adding; those named when editing). -> { ok, fields } or a failure.
function assetFields(box, fields, today, current = null) {
  const out = {};
  const has = (k) => !current || k in fields;
  if (has("name")) {
    const r = text(fields.name, "Name", { min: 2, max: 80, required: true });
    if (r.error) return fail(r.error, "name");
    out.name = r.value;
  }
  if (has("category")) {
    if (!Object.hasOwn(ASSET_CATEGORIES, String(fields.category ?? ""))) return fail("Choose a category.", "category");
    out.category = fields.category;
  }
  if (has("makeModel")) {
    const r = text(fields.makeModel, "Make and model", { max: 80 });
    if (r.error) return fail(r.error, "makeModel");
    out.makeModel = r.value;
  }
  if (has("serial")) {
    const r = text(fields.serial, "Serial number", { max: 40 });
    if (r.error) return fail(r.error, "serial");
    if (r.value && box.assets.some((a) => a.id !== current?.id && a.serial && a.serial.toLowerCase() === r.value.toLowerCase())) return fail(`Serial number ${r.value} is already on the register.`, "serial");
    out.serial = r.value;
  }
  if (has("purchaseDate")) {
    const r = dateCheck(fields.purchaseDate, "Purchase date", { latest: today });
    if (r.error) return fail(r.error, "purchaseDate");
    out.purchaseDate = r.value;
  }
  if (has("purchasePrice")) {
    const r = money(fields.purchasePrice, "Purchase price");
    if (r.error) return fail(r.error, "purchasePrice");
    out.purchasePrice = r.value;
  }
  if (has("vendorId")) {
    const id = String(fields.vendorId ?? "").trim();
    const vendor = id ? box.vendors.find((x) => x.id === id) : null;
    if (id && !vendor) return fail("Choose a vendor from the list.", "vendorId");
    if (vendor && !vendor.active && vendor.id !== current?.vendorId) return fail(`${vendor.name} is inactive: choose an active vendor.`, "vendorId");
    out.vendorId = id || null;
  }
  if (has("invoiceRef")) {
    const r = text(fields.invoiceRef, "Invoice reference", { max: 40 });
    if (r.error) return fail(r.error, "invoiceRef");
    out.invoiceRef = r.value;
  }
  if (has("warrantyUntil")) {
    const r = dateCheck(fields.warrantyUntil, "Warranty end", { required: false });
    if (r.error) return fail(r.error, "warrantyUntil");
    out.warrantyUntil = r.value;
  }
  if (has("locationId")) {
    const office = getOffice(String(fields.locationId ?? ""));
    if (!office) return fail("Choose an office.", "locationId");
    if (office.active === false && office.id !== current?.locationId) return fail(`${office.name} is inactive: choose an active office.`, "locationId");
    out.locationId = office.id;
  }
  const purchaseDate = out.purchaseDate ?? current?.purchaseDate;
  const warranty = "warrantyUntil" in out ? out.warrantyUntil : current?.warrantyUntil;
  if (warranty && purchaseDate && warranty < purchaseDate) return fail("The warranty can't end before the purchase date.", "warrantyUntil");
  return { ok: true, fields: out };
}

// The depreciation fields (method, life, rate, salvage) against a price. -> { ok, fields } or a failure.
function depFields(fields, price, base) {
  const out = { ...base };
  if ("depreciationMethod" in fields) {
    if (!Object.hasOwn(METHODS, String(fields.depreciationMethod ?? ""))) return fail("Choose straight line or written-down value.", "depreciationMethod");
    out.depreciationMethod = fields.depreciationMethod;
  }
  if ("usefulLifeYears" in fields) {
    const r = lifeYears(fields.usefulLifeYears);
    if (r.error) return fail(r.error, "usefulLifeYears");
    out.usefulLifeYears = r.value;
  }
  if ("wdvRatePercent" in fields) {
    const r = percent(fields.wdvRatePercent, "Written-down value rate");
    if (r.error) return fail(r.error, "wdvRatePercent");
    out.wdvRatePercent = r.value;
  }
  if ("salvageValue" in fields) {
    const r = money(fields.salvageValue, "Salvage value");
    if (r.error) return fail(r.error, "salvageValue");
    out.salvageValue = r.value;
  }
  if (toPaise(out.salvageValue) > toPaise(price)) return fail("The salvage value can't be more than the purchase price.", "salvageValue");
  return { ok: true, fields: out };
}

// Adds an asset to the store. fields: ASSET_FIELDS (name, category, purchaseDate, purchasePrice and locationId required); the tag is given
// (AST-0013 ...). The method, life, rate and salvage come from the category's default (salvage: its percent of the price, to the paisa,
// half up) unless named, which needs depreciation:configure.
export function addAsset(actorId, fields = {}, now = Date.now()) {
  const actor = holding(actorId, "assets:manage");
  if (!actor) return fail("You can't add assets.");
  const extra = Object.keys(fields ?? {}).filter((k) => !ASSET_FIELDS.includes(k) && !DEP_FIELDS.includes(k));
  if (extra.length) return fail(`These can't be set here: ${extra.join(", ")}.`);
  if (DEP_FIELDS.some((k) => k in fields) && !can(actor, "depreciation:configure")) return fail("You can't set an asset's depreciation: the category's default is used.");
  const box = store.read();
  const today = officeDay(now);
  const checked = assetFields(box, fields, today);
  if (!checked.ok) return checked;
  const f = checked.fields;
  const d = defaultsIn(box)[f.category];
  const salvage = rupees((toPaise(f.purchasePrice) * BigInt(Math.round(d.salvagePercent * 100)) * 2n + 10000n) / 20000n);
  const dep = depFields(fields, f.purchasePrice, { depreciationMethod: d.method, usefulLifeYears: d.usefulLifeYears, wdvRatePercent: d.wdvRatePercent, salvageValue: salvage });
  if (!dep.ok) return dep;
  const n = Math.max(box.next.asset - 1, ...box.assets.map((a) => tagNumber(a.tag) ?? 0)) + 1;
  let tag = tagOf(n);
  for (let k = n; box.assets.some((a) => a.tag === tag); k += 1) tag = tagOf(k + 1);
  const record = { id: `FA-${box.next.asset}`, tag, tagEdited: false, ...f, ...dep.fields, createdAt: new Date(now).toISOString() };
  box.assets.push(record);
  box.next.asset += 1;
  pushEvent(box, record.id, "added", f.purchaseDate, actor.id, null, "in-store", {}, now);
  if (!save(box)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, kind: "asset-added", detail: `${record.tag} (${record.id}): ${record.name}` }, now);
  return { ok: true, record: fullView(box, record, can(actor, "assets:view-values")) };
}

function pushEvent(box, assetId, kind, d, byId, from, to, extra, now) {
  box.events.push({ id: `AE-${box.next.event}`, assetId, kind, date: d, at: new Date(now).toISOString(), byId, from, to, personId: null, condition: null, notes: "",
    maintenanceId: null, saleValue: null, ...extra });
  box.next.event += 1;
}

// Edits an asset's own fields (ASSET_FIELDS, and the tag once). The price needs assets:view-values too; the purchase date can change only
// until anything has happened to the asset. A disposed asset can't be edited.
export function editAsset(actorId, assetId, changes = {}, now = Date.now()) {
  const actor = holding(actorId, "assets:manage");
  if (!actor) return fail("You can't edit assets.");
  const extra = Object.keys(changes ?? {}).filter((k) => !ASSET_FIELDS.includes(k) && k !== "tag");
  if (extra.length) return fail(`These can't be changed here: ${extra.join(", ")}.`);
  if ("purchasePrice" in changes && !can(actor, "assets:view-values")) return fail("You can't change an asset's price.", "purchasePrice");
  const box = store.read();
  const a = findAsset(box, assetId);
  if (!a) return fail(`No asset ${assetId}.`);
  const s = stateOf(box, a.id);
  if (s.status === "disposed") return fail(`${a.tag} has been disposed of and can't be edited.`);
  const today = officeDay(now);
  const checked = assetFields(box, changes, today, a);
  if (!checked.ok) return checked;
  const f = checked.fields;
  if ("purchaseDate" in f && f.purchaseDate !== a.purchaseDate && s.events.some((e) => e.kind !== "added")) return fail(`${a.tag}'s purchase date can't change now: it has been issued, maintained or retired since.`, "purchaseDate");
  if ("purchasePrice" in f && toPaise(a.salvageValue) > toPaise(f.purchasePrice)) return fail("The price can't be below the salvage value: change the salvage value first.", "purchasePrice");
  if ("tag" in changes) {
    const tag = String(changes.tag ?? "").trim().toUpperCase();
    if (tag !== a.tag) {
      if (a.tagEdited) return fail(`${a.tag}'s tag has already been changed once.`, "tag");
      if (!TAG_PATTERN.test(tag)) return fail("A tag is 3 to 20 capital letters, digits and dashes.", "tag");
      if (box.assets.some((x) => x.id !== a.id && x.tag.toLowerCase() === tag.toLowerCase())) return fail(`Tag ${tag} is already in use.`, "tag");
      f.tag = tag;
      f.tagEdited = true;
    }
  }
  const changed = Object.keys(f).filter((k) => k !== "tagEdited" && JSON.stringify(a[k]) !== JSON.stringify(f[k]));
  if (!changed.length) return { ok: true, record: fullView(box, a, can(actor, "assets:view-values")) };
  const oldTag = a.tag;
  Object.assign(a, f);
  if (!save(box)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, kind: "asset-changed", detail: `${oldTag}${f.tag && f.tag !== oldTag ? ` -> ${f.tag}` : ""}: ${changed.join(", ")}` }, now);
  return { ok: true, record: fullView(box, a, can(actor, "assets:view-values")) };
}

// An asset's own method, life, rate and salvage value (depreciation:configure). Not for a disposed asset.
export function setAssetDepreciation(actorId, assetId, changes = {}, now = Date.now()) {
  const actor = holding(actorId, "depreciation:configure");
  if (!actor) return fail("You can't change depreciation settings.");
  const extra = Object.keys(changes ?? {}).filter((k) => !DEP_FIELDS.includes(k));
  if (extra.length) return fail(`These can't be changed here: ${extra.join(", ")}.`);
  const box = store.read();
  const a = findAsset(box, assetId);
  if (!a) return fail(`No asset ${assetId}.`);
  if (stateOf(box, a.id).status === "disposed") return fail(`${a.tag} has been disposed of: its depreciation is closed.`);
  const dep = depFields(changes, a.purchasePrice, pick(a, DEP_FIELDS));
  if (!dep.ok) return dep;
  const changed = DEP_FIELDS.filter((k) => a[k] !== dep.fields[k]);
  if (!changed.length) return { ok: true, record: fullView(box, a, can(actor, "assets:view-values")) };
  Object.assign(a, dep.fields);
  if (!save(box)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, kind: "depreciation-changed", detail: `${a.tag}: ${changed.join(", ")}` }, now);
  return { ok: true, record: fullView(box, a, can(actor, "assets:view-values")) };
}

// The company default for a category (depreciation:configure): { method, usefulLifeYears, wdvRatePercent, salvagePercent }, any of them.
// Assets added afterwards take it; existing assets keep their own.
export function setDepreciationDefault(actorId, category, changes = {}, now = Date.now()) {
  const actor = holding(actorId, "depreciation:configure");
  if (!actor) return fail("You can't change depreciation settings.");
  if (!Object.hasOwn(ASSET_CATEGORIES, String(category ?? ""))) return fail("Choose a category.", "category");
  const KEYS = ["method", "usefulLifeYears", "wdvRatePercent", "salvagePercent"];
  const extra = Object.keys(changes ?? {}).filter((k) => !KEYS.includes(k));
  if (extra.length) return fail(`These can't be changed here: ${extra.join(", ")}.`);
  const box = store.read();
  const next = { ...defaultsIn(box)[category] };
  if ("method" in changes) {
    if (!Object.hasOwn(METHODS, String(changes.method ?? ""))) return fail("Choose straight line or written-down value.", "method");
    next.method = changes.method;
  }
  if ("usefulLifeYears" in changes) {
    const r = lifeYears(changes.usefulLifeYears);
    if (r.error) return fail(r.error, "usefulLifeYears");
    next.usefulLifeYears = r.value;
  }
  for (const [k, label] of [["wdvRatePercent", "Written-down value rate"], ["salvagePercent", "Salvage value"]]) {
    if (!(k in changes)) continue;
    const r = percent(changes[k], label);
    if (r.error) return fail(r.error, k);
    next[k] = r.value;
  }
  const before = defaultsIn(box)[category];
  const changed = KEYS.filter((k) => before[k] !== next[k]);
  if (!changed.length) return { ok: true, defaults: next };
  box.defaults[category] = next;
  if (!save(box)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, kind: "depreciation-changed", detail: `default for ${category}: ${changed.join(", ")}` }, now);
  return { ok: true, defaults: { ...next } };
}

// ---------- writes: the lifecycle ----------
// Checks a lifecycle step: the permission, the asset, the move (asset-rules.js TRANSITIONS) and the date (a real day, not in the future, not
// before the purchase or the asset's last event). -> { ok, actor, box, a, s, day } or a failure.
function step(actorId, permission, assetId, to, d, now, label) {
  const actor = holding(actorId, permission);
  if (!actor) return fail(`You can't ${label} assets.`);
  const box = store.read();
  const a = findAsset(box, assetId);
  if (!a) return fail(`No asset ${assetId}.`);
  const s = stateOf(box, a.id);
  const refusal = moveRefusal(a.tag, s.status, to);
  if (refusal) return fail(refusal);
  const today = officeDay(now);
  const r = dateCheck(d ?? today, "Date", { latest: today, earliest: s.floor });
  if (r.error) return fail(r.error, "date");
  return { ok: true, actor, box, a, s, day: r.value };
}
const notesOf = (value, label = "Notes") => text(value, label, { max: NOTES_MAX });

// Issues an asset in the store to a person. fields: { personId, date (default today), condition (good, fair or poor), notes }.
export function issueAsset(actorId, assetId, fields = {}, now = Date.now()) {
  const st = step(actorId, "assets:issue", assetId, "assigned", fields.date, now, "issue");
  if (!st.ok) return st;
  const person = getUser(String(fields.personId ?? ""));
  if (!person) return fail("Choose a person from the list.", "personId");
  if (hasLeft(person, st.day)) return fail(`${person.name} has left and can't be issued an asset.`, "personId");
  if (!Object.hasOwn(CONDITIONS, String(fields.condition ?? ""))) return fail("Choose its condition at issue.", "condition");
  const notes = notesOf(fields.notes);
  if (notes.error) return fail(notes.error, "notes");
  pushEvent(st.box, st.a.id, "issued", st.day, st.actor.id, "in-store", "assigned", { personId: person.id, condition: fields.condition, notes: notes.value }, now);
  if (!save(st.box)) return fail(SAVE_FAILED);
  logEvent({ actorId: st.actor.id, userId: person.id, kind: "asset-issued", detail: `${st.a.tag}: issued to ${person.id}, ${fields.condition}` }, now);
  return { ok: true, record: fullView(st.box, st.a, can(st.actor, "assets:view-values")) };
}

// Takes an issued asset back into the store (also from someone who has left). fields: { date, condition, notes }.
export function returnAsset(actorId, assetId, fields = {}, now = Date.now()) {
  const st = step(actorId, "assets:issue", assetId, "in-store", fields.date, now, "take back");
  if (!st.ok) return st;
  if (st.s.status !== "assigned") return fail(`${st.a.tag} isn't issued to anyone.`);
  if (!Object.hasOwn(CONDITIONS, String(fields.condition ?? ""))) return fail("Choose its condition on return.", "condition");
  const notes = notesOf(fields.notes);
  if (notes.error) return fail(notes.error, "notes");
  const holder = st.s.holderId;
  pushEvent(st.box, st.a.id, "returned", st.day, st.actor.id, "assigned", "in-store", { personId: holder, condition: fields.condition, notes: notes.value }, now);
  if (!save(st.box)) return fail(SAVE_FAILED);
  logEvent({ actorId: st.actor.id, userId: holder, kind: "asset-returned", detail: `${st.a.tag}: returned by ${holder}, ${fields.condition}` }, now);
  return { ok: true, record: fullView(st.box, st.a, can(st.actor, "assets:view-values")) };
}

// Opens a maintenance record and moves the asset (in the store) to under maintenance. fields: { date, issue (required), cost (0 or more),
// vendorId, nextServiceDue (after date), notes }.
export function openMaintenance(actorId, assetId, fields = {}, now = Date.now()) {
  const st = step(actorId, "assets:maintain", assetId, "under-maintenance", fields.date, now, "maintain");
  if (!st.ok) return st;
  const checked = maintFields(st.box, fields, st.day);
  if (!checked.ok) return checked;
  const record = { id: `MR-${st.box.next.maint}`, assetId: st.a.id, date: st.day, ...checked.fields, status: "open", openedBy: st.actor.id, closedOn: null, closedBy: null };
  st.box.maintenance.push(record);
  st.box.next.maint += 1;
  pushEvent(st.box, st.a.id, "maintenance-opened", st.day, st.actor.id, "in-store", "under-maintenance", { maintenanceId: record.id }, now);
  if (!save(st.box)) return fail(SAVE_FAILED);
  logEvent({ actorId: st.actor.id, kind: "asset-maintenance-opened", detail: `${st.a.tag}: ${record.id}` }, now);
  return { ok: true, record: maintView(record, can(st.actor, "assets:view-values")) };
}

function maintFields(box, fields, day, current = null) {
  const out = {};
  if (!current) {
    const issue = text(fields.issue, "Issue", { min: 3, max: 200, required: true });
    if (issue.error) return fail(issue.error, "issue");
    out.issue = issue.value;
    const vendorId = String(fields.vendorId ?? "").trim();
    const vendor = vendorId ? box.vendors.find((x) => x.id === vendorId) : null;
    if (vendorId && !vendor) return fail("Choose a vendor from the list.", "vendorId");
    if (vendor && !vendor.active) return fail(`${vendor.name} is inactive: choose an active vendor.`, "vendorId");
    out.vendorId = vendorId || null;
  }
  if (!current || "cost" in fields) {
    const cost = money(fields.cost ?? 0, "Cost");
    if (cost.error) return fail(cost.error, "cost");
    out.cost = cost.value;
  }
  if (!current || "nextServiceDue" in fields) {
    const due = dateCheck(fields.nextServiceDue, "Next service", { required: false });
    if (due.error) return fail(due.error, "nextServiceDue");
    if (due.value && due.value <= day) return fail(`The next service must be after ${day}.`, "nextServiceDue");
    out.nextServiceDue = due.value;
  }
  if (!current || "notes" in fields) {
    const notes = notesOf(fields.notes);
    if (notes.error) return fail(notes.error, "notes");
    out.notes = current && notes.value ? (current.notes ? `${current.notes}\n${notes.value}` : notes.value) : notes.value || current?.notes || "";
  }
  return { ok: true, fields: out };
}

// Closes an open maintenance record and brings the asset back to the store. fields: { date (not before the record's), cost, nextServiceDue
// (after the record's date), notes (added to the record's) }.
export function closeMaintenance(actorId, recordId, fields = {}, now = Date.now()) {
  const actor = holding(actorId, "assets:maintain");
  if (!actor) return fail("You can't maintain assets.");
  const box0 = store.read();
  const record0 = box0.maintenance.find((r) => r.id === recordId);
  if (!record0) return fail(`No maintenance record ${recordId}.`);
  if (record0.status !== "open") return fail(`${recordId} is already closed.`);
  const st = step(actorId, "assets:maintain", record0.assetId, "in-store", fields.date, now, "maintain");
  if (!st.ok) return st;
  if (st.s.status !== "under-maintenance") return fail(`${st.a.tag} isn't under maintenance.`);
  const record = st.box.maintenance.find((r) => r.id === recordId);
  const checked = maintFields(st.box, fields, record.date, record);
  if (!checked.ok) return checked;
  Object.assign(record, checked.fields, { status: "done", closedOn: st.day, closedBy: st.actor.id });
  pushEvent(st.box, st.a.id, "maintenance-closed", st.day, st.actor.id, "under-maintenance", "in-store", { maintenanceId: record.id }, now);
  if (!save(st.box)) return fail(SAVE_FAILED);
  logEvent({ actorId: st.actor.id, kind: "asset-maintenance-closed", detail: `${st.a.tag}: ${record.id}` }, now);
  return { ok: true, record: maintView(record, can(st.actor, "assets:view-values")) };
}

// Retires an asset in the store. fields: { date, reason (3-200 characters) }.
export function retireAsset(actorId, assetId, fields = {}, now = Date.now()) {
  const st = step(actorId, "assets:manage", assetId, "retired", fields.date, now, "retire");
  if (!st.ok) return st;
  const reason = text(fields.reason, "Reason", { min: 3, max: 200, required: true });
  if (reason.error) return fail(reason.error, "reason");
  pushEvent(st.box, st.a.id, "retired", st.day, st.actor.id, "in-store", "retired", { notes: reason.value }, now);
  if (!save(st.box)) return fail(SAVE_FAILED);
  logEvent({ actorId: st.actor.id, kind: "asset-retired", detail: `${st.a.tag}` }, now);
  return { ok: true, record: fullView(st.box, st.a, can(st.actor, "assets:view-values")) };
}

// Disposes of a retired asset. fields: { date (not before it was retired), reason (3-200 characters), saleValue (optional, 0 or more) }.
// Depreciation stops on the disposal date; the book value then and the gain or loss are worked out, never stored.
export function disposeAsset(actorId, assetId, fields = {}, now = Date.now()) {
  const st = step(actorId, "assets:manage", assetId, "disposed", fields.date, now, "dispose of");
  if (!st.ok) return st;
  const reason = text(fields.reason, "Reason", { min: 3, max: 200, required: true });
  if (reason.error) return fail(reason.error, "reason");
  const given = fields.saleValue !== undefined && fields.saleValue !== null && fields.saleValue !== "";
  const sale = given ? money(fields.saleValue, "Sale value") : { value: null };
  if (sale.error) return fail(sale.error, "saleValue");
  pushEvent(st.box, st.a.id, "disposed", st.day, st.actor.id, "retired", "disposed", { notes: reason.value, saleValue: sale.value }, now);
  if (!save(st.box)) return fail(SAVE_FAILED);
  logEvent({ actorId: st.actor.id, kind: "asset-disposed", detail: `${st.a.tag}${given ? " (sold)" : " (written off)"}` }, now);
  return { ok: true, record: fullView(st.box, st.a, can(st.actor, "assets:view-values")) };
}

// ---------- writes: vendors ----------
const VENDOR_FIELDS = ["name", "contactPerson", "phone", "email", "gstin", "address"];
function vendorFields(box, fields, current = null) {
  const out = {};
  const has = (k) => !current || k in fields;
  if (has("name")) {
    const r = text(fields.name, "Name", { min: 2, max: 80, required: true });
    if (r.error) return fail(r.error, "name");
    if (box.vendors.some((x) => x.id !== current?.id && x.name.toLowerCase() === r.value.toLowerCase())) return fail(`There is already a vendor called ${r.value}.`, "name");
    out.name = r.value;
  }
  if (has("contactPerson")) {
    const r = text(fields.contactPerson, "Contact person", { max: 80 });
    if (r.error) return fail(r.error, "contactPerson");
    out.contactPerson = r.value;
  }
  if (has("phone")) {
    const r = text(fields.phone, "Phone", { max: 20 });
    if (r.error) return fail(r.error, "phone");
    if (r.value && !phoneOk(r.value)) return fail("Enter a phone number of 10 to 15 digits (spaces, dashes and a leading + are fine).", "phone");
    out.phone = r.value;
  }
  if (has("email")) {
    const r = text(fields.email, "Email", { max: 120 });
    if (r.error) return fail(r.error, "email");
    if (r.value && !EMAIL.test(r.value)) return fail("Enter a valid email address.", "email");
    out.email = r.value;
  }
  if (has("gstin")) {
    const g = String(fields.gstin ?? "").trim().toUpperCase();
    if (g && !GSTIN.test(g)) return fail("Enter a valid GSTIN: 15 characters, like 06AABCT4821M1Z7.", "gstin");
    out.gstin = g || null;
  }
  if (has("address")) {
    const r = text(fields.address, "Address", { max: 200 });
    if (r.error) return fail(r.error, "address");
    out.address = r.value;
  }
  return { ok: true, fields: out };
}
const vendorWriter = (actorId) => holding(actorId, "vendors:manage");

export function addVendor(actorId, fields = {}, now = Date.now()) {
  const actor = vendorWriter(actorId);
  if (!actor) return fail("You can't add vendors.");
  const extra = Object.keys(fields ?? {}).filter((k) => !VENDOR_FIELDS.includes(k));
  if (extra.length) return fail(`These can't be set here: ${extra.join(", ")}.`);
  const box = store.read();
  const checked = vendorFields(box, fields);
  if (!checked.ok) return checked;
  const record = { id: `VN-${box.next.vendor}`, ...checked.fields, active: true };
  box.vendors.push(record);
  box.next.vendor += 1;
  if (!save(box)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, kind: "vendor-added", detail: `${record.id}: ${record.name}` }, now);
  return { ok: true, record: copy(record) };
}
export function updateVendor(actorId, vendorId, changes = {}, now = Date.now()) {
  const actor = vendorWriter(actorId);
  if (!actor) return fail("You can't change vendors.");
  const extra = Object.keys(changes ?? {}).filter((k) => !VENDOR_FIELDS.includes(k));
  if (extra.length) return fail(`These can't be changed here: ${extra.join(", ")}.`);
  const box = store.read();
  const record = box.vendors.find((x) => x.id === vendorId);
  if (!record) return fail(`No vendor ${vendorId}.`);
  const checked = vendorFields(box, changes, record);
  if (!checked.ok) return checked;
  const changed = Object.keys(checked.fields).filter((k) => record[k] !== checked.fields[k]);
  if (!changed.length) return { ok: true, record: copy(record) };
  Object.assign(record, checked.fields);
  if (!save(box)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, kind: "vendor-changed", detail: `${record.id}: ${changed.join(", ")}` }, now);
  return { ok: true, record: copy(record) };
}
// Deactivates (active false: no new asset or maintenance record may name it) or reactivates a vendor.
export function setVendorActive(actorId, vendorId, isActive, now = Date.now()) {
  const actor = vendorWriter(actorId);
  if (!actor) return fail("You can't change vendors.");
  if (typeof isActive !== "boolean") return fail("Say whether the vendor is active.");
  const box = store.read();
  const record = box.vendors.find((x) => x.id === vendorId);
  if (!record) return fail(`No vendor ${vendorId}.`);
  if (record.active === isActive) return { ok: true, record: copy(record) };
  record.active = isActive;
  if (!save(box)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, kind: "vendor-changed", detail: `${record.id}: ${isActive ? "reactivated" : "deactivated"}` }, now);
  return { ok: true, record: copy(record) };
}
// Deletes a vendor nothing names; one an asset or a maintenance record names is refused (deactivate it instead).
export function deleteVendor(actorId, vendorId, now = Date.now()) {
  const actor = vendorWriter(actorId);
  if (!actor) return fail("You can't delete vendors.");
  const box = store.read();
  const index = box.vendors.findIndex((x) => x.id === vendorId);
  if (index === -1) return fail(`No vendor ${vendorId}.`);
  const uses = box.assets.filter((a) => a.vendorId === vendorId).length + box.maintenance.filter((r) => r.vendorId === vendorId).length;
  if (uses) return fail(`${box.vendors[index].name} is named on ${uses} ${uses === 1 ? "record" : "records"}: deactivate it instead.`);
  const [gone] = box.vendors.splice(index, 1);
  if (!save(box)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, kind: "vendor-removed", detail: `${gone.id}: ${gone.name}` }, now);
  return { ok: true, record: copy(gone) };
}

// Throws away every change in this browser; the sample is read again.
export function resetAssetRegister() { remove(KEY); }