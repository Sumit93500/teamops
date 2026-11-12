// usage: node expclaim.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 5D: employees send expense claims. Fixed clock: Wed 30 Sep 2026 11:00 local. ./js-pre5D and ./html-pre5D are
// the code and pages before this round (Round 5E's result).
//   A  permissions, roles, route, nav (decisions: expenses:create only, in SELF_SERVICE, new page + My requests)
//   B  the claim page's approval chain per person, and that it matches what submitExpense() then does
//   C  validation: every refusal from the store, at its field
//   D  the receipt advisory (a hint while typing, a warning after sending; never a refusal)
//   E  sending: stored as entered, toasts, the button disabled; an Admin's own claim
//   F  My requests: real expense rows, With, status, Cancel, filters, the header button
//   G  the progress steps (ui/expense-view.js expenseSteps) for every kind of history
//   H  the role editor's Expenses row;  I  access;  J  the HTML vs before;  K  source layout
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const CLAIM = "requests/claim-expense.html", MINE = "requests/my-requests.html", EDITOR = "access/role-editor.html";
const SCRIPT = { [CLAIM]: "claim-expense", [MINE]: "my-requests", [EDITOR]: "role-editor" };

const RealDate = Date;
const NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const timers = [];
globalThis.setTimeout = (fn, ms) => { timers.push(ms); return 0; };
globalThis.setInterval = () => 0;

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029",
  ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const WHO = {
  aarav: ["admin", "Aarav Mehta", AARAV], kabir: ["fin", "Kabir Shah", KABIR], priya: ["hr", "Priya Nair", PRIYA],
  arjun: ["emp", "Arjun Kapoor", ARJUN], ananya: ["emp", "Ananya Iyer", ANANYA], rohan: ["emp", "Rohan Gupta", ROHAN],
  vikram: ["emp", "Vikram Singh", VIKRAM], oldEmp: ["emp", "Arjun Kapoor", undefined],
};

