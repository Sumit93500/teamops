// usage: node userguard.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 10Y: the user writes check the acting person's stored record (10X X7.8). ./js-pre10Y, ./html-pre10Y and
// ./css-pre10Y are the code, pages and css before this round (office-os a8691b4).
// addUser(actor, fields) needs users:create; updateUser(actor, id, changes) users:edit; deactivateUser(actor, id),
// reactivateUser(actor, id) and deleteUser(actor, id) users:deactivate (there's no users:delete): on the person's role on
// record, the person active. The Admin-only rules (9U / 9W / 9Y) go by that role on record (they used an optional
// { byRole }). Nobody deactivates their own account (the profile page's rule, now held in the store). The pages pass the
// signed-in person's id. An authorised call does exactly what it did with the matching byRole.
//   G  the guard: an Employee calling the store and a demoted HR session, at each of the five writes; deactivated,
//      promoted, every role, each permission on its own writes, and the guard coming first
//   A  the Admin-only rules, now by the record: an HR person can't hand out, take away or deactivate the Admin role however
//      the store is called; the last active Admin is still kept
//   S  self-deactivation refused in the store (directly and through an edit), after the existing rules
//   B  behaviour unchanged for an authorised actor: every result and the stored users equal the pre-10Y store's given the
//      same role as byRole (side by side)
//   P  the pages: HR edits through the form and deactivates / reactivates on the profile; a demoted HR session is refused
//   X  scope: exactly store.js, user-form.js, user-profile.js, only 10Y's lines; every module still loads first
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

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", SNEHA = "EMP-1029", ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const WHO = { aarav: ["admin", "Aarav Mehta", AARAV], priya: ["hr", "Priya Nair", PRIYA], kabir: ["fin", "Kabir Shah", KABIR], arjun: ["emp", "Arjun Kapoor", ARJUN] };

