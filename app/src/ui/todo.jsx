// TD1: what the to-do screens share: the status, priority and due chips (a word, an icon and a pattern each, never colour alone), the assign and
// edit dialogs (ui/it.jsx AskDialog: the data layer's own words at the field), one work task's detail (its timeline, comments and the buttons the
// person's part in it allows) and the small "My tasks" card on the dashboards. The data layer (data/tasks-store.js) decides everything; these only draw it.
// A personal task is only ever drawn for its owner: every read here takes the signed-in person and the store returns nothing for anyone else.
import { useState } from "react";
import { Link } from "react-router-dom";
import { PRIORITIES, assignablePeople, getWorkTask, createWorkTask, editWorkTask, reassignWorkTask, cancelWorkTask, reopenWorkTask, setWorkStatus, addWorkComment, taskSummary } from "../../../assets/js/data/tasks-store.js";
import { getAllUsers } from "../../../assets/js/data/store.js";
import Modal from "../components/Modal.jsx";
import { Pill, Card } from "../components/Layout.jsx";
import { Field, TextArea } from "../components/Form.jsx";
import { ICON } from "../components/icons.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { MY_TODO, TEAM_TASKS, pageUrl } from "../routes.js";
import { AskDialog, nameOf, stampYear } from "./it.jsx";
import "../design/it.css";
import "../design/todo.css";

const TICK = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M8 12l3 3 5-6";
const CROSS = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M9 9l6 6M15 9l-6 6";
const WARN = "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0";
const STATUS = { pending: ["Pending", "warning", ICON.clock], "in-progress": ["In progress", "info", ICON.progress], done: ["Done", "success", TICK], cancelled: ["Cancelled", "", CROSS] };
export const STATUS_OPTIONS = [["pending", "Pending"], ["in-progress", "In progress"], ["done", "Done"]];
export const PRIORITY_LABEL = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };
export const PRIORITY_OPTIONS = PRIORITIES.map((p) => [p, PRIORITY_LABEL[p]]);
const PRIORITY_LOOK = { low: ["", "M12 5v14M6 13l6 6 6-6"], normal: ["", "M5 12h14"], high: ["warning", "M12 19V5M6 11l6-6 6 6"], urgent: ["danger", "M12 19V5M6 11l6-6 6 6M6 19h12"] };
export const dayText = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? ""); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : ""; };

export function StatusChip({ status }) {
  const [label, tone, icon] = STATUS[status] ?? [status, "", ICON.clock];
  return <Pill tone={tone} icon={icon} data-task-status={status}>{label}</Pill>;
}
export function PriorityChip({ priority }) {
  const [tone, icon] = PRIORITY_LOOK[priority] ?? ["", "M5 12h14"];
  return <Pill tone={tone} icon={icon} data-task-priority={priority}>{PRIORITY_LABEL[priority] ?? priority}</Pill>;
}
// the due date with its state in words: Overdue, Due soon, or just the date
export function DueChip({ task }) {
  if (!task.dueDate) return <span className="text-muted">No due date</span>;
  const state = task.overdue ? "overdue" : task.dueSoon ? "soon" : "";
  return (
    <span className="td-due" data-due={state || undefined}>
      {state === "overdue" && <Pill tone="danger" icon={WARN}>Overdue</Pill>}
      {state === "soon" && <Pill tone="warning" icon={ICON.clock}>Due soon</Pill>}
      <span className="td-due__date">{dayText(task.dueDate)}</span>
    </span>
  );
}

const people = () => getAllUsers().filter((u) => u.status !== "inactive").map((u) => [u.id, u.name]);
const TITLE = { name: "title", label: "Title", required: true, maxLength: 120 };

