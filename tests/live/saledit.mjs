// usage: node saledit.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12W (R9b): salary-structure.html's Edit on a person's row opens a small form (monthly gross; "Takes effect
// from", a month) and saves through payroll-store.js setSalary() (12V) from that month's 1st, showing its refusals as
// it words them: under the field it names, else as a toast. The table keeps the salary in effect today. Your own row's
// Edit is disabled with setSalary()'s reason. A component's Edit and Add component stay placeholders.
// ./js-pre12W, ./html-pre12W and ./css-pre12W are the code, pages and css before this round (office-os 34dd4ed).
//   G  before: Edit only showed "Edit isn't available in this demo."
//   D  the form: what it holds; Cancel, the ✕ and the backdrop close it, storing nothing
//   S  saves: this month (the table and the example card move), a later month (Revision due, the history), a new hire
//   R  refusals as setSalary() words them: under the gross / the month; a refusal with no field as a toast
//   O  your own row: disabled, the reason on hover (Kabir as Finance, Aarav as Admin)
//   C  a component's Edit and Add component: placeholders as before;  E  no page errors;  X  scope
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
const AARAV = "EMP-1001", KABIR = "EMP-1008", ROHAN = "EMP-1042", VIKRAM = "EMP-1088";
const SESSION = { fin: ["fin", "Kabir Shah", KABIR], admin: ["admin", "Aarav Mehta", AARAV] };
const setSession = ([roleKey, userLabel, employeeId]) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, query = "", js = "./js") {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${DIR}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = () => true;
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
// Round 14E part 2 (layout): a node's text without the reason lines showReason() adds under a badge or note (class reason); reasons2.mjs pins those lines
const txt = (el) => { if (!el) return ""; const c = el.cloneNode(true); c.querySelectorAll?.(".reason").forEach((r) => r.remove()); return (c.textContent ?? "").replace(/\s+/g, " ").trim(); };
const safe = (fn) => { try { return fn(); } catch (e) { return { ok: false, error: `threw: ${e.message}` }; } };

const S = await import("./js/data/store.js");
const PS = await import("./js/data/payroll-store.js");

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
function seeded({ approve = false } = {}) {
  mem.clear(); setNow(2026, 10, 30, 19); S.getAllUsers(); PS.allSalaries(); PS.payrollRun(2026, 10);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
  if (approve) {
    setNow(2026, 11, 9);
    const p = safe(() => PS.prepareRun(KABIR, 2026, 10)), a = safe(() => PS.approveRun(AARAV, 2026, 10));
    if (!p.ok || !a.ok) console.log("setup (October):", p.error, a.error);
  }
  setNow(2026, 11, 20);
}
const salaries = () => mem.get([...mem.keys()].find((k) => k.endsWith(":salaries")));
// Round 12Y (behavior; was Kabir, Finance): a Finance save now waits for an Admin (salpage.mjs K1); the form's saves here
// run as Aarav (Admin), whose change still takes effect at once. G1 and O1 stay Kabir's.
async function page({ who = SESSION.admin, js = "./js" } = {}) { setSession(who); await open("payroll/salary-structure", "", js); }
const rowOf = (name) => [...d.querySelectorAll("#salary-rows tr")].find((r) => r.textContent.includes(name));
const editOf = (name) => [...(rowOf(name)?.querySelectorAll("button") ?? [])].find((b) => txt(b) === "Edit");
const cells = (name) => [...(rowOf(name)?.querySelectorAll("td") ?? [])].map(txt);
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => txt(t.querySelector(".toast__text")));
const modal = () => d.getElementById("salary-modal");
const isOpen = () => Boolean(modal()?.classList.contains("is-open"));
function fill(gross, month) {
  if (!modal()) return;   // the code before has no form
  if (gross !== null) d.getElementById("salary-gross").value = gross;
  if (month !== null) d.getElementById("salary-month").value = month;
  modal().querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
}
const errorUnder = (id) => txt(d.getElementById(id)?.closest(".form-field")?.querySelector(".form-error")) || null;
const FIRST = "A salary takes effect on the 1st of a month.";
const GROSS = "Enter the monthly gross in whole rupees, more than ₹0.";
const OCT = "October 2026's payroll is already approved, so a salary can take effect only after it.";
const OWN = "You can't change your own salary.";