let loads = 0, w = null, d = null, jsErrors = [];
const allJsErrors = [];
async function open(page, script, who, query = "") {
  const cur = globalThis.localStorage;
  const saved = Object.fromEntries(Array.from({ length: cur.length }, (_, i) => cur.key(i)).map((k) => [k, cur.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = [];
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) { jsErrors.push(e.message); allJsErrors.push(`${page}: ${e.message}`); } });
  const dom = new JSDOM(fs.readFileSync(`${DIR}/${page}.html`, "utf8"), { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
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

// X0 first, before anything is imported here: every module that imports store.js still loads first.
const FIRST = ["data/store.js", "data/holidays.js", "config/roles.js", "data/leave-store.js", "data/attendance-store.js", "data/payroll-store.js", "data/inventory-store.js", "data/asset-requests-store.js", "data/expenses-store.js", "data/approval-chain.js"];
const loadFirst = FIRST.map((m) => {
  const r = spawnSync(process.execPath, ["--input-type=module", "-e",
    `globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};const M=await import(${j(`./js/${m}`)});console.log("ok "+Object.keys(M).length);`], { cwd: HERE, encoding: "utf8" });
  return [m, r.status === 0 && /^ok \d+/.test(r.stdout) ? "ok" : (r.stderr.split("\n").find((l) => /Error/.test(l)) ?? `exit ${r.status}`)];
});
check("X0", "every module that imports store.js still loads first in a fresh process (store.js adds no import)", loadFirst.every(([, s]) => s === "ok"), j(loadFirst));

const S = await import("./js/data/store.js");
const { ROLES } = await import("./js/config/roles.js");
// The store before 10Y: a second copy, on the same storage.
const S0 = await import("./js-pre10Y/data/store.js");

function fresh() { globalThis.localStorage = MEM; mem.clear(); if (w) w.localStorage.clear(); S.getAllUsers(); S.getAllDepartments(); }
const users = () => localStorage.getItem("officeos:users");
const MSG = { add: "You can't add employees.", edit: "You can't edit employees.", deactivate: "You can't deactivate employees.", reactivate: "You can't reactivate employees.", delete: "You can't delete employees." };
const NEW = { name: "Nina Das", email: "nina.das@officeos.test", department: "ENG", designation: "Software Engineer" };
// The five writes by an actor, each on fresh data (Rohan deactivated first for the reactivate case; a fresh hire deleted).
function five(actor) {
  const out = {};
  fresh(); out.add = res(S.addUser(actor, NEW));
  fresh(); out.edit = res(S.updateUser(actor, ROHAN, { phone: "+91 90000 00009" }));
  fresh(); out.deactivate = res(S.deactivateUser(actor, ROHAN, LEAVING_11Y()));
  fresh(); S.updateUser(AARAV, ROHAN, { status: "inactive", dateOfLeaving: LEAVING_11Y() }); out.reactivate = res(S.reactivateUser(actor, ROHAN));
  fresh(); const hire = S.addUser(AARAV, NEW).record?.id; out.delete = res(S.deleteUser(actor, hire));
  return out;
}
const refusedAll = (o) => Object.entries(o).every(([k, v]) => j(v) === j([false, MSG[k]]));
const allowedAll = (o) => Object.values(o).every((v) => j(v) === j([true]));

// =================================================================
section("G. The guard");
const g1 = five(ARJUN);
fresh();
const g1old = { add: S0.addUser(NEW).ok, edit: S0.updateUser(ROHAN, { phone: "x" }).ok, deactivate: S0.deactivateUser(ROHAN).ok, reactivate: S0.reactivateUser(ROHAN).ok };
check("G1", "an Employee (Arjun) calling the store directly: refused at all five writes, each naming its action (before 10Y, the same calls without byRole went through)",
  refusedAll(g1) && Object.values(g1old).every(Boolean), j({ g1, g1old }));
fresh();
let before = users();
S.addUser(ARJUN, NEW); S.updateUser(ARJUN, ROHAN, { role: "admin" }); S.deactivateUser(ARJUN, ROHAN, LEAVING_11Y()); S.reactivateUser(ARJUN, VIKRAM); S.deleteUser(ARJUN, SNEHA);
check("G1b", "…and nothing is written by the refused calls", users() === before);
fresh();
const demote = (who) => S.updateUser(AARAV, who, { role: "emp" });
const g2 = (() => { const out = {};
  fresh(); demote(PRIYA); out.add = res(S.addUser(PRIYA, NEW));
  fresh(); demote(PRIYA); out.edit = res(S.updateUser(PRIYA, ROHAN, { phone: "x" }));
  fresh(); demote(PRIYA); out.deactivate = res(S.deactivateUser(PRIYA, ROHAN, LEAVING_11Y()));
  fresh(); S.updateUser(AARAV, ROHAN, { status: "inactive", dateOfLeaving: LEAVING_11Y() }); demote(PRIYA); out.reactivate = res(S.reactivateUser(PRIYA, ROHAN));
  fresh(); const hire = S.addUser(AARAV, NEW).record?.id; demote(PRIYA); out.delete = res(S.deleteUser(PRIYA, hire));
  return out; })();
check("G2", "a demoted HR (Priya's record Employee, her HR session kept): refused at all five writes", refusedAll(g2), j(g2));
fresh();
const g3 = (() => { const out = {};
  const setup = () => { fresh(); S.updateUser(AARAV, ANANYA, { role: "hr" }); S.deactivateUser(AARAV, ANANYA, LEAVING_11Y()); };
  setup(); out.add = res(S.addUser(ANANYA, NEW));
  setup(); out.edit = res(S.updateUser(ANANYA, ROHAN, { phone: "x" }));
  setup(); out.deactivate = res(S.deactivateUser(ANANYA, ROHAN, LEAVING_11Y()));
  setup(); S.updateUser(AARAV, ROHAN, { status: "inactive", dateOfLeaving: LEAVING_11Y() }); out.reactivate = res(S.reactivateUser(ANANYA, ROHAN));
  setup(); const hire = S.addUser(AARAV, NEW).record?.id; out.delete = res(S.deleteUser(ANANYA, hire));
  return out; })();
check("G3", "an HR person deactivated (Ananya made HR, then deactivated; Priya and Kabir are protected): refused at all five writes", refusedAll(g3), j(g3));
const byRole = { "aarav (admin)": five(AARAV), "priya (hr)": five(PRIYA), "kabir (fin)": five(KABIR), "sneha (emp, a manager)": five(SNEHA), "arjun (emp)": five(ARJUN) };
// Round 11N (behaviour; behaviour; users:delete is Admin only since round 11N (it was users:deactivate, which HR holds), so HR can't delete)
check("G4", "by role on record: Admin may do all five, HR all but delete (users:delete, round 11N); Finance, an Employee who manages people, and an Employee none",
  allowedAll(byRole["aarav (admin)"]) && j(Object.fromEntries(Object.entries(byRole["priya (hr)"]).map(([k, v]) => [k, v[0]]))) === j({ add: true, edit: true, deactivate: true, reactivate: true, delete: false })
  && refusedAll(byRole["kabir (fin)"]) && refusedAll(byRole["sneha (emp, a manager)"]) && refusedAll(byRole["arjun (emp)"]), j(byRole));
fresh();
const odd = [undefined, null, "", "EMP-9999", NEW, { byRole: "admin" }].map((a) => [
  tryRes(() => S.addUser(a, NEW)), tryRes(() => S.updateUser(a, ROHAN, { phone: "x" })), tryRes(() => S.deactivateUser(a, ROHAN, LEAVING_11Y())), tryRes(() => S.reactivateUser(a, ROHAN)), tryRes(() => S.deleteUser(a, VIKRAM))]);
check("G5", "no actor, an empty id, an unknown id, the fields as the actor, or the old { byRole: 'admin' } object as the actor: refused at all five, never a crash",
  odd.every(([a, e, de, re, dl]) => j([a, e, de, re, dl]) === j([[false, MSG.add], [false, MSG.edit], [false, MSG.deactivate], [false, MSG.reactivate], [false, MSG.delete]])), j(odd));
const g6 = (() => { fresh(); S.updateUser(AARAV, ARJUN, { role: "hr" }); return [S.addUser(ARJUN, NEW).ok, S.updateUser(ARJUN, ROHAN, { phone: "x" }).ok, S.deactivateUser(ARJUN, ROHAN, LEAVING_11Y()).ok]; })();
check("G6", "the record decides, not the session: Arjun made HR on record may add, edit and deactivate", g6.every(Boolean), j(g6));
// Each permission on its own writes: change HR's role in memory, then put it back.
const hrPerms = ROLES.hr.permissions, finPerms = ROLES.fin.permissions;
const without = (perm) => { ROLES.hr.permissions = hrPerms.filter((p) => p !== perm); const o = five(PRIYA); ROLES.hr.permissions = hrPerms; return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v[0]])); };
const noCreate = without("users:create"), noEdit = without("users:edit"), noDeact = without("users:deactivate");
ROLES.fin.permissions = [...finPerms, "users:deactivate"];
const finDeact = Object.fromEntries(Object.entries(five(KABIR)).map(([k, v]) => [k, v[0]]));
ROLES.fin.permissions = finPerms;
// Round 11N (behaviour; delete checks users:delete since round 11N, which neither HR nor Finance holds, so it's refused in every variant here)
check("G7", "each write checks its own permission: without users:create HR can't add (the rest go through); without users:edit she can't edit; without users:deactivate she can't deactivate or reactivate; Finance given users:deactivate can do exactly those two; delete needs users:delete (round 11N), which neither holds",
  j(noCreate) === j({ add: false, edit: true, deactivate: true, reactivate: true, delete: false }) && j(noEdit) === j({ add: true, edit: false, deactivate: true, reactivate: true, delete: false })
  && j(noDeact) === j({ add: true, edit: true, deactivate: false, reactivate: false, delete: false }) && j(finDeact) === j({ add: false, edit: false, deactivate: true, reactivate: true, delete: false }),
  j({ noCreate, noEdit, noDeact, finDeact }));
