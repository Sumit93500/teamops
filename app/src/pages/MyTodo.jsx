// My to-do (TD1): three tabs. Personal: tasks only you can ever see (not your manager, HR or the Admin); quick add, edit, delete, a status you change
// in the row. Work: tasks assigned to you (and the ones you gave yourself to report to your manager): open one for its timeline and comments, start
// it and finish it. Assigned by me: tasks you gave to others, with their progress. Filters: status, priority, due range (the shared date range).
// For tasks:own (everyone). Data: data/tasks-store.js.
import { useState } from "react";
import { personalTasks, createPersonalTask, updatePersonalTask, deletePersonalTask, workTasksFor, setWorkStatus, taskNoticesFor, markTaskNoticeRead } from "../../../assets/js/data/tasks-store.js";
import OwnPage from "../ui/OwnPage.jsx";
import { PageHeader, Card } from "../components/Layout.jsx";
import { Tabs, EmptyState, NO_DATA } from "../components/Basics.jsx";
import { DateRange, FilterBar, FilterSelect } from "../components/Controls.jsx";
import { Field, Input, Select } from "../components/Form.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import Table from "../components/Table.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { countText } from "../data/counts.js";
import { bump } from "../data/bus.js";
import { MY_TODO, TEAM_TASKS, pageUrl } from "../routes.js";
import { useToast } from "../ui/Toast.jsx";
import { AskDialog, nameOf } from "../ui/it.jsx";
import { StatusChip, PriorityChip, DueChip, AssignDialog, WorkDetail, STATUS_OPTIONS, PRIORITY_OPTIONS } from "../ui/todo.jsx";
import { todayIso } from "../../../assets/js/ui/leave-view.js";
import { Link } from "react-router-dom";
import { mayOpenTeamTasks } from "../shell/taskAccess.js";

const NONE = { preset: "", from: "", to: "" };
const TABS = ["Personal", "Work", "Assigned by me"];

function Quick({ onAdded }) {
  const { userId } = useSession();
  const [f, setF] = useState({ title: "", dueDate: "", priority: "normal" });
  const [error, setError] = useState("");
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setError(""); };
  const add = (e) => {
    e.preventDefault();
    const r = createPersonalTask(userId, f);
    if (!r.ok) { setError(r.error); return; }
    setF({ title: "", dueDate: "", priority: "normal" }); setError(""); bump(); onAdded?.();
  };
  return (
    <form className="ds-stack" onSubmit={add} noValidate id="quick-add" aria-label="Add a personal task">
      <div className="td-add">
        <Field id="qa-title" label="New personal task" error={error || undefined}><Input id="qa-title" value={f.title} maxLength={120} placeholder="What do you need to do?" onChange={set("title")} /></Field>
        <Field id="qa-due" label="Due date"><Input id="qa-due" type="date" value={f.dueDate} onChange={set("dueDate")} /></Field>
        <Field id="qa-priority" label="Priority"><Select id="qa-priority" options={PRIORITY_OPTIONS} value={f.priority} onChange={set("priority")} /></Field>
        <button type="submit" className="ds-btn ds-btn--primary" id="qa-add" disabled={!f.title.trim()}>Add task</button>
      </div>
    </form>
  );
}

