// data/tasks-store.js (TD1, 2026-11-24): the to-do. Two kinds of task, kept in one box "officeos:tasks".
//   PERSONAL  { id "PT-n", ownerId, title 1-120, notes 0-1000, status pending | in-progress | done, dueDate "YYYY-MM-DD" | null, priority, createdAt, doneAt }
//             Private to the owner. Every read takes the viewer and returns nothing for anyone else: not a manager, not HR, not the Admin, and no
//             permission or override grants it. It is in no export, no search and no trail: the audit trail records only that a personal task
//             was added ("A personal task was added."), never its words, and its bell updates are stored without words (the task id and
//             kind) and drawn only for the owner.
//   WORK      { id "WT-n", title, description 0-2000, assigneeId, assignerId, reportToId, status pending | in-progress | done | cancelled,
//             dueDate (required), priority, createdAt, startedAt, doneAt, timeline [{ at, actorId, kind, note }] }
//             kinds: created assigned status comment reassigned reopened cancelled; entries are only ever added.
// Who may do what (the permissions are tasks:own everyone, tasks:assign and tasks:view-team everyone through a RELATION, tasks:view-all HR and Admin):
//   create for yourself   anyone (reports to your manager, or HR when you have none)
//   assign to others      a manager to a direct report (reporting.js managerOf); a holder of tasks:view-all (HR, Admin) to anyone
//                         nobody to someone inactive, who has left, or has not joined yet (employment-period.js, on the office day)
//   the assigner          edits (title, description, due date, priority), reassigns, cancels, reopens (done or cancelled -> pending, with a reason)
//   the assignee          changes the status (pending <-> in-progress, -> done) and comments
//   assigner, reportTo    read the progress and comment; the assignee's manager reads their team's tasks (tasks:view-team); HR and Admin read all work tasks
// Overdue: the due date is before today on the OFFICE day (data/shift-engine.js officeNow) and the task is not done or cancelled, whatever zone the
// browser is in. Due soon: due today or tomorrow. The bell's updates (never an email) are made lazily by syncTaskNotices(), one per
// task, kind and date (so reloads and two tabs never duplicate one).
import { load, save, remove } from "../core/storage.js";
import { getUser, getAllUsers } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { managerOf, directReportsOf } from "./reporting.js";
import { employmentState } from "./employment-period.js";
import { officeNow, addDays } from "./shift-engine.js";
import { logEvent } from "./audit-trail.js";

const KEY = "tasks";
export const TASK_LIMITS = Object.freeze({ title: 120, notes: 1000, description: 2000, note: 500, open: 500 });
export const PRIORITIES = ["low", "normal", "high", "urgent"];
export const PERSONAL_STATUSES = ["pending", "in-progress", "done"];
export const WORK_STATUSES = ["pending", "in-progress", "done", "cancelled"];
const OPEN = ["pending", "in-progress"];
// what the assignee may move a work task to, from each status; done and cancelled only come back through the assigner's reopen
const MOVES = { pending: ["in-progress", "done"], "in-progress": ["pending", "done"], done: [], cancelled: [] };

const empty = () => ({ version: 1, nextPersonal: 1, nextWork: 1, nextNotice: 1, personal: [], work: [], notices: [] });
const read = () => { const b = load(KEY); return b && b.version === 1 && Array.isArray(b.personal) && Array.isArray(b.work) && Array.isArray(b.notices) ? b : empty(); };
const write = (b) => save(KEY, b);
const copy = (v) => JSON.parse(JSON.stringify(v));
const fail = (error, field) => ({ ok: false, error, ...(field ? { field } : {}) });
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";
const active = (id) => { const u = id ? getUser(String(id)) : null; return u && u.status !== "inactive" ? u : null; };
const can = (u, p) => Boolean(u) && hasPermission(u, p);
const today = (now) => officeNow(now).date;
const isDay = (s) => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s;   // a month 13 or a 30 Feb is not a date
};
const saneDay = (s, now) => isDay(s) && s >= "2000-01-01" && s <= addDays(today(now), 3650);

