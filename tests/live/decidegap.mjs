// usage: node decidegap.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12J: round-12i-notes.md I12, ruling approved 2026-10-26. The final approval of a leave request refuses it when a
// working day in it has stopped being the person's since it was sent (a period away before a reactivation, after a
// current leaver's last working day, or before a joining date moved later: 12I's test), naming the days, as 10V refuses
// one whose days were checked in on since. Nothing is decided: it stays pending until it's rejected or cancelled.
// ./js-pre12J, ./html-pre12J and ./css-pre12J are the code, pages and css before this round (office-os 82a8702).
//   F  I12's three forms: reactivated with a gap (A), still a leaver (B), the joining date moved later (C)
//   R  what's still possible: rejecting, cancelling; the manager stage; a request approved before stays approved
//   K  the other re-checks as they were (check-ins, 10V; the run, 12B), and which refusal comes first
//   N  nothing changes for anyone else (every decision == 82a8702's on the same storage)
//   P  the page: leave-approvals shows the refusal as a toast
//   E what stays; X scope
// Storage seeded Fri 30 Oct 2026 19:00; Rohan's request for 11-12 Nov sent on Mon 2 Nov.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
setNow(2026, 11, 16);
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", SNEHA = "EMP-1029", ROHAN = "EMP-1042", ARJUN = "EMP-1105", VIKRAM = "EMP-1088";
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, query = "") {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${DIR}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = () => true;
  w.HTMLElement.prototype.scrollIntoView = () => {};
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
const safe = (fn) => { try { return fn(); } catch (e) { return { ok: false, error: `threw: ${e.message}` }; } };
const errOf = (r) => (r?.ok ? "ok" : r?.error ?? "no result");

const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const A = await import("./js/data/attendance-store.js");
const L = await import("./js/data/leave-store.js");
const OLDL = await import("./js-pre12J/data/leave-store.js");   // before this round, on the same storage

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
// Seeded 30 Oct 19:00, the seeded pending requests settled (so HR's inbox holds only this suite's), Vikram given a
// joining date (as gap.mjs / nottheirs.mjs do).
function seeded() {
  mem.clear(); setNow(2026, 10, 30, 19); PS.payrollRun(2026, 10);
  rawEdit("leave-requests", (r) => r.status === "pending", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
}
const setup = (r, what) => { if (!r?.ok) console.log(`setup (${what}):`, errOf(r)); return r; };
const send = (id, from, to = from, type = "casual") => setup(L.applyLeave(id, { type, from, to, duration: "full", reason: "probe" }), `send ${id} ${from}`).record?.id;
const leaves = (y, mo, dd, last) => { setNow(y, mo, dd); return setup(S.deactivateUser(PRIYA, ROHAN, last), `leaves ${last}`); };
const back = (y, mo, dd) => { setNow(y, mo, dd); return setup(S.reactivateUser(AARAV, ROHAN), `back ${dd}/${mo}`); };
const mgr = (mod, id) => { const r = mod.getRequest(id), m = S.getUser(r.managerId) ?? S.getUser(SNEHA); return r.stage === "manager" ? safe(() => mod.decideLeave(id, m.id, m.role, "approve")) : { ok: true }; };
const hr = (mod, id, decision = "approve", note = "") => safe(() => mod.decideLeave(id, PRIYA, "hr", decision, note));
const req = (id) => L.getRequest(id);
const casual = (id) => L.balanceFor(id, 2026, 11).casual;
const NOTE = (name, days, many = false) => `This request no longer matches the attendance record: ${name} wasn't working here on ${days}, so leave can't cover ${many ? "those days" : "that day"}.`;
// Rohan's request for 11-12 Nov, sent Mon 2 Nov (his days then), past the manager stage.
function rohanSent() { seeded(); setNow(2026, 11, 2); const id = send(ROHAN, "2026-11-11", "2026-11-12"); setup(mgr(L, id), "manager"); return id; }

// =================================================================
section("F. I12's three forms");
let id = rohanSent();
leaves(2026, 11, 9, "2026-11-06"); back(2026, 11, 16);
let before = j(req(id));
const a1 = hr(L, id);
check("F1", "A, reactivated with a gap (last working day 6 Nov, back 16 Nov): HR's final approval refused, naming 11-12 Nov",
  errOf(a1) === NOTE("Rohan Gupta", "2026-11-11 and 2026-11-12", true) && !a1.field, errOf(a1));
check("F2", "nothing decided: still pending at HR, history unchanged; his casual balance spends nothing (the code before: approved 2)",
  j(req(id)) === before && req(id).status === "pending" && req(id).stage === "hr" && casual(ROHAN).approved === 0, j([req(id).status, req(id).stage, casual(ROHAN)]));
id = rohanSent();
leaves(2026, 11, 9, "2026-11-06");
const b1 = hr(L, id);
check("F3", "B, still a leaver (last working day 6 Nov): refused the same way; still pending", errOf(b1) === NOTE("Rohan Gupta", "2026-11-11 and 2026-11-12", true) && req(id).status === "pending", errOf(b1));
seeded(); setNow(2026, 11, 2);
id = send(ARJUN, "2026-11-11", "2026-11-12"); setup(mgr(L, id), "manager");
setup(S.updateUser(AARAV, ARJUN, { dateOfJoining: "16 Nov 2026" }), "Arjun's joining date -> 16 Nov");
setNow(2026, 11, 9);
const c1 = hr(L, id);
check("F4", "C, the joining date moved later (to 16 Nov) after Arjun sent 11-12 Nov: refused, naming both; still pending",
  errOf(c1) === NOTE("Arjun Kapoor", "2026-11-11 and 2026-11-12", true) && req(id).status === "pending", errOf(c1));
seeded(); setNow(2026, 11, 2);
id = send(ARJUN, "2026-11-13", "2026-11-17"); setup(mgr(L, id), "manager");
setup(S.updateUser(AARAV, ARJUN, { dateOfJoining: "16 Nov 2026" }), "Arjun's joining date -> 16 Nov");
const c2 = hr(L, id);
check("F5", "a request straddling (13-17 Nov; joining date now 16 Nov): refused whole, naming 13 Nov only (14-15 the weekend)", errOf(c2) === NOTE("Arjun Kapoor", "2026-11-13"), errOf(c2));
id = rohanSent();
leaves(2026, 11, 9, "2026-11-06"); back(2026, 11, 16);
const f6 = [errOf(hr(OLDL, id)), casual(ROHAN).approved];
check("F6", "the code before approved A (the bug): casual approved 2", j(f6) === j(["ok", 2]), j(f6));

// =================================================================
section("R. What's still possible");
id = rohanSent();
leaves(2026, 11, 9, "2026-11-06"); back(2026, 11, 16);
hr(L, id);
const r1 = hr(L, id, "reject", "He wasn't here then.");
check("R1", "A refused request can still be rejected (with a note): rejected", r1.ok && req(id).status === "rejected", errOf(r1));
id = rohanSent();
leaves(2026, 11, 9, "2026-11-06"); back(2026, 11, 16);
const r2 = safe(() => L.cancelLeave(id, ROHAN));
check("R2", "...or cancelled by him: cancelled", r2.ok && req(id).status === "cancelled", errOf(r2));
id = rohanSent();
leaves(2026, 11, 9, "2026-11-06");
const r3 = hr(L, id, "reject", "Left on 6 Nov.");
check("R3", "B, a leaver's after-the-last-day request: rejected, as before (12B: decidable)", r3.ok && req(id).status === "rejected", errOf(r3));
seeded(); setNow(2026, 11, 2);
id = send(ROHAN, "2026-11-11", "2026-11-12");
leaves(2026, 11, 9, "2026-11-06"); back(2026, 11, 16);
const r4 = [errOf(mgr(L, id)), req(id).stage];
check("R4", "the manager stage isn't the final approval: approving there moves it to HR, as before", r4[0] === "ok" && r4[1] === "hr", j(r4));
seeded(); setNow(2026, 11, 2);
id = send(ROHAN, "2026-11-11", "2026-11-12"); setup(mgr(L, id), "manager"); setup(hr(L, id), "HR approves on 2 Nov");
leaves(2026, 11, 9, "2026-11-06"); back(2026, 11, 16);
check("R5", "a request approved before its days stopped being his stays approved (nothing undone); casual approved 2", req(id).status === "approved" && casual(ROHAN).approved === 2, j([req(id).status, casual(ROHAN)]));

// =================================================================
section("K. The other re-checks");
// 10V: Arjun sends 18 Nov on 16 Nov; checks in on 18 Nov (a stored check-in); HR's approval on 19 Nov.
seeded(); setNow(2026, 11, 16);
id = send(ARJUN, "2026-11-18"); setup(mgr(L, id), "manager");
setNow(2026, 11, 18, 9, 10); setup(A.checkIn(ARJUN, "office"), "Arjun checks in 18 Nov");
setNow(2026, 11, 19);
const snapK = new Map(mem);
const k1 = errOf(hr(L, id));
mem.clear(); for (const [k, v] of snapK) mem.set(k, v);
const k1old = errOf(hr(OLDL, id));
check("K1", "a check-in recorded since (10V): the same refusal as before", k1 === k1old && /^This request no longer matches the attendance record: Arjun Kapoor checked in on 2026-11-18/.test(k1), j([k1, k1old]));
// Both at once: Arjun sends 2 Nov on 30 Oct, checks in 2 Nov, then his joining date moves to 3 Nov: the day reads
// "not-joined", so that's the answer, not the check-in.
seeded(); setNow(2026, 10, 30, 19);
id = send(ARJUN, "2026-11-02"); setup(mgr(L, id), "manager");
setNow(2026, 11, 2, 9, 10); setup(A.checkIn(ARJUN, "office"), "Arjun checks in 2 Nov");
setNow(2026, 11, 3); setup(S.updateUser(AARAV, ARJUN, { dateOfJoining: "3 Nov 2026" }), "Arjun's joining date -> 3 Nov");
const k2 = [errOf(hr(L, id)), A.dayFor(ARJUN, "2026-11-02")?.status];
check("K2", "a day checked in on that's since become not his (joining date moved past it): named as not his, first", j(k2) === j([NOTE("Arjun Kapoor", "2026-11-02"), "not-joined"]), j(k2));
// 12B: a leaver's after-the-last-day request doesn't hold up the run, refused at approval or not.
id = rohanSent();
leaves(2026, 11, 9, "2026-11-06"); hr(L, id);
setNow(2026, 12, 9);
const k3 = PS.runProblems(2026, 11);
check("K3", "B's request, refused and still pending, doesn't hold up November's run (12B)", !k3.some((p) => /leave request/.test(p)), j(k3));
seeded(); setNow(2026, 11, 2);
const wid = send(ROHAN, "2026-11-11", "2026-11-11", "wfh"); setup(mgr(L, wid), "manager");
leaves(2026, 11, 9, "2026-11-06"); back(2026, 11, 16);
const k5 = errOf(hr(L, wid));
check("K4", "working from home on a day that became one away is refused too (as 12I refuses sending one)", k5 === NOTE("Rohan Gupta", "2026-11-11") && req(wid).status === "pending", k5);

// =================================================================
section("N. Nothing changes for anyone else");
// Every other active person sends a few requests on 16 Nov; each is taken through its stages by the new code and by
// the code before, on the same storage.
seeded(); setNow(2026, 11, 16);
const others = S.getAllUsers().filter((u) => u.status !== "inactive" && u.id !== ROHAN);
const sent = [];
for (const u of others) for (const [type, from, to] of [["casual", "2026-11-18"], ["sick", "2026-11-10", "2026-11-11"], ["wfh", "2026-11-20"], ["earned", "2026-11-23", "2026-11-27"], ["unpaid", "2026-11-12"]]) {
  const r = L.applyLeave(u.id, { type, from, to: to ?? from, duration: "full", reason: "probe" });
  if (r.ok) sent.push(r.record.id);
}
setNow(2026, 11, 19);
const snapN = new Map(mem);
const runAll = (mod) => { mem.clear(); for (const [k, v] of snapN) mem.set(k, v); return sent.map((x) => { const m = mgr(mod, x); const h = m.ok ? hr(mod, x) : m; return `${x}:${errOf(m)}|${errOf(h)}|${mod.getRequest(x).status}`; }); };
const nNew = runAll(L), nOld = runAll(OLDL);
check("N1", `everyone else (${others.length} active people, ${sent.length} requests taken through every stage): every decision the same as the code before's`,
  j(nNew) === j(nOld) && sent.length >= 20 && nNew.some((x) => x.endsWith("approved")), j(nNew.filter((x, i) => x !== nOld[i]).slice(0, 3)));

// =================================================================
section("P. The page");
id = rohanSent();
leaves(2026, 11, 9, "2026-11-06"); back(2026, 11, 16);
setSession("hr", "Priya Nair", PRIYA);
await open("leave/leave-approvals");
const rowP = [...d.querySelectorAll("tr")].find((tr) => /Rohan Gupta/.test(txt(tr)) && [...tr.querySelectorAll("button")].some((b) => txt(b) === "Approve"));
[...(rowP?.querySelectorAll("button") ?? [])].find((b) => txt(b) === "Approve")?.click();
const toast = txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
check("P1", "leave-approvals (Priya, HR): Approve on Rohan's request shows the refusal as a toast; it stays pending",
  Boolean(rowP) && toast === NOTE("Rohan Gupta", "2026-11-11 and 2026-11-12", true) && req(id).status === "pending", toast);

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12K"), jsPre = walk("./js-pre12J");   // Round 12K (layout; was the live js): 12J's own change set (js-pre12K = c1ac890)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12K", p) !== srcAt("./js-pre12J", p));
check("X1", "exactly one js file changed, none added or removed: data/leave-store.js (corrections and the pages untouched)", j(changedJs) === j(["data/leave-store.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12J").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12J", p))
  && walk("./css-pre12J").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12J", p)));
const now = srcAt("./js", "data/leave-store.js"), pre = srcAt("./js-pre12J", "data/leave-store.js");
check("X3", "CRLF with no final newline; no import changed", !now.endsWith("\n") && !/(^|[^\r])\n/.test(now) && j(now.match(/^import .*$/gm)) === j(pre.match(/^import .*$/gm)));
const fnText = (s, name) => { const i = s.search(new RegExp(`(export )?function ${name}\\b`)); return i < 0 ? null : s.slice(i, s.indexOf("\r\n}\r\n", i)); };
const kept = ["applyLeave", "notTheirDays", "checkedInDays", "overAllowance", "balanceFor", "cancelLeave", "workingDays"];
check("X4", "only decideLeave changes (12I's notTheirDays reused as it is); applyLeave, the check-in and balance re-checks' helpers as they were",
  kept.every((f) => fnText(now, f) !== null && fnText(now, f) === fnText(pre, f)) && fnText(now, "decideLeave") !== fnText(pre, "decideLeave"), kept.filter((f) => fnText(now, f) !== fnText(pre, f)).join(","));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
