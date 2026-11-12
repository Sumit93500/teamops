// usage: node leavebal.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 11X: 11N's N11 (round-11n-notes.md N11). A leave request's days are counted live (round 10O), so a pending one
// spanning a holiday that's later removed grows by a day; its final approval wasn't checked against the balance, so it
// could take the person over the allowance. decideLeave's final approval now checks it, as it already checks the
// attendance record: refused, nothing decided, the request stays pending. ./js-pre11X, ./html-pre11X and ./css-pre11X
// are the code, pages and css before this round (office-os 28c83de).
//   A  the store: N11 refused; the boundary; the manager stage; other pending requests; the uncapped types; periods;
//      "none free, N over"; what stays decidable
//   B  leave-approvals.html: Priya's Approve shows the refusal; the request is still waiting
//   E  what stays: applying, balances, the other decisions; no page errors
//   X  scope
// The clock is local wall time, Mon 9 Nov 2026 11:00. Rohan Gupta (EMP-1042) has his seeded pending casual request
// (LV-2189) cancelled first, so his 2026 casual balance starts at 0 of 12; a company holiday is added on Wed 18 Nov.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 11, 9);
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const PRIYA = "EMP-1003", ROHAN = "EMP-1042", AARAV = "EMP-1001";
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, query = "") {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${DIR}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = () => true;
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`./js/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); }
  }
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} timer: ${e.message}`); } });
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const errOf = (r) => (r?.ok ? "ok" : r?.error ?? "no result");

const L = await import("./js/data/leave-store.js");
const H = await import("./js/data/holidays.js");
const S = await import("./js/data/store.js");
const OLD = await import("./js-pre11X/data/leave-store.js");   // the leave store before this round, on the same storage

// Fixture steps that should always work; a failure is kept (setup, checked in E4) rather than thrown, so a wrong build
// fails checks instead of crashing the suite.
const setup = [];
// Every stage but the last, as whoever holds it; returns the last stage's decider ([id, role]).
function upToFinal(id) {
  for (let i = 0; i < 3; i++) {
    const r = L.getRequest(id);
    if (!r || r.status !== "pending") { setup.push(`${id}: not pending`); return ["none", "none"]; }
    const who = r.stage === "manager" ? S.getUser(r.managerId) : S.getUser(PRIYA);
    if (r.stage === "hr") return [who.id, who.role];
    const res = L.decideLeave(id, who.id, who.role, "approve");
    if (!res.ok) { setup.push(`manager stage ${id}: ${res.error}`); return ["none", "none"]; }
  }
  setup.push("no final stage"); return ["none", "none"];
}
const approveAll = (id) => { const [by, role] = upToFinal(id); const r = L.decideLeave(id, by, role, "approve"); if (!r.ok) setup.push(`approve ${id}: ${r.error}`); };
const apply = (type, from, to, duration = "full") => { const r = L.applyLeave(ROHAN, { type, from, to, duration, reason: "Round 11X" }); if (!r.ok) { setup.push(`${from}-${to}: ${r.error}`); return "none"; } return r.record.id; };
const casual = () => L.balanceFor(ROHAN, 2026).casual;
// The fixture: storage fresh at 9 Nov 11:00; Rohan's seeded pending casual cancelled; `holidays` added (company).
function fresh(holidays = ["2026-11-18"], { cancel = true } = {}) {
  mem.clear(); setNow(2026, 11, 9);
  holidays.forEach((date) => { const r = H.addHoliday(PRIYA, { date, name: "Round 11X", kind: "company" }); if (!r.ok) setup.push(`add ${date}: ${r.error}`); });
  if (cancel) L.requestsFor(ROHAN).filter((r) => r.status === "pending" && r.type === "casual").forEach((r) => L.cancelLeave(r.id, ROHAN));
}
const unholiday = (date) => { const h = H.getAllHolidays().find((x) => x.date === date); const r = H.removeHoliday(PRIYA, h?.id); if (!r.ok) setup.push(`remove ${date}: ${r.error}`); };
const N11 = "This request no longer fits Rohan Gupta's casual leave: 2 of 12 days free in 2026 (10 approved), and this request is now 3 days.";
// N11's own case: 10 approved (1-14 Dec), 17-19 Nov sent as 2 days around 18 Nov, the holiday removed.
function n11() { fresh(); approveAll(apply("casual", "2026-12-01", "2026-12-14")); const id = apply("casual", "2026-11-17", "2026-11-19"); unholiday("2026-11-18"); return id; }

