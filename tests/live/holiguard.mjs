// usage: node holiguard.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 10W: the holiday writes check the acting person's stored record (10N N1). ./js-pre10W, ./html-pre10W and
// ./css-pre10W are the code, pages and css before this round (office-os eba4336).
// addHoliday(actorUserId, fields) and removeHoliday(actorUserId, id) refuse unless that person is active and their role
// on record holds holidays:manage; the holidays page passes the signed-in person's id. An authorised call does exactly
// what it did before.
//   G  the guard: 10N's two cases (an Employee calling the store; a demoted HR session), deactivated, promoted, every
//      role, the permission itself, and the guard coming before every other check
//   B  behaviour unchanged for an authorised actor: every add / remove result and the stored calendar equal the pre-10W
//      store's (side by side), and attendance, leave balances and payroll after the same changes too
//   P  the page: HR adds and removes; a demoted HR session still sees the buttons and is refused; an Employee sees none
//   X  scope: exactly data/holidays.js and pages/holidays.js, only 10W's lines; the store.js <-> holidays.js imports
//      load in either order
// A fixed clock: Mon 2 Nov 2026 10:00 local time.
import fs from "fs";
import { spawnSync } from "child_process";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
const NOW = new RealDate(2026, 10, 2, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", SNEHA = "EMP-1029", ROHAN = "EMP-1042", ARJUN = "EMP-1105";
const WHO = { aarav: ["admin", "Aarav Mehta", AARAV], priya: ["hr", "Priya Nair", PRIYA], kabir: ["fin", "Kabir Shah", KABIR], arjun: ["emp", "Arjun Kapoor", ARJUN] };

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

// X0 first, before anything is imported here: store.js imports holidays.js (isValidDate) and 10W's holidays.js imports
// store.js (getUser); neither may use the other while loading. Each loads first in a fresh process.
const FIRST = ["data/holidays.js", "data/store.js", "data/leave-store.js", "data/attendance-store.js", "data/payroll-store.js"];
const loadFirst = FIRST.map((m) => {
  const r = spawnSync(process.execPath, ["--input-type=module", "-e",
    `globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};const M=await import(${j(`./js/${m}`)});console.log("ok "+Object.keys(M).length);`], { cwd: HERE, encoding: "utf8" });
  return [m, r.status === 0 && /^ok \d+/.test(r.stdout) ? "ok" : (r.stderr.split("\n").find((l) => /Error/.test(l)) ?? `exit ${r.status}`)];
});
check("X0", "each of holidays.js, store.js, leave-store.js, attendance-store.js and payroll-store.js loads first in a fresh process (the store.js <-> holidays.js imports are safe either way)",
  loadFirst.every(([, s]) => s === "ok"), j(loadFirst));

const H = await import("./js/data/holidays.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const L = await import("./js/data/leave-store.js");
const A = await import("./js/data/attendance-store.js");
const P = await import("./js/data/payroll-store.js");
const { ROLES } = await import("./js/config/roles.js");
// The holiday store before 10W: a second copy, on the same storage.
const H0 = await import("./js-pre10W/data/holidays.js");

function fresh() {
  globalThis.localStorage = MEM; mem.clear(); if (w) w.localStorage.clear();
  S.getAllUsers(); H.getAllHolidays(); L.allRequests(); A.allRegularizations(); A.dayFor(ARJUN, "2026-11-02"); P.allSalaries();
}
const calendar = () => localStorage.getItem("officeos:holidays");
const idOf = (name) => H.getAllHolidays().find((h) => h.name === name)?.id;
const ADD = "You can't add holidays.", REMOVE = "You can't remove holidays.";
const NEW = { date: "2026-11-27", name: "Foundation Day", kind: "company" };

// =================================================================
section("G. The guard");
fresh();
let before = calendar();
const g1a = H.addHoliday(ARJUN, NEW), g1r = H.removeHoliday(ARJUN, idOf("Diwali"));
const g1old = H0.addHoliday(NEW);
check("G1", "10N's case 1: an Employee (Arjun) calling the store directly is refused at both writes, and the calendar is unchanged (before 10W: the add went through)",
  j(res(g1a)) === j([false, ADD]) && j(res(g1r)) === j([false, REMOVE]) && g1old.ok, j([g1a, g1r, g1old.ok]));
fresh(); before = calendar();
H.addHoliday(ARJUN, NEW); H.removeHoliday(ARJUN, idOf("Diwali"));
check("G1b", "…nothing is written by the refused calls", calendar() === before);
fresh();
const dem = S.updateUser(USER_ACTOR("admin", PRIYA), PRIYA, { role: "emp" });
before = calendar();
const g2a = H.addHoliday(PRIYA, NEW), g2r = H.removeHoliday(PRIYA, idOf("Diwali"));
check("G2", "10N's case 2: Priya's record demoted to Employee (her HR session kept): both writes refused, the calendar unchanged",
  dem.ok && j(res(g2a)) === j([false, ADD]) && j(res(g2r)) === j([false, REMOVE]) && calendar() === before, j([g2a, g2r]));
fresh();
// Priya is a protected demo identity (can't be deactivated), so Rohan is made HR first.
const g3hr = S.updateUser(USER_ACTOR("admin", ROHAN), ROHAN, { role: "hr" });
const g3ok = H.addHoliday(ROHAN, NEW).ok;
const g3off = S.deactivateUser(USER_ACTOR("admin", ROHAN), ROHAN, LEAVING_11Y());
check("G3", "HR deactivated (Rohan, made HR: allowed while active): refused at both writes once inactive",
  g3hr.ok && g3ok && g3off.ok && j(res(H.addHoliday(ROHAN, { ...NEW, date: "2026-11-30" }))) === j([false, ADD]) && j(res(H.removeHoliday(ROHAN, idOf("Diwali")))) === j([false, REMOVE]), j([g3hr.ok, g3ok, g3off]));
fresh();
const byRole = Object.fromEntries([["aarav (admin)", AARAV], ["priya (hr)", PRIYA], ["kabir (fin)", KABIR], ["sneha (emp, a manager)", SNEHA], ["arjun (emp)", ARJUN]].map(([k, id]) => {
  fresh(); const a = H.addHoliday(id, NEW); const r = H.removeHoliday(id, idOf("Diwali")); return [k, [a.ok, r.ok]];
}));
check("G4", "by role on record: Admin and HR may add and remove; Finance, an Employee who manages people, and an Employee may not",
  j(byRole) === j({ "aarav (admin)": [true, true], "priya (hr)": [true, true], "kabir (fin)": [false, false], "sneha (emp, a manager)": [false, false], "arjun (emp)": [false, false] }), j(byRole));
fresh();
const tryRes = (fn) => { try { return res(fn()); } catch (e) { return [false, `threw: ${e.message}`]; } };
const odd = [undefined, null, "", "EMP-9999", { date: "2026-11-27" }].map((id) => [tryRes(() => H.addHoliday(id, NEW)), tryRes(() => H.removeHoliday(id, idOf("Diwali")))]);
check("G5", "no actor, an empty id, an unknown id, or the old call shape (the fields as the first argument): refused at both",
  odd.every(([a, r]) => j(a) === j([false, ADD]) && j(r) === j([false, REMOVE])), j(odd));
fresh();
S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { role: "hr" });
const g6 = H.addHoliday(ARJUN, NEW);
check("G6", "the record decides, not the session: Arjun made HR on record may add (whatever his session says)", g6.ok, j(g6));
// The permission itself: change the role table in memory, then put it back.
fresh();
const hrPerms = ROLES.hr.permissions, finPerms = ROLES.fin.permissions;
ROLES.hr.permissions = hrPerms.filter((p) => p !== "holidays:manage");
ROLES.fin.permissions = [...finPerms, "holidays:manage"];
const g7 = { priya: res(H.addHoliday(PRIYA, NEW)), kabir: res(H.addHoliday(KABIR, { ...NEW, date: "2026-11-30" })) };
ROLES.hr.permissions = hrPerms; ROLES.fin.permissions = finPerms;
check("G7", "it's holidays:manage itself that's checked: with it taken off HR's role (in memory) Priya is refused, and with it given to Finance Kabir may add",
  j(g7.priya) === j([false, ADD]) && j(g7.kabir) === j([true]), j(g7));
fresh();
const g8 = {
  badAdd: res(H.addHoliday(ARJUN, { date: "2026-02-30", name: "", kind: "x" })),
  dupAdd: res(H.addHoliday(ARJUN, { date: "2026-11-08", name: "Again", kind: "company" })),
  pastRemove: res(H.removeHoliday(ARJUN, idOf("Dussehra"))),
  unknownRemove: res(H.removeHoliday(ARJUN, "HOL-999")),
};
check("G8", "the guard comes first: an unauthorised call gets 'You can't …' whatever else is wrong (a bad date, a clash, a past holiday, an unknown id), so it learns nothing about the calendar",
  j(g8) === j({ badAdd: [false, ADD], dupAdd: [false, ADD], pastRemove: [false, REMOVE], unknownRemove: [false, REMOVE] }), j(g8));

// =================================================================
section("B. Behaviour unchanged for an authorised actor (side by side with the pre-10W store)");
const ADDS = [
  NEW, { date: "2026-11-08", name: "Again", kind: "company" }, { date: "2026-02-30", name: "X", kind: "company" }, { date: "", name: "X", kind: "company" },
  { date: "2026-12-01", name: "   ", kind: "company" }, { date: "2026-12-01", name: "X", kind: "regional" }, { date: "1900-01-01", name: "Far past", kind: "national" },
  { date: "2999-12-31", name: "Far future", kind: "optional" }, { date: "2026-10-15", name: "Past add", kind: "company" }, { date: "2026-11-07", name: "A Saturday", kind: "company" },
];
const addSame = ADDS.map((f) => { fresh(); const a = j(H.addHoliday(PRIYA, f)); const ca = calendar(); fresh(); const b = j(H0.addHoliday(f)); const cb = calendar(); return [f.name || "(blank)", a === b && ca === cb]; });
check("B1", "10 adds (new, a clash, bad and blank dates, a blank name, a bad kind, far past and future, a past date, a Saturday) by HR: results and the stored calendar equal the pre-10W store's",
  addSame.every(([, s]) => s), j(addSame.filter(([, s]) => !s)));
const REMOVES = ["Diwali", "Christmas", "Dussehra", "Gandhi Jayanti", "HOL-999"];
// Round 13R (behaviour; round-13q-scoping.md Q3: D): the past-holiday refusal writes its date as "20 Oct 2026"; the
// pre-10W store's is compared with its date written the same way, the rest of it as it was
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day13R = (s) => s.replace(/past holiday \((\d{4})-(\d{2})-(\d{2})\)/, (m, y, mo, dd) => `past holiday (${Number(dd)} ${MON[Number(mo) - 1]} ${y})`);
const removeSame = REMOVES.map((n) => { fresh(); const id = idOf(n) ?? n; const a = j(H.removeHoliday(AARAV, id)); const ca = calendar(); fresh(); const b = day13R(j(H0.removeHoliday(id))); const cb = calendar(); return [n, a === b && ca === cb]; });
check("B2", "removes by an Admin (future, optional, past ×2, unknown id): results and the stored calendar equal the pre-10W store's (13R: a past one's date written '20 Oct 2026')", removeSame.every(([, s]) => s), j(removeSame));
// The same calendar changes, then everything that reads holidays.
const PEOPLE = ["EMP-1001", "EMP-1003", "EMP-1008", "EMP-1017", "EMP-1023", "EMP-1029", "EMP-1042", "EMP-1088", "EMP-1105"];
function downstream(M, add, remove) {
  fresh();
  L.applyLeave(ROHAN, { type: "unpaid", from: "2026-11-10", to: "2026-11-12", duration: "full", reason: "x" });
  add({ date: "2026-11-11", name: "Mid-leave", kind: "company" });
  add({ date: "2026-10-28", name: "Late past add", kind: "company" });
  remove(idOf("Diwali"));
  return j({
    hol: H.getAllHolidays(),
    att: PEOPLE.map((u) => [A.monthFor(u, 2026, 10)?.counts, A.monthFor(u, 2026, 11)?.workingDays]),
    bal: PEOPLE.map((u) => L.balanceFor(u, 2026, 11)),
    pay: [P.payrollRun(2026, 10), P.payrollRun(2026, 11)],
  });
}
const dNew = downstream(H, (f) => H.addHoliday(PRIYA, f), (id) => H.removeHoliday(PRIYA, id));
const dOld = downstream(H0, (f) => H0.addHoliday(f), (id) => H0.removeHoliday(id));
check("B3", "after the same changes (a holiday inside unpaid leave, a past add, a removal), the calendar, every person's attendance, leave balances and the October and November payroll runs equal the pre-10W store's",
  dNew === dOld && JSON.parse(dNew).hol.some((h) => h.name === "Mid-leave"), dNew === dOld ? "" : "differ");
fresh();
H.addHoliday(PRIYA, NEW);
L.resetLeaveData();
check("B4", "Reset demo data (resetLeaveData → resetHolidays) still puts back the 7 seeded dates, with no actor (unchanged)", H.getAllHolidays().length === 7 && !idOf("Foundation Day"));

// =================================================================
section("P. The holidays page");
const addBtn = () => d.querySelector('.page-header__actions button[data-permission="holidays:manage"]');
const removeBtn = (name) => d.querySelector(`button[aria-label="Remove ${name}"]`);
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${t.className.includes("danger") ? "danger" : t.className.includes("success") ? "success" : "other"}: ${t.querySelector(".toast__text").textContent.trim()}`);
function submitAdd(f) {
  addBtn().click();
  d.getElementById("holiday-date").value = f.date; d.getElementById("holiday-name").value = f.name; d.getElementById("holiday-kind").value = f.kind;
  d.querySelector("#holiday-modal form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
}
fresh();
await open("leave/holidays", "holidays", "priya");
submitAdd(NEW);
const p1 = { added: Boolean(idOf("Foundation Day")), toasts: toasts(), listed: [...d.querySelectorAll("#holiday-list .list__title")].some((t) => t.textContent === "Foundation Day") };
check("P1", "HR (Priya) adds through the modal: saved, 'Holiday added.', and it's in the list", p1.added && j(p1.toasts) === j(["success: Holiday added."]) && p1.listed, j(p1));
removeBtn("Foundation Day").click();
check("P2", "…and removes it with its Remove button: gone, 'Holiday removed.'", !idOf("Foundation Day") && toasts().at(-1) === "success: Holiday removed.", j(toasts()));
fresh();
S.updateUser(USER_ACTOR("admin", PRIYA), PRIYA, { role: "emp" });
before = calendar();
await open("leave/holidays", "holidays", "priya");
const shown = { add: addBtn() && !addBtn().hidden, remove: removeBtn("Diwali") && !removeBtn("Diwali").hidden };
submitAdd(NEW);
removeBtn("Diwali").click();
// Round 11P (behaviour; behaviour; N4: the page reads her role on record (Employee), not the HR session's)
check("P3", "10N's demoted-HR case on the page: her role on record (Employee) has no holidays:manage, so Add and Remove are hidden (round 11P); pressed anyway, both are refused by the store with its message as a danger toast; the calendar unchanged",
  !shown.add && !shown.remove && j(toasts()) === j([`danger: ${ADD}`, `danger: ${REMOVE}`]) && calendar() === before, j([shown, toasts()]));
fresh();
await open("leave/holidays", "holidays", "arjun");
check("P4", "an Employee's page: Add and every Remove hidden (unchanged)", addBtn().hidden && [...d.querySelectorAll('button[data-permission="holidays:manage"]')].every((b) => b.hidden));
check("P5", "no JS errors on any load", allJsErrors.length === 0, allJsErrors.join(" | "));

// =================================================================
section("X. Scope: exactly 10W's lines");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
const FILES = ["data/holidays.js", "pages/holidays.js"];
// Round 10X (layout; was the live js vs js-pre10W, here and in X1): 10W's own change set, read from its frozen result
// (js-pre10X = HEAD 38993d7); the live js has 10X's department guard in store.js since (deptguard.mjs X1 / X4)
const changedJs = walk(`${HERE}js-pre10X`).filter((f) => !fs.existsSync(`${HERE}js-pre10W/${f}`) || SRC("js-pre10X", f) !== SRC("js-pre10W", f)).sort();
// Round 11B (layout; was the live pages, here and in the check below): this round's own page claim, read from its
// frozen result (html-pre11B = HEAD 97e1e6c); the live pages have 11B's sessions.html banner since (acctpages.mjs X2)
const changedHtml = walk(`${HERE}html-pre11B`).filter((f) => !fs.existsSync(`${HERE}html-pre10W/${f}`) || fs.readFileSync(`${HERE}html-pre11B/${f}`, "utf8") !== fs.readFileSync(`${HERE}html-pre10W/${f}`, "utf8"));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre10W", f)) : [];
check("X1", "js changed: exactly data/holidays.js and pages/holidays.js (store.js, leave-store.js, attendance-store.js, payroll untouched); nothing added or removed",
  j(changedJs) === j(FILES) && j(walk(`${HERE}js-pre10X`).sort()) === j(walk(`${HERE}js-pre10W`).sort()), j(changedJs));
check("X2", "no page and no css changed; nothing added or removed", changedHtml.length === 0 && changedCss.length === 0 && j(walk(`${HERE}html-pre11B`).sort()) === j(walk(`${HERE}html-pre10W`).sort()), j([changedHtml, changedCss]));
check("X3", "both CRLF only, with no final newline (as before)", FILES.map((f) => SRC("js", f)).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
const cnt = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
const delta = Object.fromEntries(FILES.map((f) => {
  // Round 11N (layout; layout; was the live js: read from the frozen result js-pre11N = HEAD fcdc960, the live tree has 11N's scripts since (roadnotes.mjs X1 / X4))
  const a = cnt(SRC("js-pre10W", f).split("\r\n")), b = cnt(SRC("js-pre11N", f).split("\r\n"));
  return [f, { removed: [...a].flatMap(([l, n]) => Array(Math.max(0, n - (b.get(l) ?? 0))).fill(l)).sort(), added: [...b].reduce((t, [l, n]) => t + Math.max(0, n - (a.get(l) ?? 0)), 0) }];
}));
const WANT = {
  "data/holidays.js": { removed: ["export function addHoliday(fields = {}) {", "export function removeHoliday(id) {"], added: 16 },
  "pages/holidays.js": { removed: ["  const result = addHoliday({ date: field(FIELDS.date).value, name: field(FIELDS.name).value, kind: field(FIELDS.kind).value });", "  const result = removeHoliday(holiday.id);"], added: 3 },
};
check("X4", "…and within them only 10W's lines: the two signatures replaced and the guard added (holidays.js); the auth import and the two calls passing the signed-in id (the page)", j(delta) === j(WANT), j(delta));
const hs = SRC("js", "data/holidays.js");
// Round 11R (invariant; the record's permissions are now permissionsOf(user), the role's with the person's overrides)
check("X5", "the store checks the record, not the session: holidays.js imports store.js (getUser) and roles.js (permissionsOf, round 11R), never core/auth.js, and names holidays:manage",
  /import \{ getUser \} from "\.\/store\.js";/.test(hs) && /import \{ permissionsOf \} from "\.\.\/config\/roles\.js";/.test(hs) && !/core\/auth\.js/.test(hs) && /permissionsOf\(user\)\.includes\("holidays:manage"\)/.test(hs));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
