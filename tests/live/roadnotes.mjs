// usage: node roadnotes.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 11N: items 1-3 of 11M's roadmap. ./js-pre11N, ./html-pre11N and ./css-pre11N are the code, pages and css
// before this round (office-os fcdc960).
//   O  O10.3 (10N N7 / 10O O10.3): removing a holiday inside approved leave can take a balance over its allowance.
//      leave-store's overAllowanceIfWorking(date) says who; the holidays page's Remove confirm names them (the removal
//      is still allowed); applyLeave's refusal for an already-over balance says "none … free, N over".
//   U  10Y Y6.1 / Y6.4: users:delete (Admin only), checked on the actor's record; self-deletion refused after the
//      demo-identity and Admin rules; a Delete button on user-profile; a deleted person's records stay (as a
//      deactivated person's) and nothing breaks.
//   P  10U U4a / U4b: PT capped so net pay can't go below zero; checkSalary(), the whole-rupee rule for any future
//      salary write. Every seeded payroll row unchanged.
//   X  scope: exactly the seven scripts and user-profile.html.
// A fixed clock: Mon 2 Nov 2026 10:00 local time.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
const NOW = new RealDate(2026, 10, 2, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

let writes = [];
const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { writes.push(k.replace("officeos:", "")); mem.set(k, String(v)); }, removeItem: (k) => { writes.push(`-${k.replace("officeos:", "")}`); mem.delete(k); }, clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
let loads = 0, w = null, d = null, navigations = [], confirms = [], confirmAnswer = true;
const allJsErrors = [];
const AARAV = ["admin", "Aarav Mehta", "EMP-1001"], PRIYA = ["hr", "Priya Nair", "EMP-1003"], ARJUN = ["emp", "Arjun Kapoor", "EMP-1105"];
// Opens a page from `dir` with the js under `js` (./js or ./js-pre11N), signed in as `who`, on the shared storage
// (not cleared: a test sets its data up first), running the module scripts its HTML loads.
async function open(page, { dir = DIR, js = "js", who = AARAV, query = "" } = {}) {
  const vc = new VirtualConsole();
  navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message.slice(0, 60)); else if (!/form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${dir}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = (q) => { confirms.push(q); return confirmAnswer; };
  w.HTMLElement.prototype.scrollIntoView = () => {};
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, HTMLElement: w.HTMLElement });
  loads++;
  (await import(`./${js}/core/auth.js`)).signIn(...who);
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) await import(`./${js}/${m[1]}?load=${loads}`);
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const norm = (s) => (s ?? "").replace(/\s+/g, " ").trim();
const fresh = () => { mem.clear(); timers = []; writes = []; confirms = []; confirmAnswer = true; };
const html = (dir, page) => fs.readFileSync(`${dir}/${page}.html`, "utf8");
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${["success", "danger", "warning", "info"].find((k) => t.className.includes(`toast--${k}`)) ?? "?"}: ${t.querySelector(".toast__text").textContent.trim()}`);
// Fresh module instances (a new query string) for store-level checks, so they read the current storage.
let mods = 0;
const load = async (js, f) => import(`./${js}/data/${f}?m=${++mods}`);
const stores = async (js = "js") => ({ S: await load(js, "store.js"), L: await load(js, "leave-store.js"), H: await load(js, "holidays.js") });

// =================================================================
section("O. O10.3: a holiday's removal that takes approved leave over its allowance");
const HOL = "2026-12-15";   // a Tuesday; the seed has no future weekday closed holiday (Diwali 8 Nov is a Sunday, Christmas optional)
async function overSetup(js = "js", from = "2026-12-14", to = "2026-12-30") {
  fresh();
  const { L, H } = await stores(js);
  const add = H.addHoliday("EMP-1001", { date: HOL, name: "Test holiday", kind: "company" });
  const r = L.applyLeave("EMP-1001", { type: "casual", from, to, duration: "full", reason: "roadnotes" });
  return { L, H, add, r, hol: H.getAllHolidays().find((h) => h.date === HOL) };
}
let o = await overSetup();
const over = o.L.overAllowanceIfWorking?.(HOL);   // ?.: a tree without the fix fails these checks rather than crashing
check("O1", "Aarav books his whole 12 casual days across a company holiday (Tue 15 Dec): removing it would take him to 13 of 12, and overAllowanceIfWorking says so",
  o.add.ok && o.r.ok && o.r.record.status === "approved" && o.L.balanceFor("EMP-1001", 2026).casual.approved === 12
  && j(over) === j([{ userId: "EMP-1001", type: "casual", period: "2026", approved: 12, after: 13, allowance: 12 }]), j({ add: o.add.ok, r: o.r.ok, over }));
// Aarav's leave also covers Sat 19 Dec and Christmas (optional): a holiday there gives no day back, so nobody goes over.
const satAdd = o.H.addHoliday("EMP-1001", { date: "2026-12-19", name: "Saturday holiday", kind: "company" });
const quiet = ["2026-12-19", "2026-12-25", "2026-11-08", "2026-12-16", "bad"].map((x) => o.L.overAllowanceIfWorking?.(x));
check("O2", "…and nobody for a holiday on a Saturday or an optional one (Christmas) inside his leave, a Sunday holiday (Diwali, 8 Nov), a working day, or a bad date",
  satAdd.ok && quiet.every((x) => j(x) === "[]"), j(quiet));
// 11 days booked across it: removing it brings him to exactly 12 of 12, which is the allowance, not over it.
o = await overSetup("js", "2026-12-14", "2026-12-29");
const within = { booked: o.L.balanceFor("EMP-1001", 2026).casual.approved, over: o.L.overAllowanceIfWorking?.(HOL) };
// Aarav's own unpaid leave (approved at once) over the holiday: no allowance to go over.
fresh();
let s0 = await stores();
s0.H.addHoliday("EMP-1001", { date: HOL, name: "Test holiday", kind: "company" });
const unpaid = s0.L.applyLeave("EMP-1001", { type: "unpaid", from: "2026-12-14", to: "2026-12-16", duration: "full", reason: "roadnotes" });
const unpaidOver = s0.L.overAllowanceIfWorking?.(HOL);
// Kabir already at his allowance, with a request still pending over the holiday: only approved leave over it counts.
// (Reached legitimately: another holiday inside his approved leave gave a day back, he asked for it over the test
// holiday, then that other holiday was removed again.)
fresh();
s0 = await stores();
s0.H.addHoliday("EMP-1001", { date: HOL, name: "Test holiday", kind: "company" });
s0.H.addHoliday("EMP-1001", { date: "2026-11-20", name: "Another holiday", kind: "company" });
const kab = s0.L.applyLeave("EMP-1008", { type: "casual", from: "2026-11-16", to: "2026-12-01", duration: "full", reason: "roadnotes" });
for (let i = 0; i < 4 && kab.ok && s0.L.getRequest(kab.record.id).status === "pending"; i++) {
  for (const [id, role] of [["EMP-1001", "admin"], ["EMP-1003", "hr"]]) if (s0.L.getRequest(kab.record.id).status === "pending") s0.L.decideLeave(kab.record.id, id, role, "approve");
}
const kabPend = s0.L.applyLeave("EMP-1008", { type: "casual", from: "2026-12-14", to: "2026-12-15", duration: "full", reason: "roadnotes" });
s0.H.removeHoliday("EMP-1001", s0.H.getAllHolidays().find((h) => h.date === "2026-11-20")?.id);
const kabBal = s0.L.balanceFor("EMP-1008", 2026).casual;
const pendOver = s0.L.overAllowanceIfWorking?.(HOL);
check("O3", "…nor 11 days booked (removing it makes exactly 12 of 12, the allowance), unpaid leave (no allowance), or a request still pending, even from someone already at 12 of 12 (only approved leave counts)",
  within.booked === 11 && j(within.over) === "[]" && unpaid.ok && unpaid.record.status === "approved" && j(unpaidOver) === "[]"
  && kab.ok && s0.L.getRequest(kab.record.id).status === "approved" && kabPend.ok && kabPend.record.status === "pending" && kabBal.approved === 12 && kabBal.pending === 1 && j(pendOver) === "[]",
  j({ within, unpaid: unpaid.record?.status, unpaidOver, kab: s0.L.getRequest(kab.record?.id)?.status, kabPend: kabPend.record?.status ?? kabPend.error, kabBal, pendOver }));
// The page: Remove's confirm names who'd go over; declining keeps the holiday; accepting removes it (still allowed).
o = await overSetup();
await open("leave/holidays");
const removeBtn = () => [...d.querySelectorAll("button")].find((b) => /Remove/.test(b.textContent) && b.closest(".list__item")?.textContent.includes("Test holiday"));
confirmAnswer = false; confirms = [];
removeBtn()?.click();
const declined = { confirms: [...confirms], still: (await stores()).H.getAllHolidays().some((h) => h.date === HOL), t: toasts() };
const WARN = "Remove Test holiday on 15 Dec 2026?\n\nApproved leave covers this day, so it would count against that leave again. This person would go over their allowance:\nAarav Mehta: casual leave 2026, 13 of 12 days";
check("O4", "the holidays page: Remove's confirm names who'd go over and by how much; declining keeps the holiday, says nothing",
  declined.confirms.length === 1 && declined.confirms[0] === WARN && declined.still && declined.t.length === 0, j(declined.confirms));
confirmAnswer = true; confirms = [];
removeBtn()?.click();
const after = (await stores()).L.balanceFor("EMP-1001", 2026).casual;
check("O5", "…accepting still removes it ('Holiday removed.'), and the balance is then honestly 13 of 12",
  j(toasts().slice(-1)) === j(["success: Holiday removed."]) && !(await stores()).H.getAllHolidays().some((h) => h.date === HOL) && after.approved === 13 && after.left === -1, j([toasts(), after]));
fresh();
s0 = await stores();
s0.H.addHoliday("EMP-1001", { date: HOL, name: "Test holiday", kind: "company" });
await open("leave/holidays");
confirmAnswer = false; confirms = [];
removeBtn()?.click();
check("O6", "…and with no leave over it, the confirm is exactly as before: 'Remove Test holiday on …?'", j(confirms) === j(["Remove Test holiday on 15 Dec 2026?"]), j(confirms));
// Already over: the next casual request's refusal.
o = await overSetup();
o.H.removeHoliday("EMP-1001", o.hol.id);
const refusal = o.L.applyLeave("EMP-1001", { type: "casual", from: "2026-11-30", to: "2026-11-30", duration: "full", reason: "roadnotes" });
check("O7", "a casual day asked for once over: 'Not enough casual leave: none of 12 days free in 2026, 1 over (13 approved, 0 pending), and this request is 1.'",
  refusal.error === "Not enough casual leave: none of 12 days free in 2026, 1 over (13 approved, 0 pending), and this request is 1.", refusal.error);
fresh();
s0 = await stores();
const full = s0.L.applyLeave("EMP-1001", { type: "casual", from: "2026-12-14", to: "2026-12-29", duration: "full", reason: "roadnotes" });
const atZero = s0.L.applyLeave("EMP-1001", { type: "casual", from: "2026-11-30", to: "2026-11-30", duration: "full", reason: "roadnotes" });
check("O8", "…while a balance exactly used up still reads as before: '0 of 12 days free in 2026 (12 approved, 0 pending)…'",
  full.ok && atZero.error === "Not enough casual leave: 0 of 12 days free in 2026 (12 approved, 0 pending), and this request is 1.", atZero.error);
o = await overSetup("js-pre11N");
o.H.removeHoliday("EMP-1001", o.hol.id);
const oldRefusal = o.L.applyLeave("EMP-1001", { type: "casual", from: "2026-11-30", to: "2026-11-30", duration: "full", reason: "roadnotes" });
check("O9", "before 11N, side by side: the same refusal said '-1 of 12 days free', and the leave store had no overAllowanceIfWorking",
  /: -1 of 12 days free in 2026/.test(oldRefusal.error) && typeof o.L.overAllowanceIfWorking === "undefined", oldRefusal.error);

// =================================================================
section("U. users:delete, Admin only; no self-deletion; a Delete button");
const { ALL_PERMISSIONS } = await import("./js/config/permissions.js");
const { ROLES } = await import("./js/config/roles.js");
check("U1", "users:delete is a permission, held by the Admin only (Admin holds them all; HR, Finance and Employee don't)",
  ALL_PERMISSIONS.includes("users:delete") && ROLES.admin.permissions.includes("users:delete") && ["hr", "fin", "emp"].every((r) => !ROLES[r].permissions.includes("users:delete"))
  && ROLES.hr.permissions.includes("users:deactivate"), j(Object.keys(ROLES).filter((r) => ROLES[r].permissions.includes("users:delete"))));
fresh();
let { S } = await stores();
const byHr = S.deleteUser("EMP-1003", "EMP-1042");
const deact = S.deactivateUser("EMP-1003", "EMP-1042", LEAVING_11Y()), react = S.reactivateUser("EMP-1003", "EMP-1042");
const byAdmin = S.deleteUser("EMP-1001", "EMP-1042");
check("U2", "HR can no longer delete (users:delete), though it still deactivates and reactivates (users:deactivate); the Admin deletes Rohan",
  byHr.error === "You can't delete employees." && deact.ok && react.ok && byAdmin.ok && !S.getAllUsers().some((u) => u.id === "EMP-1042"), j([byHr, deact.ok, react.ok, byAdmin.ok]));
fresh();
({ S } = await stores());
const promote = S.updateUser("EMP-1001", "EMP-1042", { role: "admin" });
const self = S.deleteUser("EMP-1042", "EMP-1042");
const selfProtected = S.deleteUser("EMP-1001", "EMP-1001");
const selfDeact = S.deactivateUser("EMP-1042", "EMP-1042", LEAVING_11Y());
check("U3", "self-deletion is refused ('You can't delete your own account.', as self-deactivation is), after the demo-identity rule (Aarav on himself gets that one)",
  promote.ok && self.error === "You can't delete your own account." && selfProtected.error === "EMP-1001 is a demo sign-in identity and can't be deleted."
  && selfDeact.error === "You can't deactivate your own account." && S.getAllUsers().some((u) => u.id === "EMP-1042"), j([self.error, selfProtected.error, selfDeact.error]));
fresh();
({ S } = await stores("js-pre11N"));
const oldHr = S.deleteUser("EMP-1003", "EMP-1042");
fresh();
({ S } = await stores("js-pre11N"));
S.updateUser("EMP-1001", "EMP-1042", { role: "admin" });
const oldSelf = S.deleteUser("EMP-1042", "EMP-1042");
check("U4", "before 11N, side by side: HR could delete Rohan (users:deactivate), and an Admin could delete themselves", oldHr.ok && oldSelf.ok, j([oldHr.ok, oldSelf.ok]));
// The page.
const btn = (text) => [...d.querySelectorAll(".page-header__actions button")].find((b) => norm(b.textContent) === text);
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
fresh();
await open("users/user-profile", { query: "?id=EMP-1042" });
settleOwn("EMP-1042");   // Round 13H (behavior): Rohan's own LV-2189 / EXP-3103 settled before Delete
const shownAdmin = btn("Delete") && !btn("Delete").hidden;
confirmAnswer = false; confirms = [];
btn("Delete")?.click();
const declinedDel = { confirms: [...confirms], still: (await stores()).S.getUser("EMP-1042") !== null, t: toasts() };
confirmAnswer = true; confirms = []; timers = []; writes = [];
btn("Delete")?.click();
const t1 = toasts(); timers.splice(0).forEach((fn) => fn());
check("U5", "user-profile as Aarav: Delete shown; the confirm asks; declining keeps Rohan; accepting deletes him ('Rohan Gupta deleted.') and goes back to the users list",
  // Round 12T (behavior; was the first paragraph alone): Rohan holds AST-0119, so 12S's sentence follows after a blank line (round-12s-notes.md S9 (a))
  shownAdmin && j(declinedDel.confirms) === j(["Delete Rohan Gupta? They'll be removed from the employee list. Only Reset demo data brings them back.\n\nThey still hold AST-0119 (MacBook Pro 14\"). Take it back on Asset assignment."]) && declinedDel.still && declinedDel.t.length === 0
  && j(t1) === j(["success: Rohan Gupta deleted."]) && (await stores()).S.getUser("EMP-1042") === null && navigations.length === 1 && writes.includes("users"), j({ declinedDel, t1, navigations }));
fresh();
await open("users/user-profile", { query: "?id=EMP-1042", who: PRIYA });
check("U6", "as Priya (HR): Delete hidden; Deactivate still shown", btn("Delete")?.hidden === true && btn("Deactivate")?.hidden === false, j([btn("Delete")?.hidden, btn("Deactivate")?.hidden]));
fresh();
await open("users/user-profile", { query: "?id=EMP-1001" });
confirms = [];
btn("Delete")?.click();
const ownT = toasts();
fresh();
await open("users/user-profile", { query: "?id=EMP-1105" });
confirms = [];
btn("Delete")?.click();
// Round 13P (behaviour; G4.3): Arjun's refusal comes at once, with no confirm (it was asked, then refused)
check("U7", "Aarav on his own profile: 'You can't delete your own account.' without a confirm; on Arjun (a demo identity): the store's refusal, without a confirm (13P), Arjun kept",
  j(ownT) === j(["danger: You can't delete your own account."]) && confirms.length === 0 && j(toasts()) === j(["danger: EMP-1105 is a demo sign-in identity and can't be deleted."]) && (await stores()).S.getUser("EMP-1105") !== null, j([ownT, toasts()]));
fresh();
await open("users/user-profile", { query: "?id=EMP-1042", dir: `${HERE}html-pre11N`, js: "js-pre11N" });
check("U8", "before 11N, side by side: no Delete button on the profile", !btn("Delete"));
// Orphans: delete Sneha (Arjun's manager) with his leave waiting at her stage, and Rohan with his salary.
fresh();
let st = await stores();
const asked = st.L.applyLeave("EMP-1105", { type: "casual", from: "2026-11-20", to: "2026-11-20", duration: "full", reason: "roadnotes" });
const P0 = await load("js", "payroll-store.js");
const inv = await load("js", "inventory-store.js");
const heldBefore = { sneha: inv.assetsFor("EMP-1029").map((a) => a.tag), rohan: inv.assetsFor("EMP-1042").map((a) => a.tag) };
// Round 13H (behavior): their own open requests settled first; Arjun's leave waiting on Sneha is untouched.
settleOwn("EMP-1029"); settleOwn("EMP-1042");
const delSneha = st.S.deleteUser("EMP-1001", "EMP-1029"), delRohan = st.S.deleteUser("EMP-1001", "EMP-1042");
st = await stores();
const P1 = await load("js", "payroll-store.js"), inv1 = await load("js", "inventory-store.js");
const req = st.L.getRequest(asked.record.id);
const waiting = st.L.pendingFor("EMP-1003", "hr").map((r) => r.id).concat(st.L.pendingFor("EMP-1001", "admin").map((r) => r.id));
const decided = st.L.decideLeave(asked.record.id, "EMP-1003", "hr", "approve");
const run = P1.payrollRun(2026, 11);
check("U9", "a deleted person's records stay, as a deactivated person's do: Rohan's salary SAL-7 kept and unread (out of the run, no payslips); Arjun's leave waiting on deleted Sneha still reaches HR / Admin and Priya decides it",
  asked.ok && delSneha.ok && delRohan.ok && P1.allSalaries().some((x) => x.id === "SAL-7") && !run.rows.some((r) => r.userId === "EMP-1042") && P1.payslipsFor("EMP-1042", "2026-11-02").length === 0
  && req.userId === "EMP-1105" && waiting.includes(asked.record.id) && decided.ok, j({ waiting: waiting.includes(asked.record.id), decided: decided.ok, stage: decided.record?.stage }));
const heldNow = [...heldBefore.sneha, ...heldBefore.rohan];
const inactiveHeld = inv1.assetsHeldByInactive().map((a) => a.tag);
check("U10", "…assets they held stay assigned and are listed as held by someone no longer on the list (asset-assignment's warning, 10E)",
  heldNow.every((t) => inactiveHeld.includes(t)), j({ heldNow, inactiveHeld }));
const errsBefore = allJsErrors.length;
for (const [page, who, query] of [["requests/approvals-inbox", PRIYA, ""], ["leave/leave-approvals", PRIYA, ""], ["attendance/team-attendance", AARAV, ""], ["users/users-list", AARAV, ""],
  ["payroll/payroll-run", AARAV, ""], ["inventory/asset-assignment", AARAV, ""], ["dashboard/admin", AARAV, ""], ["dashboard/hr", PRIYA, ""], ["leave/my-leave", ARJUN, ""], ["users/user-profile", AARAV, "?id=EMP-1042"], ["users/user-profile", AARAV, "?id=EMP-1105"]]) {
  await open(page, { who, query }); timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} timer: ${e.message}`); } });
}
check("U11", "…and with both deleted, the inbox, leave approvals, team attendance, users list, payroll run, asset assignment, both dashboards, Arjun's leave and the profiles all load without an error",
  allJsErrors.length === errsBefore, allJsErrors.slice(errsBefore).join(" | "));

