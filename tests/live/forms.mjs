// usage: node forms.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round Forms (JS stage), in jsdom with the js in ./js:
//   P  user-profile.html: no id / ?id= / an unknown id say "Employee not found" in the page, with Back to users; a valid id draws the person
//   R  role-editor.html: no role / ?role= / an unknown role (wrong case included) say "Role not found", with All roles; a valid role draws it
//   F  user-form.html: an unknown ?id says "Employee not found" in the page (no toast, no leaving); no id is Add, a valid id is Edit, as before
//   Y  payroll-run.html: a ?month= that isn't a month says so (payslip-view.html's words), with Back to payroll run; none or a valid month as before
//   G  the changed-fields guard (ui/modal.js): a dialog someone typed in asks before its ✕, backdrop or Esc discard it; Cancel and submit don't;
//      nothing typed, no question; "no" leaves it open as it was (a page-built dialog's own ✕ handler doesn't run either)
//   T  the shared focus trap: focus into the dialog on open, Tab / Shift+Tab wrap inside it and come back from outside, back to the opener on
//      close; nothing while the approval card is open
//   W  scope and words (frozen js-preFM against js-pre14E2)    E99 no js errors
// The clock is local wall time (Mon 28 Sep 2026 10:00); storage is in memory, seeded when first read.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const read = (...p) => (fs.existsSync(path.join(...p)) ? fs.readFileSync(path.join(...p), "utf8") : "");
const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replaceAll("\\", "/")).sort() : []);

