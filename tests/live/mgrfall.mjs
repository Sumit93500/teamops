// usage: node mgrfall.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 10T: the manager stage's fallback (10S S5, the 5B "stuck claims" gap). ./js-pre10T, ./html-pre10T and
// ./css-pre10T are the code, pages and css before this round (office-os 39c7334).
// If the stored manager of a pending asset request / expense claim can no longer decide it (inactive, or not on the
// list), whoever holds the NEXT stage may decide the manager stage instead (an Admin for asset requests, Finance for
// claims), worked out at decide time. While the stored manager is active, they alone decide it.
//   A  asset requests: ARQ-1 (Arjun's laptop, waiting on his manager Sneha), the four shapes and the edges
//   E  expense claims: EXP-3106 (Arjun's ₹1,850 cab, waiting on Sneha), the same shapes, Finance in place of Admin
//   C  scope: with every manager able to decide, both stores answer exactly as before 10T (side by side, every seeded
//      request / claim and every user); no manager on file still skips; the Admin stage (9X / 9Y) and leave's own
//      fallback (approval-chain.js) as before
//   P  the pages: the approvals inbox lists the stuck items for the fallback holders; my-requests names them
//   X  scope: exactly asset-requests-store.js and expenses-store.js, only 10T's lines
// A fixed clock: Fri 2 Oct 2026 10:00 local time.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
const NOW = new RealDate(2026, 9, 2, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", SNEHA = "EMP-1029", ROHAN = "EMP-1042", ARJUN = "EMP-1105";
const WHO = { aarav: ["admin", "Aarav Mehta", AARAV], kabir: ["fin", "Kabir Shah", KABIR], priya: ["hr", "Priya Nair", PRIYA], arjun: ["emp", "Arjun Kapoor", ARJUN] };

let loads = 0, w = null, d = null, jsErrors = [];
const allJsErrors = [];
async function open(page, script, who) {
  const cur = globalThis.localStorage;
  const saved = Object.fromEntries(Array.from({ length: cur.length }, (_, i) => cur.key(i)).map((k) => [k, cur.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = [];
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) { jsErrors.push(e.message); allJsErrors.push(`${page}: ${e.message}`); } });
  const dom = new JSDOM(fs.readFileSync(`${DIR}/${page}.html`, "utf8"), { url: `http://localhost/office-os/pages/${page}.html`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.confirm = () => true;
  w.HTMLElement.prototype.scrollIntoView = function () {};
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); allJsErrors.push(`${page} import: ${e.message}`); }
}
const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const res = (r) => (r?.ok ? [true] : [false, r?.error ?? null]);

const Q = await import("./js/data/asset-requests-store.js");
const X = await import("./js/data/expenses-store.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const LV = await import("./js/data/leave-store.js");
// The stores before 10T: a second copy, on the same storage.
const Q0 = await import("./js-pre10T/data/asset-requests-store.js");
const X0 = await import("./js-pre10T/data/expenses-store.js");

function fresh() {
  globalThis.localStorage = MEM; mem.clear(); if (w) w.localStorage.clear();
  Q.allAssetRequests(); X.allExpenses(); S.getAllUsers(); LV.allRequests();
}
const roleOf = (id) => S.getUser(id)?.role;
const arq = (id) => Q.getAssetRequest(id) ?? {};
const exp = (id) => X.getExpense(id) ?? {};
const stOf = (r) => `${r.status}/${r.stage}`;
const decideQ = (id, who, decision = "approve", note = "") => Q.decideAssetRequest(id, who, roleOf(who), decision, note);
const decideX = (id, who, decision = "approve", note = "") => X.decideExpense(id, who, roleOf(who), decision, note);
const deactivate = (id) => S.deactivateUser(USER_ACTOR("admin", id), id, LEAVING_11Y());
// Round 13H: deleteUser() refuses while the person has anything open (round-13g-scoping.md G3 (a)). The person's own
// requests are settled in storage first (pending -> cancelled; an approved claim -> paid, an approved asset request ->
// closed), so this keeps testing what it did; the refusal itself is delopen.mjs.
const SETTLED = [["leave-requests", { pending: "cancelled" }], ["regularizations", { pending: "cancelled" }],
  ["expense-claims", { pending: "cancelled", approved: "paid" }], ["asset-requests", { pending: "cancelled", approved: "closed" }]];
const settleOwn = (who) => {
  for (const [key, done] of SETTLED) {
    const box = JSON.parse(localStorage.getItem(`officeos:${key}`) ?? "null");
    if (!box) continue;
    box.records.filter((r) => (who === null || r.userId === who) && done[r.status]).forEach((r) => { r.status = done[r.status]; });
    localStorage.setItem(`officeos:${key}`, JSON.stringify(box));
  }
};
// Round 13H (behavior; was the delete alone): the person's own open requests settled first (Sneha's LV-2202 / RG-103).
const remove = (id) => (settleOwn(id), S.deleteUser(USER_ACTOR("admin", id), id));
const OLD_Q = "Only the requester's manager can decide this request at the manager stage.";
const OLD_X = "Only the claimant's manager can decide this claim at the manager stage.";
const NEW_Q = "Only an Admin can decide this request now: its manager can no longer decide it.";
const NEW_X = "Only Finance can decide this claim now: its manager can no longer decide it.";

// =================================================================
section("A. Asset requests: ARQ-1, Arjun's laptop, waiting on his manager Sneha");
fresh();
const a0 = arq("ARQ-1");
check("A0", "the seed: ARQ-1 pending at the manager stage, managerId Sneha (EMP-1029), waiting on her alone",
  stOf(a0) === "pending/manager" && a0.managerId === SNEHA && j(Q.waitingOn(a0)) === j([SNEHA]), j([stOf(a0), a0.managerId, Q.waitingOn(a0)]));

// A1: deactivated -> an Admin decides (before 10T: nobody)
fresh();
deactivate(SNEHA);
const w1 = Q.waitingOn(arq("ARQ-1")), w1old = Q0.waitingOn(Q0.getAssetRequest("ARQ-1"));
const pf1 = Q.pendingFor(AARAV, "admin").map((r) => r.id);
const pri1 = decideQ("ARQ-1", PRIYA), kab1 = decideQ("ARQ-1", KABIR), arj1 = decideQ("ARQ-1", ARJUN);
check("A1", "Sneha deactivated: ARQ-1 now waits on the active Admins (Aarav) and is in his inbox (before 10T: on nobody); HR, Finance and Arjun himself are refused, HR and Finance with the new reason",
  j(w1) === j([AARAV]) && j(w1old) === "[]" && pf1.includes("ARQ-1") && pri1.error === NEW_Q && kab1.error === NEW_Q && !arj1.ok,
  j({ w1, w1old, pf1, pri1: pri1.error, kab1: kab1.error, arj1: arj1.error }));
const ap1 = decideQ("ARQ-1", AARAV);
const h1 = arq("ARQ-1").history.at(-1);
check("A2", "…Aarav approves the manager stage: ok, recorded as the manager stage's approval by Aarav, and ARQ-1 moves on to the Admin stage",
  ap1.ok && h1.stage === "manager" && h1.byUserId === AARAV && h1.decision === "approved" && stOf(arq("ARQ-1")) === "pending/admin", j([res(ap1), h1, stOf(arq("ARQ-1"))]));
const ap2 = decideQ("ARQ-1", AARAV);
check("A3", "…and he decides the Admin stage too (two decisions, as HR does on leave's fallback): approved, waiting for an asset", ap2.ok && stOf(arq("ARQ-1")) === "approved/fulfilment", j([res(ap2), stOf(arq("ARQ-1"))]));

// A4: deleted -> an Admin decides (before 10T: no recovery at all)
fresh();
const del = remove(SNEHA);
const w4 = Q.waitingOn(arq("ARQ-1")), w4old = Q0.waitingOn(Q0.getAssetRequest("ARQ-1"));
const old4 = Q0.decideAssetRequest("ARQ-1", AARAV, "admin", "approve");
fresh(); remove(SNEHA);
const ap4 = decideQ("ARQ-1", AARAV);
check("A4", "Sneha deleted (no reactivation possible): ARQ-1 waits on Aarav and he decides it (before 10T: waitingOn [] and refused, with no way back but Arjun's cancel)",
  del.ok && !S.getUser(SNEHA) && j(w4) === j([AARAV]) && j(w4old) === "[]" && old4.error === OLD_Q && ap4.ok && stOf(arq("ARQ-1")) === "pending/admin", j({ w4, w4old, old4: old4.error, ap4: res(ap4) }));

// A5: role changed, still active -> Sneha still decides, not an Admin
fresh();
const rc = S.updateUser(USER_ACTOR("admin", SNEHA), SNEHA, { role: "fin" });
const w5 = Q.waitingOn(arq("ARQ-1"));
const aar5 = decideQ("ARQ-1", AARAV);
const sne5 = decideQ("ARQ-1", SNEHA);
check("A5", "Sneha's role changed to Finance but still active: she alone holds the stage (Aarav refused with the old reason), and her approval moves it on",
  rc.ok && j(w5) === j([SNEHA]) && aar5.error === OLD_Q && sne5.ok && stOf(arq("ARQ-1")) === "pending/admin", j({ w5, aar5: aar5.error, sne5: res(sne5) }));

// A6: Arjun's manager reassigned to Priya while Sneha stays active -> Sneha still decides; Priya can't jump the queue
fresh();
const re = S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { reportingManagerId: PRIYA });
const w6 = Q.waitingOn(arq("ARQ-1"));
const pri6 = decideQ("ARQ-1", PRIYA), aar6 = decideQ("ARQ-1", AARAV);
const sne6 = decideQ("ARQ-1", SNEHA);
check("A6", "Arjun now reports to Priya, Sneha still active: ARQ-1 still waits on Sneha (its stored managerId), Priya and Aarav are refused, Sneha decides",
  re.ok && LV.managerFor(ARJUN) === PRIYA && arq("ARQ-1").managerId === SNEHA && j(w6) === j([SNEHA]) && pri6.error === OLD_Q && aar6.error === OLD_Q && sne6.ok,
  j({ mgr: LV.managerFor(ARJUN), w6, pri6: pri6.error, aar6: aar6.error, sne6: res(sne6) }));

// A7: reactivating gives the stage back
fresh();
deactivate(SNEHA);
const before7 = Q.waitingOn(arq("ARQ-1"));
const ra = S.reactivateUser(USER_ACTOR("admin", SNEHA), SNEHA);
const w7 = Q.waitingOn(arq("ARQ-1"));
const aar7 = decideQ("ARQ-1", AARAV);
const sne7 = decideQ("ARQ-1", SNEHA);
check("A7", "Sneha deactivated (Aarav holds it), then reactivated: the stage is hers again, Aarav refused with the old reason, Sneha decides (nothing stored changed in between)",
  j(before7) === j([AARAV]) && ra.ok && j(w7) === j([SNEHA]) && aar7.error === OLD_Q && sne7.ok, j({ before7, w7, aar7: aar7.error, sne7: res(sne7) }));

// A8: reject through the fallback, and the requester can still cancel
fresh(); deactivate(SNEHA);
const rjn = decideQ("ARQ-1", AARAV, "reject");
const rj = decideQ("ARQ-1", AARAV, "reject", "Laptops are frozen this quarter");
check("A8", "the fallback holder can also reject (a note still required): rejected/done", rjn.error === "Add a note saying why the request is rejected." && rj.ok && stOf(arq("ARQ-1")) === "rejected/done", j([rjn.error, res(rj)]));
fresh(); deactivate(SNEHA);
check("A9", "…and Arjun can still cancel it himself, as before", Q.cancelAssetRequest("ARQ-1", ARJUN).ok && stOf(arq("ARQ-1")) === "cancelled/done");

// A10: only an ACTIVE Admin gains it; the requester never does
fresh();
S.updateUser(USER_ACTOR("admin", ROHAN), ROHAN, { role: "admin" });
deactivate(ROHAN); deactivate(SNEHA);
const w10 = Q.waitingOn(arq("ARQ-1"));
const roh10 = decideQ("ARQ-1", ROHAN);
check("A10", "an inactive Admin (Rohan, made Admin then deactivated) doesn't gain the fallback: waitingOn is Aarav alone, Rohan refused", j(w10) === j([AARAV]) && !roh10.ok, j([w10, roh10.error]));
fresh();
S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { role: "admin" });
deactivate(SNEHA);
const w11 = Q.waitingOn(arq("ARQ-1"));
const arj11 = Q.decideAssetRequest("ARQ-1", ARJUN, "admin", "approve");
check("A11", "the requester made an Admin after sending it: still never decides his own request through the fallback (waitingOn Aarav alone)", j(w11) === j([AARAV]) && arj11.error === "You can't decide your own asset request.", j([w11, arj11.error]));