// Give a task to someone (the picker holds only who the viewer may give one to), or to yourself
export function AssignDialog({ onClose, onDone, self = false }) {
  const { userId } = useSession();
  const who = useData(() => assignablePeople(userId), [userId]);
  return (
    <AskDialog id="assign" title={self ? "Add a work task" : "Assign a task"} desc={self ? "It reports to your manager (or HR when you have none)." : "The person is told, and their manager sees the progress."} submitLabel={self ? "Add task" : "Assign"} size=""
      fields={[
        ...(self ? [] : [{ name: "assigneeId", label: "Assign to", kind: "select", options: who.map((p) => [p.id, p.name]), required: true, placeholder: "Choose a person" }]),
        TITLE,
        { name: "description", label: "Description", kind: "textarea", maxLength: 2000 },
        { name: "dueDate", label: "Due date", kind: "date", required: true },
        { name: "priority", label: "Priority", kind: "select", options: PRIORITY_OPTIONS, value: "normal", placeholder: null },
        { name: "reportToId", label: "Reports to", kind: "select", options: people(), placeholder: "Default: their manager, or HR", hint: "Sees the progress and the comments." },
      ]}
      run={(v) => createWorkTask(userId, { ...v, assigneeId: self ? userId : v.assigneeId, reportToId: v.reportToId || undefined })}
      onClose={onClose} onDone={onDone} />
  );
}

// One work task: the facts, the timeline, comments, and the buttons this person's part in it allows (the data layer refuses the rest)
export function WorkDetail({ id, onClose }) {
  const { userId } = useSession();
  const t = useData(() => getWorkTask(userId, id), [userId, id]);
  const [ask, setAsk] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const who = useData(() => assignablePeople(userId), [userId]);
  if (!t) return null;
  const open = t.status === "pending" || t.status === "in-progress";
  const mine = t.assigneeId === userId, assigner = t.assignerId === userId;
  const move = async (status) => { const r = setWorkStatus(userId, id, status); if (!r.ok) setError(r.error); else { setError(""); bump(); } };
  const comment = (e) => { e.preventDefault(); const r = addWorkComment(userId, id, note); if (!r.ok) { setError(r.error); return; } setError(""); setNote(""); bump(); };
  const canComment = [t.assigneeId, t.assignerId, t.reportToId].includes(userId);
  const dialogs = {
    edit: <AskDialog id="edit" title="Edit task" submitLabel="Save" fields={[{ ...TITLE, value: t.title }, { name: "description", label: "Description", kind: "textarea", maxLength: 2000, value: t.description }, { name: "dueDate", label: "Due date", kind: "date", required: true, value: t.dueDate },
      { name: "priority", label: "Priority", kind: "select", options: PRIORITY_OPTIONS, value: t.priority, placeholder: null }]} run={(v) => editWorkTask(userId, id, v)} onClose={() => setAsk(null)} />,
    reassign: <AskDialog id="reassign" title="Reassign task" submitLabel="Reassign" fields={[{ name: "assigneeId", label: "Give it to", kind: "select", options: who.filter((p) => p.id !== t.assigneeId).map((p) => [p.id, p.name]), required: true, placeholder: "Choose a person" },
      { name: "note", label: "Note", kind: "textarea", maxLength: 500 }]} run={(v) => reassignWorkTask(userId, id, v.assigneeId, v.note)} onClose={() => setAsk(null)} />,
    cancel: <AskDialog id="cancel" title="Cancel task" danger submitLabel="Cancel task" fields={[{ name: "note", label: "Reason (optional)", kind: "textarea", maxLength: 500 }]} run={(v) => cancelWorkTask(userId, id, v.note)} onClose={() => setAsk(null)} />,
    reopen: <AskDialog id="reopen" title="Reopen task" submitLabel="Reopen" fields={[{ name: "note", label: "Why is it reopened?", kind: "textarea", maxLength: 500, required: true }]} run={(v) => reopenWorkTask(userId, id, v.note)} onClose={() => setAsk(null)} />,
  };
  return (
    <>
      <Modal open onClose={onClose} id="task-modal" size="lg" title={t.title} guard={false} footer={<button type="button" className="ds-btn" onClick={onClose}>Close</button>}>
        <div className="ds-stack">
          <div className="td-chips" id="task-chips"><StatusChip status={t.status} /><PriorityChip priority={t.priority} /><DueChip task={t} /></div>
          {t.description && <p className="td-text" id="task-description">{t.description}</p>}
          <dl className="td-dl" id="task-facts">
            <div className="td-dl__row"><dt>Assigned to</dt><dd>{nameOf(t.assigneeId)}</dd></div>
            <div className="td-dl__row"><dt>Assigned by</dt><dd>{nameOf(t.assignerId)}</dd></div>
            <div className="td-dl__row"><dt>Reports to</dt><dd>{nameOf(t.reportToId)}</dd></div>
          </dl>
          <div className="td-actions" id="task-actions">
            {mine && t.status === "pending" && <button type="button" className="ds-btn ds-btn--primary" data-action="start" onClick={() => move("in-progress")}>Start</button>}
            {mine && open && <button type="button" className="ds-btn ds-btn--primary" data-action="done" onClick={() => move("done")}>Mark done</button>}
            {mine && t.status === "in-progress" && <button type="button" className="ds-btn" data-action="back" onClick={() => move("pending")}>Back to pending</button>}
            {assigner && open && <><button type="button" className="ds-btn" data-action="edit" onClick={() => setAsk("edit")}>Edit</button><button type="button" className="ds-btn" data-action="reassign" onClick={() => setAsk("reassign")}>Reassign</button>
              <button type="button" className="ds-btn ds-btn--danger" data-action="cancel" onClick={() => setAsk("cancel")}>Cancel task</button></>}
            {assigner && !open && <button type="button" className="ds-btn" data-action="reopen" onClick={() => setAsk("reopen")}>Reopen</button>}
          </div>
          {error && <p className="ds-note ds-note--danger" role="alert" id="task-error">{error}</p>}
          <section aria-labelledby="task-timeline-title">
            <h3 className="td-h3" id="task-timeline-title">Timeline</h3>
            <ol className="it-timeline" id="task-timeline">
              {t.timeline.map((e, i) => (
                <li key={i} className="it-timeline__item" data-kind={e.kind === "status" || e.kind === "assigned" ? "comment" : e.kind}>
                  <span className="it-timeline__dot" aria-hidden="true" />
                  <div><strong>{e.kind[0].toUpperCase() + e.kind.slice(1)}<span className="it-timeline__who"> · {nameOf(e.actorId)}</span></strong>
                    {e.note && <span className="it-timeline__note">{e.kind === "assigned" ? `to ${nameOf(e.note)}` : e.note}</span>}<span className="it-timeline__when">{stampYear(e.at)}</span></div>
                </li>
              ))}
            </ol>
          </section>
          {canComment && (
            <form className="ds-stack" onSubmit={comment} id="task-comment-form" noValidate>
              <Field id="task-comment" label="Add a comment"><TextArea id="task-comment" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <div className="td-actions"><button type="submit" className="ds-btn" id="task-comment-send" disabled={!note.trim()}>Comment</button></div>
            </form>
          )}
        </div>
      </Modal>
      {ask && dialogs[ask]}
    </>
  );
}

