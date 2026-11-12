// usage: node pages.mjs [pagesDir]
// Loads apply-leave.html, my-leave.html and my-requests.html (staged by default) with
// the js in ./js, in jsdom. localStorage carries over between page loads, like
// real pages. "Today" is pinned to Mon 28 Sep 2026 10:00 local; setTimeout is
// captured so the redirect and toast timers can be inspected.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? "__REPO__/pages";
const PAGES = {
  "apply-leave": ["leave", fs.readFileSync(`${DIR}/leave/apply-leave.html`, "utf8")],
  "my-leave": ["leave", fs.readFileSync(`${DIR}/leave/my-leave.html`, "utf8")],
  "my-requests": ["requests", fs.readFileSync(`${DIR}/requests/my-requests.html`, "utf8")],
};
console.log(`HTML from: ${DIR}`);

const RealDate = Date;
let NOW = new RealDate(2026, 8, 28, 10, 0, 0).getTime();   // Round 8F (setup): let, so the Dec 2025 request can be filed then
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
let timers = [];
globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };

const WHO = {
  arjun: ["emp", "Arjun Kapoor", "EMP-1105"], rohan: ["emp", "Rohan Gupta", "EMP-1042"], ananya: ["emp", "Ananya Iyer", "EMP-1017"],
  meera: ["emp", "Meera Joshi", "EMP-1023"], aarav: ["admin", "Aarav Mehta", "EMP-1001"], old: ["hr", "Priya Nair", undefined],
};

let loads = 0, w = null, d = null, saved = {}, navigations = [];
const jsErrors = [], confirms = [];
let confirmAnswer = true;

async function open(page, who) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const [folder, html] = PAGES[page];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else jsErrors.push(`${page}: ${e.message}`); });
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${folder}/${page}.html`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.confirm = (m) => { confirms.push(m); return confirmAnswer; };
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, HTMLElement: w.HTMLElement });
  timers = [];
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${page}.js?load=${loads}`); } catch (e) { jsErrors.push(`${page} import: ${e.message}`); }
}

const S = await import("./js/data/store.js");
const L = await import("./js/data/leave-store.js");
const AT = await import("./js/data/attendance-store.js");   // Round 3C: correction requests are real rows in my-requests
const EX = await import("./js/data/expenses-store.js");     // Round 5D: expense claims are real rows in my-requests
const AR = await import("./js/data/asset-requests-store.js"); // Round 6E: asset requests are real rows in my-requests
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;

// ---- readers ----
const balances = () => [...d.querySelectorAll(".balance-grid .balance")].map((b) => ({
  type: txt(b.querySelector(".balance__type")), limit: txt(b.querySelector(".badge")), value: `${txt(b.querySelector(".balance__value").firstChild)} ${txt(b.querySelector(".balance__value small"))}`,
  bar: b.querySelector(".progress__bar").style.getPropertyValue("--w"), meta: txt(b.querySelector(".balance__meta")), cls: b.querySelector(".progress").className,
}));
const history = () => [...d.querySelectorAll(".table tbody tr")].map((tr) => [...tr.children].map((td) => txt(td)));
const hasCancel = () => [...d.querySelectorAll(".table tbody tr")].map((tr) => !!tr.querySelector("button"));
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => ({ type: t.className.replace("toast toast--", ""), text: txt(t.querySelector(".toast__text")), html: t.querySelector(".toast__text").innerHTML }));
const clearToasts = () => d.querySelectorAll(".toast").forEach((t) => t.remove());
const kv = () => [...d.querySelectorAll("#balance-after .kv__row")].map((r) => `${txt(r.querySelector("dt"))}: ${txt(r.querySelector("dd"))}${r.querySelector(".badge") ? `{${r.querySelector(".badge").className.replace("badge ", "")}}` : ""}`);
const chain = () => [...d.querySelectorAll("#approval-chain .stepper__step")].map((s) => `${txt(s.querySelector("strong"))} (${txt(s.querySelector("small"))})${s.className.includes("is-current") ? "*" : ""}`);
const stepsIn = (root) => [...root.querySelectorAll(".stepper__step")].map((s) => `${s.className.replace("stepper__step", "").trim() || "-"}:${txt(s.querySelector("strong"))} (${txt(s.querySelector("small"))})`);
const typeCards = () => [...d.querySelectorAll(".choice-grid .choice")].map((c) => `${c.querySelector("input").value}=${txt(c.querySelector(".choice__meta"))}`);
const errorIn = (id) => { const i = d.getElementById(id); const box = i.closest(".form-field") ?? i.parentElement; const e = box.querySelector(".form-error"); return e ? { text: e.textContent, linked: i.getAttribute("aria-describedby") === e.id } : null; };
const allErrors = () => [...d.querySelectorAll(".form-error")].map((e) => e.textContent);
const typeError = () => { const e = d.querySelector(".choice-grid").parentElement.querySelector(".form-error"); return e ? e.textContent : null; };

