// usage: node decision.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Cleanup Round A: the shared decision helpers (ui/leave-decision.js: correctionFlow, approveCorrection,
// openRejectCorrectionModal, decisionButtons; ui/leave-view.js: nameOf, oldestPendingNote), checked
// against the code they replace. ./js is the new code, ./js-old the code before this round (pristine).
//   A  the helpers on their own, against verbatim copies of the old inline versions
//   B  the two flows: modal/note ids, modal markup, confirm text and toasts, new vs old
//   C  the four pages, old vs new, whole document + storage after the same clicks, for five sign-ins
//   D  source layout: no page keeps its own copy
// The clock is local wall time, Wed 30 Sep 2026 11:00, set before each fresh seed.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const PAGES = {
  leave: ["leave/leave-approvals.html", "leave-approvals"],
  reg: ["attendance/regularization.html", "regularization"],
  inbox: ["requests/approvals-inbox.html", "approvals-inbox"],
  hr: ["dashboard/hr.html", "hr-dashboard"],
};

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 9, 30, 11, 0);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const WHO = {
  priya: ["hr", "Priya Nair", "EMP-1003"], aarav: ["admin", "Aarav Mehta", "EMP-1001"], kabir: ["fin", "Kabir Shah", "EMP-1008"],
  arjun: ["emp", "Arjun Kapoor", "EMP-1105"], old: ["hr", "Priya Nair", undefined],
};