// =================================================================
section("G. Before");
seeded(); await page({ who: SESSION.fin, js: "./js-pre12W" });
const g0 = salaries(); editOf("Rohan Gupta")?.click();
check("G1", "the code before: Rohan's Edit only toasted \"Edit isn't available in this demo.\"; no form, nothing stored; Kabir's own row offered Edit too",
  j(toasts()) === j(["Edit isn't available in this demo."]) && !modal() && salaries() === g0 && editOf("Kabir Shah")?.dataset.notImplemented === "Edit" && !editOf("Kabir Shah")?.disabled, j(toasts()));

// =================================================================
section("D. The form");
seeded(); await page();
editOf("Rohan Gupta").click();
const g = d.getElementById("salary-gross"), m = d.getElementById("salary-month");
check("D1", "Rohan's Edit (Aarav, Admin; 12Y): no toast; a dialog \"Change Rohan Gupta's salary\", the line under it, \"Monthly gross (₹)\" holding ₹92,000 and \"Takes effect from\" holding this month; Cancel and \"Save salary\"",
  toasts().length === 0 && isOpen() && txt(modal()?.querySelector(".modal__title")) === "Change Rohan Gupta's salary"
  && txt(modal()?.querySelector(".modal__desc")) === "The new monthly gross is used from the 1st of the month you choose."
  && g?.type === "number" && g.value === "92000" && txt(d.querySelector('label[for="salary-gross"]')) === "Monthly gross (₹)"
  && m?.type === "month" && m.value === "2026-11" && txt(d.querySelector('label[for="salary-month"]')) === "Takes effect from"
  && j([...(modal()?.querySelectorAll(".modal__footer button") ?? [])].map(txt)) === j(["Cancel", "Save salary"]), j([g?.value, m?.value]));
const d0 = salaries();
[...(modal()?.querySelectorAll("button") ?? [])].find((b) => txt(b) === "Cancel")?.click();
const d2a = !modal();
editOf("Rohan Gupta").click(); modal()?.querySelector(".modal__close")?.click();
const d2b = !modal();
editOf("Rohan Gupta").click(); modal()?.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const d2c = !modal();
editOf("Rohan Gupta").click(); editOf("Rohan Gupta").click();
check("D2", "Cancel, the ✕ and the backdrop each close it, storing nothing; opened twice, one dialog", d2a && d2b && d2c && salaries() === d0 && d.querySelectorAll("#salary-modal").length === 1, j([d2a, d2b, d2c]));

// =================================================================
section("S. Saves");
seeded(); await page();
editOf("Rohan Gupta").click(); fill("100000", "2026-11");
check("S1", "this month (Nov), ₹1,00,000: the dialog closes; \"Rohan Gupta's salary is ₹1,00,000 a month from 1 Nov 2026.\"; his row now ₹1,00,000, last revised 1 Nov 2026, Active",
  !modal() && toasts().at(-1) === "Rohan Gupta's salary is ₹1,00,000 a month from 1 Nov 2026." && PS.salaryFor(ROHAN, 2026, 11)?.gross === 100000
  && cells("Rohan Gupta")[2] === "₹1,00,000" && cells("Rohan Gupta")[4] === "1 Nov 2026" && cells("Rohan Gupta")[5] === "Active", j([toasts().at(-1), cells("Rohan Gupta").slice(2, 6)]));
seeded(); await page();
editOf("Rohan Gupta").click(); fill("110000", "2027-01");
const rec = PS.salaryHistory(ROHAN)[0];
check("S2", "a later month (Jan 2027): saved (the record, from 2027-01-01); his row keeps today's ₹92,000, \"Revision due 1 Jan 2027\" with ₹1,10,000 on hover (as the page already shows a later record)",
  rec?.gross === 110000 && rec.effectiveFrom === "2027-01-01" && cells("Rohan Gupta")[2] === "₹92,000" && cells("Rohan Gupta")[5] === "Revision due 1 Jan 2027"
  && rowOf("Rohan Gupta").querySelector("td:nth-child(6) .badge")?.title === "₹1,10,000 a month from 1 Jan 2027", j(cells("Rohan Gupta").slice(2, 6)));
