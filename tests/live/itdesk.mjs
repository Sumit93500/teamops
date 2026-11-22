// usage: node itdesk.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// IT1: the IT desk (data/it-rules.js, data/it-store.js, data/it-desk.js, data/licences.js; data/credentials.js's request steps; config/roles.js's IT role)
//   X  nothing older moved: reading the new data stores nothing; people, departments, accounts and the audit read as before; no IT department until someone is in it
//   R  the IT role, the department, the designation, the permissions and what IT must never hold or read (salary, bank, PAN, expense files, documents)
//   A  account creation by IT, approved by the Admin: no credential before approval, the Admin never sees it, the preparer gets it once; the Admin's direct flow, flagged
//   W  the workflow: the moves, skipped states refused, separation of duties, SLA due dates, an append-only timeline, who sees what, bounded text
//   O  the other flows: password reset and unlock (sensitive by the account's role), access requests through the override mechanism, assets, software
//   F  offboarding: opened on deactivation, the checklist, the approval before disabling, assets blocking completion unless the Admin waives with a reason
//   L  licences: seats never above the limit, one per person, leavers listed, costs only for it:licences-view-costs
//   T  the Admin's review trail and the requesters' notices
import { readFileSync } from "node:fs";
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const clock = (date, hm = "10:00") => { const [y, m, d] = date.split("-").map(Number); const [h, mi] = hm.split(":").map(Number); NOW = RealDate.UTC(y, m - 1, d, h, mi) - 330 * 60000; };
clock("2026-11-22");

