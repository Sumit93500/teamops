// Help (SD1): short answers to the common questions, by area, for the person reading: a group shows only when they may open at least one
// of its pages, and each answer links only to pages they may open (shell/appNav.js openable). Everyone signed in may open it.
import { Link } from "react-router-dom";
import OwnPage from "../ui/OwnPage.jsx";
import { PageHeader, Card } from "../components/Layout.jsx";
import { useData, useSession } from "../data/hooks.js";
import { openable } from "../shell/appNav.js";
import { isManager } from "../../../assets/js/data/reporting.js";
import { can } from "../../../assets/js/core/rbac.js";
import { pageUrl, HELP, MY_TODO, TEAM_TASKS, IT_NEW, IT_MINE, IT_REQUESTS, IT_LICENCES, IT_OFFBOARDING, ANNOUNCEMENTS, APPEARANCE, IMPORT_EMPLOYEES, EXPORT_DATA } from "../routes.js";
import "../design/posts.css";

const P = (label, href) => ({ label, href });
// [group, [{ q, a, links }]]: a link is offered only when it can be opened; an answer with no link it may open isn't shown
const FAQ = [
  ["Your day", [
    { q: "How do I mark my attendance?", a: "Open Mark attendance at the start and end of your day. Your shift sets when check-in opens.", links: [P("Mark attendance", "attendance/mark-attendance.html")] },
    { q: "My check-in time is wrong. How do I fix it?", a: "On My attendance, pick the day and ask for a correction within 7 days. Your manager and then HR decide it.", links: [P("My attendance", "attendance/my-attendance.html")] },
    { q: "How do I ask for leave?", a: "Apply for leave shows what you have left before you send it. You can cancel it while it waits.", links: [P("Apply for leave", "leave/apply-leave.html"), P("My leave", "leave/my-leave.html")] },
    { q: "When are the company's holidays?", a: "Holidays lists the year's days off; a holiday never uses your leave.", links: [P("Holidays", "leave/holidays.html")] },
    { q: "Where do I keep my own to-do list?", a: "My to-do. Personal tasks are yours alone: nobody else, not even HR or an Admin, can see them.", links: [P("My to-do", MY_TODO)] },
  ]],
  ["Money and requests", [
    { q: "Where are my payslips?", a: "My payslips lists each month once the payroll is run.", links: [P("My payslips", "payroll/payslips.html")] },
    { q: "How do I claim an expense?", a: "Claim an expense with the amount, the date and a photo of the bill. My requests shows where it is.", links: [P("Claim an expense", "requests/claim-expense.html"), P("My requests", "requests/my-requests.html")] },
    { q: "My laptop or a sign-in isn't working. Who can help?", a: "Ask IT for help with a request; you'll see each update in your bell.", links: [P("Ask IT for help", IT_NEW), P("My IT requests", IT_MINE)] },
  ]],
  ["Your account", [
    { q: "How do I change my password, theme or text size?", a: "Your account menu has My account; Appearance changes the theme, colour, density and text size for you alone.", links: [P("My account", "account/my-profile.html"), P("Appearance", APPEARANCE), P("Change password", "account/change-password.html")] },
    { q: "Where do company news and notices show?", a: "Announcements, and your bell when a new one is posted for you.", links: [P("Announcements", ANNOUNCEMENTS)] },
  ]],
  ["Your team", [
    { q: "Where do I decide my team's requests?", a: "Approvals lists everything waiting for you: leave, corrections, claims and visits.", links: [P("Approvals", "requests/approvals-inbox.html")] },
    { q: "How do I see who is in today?", a: "Team attendance shows each person's day; Team leave shows who is away.", links: [P("Team attendance", "attendance/team-attendance.html"), P("Team leave", "leave/team-leave.html")] },
    { q: "How do I give someone a task?", a: "From Team tasks or My to-do: a work task needs a due date, today or later.", links: [P("Team tasks", TEAM_TASKS)] },
  ]],
  ["People and HR", [
    { q: "How do I add new employees?", a: "One at a time from Employees, or many at once with Import employees. Nobody gets a sign-in until IT prepares it and an Admin approves.", links: [P("Employees", "users/users-list.html"), P("Import employees", IMPORT_EMPLOYEES)] },
    { q: "How do I post an announcement?", a: "Announcements, then Post an announcement: to everyone or one department, pinned if it matters most.", links: [P("Announcements", ANNOUNCEMENTS)], needs: "announcements:create" },
    { q: "Where are shifts set?", a: "Shifts sets each person's hours and weekly off, and who is on which shift.", links: [P("Shifts", "attendance/shifts.html")] },
  ]],
  ["Payroll and finance", [
    { q: "How does a payroll month get paid?", a: "Finance prepares the run, an Admin approves it, and every payslip follows.", links: [P("Payroll run", "payroll/payroll-run.html")] },
    { q: "Where do I pay approved claims?", a: "Expenses lists each claim by stage; approved ones wait for payment there.", links: [P("Expenses", "finance/expenses.html")] },
    { q: "How do I get a list as a file?", a: "Export data makes CSV or Excel files of what you may see, over the dates you choose.", links: [P("Export data", EXPORT_DATA)] },
  ]],
  ["IT and assets", [
    { q: "Where is the IT desk's work?", a: "The IT desk shows what is open, overdue and waiting for an Admin; IT requests lists them all.", links: [P("IT desk", "it/dashboard.html"), P("IT requests", IT_REQUESTS)] },
    { q: "Where are licences and leavers?", a: "Licences shows seats and renewals; Offboarding lists who left and what they still hold.", links: [P("Licences", IT_LICENCES), P("Offboarding", IT_OFFBOARDING)] },
    { q: "Where is the company's equipment?", a: "Inventory is the asset register; Asset assignment shows who holds what.", links: [P("Inventory", "inventory/items.html"), P("Asset assignment", "inventory/asset-assignment.html")] },
  ]],
  ["Running the company", [
    { q: "Who can do what?", a: "Roles and access shows each role's permissions and lets an Admin give one person a little more, or less.", links: [P("Roles and access", "access/roles-list.html")] },
    { q: "Where are the company settings?", a: "Settings, for the Admin.", links: [P("Settings", "system/settings.html")] },
  ]],
];

export function helpFor(may, has) {
  return FAQ.map(([group, items]) => [group, items.map((x) => ({ ...x, links: x.links.filter((l) => may(l.href)) })).filter((x) => x.links.length && (!x.needs || has(x.needs)))])
    .filter(([, items]) => items.length);
}

function Content() {
  const { userId } = useSession();
  const groups = useData(() => helpFor(openable, can), [userId]);
  const manager = useData(() => isManager(userId), [userId]);
  return (
    <>
      <PageHeader title="Help" subtitle={`Short answers for what you can do here${manager ? ", your team included" : ""}`} />
      <div className="help-grid" id="help">
        {groups.map(([group, items]) => (
          <Card key={group} id={`help-${group.toLowerCase().replace(/[^a-z]+/g, "-")}`} title={group}>
            <ul className="help-faq">
              {items.map((x) => (
                <li key={x.q}>
                  <details>
                    <summary>{x.q}</summary>
                    <p>{x.a}</p>
                    <ul className="help-links">{x.links.map((l) => <li key={l.href}><Link to={pageUrl(l.href)}>{l.label}</Link></li>)}</ul>
                  </details>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <p className="text-muted text-sm" id="help-more">Can't find it? Use the search at the top (Ctrl K), or the menu's Find a page (press /).</p>
    </>
  );
}

export default function Help() {
  return <OwnPage page={HELP} title="Help" allowed><Content /></OwnPage>;
}