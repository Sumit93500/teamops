// usage: node deptguard.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 10X: the department writes check the acting person's stored record (10I G1; 10W W0). ./js-pre10X, ./html-pre10X
// and ./css-pre10X are the code, pages and css before this round (office-os 38993d7).
// addDepartment(actorUserId, fields) needs departments:create and updateDepartment(actorUserId, code, changes) needs
// departments:edit, on the person's role on record, and the person active; the departments page passes the signed-in
// person's id. An authorised call does exactly what it did before.
//   G  the guard: 10I's two cases (an Employee calling the store; a demoted HR session), deactivated, promoted, every
//      role, each permission on its own write, and the guard coming before every other check
//   B  behaviour unchanged for an authorised actor: every add / edit result and the stored departments equal the pre-10X
//      store's (side by side), and the department reads after the same changes too
//   P  the page: HR adds and edits; a demoted HR session still sees the buttons and is refused
//   X  scope: exactly data/store.js and pages/departments.js, only 10X's lines; store.js's one new import is a leaf, and
//      every module still loads first
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

let loads = 0, w = null, d = null, jsErrors = [], navigations = [];
const allJsErrors = [];
async function open(page, script, who) {
  const cur = globalThis.localStorage;
  const saved = Object.fromEntries(Array.from({ length: cur.length }, (_, i) => cur.key(i)).map((k) => [k, cur.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = []; navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message.slice(0, 60)); else if (!/form submission/i.test(e.message)) { jsErrors.push(e.message); allJsErrors.push(`${page}: ${e.message}`); } });
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
const tryRes = (fn) => { try { return res(fn()); } catch (e) { return [false, `threw: ${e.message}`]; } };

// X0 first, before anything is imported here: store.js's new import (config/roles.js) must stay a leaf, and every module
// that imports store.js must still load first in a fresh process.
const FIRST = ["data/store.js", "data/holidays.js", "config/roles.js", "data/leave-store.js", "data/attendance-store.js", "data/payroll-store.js", "data/inventory-store.js"];
const loadFirst = FIRST.map((m) => {
  const r = spawnSync(process.execPath, ["--input-type=module", "-e",
    `globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};const M=await import(${j(`./js/${m}`)});console.log("ok "+Object.keys(M).length);`], { cwd: HERE, encoding: "utf8" });
  return [m, r.status === 0 && /^ok \d+/.test(r.stdout) ? "ok" : (r.stderr.split("\n").find((l) => /Error/.test(l)) ?? `exit ${r.status}`)];
});
const importsOf = (f) => [...fs.readFileSync(`${HERE}js/${f}`, "utf8").matchAll(/^import .* from "([^"]+)";/gm)].map((m) => m[1]);
check("X0", "every module that imports store.js still loads first in a fresh process; roles.js imports only permissions.js and permissions.js nothing (store.js's new import is a leaf, no cycle)",
  loadFirst.every(([, s]) => s === "ok") && j(importsOf("config/roles.js")) === j(["./permissions.js"]) && importsOf("config/permissions.js").length === 0, j([loadFirst, importsOf("config/roles.js"), importsOf("config/permissions.js")]));

const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const { ROLES } = await import("./js/config/roles.js");
// The store before 10X: a second copy, on the same storage.
const S0 = await import("./js-pre10X/data/store.js");

function fresh() { globalThis.localStorage = MEM; mem.clear(); if (w) w.localStorage.clear(); S.getAllUsers(); S.getAllDepartments(); }
const depts = () => localStorage.getItem("officeos:departments");
const ADD = "You can't add departments.", EDIT = "You can't edit departments.";
const NEW = { code: "MKT", name: "Marketing", head: "Ananya Iyer" };

// =================================================================
section("G. The guard");
fresh();
let before = depts();
const g1a = S.addDepartment(ARJUN, NEW), g1e = S.updateDepartment(ARJUN, "ENG", { name: "Renamed" });
const g1old = S0.addDepartment(NEW);
check("G1", "10I's case 1: an Employee (Arjun) calling the store directly is refused at both writes (before 10X: the add went through)",
  j(res(g1a)) === j([false, ADD]) && j(res(g1e)) === j([false, EDIT]) && g1old.ok, j([g1a, g1e, g1old.ok]));
fresh(); before = depts();
S.addDepartment(ARJUN, NEW); S.updateDepartment(ARJUN, "ENG", { name: "Renamed", active: false });
check("G1b", "…and nothing is written by the refused calls", depts() === before);
fresh();
const dem = S.updateUser(USER_ACTOR("admin", PRIYA), PRIYA, { role: "emp" });
before = depts();
const g2 = [res(S.addDepartment(PRIYA, NEW)), res(S.updateDepartment(PRIYA, "ENG", { name: "Renamed" }))];
check("G2", "10I's case 2: Priya's record demoted to Employee (her HR session kept): both writes refused, departments unchanged",
  dem.ok && j(g2) === j([[false, ADD], [false, EDIT]]) && depts() === before, j(g2));
fresh();
// Priya is a protected demo identity (can't be deactivated), so Rohan is made HR first.
const g3hr = S.updateUser(USER_ACTOR("admin", ROHAN), ROHAN, { role: "hr" });
const g3ok = S.addDepartment(ROHAN, NEW).ok;
const g3off = S.deactivateUser(USER_ACTOR("admin", ROHAN), ROHAN, LEAVING_11Y());
const g3 = [res(S.addDepartment(ROHAN, { code: "QA", name: "Quality" })), res(S.updateDepartment(ROHAN, "ENG", { name: "Renamed" }))];
check("G3", "HR deactivated (Rohan, made HR: allowed while active): refused at both writes once inactive", g3hr.ok && g3ok && g3off.ok && j(g3) === j([[false, ADD], [false, EDIT]]), j([g3hr.ok, g3ok, g3off, g3]));
const byRole = Object.fromEntries([["aarav (admin)", AARAV], ["priya (hr)", PRIYA], ["kabir (fin)", KABIR], ["sneha (emp, a manager)", SNEHA], ["arjun (emp)", ARJUN]].map(([k, id]) => {
  fresh(); return [k, [S.addDepartment(id, NEW).ok, S.updateDepartment(id, "ENG", { name: "Renamed" }).ok]];
}));
check("G4", "by role on record: Admin and HR may add and edit; Finance, an Employee who manages people, and an Employee may not",
  j(byRole) === j({ "aarav (admin)": [true, true], "priya (hr)": [true, true], "kabir (fin)": [false, false], "sneha (emp, a manager)": [false, false], "arjun (emp)": [false, false] }), j(byRole));
fresh();
const odd = [undefined, null, "", "EMP-9999", NEW, "ENG"].map((id) => [tryRes(() => S.addDepartment(id, NEW)), tryRes(() => S.updateDepartment(id, "ENG", { name: "Renamed" }))]);
check("G5", "no actor, an empty id, an unknown id, or the old call shapes (the fields / the code as the first argument): refused at both, never a crash",
  odd.every(([a, e]) => j(a) === j([false, ADD]) && j(e) === j([false, EDIT])), j(odd));
fresh();
S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { role: "hr" });
check("G6", "the record decides, not the session: Arjun made HR on record may add and edit", S.addDepartment(ARJUN, NEW).ok && S.updateDepartment(ARJUN, "MKT", { name: "Growth" }).ok);
// Each permission on its own write: change the role table in memory, then put it back.
const hrPerms = ROLES.hr.permissions, finPerms = ROLES.fin.permissions;
fresh();
ROLES.hr.permissions = hrPerms.filter((p) => p !== "departments:create");
const noCreate = [res(S.addDepartment(PRIYA, NEW)), res(S.updateDepartment(PRIYA, "ENG", { name: "Renamed" }))];
ROLES.hr.permissions = hrPerms.filter((p) => p !== "departments:edit");
const noEdit = [res(S.addDepartment(PRIYA, { code: "QA", name: "Quality" })), res(S.updateDepartment(PRIYA, "SAL", { name: "Renamed" }))];
ROLES.hr.permissions = hrPerms;
ROLES.fin.permissions = [...finPerms, "departments:edit"];
const finEdit = [res(S.addDepartment(KABIR, { code: "OPX", name: "Ops X" })), res(S.updateDepartment(KABIR, "FIN", { name: "Finance & Accounts" }))];
ROLES.fin.permissions = finPerms;
check("G7", "each write checks its own permission: without departments:create HR can still edit but not add; without departments:edit she can add but not edit; Finance given departments:edit can edit, not add",
  j(noCreate) === j([[false, ADD], [true]]) && j(noEdit) === j([[true], [false, EDIT]]) && j(finEdit) === j([[false, ADD], [true]]), j({ noCreate, noEdit, finEdit }));