// =================================================================
section("E. Expense claims: EXP-3106, Arjun's ₹1,850 cab, waiting on Sneha (Finance in place of Admin)");
fresh();
const e0 = exp("EXP-3106");
check("E0", "the seed: EXP-3106 pending at the manager stage, managerId Sneha, waiting on her alone",
  stOf(e0) === "pending/manager" && e0.managerId === SNEHA && j(X.waitingOn(e0)) === j([SNEHA]), j([stOf(e0), e0.managerId, X.waitingOn(e0)]));

fresh();
deactivate(SNEHA);
const x1 = X.waitingOn(exp("EXP-3106")), x1old = X0.waitingOn(X0.getExpense("EXP-3106"));
const xpf = X.pendingFor(KABIR, "fin").map((c) => c.id);
const aarX = decideX("EXP-3106", AARAV), priX = decideX("EXP-3106", PRIYA);
check("E1", "Sneha deactivated: EXP-3106 now waits on Finance (Kabir) and is in his inbox (before 10T: on nobody); an Admin is NOT the fallback here (Aarav refused), nor HR, both with the new reason",
  j(x1) === j([KABIR]) && j(x1old) === "[]" && xpf.includes("EXP-3106") && aarX.error === NEW_X && priX.error === NEW_X, j({ x1, x1old, xpf, aarX: aarX.error, priX: priX.error }));
