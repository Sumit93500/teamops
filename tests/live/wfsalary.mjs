// usage: node wfsalary.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 13F (12Z's Z7.8, ruled in round-13e-scoping.md E4: salary changes only, payroll runs out): approval-workflows.html's
// three request stats count salary changes too. pages/approval-workflows.js reads each one as a request: sent on the
// day in its enteredAt; an Admin's own change (decidedBy == enteredBy) as auto-approved, left out of the decision time;
// a withdrawn one sent, with no decision; only for someone with salary:view, as ui/waiting.js counts them. ./js-pre13F,
// ./html-pre13F and ./css-pre13F are the code, pages and css before this round (office-os dbde089).
//   G  the code before: salary changes count nowhere;  R  the strip with every kind of salary change;  A  an Admin's
//   own change;  W  a withdrawn one;  D  decided ones;  M  the local day it was entered;  P  the gate;  S  storage
//   untouched;  E  no page errors;  X  scope
// Fresh storage created Mon 9 Nov 2026 09:00; each salary change entered at its own time (below); the page opened Fri
// 20 Nov 11:00 as Aarav (Admin) unless a check says.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const FLOWS = "access/approval-workflows.html";

const RealDate = Date;
let NOW = new RealDate(2026, 10, 9, 9, 0, 0).getTime();
const at = (m, d, h = 11, min = 0) => { NOW = new RealDate(2026, m - 1, d, h, min, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", MEERA = "EMP-1088", ROHAN = "EMP-1042", ARJUN = "EMP-1105";
const WHO = { aarav: ["admin", "Aarav Mehta", AARAV], kabir: ["fin", "Kabir Shah", KABIR] };

let loads = 0, w = null, d = null, saved = {}, jsErrors = [], navigations = [];
const allErrors = [];
// Opens the page; its script from ./js (the build) or ./js-pre13F (the code before).
async function open(who, js = "js") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = []; navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else { jsErrors.push(e.message); allErrors.push(e.message); } });
  const dom = new JSDOM(fs.readFileSync(path.join(DIR, FLOWS), "utf8"), { url: `http://localhost/office-os/pages/${FLOWS}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  const auth = await import("./js/core/auth.js");
  auth.signIn(...WHO[who]);
  if (js !== "js") (await import(`./${js}/core/auth.js`)).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  if (navigations.length) return;
  try { await import(`./${js}/pages/approval-workflows.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); allErrors.push(e.message); }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }
const snapshot = () => Object.fromEntries(Object.keys(w.localStorage).sort().map((k) => [k, w.localStorage.getItem(k)]));

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const stat = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return [txt(s.querySelector(".stat__value")), txt(s.querySelector(".stat__delta")), s.querySelector(".stat__delta").className]; };
const strip = () => ["requests", "decision", "waiting"].map(stat);

at(11, 9, 9); await open("aarav");
const P = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const ROLES = (await import("./js/config/roles.js")).ROLES;

// The seed's own figures on 20 Nov, storage made on 9 Nov (no salary change): what every check below adds to. The seed's
// requests are dated from the day storage is made: 4 sent in November, 1 in October.
const SEED = [["4", "+3 vs October", "stat__delta stat__delta--up"], ["1.1 days", "Over 9 decisions", "stat__delta"],
  ["14", "Of 14 requests waiting for a decision", "stat__delta stat__delta--down"]];

