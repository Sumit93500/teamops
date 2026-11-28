// data/import-assets.js (I2, 2026-11-28): two import forms for the custodian (IT; the Admin): the asset register and the stock ledger's
// opening balances. The engine (data/import-engine.js) reads and checks the file; these say what each column must hold and how one good row
// is saved, through the stores' own writers, so every rule of the Add asset and Stock movements dialogs holds here too.
//   ASSETS_FORM (import:assets)   one row per asset, create only: Name, Category, Make and model, Serial number (unique on the register and
//                                 in the file), Purchase date (not in the future), Purchase price, Vendor (an active vendor), Invoice
//                                 reference, Warranty end (not before the purchase), Office (an active office). Saved by asset-register.js
//                                 addAsset (the tag is the next free AST-nnnn; the depreciation is the category's default). Access cards
//                                 are stock items, never assets.
//   STOCK_OPENING_FORM (import:stock-opening)   one row per item: Item (a new item, or one with no movement yet), Category, Unit and
//                                 Reorder level (for a new item), Opening quantity, As of (not in the future), Reference. Saved as the item
//                                 (stock-ledger.js addStockItem, when new) and ONE stock-in movement, reason "Opening balance (imported)".
//                                 An item that already has movements has its opening count: record a stock in instead.
// Both: good rows (a row with a problem is skipped and listed); the history keeps a generic file name, never the uploaded one.
import { listAssets, vendorsFor, addAsset } from "./asset-register.js";
import { stockItems, stockMovements, addStockItem, recordStockMovement } from "./stock-ledger.js";
import { getOffices } from "./offices-store.js";
import { ASSET_CATEGORIES, STOCK_CATEGORIES, isStockOnlyCategory, money, qtyHundredths, MAX_QTY } from "./asset-rules.js";
import { readDate, displayDate, lower, ok, bad, plain, readAmount, officeToday } from "./import-common.js";

const byName = (list, v, ...keys) => list.find((x) => keys.some((k) => lower(x[k]) === lower(v)));
const textCol = (label, min, max) => (v) => (v.length < min || v.length > max ? bad(min ? `use ${min} to ${max} characters` : `use up to ${max} characters`, "length") : /[<>]/.test(v) ? bad("can't contain < or >", "characters") : ok(v));
const pastDate = (v, ctx) => {
  const d = readDate(v);
  if (!d) return bad("not a date: write it like 2026-11-02", "not a date");
  if (d < "1990-01-01") return bad("before 1990", "too early");
  if (d > ctx.today) return bad("can't be in the future", "in the future");
  return ok(d);
};
const anyDate = (v) => { const d = readDate(v); return d && d >= "1990-01-01" && d <= "2100-12-31" ? ok(d) : bad("not a date: write it like 2027-11-02", "not a date"); };
const categoryOf = (cats, v) => Object.entries(cats).find(([k, c]) => lower(k) === lower(v) || lower(c.label) === lower(v))?.[0] ?? null;

// ---------- the asset register ----------
function assetContext(actor, now = Date.now()) {
  const assets = listAssets(actor.id);
  return {
    actor, today: officeToday(now),
    offices: getOffices().filter((o) => o.active !== false),
    vendors: vendorsFor(actor.id).filter((x) => x.active),
    serials: new Map(assets.filter((a) => a.serial).map((a) => [lower(a.serial), a.name])),
  };
}

const ASSET_COLUMNS = [
  { key: "name", header: "Name", required: true, help: "2 to 80 characters, like Dell Latitude 5440.", validate: textCol("", 2, 80) },
  { key: "category", header: "Category", required: true, help: Object.values(ASSET_CATEGORIES).map((c) => c.label).join(", "),
    validate: (v) => (isStockOnlyCategory(v) || lower(v) === "access card" ? bad("access cards are stock items: import them as stock opening balances", "stock item")
      : categoryOf(ASSET_CATEGORIES, v) ? ok(categoryOf(ASSET_CATEGORIES, v)) : bad(`use one of ${Object.values(ASSET_CATEGORIES).map((c) => c.label).join(", ")}`, "unknown category")) },
  { key: "makeModel", header: "Make and model", required: false, help: "Optional, up to 80 characters.", validate: textCol("", 0, 80) },
  { key: "serial", header: "Serial number", required: false, help: "Optional; unique on the register.", validate: textCol("", 0, 40) },
  { key: "purchaseDate", header: "Purchase date", required: true, help: "Like 2026-11-02 (or 02-11-2026, day first); not in the future.", validate: pastDate },
  { key: "purchasePrice", header: "Purchase price", required: true, help: "In rupees, like 85000 or 85,000.50.",
    validate: (v) => { const a = readAmount(v); const m = a === null ? null : money(a, "Purchase price"); return !m || m.error ? bad("an amount in rupees, like 85000 (at most 2 decimals)", "not an amount") : ok(m.value); } },
  { key: "vendor", header: "Vendor", required: false, help: "Optional: an active vendor's name.",
    validate: (v, ctx) => { const x = byName(ctx.vendors, v, "name"); return x ? ok(x.id) : bad(`no active vendor called "${v}"`, "unknown vendor"); } },
  { key: "invoiceRef", header: "Invoice reference", required: false, help: "Optional, up to 40 characters.", validate: textCol("", 0, 40) },
  { key: "warrantyUntil", header: "Warranty end", required: false, help: "Optional; not before the purchase date.", validate: anyDate },
  { key: "office", header: "Office", required: true, help: "An active office's name.",
    validate: (v, ctx) => { const o = byName(ctx.offices, v, "name", "id"); return o ? ok(o.id) : bad(`no active office called "${v}"`, "unknown office"); } },
];

