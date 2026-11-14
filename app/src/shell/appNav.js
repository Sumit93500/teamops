// The React app's sidebar and search lists (L2): config/nav.js's NAV and OTHER_PAGES (the old site's, unchanged) plus the
// app's own pages. Offices joins the Attendance section for everyone (offices:view is everyone's self-service; the L1
// ruling); My locations is found by search and linked from My profile and Mark attendance. The app's own pages aren't in
// config/routes.js, so canOpenPage() doesn't know them: openable() lets anyone signed in open them.
import { NAV, OTHER_PAGES } from "../../../assets/js/config/nav.js";
import { canOpenPage } from "../../../assets/js/core/guard.js";
import { can } from "../../../assets/js/core/rbac.js";
import { OFFICES, MY_LOCATIONS, ABOUT, APPEARANCE, RATES_RULES } from "../routes.js";

const PIN = "M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5";
const OFFICES_ITEM = { label: "Offices", icon: "pin", iconPath: PIN, href: OFFICES, permission: "offices:view" };
export const APP_NAV = NAV.map((g) => (g.group === "Attendance" ? { ...g, items: [...g.items, OFFICES_ITEM] } : g));
export const APP_OTHER_PAGES = [...OTHER_PAGES, { label: "My locations", group: "Attendance", href: MY_LOCATIONS }, { label: "Appearance", group: "My account", href: APPEARANCE },
  { label: "Rates and rules", group: "Payroll", href: RATES_RULES }];
const APP_OWN = [OFFICES, MY_LOCATIONS, ABOUT, APPEARANCE];
// Rates and rules: Finance and Admin; searched for and linked, not in the sidebar.
export const mayOpenRates = () => can("tax:view") || can("payroll-rules:verify");
export const openable = (href) => (href === RATES_RULES ? mayOpenRates() : APP_OWN.includes(href) || canOpenPage(href));