[...rowOf("Rohan Gupta").querySelectorAll("button")].find((b) => txt(b) === "Breakdown").click();
const hist = [...d.querySelectorAll("#salary-history .breakdown__row")].map(txt);
check("S3", "his Breakdown: the history lists the new record first, \"(not in effect yet)\", then the one in effect", hist[0] === "From 1 Jan 2027 (not in effect yet)₹1,10,000 (+₹18,000)" && /^From 1 Apr 2026/.test(hist[1] ?? ""), j(hist.slice(0, 2)));
seeded(); await page();
const exTitle = txt(d.getElementById("salary-example-title"));
[...rowOf("Vikram Singh").querySelectorAll("button")].find((b) => txt(b) === "Breakdown").click();
editOf("Vikram Singh").click(); fill("70000", "2026-11");
check("S4", "the person in the example card (Vikram): saved this month, the card's gross reads ₹70,000 at once", d.querySelector('[data-field="gross"]')?.textContent === "₹70,000" && /Vikram/.test(txt(d.getElementById("salary-example-title"))) && exTitle !== "", d.querySelector('[data-field="gross"]')?.textContent);
seeded();
const hire = S.addUser(AARAV, { name: "Neha Kapoor", email: "neha.kapoor@northwind.com", department: "ENG", designation: "Software Engineer", dateOfJoining: "3 Nov 2026" });
await page();
const before = cells("Neha Kapoor");
editOf("Neha Kapoor").click();
const blank = d.getElementById("salary-gross")?.value;
fill("80000", "2026-11");
check("S5", "a new hire with no salary (\"No salary on file\"): the gross starts empty; saved ₹80,000 from 1 Nov: her row reads it", hire.ok && before[5] === "No salary on file" && blank === "" && cells("Neha Kapoor")[2] === "₹80,000", j([before[5], blank, cells("Neha Kapoor")[2]]));

// =================================================================
section("R. Refusals, as setSalary() words them");
seeded({ approve: true }); await page();
const r0 = salaries();
const R = [];
for (const [label, gross, month, field, msg] of [
  ["gross 92000.5", "92000.5", "2026-12", "salary-gross", GROSS],
  ["gross 0", "0", "2026-12", "salary-gross", GROSS],
  ["gross empty", "", "2026-12", "salary-gross", GROSS],
  ["no month", "100000", "", "salary-month", FIRST],
  ["October (approved)", "100000", "2026-10", "salary-month", OCT],
]) {
  editOf("Rohan Gupta").click(); fill(gross, month);
  const shown = errorUnder(field), other = errorUnder(field === "salary-gross" ? "salary-month" : "salary-gross");
  // Round 12Y (behavior; was Kabir: setSalary() is an Admin's now)
  const direct = safe(() => PS.setSalary(AARAV, ROHAN, { gross: gross === "" ? undefined : Number(gross), effectiveFrom: month ? `${month}-01` : "" }));
  R.push([label, shown === msg && shown === direct.error && other === null && isOpen() && d.getElementById(field)?.getAttribute("aria-describedby") === `${field}-error`, shown]);
  modal()?.querySelector(".modal__close")?.click();
}
check("R1", "5 refusals: each shown under the field setSalary() names, word for word what it returns for the same input; the dialog stays open; nothing stored",
  R.every(([, ok]) => ok) && salaries() === r0, j(R.filter(([, ok]) => !ok)));
editOf("Rohan Gupta").click(); fill("92000.5", "2026-12"); fill("100000", "2026-12");
check("R2", "corrected and sent again: the old error goes, the save goes through", errorUnder("salary-gross") === null && !modal() && PS.salaryHistory(ROHAN)[0]?.gross === 100000, j(toasts().at(-1)));
seeded(); await page();
editOf("Rohan Gupta").click();
rawEdit("users", (u) => u.id === ROHAN, (u) => { u.id = "EMP-9042"; });   // he leaves the list while the form is open
fill("100000", "2026-12");
check("R3", "a refusal with no field (the person gone while the form was open): the dialog closes and setSalary()'s words show as a toast", !modal() && toasts().at(-1) === "No employee with id EMP-1042.", j(toasts().at(-1)));

// =================================================================
section("O. Your own row");
seeded(); await page({ who: SESSION.fin });
const own = editOf("Kabir Shah");
own?.click();
check("O1", "Kabir (Finance): his own row's Edit disabled, setSalary()'s reason on hover; clicking opens nothing; the others' enabled",
  own?.disabled === true && own.title === OWN && !modal() && editOf("Rohan Gupta")?.disabled === false && !editOf("Rohan Gupta")?.title, j([own?.disabled, own?.title]));
seeded(); await page({ who: SESSION.admin });
check("O2", "Aarav (Admin): his own row disabled the same way; Kabir's enabled", editOf("Aarav Mehta")?.disabled === true && editOf("Aarav Mehta").title === OWN && editOf("Kabir Shah")?.disabled === false);

