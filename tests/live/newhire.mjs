// usage: node newhire.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12U (R9-0; 12E E7.5), ruling approved with the follow-up on a missing date: while any payroll month is
// approved, addUser needs a readable joining date after the end of the newest approved month. One on or before it, a
// missing / blank / unreadable one is refused, on dateOfJoining: "{Month YYYY}'s payroll is already approved, so a new
// employee needs a joining date after it." Nothing approved: as before. changeUser / updateUser untouched.
// ./js-pre12U, ./html-pre12U and ./css-pre12U are the code, pages and css before this round (office-os 8e1663d).
//   G  E7.5 reproduced: a hire joining 10 Oct (or with no date) after October's approval gets a live row it lacks
//   B  the boundary with October approved: 30 / 31 Oct and earlier refused, 1 Nov on allowed; formats; missing, blank,
//      null, unreadable refused; the string, the field; nothing stored, no id taken
//   M  which month: the newest approved (September + October: October); only September; prepared isn't approved
//   N  nothing approved: every case == the code before's
//   O  order: the earlier refusals first; this one before the field checks
//   I  no approved month ever gains a live row through addUser (a grid of dates x approval states); the code before did
//   U  updateUser's joining-date rule (12E) and other addUser rules unchanged
//   F  the Add page: the refusal as a toast; a date after October saves; nothing approved: a blank date saves
//   E  no page errors;  X  scope
// Storage seeded Fri 30 Oct 2026 19:00; September settled and approved on 9 Oct, October on 9 Nov, where a case says.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
setNow(2026, 11, 20);
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, query = "", js = "./js") {
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
    try { await import(`${js}/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); }
  }
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const safe = (fn) => { try { return fn(); } catch (e) { return { ok: false, error: `threw: ${e.message}` }; } };
const errOf = (r) => (r?.ok ? "ok" : r?.error ?? "no result");

const S = await import("./js/data/store.js");
const PS = await import("./js/data/payroll-store.js");
const OLDS = await import("./js-pre12U/data/store.js");   // before this round, on the same storage

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
const setup = (r, what) => { if (!r?.ok) console.log(`setup (${what}):`, errOf(r)); return r; };
// Seeded; `approve` lists the approved months ("2026-09", "2026-10"); `prepare` prepares October only. Then 20 Nov.
// October is settled, prepared and approved for real on 9 Nov. September can't be prepared in this seed (its working
// days came before attendance records began), so an approved September is written into the stored runs directly: a
// copy of October's approved record marked "2026-09" (with October), or October's own record relabelled (September
// alone). The rule reads only which months are approved.
function seeded({ approve = [], prepare = false, at = [2026, 11, 20] } = {}) {
  mem.clear(); setNow(2026, 10, 30, 19); S.getAllUsers(); PS.payrollRun(2026, 10);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
  if (approve.length) {
    setNow(2026, 11, 9);
    setup(safe(() => PS.prepareRun(KABIR, 2026, 10)), "prepare 2026-10"); setup(safe(() => PS.approveRun(AARAV, 2026, 10)), "approve 2026-10");
    if (approve.includes("2026-09")) {
      const box = JSON.parse(mem.get("officeos:payroll-runs"));
      const oct = box.records.find((r) => r.month === "2026-10" && r.status === "approved");
      if (approve.includes("2026-10")) { box.records.push({ ...JSON.parse(JSON.stringify(oct)), id: `PR-${box.nextNum}`, month: "2026-09" }); box.nextNum += 1; }
      else oct.month = "2026-09";
      mem.set("officeos:payroll-runs", JSON.stringify(box));
    }
  }
  if (prepare) { setNow(2026, 11, 9); setup(safe(() => PS.prepareRun(KABIR, 2026, 10)), "prepare 2026-10"); }
  setNow(...at);
}
const approvedNow = () => JSON.parse(mem.get("officeos:payroll-runs") ?? '{"records":[]}').records.filter((r) => r.status === "approved").map((r) => r.month).sort();
const NEW = { name: "Neha Kapoor", email: "neha.kapoor@northwind.com", department: "ENG", designation: "Software Engineer" };
const OCT = "October 2026's payroll is already approved, so a new employee needs a joining date after it.";
const SEP = "September 2026's payroll is already approved, so a new employee needs a joining date after it.";
const add = (mod, extra, who = AARAV) => safe(() => mod.addUser(who, { ...NEW, ...extra }));
const liveHas = (y, m, id) => Boolean(PS.payrollRun(y, m)?.rows?.some((r) => r.userId === id));
const users = () => mem.get("officeos:users");

// =================================================================
section("G. E7.5, reproduced");
seeded({ approve: ["2026-10"] });
const g1 = add(OLDS, { dateOfJoining: "10 Oct 2026" });
check("G1", "the code before, October approved: a hire joining 10 Oct is added, and live October gains a row the approved run lacks",
  g1.ok && liveHas(2026, 10, g1.record.id) && !PS.storedRun(2026, 10).rows.some((r) => r.userId === g1.record.id), errOf(g1));
seeded({ approve: ["2026-10"] });
const g2 = add(OLDS, {});
check("G2", "...and the same with no joining date (payroll reads none as the whole month)", g2.ok && liveHas(2026, 10, g2.record.id), errOf(g2));

// =================================================================
section("B. The boundary, October approved");
const REFUSED = [["10 Oct 2026", "10 Oct 2026"], ["30 Oct 2026", "30 Oct 2026"], ["31 Oct 2026 (the month's last day)", "31 Oct 2026"], ["2026-10-31 (ISO)", "2026-10-31"],
  ["1 Jan 2024", "1 Jan 2024"], ["30 Sep 2026", "30 Sep 2026"], ["no date", undefined], ["\"\" (the Add form left blank)", ""], ["null", null], ["\"banana\" (unreadable)", "banana"], ["\"31 Feb 2026\" (not a date)", "31 Feb 2026"]];
const bBad = [];
for (const [label, value] of REFUSED) {
  seeded({ approve: ["2026-10"] });
  const at = users(), next = S.peekNextId();
  const r = add(S, value === undefined ? {} : { dateOfJoining: value });
  if (errOf(r) !== OCT || r.field !== "dateOfJoining" || users() !== at || S.peekNextId() !== next) bBad.push(`${label}: ${j(r)}`);
}
check("B1", `${REFUSED.length} joining dates on or before 31 Oct, missing, blank, null or unreadable: refused, "${OCT}", on dateOfJoining; nothing stored, no id taken`, bBad.length === 0, j(bBad.slice(0, 3)));
const ALLOWED = [["1 Nov 2026", "1 Nov 2026"], ["2026-11-01 (ISO)", "2026-11-01"], ["20 Nov 2026 (today)", "20 Nov 2026"], ["1 Dec 2026 (to come)", "1 Dec 2026"]];
const b2Bad = [];
for (const [label, value] of ALLOWED) {
  seeded({ approve: ["2026-10"] });
  const r = add(S, { dateOfJoining: value });
  if (!r.ok || liveHas(2026, 10, r.record.id)) b2Bad.push(`${label}: ${errOf(r)}`);
  seeded({ approve: ["2026-10"] });
  const a = j(add(S, { dateOfJoining: value })), aStore = users();
  seeded({ approve: ["2026-10"] });
  const b = j(add(OLDS, { dateOfJoining: value })), bStore = users();
  if (a !== b || aStore !== bStore) b2Bad.push(`${label}: differs from the code before`);
}
check("B2", `${ALLOWED.length} joining dates from 1 Nov on (both formats, today, to come): saved, no October row; result and stored users == the code before's`, b2Bad.length === 0, j(b2Bad));

// =================================================================
section("M. Which month");
seeded({ approve: ["2026-09", "2026-10"] });
const m0 = approvedNow();
const m1 = [errOf(add(S, { dateOfJoining: "15 Oct 2026" })), errOf(add(S, { dateOfJoining: "15 Sep 2026" }))];
check("M1", "September and October approved: the newest, October, is named, for a date in either month", j(m0) === j(["2026-09", "2026-10"]) && m1.every((e) => e === OCT), j([m0, m1]));
seeded({ approve: ["2026-09"] });
const m2a = approvedNow(), m2 = [errOf(add(S, { dateOfJoining: "30 Sep 2026" })), add(S, { email: "n2@northwind.com", dateOfJoining: "1 Oct 2026" })];
check("M2", "only September approved: 30 Sep refused naming September; 1 Oct allowed (October isn't approved)", j(m2a) === j(["2026-09"]) && m2[0] === SEP && m2[1].ok, j([m2a, m2[0], errOf(m2[1])]));
seeded({ prepare: true });
const m3 = [add(S, { dateOfJoining: "10 Oct 2026" }), add(S, { email: "n2@northwind.com" })];
check("M3", "October prepared, not approved: no refusal (a prepared run can be prepared again)", m3.every((r) => r.ok) && PS.storedRun(2026, 10)?.status === "prepared", j(m3.map(errOf)));

// =================================================================
section("N. Nothing approved: as before");
const nBad = [];
for (const extra of [{}, { dateOfJoining: "" }, { dateOfJoining: "10 Oct 2026" }, { dateOfJoining: "1 Jan 2024" }, { dateOfJoining: "banana" }, { dateOfJoining: "3 Nov 2026" }]) {
  seeded(); const a = j(add(S, extra)), aStore = users();
  seeded(); const b = j(add(OLDS, extra)), bStore = users();
  if (a !== b || aStore !== bStore || !JSON.parse(a).ok) nBad.push(`${j(extra)}: ${a} vs ${b}`);
}
check("N1", "no approved month: missing, blank, early, unreadable and later joining dates all saved, result and stored users == the code before's", nBad.length === 0, j(nBad.slice(0, 2)));

// =================================================================
section("O. Order");
seeded({ approve: ["2026-10"] });
const o = [
  [errOf(add(S, { dateOfJoining: "10 Oct 2026" }, ARJUN)), "You can't add employees."],
  [errOf(add(S, { role: "admin", dateOfJoining: "10 Oct 2026" }, PRIYA)), errOf(add(OLDS, { role: "admin" }, PRIYA))],
  [errOf(add(S, { status: "left", dateOfJoining: "10 Oct 2026" })), "Status must be active, on-leave or inactive."],
  [errOf(add(S, { status: "inactive", dateOfJoining: "10 Oct 2026" })), "A last working day is recorded only when someone is deactivated."],
  [errOf(add(S, { name: "", dateOfJoining: "10 Oct 2026" })), OCT],
  [errOf(add(S, { email: "aarav.mehta@northwind.com", dateOfJoining: "10 Oct 2026" })), OCT],
  [errOf(add(S, { name: "", dateOfJoining: "3 Nov 2026" })), "Name is required."],
];
check("O1", "the permission, Admin-only, 12R status and 12P last-working-day refusals first; then this one, before a missing name or an email in use; with a good date, those as before",
  o.every(([a, b]) => a === b) && /^Only an Admin/.test(o[1][0]), j(o.map(([a]) => a)));

// =================================================================
section("I. No approved month gains a live row");
const DATES = [undefined, "", "1 Sep 2026", "30 Sep 2026", "1 Oct 2026", "15 Oct 2026", "31 Oct 2026", "1 Nov 2026", "20 Nov 2026", "banana"];
const STATES = [[], ["2026-09"], ["2026-10"], ["2026-09", "2026-10"]];
function battery(mod) {
  const found = [];
  let n = 0;
  for (const approve of STATES) for (const date of DATES) {
    seeded({ approve });
    const r = add(mod, { email: `i${n++}@northwind.com`, ...(date === undefined ? {} : { dateOfJoining: date }) });
    if (!r.ok) continue;
    for (const m of approve) { const [y, mo] = m.split("-").map(Number); if (liveHas(y, mo, r.record.id)) found.push(`${approve.join("+")} / ${date}: ${m}`); }
  }
  return found;
}
const iNew = battery(S), iOld = battery(OLDS);
check("I1", `addUser over ${DATES.length} joining dates x ${STATES.length} approval states: no approved month ever gains a live row`, iNew.length === 0, j(iNew.slice(0, 3)));
check("I2", "the same battery on the code before adds some", iOld.length > 0, j(iOld.length));

// =================================================================
section("U. What stays");
const uBad = [];
for (const [label, call] of [
  ["updateUser Vikram joining 15 Oct (12E)", (m) => m.updateUser(AARAV, VIKRAM, { dateOfJoining: "15 Oct 2026" })],
  ["updateUser Vikram joining 3 Nov", (m) => m.updateUser(AARAV, VIKRAM, { dateOfJoining: "3 Nov 2026" })],
  ["deactivateUser Vikram 20 Nov", (m) => m.deactivateUser(PRIYA, VIKRAM, "2026-11-20")],
  ["addUser status on-leave, joining 3 Nov", (m) => m.addUser(AARAV, { ...NEW, status: "on-leave", dateOfJoining: "3 Nov 2026" })],
]) {
  seeded({ approve: ["2026-10"] }); const a = j(safe(() => call(S))), aStore = users();
  seeded({ approve: ["2026-10"] }); const b = j(safe(() => call(OLDS))), bStore = users();
  if (a !== b || aStore !== bStore) uBad.push(`${label}: ${a} vs ${b}`);
}
check("U1", "October approved: updateUser's joining-date rule (12E), a deactivation and addUser's other rules give the same results and stored users as before", uBad.length === 0, j(uBad.slice(0, 2)));

// =================================================================
section("F. The Add page");
async function addOnPage(joining, approve) {
  seeded({ approve });
  setSession("admin", "Aarav Mehta", AARAV); await open("users/user-form");
  const f = (id) => d.getElementById(id);
  f("first-name").value = "Neha"; f("last-name").value = "Kapoor"; f("work-email").value = NEW.email;
  f("department").value = [...f("department").options].find((o) => o.value)?.value ?? "";
  f("designation").value = [...f("designation").options].find((o) => o.value)?.value ?? "";
  f("joining").value = joining;
  d.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  const toast = txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
  return { toast, saved: Boolean(S.getAllUsers().find((u) => u.email === NEW.email)) };
}
const f1 = [await addOnPage("", ["2026-10"]), await addOnPage("2026-10-10", ["2026-10"]), await addOnPage("2026-11-03", ["2026-10"]), await addOnPage("", [])];
check("F1", "the Add page, October approved: a blank or 10 Oct joining date meets the refusal as a toast, nothing saved; 3 Nov saves; nothing approved: a blank date saves as before",
  f1[0].toast === OCT && !f1[0].saved && f1[1].toast === OCT && !f1[1].saved && f1[2].toast === "Employee saved." && f1[2].saved && f1[3].toast === "Employee saved." && f1[3].saved, j(f1));

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12V"), jsPre = walk("./js-pre12U");   // Round 12V (layout; was the live js): 12U's own change set (js-pre12V = 2a0ef90)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12V", p) !== srcAt("./js-pre12U", p));
check("X1", "exactly one js file changed, none added or removed: data/store.js", j(changedJs) === j(["data/store.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12U").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12U", p))
  && walk("./css-pre12U").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12U", p)));
const [st, stPre] = [srcAt("./js-pre12V", "data/store.js"), srcAt("./js-pre12U", "data/store.js")];   // Round 12V (layout; was the live js)
const crlf = (s) => !s.endsWith("\n") && !/(^|[^\r])\n/.test(s);
const code = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l)).join("\r\n");
const literals = (s) => [...new Set([...code(s).matchAll(/`[^`\r\n]*`|"[^"\r\n]*"/g)].map((m) => m[0]))].sort();
const added = literals(st).filter((x) => !literals(stPre).includes(x)), gone = literals(stPre).filter((x) => !literals(st).includes(x));
check("X3", "CRLF, no final newline, imports unchanged; the only new literal is the message; none removed",
  crlf(st) && j(st.match(/^import .*$/gm)) === j(stPre.match(/^import .*$/gm))
  && j(added) === j(["`${monthLabel(approved)}'s payroll is already approved, so a new employee needs a joining date after it.`"]) && gone.length === 0, j([added, gone]));
const fn = (s, name) => { const a = s.indexOf(`function ${name}(`); return a < 0 ? "" : s.slice(a, s.indexOf("\n}", a) + 2); };
const NEWBLOCK = /\r\n  \/\/ \.\.\.and joins after the newest approved payroll month[\s\S]*?needs a joining date after it\.`, "dateOfJoining"\);\r\n  }/;
check("X4", "store.js: only addUser changed, by the one block; changeUser, joiningProblem, leavingProblem and reactivationProblem byte for byte",
  NEWBLOCK.test(st) && st.replace(NEWBLOCK, "") === stPre && ["changeUser", "joiningProblem", "leavingProblem", "reactivationProblem"].every((f) => fn(st, f) === fn(stPre, f) && fn(st, f).length > 100));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
