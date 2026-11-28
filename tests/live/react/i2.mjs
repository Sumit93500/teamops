// I2's harness (msedge, headless): the next import pages and Export data on the I2 data layer, and I1's pages after the wizard was shared.
// Read by meaning (words, attributes, storage, the files downloaded), never by pixels.
// usage: node i2.mjs <app dist> <repo root> <shots dir>   [ONLY=AFHEXZ]
// Clock: Fri 27 Nov 2026 10:00 IST. The IT person is made in the test (nobody is seeded with the role).
//   A  who may open each page (Admin, HR, Finance, an employee, a manager, IT) and the sidebar's new items
//   F  each form through the wizard: the template's name, Check (the counts, the problems in words), Confirm's words, Done (what was made),
//      the error report; what was stored
//   H  Import history: the new entries with their generic file names; an I2 entry's details list no people
//   E  Export data: the cards each role gets, the dialog's dates, a refusal in words, the file (name, masked numbers), the full numbers only
//      for someone who may Show them
//   X  no sideways scroll at 412, 768 and 1280, light and dark, on every screen and state; shots for the eye
//   Z  contrast of the chips, notes and sub-lines, light and dark; no ISO date or record id in what a person reads; no page or console errors
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, ROOT, SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "AFHEXZ";
const PORT = process.env.PORT ?? "9978";
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
const NOW = "2026-11-27T10:00:00+05:30";
const j = JSON.stringify;
const P = { assets: "inventory/import-assets.html", stock: "inventory/import-stock.html", lic: "it/import-licences.html", leave: "leave/import-balances.html", att: "attendance/import-corrections.html",
  exp: "system/export-data.html", hist: "people/import-history.html", imp: "people/import-employees.html" };

