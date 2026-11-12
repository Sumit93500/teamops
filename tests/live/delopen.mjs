// usage: node delopen.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 13H (round-13g-scoping.md G2 / G3 (a), G4 ruled): data/store.js deleteUser() refuses while the person has
// anything open: a pending leave request, attendance correction, expense claim or asset request, an approved claim not
// yet paid, an approved asset request not yet fulfilled. The refusal names the first (PENDING_KINDS' order: leave,
// corrections, claims, asset requests), worded by its state, with a count of the rest. ./js-pre13H, ./html-pre13H and
// ./css-pre13H are the code, pages and css before this round (office-os 2c99750).
//   G  the code before: an open request doesn't stop a delete;  R  the refusal, each kind and state;  N  what isn't
//   open;  O  the order of refusals;  D  Deactivate unchanged;  K  storage never saved;  P  demo identities;
//   S  a refused delete writes nothing;  E  no page errors;  X  scope
// Fresh storage made Mon 9 Nov 2026 09:00 by opening users/user-profile.html as Aarav (Admin); each check's own steps
// at 9 Nov 11:00 unless it says.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const PROFILE = "users/user-profile.html";

const RealDate = Date;
let NOW = new RealDate(2026, 10, 9, 9, 0, 0).getTime();
const at = (m, d, h = 11) => { NOW = new RealDate(2026, m - 1, d, h, 0, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", SNEHA = "EMP-1029", ROHAN = "EMP-1042",
  DIVYA = "EMP-1061", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";

let loads = 0, w = null, d = null, saved = {};
const allErrors = [];
async function open(page = PROFILE, query = `?id=${ROHAN}`) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) allErrors.push(e.message); });
  const html = fs.readFileSync(path.join(DIR, page), "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.HTMLElement.prototype.scrollIntoView = function () {};
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn("admin", "Aarav Mehta", AARAV);
  await import(`./js/app.js?load=${loads}`);
  for (const m of html.matchAll(/assets\/js\/pages\/([\w-]+)\.js/g)) {
    try { await import(`./js/pages/${m[1]}.js?load=${loads}`); } catch (e) { allErrors.push(`import ${m[1]}: ${e.message}`); }
  }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }
