# Assets and inventory

Two layers live side by side:

- **The data layer (AS1, 2026-11-22):** a stock ledger, a fixed-asset register, depreciation, maintenance and vendors. Data and rules only; the screens come in the next round. It has its own storage keys and never writes the old site's.
- **The old site's inventory** (rounds 6 to 13): its five pages, their store and asset requests, unchanged. The React profile still reads its `assetsFor`, and Reset demo data resets it.

## The data layer (AS1)

**Files:** `assets/js/data/asset-rules.js` (lists and checks, pure), `data/depreciation.js` (the maths, pure), `data/stock-ledger.js` (stock items and movements), `data/asset-register.js` (assets, their history, maintenance, vendors, depreciation defaults). Tests: `tests/live/assetdata.mjs` (3 zones).

**Storage:** `officeos:stock-ledger` and `officeos:asset-register`, read through `pureBox`. A read never writes: until the first write, everyone reads the sample and nothing is stored. `resetStockData()` and `resetAssetRegister()` clear them (not yet on the Reset demo data button: that is for the screens round).

### Stock (consumables and other counted items)

- **An item:** `{ id SI-n, name (unique), category, unit, reorderLevel, active }`. The categories are the old site's four: IT equipment, furniture, stationery, pantry.
- **A movement:** `{ id SM-n, itemId, kind, qty, date, byPersonId, toPersonId, reason, reference, createdAt, reverses }`.
  - Kinds: `in`, `out` (an issue), `return`, `remove` (a write-off).
  - `qty` is more than 0, with at most 2 decimals (1.5 kg), up to 1,000,000.
  - `toPersonId`: who received an issue (optional: a pantry refill names nobody) or who handed a return back (required). Never on `in` or `remove`.
  - `reason`: 3 to 200 characters. `reference`: an optional PO or invoice number.
- **Quantity on hand is never stored.** It is the sum of the movements up to a date: `in` and `return` add, `out` and `remove` take away.
- **Movements are only added.** Nothing edits or deletes one. A mistake is put right with `reverseStockMovement`, the opposite movement for the same quantity:
  - a stock-in becomes a write-off;
  - an issue becomes a return by the same person (or a stock-in, if it named nobody);
  - a return becomes an issue to them;
  - a write-off becomes a stock-in.

  A movement is reversed once at most, and a correction is never reversed.