// text: a bounded string with no markup and no control characters; "" when it may be empty
function text(value, max, label, required) {
  const s = String(value ?? "").replace(/\r\n?/g, "\n").trim();
  if (/[<>]/.test(s)) return { error: `${label} can't contain < or >.` };
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(s)) return { error: `${label} has characters that can't be saved.` };
  if (required && !s) return { error: `Enter ${label.toLowerCase()}.` };
  if (s.length > max) return { error: `${label} can be at most ${max.toLocaleString("en-IN")} characters.` };
  return { value: s };
}

export const isOverdue = (t, now = Date.now()) => Boolean(t.dueDate) && OPEN.includes(t.status) && t.dueDate < today(now);
export const isDueSoon = (t, now = Date.now()) => { const d = today(now); return Boolean(t.dueDate) && OPEN.includes(t.status) && (t.dueDate === d || t.dueDate === addDays(d, 1)); };
const withFlags = (t, now) => ({ ...copy(t), overdue: isOverdue(t, now), dueSoon: isDueSoon(t, now) });

// ---------- who may see a work task ----------
const reaches = (viewer, assigneeId) => can(viewer, "tasks:view-all") || (can(viewer, "tasks:view-team") && managerOf(assigneeId) === viewer.id);
const mayRead = (viewer, t) => Boolean(viewer) && (t.assigneeId === viewer.id || t.assignerId === viewer.id || t.reportToId === viewer.id || reaches(viewer, t.assigneeId));
const mayAssignTo = (actor, assigneeId) => assigneeId === actor.id || (can(actor, "tasks:assign") && (can(actor, "tasks:view-all") || managerOf(assigneeId) === actor.id));

function assigneeProblem(personId, now) {
  const p = active(personId);
  if (!p) return "That person is inactive or doesn't exist.";
  const s = employmentState(p, today(now));
  if (s === "before") return `${p.name} hasn't joined yet.`;
  if (s === "after") return `${p.name} has left.`;
  return null;
}
// the default person a work task reports to: the assignee's manager, else an HR person, else an Admin (never the assignee, when anyone else exists)
function defaultReportTo(assigneeId) {
  const m = managerOf(assigneeId);
  if (m && active(m)) return m;
  const people = getAllUsers().filter((u) => u.status !== "inactive" && u.id !== assigneeId);
  return (people.find((u) => u.role === "hr") ?? people.find((u) => u.role === "admin") ?? { id: assigneeId }).id;
}
const openCount = (b, personId) => b.personal.filter((t) => t.ownerId === personId && OPEN.includes(t.status)).length + b.work.filter((t) => t.assigneeId === personId && OPEN.includes(t.status)).length;
const FULL = `Someone can have at most ${TASK_LIMITS.open} open tasks.`;
const entry = (actorId, kind, note, now) => ({ at: new Date(now).toISOString(), actorId, kind, note: String(note ?? "") });

// ---------- the bell's updates ----------
// one stored notice per (user, task, kind, key): the key says which occasion (a due date, a completion), so it is made once
function pushNotice(b, userId, taskId, kind, key, now) {
  if (!userId) return false;
  const id = `${userId}|${taskId}|${kind}|${key}`;
  if (b.notices.some((n) => n.key === id)) return false;
  b.notices.push({ id: `TN-${b.nextNotice}`, key: id, userId, taskId, kind, at: new Date(now).toISOString(), read: false });
  b.nextNotice += 1;
  return true;
}

