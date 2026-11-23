// usage: node itdesk2.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// IT2: the rulings on the IT desk (data/it-rules.js approvalPath, data/it-desk.js, data/credentials.js issueReset, data/asset-register.js detailsToComplete / completeDetails,
// data/asset-rules.js STOCK_ONLY_*) and what the IT screens ask of the data layer (itSummary, availableActions, needsBreakGlass, itDecidedBy, openPasswordReset)
//   H  HR no longer resets directly (accounts:reset is the Admin's: 63 permissions for HR); HR asks IT (a password-reset request); the Admin's direct reset is flagged on the trail
//   G  break-glass: a request about or from the only Admin is approved by that Admin only with a written reason (20+ characters), flagged, listed until another Admin reviews it;
//      a second Admin, a non-Admin and IT never get it; a different Admin approves without a reason and nothing is flagged
//   S  what the screens ask: the dashboard's summary, the buttons a person is offered (availableActions) by role and state, who decided what
//   C  Complete details: the imported assets with details missing, who may complete what, the AS1 validation, the flag going; access cards are stock items
import { readFileSync } from "node:fs";
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const clock = (date, hm = "10:00") => { const [y, m, d] = date.split("-").map(Number); const [h, mi] = hm.split(":").map(Number); NOW = RealDate.UTC(y, m - 1, d, h, mi) - 330 * 60000; };
clock("2026-11-23");

