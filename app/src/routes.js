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

// The IT desk (IT2): the app's own pages. The dashboard, the requests list and the licences: IT and the Admin (it:requests-handle or it:approve;
// licences it:licences-manage or it:licences-view-costs); one request: whoever may see it; raising a request and My IT requests: everyone;
// Offboarding: it:offboard or the Admin; the review trail: it:activity-review (the Admin). Complete details: assets:manage.
export const IT_DASHBOARD = "it/dashboard.html";
export const IT_REQUESTS = "it/requests.html";
export const IT_REQUEST = "it/request.html";
export const IT_NEW = "it/new.html";
export const IT_MINE = "it/mine.html";
export const IT_LICENCES = "it/licences.html";
export const IT_OFFBOARDING = "it/offboarding.html";
export const IT_REVIEW = "it/review.html";
export const COMPLETE_DETAILS = "inventory/complete-details.html";
// TD1: the to-do (shell/taskAccess.js): My to-do for everyone, Team tasks for managers, HR and the Admin
export const MY_TODO = "tasks/my-todo.html";
export const TEAM_TASKS = "tasks/team.html";
// I1: imports and exports (shell/importAccess.js): Import employees (import:employees), Import history (import:history-view), Export pay
// details (export:employees-pay)
export const IMPORT_EMPLOYEES = "people/import-employees.html";
export const IMPORT_HISTORY = "people/import-history.html";
export const EXPORT_PAY = "payroll/export-pay.html";

// "leave/holidays.html" -> "/pages/leave/holidays.html"
export const pageUrl = (key) => `/pages/${key}`;
