// data/stock-ledger.js (AS1, 2026-11-22): consumables and other counted (non-serial) items, and their append-only ledger. Data only: no
// page reads this yet (the screens come next round). The old site's inventory (data/inventory-store.js) is separate and unchanged.
//
// Kept in "officeos:stock-ledger" { version: 1, nextItem, nextMove, items: [item], movements: [movement] }, read through places.js pureBox:
// a read never writes, so until the first write the sample below is what everyone reads and nothing is stored.
//   item      { id "ITM-n", name (unique), category (inventory.js CATEGORIES), unit, reorderLevel, active, sample? }
//   movement  { id "SM-n", itemId, kind: in | out | return | remove, qty (more than 0, at most 2 decimals), date "YYYY-MM-DD", byPersonId,
//               toPersonId (out: who received it, optional; return: who handed it back, required; else null), reason (3-200 characters),
//               reference (a PO or invoice number, or ""), createdAt (ISO), reverses (the id it corrects, or null), sample? }
//
// The rules (asset-rules.js): quantity on hand is never stored; it is the sum of the movements (in and return add, out and remove take away)
// up to a date. Movements are never edited or deleted: a mistake is put right with reverseStockMovement, the opposite movement. Nothing may
// take stock below zero at any point in the ledger's date order (a back-dated issue is checked against the stock on that day and after);
// a person can't hand back more of an item than they were issued, net, at any point. The low-stock list: active items at or under their
// reorder level.
//
// Who (config/permissions.js): stock:view reads the items, the ledger and the low-stock list; stock:move adds and edits items and records
// and reverses movements (the Admin only, until the IT round's role). A person reads what they were issued (issuedTo) without either. Every
// write goes to the audit trail (stock-item-added, stock-item-changed, stock-moved, stock-reversed) with who, the ids and the kind, never more.
//
//   reads   stockItems(viewerId)  getStockItem(viewerId, id)  stockMovements(viewerId, { itemId, personId })  onHand(viewerId, itemId, asOf)
//           lowStock(viewerId)  issuedTo(viewerId, personId)
//   writes  addStockItem(actorId, fields, now)  updateStockItem(actorId, id, changes, now)  recordStockMovement(actorId, fields, now)
//           reverseStockMovement(actorId, movementId, fields, now)
//   resetStockData()   (now: ms, for tests with a fixed clock; the office day, India time, is "today")

import { getUser } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { logEvent } from "./audit-trail.js";
import { pureBox } from "./places.js";
import { remove } from "../core/storage.js";
import { buildImport, oldSource } from "./inventory-import.js";
import { employmentState } from "./employment-period.js";
import { STOCK_CATEGORIES, STOCK_KINDS, REVERSE_KIND, REASON_MIN, REASON_MAX, MAX_QTY, qtyHundredths, text, date as dateCheck } from "./asset-rules.js";

const KEY = "stock-ledger";
const AARAV = "EMP-1001";
// AS2: the seed is the old site's inventory, imported (data/inventory-import.js: its 12 items, ids ITM-n and SKUs kept, and its ledger: an
// opening count carried over, then every movement of the counted items; a tagged item is one count, its units being in the asset register),
// plus two sample issues to people (marked sample), which the old ledger (it issued to departments) lacks.
function SEED() {
  const imp = buildImport(oldSource());
  const items = imp.stockItems, movements = imp.stockMovements;
  const num = (id) => Number(String(id).replace(/^\D+-/, "")) || 0;
  let sm = Math.max(0, ...movements.map((m) => num(m.id))) + 1;
  const issue = (sku, qty, date, personId, reason) => {
    const found = items.find((i) => i.sku === sku);
    if (found) movements.push({ id: `SM-${sm++}`, itemId: found.id, kind: "out", qty, date, byPersonId: AARAV, toPersonId: personId, reason, reference: "", createdAt: `${date}T04:30:00.000Z`, reverses: null, sample: true });
  };
  issue("IT-1044", 1, "2026-10-08", "EMP-1042", "Keyboard for the new desk (sample)");
  issue("STA-3015", 4, "2026-10-20", "EMP-1029", "Markers for the team (sample)");
  return { nextItem: Math.max(0, ...items.map((i) => num(i.id))) + 1, nextMove: sm, items, movements };
}
const store = pureBox(KEY, 2, SEED, (b) => Number.isInteger(b.nextItem) && Number.isInteger(b.nextMove) && Array.isArray(b.items) && Array.isArray(b.movements));