// =================================================================
section("C. What stays a placeholder");
seeded(); await page();
const comps = [...d.querySelectorAll("#salary-components button")];
comps[0].click();
const addC = [...d.querySelectorAll(".page-header__actions button")].find((b) => /Add component/.test(txt(b)));
addC.click();
check("C1", "every component's Edit and Add component: placeholders on salary:edit, the same toast as before",
  comps.length === 7 && comps.every((b) => b.dataset.notImplemented === "Edit" && b.dataset.permission === "salary:edit") && addC.dataset.notImplemented === "Add component"
  && j(toasts()) === j(["Edit isn't available in this demo.", "Add component isn't available in this demo."]), j(toasts()));
const personEdits = [...d.querySelectorAll("#salary-rows button")].filter((b) => txt(b) === "Edit");
check("C2", "the person rows' Edit: no placeholder, still on salary:edit (9 rows)", personEdits.length === 9 && personEdits.every((b) => !b.dataset.notImplemented && b.dataset.permission === "salary:edit"), j(personEdits.length));

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12X"), jsPre = walk("./js-pre12W");   // Round 12X (layout; was the live js): 12W's own change set (js-pre12X = 69ae7ad)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12X", p) !== srcAt("./js-pre12W", p));
check("X1", "exactly one js file changed, none added or removed: pages/salary-structure.js (payroll-store.js untouched)", j(changedJs) === j(["pages/salary-structure.js"]) && j(jsNow) === j(jsPre), j(changedJs));
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
// Round 12Y (layout, X2 / X3; was the live pages): 12W's page as 3766ac0 has it (html-pre12Y); the live page: salpage.mjs X2
const changedPages = pagesNow.filter((p) => srcAt("./html-pre12Y", p) !== srcAt("./html-pre12W", p));
const hNow = srcAt("./html-pre12Y", "payroll/salary-structure.html"), hPre = srcAt("./html-pre12W", "payroll/salary-structure.html");
check("X2", "one page changed, salary-structure.html, in the alert's one sentence; no css changed",
  j(changedPages) === j(["payroll/salary-structure.html"]) && j(pagesNow) === j(walk("./html-pre12W").filter((p) => p.endsWith(".html")))
  && hNow.replace("A person's Edit sets a new monthly gross from the 1st of a month (not your own). A component's Edit and Add component aren't built yet, so they don't save anything.", "Changing a salary isn't built yet, so Edit and Add component don't save anything.") === hPre
  && walk("./css-pre12W").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12W", p)), j(changedPages));
// Round 12Y (layout, X3 / X4; was the live js): 12W's script as 3766ac0 has it (js-pre12Y); the live script: salpage.mjs X3 / X5
const [js, jsP] = [srcAt("./js-pre12Y", "pages/salary-structure.js"), srcAt("./js-pre12W", "pages/salary-structure.js")];
const crlf = (s) => !s.endsWith("\n") && !/(^|[^\r])\n/.test(s);
const imports = (s) => s.match(/^import .*$/gm);
check("X3", "CRLF, no final newline (js and page); imports: setSalary added to payroll-store's, and auth / modal / toast",
  crlf(js) && crlf(hNow) && j(imports(js).filter((l) => !imports(jsP).includes(l))) === j([
    'import { salaryFor, salaryHistory, setSalary } from "../data/payroll-store.js";', 'import { getCurrentUserId } from "../core/auth.js";',
    'import { openModal, closeModal } from "../ui/modal.js";', 'import { showToast } from "../ui/toast.js";']), j(imports(js).filter((l) => !imports(jsP).includes(l))));
const fn = (s, name) => { const a = s.indexOf(`function ${name}(`); return a < 0 ? "" : s.slice(a, s.indexOf("\n}", a) + 2); };
check("X4", "the rest the same: editButton() (the components' placeholder), salaryRows(), statusOf(), renderComponents(), renderExample() and renderHistory() byte for byte; buildRow() differs only in its Edit",
  ["editButton", "salaryRows", "statusOf", "renderComponents", "renderExample", "renderHistory", "renderRows"].every((f) => fn(js, f) === fn(jsP, f) && fn(js, f).length > 40)
  && fn(js, "buildRow").replace("salaryEditButton(row)", "editButton()") === fn(jsP, "buildRow"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
