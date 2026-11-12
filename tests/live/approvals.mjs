// usage: node approvals.mjs [pagesDir]
// leave-approvals, holidays, approvals-inbox and the pages that used to load approvals.js,
// with the js in ./js, in jsdom. localStorage carries over between page loads.
// "Today" is pinned to Mon 28 Sep 2026 10:00 local; setTimeout is captured.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? "__REPO__/pages";
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}`);

const RealDate = Date;
const NOW = new RealDate(2026, 8, 28, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
let lastBlob = null;
URL.createObjectURL = (blob) => { lastBlob = blob; return "blob:test"; };
URL.revokeObjectURL = () => {};

const WHO = {
  priya: ["hr", "Priya Nair", "EMP-1003"], aarav: ["admin", "Aarav Mehta", "EMP-1001"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"],
  kabir: ["fin", "Kabir Shah", "EMP-1008"], old: ["hr", "Priya Nair", undefined],
};
const SCRIPT = { "leave/leave-approvals.html": "leave-approvals", "leave/holidays.html": "holidays", "requests/approvals-inbox.html": "approvals-inbox", "leave/my-leave.html": "my-leave" };

let loads = 0, w = null, d = null, saved = {}, navigations = [];
const jsErrors = [], confirms = [];
let confirmAnswer = true;

async function open(page, who) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(page); else jsErrors.push(`${page}: ${e.message}`); });
  const dom = new JSDOM(read(page), { url: `http://localhost/office-os/pages/${page}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.confirm = (m) => { confirms.push(m); return confirmAnswer; };
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  navigations = [];
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  if (SCRIPT[page]) { try { await import(`./js/pages/${SCRIPT[page]}.js?load=${loads}`); } catch (e) { jsErrors.push(`${page} import: ${e.message}`); } }
}

const S = await import("./js/data/store.js");
const L = await import("./js/data/leave-store.js");
const H = await import("./js/data/holidays.js");
const A = await import("./js/data/attendance-store.js");
const E = await import("./js/data/expenses-store.js");
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;

// ---- readers ----
function parts(node) {
  const out = [];
  const walker = node.ownerDocument.createTreeWalker(node, 4);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (t.parentElement.closest(".avatar")) continue;
    const v = t.textContent.replace(/\s+/g, " ").trim();
    if (v) out.push(v);
  }
  return out.join(" ");
}
const rowsOf = (tbody) => [...tbody.querySelectorAll("tr")].map((tr) => [...tr.children].filter((td) => !td.hidden).map((td) => parts(td)));
const sameMain = (html) => d.querySelector("main").innerHTML.replaceAll(' hidden=""', "") === new JSDOM(html).window.document.querySelector("main").innerHTML;   // app.js may hide buttons by permission
const laRows = () => rowsOf(d.querySelector("table[data-export-name] tbody"));
const pill = (label) => [...d.querySelectorAll(".tabs__tab")].find((p) => txt(p.childNodes[0]) === label);
const pills = () => [...d.querySelectorAll(".tabs__tab")].map((p) => `${txt(p.childNodes[0])}=${txt(p.querySelector(".badge"))}`).join(" ");
const stat = (label) => { const s = [...d.querySelectorAll(".stat")].find((x) => txt(x.querySelector(".stat__label")) === label); return `${txt(s.querySelector(".stat__value"))}${s.querySelector(".stat__delta") ? ` (${txt(s.querySelector(".stat__delta"))})` : ""}`; };
const stats = () => [...d.querySelectorAll(".stat")].map((s) => `${txt(s.querySelector(".stat__label"))}=${txt(s.querySelector(".stat__value"))}${s.querySelector(".stat__delta") ? ` (${txt(s.querySelector(".stat__delta"))})` : ""}`).join(" | ");
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => ({ type: t.className.replace("toast toast--", ""), text: txt(t.querySelector(".toast__text")), html: t.querySelector(".toast__text").innerHTML }));
const clearToasts = () => d.querySelectorAll(".toast").forEach((t) => t.remove());
const button = (row, label) => [...row.querySelectorAll("button")].find((b) => b.textContent.trim() === label);
// Round 8C: the requester's name cell first, then any text (a row with a manager now says "Waiting for <manager>", so any-text matching alone could pick it).
const laRowFor = (text) => { const rows = [...d.querySelectorAll("table[data-export-name] tbody tr")]; return rows.find((tr) => (txt(tr.querySelector(".table__user-name")) ?? "").includes(text)) ?? rows.find((tr) => txt(tr).includes(text)); };
const modal = () => d.getElementById("reject-leave-modal");
const noteError = () => { const e = modal()?.querySelector(".form-error"); return e ? { text: e.textContent, linked: d.getElementById("reject-note").getAttribute("aria-describedby") === e.id } : null; };
const rejectWith = (note) => { d.getElementById("reject-note").value = note; modal().querySelector('button[type="submit"]').click(); };
const fresh = () => { L.resetLeaveData(); S.resetDemoData(); };

async function csvRows() {
  lastBlob = null;
  d.querySelector("[data-export]").click();
  const text = new TextDecoder("utf-8").decode(new Uint8Array(await lastBlob.arrayBuffer())).replace(/^\uFEFF/, "");
  return text.split("\r\n");
}