const copy = (v) => JSON.parse(JSON.stringify(v));
const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";
const officeDay = (now) => new Date(now + 330 * 60000).toISOString().slice(0, 10);
const active = (id) => { const u = id ? getUser(String(id)) : null; return u && u.status !== "inactive" ? u : null; };
const holding = (id, permission) => { const u = active(id); return u && hasPermission(u, permission) ? u : null; };
const h = (qty) => Math.round(qty * 100);          // a stored quantity in hundredths
const qtyOf = (hundredths) => hundredths / 100;
const num = (id) => Number(String(id).replace(/^\D+-/, ""));
// The ledger's order: by date, then in the order recorded.
const ledgerOrder = (a, b) => a.date.localeCompare(b.date) || num(a.id) - num(b.id);

// ---------- the ledger's arithmetic ----------
const onHandIn = (box, itemId, asOf = null) => qtyOf(box.movements.filter((m) => m.itemId === itemId && (!asOf || m.date <= asOf))
  .reduce((s, m) => s + STOCK_KINDS[m.kind].sign * h(m.qty), 0));

// With these movements, does the item's stock, or any person's net issue of it, ever go below zero? -> a sentence, or null.
function ledgerProblem(movements, itemId, unit) {
  let stock = 0;
  const net = new Map();
  for (const m of movements.filter((x) => x.itemId === itemId).sort(ledgerOrder)) {
    stock += STOCK_KINDS[m.kind].sign * h(m.qty);
    if (stock < 0) return `That would take the stock below zero on ${m.date} (only ${qtyOf(stock + h(m.qty))} ${unit} then).`;
    if (m.toPersonId && (m.kind === "out" || m.kind === "return")) {
      const n = (net.get(m.toPersonId) ?? 0) + (m.kind === "out" ? h(m.qty) : -h(m.qty));
      if (n < 0) return `That is more than was issued to them: ${qtyOf(n + h(m.qty))} ${unit} on ${m.date}.`;
      net.set(m.toPersonId, n);
    }
  }
  return null;
}

// ---------- reads ----------
const withOnHand = (box, i) => ({ ...copy(i), onHand: onHandIn(box, i.id) });
const viewer = (viewerId) => holding(viewerId, "stock:view");

