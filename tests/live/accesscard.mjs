// usage: node accesscard.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12A: two display fixes, nothing stored changes. ./js-pre12A, ./html-pre12A and ./css-pre12A are the code, pages
// and css before this round (office-os c0d65a5).
//   A  11R R9.11: user-form's "Access summary" card follows the form (designation, default role, data scope, the
//      approval chain the form would save) and its two-factor row says "Not recorded yet", muted, as on the profile
//   L  leave-store.js approvalChainFor(record): approvalChainText(id) unchanged, and the same for a saved record
//   T  11Y Y9.9: the profile's Tenure stops at a leaver's last working day, and follows Deactivate / Reactivate
//   P  display only: the same storage as pristine after the same clicks
//   E  what stays; X scope
// The clock is local wall time, Mon 2 Nov 2026 10:00, moved forward in T; storage seeded then.
// Round 12B (layout; was the live js, in X1): 12A's own change set, read from the frozen result (js-pre12B = babb144).
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
const START = new RealDate(2026, 10, 2, 10, 0, 0).getTime();
let NOW = START;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", MEERA = "EMP-1023", SNEHA = "EMP-1029", ROHAN = "EMP-1042", DIVYA = "EMP-1061", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));
const asAdmin = () => setSession("admin", "Aarav Mehta", AARAV);

let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, { js = "js", query = "", dir = DIR } = {}) {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) allJsErrors.push(`${page} (${js}): ${e.message}`); });
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

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const fresh = () => { mem.clear(); timers = []; NOW = START; };

const S = await import("./js/data/store.js");
const LV = await import("./js/data/leave-store.js");
const LV0 = await import("./js-pre12A/data/leave-store.js");
const approvalChainFor = LV.approvalChainFor ?? (() => null);   // guarded: a tree without it fails, not crashes
// A record edited straight in storage (undefined removes the field).
function editRecord(id, field, value) {
  S.getAllUsers();   // seed if empty
  const box = JSON.parse(mem.get("officeos:users"));
  const rec = box.records.find((u) => u.id === id);
  if (value === undefined) delete rec[field]; else rec[field] = value;
  mem.set("officeos:users", JSON.stringify(box));
}
const kvDd = (label) => [...d.querySelectorAll(".kv__row")].find((r) => txt(r.querySelector("dt")) === label)?.querySelector("dd");
const kv = (label) => txt(kvDd(label));
const CARD = ["Designation", "Default role", "Data scope", "Approval chain"];
const card = () => CARD.map(kv);
const choose = (id, value) => { const s = d.getElementById(id); s.value = value; s.dispatchEvent(new w.Event("change", { bubbles: true })); };
const EVERYONE = [AARAV, PRIYA, KABIR, "EMP-1017", MEERA, SNEHA, ROHAN, DIVYA, VIKRAM, ARJUN];
const NOT_RECORDED = "Not recorded yet";

// =================================================================
section("A. user-form: the Access summary card follows the form");
fresh(); asAdmin();
const mismatch = [];
for (const id of EVERYONE) {
  await open("users/user-form", { query: `?id=${id}` });
  const form = card();
  await open("users/user-profile", { query: `?id=${id}` });
  const profile = card();
  if (j(form) !== j(profile)) mismatch.push([id, form, profile]);
}
check("A1", "editing each of the ten seeded people, the card's Designation / Default role / Data scope / Approval chain read as their profile's",
  mismatch.length === 0, j(mismatch.slice(0, 2)));

fresh(); asAdmin(); await open("users/user-form");
// Round Manager scoping part 2 (behaviour; was 'Own records': the Data scope says what is enforced)
check("A2", "a new person, nothing chosen yet: —, Employee, Own records, plus your direct reports if you manage people, HR or an Admin (what saving would store, as Effective permissions shows)",
  j(card()) === j(["—", "Employee", "Own records, plus your direct reports if you manage people", "HR or an Admin"]), j(card()));
