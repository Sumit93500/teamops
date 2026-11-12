// usage: node overrides.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 11R: 11M's roadmap row 6 (R7, 10D E5), scoped in round-11q-notes.md, Q-D1-Q-D9 approved; the allow-list is
// round-11r-notes.md R0. ./js-pre11R, ./html-pre11R and ./css-pre11R are the code, pages and css before this round
// (office-os 86414a0).
//   A  config/roles.js: OVERRIDABLE (the 25), overridesOf(), permissionsOf() (role + grants - denies; anything outside
//      the list ignored; none on an Admin; nothing cached).
//   B  core/rbac.js: can() reads the record's permissions, so an override takes effect at once (N4), in the guard and
//      applyPermissions too.
//   C  the data layer: store.js / holidays.js / inventory-store.js act on the overrides; the stage checks
//      (approval-chain, expenses-store, asset-requests-store) can't be overridden, so who decides is unchanged.
//   D  store.js writes: Admin only, never on one's own record, never on an Admin's (nor promoting someone who has
//      overrides), no landing-page deny, only the allow-list, none both; a re-sent unchanged list still saves;
//      extraRoles dropped.
//   E  the pages: user-form (Additional roles gone; options from the allow-list for the role; disabled with the reason
//      when they can't be changed; Effective permissions = role + grants - denies; the wording), user-profile's card,
//      the sidebar.
//   P  pre-11R side by side.
//   X  scope.
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

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const SESS = { admin: ["admin", "Aarav Mehta", AARAV], hr: ["hr", "Priya Nair", PRIYA], fin: ["fin", "Kabir Shah", KABIR], emp: ["emp", "Arjun Kapoor", ARJUN] };
const session = () => JSON.parse(mem.get("officeos:session") ?? "null");
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null, navigations = [];
const allJsErrors = [];
async function open(page, { dir = DIR, js = "js", query = "" } = {}) {
  const vc = new VirtualConsole();
  navigations = []; timers = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message.slice(0, 60)); else if (!/form submission/i.test(e.message)) allJsErrors.push(`${page} (${js}): ${e.message}`); });
  const html = fs.readFileSync(`${dir}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = () => true;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`./${js}/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} (${js}) import: ${e.message}`); }
  }
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} (${js}) timer: ${e.message}`); } });
}
let hrefs = [];
function stubWindow(page) {
  hrefs = [];
  globalThis.window = { location: { pathname: `/office-os/pages/${page}`, set href(v) { hrefs.push(v); }, get href() { return `http://localhost/office-os/pages/${page}`; } } };
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const fresh = () => { mem.clear(); timers = []; };

const S = await import("./js/data/store.js");
const R = await import("./js/config/roles.js");
const RB = await import("./js/core/rbac.js");
const G = await import("./js/core/guard.js");
const { ALL_PERMISSIONS } = await import("./js/config/permissions.js");
const { ROUTES } = await import("./js/config/routes.js");
const H = await import("./js/data/holidays.js");
const INV = await import("./js/data/inventory-store.js");
const EX = await import("./js/data/expenses-store.js");
const AR = await import("./js/data/asset-requests-store.js");
const LV = await import("./js/data/leave-store.js");
const { ROLES } = R;
// A record edited straight in storage: how data saved before this round (or by a direct store call then) looks.
function editRecord(id, field, value) {
  S.getAllUsers();   // seed if empty
  const box = JSON.parse(mem.get("officeos:users"));
  const rec = box.records.find((u) => u.id === id);
  if (value === undefined) delete rec[field]; else rec[field] = value;
  mem.set("officeos:users", JSON.stringify(box));
}
const rec = (id) => S.getUser(id);
const ov = (id) => [rec(id).grantPermissions ?? null, rec(id).denyPermissions ?? null];
const permissionsOf = R.permissionsOf ?? (() => []);   // guarded: a tree without the helper fails, not crashes
const overridesOf = R.overridesOf ?? (() => ({ grants: null, denies: null }));
const OVERRIDABLE = R.OVERRIDABLE ?? [];
const ADMIN_ONLY = "Only an Admin can change permission overrides.";
const SELF = "You can't change your own permission overrides.";
const ON_ADMIN = "An Admin holds every permission, so an Admin can't have permission overrides.";
const STAYS = (p) => `${p} can't be granted or denied: it stays with the role.`;
const errOf = (r) => (r.ok ? "ok" : r.error);

// =================================================================
section("A. config/roles.js: the allow-list and the resolver");
const R0 = ["departments:create", "departments:edit", "holidays:manage", "payroll:view", "payroll:export", "payslips:view", "salary:view", "expenses:view",
  "tax:view", "tax:manage", "inventory:view", "inventory:create", "inventory:edit", "assets:view", "vendors:view", "vendors:create", "vendors:edit",
  "recruitment:view", "recruitment:create", "recruitment:edit", "announcements:create", "reports:view", "reports:create", "reports:export", "audit:view"];
check("A1", "OVERRIDABLE is exactly round-11r-notes R0's 25, in that order, each a real permission, none twice",
  j(OVERRIDABLE) === j(R0) && OVERRIDABLE.every((p) => ALL_PERMISSIONS.includes(p)) && new Set(OVERRIDABLE).size === 25, j(OVERRIDABLE.length));
const LANDING = [...new Set(Object.values(ROLES).map((r) => ROUTES[r.landing]))].sort();
const SELF_SERVICE = ALL_PERMISSIONS.filter((p) => Object.values(ROLES).every((r) => r.permissions.includes(p)));
const EXCLUDED = {
  landing: LANDING,
  stage: ["approvals:view", "approvals:decide", "attendance:approve", "expenses:approve", "assets:approve", "payroll:approve", "expenses:pay", "assets:assign", "payroll:create", "workflows:view", "workflows:manage", "delegation:create"],
  adminOnly: ["users:delete", "roles:manage", "settings:edit", "backup:manage", "backup:create", "backup:download", "backup:restore", "audit:export",
    "offices:manage", "company:edit", "locations:review", "devices:reset"],   // L0 (behaviour): the four Admin-only location permissions
  selfService: SELF_SERVICE.filter((p) => !LANDING.includes(p)),
  access: ["users:view", "users:create", "users:edit", "users:reset-password", "users:deactivate", "pii:view", "designations:manage", "designations:create", "designations:edit"],
  reserved: ["shifts:manage", "salary:edit"],
};
const allExcluded = Object.values(EXCLUDED).flat();
// Round Manager scoping part 1 (behaviour; was 3 landing permissions and 53 + 25 = 78: dashboard:finance is Finance's landing permission now)
check("A2", "R0's six exclusions and the 25 split all 86 permissions with no overlap (L0: was 79): the landing permissions (dashboard:view, dashboard:finance, attendance:view-all, leave:approve, read from routes.js), the 12 stage ones, 12 Admin-only (L0: was 8), 22 everyone's own (L0: was 19), 9 access administration, 2 reserved",
  j(LANDING) === j(["attendance:view-all", "dashboard:finance", "dashboard:view", "leave:approve"]) && EXCLUDED.selfService.length === 22 && allExcluded.length === 61 && new Set(allExcluded).size === 61
  && !OVERRIDABLE.some((p) => allExcluded.includes(p)) && j([...allExcluded, ...OVERRIDABLE].sort()) === j([...ALL_PERMISSIONS].sort()), j(Object.fromEntries(Object.entries(EXCLUDED).map(([k, v]) => [k, v.length]))));
const offer = Object.fromEntries(Object.keys(ROLES).map((k) => [k, [OVERRIDABLE.filter((p) => !ROLES[k].permissions.includes(p)).length, OVERRIDABLE.filter((p) => ROLES[k].permissions.includes(p))]]));
check("A3", "what each role can be granted / denied: Employee 25 / none; HR 15 / 10 (departments x2, holidays, recruitment x3, announcements:create, reports:view / export, audit:view); Finance 15 / 10 (payroll:view / export, payslips:view, salary:view, expenses:view, tax x2, reports x3)",
  offer.emp[0] === 25 && offer.emp[1].length === 0 && offer.hr[0] === 15 && j(offer.hr[1]) === j(["departments:create", "departments:edit", "holidays:manage", "recruitment:view", "recruitment:create", "recruitment:edit", "announcements:create", "reports:view", "reports:export", "audit:view"])
  && offer.fin[0] === 15 && j(offer.fin[1]) === j(["payroll:view", "payroll:export", "payslips:view", "salary:view", "expenses:view", "tax:view", "tax:manage", "reports:view", "reports:create", "reports:export"]), j(offer));
check("A4", "no overrides: permissionsOf is the role's own list, in its order, for each role; nobody / a role that isn't one ('ceo', 'constructor') -> []",
  Object.keys(ROLES).every((k) => j(permissionsOf({ role: k })) === j(ROLES[k].permissions))
  && [null, undefined, { role: "ceo" }, { role: "constructor" }, {}].every((u) => { try { return j(permissionsOf(u)) === "[]"; } catch { return false; } }));
const emp = { role: "emp", grantPermissions: ["reports:view", "inventory:view"], denyPermissions: [] };
const hr = { role: "hr", grantPermissions: [], denyPermissions: ["audit:view", "holidays:manage"] };
const a5 = [
  j(permissionsOf(emp)) === j([...ROLES.emp.permissions, "reports:view", "inventory:view"]),
  j(permissionsOf(hr)) === j(ROLES.hr.permissions.filter((p) => !["audit:view", "holidays:manage"].includes(p))),
  j(permissionsOf({ role: "emp", grantPermissions: ["payroll:approve", "users:edit", "reports:view"], denyPermissions: ["dashboard:view", "leave:create"] })) === j([...ROLES.emp.permissions, "reports:view"]),
  j(permissionsOf({ role: "hr", denyPermissions: ["leave:approve"] })) === j(ROLES.hr.permissions),
  j(permissionsOf({ role: "admin", denyPermissions: ["reports:view"], grantPermissions: ["x"] })) === j(ROLES.admin.permissions) && permissionsOf({ role: "admin" }).length === 86,   // L0 (behaviour; was 79)
     // Round Manager scoping part 1 (behaviour; was 78)
  j(permissionsOf({ role: "emp", grantPermissions: "reports:view", denyPermissions: { a: 1 } })) === j(ROLES.emp.permissions),
  !permissionsOf({ role: "emp", grantPermissions: ["tax:view"], denyPermissions: ["tax:view"] }).includes("tax:view"),
  j(permissionsOf({ role: "hr", grantPermissions: ["audit:view", "inventory:view", "inventory:view"] })) === j([...ROLES.hr.permissions, "inventory:view"]),
];
check("A5", "grants are added after the role's (once), denies taken away; anything outside the list is ignored either way (payroll:approve, users:edit, a dashboard:view or leave:create deny, HR's landing leave:approve); an Admin's stored overrides are ignored (all 86; L0: was 79); a list that isn't one is ignored; granted and denied -> not held",
  a5.every(Boolean), j(a5));
const live = { role: "emp" };
const a6 = [permissionsOf(live).includes("reports:view")];
live.grantPermissions = ["reports:view"]; a6.push(permissionsOf(live).includes("reports:view"));
live.role = "hr"; live.denyPermissions = ["reports:view"]; a6.push(permissionsOf(live).includes("reports:view"));
live.role = "admin"; a6.push(permissionsOf(live).includes("reports:view"));
a6.push(j(overridesOf({ role: "fin", grantPermissions: ["audit:view", "pii:view"], denyPermissions: ["tax:view", "expenses:pay"] })), j(overridesOf({ role: "admin", grantPermissions: ["audit:view"] })), j(overridesOf(null)));
check("A6", "nothing cached: the same record object changed between calls changes the answer at once (no, granted, denied on HR, an Admin again); overridesOf keeps each list to the allow-list, none for an Admin or nobody",
  j(a6) === j([false, true, false, true, j({ grants: ["audit:view"], denies: ["tax:view"] }), j({ grants: [], denies: [] }), j({ grants: [], denies: [] })]), j(a6));

// =================================================================
section("B. can(): the signed-in person's record, with their overrides");
fresh(); setSession(...SESS.emp);
const b1 = [RB.can("reports:view"), RB.can("inventory:view")];
const b1w = errOf(S.updateUser(AARAV, ARJUN, { grantPermissions: ["reports:view", "inventory:view"] }));
b1.push(RB.can("reports:view"), RB.can("inventory:view"), session().roleKey);
S.updateUser(AARAV, ARJUN, { grantPermissions: [] });
b1.push(RB.can("reports:view"));
check("B1", "N4 for an override: Arjun (Employee) granted reports:view and inventory:view by an Admin can use them at once, without signing in again (the session still says emp); taken away, gone at once",
  j(b1) === j([false, false, true, true, "emp", false]) && b1w === "ok", j([b1w, b1]));
fresh(); setSession(...SESS.hr);
S.updateUser(AARAV, PRIYA, { denyPermissions: ["audit:view", "holidays:manage"] });
const b2 = ["audit:view", "holidays:manage", "leave:approve", "users:edit", "recruitment:view"].map((p) => RB.can(p));
check("B2", "Priya (HR) denied audit:view and holidays:manage: can() says no to those two and yes to the rest of HR's (leave:approve, users:edit, recruitment:view)", j(b2) === j([false, false, true, true, true]), j(b2));
fresh(); setSession(...SESS.emp);
editRecord(ARJUN, "grantPermissions", ["payroll:approve", "expenses:pay", "users:edit", "leave:approve"]); editRecord(ARJUN, "denyPermissions", ["dashboard:view"]);
const b3 = ["payroll:approve", "expenses:pay", "users:edit", "leave:approve", "dashboard:view"].map((p) => RB.can(p));
fresh(); setSession(...SESS.hr); editRecord(PRIYA, "denyPermissions", ["leave:approve"]);
stubWindow("dashboard/hr.html"); const b3g = [G.guardPage(), [...hrefs], RB.can("leave:approve")]; globalThis.window = w;
check("B3", "Q-D9: values outside the allow-list stored before (straight in storage) are ignored: Arjun's stored grants of payroll:approve / expenses:pay / users:edit / leave:approve don't count and his dashboard:view deny doesn't either; Priya's stored leave:approve deny doesn't, and her hr.html dashboard still opens",
  j(b3) === j([false, false, false, false, true]) && j(b3g) === j([true, [], true]), j([b3, b3g]));
fresh(); setSession(...SESS.emp);
const frag = new JSDOM(`<div><button data-permission="reports:view">r</button><button data-permission="inventory:view">i</button><button data-permission="payroll:approve">p</button></div>`).window.document.body;
RB.applyPermissions(frag); const b4a = [...frag.querySelectorAll("button")].map((b) => b.hidden);
S.updateUser(AARAV, ARJUN, { grantPermissions: ["reports:view"] }); editRecord(ARJUN, "grantPermissions", ["reports:view", "payroll:approve"]);
RB.applyPermissions(frag); const b4b = [...frag.querySelectorAll("button")].map((b) => b.hidden);
check("B4", "applyPermissions follows the overrides: Arjun's buttons for reports:view / inventory:view / payroll:approve are all hidden, then with reports:view granted (and a stored payroll:approve) only reports:view shows",
  j(b4a) === j([true, true, true]) && j(b4b) === j([false, true, true]), j([b4a, b4b]));
function guard(page) { stubWindow(page); const ok = G.guardPage(); const out = { ok, hrefs: [...hrefs], session: session() ? "kept" : "none" }; globalThis.window = w; return out; }
fresh(); setSession(...SESS.emp);
const b5a = guard("inventory/items.html");
S.updateUser(AARAV, ARJUN, { grantPermissions: ["inventory:view"] });
const b5b = guard("inventory/items.html");
fresh(); setSession(...SESS.hr); S.updateUser(AARAV, PRIYA, { denyPermissions: ["recruitment:view"] });
const b5c = [guard("recruitment/job-openings.html"), guard("dashboard/hr.html")];
check("B5", "the guard follows them: Arjun gets the 403 page for inventory/items.html, then opens it once granted inventory:view; Priya denied recruitment:view gets 403 for job-openings (still signed in) and her own dashboard still opens",
  j(b5a) === j({ ok: false, hrefs: ["../errors/403.html"], session: "kept" }) && j(b5b) === j({ ok: true, hrefs: [], session: "kept" })
  && j(b5c[0]) === j({ ok: false, hrefs: ["../errors/403.html"], session: "kept" }) && j(b5c[1]) === j({ ok: true, hrefs: [], session: "kept" }), j([b5a, b5b, b5c]));

// =================================================================
section("C. The data layer's checks");
fresh();
const c1 = [errOf(S.addDepartment(ARJUN, { code: "QAT", name: "Quality" }))];
S.updateUser(AARAV, ARJUN, { grantPermissions: ["departments:create", "departments:edit"] });
c1.push(errOf(S.addDepartment(ARJUN, { code: "QAT", name: "Quality" })), errOf(S.updateDepartment(ARJUN, "QAT", { name: "Quality Assurance" })));
S.updateUser(AARAV, PRIYA, { denyPermissions: ["departments:edit"] });
c1.push(errOf(S.updateDepartment(PRIYA, "QAT", { name: "QA" })), errOf(S.addDepartment(PRIYA, { code: "LGL", name: "Legal" })));
check("C1", "store.js actorWith: Arjun can't add a department, then can add and edit one once granted departments:create / edit; Priya denied departments:edit can't edit (and can still add)",
  c1[0] !== "ok" && c1[1] === "ok" && c1[2] === "ok" && c1[3] !== "ok" && c1[4] === "ok", j(c1));
fresh();
const hol = { date: "2026-12-03", name: "Founders' Day", kind: "company" };
const c2 = [errOf(H.addHoliday(ARJUN, hol))];
S.updateUser(AARAV, ARJUN, { grantPermissions: ["holidays:manage"] });
c2.push(errOf(H.addHoliday(ARJUN, hol)));
S.updateUser(AARAV, PRIYA, { denyPermissions: ["holidays:manage"] });
c2.push(errOf(H.addHoliday(PRIYA, { ...hol, date: "2026-12-04" })));
check("C2", "holidays.js holidayManager: Arjun can't add a holiday, then can once granted holidays:manage; Priya denied it can't ('You can't add holidays.')",
  j(c2) === j(["You can't add holidays.", "ok", "You can't add holidays."]), j(c2));
fresh();
const sku = INV.allItems().find((i) => !i.assetType)?.sku;
const mv = { sku, type: "in", quantity: 2, reference: "PO-11R" };
const c3 = [errOf(INV.recordMovement(ARJUN, mv))];
S.updateUser(AARAV, ARJUN, { grantPermissions: ["inventory:view", "inventory:create"] });
c3.push(errOf(INV.recordMovement(ARJUN, mv)));
check("C3", "inventory-store actorWith: Arjun can't record a stock movement, then can once granted inventory:create",
  c3[0] === "You can't record stock movements." && c3[1] === "ok", j([sku, c3]));
// The stages: nothing an override can reach changes who decides, pays or fulfils.
fresh();
const before = { exFin: EX.pendingFor(KABIR, "fin").map((c) => c.id), exPay: EX.payableFor(KABIR).map((c) => c.id), arq: AR.allAssetRequests().map((r) => [r.id, AR.waitingOn(r)]), lv: LV.pendingFor(PRIYA, "hr").map((r) => r.id) };
editRecord(ARJUN, "grantPermissions", ["expenses:approve", "expenses:pay", "assets:approve", "assets:assign", "leave:approve", "attendance:approve", "approvals:decide"]);
editRecord(KABIR, "denyPermissions", ["expenses:approve", "expenses:pay"]);
editRecord(PRIYA, "denyPermissions", ["leave:approve", "attendance:approve"]);
const after = { exFin: EX.pendingFor(KABIR, "fin").map((c) => c.id), exPay: EX.payableFor(KABIR).map((c) => c.id), arq: AR.allAssetRequests().map((r) => [r.id, AR.waitingOn(r)]), lv: LV.pendingFor(PRIYA, "hr").map((r) => r.id) };
const c4 = [errOf(EX.payExpense(EX.allExpenses()[0]?.id, ARJUN)), errOf(AR.fulfilAssetRequest("ARQ-2", ARJUN, "AST-0001")), LV.pendingFor(ARJUN, "emp").length, EX.pendingFor(ARJUN, "emp").length];
check("C4", "Q-D3: stored grants of every stage permission to Arjun and stored denies on Kabir / Priya change nothing: Kabir still holds the Finance stage and can pay what he could, Priya still holds the HR stage, every asset request waits on the same people; Arjun can't pay a claim, fulfil a request or see anyone's leave",
  j(after) === j(before) && before.exFin.length > 0 && before.lv.length > 0 && c4[0] === "Only Finance or an Admin can pay expense claims." && c4[1] === "You can't assign assets." && c4[2] === 0 && c4[3] === 0, j([before, c4]));

// =================================================================
section("D. store.js: who may write overrides, and what");
fresh();
const d1 = [errOf(S.updateUser(PRIYA, ARJUN, { grantPermissions: ["reports:view"] })), j(ov(ARJUN)), errOf(S.updateUser(PRIYA, PRIYA, { denyPermissions: ["audit:view"] })), j(ov(PRIYA)),
  errOf(S.updateUser(AARAV, ARJUN, { grantPermissions: ["reports:view"], denyPermissions: [] })), j(ov(ARJUN))];
check("D1", "only an Admin: HR's grant on Arjun and its deny on herself are refused ('Only an Admin can change permission overrides.'), nothing saved; Aarav's grant on Arjun is saved",
  j(d1) === j([ADMIN_ONLY, j([null, null]), ADMIN_ONLY, j([null, null]), "ok", j([["reports:view"], []])]), j(d1));
S.updateUser(AARAV, ARJUN, { grantPermissions: ["reports:view", "inventory:view"] });
const d2 = [errOf(S.updateUser(PRIYA, ARJUN, { phone: "+91 90000 11111", grantPermissions: ["inventory:view", "reports:view", "reports:view"], denyPermissions: [] })),
  errOf(S.updateUser(PRIYA, ARJUN, { location: "Remote" })), errOf(S.updateUser(PRIYA, KABIR, { grantPermissions: [], denyPermissions: [] })), rec(ARJUN).phone, rec(ARJUN).location, j(ov(ARJUN))];
check("D2", "only a change counts: HR re-sending Arjun's lists (another order, a repeat), an edit that leaves them out, and empty lists for someone with none all save, and his overrides stay",
  j(d2) === j(["ok", "ok", "ok", "+91 90000 11111", "Remote", j([["reports:view", "inventory:view"], []])]), j(d2));
const d3 = [errOf(S.updateUser(AARAV, AARAV, { grantPermissions: ["reports:view"] })), errOf(S.updateUser(AARAV, AARAV, { grantPermissions: [], denyPermissions: [] })),
  errOf(S.updateUser(PRIYA, PRIYA, { phone: "+91 90000 22222", grantPermissions: [], denyPermissions: [] }))];
S.updateUser(AARAV, PRIYA, { denyPermissions: ["audit:view"] });
d3.push(errOf(S.updateUser(PRIYA, PRIYA, { denyPermissions: [] })), j(ov(PRIYA)));
check("D3", "never on one's own record, an Admin included: Aarav adding a grant on himself is refused ('You can't change your own permission overrides.'); unchanged lists on oneself still save; HR removing her own deny is refused (as HR first)",
  j(d3) === j([SELF, "ok", "ok", ADMIN_ONLY, j([null, ["audit:view"]])]), j(d3));
fresh();
const d4 = [errOf(S.updateUser(AARAV, VIKRAM, { role: "admin", designation: "Administrator" }))];
d4.push(errOf(S.updateUser(AARAV, VIKRAM, { grantPermissions: ["reports:view"] })), errOf(S.updateUser(AARAV, VIKRAM, { denyPermissions: ["audit:view"] })));
S.updateUser(AARAV, ARJUN, { grantPermissions: ["reports:view"] });
d4.push(errOf(S.updateUser(AARAV, ARJUN, { role: "admin", designation: "Administrator" })), rec(ARJUN).role,
  errOf(S.updateUser(AARAV, ARJUN, { role: "admin", designation: "Administrator", grantPermissions: [], denyPermissions: [] })), rec(ARJUN).role, j(ov(ARJUN)),
  errOf(S.updateUser(AARAV, ROHAN, { role: "admin", designation: "Administrator" })),
  errOf(S.addUser(AARAV, { name: "Asha Rao", email: "asha.rao@northwind.com", department: "ENG", designation: "Administrator", role: "admin", grantPermissions: ["reports:view"] })),
  errOf(S.addUser(AARAV, { name: "Asha Rao", email: "asha.rao@northwind.com", department: "ENG", designation: "Administrator", role: "admin", grantPermissions: [], denyPermissions: [] })));
check("D4", "never on an Admin's record: with Vikram made an Admin, a grant or a deny on him is refused; promoting Arjun while he has a grant is refused (he stays an Employee), and promoting him with his lists emptied saves; promoting Rohan (none) saves; adding an Admin with a grant is refused, without one saves",
  j(d4) === j(["ok", ON_ADMIN, ON_ADMIN, ON_ADMIN, "emp", "ok", "admin", j([[], []]), "ok", ON_ADMIN, "ok"]), j(d4));
fresh();
// Round Manager scoping part 1 (behaviour; was Kabir denied dashboard:view: Finance's landing permission is dashboard:finance now; a dashboard:view deny is refused by the general rule)
const d5 = [errOf(S.updateUser(AARAV, PRIYA, { denyPermissions: ["leave:approve"] })), errOf(S.updateUser(AARAV, KABIR, { denyPermissions: ["dashboard:finance"] })),
  errOf(S.updateUser(AARAV, ARJUN, { denyPermissions: ["dashboard:view"] })), j([ov(PRIYA), ov(KABIR), ov(ARJUN)])];
check("D5", "a deny of the permission that opens the role's own landing page is refused, with its own reason: HR leave:approve, Finance dashboard:finance, Employee dashboard:view",
  j(d5) === j(["leave:approve can't be denied: it opens the HR Manager dashboard.", "dashboard:finance can't be denied: it opens the Finance Manager dashboard.", "dashboard:view can't be denied: it opens the Employee dashboard.", j([[null, null], [null, null], [null, null]])]), j(d5));
const d6 = [
  errOf(S.updateUser(AARAV, ARJUN, { grantPermissions: ["attendance:view-all"] })), errOf(S.updateUser(AARAV, ARJUN, { grantPermissions: ["payroll:approve"] })),
  errOf(S.updateUser(AARAV, ARJUN, { grantPermissions: ["assets:assign"] })), errOf(S.updateUser(AARAV, PRIYA, { grantPermissions: ["users:delete"] })),
  errOf(S.updateUser(AARAV, ARJUN, { denyPermissions: ["payslip:view-own"] })), errOf(S.updateUser(AARAV, ARJUN, { grantPermissions: ["users:edit"] })),
  errOf(S.updateUser(AARAV, KABIR, { denyPermissions: ["salary:edit"] })), errOf(S.updateUser(AARAV, ARJUN, { grantPermissions: ["reports:view", "made:up"] })),
  errOf(S.updateUser(AARAV, KABIR, { grantPermissions: ["audit:view"], denyPermissions: ["audit:view"] })), errOf(S.updateUser(AARAV, ARJUN, { grantPermissions: "reports:view" })),
  errOf(S.updateUser(AARAV, ARJUN, { denyPermissions: [7] })), j([ov(ARJUN), ov(PRIYA), ov(KABIR)])];
check("D6", "only the allow-list: one of each exclusion is refused ('… can't be granted or denied: it stays with the role.'): attendance:view-all, payroll:approve, assets:assign, users:delete, a payslip:view-own deny, users:edit, a salary:edit deny, a made-up one; granted and denied at once; not a list; nothing saved",
  j(d6) === j([STAYS("attendance:view-all"), STAYS("payroll:approve"), STAYS("assets:assign"), STAYS("users:delete"), STAYS("payslip:view-own"), STAYS("users:edit"), STAYS("salary:edit"), STAYS("made:up"),
    "audit:view can't be both granted and denied.", "Permission overrides must be lists of permissions.", "Permission overrides must be lists of permissions.", j([[null, null], [null, null], [null, null]])]), j(d6));
fresh();
const newbie = (email, extra) => ({ name: "New Person", email, department: "ENG", designation: "Software Engineer", role: "emp", ...extra });
const d7a = S.addUser(AARAV, newbie("np1@northwind.com", { grantPermissions: ["reports:view"], denyPermissions: [] }));
const d7 = [errOf(d7a), j([d7a.record?.grantPermissions, d7a.record?.denyPermissions]), errOf(S.addUser(PRIYA, newbie("np2@northwind.com", { grantPermissions: ["reports:view"] }))),
  errOf(S.addUser(PRIYA, newbie("np3@northwind.com", { grantPermissions: [], denyPermissions: [] }))), errOf(S.addUser(PRIYA, newbie("np4@northwind.com")))];
check("D7", "adding: an Admin adding someone with a grant saves it; HR adding someone with one is refused; HR adding with empty lists, or none, saves",
  j(d7) === j(["ok", j([["reports:view"], []]), ADMIN_ONLY, "ok", "ok"]), j(d7));
fresh();
const d8a = S.addUser(AARAV, newbie("np5@northwind.com", { extraRoles: ["team-lead"] }));
const d8 = ["extraRoles" in d8a.record, "extraRoles" in rec(d8a.record.id), errOf(S.updateUser(PRIYA, ROHAN, { extraRoles: ["hr-staff"] })), "extraRoles" in rec(ROHAN)];
editRecord(KABIR, "extraRoles", ["inventory-manager"]);
d8.push("extraRoles" in rec(KABIR), errOf(S.updateUser(PRIYA, KABIR, { phone: "+91 90000 33333" })), "extraRoles" in rec(KABIR));
check("D8", "Q-D1, additional roles dropped: never saved on add or edit (the edit itself still saves); one stored before goes on the next save of that record",
  j(d8) === j([false, false, "ok", false, true, "ok", false]), j(d8));
fresh();
S.updateUser(AARAV, ROHAN, { grantPermissions: ["reports:view"] });
const d9 = [errOf(S.deactivateUser(AARAV, ROHAN, LEAVING_11Y())), errOf(S.reactivateUser(PRIYA, ROHAN)), errOf(S.updateUser(PRIYA, ROHAN, { designation: "Team Lead", role: "emp" })), j(ov(ROHAN))];
check("D9", "deactivate (Admin), reactivate (HR) and a designation change by HR of someone with overrides (Rohan) go through as before, the overrides kept",
  j(d9) === j(["ok", "ok", "ok", j([["reports:view"], null])]), j(d9));

// =================================================================
section("E. The pages");
const form = () => d.querySelector("form");
const options = (name) => [...d.querySelectorAll(`form input[name="${name}"]`)];
const values = (name) => options(name).map((i) => i.value);
const chips = () => [...d.querySelectorAll("#effective-permissions > *")].map(txt);
const reason = () => { const r = d.getElementById("overrides-reason"); return r && !r.hidden ? txt(r) : ""; };
const tick = (name, value, on = true) => { const i = options(name).find((x) => x.value === value); if (!i) return; i.checked = on; i.dispatchEvent(new w.Event("change", { bubbles: true })); };
const pick = (title) => { const s = d.getElementById("designation"); s.value = title; s.dispatchEvent(new w.Event("change")); };
const submit = () => { form().dispatchEvent(new w.Event("submit", { cancelable: true })); timers.splice(0); };
fresh(); setSession(...SESS.admin);
await open("users/user-form", { query: `?id=${ARJUN}` });
const e1 = { extra: d.querySelectorAll('input[name="extraRole"]').length, text: /Additional roles/.test(txt(d.querySelector("main"))), grants: values("grant"), denies: txt(d.getElementById("deny-options")),
  disabled: options("grant").some((i) => i.disabled), reason: reason(), count: txt(d.getElementById("effective-count")) };
check("E1", "user-form, an Admin editing Arjun: no Additional roles field; Extra permissions offers the 25 in the allow-list's order, enabled; Denied permissions says 'None' (an Employee holds none of them); no reason shown; 23 effective (L0: was 20)",
  e1.extra === 0 && !e1.text && j(e1.grants) === j(R0) && e1.denies === "None" && !e1.disabled && e1.reason === "" && e1.count === "23", j({ ...e1, grants: e1.grants.length }));
await open("users/user-form", { query: `?id=${PRIYA}` });
const e2 = { grants: values("grant"), denies: values("deny") };
tick("grant", "inventory:view"); tick("deny", "audit:view");
const e2b = { count: txt(d.getElementById("effective-count")), chips: chips(), granted: [...d.querySelectorAll("#effective-permissions [title]")].map((c) => [txt(c), c.title]) };
submit();
const e2c = ov(PRIYA);
check("E2", "an Admin editing Priya (HR): 15 to grant, HR's 10 to deny; ticking inventory:view and denying audit:view redraws Effective permissions at once (48, L0: was 45: + inventory:view, marked 'Granted to this person'; - audit:view); saving stores both lists",
  e2.grants.length === 15 && j(e2.denies) === j(offer.hr[1]) && e2b.count === "48" && j(e2b.chips) === j(permissionsOf({ role: "hr", grantPermissions: ["inventory:view"], denyPermissions: ["audit:view"] }))
  && j(e2b.granted) === j([["inventory:view", "Granted to this person"]]) && j(e2c) === j([["inventory:view"], ["audit:view"]]), j({ e2b: { ...e2b, chips: e2b.chips.length }, e2c }));
fresh(); setSession(...SESS.admin); S.updateUser(AARAV, ARJUN, { grantPermissions: ["reports:view"] });
await open("users/user-form", { query: `?id=${ARJUN}` });
const e3 = [txt(d.getElementById("effective-count")), j(chips()) === j(permissionsOf(rec(ARJUN))), options("grant").filter((i) => i.checked).map((i) => i.value)];
check("E3", "opening Arjun with a stored grant: it's ticked, and Effective permissions is his role's plus it (24; L0: was 21), as can() will check", j(e3) === j(["24", true, ["reports:view"]]), j(e3));
fresh(); S.updateUser(AARAV, ARJUN, { grantPermissions: ["reports:view"] }); setSession(...SESS.hr);
await open("users/user-form", { query: `?id=${ARJUN}` });
const e4 = { disabled: [...options("grant"), ...options("deny")].every((i) => i.disabled), n: options("grant").length, reason: reason(), title: d.querySelector("#grant-options label")?.title,
  ticked: options("grant").filter((i) => i.checked).map((i) => i.value), count: txt(d.getElementById("effective-count")) };
d.getElementById("phone").value = "+91 90000 44444";
submit();
const e4b = [rec(ARJUN).phone, j(ov(ARJUN))];
await open("users/user-form", { query: `?id=${ARJUN}` });
pick("HR Manager"); submit();   // HR's role holds reports:view: had the lists been sent, his grant would drop out and the save be refused
const e4c = [rec(ARJUN).designation, j(ov(ARJUN))];
check("E4", "HR editing Arjun: the 25 options are shown but every one disabled, with the reason on screen and on each option ('Only an Admin can change permission overrides.'); his grant shows ticked and counts (24; L0: was 21); saving his phone works and keeps the grant, and so does making him an HR Manager, whose role holds that grant anyway (the lists aren't sent, so nothing is dropped)",
  e4.disabled && e4.n === 25 && e4.reason === ADMIN_ONLY && e4.title === ADMIN_ONLY && j(e4.ticked) === j(["reports:view"]) && e4.count === "24" && j(e4b) === j(["+91 90000 44444", j([["reports:view"], null])])
  && j(e4c) === j(["HR Manager", j([["reports:view"], null])]), j({ ...e4, e4b, e4c }));
fresh(); setSession(...SESS.admin);
await open("users/user-form", { query: `?id=${AARAV}` });
const e5a = [reason(), txt(d.getElementById("grant-options")), txt(d.getElementById("deny-options"))];
S.updateUser(AARAV, VIKRAM, { role: "admin", designation: "Administrator" });
await open("users/user-form", { query: `?id=${VIKRAM}` });
const e5b = [reason(), txt(d.getElementById("grant-options")), txt(d.getElementById("deny-options")), txt(d.getElementById("effective-permissions"))];
// Round Manager scoping part 1 (behaviour; was 78: dashboard:finance is a 79th permission)
check("E5", "an Admin on their own record: 'You can't change your own permission overrides.'; on another Admin: 'An Admin holds every permission, so there's nothing to grant or deny.', both lists 'None', Every permission (86; L0: was 79)",
  j(e5a) === j(["You can't change your own permission overrides.", "None", "None"]) && j(e5b) === j(["An Admin holds every permission, so there's nothing to grant or deny.", "None", "None", "Every permission (86)"]), j([e5a, e5b]));
fresh(); setSession(...SESS.admin); S.updateUser(AARAV, ARJUN, { grantPermissions: ["departments:create", "reports:view"] });
await open("users/user-form", { query: `?id=${ARJUN}` });
pick("HR Manager");
const e6a = [values("grant").includes("departments:create"), j(values("deny")) === j(offer.hr[1]), options("grant").filter((i) => i.checked).map((i) => i.value)];
pick("Software Engineer");
const e6b = options("grant").filter((i) => i.checked).map((i) => i.value);
pick("Administrator");
const e6c = [reason(), txt(d.getElementById("grant-options"))];
submit();
const e6d = [rec(ARJUN).role, j(ov(ARJUN))];
check("E6", "the options follow the designation: picking HR Manager offers HR's denies and drops departments:create and reports:view from the ticked grants (HR holds both); back to Software Engineer both are still ticked; Administrator locks both lists with the Admin reason, and saving promotes him with his lists emptied",
  j(e6a) === j([false, true, []]) && j(e6b) === j(["departments:create", "reports:view"]) && e6c[0] === "An Admin holds every permission, so there's nothing to grant or deny." && e6c[1] === "None" && j(e6d) === j(["admin", j([[], []])]), j([e6a, e6b, e6c, e6d]));
const uf = fs.readFileSync(`${DIR}/users/user-form.html`, "utf8"), up = fs.readFileSync(`${DIR}/users/user-profile.html`, "utf8");
check("E7", "the wording says what happens now: user-form.html's overrides hint ('Applied on top of the default role, everywhere the app checks… Only an Admin can change them, and not on their own record…') and the Effective permissions note ('…plus the extra ones, minus the denied ones…'); user-profile.html's card note ('Applied on top of the role…'); no 'not applied' sentence left",
  /Applied on top of the default role, everywhere the app checks: extra permissions are added, denied ones taken away\. Only an Admin can change them, and not on their own record\./.test(uf)
  && /What the app checks: the default role's permissions, plus the extra ones, minus the denied ones\./.test(uf)
  && /Applied on top of the role, everywhere the app checks: extra permissions are added, denied ones taken away\. Only an Admin can change them\./.test(up)
  && !/don't change what (they|anyone) can do yet|aren't applied yet|Additional roles/.test(uf + up));
fresh(); setSession(...SESS.admin);
S.updateUser(AARAV, ARJUN, { grantPermissions: ["reports:view"] }); editRecord(ARJUN, "grantPermissions", ["reports:view", "payroll:approve"]);
await open("users/user-profile", { query: `?id=${ARJUN}` });
const card = () => [...d.querySelectorAll(".card")].find((c) => txt(c.querySelector(".card__title")) === "Permission overrides");
const e8a = [txt(card().querySelector(".card__meta")), [...card().querySelectorAll(".perm-chip")].map(txt), /Applied on top of the role/.test(txt(card()))];
await open("users/user-profile", { query: `?id=${KABIR}` });
const e8b = [txt(card().querySelector(".card__meta")), txt(card().querySelector(".card__body"))];
editRecord(AARAV, "denyPermissions", ["reports:view"]);
await open("users/user-profile", { query: `?id=${AARAV}` });
const e8c = [txt(card().querySelector(".card__meta")), txt(card().querySelector(".card__body"))];
check("E8", "user-profile's card shows the overrides that apply: Arjun's reports:view (1; his stored payroll:approve isn't shown), with the new note; Kabir 'No overrides'; an Admin with a stored deny 'No overrides'",
  j(e8a) === j(["1", ["reports:view"], true]) && j(e8b) === j(["0", "No overrides"]) && j(e8c) === j(["0", "No overrides"]), j([e8a, e8b, e8c]));
const navItems = () => [...d.querySelectorAll(".sidebar__nav .nav__item")].map(txt);
fresh(); setSession(...SESS.emp);
await open("dashboard/employee"); const e9a = navItems();
S.updateUser(AARAV, ARJUN, { grantPermissions: ["inventory:view"] });
await open("dashboard/employee"); const e9b = navItems();
fresh(); setSession(...SESS.hr); await open("dashboard/hr"); const e9c = navItems();
S.updateUser(AARAV, PRIYA, { denyPermissions: ["recruitment:view"] });
await open("dashboard/hr"); const e9d = navItems();
check("E9", "the sidebar follows them at the next load: Arjun granted inventory:view gets Inventory and Stock movements (and nothing else new); Priya denied recruitment:view loses Recruitment (and nothing else)",
  !e9a.some((x) => /Inventory|Stock movements/.test(x)) && j(e9b.filter((x) => !e9a.includes(x)).map((x) => x.replace(/\d+/g, "").trim())) === j(["Inventory", "Stock movements"])
  && e9c.some((x) => /Recruitment/.test(x)) && j(e9c.filter((x) => !e9d.includes(x))) === j(e9c.filter((x) => /Recruitment/.test(x))) && e9c.length - e9d.length === 1, j([e9b.length - e9a.length, e9c.length - e9d.length]));
check("E10", "no JS errors on any load", allJsErrors.length === 0, allJsErrors.slice(0, 5).join(" | "));

// =================================================================
section("P. Pre-11R, side by side (js-pre11R = office-os 86414a0)");
const S0 = await import("./js-pre11R/data/store.js");
const RB0 = await import("./js-pre11R/core/rbac.js");
const INV0 = await import("./js-pre11R/data/inventory-store.js");
fresh(); setSession(...SESS.emp);
const p1 = [errOf(S0.updateUser(PRIYA, ARJUN, { grantPermissions: ["reports:view", "payroll:approve"], extraRoles: ["team-lead"] })), j(S0.getUser(ARJUN).grantPermissions), S0.getUser(ARJUN).extraRoles?.[0],
  RB0.can("reports:view"), errOf(INV0.recordMovement(ARJUN, mv))];
check("P1", "pre-11R: HR could save any grant (payroll:approve included) and an extra role on Arjun, and nothing used them: can('reports:view') stayed false and the store refused his stock movement",
  j(p1) === j(["ok", j(["reports:view", "payroll:approve"]), "team-lead", false, "You can't record stock movements."]), j(p1));
const uf0 = fs.readFileSync(`${HERE}html-pre11R/users/user-form.html`, "utf8");
check("P2", "pre-11R: user-form.html had the Additional roles checkboxes and said overrides weren't applied yet",
  /name="extraRole"/.test(uf0) && /Additional roles and overrides aren't applied yet/.test(uf0));

// =================================================================
section("X. Scope");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
const JS_CHANGED = ["config/roles.js", "core/rbac.js", "data/approval-chain.js", "data/asset-requests-store.js", "data/expenses-store.js", "data/holidays.js", "data/inventory-store.js",
  "data/store.js", "data/users.js", "pages/user-form.js", "pages/user-profile.js"];
// Round 11T (layout; layout; was the live js, pages and css (X1 / X2 / X6): read from the frozen result js-pre11T / html-pre11T / css-pre11T = HEAD 75fa644, the live tree has 11T's stored payroll runs since (payruns.mjs X1 / X2))
const POST = `${HERE}html-pre11T`;
const jsNow = walk(`${HERE}js-pre11T`).sort(), jsPre = walk(`${HERE}js-pre11R`).sort();
const jsChanged = jsNow.filter((f) => !jsPre.includes(f) || SRC("js-pre11T", f) !== SRC("js-pre11R", f));
const pagesNow = walk(POST).sort(), pagesPre = walk(`${HERE}html-pre11R`).sort();
const pagesChanged = pagesNow.filter((f) => !pagesPre.includes(f) || fs.readFileSync(`${POST}/${f}`, "utf8") !== SRC("html-pre11R", f));
const CSS = `${HERE}css-pre11T`;
const cssChanged = walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== (fs.existsSync(`${HERE}css-pre11R/${f}`) ? SRC("css-pre11R", f) : null));
check("X1", "changed: exactly the 11 js files (roles, rbac, the six data files, users.js's comment, user-form.js, user-profile.js) and 2 pages (user-form.html, user-profile.html); no css; nothing added or removed (payroll-run.js and every other page untouched)",
  j(jsChanged) === j(JS_CHANGED) && j(jsNow) === j(jsPre) && j(pagesChanged) === j(["users/user-form.html", "users/user-profile.html"]) && j(pagesNow) === j(pagesPre) && cssChanged.length === 0 && j(walk(CSS).sort()) === j(walk(`${HERE}css-pre11R`).sort()),
  j([jsChanged, pagesChanged, cssChanged]));
const crlf = (s) => !/[^\r]\n/.test(s);
check("X2", "line endings as before: every changed file (11 js, 2 pages) CRLF only, and no final newline, as at HEAD",
  JS_CHANGED.every((f) => crlf(SRC("js-pre11T", f)) && !SRC("js-pre11T", f).endsWith("\n") && !SRC("js-pre11R", f).endsWith("\n"))
  && ["users/user-form.html", "users/user-profile.html"].every((f) => crlf(fs.readFileSync(`${POST}/${f}`, "utf8")) && !fs.readFileSync(`${POST}/${f}`, "utf8").endsWith("\n") && !SRC("html-pre11R", f).endsWith("\n")));
const SIX = ["data/approval-chain.js", "data/asset-requests-store.js", "data/expenses-store.js", "data/holidays.js", "data/inventory-store.js", "data/store.js"];
const roleLists = jsNow.filter((f) => /^(data|core)\//.test(f) && /\.permissions\b/.test(SRC("js", f)));
check("X3", "every data-layer and core permission check goes through permissionsOf: no role's .permissions read in data/ or core/ any more (pre-11R: the six data files and rbac.js), roleCan gone, each of the six and rbac.js importing permissionsOf from config/roles.js",
  j(roleLists) === "[]" && j(jsPre.filter((f) => /^(data|core)\//.test(f) && /\.permissions\b/.test(SRC("js-pre11R", f)))) === j(["core/rbac.js", ...SIX].sort())
  && !SIX.some((f) => /roleCan/.test(SRC("js", f))) && [...SIX, "core/rbac.js"].every((f) => /import \{[^}]*\bpermissionsOf\b[^}]*\} from "\.\.\/config\/roles\.js";/.test(SRC("js", f))), j(roleLists));
const identity = (dir, f) => SRC(dir, f).split(/\r?\n/).filter((l) => /\.role (===|!==)|STAGE_ROLE\[|deciderRole|roleKey\)/.test(l) && !/permissionsOf|userCan|roleCan/.test(l)).map((l) => l.trim()).sort();
const minus = (a, b) => { const left = [...b]; return a.filter((l) => { const i = left.indexOf(l); if (i === -1) return true; left.splice(i, 1); return false; }); };
// Round 13P (layout, X4; was the live js): 11R's identity checks on js-pre13P (686c99d); 13P moves deleteUser()'s two
// into deleteProblem() as `return LAST_ADMIN;` / `return ADMIN_ONLY_REMOVE;`, the same tests (delask.mjs X3)
const idRemoved = SIX.flatMap((f) => minus(identity("js-pre11R", f), identity("js-pre13P", f)).map((l) => `${f}: ${l}`));
const idAdded = SIX.flatMap((f) => minus(identity("js-pre13P", f), identity("js-pre11R", f)).map((l) => `${f}: ${l}`));
const NEW_ID = ['data/store.js: if (!changed && !(role === "admin" && record?.role !== "admin")) return null;'];
const idLines = (f) => SRC("js", f).split(/\r?\n/).filter((l) => /user\.role === STAGE_ROLE\[stage\]|stage === "admin" && user\.role === "admin"/.test(l)).length;
check("X4", "Q-D3: every role-identity check in the six data files is still there as it was (user.role === \"admin\", decider.role !== roleKey, STAGE_ROLE, the role keys passed in); the only new one is store.js's promotion test for overrides (a record becoming an Admin's); the two stage checks keep their role test beside the permission",
  idRemoved.length === 0 && j(idAdded.sort()) === j([...NEW_ID].sort()) && idLines("data/expenses-store.js") === 1 && idLines("data/asset-requests-store.js") === 1, j([idRemoved, idAdded]));
const imports = (f) => [...SRC("js", f).matchAll(/^import .* from "([^"]+)";/gm)].map((m) => m[1]);
check("X5", "no import cycle and nothing cached: config/roles.js imports only ./permissions.js; config/routes.js imports nothing; store.js imports config/routes.js and never core/auth / guard / rbac; no top-level let / var in roles.js, rbac.js or auth.js",
  j(imports("config/roles.js")) === j(["./permissions.js"]) && imports("config/routes.js").length === 0 && imports("data/store.js").includes("../config/routes.js")
  && !imports("data/store.js").some((m) => /core\/(auth|guard|rbac)/.test(m)) && ["config/roles.js", "core/rbac.js", "core/auth.js"].every((f) => !/^(let|var) /m.test(SRC("js", f))), j(imports("data/store.js")));
const lines = (s) => s.split(/\r?\n/);
function delta(a, b) {
  const ca = new Map(); a.forEach((l) => ca.set(l, (ca.get(l) ?? 0) + 1));
  const cb = new Map(); b.forEach((l) => cb.set(l, (cb.get(l) ?? 0) + 1));
  let added = 0, removed = 0;
  new Set([...a, ...b]).forEach((l) => { const x = (cb.get(l) ?? 0) - (ca.get(l) ?? 0); if (x > 0) added += x; else removed -= x; });
  return [added, removed];
}
const DELTAS = { "config/roles.js": [42, 0], "core/rbac.js": [7, 5], "data/approval-chain.js": [4, 2], "data/asset-requests-store.js": [7, 5], "data/expenses-store.js": [7, 5],
  "data/holidays.js": [4, 4], "data/inventory-store.js": [5, 4], "data/store.js": [52, 8], "data/users.js": [1, 1], "pages/user-form.js": [65, 15], "pages/user-profile.js": [3, 3],
  "users/user-form.html": [7, 20], "users/user-profile.html": [1, 1] };
const measured = Object.fromEntries(Object.keys(DELTAS).map((f) => [f, f.endsWith(".html") ? delta(lines(SRC("html-pre11R", f)), lines(fs.readFileSync(`${POST}/${f}`, "utf8"))) : delta(lines(SRC("js-pre11R", f)), lines(SRC("js-pre11T", f)))]));
check("X6", "line deltas (added, removed) per file, as measured at build", j(measured) === j(DELTAS), j(Object.fromEntries(Object.entries(measured).filter(([f, v]) => j(v) !== j(DELTAS[f])))));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
