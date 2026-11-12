// usage: node newstarts.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12P: round-12o-notes.md O12, ruling approved. A new employee starts active; someone leaves only through a
// deactivation, which records their last working day (11Y). (a) The Add page has no "Account active" box: it's hidden
// there (with its "Account" heading), and buildRecord() saves "active" without reading it; editing is unchanged.
// (b) addUser refuses status "inactive" or a dateOfLeaving, with changeUser's existing string verbatim. No new string.
// ./js-pre12P, ./html-pre12P and ./css-pre12P are the code, pages and css before this round (office-os ae842da).
//   G  O12 reproduced: the Add page's payload with the box unticked (inactive, no last working day)
//   F  the Add page itself, with October approved and not: no box; a new employee is saved active; the code before
//      saved them inactive, and with October approved they could never be reactivated
//   E  the edit page is unchanged: the box shows, unticking it still meets 11Y's refusal, ticking it reactivates
//   S  the store API: status "inactive" and dateOfLeaving variants, each refused, nothing stored
//   A  what addUser still takes, as before (every result == ae842da's): no status, "active", "on-leave", the fields it
//      drops (leavingPeriods, id, extraRoles), a joining date inside approved October (12E E7.5, queued for R9)
//   O  order: the earlier refusals keep their place
//   I  no record addUser creates is inactive or carries a last working day, over a grid; the code before made some
//   P  the only page that adds anyone is the Add page;  E9 no page errors;  X scope
// Storage seeded Fri 30 Oct 2026 19:00, October settled on Mon 9 Nov (as rejoin.mjs does); pages opened 20 Nov.
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
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", DIVYA = "EMP-1061", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

// A page, with its scripts from ./js (this round) or ./js-pre12P (the code before).
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
const runTimers = () => timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`timer: ${e.message}`); } });

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const safe = (fn) => { try { return fn(); } catch (e) { return { ok: false, error: `threw: ${e.message}` }; } };
const errOf = (r) => (r?.ok ? "ok" : r?.error ?? "no result");

const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const OLDS = await import("./js-pre12P/data/store.js");   // before this round, on the same storage

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
// The seeded storage, settled for October on Mon 9 Nov, approved unless told not to; then 20 Nov.
function october({ approve = true } = {}) {
  mem.clear(); setNow(2026, 10, 30, 19); PS.payrollRun(2026, 10); setNow(2026, 11, 9);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
  if (approve) {
    const p = safe(() => PS.prepareRun(KABIR, 2026, 10)), a = safe(() => PS.approveRun(AARAV, 2026, 10));
    if (!p.ok || !a.ok) console.log("setup (October):", errOf(p), errOf(a));
  }
  setNow(2026, 11, 20);
}
const approved = () => PS.storedRun(2026, 10)?.status === "approved";
const STRING = "A last working day is recorded only when someone is deactivated.";
const DEACT_FIRST = "Deactivate them from their profile, which asks for their last working day.";
const WITHOUT = (name) => `October 2026's payroll is already approved without ${name}; they can't be reactivated.`;
// Round 12U (fixture; was no joining date): with October approved, a new employee now needs a joining date after it.
const NEW = { name: "Neha Kapoor", email: "neha.kapoor@northwind.com", department: "ENG", designation: "Software Engineer", dateOfJoining: "3 Nov 2026" };
const byEmail = (email) => S.getAllUsers().find((u) => u.email === email) ?? null;

// The Add page as an Admin: the required fields filled, the box (if it's there) set, Save pressed.
async function addOnPage({ js = "./js", joining = "2026-11-03" /* Round 12U (fixture; was 2026-01-01) */, untick = true, who = ["admin", "Aarav Mehta", AARAV], email = NEW.email } = {}) {
  setSession(...who); await open("users/user-form", "", js);
  const f = (id) => d.getElementById(id);
  f("first-name").value = "Neha"; f("last-name").value = "Kapoor"; f("work-email").value = email;
  f("department").value = [...f("department").options].find((o) => o.value)?.value ?? "";
  f("designation").value = [...f("designation").options].find((o) => o.value)?.value ?? "";
  f("joining").value = joining;
  const box = f("account-active");
  const shown = { box: Boolean(box && !box.closest("[hidden]")), heading: [...d.querySelectorAll("h4.form-subtitle")].filter((h) => txt(h) === "Account" && !h.closest("[hidden]") && !h.hidden).length };
  if (box && untick) box.checked = false;
  d.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  const toast = txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
  runTimers();
  return { shown, toast, user: byEmail(email) };
}

