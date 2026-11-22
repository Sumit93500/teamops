// data/inventory-migrate.js (AS2, 2026-11-22): the import of the old site's inventory into the AS1 register and stock ledger, run on demand
// against what is saved now. The new stores' own seed is already this import (data/inventory-import.js), so a fresh browser needs none;
// this is for a browser whose old store was changed, or whose new stores were written before: it adds what the new stores lack, and
// nothing else.
//
//   importOldInventory(actorId, now)   { ok, added: { assets, vendors, items, movements }, skipped }
//
// Idempotent: a record is matched by its tag (assets), its SKU or name (stock items) or its id or name (vendors); one that is there is left
// exactly as it is, so a second run finds nothing to add, writes nothing and logs nothing. It never writes the old store (it only reads its
// saved records), and never edits or removes a record already in the new stores. Who: the custodian (assets:manage, vendors:manage and
// stock:move: IT and the Admin).
import { getUser } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { logEvent } from "./audit-trail.js";
import { buildImport, oldSource } from "./inventory-import.js";
import { registerBox } from "./asset-register.js";
import { stockBox } from "./stock-ledger.js";

const num = (id) => Number(String(id).replace(/^\D+-/, "")) || 0;
const lc = (s) => String(s ?? "").trim().toLowerCase();

export function importOldInventory(actorId, now = Date.now()) {
  const actor = actorId ? getUser(String(actorId)) : null;
  if (!actor || actor.status === "inactive" || !["assets:manage", "vendors:manage", "stock:move"].every((p) => hasPermission(actor, p))) return { ok: false, error: "You can't import the old inventory." };
  const imp = buildImport(oldSource());
  const reg = registerBox.read(), stock = stockBox.read();
  const added = { assets: 0, vendors: 0, items: 0, movements: 0 };

  // vendors: by id or name
  const haveV = new Set([...reg.vendors.map((v) => v.id), ...reg.vendors.map((v) => lc(v.name))]);
  for (const v of imp.vendors) {
    if (haveV.has(v.id) || haveV.has(lc(v.name))) continue;
    reg.vendors.push(v); haveV.add(v.id); haveV.add(lc(v.name)); added.vendors += 1;
  }
  reg.next.vendor = Math.max(reg.next.vendor, ...reg.vendors.map((v) => num(v.id) + 1));

  // assets: by tag; each new one gets its own ids, and its events and maintenance records follow it
  const haveTags = new Set(reg.assets.map((a) => lc(a.tag)));
  for (const a of imp.assets) {
    if (haveTags.has(lc(a.tag))) continue;
    const id = `FA-${reg.next.asset}`; reg.next.asset += 1;
    const mrMap = new Map();
    for (const m of imp.maintenance.filter((x) => x.assetId === a.id)) { mrMap.set(m.id, `MR-${reg.next.maint}`); reg.next.maint += 1; }
    reg.assets.push({ ...a, id });
    for (const m of imp.maintenance.filter((x) => x.assetId === a.id)) reg.maintenance.push({ ...m, id: mrMap.get(m.id), assetId: id });
    for (const e of imp.events.filter((x) => x.assetId === a.id)) { reg.events.push({ ...e, id: `AE-${reg.next.event}`, assetId: id, maintenanceId: e.maintenanceId ? mrMap.get(e.maintenanceId) ?? null : null }); reg.next.event += 1; }
    haveTags.add(lc(a.tag)); added.assets += 1;
  }

  // stock items: by id, SKU or name; a new item brings its movements
  const haveI = new Set(stock.items.flatMap((i) => [i.id, lc(i.name), lc(i.sku)].filter(Boolean)));
  for (const i of imp.stockItems) {
    if (haveI.has(i.id) || haveI.has(lc(i.name)) || haveI.has(lc(i.sku))) continue;
    stock.items.push(i); added.items += 1;
    for (const m of imp.stockMovements.filter((x) => x.itemId === i.id)) { stock.movements.push({ ...m, id: `SM-${stock.nextMove}` }); stock.nextMove += 1; added.movements += 1; }
    haveI.add(i.id); haveI.add(lc(i.name)); haveI.add(lc(i.sku));
  }
  stock.nextItem = Math.max(stock.nextItem, ...stock.items.map((i) => num(i.id) + 1));

  if (!added.assets && !added.vendors && !added.items) return { ok: true, added, skipped: imp.skipped };
  if (!registerBox.write(reg)) return { ok: false, error: "Couldn't save. Browser storage may be full or disabled." };
  if (!stockBox.write(stock)) return { ok: false, error: "The register was updated but the stock ledger couldn't be saved. Browser storage may be full or disabled." };
  logEvent({ actorId: actor.id, kind: "inventory-imported", detail: `old inventory: ${added.assets} assets, ${added.vendors} vendors, ${added.items} stock items, ${added.movements} movements` }, now);
  return { ok: true, added, skipped: imp.skipped };
}