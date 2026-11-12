// usage: node salpage.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12Y (R9c-2): salary-structure.html goes through the approval chain 12X built (payroll-store.js proposeSalary(),
// decideSalaryProposal(), withdrawSalaryProposal()). A person's Edit sends the form to proposeSalary(): an Admin's
// change takes effect at once, anyone else's waits. A waiting change shows in the person's row, with Approve / Reject
// for whoever may decide it and Withdraw for whoever proposed it; Edit is disabled with the store's reason while one
// waits, and when nobody else could approve yours. setSalary() needs payroll:approve (round-12x-notes.md X7.11).
// ./js-pre12Y, ./html-pre12Y and ./css-pre12Y are the code, pages and css before this round (office-os 3766ac0).
//   G  before: Finance's Edit final at once; a waiting change invisible and bypassed
//   F  the form, Finance and Admin;  K  Finance proposes;  A  an Admin's change, at once
//   V  who sees what of a waiting change;  D  Approve / Reject from the page;  W  Withdraw
//   N  nobody else could approve: Edit disabled;  H  names in toasts escaped
//   S  setSalary() an Admin's only;  E  no page errors;  X  scope
// Storage seeded Fri 30 Oct 2026 19:00; October settled and approved on 9 Nov where a case says; the page opened 20 Nov.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
setNow(2026, 11, 20);
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", KABIR = "EMP-1008", SNEHA = "EMP-1029", ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const SESSION = { fin: ["fin", "Kabir Shah", KABIR], admin: ["admin", "Aarav Mehta", AARAV], sneha: ["admin", "Sneha Rao", SNEHA], emp: ["emp", "Rohan Gupta", ROHAN] };
const setSession = ([roleKey, userLabel, employeeId]) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null;
const allJsErrors = [];
let asked = [];   // what confirm() was asked
let answer = true;
async function open(page, query = "", js = "./js") {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${DIR}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  asked = []; answer = true;
  w.confirm = (msg) => { asked.push(msg); return answer; };
  w.HTMLElement.prototype.scrollIntoView = () => {};
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`${js}/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); }
  }
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const safe = (fn) => { try { return fn(); } catch (e) { return { ok: false, error: `threw: ${e.message}` }; } };
const errOf = (r) => (r?.ok ? "ok" : r?.error ?? "no result");

const S = await import("./js/data/store.js");
const PS = await import("./js/data/payroll-store.js");
const OLDPS = await import("./js-pre12Y/data/payroll-store.js");   // before this round, on the same storage
const has = (name) => typeof PS[name] === "function";

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
const setup = (r, what) => { if (!r?.ok) console.log(`setup (${what}):`, errOf(r)); return r; };
// As saledit / salchain: every pending leave request cancelled and correction rejected, Vikram given a joining date;
// October prepared and approved for real on 9 Nov when `approve`; `sneha` makes Sneha a second Admin.
function seeded({ approve = false, sneha = false } = {}) {
  mem.clear(); setNow(2026, 10, 30, 19); S.getAllUsers(); PS.allSalaries(); PS.payrollRun(2026, 10);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
  if (sneha) setup(safe(() => S.updateUser(AARAV, SNEHA, { role: "admin" })), "Sneha an Admin");
  if (approve) {
    setNow(2026, 11, 9);
    setup(safe(() => PS.prepareRun(KABIR, 2026, 10)), "prepare 2026-10"); setup(safe(() => PS.approveRun(AARAV, 2026, 10)), "approve 2026-10");
  }
  setNow(2026, 11, 20);
}
// November approved behind a waiting change's back, written into storage (salchain D6's fixture), to reach the re-check
// at approval.
function novemberApprovedInStorage() {
  const box = JSON.parse(mem.get("officeos:payroll-runs"));
  const rows = PS.payrollRun(2026, 11).rows;
  box.records.push({ id: `PR-${box.nextNum}`, month: "2026-11", status: "approved", preparedBy: KABIR, preparedAt: "2026-12-09T11:00", approvedBy: AARAV, approvedAt: "2026-12-09T12:00", rows, totals: PS.runTotals({ rows }), history: [] });
  box.nextNum += 1;
  mem.set("officeos:payroll-runs", JSON.stringify(box));
}
const propose = (actor, who, gross, effectiveFrom) => (has("proposeSalary") ? safe(() => PS.proposeSalary(actor, who, { gross, effectiveFrom })) : { ok: false, error: "no proposeSalary" });
const salaries = () => mem.get("officeos:salaries");
const proposalsRaw = () => mem.get("officeos:salary-proposals") ?? null;
const proposal = (id) => (has("salaryProposals") ? PS.salaryProposals().find((p) => p.id === id) ?? null : null);
async function page({ who = SESSION.fin, js = "./js" } = {}) { setSession(who); await open("payroll/salary-structure", "", js); }
const rowOf = (name) => [...d.querySelectorAll("#salary-rows tr")].find((r) => r.textContent.includes(name));
const buttonsOf = (name) => [...(rowOf(name)?.querySelectorAll("button") ?? [])];
const buttonOf = (name, label) => buttonsOf(name).find((b) => txt(b) === label);
const labelsOf = (name) => buttonsOf(name).map(txt);
const editOf = (name) => buttonOf(name, "Edit");
const cells = (name) => [...(rowOf(name)?.querySelectorAll("td") ?? [])].map(txt);
const statusBadge = (name) => txt(rowOf(name)?.querySelector("td:nth-child(6) .badge"));
const waiting = (name) => rowOf(name)?.querySelector('td:nth-child(6) [title^="Proposed by"]') ?? null;
const waitingText = (name) => [...(waiting(name)?.children ?? [])].map(txt).join(" | ");
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => txt(t.querySelector(".toast__text")));
const toastHtml = () => [...d.querySelectorAll(".toast .toast__text")].map((t) => t.innerHTML.trim());
const modal = () => d.getElementById("salary-modal");
const isOpen = () => Boolean(modal()?.classList.contains("is-open"));
const rejectModal = () => d.getElementById("reject-salary-modal");
function fill(gross, month) {
  if (!modal()) return;
  if (gross !== null) d.getElementById("salary-gross").value = gross;
  if (month !== null) d.getElementById("salary-month").value = month;
  modal().querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
}
function reject(note) {
  const m = rejectModal();
  if (!m) return;
  m.querySelector("textarea").value = note;
  m.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
}
const errorUnder = (id) => txt(d.getElementById(id)?.closest(".form-field")?.querySelector(".form-error")) || null;
const FIRST = "A salary takes effect on the 1st of a month.";
const GROSS = "Enter the monthly gross in whole rupees, more than ₹0.";
const OCT = "October 2026's payroll is already approved, so a salary can take effect only after it.";
const NOV = "November 2026's payroll is already approved, so a salary can take effect only after it.";
const OWN = "You can't change your own salary.";
const ONLY_ADMIN = "Only an Admin can change a salary at once: propose the change instead.";
const DESC = "The new monthly gross is used from the 1st of the month you choose.";
const DESC_WAIT = "The new monthly gross is used from the 1st of the month you choose, once an Admin approves it.";
const footer = () => [...(modal()?.querySelectorAll(".modal__footer button") ?? [])].map(txt);

// =================================================================
section("G. Before");
seeded(); await page({ js: "./js-pre12Y" });
editOf("Rohan Gupta")?.click(); fill("100000", "2026-11");
const g1 = [toasts().at(-1), PS.salaryFor(ROHAN, 2026, 11)?.gross, proposalsRaw()];
seeded(); propose(KABIR, VIKRAM, 70000, "2026-12-01");
await page({ js: "./js-pre12Y" });
const g2 = [cells("Vikram Singh")[5], labelsOf("Vikram Singh")];
await page({ who: SESSION.admin, js: "./js-pre12Y" });
const g3 = [cells("Vikram Singh")[5], labelsOf("Vikram Singh")];
await page({ js: "./js-pre12Y" });
editOf("Vikram Singh")?.click(); fill("75000", "2026-12");
check("G1", "the code before: Kabir's (Finance) Edit final at once (Rohan's November ₹1,00,000, no proposal); a waiting change (SP-1, Vikram) shown nowhere, no Approve for Aarav, and Kabir's Edit writes past it (Vikram's December ₹75,000, SP-1 still pending)",
  g1[0] === "Rohan Gupta's salary is ₹1,00,000 a month from 1 Nov 2026." && g1[1] === 100000 && g1[2] === null
  && g2[0] === "Active" && j(g2[1]) === j(["Breakdown", "Edit"]) && g3[0] === "Active" && j(g3[1]) === j(["Breakdown", "Edit"])
  && PS.salaryFor(VIKRAM, 2026, 12)?.gross === 75000 && proposal("SP-1")?.status === "pending", j([g1, g2, g3]));
seeded();
const g4 = safe(() => OLDPS.setSalary(KABIR, ROHAN, { gross: 110000, effectiveFrom: "2026-12-01" }));
check("G2", "the code before: setSalary() called directly by Kabir (Finance) writes a record at once", g4.ok === true, errOf(g4));

// =================================================================
section("F. The form");
seeded(); await page();
editOf("Rohan Gupta")?.click();
const f1 = [txt(modal()?.querySelector(".modal__title")), txt(modal()?.querySelector(".modal__desc")), footer(), d.getElementById("salary-gross")?.value, d.getElementById("salary-month")?.value];
seeded(); await page({ who: SESSION.admin });
editOf("Rohan Gupta")?.click();
const f2 = [txt(modal()?.querySelector(".modal__title")), txt(modal()?.querySelector(".modal__desc")), footer()];
check("F1", "Kabir (Finance): \"Change Rohan Gupta's salary\", the line says it's used \"once an Admin approves it\", the button \"Send for approval\" (gross ₹92,000, this month); Aarav (Admin): 12W's line and \"Save salary\"",
  f1[0] === "Change Rohan Gupta's salary" && f1[1] === DESC_WAIT && j(f1[2]) === j(["Cancel", "Send for approval"]) && f1[3] === "92000" && f1[4] === "2026-11"
  && f2[0] === "Change Rohan Gupta's salary" && f2[1] === DESC && j(f2[2]) === j(["Cancel", "Save salary"]), j([f1, f2]));

// =================================================================
section("K. Finance proposes");
seeded(); await page();
const k0 = salaries();
editOf("Rohan Gupta")?.click(); fill("100000", "2026-11");
const sp = proposal("SP-1");
check("K1", "Kabir sends Rohan ₹1,00,000 from November: the dialog closes; \"Rohan Gupta's new salary, ₹1,00,000 a month from 1 Nov 2026, is waiting for an Admin's approval.\"; stored as SP-1, pending, entered by Kabir; no salary record (salaries byte for byte), his November still ₹92,000",
  !modal() && toasts().at(-1) === "Rohan Gupta's new salary, ₹1,00,000 a month from 1 Nov 2026, is waiting for an Admin's approval."
  && sp?.status === "pending" && sp.userId === ROHAN && sp.gross === 100000 && sp.effectiveFrom === "2026-11-01" && sp.enteredBy === KABIR && sp.enteredAt === "2026-11-20T11:00"
  && salaries() === k0 && PS.salaryFor(ROHAN, 2026, 11)?.gross === 92000, j([toasts().at(-1), sp?.status]));
const again = propose(KABIR, ROHAN, 105000, "2026-12-01");
check("K2", "his row: gross ₹92,000 and \"Active\" as before, under it a \"Waiting\" badge and \"₹1,00,000 from 1 Nov 2026\" (\"Proposed by Kabir Shah on 20 Nov 2026 (SP-1)\" on hover); no Edit while it waits (proposeSalary() refuses a second: \"... already has a salary change waiting ...\"), Withdraw in its place; no Approve / Reject for Kabir",
  cells("Rohan Gupta")[2] === "₹92,000" && statusBadge("Rohan Gupta") === "Active" && waitingText("Rohan Gupta") === "Waiting | ₹1,00,000 from 1 Nov 2026"
  && waiting("Rohan Gupta")?.querySelector(".badge")?.className === "badge badge--info badge--dot" && waiting("Rohan Gupta")?.title === "Proposed by Kabir Shah on 20 Nov 2026 (SP-1)"
  && again.error === "Rohan Gupta already has a salary change waiting for a decision (SP-1)."
  && j(labelsOf("Rohan Gupta")) === j(["Breakdown", "Withdraw"]), j([cells("Rohan Gupta")[5], labelsOf("Rohan Gupta")]));
check("K3", "the other rows: no waiting note, and Edit as before (only Rohan's row changed)", [...d.querySelectorAll('#salary-rows td:nth-child(6) [title^="Proposed by"]')].length === 1
  && [...d.querySelectorAll("#salary-rows tr")].filter((r) => !r.textContent.includes("Rohan Gupta")).every((r) => j([...r.querySelectorAll("button")].map(txt)) === j(["Breakdown", "Edit"])));
seeded({ approve: true }); await page();
const k4s = salaries(), k4p = proposalsRaw();
const K4 = [];
for (const [label, gross, month, field, msg] of [
  ["gross 92000.5", "92000.5", "2026-12", "salary-gross", GROSS],
  ["gross 0", "0", "2026-12", "salary-gross", GROSS],
  ["gross empty", "", "2026-12", "salary-gross", GROSS],
  ["no month", "100000", "", "salary-month", FIRST],
  ["October (approved)", "100000", "2026-10", "salary-month", OCT],
]) {
  editOf("Rohan Gupta")?.click(); fill(gross, month);
  const shown = errorUnder(field);
  const direct = propose(KABIR, ROHAN, gross === "" ? undefined : Number(gross), month ? `${month}-01` : "");
  K4.push([label, shown === msg && shown === direct.error && isOpen(), shown]);
  modal()?.querySelector(".modal__close")?.click();
}
check("K4", "5 refusals (Kabir): each under the field proposeSalary() names, word for word what it returns for the same input; the dialog stays open; nothing stored (salaries and proposals)",
  K4.every(([, ok]) => ok) && salaries() === k4s && proposalsRaw() === k4p, j(K4.filter(([, ok]) => !ok)));
seeded(); await page();
editOf("Rohan Gupta")?.click();
setup(propose(KABIR, ROHAN, 97000, "2027-01-01"), "a waiting one behind the form");
fill("100000", "2026-12");
check("K5", "a refusal with no field (a change for Rohan started waiting while the form was open): the dialog closes, proposeSalary()'s words as a toast; nothing more stored",
  !modal() && toasts().at(-1) === "Rohan Gupta already has a salary change waiting for a decision (SP-1)." && PS.salaryProposals().length === 1, j(toasts().at(-1)));

// =================================================================
section("A. An Admin's change");
seeded(); await page({ who: SESSION.admin });
editOf("Rohan Gupta")?.click(); fill("100000", "2026-11");
const a1 = proposal("SP-1");
check("A1", "Aarav (Admin) sets Rohan ₹1,00,000 from November: \"Rohan Gupta's salary is ₹1,00,000 a month from 1 Nov 2026.\" (12W's toast); in effect at once (his row ₹1,00,000, last revised 1 Nov 2026, Active, no waiting line); kept as SP-1, approved by Aarav, its salary record the newest",
  !modal() && toasts().at(-1) === "Rohan Gupta's salary is ₹1,00,000 a month from 1 Nov 2026." && cells("Rohan Gupta")[2] === "₹1,00,000" && cells("Rohan Gupta")[4] === "1 Nov 2026"
  && cells("Rohan Gupta")[5] === "Active" && !waiting("Rohan Gupta") && a1?.status === "approved" && a1.decidedBy === AARAV && a1.salaryId === PS.salaryHistory(ROHAN)[0]?.id
  && editOf("Rohan Gupta")?.disabled === false, j([toasts().at(-1), cells("Rohan Gupta").slice(2, 6), a1?.status]));
seeded(); await page({ who: SESSION.admin });
editOf("Rohan Gupta")?.click(); fill("110000", "2027-01");
check("A2", "a later month (Jan 2027), Aarav: saved; the row keeps ₹92,000 with 12W's \"Revision due 1 Jan 2027\", no waiting line", cells("Rohan Gupta")[2] === "₹92,000" && statusBadge("Rohan Gupta") === "Revision due 1 Jan 2027" && !waiting("Rohan Gupta") && PS.salaryHistory(ROHAN)[0]?.gross === 110000, j(cells("Rohan Gupta")[5]));

// =================================================================
section("V. Who sees a waiting change");
seeded(); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1");
await page({ who: SESSION.admin });
check("V1", "Aarav (Admin): the waiting note; Reject and Approve in place of Edit; no Withdraw (he didn't propose it)",
  waitingText("Rohan Gupta") === "Waiting | ₹1,00,000 from 1 Nov 2026" && j(labelsOf("Rohan Gupta")) === j(["Breakdown", "Reject", "Approve"]), j(labelsOf("Rohan Gupta")));
await page();
check("V2", "Kabir (who proposed it): the note and Withdraw; no Reject / Approve", Boolean(waiting("Rohan Gupta")) && j(labelsOf("Rohan Gupta")) === j(["Breakdown", "Withdraw"]), j(labelsOf("Rohan Gupta")));
seeded({ sneha: true }); setup(propose(KABIR, AARAV, 210000, "2026-12-01"), "Kabir proposes Aarav");
await page({ who: SESSION.admin });
const v3a = labelsOf("Aarav Mehta");
await page({ who: SESSION.sneha });
const v3b = labelsOf("Aarav Mehta");
check("V3", "Sneha a second Admin, Kabir proposes Aarav's: Aarav (the person paid) sees the note on his own row but no Reject / Approve; Sneha gets Reject / Approve",
  j(v3a) === j(["Breakdown"]) && Boolean(waiting("Aarav Mehta")) && j(v3b) === j(["Breakdown", "Reject", "Approve"]), j([v3a, v3b]));
seeded(); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1");
await page({ who: SESSION.emp });
check("V4", "Rohan (employee, no salary:view) on the page: no rows drawn, the figure and the line nowhere", d.querySelectorAll("#salary-rows tr[data-user-id]").length === 0 && !d.body.textContent.includes("Waiting") && !d.body.textContent.includes("1,00,000"));

// =================================================================
section("D. Deciding from the page");
seeded(); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1");
await page({ who: SESSION.admin });
buttonOf("Rohan Gupta", "Breakdown")?.click();
buttonOf("Rohan Gupta", "Approve")?.click();
const d1 = proposal("SP-1");
check("D1", "Aarav's Approve: confirm() asks \"Approve this request?\" naming it; \"Salary change approved.\"; SP-1 approved by Aarav through setSalary() (his November ₹1,00,000); the row ₹1,00,000, last revised 1 Nov 2026, no line, Edit enabled; the example card (Rohan) redrawn ₹1,00,000",
  j(asked) === j(["Approve this request?\nRohan Gupta: ₹1,00,000 a month from 1 Nov 2026, proposed by Kabir Shah"]) && toasts().at(-1) === "Salary change approved."
  && d1?.status === "approved" && d1.decidedBy === AARAV && PS.salaryFor(ROHAN, 2026, 11)?.gross === 100000
  && cells("Rohan Gupta")[2] === "₹1,00,000" && cells("Rohan Gupta")[4] === "1 Nov 2026" && !waiting("Rohan Gupta") && editOf("Rohan Gupta")?.disabled === false
  && j(labelsOf("Rohan Gupta")) === j(["Breakdown", "Edit"]) && d.querySelector('[data-field="gross"]')?.textContent === "₹1,00,000", j([asked, toasts().at(-1), d1?.status, cells("Rohan Gupta").slice(2, 6)]));
seeded(); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1");
await page({ who: SESSION.admin });
answer = false; const d2p = proposalsRaw(), d2s = salaries();
buttonOf("Rohan Gupta", "Approve")?.click();
check("D2", "Approve, confirm() cancelled: nothing stored, no toast, still waiting", proposalsRaw() === d2p && salaries() === d2s && toasts().length === 0 && Boolean(waiting("Rohan Gupta")));
answer = true;
buttonOf("Rohan Gupta", "Reject")?.click();
const rm = rejectModal();
const d3open = [txt(rm?.querySelector(".modal__title")), txt(rm?.querySelector(".modal__desc")), rm?.querySelector("textarea")?.placeholder, txt(rm?.querySelector('button[type="submit"]')), rm?.classList.contains("is-open")];
reject("  ");
const d3err = [txt(rm?.querySelector(".form-error")), rm?.classList.contains("is-open"), proposal("SP-1")?.status];
check("D3", "Reject: \"Reject salary change\" naming it, the note's placeholder \"Kept with the salary change; the employee doesn't see it\", \"Reject change\"; an empty note: decideSalaryProposal()'s \"Add a note saying why the salary change is rejected.\" under the note, still open, still pending",
  d3open[0] === "Reject salary change" && d3open[1] === "Rohan Gupta: ₹1,00,000 a month from 1 Nov 2026, proposed by Kabir Shah" && d3open[2] === "Kept with the salary change; the employee doesn't see it"
  && d3open[3] === "Reject change" && d3open[4] === true && d3err[0] === "Add a note saying why the salary change is rejected." && d3err[1] === true && d3err[2] === "pending", j([d3open, d3err]));
reject("Budget is frozen until April.");
const d4 = proposal("SP-1");
check("D4", "with a note: closed; \"Salary change rejected.\"; SP-1 rejected by Aarav, the note kept; no salary record; the row back to plain, Edit enabled",
  !rm?.classList.contains("is-open") && toasts().at(-1) === "Salary change rejected." && d4?.status === "rejected" && d4.decidedBy === AARAV && d4.history.at(-1)?.note === "Budget is frozen until April."
  && salaries() === d2s && !waiting("Rohan Gupta") && editOf("Rohan Gupta")?.disabled === false, j([toasts().at(-1), d4?.status]));
seeded({ approve: true }); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1");
novemberApprovedInStorage();
await page({ who: SESSION.admin });
buttonOf("Rohan Gupta", "Approve")?.click();
check("D5", "Approve refused at decision (November approved since, written into storage): setSalary()'s words as a toast, word for word; SP-1 still waiting, the line still shown",
  toasts().at(-1) === NOV && proposal("SP-1")?.status === "pending" && Boolean(waiting("Rohan Gupta")), j(toasts().at(-1)));
seeded(); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1");
await page({ who: SESSION.admin });
setup(safe(() => PS.withdrawSalaryProposal(KABIR, "SP-1")), "withdrawn behind the page");
buttonOf("Rohan Gupta", "Approve")?.click();
check("D6", "decided elsewhere while the page was open (withdrawn): Approve shows the store's \"This salary change is already withdrawn.\"; the row is read again (no line)",
  toasts().at(-1) === "This salary change is already withdrawn." && !waiting("Rohan Gupta") && j(labelsOf("Rohan Gupta")) === j(["Breakdown", "Edit"]), j([toasts().at(-1), labelsOf("Rohan Gupta")]));

// =================================================================
section("W. Withdraw");
seeded(); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1");
await page();
answer = false; const w0 = proposalsRaw();
buttonOf("Rohan Gupta", "Withdraw")?.click();
const w1 = [proposalsRaw() === w0, toasts().length, j(asked)];
answer = true;
buttonOf("Rohan Gupta", "Withdraw")?.click();
check("W1", "Kabir's Withdraw: confirm() asks \"Withdraw this salary change?\" naming it (cancelled: nothing); confirmed: \"Salary change withdrawn.\", SP-1 withdrawn, the row plain, Edit enabled",
  w1[0] && w1[1] === 0 && w1[2] === j(["Withdraw this salary change?\nRohan Gupta: ₹1,00,000 a month from 1 Nov 2026, proposed by Kabir Shah"])
  && toasts().at(-1) === "Salary change withdrawn." && proposal("SP-1")?.status === "withdrawn" && !waiting("Rohan Gupta") && editOf("Rohan Gupta")?.disabled === false, j([w1, toasts().at(-1)]));
editOf("Rohan Gupta")?.click(); fill("98000", "2026-12");
check("W2", "then a new change goes through from the page (SP-2 waiting)", proposal("SP-2")?.status === "pending" && waitingText("Rohan Gupta") === "Waiting | ₹98,000 from 1 Dec 2026", j(waitingText("Rohan Gupta")));

// =================================================================
section("N. Nobody else could approve");
seeded(); await page();
const nDirect = propose(KABIR, AARAV, 210000, "2026-12-01");
check("N1", "Kabir (Finance), Aarav the only Admin: Aarav's Edit disabled with proposeSalary()'s own refusal on hover; the others enabled",
  editOf("Aarav Mehta")?.disabled === true && editOf("Aarav Mehta").title === nDirect.error && nDirect.error === "No one else could approve a change to Aarav Mehta's salary: make someone else an Admin first."
  && editOf("Rohan Gupta")?.disabled === false, j([editOf("Aarav Mehta")?.title, nDirect.error]));
seeded({ sneha: true }); await page();
check("N2", "with Sneha a second Admin: Aarav's Edit enabled for Kabir", editOf("Aarav Mehta")?.disabled === false && !editOf("Aarav Mehta").title);

// =================================================================
section("H. Names in toasts (toast.js uses innerHTML)");
seeded();
const hire = S.addUser(AARAV, { name: "Tara <b>Rao</b>", email: "tara.rao@northwind.com", department: "ENG", designation: "Software Engineer", dateOfJoining: "3 Nov 2026" });
await page({ who: SESSION.admin });
editOf("Tara <b>Rao</b>")?.click(); fill("80000", "2026-11");
const h1 = [toasts().at(-1), d.querySelectorAll(".toast b").length];
await page();
editOf("Tara <b>Rao</b>")?.click(); setup(propose(KABIR, hire.record?.id, 99000, "2027-01-01"), "a waiting one behind the form"); fill("100000", "2026-12");
const h2 = [toasts().at(-1), d.querySelectorAll(".toast b").length];
setup(safe(() => PS.withdrawSalaryProposal(KABIR, "SP-2")), "SP-2 withdrawn");
await page();
editOf("Tara <b>Rao</b>")?.click(); fill("85000", "2026-12");
const h3 = [toasts().at(-1), d.querySelectorAll(".toast b").length];
check("H1", "a name with markup (\"Tara <b>Rao</b>\"): the saved toast (Aarav), a refusal's toast and the waiting toast (Kabir) show it as text, no element made",
  hire.ok && h1[0] === "Tara <b>Rao</b>'s salary is ₹80,000 a month from 1 Nov 2026." && h1[1] === 0
  && h2[0] === "Tara <b>Rao</b> already has a salary change waiting for a decision (SP-2)." && h2[1] === 0
  && h3[0] === "Tara <b>Rao</b>'s new salary, ₹85,000 a month from 1 Dec 2026, is waiting for an Admin's approval." && h3[1] === 0, j([h1, h2, h3]));

// =================================================================
section("U. The other decision flows");
mem.clear(); setNow(2026, 11, 20); S.getAllUsers();
setSession(["hr", "Priya Nair", "EMP-1003"]); await open("leave/leave-approvals");
[...d.querySelectorAll("#main button")].find((b) => txt(b) === "Reject")?.click();
const u1 = d.getElementById("reject-note")?.placeholder;
check("U1", "the leave flow keeps the note's default: leave-approvals' Reject note still reads \"The employee sees this note\"", u1 === "The employee sees this note", j(u1));

// =================================================================
section("S. setSalary(): an Admin's only");
seeded();
const s0 = salaries();
const s1 = [
  ["Kabir (Finance)", safe(() => PS.setSalary(KABIR, ROHAN, { gross: 100000, effectiveFrom: "2026-12-01" })), ONLY_ADMIN],
  ["Kabir, an unknown person", safe(() => PS.setSalary(KABIR, "EMP-9999", { gross: 100000, effectiveFrom: "2026-12-01" })), ONLY_ADMIN],
  ["Kabir, his own", safe(() => PS.setSalary(KABIR, KABIR, { gross: 100000, effectiveFrom: "2026-12-01" })), ONLY_ADMIN],
  ["Kabir, a bad gross", safe(() => PS.setSalary(KABIR, ROHAN, { gross: 0, effectiveFrom: "2026-12-01" })), ONLY_ADMIN],
  ["Arjun (no salary:edit)", safe(() => PS.setSalary(ARJUN, ROHAN, { gross: 100000, effectiveFrom: "2026-12-01" })), "You can't change salaries."],
];
check("S1", "Finance can't reach setSalary(): refused \"Only an Admin can change a salary at once: propose the change instead.\" before the person or the fields; no salary:edit still \"You can't change salaries.\" first; nothing stored",
  s1.every(([, r, msg]) => !r.ok && r.error === msg) && salaries() === s0, j(s1.map(([l, r]) => [l, errOf(r)])));
const s2 = safe(() => PS.setSalary(AARAV, ROHAN, { gross: 100000, effectiveFrom: "2026-12-01" }));
const s2b = safe(() => PS.setSalary(AARAV, ROHAN, { gross: 0, effectiveFrom: "2026-12-01" }));
check("S2", "an Admin still: setSalary(Aarav) writes the record; its own rules as before (a bad gross: checkSalary()'s words under gross)", s2.ok && s2.record.gross === 100000 && s2b.error === GROSS && s2b.field === "gross", j([errOf(s2), errOf(s2b)]));
seeded(); const s3p = propose(KABIR, ROHAN, 100000, "2026-11-01");
const s3 = has("decideSalaryProposal") ? safe(() => PS.decideSalaryProposal(AARAV, s3p.record?.id, "approve")) : { ok: false };
check("S3", "the chain still writes through it: Kabir's proposal, approved by Aarav, adds the record", s3.ok && PS.salaryFor(ROHAN, 2026, 11)?.gross === 100000 && proposal("SP-1")?.salaryId === PS.salaryHistory(ROHAN)[0]?.id, errOf(s3));
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const codeOf = (s) => s.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
const callers = (name) => walk("./js").filter((p) => p !== "data/payroll-store.js" && new RegExp(`\\b${name}\\(`).test(codeOf(srcAt("./js", p))));
// Round 12Z (behavior; was "the salary page calls ... decideSalaryProposal()"): the flow moved to ui/salary-change-view.js, shared with the inbox (salinbox.mjs S2)
check("S4", "no script but payroll-store.js calls setSalary(); the salary page calls proposeSalary() and withdrawSalaryProposal(), and only it; decideSalaryProposal() only ui/salary-change-view.js (12Z)",
  j(callers("setSalary")) === "[]" && ["proposeSalary", "withdrawSalaryProposal"].every((f) => j(callers(f)) === j(["pages/salary-structure.js"])) && j(callers("decideSalaryProposal")) === j(["ui/salary-change-view.js"]), j(callers("setSalary")));

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
// Round 12Z (layout, X1; was the live js): 12Y's own change set (js-pre12Z = 77b5ddb); the live js: salinbox.mjs X1
const jsNow = walk("./js-pre12Z"), jsPre = walk("./js-pre12Y");
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12Z", p) !== srcAt("./js-pre12Y", p));
check("X1", "exactly three js files changed, none added or removed: data/payroll-store.js, pages/salary-structure.js, ui/leave-decision.js",
  j(changedJs) === j(["data/payroll-store.js", "pages/salary-structure.js", "ui/leave-decision.js"]) && j(jsNow) === j(jsPre), j(changedJs));
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
// Round 12Z (layout, X2 / X3; was the live pages): 12Y's page as 77b5ddb has it (html-pre12Z); the live pages: salinbox.mjs X2
const changedPages = pagesNow.filter((p) => srcAt("./html-pre12Z", p) !== srcAt("./html-pre12Y", p));
const hNow = srcAt("./html-pre12Z", "payroll/salary-structure.html"), hPre = srcAt("./html-pre12Y", "payroll/salary-structure.html");
check("X2", "one page changed, salary-structure.html, in the alert's one clause; no css changed",
  j(changedPages) === j(["payroll/salary-structure.html"]) && j(pagesNow) === j(walk("./html-pre12Y").filter((p) => p.endsWith(".html")))
  && hNow.replace(" (not your own): an Admin's change takes effect at once, anyone else's waits for an Admin to approve it.", " (not your own).") === hPre
  && walk("./css-pre12Y").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12Y", p)), j(changedPages));
const crlf = (s) => !s.endsWith("\n") && !/(^|[^\r])\n/.test(s);
// Round 12Z (layout, X3 / X4 / X5; was the live js): 12Y's three files as 77b5ddb has them (js-pre12Z); the live ones: salinbox.mjs X4 / X5
const [ss, ssP, ld, ldP, ps, psP] = [srcAt("./js-pre12Z", "pages/salary-structure.js"), srcAt("./js-pre12Y", "pages/salary-structure.js"), srcAt("./js-pre12Z", "ui/leave-decision.js"), srcAt("./js-pre12Y", "ui/leave-decision.js"), srcAt("./js-pre12Z", "data/payroll-store.js"), srcAt("./js-pre12Y", "data/payroll-store.js")];
const imports = (s) => s.match(/^import .*$/gm);
const lines = (s) => s.split("\r\n");
const added = (now, pre) => lines(codeOf(now)).filter((l) => !lines(codeOf(pre)).includes(l));
const removed = (now, pre) => added(pre, now);
check("X3", "CRLF, no final newline (the three scripts and the page); the salary page's imports: setSalary out, the chain's functions, getUser, permissionsOf, escapeHtml / nameOf and the decision flow in; the other two files' imports unchanged",
  [ss, ld, ps, hNow].every(crlf) && j(imports(ld)) === j(imports(ldP)) && j(imports(ps)) === j(imports(psP))
  && j(imports(ss).filter((l) => !imports(ssP).includes(l))) === j([
    'import { salaryFor, salaryHistory, proposeSalary, pendingSalaryProposal, proposalDecidersFor, decideSalaryProposal, withdrawSalaryProposal } from "../data/payroll-store.js";',
    'import { getAllUsers, getUser } from "../data/store.js";', 'import { permissionsOf } from "../config/roles.js";',
    'import { el, escapeHtml, todayIso, formatDay, plural, personCell, fillDepartmentSelect, nameOf } from "../ui/leave-view.js";',
    'import { createDecisionFlow, decisionButtons } from "../ui/leave-decision.js";']), j(imports(ss).filter((l) => !imports(ssP).includes(l))));
check("X4", "payroll-store.js: comments aside, one line added (setSalary()'s payroll:approve refusal), none removed; leave-decision.js: only the note's placeholder line",
  j(added(ps, psP)) === j(['  if (!permissionsOf(actor).includes("payroll:approve")) return fail("Only an Admin can change a salary at once: propose the change instead.");']) && removed(ps, psP).length === 0
  && j(added(ld, ldP)) === j(['    note.placeholder = labels.placeholder ?? "The employee sees this note";']) && j(removed(ld, ldP)) === j(['    note.placeholder = "The employee sees this note";']),
  j([added(ps, psP), added(ld, ldP)]));
const fn = (s, name) => { const a = s.indexOf(`function ${name}(`); return a < 0 ? "" : s.slice(a, s.indexOf("\n}", a) + 2); };
check("X5", "the salary page's rest the same: formulaText(), editButton(), renderComponents(), statusOf(), visibleRows(), closeIcon(), currentRows(), renderRows(), historyRow(), renderHistory() and renderExample() byte for byte",
  ["formulaText", "editButton", "renderComponents", "statusOf", "visibleRows", "closeIcon", "currentRows", "renderRows", "historyRow", "renderHistory", "renderExample"].every((f) => fn(ss, f) === fn(ssP, f) && fn(ss, f).length > 40));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
