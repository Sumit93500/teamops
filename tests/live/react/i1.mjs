// I1's harness (msedge, headless): the import / export screens on the I1 data layer. Read by meaning (words, attributes, storage, the files
// downloaded), never by pixels.
// usage: node i1.mjs <app dist> <repo root> <shots dir>   [ONLY=AUCFDTHEKXZ]
// Clock: Mon 23 Nov 2026 10:00 IST. The IT person is made in the test (nobody is seeded with the role).
//   A  who may open each page (Admin, HR, Finance, an employee, a manager, IT) and what the sidebar, the Users list and the roles pages show
//   U  Upload: the templates (CSV, Excel), a wrong type, a file over 2 MB, an empty one, drag and drop, Remove, the Check button's states
//   C  Check: the counts, the summary in words, the first rows, every problem with its row, the error report
//   F  Confirm and Done: the words (incl. "New sign-in requests will be sent to IT"), the people made, one IT request each, no sign-in, the links
//   D  a double click on Import imports once
//   T  a check over 30 minutes old: refused at Import, "Check the file again"
//   H  Import history: the entries, filters, the shared date range ("No data in this range."), details (no contents), empty, no access
//   E  export: the Users list's dialog (matching / all, CSV / Excel, the full numbers only by choice), Finance's pay export (masked only)
//   K  keyboard: the file input, the step headings, the export dialog
//   X  no sideways scroll at 412, 768 and 1280, light and dark, on every screen and state; shots for the eye
//   Z  contrast of the chips and sub-lines, light and dark; no page or console errors
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, ROOT, SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "AUCFDTHEKXZ";
const PORT = process.env.PORT ?? "9977";
fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn("python", [path.join(HERE, "spa-serve.py"), PORT, DIST], { stdio: "ignore" });
const stop = () => { try { srv.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"], it: ["Isha Kulkarni", "EMP-1106"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const size = (w) => (w === 412 ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA } : { viewport: { width: w, height: 900 } });
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(8)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 500)}` : ""}`); };
const errs = [];
const NOW = "2026-11-23T10:00:00+05:30";
const j = JSON.stringify;
const P = { imp: "people/import-employees.html", hist: "people/import-history.html", pay: "payroll/export-pay.html", users: "users/users-list.html" };

async function make(who, { width = 1280, theme = "light" } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata", colorScheme: theme, acceptDownloads: true });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(NOW));
  await ctx.addInitScript(([th, w]) => {
    if (localStorage.getItem("i1:seeded")) return;
    localStorage.clear();
    localStorage.setItem("i1:seeded", "1");
    localStorage.setItem("officeos:prefs", JSON.stringify({ theme: th }));
    localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
    localStorage.setItem(`officeos:prefs:${w[1]}`, JSON.stringify({ theme: th }));
  }, [theme, WHO[who]]);
  const t = await ctx.newPage();
  t.on("pageerror", (e) => errs.push(`${who}: ${e.message}`));
  t.on("console", (m) => { if (m.type() === "error" && !/storage: failed/.test(m.text())) errs.push(`${who}: console ${m.text()}`); });
  await t.goto(N + "/pages/auth/login.html"); await t.waitForLoadState("load");
  return { ctx, t, who };
}
const sleep = (t, ms = 350) => t.waitForTimeout(ms);
async function go(n, page, who, q = "") {
  if (who) await n.t.evaluate((w) => { localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 })); }, WHO[who]);
  await n.t.goto(N + "/pages/" + page + q); await n.t.waitForLoadState("load");
  await n.t.evaluate(() => document.fonts.ready); await sleep(n.t, 450);
}
async function addIt(n) {
  await go(n, "dashboard/employee.html", "emp");
  await n.t.evaluate(() => {
    const box = JSON.parse(localStorage.getItem("officeos:users"));
    if (!box.records.some((x) => x.id === "EMP-1106")) box.records.push({ ...box.records.find((x) => x.id === "EMP-1105"), id: "EMP-1106", name: "Isha Kulkarni", email: "isha.kulkarni@northwind.com", department: "IT", designation: "IT Engineer", role: "it", reportingManagerId: null, reportingManager: "", dateOfJoining: "1 Apr 2024" });
    box.nextIdNum = Math.max(box.nextIdNum, 1107);
    localStorage.setItem("officeos:users", JSON.stringify(box));
  });
}
const path_ = (t) => new URL(t.url()).pathname;
const text = (t, sel) => t.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const main = (t) => t.evaluate(() => document.querySelector("main")?.innerText.replace(/\s+/g, " ") ?? "");
const stored = (t, key) => t.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), key);
const rows = (t, sel) => t.evaluate((s) => [...document.querySelectorAll(`${s} tbody tr`)].map((tr) => [...tr.children].map((c) => c.innerText.replace(/\s+/g, " ").trim())), sel);
const sidebar = (t) => t.evaluate(() => [...document.querySelectorAll(".sidebar a, nav a")].map((a) => a.textContent.replace(/\s+/g, " ").trim()).filter(Boolean));
const kpi = (t, id) => text(t, `[data-kpi="${id}"] .ds-kpi__value, #${id} .ds-kpi__value`);
const SHOT = async (t, name) => { try { await t.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true }); } catch {} };
const dialogOpen = (t) => t.locator(".modal.is-open").count();
const grab = async (t, click) => { const [d] = await Promise.all([t.waitForEvent("download", { timeout: 10000 }), click()]); return { name: d.suggestedFilename(), buf: fs.readFileSync(await d.path()) }; };
const bom = (buf) => buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
const csvText = (buf) => buf.toString("utf8").replace(/^﻿/, "");
const users = (t) => t.evaluate(() => JSON.parse(localStorage.getItem("officeos:users")).records);
const itReqs = (t) => t.evaluate(() => (JSON.parse(localStorage.getItem("officeos:it-desk") ?? "null")?.requests ?? []).filter((r) => r.type === "new-account"));
const history = (t) => t.evaluate(() => JSON.parse(localStorage.getItem("officeos:import-history") ?? "null")?.entries ?? []);