export function stockItems(viewerId) {
  if (!viewer(viewerId)) return [];
  const box = store.read();
  return box.items.map((i) => withOnHand(box, i)).sort((a, b) => a.name.localeCompare(b.name) || num(a.id) - num(b.id));
}
export function getStockItem(viewerId, id) {
  if (!viewer(viewerId)) return null;
  const box = store.read();
  const i = box.items.find((x) => x.id === id);
  return i ? withOnHand(box, i) : null;
}
// The ledger, newest first; optionally one item's or one person's (issued to or returned by them).
export function stockMovements(viewerId, { itemId = null, personId = null } = {}) {
  if (!viewer(viewerId)) return [];
  return copy(store.read().movements.filter((m) => (!itemId || m.itemId === itemId) && (!personId || m.toPersonId === personId)))
    .sort((a, b) => ledgerOrder(b, a));
}
// The quantity on hand, on a date (the end of that day) or now; null for no access or no such item.
export function onHand(viewerId, itemId, asOf = null) {
  if (!viewer(viewerId)) return null;
  const box = store.read();
  return box.items.some((i) => i.id === itemId) ? onHandIn(box, itemId, asOf) : null;
}
// Active items at or under their reorder level, emptiest first (on hand against the reorder level).
export function lowStock(viewerId) {
  const ratio = (i) => (i.reorderLevel > 0 ? i.onHand / i.reorderLevel : 1);
  return stockItems(viewerId).filter((i) => i.active && i.reorderLevel > 0 && i.onHand <= i.reorderLevel).sort((a, b) => ratio(a) - ratio(b) || a.name.localeCompare(b.name));
}
// What a person holds, net (issued less returned), item by item; for the person themself or stock:view.
export function issuedTo(viewerId, personId) {
  const v = active(viewerId);
  if (!v || (v.id !== personId && !hasPermission(v, "stock:view"))) return [];
  const box = store.read();
  const net = new Map();
  for (const m of box.movements) {
    if (m.toPersonId !== personId || (m.kind !== "out" && m.kind !== "return")) continue;
    net.set(m.itemId, (net.get(m.itemId) ?? 0) + (m.kind === "out" ? h(m.qty) : -h(m.qty)));
  }
  return [...net].filter(([, n]) => n > 0).map(([itemId, n]) => {
    const i = box.items.find((x) => x.id === itemId);
    return { itemId, name: i?.name ?? itemId, unit: i?.unit ?? "", qty: qtyOf(n) };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- writes: items ----------
function itemFields(box, fields, current = null) {
  const out = {};
  if (!current || "name" in fields) {
    const name = text(fields.name, "Name", { min: 2, max: 80, required: true });
    if (name.error) return fail(name.error, "name");
    if (box.items.some((i) => i.id !== current?.id && i.name.toLowerCase() === name.value.toLowerCase())) return fail(`There is already an item called ${name.value}.`, "name");
    out.name = name.value;
  }
  if (!current || "category" in fields) {
    if (!Object.hasOwn(STOCK_CATEGORIES, String(fields.category ?? ""))) return fail("Choose a category.", "category");
    out.category = fields.category;
  }
  if (!current || "unit" in fields) {
    const unit = text(fields.unit, "Unit", { min: 1, max: 20, required: true });
    if (unit.error) return fail(unit.error, "unit");
    out.unit = unit.value;
  }
  if (!current || "reorderLevel" in fields) {
    const level = fields.reorderLevel ?? 0;
    const hundredths = level === 0 || level === "0" ? 0 : qtyHundredths(level);
    if (hundredths === null) return fail(`Enter a reorder level from 0 to ${MAX_QTY}, with at most 2 decimals.`, "reorderLevel");
    out.reorderLevel = qtyOf(hundredths);
  }
  if ("active" in fields) {
    if (typeof fields.active !== "boolean") return fail("Say whether the item is in use.", "active");
    out.active = fields.active;
  }
  return { ok: true, fields: out };
}
const ITEM_FIELDS = ["name", "category", "unit", "reorderLevel", "active"];

export function addStockItem(actorId, fields = {}, now = Date.now()) {
  const actor = holding(actorId, "stock:move");
  if (!actor) return fail("You can't add stock items.");
  const box = store.read();
  const checked = itemFields(box, fields);
  if (!checked.ok) return checked;
  const record = { id: `ITM-${box.nextItem}`, active: true, ...checked.fields };
  box.items.push(record);
  box.nextItem += 1;
  if (!store.write(box)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, kind: "stock-item-added", detail: `${record.id}: ${record.name}` }, now);
  return { ok: true, record: withOnHand(box, record) };
}

// changes: any of name, category, unit, reorderLevel, active; anything else is refused.
export function updateStockItem(actorId, id, changes = {}, now = Date.now()) {
  const actor = holding(actorId, "stock:move");
  if (!actor) return fail("You can't change stock items.");
  const extra = Object.keys(changes ?? {}).filter((k) => !ITEM_FIELDS.includes(k));
  if (extra.length) return fail(`These can't be changed here: ${extra.join(", ")}.`);
  const box = store.read();
  const record = box.items.find((i) => i.id === id);
  if (!record) return fail(`No stock item ${id}.`);
  const checked = itemFields(box, changes, record);
  if (!checked.ok) return checked;
  const changed = Object.keys(checked.fields).filter((k) => record[k] !== checked.fields[k]);
  if (!changed.length) return { ok: true, record: withOnHand(box, record) };
  Object.assign(record, checked.fields);
  if (!store.write(box)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, kind: "stock-item-changed", detail: `${record.id}: ${changed.join(", ")}` }, now);
  return { ok: true, record: withOnHand(box, record) };
}

// ---------- writes: movements ----------
// fields: { itemId, kind, qty, date (default today; not in the future), toPersonId, reason, reference }.
export function recordStockMovement(actorId, fields = {}, now = Date.now()) {
  const actor = holding(actorId, "stock:move");
  if (!actor) return fail("You can't record stock movements.");
  return addMovement(actor, fields, null, now);
}

// Puts a movement right with the opposite one (in -> remove, out -> return by the same person or, with nobody named, in; return -> out to
// them; remove -> in), for the
// same quantity. fields: { reason (required), date (default today; not before the movement it corrects) }. Once per movement; a correction
// itself can't be reversed (record a new movement instead).
export function reverseStockMovement(actorId, movementId, fields = {}, now = Date.now()) {
  const actor = holding(actorId, "stock:move");
  if (!actor) return fail("You can't record stock movements.");
  const box = store.read();
  const original = box.movements.find((m) => m.id === movementId);
  if (!original) return fail(`No movement ${movementId}.`);
  if (original.reverses) return fail(`${movementId} is itself a correction: record a new movement instead.`);
  if (box.movements.some((m) => m.reverses === movementId)) return fail(`${movementId} has already been reversed.`);
  const d = fields.date ?? officeDay(now);
  if (String(d) < original.date) return fail(`The correction can't be dated before ${original.date}.`, "date");
  // An issue that named nobody (a pantry refill) comes back as stock in: there is no one to hand it back.
  const kind = original.kind === "out" && !original.toPersonId ? "in" : REVERSE_KIND[original.kind];
  return addMovement(actor, { itemId: original.itemId, kind, qty: original.qty, date: d, toPersonId: original.toPersonId,
    reason: fields.reason, reference: original.reference }, original, now);
}

function addMovement(actor, fields, reverses, now) {
  const box = store.read();
  const today = officeDay(now);
  const record = box.items.find((i) => i.id === fields.itemId);
  if (!record) return fail("Choose an item.", "itemId");
  const kind = String(fields.kind ?? "");
  if (!Object.hasOwn(STOCK_KINDS, kind)) return fail("Choose in, issue, return or write-off.", "kind");
  if (!record.active && !reverses && (kind === "in" || kind === "out")) return fail(`${record.name} is no longer in use: only returns and write-offs can be recorded.`, "itemId");
  const hundredths = qtyHundredths(fields.qty);
  if (hundredths === null) return fail(`Enter a quantity more than 0, up to ${MAX_QTY}, with at most 2 decimals.`, "qty");
  const d = dateCheck(fields.date ?? today, "Date", { latest: today });
  if (d.error) return fail(d.error, "date");
  const reason = text(fields.reason, "Reason", { min: REASON_MIN, max: REASON_MAX, required: true });
  if (reason.error) return fail(reason.error, "reason");
  const reference = text(fields.reference, "Reference", { max: 40 });
  if (reference.error) return fail(reference.error, "reference");

  let to = null;
  const personId = String(fields.toPersonId ?? "").trim();
  if (kind === "out" || kind === "return") {
    if (personId) {
      const person = getUser(personId);
      if (!person) return fail("Choose a person from the list.", "toPersonId");
      // Issuing to someone who has left is refused (a correction of their return is allowed); a return from them always is.
      if (kind === "out" && !reverses && (person.status === "inactive" || employmentState(person, d.value) === "after")) return fail(`${person.name} has left and can't be issued stock.`, "toPersonId");
      to = person.id;
    } else if (kind === "return") return fail("Say who handed it back.", "toPersonId");
  } else if (personId) return fail("Only an issue or a return names a person.", "toPersonId");

  const movement = { id: `SM-${box.nextMove}`, itemId: record.id, kind, qty: qtyOf(hundredths), date: d.value, byPersonId: actor.id, toPersonId: to,
    reason: reason.value, reference: reference.value, createdAt: new Date(now).toISOString(), reverses: reverses ? reverses.id : null };
  const problem = ledgerProblem([...box.movements, movement], record.id, record.unit);
  if (problem) return fail(problem, "qty");
  box.movements.push(movement);
  box.nextMove += 1;
  if (!store.write(box)) return fail(SAVE_FAILED);
  logEvent({ actorId: actor.id, userId: to, kind: reverses ? "stock-reversed" : "stock-moved",
    detail: `${movement.id}: ${kind} ${movement.qty} ${record.unit} of ${record.id}${to ? ` (${to})` : ""}${reverses ? `, correcting ${reverses.id}` : ""}` }, now);
  return { ok: true, record: copy(movement) };
}

// Throws away every change in this browser; the sample is read again.
export function resetStockData() { remove(KEY); }
export const stockBox = store;   // for data/inventory-migrate.js only (the import's merge); every other caller goes through the functions above