let loads = 0, w = null, d = null, saved = {};
let jsErrors = [], navigations = [], htmlWrites = [], confirms = [], confirmAnswer = true;
async function open(page, who) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = []; navigations = []; htmlWrites = []; confirms = []; timers.length = 0;
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else jsErrors.push(e.message); });
  // Round Forms (layout; was no query, which drew HR Manager): the role editor asked for HR by name; no role is "not found" now (forms.mjs R1)
  const dom = new JSDOM(read(page), { url: `http://localhost/office-os/pages/${page}${page === EDITOR ? "?role=hr" : ""}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
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
const { PERMISSIONS, ALL_PERMISSIONS } = await import("./js/config/permissions.js");
const { ROLES } = await import("./js/config/roles.js");
const { ROUTES } = await import("./js/config/routes.js");
const { NAV } = await import("./js/config/nav.js");

// ---- readers ----
const $ = (id) => d.getElementById(id);
const chain = () => [...$("expense-chain").children].map((li) => `${txt(li.querySelector("strong"))}: ${txt(li.querySelector("small"))}`);
const subtitle = () => txt(d.querySelector(".page-header__subtitle"));
const set = (id, v) => { const i = $(id); i.value = v; i.dispatchEvent(new w.Event("input", { bubbles: true })); i.dispatchEvent(new w.Event("change", { bubbles: true })); };
const send = () => $("expense-form").dispatchEvent(new w.Event("submit", { cancelable: true }));
const errors = () => [...d.querySelectorAll("#expense-form .form-error")].map((e) => `${e.closest(".form-field").querySelector("input, select, textarea").id}: ${txt(e)}`);
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => ({ type: t.className.replace("toast toast--", ""), text: txt(t.querySelector(".toast__text")) }));
const clearToasts = () => d.querySelectorAll(".toast").forEach((t) => t.remove());
const fill = (f = {}) => { const v = { category: "travel", amount: "1200", date: "2026-09-29", reason: "Cab to the client", receipt: "cab.pdf", ...f };
  set("expense-category", v.category); set("expense-amount", v.amount); set("expense-date", v.date); set("expense-reason", v.reason); set("expense-receipt", v.receipt); };
const reqRows = () => [...d.querySelectorAll(".table tbody tr")].map((tr) => [...tr.children].map(txt));
const rowOf = (id) => [...d.querySelectorAll(".table tbody tr")].find((tr) => tr.dataset.claimId === id);
const pills = () => [...d.querySelectorAll(".tabs__tab")].map((p) => `${txt(p.childNodes[0])}=${txt(p.querySelector(".badge"))}`).join(" ");
const typeFilter = (label) => { const s = d.querySelector('.table__toolbar select[aria-label="Filter by type"]'); s.value = [...s.options].find((o) => o.textContent.trim() === label).value; s.dispatchEvent(new w.Event("change")); };
const stepsIn = (root) => [...root.querySelectorAll(".stepper__step")].map((li) => `${li.classList.contains("is-done") ? "done" : li.classList.contains("is-current") ? "current" : "-"}:${txt(li.querySelector("strong"))} (${txt(li.querySelector("small"))})`);
const navLabels = () => [...d.querySelectorAll(".sidebar__nav .nav__item")].map((a) => [...a.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(""));

// =====================================================================
section("A. Permissions, roles, route, nav");
check("A1", "permissions.js: expenses = view, approve, pay, create (one new action, the module's verb style, as leave:create)", j(PERMISSIONS.expenses) === j(["view", "approve", "pay", "create"]) && ALL_PERMISSIONS.includes("expenses:create") && !ALL_PERMISSIONS.includes("expenses:view-own"));
check("A2", "every role holds expenses:create (SELF_SERVICE; Admin through ALL_PERMISSIONS)", Object.values(ROLES).every((r) => r.permissions.includes("expenses:create")), Object.keys(ROLES).join(","));
check("A3", "nothing else changed hands: view / approve / pay still Finance and Admin only", ["expenses:view", "expenses:approve", "expenses:pay"].every((p) =>
  ROLES.admin.permissions.includes(p) && ROLES.fin.permissions.includes(p) && !ROLES.hr.permissions.includes(p) && !ROLES.emp.permissions.includes(p)));
check("A4", "every role's permissions = before + expenses:create, nothing else", await (async () => {
  const pre = await import("./js-pre5D/config/roles.js");
  // Since Round 6D, 5D's roles are read frozen (./js-pre6D): 6D added assets:view (Admin, through ALL_PERMISSIONS).
  const post = await import("./js-pre6D/config/roles.js");
  return Object.keys(post.ROLES).every((k) => j([...post.ROLES[k].permissions].sort()) === j([...new Set([...pre.ROLES[k].permissions, "expenses:create"])].sort()));
})());
check("A5", "routes: claim-expense.html needs expenses:create; my-requests.html still requests:view-own", ROUTES[CLAIM] === "expenses:create" && ROUTES[MINE] === "requests:view-own");
const item = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group }))).find((i) => i.href === CLAIM);
check("A6", "nav: 'Claim expense' in Requests & expenses, right after Requests, gated by expenses:create", item?.label === "Claim expense" && item.group === "Requests & expenses" && item.permission === "expenses:create"
  && NAV.find((g) => g.group === "Requests & expenses").items.findIndex((i) => i.href === CLAIM) === NAV.find((g) => g.group === "Requests & expenses").items.findIndex((i) => i.href === MINE) + 1);

// =====================================================================
section("B. The approval chain shown before sending, and what sending then does");
const CHAINS = {
  arjun: ["Your claim goes to Sneha Rao, then Finance.", ["You send the claim: Arjun Kapoor", "Manager approval: Sneha Rao", "Finance approval: Kabir Shah", "Payment: Finance or an Admin pays approved claims"]],
  kabir: ["Your claim goes to Aarav Mehta.", ["You send the claim: Kabir Shah", "Manager approval: Aarav Mehta", "Finance approval skipped: Nobody else can decide the Finance stage", "Payment: Finance or an Admin pays approved claims"]],
  ananya: ["Your claim goes to Finance.", ["You send the claim: Ananya Iyer", "Manager approval skipped: No manager on file", "Finance approval: Kabir Shah", "Payment: Finance or an Admin pays approved claims"]],
  aarav: ["As an Admin, your claim is approved as soon as you send it.", ["You send the claim: Aarav Mehta", "Approved automatically: Admin claims don't need approval", "Payment: Finance pays it"]],
};
for (const [who, [sub, steps]] of Object.entries(CHAINS)) {
  fresh(); await open(CLAIM, who);
  check("B1", `${who}: subtitle and chain before any amount (up to ₹50,000)`, subtitle() === sub && j(chain()) === j(steps), j([subtitle(), chain()]));
}
fresh(); await open(CLAIM, "arjun");
set("expense-amount", "62000");
check("B2", "above ₹50,000 the chain adds the Admin stage, as the amount is typed", j(chain().slice(1, 4)) === j(["Manager approval: Sneha Rao", "Finance approval: Kabir Shah", "Admin approval: Aarav Mehta"]) && subtitle() === "Your claim goes to Sneha Rao, then Finance, then an Admin.");
set("expense-amount", "50000");
check("B3", "exactly ₹50,000: no Admin stage", !chain().some((s) => s.startsWith("Admin")));
// What the page previewed = what submitExpense then did (same store rules), for each person and both sides of the limit.
const agree = [];
for (const who of ["arjun", "kabir", "ananya", "rohan", "vikram"]) {
  for (const amount of [1200, 62000]) {
    fresh(); await open(CLAIM, who);
    const route = E.previewRoute(WHO[who][2], amount);
    const claim = E.submitExpense(WHO[who][2], { category: "travel", amount, date: "2026-09-29", reason: "x", receipt: "r" }).record;
    const skipped = claim.history.filter((h) => h.decision === "skipped").map((h) => h.stage);
    const ok = claim.stage === route.find((r) => r.holderIds.length)?.stage
      && j(skipped) === j(route.slice(0, route.findIndex((r) => r.holderIds.length)).map((r) => r.stage))
      && j(E.waitingOn(claim)) === j(route.find((r) => r.holderIds.length).holderIds);
    agree.push(`${who}/${amount}:${ok ? "ok" : `${claim.stage} vs ${j(route)}`}`);
  }
}
check("B4", "previewRoute = what submitExpense does: same first stage, same skips before it, same people waited on (5 people x 2 amounts)", agree.every((a) => a.endsWith(":ok")), agree.join(" "));
fresh();
S.updateUser(USER_ACTOR("admin", KABIR), KABIR, { reportingManager: "" });
await open(CLAIM, "kabir");
check("B5", "the all-skipped fallback is previewed too: Kabir with no manager -> manager and Finance skipped, then an Admin", j(chain().slice(1, 4)) === j(["Manager approval skipped: No manager on file", "Finance approval skipped: Nobody else can decide the Finance stage", "Admin approval: Aarav Mehta"])
  && E.submitExpense(KABIR, { category: "travel", amount: 1200, date: "2026-09-29", reason: "x", receipt: "r" }).record.stage === "admin", j(chain()));
S.resetDemoData();
check("B6", "previewRoute: [] for an Admin (approved at once), an inactive person (Divya can't send) and an unknown id", [AARAV, "EMP-1061", "EMP-9999"].every((id) => j(E.previewRoute(id, 1200)) === "[]"));

// =====================================================================
section("C. Validation: the store's message, at its field");
fresh(); await open(CLAIM, "arjun");
const before = E.allExpenses().length;
send();
check("C1", "nothing filled: 'Choose a category.' at the category (the form is novalidate: one source of errors)", j(errors()) === j(["expense-category: Choose a category."]) && $("expense-form").noValidate && d.activeElement === $("expense-category")
  && $("expense-category").getAttribute("aria-describedby") === "expense-category-error");
const CASES = [
  [{ amount: "8,400" }, "expense-amount: Enter the amount in whole rupees, more than ₹0."],
  [{ amount: "0" }, "expense-amount: Enter the amount in whole rupees, more than ₹0."],
  [{ amount: "120.50" }, "expense-amount: Enter the amount in whole rupees, more than ₹0."],
  [{ date: "" }, "expense-date: Pick a valid date."],
  [{ date: "2026-10-01" }, "expense-date: The date can't be in the future."],
  [{ date: "2026-08-30" }, "expense-date: Claims must be sent within 30 days of the spending."],
  [{ reason: "  " }, "expense-reason: Reason is required."],
];
const got = [];
for (const [f, want] of CASES) { fill(f); send(); got.push(j(errors()) === j([want]) ? "ok" : `${j(f)} -> ${j(errors())}`); }
check("C2", "amount with a comma, 0, paise; no date, a future date, 31 days old; a blank reason: each at its field, one error at a time", got.every((g) => g === "ok"), got.join(" | "));
check("C3", "nothing was stored by any refused attempt, and no toast", E.allExpenses().length === before && toasts().length === 0);
fill({ date: "2026-08-31" }); send();
check("C4", "day 30 is allowed (31 days isn't)", E.allExpenses().length === before + 1 && errors().length === 0);
fresh(); await open(CLAIM, "arjun");
fill({ amount: "abc" }); send();
set("expense-amount", "1");
check("C5", "editing the field clears its error", errors().length === 0 && !$("expense-amount").hasAttribute("aria-describedby"));

// =====================================================================
section("D. The receipt advisory");
fresh(); await open(CLAIM, "arjun");
const hint = () => [$("expense-receipt-hint").dataset.missing, txt($("expense-receipt-hint"))];
set("expense-receipt", ""); set("expense-amount", "500");
const at500 = hint();
set("expense-amount", "501");
const at501 = hint();
set("expense-receipt", "bill.jpg");
check("D1", "the hint: ₹500 without a receipt is fine; ₹501 without one says it may be rejected; adding a name clears it",
  at500[0] === "false" && at501[0] === "true" && at501[1] === "Claims above ₹500 need a receipt. You can still send it, but it may be rejected without one." && hint()[0] === "false"
  && hint()[1] === "Needed above ₹500. Only the name is kept: no file is uploaded in this demo.", j([at500, at501, hint()]));
clearToasts();
fill({ amount: "1200", receipt: "" }); send();
const noReceipt = E.expensesFor(ARJUN).at(-1);
check("D2", "sent without a receipt above ₹500: not refused; the store's advisory as a warning toast, then 'Expense claim sent.'",
  noReceipt.amount === 1200 && noReceipt.receipt === null && j(toasts()) === j([{ type: "warning", text: "Claims above ₹500 need a receipt. Without one, this claim may be rejected." }, { type: "success", text: "Expense claim sent." }]), j(toasts()));

// =====================================================================
section("E. Sending");
fresh(); await open(CLAIM, "rohan");
clearToasts();
fill({ category: "meals", amount: " 2150 ", date: "2026-09-28", reason: "Team lunch", receipt: "bill.jpg" }); send();
const sent = E.expensesFor(ROHAN).at(-1);
check("E1", "stored as entered, for the signed-in person: category key, the amount as a number, the date, the reason, the receipt name",
  sent.userId === ROHAN && sent.category === "meals" && sent.amount === 2150 && sent.date === "2026-09-28" && sent.reason === "Team lunch" && sent.receipt === "bill.jpg" && sent.status === "pending" && sent.stage === "manager" && sent.managerId === SNEHA);
check("E2", "one success toast, the button disabled (no second claim), and the move to My requests scheduled", j(toasts()) === j([{ type: "success", text: "Expense claim sent." }]) && d.querySelector('#expense-form [type="submit"]').disabled && timers.includes(1200));
check("E3", "the category list comes from CATEGORIES (all five, by key)", j([...$("expense-category").options].map((o) => `${o.value}|${o.textContent}`)) === j(["|Choose a category", "travel|Travel", "meals|Meals", "fuel|Fuel", "software|Software", "other|Other"]));
fresh(); await open(CLAIM, "aarav");
clearToasts(); fill(); send();
const own = E.expensesFor(AARAV).at(-1);
check("E4", "an Admin's own claim: approved at once (5B), and the toast says so", own.status === "approved" && toasts().at(-1)?.text === "Claim approved. Admin claims are approved automatically.");
check("E5", "no claim data went through innerHTML", !htmlWrites.some((h) => /Cab to the client|Team lunch|bill\.jpg/.test(h)), `${htmlWrites.length} writes`);

// =====================================================================
section("F. My requests");
fresh(); await open(MINE, "arjun");
const expRows = () => reqRows().filter((r) => r[1] === "Expense");
check("F1", "Arjun's two real claims replace the static row: EXP-3106 pending with Sneha, EXP-3101 rejected by Kabir with its note",
  j(expRows()) === j([["Travel, ₹1,850", "Expense", "25 Sep", "Sneha Rao", "Pending", "Cancel"], ["Meals, ₹3,200", "Expense", "2 Aug", "Kabir Shah", "Rejected", "Bill missing: claims above ₹500 need a receipt."]])
  && !d.querySelector('tr[data-type="expense"]') && !d.querySelector("tr[data-sample]"), j(expRows()));
check("F2", "Cancel is the existing pattern: requests:cancel, only on the pending claim", rowOf("EXP-3106").querySelector("button").dataset.permission === "requests:cancel" && !rowOf("EXP-3101").querySelector("button"));
check("F3", "the header offers 'Claim an expense' (expenses:create) next to 'Apply for leave'", [...d.querySelectorAll(".page-header__actions a")].filter((a) => !a.hidden).map(txt).join(", ") === "Apply for leave, Claim an expense, Request an asset"
  && d.querySelector('.page-header__actions a[href="claim-expense.html"]').dataset.permission === "expenses:create");
confirmAnswer = false; clearToasts();
rowOf("EXP-3106").querySelector("button").click();
check("F4", "Cancel asks first; Cancel in the dialog changes nothing", confirms[0] === "Cancel your expense claim for Travel, ₹1,850?" && E.getExpense("EXP-3106").status === "pending" && toasts().length === 0, j(confirms));
confirmAnswer = true;
rowOf("EXP-3106").querySelector("button").click();
check("F5", "OK: cancelled through cancelExpense, fixed toast, the row now Cancelled with no button", E.getExpense("EXP-3106").status === "cancelled" && j(toasts()) === j([{ type: "success", text: "Expense claim cancelled." }])
  && j(reqRows().find((r) => r[0] === "Travel, ₹1,850")) === j(["Travel, ₹1,850", "Expense", "25 Sep", "—", "Cancelled", ""]));
fresh(); await open(MINE, "arjun");
E.decideExpense("EXP-3106", SNEHA, "emp", "approve");               // approved at one stage after the page was drawn:
clearToasts(); confirmAnswer = false;                              // still pending, so still the claimant's to cancel (5B)
rowOf("EXP-3106").querySelector("button").click();
check("F6", "approved at the manager stage after the page was drawn: still pending, so Cancel is still offered (the redraw shows it with Finance)",
  confirms.length === 1 && (E.getExpense("EXP-3106").status === "pending") && (await open(MINE, "arjun"), reqRows().find((r) => r[0] === "Travel, ₹1,850")[3] === "Kabir Shah" && Boolean(rowOf("EXP-3106").querySelector("button"))));
confirmAnswer = true;
E.decideExpense("EXP-3106", KABIR, "fin", "reject", "Duplicate");    // rejected after the page was drawn
clearToasts();
rowOf("EXP-3106").querySelector("button").click();
check("F6b", "rejected after the page was drawn: the store refuses, a fixed toast, and the redraw shows it Rejected with the note",
  j(toasts()) === j([{ type: "danger", text: "Couldn't cancel the claim. It may already have been decided." }]) && j(reqRows().find((r) => r[0] === "Travel, ₹1,850")?.slice(3)) === j(["Kabir Shah", "Rejected", "Duplicate"]), j(reqRows().find((r) => r[0] === "Travel, ₹1,850")));
fresh(); await open(MINE, "rohan");
check("F7", "Rohan: EXP-3103 pending with Aarav; EXP-3102 paid -> 'Paid' badge, With = who paid", j(expRows().map((r) => [r[0], r[3], r[4]])) === j([["Travel, ₹62,000", "Aarav Mehta", "Pending"], ["Meals, ₹2,150", "Aarav Mehta", "Paid"]]), j(expRows()));
check("F8", "a paid claim counts under Approved", pills() === `All=${reqRows().length} Pending=${reqRows().filter((r) => r[4] === "Pending").length} Approved=${reqRows().filter((r) => ["Approved", "Paid"].includes(r[4])).length} Rejected=${reqRows().filter((r) => r[4] === "Rejected").length}`
  && ([...d.querySelectorAll(".tabs__tab")].find((p) => txt(p).startsWith("Approved")).click(), expRows().some((r) => r[4] === "Paid")), pills());
[...d.querySelectorAll(".tabs__tab")].find((p) => txt(p).startsWith("All")).click();
typeFilter("Expense");
check("F9", "the Expense type filter: only his claims", reqRows().length === 2 && reqRows().every((r) => r[1] === "Expense"));
fresh(); await open(MINE, "aarav");
check("F10", "Aarav's own approved claim: With = 'Payment: Kabir Shah'", j(expRows()) === j([["Software, ₹6,200", "Expense", "10 Sep", "Payment: Kabir Shah", "Approved", ""]]), j(expRows()));

// =====================================================================
section("G. Progress steps from each claim's own history");
const steps = async (id) => { const V = await import("./js/ui/expense-view.js"); const ol = d.createElement("ol"); ol.append(...V.expenseSteps(E.getExpense(id))); return stepsIn(ol); };
fresh(); await open(MINE, "arjun");
const side = $("request-progress");
check("G1", "My requests' side card follows the newest pending request of any kind: Arjun's claim (sent 25 Sep), with its steps",
  txt(side.querySelector(".card__title")) === "Expense: Travel, ₹1,850" && j(stepsIn(side)) === j(["done:Sent (25 Sep by you)", "current:Manager approval (Waiting for Sneha Rao)", "-:Finance approval (Finance)", "-:Payment (Finance or an Admin pays approved claims)"]), j(stepsIn(side)));
check("G2", "manager skipped (Ananya, no manager): shown as skipped with the store's note; Finance current, waiting for Kabir",
  j(await steps("EXP-3104")) === j(["done:Sent (17 Sep by you)", "done:Manager approval skipped (No manager on file)", "current:Finance approval (Waiting for Kabir Shah)", "-:Payment (Finance or an Admin pays approved claims)"]), j(await steps("EXP-3104")));
check("G3", "three stages (Rohan's ₹62,000): manager and Finance done by whom and when, Admin current, waiting for Aarav",
  j(await steps("EXP-3103")) === j(["done:Sent (18 Sep by you)", "done:Manager approval (Approved by Sneha Rao, 21 Sep)", "done:Finance approval (Approved by Kabir Shah, 23 Sep)", "current:Admin approval (Waiting for Aarav Mehta)", "-:Payment (Finance or an Admin pays approved claims)"]), j(await steps("EXP-3103")));
check("G4", "paid (EXP-3102): every stage done, payment done by whom and when",
  j(await steps("EXP-3102")) === j(["done:Sent (15 Sep by you)", "done:Manager approval (Approved by Sneha Rao, 16 Sep)", "done:Finance approval (Approved by Kabir Shah, 17 Sep)", "done:Payment (Paid by Aarav Mehta, 22 Sep)"]), j(await steps("EXP-3102")));
check("G5", "an Admin's own claim (EXP-3107): approved automatically at both stages; payment current, waiting for Kabir",
  j(await steps("EXP-3107")) === j(["done:Sent (10 Sep by you)", "done:Manager approval (Approved automatically (Admin))", "done:Finance approval (Approved automatically (Admin))", "current:Payment (Waiting for Kabir Shah)"]), j(await steps("EXP-3107")));
check("G6", "rejected (EXP-3101): Finance rejected by Kabir; payment not reached",
  j(await steps("EXP-3101")) === j(["done:Sent (2 Aug by you)", "done:Manager approval (Approved by Sneha Rao, 3 Aug)", "done:Finance approval (Rejected by Kabir Shah, 4 Aug)", "-:Payment (Finance or an Admin pays approved claims)"]), j(await steps("EXP-3101")));
S.updateUser(USER_ACTOR("admin", KABIR), KABIR, { reportingManager: "" });
const fallback = E.submitExpense(KABIR, { category: "travel", amount: 1200, date: "2026-09-29", reason: "x", receipt: "r" }).record;
check("G7", "the all-skipped fallback: both skips shown, then the Admin stage the chain for ₹1,200 doesn't have",
  j(await steps(fallback.id)) === j(["done:Sent (30 Sep by you)", "done:Manager approval skipped (No manager on file)", "done:Finance approval skipped (Nobody else can decide the Finance stage)", "current:Admin approval (Waiting for Aarav Mehta)", "-:Payment (Finance or an Admin pays approved claims)"]), j(await steps(fallback.id)));
E.decideExpense(fallback.id, AARAV, "admin", "approve");
check("G9", "a stage only the history shows (that fallback claim, approved at the Admin stage) is still listed, done",
  j(await steps(fallback.id)) === j(["done:Sent (30 Sep by you)", "done:Manager approval skipped (No manager on file)", "done:Finance approval skipped (Nobody else can decide the Finance stage)", "done:Admin approval (Approved by Aarav Mehta, 30 Sep)", "current:Payment (Waiting for Aarav Mehta)"]), j(await steps(fallback.id)));   // 5B's final-approver fallback: Kabir can't pay his own
S.resetDemoData();
const later = E.submitExpense(ROHAN, { category: "travel", amount: 62000, date: "2026-09-29", reason: "x", receipt: "r" }).record;
check("G8", "stages not reached yet name who decides them: the manager by name, then Finance, then an Admin",
  j((await steps(later.id)).slice(1, 4)) === j(["current:Manager approval (Waiting for Sneha Rao)", "-:Finance approval (Finance)", "-:Admin approval (An Admin)"]));

const dots = await (async () => { const V = await import("./js/ui/expense-view.js"); return V.expenseSteps(E.getExpense("EXP-3103")).map((li) => li.querySelector(".stepper__dot").textContent); })();
check("G10", "step numbers run on: done steps show a tick, the current and later ones 4 and 5 (Rohan's three-stage claim)", j(dots) === j(["", "", "", "4", "5"]), j(dots));

// =====================================================================
section("H. The role editor's Expenses row");
fresh(); await open(EDITOR, "aarav");
// Round 6H: the role page (HR Manager when no ?role=) is drawn from roles.js / permissions.js: one row per module.
const row = [...d.querySelectorAll("#matrix-rows tr")].find((tr) => txt(tr.querySelector(".matrix__module-name")) === "Expenses");
// A missing row (e.g. the old static page) is a FAIL with a reason, not a crash: the 6E pieces() / btn() pattern.
const cells = [...(row?.querySelectorAll(".perm-tick") ?? [])].map((t) => `${t.dataset.permissionKey}${t.querySelector(".matrix__yes") ? "+" : ""}`);
check("H1", "the Expenses row: view | approve | pay | create, only create ticked (HR has it via SELF_SERVICE); no edit / delete", j(cells) === j(["expenses:view", "expenses:approve", "expenses:pay", "expenses:create+"]), row ? j(cells) : "(missing) no drawn Expenses row in #matrix-rows");
const pageBoxes = [...d.querySelectorAll('#matrix-rows .perm-tick[data-permission-key^="expenses:"]')].map((t) => t.dataset.permissionKey);
check("H2", "every expenses permission shown is real, and all of them are shown: expenses:pay too (it had no column before 6H)", pageBoxes.every((p) => ALL_PERMISSIONS.includes(p)) && j(pageBoxes.slice().sort()) === j(ALL_PERMISSIONS.filter((p) => p.startsWith("expenses:")).sort()));
// Round 11N (behaviour; behaviour; was 77: users:delete (round 11N) is a 78th permission, so the page draws it)
// Round Manager scoping part 1 (behaviour; was 45 of 78: dashboard:finance is a 79th permission)
check("H3", "the count: '45 of 79', drawn; the static HTML holds no count (a '—' until the script runs)", txt(row?.closest(".card")?.querySelector(".card__meta")) === "45 of 79" && /<span class="card__meta" id="permission-count">—<\/span>/.test(read(EDITOR)));

// =====================================================================
section("I. Access");
for (const who of ["arjun", "priya", "kabir", "aarav"]) {
  fresh(); await open(CLAIM, who);
  check("I1", `${who}: can open the claim page (no redirect) and sees 'Claim expense' in the nav`, navigations.length === 0 && jsErrors.length === 0 && navLabels().includes("Claim expense"), navLabels().join(","));
}
fresh(); await open(CLAIM, null);
check("I2", "nobody signed in: sent to sign in", navigations.length === 1);
fresh(); await open(CLAIM, "oldEmp");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("I3", "an old session (no employee id): signed out and sent to sign in (round 11P, N2); the static page as it is, nothing sent", navigations.length === 1 && localStorage.getItem("officeos:session") === null && txt($("expense-chain")).includes("Your manager") && (send(), E.allExpenses().length === 7));

// =====================================================================
section("J. The pages vs before this round (html-pre5D)");
// Since Round 5F, this round's result is read frozen (html-pre5F, js-pre5F): 5F has moved the live tree on.
const read5D = (p) => src("html-pre5F", p);
const crlf = (pairs) => pairs.map(([a, b]) => [a.replace(/\n/g, "\r\n"), b.replace(/\n/g, "\r\n")]);
const applyAll = (pre, pairs) => crlf(pairs).reduce((s, [a, b]) => (s.split(a).length === 2 ? s.replace(a, b) : `(${a.slice(0, 50)} found ${s.split(a).length - 1}x)`), pre);
const mineEdits = [
  ['      <a class="btn" href="../leave/apply-leave.html" data-permission="leave:create">Apply for leave</a>\n', '      <a class="btn" href="../leave/apply-leave.html" data-permission="leave:create">Apply for leave</a>\n      <a class="btn" href="claim-expense.html" data-permission="expenses:create">Claim an expense</a>\n'],
  ["data-sample rows are replaced by the real leave and attendance-correction requests (my-requests.js).\n                 data-static rows are sample asset and expense requests, kept as they are.",
    "data-sample rows are replaced by the real leave requests, attendance corrections and expense claims (my-requests.js).\n                 data-static rows are sample asset requests, kept as they are."],
  ['<tr data-static data-type="expense" data-status="rejected" data-sent="2026-08-02">', '<tr data-sample="expense">'],
];
const mineAfter = applyAll(src("html-pre5D", MINE), mineEdits);
check("J1", "my-requests.html = before + exactly 3 edits (the header button, the comment, the expense row now a sample)", mineAfter === read5D(MINE), mineAfter.startsWith("(") ? mineAfter : "3 edits");
const editorAfter = applyAll(src("html-pre5D", EDITOR), [
  ['<input type="checkbox" value="expenses:create" aria-label="expenses:create"></label></td>\n              <td><label class="check"><input type="checkbox" value="expenses:edit" aria-label="expenses:edit"></label></td>\n              <td><label class="check"><input type="checkbox" value="expenses:delete" aria-label="expenses:delete"></label></td>',
    '<input type="checkbox" value="expenses:create" aria-label="expenses:create" checked></label></td>\n              <td class="matrix__na">–</td>\n              <td class="matrix__na">–</td>'],
  ['<span class="card__meta">18 of 42 enabled</span>', '<span class="card__meta">19 of 40 enabled</span>'],
]);
check("J2", "role-editor.html = before + exactly 2 edits (the Expenses row, the count)", editorAfter === read5D(EDITOR), editorAfter.startsWith("(") ? editorAfter : "2 edits");
const outside = (html) => html.slice(0, html.indexOf("<main")) + html.slice(html.indexOf("</main>"));
const shell = outside(src("html-pre5D", "leave/apply-leave.html")).replace("<title>Apply for leave | OfficeOS</title>", "<title>Claim an expense | OfficeOS</title>")
  .replace("<strong>Apply for leave</strong>", "<strong>Claim an expense</strong>").replace("pages/apply-leave.js", "pages/claim-expense.js").replaceAll('class="nav__item is-active"', 'class="nav__item"');
check("J3", "claim-expense.html: apply-leave.html's shell (sidebar, topbar, scripts) with its own title, crumb and script; only <main> is new", outside(read5D(CLAIM)) === shell);
const others = (() => { const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
  const pre = new URL("./html-pre5D", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
  return walk(pre).filter((p) => p.endsWith(".html") && ![MINE, EDITOR].includes(p) && read5D(p) !== fs.readFileSync(`${pre}/${p}`, "utf8")); })();
check("J4", "every other existing page is unchanged", others.length === 0, j(others));

// =====================================================================
section("K. Source layout");
const walkRel = (dir, base = "") => fs.readdirSync(new URL(`./${dir}/${base}`, import.meta.url), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walkRel(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const LIVE = walkRel("js-pre5F"), PRE = walkRel("js-pre5D");
const changed = LIVE.filter((p) => !PRE.includes(p) || src("js-pre5F", p) !== src("js-pre5D", p));
const JS_CHANGED = ["config/nav.js", "config/permissions.js", "config/roles.js", "config/routes.js", "data/expenses-store.js", "pages/claim-expense.js", "pages/my-requests.js", "ui/expense-view.js"];
check("K1", "js: exactly these 8 files changed or added (one new page script); nothing removed", j(changed) === j(JS_CHANGED) && PRE.every((p) => LIVE.includes(p)), j(changed));
const undo = (p, pairs) => crlf(pairs).reduce((s, [a, b]) => s.replace(a, b), src("js-pre5F", p)) === src("js-pre5D", p);
check("K2", "config: one action in permissions.js, one line in SELF_SERVICE, one route, one nav item; nothing else",
  undo("config/permissions.js", [['  expenses:      ["view", "approve", "pay", "create"],   // create: send your own claim (every role, SELF_SERVICE)', '  expenses:      ["view", "approve", "pay"],']])
  && undo("config/roles.js", [['  "expenses:create",\n', ""]])
  && undo("config/routes.js", [['  "requests/claim-expense.html":   "expenses:create",\n', ""]])
  && undo("config/nav.js", [['      { label: "Claim expense",   icon: "wallet",   href: "requests/claim-expense.html",     permission: "expenses:create" },\n', ""]]));
const store = src("js-pre5F", "data/expenses-store.js").replace(/\r\n/g, "\n");
const added = store.match(/\/\/ Where a claim of this amount[\s\S]*?\n}\n\n/)?.[0] ?? "(missing)";
check("K3", "data/expenses-store.js: only previewRoute() added (a read; nothing stored); submitExpense, decideExpense and the rest byte-for-byte as before",
  store.replace(added, "") === src("js-pre5D", "data/expenses-store.js").replace(/\r\n/g, "\n") && /export function previewRoute\(userId, amount\)/.test(added) && !/expenses\.(add|update)|save\(/.test(added));
const fn = (s, name) => s.replace(/\r\n/g, "\n").match(new RegExp(`export function ${name}\\([\\s\\S]*?\\n}\\n`))?.[0];
check("K4", "submitExpense itself is untouched (the round's premise: page and permission work, no data-layer change to sending)", fn(src("js-pre5F", "data/expenses-store.js"), "submitExpense") === fn(src("js-pre5D", "data/expenses-store.js"), "submitExpense"));
const code = (p) => src("js-pre5F", p).split(/\r?\n/).filter((l) => !l.trim().startsWith("//")).join("\n");
check("K5", "the claim page sends only through submitExpense (for the signed-in person) and previews only through previewRoute; no innerHTML",
  /submitExpense\(user\.id, \{/.test(code("pages/claim-expense.js")) && /previewRoute\(user\.id, amount\)/.test(code("pages/claim-expense.js")) && !/innerHTML|localStorage|decideExpense|managerFor|chainFor/.test(code("pages/claim-expense.js")));
check("K6", "My requests cancels only through cancelExpense(claim.id, user.id); its steps come from ui/expense-view.js (no second copy)",
  /cancelExpense\(claim\.id, user\.id\)/.test(code("pages/my-requests.js")) && /expenseSteps\(request\)/.test(code("pages/my-requests.js")) && LIVE.filter((p) => /function expenseSteps/.test(code(p))).join() === "ui/expense-view.js");
check("K7", "changed and new files: CRLF only, no final newline",
  [...JS_CHANGED.map((p) => fs.readFileSync(new URL(`./js-pre5F/${p}`, import.meta.url), "utf8")), read5D(CLAIM), read5D(MINE), read5D(EDITOR)].every((s) => !/[^\r]\n/.test(s) && !/\r(?!\n)/.test(s) && !s.endsWith("\n")));
check("ERR", "no uncaught JS errors on the last page load", jsErrors.length === 0, jsErrors.join(" / "));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;