// assets/js/app.js
// The one script every page loads. Guards the page, then wires up
// the sidebar, topbar, theme and shared UI behaviours.

import { guardPage } from "./core/guard.js";
import { getCurrentRole } from "./core/auth.js";
import { applyPermissions } from "./core/rbac.js";
import { loadTheme } from "./ui/theme.js";
import { renderSidebar, renderHeadcount } from "./ui/sidebar.js";
import { renderTopbar } from "./ui/topbar.js";
import { initDropdowns } from "./ui/dropdown.js";
import { initModals } from "./ui/modal.js";
import { initTabs } from "./ui/tabs.js";
import { initTableFilters } from "./ui/table-filter.js";
import { initPasswordToggles } from "./ui/password-toggle.js";
import { initOtpInputs } from "./ui/otp.js";
import { initPlaceholders } from "./ui/placeholder.js";
import { initExports } from "./ui/csv-export.js";

loadTheme();

const ok = guardPage();

if (ok) {
  // Public pages (login, 403, ...) pass the guard with nobody signed in, so keep their hardcoded data-role.
  const role = getCurrentRole();
  if (role) document.documentElement.dataset.role = role.key;

  renderSidebar(document.querySelector(".sidebar__nav"));
  renderHeadcount(document.getElementById("sidebar-headcount"));
  renderTopbar({
    avatarSelector: ".avatar",
    signOutSelector: "[data-signout]",
  });
  applyPermissions();
}

initDropdowns();
initModals();
initTabs();
initTableFilters();
initPasswordToggles();
initOtpInputs();
initPlaceholders();
initExports();