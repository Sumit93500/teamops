// usage: node cleanup.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 5F: adjacent cleanup. Fixed clock: Wed 30 Sep 2026 11:00 local. ./js-pre5F, ./html-pre5F and ./css-pre5F are
// the code, pages and styles before this round (Round 5D's result, office-os 6214867).
//   A  the Approvals count: live (ui/waiting.js), equal to the inbox's real Pending rows, for everyone who sees the item;
//      refreshed after a decision; no static badges left in any page
//   B  dashboard/finance.html: Reimbursements due, Pending approvals, Recent expense activity (4G pattern)
//   C  system/reports.html Expense summary Download;  D  system/settings.html Expenses switch
//   E  access/role-editor.html: no expense approval limit;  F  approval-workflows.html;  G  delegation.html
//   H  finance/expenses.html: no static fallback content, the drawn page unchanged
//   I  access/roles-list.html: the four real roles, live counts
//   J  users/user-form.html: effective permissions from the role;  K  users/user-profile.html static overrides
//   L  the two tables (table--fit) and the receipt hint colour (CSS)
//   M  every file vs before: only the listed changes
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const css = (p) => fs.readFileSync(`${DIR}/../assets/css/${p}`, "utf8");
const here = (p) => fs.readFileSync(new URL(`./${p}`, import.meta.url), "utf8");
const INBOX = "requests/approvals-inbox.html", MINE = "requests/my-requests.html", FIN = "dashboard/finance.html",
  REPORTS = "system/reports.html", SETTINGS = "system/settings.html", EDITOR = "access/role-editor.html",
  FLOWS = "access/approval-workflows.html", DELEGATION = "access/delegation.html", EXPENSES = "finance/expenses.html",
  ROLES_LIST = "access/roles-list.html", USER_FORM = "users/user-form.html", PROFILE = "users/user-profile.html",
  EMP_DASH = "dashboard/employee.html";
const SCRIPT = { [INBOX]: "approvals-inbox", [MINE]: "my-requests", [FIN]: "finance-dashboard", [SETTINGS]: "settings",
  [EDITOR]: "role-editor", [EXPENSES]: "expenses", [ROLES_LIST]: "roles-list", [USER_FORM]: "user-form", [PROFILE]: "user-profile",
  [EMP_DASH]: "employee-dashboard" };

const RealDate = Date;
const NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", SNEHA = "EMP-1029", ARJUN = "EMP-1105";
const WHO = {
  aarav: ["admin", "Aarav Mehta", AARAV], kabir: ["fin", "Kabir Shah", KABIR], priya: ["hr", "Priya Nair", PRIYA],
  arjun: ["emp", "Arjun Kapoor", ARJUN], sneha: ["emp", "Sneha Rao", SNEHA], oldHr: ["hr", "Priya Nair", undefined],
  oldFin: ["fin", "Kabir Shah", undefined],
};