// ---------- personal tasks (private to the owner) ----------
export function personalTasks(viewerId, { status = null, priority = null, from = null, to = null } = {}, now = Date.now()) {
  const v = active(viewerId);
  if (!can(v, "tasks:own")) return [];
  return read().personal.filter((t) => t.ownerId === v.id && (!status || t.status === status) && (!priority || t.priority === priority) && (!from || (t.dueDate && t.dueDate >= from)) && (!to || (t.dueDate && t.dueDate <= to)))
    .map((t) => withFlags(t, now)).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.id.localeCompare(b.id, undefined, { numeric: true }));
}
export function getPersonalTask(viewerId, id) {
  const v = active(viewerId);
  const t = can(v, "tasks:own") ? read().personal.find((x) => x.id === id && x.ownerId === v.id) : null;
  return t ? withFlags(t, Date.now()) : null;
}
function personalFields(f, now, partial) {
  const out = {};
  if (!partial || "title" in f) { const t = text(f.title, TASK_LIMITS.title, "The title", true); if (t.error) return fail(t.error, "title"); out.title = t.value; }
  if (!partial || "notes" in f) { const t = text(f.notes, TASK_LIMITS.notes, "The notes", false); if (t.error) return fail(t.error, "notes"); out.notes = t.value; }
  if ("dueDate" in f || !partial) { if (f.dueDate && !saneDay(f.dueDate, now)) return fail("Choose a real due date.", "dueDate"); out.dueDate = f.dueDate || null; }
  if ("priority" in f || !partial) { const p = f.priority ?? "normal"; if (!PRIORITIES.includes(p)) return fail("Choose a priority.", "priority"); out.priority = p; }
  if ("status" in f) { if (!PERSONAL_STATUSES.includes(f.status)) return fail("Choose a status.", "status"); out.status = f.status; }
  return { ok: true, out };
}
export function createPersonalTask(actorId, fields = {}, now = Date.now()) {
  const a = active(actorId);
  if (!can(a, "tasks:own")) return fail("You can't add tasks.");
  const f = personalFields(fields, now, false);
  if (!f.ok) return f;
  const b = read();
  if (openCount(b, a.id) >= TASK_LIMITS.open) return fail(FULL);
  const t = { id: `PT-${b.nextPersonal}`, ownerId: a.id, ...f.out, status: "pending", createdAt: new Date(now).toISOString(), doneAt: null };
  b.nextPersonal += 1;
  b.personal.push(t);
  if (!write(b)) return fail(SAVE_FAILED);
  logEvent({ actorId: a.id, kind: "task-personal", detail: "A personal task was added." }, now);   // that one exists; never its words
  return { ok: true, task: withFlags(t, now) };
}
export function updatePersonalTask(actorId, id, changes = {}, now = Date.now()) {
  const a = active(actorId);
  const b = read();
  const t = can(a, "tasks:own") ? b.personal.find((x) => x.id === id && x.ownerId === a.id) : null;
  if (!t) return fail("That task doesn't exist.");
  const f = personalFields(changes, now, true);
  if (!f.ok) return f;
  if (f.out.status && f.out.status !== t.status) {
    if (OPEN.includes(f.out.status) && !OPEN.includes(t.status) && openCount(b, a.id) >= TASK_LIMITS.open) return fail(FULL);
    t.doneAt = f.out.status === "done" ? new Date(now).toISOString() : null;
  }
  Object.assign(t, f.out);
  return write(b) ? { ok: true, task: withFlags(t, now) } : fail(SAVE_FAILED);
}
export function deletePersonalTask(actorId, id) {
  const a = active(actorId);
  const b = read();
  const i = can(a, "tasks:own") ? b.personal.findIndex((x) => x.id === id && x.ownerId === a.id) : -1;
  if (i < 0) return fail("That task doesn't exist.");
  b.personal.splice(i, 1);
  b.notices = b.notices.filter((n) => n.taskId !== id);
  return write(b) ? { ok: true } : fail(SAVE_FAILED);
}

