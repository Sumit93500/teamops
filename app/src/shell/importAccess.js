// I1: who may open each import and export page. The pages are the app's own (not in config/routes.js), so each draws its own guard
// (ui/OwnPage.jsx allowed) from the same rule as here; the sidebar and the search use these too. The data functions check again.
//   Import employees      import:employees (HR, Admin)
//   Import history        import:history-view (HR, Admin)
//   Export pay details    export:employees-pay (Finance, Admin)
// The Users list's Import and Export buttons follow import:employees and export:employees.
import { can } from "../../../assets/js/core/rbac.js";
import { IMPORT_EMPLOYEES, IMPORT_HISTORY, EXPORT_PAY } from "../routes.js";

export const IMPORT_PAGES = {
  [IMPORT_EMPLOYEES]: () => can("import:employees"),
  [IMPORT_HISTORY]: () => can("import:history-view"),
  [EXPORT_PAY]: () => can("export:employees-pay"),
};
export const isImportPage = (page) => Object.hasOwn(IMPORT_PAGES, page);
export const mayOpenImportPage = (page) => isImportPage(page) && IMPORT_PAGES[page]();

const UPLOAD = "M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3";
const HISTORY = "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2";
const DOWNLOAD = "M12 4v12M7 11l5 5 5-5M4 20h16";
// the sidebar items (shell/appNav.js): People gets the two import pages, Payroll the pay export
export const PEOPLE_ITEMS = [
  { label: "Import employees", icon: "upload", iconPath: UPLOAD, href: IMPORT_EMPLOYEES, permission: "import:employees" },
  { label: "Import history", icon: "history", iconPath: HISTORY, href: IMPORT_HISTORY, permission: "import:history-view" },
];
export const PAYROLL_ITEMS = [{ label: "Export pay details", icon: "download", iconPath: DOWNLOAD, href: EXPORT_PAY, permission: "export:employees-pay" }];