// the files
const H = ["Full name", "Work email", "Mobile", "Department", "Designation", "Manager's work email", "Office", "Employment type", "Joining date"];
const R = (name, email, o = {}) => ({ "Full name": name, "Work email": email, Mobile: "+91 98765 43210", Department: "Engineering", Designation: "Software Engineer", "Manager's work email": "priya.nair@northwind.com", Office: "Head office", "Employment type": "Full-time", "Joining date": "2026-12-01", ...o });
const q = (v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, "\"\"")}"` : v);
const csv = (list, headers = H) => [headers.join(","), ...list.map((r) => headers.map((h) => q(r[h] ?? "")).join(","))].join("\r\n");
const GOOD = csv([R("Asha Verma", "asha.verma@northwind.com"), R("Ravi Das", "ravi.das@northwind.com", { Department: "Sales", Designation: "Sales Executive" }), R("Meera Pillai", "meera.pillai@northwind.com", { "Employment type": "Intern" }),
  R("Bad Row", "bad.row@northwind.com", { Mobile: "12", Department: "Marketing" }), R("Asha Again", "ASHA.VERMA@northwind.com")]);
const put = (t, name, body, mimeType = "text/csv") => t.setInputFiles("#import-file", { name, mimeType, buffer: Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8") });
const toCheck = async (n, body = GOOD, name = "joiners.csv") => { await go(n, P.imp, n.who); await put(n.t, name, body); await sleep(n.t, 300); await n.t.click("#check-file"); await sleep(n.t, 700); };

// ---------- A ----------
if (ONLY.includes("A")) {
  console.log("\n--- A. Who may open what ---");
  const n = await make("admin");
  await addIt(n);
  const want = { admin: [1, 1, 1], hr: [1, 1, 0], fin: [0, 0, 1], emp: [0, 0, 0], mgr: [0, 0, 0], it: [0, 0, 0] };
  const got = {};
  for (const who of Object.keys(want)) {
    got[who] = [];
    for (const page of [P.imp, P.hist, P.pay]) { await go(n, page, who); got[who].push(path_(n.t).endsWith(page) ? 1 : 0); }
  }
  check("A1", "Import employees and Import history: HR and the Admin; Export pay details: Finance and the Admin; the others get the 403 page", j(got) === j(want), j(got));
  await go(n, P.imp, "emp");
  check("A2", "an employee sent to Import employees lands on the 403 page", path_(n.t).endsWith("errors/403.html"));
  const side = {};
  for (const who of Object.keys(want)) { await go(n, "dashboard/employee.html", who); const s = await sidebar(n.t); side[who] = ["Import employees", "Import history", "Export pay details"].map((x) => (s.includes(x) ? 1 : 0)); }
  check("A3", "the sidebar lists each page only for those who may open it", j(side) === j(want), j(side));
  await go(n, P.users, "hr");
  check("A4", "the Users list: Import and Export for HR (and the Admin); the old plain export is gone", (await n.t.locator("#import-link").count()) === 1 && (await n.t.locator("#export-open").count()) === 1);
  await go(n, P.users, "admin");
  check("A5", "...for the Admin too", (await n.t.locator("#import-link").count()) === 1 && (await n.t.locator("#export-open").count()) === 1);
  await go(n, "access/roles-list.html", "admin");
  const counts = await n.t.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-cell='permissions']")].map((c) => [c.closest("tr").innerText.split("\n")[0].trim(), c.innerText.trim()])));
  check("A6", "the roles list counts: Admin 127 / 130, HR Manager 70 / 130, Finance Manager 60 / 130, Employee 34 / 130", j(counts) === j({ Admin: "127 / 130", "HR Manager": "70 / 130", "Finance Manager": "60 / 130", Employee: "34 / 130" }) /* TD1 (behaviour; were 123 / 66 / 57 / 31 of 126) */, j(counts));
  await go(n, "access/role-editor.html", "admin", "?role=hr");
  const keys = await n.t.evaluate(() => Object.fromEntries(["import:employees", "import:history-view", "export:employees", "export:employees-pay"].map((k) => [k, document.querySelector(`[data-permission-key="${k}"]`)?.getAttribute("aria-label") ?? null])));
  check("A7", "the role editor shows Imports and Exports under System: HR ticks import:employees, import:history-view, export:employees, not the pay export", (await main(n.t)).includes("Imports") && (await main(n.t)).includes("Exports") && keys["import:employees"].endsWith("yes") && keys["import:history-view"].endsWith("yes") && keys["export:employees"].endsWith("yes") && keys["export:employees-pay"].endsWith("no"), j(keys));
  await n.ctx.close();
}

// ---------- U ----------
if (ONLY.includes("U")) {
  console.log("\n--- U. Upload ---");
  const n = await make("hr");
  const t = n.t;
  await go(n, P.imp, "hr");
  check("U1", "the page: title, four steps with Upload current, the columns listed (required ones marked; HR sees the bank ones)", (await text(t, "h1")) === "Import employees" && (await t.locator("#import-steps .stepper__step").count()) === 4 && (await t.locator("#import-steps .is-current").innerText()).includes("Upload")
    && (await text(t, "#template-columns")).includes("Full name (required)") && (await text(t, "#template-columns")).includes("Aadhaar"));
  check("U2", "Check the file is disabled until a file is chosen", await t.locator("#check-file").isDisabled());
  const tc = await grab(t, () => t.click("#template-csv"));
  const tcText = csvText(tc.buf);
  check("U3", "the CSV template: employees-template.csv, a BOM, the headers, the EXAMPLE row, the notes naming the live lists", tc.name === "employees-template.csv" && bom(tc.buf) && tcText.startsWith("Employee code,Full name,Work email") && /\r\nEXAMPLE,/.test(tcText) && tcText.includes("# Departments: Engineering") && tcText.includes("sign-in request goes to IT"), tcText.slice(0, 200));
  const tx = await grab(t, () => t.click("#template-xlsx"));
  check("U4", "the Excel template: employees-template.xlsx, a zip (PK)", tx.name === "employees-template.xlsx" && tx.buf[0] === 0x50 && tx.buf[1] === 0x4b);
  await put(t, "photo.pdf", Buffer.from("%PDF-1.4 not a sheet"), "application/pdf");
  await t.click("#check-file"); await sleep(t, 500);
  check("U5", "a PDF: refused in words (role alert), still on Upload", /PDF or an image, not a spreadsheet/.test(await text(t, "#import-error")) && (await t.locator("#import-error[role=alert]").count()) === 1 && (await t.locator("#upload-card").count()) === 1);
  await SHOT(t, "u-wrong-type-hr-1280-light");
  await put(t, "big.csv", Buffer.alloc(2 * 1024 * 1024 + 1, 0x41));
  await sleep(t, 400);
  check("U6", "a file over 2 MB: refused at once with its size and the limit; no file kept", /just over 2 MB; at most 2 MB/.test(await text(t, "#import-error")) && (await t.locator("#chosen-file").count()) === 0 && (await t.locator("#check-file").isDisabled()));
  await SHOT(t, "u-too-big-hr-1280-light");
  await put(t, "empty.csv", "");
  await sleep(t, 300);
  check("U7", "an empty file is refused: 'The file is empty.'", (await text(t, "#import-error")) === "The file is empty.");
  const hist = await history(t);
  check("U8", "each refusal is in the history (refused): the PDF, the big one (no fingerprint: not read), the empty one", ["photo.pdf", "big.csv", "empty.csv"].every((f) => hist.some((h) => h.fileName === f && h.status === "refused")) && hist.find((h) => h.fileName === "big.csv").sha256 === "", j(hist.map((h) => [h.fileName, h.status])));
  await t.evaluate((body) => {
    const dt = new DataTransfer();
    dt.items.add(new File([body], "dropped.csv", { type: "text/csv" }));
    const zone = document.querySelector("#drop-zone");
    zone.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
    zone.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
  }, GOOD);
  await sleep(t, 400);
  check("U9", "a dropped file is taken: its name and size are shown, the error goes, Check is enabled", (await text(t, "#chosen-file")).startsWith("dropped.csv") && (await t.locator("#import-error").count()) === 0 && !(await t.locator("#check-file").isDisabled()));
  await SHOT(t, "u-chosen-hr-1280-light");
  await t.click("#chosen-file button"); await sleep(t, 200);
  check("U10", "Remove clears it", (await t.locator("#chosen-file").count()) === 0 && (await t.locator("#check-file").isDisabled()));
  await t.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(["a"], "a.csv")); dt.items.add(new File(["b"], "b.csv"));
    document.querySelector("#drop-zone").dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
  });
  await sleep(t, 200);
  check("U11", "two files dropped at once: 'Drop one file at a time.'", (await text(t, "#import-error")) === "Drop one file at a time.");
  await put(t, "headers.csv", "Full name,Salary\r\nA,1");
  await t.click("#check-file"); await sleep(t, 500);
  check("U12", "a file whose headers are wrong: every header problem is listed (an unknown column, the missing ones)", /Column B is "Salary"/.test(await text(t, "#import-error")) && /These required columns are missing: "Work email", "Mobile", "Department"/.test(await text(t, "#import-error")) && (await t.locator("#import-error li").count()) === 1);
  await SHOT(t, "u-headers-hr-1280-light");
  await n.ctx.close();
}