const seen = [];
for (const title of ["HR Manager", "Finance Manager", "Administrator", "Team Lead"]) { choose("designation", title); seen.push(card()); }
check("A3", "choosing a designation updates the card at once: its role, that role's data scope, the chain (an Admin's is automatic)",
  // Round Manager scoping part 2 (behaviour; were 'All records' for Finance and 'Own records' for Employee)
  j(seen) === j([["HR Manager", "HR Manager", "All records", "HR or an Admin"], ["Finance Manager", "Finance Manager", "All finance records", "HR or an Admin"],
    ["Administrator", "Admin", "All records", "Approved automatically (Admin)"], ["Team Lead", "Employee", "Own records, plus your direct reports if you manage people", "HR or an Admin"]]), j(seen));

fresh(); asAdmin(); await open("users/user-form", { query: `?id=${ARJUN}` });
const before = kv("Approval chain");
choose("manager", KABIR); const toKabir = kv("Approval chain");
choose("manager", ""); const toNone = kv("Approval chain");
choose("manager", KABIR); choose("designation", "Administrator"); const adminChain = kv("Approval chain");
check("A4", "choosing a manager updates the chain at once (Arjun: Sneha's, then Kabir's, then none; made Admin, automatic)",
  j([before, toKabir, toNone, adminChain]) === j(["Sneha Rao, then HR or an Admin", "Kabir Shah, then HR or an Admin", "HR or an Admin", "Approved automatically (Admin)"]),
  j([before, toKabir, toNone, adminChain]));

// The chain shown is the one saving stores.
fresh(); asAdmin(); await open("users/user-form", { query: `?id=${ARJUN}` });
choose("manager", KABIR); choose("designation", "Accountant");
const shown = card();
d.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const saved = S.getUser(ARJUN);
check("A5", "saved as shown: after Save, the stored record's chain and role are the card's (Kabir's chain; Accountant, Employee)",
  saved.reportingManagerId === KABIR && saved.designation === "Accountant" && LV.approvalChainText(ARJUN) === shown[3] && j(shown) === j(["Accountant", "Employee", "Own records, plus your direct reports if you manage people", "Kabir Shah, then HR or an Admin"]) /* Round Manager scoping part 2 (behaviour; was 'Own records') */, j(shown));

fresh(); editRecord(ARJUN, "reportingManager", "Rahul Deshmukh"); editRecord(ARJUN, "reportingManagerId", null);   // as store.js keeps a name it can't match
asAdmin(); await open("users/user-form", { query: `?id=${ARJUN}` });
check("A6", "a manager kept by name only (not on record): the chain is HR's, as the saved record's is",
  d.getElementById("manager").value === "name:Rahul Deshmukh" && kv("Approval chain") === "HR or an Admin" && LV.approvalChainText(ARJUN) === "HR or an Admin", kv("Approval chain"));

fresh(); editRecord(SNEHA, "status", "inactive");
asAdmin(); await open("users/user-form", { query: `?id=${ARJUN}` });
check("A7", "a saved manager who is inactive stays selected, and the chain passes over them, as the saved record's does",
  d.getElementById("manager").value === SNEHA && kv("Approval chain") === "HR or an Admin" && LV.approvalChainText(ARJUN) === "HR or an Admin", kv("Approval chain"));

fresh(); asAdmin(); await open("users/user-form", { query: `?id=${MEERA}` });
check("A8", "a manager who is on leave isn't an active manager: Meera's chain (Kabir on file) is as her profile shows it",
  kv("Approval chain") === LV.approvalChainText(MEERA), j([kv("Approval chain"), LV.approvalChainText(MEERA)]));

fresh(); asAdmin(); await open("users/user-form", { query: `?id=${PRIYA}` });
const role = kvDd("Default role"), tf = kvDd("Two-factor sign-in");
check("A9", "Default role keeps its badge (the text changes inside it)", role?.querySelector(".badge.badge--primary") && txt(role.querySelector(".badge")) === "HR Manager", role?.innerHTML);
check("A10", "the two-factor row: \"Not recorded yet\", muted, as on the profile; no other value left",
  tf && txt(tf) === NOT_RECORDED && tf.classList.contains("text-muted") && !tf.querySelector(".badge"), tf?.outerHTML);
await open("users/user-profile", { query: `?id=${PRIYA}` });
check("A11", "the profile's two-factor row says the same words", kv("Two-factor sign-in") === NOT_RECORDED && kvDd("Two-factor sign-in").classList.contains("text-muted"));