- **Never below zero:** an issue, a write-off or a correction that would take stock below zero on any day, in date order, is refused. So a back-dated issue is checked against the stock on its own day as well as after.
- **Returns:** nobody hands back more of an item than they were issued, net, at any point.
- **Leavers:** an issue to someone who has left is refused. Their returns are taken.
- **An item no longer in use** takes no new stock-in or issue. Returns and write-offs still work.
- **Low stock:** active items at or under their reorder level, emptiest first. (The old site's items page says "low" below the reorder level; this list includes the level itself, as the brief asked.)

### Fixed assets

- **An asset:** `{ id FA-n, tag, name, category, makeModel, serial, purchaseDate, purchasePrice, vendorId, invoiceRef, warrantyUntil, usefulLifeYears, salvageValue, depreciationMethod, wdvRatePercent, locationId }`.
  - The tag is given (`AST-0001`, the next number after the highest in use) and can be changed once.
  - Tags and serial numbers are unique (any case). Blank serials may repeat.
  - The location is an office from `data/offices-store.js`.
  - Categories: laptop, monitor, phone, printer, furniture, other.
- **The lifecycle** (`TRANSITIONS` in `asset-rules.js`):

  | from | may go to |
  |---|---|
  | in store (new, or returned) | assigned, under maintenance, retired |
  | assigned | in store |
  | under maintenance | in store |
  | retired | disposed |
  | disposed | nothing (final) |

  Anything else is refused with a sentence. For example: issuing an asset that is already issued, under maintenance or retired; disposing of an issued one ("retire it before disposing of it").
- **The history is append-only:** `{ id AE-n, assetId, kind, date, at, byId, from, to, personId, condition, notes, maintenanceId, saleValue }`.
  - Kinds: added, issued, returned, maintenance-opened, maintenance-closed, retired, disposed.
  - An asset's status and holder are never stored. They are its last event's, so they can't disagree with the history.
- **Assignment rows** (per asset: `assignmentHistory`; per person: `assignmentsOf`) pair each issue with the return that ended it: who, from, to, issued by, returned to, condition at issue and at return, notes.
- **One holder at a time.** Nobody who has left (inactive, or past their last working day) is issued an asset.
- **Dates:** every event date is a real day from 1990, not in the future, and not before the purchase date or the asset's last event. The purchase date can change only until something has happened to the asset.
- **Not returned:** `assetsNotReturned(viewer, { personId })` lists the assets still issued to someone who has left, with their last working day (or none on record). The offboarding round will use it.

### Depreciation (`data/depreciation.js`)

`depreciation(params, asOf, { schedule })` returns `{ accumulated, bookValue, annualCharge, fullyDepreciated, fullyDepreciatedOn, endsOn, schedule }`. With `schedule`, it also returns the life years, the financial years (1 Apr to 31 Mar) and the months, each with its opening value, charge and closing value. `disposalFigures` gives the book value at disposal and the gain or loss against the sale value.

- **The day-count rule:**
  - An asset depreciates from its purchase date, and the purchase day counts.
  - Its life years run from the purchase date to the day before each anniversary. A 29 Feb purchase's anniversary in a year with no 29 Feb is 1 Mar.
  - Within a life year, its charge is spread evenly over that year's days, counted, not assumed: 365, or 366 when a 29 Feb falls in it.
  - Before the purchase date nothing is taken (book value = cost). On the purchase day one day's charge is taken.
  - A disposal stops it; the disposal day counts.
- **Straight line (`slm`):** each life year's charge is (cost − salvage) ÷ useful life. After the last life year, nothing.
- **Written-down value (`wdv`):**
  - The value at the start of life year k is cost × (1 − rate)^(k−1). That year's charge is that value × rate, spread over its days.
  - It never goes below salvage. Rate 0 takes nothing; rate 100 takes everything in year 1.
  - The useful life isn't used by `wdv`. When the value never reaches salvage (rate 0, or salvage 0), the schedule is followed for 100 years.
- **The rounding rule:**
  - Every amount is whole paise, in exact integer arithmetic (BigInt), up to ₹10,000 crore.
  - The accumulated depreciation up to a day is worked out exactly and rounded once, to the nearest paisa, half up.
  - Every charge (a year's, a financial year's, a month's) is the difference of two rounded accumulated figures. So charges always add up to the accumulated figure, and the yearly charges over the life add up to cost − salvage exactly. Example: ₹1,000 over 3 years is 333.33 + 333.34 + 333.33.
- **Settings:**
  - Each asset has its own method, life, rate and salvage. Changing them needs `depreciation:configure`.
  - A new asset takes its category's company default, with salvage as the default percent of the price, to the paisa, half up.
  - Defaults (Schedule II of the Companies Act, 5% residual; `asset-rules.js` `ASSET_CATEGORIES`):

    | category | method | life | wdv rate |
    |---|---|---|---|
    | laptop, monitor, phone | slm | 3 years | 63.16% |
    | printer, other | slm | 5 years | 45.07% |
    | furniture | slm | 10 years | 25.89% |

  - Admin and Finance can change a default (`setDepreciationDefault`). It applies to assets added afterwards.
  - The Income-Tax Act's block rates are not built (parking lot, the Finance round).

### Maintenance, warranty, vendors

- **A maintenance record:** `{ id MR-n, assetId, date, issue, cost, vendorId, nextServiceDue, status, notes, openedBy, closedOn, closedBy }`.
  - Opening one moves the asset from the store to under maintenance. Closing it brings the asset back.
  - The cost is 0 or more, with 2 decimals.
  - `nextServiceDue` is optional, and must be after the record's date.
- **Overdue service:** the asset's latest record has a next service date that has passed, and there is no newer record. Retired and disposed assets are left out.
- **Warranty expiring:** the warranty ends within the next N days (30, 60 or 90 on the screens), today included.
- **A vendor:** `{ id VN-n, name (unique), contactPerson, phone, email, gstin, address, active }`.
  - Checks: the email; the GSTIN's format (state code, PAN, entity, Z, check character; the check character itself is not verified); phone numbers of 10 to 15 digits.
  - A vendor that an asset or a maintenance record names can't be deleted: deactivate it instead.
  - An inactive vendor stays on its old records, but can't be named on a new one.

### Who sees and does what

Every read takes the viewer and returns only what they may see. Every write checks the permission first, then the lifecycle.

| permission | who | what |
|---|---|---|
| `assets:view-own` | everyone | the assets issued to them now or before, and only their own assignment rows. No status, other holder, vendor, invoice or values |
| `assets:view-all` | HR, Finance, Admin | every asset, its history and maintenance, the overdue, warranty and not-returned lists, the vendors |
| `assets:view-values` | Finance, Admin | price, salvage, life, method, rate, depreciation, maintenance costs, sale values, book value at disposal, gain or loss |
| `assets:manage` | Admin * | add, edit, retire, dispose |
| `assets:issue` | Admin * | issue and take back |
| `assets:maintain` | Admin * | open and close maintenance |
| `vendors:manage` | Admin * | add, edit, deactivate, delete vendors |
| `stock:view` | HR, Finance, Admin | stock items, the ledger, low stock |
| `stock:move` | Admin * | add and edit items; record and reverse movements |
| `depreciation:configure` | Finance, Admin | category defaults; an asset's own method, life, rate and salvage |

\* The custodian's permissions. No IT or inventory role exists yet, so only the Admin holds them. **Grant them to the IT role in the IT round** (parking lot).

- **Values are left out, not blanked:** nobody without `assets:view-values` receives those fields from any read, including a write's own answer. Changing a price needs `assets:view-values` too.
- **A person** reads what they were issued (`issuedTo`) without `stock:view`.
- **Managers:** a manager gets nothing of their team's assets by being their manager.
- **Leavers:** someone who has left reads and writes nothing.
- **Not overridable:** none of the new permissions. Fields a write doesn't take (a status, a holder, an id, a sample flag) are refused, not ignored.

**Audit:** every write goes to the audit trail:

- `stock-item-added`, `stock-item-changed`, `stock-moved`, `stock-reversed`;
- `asset-added`, `asset-changed`, `asset-issued`, `asset-returned`, `asset-maintenance-opened`, `asset-maintenance-closed`, `asset-retired`, `asset-disposed`;
- `vendor-added`, `vendor-changed`, `vendor-removed`;
- `depreciation-changed`.

Each event records who, the ids, and what happened (field names, never an amount). An issue or a return names the person. A refused write logs nothing.

### The sample (marked `sample`)

- **Stock:** 6 items (paper, markers, coffee, HDMI cables, keyboards, chargers), an opening count on 1 Oct 2026 and 7 movements since, with three items at or under their reorder level.
- **Assets:** 12 of them.
  - Assigned: laptops with Sneha Rao and Rohan Gupta, phones with Ananya Iyer and Kabir Shah, a chair with Arjun Kapoor, and a monitor with Divya Menon, who has left (not returned).
  - Also a laptop handed back, a laptop under maintenance, a spare chair, a printer past its next service, a retired laptop, and a phone sold for scrap.
- **Vendors:** 2. **Maintenance records:** 2.

None of it changes an existing record: the dumps of every attendance, leave, pay, expense, employee-record and old-inventory read are byte-identical before and after (3 zones).

## The old site's inventory (unchanged)

**Files:** `assets/js/data/inventory.js` (categories, asset types, locations, conditions, movement kinds: pure functions), `data/inventory-store.js` (items, the stock ledger, the asset register, vendors), `data/asset-requests-store.js` (requests).

### Inventory

- **An item** has a SKU, category, reorder level, unit price and location.
- **Stock is never stored.** It is the opening stock plus every movement on the ledger.
  - Movements are only added. A mistake is put right with an adjustment.
- **Only IT equipment is tagged** (laptops, monitors, cards ...). Everything else is counted.
- **Assignment:** a tagged asset is assigned to a person and returned through movements, so who holds what follows the ledger.

### Asset requests

- **Who asks:** anyone (`assets:request`).
  - A request names an asset type and a reason, never a specific tag.
  - It may name the requester's asset it replaces.
- **Chain:** manager → Admin → fulfilment.
  - The tag is chosen when the asset is handed over, so nothing is reserved while a request waits.
- **Status:** pending, approved, fulfilled, rejected, cancelled or closed.

## Not built yet

- **The screens** (the next round): the inventory pages, the asset register and asset detail, on the AS1 data layer.
- **Moving the old site's records into the new register:** its 7 tagged assets, 12 items and 5 vendors. A ruling item: until then the React profile's "assets held" reads the old store.
- **Wiring** `resetStockData` and `resetAssetRegister` into Reset demo data.
- **The IT role** and the custodian permissions moving to it.
- **Income-Tax Act block rates** (the Finance round).
- **Lost and transfer** in the lifecycle, and "the approver can't also hand over".
