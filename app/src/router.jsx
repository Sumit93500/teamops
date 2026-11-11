// Every page keeps its old URL, /pages/<area>/<page>.html, behind the same guard as before (RequireRoute).
// A page not ported yet opens as NotPorted. "/" opens the role's landing page, or sign in.
import { createBrowserRouter, Navigate } from "react-router-dom";
import RequireRoute from "./RequireRoute.jsx";
import NotPorted from "./NotPorted.jsx";
import MyLeave from "./pages/MyLeave.jsx";
import Login from "./pages/Login.jsx";
import { ALL_PAGES, pageUrl } from "./routes.js";
import { useSession } from "./data/hooks.js";

const PORTED = {
  "leave/my-leave.html": MyLeave,
  "auth/login.html": Login,
};

function Home() {
  const { role, user } = useSession();
  return <Navigate to={pageUrl(role && user ? role.landing : "auth/login.html")} replace />;
}

export const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  ...ALL_PAGES.map((page) => {
    const Page = PORTED[page];
    return { path: pageUrl(page), element: <RequireRoute page={page}>{Page ? <Page /> : <NotPorted page={page} />}</RequireRoute> };
  }),
  { path: "*", element: <Navigate to={pageUrl("errors/404.html")} replace /> },
]);
