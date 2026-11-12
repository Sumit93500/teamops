// usage: node payrun.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 4D: payroll/payroll-run.html with the js in ./js, in jsdom. The clock is local wall time,
// Wed 30 Sep 2026 11:00; the seed is generated around "now" when storage is first read.
//   A  runTotals() in the store
//   B  Kabir Shah (Finance, who prepared the run): every figure against payrollRun()'s own output
//   C  search and status filter, alone and combined, empty results
//   D  on-hold rows: a person with no bank account and one with no salary
//   E  Aarav Mehta (Admin): can approve; nothing is stored
//   F  separation of duties: an Admin session that is the preparer, and an old session with no id
//   G  people who may not see the page: HR, Employee, nobody signed in
//   H  the parts of the page this round leaves alone are unchanged (vs the frozen pre-4D HTML)
//   I  source layout, on frozen copies only: js-pre4D / js-post4D and html-pre4D / html-post4D
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HTML = fs.readFileSync(`${DIR}/payroll/payroll-run.html`, "utf8");
const PRE_HTML = fs.readFileSync(new URL("./html-pre4D/payroll-run.html", import.meta.url), "utf8");

const RealDate = Date;
const NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const WHO = {
  kabir: ["fin", "Kabir Shah", "EMP-1008"], aarav: ["admin", "Aarav Mehta", "EMP-1001"],
  priya: ["hr", "Priya Nair", "EMP-1003"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"],
  adminKabir: ["admin", "Kabir Shah", "EMP-1008"], oldAdmin: ["admin", "Aarav Mehta", undefined],
};

let loads = 0, w = null, d = null, saved = {};
let jsErrors = [], navigations = [], htmlWrites = [];
async function open(who) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = []; navigations = []; htmlWrites = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else jsErrors.push(e.message); });
  const dom = new JSDOM(HTML, { url: "http://localhost/office-os/pages/payroll/payroll-run.html", virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  const proto = w.Element.prototype;
  const inner = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", { get: inner.get, set(v) { htmlWrites.push(String(v)); inner.set.call(this, v); }, configurable: true });
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  const auth = await import("./js/core/auth.js");
  if (who) auth.signIn(...WHO[who]); else auth.signOut();
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/payroll-run.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }
// Round 11W (restage; G4's pause, round-11v-notes.md V3 option 2): the seed's pending late-arrival corrections named
// here are rejected by Priya Nair (HR) at the check's clock, before any page reads storage. A pending one now pauses
// its late mark (payroll-store.js pausedLateMarks); decided first, every late mark counts, so the figures and wording
// below are the ones they always were. RG-102 is Vikram's (one of his three September late marks: the ₹1,455 case);
// RG-103, Sneha's, is decided too only where a check reads the run page's "Attendance recorded" wording.
async function decideFirst(ids = ["RG-102"]) {
  const box = new Map();
  globalThis.localStorage = w ? w.localStorage : { getItem: (k) => (box.has(k) ? box.get(k) : null), setItem: (k, v) => box.set(k, String(v)), removeItem: (k) => box.delete(k), clear: () => box.clear(), key: (i) => [...box.keys()][i] ?? null, get length() { return box.size; } };
  const A11W = await import("./js/data/attendance-store.js");
  for (const id of ids) { const r = A11W.decideRegularization(id, "EMP-1003", "hr", "reject", "Decided before the clock (round 11W)"); if (!r.ok) throw new Error(`round 11W restage, ${id}: ${r.error}`); }
  if (!w) saved = Object.fromEntries(box);
}
// Round 11W (restage exempt; the 11W fixup ruling): the alert as seeded, nothing decided first, read on a page load of
// its own, for the checks whose point is who has corrections waiting (B11 / E3). The restaged page is then loaded
// again with its storage as it was, so the checks after read the same page as before.
async function alertAsSeeded(who) {
  const keep = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  fresh(); await open(who);
  const alert = txt($("run-alert"));
  fresh(); Object.entries(keep).forEach(([k, v]) => w.localStorage.setItem(k, v)); await open(who);
  return alert;
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;

// ---- readers ----
const $ = (id) => d.getElementById(id);
const stat = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return [txt(s.querySelector(".stat__value")), txt(s.querySelector(".stat__delta")), s.querySelector(".stat__delta").className]; };
const rowEls = () => [...$("run-rows").querySelectorAll("tr")];
function parts(node) {
  const out = [];
  const walker = node.ownerDocument.createTreeWalker(node, 4);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) { if (t.parentElement.closest(".avatar")) continue; const v = t.textContent.replace(/\s+/g, " ").trim(); if (v) out.push(v); }
  return out.join(" ");
}
const rows = () => rowEls().map((tr) => [...tr.children].map(parts));
const names = () => [...$("run-rows").querySelectorAll(".table__user-name")].map(txt);
const search = (v) => { const i = $("run-search"); i.value = v; i.dispatchEvent(new w.Event("input", { bubbles: true })); };
const pick = (v) => { const s = $("run-status-filter"); s.value = v; s.dispatchEvent(new w.Event("change", { bubbles: true })); };
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => txt(t.querySelector(".toast__text")) ?? txt(t));
const checks = () => [...$("run-checks").children].map((c) => [c.dataset.check, txt(c.querySelector(".list__title")), txt(c.querySelector(".list__sub")), c.querySelector(".badge").className, txt(c.querySelector(".badge"))]);
const steps = () => [...$("run-steps").children].map((li) => `${li.className.replace("stepper__step", "").trim() || "-"}|${txt(li.querySelector(".stepper__dot"))}|${txt(li.querySelector("strong"))}|${txt(li.querySelector("small"))}`);
const money = (n) => `₹${n.toLocaleString("en-IN")}`;
const unmoney = (s) => Number(s.replace(/[₹,]/g, ""));
const approve = () => $("approve-run");
const exportBtn = () => d.querySelector('[data-not-implemented="Export bank file"]');
const storageKeys = () => Object.keys(w.localStorage).sort();

