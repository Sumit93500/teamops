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

// "leave/holidays.html" -> "/pages/leave/holidays.html"
export const pageUrl = (key) => `/pages/${key}`;