// =====================================================================
section("leave-approvals: tabs, rows, own requests");
await open("leave/leave-approvals.html", "priya");
fresh();
await open("leave/leave-approvals.html", "priya");
console.log("       Priya pending: " + laRows().map((r) => r.slice(0, 6).join(" / ")).join("  ||  "));
check("LA1", "Priya (HR): Pending = pendingFor(), oldest first; her own LV-2211 is not there", laRows().map((r) => `${r[0]}|${r[2]}`).join(" ; ") === "Rohan Gupta Engineering|13 – 15 Oct ; Arjun Kapoor Engineering|5 Oct ; Sneha Rao Engineering|14 Oct ; Ananya Iyer Sales|9 Oct, first half"
  && !laRows().some((r) => r[0].startsWith("Priya Nair")), laRows().map((r) => r[0]).join(", "));
check("LA2", "row cells: avatar initials, name + department, type, dates, days, applied, stage badge, Reject/Approve",
  (() => { const tr = laRowFor("Rohan Gupta"); return txt(tr.querySelector(".avatar")) === "RG" && laRows()[0].join(" / ") === "Rohan Gupta Engineering / Casual leave / 13 – 15 Oct / 3 / 17 Sep / With manager / Waiting for Sneha Rao"   /* Round 8C: no buttons while it's with the manager (was Reject Approve) */ && laRowFor("Sneha Rao").querySelector(".badge").textContent === "With HR" && tr.querySelector(".badge").className === "badge badge--warning badge--dot"; })(), laRows()[0].join(" / "));
check("LA3", "tab counts: Pending 4, Approved 4, Rejected 1 (cancelled LV-2180 counted nowhere)", pills() === "Pending=4 Approved=4 Rejected=1", pills());
pill("Approved").click();
check("LA4", "Approved tab: decided requests, newest decision first, no actions column (header hidden too)",
  laRows().map((r) => `${r[0].split(" ").slice(0, 2).join(" ")} ${r[2]} ${r[5]}`).join(" ; ") === "Meera Joshi 21 Sep – 1 Oct Approved ; Arjun Kapoor 12 Aug Approved ; Arjun Kapoor 2 – 3 Jul Approved ; Arjun Kapoor 14 – 15 May Approved"
  && d.querySelector("thead th.table__actions").hidden && [...d.querySelectorAll("tbody td.table__actions")].every((td) => td.hidden && !td.children.length), laRows().map((r) => r.join("/")).join(" ; "));
pill("Rejected").click();
check("LA5", "Rejected tab: Arjun's January request", laRows().length === 1 && laRows()[0].slice(0, 3).join(" / ") === "Arjun Kapoor Engineering / Casual leave / 20 – 22 Jan");
const everyTab = ["Pending", "Approved", "Rejected"].flatMap((t) => { pill(t).click(); return laRows().map((r) => r.join("|")); });
check("LA6", "the cancelled request (Rohan, WFH 16 Sep) appears in no tab", !everyTab.some((r) => r.includes("16 Sep")));
pill("Pending").click();
await open("leave/leave-approvals.html", "aarav");
check("LA7", "Aarav (Admin) sees 5 pending, including Priya's LV-2211", laRows().length === 5 && laRows().some((r) => r[0] === "Priya Nair Human Resources" && r[5] === "With manager") && pills() === "Pending=5 Approved=4 Rejected=1", pills());

section("leave-approvals: stats, out next week, overlap alert");
const decidedSeed = L.allRequests().filter((r) => ["approved", "rejected"].includes(r.status));
const avgSeed = (decidedSeed.map((r) => (Date.parse(r.history.at(-1).at) - Date.parse(r.history[0].at)) / 864e5).reduce((a, b) => a + b, 0) / decidedSeed.length).toFixed(1);
await open("leave/leave-approvals.html", "priya");
// Round 9L (behaviour; was "Pending=4"): the stat says what it counts, every request still waiting at either stage
// (hr.html's "Leave for you to decide" is what this person may decide); the figure and its note are unchanged
check("ST1", `stat strip from data: Waiting, all stages 4 (Round 9L, was Pending; oldest sent 17 Sep = 11 days), Sep: 1 approved (LV-2172), 0 rejected, average ${avgSeed} days; no invented lines`,
  stats() === `Waiting, all stages=4 (Oldest is 11 days old) | Approved this month=1 | Rejected this month=0 | Average decision time=${avgSeed} days`, stats());
check("ST2", "none of the old invented lines remain", !/\+6 vs August|Target is 2 days|Mostly clashing|Oldest is 2 days/.test(d.body.textContent));
const out = () => [...d.querySelectorAll("#out-next-week .list__item")].map((i) => parts(i)).join(" | ");
check("ON1", "Out next week (28 Sep – 4 Oct): Meera's approved earned leave only", txt(d.querySelector("#out-next-week .card__meta")) === "28 Sep – 4 Oct" && out() === "Meera Joshi 21 Sep – 1 Oct, Finance Approved", out());
const alertText = () => (d.getElementById("overlap-alert").hidden ? "(hidden)" : d.getElementById("overlap-alert").textContent);
check("OV1", "overlap alert: Rohan (13-15 Oct) and Sneha (14 Oct), both Engineering", alertText() === "Rohan Gupta's dates overlap with 1 other person from Engineering. Check team cover before approving.", alertText());

