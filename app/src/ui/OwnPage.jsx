// CV1: the frame of a page that is the app's own (not one of the old site's 55): the guard RatesRules and the other own pages carry, once.
// Nobody signed in goes to sign-in; a person the page isn't for goes to the 403 page; else the shell with the page's title.
import { useLayoutEffect } from "react";
import { Navigate } from "react-router-dom";
import Shell from "../shell/Shell.jsx";
import { tabTitle } from "../data/company.js";
import { useSession, signOutNow } from "../data/hooks.js";
import { pageUrl } from "../routes.js";

export default function OwnPage({ page, title, allowed = true, children }) {
  const { session, user, role } = useSession();
  const stale = session && !user;
  useLayoutEffect(() => { if (stale) signOutNow(); }, [stale]);
  useLayoutEffect(() => { document.documentElement.dataset.role = role?.key ?? "admin"; }, [role]);
  useLayoutEffect(() => { document.title = tabTitle(title); window.scrollTo(0, 0); }, [title]);
  if (!session || !user) return <Navigate to={pageUrl("auth/login.html")} replace />;
  if (!allowed) return <Navigate to={pageUrl("errors/403.html")} replace />;
  return <Shell page={page} title={title}>{children}</Shell>;
}
