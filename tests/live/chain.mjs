// usage: node chain.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 8C: leave requests and attendance corrections go through a real two-step chain (data/approval-chain.js):
// the requester's manager by relationship, then HR or an Admin; strict, with HR / Admin deciding the manager stage
// only when the manager can't. ./js is the build, ./js-pre8C 8B's committed result (the contrast). Clock fixed at
// Tue 6 Oct 2026 10:00 local unless a check moves it.
//   A  leave: who holds which stage; the manager first; HR refused at the manager stage; the manager refused at HR
//   B  no manager on file: straight to HR
//   C  the fallback: a manager made inactive -> HR / Admin decide the manager stage; reactivated -> the manager again
//   D  the double approval (Aarav for Priya and Kabir): the known limitation, documented
//   E  no self-approval at either stage; an Admin's own request auto-approved at both
//   F  corrections: the same chain; the record changes only at the final approval
//   G  the seeded history shows both steps; pending seeds sit at the right stage
//   H  pages: inbox (manager and HR), leave-approvals, regularization, apply-leave, my-leave, my-attendance,
//      approval-workflows, user-profile, my-profile, the sidebar count
//   I  source: what changed; expenses and asset requests untouched
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const RealDate = Date;
let NOW = 0;
const setNow = (iso, h = 10, mi = 0) => { const [y, m, d] = iso.split("-").map(Number); NOW = new RealDate(y, m - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
const mem = new Map();
const shim = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = shim;
const TODAY = "2026-10-06";
const fresh = () => { mem.clear(); globalThis.localStorage = shim; setNow(TODAY); };
fresh();

const L = await import("./js/data/leave-store.js");
const A = await import("./js/data/attendance-store.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const C = await import("./js/data/approval-chain.js");
const L0 = await import("./js-pre8C/data/leave-store.js");

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const ids = (list) => list.map((r) => r.id).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
const res = (x) => (x.ok ? `${x.record.status}/${x.record.stage}` : `refused: ${x.error}`);
const steps = (r) => r.history.map((h) => `${h.stage}:${h.decision}:${h.byUserId ?? "-"}`);
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029", ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";

// =====================================================================
section("A. Leave: the manager first, then HR or an Admin");
check("A1", "who's waiting on whom (seed): Sneha has her reports' LV-2189 and LV-2201; Priya the HR-stage LV-2202 and LV-2208; Aarav those two plus LV-2211 as Priya's manager",
  j(ids(L.pendingFor(SNEHA, "emp"))) === j(["LV-2189", "LV-2201"]) && j(ids(L.pendingFor(PRIYA, "hr"))) === j(["LV-2202", "LV-2208"])
  && j(ids(L.pendingFor(AARAV, "admin"))) === j(["LV-2202", "LV-2208", "LV-2211"]) && L.pendingFor(ARJUN, "emp").length === 0 && L.pendingFor(KABIR, "fin").length === 0,
  j([ids(L.pendingFor(SNEHA, "emp")), ids(L.pendingFor(PRIYA, "hr")), ids(L.pendingFor(AARAV, "admin"))]));
check("A1b", "a list asked for under a role that isn't the person's own is empty (Sneha as hr, Priya as admin), for leave and corrections",
  L.pendingFor(SNEHA, "hr").length === 0 && L.pendingFor(PRIYA, "admin").length === 0 && A.pendingRegularizations(PRIYA, "admin").length === 0);
check("A2", "contrast, HEAD: Sneha had nothing; Priya had every pending request but her own", L0.pendingFor(SNEHA, "emp").length === 0 && L0.pendingFor(PRIYA, "hr").length === 4);
const early = L.decideLeave("LV-2189", PRIYA, "hr", "approve");
check("A3", "HR can't decide at the manager stage while the manager can (strict)", !early.ok && early.error === "Only Sneha Rao, the requester's manager, can decide this request now.", res(early));
const adminEarly = L.decideLeave("LV-2189", AARAV, "admin", "approve");
check("A4", "...nor can an Admin", !adminEarly.ok, res(adminEarly));
const finTry = L.decideLeave("LV-2189", KABIR, "fin", "approve"), empTry = L.decideLeave("LV-2189", ARJUN, "emp", "approve");
check("A5", "someone else's employee or Finance can't either", !finTry.ok && !empTry.ok);
const spoof = L.decideLeave("LV-2189", SNEHA, "hr", "approve");
check("A6", "a role that isn't the decider's own is refused (Sneha claiming hr)", !spoof.ok && spoof.error === "You can't decide leave requests.");
const m1 = L.decideLeave("LV-2189", SNEHA, "emp", "approve");
check("A7", "Sneha approves her report's request: it moves to HR, still pending", m1.ok && m1.record.status === "pending" && m1.record.stage === "hr"
  && j(steps(m1.record).slice(-1)) === j([`manager:approved:${SNEHA}`]), res(m1));
check("A8", "...it's now Priya's and Aarav's, not Sneha's; its approver reads 'HR'",
  ids(L.pendingFor(PRIYA, "hr")).includes("LV-2189") && ids(L.pendingFor(AARAV, "admin")).includes("LV-2189") && !ids(L.pendingFor(SNEHA, "emp")).includes("LV-2189") && L.currentApproverName(L.getRequest("LV-2189")) === "HR");
const again = L.decideLeave("LV-2189", SNEHA, "emp", "approve");
check("A9", "the manager can't decide again at the HR stage", !again.ok && again.error === "Only HR or an Admin can decide this request at the HR stage.", res(again));
const fin = L.decideLeave("LV-2189", PRIYA, "hr", "approve");
check("A10", "Priya's approval is final: approved, done, history applied -> manager -> hr", fin.ok && fin.record.status === "approved" && fin.record.stage === "done"
  // Round 9Z (harness; was j(steps(fin.record)), which threw on a refused fin instead of printing a FAIL line)
  && j(steps(fin.record)) === j([`manager:applied:${ROHAN}`, `manager:approved:${SNEHA}`, `hr:approved:${PRIYA}`]), fin.ok ? j(steps(fin.record)) : res(fin));
const noNote = L.decideLeave("LV-2201", SNEHA, "emp", "reject");
const rej = L.decideLeave("LV-2201", SNEHA, "emp", "reject", "Release week");
check("A11", "the manager can reject (a note is needed); that ends it, HR never sees it", !noNote.ok && noNote.field === "note" && rej.ok && rej.record.status === "rejected" && rej.record.stage === "done"
  && !ids(L.pendingFor(PRIYA, "hr")).includes("LV-2201"), res(rej));
check("A12", "a decided request can't be decided again", /already rejected/.test(L.decideLeave("LV-2201", PRIYA, "hr", "approve").error));
const lv = L.applyLeave(ARJUN, { type: "casual", from: "2026-10-28", to: "2026-10-28", reason: "x" }).record;
L.decideLeave(lv.id, SNEHA, "emp", "approve");
const hrRej = L.decideLeave(lv.id, PRIYA, "hr", "reject", "No cover that day");
check("A13", "HR can reject after the manager approved", hrRej.ok && hrRej.record.status === "rejected" && j(steps(hrRej.record).slice(1)) === j([`manager:approved:${SNEHA}`, `hr:rejected:${PRIYA}`]));
const bal = L.balanceFor(ARJUN, 2026);
const lv2 = L.applyLeave(ARJUN, { type: "casual", from: "2026-10-29", to: "2026-10-29", reason: "x" }).record;
L.decideLeave(lv2.id, SNEHA, "emp", "approve");
const mid = L.balanceFor(ARJUN, 2026);
check("A14", "a manager's approval alone doesn't take the balance: it's still pending until HR approves", mid.casual.approved === bal.casual.approved && mid.casual.pending === bal.casual.pending + 1,
  j([bal.casual, mid.casual]));

// =====================================================================
section("B. No manager on file: straight to HR");
fresh();
const vik = L.applyLeave(VIKRAM, { type: "casual", from: "2026-10-27", to: "2026-10-27", reason: "x" }).record;
check("B1", "Vikram (no manager on file) starts at HR, managerId null; his approver reads 'HR'", vik.stage === "hr" && vik.managerId === null && L.currentApproverName(vik) === "HR");
check("B2", "Priya decides it in one step (final)", res(L.decideLeave(vik.id, PRIYA, "hr", "approve")) === "approved/done");
const snehaOwn = L.applyLeave(SNEHA, { type: "casual", from: "2026-10-27", to: "2026-10-27", reason: "x" }).record;
check("B3", "a manager with no manager of her own (Sneha) goes to HR too, never to herself", snehaOwn.stage === "hr" && !ids(L.pendingFor(SNEHA, "emp")).includes(snehaOwn.id));

// =====================================================================
section("C. The fallback: a manager who can no longer decide");
fresh();
S.deactivateUser(USER_ACTOR("admin", SNEHA), SNEHA, LEAVING_11Y());
check("C1", "Sneha made inactive while LV-2201 waits on her: its approver reads 'HR', and it appears in Priya's and Aarav's lists",
  L.currentApproverName(L.getRequest("LV-2201")) === "HR" && ids(L.pendingFor(PRIYA, "hr")).includes("LV-2201") && ids(L.pendingFor(AARAV, "admin")).includes("LV-2201"));
A.dayFor(ARJUN, TODAY);
const c7day = A.rangeFor(ARJUN, "2026-09-29", "2026-10-05").find((x) => x.minutesLate > 0 && !x.regularization);
const c7fix = A.requestRegularization(ARJUN, { date: c7day.date, issue: "late-arrival", time: "09:30", reason: "x" });   // sent while Sneha was inactive: no manager on file, so it starts at HR
const notHolder = L.decideLeave("LV-2201", KABIR, "fin", "approve");
const notHolderFix = A.decideRegularization("RG-102", ARJUN, "emp", "approve");
check("C7", "while the manager can't decide, anyone else is told so: 'Only HR or an Admin can decide this request now: its manager can no longer decide it.'; at the HR stage the refusal names the HR stage",
  notHolder.error === "Only HR or an Admin can decide this request now: its manager can no longer decide it." && notHolderFix.error === "Only HR or an Admin can decide this request at the HR stage."
  && c7fix.ok && c7fix.record.stage === "hr", j([notHolder.error, notHolderFix.error, c7fix.record?.stage]));
const fb = L.decideLeave("LV-2201", PRIYA, "hr", "approve");
check("C2", "Priya decides the manager stage instead; it moves to HR (the stage is recorded as the manager's)", fb.ok && fb.record.stage === "hr" && fb.record.history.at(-1).stage === "manager" && fb.record.history.at(-1).byUserId === PRIYA, res(fb));
// Round 10V (decision; was HR's approval, approved/done): LV-2201's 5 Oct is a stored sample day Arjun checked in on, so
// its final approval is refused now (workedday.mjs C2b); HR still finishes it, by rejecting
const c3 = L.decideLeave("LV-2201", AARAV, "admin", "approve");
check("C3", "...so it isn't stuck: HR then finishes it (Aarav): approving is refused (Arjun checked in on 5 Oct: round 10V), rejecting ends it",
  c3.error === "This request no longer matches the attendance record: Arjun Kapoor checked in on 2026-10-05, so leave can't cover that day."
  && res(L.decideLeave("LV-2201", AARAV, "admin", "reject", "He was in that day")) === "rejected/done", j(c3));
S.reactivateUser(USER_ACTOR("admin", SNEHA), SNEHA);
check("C4", "reactivated, Sneha holds her stage again and HR can't jump it (LV-2189)", L.currentApproverName(L.getRequest("LV-2189")) === "Sneha Rao" && !L.decideLeave("LV-2189", PRIYA, "hr", "approve").ok);
const chain = C.createChain("leave:approve");
const ghost = { userId: ROHAN, managerId: "EMP-9999", stage: "manager", status: "pending" };
check("C5", "a manager who no longer exists at all counts the same: HR / Admin hold the stage", !chain.managerCanDecide(ghost) && j(chain.holdersOf(ghost, "manager").sort()) === j([AARAV, PRIYA]));
// If nobody held the HR stage, the manager's approval would be final with "hr" passed over. Unreachable in this demo:
// the HR and Admin holders are protected sign-in identities (deactivateUser and updateUser both refuse to make them
// inactive), so this checks the helper's rule with a permission no role holds.
const noHr = C.createChain("no-such:permission");
const nx = noHr.nextStage({ userId: ROHAN, managerId: SNEHA, stage: "manager", status: "pending" }, "manager");
check("C6", "if nobody held the HR stage (a permission no role has: unreachable here, the HR and Admin identities can't be made inactive), the stage after the manager is passed over and recorded as 'skipped'",
  nx.stage === null && j(nx.skipped) === j(["hr"]) && j(C.skippedEntry("hr", "T")) === j({ stage: "hr", byUserId: null, decision: "skipped", at: "T", note: "Nobody else can decide the HR stage" })
  && j(C.createChain("leave:approve").nextStage({ userId: ROHAN, managerId: SNEHA }, "hr")) === j({ stage: null, skipped: [] }), j(nx));

// =====================================================================
section("D. The double approval: the known limitation, as on expense claims and asset requests");
fresh();
const d1 = L.decideLeave("LV-2211", AARAV, "admin", "approve");
const d2 = L.decideLeave("LV-2211", AARAV, "admin", "approve");
check("D1", "Priya's own LV-2211: Aarav approves as her manager, then again as the only other HR-stage holder (she can't decide her own)",
  // Round 9Z (harness; was j(steps(d2.record)), which threw on a refused d2 instead of printing a FAIL line)
  d1.ok && d1.record.stage === "hr" && d2.ok && d2.record.status === "approved" && j(steps(d2.record).slice(1)) === j([`manager:approved:${AARAV}`, `hr:approved:${AARAV}`]), d2.ok ? j(steps(d2.record)) : res(d2));
const kab = L.applyLeave(KABIR, { type: "casual", from: "2026-10-27", to: "2026-10-27", reason: "x" }).record;
L.decideLeave(kab.id, AARAV, "admin", "approve");
check("D2", "Kabir's: Aarav at the manager stage; then Priya or Aarav at HR (Aarav may decide both, the same limitation)",
  j(C.createChain("leave:approve").holdersOf(L.getRequest(kab.id), "hr").sort()) === j([AARAV, PRIYA]));

// =====================================================================
section("E. No self-approval; an Admin's own request");
fresh();
const allPending = L.allRequests().filter((r) => r.status === "pending");
check("E1", "on every pending request, its requester holds neither stage", allPending.every((r) => ["manager", "hr"].every((st) => !chain.holdersOf(r, st).includes(r.userId))));
check("E2", "Priya can't decide her own at any stage", L.decideLeave("LV-2211", PRIYA, "hr", "approve").error === "You can't decide your own leave request.");
const own = L.applyLeave(AARAV, { type: "casual", from: "2026-10-27", to: "2026-10-27", reason: "x" }).record;
check("E3", "Aarav's own leave: approved at once, auto-approved at both steps", own.status === "approved" && own.stage === "done"
  && j(steps(own).slice(1)) === j([`manager:auto-approved:${AARAV}`, `hr:auto-approved:${AARAV}`]), j(steps(own)));

// =====================================================================
section("F. Attendance corrections: the same chain");
fresh();
A.dayFor(ARJUN, TODAY);
const late = A.rangeFor(ARJUN, "2026-09-29", "2026-10-05").find((d) => d.minutesLate > 0 && !d.regularization);
const ask = A.requestRegularization(ARJUN, { date: late.date, issue: "late-arrival", time: "09:30", reason: "Client call" });
check("F1", "Arjun asks to correct his late day: it waits on Sneha (stage manager)", ask.ok && ask.record.stage === "manager" && ask.record.managerId === SNEHA && ids(A.pendingRegularizations(SNEHA, "emp")).includes(ask.record.id), res(ask));
check("F2", "HR can't decide it at the manager stage", !A.decideRegularization(ask.record.id, PRIYA, "hr", "approve").ok);
const before = A.dayFor(ARJUN, late.date).checkIn;
const fm = A.decideRegularization(ask.record.id, SNEHA, "emp", "approve");
check("F3", "Sneha approves: on to HR, and the attendance record is NOT changed yet", fm.ok && fm.record.stage === "hr" && A.dayFor(ARJUN, late.date).checkIn === before, `${res(fm)}; check-in ${A.dayFor(ARJUN, late.date).checkIn}`);
const ff = A.decideRegularization(ask.record.id, PRIYA, "hr", "approve");
check("F4", "Priya's final approval corrects the record (09:30, original kept, regularized)", ff.ok && ff.record.status === "approved" && A.dayFor(ARJUN, late.date).checkIn === "09:30"
  && A.dayFor(ARJUN, late.date).originalCheckIn === before && A.dayFor(ARJUN, late.date).regularized, res(ff));
check("F5", "corrections from people with no manager on file wait on HR (the three seeded ones)", j(ids(A.pendingRegularizations(PRIYA, "hr"))) === j(["RG-102", "RG-103", "RG-104"])
  && A.pendingRegularizations(SNEHA, "emp").length === 0);
fresh(); A.dayFor(ARJUN, TODAY);
const ask2 = A.requestRegularization(ARJUN, { date: late.date, issue: "late-arrival", time: "09:30", reason: "x" });
const mrej = A.decideRegularization(ask2.record.id, SNEHA, "emp", "reject", "I don't remember that call");
check("F6", "the manager can reject a correction (with a note); the record stays as it was", mrej.ok && mrej.record.status === "rejected" && A.dayFor(ARJUN, late.date).checkIn === before);
setNow(TODAY, 10, 30); A.checkIn(AARAV);   // Aarav checks in late today (10:30), then asks to correct it
const aOwn = A.requestRegularization(AARAV, { date: TODAY, issue: "late-arrival", time: "09:30", reason: "Stuck at the client" });
check("F7", "an Admin's own correction is approved at once: auto-approved at both steps, the record corrected",
  aOwn.ok && aOwn.record.status === "approved" && j(steps(aOwn.record).slice(1)) === j([`manager:auto-approved:${AARAV}`, `hr:auto-approved:${AARAV}`]) && A.dayFor(AARAV, TODAY).checkIn === "09:30", res(aOwn));
setNow(TODAY);

// =====================================================================
section("G. The seeded history shows both steps");
fresh();
const g = (id) => steps(L.getRequest(id));
check("G1", "LV-2124 / 2147 / 2160 (Arjun): applied, Sneha at the manager stage, then Priya at HR", ["LV-2124", "LV-2147", "LV-2160"].every((id) => j(g(id).slice(1)) === j([`manager:approved:${SNEHA}`, `hr:approved:${PRIYA}`])));
check("G2", "LV-2172 (Meera): Kabir, her manager, then Priya", j(g("LV-2172").slice(1)) === j([`manager:approved:${KABIR}`, `hr:approved:${PRIYA}`]));
check("G3", "LV-2101 (Arjun): rejected by Sneha at the manager stage (it never reached HR)", j(g("LV-2101").slice(1)) === j([`manager:rejected:${SNEHA}`]) && L.getRequest("LV-2101").history[1].note === "Project deadline");
const tsOk = L.allRequests().every((r) => r.history.every((h, i) => i === 0 || h.at >= r.history[i - 1].at));
check("G4", "every seeded history is in time order (the manager's step before HR's)", tsOk);
check("G5", "pending seeds sit at the right stage: LV-2189 / 2201 with Sneha, LV-2211 with Aarav, LV-2202 / 2208 at HR",
  ["LV-2189", "LV-2201"].every((id) => L.getRequest(id).stage === "manager" && L.getRequest(id).managerId === SNEHA) && L.getRequest("LV-2211").managerId === AARAV && ["LV-2202", "LV-2208"].every((id) => L.getRequest(id).stage === "hr"));
A.dayFor(ARJUN, TODAY);
const rg = (id) => steps(A.getRegularization(id));
check("G6", "RG-101 (Arjun, approved): Sneha then Priya; RG-105 (Rohan, rejected): Sneha approved, Priya rejected with the note",
  j(rg("RG-101").slice(1)) === j([`manager:approved:${SNEHA}`, `hr:approved:${PRIYA}`]) && j(rg("RG-105").slice(1)) === j([`manager:approved:${SNEHA}`, `hr:rejected:${PRIYA}`])
  && A.getRegularization("RG-105").history.at(-1).note === "Traffic delays aren't corrected; the late mark stays.", j([rg("RG-101"), rg("RG-105")]));
check("G7", "the seeded corrections' history is in time order", A.allRegularizations().every((r) => r.history.every((h, i) => i === 0 || h.at >= r.history[i - 1].at)));

// =====================================================================
section("H. Pages");
let loads = 0, w = null, d = null, jsErrors = [];
const WHO = { aarav: ["admin", "Aarav Mehta", AARAV], priya: ["hr", "Priya Nair", PRIYA], kabir: ["fin", "Kabir Shah", KABIR], arjun: ["emp", "Arjun Kapoor", ARJUN], sneha: ["emp", "Sneha Rao", SNEHA], vikram: ["emp", "Vikram Singh", VIKRAM] };
async function open(page, who, query = "") {
  const saved = [...mem.entries()];
  const html = read(page);
  const vc = new VirtualConsole(); jsErrors = [];
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) jsErrors.push(e.message); });
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document; w.confirm = () => true;
  saved.forEach(([k, v]) => w.localStorage.setItem(k, v));
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, Event: w.Event });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  for (const [, s] of html.matchAll(/<script type="module" src="\.\.\/\.\.\/assets\/js\/pages\/([\w-]+)\.js"><\/script>/g)) {
    try { await import(`./js/pages/${s}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
  }
}
const sync = () => { mem.clear(); for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); mem.set(k, w.localStorage.getItem(k)); } };
const txt = (n) => n?.textContent.replace(/\s+/g, " ").trim() ?? null;
const inboxRows = () => [...d.querySelectorAll("#inbox-table tbody tr")].filter((tr) => tr.dataset.type === "leave" || tr.dataset.type === "attendance")
  .map((tr) => ({ type: tr.dataset.type, title: txt(tr.querySelector(".table__user-name")), approve: [...tr.querySelectorAll("button")].find((b) => txt(b) === "Approve"), tr }));
fresh();
A.dayFor(ARJUN, TODAY);
const lateDay = A.rangeFor(ARJUN, "2026-09-29", "2026-10-05").find((x) => x.minutesLate > 0 && !x.regularization);
const arjunFix = A.requestRegularization(ARJUN, { date: lateDay.date, issue: "late-arrival", time: "09:30", reason: "Waiting on Sneha" });
await open("requests/approvals-inbox.html", "sneha");
const sRows = inboxRows();
check("H1", "inbox, Sneha (an Employee who manages): her reports' LV-2189 and LV-2201 are listed with Approve / Reject shown (no permission needed at her stage)",
  sRows.filter((r) => r.type === "leave").length === 2 && sRows.every((r) => r.approve && !r.approve.hidden) && sRows.some((r) => /Rohan Gupta/.test(r.title)) && sRows.some((r) => /Arjun Kapoor/.test(r.title)) && jsErrors.length === 0,
  j(sRows.map((r) => [r.type, r.title, r.approve?.hidden])));
check("H1b", "...and Arjun's correction, waiting on her too, with Approve shown", arjunFix.ok && sRows.some((r) => r.type === "attendance" && /Arjun Kapoor/.test(r.title) && r.approve && !r.approve.hidden), j(sRows.map((r) => r.type)));
const navCount = () => txt([...d.querySelectorAll(".sidebar__nav a")].find((a) => /Approvals/.test(a.textContent))?.querySelector(".nav__count"));
const expectedCount = (await import("./js/ui/waiting.js")).waitingCount(SNEHA, "emp");
check("H2", "her sidebar's Approvals count includes them (waiting.js, the same rows)", navCount() === String(expectedCount) && expectedCount >= 2, `${navCount()} / ${expectedCount}`);
sRows.find((r) => /Rohan Gupta/.test(r.title)).approve.click();
sync();
check("H3", "Sneha approves Rohan's from the inbox: it moves to HR, and leaves her Pending list", L.getRequest("LV-2189").stage === "hr" && !inboxRows().some((r) => /Rohan Gupta/.test(r.title)));
const toastText = txt([...d.querySelectorAll(".toast .toast__text")].at(-1));
check("H3b", "...with a toast that says where it goes next: 'Approved. It now goes to HR or an Admin.'", toastText === "Approved. It now goes to HR or an Admin.", toastText);
const who = [...d.querySelectorAll("#who-approves .kv__row")].map((r) => `${txt(r.querySelector("dt"))}=${txt(r.querySelector("dd"))}`);
check("H4", "'Who approves what' names leave and corrections: 'Manager, then HR or an Admin'",
  who.includes("Leave requests=Manager, then HR or an Admin") && who.includes("Attendance corrections=Manager, then HR or an Admin") && /^Expense claims=/.test(who[0]), j(who));
await open("requests/approvals-inbox.html", "priya");
const pRows = inboxRows().filter((r) => r.type === "leave").map((r) => r.title);
check("H5", "inbox, Priya: the HR-stage leave only (Rohan's, just approved by Sneha; LV-2202; LV-2208), not Arjun's still with Sneha",
  pRows.some((t) => /Rohan Gupta/.test(t)) && !pRows.some((t) => /Arjun Kapoor/.test(t)) && pRows.length === 3, j(pRows));
await open("leave/leave-approvals.html", "priya");
const laRows = [...d.querySelectorAll("table tbody tr")].map((tr) => txt(tr.querySelector(".table__user-name")));
const laActs = [...d.querySelectorAll("table tbody tr")].map((tr) => `${txt(tr.querySelector(".table__user-name"))}=${txt(tr.querySelector(".table__actions"))}`);
check("H6", "leave-approvals, Priya, Pending: every pending request but her own (HR's oversight list); Approve / Reject only on the 3 at the HR stage, Arjun's still with Sneha says 'Waiting for Sneha Rao'",
  laRows.length === 4 && laActs.includes("Arjun Kapoor=Waiting for Sneha Rao") && laActs.filter((t) => /=Rejects*Approve$/.test(t)).length === 3 && jsErrors.length === 0, j(laActs));
const how = txt([...d.querySelectorAll(".card")].find((c) => /How approval works/.test(c.textContent)));
check("H7", "'How approval works': the manager approves first (skipped / HR fallback), then HR or an Admin; no 'any step'",
  /Approves first; skipped when there's no manager on file, and decided by HR or an Admin if the manager can't/.test(how) && /HR or an Admins*Final approval/.test(how) && !/any step/.test(how), how);
await open("attendance/regularization.html", "priya");
const policy = [...d.querySelectorAll(".card")].find((c) => /Policy/.test(txt(c.querySelector(".card__title")) ?? ""));
const pol = [...policy.querySelectorAll(".kv__row")].map((r) => `${txt(r.querySelector("dt"))}=${txt(r.querySelector("dd"))}`);
await open("attendance/regularization.html", "priya");   // Arjun's correction from H1b is still with Sneha
const regAct = [...d.querySelectorAll("table tbody tr")].find((tr) => /Arjun Kapoor/.test(txt(tr.querySelector(".table__user-name")) ?? ""));
check("H8b", "regularization, Priya: Arjun's new correction (still with Sneha) is listed with 'Waiting for Sneha Rao' and no buttons; the HR-stage ones have them",
  arjunFix.ok && txt(regAct?.querySelector(".table__actions")) === "Waiting for Sneha Rao" && !regAct.querySelector("button")
  && [...d.querySelectorAll("table tbody tr")].filter((tr) => tr !== regAct).every((tr) => tr.querySelectorAll("button").length === 2), txt(regAct?.querySelector(".table__actions")));
check("H8", "regularization Policy: 'Reporting manager approves'; final step HR or an Admin, the record corrected then; no 'shown as a step only' / 'any step'",
  pol.includes("First step=Reporting manager approves; skipped with no manager on file") && pol.includes("Final step=HR or an Admin; the record is corrected then") && !/step only|any step/.test(txt(policy)), j(pol));
for (const [who2, expected] of [["arjun", "Sneha Rao approves your request first, then HR or an Admin."], ["vikram", "Your request goes to HR or an Admin."], ["aarav", "As an Admin, your leave is approved as soon as you send it."]]) {
  await open("leave/apply-leave.html", who2);
  check(`H9${who2[0]}`, `apply-leave, ${who2}: '${expected}'`, txt(d.querySelector(".page-header__subtitle")) === expected, txt(d.querySelector(".page-header__subtitle")));
}
await open("leave/apply-leave.html", "arjun");
const chainSteps = [...d.querySelectorAll(".stepper__step")].map((li) => `${txt(li.querySelector("strong"))}|${txt(li.querySelector("small"))}`);
check("H10", "apply-leave's chain card for Arjun: you -> Sneha Rao (first approval) -> HR or an Admin (final)", chainSteps.some((s) => /^First approval\|Sneha Rao/.test(s)) && chainSteps.includes("Final approval|HR or an Admin"), j(chainSteps));
await open("leave/my-leave.html", "arjun");
const pend = [...d.querySelectorAll(".stepper__step")].map((li) => `${txt(li.querySelector("strong"))}|${txt(li.querySelector("small"))}`);
check("H11", "my-leave, Arjun's pending request: first approval waiting for Sneha Rao, final approval HR or an Admin", pend.includes("First approval|Waiting for Sneha Rao") && pend.includes("Final approval|HR or an Admin"), j(pend));
await open("attendance/my-attendance.html", "arjun");
d.getElementById("request-btn")?.click();
check("H12", "my-attendance's correction modal: 'Sneha Rao first, then HR or an Admin'; its intro says the manager approves first",
  d.getElementById("reg-manager").value === "Sneha Rao first, then HR or an Admin" && /Your manager approves first, then HR or an Admin/.test(txt(d.querySelector("#regularize-modal .modal__desc")) ?? txt(d.querySelector(".modal__desc"))), d.getElementById("reg-manager").value);
const profileChain = async (id) => { await open("users/user-profile.html", "priya", `?id=${id}`); return txt([...d.querySelectorAll(".kv__row")].find((r) => txt(r.querySelector("dt")) === "Approval chain")?.querySelector("dd")); };
const chains = { [ARJUN]: await profileChain(ARJUN), [VIKRAM]: await profileChain(VIKRAM), [MEERA]: await profileChain(MEERA), [AARAV]: await profileChain(AARAV) };
check("H13", "user-profile's Approval chain is each person's real one (was 'Sneha Rao, then HR' on every profile)",
  chains[ARJUN] === "Sneha Rao, then HR or an Admin" && chains[VIKRAM] === "HR or an Admin" && chains[MEERA] === "Kabir Shah, then HR or an Admin" && chains[AARAV] === "Approved automatically (Admin)", j(chains));
await open("account/my-profile.html", "kabir");
const myChain = txt([...d.querySelectorAll(".kv__row")].find((r) => txt(r.querySelector("dt")) === "Leave approved by")?.querySelector("dd"));
check("H14", "my-profile 'Leave approved by' (Kabir): 'Aarav Mehta, then HR or an Admin' (the stored text said only 'Aarav Mehta')", myChain === "Aarav Mehta, then HR or an Admin", myChain);
await open("access/approval-workflows.html", "aarav");
const cond = (name) => txt([...d.querySelectorAll("main tbody tr")].find((tr) => txt(tr.querySelector(".table__user-name")) === name)?.querySelector("td:nth-child(3)"));
check("H15", "approval-workflows: Leave and Attendance regularization keep Employee -> Manager -> HR, Active, and say no manager on file goes straight to HR",
  cond("Leave") === "All leave types. No manager on file: straight to HR" && cond("Attendance regularization") === "Sent within 7 days. No manager on file: straight to HR", j([cond("Leave"), cond("Attendance regularization")]));

fresh();
S.updateUser(USER_ACTOR("admin", ROHAN), ROHAN, { reportingManager: "Kabir Shah" }); S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { reportingManager: "Kabir Shah" });
(await import("./js/data/expenses-store.js")).allExpenses(); (await import("./js/data/asset-requests-store.js")).allAssetRequests();
for (const key of ["expense-claims", "asset-requests"]) { const box = JSON.parse(localStorage.getItem(`officeos:${key}`)); box.records = []; localStorage.setItem(`officeos:${key}`, JSON.stringify(box)); }
await open("requests/approvals-inbox.html", "sneha");
const statV = (label) => txt([...d.querySelectorAll(".stat-strip .stat")].find((x) => txt(x.querySelector(".stat__label")) === label)?.querySelector(".stat__value"));
check("H16", "Sneha after her reports moved to Kabir, with no claims or asset requests at all: LV-2189 / LV-2201 keep her as their manager, so they still wait on her, and her stats count them (not '—')",
  statV("Waiting for you") === "2" && statV("Average response") !== "—" && inboxRows().filter((r) => r.type === "leave").length === 2, j([statV("Waiting for you"), statV("Average response")]));

// =====================================================================
section("I. Source");
const walk = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith(".js")).map((f) => f.replaceAll("\\", "/"));
// Round 8D (layout): 8C's own change set, read from its frozen result (js-pre8D = HEAD a824947); ./js now holds 8D's payroll changes
const changedJs = walk(path.join(HERE, "js-pre8D")).filter((f) => !fs.existsSync(path.join(HERE, "js-pre8C", f)) || fs.readFileSync(path.join(HERE, "js-pre8D", f), "utf8") !== fs.readFileSync(path.join(HERE, "js-pre8C", f), "utf8")).sort();
check("I1", "js: the new data/approval-chain.js plus the 12 edited files; nothing else",
  j(changedJs) === j(["data/approval-chain.js", "data/attendance-store.js", "data/leave-store.js", "pages/apply-leave.js", "pages/approvals-inbox.js", "pages/leave-approvals.js", "pages/my-attendance.js", "pages/my-profile.js", "pages/regularization.js", "pages/user-profile.js", "ui/leave-decision.js", "ui/leave-view.js", "ui/waiting.js"]), j(changedJs));
check("I2", "expense claims and asset requests are untouched (their stores, expenses.js, their views)",
  ["data/expenses-store.js", "data/expenses.js", "data/asset-requests-store.js", "ui/expense-view.js", "ui/asset-request-view.js"].every((f) => !changedJs.includes(f)));
const LS = fs.readFileSync(path.join(HERE, "js", "data", "leave-store.js"), "utf8");
check("I3", "leave-store no longer decides by role alone (no canDecide), and uses the shared chain", !/canDecide/.test(LS) && /createChain\("leave:approve"\)/.test(LS));
check("I4", "payroll's code is untouched (absence pay is the next round)", ["data/payroll-store.js", "data/payroll.js"].every((f) => !changedJs.includes(f)));

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
