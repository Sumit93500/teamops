// usage: node nottheirs.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12I: round-12h-notes.md H12, ruling approved 2026-10-26. A request dated on days that weren't the person's to
// work (before their joining date, or away: after a last working day, or in a period before they were reactivated,
// round 12H) is refused whole, naming the days, as applyLeave already refuses days checked in on. A correction for a
// day away is refused before the record is read, so never with the sample data's generated check-in time.
// ./js-pre12I, ./html-pre12I and ./css-pre12I are the code, pages and css before this round (office-os 9ce0d86).
//   G  H12 reproduced: Rohan away 7-15 Nov, back 16 Nov: leave on days away refused, nothing stored, balance as it was
//   S  a request straddling days away and days worked: refused whole, naming only the days away
//   B  boundaries: the last working day and the day back are theirs; weekends inside a gap aren't named
//   J  the joining date: leave before it refused (a past day, a future joiner); from it, allowed
//   C  corrections: every issue on a day away refused truthfully; before the joining date as before; a day back as before;
//      a correction already pending for a day that became a gap is decided as before (the approval is unchanged)
//   N  nothing changes for anyone else (every result == 9ce0d86's on the same storage), nor for a current leaver
//   P  pages: apply-leave and my-attendance show the refusals under the date fields
//   E what stays; X scope
// Storage seeded Fri 30 Oct 2026 19:00 (as gap.mjs does).
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
const AARAV = "EMP-1001", PRIYA = "EMP-1003", ROHAN = "EMP-1042", ARJUN = "EMP-1105", VIKRAM = "EMP-1088";
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
  w.HTMLDialogElement && (w.HTMLDialogElement.prototype.showModal ??= function () { this.open = true; });
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
const OLDA = await import("./js-pre12I/data/attendance-store.js");   // before this round, on the same storage
const OLDL = await import("./js-pre12I/data/leave-store.js");

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
let added = 0;
function rawAdd(key, fields) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  const id = box.records[0].id.replace(/\d+$/, String(9000 + ++added));
  box.records.push({ ...box.records[0], history: [], id, ...fields });
  mem.set(`officeos:${key}`, JSON.stringify(box));
  return id;
}
function seeded() {
  mem.clear(); setNow(2026, 10, 30, 19); PS.payrollRun(2026, 10);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
}
const setup = (r, what) => { if (!r?.ok) console.log(`setup (${what}):`, errOf(r)); return r; };
const leaves = (y, mo, dd, last) => { setNow(y, mo, dd); return setup(S.deactivateUser(PRIYA, ROHAN, last), `leaves ${last}`); };
const back = (y, mo, dd) => { setNow(y, mo, dd); return setup(S.reactivateUser(AARAV, ROHAN), `back ${dd}/${mo}`); };
// Rohan: last working day Fri 6 Nov (deactivated Mon 9 Nov), reactivated Mon 16 Nov: 9-13 Nov read "left".
const gapped = () => { seeded(); leaves(2026, 11, 9, "2026-11-06"); back(2026, 11, 16); };
const leave = (mod, id, type, from, to = from, duration = "full") => safe(() => mod.applyLeave(id, { type, from, to, duration, reason: "probe" }));
const fix = (mod, id, date, issue, time = "09:10") => safe(() => mod.requestRegularization(id, { date, issue, time, reason: "probe" }));
const stored = () => [mem.get("officeos:leave-requests"), mem.get("officeos:regularizations")];
const LEAVE = (days, many = false) => `You weren't working here on ${days}, so leave can't cover ${many ? "those days" : "that day"}.`;
const AWAY = "You weren't working here that day.";

// =================================================================
section("G. H12 reproduced: leave on days away");
gapped();
const st = A.monthFor(ROHAN, 2026, 11).days.filter((x) => x.status === "left").map((x) => Number(x.date.slice(8)));
const at = stored(), bal = j(L.balanceFor(ROHAN, 2026, 11).casual);
const g1 = leave(L, ROHAN, "casual", "2026-11-12", "2026-11-13");
check("G1", "Rohan (away 9-13 Nov, back 16 Nov): casual leave 12-13 Nov refused, naming both days, on From",
  j(st) === j([9, 10, 11, 12, 13]) && errOf(g1) === LEAVE("2026-11-12 and 2026-11-13", true) && g1.field === "from", j([st, errOf(g1)]));