// =================================================================
section("G. O12, reproduced");
october();
check("G0", "setup: October 2026 approved", approved());
const usersAt = mem.get("officeos:users"), nextAt = S.peekNextId();
const g1 = safe(() => S.addUser(AARAV, { ...NEW, role: "emp", status: "inactive", dateOfJoining: "1 Jan 2026" }));
check("G1", "the Add page's payload with the box unticked (status inactive, no last working day): refused with the existing string, on the status",
  errOf(g1) === STRING && g1.field === "status", j(g1));
check("G2", "nothing stored: the users unchanged, the next id not taken", mem.get("officeos:users") === usersAt && S.peekNextId() === nextAt && !byEmail(NEW.email));
october();   // its own storage (on pristine G1 stores the record)
const g3 = safe(() => OLDS.addUser(AARAV, { ...NEW, role: "emp", status: "inactive", dateOfJoining: "1 Jan 2026" }));
const g3r = g3.ok ? errOf(safe(() => OLDS.reactivateUser(AARAV, byEmail(NEW.email).id))) : null;
check("G3", "the code before took it: inactive with no last working day, and with October approved never reactivated (12F)",
  g3.ok && byEmail(NEW.email)?.status === "inactive" && !byEmail(NEW.email)?.dateOfLeaving && g3r === WITHOUT("Neha Kapoor"), j([errOf(g3), g3r]));

// =================================================================
section("F. The Add page");
october();
const f1 = await addOnPage();
check("F1", "October approved: the Add page shows no 'Account active' box and no 'Account' heading",
  f1.shown.box === false && f1.shown.heading === 0, j(f1.shown));
check("F2", "...and the new employee (joined 3 Nov 2026; Round 12U, was 1 Jan 2026; the hidden box unticked by script anyway) is saved active, with no last working day; the toast",
  f1.toast === "Employee saved." && f1.user?.status === "active" && !("dateOfLeaving" in (f1.user ?? {})), j([f1.toast, f1.user?.status]));
const f3 = f1.user ? errOf(safe(() => S.deactivateUser(PRIYA, f1.user.id, "2026-11-20"))) : "no user";
check("F3", "...and can leave the usual way: their profile's Deactivate with a last working day", f3 === "ok" && S.leavingDate(S.getUser(f1.user.id)) === "2026-11-20", f3);
october({ approve: false });
const f4 = await addOnPage({ joining: "2026-11-03" });
check("F4", "nothing approved: the same (no box, no heading; saved active)",
  !approved() && f4.shown.box === false && f4.shown.heading === 0 && f4.toast === "Employee saved." && f4.user?.status === "active", j([f4.shown, f4.toast, f4.user?.status]));
october({ approve: false });   // Round 12U (behavior; was October approved: a new employee with no joining date is now refused then, newhire B1 / F1)
const f5 = await addOnPage({ untick: false, joining: "" });
check("F5", "the box left as the HTML has it (ticked), no joining date, nothing approved: saved active, as before", f5.toast === "Employee saved." && f5.user?.status === "active", j([f5.toast, f5.user?.status]));
october();
const f6 = await addOnPage({ who: ["hr", "Priya Nair", PRIYA] });
check("F6", "as HR (Priya, users:create): the same", f6.shown.box === false && f6.toast === "Employee saved." && f6.user?.status === "active", j([f6.shown, f6.toast, f6.user?.status]));
// The code before, on the same page and storage.
october();
const f7 = await addOnPage({ js: "./js-pre12P", joining: "2026-01-01" });   // Round 12U (fixture: the old default, explicit)
const f7r = f7.user ? errOf(safe(() => S.reactivateUser(AARAV, f7.user.id))) : "no user";
check("F7", "the code before, October approved: the box showed; unticked, the new employee was saved inactive with no last working day, and Reactivate was refused for good",
  f7.shown.box === true && f7.shown.heading === 1 && f7.toast === "Employee saved." && f7.user?.status === "inactive" && !f7.user?.dateOfLeaving && f7r === WITHOUT("Neha Kapoor"), j([f7.shown, f7.user?.status, f7r]));
october({ approve: false });
const f8 = await addOnPage({ js: "./js-pre12P", joining: "2026-11-03" });
check("F8", "the code before, nothing approved: saved inactive too", f8.shown.box === true && f8.user?.status === "inactive", j([f8.shown, f8.user?.status]));

