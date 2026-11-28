// My to-do (TD1; SD1 redesigned). Three tabs: Mine (your personal tasks and the work given to you), Assigned by me (work you gave others),
// Team (your team's work, for a manager, HR and the Admin). Each tab lists its tasks by when they're due: Overdue, Today, Upcoming, No
// date, then Done (folded). A row is compact: a tick to finish it, the title (opens it), the due date in words, a Work or Personal tag, and
// who gave it or who it's for. One line adds a task: a personal one, or work for yourself (that needs a due date, today or later).
// Every rule is TD1's, in data/tasks-store.js: a personal task is yours alone; work moves pending -> in progress -> done by the person
// it is for; only who gave it edits, reassigns or reopens it; nobody gets a new work task due in the past. For tasks:own (everyone).
import { useState } from "react";
import { Link } from "react-router-dom";
import { personalTasks, createPersonalTask, updatePersonalTask, deletePersonalTask, createWorkTask, workTasksFor, setWorkStatus, taskNoticesFor, markTaskNoticeRead } from "../../../assets/js/data/tasks-store.js";
import { officeNow } from "../../../assets/js/data/shift-engine.js";
import { formatDay } from "../../../assets/js/ui/leave-view.js";
import OwnPage from "../ui/OwnPage.jsx";
import { PageHeader, Card } from "../components/Layout.jsx";
import { Tabs, EmptyState } from "../components/Basics.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { MY_TODO, TEAM_TASKS, pageUrl } from "../routes.js";
import { useToast } from "../ui/Toast.jsx";
import { AskDialog, nameOf } from "../ui/it.jsx";
import { AssignDialog, WorkDetail, STATUS_OPTIONS, PRIORITY_OPTIONS } from "../ui/todo.jsx";
import { mayOpenTeamTasks } from "../shell/taskAccess.js";
import { can } from "../../../assets/js/core/rbac.js";
import "../design/todo2.css";

export const SECTIONS = [["overdue", "Overdue"], ["today", "Today"], ["upcoming", "Upcoming"], ["nodate", "No date"], ["done", "Done"]];
export function sectionOf(t, today) {
  if (t.status === "done" || t.status === "cancelled") return "done";
  if (!t.dueDate) return "nodate";
  if (t.dueDate < today) return "overdue";
  return t.dueDate === today ? "today" : "upcoming";
}
const byDue = (a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.title.localeCompare(b.title);
export function dueWords(t, today) {
  if (!t.dueDate) return "";
  if (t.status === "done" || t.status === "cancelled") return `Due ${formatDay(t.dueDate, true)}`;
  if (t.dueDate === today) return "Due today";
  return t.dueDate < today ? `Overdue since ${formatDay(t.dueDate, true)}` : `Due ${formatDay(t.dueDate, true)}`;
}
const STATUS_WORD = { pending: "To do", "in-progress": "In progress", done: "Done", cancelled: "Cancelled" };
const CHECK = "M5 12l5 5 9-10";

function QuickAdd() {
  const { userId } = useSession();
  const toast = useToast();
  const [f, setF] = useState({ title: "", dueDate: "", kind: "personal" });
  const [error, setError] = useState("");
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setError(""); };
  const add = (e) => {
    e.preventDefault();
    const r = f.kind === "work" ? createWorkTask(userId, { title: f.title, dueDate: f.dueDate, priority: "normal" }) : createPersonalTask(userId, { title: f.title, dueDate: f.dueDate, priority: "normal" });
    if (!r.ok) { setError(r.error); return; }
    setF((s) => ({ ...s, title: "", dueDate: "" })); bump(); toast(f.kind === "work" ? "Work task added: it reports to your manager." : "Task added. Only you can see it.", "success");
  };
  return (
    <form className="tq" id="quick-add" onSubmit={add} noValidate aria-label="Add a task">
      <label className="visually-hidden" htmlFor="qa-title">New task</label>
      <input className="tq__title ds-input" id="qa-title" value={f.title} maxLength={120} placeholder="Add a task and press Enter" onChange={set("title")} aria-invalid={error ? "true" : undefined} aria-describedby={error ? "qa-error" : undefined} />
      <label className="visually-hidden" htmlFor="qa-due">Due date</label>
      <input className="tq__due ds-input" id="qa-due" type="date" value={f.dueDate} onChange={set("dueDate")} />
      <label className="visually-hidden" htmlFor="qa-kind">Kind</label>
      <select className="tq__kind ds-input" id="qa-kind" value={f.kind} onChange={set("kind")}>
        <option value="personal">Personal</option>
        <option value="work">Work, for me</option>
      </select>
      <button type="submit" className="ds-btn ds-btn--primary" id="qa-add" disabled={!f.title.trim()}>Add</button>
      {error && <p className="tq__error" id="qa-error" role="alert">{error}</p>}
    </form>
  );
}

