// usage: node mgrscope.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round Manager scoping part 2 (JS stage), in jsdom with the js in ./js. The decisions: memory manager-scoping-decisions.
//   H  data/reporting.js: managerOf / directReportsOf / isManager / teamScope, the approval chain's manager stage (managerFor) and nothing else;
//      managesAnyone is isManager; direct reports only; a manager on leave isn't one; an inactive report still reports
//   G  who opens team-attendance.html and team-leave.html (the guard, canOpenPage), and who the sidebar and the search offer them to
//   T  team attendance, per person: the rows are exactly their direct reports (everyone with attendance:view-all), the stats count only them, no
//      Export for a manager-only view; nothing outside the team in the page's DOM, through the page's search, department filter or URL parameters
//   L  Team leave, per person: calendar, Out in the next 7 days, the overlap alert, balances and past requests only of their reports (everyone
//      with leave:approve); read-only; no pay, bank or ID details anywhere; no export
//   S  Data scope wording on my-profile, user-profile, user-form and role-editor
//   X  an indirect report (Vikram made Rohan's): Sneha never sees him, Rohan does; Aarav (Admin) sees all
//   E99 no js errors
// The clock is local wall time (Mon 28 Sep 2026 10:00); storage is in memory, seeded when first read.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const read = (...p) => (fs.existsSync(path.join(...p)) ? fs.readFileSync(path.join(...p), "utf8") : "");