// =================================================================
section("P. payroll: net can't go below zero; whole-rupee salaries");
const PAY = await load("js", "payroll.js"), PAY0 = await load("js-pre11N", "payroll.js");
let neg = 0, changedAbove = 0, worst = null;
for (let g = 0; g <= 20000; g++) for (const [wd, lop] of [[21, 0], [22, 21.5], [20, 3]]) {
  const p = PAY.computePay(g, { workingDays: wd, unpaidLeaveDays: lop }), p0 = PAY0.computePay(g, { workingDays: wd, unpaidLeaveDays: lop });
  if (p.net < 0) { neg++; worst ??= [g, wd, lop, p.net]; }
  if (p0.net >= 0 && j(p) !== j(p0)) changedAbove++;
}
const g1 = PAY.computePay(1, { workingDays: 21 }), g1old = PAY0.computePay(1, { workingDays: 21 });
check("P1", "net pay never goes below zero (every monthly gross ₹0–₹20,000, with no LOP, nearly all LOP, some LOP): at ₹1, PT is ₹1 and net ₹0 (it was −₹199)",
  neg === 0 && g1.deductionLines.pt === 1 && g1.net === 0 && g1old.net === -199, j({ neg, worst, g1: g1.deductionLines, old: g1old.net }));
check("P2", "…and wherever net wasn't negative before, every figure is exactly what it was (the cap only bites where PT would have pushed net below zero)", changedAbove === 0, String(changedAbove));
fresh();
const PS = await load("js", "payroll-store.js");
const PS0 = await load("js-pre11N", "payroll-store.js");
const S2 = await load("js", "store.js");
// Round 11W (shape): payrollRunFor's attendance block gains pausedLateMarks (G4's pause); the code compared with has
// none, so it's left out here (every figure is still compared).
const noPause = (row) => (row?.attendance ? { ...row, attendance: Object.fromEntries(Object.entries(row.attendance).filter(([k]) => k !== "pausedLateMarks")) } : row);
const noPauseRun = (run) => (run ? { ...run, rows: run.rows.map(noPause) } : run);
const A2 = await load("js", "attendance-store.js");
{ const r = A2.decideRegularization("RG-102", "EMP-1003", "hr", "reject", "Decided before the clock (round 11W)"); if (!r.ok) throw new Error(`round 11W restage, RG-102: ${r.error}`); }   // Round 11W (restage): RG-102 rejected at 2 Nov 10:00
let rows = 0, diff = [];
for (const u of S2.getAllUsers()) for (let m = 1; m <= 11; m++) { const a = PS.payrollRunFor(u.id, 2026, m), b = PS0.payrollRunFor(u.id, 2026, m); if (a || b) { rows++; if (j(noPause(a)) !== j(b)) diff.push(`${u.id} ${m}`); } }
check("P3", "every seeded payroll row, Jan–Nov 2026 for everyone, is identical to before 11N", rows > 90 && diff.length === 0, j({ rows, diff: diff.slice(0, 5) }));
const cs = [92000, 92000.5, 0, -5, "92000", NaN, 2 ** 60, undefined].map((g) => PS.checkSalary?.({ gross: g }) ?? { ok: null });
check("P4", "checkSalary: ₹92,000 passes; ₹92,000.50, 0, negative, text, NaN, an unsafe integer and a missing gross are refused, naming the field",
  cs[0].ok === true && cs.slice(1).every((r) => r.ok === false && r.field === "gross" && r.error === "Enter the monthly gross in whole rupees, more than ₹0."), j(cs.map((r) => r.ok)));
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const callers = walk(`${HERE}js`).filter((f) => f !== "data/payroll-store.js" && /checkSalary/.test(SRC("js", f)));
// Round 11T (layout; layout; was the live payroll-store.js's exports: read from the frozen result js-pre11T = HEAD 75fa644; 11T adds the stored-run functions, the live tree has 11T's stored payroll runs since (payruns.mjs X1 / X2))
const exportsNow = Object.keys(await load("js-pre11T", "payroll-store.js")).sort(), exportsOld = Object.keys(PS0).sort();
check("P5", "…nothing calls it yet (no salary writer exists), and payroll-store's only new export is checkSalary: still no write path",
  callers.length === 0 && j(exportsNow) === j([...exportsOld, "checkSalary"].sort()), j({ callers, added: exportsNow.filter((x) => !exportsOld.includes(x)) }));
