// data/inventory-store.js
// Items, the stock ledger, the asset register and vendors, kept in
// localStorage through data/collection.js. Pages record movements, assign and
// return assets and read through here; the rules (categories, locations, how
// stock status and value are worked out) are in data/inventory.js.
//
// An item: { id, sku, name, category, assetType (a key of ASSET_TYPES for a
// tagged item, else null), reorderLevel, unitPrice (whole rupees), location,
// openingStock }. Its stock is never stored: it is openingStock (the count
// before the first movement on record) plus every movement's change, so the
// figure can't disagree with the ledger.
//
// A movement: { id, sku, type, change (signed units), at, recordedBy,
// reference, note, department (a department code for stock issued to one, or
// null), assetTag, holderId (both null unless the movement moved a tagged
// asset) }. Movements are only ever added: nothing here edits or deletes one,
// and a mistake is put right with an adjustment.
//
// An asset: { id (its tag, e.g. "AST-0188"), sku (the item it is a unit of),
// condition, status, holderId, since ("YYYY-MM-DD" while assigned, else null),
// location (while available, else null), history }. history entries are
// { action, at, byUserId, holderId, movementId, note }, action "assigned",
// "returned", "sent-to-repair" or "repaired", or, for a problem report (no
// movement, movementId null), "reported" (by the holder) or "report-closed"
// (by an Admin). Assets assigned before the register was kept have no
// entries; their `since` says when.
//
// Tagged assets are units of their item: an available asset is counted in
// its item's stock, so assigning one is a stock-out and taking one back is a
// return. An assigned asset or one in repair is out of stock. A tagged item's
// units therefore leave and come back through the asset functions, never as a
// plain stock-out or return.
//
// Who may do what (permissions.js; today only Admin holds these):
//   recordMovement                              inventory:create
//   assignAsset, returnAsset, sendForRepair,
//   returnFromRepair, closeReport               assets:assign
//   reportProblem (the asset's holder only)     assets:report (everyone)
//
// The Reset demo data button (users-list.js) calls resetInventoryData().

import { createCollection, fail } from "./collection.js";
import { getUser, getDepartment } from "./store.js";
import { dayNumber } from "./holidays.js";
import { ROLES } from "../config/roles.js";
import {
  CATEGORY_KEYS, ASSET_TYPE_KEYS, LOCATIONS, CONDITIONS, ASSET_STATUSES, ASSET_STATUS_KEYS, MOVEMENT_TYPES,
  STOCK_STATUS_KEYS, changeFor, stockStatus, stockValue, needsReorder,
} from "./inventory.js";

// ---------- seed ----------

