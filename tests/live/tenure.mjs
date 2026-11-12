// usage: node tenure.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12Q: round-12h-notes.md H10 / round-12p-notes.md P11, ruling approved. The profile's Tenure keeps counting
// from the joining date (to today, or a leaver's last working day, as renderTenure() did); when the person has time away
// in their past periods (store.js leavingPeriods(), 12H) the total is noted beside it: "5 years, 2 months (11 days away)".
// Each period's days away are those store.js awayOn() reads as away: after its last working day, before the day they
// came back. Someone never away shows exactly what they did. Display only (user-profile.js).
// ./js-pre12Q, ./html-pre12Q and ./css-pre12Q are the code, pages and css before this round (office-os 5b0a57c).
//   N  never away: every seeded person's Tenure, active or not, == the code before's (no note)
//   O  one period: the note, its count by awayOn(); 1 day singular; a period with no day away: no note
//   S  several periods: the sum; across a month end and a year end
//   L  a leaver: Tenure to their last working day as before, the note for past periods only (not the live leaving)
//   F  the page follows Reactivate / Deactivate (renderStatus -> renderTenure)
//   U  unreadable periods skipped (leavingPeriods() as the store reads it); no joining date: the static text as before
//   E  no page errors;  X  scope
// Storage seeded Fri 30 Oct 2026 19:00; the pages opened on the dates each case names (11:00).
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
const AARAV = "EMP-1001", PRIYA = "EMP-1003", ROHAN = "EMP-1042", DIVYA = "EMP-1061", VIKRAM = "EMP-1088";
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

// A page, with its scripts from ./js (this round) or ./js-pre12Q (the code before).
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

const S = await import("./js/data/store.js");
const setup = (r, what) => { if (!r?.ok) console.log(`setup (${what}):`, r?.error ?? r); return r; };
// Rohan has no joining date in the seed (the page then keeps its static Tenure text): he's given 12 Jan 2023.
const seeded = () => { mem.clear(); setNow(2026, 10, 30, 19); setup(S.updateUser(AARAV, ROHAN, { dateOfJoining: "12 Jan 2023" }), "joining date"); setNow(2026, 11, 20); };
// A leaving on `last` (opened that day), then back on `back` (Reactivate that day).
function away(id, last, back) {
  const [y, m, dd] = last.split("-").map(Number); setNow(y, m, dd);
  setup(safe(() => S.deactivateUser(PRIYA, id, last)), `leave ${last}`);
  const [y2, m2, d2] = back.split("-").map(Number); setNow(y2, m2, d2);
  setup(safe(() => S.reactivateUser(AARAV, id)), `back ${back}`);
}
const tenureOn = () => txt([...d.querySelectorAll(".kv__row")].find((r) => txt(r.querySelector("dt")) === "Tenure")?.querySelector("dd"));
// The profile's Tenure as this round's page and the code before's show it, on the same storage and clock.
async function both(id) {
  setSession("admin", "Aarav Mehta", AARAV);
  await open("users/user-profile", `?id=${id}`); const now = tenureOn();
  await open("users/user-profile", `?id=${id}`, "./js-pre12Q"); const pre = tenureOn();
  return { now, pre };
}
const withNote = (r, n) => r.now === `${r.pre} (${n} ${n === 1 ? "day" : "days"} away)`;

// =================================================================
section("N. Never away: unchanged");
seeded();
const nBad = [];
for (const u of S.getAllUsers()) {
  const r = await both(u.id);
  if (r.now !== r.pre || /away/.test(r.now)) nBad.push(`${u.id}: ${j(r)}`);
}
check("N1", `every seeded person (${S.getAllUsers().length}, active, on leave and inactive): Tenure exactly as the code before shows it, no note`, nBad.length === 0, j(nBad.slice(0, 3)));
const n2 = await both(ROHAN);
check("N2", "Rohan (joined 12 Jan 2023), never away, 20 Nov: \"3 years, 10 months\", as before", n2.now === "3 years, 10 months" && n2.now === n2.pre, j(n2));
check("N3", "no seeded person has a past period (so N1 is the common case)", S.getAllUsers().every((u) => S.leavingPeriods(u).length === 0));

