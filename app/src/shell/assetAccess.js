// AS2: who may open each asset and inventory page. The old routes (config/routes.js) name the old, Admin-only permissions
// (inventory:view, assets:view, vendors:view); the app's pages follow the AS1 / IT1 ones instead, and the data functions check them again
// (a page that is open still shows only what the person's permissions return):
//   My assets        everyone (assets:view-own): only what was issued to them, no values
//   Inventory        assets:view-all (HR, Finance, IT, Admin): the register; price and book value only with assets:view-values
//   Asset assignment assets:view-all: who holds what, issue and return (assets:issue), maintenance (assets:maintain)
//   Stock movements  stock:view: the counted items and their ledger; recording needs stock:move
//   Vendors          assets:view-all reads; vendors:manage changes
import { can } from "../../../assets/js/core/rbac.js";

export const ASSET_PAGES = {
  "inventory/my-assets.html": () => can("assets:view-own"),
  "inventory/items.html": () => can("assets:view-all"),
  "inventory/asset-assignment.html": () => can("assets:view-all"),
  "inventory/stock-movements.html": () => can("stock:view"),
  "inventory/vendors.html": () => can("assets:view-all"),
};
// The permission each sidebar item is shown for (the same rule as the page's, as a key for the sidebar's can()).
export const ASSET_NAV_PERMISSION = {
  "inventory/my-assets.html": "assets:view-own", "inventory/items.html": "assets:view-all", "inventory/asset-assignment.html": "assets:view-all",
  "inventory/stock-movements.html": "stock:view", "inventory/vendors.html": "assets:view-all",
};
export const isAssetPage = (page) => Object.hasOwn(ASSET_PAGES, page);
export const mayOpenAssetPage = (page) => isAssetPage(page) && ASSET_PAGES[page]();