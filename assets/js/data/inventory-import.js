// data/inventory-import.js (AS2, 2026-11-22): the old site's inventory (data/inventory-store.js: 12 stock items, their ledger, 7 tagged
// assets, 5 vendors) in the shapes of the AS1 register (data/asset-register.js) and stock ledger (data/stock-ledger.js). Pure: nothing
// here writes anything. The old store itself is never touched (the old site keeps working on it); this file only READS its saved
// records (core/storage load, which writes nothing) and falls back to the defaults the old store seeds, copied below.
//
//   oldSource()        the old store's current records: what is saved in this browser, else the old store's own defaults
//   buildImport(src)   { vendors, stockItems, stockMovements, assets, events, maintenance, skipped }: the same tags, ids, SKUs and names
//
// What is mapped, and what is left empty rather than invented:
//   vendor      id and name kept; contact name -> contact person; "on-hold" -> not active, flagged onHold; supplies and terms kept; no email,
//               GSTIN or address (the old data has none)
//   stock item  id (ITM-n), SKU, name, category kept; reorder level kept; unit "unit" (the old data has none); no unit price (AS1 stock has none)
//   stock       an opening count dated the day before the first movement on record (the old data has no date for it), then every untagged
//               movement in order (in and return -> in, out -> out, an adjustment -> in or write-off); a tagged item (a laptop, a monitor, a
//               card) is one count carried over, its movements being the asset history below, so on hand is the old figure
//   asset       tag kept (it is the old id); name and make from its item; category from its type (access card -> other); NO purchase date or
//               price (the old data has none: detailsMissing); depreciation at the category's default; the store room kept as text
//   history     the old history entries as lifecycle events (assigned -> issued, returned, sent-to-repair -> maintenance opened, repaired ->
//               closed) with their own dates; where the old data doesn't say (when it was added, when a person got something before handing
//               it back) the date is null: "not recorded"; the old condition goes on the last event
//   skipped     problem reports (the old "reported" entries): not part of the AS1 lifecycle
import { load } from "../core/storage.js";
import { ASSET_CATEGORIES } from "./asset-rules.js";

const copy = (v) => JSON.parse(JSON.stringify(v));
const AARAV = "EMP-1001";
const at = (date, time) => new Date(`${date}T${time}:00+05:30`).toISOString();
const moved = (id, date, time, sku, type, change, reference, extra = {}) => ({ id, sku, type, change, at: at(date, time), recordedBy: AARAV, reference, note: "", department: null, assetTag: null, holderId: null, ...extra });
const entry = (action, date, time, holderId, movementId, note = "") => ({ action, at: at(date, time), byUserId: AARAV, holderId, movementId, note });