const kx = decideX("EXP-3106", KABIR);
const hx = exp("EXP-3106").history.at(-1);
check("E2", "…Kabir approves the manager stage: recorded as the manager stage's approval by Kabir; the claim moves on to the Finance stage",
  kx.ok && hx.stage === "manager" && hx.byUserId === KABIR && hx.decision === "approved" && stOf(exp("EXP-3106")) === "pending/finance", j([res(kx), hx, stOf(exp("EXP-3106"))]));
const kx2 = decideX("EXP-3106", KABIR);
check("E3", "…and the Finance stage too: approved, waiting for payment (₹1,850: no Admin stage)", kx2.ok && stOf(exp("EXP-3106")) === "approved/payment", j([res(kx2), stOf(exp("EXP-3106"))]));

fresh();
remove(SNEHA);
const x4 = X.waitingOn(exp("EXP-3106")), x4old = X0.waitingOn(X0.getExpense("EXP-3106"));
const oldx4 = X0.decideExpense("EXP-3106", KABIR, "fin", "approve");
fresh(); remove(SNEHA);
const kx4 = decideX("EXP-3106", KABIR);
check("E4", "Sneha deleted: EXP-3106 waits on Kabir and he decides it (before 10T: waitingOn [] and refused)",
  j(x4) === j([KABIR]) && j(x4old) === "[]" && oldx4.error === OLD_X && kx4.ok && stOf(exp("EXP-3106")) === "pending/finance", j({ x4, x4old, oldx4: oldx4.error, kx4: res(kx4) }));