const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const STATIC = new JSDOM(PRE_HTML).window.document;
const expectedRun = () => PS.payrollRun(2026, 9, { preparedBy: "EMP-1008" });
const dept = (code) => S.getAllDepartments().find((x) => x.code === code)?.name;
// What each row should show, from the store's own run.
const expectedRows = (run) => run.rows.map((r) => {
  const u = S.getUser(r.userId);
  return [`${u.name} ${[dept(u.department), r.holdReason].filter(Boolean).join(", ")}`,
    money(r.gross), money(r.deductions), money(r.net), r.status === "draft" ? "Draft" : "On hold", "View payslip"];
});

// =====================================================================
section("A. runTotals() in the store");
// Round 11W (restage): RG-102 and RG-103 rejected first (A2 / B3 / B4 / B13 the figures, B12 the checks card's wording)
fresh(); await decideFirst(["RG-102", "RG-103"]); await open("kabir");
let run = expectedRun();
const sum = (k) => run.rows.reduce((s, r) => s + r[k], 0);
const totals = PS.runTotals(run);
check("A1", "runTotals = the sums of the rows' gross, deductions, net and LOP amount; net = totalNetPay(run)",
  j(totals) === j({ gross: sum("gross"), deductions: sum("deductions"), net: sum("net"), lossOfPay: run.rows.reduce((s, r) => s + r.lop.amount, 0) }) && totals.net === PS.totalNetPay(run), j(totals));
check("A2", "seeded September: 9 rows, ₹9,64,045 / ₹86,046 / ₹8,77,999, ₹1,455 loss of pay (Vikram, 0.5 day)",
  run.rows.length === 9 && j(totals) === j({ gross: 964045, deductions: 86046, net: 877999, lossOfPay: 1455 }) && j(run.rows.filter((r) => r.lop.days > 0).map((r) => [r.userId, r.lop.days])) === j([["EMP-1088", 0.5]]));
check("A3", "an empty run totals 0 everywhere", j(PS.runTotals({ rows: [] })) === j({ gross: 0, deductions: 0, net: 0, lossOfPay: 0 }));
check("A4", "runTotals doesn't change the run", (() => { const r = expectedRun(); const before = j(r); PS.runTotals(r); return j(r) === before; })());

// =====================================================================
section("B. Kabir Shah (Finance, prepared the run), Wed 30 Sep 11:00");
check("B1", "page loads with no JS errors and no redirect", jsErrors.length === 0 && navigations.length === 0, j([...jsErrors, ...navigations]));
check("B2", "Employees: the run's row count (9, not 248), '0 on hold'", j(stat("employees").slice(0, 2)) === j([String(run.rows.length), "0 on hold"]) && run.rows.length === 9, j(stat("employees")));
check("B3", "Gross / Deductions / Net: exactly runTotals(payrollRun(2026, 9)), in rupees",
  stat("gross")[0] === money(totals.gross) && stat("deductions")[0] === money(totals.deductions) && stat("net")[0] === money(totals.net)
  && j([stat("gross")[0], stat("deductions")[0], stat("net")[0]]) === j(["₹9,64,045", "₹86,046", "₹8,77,999"]), j([stat("gross"), stat("deductions"), stat("net")]));