fresh();
const g8 = {
  addNoName: res(S.addUser(ARJUN, { email: "x@y.z" })), addDupEmail: res(S.addUser(ARJUN, { name: "X", email: S.getUser(ROHAN).email })),
  editUnknown: res(S.updateUser(ARJUN, "EMP-9999", { phone: "x" })), editIdChange: res(S.updateUser(ARJUN, ROHAN, { id: "EMP-2" })),
  deactProtected: res(S.deactivateUser(ARJUN, AARAV, LEAVING_11Y())), reactUnknown: res(S.reactivateUser(ARJUN, "EMP-9999")),
  deleteProtected: res(S.deleteUser(ARJUN, PRIYA)), deleteUnknown: res(S.deleteUser(ARJUN, "EMP-9999")),
};
check("G8", "the guard comes first: an unauthorised call gets 'You can't …' whatever else is wrong (no name, a taken email, an unknown id, an id change, a demo identity)",
  j(Object.values(g8)) === j([[false, MSG.add], [false, MSG.add], [false, MSG.edit], [false, MSG.edit], [false, MSG.deactivate], [false, MSG.reactivate], [false, MSG.delete], [false, MSG.delete]]), j(g8));

// =================================================================
section("A. The Admin-only rules, now by the record");
const ADMIN_ONLY = "Only an Admin can give someone the Admin role or save an Admin's details.";
const ADMIN_ONLY_REMOVE = "Only an Admin can take the Admin role away from someone or delete an Admin.";
const ADMIN_ONLY_DEACTIVATE = "Only an Admin can deactivate another Admin.";
fresh();
const a1 = { give: res(S.updateUser(PRIYA, ARJUN, { role: "admin" })), addAdmin: res(S.addUser(PRIYA, { ...NEW, role: "admin" })) };
fresh();
const a1old = { give: S0.updateUser(ARJUN, { role: "admin" }).ok, addAdmin: S0.addUser({ ...NEW, role: "admin" }).ok };
check("A1", "HR can't make anyone an Admin, however the store is called (before 10Y, leaving out byRole let it through)",
  j(a1) === j({ give: [false, ADMIN_ONLY], addAdmin: [false, ADMIN_ONLY] }) && a1old.give && a1old.addAdmin, j({ a1, a1old }));
