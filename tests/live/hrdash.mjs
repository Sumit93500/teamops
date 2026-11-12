// usage: node hrdash.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 3F-2: dashboard/hr.html with the js in ./js, in jsdom, next to leave-approvals.html and
// regularization.html (same localStorage), so decisions can be checked in both directions.
// The clock is local wall time, Wed 30 Sep 2026 11:00, set before each fresh seed.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const PAGES = {
  hr: ["dashboard/hr.html", "hr-dashboard"],
  leave: ["leave/leave-approvals.html", "leave-approvals"],
  reg: ["attendance/regularization.html", "regularization"],
};
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const HTML = read("dashboard/hr.html");
const SCRIPT = fs.readFileSync(new URL("./js/pages/hr-dashboard.js", import.meta.url), "utf8");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 9, 30, 11, 0);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const WHO = {
  priya: ["hr", "Priya Nair", "EMP-1003"], aarav: ["admin", "Aarav Mehta", "EMP-1001"],
  kabir: ["fin", "Kabir Shah", "EMP-1008"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"], old: ["hr", "Priya Nair", undefined],
};

let loads = 0, w = null, d = null, saved = {};
const jsErrors = [], htmlWrites = [], confirms = [];
let navigations = [];
async function open(page = "hr", who = "priya") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const [path, script] = PAGES[page];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(`${page}/${who}: ${e.message}`); else jsErrors.push(`${page}/${who}: ${e.message}`); });
  const dom = new JSDOM(read(path), { url: `http://localhost/office-os/pages/${path}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.confirm = (m) => { confirms.push(m); return true; };
  const proto = w.Element.prototype;
  const inner = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", { get: inner.get, set(v) { htmlWrites.push(String(v)); inner.set.call(this, v); }, configurable: true });
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  navigations = [];
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`${page} import: ${e.message}`); }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }
async function start(who = "priya") {
  setNow(2026, 9, 30, 11, 0); fresh(); await open("hr", who);
  // Round 8C (setup): Sneha, their manager, approves first, dated 20 Sep (after they were sent, before the seeded
  // decisions), so the activity feed's newest entries are what they were
  setNow(2026, 9, 20, 10, 0); L.decideLeave("LV-2189", "EMP-1029", "emp", "approve"); L.decideLeave("LV-2201", "EMP-1029", "emp", "approve"); setNow(2026, 9, 30, 11, 0);
  await open("hr", who);
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;

// ---- readers ----
const $ = (id) => d.getElementById(id);
function parts(node) {
  const out = [];
  const walker = node.ownerDocument.createTreeWalker(node, 4);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) { if (t.parentElement.closest(".avatar")) continue; const v = t.textContent.replace(/\s+/g, " ").trim(); if (v) out.push(v); }
  return out.join(" ");
}
const stat = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return `${txt(s.querySelector(".stat__value"))} (${txt(s.querySelector(".stat__delta"))})`; };
const bars = () => [...$("leave-chart").querySelectorAll(".chart__bar")].map((b) => `${b.title}|${b.classList.contains("chart__bar--muted") ? "muted" : ""}|${b.style.getPropertyValue("--h")}`);
const items = () => [...$("approvals-list").querySelectorAll(".list__item")].map((i) => parts(i));
const itemFor = (text) => [...$("approvals-list").querySelectorAll(".list__item")].find((i) => txt(i).includes(text));
const button = (item, label) => [...item.querySelectorAll("button")].find((b) => txt(b) === label);
const acts = () => [...$("activity").querySelectorAll(".activity__item")].map(parts);
const rows = () => [...$("leave-rows").querySelectorAll("tr")].map((tr) => [...tr.children].map(parts));
const names = () => rows().map((r) => r[0]);
const meta = () => txt($("leave-rows-meta"));
const search = (v) => { const i = $("leave-search"); i.value = v; i.dispatchEvent(new w.Event("input", { bubbles: true })); };
const status = (v) => { const s = $("leave-status"); s.value = v; s.dispatchEvent(new w.Event("change", { bubbles: true })); };
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${t.className.replace("toast toast--", "")}:${txt(t.querySelector(".toast__text"))}`);
const clearToasts = () => d.querySelectorAll(".toast").forEach((t) => t.remove());
// leave-approvals.html / regularization.html
const pills = () => [...d.querySelectorAll(".table__toolbar .tabs__tab")].map((p) => `${[...p.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim()}=${txt(p.querySelector(".badge"))}`).join(" ");
const tabRows = () => [...d.querySelectorAll("table[data-export-name] tbody tr")].map((tr) => txt(tr));
const pickTab = (label) => [...d.querySelectorAll(".table__toolbar .tabs__tab")].find((p) => txt(p).startsWith(label)).click();

const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const L = await import("./js/data/leave-store.js");
const A = await import("./js/data/attendance-store.js");
const R = (await import("./js/config/routes.js")).ROUTES;
const STATIC = new JSDOM(HTML).window.document;
const sameMain = () => d.querySelector("main").innerHTML.replaceAll(' hidden=""', "") === STATIC.querySelector("main").innerHTML;
const same = (sel) => d.querySelector(sel)?.outerHTML === STATIC.querySelector(sel)?.outerHTML;

// =====================================================================
section("Priya (HR), Wed 30 Sep 11:00");
await start("priya");
check("H1", "subtitle uses the real month", txt($("dash-subtitle")) === "People operations for September 2026");
const sum = A.summaryFor("2026-09-30");
check("H2", "On leave today: 1 (Meera) = 11.1% of 9 employees; 8 expected at work (team-attendance's framing)", stat("on-leave") === "1 (11.1% of 9 employees, 8 expected at work)" /* Round 14E part 4 (behaviour; was "of 9 active": the sidebar's word for the same count) */ && sum.onLeave === 1 && sum.total === 9 && sum.expected === 8, stat("on-leave"));
check("H3", "Pending leave requests: 4 for Priya (her own LV-2211 excluded), oldest 13 days (LV-2189, sent 17 Sep)", stat("pending") === "4 (Oldest is 13 days old)" && L.pendingFor("EMP-1003", "hr").length === 4, stat("pending"));
check("H4", "…in the same down colour as the static page", d.querySelector('[data-stat="pending"] .stat__delta').className === "stat__delta stat__delta--down");
check("H5", "Pending approvals: 3 of 7 shown (4 leave + 3 corrections), newest sent first", txt($("approvals-meta")) === "3 of 7 shown" && j(items()) === j([
  "Regularization: Vikram Singh 25 Sep: Late arrival, 10:24 to 09:30 Reject Approve",
  "Ananya Iyer, casual leave 9 Oct, first half, 0.5 day Reject Approve",
  "Regularization: Sneha Rao 23 Sep: Late arrival, 10:02 to 09:30 Reject Approve"]), j(items()));
check("H6", "…Approve/Reject are real buttons (not placeholders) with the right permission", [...$("approvals-list").querySelectorAll("button")].every((b) => !b.dataset.notImplemented && ["leave:approve", "attendance:approve"].includes(b.dataset.permission) && !b.hidden));
check("H7", "…links to the two full pages", [...d.querySelectorAll("#approvals-list + .card__footer a")].map((a) => `${txt(a)}>${a.getAttribute("href")}`).join(" ") === "All leave requests>../leave/leave-approvals.html Regularization>../attendance/regularization.html" /* Round Small tidy-ups (behaviour; was "All corrections") */);
check("H8", "chart: 17 – 30 Sep, requests counted on the day sent; weekends muted; scale top = 5", txt($("leave-range")) === "17 – 30 Sep" && j(bars()) === j([
  "Thu, 17 Sep: 1 request||20", "Fri, 18 Sep: 2 requests||40", "Sat, 19 Sep: 0 requests|muted|0", "Sun, 20 Sep: 0 requests|muted|0",
  "Mon, 21 Sep: 0 requests||0", "Tue, 22 Sep: 0 requests||0", "Wed, 23 Sep: 0 requests||0", "Thu, 24 Sep: 0 requests||0", "Fri, 25 Sep: 1 request||20",
  "Sat, 26 Sep: 1 request|muted|20", "Sun, 27 Sep: 0 requests|muted|0", "Mon, 28 Sep: 0 requests||0", "Tue, 29 Sep: 0 requests||0", "Wed, 30 Sep: 0 requests||0"]), j(bars()));
check("H9", "…aria-label and note state the definition", $("leave-chart").getAttribute("aria-label") === "Leave requests sent per day, 17 – 30 Sep: 5 requests in all, at most 2 on one day" && txt($("leave-note")) === "Requests counted on the day they were sent. Weekends and holidays are shown lighter.", $("leave-chart").getAttribute("aria-label"));
check("H10", "Recent activity: 3 newest real decisions, then the static interview line (Round 8C: a manager's decision counts too; Sneha's 20 Sep approvals from the setup are newer than the seeded 18 Sep and 3 Sep ones, which they replace)", j(acts()) === j([
  "Priya Nair approved Arjun Kapoor's regularization for 28 Sep Yesterday",
  "Sneha Rao approved Rohan Gupta's casual leave for 13 – 15 Oct 20 Sep",
  "Sneha Rao approved Arjun Kapoor's casual leave for 5 Oct 20 Sep"].concat(parts(STATIC.querySelector("#activity [data-static]")))), j(acts()));
check("H11", "Leave requests table: 10 of all 11 requests, newest sent first, real statuses", meta() === "Showing 10 of 11 requests" && names()[0] === "Priya Nair" && rows()[0].join(" / ") === "Priya Nair / Work from home / 7 Oct / 1 / Pending" && rows().some((r) => r[4] === "Cancelled"), `${meta()} ${rows()[0].join(" / ")}`);
// Round 9B (behaviour; was: New joiners "untouched", equal to the static HTML's invented "Sep: 5"): it's drawn from the
// joining dates (boards.mjs A). The recruitment parts stay static, now labelled "Sample, not built yet", and still
// equal the HTML.
check("H12", "Round 9B: New joiners drawn (Sep: 0, five active people with no joining date on file); Open positions, Applicants card, interview line, Post job opening still the static HTML, now labelled samples",
  txt(d.querySelector('[data-stat="joiners"] .stat__label')) === "New joiners, Sep" && stat("joiners") === "0 (No one joins this month; no joining date on file for 5 of 9)"
  && same('[data-stat="positions"]') && same(".grid-2 .card") && same("#activity [data-static]") && same('main a[href="../recruitment/job-openings.html"]')
  && txt(d.querySelector('[data-stat="positions"] .stat__delta')) === "Sample, not built yet" && txt(d.querySelector(".grid-2 .card .card__meta")) === "Sample, not built yet", stat("joiners"));
check("H13", "no page errors", jsErrors.length === 0, j(jsErrors));

section("Aarav (Admin) sees his own decider view");
await open("hr", "aarav");
check("AD1", "pending leave 5 (Priya's LV-2211 is decidable by Aarav), 3 of 8 shown with LV-2211 second", stat("pending") === "5 (Oldest is 13 days old)" && txt($("approvals-meta")) === "3 of 8 shown" && items()[1] === "Priya Nair, work from home 7 Oct, 1 day Reject Approve", `${stat("pending")} ${txt($("approvals-meta"))} ${items()[1]}`);
check("AD2", "on-leave, chart and table are company-wide, the same as Priya's", stat("on-leave") === "1 (11.1% of 9 employees, 8 expected at work)" /* Round 14E part 4 (behaviour; was "of 9 active") */ && meta() === "Showing 10 of 11 requests");

section("Approve a leave request HERE -> leave-approvals.html shows it decided");
await open("hr", "priya");
clearToasts();
button(itemFor("Ananya Iyer, casual leave"), "Approve").click();
check("D1", "confirm names the request; store now says approved by Priya", confirms.at(-1) === "Approve this request?\nAnanya Iyer: Casual leave, 9 Oct, first half (0.5 day)" && L.getRequest("LV-2208").status === "approved" && L.getRequest("LV-2208").history.at(-1).byUserId === "EMP-1003", confirms.at(-1));
check("D2", "fixed-text success toast, no names", j(toasts()) === j(["success:Leave request approved."]), j(toasts()));
check("D3", "the dashboard re-renders: 3 pending, 3 of 6 shown, the table shows it Approved, activity on top", stat("pending") === "3 (Oldest is 13 days old)" && txt($("approvals-meta")) === "3 of 6 shown" && rows().find((r) => r[0] === "Ananya Iyer")[4] === "Approved" && acts()[0] === "Priya Nair approved Ananya Iyer's casual leave for 9 Oct, first half Today", `${stat("pending")} ${acts()[0]}`);
await open("leave", "priya");
check("D4", "leave-approvals.html: Pending 3 without Ananya; Approved lists 9 Oct", pills().startsWith("Pending=3") && !tabRows().some((r) => r.includes("Ananya")) && (pickTab("Approved"), tabRows().some((r) => r.includes("Ananya Iyer") && r.includes("9 Oct"))), pills());

section("Reject a correction HERE (note required) -> regularization.html shows it decided");
await open("hr", "priya");
clearToasts();
button(itemFor("Regularization: Vikram Singh"), "Reject").click();
const modal = $("reject-correction-modal");
check("R1", "the correction's own reject modal opens (reject-correction-modal), describing the request", modal?.classList.contains("is-open") && txt(modal.querySelector(".modal__desc")) === "Vikram Singh: Late arrival, 25 Sep, corrected to 09:30", txt(modal?.querySelector(".modal__desc")));
modal.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
check("R2", "empty note: refused inline, modal stays open, still pending, no toast", txt(modal.querySelector(".form-error")) === "Add a note saying why the request is rejected." && modal.classList.contains("is-open") && A.getRegularization("RG-102").status === "pending" && toasts().length === 0, txt(modal.querySelector(".form-error")));
$("reject-correction-note").value = "Bus delays aren't corrected";
modal.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
check("R3", "with a note: rejected in the store by Priya, modal closed, fixed toast", A.getRegularization("RG-102").status === "rejected" && A.getRegularization("RG-102").history.at(-1).note === "Bus delays aren't corrected" && !modal.classList.contains("is-open") && j(toasts()) === j(["success:Correction request rejected."]), j(toasts()));
check("R4", "…Vikram's correction is gone; the newest still waiting is Sneha's correction (3 of 5 shown)", items()[0].startsWith("Regularization: Sneha Rao") && txt($("approvals-meta")) === "3 of 5 shown", `${txt($("approvals-meta"))} ${items()[0]}`);
await open("reg", "priya");
check("R5", "regularization.html: Pending 2 without Vikram; Rejected lists Vikram's 25 Sep", pills().startsWith("Pending=2") && !tabRows().some((r) => r.includes("Vikram")) && (pickTab("Rejected"), tabRows().some((r) => r.includes("Vikram Singh") && r.includes("25 Sep"))), pills());

section("Decisions made on the full pages show up here (the other direction)");
setNow(2026, 9, 30, 11, 5);   // later decisions get later timestamps, as in real use
await open("reg", "priya");
clearToasts();
[...d.querySelectorAll("table[data-export-name] tbody tr")].find((tr) => txt(tr).includes("Sneha Rao")).querySelector(".btn--primary").click();
check("X1", "approved RG-103 on regularization.html", A.getRegularization("RG-103").status === "approved");
setNow(2026, 9, 30, 11, 10);
await open("leave", "priya");
[...d.querySelectorAll("table[data-export-name] tbody tr")].find((tr) => txt(tr).includes("14 Oct")).querySelector(".btn:not(.btn--primary)").click();
$("reject-note").value = "Quarter-end close";
$("reject-leave-modal").querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
check("X2", "rejected LV-2202 on leave-approvals.html", L.getRequest("LV-2202").status === "rejected");
await open("hr", "priya");
check("X3", "back here: RG-103 and LV-2202 are gone from the card (3 of 3 shown), pending leave 2", !items().some((i) => i.includes("Sneha Rao")) && txt($("approvals-meta")) === "3 of 3 shown" && stat("pending") === "2 (Oldest is 13 days old)", `${txt($("approvals-meta"))} ${j(items())}`);
check("X4", "…Recent activity leads with both decisions, Today", acts()[0] === "Priya Nair rejected Sneha Rao's casual leave for 14 Oct Today" && acts()[1] === "Priya Nair approved Sneha Rao's regularization for 23 Sep Today", j(acts().slice(0, 2)));
check("X5", "…the table shows LV-2202 as Rejected", rows().find((r) => r[0] === "Sneha Rao" && r[2] === "14 Oct")[4] === "Rejected");

section("Both reject modals coexist on this page");
await start("priya");
button(itemFor("Regularization: Vikram"), "Reject").click();
$("reject-correction-modal").querySelector(".modal__close").click();
button(itemFor("Ananya Iyer"), "Reject").click();
const lm = $("reject-leave-modal");
check("M1", "leave uses reject-leave-modal (leave-decision.js's shared leave flow), corrections reject-correction-modal; both in the page, distinct", lm && $("reject-correction-modal") && lm !== $("reject-correction-modal") && lm.classList.contains("is-open") && !$("reject-correction-modal").classList.contains("is-open") && txt(lm.querySelector(".modal__desc")) === "Ananya Iyer: Casual leave, 9 Oct, first half (0.5 day)");
lm.querySelector(".modal__close").click();

section("Status filter + search combine");
status("pending");
check("F1", "Pending: every pending request in the store (5, incl. Priya's own), newest sent first", meta() === "Showing 5 of 5 matching requests" && rows().every((r) => r[4] === "Pending") && names()[0] === "Priya Nair", `${meta()} ${j(names())}`);
search("arjun");
check("F2", "Pending + 'arjun': LV-2201 only", j(rows().map((r) => `${r[0]} ${r[2]}`)) === j(["Arjun Kapoor 5 Oct"]) && meta() === "Showing 1 of 1 matching request", `${j(rows())} ${meta()}`);
status("approved");
check("F3", "Approved + 'arjun': LV-2160, LV-2147, LV-2124 (newest sent first)", j(rows().map((r) => r[2])) === j(["12 Aug", "2 – 3 Jul", "14 – 15 May"]), j(rows().map((r) => r[2])));
status("rejected");
check("F4", "Rejected + 'arjun': LV-2101", j(rows().map((r) => r[2])) === j(["20 – 22 Jan"]));
search("zzz");
check("F5", "no match: an empty row and 'Showing 0 of 0 matching requests'", txt($("leave-rows")) === "No requests match these filters." && meta() === "Showing 0 of 0 matching requests");
search(""); status("");
check("F6", "cleared: back to 'Showing 10 of 11 requests'; cancelled requests only under All", meta() === "Showing 10 of 11 requests" && L.allRequests().filter((r) => r.status === "cancelled").length === 1);
check("F7", "the generic table filter is off for this search box (no double filtering)", $("leave-search").dataset.tableFilter === "off");

section("Nothing waiting: an honest empty state");
L.pendingFor("EMP-1003", "hr").forEach((r) => L.decideLeave(r.id, "EMP-1003", "hr", "approve"));
A.pendingRegularizations("EMP-1003", "hr").forEach((r) => A.decideRegularization(r.id, "EMP-1003", "hr", "reject", "No"));
await open("hr", "priya");
check("E1", "card: 'None' and 'Nothing is waiting for your decision.', no buttons", txt($("approvals-meta")) === "None" && j(items()) === j(["Nothing is waiting for your decision."]) && !$("approvals-list").querySelector("button"));
check("E2", "stat: 0, 'Nothing waiting', not in the down colour", stat("pending") === "0 (Nothing waiting)" && d.querySelector('[data-stat="pending"] .stat__delta').className === "stat__delta");
await open("hr", "aarav");
check("E3", "Aarav still has Priya's own WFH request to decide (1 of 1 shown)", txt($("approvals-meta")) === "1 of 1 shown" && items()[0].startsWith("Priya Nair, work from home"));

section("Access");
check("G1", "hr.html now needs leave:approve, the same as leave-approvals.html; regularization.html needs attendance:approve", R["dashboard/hr.html"] === "leave:approve" && R["leave/leave-approvals.html"] === "leave:approve" && R["attendance/regularization.html"] === "attendance:approve");
check("G2", "correction rows and their buttons need attendance:approve too (the script checks it)", /const showCorrections = can\("attendance:approve"\)/.test(SCRIPT) && /decisionButtons\("attendance:approve"/.test(SCRIPT) && /can\("leave:approve"\)/.test(SCRIPT));
for (const who of ["kabir", "arjun"]) {
  await start(who);
  check("G", `${who} (no leave:approve): the guard sends them to 403 and the script draws nothing`, navigations.length === 1 && sameMain(), `nav=${navigations.length}`);
}
await start("old");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("G5", "old session (no employee id): signed out and sent to sign in (round 11P, N2); the static page is left as it is", sameMain() && navigations.length === 1 && localStorage.getItem("officeos:session") === null);
check("G6", "…its static Approve/Reject stay placeholders (as approvals.mjs P4 expects)", [...d.querySelectorAll("#approvals-list button")].every((b) => b.dataset.notImplemented === txt(b)));

section("No innerHTML with data");
check("I1", "the script never uses innerHTML / outerHTML / insertAdjacentHTML", !/innerHTML|outerHTML|insertAdjacentHTML/.test(SCRIPT));
check("I2", "no HTML string written at run time held a person's name (toasts are fixed text)", !htmlWrites.some((h) => /Kapoor|Rao|Nair|Mehta|Shah|Gupta|Singh|Joshi|Iyer/.test(h)), `${htmlWrites.length} writes`);
await start("priya");
S.updateUser(USER_ACTOR("admin", "EMP-1017"), "EMP-1017", { name: '<img src=x onerror="window.pwned=1">Ananya' });
await open("hr", "priya");
check("I3", "a name with markup is plain text in the approvals card and the table; no <img> anywhere in main", !d.querySelector("main img") && items()[1].startsWith('<img src=x onerror="window.pwned=1">Ananya') && names().includes('<img src=x onerror="window.pwned=1">Ananya') && !w.pwned, items()[1]);
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