// Round 9F (behaviour; was "PF, PT and TDS"): TDS is worked out on sample tax rates, so the note says so
check("B4", "notes: 'After ₹1,455 loss of pay', 'PF, PT and TDS (sample tax rates)' (Round 9F), 'Draft, not paid yet' (Round 7B: no pay date exists; was 'To be paid on 28 Sep', green)",
  stat("gross")[1] === "After ₹1,455 loss of pay" && stat("deductions")[1] === "PF, PT and TDS (sample tax rates)" && stat("net")[1] === "Draft, not paid yet" && stat("net")[2] === "stat__delta");
check("B5", "table: every row of the run (9), in the run's order, each cell as the store computes it", j(rows()) === j(expectedRows(run)), j(rows()));
const shownSums = ["gross", "deductions", "net"].map((_, i) => rows().reduce((s, r) => s + unmoney(r[i + 1]), 0));
check("B6", "the table's columns add up to the stat cards", j(shownSums) === j([totals.gross, totals.deductions, totals.net]), j(shownSums));
check("B7", "footer 'Showing 9 of 9 employees'; the fake pager (Previous / Next) is gone",
  txt($("run-rows-meta")) === "Showing 9 of 9 employees" && !d.querySelector('[data-not-implemented="Next page"]') && !d.querySelector(".card__footer .btn-group"));
// Round 11T (behaviour; was Draft created by Kabir Shah, Review current: PREPARED_BY is gone, so a live run has no preparer; the steps are Draft / Prepared / Approval / Payment)
check("B8", "progress: badge Draft; Draft (done, live), Prepared current (not prepared yet), Approval names the Admin, Payment 'Not built yet' (Round 7B; was 28 Sep; round 11T)",
  txt($("run-status")) === "Draft" && $("run-status").className === "badge badge--warning badge--dot" && j(steps()) === j([
    "is-done||Draft|Worked out from the live records", "is-current|2|Prepared|Not prepared yet", "-|3|Approval|Aarav Mehta, Admin", "-|4|Payment|Not built yet"]), j(steps()));
// Round 11T (behaviour; was prepared by Kabir Shah and 'Attendance locked on Not built yet': a live run has no preparer, and 'Figures fixed on' is the stored run's date)
check("B9", "run details: not prepared yet, approver Aarav Mehta, Admin; figures not fixed (live); bank file 'Not built yet', pay date 'Not set' (Round 7B; were 25 Sep, 28 Sep, NEFT; round 11T)",
  j([...d.querySelectorAll(".kv__row")].map(parts)) === j(["Prepared by Not prepared yet", "Approver Aarav Mehta, Admin", "Figures fixed on Not fixed: worked out live", "Pay date Not set", "Bank file Not built yet"]));
check("B10", "Approve run: hidden for Finance (no payroll:approve) and disabled", approve().hidden === true && approve().disabled === true, approve().title);
// Round 11T (behaviour; was the preparer's wording and 'Attendance locking isn't built yet': a live run has no preparer; the alert says it's live and why it can't be prepared yet, in the store's words)
const b11 = await alertAsSeeded("kabir");   // Round 11W (restage exempt): as seeded, on its own load
check("B11", "alert: the run isn't prepared, so the figures are live; September can't be prepared yet, each reason named (round 11T)",
  b11 === "This run isn't prepared yet, so these figures are worked out from the live attendance and leave records each time the page opens. It can't be prepared yet: it hasn't ended yet; 1 working day hasn't been recorded yet; 1 absence can't be counted, with no readable joining date on file (Vikram Singh); 3 attendance corrections are waiting for a decision (Ananya Iyer, Sneha Rao, Vikram Singh).", b11);
check("B12", "checks card: 6 checks, exact wording; attendance coverage (Round 7B), bank / salary / LOP computed, salary edits a marked placeholder, leave a rule", j(checks()) === j([
  // Round 8D (behaviour; was "...so late marks and unpaid leave can still change these figures.", In progress, and 6 checks): absences named; Vikram's
  // settled 15 Sep absence isn't counted (no joining date on file), which needs a look; the new rule line
  ["computed", "Attendance recorded", "September 2026 isn't over: 1 working day hasn't been recorded yet, so late marks, unpaid leave and absences can still change these figures. Not counted, with no readable joining date on file: Vikram Singh (1 absence).", "badge badge--warning", "Review"],
  ["computed", "Bank details missing", "Everyone in this run has a bank account on file", "badge badge--success", "Done"],
  ["computed", "No salary on file", "Everyone in this run has a salary for September", "badge badge--success", "Done"],
  // Round 12Z (behavior; was the placeholder "Salary edits pending" / "Not checked: salary change requests aren't built yet"): computed (salinbox.mjs R1 / R2)
  ["computed", "Salary changes waiting", "No salary change for September 2026 is waiting for a decision", "badge badge--success", "Done"],
  ["computed", "Loss-of-pay days", "1 employee has unpaid days (0.5 days, ₹1,455)", "badge badge--info", "Review"],
  ["rule", "Approved leave included", "Approved unpaid leave is deducted; pending requests aren't counted", "badge badge--success", "Done"],
  ["rule", "Unexplained absences", "A working day with no check-in and no approved leave costs a day's pay once its 7-day correction window has closed and no correction or leave request for it is waiting; days before someone's joining date aren't counted", "badge badge--success", "Done"],
]) && txt($("run-checks-meta")) === "7 checks", j(checks()));
check("B13", "LOP check agrees with the store: rows with lop.days > 0", run.rows.filter((r) => r.lop.days > 0).length === 1);
const links = [...$("run-rows").querySelectorAll("a.btn")];
check("B14", "View payslip: shown (payslips:view), href carries employee + month for the payslip round",
  links.length === 9 && links.every((a, i) => !a.hidden && a.getAttribute("href") === `payslip-view.html?employee=${run.rows[i].userId}&month=2026-09`), j(links.map((a) => a.getAttribute("href"))));