// ---------- C, F ----------
if (ONLY.includes("C") || ONLY.includes("F")) {
  console.log("\n--- C. Check ---");
  const n = await make("hr");
  const t = n.t;
  const before = (await users(t)).length;
  await toCheck(n);
  check("C1", "Check: the step moves, its heading takes the focus", (await t.locator("#check-card").count()) === 1 && (await t.evaluate(() => document.activeElement?.id)) === "step-title" && (await t.locator("#import-steps .is-current").innerText()).includes("Check"));
  check("C2", "the counts: 5 read, 3 ready, 1 with errors, 1 duplicate; the words say '3 will be imported, 1 has errors, 1 duplicate'", (await kpi(t, "kpi-read")) === "5" && (await kpi(t, "kpi-ready")) === "3" && (await kpi(t, "kpi-errors")) === "1" && (await kpi(t, "kpi-dups")) === "1" && (await text(t, "#check-summary")).startsWith("3 will be imported, 1 has errors, 1 duplicate."), await text(t, "#check-summary"));
  const prev = await rows(t, "#preview-table");
  check("C3", "the first rows: row number, name, email, designation, status (Ready / Has errors / Duplicate)", prev.length === 5 && prev[0][0] === "2" && prev[0][1] === "Asha Verma" && prev[0].at(-1) === "Ready" && prev[3].at(-1) === "Has errors" && prev[4].at(-1) === "Duplicate", j(prev));
  const probs = await rows(t, "#problems-table");
  check("C4", "every problem with its row and column: Mobile and Department on row 5, Work email on row 6 ('also in row 2')", j(probs.map((p) => p.slice(0, 2))) === j([["5", "Mobile"], ["5", "Department"], ["6", "Work email"]]) && probs[2][2] === "also in row 2", j(probs));
  check("C5", "nothing saved by the check: the same people, no IT request", (await users(t)).length === before && (await itReqs(t)).length === 0);
  const er = await grab(t, () => t.click("#error-report"));
  check("C6", "Download error report: employees-import-errors-2026-11-23.csv, BOM, Row, Column, Problem", er.name === "employees-import-errors-2026-11-23.csv" && bom(er.buf) && csvText(er.buf).startsWith("Row,Column,Problem\r\n5,Mobile,") && csvText(er.buf).split("\r\n").length === 5, csvText(er.buf));
  await SHOT(t, "c-check-hr-1280-light");
  console.log("\n--- F. Confirm and Done ---");
  await t.click("#to-confirm"); await sleep(t, 300);
  const words = await text(t, "#confirm-list");
  check("F1", "Confirm, in plain words: 3 new employees, 2 rows skipped, 'New sign-in requests will be sent to IT', all or none", /3 new employees will be added/.test(words) && /2 rows have problems and will be skipped/.test(words) && words.includes("New sign-in requests will be sent to IT") && /All of it is saved together, or none of it/.test(words) && (await t.evaluate(() => document.activeElement?.id)) === "step-title", words);
  await SHOT(t, "f-confirm-hr-1280-light");
  await t.click("#back-to-check"); await sleep(t, 300);
  check("F2", "Back returns to Check with everything still there", (await kpi(t, "kpi-ready")) === "3");
  await t.click("#to-confirm"); await sleep(t, 300);
  check("F3", "the Import button says how many: 'Import 3 employees'", (await text(t, "#do-import")) === "Import 3 employees");
  await t.click("#do-import"); await sleep(t, 900);
  const made = await rows(t, "#made-table");
  const now = await users(t);
  const reqs = await itReqs(t);
  const added = now.filter((u) => ["asha.verma@northwind.com", "ravi.das@northwind.com", "meera.pillai@northwind.com"].includes(u.email));
  check("F4", "Done: '3 employees were added; 2 rows were skipped. 3 sign-in requests are with IT.'", (await text(t, "#done-summary")) === "3 employees were added; 2 rows were skipped. 3 sign-in requests are with IT.", await text(t, "#done-summary"));
  check("F5", "three people saved, one new-account request for each, opened by HR; nobody got a sign-in", added.length === 3 && now.length === before + 3 && reqs.length === 3 && added.every((u) => reqs.filter((r) => r.subjectPersonId === u.id).length === 1) && reqs.every((r) => r.requesterId === "EMP-1003")
    && (await t.evaluate((ids) => { const c = JSON.parse(localStorage.getItem("officeos:credentials") ?? "null"); return !c || ids.every((id) => !JSON.stringify(c).includes(`"${id}"`)); }, added.map((u) => u.id))));
  check("F6", "the Added table links each person to their profile and their sign-in request", made.length === 3 && (await t.locator("#made-table a[href*='user-profile.html?id=EMP-']").count()) === 3 && (await t.locator("#made-table a[href*='it/request.html?id=ITR-']").count()) === 3);
  await SHOT(t, "f-done-hr-1280-light");
  await t.locator("#made-table a[href*='it/request.html']").first().click(); await sleep(t, 700);
  check("F7", "a request link opens that request: 'Sign-in for Asha Verma'", (await main(t)).includes("Sign-in for Asha Verma"));
  await go(n, P.users, "hr");
  check("F8", "the Users list shows the new people", (await main(t)).includes("Asha Verma") || (await t.evaluate(() => document.body.innerText.includes("13 employees"))));
  await n.ctx.close();
}