// =================================================================
section("A. The store");
let id = n11();
const before = j(L.getRequest(id));
const [by, role] = upToFinal(id);
const atHr = j(L.getRequest(id));
const a1 = L.decideLeave(id, by, role, "approve");
check("A1", "N11: sent as 2 days, a holiday inside it removed (3 now), 10 of 12 approved: the final approval is refused in words, naming the person, the free days and the request's days now",
  a1.ok === false && a1.error === N11 && a1.field === undefined, j(a1));
check("A2", "nothing is decided: the request is still pending at HR, its history and stored days untouched; still 10 approved",
  j(L.getRequest(id)) === atHr && L.getRequest(id).status === "pending" && L.getRequest(id).days === 2 && casual().approved === 10 && casual().pending === 3, j([L.getRequest(id).status, L.getRequest(id).stage, casual()]));
check("A3", "the manager stage isn't checked (it decides nothing about the balance): the request reached HR as before",
  JSON.parse(before).stage === "manager" ? JSON.parse(atHr).stage === "hr" : JSON.parse(atHr).stage === "hr", j([JSON.parse(before).stage, JSON.parse(atHr).stage]));
const a4 = [errOf(L.decideLeave(id, by, role, "reject", "Over the allowance")), L.getRequest(id).status];
check("A4", "it can still be rejected (and, on a fresh copy, cancelled by Rohan)", j(a4) === j(["ok", "rejected"]) && (() => { const k = n11(); upToFinal(k); return errOf(L.cancelLeave(k, ROHAN)) === "ok"; })(), j(a4));
fresh(); approveAll(apply("casual", "2026-12-01", "2026-12-14")); id = apply("casual", "2026-11-17", "2026-11-19");
const a5 = (() => { const [b, r] = upToFinal(id); return errOf(L.decideLeave(id, b, r, "approve")); })();
check("A5", "the boundary: with the holiday still in place it's 2 days, 10 + 2 = 12 of 12: approved", a5 === "ok" && casual().approved === 12, j([a5, casual()]));
fresh(["2026-11-18"], { cancel: false });
approveAll(apply("casual", "2026-12-01", "2026-12-09"));   // 7 days, with LV-2189 (3) still pending: 7 + 3 + 2 = 12 when sent
id = apply("casual", "2026-11-17", "2026-11-19"); unholiday("2026-11-18");
const lv = L.requestsFor(ROHAN).find((r) => r.status === "pending" && r.type === "casual" && r.id !== id);
const a6 = [(() => { const [b, r] = upToFinal(id); return errOf(L.decideLeave(id, b, r, "approve")); })(), casual().approved];
const a6b = (() => { const [b, r] = upToFinal(lv.id); return errOf(L.decideLeave(lv.id, b, r, "approve")); })();
check("A6", "another pending request doesn't block it: with LV-2189 (3 days) also waiting, the grown one (3) is approved (7 + 3 = 10); LV-2189 is then the one refused (10 + 3)",
  a6[0] === "ok" && a6[1] === 10 && a6b === `This request no longer fits Rohan Gupta's casual leave: 2 of 12 days free in 2026 (10 approved), and this request is now ${lv.days} days.` && casual().approved === 10,
  j([a6, a6b, lv?.id]));