fresh();
const g8 = {
  badCode: res(S.addDepartment(ARJUN, { code: "mk1", name: "X" })), dupCode: res(S.addDepartment(ARJUN, { code: "ENG", name: "X" })), blankName: res(S.addDepartment(ARJUN, { code: "QA", name: " " })),
  unknown: res(S.updateDepartment(ARJUN, "NOPE", { name: "X" })), codeChange: res(S.updateDepartment(ARJUN, "ENG", { code: "ENX" })), blankEdit: res(S.updateDepartment(ARJUN, "ENG", { name: "" })),
};
check("G8", "the guard comes first: an unauthorised call gets 'You can't …' whatever else is wrong (a bad or taken code, a blank name, an unknown department, a code change)",
  j(g8) === j({ badCode: [false, ADD], dupCode: [false, ADD], blankName: [false, ADD], unknown: [false, EDIT], codeChange: [false, EDIT], blankEdit: [false, EDIT] }), j(g8));

// =================================================================
section("B. Behaviour unchanged for an authorised actor (side by side with the pre-10X store)");
const ADDS = [NEW, { code: "ENG", name: "Again" }, { code: "mk", name: "x" }, { code: "mk1", name: "Bad" }, { code: "QA", name: "  " }, { code: "QA", name: " Quality " },
  { code: "OPX", name: "Ops X", active: false }, { code: "TOOLONG", name: "X" }, { code: "", name: "X" }, { code: "RND", name: "R&D", head: "", extra: "kept" }];