section("leave-approvals: approve and reject");
const arjunBefore = L.balanceFor("EMP-1105", 2026, 10).casual;
L.decideLeave("LV-2201", "EMP-1029", "emp", "approve");   // Round 8C (setup): Sneha first, so Priya's approval below is the final one
await open("leave/leave-approvals.html", "priya");
confirms.length = 0; confirmAnswer = false; clearToasts();
button(laRowFor("Arjun Kapoor"), "Approve").click();
check("AP1", "Approve asks first; No changes nothing", confirms[0] === "Approve this request?\nArjun Kapoor: Casual leave, 5 Oct (1 day)" && L.getRequest("LV-2201").status === "pending" && toasts().length === 0, JSON.stringify(confirms[0]));
confirmAnswer = true;
button(laRowFor("Arjun Kapoor"), "Approve").click();
const arjunAfter = L.balanceFor("EMP-1105", 2026, 10).casual;
check("AP2", "Yes: approved in the store by Priya, fixed success toast, row gone, counts and stats move",
  L.getRequest("LV-2201").status === "approved" && L.getRequest("LV-2201").history.at(-1).byUserId === "EMP-1003" && JSON.stringify(toasts().map((t) => t.text)) === '["Leave request approved."]'
  && !laRowFor("Arjun Kapoor") && pills() === "Pending=3 Approved=5 Rejected=1" && stat("Approved this month") === "2", `${pills()} | ${stats()}`);
check("AP3", "Arjun's balance: casual pending 1 -> 0, approved 2 -> 3, left 10 -> 9", arjunBefore.pending === 1 && arjunAfter.pending === 0 && arjunAfter.approved === 3 && arjunAfter.left === 9, `${JSON.stringify(arjunBefore)} -> ${JSON.stringify(arjunAfter)}`);
await open("leave/my-leave.html", "arjun");
check("AP4", "Arjun's my-leave shows it: casual card '3 used', row Approved", txt(d.querySelector(".balance .balance__meta")) === "3 used" && laRowsMy().some((r) => r[1] === "5 Oct" && r[4] === "Approved"));
function laRowsMy() { return rowsOf(d.querySelector(".table tbody")); }
L.decideLeave("LV-2189", "EMP-1029", "emp", "approve");   // Round 8C (setup): Sneha first, so Priya decides Rohan's at the HR stage below
await open("leave/leave-approvals.html", "priya");
clearToasts();
button(laRowFor("Rohan Gupta"), "Reject").click();
check("RJ1", "Reject opens the note modal (department-modal markup), describing the request", modal()?.classList.contains("is-open") && txt(modal().querySelector(".modal__desc")) === "Rohan Gupta: Casual leave, 13 – 15 Oct (3 days)"
  && !!modal().querySelector(".modal__dialog .modal__header .modal__close") && !!modal().querySelector("form .modal__body .form-field textarea#reject-note") && !!modal().querySelector(".modal__footer [data-modal-close]"));
rejectWith("");
check("RJ2", "empty note refused inline in the modal, focus on the note, nothing saved, no toast", noteError()?.text === "Add a note saying why the request is rejected." && noteError().linked && d.activeElement?.id === "reject-note" && L.getRequest("LV-2189").status === "pending" && toasts().length === 0 && modal().classList.contains("is-open"), JSON.stringify(noteError()));
rejectWith("    ");
check("RJ3", "spaces-only note refused the same way", noteError()?.text === "Add a note saying why the request is rejected." && L.getRequest("LV-2189").status === "pending");
d.getElementById("reject-note").dispatchEvent(new w.Event("input"));
check("RJ4", "typing clears the error", noteError() === null);
rejectWith('Release week <img src=x onerror="window.__xss=1">');
check("RJ5", "with a note: rejected, note stored, modal closed, fixed toast (note never echoed)",
  L.getRequest("LV-2189").status === "rejected" && L.getRequest("LV-2189").history.at(-1).note.startsWith("Release week") && !modal().classList.contains("is-open")
  && JSON.stringify(toasts().map((t) => t.text)) === '["Leave request rejected."]' && !toasts().some((t) => t.html.includes("<img")) && !w.__xss);
check("RJ6", "counts and stats after: Pending 2, Rejected 2, 'Rejected this month' 1", pills() === "Pending=2 Approved=5 Rejected=2" && stat("Rejected this month") === "1", `${pills()} | ${stats()}`);
check("OV2", "Rohan rejected -> no overlap left -> alert hidden", alertText() === "(hidden)");
button(laRowFor("Sneha Rao"), "Reject").click();
modal().querySelector("[data-modal-close]").click();
check("RJ7", "Cancel closes the modal and decides nothing", !modal().classList.contains("is-open") && L.getRequest("LV-2202").status === "pending");
fresh();
L.decideLeave("LV-2189", "EMP-1029", "emp", "approve");   // Round 8C (setup): Sneha first
await open("leave/leave-approvals.html", "priya");
confirmAnswer = true;
button(laRowFor("Rohan Gupta"), "Approve").click();
check("OV3", "if Rohan is APPROVED instead, Sneha still clashes with an approved request, so the alert stays (now about Sneha)", alertText() === "Sneha Rao's dates overlap with 1 other person from Engineering. Check team cover before approving.", alertText());

