// The app's entry: the old stylesheet as is, the saved theme and accent (the pre-paint script in index.html
// has set them before this runs), the router and the toasts.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "../../assets/css/style.css";
import "./design/tokens.css";   // D2a: the design system's tokens, after the old css so they win where names overlap
import "./design/shell.css";
import { loadTheme } from "../../assets/js/ui/theme.js";
import { ToastProvider } from "./ui/Toast.jsx";
import { ConfirmProvider } from "./components/Confirm.jsx";
import { router } from "./router.jsx";

loadTheme();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <RouterProvider router={router} />
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>,
);