// The small card on the dashboards: my open tasks due today and overdue (personal and work), and my team's work tasks when I have a team
export function TasksCard() {
  const { userId } = useSession();
  const allowed = useCan("tasks:own");
  const s = useData(() => taskSummary(userId), [userId]);
  if (!allowed || !s) return null;
  const team = s.team && s.team.people > 0 ? s.team : null;
  return (
    <Card id="tasks-card" title="My tasks" actions={<Link className="ds-btn ds-btn--sm" to={pageUrl(MY_TODO)} id="tasks-open">Open my to-do</Link>}>
      <div className="td-card" role="group" aria-label="My tasks">
        <div className="td-card__stat" data-stat="due-today"><span className="td-card__num">{s.dueToday}</span><span className="td-card__label">Due today</span></div>
        <div className="td-card__stat" data-stat="overdue" data-alert={s.overdue ? "" : undefined}><span className="td-card__num">{s.overdue}</span><span className="td-card__label">Overdue{s.overdue ? <Pill tone="danger" icon={WARN}>Needs attention</Pill> : null}</span></div>
        <div className="td-card__stat" data-stat="open"><span className="td-card__num">{s.open}</span><span className="td-card__label">Open</span></div>
      </div>
      {team && <p className="td-card__team" id="tasks-team">Your team: <strong>{team.overdue}</strong> overdue, <strong>{team.dueToday}</strong> due today. <Link to={pageUrl(TEAM_TASKS)}>Team tasks</Link></p>}
    </Card>
  );
}