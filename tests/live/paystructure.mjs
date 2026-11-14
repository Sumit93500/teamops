// usage: node paystructure.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// P2: employment (data/employment.js), salary templates, structures, regimes and declarations (data/pay-structure.js)
// and the pay engine (data/pay-engine.js: the year's tax, a month's TDS, the whole month, cost to company). Data only:
// the existing payroll computes as before (K). ./js is the build. Clock Tue 6 Oct 2026, 10:00 local.
//   A  everyone has a joining date and an employment type; the user records are untouched; a record's own value wins
//   B  template math: the lines always add up to the gross; rounding; a tiny gross; LTA; the stipend
//   C  the Admin changes a component rule (four roles + a manager); what is refused
//   D  a person's structure; an intern on the Standard template
//   E  the regime per tax year: new by default, old only by declaration
//   F  a year's tax: slabs, rebate, marginal relief, cess, both regimes, what is flagged
//   G  the old regime's deductions: HRA (metro 50%, others 40%), investments up to the cap, others
//   H  a month's TDS: an even year, a mid-year joiner, loss of pay, a leaver's last month, the old regime
//   I  the whole month: order, February's professional tax, ESI, the intern, net never below zero, the label
//   J  people on file: payFor and ctcFor on the seed; the old payroll's rows are not changed by it
//   K  nothing existing changed
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
NOW = new RealDate(2026, 9, 6, 10, 0, 0).getTime();
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const EM = await import("./js/data/employment.js");
const PS = await import("./js/data/pay-structure.js");
const E = await import("./js/data/pay-engine.js");
const keysAfterImport = [...mem.keys()];
const R = await import("./js/data/pay-rules.js");
const S = await import("./js/data/store.js");
const O = await import("./js/data/offices-store.js");
const P = await import("./js/data/payroll-store.js");
const L = await import("./js/data/leave-store.js");
const PAY = await import("./js/data/payroll.js");
console.log(`TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const PEOPLE = { admin: "EMP-1001", hr: "EMP-1003", fin: "EMP-1008", emp: "EMP-1105", manager: "EMP-1029" };
const ROLES5 = ["admin", "hr", "fin", "emp", "manager"];
const TY = "2026-04-01";

section("A. Joining dates and employment types");
const usersBefore = j(S.getAllUsers());
const all = S.getAllUsers().map((u) => EM.employmentOf(u.id));
check("A1", "all ten people have a joining date and an employment type", all.length === 10 && all.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.joiningDate) && EM.EMPLOYMENT_TYPES.includes(e.employmentType)), j(all.map((e) => [e.userId, e.joiningDate, e.employmentType])));
check("A2", "the four with their own profile values keep them (from: profile)", j(["EMP-1001", "EMP-1003", "EMP-1008", "EMP-1105"].map((id) => { const e = EM.employmentOf(id); return [e.joiningDate, e.employmentType, e.from.joiningDate, e.from.employmentType]; }))
  === j([["2019-04-04", "Full-time", "profile", "profile"], ["2020-07-15", "Full-time", "profile", "profile"], ["2020-11-02", "Full-time", "profile", "profile"], ["2023-01-12", "Full-time", "profile", "profile"]]));
check("A3", "the other six read the sample (from: sample)", j(["EMP-1017", "EMP-1023", "EMP-1029", "EMP-1042", "EMP-1061", "EMP-1088"].map((id) => { const e = EM.employmentOf(id); return [e.joiningDate, e.employmentType, e.kind, e.from.joiningDate]; }))
  === j([["2026-01-05", "Intern", "intern", "sample"], ["2026-03-16", "Full-time", "employee", "sample"], ["2021-08-09", "Full-time", "employee", "sample"], ["2026-02-02", "Full-time", "employee", "sample"], ["2024-01-08", "Intern", "intern", "sample"], ["2024-12-02", "Full-time", "employee", "sample"]]));
const underOne = all.filter((e) => e.kind === "employee" && e.joiningDate > "2025-10-06").map((e) => e.userId);
check("A4", "every case exists: 2 interns, 2 employees under a year on 6 Oct 2026 (Meera, Rohan), 6 over a year", all.filter((e) => e.kind === "intern").length === 2 && j(underOne) === j(["EMP-1023", "EMP-1042"]) && all.filter((e) => e.kind === "employee" && e.joiningDate <= "2025-10-06").length === 6);
check("A5", "nobody's sample joining date is after the first month their salary is on file", S.getAllUsers().every((u) => { const first = P.salaryHistory(u.id).at(-1)?.effectiveFrom; return !first || EM.employmentOf(u.id).joiningDate <= first; }));
check("A6", "the user records are untouched: no joining date or type was added to the six, and nothing was saved for it", j(S.getAllUsers()) === usersBefore && ["EMP-1017", "EMP-1023", "EMP-1029", "EMP-1042", "EMP-1061", "EMP-1088"].every((id) => S.getUser(id).dateOfJoining === undefined && S.getUser(id).employmentType === undefined) && !mem.has("officeos:employment"));
check("A7", "an unknown person: null; the kind of a type: intern in any case, anything else an employee", EM.employmentOf("EMP-9999") === null && EM.employmentOf(null) === null && j(["Intern", " intern ", "INTERN", "Full-time", "Contract", "", null].map(EM.employmentKind)) === j(["intern", "intern", "intern", "employee", "employee", "employee", "employee"]));
const hired = S.addUser(PEOPLE.admin, { name: "Nisha Verma", email: "nisha.verma@northwind.com", department: "ENG", designation: "Software Engineer", role: "emp", dateOfJoining: "1 Oct 2026", employmentType: "Intern" });
const nisha = hired.record?.id;
check("A8", "someone added through the user form's fields: their record's joining date and type are read (an intern from 1 Oct 2026)", hired.ok && j([EM.employmentOf(nisha).joiningDate, EM.employmentOf(nisha).kind, EM.employmentOf(nisha).from.employmentType]) === j(["2026-10-01", "intern", "profile"]), j(hired.error ?? EM.employmentOf(nisha)));
const plain = S.addUser(PEOPLE.admin, { name: "Omar Sheikh", email: "omar.sheikh@northwind.com", department: "SAL", designation: "Sales Executive", role: "emp" });
check("A9", "someone with nothing on their record and no sample: no joining date, Full-time by default", plain.ok && j([EM.employmentOf(plain.record.id).joiningDate, EM.employmentOf(plain.record.id).employmentType, EM.employmentOf(plain.record.id).from]) === j([null, "Full-time", { joiningDate: null, employmentType: "default" }]), j(plain.error ?? EM.employmentOf(plain.record?.id)));
const upd = S.updateUser(PEOPLE.admin, "EMP-1017", { employmentType: "Full-time" });
check("A10", "a value saved on the profile replaces the sample: Ananya made Full-time on her record is an employee; her sample joining date still applies", upd.ok && j([EM.employmentOf("EMP-1017").employmentType, EM.employmentOf("EMP-1017").kind, EM.employmentOf("EMP-1017").from]) === j(["Full-time", "employee", { joiningDate: "sample", employmentType: "profile" }]), j(upd.error ?? EM.employmentOf("EMP-1017")));
S.updateUser(PEOPLE.admin, "EMP-1017", { employmentType: "" });
const own = S.updateUser(PEOPLE.admin, "EMP-1042", { dateOfJoining: "1 Mar 2026" });
check("A12", "a joining date saved on the profile wins over the sample: Rohan 1 Mar 2026 (the sample says 2 Feb)", own.ok && EM.employmentOf("EMP-1042").joiningDate === "2026-03-01" && EM.employmentOf("EMP-1042").from.joiningDate === "profile", j(own.error ?? EM.employmentOf("EMP-1042")));
S.updateUser(PEOPLE.admin, "EMP-1042", { dateOfJoining: "" });
check("A11", "cleared again, the sample is back (Intern)", EM.employmentOf("EMP-1017").kind === "intern" && EM.employmentOf("EMP-1017").from.employmentType === "sample");

section("B. Template math");
const std = PS.payTemplate("standard"), stipend = PS.payTemplate("intern");
const amounts = (t, g, o) => PS.componentsFor(t, g, o).lines.map((l) => [l.key, l.amount]);
check("B1", "the templates: Standard (basic 50%, HRA 50% of basic, medical 1,250, conveyance 1,600, LTA 8.33% of basic optional, special the remainder) and Intern stipend (one line)",
  j(PS.payTemplates().map((t) => [t.id, t.name, t.kind, t.components.map((c) => [c.key, c.calc, c.value, c.wagesPart, c.optional])]))
  === j([["standard", "Standard", "employee", [["basic", "pctOfGross", 0.5, true, false], ["hra", "pctOfBasic", 0.5, false, false], ["medical", "fixed", 1250, false, false], ["conveyance", "fixed", 1600, false, false], ["lta", "pctOfBasic", 0.0833, false, true], ["special", "remainder", null, false, false]]],
    ["intern", "Intern stipend", "intern", [["stipend", "remainder", null, false, false]]]]));
check("B2", "1,00,000: basic 50,000, HRA 25,000, medical 1,250, conveyance 1,600, special 22,150", j(amounts(std, 100000)) === j([["basic", 50000], ["hra", 25000], ["medical", 1250], ["conveyance", 1600], ["special", 22150]]), j(amounts(std, 100000)));
check("B3", "with LTA on: 4,165 (8.33% of basic), special 17,985", j(amounts(std, 100000, { lta: true })) === j([["basic", 50000], ["hra", 25000], ["medical", 1250], ["conveyance", 1600], ["lta", 4165], ["special", 17985]]), j(amounts(std, 100000, { lta: true })));
check("B4", "an odd gross rounds half up and still adds up: 78,501 -> basic 39,251, HRA 19,626, special 16,774", j(amounts(std, 78501)) === j([["basic", 39251], ["hra", 19626], ["medical", 1250], ["conveyance", 1600], ["special", 16774]]), j(amounts(std, 78501)));
let sums = true;
for (let g = 0; g <= 250000; g += 137) for (const o of [{}, { lta: true }]) { const c = PS.componentsFor(std, g, o); if (c.total !== g || c.lines.some((l) => l.amount < 0 || !Number.isInteger(l.amount))) sums = false; }
check("B5", "for every gross tried (0 to 2,50,000), with and without LTA: whole rupees, none negative, the lines add up to the gross", sums);
check("B6", "a gross too small for the fixed lines: each takes only what is left (2,000 -> 1,000, 500, 500, 0, 0; 3,000 -> 1,500, 750, 750, 0, 0)", j(amounts(std, 2000).map((x) => x[1])) === j([1000, 500, 500, 0, 0]) && j(amounts(std, 3000).map((x) => x[1])) === j([1500, 750, 750, 0, 0]) && PS.componentsFor(std, 0).total === 0);
const c1 = PS.componentsFor(std, 100000);
check("B7", "the wages part is the basic (50,000); basic and HRA are named for the tax rules", c1.wages === 50000 && c1.basic === 50000 && c1.hra === 25000 && c1.total === 100000);
check("B8", "the stipend template: one line, the whole amount; no wages part", j(amounts(stipend, 18000)) === j([["stipend", 18000]]) && PS.componentsFor(stipend, 18000).wages === 0 && PS.componentsFor(stipend, 18000, { lta: true }).lines.length === 1);
check("B9", "a gross with paise or below zero: rounded, never negative", PS.componentsFor(std, 100000.4).total === 100000 && PS.componentsFor(std, -5).total === 0 && PS.componentsFor(std, "x").total === 0);

section("C. The Admin changes a component rule");
check("C0", "nothing saved yet by reading", !mem.has("officeos:pay-structures"));
const tries = Object.fromEntries(ROLES5.filter((k) => k !== "admin").map((k) => [k, PS.updateTemplateComponent(PEOPLE[k], "standard", "basic", 0.45)]));
check("C1", "HR, Finance, an employee and a manager can't: refused, nothing saved", Object.values(tries).every((r) => r.ok === false && r.error === "Only an Admin can change a salary template.") && !mem.has("officeos:pay-structures") && PS.payTemplate("standard").components[0].value === 0.5);
const u1 = PS.updateTemplateComponent(PEOPLE.admin, "standard", "medical", 2000, "2026-10-06");
check("C2", "the Admin sets medical to 2,000: 1,00,000 then gives medical 2,000 and special 21,400", u1.ok && j(amounts(PS.payTemplate("standard"), 100000)) === j([["basic", 50000], ["hra", 25000], ["medical", 2000], ["conveyance", 1600], ["special", 21400]]), j(u1.error ?? amounts(PS.payTemplate("standard"), 100000)));
const u2 = PS.updateTemplateComponent(PEOPLE.admin, "standard", "hra", 0.4, "2026-10-06");
check("C3", "HRA to 40% of basic: 20,000; the remainder takes the rest", u2.ok && j(amounts(PS.payTemplate("standard"), 100000)) === j([["basic", 50000], ["hra", 20000], ["medical", 2000], ["conveyance", 1600], ["special", 26400]]));
const bad = (key, value, t = "standard") => PS.updateTemplateComponent(PEOPLE.admin, t, key, value);
check("C4", "refused: the balancing line, an unknown line or template, a share of 0 or above 1, rupees that aren't whole or are negative",
  j([bad("special", 0.2).field, bad("stipend", 0.2, "intern").field, bad("bonus", 0.2).field, bad("basic", 0.5, "nope").field, bad("basic", 0).field, bad("basic", 1.2).field, bad("basic", "half").field, bad("medical", 1250.5).field, bad("medical", -1).field])
  === j(["key", "key", "key", "templateId", "value", "value", "value", "value", "value"]));
check("C5", "refused: percentages that promise more than the gross (basic 80% with HRA 40% of it is 112%); basic 70% with it is 98%: allowed", bad("basic", 0.8).error === "The percentage components would add up to more than the gross." && bad("basic", 0.7).ok && PS.payTemplate("standard").components[0].value === 0.7);
check("C6", "basic back to 50%; the seed itself was never changed (a fresh read after reset is the seed)", bad("basic", 0.5).ok && PS.payTemplate("standard").components[0].value === 0.5);
const au = PS.payStructureAudit();
check("C7", "each change is in the audit trail: who, the template, the line, the value", au.length === 4 && j(au.map((a) => [a.by, a.action, a.templateId, a.key, a.value])) === j([["EMP-1001", "template", "standard", "medical", 2000], ["EMP-1001", "template", "standard", "hra", 0.4], ["EMP-1001", "template", "standard", "basic", 0.7], ["EMP-1001", "template", "standard", "basic", 0.5]]) && au[0].on === "2026-10-06" && au[0].name === "Aarav Mehta", j(au.map((a) => [a.action, a.key, a.value])));
check("C8", "a template read is a copy", (() => { const t = PS.payTemplate("standard"); t.components[0].value = 0.1; return PS.payTemplate("standard").components[0].value === 0.5; })() && PS.payTemplate("nope") === null);
check("C10", "a share is at most 1, even for a line the gross check leaves out (LTA 1.5 refused)", bad("lta", 1.5).field === "value" && bad("lta", 1).ok && bad("lta", 0.0833).ok);
PS.resetPayStructures();
check("C9", "reset: the key is gone and the seed's rules are back (medical 1,250, HRA 50%)", !mem.has("officeos:pay-structures") && j(amounts(PS.payTemplate("standard"), 100000)) === j(amounts(std, 100000)) && PS.payStructureAudit().length === 0);

section("D. A person's structure");
check("D1", "by default an employee is on Standard and an intern on Intern stipend; LTA off; not assigned", j(["EMP-1105", "EMP-1017", nisha].map((id) => { const s = PS.structureOf(id); return [s.templateId, s.lta, s.assigned]; })) === j([["standard", false, false], ["intern", false, false], ["intern", false, false]]) && PS.structureOf("EMP-9999") === null);
const who = Object.fromEntries(ROLES5.map((k) => [k, PS.setStructure(PEOPLE[k], "EMP-1105", { templateId: "standard", lta: true }, "2026-10-06").ok]));
check("D2", "who may set one: the Admin and Finance (salary:edit); HR, an employee and a manager can't", j(who) === j({ admin: true, hr: false, fin: true, emp: false, manager: false }), j(who));
check("D3", "Arjun now has LTA: assigned, and his lines carry it", j(PS.structureOf("EMP-1105")) === j({ userId: "EMP-1105", templateId: "standard", lta: true, assigned: true }));
const sb = (f, id = "EMP-1105") => PS.setStructure(PEOPLE.fin, id, f);
check("D4", "refused: an unknown template, an unknown person, LTA that isn't on / off, LTA on the stipend template, a stray field", j([sb({ templateId: "gold" }).field, sb({ templateId: "standard" }, "EMP-9999").field, sb({ templateId: "standard", lta: "yes" }).field, sb({ templateId: "intern", lta: true }).field, sb({ templateId: "standard", gross: 5 }).field]) === j(["templateId", "userId", "lta", "lta", "gross"]));
check("D5", "a denied salary:edit on Finance's record takes it away; a granted one can't be given (not overridable)", (() => {
  const users = JSON.parse(mem.get("officeos:users"));
  users.records.find((u) => u.id === PEOPLE.fin).denyPermissions = ["salary:view"];
  users.records.find((u) => u.id === PEOPLE.hr).grantPermissions = ["salary:edit"];
  mem.set("officeos:users", j(users));
  const r = [PS.setStructure(PEOPLE.fin, "EMP-1105", { templateId: "standard" }).ok, PS.setStructure(PEOPLE.hr, "EMP-1105", { templateId: "standard" }).ok];
  delete users.records.find((u) => u.id === PEOPLE.fin).denyPermissions; delete users.records.find((u) => u.id === PEOPLE.hr).grantPermissions;
  mem.set("officeos:users", j(users));
  return j(r) === j([true, false]);
})());
PS.setStructure(PEOPLE.admin, "EMP-1105", { templateId: "standard", lta: true });

section("E. The regime, per tax year");
check("E1", "the tax year: April to March (Nov 2026 and Feb 2027 are 2026-27; Mar 2026 is 2025-26; Apr 2026 starts 2026-27)", j([PS.taxYearOf(2026, 11), PS.taxYearOf(2027, 2), PS.taxYearOf(2026, 3).label, PS.taxYearOf(2026, 4).label, PS.taxYearOf(2099, 12).label]) === j([{ label: "2026-27", start: 2026, startDate: "2026-04-01" }, { label: "2026-27", start: 2026, startDate: "2026-04-01" }, "2025-26", "2026-27", "2099-00"]));
check("E2", "everyone is on the new regime by default, with no declaration", S.getAllUsers().every((u) => PS.regimeOf(u.id, "2026-27") === "new" && PS.declarationOf(u.id, "2026-27") === null) && PS.regimeOf("EMP-9999", "2026-27") === "new");
const DECL = { rentMonthly: 30000, metro: false, investments: 150000, other: 50000 };
const dWho = Object.fromEntries(ROLES5.map((k) => [k, PS.declareOldRegime(PEOPLE[k], "EMP-1042", "2026-27", DECL, "2026-10-06").ok]));
check("E3", "the old regime only by declaration, recorded by the Admin or Finance; HR, an employee (even for themselves) and a manager can't", j(dWho) === j({ admin: true, hr: false, fin: true, emp: false, manager: false }) && PS.declareOldRegime("EMP-1042", "EMP-1042", "2026-27", DECL).ok === false, j(dWho));
check("E4", "Rohan is on the old regime for 2026-27, with the declaration on file (who recorded it, when); 2027-28 is still new", PS.regimeOf("EMP-1042", "2026-27") === "old" && j(PS.declarationOf("EMP-1042", "2026-27")) === j({ ...DECL, declaredOn: "2026-10-06", recordedBy: "EMP-1008" }) && PS.regimeOf("EMP-1042", "2027-28") === "new" && PS.regimeOf("EMP-1105", "2026-27") === "new");
const db = (ty, d, id = "EMP-1042") => PS.declareOldRegime(PEOPLE.fin, id, ty, d);
check("E5", "refused: a tax year that isn't one, an unknown person, negative or fractional rupees, metro not yes / no, a stray field", j([db("2026", DECL).field, db("2026-28", DECL).field, db("2026-27", DECL, "EMP-9999").field, db("2026-27", { ...DECL, rentMonthly: -1 }).field, db("2026-27", { ...DECL, investments: 1.5 }).field, db("2026-27", { ...DECL, metro: "yes" }).field, db("2026-27", { ...DECL, pan: "x" }).field]) === j(["taxYear", "taxYear", "userId", "rentMonthly", "investments", "metro", "pan"]));
check("E6", "an empty declaration is allowed (the old regime with nothing to deduct): zeros", db("2027-28", {}).ok && j(PS.declarationOf("EMP-1042", "2027-28")) === j({ rentMonthly: 0, metro: false, investments: 0, other: 0, declaredOn: "2026-10-06", recordedBy: "EMP-1008" }));
const back = PS.chooseNewRegime(PEOPLE.fin, "EMP-1042", "2027-28", "2026-10-06");
check("E7", "back to the new regime: the declaration stays on file, unused; HR can't do that either", back.ok && PS.regimeOf("EMP-1042", "2027-28") === "new" && PS.declarationOf("EMP-1042", "2027-28") !== null && PS.chooseNewRegime(PEOPLE.hr, "EMP-1042", "2026-27").ok === false && PS.regimeOf("EMP-1042", "2026-27") === "old");

section("F. A year's tax");
const tax = (income, regime = "new", d = TY) => E.taxOn(income, regime, d);
const near = (a, b) => Math.abs(a - b) < 1e-6;
check("F1", "new regime: nothing up to 12,00,000 (the 60,000 slab tax is rebated)", tax(1200000).total === 0 && tax(1200000).slabTax === 60000 && tax(1200000).rebate === 60000 && tax(400000).total === 0 && tax(800000).slabTax === 20000 && tax(0).total === 0);
check("F2", "one rupee over: marginal relief, the tax is that rupee (plus 4% cess = 1.04), not 60,000", near(tax(1200001).tax, 1) && near(tax(1200001).total, 1.04) && near(tax(1200001).slabTax, 60000.15));
check("F3", "relief up to about 12,70,588: at 12,70,000 the tax is 70,000 (the excess); at 12,75,000 it is the slab tax 71,250", near(tax(1270000).tax, 70000) && near(tax(1275000).tax, 71250) && near(tax(1275000).cess, 2850) && near(tax(1275000).total, 74100));
check("F4", "the slabs: 16,00,000 -> 1,20,000; 20,00,000 -> 2,00,000; 24,00,000 -> 3,00,000; 30,00,000 -> 4,80,000 (each + 4%)", j([1600000, 2000000, 2400000, 3000000].map((x) => Math.round(tax(x).tax))) === j([120000, 200000, 300000, 480000]) && near(tax(3000000).total, 499200));
check("F5", "the new regime's tax equals the existing engine's (data/payroll.js annualTax) before cess, at every income tried", [0, 399999, 400000, 800001, 1199999, 1200000, 1200001, 1234567, 1270588, 1270589, 1500000, 2399999, 2400001, 9999999].every((x) => near(tax(x).tax, PAY.annualTax(x))));
check("F6", "old regime: nothing up to 5,00,000 (12,500 rebated); 5,00,001 pays 12,500.20 + cess (no marginal relief); 10,00,000 -> 1,12,500; 15,00,000 -> 2,62,500", tax(500000, "old").total === 0 && tax(500000, "old").rebate === 12500 && near(tax(500001, "old").tax, 12500.2) && near(tax(1000000, "old").tax, 112500) && near(tax(1500000, "old").tax, 262500) && near(tax(1000000, "old").total, 117000) && tax(250000, "old").slabTax === 0);
check("F7", "the standard deduction comes with the rule: 75,000 new, 50,000 old", tax(0).standardDeduction === 75000 && tax(0, "old").standardDeduction === 50000);
check("F8", "flagged unverified: the cess row (both regimes) and the old-regime row; the rows used are named", tax(1500000).unverified === true && j(tax(1500000).rules) === j(["tax.new@all@2025-04-01", "tax.cess@all@2025-04-01"]) && j(tax(1500000, "old").rules) === j(["tax.old@all@2025-04-01", "tax.cess@all@2025-04-01"]));
check("F9", "above 50,00,000 no surcharge is computed, and the answer says so", tax(5000000).surchargeNotComputed === undefined && tax(5000001).surchargeNotComputed === true && tax(5000001).unverified === true);
check("F10", "a tax year before the first row (2024-25): no rule, 0, marked missing and unverified", tax(1500000, "new", "2024-04-01").missing === true && tax(1500000, "new", "2024-04-01").total === 0 && tax(1500000, "new", "2024-04-01").unverified === true && tax(1500000, "new", "2025-04-01").tax === 105000);
R.verifyRule(PEOPLE.admin, "tax.cess@all@2025-04-01", "2026-10-06");
check("F11", "once the Admin verifies the cess row, a new-regime figure is no longer flagged; the old regime's still is", tax(1500000).unverified === false && tax(1500000, "old").unverified === true);
const cess5 = R.addRule(PEOPLE.admin, { key: "tax.cess", effectiveFrom: "2027-04-01", value: { rate: 0.05 }, source: "https://example.org/cess" });
check("F12", "a rate change is a row: cess 5% from tax year 2027-28 changes that year only", cess5.ok && near(tax(1500000, "new", "2027-04-01").cess, 5250) && near(tax(1500000, "new", "2026-04-01").cess, 4200));
R.resetPayRules();

section("G. The old regime's deductions");
const hra = (f, d = TY) => E.hraExemption(f, d).exempt;
check("G1", "HRA, not a metro (40%): the least of HRA 3,00,000, rent 3,60,000 - 10% of 9,00,000 = 2,70,000, and 40% of salary = 3,60,000 -> 2,70,000", hra({ hra: 300000, salary: 900000, rent: 360000, metro: false }) === 270000);
check("G2", "each of the three can be the least: HRA received (1,00,000); the salary share (40% of 5,00,000 = 2,00,000)", hra({ hra: 100000, salary: 900000, rent: 600000, metro: false }) === 100000 && hra({ hra: 400000, salary: 500000, rent: 600000, metro: false }) === 200000);
check("G3", "a metro is 50% of salary: 2,50,000 where the rest is 2,00,000", hra({ hra: 400000, salary: 500000, rent: 600000, metro: true }) === 250000 && hra({ hra: 400000, salary: 500000, rent: 600000, metro: false }) === 200000);
check("G4", "no rent, or rent under 10% of salary: nothing exempt", hra({ hra: 300000, salary: 900000, rent: 0 }) === 0 && hra({ hra: 300000, salary: 900000, rent: 90000 }) === 0 && hra({ hra: 300000, salary: 900000, rent: 90001 }) === 1);
const ded = E.oldRegimeDeductions({ declaration: DECL, basicAnnual: 900000, hraAnnual: 450000 }, TY);
check("G5", "a declaration (rent 30,000 a month, investments 1,50,000, others 50,000) on basic 9,00,000 and HRA 4,50,000: HRA 2,70,000 + 1,50,000 + 50,000 = 4,70,000", j([ded.hra, ded.investments, ded.other, ded.total]) === j([270000, 150000, 50000, 470000]), j(ded));
check("G6", "investments above the cap count as 1,50,000; no declaration, nothing", E.oldRegimeDeductions({ declaration: { ...DECL, investments: 400000 }, basicAnnual: 900000, hraAnnual: 450000 }, TY).investments === 150000 && E.oldRegimeDeductions({ declaration: null, basicAnnual: 900000, hraAnnual: 450000 }, TY).total === 0);
const cmp = E.compareRegimes({ annualGross: 1800000, declaration: DECL, basicAnnual: 900000, hraAnnual: 450000 }, TY);
check("G7", "the same 18,00,000 a year under both: new 1,50,800, old 2,04,360 with that declaration; the new regime is lower by 53,560", j([cmp.new, cmp.old, cmp.lower, cmp.saving]) === j([150800, 204360, "new", 53560]), j(cmp));
const cmp2 = E.compareRegimes({ annualGross: 1800000, declaration: { rentMonthly: 60000, metro: true, investments: 150000, other: 400000 }, basicAnnual: 900000, hraAnnual: 450000 }, TY);
check("G8", "with rent 60,000 in a metro (HRA exempt 4,50,000) and 4,00,000 of other deductions the old regime is lower: 7,50,000 taxable, 65,000 against 1,50,800", j([cmp2.new, cmp2.old, cmp2.lower, cmp2.saving, cmp2.deductions.hra]) === j([150800, 65000, "old", 85800, 450000]), j([cmp2.new, cmp2.old, cmp2.lower, cmp2.saving]));

section("H. A month's TDS");
const yearOf = (monthly, opts = {}) => { let income = 0, tds = 0; const out = []; for (let i = opts.from ?? 0; i < 12; i++) { const paid = opts.paid?.[i] ?? monthly; const t = E.tdsFor({ regime: opts.regime ?? "new", paidGross: paid, monthlyGross: monthly, incomeSoFar: income, tdsSoFar: tds, monthsBefore: i, monthsLeft: 12 - i, finalMonth: opts.final === i, deductions: opts.deductions ?? 0 }, TY); out.push(t.tds); income += paid; tds += t.tds; if (opts.final === i) break; } return { months: out, tds, income }; };
const even = yearOf(150000);
check("H1", "1,50,000 a month, a whole year, new regime: 17,25,000 taxable, 1,50,800 for the year; 12,567 a month and the last month settles to the rupee", even.months.slice(0, 11).every((x) => x === 12567) && even.tds === 150800 && even.months[11] === 150800 - 12567 * 11, j(even.months));
const first = E.tdsFor({ paidGross: 150000, monthlyGross: 150000 }, TY);
check("H2", "the first month shows its working: projected 18,00,000, standard deduction 75,000, taxable 17,25,000", j([first.projected, first.standardDeduction, first.taxable, first.monthly, first.tds, first.regime]) === j([1800000, 75000, 1725000, 12567, 12567, "new"]) && near(first.annual.total, 150800));
check("H3", "1,00,000 a month: 11,25,000 taxable is under the rebate limit, so no TDS all year", yearOf(100000).tds === 0);
const joiner = yearOf(150000, { from: 6 });
check("H4", "a mid-year joiner (from October, 6 months of 1,50,000 = 9,00,000): nothing to pay; at 2,50,000 a month (15,00,000, 14,25,000 taxable) the year's 97,500 is 16,250 in each of the 6 months", joiner.tds === 0 && (() => { const y = yearOf(250000, { from: 6 }); return y.tds === 97500 && y.months.length === 6 && y.months.every((x) => x === 16250); })(), j(yearOf(250000, { from: 6 }).months));
const lop = yearOf(150000, { paid: { 3: 75000 } });
check("H5", "a month of half pay (loss of pay in July): the year's tax is on what was actually paid (17,25,000 gross), and the months add up to it", lop.income === 1725000 && lop.tds === Math.floor(E.taxOn(1725000 - 75000, "new", TY).total + 0.5) && lop.months[3] < 12567, j(lop.months));
const leaver = yearOf(150000, { final: 5 });
check("H6", "a leaver's last month (September) settles the year on the 6 months paid (9,00,000: no tax), and nothing is taken back", leaver.income === 900000 && leaver.months[5] === 0 && leaver.tds === 12567 * 5, j(leaver.months));
const oldYear = yearOf(150000, { regime: "old", deductions: 470000 });
check("H7", "the old regime with 4,70,000 of deductions: 18,00,000 - 50,000 - 4,70,000 = 12,80,000 taxable, 2,04,360 for the year", oldYear.tds === 204360 && oldYear.months[0] === 17030, j(oldYear.months));
check("H8", "the new regime ignores declared deductions", E.tdsFor({ paidGross: 150000, monthlyGross: 150000, deductions: 470000 }, TY).tds === 12567 && E.tdsFor({ paidGross: 150000, monthlyGross: 150000, deductions: 470000 }, TY).deductions === 0);
check("H9", "never below zero: more already deducted than the year needs gives 0", E.tdsFor({ paidGross: 150000, monthlyGross: 150000, incomeSoFar: 150000 * 5, tdsSoFar: 999999, monthsBefore: 5, monthsLeft: 7 }, TY).tds === 0);
check("H10", "a raise mid-year catches up over the months left: 1,50,000 for 6 months then 2,00,000", (() => { let income = 0, tds = 0; for (let i = 0; i < 12; i++) { const m = i < 6 ? 150000 : 200000; const t = E.tdsFor({ paidGross: m, monthlyGross: m, incomeSoFar: income, tdsSoFar: tds, monthsBefore: i, monthsLeft: 12 - i }, TY); income += m; tds += t.tds; } return income === 2100000 && tds === Math.floor(E.taxOn(2100000 - 75000, "new", TY).total + 0.5); })());

section("I. The whole month");
const M = (f) => E.payMonth({ template: std, state: "Haryana", year: 2026, month: 10, onFullWages: false, ...f });
const m1 = M({ gross: 150000 });
check("I1", "Haryana, 1,50,000, Standard, new regime, Oct 2026: wages 75,000; PF 3,000 (ceiling 25,000); no ESI; PT 0; LWF 35; TDS 12,567; net 1,34,398",
  j([m1.wages.wages, m1.deductions, m1.deductionsTotal, m1.net]) === j([75000, { pf: 3000, esi: 0, pt: 0, lwf: 35, tds: 12567 }, 15602, 134398]), j([m1.wages.wages, m1.deductions, m1.net]));
check("I2", "the employer's side, apart from the pay: PF 3,000 (EPS 2,083 + EPF 917), EDLI 125, admin 125, LWF 70, gratuity 3,606 = 6,926; cost to company 1,56,926", j(m1.employer) === j({ pf: 3000, eps: 2083, epf: 917, edli: 125, pfAdmin: 125, esi: 0, lwf: 70, gratuity: 3606, total: 6926 }) && m1.costToCompany === 156926, j(m1.employer));
check("I3", "it says what it is: the month, the tax year, the template, the regime, section 392 of the 2025 Act, and \"Unverified rates\"", j([m1.month, m1.taxYear, m1.templateId, m1.kind, m1.regime, m1.tax.section, m1.tax.act, m1.unverified, m1.label]) === j(["2026-10", "2026-27", "standard", "employee", "new", "392", "Income-tax Act, 2025", true, "Unverified rates"]));
check("I4", "March 2026 is still section 192 (the 1961 Act); the lines add up to the gross", M({ gross: 150000, year: 2026, month: 3 }).tax.section === "192" && M({ gross: 150000, year: 2026, month: 3 }).taxYear === "2025-26" && m1.components.reduce((s, c) => s + c.amount, 0) === 150000);
let pt = 0, tdsSum = 0, income = 0, nets = true; const ptBy = {};
for (const [i, [y, mo]] of PAY.taxYearMonths(2026, 4).entries()) { const r = E.payMonth({ gross: 150000, template: std, state: "Maharashtra", year: y, month: mo, onFullWages: false, soFar: { incomeSoFar: income, tdsSoFar: tdsSum, monthsBefore: i, monthsLeft: 12 - i } }); pt += r.deductions.pt; ptBy[mo] = r.deductions.pt; tdsSum += r.deductions.tds; income += r.gross; if (r.net < 0 || r.net !== r.gross - r.deductionsTotal) nets = false; }
check("I5", "a whole tax year in Maharashtra: professional tax 200 a month and 300 in February (2,500); the TDS adds up to the year's 1,50,800", pt === 2500 && ptBy[2] === 300 && ptBy[1] === 200 && ptBy[3] === 200 && tdsSum === 150800 && nets, j([pt, ptBy, tdsSum]));
const sep = M({ gross: 50000, month: 9 }), aug = M({ gross: 50000, month: 8 });
check("I6", "the PF ceiling by the month: August 2026 on 15,000 (1,800), September and October on 25,000 (3,000)", aug.deductions.pf === 1800 && sep.deductions.pf === 3000 && M({ gross: 50000 }).deductions.pf === 3000);
check("I7", "the full-wages switch: PF on the wages of 75,000 is 9,000", M({ gross: 150000, onFullWages: true }).deductions.pf === 9000 && M({ gross: 150000, onFullWages: true }).employer.pf === 9000 && M({ gross: 150000, onFullWages: true }).employer.eps === 2083);
const junior = M({ gross: 18000 });
check("I8", "a junior at 18,000: PF 1,080 on wages of 9,000; ESI 135 (employer 585); LWF 35; no TDS; net 16,750", j(junior.deductions) === j({ pf: 1080, esi: 135, pt: 0, lwf: 35, tds: 0 }) && junior.net === 16750 && junior.employer.esi === 585, j(junior.deductions));
const cut = M({ gross: 12000, monthlyGross: 30000 });
check("I9", "a month cut to 12,000 by loss of pay on a 30,000 salary: not under ESI (the full gross decides); the lines are on what was paid", cut.deductions.esi === 0 && cut.gross === 12000 && cut.monthlyGross === 30000 && cut.components[0].amount === 6000 && cut.deductions.pf === 720);
const intern = E.payMonth({ gross: 18000, template: stipend, state: "Haryana", year: 2026, month: 10, onFullWages: true });
check("I10", "an intern's stipend of 18,000: one line; no PF, no ESI, no gratuity; LWF 35; net 17,965; employer cost only the LWF 70", j([intern.kind, intern.components.map((c) => c.key), intern.deductions, intern.net, intern.employer.total, intern.statutory.pf.applies, intern.statutory.esi.applies, intern.statutory.gratuity.applies]) === j(["intern", ["stipend"], { pf: 0, esi: 0, pt: 0, lwf: 35, tds: 0 }, 17965, 70, false, false, false]), j([intern.deductions, intern.net, intern.employer.total]));
const internBig = E.payMonth({ gross: 150000, template: stipend, state: "Haryana", year: 2026, month: 10 });
check("I11", "a stipend is taxed by the slabs like any pay: 1,50,000 a month gives the same TDS, 12,567", internBig.deductions.tds === 12567 && internBig.deductions.pf === 0);
const tiny = M({ gross: 30 });
check("I12", "net never goes below zero: on 30 rupees each deduction takes only what is left (PF 2, LWF 0); on nothing, nothing", tiny.net >= 0 && tiny.net === tiny.gross - tiny.deductionsTotal && M({ gross: 0 }).net === 0 && M({ gross: 0 }).deductionsTotal === 0 && M({ gross: -100 }).gross === 0, j(tiny.deductions));
const squeezed = M({ gross: 3000, soFar: { incomeSoFar: 5000000, tdsSoFar: 0, monthsBefore: 11, monthsLeft: 1 } });
check("I13", "a last month owing more tax than it pays: TDS takes what is left after the other deductions, net 0", squeezed.net === 0 && squeezed.deductions.tds === 3000 - squeezed.deductions.pf - squeezed.deductions.esi - squeezed.deductions.lwf && j([squeezed.deductions.pf, squeezed.deductions.esi, squeezed.deductions.lwf]) === j([180, 23, 6]), j(squeezed.deductions));
const oldM = M({ gross: 150000, regime: "old", declaration: DECL });
check("I14", "the old regime through the month: the declaration's 4,70,000 (HRA 2,70,000 from the template's basic and HRA) gives 17,030", oldM.regime === "old" && oldM.deductions.tds === 17030 && j([oldM.tax.oldRegime.hra, oldM.tax.oldRegime.investments, oldM.tax.oldRegime.other]) === j([270000, 150000, 50000]) && oldM.tax.taxable === 1280000, j([oldM.deductions.tds, oldM.tax.oldRegime]));
const oldCut = M({ gross: 75000, monthlyGross: 150000, regime: "old", declaration: DECL });
check("I17", "the old regime's HRA is on the full structure, not a month cut by loss of pay (2,70,000 either way)", oldCut.tax.oldRegime.hra === 270000 && oldCut.tax.oldRegime.hra === oldM.tax.oldRegime.hra, j(oldCut.tax.oldRegime));
const midCess = R.addRule(PEOPLE.admin, { key: "tax.cess", effectiveFrom: "2026-10-01", value: { rate: 0.1 }, source: "https://example.org/mid-year" });
check("I18", "the tax year's rules are the ones in force on its first day: a cess row from 1 Oct 2026 doesn't change 2026-27's October; it applies from 2027-28", midCess.ok && M({ gross: 150000 }).deductions.tds === 12567 && Math.round(E.taxOn(1725000, "new", "2027-04-01").cess) === 14500);
R.resetPayRules();
check("I15", "no state, or a state with an empty row: PT and LWF 0, and still flagged", E.payMonth({ gross: 150000, template: std, state: null, year: 2026, month: 10 }).deductions.lwf === 0 && E.payMonth({ gross: 150000, template: std, state: "Punjab", year: 2026, month: 10 }).unverified === true);
check("I16", "every row used is listed (wages, PF, ESI, PT, LWF, gratuity, the regime, cess, the section)", j(m1.rules) === j(["wages.addback@all@2025-11-21", "pf@all@2026-09-17", "pf.edli@all@2014-09-01", "pf.admin@all@2014-09-01", "esi@all@2019-07-01", "esi.ceiling@all@2019-07-01", "pt@Haryana@2000-01-01", "lwf@Haryana@2026-01-01", "gratuity@all@2025-11-21", "tax.new@all@2025-04-01", "tax.cess@all@2025-04-01", "tax.section@all@2026-04-01"]), j(m1.rules));

section("J. People on file");
const oldRowBefore = j(P.payrollRunFor("EMP-1105", 2026, 9));
const arjun = E.payFor("EMP-1105", 2026, 9);
const oldRow = P.payrollRunFor("EMP-1105", 2026, 9);
check("J1", "Arjun, September 2026: the gross the existing payroll pays (88,000), on Standard with his LTA; PF 3,000, LWF 35, no TDS (10,56,000 a year is under the limit)", arjun.gross === oldRow.gross && arjun.gross === 88000 && j(arjun.components.map((c) => [c.key, c.amount])) === j([["basic", 44000], ["hra", 22000], ["medical", 1250], ["conveyance", 1600], ["lta", 3665], ["special", 15485]]) && j(arjun.deductions) === j({ pf: 3000, esi: 0, pt: 0, lwf: 35, tds: 0 }) && arjun.net === 84965, j([arjun.components.map((c) => c.amount), arjun.deductions, arjun.net]));
check("J2", "it carries who and what: the person, the type, the joining date, the salary record, the status, the period, the office's state", j([arjun.userId, arjun.employmentType, arjun.joiningDate, arjun.salaryId, arjun.status, arjun.period, arjun.state, arjun.month]) === j(["EMP-1105", "Full-time", "2023-01-12", oldRow.salaryId, oldRow.status, oldRow.period, "Haryana", "2026-09"]));
check("J3", "the existing payroll's own row is exactly what it was (the old engine: basic 40%, PF 12% of basic, PT 200)", j(P.payrollRunFor("EMP-1105", 2026, 9)) === oldRowBefore && oldRow.earnings.basic === 35200 && oldRow.deductionLines.pf === 4224 && oldRow.deductionLines.pt === 200);
const aarav = E.payFor("EMP-1001", 2026, 10);
check("J4", "Aarav, October 2026 (1,60,000): taxable 18,45,000, 1,75,760 for the year, TDS 14,647 in the seventh month of an even year", aarav.tax.taxable === 1845000 && Math.round(aarav.tax.annual.total) === 175760 && aarav.deductions.tds === 14647 && aarav.net === 160000 - 3000 - 35 - 14647, j([aarav.tax.taxable, aarav.deductions]));
const ananya = E.payFor("EMP-1017", 2026, 10);
check("J5", "Ananya, the sample intern: the stipend template; no PF, ESI or gratuity; LWF 35", ananya.templateId === "intern" && ananya.kind === "intern" && j(ananya.deductions) === j({ pf: 0, esi: 0, pt: 0, lwf: 35, tds: 0 }) && ananya.employer.total === 70 && ananya.employmentType === "Intern");
check("J6", "no row where the existing payroll has none: an inactive person, an unknown person, a bad month", E.payFor("EMP-1061", 2026, 10) === null && E.payFor("EMP-9999", 2026, 10) === null && E.payFor("EMP-1105", 2026, 13) === null && E.payFor("EMP-1105", "x", 1) === null && E.ctcFor("EMP-9999", 2026, 10) === null);
const rohan = E.payFor("EMP-1042", 2026, 10);
check("J7", "Rohan declared the old regime (E3): his October uses it, with the declaration against his own basic and HRA", rohan.regime === "old" && rohan.tax.oldRegime.investments === 150000 && rohan.tax.oldRegime.hra === Math.min(276000, 360000 - 55200, 220800) && rohan.tax.taxable === 92000 * 12 - 50000 - rohan.tax.oldRegime.total, j([rohan.tax.oldRegime, rohan.tax.taxable, rohan.deductions.tds]));
PS.setStructure(PEOPLE.fin, "EMP-1017", { templateId: "standard" });
const asEmployee = E.payFor("EMP-1017", 2026, 10);
check("J8", "an intern put on the Standard template is paid under the normal rules: PF 3,000 and a gratuity accrual", asEmployee.templateId === "standard" && asEmployee.kind === "employee" && asEmployee.deductions.pf === 3000 && asEmployee.employer.gratuity > 0 && asEmployee.employmentType === "Intern");
const ctc = E.ctcFor("EMP-1105", 2026, 10);
check("J9", "cost to company for Arjun: 88,000 + employer PF 3,000 + EDLI 125 + admin 125 + LWF 70 + gratuity 2,115 = 93,435 a month, 11,21,220 a year", j([ctc.monthly.gross, ctc.monthly.employer.total, ctc.monthly.total, ctc.yearly.total, ctc.label]) === j([88000, 5435, 93435, 1121220, "Unverified rates"]), j(ctc));
const moved = O.updateOffice(PEOPLE.admin, "OFF-1", { state: "Maharashtra" });
check("J10", "the office's state decides: with the head office in Maharashtra, October's professional tax is 200 and LWF nothing", moved.ok && E.payFor("EMP-1105", 2026, 10).deductions.pt === 200 && E.payFor("EMP-1105", 2026, 10).deductions.lwf === 0 && E.payFor("EMP-1105", 2026, 10).state === "Maharashtra");
O.updateOffice(PEOPLE.admin, "OFF-1", { state: "Haryana" });
const sal = P.setSalary(PEOPLE.admin, nisha, { gross: 250000, effectiveFrom: "2026-10-01" });
const nishaPay = E.payFor(nisha, 2026, 10);
check("J11", "a mid-year joiner on file (Nisha, an intern from 1 Oct 2026 at 2,50,000): no row for September; October starts her year, with six months' tax over six months", sal.ok && E.payFor(nisha, 2026, 9) === null && nishaPay !== null && nishaPay.kind === "intern" && nishaPay.gross === 250000 && nishaPay.tax.projected === 1500000 && nishaPay.deductions.tds === 16250, j(sal.error ?? [nishaPay?.gross, nishaPay?.tax.projected, nishaPay?.deductions]));

const lv = L.applyLeave("EMP-1105", { type: "unpaid", from: "2026-10-12", to: "2026-10-16", duration: "full", reason: "Personal work" });
const lvOk = lv.ok && L.decideLeave(lv.record.id, PEOPLE.manager, "emp", "approve").ok && L.decideLeave(lv.record.id, PEOPLE.hr, "hr", "approve").ok;
const oldOct = P.payrollRunFor("EMP-1105", 2026, 10), newOct = E.payFor("EMP-1105", 2026, 10);
check("J12", "a month with loss of pay (Arjun's 5 days of unpaid leave in October): the new figures are on what the existing payroll pays, not the full gross",
  lvOk && oldOct.gross < 88000 && newOct.gross === oldOct.gross && newOct.monthlyGross === 88000 && newOct.lop.days === oldOct.lop.days && newOct.components.reduce((s, c) => s + c.amount, 0) === oldOct.gross, j([lv.error, oldOct?.gross, newOct?.gross, newOct?.lop]));

section("K. Nothing existing changed");
check("K1", "importing the new modules wrote nothing", keysAfterImport.length === 0, j(keysAfterImport));
check("K2", "the keys in storage: the existing stores' and the new stores' own, nothing else", j([...mem.keys()].sort()) === j(["officeos:attendance", "officeos:attendance-seed", "officeos:departments", "officeos:holidays", "officeos:leave-requests", "officeos:offices", "officeos:pay-rules", "officeos:pay-structures", "officeos:regularizations", "officeos:salaries", "officeos:users"].filter((k) => k !== "officeos:pay-rules")), j([...mem.keys()].sort()));
check("K3", "data/payroll.js still has its own rules and split: basic 40% of gross", j(PAY.PAY_RULES) === j({ basicShare: 0.4, hraShareOfBasic: 0.5, conveyance: 1600, pfShareOfBasic: 0.12, professionalTax: 200 }) && j(PAY.splitGross(100000)) === j({ basic: 40000, hra: 20000, conveyance: 1600, special: 38400 }));
check("K4", "a salary record is as it was: no template or regime added to it", j(Object.keys(P.salaryFor("EMP-1105", 2026, 10)).sort()) === j(["effectiveFrom", "gross", "id", "regime", "userId"]));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);