section("leave-approvals: search, type filter, tabs, export, pagination");
fresh();
await open("leave/leave-approvals.html", "aarav");
const search = d.querySelector(".input--search"), typeSel = d.querySelector('select[aria-label="Filter by leave type"]');
const setSearch = (v) => { search.value = v; search.dispatchEvent(new w.Event("input", { bubbles: true })); };
const setType = (v) => { typeSel.value = v; typeSel.dispatchEvent(new w.Event("change")); };
check("SF1", "type options from LEAVE_POLICY, including Unpaid", [...typeSel.options].map((o) => `${o.value || "(all)"}=${o.textContent}`).join(", ") === "(all)=All types, casual=Casual leave, sick=Sick leave, earned=Earned leave, wfh=Work from home, unpaid=Unpaid leave");
setSearch("sneha");
check("SF2", "search 'sneha' -> 1 row (and table-filter.js doesn't also hide rows)", laRows().length === 1 && laRows()[0][0].startsWith("Sneha Rao") && [...d.querySelectorAll("tbody tr")].every((tr) => !tr.hidden));
setSearch(""); setType("wfh");
check("SF3", "type Work from home -> Priya's LV-2211 only", laRows().length === 1 && laRows()[0][0].startsWith("Priya Nair"));
setType("casual"); setSearch("a");
check("SF4", "casual AND name contains 'a' -> Rohan, Arjun, Sneha, Ananya", laRows().length === 4);
pill("Approved").click();
check("SF5", "Approved tab keeps the filters: casual + 'a' -> Arjun's May leave only", laRows().length === 1 && laRows()[0][2] === "14 – 15 May", laRows().map((r) => r[2]).join());
setType("sick"); setSearch("arjun");
check("SF6", "Approved + sick + 'arjun' -> Jul", laRows().length === 1 && laRows()[0][2] === "2 – 3 Jul");
setSearch("nobody");
check("SF7", "no match -> empty-state row", laRows().length === 1 && laRows()[0][0] === "No requests match these filters.");
setSearch("arjun"); setType("");
let csv = await csvRows();
check("EX1", "Export (Approved tab, 'arjun'): header without Actions, exactly the 3 visible rows", csv[0] === "Employee,Department,Type,Dates,Days,Applied,Stage" && csv.length === 4 && csv.slice(1).every((l) => l.startsWith("Arjun Kapoor,Engineering,")) && csv[1] === "Arjun Kapoor,Engineering,Work from home,2026-08-12,1,2026-08-10,Approved" /* Round Data export (behaviour; was 12 Aug, 10 Aug: ISO dates); Round Data export part 2 (behaviour; was "Arjun Kapoor Engineering" in one cell) */, csv.join(" / "));
pill("Pending").click(); setSearch("");
csv = await csvRows();
check("EX2", "Export (Pending tab): the 5 pending rows, no button text", csv.length === 6 && !csv.join().includes("Approve"), csv.join(" / "));
setSearch("nobody");
csv = await csvRows();
check("EX3", "Export with nothing shown: header only (the empty-state row isn't data)", csv.length === 1);
setSearch("");
const weekdays = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-09", "2026-11-10", "2026-11-11"];
weekdays.forEach((day, i) => { const r = L.applyLeave(["EMP-1017", "EMP-1088"][i % 2], { type: "unpaid", from: day, to: day, reason: "x" }); if (!r.ok) console.log("   setup failed:", r.error); });
await open("leave/leave-approvals.html", "aarav");
const pag = d.querySelector(".pagination");
check("PG1", "13 pending -> 10 on page 1, 'Showing 1 to 10 of 13'", laRows().length === 10 && txt(pag.querySelector("span")) === "Showing 1 to 10 of 13", txt(pag));
[...pag.querySelectorAll(".pagination__btn")].find((b) => b.textContent === "Next").click();
check("PG2", "Next -> 3 rows on page 2", laRows().length === 3 && txt(pag.querySelector("span")) === "Showing 11 to 13 of 13");

section("leave-approvals: who can open it");
for (const who of ["arjun", "kabir"]) {
  await open("leave/leave-approvals.html", who);
  const staticRows = new JSDOM(read("leave/leave-approvals.html")).window.document.querySelector("tbody").innerHTML;
  check("GD", `${who}: guard sends them to 403 and the page script draws nothing`, navigations.length === 1 && d.querySelector("tbody").innerHTML === staticRows, `navigations=${navigations.length}`);
}
await open("leave/leave-approvals.html", "old");
check("OLD1", "old session (no employeeId): main is the static page", sameMain(read("leave/leave-approvals.html")));

