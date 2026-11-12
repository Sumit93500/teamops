// usage: node run.mjs <scenario>
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");
const SC = process.argv[2];
const ID = { admin: ["admin", "Aarav Mehta", "EMP-1001"], hr: ["hr", "Priya Nair", "EMP-1003"], fin: ["fin", "Kabir Shah", "EMP-1008"], emp: ["emp", "Arjun Kapoor", "EMP-1105"],
  edited: ["emp", "Arjun Kapoor", "EMP-1105"], old: ["hr", "Priya Nair", undefined] }[SC];
const html = fs.readFileSync("__REPO__/pages/account/my-profile.html", "utf8");
const make = () => { const dom = new JSDOM(html, { url: "http://localhost/office-os/pages/account/my-profile.html", virtualConsole: new VirtualConsole() }); Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, Node: dom.window.Node }); return dom.window.document; };
const d = make();
(await import("./js/core/auth.js")).signIn(...ID);
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const DEPT_ACTOR = "EMP-1003";   // Round 10X (signature; was addDepartment(fields) / updateDepartment(code, changes)): the department writes take the acting person's id first and check their record (departments:create / :edit); every call here passes HR's (Priya). The guard itself: deptguard.mjs
if (SC === "edited") {
  // After an admin edit: some values cleared, one field removed outright, status on leave, PAN deleted, department renamed.
  S.updateUser(USER_ACTOR("admin", "EMP-1105"), "EMP-1105", { phone: "", dateOfJoining: "", location: "", status: "on-leave", pan: null });
  const box = JSON.parse(localStorage.getItem("officeos:users"));
  // Round 9V (behaviour; was delete r.reportingManager only): the manager is the id beside the name since 9V
  // (managerid.mjs A1), so a record with no manager has neither
  const r = box.records.find((u) => u.id === "EMP-1105"); delete r.reportingManager; delete r.reportingManagerId; delete r.personalEmail; delete r.emergencyContactPhone;
  localStorage.setItem("officeos:users", JSON.stringify(box));
  S.updateDepartment(DEPT_ACTOR, "ENG", { name: "Product Engineering" });
}
const snapshotBefore = SC === "old" ? d.querySelector("main").innerHTML : null;
await import("./js/app.js");
await import("./js/pages/my-profile.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${n}. ${label}${detail ? `  -> ${detail}` : ""}`); };
const kv = (l) => [...d.querySelectorAll(".kv__row")].find((r) => r.querySelector("dt").textContent.trim() === l)?.querySelector("dd");
const kt = (l) => kv(l)?.textContent.trim();
const f = (id) => d.getElementById(id).defaultValue;
const badges = () => [...d.querySelectorAll(".profile__badges .badge")].map((b) => `${b.textContent}{${b.className.replace("badge ", "")}}`).join(" | ");

if (SC === "old") {
  // Compare against a page that never ran my-profile.js (app.js alone changes only the topbar/sidebar).
  const plain = new JSDOM(html).window.document.querySelector("main").innerHTML;
  check("O", "old session (no employeeId): main content untouched by my-profile.js", d.querySelector("main").innerHTML === plain && snapshotBefore === plain && d.querySelector(".profile__name").textContent === "Arjun Kapoor" && kt("Bank account") === "•••• •••• 4821",
    `profile name still "${d.querySelector(".profile__name").textContent}", bank still "${kt("Bank account")}" (placeholder HTML)`);
} else if (SC === "edited") {
  const main = d.querySelector("main");
  const inputs = [...main.querySelectorAll("input, textarea")].map((i) => `${i.id}=${JSON.stringify(i.defaultValue)}`);
  check("E1", "cleared or missing values show — in display rows", kt("Date of joining") === "—" && kt("Location") === "—" && kt("Reporting manager") === "—", `joined=${kt("Date of joining")}, location=${kt("Location")}, manager=${kt("Reporting manager")}`);
  check("E2", "cleared or missing form fields are empty, not 'undefined'", f("p-phone") === "" && f("p-email") === "" && f("e-phone") === "" && f("p-city") === "Gurugram", `p-phone=${JSON.stringify(f("p-phone"))}, p-email=${JSON.stringify(f("p-email"))}, e-phone=${JSON.stringify(f("e-phone"))}, p-city (kept)=${JSON.stringify(f("p-city"))}`);
  check("E3", "the word 'undefined' appears nowhere in the page content or form values", !main.textContent.includes("undefined") && !inputs.some((s) => s.includes("undefined")));
  check("E4", "status badge follows data: On leave", badges().includes("On leave{badge--info badge--dot}"), badges());
  check("E5", "PAN removed -> 'Not on file' (muted); bank still masked", kt("PAN") === "Not on file" && kv("PAN").className === "text-muted" && kt("Bank account") === "•••• •••• 4821" && kv("Bank account").className === "masked", `bank="${kt("Bank account")}" (${kv("Bank account").className}), pan="${kt("PAN")}" (${kv("PAN").className})`);
  check("E6", "renamed department comes from the store", d.querySelector(".profile__meta").textContent === "Software Engineer, Product Engineering" && kt("Department") === "Product Engineering", d.querySelector(".profile__meta").textContent);
} else {
  const r = S.getUser(ID[2]);
  const EXP = { "EMP-1001": ["•••• •••• 2290", "•••••5528Q"], "EMP-1003": ["•••• •••• 6614", "•••••8091L"], "EMP-1008": ["•••• •••• 3057", "•••••2746D"], "EMP-1105": ["•••• •••• 4821", "•••••3421F"] }[ID[2]];
  const deptName = { ENG: "Engineering", HR: "Human Resources", FIN: "Finance" }[r.department];
  const roleLabel = { admin: "Admin", hr: "HR Manager", fin: "Finance Manager", emp: "Employee" }[ID[0]];
  const got = {
    header: [d.querySelector(".profile .avatar--xl").textContent, d.querySelector(".profile__name").textContent, d.querySelector(".profile__meta").textContent].join(" | "),
    badges: badges(),
    work: ["Employee ID", "Designation", "Department", "Reporting manager", "Date of joining", "Location", "Employment type"].map(kt).join(" | "),
    access: ["Role", "Data scope", "Leave approved by"].map(kt).join(" | "),
    sensitive: `${kt("Bank account")} {${kv("Bank account").className}} | ${kt("PAN")} {${kv("PAN").className}}`,
    contact: ["p-name", "p-phone", "p-email", "p-city", "p-address"].map(f).join(" | "),
    emergency: ["e-name", "e-rel", "e-phone"].map(f).join(" | "),
  };
  console.log(`--- ${ID[1]} (${ID[2]}, signed in as ${ID[0]}) ---\n` + Object.entries(got).map(([k, v]) => `       ${k.padEnd(9)} ${v}`).join("\n"));
  const ok = got.header === `${ID[1].split(" ").map((p) => p[0]).join("")} | ${r.name} | ${r.designation}, ${deptName}`
    && got.badges === `${roleLabel}{badge--primary} | Active{badge--success badge--dot} | ${r.id}{badge}`
    && got.work === [r.id, r.designation, deptName, r.reportingManager, r.dateOfJoining, r.location, r.employmentType].join(" | ")
    && got.access === [roleLabel, { admin: "All records", hr: "All records", fin: "All finance records" }[ID[0]] ?? "Own records, plus your direct reports if you manage people" /* Round Manager scoping part 2 (behaviour; was All / Own records) */, (await import("./js/data/leave-store.js")).approvalChainText(r.id)].join(" | ")   // Round 8C: the real chain (was the stored r.leaveApprovedBy)
    && got.sensitive === `${EXP[0]} {masked} | ${EXP[1]} {masked}`
    && got.contact === [r.name.split(" ")[0], r.phone, r.personalEmail, r.city, r.address].join(" | ")
    && got.emergency === [r.emergencyContactName, r.emergencyContactRelation, r.emergencyContactPhone].join(" | ");
  check(ID[2], "every field from the store; bank/PAN masked for this person; real status badge", ok);
}
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