// ---------- work tasks ----------
function workFields(f, now, partial) {
  const out = {};
  if (!partial || "title" in f) { const t = text(f.title, TASK_LIMITS.title, "The title", true); if (t.error) return fail(t.error, "title"); out.title = t.value; }
  if (!partial || "description" in f) { const t = text(f.description, TASK_LIMITS.description, "The description", false); if (t.error) return fail(t.error, "description"); out.description = t.value; }
  if (!partial || "dueDate" in f) { if (!saneDay(f.dueDate, now)) return fail("Choose a real due date.", "dueDate"); out.dueDate = f.dueDate; }
  if (!partial || "priority" in f) { const p = f.priority ?? "normal"; if (!PRIORITIES.includes(p)) return fail("Choose a priority.", "priority"); out.priority = p; }
  return { ok: true, out };
}
// fields: { title, description, dueDate, priority, assigneeId (default yourself), reportToId (optional) }
export function createWorkTask(actorId, fields = {}, now = Date.now()) {
  const a = active(actorId);
  if (!can(a, "tasks:own")) return fail("You can't add tasks.");
  const assigneeId = fields.assigneeId || a.id;
  if (!mayAssignTo(a, assigneeId)) return fail("You can give tasks to yourself and to your direct reports" + (can(a, "tasks:view-all") ? "" : ": not to this person."), "assigneeId");
  const bad = assigneeProblem(assigneeId, now);
  if (bad) return fail(bad, "assigneeId");
  const f = workFields(fields, now, false);
  if (!f.ok) return f;
  if (f.out.dueDate < today(now)) return fail("The due date can't be in the past.", "dueDate");
  const reportToId = fields.reportToId || defaultReportTo(assigneeId);
  if (!active(reportToId)) return fail("Choose who this reports to.", "reportToId");
  const b = read();
  if (openCount(b, assigneeId) >= TASK_LIMITS.open) return fail(`${assigneeId === a.id ? "You have" : "They have"} ${TASK_LIMITS.open} open tasks already.`, "assigneeId");
  const at = new Date(now).toISOString();
  const t = { id: `WT-${b.nextWork}`, ...f.out, assigneeId, assignerId: a.id, reportToId, status: "pending", createdAt: at, startedAt: null, doneAt: null, timeline: [] };
  t.timeline.push(entry(a.id, "created", "", now));
  if (assigneeId !== a.id) t.timeline.push(entry(a.id, "assigned", assigneeId, now));
  b.nextWork += 1;
  b.work.push(t);
  if (assigneeId !== a.id) pushNotice(b, assigneeId, t.id, "assigned", t.createdAt, now);
  if (!write(b)) return fail(SAVE_FAILED);
  logEvent({ actorId: a.id, userId: assigneeId, kind: "task-assigned", detail: `${t.id} assigned to ${assigneeId}.` }, now);
  return { ok: true, task: withFlags(t, now) };
}
const find = (b, id) => b.work.find((x) => x.id === id) ?? null;
export function getWorkTask(viewerId, id, now = Date.now()) {
  const v = active(viewerId);
  const t = v ? find(read(), id) : null;
  return t && mayRead(v, t) ? withFlags(t, now) : null;
}
// scope: "mine" (assigned to me), "by-me" (assigned by me, to anyone), "report" (I am who it reports to), "team" (my direct reports'), "all" (HR, Admin)
export function workTasksFor(viewerId, { scope = "mine", status = null, priority = null, from = null, to = null, personId = null } = {}, now = Date.now()) {
  const v = active(viewerId);
  if (!can(v, "tasks:own")) return [];
  const inScope = (t) => scope === "mine" ? t.assigneeId === v.id : scope === "by-me" ? t.assignerId === v.id : scope === "report" ? t.reportToId === v.id
    : scope === "team" ? can(v, "tasks:view-team") && t.assigneeId !== v.id && managerOf(t.assigneeId) === v.id : scope === "all" ? can(v, "tasks:view-all") : false;
  return read().work.filter((t) => inScope(t) && mayRead(v, t) && (!status || t.status === status) && (!priority || t.priority === priority) && (!personId || t.assigneeId === personId) && (!from || t.dueDate >= from) && (!to || t.dueDate <= to))
    .map((t) => withFlags(t, now)).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id, undefined, { numeric: true }));
}
// the people this viewer may give a task to (active, employed today)
export function assignablePeople(viewerId, now = Date.now()) {
  const v = active(viewerId);
  if (!can(v, "tasks:own")) return [];
  const pool = can(v, "tasks:assign") ? (can(v, "tasks:view-all") ? getAllUsers() : directReportsOf(v.id)) : [];
  return [v, ...pool.filter((u) => u.id !== v.id)].filter((u) => u.status !== "inactive" && !assigneeProblem(u.id, now)).map((u) => ({ id: u.id, name: u.name }));
}

