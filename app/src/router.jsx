// Every page keeps its old URL, /pages/<area>/<page>.html, behind the same guard as before (RequireRoute).
// A page not ported yet opens as NotPorted; the sign-in and error pages are PublicPage (round 3). "/" opens the
// role's landing page, or sign in.
import { createBrowserRouter, Navigate } from "react-router-dom";
import RequireRoute from "./RequireRoute.jsx";
import NotPorted from "./NotPorted.jsx";
import MyLeave from "./pages/MyLeave.jsx";
import PublicPage from "./pages/PublicPage.jsx";
import Gallery from "./pages/Gallery.jsx";
import { ALL_PAGES, PUBLIC_PAGES, pageUrl } from "./routes.js";
import { useSession } from "./data/hooks.js";

const PORTED = {
  "leave/my-leave.html": MyLeave,
};

function Home() {
  const { role, user } = useSession();
  return <Navigate to={pageUrl(role && user ? role.landing : "auth/login.html")} replace />;
}

function pageElement(page) {
  if (PUBLIC_PAGES.includes(page)) return <PublicPage page={page} />;
  const Page = PORTED[page];
  return Page ? <Page /> : <NotPorted page={page} />;
}

export const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/gallery", element: <Gallery /> },   // round 4's component gallery (not a product page)
  ...ALL_PAGES.map((page) => ({ path: pageUrl(page), element: <RequireRoute page={page}>{pageElement(page)}</RequireRoute> })),
  { path: "*", element: <Navigate to={pageUrl("errors/404.html")} replace /> },
]);