// =================================================================
section("O. One period");
seeded(); away(ROHAN, "2026-11-06", "2026-11-16"); setNow(2026, 11, 20);
const o1 = await both(ROHAN);
check("O1", "Rohan left 6 Nov, back 16 Nov (7-15 Nov away: 9 days), 20 Nov: the same figure, with \"(9 days away)\"", withNote(o1, 9), j(o1));
const awayDays = (u) => { let n = 0; for (let t = RealDate.UTC(2026, 10, 1); t <= RealDate.UTC(2026, 10, 30); t += 86400000) if (S.awayOn(u, new RealDate(t).toISOString().slice(0, 10))) n++; return n; };
check("O2", "9 is what store.js awayOn() reads as away for him (each date from 1 to 30 Nov asked)", awayDays(S.getUser(ROHAN)) === 9, awayDays(S.getUser(ROHAN)));
seeded(); away(ROHAN, "2026-11-06", "2026-11-08"); setNow(2026, 11, 20);
const o3 = await both(ROHAN);
check("O3", "left 6 Nov, back 8 Nov (7 Nov away): \"(1 day away)\", singular", withNote(o3, 1) && / \(1 day away\)$/.test(o3.now), j(o3));
seeded(); away(ROHAN, "2026-11-06", "2026-11-07"); setNow(2026, 11, 20);
const o4 = await both(ROHAN);
check("O4", "left 6 Nov, back 7 Nov (no day between): no note, the figure as before", o4.now === o4.pre && S.leavingPeriods(S.getUser(ROHAN)).length === 1, j(o4));
seeded(); away(ROHAN, "2026-11-06", "2026-11-06"); setNow(2026, 11, 20);
const o5 = await both(ROHAN);
check("O5", "left 6 Nov and back the same day: no note (never a negative count)", o5.now === o5.pre, j(o5));

// =================================================================
section("S. Several periods");
seeded(); away(ROHAN, "2026-11-02", "2026-11-09"); away(ROHAN, "2026-11-11", "2026-11-16"); setNow(2026, 11, 20);
const s1 = await both(ROHAN);
check("S1", "away 3-8 Nov (6 days) and 12-15 Nov (4 days): \"(10 days away)\"", withNote(s1, 10) && S.leavingPeriods(S.getUser(ROHAN)).length === 2, j(s1));
check("S2", "...10 is what awayOn() reads", awayDays(S.getUser(ROHAN)) === 10, awayDays(S.getUser(ROHAN)));
seeded(); away(ROHAN, "2026-09-30", "2026-11-02"); setNow(2026, 11, 20);
const s3 = await both(ROHAN);
check("S3", "across a month end: left 30 Sep, back 2 Nov (1 Oct-1 Nov: 32 days)", withNote(s3, 32), j(s3));
seeded(); away(ROHAN, "2026-12-30", "2027-01-04"); setNow(2027, 1, 10);
const s4 = await both(ROHAN);
check("S4", "across a year end: left 30 Dec 2026, back 4 Jan 2027 (31 Dec-3 Jan: 4 days), opened 10 Jan 2027", withNote(s4, 4), j(s4));
seeded(); away(ROHAN, "2026-11-02", "2026-11-09"); away(ROHAN, "2026-11-11", "2026-11-16"); away(ROHAN, "2026-11-17", "2026-11-18"); setNow(2026, 11, 20);
const s5 = await both(ROHAN);
check("S5", "three periods, the last with no day away: still 10", withNote(s5, 10) && S.leavingPeriods(S.getUser(ROHAN)).length === 3, j(s5));

// =================================================================
section("L. A leaver");
seeded(); away(ROHAN, "2026-11-06", "2026-11-16"); setNow(2026, 11, 19); setup(safe(() => S.deactivateUser(PRIYA, ROHAN, "2026-11-19")), "leave again"); setNow(2026, 11, 30);
const l1 = await both(ROHAN);
check("L1", "left 6 Nov, back 16 Nov, left again 19 Nov; opened 30 Nov: Tenure to 19 Nov as before, with \"(9 days away)\": the past period only, not the days since 19 Nov",
  withNote(l1, 9), j(l1));
setNow(2027, 3, 1);
const l2 = await both(ROHAN);
check("L2", "...and the same on 1 Mar 2027: the figure stopped at the last working day, the note unchanged", withNote(l2, 9) && l2.now === l1.now, j(l2));
seeded(); setNow(2026, 11, 6); setup(safe(() => S.deactivateUser(PRIYA, ROHAN, "2026-11-06")), "leave"); setNow(2026, 11, 30);
const l3 = await both(ROHAN);
check("L3", "a leaver never away before (left 6 Nov, opened 30 Nov): exactly as before, no note", l3.now === l3.pre && !/away/.test(l3.now), j(l3));