fresh();
const wfh = L.applyLeave(ROHAN, { type: "wfh", from: "2026-12-01", to: "2026-12-07", duration: "full", reason: "Round 11X" });
const unpaid = apply("unpaid", "2026-12-15", "2026-12-31");
const a7 = [wfh.ok && wfh.advisories.some((x) => x.code === "wfh-limit"), (() => { const [b, r] = upToFinal(wfh.record.id); return errOf(L.decideLeave(wfh.record.id, b, r, "approve")); })(), (() => { const [b, r] = upToFinal(unpaid); return errOf(L.decideLeave(unpaid, b, r, "approve")); })()];
check("A7", "the uncapped types aren't checked: work from home over its monthly 4 (an advisory when sent) and unpaid leave are approved", j(a7) === j([true, "ok", "ok"]), j(a7));
fresh(["2026-12-30"]);
approveAll(apply("casual", "2026-11-23", "2026-12-04"));   // 10 days in 2026
id = apply("casual", "2026-12-29", "2027-01-05"); unholiday("2026-12-30");
const per = L.periodsOf(L.getRequest(id), "casual");
const a8 = (() => { const [b, r] = upToFinal(id); return L.decideLeave(id, b, r, "approve"); })();
const in26 = per.find((p) => p.year === 2026).days, all = per.reduce((s, p) => s + p.days, 0);
check("A8", "a request across two years: checked per year; the message names the share in the year that's over",
  in26 === 3 && a8.error === `This request no longer fits Rohan Gupta's casual leave: 2 of 12 days free in 2026 (10 approved), and ${in26} of this request's ${all} days fall in 2026.`, j([per, a8.error]));
fresh(["2026-11-18", "2026-11-25"]);
approveAll(apply("casual", "2026-11-17", "2026-11-19")); approveAll(apply("casual", "2026-11-24", "2026-11-26"));   // 2 + 2
approveAll(apply("casual", "2026-12-01", "2026-12-09"));   // + 7 = 11
id = apply("casual", "2026-12-10", "2026-12-10"); unholiday("2026-11-18"); unholiday("2026-11-25");   // approved 13 now
const a9 = (() => { const [b, r] = upToFinal(id); return L.decideLeave(id, b, r, "approve"); })();
check("A9", "already over (two holidays inside approved leave removed: 13 of 12): 'none free, 1 over', and a one-day request reads '1 day'",
  a9.error === "This request no longer fits Rohan Gupta's casual leave: none of 12 days free in 2026, 1 over (13 approved), and this request is now 1 day.", j(a9));
id = n11(); const [b10, r10] = upToFinal(id);
const a10 = [errOf(L.decideLeave(id, ROHAN, "emp", "approve")), errOf(L.decideLeave(id, b10, r10, "maybe")), errOf(L.decideLeave(id, b10, r10, "reject"))];
check("A10", "the earlier refusals keep their place: deciding your own request, a decision that isn't one, a reject with no note",
  j(a10) === j(["You can't decide your own leave request.", 'Decision must be "approve" or "reject".', "Add a note saying why the request is rejected."]), j(a10));

fresh();
approveAll(apply("casual", "2026-11-23", "2026-12-04"));   // 10 days in 2026
id = apply("casual", "2026-12-30", "2027-01-05");
const per11 = L.periodsOf(L.getRequest(id), "casual");
const a11 = (() => { const [b, r] = upToFinal(id); return errOf(L.decideLeave(id, b, r, "approve")); })();
check("A11", "per period: a request across two years whose 2026 share fits (10 + 2 = 12) is approved, though the whole of it is more than 2",
  a11 === "ok" && per11.find((p) => p.year === 2026)?.days === 2 && per11.reduce((t, p) => t + p.days, 0) > 2 && casual().approved === 12, j([a11, per11]));
fresh();
approveAll(apply("casual", "2026-11-17", "2026-11-19"));   // 2, around the 18 Nov holiday
approveAll(apply("casual", "2026-12-01", "2026-12-09"));   // + 7 = 9
approveAll(apply("casual", "2026-12-10", "2026-12-11"));   // + 2 = 11
id = apply("casual", "2026-12-14", "2026-12-14"); unholiday("2026-11-18");   // approved 12 now
const a12 = (() => { const [b, r] = upToFinal(id); return L.decideLeave(id, b, r, "approve"); })();
check("A12", "exactly full (12 of 12 approved): '0 of 12 days free', not 'none … over'",
  a12.error === "This request no longer fits Rohan Gupta's casual leave: 0 of 12 days free in 2026 (12 approved), and this request is now 1 day.", j(a12));