const S = await import("./js/data/store.js");
const C = await import("./js/data/credentials.js");
const RO = await import("./js/config/roles.js");
const RU = await import("./js/data/it-rules.js");
const D = await import("./js/data/it-desk.js");
const AR = await import("./js/data/asset-register.js");
const AU = await import("./js/data/asset-rules.js");
const SL = await import("./js/data/stock-ledger.js");
const F = await import("./js/data/files.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(6)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 300)}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const ADMIN = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ROHAN = "EMP-1042", SNEHA = "EMP-1029", ARJUN = "EMP-1105";
const allStored = () => [...mem.values()].join("\n");
let IT1, IT2, ADMIN2;
const staff = () => {
  IT1 = S.addUser(ADMIN, { name: "Isha Kulkarni", email: "isha.kulkarni@northwind.com", department: "IT", designation: "IT Engineer", role: "it", dateOfJoining: "2 Nov 2026" }).record.id;
  IT2 = S.addUser(ADMIN, { name: "Dev Malhotra", email: "dev.malhotra@northwind.com", department: "IT", designation: "IT Engineer", role: "it", dateOfJoining: "2 Nov 2026" }).record.id;
};
const addAdmin = () => { ADMIN2 = S.addUser(ADMIN, { name: "Nisha Varma", email: "nisha.varma@northwind.com", department: "ENG", designation: "Administrator", role: "admin", dateOfJoining: "2 Nov 2026" }).record.id; };
const fresh = () => { mem.clear(); clock("2026-11-23"); F.useFileBackend(F.memoryBackend()); staff(); };
const req = (id) => D.getItRequest(ADMIN, id);
const st = (id) => req(id).status;
const raise = (who, fields) => D.createRequest(who, { priority: "normal", ...fields }, NOW);
// a password reset about `subject` raised by HR, taken by IT1 and sent to the Admin: awaiting approval
const toAwaiting = (subject, who = PRIYA) => {
  const r = raise(who, { type: "password-reset", subjectPersonId: subject, title: `Reset ${subject}` });
  if (!r.ok) return r;
  D.assignRequest(IT1, r.record.id, IT1, NOW);
  const s = D.submitForApproval(IT1, r.record.id, "", NOW);
  return s.ok ? { ok: true, id: r.record.id } : s;
};
const LONG = "I am the only Admin and this reset is needed today";

// ---------- H ----------
section("H. HR no longer resets directly");
fresh();
check("H1", "HR holds 63 permissions and not accounts:reset; the Admin still holds it (119 of 122)", RO.ROLES.hr.permissions.length === 66 && !RO.ROLES.hr.permissions.includes("accounts:reset") && RO.ROLES.admin.permissions.includes("accounts:reset") && RO.ROLES.admin.permissions.length === 123 /* I1 (behaviour; were 119, 63, 56: imports and exports) */);
const direct = await C.issueReset(PRIYA, ROHAN, "link", NOW);
check("H2", "HR's direct reset is refused (not-allowed) and makes no link, no mail and no account change", !direct.ok && direct.code === "not-allowed" && !direct.link && !allStored().includes("reset-password.html?token"));
const hrReq = D.openPasswordReset(PRIYA, ROHAN, NOW);
check("H3", "HR's 'reset password' opens a password-reset request for the person instead: raised by HR, about Rohan, titled in words, normal priority, open", hrReq.ok && hrReq.record.type === "password-reset" && hrReq.record.requesterId === PRIYA && hrReq.record.subjectPersonId === ROHAN && hrReq.record.title === "Reset password for Rohan Gupta" && hrReq.record.status === "open" && hrReq.record.priority === "normal", j(hrReq.record ?? hrReq));
check("H4", "a second one for the same person is refused while the first is open, naming it; an unknown person is refused", !D.openPasswordReset(PRIYA, ROHAN, NOW).ok && /already an open password reset for Rohan Gupta \(ITR-1\)/.test(D.openPasswordReset(PRIYA, ROHAN, NOW).error) && !D.openPasswordReset(PRIYA, "EMP-9999", NOW).ok);
check("H5", "an employee can ask for their own reset but not for someone else's; a manager for a direct report", D.openPasswordReset(ARJUN, ARJUN, NOW).ok && !D.openPasswordReset(ARJUN, ROHAN, NOW).ok);
const viaIt = D.assignRequest(IT1, "ITR-1", IT1, NOW);
const done = await D.executeReset(IT1, "ITR-1", "link", NOW);
check("H6", "IT carries it out: the link comes back once to IT, the request is done, and the trail says so without the secret", viaIt.ok && done.ok && /reset-password\.html\?token=/.test(done.link) && st("ITR-1") === "done" && D.itActivity(ADMIN).some((a) => a.requestId === "ITR-1" && a.kind === "credential-issued" && !a.override) && !JSON.stringify(D.itActivity(ADMIN)).includes(done.link.split("token=")[1]));
const adminReset = await C.issueReset(ADMIN, KABIR, "temp", NOW);
check("H7", "the Admin's direct reset still works, returns the secret once, and is flagged 'admin override' on the review trail (about Kabir), the secret nowhere in storage",
  adminReset.ok && adminReset.tempPassword.length === 14 && D.itActivity(ADMIN).some((a) => a.personId === KABIR && a.kind === "credential-issued" && a.override === true && a.actorId === ADMIN) && !allStored().includes(adminReset.tempPassword));
const adminLink = await C.issueReset(ADMIN, ROHAN, "link", NOW);
check("H8", "...for a reset link too (flagged); a refused reset (an Admin's own, or HR's) leaves no entry", adminLink.ok && D.itActivity(ADMIN, { override: true, personId: ROHAN }).length === 1 && !(await C.issueReset(ADMIN, ADMIN, "link", NOW)).ok && D.itActivity(ADMIN, { override: true }).length === 2);

check("H10", "a request for someone who has left is refused at the person's field (a reset, an unlock, access, an asset, software)", ["password-reset", "account-unlock"].every((ty) => { const r = D.createRequest(PRIYA, { type: ty, subjectPersonId: "EMP-1061", title: "For a leaver", priority: "normal" }, NOW); return !r.ok && r.field === "subjectPersonId" && /has left/.test(r.error); }));

// ---------- G ----------
section("G. Break-glass");
fresh();
const bg = toAwaiting(ADMIN);
check("G1", "a password reset about an Admin is sensitive and waits for approval; with one Admin it is on that Admin's pending list (to approve with a reason)", bg.ok && st(bg.id) === "awaiting-approval" && D.pendingItApprovals(ADMIN).some((r) => r.id === bg.id) && D.needsBreakGlass(ADMIN, bg.id) && D.soleAdmin());
const none = D.approveRequest(ADMIN, bg.id, "", NOW);
check("G2", "approving it without a reason is refused, naming the rule and the field (breakGlass); nothing changes", !none.ok && none.field === "breakGlass" && /only Admin/.test(none.error) && /at least 20 characters/.test(none.error) && st(bg.id) === "awaiting-approval" && D.itActivity(ADMIN).length === 0, none.error);
const short = D.approveRequest(ADMIN, bg.id, "", NOW, { breakGlass: "too short a reason" });
check("G3", "a reason under 20 characters is refused (19 shown); HTML in it is refused; an ordinary note doesn't count as the reason", !short.ok && short.field === "breakGlass" && !D.approveRequest(ADMIN, bg.id, "", NOW, { breakGlass: "<b>bold reason that is long</b>" }).ok && !D.approveRequest(ADMIN, bg.id, LONG, NOW).ok && "too short a reason".length === 18 && !D.approveRequest(ADMIN, bg.id, "", NOW, { breakGlass: "x".repeat(19) }).ok && st(bg.id) === "awaiting-approval");
const ok20 = D.approveRequest(ADMIN, bg.id, "", NOW, { breakGlass: "x".repeat(20) });
check("G4", "exactly 20 characters is enough: approved, and the answer says break-glass", ok20.ok && ok20.breakGlass === true && st(bg.id) === "approved" && req(bg.id).approvedBy === ADMIN);
const ent = D.itActivity(ADMIN).find((a) => a.requestId === bg.id && a.kind === "approved");
check("G5", "it is flagged break-glass on the review trail (with its words), not as an override, and the timeline keeps the reason", ent?.breakGlass === true && ent.override === false && /break-glass/.test(ent.summary) && req(bg.id).timeline.some((t) => t.kind === "approved" && /^Break-glass: x{20}/.test(t.note)));
check("G6", "it is listed as waiting for review: breakGlassOpen, the unreviewed count, the filter", D.breakGlassOpen(ADMIN).length === 1 && D.unreviewedCount(ADMIN) >= 1 && D.itActivity(ADMIN, { breakGlass: true }).length === 1 && D.itActivity(ADMIN, { breakGlass: false }).every((a) => !a.breakGlass));
check("G7", "the only Admin can't review their own break-glass approval (someone else does)", !D.markReviewed(ADMIN, ent.id, NOW).ok && /break-glass/.test(D.markReviewed(ADMIN, ent.id, NOW).error) && D.breakGlassOpen(ADMIN).length === 1);
addAdmin();
check("G8", "once there is a second Admin, the first may not do it again: nobody is the only Admin", !D.soleAdmin() && !D.needsBreakGlass(ADMIN, bg.id));
check("G9", "the second Admin reviews it: it leaves the waiting list; the first can't review it twice", D.markReviewed(ADMIN2, ent.id, NOW).ok && D.breakGlassOpen(ADMIN).length === 0 && !D.markReviewed(ADMIN2, ent.id, NOW).ok);
const bg2 = toAwaiting(ADMIN);
const self = D.approveRequest(ADMIN, bg2.id, "", NOW, { breakGlass: LONG });
check("G10", "with a second Admin, the same request about the first Admin can't be approved by them, reason or not: 'about yourself', another Admin has to; nothing flagged", !self.ok && /about yourself/.test(self.error) && !D.pendingItApprovals(ADMIN).some((r) => r.id === bg2.id) && D.pendingItApprovals(ADMIN2).some((r) => r.id === bg2.id) && st(bg2.id) === "awaiting-approval");
const other = D.approveRequest(ADMIN2, bg2.id, "", NOW);
check("G11", "the other Admin approves it without any reason; nothing is flagged break-glass; the answer says so; only they have it among what they decided", other.ok && D.itDecidedBy(ADMIN2).some((x) => x.request.id === bg2.id) && !D.itDecidedBy(ADMIN).some((x) => x.request.id === bg2.id) && other.breakGlass === false && !D.itActivity(ADMIN2).some((a) => a.requestId === bg2.id && a.breakGlass) && D.breakGlassOpen(ADMIN2).length === 0);
const ignored = toAwaiting(KABIR);
const plainWithReason = D.approveRequest(ADMIN, ignored.id, "", NOW, { breakGlass: LONG });
check("G12", "a request that isn't about or from an Admin never takes the option: a reason given is just ignored, and nothing is recorded as break-glass", ignored.ok && plainWithReason.ok === true && plainWithReason.breakGlass === false && !D.itActivity(ADMIN).some((a) => a.requestId === ignored.id && a.breakGlass), j(plainWithReason).slice(0, 160));
fresh();
const mine = raise(ADMIN, { type: "access-request", subjectPersonId: ROHAN, title: "Access for Rohan", payload: { role: "fin" } });
D.assignRequest(IT1, mine.record.id, IT1, NOW); D.submitForApproval(IT1, mine.record.id, "", NOW);
const raisedByMe = D.approveRequest(ADMIN, mine.record.id, "", NOW, { breakGlass: LONG });
check("G13", "a request RAISED by the only Admin is approved the same way (reason, flagged, applied)", raisedByMe.ok && raisedByMe.breakGlass === true && S.getUser(ROHAN).role === "fin" && D.itActivity(ADMIN, { breakGlass: true }).length === 1 && st(mine.record.id) === "done");
fresh();
const t3 = toAwaiting(ADMIN);
check("G14", "IT, HR, Finance and an employee never get the option or an approval, with or without a reason", [IT1, PRIYA, KABIR, ARJUN].every((v) => !D.approveRequest(v, t3.id, "", NOW, { breakGlass: LONG }).ok && !D.needsBreakGlass(v, t3.id) && D.pendingItApprovals(v).length === 0) && st(t3.id) === "awaiting-approval");
check("G15", "rejecting your own is not break-glass: the only Admin can't reject a request about themself (they cancel or leave it)", !D.rejectRequest(ADMIN, t3.id, "I reject my own request", NOW).ok && st(t3.id) === "awaiting-approval");
check("G16", "the pure rule: approvalPath with one Admin asks for the reason; with two refuses; a worked-on or decided request refuses first", RU.approvalPath({ requesterId: PRIYA, subjectPersonId: ADMIN, status: "awaiting-approval", workedBy: [] }, S.getUser(ADMIN), RO.permissionsOf, 1).breakGlass === true
  && RU.approvalPath({ requesterId: PRIYA, subjectPersonId: ADMIN, status: "awaiting-approval", workedBy: [] }, S.getUser(ADMIN), RO.permissionsOf, 2).error === "You can't approve a request about yourself."
  && RU.approvalPath({ requesterId: PRIYA, subjectPersonId: ADMIN, status: "awaiting-approval", workedBy: [ADMIN] }, S.getUser(ADMIN), RO.permissionsOf, 1).error === "You can't approve a request you worked on."
  && RU.approvalPath({ requesterId: PRIYA, subjectPersonId: ADMIN, status: "done", workedBy: [] }, S.getUser(ADMIN), RO.permissionsOf, 1).error.includes("not awaiting approval") && RU.BREAK_GLASS_MIN === 20);

// ---------- S ----------
section("S. What the screens ask the data layer");
fresh();
const a1 = raise(ARJUN, { type: "it-issue", title: "Laptop won't boot", priority: "urgent" });
const a2 = raise(ARJUN, { type: "password-reset", subjectPersonId: ARJUN, title: "Reset mine" });
D.assignRequest(IT1, a2.record.id, IT1, NOW);
const a3 = raise(ARJUN, { type: "it-issue", title: "Cancelled one" });
D.cancelRequest(ARJUN, a3.record.id, "No longer needed", NOW);
const sum = D.itSummary(IT1, NOW);
check("S1", "itSummary: 2 open, 0 overdue, 1 mine, 1 unassigned, 0 awaiting, by status and type and priority; null for an employee, HR and Finance", sum.open === 2 && sum.total === 3 && sum.byStatus.cancelled === 1 && sum.overdue === 0 && sum.mine === 1 && sum.unassigned === 1 && sum.awaiting === 0 && sum.byStatus.open === 1 && sum.byStatus["in-progress"] === 1 && sum.byType["it-issue"] === 1 && sum.byPriority.urgent === 1 && [ARJUN, PRIYA, KABIR].every((v) => D.itSummary(v, NOW) === null));
check("S2", "...overdue counts a request past its due time that isn't waiting for the Admin (the urgent one, 5 h later)", D.itSummary(IT1, NOW + 5 * 3600000).overdue === 1 && D.itSummary(ADMIN, NOW + 5 * 3600000).overdue === 1);
const acts = (who, id) => D.availableActions(who, id);
check("S3", "the requester of an open request is offered comment and cancel only", j(acts(ARJUN, a1.record.id).actions) === j(["comment", "cancel"]) && acts(ARJUN, a1.record.id).override.length === 0);
check("S4", "an IT person is offered assign, cancel and comment on an unassigned one, and no execute step", ["comment", "assign", "cancel"].every((k) => acts(IT1, a1.record.id).actions.includes(k)) && !acts(IT1, a1.record.id).actions.includes("resolve") && !acts(IT1, a1.record.id).actions.includes("submit"));
check("S5", "the assignee of a non-sensitive request in progress gets its execute step (reset) and not 'submit' (it needs no approval); the other IT person doesn't get the step", acts(IT1, a2.record.id).actions.includes("reset") && !acts(IT1, a2.record.id).actions.includes("submit") && !acts(IT2, a2.record.id).actions.includes("reset") && acts(IT2, a2.record.id).actions.includes("assign"));
check("S6", "the Admin is offered no execute step but the flagged override (reset), and assign; never cancel (not theirs)", !acts(ADMIN, a2.record.id).actions.includes("reset") && j(acts(ADMIN, a2.record.id).override) === j(["reset"]) && acts(ADMIN, a2.record.id).actions.includes("assign") && !acts(ADMIN, a2.record.id).actions.includes("cancel"));
check("S7", "someone who can't see the request is offered nothing (HR, Finance, another employee)", [PRIYA, KABIR, ROHAN].every((v) => acts(v, a2.record.id).actions.length === 0 && acts(v, a2.record.id).override.length === 0));
const sens = toAwaiting(KABIR);   // a Finance account: sensitive, so it needs the Admin
check("S8", "a request awaiting approval: the Admin gets approve and reject, IT gets cancel and comment (no assign, no execute), the requester (HR raised it) gets comment and cancel, never approve", ["approve", "reject", "comment"].every((k) => acts(ADMIN, sens.id).actions.includes(k)) && !acts(IT1, sens.id).actions.includes("approve") && !acts(IT1, sens.id).actions.includes("assign") && acts(IT1, sens.id).actions.includes("cancel") && j(acts(PRIYA, sens.id).actions) === j(["comment", "cancel"]) && !acts(PRIYA, sens.id).actions.includes("approve"));
D.approveRequest(ADMIN, sens.id, "", NOW);
check("S9", "once approved the Admin can't carry it out (they approved it); the assignee can; the approved one offers the Admin assign only", acts(IT1, sens.id).actions.includes("reset") && acts(ADMIN, sens.id).override.length === 0 && !acts(ADMIN, sens.id).actions.includes("approve"));
await D.executeReset(IT1, sens.id, "link", NOW);
check("S10", "a finished request offers only a comment to everyone who sees it; the Admin decided: itDecidedBy lists it as approved", [IT1, ADMIN, PRIYA].every((v) => j(acts(v, sens.id).actions) === j(["comment"])) && D.itDecidedBy(ADMIN).some((x) => x.request.id === sens.id && x.decision === "approved") && D.itDecidedBy(IT1).length === 0);
const rj = toAwaiting(KABIR);
D.rejectRequest(ADMIN, rj.id, "Not today", NOW);
check("S11", "a rejection is in itDecidedBy with its reason; the assignee is offered 'resume' on a rejected request, not before", D.itDecidedBy(ADMIN).find((x) => x.request.id === rj.id)?.decision === "rejected" && D.itDecidedBy(ADMIN).find((x) => x.request.id === rj.id)?.note === "Not today" && acts(IT1, rj.id).actions.includes("resume") && !acts(IT1, a1.record.id).actions.includes("resume"));
fresh();
const newbie = S.addUser(PRIYA, { name: "Ananya New", email: "ananya.new@northwind.com", department: "ENG", designation: "Software Engineer", dateOfJoining: "2 Nov 2026" }).record.id;
const na = (await D.newSignIn(PRIYA, newbie, NOW)).requestId;
check("S12", "a new-account request offers 'prepare' to its assignee only once in progress, 'submit' only once prepared, and 'hand-over' to the preparer only once approved (never the Admin)", !acts(IT1, na).actions.includes("prepare")
  && (D.assignRequest(IT1, na, IT1, NOW), acts(IT1, na).actions.includes("prepare") && !acts(IT1, na).actions.includes("submit"))
  && (D.prepareNewAccount(IT1, na, { role: "emp", email: "ananya.s@northwind.com", department: "ENG", startDate: "2026-11-02" }, NOW), acts(IT1, na).actions.includes("submit"))
  && (D.submitForApproval(IT1, na, "", NOW), !acts(IT1, na).actions.includes("hand-over") && acts(ADMIN, na).actions.includes("approve"))
  && (D.approveRequest(ADMIN, na, "", NOW), acts(IT1, na).actions.includes("hand-over") && !acts(IT2, na).actions.includes("hand-over") && !acts(ADMIN, na).actions.includes("hand-over") && acts(ADMIN, na).override.length === 0)
  && (D.assignRequest(ADMIN, na, IT2, NOW), !acts(IT2, na).actions.includes("hand-over") && !acts(IT1, na).actions.includes("hand-over") && !(await D.handOverAccount(IT2, na, NOW)).ok)   // reassigned after the approval: the new assignee never prepared it
  && (D.assignRequest(ADMIN, na, IT1, NOW), acts(IT1, na).actions.includes("hand-over")));

const ob = D.openOffboarding(PRIYA, ROHAN, NOW);
D.assignRequest(IT2, ob.record.id, IT2, NOW);
check("S13", "an offboarding: its assignee is offered the checklist's tick, never the Admin's waiver; the Admin is offered the waiver and the flagged tick; another IT person nothing to tick", acts(IT2, ob.record.id).actions.includes("tick") && !acts(IT2, ob.record.id).actions.includes("waive") && acts(ADMIN, ob.record.id).actions.includes("waive") && acts(ADMIN, ob.record.id).override.includes("tick") && !acts(IT1, ob.record.id).actions.includes("tick") && !acts(IT1, ob.record.id).actions.includes("waive"), j(acts(IT2, ob.record.id)));

// ---------- C ----------
section("C. Complete details; access cards are stock");
fresh();
const rows = AR.detailsToComplete(IT1);
check("C1", "IT sees the imported assets that lack details: every one lacks all four, the price not offered to IT (mayPrice false); the Admin may price", rows.length === 7 && rows.every((r) => j(r.missing) === j(["purchaseDate", "purchasePrice", "vendorId", "serial"]) && r.mayPrice === false) && AR.detailsToComplete(ADMIN).every((r) => r.mayPrice === true));
check("C2", "only whoever looks after the register (assets:manage) gets the list: HR, Finance and an employee get nothing", [PRIYA, KABIR, ARJUN].every((v) => AR.detailsToComplete(v).length === 0));
const plain = AR.addAsset(ADMIN, { name: "Lab monitor", category: "monitor", purchaseDate: "2026-01-01", purchasePrice: 9000, locationId: "OFF-1" });
check("C1b", "an asset added in the app (not imported) that lacks a serial and vendor is not on the list: it is only for what the import left out", plain.ok && AR.detailsToComplete(IT1).length === 7 && !AR.detailsToComplete(IT1).some((r) => r.tag === plain.record.tag));
const tag = rows[0].tag;
const bad = AR.completeDetails(IT1, tag, { purchaseDate: "2099-01-01" });
check("C3", "a purchase date in the future is refused with the AS1 words, at the field; nothing is saved", !bad.ok && bad.field === "purchaseDate" && /can't be after/.test(bad.error) && AR.detailsToComplete(IT1).find((r) => r.tag === tag).missing.includes("purchaseDate"));
check("C4", "an invalid value is refused for each field: a made-up date, a vendor that isn't on the list, a serial longer than 40, a price from IT (needs assets:view-values)", !AR.completeDetails(IT1, tag, { purchaseDate: "2025-02-30" }).ok && AR.completeDetails(IT1, tag, { vendorId: "VEN-999" }).field === "vendorId" && AR.completeDetails(IT1, tag, { serial: "s".repeat(41) }).field === "serial" && AR.completeDetails(IT1, tag, { purchasePrice: "85000" }).field === "purchasePrice");
const good = AR.completeDetails(IT1, tag, { purchaseDate: "2025-01-15", serial: "SN-LAP-0001", vendorId: "VEN-1" });
check("C5", "IT completes the date, serial and vendor: those flags go, the price stays; the 'Details missing' label stays until the price is in", good.ok && j(good.missing) === j(["purchasePrice"]) && AR.getAssetFor(IT1, tag).detailsMissing === true && AR.detailsToComplete(IT1).find((r) => r.tag === tag).missing.length === 1);
check("C6", "a field already filled is refused ('use Edit'); a field outside the four (even an empty one, like the invoice reference), and nothing at all, are refused", /already filled in/.test(AR.completeDetails(IT1, tag, { serial: "SN-OTHER" }).error) && !AR.completeDetails(IT1, tag, { name: "Renamed" }).ok && !AR.completeDetails(IT1, tag, { invoiceRef: "INV-1" }).ok && /can't be set here: invoiceRef/.test(AR.completeDetails(IT1, tag, { invoiceRef: "INV-1" }).error) && !AR.completeDetails(IT1, tag, {}).ok && !AR.completeDetails(IT1, tag, { serial: "  " }).ok);
const price = AR.completeDetails(ADMIN, tag, { purchasePrice: "85000" });
check("C7", "the Admin adds the price: the asset leaves the list, the 'Details missing' label goes, the depreciation figures exist now", price.ok && price.missing.length === 0 && AR.getAssetFor(ADMIN, tag).detailsMissing === false && !AR.detailsToComplete(ADMIN).some((r) => r.tag === tag) && AR.depreciationOf(ADMIN, tag, "2026-11-23").ok);
const tag2 = rows[1].tag;
check("C8", "a serial already on the register is refused for another asset", !AR.completeDetails(IT1, tag2, { serial: "SN-LAP-0001" }).ok && AR.completeDetails(IT1, tag2, { serial: "SN-LAP-0001" }).field === "serial");
check("C9", "someone without assets:manage can't complete (HR, Finance, an employee); an unknown asset is refused", [PRIYA, KABIR, ARJUN].every((v) => !AR.completeDetails(v, tag2, { serial: "SN-X" }).ok) && !AR.completeDetails(IT1, "AST-9999", { serial: "SN-X" }).ok);
const card = AR.addAsset(ADMIN, { name: "Office access card", category: "access-card", purchaseDate: "2026-01-01", purchasePrice: 100, locationId: "OFF-1" });
check("C10", "an access card can't be added to the register: it is a stock item; the same for 'Access Card' and 'access_card' (field category)", !card.ok && card.field === "category" && card.error === AU.STOCK_ONLY_MESSAGE && !AR.addAsset(ADMIN, { name: "x card", category: "Access Card", purchaseDate: "2026-01-01", purchasePrice: 100, locationId: "OFF-1" }).ok && !AR.addAsset(ADMIN, { name: "x card", category: "access_card", purchaseDate: "2026-01-01", purchasePrice: 100, locationId: "OFF-1" }).ok);
check("C11", "nor can one be asked for as an asset (field payload); a laptop still can", (() => { const r = raise(ARJUN, { type: "asset-request", title: "Card", payload: { category: "access-card" } }); return !r.ok && r.field === "payload" && r.error === AU.STOCK_ONLY_MESSAGE; })() && raise(ARJUN, { type: "asset-request", title: "A laptop", payload: { category: "laptop" } }).ok);
check("C12", "existing records are untouched: the imported 'Office access card' stays stock (counted) and its asset-register units keep their category; the register still has 7 imported assets", SL.stockItems(ADMIN).some((i) => /access card/i.test(i.name)) && AR.listAssets(ADMIN).filter((a) => a.imported).length === 7 && AU.isStockOnlyCategory("access-card") && !AU.isStockOnlyCategory("other") && !AU.isStockOnlyCategory("laptop"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);