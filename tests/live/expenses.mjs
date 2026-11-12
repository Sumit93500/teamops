// usage: node expenses.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 5B: the expenses data layer. ./js is the new code, ./js-pre5B the code before this round.
// Since Round 5C, the checks of 5B's own result read frozen copies: ./js-pre5C (5B's js) and
// ./html-pre5C (the pages 5B saw); 5C changed expenses.html and added to data/expenses.js.
//   A  data/expenses.js alone: policy figures vs the HTML, categories, chains, stage skipping (exhaustive)
//   B  the seed: real people only, every claim consistent with the rules, the cases it must cover
//   C  submitExpense: validation, receipt advisory, first stage, skips, Admin auto-approval, the all-skipped fallback
//   D  whole chains to paid (at or under ₹50,000, above it, no manager, an Admin's claim)
//   E  rejection at each stage
//   F  who may decide which stage (wrong role, wrong manager, role/session mismatch, inactive)
//   G  never your own claim, at any stage (even when a role change would otherwise let you)
//   H  paying: separate from approving, expenses:pay only, not the claimant, not the final approver unless nobody else can
//   I  pendingFor / waitingOn / payableFor agree with what decide and pay actually allow
//   J  cancel; K reads and totals; L source layout of 5B's result (nothing else changed, nothing wired to a page)
// Fixed clock: Wed 30 Sep 2026 11:00 local.
import fs from "fs";

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; },
};
const RealDate = Date;
const NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;

