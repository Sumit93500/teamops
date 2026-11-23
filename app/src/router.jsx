// Every page keeps its old URL, /pages/<area>/<page>.html, behind the same guard as before (RequireRoute).
// A page not ported yet opens as NotPorted; the sign-in and error pages are PublicPage (round 3). "/" opens the
// role's landing page, or sign in.
// E1: every route sits under AccountGate: someone who must change their password (a temporary one) goes to Set password
// whatever URL they open, and a person whose sign-in was disabled is signed out at the next check (any page change or
// store change, another tab's included). Sign in, Forgot password and Reset password are the app's own pages now
// (pages/AuthPages.jsx); Set password and the Admin's Mail outbox are new.
import { useEffect } from "react";
import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router-dom";
import RequireRoute from "./RequireRoute.jsx";
import NotPorted from "./NotPorted.jsx";
import MyLeave from "./pages/MyLeave.jsx";
import PublicPage from "./pages/PublicPage.jsx";
import Gallery from "./pages/Gallery.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import EmployeeDashboard from "./pages/EmployeeDashboard.jsx";
import HrDashboard from "./pages/HrDashboard.jsx";
import FinanceDashboard from "./pages/FinanceDashboard.jsx";
import MarkAttendance from "./pages/MarkAttendance.jsx";
import MyAttendance from "./pages/MyAttendance.jsx";
import TeamAttendance from "./pages/TeamAttendance.jsx";
import Shifts from "./pages/Shifts.jsx";
import Regularization from "./pages/Regularization.jsx";
import ApplyLeave from "./pages/ApplyLeave.jsx";
import LeaveApprovals from "./pages/LeaveApprovals.jsx";
import TeamLeave from "./pages/TeamLeave.jsx";
import Holidays from "./pages/Holidays.jsx";
import PayrollRun from "./pages/PayrollRun.jsx";
import Payslips from "./pages/Payslips.jsx";
import PayslipView from "./pages/PayslipView.jsx";
import SalaryStructure from "./pages/SalaryStructure.jsx";
import Expenses from "./pages/Expenses.jsx";
import TaxDeductions from "./pages/TaxDeductions.jsx";
import ApprovalsInbox from "./pages/ApprovalsInbox.jsx";
import MyRequests from "./pages/MyRequests.jsx";
import ClaimExpense from "./pages/ClaimExpense.jsx";
import RolesList from "./pages/RolesList.jsx";
import RoleEditor from "./pages/RoleEditor.jsx";
import Designations from "./pages/Designations.jsx";
import MyProfile from "./pages/MyProfile.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import Settings from "./pages/Settings.jsx";
import About from "./pages/About.jsx";
import Offices from "./pages/Offices.jsx";
import MyLocations from "./pages/MyLocations.jsx";
import Appearance from "./pages/Appearance.jsx";
import RatesRules from "./pages/RatesRules.jsx";
import LeavePolicy from "./pages/LeavePolicy.jsx";
import UsersList from "./pages/UsersList.jsx";
import UserForm from "./pages/UserForm.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import Departments from "./pages/Departments.jsx";
import MyVisits from "./pages/MyVisits.jsx";   // CV1
import TeamVisits from "./pages/TeamVisits.jsx";
import VisitDetail from "./pages/VisitDetail.jsx";
import Rebuilding from "./pages/Rebuilding.jsx";   // F2
import MyAssets from "./pages/MyAssets.jsx";   // AS2: the five inventory pages, restored
import Inventory from "./pages/Inventory.jsx";
import AssetAssignment from "./pages/AssetAssignment.jsx";
import StockMovements from "./pages/StockMovements.jsx";
import Vendors from "./pages/Vendors.jsx";
import ItDashboard from "./pages/ItDashboard.jsx";   // IT2: the IT desk's pages
import ItRequests from "./pages/ItRequests.jsx";
import ItRequest from "./pages/ItRequest.jsx";
import ItNew from "./pages/ItNew.jsx";
import MyItRequests from "./pages/MyItRequests.jsx";
import Licences from "./pages/Licences.jsx";
import Offboarding from "./pages/Offboarding.jsx";
import ItReview from "./pages/ItReview.jsx";
import ImportEmployees from "./pages/ImportEmployees.jsx";   // I1
import ImportHistory from "./pages/ImportHistory.jsx";
import ExportPay from "./pages/ExportPay.jsx";
import CompleteDetails from "./pages/CompleteDetails.jsx";
import { isPlaceholder } from "./shell/placeholders.js";
import { Login, ForgotPassword, ResetPassword, SetPassword, SET_PASSWORD } from "./pages/AuthPages.jsx";
import MailOutbox, { MAIL_OUTBOX } from "./pages/MailOutbox.jsx";
import { sessionAllowed, mustChangePassword } from "../../assets/js/data/credentials.js";
import { IT_DASHBOARD, IT_REQUESTS, IT_REQUEST, IT_NEW, IT_MINE, IT_LICENCES, IT_OFFBOARDING, IT_REVIEW, COMPLETE_DETAILS, IMPORT_EMPLOYEES, IMPORT_HISTORY, EXPORT_PAY } from "./routes.js";
import { ALL_PAGES, PUBLIC_PAGES, pageUrl, ABOUT, OFFICES, MY_LOCATIONS, APPEARANCE, RATES_RULES, LEAVE_POLICY_PAGE, MY_VISITS, TEAM_VISITS, VISIT_PAGE } from "./routes.js";
import { useSession, signOutNow } from "./data/hooks.js";

