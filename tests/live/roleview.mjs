// usage: node roleview.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 6H: the role page (access/role-editor.html), drawn from config/roles.js, config/permissions.js and the store.
// ./js-pre6H, ./html-pre6H and ./css-pre6H are the code, pages and styles before this round (6G's result, 001edd5).
// Fixed clock: Wed 30 Sep 2026 11:00 local.
//   A  each of the four roles via ?role=: header, details, holders, every permission once, ticks = roles.js
//   B  no ?role=, or one that isn't a role (inherited names included): HR Manager
//   C  read-only: no inputs, no Save, no placeholders, no per-module data scope
//   D  drift: a permission or module added to permissions.js shows up with no page change
//   E  holders follow the store (inactive included, a new person on the next load)
//   F  roles-list.html: each row opens its own role;  G  who can open the page
//   L  source layout: only the four files changed
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const EDITOR = "access/role-editor.html", LIST = "access/roles-list.html";
const SCRIPT = { [EDITOR]: "role-editor", [LIST]: "roles-list" };

const RealDate = Date;
const NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const WHO = {
  aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"], kabir: ["fin", "Kabir Shah", "EMP-1008"],
  arjun: ["emp", "Arjun Kapoor", "EMP-1105"],
};

let loads = 0, w = null, d = null, saved = {};
let jsErrors = [], navigations = [], htmlWrites = [];
async function open(page, who, query = "") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = []; navigations = []; htmlWrites = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else jsErrors.push(e.message); });
  const dom = new JSDOM(read(page), { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  const proto = w.Element.prototype;
  const inner = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", { get: inner.get, set(v) { htmlWrites.push(String(v)); inner.set.call(this, v); }, configurable: true });
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  const auth = await import("./js/core/auth.js");
  if (!who) auth.signOut(); else auth.signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  if (navigations.length) return;
  if (SCRIPT[page]) { try { await import(`./js/pages/${SCRIPT[page]}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); } }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;

const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const { PERMISSIONS, ALL_PERMISSIONS } = await import("./js/config/permissions.js");
const { ROLES } = await import("./js/config/roles.js");

// ---- readers ----
const $ = (id) => d.getElementById(id);
const main = () => d.querySelector("main");
const ticks = () => [...d.querySelectorAll("#matrix-rows .perm-tick")];
const drawnKeys = () => ticks().map((t) => t.dataset.permissionKey);
const heldKeys = () => ticks().filter((t) => t.querySelector(".matrix__yes")).map((t) => t.dataset.permissionKey);
const groups = () => [...d.querySelectorAll("#matrix-rows tr.matrix__group")].map(txt);
const rowOf = (module) => [...d.querySelectorAll("#matrix-rows tr:not(.matrix__group)")].find((tr) => txt(tr.querySelector(".matrix__module-desc")) === module);
const holders = () => [...$("role-users").querySelectorAll(".list__item")].map((i) => [txt(i.querySelector(".list__title")), i.querySelector("a.list__title")?.getAttribute("href") ?? null, txt(i.querySelector(".list__sub"))]);
const kv = (label) => [...d.querySelectorAll(".kv__row")].find((r) => txt(r.querySelector("dt")) === label)?.querySelector("dd");
const storeHolders = (key) => S.getAllUsers().filter((u) => u.role === key);
const sameSet = (a, b) => a.length === b.length && new Set(a).size === a.length && a.every((x) => b.includes(x));

// =====================================================================
section("A. Each role via ?role=");
const GROUP_ORDER = ["Overview", "People", "Time", "Requests & approvals", "Finance", "Operations", "System", "Your own account"];
for (const key of Object.keys(ROLES)) {
  const role = ROLES[key];
  fresh(); await open(EDITOR, "aarav", `?role=${key}`);
  const people = storeHolders(key);
  check(`A1${key}`, `${key}: title, crumb and heading are '${role.label}'; subtitle 'System role, held by ${people.length} ...'`,
    d.title === `${role.label} | OfficeOS` && txt($("role-crumb")) === role.label && txt($("role-title")) === role.label
    && txt($("role-subtitle")) === `System role, held by ${people.length} ${people.length === 1 ? "person" : "people"}` && jsErrors.length === 0 && navigations.length === 0, `${d.title} / ${txt($("role-subtitle"))} / ${jsErrors}`);
  check(`A2${key}`, `${key}: every one of the ${ALL_PERMISSIONS.length} permissions drawn exactly once, each module's actions in permissions.js order`,
    sameSet(drawnKeys(), ALL_PERMISSIONS)
    && Object.keys(PERMISSIONS).every((m) => j([...rowOf(m).querySelectorAll(".perm-tick")].map((t) => t.dataset.permissionKey)) === j(PERMISSIONS[m].map((a) => `${m}:${a}`))), `${drawnKeys().length} drawn`);
  check(`A3${key}`, `${key}: ticked = exactly what roles.js grants (${role.permissions.length}); the card says '${role.permissions.length} of ${ALL_PERMISSIONS.length}', as roles-list does`,
    sameSet(heldKeys(), role.permissions) && txt($("permission-count")) === `${role.permissions.length} of ${ALL_PERMISSIONS.length}`
    && ticks().every((t) => t.getAttribute("aria-label") === `${t.dataset.permissionKey}: ${t.querySelector(".matrix__yes") ? "yes" : "no"}` && t.title === t.dataset.permissionKey
      && txt(t) === t.dataset.permissionKey.split(":")[1] && t.classList.contains("perm-tick--off") === !t.querySelector(".matrix__yes")), `${heldKeys().length} ticked, meta ${txt($("permission-count"))}`);
  check(`A4${key}`, `${key}: details: key '${key}', System, landing ${role.landing} (a link to it), data scope '${role.scopeLabel}'` /* Round Manager scoping part 2 (behaviour; was All / Own records) */,
    txt(kv("Key")) === key && txt(kv("Type")) === "System" && txt(kv("Landing page after sign-in")) === role.landing
    && kv("Landing page after sign-in").querySelector("a")?.getAttribute("href") === `../${role.landing}` && txt(kv("Data scope")) === role.scopeLabel,
    j([txt(kv("Key")), txt(kv("Landing page after sign-in")), kv("Landing page after sign-in")?.querySelector("a")?.getAttribute("href"), txt(kv("Data scope"))]));
  check(`A5${key}`, `${key}: 'Users with this role' = the store's ${people.length} (count, names, profile links, designation)`,
    txt($("role-user-count")) === String(people.length)
    && j(holders()) === j(people.map((u) => [u.name, `../users/user-profile.html?id=${u.id}`, u.status === "inactive" ? `${u.designation}, inactive` : u.designation])), j(holders()).slice(0, 200));
  check(`A6${key}`, `${key}: the groups in order, none called 'Other' today; group rows span both columns; nothing drawn through innerHTML`,
    j(groups()) === j(GROUP_ORDER) && [...d.querySelectorAll("#matrix-rows tr.matrix__group td")].every((td) => td.colSpan === 2)
    && [...d.querySelectorAll("#matrix-rows tr:not(.matrix__group)")].every((tr) => tr.children.length === 2) && !htmlWrites.some((h) => /perm-tick|matrix|list__item/.test(h)), j(groups()));
}
fresh(); await open(EDITOR, "aarav", "?role=hr");
// Round 11N (behaviour; behaviour; was 77: users:delete (round 11N) is a 78th permission, so the page draws it)
// Round Manager scoping part 1 (behaviour; was 45 of 78: dashboard:finance is a 79th permission)
check("A7", "HR today: 45 of 79, Priya Nair alone ('held by 1 person'); no Anil Verma, no 'Custom role', no 'hr-manager' anywhere",
  txt($("permission-count")) === "45 of 79" && j(holders().map((h) => h[0])) === j(["Priya Nair"]) && txt($("role-subtitle")) === "System role, held by 1 person"
  && !/Anil Verma|Custom role|hr-manager|Leave approvals|two-factor/i.test(main().outerHTML));
const hrNot = ALL_PERMISSIONS.filter((p) => !ROLES.hr.permissions.includes(p));
// Round 11N (behaviour; was 32: HR doesn't hold users:delete (round 11N, Admin only))
// Round Manager scoping part 1 (behaviour; was 33: HR doesn't hold dashboard:finance)
check("A8", "HR: none of the 34 permissions HR lacks is ticked (e.g. payroll:view, roles:manage, assets:view, users:delete, dashboard:finance)", hrNot.length === 34 && hrNot.includes("dashboard:finance") && hrNot.every((p) => !heldKeys().includes(p)) && ["payroll:view", "roles:manage", "assets:view", "users:delete"].every((p) => hrNot.includes(p)));
await open(EDITOR, "aarav", "?role=emp");
check("A9", "Employee: the 20 self-service permissions, spread over their modules (Attendance ticks view-own / mark / regularize, not view-all / approve)",
  heldKeys().length === 20 && j([...rowOf("attendance").querySelectorAll(".perm-tick")].map((t) => `${txt(t)}${t.querySelector(".matrix__yes") ? "+" : ""}`)) === j(["view-all", "view-own+", "mark+", "regularize+", "approve"]));
await open(EDITOR, "aarav", "?role=admin");
// Round 11N (behaviour; behaviour; was 77: users:delete (round 11N) is a 78th permission, so the page draws it)
// Round Manager scoping part 1 (behaviour; was 78: dashboard:finance)
check("A10", "Admin: all 79 ticked, nothing unticked", heldKeys().length === 79 && !d.querySelector("#matrix-rows .matrix__no"));

// =====================================================================
section("B. Default and unknown roles");
for (const q of ["", "?role=", "?role=nobody", "?role=constructor", "?role=__proto__", "?role=toString", "?role=FIN", "?other=fin"]) {
  fresh(); await open(EDITOR, "aarav", q);
  // Round Forms (behaviour; was "shows HR Manager, drawn normally"): no role, or one that isn't a role, says "Role not found"; forms.mjs R1-R3 pin the words
  check(`B${q || "(none)"}`, `'${q || "(no query)"}' says Role not found: the heading 'Role', no matrix, no js error`, txt($("role-title")) === "Role" && d.title === "Role not found | OfficeOS" && !d.querySelector("#matrix-rows") && jsErrors.length === 0, `${txt($("role-title"))} ${d.title} ${jsErrors}`);
}

// =====================================================================
section("C. Read-only");
fresh(); await open(EDITOR, "aarav", "?role=fin");
check("C1", "no input, select, textarea or checkbox anywhere in <main>", main().querySelectorAll("input, select, textarea").length === 0);
check("C2", "no Save, no placeholder buttons, no button at all in <main>; the header offers 'All roles' back to the list",
  main().querySelectorAll("button, [data-not-implemented]").length === 0 && j([...d.querySelectorAll(".page-header__actions a")].map((a) => [txt(a), a.getAttribute("href")])) === j([["All roles", "roles-list.html"]]));
check("C3", "the alert says roles come from the configuration and can't be changed here; nothing says changes apply",
  /Roles are set in the app's configuration\. This page shows what the role can do; it can't be changed here yet\./.test(txt(main())) && !/Changes apply|Save changes/.test(main().outerHTML));
check("C4", "no per-module data scope: no matrix__scope, no Department / Team option; the matrix has two columns (Module, Permissions)",
  !/matrix__scope|Department<|>Team</.test(main().outerHTML) && j([...d.querySelectorAll(".matrix thead th")].map(txt)) === j(["Module", "Permissions"]));
// Round 11N (behaviour; was no ':delete' key at all: users:delete (round 11N) is a real permission now, drawn in the Users row like any other; still no Delete column and no other ':delete' key)
check("C5", "no View / Create / Edit / Delete / Approve columns, and no ':delete' key on the page but users:delete (round 11N)", !/:delete/.test(d.documentElement.outerHTML.replaceAll("users:delete", "")) && d.querySelectorAll(".matrix thead th").length === 2);

// =====================================================================
section("D. Drift: permissions.js changes show up with no page change");
PERMISSIONS.users.push("export");
PERMISSIONS.newmodule = ["view", "run"];
ROLES.hr.permissions.push("newmodule:run");
ALL_PERMISSIONS.push("users:export", "newmodule:view", "newmodule:run");
fresh(); await open(EDITOR, "aarav", "?role=hr");
// Round 11N (behaviour; the Users row has delete since round 11N, so the added export comes after it)
check("D1", "a new action on an existing module (users:export) appears in its row, unticked for HR", j([...rowOf("users").querySelectorAll(".perm-tick")].map(txt)) === j(["view", "create", "edit", "reset-password", "deactivate", "delete", "export"]) && !heldKeys().includes("users:export"));
check("D2", "a module with no name in the page's map appears under 'Other', named by its key, ticked where the role has it",
  groups().at(-1) === "Other" && txt(rowOf("newmodule")?.querySelector(".matrix__module-name")) === "newmodule" && heldKeys().includes("newmodule:run") && !heldKeys().includes("newmodule:view")
  // Round 11N (behaviour; was 80: 78 since round 11N, plus the three added here)
  // Round Manager scoping part 1 (behaviour; was 46 of 81: 79 since Manager scoping part 1, plus the three added here)
  && sameSet(drawnKeys(), ALL_PERMISSIONS) && txt($("permission-count")) === `46 of 82`, `${groups().at(-1)} ${txt($("permission-count"))}`);
PERMISSIONS.users.pop(); delete PERMISSIONS.newmodule; ROLES.hr.permissions.pop(); ALL_PERMISSIONS.splice(-3, 3);
fresh(); await open(EDITOR, "aarav", "?role=hr");
// Round 11N (behaviour; behaviour; was 77: users:delete (round 11N) is a 78th permission, so the page draws it)
// Round Manager scoping part 1 (behaviour; was 78: dashboard:finance)
check("D3", "(restored: 79 again, no Other)", drawnKeys().length === 79 && !groups().includes("Other"));

// =====================================================================
section("E. Holders follow the store");
fresh(); await open(EDITOR, "aarav", "?role=emp");
const emp = holders();
check("E1", "Employee: 7 people, inactive ones included and marked (Divya Menon), same count as roles-list",
  emp.length === 7 && txt($("role-user-count")) === "7" && emp.some(([n, , sub]) => n === "Divya Menon" && /, inactive$/.test(sub)) && emp.filter(([, , s]) => /inactive/.test(s)).length === storeHolders("emp").filter((u) => u.status === "inactive").length, j(emp.map((e) => e[0])));
S.addUser(USER_ACTOR("admin", null), { name: "Test Person", email: "t@x.com", department: "FIN", designation: "Accountant", role: "fin", status: "active" });
await open(EDITOR, "aarav", "?role=fin");
check("E2", "a new Finance Manager added through the store appears on the next load; 'held by 2 people'", holders().some((h) => h[0] === "Test Person") && txt($("role-user-count")) === "2" && txt($("role-subtitle")) === "System role, held by 2 people");
// Round 11P (restaged; was the Admin role emptied in storage (Aarav included) and viewed by Aarav's Admin session; the editor now reads the viewer's role on record (roles:manage), and with no Admin nobody could open it, so the emptied role is Finance (Kabir and E2's Test Person), viewed by the Admin)
const emptyKey = Object.keys(ROLES).find((k) => k === "fin");
{ const box = JSON.parse(localStorage.getItem("officeos:users")); box.records.forEach((u) => { if (u.role === "fin") u.role = "emp"; }); localStorage.setItem("officeos:users", JSON.stringify(box)); }
await open(EDITOR, "aarav", `?role=${emptyKey}`);
check("E3", "a role nobody holds: '0', 'Nobody holds this role.', 'held by 0 people'", txt($("role-user-count")) === "0" && txt($("role-users")) === "Nobody holds this role." && txt($("role-subtitle")) === "System role, held by 0 people");

// =====================================================================
section("F. roles-list.html");
fresh(); await open(LIST, "aarav");
const buttons = [...d.querySelectorAll(".table tbody tr[data-role]")].map((tr) => [tr.dataset.role, txt(tr.querySelector(".table__actions a")), tr.querySelector(".table__actions a").getAttribute("href")]);
check("F1", "each role's row has one 'View' button opening role-editor.html?role=<its key>", j(buttons) === j(Object.keys(ROLES).map((k) => [k, "View", `role-editor.html?role=${k}`])), j(buttons));
// Round 11N (behaviour; behaviour; was 77: users:delete (round 11N) is a 78th permission, so the page draws it)
// Round Manager scoping part 1 (behaviour; was 45 / 78: dashboard:finance)
check("F2", "roles-list still fills its counts (unchanged script)", txt(d.querySelector('tr[data-role="hr"] [data-cell="permissions"]')) === "45 / 79" && jsErrors.length === 0);

// =====================================================================
section("G. Who can open it");
for (const who of ["priya", "kabir", "arjun"]) {
  fresh(); await open(EDITOR, who, "?role=hr");
  check(`G1${who[0]}`, `${who} (no roles:manage): sent away, the matrix never drawn`, navigations.length === 1 && $("matrix-rows").children.length === 0);
}
fresh(); await open(EDITOR, null, "?role=hr");
check("G2", "nobody signed in: sent to sign in", navigations.length === 1);

// =====================================================================
section("L. Source layout");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1).replaceAll("\\", "/")]));
const root = (dd) => new URL(`./${dd}`, import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const changed = (a, b) => walk(a).sort().filter((p) => !fs.existsSync(`${b}/${p}`) || fs.readFileSync(`${a}/${p}`, "utf8") !== fs.readFileSync(`${b}/${p}`, "utf8"));
const CSSDIR = root("css-pre6I");
// Since Round 6I, 6H's result is read frozen (js-pre6I, html-pre6I, css-pre6I): 6I has moved the live tree on.
check("L1", "js: only pages/role-editor.js changed; config/ untouched", j(changed(root("js-pre6I"), root("js-pre6H"))) === j(["pages/role-editor.js"]) && walk(root("js-pre6I")).length === walk(root("js-pre6H")).length);
check("L2", "pages: only access/role-editor.html and access/roles-list.html", j(changed(root("html-pre6I"), root("html-pre6H")).filter((p) => p.endsWith(".html"))) === j([EDITOR, LIST]), j(changed(root("html-pre6I"), root("html-pre6H"))));
check("L3", "css: only pages/access.css, and only by addition (matrix.css untouched, so notifications.html's matrix is unaffected)",
  j(changed(CSSDIR, root("css-pre6H"))) === j(["pages/access.css"])
  && fs.readFileSync(`${CSSDIR}/pages/access.css`, "utf8").replace(/\r\n/g, "\n").replace(/\n\n\/\* -{10} Role page[\s\S]*?\.matrix--perms td:first-child \{ min-width: 140px; \} \}\n/, "\n") === src("css-pre6H", "pages/access.css").replace(/\r\n/g, "\n"));