function Row({ t, tab, today, onOpen, onEdit, onRemove, onTick }) {
  const { userId } = useSession();
  const personal = t.id.startsWith("PT-");
  const mineToTick = personal || (t.assigneeId === userId && t.status !== "done" && t.status !== "cancelled");
  const done = t.status === "done" || t.status === "cancelled";
  const who = personal ? null : tab === "mine" ? (t.assignerId === userId ? "Added by you" : `From ${nameOf(t.assignerId)}`) : `For ${nameOf(t.assigneeId)}`;
  const due = dueWords(t, today);
  return (
    <li className={`tr${done ? " tr--done" : ""}${t.overdue ? " tr--late" : ""}`} data-task={t.id}>
      {tab === "mine" ? (
        <button type="button" className="tr__tick" aria-pressed={String(t.status === "done")} disabled={!mineToTick || undefined}
          aria-label={t.status === "done" ? `Mark ${t.title} not done` : `Mark ${t.title} done`} onClick={() => onTick(t)}>
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={CHECK} /></svg>
        </button>
      ) : <span className="tr__state" aria-hidden="true" />}
      <span className="tr__main">
        <button type="button" className="tr__title" onClick={() => (personal ? onEdit(t) : onOpen(t.id))}>{t.title}</button>
        <span className="tr__meta">
          <span className={`tr__tag tr__tag--${personal ? "personal" : "work"}`}>{personal ? "Personal" : "Work"}</span>
          {due && <span className={`tr__due${t.overdue ? " is-late" : ""}`}>{due}</span>}
          {!personal && <span className="tr__status">{STATUS_WORD[t.status] ?? t.status}</span>}
          {who && <span className="tr__who">{who}</span>}
        </span>
      </span>
      {personal && <button type="button" className="ds-btn ds-btn--sm ds-btn--ghost tr__remove" onClick={() => onRemove(t)} aria-label={`Delete ${t.title}`}>Delete</button>}
    </li>
  );
}

function Sections({ tasks, tab, today, empty, ...handlers }) {
  if (!tasks.length) return <EmptyState title={empty[0]} text={empty[1]} />;
  const groups = SECTIONS.map(([key, label]) => [key, label, tasks.filter((t) => sectionOf(t, today) === key).sort(byDue)]).filter(([, , list]) => list.length);
  return (
    <div className="ts" id="todo-sections">
      {groups.map(([key, label, list]) => {
        const body = <ul className="tl" aria-label={label}>{(key === "done" ? list.slice(0, 20) : list).map((t) => <Row key={t.id} t={t} tab={tab} today={today} {...handlers} />)}</ul>;
        return key === "done"
          ? <details key={key} className="ts__group ts__group--done" data-section={key}><summary><span className="ts__label">{label}</span><span className="ts__count">{list.length}</span></summary>{body}</details>
          : <section key={key} className={`ts__group ts__group--${key}`} data-section={key} aria-label={`${label}, ${list.length}`}><h3 className="ts__head"><span className="ts__label">{label}</span><span className="ts__count">{list.length}</span></h3>{body}</section>;
      })}
    </div>
  );
}