// The old store's own defaults (data/inventory-store.js SEED_*), copied: tests/live/assetimport.mjs proves they equal what a fresh old store reads.
const DEFAULT_ITEMS = [
  { id: "ITM-1",  sku: "IT-1021",  name: "Dell Latitude 5440",            category: "it",         assetType: "laptop",      reorderLevel: 5,  unitPrice: 78500,  location: "store-a",   openingStock: 6 },
  { id: "ITM-2",  sku: "IT-1044",  name: "Logitech MX Keys keyboard",     category: "it",         assetType: null,          reorderLevel: 10, unitPrice: 9500,   location: "store-a",   openingStock: 5 },
  { id: "ITM-3",  sku: "IT-1102",  name: "HDMI cable, 2 m",               category: "it",         assetType: null,          reorderLevel: 20, unitPrice: 450,    location: "store-a",   openingStock: 3 },
  { id: "ITM-4",  sku: "FUR-2010", name: "Ergonomic office chair",        category: "furniture",  assetType: null,          reorderLevel: 5,  unitPrice: 12800,  location: "warehouse", openingStock: 8 },
  { id: "ITM-5",  sku: "STA-3001", name: "A4 paper ream",                 category: "stationery", assetType: null,          reorderLevel: 50, unitPrice: 320,    location: "store-b",   openingStock: 52 },
  { id: "ITM-6",  sku: "STA-3015", name: "Whiteboard markers, pack of 4", category: "stationery", assetType: null,          reorderLevel: 30, unitPrice: 160,    location: "store-b",   openingStock: 60 },
  { id: "ITM-7",  sku: "PAN-4002", name: "Coffee beans, 1 kg",            category: "pantry",     assetType: null,          reorderLevel: 10, unitPrice: 850,    location: "pantry",    openingStock: 2 },
  { id: "ITM-8",  sku: "IT-1019",  name: "Dell Latitude 5410",            category: "it",         assetType: "laptop",      reorderLevel: 0,  unitPrice: 62000,  location: "store-a",   openingStock: 1 },
  { id: "ITM-9",  sku: "IT-1020",  name: "Dell Latitude 5420",            category: "it",         assetType: "laptop",      reorderLevel: 0,  unitPrice: 68000,  location: "store-a",   openingStock: 0 },
  { id: "ITM-10", sku: "IT-1031",  name: "MacBook Pro 14\"",              category: "it",         assetType: "laptop",      reorderLevel: 0,  unitPrice: 189900, location: "store-a",   openingStock: 0 },
  { id: "ITM-11", sku: "IT-1060",  name: "Dell 24\" monitor",             category: "it",         assetType: "monitor",     reorderLevel: 3,  unitPrice: 14500,  location: "store-a",   openingStock: 4 },
  { id: "ITM-12", sku: "IT-1080",  name: "Office access card",            category: "it",         assetType: "access-card", reorderLevel: 10, unitPrice: 250,    location: "store-a",   openingStock: 30 },
];
const DEFAULT_MOVEMENTS = [
  moved("MOV-1", "2026-09-08", "11:00", "IT-1019",  "out",        -1,  "Sent for repair", { assetTag: "AST-0099" }),
  moved("MOV-2", "2026-09-14", "17:45", "IT-1021",  "return",     1,   "Returned",        { assetTag: "AST-0217", holderId: "EMP-1061" }),
  moved("MOV-3", "2026-09-15", "09:30", "PAN-4002", "in",         12,  "PO-2264"),
  moved("MOV-4", "2026-09-16", "14:00", "IT-1102",  "adjustment", -3,  "Stock count correction"),
  moved("MOV-5", "2026-09-17", "10:12", "IT-1044",  "out",        -2,  "Engineering team", { department: "ENG" }),
  moved("MOV-6", "2026-09-17", "15:20", "FUR-2010", "in",         6,   "PO-2270"),
  moved("MOV-7", "2026-09-18", "11:05", "STA-3001", "out",        -10, "Finance department request", { department: "FIN" }),
  moved("MOV-8", "2026-09-18", "16:40", "IT-1021",  "out",        -1,  "Assigned",        { assetTag: "AST-0217", holderId: "EMP-1029" }),
  moved("MOV-9", "2026-09-22", "10:00", "PAN-4002", "out",        -6,  "Pantry refill"),
];
const DEFAULT_ASSETS = [
  { id: "AST-0099", sku: "IT-1019", condition: "poor", status: "in-repair", holderId: null,       since: null,         location: null,
    history: [entry("sent-to-repair", "2026-09-08", "11:00", null, "MOV-1", "Sent to the vendor for repair")] },
  { id: "AST-0119", sku: "IT-1031", condition: "good", status: "assigned",  holderId: "EMP-1042", since: "2025-03-03", location: null, history: [] },
  { id: "AST-0188", sku: "IT-1020", condition: "fair", status: "assigned",  holderId: "EMP-1105", since: "2023-01-12", location: null, history: [] },
  { id: "AST-0217", sku: "IT-1021", condition: "good", status: "assigned",  holderId: "EMP-1029", since: "2026-09-18", location: null,
    history: [entry("returned", "2026-09-14", "17:45", "EMP-1061", "MOV-2"), entry("assigned", "2026-09-18", "16:40", "EMP-1029", "MOV-8")] },
  { id: "AST-0218", sku: "IT-1021", condition: "good", status: "available", holderId: null,       since: null,         location: "store-a", history: [] },
  { id: "AST-0302", sku: "IT-1060", condition: "good", status: "assigned",  holderId: "EMP-1105", since: "2023-01-12", location: null, history: [] },
  { id: "AST-0455", sku: "IT-1080", condition: "good", status: "assigned",  holderId: "EMP-1105", since: "2023-01-12", location: null, history: [] },
];
const DEFAULT_VENDORS = [
  { id: "VEN-1", name: "Sharma Office Supplies", contactName: "Rajiv Sharma",  phone: "+91 98110 22334", supplies: "Stationery, pantry",   terms: "Net 30 days",     status: "active" },
  { id: "VEN-2", name: "TechNova Distributors",  contactName: "Meenal Kapoor", phone: "+91 98180 45521", supplies: "Laptops, accessories", terms: "Net 45 days",     status: "active" },
  { id: "VEN-3", name: "FurniCraft India",       contactName: "Sanjay Bhatia", phone: "+91 99101 87650", supplies: "Office furniture",     terms: "Net 30 days",     status: "active" },
  { id: "VEN-4", name: "CoolAir Services",       contactName: "Amit Verma",    phone: "+91 98730 11098", supplies: "AC maintenance",       terms: "Yearly contract", status: "active" },
  { id: "VEN-5", name: "QuickPrint Solutions",   contactName: "Neeraj Jain",   phone: "+91 98999 30412", supplies: "Printing, id cards",   terms: "Advance payment", status: "on-hold" },
];

