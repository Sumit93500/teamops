// usage: node stranded.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 11Z: 11M R5 / 10G G2b. A role change, deactivation or deletion that would leave a pending request (leave,
// attendance correction, expense claim, asset request) with nobody but its requester able to decide it is refused, as
// a change that would leave a prepared payroll run with no approver already is (round 11T). ./js-pre11Z, ./html-pre11Z
// and ./css-pre11Z are the code, pages and css before this round (office-os 9a608c4).
//   R  10G G2b reproduced: RG-102 at HR, Vikram made Admin, Aarav and Priya demoted: refused at the step that strands it
//   K  each kind and each way: leave, correction, expense claim, asset request; a role change, a deactivation, a deletion
//   N  what isn't refused: a holder left; the manager stage (the next stage takes over); a request already stuck; the
//      requester's own change; once it's decided
//   O  the earlier refusals keep their place; nothing stored on a refusal
//   U  the profile's Deactivate: the refusal as a toast
//   E  what stays; X scope
// The clock is local wall time, Wed 30 Sep 2026 11:00; storage seeded then. Pending at HR: RG-102 (Vikram), RG-103
// (Sneha), RG-104 (Ananya), LV-2202 (Sneha), LV-2208 (Ananya); at Admin: ARQ-2 (Ananya); expense claims at Finance.
// Round 12A (layout; was the live js, in X1): 11Z's own change set, read from the frozen result (js-pre12A = c0d65a5).
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
const NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029", ROHAN = "EMP-1042", VIKRAM = "EMP-1088";
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

const TODAY = "2026-09-30";
// Storage fresh at 30 Sep 11:00, every collection read once (so its seed is stored, as any page would).
function fresh() { mem.clear(); S.getAllUsers(); L.allRequests(); A.allRegularizations(); E.allExpenses(); R.allAssetRequests(); }
const role = (actor, id, r) => errOf(safe(() => S.updateUser(actor, id, { role: r })));
const users = () => mem.get("officeos:users");
const STRANDED = (who, requester, kind, id, stage) => `${who} is the last person who can decide ${requester}'s ${kind} ${id}, now at the ${stage} stage: decide it first, or make sure someone else can.`;
const financeClaim = () => E.allExpenses().find((c) => c.status === "pending" && c.stage === "finance");

// =================================================================
section("R. 10G G2b, reproduced");
fresh();
const before = users();
const r = [role(AARAV, VIKRAM, "admin"), role(VIKRAM, AARAV, "emp")];
const atPriya = users();
r.push(role(VIKRAM, PRIYA, "emp"));
check("R1", "Vikram made Admin, then Aarav demoted: both allowed (Priya still holds RG-102's HR stage)", j(r.slice(0, 2)) === j(["ok", "ok"]) && before !== atPriya, j(r.slice(0, 2)));
check("R2", "demoting Priya, the last who could decide Vikram's own RG-102 (he's its requester), is refused, naming it",
  r[2] === STRANDED("Priya Nair", "Vikram Singh", "attendance correction", "RG-102", "HR"), r[2]);
check("R3", "nothing is stored by the refusal: Priya is still HR, and can decide it", users() === atPriya && S.getUser(PRIYA).role === "hr"
  && errOf(A.decideRegularization("RG-102", PRIYA, "hr", "reject", "Round 11Z")) === "ok");
check("R4", "once it's decided, the same demotion is allowed", role(VIKRAM, PRIYA, "emp") === "ok" && S.getUser(PRIYA).role === "emp");

// =================================================================
section("K. Each kind, each way");
fresh();
const k1 = [role(AARAV, SNEHA, "admin"), role(SNEHA, AARAV, "emp"), role(SNEHA, PRIYA, "emp")];
check("K1", "leave: Sneha made Admin, Aarav demoted; demoting Priya would strand Sneha's own LV-2202 at HR: refused, naming it",
  j(k1) === j(["ok", "ok", STRANDED("Priya Nair", "Sneha Rao", "leave request", "LV-2202", "HR")]), j(k1));
fresh();
const claim = financeClaim();
const k2 = role(AARAV, KABIR, "emp");
check("K2", "expense claim: demoting Kabir, the only Finance Manager, would strand a claim at the Finance stage: refused, naming it",
  Boolean(claim) && k2 === STRANDED("Kabir Shah", S.getUser(claim.userId).name, "expense claim", claim.id, "Finance") && S.getUser(KABIR).role === "fin", k2);
fresh();
const k3 = [role(AARAV, ANANYA, "admin"), role(ANANYA, AARAV, "emp")];
check("K3", "asset request: Ananya made Admin; demoting Aarav would strand her own ARQ-2 at the Admin stage: refused, naming it",
  j(k3) === j(["ok", STRANDED("Aarav Mehta", "Ananya Iyer", "asset request", "ARQ-2", "Admin")]), j(k3));
fresh();
const k4 = [role(AARAV, MEERA, "fin"), role(AARAV, KABIR, "emp"), errOf(safe(() => S.deactivateUser(AARAV, MEERA, TODAY)))];
check("K4", "a deactivation: Meera made Finance, Kabir demoted (Meera holds it); deactivating Meera would strand the claim: refused",
  j(k4) === j(["ok", "ok", STRANDED("Meera Joshi", S.getUser(claim.userId).name, "expense claim", claim.id, "Finance")]) && S.getUser(MEERA).status !== "inactive", j(k4));
