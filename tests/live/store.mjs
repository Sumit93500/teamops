import { createRequire } from "module";
const { JSDOM } = createRequire(import.meta.url)("../node_modules/jsdom");

const dom = new JSDOM("<!DOCTYPE html><body><div class='pagination' id='p'></div></body>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;

let passed = 0, failed = 0;
function check(n, name, cond, detail = "") {
  cond ? passed++ : failed++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padStart(2)}. ${name}${detail ? `  -> ${detail}` : ""}`);
}

// The same module instance of users.js that store.js imports, plus a snapshot taken before anything runs.
const usersModule = await import("./js/data/users.js");
const snapshot = JSON.stringify({ U: usersModule.USERS, D: usersModule.DEPARTMENTS, P: usersModule.PROFILE_DETAILS });
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const DEPT_ACTOR = "EMP-1003";   // Round 10X (signature; was addDepartment(fields) / updateDepartment(code, changes)): the department writes take the acting person's id first and check their record (departments:create / :edit); every call here passes HR's (Priya). The guard itself: deptguard.mjs

console.log("=== STORE ===");
const first = S.getAllUsers();
const rohan0 = first.find((u) => u.id === "EMP-1042");
check(1, "getAllUsers() seeds 10 users on first call", first.length === 10 && !!localStorage.getItem("officeos:users"),
  `${first.length} users; saved box version=${JSON.parse(localStorage.getItem("officeos:users")).version}, nextIdNum=${JSON.parse(localStorage.getItem("officeos:users")).nextIdNum}`);

// Prove the second call reads the saved copy rather than re-seeding: tag the stored box and see the tag survive.
const raw = JSON.parse(localStorage.getItem("officeos:users")); raw.records[0].__marker = "from-storage"; localStorage.setItem("officeos:users", JSON.stringify(raw));
const second = S.getAllUsers();
check(2, "second call returns the same 10 ids, read from storage (not re-seeded)",
  second.length === 10 && second.map((u) => u.id).join() === first.map((u) => u.id).join() && second[0].__marker === "from-storage",
  `ids equal: ${second.map((u) => u.id).join() === first.map((u) => u.id).join()}, storage marker survived: ${second[0].__marker === "from-storage"}`);
delete raw.records[0].__marker; localStorage.setItem("officeos:users", JSON.stringify(raw));

check("1b", "seed merged PROFILE_DETAILS + demo PII", rohan0.bankAccountLast4 === "7305" && rohan0.pan === "GJZPG4172K" && S.getUser("EMP-1105").phone === "+91 98765 43210" && S.getUser("EMP-1105").pan.endsWith("3421F"),
  `Rohan bank=${rohan0.bankAccountLast4} pan=${rohan0.pan}; Arjun phone=${S.getUser("EMP-1105").phone} pan=${S.getUser("EMP-1105").pan}`);
const mgr = (id) => S.getUser(id).reportingManager;
check("1d", "MANAGER_OF merged: Rohan -> Sneha Rao, Meera -> Kabir Shah",
  mgr("EMP-1042") === "Sneha Rao" && mgr("EMP-1023") === "Kabir Shah",
  `Rohan=${mgr("EMP-1042")}, Meera=${mgr("EMP-1023")}`);
check("1e", "PROFILE_DETAILS still wins; no manager where none is known",
  mgr("EMP-1105") === "Sneha Rao" && mgr("EMP-1001") === "Rahul Deshmukh" && mgr("EMP-1003") === "Aarav Mehta"
  && mgr("EMP-1088") === undefined && mgr("EMP-1017") === undefined,
  `Arjun=${mgr("EMP-1105")}, Aarav=${mgr("EMP-1001")}, Priya=${mgr("EMP-1003")}, Vikram (MANAGER_OF null)=${mgr("EMP-1088")}, Ananya (not listed)=${mgr("EMP-1017")}`);
check("1f", "full demo bank account seeded, ending in bankAccountLast4", S.getAllUsers().every((u) => u.bankAccount && u.bankAccount.length === 12 && u.bankAccount.endsWith(u.bankAccountLast4)), `Rohan ${S.getUser("EMP-1042").bankAccount}`);
check("1c", "peekNextId() doesn't increment", S.peekNextId() === "EMP-1106" && S.peekNextId() === "EMP-1106", S.peekNextId());

const added = S.addUser(USER_ACTOR("admin", null), { id: "EMP-9999", name: "Test Person", email: "test.person@northwind.com", department: "SAL", designation: "Sales Executive" });
check(3, "addUser() assigns EMP-1106 (ignores a supplied id); count becomes 11",
  added.ok && added.record.id === "EMP-1106" && S.getAllUsers().length === 11 && S.peekNextId() === "EMP-1107",
  `ok=${added.ok} id=${added.record?.id} count=${S.getAllUsers().length} next=${S.peekNextId()}`);
const dup = S.addUser(USER_ACTOR("admin", null), { name: "Dup", email: "ROHAN.GUPTA@northwind.com" });
check("3b", "addUser() rejects a duplicate email (case-insensitive)", !dup.ok, dup.error);

const upd = S.updateUser(USER_ACTOR("admin", "EMP-1042"), "EMP-1042", { phone: "+91 90000 00001", designation: "Team Lead" });
check(4, "updateUser() changes fields; getUser() reflects it", upd.ok && S.getUser("EMP-1042").phone === "+91 90000 00001" && S.getUser("EMP-1042").designation === "Team Lead",
  `phone=${S.getUser("EMP-1042").phone}, designation=${S.getUser("EMP-1042").designation}`);
const idChange = S.updateUser(USER_ACTOR("admin", "EMP-1042"), "EMP-1042", { id: "EMP-2000" });
check("4b", "updateUser() refuses to change the id", !idChange.ok && !!S.getUser("EMP-1042") && !S.getUser("EMP-2000"), idChange.error);

const r5 = S.deactivateUser(USER_ACTOR("admin", "EMP-1001"), "EMP-1001", LEAVING_11Y());
check(5, "deactivateUser('EMP-1001') refused", !r5.ok && S.getUser("EMP-1001").status === "active", r5.error);
const r5b = S.deleteUser(USER_ACTOR("admin", "EMP-1003"), "EMP-1003");
check("5b", "deleteUser('EMP-1003') refused", !r5b.ok && !!S.getUser("EMP-1003"), r5b.error);

const r6 = S.deactivateUser(USER_ACTOR("admin", "EMP-1042"), "EMP-1042", LEAVING_11Y());
check(6, "deactivateUser('EMP-1042') succeeds, status 'inactive'", r6.ok && S.getUser("EMP-1042").status === "inactive", `status=${S.getUser("EMP-1042").status}`);

const r7 = S.addDepartment(DEPT_ACTOR, { code: "MKT", name: "Marketing", head: "Ananya Iyer" });
const r7dup = S.addDepartment(DEPT_ACTOR, { code: "ENG", name: "Engineering again" });
const r7bad = S.addDepartment(DEPT_ACTOR, { code: "mk1", name: "Bad" });
check(7, "addDepartment('MKT') ok; duplicate 'ENG' rejected", r7.ok && S.getDepartment("MKT")?.active === true && !r7dup.ok && !r7bad.ok,
  `MKT ok=${r7.ok}; ENG: ${r7dup.error}; "mk1": ${r7bad.error}`);
const r7c = S.updateDepartment(DEPT_ACTOR, "ENG", { code: "ENX" });
check("7b", "updateDepartment() refuses to change the code", !r7c.ok && !!S.getDepartment("ENG"), r7c.error);

// Returned objects are copies: editing one changes nothing stored.
const live = S.getUser("EMP-1017"); live.name = "Hacked"; S.getAllUsers()[0].name = "Hacked too";
check("7c", "read functions return copies, not live references", S.getUser("EMP-1017").name === "Ananya Iyer" && S.getAllUsers()[0].name === "Aarav Mehta");

S.resetDemoData();
const afterReset = S.getAllUsers();
const pristine = JSON.parse(snapshot).U;
const sameCore = afterReset.length === 10 && afterReset.every((u, i) =>
  ["id", "name", "email", "department", "designation", "role", "status"].every((k) => u[k] === pristine[i][k]));
check(8, "resetDemoData() then getAllUsers() = the original 10, unmodified",
  sameCore && afterReset.find((u) => u.id === "EMP-1042").status === "active" && afterReset.find((u) => u.id === "EMP-1042").phone === undefined
  && S.getAllDepartments().length === 6 && !S.getDepartment("MKT") && S.peekNextId() === "EMP-1106",
  `users=${afterReset.length}, Rohan status=${afterReset.find((u) => u.id === "EMP-1042").status}, departments=${S.getAllDepartments().length}, next=${S.peekNextId()}`);

const fresh = await import("./js/data/users.js?fresh");
const nowSame = JSON.stringify({ U: usersModule.USERS, D: usersModule.DEPARTMENTS, P: usersModule.PROFILE_DETAILS }) === snapshot;
check(9, "USERS / DEPARTMENTS / PROFILE_DETAILS untouched (shared instance + fresh import)",
  nowSame && fresh.USERS.length === 10 && JSON.stringify(fresh.USERS) === JSON.stringify(JSON.parse(snapshot).U),
  `in-memory constants identical to pre-test snapshot: ${nowSame}; fresh import has ${fresh.USERS.length} users`);

localStorage.setItem("officeos:users", "{not json");
check("9b", "corrupt saved copy is re-seeded instead of crashing", S.getAllUsers().length === 10);
localStorage.setItem("officeos:users", JSON.stringify({ version: 0, nextIdNum: 5, records: [] }));
{
  // A browser still holding a version-1 copy (no managers, plus an edit) is re-seeded to version 2.
  const v1 = { version: 1, nextIdNum: 1107, records: JSON.parse(snapshot).U.map((u) => ({ ...u, phone: "old copy" })) };
  localStorage.setItem("officeos:users", JSON.stringify(v1));
  const up = S.getUser("EMP-1042");
  check("9d", "a saved version-1 copy is replaced by a current-version seed with managers",
    up.reportingManager === "Sneha Rao" && up.phone === undefined && JSON.parse(localStorage.getItem("officeos:users")).version > 1,
    `Rohan manager=${up.reportingManager}, stale edit gone=${up.phone === undefined}, saved version=${JSON.parse(localStorage.getItem("officeos:users")).version}`);
}
check("9c", "old version number triggers a re-seed", S.getAllUsers().length === 10 && S.peekNextId() === "EMP-1106");

console.log("\n=== PAGINATION ===");
const { renderPagination } = await import("./js/ui/pagination.js");
const el = document.getElementById("p");
const btns = () => [...el.querySelectorAll(".pagination__btn")];
const byText = (t) => btns().find((b) => b.textContent === t);
const numbers = () => btns().filter((b) => /^\d+$/.test(b.textContent)).map((b) => b.textContent);
const text = () => el.querySelector(":scope > span")?.textContent;

el.innerHTML = "<span>old</span>";
renderPagination(el, { totalItems: 10, pageSize: 10, currentPage: 1, onPageChange: () => {} });
check(10, "10 items / pageSize 10 -> renders nothing", el.childNodes.length === 0, `children=${el.childNodes.length}`);

renderPagination(el, { totalItems: 25, pageSize: 10, currentPage: 1, onPageChange: () => {} });
check(11, "25 items, page 1 -> 3 page buttons, Prev disabled, Next enabled, 'Showing 1 to 10 of 25'",
  numbers().join() === "1,2,3" && byText("Prev").disabled && !byText("Next").disabled && text() === "Showing 1 to 10 of 25" && byText("1").classList.contains("is-active"),
  `pages=[${numbers()}] prevDisabled=${byText("Prev").disabled} nextDisabled=${byText("Next").disabled} text="${text()}"`);

renderPagination(el, { totalItems: 25, pageSize: 10, currentPage: 3, onPageChange: () => {} });
check(12, "page 3 (last) -> Next disabled, Prev enabled, 'Showing 21 to 25 of 25'",
  byText("Next").disabled && !byText("Prev").disabled && text() === "Showing 21 to 25 of 25",
  `prevDisabled=${byText("Prev").disabled} nextDisabled=${byText("Next").disabled} text="${text()}"`);

let calls = [];
renderPagination(el, { totalItems: 25, pageSize: 10, currentPage: 1, onPageChange: (p) => calls.push(p) });
byText("Next").click();
check(13, "click Next on page 1 -> onPageChange(2)", calls.join() === "2", `calls=[${calls}]`);
check("13b", "renderPagination doesn't re-render by itself after a click", byText("1").classList.contains("is-active"));

calls = [];
byText("3").click();
check(14, "click page '3' -> onPageChange(3)", calls.join() === "3", `calls=[${calls}]`);

let threw = null;
try { renderPagination(el, { totalItems: 0, pageSize: 10, currentPage: 1, onPageChange: () => {} }); } catch (e) { threw = e; }
check(15, "0 items -> renders nothing, no error", !threw && el.childNodes.length === 0, threw ? threw.message : `children=${el.childNodes.length}`);

// Extra: the gap pattern matches the static pages.
const pattern = (cur) => { renderPagination(el, { totalItems: 360, pageSize: 10, currentPage: cur, onPageChange: () => {} }); return [...el.querySelector(".pagination__pages").children].map((c) => c.textContent).join(" "); };
console.log(`\n36 pages, page 1 : ${pattern(1)}\n36 pages, page 18: ${pattern(18)}\n36 pages, page 36: ${pattern(36)}`);
renderPagination(el, { totalItems: 25, pageSize: 10, currentPage: 2, onPageChange: () => {} });
console.log(`markup (25 items, page 2):\n${el.outerHTML}`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
