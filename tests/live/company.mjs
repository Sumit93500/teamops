// usage: node company.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 14: data/company-store.js, the company profile (name, overview, mission), Admin-only (company:edit). ./js is the
// build. Clock fixed at Tue 6 Oct 2026 10:00 local.
//   A  the seed: today's sample name, overview and mission empty; a read writes nothing
//   B  who may change it: an Admin; HR, Finance, an employee, a manager and an inactive Admin can't
//   C  checks: required name, length limits, one-line name, control characters, unknown fields, nothing saved on refusal
//   D  a saved change: trimmed, stamped, read back; an old or broken saved copy reads as the seed; reset
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
NOW = new RealDate(2026, 9, 6, 10, 0, 0).getTime();
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const C = await import("./js/data/company-store.js");
const S = await import("./js/data/store.js");
console.log(`TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", SNEHA = "EMP-1029", ARJUN = "EMP-1105";
const KEY = "officeos:company-profile";
const SEED_NAME = "Northwind Technologies Pvt. Ltd.";

section("A. The seed");
const p0 = C.getCompanyProfile();
check("A1", "the seed is today's sample: the name, overview and mission not added, never updated", p0.name === SEED_NAME && p0.overview === "" && p0.mission === "" && p0.updatedAt === null && p0.updatedBy === null, j(p0));
check("A2", "companyName() is the name", C.companyName() === SEED_NAME, C.companyName());
check("A3", "reading wrote nothing to storage", !mem.has(KEY), j([...mem.keys()]));
p0.name = "Changed by the caller";
check("A4", "a read is a copy: changing it changes nothing", C.companyName() === SEED_NAME);

section("B. Who may change it");
const tries = [["HR", PRIYA], ["Finance", KABIR], ["an employee", ARJUN], ["a manager (Sneha)", SNEHA], ["nobody", null], ["an unknown id", "EMP-9999"]];
for (const [who, id] of tries) {
  const r = C.updateCompanyProfile(id, { name: "Contoso Ltd." });
  check(`B-${who}`, `${who} can't change the profile`, !r.ok && r.error === "Only an Admin can change the company profile." && C.companyName() === SEED_NAME && !mem.has(KEY), j(r));
}
{
  const box = JSON.parse(localStorage.getItem("officeos:users") ?? "null") ?? null;
  S.getAllUsers();   // seeds the users box
  const users = JSON.parse(localStorage.getItem("officeos:users"));
  const saved = localStorage.getItem("officeos:users");
  users.records.find((u) => u.id === AARAV).status = "inactive";
  localStorage.setItem("officeos:users", JSON.stringify(users));
  const r = C.updateCompanyProfile(AARAV, { name: "Contoso Ltd." });
  check("B-inactive", "an inactive Admin can't change it", !r.ok && C.companyName() === SEED_NAME, j(r));
  localStorage.setItem("officeos:users", saved);
  void box;
}

section("C. Checks (nothing is saved on a refusal)");
const bad = [
  ["C1", { name: "" }, "Enter the company name.", "name"],
  ["C2", { name: "   " }, "Enter the company name.", "name"],
  ["C3", { name: "N" }, "The company name must be at least 2 characters.", "name"],
  ["C4", { name: "x".repeat(101) }, "The company name can be at most 100 characters (it has 101).", "name"],
  ["C5", { overview: "y".repeat(1001) }, "The overview can be at most 1000 characters (it has 1001).", "overview"],
  ["C6", { mission: "z".repeat(301) }, "The mission can be at most 300 characters (it has 301).", "mission"],
  ["C7", { name: "Two\nlines" }, "The company name has a character that can't be saved.", "name"],
  ["C8", { overview: "Tab\there" }, "The overview has a character that can't be saved.", "overview"],
  ["C9", { name: 42 }, "The company name must be text.", "name"],
  ["C10", { logo: "x.png" }, "\"logo\" isn't part of the company profile.", "logo"],
  ["C11", {}, "Nothing to change.", undefined],
  ["C12", { name: "Good name", mission: "m".repeat(301) }, "The mission can be at most 300 characters (it has 301).", "mission"],
];
for (const [n, changes, error, field] of bad) {
  const r = C.updateCompanyProfile(AARAV, changes);
  check(n, `refused: ${error}`, !r.ok && r.error === error && r.field === field && C.companyName() === SEED_NAME && !mem.has(KEY), j(r));
}
const edge = C.updateCompanyProfile(AARAV, { name: "x".repeat(100), overview: "o".repeat(1000), mission: "m".repeat(300) });
check("C13", "exactly at every limit is fine (100, 1000, 300)", edge.ok && edge.profile.name.length === 100 && edge.profile.overview.length === 1000 && edge.profile.mission.length === 300, j(edge.ok ? "ok" : edge));
C.resetCompanyProfile();

section("D. A saved change");
const r1 = C.updateCompanyProfile(AARAV, { name: "  Contoso Ltd.  ", overview: "We make\nthings.", mission: " Do good work. " });
const p1 = C.getCompanyProfile();
check("D1", "trimmed, line breaks kept in the overview, stamped with who and when", r1.ok && p1.name === "Contoso Ltd." && p1.overview === "We make\nthings." && p1.mission === "Do good work." && p1.updatedBy === AARAV && p1.updatedAt === new RealDate(NOW).toISOString(), j(p1));
check("D2", "companyName() follows; storage now has the key", C.companyName() === "Contoso Ltd." && mem.has(KEY), C.companyName());
const r2 = C.updateCompanyProfile(AARAV, { mission: "Only the mission." });
check("D3", "a change to one field keeps the others", r2.ok && r2.profile.name === "Contoso Ltd." && r2.profile.overview === "We make\nthings." && r2.profile.mission === "Only the mission.", j(r2.profile));
localStorage.setItem(KEY, JSON.stringify({ version: 0, profile: { name: "Old shape" } }));
check("D4", "an old version reads as the seed (and isn't rewritten by reading)", C.companyName() === SEED_NAME && JSON.parse(mem.get(KEY)).version === 0);
localStorage.setItem(KEY, "{not json");
check("D5", "a broken saved copy reads as the seed", C.companyName() === SEED_NAME);
localStorage.setItem(KEY, JSON.stringify({ version: 1, profile: { name: "Half", overview: 3, mission: "" } }));
check("D6", "a copy with a field of the wrong type reads as the seed", C.companyName() === SEED_NAME);
C.updateCompanyProfile(AARAV, { name: "Contoso Ltd." });
C.resetCompanyProfile();
check("D7", "reset: the key is gone and the seed is back", !mem.has(KEY) && C.companyName() === SEED_NAME);
check("D8", "the limits are exported for the page round", j(C.COMPANY_LIMITS) === j({ name: [2, 100], overview: [0, 1000], mission: [0, 300] }), j(C.COMPANY_LIMITS));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