fresh();
S.updateUser(USER_ACTOR("admin", SNEHA), SNEHA, { role: "hr" });
const x5 = X.waitingOn(exp("EXP-3106"));
const kx5 = decideX("EXP-3106", KABIR), sx5 = decideX("EXP-3106", SNEHA);
check("E5", "Sneha's role changed to HR but still active: she alone holds the stage (Kabir refused with the old reason) and decides it",
  j(x5) === j([SNEHA]) && kx5.error === OLD_X && sx5.ok && stOf(exp("EXP-3106")) === "pending/finance", j({ x5, kx5: kx5.error, sx5: res(sx5) }));

fresh();
S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { reportingManagerId: PRIYA });
const x6 = X.waitingOn(exp("EXP-3106"));
const px6 = decideX("EXP-3106", PRIYA), kx6 = decideX("EXP-3106", KABIR), sx6 = decideX("EXP-3106", SNEHA);
check("E6", "Arjun now reports to Priya, Sneha still active: still Sneha's (Priya and Kabir refused), Sneha decides",
  exp("EXP-3106").managerId === SNEHA && j(x6) === j([SNEHA]) && px6.error === OLD_X && kx6.error === OLD_X && sx6.ok, j({ x6, px6: px6.error, kx6: kx6.error, sx6: res(sx6) }));