// =====================================================================
section("holidays");
fresh();
await open("leave/holidays.html", "arjun");
const cal = () => ({ title: txt(d.querySelector("#holiday-calendar .card__title")), meta: txt(d.querySelector("#holiday-calendar .card__meta")) });
const cells = () => [...d.querySelectorAll("#holiday-calendar .calendar__day")];
const cell = (day) => cells().find((c) => txt(c.querySelector(".calendar__date")) === String(day));
const list = () => [...d.querySelectorAll("#holiday-list .list__item")].map((i) => `${txt(i.querySelector(".date-tile__month"))} ${txt(i.querySelector(".date-tile__day"))} ${txt(i.querySelector(".list__title"))} (${txt(i.querySelector(".list__sub"))}) ${txt(i.querySelector(".badge"))}${i.querySelector(".date-tile--muted") ? " [muted]" : ""}`);
const summary = () => [...d.querySelectorAll("#holiday-summary .kv__row")].map((r) => `${txt(r.querySelector("dt"))}=${txt(r.querySelector("dd"))}`).join(", ");
const yearSel = () => d.querySelector('select[aria-label="Choose year"]');
check("HO1", "calendar opens on October 2026 (next holiday is 2 Oct), 2 holidays", JSON.stringify(cal()) === '{"title":"October 2026","meta":"2 holidays"}', JSON.stringify(cal()));
check("HO2", "Oct grid: 3 empty cells (1 Oct is a Thursday), Gandhi Jayanti tagged, weekends, future days, 1 trailing empty",
  cells().slice(0, 3).every((c) => c.className.includes("--empty")) && cell(1).className === "calendar__day calendar__day--future" && cell(2).className === "calendar__day calendar__day--holiday" && txt(cell(2).querySelector(".calendar__tag")) === "Gandhi Jayanti"
  && cell(3).className === "calendar__day calendar__day--weekend" && cell(20).querySelector(".calendar__tag")?.textContent === "Dussehra" && cells().length === 35 && cells().at(-1).className.includes("--empty"),
  `${cells().length} cells`);
console.log("       list: " + list().join(" | "));
check("HO3", "2026 list: 7 holidays, weekday + kind, Past (muted) / Upcoming from today", list().join(" | ") === "Jan 26 Republic Day (Monday, national) Past [muted] | Mar 4 Holi (Wednesday, company) Past [muted] | Aug 15 Independence Day (Saturday, national) Past [muted] | Oct 2 Gandhi Jayanti (Friday, national) Upcoming | Oct 20 Dussehra (Tuesday, company) Upcoming | Nov 8 Diwali (Sunday, company) Upcoming | Dec 25 Christmas (Friday, optional) Upcoming");
check("HO4", "summary and card meta counts", summary() === "National holidays=3, Company holidays=3, Optional holidays=1, Total listed=7" && txt(d.querySelector("#holiday-list .card__meta")) === "7 listed" && txt(d.querySelector("#holiday-list .card__title")) === "2026 holidays");
check("HO5", "Arjun (no holidays:manage): Add and Remove hidden; alert reworded", d.querySelector('.page-header__actions [data-permission="holidays:manage"]').hidden && [...d.querySelectorAll("#holiday-list button")].every((b) => b.hidden)
  && txt(d.querySelector(".alert")) === "HR adds and removes holidays from this page. Weekends and company or national holidays aren't counted as leave days.");
const nav = (dir) => d.querySelector(`[data-month="${dir}"]`).click();
nav("prev");
check("HO6", "previous month: September 2026, 0 holidays; 28 Sep marked today", cal().title === "September 2026" && cal().meta === "0 holidays" && cell(28).className.includes("calendar__day--today"));
nav("next"); nav("next");
check("HO7", "next twice: November 2026 with Diwali on Sunday 8th (holiday wins over weekend)", cal().title === "November 2026" && cell(8).className === "calendar__day calendar__day--holiday");
for (let i = 0; i < 12; i++) nav("next");
check("HO8", "stops at December (the year select owns the year): Next disabled", cal().title === "December 2026" && d.querySelector('[data-month="next"]').disabled);
for (let i = 0; i < 12; i++) nav("prev");
check("HO9", "stops at January: Prev disabled; 26 Jan past holiday tagged", cal().title === "January 2026" && d.querySelector('[data-month="prev"]').disabled && txt(cell(26).querySelector(".calendar__tag")) === "Republic Day");

await open("leave/holidays.html", "priya");
const addBtn = () => d.querySelector('.page-header__actions [data-permission="holidays:manage"]');
const hfield = (id, v) => { d.getElementById(id).value = v; };
const hError = (id) => { const i = d.getElementById(id); const e = i.closest(".form-field").querySelector(".form-error"); return e ? e.textContent : null; };
const hSubmit = () => d.querySelector('#holiday-modal button[type="submit"]').click();
check("HA0", "Priya: Add visible and no longer a placeholder; Remove buttons visible", !addBtn().hidden && !addBtn().hasAttribute("data-not-implemented") && [...d.querySelectorAll("#holiday-list button")].every((b) => !b.hidden));
clearToasts(); addBtn().click();
check("HA1", "Add opens the modal with empty fields", d.getElementById("holiday-modal").classList.contains("is-open") && d.getElementById("holiday-date").value === "" && toasts().length === 0);
hfield("holiday-date", "2026-10-02"); hfield("holiday-name", "Another"); hfield("holiday-kind", "company"); hSubmit();
check("HA2", "duplicate date: inline error on Date, nothing added, no toast", hError("holiday-date") === "Gandhi Jayanti is already on that date." && H.getAllHolidays().length === 7 && toasts().length === 0);
hfield("holiday-date", "2026-11-09"); hfield("holiday-kind", ""); hSubmit();
check("HA3", "no kind chosen: inline error on Kind", hError("holiday-kind") === "Kind must be national, company or optional." && hError("holiday-date") === null);
hfield("holiday-kind", "company"); hfield("holiday-name", "  "); hSubmit();
check("HA4", "blank name: inline error on Name", hError("holiday-name") === "Holiday name is required.");
const wdBefore = L.workingDays("2026-11-09", "2026-11-13");
hfield("holiday-name", "Bhai Dooj <b>x</b>"); hSubmit();
check("HA5", "valid: added, modal closed, fixed toast, calendar jumps to Nov 2026 showing it, summary updated",
  H.getAllHolidays().length === 8 && !d.getElementById("holiday-modal").classList.contains("is-open") && JSON.stringify(toasts().map((t) => t.text)) === '["Holiday added."]'
  && cal().title === "November 2026" && cal().meta === "2 holidays" && txt(cell(9).querySelector(".calendar__tag")) === "Bhai Dooj <b>x</b>" && !cell(9).querySelector("b") && summary().startsWith("National holidays=3, Company holidays=4"), `${cal().title}, ${summary()}`);