// ---------- D ----------
if (ONLY.includes("D")) {
  console.log("\n--- D. Double click ---");
  const n = await make("admin");
  const t = n.t;
  await toCheck(n, csv([R("One Click", "one.click@northwind.com")]));
  await t.click("#to-confirm"); await sleep(t, 300);
  await t.locator("#do-import").dblclick(); await sleep(t, 1000);
  const u = (await users(t)).filter((x) => x.email === "one.click@northwind.com");
  check("D1", "a double click on Import (as the Admin): one person, one IT request, no sign-in made", u.length === 1 && (await itReqs(t)).filter((r) => r.subjectPersonId === u[0].id).length === 1 && (await t.evaluate((id) => !JSON.stringify(JSON.parse(localStorage.getItem("officeos:credentials") ?? "{}")).includes(`"${id}"`), u[0].id)));
  await n.ctx.close();
}

// ---------- T ----------
if (ONLY.includes("T")) {
  console.log("\n--- T. A check gone stale ---");
  const n = await make("hr");
  const t = n.t;
  await toCheck(n, csv([R("Late Person", "late.person@northwind.com")]));
  await t.click("#to-confirm"); await sleep(t, 300);
  await n.ctx.clock.setFixedTime(new Date("2026-11-23T10:31:00+05:30"));
  await t.click("#do-import"); await sleep(t, 700);
  check("T1", "31 minutes later, Import is refused: 'more than 30 minutes old', nobody added; Check the file again takes the Import button's place", /more than 30 minutes old/.test(await text(t, "#import-error")) && !(await users(t)).some((u) => u.email === "late.person@northwind.com") && (await t.locator("#do-import").count()) === 0 && (await t.locator("#check-again").count()) === 1);
  await SHOT(t, "t-stale-hr-1280-light");
  await t.click("#check-again"); await sleep(t, 700);
  check("T2", "Check the file again goes back to Check with a fresh check", (await t.locator("#check-card").count()) === 1 && (await kpi(t, "kpi-ready")) === "1");
  await t.click("#to-confirm"); await sleep(t, 300); await t.click("#do-import"); await sleep(t, 800);
  check("T3", "...and then it imports", (await users(t)).some((u) => u.email === "late.person@northwind.com") && (await t.locator("#done-card").count()) === 1);
  await n.ctx.close();
}

