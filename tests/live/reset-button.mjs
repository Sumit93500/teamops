// usage: node reset-button.mjs  -- the real users-list.html + staged js (p5); clicks "Reset demo data".
// Round 3A: the reset now also covers attendance records and corrections.
// Round 5C: and salaries (resetPayrollData, outstanding since 4B) and expense claims (resetExpenseData).
// Round 6B: and inventory (resetInventoryData: items, stock movements, assets, vendors).
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");
const html = fs.readFileSync("__REPO__/pages/users/users-list.html", "utf8");
const errors = []; let reloads = 0;
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => { if (/navigation|reload/i.test(e.message)) reloads++; else errors.push(e.message); });
const dom = new JSDOM(html, { url: "http://localhost/office-os/pages/users/users-list.html", virtualConsole: vc });
const w = dom.window, d = w.document;
Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, HTMLElement: w.HTMLElement });
const confirms = []; let answer = true;
w.confirm = (m) => { confirms.push(m); return answer; };
(await import("./js/core/auth.js")).signIn("admin", "Aarav Mehta", "EMP-1001");
await import("./js/app.js"); await import("./js/pages/users-list.js");
const S = await import("./js/data/store.js"), L = await import("./js/data/leave-store.js"), H = await import("./js/data/holidays.js"), A = await import("./js/data/attendance-store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const HOL_ACTOR = "EMP-1003";   // Round 10W (signature; was addHoliday(fields) / removeHoliday(id)): the holiday writes take the acting person's id first and check their record (holidays:manage); every call here passes HR's (Priya). The guard itself: holiguard.mjs
const P = await import("./js/data/payroll-store.js"), E = await import("./js/data/expenses-store.js"), I = await import("./js/data/inventory-store.js");
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${n}. ${label}${detail ? `  -> ${detail}` : ""}`); };
const resetBtn = [...d.querySelectorAll(".page-header__actions button")].find((b) => b.textContent === "Reset demo data");
const dirty = () => {
  S.updateUser(USER_ACTOR("admin", "EMP-1017"), "EMP-1017", { phone: "000" });
  L.applyLeave("EMP-1105", { type: "wfh", from: "2026-11-02", to: "2026-11-02", reason: "x" });
  H.addHoliday(HOL_ACTOR, { date: "2026-11-09", name: "Test day", kind: "company" });
  seededAttendance = A.allRegularizations().length;   // the first read creates the sample data
  // Arjun's seeded late day (always within the last few working days) gets a correction request.
  const now = new Date();
  const months = [[now.getFullYear(), now.getMonth() + 1], now.getMonth() ? [now.getFullYear(), now.getMonth()] : [now.getFullYear() - 1, 12]];
  const lateDay = months.flatMap(([y, m]) => A.monthFor("EMP-1105", y, m).days).find((d) => d.status === "late");
  dirtyAttendance = A.requestRegularization("EMP-1105", { date: lateDay?.date, issue: "late-arrival", time: "09:30", reason: "test" }).ok;
  // Nothing writes salaries yet, so change the saved copy directly; an expense claim goes through the store.
  seededSalaries = JSON.stringify(P.allSalaries());
  const box = JSON.parse(w.localStorage.getItem("officeos:salaries"));
  box.records[0].gross = 1;
  w.localStorage.setItem("officeos:salaries", JSON.stringify(box));
  seededExpenses = JSON.stringify(E.allExpenses());
  dirtyExpenses = E.submitExpense("EMP-1105", { category: "meals", amount: 400, date: new Date().toISOString().slice(0, 10), reason: "test" }).ok;
  seededInventory = JSON.stringify([I.allItems(), I.allMovements(), I.allAssets(), I.allVendors()]);
  dirtyInventory = I.recordMovement("EMP-1001", { sku: "STA-3001", type: "in", quantity: 5, reference: "test" }).ok
    && I.returnAsset("EMP-1001", "AST-0188", { condition: "fair", location: "store-a" }).ok;
};
let seededAttendance = 0, dirtyAttendance = false, seededSalaries = "", seededExpenses = "", dirtyExpenses = false, seededInventory = "", dirtyInventory = false;
dirty();
check("0", "set-up: an attendance correction was added before resetting", dirtyAttendance && A.allRegularizations().length === seededAttendance + 1);
check("0b", "set-up: a salary changed and an expense claim added before resetting", P.allSalaries()[0].gross === 1 && dirtyExpenses && E.allExpenses().length === JSON.parse(seededExpenses).length + 1);
check("0c", "set-up: a stock movement recorded and an asset taken back before resetting", dirtyInventory && I.allMovements().length === JSON.parse(seededInventory)[1].length + 2 && I.getAsset("AST-0188").status === "available");
const state = () => [S.getUser("EMP-1017").phone, L.allRequests().length, H.getAllHolidays().length, A.allRegularizations().length, P.allSalaries()[0].gross, E.allExpenses().length, I.allMovements().length, I.getAsset("AST-0188").status].join("/");
const before = state();
answer = false; resetBtn.click();
check(1, "Cancel in confirm(): nothing reset (attendance corrections, salaries, expense claims and inventory included)", state() === before, before);
answer = true; resetBtn.click();
// Round 11T (behaviour; S-D11: Reset demo data clears payroll runs too, and its confirm names them)
// Round 13N (behaviour; M1.3: it also names salary changes (12X) and deleted people's names (13J), both cleared already)
check(2, "confirm() wording mentions leave, holidays, attendance, salaries, salary changes (13N), payroll runs (round 11T), expense claims, inventory, asset requests (6E) and deleted people's names (13N)", confirms.at(-1) === "This discards every change made to users, departments, leave, holidays, attendance, salaries, salary changes, payroll runs, expense claims, inventory, asset requests and deleted people's names in this browser. Continue?", confirms.at(-1));
const keys = Object.keys(w.localStorage);
check(3, "OK: users, departments, leave-requests, holidays, attendance, regularizations, salaries, expense-claims and the four inventory keys all cleared; session kept", ["officeos:users", "officeos:departments", "officeos:leave-requests", "officeos:holidays", "officeos:attendance", "officeos:regularizations", "officeos:salaries", "officeos:expense-claims", "officeos:inventory-items", "officeos:stock-movements", "officeos:assets", "officeos:vendors"].every((k) => !keys.includes(k)) && keys.includes("officeos:session"), keys.join(", "));
check(4, "next reads are the seed again (attendance corrections back to the seeded ones)", S.getUser("EMP-1017").phone === undefined && L.allRequests().length === 11 && H.getAllHolidays().length === 7 && A.allRegularizations().length === seededAttendance, `corrections ${A.allRegularizations().length} (seeded ${seededAttendance})`);
check(5, "page reload requested once per confirmed reset, no JS errors", reloads === 1 && errors.length === 0, `reloads=${reloads}; errors=${errors.join(" / ") || "none"}`);
check(6, "salaries are the seed again (the changed gross is gone)", JSON.stringify(P.allSalaries()) === seededSalaries);
check(7, "expense claims are the seed again (the added claim is gone)", JSON.stringify(E.allExpenses()) === seededExpenses, `${E.allExpenses().length} claims`);
check(8, "inventory is the seed again (the movement and the return are gone, AST-0188 is Arjun's again)", JSON.stringify([I.allItems(), I.allMovements(), I.allAssets(), I.allVendors()]) === seededInventory && I.getAsset("AST-0188").holderId === "EMP-1105", `${I.allMovements().length} movements`);
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
