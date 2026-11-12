// usage: node unpaid.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12C: round-12b-notes.md B12 (11Z Z7.6, the expense side). A role change, deactivation or deletion that would
// leave an approved expense claim with nobody but its requester able to pay it is refused, as 11Z refuses one that
// leaves a pending request undecidable. Who may pay is payExpense's rule: someone active with expenses:pay, never the
// claimant, and the final approver only when nobody else may. ./js-pre12C, ./html-pre12C and ./css-pre12C are the code,
// pages and css before this round (office-os 3ec5a73).
//   R  B12 reproduced: Aarav's own approved EXP-3107; Aarav demotes Kabir, the only Finance Manager: refused; once paid,
//      allowed
//   K  each way: a role change, a deactivation, a deletion (Meera made the only Finance Manager)
//   A  the final approver: counts when nobody else may pay (allowed), so removing them then is refused; the store agrees
//   N  what isn't refused: another payer left; an already unpayable claim; other fields
//   O  the earlier refusals keep their place; nothing stored on a refusal
//   M  after every change this suite allows, every approved claim still has a payer by the store's own waitingOn()
//   U  the profile's Deactivate: the refusal as a toast
//   E  what stays; X scope
// The clock is local wall time, Mon 2 Nov 2026 10:00; storage seeded then. Every pending claim is decided first (so
// 11Z's rule has nothing to protect), by the people who hold its stage.
// Round 12D (layout; was the live js, in X1): 12C's own change set, read from the frozen result (js-pre12D = 1179ecb).
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
const NOW = new RealDate(2026, 10, 2, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", MEERA = "EMP-1023", SNEHA = "EMP-1029", ROHAN = "EMP-1042";
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
const safe = (fn) => { try { return fn(); } catch (e) { return { ok: false, error: `threw: ${e.message}` }; } };
const errOf = (r) => (r?.ok ? "ok" : r?.error ?? "no result");

const S = await import("./js/data/store.js");
const L = await import("./js/data/leave-store.js");
const A = await import("./js/data/attendance-store.js");
const E = await import("./js/data/expenses-store.js");
const R = await import("./js/data/asset-requests-store.js");

const TODAY = "2026-11-02";
const UNPAID = (who, requester, id) => `${who} is the last person who can pay ${requester}'s expense claim ${id}: pay it first, or make sure someone else can.`;
const users = () => mem.get("officeos:users");
// M: after every change this suite allows, each approved claim that had someone the store would let pay it still has.
const mBad = [];
const payable = () => E.allExpenses().filter((x) => x.status === "approved" && E.waitingOn(x).length).map((x) => x.id);
const allowed = (label, fn) => { const had = payable(); const r = errOf(safe(fn)); if (r === "ok") { const now = payable(); had.filter((x) => !now.includes(x)).forEach((x) => mBad.push(`${label}: ${x}`)); } return r; };
const role = (actor, id, r) => allowed(`${id} -> ${r}`, () => S.updateUser(actor, id, { role: r }));
const deactivate = (actor, id) => allowed(`deactivate ${id}`, () => S.deactivateUser(actor, id, TODAY));
const remove = (actor, id) => allowed(`delete ${id}`, () => S.deleteUser(actor, id));
function setRoleRaw(id, r) { const box = JSON.parse(mem.get("officeos:users")); box.records.find((u) => u.id === id).role = r; mem.set("officeos:users", JSON.stringify(box)); }
// Storage fresh at 2 Nov 10:00, every collection read once, then every pending claim rejected by whoever holds its stage.
function fresh() {
  mem.clear(); S.getAllUsers(); L.allRequests(); A.allRegularizations(); E.allExpenses(); R.allAssetRequests();
  for (const c of E.allExpenses().filter((x) => x.status === "pending")) {
    const who = E.waitingOn(c).map((id) => S.getUser(id))[0];
    const r = who ? E.decideExpense(c.id, who.id, who.role, "reject", "Round 12C") : { ok: false, error: "nobody" };
    if (!r.ok) console.log("fresh:", c.id, errOf(r));
  }
}
const category = () => E.allExpenses()[0].category;

// =================================================================
section("R. B12, reproduced");
fresh();
const seedOk = E.getExpense("EXP-3107")?.status === "approved" && E.getExpense("EXP-3107").userId === AARAV && E.allExpenses().every((c) => c.status !== "pending");
const atStart = users();
const r1 = role(AARAV, KABIR, "emp");
check("R1", "Aarav (the only Admin) demoting Kabir (the only Finance Manager) is refused: nobody else could pay Aarav's own approved EXP-3107",
  seedOk && r1 === UNPAID("Kabir Shah", "Aarav Mehta", "EXP-3107"), j([seedOk, r1]));
check("R2", "nothing is stored by the refusal: Kabir is still Finance, and can pay it", users() === atStart && S.getUser(KABIR).role === "fin" && j(E.waitingOn(E.getExpense("EXP-3107"))) === j([KABIR]));
const paid = errOf(E.payExpense("EXP-3107", KABIR));
check("R3", "once it's paid, the same demotion is allowed", paid === "ok" && role(AARAV, KABIR, "emp") === "ok" && S.getUser(KABIR).role === "emp", j(paid));

// =================================================================
section("K. Each way");
fresh();
const k0 = [role(AARAV, MEERA, "fin"), role(AARAV, KABIR, "emp")];
check("K0", "Meera made Finance, then Kabir demoted: both allowed (Meera can pay EXP-3107)", j(k0) === j(["ok", "ok"]) && j(E.waitingOn(E.getExpense("EXP-3107"))) === j([MEERA]), j(k0));
check("K1", "a role change: demoting Meera now is refused, naming the claim", role(AARAV, MEERA, "emp") === UNPAID("Meera Joshi", "Aarav Mehta", "EXP-3107"));
check("K2", "a deactivation: deactivating Meera is refused the same way", deactivate(AARAV, MEERA) === UNPAID("Meera Joshi", "Aarav Mehta", "EXP-3107") && S.getUser(MEERA).status !== "inactive");
check("K3", "a deletion: deleting Meera is refused the same way", remove(AARAV, MEERA) === UNPAID("Meera Joshi", "Aarav Mehta", "EXP-3107") && Boolean(S.getUser(MEERA)));

// =================================================================
section("A. The final approver (payExpense's rule)");
fresh(); errOf(E.payExpense("EXP-3107", KABIR));
const sent = E.submitExpense(ROHAN, { category: category(), amount: 1200, date: TODAY, reason: "Round 12C" });
const id = sent.record?.id;
const steps = [];
for (let c = E.getExpense(id); c && c.status === "pending"; c = E.getExpense(id)) {
  const who = S.getUser(E.waitingOn(c)[0]);
  steps.push(`${who?.name} (${c.stage})`);
  if (!who || !E.decideExpense(id, who.id, who.role, "approve").ok) break;
}
const claim = E.getExpense(id);
const approver = [...(claim?.history ?? [])].reverse().find((h) => h.decision === "approved")?.byUserId;
const a1 = [role(AARAV, ROHAN, "admin"), role(ROHAN, AARAV, "hr")];
check("A1", "Rohan's claim (Sneha, then Kabir: Kabir gave the final approval); Rohan made Admin demotes Aarav: allowed, since Kabir, the approver, may pay when nobody else can",
  claim?.status === "approved" && approver === KABIR && j(a1) === j(["ok", "ok"]) && j(E.waitingOn(E.getExpense(id))) === j([KABIR]), j([steps, approver, a1]));
check("A2", "…so demoting Kabir then is refused, naming Rohan's claim", role(ROHAN, KABIR, "emp") === UNPAID("Kabir Shah", "Rohan Gupta", id));
const a3 = E.payExpense(id, KABIR);
check("A3", "the store agrees: Kabir pays it, as the approver nobody else could replace", a3.ok === true && E.getExpense(id).status === "paid", errOf(a3));
fresh(); errOf(E.payExpense("EXP-3107", KABIR));
const sent2 = E.submitExpense(ROHAN, { category: category(), amount: 1200, date: TODAY, reason: "Round 12C" });
for (let c = E.getExpense(sent2.record.id); c && c.status === "pending"; c = E.getExpense(sent2.record.id)) { const who = S.getUser(E.waitingOn(c)[0]); if (!who || !E.decideExpense(c.id, who.id, who.role, "approve").ok) break; }
check("A4", "while someone else may pay (Aarav), the approver doesn't count: demoting Aarav's only fellow payer, Kabir, is allowed (Aarav still can)",
  role(AARAV, KABIR, "emp") === "ok" && j(E.waitingOn(E.getExpense(sent2.record.id))) === j([AARAV]));

// =================================================================
section("N. What isn't refused");
fresh();
check("N1", "another payer left: Meera made Finance, Kabir demoted (K0)", j([role(AARAV, MEERA, "fin"), role(AARAV, KABIR, "emp")]) === j(["ok", "ok"]));
fresh(); setRoleRaw(KABIR, "emp");   // EXP-3107 already has nobody to pay it (as data from before 12C could)
const n2 = role(AARAV, PRIYA, "emp");
check("N2", "a claim already without a payer doesn't block unrelated changes (Priya demoted)", n2 === "ok", n2);
fresh();
check("N3", "other fields are never checked (Kabir's phone, with EXP-3107 his to pay)", errOf(safe(() => S.updateUser(AARAV, KABIR, { phone: "+91 90000 00000" }))) === "ok");

// =================================================================
section("O. Order and storage");
fresh();
const o1 = [errOf(safe(() => S.deactivateUser(AARAV, KABIR, TODAY))), role(KABIR, AARAV, "emp")];
check("O1", "the earlier refusals keep their place: Kabir is a demo identity; Aarav is the last Admin",
  !o1[0].includes("last person who can pay") && !o1[1].includes("last person who can pay") && o1.every((x) => x !== "ok"), j(o1));
fresh(); const o2 = users(); role(AARAV, KABIR, "emp"); deactivate(AARAV, KABIR); remove(AARAV, KABIR);
check("O2", "a refusal stores nothing", users() === o2);

// =================================================================
section("M. The store agrees");
check("M1", "after every change this suite allowed, every approved claim still had a payer by expenses-store's own waitingOn()", mBad.length === 0, j(mBad));

// =================================================================
section("U. The profile");
fresh(); role(AARAV, MEERA, "fin"); role(AARAV, KABIR, "emp");
setSession("admin", "Aarav Mehta", AARAV); await open("users/user-profile", `?id=${MEERA}`);
[...d.querySelectorAll(".page-header__actions button")].find((b) => txt(b) === "Deactivate")?.click();
d.getElementById("deactivate-modal")?.querySelector("form")?.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const toast = txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
check("U1", "Aarav deactivating Meera from her profile: the dialog closes and the refusal shows as a toast; she's still active",
  toast === UNPAID("Meera Joshi", "Aarav Mehta", "EXP-3107") && !d.getElementById("deactivate-modal") && S.getUser(MEERA).status !== "inactive", toast);

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12D"), jsPre = walk("./js-pre12C");   // Round 12D (layout)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12D", p) !== srcAt("./js-pre12C", p));
check("X1", "exactly one js file changed, none added or removed: data/store.js (expenses-store.js untouched)", j(changedJs) === j(["data/store.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12C").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12C", p))
  && walk("./css-pre12C").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12C", p)));
const now = srcAt("./js", "data/store.js"), pre = srcAt("./js-pre12C", "data/store.js");
check("X3", "CRLF with no final newline; no import changed (store.js still imports no store: it reads the claims from storage)",
  !now.endsWith("\n") && !/(^|[^\r])\n/.test(now) && j(now.match(/^import .*$/gm)) === j(pre.match(/^import .*$/gm)) && !/^import .*expenses-store/m.test(now));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