// ---------- H ----------
if (ONLY.includes("H")) {
  console.log("\n--- H. Import history ---");
  const n = await make("hr");
  const t = n.t;
  await go(n, P.hist, "hr");
  check("H1", "empty: 'No imports or exports yet.' with a link to Import employees", (await main(t)).includes("No imports or exports yet.") && (await t.locator("main a[href*='import-employees.html']").count()) >= 1);
  await SHOT(t, "h-empty-hr-1280-light");
  await toCheck(n);
  await t.click("#to-confirm"); await sleep(t, 300); await t.click("#do-import"); await sleep(t, 900);
  await toCheck(n, csv([R("Never Confirmed", "never@northwind.com")]), "left-at-check.csv");
  await go(n, P.imp, "hr"); await put(t, "x.pdf", Buffer.from("%PDF"), "application/pdf"); await t.click("#check-file"); await sleep(t, 400);
  await go(n, P.users, "hr"); await t.click("#export-open"); await sleep(t, 300); await grab(t, () => t.click("#export-go"));
  await go(n, P.hist, "hr");
  const list = await rows(t, "#history-table");
  check("H2", "the entries, newest first: the export, the refused PDF, the check left unconfirmed, the import, its check", list.length === 5 && list[0][1].startsWith("Export employees") && list[1][3] === "Refused" && list[2][3] === "Checked, not imported" && list[3][3] === "Imported" && list[3][4] === "3 imported, 2 skipped" && (await text(t, "#history-count")) === "5 entries", j(list.map((r) => r[3])));
  await SHOT(t, "h-list-hr-1280-light");
  await t.getByLabel("What").selectOption("export"); await sleep(t, 300);
  check("H3", "What: Exports -> one entry; the counter 'Showing 1 of 5 entries'", (await rows(t, "#history-table")).length === 1 && (await text(t, "#history-count")) === "Showing 1 of 5 entries");
  await t.getByLabel("What").selectOption(""); await sleep(t, 200);
  await t.locator("[data-entry]").nth(3).click(); await sleep(t, 400);
  const facts = await text(t, "#entry-facts");
  check("H4", "Details of the import: file, size, SHA-256, rows, imported / skipped; links to the 3 people and 3 IT requests; the problems as row, column, reason (no values)", (await dialogOpen(t)) === 1 && /File joiners\.csv/.test(facts) && /SHA-256 [0-9a-f]{64}/.test(facts) && /Imported 3/.test(facts)
    && (await t.locator("#entry-created a").count()) === 3 && (await t.locator("#entry-request-links a").count()) === 3 && j(await rows(t, "#entry-problems-table")) === j([["5", "Mobile", "not a valid phone"], ["5", "Department", "unknown department"], ["6", "Work email", "twice in the file"]]), facts);
  check("H5", "the dialog never shows a value from the file (no email, no mobile)", !(await text(t, "#entry-dialog")).includes("bad.row@") && !(await text(t, "#entry-dialog")).includes("98765"));
  await SHOT(t, "h-details-hr-1280-light");
  await t.keyboard.press("Escape"); await sleep(t, 300);
  check("H6", "Esc closes the details; focus back on its button", (await dialogOpen(t)) === 0 && (await t.evaluate(() => document.activeElement?.dataset?.entry)) !== undefined);
  await t.getByRole("button", { name: /Date range|Happened in/ }).first().click().catch(() => {});
  await sleep(t, 200);
  const sel = t.locator("main select").filter({ has: t.locator("option[value='custom']") });
  if (await sel.count()) { await sel.first().selectOption("lastMonth"); await sleep(t, 300); }
  check("H7", "the shared date range, last month: 'No data in this range.'", (await text(t, "#history-empty")) === "No data in this range.", await main(t));
  await SHOT(t, "h-norange-hr-1280-light");
  await go(n, P.hist, "fin");
  check("H8", "Finance can't open the history (403)", path_(t).endsWith("errors/403.html"));
  await SHOT(t, "h-noaccess-fin-1280-light");
  await n.ctx.close();
}

