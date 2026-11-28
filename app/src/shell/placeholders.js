// F2: the pages that are only placeholders (a sample with nothing behind it, or not ported yet). They are hidden from the sidebar
// and search, nothing links to them, and a direct URL shows one neutral page (pages/Rebuilding.jsx), still behind the page's own
// permission. The planned rounds that bring them back are listed in the workspace's notes/react-parking-lot.md. (AS2 restored the five
// inventory pages: they are real pages now, behind shell/assetAccess.js.)
export const PLACEHOLDER_PAGES = [
  "recruitment/job-openings.html", "recruitment/candidates.html",
  "system/reports.html", "system/audit-log.html", "system/backup.html",
  "access/delegation.html", "access/approval-workflows.html",
  "account/notifications.html", "account/sessions.html",
];
export const isPlaceholder = (key) => PLACEHOLDER_PAGES.includes(key);