function assetCheckRow(v) {
  if (v.warrantyUntil && v.purchaseDate && v.warrantyUntil < v.purchaseDate) return { column: "Warranty end", message: "before the purchase date", reason: "warranty before purchase" };
  return null;
}

function assetApplyRow(actor, v, ctx, now) {
  const fields = { name: v.name, category: v.category, makeModel: v.makeModel ?? "", serial: v.serial ?? "", purchaseDate: v.purchaseDate, purchasePrice: v.purchasePrice,
    vendorId: v.vendor ?? "", invoiceRef: v.invoiceRef ?? "", warrantyUntil: v.warrantyUntil ?? "", locationId: v.office };
  const r = addAsset(actor.id, fields, now);
  return r.ok ? { ok: true, record: { id: r.record.id, name: r.record.name, tag: r.record.tag } } : { ok: false, error: plain(r.error) };
}

function assetExample(ctx) {
  return { name: "Dell Latitude 5440", category: ASSET_CATEGORIES.laptop.label, makeModel: "Dell Latitude 5440", serial: "", purchaseDate: ctx.today, purchasePrice: "85000",
    vendor: ctx.vendors[0]?.name ?? "", invoiceRef: "INV-2026-114", warrantyUntil: "", office: ctx.offices.find((o) => o.type === "head")?.name ?? ctx.offices[0]?.name ?? "" };
}

function assetNotes(ctx, actor, cols) {
  return [
    "Delete the EXAMPLE row and these notes, or leave them: they are never imported.",
    `Required: ${cols.filter((c) => c.required).map((c) => c.header).join(", ")}.`,
    `Categories: ${Object.values(ASSET_CATEGORIES).map((c) => c.label).join(", ")}. Access cards are stock items: use the stock opening balances import.`,
    `Offices: ${ctx.offices.map((o) => o.name).join(", ")}.`,
    `Vendors (optional): ${ctx.vendors.map((x) => x.name).join(", ") || "none yet"}.`,
    "Dates: YYYY-MM-DD, like 2026-11-02 (02-11-2026 is read day first). The purchase date can't be in the future.",
    "Each asset gets the next free tag (AST-0001 ...) and its category's depreciation; it starts in store.",
    "At most 1,000 rows and 2 MB per file. Save as CSV UTF-8 or .xlsx.",
  ];
}

export const ASSETS_FORM = Object.freeze({
  id: "assets", label: "Assets", permission: "import:assets", mode: "good-rows", maxRows: 1000, genericName: true,
  columns: ASSET_COLUMNS, unique: [{ key: "serial", existing: (ctx) => ctx.serials, onRecord: (name) => `already on the register (${name})` }],
  maySensitive: () => false, context: assetContext, checkRow: assetCheckRow, applyRow: assetApplyRow, example: assetExample, notes: assetNotes,
});

// ---------- the stock ledger's opening balances ----------
function stockContext(actor, now = Date.now()) {
  const items = stockItems(actor.id);
  const moved = new Set(stockMovements(actor.id).map((m) => m.itemId));
  return { actor, today: officeToday(now), items, moved, units: [...new Set(items.map((i) => i.unit))] };
}

