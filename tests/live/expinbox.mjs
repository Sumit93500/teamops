// usage: node expinbox.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 5E: expense claims in requests/approvals-inbox.html, the manager stage made decidable, the inbox made
// personal (route null). Fixed clock: Wed 30 Sep 2026 11:00 local. ./js-pre5E and ./html-pre5E are the code and
// pages before this round (Round 5C's result).
//   A  who reaches the inbox: route, nav item and badge, per person (decision: personal inbox)
//   B  Sneha Rao (Team Lead, role Employee): her manager-stage claim, her own decisions, no samples, no leave
//   C  Sneha decides: approve (stage-aware toast), reject (note required), and where the claim goes next
//   D  per-stage gating: Finance / Admin / manager rows go only to whoever holds that stage
//   E  the double approval kept (decision 3): the Admin-stage row says the Admin already approved as manager
//   F  the inbox and finance/expenses.html agree (decision 5): same claims, same words, same decide
//   G  Approved / Rejected list only the viewer's own decisions (decision: decided rows)
//   H  stats, "Recently decided", "Who approves what", the Expense type filter
//   I  store helpers: managesAnyone, expenseDecisionsBy
//   J  old sessions;  K  approvals-inbox.html vs the page before;  L  source layout
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const INBOX = "requests/approvals-inbox.html", EXPENSES = "finance/expenses.html", DASH = "dashboard/employee.html";
const SCRIPT = { [INBOX]: "approvals-inbox", [EXPENSES]: "expenses", [DASH]: "employee-dashboard" };

const RealDate = Date;
const NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029",
  ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const WHO = {
  aarav: ["admin", "Aarav Mehta", AARAV], kabir: ["fin", "Kabir Shah", KABIR], priya: ["hr", "Priya Nair", PRIYA],
  sneha: ["emp", "Sneha Rao", SNEHA], arjun: ["emp", "Arjun Kapoor", ARJUN], rohan: ["emp", "Rohan Gupta", ROHAN],
  oldEmp: ["emp", "Arjun Kapoor", undefined], oldHr: ["hr", "Priya Nair", undefined],
};