check("E1", "no JS errors on any load", allJsErrors.length === 0, allJsErrors.join(" | "));

// =================================================================
section("X. Scope: exactly 11N's lines");
const JS_CHANGED = ["config/permissions.js", "data/leave-store.js", "data/payroll-store.js", "data/payroll.js", "data/store.js", "pages/holidays.js", "pages/user-profile.js"];
// Round 11P (layout; layout; was the live js: read from the frozen result js-pre11P = HEAD 3a1eb42, the live tree has 11P's core/auth.js and core/guard.js since (recordrole.mjs X1))
const changedJs = walk(`${HERE}js-pre11P`).filter((f) => !fs.existsSync(`${HERE}js-pre11N/${f}`) || SRC("js-pre11P", f) !== SRC("js-pre11N", f)).sort();
const PRE = `${HERE}html-pre11N`;
// Round 11R (layout; layout; was the live pages: read from the frozen result html-pre11P = HEAD 3a1eb42, the live tree has 11R's permission overrides since (overrides.mjs X1))
const POST = `${HERE}html-pre11P`;
const changedHtml = walk(POST).filter((f) => !fs.existsSync(`${PRE}/${f}`) || fs.readFileSync(`${POST}/${f}`, "utf8") !== fs.readFileSync(`${PRE}/${f}`, "utf8")).sort();
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre11N", f)) : [];
check("X1", "js changed: exactly permissions.js, leave-store, payroll-store, payroll, store, pages/holidays and pages/user-profile; nothing added or removed",
  j(changedJs) === j(JS_CHANGED) && j(walk(`${HERE}js-pre11P`).sort()) === j(walk(`${HERE}js-pre11N`).sort()), j(changedJs));