export const OLD_STORE_LOCATIONS = { "store-a": "Store room A", "store-b": "Store room B", warehouse: "Warehouse", pantry: "Pantry store" };
export const OLD_ASSET_CATEGORY = { laptop: "laptop", monitor: "monitor", "access-card": "other" };
export const IMPORT_HEAD_OFFICE = "OFF-1";   // the old register has store rooms, not offices: every imported asset is at the head office

// The old store's current records (each key's saved box, else its defaults). Reads only: it never seeds the old store.
const saved = (key, fallback) => { const b = load(key); return b && b.version === 1 && Array.isArray(b.records) ? copy(b.records) : copy(fallback); };
export const oldSource = () => ({
  items: saved("inventory-items", DEFAULT_ITEMS), movements: saved("stock-movements", DEFAULT_MOVEMENTS), assets: saved("assets", DEFAULT_ASSETS), vendors: saved("vendors", DEFAULT_VENDORS),
});
export const oldDefaults = () => copy({ items: DEFAULT_ITEMS, movements: DEFAULT_MOVEMENTS, assets: DEFAULT_ASSETS, vendors: DEFAULT_VENDORS });

// An instant (ISO) as the office day (India time): the day every imported date is on.
const dayOf = (iso) => new Date(Date.parse(iso) + 330 * 60000).toISOString().slice(0, 10);
const addDays = (iso, k) => new Date(Date.parse(`${iso}T00:00:00Z`) + k * 86400000).toISOString().slice(0, 10);
const REF = /^[A-Za-z]{2,5}-\d+$/;
const CONDITIONS = ["good", "fair", "poor"];