const PORTED = {
  "leave/my-leave.html": MyLeave,
  "dashboard/admin.html": AdminDashboard,
  "dashboard/employee.html": EmployeeDashboard,
  "dashboard/hr.html": HrDashboard,
  "dashboard/finance.html": FinanceDashboard,
  "attendance/mark-attendance.html": MarkAttendance,
  "attendance/my-attendance.html": MyAttendance,
  "attendance/shifts.html": Shifts,   // SH1: built (was a sample page)
  "attendance/team-attendance.html": TeamAttendance,
  "attendance/regularization.html": Regularization,
  "leave/apply-leave.html": ApplyLeave,
  "leave/leave-approvals.html": LeaveApprovals,
  "leave/team-leave.html": TeamLeave,
  "leave/holidays.html": Holidays,
  "payroll/payroll-run.html": PayrollRun,
  "payroll/payslips.html": Payslips,
  "payroll/payslip-view.html": PayslipView,
  "payroll/salary-structure.html": SalaryStructure,
  "finance/expenses.html": Expenses,
  "finance/tax-deductions.html": TaxDeductions,
  "requests/approvals-inbox.html": ApprovalsInbox,
  "requests/my-requests.html": MyRequests,
  "requests/claim-expense.html": ClaimExpense,
  "access/roles-list.html": RolesList,
  "access/role-editor.html": RoleEditor,
  "access/designations.html": Designations,
  "account/my-profile.html": MyProfile,
  "account/change-password.html": ChangePassword,
  "system/settings.html": Settings,
  // L1: the users pages, built in the design system
  "users/users-list.html": UsersList,
  "users/user-form.html": UserForm,
  "users/user-profile.html": UserProfile,
  "users/departments.html": Departments,
  // AS2: the inventory pages, on the AS1 register and stock ledger
  "inventory/my-assets.html": MyAssets,
  "inventory/items.html": Inventory,
  "inventory/asset-assignment.html": AssetAssignment,
  "inventory/stock-movements.html": StockMovements,
  "inventory/vendors.html": Vendors,
};

function Home() {
  const { role, user } = useSession();
  return <Navigate to={pageUrl(role && user ? role.landing : "auth/login.html")} replace />;
}

const AUTH_PAGES = { "auth/login.html": Login, "auth/forgot-password.html": ForgotPassword, "auth/reset-password.html": ResetPassword };

function pageElement(page) {
  if (AUTH_PAGES[page]) { const Page = AUTH_PAGES[page]; return <Page />; }
  if (PUBLIC_PAGES.includes(page)) return <PublicPage page={page} />;
  if (isPlaceholder(page)) return <Rebuilding page={page} />;   // F2: one neutral page for every placeholder
  const Page = PORTED[page];
  return Page ? <Page /> : <NotPorted page={page} />;
}