function Content() {
  const { userId } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const mayTeam = useData(() => mayOpenTeamTasks(), [userId]);
  const [tab, setTab] = useState(0);
  const [f, setF] = useState({ status: "", priority: "" });
  const [range, setRange] = useState(NONE);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);       // a work task id
  const [edit, setEdit] = useState(null);       // a personal task
  const [dialog, setDialog] = useState(null);   // "assign" | "self"
  const filter = { status: f.status || null, priority: f.priority || null, from: range.preset ? range.from : null, to: range.preset ? range.to : null };
  const d = useData(() => ({
    personal: personalTasks(userId, filter), personalAll: personalTasks(userId).length,
    mine: workTasksFor(userId, { scope: "mine", ...filter }), mineAll: workTasksFor(userId, { scope: "mine" }).length,
    byMe: workTasksFor(userId, { scope: "by-me", ...filter }).filter((t) => t.assigneeId !== userId), byMeAll: workTasksFor(userId, { scope: "by-me" }).filter((t) => t.assigneeId !== userId).length,
    updates: taskNoticesFor(userId, { unreadOnly: true }),
  }), [userId, f.status, f.priority, range.preset, range.from, range.to]);
  const active = Boolean(f.status || f.priority || range.preset);
  const set = (k) => (v) => { setF((s) => ({ ...s, [k]: v })); setPage(1); };
  const rows = [d.personal, d.mine, d.byMe][tab], all = [d.personalAll, d.mineAll, d.byMeAll][tab];
  const noun = ["task", "tasks"];

  const changeStatus = (t, status) => {
    const r = tab === 0 ? updatePersonalTask(userId, t.id, { status }) : setWorkStatus(userId, t.id, status);
    if (!r.ok) toast(r.error, "danger"); else bump();
  };
  const remove = async (t) => {
    if (!(await confirm({ message: "Delete this personal task? This can't be undone.", confirmLabel: "Delete", danger: true }))) return;
    const r = deletePersonalTask(userId, t.id);
    if (!r.ok) toast(r.error, "danger"); else { bump(); toast("Task deleted.", "success"); }
  };
  const columns = [
    { key: "title", label: "Task", className: "td-title-col", render: (t) => (
      <span className="td-cell">
        {tab === 0 ? <button type="button" className={`td-title-btn${t.status === "done" ? " td-title-done" : ""}`} data-task={t.id} onClick={() => setEdit(t)} aria-label={`Edit ${t.title}`}>{t.title}</button>
          : <button type="button" className={`td-title-btn${t.status === "done" ? " td-title-done" : ""}`} data-task={t.id} onClick={() => setOpen(t.id)}>{t.title}</button>}
        {tab === 0 && t.notes && <span className="td-sub">{t.notes.length > 80 ? `${t.notes.slice(0, 80)}…` : t.notes}</span>}
        {tab !== 0 && <span className="td-sub">{tab === 1 ? `From ${nameOf(t.assignerId)}` : `To ${nameOf(t.assigneeId)}`}</span>}
      </span>) },
    { key: "status", label: "Status", className: "td-status-col", render: (t) => <span className="td-cell"><StatusChip status={t.status} />
      {(tab === 0 || (tab === 1 && t.assigneeId === userId)) && (t.status === "pending" || t.status === "in-progress") && (
        <select className="ds-select-inline" aria-label={`Change the status of ${t.title}`} value={t.status} onChange={(e) => changeStatus(t, e.target.value)}>{STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>)}</span> },
    { key: "priority", label: "Priority", render: (t) => <PriorityChip priority={t.priority} /> },
    { key: "due", label: "Due", className: "td-due-col", render: (t) => <DueChip task={t} /> },
    { key: "actions", label: "Actions", actions: true, render: (t) => (tab === 0
      ? <span className="td-actions"><button type="button" className="ds-btn ds-btn--sm" onClick={() => setEdit(t)}>Edit</button><button type="button" className="ds-btn ds-btn--sm" onClick={() => remove(t)}>Delete</button></span>
      : <button type="button" className="ds-btn ds-btn--sm" onClick={() => setOpen(t.id)}>View</button>) },
  ];
  return (
    <>
      <PageHeader title="My to-do" subtitle="Your personal tasks, the work you've been given and the work you've given"
        actions={<>
          <button type="button" className="ds-btn" id="add-work" onClick={() => setDialog("self")}>Add a work task</button>
          <AssignButton onClick={() => setDialog("assign")} />
          {mayTeam && <Link className="ds-btn" to={pageUrl(TEAM_TASKS)} id="team-link">Team tasks</Link>}
        </>} />
      <div className="ds-stack">
        {d.updates.length > 0 && (
          <Card id="updates-card" title="Updates" meta={`${d.updates.length} new`}>
            <div className="ds-stack">
            <ul className="td-updates" id="task-updates">
              {d.updates.slice(0, 3).map((n) => <li key={n.id} data-notice={n.id}><span>{n.text}</span><button type="button" className="ds-btn ds-btn--sm" onClick={() => { markTaskNoticeRead(userId, n.id); bump(); }}>Mark read</button></li>)}
            </ul>
            <div className="td-actions">
              {d.updates.length > 3 && <span className="td-sub" id="updates-more">and {d.updates.length - 3} more</span>}
              <button type="button" className="ds-btn ds-btn--sm" id="updates-all" onClick={() => { d.updates.forEach((n) => markTaskNoticeRead(userId, n.id)); bump(); }}>Mark all read</button>
            </div>
            </div>
          </Card>
        )}
        <Card id="todo-card" title="Tasks" meta={<span id="todo-count">{countText(rows.length, all, noun, { filtered: active })}</span>}>
          <div className="ds-stack">
            <Tabs tabs={TABS.map((label, i) => ({ label, count: [d.personalAll, d.mineAll, d.byMeAll][i] }))} active={tab} onChange={(i) => { setTab(i); setPage(1); }} />
            {tab === 0 && <Quick />}
            <div className="as-filters"><FilterBar label="Filter the tasks" active={active} onClearAll={() => { setF({ status: "", priority: "" }); setRange(NONE); setPage(1); }}>
              <FilterSelect label="Status" value={f.status} onChange={set("status")} allLabel="Any status" options={[...STATUS_OPTIONS.map(([value, label]) => ({ value, label })), ...(tab ? [{ value: "cancelled", label: "Cancelled" }] : [])]} />
              <FilterSelect label="Priority" value={f.priority} onChange={set("priority")} allLabel="Any priority" options={PRIORITY_OPTIONS.map(([value, label]) => ({ value, label }))} />
              <DateRange value={range} onChange={(r) => { setRange(r); setPage(1); }} today={todayIso()} label="Due" />
            </FilterBar></div>
            {all === 0 ? <EmptyState title={tab === 0 ? "No personal tasks yet." : tab === 1 ? "No work tasks for you." : "You haven't given anyone a task."}
              text={tab === 0 ? "Add one above. Only you can see it." : tab === 1 ? "Tasks you're given, and ones you add for yourself, show here." : "Assign one to see its progress here."} />
              : rows.length === 0 ? <p className="text-muted" id="todo-empty">{range.preset ? NO_DATA : "No tasks match these filters."}</p>
                : <Table bare tableClass="table table--tight" columns={columns} rows={rows} rowKey={(t) => t.id} page={page} onPageChange={setPage} tableId="todo-table" />}
          </div>
        </Card>
      </div>
      {open && <WorkDetail id={open} onClose={() => setOpen(null)} />}
      {dialog && <AssignDialog self={dialog === "self"} onClose={() => setDialog(null)} onDone={() => toast(dialog === "self" ? "Task added." : "Task assigned.", "success")} />}
      {edit && <AskDialog id="pedit" title="Edit personal task" submitLabel="Save" onClose={() => setEdit(null)}
        fields={[{ name: "title", label: "Title", required: true, maxLength: 120, value: edit.title }, { name: "notes", label: "Notes", kind: "textarea", maxLength: 1000, value: edit.notes },
          { name: "dueDate", label: "Due date", kind: "date", value: edit.dueDate ?? "" }, { name: "priority", label: "Priority", kind: "select", options: PRIORITY_OPTIONS, value: edit.priority, placeholder: null },
          { name: "status", label: "Status", kind: "select", options: STATUS_OPTIONS, value: edit.status, placeholder: null }]}
        run={(v) => updatePersonalTask(userId, edit.id, v)} />}
    </>
  );
}

// only someone who may give tasks to others (a manager, HR, the Admin: the team rule) is offered it; the picker still holds only who they may assign to
function AssignButton({ onClick }) {
  const { userId } = useSession();
  const may = useData(() => mayOpenTeamTasks(), [userId]);
  return may ? <button type="button" className="ds-btn ds-btn--primary" id="assign-open" onClick={onClick}>Assign a task</button> : null;
}

export default function MyTodo() {
  const allowed = useCan("tasks:own");
  return <OwnPage page={MY_TODO} title="My to-do" allowed={allowed}><Content /></OwnPage>;
}