const wdAfter = L.workingDays("2026-11-09", "2026-11-13");
check("HA6", "the new company holiday changes workingDays(Mon 9 – Fri 13 Nov): 5 -> 4", wdBefore === 5 && wdAfter === 4, `${wdBefore} -> ${wdAfter}`);
const bhai = () => [...d.querySelectorAll("#holiday-list .list__item")].find((i) => txt(i).includes("Bhai Dooj"));
confirms.length = 0; confirmAnswer = false; clearToasts();
button(bhai(), "Remove").click();
check("HR1", "Remove asks first; No keeps it", confirms[0] === "Remove Bhai Dooj <b>x</b> on 9 Nov 2026?" && H.getAllHolidays().length === 8);
confirmAnswer = true;
button(bhai(), "Remove").click();
check("HR2", "Yes: removed, fixed toast, list/summary updated, workingDays back to 5", H.getAllHolidays().length === 7 && !bhai() && JSON.stringify(toasts().map((t) => t.text)) === '["Holiday removed."]' && L.workingDays("2026-11-09", "2026-11-13") === 5 && summary().includes("Total listed=7"));
addBtn().click(); hfield("holiday-date", "2027-01-26"); hfield("holiday-name", "Republic Day"); hfield("holiday-kind", "national"); hSubmit();
check("HY1", "adding a 2027 holiday: year options 2027, 2026; view switches to 2027", [...yearSel().options].map((o) => o.value).join() === "2027,2026" && yearSel().value === "2027" && cal().title === "January 2027" && list().length === 1 && summary() === "National holidays=1, Company holidays=0, Optional holidays=0, Total listed=1");
yearSel().value = "2026"; yearSel().dispatchEvent(new w.Event("change"));
check("HY2", "back to 2026: list 7, calendar on the next holiday's month again", list().length === 7 && cal().title === "October 2026");
await open("leave/holidays.html", "old");
check("HO10", "any session works here, even an old one with no employeeId", cal().title === "October 2026" && list().length === 7);

// =====================================================================
section("approvals-inbox");
fresh();
// Round 8C (setup): Sneha approves her reports' LV-2189 and LV-2201 first, so they wait at Priya's stage and her inbox
// holds the same four leave requests as before (that HR doesn't see requests still with a manager: chain.mjs H5).
L.decideLeave("LV-2189", "EMP-1029", "emp", "approve"); L.decideLeave("LV-2201", "EMP-1029", "emp", "approve");
await open("requests/approvals-inbox.html", "priya");
const inbox = () => rowsOf(d.querySelector("#inbox-table tbody"));
const decidedRows = () => rowsOf(d.querySelector("#decided-table tbody"));
const inboxRow = (text) => [...d.querySelectorAll("#inbox-table tbody tr")].find((tr) => txt(tr).includes(text));
// Round 3D: the seeded attendance corrections join the inbox (3 pending; RG-101 approved on 25 Sep, inside
// the last 7 days; RG-105 rejected earlier). The average response covers leave and corrections.
const decidedFixes = A.allRegularizations().filter((r) => r.status === "approved" || r.status === "rejected");
const avgInbox = (() => { const all = [...decidedSeed, ...decidedFixes]; return (all.map((r) => (Date.parse(r.history.at(-1).at) - Date.parse(r.history[0].at)) / 864e5).reduce((a, b) => a + b, 0) / all.length).toFixed(1); })();
console.log("       Priya inbox: " + inbox().map((r) => r.slice(0, 5).join(" / ")).join("  ||  "));
check("IB1", "Priya: 3 static rows, then her 4 leave requests and the 3 pending corrections (none her own), oldest sent first", inbox().length === 10 && inbox().slice(0, 3).map((r) => r[1]).join() === "Access,Purchase,System"
  && inbox().slice(3).map((r) => r[0]).join(" ; ") === "Leave: Rohan Gupta, 13 – 15 Oct ; Leave: Arjun Kapoor, 5 Oct ; Leave: Sneha Rao, 14 Oct ; Regularization: Ananya Iyer, 18 Sep ; Regularization: Sneha Rao, 21 Sep ; Regularization: Vikram Singh, 23 Sep ; Leave: Ananya Iyer, 9 Oct, first half");
