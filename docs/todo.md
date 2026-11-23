# The to-do (TD1)

Built in TD1 (2026-11-24): a to-do with two kinds of task, its permissions, the bell's updates and three screens.

**Files:**

- `assets/js/data/tasks-store.js`: the store and every rule (pure data layer; `officeos:tasks`).
- `config/permissions.js`, `config/roles.js`: the `tasks` module.
- `data/audit-trail.js`: six audit kinds.
- Screens:
  - `app/src/pages/MyTodo.jsx`;
  - `app/src/pages/TeamTasks.jsx`;
  - `app/src/ui/todo.jsx` (the chips, the assign dialog, one task's detail, the dashboards' card);
  - `app/src/shell/taskAccess.js` (who opens what; the sidebar items);
  - `app/src/design/todo.css`.
- The bell: `shell/Topbar.jsx` and `ui/ApprovalCard.jsx` call `syncTaskNotices` on load and when the panel opens.
- The card sits on the Employee (so a manager's too), Admin and HR dashboards.

**Tests:**

- `tests/live/tasks.mjs` (3 zones);
- `tests/live/react/td1.mjs` (the screens, in Edge).

## Two kinds of task

- **Personal** (`PT-n`): title 1-120 characters, notes up to 1,000, a status (pending, in-progress, done), an optional due date, a priority. **Private to the owner.**
  - Every read takes the viewer and returns nothing for anyone else: not a manager, not HR, not the Admin.
  - No permission, override or role gives access to it.
  - It is in no export, search or trail. The audit trail records only "A personal task was added.", never its words.
  - Its bell updates are stored without words (the task id and kind) and drawn only for the owner.
- **Work** (`WT-n`): title, description up to 2,000, assignee, assigner, who it reports to, a status (pending, in-progress, done, cancelled), a required due date, a priority, and a timeline of entries that are only ever added (created, assigned, status, comment, reassigned, reopened, cancelled).

## Who may do what

- **Permissions:**
  - `tasks:own` (everyone): your own tasks;
  - `tasks:assign` and `tasks:view-team` (everyone, through the manager relation, as the visit permissions work): give work tasks to, and read the tasks of, your direct reports;
  - `tasks:view-all` (HR, Admin): every work task, and assigning to anyone active.
  - None is overridable. 126 -> 130 in 50 modules: Admin 127, HR 70, Finance 60, Employee 34, IT 45.
- **Create:**
  - for yourself (it reports to your manager, or to HR when you have none);
  - a manager gives one to a direct report;
  - HR and the Admin give one to anyone.
  - Nobody gives one to someone who is inactive, has left or has not joined yet (`employment-period.js`, on the office day). A new work task's due date can't be in the past.
- **The assigner** edits (title, description, due date, priority, who it reports to), reassigns, cancels, and reopens a finished or cancelled task with a reason.
- **The assignee** moves the status (pending <-> in-progress, and to done) and comments. Done and cancelled come back only through the assigner's reopen.
- **Read:**
  - the assignee, assigner and reportTo person;
  - the assignee's manager (their team);
  - HR and Admin.
- **Comment:** the assignee, assigner and reportTo person.
- **Limits:**
  - 500 open tasks per person;
  - text with no `<` or `>` and no control characters;
  - dates real and sane (2000-01-01 to ten years ahead).

## Overdue, due soon and the bell

- **Overdue:** the due date is before today on the **office day** (`shift-engine.js officeNow`), and the task is not done or cancelled. The result is the same in India, UTC and Los Angeles runs.
- **Due soon:** due today or tomorrow.
- **The bell's updates** (never an email) are made lazily by `syncTaskNotices()`: when the app loads and when the bell opens. Each is made once per user, task, kind and occasion, so reloads and two tabs never duplicate one.
  - **Assignee:** "assigned to you" (also on a reassign or a reopen), "due tomorrow", "overdue".
  - **Assigner and reportTo person:** "done", "overdue".
  - **A personal task's owner alone:** "due tomorrow", "overdue".
- **Occasion keys:** the due date for "due tomorrow" and "overdue" (so a moved due date makes a new one), the completion time for "done".

## Screens

- **My to-do:**
  - tabs Personal, Work, Assigned by me;
  - quick add; status, priority and due chips (a word, an icon and a pattern each); filters (status, priority, the shared date range);
  - the status changes in the row;
  - edit and delete on a personal task;
  - a work task's detail (facts, timeline, comments, and the buttons the person's part allows);
  - the updates at the top (three shown, "Mark all read").
- **Team tasks** (a manager, HR, the Admin): progress by person (a stacked horizontal bar chart of the shared chart components and a table), one person's work tasks, and Assign a task (the picker holds only who the viewer may assign to).
- **Dashboards:** the small "My tasks" card (due today, overdue, open; and the team's overdue and due today for someone with a team).
- **Sidebar** (under Requests & expenses): My to-do for everyone; Team tasks for those who may open it.

## Choices made where the brief was silent

- `tasks:assign` and `tasks:view-team` are held by everyone and only work through the manager relation (the same as the visit permissions); the data layer decides by relation or `tasks:view-all`.
- An overdue update is made once per task and due date, not once a day.
- The "Assigned by me" tab leaves out tasks you gave yourself; they are on Work.
- Tasks that report to you but weren't assigned by you are on Team tasks for a manager; there is no separate list for them.