// ---------- E ----------
if (ONLY.includes("E")) {
  console.log("\n--- E. Export ---");
  const n = await make("hr");
  const t = n.t;
  await go(n, P.users, "hr");
  await t.click("#export-open"); await sleep(t, 300);
  check("E1", "unfiltered: the dialog says 'All 10 you can see', offers CSV / Excel and the full numbers choice (HR has pii:view)", (await dialogOpen(t)) === 1 && (await text(t, "#export-rows")).startsWith("All 10 you can see") && (await t.locator("#export-full").count()) === 1 && (await t.getByRole("radio", { name: "Excel (.xlsx)" }).count()) === 1);
  await SHOT(t, "e-dialog-hr-1280-light");
  const all = await grab(t, () => t.click("#export-go"));
  const lines = csvText(all.buf).trim().split("\r\n");
  check("E2", "CSV: employees-2026-11-23.csv, BOM, 10 rows, dates YYYY-MM-DD in the header, PAN masked", all.name === "employees-2026-11-23.csv" && bom(all.buf) && lines.length === 11 && lines[0].includes("Date of joining (YYYY-MM-DD)") && /••••••\w{4}/.test(csvText(all.buf)) && (await dialogOpen(t)) === 0, lines[0]);
  check("E3", "a toast says what was downloaded", /Downloaded employees-2026-11-23\.csv \(10 rows\)/.test(await t.evaluate(() => document.body.innerText)));
  await t.getByLabel("Search users").fill("rohan"); await sleep(t, 300);
  await t.click("#export-open"); await sleep(t, 300);
  check("E4", "filtered: 'Matching the filters: 1 of 10: Search: \"rohan\"' or 'Everyone you can see'", (await text(t, "#export-rows")).includes("1 of 10: Search: \"rohan\"") && (await t.locator("input[name=export-rows]").count()) === 2);
  await t.check("#export-full");
  await t.getByRole("radio", { name: "Excel (.xlsx)" }).click();
  const one = await grab(t, () => t.click("#export-go"));
  check("E5", "matching + Excel + full numbers: employees-2026-11-23.xlsx, a zip", one.name === "employees-2026-11-23.xlsx" && one.buf[0] === 0x50);
  const ev = await t.evaluate(() => JSON.parse(localStorage.getItem("officeos:audit-trail")).events.filter((e) => e.kind === "export-done").map((e) => e.detail));
  check("E6", "the audit trail: both exports, the second '1 rows (Search: \"rohan\"), XLSX, sensitive values IN FULL'", ev.length === 2 && /1 rows \(Search: "rohan"\), XLSX, sensitive values IN FULL/.test(ev[1]) && /masked/.test(ev[0]), j(ev));
  await go(n, P.pay, "fin");
  check("E7", "Finance's Export pay details: the pay and bank columns (Bank account, PAN masked), no full-numbers choice", (await text(t, "h1")) === "Export pay details" && (await text(t, "#pay-export-columns")).includes("Bank account: masked (the last 4 digits)") && !(await text(t, "#pay-export-columns")).includes("Aadhaar"));
  await SHOT(t, "e-pay-fin-1280-light");
  await t.click("#pay-export-open"); await sleep(t, 300);
  check("E8", "its dialog: no full-numbers box, 'masked' said; 'All 10 people you can see, one row each.'", (await t.locator("#export-full").count()) === 0 && (await text(t, "#export-sensitive")).includes("masked") && (await text(t, "#export-rows")) === "All 10 people you can see, one row each.");
  await SHOT(t, "e-pay-dialog-fin-1280-light");
  const pay = await grab(t, () => t.click("#export-go"));
  const payText = csvText(pay.buf);
  check("E9", "the file: employees-pay-2026-11-23.csv, its header the pay columns only, every account masked", pay.name === "employees-pay-2026-11-23.csv" && payText.startsWith("Employee ID,Status,Full name,Department,Bank account,IFSC") && !/\b\d{9,18}\b/.test(payText), payText.split("\r\n")[0]);
  await n.ctx.close();
}