fresh(); S.updateUser(AARAV, ROHAN, { role: "admin" });
const a2 = { demote: res(S.updateUser(PRIYA, ROHAN, { role: "emp" })), deactivate: res(S.deactivateUser(PRIYA, ROHAN, LEAVING_11Y())), del: res(S.deleteUser(PRIYA, ROHAN)) };
// Round 11N (behaviour; behaviour; users:delete is Admin only since round 11N (it was users:deactivate, which HR holds), so HR can't delete at all, so the delete is refused before the Admin-only rule)
check("A2", "with two Admins, HR can't demote, deactivate or delete one (delete: no users:delete, round 11N)", j(a2) === j({ demote: [false, ADMIN_ONLY_REMOVE], deactivate: [false, ADMIN_ONLY_DEACTIVATE], del: [false, "You can't delete employees."] }), j(a2));
fresh(); S.updateUser(AARAV, ARJUN, { role: "admin" });
const a3 = [S.updateUser(ARJUN, ROHAN, { role: "admin" }).ok, S.updateUser(ARJUN, ROHAN, { role: "emp" }).ok];
check("A3", "an Admin on record (Arjun, promoted) may give and take the Admin role", a3.every(Boolean), j(a3));
fresh(); S.updateUser(AARAV, ROHAN, { role: "admin" }); S.updateUser(ROHAN, AARAV, { role: "emp" });
const a4 = { selfDeactivate: res(S.deactivateUser(ROHAN, ROHAN, LEAVING_11Y())), selfDemote: res(S.updateUser(ROHAN, ROHAN, { role: "emp" })), selfDelete: res(S.deleteUser(ROHAN, ROHAN)) };
check("A4", "the last active Admin is still kept, whoever asks (Rohan as the only Admin, on himself): refused with the existing messages",
  j(a4) === j({ selfDeactivate: [false, "There must always be an active Admin: make someone else an Admin, or reactivate one, first."], selfDemote: [false, "There must always be an Admin: make someone else an Admin first."], selfDelete: [false, "There must always be an Admin: make someone else an Admin first."] }), j(a4));

