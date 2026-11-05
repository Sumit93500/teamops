// assets/js/app.js
// The one script every page loads. Guards the page, then wires up
// the sidebar, topbar, theme and shared UI behaviours.

import { guardPage } from "./core/guard.js";
import { getCurrentRole } from "./core/auth.js";
import { applyPermissions } from "./core/rbac.js";
import { loadTheme, renderThemeMenu } from "./ui/theme.js";
import { renderSidebar, renderHeadcount } from "./ui/sidebar.js";
import { initRail } from "./ui/rail.js";
import { renderTopbar, renderBell } from "./ui/topbar.js";
import { renderSearch } from "./ui/search.js";
import { initDropdowns } from "./ui/dropdown.js";
import { initMenuToggle } from "./ui/menu-toggle.js";
import { initModals } from "./ui/modal.js";
import { initToasts } from "./ui/toast.js";
import { initTabs } from "./ui/tabs.js";
import { initTableFilters } from "./ui/table-filter.js";
import { initPasswordToggles } from "./ui/password-toggle.js";
import { initOtpInputs } from "./ui/otp.js";
import { initPlaceholders } from "./ui/placeholder.js";
import { initExports } from "./ui/csv-export.js";
import { initPhone } from "./ui/phone.js";

loadTheme();

const ok = guardPage();

if (ok) {
  // Public pages (login, 403, ...) pass the guard with nobody signed in, so keep their hardcoded data-role.
  const role = getCurrentRole();
  if (role) document.documentElement.dataset.role = role.key;

  renderSidebar(document.querySelector(".sidebar__nav"));
  renderHeadcount(document.getElementById("sidebar-headcount"));
  initRail();
  renderTopbar({
    avatarSelector: ".avatar",
    signOutSelector: "[data-signout]",
  });
  renderSearch();
  renderBell();
  renderThemeMenu();
  applyPermissions();
}

initDropdowns();
initMenuToggle();
initModals();
initToasts();
initTabs();
initTableFilters();
initPasswordToggles();
initOtpInputs();
initPlaceholders();
initExports();
initPhone();