// The guard, as core/guard.js guardPage() decides it, without leaving the app: a public page opens for
// anyone; otherwise nobody signed in goes to sign-in, a session whose person no longer exists is signed out,
// and a page the person may not open shows the 403 page. canOpenPage() is the old guard's own rule
// (the route's permission, or a manager on a manager page).
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { canOpenPage } from "../../assets/js/core/guard.js";
import { useSession, signOutNow } from "./data/hooks.js";
import { PUBLIC_PAGES, pageUrl } from "./routes.js";

export default function RequireRoute({ page, children }) {
  const { session, user, role } = useSession();
  const isPublic = PUBLIC_PAGES.includes(page);
  const stale = !isPublic && session && !user;
  useEffect(() => { if (stale) signOutNow(); }, [stale]);
  // The role's colours (tokens.css keys on <html data-role>), as app.js sets them.
  useEffect(() => { if (role) document.documentElement.dataset.role = role.key; }, [role]);

  if (isPublic) return children;
  if (!session || !user) return <Navigate to={pageUrl("auth/login.html")} replace />;
  if (!canOpenPage(page)) return <Navigate to={pageUrl("errors/403.html")} replace />;
  return children;
}