const up = html(POST, "users/user-profile"), up0 = html(PRE, "users/user-profile");
const DEL = '      <button class="btn btn--danger" type="button" data-permission="users:delete">Delete</button>\r\n';
const DEACT = '      <button class="btn btn--danger" type="button" data-permission="users:deactivate">Deactivate</button>\r\n';
check("X2", "pages changed: exactly users/user-profile.html, by the one Delete button after Deactivate; no css; nothing added or removed",
  j(changedHtml) === j(["users/user-profile.html"]) && up0.split(DEACT).length === 2 && up0.replace(DEACT, DEACT + DEL) === up && changedCss.length === 0 && j(walk(POST).sort()) === j(walk(PRE).sort()), j([changedHtml, changedCss]));
check("X3", "all eight CRLF only; each final newline as before",
  JS_CHANGED.every((f) => !/[^\r]\n/.test(SRC("js", f)) && SRC("js", f).endsWith("\n") === SRC("js-pre11N", f).endsWith("\n")) && !/[^\r]\n/.test(up) && up.endsWith("\n") === up0.endsWith("\n"));
const cnt = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
// Round 11R (layout; layout; was the live js: read from the frozen result js-pre11P = HEAD 3a1eb42, the live tree has 11R's permission overrides since (overrides.mjs X1))
const delta = (f) => { const A0 = cnt(SRC("js-pre11N", f).split("\r\n")), B0 = cnt(SRC("js-pre11P", f).split("\r\n")); return [[...A0].flatMap(([l, n]) => Array(Math.max(0, n - (B0.get(l) ?? 0))).fill(l)).length, [...B0].reduce((s, [l, n]) => s + Math.max(0, n - (A0.get(l) ?? 0)), 0)]; };
const deltas = Object.fromEntries(JS_CHANGED.map((f) => [f, delta(f)]));
check("X4", "…and within each script only 11N's lines (removed / added): permissions 1/1, leave-store 2/26, payroll-store 3/18, payroll 2/4, store 3/6, holidays page 1/14, user-profile page 3/26",
  j(deltas) === j({ "config/permissions.js": [1, 1], "data/leave-store.js": [2, 26], "data/payroll-store.js": [3, 18], "data/payroll.js": [2, 4], "data/store.js": [3, 6], "pages/holidays.js": [1, 14], "pages/user-profile.js": [3, 26] }), j(deltas));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