const ev = new w.MouseEvent("click", { bubbles: true, cancelable: true });
links[0].dispatchEvent(ev);
check("B15", "clicking it opens the payslip (Round 4E): no placeholder marker, the click isn't stopped, no toast",
  !ev.defaultPrevented && !links[0].hasAttribute("data-not-implemented") && toasts().length === 0, j(toasts()));
check("B16", "Export bank file: shown (payroll:export), still the placeholder", (() => { const b = exportBtn(); if (!b || b.hidden) return false; b.click(); return toasts().at(-1) === "Export bank file isn't available in this demo."; })(), j(toasts()));
check("B17", "sidebar footer: the real count, 9 employees (Divya, inactive, not counted)", txt(d.querySelector(".sidebar__footer")) === "Northwind Technologies 9 employees" /* Round 14E part 4 (behaviour; was "9 active employees") */, txt(d.querySelector(".sidebar__footer")));
check("B18", "no money or name written through innerHTML", !htmlWrites.some((h) => /₹|Kabir|Rohan|Vikram/.test(h)), htmlWrites.filter((h) => /₹/.test(h)).length);
check("B19", "the global table filter doesn't also handle the search box (data-table-filter=off)", $("run-search").dataset.tableFilter === "off");
check("B20", "nothing about the run is written to storage", !storageKeys().some((k) => /payroll|run/i.test(k)), j(storageKeys()));

// =====================================================================
section("C. Search and status filter");
const byName = (q) => run.rows.map((r) => S.getUser(r.userId).name).filter((n) => n.toLowerCase().includes(q.toLowerCase()));
search("an");
check("C1", "search 'an': names containing it, case-insensitive (Ananya Iyer, Rohan Gupta)", j(names()) === j(byName("an")) && j(names()) === j(["Ananya Iyer", "Rohan Gupta"]), j(names()));
search("  ROHAN ");
check("C2", "search trims and ignores case: '  ROHAN ' -> Rohan Gupta only", j(names()) === j(["Rohan Gupta"]) && txt($("run-rows-meta")) === "Showing 1 of 9 employees");
search("an"); pick("draft");
check("C3", "search 'an' + Draft: the same 2 (all rows are draft)", j(names()) === j(byName("an")));
pick("on-hold");
check("C4", "search 'an' + On hold: empty, with the message and 'Showing 0 of 9'",
  j(rows()) === j([["No employees match these filters."]]) && rowEls()[0].children[0].colSpan === 6 && txt($("run-rows-meta")) === "Showing 0 of 9 employees", j(rows()));
search(""); pick("on-hold");
check("C5", "On hold alone (seed has none): empty", names().length === 0 && txt($("run-rows-meta")) === "Showing 0 of 9 employees");
pick(""); search("zzz");
check("C6", "a search that matches nobody: empty message", j(rows()) === j([["No employees match these filters."]]));
search("EMP-1042");
check("C7", "search is by name, not id", names().length === 0);
search(""); pick("");
check("C8", "cleared: all 9 back, none hidden", names().length === 9 && rowEls().every((tr) => !tr.hidden) && txt($("run-rows-meta")) === "Showing 9 of 9 employees");
check("C9", "filter options: All statuses / Draft / On hold (no processing / paid)", j([...$("run-status-filter").options].map((o) => [o.value, o.text])) === j([["", "All statuses"], ["draft", "Draft"], ["on-hold", "On hold"]]));
check("C10", "no errors while filtering", jsErrors.length === 0, j(jsErrors));