const addSame = ADDS.map((f) => { fresh(); const a = j(S.addDepartment(PRIYA, f)); const ca = depts(); fresh(); const b = j(S0.addDepartment(f)); const cb = depts(); return [f.code || "(blank)", a === b && ca === cb]; });
check("B1", "10 adds by HR (new, a taken code, bad codes, blank and padded names, inactive, too long, empty, extra fields): results and the stored departments equal the pre-10X store's",
  addSame.every(([, s]) => s), j(addSame.filter(([, s]) => !s)));
const EDITS = [["ENG", { name: "Product Engineering" }], ["ENG", { name: "   " }], ["ENG", { code: "ENX" }], ["ENG", { code: "ENG", name: "Same code" }], ["NOPE", { name: "X" }],
  ["SAL", { active: false }], ["FIN", { head: "" }], ["OPS", {}], ["ENG", { name: " a " }]];
const editSame = EDITS.map(([c, ch]) => { fresh(); const a = j(S.updateDepartment(AARAV, c, ch)); const ca = depts(); fresh(); const b = j(S0.updateDepartment(c, ch)); const cb = depts(); return [`${c} ${j(ch)}`, a === b && ca === cb]; });
check("B2", "9 edits by an Admin (rename, blank name, a code change, the same code, an unknown department, deactivate, clear the head, nothing, padded): results and the stored departments equal the pre-10X store's",
  editSame.every(([, s]) => s), j(editSame.filter(([, s]) => !s)));