check("G2", "nothing stored; his casual balance as it was (the code before stored it: pending 3 -> 5)", j(stored()) === j(at) && j(L.balanceFor(ROHAN, 2026, 11).casual) === bal, bal);
const g3 = [leave(L, ROHAN, "unpaid", "2026-11-11"), leave(L, ROHAN, "casual", "2026-11-12", "2026-11-12", "first-half"), leave(L, ROHAN, "wfh", "2026-11-10")].map(errOf);
check("G3", "unpaid leave, a half day, and working from home on a day away: each refused the same way (one day)", g3.every((e, i) => e === LEAVE(["2026-11-11", "2026-11-12", "2026-11-10"][i])), j(g3));
gapped();
const g4 = errOf(leave(OLDL, ROHAN, "casual", "2026-11-12", "2026-11-13"));
check("G4", "the code before took it (the bug)", /^ok$/.test(g4), g4);

// =================================================================
section("S. Straddling days away and days worked");
gapped();
const s0 = stored();
const s1 = leave(L, ROHAN, "casual", "2026-11-13", "2026-11-17");
check("S1", "casual 13-17 Nov (13 away; 14-15 the weekend; 16-17 worked): refused whole, naming only 13 Nov; nothing stored",
  errOf(s1) === LEAVE("2026-11-13") && j(stored()) === j(s0), errOf(s1));
const s2 = errOf(leave(L, ROHAN, "casual", "2026-11-09", "2026-11-20"));
check("S2", "9-20 Nov: names every working day away (9-13 Nov), not the weekend or the days back", s2 === LEAVE("2026-11-09, 2026-11-10, 2026-11-11, 2026-11-12 and 2026-11-13", true), s2);

// =================================================================
section("B. Boundaries");
gapped();
const b1 = errOf(leave(L, ROHAN, "casual", "2026-11-16"));
check("B1", "the day he came back (16 Nov) is his: allowed", b1 === "ok", b1);
seeded(); leaves(2026, 11, 9, "2026-11-06"); back(2026, 11, 10);
const b2 = [errOf(leave(L, ROHAN, "casual", "2026-11-06")), errOf(leave(L, ROHAN, "casual", "2026-11-09")), errOf(leave(L, ROHAN, "casual", "2026-11-10"))];
check("B2", "last working day 6 Nov, back 10 Nov: 6 Nov allowed, 9 Nov refused, 10 Nov allowed", j(b2) === j(["ok", LEAVE("2026-11-09"), "ok"]), j(b2));
seeded(); leaves(2026, 11, 9, "2026-11-06"); back(2026, 11, 10); leaves(2026, 11, 12, "2026-11-11"); back(2026, 11, 13);
const b3 = errOf(leave(L, ROHAN, "casual", "2026-11-06", "2026-11-13"));
check("B3", "two periods away (9 Nov; 12 Nov): one request over both names both days, nothing between", b3 === LEAVE("2026-11-09 and 2026-11-12", true), b3);

// =================================================================
section("J. The joining date");
seeded(); setNow(2026, 11, 16);
setup(S.updateUser(AARAV, ARJUN, { dateOfJoining: "13 Nov 2026" }), "Arjun joins 13 Nov");
const j1 = [errOf(leave(L, ARJUN, "casual", "2026-11-11")), errOf(leave(L, ARJUN, "casual", "2026-11-12", "2026-11-13")), errOf(leave(L, ARJUN, "casual", "2026-11-13"))];
check("J1", "Arjun, joined 13 Nov: 11 Nov refused; 12-13 Nov refused naming 12 Nov only; 13 Nov (the joining day) allowed",
  j(j1) === j([LEAVE("2026-11-11"), LEAVE("2026-11-12"), "ok"]), j(j1));
seeded(); setNow(2026, 11, 16);
setup(S.updateUser(AARAV, ARJUN, { dateOfJoining: "1 Dec 2026" }), "Arjun joins 1 Dec");
const j2 = [errOf(leave(L, ARJUN, "casual", "2026-11-26", "2026-11-27")), errOf(leave(L, ARJUN, "casual", "2026-12-02"))];
check("J2", "a future joiner (1 Dec): leave 26-27 Nov refused; 2 Dec allowed", j(j2) === j([LEAVE("2026-11-26 and 2026-11-27", true), "ok"]), j(j2));
// A stored sample day (29 Oct, checked in) before a joining date set later (2 Nov): the day reads "not-joined", so it's
// named as not theirs, not as a day checked in on (the new refusal comes first).
seeded(); setNow(2026, 11, 3);
setup(S.updateUser(AARAV, ARJUN, { dateOfJoining: "2 Nov 2026" }), "Arjun joins 2 Nov");
const j3stored = (JSON.parse(mem.get("officeos:attendance")).records ?? []).some((r) => r.userId === ARJUN && r.date === "2026-10-29" && r.checkIn);
const j3 = [errOf(leave(L, ARJUN, "casual", "2026-10-29")), A.dayFor(ARJUN, "2026-10-29")?.status];
check("J3", "a stored, checked-in sample day (29 Oct) before a joining date set later (2 Nov): named as not his, not as checked in",
  j3stored && j(j3) === j([LEAVE("2026-10-29"), "not-joined"]), j([j3stored, j3]));

