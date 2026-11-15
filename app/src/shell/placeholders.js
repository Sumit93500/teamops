// F2: the pages that are only placeholders (a sample with nothing behind it, or not ported yet). They are hidden from the sidebar
// and search, nothing links to them, and a direct URL shows one neutral page (pages/Rebuilding.jsx), still behind the page's own
// permission. The planned rounds that bring them back are listed in the workspace's notes/react-parking-lot.md.
export const PLACEHOLDER_PAGES = [
  "inventory/my-assets.html", "inventory/items.html", "inventory/stock-movements.html", "inventory/asset-assignment.html", "inventory/vendors.html",
  "announcements/announcements.html", "recruitment/job-openings.html", "recruitment/candidates.html",
  "system/reports.html", "system/audit-log.html", "system/backup.html",
  "access/delegation.html", "access/approval-workflows.html",
  "account/notifications.html", "account/sessions.html",
];
export const isPlaceholder = (key) => PLACEHOLDER_PAGES.includes(key);