// =====================================================================
section("D. On-hold rows: Rohan with no bank account, a new hire with no salary");
fresh(); await decideFirst(); await open("kabir");   // Round 13L (restage; 11W's leftovers, round-13k-scoping.md K2.2): RG-102 rejected first (D2 / D3's figures)
S.updateUser(USER_ACTOR("admin", "EMP-1042"), "EMP-1042", { bankAccount: null, bankAccountLast4: null });
const hire = S.addUser(USER_ACTOR("admin", null), { name: "Zoya Khan", email: "zoya.khan@northwind.com", role: "emp", department: "SUP", designation: "Support Executive", status: "active" });
await open("kabir");
run = expectedRun();
const t2 = PS.runTotals(run);
check("D1", "store: 10 rows, Rohan on hold (no bank), the new hire on hold (no salary, all 0)",
  run.rows.length === 10 && run.rows.find((r) => r.userId === "EMP-1042").holdReason === "No bank account on file"
  && j((({ status, holdReason, gross, net }) => [status, holdReason, gross, net])(run.rows.find((r) => r.userId === hire.record.id))) === j(["on-hold", "No salary on file for this month", 0, 0]), j(hire));
const sums2 = ["gross", "deductions", "net"].map((k) => run.rows.reduce((s, r) => s + r[k], 0));
check("D2", "Employees 10, '2 on hold'; totals = runTotals = the rows' own sums, on-hold rows included (Rohan's pay counts)",
  j(stat("employees").slice(0, 2)) === j(["10", "2 on hold"]) && j([t2.gross, t2.deductions, t2.net]) === j(sums2)
  && j([stat("gross")[0], stat("deductions")[0], stat("net")[0]]) === j(sums2.map(money)), j([sums2, stat("gross"), stat("net")]));
check("D3", "table = the store's rows; on-hold rows say why (sub-line and badge title)",
  j(rows()) === j(expectedRows(run)) && rowEls().filter((tr) => tr.querySelector(".badge--danger")).map((tr) => tr.querySelector(".badge").title).join("|") === "No bank account on file|No salary on file for this month", j(rows()));
pick("on-hold");
check("D4", "On hold: the 2 of them", j(names()) === j(["Rohan Gupta", "Zoya Khan"]) && txt($("run-rows-meta")) === "Showing 2 of 10 employees", j(names()));
search("rohan");
check("D5", "On hold + 'rohan': Rohan only", j(names()) === j(["Rohan Gupta"]));
pick("draft");
check("D6", "Draft + 'rohan': empty", j(rows()) === j([["No employees match these filters."]]));
search("");
check("D7", "Draft alone: the other 8", names().length === 8 && !names().includes("Rohan Gupta"));
check("D8", "checks: bank 1 (Fix), salary 1 (Fix), wording for one person (after Round 7B's attendance check)", j(checks().slice(1, 3)) === j([
  ["computed", "Bank details missing", "1 employee can't be paid until a bank account is added", "badge badge--danger", "Fix"],
  ["computed", "No salary on file", "1 employee on hold with no salary for September", "badge badge--danger", "Fix"]]), j(checks().slice(1, 3)));
check("D9", "sidebar: 10 employees", txt(d.querySelector(".sidebar__footer")) === "Northwind Technologies 10 employees" /* Round 14E part 4 (behaviour; was "10 active employees") */);
S.updateUser(USER_ACTOR("admin", "EMP-1017"), "EMP-1017", { bankAccount: null });
S.updateUser(USER_ACTOR("admin", "EMP-1105"), "EMP-1105", { bankAccount: null });
await open("kabir");
check("D10", "three without a bank account: '3 employees can't be paid ...', '4 on hold'",
  checks()[1][2] === "3 employees can't be paid until a bank account is added" && stat("employees")[1] === "4 on hold", j([checks()[1], stat("employees")]));
check("D11", "no errors", jsErrors.length === 0, j(jsErrors));

// =====================================================================
section("E. Aarav Mehta (Admin): can approve");
fresh(); await decideFirst(); await open("aarav");   // Round 11W (restage): RG-102 rejected first (E1's figures)
run = expectedRun();
// Round 11T (behaviour; was preparedBy fixed as Kabir Shah: a live run has no preparer for anyone)
check("E1", "page loads, same figures as Finance sees (a live run has no preparer for anyone: round 11T)",
  jsErrors.length === 0 && navigations.length === 0 && j(rows()) === j(expectedRows(run)) && stat("net")[0] === "₹8,77,999" && txt($("run-prepared-by")) === "Not prepared yet");