// =================================================================
section("C. Corrections");
gapped();
const c0 = stored();
const c1 = ["missed-check-in", "late-arrival", "missed-check-out"].map((issue) => fix(A, ROHAN, "2026-11-12", issue, issue === "missed-check-out" ? "18:30" : "09:00"));
const c1old = ["missed-check-in", "late-arrival"].map((issue) => errOf(fix(OLDA, ROHAN, "2026-11-12", issue, "09:00")));
check("C1", "a correction for a day away (12 Nov), whatever the issue: \"You weren't working here that day.\" on the date; nothing stored",
  c1.every((r) => errOf(r) === AWAY && r.field === "date") && j(stored()) === j(c0), j(c1.map(errOf)));
check("C2", "the code before gave the generated check-in as the reason (\"You checked in at …\"), and \"You weren't marked late\"",
  /^You checked in at \d\d:\d\d that day\. Choose Late arrival to correct it\.$/.test(c1old[0]) && c1old[1] === "You weren't marked late that day.", j(c1old));
const c3 = ["missed-check-in", "late-arrival", "missed-check-out"].map((issue) => [errOf(fix(A, ROHAN, "2026-11-16", issue, "09:00")), errOf(fix(OLDA, ROHAN, "2026-11-16", issue, "09:00"))]);
check("C3", "the day he came back (16 Nov): every issue meets the same answer as before", c3.every(([a, b]) => a === b), j(c3));
seeded(); setNow(2026, 11, 16);
setup(S.updateUser(AARAV, ARJUN, { dateOfJoining: "13 Nov 2026" }), "Arjun joins 13 Nov");
const c4 = [errOf(fix(A, ARJUN, "2026-11-11", "missed-check-in")), errOf(fix(OLDA, ARJUN, "2026-11-11", "missed-check-in"))];
check("C4", "before the joining date: the existing refusal, unchanged (it comes first)", c4[0] === "You can't ask to correct a day before your joining date (2026-11-13)." && c4[0] === c4[1], j(c4));
// A correction sent while he still worked (10 Nov, for 9 Nov), then 9 Nov became a day away (last working day 6 Nov,
// set on 11 Nov), back 16 Nov: the final approval is as before (12B: decided like any other).
const pend = () => { seeded(); setNow(2026, 11, 10); const r = rawAdd("regularizations", { userId: ROHAN, date: "2026-11-09", issue: "missed-check-out", time: "18:30", status: "pending", stage: "hr", managerId: null });
  leaves(2026, 11, 11, "2026-11-06"); back(2026, 11, 16); return r; };
const c5id = pend(); const c5 = errOf(safe(() => A.decideRegularization(c5id, PRIYA, "hr", "approve")));
const c5o = pend(); const c5old = errOf(safe(() => OLDA.decideRegularization(c5o, PRIYA, "hr", "approve")));
check("C5", "a correction pending for a day that became one away: approving it meets what it did before", c5 === c5old, j([c5, c5old]));

// =================================================================
section("N. Nothing changes for anyone else");
gapped();
const snap = new Map(mem);
const restore = () => { mem.clear(); for (const [k, v] of snap) mem.set(k, v); };
const nBad = [];
const others = S.getAllUsers().filter((u) => u.id !== ROHAN && u.status !== "inactive");
const LV = [["casual", "2026-11-10"], ["casual", "2026-11-12", "2026-11-13"], ["unpaid", "2026-11-14", "2026-11-15"], ["sick", "2026-11-18", "2026-11-20"], ["wfh", "2026-11-19"], ["casual", "2026-11-02"]];
const FX = [["2026-11-12", "missed-check-in", "09:10"], ["2026-11-12", "late-arrival", "09:00"], ["2026-11-13", "missed-check-out", "18:30"], ["2026-11-14", "missed-check-in", "09:10"]];
for (const u of others) {
  for (const [type, from, to] of LV) {
    restore(); const a = j(leave(L, u.id, type, from, to)); restore(); const b = j(leave(OLDL, u.id, type, from, to));
    if (a !== b) nBad.push(`${u.id} ${type} ${from}`);
  }
  for (const [date, issue, time] of FX) {
    restore(); const a = j(fix(A, u.id, date, issue, time)); restore(); const b = j(fix(OLDA, u.id, date, issue, time));
    if (a !== b) nBad.push(`${u.id} ${issue} ${date}`);
  }
}
restore();
check("N1", `everyone else (${others.length} active people), ${LV.length} leave requests and ${FX.length} corrections each: every result the same as the code before's`, nBad.length === 0 && others.length >= 8, j(nBad.slice(0, 4)));
seeded(); leaves(2026, 11, 10, "2026-11-06");
const n2 = [errOf(leave(L, ROHAN, "casual", "2026-11-12")), errOf(leave(OLDL, ROHAN, "casual", "2026-11-12")), errOf(fix(A, ROHAN, "2026-11-09", "missed-check-in")), errOf(fix(OLDA, ROHAN, "2026-11-09", "missed-check-in"))];
check("N2", "a current leaver (still away): both refused as before (inactive)", n2[0] === n2[1] && n2[2] === n2[3] && /inactive/.test(n2[0]) && /inactive/.test(n2[2]), j(n2));