// ---------- K ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard ---");
  const n = await make("hr");
  const t = n.t;
  await go(n, P.imp, "hr");
  await t.focus("#import-file");
  const [chooser] = await Promise.all([t.waitForEvent("filechooser", { timeout: 5000 }).catch(() => null), t.keyboard.press("Space")]);
  check("K1", "the file input takes the focus (inside the drop zone, which shows the ring) and Space opens the file picker", chooser !== null && (await t.evaluate(() => getComputedStyle(document.querySelector("#drop-zone")).outlineStyle)) !== "none");
  if (chooser) await chooser.setFiles({ name: "kb.csv", mimeType: "text/csv", buffer: Buffer.from(csv([R("Key Board", "key.board@northwind.com")])) });
  await sleep(t, 300);
  await t.focus("#check-file"); await t.keyboard.press("Enter"); await sleep(t, 700);
  check("K2", "Enter on Check: the Check step, focus on its heading (read out), the summary in a live region", (await t.evaluate(() => document.activeElement?.id)) === "step-title" && (await text(t, "#import-status")).startsWith("1 will be imported"));
  await t.focus("#to-confirm"); await t.keyboard.press("Enter"); await sleep(t, 300);
  await t.focus("#do-import"); await t.keyboard.press("Enter"); await sleep(t, 800);
  check("K3", "...Confirm and Import by keyboard too", (await t.locator("#done-card").count()) === 1 && (await t.evaluate(() => document.activeElement?.id)) === "step-title");
  await go(n, P.users, "hr");
  await t.focus("#export-open"); await t.keyboard.press("Enter"); await sleep(t, 300);
  check("K4", "the export dialog by keyboard: focus inside it, Tab stays in, Esc closes and focus returns to Export", (await t.evaluate(() => document.querySelector(".modal.is-open")?.contains(document.activeElement))) === true);
  for (let i = 0; i < 8; i++) await t.keyboard.press("Tab");
  const inside = await t.evaluate(() => document.querySelector(".modal.is-open")?.contains(document.activeElement));
  await t.keyboard.press("Escape"); await sleep(t, 300);
  check("K5", "...Tab stays inside; Esc closes; focus back on Export", inside === true && (await dialogOpen(t)) === 0 && (await t.evaluate(() => document.activeElement?.id)) === "export-open");
  await go(n, P.imp, "hr");
  const unnamed = await t.evaluate(() => [...document.querySelectorAll("main button, main a, main input")].filter((b) => !(b.getAttribute("aria-label") || b.textContent.trim() || b.labels?.length)).length);
  check("K6", "every button, link and input on Import employees has a name", unnamed === 0, unnamed);
  await n.ctx.close();
}