let loads = 0, w = null, d = null;
const jsErrors = [];
let confirms = [], confirmAnswer = true;
// A fresh document (a page, or a blank one) with fresh storage; the clock reset first so seeds match.
function fresh(html = "<!doctype html><html><body></body></html>", url = "http://localhost/office-os/pages/x.html", tag = "blank") {
  setNow(2026, 9, 30, 11, 0);
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) jsErrors.push(`${tag}: ${e.message}`); });
  const dom = new JSDOM(html, { url, virtualConsole: vc });
  w = dom.window; d = w.document;
  w.localStorage.clear();
  confirms = [];
  w.confirm = (m) => { confirms.push(m); return confirmAnswer; };
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, Event: w.Event });
}
async function openPage(dir, page, who) {
  const [path, script] = PAGES[page];
  fresh(read(path), `http://localhost/office-os/pages/${path}`, `${dir}/${page}/${who}`);
  loads++;
  (await import(`./${dir}/core/auth.js`)).signIn(...WHO[who]);
  await import(`./${dir}/app.js?load=${loads}`);
  try { await import(`./${dir}/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`${dir}/${page} import: ${e.message}`); }
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const toasts = () => [...d.querySelectorAll(".toast .toast__text")].map((t) => t.innerHTML.trim());
const storage = () => j(Object.keys(w.localStorage).sort().map((k) => [k, w.localStorage.getItem(k)]));

// New and old module trees. Both read and write the same localStorage and document globals.
fresh();
const V = await import("./js/ui/leave-view.js");
const D = await import("./js/ui/leave-decision.js");
const S = await import("./js/data/store.js");
const H = await import("./js/data/holidays.js");
const A = await import("./js/data/attendance-store.js");
const L = await import("./js/data/leave-store.js");
const OD = await import("./js-old/ui/leave-decision.js");
const OV = await import("./js-old/ui/leave-view.js");
const OA = await import("./js-old/data/attendance-store.js");

// ---------- the old inline versions, verbatim from the pages before this round ----------
// every page: const nameOf = (id) => getUser(id)?.name ?? id;
const oldNameOf = (id) => S.getUser(id)?.name ?? id;
// leave-approvals.js renderStats()
function oldLeaveApprovalsNote(pending, today) {
  const oldest = pending.length ? Math.max(...pending.map((r) => H.dayNumber(today) - H.dayNumber(r.appliedOn))) : null;
  let oldestNote = "";
  if (oldest !== null) oldestNote = oldest <= 0 ? "Oldest was sent today" : `Oldest is ${oldest} ${oldest === 1 ? "day" : "days"} old`;
  return oldestNote;
}
// hr-dashboard.js renderStats()
function oldHrNote(pending, today) {
  const oldest = pending.length ? Math.max(...pending.map((r) => H.dayNumber(today) - H.dayNumber(r.appliedOn))) : null;
  let note = "Nothing waiting";
  if (oldest !== null) note = oldest <= 0 ? "Oldest was sent today" : `Oldest is ${oldest} ${oldest === 1 ? "day" : "days"} old`;
  return note;
}
// hr-dashboard.js decisionButtons(); leave-approvals.js, regularization.js and approvals-inbox.js built the same
// nodes inline in row() / leaveRow() / correctionRow(), with the permission and callbacks written in.
function oldButtons(permission, onReject, onApprove) {
  const el = OV.el;
  const group = el("div", "btn-group");
  const reject = el("button", "btn btn--sm", "Reject");
  reject.type = "button";
  reject.dataset.permission = permission;
  reject.addEventListener("click", onReject);
  const approve = el("button", "btn btn--primary btn--sm", "Approve");
  approve.type = "button";
  approve.dataset.permission = permission;
  approve.addEventListener("click", onApprove);
  group.append(reject, approve);
  return group;
}
// regularization.js (approvals-inbox.js and hr-dashboard.js had the same, through issueLabel(r))
const ISSUE_LABEL = { "late-arrival": "Late arrival", "missed-check-in": "Missed check-in", "missed-check-out": "Missed check-out" };
const oldCorrectionConfig = () => ({
  decide: OA.decideRegularization,
  describe: (r) => `${oldNameOf(r.userId)}: ${ISSUE_LABEL[r.issue] ?? r.issue}, ${OV.formatDay(r.date)}, corrected to ${r.time}`,
  modalId: "reject-correction-modal",
  noteId: "reject-correction-note",
  labels: {
    title: "Reject correction request",
    approved: "Correction approved. The attendance record is updated.",
    rejected: "Correction request rejected.",
    approveFailed: "Couldn't approve the request. It may already have been decided, or the attendance record has changed.",
    rejectFailed: "Couldn't reject the request. It may already have been decided.",
  },
});

// =====================================================================
section("A. Helpers on their own");
const ids = [...S.getAllUsers().map((u) => u.id), "EMP-9999", "", undefined, null];
check("A1", `nameOf matches the old inline nameOf for all ${ids.length} ids (every user, an unknown id, "", undefined, null)`,
  ids.every((id) => V.nameOf(id) === oldNameOf(id)), j(ids.filter((id) => V.nameOf(id) !== oldNameOf(id))));
check("A2", "nameOf: a known id gives the name, an unknown one gives the id back", V.nameOf("EMP-1003") === "Priya Nair" && V.nameOf("EMP-9999") === "EMP-9999");

const at = (today, ...ago) => ago.map((n, i) => ({ id: `X-${i}`, appliedOn: H.isoFromDayNumber(H.dayNumber(today) - n) }));
const CASES = [
  ["2026-09-30"], ["2026-09-30", 0], ["2026-09-30", 1], ["2026-09-30", 2], ["2026-09-30", 0, 5, 3], ["2026-09-30", -1],
  ["2026-09-30", -2, 0], ["2026-09-30", 1, 1], ["2026-09-30", 400], ["2026-01-01", 1], ["2026-03-01", 1, 29], ["2028-03-01", 1],
];
const notes = CASES.map(([today, ...ago]) => ({ today, ago, list: at(today, ...ago) }));
check("A3", `oldestPendingNote == leave-approvals' old note in ${CASES.length} cases (empty, today, 1/2/400 days, future, month/year/leap edges)`,
  notes.every(({ list, today }) => V.oldestPendingNote(list, today) === oldLeaveApprovalsNote(list, today)),
  j(notes.filter(({ list, today }) => V.oldestPendingNote(list, today) !== oldLeaveApprovalsNote(list, today)).map((n) => n.ago)));
check("A4", "oldestPendingNote(..) || \"Nothing waiting\" (the HR dashboard's call) == its old note in the same cases",
  notes.every(({ list, today }) => (V.oldestPendingNote(list, today) || "Nothing waiting") === oldHrNote(list, today)));
const T = "2026-09-30";
const wording = [V.oldestPendingNote([], T), ...[[0], [1], [2], [-1], [0, 5, 3]].map((ago) => V.oldestPendingNote(at(T, ...ago), T))];
check("A5", "the wording itself: empty, 0 days, 1 day, 2 days, future, oldest of three", j(wording)
  === j(["", "Oldest was sent today", "Oldest is 1 day old", "Oldest is 2 days old", "Oldest was sent today", "Oldest is 5 days old"]), j(wording));

fresh();
for (const perm of ["leave:approve", "attendance:approve"]) {
  const calls = [];
  const made = D.decisionButtons(perm, () => calls.push("reject"), () => calls.push("approve"));
  const old = oldButtons(perm, () => {}, () => {});
  check(perm === "leave:approve" ? "A6" : "A7", `decisionButtons("${perm}") markup == the old hand-built pair`, made.outerHTML === old.outerHTML, made.outerHTML);
  d.body.append(made);
  made.querySelector(".btn--primary").click();
  made.querySelector("button:not(.btn--primary)").click();
  check(perm === "leave:approve" ? "A8" : "A9", `decisionButtons("${perm}"): Approve calls onApprove, Reject calls onReject, once each`, j(calls) === '["approve","reject"]', j(calls));
}
check("A10", "the markup shape: div.btn-group > Reject (btn btn--sm) + Approve (btn btn--primary btn--sm), type=button, data-permission on both",
  d.body.firstElementChild.outerHTML === '<div class="btn-group"><button class="btn btn--sm" type="button" data-permission="leave:approve">Reject</button><button class="btn btn--primary btn--sm" type="button" data-permission="leave:approve">Approve</button></div>');

// =====================================================================
section("B. The two flows, new vs old");
check("B1", "exports: approveLeave, openRejectModal, createDecisionFlow unchanged; correctionFlow + approveCorrection + openRejectCorrectionModal + decisionButtons added",
  ["approveLeave", "openRejectModal", "createDecisionFlow", "correctionFlow", "approveCorrection", "openRejectCorrectionModal", "decisionButtons"].every((k) => k in D)
    && j(Object.keys(OD).sort()) === j(["approveLeave", "createDecisionFlow", "openRejectModal"]));
check("B2", "correctionFlow is the approveCorrection / openRejectCorrectionModal pair", D.correctionFlow.approve === D.approveCorrection && D.correctionFlow.openReject === D.openRejectCorrectionModal);

const pendingFix = () => A.pendingRegularizations("EMP-1003", "hr")[0];
const pendingLeave = () => L.pendingFor("EMP-1003", "hr")[0];
// Round 13L (layout; was signIn() alone): js-old (before 11P) reads the role off the session, so the session is stored
// as sessions were saved before 13L (roleKey added), for both sides; the build ignores it (sessrole.mjs O1 / O2).
const signIn = async () => {
  (await import("./js/core/auth.js")).signIn(...WHO.priya);
  const s = JSON.parse(w.localStorage.getItem("officeos:session"));
  w.localStorage.setItem("officeos:session", JSON.stringify({ roleKey: WHO.priya[0], ...s }));
};

// Opens the reject modal with one flow; returns the modal's markup and the ids around it.
async function modalWith(openReject, getRequest, modalId, noteId) {
  fresh();
  await signIn();
  openReject(getRequest(), () => {});
  const m = d.getElementById(modalId);
  return { html: m?.outerHTML, title: txt(m?.querySelector(".modal__title")), titleId: m?.querySelector(".modal__title")?.id, note: !!d.getElementById(noteId), desc: txt(m?.querySelector(".modal__desc")), open: m?.classList.contains("is-open"), count: d.querySelectorAll(".modal").length };
}
const oldFix = OD.createDecisionFlow(oldCorrectionConfig());
const newCM = await modalWith(D.openRejectCorrectionModal, pendingFix, "reject-correction-modal", "reject-correction-note");
const oldCM = await modalWith(oldFix.openReject, pendingFix, "reject-correction-modal", "reject-correction-note");
check("B3", "correction modal: id reject-correction-modal, note id reject-correction-note, title id, title text, open",
  newCM.note && newCM.open && newCM.count === 1 && newCM.titleId === "reject-correction-modal-title" && newCM.title === "Reject correction request", j(newCM));
check("B4", "correction modal markup == the one the pages built themselves (same request)", newCM.html === oldCM.html && !!newCM.html, `${newCM.desc}`);
check("B5", "correction modal description", newCM.desc === oldCM.desc && /^[A-Z][a-z]+ [A-Z][a-z]+: (Late arrival|Missed check-in|Missed check-out), \d+ [A-Z][a-z]{2}, corrected to \d\d:\d\d$/.test(newCM.desc), newCM.desc);

const newLM = await modalWith(D.openRejectModal, pendingLeave, "reject-leave-modal", "reject-note");
const oldLM = await modalWith(OD.openRejectModal, pendingLeave, "reject-leave-modal", "reject-note");
check("B6", "leave modal: still reject-leave-modal / reject-note / \"Reject leave request\", markup == old",
  newLM.note && newLM.open && newLM.title === "Reject leave request" && newLM.titleId === "reject-leave-modal-title" && newLM.html === oldLM.html, newLM.desc);

// Approve (confirm OK), approve again (already decided), reject an already-decided one: confirm text, toasts, storage.
async function decideWith(flow, getRequest) {
  fresh();
  await signIn();
  const r = getRequest();
  flow.approve(r, () => {});
  flow.approve(r, () => {});
  flow.openReject(r, () => {});
  d.querySelector(".modal.is-open textarea").value = "late";
  d.querySelector(".modal.is-open form").dispatchEvent(new w.Event("submit", { cancelable: true }));
  return { confirms: j(confirms), toasts: j(toasts()), storage: storage() };
}
const newFD = await decideWith(D.correctionFlow, pendingFix);
const oldFD = await decideWith(oldFix, pendingFix);
check("B7", "correction approve: confirm text and toasts == old (approved, approve failed, reject failed), same store writes",
  newFD.confirms === oldFD.confirms && newFD.toasts === oldFD.toasts && newFD.storage === oldFD.storage, newFD.toasts);
check("B8", "correction toasts are the fixed strings",
  newFD.toasts === j(["Correction approved. The attendance record is updated.", "Couldn't approve the request. It may already have been decided, or the attendance record has changed.", "Couldn't reject the request. It may already have been decided."]));
const newLD = await decideWith({ approve: D.approveLeave, openReject: D.openRejectModal }, pendingLeave);
const oldLD = await decideWith({ approve: OD.approveLeave, openReject: OD.openRejectModal }, pendingLeave);
// Round 11X (behaviour; was storage == old): leave's final approval checks the balance (round-11n-notes.md N11),
// counting the request's days against the holiday calendar, and reading it seeds officeos:holidays when nothing has
// yet. This fixture never read it before, so that key is new; every other key is written exactly as before.
const noHolidays = (s) => j(JSON.parse(s).filter(([k]) => k !== "officeos:holidays"));
check("B9", "leave approve/reject: confirm text, toasts and store writes == old (round 11X: and the holiday calendar, seeded when the balance check first reads it)",
  newLD.confirms === oldLD.confirms && newLD.toasts === oldLD.toasts && noHolidays(newLD.storage) === noHolidays(oldLD.storage)
  && JSON.parse(newLD.storage).some(([k]) => k === "officeos:holidays") && !JSON.parse(oldLD.storage).some(([k]) => k === "officeos:holidays"), newLD.confirms);

// =====================================================================
section("C. The four pages, old code vs new code");
// Load, then for each kind: Reject (modal) -> submit empty -> submit a note; Approve (confirm OK). A snapshot
// of the whole document, the confirm texts and localStorage after every step.
async function script(dir, page, who) {
  const snaps = [];
  const snap = (what) => snaps.push({ what, html: d.documentElement.outerHTML, confirms: j(confirms), storage: storage() });
  await openPage(dir, page, who);
  snap("load");
  for (const perm of ["leave:approve", "attendance:approve"]) {
    const btn = (label) => [...d.querySelectorAll(`main button[data-permission="${perm}"]`)].find((b) => txt(b) === label && !b.closest("[data-static]"));
    const reject = btn("Reject");
    if (reject) {
      reject.click(); snap(`${perm} reject clicked`);
      // A static placeholder button (the script left the page alone) opens nothing.
      const form = d.querySelector(".modal.is-open form");
      if (form) {
      form.dispatchEvent(new w.Event("submit", { cancelable: true })); snap(`${perm} reject empty`);
      form.querySelector("textarea").value = "Not this week";
      form.dispatchEvent(new w.Event("submit", { cancelable: true })); snap(`${perm} rejected`);
      }
    }
    const approve = btn("Approve");
    if (approve) { approve.click(); snap(`${perm} approved`); }
  }
  return snaps;
}
let n = 0;
// The page comparison runs on Round A's committed result (js-postA, frozen at 3403ed9), so later rounds' intended
// page changes (e.g. Round 4G's sidebar headcount on every page) don't count against it.
for (const page of Object.keys(PAGES)) {
  for (const who of Object.keys(WHO)) {
    const neu = await script("js-postA", page, who);
    const old = await script("js-old", page, who);
    const differ = neu.map((s, i) => (old[i] && s.what === old[i].what && s.html === old[i].html && s.confirms === old[i].confirms && s.storage === old[i].storage ? null : s.what)).filter(Boolean);
    const buttons = (neu[0].html.match(/data-permission="(leave|attendance):approve"/g) ?? []).length;
    check(`C${++n}`, `${PAGES[page][0]} as ${who}: ${neu.length} steps [${neu.map((s) => s.what.replace(":approve", "")).join(", ")}] identical (${buttons} decision buttons at load)`,
      neu.length === old.length && differ.length === 0, differ.length ? `differs at ${j(differ)}` : "");
  }
}
const hrSteps = (await script("js-postA", "hr", "aarav")).map((s) => s.what);
check("C21", "the comparison saw real work: on the HR dashboard as Aarav both kinds were rejected and approved (Priya has one leave request, so no leave Approve is left after the Reject)",
  ["leave:approve rejected", "leave:approve approved", "attendance:approve rejected", "attendance:approve approved"].every((s) => hrSteps.includes(s)), j(hrSteps));

// =====================================================================
section("D. Source layout");
const PAGE_SRC = Object.values(PAGES).map(([, s]) => [s, src("js", `pages/${s}.js`)]);
const code = (s) => s.split(/\r?\n/).filter((l) => !l.trim().startsWith("//")).join("\n");
check("D1", "no page declares its own nameOf", PAGE_SRC.every(([, s]) => !/const nameOf\s*=/.test(s)));
check("D2", "no page builds a decision flow or buttons by hand (createDecisionFlow, decideRegularization, \"btn-group\")",
  PAGE_SRC.every(([, s]) => !/createDecisionFlow|decideRegularization|"btn-group"|function decisionButtons/.test(code(s))), PAGE_SRC.filter(([, s]) => /createDecisionFlow|decideRegularization|"btn-group"|function decisionButtons/.test(code(s))).map(([p]) => p).join());
check("D3", "the \"Oldest is\" wording lives only in ui/leave-view.js", PAGE_SRC.every(([, s]) => !/Oldest (is|was)/.test(s)) && (src("js", "ui/leave-view.js").match(/Oldest (is|was)/g) ?? []).length === 2);
check("D4", "all four pages import nameOf from ui/leave-view.js and decisionButtons from ui/leave-decision.js",
  PAGE_SRC.every(([, s]) => /import \{[^}]*\bnameOf\b[^}]*\} from "\.\.\/ui\/leave-view\.js"/.test(s) && /import \{[^}]*\bdecisionButtons\b[^}]*\} from "\.\.\/ui\/leave-decision\.js"/.test(s)));
check("D5", "the correction modal ids and labels appear once, in ui/leave-decision.js",
  (src("js", "ui/leave-decision.js").match(/"reject-correction-modal"/g) ?? []).length === 1 && PAGE_SRC.every(([, s]) => !/reject-correction|Correction approved/.test(s)));
check("D6", "no innerHTML / outerHTML / insertAdjacentHTML / document.write in the two shared modules (comments aside)",
  ["ui/leave-view.js", "ui/leave-decision.js"].every((p) => !/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(code(src("js", p)))));

check("Z1", "no JS errors in the whole run", jsErrors.length === 0, jsErrors.join(" | "));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