fresh();
deactivate(SNEHA);
const b7 = X.waitingOn(exp("EXP-3106"));
S.reactivateUser(USER_ACTOR("admin", SNEHA), SNEHA);
const x7 = X.waitingOn(exp("EXP-3106"));
const kx7 = decideX("EXP-3106", KABIR), sx7 = decideX("EXP-3106", SNEHA);
check("E7", "deactivated (Kabir holds it), then reactivated: Sneha's again, Kabir refused with the old reason, Sneha decides",
  j(b7) === j([KABIR]) && j(x7) === j([SNEHA]) && kx7.error === OLD_X && sx7.ok, j({ b7, x7, kx7: kx7.error, sx7: res(sx7) }));

fresh(); deactivate(SNEHA);
const kr = decideX("EXP-3106", KABIR, "reject", "No receipt for the return trip");
check("E8", "the fallback holder can reject (with a note): rejected/done; and on a fresh copy Arjun can still cancel",
  kr.ok && stOf(exp("EXP-3106")) === "rejected/done" && (fresh(), deactivate(SNEHA), X.cancelExpense("EXP-3106", ARJUN).ok), j(res(kr)));

// E9: no active Finance: the fallback has nobody (the same limit leave's has with no HR stage holder; flagged, not fixed)
fresh();
// Round 11Z (fixture, flagged; was the store's demotion): nobody active in Finance is a state the store now refuses to
// make (the claims at the Finance stage would have nobody), and then deactivating Sneha, the claim's manager, is refused
// too (she'd be the last who can decide it). E9 is about how that state reads, so both are set straight in storage.
setRoleRaw(KABIR, "emp");
setRoleRaw(SNEHA, "inactive", "status");
const x9 = X.waitingOn(exp("EXP-3106"));
check("E9", "with nobody active in Finance (Kabir made an Employee), the fallback has no holder: waitingOn [] (Finance, not 'whoever is next'; flagged in the notes)", j(x9) === "[]", j(x9));

// =================================================================
section("C. Scope: nothing else moved");
// C1: with every manager able to decide, both stores answer exactly as before, for every seeded item and every user.
function same(label, scenario) {
  fresh(); scenario();
  const users = S.getAllUsers();
  const qs = Q.allAssetRequests(), xs = X.allExpenses();
  const a = j([qs.map((r) => Q.waitingOn(r)), users.map((u) => Q.pendingFor(u.id, u.role).map((r) => r.id)), users.map((u) => Q.previewRoute(u.id)),
    xs.map((c) => X.waitingOn(c)), users.map((u) => X.pendingFor(u.id, u.role).map((c) => c.id)), users.map((u) => [X.previewRoute(u.id, 1000), X.previewRoute(u.id, 60000)])]);
  const b = j([qs.map((r) => Q0.waitingOn(r)), users.map((u) => Q0.pendingFor(u.id, u.role).map((r) => r.id)), users.map((u) => Q0.previewRoute(u.id)),
    xs.map((c) => X0.waitingOn(c)), users.map((u) => X0.pendingFor(u.id, u.role).map((c) => c.id)), users.map((u) => [X0.previewRoute(u.id, 1000), X0.previewRoute(u.id, 60000)])]);
  return [label, a === b];
}
const c1 = [same("seed", () => {}), same("Sneha role fin", () => S.updateUser(USER_ACTOR("admin", SNEHA), SNEHA, { role: "fin" })),
  same("Arjun reassigned", () => S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { reportingManagerId: PRIYA })),
  same("Ananya deactivated (no manager stage pending)", () => deactivate(ANANYA)), same("Rohan made Admin", () => S.updateUser(USER_ACTOR("admin", ROHAN), ROHAN, { role: "admin" }))];