// =================================================================
section("S. Nobody deactivates their own account");
const SELF = "You can't deactivate your own account.";
fresh(); S.updateUser(AARAV, ROHAN, { role: "hr" });
const s1 = { direct: res(S.deactivateUser(ROHAN, ROHAN, LEAVING_11Y())), throughEdit: res(S.updateUser(ROHAN, ROHAN, { status: "inactive", dateOfLeaving: LEAVING_11Y(), phone: "x" })) };
check("S1", "HR (Rohan, made HR) deactivating his own account: refused directly and through an edit (the profile page's rule, held in the store); nothing saved",
  j(s1) === j({ direct: [false, SELF], throughEdit: [false, SELF] }) && S.getUser(ROHAN).status === "active" && S.getUser(ROHAN).phone !== "x", j(s1));
fresh(); S.updateUser(AARAV, ROHAN, { role: "hr" });
const s2 = [S.deactivateUser(ROHAN, SNEHA, LEAVING_11Y()).ok, S.updateUser(ROHAN, ROHAN, { phone: "+91 90000 00010" }).ok, S.deactivateUser(PRIYA, ROHAN, LEAVING_11Y()).ok];
check("S2", "…while deactivating someone else, being deactivated by someone else, and editing your own other details go through", s2.every(Boolean), j(s2));
fresh();
const s3 = { priya: res(S.deactivateUser(PRIYA, PRIYA, LEAVING_11Y())), aaravAlone: res(S.deactivateUser(AARAV, AARAV, LEAVING_11Y())) };
check("S3", "the existing rules come first: a demo identity's own deactivation names the demo identity", j(s3) === j({ priya: [false, "EMP-1003 is a demo sign-in identity and can't be deactivated."], aaravAlone: [false, "EMP-1001 is a demo sign-in identity and can't be deactivated."] }), j(s3));
// Round 11N (behaviour; the known gap is closed: self-deletion is refused since round 11N (roadnotes.mjs U3). Rohan is made an Admin, since an HR person is now stopped earlier by users:delete)
fresh(); S.updateUser(AARAV, ROHAN, { role: "admin" });
const s4 = res(S.deleteUser(ROHAN, ROHAN));
check("S4", "deleting your own record is refused (round 11N; it was a known gap), as deactivating it is", j(s4) === j([false, "You can't delete your own account."]) && Boolean(S.getUser(ROHAN)), j(s4));