function Content() {
  const { userId } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(null);       // a work task id
  const [edit, setEdit] = useState(null);       // a personal task
  const [dialog, setDialog] = useState(false);
  const today = officeNow().date;
  const d = useData(() => {
    const team = mayOpenTeamTasks();
    return {
      team,
      mine: [...personalTasks(userId), ...workTasksFor(userId, { scope: "mine" })],
      byMe: workTasksFor(userId, { scope: "by-me" }).filter((t) => t.assigneeId !== userId),
      teamTasks: team ? workTasksFor(userId, { scope: can("tasks:view-all") ? "all" : "team" }).filter((t) => t.assigneeId !== userId) : [],
      updates: taskNoticesFor(userId, { unreadOnly: true }),
    };
  }, [userId]);
  const tabs = [["mine", "Mine", d.mine], ["by-me", "Assigned by me", d.byMe], ...(d.team ? [["team", "Team", d.teamTasks]] : [])];
  const [key, , list] = tabs[Math.min(tab, tabs.length - 1)];
  const openCount = (l) => l.filter((t) => t.status !== "done" && t.status !== "cancelled").length;
  const onTick = (t) => {
    const personal = t.id.startsWith("PT-");
    const r = personal ? updatePersonalTask(userId, t.id, { status: t.status === "done" ? "pending" : "done" }) : setWorkStatus(userId, t.id, "done");
    if (!r.ok) toast(r.error, "danger"); else { bump(); toast(t.status === "done" ? "Back on your list." : "Done.", "success"); }
  };
  const onRemove = async (t) => {
    if (!(await confirm({ message: "Delete this personal task? This can't be undone.", confirmLabel: "Delete", danger: true }))) return;
    const r = deletePersonalTask(userId, t.id);
    if (!r.ok) toast(r.error, "danger"); else { bump(); toast("Task deleted.", "success"); }
  };
  const empty = { mine: ["Nothing on your list.", "Add a task above. A personal one is yours alone."], "by-me": ["You haven't given anyone a task.", "Assign one to follow its progress here."], team: ["Your team has no work tasks.", "Tasks you or others give your team show here."] }[key];
  return (
    <>
      <PageHeader title="My to-do" subtitle="What you need to do, and the work you've given out"
        actions={<>
          {d.team && <button type="button" className="ds-btn ds-btn--primary" id="assign-open" onClick={() => setDialog(true)}>Assign a task</button>}
          {d.team && <Link className="ds-btn" to={pageUrl(TEAM_TASKS)} id="team-link">Team progress</Link>}
        </>} />
      <div className="ds-stack">
        {d.updates.length > 0 && (
          <Card id="updates-card" title="Updates" meta={`${d.updates.length} new`} actions={<button type="button" className="ds-btn ds-btn--sm" id="updates-all" onClick={() => { d.updates.forEach((n) => markTaskNoticeRead(userId, n.id)); bump(); }}>Mark all read</button>}>
            <ul className="td-updates" id="task-updates">
              {d.updates.slice(0, 3).map((n) => <li key={n.id} data-notice={n.id}><span>{n.text}</span><button type="button" className="ds-btn ds-btn--sm" onClick={() => { markTaskNoticeRead(userId, n.id); bump(); }}>Mark read</button></li>)}
            </ul>
            {d.updates.length > 3 && <span className="td-sub" id="updates-more">and {d.updates.length - 3} more</span>}
          </Card>
        )}
        <Card id="todo-card">
          <div className="ds-stack">
            <Tabs tabs={tabs.map(([, label, l]) => ({ label, count: openCount(l) }))} active={Math.min(tab, tabs.length - 1)} onChange={setTab} />
            {key === "mine" && <QuickAdd />}
            <Sections tasks={list} tab={key === "mine" ? "mine" : "others"} today={today} empty={empty} onOpen={setOpen} onEdit={setEdit} onRemove={onRemove} onTick={onTick} />
          </div>
        </Card>
      </div>
      {open && <WorkDetail id={open} onClose={() => setOpen(null)} />}
      {dialog && <AssignDialog onClose={() => setDialog(false)} onDone={() => toast("Task assigned.", "success")} />}
      {edit && <AskDialog id="pedit" title="Edit personal task" submitLabel="Save" onClose={() => setEdit(null)}
        fields={[{ name: "title", label: "Title", required: true, maxLength: 120, value: edit.title }, { name: "notes", label: "Notes", kind: "textarea", maxLength: 1000, value: edit.notes },
          { name: "dueDate", label: "Due date", kind: "date", value: edit.dueDate ?? "" }, { name: "priority", label: "Priority", kind: "select", options: PRIORITY_OPTIONS, value: edit.priority, placeholder: null },
          { name: "status", label: "Status", kind: "select", options: STATUS_OPTIONS, value: edit.status, placeholder: null }]}
        run={(v) => updatePersonalTask(userId, edit.id, v)} />}
    </>
  );
}

export default function MyTodo() {
  const allowed = useCan("tasks:own");
  return <OwnPage page={MY_TODO} title="My to-do" allowed={allowed}><Content /></OwnPage>;
}