check("C1", "while every stored manager can decide: waitingOn, pendingFor (every user) and previewRoute (every user; claims at ₹1,000 and ₹60,000) are exactly the pre-10T stores' answers, in five set-ups", c1.every(([, ok]) => ok), j(c1));
// C2: decisions through both copies give the same results, step by step, on the seed
fresh();
const steps = [["ARQ-1", SNEHA], ["ARQ-1", AARAV], ["ARQ-2", PRIYA], ["ARQ-2", AARAV]];
const r2 = steps.map(([id, who]) => res(decideQ(id, who)));
fresh();
const r2old = steps.map(([id, who]) => res(Q0.decideAssetRequest(id, who, roleOf(who), "approve")));
fresh();
const xsteps = [["EXP-3106", SNEHA], ["EXP-3106", KABIR], ["EXP-3104", PRIYA], ["EXP-3104", KABIR], ["EXP-3103", KABIR], ["EXP-3103", AARAV]];
const x2 = xsteps.map(([id, who]) => res(decideX(id, who)));
fresh();
const x2old = xsteps.map(([id, who]) => res(X0.decideExpense(id, who, roleOf(who), "approve")));
check("C2", "the seed's decisions, step by step (manager, Admin and Finance stages, right and wrong deciders), give exactly the pre-10T results", j(r2) === j(r2old) && j(x2) === j(x2old), j([r2, x2]));
// C3: no manager on file: still skipped at send time
fresh();
deactivate(SNEHA);
const n3 = Q.submitAssetRequest(ARJUN, { assetType: "monitor", reason: "second screen" });
const n3x = X.submitExpense(ARJUN, { category: "travel", amount: 400, date: "2026-10-01", reason: "cab", receipt: "" });
check("C3", "a request / claim sent after the manager has gone: no manager on file, the manager stage skipped (Admin / Finance next), as before",
  n3.ok && n3.record.managerId === null && stOf(n3.record) === "pending/admin" && n3x.ok && n3x.record.managerId === null && stOf(n3x.record) === "pending/finance",
  j([n3.ok && [n3.record.managerId, stOf(n3.record)], n3x.ok ? [n3x.record.managerId, stOf(n3x.record)] : n3x.error]));
fresh();
check("C4", "ARQ-2 (no manager, at the Admin stage) and EXP-3104 (no manager, at Finance): waiting on the same people as before",
  j(Q.waitingOn(arq("ARQ-2"))) === j(Q0.waitingOn(Q0.getAssetRequest("ARQ-2"))) && j(X.waitingOn(exp("EXP-3104"))) === j(X0.waitingOn(X0.getExpense("EXP-3104"))), j([Q.waitingOn(arq("ARQ-2")), X.waitingOn(exp("EXP-3104"))]));
// C5: the Admin stage (9X / 9Y) as before
fresh();
// (Aarav is a protected demo identity, so deactivating him is refused before 9Y's rule is reached: Rohan is made the only
// Admin instead, and it's his deactivation that 9Y must refuse.)
S.updateUser(USER_ACTOR("admin", ROHAN), ROHAN, { role: "admin" });
const demote = S.updateUser(USER_ACTOR("admin", AARAV), AARAV, { role: "hr" });
// Round 11Z (fixture, flagged; was the demotion saved): it's refused now: with Rohan the only other Admin, his own EXP-3103
// at the Admin stage would have nobody to decide it. C5 is about that very state, so it's set straight in storage.
// Round 11Z (fixture): set a role straight in storage, for a state the store now refuses to create (a pending request
// with nobody but its requester able to decide it: strandedProblem in store.js); data from before 11Z could hold it.
function setRoleRaw(id, role, field = "role") { const box = JSON.parse(localStorage.getItem("officeos:users")); box.records.find((u) => u.id === id)[field] = role; localStorage.setItem("officeos:users", JSON.stringify(box)); }
setRoleRaw(AARAV, "hr");
const c5 = [res(decideQ("ARQ-2", PRIYA)), res(decideX("EXP-3103", KABIR)), res(S.deactivateUser(USER_ACTOR("admin", ROHAN), ROHAN, LEAVING_11Y()))];
check("C5", "the Admin stages: HR refused on ARQ-2, Finance refused on EXP-3103 (their old reasons); with Rohan the only Admin, deactivating him is still refused (9Y, store.js untouched)",
  demote.ok === false /* Round 11Z: refused, as above */ && S.getUser(AARAV).role === "hr" && c5[0][1] === "Only an Admin can decide this request at the Admin stage." && c5[1][1] === "Only an Admin can decide this claim at the Admin stage." && !c5[2][0] && S.getUser(ROHAN).status !== "inactive", j([res(demote), c5]));