// =================================================================
section("F. The page follows Reactivate / Deactivate");
seeded(); setNow(2026, 11, 6); setup(safe(() => S.deactivateUser(PRIYA, ROHAN, "2026-11-06")), "leave"); setNow(2026, 11, 16);
setSession("admin", "Aarav Mehta", AARAV); await open("users/user-profile", `?id=${ROHAN}`);
const f0 = tenureOn();
[...d.querySelectorAll(".page-header__actions button")].find((b) => txt(b) === "Reactivate")?.click();
const f1 = tenureOn();
check("F1", "Rohan (left 6 Nov) on 16 Nov: no note while he's a leaver; Reactivate clicked: the figure runs to today with \"(9 days away)\" in place",
  !/away/.test(f0) && / \(9 days away\)$/.test(f1) && S.getUser(ROHAN).status === "active", j([f0, f1]));
await open("users/user-profile", `?id=${ROHAN}`, "./js-pre12Q");
check("F2", "...the same figure the code before shows after the reload, plus the note", f1 === `${tenureOn()} (9 days away)`, j([f1, tenureOn()]));

// =================================================================
section("U. Unreadable periods; no joining date");
function rawPeriods(id, periods, extra = {}) {
  const box = JSON.parse(mem.get("officeos:users"));
  Object.assign(box.records.find((u) => u.id === id), { leavingPeriods: periods }, extra);
  mem.set("officeos:users", JSON.stringify(box));
}
seeded(); rawPeriods(ROHAN, [{ dateOfLeaving: "banana", reactivatedOn: "16 Nov 2026" }, { dateOfLeaving: "6 Nov 2026" }, "x", null]);
const u1 = await both(ROHAN);
check("U1", "periods the store can't read (a bad date, no return, not an object): skipped, as leavingPeriods() skips them: no note", u1.now === u1.pre, j(u1));
seeded(); rawPeriods(ROHAN, [{ dateOfLeaving: "2026-11-06", reactivatedOn: "2026-11-16" }, { dateOfLeaving: "bad", reactivatedOn: "x" }]);
const u2 = await both(ROHAN);
check("U2", "a readable one beside them (kept in ISO form): counted, 9 days", withNote(u2, 9), j(u2));
seeded(); rawPeriods(ROHAN, [{ dateOfLeaving: "6 Nov 2026", reactivatedOn: "16 Nov 2026" }], { dateOfJoining: null });
const u3 = await both(ROHAN);
check("U3", "no joining date on record, with a period: the page's static Tenure text as before (nothing to note it beside)", u3.now === u3.pre && !/away/.test(u3.now), j(u3));

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12R"), jsPre = walk("./js-pre12Q");   // Round 12R (layout; was the live js): 12Q's own change set (js-pre12R = 6f3fc29)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12R", p) !== srcAt("./js-pre12Q", p));
check("X1", "exactly one js file changed, none added or removed: pages/user-profile.js (no store change)", j(changedJs) === j(["pages/user-profile.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed (user-profile.html included)", j(pagesNow) === j(walk("./html-pre12Q").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12Q", p))
  && walk("./css-pre12Q").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12Q", p)));
const [now, pre] = [srcAt("./js-pre12R", "pages/user-profile.js"), srcAt("./js-pre12Q", "pages/user-profile.js")];   // Round 12R (layout; was the live js)
const imports = (s) => s.match(/^import .*$/gm);
const code = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l)).join("\r\n");
const literals = (s) => [...new Set([...code(s).matchAll(/`[^`\r\n]*`|"[^"\r\n]*"/g)].map((m) => m[0]))].sort();
const added = literals(now).filter((x) => !literals(pre).includes(x));
check("X3", "CRLF, no final newline; the only import change adds leavingPeriods to the store.js import; the only new text is the note",
  !now.endsWith("\n") && !/(^|[^\r])\n/.test(now) && j(imports(now).map((l) => l.replace(", leavingPeriods }", " }"))) === j(imports(pre))
  && j(added) === j(['`${tenure} (${plural(away, "day", "days")} away)`']), j(added));
const fn = (s, name) => s.slice(s.indexOf(`function ${name}(`), s.indexOf("\n}", s.indexOf(`function ${name}(`)) + 2);
// The file without its first import line and without the block from `from` (a comment) to renderTenure()'s end.
const rest = (s, from) => { const t = s.replace(/^import .*$/m, ""), a = t.indexOf(from), b = t.indexOf("\n}", t.indexOf("function renderTenure(")) + 2; return a > 0 && b > a ? t.slice(0, a) + t.slice(b) : null; };
check("X4", "only renderTenure() changed and daysAway() added: tenureText() and every other function the same",
  fn(now, "tenureText") === fn(pre, "tenureText") && fn(now, "tenureText").length > 300 && fn(now, "renderTenure") !== fn(pre, "renderTenure") && now.includes("function daysAway(") && !pre.includes("function daysAway(")
  && rest(now, "// Days away in someone's") !== null && rest(now, "// Days away in someone's") === rest(pre, "// Tenure runs from"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
