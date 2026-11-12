// Every page keeps its old URL, /pages/<area>/<page>.html, behind the same guard as before (RequireRoute).
// A page not ported yet opens as NotPorted; the sign-in and error pages are PublicPage (round 3). "/" opens the
// role's landing page, or sign in.
import { createBrowserRouter, Navigate } from "react-router-dom";
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
import SamplePage from "./pages/SamplePage.jsx";
import TeamAttendance from "./pages/TeamAttendance.jsx";
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
import ApprovalWorkflows from "./pages/ApprovalWorkflows.jsx";
import Designations from "./pages/Designations.jsx";
import Delegation from "./pages/Delegation.jsx";
import MyProfile from "./pages/MyProfile.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import Notifications from "./pages/Notifications.jsx";
import Sessions from "./pages/Sessions.jsx";
import Reports from "./pages/Reports.jsx";
import AuditLog from "./pages/AuditLog.jsx";
import Backup from "./pages/Backup.jsx";
import Settings from "./pages/Settings.jsx";
import JobOpenings from "./pages/JobOpenings.jsx";
import Candidates from "./pages/Candidates.jsx";
import Announcements from "./pages/Announcements.jsx";
import About from "./pages/About.jsx";
import Offices from "./pages/Offices.jsx";
import UsersList from "./pages/UsersList.jsx";
import UserForm from "./pages/UserForm.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import Departments from "./pages/Departments.jsx";
import { ALL_PAGES, PUBLIC_PAGES, pageUrl, ABOUT, OFFICES } from "./routes.js";
import { useSession } from "./data/hooks.js";

const PORTED = {
  "leave/my-leave.html": MyLeave,
  "dashboard/admin.html": AdminDashboard,
  "dashboard/employee.html": EmployeeDashboard,
  "dashboard/hr.html": HrDashboard,
  "dashboard/finance.html": FinanceDashboard,
  "attendance/mark-attendance.html": MarkAttendance,
  "attendance/my-attendance.html": MyAttendance,
  "attendance/shifts.html": () => <SamplePage page="attendance/shifts.html" />,
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
  "access/approval-workflows.html": ApprovalWorkflows,
  "access/designations.html": Designations,
  "access/delegation.html": Delegation,
  "account/my-profile.html": MyProfile,
  "account/change-password.html": ChangePassword,
  "account/notifications.html": Notifications,
  "account/sessions.html": Sessions,
  "system/reports.html": Reports,
  "system/audit-log.html": AuditLog,
  "system/backup.html": Backup,
  "system/settings.html": Settings,
  "recruitment/job-openings.html": JobOpenings,
  "recruitment/candidates.html": Candidates,
  "announcements/announcements.html": Announcements,
  // L1: the users pages, built in the design system
  "users/users-list.html": UsersList,
  "users/user-form.html": UserForm,
  "users/user-profile.html": UserProfile,
  "users/departments.html": Departments,
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
  { path: pageUrl(ABOUT), element: <About /> },   // D2a: the company's About page, for anyone signed in
  { path: pageUrl(OFFICES), element: <Offices /> },   // L1: the offices, for anyone signed in
  ...ALL_PAGES.map((page) => ({ path: pageUrl(page), element: <RequireRoute page={page}>{pageElement(page)}</RequireRoute> })),
  { path: "*", element: <Navigate to={pageUrl("errors/404.html")} replace /> },
]);