function fill({ type, from, to, duration = "full", reason = "Personal work" } = {}) {
  if (type) { const r = d.querySelector(`input[name="leaveType"][value="${type}"]`); r.checked = true; r.dispatchEvent(new w.Event("change", { bubbles: true })); }
  if (from !== undefined) { d.getElementById("from-date").value = from; d.getElementById("from-date").dispatchEvent(new w.Event("change", { bubbles: true })); }
  if (to !== undefined) { d.getElementById("to-date").value = to; d.getElementById("to-date").dispatchEvent(new w.Event("change", { bubbles: true })); }
  d.getElementById("duration").value = duration; d.getElementById("duration").dispatchEvent(new w.Event("change", { bubbles: true }));
  d.getElementById("leave-reason").value = reason;
}
const send = () => d.querySelector('#leave-form [type="submit"]').click();
const count = () => L.allRequests().length;

// expected display, worked out here independently of the page code
const LABEL = { casual: "Casual leave", sick: "Sick leave", earned: "Earned leave", wfh: "Work from home", unpaid: "Unpaid leave" };
const STATUS = { pending: "Pending", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled" };
function expectedBalances(id) {
  const b = L.balanceFor(id, 2026, 9);
  const p = (x) => (x.pending ? `, ${x.pending} pending` : "");
  return [
    { type: "Casual leave", limit: "12 a year", value: `${b.casual.left} ${unit(b.casual.left)} left`, meta: `${b.casual.approved} used${p(b.casual)}` },
    { type: "Sick leave", limit: "8 a year", value: `${b.sick.left} ${unit(b.sick.left)} left`, meta: `${b.sick.approved} used${p(b.sick)}` },
    { type: "Earned leave", limit: "10 a year", value: `${b.earned.left} ${unit(b.earned.left)} left`, meta: `${b.earned.approved} used${p(b.earned)}` },
    { type: "Work from home", limit: "4 a month", value: `${b.wfh.left} ${unit(b.wfh.left)} left`, meta: `${b.wfh.approved} used in September${p(b.wfh)}` },
    { type: "Unpaid leave", limit: "No limit", value: `${b.unpaid.approved} ${unit(b.unpaid.approved)} taken`, meta: `Salary is deducted if used${p(b.unpaid)}` },
  ];
}
const unit = (n) => (n === 1 || n === 0.5 ? "day" : "days");
const sameBalances = (id) => JSON.stringify(balances().map(({ type, limit, value, meta }) => ({ type, limit, value, meta }))) === JSON.stringify(expectedBalances(id));

// =====================================================================
section("Each person's pages match the store (fresh demo data)");
// Storage starts empty in the first jsdom window, so everything seeds fresh.
const EXPECT = {
  arjun: { id: "EMP-1105", pending: "Casual leave, 5 Oct (1 day)", waiting: "Sneha Rao", subtitle: "Sneha Rao approves your request first, then HR or an Admin.", chain: "You send the request (Arjun Kapoor)* | First approval (Sneha Rao, Team Lead) | Final approval (HR or an Admin)" },   // Round 8C wording (was "... then to HR." / "(HR)")
  rohan: { id: "EMP-1042", pending: "Casual leave, 13 – 15 Oct (3 days)", waiting: "Sneha Rao", subtitle: "Sneha Rao approves your request first, then HR or an Admin.", chain: "You send the request (Rohan Gupta)* | First approval (Sneha Rao, Team Lead) | Final approval (HR or an Admin)" },   // Round 8C wording
  ananya: { id: "EMP-1017", pending: "Casual leave, 9 Oct, first half (0.5 day)", waiting: "HR", subtitle: "Your request goes to HR or an Admin.", chain: "You send the request (Ananya Iyer)* | Approval (HR or an Admin)" },   // Round 8C wording
  meera: { id: "EMP-1023", pending: null, waiting: null, subtitle: "Kabir Shah approves your request first, then HR or an Admin.", chain: "You send the request (Meera Joshi)* | First approval (Kabir Shah, Finance Manager) | Final approval (HR or an Admin)" },   // Round 8C wording
};
for (const [who, e] of Object.entries(EXPECT)) {
  await open("my-leave", who);
  const mine = L.requestsFor(e.id).sort((a, b) => b.from.localeCompare(a.from) || b.id.localeCompare(a.id));
  const rows = history();
  console.log(`  [${who}] my-leave balances: ${balances().map((b) => `${b.type} ${b.value} (${b.meta}) bar ${b.bar}`).join(" | ")}`);
  console.log(`  [${who}] my-leave history:  ${rows.map((r) => r.slice(0, 5).join(" / ")).join("  ||  ")}`);
  check(`${who}1`, `${who}: 5 balance cards (incl. Earned) equal balanceFor(), pending shown separately`, sameBalances(e.id));
  check(`${who}2`, `${who}: history = requestsFor(), newest first, status badges, Cancel only on pending`,
    rows.length === mine.length && rows.every((r, i) => r[0] === LABEL[mine[i].type] && r[2] === String(mine[i].days) && r[4] === STATUS[mine[i].status]) && hasCancel().every((c, i) => c === (mine[i].status === "pending")));
  const card = d.getElementById("pending-request");
  check(`${who}3`, e.pending ? `${who}: pending card = newest pending, waiting for ${e.waiting}` : `${who}: no pending request -> pending card hidden`,
    e.pending ? !card.hidden && txt(card.querySelector("p")) === e.pending && stepsIn(card).some((s) => s.startsWith("is-current") && s.includes(`Waiting for ${e.waiting}`)) : card.hidden,
    e.pending ? `${txt(card.querySelector("p"))} | ${stepsIn(card).join(" > ")}` : "hidden");
  await open("my-requests", who);
  const leaveRows = history().filter((r) => r[1] === "Leave");
  const corrections = AT.regularizationsFor(WHO[who][2]).length;
  // Round 5D: their own expense claims are real rows now (EX.expensesFor); Round 6E: so are their asset requests (no static row left).
  const claims = EX.expensesFor(WHO[who][2]).length;
  const assetReqs = AR.assetRequestsFor(WHO[who][2]).length;
  check(`${who}4`, `${who}: my-requests shows their ${mine.length} leave requests + ${corrections} attendance corrections + ${claims} expense claims + ${assetReqs} asset requests; With = approver`,
    leaveRows.length === mine.length && history().length === mine.length + corrections + claims + assetReqs && history().filter((r) => r[1] === "Asset").length === assetReqs && history().filter((r) => r[1] === "Expense").length === claims && leaveRows.every((r) => { const q = mine.find((m) => r[0].startsWith(LABEL[m.type]) && r[2] && r[4] === STATUS[m.status]); return !!q; })
    && (!e.waiting || leaveRows.some((r) => r[4] === "Pending" && r[3] === e.waiting)), leaveRows.map((r) => `${r[0]} | with ${r[3]} | ${r[4]}`).join(" ; "));
  await open("apply-leave", who);
  check(`${who}5`, `${who}: apply-leave subtitle and approval chain use the real manager`, txt(d.querySelector(".page-header__subtitle")) === e.subtitle && chain().join(" | ") === e.chain, `${txt(d.querySelector(".page-header__subtitle"))} | ${chain().join(" | ")}`);
}
check("A-r", "Arjun's rejected Jan request shows its note", (await open("my-leave", "arjun"), history().find((r) => r[4] === "Rejected")?.[5]) === "Project deadline");
check("A-h", "Upcoming holidays: next 3 from today (Gandhi Jayanti, Dussehra, Diwali)", [...d.querySelectorAll("#upcoming-holidays .list__item")].map((i) => `${txt(i.querySelector(".date-tile__month"))} ${txt(i.querySelector(".date-tile__day"))} ${txt(i.querySelector(".list__title"))} (${txt(i.querySelector(".list__sub"))})`).join(" | ")
  === "Oct 2 Gandhi Jayanti (Friday, national holiday) | Oct 20 Dussehra (Tuesday, company holiday) | Nov 8 Diwali (Sunday, company holiday)",
  [...d.querySelectorAll("#upcoming-holidays .list__item")].map((i) => txt(i)).join(" | "));
check("A-b", "balance bars: share left (casual 10/12 = 83%, sick 6/8 = 75%); colours per type", balances().map((b) => b.bar).join() === "83%,75%,100%,100%,0%" && balances().map((b) => b.cls).join() === "progress,progress progress--success,progress,progress progress--warning,progress progress--info");

// =====================================================================
section("apply-leave: type cards, live total days and balance after");
await open("apply-leave", "arjun");
check("T1", "type cards from LEAVE_POLICY incl. Earned, live balances", typeCards().join(" | ") === "casual=10 of 12 days left, 1 pending | sick=6 of 8 days left | earned=10 of 10 days left | wfh=4 days left this month | unpaid=Salary is deducted for these days", typeCards().join(" | "));
check("T2", "casual preselected; before any dates: total '—', balance rows show the current balance", d.querySelector('input[name="leaveType"]:checked').value === "casual" && d.getElementById("total-days").value === "—" && kv().join(" | ") === "Casual leave now: 10 days | Already pending: 1 day | This request: — | Balance after: —", kv().join(" | "));
fill({ from: "2026-11-02", to: "2026-11-06" });
check("T3", "Mon 2 – Fri 6 Nov: 5 days; balance after 10 - 1 pending - 5 = 4 (green)", d.getElementById("total-days").value === "5 days" && kv().at(-1) === "Balance after: 4 days{badge--success}", `${d.getElementById("total-days").value} | ${kv().join(" | ")}`);
fill({ from: "2026-10-01", to: "2026-10-05" });
check("T4", "Thu 1 – Mon 5 Oct: 2 days (Gandhi Jayanti and the weekend skipped)", d.getElementById("total-days").value === "2 days");
fill({ from: "2026-10-03", to: "2026-10-04" });
check("T5", "weekend only: 0 days", d.getElementById("total-days").value === "0 days");
fill({ from: "2026-11-03", to: "2026-11-03", duration: "first-half" });
check("T6", "one day, first half: 0.5 day; balance after 8.5", d.getElementById("total-days").value === "0.5 day" && kv().at(-1) === "Balance after: 8.5 days{badge--success}", kv().at(-1));
fill({ from: "2026-11-03", to: "2026-11-04", duration: "second-half" });
check("T7", "half day over two dates: inline error on Duration, total '—'", errorIn("duration")?.text === "A half day must start and end on the same date." && errorIn("duration").linked && d.getElementById("total-days").value === "—", JSON.stringify(errorIn("duration")));
fill({ from: "2026-11-04", to: "2026-11-04", duration: "second-half" });
check("T8", "fixing the dates clears that error", errorIn("duration") === null && d.getElementById("total-days").value === "0.5 day");
fill({ from: "2026-11-06", to: "2026-11-02" });
check("T9", "reversed dates: total '—'", d.getElementById("total-days").value === "—");
fill({ type: "wfh", from: "2026-11-02", to: "2026-11-06" });
check("T10", "WFH, 5 days in Nov: 'left in November', over the 4 -> amber, not red", kv().join(" | ") === "Work from home left in November: 4 days | This request: 5 days | Balance after: -1 days{badge--warning}", kv().join(" | "));
fill({ type: "sick", from: "2026-11-02", to: "2026-11-20" });
check("T11", "sick 15 days: balance after 6 - 15 = -9 (red)", kv().at(-1) === "Balance after: -9 days{badge--danger}", kv().at(-1));
fill({ type: "unpaid", from: "2026-11-02", to: "2026-11-03" });
check("T12", "unpaid: no limit", kv().join(" | ") === "Unpaid leave: No limit | This request: 2 days | Salary deducted for: 2 days", kv().join(" | "));

// =====================================================================
section("apply-leave: errors are inline and save nothing");
const before = count();
const cases = [
  ["weekend only", { type: "casual", from: "2026-10-03", to: "2026-10-04" }, "to-date", "Those dates are all weekends or holidays, so there's nothing to take."],
  ["reversed dates", { type: "casual", from: "2026-11-06", to: "2026-11-02" }, "to-date", "The end date can't be before the start date."],
  ["overlap with own pending LV-2201", { type: "casual", from: "2026-10-05", to: "2026-10-06" }, "from-date", "These dates overlap your pending request LV-2201 (2026-10-05 to 2026-10-05)."],
  ["half day over two dates", { type: "casual", from: "2026-11-03", to: "2026-11-04", duration: "first-half" }, "duration", "A half day must start and end on the same date."],
  ["whitespace reason", { type: "casual", from: "2026-11-02", to: "2026-11-02", reason: "   " }, "leave-reason", "Reason is required."],
];
for (const [label, f, id, message] of cases) {
  clearToasts(); fill(f); send();
  check("E", `${label}: inline error on ${id}, focus there, no toast`, errorIn(id)?.text === message && errorIn(id).linked && allErrors().length === 1 && toasts().length === 0 && d.activeElement === d.getElementById(id), errorIn(id)?.text ?? `errors: ${allErrors()}`);
}
let submits = 0; d.getElementById("leave-form").addEventListener("submit", () => submits++);
fill({ type: "casual", from: "2026-11-02", to: "2026-11-02", reason: "" }); send();
check("E6", "empty reason: the browser's required check stops the submit", submits === 0);
check("E7", "nothing was saved by any of these", count() === before, `${count()} requests`);
await open("apply-leave", "meera");
fill({ type: "earned", from: "2026-11-02", to: "2026-11-03" }); send();
check("E8", "over balance (Meera, earned 9 of 10 + 2): inline error under the leave types, nothing saved",
  typeError() === "Not enough earned leave: 1 of 10 days free in 2026 (9 approved, 0 pending), and this request is 2." && d.activeElement?.value === "earned" && count() === before, typeError());
fill({ type: "casual" });
check("E9", "choosing another type clears that error", typeError() === null);

// =====================================================================
section("apply-leave: success, advisories, redirect");
await open("apply-leave", "arjun");
clearToasts();
fill({ type: "casual", from: "2026-11-02", to: "2026-11-03", reason: '<img src=x onerror="window.__xss=1"> trip' });
d.getElementById("leave-phone").value = "+91 90000 00000";
send();
const newReq = L.allRequests().find((r) => r.userId === "EMP-1105" && r.from === "2026-11-02");
check("OK1", "valid request saved: pending, 2 days, manager Sneha, reason and phone kept", newReq?.status === "pending" && newReq.days === 2 && newReq.managerId === "EMP-1029" && newReq.reason.startsWith("<img") && newReq.contactPhone === "+91 90000 00000", newReq?.id);
check("OK2", "one success toast, no warning (2 days, well ahead); typed text never reaches a toast", JSON.stringify(toasts().map((t) => `${t.type}:${t.text}`)) === '["success:Leave request sent."]' && !toasts().some((t) => t.html.includes("<img")) && !w.__xss);
const redirect = timers.find((t) => t.ms === 1200);
check("OK3", "Send disabled; redirect to my-leave.html after 1200 ms", d.querySelector('#leave-form [type="submit"]').disabled && !!redirect);
navigations.length = 0; redirect.fn();
check("OK4", "the timer navigates (jsdom reports the navigation attempt)", navigations.length === 1);
await open("my-leave", "arjun");
check("OK5", "my-leave: the new request is the first row, Pending with Cancel; casual shows 3 pending", history()[0].slice(0, 5).join(" / ") === "Casual leave / 2 – 3 Nov / 2 / 28 Sep / Pending" && hasCancel()[0] && balances()[0].meta === "2 used, 3 pending", history()[0].join(" / "));
check("OK6", "pending card now shows the newest pending (sent today)", txt(d.querySelector("#pending-request p")) === "Casual leave, 2 – 3 Nov (2 days)");
await open("my-requests", "arjun");
check("OK7", "my-requests: the new request is at the top, with Sneha Rao, Pending", history()[0].slice(0, 5).join(" / ") === "Casual leave, 2 – 3 Nov (2 days) / Leave / 28 Sep / Sneha Rao / Pending", history()[0].join(" / "));

await open("apply-leave", "arjun");
clearToasts(); fill({ type: "sick", from: "2026-09-29", to: "2026-10-01" }); send();
const adv = toasts();
check("AV1", "sick, 3 days from tomorrow: warning toast with the certificate AND short-notice advisories, then success",
  adv.length === 2 && adv[0].type === "warning" && adv[0].text === "A medical certificate is needed for sick leave over 2 days. Requests for 3 or more days should be sent at least 7 days ahead, so your team can plan." && adv[1].type === "success", JSON.stringify(adv));
await open("apply-leave", "ananya");
clearToasts(); fill({ type: "wfh", from: "2026-11-02", to: "2026-11-06" }); send();
check("AV2", "WFH over 4 in a month: saved, with the wfh-limit warning", toasts()[0]?.text === "This goes over the 4 work-from-home days allowed in November 2026." && toasts()[1]?.type === "success" && L.allRequests().some((r) => r.userId === "EMP-1017" && r.type === "wfh"), toasts()[0]?.text);

// =====================================================================
section("Cancel");
await open("my-leave", "arjun");
const casualBefore = L.balanceFor("EMP-1105", 2026, 10).casual.pending;
const rowIdx = history().findIndex((r) => r[1] === "5 Oct");
confirms.length = 0; confirmAnswer = false;
d.querySelectorAll(".table tbody tr")[rowIdx].querySelector("button").click();
check("X1", "my-leave Cancel asks first; answering No changes nothing", confirms[0] === "Cancel your casual leave request for 5 Oct?" && L.getRequest("LV-2201").status === "pending", confirms[0]);
confirmAnswer = true; clearToasts();
d.querySelectorAll(".table tbody tr")[rowIdx].querySelector("button").click();
const row5 = history().find((r) => r[1] === "5 Oct");
check("X2", "Yes: cancelled in the store, row shows Cancelled with no button, toast", L.getRequest("LV-2201").status === "cancelled" && row5[4] === "Cancelled" && row5[5] === "" && toasts()[0]?.text === "Leave request cancelled.");
check("X3", "cancelling frees the balance: casual pending drops by 1, and the card says so",
  L.balanceFor("EMP-1105", 2026, 10).casual.pending === casualBefore - 1 && balances()[0].meta === "2 used, 2 pending", `${casualBefore} -> ${L.balanceFor("EMP-1105", 2026, 10).casual.pending}; card "${balances()[0].meta}"`);
await open("my-requests", "arjun");
const pendingBefore = txt([...d.querySelectorAll(".tabs__tab")].find((p) => p.textContent.includes("Pending")).querySelector(".badge"));
const nov = [...d.querySelectorAll(".table tbody tr")].find((tr) => txt(tr.children[0]).startsWith("Casual leave, 2 – 3 Nov"));
nov.querySelector("button").click();
const novAfter = history().find((r) => r[0].startsWith("Casual leave, 2 – 3 Nov"));
const pendingAfter = txt([...d.querySelectorAll(".tabs__tab")].find((p) => p.textContent.includes("Pending")).querySelector(".badge"));
check("X4", "my-requests Cancel (same function): Cancelled, With '—', Pending count drops", novAfter[4] === "Cancelled" && novAfter[3] === "—" && Number(pendingAfter) === Number(pendingBefore) - 1 && L.allRequests().find((r) => r.userId === "EMP-1105" && r.from === "2026-11-02").status === "cancelled", `${pendingBefore} -> ${pendingAfter}`);

// =====================================================================
section("my-requests: tabs, type filter, side card");
L.resetLeaveData(); S.resetDemoData();
await open("my-requests", "arjun");
const pillCounts = () => [...d.querySelectorAll(".tabs__tab")].map((p) => `${txt(p.childNodes[0])}=${txt(p.querySelector(".badge"))}`).join(" ");
// Round 5D: Arjun's EXP-3106 (pending) and EXP-3101 (rejected) replace the static expense row.
check("F1", "tab counts include leave, expense and static rows: All 9, Pending 3, Approved 4, Rejected 2", pillCounts() === "All=9 Pending=3 Approved=4 Rejected=2", pillCounts());
check("F2", "sample leave, attendance, expense and asset rows gone, no static row left (6E: Arjun's asset row is his real ARQ-1, with a real Cancel)", !d.querySelector("tr[data-sample]") && !d.querySelector("tr[data-static]")
  && d.querySelector('tr[data-request-id="ARQ-1"] button').dataset.permission === "requests:cancel" && !d.querySelector('tr[data-request-id="ARQ-1"] button').dataset.notImplemented);
const typeSel = d.querySelector('select[aria-label="Filter by type"]');
const pick = (v) => { typeSel.value = v; typeSel.dispatchEvent(new w.Event("change")); };
pick("leave");
check("F3", "type filter Leave: only leave rows; footer counts", history().every((r) => r[1] === "Leave") && history().length === 5 && txt(d.querySelector(".card__footer .card__meta")) === "Showing 5 of 9 requests");
[...d.querySelectorAll(".tabs__tab")].find((p) => p.textContent.includes("Pending")).click();
check("F4", "Leave + Pending: only LV-2201", history().length === 1 && history()[0][0] === "Casual leave, 5 Oct (1 day)");
pick("asset");
check("F5", "Asset + Pending: his real laptop request (6E; was the static laptop row)", history().length === 1 && history()[0][0] === "Laptop, replaces AST-0188");
[...d.querySelectorAll(".tabs__tab")].find((p) => p.textContent.includes("Approved")).click();
check("F6", "Asset + Approved: empty-state row", history().length === 1 && history()[0][0] === "No requests match these filters.");
pick(""); [...d.querySelectorAll(".tabs__tab")].find((p) => p.textContent.trim().startsWith("All")).click();
check("F7", "all rows sorted by date sent, newest first", history().map((r) => r[2]).join() === "25 Sep,24 Sep,18 Sep,17 Sep,10 Aug,2 Aug,2 Jul,28 Apr,5 Jan", history().map((r) => r[2]).join());
const side = d.getElementById("request-progress");
// Round 5D: the side card follows the newest pending request of any kind: his expense claim, sent 25 Sep.
check("F8", "side card follows the newest pending request (his expense claim, sent 25 Sep), with the expense steps", !side.hidden && txt(side.querySelector(".card__title")) === "Expense: Travel, ₹1,850" && stepsIn(side).join(" > ") === "is-done:Sent (25 Sep by you) > is-current:Manager approval (Waiting for Sneha Rao) > -:Finance approval (Finance) > -:Payment (Finance or an Admin pays approved claims)", stepsIn(side).join(" > "));
await open("my-requests", "meera");
check("F9", "no pending leave (Meera): side card hidden", d.getElementById("request-progress").hidden);
await open("my-requests", "ananya");
check("F10", "no manager (Ananya): With 'HR', side stepper 'Waiting for HR'", history().some((r) => r[1] === "Leave" && r[3] === "HR") && stepsIn(d.getElementById("request-progress")).join(" > ") === "is-done:Sent (25 Sep by you) > is-current:Approval (Waiting for HR)");

// =====================================================================
section("my-leave: year filter and pagination");
L.resetLeaveData(); S.resetDemoData();
{ const saved = NOW; NOW = new RealDate(2025, 11, 1, 10, 0, 0).getTime();   // Round 8F (setup): filed on 1 Dec 2025 (leave can't be dated more than 7 days back), then the clock put back
  L.applyLeave("EMP-1105", { type: "unpaid", from: "2025-12-01", to: "2025-12-02", reason: "old" });
  NOW = saved; }
const decDays = ["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-07", "2026-12-08", "2026-12-09"];
decDays.forEach((day) => L.applyLeave("EMP-1105", { type: "unpaid", from: day, to: day, reason: "x" }));
await open("my-leave", "arjun");
const pag = d.querySelector(".pagination");
const yearSel = d.querySelector('select[aria-label="Filter by year"]');
check("P1", "year options 2026, 2025; 2026 selected", [...yearSel.options].map((o) => o.value).join() === "2026,2025" && yearSel.value === "2026");
check("P2", "12 requests in 2026 -> page 1 has 10 rows, 'Showing 1 to 10 of 12', 2 pages", history().length === 10 && txt(pag.querySelector("span")) === "Showing 1 to 10 of 12" && !pag.classList.contains("is-empty") && [...pag.querySelectorAll(".pagination__btn")].map((b) => b.textContent).join() === "Prev,1,2,Next", txt(pag));
[...pag.querySelectorAll(".pagination__btn")].find((b) => b.textContent === "Next").click();
check("P3", "Next -> page 2: the 2 oldest (May, Jan)", history().length === 2 && history().map((r) => r[1]).join() === "14 – 15 May,20 – 22 Jan" && txt(pag.querySelector("span")) === "Showing 11 to 12 of 12", history().map((r) => r[1]).join());
yearSel.value = "2025"; yearSel.dispatchEvent(new w.Event("change"));
check("P4", "2025: just the Dec 2025 request; pagination hidden", history().length === 1 && history()[0][1] === "1 – 2 Dec" && pag.classList.contains("is-empty"));
yearSel.value = "2026"; yearSel.dispatchEvent(new w.Event("change"));
check("P5", "back to 2026 starts on page 1", txt(pag.querySelector("span")) === "Showing 1 to 10 of 12" && history()[0][1] === "9 Dec");
check("P6", "the unpaid days show on the Unpaid card as pending", balances()[4].meta === "Salary is deducted if used, 7 pending" && balances()[4].value === "0 days taken", balances()[4].meta);

// =====================================================================
section("Admin, old sessions, markup");
L.resetLeaveData(); S.resetDemoData();
await open("apply-leave", "aarav");
check("AD1", "Admin: subtitle and chain say approved automatically", txt(d.querySelector(".page-header__subtitle")) === "As an Admin, your leave is approved as soon as you send it." && chain().join(" | ") === "You send the request (Aarav Mehta)* | Approved automatically (Admin requests don't need approval)");
clearToasts(); fill({ type: "casual", from: "2026-11-09", to: "2026-11-09" }); send();
check("AD2", "Admin's request: success toast says approved", toasts().map((t) => t.text).join() === "Leave approved. Admin requests are approved automatically.");
await open("my-leave", "aarav");
check("AD3", "my-leave: Approved, no Cancel, casual '1 used', no pending card", history()[0].slice(0, 5).join(" / ") === "Casual leave / 9 Nov / 1 / 28 Sep / Approved" && !hasCancel()[0] && balances()[0].meta === "1 used" && d.getElementById("pending-request").hidden);
await open("my-requests", "aarav");
check("AD4", "my-requests: With 'Auto-approved', Approved", history().find((r) => r[1] === "Leave")?.slice(3, 5).join(" / ") === "Auto-approved / Approved");
for (const page of ["apply-leave", "my-leave", "my-requests"]) {
  await open(page, "old");
  const plain = new JSDOM(PAGES[page][1]).window.document.querySelector("main").innerHTML;
  check("OLD", `${page}: a session with no employeeId leaves the static page as it is`, d.querySelector("main").innerHTML === plain);
}
const staticNi = (page) => [...new JSDOM(PAGES[page][1]).window.document.querySelectorAll("main [data-not-implemented]")].map((b) => b.dataset.notImplemented);
check("M1", "my-leave.html: no data-not-implemented left in main (Cancel and Next page removed)", staticNi("my-leave").length === 0, JSON.stringify(staticNi("my-leave")));
check("M2", "my-requests.html: the two sample Cancel markers kept (leave sample row, asset row)", JSON.stringify(staticNi("my-requests")) === '["Cancel","Cancel"]');
check("M3", "apply-leave.html: form has no action; duration options have values; attachment hint added",
  !new JSDOM(PAGES["apply-leave"][1]).window.document.getElementById("leave-form").hasAttribute("action") && [...new JSDOM(PAGES["apply-leave"][1]).window.document.getElementById("duration").options].map((o) => o.value).join() === "full,first-half,second-half" && PAGES["apply-leave"][1].includes("In this demo the file isn't saved, not even its name."));
check("M4", "no uncaught JS errors across all page loads", jsErrors.length === 0, jsErrors.join(" / ") || `none (${loads} page loads)`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
