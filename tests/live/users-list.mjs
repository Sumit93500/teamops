// usage: node run.mjs A|B
//   A = HTML as it will be after the HTML round (search marked data-table-filter="off",
//       Export's data-not-implemented removed, users-list.js script tag added)
//   B = today's HTML with only the users-list.js script tag added
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const MODE = process.argv[2] ?? "A";
const APP = '<script type="module" src="../../assets/js/app.js"></script>';
let html = fs.readFileSync("__REPO__/pages/users/users-list.html", "utf8");
if (MODE !== "R") html = html.replace(APP, APP + '\r\n<script type="module" src="../../assets/js/pages/users-list.js"></script>');
if (MODE !== "B") {
  html = html.replace('class="input input--sm input--search"', 'class="input input--sm input--search" data-table-filter="off"');
  html = html.replace(' data-not-implemented="Export"', "");
}

const vc = new VirtualConsole();
vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) console.log("  [jsdomError]", e.message); });
const dom = new JSDOM(html, { url: "http://localhost/office-os/pages/users/users-list.html", virtualConsole: vc });
const { window } = dom;
Object.assign(globalThis, { window, document: window.document, localStorage: window.localStorage, Node: window.Node, HTMLElement: window.HTMLElement });
const d = window.document;

// Record 'input' listeners on the search box, to see who handles it.
const searchEl = d.querySelector(".input--search");
let searchListeners = 0;
const origAdd = window.EventTarget.prototype.addEventListener;
window.EventTarget.prototype.addEventListener = function (type, ...rest) {
  if (this === searchEl && type === "input") searchListeners++;
  return origAdd.call(this, type, ...rest);
};

// Capture the CSV blob instead of downloading it.
let lastBlob = null;
URL.createObjectURL = (blob) => { lastBlob = blob; return "blob:test"; };
URL.revokeObjectURL = () => {};

// Sign in as Admin (the session app.js's guard reads), then load the page the way the browser would.
const auth = await import("./js/core/auth.js");
auth.signIn("admin", "Aarav Mehta", "EMP-1001");
await import("./js/app.js");
await import("./js/pages/users-list.js");
const store = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = store.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs

let passed = 0, failed = 0;
const check = (n, name, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padStart(3)}. ${name}${detail ? `  -> ${detail}` : ""}`); };
const rows = () => [...d.querySelectorAll(".table tbody tr")].filter((r) => !r.hidden);
// Round 13Z (A11): the row's cells, past a checkbox cell if there is one (the checkboxes went; honest.mjs U)
const cellsOf = (r) => [...r.children].filter((c) => !c.classList.contains("table__check"));
const rowIds = () => rows().map((r) => cellsOf(r)[1]?.textContent).filter((t) => /^EMP-/.test(t ?? ""));
const pill = (label) => [...d.querySelectorAll(".tabs__tab")].find((p) => p.textContent.trim().startsWith(label));
const pillCount = (label) => pill(label).querySelector(".badge--count").textContent;
const type = (v) => { searchEl.value = v; searchEl.dispatchEvent(new window.Event("input", { bubbles: true })); };
const pag = d.querySelector(".pagination");
const all = store.getAllUsers();
const match = (u, q) => [u.name, u.email, u.id].some((v) => v.toLowerCase().includes(q));

console.log(`=== MODE ${MODE} ===`);
check(1, "tbody has 10 rows matching getAllUsers()", rows().length === 10 && rowIds().join() === all.map((u) => u.id).join(), `${rows().length} rows; ids ${rowIds().join(" ")}`);
check("1b", "row cells: name, email, id, designation, dept name, role label, status", (() => {
  const r = rows().find((x) => cellsOf(x)[1].textContent === "EMP-1023");
  return r && r.querySelector(".table__user-name").textContent === "Meera Joshi" && r.querySelector(".table__user-sub").textContent === "meera.joshi@northwind.com"
    && cellsOf(r)[2].textContent === "Accountant" && cellsOf(r)[3].textContent === "Finance" && cellsOf(r)[4].textContent === "Employee"
    && cellsOf(r)[5].querySelector(".badge").className === "badge badge--info badge--dot" && cellsOf(r)[5].textContent === "On leave"
    && r.querySelector(".avatar").className === "avatar avatar--1" && r.querySelector(".avatar").textContent === "MJ";
})(), "Meera: Accountant / Finance / Employee / On leave (badge--info), avatar--1 MJ");
check("1c", "subtitle uses real counts", d.querySelector(".page-header__subtitle").textContent === "10 employees across 6 departments", d.querySelector(".page-header__subtitle").textContent);
check("1d", "Department & Role selects filled from real data",
  [...d.querySelector('select[aria-label="Filter by department"]').options].map((o) => o.textContent).join("|") === "All departments|Engineering|Sales|Operations|Customer Support|Finance|Human Resources"
  && [...d.querySelector('select[aria-label="Filter by role"]').options].map((o) => `${o.value}=${o.textContent}`).join("|") === "=All roles|admin=Admin|hr=HR Manager|fin=Finance Manager|emp=Employee",
  "depts: " + [...d.querySelector('select[aria-label="Filter by department"]').options].map((o) => o.textContent).join(", "));

const exp = { All: all.length, Active: all.filter((u) => u.status === "active").length, "On leave": all.filter((u) => u.status === "on-leave").length, Inactive: all.filter((u) => u.status === "inactive").length };
check(2, "pill counts match store", Object.entries(exp).every(([k, v]) => pillCount(k) === String(v)), Object.keys(exp).map((k) => `${k}=${pillCount(k)} (expected ${exp[k]})`).join(", "));

pill("Active").click();
const activeIds = all.filter((u) => u.status === "active").map((u) => u.id);
check(3, "Active pill -> only active users; highlight moved once", rowIds().join() === activeIds.join() && pill("Active").classList.contains("is-active") && !pill("All").classList.contains("is-active") && pillCount("All") === "10",
  `${rows().length} rows (expected ${activeIds.length}); pill counts unchanged: All=${pillCount("All")}`);

pill("All").click(); type("Kabir");
check(4, "search 'Kabir' -> only Kabir's row", rowIds().join() === "EMP-1008", `rows: ${rowIds().join()}`);

pill("Active").click(); type("a");
const expected5 = all.filter((u) => u.status === "active" && match(u, "a")).map((u) => u.id);
check(5, "Active + search 'a' -> both filters apply", rowIds().join() === expected5.join() && !rowIds().includes("EMP-1023") && !rowIds().includes("EMP-1061"),
  `${rowIds().length} rows = expected ${expected5.length}; on-leave Meera & inactive Divya excluded`);

const dept = d.querySelector('select[aria-label="Filter by department"]'), role = d.querySelector('select[aria-label="Filter by role"]');
dept.value = "ENG"; dept.dispatchEvent(new window.Event("change"));
const expected5b = all.filter((u) => u.status === "active" && match(u, "a") && u.department === "ENG").map((u) => u.id);
check("5b", "Active + 'a' + department ENG (AND)", rowIds().join() === expected5b.join(), rowIds().join());
role.value = "hr"; role.dispatchEvent(new window.Event("change"));
check("5c", "+ role HR Manager -> nothing matches, empty-state row shown", rowIds().length === 0 && rows()[0]?.textContent === "No employees match these filters.", rows()[0]?.textContent);
role.value = ""; role.dispatchEvent(new window.Event("change")); dept.value = ""; dept.dispatchEvent(new window.Event("change")); type(""); pill("All").click();

check(6, "pagination hidden (is-empty) for 10 users", pag.classList.contains("is-empty") && pag.childNodes.length === 0, `class="${pag.className}"`);

for (let i = 1; i <= 20; i++) store.addUser(USER_ACTOR("admin", null), { name: `Test User ${i}`, email: `test${i}@example.com`, department: "OPS", designation: "Store Keeper", role: "emp", status: "active" });
pill("All").click();   // any control re-renders from the store
const nums = [...pag.querySelectorAll(".pagination__btn")].filter((b) => /^\d+$/.test(b.textContent)).map((b) => b.textContent);
const page1 = rowIds();
check(7, "30 users -> pagination shown with 3 pages, 10 rows on page 1", !pag.classList.contains("is-empty") && nums.join() === "1,2,3" && page1.length === 10 && pag.querySelector("span").textContent === "Showing 1 to 10 of 30",
  `pages [${nums}], "${pag.querySelector("span").textContent}"`);
[...pag.querySelectorAll(".pagination__btn")].find((b) => b.textContent === "Next").click();
const page2 = rowIds(), allNow = store.getAllUsers().map((u) => u.id);
check("7b", "Next -> rows 11-20, page 2 active", page2.join() === allNow.slice(10, 20).join() && pag.querySelector(".is-active").textContent === "2" && pag.querySelector("span").textContent === "Showing 11 to 20 of 30",
  `page 2 ids ${page2[0]}..${page2[9]}, "${pag.querySelector("span").textContent}"`);
type("Test User 1");   // matches 1, 10-19 -> 11 users
check("7c", "a filter change resets to page 1", pag.querySelector(".is-active")?.textContent === "1" && rowIds().length === 10, `"${pag.querySelector("span")?.textContent}"`);
type(""); store.resetDemoData(); pill("All").click();
check("7d", "test users removed again (resetDemoData in the test's own storage)", rows().length === 10 && pag.classList.contains("is-empty"));

// Export with a filter active: department Engineering.
dept.value = "ENG"; dept.dispatchEvent(new window.Event("change"));
const exportBtn = [...d.querySelectorAll(".page-header__actions button")].find((b) => b.textContent.trim() === "Export");
lastBlob = null; d.querySelectorAll(".toast").forEach((t) => t.remove());
exportBtn.click();
const bytes = lastBlob ? new Uint8Array(await lastBlob.arrayBuffer()) : new Uint8Array();
const hasBom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
const csv = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
const lines = csv.replace(/^\uFEFF/, "").split("\r\n");
const engIds = all.filter((u) => u.department === "ENG").map((u) => u.id);
check(8, "Export -> CSV of the filtered rows only, correct columns", !!lastBlob && lines[0] === "ID,Name,Email,Designation,Department,Role,Status"
  && lines.slice(1).map((l) => l.split(",")[0]).join() === engIds.join() && csv.startsWith("\uFEFF") && lines[1] === "EMP-1001,Aarav Mehta,aarav.mehta@northwind.com,Administrator,Engineering,Admin,Active",
  `${lines.length - 1} data rows (expected ${engIds.length}), type=${lastBlob?.type}, UTF-8 BOM bytes present: ${hasBom}`);
console.log("       CSV:\n" + lines.map((l) => "         " + l).join("\n"));
const toast = d.querySelector(".toast__text")?.textContent;
check("8b", MODE !== "B" ? "no placeholder toast (marker removed)" : "placeholder toast still fires (marker not yet removed)", MODE !== "B" ? !toast : !!toast, toast ?? "(no toast)");
dept.value = ""; dept.dispatchEvent(new window.Event("change"));

const bad9 = rows().filter((r) => { const a = r.querySelector(".table__actions a"); return a.getAttribute("href") !== `../users/user-form.html?id=${cellsOf(r)[1].textContent}` || !a.href.endsWith(`/pages/users/user-form.html?id=${cellsOf(r)[1].textContent}`) || a.hidden; });
check(9, "Edit links -> user-form.html?id=<that row's id>", bad9.length === 0, `e.g. ${rows()[6].querySelector(".table__actions a").getAttribute("href")} (resolves to ${rows()[6].querySelector(".table__actions a").href.replace("http://localhost/office-os/", "")})`);
const bad10 = rows().filter((r) => !r.querySelector("a.table__user-name").href.endsWith(`/pages/users/user-profile.html?id=${cellsOf(r)[1].textContent}`));
check(10, "names link to user-profile.html?id=<that row's id>", bad10.length === 0, `e.g. ${rows()[6].querySelector("a.table__user-name").getAttribute("href")}`);

check("S", MODE !== "B" ? "search box has ONE input listener (table-filter.js skipped it)" : "search box has TWO input listeners (table-filter.js + users-list.js)",
  searchListeners === (MODE !== "B" ? 1 : 2), `${searchListeners} listener(s)`);

// XSS guard: a name with markup is shown as text.
store.addUser(USER_ACTOR("admin", null), { name: "<img src=x onerror=alert(1)> Evil", email: "evil@example.com", department: "OPS" }); pill("All").click(); type("Evil");
check("X", "names are rendered as text, never as HTML", !d.querySelector(".table tbody img") && rows().some((r) => r.textContent.includes("<img src=x")));
store.resetDemoData();

// CSV escaping: a formula-looking name and a designation with a comma and quotes.
type("");
store.addUser(USER_ACTOR("admin", null), { name: '=HYPERLINK("x")', email: "f@example.com", department: "OPS", designation: 'Clerk, "Senior"' });
pill("All").click(); type("hyperlink");
exportBtn.click();
const injRow = new TextDecoder("utf-8", { ignoreBOM: true }).decode(new Uint8Array(await lastBlob.arrayBuffer())).split("\r\n")[1];
check("C", "CSV: formula-like value shown as text, commas/quotes escaped",
  injRow === `EMP-1106,"'=HYPERLINK(""x"")",f@example.com,"Clerk, ""Senior""",Operations,Employee,Active`, injRow);
store.resetDemoData();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