export function buildImport(src) {
  const items = src.items ?? [], movements = [...(src.movements ?? [])].sort((a, b) => String(a.at).localeCompare(String(b.at)) || String(a.id).localeCompare(String(b.id), "en", { numeric: true }));
  const out = { vendors: [], stockItems: [], stockMovements: [], assets: [], events: [], maintenance: [], skipped: { reports: 0 } };

  for (const v of src.vendors ?? []) {
    out.vendors.push({ id: v.id, name: v.name, contactPerson: v.contactName ?? "", phone: v.phone ?? "", email: "", gstin: null, address: "", supplies: v.supplies ?? "", terms: v.terms ?? "",
      active: v.status === "active", onHold: v.status === "on-hold", imported: true });
  }

  // ----- stock -----
  const first = movements.length ? dayOf(movements[0].at) : null;
  const opening = first ? addDays(first, -1) : "2026-09-07";
  let sm = 1;
  const addMove = (itemId, kind, qty, date, reason, reference, createdAt) => out.stockMovements.push({ id: `SM-${sm++}`, itemId, kind, qty, date, byPersonId: AARAV, toPersonId: null,
    reason: String(reason).slice(0, 200), reference, createdAt, reverses: null, imported: true });
  for (const i of items) {
    out.stockItems.push({ id: i.id, name: i.name, category: i.category, unit: "unit", reorderLevel: i.reorderLevel, active: true, sku: i.sku, tagged: i.assetType ?? null, imported: true });
    const own = movements.filter((m) => m.sku === i.sku);
    if (i.assetType) {   // a tagged item: one count carried over; its units' movements are the asset history
      const now = i.openingStock + own.reduce((s, m) => s + m.change, 0);
      if (now > 0) addMove(i.id, "in", now, opening, "Count carried over from the old inventory (date not recorded); tagged units are in the asset register", "", `${opening}T04:30:00.000Z`);
      continue;
    }
    if (i.openingStock > 0) addMove(i.id, "in", i.openingStock, opening, "Opening count carried over from the old inventory (date not recorded)", "", `${opening}T04:30:00.000Z`);
    for (const m of own) {
      const ref = String(m.reference ?? "").trim();
      const why = [ref.length >= 3 ? ref : "Imported from the old inventory", String(m.note ?? "").trim()].filter(Boolean).join(": ");
      addMove(i.id, m.change < 0 ? (m.type === "out" ? "out" : "remove") : "in", Math.abs(m.change), dayOf(m.at), why, REF.test(ref) ? ref : "", m.at);
    }
  }

  // ----- assets -----
  const byId = new Map(items.map((i) => [i.sku, i]));
  let fa = 1, ae = 1, mr = 1;
  for (const a of src.assets ?? []) {
    const item = byId.get(a.sku) ?? null;
    const assetId = `FA-${fa++}`;
    const category = OLD_ASSET_CATEGORY[item?.assetType] ?? "other";
    const dep = ASSET_CATEGORIES[category].defaults;   // the category's company default; the price and salvage are for whoever adds the purchase details
    out.assets.push({ id: assetId, tag: a.id, tagEdited: false, name: item?.name ?? a.sku, category, makeModel: item?.name ?? "", serial: "",
      purchaseDate: null, purchasePrice: null, vendorId: null, invoiceRef: "", warrantyUntil: null, usefulLifeYears: dep.usefulLifeYears, salvageValue: null, depreciationMethod: dep.method, wdvRatePercent: dep.wdvRatePercent,
      locationId: IMPORT_HEAD_OFFICE, createdAt: "2026-09-08T00:00:00.000Z", storeRoom: OLD_STORE_LOCATIONS[a.location] ?? null, imported: true });
    let state = null;
    const mine = [];
    const push = (kind, date, atIso, byId, to, extra = {}) => {
      const ev = { id: `AE-${ae++}`, assetId, kind, date, at: atIso, byId, from: state, to, personId: null, condition: null, notes: "", maintenanceId: null, saleValue: null, imported: true, ...extra };
      mine.push(ev); out.events.push(ev); state = to; return ev;
    };
    const openRepair = (date, byId, note) => {
      const rec = { id: `MR-${mr++}`, assetId, date, issue: note, cost: null, vendorId: null, nextServiceDue: null, status: "open", notes: "", openedBy: byId, closedOn: null, closedBy: null, imported: true };
      out.maintenance.push(rec);
      return rec;
    };
    push("added", null, null, null, "in-store", { notes: "Imported from the old register (the date it was added isn't recorded)" });
    const lastAssigned = a.status === "assigned" ? [...(a.history ?? [])].reverse().find((h) => h.action === "assigned") : null;
    for (const h of a.history ?? []) {
      const date = dayOf(h.at);
      // the hand-over in force now is dated by the asset's own "since" (the day it was handed over; the entry's time is when it was recorded)
      if (h.action === "assigned") push("issued", h === lastAssigned && a.since ? a.since : date, h.at, h.byUserId ?? null, "assigned", { personId: h.holderId, notes: h.note ?? "" });
      else if (h.action === "returned") {
        if (state !== "assigned") push("issued", null, null, null, "assigned", { personId: h.holderId, notes: "Start date not recorded in the old register" });
        push("returned", date, h.at, h.byUserId ?? null, "in-store", { personId: h.holderId, notes: h.note ?? "" });
      } else if (h.action === "sent-to-repair") {
        const why = String(h.note ?? "").trim();
        const rec = openRepair(date, h.byUserId ?? null, why.length >= 3 ? why : "Sent for repair");
        push("maintenance-opened", date, h.at, h.byUserId ?? null, "under-maintenance", { maintenanceId: rec.id, notes: h.note ?? "" });
      } else if (h.action === "repaired") {
        const rec = [...out.maintenance].reverse().find((r) => r.assetId === assetId && r.status === "open");
        if (rec) Object.assign(rec, { status: "done", closedOn: date, closedBy: h.byUserId ?? null });
        push("maintenance-closed", date, h.at, h.byUserId ?? null, "in-store", { maintenanceId: rec?.id ?? null, notes: h.note ?? "" });
      } else out.skipped.reports += 1;   // "reported" and "report-closed": problem reports are not part of the lifecycle
    }
    // the old status is the truth about today: make the last state agree with it
    if (a.status === "assigned" && state !== "assigned") push("issued", a.since ?? null, null, null, "assigned", { personId: a.holderId });
    else if (a.status === "in-repair" && state !== "under-maintenance") {
      const rec = openRepair(null, null, "Sent for repair (the date isn't recorded)");
      push("maintenance-opened", null, null, null, "under-maintenance", { maintenanceId: rec.id });
    } else if (a.status === "available" && state !== "in-store") push(state === "assigned" ? "returned" : "maintenance-closed", null, null, null, "in-store", { personId: state === "assigned" ? a.holderId ?? null : null });
    if (CONDITIONS.includes(a.condition)) mine.at(-1).condition = a.condition;
  }
  return out;
}