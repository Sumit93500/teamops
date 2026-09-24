// assets/js/app.js
// The one script every page loads. Guards the page, then wires up
// the sidebar, topbar, theme and shared UI behaviours.

import { guardPage } from "./core/guard.js";
import { applyPermissions } from "./core/rbac.js";
import { loadTheme } from "./ui/theme.js";
import { renderSidebar } from "./ui/sidebar.js";
import { renderTopbar } from "./ui/topbar.js";
import { initDropdowns } from "./ui/dropdown.js";
import { initModals } from "./ui/modal.js";
import { initTabs } from "./ui/tabs.js";
import { initTableFilters } from "./ui/table-filter.js";
import { initPasswordToggles } from "./ui/password-toggle.js";
import { initOtpInputs } from "./ui/otp.js";

loadTheme();

const ok = guardPage();

if (ok) {
  renderSidebar(document.querySelector(".sidebar__nav"));
  renderTopbar({
    breadcrumbSelector: ".topbar__left strong",
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