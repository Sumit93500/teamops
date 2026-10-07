// ui/inventory-view.js
// How inventory things look on a page: category and status labels, the stock
// status badge, the movement type badge and signed quantity, an asset's
// condition, status and problem-report badges, a vendor's status badge, and
// times in office time. Shared by items.js, stock-movements.js,
// asset-assignment.js, my-assets.js, user-profile.js and vendors.js, so no two
// pages word or colour the same thing differently.

import { CATEGORIES, ASSET_TYPES, STOCK_STATUSES, MOVEMENT_TYPES, CONDITIONS, ASSET_STATUSES, LOCATIONS, VENDOR_STATUSES } from "../data/inventory.js";
import { el, formatDay } from "./leave-view.js";

export const categoryLabel = (key) => CATEGORIES[key]?.label ?? key;
export const assetTypeLabel = (key) => ASSET_TYPES[key]?.label ?? key;
export const stockStatusLabel = (key) => STOCK_STATUSES[key]?.label ?? key;
export const movementTypeLabel = (key) => MOVEMENT_TYPES[key]?.label ?? key;
export const conditionLabel = (key) => CONDITIONS[key]?.label ?? key;
export const assetStatusLabel = (key) => ASSET_STATUSES[key]?.label ?? key;
export const locationLabel = (key) => LOCATIONS[key]?.label ?? key;
export const vendorStatusLabel = (key) => VENDOR_STATUSES[key]?.label ?? key;

// The colours asset-assignment.html and my-assets.html have always used.
const CONDITION_BADGE = { good: "badge badge--success badge--square", fair: "badge badge--warning badge--square", poor: "badge badge--danger badge--square" };
const ASSET_STATUS_BADGE = { assigned: "badge badge--info badge--dot", available: "badge badge--success badge--dot", "in-repair": "badge badge--warning badge--dot" };

export function conditionBadge(condition) {
  return el("span", CONDITION_BADGE[condition] ?? "badge badge--square", conditionLabel(condition));
}

export function assetStatusBadge(status) {
  return el("span", ASSET_STATUS_BADGE[status] ?? "badge badge--dot", assetStatusLabel(status));
}

// An open problem report (data/inventory-store.js's openReportOf()), on
// asset-assignment.html's register: the day and what's wrong in its tooltip.
export function reportBadge(report) {
  const badge = el("span", "badge badge--danger badge--dot", "Problem reported");
  badge.title = `Reported ${formatDay(officeDate(report.at), true)}: ${report.note}`;
  return badge;
}

// The colours vendors.html has always used.
const VENDOR_STATUS_BADGE = { active: "badge badge--success badge--dot", "on-hold": "badge badge--warning badge--dot" };

export function vendorStatusBadge(status) {
  return el("span", VENDOR_STATUS_BADGE[status] ?? "badge badge--dot", vendorStatusLabel(status));
}

// badge.css: success = fine, warning = needs attention, danger = act now; no
// modifier (grey) = nothing to do. The stock cell's colour classes go with them.
const STOCK_LOOK = {
  in:   { badge: "badge badge--success badge--dot", stock: "stock",            bar: "progress progress--sm" },
  low:  { badge: "badge badge--warning badge--dot", stock: "stock stock--low", bar: "progress progress--sm progress--warning" },
  out:  { badge: "badge badge--danger badge--dot",  stock: "stock stock--out", bar: "progress progress--sm progress--danger" },
  none: { badge: "badge badge--dot",                stock: "stock",            bar: "progress progress--sm" },
};
export const stockLook = (status) => STOCK_LOOK[status] ?? STOCK_LOOK.none;

export function stockBadge(status) {
  return el("span", stockLook(status).badge, stockStatusLabel(status));
}

// A tagged item's stock counts every unit, but only its tagged assets that are
// available can be handed out (asset-assignment.html); the rest are untagged
// units, which nothing can assign yet (no tagging: round 6E). How many can be
// assigned, or null when that's every unit in stock (or the item isn't
// tagged, or there's none in stock). assets: allAssets().
export function readyToAssign(item, assets) {
  if (!item.assetType || item.stock <= 0) return null;
  const ready = assets.filter((a) => a.sku === item.sku && a.status === "available").length;
  return ready < item.stock ? ready : null;
}
// The words for it: "tagged and ready to assign" where nothing beside it says
// the item is tagged (stock-movements.html's list and toast); "ready to
// assign" in items.html's category cell, right under its "Tagged: Laptop".
export const READY_WORDS = "tagged and ready to assign";
export const READY_SHORT = "ready to assign";
export const UNTAGGED_TIP = "Untagged units are counted in stock but can't be assigned until they're tagged.";

// The colours stock-movements.html has always used for each type.
const MOVEMENT_BADGE = {
  in: "badge badge--success badge--square",
  out: "badge badge--info badge--square",
  adjustment: "badge badge--warning badge--square",
  return: "badge badge--primary badge--square",
};

export function movementBadge(type) {
  return el("span", MOVEMENT_BADGE[type] ?? "badge badge--square", movementTypeLabel(type));
}

// "+6" in green or "-10" in red.
export function signedQty(change) {
  return el("span", change > 0 ? "qty qty--in" : "qty qty--out", change > 0 ? `+${change}` : String(change));
}

// ---------- office time ----------

// Stock is kept at the office in India, so a movement's time is shown in India
// time (UTC+05:30, no daylight saving) wherever the page is opened: 16:40 on
// the stock-room log reads 16:40 for everyone. Stored times are instants
// (ISO, UTC), as the seed in data/inventory-store.js explains.
const OFFICE_OFFSET_MS = 330 * 60 * 1000;
const pad = (n) => String(n).padStart(2, "0");

function officeParts(timestamp) {
  const d = new Date(Date.parse(timestamp) + OFFICE_OFFSET_MS);
  return { iso: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, year: d.getUTCFullYear(), time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` };
}

// "18 Sep, 16:40" in office time; the year is added when it isn't this year's.
export function officeTime(timestamp) {
  const at = officeParts(timestamp);
  const thisYear = officeParts(new Date().toISOString()).year;
  return `${formatDay(at.iso, at.year !== thisYear)}, ${at.time}`;
}

// The office-time calendar date of a stored instant, as ISO ("2026-09-08").
export const officeDate = (timestamp) => officeParts(timestamp).iso;