// The app's entry: the old stylesheet as is, the person's appearance (A1: data/prefs.js; the pre-paint script in index.html
// has set it before this runs), the router and the toasts.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "../../assets/css/style.css";
import "./design/tokens.css";   // D2a: the design system's tokens, after the old css so they win where names overlap
import "./design/shell.css";
import "./design/sidebar.css";   // S1: the collapsible desktop sidebar
import "./design/prefs.css";   // A1: density, text size and motion through the tokens; the Appearance panel
import { initPrefs } from "./data/prefs.js";
import { ToastProvider } from "./ui/Toast.jsx";
import { ConfirmProvider } from "./components/Confirm.jsx";
import { router } from "./router.jsx";

initPrefs();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <RouterProvider router={router} />
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>,
);