// the assignee moves their task: pending <-> in-progress, -> done (a reason isn't needed)
export function setWorkStatus(actorId, id, status, note = "", now = Date.now()) {
  const a = active(actorId);
  const b = read();
  const t = a ? find(b, id) : null;
  if (!t || !mayRead(a, t)) return fail("That task doesn't exist.");
  if (t.assigneeId !== a.id) return fail("Only the person it is assigned to changes its status.");
  if (!WORK_STATUSES.includes(status) || status === "cancelled") return fail("Choose a status.", "status");
  if (!MOVES[t.status].includes(status)) return fail(t.status === "done" ? "A finished task is reopened by whoever assigned it, with a reason." : t.status === "cancelled" ? "A cancelled task is reopened by whoever assigned it, with a reason." : `It can't go from ${t.status} to ${status}.`, "status");
  const n = text(note, TASK_LIMITS.note, "The note", false);
  if (n.error) return fail(n.error, "note");
  const was = t.status;
  t.status = status;
  if (status === "in-progress" && !t.startedAt) t.startedAt = new Date(now).toISOString();
  if (status === "done") t.doneAt = new Date(now).toISOString();
  t.timeline.push(entry(a.id, "status", `${was} -> ${status}${n.value ? `: ${n.value}` : ""}`, now));
  if (status === "done") for (const who of new Set([t.assignerId, t.reportToId])) if (who !== a.id) pushNotice(b, who, t.id, "done", t.doneAt, now);
  if (!write(b)) return fail(SAVE_FAILED);
  logEvent({ actorId: a.id, userId: t.assigneeId, kind: "task-status", detail: `${t.id} ${was} -> ${status}.` }, now);
  return { ok: true, task: withFlags(t, now) };
}
export function addWorkComment(actorId, id, note, now = Date.now()) {
  const a = active(actorId);
  const b = read();
  const t = a ? find(b, id) : null;
  if (!t || !mayRead(a, t)) return fail("That task doesn't exist.");
  if (![t.assigneeId, t.assignerId, t.reportToId].includes(a.id)) return fail("You can read this task but not comment on it.");
  const n = text(note, TASK_LIMITS.note, "The comment", true);
  if (n.error) return fail(n.error, "note");
  t.timeline.push(entry(a.id, "comment", n.value, now));
  return write(b) ? { ok: true, task: withFlags(t, now) } : fail(SAVE_FAILED);
}
// the assigner's own fields: title, description, due date, priority (not the status, not the assignee)
export function editWorkTask(actorId, id, changes = {}, now = Date.now()) {
  const a = active(actorId);
  const b = read();
  const t = a ? find(b, id) : null;
  if (!t || !mayRead(a, t)) return fail("That task doesn't exist.");
  if (t.assignerId !== a.id) return fail("Only whoever assigned a task edits it.");
  if (!OPEN.includes(t.status)) return fail("A finished or cancelled task can't be edited: reopen it first.");
  const extra = Object.keys(changes).find((k) => !["title", "description", "dueDate", "priority", "reportToId"].includes(k));
  if (extra) return fail(`"${extra}" can't be changed here.`, extra);
  const f = workFields(changes, now, true);
  if (!f.ok) return f;
  if ("reportToId" in changes) { if (!active(changes.reportToId)) return fail("Choose who this reports to.", "reportToId"); f.out.reportToId = changes.reportToId; }
  const changed = Object.keys(f.out).filter((k) => JSON.stringify(t[k]) !== JSON.stringify(f.out[k]));
  Object.assign(t, f.out);
  if (changed.length) t.timeline.push(entry(a.id, "status", `edited: ${changed.join(", ")}`, now));
  return write(b) ? { ok: true, task: withFlags(t, now) } : fail(SAVE_FAILED);
}
export function reassignWorkTask(actorId, id, newAssigneeId, note = "", now = Date.now()) {
  const a = active(actorId);
  const b = read();
  const t = a ? find(b, id) : null;
  if (!t || !mayRead(a, t)) return fail("That task doesn't exist.");
  if (t.assignerId !== a.id) return fail("Only whoever assigned a task reassigns it.");
  if (!OPEN.includes(t.status)) return fail("A finished or cancelled task can't be reassigned: reopen it first.");
  if (!mayAssignTo(a, newAssigneeId)) return fail("You can't give a task to this person.", "assigneeId");
  const bad = assigneeProblem(newAssigneeId, now);
  if (bad) return fail(bad, "assigneeId");
  if (newAssigneeId === t.assigneeId) return fail("It is assigned to them already.", "assigneeId");
  const n = text(note, TASK_LIMITS.note, "The note", false);
  if (n.error) return fail(n.error, "note");
  if (openCount(b, newAssigneeId) >= TASK_LIMITS.open) return fail(`They have ${TASK_LIMITS.open} open tasks already.`, "assigneeId");
  const was = t.assigneeId;
  t.assigneeId = newAssigneeId;
  t.status = "pending"; t.startedAt = null;
  t.timeline.push(entry(a.id, "reassigned", `${was} -> ${newAssigneeId}${n.value ? `: ${n.value}` : ""}`, now));
  pushNotice(b, newAssigneeId, t.id, "assigned", `${t.timeline.length}`, now);
  if (!write(b)) return fail(SAVE_FAILED);
  logEvent({ actorId: a.id, userId: newAssigneeId, kind: "task-reassigned", detail: `${t.id} reassigned from ${was} to ${newAssigneeId}.` }, now);
  return { ok: true, task: withFlags(t, now) };
}
export function cancelWorkTask(actorId, id, reason = "", now = Date.now()) {
  const a = active(actorId);
  const b = read();
  const t = a ? find(b, id) : null;
  if (!t || !mayRead(a, t)) return fail("That task doesn't exist.");
  if (t.assignerId !== a.id) return fail("Only whoever assigned a task cancels it.");
  if (!OPEN.includes(t.status)) return fail("Only an open task can be cancelled.");
  const n = text(reason, TASK_LIMITS.note, "The reason", false);
  if (n.error) return fail(n.error, "note");
  t.status = "cancelled";
  t.timeline.push(entry(a.id, "cancelled", n.value, now));
  if (!write(b)) return fail(SAVE_FAILED);
  logEvent({ actorId: a.id, userId: t.assigneeId, kind: "task-cancelled", detail: `${t.id} cancelled.` }, now);
  return { ok: true, task: withFlags(t, now) };
}
export function reopenWorkTask(actorId, id, reason, now = Date.now()) {
  const a = active(actorId);
  const b = read();
  const t = a ? find(b, id) : null;
  if (!t || !mayRead(a, t)) return fail("That task doesn't exist.");
  if (t.assignerId !== a.id) return fail("Only whoever assigned a task reopens it.");
  if (OPEN.includes(t.status)) return fail("It is open already.");
  const n = text(reason, TASK_LIMITS.note, "The reason", true);
  if (n.error) return fail(n.error, "note");
  const bad = assigneeProblem(t.assigneeId, now);
  if (bad) return fail(`${bad} Reassign it instead.`, "assigneeId");
  if (openCount(b, t.assigneeId) >= TASK_LIMITS.open) return fail(`They have ${TASK_LIMITS.open} open tasks already.`);
  const was = t.status;
  t.status = "pending"; t.doneAt = null; t.startedAt = null;
  t.timeline.push(entry(a.id, "reopened", n.value, now));
  pushNotice(b, t.assigneeId, t.id, "assigned", `${t.timeline.length}`, now);
  if (!write(b)) return fail(SAVE_FAILED);
  logEvent({ actorId: a.id, userId: t.assigneeId, kind: "task-reopened", detail: `${t.id} reopened from ${was}.` }, now);
  return { ok: true, task: withFlags(t, now) };
}

