// usage: node tasks.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// TD1: the to-do (data/tasks-store.js, the tasks permissions, the audit kinds)
//   P  permissions and roles: 130 in 50 modules; who holds tasks:own / assign / view-team / view-all; none overridable
//   V  PRIVACY: a personal task is read, changed and found by its owner alone, by every function, whoever asks and whatever they hold
//   C  creating work tasks: for yourself (reports to the manager, or HR), a manager to a direct report, HR and Admin to anyone; never outside the team,
//      to someone inactive, who has left or has not joined yet
//   T  the status machine, the assigner's rights, reopen with a reason, comments, who sees what
//   O  overdue and due soon at the office-day boundary (the same in every zone)
//   N  the bell's updates: idempotent, to the right people, no words of a personal task to anyone else
//   L  limits: text, markup, dates, 500 open tasks; the audit trail holds ids and statuses only; the summaries and the team page's numbers
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const clock = (date, hm = "10:00") => { const [y, m, d] = date.split("-").map(Number); const [h, mi] = hm.split(":").map(Number); NOW = RealDate.UTC(y, m - 1, d, h, mi) - 330 * 60000; };
clock("2026-11-23");

const S = await import("./js/data/store.js");
const RO = await import("./js/config/roles.js");
const PM = await import("./js/config/permissions.js");
const T = await import("./js/data/tasks-store.js");
const AU = await import("./js/data/audit-trail.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(6)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 300)}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const ADMIN = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", MEERA = "EMP-1023", SNEHA = "EMP-1029", ROHAN = "EMP-1042", DIVYA = "EMP-1061", VIKRAM = "EMP-1088", ARJUN = "EMP-1105", ANANYA = "EMP-1017";
const EVERYONE = [ADMIN, PRIYA, KABIR, MEERA, SNEHA, ROHAN, VIKRAM, ARJUN, ANANYA];
const D0 = "2026-11-23", D1 = "2026-11-24", D2 = "2026-11-25", YEST = "2026-11-22";
const fresh = () => { mem.clear(); clock("2026-11-23"); };
const events = (kind) => JSON.parse(mem.get("officeos:audit-trail") ?? "{\"events\":[]}").events.filter((e) => e.kind === kind);
const work = (o = {}) => ({ title: "Prepare the report", description: "Q4 numbers", dueDate: D2, priority: "normal", ...o });

// ---------- P ----------
section("P. Permissions");
check("P1", "130 permissions in 50 modules; tasks: own, assign, view-team, view-all", PM.ALL_PERMISSIONS.length === 141 /* I2 (behaviour; was 130: the next imports and the record exports) */ && Object.keys(PM.PERMISSIONS).length === 50 && j(PM.PERMISSIONS.tasks) === j(["own", "assign", "view-team", "view-all"]));
check("P2", "role sizes: Admin 127, HR 70, Finance 60, Employee 34, IT 45", j(Object.fromEntries(Object.entries(RO.ROLES).map(([k, r]) => [k, r.permissions.length]))) === j({ admin: 137, hr: 77, fin: 62, emp: 34, it: 48 /* I2 (behaviour; was 127, 70, 60, 34, 45: the next imports and the record exports) */ }), j(Object.fromEntries(Object.entries(RO.ROLES).map(([k, r]) => [k, r.permissions.length]))));
const holds = (r, p) => RO.ROLES[r].permissions.includes(p);
check("P3", "every role holds own, assign and view-team (assign and view-team work only through the manager relation); only HR and Admin hold view-all", ["admin", "hr", "fin", "emp", "it"].every((r) => ["tasks:own", "tasks:assign", "tasks:view-team"].every((p) => holds(r, p))) && holds("admin", "tasks:view-all") && holds("hr", "tasks:view-all") && !holds("fin", "tasks:view-all") && !holds("emp", "tasks:view-all") && !holds("it", "tasks:view-all"));
check("P4", "none of the four is overridable", !RO.OVERRIDABLE.some((p) => p.startsWith("tasks:")));
check("P5", "a granted override doesn't give a manager view-all", !RO.hasPermission({ ...S.getUser(SNEHA), grantPermissions: ["tasks:view-all"] }, "tasks:view-all"));
check("P6", "the audit kinds exist with labels", ["task-personal", "task-assigned", "task-reassigned", "task-status", "task-cancelled", "task-reopened"].every((k) => AU.AUDIT_KINDS.includes(k) && AU.AUDIT_LABEL[k]));

// ---------- V ----------
section("V. A personal task is private");
fresh();
const SECRET = "Quietly plan my resignation";
const made = T.createPersonalTask(ROHAN, { title: SECRET, notes: "tell nobody", dueDate: D1, priority: "high" });
const pid = made.task?.id;
check("V1", "the owner adds, reads and finds it", made.ok && T.personalTasks(ROHAN).length === 1 && T.getPersonalTask(ROHAN, pid).title === SECRET);
const others = EVERYONE.filter((x) => x !== ROHAN);
check("V2", "nobody else reads it: personalTasks and getPersonalTask return nothing for the manager (Sneha), HR, the Admin, Finance and everyone else", others.every((v) => T.personalTasks(v).length === 0 && T.getPersonalTask(v, pid) === null));
check("V3", "nobody else changes or deletes it, and the owner's task is untouched", others.every((v) => !T.updatePersonalTask(v, pid, { title: "hijacked" }).ok && !T.deletePersonalTask(v, pid).ok) && T.getPersonalTask(ROHAN, pid).title === SECRET);
const wide = EVERYONE.map((v) => [v, T.workTasksFor(v, { scope: "all" }), T.workTasksFor(v, { scope: "team" }), T.workTasksFor(v, { scope: "by-me" }), T.workTasksFor(v, { scope: "report" }), T.workTasksFor(v, { scope: "mine" }), T.teamProgress(v), T.taskSummary(v), T.taskNoticesFor(v), T.assignablePeople(v)]);
check("V4", "no work-task read, the team page's numbers, the summary, the notices or the people picker holds the personal task's words", !j(wide.filter(([v]) => v !== ROHAN)).includes("resignation") && !j(wide.filter(([v]) => v !== ROHAN)).includes("tell nobody") && !j(wide.filter(([v]) => v !== ROHAN)).includes(pid));
check("V5", "the manager's team progress and summary count work tasks only: Rohan's personal task adds nothing for Sneha", T.teamProgress(SNEHA).find((p) => p.id === ROHAN).total === 0 && T.taskSummary(SNEHA).team.dueToday === 0);
const grantedAll = { ...RO.ROLES.emp, permissions: [...RO.ROLES.emp.permissions, "tasks:view-all", "tasks:assign", "tasks:view-team", "tasks:own"] };
const saved = RO.ROLES.emp; RO.ROLES.emp = grantedAll;
let leak;
try { leak = [T.personalTasks(ARJUN), T.getPersonalTask(ARJUN, pid), T.workTasksFor(ARJUN, { scope: "all" }), T.updatePersonalTask(ARJUN, pid, { title: "x" })]; } finally { RO.ROLES.emp = saved; }
check("V6", "even an employee given every tasks permission reads nobody's personal task", j(leak[0]) === "[]" && leak[1] === null && !j(leak).includes("resignation") && !leak[3].ok);
const noticeFor = (() => { clock("2026-11-23"); T.syncTaskNotices(NOW); return T.taskNoticesFor(ROHAN); })();
check("V7", "the owner's 'due tomorrow' update names the task; the stored notice itself holds no words", noticeFor.some((n) => n.text === `Due tomorrow: ${SECRET}` && n.personal) && !JSON.parse(mem.get("officeos:tasks")).notices.some((n) => j(n).includes("resignation")));
check("V8", "the audit trail says only that a personal task was added", events("task-personal").length === 1 && events("task-personal")[0].detail === "A personal task was added." && !(mem.get("officeos:audit-trail") ?? "").includes("resignation") && !(mem.get("officeos:audit-trail") ?? "").includes(pid));
check("V9", "no other stored key holds the task's words (nothing exported, indexed or logged)", [...mem.entries()].filter(([k]) => k !== "officeos:tasks").every(([, v]) => !v.includes("resignation") && !v.includes("tell nobody")));
const inactiveOwner = T.personalTasks("EMP-9999");
check("V10", "an unknown or signed-out viewer reads nothing", j(inactiveOwner) === "[]" && j(T.personalTasks(null)) === "[]" && T.getPersonalTask(DIVYA, pid) === null);

// ---------- C ----------
section("C. Creating work tasks");
fresh();
const self = T.createWorkTask(ROHAN, work({ title: "My own thing" }));
check("C1", "an employee creates a work task for themselves: it reports to their manager (Sneha)", self.ok && self.task.assigneeId === ROHAN && self.task.assignerId === ROHAN && self.task.reportToId === SNEHA && self.task.status === "pending", j(self.task ?? self));
const noMgr = T.createWorkTask(VIKRAM, work({ title: "No manager" }));
check("C2", "someone with no manager reports to HR (Priya)", noMgr.ok && noMgr.task.reportToId === PRIYA, j(noMgr.task ?? noMgr));
const mgr = T.createWorkTask(SNEHA, work({ assigneeId: ROHAN, title: "From Sneha" }));
check("C3", "a manager assigns to a direct report; the assignee gets an 'assigned' update", mgr.ok && mgr.task.assigneeId === ROHAN && mgr.task.assignerId === SNEHA && T.taskNoticesFor(ROHAN).some((n) => n.kind === "assigned" && n.text === "Task assigned to you: From Sneha"));
check("C4", "a manager can't assign outside the team: not to Meera (Kabir's), not to HR, not to their own manager", [MEERA, PRIYA, ADMIN, VIKRAM].every((p) => !T.createWorkTask(SNEHA, work({ assigneeId: p })).ok));
check("C5", "an employee without reports can't assign to anyone else", !T.createWorkTask(ARJUN, work({ assigneeId: ROHAN })).ok && !T.createWorkTask(ROHAN, work({ assigneeId: ARJUN })).ok);
check("C6", "HR assigns to anyone active (Rohan, Meera, the Admin)", [ROHAN, MEERA, ADMIN].every((p) => T.createWorkTask(PRIYA, work({ assigneeId: p })).ok));
check("C7", "the Admin assigns to anyone active", [ROHAN, KABIR, PRIYA].every((p) => T.createWorkTask(ADMIN, work({ assigneeId: p })).ok));
const toInactive = T.createWorkTask(PRIYA, work({ assigneeId: DIVYA }));
check("C8", "nobody assigns to someone inactive (Divya): refused at the person's field", !toInactive.ok && toInactive.field === "assigneeId", toInactive.error);
S.addUser(ADMIN, { name: "Future Joiner", email: "future@northwind.com", department: "ENG", designation: "Software Engineer", dateOfJoining: "1 Dec 2026" });
const future = S.getAllUsers().find((u) => u.email === "future@northwind.com").id;
const toFuture = T.createWorkTask(ADMIN, work({ assigneeId: future }));
check("C9", "...or who has not joined yet: 'hasn't joined yet'", !toFuture.ok && /hasn't joined yet/.test(toFuture.error), toFuture.error);
S.addUser(ADMIN, { name: "Past Leaver", email: "leaver@northwind.com", department: "ENG", designation: "Software Engineer", dateOfJoining: "2 Nov 2026", reportingManagerId: SNEHA });
const leaver = S.getAllUsers().find((u) => u.email === "leaver@northwind.com").id;
S.deactivateUser(ADMIN, leaver, "2026-11-20");
check("C10", "...or who has left (even their manager can't)", !T.createWorkTask(ADMIN, work({ assigneeId: leaver })).ok && !T.createWorkTask(SNEHA, work({ assigneeId: leaver })).ok);
check("C11", "the people picker: Sneha sees herself, Rohan, Arjun; Priya everyone active and employed (no Divya, no future joiner, no leaver); Arjun only himself", j(T.assignablePeople(SNEHA).map((p) => p.id).sort()) === j([ARJUN, ROHAN, SNEHA].sort()) && !T.assignablePeople(PRIYA).some((p) => [DIVYA, future, leaver].includes(p.id)) && T.assignablePeople(PRIYA).length === 9 && j(T.assignablePeople(ARJUN).map((p) => p.id)) === j([ARJUN]), j(T.assignablePeople(PRIYA).map((p) => p.id)));
check("C12", "the due date is required, real and not in the past; the title is required", [work({ dueDate: "" }), work({ dueDate: "2026-02-30" }), work({ dueDate: YEST }), work({ dueDate: "soon" }), work({ title: "  " })].every((f) => !T.createWorkTask(ROHAN, f).ok));
check("C13", "today's date is accepted (office day)", T.createWorkTask(ROHAN, work({ dueDate: D0, title: "today" })).ok);
check("C14", "reportToId may be chosen (an active person) and must be one", T.createWorkTask(ROHAN, work({ reportToId: PRIYA, title: "to HR" })).task.reportToId === PRIYA && !T.createWorkTask(ROHAN, work({ reportToId: DIVYA })).ok);
check("C15", "an inactive person can't create", !T.createWorkTask(DIVYA, work()).ok && !T.createPersonalTask(DIVYA, { title: "x" }).ok);

// ---------- T ----------
section("T. Status, rights, who sees what");
fresh();
const a1 = T.createWorkTask(SNEHA, work({ assigneeId: ROHAN, title: "Ship it" })).task.id;
check("T1", "the assignee starts it (startedAt set) and finishes it (doneAt set); the timeline has created, assigned, two status entries", T.setWorkStatus(ROHAN, a1, "in-progress").ok && T.getWorkTask(ROHAN, a1).startedAt && T.setWorkStatus(ROHAN, a1, "done", "shipped").ok && T.getWorkTask(ROHAN, a1).doneAt && j(T.getWorkTask(ROHAN, a1).timeline.map((e) => e.kind)) === j(["created", "assigned", "status", "status"]));
const a2 = T.createWorkTask(SNEHA, work({ assigneeId: ROHAN, title: "Second" })).task.id;
check("T2", "the assigner (a manager) can't change the status; neither can anyone else", !T.setWorkStatus(SNEHA, a2, "done").ok && !T.setWorkStatus(PRIYA, a2, "done").ok && !T.setWorkStatus(ARJUN, a2, "done").ok && T.getWorkTask(ROHAN, a2).status === "pending");
check("T3", "illegal moves are refused: done -> pending and done -> in-progress by the assignee (with the reopen hint); cancelled by the assignee; an unknown status", !T.setWorkStatus(ROHAN, a1, "pending").ok && /reopened by whoever assigned/.test(T.setWorkStatus(ROHAN, a1, "in-progress").error) && !T.setWorkStatus(ROHAN, a2, "cancelled").ok && !T.setWorkStatus(ROHAN, a2, "wat").ok);
check("T4", "in-progress can go back to pending", T.setWorkStatus(ROHAN, a2, "in-progress").ok && T.setWorkStatus(ROHAN, a2, "pending").ok);
check("T5", "reopen: only the assigner, only with a reason, only a finished or cancelled task", !T.reopenWorkTask(ROHAN, a1, "again").ok && !T.reopenWorkTask(SNEHA, a1, "").ok && !T.reopenWorkTask(SNEHA, a1, "   ").ok && !T.reopenWorkTask(SNEHA, a2, "open already").ok && T.reopenWorkTask(SNEHA, a1, "Missed a case").ok && T.getWorkTask(ROHAN, a1).status === "pending" && T.getWorkTask(ROHAN, a1).doneAt === null);
check("T6", "the timeline only grows and records the reopen with its reason", T.getWorkTask(ROHAN, a1).timeline.at(-1).kind === "reopened" && T.getWorkTask(ROHAN, a1).timeline.at(-1).note === "Missed a case" && T.getWorkTask(ROHAN, a1).timeline.length === 5);
check("T7", "the assigner edits title, description, due date, priority; the assignee can't; the status and assignee can't be edited here", T.editWorkTask(SNEHA, a2, { title: "Second (revised)", priority: "urgent", dueDate: D2 }).ok && T.getWorkTask(ROHAN, a2).title === "Second (revised)" && !T.editWorkTask(ROHAN, a2, { title: "mine now" }).ok && !T.editWorkTask(SNEHA, a2, { status: "done" }).ok && !T.editWorkTask(SNEHA, a2, { assigneeId: ARJUN }).ok && !T.editWorkTask(SNEHA, a2, { assignerId: ROHAN }).ok);
check("T8", "a done task can't be edited until reopened", (() => { T.setWorkStatus(ROHAN, a1, "done"); return !T.editWorkTask(SNEHA, a1, { title: "late" }).ok; })());
check("T9", "reassign: the assigner moves it to another direct report (status back to pending, a new update); not outside the team", T.reassignWorkTask(SNEHA, a2, ARJUN, "Rohan is busy").ok && T.getWorkTask(ARJUN, a2).assigneeId === ARJUN && T.getWorkTask(ARJUN, a2).status === "pending" && T.taskNoticesFor(ARJUN).some((n) => n.kind === "assigned") && !T.reassignWorkTask(SNEHA, a2, MEERA).ok && !T.reassignWorkTask(ROHAN, a2, ROHAN).ok && !T.reassignWorkTask(SNEHA, a2, ARJUN).ok);
check("T10", "reassign refuses an inactive person", !T.reassignWorkTask(SNEHA, a2, DIVYA).ok);
check("T11", "cancel: only the assigner, only an open task; the assignee can't un-cancel; reopen brings it back with a reason", !T.cancelWorkTask(ARJUN, a2, "no").ok && T.cancelWorkTask(SNEHA, a2, "not needed").ok && T.getWorkTask(ARJUN, a2).status === "cancelled" && !T.cancelWorkTask(SNEHA, a2, "").ok && !T.setWorkStatus(ARJUN, a2, "pending").ok && !T.reopenWorkTask(SNEHA, a2, "").ok && T.reopenWorkTask(SNEHA, a2, "needed after all").ok);
check("T12", "comments: the assignee, the assigner and whoever it reports to; not a stranger or HR who only reads", T.addWorkComment(ROHAN, a1, "question").ok && T.addWorkComment(SNEHA, a1, "answer").ok && (() => { const t = T.createWorkTask(ROHAN, work({ title: "reports to HR", reportToId: PRIYA })).task.id; return T.addWorkComment(PRIYA, t, "ok").ok && !T.addWorkComment(KABIR, t, "x").ok && !T.addWorkComment(ADMIN, t, "read-only").ok; })());
check("T13", "who sees a work task: assignee, assigner, reportTo, the assignee's manager, HR and Admin; not another employee, not another manager, not Finance", (() => { const t = T.createWorkTask(PRIYA, work({ assigneeId: MEERA, title: "Finance task", reportToId: KABIR })).task.id; return [MEERA, PRIYA, KABIR, ADMIN].every((v) => T.getWorkTask(v, t)) && [SNEHA, ROHAN, VIKRAM].every((v) => !T.getWorkTask(v, t)); })());
check("T14", "the scopes: mine / by-me / report (what Sneha assigned to Rohan reports to her too) / team / all; 'all' only for HR and Admin; 'team' only the manager's direct reports", (() => { fresh(); T.createWorkTask(SNEHA, work({ assigneeId: ROHAN, title: "A" })); T.createWorkTask(ROHAN, work({ title: "B" })); T.createWorkTask(PRIYA, work({ assigneeId: MEERA, title: "C" })); const n = (v, s) => T.workTasksFor(v, { scope: s }).map((t) => t.title).join(""); return n(ROHAN, "mine") === "AB" && n(SNEHA, "by-me") === "A" && n(SNEHA, "report") === "AB" && n(SNEHA, "team") === "AB" && n(PRIYA, "all") === "ABC" && n(ADMIN, "all") === "ABC" && n(SNEHA, "all") === "" && n(ROHAN, "all") === "" && n(KABIR, "team") === "C" && n(ARJUN, "team") === ""; })());
check("T15", "the team page: a manager's people only; HR and Admin everyone; counts add up", (() => { const p = T.teamProgress(SNEHA); const r = p.find((x) => x.id === ROHAN); return j(p.map((x) => x.id).sort()) === j([ARJUN, ROHAN].sort()) && r.total === 2 && r.pending === 2 && T.teamProgress(PRIYA).length === 8 && T.teamProgress(ADMIN).length === 8 && T.teamProgress(ROHAN).length === 0; })());
check("T16", "a task assigned to oneself by HR: no 'assigned' update to themselves; a status change by an unrelated person is refused", (() => { fresh(); const t = T.createWorkTask(PRIYA, work({ title: "mine" })).task.id; return T.taskNoticesFor(PRIYA).length === 0 && !T.setWorkStatus(KABIR, t, "done").ok; })());
check("T17", "an unknown task id is 'doesn't exist' for every action", ["WT-999"].every((id) => !T.setWorkStatus(ROHAN, id, "done").ok && !T.addWorkComment(ROHAN, id, "x").ok && !T.editWorkTask(ROHAN, id, {}).ok && !T.cancelWorkTask(ROHAN, id).ok && !T.reopenWorkTask(ROHAN, id, "x").ok && T.getWorkTask(ROHAN, id) === null));

// ---------- O ----------
section("O. Overdue at the office-day boundary");
fresh();
const od = (date, hm, due, status) => { clock(date, hm); return T.isOverdue({ dueDate: due, status }, NOW); };
check("O1", "due yesterday is overdue; due today is not (10:00 IST)", od("2026-11-23", "10:00", YEST, "pending") && !od("2026-11-23", "10:00", D0, "pending"));
check("O2", "at 23:59 IST due today is still not overdue; at 00:01 IST the next day it is", !od("2026-11-23", "23:59", D0, "pending") && od("2026-11-24", "00:01", D0, "pending"));
check("O3", "done and cancelled are never overdue; no due date never is", !od("2026-11-23", "10:00", YEST, "done") && !od("2026-11-23", "10:00", YEST, "cancelled") && !od("2026-11-23", "10:00", null, "pending"));
clock("2026-11-23", "10:00");
check("O4", "due today and due tomorrow are 'due soon'; the day after is not; overdue is not 'due soon'", T.isDueSoon({ dueDate: D0, status: "pending" }, NOW) && T.isDueSoon({ dueDate: D1, status: "in-progress" }, NOW) && !T.isDueSoon({ dueDate: D2, status: "pending" }, NOW) && !T.isDueSoon({ dueDate: YEST, status: "pending" }, NOW));
check("O5", "the flags are on the reads: a task due yesterday reads overdue (and a personal one too)", (() => { fresh(); const p = T.createPersonalTask(ROHAN, { title: "old", dueDate: YEST }).task; clock("2026-11-23", "10:00"); return p.overdue === false || T.getPersonalTask(ROHAN, p.id).overdue === true; })());
check("O6", "the clock decides, not the day it was made: a task due today made at 10:00 reads overdue at 00:05 the next IST day", (() => { fresh(); const t = T.createPersonalTask(ROHAN, { title: "edge", dueDate: D0 }).task.id; const a = T.getPersonalTask(ROHAN, t).overdue; clock("2026-11-24", "00:05"); return a === false && T.getPersonalTask(ROHAN, t).overdue === true; })());
check("O7", "the summary counts open tasks due today and overdue (personal and work assigned to me)", (() => { fresh(); T.createPersonalTask(ROHAN, { title: "p today", dueDate: D0 }); T.createPersonalTask(ROHAN, { title: "p old", dueDate: YEST }); T.createWorkTask(SNEHA, work({ assigneeId: ROHAN, dueDate: D0, title: "w today" })); T.createPersonalTask(ROHAN, { title: "p done", dueDate: YEST }); T.updatePersonalTask(ROHAN, "PT-3", { status: "done" }); const s = T.taskSummary(ROHAN); return s.dueToday === 2 && s.overdue === 1 && s.open === 3 && s.team.people === 0 && s.team.overdue === 0; })());

check("O8", "the summary counts only MY personal tasks: another person's due today and overdue add nothing", (() => { fresh(); T.createPersonalTask(ARJUN, { title: "arjun today", dueDate: D0 }); T.createPersonalTask(ARJUN, { title: "arjun old", dueDate: YEST }); const s = T.taskSummary(ROHAN); return s.dueToday === 0 && s.overdue === 0 && s.open === 0; })());
check("C16", "someone active but away (a past period of leaving, back later) can't be given a task: 'has left'", (() => { fresh(); S.updateUser(ADMIN, ARJUN, { phone: "+91 98765 43210" }); const box = JSON.parse(mem.get("officeos:users")); box.records.find((u) => u.id === ARJUN).leavingPeriods = [{ dateOfLeaving: "10 Nov 2026", reactivatedOn: "5 Dec 2026" }]; mem.set("officeos:users", j(box)); const r = T.createWorkTask(PRIYA, work({ assigneeId: ARJUN })); return !r.ok && /has left/.test(r.error); })());
check("T18", "reassign by HR to an inactive person (inside HR's reach) is refused for the person", (() => { fresh(); const t = T.createWorkTask(PRIYA, work({ assigneeId: ROHAN })).task.id; const r = T.reassignWorkTask(PRIYA, t, DIVYA); return !r.ok && r.field === "assigneeId" && T.getWorkTask(PRIYA, t).assigneeId === ROHAN; })());
check("N11", "finishing a task one gave oneself sends 'done' to the person it reports to, not to oneself", (() => { fresh(); const t = T.createWorkTask(ROHAN, work({ title: "own" })).task.id; T.setWorkStatus(ROHAN, t, "done"); return T.taskNoticesFor(SNEHA).filter((n) => n.kind === "done").length === 1 && T.taskNoticesFor(ROHAN).every((n) => n.kind !== "done"); })());

// ---------- N ----------
section("N. The bell's updates");
fresh();
const w1 = T.createWorkTask(SNEHA, work({ assigneeId: ROHAN, dueDate: D1, title: "Due tomorrow task" })).task.id;
check("N1", "nothing yet but the 'assigned' update; sync at 10:00 makes the 'due tomorrow' one for Rohan alone", T.syncTaskNotices(NOW) === 1 && T.taskNoticesFor(ROHAN).map((n) => n.kind).sort().join() === "assigned,due-tomorrow" && T.taskNoticesFor(SNEHA).length === 0);
check("N2", "idempotent: a reload, a second tab and ten more syncs make nothing", T.syncTaskNotices(NOW) === 0 && (() => { for (let i = 0; i < 10; i++) T.syncTaskNotices(NOW + i * 1000); return T.taskNoticesFor(ROHAN).length === 2; })());
clock("2026-11-25", "09:00");
check("N3", "two days on it is overdue: the assignee, the assigner and the report-to person each get one", T.syncTaskNotices(NOW) === 2 && T.taskNoticesFor(ROHAN).some((n) => n.kind === "overdue") && T.taskNoticesFor(SNEHA).some((n) => n.kind === "overdue" && n.text === "Overdue: Due tomorrow task") && T.syncTaskNotices(NOW) === 0);
check("N4", "the assigner and the report-to person (the same person here) get ONE overdue update, not two", T.taskNoticesFor(SNEHA).filter((n) => n.kind === "overdue").length === 1);
fresh();
const w2 = T.createWorkTask(SNEHA, work({ assigneeId: ROHAN, title: "Finish me" })).task.id;
T.setWorkStatus(ROHAN, w2, "done");
check("N5", "finishing sends 'done' to the assigner (and the report-to person), not to the assignee; a second 'done' for the same completion isn't made", T.taskNoticesFor(SNEHA).filter((n) => n.kind === "done").length === 1 && T.taskNoticesFor(ROHAN).every((n) => n.kind !== "done"));
check("N6", "a done task never gets an overdue update", (() => { clock("2026-12-20", "10:00"); T.syncTaskNotices(NOW); return T.taskNoticesFor(SNEHA).every((n) => n.kind !== "overdue"); })());
fresh();
T.createPersonalTask(ROHAN, { title: "Private overdue", dueDate: YEST });
T.createWorkTask(ROHAN, work({ title: "visible", dueDate: D0 }));
clock("2026-11-23", "10:00"); T.syncTaskNotices(NOW);
check("N7", "a personal task's overdue update goes to the owner alone, in words", T.taskNoticesFor(ROHAN).some((n) => n.text === "Overdue: Private overdue") && [SNEHA, PRIYA, ADMIN, ARJUN].every((v) => !j(T.taskNoticesFor(v)).includes("Private")));
check("N8", "marking an update read: only your own; unreadOnly then leaves it out", (() => { const n = T.taskNoticesFor(ROHAN)[0]; return !T.markTaskNoticeRead(SNEHA, n.id).ok && T.markTaskNoticeRead(ROHAN, n.id).ok && !T.taskNoticesFor(ROHAN, { unreadOnly: true }).some((x) => x.id === n.id); })());
check("N9", "deleting a personal task takes its updates too", (() => { const t = T.personalTasks(ROHAN)[0].id; T.deletePersonalTask(ROHAN, t); return !JSON.parse(mem.get("officeos:tasks")).notices.some((n) => n.taskId === t); })());
check("N10", "a due-date change makes a new overdue occasion, not a duplicate of the old one (key: the due date)", (() => { fresh(); const t = T.createWorkTask(ROHAN, work({ dueDate: D1, title: "moved" })).task.id; clock("2026-11-26", "10:00"); const a = T.syncTaskNotices(NOW); T.editWorkTask(ROHAN, t, { dueDate: "2026-11-27" }); clock("2026-11-28", "10:00"); const b = T.syncTaskNotices(NOW); return a >= 1 && b >= 1 && T.taskNoticesFor(ROHAN).filter((n) => n.kind === "overdue").length === 2; })());

// ---------- L ----------
section("L. Limits and the trail");
fresh();
check("L1", "title 1-120: empty and 121 refused, 120 and unicode accepted; notes 1,000; description 2,000", !T.createPersonalTask(ROHAN, { title: "" }).ok && !T.createPersonalTask(ROHAN, { title: "x".repeat(121) }).ok && T.createPersonalTask(ROHAN, { title: "x".repeat(120) }).ok && T.createPersonalTask(ROHAN, { title: "अनन्या का काम ✓" }).ok && !T.createPersonalTask(ROHAN, { title: "t", notes: "n".repeat(1001) }).ok && T.createPersonalTask(ROHAN, { title: "t", notes: "n".repeat(1000) }).ok && !T.createWorkTask(ROHAN, work({ description: "d".repeat(2001) })).ok && T.createWorkTask(ROHAN, work({ description: "d".repeat(2000) })).ok);
check("L2", "no markup: < or > in a title, notes, description, comment or reason is refused; control characters too", [() => T.createPersonalTask(ROHAN, { title: "<b>x</b>" }), () => T.createPersonalTask(ROHAN, { title: "t", notes: "<img src=x>" }), () => T.createWorkTask(ROHAN, work({ title: "a > b" })), () => T.createWorkTask(ROHAN, work({ description: "<script>" })), () => T.createPersonalTask(ROHAN, { title: "bad\u0007bell" })].every((f) => !f().ok));
check("L3", "dates: a personal due date must be real and sane (1999 and 2099-and-later-than-ten-years refused; none is fine)", !T.createPersonalTask(ROHAN, { title: "t", dueDate: "1999-12-31" }).ok && !T.createPersonalTask(ROHAN, { title: "t", dueDate: "2040-01-01" }).ok && !T.createPersonalTask(ROHAN, { title: "t", dueDate: "2026-13-01" }).ok && T.createPersonalTask(ROHAN, { title: "t" }).ok && T.createPersonalTask(ROHAN, { title: "t", dueDate: "2026-12-31" }).ok);
check("L4", "priority and status must be listed ones", !T.createPersonalTask(ROHAN, { title: "t", priority: "critical" }).ok && !T.createWorkTask(ROHAN, work({ priority: "now" })).ok && !T.updatePersonalTask(ROHAN, "PT-1", { status: "cancelled" }).ok);
fresh();
let capOk = true;
for (let i = 0; i < 500; i += 1) { if (!T.createPersonalTask(ROHAN, { title: `t${i}` }).ok) { capOk = false; break; } }
check("L5", "at most 500 open tasks per person: the 501st is refused (personal or work); finishing one makes room", capOk && !T.createPersonalTask(ROHAN, { title: "501" }).ok && !T.createWorkTask(SNEHA, work({ assigneeId: ROHAN })).ok && !T.createWorkTask(ROHAN, work()).ok && T.updatePersonalTask(ROHAN, "PT-1", { status: "done" }).ok && T.createPersonalTask(ROHAN, { title: "fits now" }).ok);
check("L6", "...and reopening a done personal task past the limit is refused", (() => { return !T.updatePersonalTask(ROHAN, "PT-1", { status: "pending" }).ok; })());
fresh();
const t1 = T.createWorkTask(SNEHA, work({ assigneeId: ROHAN, title: "Audit me" })).task.id;
T.setWorkStatus(ROHAN, t1, "in-progress", "starting"); T.reassignWorkTask(SNEHA, t1, ARJUN, "swap"); T.cancelWorkTask(SNEHA, t1, "dropped"); T.reopenWorkTask(SNEHA, t1, "back");
const trail = JSON.parse(mem.get("officeos:audit-trail")).events.filter((e) => e.kind.startsWith("task-"));
check("L7", "the trail has assigned, status, reassigned, cancelled, reopened for the task (ids and statuses only)", j(trail.map((e) => e.kind)) === j(["task-assigned", "task-status", "task-reassigned", "task-cancelled", "task-reopened"]) && trail.every((e) => !/Audit me|starting|swap|dropped|back/.test(e.detail) && e.detail.includes(t1)), j(trail.map((e) => e.detail)));
check("L8", "a refused action leaves nothing in the trail", (() => { const n = trail.length; T.setWorkStatus(MEERA, t1, "done"); T.cancelWorkTask(ROHAN, t1, "x"); return JSON.parse(mem.get("officeos:audit-trail")).events.filter((e) => e.kind.startsWith("task-")).length === n; })());
check("L9", "a task's stored form has no field beyond the brief's (no personal words anywhere but tasks)", (() => { const w = JSON.parse(mem.get("officeos:tasks")).work[0]; return j(Object.keys(w).sort()) === j(["assigneeId", "assignerId", "createdAt", "description", "doneAt", "dueDate", "id", "priority", "reportToId", "startedAt", "status", "timeline", "title"].sort()); })());
check("L10", "(after a reassignment Rohan no longer reads it) reads return copies: changing what a read returned changes nothing stored", (() => { const t = T.getWorkTask(SNEHA, t1); t.title = "tampered"; t.timeline.length = 0; return T.getWorkTask(SNEHA, t1).title === "Audit me" && T.getWorkTask(SNEHA, t1).timeline.length > 0; })());
check("L11", "a damaged box reads as empty, not a crash", (() => { mem.set("officeos:tasks", "{not json"); return j(T.personalTasks(ROHAN)) === "[]" && T.createPersonalTask(ROHAN, { title: "after damage" }).ok; })());
check("L12", "resetTasks clears everything", (() => { T.resetTasks(); return mem.get("officeos:tasks") === undefined && j(T.personalTasks(ROHAN)) === "[]"; })());

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);