function AccountGate() {
  const { session, user, userId } = useSession();
  const { pathname } = useLocation();
  const open = pathname === pageUrl(SET_PASSWORD) || PUBLIC_PAGES.some((p) => pathname === pageUrl(p));
  const disabled = Boolean(session && userId && !sessionAllowed(userId));
  // the session ends once the sign-in page shows (ending it before the navigation is done would let the page being left
  // send them to sign in again, without the reason)
  const onLogin = pathname === pageUrl("auth/login.html");
  useEffect(() => { if (disabled && onLogin) signOutNow(); }, [disabled, onLogin]);
  if (disabled && !onLogin) return <Navigate to={`${pageUrl("auth/login.html")}?reason=disabled`} replace />;
  if (!open && user && mustChangePassword(user.id)) return <Navigate to={pageUrl(SET_PASSWORD)} replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([{ element: <AccountGate />, children: [
  { path: "/", element: <Home /> },
  { path: pageUrl(SET_PASSWORD), element: <SetPassword /> },   // E1: a new employee's link, or the first sign-in's new password
  { path: pageUrl(MAIL_OUTBOX), element: <MailOutbox /> },   // E1: the demo's Mail outbox (Admin)
  { path: "/gallery", element: <Gallery /> },   // round 4's component gallery (not a product page)
  { path: pageUrl(ABOUT), element: <About /> },   // D2a: the company's About page, for anyone signed in
  { path: pageUrl(OFFICES), element: <Offices /> },   // L1: the offices, for anyone signed in
  { path: pageUrl(MY_LOCATIONS), element: <MyLocations /> },   // L2: your check-in places, for anyone signed in
  { path: pageUrl(APPEARANCE), element: <Appearance /> },   // A1: your appearance, for anyone signed in
  { path: pageUrl(MY_VISITS), element: <MyVisits /> },   // CV1: your client / official visits, for anyone signed in
  { path: pageUrl(TEAM_VISITS), element: <TeamVisits /> },   // CV1: the team's visits (a manager, HR, Admin)
  { path: pageUrl(VISIT_PAGE), element: <VisitDetail /> },   // CV1: one visit and its punch trail
  { path: pageUrl(RATES_RULES), element: <RatesRules /> },   // P4a: the statutory rates and rules (Finance reads, Admin verifies)
  { path: pageUrl(LEAVE_POLICY_PAGE), element: <LeavePolicy /> },   // P4b: the tenure leave policy (HR reads, Admin edits)
  { path: pageUrl(IT_DASHBOARD), element: <ItDashboard /> },   // IT2: the IT desk (each page carries its own guard: ui/OwnPage.jsx)
  { path: pageUrl(IT_REQUESTS), element: <ItRequests /> },
  { path: pageUrl(IT_REQUEST), element: <ItRequest /> },
  { path: pageUrl(IT_NEW), element: <ItNew /> },
  { path: pageUrl(IT_MINE), element: <MyItRequests /> },
  { path: pageUrl(IT_LICENCES), element: <Licences /> },
  { path: pageUrl(IT_OFFBOARDING), element: <Offboarding /> },
  { path: pageUrl(IT_REVIEW), element: <ItReview /> },
  { path: pageUrl(COMPLETE_DETAILS), element: <CompleteDetails /> },   // IT2: the imported assets that still lack details
  { path: pageUrl(IMPORT_EMPLOYEES), element: <ImportEmployees /> },   // I1: imports and exports
  { path: pageUrl(IMPORT_HISTORY), element: <ImportHistory /> },
  { path: pageUrl(EXPORT_PAY), element: <ExportPay /> },
  ...ALL_PAGES.map((page) => ({ path: pageUrl(page), element: <RequireRoute page={page}>{pageElement(page)}</RequireRoute> })),
  { path: "*", element: <Navigate to={pageUrl("errors/404.html")} replace /> },
] }]);
