// usage: node salwrite.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12V (R9a): payroll-store.js setSalary(actorUserId, userId, { gross, effectiveFrom }), store only, no page.
// salary:edit on record; not your own salary; checkSalary(); effectiveFrom "YYYY-MM-01" only; not covered by an
// approved payroll month (store.js approvedMonthCovering(), 12U's boundary, now shared with addUser); records only
// appended. ./js-pre12V, ./html-pre12V and ./css-pre12V are the code, pages and css before this round (office-os 2a0ef90).
//   G  before: nothing writes a salary (no setSalary; checkSalary uncalled)
//   V  valid writes: the record, what salaryFor / payrollRunFor then read, Finance and Admin
//   P  refusals in order: permission, unknown person, own salary, gross (checkSalary), effectiveFrom's form, approved
//   A  the approved-month boundary: October approved / nothing / September + October / October only prepared
//   H  append-only: earlier records byte for byte, nothing removed, a later record takes over from its date
//   R  the regime carried over;  N  readers unchanged;  J  12U's addUser unchanged through the shared helper
//   I  no approved month's figures ever change through setSalary (a grid); refusals store nothing
//   E  no page change seen (the salary page still has no writer);  X  scope
// Storage seeded Fri 30 Oct 2026 19:00; October settled and approved on 9 Nov where a case says; then 20 Nov.
import fs from "fs";

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
setNow(2026, 11, 20);

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ROHAN = "EMP-1042", DIVYA = "EMP-1061", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const safe = (fn) => { try { return fn(); } catch (e) { return { ok: false, error: `threw: ${e.message}` }; } };
const errOf = (r) => (r?.ok ? "ok" : r?.error ?? "no result");

const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const OLDPS = await import("./js-pre12V/data/payroll-store.js");   // before this round, on the same storage
const OLDS = await import("./js-pre12V/data/store.js");

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
const setup = (r, what) => { if (!r?.ok) console.log(`setup (${what}):`, errOf(r)); return r; };
// Seeded; `approve` lists the approved months: October for real on 9 Nov; September (which can't be prepared in this
// seed) written into the stored runs as a copy of approved October marked "2026-09" (12U's newhire does the same).
// `prepare` prepares October only. Then 20 Nov.
function seeded({ approve = [], prepare = false } = {}) {
  mem.clear(); setNow(2026, 10, 30, 19); S.getAllUsers(); PS.allSalaries(); PS.payrollRun(2026, 10);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
  // Round 12Y (behavior): setSalary() needs payroll:approve now (salpage.mjs S1); Kabir is made an Admin so the calls
  // below keep testing its rules (as Finance he'd be refused first, "Only an Admin can change a salary at once: ...")
  S.updateUser(AARAV, KABIR, { role: "admin" });
  if (approve.length) {
    setNow(2026, 11, 9);
    setup(safe(() => PS.prepareRun(KABIR, 2026, 10)), "prepare 2026-10"); setup(safe(() => PS.approveRun(AARAV, 2026, 10)), "approve 2026-10");
    if (approve.includes("2026-09")) {
      const box = JSON.parse(mem.get("officeos:payroll-runs"));
      const oct = box.records.find((r) => r.month === "2026-10" && r.status === "approved");
      box.records.push({ ...JSON.parse(JSON.stringify(oct)), id: `PR-${box.nextNum}`, month: "2026-09" }); box.nextNum += 1;
      mem.set("officeos:payroll-runs", JSON.stringify(box));
    }
  }
  if (prepare) { setNow(2026, 11, 9); setup(safe(() => PS.prepareRun(KABIR, 2026, 10)), "prepare 2026-10"); }
  setNow(2026, 11, 20);
}
const salKey = () => [...mem.keys()].find((k) => k.endsWith(":salaries"));
const salBox = () => JSON.parse(mem.get(salKey()));
const set = (actor, who, gross, effectiveFrom) => safe(() => PS.setSalary(actor, who, { gross, effectiveFrom }));
const OCT_APPROVED = "October 2026's payroll is already approved, so a salary can take effect only after it.";
const FIRST = "A salary takes effect on the 1st of a month.";
const GROSS = "Enter the monthly gross in whole rupees, more than ₹0.";
// Every approved run's rows still equal the live figures (its month's payrollRunFor for each person it pays).
function approvedIntact() {
  const box = JSON.parse(mem.get("officeos:payroll-runs") ?? '{"records":[]}');
  for (const run of box.records.filter((r) => r.status === "approved" && r.month === "2026-10")) {
    for (const row of run.rows) { const live = PS.payrollRunFor(row.userId, 2026, 10); if (!live || live.net !== row.net || live.gross !== row.gross) return `${row.userId}: ${row.net} vs ${live?.net}`; }
  }
  return null;
}