async function make(who, { width = 1280, theme = "light" } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata", colorScheme: theme, acceptDownloads: true });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(NOW));
  await ctx.addInitScript(([th, w]) => {
    if (localStorage.getItem("i2:seeded")) return;
    localStorage.clear();
    localStorage.setItem("i2:seeded", "1");
    localStorage.setItem("officeos:prefs", JSON.stringify({ theme: th }));
    localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
    localStorage.setItem(`officeos:prefs:${w[1]}`, JSON.stringify({ theme: th }));
    for (const id of ["EMP-1001", "EMP-1003", "EMP-1008", "EMP-1105", "EMP-1029", "EMP-1106"]) localStorage.setItem(`officeos:prefs:${id}`, JSON.stringify({ theme: th }));
  }, [theme, WHO[who]]);
  const t = await ctx.newPage();
  t.on("pageerror", (e) => errs.push(`${who}: ${e.message}`));
  t.on("console", (m) => { if (m.type() === "error" && !/storage: failed/.test(m.text())) errs.push(`${who}: console ${m.text()}`); });
  await t.goto(N + "/pages/auth/login.html"); await t.waitForLoadState("load");
  const n = { ctx, t, who };
  await addIt(n);
  return n;
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
const SHOT = async (t, name) => { try { await t.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true }); } catch {} };
const dialogOpen = (t) => t.locator(".modal.is-open").count();
const grab = async (t, click) => { const [d] = await Promise.all([t.waitForEvent("download", { timeout: 15000 }), click()]); return { name: d.suggestedFilename(), buf: fs.readFileSync(await d.path()) }; };
const csvText = (buf) => buf.toString("utf8").replace(/^﻿/, "");
const history = (t) => t.evaluate(() => JSON.parse(localStorage.getItem("officeos:import-history") ?? "null")?.entries ?? []);
const put = (t, name, body) => t.setInputFiles("#import-file", { name, mimeType: "text/csv", buffer: Buffer.from(body, "utf8") });
const csv = (list) => list.map((r) => r.map((v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, "\"\"")}"` : v)).join(",")).join("\r\n");
const ISO = /\b20\d\d-\d\d-\d\d\b/;
const IDS = /\b(?:FA|ITM|SM|LIC|SEAT|IH|LO|RG|AT|LV)-\d+\b/;

// the files (each good row once per browser context)
const FILES = {
  assets: [P.assets, "it", "Rohan's asset list.csv", csv([["Name", "Category", "Make and model", "Serial number", "Purchase date", "Purchase price", "Office"],
    ["Lenovo ThinkPad E14 for the new joiners in Finance", "Laptop", "Lenovo E14 Gen 5", "SN-UI-1", "2026-10-01", "72000", "Head office"], ["Desk", "Access card", "", "", "2026-10-01", "100", "Head office"], ["Chair", "Furniture", "", "", "2027-01-01", "x", "Mars"]])],
  stock: [P.stock, "it", "stock take.csv", csv([["Item", "Category", "Unit", "Opening quantity", "As of"], ["A4 paper 75 gsm", "Stationery", "ream", "40", "2026-11-01"], ["Mugs", "Pantry", "", "12", "2026-11-01"]])],
  lic: [P.lic, "it", "licences.csv", csv([["Software", "Seats", "Renewal date"], ["Adobe Acrobat Pro", "15", "2027-06-30"], ["Microsoft 365 Business Standard", "10", "2027-01-31"]])],
  leave: [P.leave, "hr", "Arjun and Rohan balances.csv", csv([["Employee", "Leave type", "Days left", "As of"], ["EMP-1105", "Earned", "5", "2026-11-20"], ["rohan.gupta@northwind.com", "Casual", "3.5", "2026-11-20"], ["EMP-1003", "Casual", "2", "2026-11-20"]])],
  att: [P.att, "hr", "corrections.csv", csv([["Employee", "Date", "What to correct", "Correct time", "Reason"], ["EMP-1106", "2026-11-25", "Missed check-in", "09:40", "Badge reader down at the gate"], ["EMP-1106", "2026-11-30", "Missed check-in", "09:40", "Future day"]])],
};
const toCheck = async (n, key) => { const [page, who, name, body] = FILES[key]; n.who = who; await go(n, page, who); await put(n.t, name, body); await sleep(n.t, 300); await n.t.click("#check-file"); await sleep(n.t, 800); };
const toConfirm = async (n, key) => { await toCheck(n, key); await n.t.click("#to-confirm"); await sleep(n.t, 300); };
const toDone = async (n, key) => { await toConfirm(n, key); await n.t.click("#do-import"); await sleep(n.t, 1200); };

// ---------- A ----------
if (ONLY.includes("A")) {
  console.log("\n--- A. Who may open what ---");
  const n = await make("admin");
  const OPEN = { assets: ["admin", "it"], stock: ["admin", "it"], lic: ["admin", "it"], leave: ["admin", "hr"], att: ["admin", "hr"], exp: ["admin", "hr", "fin"] };
  for (const [k, ok] of Object.entries(OPEN)) {
    const got = [];
    for (const who of ["admin", "hr", "fin", "emp", "mgr", "it"]) { await go(n, P[k], who); if (!/403/.test(path_(n.t))) got.push(who); }
    check(`A1.${k}`, `${P[k]} opens for ${ok.join(", ")} only (the others get the 403 page)`, j(got) === j(ok), j(got));
  }
  const want = { admin: ["Import assets", "Import stock counts", "Import licences", "Import leave balances", "Import attendance corrections", "Export data"], hr: ["Import leave balances", "Import attendance corrections", "Export data"],
    fin: ["Export data"], emp: [], mgr: [], it: ["Import assets", "Import stock counts", "Import licences"] };
  const NEWITEMS = want.admin;
  for (const [who, list] of Object.entries(want)) {
    await go(n, "dashboard/employee.html", who); await go(n, who === "it" ? "dashboard/employee.html" : "dashboard/employee.html", who);
    const items = (await sidebar(n.t)).filter((x) => NEWITEMS.includes(x));
    check(`A2.${who}`, `${WHO[who][0]}'s sidebar has the new items they may use: ${list.join(", ") || "none"}`, j([...new Set(items)].sort()) === j([...list].sort()), j(items));
  }
  await go(n, P.exp, "hr");
  check("A3", "Export data: HR gets leave, attendance, visits, work tasks and the payroll register (no expenses)", j(await n.t.evaluate(() => [...document.querySelectorAll("#export-cards .ds-card")].map((c) => c.id))) === j(["export-leave", "export-attendance", "export-visits", "export-tasks", "export-payroll"]));
  await go(n, P.exp, "fin");
  check("A4", "Finance gets expenses and the payroll register", j(await n.t.evaluate(() => [...document.querySelectorAll("#export-cards .ds-card")].map((c) => c.id))) === j(["export-expenses", "export-payroll"]));
  await go(n, P.exp, "admin");
  check("A5", "the Admin gets no expenses card (the expense files are Finance's)", !(await n.t.evaluate(() => Boolean(document.querySelector("#export-expenses")))) && (await n.t.evaluate(() => document.querySelectorAll("#export-cards .ds-card").length)) === 5);
  await go(n, "access/roles-list.html", "admin");
  const counts = await n.t.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-cell='permissions']")].map((c) => [c.closest("tr").innerText.split("\n")[0].trim(), c.innerText.trim()])));
  check("A6", "the roles list counts (I2): Admin 137 / 141, HR Manager 77 / 141, Finance Manager 62 / 141, Employee 34 / 141", j(counts) === j({ Admin: "137 / 141", "HR Manager": "77 / 141", "Finance Manager": "62 / 141", Employee: "34 / 141" }), j(counts));
  await n.ctx.close();
}