// =================================================================
section("B. Behaviour unchanged for an authorised actor (side by side with the pre-10Y store and the matching byRole)");
const actorOf = { admin: AARAV, hr: PRIYA };
const CASES = [
  ["add", "hr", [NEW]], ["add", "admin", [{ ...NEW, role: "admin" }]], ["add", "hr", [{ ...NEW, designation: "Administrator" }]], ["add", "hr", [{ name: "", email: "a@b.c" }]],
  ["add", "hr", [{ ...NEW, email: "ROHAN.GUPTA@officeos.com" }]], ["add", "hr", [{ ...NEW, department: "NOPE" }]], ["add", "admin", [{ ...NEW, reportingManager: "Sneha Rao" }]],
  ["edit", "hr", [ROHAN, { phone: "+91 90000 00001", designation: "Team Lead" }]], ["edit", "hr", [AARAV, { phone: "x" }]], ["edit", "admin", [ARJUN, { role: "admin" }]],
  ["edit", "hr", [ROHAN, { id: "EMP-2" }]], ["edit", "admin", [AARAV, { role: "emp" }]], ["edit", "hr", [ROHAN, { status: "inactive", dateOfLeaving: LEAVING_11Y() }]], ["edit", "admin", ["EMP-9999", {}]],
  ["deactivate", "hr", [ROHAN]], ["deactivate", "admin", [KABIR]], ["deactivate", "hr", [VIKRAM]],
  ["reactivate", "hr", ["EMP-1061"]], ["reactivate", "admin", [ROHAN]],
  ["delete", "hr", [SNEHA]], ["delete", "admin", [ANANYA]], ["delete", "hr", ["EMP-9999"]],
];
const call = (M, fn, role, args, isNew) => {
  if (isNew) return { add: () => M.addUser(actorOf[role], ...args), edit: () => M.updateUser(actorOf[role], ...args), deactivate: () => M.deactivateUser(actorOf[role], ...args, LEAVING_11Y()), reactivate: () => M.reactivateUser(actorOf[role], ...args), delete: () => M.deleteUser(actorOf[role], ...args) }[fn]();
  return { add: () => M.addUser(...args, { byRole: role }), edit: () => M.updateUser(...args, { byRole: role }), deactivate: () => M.deactivateUser(...args, { byRole: role }), reactivate: () => M.reactivateUser(...args), delete: () => M.deleteUser(...args, { byRole: role }) }[fn]();
};
// Round 11N (behaviour; behaviour; users:delete is Admin only since round 11N (it was users:deactivate, which HR holds), so HR can't delete: HR's two deletes differ from the pre-10Y store on purpose, refused with no change; the other 20 still match)
const HR_DEL = j({ ok: false, error: "You can't delete employees." });
// Round 11Y (shape): a leaver's record keeps their last working day (dateOfLeaving), which the pre-10Y store doesn't
// write (or writes as given); everything else is still compared.
const noLeaving = (s) => (s ? JSON.stringify(JSON.parse(s), (k, v) => (k === "dateOfLeaving" ? undefined : v)) : s);
const bSame = CASES.map(([fn, role, args]) => { fresh(); const before = users(); const a = j(call(S, fn, role, args, true)); const ua = users(); fresh(); const b = j(call(S0, fn, role, args, false)); const ub = users(); return [`${fn} as ${role} ${j(args).slice(0, 40)}`, fn === "delete" && role === "hr" ? a === HR_DEL && ua === before : noLeaving(a) === noLeaving(b) && noLeaving(ua) === noLeaving(ub)]; });
check("B1", "22 writes by Admin or HR (adds incl. an Admin role, a designation carrying it, blanks, a taken email, an unknown department, a manager by name; edits incl. an Admin's details, giving and taking the Admin role, an id change, the status; deactivate, reactivate, delete incl. demo identities and unknown ids): results and the stored users equal the pre-10Y store's with byRole set to the actor's role",
  bSame.every(([, s]) => s), j(bSame.filter(([, s]) => !s)));
fresh();
S.addUser(PRIYA, NEW);
S.resetDemoData();
check("B2", "Reset demo data still puts the seeded people back, with no actor (unchanged)", !S.getAllUsers().some((u) => u.email === NEW.email) && S.getAllUsers().length === 10);