// C6: leave's own fallback, unchanged
fresh();
const lvSent = LV.applyLeave(ARJUN, { type: "casual", from: "2026-10-12", to: "2026-10-12", reason: "Errand" });
const lv = lvSent.ok && lvSent.record.stage === "manager" && lvSent.record.managerId === SNEHA ? lvSent.record : null;
deactivate(SNEHA);
const lvd = lv ? LV.decideLeave(lv.id, PRIYA, "hr", "approve") : null;
check("C6", "leave's fallback (approval-chain.js) as before: a leave request waiting on Sneha is decided by HR once she's deactivated", Boolean(lv) && lvd?.ok, j([lv?.id, res(lvd)]));

// =================================================================
section("P. The pages");
fresh(); deactivate(SNEHA);
await open("requests/approvals-inbox", "approvals-inbox", "aarav");
const pA = Boolean(d.querySelector('tr[data-request-id="ARQ-1"]')), pAx = Boolean(d.querySelector('tr[data-claim-id="EXP-3106"]'));
const pAerr = [...jsErrors];
await open("requests/approvals-inbox", "approvals-inbox", "kabir");
const pK = Boolean(d.querySelector('tr[data-claim-id="EXP-3106"]')), pKq = Boolean(d.querySelector('tr[data-request-id="ARQ-1"]'));
const pKerr = [...jsErrors];
check("P1", "Sneha deactivated: the approvals inbox lists ARQ-1 for Aarav (not EXP-3106) and EXP-3106 for Kabir (not ARQ-1), with no JS errors",
  pA && !pAx && pK && !pKq && pAerr.length === 0 && pKerr.length === 0, j({ pA, pAx, pK, pKq, errs: [...pAerr, ...pKerr] }));
fresh();
await open("requests/approvals-inbox", "approvals-inbox", "aarav");
const pA0 = Boolean(d.querySelector('tr[data-request-id="ARQ-1"]'));
await open("requests/approvals-inbox", "approvals-inbox", "kabir");
const pK0 = Boolean(d.querySelector('tr[data-claim-id="EXP-3106"]'));
check("P2", "control, Sneha active: neither inbox lists them (they're Sneha's)", !pA0 && !pK0, j([pA0, pK0]));
fresh(); deactivate(SNEHA);
await open("requests/my-requests", "my-requests", "arjun");
const rowOf = (needle) => [...d.querySelectorAll("tr")].map((tr) => tr.textContent.replace(/\s+/g, " ").trim()).find((t) => t.includes(needle)) ?? "";
const rq = rowOf("Laptop"), rx = rowOf("1,850");
check("P3", "my-requests (Arjun): the laptop request is with Aarav Mehta and the ₹1,850 claim with Kabir Shah, not 'Nobody yet'; no JS errors",
  rq.includes("Aarav Mehta") && !rq.includes("Nobody yet") && rx.includes("Kabir Shah") && !rx.includes("Nobody yet") && jsErrors.length === 0, j({ rq, rx, errs: jsErrors }));
fresh(); deactivate(SNEHA);
await open("finance/expenses", "expenses", "aarav");
const cell = [...d.querySelectorAll("tr")].find((tr) => tr.dataset.claimId === "EXP-3106")?.lastElementChild?.textContent.replace(/\s+/g, " ").trim() ?? null;
check("P5", "known, not fixed here (pages are out of 10T's scope): expenses.html shows others the fallback holder as 'Waiting for the manager, Kabir Shah' (flagged in the notes)",
  cell === "Waiting for the manager, Kabir Shah", j(cell));
check("P4", "no JS errors on any load", allJsErrors.length === 0, allJsErrors.join(" | "));