// ---------- F ----------
if (ONLY.includes("F")) {
  console.log("\n--- F. Each form through the wizard ---");
  const n = await make("it");
  // the assets
  n.who = "it"; await go(n, P.assets, "it");
  const tpl = await grab(n.t, () => n.t.click("#template-csv"));
  check("F1", "the template is named for the form and starts with its headers", tpl.name === "assets-template.csv" && csvText(tpl.buf).startsWith("Name,Category,Make and model,Serial number,Purchase date,Purchase price,Vendor,Invoice reference,Warranty end,Office"), tpl.name);
  const tx = await grab(n.t, () => n.t.click("#template-xlsx"));
  check("F2", "the Excel template too", tx.name === "assets-template.xlsx" && tx.buf[0] === 0x50 && tx.buf[1] === 0x4b);
  await toCheck(n, "assets");
  check("F3", "Check: the summary in words, the counts, the problems with their rows", /1 will be imported, 2 have errors, 0 duplicates\./.test(await text(n.t, "#check-summary")) && (await text(n.t, '[data-kpi="kpi-ready"] .ds-kpi__value, #kpi-ready .ds-kpi__value')) === "1"
    && j((await rows(n.t, "#problems-table")).map((r) => r.slice(0, 3).join(" | "))) === j(["3 | Category | access cards are stock items: import them as stock opening balances", "4 | Purchase date | can't be in the future", "4 | Purchase price | an amount in rupees, like 85000 (at most 2 decimals)", "4 | Office | no active office called \"Mars\""]), j(await rows(n.t, "#problems-table")));
  check("F4", "the first rows show the file's own words", (await rows(n.t, "#preview-table"))[0].slice(1, 4).join(" | ") === "Lenovo ThinkPad E14 for the new joiners in Finance | Laptop | Head office", j((await rows(n.t, "#preview-table"))[0]));
  const er = await grab(n.t, () => n.t.click("#error-report"));
  check("F5", "the error report: Row, Column, Problem; named for the form", /^assets-import-errors-2026-11-27\.csv$/.test(er.name) && csvText(er.buf).startsWith("Row,Column,Problem\r\n3,Category,"), er.name);
  await n.t.click("#to-confirm"); await sleep(n.t, 300);
  const conf = await text(n.t, "#confirm-list");
  check("F6", "Confirm in plain words", /1 new asset will be added to the register, in store, from Rohan's asset list\.csv\./.test(conf) && /2 rows have problems and will be skipped\. Nothing on the register is changed\./.test(conf) && /next free tag/.test(conf) && (await text(n.t, "#do-import")) === "Import 1 asset", conf);
  await n.t.click("#do-import"); await sleep(n.t, 1200);
  check("F7", "Done: the summary, the asset with its tag and a link to it", (await text(n.t, "#done-summary")) === "1 asset was added; 2 rows were skipped." && /Lenovo ThinkPad E14.*AST-\d{4}/.test((await rows(n.t, "#made-table"))[0].join(" ")) && (await n.t.locator("#made-table a").first().getAttribute("href")).includes("items.html?tag=AST-"), j(await rows(n.t, "#made-table")));
  check("F8", "the history keeps the generic name, never the uploaded one", (await history(n.t)).filter((e) => e.form === "assets").every((e) => e.fileName === "assets-file.csv") && !j(await history(n.t)).includes("Rohan"));
  // the stock counts
  await toCheck(n, "stock");
  check("F9", "stock counts: a new item without a unit is refused in words", /1 will be imported, 1 has errors/.test(await text(n.t, "#check-summary")) && (await rows(n.t, "#problems-table"))[0].join(" | ") === "3 | Unit | required for a new item");
  await n.t.click("#to-confirm"); await sleep(n.t, 300); await n.t.click("#do-import"); await sleep(n.t, 1200);
  const ledger = await stored(n.t, "officeos:stock-ledger");
  check("F10", "Done: one count recorded, as a stock in with the reason", (await text(n.t, "#done-summary")) === "1 count was recorded; 1 row was skipped." && ledger.movements.some((m) => m.reason === "Opening balance (imported)" && m.qty === 40), await text(n.t, "#done-summary"));
  // the licences
  await toDone(n, "lic");
  check("F11", "licences: the one that has an active licence is a duplicate; the other is added, with no seat", (await text(n.t, "#done-summary")) === "1 licence was added; 1 row was skipped." && (await stored(n.t, "officeos:it-licences")).licences.some((l) => l.software === "Adobe Acrobat Pro" && l.seats === 15));
  // leave balances
  await toCheck(n, "leave");
  check("F12", "leave balances (HR): your own row refused in words", (await rows(n.t, "#problems-table"))[0].join(" | ") === "4 | Employee | your own balance can't be imported by you: someone else in HR imports it");
  await n.t.click("#to-confirm"); await sleep(n.t, 300);
  const lc = await text(n.t, "#confirm-list");
  check("F13", "Confirm says what happens to the balance, and that the app shows it from the policy's start (1 Dec 2026)", /2 balances will be set/.test(lc) && /counts on by the leave policy/.test(lc) && /from the leave policy's start, 1 Dec 2026\./.test(lc), lc);
  await n.t.click("#do-import"); await sleep(n.t, 1200);
  check("F14", "Done: the balances set, each person linked to their profile, the date in words", (await text(n.t, "#done-summary")) === "2 balances were set; 1 row was skipped." && (await rows(n.t, "#made-table")).some((r) => r.join(" | ") === "2 | Arjun Kapoor | Earned leave | 5 | 20 Nov 2026"), j(await rows(n.t, "#made-table")));
  check("F15", "stored as leave openings, nothing else", (await stored(n.t, "officeos:leave-openings")).rows.length === 2);
  // attendance corrections
  await toCheck(n, "att");
  check("F16", "attendance corrections: a future day refused", (await rows(n.t, "#problems-table"))[0].join(" | ") === "3 | Date | can't be in the future");
  await n.t.click("#to-confirm"); await sleep(n.t, 300);
  check("F17", "Confirm: recorded as approved by you; the day's rules follow", /1 correction will be recorded, as approved by you/.test(await text(n.t, "#confirm-list")) && /late marks follow the corrected times/.test(await text(n.t, "#confirm-list")));
  await n.t.click("#do-import"); await sleep(n.t, 1200);
  check("F18", "Done: the correction with the person, the date in words and what was corrected", (await rows(n.t, "#made-table"))[0].join(" | ") === "2 | Isha Kulkarni | 25 Nov 2026 | Missed check-in: 09:40", j(await rows(n.t, "#made-table")));
  check("F19", "the correction is approved, by HR, and the day is written", (await stored(n.t, "officeos:regularizations")).records?.some((r) => r.userId === "EMP-1106" && r.status === "approved" && r.importedBy === "EMP-1003") && (await stored(n.t, "officeos:attendance")).records?.some((r) => r.userId === "EMP-1106" && r.date === "2026-11-25" && r.checkIn === "09:40"));
  // a second confirm of a used check
  await toCheck(n, "lic");
  check("F20", "a file whose rows are all on record already: nothing ready, Continue is off, the note says what to do", (await n.t.locator("#to-confirm").isDisabled()) && /^0 will be imported/.test(await text(n.t, "#check-summary") ?? "") && /No row is ready to import/.test(await text(n.t, "#none-ready") ?? ""));
  // I1's page, now on the shared wizard
  await go(n, P.imp, "hr");
  check("F21", "Import employees still reads as before (its own words, on the shared wizard)", (await text(n.t, "h1")) === "Import employees" && /notes listing the departments, designations, offices and shifts/.test(await main(n.t)));
  await n.ctx.close();
}

// ---------- H ----------
if (ONLY.includes("H")) {
  console.log("\n--- H. Import history ---");
  const n = await make("it");
  await toDone(n, "lic");
  await go(n, P.hist, "admin");
  const all = await rows(n.t, "#history-table");
  check("H1", "the new entries read as what they are, with the generic file name", all.some((r) => /Import licences/.test(r[1]) && /licences-file\.csv/.test(r[2])) && !all.some((r) => /licences\.csv/.test(r[2]) && !/licences-file/.test(r[2])), j(all.slice(0, 3)));
  await n.t.locator("[data-entry]").first().click(); await sleep(n.t, 400);
  const dlg = await text(n.t, "#entry-dialog");
  check("H2", "an I2 entry's details: what, the file, the counts; no people list", /Import licences/.test(dlg) && /licences-file\.csv/.test(dlg) && !(await n.t.evaluate(() => Boolean(document.querySelector("#entry-created")))), dlg?.slice(0, 200));
  await n.ctx.close();
}

// ---------- E ----------
if (ONLY.includes("E")) {
  console.log("\n--- E. Export data ---");
  const n = await make("hr");
  await go(n, P.exp, "hr");
  await n.t.click("#export-open-leave"); await sleep(n.t, 300);
  check("E1", "the dialog: dates from the 1st of the month to today, CSV or Excel, no full-numbers choice for leave", (await n.t.inputValue("#export-from")) === "2026-11-01" && (await n.t.inputValue("#export-to")) === "2026-11-27" && !(await n.t.evaluate(() => Boolean(document.querySelector("#export-full")))));
  await n.t.fill("#export-from", "2026-12-01"); await sleep(n.t, 100);
  await n.t.click("#export-go"); await sleep(n.t, 500);
  const e2 = await text(n.t, "#export-error");
  check("E2", "a backwards range is refused in words, with no ISO date", e2 === "The start date is after the end date: swap them." && !ISO.test(e2), e2);
  await n.t.fill("#export-from", "2026-01-01"); await sleep(n.t, 100);
  const lf = await grab(n.t, () => n.t.click("#export-go"));
  check("E3", "the leave file: named for the range, its header", lf.name === "leave-2026-01-01-to-2026-11-27.csv" && csvText(lf.buf).startsWith("Request ID,Employee ID,Employee,Department,Leave type"), lf.name);
  const h = (await history(n.t)).at(-1);
  check("E4", "logged with the dates in words", h.module === "leave" && h.filters === "1 Jan 2026 to 27 Nov 2026" && h.from === "2026-01-01", j(h));
  await go(n, P.exp, "hr");
  await n.t.click("#export-open-payroll"); await sleep(n.t, 300);
  check("E5", "payroll for HR (who may Show the numbers): the full-numbers choice", await n.t.evaluate(() => Boolean(document.querySelector("#export-full"))));
  await n.t.fill("#export-from", "2026-10-01"); await n.t.fill("#export-to", "2026-10-31"); await sleep(n.t, 100);
  const pf = await grab(n.t, () => n.t.click("#export-go"));
  const acct = (await stored(n.t, "officeos:users")).records.find((u) => u.id === "EMP-1001")?.bankAccount ?? "";
  check("E6", "payroll file: masked unless asked", pf.name === "payroll-2026-10-01-to-2026-10-31.csv" && acct.length > 4 && !csvText(pf.buf).includes(acct), pf.name);
  await go(n, P.exp, "fin");
  await n.t.click("#export-open-payroll"); await sleep(n.t, 300);
  check("E7", "Finance (no pii:view) gets no full-numbers choice", !(await n.t.evaluate(() => Boolean(document.querySelector("#export-full")))));
  await n.t.keyboard.press("Escape"); await sleep(n.t, 200);
  await n.t.click("#export-open-expenses"); await sleep(n.t, 300);
  await n.t.fill("#export-from", "2025-12-01"); await sleep(n.t, 100);
  const ef = await grab(n.t, () => n.t.click("#export-go"));
  check("E8", "Finance's expenses file", /^expenses-2025-12-01-to-2026-11-27\.csv$/.test(ef.name) && csvText(ef.buf).includes("Receipt attached"), ef.name);
  await go(n, P.exp, "emp");
  check("E9", "an employee gets the 403 page", /403/.test(path_(n.t)));
  await n.ctx.close();
}

// ---------- X ----------
const STATES = [
  ["assets-upload", "it", async (n) => { await go(n, P.assets, "it"); }],
  ["assets-check", "it", async (n) => { await toCheck(n, "assets"); }],
  ["assets-confirm", "it", async (n) => { await toConfirm(n, "assets"); }],
  ["assets-done", "it", async (n) => { await toDone(n, "assets"); }],
  ["stock-check", "it", async (n) => { await toCheck(n, "stock"); }],
  ["stock-done", "it", async (n) => { await toDone(n, "stock"); }],
  ["licences-check", "it", async (n) => { await toCheck(n, "lic"); }],
  ["licences-done", "it", async (n) => { await toDone(n, "lic"); }],
  ["leave-upload", "hr", async (n) => { await go(n, P.leave, "hr"); }],
  ["leave-check", "hr", async (n) => { await toCheck(n, "leave"); }],
  ["leave-confirm", "hr", async (n) => { await toConfirm(n, "leave"); }],
  ["leave-done", "hr", async (n) => { await toDone(n, "leave"); }],
  ["attendance-check", "hr", async (n) => { await toCheck(n, "att"); }],
  ["attendance-done", "hr", async (n) => { await toDone(n, "att"); }],
  ["export-hr", "hr", async (n) => { await go(n, P.exp, "hr"); }],
  ["export-fin", "fin", async (n) => { await go(n, P.exp, "fin"); }],
  ["export-dialog-payroll", "hr", async (n) => { await go(n, P.exp, "hr"); await n.t.click("#export-open-payroll"); await sleep(n.t, 300); }],
  ["export-dialog-error", "hr", async (n) => { await go(n, P.exp, "hr"); await n.t.click("#export-open-attendance"); await sleep(n.t, 300); await n.t.fill("#export-from", "2026-01-01"); await n.t.click("#export-go"); await sleep(n.t, 500); }],
  ["history", "admin", async (n) => { await go(n, P.hist, "admin"); }],
  ["history-details", "admin", async (n) => { await go(n, P.hist, "admin"); await n.t.locator("[data-entry]").first().click(); await sleep(n.t, 400); }],
  ["employees-upload", "hr", async (n) => { await go(n, P.imp, "hr"); }],
  ["no-access", "emp", async (n) => { await go(n, P.exp, "emp"); }],
];
let screens = 0;
if (ONLY.includes("X")) {
  console.log("\n--- X. Widths and themes ---");
  for (const [w, theme] of [[412, "light"], [768, "light"], [1280, "light"], [412, "dark"], [768, "dark"], [1280, "dark"]]) {
    const n = await make("hr", { width: w, theme });
    const bad = [], words = [];
    for (const [name, who, setup] of STATES) {
      n.who = who;
      try { await setup(n); } catch (e) { bad.push(`${name}: couldn't be used (${String(e.message).split("\n")[0]})`); if (await dialogOpen(n.t)) await n.t.keyboard.press("Escape"); continue; }
      const r = await n.t.evaluate(() => ({ page: document.documentElement.scrollWidth <= window.innerWidth + 1, wide: [...document.querySelectorAll("main table, .modal.is-open table")].filter((tb) => tb.scrollWidth > (tb.closest(".table-wrap, .ds-card__body, .card, .modal__body, main")?.clientWidth ?? 0) + 2).map((tb) => tb.id) }));
      if (!r.page || r.wide.length) bad.push(`${name} ${j(r)}`);
      // what a person reads (the notes, alerts, summaries, confirm lists, problem messages): no ISO date, no record id
      const said = await n.t.evaluate(() => [...document.querySelectorAll("main .ds-note, main [role=alert], #check-summary, #confirm-list, #done-summary, #problems-table td:last-child, .modal.is-open [role=alert]")].map((e) => e.innerText).join(" | "));
      if (/\b20\d\d-\d\d-\d\d\b/.test(said) || /\b(?:FA|ITM|SM|LIC|SEAT|IH|LO|RG|AT|LV)-\d+\b/.test(said)) words.push(`${name}: ${said.slice(0, 160)}`);
      await SHOT(n.t, `x-${name}-${who}-${w}-${theme}`);
      screens += 1;
      if (await dialogOpen(n.t)) { await n.t.keyboard.press("Escape"); await sleep(n.t, 200); }
    }
    check(`X1.${w}.${theme}`, `${w}px ${theme}: ${STATES.length} screens and states, none scrolls sideways, no table wider than its card`, bad.length === 0, bad.join(" | "));
    check(`X2.${w}.${theme}`, `${w}px ${theme}: no ISO date or record id in a message`, words.length === 0, words.join(" | "));
    await n.ctx.close();
  }
  console.log(`screens shot: ${screens}`);
}

// ---------- Z ----------
if (ONLY.includes("Z")) {
  console.log("\n--- Z. Contrast ---");
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  for (const theme of ["light", "dark"]) {
    const m = await make("hr", { theme });
    const low = [];
    let total = 0;
    for (const name of ["assets-check", "leave-confirm", "attendance-done", "export-hr", "export-dialog-error"]) {
      const [, who, setup] = STATES.find((s) => s[0] === name);
      m.who = who;
      await setup(m);
      const chips = await m.t.evaluate(() => {
        const probe = document.createElement("canvas").getContext("2d");
        const rgb = (css) => { probe.fillStyle = "#000"; probe.fillStyle = css; const v = probe.fillStyle; const mm = /^#([0-9a-f]{6})$/i.exec(v); if (mm) return [0, 2, 4].map((i) => parseInt(mm[1].slice(i, i + 2), 16)); const q = /rgba?\(([^)]+)\)/.exec(v); return q ? q[1].split(",").slice(0, 3).map(Number) : [0, 0, 0]; };
        const root = getComputedStyle(document.documentElement);
        const token = (nm) => rgb(root.getPropertyValue(nm).trim());
        const out = [];
        for (const el of document.querySelectorAll("main .ds-pill, main .ix-sub, main .ix-lead, main .ds-note, main .ix-drop__hint, main .ix-columns small, .modal.is-open .ix-sub, .modal.is-open .ix-date, .modal.is-open .ds-note")) {
          const cs = getComputedStyle(el);
          const bgs = cs.backgroundColor === "rgba(0, 0, 0, 0)" ? [token("--ds-surface-1"), token("--ds-surface-2")] : [rgb(cs.backgroundColor)];
          out.push({ label: el.textContent.trim().slice(0, 30), fg: rgb(cs.color), bgs });
        }
        return out;
      });
      total += chips.length;
      for (const c of chips) for (const b of c.bgs) if (ratio(c.fg, b) < 4.5) low.push(`${name} "${c.label}" ${ratio(c.fg, b).toFixed(2)}`);
      if (await dialogOpen(m.t)) { await m.t.keyboard.press("Escape"); await sleep(m.t, 200); }
    }
    check(`Z1.${theme}`, `${theme}: every chip, note, hint and sub-line on the new pages reaches 4.5:1 (${total} read)`, total >= 20 && low.length === 0, j(low.slice(0, 5)));
    await m.ctx.close();
  }
}

console.log("\n--- Errors ---");
check("Z9", "no page or console errors", errs.length === 0, errs.slice(0, 5).join(" | "));
console.log(`\ni2: passed ${passed}, failed ${failed}`);
await browser.close();
stop();