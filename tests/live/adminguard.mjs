// usage: node adminguard.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 9U: only an Admin may give someone the Admin role, and there is always an Admin (9U's investigation: HR could
// save anyone as Administrator, or demote the only Admin, from users/user-form.html). In jsdom with the js in ./js;
// ./js-pre9U, ./html-pre9U and ./css-pre9U are the code, pages and styles before this round (office-os 4f73ccf).
// Clock fixed at Thu 8 Oct 2026 10:00.
//   F  user-form.html: the Administrator designation is offered only to an Admin          (the brief's a)
//   S  store addUser / updateUser with { byRole }: a non-Admin can't save the Admin role;
//      an Admin can; no byRole, as before                                                 (b, c)
//   Z  nobody can take the role away from the last Admin, the Admin included;
//      with two Admins, one may stop being one                                            (d, e)
//   X  the change set: user-form.js and store.js only; no page, no css; no errors
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const RAW = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const SRC = (dir, p) => fs.readFileSync(`${HERE}${dir}/${p}`, "utf8");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 10, 8);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
URL.createObjectURL = () => "blob:test";
URL.revokeObjectURL = () => {};

const WHO = { aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"] };
let loads = 0, w = null, d = null, saved = {};
const jsErrors = [], navigations = [];
async function open(who, page, script, query = "") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => (/navigation/i.test(e.message) ? navigations : jsErrors).push(`${who} ${page}: ${e.message}`));
  const dom = new JSDOM(RAW(page), { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  navigations.length = 0;
  await import(`./js/app.js?load=${loads}`);
  if (script) { try { await import(`./js/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); } }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const walk = (root, rel = "") => fs.readdirSync(`${root}/${rel}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${rel}${e.name}/`) : [`${rel}${e.name}`]));

const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const L = await import("./js/data/leave-store.js");
const E = await import("./js/data/expenses-store.js");
const { DESIGNATIONS } = await import("./js/data/users.js");
const UF = "users/user-form.html";
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", SNEHA = "EMP-1029", ROHAN = "EMP-1042", ARJUN = "EMP-1105";
const $ = (id) => d.getElementById(id);
const options = () => [...$("designation").options].map((o) => o.value).filter(Boolean);
const pick = (title) => { $("designation").value = title; $("designation").dispatchEvent(new w.Event("change")); };
const submit = () => d.querySelector("form").dispatchEvent(new w.Event("submit", { cancelable: true }));
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${t.className.replace("toast toast--", "")}:${txt(t.querySelector(".toast__text"))}`);
const roleOf = (id) => S.getUser(id)?.role;
const admins = () => S.getAllUsers().filter((u) => u.role === "admin").map((u) => u.id);
const ADMIN_ONLY = "Only an Admin can give someone the Admin role or save an Admin's details.";
const LAST_ADMIN = "There must always be an Admin: make someone else an Admin first.";
const ALL_TITLES = DESIGNATIONS.map((x) => x.title);
const NOT_ADMIN_TITLES = DESIGNATIONS.filter((x) => x.defaultRole !== "admin").map((x) => x.title);
const person = (n, extra = {}) => ({ name: `Test ${n}`, email: `test.${n}@northwind.com`, department: "ENG", ...extra });

// =====================================================================
section("F. user-form.html: the Administrator designation is offered only to an Admin");
fresh();
await open("priya", UF, "user-form");
check("F1", "HR opens the form (new employee): no redirect, and every designation but Administrator, in order",
  navigations.length === 0 && j(options()) === j(NOT_ADMIN_TITLES) && NOT_ADMIN_TITLES.length === 9 && !options().includes("Administrator"), j(options()));
await open("priya", UF, "user-form", `?id=${ARJUN}`);
check("F2", "HR editing an employee (Arjun): Administrator isn't offered either", j(options()) === j(NOT_ADMIN_TITLES), j(options()));
await open("aarav", UF, "user-form");
check("F3", "an Admin opens the form: all ten, Administrator included, which still previews as Admin with every permission",
  j(options()) === j(ALL_TITLES) && (pick("Administrator"), $("default-role").value === "Admin" && /^Every permission/.test(txt($("effective-permissions")))), j(options()));
await open("priya", UF, "user-form", `?id=${AARAV}`);
check("F4", "HR editing the Admin (Aarav): his own designation is still shown, reading Admin (Default role), not blank",
  $("designation").value === "Administrator" && $("default-role").value === "Admin" && options().filter((t) => t === "Administrator").length === 1, j([$("designation").value, $("default-role").value]));

// =====================================================================
section("S. The store: { byRole } holds a non-Admin to it; an Admin, or no byRole, as before");
fresh();
await open("priya", "dashboard/hr.html", null);
const n0 = S.getAllUsers().length;
const refusals = [
  S.addUser(USER_ACTOR("hr", null), person("a", { role: "admin" })),
  S.addUser(USER_ACTOR("hr", null), person("b", { designation: "Administrator" })),
  S.updateUser(USER_ACTOR("hr", ARJUN), ARJUN, { role: "admin" }),
  S.updateUser(USER_ACTOR("hr", ARJUN), ARJUN, { designation: "Administrator" }),
  S.addUser(USER_ACTOR("fin", null), person("c", { role: "admin" })),
  S.updateUser(USER_ACTOR("emp", ARJUN), ARJUN, { designation: "Administrator", role: "admin" }),
];
// Round 10Y (decision; was all six refused with ADMIN_ONLY): Finance and an Employee hold no users permission on record, so
// the store refuses them before the Admin-only rule (userguard.mjs G4); HR, who may write users, still gets ADMIN_ONLY
check("S1", "HR on record (four writes) with a record whose role, or whose designation's default role, is admin: refused with the reason; Finance and an Employee: refused before that (round 10Y); nothing saved",
  j(refusals.map((r) => r.ok === false && r.error)) === j([ADMIN_ONLY, ADMIN_ONLY, ADMIN_ONLY, ADMIN_ONLY, "You can't add employees.", "You can't edit employees."]) && S.getAllUsers().length === n0 && roleOf(ARJUN) === "emp" && S.getUser(ARJUN).designation === "Software Engineer",
  j(refusals.map((r) => r.ok || r.error)));
const allowed = [S.addUser(USER_ACTOR("admin", null), person("d", { role: "admin", designation: "Administrator" })), S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { designation: "Administrator", role: "admin" })];
check("S2", "byRole admin, the same records: saved (a new Admin, and Arjun made one)", allowed.every((r) => r.ok) && allowed[0].record.role === "admin" && roleOf(ARJUN) === "admin", j(allowed.map((r) => r.ok || r.error)));
fresh();
await open("priya", "dashboard/hr.html", null);
const plain = [S.addUser(USER_ACTOR("admin", null), person("e", { role: "admin" })), S.updateUser(USER_ACTOR("admin", ROHAN), ROHAN, { role: "admin" })];
check("S3", "no byRole (the seed, scripts, every existing suite call): as before, the role is saved as given", plain.every((r) => r.ok) && plain[0].record.role === "admin" && roleOf(ROHAN) === "admin");
fresh();
await open("priya", "dashboard/hr.html", null);
const ordinary = [S.addUser(USER_ACTOR("hr", null), person("f", { role: "emp", designation: "Software Engineer" })), S.updateUser(USER_ACTOR("hr", ARJUN), ARJUN, { phone: "+91 90000 00000" }),
  S.updateUser(USER_ACTOR("hr", SNEHA), SNEHA, { designation: "HR Manager", role: "hr" })];
check("S4", "byRole hr, records that carry no Admin role: saved as before (a new employee, a phone number, a promotion to HR Manager)", ordinary.every((r) => r.ok) && roleOf(SNEHA) === "hr", j(ordinary.map((r) => r.ok || r.error)));
const aaravEdit = S.updateUser(USER_ACTOR("hr", AARAV), AARAV, { phone: "+91 90000 00001", role: "admin", designation: "Administrator" });
check("S5", "…but a record that is an Admin's, saved as the form saves it (role admin): refused for HR, so HR can't edit an Admin's details",
  aaravEdit.ok === false && aaravEdit.error === ADMIN_ONLY && S.getUser(AARAV).phone !== "+91 90000 00001", j(aaravEdit));

// ---- the form, end to end
fresh();
await open("priya", UF, "user-form", `?id=${ARJUN}`);
const forced = d.createElement("option"); forced.value = "Administrator"; forced.dataset.role = "admin"; $("designation").append(forced);   // a page edited in the browser
pick("Administrator"); submit();
check("S6", "HR forces Administrator into Arjun's form and saves: refused with the reason as a toast; Arjun is still an employee",
  j(toasts()) === j([`danger:${ADMIN_ONLY}`]) && roleOf(ARJUN) === "emp" && S.getUser(ARJUN).designation === "Software Engineer", j(toasts()));
await open("arjun", "dashboard/employee.html", null);
const lv = L.applyLeave(ARJUN, { type: "casual", from: "2026-10-12", to: "2026-10-12", reason: "x" });
check("S7", "…so his own leave still waits for his manager (9U's repro 3: it was approved automatically)", lv.ok && lv.record.status === "pending" && lv.record.stage === "manager", j(lv.record?.history.map((h) => h.decision)));
fresh();
await open("priya", UF, "user-form", `?id=${AARAV}`);
$("phone").value = "+91 90000 00002"; submit();
check("S8", "HR edits the Admin's phone in the form and saves: refused, unchanged (the consequence of S5)", j(toasts()) === j([`danger:${ADMIN_ONLY}`]) && S.getUser(AARAV).phone !== "+91 90000 00002", j(toasts()));
fresh();
await open("aarav", UF, "user-form", `?id=${ARJUN}`);
pick("Administrator"); submit();
check("S9", "the Admin makes Arjun an Administrator in the form: saved, role admin", j(toasts()) === j(["success:Employee saved."]) && roleOf(ARJUN) === "admin", j(toasts()));

// =====================================================================
section("Z. There is always an Admin");
fresh();
await open("aarav", "dashboard/admin.html", null);
const lastTries = [S.updateUser(USER_ACTOR("admin", AARAV), AARAV, { role: "emp" }), S.updateUser(USER_ACTOR("admin", AARAV), AARAV, { role: "emp", designation: "Software Engineer" }), S.updateUser(USER_ACTOR("hr", AARAV), AARAV, { role: "hr" })];
check("Z1", "the only Admin can't stop being one: refused without byRole, by himself (byRole admin) and by HR; still the only Admin",
  lastTries.every((r) => r.ok === false && r.error === LAST_ADMIN) && j(admins()) === j([AARAV]) && S.getUser(AARAV).designation === "Administrator", j(lastTries.map((r) => r.error)));
await open("aarav", UF, "user-form", `?id=${AARAV}`);
pick("Software Engineer"); submit();
check("Z2", "…the Admin demoting himself in the form: refused as a toast", j(toasts()) === j([`danger:${LAST_ADMIN}`]) && roleOf(AARAV) === "admin", j(toasts()));
await open("priya", UF, "user-form", `?id=${AARAV}`);
pick("Software Engineer"); submit();
check("Z3", "…HR demoting him in the form: refused as a toast (9U's repro 5)", j(toasts()) === j([`danger:${LAST_ADMIN}`]) && roleOf(AARAV) === "admin", j(toasts()));
await open("arjun", "dashboard/employee.html", null);
const c = E.submitExpense(ROHAN, { category: "travel", amount: 60000, date: "2026-10-07", reason: "x", receipt: "r.pdf" }).record;
E.decideExpense(c.id, SNEHA, "emp", "approve"); E.decideExpense(c.id, KABIR, "fin", "approve");
check("Z4", "…so a ₹60,000 claim still waits for an Admin after the manager and Finance (9U's repro 7: the Admin stage was skipped)",
  E.getExpense(c.id).status === "pending" && E.getExpense(c.id).stage === "admin", j(E.getExpense(c.id).history.map((h) => `${h.stage}:${h.decision}`)));

fresh();
await open("aarav", "dashboard/admin.html", null);
const second = S.addUser(USER_ACTOR("admin", null), person("g", { role: "admin", designation: "Administrator" })).record;
await open("aarav", UF, "user-form", `?id=${AARAV}`);
pick("Software Engineer"); submit();
check("Z5", "with two Admins, one may stop being one: Aarav demotes himself in the form, saved", j(toasts()) === j(["success:Employee saved."]) && roleOf(AARAV) === "emp" && j(admins()) === j([second.id]), j(toasts()));
const thenLast = [S.updateUser(USER_ACTOR("admin", second.id), second.id, { role: "emp" }), S.deleteUser(USER_ACTOR("admin", second.id), second.id)];
check("Z6", "…and the one left is now the last: demoting or deleting them is refused", thenLast.every((r) => r.ok === false && r.error === LAST_ADMIN) && j(admins()) === j([second.id]), j(thenLast.map((r) => r.error)));
const back = S.updateUser(USER_ACTOR("admin", AARAV), AARAV, { role: "admin", designation: "Administrator" });
const del = S.deleteUser(USER_ACTOR("admin", second.id), second.id);
check("Z7", "…once there are two again, the other may be deleted", back.ok && del.ok && j(admins()) === j([AARAV]), j([back.ok, del.ok || del.error]));
fresh();
await open("aarav", "dashboard/admin.html", null);
// Round 12P (fixture; was addUser with status "inactive", which 12P refuses): added active, then marked inactive in
// storage: the same stored record, with no last working day.
const asleep = S.addUser(USER_ACTOR("admin", null), person("h", { role: "admin" })).record;
{ const k = Object.keys(w.localStorage).find((x) => x.endsWith("users")), box = JSON.parse(w.localStorage.getItem(k));
  box.records.find((u) => u.id === asleep.id).status = asleep.status = "inactive"; w.localStorage.setItem(k, JSON.stringify(box)); }
// Round 9Y (behavior; was Round 9U Z8 "the rule counts everyone with role admin on record, as worded: with an inactive
// second Admin, Aarav may be demoted"): only active Admins count now, so he is the last one (deactguard Z1)
const z8 = S.updateUser(USER_ACTOR("admin", AARAV), AARAV, { role: "emp" });
check("Z8", "the rule counts only active Admins: with an inactive second Admin, Aarav may NOT be demoted; both still Admins",
  z8.ok === false && z8.error === LAST_ADMIN && j(admins()) === j([AARAV, asleep.id]), j(z8.error ?? "ok"));
fresh();
await open("aarav", UF, "user-form", `?id=${AARAV}`);
$("phone").value = "+91 90000 00003"; submit();
const own = [S.updateUser(USER_ACTOR("admin", AARAV), AARAV, { phone: "+91 90000 00004" }), S.updateUser(USER_ACTOR("admin", AARAV), AARAV, { location: "Remote" })];
check("Z9", "the only Admin may still edit his own details, in the form (role unchanged) and through the store (no role given): saved",
  j(toasts()) === j(["success:Employee saved."]) && own.every((r) => r.ok) && S.getUser(AARAV).phone === "+91 90000 00004" && roleOf(AARAV) === "admin", j([toasts(), own.map((r) => r.ok || r.error)]));

// =====================================================================
section("X. Change set and hygiene");
// Round 9V (layout; was the live js vs js-pre9U, here and in X1 / X3 / X4): 9U's own change set, read from its frozen
// result (js-pre9V = HEAD 0518d14); the live js has 9V's seven files since (managerid.mjs X1)
const changedJs = walk(`${HERE}js-pre9V`).filter((f) => SRC("js-pre9V", f) !== SRC("js-pre9U", f)).sort();
// Round 11B (layout; was the live pages, here and in the check below): this round's own page claim, read from its
// frozen result (html-pre11B = HEAD 97e1e6c); the live pages have 11B's sessions.html banner since (acctpages.mjs X2)
const changedHtml = walk(`${HERE}html-pre11B`).filter((f) => f.endsWith(".html") && SRC("html-pre11B", f) !== SRC("html-pre9U", f)).sort();
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const cssRoot = `${HERE}css-pre13U`;
const changedCss = walk(cssRoot).filter((f) => fs.readFileSync(`${cssRoot}/${f}`, "utf8") !== SRC("css-pre9U", f));
check("X1", "js changed: exactly pages/user-form.js and data/store.js; nothing added or removed",
  j(changedJs) === j(["data/store.js", "pages/user-form.js"]) && j(walk(`${HERE}js-pre9V`).sort()) === j(walk(`${HERE}js-pre9U`).sort()), j(changedJs));
check("X2", "no page and no css changed; nothing added or removed", changedHtml.length === 0 && changedCss.length === 0 && j(walk(`${HERE}html-pre11B`).sort()) === j(walk(`${HERE}html-pre9U`).sort()), j([changedHtml, changedCss]));
check("X3", "the two are CRLF only, with no final newline", changedJs.map((f) => SRC("js-pre9V", f)).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
// Each file's lines, as a multiset: the lines 9U replaced must be exactly these, and it adds exactly this many (the
// added lines themselves are what F / S / Z check by behaviour), so an edit anywhere else in either file shows here.
const lineDelta = (f) => {
  const count = (s) => s.split("\r\n").reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const a = count(SRC("js-pre9U", f)), b = count(SRC("js-pre9V", f));
  const minus = (x, y) => [...x].flatMap(([l, n]) => Array(Math.max(0, n - (y.get(l) ?? 0))).fill(l));
  return { removed: minus(a, b), added: minus(b, a).length };
};
const EXPECTED = {
  "data/store.js": { removed: ['import { USERS, DEPARTMENTS, PROFILE_DETAILS, MANAGER_OF } from "./users.js";', "export function addUser(fields = {}) {", "export function updateUser(id, changes = {}) {"], added: 21 },
  "pages/user-form.js": { removed: ["function ensureOption(select, value, label = value) {", "  DESIGNATIONS.map((d) => ({ value: d.title, label: d.title, role: d.defaultRole })));",
    "  ensureOption(designationSelect, editing.designation);", "    const result = editing ? updateUser(editing.id, record) : addUser(record);"], added: 10 },
};
check("X4", "…and within them, only 9U's lines: store.js replaces 3 lines and adds 21; user-form.js replaces 4 and adds 10",
  Object.entries(EXPECTED).every(([f, e]) => j(lineDelta(f)) === j(e)), j(Object.fromEntries(Object.keys(EXPECTED).map((f) => [f, lineDelta(f)]))));
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