let loads = 0, w = null, d = null, saved = {};
let jsErrors = [], navigations = [], htmlWrites = [], confirms = [], confirmAnswer = true;
async function open(page, who) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = []; navigations = []; htmlWrites = []; confirms = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else jsErrors.push(e.message); });
  const dom = new JSDOM(read(page), { url: `http://localhost/office-os/pages/${page}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  // 6E: this suite is about expense claims. Arjun's seeded laptop request (ARQ-1) also waits on Sneha and would change
  // its story (her counts, "nothing waits on her"), so asset requests start empty here; assetreq H1 / H13 / H14 test both.
  if (!("officeos:asset-requests" in saved)) w.localStorage.setItem("officeos:asset-requests", JSON.stringify({ version: 1, nextNum: 3, records: [] }));
  const proto = w.Element.prototype;
  const inner = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", { get: inner.get, set(v) { htmlWrites.push(String(v)); inner.set.call(this, v); }, configurable: true });
  w.confirm = (m) => { confirms.push(m); return confirmAnswer; };
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  const auth = await import("./js/core/auth.js");
  if (!who) auth.signOut(); else auth.signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${SCRIPT[page]}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;

const E = await import("./js/data/expenses-store.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const { ROUTES } = await import("./js/config/routes.js");
const { NAV } = await import("./js/config/nav.js");

// ---- independent arithmetic and formatting (not the app's code) ----
const DAY = 24 * 60 * 60 * 1000;
const days = (from, to) => (RealDate.parse(to) - RealDate.parse(from)) / DAY;
const NOW_ISO = new RealDate(NOW).toISOString();
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

// ---- readers ----
const $ = (id) => d.getElementById(id);
const cellText = (td) => { const out = [], tw = d.createTreeWalker(td, w.NodeFilter.SHOW_TEXT); for (let n = tw.nextNode(); n; n = tw.nextNode()) { const t = n.textContent.replace(/\s+/g, " ").trim(); if (t) out.push(t); } return out.join(" "); };
const inboxEls = () => [...d.querySelectorAll("#inbox-table tbody tr")];
const inbox = () => inboxEls().map((tr) => [...tr.children].map(cellText));
const expenseEls = () => inboxEls().filter((tr) => tr.dataset.type === "expense");
const expenseIds = () => expenseEls().map((tr) => tr.dataset.claimId);
const rowOf = (id) => inboxEls().find((tr) => tr.dataset.claimId === id);
const buttonsOf = (tr) => [...(tr?.querySelectorAll("button") ?? [])].filter((b) => !b.hidden);
const button = (id, label) => buttonsOf(rowOf(id)).find((b) => b.textContent.trim() === label);
const detailsOf = (id) => txt(rowOf(id)?.children[3]);
const tab = (label) => [...d.querySelectorAll(".table__toolbar .tabs__tab")].find((p) => txt(p).startsWith(label)).click();
const pills = () => [...d.querySelectorAll(".table__toolbar .tabs__tab")].map((p) => `${txt(p.childNodes[0])}=${txt(p.querySelector(".badge"))}`).join(" ");
const stat = (label) => txt([...d.querySelectorAll(".stat")].find((s) => txt(s.querySelector(".stat__label")) === label)?.querySelector(".stat__value"));
const stats = () => ["Waiting for you", "Approved this week", "Rejected this week", "Average response"].map((l) => `${l}=${stat(l)}`).join(" | ");
const decided = () => [...d.querySelectorAll("#decided-table tbody tr")].map((tr) => [...tr.children].map(cellText));
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => ({ type: t.className.replace("toast toast--", ""), text: txt(t.querySelector(".toast__text")) }));
const clearToasts = () => d.querySelectorAll(".toast").forEach((t) => t.remove());
const modal = () => $("reject-expense-modal");
const rejectWith = (note) => { $("reject-expense-note").value = note; modal().querySelector('button[type="submit"]').click(); };
const navItem = (label) => [...d.querySelectorAll(".sidebar__nav .nav__item")].find((a) => txt(a).replace(/\d+$/, "") === label);
const typeFilter = (v) => { const s = d.querySelector('.table__toolbar select[aria-label="Filter by type"]'); s.value = v; s.dispatchEvent(new w.Event("change", { bubbles: true })); };
const status = (id) => E.getExpense(id)?.status;
const stageOf = (id) => E.getExpense(id)?.stage;
const decide = (id, who, decision, note) => E.decideExpense(id, who, S.getUser(who).role, decision, note);
const submit = (who, f = {}) => E.submitExpense(who, { category: "travel", amount: 1500, date: "2026-09-28", reason: "Cab", receipt: "r.pdf", ...f });

// =====================================================================
section("A. Who reaches the inbox (personal inbox: route null, nav for approvers and managers)");
check("A1", "routes.js: the inbox needs no permission (null), like payslips.html; every other route unchanged from the code before",
  ROUTES[INBOX] === null && (() => { const pre = src("js-pre5E", "config/routes.js"); return src("js-pre5D", "config/routes.js").replace('  "requests/approvals-inbox.html": null,   // a personal inbox: it shows only what waits for you (approvals-inbox.js)\r\n', '  "requests/approvals-inbox.html": "approvals:view",\r\n') === pre; })());
const approvalsNav = NAV.flatMap((g) => g.items).find((i) => i.href === INBOX);
check("A2", "nav.js: the Approvals item keeps approvals:view, is also shown to managers, and (since 5F) counts what waits instead of a fixed badge", approvalsNav.permission === "approvals:view" && approvalsNav.countWaiting === true && !("badge" in approvalsNav) && approvalsNav.alsoForManagers === true);
const NAVSEEN = {};
for (const who of ["aarav", "kabir", "priya", "sneha", "arjun", "rohan"]) {
  fresh();
  await open(INBOX, who);
  NAVSEEN[who] = navItem("Approvals") ? `Approvals${navItem("Approvals").querySelector(".nav__count") ? ` ${txt(navItem("Approvals").querySelector(".nav__count"))}` : ""}` : "(none)";
  check("A3", `${who}: the inbox opens (no redirect, no JS error); nav shows ${NAVSEEN[who]}`, navigations.length === 0 && jsErrors.length === 0, jsErrors.join(" / "));
}
check("A4", "nav: since 5F everyone who sees Approvals gets the live count of what waits for them (cleanup A3 ties it to the inbox rows): Aarav 7, Kabir 2, Priya 5, Sneha 3; Arjun and Rohan none (Round 8C: leave waits only on its stage's holder; was 9 / 2 / 7 / 1)",
  j(NAVSEEN) === j({ aarav: "Approvals 7", kabir: "Approvals 2", priya: "Approvals 5", sneha: "Approvals 3", arjun: "(none)", rohan: "(none)" }), j(NAVSEEN));
await open(DASH, "sneha");
check("A5", "Sneha's Approvals item is on every page (here her dashboard) and links to the inbox; since 5F with her count, 3 (Round 8C: + her reports' two leave requests; was 1)", navItem("Approvals")?.getAttribute("href")?.endsWith(INBOX) && txt(navItem("Approvals").querySelector(".nav__count")) === "3");
const navLabels = () => [...d.querySelectorAll(".sidebar__nav .nav__item")].map((a) => [...a.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(""));
const snehaNav = navLabels();
await open(DASH, "arjun");
const arjunNav = navLabels();
// Round Manager scoping part 2 (behaviour; was plus Approvals only: a manager also gets Team attendance and Team leave)
check("A8", "the manager rules add only Approvals, Team attendance and Team leave: Sneha's nav is Arjun's (both role Employee) plus those three", j(snehaNav.filter((l) => !["Approvals", "Team attendance", "Team leave"].includes(l))) === j(arjunNav) && ["Approvals", "Team attendance", "Team leave"].every((l) => snehaNav.includes(l) && !arjunNav.includes(l)), j(snehaNav));
await open(INBOX, null);
check("A6", "nobody signed in: still sent to sign in (the guard's sign-in check doesn't depend on the route)", navigations.length === 1);
fresh();
await open(INBOX, "arjun");
check("A7", "Arjun (no approvals:view, manages nobody): an empty personal inbox, no samples anywhere, stats '—'",
  j(inbox()) === j([["Nothing is waiting for you."]]) && !d.querySelector("tr[data-static]") && decided().length === 0
  && stats() === "Waiting for you=0 | Approved this week=— | Rejected this week=— | Average response=—", stats());

// =====================================================================
section("B. Sneha Rao (Team Lead, role Employee) on the seed");
fresh();
await open(INBOX, "sneha");
check("B1", "Pending: only Arjun's ₹1,850 claim at the manager stage, with Reject/Approve", j(expenseIds()) === j(["EXP-3106"]) && inbox().length === 3 && j(inbox().map((r) => r[1])) === j(["Leave", "Leave", "Expense"]) /* Round 8C: her reports' leave waits on her too */
  && j(inbox()[2]) === j(["AK Expense: Arjun Kapoor, ₹1,850", "Expense", "Arjun Kapoor", "Travel, manager stage", `${Math.floor(days("2026-09-25T09:30:00.000Z", NOW_ISO))} days`, "Reject Approve"]),
  j(inbox().map((r) => r.filter((_, i) => i !== 4))));   // the waiting time depends on the time zone, so it isn't printed
check("B2", "the manager-stage buttons carry no data-permission (Sneha holds no expense permission; pendingFor decided she may act)",
  buttonsOf(rowOf("EXP-3106")).length === 2 && buttonsOf(rowOf("EXP-3106")).every((b) => !("permission" in b.dataset)));
check("B3", "no sample rows in either table (they need approvals:view), no attendance rows (Round 8C: her reports' leave rows are there now)", !d.querySelector("tr[data-static]") && !inbox().some((r) => /Attendance|Access|Purchase|System/.test(r[1] ?? "")));
check("B4", "Waiting counts from when the claim reached the manager stage (sent 25 Sep 09:30 UTC)", inbox()[2][4] ===   /* Round 8C: the claim is the third row */ `${Math.floor(days("2026-09-25T09:30:00.000Z", NOW_ISO))} days`);
tab("Approved");
check("B5", "Approved: the three claims she approved, newest decision first, each saying it was her decision at the manager stage",
  j(expenseIds()) === j(["EXP-3103", "EXP-3102", "EXP-3101"]) && j(inbox().filter((r) => r[1] === "Expense").map((r) => [r[3], r[4], r[5]])) === j([["Travel, you approved it at the manager stage", "21 Sep", ""],   /* Round 8C: the expense rows (her leave / correction decisions are listed too) */ ["Meals, you approved it at the manager stage", "16 Sep", ""], ["Meals, you approved it at the manager stage", "3 Aug", ""]]),
  j(inbox().map((r) => r.slice(3))));
check("B6", "...including EXP-3101, which Finance later rejected: the tab is about her decision, not the claim's status", status("EXP-3101") === "rejected" && expenseIds().includes("EXP-3101"));
tab("Rejected");
check("B7", "Rejected: no expense claim of hers; only her rejection of LV-2101 at the manager stage (Round 8C seed; was none)", expenseIds().length === 0 && inbox().length === 1 && inbox()[0][1] === "Leave", j(inbox()));
check("B8", "tab counts: Pending 3, Approved 8, Rejected 1 (Round 8C: + 2 leave waiting; + her 3 leave and 2 correction approvals; + LV-2101; was 1 / 3 / 0)", pills() === "Pending=3 Approved=8 Rejected=1", pills());
const snehaClaimDays = [days("2026-09-18T09:30:00.000Z", "2026-09-21T10:00:00.000Z"), days("2026-09-15T09:30:00.000Z", "2026-09-16T10:00:00.000Z"), days("2026-08-02T09:30:00.000Z", "2026-08-03T10:00:00.000Z")];
// Round 8C: her leave and correction decisions, each from the request being sent to her own decision (as the page counts them)
const L8C = await import("./js/data/leave-store.js"), A8C = await import("./js/data/attendance-store.js");
const snehaOtherDays = () => [...L8C.allRequests(), ...A8C.allRegularizations()].map((r) => { const e = [...r.history].reverse().find((h) => h.byUserId === SNEHA && (h.decision === "approved" || h.decision === "rejected")); return e ? days(r.history[0].at, e.at) : null; }).filter((x) => x !== null);
const snehaAvg = avg([...snehaClaimDays, ...snehaOtherDays()]);
check("B9", "stats: 3 waiting; RG-101 approved this week (her seeded correction approval); average response = her decisions: claims from reaching her stage, leave and corrections from sending (Round 8C; was 1 / 0 / claims only)",
  stats() === `Waiting for you=3 | Approved this week=1 | Rejected this week=0 | Average response=${snehaAvg.toFixed(1)} days`, stats());

fresh();
await open(INBOX, "sneha");
const box = JSON.parse(w.localStorage.getItem("officeos:expense-claims"));
box.records = box.records.filter((c) => c.id === "EXP-3106");
w.localStorage.setItem("officeos:expense-claims", JSON.stringify(box));
await open(INBOX, "sneha");
check("B10", "with no decision of her own yet, Sneha still gets her manager-stage claim; stats count it, no average yet",
  E.expenseDecisionsBy(SNEHA).length === 0 && j(expenseIds()) === j(["EXP-3106"]) && stats() === `Waiting for you=3 | Approved this week=1 | Rejected this week=0 | Average response=${avg(snehaOtherDays()).toFixed(1)} days`, stats());   // Round 8C: her reports' leave waits too, and her seeded leave / correction decisions give an average (was 1 / 0 / —)
S.updateUser(USER_ACTOR("admin", ROHAN), ROHAN, { reportingManager: "Kabir Shah" }); S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { reportingManager: "Kabir Shah" });
await open(INBOX, "sneha");
check("B11", "her reports moved to Kabir: she manages nobody now, but Arjun's claim keeps her as its manager, so it stays in her inbox and nav",
  !E.managesAnyone(SNEHA) && E.getExpense("EXP-3106").managerId === SNEHA && j(expenseIds()) === j(["EXP-3106"]) && txt(navItem("Approvals")) === "Approvals3");   // since 5F with its count; Round 8C: LV-2189 / LV-2201 keep her as their manager too, as the claim does (was 1)
L8C.decideLeave("LV-2189", SNEHA, "emp", "approve"); L8C.decideLeave("LV-2201", SNEHA, "emp", "approve");   // Round 8C (setup): she decides those too, so that once the claim is decided nothing waits on her
button("EXP-3106", "Approve").click();
await open(INBOX, "sneha");
check("B12", "once decided, nothing waits on her and she has no reports: no nav item, but the inbox still lists her own decision",
  !navItem("Approvals") && j(inbox()) === j([["Nothing is waiting for you."]]) && (tab("Approved"), j(expenseIds()) === j(["EXP-3106"])));
S.resetDemoData();
fresh();
await open(INBOX, "sneha");

// =====================================================================
section("C. Sneha decides at the manager stage");
tab("Pending");
clearToasts(); confirmAnswer = false;
button("EXP-3106", "Approve").click();
check("C1", "Approve asks first (the shared confirm text); Cancel changes nothing", confirms[0] === "Approve this request?\nArjun Kapoor: Travel, ₹1,850, spent 24 Sep (EXP-3106)" && stageOf("EXP-3106") === "manager" && toasts().length === 0, j(confirms[0]));
confirmAnswer = true;
button("EXP-3106", "Approve").click();
const h3106 = E.getExpense("EXP-3106").history;
check("C2", "OK: 'Claim approved. It goes to Finance next.'; stored as Sneha's manager-stage approval, now at Finance",
  j(toasts()) === j([{ type: "success", text: "Claim approved. It goes to Finance next." }]) && stageOf("EXP-3106") === "finance"
  && h3106.at(-1).stage === "manager" && h3106.at(-1).byUserId === SNEHA && h3106.at(-1).decision === "approved", j(toasts()));
check("C3", "her inbox redraws: only her reports' two leave requests still waiting, the claim now first in Approved, stats follow (Round 8C; was nothing waiting, 0 / 4 / 0, 1 this week)", inbox().length === 2 && inbox().every((r) => r[1] === "Leave") && pills() === "Pending=2 Approved=9 Rejected=1"
  && stat("Approved this week") === "2" && (tab("Approved"), expenseIds()[0] === "EXP-3106" && detailsOf("EXP-3106") === "Travel, you approved it at the manager stage" && txt(rowOf("EXP-3106").children[4]) === "30 Sep"));
check("C4", "'Recently decided' shows it (decided in the last 7 days): her decision, today, then her seeded RG-101 approval (Round 8C)", j(decided()) === j([["Expense: Arjun Kapoor, ₹1,850", "Expense", "Arjun Kapoor", "Approved", "30 Sep"], ["Regularization: Arjun Kapoor, 28 Sep", "Attendance", "Arjun Kapoor", "Approved", "29 Sep"]]), j(decided()));
await open(INBOX, "kabir");
check("C5", "...and it reaches Kabir's inbox at the Finance stage, with buttons gated by expenses:approve", expenseIds().includes("EXP-3106") && detailsOf("EXP-3106") === "Travel, Finance stage"
  && buttonsOf(rowOf("EXP-3106")).every((b) => b.dataset.permission === "expenses:approve") && buttonsOf(rowOf("EXP-3106")).length === 2);
const rohanClaim = submit(ROHAN, { reason: "Parking at the client" }).record;
await open(INBOX, "sneha");
clearToasts();
button(rohanClaim.id, "Reject").click();
check("C6", "Reject opens the shared modal, the claim named in it", modal()?.classList.contains("is-open") && txt(modal().querySelector(".modal__title")) === "Reject expense claim"
  && txt(modal().querySelector(".modal__desc")) === `Rohan Gupta: Travel, ₹1,500, spent 28 Sep (${rohanClaim.id})`);
rejectWith("");
check("C7", "an empty note is refused inline; the claim stays at the manager stage", txt(modal().querySelector(".form-error")) === "Add a note saying why the claim is rejected." && stageOf(rohanClaim.id) === "manager" && toasts().length === 0);
rejectWith("Not a client visit");
tab("Rejected");
check("C8", "with a note: rejected by Sneha, 'Claim rejected.', listed in her Rejected tab", status(rohanClaim.id) === "rejected" && j(toasts()) === j([{ type: "success", text: "Claim rejected." }])
  && j(expenseIds()) === j([rohanClaim.id]) && detailsOf(rohanClaim.id) === "Travel, you rejected it at the manager stage");
await open(INBOX, "kabir");
check("C9", "a claim rejected at the manager stage never reaches Finance", !expenseIds().includes(rohanClaim.id) && (tab("Rejected"), !expenseIds().includes(rohanClaim.id)));
check("C10", "no claim data went through innerHTML on these loads", !htmlWrites.some((h) => /Arjun|Rohan|Parking|client/.test(h)), `${htmlWrites.length} writes`);

// =====================================================================
section("D. Each stage goes only to whoever holds it");
fresh();
const meeraClaim = submit(MEERA, { reason: "Courier to the auditor" }).record;      // Meera reports to Kabir
await open(INBOX, "kabir");
check("D1", "Kabir as Meera's manager: her claim at the manager stage, buttons without a permission gate, next to his Finance-stage rows",
  meeraClaim.managerId === KABIR && meeraClaim.stage === "manager" && detailsOf(meeraClaim.id) === "Travel, manager stage"
  && buttonsOf(rowOf(meeraClaim.id)).every((b) => !("permission" in b.dataset)) && j(expenseIds()) === j(["EXP-3105", "EXP-3104", meeraClaim.id]), j(expenseIds()));
check("D2", "Kabir: no Admin-stage claim (Rohan's ₹62,000 waits for Aarav), and none at Sneha's stage", !expenseIds().includes("EXP-3103") && !expenseIds().includes("EXP-3106"));
await open(INBOX, "aarav");
check("D3", "Aarav: only the Admin-stage claim; not the Finance-stage ones (no Admin override), not Meera's (not his report)", j(expenseIds()) === j(["EXP-3103"]), j(expenseIds()));
check("D7", "Aarav's Admin-stage claim waits from when it reached his stage (Kabir's approval, 23 Sep), not from when it was sent (18 Sep)",
  txt(rowOf("EXP-3103").children[4]) === `${Math.floor(days("2026-09-23T10:00:00.000Z", NOW_ISO))} days` && Math.floor(days("2026-09-23T10:00:00.000Z", NOW_ISO)) !== Math.floor(days("2026-09-18T09:30:00.000Z", NOW_ISO)));
await open(INBOX, "priya");
check("D4", "Priya (HR: approvals:view, no expenses:approve, manages nobody): no expense rows anywhere", !inboxEls().some((tr) => tr.dataset.type === "expense") && (tab("Approved"), !inboxEls().some((tr) => tr.dataset.type === "expense")));
check("D5", "every person's expense rows are exactly pendingFor() (the store decides, the page only draws)",
  await (async () => { for (const [who, id, role] of [["aarav", AARAV, "admin"], ["kabir", KABIR, "fin"], ["sneha", SNEHA, "emp"], ["priya", PRIYA, "hr"], ["arjun", ARJUN, "emp"]]) {
    await open(INBOX, who);
    if (j(expenseIds().sort()) !== j(E.pendingFor(id, role).map((c) => c.id).sort())) return false;
  } return true; })());
S.updateUser(USER_ACTOR("admin", SNEHA), SNEHA, { status: "inactive", dateOfLeaving: LEAVING_11Y() });
await open(INBOX, "rohan");
check("D6", "nobody else gains the manager stage when the manager is inactive (Rohan, Sneha's report, sees nothing)", expenseIds().length === 0);
S.resetDemoData();

// =====================================================================
section("E. The double approval, kept (Aarav is Kabir's manager and the only Admin)");
fresh();
const big = submit(KABIR, { amount: 60000, reason: "Audit trip, Mumbai" }).record;
await open(INBOX, "aarav");
check("E1", "Kabir's ₹60,000 claim starts at the manager stage with Aarav", big.stage === "manager" && detailsOf(big.id) === "Travel, manager stage");
clearToasts();
button(big.id, "Approve").click();
check("E2", "approved as manager: Finance is skipped (Kabir is the only Finance Manager), so it goes to an Admin next",
  j(toasts()) === j([{ type: "success", text: "Claim approved. It goes to an Admin next." }]) && stageOf(big.id) === "admin"
  && E.getExpense(big.id).history.some((h) => h.stage === "finance" && h.decision === "skipped"), j(toasts()));
check("E3", "...and comes straight back to Aarav at the Admin stage, saying he already approved it as manager (no silent skip)",
  expenseIds().includes(big.id) && detailsOf(big.id) === "Travel, Admin stage. You approved it at the manager stage on 30 Sep" && buttonsOf(rowOf(big.id)).length === 2, detailsOf(big.id));
clearToasts();
button(big.id, "Approve").click();
const hb = E.getExpense(big.id).history.filter((h) => h.decision === "approved");
check("E4", "approved again as Admin: ready to be paid; two approvals, both Aarav's (the documented limitation)",
  status(big.id) === "approved" && j(hb.map((h) => `${h.stage}:${h.byUserId}`)) === j([`manager:${AARAV}`, `admin:${AARAV}`]) && toasts()[0]?.text === "Claim approved. It's ready to be paid.");
tab("Approved");
check("E5", "Aarav's Approved tab lists it once, with his latest decision (Admin stage)", expenseIds().filter((id) => id === big.id).length === 1 && detailsOf(big.id) === "Travel, you approved it at the Admin stage");
await open(INBOX, "kabir");
check("E6", "Kabir doesn't see his own claim at any point", !expenseIds().includes(big.id));

// =====================================================================
section("F. The inbox and finance/expenses.html agree");
fresh();
const SAME = {};
for (const who of ["kabir", "aarav"]) {
  await open(EXPENSES, who);
  const pageIds = [...d.querySelectorAll("#expense-rows tr")].filter((tr) => [...tr.querySelectorAll("button")].some((b) => !b.hidden)).map((tr) => tr.dataset.claimId).sort();
  await open(INBOX, who);
  const inboxIds = expenseEls().filter((tr) => !["manager"].includes(stageOf(tr.dataset.claimId))).map((tr) => tr.dataset.claimId).sort();
  SAME[who] = [pageIds, inboxIds];
}
check("F1", "for Kabir and Aarav, the claims with buttons on expenses.html are exactly the inbox's Finance/Admin-stage rows",
  Object.values(SAME).every(([a, b]) => j(a) === j(b) && a.length > 0), j(SAME));
await open(EXPENSES, "kabir");
confirmAnswer = false;
[...d.querySelectorAll("#expense-rows tr")].find((tr) => tr.dataset.claimId === "EXP-3104").querySelector("button.btn--primary").click();
const pageConfirm = confirms[0];
await open(INBOX, "kabir");
button("EXP-3104", "Approve").click();
confirmAnswer = true;
check("F2", "the same claim is described in the same words from both pages (one describe, ui/expense-view.js)", pageConfirm === confirms[0] && pageConfirm === "Approve this request?\nAnanya Iyer: Travel, ₹8,400, spent 16 Sep (EXP-3104)", j([pageConfirm, confirms[0]]));
clearToasts();
button("EXP-3104", "Approve").click();
const inboxToast = toasts()[0]?.text;
await open(EXPENSES, "kabir");
check("F3", "approved from the inbox, it's approved on expenses.html too (one store, one decide)", status("EXP-3104") === "approved" && inboxToast === "Claim approved. It's ready to be paid."
  && ![...d.querySelectorAll("#expense-rows tr")].some((tr) => tr.dataset.claimId === "EXP-3104"));
clearToasts();
await open(INBOX, "kabir");
const stale = rowOf("EXP-3105");
decide("EXP-3105", KABIR, "approve");                         // decided on expenses.html in another tab
clearToasts();
buttonsOf(stale).find((b) => b.textContent.trim() === "Approve").click();
check("F4", "a row decided on the other page: the store's refusal, then the inbox redraws without it", j(toasts()) === j([{ type: "danger", text: "This claim is already approved." }]) && !expenseIds().includes("EXP-3105"), j(toasts()));
await open(EXPENSES, "aarav");
const pageBadge = txt([...d.querySelectorAll("#expense-rows tr")].find((tr) => tr.dataset.claimId === "EXP-3106")?.children[5]);
check("F5", "a manager-stage claim stays read-only on expenses.html ('Waiting for the manager') while the inbox decides it", pageBadge === "With manager"
  && txt([...d.querySelectorAll("#expense-rows tr")].find((tr) => tr.dataset.claimId === "EXP-3106")?.lastElementChild) === "Waiting for the manager, Sneha Rao");

// =====================================================================
section("G. Approved / Rejected: only the viewer's own decisions");
fresh();
await open(INBOX, "kabir");
tab("Approved");
const kabirApproved = expenseIds();
tab("Rejected");
const kabirRejected = expenseIds();
check("G1", "Kabir: the claims he approved (EXP-3103 and EXP-3102 at Finance) and rejected (EXP-3101), not Aarav's own auto-approved one or anyone else's",
  j(kabirApproved) === j(["EXP-3103", "EXP-3102"]) && j(kabirRejected) === j(["EXP-3101"]), j({ kabirApproved, kabirRejected }));
await open(INBOX, "aarav");
tab("Approved");
check("G2", "Aarav: none (his own claim was auto-approved; paying EXP-3102 isn't a decision)", expenseIds().length === 0);

// =====================================================================
section("H. Stats, Recently decided, Who approves what, the Expense filter");
await open(INBOX, "kabir");
const kabirAvg = avg([days("2026-09-21T10:00:00.000Z", "2026-09-23T10:00:00.000Z"), days("2026-09-16T10:00:00.000Z", "2026-09-17T10:00:00.000Z"), days("2026-08-03T10:00:00.000Z", "2026-08-04T10:00:00.000Z")]);
// Round 13Z (behaviour, A8): no samples in the stat
check("H1", "Kabir's stats: 2 claims waiting; average = his 3 decisions, each from the claim reaching Finance (was '—' before this round)",
  stats() === `Waiting for you=2 | Approved this week=0 | Rejected this week=0 | Average response=${kabirAvg.toFixed(1)} days`, stats());
decide("EXP-3104", KABIR, "reject", "Duplicate");
await open(INBOX, "kabir");
check("H2", "a rejection today: Rejected this week 1, and the claim first in Recently decided with Rejected / 30 Sep",
  stat("Rejected this week") === "1" && j(decided().find((r) => r[0].startsWith("Expense:"))) === j(["Expense: Ananya Iyer, ₹8,400", "Expense", "Ananya Iyer", "Rejected", "30 Sep"]), j(decided()));
const who = [...d.querySelectorAll("#who-approves .kv__row")].map((r) => `${txt(r.querySelector("dt"))}: ${txt(r.querySelector("dd"))}`);
const staticWho = [...new JSDOM(read(INBOX)).window.document.querySelectorAll("#who-approves .kv__row")].slice(0, 2).map((r) => `${txt(r.querySelector("dt"))}: ${txt(r.querySelector("dd"))}`);
check("H3", "'Who approves what' starts with the expense chain, drawn from the rules; the static copy says the same",
  j(who.slice(0, 2)) === j(["Expense claims: Manager, then Finance", ": Then an Admin too, above ₹50,000"]) && j(staticWho) === j(who.slice(0, 2)) && who.length === 9, j(who));   // 7 since Round 6G (one purchase-order line); 9 since Round 8C (leave and corrections)
typeFilter("expense");
check("H4", "the Expense type option filters to expense rows only", inboxEls().length === 1 && expenseIds().length === 1 && expenseIds()[0] === "EXP-3105");
typeFilter("leave");
check("H5", "Leave for Kabir: nothing (he has no leave:approve)", j(inbox()) === j([["Nothing here for these filters."]]));
typeFilter("");
// Round 12Z (behavior; + Salary): salary changes in the inbox (salinbox.mjs P3)
check("H6", "type options: All types, Access, Purchase, System, Leave, Attendance, Expense, since 6E Asset, since 12Z Salary (values lower-case)",
  j([...d.querySelectorAll('.table__toolbar select[aria-label="Filter by type"] option')].map((o) => `${o.value}|${o.textContent}`)) === j(["|All types", "access|Access", "purchase|Purchase", "system|System", "leave|Leave", "attendance|Attendance", "expense|Expense", "asset|Asset", "salary|Salary"]));

// =====================================================================
section("I. Store helpers");
fresh();
check("I1", "managesAnyone: Aarav, Kabir, Sneha yes; Arjun, Rohan, Priya no; no id, unknown id no",
  [AARAV, KABIR, SNEHA].every(E.managesAnyone) && ![ARJUN, ROHAN, PRIYA, undefined, null, "EMP-9999"].some(E.managesAnyone));
S.updateUser(USER_ACTOR("admin", SNEHA), SNEHA, { status: "inactive", dateOfLeaving: LEAVING_11Y() });
check("I2", "an inactive manager manages nobody (leave-store's managerFor resolves only active managers)", !E.managesAnyone(SNEHA));
S.resetDemoData();
const dec = E.expenseDecisionsBy(SNEHA);
check("I3", "expenseDecisionsBy(Sneha): one per claim, her latest approved/rejected entry, newest first", j(dec.map((x) => `${x.claim.id}:${x.entry.decision}:${x.entry.stage}`)) === j(["EXP-3103:approved:manager", "EXP-3102:approved:manager", "EXP-3101:approved:manager"]));
check("I4", "expenseDecisionsBy leaves out auto-approvals and payments (Aarav: none), and unknown people", E.expenseDecisionsBy(AARAV).length === 0 && E.expenseDecisionsBy("EMP-9999").length === 0);
const two = submit(KABIR, { amount: 60000 }).record;
decide(two.id, AARAV, "approve"); decide(two.id, AARAV, "reject", "Over budget");
check("I5", "two decisions by one person on one claim: one item, the latest (the Admin-stage rejection)", j(E.expenseDecisionsBy(AARAV).map((x) => `${x.claim.id}:${x.entry.decision}:${x.entry.stage}`)) === j([`${two.id}:rejected:admin`]));

// =====================================================================
section("J. Old sessions (no employee id)");
fresh();
await open(INBOX, "oldEmp");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("J1", "an old Employee session: signed out and sent to sign in (round 11P, N2); nothing waits for them: no real rows, no samples", navigations.length === 1 && localStorage.getItem("officeos:session") === null && j(inbox()) === j([["Nothing is waiting for you."]]) && !d.querySelector("tr[data-static]") && jsErrors.length === 0, j(inbox()));
await open(INBOX, "oldHr");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("J2", "an old HR session: signed out and sent to sign in as well (round 11P, N2); the same empty inbox, no samples (they need approvals:view, which nobody signed in holds)", navigations.length === 1 && localStorage.getItem("officeos:session") === null && j(inbox()) === j([["Nothing is waiting for you."]]) && !d.querySelector("tr[data-static]"), j(inbox()));

// =====================================================================
section("K. approvals-inbox.html vs the page before this round (html-pre5E)");
const CHANGES = [
  ['<option>Attendance</option></select>'.replace("</select>", ""), '<option>Attendance</option><option>Expense</option>'],
  ["<!-- data-static rows are samples: nothing stores their decisions. Real leave requests and attendance corrections are added by approvals-inbox.js. -->",
    "<!-- data-static rows are samples: nothing stores their decisions, and only people with approvals:view see them. Real leave requests, attendance corrections and expense claims are added by approvals-inbox.js. -->"],
  ['            <dl class="kv">\n              <div class="kv__row"><dt>Purchase orders</dt>',
    '            <dl class="kv" id="who-approves">\n              <div class="kv__row"><dt>Expense claims</dt><dd>Manager, then Finance</dd></div>\n              <div class="kv__row"><dt></dt><dd>Then an Admin too, above ₹50,000</dd></div>\n              <div class="kv__row"><dt>Purchase orders</dt>'],
].map(([a, b]) => [a.replace(/\n/g, "\r\n"), b.replace(/\n/g, "\r\n")]);
const applied = CHANGES.reduce((s, [a, b]) => (s.split(a).length === 2 ? s.replace(a, b) : `(${a.slice(0, 40)} found ${s.split(a).length - 1} times)`), src("html-pre5E", INBOX));
// Since Round 5F, the inbox page as 5E left it is read frozen (html-pre5F): 5F has moved the live page on (table--fit, badge).
check("K1", "approvals-inbox.html = the page before plus exactly 3 edits (the Expense option, the comment, the two expense lines + id)", applied === src("html-pre5F", INBOX), applied.startsWith("(") ? applied : "3 edits");
check("K2", "every other page is unchanged", (() => { const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)])); const pre = new URL("./html-pre5E", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
  const post = new URL("./html-pre5D", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");   // 5E's result, frozen since 5D
  return walk(pre).filter((p) => p.endsWith(".html") && p !== INBOX).every((p) => fs.readFileSync(`${post}/${p}`, "utf8") === fs.readFileSync(`${pre}/${p}`, "utf8")); })());

// =====================================================================
section("L. Source layout");
const walkRel = (dir, base = "") => fs.readdirSync(new URL(`./${dir}/${base}`, import.meta.url), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walkRel(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
// Since Round 5D, 5E's own result is read frozen (js-pre5D, html-pre5D): 5D has moved the live tree on.
const LIVE = walkRel("js-pre5D"), PRE = walkRel("js-pre5E");
const changed = LIVE.filter((p) => !PRE.includes(p) || src("js-pre5D", p) !== src("js-pre5E", p));
const JS_CHANGED = ["config/nav.js", "config/routes.js", "data/expenses-store.js", "pages/approvals-inbox.js", "pages/expenses.js", "ui/expense-view.js", "ui/leave-decision.js", "ui/sidebar.js"];
check("L1", "js: exactly these 8 files changed or added (one new: ui/expense-view.js); nothing removed", j(changed) === j(JS_CHANGED) && PRE.every((p) => LIVE.includes(p)), j(changed));
check("L2", "no permission or role changed: config/permissions.js and config/roles.js are as before (the decision was route + nav only)",
  src("js-pre5D", "config/permissions.js") === src("js-pre5E", "config/permissions.js") && src("js-pre5D", "config/roles.js") === src("js-pre5E", "config/roles.js"));
const code = (p) => src("js", p).split(/\r?\n/).filter((l) => !l.trim().startsWith("//")).join("\n");
const flows = LIVE.filter((p) => /createDecisionFlow\(\{/.test(code(p)) && /decideExpense/.test(code(p)));
check("L3", "one expense decision flow in the tree (ui/expense-view.js); both pages import it; neither defines its own",
  j(flows) === j(["ui/expense-view.js"]) && ["pages/expenses.js", "pages/approvals-inbox.js"].every((p) => /import \{[^}]*\bexpenseFlow\b[^}]*\} from "\.\.\/ui\/expense-view\.js"/.test(src("js", p)) && !/createDecisionFlow|decideExpense/.test(code(p))));
check("L4", "expense stage names are defined once (the store; ui/expense-view.js re-exports them) and the badges once (ui/expense-view.js)",
  LIVE.filter((p) => /"With Finance"/.test(code(p))).join() === "ui/expense-view.js" && LIVE.filter((p) => /STAGE_NAME = \{/.test(code(p))).join() === "data/expenses-store.js"
  && /export \{ STAGE_NAME \};/.test(code("ui/expense-view.js")));
check("L5", "the inbox decides expenses only through expenseFlow, and lists them only through pendingFor (since 5F via ui/waiting.js, shared with the nav count) / expenseDecisionsBy",
  /waitingFor\(userId, role\)\.expenses/.test(code("pages/approvals-inbox.js")) && /pendingFor as pendingExpenses/.test(code("ui/waiting.js")) && !/allExpenses|getExpense|decideExpense/.test(code("ui/waiting.js")) && /expenseDecisionsBy\(userId\)/.test(code("pages/approvals-inbox.js")) && !/allExpenses|getExpense|decideExpense/.test(code("pages/approvals-inbox.js")));
check("L6", "decisionButtons: a permission is still put on both buttons when given (leave, corrections, Finance/Admin rows); omitted only for null",
  /if \(permission\) reject\.dataset\.permission = permission;/.test(src("js", "ui/leave-decision.js")) && /if \(permission\) approve\.dataset\.permission = permission;/.test(src("js", "ui/leave-decision.js")));
check("L7", "no innerHTML in the new or changed page code (the sidebar's existing icon markup aside)",
  ["pages/approvals-inbox.js", "pages/expenses.js", "ui/expense-view.js"].every((p) => !/innerHTML|outerHTML|insertAdjacentHTML/.test(code(p))));
check("L8", "no import cycle: nothing ui/expense-view.js imports (directly) imports it or a page",
  [...src("js", "ui/expense-view.js").matchAll(/from "\.\.?\/([\w/-]+\.js)"/g)].map((m) => m[1].replace(/^(\.\.\/)?/, "")).every((p) => { const f = p.includes("/") ? p : `ui/${p}`; return !/from "[^"]*(expense-view\.js|\/pages\/[^"]*)"/.test(src("js", f)); }));
check("L9", "changed and new files: CRLF only, no final newline",
  [...JS_CHANGED.map((p) => fs.readFileSync(new URL(`./js/${p}`, import.meta.url), "utf8")), read(INBOX)].every((s) => !/[^\r]\n/.test(s) && !/\r(?!\n)/.test(s) && !s.endsWith("\n")));
check("ERR", "no uncaught JS errors on the last page load", jsErrors.length === 0, jsErrors.join(" / "));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