// Waiting is real elapsed time, so it depends on which instant "10:00 local" is in this time zone.
const waited = (id) => { const days = Math.floor((NOW - Date.parse(L.getRequest(id).history[0].at)) / 864e5); return `${days} ${days === 1 ? "day" : "days"}`; };
check("IB2", `leave row: type Leave, requested by, details, waiting since sent (${waited("LV-2189")} here)`, inbox()[3].slice(1, 5).join(" / ") === `Leave / Rohan Gupta / Casual leave, 3 days / ${waited("LV-2189")}` && inbox()[9][4] === waited("LV-2208"), inbox()[3].join(" / "));
check("IB3", "tab counts: Pending 3+4+3, Approved 1+4+1, Rejected 1+1+1 (static + leave + corrections; 6E: the static headset row gone)", pills() === "Pending=10 Approved=6 Rejected=3", pills());
// Round 13Z (behaviour, A8): the stat is waitingCount(), the sidebar's number: samples wait for nobody. The tab's count (IB3) still counts the rows shown.
check("IB4", `stats: Waiting for you = 7; RG-101 approved this week; average ${avgInbox} days from leave and correction decisions; invented lines gone`,
  stats() === `Waiting for you=7 | Approved this week=1 | Rejected this week=0 | Average response=${avgInbox} days` && !/Oldest waited|\+3 vs last week|Wrong backup|Target is 1 day/.test(d.body.textContent), stats());
check("IB5", "Recently decided: RG-101 (approved 25 Sep), then the 2 static rows (no leave decided in the last 7 days yet; 6E: the 14 Sep headset row gone)", decidedRows().length === 3 && decidedRows().map((r) => r[4]).join() === "25 Sep,16 Sep,11 Sep"
  && decidedRows()[0].join(" / ") === "Regularization: Arjun Kapoor, 24 Sep / Attendance / Arjun Kapoor / Approved / 25 Sep", decidedRows()[0]?.join(" / "));
clearToasts();
button(inboxRow("Role change"), "Approve").click(); button(inboxRow("Purchase order"), "Reject").click();
check("IB6", "static rows: placeholder toasts, rows untouched", JSON.stringify(toasts().map((t) => t.text)) === `["Approve isn't available in this demo.","Reject isn't available in this demo."]` && inbox().length === 10);
clearToasts(); confirmAnswer = true;
button(inboxRow("Leave: Sneha Rao"), "Approve").click();
check("ID1", "approve from the inbox: store updated, fixed toast, counts move, Recently decided gets it first",
  L.getRequest("LV-2202").status === "approved" && JSON.stringify(toasts().map((t) => t.text)) === '["Leave request approved."]' && pills() === "Pending=9 Approved=7 Rejected=3"
  && decidedRows()[0].join(" / ") === "Leave: Sneha Rao, 14 Oct / Leave / Sneha Rao / Approved / 28 Sep" && stat("Approved this week") === "2", `${pills()} | ${decidedRows()[0]?.join(" / ")}`);
button(inboxRow("Leave: Ananya Iyer"), "Reject").click();
rejectWith("");
check("ID2", "reject from the inbox: same modal, empty note refused inline", noteError()?.text === "Add a note saying why the request is rejected." && L.getRequest("LV-2208").status === "pending");
rejectWith("Clashes with the quarterly review");
check("ID3", "with a note: rejected; Recently decided shows it", L.getRequest("LV-2208").status === "rejected" && decidedRows().some((r) => r[0] === "Leave: Ananya Iyer, 9 Oct, first half" && r[3] === "Rejected") && stat("Rejected this week") === "1");
await open("leave/leave-approvals.html", "priya");
pill("Approved").click();
const approvedHere = laRows().map((r) => r[0]);
pill("Rejected").click();
check("ID4", "decisions made in the inbox show in leave-approvals (Sneha under Approved, Ananya under Rejected)", approvedHere[0] === "Sneha Rao Engineering" && laRows()[0][0] === "Ananya Iyer Sales", `${approvedHere[0]} / ${laRows()[0][0]}`);
await open("requests/approvals-inbox.html", "priya");
const tsel = d.querySelector('select[aria-label="Filter by type"]');
const pickType = (v) => { tsel.value = v; tsel.dispatchEvent(new w.Event("change")); };
pickType("leave");
check("IF1", "type filter Leave (new option): only leave rows", inbox().length === 2 && inbox().every((r) => r[1] === "Leave") && txt(d.querySelector("#inbox-table").closest(".card").querySelector(".card__footer .card__meta")) === "Showing 2 of 8 pending requests");
pickType("access");
// Round 9Q (behaviour; was "Role change: Sneha Rao"): the sample names no real person (generic.mjs A1)
check("IF2", "Access: the static role-change row", inbox().length === 1 && inbox()[0][0].includes("Role change: an employee"));
pill("Approved").click(); pickType("access");
check("IF3", "Approved + Access: the static role change, with its decision date; column header says Decided; no Payroll type offered (Round 4G)", inbox().length === 1 && inbox()[0].slice(0, 5).join(" / ") === "Role change: an employee Sample, not built yet / Access / An HR Manager / — / 16 Sep" /* Round 9Q (behaviour; was "Role change: Divya Menon … Priya Nair (HR)"): no real person (generic.mjs C1) */ && txt(d.querySelector("#inbox-table thead th:nth-child(5)")) === "Decided"
  && ![...tsel.options].some((o) => o.value === "payroll"), inbox()[0]?.join(" / "));