// =================================================================
section("E. The edit page is unchanged");
october();
setSession("admin", "Aarav Mehta", AARAV); await open("users/user-form", `?id=${VIKRAM}`);
const ebox = d.getElementById("account-active");
check("E1", "editing Vikram: the box and the 'Account' heading show, ticked",
  Boolean(ebox) && !ebox.closest("[hidden]") && ebox.checked === true && [...d.querySelectorAll("h4.form-subtitle")].some((h) => txt(h) === "Account" && !h.hidden), "");
const eAt = mem.get("officeos:users");
ebox.checked = false;
d.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const e2 = txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
check("E2", "unticked and saved: 11Y's refusal as a toast; nothing stored", e2 === DEACT_FIRST && mem.get("officeos:users") === eAt, e2);
october({ approve: false });
setSession("admin", "Aarav Mehta", AARAV); await open("users/user-form", `?id=${DIVYA}`);
const dbox = d.getElementById("account-active");
check("E3", "editing Divya (inactive): the box shows, unticked", Boolean(dbox) && !dbox.closest("[hidden]") && dbox.checked === false);
dbox.checked = true;
d.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const e4 = txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
check("E4", "ticked and saved (nothing approved): reactivated, as before", e4 === "Employee saved." && S.getUser(DIVYA).status === "active", e4);

// =================================================================
section("S. The store API");
const VARIANTS = [
  ["inactive, nothing else", { status: "inactive" }, "status"],
  ["inactive, left 6 Nov, joined 20 Nov (O12: left before joining)", { status: "inactive", dateOfLeaving: "2026-11-06", dateOfJoining: "20 Nov 2026" }, "dateOfLeaving"],
  ["inactive, left 30 Nov (later than today)", { status: "inactive", dateOfLeaving: "2026-11-30", dateOfJoining: "1 Nov 2026" }, "dateOfLeaving"],
  ["inactive, left 'banana'", { status: "inactive", dateOfLeaving: "banana" }, "dateOfLeaving"],
  ["inactive, left 15 Oct (inside approved October)", { status: "inactive", dateOfLeaving: "2026-10-15", dateOfJoining: "1 Jan 2024" }, "dateOfLeaving"],
  ["inactive, left 6 Nov as shown ('6 Nov 2026'), with a history", { status: "inactive", dateOfLeaving: "6 Nov 2026", leavingPeriods: [{ dateOfLeaving: "2 Nov 2026", reactivatedOn: "4 Nov 2026" }] }, "dateOfLeaving"],
  ["active, with a last working day", { status: "active", dateOfLeaving: "2026-11-06" }, "dateOfLeaving"],
  ["no status, with a last working day", { dateOfLeaving: "2026-11-06" }, "dateOfLeaving"],
  ["a last working day of null", { dateOfLeaving: null }, "dateOfLeaving"],
  ["a last working day of ''", { dateOfLeaving: "" }, "dateOfLeaving"],
];
october();
const sBad = [], sOld = [];
VARIANTS.forEach(([label, fields, field], i) => {
  const at = mem.get("officeos:users"), next = S.peekNextId();
  const r = safe(() => S.addUser(AARAV, { ...NEW, email: `s${i}@northwind.com`, ...fields }));
  if (errOf(r) !== STRING || r.field !== field || mem.get("officeos:users") !== at || S.peekNextId() !== next) sBad.push(`${label}: ${j(r)}`);
  const o = safe(() => OLDS.addUser(AARAV, { ...NEW, email: `o${i}@northwind.com`, ...fields }));
  if (o.ok) sOld.push(label);
});
check("S1", `${VARIANTS.length} payloads with status "inactive" or a last working day: each refused with the existing string (on the last working day when one is sent, else the status); nothing stored, no id taken`,
  sBad.length === 0, j(sBad.slice(0, 3)));
check("S2", "the code before stored every one of them", sOld.length === VARIANTS.length, j(sOld.length));
october();
const s3 = [safe(() => S.addUser(PRIYA, { ...NEW, status: "inactive" })), safe(() => S.addUser(PRIYA, { ...NEW, dateOfLeaving: "2026-11-06" }))];
check("S3", "the same as HR (users:create, not an Admin)", s3.every((r) => errOf(r) === STRING), j(s3.map(errOf)));