// From the static inventory pages, with real people only. Every inventory job
// is an Admin's (Aarav Mehta), not the Store Keeper's: no other role holds the
// inventory permissions. The seven items and their reorder levels, prices and
// locations are items.html's; the opening stock is what makes today's stock
// come out at the page's figures after the movements below. The five older
// IT items exist so every tagged asset is a unit of an item; their prices and
// counts are new.
const SEED_ITEMS = [
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

const AARAV = "EMP-1001";
// The pages' times are office times in India (UTC+05:30); stored, like every
// history time, as the instant (an ISO string in UTC), so 16:40 is "...T11:10:00.000Z".
const at = (date, time) => new Date(`${date}T${time}:00+05:30`).toISOString();
const moved = (id, date, time, sku, type, change, reference, extra = {}) => ({
  id, sku, type, change, at: at(date, time), recordedBy: AARAV, reference, note: "", department: null, assetTag: null, holderId: null, ...extra,
});

// stock-movements.html's seven rows, plus the repair that put AST-0099 with
// the vendor (8 Sep) and the coffee used since the 15 Sep delivery (22 Sep),
// without which the page's figures don't add up. The laptop that went out on
// 18 Sep is AST-0217, now Sneha Rao's: the one Divya Menon returned on 14 Sep.
const SEED_MOVEMENTS = [
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

// asset-assignment.html's and my-assets.html's assets. Arjun's access card
// (AST-0455) is my-assets.html's; AST-0217 is Sneha's (see above). AST-0218
// is one of the six Latitude 5440s in the store, tagged and ready to assign:
// still counted in IT-1021's stock until it is handed over.
const entry = (action, date, time, holderId, movementId, note = "") => ({ action, at: at(date, time), byUserId: AARAV, holderId, movementId, note });
const SEED_ASSETS = [
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

// vendors.html's five vendors. Their contacts are people at the vendor, not
// users. No open-order count: there are no purchase orders to count.
const SEED_VENDORS = [
  { id: "VEN-1", name: "Sharma Office Supplies", contactName: "Rajiv Sharma",  phone: "+91 98110 22334", supplies: "Stationery, pantry",   terms: "Net 30 days",     status: "active" },
  { id: "VEN-2", name: "TechNova Distributors",  contactName: "Meenal Kapoor", phone: "+91 98180 45521", supplies: "Laptops, accessories", terms: "Net 45 days",     status: "active" },
  { id: "VEN-3", name: "FurniCraft India",       contactName: "Sanjay Bhatia", phone: "+91 99101 87650", supplies: "Office furniture",     terms: "Net 30 days",     status: "active" },
  { id: "VEN-4", name: "CoolAir Services",       contactName: "Amit Verma",    phone: "+91 98730 11098", supplies: "AC maintenance",       terms: "Yearly contract", status: "active" },
  { id: "VEN-5", name: "QuickPrint Solutions",   contactName: "Neeraj Jain",   phone: "+91 98999 30412", supplies: "Printing, id cards",   terms: "Advance payment", status: "on-hold" },
];

const items = createCollection({ key: "inventory-items", version: 1, seed: () => SEED_ITEMS, idPrefix: "ITM-" });
const movements = createCollection({ key: "stock-movements", version: 1, seed: () => SEED_MOVEMENTS, idPrefix: "MOV-" });
const assets = createCollection({ key: "assets", version: 1, seed: () => SEED_ASSETS, idPrefix: "AST-" });
const vendors = createCollection({ key: "vendors", version: 1, seed: () => SEED_VENDORS, idPrefix: "VEN-" });

// ---------- small helpers ----------

const pad = (n) => String(n).padStart(2, "0");

// Today's date where the person is (local calendar), as ISO.
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const roleCan = (roleKey, permission) => Boolean(ROLES[roleKey]?.permissions.includes(permission));
const isActive = (user) => Boolean(user) && user.status !== "inactive";

// The acting person, if they are active and their role holds the permission; else null.
function actorWith(userId, permission) {
  const user = getUser(userId);
  return isActive(user) && roleCan(user.role, permission) ? user : null;
}

const itemBySku = (sku) => items.getAll().find((i) => i.sku === sku) ?? null;

// Every item's net movement, by SKU.
function movedBySku() {
  const out = {};
  for (const m of movements.getAll()) out[m.sku] = (out[m.sku] ?? 0) + m.change;
  return out;
}

// An item with its stock, status and value worked out from the ledger.
function withStock(item, moved) {
  const stock = item.openingStock + (moved[item.sku] ?? 0);
  return { ...item, stock, status: stockStatus(stock, item.reorderLevel), value: stockValue(stock, item.unitPrice) };
}

const availableTagged = (sku) => assets.getAll().filter((a) => a.sku === sku && a.status === "available").length;

const ASSET_REFERENCE = { assigned: "Assigned", returned: "Returned", "sent-to-repair": "Sent for repair", repaired: "Back from repair" };
// Is this one of the list's own keys? (Not an inherited name like "constructor".)
const listed = (list, key) => Object.hasOwn(list, key);
const statusWord = (status) => ASSET_STATUSES[status]?.label.toLowerCase() ?? status;

// Adds a tagged asset's movement and then changes the asset. If the asset
// can't be saved, the movement just added is taken back out, so the ledger
// never shows a move that didn't happen.
function moveAsset(asset, action, actor, change, holderId, changes, note = "") {
  const now = new Date().toISOString();
  let movementId = null;
  if (change !== 0) {
    const type = change < 0 ? "out" : "return";
    const added = movements.add({ sku: asset.sku, type, change, at: now, recordedBy: actor.id, reference: ASSET_REFERENCE[action], note: "",
      department: null, assetTag: asset.id, holderId });
    if (!added.ok) return added;
    movementId = added.record.id;
  }
  const history = [...asset.history, { action, at: now, byUserId: actor.id, holderId, movementId, note }];
  const result = assets.update(asset.id, { ...changes, history });
  if (!result.ok && movementId) movements.remove(movementId);
  return result;
}

// ---------- writes: the stock ledger ----------

// fields: { sku, type, quantity, reference, note, department }. Anything else
// is ignored. quantity is a whole number of at least 1 for in / out / return;
// for an adjustment, the signed correction (not 0). department (a department
// code) only on a stock-out issued to a department.
export function recordMovement(actorUserId, fields = {}) {
  const actor = actorWith(actorUserId, "inventory:create");
  if (!actor) return fail("You can't record stock movements.");

  const item = itemBySku(String(fields.sku ?? ""));
  if (!item) return fail("Choose an item.", "sku");
  const type = String(fields.type ?? "");
  if (!listed(MOVEMENT_TYPES, type)) return fail("Choose a movement type.", "type");
  if (item.assetType && (type === "out" || type === "return")) {
    return fail(`${item.name} is tagged: assign or take back the asset on the asset register instead.`, "type");
  }
  const quantity = typeof fields.quantity === "number" ? fields.quantity : Number(String(fields.quantity ?? "").trim() || NaN);
  const change = changeFor(type, quantity);
  if (change === null) {
    return fail(type === "adjustment" ? "Enter a whole number other than 0 (below 0 takes stock away)." : "Enter a whole number of units, at least 1.", "quantity");
  }
  const reference = String(fields.reference ?? "").trim();
  if (!reference) return fail("Reference is required.", "reference");
  const note = String(fields.note ?? "").trim();
  const department = String(fields.department ?? "").trim() || null;
  if (department && type !== "out") return fail("Only stock going out can be issued to a department.", "department");
  if (department && !getDepartment(department)) return fail("Choose a department from the list.", "department");

  const stock = withStock(item, movedBySku()).stock;
  if (stock + change < 0) return fail(`Only ${stock} in stock.`, "quantity");
  const tagged = item.assetType ? availableTagged(item.sku) : 0;
  if (stock + change < tagged) {
    return fail(`${tagged} tagged ${tagged === 1 ? "asset is" : "assets are"} available, so stock can't go below ${tagged}.`, "quantity");
  }

  return movements.add({ sku: item.sku, type, change, at: new Date().toISOString(), recordedBy: actor.id, reference, note, department,
    assetTag: null, holderId: null });
}

// ---------- writes: the asset register ----------

// Hands an available asset to an active person. fields: { holderId, date
// (the day it was handed over, today or earlier; default today), condition
// (default: as it is) }. A stock-out of one unit of its item.
export function assignAsset(actorUserId, tag, fields = {}) {
  const actor = actorWith(actorUserId, "assets:assign");
  if (!actor) return fail("You can't assign assets.");
  const asset = assets.get(tag);
  if (!asset) return fail(`No asset ${tag}.`);
  if (asset.status !== "available") return fail(`${tag} is ${statusWord(asset.status)}, not available.`);
  const holder = getUser(String(fields.holderId ?? ""));
  if (!holder) return fail("Choose an employee.", "holderId");
  if (!isActive(holder)) return fail(`${holder.name} is inactive and can't be given an asset.`, "holderId");
  const date = String(fields.date ?? "").trim() || todayIso();
  if (dayNumber(date) === null) return fail("Pick a valid date.", "date");
  if (dayNumber(date) > dayNumber(todayIso())) return fail("The date can't be in the future.", "date");
  const condition = fields.condition === undefined ? asset.condition : String(fields.condition);
  if (!listed(CONDITIONS, condition)) return fail("Choose a condition.", "condition");
  const item = itemBySku(asset.sku);
  if (!item || withStock(item, movedBySku()).stock < 1) return fail(`No unit of ${asset.sku} is in stock to assign.`);

  return moveAsset(asset, "assigned", actor, -1, holder.id, { status: "assigned", holderId: holder.id, since: date, location: null, condition });
}

// Takes an assigned asset back into the store (also from someone who has
// since left). fields: { condition, location }. A return of one unit.
export function returnAsset(actorUserId, tag, fields = {}) {
  const actor = actorWith(actorUserId, "assets:assign");
  if (!actor) return fail("You can't take back assets.");
  const asset = assets.get(tag);
  if (!asset) return fail(`No asset ${tag}.`);
  if (asset.status !== "assigned") return fail(`${tag} is ${statusWord(asset.status)}, not assigned.`);
  const condition = String(fields.condition ?? "");
  if (!listed(CONDITIONS, condition)) return fail("Choose a condition.", "condition");
  const location = String(fields.location ?? "");
  if (!listed(LOCATIONS, location)) return fail("Choose a location.", "location");

  return moveAsset(asset, "returned", actor, 1, asset.holderId, { status: "available", holderId: null, since: null, location, condition });
}

// Sends an available or assigned asset to the vendor. note (required) says
// what's wrong. From the store it is a stock-out; from a person it was
// already out of stock, so nothing moves.
export function sendForRepair(actorUserId, tag, note = "") {
  const actor = actorWith(actorUserId, "assets:assign");
  if (!actor) return fail("You can't send assets for repair.");
  const asset = assets.get(tag);
  if (!asset) return fail(`No asset ${tag}.`);
  if (asset.status === "in-repair") return fail(`${tag} is already in repair.`);
  const text = String(note ?? "").trim();
  if (!text) return fail("Say what's wrong with it.", "note");
  if (asset.status === "available") {
    const item = itemBySku(asset.sku);
    if (!item || withStock(item, movedBySku()).stock < 1) return fail(`No unit of ${asset.sku} is in stock.`);
  }
  const change = asset.status === "available" ? -1 : 0;
  return moveAsset(asset, "sent-to-repair", actor, change, asset.holderId, { status: "in-repair", holderId: null, since: null, location: null }, text);
}

// Brings an asset back from repair into the store. fields: { condition,
// location }. A return of one unit.
export function returnFromRepair(actorUserId, tag, fields = {}) {
  const actor = actorWith(actorUserId, "assets:assign");
  if (!actor) return fail("You can't take back assets.");
  const asset = assets.get(tag);
  if (!asset) return fail(`No asset ${tag}.`);
  if (asset.status !== "in-repair") return fail(`${tag} is ${statusWord(asset.status)}, not in repair.`);
  const condition = String(fields.condition ?? "");
  if (!listed(CONDITIONS, condition)) return fail("Choose a condition.", "condition");
  const location = String(fields.location ?? "");
  if (!listed(LOCATIONS, location)) return fail("Choose a location.", "location");

  return moveAsset(asset, "repaired", actor, 1, null, { status: "available", location, condition });
}

// ---------- writes: problem reports ----------

// The person holding an asset says something is wrong with it. note (required)
// says what. One open report per asset; it changes neither the asset's status
// nor its condition, and moves no stock.
export function reportProblem(userId, tag, note = "") {
  const user = actorWith(userId, "assets:report");
  if (!user) return fail("You can't report problems with equipment.");
  if (!String(tag ?? "")) return fail("Choose an asset.", "tag");
  const asset = assets.get(tag);
  if (!asset || asset.status !== "assigned" || asset.holderId !== user.id) return fail("You can only report a problem with equipment assigned to you.", "tag");
  if (openReportOf(asset)) return fail(`You've already reported a problem with ${tag}. An Admin will look at it.`, "tag");
  const text = String(note ?? "").trim();
  if (!text) return fail("Say what's wrong with it.", "note");
  return moveAsset(asset, "reported", user, 0, user.id, {}, text);
}

// An Admin closes an open report without returning or repairing the asset.
// note (required) says what was done. (Taking the asset back or sending it
// for repair closes the report too, through returnAsset / sendForRepair.)
export function closeReport(actorUserId, tag, note = "") {
  const actor = actorWith(actorUserId, "assets:assign");
  if (!actor) return fail("You can't close problem reports.");
  const asset = assets.get(tag);
  if (!asset) return fail(`No asset ${tag}.`);
  if (!openReportOf(asset)) return fail(`${tag} has no open problem report.`);
  const text = String(note ?? "").trim();
  if (!text) return fail("Say what was done about it.", "note");
  return moveAsset(asset, "report-closed", actor, 0, asset.holderId, {}, text);
}

// ---------- reads: items and stock (always deep copies) ----------

// Every item with { stock, status, value } worked out from the ledger.
export function allItems() {
  const moved = movedBySku();
  return items.getAll().map((i) => withStock(i, moved));
}

export function getItem(sku) {
  const item = itemBySku(sku);
  return item ? withStock(item, movedBySku()) : null;
}

// The units of this item in stock now, or null for an unknown SKU.
export function stockOf(sku) {
  return getItem(sku)?.stock ?? null;
}

const newestFirst = (a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id, "en", { numeric: true });

// Every movement, newest first.
export function allMovements() {
  return movements.getAll().sort(newestFirst);
}

export function movementsFor(sku) {
  return allMovements().filter((m) => m.sku === sku);
}

// The items low or out of stock, emptiest first (stock against reorder level).
export function reorderAlerts() {
  return allItems().filter((i) => needsReorder(i.status))
    .sort((a, b) => a.stock / a.reorderLevel - b.stock / b.reorderLevel || a.sku.localeCompare(b.sku, "en", { numeric: true }));
}

const blankStock = () => ({ items: 0, units: 0, value: 0 });

// Over any list of items from allItems(): how many items, units and how much
// stock value, overall and by category, and how many items in each stock
// status (every category and status is present, at 0 if none).
export function inventoryTotals(list) {
  const out = {
    ...blankStock(),
    byCategory: Object.fromEntries(CATEGORY_KEYS.map((c) => [c, blankStock()])),
    byStatus: Object.fromEntries(STOCK_STATUS_KEYS.map((s) => [s, 0])),
  };
  for (const i of list) {
    for (const t of [out, out.byCategory[i.category]]) {
      if (!t) continue;
      t.items += 1;
      t.units += i.stock;
      t.value += i.value;
    }
    if (i.status in out.byStatus) out.byStatus[i.status] += 1;
  }
  return out;
}

// ---------- reads: assets ----------

export function allAssets() {
  return assets.getAll();
}

export function getAsset(tag) {
  return assets.get(tag);
}

// The assets assigned to this person now.
export function assetsFor(userId) {
  return assets.getAll().filter((a) => a.status === "assigned" && a.holderId === userId);
}

// The asset's type (a key of ASSET_TYPES), from its item; null if the item is gone.
export function assetTypeOf(asset) {
  return (asset && itemBySku(asset.sku)?.assetType) ?? null;
}

// Assets still assigned to someone inactive or no longer on the list. Not
// prevented (people may leave holding equipment); pages warn about them.
export function assetsHeldByInactive() {
  return assets.getAll().filter((a) => a.status === "assigned" && !isActive(getUser(a.holderId)));
}

// Actions that settle a problem report: an Admin closing it, or the asset
// leaving its holder (taken back, or sent for repair).
const CLOSES_REPORT = ["report-closed", "returned", "sent-to-repair"];

// The asset's open problem report (its "reported" history entry), or null.
// Worked out from the history, never stored, so it can't disagree with it.
export function openReportOf(asset) {
  for (const entry of [...(asset?.history ?? [])].reverse()) {
    if (entry.action === "reported") return entry;
    if (CLOSES_REPORT.includes(entry.action)) return null;
  }
  return null;
}

// Assets with an open problem report, oldest report first.
export function assetsWithOpenReports() {
  return assets.getAll().filter((a) => openReportOf(a)).sort((a, b) => openReportOf(a).at.localeCompare(openReportOf(b).at));
}

// Over any list of assets: how many, by status and by type (every status and
// type is present, at 0 if none).
export function assetTotals(list) {
  const out = {
    total: 0,
    byStatus: Object.fromEntries(ASSET_STATUS_KEYS.map((s) => [s, 0])),
    byType: Object.fromEntries(ASSET_TYPE_KEYS.map((t) => [t, 0])),
  };
  for (const a of list) {
    out.total += 1;
    if (a.status in out.byStatus) out.byStatus[a.status] += 1;
    const type = assetTypeOf(a);
    if (type in out.byType) out.byType[type] += 1;
  }
  return out;
}

// ---------- reads: vendors ----------

export function allVendors() {
  return vendors.getAll();
}

export function getVendor(id) {
  return vendors.get(id);
}

// ---------- reset ----------

// Throws away every change to items, stock movements, assets and vendors in this browser.
export function resetInventoryData() {
  items.reset();
  movements.reset();
  assets.reset();
  vendors.reset();
}