// =================================================================
section("L. leave-store.js: the chain for a record");
fresh(); S.getAllUsers();
check("L1", "approvalChainText(id) is exactly the pre-12A text for every seeded person and an unknown id",
  [...EVERYONE, "EMP-0000"].every((id) => LV.approvalChainText(id) === LV0.approvalChainText(id)), j(EVERYONE.map((id) => LV.approvalChainText(id))));
check("L2", "approvalChainFor(the saved record) == approvalChainText(id) for everyone",
  EVERYONE.every((id) => approvalChainFor(S.getUser(id)) === LV.approvalChainText(id)));
check("L3", "an unsaved record: by role and reportingManagerId; nobody is their own manager; an Admin's is automatic",
  approvalChainFor({ id: null, role: "emp", reportingManagerId: SNEHA }) === "Sneha Rao, then HR or an Admin"
  && approvalChainFor({ id: SNEHA, role: "emp", reportingManagerId: SNEHA }) === "HR or an Admin"
  && approvalChainFor({ id: null, role: "emp", reportingManagerId: null }) === "HR or an Admin"
  && approvalChainFor({ id: null, role: "admin", reportingManagerId: SNEHA }) === "Approved automatically (Admin)");

// =================================================================
section("T. The profile's Tenure");
const tenureOn = async (id, js = "js") => { asAdmin(); await open("users/user-profile", { query: `?id=${id}`, js }); return kv("Tenure"); };
fresh(); editRecord(ROHAN, "dateOfJoining", "20 Jan 2023");
const activeT = await tenureOn(ROHAN);
check("T1", "someone active: from the joining date to today, as before (20 Jan 2023 -> Mon 2 Nov 2026)", activeT === "3 years, 9 months" && activeT === await tenureOn(ROHAN, "js-pre12A"), activeT);
const left = S.deactivateUser(AARAV, ROHAN, "2026-10-16");
const leftT = await tenureOn(ROHAN), leftPre = await tenureOn(ROHAN, "js-pre12A");
check("T2", "a leaver (last working day Fri 16 Oct 2026): to that day, not today", left.ok && leftT === "3 years, 8 months" && leftPre === "3 years, 9 months", j([left.ok, leftT, leftPre]));
NOW = new RealDate(2027, 2, 2, 10, 0, 0).getTime();
const laterT = await tenureOn(ROHAN), laterPre = await tenureOn(ROHAN, "js-pre12A");
check("T3", "months later (2 Mar 2027) it hasn't moved; before 12A it kept counting", laterT === "3 years, 8 months" && laterPre === "4 years, 1 month", j([laterT, laterPre]));

fresh(); editRecord(ROHAN, "dateOfJoining", "20 Jan 2023");
await tenureOn(ROHAN);
[...d.querySelectorAll(".page-header__actions button")].find((b) => txt(b) === "Deactivate")?.click();
const dateInput = d.getElementById("deactivate-date");
if (dateInput) dateInput.value = "2026-10-16";
d.getElementById("deactivate-modal")?.querySelector("form")?.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const afterDeact = kv("Tenure");
[...d.querySelectorAll(".page-header__actions button")].find((b) => txt(b) === "Reactivate")?.click();
const afterReact = kv("Tenure");
// Round 12Q (behavior; was "Reactivate puts it back to today's" with ["3 years, 8 months", "3 years, 9 months"]): the
// return keeps the time away as a past period (12H), which 12Q notes beside the figure: 17 Oct to 1 Nov, 16 days.
check("T4", "on the page: Deactivate (16 Oct) changes Tenure at once, Reactivate puts it back to today's, with the time away noted (16 days)",
  S.getUser(ROHAN).status !== "inactive" && j([afterDeact, afterReact]) === j(["3 years, 8 months", "3 years, 9 months (16 days away)"]), j([afterDeact, afterReact]));

fresh(); editRecord(ROHAN, "dateOfJoining", "16 Oct 2026");
const same = S.deactivateUser(AARAV, ROHAN, "2026-10-16");
check("T5", "a last working day on the joining date: \"Less than a month\"", same.ok && await tenureOn(ROHAN) === "Less than a month", j([same.ok, kv("Tenure")]));