const keep = (h) => h.replace(/\r\n/g, "\n").split("<main")[0];
const after = (h) => h.replace(/\r\n/g, "\n").split("</main>")[1];
check("L4", "role-editor.html: before <main> only the <title> changed ('Edit role' -> 'Role'); after </main> unchanged (app.js, then role-editor.js)",
  keep(src("html-pre14A", EDITOR)) /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */ === keep(src("html-pre6H", EDITOR)).replace("<title>Edit role | OfficeOS</title>", "<title>Role | OfficeOS</title>") && after(src("html-pre14A", EDITOR)) === after(src("html-pre6H", EDITOR)));
const lineDelta = (a, b) => { const x = a.replace(/\r\n/g, "\n").split("\n"), y = b.replace(/\r\n/g, "\n").split("\n"); return x.length === y.length ? x.map((l, i) => (l === y[i] ? null : [l, y[i]])).filter(Boolean) : "length differs"; };
check("L5", "roles-list.html: exactly the four button lines changed", j(lineDelta(src("html-pre6H", LIST), src("html-pre14A", LIST)).map(([, b]) => b.trim())) === j(Object.keys(ROLES).map((k) => `<td class="table__actions"><a class="btn btn--sm" href="role-editor.html?role=${k}">View</a></td>`)));
check("L6", "role-editor.js: imports only config, the store, paths and leave-view helpers; no innerHTML / insertAdjacentHTML; reads ?role= with Object.hasOwn",
  !/innerHTML|insertAdjacentHTML|outerHTML/.test(src("js", "pages/role-editor.js")) && /Object\.hasOwn\(ROLES,/.test(src("js", "pages/role-editor.js"))
  && j([...src("js", "pages/role-editor.js").matchAll(/from "([^"]+)"/g)].map((m) => m[1])) === j(["../config/roles.js", "../config/permissions.js", "../data/store.js", "../core/paths.js", "../ui/leave-view.js"]));
const four = [src("html-pre14A", EDITOR), src("html-pre14A", LIST), fs.readFileSync(`${CSSDIR}/pages/access.css`, "utf8"), src("js", "pages/role-editor.js")];
check("L7", "the four files: CRLF only, no final newline", four.every((s) => !/[^\r]\n/.test(s) && !/\r(?!\n)/.test(s) && !s.endsWith("\n")));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