const S = await import("./js/data/store.js");
const C = await import("./js/data/credentials.js");
const AU = await import("./js/data/audit-trail.js");
const RO = await import("./js/config/roles.js");
const PE = await import("./js/config/permissions.js");
const U = await import("./js/data/users.js");
function j0(v) { return JSON.stringify(v); }
const oldReads = () => j0({ users: S.getAllUsers(), depts: S.getAllDepartments(), heads: S.headcountByDepartment(), accounts: S.getAllUsers().map((u) => C.accountOf(u.id, NOW)), audit: AU.allEvents() });
const before = oldReads();
const keysBefore = j0([...mem.keys()].sort());
const RU = await import("./js/data/it-rules.js");
const IS = await import("./js/data/it-store.js");
const D = await import("./js/data/it-desk.js");
const L = await import("./js/data/licences.js");
const AR = await import("./js/data/asset-register.js");
const SL = await import("./js/data/stock-ledger.js");
const ER = await import("./js/data/employee-record.js");
const F = await import("./js/data/files.js");
const E = await import("./js/data/expenses-store.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(6)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 300)}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const ADMIN = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029", ROHAN = "EMP-1042", DIVYA = "EMP-1061", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const box = () => JSON.parse(mem.get("officeos:it-desk") ?? "null");
const creds = () => JSON.parse(mem.get("officeos:credentials") ?? "{\"accounts\":{}}");
const allStored = () => [...mem.values()].join("\n");
const secrets = [];
let IT1, IT2, ADMIN2;
// the IT people and a second Admin (nobody is seeded with them)
function staff() {
  IT1 = S.addUser(ADMIN, { name: "Isha Kulkarni", email: "isha.kulkarni@northwind.com", department: "IT", designation: "IT Engineer", role: "it", dateOfJoining: "2 Nov 2026" }).record.id;
  IT2 = S.addUser(ADMIN, { name: "Dev Malhotra", email: "dev.malhotra@northwind.com", department: "IT", designation: "IT Engineer", role: "it", dateOfJoining: "2 Nov 2026" }).record.id;
  ADMIN2 = S.addUser(ADMIN, { name: "Nisha Varma", email: "nisha.varma@northwind.com", department: "ENG", designation: "Administrator", role: "admin", dateOfJoining: "2 Nov 2026" }).record.id;
}
// AS2: the register, stock ledger and licences start from the AS1 sample (tests/live/as1-*.json: captured before AS2 replaced the seed with the old inventory)
const FX = (n) => readFileSync(`./as1-${n}.json`, "utf8");
const fresh = () => { mem.clear(); clock("2026-11-22"); mem.set("officeos:asset-register", FX("register")); mem.set("officeos:stock-ledger", FX("stock")); mem.set("officeos:it-licences", FX("licences")); F.useFileBackend(F.memoryBackend()); staff(); };
const hire = (who, name, email) => S.addUser(who, { name, email, department: "ENG", designation: "Software Engineer", dateOfJoining: "2 Nov 2026" }).record.id;
const req = (id) => D.getItRequest(ADMIN, id);
const st = (id) => req(id).status;

// ---------- X ----------
section("X. Nothing older moved");
const readAll = () => [ADMIN, PRIYA, KABIR, ROHAN, SNEHA].flatMap((v) => [D.requestsFor(v), D.pendingItApprovals(v), D.itQueue(v), D.itActivity(v), D.itNoticesFor(v), D.exitsWithoutOffboarding(v), L.licencesFor(v), L.mySeats(v), L.underUsedLicences(v), L.seatsOfLeavers(v, NOW), L.expiringRenewals(v, 90, NOW), D.slaHours(), S.departmentChoices()]);
readAll();
check("X1", "reading every IT list as several people stores nothing", j([...mem.keys()].sort()) === keysBefore, j([...mem.keys()]));
check("X2", "people, departments, headcount by department, every account's state and the audit trail read as before", oldReads() === before);
check("X3", "the stored department list has no IT department (nobody is in it); the form's choices offer it", !S.getAllDepartments().some((d) => d.code === "IT") && S.departmentChoices().at(-1).code === "IT" && S.departmentChoices().length === S.getAllDepartments().length + 1);
check("X4", "no seeded person holds the IT role, and DEPARTMENTS (the seed) is unchanged", !S.getAllUsers().some((u) => u.role === "it") && !U.DEPARTMENTS.some((d) => d.code === "IT") && U.DEPARTMENTS.length === 6);

// ---------- R ----------
section("R. The role, the department, the permissions");
const NEWP = ["it:requests-handle", "it:requests-create", "it:approve", "it:activity-review", "it:licences-manage", "it:licences-view-costs", "it:account-prepare", "it:offboard"];
check("R1", "eight it:* permissions; 122 in all, in 47 modules (114 / 46 before IT1)", NEWP.every((p) => PE.ALL_PERMISSIONS.includes(p)) && PE.ALL_PERMISSIONS.length === 122 && Object.keys(PE.PERMISSIONS).length === 47, `${PE.ALL_PERMISSIONS.length} / ${Object.keys(PE.PERMISSIONS).length}`);
check("R2", "five roles: Admin 119, HR 64, Finance 56, Employee 31, IT 42; the IT role is labelled IT", j(Object.fromEntries(Object.entries(RO.ROLES).map(([k, r]) => [k, r.permissions.length]))) === j({ admin: 119, hr: 64, fin: 56, emp: 31, it: 42 }) && RO.ROLES.it.label === "IT" && j(RO.ROLE_KEYS) === j(["admin", "hr", "fin", "emp", "it"]));
const holders = (p) => RO.ROLE_KEYS.filter((k) => RO.ROLES[k].permissions.includes(p)).join(" ");
check("R3", "who holds each: handle / prepare / offboard / licences IT and Admin; create everyone; approve and activity-review the Admin only; costs Finance and Admin", j(NEWP.map(holders)) === j(["admin it", "admin hr fin emp it", "admin", "admin", "admin it", "admin fin", "admin it", "admin it"]), j(NEWP.map(holders)));
check("R4", "IT holds the custodian's five asset permissions (and the Admin still does, through every permission)", ["assets:manage", "assets:issue", "assets:maintain", "vendors:manage", "stock:move"].every((p) => RO.ROLES.it.permissions.includes(p) && RO.ROLES.admin.permissions.includes(p)));
const FORBIDDEN = PE.ALL_PERMISSIONS.filter((p) => /^(payroll|payslips|salary|tax|declarations|pii|files|users|expenses|leave-policy|payroll-rules|accounts|roles|audit):/.test(p) || ["leave:approve", "attendance:approve", "attendance:view-all", "attendance:any-office", "assets:view-values", "it:approve", "it:activity-review", "it:licences-view-costs", "expenses:view"].includes(p)).filter((p) => p !== "expenses:create" && p !== "payslip:view-own" && p !== "declarations:submit-own");   // everyone's own
check("R5", "IT holds no pay, bank, tax, leave-approval, attendance-edit, people, file, account or approval permission", FORBIDDEN.every((p) => !RO.ROLES.it.permissions.includes(p)) && FORBIDDEN.length === 39, FORBIDDEN.filter((p) => RO.ROLES.it.permissions.includes(p)).join());
check("R6", "none of the it:* permissions is overridable", NEWP.every((p) => !RO.OVERRIDABLE.includes(p)));
check("R7", "the designation 'IT Engineer' carries the IT role (the form's role choice)", U.DESIGNATIONS.find((d) => d.title === "IT Engineer")?.defaultRole === "it" && U.DESIGNATIONS.at(-1).title === "IT Engineer");
fresh();
check("R8", "the IT department joins the stored list with its first person, once; headcount counts them", S.getAllDepartments().filter((d) => d.code === "IT").length === 1 && S.headcountByDepartment().IT === 2 && S.getDepartment("IT").name === "IT");
check("R9", "an unknown department is still refused", S.addUser(ADMIN, { name: "X Y", email: "x.y@northwind.com", department: "ZZZ", designation: "Software Engineer", dateOfJoining: "2 Nov 2026" }).ok === false);
// IT can't read people's pay, bank, PAN, expense files or documents
const claim = E.submitExpense(ARJUN, { category: "travel", amount: 1200, date: "2026-11-18", reason: "Cab to the client office", receipt: "" }).record;
const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
const put = await F.putFile(ARJUN, { type: "expense", id: claim.id }, { name: "cab.pdf", bytes: pdf }, { kind: "expense-payslip" });
const fileMeta = F.allFileMeta().find((m) => m.linkTo.id === claim.id);
const docMeta = { id: "FL-X", ownerId: ROHAN, kind: "employee-document", linkTo: { type: "document", id: ROHAN, slot: "1" }, status: "active", docType: "PAN card" };
check("R10", "IT can't open anyone's profile (no salary, bank, PAN, Aadhaar), an expense claim's file or an employee document", put.ok && ER.relationOf(IT1, ROHAN) === null && ER.profileView(IT1, ROHAN) === null && !F.canViewFile(IT1, fileMeta) && !(await F.getFileFor(IT1, fileMeta.id)).ok && !F.canViewFile(IT1, docMeta) && ER.revealField(IT1, ROHAN, "pan", NOW).ok !== true);
check("R11", "...and holds none of salary:view, pii:view, payroll:view, files:view-expense, files:view-documents, expenses:view", ["salary:view", "pii:view", "payroll:view", "files:view-expense", "files:view-documents", "expenses:view"].every((p) => !RO.hasPermission(S.getUser(IT1), p)));
check("R12", "IT can't call the account functions directly: no reset, unlock, disable or new sign-in details", (await C.issueReset(IT1, ROHAN, "link", NOW)).ok === false && C.unlockAccount(IT1, ROHAN, NOW).ok === false && C.setSignInEnabled(IT1, ROHAN, false, NOW).ok === false && (await C.createAccount(IT1, ROHAN, NOW)).ok === false);
check("R13", "IT can't edit people or their permissions (updateUser, overrides)", !S.updateUser(IT1, ROHAN, { grantPermissions: ["reports:view"] }).ok && !S.updateUser(IT1, IT1, { role: "admin" }).ok && S.getUser(IT1).role === "it");

// ---------- A ----------
section("A. Account creation by IT, approved by the Admin");
fresh();
const meghna = hire(PRIYA, "Meghna Rao", "meghna.rao@northwind.com");
const hrDirect = await C.createAccount(PRIYA, meghna, NOW);
check("A1", "HR can't make sign-in details any more (code needs-it), nor a reset for someone with no sign-in", hrDirect.code === "needs-it" && (await C.issueReset(PRIYA, meghna, "temp", NOW)).code === "none" && (await C.issueReset(ADMIN, meghna, "temp", NOW)).code === "none" && !creds().accounts[meghna]);
const sign = await D.newSignIn(PRIYA, meghna, NOW);
const nar = sign.requestId;
check("A2", "HR's employee form opens a new-account request instead: no credential exists, the record says 'no sign-in yet'", sign.ok && sign.requested && st(nar) === "open" && req(nar).type === "new-account" && req(nar).subjectPersonId === meghna && C.accountOf(meghna, NOW).status === "none" && !creds().accounts[meghna] && !("tempPassword" in sign));
check("A3", "a second open new-account request for the same person is refused", !D.openNewAccountRequest(PRIYA, meghna, NOW).ok && !(await D.newSignIn(PRIYA, meghna, NOW)).ok);
check("A4", "a request for someone who has left, or who already has a sign-in, is refused", !D.openNewAccountRequest(PRIYA, DIVYA, NOW).ok && !D.openNewAccountRequest(PRIYA, ROHAN, NOW).ok);
check("A5", "only someone with users:create opens one (an employee, IT and Finance can't)", [ROHAN, IT1, KABIR].every((v) => !D.openNewAccountRequest(v, meghna, NOW).ok));
check("A6", "nothing can be prepared, approved or handed over before IT is assigned (it's open)", !D.prepareNewAccount(IT1, nar, { role: "emp", email: "meghna.rao@northwind.com", department: "ENG", startDate: "2026-11-02" }, NOW).ok && !D.approveRequest(ADMIN, nar, "", NOW).ok && !(await D.handOverAccount(IT1, nar, NOW)).ok);
check("A7", "assigning: only to someone in IT; then in progress, the requester notified", !D.assignRequest(ADMIN, nar, ROHAN, NOW).ok && D.assignRequest(ADMIN, nar, IT1, NOW).ok && st(nar) === "in-progress" && D.itNoticesFor(PRIYA).some((n) => n.requestId === nar && n.kind === "assigned"));
const prep = (fields) => D.prepareNewAccount(IT1, nar, { role: "emp", email: "meghna.rao@northwind.com", department: "ENG", managerId: SNEHA, startDate: "2026-11-02", ...fields }, NOW);
check("A8", "IT can't prepare an Admin account (HR raised it); nor an unknown role, a bad or taken email, an unknown department, an inactive manager", !prep({ role: "admin" }).ok && /Admin/.test(prep({ role: "admin" }).error) && !prep({ role: "boss" }).ok && !prep({ email: "not an email" }).ok && !prep({ email: "rohan.gupta@northwind.com" }).ok && !prep({ department: "ZZZ" }).ok && !prep({ managerId: DIVYA }).ok && !prep({ startDate: "2026-02-30" }).ok);
check("A9", "only the assignee prepares (not the other IT person, not the Admin)", !D.prepareNewAccount(IT2, nar, { role: "emp", email: "meghna.rao@northwind.com", department: "ENG", startDate: "2026-11-02" }, NOW).ok && !D.prepareNewAccount(ADMIN, nar, { role: "emp", email: "meghna.rao@northwind.com", department: "ENG", startDate: "2026-11-02" }, NOW).ok);
check("A10", "a submit before preparing is refused; prepared (IT role, the IT department), then submitted: awaiting approval, still no credential", !D.submitForApproval(IT1, nar, "", NOW).ok && prep({ role: "it", department: "IT" }).ok && D.submitForApproval(IT1, nar, "Ready", NOW).ok && st(nar) === "awaiting-approval" && !creds().accounts[meghna]);
check("A11", "IT can't approve (any IT person), HR (who raised it) can't, an employee can't", !D.approveRequest(IT1, nar, "", NOW).ok && !D.approveRequest(IT2, nar, "", NOW).ok && !D.approveRequest(PRIYA, nar, "", NOW).ok && !D.approveRequest(ROHAN, nar, "", NOW).ok && st(nar) === "awaiting-approval");
const rej = D.rejectRequest(ADMIN, nar, "Wrong start date: she starts on 3 Nov", NOW);
check("A12", "the Admin rejects with a reason: back to IT (rejected), the requester told; a reject with no reason is refused", rej.ok && st(nar) === "rejected" && !D.rejectRequest(ADMIN2, nar, "", NOW).ok && D.itNoticesFor(PRIYA).some((n) => n.kind === "rejected") && req(nar).timeline.some((t) => t.kind === "rejected" && /3 Nov/.test(t.note)));
check("A13", "IT resumes and prepares again; handing over before the approval is refused and makes nothing; resubmitted", D.resumeRequest(IT1, nar, "Fixing the date", NOW).ok && prep({ role: "it", department: "IT", startDate: "2026-11-03" }).ok
  && !(await D.handOverAccount(IT1, nar, NOW)).ok && !(await C.createAccountForRequest(IT1, nar, NOW)).ok && !creds().accounts[meghna] && D.submitForApproval(IT1, nar, "", NOW).ok && st(nar) === "awaiting-approval" && !(await D.handOverAccount(IT1, nar, NOW)).ok && !creds().accounts[meghna]);
const appr = D.approveRequest(ADMIN, nar, "Looks right", NOW);
check("A14", "the Admin approves: the prepared details are on the record (role IT, IT department, manager, start date); still no credential; nothing secret in the answer", appr.ok && st(nar) === "approved" && S.getUser(meghna).role === "it" && S.getUser(meghna).department === "IT" && S.getUser(meghna).reportingManagerId === SNEHA && S.getUser(meghna).dateOfJoining === "3 Nov 2026" && !creds().accounts[meghna] && !/tempPassword|token|link/i.test(j(appr)));
await new Promise((r) => setTimeout(r, 2000));   // anything the approval might have started in the background has finished by now
check("A14b", "...and still none once everything the approval could have started has settled (the approval makes no credential)", !creds().accounts[meghna] && C.accountOf(meghna, NOW).status === "none");
check("A15", "the Admin can't hand the details over (no override for it), nor can another IT person", !(await D.handOverAccount(ADMIN, nar, NOW)).ok && !(await C.createAccountForRequest(ADMIN, nar, NOW)).ok && !(await D.handOverAccount(IT2, nar, NOW)).ok && !creds().accounts[meghna]);
const handed = await D.handOverAccount(IT1, nar, NOW);
secrets.push(handed.tempPassword, decodeURIComponent(String(handed.link).split("token=")[1]));
check("A16", "the IT person who prepared it gets the temporary password and the 48-hour link, once; invited; the request done", handed.ok && handed.tempPassword.length === 14 && /set-password/.test(handed.link) && C.accountOf(meghna, NOW).status === "invited" && C.accountOf(meghna, NOW).mustChange && st(nar) === "done" && handed.expiresAt === NOW + 48 * 3600000);
check("A17", "handing over twice is refused (done, and the account exists)", !(await D.handOverAccount(IT1, nar, NOW)).ok && !(await C.createAccountForRequest(IT1, nar, NOW)).ok);
check("A18", "the secret is nowhere: not stored, not in the audit trail, the review trail, the timeline or the notices", secrets.every((s) => s && !allStored().includes(s)));
check("A19", "the review trail lists the approval and the credential issue (never the secret), the requester is told it's done", D.itActivity(ADMIN).some((a) => a.kind === "credential-issued" && a.requestId === nar && !a.override) && D.itActivity(ADMIN).some((a) => a.kind === "approved" && a.requestId === nar) && D.itNoticesFor(PRIYA).some((n) => n.requestId === nar && n.kind === "done"));
const tara = hire(ADMIN, "Tara Sen", "tara.sen@northwind.com");
const direct = await D.newSignIn(ADMIN, tara, NOW);
secrets.push(direct.tempPassword);
check("A20", "an Admin adding someone keeps the direct flow (details at once), flagged 'admin override' on the trail and in the audit trail", direct.ok && direct.tempPassword && C.accountOf(tara, NOW).status === "invited" && D.itActivity(ADMIN).some((a) => a.personId === tara && a.override && a.kind === "credential-issued" && /admin override/.test(a.summary)) && AU.eventsFor(tara).some((e) => e.kind === "account-created"));
const ravi = hire(PRIYA, "Ravi Das", "ravi.das@northwind.com");
const rq2 = (await D.newSignIn(PRIYA, ravi, NOW)).requestId;
await C.createAccount(ADMIN, ravi, NOW);
check("A21", "an Admin making details directly for someone with an open request closes that request (cancelled), so nothing is made twice", st(rq2) === "cancelled" && C.accountOf(ravi, NOW).status === "invited");
const adminAsk = D.openNewAccountRequest(ADMIN, hire(ADMIN, "Omar Ali", "omar.ali@northwind.com"), NOW).record.id;
D.assignRequest(ADMIN, adminAsk, IT2, NOW);
check("A22", "an Admin-raised request may be prepared with the Admin role, but that Admin can't approve their own request", D.prepareNewAccount(IT2, adminAsk, { role: "admin", email: "omar.ali@northwind.com", department: "ENG", startDate: "2026-11-02" }, NOW).ok && D.submitForApproval(IT2, adminAsk, "", NOW).ok && /raised/.test(D.approveRequest(ADMIN, adminAsk, "", NOW).error) && D.approveRequest(ADMIN2, adminAsk, "", NOW).ok && S.getUser(req(adminAsk).subjectPersonId).role === "admin");

// ---------- W ----------
section("W. The workflow");
check("W1", "the moves: open -> in progress | cancelled; in progress -> awaiting approval | done | cancelled; awaiting -> approved | rejected | cancelled; approved -> done | cancelled; rejected -> in progress | cancelled",
  j(RU.TRANSITIONS) === j({ open: ["in-progress", "cancelled"], "in-progress": ["awaiting-approval", "done", "cancelled"], "awaiting-approval": ["approved", "rejected", "cancelled"], approved: ["done", "cancelled"], rejected: ["in-progress", "cancelled"], done: [], cancelled: [] }));
check("W2", "sensitive: new-account, access, offboarding always; reset / unlock only for an Admin, HR or Finance account", ["new-account", "access-request", "offboarding"].every((t) => RU.isSensitive(t, "emp")) && ["admin", "hr", "fin"].every((r) => RU.isSensitive("password-reset", r) && RU.isSensitive("account-unlock", r)) && !RU.isSensitive("password-reset", "emp") && !RU.isSensitive("account-unlock", "it") && !RU.isSensitive("it-issue", "admin") && !RU.isSensitive("asset-request", "hr"));
fresh();
const mk = (who, fields) => D.createRequest(who, { title: "Something needs doing", priority: "normal", ...fields }, NOW);
const t1 = mk(ROHAN, { type: "it-issue", priority: "urgent", title: "VPN drops every hour" }).record;
check("W3", "an employee raises a ticket: open, due by the priority's hours (urgent 4 h)", t1.status === "open" && t1.dueAt === new RealDate(NOW + 4 * 3600000).toISOString());
check("W4", "SLA defaults 72 / 24 / 8 / 4 hours; each priority's due date", j(D.slaHours()) === j({ low: 72, normal: 24, high: 8, urgent: 4 }) && ["low", "normal", "high"].every((p, i) => mk(ROHAN, { type: "it-issue", priority: p }).record.dueAt === new RealDate(NOW + [72, 24, 8][i] * 3600000).toISOString()));
check("W5", "only the Admin changes the SLA (whole hours 1-720); new requests take it, due dates already set stay", !D.setSlaHours(IT1, { urgent: 2 }, NOW).ok && !D.setSlaHours(ADMIN, { urgent: 0 }, NOW).ok && !D.setSlaHours(ADMIN, { soon: 3 }, NOW).ok && D.setSlaHours(ADMIN, { urgent: 2 }, NOW).ok && mk(ROHAN, { type: "it-issue", priority: "urgent" }).record.dueAt === new RealDate(NOW + 2 * 3600000).toISOString() && req(t1.id).dueAt === t1.dueAt);
check("W6", "skipping a state is refused: an open ticket can't be resolved, approved, submitted or resumed", !D.resolveIssue(IT1, t1.id, "Fixed it", NOW).ok && !D.approveRequest(ADMIN, t1.id, "", NOW).ok && !D.submitForApproval(IT1, t1.id, "", NOW).ok && !D.resumeRequest(IT1, t1.id, "", NOW).ok && st(t1.id) === "open");
D.assignRequest(IT1, t1.id, IT1, NOW);
check("W7", "a non-sensitive request isn't sent for approval; it's carried out by its assignee only (not the other IT person)", !D.submitForApproval(IT1, t1.id, "", NOW).ok && !D.resolveIssue(IT2, t1.id, "Fixed it", NOW).ok && D.resolveIssue(IT1, t1.id, "Router firmware updated", NOW).ok && st(t1.id) === "done");
check("W8", "done is final: no cancel, resume or second resolution", !D.cancelRequest(ROHAN, t1.id, "Not needed", NOW).ok && !D.resumeRequest(IT1, t1.id, "", NOW).ok && !D.resolveIssue(IT1, t1.id, "Again", NOW).ok);
const tl1 = req(t1.id).timeline;
check("W9", "the timeline: created, assigned, status, executed, status, in order, each with who and when", j(tl1.map((t) => t.kind)) === j(["created", "assigned", "status", "executed", "status"]) && tl1.every((t) => t.actorId && t.at));
const t2 = mk(ROHAN, { type: "it-issue" }).record;
const tlBefore = j(box().timeline);
D.addComment(ROHAN, t2.id, "It happens on Wi-Fi only", NOW);
check("W10", "the timeline only grows (what was there stays, first), and nothing edits or deletes an entry", j(box().timeline.slice(0, JSON.parse(tlBefore).length)) === tlBefore && !Object.keys(D).some((k) => /^(edit|update|delete|remove|set)/i.test(k) && /timeline|entry|comment/i.test(k)) && (() => { const r = req(t2.id); r.timeline[0].note = "x"; return req(t2.id).timeline[0].note !== "x"; })());
check("W11", "an employee sees only what they raised; a manager (Sneha, Rohan's) sees none of Rohan's; IT and the Admin see all", D.requestsFor(ROHAN).every((r) => r.requesterId === ROHAN) && D.requestsFor(SNEHA).length === 0 && D.getItRequest(SNEHA, t2.id) === null && D.getItRequest(ARJUN, t2.id) === null && D.requestsFor(IT2).length === D.requestsFor(ADMIN).length && D.requestsFor(ADMIN).length >= 5);
const forReport = mk(SNEHA, { type: "asset-request", subjectPersonId: ROHAN, payload: { category: "monitor" } });
check("W12", "a manager raises one for a direct report and sees it (and only it); not for someone else's report", forReport.ok && j(D.requestsFor(SNEHA).map((r) => r.id)) === j([forReport.record.id]) && !mk(SNEHA, { type: "asset-request", subjectPersonId: MEERA, payload: { category: "monitor" } }).ok);
check("W13", "nothing for someone who has left (except an asset return)", !mk(PRIYA, { type: "password-reset", subjectPersonId: DIVYA }).ok && mk(IT1, { type: "asset-return", subjectPersonId: DIVYA, payload: { assetTag: "AST-0012" } }).ok);
check("W14", "text is bounded and never HTML: a title of 2 or 121 characters, a <script> title or details, 2,001 characters of details", !mk(ROHAN, { type: "it-issue", title: "ab" }).ok && !mk(ROHAN, { type: "it-issue", title: "x".repeat(121) }).ok && !mk(ROHAN, { type: "it-issue", title: "<script>x</script>" }).ok && !mk(ROHAN, { type: "it-issue", details: "<b>bold</b>" }).ok && !mk(ROHAN, { type: "it-issue", details: "x".repeat(2001) }).ok && mk(ROHAN, { type: "it-issue", details: "x".repeat(2000) }).ok);
check("W15", "an unknown type or priority is refused; new-account and offboarding can't be raised as ordinary requests", !mk(ROHAN, { type: "coffee" }).ok && !mk(ROHAN, { type: "it-issue", priority: "asap" }).ok && !mk(PRIYA, { type: "new-account", subjectPersonId: ROHAN }).ok && !mk(PRIYA, { type: "offboarding", subjectPersonId: ROHAN }).ok);
check("W16", "only the requester or IT cancels, with a reason", !D.cancelRequest(ARJUN, t2.id, "No longer", NOW).ok && !D.cancelRequest(ROHAN, t2.id, "", NOW).ok && D.cancelRequest(ROHAN, t2.id, "Works now", NOW).ok && st(t2.id) === "cancelled");
check("W17", "the overdue list: due dates passed, soonest first; only IT and the Admin see it", (() => { clock("2026-11-25"); const o = D.overdueRequests(IT1, NOW); clock("2026-11-22"); return o.length > 0 && o.every((r) => r.dueAt < "2026-11-25") && D.overdueRequests(ROHAN, NOW).length === 0; })());

// ---------- O ----------
section("O. Resets, unlocks, access, assets, software");
fresh();
const rr = mk(ROHAN, { type: "password-reset", title: "Forgot my password" }).record.id;   // Rohan: an employee, not sensitive
D.assignRequest(IT2, rr, IT1, NOW);
const res1 = await D.executeReset(IT1, rr, "temp", NOW);
secrets.push(res1.tempPassword);
check("O1", "an employee's reset isn't sensitive: IT carries it out without an approval; the temporary password comes back once; done", res1.ok && res1.tempPassword && st(rr) === "done" && C.accountOf(ROHAN, NOW).mustChange && !allStored().includes(res1.tempPassword));
const hr = mk(PRIYA, { type: "password-reset", title: "Locked out of my password" }).record.id;   // HR: sensitive
D.assignRequest(ADMIN, hr, IT1, NOW);
check("O2", "HR's reset is sensitive: carrying it out before the Admin's approval is refused, directly in credentials too", !(await D.executeReset(IT1, hr, "link", NOW)).ok && !(await C.resetForRequest(IT1, hr, "link", NOW)).ok);
check("O3", "...submitted; nobody without it:approve approves it (an employee, Finance, HR, IT); the Admin does; IT carries it out (a reset link)", D.submitForApproval(IT1, hr, "", NOW).ok
  && [ROHAN, KABIR, SNEHA, IT2].every((v) => !D.approveRequest(v, hr, "", NOW).ok) && st(hr) === "awaiting-approval" && D.approveRequest(ADMIN, hr, "", NOW).ok && (await D.executeReset(IT1, hr, "link", NOW)).ok && st(hr) === "done");
const fin = mk(KABIR, { type: "account-unlock", title: "Locked after a typo" }).record.id;
for (let i = 0; i < 5; i++) await C.signInWithPassword("kabir.shah@northwind.com", "wrong-password", NOW);
D.assignRequest(ADMIN, fin, IT1, NOW);
check("O4", "Finance's unlock is sensitive: refused before approval (also directly), then approved and carried out", C.accountOf(KABIR, NOW).status === "locked" && !D.executeUnlock(IT1, fin, NOW).ok && !C.unlockForRequest(IT1, fin, NOW).ok && D.submitForApproval(IT1, fin, "", NOW).ok && D.approveRequest(ADMIN, fin, "", NOW).ok && D.executeUnlock(IT1, fin, NOW).ok && C.accountOf(KABIR, NOW).status !== "locked");
await C.createAccount(ADMIN, ADMIN2, NOW);   // the second Admin's sign-in (Aarav's direct flow)
const adm = mk(ADMIN2, { type: "password-reset", title: "New phone, lost the password" }).record.id;
D.assignRequest(ADMIN, adm, IT2, NOW);
D.submitForApproval(IT2, adm, "", NOW);
check("O5", "an Admin's reset: the Admin who raised it can't approve it; another Admin can", /raised/.test(D.approveRequest(ADMIN2, adm, "", NOW).error) && D.approveRequest(ADMIN, adm, "", NOW).ok && (await D.executeReset(IT2, adm, "link", NOW)).ok);
const aboutAdmin = mk(IT1, { type: "password-reset", subjectPersonId: ADMIN, title: "Aarav's phone was replaced" }).record.id;
D.assignRequest(ADMIN2, aboutAdmin, IT2, NOW);
D.submitForApproval(IT2, aboutAdmin, "", NOW);
check("O5b", "a request about an Admin (raised by IT): that Admin can't approve it; another Admin can", /about yourself/.test(D.approveRequest(ADMIN, aboutAdmin, "", NOW).error ?? "") && D.approveRequest(ADMIN2, aboutAdmin, "", NOW).ok);
const ov = mk(ROHAN, { type: "it-issue", title: "Printer queue stuck" }).record.id;
D.assignRequest(ADMIN, ov, IT1, NOW);
check("O6", "an Admin carries out an IT step only through the override, with a reason; it's flagged on the trail and audited", !D.resolveIssue(ADMIN, ov, "Cleared the queue", NOW).ok && !D.resolveIssue(ADMIN, ov, "Cleared the queue", NOW, { override: "ab" }).ok && D.resolveIssue(ADMIN, ov, "Cleared the queue", NOW, { override: "IT out today" }).ok && D.itActivity(ADMIN).some((a) => a.requestId === ov && a.override && /admin override/.test(a.summary)) && AU.allEvents().some((e) => e.kind === "it-override" && e.detail.includes(ov)));
check("O7", "IT can't use the override", !D.resolveIssue(IT2, mk(ROHAN, { type: "it-issue" }).record.id, "x x x", NOW, { override: "because" }).ok);
const hr2 = mk(VIKRAM, { type: "password-reset", subjectPersonId: VIKRAM, title: "Reset please" }).record.id;
D.assignRequest(ADMIN, hr2, IT1, NOW);
check("O8", "...and an Admin who approved a request can't also carry it out (O3's approver on a new sensitive one)", (() => { const x = mk(PRIYA, { type: "account-unlock", title: "Unlock" }).record.id; D.assignRequest(ADMIN, x, IT1, NOW); D.submitForApproval(IT1, x, "", NOW); D.approveRequest(ADMIN, x, "", NOW); return /approved/.test(D.executeUnlock(ADMIN, x, NOW, { override: "Doing it myself" }).error ?? ""); })());
const acc = mk(SNEHA, { type: "access-request", subjectPersonId: ROHAN, title: "Rohan needs reports", payload: { permission: "reports:view" } }).record.id;
check("O9", "an access request names one grantable permission or a role (never Admin, never one that stays with a role)", !mk(ROHAN, { type: "access-request", payload: { permission: "payroll:approve" } }).ok && !mk(ROHAN, { type: "access-request", payload: { role: "admin" } }).ok && !mk(ROHAN, { type: "access-request", payload: {} }).ok && !mk(ROHAN, { type: "access-request", payload: { permission: "assets:view-own" } }).ok);
D.assignRequest(ADMIN, acc, IT1, NOW);
check("O10", "IT reviews and submits it; IT can't grant it (no approval, no override, no direct edit)", D.submitForApproval(IT1, acc, "Needed for the monthly report", NOW).ok && !D.approveRequest(IT1, acc, "", NOW).ok && !S.updateUser(IT1, ROHAN, { grantPermissions: ["reports:view"] }).ok && !RO.permissionsOf(S.getUser(ROHAN)).includes("reports:view"));
check("O11", "the Admin's approval applies it through the override mechanism and the request is done; Rohan and Sneha are told", D.approveRequest(ADMIN, acc, "", NOW).ok && RO.permissionsOf(S.getUser(ROHAN)).includes("reports:view") && j(S.getUser(ROHAN).grantPermissions) === j(["reports:view"]) && st(acc) === "done" && D.itNoticesFor(ROHAN).some((n) => n.requestId === acc && n.kind === "done") && D.itNoticesFor(SNEHA).some((n) => n.requestId === acc && n.kind === "approved"));
const self = mk(IT1, { type: "access-request", title: "I need audit:view", payload: { permission: "audit:view" } }).record.id;
D.assignRequest(ADMIN, self, IT2, NOW);
D.submitForApproval(IT2, self, "", NOW);
check("O12", "IT asking for a permission for itself still waits for the Admin; until then it doesn't hold it", !RO.permissionsOf(S.getUser(IT1)).includes("audit:view") && st(self) === "awaiting-approval" && D.pendingItApprovals(ADMIN).some((r) => r.id === self) && D.pendingItApprovals(IT2).length === 0);
const ar = mk(ARJUN, { type: "asset-request", title: "A second monitor", payload: { category: "monitor" } }).record.id;
D.assignRequest(ADMIN, ar, IT2, NOW);
const issued = D.fulfilAssetRequest(IT2, ar, "AST-0008", { condition: "good" }, NOW);
check("O13", "an asset request: IT issues an asset through the register; the request closes with its tag", issued.ok && issued.assetTag === "AST-0008" && AR.getAssetFor(ADMIN, "AST-0008").holderId === ARJUN && st(ar) === "done" && req(ar).closedNote === "AST-0008");
const ret = mk(ARJUN, { type: "asset-return", title: "Returning the chair", payload: { assetTag: "AST-0008" } }).record.id;
D.assignRequest(ADMIN, ret, IT2, NOW);
check("O14", "an asset return: only the asset that person holds; taken back through the register", D.fulfilAssetReturn(IT2, ret, { condition: "fair" }, NOW).ok && AR.getAssetFor(ADMIN, "AST-0008").status === "in-store" && st(ret) === "done");
const wrongRet = mk(ARJUN, { type: "asset-return", title: "Returning the laptop", payload: { assetTag: "AST-0001" } });
check("O15", "...a return request for an asset someone else holds is refused when it is raised (AST-0001 is Sneha's), and nothing moves", !wrongRet.ok && /isn't issued/.test(wrongRet.error) && AR.getAssetFor(ADMIN, "AST-0001").holderId === SNEHA);
const dup1 = mk(ANANYA, { type: "asset-request", title: "A laptop bag", payload: { category: "other" } });
const dup2 = mk(ANANYA, { type: "asset-request", title: "A laptop bag again", payload: { category: "other" } });
const dup3 = mk(ANANYA, { type: "asset-request", title: "A monitor", payload: { category: "monitor" } });
check("O15b", "a second open request for the same kind of asset is refused (naming the first); another kind is fine; once the first is cancelled, it can be raised again", dup1.ok && !dup2.ok && dup2.error.includes(dup1.record.id) && dup3.ok && D.cancelRequest(ANANYA, dup1.record.id, "Not needed now", NOW).ok && mk(ANANYA, { type: "asset-request", title: "A laptop bag", payload: { category: "other" } }).ok);
const dupRet = mk(SNEHA, { type: "asset-return", title: "Returning my laptop", payload: { assetTag: "AST-0001" } });
check("O15c", "one open return request per asset: a second is refused; a manager can't ask for a return of an asset their report doesn't hold", dupRet.ok && !mk(SNEHA, { type: "asset-return", title: "Returning my laptop again", payload: { assetTag: "AST-0001" } }).ok && !mk(SNEHA, { type: "asset-return", subjectPersonId: ROHAN, title: "Rohan's chair", payload: { assetTag: "AST-0007" } }).ok);
const sw = mk(ANANYA, { type: "software-request", title: "Office for my laptop", payload: { software: "Microsoft 365" } }).record.id;
D.assignRequest(ADMIN, sw, IT1, NOW);
check("O16", "a software request: a seat on the licence, then done", D.fulfilSoftwareRequest(IT1, sw, "LIC-1", NOW).ok && L.mySeats(ANANYA).some((s) => s.licenceId === "LIC-1") && st(sw) === "done");

// ---------- F ----------
section("F. Offboarding");
fresh();
S.updateUser(ADMIN, ROHAN, { grantPermissions: ["reports:view"] });
const deact = S.deactivateUser(PRIYA, ROHAN, "2026-11-21");
const off = D.requestsFor(ADMIN, { type: "offboarding" }).find((r) => r.subjectPersonId === ROHAN);
check("F1", "deactivating someone opens their offboarding by itself (HR as the requester), with the four checklist items", deact.ok && off && off.requesterId === PRIYA && off.status === "open" && j(off.checklist.map((c) => c.key)) === j(["disable-signin", "return-assets", "revoke-licences", "remove-overrides"]) && off.checklist.every((c) => !c.done));
check("F2", "a second offboarding for the same person is refused; IT can open one for someone else; nobody opens their own", !D.openOffboarding(PRIYA, ROHAN, NOW).ok && D.openOffboarding(IT1, VIKRAM, NOW).ok && !D.openOffboarding(IT1, IT1, NOW).ok && !D.openOffboarding(SNEHA, ARJUN, NOW).ok);
D.assignRequest(ADMIN, off.id, IT1, NOW);
const held = D.tickChecklist(IT1, off.id, "return-assets", NOW);
check("F3", "'return assets' can't be ticked while anything is still with them (AST-0002, AST-0010 is back; a keyboard from stock)", !held.ok && /AST-0002/.test(held.error) && /keyboard/i.test(held.error), held.error);
check("F4", "disabling the sign-in before the Admin's approval is refused (also directly in credentials)", !D.executeOffboardingDisable(IT1, off.id, NOW).ok && !C.disableForRequest(IT1, off.id, NOW).ok && C.accountOf(ROHAN, NOW).status !== "disabled");
check("F5", "'remove access overrides' can't be ticked while Rohan still has one", !D.tickChecklist(IT1, off.id, "remove-overrides", NOW).ok);
check("F6", "'revoke licences' can't be ticked while he holds a seat; revoked, it can", !D.tickChecklist(IT1, off.id, "revoke-licences", NOW).ok && L.revokeSeat(IT1, L.seatsHeldBy(IT1, ROHAN)[0].id, NOW).ok && D.tickChecklist(IT1, off.id, "revoke-licences", NOW).ok);
check("F7", "submitted; the Admin approves; his access overrides go with the approval (through the override mechanism)", D.submitForApproval(IT1, off.id, "", NOW).ok && D.approveRequest(ADMIN, off.id, "", NOW).ok && j(S.getUser(ROHAN).grantPermissions ?? []) === j([]) && D.tickChecklist(IT1, off.id, "remove-overrides", NOW).ok);
check("F8", "completing is refused while items are open", !D.completeOffboarding(IT1, off.id, NOW).ok && st(off.id) === "approved");
const dis = D.executeOffboardingDisable(IT1, off.id, NOW);
check("F9", "once approved, on or after the last working day, IT disables the sign-in: nothing is deleted (the record, its history stay)", dis.ok && C.accountOf(ROHAN, NOW).status === "disabled" && S.getUser(ROHAN).name === "Rohan Gupta" && AU.eventsFor(ROHAN).some((e) => e.kind === "disabled") && D.itActivity(ADMIN).some((a) => a.kind === "disabled" && a.personId === ROHAN));
check("F10", "the checklist can't be completed with assets still out, even with the rest done", !D.completeOffboarding(IT1, off.id, NOW).ok && /return-assets/.test(D.completeOffboarding(IT1, off.id, NOW).error));
check("F11", "only the Admin waives 'return assets', with a reason; IT can't; the waiver is flagged on the trail and audited", !D.waiveOffboardingItem(IT1, off.id, "return-assets", "Lost in transit", NOW).ok && !D.waiveOffboardingItem(ADMIN, off.id, "return-assets", "", NOW).ok && !D.waiveOffboardingItem(ADMIN, off.id, "disable-signin", "Skip it", NOW).ok && D.waiveOffboardingItem(ADMIN, off.id, "return-assets", "Laptop reported stolen; police report filed", NOW).ok && D.itActivity(ADMIN).some((a) => a.requestId === off.id && a.override) && AU.allEvents().some((e) => e.kind === "it-override" && e.detail.includes(off.id)));
check("F12", "then IT completes it: done", D.completeOffboarding(IT1, off.id, NOW).ok && st(off.id) === "done");
const v = D.requestsFor(ADMIN, { type: "offboarding" }).find((r) => r.subjectPersonId === VIKRAM);
S.deactivateUser(ADMIN, VIKRAM, "2026-12-31");
D.assignRequest(ADMIN, v.id, IT2, NOW);
D.submitForApproval(IT2, v.id, "", NOW);
D.approveRequest(ADMIN, v.id, "", NOW);
check("F13", "the sign-in isn't disabled before the last working day (31 Dec), even approved", !D.executeOffboardingDisable(IT2, v.id, NOW).ok && C.accountOf(VIKRAM, NOW).status !== "disabled");
const mo = D.openOffboarding(PRIYA, MEERA, NOW).record.id;
D.assignRequest(ADMIN, mo, IT1, NOW);
D.tickChecklist(ADMIN, mo, "revoke-licences", NOW, { override: "Covering for IT today" });
D.submitForApproval(IT1, mo, "", NOW);
check("F13b", "an Admin who worked on an offboarding (an override tick) can't approve it; another Admin can", /worked on/.test(D.approveRequest(ADMIN, mo, "", NOW).error ?? "") && D.approveRequest(ADMIN2, mo, "", NOW).ok);
check("F14", "people who left with no offboarding are listed (Divya, from before)", D.exitsWithoutOffboarding(IT1).some((x) => x.personId === DIVYA) && !D.exitsWithoutOffboarding(IT1).some((x) => x.personId === ROHAN) && D.exitsWithoutOffboarding(ROHAN).length === 0);

// ---------- L ----------
section("L. Licences");
fresh();
const lic = L.licencesFor(IT1)[0];
check("L1", "the sample licence: 10 seats, 4 in use (one is Divya's, who has left); IT reads it without its cost", lic.id === "LIC-1" && lic.seats === 10 && lic.used === 4 && !("costPerYear" in lic) && L.seatsOfLeavers(IT1, NOW).map((s) => s.personId).join() === DIVYA);
check("L2", "Finance and the Admin read the cost; an employee reads no licence at all; HR neither", L.licencesFor(KABIR)[0].costPerYear === 129600 && L.licencesFor(ADMIN)[0].costPerYear === 129600 && L.licencesFor(ROHAN).length === 0 && L.licencesFor(PRIYA).length === 0);
check("L3", "costs are left out of every IT read: the list, renewals, under-used", [L.licencesFor(IT1), L.expiringRenewals(IT1, 90, NOW), L.underUsedLicences(IT1)].every((x) => !j(x).includes("costPerYear")) && L.expiringRenewals(IT1, 90, NOW).length === 1 && L.expiringRenewals(IT1, 30, NOW).length === 0);
check("L4", "one seat per person per licence; nobody who left gets one", !L.assignSeat(IT1, "LIC-1", SNEHA, NOW).ok && !L.assignSeat(IT1, "LIC-1", DIVYA, NOW).ok);
const small = L.addLicence(IT1, { software: "Figma Professional", vendorId: "VN-1", seats: 2, costPerYear: 36000, renewalDate: "2027-03-31" }, NOW);
check("L5", "IT adds a licence (typing its cost from the invoice) but never reads it back, nor changes it", small.ok && !("costPerYear" in small.record) && !L.updateLicence(IT1, small.record.id, { costPerYear: 1 }, NOW).ok && L.licencesFor(KABIR).find((x) => x.id === small.record.id).costPerYear === 36000);
check("L6", "seats can't go above the limit: two of two, a third refused", L.assignSeat(IT1, small.record.id, ROHAN, NOW).ok && L.assignSeat(IT1, small.record.id, ARJUN, NOW).ok && !L.assignSeat(IT1, small.record.id, ANANYA, NOW).ok && L.licencesFor(IT1).find((x) => x.id === small.record.id).free === 0);
check("L7", "...nor can the seats be lowered below those in use; a revoked seat frees one", !L.updateLicence(IT1, small.record.id, { seats: 1 }, NOW).ok && L.revokeSeat(IT1, L.seatsOf(IT1, small.record.id)[0].id, NOW).ok && L.assignSeat(IT1, small.record.id, ANANYA, NOW).ok);
check("L8", "under-used: licences with free seats, most free first; Finance and employees can't manage seats", L.underUsedLicences(IT1)[0].id === "LIC-1" && !L.assignSeat(KABIR, "LIC-1", ANANYA, NOW).ok && !L.assignSeat(ROHAN, "LIC-1", ROHAN, NOW).ok);
check("L9", "licence checks: seats 0 or 100,001, a bad date, an unknown vendor, a duplicate active licence, extra fields", !L.addLicence(IT1, { software: "X Tool", seats: 0, renewalDate: "2027-01-01" }, NOW).ok && !L.addLicence(IT1, { software: "X Tool", seats: 100001, renewalDate: "2027-01-01" }, NOW).ok && !L.addLicence(IT1, { software: "X Tool", seats: 1, renewalDate: "2027-02-30" }, NOW).ok && !L.addLicence(IT1, { software: "X Tool", seats: 1, renewalDate: "2027-01-01", vendorId: "VN-9" }, NOW).ok && !L.addLicence(IT1, { software: "figma professional", seats: 1, renewalDate: "2027-01-01" }, NOW).ok && !L.addLicence(IT1, { software: "X Tool", seats: 1, renewalDate: "2027-01-01", id: "LIC-9" }, NOW).ok);
check("L10", "no audit event names a cost", !AU.allEvents().some((e) => /36000|129600|36,000/.test(e.detail)) && AU.allEvents().some((e) => e.kind === "licence-added") && AU.allEvents().some((e) => e.kind === "seat-revoked"));

// ---------- T ----------
section("T. The review trail and the notices");
fresh();
const tk = mk(ROHAN, { type: "it-issue", title: "Mouse not working" }).record.id;
D.assignRequest(IT1, tk, IT1, NOW);
D.resolveIssue(IT1, tk, "Replaced the battery", NOW);
const trail = D.itActivity(ADMIN);
check("T1", "every execution lands on the Admin's review trail, non-sensitive ones too; unreviewed count", trail.some((a) => a.requestId === tk && a.kind === "executed" && !a.override) && D.unreviewedCount(ADMIN) === trail.length && trail.length >= 1);
check("T2", "only the Admin reads it (IT, HR, Finance read nothing) and only the Admin marks reviewed", D.itActivity(IT1).length === 0 && D.itActivity(PRIYA).length === 0 && D.itActivity(KABIR).length === 0 && !D.markReviewed(IT1, trail[0].id, NOW).ok);
const mark = D.markReviewed(ADMIN, trail[0].id, NOW);
check("T3", "marked reviewed (who, when), once; the request's timeline says so; the count drops", mark.ok && mark.record.reviewedBy === ADMIN && !D.markReviewed(ADMIN, trail[0].id, NOW).ok && req(tk).timeline.at(-1).kind === "reviewed" && D.unreviewedCount(ADMIN) === trail.length - 1);
D.resolveIssue(ADMIN, (() => { const x = mk(ROHAN, { type: "it-issue" }).record.id; D.assignRequest(ADMIN, x, IT1, NOW); return x; })(), "Fixed by me", NOW, { override: "IT is out" });
const ovEntry = D.itActivity(ADMIN, { override: true })[0];
check("T4", "filters (override, reviewed); an Admin's own override is reviewed by someone else", ovEntry && ovEntry.override && !D.markReviewed(ADMIN, ovEntry.id, NOW).ok && D.markReviewed(ADMIN2, ovEntry.id, NOW).ok && D.itActivity(ADMIN, { reviewed: true }).length === 2);
check("T5", "the trail's entries can't be edited (no such function; reads are copies)", !Object.keys(D).some((k) => /^(edit|update|delete|remove)/i.test(k) && /activity|trail/i.test(k)) && (() => { const a = D.itActivity(ADMIN); a[0].summary = "x"; return D.itActivity(ADMIN)[0].summary !== "x"; })());
check("T6", "the requester is told at assignment and completion, newest first; only their own notices; read once marked", j(D.itNoticesFor(ROHAN).filter((n) => n.requestId === tk).map((n) => n.kind)) === j(["done", "assigned"]) && D.itNoticesFor(ARJUN).length === 0 && D.markNoticeRead(ROHAN, D.itNoticesFor(ROHAN)[0].id, NOW).ok && !D.markNoticeRead(ARJUN, D.itNoticesFor(ROHAN)[0].id, NOW).ok && D.itNoticesFor(ROHAN, { unreadOnly: true }).length === D.itNoticesFor(ROHAN).length - 1);
check("T7", "the waiting kind for the inbox and the bell: what waits for the Admin's approval, never for IT or the requester", D.IT_WAITING_KIND === "itApprovals" && (() => { const x = mk(ROHAN, { type: "access-request", payload: { permission: "reports:view" } }).record.id; D.assignRequest(ADMIN, x, IT1, NOW); D.submitForApproval(IT1, x, "", NOW); return D.pendingItApprovals(ADMIN).some((r) => r.id === x) && D.pendingItApprovals(IT1).length === 0 && D.pendingItApprovals(ROHAN).length === 0 && D.pendingItApprovals(PRIYA).length === 0; })());
check("T8", "every IT write is in the audit trail with the request id, never a secret", ["it-request-created", "it-request-assigned", "it-request-executed", "it-override", "it-reviewed", "it-request-submitted"].every((k) => AU.allEvents().some((e) => e.kind === k && AU.AUDIT_LABEL[k])) && secrets.every((s) => !AU.allEvents().some((e) => e.detail.includes(s))));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);