fresh();
const k5 = [role(AARAV, MEERA, "hr"), role(AARAV, VIKRAM, "admin"), role(VIKRAM, AARAV, "emp"), role(VIKRAM, PRIYA, "emp"), errOf(safe(() => S.deleteUser(VIKRAM, MEERA)))];
check("K5", "a deletion: Meera made HR, Vikram Admin, Aarav and Priya demoted (Meera holds RG-102); deleting Meera would strand it: refused",
  j(k5) === j(["ok", "ok", "ok", "ok", STRANDED("Meera Joshi", "Vikram Singh", "attendance correction", "RG-102", "HR")]) && S.getUser(MEERA) !== null, j(k5));

fresh();
const k6 = [role(AARAV, "EMP-1105", "admin"), role("EMP-1105", AARAV, "emp"), errOf(safe(() => S.deactivateUser(PRIYA, SNEHA, TODAY)))];
check("K6", "the manager stage: Arjun made the only Admin; Sneha, manager of his ARQ-1, leaving would leave its manager stage to the Admins: him alone. Refused",
  j(k6) === j(["ok", "ok", STRANDED("Sneha Rao", "Arjun Kapoor", "asset request", "ARQ-1", "manager")]) && S.getUser(SNEHA).status !== "inactive", j(k6));
// =================================================================
section("N. What isn't refused");
fresh();
check("N1", "a change that leaves someone holding every stage: Vikram made Admin, Aarav demoted (Priya, Kabir and Vikram still hold them)", role(AARAV, VIKRAM, "admin") === "ok" && role(VIKRAM, AARAV, "emp") === "ok");
fresh();
const n1b = [role(AARAV, ROHAN, "admin"), role(ROHAN, AARAV, "emp")];
check("N1b", "...but Rohan made Admin can't demote Aarav: Rohan's own claim EXP-3103 waits at the Admin stage, and Aarav would be the last who can decide it",
  j(n1b) === j(["ok", STRANDED("Aarav Mehta", "Rohan Gupta", "expense claim", "EXP-3103", "Admin")]), j(n1b));
fresh();
check("N2", "the manager stage: Sneha (manager of LV-2189, ARQ-1 and a claim) can leave: the next stage takes each over",
  errOf(safe(() => S.deactivateUser(AARAV, SNEHA, TODAY))) === "ok" && S.getUser(SNEHA).status === "inactive");
fresh();
const box = JSON.parse(users()); box.records.forEach((u) => { if (u.id === VIKRAM) u.role = "admin"; if (u.id === PRIYA || u.id === AARAV) u.role = "emp"; }); mem.set("officeos:users", JSON.stringify(box));   // RG-102 already stuck, set straight in storage
check("N3", "a request already without a holder doesn't block an unrelated change (Rohan made Finance)", role(VIKRAM, ROHAN, "fin") === "ok");
fresh();
check("N4", "the requester's own change never counts: Vikram, whose RG-102 waits at HR, can be made HR or Admin and back", role(AARAV, VIKRAM, "hr") === "ok" && role(AARAV, VIKRAM, "emp") === "ok");
fresh();
check("N5", "other changes aren't checked: a phone number, a department", errOf(safe(() => S.updateUser(AARAV, PRIYA, { phone: "+91 90000 00099" }))) === "ok");

// =================================================================
section("O. Order and storage");
fresh(); role(AARAV, VIKRAM, "admin"); role(VIKRAM, AARAV, "emp");
const o1 = [role(PRIYA, PRIYA, "emp"), errOf(safe(() => S.deactivateUser(VIKRAM, PRIYA, TODAY))), role(ROHAN, PRIYA, "emp")];
check("O1", "the earlier refusals keep their place: someone without users:edit, a demo identity, before the new rule",
  o1[1] === "EMP-1003 is a demo sign-in identity and can't be deactivated." && o1[2] === "You can't edit employees." && o1[0] !== "ok", j(o1));
fresh();
const kept = [users(), mem.get("officeos:regularizations"), mem.get("officeos:expense-claims")];
role(AARAV, KABIR, "emp");
check("O2", "a refusal stores nothing (users, the requests untouched)", j([users(), mem.get("officeos:regularizations"), mem.get("officeos:expense-claims")]) === j(kept));

// =================================================================
section("U. The profile");
fresh(); role(AARAV, MEERA, "fin"); role(AARAV, KABIR, "emp");
setSession("admin", "Aarav Mehta", AARAV); await open("users/user-profile", `?id=${MEERA}`);
[...d.querySelectorAll(".page-header__actions button")].find((b) => txt(b) === "Deactivate")?.click();
d.getElementById("deactivate-modal")?.querySelector("form")?.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const toast = txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
check("U1", "Aarav deactivating Meera from her profile: the dialog closes and the refusal shows as a toast; she's still active",
  toast === STRANDED("Meera Joshi", S.getUser(claim.userId).name, "expense claim", claim.id, "Finance") && !d.getElementById("deactivate-modal") && S.getUser(MEERA).status !== "inactive", toast);

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12A"), jsPre = walk("./js-pre11Z");   // Round 12A (layout)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12A", p) !== srcAt("./js-pre11Z", p));
check("X1", "exactly one js file changed, none added or removed: data/store.js (the four stores and approval-chain.js untouched)", j(changedJs) === j(["data/store.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre11Z").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre11Z", p))
  && walk("./css-pre11Z").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre11Z", p)));
const now = srcAt("./js", "data/store.js"), pre = srcAt("./js-pre11Z", "data/store.js");
check("X3", "CRLF with no final newline; no import changed (store.js still imports no store: it reads the requests from storage)",
  !now.endsWith("\n") && !/(^|[^\r])\n/.test(now) && j(now.match(/^import .*$/gm)) === j(pre.match(/^import .*$/gm)) && !/^import .*(leave-store|attendance-store|expenses-store|asset-requests-store|approval-chain)/m.test(now));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