// Fresh storage made on 9 Nov 09:00, then `steps` run in time order, then the page opened on 20 Nov 11:00.
async function scenario(steps, who = "aarav", js = "js") {
  fresh(); at(11, 9, 9); await open("aarav");
  const done = [];
  for (const [when, fn] of steps) { at(...when); done.push(fn()); }
  at(11, 20); await open(who, js);
  return done;
}
const ok = (results) => results.every((r) => r?.ok === true);
// The full set (round-13e-scoping.md's fixtures, salary part, plus SP-6 waiting under 2 days):
//   SP-1 Kabir -> Priya, 9 Nov 12:00, rejected by Aarav 12 Nov 11:00 (2.96 days)
//   SP-2 Aarav's own (Rohan), 10 Nov: final at once
//   SP-3 Kabir -> Priya, 13 Nov 11:00, still waiting (7 days)
//   SP-4 Kabir -> Arjun, 13 Nov 12:00, withdrawn 14 Nov
//   SP-5 Kabir -> Arjun, 17 Nov 11:00, approved by Aarav 18 Nov 11:00 (1 day)
//   SP-6 Kabir -> Meera, 19 Nov 11:00, waiting (1 day)
const FROM = "2026-12-01";
const ALL = [
  [[11, 9, 12], () => P.proposeSalary(KABIR, PRIYA, { gross: 99000, effectiveFrom: FROM })],
  [[11, 10], () => P.proposeSalary(AARAV, ROHAN, { gross: 125000, effectiveFrom: FROM })],
  [[11, 12], () => P.decideSalaryProposal(AARAV, P.pendingSalaryProposal(PRIYA)?.id, "reject", "Not this quarter")],
  [[11, 13], () => P.proposeSalary(KABIR, PRIYA, { gross: 97000, effectiveFrom: FROM })],
  [[11, 13, 12], () => P.proposeSalary(KABIR, ARJUN, { gross: 90000, effectiveFrom: FROM })],
  [[11, 14], () => P.withdrawSalaryProposal(KABIR, P.pendingSalaryProposal(ARJUN)?.id)],
  [[11, 17], () => P.proposeSalary(KABIR, ARJUN, { gross: 91000, effectiveFrom: FROM })],
  [[11, 18], () => P.decideSalaryProposal(AARAV, P.pendingSalaryProposal(ARJUN)?.id, "approve")],
  [[11, 19], () => P.proposeSalary(KABIR, MEERA, { gross: 110000, effectiveFrom: FROM })],
];

// =================================================================
section("G. The code before (js-pre13F): salary changes count nowhere");
let done = await scenario(ALL, "aarav", "js-pre13F");
const stored = P.salaryProposals().map((p) => `${p.id} ${p.status}`);
check("G1", "all six salary changes stored (one rejected, one an Admin's own, two waiting, one withdrawn, one approved); the strip is the seed's own",
  ok(done) && j(stored) === j(["SP-6 pending", "SP-5 approved", "SP-4 withdrawn", "SP-3 pending", "SP-2 approved", "SP-1 rejected"]) && j(strip()) === j(SEED), j([stored, strip()]));

// =================================================================
section("R. The strip with every kind of salary change (20 Nov)");
await scenario([]);
check("R0", "no salary change: the seed's own figures, as before (4 / +3 vs October; 1.1 days over 9; 14 of 14)", j(strip()) === j(SEED), j(strip()));
done = await scenario(ALL);
// The six, pinned (R1-R3): P1 / P2 compare with these, not with what this run drew.
const FULL = [["10", "+9 vs October", "stat__delta stat__delta--up"], ["1.3 days", "Over 11 decisions", "stat__delta"],
  ["15", "Of 16 requests waiting for a decision", "stat__delta stat__delta--down"]];
const all = strip();
check("R1", "Requests this month: 10 (the seed's 4 + the six salary changes, entered in November), +9 vs October's 1, up",
  ok(done) && j(all[0]) === j(["10", "+9 vs October", "stat__delta stat__delta--up"]), j(all[0]));
check("R2", "Average decision time: 1.3 days over 11 (the seed's 9 + SP-1's rejection, 2.96 days, + SP-5's approval, 1 day)",
  j(all[1]) === j(["1.3 days", "Over 11 decisions", "stat__delta"]), j(all[1]));
check("R3", "Waiting over 2 days: 15 (the seed's 14 + SP-3, 7 days), of 16 waiting (+ SP-6, 1 day); down",
  j(all[2]) === j(["15", "Of 16 requests waiting for a decision", "stat__delta stat__delta--down"]), j(all[2]));

// =================================================================
section("A. An Admin's own change: sent, not a decision");
done = await scenario([ALL[1]]);
check("A1", "Aarav's own change alone: Requests 5 (+4 vs October); the decision time the seed's own (1.1 days over 9: not a 0-day decision); nothing more waits",
  ok(done) && j(strip()) === j([["5", "+4 vs October", "stat__delta stat__delta--up"], SEED[1], SEED[2]]), j(strip()));
const sp2 = P.salaryProposals()[0];
check("A2", "its stored record unchanged: status approved, decidedBy == enteredBy == Aarav, history proposed / approved (no auto-approved written)",
  sp2.status === "approved" && sp2.decidedBy === AARAV && sp2.enteredBy === AARAV && j(sp2.history.map((h) => h.decision)) === j(["proposed", "approved"]), j(sp2));