// Round 11T (behaviour; was enabled: approving is a store write since round 11T, refused until the month's run is prepared, and the button says so)
check("E2", "Approve run: shown but disabled until the run is prepared, the store's reason as its title; canApprove(run, EMP-1001) is still true (round 11T)", !approve().hidden && approve().disabled && approve().title === "September 2026's run hasn't been prepared yet." && PS.canApprove(run, "EMP-1001"), approve().title);
// Round 11T (behaviour; was 'Kabir prepared it; approving isn't saved': a live run has no preparer and approving is saved since round 11T; the alert is the same for every viewer)
const e3 = await alertAsSeeded("aarav");   // Round 11W (restage exempt): as seeded, on its own load
check("E3", "alert: the same live wording Finance sees (not prepared, September can't be prepared yet: round 11T)",
  e3 === "This run isn't prepared yet, so these figures are worked out from the live attendance and leave records each time the page opens. It can't be prepared yet: it hasn't ended yet; 1 working day hasn't been recorded yet; 1 absence can't be counted, with no readable joining date on file (Vikram Singh); 3 attendance corrections are waiting for a decision (Ananya Iyer, Sneha Rao, Vikram Singh).", e3);
const keysBefore = j(storageKeys());
const storeBefore = j(Object.fromEntries(storageKeys().map((k) => [k, w.localStorage.getItem(k)])));
approve().click();
// Round 11T (behaviour; was an info toast 'isn't saved yet': the button is disabled until the run is prepared, so a click does nothing; storage stays byte-identical)
check("E4", "clicking the disabled Approve: no toast; the run stays Draft; storage unchanged, nothing stored (round 11T)",
  toasts().length === 0 && txt($("run-status")) === "Draft" && j(storageKeys()) === keysBefore && j(Object.fromEntries(storageKeys().map((k) => [k, w.localStorage.getItem(k)]))) === storeBefore, j(toasts()));
check("E5", "Admin also sees Export bank file and View payslip", !exportBtn().hidden && [...$("run-rows").querySelectorAll("a.btn")].every((a) => !a.hidden));

// =====================================================================
section("F. Separation of duties");
// Round 11P (restaged; an Admin session on Kabir's record stood for 'an Admin who prepared the run'; the page now reads his role on record (Finance, no payroll:approve: N3), so he is made an Admin on record first, as F6 below does)
fresh(); S.updateUser(USER_ACTOR("admin", "EMP-1008"), "EMP-1008", { role: "admin" }); await open("adminKabir");
run = expectedRun();
// Round 11T (behaviour; was 'the preparer: disabled, you prepared this run': a live run has no preparer, so Kabir (an Admin) sees the store's 'not prepared yet'; canApprove still refuses a run's preparer, and a stored run's preparer is payruns.mjs C4 / K5)
check("F1", "Kabir made an Admin, on a live run: Approve shown but disabled, not prepared yet; canApprove still refuses a run's preparer (round 11T: the stored run's case is payruns.mjs C4 / K5)",
  !approve().hidden && approve().disabled && approve().title === "September 2026's run hasn't been prepared yet." && !PS.canApprove(run, "EMP-1008"), approve().title);
check("F2", "its alert is the live one, not a preparer's (round 11T)", txt($("run-alert")).startsWith("This run isn't prepared yet, so these figures are worked out from the live"));
const n0 = toasts().length;
approve().disabled = false; approve().click();
// Round 11T (behaviour; was 'does nothing': the click is the store's write, which refuses and says why; nothing is stored)
check("F3", "re-enabling the button by hand and clicking: the store refuses (its reason as a toast), nothing is stored (round 11T)", toasts().length === n0 + 1 && toasts().at(-1) === "September 2026's run hasn't been prepared yet." && localStorage.getItem("officeos:payroll-runs") === null, j(toasts()));
fresh(); await open("oldAdmin");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("F4", "an Admin session with no employee id (old session): signed out and sent to sign in (round 11P, N2); a run still can't be approved without an id",
  navigations.length === 1 && localStorage.getItem("officeos:session") === null && !PS.canApprove(expectedRun(), null), approve()?.title);
check("F5", "...and its alert doesn't claim they can approve", !/You can approve it/.test(txt($("run-alert"))), txt($("run-alert")));
fresh(); await open("kabir");
// Round 11T (behaviour; was the page's own 'needs the payroll:approve permission': the title is the store's refusal, checked on Kabir's record)
check("F6", "Finance: the disabled title is the store's refusal for someone without payroll:approve on record (button hidden anyway; round 11T)", approve().title === "You can't approve payroll runs.");
// Round 11Z (fixture): Meera is made Finance first: Kabir is the only Finance Manager, and making him Admin would leave the
// claims at the Finance stage with nobody to decide them (refused since 11Z: stranded.mjs K2). F7 is about the approvers.
S.updateUser(USER_ACTOR("admin", "EMP-1023"), "EMP-1023", { role: "fin" });
S.updateUser(USER_ACTOR("admin", "EMP-1008"), "EMP-1008", { role: "admin" });
await open("aarav");
// Round 11T (behaviour; was Kabir left out as the fixed preparer: a live run has no preparer, so both Admins could approve once someone prepares it; a stored run leaves its preparer out, payruns.mjs K14)
check("F7", "Kabir made Admin, on a live run (no preparer yet): both Admins are listed as who could approve it (round 11T; a stored run's preparer is left out: payruns.mjs K14)",
  txt($("run-approver")) === "Aarav Mehta, Admin; Kabir Shah, Admin" && steps()[2] === "-|3|Approval|Aarav Mehta, Admin; Kabir Shah, Admin", j([txt($("run-approver")), steps()[2]]));
