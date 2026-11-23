# Assets and inventory

Three things live side by side:

- **The data layer (AS1, 2026-11-22):** a stock ledger, a fixed-asset register, depreciation, maintenance and vendors. Data and rules, with their own storage keys; they never write the old site's.
- **The screens (AS2, 2026-11-22):** the five inventory pages in the React app (Inventory with one asset's page, Asset assignment, Stock movements, Vendors, My assets), plus "Request an asset" and "Request return" through the IT desk. They read and write the AS1 stores only.
- **The old site's inventory** (rounds 6 to 13): its store and asset requests. Its five static pages are replaced by the screens above. Its store is read once, by the import below, and never written; Reset demo data still resets the old asset-request chain.

## The data layer (AS1)

**Files:** `assets/js/data/asset-rules.js` (lists and checks, pure), `data/depreciation.js` (the maths, pure), `data/stock-ledger.js` (stock items and movements), `data/asset-register.js` (assets, their history, maintenance, vendors, depreciation defaults). Tests: `tests/live/assetdata.mjs` (3 zones).

**Storage:** `officeos:stock-ledger` and `officeos:asset-register`, read through `pureBox`. A read never writes: until the first write, everyone reads the sample and nothing is stored. `resetStockData()` and `resetAssetRegister()` clear them (AS2: both are on the Reset demo data button: that is for the screens round).

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
| `assets:manage` | IT, Admin * | add, edit, retire, dispose |
| `assets:issue` | IT, Admin * | issue and take back |
| `assets:maintain` | IT, Admin * | open and close maintenance |
| `vendors:manage` | IT, Admin * | add, edit, deactivate, delete vendors |
| `stock:view` | HR, Finance, Admin | stock items, the ledger, low stock |
| `stock:move` | IT, Admin * | add and edit items; record and reverse movements |
| `depreciation:configure` | Finance, Admin | category defaults; an asset's own method, life, rate and salvage |

\* The custodian's permissions: the IT role's since IT1 (see [it-desk.md](it-desk.md)); the Admin keeps them as the documented override. IT also holds `assets:view-all` and `stock:view`, never `assets:view-values`.

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

### What a fresh browser reads (AS2)

The seed of both stores is the old site's inventory (see "The old inventory, imported") plus a few records marked `sample`:

- **Stock:** 12 items and 17 movements: the old inventory's 12 items with 15 imported movements, and 2 sample issues (a keyboard to Rohan Gupta on 8 Oct 2026, markers to Sneha Rao on 20 Oct 2026). On hand: paper 42, coffee 8, HDMI cables 0, chairs 14, keyboards 2, markers 56, laptops 6, monitors 4, cards 30. Four items are at or under their reorder level: HDMI cables, keyboards, coffee and paper.
- **Assets:** 10: the 7 imported tagged assets and 3 samples (a printer past its next service, a retired laptop, a phone sold for scrap). 5 assigned, 2 in store, 1 under maintenance, 1 retired, 1 disposed. Nobody's profile changed: the samples are held by nobody.
- **Vendors:** the old 5 (CoolAir, FurniCraft, QuickPrint on hold, Sharma, TechNova). **Maintenance records:** 2.

AS1's own sample (the 12 assets, 6 items and 2 vendors) is kept as test fixtures (`tests/live/as1-register.json`, `as1-stock.json`, `as1-licences.json`) so the AS1 and IT1 suites still test it. Both stores are at box version 2; an older stored box is replaced by the seed.

None of it changes an existing record: the dumps of every attendance, leave, pay, expense and employee-record read are byte-identical before and after (3 zones). The register, stock and asset reads are the ones AS2 changes on purpose.

## The screens (AS2)

**Files:** `app/src/pages/Inventory.jsx` (the list and, with `?tag=`, one asset), `AssetAssignment.jsx`, `StockMovements.jsx`, `Vendors.jsx`, `MyAssets.jsx`; `app/src/ui/assets.jsx` (status chips, the action buttons, the dialogs), `ui/assetDetail.jsx`, `ui/assetRequests.jsx`; `app/src/shell/assetAccess.js` (who opens which page); `app/src/design/assets.css`. Tests: `tests/live/react/as2.mjs` (Edge).

**Who opens what** (the pages follow the AS1 permissions, not the old Admin-only route permissions):

| Page | Needs | Who |
|---|---|---|
| My assets | `assets:view-own` | everyone |
| Inventory, Asset assignment, Vendors | `assets:view-all` | HR, Finance, IT, Admin |
| Stock movements | `stock:view` | HR, Finance, IT, Admin |

Anyone else who types the address gets the 403 page. The sidebar shows only what a person may open.

**Inventory.** KPIs, the filters (status, category, every active office, holder, warranty ending soon) and a search over tag, name, holder and serial. Purchase price and book value are columns for Finance and the Admin only: nobody else has them in the page at all (they are not hidden, they are not sent). One asset's page shows its details, lifecycle, assignment history and maintenance; the depreciation panel (KPIs, a book-value chart, the year-by-year schedule) is for `assets:view-values`. An asset a person may not see reads "You can't see this asset."

**Buttons are the state machine.** An asset offers only the moves `asset-rules.js` allows from its state, and only to someone holding the permission for that move: Issue and Return (`assets:issue`), Send for maintenance and Back from maintenance (`assets:maintain`), Retire and Dispose of (`assets:manage`), Edit (`assets:manage`). Each opens a dialog that says what the data layer refused, under the field it concerns. Retire and dispose ask first. Nobody who has left can be chosen for an issue.

**Asset assignment** has four tabs: Held, In store, Maintenance (open records, service overdue, warranty ending) and Not returned (assets still with someone who has left; empty in the seed). **Stock movements** has Items (with low and out-of-stock badges) and Movements (the shared date range, the correction button; a corrected row shows "Corrected"). **Vendors** says the rule in a note: a vendor named on an asset or a maintenance record can't be deleted, only deactivated. **My assets** lists what is issued to the signed-in person, what they held before, and their open asset requests; no value is ever shown there.

**Requests go through IT** (IT1's `asset-request` and `asset-return`). "Request an asset" and "Request return" raise IT requests; the Admin approves and IT hands over. A second open request for the same kind of asset, or for the same tag, is refused and names the first. A return can only be asked for an asset the person holds. My requests lists these as type IT, with Cancel while they are open.

**Reset demo data** now resets the register, the stock ledger, the licences and the IT desk, and leaves the old inventory store's keys exactly as they were.

## The old inventory, imported (AS2)

**Files:** `assets/js/data/inventory-import.js` (pure: `buildImport`, `oldSource`, `oldDefaults`), `data/inventory-migrate.js` (`importOldInventory(actorId, now)`). Tests: `tests/live/assetimport.mjs` (3 zones).

The old store's 7 tagged assets, 12 items, their 15 movements and 5 vendors are the new stores' seed. `oldSource()` reads the old store's saved records (version 1 boxes) or, where nothing is saved, copies of its defaults; it never seeds the old store.

- **Vendors** keep their ids (`VEN-n`) and contacts, supplies and payment terms; "on hold" becomes inactive and on hold. An email, GSTIN and address the old register never had are left empty ("Not recorded"), not made up.
- **Stock items** keep their ids (`ITM-n`), SKU, name, category and reorder level. The unit is "unit". Tagged items (laptops, monitors, cards) carry one count over; their units are the assets. The old unit price is not carried.
- **Stock movements:** an item with no tag gets an opening count dated the day before its first movement, then every movement (stock in and return become `in`, an issue becomes `out`, an adjustment becomes `in` or `remove`). A PO-like reference becomes the movement's `reference`.
- **Assets** keep their tags. The name comes from the item; laptop and monitor keep their category, an access card becomes "other equipment"; all are at the head office, the store room is kept as text. No purchase date or price is made up: they stay empty and the asset page says **"Details missing"** until someone adds them with Edit (a purchase date can't be after the asset was first used; the salvage value defaults to the category's percent when the price is first set). Until then depreciation says so instead of working out a number. The category's company default (life, method, rate) is applied.
- **History** becomes events: assigned becomes issued, returned, sent to repair becomes maintenance opened, repaired becomes maintenance closed. A date the old register didn't keep is empty, not today's; an issue the old history never recorded gets a placeholder issue before its return. The old `since` dates the hand-over in force now, and the old condition goes on the last event. Problem reports ("reported", "report closed") are not part of the lifecycle and are skipped.

`importOldInventory` is for a browser whose old store was changed after the new stores were written: it needs `assets:manage`, `vendors:manage` and `stock:move` (IT and the Admin), adds only what the new stores lack (assets by tag, vendors by id or name, stock items by id, SKU or name, each new item with its movements), edits nothing that is there, and is idempotent: a second run adds nothing, writes nothing and logs nothing. A run that adds something is audited as "Old inventory imported" (counts only).

## The old site's inventory (its store; the pages are replaced)

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

## Complete details and access cards (IT2)

The imported assets have no purchase date, price, vendor or serial number. `detailsToComplete` (for `assets:manage`: IT and the Admin) lists them with the fields each still lacks and `completeDetails` fills them with Edit's validation: the price only with `assets:view-values`, a field already filled is refused, nothing outside the four. The page is Complete details (linked from Inventory's note); each field is its own flag and the "Details missing" label goes once the date and price are in.

**Access cards are stock items, not fixed assets** (`asset-rules.js STOCK_ONLY_CATEGORIES`): the register refuses the category ("Access cards are stock items, not fixed assets: record them in Stock movements.") and so does an asset request. Existing records, the old register's access cards included, are unchanged.

## Not built yet

- **Dashboard cards** for assets (low stock, overdue service): the data is there (`lowStock`, `overdueService`), no card shows it yet.
- **Unit prices** are not carried over from the old inventory; the new item has no price field.
- **`tagEdited`** (change a tag once) is in the data layer; the edit dialog doesn't offer it.
- **The old asset-requests chain** (manager, Admin, fulfilment) is closed in IT2: nothing new is made and nothing waits on it; its history stays readable (see [it-desk.md](it-desk.md)).
- **Income-Tax Act block rates** (the Finance round).
- **Lost and transfer** in the lifecycle, and "the approver can't also hand over".