// ---------- the team, summaries ----------
// per person: counts of the work tasks this viewer may see (a manager: their direct reports'; HR and Admin: everyone's). Never personal tasks.
export function teamProgress(viewerId, now = Date.now()) {
  const v = active(viewerId);
  if (!can(v, "tasks:view-team")) return [];
  const people = can(v, "tasks:view-all") ? getAllUsers().filter((u) => u.status !== "inactive" && u.id !== v.id) : directReportsOf(v.id).filter((u) => u.status !== "inactive");
  const work = read().work;
  return people.map((u) => {
    const ts = work.filter((t) => t.assigneeId === u.id && mayRead(v, t));
    const open = ts.filter((t) => OPEN.includes(t.status));
    return { id: u.id, name: u.name, total: ts.length, pending: ts.filter((t) => t.status === "pending").length, inProgress: ts.filter((t) => t.status === "in-progress").length, done: ts.filter((t) => t.status === "done").length,
      cancelled: ts.filter((t) => t.status === "cancelled").length, overdue: open.filter((t) => isOverdue(t, now)).length, dueSoon: open.filter((t) => isDueSoon(t, now)).length };
  }).sort((a, b) => b.overdue - a.overdue || b.total - a.total || a.name.localeCompare(b.name));
}
// the small card: my open tasks (personal and work) due today / overdue, and, with tasks:view-team, my team's work tasks
export function taskSummary(viewerId, now = Date.now()) {
  const v = active(viewerId);
  if (!can(v, "tasks:own")) return null;
  const d = today(now);
  const mine = [...read().personal.filter((t) => t.ownerId === v.id), ...read().work.filter((t) => t.assigneeId === v.id)].filter((t) => OPEN.includes(t.status));
  const out = { dueToday: mine.filter((t) => t.dueDate === d).length, overdue: mine.filter((t) => isOverdue(t, now)).length, open: mine.length, team: null };
  if (can(v, "tasks:view-team")) { const p = teamProgress(v.id, now); out.team = { overdue: p.reduce((s, x) => s + x.overdue, 0), dueToday: read().work.filter((t) => OPEN.includes(t.status) && t.dueDate === d && t.assigneeId !== v.id && mayRead(v, t) && reaches(v, t.assigneeId)).length, people: p.length }; }
  return out;
}