const X = await import("./js/data/expenses.js");
const E = await import("./js/data/expenses-store.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const L = await import("./js/data/leave-store.js");
const { ROLES } = await import("./js/config/roles.js");
const { PERMISSIONS } = await import("./js/config/permissions.js");

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029",
  ROHAN = "EMP-1042", DIVYA = "EMP-1061", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const roleOf = (id) => S.getUser(id)?.role;
const fresh = () => { mem.clear(); };
const snap = () => new Map(mem);
const restore = (m) => { mem.clear(); m.forEach((v, k) => mem.set(k, v)); };
const ok = (r) => r && r.ok === true;
const err = (r) => (r && r.ok === false ? r.error : `(ok: ${j(r?.record?.status)})`);
const decide = (id, who, d, note) => E.decideExpense(id, who, roleOf(who), d, note);
const submit = (who, f = {}) => E.submitExpense(who, { category: "travel", amount: 1500, date: "2026-09-28", reason: "Cab", receipt: "r.pdf", ...f });
const stagesOf = (c) => c.history.map((h) => `${h.stage}:${h.decision}${h.byUserId ? `:${h.byUserId}` : ""}`);
const ids = (list) => list.map((c) => c.id).sort();

// =====================================================================
section("A. Pure rules (data/expenses.js)");
const expHtml = src("html-pre5C", "finance/expenses.html");
const wfHtml = src("html-pre5C", "access/approval-workflows.html");
check("A1", "EXPENSE_POLICY: Admin above ₹50,000, receipt above ₹500, claim within 30 days, as expenses.html's policy card and approval-workflows.html say",
  j(((p) => ({ adminAbove: p.adminAbove, receiptAbove: p.receiptAbove, claimWithinDays: p.claimWithinDays }))(X.EXPENSE_POLICY)) === j({ adminAbove: 50000, receiptAbove: 500, claimWithinDays: 30 })
  && /Manager approves up to<\/dt><dd>₹50,000/.test(expHtml) && /Receipt needed above<\/dt><dd>₹500/.test(expHtml)
  && /Claim within<\/dt><dd>30 days of spending/.test(expHtml) && /Admin only above ₹50,000/.test(wfHtml), j(X.EXPENSE_POLICY));
const chartLabels = [...expHtml.matchAll(/<div class="bar-row"><span>([^<]+)<\/span>/g)].map((m) => m[1]);
const filterLabels = [...expHtml.match(/aria-label="Filter by category">([\s\S]*?)<\/select>/)[1].matchAll(/<option>([^<]+)<\/option>/g)].map((m) => m[1]).slice(1);
const labels = X.CATEGORY_KEYS.map((k) => X.CATEGORIES[k].label);
check("A2", "CATEGORIES are exactly the five expenses.html shows (its spend chart; the filter lists the first four)",
  j(labels) === j(chartLabels) && j(labels.slice(0, 4)) === j(filterLabels) && j(X.CATEGORY_KEYS) === j(["travel", "meals", "fuel", "software", "other"]),
  j({ labels, chartLabels, filterLabels }));
check("A3", "chainFor: manager + Finance up to and including ₹50,000; Admin added from ₹50,001",
  [1, 500, 49999, 50000].every((a) => j(X.chainFor(a)) === j(["manager", "finance"])) && [50001, 62000, 1e7].every((a) => j(X.chainFor(a)) === j(["manager", "finance", "admin"]))
  && j(X.STAGES) === j(["manager", "finance", "admin"]));
// Reference: walk STAGES in order, keep chain members after `after`, return the first held one.
const refNext = (chain, after, held) => {
  const order = ["manager", "finance", "admin"];
  const rest = chain.filter((s) => after === null || order.indexOf(s) > order.indexOf(after));
  const i = rest.findIndex((s) => held.has(s));
  return i === -1 ? { stage: null, skipped: rest } : { stage: rest[i], skipped: rest.slice(0, i) };
};
let bad = [], cases = 0;
for (const chain of [["manager", "finance"], ["manager", "finance", "admin"]]) {
  for (let mask = 0; mask < 8; mask++) {
    const held = new Set(["manager", "finance", "admin"].filter((_, i) => mask & (1 << i)));
    for (const after of [null, "manager", "finance", "admin"]) {
      cases++;
      const got = X.nextStage(chain, after, (s) => held.has(s));
      const want = refNext(chain, after, held);
      if (j(got) !== j(want)) bad.push(`${chain.length}/${[...held]}/${after}: ${j(got)} vs ${j(want)}`);
    }
  }
}
check("A4", `nextStage == an independent reference over every chain x held-set x starting point (${cases} cases)`, bad.length === 0 && cases === 64, bad.slice(0, 3).join(" | "));
check("A5", "nextStage examples: no manager -> Finance (manager skipped); claimant is the only Finance -> past it; after the last stage -> null",
  j(X.nextStage(["manager", "finance"], null, (s) => s !== "manager")) === j({ stage: "finance", skipped: ["manager"] })
  && j(X.nextStage(["manager", "finance", "admin"], "manager", (s) => s !== "finance")) === j({ stage: "admin", skipped: ["finance"] })
  && j(X.nextStage(["manager", "finance"], "finance", () => true)) === j({ stage: null, skipped: [] })
  && j(X.nextStage(["manager", "finance"], "admin", () => true)) === j({ stage: null, skipped: [] }));
bad = [];
for (const chain of [["manager", "finance"], ["manager", "finance", "admin"]]) {
  for (let mask = 0; mask < 8; mask++) {
    const held = new Set(["manager", "finance", "admin"].filter((_, i) => mask & (1 << i)));
    const got = X.firstStage(chain, (s) => held.has(s));
    const base = refNext(chain, null, held);
    const want = base.stage !== null || chain.includes("admin") ? base : { stage: held.has("admin") ? "admin" : null, skipped: base.skipped };
    if (j(got) !== j(want)) bad.push(`${chain.length}/${[...held]}: ${j(got)} vs ${j(want)}`);
  }
}
check("A6", "firstStage: as nextStage from the start, except a fully skipped two-stage chain goes to Admin (if held); exhaustive, 16 cases", bad.length === 0, bad.join(" | "));
check("A7", "firstStage: all skipped, Admin held -> admin with both skips; nobody held -> null; above ₹50,000 all skipped -> null (Admin was in the chain)",
  j(X.firstStage(["manager", "finance"], (s) => s === "admin")) === j({ stage: "admin", skipped: ["manager", "finance"] })
  && j(X.firstStage(["manager", "finance"], () => false)) === j({ stage: null, skipped: ["manager", "finance"] })
  && j(X.firstStage(["manager", "finance", "admin"], () => false)) === j({ stage: null, skipped: ["manager", "finance", "admin"] })
  && j(X.firstStage(["manager", "finance"], (s) => s === "finance")) === j({ stage: "finance", skipped: ["manager"] }));
check("A8", "needsReceipt: false at ₹500, true from ₹501", !X.needsReceipt(1) && !X.needsReceipt(500) && X.needsReceipt(501) && X.needsReceipt(62000));
const pureSrc = src("js", "data/expenses.js");
check("A9", "data/expenses.js is pure: no import, no storage, no clock, no users", !/\bimport\b/.test(pureSrc) && !/localStorage|new Date|Date\.now|getUser/.test(pureSrc));

// =====================================================================
section("B. Seed");
fresh();
const seed = E.allExpenses();
const realIds = new Set(S.getAllUsers().map((u) => u.id));
check("B1", "7 seeded claims EXP-3101..3107, all by real, active users; no Meenal Arora or Neha Kulkarni in any claim",
  j(seed.map((c) => c.id)) === j(["EXP-3101", "EXP-3102", "EXP-3103", "EXP-3104", "EXP-3105", "EXP-3106", "EXP-3107"])
  && seed.every((c) => realIds.has(c.userId) && S.getUser(c.userId).status !== "inactive")
  && !/Meenal|Neha/.test(j(seed)), j(seed.map((c) => `${c.id}:${c.userId}`)));
const dn = (iso) => Math.round(RealDate.UTC(...iso.split("-").map((v, i) => Number(v) - (i === 1 ? 1 : 0))) / 864e5);
bad = [];
for (const c of seed) {
  const chain = X.chainFor(c.amount);
  const why = [];
  if (!X.CATEGORIES[c.category]) why.push("category");
  if (!(Number.isSafeInteger(c.amount) && c.amount > 0)) why.push("amount");
  if (!(dn(c.date) <= dn(c.appliedOn) && dn(c.appliedOn) - dn(c.date) <= 30)) why.push("window");
  if (!c.reason.trim()) why.push("reason");
  if (c.managerId !== L.managerFor(c.userId)) why.push(`managerId ${c.managerId} vs ${L.managerFor(c.userId)}`);
  if (!(c.receipt === null || typeof c.receipt === "string")) why.push("receipt");
  const h = c.history;
  if (!(h[0].decision === "applied" && h[0].byUserId === c.userId && h[0].stage === chain[0] && h[0].at.slice(0, 10) === c.appliedOn)) why.push("applied");
  // Per stage: at most one decision, in chain order; skipped exactly where nobody else held it.
  const decided = h.filter((e) => ["skipped", "approved", "auto-approved", "rejected"].includes(e.decision));
  if (j(decided.map((e) => e.stage)) !== j(chain.slice(0, decided.length))) why.push("stage order");
  decided.filter((e) => e.decision === "skipped").forEach((e) => { if (!(e.stage === "manager" && c.managerId === null)) why.push(`skip ${e.stage}`); });
  if (c.managerId && decided.some((e) => e.stage === "manager" && e.decision === "approved" && e.byUserId !== c.managerId)) why.push("manager decided by someone else");
  decided.filter((e) => e.decision === "approved" || e.decision === "rejected").forEach((e) => {
    if (e.stage === "finance" && roleOf(e.byUserId) !== "fin") why.push("finance by non-fin");
    if (e.stage === "admin" && roleOf(e.byUserId) !== "admin") why.push("admin by non-admin");
    if (e.byUserId === c.userId) why.push("own");
  });
  const done = decided.length === chain.length && decided.every((e) => e.decision !== "rejected");
  const pair = `${c.status}/${c.stage}`;
  if (c.status === "pending" && !(c.stage === chain[decided.length] && !decided.some((e) => e.decision === "rejected"))) why.push(`pending stage ${c.stage}`);
  if (c.status === "approved" && !(c.stage === "payment" && done)) why.push(pair);
  if (c.status === "paid" && !(c.stage === "done" && done && h.at(-1).decision === "paid" && h.at(-1).byUserId !== c.userId
    && h.at(-1).byUserId !== [...decided].reverse().find((e) => e.decision !== "skipped").byUserId && ROLES[roleOf(h.at(-1).byUserId)].permissions.includes("expenses:pay"))) why.push(pair);
  if (c.status === "rejected" && !(c.stage === "done" && h.at(-1).decision === "rejected" && h.at(-1).note)) why.push(pair);
  if (why.length) bad.push(`${c.id}: ${why.join(", ")}`);
}
check("B2", "every seeded claim follows the rules: valid fields, sent within 30 days, managerId = managerFor(), stages decided in chain order by the right people, skips only where nobody held the stage, status/stage consistent",
  bad.length === 0, bad.join(" | "));
const byId = Object.fromEntries(seed.map((c) => [c.id, c]));
check("B3", "covers: one paid (EXP-3102, manager -> Finance -> paid by Aarav), one at each stage (3106 manager, 3104/3105 Finance, 3103 Admin)",
  byId["EXP-3102"].status === "paid" && j(stagesOf(byId["EXP-3102"])) === j([`manager:applied:${ROHAN}`, `manager:approved:${SNEHA}`, `finance:approved:${KABIR}`, `payment:paid:${AARAV}`])
  && byId["EXP-3106"].stage === "manager" && byId["EXP-3104"].stage === "finance" && byId["EXP-3105"].stage === "finance" && byId["EXP-3103"].stage === "admin"
  && seed.filter((c) => c.status === "pending").length === 4);
check("B4", "covers: above ₹50,000 (EXP-3103, ₹62,000, waiting for an Admin after manager and Finance approved)",
  byId["EXP-3103"].amount === 62000 && j(stagesOf(byId["EXP-3103"])) === j([`manager:applied:${ROHAN}`, `manager:approved:${SNEHA}`, `finance:approved:${KABIR}`]));
check("B5", "covers: Arjun's ₹3,200 with no receipt, rejected by Finance with a note (2 Aug, as on expenses.html / my-requests.html)",
  byId["EXP-3101"].userId === ARJUN && byId["EXP-3101"].amount === 3200 && byId["EXP-3101"].receipt === null && byId["EXP-3101"].date === "2026-08-02"
  && byId["EXP-3101"].status === "rejected" && byId["EXP-3101"].history.at(-1).stage === "finance" && /Bill missing/.test(byId["EXP-3101"].history.at(-1).note));
check("B6", "covers: no manager on file (Ananya EXP-3104, Vikram EXP-3105): manager stage recorded as skipped",
  [byId["EXP-3104"], byId["EXP-3105"]].every((c) => c.managerId === null && j(stagesOf(c)) === j([`manager:applied:${c.userId}`, "manager:skipped"]) && c.history[1].note === "No manager on file"));
check("B7", "covers: an Admin's claim (Aarav EXP-3107): auto-approved at every stage of its chain, waiting for payment",
  byId["EXP-3107"].userId === AARAV && byId["EXP-3107"].status === "approved" && byId["EXP-3107"].stage === "payment"
  && j(stagesOf(byId["EXP-3107"])) === j([`manager:applied:${AARAV}`, `manager:auto-approved:${AARAV}`, `finance:auto-approved:${AARAV}`]));
check("B8", "the static page's amounts kept where the person is real: 3,200 / 2,150 / 8,400 / 4,800, plus 62,000 and 6,200 moved to real people",
  j(seed.map((c) => c.amount)) === j([3200, 2150, 62000, 8400, 4800, 1850, 6200]));

// =====================================================================
section("C. submitExpense");
fresh();
let r = E.submitExpense(ARJUN, { category: "meals", amount: 1200, date: "2026-09-29", reason: "  Client lunch  ", receipt: " lunch.jpg ", extra: "x", id: "EXP-1", status: "paid" });
check("C1", "Arjun (manager Sneha), ₹1,200: saved pending at the manager stage, managerId Sneha, history [applied], today's appliedOn, trimmed fields, extras ignored, new id",
  ok(r) && j({ ...r.record, history: undefined }) === j({ userId: ARJUN, category: "meals", amount: 1200, date: "2026-09-29", reason: "Client lunch", receipt: "lunch.jpg",
    managerId: SNEHA, appliedOn: "2026-09-30", status: "pending", stage: "manager", id: "EXP-3108" })
  && j(stagesOf(r.record)) === j([`manager:applied:${ARJUN}`]) && j(r.advisories) === j([]) && E.getExpense("EXP-3108").stage === "manager",
  // Round 10A (harness; was j({ ...r, record: { ...r.record, history: stagesOf(r.record) } }), which threw on a refused r instead of printing a FAIL line)
  ok(r) ? j({ ...r, record: { ...r.record, history: stagesOf(r.record) } }) : err(r));   // stages, not timestamps: "at" is an instant and differs by zone
const refusals = [
  ["unknown person", "EMP-9999", {}, /No employee/],
  ["inactive (Divya)", DIVYA, {}, /inactive/],
  ["no category", ARJUN, { category: "" }, "category"],
  ["unknown category", ARJUN, { category: "books" }, "category"],
  ["category label instead of key", ARJUN, { category: "Travel" }, "category"],
  ["amount 0", ARJUN, { amount: 0 }, "amount"],
  ["amount negative", ARJUN, { amount: -10 }, "amount"],
  ["amount with paise", ARJUN, { amount: 12.5 }, "amount"],
  ["amount text", ARJUN, { amount: "abc" }, "amount"],
  ["amount empty", ARJUN, { amount: "" }, "amount"],
  ["amount with commas", ARJUN, { amount: "8,400" }, "amount"],
  ["amount missing", ARJUN, { amount: undefined }, "amount"],
  ["date invalid", ARJUN, { date: "2026-02-30" }, "date"],
  ["date empty", ARJUN, { date: "" }, "date"],
  ["date tomorrow", ARJUN, { date: "2026-10-01" }, "date"],
  ["date 31 days ago", ARJUN, { date: "2026-08-30" }, "date"],
  ["reason blank", ARJUN, { reason: "   " }, "reason"],
];
bad = [];
for (const [what, who, f, want] of refusals) {
  const before = snap();
  const res = submit(who, f);
  const fine = res.ok === false && (typeof want === "string" ? res.field === want : want.test(res.error)) && E.allExpenses().length === 8;
  if (!fine) bad.push(`${what}: ${j(res)}`);
  restore(before);
}
check("C2", `${refusals.length} invalid submissions refused, each naming the right field, nothing saved`, bad.length === 0, bad.join(" | "));
check("C3", "the window: 30 days ago and today are accepted; the messages say 'future' and '30 days'",
  ok(submit(ARJUN, { date: "2026-08-31" })) && ok(submit(ARJUN, { date: "2026-09-30" }))
  && /future/.test(submit(ARJUN, { date: "2026-10-01" }).error) && /within 30 days/.test(submit(ARJUN, { date: "2026-08-30" }).error));
fresh();
const a500 = submit(ARJUN, { amount: 500, receipt: "" }), a501 = submit(ARJUN, { amount: 501, receipt: null }), a501r = submit(ARJUN, { amount: 501, receipt: "b.pdf" });
check("C4", "receipt: no advisory at ₹500 without one; an advisory (code 'receipt') at ₹501 without one, the claim still saved; none with a receipt; '' stored as null",
  ok(a500) && a500.advisories.length === 0 && a500.record.receipt === null && ok(a501) && j(a501.advisories.map((x) => x.code)) === j(["receipt"])
  && /₹500/.test(a501.advisories[0].message) && E.getExpense(a501.record.id) !== null && ok(a501r) && a501r.advisories.length === 0);
const sAmt = submit(ARJUN, { amount: " 1850 " });
check("C5", "an amount typed as text ('1850') is stored as the number 1850", ok(sAmt) && sAmt.record.amount === 1850);
fresh();
r = submit(ANANYA, { amount: 2000 });
check("C6", "no manager on file (Ananya): the manager stage is skipped at once, the claim waits for Finance",
  ok(r) && r.record.managerId === null && r.record.stage === "finance" && r.record.status === "pending"
  && j(stagesOf(r.record)) === j([`manager:applied:${ANANYA}`, "manager:skipped"]) && r.record.history[1].note === "No manager on file");
const adm = submit(AARAV, { amount: 9000 }), admBig = submit(AARAV, { amount: 75000 });
check("C7", "an Admin's own claim: approved at every stage straight away (2 stages at ₹9,000, 3 above ₹50,000), waiting for payment",
  ok(adm) && adm.record.status === "approved" && adm.record.stage === "payment"
  && j(stagesOf(adm.record)) === j([`manager:applied:${AARAV}`, `manager:auto-approved:${AARAV}`, `finance:auto-approved:${AARAV}`])
  && ok(admBig) && j(stagesOf(admBig.record).slice(1)) === j(["manager", "finance", "admin"].map((s) => `${s}:auto-approved:${AARAV}`))
  && admBig.record.history.slice(1).every((h) => h.note === "Auto-approved (Admin)"));
fresh();
r = submit(KABIR, { amount: 4000 });
const kabId = r.record.id;
const kabAfter = decide(kabId, AARAV, "approve");
check("C8", "Kabir (the only Finance Manager) ₹4,000: manager Aarav first; once Aarav approves, Finance is skipped (nobody else holds it) and the claim is approved",
  ok(r) && r.record.managerId === AARAV && r.record.stage === "manager" && ok(kabAfter) && kabAfter.record.status === "approved" && kabAfter.record.stage === "payment"
  && j(stagesOf(kabAfter.record)) === j([`manager:applied:${KABIR}`, `manager:approved:${AARAV}`, "finance:skipped"])
  // Round 10A (harness; was j(stagesOf(kabAfter.record)), which threw on a refused kabAfter instead of printing a FAIL line)
  && kabAfter.record.history[2].note === "Nobody else can decide the Finance stage", ok(kabAfter) ? j(stagesOf(kabAfter.record)) : err(kabAfter));
fresh();
r = submit(KABIR, { amount: 60000 });
const kb2 = decide(r.record.id, AARAV, "approve");
check("C9", "Kabir ₹60,000: manager Aarav -> Finance skipped -> Admin (Aarav again; flagged in the notes)",
  ok(kb2) && kb2.record.stage === "admin" && kb2.record.status === "pending" && j(stagesOf(kb2.record)) === j([`manager:applied:${KABIR}`, `manager:approved:${AARAV}`, "finance:skipped"]));
fresh();
S.updateUser(USER_ACTOR("admin", KABIR), KABIR, { reportingManager: "" });
r = submit(KABIR, { amount: 4000 });
check("C10", "all stages skipped (Kabir with no manager, ₹4,000): goes to an Admin instead of being approved by nobody",
  ok(r) && r.record.status === "pending" && r.record.stage === "admin" && j(stagesOf(r.record)) === j([`manager:applied:${KABIR}`, "manager:skipped", "finance:skipped"]));
fresh();
S.updateUser(USER_ACTOR("admin", KABIR), KABIR, { reportingManager: "" });
// Round 9U (behaviour; was S.updateUser(AARAV, { role: "emp" })): the store now refuses to leave nobody with the Admin
// role (adminguard.mjs Z1), so the no-Admin state is written into storage, as data saved before 9U could hold it
S.updateUser(USER_ACTOR("admin", "EMP-1001"), "EMP-1001", {}); { const box = JSON.parse(localStorage.getItem("officeos:users")); box.records.forEach((u) => { if (u.role === "admin") u.role = "emp"; }); localStorage.setItem("officeos:users", JSON.stringify(box)); }   // nobody holds the Admin stage any more (and no second Finance Manager)
const before = E.allExpenses().length;
r = submit(KABIR, { amount: 4000 });
check("C11", "nobody can approve at all (no manager, no other Finance, no Admin): refused, nothing saved",
  r.ok === false && /Nobody can approve/.test(r.error) && E.allExpenses().length === before, j(r));

// =====================================================================
section("D. Whole chains to paid");
fresh();
r = submit(ARJUN, { amount: 12000 });
let id = r.record.id;
const d1 = decide(id, SNEHA, "approve");
const d2 = decide(id, KABIR, "approve");
const d3fail = E.payExpense(id, KABIR);
const d3 = E.payExpense(id, AARAV);
check("D1", "₹12,000 (no Admin stage): manager -> Finance -> approved (not paid) -> Kabir (final approver) can't pay -> Aarav pays",
  d1.record.stage === "finance" && d1.record.status === "pending" && d2.record.status === "approved" && d2.record.stage === "payment"
  && d3fail.ok === false && /final approval/.test(d3fail.error) && ok(d3) && d3.record.status === "paid" && d3.record.stage === "done"
  && j(stagesOf(d3.record)) === j([`manager:applied:${ARJUN}`, `manager:approved:${SNEHA}`, `finance:approved:${KABIR}`, `payment:paid:${AARAV}`]));
fresh();
r = submit(ROHAN, { amount: 50001 });
id = r.record.id;
const e1 = decide(id, SNEHA, "approve"), e2 = decide(id, KABIR, "approve");
const e3 = decide(id, AARAV, "approve");
const e4fail = E.payExpense(id, AARAV), e4 = E.payExpense(id, KABIR);
check("D2", "₹50,001: Finance's approval moves it to the Admin stage (not approved yet); Admin approves; Aarav can't pay; Kabir pays",
  e1.record.stage === "finance" && e2.record.stage === "admin" && e2.record.status === "pending" && e3.record.status === "approved"
  && e4fail.ok === false && ok(e4) && j(stagesOf(e4.record)) === j([`manager:applied:${ROHAN}`, `manager:approved:${SNEHA}`, `finance:approved:${KABIR}`, `admin:approved:${AARAV}`, `payment:paid:${KABIR}`]));
fresh();
r = submit(ROHAN, { amount: 50000 });
const at50k = decide(r.record.id, SNEHA, "approve") && decide(r.record.id, KABIR, "approve");
check("D3", "exactly ₹50,000: approved after Finance, no Admin stage", at50k.record.status === "approved" && !at50k.record.history.some((h) => h.stage === "admin"));
fresh();
r = submit(VIKRAM, { amount: 4800, category: "fuel" });
const v1 = decide(r.record.id, KABIR, "approve"), v2 = E.payExpense(r.record.id, AARAV);
check("D4", "no manager (Vikram): Finance -> approved -> paid by Aarav", r.record.stage === "finance" && v1.record.status === "approved" && ok(v2) && v2.record.status === "paid");
fresh();
r = submit(VIKRAM, { amount: 80000 });
const vb1 = decide(r.record.id, KABIR, "approve"), vb2 = decide(r.record.id, AARAV, "approve");
check("D5", "no manager, above ₹50,000 (Vikram ₹80,000): Finance -> Admin -> approved", vb1.record.stage === "admin" && vb2.record.status === "approved"
  && j(stagesOf(vb2.record)) === j([`manager:applied:${VIKRAM}`, "manager:skipped", `finance:approved:${KABIR}`, `admin:approved:${AARAV}`]));
fresh();
const ownPay = E.payExpense("EXP-3107", AARAV), kabPay = E.payExpense("EXP-3107", KABIR);
check("D6", "an Admin's auto-approved claim (EXP-3107): Aarav can't pay his own; Kabir pays it",
  ownPay.ok === false && /your own/.test(ownPay.error) && ok(kabPay) && kabPay.record.status === "paid");

// =====================================================================
section("E. Rejection at each stage");
const rejectAt = (stage) => {
  fresh();
  const c = submit(ROHAN, { amount: 70000 }).record;
  if (stage !== "manager") decide(c.id, SNEHA, "approve");
  if (stage === "admin") decide(c.id, KABIR, "approve");
  const who = { manager: SNEHA, finance: KABIR, admin: AARAV }[stage];
  const blank = decide(c.id, who, "reject", "   ");
  const unchanged = E.getExpense(c.id).status === "pending" && E.getExpense(c.id).stage === stage;
  const res = decide(c.id, who, "reject", "Not a business expense");
  const after = [decide(c.id, who, "approve"), E.payExpense(c.id, KABIR), E.payExpense(c.id, AARAV), E.cancelExpense(c.id, ROHAN)];
  return blank.ok === false && blank.field === "note" && unchanged && ok(res) && res.record.status === "rejected" && res.record.stage === "done"
    && res.record.history.at(-1).stage === stage && res.record.history.at(-1).note === "Not a business expense" && res.record.history.at(-1).byUserId === who
    && after.every((x) => x.ok === false) && /already rejected/.test(after[0].error) && /already rejected/.test(after[1].error) && /already rejected/.test(after[3].error)
    && E.getExpense(c.id).status === "rejected";
};
check("E1", "rejected at the manager stage (by Sneha): ends it; a blank note is refused first (field 'note'); nothing can approve, pay or cancel it after", rejectAt("manager"));
check("E2", "rejected at the Finance stage (by Kabir): same", rejectAt("finance"));
check("E3", "rejected at the Admin stage (by Aarav), after manager and Finance approved: same", rejectAt("admin"));

// =====================================================================
section("F. Who may decide which stage");
fresh();
const tryAll = (id, list) => list.map(([who, role]) => [who, role ?? roleOf(who), E.decideExpense(id, who, role ?? roleOf(who), "approve")]);
const refusedAll = (res, re) => res.every(([, , x]) => x.ok === false && (!re || re.test(x.error)));
const unchangedSeed = (id) => j(E.getExpense(id)) === j(byId[id]);
// EXP-3106: Arjun's, at the manager stage (Sneha).
let res = tryAll("EXP-3106", [[ROHAN], [KABIR], [AARAV], [PRIYA], [MEERA], [VIKRAM]]);
check("F1", "manager stage (Arjun's EXP-3106): another employee, Finance, Admin, HR all refused ('claimant's manager'); the claim unchanged",
  refusedAll(res, /claimant's manager/) && unchangedSeed("EXP-3106"), j(res.map(([w, , x]) => [w, err(x)])));
// EXP-3104: Ananya's, at Finance.
res = tryAll("EXP-3104", [[SNEHA], [AARAV], [PRIYA], [ARJUN]]);
check("F2", "Finance stage (EXP-3104): a manager, an Admin, HR, an employee all refused ('Only Finance'); unchanged",
  refusedAll(res, /Only Finance/) && unchangedSeed("EXP-3104"), j(res.map(([w, , x]) => [w, err(x)])));
// EXP-3103: Rohan's, at Admin.
res = tryAll("EXP-3103", [[KABIR], [SNEHA], [PRIYA]]);
check("F3", "Admin stage (EXP-3103): Finance, the claimant's manager, HR all refused ('Only an Admin'); unchanged",
  refusedAll(res, /Only an Admin/) && unchangedSeed("EXP-3103"), j(res.map(([w, , x]) => [w, err(x)])));
res = tryAll("EXP-3104", [[KABIR, "admin"], [KABIR, "emp"], [AARAV, "fin"], ["EMP-9999", "fin"], [DIVYA, "emp"]]);
check("F4", "the role passed in must be the person's own (Kabir as 'admin', Aarav as 'fin'), unknown and inactive people refused",
  refusedAll(res, /can't decide expense claims/) && unchangedSeed("EXP-3104"), j(res.map(([w, ro, x]) => [w, ro, err(x)])));
fresh();
S.updateUser(USER_ACTOR("admin", SNEHA), SNEHA, { status: "inactive", dateOfLeaving: LEAVING_11Y() });
const inact = decide("EXP-3106", SNEHA, "approve");
// Round 10T (decision; was "and the claim is stuck", waitingOn []): the manager stage now falls back to Finance when the
// manager can no longer decide (mgrfall.mjs E1-E9)
check("F5", "a manager who has since been made inactive can't decide (Finance may decide that stage instead: round 10T)",
  inact.ok === false && E.getExpense("EXP-3106").status === "pending" && j(E.waitingOn(E.getExpense("EXP-3106"))) === j([KABIR]));
fresh();
S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { reportingManager: "Rohan Gupta" });   // a new manager after the claim was sent
const oldMgr = decide("EXP-3106", SNEHA, "approve"), newMgr = E.decideExpense("EXP-3106", ROHAN, "emp", "approve");
check("F6", "the manager is the one resolved when the claim was sent: after Arjun's manager changes, Sneha still decides, Rohan can't",
  newMgr.ok === false && ok(oldMgr) && oldMgr.record.stage === "finance");
fresh();
const badDecision = decide("EXP-3104", KABIR, "maybe"), unknown = decide("EXP-9999", KABIR, "approve");
check("F7", "decision must be approve or reject; an unknown claim id is refused", badDecision.ok === false && /approve" or "reject/.test(badDecision.error) && /No expense claim/.test(unknown.error) && unchangedSeed("EXP-3104"));
fresh();
const tl = submit(ARJUN, { amount: 1000 }).record;
const stageTwice = [decide(tl.id, SNEHA, "approve"), decide(tl.id, SNEHA, "approve")];
check("F8", "a manager who approved can't act again at the next stage", ok(stageTwice[0]) && stageTwice[1].ok === false && /Only Finance/.test(stageTwice[1].error));

fresh();
const finPerms = ROLES.fin.permissions;
ROLES.fin.permissions = finPerms.filter((p) => p !== "expenses:approve");
const noApprove = decide("EXP-3104", KABIR, "approve");
const rerouted = submit(ANANYA, { amount: 3000 }).record;
ROLES.fin.permissions = finPerms;
check("F9", "the Finance stage also needs expenses:approve: without it Kabir is refused, and a new claim skips Finance (and goes to an Admin)",
  noApprove.ok === false && /Only Finance/.test(noApprove.error) && rerouted.stage === "admin" && j(stagesOf(rerouted)) === j([`manager:applied:${ANANYA}`, "manager:skipped", "finance:skipped"]));

// =====================================================================
section("G. Never your own claim");
fresh();
// Make Arjun a Finance Manager: his own claim at the Finance stage would otherwise be his to decide.
let c = submit(ARJUN, { amount: 3000 }).record;
decide(c.id, SNEHA, "approve");
S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { role: "fin" });
let own = E.decideExpense(c.id, ARJUN, "fin", "approve");
const ctrl = E.decideExpense(c.id, KABIR, "fin", "approve");
check("G1", "Finance stage: a claimant who is (now) Finance can't decide their own claim; another Finance Manager can",
  own.ok === false && /your own/.test(own.error) && ok(ctrl), err(own));
fresh();
c = submit(ROHAN, { amount: 90000 }).record;
decide(c.id, SNEHA, "approve"); decide(c.id, KABIR, "approve");
S.updateUser(USER_ACTOR("admin", ROHAN), ROHAN, { role: "admin" });
own = E.decideExpense(c.id, ROHAN, "admin", "reject", "no");
check("G2", "Admin stage: a claimant who is (now) an Admin can't decide their own claim, not even reject it", own.ok === false && /your own/.test(own.error) && E.getExpense(c.id).stage === "admin");
fresh();
// A tampered record whose managerId is the claimant: still refused.
c = submit(ARJUN, { amount: 900 }).record;
const box = JSON.parse(mem.get("officeos:expense-claims"));
box.records.find((x) => x.id === c.id).managerId = ARJUN;
mem.set("officeos:expense-claims", JSON.stringify(box));
own = decide(c.id, ARJUN, "approve");
check("G3", "manager stage: even a record naming the claimant as their own manager is refused", own.ok === false && /your own/.test(own.error));
fresh();
c = submit(KABIR, { amount: 70000 }).record;
check("G4", "Kabir's own claim never waits on Kabir: not in his pendingFor at any point, and his decision is refused",
  !E.pendingFor(KABIR, "fin").some((x) => x.id === c.id) && decide(c.id, KABIR, "approve").ok === false
  && ok(decide(c.id, AARAV, "approve")) && !E.pendingFor(KABIR, "fin").some((x) => x.id === c.id) && E.getExpense(c.id).stage === "admin");

// =====================================================================
section("H. Paying");
fresh();
c = submit(ARJUN, { amount: 2500 }).record;
const p0 = E.payExpense(c.id, AARAV);
decide(c.id, SNEHA, "approve");
const p1 = E.payExpense(c.id, AARAV);
const appr = decide(c.id, KABIR, "approve");
check("H1", "approving never pays: pending claims can't be paid (at either stage); after the last approval it is 'approved', with no 'paid' entry",
  p0.ok === false && /waiting for approval/.test(p0.error) && p1.ok === false && appr.record.status === "approved" && !appr.record.history.some((h) => h.decision === "paid"));
const noPerm = [SNEHA, PRIYA, ROHAN, MEERA].map((who) => E.payExpense(c.id, who));
check("H2", "paying needs expenses:pay: a manager, HR, employees refused", noPerm.every((x) => x.ok === false && /Only Finance or an Admin can pay/.test(x.error)) && E.getExpense(c.id).status === "approved");
const own2 = E.payExpense(c.id, ARJUN);
check("H3", "the claimant can't pay (Arjun has no expenses:pay either)", own2.ok === false);
const finalAppr = E.payExpense(c.id, KABIR), good = E.payExpense(c.id, AARAV), twice = E.payExpense(c.id, KABIR);
check("H4", "the final approver (Kabir) can't pay; someone else with expenses:pay (Aarav) can; a paid claim can't be paid again",
  finalAppr.ok === false && /final approval/.test(finalAppr.error) && ok(good) && twice.ok === false && /already paid/.test(twice.error));
fresh();
S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { role: "fin" });
c = submit(ROHAN, { amount: 1000 }).record;
decide(c.id, SNEHA, "approve"); decide(c.id, KABIR, "approve");
const finPay = E.payExpense(c.id, ARJUN);
check("H5", "a different Finance Manager (Arjun, made fin) who didn't approve may pay", ok(finPay) && finPay.record.history.at(-1).byUserId === ARJUN);
fresh();
c = submit(KABIR, { amount: 4000 }).record;
decide(c.id, AARAV, "approve");
const kc = E.getExpense(c.id);
const APPROVER_PAID = "Paid by the final approver: nobody else can pay this claim";
const kSelf = E.payExpense(c.id, KABIR), kWait = E.waitingOn(kc);
const kListed = E.payableFor(AARAV).some((x) => x.id === c.id), kSelfListed = E.payableFor(KABIR).some((x) => x.id === c.id);
const kPaid = E.payExpense(c.id, AARAV);
check("H6", "Kabir's own claim, approved by Aarav (his manager; Finance skipped): nobody else may pay, so Aarav, the final approver, may (the fallback); Kabir still can't; the paid entry's note says why",
  kc.status === "approved" && kSelf.ok === false && /your own/.test(kSelf.error) && j(kWait) === j([AARAV]) && kListed && !kSelfListed
  && ok(kPaid) && kPaid.record.history.at(-1).byUserId === AARAV && kPaid.record.history.at(-1).note === APPROVER_PAID, j({ by: kPaid.record?.history.at(-1).byUserId, note: kPaid.record?.history.at(-1).note }));
fresh();
S.addUser(USER_ACTOR("admin", null), { name: "Test Payer", email: "tp@northwind.com", department: "FIN", role: "fin" });
const tp = S.getAllUsers().find((u) => u.name === "Test Payer").id;
S.updateUser(USER_ACTOR("admin", tp), tp, { status: "inactive", dateOfLeaving: LEAVING_11Y() });
const inactivePay = E.payExpense("EXP-3107", tp), unknownPay = E.payExpense("EXP-3107", "EMP-9999"), noClaim = E.payExpense("EXP-9", KABIR);
check("H7", "an inactive Finance Manager or unknown person can't pay; unknown claim refused", inactivePay.ok === false && unknownPay.ok === false && /No expense claim/.test(noClaim.error)
  && E.getExpense("EXP-3107").status === "approved");

fresh();
const admPerms = ROLES.admin.permissions;
ROLES.admin.permissions = admPerms.filter((p) => p !== "expenses:pay");
c = submit(ROHAN, { amount: 1000 }).record;
decide(c.id, SNEHA, "approve"); decide(c.id, KABIR, "approve");
const admNoPay = E.payExpense(c.id, AARAV);
ROLES.admin.permissions = admPerms;
check("H8", "paying is checked against expenses:pay itself: an Admin role without it is refused", admNoPay.ok === false && /Only Finance or an Admin can pay/.test(admNoPay.error));

fresh();
c = submit(KABIR, { amount: 4000 }).record;
decide(c.id, AARAV, "approve");
S.addUser(USER_ACTOR("admin", null), { name: "Test Payer", email: "tp@northwind.com", department: "FIN", role: "fin" });
const tp2 = S.getAllUsers().find((u) => u.name === "Test Payer").id;
const tpWait = E.waitingOn(E.getExpense(c.id)), aRefused = E.payExpense(c.id, AARAV), tpPaid = E.payExpense(c.id, tp2);
check("H9", "the fallback is worked out at payment time: with a second Finance Manager, Aarav (final approver of Kabir's claim) is refused again and the new person pays, with no note",
  j(tpWait) === j([tp2]) && aRefused.ok === false && /final approval/.test(aRefused.error) && ok(tpPaid) && tpPaid.record.history.at(-1).note === "", j({ tpWait, aRefused: err(aRefused) }));
fresh();
c = submit(KABIR, { amount: 4000 }).record;
decide(c.id, AARAV, "approve");
S.addUser(USER_ACTOR("admin", null), { name: "Test Payer", email: "tp@northwind.com", department: "FIN", role: "fin" });
S.updateUser(USER_ACTOR("admin", null), S.getAllUsers().find((u) => u.name === "Test Payer").id, { status: "inactive", dateOfLeaving: LEAVING_11Y() });
const inWait = E.waitingOn(E.getExpense(c.id)), inPaid = E.payExpense(c.id, AARAV);
fresh();
ROLES.admin.permissions = admPerms.filter((p) => p !== "expenses:pay");
c = submit(ROHAN, { amount: 1000 }).record;
decide(c.id, SNEHA, "approve"); decide(c.id, KABIR, "approve");
const finWait = E.waitingOn(E.getExpense(c.id)), finPaid = E.payExpense(c.id, KABIR);
ROLES.admin.permissions = admPerms;
check("H10", "'nobody else' means nobody else active with expenses:pay: an inactive second Finance Manager doesn't stop Aarav paying Kabir's claim; with Admin stripped of expenses:pay, Kabir pays Rohan's claim he approved last; both noted",
  j(inWait) === j([AARAV]) && ok(inPaid) && inPaid.record.history.at(-1).note === APPROVER_PAID
  && j(finWait) === j([KABIR]) && ok(finPaid) && finPaid.record.history.at(-1).note === APPROVER_PAID, j({ inWait, finWait, inPaid: err(inPaid), finPaid: err(finPaid) }));
fresh();
c = submit(KABIR, { amount: 4000 }).record;
decide(c.id, AARAV, "approve");
ROLES.admin.permissions = admPerms.filter((p) => p !== "expenses:pay");
const noneWait = E.waitingOn(E.getExpense(c.id)), noneA = E.payExpense(c.id, AARAV), noneK = E.payExpense(c.id, KABIR);
ROLES.admin.permissions = admPerms;
check("H11", "the fallback never lets the claimant pay: Kabir's claim with Admin stripped of expenses:pay waits on nobody ([]), and neither Aarav nor Kabir can pay it",
  j(noneWait) === j([]) && noneA.ok === false && noneK.ok === false && /your own/.test(noneK.error) && E.getExpense(c.id).status === "approved");

fresh();
c = submit(KABIR, { amount: 60000 }).record;
decide(c.id, AARAV, "approve"); decide(c.id, AARAV, "approve");
const twiceWait = E.waitingOn(E.getExpense(c.id)), twicePaid = E.payExpense(c.id, AARAV);
check("H12", "known limitation, pinned: Kabir's own ₹60,000 claim is approved by Aarav twice (manager, Admin) and then paid by Aarav (the fallback), with the fallback note",
  j(twiceWait) === j([AARAV]) && ok(twicePaid) && j(stagesOf(twicePaid.record)) === j([`manager:applied:${KABIR}`, `manager:approved:${AARAV}`, "finance:skipped", `admin:approved:${AARAV}`, `payment:paid:${AARAV}`])
  && twicePaid.record.history.at(-1).note === APPROVER_PAID, j(twicePaid.record ? stagesOf(twicePaid.record) : err(twicePaid)));

// =====================================================================
section("I. pendingFor / waitingOn / payableFor");
fresh();
check("I1", "seed: Sneha -> [3106]; Kabir -> [3104, 3105]; Aarav -> [3103]; Priya, Arjun, Rohan -> []",
  j(ids(E.pendingFor(SNEHA, "emp"))) === j(["EXP-3106"]) && j(ids(E.pendingFor(KABIR, "fin"))) === j(["EXP-3104", "EXP-3105"])
  && j(ids(E.pendingFor(AARAV, "admin"))) === j(["EXP-3103"]) && [PRIYA, ARJUN, ROHAN].every((u) => E.pendingFor(u, roleOf(u)).length === 0));
check("I2", "a roleKey that isn't the person's own, an unknown or an inactive person -> []",
  E.pendingFor(KABIR, "admin").length === 0 && E.pendingFor(AARAV, "fin").length === 0 && E.pendingFor(SNEHA, "fin").length === 0
  && E.pendingFor("EMP-9999", "fin").length === 0 && E.pendingFor(DIVYA, "emp").length === 0);
// Property: build a varied set of claims, then for every person x claim, pendingFor <=> decide succeeds, and waitingOn == those people.
fresh();
S.updateUser(USER_ACTOR("admin", MEERA), MEERA, { reportingManager: "Kabir Shah" });
const made = [];
for (const [who, amt] of [[ARJUN, 900], [ARJUN, 51000], [ROHAN, 52000], [ANANYA, 300], [VIKRAM, 60000], [KABIR, 1000], [KABIR, 99000], [PRIYA, 2000], [PRIYA, 70000], [SNEHA, 4000], [MEERA, 5000], [MEERA, 55000]]) {
  made.push(submit(who, { amount: amt }).record.id);
}
decide(made[1], SNEHA, "approve"); decide(made[2], SNEHA, "approve"); decide(made[2], KABIR, "approve");
decide(made[5], AARAV, "approve"); decide(made[6], AARAV, "approve"); decide(made[8], AARAV, "approve"); decide(made[11], KABIR, "approve");
const people = S.getAllUsers();
bad = []; let pairs = 0;
for (const cl of E.allExpenses()) {
  const shouldWait = [];
  for (const u of people) {
    pairs++;
    const listed = E.pendingFor(u.id, u.role).some((x) => x.id === cl.id);
    const before2 = snap();
    const can = E.decideExpense(cl.id, u.id, u.role, "approve").ok;
    restore(before2);
    if (listed !== can) bad.push(`${cl.id}/${u.id}: listed ${listed}, decide ${can}`);
    if (can) shouldWait.push(u.id);
  }
  if (cl.status === "pending" && j(E.waitingOn(cl).sort()) !== j(shouldWait.sort())) bad.push(`${cl.id}: waitingOn ${j(E.waitingOn(cl))} vs ${j(shouldWait)}`);
}
check("I3", `for every person x claim (${pairs} pairs over ${E.allExpenses().length} claims), listed in pendingFor <=> decideExpense succeeds; waitingOn == exactly those people`, bad.length === 0, bad.slice(0, 4).join(" | "));
check("I4", "each pending claim waits on exactly one stage's people, never the claimant, never nobody",
  E.allExpenses().filter((x) => x.status === "pending").every((x) => E.waitingOn(x).length > 0 && !E.waitingOn(x).includes(x.userId)));
bad = [];
for (const cl of E.allExpenses()) {
  for (const u of people) {
    const listed = E.payableFor(u.id).some((x) => x.id === cl.id);
    const before3 = snap();
    const can = E.payExpense(cl.id, u.id).ok;
    restore(before3);
    if (listed !== can) bad.push(`${cl.id}/${u.id}: payable ${listed}, pay ${can}`);
  }
  if (cl.status === "approved") {
    const want = people.filter((u) => E.payableFor(u.id).some((x) => x.id === cl.id)).map((u) => u.id).sort();
    if (j(E.waitingOn(cl).sort()) !== j(want)) bad.push(`${cl.id}: waitingOn ${j(E.waitingOn(cl))} vs ${j(want)}`);
  }
}
check("I5", "for every person x claim, listed in payableFor <=> payExpense succeeds; an approved claim's waitingOn == its possible payers", bad.length === 0, bad.slice(0, 4).join(" | "));
fresh();
check("I6", "seed: Kabir may pay EXP-3107 (Aarav's); Aarav nothing (his own); a decided claim waits on nobody",
  j(ids(E.payableFor(KABIR))) === j(["EXP-3107"]) && E.payableFor(AARAV).length === 0 && E.waitingOn(byId["EXP-3102"]).length === 0 && E.waitingOn(byId["EXP-3101"]).length === 0
  && E.waitingOn(null).length === 0);

// =====================================================================
section("J. Cancel");
fresh();
const cx = [E.cancelExpense("EXP-3106", SNEHA), E.cancelExpense("EXP-3107", AARAV), E.cancelExpense("EXP-3101", ARJUN), E.cancelExpense("EXP-9", ARJUN)];
const cancelled = E.cancelExpense("EXP-3106", ARJUN);
check("J1", "only the claimant, only while pending: someone else, an approved, a rejected, an unknown claim refused; Arjun cancels his pending one",
  cx.every((x) => x.ok === false) && /Only the person who sent/.test(cx[0].error) && /already approved/.test(cx[1].error)
  && ok(cancelled) && cancelled.record.status === "cancelled" && cancelled.record.stage === "done"
  && j(stagesOf(cancelled.record).at(-1)) === j(`manager:cancelled:${ARJUN}`) && decide("EXP-3106", SNEHA, "approve").ok === false && !E.pendingFor(SNEHA, "emp").length);

// =====================================================================
section("K. Reads and totals");
fresh();
const got = E.getExpense("EXP-3104");
got.amount = 1; got.history.push({});
check("K1", "expensesFor(Arjun) = his two; allExpenses 7; reads are copies (editing one changes nothing); unknown id -> null",
  j(ids(E.expensesFor(ARJUN))) === j(["EXP-3101", "EXP-3106"]) && E.allExpenses().length === 7 && E.getExpense("EXP-3104").amount === 8400
  && E.getExpense("EXP-3104").history.length === 2 && E.getExpense("EXP-9") === null && E.expensesFor("EMP-9999").length === 0);
const T = E.expenseTotals(E.allExpenses());
check("K2", "expenseTotals(seed): 7 claims ₹88,600; by status pending 4 / ₹77,050, approved 1 / ₹6,200, paid 1 / ₹2,150, rejected 1 / ₹3,200, cancelled 0; by category with every key",
  T.count === 7 && T.amount === 88600 && j(T.byStatus) === j({ pending: { count: 4, amount: 77050 }, approved: { count: 1, amount: 6200 }, paid: { count: 1, amount: 2150 },
    rejected: { count: 1, amount: 3200 }, cancelled: { count: 0, amount: 0 } })
  && j(T.byCategory) === j({ travel: { count: 3, amount: 72250 }, meals: { count: 2, amount: 5350 }, fuel: { count: 1, amount: 4800 }, software: { count: 1, amount: 6200 }, other: { count: 0, amount: 0 } }), j(T));
check("K3", "expenseTotals([]) is all zeros with every key", j(E.expenseTotals([])) === j({ count: 0, amount: 0, byStatus: Object.fromEntries(["pending", "approved", "paid", "rejected", "cancelled"].map((s) => [s, { count: 0, amount: 0 }])),
  byCategory: Object.fromEntries(X.CATEGORY_KEYS.map((k) => [k, { count: 0, amount: 0 }])) }));
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
const D = E.totalsByDepartment(E.allExpenses());
// Round 13H (behavior): Vikram's EXP-3105 (and RG-102) settled before he's deleted; a cancelled claim still counts.
check("K4", "totalsByDepartment(seed): ENG 5 / ₹75,400 (Arjun, Rohan, Aarav), SAL 1 / ₹8,400, OPS 1 / ₹4,800; a deleted claimant counts under ''",
  j(D) === j({ ENG: { count: 5, amount: 75400 }, SAL: { count: 1, amount: 8400 }, OPS: { count: 1, amount: 4800 } })
  && (settleOwn(VIKRAM), S.deleteUser(USER_ACTOR("admin", VIKRAM), VIKRAM), j(E.totalsByDepartment(E.allExpenses())[""]) === j({ count: 1, amount: 4800 })), j(D));
fresh();
submit(ARJUN); decide("EXP-3104", KABIR, "approve");
const changed = E.allExpenses().length === 8;
E.resetExpenseData();
check("K5", "resetExpenseData() puts the seed back (stored under officeos:expense-claims, version 1)", changed && j(E.allExpenses()) === j(seed)
  && JSON.parse(mem.get("officeos:expense-claims")).version === 1);
mem.set("officeos:expense-claims", "{not json");
const quiet = console.error; console.error = () => {};   // storage.js logs the parse error; expected here
const reseeded = E.allExpenses();
console.error = quiet;
check("K6", "a corrupt saved copy is replaced by the seed (collection.js behaviour)", j(reseeded) === j(seed));

// =====================================================================
section("L. Source layout");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(`${dir}/${d.name}`, base) : [`${dir}/${d.name}`.slice(base.length + 1)]));
const root = (d) => new URL(`./${d}`, import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const POST = "js-pre5C";   // Round 5B's result
const live = walk(root(POST)).sort(), pre = walk(root("js-pre5B")).sort();
const changedFiles = live.filter((p) => !pre.includes(p) || src(POST, p) !== src("js-pre5B", p));
check("L1", "the only differences from the code before this round are the two new files", j(changedFiles) === j(["data/expenses-store.js", "data/expenses.js"]) && pre.every((p) => live.includes(p)), j(changedFiles));
const importers = live.filter((p) => !/data\/expenses(-store)?\.js$/.test(p) && /expenses(-store)?\.js/.test(src(POST, p)));
const htmlRefs = walk(root("html-pre5C")).filter((p) => p.endsWith(".html") && /expenses(-store)?\.js/.test(src("html-pre5C", p)));
check("L2", "nothing imports the new files and no page loads them (nothing wired yet)", importers.length === 0 && htmlRefs.length === 0, j({ importers, htmlRefs }));
const storeSrc = src(POST, "data/expenses-store.js");
const resolveCopies = live.filter((p) => /function resolveManager/.test(src(POST, p)));
check("L3", "the manager lookup isn't copied: expenses-store imports managerFor from leave-store, and resolveManager still exists only in leave-store.js",
  /import \{ managerFor \} from "\.\/leave-store\.js"/.test(storeSrc) && j(resolveCopies) === j(["data/leave-store.js"]) && !/reportingManager|MANAGER_OF/.test(storeSrc));
const deps = [...storeSrc.matchAll(/from "\.\/([\w-]+)\.js"/g)].map((m) => m[1]);
check("L4", "no import cycle: none of the store's own imports (direct) import expenses-store", deps.every((d) => !/from "\.\/expenses-store\.js"/.test(src(POST, `data/${d}.js`))), j(deps));
const used = [...new Set([...storeSrc.matchAll(/"(expenses:[\w-]+)"/g)].map((m) => m[1]))].sort();
check("L5", "the permissions the store checks exist in permissions.js (expenses:approve, expenses:pay), and Finance and Admin hold both",
  j(used) === j(["expenses:approve", "expenses:pay"]) && used.every((p) => PERMISSIONS.expenses.includes(p.split(":")[1]))
  && used.every((p) => ROLES.fin.permissions.includes(p) && ROLES.admin.permissions.includes(p)) && !used.some((p) => ROLES.hr.permissions.includes(p)));   // Round 5D: HR has expenses:create (SELF_SERVICE), not these
check("L6", "both new files: CRLF only, no final newline (the tree's convention)",
  ["data/expenses.js", "data/expenses-store.js"].every((p) => { const b = fs.readFileSync(new URL(`./${POST}/${p}`, import.meta.url)); const s = b.toString("utf8"); return !/[^\r]\n/.test(s) && !/\r(?!\n)/.test(s) && !s.endsWith("\n"); }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
