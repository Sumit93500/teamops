// Team tasks (TD1): the work tasks of the people the viewer manages (a manager: their direct reports; HR and the Admin: everyone). Progress by person (a
// stacked horizontal bar chart of the shared chart components, and a table with the same numbers), filters, one person's work tasks to open, and Assign
// task. Personal tasks are never here: the data layer doesn't return them to anyone but their owner. For a manager or tasks:view-all.
import { useState } from "react";
import { teamProgress, workTasksFor } from "../../../assets/js/data/tasks-store.js";
import OwnPage from "../ui/OwnPage.jsx";
import { PageHeader, Card } from "../components/Layout.jsx";
import { EmptyState, NO_DATA } from "../components/Basics.jsx";
import { DateRange, FilterBar, FilterSelect } from "../components/Controls.jsx";
import { BarChart } from "../components/charts/Charts.jsx";
import Table from "../components/Table.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { countText } from "../data/counts.js";
import { TEAM_TASKS } from "../routes.js";
import { useToast } from "../ui/Toast.jsx";
import { mayOpenTeamTasks } from "../shell/taskAccess.js";
import { StatusChip, PriorityChip, DueChip, AssignDialog, WorkDetail, STATUS_OPTIONS, PRIORITY_OPTIONS } from "../ui/todo.jsx";
import { nameOf } from "../ui/it.jsx";
import { todayIso } from "../../../assets/js/ui/leave-view.js";

const NONE = { preset: "", from: "", to: "" };

function Content() {
  const { userId } = useSession();
  const toast = useToast();
  const all = useCan("tasks:view-all");
  const [person, setPerson] = useState("");
  const [f, setF] = useState({ status: "", priority: "" });
  const [range, setRange] = useState(NONE);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [assign, setAssign] = useState(false);
  const progress = useData(() => teamProgress(userId), [userId]);
  const rows = useData(() => workTasksFor(userId, { scope: all ? "all" : "team", personId: person || null, status: f.status || null, priority: f.priority || null, from: range.preset ? range.from : null, to: range.preset ? range.to : null }),
    [userId, all, person, f.status, f.priority, range.preset, range.from, range.to]);
  const active = Boolean(person || f.status || f.priority || range.preset);
  const set = (k) => (v) => { setF((s) => ({ ...s, [k]: v })); setPage(1); };
  const total = progress.reduce((s, p) => s + p.total, 0);
  const chart = { title: "Work tasks by person", unit: "tasks", empty: total === 0, labels: progress.map((p) => p.name), keys: progress.map((p) => p.id),
    series: [{ name: "Done", values: progress.map((p) => p.done) }, { name: "In progress", values: progress.map((p) => p.inProgress) }, { name: "Pending", values: progress.map((p) => p.pending) }] };
  const peopleCols = [
    { key: "name", label: "Person", render: (p) => <button type="button" className="td-title-btn" data-person={p.id} onClick={() => { setPerson(person === p.id ? "" : p.id); setPage(1); }} aria-pressed={String(person === p.id)}>{p.name}</button> },
    { key: "total", label: "Tasks", num: true, render: (p) => String(p.total) },
    { key: "progress", label: "Progress", render: (p) => (
      <span className="td-bar" role="img" aria-label={`${p.done} done, ${p.inProgress} in progress, ${p.pending} pending`}>
        {p.total > 0 && <><span className="td-bar__done" style={{ width: `${(p.done / p.total) * 100}%` }} /><span className="td-bar__doing" style={{ width: `${(p.inProgress / p.total) * 100}%` }} /><span className="td-bar__todo" style={{ width: `${(p.pending / p.total) * 100}%` }} /></>}
      </span>) },
    { key: "overdue", label: "Overdue", num: true, render: (p) => String(p.overdue) },
    { key: "soon", label: "Due soon", num: true, render: (p) => String(p.dueSoon) },
  ];
  const taskCols = [
    { key: "title", label: "Task", className: "td-title-col", render: (t) => <span className="td-cell"><button type="button" className="td-title-btn" data-task={t.id} onClick={() => setOpen(t.id)}>{t.title}</button><span className="td-sub">{nameOf(t.assigneeId)}, from {nameOf(t.assignerId)}</span></span> },
    { key: "status", label: "Status", className: "td-status-col", render: (t) => <StatusChip status={t.status} /> },
    { key: "priority", label: "Priority", render: (t) => <PriorityChip priority={t.priority} /> },
    { key: "due", label: "Due", className: "td-due-col", render: (t) => <DueChip task={t} /> },
  ];
  return (
    <>
      <PageHeader title="Team tasks" subtitle={all ? "The work tasks of everyone" : "The work tasks of the people who report to you"}
        actions={<button type="button" className="ds-btn ds-btn--primary" id="assign-open" onClick={() => setAssign(true)}>Assign a task</button>} />
      <div className="ds-stack">
        <Card id="progress-card" title="Progress by person" meta={<span id="progress-count">{countText(progress.length, progress.length, ["person", "people"])}</span>}>
          {progress.length === 0 ? <EmptyState title="Nobody reports to you." text="Tasks of the people who report to you appear here." />
            : (
              <div className="ds-stack">
                <BarChart id="team-bars" chart={chart} horizontal stacked labelHeader="Person" />
                <Table bare tableClass="table table--tight" columns={peopleCols} rows={progress} rowKey={(p) => p.id} tableId="people-table" />
              </div>)}
        </Card>
        <Card id="team-tasks-card" title={person ? `Tasks of ${nameOf(person)}` : "Tasks"} meta={<span id="tasks-count">{countText(rows.length, rows.length, ["task", "tasks"], { filtered: active })}</span>}>
          <div className="ds-stack">
            <div className="as-filters"><FilterBar label="Filter the tasks" active={active} onClearAll={() => { setPerson(""); setF({ status: "", priority: "" }); setRange(NONE); setPage(1); }}>
              <FilterSelect label="Person" value={person} onChange={(v) => { setPerson(v); setPage(1); }} allLabel="Everyone" options={progress.map((p) => ({ value: p.id, label: p.name }))} />
              <FilterSelect label="Status" value={f.status} onChange={set("status")} allLabel="Any status" options={[...STATUS_OPTIONS.map(([value, label]) => ({ value, label })), { value: "cancelled", label: "Cancelled" }]} />
              <FilterSelect label="Priority" value={f.priority} onChange={set("priority")} allLabel="Any priority" options={PRIORITY_OPTIONS.map(([value, label]) => ({ value, label }))} />
              <DateRange value={range} onChange={(r) => { setRange(r); setPage(1); }} today={todayIso()} label="Due" />
            </FilterBar></div>
            {rows.length === 0 ? <p className="text-muted" id="tasks-empty">{range.preset ? NO_DATA : active ? "No tasks match these filters." : "No work tasks yet."}</p>
              : <Table bare tableClass="table table--tight" columns={taskCols} rows={rows} rowKey={(t) => t.id} page={page} onPageChange={setPage} tableId="team-tasks-table" />}
          </div>
        </Card>
      </div>
      {open && <WorkDetail id={open} onClose={() => setOpen(null)} />}
      {assign && <AssignDialog onClose={() => setAssign(false)} onDone={() => toast("Task assigned.", "success")} />}
    </>
  );
}

export default function TeamTasks() {
  const allowed = useData(() => mayOpenTeamTasks(), []);
  return <OwnPage page={TEAM_TASKS} title="Team tasks" allowed={allowed}><Content /></OwnPage>;
}