// =================================================================
section("G. Before: nothing writes a salary");
const oldSrc = fs.readFileSync(new URL("./js-pre12V/data/payroll-store.js", import.meta.url), "utf8");
const codeOf = (s) => s.split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join("\n");   // outside // comment lines
check("G1", "the code before: payroll-store.js has no setSalary(); checkSalary() is defined and called nowhere; the only salaries write is reset()",
  typeof OLDPS.setSalary === "undefined" && typeof OLDPS.checkSalary === "function" && (codeOf(oldSrc).match(/checkSalary\(/g) ?? []).length === 1
  && j(oldSrc.match(/salaries\.(add|update|remove|reset)\(/g)) === j(["salaries.reset("]));

// =================================================================
section("V. Valid writes");
seeded({ approve: ["2026-10"] });
const before = salBox();
const v1 = set(KABIR, ROHAN, 100000, "2026-12-01");
const after = salBox();
check("V1", "October approved: Kabir (made an Admin, 12Y) sets Rohan ₹1,00,000 from 1 Dec: saved, the record { userId, gross, effectiveFrom, regime \"new\" } with the next id",
  v1.ok && j(v1.record) === j({ userId: ROHAN, gross: 100000, effectiveFrom: "2026-12-01", regime: "new", id: `SAL-${before.nextNum}` }) && after.records.length === before.records.length + 1 && after.nextNum === before.nextNum + 1, j(v1));
check("V2", "...read from its date on: salaryFor Dec / Jan 2027 = ₹1,00,000, Nov = ₹92,000; payrollRunFor December's gross ₹1,00,000, November's ₹92,000",
  PS.salaryFor(ROHAN, 2026, 12)?.gross === 100000 && PS.salaryFor(ROHAN, 2027, 1)?.gross === 100000 && PS.salaryFor(ROHAN, 2026, 11)?.gross === 92000
  && PS.payrollRunFor(ROHAN, 2026, 12)?.gross === 100000 && PS.payrollRunFor(ROHAN, 2026, 11)?.gross === 92000, j([PS.payrollRunFor(ROHAN, 2026, 12)?.gross, PS.payrollRunFor(ROHAN, 2026, 11)?.gross]));
const v3 = set(AARAV, VIKRAM, 70000, "2026-11-01");
check("V3", "Aarav (Admin) sets Vikram ₹70,000 from 1 Nov (the current month, not approved): saved; November reads it", v3.ok && PS.salaryFor(VIKRAM, 2026, 11)?.gross === 70000, errOf(v3));
seeded({ approve: ["2026-10"] });
const hire = S.addUser(AARAV, { name: "Neha Kapoor", email: "neha.kapoor@northwind.com", department: "ENG", designation: "Software Engineer", dateOfJoining: "3 Nov 2026" });
const v4 = hire.ok ? set(KABIR, hire.record.id, 80000, "2026-11-01") : hire;
check("V4", "a new hire (joined 3 Nov, 12U) with no salary record: Kabir gives her ₹80,000 from 1 Nov: saved, regime \"new\"; November reads it",
  v4.ok && v4.record.regime === "new" && PS.salaryFor(hire.record.id, 2026, 11)?.gross === 80000 && PS.salaryHistory(hire.record.id).length === 1, errOf(v4));

// =================================================================
section("P. The refusals, in order");
seeded({ approve: ["2026-10"] });
const salAt = () => mem.get(salKey());
const p0 = salAt();
const P = [
  ["Arjun (Employee, no salary:edit)", set(ARJUN, ROHAN, 100000, "2026-12-01"), "You can't change salaries.", undefined],
  ["Priya (HR, no salary:edit)", set(PRIYA, ROHAN, 100000, "2026-12-01"), "You can't change salaries.", undefined],
  ["no actor", set(null, ROHAN, 100000, "2026-12-01"), "You can't change salaries.", undefined],
  ["an unknown person", set(KABIR, "EMP-9999", 100000, "2026-12-01"), "No employee with id EMP-9999.", undefined],
  ["Kabir's own salary", set(KABIR, KABIR, 150000, "2026-12-01"), "You can't change your own salary.", undefined],
  ["Aarav's own salary", set(AARAV, AARAV, 200000, "2026-12-01"), "You can't change your own salary.", undefined],
  ["gross 92000.5", set(KABIR, ROHAN, 92000.5, "2026-12-01"), GROSS, "gross"],
  ["gross 0", set(KABIR, ROHAN, 0, "2026-12-01"), GROSS, "gross"],
  ["gross -1", set(KABIR, ROHAN, -1, "2026-12-01"), GROSS, "gross"],
  ["gross \"100000\" (text)", set(KABIR, ROHAN, "100000", "2026-12-01"), GROSS, "gross"],
  ["gross missing", set(KABIR, ROHAN, undefined, "2026-12-01"), GROSS, "gross"],
  ["effectiveFrom 2026-12-15", set(KABIR, ROHAN, 100000, "2026-12-15"), FIRST, "effectiveFrom"],
  ["effectiveFrom 2026-12 (a month)", set(KABIR, ROHAN, 100000, "2026-12"), FIRST, "effectiveFrom"],
  ["effectiveFrom \"1 Dec 2026\" (display form)", set(KABIR, ROHAN, 100000, "1 Dec 2026"), FIRST, "effectiveFrom"],
  ["effectiveFrom 2026-13-01", set(KABIR, ROHAN, 100000, "2026-13-01"), FIRST, "effectiveFrom"],
  ["effectiveFrom missing", set(KABIR, ROHAN, 100000, undefined), FIRST, "effectiveFrom"],
  ["effectiveFrom 2026-10-01 (approved October)", set(KABIR, ROHAN, 100000, "2026-10-01"), OCT_APPROVED, "effectiveFrom"],
];
const pBad = P.filter(([, r, msg, field]) => errOf(r) !== msg || (field !== undefined && r.field !== field)).map(([label, r]) => `${label}: ${j(r)}`);
check("P1", `${P.length} refusals, each with its message (and field), in the order permission, person, own salary, gross, effectiveFrom, approved month; nothing stored`,
  pBad.length === 0 && salAt() === p0, j(pBad.slice(0, 3)));
const p2 = [set(ARJUN, ARJUN, 0, "x"), set(KABIR, "EMP-9999", 0, "x"), set(KABIR, KABIR, 0, "x"), set(KABIR, ROHAN, 0, "x"), set(KABIR, ROHAN, 1, "2026-10-15")];
check("P2", "the order, each with every later problem too: permission > person > own salary > gross > the 1st > approved",
  j(p2.map(errOf)) === j(["You can't change salaries.", "No employee with id EMP-9999.", "You can't change your own salary.", GROSS, FIRST]), j(p2.map(errOf)));

// =================================================================
section("A. The approved-month boundary");
seeded({ approve: ["2026-10"] });
const a1 = [set(KABIR, ROHAN, 100000, "2026-10-01"), set(KABIR, ROHAN, 100000, "2026-09-01"), set(KABIR, ROHAN, 100000, "2025-01-01")];
check("A1", "October approved: 1 Oct, 1 Sep and 1 Jan 2025 refused, naming October", a1.every((r) => errOf(r) === OCT_APPROVED && r.field === "effectiveFrom"), j(a1.map(errOf)));
const a2 = [set(KABIR, ROHAN, 100000, "2026-11-01"), set(KABIR, VIKRAM, 70000, "2027-01-01")];
check("A2", "1 Nov (the month after, the current one) and 1 Jan 2027 allowed", a2.every((r) => r.ok), j(a2.map(errOf)));
seeded();
const a3 = set(KABIR, ROHAN, 100000, "2026-01-01");
check("A3", "nothing approved: 1 Jan 2026 (a past month) allowed; January-March read it, and from 1 Apr his seeded record still takes over (appended, not replacing)",
  a3.ok && PS.salaryFor(ROHAN, 2026, 1)?.gross === 100000 && PS.salaryFor(ROHAN, 2026, 3)?.gross === 100000 && PS.salaryFor(ROHAN, 2026, 10)?.gross === 92000,
  j([1, 3, 10].map((m) => PS.salaryFor(ROHAN, 2026, m)?.gross)));
seeded({ approve: ["2026-09", "2026-10"] });
const a4 = [errOf(set(KABIR, ROHAN, 100000, "2026-09-01")), errOf(set(KABIR, ROHAN, 100000, "2026-10-01"))];
check("A4", "September and October approved: the newest, October, is named", a4.every((e) => e === OCT_APPROVED), j(a4));
seeded({ prepare: true });
const a5 = set(KABIR, ROHAN, 100000, "2026-10-01");
check("A5", "October prepared, not approved: 1 Oct allowed (a prepared run can be prepared again)", a5.ok && PS.storedRun(2026, 10)?.status === "prepared", errOf(a5));

// =================================================================
section("H. Append-only");
seeded({ approve: ["2026-10"] });
const h0 = salBox();
const h1 = [set(KABIR, ROHAN, 110000, "2027-01-01"), set(KABIR, ROHAN, 100000, "2026-12-01"), set(AARAV, ROHAN, 105000, "2026-12-01")];
const h = salBox();
check("H1", "three writes (1 Jan 2027, 1 Dec, then 1 Dec again): every earlier record byte for byte, none removed, three added with rising ids",
  h1.every((r) => r.ok) && j(h.records.slice(0, h0.records.length)) === j(h0.records) && h.records.length === h0.records.length + 3
  && j(h1.map((r) => r.record.id)) === j([0, 1, 2].map((k) => `SAL-${h0.nextNum + k}`)), j(h1.map(errOf)));
check("H2", "each month reads the record in effect: Nov ₹92,000 (the seed's), Dec ₹1,05,000 (the later of the two for 1 Dec), Jan 2027 ₹1,10,000",
  PS.salaryFor(ROHAN, 2026, 11)?.gross === 92000 && PS.salaryFor(ROHAN, 2026, 12)?.gross === 105000 && PS.salaryFor(ROHAN, 2027, 1)?.gross === 110000,
  j([11, 12].map((m) => PS.salaryFor(ROHAN, 2026, m)?.gross).concat(PS.salaryFor(ROHAN, 2027, 1)?.gross)));
const src = fs.readFileSync(new URL("./js/data/payroll-store.js", import.meta.url), "utf8");
check("H3", "payroll-store.js writes salaries only through add() in setSalary() (and reset()): no update or remove on the collection",
  j(src.match(/salaries\.(add|update|remove|reset)\(/g)) === j(["salaries.add(", "salaries.reset("]));

// =================================================================
section("R / N / J. The regime; readers; 12U's addUser");
seeded();
rawEdit("salaries", (s) => s.id === "SAL-7", (s) => { s.regime = "old"; });
const r1 = set(KABIR, ROHAN, 100000, "2026-12-01");
check("R1", "the regime carries over from their newest record (SAL-7 set to \"old\": the new one is \"old\")", r1.ok && r1.record.regime === "old", j(r1.record ?? r1));
const nBad = [];
for (const approve of [[], ["2026-10"]]) {
  seeded({ approve });
  for (const u of S.getAllUsers()) {
    for (const [y, m] of [[2026, 9], [2026, 10], [2026, 11]]) {
      if (j(PS.salaryFor(u.id, y, m)) !== j(OLDPS.salaryFor(u.id, y, m)) || j(PS.payrollRunFor(u.id, y, m)) !== j(OLDPS.payrollRunFor(u.id, y, m))) nBad.push(`${u.id} ${y}-${m}`);
    }
    if (j(PS.salaryHistory(u.id)) !== j(OLDPS.salaryHistory(u.id))) nBad.push(`${u.id} history`);
  }
  if (j(PS.allSalaries()) !== j(OLDPS.allSalaries()) || j(PS.runProblems(2026, 11)) !== j(OLDPS.runProblems(2026, 11))) nBad.push("all / problems");
}
check("N1", "readers unchanged: salaryFor, payrollRunFor, salaryHistory (everyone, Sep-Nov), allSalaries and runProblems == the code before's, October approved and not", nBad.length === 0, j(nBad.slice(0, 3)));
const jBad = [];
for (const approve of [[], ["2026-10"], ["2026-09", "2026-10"]]) {
  for (const joined of [undefined, "", "banana", "30 Sep 2026", "10 Oct 2026", "31 Oct 2026", "1 Nov 2026", "3 Nov 2026"]) {
    const fields = { name: "Neha Kapoor", email: "neha.kapoor@northwind.com", department: "ENG", designation: "Software Engineer", ...(joined === undefined ? {} : { dateOfJoining: joined }) };
    seeded({ approve }); const a = j(safe(() => S.addUser(AARAV, fields))), aStore = mem.get("officeos:users");
    seeded({ approve }); const b = j(safe(() => OLDS.addUser(AARAV, fields))), bStore = mem.get("officeos:users");
    if (a !== b || aStore !== bStore) jBad.push(`${approve.join("+")} / ${joined}: ${a} vs ${b}`);
  }
}
check("J1", "addUser through the shared approvedMonthCovering(): 8 joining dates x 3 approval states, results and stored users == 12U's", jBad.length === 0, j(jBad.slice(0, 2)));
seeded({ approve: ["2026-10"] });
check("J2", "approvedMonthCovering(): October approved: 31 Oct and none -> \"2026-10\"; 1 Nov -> null; nothing approved -> null",
  typeof S.approvedMonthCovering === "function" && S.approvedMonthCovering("2026-10-31") === "2026-10" && S.approvedMonthCovering(null) === "2026-10" && S.approvedMonthCovering("2026-11-01") === null && (seeded(), S.approvedMonthCovering("2026-10-31") === null));

// =================================================================
section("I. No approved month changes");
const iBad = [];
let tries = 0;
for (const approve of [["2026-10"], ["2026-09", "2026-10"]]) {
  for (const who of [ROHAN, VIKRAM, ARJUN, DIVYA]) {
    for (const from of ["2025-01-01", "2026-04-01", "2026-09-01", "2026-10-01", "2026-10-15", "2026-11-01", "2026-12-01"]) {
      seeded({ approve });
      const at = mem.get(salKey());
      const r = set(KABIR, who, 123456, from); tries++;
      if (!r.ok && mem.get(salKey()) !== at) iBad.push(`${who} ${from}: refused but stored`);
      const broke = approvedIntact();
      if (broke) iBad.push(`${approve.join("+")} ${who} ${from}: ${broke}`);
    }
  }
}
check("I1", `${tries} writes (4 people x 7 dates x 2 approval states): approved October's rows always equal the live figures; every refusal stores nothing`, iBad.length === 0, j(iBad.slice(0, 3)));
seeded({ approve: ["2026-10"] });
const key = salKey(), box = JSON.parse(mem.get(key));
box.records.push({ id: `SAL-${box.nextNum}`, userId: ROHAN, gross: 123456, effectiveFrom: "2026-10-01", regime: "new" }); box.nextNum += 1; mem.set(key, JSON.stringify(box));
check("I2", "the same backdated record written straight into storage (no setSalary) does change approved October's live figures (what the rule stops)", approvedIntact() !== null, j(approvedIntact()));

// =================================================================
section("E / X. Nothing visible; scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const callers = walk("./js").filter((p) => p !== "data/payroll-store.js" && /\bsetSalary\(/.test(codeOf(srcAt("./js", p))));
// Round 12W (behavior; was "no caller, still no writer"): 12W wires the salary page's Edit to setSalary() (saledit.mjs S1)
// Round 12Y (behavior; was "exactly one script calls setSalary(): the salary page"): the page calls proposeSalary() (salpage.mjs S4)
check("E1", "no script but payroll-store.js calls setSalary() (the salary page proposes, 12Y)", j(callers) === j([]), j(callers));
// Round 12W (layout; was the live js): 12V's own change set, read from its frozen result (js-pre12W = HEAD 34dd4ed); the
// live js has 12W's salary-structure.js since (saledit.mjs X1)
const jsNow = walk("./js-pre12W"), jsPre = walk("./js-pre12V");
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12W", p) !== srcAt("./js-pre12V", p));
check("X1", "exactly two js files changed, none added or removed: data/payroll-store.js and data/store.js", j(changedJs) === j(["data/payroll-store.js", "data/store.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12V").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12V", p))
  && walk("./css-pre12V").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12V", p)));
const crlf = (s) => !s.endsWith("\n") && !/(^|[^\r])\n/.test(s);
const code = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l)).join("\r\n");
const literals = (s) => [...new Set([...code(s).matchAll(/`[^`\r\n]*`|"[^"\r\n]*"/g)].map((m) => m[0]))].sort();
// Round 12X (layout; was the live js, here for X3 / X4): 12V's result as 69ae7ad has it (js-pre12X; 12W changed neither file)
const [ps, psPre, st, stPre] = [srcAt("./js-pre12X", "data/payroll-store.js"), srcAt("./js-pre12V", "data/payroll-store.js"), srcAt("./js-pre12X", "data/store.js"), srcAt("./js-pre12V", "data/store.js")];
const addedPs = literals(ps).filter((x) => !literals(psPre).includes(x)), addedSt = literals(st).filter((x) => !literals(stPre).includes(x));
check("X3", "both CRLF, no final newline; payroll-store.js's imports add only approvedMonthCovering and isValidDate; store.js's none; new literals: setSalary's messages (and \"new\" / the id template) only",
  [ps, psPre, st, stPre].every(crlf) && j(st.match(/^import .*$/gm)) === j(stPre.match(/^import .*$/gm))
  && j(ps.match(/^import .*$/gm).map((l) => l.replace(", approvedMonthCovering }", " }").replace(", isValidDate }", " }"))) === j(psPre.match(/^import .*$/gm))
  && addedSt.length === 0 && j(addedPs) === j(["\"A salary takes effect on the 1st of a month.\"", "\"You can't change salaries.\"", "\"You can't change your own salary.\"", "\"effectiveFrom\"", "\"salary:edit\"",
    "`${monthLabel(Number(approved.slice(0, 4)), Number(approved.slice(5, 7)))}'s payroll is already approved, so a salary can take effect only after it.`", "`No employee with id ${userId}.`"].sort()), j([addedSt, addedPs]));
const fn = (s, name) => { const a = s.indexOf(`function ${name}(`); return a < 0 ? "" : s.slice(a, s.indexOf("\n}", a) + 2); };
const dropExported = (s, name) => (fn(s, name) ? s.replace(`export ${fn(s, name)}`, "") : s);   // only where it exists
const psRest = (s) => dropExported(s, "setSalary").replace(/^import .*$/gm, "").split("\r\n").filter((l) => !/^\s*\/\//.test(l)).join("\r\n");
const stRest = (s) => dropExported(s, "approvedMonthCovering").replace(fn(s, "addUser"), "").split("\r\n").filter((l) => !/^\s*\/\//.test(l)).join("\r\n");
check("X4", "payroll-store.js: setSalary() added, comments and imports aside the rest the same; store.js: approvedMonthCovering() added and addUser's two lines, the rest the same (changeUser, every rule); addUser and setSalary() both use approvedMonthCovering(), neither works the month out itself",
  fn(ps, "setSalary").length > 300 && fn(st, "addUser").includes("approvedMonthCovering(") && !fn(st, "addUser").includes("approvedMonths(") && fn(ps, "setSalary").includes("approvedMonthCovering(") && psRest(ps).replace(/\r\n(\r\n)+/g, "\r\n") === psRest(psPre).replace(/\r\n(\r\n)+/g, "\r\n")
  && stRest(st).replace(/\r\n(\r\n)+/g, "\r\n") === stRest(stPre).replace(/\r\n(\r\n)+/g, "\r\n") && fn(st, "changeUser") === fn(stPre, "changeUser"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
