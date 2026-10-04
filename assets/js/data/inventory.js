// data/inventory.js
// The inventory rules, as lists and pure functions: item categories, asset
// types, store locations, conditions, the kinds of stock movement, and how an
// item's stock status, bar and value are worked out. Nothing here reads
// storage, users or the clock; data/inventory-store.js keeps the items, the
// stock ledger, the asset register and the vendors, and calls these.
//
// All amounts are whole rupees; all quantities whole units.

// The four categories items.html shows (its tabs and its value chart). One
// list: asset types below are a property of IT-equipment items, not a second
// set of categories.
export const CATEGORIES = {
  it:         { label: "IT equipment" },
  furniture:  { label: "Furniture" },
  stationery: { label: "Stationery" },
  pantry:     { label: "Pantry" },
};
export const CATEGORY_KEYS = Object.keys(CATEGORIES);

// What a tagged item is. Only IT equipment is tagged; everything else (and IT
// equipment like cables and keyboards) is counted, not tagged.
export const ASSET_TYPES = {
  laptop:        { label: "Laptop" },
  monitor:       { label: "Monitor" },
  "access-card": { label: "Access card" },
};
export const ASSET_TYPE_KEYS = Object.keys(ASSET_TYPES);
export const TAGGED_CATEGORY = "it";

// Where stock is kept: a fixed list, not free text. An asset in repair has no
// location here; it is with the vendor.
export const LOCATIONS = {
  "store-a":   { label: "Store room A" },
  "store-b":   { label: "Store room B" },
  warehouse:   { label: "Warehouse" },
  pantry:      { label: "Pantry store" },
};
export const LOCATION_KEYS = Object.keys(LOCATIONS);

export const CONDITIONS = {
  good: { label: "Good" },
  fair: { label: "Fair" },
  poor: { label: "Poor" },
};
export const CONDITION_KEYS = Object.keys(CONDITIONS);

export const ASSET_STATUSES = {
  available:   { label: "Available" },
  assigned:    { label: "Assigned" },
  "in-repair": { label: "In repair" },
};
export const ASSET_STATUS_KEYS = Object.keys(ASSET_STATUSES);

export const VENDOR_STATUSES = {
  active:    { label: "Active" },
  "on-hold": { label: "On hold" },
};
export const VENDOR_STATUS_KEYS = Object.keys(VENDOR_STATUSES);

// The four kinds of movement stock-movements.html records. In, out and return
// move a whole number of units one way; an adjustment corrects a count either
// way, and is the only way a mistake is put right (movements are never edited
// or deleted).
export const MOVEMENT_TYPES = {
  in:         { label: "Stock in" },
  out:        { label: "Stock out" },
  adjustment: { label: "Adjustment" },
  return:     { label: "Return" },
};
export const MOVEMENT_TYPE_KEYS = Object.keys(MOVEMENT_TYPES);

// The signed change a movement makes to stock, or null if the quantity doesn't
// fit the type: in and return add, out takes away (quantity a whole number of
// at least 1); an adjustment is the signed quantity itself (a whole number,
// not 0).
export function changeFor(type, quantity) {
  if (!Number.isSafeInteger(quantity)) return null;
  if (type === "adjustment") return quantity === 0 ? null : quantity;
  if (quantity < 1) return null;
  if (type === "in" || type === "return") return quantity;
  if (type === "out") return -quantity;
  return null;
}

// An item's stock status, as items.html shows it: out at 0; low below the
// reorder level (exactly at it is still in stock). An item with reorder level
// 0 is no longer reordered (an older model kept for its tagged assets): at 0
// it is "none" (nothing in stock, nothing to reorder), not out.
export const STOCK_STATUSES = {
  in:   { label: "In stock" },
  low:  { label: "Low stock" },
  out:  { label: "Out of stock" },
  none: { label: "Not stocked" },
};
export const STOCK_STATUS_KEYS = Object.keys(STOCK_STATUSES);

export function stockStatus(stock, reorderLevel) {
  if (stock <= 0) return reorderLevel > 0 ? "out" : "none";
  return stock < reorderLevel ? "low" : "in";
}

// Does this status call for a reorder (items.html's "Reorder alerts")?
export const needsReorder = (status) => status === "low" || status === "out";

// The width of items.html's stock bar, in percent: stock against twice the
// reorder level, capped at 100. With no reorder level, any stock is a full bar.
export function stockBarPercent(stock, reorderLevel) {
  if (stock <= 0) return 0;
  if (reorderLevel <= 0) return 100;
  return Math.min(100, (stock / (2 * reorderLevel)) * 100);
}

// Stock value: quantity times the item's current unit price (no costing method).
export const stockValue = (stock, unitPrice) => stock * unitPrice;