// =================================================================
section("W. A withdrawn change: sent, no decision");
done = await scenario([ALL[4], ALL[5]]);
check("W1", "SP-4 proposed and withdrawn: Requests 5 (+4 vs October); decision time and waiting the seed's own",
  ok(done) && j(strip()) === j([["5", "+4 vs October", "stat__delta stat__delta--up"], SEED[1], SEED[2]]), j(strip()));

// =================================================================
section("D. Decided by someone else: a decision like any other");
done = await scenario([ALL[0], ALL[2]]);
check("D1", "SP-1 rejected after 2.96 days: 1.3 days over 10", ok(done) && j(strip()[1]) === j(["1.3 days", "Over 10 decisions", "stat__delta"]), j(strip()[1]));
done = await scenario([ALL[6], ALL[7]]);
check("D2", "SP-5 approved after 1 day: 1.1 days over 10", ok(done) && j(strip()[1]) === j(["1.1 days", "Over 10 decisions", "stat__delta"]), j(strip()[1]));
done = await scenario([ALL[3]]);
check("D3", "SP-3 waiting 7 days: 15 waiting over 2 days, of 15; the decision time the seed's own",
  ok(done) && j(strip().slice(1)) === j([SEED[1], ["15", "Of 15 requests waiting for a decision", "stat__delta stat__delta--down"]]), j(strip()));

// =================================================================
section("M. The month is the local day it was entered");
done = await scenario([[[11, 1, 0, 30], () => P.proposeSalary(KABIR, PRIYA, { gross: 99000, effectiveFrom: FROM })]]);
const sp = P.salaryProposals()[0];
check("M1", "entered Sun 1 Nov 00:30 local (enteredAt 2026-11-01T00:30): November's, Requests 5 (+4 vs October), in every zone",
  ok(done) && sp.enteredAt === "2026-11-01T00:30" && j(strip()[0]) === j(["5", "+4 vs October", "stat__delta stat__delta--up"]), j([sp.enteredAt, strip()[0]]));
done = await scenario([[[10, 31, 23, 30], () => P.proposeSalary(KABIR, PRIYA, { gross: 99000, effectiveFrom: FROM })]]);
check("M2", "entered Sat 31 Oct 23:30 local: October's: Requests 4, +2 vs October (1 + 1)",
  ok(done) && j(strip()[0]) === j(["4", "+2 vs October", "stat__delta stat__delta--up"]), j(strip()[0]));

done = await scenario([[[10, 31, 23, 30], () => P.proposeSalary(KABIR, PRIYA, { gross: 99000, effectiveFrom: FROM })],
  [[11, 2], () => P.decideSalaryProposal(AARAV, P.pendingSalaryProposal(PRIYA)?.id, "reject", "Not this quarter")]]);
check("M3", "entered 31 Oct 23:30, rejected 2 Nov: still October's (the day it was sent, not decided): Requests 4, +2 vs October",
  ok(done) && j(strip()[0]) === j(["4", "+2 vs October", "stat__delta stat__delta--up"]), j(strip()[0]));

// =================================================================
section("P. The gate: salary:view");
// The real records can't reach it today: workflows:view isn't overridable (config/roles.js OVERRIDABLE) and an Admin's
// overrides are ignored (overridesOf()), so everyone who opens the page holds salary:view. P1 shows that on a stored
// record; P2 / P3 give Finance workflows:view in this suite's memory only, to show the gate itself.
done = await scenario(ALL);
const box = JSON.parse(w.localStorage.getItem("officeos:users"));
box.records.find((u) => u.id === AARAV).denyPermissions = ["salary:view"];
w.localStorage.setItem("officeos:users", JSON.stringify(box));
at(11, 20); await open("aarav");
check("P1", "a denyPermissions: ['salary:view'] stored on Aarav's (Admin) record is ignored: the six still count (10; 1.3 days over 11; 15 of 16)",
  ok(done) && j(strip()) === j(FULL), j(strip()));
ROLES.fin.permissions.push("workflows:view");
done = await scenario(ALL, "kabir");
check("P2", "(Finance given workflows:view, in this suite only) Kabir, who holds salary:view: the page opens and the six count",
  ok(done) && navigations.length === 0 && j(strip()) === j(FULL), j([navigations, strip()]));