// =================================================================
section("B. leave-approvals.html");
id = n11(); upToFinal(id);
setSession("hr", "Priya Nair", PRIYA);
await open("leave/leave-approvals");
const row = [...d.querySelectorAll("tbody tr")].find((tr) => txt(tr).includes("Rohan Gupta") && tr.querySelector("button.btn--primary"));
row?.querySelector("button.btn--primary")?.click();
const toast = txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
const stillThere = [...d.querySelectorAll("tbody tr")].some((tr) => txt(tr).includes("Rohan Gupta") && tr.querySelector("button.btn--primary"));
check("B1", "Priya approves it on the page: the refusal in a toast, in the store's words; the request is still in her Pending list",
  Boolean(row) && toast === N11 && stillThere && L.getRequest(id).status === "pending", j([Boolean(row), toast, stillThere]));

// =================================================================
section("E. What stays");
fresh();
const e1 = [L.applyLeave(ROHAN, { type: "casual", from: "2026-12-01", to: "2026-12-16", duration: "full", reason: "x" }), OLD.applyLeave(ROHAN, { type: "casual", from: "2026-11-20", to: "2026-11-20", duration: "full", reason: "x" })];
check("E1", "sending is checked as before: 12 days (1-16 Dec) over 0 + 0 + 12 is fine; one more day (20 Nov, sent through the pre-11X store) is refused in applyLeave's own words",
  e1[0].ok === true && e1[1].ok === false && e1[1].error === "Not enough casual leave: 0 of 12 days free in 2026 (0 approved, 12 pending), and this request is 1.", j([e1[0].ok, e1[1].error]));
check("E2", "balanceFor, periodsOf and workingDays read as before", j(L.balanceFor(ROHAN, 2026)) === j(OLD.balanceFor(ROHAN, 2026)) && j(L.periodsOf(L.getRequest(e1[0].record.id), "casual")) === j(OLD.periodsOf(L.getRequest(e1[0].record.id), "casual")));
check("E3", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));
check("E4", "every fixture step worked as intended (leave sent, earlier approvals, holidays added and removed)", setup.length === 0, j(setup.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js"), jsPre = walk("./js-pre11X");
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js", p) !== srcAt("./js-pre11X", p));
// Round 11Y (layout; was the live js: 11X's change set read from the frozen result it left, js-pre11Y = office-os
// 8ae4c9c; the live js has 11Y's since (leavers.mjs X1))
const js11X = walk("./js-pre11Y"), changed11X = js11X.filter((p) => !jsPre.includes(p) || srcAt("./js-pre11Y", p) !== srcAt("./js-pre11X", p));
check("X1", "exactly one js file changed, none added or removed: data/leave-store.js", j(changed11X) === j(["data/leave-store.js"]) && j(js11X) === j(jsPre), j(changed11X));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
const pagesPre = walk("./html-pre11X").filter((p) => p.endsWith(".html"));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const cssDir = new URL("./css-pre13U", HERE).pathname.replace(/^\/(\w:)/, "$1");
check("X2", "no page and no css changed", j(pagesNow) === j(pagesPre) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre11X", p))
  && walk("./css-pre11X").every((p) => fs.existsSync(`${cssDir}/${p}`) && fs.readFileSync(`${cssDir}/${p}`, "utf8") === srcAt("./css-pre11X", p)));
const now = srcAt("./js-pre11Y", "data/leave-store.js"), pre = srcAt("./js-pre11X", "data/leave-store.js");   // Round 12I (layout; was the live js)
check("X3", "CRLF with no final newline; no import changed", !now.endsWith("\n") && !/(^|[^\r])\n/.test(now) && j(now.match(/^import .*$/gm)) === j(pre.match(/^import .*$/gm)));
const fnText = (s, name) => { const i = s.search(new RegExp(`(export )?function ${name}\\b`)); return i < 0 ? null : s.slice(i, s.indexOf("\r\n}\r\n", i)); };
const kept = ["applyLeave", "balanceFor", "periodsOf", "workingDays", "overAllowanceIfWorking", "cancelLeave", "daysIn", "checkedInDays", "pendingFor"];
check("X4", "only decideLeave changes, and overAllowance is new; applyLeave, balanceFor and the rest as they were",
  kept.every((f) => fnText(now, f) !== null && fnText(now, f) === fnText(pre, f)) && fnText(now, "decideLeave") !== fnText(pre, "decideLeave") && fnText(pre, "overAllowance") === null && fnText(now, "overAllowance") !== null,
  kept.filter((f) => fnText(now, f) !== fnText(pre, f)).join(","));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
