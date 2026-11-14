// usage: node emprecord.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// E1's employee record (data/employee-record.js, config/employee-fields.js, data/store.js setPayDetails). ./js is the build.
// Clock Mon 16 Nov 2026, 10:00 local.
//   D  one list of fields: the profile's five sections are the form's first five (Review is the form's own), each field in
//      exactly one; every rule named exists
//   R  who is who: self, HR / Admin ("people"), Finance, the manager, anyone else (nothing)
//   V  what each sees: a manager only team fields (no birth date, Aadhaar, address, bank, PAN, salary), Finance team + pay,
//      HR and the person everything; nothing hidden is returned; sensitive values masked to the last 4, never in full
//   S  Show: the person, pii:view (HR, Admin) for bank / PAN / Aadhaar, salary:view (Finance too) for salary; refused
//      otherwise; every Show in the audit trail
//   E  edits: the person changes their phone, address, emergency contacts, dependants; not their birth date, role,
//      permissions, designation, salary, or anything unknown (escalation refused, nothing saved); a manager changes nothing;
//      Finance changes bank and statutory fields directly; HR changes everything on the profile; each value checked
//   H  history: who, which field, old to new (sensitive masked), when; HR / Admin only
//   Q  change requests: the person's own bank change waits for Finance or HR (never themself); approved, it applies and is
//      in the history; rejected needs a reason; one waiting at a time
//   C  completeness: a percentage and what's missing, rising as fields are filled
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
NOW = new RealDate(2026, 10, 16, 10, 0, 0).getTime();
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const F = await import("./js/config/employee-fields.js");
const E = await import("./js/data/employee-record.js");
const S = await import("./js/data/store.js");
const AU = await import("./js/data/audit-trail.js");
const RP = await import("./js/data/reporting.js");
console.log(`TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 400)}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", ARJUN = "EMP-1105";
const SNEHA = RP.managerOf(ARJUN);
const keys = (view) => view.sections.flatMap((s) => s.fields.map((f) => f.key));
const fieldOf = (view, key) => view.sections.flatMap((s) => s.fields).find((f) => f.key === key);
// Arjun's sensitive values on record, to look for in what each viewer is given
S.setPayDetails(AARAV, ARJUN, { bankAccount: "50100234567891", pan: "ABCPK1234Q" });
E.saveFields(PRIYA, ARJUN, { aadhaar: "2345 6789 0123" });
const SECRET = ["50100234567891", "ABCPK1234Q", "234567890123"];

section("D. One list of fields");
check("D1", "the profile's sections are the form's first five, in order; Review is the form's own sixth", j(F.PROFILE_SECTIONS.map((s) => s.key)) === j(["personal", "contact", "employment", "pay", "access"]) && F.SECTIONS.length === 6 && F.SECTIONS[5].key === "review");
check("D2", "every field is in one profile section, with a known see / edit, and its rule exists", F.FIELDS.every((f) => F.PROFILE_SECTIONS.some((s) => s.key === f.section) && ["team", "pay", "people"].includes(f.see) && ["own", "finance", "hr", "form", "none"].includes(f.edit) && (!f.rule || F.RULES[f.rule]) && (f.columns ?? []).every((c) => !c.rule || F.RULES[c.rule])));
check("D3", "the keys are unique", new Set(F.FIELDS.map((f) => f.key)).size === F.FIELDS.length);
check("D4", "the sensitive fields: Aadhaar, bank account, PAN (pii), salary (salary)", j(F.FIELDS.filter((f) => f.sensitive).map((f) => [f.key, f.sensitive])) === j([["aadhaar", "pii"], ["bankAccount", "pii"], ["pan", "pii"], ["salary", "salary"]]));

section("R. Who is who");
check("R1", "Arjun on himself: self; HR, Admin: people; Finance: finance; his manager: manager; Ananya: nothing",
  E.relationOf(ARJUN, ARJUN) === "self" && E.relationOf(PRIYA, ARJUN) === "people" && E.relationOf(AARAV, ARJUN) === "people" && E.relationOf(KABIR, ARJUN) === "finance"
  && SNEHA && E.relationOf(SNEHA, ARJUN) === "manager" && E.relationOf(ANANYA, ARJUN) === null && E.profileView(ANANYA, ARJUN) === null, SNEHA);
check("R2", "nobody, an unknown viewer or an unknown person: nothing", E.profileView(null, ARJUN) === null && E.profileView("EMP-9999", ARJUN) === null && E.profileView(PRIYA, "EMP-9999") === null);

section("V. What each one sees");
const vM = E.profileView(SNEHA, ARJUN), vF = E.profileView(KABIR, ARJUN), vH = E.profileView(PRIYA, ARJUN), vS = E.profileView(ARJUN, ARJUN);
const teamKeys = F.FIELDS.filter((f) => f.see === "team").map((f) => f.key);
check("V1", "the manager: exactly the team fields", j(keys(vM)) === j(teamKeys), j(keys(vM)));
check("V2", "...so no birth date, Aadhaar, addresses, emergency contacts, bank, PAN or salary, and no Pay or Role section", !["dob", "aadhaar", "address", "permanentAddress", "emergencyContacts", "bankAccount", "pan", "salary", "dependants"].some((k) => keys(vM).includes(k)) && !vM.sections.some((s) => s.key === "pay" || s.key === "access"));
check("V3", "Finance: team and pay fields, not the private ones", j(keys(vF)) === j(F.FIELDS.filter((f) => f.see !== "people").map((f) => f.key)) && keys(vF).includes("bankAccount") && !keys(vF).includes("aadhaar"));
check("V4", "HR and the person themself: every field", keys(vH).length === F.FIELDS.length && keys(vS).length === F.FIELDS.length);
const views = j([vM, vF, vH, vS]);
check("V5", "no view holds a sensitive value in full", SECRET.every((s) => !views.includes(s)), SECRET.filter((s) => views.includes(s)));
check("V6", "masked to the last 4: bank '•••• •••• 7891', PAN '••••••234Q', Aadhaar '•••• •••• 0123'", fieldOf(vH, "bankAccount").value === "•••• •••• 7891" && fieldOf(vH, "pan").value === "••••••234Q" && fieldOf(vH, "aadhaar").value === "•••• •••• 0123" && fieldOf(vH, "bankAccount").masked);
check("V7", "a field with nothing on file isn't masked: empty", fieldOf(vH, "ifsc").value === "" && !fieldOf(vH, "ifsc").masked);

section("S. Show");
check("S1", "the person and HR may Show bank and PAN; Finance may not (no pii:view) but may Show salary", fieldOf(vS, "bankAccount").canReveal && fieldOf(vH, "pan").canReveal && !fieldOf(vF, "bankAccount").canReveal && fieldOf(vF, "salary").canReveal);
const r1 = E.revealField(PRIYA, ARJUN, "bankAccount");
check("S2", "HR's Show gives the full value and is in the audit trail", r1.ok && r1.value === "50100234567891" && AU.eventsFor(ARJUN).some((e) => e.kind === "field-revealed" && e.actorId === PRIYA && !e.detail.includes("50100")));
check("S3", "Finance's Show of a bank account, the manager's of anything, Ananya's: refused", !E.revealField(KABIR, ARJUN, "bankAccount").ok && !E.revealField(SNEHA, ARJUN, "phone").ok && !E.revealField(ANANYA, ARJUN, "pan").ok);
check("S4", "a field that isn't sensitive or doesn't exist can't be 'revealed'", !E.revealField(PRIYA, ARJUN, "phone").ok && !E.revealField(PRIYA, ARJUN, "password").ok);
check("S5", "the person Shows their own PAN", E.revealField(ARJUN, ARJUN, "pan").value === "ABCPK1234Q");

section("E. Edits");
const before = j(S.getUser(ARJUN));
const esc = [
  E.saveFields(ARJUN, ARJUN, { role: "admin" }), E.saveFields(ARJUN, ARJUN, { grantPermissions: ["users:edit"] }), E.saveFields(ARJUN, ARJUN, { designation: "Administrator" }),
  E.saveFields(ARJUN, ARJUN, { dob: "1990-01-01" }), E.saveFields(ARJUN, ARJUN, { salary: 999999 }), E.saveFields(ARJUN, ARJUN, { aadhaar: "234567890123" }),
  E.saveFields(ARJUN, ARJUN, { phone: "+91 90000 11111", role: "admin" }), E.saveFields(ARJUN, ARJUN, { status: "active" }),
];
check("E1", "Arjun can't change his role, permissions, designation, birth date, salary, Aadhaar or status; a mixed save is refused whole", esc.every((r) => !r.ok) && j(S.getUser(ARJUN)) === before, j(esc.map((r) => r.error)));
const own = E.saveFields(ARJUN, ARJUN, { phone: "+91 90000 11111", address: "12 MG Road, Gurugram", emergencyContacts: [{ name: "Ravi Kapoor", relation: "Father", phone: "+91 98111 22334" }, { name: "Neha Kapoor", relation: "Sister", phone: "+91 98111 55667" }] });
check("E2", "his phone, address and emergency contacts: saved (the first contact also on the user record)", own.ok && S.getUser(ARJUN).phone === "+91 90000 11111" && S.getUser(ARJUN).emergencyContactName === "Ravi Kapoor" && fieldOf(E.profileView(ARJUN, ARJUN), "emergencyContacts").value.length === 2, j(own));
const req = E.saveFields(ARJUN, ARJUN, { bankAccount: "60200345678912" });
check("E3", "his own bank account: not saved directly, he's told to ask for the change", !req.ok && /Ask for a change/.test(req.error) && S.getUser(ARJUN).bankAccount === "50100234567891");
check("E4", "nobody else's record: Ananya on Arjun's phone, the manager on his phone, Arjun on Ananya's", !E.saveFields(ANANYA, ARJUN, { phone: "+91 90000 22222" }).ok && !E.saveFields(SNEHA, ARJUN, { phone: "+91 90000 22222" }).ok && !E.saveFields(ARJUN, ANANYA, { phone: "+91 90000 22222" }).ok);
const fin = E.saveFields(KABIR, ARJUN, { ifsc: "hdfc0001234", bankName: "HDFC Bank", uan: "100200300400", pan: "abcpk1234q" });
check("E5", "Finance changes the bank's IFSC (upper-cased), name, UAN, PAN directly", fin.ok && fieldOf(E.profileView(PRIYA, ARJUN), "ifsc").value === "HDFC0001234" && fieldOf(E.profileView(PRIYA, ARJUN), "uan").value === "100200300400", j(fin));
check("E6", "Finance can't change a phone, an Aadhaar or education (not theirs)", !E.saveFields(KABIR, ARJUN, { phone: "+91 90000 33333" }).ok && !E.saveFields(KABIR, ARJUN, { aadhaar: "345678901234" }).ok && !E.saveFields(KABIR, ARJUN, { education: [] }).ok);
const bad = [E.saveFields(KABIR, ARJUN, { pan: "ABC1234" }), E.saveFields(KABIR, ARJUN, { ifsc: "HDFC1234567" }), E.saveFields(PRIYA, ARJUN, { aadhaar: "123456789012" }), E.saveFields(ARJUN, ARJUN, { phone: "12345" }),
  E.saveFields(KABIR, ARJUN, { esi: "123" }), E.saveFields(KABIR, ARJUN, { bankAccount: "12AB" }), E.saveFields(ARJUN, ARJUN, { personalEmail: "not-an-email" })];
check("E7", "each value checked: PAN, IFSC, Aadhaar, phone, ESI, account, email", bad.every((r) => !r.ok && r.error), j(bad.map((r) => r.field)));
const rows = [E.saveFields(ARJUN, ARJUN, { emergencyContacts: [{ name: "", relation: "Father", phone: "+91 98111 22334" }] }), E.saveFields(ARJUN, ARJUN, { dependants: [{ name: "A", relation: "Son", nominee: "yes" }, { name: "B", relation: "Daughter", nominee: "yes" }] }),
  E.saveFields(PRIYA, ARJUN, { education: [{ qualification: "B.Tech", institution: "IIT", year: "18" }] }), E.saveFields(ARJUN, ARJUN, { emergencyContacts: Array.from({ length: 21 }, () => ({ name: "X", relation: "Y", phone: "+91 98111 22334" })) })];
check("E8", "rows checked: a missing name, two nominees, a bad year, more than 20 rows", rows.every((r) => !r.ok), j(rows.map((r) => r.error)));
const hr = E.saveFields(PRIYA, ARJUN, { education: [{ qualification: "B.Tech", institution: "Delhi Technological University", year: "2018" }], skills: [{ skill: "React" }, { skill: "SQL" }], documents: [{ type: "Passport", number: "M1234567", expiry: "2031-05-01" }] });
check("E9", "HR changes education, skills and documents (details only)", hr.ok && fieldOf(E.profileView(PRIYA, ARJUN), "skills").value.length === 2);
const doc = fieldOf(E.profileView(PRIYA, ARJUN), "documents");
check("E10", "a document's number is masked in the view; the manager doesn't get documents at all", doc.value[0].number === "•••• 4567" && doc.masked && !keys(E.profileView(SNEHA, ARJUN)).includes("documents") && !j(E.profileView(PRIYA, ARJUN)).includes("M1234567"));
check("E11", "an unchanged save changes nothing (and writes no history)", E.saveFields(ARJUN, ARJUN, { phone: "+91 90000 11111" }).changed.length === 0);
check("E12", "the manager sees the skills (team) and the new phone", fieldOf(E.profileView(SNEHA, ARJUN), "skills").value.length === 2 && fieldOf(E.profileView(SNEHA, ARJUN), "phone").value === "+91 90000 11111");

section("H. History");
const hist = E.historyFor(PRIYA, ARJUN);
const panRow = hist.find((h) => h.field === "pan");
check("H1", "HR reads the history: who, which field, old to new, when", hist.length >= 8 && hist.some((h) => h.field === "phone" && h.actorId === ARJUN && h.to === "+91 90000 11111") && hist.every((h) => h.at && h.label));
check("H2", "sensitive values masked in it (Aadhaar, PAN, documents)", hist.find((h) => h.field === "aadhaar").to === "•••• •••• 0123" && (!panRow || /^•/.test(panRow.to)) && !SECRET.some((s) => j(hist).includes(s)) && !j(hist).includes("M1234567"));
check("H3", "Finance, the manager and Arjun himself get no history", E.historyFor(KABIR, ARJUN) === null && E.historyFor(SNEHA, ARJUN) === null && E.historyFor(ARJUN, ARJUN) === null);
check("H4", "every change is in the audit trail too, without values", AU.eventsFor(ARJUN).filter((e) => e.kind === "field-changed").length >= 4 && !SECRET.some((s) => j(AU.allEvents()).includes(s)));

section("Q. Change requests");
const q1 = E.requestChange(ARJUN, { bankAccount: "60200345678912", ifsc: "ICIC0004321", uan: "100200300400" });   // the UAN as it is on file
check("Q1", "Arjun asks to change his bank account and IFSC: waiting", q1.ok && q1.record.status === "pending" && E.profileChangesFor(ARJUN).length === 1);
check("Q2a", "only what changes is asked for: the IFSC sent as it is isn't in the request", j(Object.keys(q1.record.changes)) === j(["bankAccount", "ifsc"]) && !E.requestChange(ANANYA, { ifsc: "" }).ok);
check("Q2", "one waiting at a time; only bank and tax fields can be asked for", !E.requestChange(ARJUN, { pan: "ABCPK9999Q" }).ok && !E.requestChange(ANANYA, { phone: "+91 90000 44444" }).ok && !E.requestChange(ANANYA, { role: "admin" }).ok);
check("Q3", "it waits for Finance and HR, not for Arjun or his manager", E.pendingProfileChanges(KABIR).length === 1 && E.pendingProfileChanges(PRIYA).length === 1 && E.pendingProfileChanges(ARJUN).length === 0 && E.pendingProfileChanges(SNEHA).length === 0);
check("Q4", "Arjun can't approve his own", E.decideChange(ARJUN, q1.record.id, "approved").error === "Nobody decides their own request.");
check("Q5", "the request reads masked", j(E.changeText(q1.record)) === j([["Bank account", "•••• •••• 8912"], ["IFSC", "ICIC0004321"]]));
const ok = E.decideChange(KABIR, q1.record.id, "approved");
check("Q6", "Finance approves: the bank account and IFSC change, in the history as a request", ok.ok && S.getUser(ARJUN).bankAccount === "60200345678912" && S.getUser(ARJUN).bankAccountLast4 === "8912" && fieldOf(E.profileView(PRIYA, ARJUN), "ifsc").value === "ICIC0004321" && E.historyFor(PRIYA, ARJUN).some((h) => h.how === "request" && h.field === "bankAccount" && h.actorId === KABIR));
check("Q7", "decided once: deciding again is refused", E.decideChange(PRIYA, q1.record.id, "rejected", "no").error === "This request was already decided.");
const q2 = E.requestChange(ARJUN, { pan: "ABCPK9999Q" });
check("Q8", "a rejection needs a reason; with one, nothing changes", !E.decideChange(PRIYA, q2.record.id, "rejected", " ").ok && E.decideChange(PRIYA, q2.record.id, "rejected", "Upload the PAN card first").ok && S.getUser(ARJUN).pan === "ABCPK1234Q");
check("Q9", "the decisions are in the audit trail", AU.eventsFor(ARJUN).some((e) => e.kind === "change-approved") && AU.eventsFor(ARJUN).some((e) => e.kind === "change-rejected"));

section("C. Completeness");
const c0 = E.completeness(ANANYA);
check("C1", "a percentage and the missing fields' names", Number.isInteger(c0.percent) && c0.percent < 100 && c0.missing.includes("Aadhaar") && c0.missing.includes("IFSC"), j(c0));
E.saveFields(PRIYA, ANANYA, { aadhaar: "345678901234" });
const c1 = E.completeness(ANANYA);
check("C2", "filling a field raises it and takes it off the list", c1.percent > c0.percent && !c1.missing.includes("Aadhaar"));
check("C3", "an unknown person: null", E.completeness("EMP-9999") === null);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);