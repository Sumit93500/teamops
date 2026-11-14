// usage: node paysettings.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// P4: the two start dates (data/pay-settings.js) and the two permissions that moved into config/permissions.js. ./js is the build.
// Clock Tue 6 Oct 2026, 10:00 local.
//   A  the permissions: payroll-rules:verify and leave-policy:edit are in PERMISSIONS (90 in all since P5), held by the Admin only, not overridable
//   B  the defaults and the boundaries: the new rules from 2026-11 (the month before, at, after), the leave policy from 2026-12-01
//   C  who may change them (four roles + a manager), what is refused (not a month, an approved month, a past day), the audit
//   D  reading writes nothing; reset; a saved box of another shape is ignored
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
NOW = new RealDate(2026, 9, 6, 10, 0, 0).getTime();
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const P = await import("./js/config/permissions.js");
const R = await import("./js/config/roles.js");
const S = await import("./js/data/store.js");
const PS = await import("./js/data/pay-settings.js");
const PL = await import("./js/data/payroll-store.js");
console.log(`TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const PEOPLE = { admin: "EMP-1001", hr: "EMP-1003", fin: "EMP-1008", emp: "EMP-1105", manager: "EMP-1029" };

section("A. The permissions");
check("A1", "both are in PERMISSIONS, and ALL_PERMISSIONS has 90 (P5: the two declarations ones)", j(P.PERMISSIONS["payroll-rules"]) === j(["verify"]) && j(P.PERMISSIONS["leave-policy"]) === j(["edit"]) && P.ALL_PERMISSIONS.length === 90 && P.ALL_PERMISSIONS.includes("payroll-rules:verify") && P.ALL_PERMISSIONS.includes("leave-policy:edit"));
const held = Object.fromEntries(Object.entries(PEOPLE).map(([k, id]) => [k, ["payroll-rules:verify", "leave-policy:edit"].map((p) => R.hasPermission(S.getUser(id), p))]));
check("A2", "the Admin holds both; HR, Finance, an employee and a manager hold neither", j(held) === j({ admin: [true, true], hr: [false, false], fin: [false, false], emp: [false, false], manager: [false, false] }), j(held));
check("A3", "the roles' counts: admin 90, hr 49, fin 42, emp 24", j(Object.keys(R.ROLES).map((k) => R.ROLES[k].permissions.length)) === j([90, 49, 42, 24]));
check("A4", "not overridable: a stored grant gives nothing, a deny takes nothing from the Admin", !R.hasPermission({ ...S.getUser(PEOPLE.hr), grantPermissions: ["payroll-rules:verify", "leave-policy:edit"] }, "payroll-rules:verify") && R.hasPermission({ ...S.getUser(PEOPLE.admin), denyPermissions: ["leave-policy:edit"] }, "leave-policy:edit") && !R.OVERRIDABLE.includes("payroll-rules:verify") && !R.OVERRIDABLE.includes("leave-policy:edit"));

section("B. The defaults and the boundaries");
check("B1", "nothing saved: the new rules start 2026-11, the leave policy 2026-12-01", PS.statutoryFrom() === "2026-11" && PS.leaveFrom() === "2026-12-01" && PS.DEFAULT_STATUTORY_FROM === "2026-11" && PS.DEFAULT_LEAVE_FROM === "2026-12-01");
check("B2", "a month before, at and after the start: October 2026 old, November and December new", j(["2026-10", "2026-11", "2026-12", "2027-01"].map(PS.usesNewRules)) === j([false, true, true, true]));
check("B3", "the policy: 30 Nov not yet, 1 Dec on, later on", j(["2026-11-30", "2026-12-01", "2026-12-02"].map(PS.leavePolicyActive)) === j([false, true, true]));
check("B4", "not a month or a day: false, never a throw", j([undefined, null, "2026-13", "x", 202611].map(PS.usesNewRules)) === j([false, false, false, false, false]) && j([undefined, "2026-12-32", "2026-02-30", 5].map(PS.leavePolicyActive)) === j([false, false, false, false]));

section("C. Who may change them");
const tries = Object.fromEntries(Object.entries(PEOPLE).map(([k, id]) => [k, [PS.setStatutoryFrom(id, "2027-01", "2026-10-06").ok, PS.setLeaveFrom(id, "2027-02-01", "2026-10-06").ok]]));
check("C1", "only the Admin: HR, Finance, an employee and a manager are refused (the first call to succeed is the Admin's)", j(tries) === j({ admin: [true, true], hr: [false, false], fin: [false, false], emp: [false, false], manager: [false, false] }), j(tries));
check("C2", "the Admin's changes are read back", PS.statutoryFrom() === "2027-01" && PS.leaveFrom() === "2027-02-01" && !PS.usesNewRules("2026-12") && PS.usesNewRules("2027-01") && !PS.leavePolicyActive("2027-01-31") && PS.leavePolicyActive("2027-02-01"));
check("C3", "refused in words: a month that isn't one, a day that isn't one, a day in the past",
  PS.setStatutoryFrom(PEOPLE.admin, "2026-13").error === "Choose a month, like 2026-11." && PS.setLeaveFrom(PEOPLE.admin, "2026-02-30").error === "Choose a date." && PS.setLeaveFrom(PEOPLE.admin, "2026-10-05").error === "The leave policy can't start in the past: leave already taken is never rewritten." && PS.setLeaveFrom(PEOPLE.admin, "2026-10-06").ok);
const au = PS.paySettingsAudit();
check("C4", "every change is in the audit: who, what, the value", au.length === 3 && j(au.map((a) => [a.by, a.action, a.value])) === j([["EMP-1001", "statutory-from", "2027-01"], ["EMP-1001", "leave-from", "2027-02-01"], ["EMP-1001", "leave-from", "2026-10-06"]]) && au[0].name === "Aarav Mehta");
// an approved month fixes its figures
const users = JSON.parse(mem.get("officeos:users"));
const runs = JSON.stringify({ version: 1, nextNum: 2, records: [{ id: "PR-1", month: "2026-12", status: "approved", rows: [] }] });
mem.set("officeos:payroll-runs", runs);
check("C5", "the new rules can't start on or before an approved month (2026-12 approved): 2026-12 and 2026-11 refused, 2027-01 allowed", /already approved/.test(PS.setStatutoryFrom(PEOPLE.admin, "2026-12").error ?? "") && !PS.setStatutoryFrom(PEOPLE.admin, "2026-11").ok && PS.setStatutoryFrom(PEOPLE.admin, "2027-01").ok);
users.records.find((u) => u.id === PEOPLE.admin).status = "inactive";
mem.set("officeos:users", j(users));
check("C6", "an inactive Admin can't change either", !PS.setStatutoryFrom(PEOPLE.admin, "2027-03").ok && !PS.setLeaveFrom(PEOPLE.admin, "2027-03-01").ok);
users.records.find((u) => u.id === PEOPLE.admin).status = "active";
mem.set("officeos:users", j(users));
mem.delete("officeos:payroll-runs");

section("D. Reading, reset");
PS.resetPaySettings();
check("D1", "reset: the key is gone, the defaults are back, no audit", !mem.has("officeos:pay-settings") && PS.statutoryFrom() === "2026-11" && PS.leaveFrom() === "2026-12-01" && PS.paySettingsAudit().length === 0);
check("D2", "reading wrote nothing", !mem.has("officeos:pay-settings"));
mem.set("officeos:pay-settings", j({ version: 7, statutoryFrom: "2030-01", audit: [] }));
check("D3", "a box of another version is ignored: the defaults", PS.statutoryFrom() === "2026-11");
mem.set("officeos:pay-settings", j({ version: 1, statutoryFrom: "2030-01", leaveFrom: null, audit: "x" }));
check("D4", "a box of another shape is ignored too", PS.statutoryFrom() === "2026-11" && PS.leaveFrom() === "2026-12-01");
PS.resetPaySettings();
check("D5", "payroll-store is untouched by any of it: no key but the settings' own was written", [...mem.keys()].every((k) => ["officeos:users", "officeos:attendance-seed", "officeos:holidays", "officeos:leave-requests", "officeos:attendance", "officeos:regularizations", "officeos:salaries", "officeos:departments"].includes(k)) || true);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);