// =================================================================
section("X. Scope: exactly 10T's lines");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
const FILES = ["data/asset-requests-store.js", "data/expenses-store.js"];
// Round 10V (layout; was the live js vs js-pre10T, here and in X1): 10T's own change set, read from its frozen result
// (js-pre10V = HEAD 8d35572); the live js has 10V's leave-store.js check since (workedday.mjs X1 / X4)
const changedJs = walk(`${HERE}js-pre10V`).filter((f) => !fs.existsSync(`${HERE}js-pre10T/${f}`) || SRC("js-pre10V", f) !== SRC("js-pre10T", f)).sort();
// Round 11B (layout; was the live pages, here and in the check below): this round's own page claim, read from its
// frozen result (html-pre11B = HEAD 97e1e6c); the live pages have 11B's sessions.html banner since (acctpages.mjs X2)
const changedHtml = walk(`${HERE}html-pre11B`).filter((f) => !fs.existsSync(`${HERE}html-pre10T/${f}`) || fs.readFileSync(`${HERE}html-pre11B/${f}`, "utf8") !== fs.readFileSync(`${HERE}html-pre10T/${f}`, "utf8"));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre10T", f)) : [];
check("X1", "js changed: exactly data/asset-requests-store.js and data/expenses-store.js; nothing added or removed", j(changedJs) === j(FILES) && j(walk(`${HERE}js-pre10V`).sort()) === j(walk(`${HERE}js-pre10T`).sort()), j(changedJs));
check("X2", "no page and no css changed; nothing added or removed", changedHtml.length === 0 && changedCss.length === 0 && j(walk(`${HERE}html-pre11B`).sort()) === j(walk(`${HERE}html-pre10T`).sort()), j([changedHtml, changedCss]));
check("X3", "the two are CRLF only, with no final newline (as before)", FILES.map((f) => SRC("js", f)).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
const lines = (s) => s.split("\r\n");
const count = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
const delta = Object.fromEntries(FILES.map((f) => {
  // Round 11R (layout; layout; was the live js: read from the frozen result js-pre11R = HEAD 86414a0, the live tree has 11R's permission overrides since (overrides.mjs X1))
  const a = count(lines(SRC("js-pre10T", f))), b = count(lines(SRC("js-pre11R", f)));
  const removed = [...a].flatMap(([l, n]) => Array(Math.max(0, n - (b.get(l) ?? 0))).fill(l)).sort();
  const added = [...b].reduce((t, [l, n]) => t + Math.max(0, n - (a.get(l) ?? 0)), 0);
  return [f, { removed, added }];
}));
const WANT = {
  "data/asset-requests-store.js": { removed: ["  if (stage === \"manager\") return user.id === request.managerId;", "// Never their own; otherwise the stage's rule above."], added: 17 },
  "data/expenses-store.js": { removed: ["  if (stage === \"manager\") return user.id === claim.managerId;", "// Never their own claim; otherwise the stage's rule above."], added: 17 },
};
check("X4", "…and within them, only 10T's lines (each: the manager-stage line and the comment line it replaces out; managerCanDecide, the fallback, its comment and the refusal in)", j(delta) === j(WANT), j(delta));
const fnBody = (s, name) => { const i = s.indexOf(`function ${name}(`); return i < 0 ? null : s.slice(i, s.indexOf("\r\n}\r\n", i) + 3); };
check("X5", "the two fixes have the same shape: holdsStage's manager branch and managerCanDecide are the same code with request/claim and admin/finance swapped",
  (() => {
    const q = fnBody(SRC("js", FILES[0]), "holdsStage"), x = fnBody(SRC("js", FILES[1]), "holdsStage");
    const branch = (s, r, n) => s.slice(s.indexOf('  if (stage === "manager") {'), s.indexOf("\r\n  }\r\n") + 5).replaceAll(r, "R").replaceAll(`"${n}"`, '"NEXT"');
    const mcd = (f, r) => fnBody(SRC("js", f), "managerCanDecide")?.replaceAll(r, "R");
    return branch(q, "request", "admin") === branch(x, "claim", "finance") && mcd(FILES[0], "request") === mcd(FILES[1], "claim") && typeof mcd(FILES[0], "request") === "string";
  })());

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
