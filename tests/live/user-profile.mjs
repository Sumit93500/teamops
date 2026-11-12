// usage: node run.mjs <roleKey>
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");
const ROLE = process.argv[2];
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], fin: ["Kabir Shah", "EMP-1008"], hr: ["Priya Nair", "EMP-1003"] }[ROLE];
const html = fs.readFileSync("__REPO__/pages/users/user-profile.html", "utf8");
let redirected = 0;
const vc = new VirtualConsole(); vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) redirected++; else console.log("  [jsdomError]", e.message); });
const dom = new JSDOM(html, { url: "http://localhost/office-os/pages/users/user-profile.html?id=EMP-1105", virtualConsole: vc });
const { window } = dom;
Object.assign(globalThis, { window, document: window.document, localStorage: window.localStorage, Node: window.Node });
const d = window.document;
(await import("./js/core/auth.js")).signIn(ROLE, ...WHO);
await import("./js/app.js");
await import("./js/pages/user-profile.js");
const { can } = await import("./js/core/rbac.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${n}. ${label}${detail ? `  -> ${detail}` : ""}`); };
const dd = (label) => [...d.querySelectorAll(".kv__row")].find((r) => r.querySelector("dt").textContent.trim() === label)?.querySelector("dd");
const salary = dd("Salary");
console.log(`--- signed in as ${ROLE} (${WHO[0]}), viewing Arjun (EMP-1105); salary:view=${can("salary:view")}, pii:view=${can("pii:view")}${redirected ? ", page guard redirected away (no users:view)" : ""} ---`);
if (ROLE === "hr") check(3, "HR: Salary row unchanged", salary.textContent === "Hidden, needs salary:view" && salary.className === "text-muted", `"${salary.textContent}" (class="${salary.className}")`);
else check(ROLE === "admin" ? 1 : 2, `${ROLE}: Salary row shows Arjun's salary record in effect this month, not muted (Round 4G)`, salary.textContent === "₹88,000 a month" && salary.className === "", `"${salary.textContent}" (class="${salary.className}")`);

// 4. Reveal: both buttons visible to HR and Admin (pii:view) and still toggle; hidden from Finance, which no longer
//    holds pii:view (Round 7C; the guard also sends Finance away, as it has no users:view).
const bankBtn = dd("Bank account").querySelector("button"), panBtn = dd("PAN").querySelector("button");
const masked = [dd("Bank account").querySelector("span").textContent, dd("PAN").querySelector("span").textContent];
bankBtn.click(); panBtn.click();
const shown = [dd("Bank account").querySelector("span").textContent, dd("PAN").querySelector("span").textContent];
bankBtn.click();
if (ROLE === "fin") check("4", "Finance: both Reveals hidden (no pii:view since Round 7C); the values stay masked", bankBtn.hidden && panBtn.hidden && masked.join(" | ") === "•••• •••• 4821 | •••••3421F",
  `hidden ${bankBtn.hidden} / ${panBtn.hidden}; masked ${masked.join(" | ")}`);
else check("4", "Reveal unaffected (visible via pii:view, toggles, re-masks)", !bankBtn.hidden && !panBtn.hidden && masked.join(" | ") === "•••• •••• 4821 | •••••3421F" && shown.join(" | ") === "6715 4028 4821 | KPBPK3421F" && dd("Bank account").querySelector("span").textContent === "•••• •••• 4821",
  `masked ${masked.join(" | ")}  ->  revealed ${shown.join(" | ")}`);
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