const STOCK_COLUMNS = [
  { key: "item", header: "Item", required: true, help: "A new item's name, or an item with no movement yet.",
    validate: (v, ctx) => {
      const r = textCol("", 2, 80)(v);
      if (r.error) return r;
      const found = byName(ctx.items, v, "name");
      if (!found) return ok(v);
      if (ctx.moved.has(found.id)) return bad("already has stock movements, so its opening count is on record: record a stock in instead", "has movements");
      if (found.active === false) return bad("is no longer in use", "inactive item");
      return ok(v);
    } },
  { key: "category", header: "Category", required: false, help: `For a new item: ${Object.values(STOCK_CATEGORIES).map((c) => c.label).join(", ")}.`,
    validate: (v) => (categoryOf(STOCK_CATEGORIES, v) ? ok(categoryOf(STOCK_CATEGORIES, v)) : bad(`use one of ${Object.values(STOCK_CATEGORIES).map((c) => c.label).join(", ")}`, "unknown category")) },
  { key: "unit", header: "Unit", required: false, help: "For a new item: like piece, ream, box (up to 20 characters).", validate: textCol("", 1, 20) },
  { key: "reorderLevel", header: "Reorder level", required: false, help: "For a new item, optional: 0 or more, at most 2 decimals.",
    validate: (v) => (v === "0" || qtyHundredths(v.replace(/,/g, "")) !== null ? ok(v.replace(/,/g, "")) : bad(`a number from 0 to ${MAX_QTY.toLocaleString("en-IN")}, at most 2 decimals`, "not a number")) },
  { key: "quantity", header: "Opening quantity", required: true, help: "More than 0, at most 2 decimals.",
    validate: (v) => (qtyHundredths(v.replace(/,/g, "")) !== null ? ok(v.replace(/,/g, "")) : bad(`more than 0, up to ${MAX_QTY.toLocaleString("en-IN")}, at most 2 decimals`, "not a quantity")) },
  { key: "asOf", header: "As of", required: true, help: "The day of the count, like 2026-11-01; not in the future.", validate: pastDate },
  { key: "reference", header: "Reference", required: false, help: "Optional: the stock-take sheet or invoice, up to 40 characters.", validate: textCol("", 0, 40) },
];

function stockCheckRow(v, ctx) {
  const found = byName(ctx.items, v.item, "name");
  if (found) {
    if (v.category && v.category !== found.category) return { column: "Category", message: `the item is already on record as ${STOCK_CATEGORIES[found.category]?.label ?? found.category}: leave it empty`, reason: "differs from record" };
    if (v.unit && lower(v.unit) !== lower(found.unit)) return { column: "Unit", message: `the item is already counted in "${found.unit}": leave it empty`, reason: "differs from record" };
    return null;
  }
  if (!v.category) return { column: "Category", message: "required for a new item", reason: "required" };
  if (!v.unit) return { column: "Unit", message: "required for a new item", reason: "required" };
  return null;
}

function stockApplyRow(actor, v, ctx, now) {
  let item = byName(stockItems(actor.id), v.item, "name");
  if (!item) {
    const made = addStockItem(actor.id, { name: v.item, category: v.category, unit: v.unit, reorderLevel: v.reorderLevel ?? 0 }, now);
    if (!made.ok) return { ok: false, error: plain(made.error) };
    item = made.record;
  }
  const moved = recordStockMovement(actor.id, { itemId: item.id, kind: "in", qty: v.quantity, date: v.asOf, reason: "Opening balance (imported)", reference: v.reference ?? "" }, now);
  return moved.ok ? { ok: true, record: { id: item.id, name: item.name, qty: moved.record.qty, unit: item.unit } } : { ok: false, error: plain(moved.error) };
}

function stockExample(ctx) {
  return { item: "A4 paper, 75 gsm", category: STOCK_CATEGORIES.stationery.label, unit: "ream", reorderLevel: "10", quantity: "40", asOf: ctx.today, reference: "Stock-take Nov" };
}

function stockNotes(ctx, actor, cols) {
  const fresh = ctx.items.filter((i) => !ctx.moved.has(i.id) && i.active !== false).map((i) => i.name);
  return [
    "Delete the EXAMPLE row and these notes, or leave them: they are never imported.",
    `Required: ${cols.filter((c) => c.required).map((c) => c.header).join(", ")}. A new item also needs its Category and Unit.`,
    `Categories: ${Object.values(STOCK_CATEGORIES).map((c) => c.label).join(", ")}.`,
    `Items on record with no movement yet: ${fresh.join(", ") || "none"}. An item that already has movements can't take an opening balance.`,
    "As of: the day of the count, YYYY-MM-DD, like 2026-11-01 (not in the future).",
    "Each row becomes one stock in, with the reason \"Opening balance (imported)\".",
    "At most 1,000 rows and 2 MB per file. Save as CSV UTF-8 or .xlsx.",
  ];
}

export const STOCK_OPENING_FORM = Object.freeze({
  id: "stock-opening", label: "Stock opening balances", permission: "import:stock-opening", mode: "good-rows", maxRows: 1000, genericName: true,
  columns: STOCK_COLUMNS, unique: [{ key: "item", existing: () => new Map() }],
  maySensitive: () => false, context: stockContext, checkRow: stockCheckRow, applyRow: stockApplyRow, example: stockExample, notes: stockNotes,
});

export { displayDate };