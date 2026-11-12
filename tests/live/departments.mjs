// usage: node departments.mjs
// Loads the LIVE project departments.html + js in jsdom. localStorage is carried
// from one page load to the next, the way it is between real pages.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const SP = "__SCRATCH__";
const REAL = "__REPO__/pages/users/";
const HTML = {
  "departments": fs.readFileSync(`${REAL}departments.html`, "utf8"),
  "users-list": fs.readFileSync(`${REAL}users-list.html`, "utf8"),
  "user-profile": fs.readFileSync(`${REAL}user-profile.html`, "utf8"),
};

let loads = 0, saved = {}, w = null, d = null;
const confirms = [];
let confirmAnswer = true;
const jsErrors = [];

async function open(page, query = "") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) jsErrors.push(e.message); });
  vc.on("error", (e) => jsErrors.push(String(e)));
  const dom = new JSDOM(HTML[page], { url: `http://localhost/office-os/pages/users/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.confirm = (msg) => { confirms.push(msg); return confirmAnswer; };
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, HTMLElement: w.HTMLElement });
  loads++;
  if (loads === 1) (await import("./js/core/auth.js")).signIn("admin", "Aarav Mehta", "EMP-1001");
  await import(`./js/app.js?load=${loads}`);
  await import(`./js/pages/${page}.js?load=${loads}`);
}

const store = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = store.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const DEPT_ACTOR = "EMP-1003";   // Round 10X (signature; was addDepartment(fields) / updateDepartment(code, changes)): the department writes take the acting person's id first and check their record (departments:create / :edit); every call here passes HR's (Priya). The guard itself: deptguard.mjs
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);

// page helpers
const cards = () => [...d.querySelectorAll(".dept-grid .dept")];
const card = (code) => cards().find((c) => c.querySelector(".dept__code").textContent === code);
const cardInfo = (c) => ({
  name: c.querySelector(".dept__name").textContent, code: c.querySelector(".dept__code").textContent,
  badge: `${c.querySelector(".dept__top > .badge").textContent}{${c.querySelector(".dept__top > .badge").className}}`,
  avatar: `${c.querySelector(".avatar").textContent}{${c.querySelector(".avatar").className}}`,
  head: c.querySelector(".dept__head span").textContent,
  employees: c.querySelectorAll(".dept__stat strong")[0].textContent, open: c.querySelectorAll(".dept__stat strong")[1].textContent,
  view: c.querySelector(".dept__foot a").getAttribute("href"),
});
const fmtCard = (i) => `${i.name} [${i.code}] ${i.badge} | head ${i.avatar} ${i.head} | emp ${i.employees}, open ${i.open} | ${i.view}`;
const stat = (label) => { const s = [...d.querySelectorAll(".stat")].find((x) => x.querySelector(".stat__label").textContent.trim() === label); return { value: s.querySelector(".stat__value").textContent, delta: s.querySelector(".stat__delta")?.textContent ?? null }; };
const fmtStats = () => ["Departments", "Employees", "Open positions", "Average team size"].map((l) => { const s = stat(l); return `${l}=${s.value}${s.delta !== null ? ` (${s.delta})` : ""}`; }).join(" | ");
const modal = () => d.getElementById("dept-modal");
const isOpen = () => modal().classList.contains("is-open");
const f = (id) => d.getElementById(id);
const addBtn = () => [...d.querySelectorAll(".page-header__actions button")].find((b) => b.textContent.trim() === "Add department");
const saveBtn = () => modal().querySelector('button[type="submit"]');
const toasts = () => [...d.querySelectorAll(".toast__text")].map((t) => t.textContent.trim());
const clearToasts = () => d.querySelectorAll(".toast").forEach((t) => t.remove());
const setVal = (id, v) => { f(id).value = v; f(id).dispatchEvent(new w.Event("input", { bubbles: true })); };
const blurCode = () => { f("dept-code").focus(); f("dept-head").focus(); };   // real focus move, so jsdom fires blur
const errorOf = (id) => { const e = f(id).closest(".form-field").querySelector(".form-error"); return e ? { text: e.textContent, linked: f(id).getAttribute("aria-describedby") === e.id } : null; };
const allErrors = () => [...modal().querySelectorAll(".form-error")].map((e) => e.textContent);
const headOptions = () => [...f("dept-head").options].map((o) => o.value);

// ================================================================
await open("departments");
const marker = w.__sameDocument = Symbol("no reload");
const docAtStart = d;

section("Initial render (seed data)");
console.log(cards().map((c) => "       " + fmtCard(cardInfo(c))).join("\n"));
console.log(`       stats: ${fmtStats()}`);
check("R1", "6 cards drawn from getAllDepartments(), in store order", cards().map((c) => cardInfo(c).code).join() === "ENG,SAL,OPS,SUP,FIN,HR");
const expectCounts = { ENG: "4", SAL: "1", OPS: "1", SUP: "0", FIN: "2", HR: "1" };
check("R2", "Employees per card = live headcount (inactive excluded, on-leave counted)", cards().every((c) => cardInfo(c).employees === expectCounts[cardInfo(c).code]), cards().map((c) => `${cardInfo(c).code}=${cardInfo(c).employees}`).join(" "));
check("R3", "avatars cycle avatar--1..4 with head initials", cards().map((c) => cardInfo(c).avatar).join() === "RD{avatar avatar--1},MA{avatar avatar--2},NR{avatar avatar--3},TS{avatar avatar--4},KS{avatar avatar--1},PN{avatar avatar--2}");
check("R4", "Open roles '—' on every card; Active badges", cards().every((c) => cardInfo(c).open === "—" && cardInfo(c).badge === "Active{badge badge--success badge--dot}"));
check("R5", "stat strip from real data, no fabricated numbers or deltas", fmtStats() === "Departments=6 (All have a head) | Employees=9 | Open positions=— | Average team size=1.5 (Largest is Engineering)", fmtStats());
check("R6", "'+12 this quarter' and 'Across 4 departments' are gone", !d.body.textContent.includes("+12 this quarter") && !d.body.textContent.includes("Across 4 departments"));
check("R7", "Edit buttons visible for Admin (departments:edit)", cards().every((c) => !c.querySelector(".dept__foot button").hidden));
check("R8", "modal closed on load; no JS errors", !isOpen() && jsErrors.length === 0, jsErrors.join(" / "));

// ================================================================
section("Test 1: Add a department, card appears with no reload");
clearToasts();
addBtn().click();
check("1a", "Add opens the modal in add mode", isOpen() && f("dept-modal-title").textContent === "Add department" && !f("dept-code").disabled && f("dept-name").value === "" && f("dept-code").value === "" && f("dept-active").checked && f("dept-head").value === "",
  `title="${f("dept-modal-title").textContent}", code disabled=${f("dept-code").disabled}, active=${f("dept-active").checked}`);
const activeNames = store.getAllUsers().filter((u) => u.status === "active").map((u) => u.name);
check("1b", "Head select = 'No head' + the 8 active employees (on-leave Meera and inactive Divya left out)", headOptions().join() === ["", ...activeNames].join(), [...f("dept-head").options].map((o) => o.textContent).join(", "));
setVal("dept-name", "Marketing"); setVal("dept-code", "MKT"); f("dept-head").value = "Ananya Iyer";
saveBtn().click();
const mkt = card("MKT");
check("1c", "Save -> modal closes, success toast, new card rendered", !isOpen() && toasts().join() === "Department added." && cards().length === 7 && !!mkt, `toasts=${JSON.stringify(toasts())}, cards=${cards().length}`);
console.log("       new card: " + fmtCard(cardInfo(mkt)));
check("1d", "new card content", cardInfo(mkt).name === "Marketing" && cardInfo(mkt).head === "Ananya Iyer" && cardInfo(mkt).avatar === "AI{avatar avatar--3}" && cardInfo(mkt).employees === "0" && cardInfo(mkt).badge.startsWith("Active") && cardInfo(mkt).view === "../users/users-list.html?dept=MKT");
check("1e", "stored: { name, head, active, code }", JSON.stringify(store.getDepartment("MKT")) === JSON.stringify({ head: "Ananya Iyer", active: true, name: "Marketing", code: "MKT" }), JSON.stringify(store.getDepartment("MKT")));
check("1f", "no reload: same document and window, stats updated", d === docAtStart && w.__sameDocument === marker && fmtStats().startsWith("Departments=7 (All have a head)") && stat("Average team size").value === "1.3", fmtStats());
check("1g", "Edit button on the new card works too (listener attached)", (() => { card("MKT").querySelector(".dept__foot button").click(); const ok = isOpen() && f("dept-name").value === "Marketing" && f("dept-code").disabled; modal().querySelector("[data-modal-close]").click(); return ok && !isOpen(); })());

// ================================================================
section("Test 2: Duplicate code -> inline error on Code");
clearToasts();
addBtn().click();
setVal("dept-name", "Engineering Two"); setVal("dept-code", "ENG");
saveBtn().click();
check("2a", "inline .form-error in the Code field, linked by aria-describedby", errorOf("dept-code")?.text === "Department code ENG is already in use." && errorOf("dept-code").linked, JSON.stringify(errorOf("dept-code")));
check("2b", "modal stays open, focus on Code, nothing saved, no toast, only one error", isOpen() && d.activeElement === f("dept-code") && cards().length === 7 && toasts().length === 0 && allErrors().length === 1 && store.getAllDepartments().length === 7);
setVal("dept-code", "EN");
check("2c", "typing in Code clears the error", allErrors().length === 0 && !f("dept-code").hasAttribute("aria-describedby"));
addBtn().click();
check("2d", "reopening the modal starts clean", isOpen() && f("dept-name").value === "" && f("dept-code").value === "" && allErrors().length === 0);
modal().querySelector(".modal__close").click();

// ================================================================
section("Test 3: Invalid codes");
addBtn().click();
setVal("dept-name", "Legal"); setVal("dept-code", "lgl"); blurCode();
check("3a", "lowercase 'lgl' becomes 'LGL' on blur", f("dept-code").value === "LGL", f("dept-code").value);
setVal("dept-code", "  ad "); blurCode();
check("3b", "'  ad ' becomes 'AD' on blur (trimmed too)", f("dept-code").value === "AD", JSON.stringify(f("dept-code").value));
setVal("dept-code", "legal"); blurCode();
check("3c", "'legal' -> 'LEGAL' on blur", f("dept-code").value === "LEGAL");
saveBtn().click();
check("3d", "too long -> inline error on Code, nothing saved", errorOf("dept-code")?.text === "Department code must be 2 to 4 capital letters, e.g. MKT." && isOpen() && store.getAllDepartments().length === 7, JSON.stringify(errorOf("dept-code")));
setVal("dept-code", "L"); saveBtn().click();
check("3e", "too short 'L' -> same inline error", errorOf("dept-code")?.text === "Department code must be 2 to 4 capital letters, e.g. MKT.");
setVal("dept-code", "L3G"); saveBtn().click();
check("3f", "digits 'L3G' -> same inline error", errorOf("dept-code")?.text === "Department code must be 2 to 4 capital letters, e.g. MKT.");
setVal("dept-code", "leg");   // Enter submits without a blur: still upper-cased before saving
saveBtn().click();
check("3g", "lowercase submitted without blur is upper-cased and saved as LEG", !isOpen() && !!card("LEG") && store.getDepartment("LEG")?.name === "Legal", card("LEG") ? fmtCard(cardInfo(card("LEG"))) : "no card");
addBtn().click();
setVal("dept-name", "   "); setVal("dept-code", "QA"); saveBtn().click();
check("3h", "whitespace-only name -> store's name error shown inline on Name (field: 'name')", errorOf("dept-name")?.text === "Department name is required." && errorOf("dept-name").linked && !errorOf("dept-code"), JSON.stringify(errorOf("dept-name")));
let submits = 0; modal().querySelector("form").addEventListener("submit", () => submits++);
setVal("dept-name", ""); saveBtn().click();
check("3i", "empty Name -> browser's required check blocks submit before the store", submits === 0 && isOpen() && store.getAllDepartments().length === 8);
modal().querySelector("[data-modal-close]").click();
check("3j", "Cancel closes and saves nothing", !isOpen() && store.getAllDepartments().length === 8 && !store.getDepartment("QA"));

// ================================================================
section("Test 4 + 5: Rename Engineering; non-employee head kept");
clearToasts();
card("ENG").querySelector(".dept__foot button").click();
check("5a", "Edit pre-fills; Code disabled; title 'Edit department'", isOpen() && f("dept-modal-title").textContent === "Edit department" && f("dept-name").value === "Engineering" && f("dept-code").value === "ENG" && f("dept-code").disabled && f("dept-active").checked);
check("5b", "head 'Rahul Deshmukh' (not an employee) is selected and listed once", f("dept-head").value === "Rahul Deshmukh" && headOptions().filter((v) => v === "Rahul Deshmukh").length === 1 && !activeNames.includes("Rahul Deshmukh"), `selected="${f("dept-head").value}", options: ${headOptions().slice(1).join(", ")}`);
setVal("dept-name", "Product Engineering");
saveBtn().click();
check("4a", "card updates in place, toast 'Department saved.'", !isOpen() && cardInfo(card("ENG")).name === "Product Engineering" && toasts().join() === "Department saved." && cards().length === 8 && d === docAtStart, fmtCard(cardInfo(card("ENG"))));
check("5c", "head not dropped: store and card still say Rahul Deshmukh", store.getDepartment("ENG").head === "Rahul Deshmukh" && cardInfo(card("ENG")).head === "Rahul Deshmukh", JSON.stringify(store.getDepartment("ENG")));
card("SAL").querySelector(".dept__foot button").click();
setVal("dept-name", "Sales & Partnerships"); saveBtn().click();
check("5d", "same for Sales: Meenal Arora kept after an edit", store.getDepartment("SAL").head === "Meenal Arora" && store.getDepartment("SAL").name === "Sales & Partnerships");
card("FIN").querySelector(".dept__foot button").click();
check("5e", "an employee head (Kabir Shah) is selected from the normal list, no duplicate", f("dept-head").value === "Kabir Shah" && headOptions().filter((v) => v === "Kabir Shah").length === 1);
f("dept-head").value = "Meera Joshi";
check("5f", "an on-leave employee isn't offered (not 'active')", f("dept-head").value !== "Meera Joshi");
f("dept-head").value = ""; saveBtn().click();
check("5g", "choosing 'No head' clears it; card shows 'No head assigned'; stat says '2 have no head' (LEG from test 3 + FIN)", store.getDepartment("FIN").head === "" && cardInfo(card("FIN")).head === "No head assigned" && cardInfo(card("FIN")).avatar.startsWith("?") && stat("Departments").delta === "2 have no head", `${fmtCard(cardInfo(card("FIN")))} | ${fmtStats()}`);
card("FIN").querySelector(".dept__foot button").click(); f("dept-head").value = "Kabir Shah"; saveBtn().click();   // put it back

await open("user-profile", "?id=EMP-1105");
const meta = d.querySelector(".profile__meta").textContent;
const deptRow = [...d.querySelectorAll(".kv__row")].find((r) => r.querySelector("dt").textContent.trim() === "Department")?.querySelector("dd")?.textContent.trim();
check("4b", "user-profile.html?id=EMP-1105 (Arjun, ENG) shows the new name", meta === "Software Engineer, Product Engineering" && (deptRow === undefined || deptRow === "Product Engineering"), `meta="${meta}", Department row=${JSON.stringify(deptRow)}`);
await open("user-profile", "?id=EMP-1017");
check("4c", "Ananya (SAL) profile shows 'Sales & Partnerships'", d.querySelector(".profile__meta").textContent === "Sales Executive, Sales & Partnerships", d.querySelector(".profile__meta").textContent);

// ================================================================
section("Test 6: Deactivate a department that has employees");
await open("departments");
clearToasts(); confirms.length = 0;
card("ENG").querySelector(".dept__foot button").click();
setVal("dept-name", "Should Not Save"); f("dept-active").checked = false;
confirmAnswer = false; saveBtn().click();
check("6a", "confirm() shows the real count", confirms.join() === "This department has 4 employees. Deactivate anyway?", JSON.stringify(confirms));
check("6b", "Cancel -> nothing saved (name and active unchanged), modal left open, no toast", JSON.stringify(store.getDepartment("ENG")) === JSON.stringify({ code: "ENG", name: "Product Engineering", head: "Rahul Deshmukh", active: true }) && isOpen() && toasts().length === 0 && cardInfo(card("ENG")).badge.startsWith("Active"), JSON.stringify(store.getDepartment("ENG")));
modal().querySelector("[data-modal-close]").click();
check("6c", "after closing, the card is unchanged", cardInfo(card("ENG")).name === "Product Engineering" && cardInfo(card("ENG")).badge === "Active{badge badge--success badge--dot}");
confirms.length = 0;
card("HR").querySelector(".dept__foot button").click(); f("dept-active").checked = false; saveBtn().click();
check("6d", "one employee -> singular wording", confirms.join() === "This department has 1 employee. Deactivate anyway?", JSON.stringify(confirms));
modal().querySelector("[data-modal-close]").click();
confirms.length = 0;
card("SUP").querySelector(".dept__foot button").click(); f("dept-active").checked = false; confirmAnswer = true; saveBtn().click();
check("6e", "no employees (SUP) -> no confirm, saves as Inactive", confirms.length === 0 && store.getDepartment("SUP").active === false && cardInfo(card("SUP")).badge === "Inactive{badge badge--dot}", cardInfo(card("SUP")).badge);
confirms.length = 0;
card("ENG").querySelector(".dept__foot button").click(); f("dept-active").checked = false; confirmAnswer = true; saveBtn().click();
check("6f", "OK in confirm() -> deactivated, badge Inactive, headcount unchanged", confirms.length === 1 && store.getDepartment("ENG").active === false && cardInfo(card("ENG")).badge === "Inactive{badge badge--dot}" && cardInfo(card("ENG")).employees === "4");
confirms.length = 0;
card("ENG").querySelector(".dept__foot button").click();
check("6g", "editing an inactive department: checkbox unchecked", f("dept-active").checked === false);
f("dept-active").checked = true; saveBtn().click();
check("6h", "reactivating asks nothing", confirms.length === 0 && store.getDepartment("ENG").active === true);
confirms.length = 0;
card("ENG").querySelector(".dept__foot button").click(); saveBtn().click();
check("6i", "saving an active department that stays active asks nothing", confirms.length === 0);

// ================================================================
section("Test 7: Headcounts exclude inactive employees, update after deactivation");
const hc = store.headcountByDepartment();
check("7a", "store.headcountByDepartment() counts live users, skips inactive", JSON.stringify(hc) === JSON.stringify({ ENG: 4, HR: 1, FIN: 2, SAL: 1, OPS: 1 }), JSON.stringify(hc));
const staticHc = (await import("./js/data/users.js")).headcountByDepartment();
check("7b", "users.js's headcountByDepartment() is untouched (fixed list, counts Divya)", staticHc.find((x) => x.code === "HR").count === 2 && Array.isArray(staticHc));
check("7c", "HR card shows 1 (Divya is inactive)", cardInfo(card("HR")).employees === "1");
store.deactivateUser(USER_ACTOR("admin", "EMP-1042"), "EMP-1042", LEAVING_11Y());               // Rohan, ENG
store.addUser(USER_ACTOR("admin", null), { name: "New Marketer", email: "nm@northwind.com", department: "MKT" });
store.reactivateUser(USER_ACTOR("admin", "EMP-1061"), "EMP-1061");               // Divya, HR
await open("departments");
console.log(`       after Rohan deactivated, Divya reactivated, one MKT hire: ${cards().map((c) => `${cardInfo(c).code}=${cardInfo(c).employees}`).join(" ")}`);
console.log(`       stats: ${fmtStats()}`);
check("7d", "ENG 4 -> 3, HR 1 -> 2, MKT 0 -> 1", cardInfo(card("ENG")).employees === "3" && cardInfo(card("HR")).employees === "2" && cardInfo(card("MKT")).employees === "1");
check("7e", "Employees stat = active + on-leave only", stat("Employees").value === String(store.getAllUsers().filter((u) => u.status !== "inactive").length) && stat("Employees").value === "10", stat("Employees").value);
store.deactivateUser(USER_ACTOR("admin", "EMP-1017"), "EMP-1017", LEAVING_11Y());   // Ananya, SAL; re-render via any save on the page
card("OPS").querySelector(".dept__foot button").click(); saveBtn().click();
check("7f", "after an in-page save, the re-render picks up the change too (SAL 1 -> 0)", cardInfo(card("SAL")).employees === "0" && stat("Employees").value === "9");

// ================================================================
section("Test 8: View people -> users-list pre-filtered");
const viewHref = card("FIN").querySelector(".dept__foot a").href;
check("8a", "View people resolves to users-list.html?dept=FIN", viewHref === "http://localhost/office-os/pages/users/users-list.html?dept=FIN", viewHref);
await open("users-list", "?dept=FIN");
const sel = d.querySelector('select[aria-label="Filter by department"]');
const ids = () => [...d.querySelectorAll(".table tbody tr")].map((r) => [...r.children].filter((c) => !c.classList.contains("table__check"))[1]?.textContent)   // Round 13Z (A11): past a checkbox cell if there is one
  .filter((t) => /^EMP-/.test(t ?? ""));
check("8b", "select pre-set to FIN; table shows only FIN people", sel.value === "FIN" && ids().join() === "EMP-1008,EMP-1023", `select=${sel.value} (${sel.selectedOptions[0].textContent}), rows=${ids().join()}`);
sel.value = ""; sel.dispatchEvent(new w.Event("change"));
check("8c", "the filter can still be cleared by the user", ids().length === 10, `${ids().length} rows`);
await open("users-list", "?dept=MKT");
check("8d", "a department added on the Departments page works too (MKT)", d.querySelector('select[aria-label="Filter by department"]').value === "MKT" && ids().length === 1);
await open("users-list", "?dept=ZZZ");
check("8e", "unknown code is ignored: 'All departments', every row", d.querySelector('select[aria-label="Filter by department"]').value === "" && ids().length === 10);
await open("users-list", "?dept=eng");
check("8f", "codes are case-sensitive: 'eng' is ignored, not half-applied", d.querySelector('select[aria-label="Filter by department"]').value === "" && ids().length === 10);
await open("users-list", "");
check("8g", "no ?dept: unchanged behaviour", d.querySelector('select[aria-label="Filter by department"]').value === "" && ids().length === 10);

// ================================================================
section("Tests 9 + 10: alert text, no placeholder toasts");
await open("departments");
const alert = d.querySelector(".alert").textContent;
check(9, "reworded alert", alert === "Editing a department's head does not currently change any approval chains." && !d.body.textContent.includes("updates the approval chain"), alert);
clearToasts();
addBtn().click(); modal().querySelector("[data-modal-close]").click();
cards().forEach((c) => { c.querySelector(".dept__foot button").click(); modal().querySelector("[data-modal-close]").click(); });
check("10a", "clicking Add and every Edit shows no toast at all", toasts().length === 0, JSON.stringify(toasts()));
check("10b", "no data-not-implemented on Add, Edit or Save", !addBtn().hasAttribute("data-not-implemented") && cards().every((c) => !c.querySelector("[data-not-implemented]")) && !modal().querySelector("[data-not-implemented]"));

// ================================================================
section("Extra: safety");
addBtn().click();
setVal("dept-name", '<img src=x onerror="window.__xss=1"> Ops'); setVal("dept-code", "XSS"); f("dept-head").value = ""; saveBtn().click();
check("X1", "names render as text, never as HTML; toast doesn't echo the name", !d.querySelector(".dept-grid img") && cardInfo(card("XSS")).name.startsWith("<img") && !w.__xss && toasts().at(-1) === "Department added.");
check("X2", "store.updateDepartment still refuses a code change", store.updateDepartment(DEPT_ACTOR, "ENG", { code: "ENX" }).ok === false);
const r1 = store.addDepartment(DEPT_ACTOR, { code: "mk", name: "x" }), r2 = store.addDepartment(DEPT_ACTOR, { code: "ENG", name: "x" }), r3 = store.addDepartment(DEPT_ACTOR, { code: "ZZ", name: " " }), r4 = store.addUser(USER_ACTOR("admin", null), { name: "a", email: "aarav.mehta@northwind.com" });
check("X3", "field tags: code/code/name; addUser's email tag unchanged", r1.field === "code" && r2.field === "code" && r3.field === "name" && r4.field === "email", [r1, r2, r3, r4].map((r) => `${r.field}: ${r.error}`).join(" | "));
check("X4", "no uncaught JS errors across all page loads", jsErrors.length === 0, jsErrors.join(" / ") || "none");

// ================================================================
// Round 10J: an edit can't leave a department without a name (10I, G2: updateDepartment saved a whitespace-only name as
// "", because the page's `required` is satisfied by spaces and only addDepartment checked). ./js-pre10J, ./html-pre10J
// and ./css-pre10J are the code, pages and css before this round (office-os 23d34bc).
section("Round 10J: a name on edit, too");
const NAME_MSG = "Department name is required.";
const J = (r) => (r.ok ? [true] : [false, r.error, r.field ?? null]);
const freshDepts = () => { localStorage.removeItem("officeos:departments"); };   // just the departments: the next read re-seeds them
const deptsRaw = () => localStorage.getItem("officeos:departments");
freshDepts();
const before10j = JSON.stringify(store.getDepartment("ENG"));
const j1 = store.updateDepartment(DEPT_ACTOR, "ENG", { name: "   " });
check("J1", "store: an edit to a whitespace-only name is refused with add's message, at the Name field; ENG is untouched",
  JSON.stringify(J(j1)) === JSON.stringify([false, NAME_MSG, "name"]) && JSON.stringify(store.getDepartment("ENG")) === before10j, JSON.stringify(J(j1)));
const blanks = [" ", "  ", "", "\t\n ", undefined, null];
const j2 = blanks.map((name) => J(store.updateDepartment(DEPT_ACTOR, "ENG", { name })));
check("J2", "the boundary, empty after trimming: one space, two spaces, nothing, a tab and newline, undefined, null: all refused, the same way",
  j2.every((r) => JSON.stringify(r) === JSON.stringify([false, NAME_MSG, "name"])) && JSON.stringify(store.getDepartment("ENG")) === before10j, JSON.stringify(j2.map((r) => r[0])));
const raw0 = deptsRaw();
const j3a = store.updateDepartment(DEPT_ACTOR, "ENG", { name: " a " }), j3b = store.updateDepartment(DEPT_ACTOR, "SAL", { name: "x" });
check("J3", "…and not empty after trimming is fine: ' a ' (stored as given, as add stores it) and a one-letter name",
  j3a.ok && store.getDepartment("ENG").name === " a " && j3b.ok && store.getDepartment("SAL").name === "x" && raw0 !== deptsRaw(), JSON.stringify([J(j3a), J(j3b)]));
freshDepts();
const j4 = [store.updateDepartment(DEPT_ACTOR, "ENG", { active: false }), store.updateDepartment(DEPT_ACTOR, "SAL", { head: "" }), store.updateDepartment(DEPT_ACTOR, "OPS", {})].map(J);
check("J4", "a change that leaves the name out isn't asked for one: only active, only head, nothing (the other fields are untouched by the rule)",
  j4.every((r) => r[0] === true) && store.getDepartment("ENG").active === false && store.getDepartment("ENG").name === "Engineering" && store.getDepartment("SAL").head === "" && store.getDepartment("SAL").name === "Sales",
  JSON.stringify(j4));
freshDepts();
const j5 = [store.updateDepartment(DEPT_ACTOR, "ENG", { code: "ENX", name: " " }), store.updateDepartment(DEPT_ACTOR, "NOPE", { name: " " })].map(J);
check("J5", "the earlier refusals still come first: a code change (with a blank name too) and an unknown code",
  JSON.stringify(j5) === JSON.stringify([[false, "A department's code can't be changed, because employees are linked to it.", null], [false, "No department with code NOPE.", null]]), JSON.stringify(j5));
const raw1 = deptsRaw();
store.updateDepartment(DEPT_ACTOR, "FIN", { name: "  ", head: "Somebody Else", active: false });
check("J6", "a refused edit saves none of it: the head and active sent with the blank name are dropped too; stored data byte-identical", deptsRaw() === raw1 && store.getDepartment("FIN").head === "Kabir Shah" && store.getDepartment("FIN").active === true);
const j7 = [store.addDepartment(DEPT_ACTOR, { code: "QA", name: "  " }), store.addDepartment(DEPT_ACTOR, { code: "q", name: "  " }), store.addDepartment(DEPT_ACTOR, { code: "QA", name: " Quality " })].map(J);
check("J7", "add is unchanged: a blank name refused (same message and field), the code checked first, and a real name added (stored as given)",
  JSON.stringify(j7.slice(0, 2)) === JSON.stringify([[false, NAME_MSG, "name"], [false, "Department code must be 2 to 4 capital letters, e.g. MKT.", "code"]]) && j7[2][0] === true && store.getDepartment("QA").name === " Quality ",
  JSON.stringify(j7));
freshDepts();
const reqAdd = store.addDepartment(DEPT_ACTOR, { code: "ZZ", name: "" }), reqEdit = store.updateDepartment(DEPT_ACTOR, "ENG", { name: "" });
check("J8", "add and edit refuse with exactly the same result (one message, one field)", JSON.stringify(J(reqAdd)) === JSON.stringify(J(reqEdit)));

// The page: departments.html's edit form.
freshDepts();
await open("departments");
const salBefore = JSON.stringify(store.getDepartment("SAL"));
const salCard = () => card("SAL");
clearToasts();
salCard().querySelector(".dept__foot button").click();
setVal("dept-name", "   ");
const nativeOk = modal().querySelector("form").checkValidity();
saveBtn().click();
check("J9", "the edit form: Sales renamed to '   ' (the browser's required accepts it) gets the store's message inline at Name, linked; the modal stays open; nothing saved; no toast; the card unchanged",
  nativeOk && JSON.stringify(errorOf("dept-name")) === JSON.stringify({ text: NAME_MSG, linked: true }) && isOpen() && JSON.stringify(store.getDepartment("SAL")) === salBefore
  && toasts().length === 0 && cardInfo(salCard()).name === "Sales" && d.activeElement === f("dept-name"), JSON.stringify([nativeOk, errorOf("dept-name"), toasts()]));
setVal("dept-name", " ");
check("J10", "typing clears the error (one space now: still refused on the next save)", allErrors().length === 0 && (saveBtn().click(), errorOf("dept-name")?.text === NAME_MSG), JSON.stringify(errorOf("dept-name")));
setVal("dept-name", "Sales & Growth");
saveBtn().click();
check("J11", "a real name: saved (the page trims it), the toast, the card renamed; head and active as they were",
  !isOpen() && toasts().at(-1) === "Department saved." && store.getDepartment("SAL").name === "Sales & Growth" && store.getDepartment("SAL").head === "Meenal Arora" && store.getDepartment("SAL").active === true
  && cardInfo(salCard()).name === "Sales & Growth", JSON.stringify([toasts(), store.getDepartment("SAL")]));
card("FIN").querySelector(".dept__foot button").click();
f("dept-head").value = ""; f("dept-active").checked = false;
saveBtn().click();
check("J12", "an edit that keeps the name but changes head and active saves as before (FIN: no head, inactive)",
  !isOpen() && store.getDepartment("FIN").name === "Finance" && store.getDepartment("FIN").head === "" && store.getDepartment("FIN").active === false, JSON.stringify(store.getDepartment("FIN")));

// Scope: exactly 10J's lines.
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const walkJ = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkJ(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRCJ = (dir, f2) => fs.readFileSync(`${HERE}${dir}/${f2}`, "utf8");
// Round 10O (layout; was the live js vs js-pre10J, here and in JX1 / JX3 / JX4): 10J's own change set, read from its frozen
// result (js-pre10O = HEAD 81e43ee); the live js has 10O's lines since (holileave.mjs X1 / X4)
const changedJsJ = walkJ(`${HERE}js-pre10O`).filter((f2) => SRCJ("js-pre10O", f2) !== SRCJ("js-pre10J", f2)).sort();
// Round 11B (layout; was the real office-os pages, `${REAL}..`): 10J's page claim, read from this round's frozen result
// (html-pre11B = HEAD 97e1e6c); the real pages have 11B's sessions.html banner since (acctpages.mjs X2)
const PAGES = `${HERE}html-pre11B`;
const changedHtmlJ = walkJ(PAGES).filter((f2) => fs.readFileSync(`${PAGES}/${f2}`, "utf8") !== fs.readFileSync(`${HERE}html-pre10J/${f2}`, "utf8"));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSSJ = `${HERE}css-pre13U`;
const changedCssJ = walkJ(CSSJ).filter((f2) => fs.readFileSync(`${CSSJ}/${f2}`, "utf8") !== SRCJ("css-pre10J", f2));
check("JX1", "js changed: exactly data/store.js; nothing added or removed", JSON.stringify(changedJsJ) === JSON.stringify(["data/store.js"]) && JSON.stringify(walkJ(`${HERE}js-pre10O`).sort()) === JSON.stringify(walkJ(`${HERE}js-pre10J`).sort()), JSON.stringify(changedJsJ));
check("JX2", "no page and no css changed (the live pages this suite loads); nothing added or removed", changedHtmlJ.length === 0 && changedCssJ.length === 0 && JSON.stringify(walkJ(PAGES).sort()) === JSON.stringify(walkJ(`${HERE}html-pre10J`).sort()), JSON.stringify([changedHtmlJ, changedCssJ]));
check("JX3", "store.js is CRLF only, with no final newline", changedJsJ.map((f2) => SRCJ("js-pre10O", f2)).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
const countJ = (s) => s.split("\r\n").reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
const deltaJ = (() => {
  const a = countJ(SRCJ("js-pre10J", "data/store.js")), b = countJ(SRCJ("js-pre10O", "data/store.js"));
  return { removed: [...a].flatMap(([l, n]) => Array(Math.max(0, n - (b.get(l) ?? 0))).fill(l)).sort(), added: [...b].reduce((t, [l, n]) => t + Math.max(0, n - (a.get(l) ?? 0)), 0) };
})();
check("JX4", "…and within it, only 10J's lines (add's old check out; the shared check, its two uses and a blank line in: 6)",
  JSON.stringify(deltaJ) === JSON.stringify({ removed: ['  if (!String(fields.name ?? "").trim()) return fail("Department name is required.", "name");'], added: 6 }), JSON.stringify(deltaJ));
check("JX5", "no uncaught JS errors in this section's page loads either", jsErrors.length === 0, jsErrors.join(" / ") || "none");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
