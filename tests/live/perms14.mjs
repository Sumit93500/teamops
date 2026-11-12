// usage: node perms14.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 14: the new permissions (config/permissions.js LOCATION_PERMISSIONS, config/roles.js LOCATION_GRANTS and
// hasPermission) and the stores that check them, for all four roles and a manager. ./js is the build.
//   A  the matrix: hasPermission for admin, hr, fin, emp and a manager (Sneha), for each of the seven
//   B  the same through the stores' own gates (what each person can actually do)
//   C  nothing old moved: PERMISSIONS, ALL_PERMISSIONS, each role's permissions and permissionsOf() don't include them;
//      overrides can't grant them; an inactive Admin holds none in practice
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
NOW = new RealDate(2026, 9, 6, 10, 0, 0).getTime();
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const P = await import("./js/config/permissions.js");
const R = await import("./js/config/roles.js");
const S = await import("./js/data/store.js");
const C = await import("./js/data/company-store.js");
const O = await import("./js/data/offices-store.js");
const L = await import("./js/data/locations-store.js");
const D = await import("./js/data/devices-store.js");
console.log(`TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const PEOPLE = { admin: "EMP-1001", hr: "EMP-1003", fin: "EMP-1008", emp: "EMP-1105", manager: "EMP-1029" };
const NEW = ["offices:view", "offices:manage", "company:edit", "locations:set-own", "locations:review", "devices:view-own", "devices:reset"];
//                 view   manage company set-own review view-own reset
const WANT = {
  admin:   [true,  true,  true,  false, true,  true,  true],
  hr:      [true,  false, false, false, false, true,  false],
  fin:     [true,  false, false, false, false, true,  false],
  emp:     [true,  false, false, false, false, true,  false],
  manager: [true,  false, false, false, false, true,  false],
};

section("A. The matrix (hasPermission)");
check("A0", "the seven, in config", j(P.ALL_LOCATION_PERMISSIONS) === j(NEW), j(P.ALL_LOCATION_PERMISSIONS));
for (const [who, id] of Object.entries(PEOPLE)) {
  const u = S.getUser(id);
  const got = NEW.map((p) => R.hasPermission(u, p));
  check(`A-${who}`, `${who} (${id}, role ${u.role}): ${NEW.filter((_, i) => WANT[who][i]).join(", ")}`, j(got) === j(WANT[who]), j(got));
}
check("A6", "Sneha is a manager (people report to her) but her role is emp: nothing extra", S.getAllUsers().some((u) => u.reportingManagerId === PEOPLE.manager) && S.getUser(PEOPLE.manager).role === "emp");
check("A7", "no record, or a role that isn't one: nothing", !R.hasPermission(null, "offices:view") && !R.hasPermission({ role: "guest" }, "offices:view"));
check("A8", "the old permissions answer as permissionsOf() does", Object.values(PEOPLE).every((id) => { const u = S.getUser(id); return P.ALL_PERMISSIONS.every((p) => R.hasPermission(u, p) === R.permissionsOf(u).includes(p)); }));

section("B. Through the stores");
const HQ = O.headOffice();
const BR = { name: "", address: "Hinjewadi, Pune", lat: 18.59, lng: 73.73 };
let n = 0;
for (const [who, id] of Object.entries(PEOPLE)) {
  const can = WANT[who];
  const office = O.createOffice(id, { ...BR, name: `Branch ${++n}` }).ok;
  const company = C.updateCompanyProfile(id, { mission: `Mission ${n}` }).ok;
  const review = L.pendingLocationChanges(id, S.getUser(id).role) !== null && R.hasPermission(S.getUser(id), "locations:review");
  const reset = D.resetDevices(id, PEOPLE.emp).ok;
  const ownDevices = D.devicesFor(id, id).ok;
  const others = D.devicesFor(id, id === PEOPLE.emp ? PEOPLE.fin : PEOPLE.emp).ok;
  const got = [office, company, review, reset, ownDevices, others];
  const want = [can[1], can[2], can[4], can[6], can[5], can[6]];
  check(`B-${who}`, `${who}: create office, edit company, review, reset devices, own devices, others' devices`, j(got) === j(want), j({ got, want }));
}
check("B6", "everyone reads offices (offices:view needs no gate in the data layer)", O.getOffices().length >= 1 && HQ.id === "OFF-1");
check("B7", "locations:set-own follows the flag, not the role: HR (not eligible) is refused; an eligible employee may", L.setOwnHome(PEOPLE.hr, "permanent", { address: "x", lat: 1, lng: 1 }).error === "You can't check in from home: HR hasn't turned it on for you."
  && (L.setHomeEligible(PEOPLE.hr, PEOPLE.emp, true), L.setOwnHome(PEOPLE.emp, "permanent", { address: "x", lat: 1, lng: 1 }).ok));
check("B8", "setting the flag needs users:edit (HR, Admin), not a new permission", L.setHomeEligible(PEOPLE.fin, PEOPLE.manager, true).ok === false && L.setHomeEligible(PEOPLE.admin, PEOPLE.manager, true).ok);

section("C. Nothing old moved");
check("C1", "PERMISSIONS has none of the new modules (the role matrix draws from it)", ["offices", "company", "locations", "devices"].every((m) => !(m in P.PERMISSIONS)));
check("C2", "ALL_PERMISSIONS has none of them, and still 79 entries (HEAD e226b93 has 79)", NEW.every((p) => !P.ALL_PERMISSIONS.includes(p)) && P.ALL_PERMISSIONS.length === 79, P.ALL_PERMISSIONS.length);
check("C3", "no role's permissions list has them (the roles list counts these)", Object.values(R.ROLES).every((r) => NEW.every((p) => !r.permissions.includes(p))));
check("C4", "the roles' permission counts are as before (HEAD e226b93): admin 79, hr 45, fin 37, emp 20", j(Object.values(R.ROLES).map((r) => r.permissions.length)) === j([79, 45, 37, 20]), j(Object.values(R.ROLES).map((r) => r.permissions.length)));
check("C5", "permissionsOf() doesn't include them for anyone", Object.values(PEOPLE).every((id) => NEW.every((p) => !R.permissionsOf(S.getUser(id)).includes(p))));
check("C6", "none is overridable", NEW.every((p) => !R.OVERRIDABLE.includes(p)));
const arjun = { ...S.getUser(PEOPLE.emp), grantPermissions: ["offices:manage", "devices:reset"] };
check("C7", "a stored grant of one is ignored", !R.hasPermission(arjun, "offices:manage") && !R.hasPermission(arjun, "devices:reset"));
const hr = { ...S.getUser(PEOPLE.hr), denyPermissions: ["offices:view"] };
check("C8", "a stored deny of one is ignored too (not overridable)", R.hasPermission(hr, "offices:view"));
const users = JSON.parse(mem.get("officeos:users"));
users.records.find((u) => u.id === PEOPLE.admin).status = "inactive";
mem.set("officeos:users", JSON.stringify(users));
check("C9", "an inactive Admin can't use them (the stores check the record is active)", !O.createOffice(PEOPLE.admin, { ...BR, name: "Late" }).ok && !C.updateCompanyProfile(PEOPLE.admin, { mission: "x" }).ok && !D.resetDevices(PEOPLE.admin, PEOPLE.emp).ok && L.pendingLocationChanges(PEOPLE.admin, "admin").length === 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