// =================================================================
section("P. Pages");
gapped();
setSession("emp", "Rohan Gupta", ROHAN);
await open("leave/apply-leave");
const fill = (type, from, to = from) => {
  const r = d.querySelector(`input[name="leaveType"][value="${type}"]`); r.checked = true; r.dispatchEvent(new w.Event("change", { bubbles: true }));
  for (const [id, v] of [["from-date", from], ["to-date", to]]) { d.getElementById(id).value = v; d.getElementById(id).dispatchEvent(new w.Event("change", { bubbles: true })); }
  d.getElementById("leave-reason").value = "probe";
};
const p0 = stored();
fill("casual", "2026-11-12", "2026-11-13");
d.querySelector('#leave-form [type="submit"]').click();
const fromBox = d.getElementById("from-date").closest(".form-field") ?? d.getElementById("from-date").parentElement;
const p1 = fromBox.querySelector(".form-error");
check("P1", "apply-leave (Rohan): 12-13 Nov shows the refusal under From, linked to it; nothing stored",
  p1?.textContent === LEAVE("2026-11-12 and 2026-11-13", true) && d.getElementById("from-date").getAttribute("aria-describedby") === p1?.id && j(stored()) === j(p0), txt(p1));
await open("attendance/my-attendance");
const setField = (id, v) => { const x = d.getElementById(id); x.value = v; x.dispatchEvent(new w.Event("change", { bubbles: true })); };
setField("reg-issue", "missed-check-in"); setField("reg-date", "2026-11-12"); setField("reg-time", "09:10"); setField("reg-reason", "Forgot");
d.querySelector("#regularize-modal form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const p2 = [...d.querySelectorAll("#regularize-modal .form-error")].map((e) => `${e.closest(".form-field").querySelector("input, select, textarea").id}:${e.textContent}`);
check("P2", "my-attendance's correction form (Rohan, 12 Nov, missed check-in): the refusal under the date; nothing stored", j(p2) === j([`reg-date:${AWAY}`]) && j(stored()) === j(p0), j(p2));

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12J"), jsPre = walk("./js-pre12I");   // Round 12K (layout; was the live js): 12I's own change set (js-pre12J = 82a8702)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12J", p) !== srcAt("./js-pre12I", p));
const TWO = ["data/attendance-store.js", "data/leave-store.js"];
check("X1", "exactly these 2 js files changed, none added or removed (the pages untouched)", j(changedJs) === j(TWO) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12I").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12I", p))
  && walk("./css-pre12I").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12I", p)));
const imports = (s) => s.match(/^import .*$/gm) ?? [];
const lNow = srcAt("./js", "data/leave-store.js"), aNow = srcAt("./js-pre12J", "data/attendance-store.js");   // Round 12K (layout; aNow was the live js)
check("X3", "CRLF with no final newline; the only import change is joiningDate and awayOn from store.js in leave-store (never attendance-store: a load-time cycle, round 10V)",
  TWO.every((p) => { const s = srcAt("./js", p); return !s.endsWith("\n") && !/(^|[^\r])\n/.test(s); })
  && j(imports(aNow)) === j(imports(srcAt("./js-pre12I", "data/attendance-store.js")))
  && j(imports(lNow).filter((l) => !imports(srcAt("./js-pre12I", "data/leave-store.js")).includes(l))) === j(['import { getUser, getAllUsers, joiningDate, awayOn } from "./store.js";'])
  && !/attendance-store/.test(imports(lNow).join("\n")));
const fn = (s, name) => s.slice(s.indexOf(`function ${name}(`), s.indexOf("\n}", s.indexOf(`function ${name}(`)));
const aPre = srcAt("./js-pre12I", "data/attendance-store.js");
check("X4", "checkAgainstRecord(), applyCorrection() and deriveDay() unchanged; checkedInDays()'s refusal kept",
  ["checkAgainstRecord", "applyCorrection", "deriveDay"].every((f) => fn(aNow, f) === fn(aPre, f) && fn(aNow, f).length > 50) && lNow.includes("You checked in on ${daysText(worked)}, so leave can't cover ${thoseDays(worked)}."));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