// ---------- X ----------
// every screen and state: [name, who, setup(n)]
const STATES = [
  ["upload", "hr", async (n) => { await go(n, P.imp, "hr"); }],
  ["upload-error", "hr", async (n) => { await go(n, P.imp, "hr"); await put(n.t, "a-file-with-a-rather-long-name-for-the-phone-width-check.pdf", Buffer.from("%PDF"), "application/pdf"); await n.t.click("#check-file"); await sleep(n.t, 400); }],
  ["upload-big", "hr", async (n) => { await go(n, P.imp, "hr"); await put(n.t, "big.csv", Buffer.alloc(2 * 1024 * 1024 + 5, 0x41)); await sleep(n.t, 300); }],
  ["upload-chosen", "hr", async (n) => { await go(n, P.imp, "hr"); await put(n.t, "joiners-november-2026.csv", GOOD); await sleep(n.t, 300); }],
  ["check", "hr", async (n) => { await toCheck(n); }],
  ["stale", "hr", async (n) => { await toCheck(n, csv([R("Late", "late@northwind.com")])); await n.t.click("#to-confirm"); await sleep(n.t, 300); await n.ctx.clock.setFixedTime(new Date("2026-11-23T10:31:00+05:30")); await n.t.click("#do-import"); await sleep(n.t, 500); await n.ctx.clock.setFixedTime(new Date(NOW)); }],
  ["headers", "hr", async (n) => { await go(n, P.imp, "hr"); await put(n.t, "headers.csv", "Full name,Salary\r\nA,1"); await n.t.click("#check-file"); await sleep(n.t, 400); }],
  ["check-none-ready", "hr", async (n) => { await toCheck(n, csv([R("Bad", "bad", { Mobile: "1" })])); }],
  ["confirm", "hr", async (n) => { await toCheck(n); await n.t.click("#to-confirm"); await sleep(n.t, 300); }],
  ["done", "admin", async (n) => { await toCheck(n, csv([R("Wide Person With A Long Name", "wide.person.with.a.long.email@northwind.com"), R("Bad", "x", { Mobile: "1" })])); await n.t.click("#to-confirm"); await sleep(n.t, 300); await n.t.click("#do-import"); await sleep(n.t, 900); }],
  ["history", "admin", async (n) => { await go(n, P.hist, "admin"); }],
  ["history-details", "admin", async (n) => { await go(n, P.hist, "admin"); await n.t.locator("[data-entry]").first().click(); await sleep(n.t, 400); }],
  ["users", "admin", async (n) => { await go(n, P.users, "admin"); }],
  ["export-dialog", "admin", async (n) => { await go(n, P.users, "admin"); await n.t.getByLabel("Search users").fill("a"); await sleep(n.t, 200); await n.t.click("#export-open"); await sleep(n.t, 300); }],
  ["pay", "fin", async (n) => { await go(n, P.pay, "fin"); }],
  ["pay-dialog", "admin", async (n) => { await go(n, P.pay, "admin"); await n.t.click("#pay-export-open"); await sleep(n.t, 300); }],
  ["history-empty", "hr", async (n) => { await n.t.evaluate(() => localStorage.removeItem("officeos:import-history")); await go(n, P.hist, "hr"); }],
  ["no-access", "emp", async (n) => { await go(n, P.imp, "emp"); }],
];
let screens = 0;
if (ONLY.includes("X")) {
  console.log("\n--- X. Widths and themes ---");
  for (const [w, theme] of [[412, "light"], [768, "light"], [1280, "light"], [412, "dark"], [1280, "dark"]]) {
    const n = await make("hr", { width: w, theme });
    const bad = [];
    for (const [name, who, setup] of STATES) {
      n.who = who;
      await setup(n);
      const r = await n.t.evaluate(() => ({ page: document.documentElement.scrollWidth <= window.innerWidth + 1, wide: [...document.querySelectorAll("main table, .modal.is-open table")].filter((tb) => tb.scrollWidth > (tb.closest(".table-wrap, .ds-card__body, .card, .modal__body, main")?.clientWidth ?? 0) + 2).map((tb) => tb.id) }));
      if (!r.page || r.wide.length) bad.push(`${name} ${j(r)}`);
      await SHOT(n.t, `x-${name}-${who}-${w}-${theme}`);
      screens += 1;
      if (await dialogOpen(n.t)) { await n.t.keyboard.press("Escape"); await sleep(n.t, 200); }
    }
    check(`X1.${w}.${theme}`, `${w}px ${theme}: ${STATES.length} screens and states, none scrolls sideways, no table wider than its card`, bad.length === 0, bad.join(" | "));
    await n.ctx.close();
  }
  console.log(`screens shot: ${screens}`);
}

// ---------- Z ----------
if (ONLY.includes("Z")) {
  console.log("\n--- Z. Contrast, errors ---");
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  for (const theme of ["light", "dark"]) {
    const m = await make("hr", { theme });
    const low = [];
    let total = 0;
    for (const name of ["check", "history", "upload-error", "pay"]) {
      const [, who, setup] = STATES.find((s) => s[0] === name);
      m.who = who;
      if (name === "history") { await toCheck(m); await m.t.click("#to-confirm"); await sleep(m.t, 300); await m.t.click("#do-import"); await sleep(m.t, 800); }
      await setup(m);
      const chips = await m.t.evaluate(() => {
        const probe = document.createElement("canvas").getContext("2d");
        const rgb = (css) => { probe.fillStyle = "#000"; probe.fillStyle = css; const v = probe.fillStyle; const mm = /^#([0-9a-f]{6})$/i.exec(v); if (mm) return [0, 2, 4].map((i) => parseInt(mm[1].slice(i, i + 2), 16)); const q = /rgba?\(([^)]+)\)/.exec(v); return q ? q[1].split(",").slice(0, 3).map(Number) : [0, 0, 0]; };
        const root = getComputedStyle(document.documentElement);
        const token = (nm) => rgb(root.getPropertyValue(nm).trim());
        const out = [];
        for (const el of document.querySelectorAll("main .ds-pill, main .ix-sub, main .ix-lead, main .ds-note, main .ix-drop__hint, main .ix-file__size, main .ix-columns small")) {
          const cs = getComputedStyle(el);
          const bgs = cs.backgroundColor === "rgba(0, 0, 0, 0)" ? [token("--ds-surface-1"), token("--ds-surface-2")] : [rgb(cs.backgroundColor)];
          out.push({ label: el.textContent.trim().slice(0, 30), fg: rgb(cs.color), bgs });
        }
        return out;
      });
      total += chips.length;
      for (const c of chips) for (const b of c.bgs) if (ratio(c.fg, b) < 4.5) low.push(`${name} "${c.label}" ${ratio(c.fg, b).toFixed(2)}`);
    }
    check(`Z1.${theme}`, `${theme}: every chip, note, hint and sub-line on the import pages reaches 4.5:1 (${total} read)`, total >= 20 && low.length === 0, j(low.slice(0, 5)));
    await m.ctx.close();
  }
}

console.log("\n--- E. Errors ---");
check("Z9", "no page or console errors", errs.length === 0, errs.slice(0, 5).join(" | "));
console.log(`\ni1: passed ${passed}, failed ${failed}`);
await browser.close();
stop();
process.exit(failed ? 1 : 0);