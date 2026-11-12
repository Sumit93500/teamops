// The guard, as core/guard.js guardPage() decides it, without leaving the app: a public page opens for
// anyone; otherwise nobody signed in goes to sign-in, a session whose person no longer exists is signed out,
// and a page the person may not open shows the 403 page. canOpenPage() is the old guard's own rule
// (the route's permission, or a manager on a manager page).
import { useEffect, useLayoutEffect } from "react";
import META from "virtual:page-meta";
import { Navigate } from "react-router-dom";
import { canOpenPage } from "../../assets/js/core/guard.js";
import { useSession, signOutNow } from "./data/hooks.js";
import { PUBLIC_PAGES, pageUrl } from "./routes.js";
import { tabTitle, COMPANY } from "./data/company.js";

export default function RequireRoute({ page, children }) {
  const { session, user, role } = useSession();
  const isPublic = PUBLIC_PAGES.includes(page);
  const stale = !isPublic && session && !user;
  useEffect(() => { if (stale) signOutNow(); }, [stale]);
  // The role's colours (tokens.css keys on <html data-role>): the signed-in person's role, else the page's own static one
  // (a public page's colours when nobody is signed in). Set before the first paint, so no other role's colour ever shows.
  useLayoutEffect(() => { document.documentElement.dataset.role = role?.key ?? META[page]?.role ?? "admin"; }, [role, page]);
  // A new page starts at the top with its own tab title, as a full load of the old page did.
  // D2a: "<page> | <company>" (data/company.js) in place of "<page> | OfficeOS".
  // L1: and again when the company's name changes (Settings' Company profile), so the tab follows at once.
  const companyName = COMPANY.name;
  useLayoutEffect(() => { document.title = tabTitle(META[page]?.docTitle); }, [page, companyName]);
  useLayoutEffect(() => { window.scrollTo(0, 0); }, [page]);

  if (isPublic) return children;
  if (!session || !user) return <Navigate to={pageUrl("auth/login.html")} replace />;
  if (!canOpenPage(page)) return <Navigate to={pageUrl("errors/403.html")} replace />;
  return children;
}