function after(add, edit) {
  fresh();
  add(NEW); edit("ENG", { name: "Product Engineering" }); edit("SAL", { active: false }); add({ code: "QA", name: "Quality" });
  return j({ all: S.getAllDepartments(), heads: S.headcountByDepartment(), active: S.activeHeadcount(), eng: S.getDepartment("ENG"), arjun: S.getUser(ARJUN) });
}
const aNew = after((f) => S.addDepartment(PRIYA, f), (c, ch) => S.updateDepartment(PRIYA, c, ch)), aOld = after((f) => S0.addDepartment(f), (c, ch) => S0.updateDepartment(c, ch));
check("B3", "after the same changes, every department read (the list, headcounts, a department, a member's record) equals the pre-10X store's", aNew === aOld && JSON.parse(aNew).all.some((x) => x.code === "MKT"), aNew === aOld ? "" : "differ");
fresh();
S.addDepartment(PRIYA, NEW);
S.resetDemoData();
check("B4", "Reset demo data still puts the seeded departments back, with no actor (unchanged)", !S.getDepartment("MKT") && S.getAllDepartments().length === JSON.parse(after(() => {}, () => {})).all.length);

// =================================================================
section("P. The departments page");
const addBtn = () => [...d.querySelectorAll(".page-header__actions button")].find((b) => b.textContent.trim() === "Add department");
const editBtn = (name) => [...d.querySelectorAll(".dept-grid article.dept")].find((c) => c.textContent.includes(name))?.querySelector(".dept__foot button");
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${t.className.includes("danger") ? "danger" : t.className.includes("success") ? "success" : "other"}: ${t.querySelector(".toast__text").textContent.trim()}`);
const submit = () => d.querySelector("#dept-modal form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
fresh();
await open("users/departments", "departments", "priya");
addBtn().click(); d.getElementById("dept-code").value = "MKT"; d.getElementById("dept-name").value = "Marketing"; submit();
const p1 = { saved: S.getDepartment("MKT")?.name ?? null, t: toasts() };
editBtn("Engineering").click(); d.getElementById("dept-name").value = "Product Engineering"; submit();
const p2 = { saved: S.getDepartment("ENG").name, t: toasts() };
check("P1", "HR (Priya) adds Marketing through the modal: saved, 'Department added.'", p1.saved === "Marketing" && j(p1.t) === j(["success: Department added."]), j(p1));
check("P2", "…and edits Engineering's name with its Edit button: saved, 'Department saved.'", p2.saved === "Product Engineering" && p2.t.at(-1) === "success: Department saved.", j(p2));
fresh();
S.updateUser(USER_ACTOR("admin", PRIYA), PRIYA, { role: "emp" });
before = depts();
await open("users/departments", "departments", "priya");
const shown = { add: Boolean(addBtn()) && !addBtn().hidden, edit: Boolean(editBtn("Engineering")) && !editBtn("Engineering").hidden };
addBtn().click(); d.getElementById("dept-code").value = "MKT"; d.getElementById("dept-name").value = "Marketing"; submit();
const addStillOpen = d.getElementById("dept-code").value === "MKT";
editBtn("Engineering").click(); d.getElementById("dept-name").value = "Product Engineering"; submit();
// Round 11P (behaviour; behaviour; N4: the page reads her role on record (Employee), not the HR session's)
check("P3", "10I's demoted-HR case on the page: her role on record (Employee) lacks departments:create, so the guard turns her away (403: one navigation, still signed in; round 11P); pressed anyway, Add and Edit are refused by the store with its message as a danger toast; the form keeps what was typed; nothing saved",
  navigations.length === 1 && localStorage.getItem("officeos:session") !== null && j(toasts()) === j([`danger: ${ADD}`, `danger: ${EDIT}`]) && addStillOpen && depts() === before, j([shown, toasts(), addStillOpen, navigations.length]));
fresh();
await open("users/departments", "departments", "arjun");
check("P4", "an Employee is sent away by the route (departments:create), unchanged", navigations.length === 1, j(navigations));
check("P5", "no JS errors on any load", allJsErrors.length === 0, allJsErrors.join(" | "));

// =================================================================
section("X. Scope: exactly 10X's lines");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
const FILES = ["data/store.js", "pages/departments.js"];
// Round 10Y (layout; was the live js, here and in X1, X4, X5): 10X's own change set, read from its frozen result (js-pre10Y =
// HEAD a8691b4); the live store.js has 10Y's user-write guards since (and departmentActor() is now actorWith(): userguard.mjs)
const changedJs = walk(`${HERE}js-pre10Y`).filter((f) => !fs.existsSync(`${HERE}js-pre10X/${f}`) || SRC("js-pre10Y", f) !== SRC("js-pre10X", f)).sort();
// Round 11B (layout; was the live pages, here and in the check below): this round's own page claim, read from its
// frozen result (html-pre11B = HEAD 97e1e6c); the live pages have 11B's sessions.html banner since (acctpages.mjs X2)
const changedHtml = walk(`${HERE}html-pre11B`).filter((f) => !fs.existsSync(`${HERE}html-pre10X/${f}`) || fs.readFileSync(`${HERE}html-pre11B/${f}`, "utf8") !== fs.readFileSync(`${HERE}html-pre10X/${f}`, "utf8"));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre10X", f)) : [];
check("X1", "js changed: exactly data/store.js and pages/departments.js (holidays.js, the other stores, config untouched); nothing added or removed",
  j(changedJs) === j(FILES) && j(walk(`${HERE}js-pre10Y`).sort()) === j(walk(`${HERE}js-pre10X`).sort()), j(changedJs));
check("X2", "no page and no css changed; nothing added or removed", changedHtml.length === 0 && changedCss.length === 0 && j(walk(`${HERE}html-pre11B`).sort()) === j(walk(`${HERE}html-pre10X`).sort()), j([changedHtml, changedCss]));
check("X3", "both CRLF only, with no final newline (as before)", FILES.map((f) => SRC("js", f)).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
const cnt = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
const delta = Object.fromEntries(FILES.map((f) => {
  const a = cnt(SRC("js-pre10X", f).split("\r\n")), b = cnt(SRC("js-pre10Y", f).split("\r\n"));
  return [f, { removed: [...a].flatMap(([l, n]) => Array(Math.max(0, n - (b.get(l) ?? 0))).fill(l)).sort(), added: [...b].reduce((t, [l, n]) => t + Math.max(0, n - (a.get(l) ?? 0)), 0) }];
}));
const WANT = {
  "data/store.js": { removed: ["export function addDepartment(fields = {}) {", "export function updateDepartment(code, changes = {}) {"], added: 13 },
  "pages/departments.js": { removed: ["  const result = editingCode ? updateDepartment(editingCode, record) : addDepartment({ ...record, code: codeInput.value });"], added: 2 },
};
check("X4", "…and within them only 10X's lines: the two signatures replaced, the roles import and the guard added (store.js); the auth import and the call passing the signed-in id (the page)", j(delta) === j(WANT), j(delta));
const ss = SRC("js-pre10Y", "data/store.js");
// Round 11R (layout; layout; was the live store.js's imports: read from the frozen result js-pre11R = HEAD 86414a0; 11R adds config/routes.js, periods.mjs F2, the live tree has 11R's permission overrides since (overrides.mjs X1))
const frozenImports = [...SRC("js-pre11R", "data/store.js").matchAll(/^import .* from "([^"]+)";/gm)].map((m) => m[1]);
check("X5", "the store checks the record, not the session: store.js's only new import is config/roles.js (never core/auth.js), and it names departments:create and departments:edit",
  j(frozenImports) === j(["../core/storage.js", "./users.js", "./holidays.js", "../config/roles.js"]) && !/core\/auth\.js/.test(ss)
  && /departmentActor\(actorUserId, "departments:create"\)/.test(ss) && /departmentActor\(actorUserId, "departments:edit"\)/.test(ss), j(importsOf("data/store.js")));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