// =================================================================
section("P. The pages");
const UF = "users/user-form", UP = "users/user-profile";
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${t.className.includes("danger") ? "danger" : t.className.includes("success") ? "success" : "other"}: ${t.querySelector(".toast__text").textContent.trim()}`);
const submit = () => d.querySelector("form").dispatchEvent(new w.Event("submit", { cancelable: true }));
const statusBtn = () => [...d.querySelectorAll("button")].find((b) => ["Deactivate", "Reactivate"].includes(b.textContent.trim()));
// Round 11Y (fixture): the profile's Deactivate opens a dialog asking for the last working day (it opens on today); its
// Deactivate is what the confirm's OK was. A refusal that isn't about the date closes it and shows the same toast.
// Reactivate still confirms.
const pressDeactivate = () => { statusBtn().click(); d.getElementById("deactivate-modal")?.querySelector("form")?.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); };
const LAST_DAY_11Y = () => { const iso = LEAVING_11Y(); return `${Number(iso.slice(8))} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`; };
fresh();
await open(UF, "user-form", "priya", `?id=${ROHAN}`);
d.getElementById("phone").value = "+91 90000 00011"; submit();
const p1 = { saved: S.getUser(ROHAN).phone, t: toasts() };
check("P1", "HR (Priya) edits Rohan through the form: saved, 'Employee saved.'", p1.saved === "+91 90000 00011" && j(p1.t) === j(["success: Employee saved."]), j(p1));
fresh();
await open(UP, "user-profile", "priya", `?id=${ROHAN}`);
pressDeactivate();   // Round 11Y (fixture)
const p2a = { st: S.getUser(ROHAN).status, t: toasts() };
await open(UP, "user-profile", "priya", `?id=${ROHAN}`);
statusBtn().click();
const p2b = { st: S.getUser(ROHAN).status, t: toasts() };
check("P2", "HR deactivates Rohan on his profile, then reactivates him: both saved, success toasts", p2a.st === "inactive" && /deactivated/.test(p2a.t.at(-1)) && p2b.st === "active" && /reactivated/.test(p2b.t.at(-1)), j({ p2a, p2b }));
fresh(); S.updateUser(AARAV, PRIYA, { role: "emp" });
before = users();
await open(UF, "user-form", "priya", `?id=${ROHAN}`);
d.getElementById("phone").value = "+91 90000 00012"; submit();
const p3a = toasts();
await open(UF, "user-form", "priya");
submit();
const p3b = toasts();
await open(UP, "user-profile", "priya", `?id=${ROHAN}`);
pressDeactivate();   // Round 11Y (fixture)
const p3c = toasts();
// Round 11P (behaviour; behaviour; N4: the page reads her role on record (Employee), not the HR session's; this check still passed, and now also pins that)
check("P3", "a demoted HR session (record Employee): the pages now read her role on record, which holds neither users:create nor users:view, so the guard turns her away from both (round 11P); pressed anyway, the form's edit and add and the profile's Deactivate are refused with the store's messages; nothing saved",
  j(p3a) === j([`danger: ${MSG.edit}`]) && j(p3b) === j([`danger: ${MSG.add}`]) && j(p3c) === j([`danger: ${MSG.deactivate}`]) && users() === before
  && (await import("./js/core/auth.js")).getCurrentRole()?.key === "emp" && !(await import("./js/core/rbac.js")).can("users:create") && !(await import("./js/core/rbac.js")).can("users:view"), j({ p3a, p3b, p3c }));
fresh();
check("P4", "HR's own profile: the page still refuses self-deactivation first (unchanged) — checked on Priya's own profile",
  await (async () => { await open(UP, "user-profile", "priya", `?id=${PRIYA}`); statusBtn().click(); return j(toasts()) === j([`danger: ${SELF}`]); })(), j(toasts()));
fresh(); S.updateUser(AARAV, ROHAN, { role: "hr" });
check("P5", "…and the form's 'account active' box on your own record is now refused by the store (it wasn't): the record stays active",
  await (async () => { WHO.rohan = ["hr", "Rohan Gupta", ROHAN]; await open(UF, "user-form", "rohan", `?id=${ROHAN}`); d.getElementById("account-active").checked = false; submit(); return j(toasts()) === j([`danger: ${SELF}`]) && S.getUser(ROHAN).status === "active"; })(), j(toasts()));
check("P6", "no JS errors on any load", allJsErrors.length === 0, allJsErrors.join(" | "));

// =================================================================
section("X. Scope: exactly 10Y's lines");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
const FILES = ["data/store.js", "pages/user-form.js", "pages/user-profile.js"];
// Round 11B (layout; was the live js, here and in X1): 10Y's own change set, read from its frozen result (js-pre11B = HEAD
// 97e1e6c); the live js has 11B's change-password.js since (acctpages.mjs X1)
const changedJs = walk(`${HERE}js-pre11B`).filter((f) => !fs.existsSync(`${HERE}js-pre10Y/${f}`) || SRC("js-pre11B", f) !== SRC("js-pre10Y", f)).sort();
// Round 11B (layout; was the live pages, here and in the check below): this round's own page claim, read from its
// frozen result (html-pre11B = HEAD 97e1e6c); the live pages have 11B's sessions.html banner since (acctpages.mjs X2)
const changedHtml = walk(`${HERE}html-pre11B`).filter((f) => !fs.existsSync(`${HERE}html-pre10Y/${f}`) || fs.readFileSync(`${HERE}html-pre11B/${f}`, "utf8") !== fs.readFileSync(`${HERE}html-pre10Y/${f}`, "utf8"));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre10Y", f)) : [];
check("X1", "js changed: exactly data/store.js, pages/user-form.js and pages/user-profile.js; nothing added or removed", j(changedJs) === j(FILES) && j(walk(`${HERE}js-pre11B`).sort()) === j(walk(`${HERE}js-pre10Y`).sort()), j(changedJs));
check("X2", "no page and no css changed; nothing added or removed", changedHtml.length === 0 && changedCss.length === 0 && j(walk(`${HERE}html-pre11B`).sort()) === j(walk(`${HERE}html-pre10Y`).sort()), j([changedHtml, changedCss]));
check("X3", "all three CRLF only, with no final newline (as before)", FILES.map((f) => SRC("js", f)).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
const cnt = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
const delta = Object.fromEntries(FILES.map((f) => {
  // Round 11F (layout; was the live js): 10Y's own lines, read from the frozen result (js-pre11F = HEAD e93d118); the live
  // user-profile.js has 11F's Two-factor row since (pagenotes.mjs X4)
  const a = cnt(SRC("js-pre10Y", f).split("\r\n")), b = cnt(SRC("js-pre11F", f).split("\r\n"));
  return [f, { removed: [...a].flatMap(([l, n]) => Array(Math.max(0, n - (b.get(l) ?? 0))).fill(l)).length, added: [...b].reduce((t, [l, n]) => t + Math.max(0, n - (a.get(l) ?? 0)), 0) }];
}));
check("X4", "…and within them only 10Y's lines (store.js 14 out / 40 in; user-form.js 2 / 2; user-profile.js 3 / 3)", j(delta) === j({ "data/store.js": { removed: 14, added: 40 }, "pages/user-form.js": { removed: 2, added: 2 }, "pages/user-profile.js": { removed: 3, added: 3 } }), j(delta));
const ss = SRC("js", "data/store.js"), ss0 = SRC("js-pre10Y", "data/store.js");
const imports = (s) => [...s.matchAll(/^import .* from "([^"]+)";/gm)].map((m) => m[1]);
check("X5", "the store checks the record, not the session: store.js's imports are unchanged (never core/auth.js); each write names its permission; no user write takes an options object any more",
  // Round 11R (layout; layout; was the live store.js's imports: read from the frozen result js-pre11R = HEAD 86414a0; 11R adds config/routes.js, periods.mjs F2, the live tree has 11R's permission overrides since (overrides.mjs X1))
  j(imports(SRC("js-pre11R", "data/store.js"))) === j(imports(ss0)) && !/core\/auth\.js/.test(ss)
  // Round 11N (behaviour; deleteUser names users:delete since round 11N; deactivate and reactivate still name users:deactivate)
  && /actorWith\(actorUserId, "users:create"\)/.test(ss) && /actorWith\(actorUserId, "users:edit"\)/.test(ss) && (ss.match(/actorWith\(actorUserId, "users:deactivate"\)/g) ?? []).length === 2 && (ss.match(/actorWith\(actorUserId, "users:delete"\)/g) ?? []).length === 1
  && !/export function (addUser|updateUser|deactivateUser|reactivateUser|deleteUser)\([^)]*\{ byRole \}/.test(ss), j(imports(ss)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