const RealDate = Date;
let NOW = new RealDate(2026, 8, 28, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const SESS = { admin: ["admin", "Aarav Mehta", "EMP-1001"], hr: ["hr", "Priya Nair", "EMP-1003"], fin: ["fin", "Kabir Shah", "EMP-1008"] };
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null, navigations = [], toastsAtLoad = [], answer = true, asked = [];
const allJsErrors = [];
async function open(page, query = "") {
  const vc = new VirtualConsole();
  timers = []; navigations = []; asked = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message.slice(0, 60)); else allJsErrors.push(`${page}${query}: ${e.message}`); });
  const html = read(DIR, `${page}.html`);
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = (text) => { asked.push(text); return answer; };
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`./js/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); }
  }
  toastsAtLoad = [...d.querySelectorAll(".toast__text")].map((t) => t.textContent.trim());
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} timer: ${e.message}`); } });
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const $ = (id) => d.getElementById(id);
const shown = (el) => Boolean(el) && !el.hidden && !el.closest("[hidden]");
// The page's "not found" block: [title, text, link text, link href (from pages/), shown]
const empty = () => { const e = [...d.querySelectorAll("main .empty")].find(shown); const a = e?.querySelector("a.btn"); return e ? [txt(e.querySelector(".empty__title")), txt(e.querySelector(".empty__text")), txt(a), a?.href.replace(/^.*\/pages\//, ""), e.querySelectorAll("*").length] : null; };
const frame = () => [d.title, txt(d.querySelector("main h1")), txt(d.querySelector('.breadcrumb__item[aria-current="page"]'))];
const fresh = (who) => { mem.clear(); setSession(...SESS[who]); };

// =================================================================
section("P. user-profile.html without a person to show (Aarav, Admin)");
const NOID = "This link doesn't name an employee.";
const unknownEmp = (id) => `There's no employee with ID ${id}. They may have been deleted, or the link is wrong.`;
fresh("admin"); await open("users/user-profile");
const p1 = [frame(), empty(), shown(d.querySelector(".page-header__actions")), shown(d.querySelector("main .grid-main-aside"))];
check("P1", "no id: 'Employee not found' and 'This link doesn't name an employee.' with Back to users, in the profile card; the heading kept, the actions and the tabs' content hidden (it showed Rohan, EMP-1042)",
  j(p1) === j([["Employee not found | OfficeOS", "Employee profile", "Not found"], ["Employee not found", NOID, "Back to users", "users/users-list.html", 3], false, false]) && !navigations.length, j(p1));
await open("users/user-profile", "?id=");
check("P2", "?id= (empty): the same", j(empty()) === j(["Employee not found", NOID, "Back to users", "users/users-list.html", 3]) && frame()[2] === "Not found", j(empty()));
await open("users/user-profile", "?id=EMP-9999");
check("P3", "an unknown id: the words it always had, now drawn by the shared block (the same markup: a title, a line, a button)", j(empty()) === j(["Employee not found", unknownEmp("EMP-9999"), "Back to users", "users/users-list.html", 3])
  && d.querySelector("main .empty").outerHTML === `<div class="empty"><h3 class="empty__title">Employee not found</h3><p class="empty__text">${unknownEmp("EMP-9999")}</p><a class="btn" href="${d.querySelector("main .empty a").getAttribute("href")}">Back to users</a></div>`, j(empty()));
await open("users/user-profile", "?id=EMP-1042");
check("P4", "a valid id: Rohan Gupta drawn as before, no message", j(frame()) === j(["Rohan Gupta | OfficeOS", "Employee profile", "Rohan Gupta"]) && empty() === null && shown(d.querySelector(".page-header__actions")), j(frame()));

// =================================================================
section("R. role-editor.html without a role to show (Aarav, Admin)");
const RNF = (text) => j([["Role not found | OfficeOS", "Role", "Not found"], ["Role not found", text, "All roles", "access/roles-list.html", 3]]);
fresh("admin"); await open("access/role-editor");
const r1 = [frame(), empty()];
check("R1", "no role: 'Role not found' and 'This link doesn't name a role.' with All roles; the heading 'Role' kept; no matrix, no alert (it showed HR Manager)",
  j(r1) === RNF("This link doesn't name a role.") && !d.querySelector("#matrix-rows") && !d.querySelector("main .alert") && d.querySelectorAll("main .stack > *").length === 1, j(r1));
await open("access/role-editor", "?role=");
check("R2", "?role= (empty): the same", j([frame(), empty()]) === RNF("This link doesn't name a role."), j([frame(), empty()]));
const r3 = [];
for (const k of ["boss", "HR", "toString"]) { await open("access/role-editor", `?role=${k}`); r3.push([k, j([frame(), empty()]) === RNF(`There's no role called "${k}". The link may be wrong.`)]); }
check("R3", "an unknown role, a wrong case ('HR') or an inherited name ('toString'): 'There's no role called \"…\". The link may be wrong.'", r3.every(([, ok]) => ok), j(r3));
await open("access/role-editor", "?role=fin");
check("R4", "a valid role (fin): Finance Manager drawn as before, its matrix and holders, no message", j(frame()) === j(["Finance Manager | OfficeOS", "Finance Manager", "Finance Manager"]) && d.querySelectorAll("#matrix-rows tr").length > 10 && empty() === null && txt($("role-key")) === "fin", j(frame()));

// =================================================================
section("F. user-form.html with an unknown id (Aarav, Admin)");
fresh("admin"); await open("users/user-form", "?id=EMP-9999");
const f1 = [frame(), empty(), shown(d.querySelector("main > .grid")), shown(d.querySelector(".page-header__subtitle")), toastsAtLoad, navigations.length, d.querySelectorAll("main form").length];
check("F1", "an unknown id: 'Employee not found' in the page with Back to users, the form hidden (still in the page), the heading 'Edit employee'; no toast and no leaving for the list (it toasted and left after 1.2 s)",
  j(f1) === j([["Employee not found | OfficeOS", "Edit employee", "Not found"], ["Employee not found", unknownEmp("EMP-9999"), "Back to users", "users/users-list.html", 3], false, false, [], 0, 1]), j(f1));
await open("users/user-form");
check("F2", "no id: Add employee as before, no message", j(frame()) === j(["Add employee | OfficeOS", "Add employee", "Add employee"]) && empty() === null && shown(d.querySelector("main form")), j(frame()));
await open("users/user-form", "?id=EMP-1042");
check("F3", "a valid id: Edit employee as before, the form filled, no message", j(frame()) === j(["Edit employee | OfficeOS", "Edit employee", "Edit employee"]) && $("emp-id").value === "EMP-1042" && empty() === null && shown(d.querySelector("main form")), j(frame()));

// =================================================================
section("Y. payroll-run.html with a month that isn't one (Kabir, Finance)");
const BAD = (m) => j([["Payroll run | OfficeOS", "Payroll run", ""], ["That isn't a month", `The link asks for "${m}". A month looks like 2026-09.`, "Back to payroll run", "payroll/payroll-run.html", 5], false, 0]);   // Round Small leftovers (behaviour: 5 elements, the asked month and 2026-09 kept whole; smallleft.mjs M1)
const y = [];
fresh("fin");
for (const m of ["abc", "2026-13", "2026-1", "2026-00"]) { await open("payroll/payroll-run", `?month=${encodeURIComponent(m)}`); y.push([m, j([frame(), empty(), shown(d.querySelector(".page-header__actions")), d.querySelectorAll("tbody tr").length]) === BAD(m)]); }
check("Y1", "abc, 2026-13, 2026-1, 2026-00: 'That isn't a month' (payslip-view.html's words) with Back to payroll run; no rows, Prepare and Approve hidden (it showed this month)", y.every(([, ok]) => ok), j(y));
await open("payroll/payroll-run");
const y2 = [frame()[0], empty(), d.querySelectorAll("tbody tr").length];
await open("payroll/payroll-run", "?month=");
const y3 = [frame()[0], empty()];
await open("payroll/payroll-run", "?month=2026-08");
const y4 = [frame()[0], empty(), d.querySelectorAll("tbody tr").length];
check("Y2", "no month and ?month= are this month (September), and 2026-08 is August, as before, no message", j([y2[0], y2[1], y3[0], y3[1], y4[0], y4[1]]) === j(["Payroll run, September 2026 | OfficeOS", null, "Payroll run, September 2026 | OfficeOS", null, "Payroll run, August 2026 | OfficeOS", null]) && y2[2] > 5 && y4[2] > 5, j([y2, y3, y4]));

// =================================================================
section("G. The changed-fields guard (departments.html's dialog, Aarav; salary-structure.html's page-built one, Kabir)");
const DISCARD = "Discard what you've entered?";
const isOpen = () => $("dept-modal").classList.contains("is-open");
const addBtn = () => [...d.querySelectorAll(".page-header__actions button")].find((b) => txt(b) === "Add department");
const typeIn = (input, v) => { input.value = v; input.dispatchEvent(new w.Event("input", { bubbles: true })); };
const esc = () => d.activeElement.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
fresh("admin"); await open("users/departments");
addBtn().focus(); addBtn().click();
const g1a = [isOpen(), d.activeElement?.id];
$("dept-modal").querySelector(".modal__close").click();
check("G1", "nothing typed: the ✕ closes at once, no question, focus back on Add department", g1a[0] && !isOpen() && asked.length === 0 && d.activeElement === addBtn(), j([g1a, asked]));
addBtn().click(); typeIn($("dept-name"), "Legal");
answer = false; $("dept-modal").querySelector(".modal__close").click();
const g2 = [isOpen(), $("dept-name").value, [...asked]];
answer = true; $("dept-modal").querySelector(".modal__close").click();
check("G2", "typed, then ✕: 'Discard what you've entered?'; no keeps it open with what was typed; yes closes", j(g2) === j([true, "Legal", [DISCARD]]) && !isOpen() && j(asked) === j([DISCARD, DISCARD]), j([g2, asked]));
addBtn().click(); typeIn($("dept-name"), "Legal"); asked = [];
answer = false; $("dept-modal").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const g3a = [isOpen(), asked.length];
$("dept-name").focus(); esc();
const g3b = [isOpen(), asked.length];
answer = true; esc();
check("G3", "the backdrop and Esc ask the same; no leaves it open; Esc then yes closes", j([g3a, g3b]) === j([[true, 1], [true, 2]]) && !isOpen() && asked.length === 3, j([g3a, g3b, asked.length]));
addBtn().click(); typeIn($("dept-name"), "Legal"); asked = [];
$("dept-modal").querySelector("[data-modal-close]").click();
check("G4", "Cancel (a deliberate choice) closes without asking, typed or not", !isOpen() && asked.length === 0, j(asked));
addBtn().click(); asked = [];
const g5 = $("dept-name").value === "" && $("dept-modal").dataset.changed === undefined;
$("dept-modal").querySelector(".modal__close").click();
check("G5", "reopened: the form empty again and nothing counts as typed; the ✕ closes without asking", g5 && !isOpen() && asked.length === 0, j([g5, asked]));
addBtn().click(); typeIn($("dept-name"), "Legal Affairs"); typeIn($("dept-code"), "LEG"); asked = [];
const before = d.querySelectorAll(".dept-grid .card, .dept-grid > *").length;
$("dept-modal").querySelector("form").dispatchEvent(new w.Event("submit", { cancelable: true, bubbles: true }));
check("G6", "typed and saved: the dialog closes with no question, and the department is added", !isOpen() && asked.length === 0 && /Legal Affairs/.test(txt(d.querySelector(".dept-grid"))), j([isOpen(), asked, before]));
fresh("fin"); await open("payroll/salary-structure");
const edit = () => d.querySelector('tr[data-user-id="EMP-1088"] .table__actions button[data-permission="salary:edit"]');
edit().click();
const sal = () => $("salary-modal");
typeIn($("salary-gross"), "70000"); asked = [];
answer = false; sal().querySelector(".modal__close").click();
const g7a = [Boolean(sal()), sal()?.classList.contains("is-open"), $("salary-gross")?.value, asked.length];
answer = true; sal()?.querySelector(".modal__close").click();
check("G7", "a page-built dialog (salary): no keeps it in the page, open, with what was typed (its own ✕ handler never ran); yes removes it",
  j(g7a) === j([true, true, "70000", 1]) && !sal() && asked.length === 2, j([g7a, Boolean(sal()), asked.length]));

// =================================================================
section("T. The shared focus trap");
fresh("admin"); await open("users/departments");
addBtn().focus(); addBtn().click();
const list = () => [...$("dept-modal").querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((n) => !n.closest("[hidden]"));
const tab = (shift = false) => { const e = new w.KeyboardEvent("keydown", { key: "Tab", shiftKey: shift, bubbles: true, cancelable: true }); (d.activeElement ?? d.body).dispatchEvent(e); return e.defaultPrevented; };
const t1 = [$("dept-modal").contains(d.activeElement), d.activeElement?.id];
check("T1", "on open, focus is inside the dialog (departments puts it on the name)", t1[0] && t1[1] === "dept-name", j(t1));
list().at(-1).focus(); const t2a = tab();
const t2 = [t2a, d.activeElement === list()[0]];
const t3a = tab(true);
check("T2", "Tab on the last control goes to the first; Shift+Tab on the first goes to the last (the browser's own move prevented)", j(t2) === j([true, true]) && t3a && d.activeElement === list().at(-1), j([t2, t3a, d.activeElement?.outerHTML.slice(0, 40)]));
list()[1].focus(); const mid = tab();
check("T3", "Tab in the middle is the browser's own (not prevented, focus not moved by the trap)", !mid && d.activeElement === list()[1], j([mid]));
addBtn().focus(); const outA = tab(); const outFirst = d.activeElement === list()[0];   // the page behind the dialog
addBtn().focus(); const outB = tab(true); const outLast = d.activeElement === list().at(-1);
check("T4", "focus outside the open dialog: Tab brings it to the first control, Shift+Tab to the last", outA && outFirst && outB && outLast, j([outA, outFirst, outB, outLast]));
$("dept-modal").querySelector("[data-modal-close]").click();
const after = d.activeElement === addBtn();
const t5 = tab();
check("T5", "closed: focus back on Add department, and Tab is the browser's own again", after && !t5 && !isOpen(), j([after, t5]));
fresh("admin"); await open("inventory/asset-assignment");
const M = await import("./js/ui/modal.js");
M.openModal("asset-modal");
check("T6", "a dialog its page doesn't focus (asset-assignment's Update): focus goes to its first field", $("asset-modal").contains(d.activeElement) && d.activeElement.matches("select, input, textarea"), d.activeElement?.id ?? d.activeElement?.tagName);
M.closeModal("asset-modal");
const fake = d.createElement("div"); fake.className = "modal approval-card is-open"; const fb = d.createElement("button"); fake.append(fb); d.body.append(fake);
M.openModal("asset-modal"); const inner = d.activeElement; fb.focus();
const t7 = tab();
check("T7", "while the approval card is open, the shared trap does nothing (the card keeps its own)", !t7 && d.activeElement === fb && inner !== fb, j([t7]));
fake.remove(); M.closeModal("asset-modal");

// =================================================================
section("W. Scope and words, from frozen copies");
const NOWJS = path.join(HERE, "js-preFM"), PREV = path.join(HERE, "js-pre14E2");
const a = walk(NOWJS), b = walk(PREV);
const FILES = ["pages/payroll-run.js", "pages/role-editor.js", "pages/user-form.js", "pages/user-profile.js", "ui/leave-view.js", "ui/modal.js"];
const changed = a.filter((f) => b.includes(f) && read(NOWJS, f) !== read(PREV, f));
check("W1", "against 14E part 2's js, exactly these six changed (approval-card.js, topbar.js and every other page not); no file added or removed", a.length === b.length && a.length > 90 && j(a) === j(b) && j(changed) === j(FILES), j({ files: a.length, changed }));
const literals = (s) => new Set((s.replace(/(^|\s)\/\/\s.*$/gm, "$1").match(/"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) ?? []));
const words = FILES.map((f) => { const x = literals(read(NOWJS, f)), y = literals(read(PREV, f)); return [f, [...x].filter((s) => !y.has(s)).sort(), [...y].filter((s) => !x.has(s)).sort()]; });
// Every new string literal, file by file: the messages (the NEW wording is "This link doesn't name an employee.", "Role not found", "Role not found |
// OfficeOS", "This link doesn't name a role.", "There's no role called …", "Discard what you've entered?"; the rest is reused), selectors and class names.
const NEW = {
  "pages/payroll-run.js": { add: ['".page-header__actions"', '"Back to payroll run"', '"That isn\'t a month"', '"card"', '"hidden"', '"main > .stack"', '"payroll-run.html"', '"section"', '`The link asks for "${askedMonth}". A month looks like 2026-09.`'], gone: [] },
  "pages/role-editor.js": { add: ['"All roles"', '"Not found"', '"Role not found | OfficeOS"', '"Role not found"', '"This link doesn\'t name a role."', '"access/roles-list.html"', '"card"', '"main > .stack"', '"section"', '`There\'s no role called "${asked}". The link may be wrong.`'], gone: ['"hr"'] },
  "pages/user-form.js": { add: ['"../ui/leave-view.js"', '".page-header__subtitle"', '"Back to users"', '"Employee not found | OfficeOS"', '"Not found"', '"card"', '"hidden"', '"main > .grid"', '"section"', '`There\'s no employee with ID ${editId}. They may have been deleted, or the link is wrong.`'], gone: [] },
  "pages/user-profile.js": { add: ['"This link doesn\'t name an employee."'], gone: ['"EMP-1042"', '"a"', '"empty"', '"empty__text"', '"empty__title"'] },
  "ui/leave-view.js": { add: ['"a"', '"btn"', '"empty"', '"empty__text"', '"empty__title"', '"h3"', '"p"'], gone: [] },
  "ui/modal.js": { add: ['".approval-card.is-open"', '"Discard what you\'ve entered?"', '"Tab"', '"[hidden]"', '"approval-card"', '"change"', '"input"', '"true"',
    `'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'`, `'input:not([type="hidden"]), select, textarea'`], gone: [] },
};
Object.values(NEW).forEach((x) => { x.add.sort(); x.gone.sort(); });
check("W2", "the new and removed string literals are exactly the listed ones (the new messages, selectors and class names; HR Manager's default and Rohan's id removed)",
  Object.keys(NEW).length === FILES.length && words.every(([f, add, gone]) => j(add) === j(NEW[f]?.add) && j(gone) === j(NEW[f]?.gone)), j(words.filter(([f, add, gone]) => j(add) !== j(NEW[f]?.add) || j(gone) !== j(NEW[f]?.gone))));

section("E. No js errors");
check("E99", "no js errors on any load", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));
console.log(`\n${passed} passed, ${failed} failed`);