pickType("leave");
check("IF4", "Approved + Leave: real approved leave, newest decision first", inbox()[0][0] === "Leave: Sneha Rao, 14 Oct" && inbox().every((r) => r[1] === "Leave") && inbox().length === 5);
await open("requests/approvals-inbox.html", "aarav");
check("IB7", "Aarav: sees Priya's LV-2211 too", inbox().some((r) => r[0].includes("Leave: Priya Nair")));
await open("requests/approvals-inbox.html", "kabir");
// Round 5E: Kabir's Finance-stage expense claims (pendingFor) join the 3 samples; still no leave anywhere.
const kabirClaims = E.pendingFor("EMP-1008", "fin").length;
check("IB8", "Kabir (Finance, no leave:approve): the 3 static rows + his own expense claims; no leave waiting on him or decided this week (Round 8C: his Approved tab now holds LV-2172, approved as Meera's manager in the seed, so Approved is 4, was 3)", pills().includes("Approved=4") && inbox().filter((r) => r[1] !== "Expense").length === 3 && inbox().filter((r) => r[1] === "Expense").length === kabirClaims && kabirClaims > 0
  && !inbox().some((r) => r[1] === "Leave") && !decidedRows().some((r) => r[1] === "Leave") && stats().startsWith(`Waiting for you=${kabirClaims} |`), `${pills()} | ${stats()}`);
await open("requests/approvals-inbox.html", "arjun");
// Round 5E: the inbox is personal (route null): Arjun isn't redirected; he has nothing to decide and sees no samples.
check("IB9", "Arjun (no approvals:view, manages nobody): no redirect, an empty personal inbox, no sample rows", navigations.length === 0 && inbox().length === 1 && inbox()[0][0] === "Nothing is waiting for you."
  && !d.querySelector("tr[data-static]"), `${navigations.length} redirects; ${JSON.stringify(inbox())}`);
await open("requests/approvals-inbox.html", "old");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("IB10", "old session: signed out and sent to sign in (round 11P, N2); nothing personal drawn", navigations.length === 1 && localStorage.getItem("officeos:session") === null && !d.querySelector("main tr[data-request-id], main tr[data-claim-id]"), JSON.stringify([navigations.length, sameMain(read("requests/approvals-inbox.html"))]));

// =====================================================================
section("Part 4: pages that used to load approvals.js");
const PART4 = ["dashboard/admin.html", "dashboard/hr.html", "dashboard/finance.html", "attendance/regularization.html", "finance/expenses.html", "inventory/asset-assignment.html", "leave/leave-approvals.html", "requests/approvals-inbox.html"];
// Round 13L (coverage; 11P P9.5, round-13k-scoping.md K1.5): the inbox's old session is signed out since 11P, so P4 found
// none of its 6 sample buttons. The inbox is opened as Priya (HR: approvals:view, the samples show) and only the rows
// marked data-static are clicked (the real rows' buttons aren't placeholders).
const INBOX = "requests/approvals-inbox.html";
for (const page of PART4) {
  await open(page, page === INBOX ? "priya" : "old");   // no page script involvement: the static markup as shipped
  const btns = [...d.querySelectorAll(page === INBOX ? "main tr[data-static] button" : "main button")].filter((b) => /^(Approve|Reject)$/.test(b.textContent.trim()));
  const rowsBefore = d.querySelectorAll("main tr, main .list__item").length;
  clearToasts();
  btns.forEach((b) => { if (!b.hidden) b.click(); });
  const texts = toasts().map((t) => t.text);
  const clicked = btns.filter((b) => !b.hidden);
  check("P4", `${page}: no approvals.js; ${btns.length} Approve/Reject buttons all marked; clicking shows the placeholder, removes nothing`,
    !read(page).includes("pages/approvals.js") && btns.every((b) => b.dataset.notImplemented === b.textContent.trim()) && texts.length === clicked.length
    && texts.every((t) => /^(Approve|Reject) isn't available in this demo\.$/.test(t)) && d.querySelectorAll("main tr, main .list__item").length === rowsBefore
    && (page !== "dashboard/admin.html" || btns.length === 0)   // Round 9B (behaviour; was 6): admin.html's sample Pending approvals card is gone, so it has none
    && (page !== INBOX || (btns.length === 6 && clicked.length === 6)),   // Round 13L: the inbox's 6 sample buttons, all clicked
    `${btns.length} buttons, ${clicked.length} visible to this role, ${texts.length} toasts`);
}
check("P4x", "approvals.js is gone from the staged js folder", !fs.existsSync(new URL("./js/pages/approvals.js", import.meta.url)));
check("ERR", "no uncaught JS errors across all page loads", jsErrors.length === 0, jsErrors.join(" / ") || `none (${loads} page loads)`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
