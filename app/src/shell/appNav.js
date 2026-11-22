// The React app's sidebar and search lists (L2): config/nav.js's NAV and OTHER_PAGES (the old site's, unchanged) plus the
// app's own pages. Offices joins the Attendance section for everyone (offices:view is everyone's self-service; the L1
// ruling); My locations is found by search and linked from My profile and Mark attendance. The app's own pages aren't in
// config/routes.js, so canOpenPage() doesn't know them: openable() lets anyone signed in open them.
import { NAV, OTHER_PAGES } from "../../../assets/js/config/nav.js";
import { canOpenPage } from "../../../assets/js/core/guard.js";
import { can } from "../../../assets/js/core/rbac.js";
import { OFFICES, MY_LOCATIONS, ABOUT, APPEARANCE, RATES_RULES, LEAVE_POLICY_PAGE, MAIL_OUTBOX, MY_VISITS, TEAM_VISITS, VISIT_PAGE } from "../routes.js";
import { isManager } from "../../../assets/js/data/reporting.js";
import { getCurrentUserId } from "../../../assets/js/core/auth.js";
import { isPlaceholder } from "./placeholders.js";
import { ASSET_NAV_PERMISSION, isAssetPage, mayOpenAssetPage } from "./assetAccess.js";   // AS2

const PIN = "M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5";
const OFFICES_ITEM = { label: "Offices", icon: "pin", iconPath: PIN, href: OFFICES, permission: "offices:view" };
// F2: placeholder pages are left out (a group left empty goes too)
// CV1: My visits for everyone (visits:request); Team visits for HR and Admin (visits:view-all) and for a manager (alsoForReports)
const MY_VISITS_ITEM = { label: "My visits", icon: "pin", iconPath: PIN, href: MY_VISITS, permission: "visits:request" };
const TEAM_VISITS_ITEM = { label: "Team visits", icon: "pin", iconPath: PIN, href: TEAM_VISITS, permission: "visits:view-all", alsoForReports: true };
// AS2: the Assets & inventory pages are real again; each shows for the AS1 / IT1 permission its page needs (shell/assetAccess.js), not the old Admin-only ones
const withAssetPermissions = (g) => (g.group === "Assets & inventory" ? { ...g, items: g.items.map((i) => (ASSET_NAV_PERMISSION[i.href] ? { ...i, permission: ASSET_NAV_PERMISSION[i.href] } : i)) } : g);
export const APP_NAV = NAV.map((g) => (g.group === "Attendance" ? { ...g, items: [...g.items, MY_VISITS_ITEM, TEAM_VISITS_ITEM, OFFICES_ITEM] } : g)).map(withAssetPermissions)
  .map((g) => ({ ...g, items: g.items.filter((i) => !isPlaceholder(i.href)) })).filter((g) => g.items.length > 0);
export const APP_OTHER_PAGES = [...OTHER_PAGES, { label: "My locations", group: "Attendance", href: MY_LOCATIONS }, { label: "Appearance", group: "My account", href: APPEARANCE },
  { label: "Rates and rules", group: "Payroll", href: RATES_RULES }, { label: "Leave policy", group: "Leave", href: LEAVE_POLICY_PAGE },
  { label: "Mail outbox", group: "System", href: MAIL_OUTBOX }, { label: "Visit", group: "Attendance", href: VISIT_PAGE }].filter((p) => !isPlaceholder(p.href));   // E1: found by search, linked from a profile's Account card; F2: no placeholder
const APP_OWN = [OFFICES, MY_LOCATIONS, ABOUT, APPEARANCE, MY_VISITS, VISIT_PAGE];
// Rates and rules: Finance and Admin; Leave policy: HR and Admin. They are searched for and linked, not in the sidebar.
export const mayOpenRates = () => can("tax:view") || can("payroll-rules:verify");
export const mayOpenLeavePolicy = () => can("leave:approve") || can("leave-policy:edit");
export const mayOpenOutbox = () => can("accounts:unlock");
export const mayOpenTeamVisits = () => can("visits:view-all") || isManager(getCurrentUserId());
export const openable = (href) => (isAssetPage(href) ? mayOpenAssetPage(href) : href === RATES_RULES ? mayOpenRates() : href === LEAVE_POLICY_PAGE ? mayOpenLeavePolicy() : href === MAIL_OUTBOX ? mayOpenOutbox() : href === TEAM_VISITS ? mayOpenTeamVisits() : APP_OWN.includes(href) || canOpenPage(href));