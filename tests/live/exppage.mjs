// usage: node exppage.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 5C: finance/expenses.html with the js in ./js, in jsdom. Fixed clock: Wed 30 Sep 2026 11:00 local.
// ./js-pre5C and ./html-pre5C are the code and pages before this round (Round 5B's result). Since Round 5E,
// section M reads Round 5C's own result frozen (./js-pre5E), as this round's js has moved on.
//   A  Kabir Shah (Finance) on the seed: stats, tabs, rows, receipts, who may act, side cards, Pay, Export
//   B  Aarav Mehta (Admin): Approve/Reject only at the Admin stage; can't pay what someone else can
//   C  the manager stage is never decided on this page, even by the manager (decision 2)
//   D  approving: confirm, the stage-aware toast, a stale row, figures after
//   E  rejecting: the modal, a note is required, the note shown as text
//   F  paying: confirm, several at once, the final-approver fallback's note
//   G  search and category filter;  H  pagination
//   I  edge states: nothing approved yet, no large claim, a stuck claim, a cancelled claim
//   J  processingDays / averageProcessingDays (decision 4)
//   K  people who may not see the page; an old session with no employee id
//   L  expenses.html vs the page before this round;  M  source layout (frozen copies + live)
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HTML = fs.readFileSync(`${DIR}/finance/expenses.html`, "utf8");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const PRE_HTML = src("html-pre5C", "finance/expenses.html");
// Since Round 5F, section L reads this round's page frozen (html-pre5F, 5D's result): 5F emptied the static fallback.
const HTML_5C = src("html-pre5F", "finance/expenses.html");
const STATIC_5C = new JSDOM(HTML_5C).window.document;

const RealDate = Date;
const NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
let lastBlob = null;
URL.createObjectURL = (blob) => { lastBlob = blob; return "blob:test"; };
URL.revokeObjectURL = () => {};

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029",
  ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const WHO = {
  kabir: ["fin", "Kabir Shah", KABIR], aarav: ["admin", "Aarav Mehta", AARAV],
  priya: ["hr", "Priya Nair", PRIYA], arjun: ["emp", "Arjun Kapoor", ARJUN], sneha: ["emp", "Sneha Rao", SNEHA],
  oldFin: ["fin", "Kabir Shah", undefined],
};