let loads = 0, w = null, d = null, saved = {};
let jsErrors = [], htmlWrites = [], confirmAnswer = true;
async function open(page, who, query = "") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = []; htmlWrites = [];
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) jsErrors.push(e.message); });
  const dom = new JSDOM(read(page), { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  const proto = w.Element.prototype;
  const inner = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", { get: inner.get, set(v) { htmlWrites.push(String(v)); inner.set.call(this, v); }, configurable: true });
  w.confirm = () => confirmAnswer;
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  const auth = await import("./js/core/auth.js");
  if (!who) auth.signOut(); else auth.signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  if (SCRIPT[page]) { try { await import(`./js/pages/${SCRIPT[page]}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); } }
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
const L = await import("./js/data/leave-store.js");
const A = await import("./js/data/attendance-store.js");
const { ALL_PERMISSIONS } = await import("./js/config/permissions.js");
const { ROLES } = await import("./js/config/roles.js");
const { NAV } = await import("./js/config/nav.js");

// ---- readers ----
const $ = (id) => d.getElementById(id);
const navItem = (label) => [...d.querySelectorAll(".sidebar__nav .nav__item")].find((a) => [...a.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join("") === label);
const badgeOf = (label) => { const a = navItem(label); return a ? (a.querySelector(".nav__count") ? txt(a.querySelector(".nav__count")) : "none") : "no item"; };
const realPendingRows = () => [...d.querySelectorAll("#inbox-table tbody tr")].filter((tr) => !tr.hasAttribute("data-static") && tr.children.length > 1).length;
const statOf = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return s ? { value: txt(s.querySelector(".stat__value")), note: txt(s.querySelector(".stat__delta")), hidden: s.hidden } : null; };
const visible = (node) => { for (let n = node; n && n !== d.body; n = n.parentElement) if (n.hidden) return false; return Boolean(node); };
const namesInHtml = () => { const names = S.getAllUsers().map((u) => u.name); return htmlWrites.filter((h) => names.some((n) => h.includes(n))); };

// =====================================================================
section("A. The Approvals count");
const approvalsItem = NAV.flatMap((g) => g.items).find((i) => i.label === "Approvals");
check("A1", "nav.js: Approvals has countWaiting and no fixed badge; no nav item has a 'badge' any more", approvalsItem.countWaiting === true && !("badge" in approvalsItem) && NAV.flatMap((g) => g.items).every((i) => !("badge" in i)), j(approvalsItem));
const pagesWithBadge = [];
(function walk(dir, rel) { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const r = rel ? `${rel}/${f.name}` : f.name;
  if (f.isDirectory()) walk(`${dir}/${f.name}`, r); else if (f.name.endsWith(".html") && /nav__count/.test(fs.readFileSync(`${dir}/${f.name}`, "utf8"))) pagesWithBadge.push(r); } })(DIR, "");
const template = fs.readFileSync(`${DIR}/../_templates/page-template.html`, "utf8");
check("A2", "no page's static sidebar has a nav__count any more (48 removed: 47 pages + the page template)", pagesWithBadge.length === 0 && !/nav__count/.test(template), pagesWithBadge.join(", "));

fresh();
const W = await import("./js/ui/waiting.js");
for (const [who, id, role] of [["aarav", AARAV, "admin"], ["priya", PRIYA, "hr"], ["kabir", KABIR, "fin"], ["sneha", SNEHA, "emp"]]) {
  await open(INBOX, who);
  const rows = realPendingRows();
  const n = W.waitingCount(id, role);
  check(`A3${who[0]}`, `${who}: the badge = the inbox's real Pending rows (sample rows not counted) = waitingCount`, String(rows) === badgeOf("Approvals") && rows === n && jsErrors.length === 0, `badge ${badgeOf("Approvals")}, rows ${rows}, count ${n}`);
}
await open(EMP_DASH, "sneha");
check("A4", "Sneha (a manager, role Employee) sees the count too: 4 (Arjun's ₹1,850 claim, his laptop request ARQ-1 and, since Round 8C, her reports' leave LV-2189 and LV-2201, all at the manager stage; was 2)", badgeOf("Approvals") === "4", badgeOf("Approvals"));
await open(EMP_DASH, "arjun");
check("A5", "Arjun: no Approvals item at all (nothing changed for non-managers)", badgeOf("Approvals") === "no item");
await open(INBOX, "sneha");
const arjunClaim = [...d.querySelectorAll("#inbox-table tbody tr")].find((tr) => tr.dataset.claimId === "EXP-3106");
[...arjunClaim.querySelectorAll("button")].find((b) => txt(b) === "Approve").click();
check("A6", "Sneha approves it in the inbox: her count goes from 4 to 3 at once (refreshWaitingCount, no reload; the asset request and the two leave requests still wait; Round 8C, was 2 to 1)", badgeOf("Approvals") === "3" && E.getExpense("EXP-3106").stage === "finance", badgeOf("Approvals"));
await open(INBOX, "kabir");
const kabirBefore = Number(badgeOf("Approvals"));
const row3106 = [...d.querySelectorAll("#inbox-table tbody tr")].find((tr) => tr.dataset.claimId === "EXP-3106");
[...row3106.querySelectorAll("button")].find((b) => txt(b) === "Reject").click();
d.getElementById("reject-expense-note").value = "Duplicate";
d.querySelector("#reject-expense-modal form").dispatchEvent(new w.Event("submit", { cancelable: true }));
check("A7", "Kabir rejects it through the modal: his count drops by one at once", E.getExpense("EXP-3106").status === "rejected" && badgeOf("Approvals") === String(kabirBefore - 1), `${kabirBefore} -> ${badgeOf("Approvals")}`);
fresh();
await open(INBOX, "kabir");
const kabirN = badgeOf("Approvals");
const L1 = L.pendingFor(PRIYA, "hr")[0];   // Round 8C (setup): one Priya can decide (the first pending one now waits on Sneha)
await open(INBOX, "priya");
const priyaBefore = Number(badgeOf("Approvals"));
L.decideLeave(L1.id, PRIYA, "hr", "approve");
(await import("./js/ui/sidebar.js")).refreshWaitingCount();
check("A8", "a leave decision made elsewhere: refreshWaitingCount() on Priya's page drops her count by one", badgeOf("Approvals") === String(priyaBefore - 1), `${priyaBefore} -> ${badgeOf("Approvals")}`);
fresh();
await open(INBOX, "kabir");
const kabirWaiting = Number(badgeOf("Approvals"));
const gone = E.pendingFor(KABIR, "fin")[0];
E.cancelExpense(gone.id, gone.userId);                                   // cancelled by its claimant after Kabir's page was drawn
[...d.querySelectorAll("#inbox-table tbody tr")].find((tr) => tr.dataset.claimId === gone.id).querySelectorAll("button")[0].click();
d.getElementById("reject-expense-note").value = "Not needed";
d.querySelector("#reject-expense-modal form").dispatchEvent(new w.Event("submit", { cancelable: true }));
check("A11", "a rejection refused because the claim changed meanwhile (its claimant cancelled it): the count still drops at once",
  E.getExpense(gone.id).status === "cancelled" && badgeOf("Approvals") === String(kabirWaiting - 1), `${kabirWaiting} -> ${badgeOf("Approvals")}`);
await open(INBOX, "oldHr");
check("A9", "an old HR session (no employee id): the inbox lists no real rows for it, so no count either", realPendingRows() === 0 && badgeOf("Approvals") === "none", `badge ${badgeOf("Approvals")}, rows ${realPendingRows()}`);
check("A10", "the count goes in with textContent: no innerHTML write carries it", !htmlWrites.some((h) => /nav__count/.test(h)) && kabirN !== "no item");

// =====================================================================
section("B. dashboard/finance.html");
fresh();
await open(FIN, "kabir");
const approved = E.expenseTotals(E.allExpenses()).byStatus.approved;
const reimb = statOf("reimbursements");
check("B1", "Reimbursements due = approved claims waiting to be paid (expenses.html's Approved figure), with its count",
  reimb.value === `₹${approved.amount.toLocaleString("en-IN")}` && reimb.note === `${approved.count} ${approved.count === 1 ? "claim" : "claims"} waiting to be paid` && approved.count > 0 && !reimb.hidden, j([reimb, approved]));
const finHtml = read(FIN);
check("B2", "the stat is gated on expenses:view in the HTML, its static value '—' (no ₹1.2L / 14 open claims)", /data-stat="reimbursements" data-permission="expenses:view"/.test(finHtml) && !/₹1\.2L|14 open claims/.test(finHtml));
const pending = E.pendingFor(KABIR, "fin");
const items = [...d.querySelectorAll("#fin-approvals .list__item")];
// Round 9D (behaviour; was: the title unchecked, "Pending approvals"): the card is titled "Pending expense approvals",
// since it lists expense claims only; the list itself is unchanged
check("B3", "Pending expense approvals (Round 9D: was titled 'Pending approvals'): exactly the claims waiting for Kabir's decision, oldest first, with the count",
  j(items.map((i) => i.dataset.claimId)) === j([...pending].sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id, "en", { numeric: true })).map((c) => c.id))
  && txt(d.querySelector("#fin-approvals .card__meta")) === `${pending.length} open` && pending.length > 0
  && txt(d.querySelector("#fin-approvals .card__title")) === "Pending expense approvals", j(items.map((i) => i.dataset.claimId)));
const first = E.getExpense(items[0].dataset.claimId);
check("B4", "each item: 'Expense claim: <name>', amount, category, stage, and a Review link to the inbox; no Approve / Reject here",
  txt(items[0].querySelector(".list__title")) === `Expense claim: ${S.getUser(first.userId).name}` && txt(items[0].querySelector(".list__sub")).startsWith(`₹${first.amount.toLocaleString("en-IN")}, `)
  && items.every((i) => Boolean(i.querySelector("a.btn")?.getAttribute("href")?.endsWith("requests/approvals-inbox.html")) && !i.querySelector("button")), txt(items[0]));
// Round 9D (behaviour; was ["applied", "approved", "rejected", "paid"]): cancellations are events too, read as on the
// Admin dashboard (findash.mjs B tests them; no seeded claim is cancelled, so this list's result is unchanged here)
const events = E.allExpenses().flatMap((c) => c.history.filter((h) => ["applied", "approved", "rejected", "paid", "cancelled"].includes(h.decision)).map((h) => ({ c, h })))
  .sort((a, b) => b.h.at.localeCompare(a.h.at)).slice(0, 5);
const shown = [...d.querySelectorAll("#fin-activity .activity__item")];
check("B5", "Recent expense activity: the 5 newest sent / approved / rejected / paid / cancelled (Round 9D) events, newest first, each with its day",
  shown.length === 5 && shown.every((s, i) => txt(s.querySelector(".activity__time")) && txt(s).includes(S.getUser(events[i].c.userId).name)), j(shown.map(txt)));
E.submitExpense("EMP-1017", { category: "fuel", amount: 900, date: "2026-09-29", reason: "Fuel for client visits", receipt: "bill.jpg" });
await open(FIN, "kabir");
const shown2 = [...d.querySelectorAll("#fin-activity .activity__item")].map(txt);
check("B5b", "a claim whose manager stage is skipped as it's sent (Ananya: no manager): listed once as sent, newest first; the skip isn't an event",
  shown2.length === 5 && shown2[0] === "Expense claim from Ananya Iyer, ₹90030 Sep" && !shown2.some((s) => /undefined|skipped/i.test(s)) && jsErrors.length === 0, j(shown2));
check("B6", "no fabricated content left: no 'Ananya Iyer, ₹8,400' card, no '2 hours ago'", !/2 hours ago|₹8,400, client travel/.test(finHtml));
check("B7", "names never go through innerHTML on this page", namesInHtml().length === 0 && jsErrors.length === 0, namesInHtml().join(" | ").slice(0, 120));
await open(FIN, "priya");
const hrStat = statOf("reimbursements");
// Round Manager scoping part 1 (behaviour; was: let in, the stat and the activity card hidden: HR can't open finance.html now (dashboard:finance; the guard's 403,
// financeperm.mjs G1), and what the page's script still draws in jsdom is nothing of the totals)
check("B8", "HR can't open finance.html (its route needs dashboard:finance, which HR doesn't hold); the stat still '—' and nothing drawn in the activity card", (await import("./js/config/routes.js")).ROUTES[FIN] === "dashboard:finance" && !ROLES.hr.permissions.includes("dashboard:finance") && hrStat.value === "—" && $("fin-activity").children.length === 0, j(hrStat));
check("B9", "HR's Pending approvals: nothing waits for Priya, so '0 open' and a plain note, no claims", txt(d.querySelector("#fin-approvals .card__meta")) === "0 open" && d.querySelectorAll("#fin-approvals .list__item").length === 0 && /No expense claims are waiting for you/.test(txt($("fin-approvals"))));
await open(FIN, "sneha");
const snehaItems = [...d.querySelectorAll("#fin-approvals .list__item")].map((i) => i.dataset.claimId);
// Round Manager scoping part 1 (behaviour; was: let in, the totals and activity hidden: an Employee can't open finance.html now; the page's script, which jsdom still runs,
// lists only the claim waiting for her, and no totals)
check("B10", "Sneha (role Employee, a manager) can't open finance.html (dashboard:finance); its script would list only the claim waiting for her, EXP-3106, and no totals or activity",
  (await import("./js/config/routes.js")).ROUTES[FIN] === "dashboard:finance" && !ROLES.emp.permissions.includes("dashboard:finance") && j(snehaItems) === j(["EXP-3106"]) && statOf("reimbursements").value === "—" && $("fin-activity").children.length === 0, j(snehaItems));
await open(FIN, "oldFin");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("B11", "an old Finance session (no employee id): signed out at the guard (round 11P, N2), so no totals drawn", localStorage.getItem("officeos:session") === null && statOf("reimbursements").value === "—" && jsErrors.length === 0, j([statOf("reimbursements").value, txt(d.querySelector("#fin-approvals .card__meta"))]));
for (const c of E.allExpenses()) if (c.status === "approved" && !E.payExpense(c.id, KABIR).ok) E.payExpense(c.id, AARAV);
await open(FIN, "kabir");
const after = statOf("reimbursements");
check("B12", "once every approved claim is paid: '₹0', 'Nothing waiting to be paid'", E.allExpenses().every((c) => c.status !== "approved") && after.value === "₹0" && after.note === "Nothing waiting to be paid", j(after));

// =====================================================================
section("C-G. Static pages");
const reports = read(REPORTS);
const expenseCard = reports.slice(reports.indexOf("Expense summary"), reports.indexOf("</article>", reports.indexOf("Expense summary")));
check("C1", "reports.html: the Expense summary Download is gated on expenses:view (was reports:export), as 4G did for Payroll register", /data-permission="expenses:view" data-not-implemented="Download"/.test(expenseCard) && !/reports:export/.test(expenseCard));
fresh();
await open(REPORTS, "priya");
const dl = (who) => [...d.querySelectorAll(".report")].find((r) => /Expense summary/.test(txt(r))).querySelector('[data-not-implemented="Download"]');
const hrSees = !dl().hidden;
await open(REPORTS, "kabir");
check("C2", "HR no longer sees that Download; Finance does. Every other report card unchanged", !hrSees && !dl().hidden);
const settings = read(SETTINGS);
check("D1", "settings.html: the Expenses module switch is checked and disabled, like Payroll's", /aria-label="Expenses module" checked disabled/.test(settings) && /aria-label="Payroll module" checked disabled/.test(settings));
const editor = read(EDITOR);
// Round 6H: the role page is drawn from roles.js; expenses:create is a drawn tick, not static HTML.
await open(EDITOR, "aarav", "?role=hr");
const hrExpenses = [...d.querySelectorAll('#matrix-rows .perm-tick[data-permission-key^="expenses:"]')].filter((t) => t.querySelector(".matrix__yes")).map((t) => t.dataset.permissionKey);
check("E1", "role-editor.html: no 'Expense approval limit' field (no per-role limit exists; HR holds no expense approval); HR's only expense tick is expenses:create",
  !/Expense approval limit|id="limit"/.test(editor) && !/Expense approval limit/.test(d.documentElement.outerHTML) && j(hrExpenses) === j(["expenses:create"]));
// Round 11N (behaviour; behaviour; was 77: users:delete (round 11N) is a 78th permission, so the page draws it)
// Round Manager scoping part 1 (behaviour; was 45 of 78: dashboard:finance is a 79th permission)
check("E2", "...and the page counts what HR holds: '49 of 90' (L0: was 45 of 79)", txt(d.querySelector(".matrix")?.closest(".card")?.querySelector(".card__meta")) === "49 of 90" && jsErrors.length === 0);
const flows = read(FLOWS);
check("F1", "approval-workflows.html: the expense condition says the Admin stage is added above ₹50,000 and stages nobody else holds are skipped", flows.includes("<td>Admin added above ₹50,000. A stage nobody else can decide is skipped</td>") && !flows.includes("Admin only above ₹50,000"));
check("F2", "...and the ₹62,000 example says who the manager is (the person they report to)", flows.includes("The person they report to confirms the trip happened"));
const deleg = read(DELEGATION), delegBefore = here("html-pre5F/access/delegation.html");
// Round 9R (behaviour; was deleg.includes("Rahul Deshmukh")): the last row's delegate is "A department head" now
// (roster.mjs D2); "the rest kept" is still that row, by its delegate and dates
check("G1", "delegation.html: the Kabir -> Meera 'Expense claims' row is gone (Meera holds no expense permission); the rest of the history kept",
  !/Meera Joshi<\/td><td>5 – 7 Aug/.test(deleg) && (delegBefore.match(/<tr>/g).length - deleg.match(/<tr>/g).length) === 1 && deleg.includes("<td>A department head</td><td>12 – 14 Jul</td>"));

// =====================================================================
section("H. finance/expenses.html");
const exp = read(EXPENSES);
check("H1", "no static fallback content: no fake people, no static figures, no rows, no spend bars, the alert empty and hidden",
  !/Meenal|Neha Kulkarni|₹1\.2L|₹3\.4L|2\.1 days|Mostly missing bills|class="bar-row"/.test(exp) && /<tbody id="expense-rows">\s*<\/tbody>/.test(exp) && /id="expense-alert" hidden><\/div>/.test(exp));
check("H2", "stat values and tab counts are '—' until drawn", (exp.match(/<strong class="stat__value">—<\/strong>/g) ?? []).length === 4 && (exp.match(/<span class="badge badge--count">—<\/span>/g) ?? []).length === 4);
fresh();
await open(EXPENSES, "kabir");
const tabs = [...d.querySelectorAll(".tabs__tab")].map((p) => txt(p.querySelector(".badge")));
const all = E.allExpenses();
check("H3", "drawn by expenses.js as before: tab counts from the store, rows, spend bars, the policy card",
  j(tabs) === j([all.filter((c) => c.status === "pending").length, all.filter((c) => c.status === "approved").length, all.filter((c) => c.status === "paid").length, all.filter((c) => c.status === "rejected").length].map(String))
  && d.querySelectorAll("#expense-rows tr").length > 0 && d.querySelectorAll("#expense-spend .bar-row").length > 0 && jsErrors.length === 0, j(tabs));

// =====================================================================
section("I. access/roles-list.html");
const rl = read(ROLES_LIST);
check("I1", "the four roles of roles.js only, by key; no Super Admin, HR Staff, Team Lead or Inventory Manager",
  j([...rl.matchAll(/<tr data-role="(\w+)">/g)].map((m) => m[1])) === j(Object.keys(ROLES)) && !/Super Admin|HR Staff|Team Lead|Inventory Manager|\/ 44|179/.test(rl));
fresh();
await open(ROLES_LIST, "aarav");
const rlRows = [...d.querySelectorAll(".table tbody tr")].map((tr) => [tr.dataset.role, txt(tr.querySelector(".table__user-name")), txt(tr.querySelector('[data-cell="users"]')), txt(tr.querySelector('[data-cell="permissions"]')), tr.querySelector(".meter__fill").style.getPropertyValue("--w")]);
const expectRows = Object.values(ROLES).map((r) => [r.key, r.label, String(S.getAllUsers().filter((u) => u.role === r.key).length), `${r.permissions.length} / ${ALL_PERMISSIONS.length}`, `${Math.round((r.permissions.length / ALL_PERMISSIONS.length) * 100)}%`]);
check("I2", "each row: the role's label, how many people hold it, 'n / 75' and the meter, from roles.js and the store", j(rlRows) === j(expectRows) && jsErrors.length === 0, j(rlRows));
// Round 6D added assets:view and Round 6F vendors:view (both Admin only): 77 permissions, Admin 77, the other roles unchanged.
// Round 11N (behaviour; behaviour; was 77: users:delete (round 11N) is a 78th permission, so the page draws it)
// Round Manager scoping part 1 (behaviour; was 78 / 45 / 36 / 20 of 78: dashboard:finance, held by Admin and Finance)
check("I3", "today that's Admin 1, HR Manager 1, Finance Manager 1, Employee 7 (Divya, inactive, still holds Employee); 90 / 49 / 42 / 24 of 90 (L0: was 79 / 45 / 37 / 20 of 79; Round 7C: Finance has no pii:view; Manager scoping part 1: dashboard:finance)", j(rlRows.map((r) => [r[2], r[3]])) === j([["1", "90 / 90"], ["1", "49 / 90"], ["1", "42 / 90"], ["7", "24 / 90"]]), j(rlRows.map((r) => [r[2], r[3]])));
S.addUser?.(USER_ACTOR("admin", null), { name: "Test Person", email: "t@x.com", department: "FIN", designation: "Accountant", role: "fin", status: "active" });
await open(ROLES_LIST, "aarav");
check("I4", "a new Finance Manager added through the store: the count follows on the next load", txt(d.querySelector('tr[data-role="fin"] [data-cell="users"]')) === "2");
check("I5", "every row is a System role; the alert no longer talks about custom roles", [...d.querySelectorAll(".table tbody tr")].every((tr) => /System/.test(txt(tr))) && !/Custom/.test(rl) && /can't be created yet/.test(rl));

// =====================================================================
section("J-K. users/user-form.html, users/user-profile.html");
fresh();
const chips = () => [...$("effective-permissions").children].map(txt);
const pickDesignation = (title) => { const s = $("designation"); s.value = title; s.dispatchEvent(new w.Event("change")); };
await open(USER_FORM, "aarav");
check("J1", "new employee, no designation chosen: Employee's permissions, as saving would store (role emp), with the count",
  j(chips()) === j(ROLES.emp.permissions) && txt($("effective-count")) === String(ROLES.emp.permissions.length) && jsErrors.length === 0, `${txt($("effective-count"))}: ${chips().slice(0, 3)}`);
pickDesignation("Finance Manager");
// Round Manager scoping part 1 (behaviour; was 36: Finance also holds dashboard:finance)
check("J2", "choosing 'Finance Manager': the chips switch to Finance Manager's 42 (P5: was 40; L0: was 37; Round 7C: no pii:view; Manager scoping part 1: dashboard:finance)", j(chips()) === j(ROLES.fin.permissions) && txt($("effective-count")) === "42");
pickDesignation("Administrator");
// Round 11N (behaviour; behaviour; was 77: users:delete (round 11N) is a 78th permission, so the page draws it)
// Round Manager scoping part 1 (behaviour; was 78: dashboard:finance is a 79th permission)
check("J3", "'Administrator': one line, 'Every permission (90)', not 90 chips (L0: was 79; Round 6D: assets:view; 6F: vendors:view; 11N: users:delete; Manager scoping part 1: dashboard:finance)", j(chips()) === j(["Every permission (90)"]) && txt($("effective-count")) === "90");
check("J4", "no permission that doesn't exist is ever shown (attendance:view, attendance:create, leave:view)", !/attendance:view<|attendance:create|leave:view</.test(read(USER_FORM)));
await open(USER_FORM, "aarav", `?id=${KABIR}`);
check("J5", "editing Kabir (designation Finance Manager): his role's permissions", j(chips()) === j(ROLES.fin.permissions));
const uf = read(USER_FORM);
// Round 11R (behaviour; overrides are applied since round 11R and Additional roles is gone (Q-D1), so the page says so)
check("J6", "the card and the access section say overrides are applied on top of the role (round 11R), and Additional roles is gone", /Applied on top of the default role, everywhere the app checks/.test(uf) && /What the app checks: the default role's permissions, plus the extra ones, minus the denied ones/.test(uf) && !/Additional roles|don't change what they can do yet|aren't applied yet/.test(uf));
const prof = read(PROFILE);
// Round 11R (behaviour; overrides are applied since round 11R, so the profile's note says so)
check("K1", "user-profile.html's static overrides: none (no reports:view / expenses:create chips), with the 'applied on top of the role' note (round 11R)", !/perm-chip">(reports:view|expenses:create)/.test(prof) && /Applied on top of the role, everywhere the app checks/.test(prof) && !/don't change what anyone can do yet/.test(prof));
fresh();
S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { grantPermissions: ["reports:view"], denyPermissions: [] });
await open(PROFILE, "aarav", `?id=${ARJUN}`);
const ov = [...d.querySelectorAll(".card")].find((c) => txt(c.querySelector(".card__title")) === "Permission overrides");
// Round 11R (behaviour; overrides are applied since round 11R, so the profile's note says so)
check("K2", "a user with an override: user-profile.js fills the chips as before, and the note (applied, round 11R) stays with them", txt(ov.querySelector(".card__meta")) === "1" && /reports:view/.test(txt(ov)) && /Applied on top of the role/.test(txt(ov)) && jsErrors.length === 0, txt(ov));
await open(PROFILE, "aarav", `?id=${KABIR}`);
const ov2 = [...d.querySelectorAll(".card")].find((c) => txt(c.querySelector(".card__title")) === "Permission overrides");
check("K3", "a user without: 'No overrides', as before", /No overrides/.test(txt(ov2)) && txt(ov2.querySelector(".card__meta")) === "0");

// =====================================================================
section("L. CSS: the two tables and the receipt hint");
const table = css("components/table.css");
check("L1", "table.css: a table--fit variant (narrower cells, headings / titles / actions may wrap, buttons never)",
  /\.table--fit th, \.table--fit td \{ padding-left: 10px; padding-right: 10px; \}/.test(table) && /\.table--fit th \{ white-space: normal; \}/.test(table) && /\.table--fit \.table__user-name \{ white-space: normal; \}/.test(table)
  && /\.table--fit \.table__actions \{ white-space: normal; \}/.test(table) && /\.table--fit \.table__actions \.btn \{ white-space: nowrap; \}/.test(table));
check("L2", "only the inbox's Pending table and My requests' table use it; the decided table and every other table unchanged",
  /<table class="table table--fit" id="inbox-table">/.test(read(INBOX)) && /<table class="table" id="decided-table">/.test(read(INBOX)) && /<table class="table table--fit">/.test(read(MINE)));
check("L3", "the rest of table.css is byte-for-byte as before (every other table keeps its look)", here("css-pre13U/components/table.css").startsWith(here("css-pre5F/components/table.css")) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3; L1 and L4 read the rules, and stay live */);
const form = css("components/form.css");
check("L4", "form.css: a hint with data-missing=\"true\" is in the warning colour (the claim page's receipt advisory)", /\.form-hint\[data-missing="true"\] \{ color: var\(--color-warning\); \}/.test(form));
fresh();
await open(INBOX, "aarav");
const exportTables = [...d.querySelectorAll("table[data-export-name]")].map((t) => t.dataset.exportName);
check("L5", "the CSV export still finds the inbox's tables by data-export-name (CSS only; the cells are unchanged)", j(exportTables) === j(here("html-pre5F/requests/approvals-inbox.html").match(/data-export-name="[^"]+"/g)?.map((m) => m.slice(18, -1)) ?? []), j(exportTables));

// =====================================================================
section("M. Every file vs before");
const strip = (s) => s.replace(/\r\n[ \t]*<span class="nav__count">\d+<\/span>(?=\r\n)/g, "");
const htmlChanged = [INBOX, MINE, FIN, REPORTS, SETTINGS, EDITOR, FLOWS, DELEGATION, EXPENSES, ROLES_LIST, USER_FORM, PROFILE];
const differ = [];
(function walk(dir, rel) { for (const f of fs.readdirSync(new URL(`./html-pre5F/${rel}`, import.meta.url), { withFileTypes: true })) { const r = rel ? `${rel}/${f.name}` : f.name;
  // Since Round 6C, 5F's pages are read frozen (./html-pre6C): 6C wired items.html and stock-movements.html.
  if (f.isDirectory()) walk(dir, r); else if (f.name.endsWith(".html") && r !== "page-template.html" && !htmlChanged.includes(r) && here(`html-pre6C/${r}`) !== strip(here(`html-pre5F/${r}`))) differ.push(r); } })(null, "");
check("M1", "every other page = before with only its static nav badge removed", differ.length === 0, differ.join(", "));
check("M2", "the page template = before with only its badge removed", here("template-pre14A.html") === strip(here("html-pre5F/page-template.html")));   // Round 14B (layout; was the live template): 9c7423e's, frozen; the live template: noflash.mjs P3, H2, X3
const jsChanged = ["config/nav.js", "ui/sidebar.js", "ui/leave-decision.js", "pages/approvals-inbox.js", "pages/finance-dashboard.js", "pages/user-form.js"];
const jsNew = ["ui/waiting.js", "pages/roles-list.js"];
const jsDiffer = [];
// Since Round 6B, 5F's js result is read frozen (./js-pre6B): 6B added data files and changed users-list.js.
(function walk(rel) { for (const f of fs.readdirSync(new URL(`./js-pre6B/${rel}`, import.meta.url), { withFileTypes: true })) { const r = rel ? `${rel}/${f.name}` : f.name;
  if (f.isDirectory()) walk(r); else if (!jsChanged.includes(r) && !jsNew.includes(r) && (!fs.existsSync(new URL(`./js-pre5F/${r}`, import.meta.url)) || here(`js-pre6B/${r}`) !== here(`js-pre5F/${r}`))) jsDiffer.push(r); } })("");
check("M3", "js: only the 6 listed files changed and the 2 new ones added; data/ and config/ (but nav.js) untouched", jsDiffer.length === 0 && jsNew.every((f) => fs.existsSync(new URL(`./js-pre6B/${f}`, import.meta.url))), jsDiffer.join(", "));
check("M4", "no permission, role or route changed", here("js-pre6B/config/permissions.js") === here("js-pre5F/config/permissions.js") && here("js-pre6B/config/roles.js") === here("js-pre5F/config/roles.js") && here("js-pre6B/config/routes.js") === here("js-pre5F/config/routes.js"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
