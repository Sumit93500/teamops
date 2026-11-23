// TD1: who may open each to-do page. The pages are the app's own (not in config/routes.js), so each draws its own guard (ui/OwnPage.jsx allowed) from the same
// rule as here; the sidebar and the search use these too. The data functions check the permissions and the relation again.
//   My to-do     tasks:own (everyone)
//   Team tasks   a manager (someone people report to) or a holder of tasks:view-all (HR, Admin)
import { can } from "../../../assets/js/core/rbac.js";
import { getCurrentUserId } from "../../../assets/js/core/auth.js";
import { isManager } from "../../../assets/js/data/reporting.js";
import { MY_TODO, TEAM_TASKS } from "../routes.js";

export const mayOpenTeamTasks = () => can("tasks:view-all") || (can("tasks:view-team") && isManager(getCurrentUserId()));
export const TASK_PAGES = { [MY_TODO]: () => can("tasks:own"), [TEAM_TASKS]: mayOpenTeamTasks };
export const isTaskPage = (page) => Object.hasOwn(TASK_PAGES, page);
export const mayOpenTaskPage = (page) => isTaskPage(page) && TASK_PAGES[page]();

// the sidebar items (shell/appNav.js): the "Requests & expenses" group gets both
export const TASK_ITEMS = [
  { label: "My to-do", icon: "tick", href: MY_TODO, permission: "tasks:own" },
  { label: "Team tasks", icon: "users", href: TEAM_TASKS, permission: "tasks:view-all", alsoForReports: true },
];