let loads = 0, w = null, d = null, saved = {};
let jsErrors = [], navigations = [], htmlWrites = [], confirms = [], confirmAnswer = true;
async function open(who) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = []; navigations = []; htmlWrites = []; confirms = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else jsErrors.push(e.message); });
  const dom = new JSDOM(HTML, { url: "http://localhost/office-os/pages/finance/expenses.html", virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  const proto = w.Element.prototype;
  const inner = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", { get: inner.get, set(v) { htmlWrites.push(String(v)); inner.set.call(this, v); }, configurable: true });
  w.HTMLAnchorElement.prototype.click = function () {};
  w.confirm = (m) => { confirms.push(m); return confirmAnswer; };
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  const auth = await import("./js/core/auth.js");
  if (!who) auth.signOut(); else auth.signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/expenses.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
// Back to the seed (the session is kept by open()).
function fresh() { if (w) w.localStorage.clear(); saved = {}; }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;

const E = await import("./js/data/expenses-store.js");
const X = await import("./js/data/expenses.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs

// ---- independent arithmetic (not the app's code) ----
const money = (n) => `₹${n.toLocaleString("en-IN")}`;
const DAY = 24 * 60 * 60 * 1000;
const days = (from, to) => (RealDate.parse(to) - RealDate.parse(from)) / DAY;
const NOW_ISO = new RealDate(NOW).toISOString();
const SEED_3102 = days("2026-09-15T09:30:00.000Z", "2026-09-17T10:00:00.000Z");   // sent -> Kabir's (final) approval

// ---- readers ----
const $ = (id) => d.getElementById(id);
const rowEls = () => [...$("expense-rows").children];
// A cell's separate pieces of text joined with a space (as the CSV export reads them), avatar initials included.
const cellText = (td) => { const out = [], tw = d.createTreeWalker(td, w.NodeFilter.SHOW_TEXT); for (let n = tw.nextNode(); n; n = tw.nextNode()) { const t = n.textContent.replace(/\s+/g, " ").trim(); if (t) out.push(t); } return out.join(" "); };
const rows = () => rowEls().map((tr) => [...tr.children].map(cellText));
const rowOf = (id) => rowEls().find((tr) => tr.dataset.claimId === id);
const shownIds = () => rowEls().map((tr) => tr.dataset.claimId ?? `(${txt(tr)})`);
const visibleButtons = (tr) => [...(tr?.querySelectorAll("button") ?? [])].filter((b) => !b.hidden).map((b) => b.textContent.trim());
const actionText = (id) => txt(rowOf(id)?.lastElementChild);
const pill = (label) => [...d.querySelectorAll(".table__toolbar .tabs__tab")].find((p) => txt(p).startsWith(label));
const tab = (label) => pill(label).click();
const pills = () => [...d.querySelectorAll(".table__toolbar .tabs__tab")].map((p) => `${txt(p).replace(/ \S+$/, "")}=${txt(p.querySelector(".badge--count"))}`).join(" ");
const statEl = (k) => d.querySelector(`[data-stat="${k}"]`);
const tone = (k) => statEl(k).querySelector(".stat__delta").className.replace("stat__delta", "").replace(" stat__delta--", "") || "-";
const stat = (k) => `${txt(statEl(k).querySelector(".stat__label"))}: ${txt(statEl(k).querySelector(".stat__value"))} / ${txt(statEl(k).querySelector(".stat__delta"))} (${tone(k)})`;
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => ({ type: t.className.replace("toast toast--", ""), text: txt(t.querySelector(".toast__text")) }));
const clearToasts = () => d.querySelectorAll(".toast").forEach((t) => t.remove());
const button = (id, label) => [...(rowOf(id)?.querySelectorAll("button") ?? [])].find((b) => b.textContent.trim() === label);
const modal = () => $("reject-expense-modal");
const rejectWith = (note) => { $("reject-expense-note").value = note; modal().querySelector('button[type="submit"]').click(); };
const spend = () => [...$("expense-spend").querySelectorAll(".bar-row")].map((r) => `${txt(r.children[0])} ${txt(r.querySelector(".bar-row__value"))} ${r.querySelector(".bar-row__fill").style.getPropertyValue("--w")}`);
const policy = (root) => [...root.querySelectorAll(".kv__row")].map((r) => `${txt(r.querySelector("dt"))}: ${txt(r.querySelector("dd"))}`);
const payBtn = () => $("pay-approved");
const search = (v) => { $("expense-search").value = v; $("expense-search").dispatchEvent(new w.Event("input", { bubbles: true })); };
const category = (v) => { $("expense-category").value = v; $("expense-category").dispatchEvent(new w.Event("change", { bubbles: true })); };
const status = (id) => E.getExpense(id)?.status;
const decide = (id, who, decision, note) => E.decideExpense(id, who, S.getUser(who).role, decision, note);
const submit = (who, f = {}) => E.submitExpense(who, { category: "travel", amount: 1500, date: "2026-09-28", reason: "Cab", receipt: "r.pdf", ...f });
async function csvRows() {
  lastBlob = null;
  d.querySelector("[data-export]").click();
  if (!lastBlob) return null;
  return new TextDecoder("utf-8").decode(new Uint8Array(await lastBlob.arrayBuffer())).replace(/^﻿/, "").split("\r\n");
}

// =====================================================================
section("A. Kabir Shah (Finance) on the seed");
await open("kabir");
fresh();
await open("kabir");
check("A1", "page loads: no JS errors, no redirect, and the claims are now stored (officeos:expense-claims)", jsErrors.length === 0 && navigations.length === 0 && w.localStorage.getItem("officeos:expense-claims") !== null, jsErrors.join(" / "));
check("A2", "stat cards: real totals over every claim held (no month): open 4 / ₹77,050; approved ₹6,200 / 1; rejected 1 / ₹3,200; average 2.0 days",
  [stat("open"), stat("approved"), stat("rejected"), stat("processing")].join(" | ")
  === `Open claims: 4 / ${money(4800 + 8400 + 62000 + 1850)} to review (down) | Approved, to pay: ${money(6200)} / 1 claim waiting to be paid (up) | Rejected: 1 / ${money(3200)} in total (-) | Average processing: ${SEED_3102.toFixed(1)} days / Target is 3 days (up)`,
  [stat("open"), stat("approved"), stat("rejected"), stat("processing")].join(" | "));
check("A3", "no 'this month' (or 'Sep') framing left in the stat strip or the spend card", !/this month|\bSep\b/.test(txt(d.querySelector(".stat-strip")) + txt($("expense-spend").closest(".card"))));
const statusCount = (s) => E.allExpenses().filter((c) => c.status === s).length;
check("A4", "tab counts = the store's claims per status: Pending 4, Approved 1, Paid 1, Rejected 1", pills() === "Pending=4 Approved=1 Paid=1 Rejected=1"
  && pills() === `Pending=${statusCount("pending")} Approved=${statusCount("approved")} Paid=${statusCount("paid")} Rejected=${statusCount("rejected")}`, pills());
check("A5", "Pending tab: every pending claim, oldest sent first (Vikram 12 Sep, Ananya 17 Sep, Rohan 18 Sep, Arjun 25 Sep)", j(shownIds()) === j(["EXP-3105", "EXP-3104", "EXP-3103", "EXP-3106"]), j(shownIds()));
check("A6", "a row: avatar, name + department, category + reason, spend date, amount, receipt name, stage, actions",
  j(rows()[0]) === j(["VS Vikram Singh Operations", "Fuel Fuel for store deliveries, 1 to 12 Sep", "12 Sep", "₹4,800", "fuel-sep.pdf", "With Finance", "Reject Approve"])
  && rowOf("EXP-3105").querySelector(".expense-amount") !== null && txt(rowOf("EXP-3105").querySelector(".avatar")) === "VS", j(rows()[0]));
const badge = (id) => rowOf(id).children[5].querySelector(".badge");
check("A7", "stage badges name the CURRENT stage: With Finance (info), With Admin (warning), With manager (warning)",
  ["EXP-3105", "EXP-3104", "EXP-3103", "EXP-3106"].map((id) => `${txt(badge(id))}|${badge(id).className}`).join(" ; ")
  === "With Finance|badge badge--info badge--dot ; With Finance|badge badge--info badge--dot ; With Admin|badge badge--warning badge--dot ; With manager|badge badge--warning badge--dot");
check("A8", "Reject/Approve only on the two Finance-stage claims (data-permission expenses:approve); the others say who they wait for",
  j(shownIds().map((id) => [id, visibleButtons(rowOf(id)).join("+") || actionText(id)])) === j([["EXP-3105", "Reject+Approve"], ["EXP-3104", "Reject+Approve"], ["EXP-3103", "Waiting for Aarav Mehta"], ["EXP-3106", "Waiting for the manager, Sneha Rao"]])
  && [...$("expense-rows").querySelectorAll("button")].every((b) => b.dataset.permission === "expenses:approve" && !("notImplemented" in b.dataset)),
  j(shownIds().map((id) => visibleButtons(rowOf(id)).join("+") || actionText(id))));
check("A9", "receipts are names, not links: no <a> in the table; the name says no file is stored",
  $("expense-rows").querySelector("a") === null && rowOf("EXP-3105").children[4].querySelector("span").title === "The claimant's name for the receipt. No file is stored in this demo.");
tab("Approved");
check("A10", "Approved tab: Aarav's ₹6,200 software claim, badge Approved (success), and Kabir may pay it",
  j(rows()) === j([["AM Aarav Mehta Engineering", "Software Design tool subscription, one year", "10 Sep", "₹6,200", "invoice.pdf", "Approved", "You can pay this"]]) && badge("EXP-3107").className === "badge badge--success badge--dot", j(rows()));
tab("Paid");
check("A11", "Paid tab: Rohan's ₹2,150, 'Paid 22 Sep by Aarav Mehta' (no fallback note on a normal payment)",
  j(rows()) === j([["RG Rohan Gupta Engineering", "Meals Team lunch after the sprint review", "15 Sep", "₹2,150", "bill.jpg", "Paid", "Paid 22 Sep by Aarav Mehta"]]), j(rows()));
tab("Rejected");
check("A12", "Rejected tab: Arjun's ₹3,200 with 'No receipt' (receipt--missing) and the rejection note",
  j(rows()) === j([["AK Arjun Kapoor Engineering", "Meals Team dinner after the release", "2 Aug", "₹3,200", "No receipt", "Rejected", "Bill missing: claims above ₹500 need a receipt."]])
  && rowOf("EXP-3101").children[4].querySelector(".receipt.receipt--missing") !== null, j(rows()));
check("A13", "spend by category: approved + paid claims, all five categories in order, widths relative to the largest",
  j(spend()) === j(["Travel ₹0 0%", `Meals ${money(2150)} ${Math.round((2150 / 6200) * 100)}%`, "Fuel ₹0 0%", `Software ${money(6200)} 100%`, "Other ₹0 0%"])
  && txt($("expense-spend-meta")) === "Approved and paid claims", j(spend()));
const STATIC = new JSDOM(HTML).window.document;
const POLICY = ["Every claim: Manager, then Finance", "Above ₹50,000: Then an Admin too", "Receipt needed above: ₹500", "Claim within: 30 days of spending", "Paid: Within 5 working days (target)"];
check("A14", "policy card drawn from EXPENSE_POLICY and the stage chain, and the page's static copy says the same (no 'Manager approves up to ₹50,000')",
  j(policy($("expense-policy"))) === j(POLICY) && j(policy(STATIC.getElementById("expense-policy"))) === j(POLICY) && !/Manager approves up to/.test(HTML), j(policy($("expense-policy"))));
check("A15", "alert: the oldest pending claim above ₹50,000 (Rohan's, at the Admin stage), in words that fit its stage",
  !$("expense-alert").hidden && txt($("expense-alert")) === "Rohan Gupta's ₹62,000 claim is above ₹50,000. It's waiting for an Admin, who gives the last approval.", txt($("expense-alert")));
check("A16", "Pay approved claims: shown (expenses:pay), real (no placeholder), enabled; its title counts what Kabir may pay",
  !payBtn().hidden && !payBtn().disabled && payBtn().dataset.permission === "expenses:pay" && !("notImplemented" in payBtn().dataset) && payBtn().title === "1 claim, ₹6,200", payBtn().title);
const exportBtn = d.querySelector("[data-export]");
tab("Pending");
const csv = await csvRows();
check("A17", "Export: gated on expenses:view (not reports:export); exports the shown tab's rows, Actions left out",
  exportBtn.dataset.permission === "expenses:view" && !exportBtn.hidden && csv?.length === 5 && csv[0] === "Employee,Department,Category,Date,Amount (₹),Receipt,Stage"   // Round Data export (behaviour; was Amount, 12 Sep, "₹4,800"); Round Data export part 2 (behaviour; was "Vikram Singh Operations" in one cell)
  && csv[1] === 'Vikram Singh,Operations,"Fuel Fuel for store deliveries, 1 to 12 Sep",2026-09-12,4800,fuel-sep.pdf,With Finance', j(csv?.slice(0, 2)));
check("A18", "category filter: All categories + the five CATEGORIES, by key",
  j([...$("expense-category").options].map((o) => `${o.value}|${o.textContent}`)) === j(["|All categories", "travel|Travel", "meals|Meals", "fuel|Fuel", "software|Software", "other|Other"]));
const mainText = () => txt(d.querySelector("main"));
check("A19", "nobody who isn't a user is left on the drawn page (no Meenal Arora, no Neha Kulkarni)", !/Meenal|Neha/.test(mainText()));
check("A20", "no claim data goes through innerHTML (names, reasons, notes)", !htmlWrites.some((h) => /Vikram|Ananya|Bengaluru|Bill missing|fuel-sep/.test(h)), `${htmlWrites.length} innerHTML writes`);
check("A21", "the search box is the page's own (data-table-filter=off), so table-filter.js doesn't also hide rows", $("expense-search").dataset.tableFilter === "off");

// =====================================================================
section("B. Aarav Mehta (Admin)");
await open("aarav");
check("B1", "Reject/Approve only on the Admin-stage claim; Finance-stage claims wait for Kabir (no Admin override)",
  j(shownIds().map((id) => [id, visibleButtons(rowOf(id)).join("+") || actionText(id)])) === j([["EXP-3105", "Waiting for Kabir Shah"], ["EXP-3104", "Waiting for Kabir Shah"], ["EXP-3103", "Reject+Approve"], ["EXP-3106", "Waiting for the manager, Sneha Rao"]]),
  j(shownIds().map((id) => visibleButtons(rowOf(id)).join("+") || actionText(id))));
tab("Approved");
check("B2", "his own approved claim: 'To be paid by Kabir Shah'; Pay disabled, with the reason as its title",
  actionText("EXP-3107") === "To be paid by Kabir Shah" && payBtn().disabled && payBtn().title === "Someone else has to pay the approved claims", `${actionText("EXP-3107")} | ${payBtn().title}`);
check("B3", "the figures don't depend on who's looking: same stats and tab counts as Kabir's",
  stat("open").startsWith("Open claims: 4 / ₹77,050") && stat("approved").startsWith("Approved, to pay: ₹6,200") && pills() === "Pending=4 Approved=1 Paid=1 Rejected=1");
payBtn().click();
check("B4", "clicking the disabled Pay does nothing (no confirm, no payment)", confirms.length === 0 && status("EXP-3107") === "approved");

// =====================================================================
section("C. The manager stage isn't decided here (decision 2)");
const kabirClaim = submit(KABIR, { amount: 1000, reason: "Taxi to the bank" }).record;
await open("aarav");
check("C1", "Kabir's new claim is at the manager stage with Aarav as manager; the store lists it for Aarav (pendingFor)...",
  kabirClaim.stage === "manager" && kabirClaim.managerId === AARAV && E.pendingFor(AARAV, "admin").some((c) => c.id === kabirClaim.id));
check("C2", "...but the page gives Aarav no buttons for it: 'Waiting for the manager, Aarav Mehta'",
  visibleButtons(rowOf(kabirClaim.id)).length === 0 && actionText(kabirClaim.id) === "Waiting for the manager, Aarav Mehta" && txt(badge(kabirClaim.id)) === "With manager", actionText(kabirClaim.id));
check("C3", "Arjun's claim at Sneha's stage has no buttons for Aarav or Kabir", visibleButtons(rowOf("EXP-3106")).length === 0 && (await open("kabir"), visibleButtons(rowOf("EXP-3106")).length === 0));
await open("sneha");
check("C4", "Sneha (the manager, role emp, no expenses:view) can't use the page: the guard redirects and nothing is drawn (since 5F the static fallback has no rows)",
  navigations.length === 1 && rowEls().length === 0);

// =====================================================================
section("D. Approving");
await open("kabir");
fresh();
await open("kabir");
clearToasts(); confirmAnswer = false;
button("EXP-3104", "Approve").click();
check("D1", "Approve asks first; Cancel changes nothing and shows no toast", status("EXP-3104") === "pending" && toasts().length === 0 && confirms.length === 1);
check("D2", "the confirm names the claim (confirm() isn't HTML, so a name is fine there)", confirms[0] === "Approve this request?\nAnanya Iyer: Travel, ₹8,400, spent 16 Sep (EXP-3104)", j(confirms[0]));
confirmAnswer = true;
button("EXP-3104", "Approve").click();
const c3104 = E.getExpense("EXP-3104");
check("D3", "OK: the last stage approved -> toast 'Claim approved. It's ready to be paid.' (fixed text); stored approved, by Kabir",
  j(toasts()) === j([{ type: "success", text: "Claim approved. It's ready to be paid." }]) && c3104.status === "approved" && c3104.stage === "payment"
  && c3104.history.at(-1).decision === "approved" && c3104.history.at(-1).byUserId === KABIR, j(toasts()));
check("D4", "the page redraws: gone from Pending, counts move, and it waits for Aarav to pay (Kabir gave the final approval)",
  !shownIds().includes("EXP-3104") && pills() === "Pending=3 Approved=2 Paid=1 Rejected=1" && (tab("Approved"), actionText("EXP-3104") === "To be paid by Aarav Mehta") && payBtn().title === "1 claim, ₹6,200", pills());
const avg2 = (SEED_3102 + days("2026-09-17T09:30:00.000Z", NOW_ISO)) / 2;
check("D5", "stats follow: open 3 / ₹68,650; approved ₹14,600 / 2 claims; average over both approvals, now above the 3-day target (down)",
  stat("open") === `Open claims: 3 / ${money(4800 + 62000 + 1850)} to review (down)` && stat("approved") === `Approved, to pay: ${money(6200 + 8400)} / 2 claims waiting to be paid (up)`
  && stat("processing") === `Average processing: ${avg2.toFixed(1)} days / Target is 3 days (down)` && avg2 > 3);
tab("Pending");
const big = submit(ROHAN, { amount: 60000, reason: "Conference, Pune" }).record;
decide(big.id, SNEHA, "approve");
await open("kabir");
clearToasts();
button(big.id, "Approve").click();
check("D6", "a claim above ₹50,000 approved at Finance: toast 'Claim approved. It goes to an Admin next.'; the row now waits for Aarav",
  j(toasts()) === j([{ type: "success", text: "Claim approved. It goes to an Admin next." }]) && E.getExpense(big.id).stage === "admin"
  && txt(badge(big.id)) === "With Admin" && actionText(big.id) === "Waiting for Aarav Mehta", j(toasts()));
clearToasts();
decide("EXP-3105", KABIR, "approve");                       // decided elsewhere (another tab) after this page was drawn
button("EXP-3105", "Approve").click();
check("D7", "a stale row: the store's refusal is shown (escaped, no names) and the page redraws without the claim",
  j(toasts()) === j([{ type: "danger", text: "This claim is already approved." }]) && !shownIds().includes("EXP-3105"), j(toasts()));
check("D10", "two large claims pending: the alert names the oldest sent (Rohan's ₹62,000 of 18 Sep, not the ₹60,000 sent today)",
  (await open("kabir"), txt($("expense-alert")).startsWith("Rohan Gupta's ₹62,000 claim")) && E.allExpenses().filter((c) => c.status === "pending" && c.amount > 50000).length === 2, txt($("expense-alert")));
await open("aarav");
clearToasts();
button("EXP-3103", "Approve").click();
tab("Approved");
check("D8", "Aarav approves Rohan's ₹62,000 at the Admin stage: ready to be paid, and paid by Kabir (Aarav gave the final approval)",
  j(toasts()) === j([{ type: "success", text: "Claim approved. It's ready to be paid." }]) && actionText("EXP-3103") === "To be paid by Kabir Shah", actionText("EXP-3103"));
check("D9", "no JS errors while approving", jsErrors.length === 0, jsErrors.join(" / "));

// =====================================================================
section("E. Rejecting");
fresh();
await open("kabir");
clearToasts();
button("EXP-3105", "Reject").click();
check("E1", "Reject opens the claim's modal: title, the claim named in its description (textContent), note box focused",
  modal()?.classList.contains("is-open") && txt(modal().querySelector(".modal__title")) === "Reject expense claim"
  && txt(modal().querySelector(".modal__desc")) === "Vikram Singh: Fuel, ₹4,800, spent 12 Sep (EXP-3105)" && d.activeElement === $("reject-expense-note"));
rejectWith("   ");
check("E2", "an empty note: the store's message inline, modal still open, claim still pending, no toast",
  txt(modal().querySelector(".form-error")) === "Add a note saying why the claim is rejected." && modal().classList.contains("is-open") && status("EXP-3105") === "pending" && toasts().length === 0);
const NASTY = "<b>No bill</b> & <img src=x onerror=alert(1)>";
rejectWith(NASTY);
tab("Rejected");
check("E3", "with a note: rejected, fixed toast 'Claim rejected.', and the note shown as text (no markup from it in the table)",
  status("EXP-3105") === "rejected" && j(toasts()) === j([{ type: "success", text: "Claim rejected." }]) && actionText("EXP-3105") === NASTY
  && !$("expense-rows").querySelector("img, b") && !modal().classList.contains("is-open"), actionText("EXP-3105"));
check("E4", "counts and stats follow: Pending 3, Rejected 2 / ₹8,000", pills() === "Pending=3 Approved=1 Paid=1 Rejected=2" && stat("rejected") === `Rejected: 2 / ${money(3200 + 4800)} in total (-)`, `${pills()} | ${stat("rejected")}`);

// =====================================================================
section("F. Paying");
fresh();
await open("kabir");
clearToasts(); confirmAnswer = false;
payBtn().click();
check("F1", "Pay asks first, naming the count and the total; Cancel pays nothing",
  j(confirms) === j(["Mark 1 claim as paid, ₹6,200 in total?\nThis records the payment; no money is sent from here."]) && status("EXP-3107") === "approved" && toasts().length === 0, j(confirms));
confirmAnswer = true;
payBtn().click();
tab("Paid");
const paid3107 = E.getExpense("EXP-3107").history.at(-1);
check("F2", "OK: 'Paid 30 Sep by Kabir Shah' at the top of Paid; stored paid by Kabir with no note; toast '1 claim marked paid.'",
  status("EXP-3107") === "paid" && paid3107.byUserId === KABIR && paid3107.note === "" && shownIds()[0] === "EXP-3107" && actionText("EXP-3107") === "Paid 30 Sep by Kabir Shah"
  && j(toasts()) === j([{ type: "success", text: "1 claim marked paid." }]), actionText("EXP-3107"));
check("F3", "afterwards: nothing to pay, so Pay is disabled and says why; the Approved stat is ₹0",
  payBtn().disabled && payBtn().title === "No approved claims are waiting to be paid" && stat("approved") === "Approved, to pay: ₹0 / Nothing waiting to be paid (-)", `${payBtn().title} | ${stat("approved")}`);
fresh();
decide("EXP-3104", KABIR, "approve"); decide("EXP-3103", AARAV, "approve");
await open("kabir");
clearToasts();
payBtn().click();
check("F4", "several at once: only what Kabir may pay (Aarav's own, and the one Aarav approved last), not the one Kabir approved last",
  confirms.at(-1) === `Mark 2 claims as paid, ${money(6200 + 62000)} in total?\nThis records the payment; no money is sent from here.`
  && status("EXP-3107") === "paid" && status("EXP-3103") === "paid" && status("EXP-3104") === "approved" && j(toasts()) === j([{ type: "success", text: "2 claims marked paid." }]), j(confirms.at(-1)));
tab("Approved");
check("F5", "the one left waits for Aarav, and Kabir's Pay is disabled", j(shownIds()) === j(["EXP-3104"]) && actionText("EXP-3104") === "To be paid by Aarav Mehta" && payBtn().disabled);
const own = submit(KABIR, { amount: 1000, reason: "Taxi to the bank" }).record;
decide(own.id, AARAV, "approve");                           // Finance is skipped: Kabir is the only Finance Manager
await open("aarav");
tab("Approved");
check("F6", "Kabir's own claim, approved by Aarav: nobody else may pay it, so Aarav can (the fallback)",
  status(own.id) === "approved" && actionText(own.id) === "You can pay this" && !payBtn().disabled, actionText(own.id));
clearToasts();
payBtn().click();
tab("Paid");
const pr = rowOf(own.id);
check("F7", "Aarav pays both his payable claims; the fallback payment shows the store's note under 'Paid ... by Aarav Mehta'",
  status(own.id) === "paid" && status("EXP-3104") === "paid" && j([...pr.lastElementChild.children].map(txt)) === j(["Paid 30 Sep by Aarav Mehta", "Paid by the final approver: nobody else can pay this claim"])
  && actionText("EXP-3104") === "Paid 30 Sep by Aarav Mehta" && j(toasts()) === j([{ type: "success", text: "2 claims marked paid." }]), actionText(own.id));
fresh();
decide("EXP-3103", AARAV, "approve");
await open("kabir");
clearToasts();
const realSet = w.Storage.prototype.setItem;
let claimWrites = 0;
w.Storage.prototype.setItem = function (k, v) { if (k === "officeos:expense-claims" && ++claimWrites > 1) throw new Error("quota"); return realSet.call(this, k, v); };
const quietErr = console.error; console.error = () => {};   // storage.js logs the failed save; expected here
payBtn().click();
console.error = quietErr; w.Storage.prototype.setItem = realSet;
check("F9", "storage full part-way: the first claim saved as paid, the second not; both toasts (fixed text, counts only), and the page shows what was saved",
  j(toasts()) === j([{ type: "success", text: "1 claim marked paid." }, { type: "danger", text: "1 claim couldn't be marked paid. It may have changed since the page was drawn, or browser storage may be full." }])
  && status("EXP-3103") === "paid" && status("EXP-3107") === "approved" && pills().includes("Approved=1") && !payBtn().disabled, j(toasts()));
check("F8", "no JS errors while paying", jsErrors.length === 0, jsErrors.join(" / "));

// =====================================================================
section("G. Search and category filter");
fresh();
await open("kabir");
search("ANANYA");
check("G1", "search matches names, any case", j(shownIds()) === j(["EXP-3104"]), j(shownIds()));
search("Bengaluru");
check("G2", "search is by employee name only (the box says 'Search employees'): a reason word finds nothing", j(rows()) === j([["No claims match these filters."]]) && rowEls()[0].children[0].colSpan === 7, j(rows()));
search("");
category("travel");
check("G3", "category filter: travel = Ananya, Rohan, Arjun (queue order)", j(shownIds()) === j(["EXP-3104", "EXP-3103", "EXP-3106"]), j(shownIds()));
search("vikram");
check("G4", "search and category combine (Vikram's claim is fuel)", j(rows()) === j([["No claims match these filters."]]));
search(""); category("meals"); tab("Rejected");
check("G5", "the filters stay when the tab changes: Rejected + meals = Arjun's", j(shownIds()) === j(["EXP-3101"]));
category("fuel");
check("G6", "Rejected + fuel: nothing matches", j(rows()) === j([["No claims match these filters."]]));
category(""); tab("Pending");
check("G7", "cleared: all four pending again", shownIds().length === 4);

// =====================================================================
section("H. Pagination");
for (let i = 0; i < 12; i++) submit(i % 2 ? ARJUN : MEERA, { amount: 100 + i, reason: `Bus fare ${i + 1}` });
await open("kabir");
const pager = () => txt($("expense-pagination").querySelector("span"));
check("H1", "16 pending: page 1 shows 10, 'Showing 1 to 10 of 16'", rowEls().length === 10 && pager() === "Showing 1 to 10 of 16" && pills().startsWith("Pending=16"), pager());
[...$("expense-pagination").querySelectorAll("button")].find((b) => b.textContent === "Next").click();
check("H2", "Next: the other 6", rowEls().length === 6 && pager() === "Showing 11 to 16 of 16", pager());
tab("Paid"); tab("Pending");
check("H3", "changing tab goes back to page 1", rowEls().length === 10 && pager() === "Showing 1 to 10 of 16");
search("meera");
check("H4", "a search narrows and goes back to page 1; one page needs no pager", rowEls().length === 6 && $("expense-pagination").classList.contains("is-empty"));
for (let i = 0; i < 12; i++) submit(AARAV, { amount: 200 + i, reason: `Parking ${i + 1}` });   // an Admin's own: approved at once
await open("kabir");
[...$("expense-pagination").querySelectorAll("button")].find((b) => b.textContent === "Next").click();
tab("Approved");
check("H5", "from page 2 of Pending to Approved (13 claims, 2 pages): Approved opens on its page 1", pager() === "Showing 1 to 10 of 13" && shownIds()[0] === "EXP-3107", pager());

// =====================================================================
section("I. Edge states");
fresh();
await open("kabir");
const box = JSON.parse(w.localStorage.getItem("officeos:expense-claims"));
box.records = box.records.filter((c) => c.status === "pending" && c.amount <= 50000);
w.localStorage.setItem("officeos:expense-claims", JSON.stringify(box));
await open("kabir");
check("I1", "nothing approved, paid or rejected: average '—' (no tone), approved ₹0, rejected 0, spend all ₹0",
  stat("processing") === "Average processing: — / Target is 3 days (-)" && stat("approved") === "Approved, to pay: ₹0 / Nothing waiting to be paid (-)"
  && stat("rejected") === "Rejected: 0 / None so far (-)" && j(spend()) === j(["Travel ₹0 0%", "Meals ₹0 0%", "Fuel ₹0 0%", "Software ₹0 0%", "Other ₹0 0%"]),
  [stat("processing"), stat("approved"), stat("rejected")].join(" | "));
check("I2", "no pending claim above ₹50,000: the alert is hidden", $("expense-alert").hidden);
tab("Paid");
const paidEmpty = j(rows());
tab("Rejected");
check("I3", "empty tabs say so", paidEmpty === j([["No claims have been paid yet."]]) && j(rows()) === j([["No claims have been rejected."]]) && payBtn().title === "No approved claims are waiting to be paid", paidEmpty);
const small = submit(VIKRAM, { amount: 400, reason: "Tea for the store team", receipt: "" }).record;
const limit = submit(ARJUN, { amount: 50000, reason: "Laptop repair" }).record;
await open("kabir");
check("I7", "no receipt on a claim of ₹500 or less: 'Not needed', not 'No receipt'", small.receipt === null && rowOf(small.id).children[4].textContent === "Not needed" && !rowOf(small.id).querySelector(".receipt--missing"), rowOf(small.id)?.children[4].textContent);
check("I8", "exactly ₹50,000 isn't above the limit: still no alert", limit.amount === 50000 && $("expense-alert").hidden);
E.cancelExpense(small.id, VIKRAM); E.cancelExpense(limit.id, ARJUN);
const large = submit(ANANYA, { amount: 75000, reason: "Trade fair stand" }).record;    // no manager on file: starts at Finance
await open("kabir");
check("I4", "a large claim at the Finance stage: the alert says where it is and that an Admin comes last",
  large.stage === "finance" && txt($("expense-alert")) === "Ananya Iyer's ₹75,000 claim is above ₹50,000. It's at the Finance stage now; an Admin gives the last approval.", txt($("expense-alert")));
S.updateUser(USER_ACTOR("admin", SNEHA), SNEHA, { status: "inactive", dateOfLeaving: LEAVING_11Y() });
await open("kabir");
// Round 10T (decision; was "a stuck claim … 'Nobody can decide this now'"): Finance may now decide the manager stage of a
// claim whose manager can no longer decide it. This page still offers no buttons at a manager stage (that's decided in
// the approvals inbox, where Kabir now has it: mgrfall.mjs P1), so the row names him; its "the manager," wording is
// the known display nit, not fixed here (mgrfall.mjs P5, round-10t-notes.md)
check("I5", "a claim whose manager was made inactive after it reached her: no longer stuck, the row names Finance (Kabir) as who it waits on (round 10T)", actionText("EXP-3106") === "Waiting for the manager, Kabir Shah" && visibleButtons(rowOf("EXP-3106")).length === 0, actionText("EXP-3106"));
S.resetDemoData();
E.cancelExpense("EXP-3106", ARJUN);
await open("kabir");
check("I6", "a cancelled claim is in no tab and no figure", pills() === "Pending=3 Approved=0 Paid=0 Rejected=0" && stat("open") === `Open claims: 3 / ${money(4800 + 8400 + 75000)} to review (down)`, `${pills()} | ${stat("open")}`);

// =====================================================================
section("J. Processing time (decision 4: sent -> final approval, approved and paid claims only)");
fresh();
await open("kabir");
const pd = (id) => E.processingDays(E.getExpense(id));
check("J1", "seed: Rohan's paid ₹2,150 counts to Kabir's approval (not the payment on 22 Sep); pending and rejected claims have none",
  Math.abs(pd("EXP-3102") - SEED_3102) < 1e-9 && ["EXP-3101", "EXP-3103", "EXP-3104", "EXP-3105", "EXP-3106"].every((id) => pd(id) === null));
check("J2", "Aarav's own claim (auto-approved when sent) has none: nobody processed it", pd("EXP-3107") === null);
check("J3", "averageProcessingDays: seed = Rohan's alone; [] and only-pending = null",
  Math.abs(E.averageProcessingDays(E.allExpenses()) - SEED_3102) < 1e-9 && E.averageProcessingDays([]) === null && E.averageProcessingDays(E.allExpenses().filter((c) => c.status === "pending")) === null);
decide("EXP-3103", AARAV, "approve");
check("J4", "a three-stage claim: from sending to the LAST approval (Aarav's, now), not the first",
  Math.abs(pd("EXP-3103") - days("2026-09-18T09:30:00.000Z", NOW_ISO)) < 1e-9);
check("J5", "the page's figure is the store's average, to one decimal", (await open("kabir"), stat("processing").startsWith(`Average processing: ${E.averageProcessingDays(E.allExpenses()).toFixed(1)} days`)));

// =====================================================================
section("K. People who may not see the page");
for (const who of ["priya", "arjun", null]) {
  fresh();
  await open(who);
  check("K1", `${who ?? "nobody signed in"}: redirected, and the script draws nothing (no rows: none static since 5F; no claims stored)`,
    navigations.length === 1 && rowEls().length === 0 && w.localStorage.getItem("officeos:expense-claims") === null && jsErrors.length === 0, `${navigations.length} redirects, ${rowEls().length} rows`);
}
fresh();
await open("oldFin");
tab("Approved");
const oldApproved = actionText("EXP-3107");
tab("Pending");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("K2", "an old Finance session with no employee id: signed out and sent to sign in (round 11P, N2); no claim drawn, no Approve/Reject anywhere",
  navigations.length === 1 && localStorage.getItem("officeos:session") === null && shownIds().length === 0 && $("expense-rows").querySelectorAll("button").length === 0, j([shownIds(), oldApproved]));
payBtn().click();
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("K3", "...and clicking Pay does nothing: no confirm, the claim still approved",
  confirms.length === 0 && status("EXP-3107") === "approved", payBtn()?.title);

// =====================================================================
section("L. expenses.html vs the page before this round (html-pre5C)");
const CHANGES = [
  ['<p class="page-header__subtitle">Claims and reimbursements waiting for Finance</p>', '<p class="page-header__subtitle">Expense claims at every stage, from sending to payment</p>'],
  ['data-permission="reports:export" data-export>', 'data-permission="expenses:view" data-export>'],
  ['data-permission="expenses:pay" data-not-implemented="Pay approved claims">', 'data-permission="expenses:pay" id="pay-approved">'],
  ['<div class="stat">\n        <div class="stat__icon stat__icon--3">', '<div class="stat" data-stat="open">\n        <div class="stat__icon stat__icon--3">'],
  ['<div class="stat">\n        <div class="stat__icon stat__icon--2">', '<div class="stat" data-stat="approved">\n        <div class="stat__icon stat__icon--2">'],
  ['<div class="stat">\n        <div class="stat__icon stat__icon--4">', '<div class="stat" data-stat="rejected">\n        <div class="stat__icon stat__icon--4">'],
  ['<div class="stat">\n        <div class="stat__icon stat__icon--1">', '<div class="stat" data-stat="processing">\n        <div class="stat__icon stat__icon--1">'],
  ['>Approved this month<', '>Approved, to pay<'], ['>Rejected this month<', '>Rejected<'],
  ['aria-label="Search claims">', 'aria-label="Search claims" id="expense-search" data-table-filter="off">'],
  ['aria-label="Filter by category">', 'aria-label="Filter by category" id="expense-category">'],
  ['</thead>\n            <tbody>', '</thead>\n            <tbody id="expense-rows">'],
  ['        <div class="card__footer">\n          <span class="card__meta">Showing 6 of 14 open claims</span>\n          <div class="btn-group">\n            <button class="btn btn--sm" type="button" disabled>Previous</button>\n            <button class="btn btn--sm" type="button" data-not-implemented="Next page">Next</button>\n          </div>\n        </div>',
    '        <div class="pagination is-empty" id="expense-pagination"></div>'],
  ['<span class="card__meta">₹ thousand, Sep</span>', '<span class="card__meta" id="expense-spend-meta">Approved and paid claims</span>'],
  ['<div class="card__body">\n            <div class="bar-row">', '<div class="card__body" id="expense-spend">\n            <div class="bar-row">'],
  ['<dl class="kv">\n              <div class="kv__row"><dt>Manager approves up to</dt><dd>₹50,000</dd></div>\n              <div class="kv__row"><dt>Above that</dt><dd>Finance, then Admin</dd></div>',
    '<dl class="kv" id="expense-policy">\n              <div class="kv__row"><dt>Every claim</dt><dd>Manager, then Finance</dd></div>\n              <div class="kv__row"><dt>Above ₹50,000</dt><dd>Then an Admin too</dd></div>'],
  ['<dd>Within 5 working days</dd>', '<dd>Within 5 working days (target)</dd>'],
  ['<div class="alert alert--info">Meenal', '<div class="alert alert--info" id="expense-alert">Meenal'],
  ['<script type="module" src="../../assets/js/app.js"></script>', '<script type="module" src="../../assets/js/app.js"></script>\n<script type="module" src="../../assets/js/pages/expenses.js"></script>'],
].map(([a, b]) => [a.replace(/\n/g, "\r\n"), b.replace(/\n/g, "\r\n")]);
const applied = CHANGES.reduce((s, [a, b]) => (s.split(a).length === 2 ? s.replace(a, b) : `(${a.slice(0, 40)} found ${s.split(a).length - 1} times)`), PRE_HTML);
check("L1", "expenses.html = the page before this round plus exactly these 19 edits (ids/hooks, labels, the policy rows, Export's gate, Pay made real, the pager, the script tag)",
  applied === HTML_5C, applied.startsWith("(") ? applied : `${CHANGES.length} edits`);
check("L2", "the static rows stay as the no-script fallback (6 rows, as before); sidebar and topbar unchanged",
  new JSDOM(PRE_HTML).window.document.querySelectorAll("tbody tr").length === STATIC_5C.querySelectorAll("#expense-rows tr").length
  && txt(new JSDOM(PRE_HTML).window.document.querySelector(".sidebar__nav")) === txt(STATIC_5C.querySelector(".sidebar__nav")) && txt(new JSDOM(PRE_HTML).window.document.querySelector(".topbar")) === txt(STATIC_5C.querySelector(".topbar")));

// =====================================================================
section("M. Source layout (Round 5C's result, frozen since Round 5E: js-pre5E)");
const walk = (dir, base = "") => fs.readdirSync(new URL(`./${dir}/${base}`, import.meta.url), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const LIVE = walk("js-pre5E"), PRE = walk("js-pre5C");
const changed = LIVE.filter((p) => !PRE.includes(p) || src("js-pre5E", p) !== src("js-pre5C", p));
const JS_CHANGED = ["data/expenses-store.js", "data/expenses.js", "data/payroll-store.js", "pages/expenses.js", "pages/users-list.js", "ui/leave-decision.js"];
check("M1", "js: exactly these 6 files changed or added (one new page script); nothing removed", j(changed) === j(JS_CHANGED) && PRE.every((p) => LIVE.includes(p)), j(changed));
const undo = (p, pairs) => pairs.reduce((s, [a, b]) => s.replace(a.replace(/\n/g, "\r\n"), b.replace(/\n/g, "\r\n")), src("js-pre5E", p)) === src("js-pre5C", p);
check("M2", "data/expenses.js: only the two display-only figures and their comment",
  undo("data/expenses.js", [["// The last two are targets the page shows; nothing enforces them.\n", ""],
    ["  payWithinWorkingDays: 5, // an approved claim is meant to be paid within this many working days\n  processingTargetDays: 3, // the target for the average time from sending a claim to its final approval\n", ""]]));
check("M3", "data/expenses-store.js: the reset comment, finalApprovalOf() split out of finalApproverOf(), and the processing-time section; nothing else",
  undo("data/expenses-store.js", [
    ["// The Reset demo data button (users-list.js) calls resetExpenseData().", "// The Reset demo data button doesn't call resetExpenseData() yet."],
    ["// The last approval entry (a person's, or an Admin's own auto-approval), or null.\nfunction finalApprovalOf(claim) {\n  return [...claim.history].reverse().find((h) => h.decision === \"approved\" || h.decision === \"auto-approved\") ?? null;\n}\n\n// Who gave the last approval, or null.\nconst finalApproverOf = (claim) => finalApprovalOf(claim)?.byUserId ?? null;",
      "// Who gave the last approval (a person, or an Admin's own auto-approval), or null.\nfunction finalApproverOf(claim) {\n  return [...claim.history].reverse().find((h) => h.decision === \"approved\" || h.decision === \"auto-approved\")?.byUserId ?? null;\n}"],
    [src("js-pre5E", "data/expenses-store.js").replace(/\r\n/g, "\n").match(/\/\/ ---------- processing time ----------\n[\s\S]*?\n\n(?=\/\/ ---------- reset)/)?.[0] ?? "(missing)", ""],
  ]));
check("M4", "data/payroll-store.js: only its comment about the Reset button",
  undo("data/payroll-store.js", [["// Nothing writes salaries yet (salary-structure.html only shows them). The\n// Reset demo data button (users-list.js) calls resetPayrollData().",
    "// Nothing writes salaries yet (salary-structure.html only shows them), and the\n// Reset demo data button doesn't call resetPayrollData() yet."]]));
check("M5", "ui/leave-decision.js: only labels.approved as an optional function (comment, one helper, one call); leave and correction labels stay strings",
  undo("ui/leave-decision.js", [
    ["//   labels: { title, approved, rejected }        modal title and the success toasts; approved\n//                                                may instead be a function of the decide\n//                                                result returning fixed text (a request\n//                                                with more than one approval stage)\n",
      "//   labels: { title, approved, rejected }        modal title and the success toasts\n"],
    ["  const approvedText = (result) => (typeof labels.approved === \"function\" ? labels.approved(result) : labels.approved);\n", ""],
    ["showToast(approvedText(result), \"success\")", "showToast(labels.approved, \"success\")"]]));
check("M6", "pages/users-list.js: two imports, the confirm wording and two reset calls",
  undo("pages/users-list.js", [
    ["import { resetPayrollData } from \"../data/payroll-store.js\";\nimport { resetExpenseData } from \"../data/expenses-store.js\";\n", ""],
    ["leave, holidays, attendance, salaries and expense claims in this browser", "leave, holidays and attendance in this browser"],
    ["    resetPayrollData();\n    resetExpenseData();\n", ""]]));
const page = src("js-pre5E", "pages/expenses.js");
const code = page.split(/\r?\n/).filter((l) => !l.trim().startsWith("//")).join("\n");
check("M7", "the page script: no innerHTML, no storage of its own, rupees from ui/money.js, figures from the store (no own totals or day arithmetic)",
  !/innerHTML|outerHTML|insertAdjacentHTML|localStorage/.test(code) && /import \{ rupees \} from "\.\.\/ui\/money\.js";/.test(page) && !/toLocaleString|Date\.parse|86400|24 \* 60/.test(code)
  && /expenseTotals\(/.test(code) && /averageProcessingDays\(/.test(code));
check("M8", "it decides only through createDecisionFlow (decideExpense) and pays only through payExpense on payableFor's list",
  (code.match(/decideExpense/g) ?? []).length === 2 && /decide: decideExpense,/.test(code) && /payExpense\(c\.id, userId\)/.test(code) && /payableFor\(userId\)/.test(code));
const storeSrc = src("js-pre5E", "data/expenses-store.js");
check("M9", "the store enforces nothing new: it never reads the two display-only figures", !/payWithinWorkingDays|processingTargetDays/.test(storeSrc));
const importers = LIVE.filter((p) => /from "\.\.\/data\/expenses-store\.js"|from "\.\/expenses-store\.js"/.test(src("js-pre5E", p)));
const walkAbs = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkAbs(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)])).sort();
const htmlLoaders = walkAbs(DIR).filter((p) => p.endsWith(".html") && /pages\/expenses\.js/.test(fs.readFileSync(`${DIR}/${p}`, "utf8")));
check("M10", "who uses the store: the page script and users-list.js (reset) only; only expenses.html loads the page script",
  j(importers) === j(["pages/expenses.js", "pages/users-list.js"]) && j(htmlLoaders) === j(["finance/expenses.html"]), j({ importers, htmlLoaders }));
check("M11", "changed and new files: CRLF only, no final newline (the tree's convention)",
  [...JS_CHANGED.map((p) => fs.readFileSync(new URL(`./js-pre5E/${p}`, import.meta.url), "utf8")), HTML].every((s) => !/[^\r]\n/.test(s) && !/\r(?!\n)/.test(s) && !s.endsWith("\n")));
check("ERR", "no uncaught JS errors on the last page load", jsErrors.length === 0, jsErrors.join(" / "));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