// =================================================================
section("A. What addUser still takes, as before");
october();
const snap = new Map(mem);
const restore = () => { mem.clear(); for (const [k, v] of snap) mem.set(k, v); };
const ALLOWED = [
  ["no status", {}],
  ["status active", { status: "active" }],
  ["status on-leave", { status: "on-leave" }],
  ["a history (dropped, 12H)", { leavingPeriods: [{ dateOfLeaving: "2 Nov 2026", reactivatedOn: "9 Nov 2026" }] }],
  ["an id (ignored)", { id: "EMP-9999" }],
  ["additional roles (dropped, 11R)", { extraRoles: ["hr"] }],
  // Round 12U (behavior): "a joining date inside approved October (12E E7.5)" left this list: 12U refuses it (newhire B1)
  ["a joining date of 3 Nov", { dateOfJoining: "3 Nov 2026" }],
];
const aBad = [];
for (const [label, fields] of ALLOWED) {
  restore(); const a = j(safe(() => S.addUser(AARAV, { ...NEW, ...fields }))); const aStore = mem.get("officeos:users");
  restore(); const b = j(safe(() => OLDS.addUser(AARAV, { ...NEW, ...fields }))); const bStore = mem.get("officeos:users");
  if (a !== b || aStore !== bStore || !JSON.parse(a).ok) aBad.push(`${label}: ${a} vs ${b}`);
}
restore();
check("A1", `${ALLOWED.length} payloads with no inactive status and no last working day: saved, the result and the stored users identical to the code before's`, aBad.length === 0, j(aBad.slice(0, 2)));
restore();
const a2 = safe(() => S.addUser(AARAV, { ...NEW, status: "on-leave" }));
check("A2", "status on-leave is still taken as given (the ruling names inactive and a last working day only)", a2.ok && byEmail(NEW.email)?.status === "on-leave", errOf(a2));

// =================================================================
section("O. Order");
october();
const o1 = errOf(safe(() => S.addUser(ARJUN, { ...NEW, status: "inactive" })));
check("O1", "an Employee (no users:create): \"You can't add employees.\" first, as before", o1 === "You can't add employees." && o1 === errOf(safe(() => OLDS.addUser(ARJUN, { ...NEW, status: "inactive" }))), o1);
const o2 = [errOf(safe(() => S.addUser(PRIYA, { ...NEW, role: "admin", status: "inactive" }))), errOf(safe(() => OLDS.addUser(PRIYA, { ...NEW, role: "admin" })))];
check("O2", "HR giving the Admin role: the Admin-only refusal first, as before", o2[0] === o2[1] && o2[0] !== STRING && !o2[0].startsWith("ok"), j(o2));
const o3 = [errOf(safe(() => S.addUser(AARAV, { ...NEW, name: "", status: "inactive" }))), errOf(safe(() => S.addUser(AARAV, { ...NEW, email: "aarav.mehta@northwind.com", dateOfLeaving: "2026-11-06" })))];
check("O3", "before the field checks (no name; an email in use): the last-working-day refusal answers", o3.every((x) => x === STRING), j(o3));
const o4 = [errOf(safe(() => S.addUser(AARAV, { ...NEW, name: "" }))), errOf(safe(() => OLDS.addUser(AARAV, { ...NEW, name: "" })))];
check("O4", "without it, the field checks as before (\"Name is required.\")", o4[0] === "Name is required." && o4[0] === o4[1], j(o4));

// =================================================================
section("I. No new record arrives inactive or with a last working day");
const STATUSES = [undefined, "active", "inactive", "on-leave"];
const LEAVINGS = [undefined, null, "", "2026-11-06", "6 Nov 2026", "2026-11-30", "banana"];
const JOINS = [undefined, "1 Jan 2024", "1 Jan 2026", "20 Nov 2026"];
function battery(mod) {
  const found = new Set();
  let n = 0;
  for (const status of STATUSES) for (const leaving of LEAVINGS) for (const joined of JOINS) {
    october({ approve: n % 2 === 0 });
    const seeded = new Set(S.getAllUsers().map((u) => u.id));
    const fields = { ...NEW, email: `i${n++}@northwind.com` };
    if (status !== undefined) fields.status = status;
    if (leaving !== undefined) fields.dateOfLeaving = leaving;
    if (joined !== undefined) fields.dateOfJoining = joined;
    safe(() => mod.addUser(AARAV, fields));
    for (const u of S.getAllUsers().filter((x) => !seeded.has(x.id))) {
      if (u.status === "inactive") found.add(`${status}/${leaving}/${joined}: inactive`);
      if ("dateOfLeaving" in u) found.add(`${status}/${leaving}/${joined}: dateOfLeaving ${u.dateOfLeaving}`);
    }
  }
  return [...found];
}
const iNew = battery(S), iOld = battery(OLDS);
check("I1", `addUser over ${STATUSES.length} x ${LEAVINGS.length} x ${JOINS.length} payloads (October approved and not): no new record is inactive or carries a last working day`, iNew.length === 0, j(iNew.slice(0, 4)));
check("I2", "the same battery on the code before makes some", iOld.length > 0 && iOld.some((x) => /inactive/.test(x)), j(iOld.length));