const { ROLES: LIVE_ROLES } = await import("./js/config/roles.js");
const finPerms = [...LIVE_ROLES.fin.permissions];
LIVE_ROLES.fin.permissions.splice(LIVE_ROLES.fin.permissions.indexOf("payslips:view"), 1);
fresh(); await open("kabir");
const hiddenLinks = [...$("run-rows").querySelectorAll("a.btn")].every((a) => a.hidden);
pick("draft");
const stillHidden = [...$("run-rows").querySelectorAll("a.btn")].every((a) => a.hidden);
LIVE_ROLES.fin.permissions.splice(0, LIVE_ROLES.fin.permissions.length, ...finPerms);
check("F8", "a role with payroll:view but not payslips:view (Finance, with it removed for this check) gets no View payslip links, also after re-filtering",
  hiddenLinks && stillHidden && LIVE_ROLES.fin.permissions.includes("payslips:view"));

// =====================================================================
section("G. People who may not see the page");
// Round 7B: the static page is neutral (no rows, no figures), so "left as is" means still empty.
const untouched = () => names().length === 0 && txt(d.querySelector('[data-stat="employees"] .stat__value')) === "—" && txt($("run-rows-meta")) === "" && txt($("run-checks-meta")) === "" && txt($("run-title")) === "Payroll run";
for (const [n, who, where] of [["G1", "priya", "403"], ["G2", "arjun", "403"], ["G3", null, "login"]]) {
  fresh(); await open(who);
  check(n, `${who ?? "nobody signed in"}: sent to the ${where} page, and the script draws nothing (static page left as is)`,
    navigations.length === 1 && untouched() && jsErrors.length === 0, j([navigations, jsErrors]));
}
const ROLES = (await import("./js/config/roles.js")).ROLES;
const ROUTES = (await import("./js/config/routes.js")).ROUTES;
const has = (r, p) => ROLES[r].permissions.includes(p);
check("G4", "roles: route payroll:view; Admin view+approve+export+payslips; Finance view+create+export+payslips, no approve; HR and Employee none",
  ROUTES["payroll/payroll-run.html"] === "payroll:view"
  && ["payroll:view", "payroll:approve", "payroll:export", "payslips:view"].every((p) => has("admin", p))
  && ["payroll:view", "payroll:create", "payroll:export", "payslips:view"].every((p) => has("fin", p)) && !has("fin", "payroll:approve")
  && ["hr", "emp"].every((r) => !ROLES[r].permissions.some((p) => /^(payroll|payslips|salary):/.test(p))));