const RealDate = Date;
const NOW = new RealDate(2026, 8, 28, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const ID = { aarav: "EMP-1001", priya: "EMP-1003", kabir: "EMP-1008", ananya: "EMP-1017", meera: "EMP-1023", sneha: "EMP-1029", rohan: "EMP-1042", divya: "EMP-1061", vikram: "EMP-1088", arjun: "EMP-1105" };
const ROLE = { aarav: "admin", priya: "hr", kabir: "fin" };
const NAME = { aarav: "Aarav Mehta", priya: "Priya Nair", kabir: "Kabir Shah", ananya: "Ananya Iyer", meera: "Meera Joshi", sneha: "Sneha Rao", rohan: "Rohan Gupta", divya: "Divya Menon", vikram: "Vikram Singh", arjun: "Arjun Kapoor" };
const PEOPLE = ["sneha", "rohan", "arjun", "kabir", "meera", "priya", "aarav", "ananya"];
const session = () => JSON.parse(mem.get("officeos:session") ?? "null");
const fresh = (who) => { mem.clear(); timers = []; if (who) mem.set("officeos:session", JSON.stringify({ roleKey: ROLE[who] ?? "emp", userLabel: NAME[who], employeeId: ID[who], signedInAt: NOW })); };

let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, query = "") {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) allJsErrors.push(`${page}${query}: ${e.message}`); });
  const html = read(DIR, `${page}.html`);
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, getComputedStyle: w.getComputedStyle.bind(w) });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`./js/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); }
  }
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} timer: ${e.message}`); } });
}
let hrefs = [];
function stubWindow(page) {
  hrefs = [];
  globalThis.window = { location: { pathname: `/office-os/pages/${page}`, set href(v) { hrefs.push(v); }, get href() { return `http://localhost/office-os/pages/${page}`; } } };
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const TA = "attendance/team-attendance", TL = "leave/team-leave";

const S = await import("./js/data/store.js");
// on a tree without the helper (pristine, stage C) the H checks fail rather than the suite crashing
const RP = await import("./js/data/reporting.js").catch(() => ({ managerOf: () => "no helper", directReportsOf: () => [], isManager: () => "no helper", teamScope: () => "no helper" }));
const LS = await import("./js/data/leave-store.js");
const EX = await import("./js/data/expenses-store.js");
const G = await import("./js/core/guard.js");
function editRecord(id, field, value) {
  S.getAllUsers();
  const box = JSON.parse(mem.get("officeos:users"));
  box.records.find((u) => u.id === id)[field] = value;
  mem.set("officeos:users", JSON.stringify(box));
}
const keyOf = Object.fromEntries(Object.entries(ID).map(([k, v]) => [v, k]));
const names = (ids) => ids.map((i) => keyOf[i] ?? i);
// every name on record that shows in the page's main or sidebar (the topbar carries the signed-in person's own)
const namesIn = (root) => Object.keys(NAME).filter((k) => txt(root).includes(NAME[k]));
const main = () => d.querySelector("main");

// =================================================================
section("H. data/reporting.js: who reports to whom");
fresh();
const h1 = Object.fromEntries(PEOPLE.map((k) => [k, names(RP.directReportsOf(ID[k]).map((u) => u.id))]));
check("H1", "direct reports: Sneha Arjun and Rohan; Kabir Meera; Aarav Kabir and Priya; nobody else has any", j(h1) === j({ sneha: ["arjun", "rohan"], rohan: [], arjun: [], kabir: ["meera"], meera: [], priya: [], aarav: ["kabir", "priya"], ananya: [] }), j(h1));
const h2 = Object.fromEntries(Object.keys(ID).map((k) => [k, RP.managerOf(ID[k]) === LS.managerFor(ID[k]) && RP.isManager(ID[k]) === EX.managesAnyone(ID[k]) && RP.isManager(ID[k]) === S.getAllUsers().some((u) => u.id !== ID[k] && LS.managerFor(u.id) === ID[k])]));
check("H2", "the approval chain's rule, not a second one: managerOf is managerFor, and isManager is managesAnyone and 'someone's managerFor is them', for all ten people", Object.values(h2).every(Boolean), j(h2));
const ids = (s) => (s instanceof Set ? [...s].sort() : s);   // a non-Set fails the check instead of crashing the suite
check("H3", "teamScope: null with the page's own permission; else exactly the direct reports' ids (an empty Set for nobody)",
  RP.teamScope(ID.sneha, true) === null && j(ids(RP.teamScope(ID.sneha, false))) === j([ID.arjun, ID.rohan].sort()) && RP.teamScope(ID.arjun, false)?.size === 0, j(ids(RP.teamScope(ID.sneha, false))));
fresh(); editRecord(ID.sneha, "status", "on-leave");
const h4 = [RP.isManager(ID.sneha), RP.managerOf(ID.rohan)];
fresh(); editRecord(ID.rohan, "status", "inactive");
const h5 = names(RP.directReportsOf(ID.sneha).map((u) => u.id));
check("H4", "Sneha on leave is no manager (her reports' requests go to HR, as the chain says); Rohan inactive still reports to her (his old records may be listed)", j(h4) === j([false, null]) && j(h5) === j(["arjun", "rohan"]), j([h4, h5]));

// =================================================================
section("G. Who opens the team pages, and who is offered them");
function guard(who, page) { fresh(who); stubWindow(page); const ok = G.guardPage(); return ok ? "opens" : hrefs[0]?.includes("403") ? "403" : j(hrefs); }
const OPENS = { sneha: "opens", rohan: "403", arjun: "403", kabir: "opens", meera: "403", priya: "opens", aarav: "opens", ananya: "403" };
const g1 = Object.fromEntries(PEOPLE.map((k) => [k, [guard(k, `${TA}.html`), guard(k, `${TL}.html`)]]));
console.log("      guard (team attendance, team leave):", j(g1));
check("G1", "team attendance and Team leave open for the managers (Sneha, Kabir) and HR and Admin; Rohan, Arjun, Meera and Ananya get the 403 page", PEOPLE.every((k) => g1[k][0] === OPENS[k] && g1[k][1] === OPENS[k]), j(g1));
const links = () => [...d.querySelectorAll(".sidebar a, nav a")].map((a) => a.getAttribute("href") ?? "");
const search = (q) => { const i = d.querySelector(".topbar__search input"); i.value = q; i.dispatchEvent(new w.Event("input")); return [...d.querySelectorAll("#search-results [role=option]")].map((o) => o.getAttribute("href") ?? o.querySelector("a")?.getAttribute("href") ?? txt(o)); };
const offered = {};
for (const k of PEOPLE) {
  fresh(k); await open("account/my-profile");
  const side = links(); const found = [...search("team"), ...search("attendance"), ...search("leave")];
  offered[k] = [side.some((h) => h.endsWith("team-attendance.html")), side.some((h) => h.endsWith("team-leave.html")), found.some((h) => String(h).endsWith("team-attendance.html")), found.some((h) => String(h).endsWith("team-leave.html"))];
}
console.log("      offered (sidebar TA, TL, search TA, TL):", j(offered));
check("G2", "the sidebar lists Team attendance and Team leave, and the search finds them, for exactly those who can open them", PEOPLE.every((k) => offered[k].every((x) => x === (OPENS[k] === "opens"))), j(offered));
fresh("sneha"); stubWindow("dashboard/employee.html");
check("G3", "canOpenPage: Sneha opens only those two of the routed pages Employees can't (no leave-approvals, regularization, users)",
  G.canOpenPage(`${TA}.html`) && G.canOpenPage(`${TL}.html`) && !G.canOpenPage("leave/leave-approvals.html") && !G.canOpenPage("attendance/regularization.html") && !G.canOpenPage("users/users-list.html") && !G.canOpenPage("payroll/payroll-run.html"));

// =================================================================
section("T. Team attendance, per person");
const ta = {};
for (const k of PEOPLE.filter((x) => OPENS[x] === "opens")) {
  fresh(k); await open(TA);
  const rows = [...d.querySelectorAll("#team-rows tr")].map((tr) => txt(tr.querySelector(".table__user-name"))).filter(Boolean);
  ta[k] = { rows, inMain: namesIn(main()), export: Boolean(d.querySelector("main [data-export]")), present: txt(d.querySelector('[data-stat="present"] .stat__value')), bars: d.querySelectorAll("#team-dept-bars > *").length };
}
console.log("      team attendance:", j(ta));
const ALL_ACTIVE = Object.keys(NAME).filter((k) => k !== "divya").map((k) => NAME[k]).sort();
check("T1", "the rows: Sneha Arjun and Rohan, Kabir Meera; Priya and Aarav every active employee (Divya, inactive, never)",
  j([...ta.sneha.rows].sort()) === j([NAME.arjun, NAME.rohan]) && j(ta.kabir.rows) === j([NAME.meera]) && j([...ta.priya.rows].sort()) === j(ALL_ACTIVE) && j([...ta.aarav.rows].sort()) === j(ALL_ACTIVE), j(Object.fromEntries(Object.entries(ta).map(([k, v]) => [k, v.rows]))));
check("T2", "nothing outside the team in the page: a manager's main names only their reports (and not even themselves elsewhere in it)",
  j([...ta.sneha.inMain].sort()) === j(["arjun", "rohan"]) && j(ta.kabir.inMain) === j(["meera"]), j([ta.sneha.inMain, ta.kabir.inMain]));
check("T3", "no Export for a manager-only view (Kabir holds reports:export, Sneha doesn't); HR and Admin keep it", !ta.sneha.export && !ta.kabir.export && ta.priya.export && ta.aarav.export, j(Object.fromEntries(Object.entries(ta).map(([k, v]) => [k, v.export]))));
fresh("sneha"); await open(TA);
const sumBefore = txt(d.querySelector('[data-stat="present"] .stat__value'));
const deptBars = [...d.querySelectorAll("#team-dept-bars > *")].map(txt);
check("T4", "the stats and department bars count only the team: present is at most 2, and only Engineering has a bar", Number(sumBefore) <= 2 && deptBars.length === 1 && /Engineering/.test(deptBars[0]), j([sumBefore, deptBars]));
const searchBox = d.getElementById("team-search");
const probe = {};
for (const q of ["Priya", "Kabir", "Vikram", "a", ""]) { searchBox.value = q; searchBox.dispatchEvent(new w.Event("input")); probe[q] = namesIn(main()); }
const deptSel = d.getElementById("team-dept");
const byDept = {};
for (const o of [...deptSel.options]) { deptSel.value = o.value; deptSel.dispatchEvent(new w.Event("change")); byDept[o.value || "all"] = namesIn(main()); }
d.getElementById("team-sort")?.click();
const afterSort = namesIn(main());
check("T5", "the page's own search, the department filter and the sort never bring in anyone else", Object.values(probe).every((n) => n.every((k) => ["arjun", "rohan"].includes(k))) && Object.values(byDept).every((n) => n.every((k) => ["arjun", "rohan"].includes(k))) && afterSort.every((k) => ["arjun", "rohan"].includes(k)), j({ probe, byDept, afterSort }));
const viaUrl = {};
for (const q of ["?id=EMP-1003", "?employee=EMP-1017&user=EMP-1001", "?dept=SAL&date=2026-09-25", "?scope=all"]) { fresh("sneha"); await open(TA, q); viaUrl[q] = namesIn(main()); }
check("T6", "URL parameters change nothing: a manager's page still names only their reports", Object.values(viaUrl).every((n) => j([...n].sort()) === j(["arjun", "rohan"])), j(viaUrl));

// =================================================================
section("L. Team leave, per person");
const tl = {};
for (const k of PEOPLE.filter((x) => OPENS[x] === "opens")) {
  fresh(k); await open(TL);
  tl[k] = { balances: [...d.querySelectorAll("#team-balances tbody .table__user-name")].map(txt), requests: [...d.querySelectorAll("#team-requests tbody .table__user-name")].map(txt),
    out: [...d.querySelectorAll("#out-next-week .list__title")].map(txt), calendar: [...d.querySelectorAll("#team-calendar .calendar__day--leave .calendar__tag")].map(txt),
    inMain: namesIn(main()), overlap: d.getElementById("team-overlap")?.hidden === false ? txt(d.getElementById("team-overlap")) : "", export: Boolean(d.querySelector("main [data-export]")), buttons: [...(main()?.querySelectorAll("button") ?? [])].filter((b) => !b.closest(".pagination")).map((b) => b.dataset.month ?? txt(b)),
    month: txt(d.querySelector("#team-calendar .card__title")), headers: [...d.querySelectorAll("#team-balances thead th")].map(txt) };
}
console.log("      team leave:", j(tl));
check("L1", "the balances: Sneha Arjun and Rohan, Kabir Meera; Priya and Aarav every active employee", j(tl.sneha.balances) === j([NAME.arjun, NAME.rohan]) && j(tl.kabir.balances) === j([NAME.meera]) && j([...tl.priya.balances].sort()) === j(ALL_ACTIVE) && j([...tl.aarav.balances].sort()) === j(ALL_ACTIVE), j(Object.fromEntries(Object.entries(tl).map(([k, v]) => [k, v.balances]))));
const reqOf = (k) => LS.allRequests().filter((r) => RP.directReportsOf(ID[k]).some((u) => u.id === r.userId)).length;
fresh(); S.getAllUsers();
check("L2", "past requests, Out in the next 7 days and the calendar: only the reports' names for a manager (every row theirs; Sneha's list holds all of her reports' requests, up to a page)",
  tl.sneha.requests.length === Math.min(10, reqOf("sneha")) && tl.sneha.requests.every((n) => [NAME.arjun, NAME.rohan].includes(n)) && tl.kabir.requests.every((n) => n === NAME.meera)
  && tl.sneha.out.every((n) => [NAME.arjun, NAME.rohan].includes(n)) && tl.sneha.calendar.every((t) => t.split(", ").every((f) => ["Arjun", "Rohan"].includes(f))), j([tl.sneha.requests, reqOf("sneha"), tl.sneha.out, tl.sneha.calendar]));
check("L3", "nothing outside the team anywhere in a manager's page", tl.sneha.inMain.every((k) => ["arjun", "rohan"].includes(k)) && tl.kabir.inMain.every((k) => k === "meera"), j([tl.sneha.inMain, tl.kabir.inMain]));
check("L4", "read-only and no export: outside the pagination the only buttons are the calendar's Previous / Next month (no Approve, Reject or Export)", Object.values(tl).every((v) => !v.export && j(v.buttons) === j(["prev", "next"])), j(Object.fromEntries(Object.entries(tl).map(([k, v]) => [k, v.buttons]))));
check("L5", "the calendar is this month (September 2026); the balances are the capped leave types, as typeLabel names them", Object.values(tl).every((v) => v.month === "September 2026") && j(tl.sneha.headers.slice(0, 1)) === j(["Employee"]) && tl.sneha.headers.length >= 3, j([tl.sneha.month, tl.sneha.headers]));
// an overlap with someone outside the team is never counted for a manager
// Seeded: Rohan's pending LV-2189 (13-15 Oct) clashes only with someone outside Sneha's team, so HR is warned and she isn't. With Arjun's approved
// 13 Oct added (a fixture in storage), she is warned of exactly one (Arjun), HR of two.
async function overlapAs(who, withArjun) {
  fresh(who); S.getAllUsers(); LS.allRequests();
  if (withArjun) {
    const box = JSON.parse(mem.get("officeos:leave-requests"));
    box.records.push({ id: "LV-9001", userId: ID.arjun, type: "casual", from: "2026-10-13", to: "2026-10-13", duration: "full", days: 1, reason: "", contactPhone: "", status: "approved", stage: "hr", managerId: ID.sneha, appliedOn: "2026-09-20",
      history: [{ stage: "manager", byUserId: ID.arjun, decision: "applied", at: "2026-09-20T09:00:00.000Z", note: "" }, { stage: "hr", byUserId: ID.priya, decision: "approved", at: "2026-09-21T09:00:00.000Z", note: "" }] });
    mem.set("officeos:leave-requests", JSON.stringify(box));
  }
  await open(TL);
  const a = d.getElementById("team-overlap");
  return a?.hidden === false ? txt(a) : "";
}
const ovl = { sneha: await overlapAs("sneha", false), priya: await overlapAs("priya", false), snehaWith: await overlapAs("sneha", true), priyaWith: await overlapAs("priya", true) };
check("L6", "the overlap alert counts only people in view: seeded, Sneha isn't warned (the clash is outside her team) while HR is; with Arjun's leave added, Sneha is warned of 1 other person, HR of 2",
  ovl.sneha === "" && /^Rohan Gupta's dates overlap with 1 other person from Engineering/.test(ovl.priya)
  && ovl.snehaWith === "Rohan Gupta's dates overlap with 1 other person from Engineering. Check team cover before approving." && /^Rohan Gupta's dates overlap with 2 other people from Engineering/.test(ovl.priyaWith), j(ovl));
const LEAK = /₹|\bPAN\b|IFSC|bank|salary|Salary|gross|Gross|payslip|Payslip|\b[A-Z]{5}\d{4}[A-Z]\b|\b\d{9,18}\b/;
const leakText = {};
for (const k of ["sneha", "kabir"]) for (const page of [TA, TL]) { fresh(k); await open(page); const t = (main()?.textContent ?? "") + [...(main()?.querySelectorAll("*") ?? [])].map((e) => [...e.attributes].map((a) => a.value).join(" ")).join(" "); leakText[`${k} ${page}`] = (t.match(LEAK) ?? [""])[0]; }
fresh(); S.getAllUsers();
const secrets = S.getAllUsers().flatMap((u) => [u.bankAccount, u.pan, u.ifsc, u.salary].filter((v) => v !== undefined && v !== null && String(v).length > 3).map(String));
const secretsShown = {};
for (const k of ["sneha", "kabir"]) for (const page of [TA, TL]) { fresh(k); await open(page); secretsShown[`${k} ${page}`] = secrets.filter((s) => d.documentElement.outerHTML.includes(s)); }
check("L7", "no pay, bank or ID details in either team page for a manager: no ₹, PAN, IFSC, bank, salary, gross or payslip words, no PAN- or account-shaped numbers in the page (main: text and attributes); no stored bank account / PAN / salary value anywhere in the document",
  Object.values(leakText).every((x) => x === "") && Object.values(secretsShown).every((x) => x.length === 0), j({ leakText, secretsShown, secrets: secrets.length }));

// =================================================================
section("S. Data scope says what is enforced");
const scopeKv = () => [...d.querySelectorAll("dt, .kv__key, th, .summary__label, span, div")].find((e) => txt(e) === "Data scope")?.nextElementSibling;
const sv = {};
for (const k of ["sneha", "kabir", "priya", "aarav", "arjun"]) { fresh(k); await open("account/my-profile"); sv[k] = txt(scopeKv()); }
check("S1", "my-profile: Employee 'Own records, plus your direct reports if you manage people', Finance 'All finance records', HR and Admin 'All records'",
  sv.sneha === "Own records, plus your direct reports if you manage people" && sv.arjun === sv.sneha && sv.kabir === "All finance records" && sv.priya === "All records" && sv.aarav === "All records", j(sv));
const re = {};
for (const r of ["admin", "hr", "fin", "emp"]) { fresh("aarav"); await open("access/role-editor", `?role=${r}`); re[r] = txt(d.getElementById("role-scope")); }
check("S2", "role-editor: the same words per role", j(re) === j({ admin: "All records", hr: "All records", fin: "All finance records", emp: "Own records, plus your direct reports if you manage people" }), j(re));
fresh("aarav"); await open("users/user-profile", `?id=${ID.kabir}`);
const up = txt(scopeKv());
fresh("aarav"); await open("users/user-form", `?id=${ID.arjun}`);
const uf = txt(scopeKv());
check("S3", "user-profile (Kabir: Finance) and user-form (Arjun: Employee) say it too", up === "All finance records" && uf === "Own records, plus your direct reports if you manage people", j([up, uf]));

// =================================================================
section("X. Direct reports only");
async function asIndirect(k, page) { fresh(k); editRecord(ID.vikram, "reportingManagerId", ID.rohan); editRecord(ID.vikram, "reportingManager", NAME.rohan); await open(page); return namesIn(main()); }
const x1 = { sneha: await asIndirect("sneha", TA), rohan: await asIndirect("rohan", TA), snehaTL: await asIndirect("sneha", TL), rohanTL: await asIndirect("rohan", TL) };
check("X1", "Vikram made Rohan's report: Rohan now sees only Vikram; Sneha still only Arjun and Rohan (never Vikram, her report's report)",
  j(x1.rohan) === j(["vikram"]) && j([...x1.sneha].sort()) === j(["arjun", "rohan"]) && x1.rohanTL.every((k) => k === "vikram") && x1.snehaTL.every((k) => ["arjun", "rohan"].includes(k)), j(x1));
fresh("sneha"); editRecord(ID.rohan, "status", "inactive"); await open(TA);
const x2 = namesIn(main());
fresh("sneha"); editRecord(ID.sneha, "status", "on-leave"); stubWindow(`${TA}.html`);
const x3 = G.guardPage();
check("X2", "Rohan inactive: Sneha's team attendance shows Arjun alone (inactive people never appear there); Sneha on leave: no longer a manager, so the 403 page", j(x2) === j(["arjun"]) && x3 === false && hrefs[0]?.includes("403"), j([x2, x3, hrefs]));

check("E99", "no js errors", allJsErrors.length === 0, j(allJsErrors.slice(0, 5)));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(0);