// =================================================================
section("P. The only page that adds anyone");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const callers = walk("./js").filter((p) => p !== "data/store.js" && /\baddUser\(/.test(srcAt("./js", p)));
check("P1", "addUser is called by one page script only: pages/user-form.js (the Add page)", j(callers) === j(["pages/user-form.js"]), j(callers));

// =================================================================
section("E9. What stays");
check("E9", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const jsNow = walk("./js-pre12Q"), jsPre = walk("./js-pre12P");   // Round 12Q (layout; was the live js): 12P's own change set (js-pre12Q = 5b0a57c)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12Q", p) !== srcAt("./js-pre12P", p));
check("X1", "exactly two js files changed, none added or removed: data/store.js and pages/user-form.js", j(changedJs) === j(["data/store.js", "pages/user-form.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed (user-form.html included)", j(pagesNow) === j(walk("./html-pre12P").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12P", p))
  && walk("./css-pre12P").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12P", p)));
const crlf = (s) => !s.endsWith("\n") && !/(^|[^\r])\n/.test(s);
const imports = (s) => j(s.match(/^import .*$/gm));
// Every message string in a file: double-quoted or template literals with a space and a capital first letter, one line
// each, outside // comment lines (this round's comments quote the box's label).
const code = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l)).join("\r\n");
const messages = (s) => [...new Set([...code(s).matchAll(/`[A-Z][^`\r\n]* [^`\r\n]*`|"[A-Z][^"\r\n]* [^"\r\n]*"/g)].map((m) => m[0]))].sort();
const store = [srcAt("./js-pre12Q", "data/store.js"), srcAt("./js-pre12P", "data/store.js")], form = [srcAt("./js-pre12Q", "pages/user-form.js"), srcAt("./js-pre12P", "pages/user-form.js")];   // Round 12Q (layout; was the live js)
check("X3", "both files CRLF with no final newline; no import changed; no message string added or changed in either",
  [...store, ...form].every(crlf) && imports(store[0]) === imports(store[1]) && imports(form[0]) === imports(form[1])
  && j(messages(store[0])) === j(messages(store[1])) && j(messages(form[0])) === j(messages(form[1])), j([messages(store[0]).filter((m) => !messages(store[1]).includes(m)), messages(form[0]).filter((m) => !messages(form[1]).includes(m))]));
const fn = (s, name) => s.slice(s.indexOf(`function ${name}(`), s.indexOf("\n}", s.indexOf(`function ${name}(`)) + 2);
const without = (s, part) => s.replace(part, "");
const block = (s, from, to) => s.slice(s.indexOf(from), s.indexOf(to, s.indexOf(from)));
const MODE = ["// ---------- mode ----------", "// ---------- save ----------"];
const editBranch = (s) => block(s, "} else if (editing) {", "} else {\r\n  field(\"emp-id\")");
check("X4", "store.js: only addUser changed; user-form.js: only buildRecord() and the Add branch of the mode block (the edit branch the same)",
  fn(store[0], "addUser").length > 200 && fn(store[0], "addUser") !== fn(store[1], "addUser") && without(store[0], fn(store[0], "addUser")) === without(store[1], fn(store[1], "addUser"))
  && fn(form[0], "buildRecord") !== fn(form[1], "buildRecord") && editBranch(form[0]).length > 500 && editBranch(form[0]) === editBranch(form[1])
  && without(without(form[0], fn(form[0], "buildRecord")), block(form[0], ...MODE)) === without(without(form[1], fn(form[1], "buildRecord")), block(form[1], ...MODE)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
