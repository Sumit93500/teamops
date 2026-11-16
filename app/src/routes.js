// Every page keeps its old URL: /pages/<area>/<page>.html. config/routes.js (the permission each page needs)
// and config/nav.js (the sidebar and search) name pages by that same key, so they are reused unchanged.
import { ROUTES } from "../../assets/js/config/routes.js";

// The pages anyone may open, signed in or not (core/guard.js keeps the same list, not exported).
export const PUBLIC_PAGES = [
  "auth/login.html", "auth/forgot-password.html", "auth/reset-password.html", "auth/two-factor.html",
  "errors/403.html", "errors/404.html", "errors/500.html",
];

// All 55 pages: the 48 routed ones and the 7 public ones.
export const ALL_PAGES = [...Object.keys(ROUTES), ...PUBLIC_PAGES];

// The About page (D2a): the app's own, not one of the 55 old pages; anyone signed in may open it.
export const ABOUT = "company/about.html";

// The Offices page (L1): also the app's own; everyone signed in may open it (offices:view is everyone's self-service).
export const OFFICES = "company/offices.html";

// My locations (L2): the app's own; everyone signed in may open it (home places need HR's home check-in switch).
export const MY_LOCATIONS = "account/my-locations.html";

// Appearance (A1): the app's own; everyone signed in may open it (Settings, where Admins also find it, is Admins' only).
export const APPEARANCE = "account/appearance.html";

// Rates and rules (P4a): the app's own; the dated statutory rows, their sources and who verified them. Admin (verifies, adds
// rows) and Finance (reads): payroll-rules:verify or tax:view.
export const RATES_RULES = "payroll/rates-rules.html";

// Leave policy (P4b): the app's own; the tenure leave policy by band. Admin edits, HR reads (leave-policy:edit or leave:approve).
export const LEAVE_POLICY_PAGE = "leave/leave-policy.html";

// Mail outbox (E1): the app's own; what OfficeOS would email (sign-in details, reset links). Admin only (accounts:unlock).
export const MAIL_OUTBOX = "system/mail-outbox.html";

// Visits (CV1): the app's own pages. My visits: everyone signed in; Team visits: managers, HR and Admin (isManager or visits:view-all);
// Visit: one visit, for the person, their manager, HR and Admin (the page says who can't see it).
export const MY_VISITS = "visits/my-visits.html";
export const TEAM_VISITS = "visits/team-visits.html";
export const VISIT_PAGE = "visits/visit.html";

// "leave/holidays.html" -> "/pages/leave/holidays.html"
export const pageUrl = (key) => `/pages/${key}`;