const deny = S.updateUser(AARAV, KABIR, { denyPermissions: ["salary:view"] });
at(11, 20); await open("kabir");
check("P3", "the same with Kabir's salary:view denied (a real override, set by Aarav): the six count nowhere: the seed's own figures",
  deny.ok === true && navigations.length === 0 && j(strip()) === j(SEED), j([deny.ok ?? deny, strip()]));
ROLES.fin.permissions.pop();

// =================================================================
section("S, E. Storage untouched; no page errors");
done = await scenario(ALL);
const before = snapshot();
at(11, 20); await open("aarav");
check("S1", "opening the page writes nothing: every key and value as it was (no field added to a salary change)", ok(done) && j(snapshot()) === j(before));
check("E1", "no page errors in any load", allErrors.length === 0, j(allErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const walk = (dir) => fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile())
  .map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replace(/\\/g, "/")).sort();
const changedIn = (now, then) => { const a = walk(now), b = walk(then); return { changed: a.filter((f) => b.includes(f) && fs.readFileSync(path.join(now, f), "latin1") !== fs.readFileSync(path.join(then, f), "latin1")), added: a.filter((f) => !b.includes(f)), removed: b.filter((f) => !a.includes(f)) }; };
// Round 13H (layout; was the live js): 13F's change set on 13F's result, js-pre13H (2c99750) against js-pre13F; the live
// js: delopen.mjs X1.
const js = changedIn(path.join(HERE, "js-pre13H"), path.join(HERE, "js-pre13F"));
check("X1", "js: exactly pages/approval-workflows.js changed; nothing added or removed (no store file: payroll-store.js untouched)",
  j(js) === j({ changed: ["pages/approval-workflows.js"], added: [], removed: [] }), j(js));
// Round 13N (layout, X2; was the live pages): 13F's own pages; the live pages: resetcard.mjs X2
const pages = changedIn(path.join(HERE, "html-pre13N"), path.join(HERE, "html-pre13F")), css = /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ changedIn(path.join(HERE, "css-pre13U"), path.join(HERE, "css-pre13F"));
check("X2", "no page and no css changed, added or removed (the layout pins stay out of it)",
  j(pages) === j({ changed: [], added: [], removed: [] }) && j(css) === j({ changed: [], added: [], removed: [] }), j([pages, css]));
const src = (root) => fs.readFileSync(path.join(HERE, root, "pages", "approval-workflows.js"), "utf8");
const NOWJS = src("js"), OLDJS = src("js-pre13F");
const fn = (s, name) => s.slice(s.indexOf(`function ${name}(`), s.indexOf("\r\n}\r\n", s.indexOf(`function ${name}(`)));
const code = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l));
const added = code(NOWJS).filter((l) => !code(OLDJS).includes(l)), removed = code(OLDJS).filter((l) => !code(NOWJS).includes(l));
const ADDED = [
  'import { salaryProposals } from "../data/payroll-store.js";',
  "function asRequest(change) {",
  "  const own = Boolean(change.decidedBy) && change.decidedBy === change.enteredBy;",
  "  return { ...change, appliedOn: change.enteredAt.slice(0, 10),",
  '    history: own ? change.history.map((h) => (h.decision === "approved" ? { ...h, decision: "auto-approved" } : h)) : change.history };',
  '  const salary = can("salary:view") ? salaryProposals().map(asRequest) : [];',
  "  const requests = [...allRequests(), ...allRegularizations(), ...allExpenses(), ...allAssetRequests(), ...salary];",
];
check("X3", "approval-workflows.js: CRLF, no final newline; decisionDays(), monthKeys() and renderExample() byte for byte; comments aside, render()'s list line replaced and the import, asRequest() and the gated list added",
  !/[^\r]\n/.test(NOWJS) && !NOWJS.endsWith("\n") && ["decisionDays", "monthKeys", "renderExample"].every((f) => fn(NOWJS, f) === fn(OLDJS, f) && fn(NOWJS, f).length > 50)
  && j(removed) === j(["  const requests = [...allRequests(), ...allRegularizations(), ...allExpenses(), ...allAssetRequests()];"])
  && j(added) === j(ADDED),
  j({ added, removed }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