// =====================================================================
section("H. What this round leaves alone (vs the frozen pre-4D HTML)");
fresh(); await open("kabir");
const strip = (node) => { const c = node.cloneNode(true); c.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id")); c.removeAttribute?.("id"); return c.outerHTML.replaceAll(' hidden=""', ""); };
const same = (sel) => strip(d.querySelector(sel)) === strip(STATIC.querySelector(sel));
check("H1", "page header (Export bank file, layout) unchanged, Approve aside; title and subtitle now drawn per month (Round 7B)", (() => {
  const a = d.querySelector(".page-header").cloneNode(true), b = STATIC.querySelector(".page-header").cloneNode(true);
  // Round 11T (behaviour; round 11T adds the Prepare button and the month links to the header; they're set aside like Approve)
  [a, b].forEach((x) => { x.querySelector('[data-permission="payroll:approve"]').remove(); x.querySelector('[data-permission="payroll:create"]')?.remove(); x.querySelector("#run-months")?.remove(); x.querySelector("h1").textContent = ""; x.querySelector(".page-header__subtitle").textContent = ""; });
  [a, b].forEach((x) => x.querySelectorAll(".reason").forEach((r) => r.remove()));   // Round 14E part 1 (behaviour; the reason lines under Prepare and Approve are set aside with them; reasons.mjs P pins them)
  // Round 11T (behaviour; the set-aside elements leave their line breaks behind, so whitespace between tags doesn't count)
  return strip(a).replace(/>\s+</g, "><") === strip(b).replace(/>\s+</g, "><");
})());
check("H2", "stat icons and labels unchanged", j([...d.querySelectorAll(".stat")].map((s) => strip(s.querySelector(".stat__icon")) + txt(s.querySelector(".stat__label")))) === j([...STATIC.querySelectorAll(".stat")].map((s) => strip(s.querySelector(".stat__icon")) + txt(s.querySelector(".stat__label")))));
check("H3", "table head unchanged; card titles unchanged", same("thead") && j([...d.querySelectorAll(".card__title")].map(txt)) === j([...STATIC.querySelectorAll(".card__title")].map(txt)));
check("H4", "the stepper's markup has the same shape as the static one (classes, svg on the done step)",
  j([...$("run-steps").children].map((li) => [li.className, li.querySelector(".stepper__dot svg path")?.getAttribute("d") ?? null])) === j([...STATIC.querySelectorAll(".stepper__step")].map((li) => [li.className, li.querySelector(".stepper__dot svg path")?.getAttribute("d") ?? null])));
check("H5", "topbar unchanged apart from what app.js does on every page", same(".topbar__left") && same(".topbar__search svg") && same(".topbar__search kbd"));   // Round 13Z (behaviour, A6): the box is drawn by ui/search.js

// =====================================================================
section("I. Source layout (frozen copies only)");
const walk = (dir, base = "") => fs.readdirSync(new URL(`./${dir}/${base}`, import.meta.url), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const POST = walk("js-post4D");
const changed = POST.filter((p) => !fs.existsSync(new URL(`./js-pre4D/${p}`, import.meta.url)) || src("js-post4D", p) !== src("js-pre4D", p));
check("I1", "Round 4D's js changes (its result vs the code before it): payroll-store.js changed, pages/payroll-run.js added; nothing removed",
  j(changed) === j(["data/payroll-store.js", "pages/payroll-run.js"]) && walk("js-pre4D").every((p) => POST.includes(p)), j(changed));
const storeDiff = src("js-post4D", "data/payroll-store.js").replace(/\r\n\r\n\/\/ A run's totals[\s\S]*?lossOfPay: 0 \}\);/, "") === src("js-pre4D", "data/payroll-store.js");
check("I2", "payroll-store.js: only runTotals added, nothing else touched", storeDiff);
const pre = src("html-pre4D", "payroll-run.html"), post = src("html-post4D", "payroll-run.html");
const undo = post
  .replace('<span id="sidebar-headcount">248 active employees</span>', "248 active employees")
  .replace(/ id="(approve-run|run-status|run-steps|run-search|run-status-filter|run-rows|run-rows-meta|run-checks-meta|run-checks|run-prepared-by|run-approver|run-alert)"/g, "")
  .replace(/ data-stat="(employees|gross|deductions|net)"/g, "")
  .replace(' data-table-filter="off"', "")
  .replace('<option value="">All statuses</option><option value="draft">Draft</option><option value="on-hold">On hold</option>', "<option>All statuses</option><option>Draft</option><option>On hold</option>")
  .replace("</span>\r\n        </div>\r\n      </section>\r\n\r\n      <aside", `</span>\r\n          <div class="btn-group">\r\n            <button class="btn btn--sm" type="button" disabled>Previous</button>\r\n            <button class="btn btn--sm" type="button" data-not-implemented="Next page">Next</button>\r\n          </div>\r\n        </div>\r\n      </section>\r\n\r\n      <aside`)
  .replace('\r\n<script type="module" src="../../assets/js/pages/payroll-run.js"></script>', "");
check("I3", "payroll-run.html: only ids / data-stat hooks, option values, data-table-filter=off, the pager removed and the script tag", undo === pre);
check("I4", "payroll pages not in scope untouched by Round 4D: payslips, payslip-view, salary-structure (its result vs before)",
  j(walk("html-post4D")) === j(walk("html-pre4D")) && ["payslips.html", "payslip-view.html", "salary-structure.html"].every((f) => src("html-post4D", f) === src("html-pre4D", f)));
const page = src("js-post4D", "pages/payroll-run.js");
check("I5", "the page script works out no pay itself: no computePay / payroll.js import; reads only payrollRun, canApprove, runTotals from the store",
  !/payroll\.js"|computePay|splitGross|monthlyTds|lossOfPayDays|lossOfPayAmount/.test(page) && /import \{ payrollRun, canApprove, runTotals \} from "\.\.\/data\/payroll-store\.js";/.test(page));
check("I6", "no innerHTML in the page script", !/innerHTML/.test(page));
check("I7", "new / changed files CRLF with no final newline", [["js-post4D", "pages/payroll-run.js"], ["js-post4D", "data/payroll-store.js"], ["html-post4D", "payroll-run.html"]].every(([dir, p]) => { const s = src(dir, p); return !s.endsWith("\n") && !/(^|[^\r])\n/.test(s); }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);