fresh();
const divya = await tenureOn(DIVYA), divyaPre = await tenureOn(DIVYA, "js-pre12A");
check("T6", "an inactive person from before 11Y (no last working day on file, Divya): as before", divya === divyaPre, j([divya, divyaPre]));
fresh(); editRecord(VIKRAM, "dateOfJoining", undefined);
const staticT = await tenureOn(VIKRAM), staticPre = await tenureOn(VIKRAM, "js-pre12A");
check("T7", "no joining date on file: the page's static text stays, as before", staticT === staticPre && staticT !== "", j([staticT, staticPre]));

// =================================================================
section("P. Display only: the same storage as pristine");
const stored = () => j([...mem.entries()].filter(([k]) => k !== "officeos:session").sort());
async function formClicks(js) {
  fresh(); asAdmin(); await open("users/user-form", { query: `?id=${ARJUN}`, js });
  choose("designation", "HR Manager"); choose("manager", KABIR); choose("manager", "");
  return stored();
}
check("P1", "opening the form and changing the designation and manager (not saving) leaves storage as pristine's does", await formClicks("js") === await formClicks("js-pre12A"));
async function profileVisit(js) {
  fresh(); editRecord(ROHAN, "dateOfJoining", "20 Jan 2023"); S.deactivateUser(AARAV, ROHAN, "2026-10-16");
  asAdmin(); await open("users/user-profile", { query: `?id=${ROHAN}`, js });
  return stored();
}
check("P2", "opening a leaver's profile leaves storage as pristine's does", await profileVisit("js") === await profileVisit("js-pre12A"));

// =================================================================
section("E. What stays");
fresh(); asAdmin();
const diffs = [];
for (const id of EVERYONE) {
  await open("users/user-profile", { query: `?id=${id}` });
  const now = [...CARD, "Two-factor sign-in", "Last sign-in", "Tenure"].map(kv);
  await open("users/user-profile", { query: `?id=${id}`, js: "js-pre12A" });
  const pre = [...CARD, "Two-factor sign-in", "Last sign-in", "Tenure"].map(kv);
  if (j(now.filter((_, i) => i !== 2)) !== j(pre.filter((_, i) => i !== 2))) diffs.push([id, now, pre]);   // Round Manager scoping part 2 (layout: compared without Data scope, CARD's third, whose words changed)
}
check("E1", "every seeded profile's Access card and Tenure read exactly as before 12A (nobody has left)", diffs.length === 0, j(diffs.slice(0, 2)));
check("E2", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12B"), jsPre = walk("./js-pre12A");   // Round 12B (layout)
const FILES = ["data/leave-store.js", "pages/user-form.js", "pages/user-profile.js"];
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12B", p) !== srcAt("./js-pre12A", p));
check("X1", "exactly three js files changed, none added or removed: leave-store.js, user-form.js, user-profile.js", j(changedJs) === j(FILES) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed (the card's HTML keeps its static values; the script replaces them)", j(pagesNow) === j(walk("./html-pre12A").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12A", p))
  && walk("./css-pre12A").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12A", p)));
const imports = (dir, p) => srcAt(dir, p).match(/^import .*$/gm);
const exportsOf = (dir, p) => [...srcAt(dir, p).matchAll(/^export (?:async )?(?:function|const|let) (\w+)/gm)].map((m) => m[1]).sort();
check("X3", "CRLF with no final newline, all three; only user-form gains an import (approvalChainFor from leave-store.js); leave-store gains one export",
  FILES.every((p) => { const s = srcAt("./js-pre12B", p); return !s.endsWith("\n") && !/(^|[^\r])\n/.test(s); })   // Round 12I (layout; was the live js): 12A's result (js-pre12B)
  && j(imports("./js-pre12B", "pages/user-form.js")) === j([...imports("./js-pre12A", "pages/user-form.js").slice(0, 4), 'import { approvalChainFor } from "../data/leave-store.js";', ...imports("./js-pre12A", "pages/user-form.js").slice(4)])
  && j(imports("./js-pre12B", "data/leave-store.js")) === j(imports("./js-pre12A", "data/leave-store.js")) && j(imports("./js-pre12B", "pages/user-profile.js")) === j(imports("./js-pre12A", "pages/user-profile.js"))
  && j(exportsOf("./js-pre12B", "data/leave-store.js")) === j([...exportsOf("./js-pre12A", "data/leave-store.js"), "approvalChainFor"].sort()));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