const snapshot = () => Object.fromEntries(Object.keys(w.localStorage).sort().map((k) => [k, w.localStorage.getItem(k)]));
// A record's status set straight in storage (memory: inactive-fixtures-need-storage-write): only to close the requests a
// check isn't about, so each check names one kind.
function setStatus(key, id, status) {
  const box = JSON.parse(w.localStorage.getItem(`officeos:${key}`));
  box.records.find((r) => r.id === id).status = status;
  w.localStorage.setItem(`officeos:${key}`, JSON.stringify(box));
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;

// Fresh storage, the profile page opened (it saves the stores' seeds, as in the app), then the clock at 11:00.
async function start() { fresh(); at(11, 9, 9); await open(); at(11, 9); }
await start();
const S = await import("./js/data/store.js");
const L = await import("./js/data/leave-store.js");
const A = await import("./js/data/attendance-store.js");
const E = await import("./js/data/expenses-store.js");
const R = await import("./js/data/asset-requests-store.js");
const P = await import("./js/data/payroll-store.js");
const there = (id) => S.getUser(id) !== null;
const tail = ", so they can't be deleted: decide it first, or deactivate them instead.";

// =================================================================
section("G. The code before (js-pre13H): an open request doesn't stop a delete");
const OLD = await import("./js-pre13H/data/store.js");
const g1 = OLD.deleteUser(AARAV, ROHAN);
check("G1", "Rohan, with LV-2189 and EXP-3103 pending: deleted (the orphans 10G G2d accepted)", g1.ok === true && !there(ROHAN), j(g1));

// =================================================================
section("R. The refusal: each kind, each state");
await start();
const r1 = S.deleteUser(AARAV, ROHAN);
check("R1", "Rohan: LV-2189 first (leave before claims), with EXP-3103 counted; he stays",
  !r1.ok && r1.error === `Rohan Gupta has a leave request waiting for a decision (LV-2189, and 1 more)${tail}` && there(ROHAN), j(r1));
const r2 = S.deleteUser(AARAV, ANANYA);
check("R2", "Ananya: all four kinds open; the leave named, 3 more counted",
  !r2.ok && r2.error === `Ananya Iyer has a leave request waiting for a decision (LV-2208, and 3 more)${tail}` && there(ANANYA), j(r2));
setStatus("expense-claims", "EXP-3105", "cancelled");
const r3 = S.deleteUser(AARAV, VIKRAM);
check("R3", "Vikram with only RG-102 pending: 'an attendance correction', no count",
  !r3.ok && r3.error === `Vikram Singh has an attendance correction waiting for a decision (RG-102)${tail}` && there(VIKRAM), j(r3));
const c1 = L.cancelLeave("LV-2189", ROHAN);
const r4 = S.deleteUser(AARAV, ROHAN);
check("R4", "Rohan after cancelling LV-2189 himself: 'an expense claim' (EXP-3103), no count",
  c1.ok && !r4.ok && r4.error === `Rohan Gupta has an expense claim waiting for a decision (EXP-3103)${tail}` && there(ROHAN), j([c1.ok, r4]));
const ap = E.decideExpense("EXP-3103", AARAV, "admin", "approve");
const r5 = S.deleteUser(AARAV, ROHAN);
check("R5", "EXP-3103 approved by Aarav, not yet paid: 'an approved expense claim waiting to be paid … pay it first'",
  ap.ok && ap.record.status === "approved" && !r5.ok && r5.error === "Rohan Gupta has an approved expense claim waiting to be paid (EXP-3103), so they can't be deleted: pay it first, or deactivate them instead." && there(ROHAN), j([ap.record?.status, r5]));
for (const [key, id] of [["leave-requests", "LV-2208"], ["regularizations", "RG-104"], ["expense-claims", "EXP-3104"]]) setStatus(key, id, "cancelled");
const r6 = S.deleteUser(AARAV, ANANYA);
check("R6", "Ananya with only ARQ-2 pending (Admin stage): 'an asset request'",
  !r6.ok && r6.error === `Ananya Iyer has an asset request waiting for a decision (ARQ-2)${tail}`, j(r6));
const aq = R.decideAssetRequest("ARQ-2", AARAV, "admin", "approve");
const r7 = S.deleteUser(AARAV, ANANYA);
check("R7", "ARQ-2 approved, no asset handed over yet: 'an approved asset request waiting to be fulfilled … fulfil it first'",
  aq.ok && aq.record.status === "approved" && !r7.ok && r7.error === "Ananya Iyer has an approved asset request waiting to be fulfilled (ARQ-2), so they can't be deleted: fulfil it first, or deactivate them instead." && there(ANANYA), j([aq.record?.status, r7]));

// =================================================================
section("N. What isn't open");
const pay = E.payExpense("EXP-3103", KABIR);
const ap2 = L.applyLeave(ROHAN, { type: "casual", from: "2026-12-07", to: "2026-12-07", duration: "full", reason: "Round 13H" });
const dec = ap2.ok ? [L.decideLeave(ap2.record.id, SNEHA, S.getUser(SNEHA).role, "approve"), L.decideLeave(ap2.record.id, PRIYA, "hr", "approve")] : [];
const fut = ap2.ok ? L.getRequest(ap2.record.id) : null;
const n1 = S.deleteUser(AARAV, ROHAN);
check("N1", "Rohan with EXP-3103 paid, LV-2189 cancelled, an approved leave still to come (7 Dec) and his old closed ones: deleted",
  pay.ok && fut?.status === "approved" && n1.ok === true && !there(ROHAN), j([pay.ok, fut?.status, dec.map((x) => x.ok), n1.ok ?? n1]));
setStatus("asset-requests", "ARQ-2", "fulfilled");
const n2 = S.deleteUser(AARAV, ANANYA);
check("N2", "Ananya with everything cancelled and ARQ-2 fulfilled: deleted", n2.ok === true && !there(ANANYA), j(n2));
setStatus("regularizations", "RG-102", "rejected");
const n3 = S.deleteUser(AARAV, VIKRAM);
check("N3", "Vikram with RG-102 rejected and EXP-3105 cancelled: deleted", n3.ok === true && !there(VIKRAM), j(n3));
const n4 = S.deleteUser(AARAV, DIVYA);
check("N4", "Divya (inactive, nothing open at all): deleted, as before", n4.ok === true && !there(DIVYA), j(n4));
await start();
for (const [key, id, status] of [["leave-requests", "LV-2208", "approved"], ["regularizations", "RG-104", "approved"], ["expense-claims", "EXP-3104", "paid"], ["asset-requests", "ARQ-2", "closed"]]) setStatus(key, id, status);
const n5 = S.deleteUser(AARAV, ANANYA);
check("N5", "Ananya with her leave and correction approved, her claim paid and ARQ-2 closed: deleted", n5.ok === true && !there(ANANYA), j(n5));

// =================================================================
section("O. The order of refusals: the existing ones come first");
await start();
const sp = P.proposeSalary(KABIR, ROHAN, { gross: 130000, effectiveFrom: "2026-12-01" });
const o1 = S.deleteUser(AARAV, ROHAN);
check("O1", "Rohan with a salary change waiting (12X) as well as his open requests: 12X's refusal, as before",
  sp.ok && !o1.ok && o1.error === `Rohan Gupta has a salary change waiting for a decision (${sp.record.id}), so they can't be deleted: decide or withdraw it first.`, j(o1));
const o2 = S.deleteUser(AARAV, ARJUN);
check("O2", "Arjun (a demo sign-in, open requests of his own): the demo refusal, as before",
  !o2.ok && o2.error === `${ARJUN} is a demo sign-in identity and can't be deleted.`, j(o2));

// =================================================================
section("D. Deactivate is unchanged");
await start();
const d1 = S.deactivateUser(AARAV, SNEHA, "2026-11-09");
check("D1", "Sneha deactivated (last day 9 Nov, today) with LV-2202 and RG-103 pending: ok, and both stay pending",
  d1.ok === true && L.getRequest("LV-2202").status === "pending" && A.regularizationsFor(SNEHA).find((r) => r.id === "RG-103")?.status === "pending", j(d1));
const d2 = S.deleteUser(AARAV, SNEHA);
check("D2", "deleting her once deactivated: still refused, LV-2202 named, RG-103 counted",
  !d2.ok && d2.error === `Sneha Rao has a leave request waiting for a decision (LV-2202, and 1 more)${tail}` && there(SNEHA), j(d2));

// =================================================================
section("K. Storage the stores never saved");
fresh(); at(11, 9);
const users = S.getAllUsers();   // only the users key is made
const k1keys = Object.keys(w.localStorage).sort();
const k1 = S.deleteUser(AARAV, ROHAN);
check("K1", "only the users key saved (no page has read a request store): Rohan is deleted, as strandedProblem() reads it (a kind never saved has none)",
  users.length > 0 && j(k1keys) === j(["officeos:users"]) && k1.ok === true, j([k1keys, k1.ok ?? k1]));
fresh(); at(11, 9, 9); await open();
const keys = Object.keys(w.localStorage);
check("K2", "in the app, opening Rohan's profile as an Admin saves all four request stores (the sidebar's waiting count reads them), so Delete always sees them",
  ["leave-requests", "regularizations", "expense-claims", "asset-requests"].every((k) => keys.includes(`officeos:${k}`)), j(keys.sort()));

// =================================================================
section("S, E. A refused delete writes nothing; no page errors");
await start();
const before = snapshot();
const s1 = S.deleteUser(AARAV, ANANYA);
check("S1", "Ananya's refused delete: every key and value as it was", !s1.ok && j(snapshot()) === j(before));
check("E1", "no page errors in any load", allErrors.length === 0, j(allErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const walk = (dir) => fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile())
  .map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replace(/\\/g, "/")).sort();
const changedIn = (now, then) => { const a = walk(now), b = walk(then); return { changed: a.filter((f) => b.includes(f) && fs.readFileSync(path.join(now, f), "latin1") !== fs.readFileSync(path.join(then, f), "latin1")), added: a.filter((f) => !b.includes(f)), removed: b.filter((f) => !a.includes(f)) }; };
// Round 13J (layout; was the live js): 13H's change set on 13H's result, js-pre13J (f893d25) against js-pre13H; the live
// js: delnames.mjs X1.
const jsd = changedIn(path.join(HERE, "js-pre13J"), path.join(HERE, "js-pre13H"));
check("X1", "js: exactly data/store.js changed; nothing added or removed", j(jsd) === j({ changed: ["data/store.js"], added: [], removed: [] }), j(jsd));
// Round 13N (layout, X2; was the live pages): 13H's own pages; the live pages: resetcard.mjs X2
const pages = changedIn(path.join(HERE, "html-pre13N"), path.join(HERE, "html-pre13H")), css = /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ changedIn(path.join(HERE, "css-pre13U"), path.join(HERE, "css-pre13H"));
check("X2", "no page and no css changed, added or removed", j(pages) === j({ changed: [], added: [], removed: [] }) && j(css) === j({ changed: [], added: [], removed: [] }), j([pages, css]));
// Round 13J (layout; was the live store.js): 13H's store.js as f893d25 has it; the live one: delnames.mjs X3.
const NOWJS = fs.readFileSync(path.join(HERE, "js-pre13J", "data", "store.js"), "utf8"), OLDJS = fs.readFileSync(path.join(HERE, "js-pre13H", "data", "store.js"), "utf8");
const lines = (s) => s.split("\r\n");
const gone = lines(OLDJS).filter((l) => !lines(NOWJS).includes(l));
const exportsOf = (s) => [...s.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]).sort();
check("X3", "store.js: CRLF, no final newline; no line removed or changed (only additions); the same exports",
  !/[^\r]\n/.test(NOWJS) && !NOWJS.endsWith("\n") && gone.length === 0 && j(exportsOf(NOWJS)) === j(exportsOf(OLDJS)) && lines(NOWJS).length > lines(OLDJS).length,
  j({ gone: gone.slice(0, 3), added: lines(NOWJS).length - lines(OLDJS).length }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
