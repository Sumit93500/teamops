# Assets and inventory

**Files:** `assets/js/data/inventory.js` (categories, asset types, locations, conditions, movement kinds: pure functions), `data/inventory-store.js` (items, the stock ledger, the asset register, vendors), `data/asset-requests-store.js` (requests).

## Inventory

- **An item** has a SKU, category, reorder level, unit price and location.
- **Stock is never stored.** It is the opening stock plus every movement on the ledger.
  - Movements are only added. A mistake is put right with an adjustment.
- **Only IT equipment is tagged** (laptops, monitors, cards ...). Everything else is counted.
- **Assignment:** a tagged asset is assigned to a person and returned through movements, so who holds what follows the ledger.

## Asset requests

- **Who asks:** anyone (`assets:request`).
  - A request names an asset type and a reason, never a specific tag.
  - It may name the requester's asset it replaces.
- **Chain:** manager → Admin → fulfilment.
  - The tag is chosen when the asset is handed over, so nothing is reserved while a request waits.
- **Status:** pending, approved, fulfilled, rejected, cancelled or closed.

## Not built yet (rounds 17–22)

- **The asset register's new fields** and a migration.
- **Add or edit items, vendors and assets** in the store.
- **An audit trail of every inventory write.**
- **Lifecycle:** transfer, lost, dispose.
- **Maintenance and alerts.**
- **Depreciation:** straight line and declining balance.
- **The inventory permissions**, including "the approver can't also hand over".
- **The React screens:** the five inventory pages, and new asset register and asset detail pages.