// ---------- the bell's updates ----------
// Makes the notices that are due (idempotent): to the assignee, "due tomorrow" and "overdue"; to the assigner and whoever it reports to, "overdue";
// to a personal task's owner alone, "due tomorrow" and "overdue". One per task, kind and due date. -> how many were made
export function syncTaskNotices(now = Date.now()) {
  const b = read();
  const d = today(now), tomorrow = addDays(d, 1);
  let made = 0;
  const put = (...a) => { if (pushNotice(b, ...a, now)) made += 1; };
  for (const t of b.personal) if (OPEN.includes(t.status) && t.dueDate) { if (t.dueDate === tomorrow) put(t.ownerId, t.id, "due-tomorrow", t.dueDate); if (t.dueDate < d) put(t.ownerId, t.id, "overdue", t.dueDate); }
  for (const t of b.work) if (OPEN.includes(t.status)) {
    if (t.dueDate === tomorrow) put(t.assigneeId, t.id, "due-tomorrow", t.dueDate);
    if (t.dueDate < d) for (const who of new Set([t.assigneeId, t.assignerId, t.reportToId])) put(who, t.id, "overdue", t.dueDate);
  }
  if (made && !write(b)) return 0;
  return made;
}
const WORDS = { assigned: (t) => `Task assigned to you: ${t.title}`, "due-tomorrow": (t) => `Due tomorrow: ${t.title}`, overdue: (t) => `Overdue: ${t.title}`, done: (t) => `Done: ${t.title}` };
// the viewer's own notices (newest first), each with its words, drawn from the task only when the viewer may read it
export function taskNoticesFor(viewerId, { unreadOnly = false } = {}) {
  const v = active(viewerId);
  if (!v) return [];
  const b = read();
  return b.notices.filter((n) => n.userId === v.id && (!unreadOnly || !n.read)).map((n) => {
    const t = b.personal.find((x) => x.id === n.taskId && x.ownerId === v.id) ?? b.work.find((x) => x.id === n.taskId && mayRead(v, x));
    return t ? { id: n.id, taskId: n.taskId, kind: n.kind, text: WORDS[n.kind](t), at: n.at, read: n.read, personal: n.taskId.startsWith("PT-") } : null;
  }).filter(Boolean).reverse();
}
export function markTaskNoticeRead(viewerId, noticeId) {
  const v = active(viewerId);
  const b = read();
  const n = v ? b.notices.find((x) => x.id === noticeId && x.userId === v.id) : null;
  if (!n) return fail("That update doesn't exist.");
  n.read = true;
  return write(b) ? { ok: true } : fail(SAVE_FAILED);
}

export function resetTasks() { remove(KEY); }