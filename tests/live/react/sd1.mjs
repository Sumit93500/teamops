// SD1's harness (msedge, headless): the sidebar by area, the menu and top-bar searches, the shared dashboards, the live IT desk, the
// to-do, announcements, help and the sign-in page's demo grid. Read by meaning (words, attributes, storage), never by pixels.
// usage: node sd1.mjs <app dist> <repo root> <shots dir>   [ONLY=NSBCDTAHLXZ]
// Clock: Fri 27 Nov 2026 10:00 IST. The IT person is made in the test (nobody is seeded with the role).
//   N  the sidebar: each role's groups, empty ones hidden; folding kept per person; the current page's group stays open
//   S  the menu search: "/" and Ctrl+/, only pages the person may open, Enter opens, Esc clears; the rail's "/" goes to the top bar
//   B  the top bar's search: pages, people (only those whose profile the person may open; name and department), own requests in words
//   C  the dashboards: greeting, office date, today's attendance, every Do next tile opens its page in one click, Needs you, announcements
//   D  the IT desk is live: a change in another tab and a change seen on focus move its numbers with no reload
//   T  the to-do: sections, one-line add, tick, tabs, empty states, personal tasks private
//   A  announcements: HR posts; the reader's bell and page; read on opening; edit, pin, take down
//   H  help: by role, every link opens
//   L  sign-in: one demo tile per role (IT off: nobody holds it); none with demo mode off
//   X  no sideways scroll at 412, 768 and 1280, light and dark; no ISO date or record id in what is read; shots
//   Z  contrast; no page or console errors
import { createRequire } from "node:module";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, ROOT, SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "NSBCDTAHLXZ";
const PORT = process.env.PORT ?? "9979";
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
const ISO = /\b20\d\d-\d\d-\d\d\b/, IDS = /\b(?:EMP|ITR|AN|ANN|WT|PT|LV|RG|EXP)-\d+\b/;

async function make(who, { width = 1280, theme = "light", sidebar = "expanded" } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata", colorScheme: theme, acceptDownloads: true });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(NOW));
  await ctx.addInitScript(([th, w, sb]) => {
    if (localStorage.getItem("sd1:seeded")) return;
    localStorage.clear();
    localStorage.setItem("sd1:seeded", "1");
    localStorage.setItem("officeos:prefs", JSON.stringify({ theme: th }));
    if (sb) localStorage.setItem("officeos:sidebar", JSON.stringify(sb));
    localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
    for (const id of ["EMP-1001", "EMP-1003", "EMP-1008", "EMP-1105", "EMP-1029", "EMP-1106"]) localStorage.setItem(`officeos:prefs:${id}`, JSON.stringify({ theme: th }));
  }, [theme, WHO[who], sidebar]);
  const t = await ctx.newPage();
  t.on("pageerror", (e) => errs.push(`${who}: ${e.message}`));
  t.on("console", (m) => { if (m.type() === "error" && !/storage: failed/.test(m.text())) errs.push(`${who}: console ${m.text()}`); });
  await t.goto(N + "/pages/auth/login.html"); await t.waitForLoadState("load");
  const n = { ctx, t, who };
  await addIt(n);
  return n;
}
const sleep = (t, ms = 350) => t.waitForTimeout(ms);
async function go(n, page, who) {
  if (who) await n.t.evaluate((w) => { localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 })); }, WHO[who]);
  await n.t.goto(N + "/pages/" + page); await n.t.waitForLoadState("load");
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
const SHOT = async (t, name) => { try { await t.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true }); } catch {} };
const dialogOpen = (t) => t.locator(".modal.is-open").count();
const groups = (t) => t.evaluate(() => [...document.querySelectorAll("#sidebar__nav .nav__section")].map((s) => s.dataset.group));
const tiles = (t) => t.evaluate(() => [...document.querySelectorAll("#dash-next [data-tile]")].map((a) => [a.dataset.tile, new URL(a.href).pathname + new URL(a.href).search]));
const LANDING = { admin: "dashboard/admin.html", hr: "dashboard/hr.html", fin: "dashboard/finance.html", emp: "dashboard/employee.html", mgr: "dashboard/employee.html", it: "dashboard/employee.html" };

// ---------- N ----------
if (ONLY.includes("N")) {
  console.log("\n--- N. The sidebar by area ---");
  const n = await make("emp");
  const want = {
    admin: ["Main", "My work", "Time & Attendance", "Money", "People", "IT & Assets", "System"],
    hr: ["Main", "My work", "Time & Attendance", "People", "IT & Assets", "System"],
    fin: ["Main", "My work", "Time & Attendance", "Money", "IT & Assets", "System"],
    emp: ["Main", "My work", "Time & Attendance"],
    mgr: ["Main", "My work", "Time & Attendance"],
    it: ["Main", "My work", "Time & Attendance", "IT & Assets"],
  };
  for (const who of Object.keys(want)) {
    await go(n, LANDING[who], who);
    const g = await groups(n.t);
    check(`N1.${who}`, `${WHO[who][0]}: the groups they may open, in order; empty ones not drawn`, j(g) === j(want[who]), j(g));
  }
  await go(n, LANDING.emp, "emp");
  const main = await n.t.evaluate(() => [...document.querySelectorAll('[data-group="Main"] .nav__item')].map((a) => a.textContent.trim()));
  check("N2", "Main: Dashboard, Announcements and Help (no Approvals for someone with none)", j(main) === j(["Dashboard", "Announcements", "Help"]), j(main));
  const fold = n.t.locator('[data-group="My work"] .nav__group-fold');
  await fold.click(); await sleep(n.t, 200);
  const hiddenNow = await n.t.evaluate(() => document.querySelector('[data-group="My work"] .nav__items').hidden);
  await go(n, LANDING.emp, "emp");
  const kept = await n.t.evaluate(() => ({ hidden: document.querySelector('[data-group="My work"] .nav__items').hidden, stored: JSON.parse(localStorage.getItem("officeos:nav-groups:EMP-1105")) }));
  check("N3", "a group folds from its heading, and stays folded for that person after a reload", hiddenNow && kept.hidden && j(kept.stored) === j(["My work"]), j(kept));
  await go(n, LANDING.mgr, "mgr");
  check("N4", "another person's sidebar isn't folded by it", !(await n.t.evaluate(() => document.querySelector('[data-group="My work"] .nav__items').hidden)));
  await go(n, "attendance/my-attendance.html", "emp");
  const cur = await n.t.evaluate(() => ({ hidden: document.querySelector('[data-group="My work"] .nav__items').hidden, disabled: document.querySelector('[data-group="My work"] .nav__group-fold').disabled }));
  check("N5", "the group of the page you're on is open, folded or not, and its heading can't fold it", !cur.hidden && cur.disabled, j(cur));
  await n.ctx.close();
}

// ---------- S ----------
if (ONLY.includes("S")) {
  console.log("\n--- S. The menu search ---");
  const n = await make("emp");
  await go(n, LANDING.emp, "emp");
  await n.t.keyboard.press("/"); await sleep(n.t, 150);
  check("S1", "\"/\" puts the cursor in Find a page", await n.t.evaluate(() => document.activeElement?.id === "menu-search"));
  await n.t.keyboard.type("leave"); await sleep(n.t, 200);
  const hits = await n.t.evaluate(() => [...document.querySelectorAll("#menu-search-results a span")].map((s) => s.textContent));
  check("S2", "only pages the person may open: an employee gets My leave and Apply for leave, not Leave approvals", hits.includes("My leave") && hits.includes("Apply for leave") && !hits.includes("Leave approvals"), j(hits));
  await n.t.keyboard.press("Escape"); await sleep(n.t, 100);
  check("S3", "Esc clears it", (await n.t.inputValue("#menu-search")) === "" && !(await n.t.evaluate(() => !!document.querySelector("#menu-search-results"))));
  await n.t.keyboard.type("payslip"); await n.t.keyboard.press("Enter"); await sleep(n.t, 600);
  check("S4", "Enter opens the first match", path_(n.t).endsWith("payroll/payslips.html"), path_(n.t));
  await n.t.locator("main").click({ position: { x: 5, y: 5 } }).catch(() => {});
  await n.t.keyboard.press("Control+/"); await sleep(n.t, 150);
  check("S5", "Ctrl+/ does the same", await n.t.evaluate(() => document.activeElement?.id === "menu-search"));
  await n.t.keyboard.type("zzzz"); await sleep(n.t, 150);
  check("S6", "no match says so", (await text(n.t, "#menu-search-results")) === "No page called that");
  await go(n, LANDING.hr, "hr");
  await n.t.keyboard.press("/"); await n.t.keyboard.type("leave"); await sleep(n.t, 200);
  const hrHits = await n.t.evaluate(() => [...document.querySelectorAll("#menu-search-results a span")].map((s) => s.textContent));
  check("S7", "HR finds Leave approvals and Leave policy too", hrHits.includes("Leave approvals") && hrHits.includes("Leave policy"), j(hrHits));
  await n.ctx.close();
  const r = await make("emp", { sidebar: "collapsed" });
  await go(r, LANDING.emp, "emp");
  await r.t.keyboard.press("/"); await sleep(r.t, 200);
  check("S8", "in the collapsed rail (no box) \"/\" goes to the top bar's search", await r.t.evaluate(() => document.activeElement?.closest("#topbar-search") !== null));
  await r.ctx.close();
}

// ---------- B ----------
if (ONLY.includes("B")) {
  console.log("\n--- B. The top bar's search ---");
  const n = await make("hr");
  const search = async (q) => { await n.t.fill("#topbar-search input", ""); await n.t.type("#topbar-search input", q); await sleep(n.t, 300);
    return n.t.evaluate(() => [...document.querySelectorAll("#search-results [role=option]")].map((o) => [o.querySelector("span")?.textContent ?? o.textContent, o.querySelector("[data-kind]")?.dataset.kind ?? "", o.querySelector("[data-kind]")?.textContent ?? ""])); };
  await go(n, LANDING.hr, "hr");
  const hr = await search("rohan");
  check("B1", "HR finds Rohan Gupta, with the department, linking to the profile", hr.some(([l, k, m]) => l === "Rohan Gupta" && k === "person" && m.length > 0) && hr.every(([l, , m]) => !IDS.test(l + m)), j(hr));
  await go(n, LANDING.emp, "emp");
  const emp = await search("rohan");
  check("B2", "an employee finds no person (no profile they may open)", !emp.some(([, k]) => k === "person"), j(emp));
  await go(n, LANDING.mgr, "mgr");
  const mgr = await search("rohan");
  check("B3", "a manager finds their direct report", mgr.some(([l, k]) => l === "Rohan Gupta" && k === "person"), j(mgr));
  const mgr2 = await search("aarav");
  check("B4", "...but nobody else", !mgr2.some(([, k]) => k === "person"), j(mgr2));
  await go(n, LANDING.emp, "emp");
  const req = await search("leave");
  const reqs = req.filter(([, k]) => k === "request");
  check("B5", "the person's own requests, in words with readable dates: no ISO date, no id", reqs.length > 0 && reqs.every(([l, , m]) => !ISO.test(l + m) && !IDS.test(l + m)) && reqs.some(([l]) => /leave, \d{1,2} [A-Z][a-z]{2}/.test(l)), j(reqs));
  await n.t.keyboard.press("Escape"); await sleep(n.t, 150);
  check("B6", "Esc closes the list", await n.t.evaluate(() => document.getElementById("search-results").hidden));
  await n.ctx.close();
}

// ---------- C ----------
if (ONLY.includes("C")) {
  console.log("\n--- C. The dashboards ---");
  const n = await make("emp");
  const TOP = {
    admin: ["approvals", "users", "roles", "itDesk", "payrollRun", "inventory", "announcements", "settings"],
    hr: ["approvals", "leaveApprovals", "users", "teamAttendance", "shifts", "importPeople", "announcements", "exportData"],
    fin: ["approvals", "payrollRun", "expenses", "salary", "tax", "exportData"],
    emp: ["mark", "applyLeave", "todo", "myRequests", "claim", "payslips", "myAttendance", "raiseIt"],
    mgr: ["approvals", "teamAttendance", "teamLeave", "teamTasks", "mark", "applyLeave", "todo", "myRequests"],
    it: ["itRequests", "itQueue", "licences", "offboarding", "mark", "applyLeave", "todo", "myRequests"],
  };
  for (const who of Object.keys(TOP)) {
    await go(n, LANDING[who], who);
    const g = await text(n.t, "#dash-greeting"), dt = await text(n.t, "#dash-date");
    const tl = await tiles(n.t);
    check(`C1.${who}`, `${WHO[who][0]}: the greeting by office time and the date in words`, g === `Good morning, ${WHO[who][0].split(" ")[0]}` && dt === "Friday, 27 Nov 2026", `${g} | ${dt}`);
    check(`C2.${who}`, `${WHO[who][0]}: Do next holds the role's main pages`, j(tl.map(([k]) => k)) === j(TOP[who]), j(tl.map(([k]) => k)));
    const bad = [];
    for (const [k, href] of tl) { await n.t.goto(N + href); await n.t.waitForLoadState("load"); await sleep(n.t, 250); if (/403|login/.test(path_(n.t))) bad.push(k); }
    check(`C3.${who}`, `${WHO[who][0]}: each tile opens its page in one click (no 403)`, bad.length === 0, j(bad));
    await go(n, LANDING[who], who);
    check(`C4.${who}`, `${WHO[who][0]}: Needs you and Announcements are drawn`, await n.t.evaluate(() => !!document.querySelector("#dash-attention") && document.querySelectorAll("#dash-announcements .dh-post").length > 0));
  }
  await go(n, LANDING.emp, "emp");
  check("C5", "today's attendance in words with Mark attendance beside it", /^(Not checked in yet|Checked in at \d\d:\d\d|Done for today)/.test(await text(n.t, "#dash-today") ?? "") && (await n.t.locator("#dash-mark").count()) === 1, await text(n.t, "#dash-today"));
  check("C6", "the employee's key numbers are kept", await n.t.evaluate(() => ["present", "balance", "payslip", "requests"].every((k) => document.querySelector(`[data-stat="${k}"]`))));
  await go(n, LANDING.admin, "admin");
  const att = await n.t.evaluate(() => [...document.querySelectorAll("#dash-attention [data-attention]")].map((li) => [li.dataset.attention, li.textContent]));
  check("C7", "the Admin's Needs you: approvals waiting, in words", att.some(([k, t]) => k === "approvals" && /approvals? (is|are) waiting for you/.test(t)), j(att));
  check("C8", "no My tasks card any more (its counts are the tiles and Needs you)", !(await n.t.evaluate(() => !!document.querySelector("#tasks-card"))));
  // a tile shows only when its page opens for that person: Finance with salary and tax access taken away (overrides on the record)
  await n.t.evaluate(() => { const box = JSON.parse(localStorage.getItem("officeos:users")); const k = box.records.find((x) => x.id === "EMP-1008"); k.denyPermissions = ["salary:view", "tax:view"]; localStorage.setItem("officeos:users", JSON.stringify(box)); });
  await go(n, LANDING.fin, "fin");
  const finTl = await tiles(n.t);
  const finBad = [];
  for (const [k, href] of finTl) { await n.t.goto(N + href); await n.t.waitForLoadState("load"); await sleep(n.t, 250); if (/403|login/.test(path_(n.t))) finBad.push(k); }
  check("C9", "a tile shows only when its page opens: Finance without salary and tax access has no Salary structure tile, and every tile left opens", !finTl.some(([k]) => k === "salary") && finBad.length === 0, j([finTl.map(([k]) => k), finBad]));
  await n.ctx.close();
}

// ---------- D ----------
if (ONLY.includes("D")) {
  console.log("\n--- D. The IT desk is live ---");
  const n = await make("it");
  await go(n, "it/dashboard.html", "it");
  const kpi = (t, id) => t.evaluate((i) => document.querySelector(`[data-kpi="${i}"] .ds-kpi__value`)?.textContent ?? null, id);
  const before = await kpi(n.t, "kpi-open");
  const b = await n.ctx.newPage();
  await b.goto(N + "/pages/it/new.html"); await b.waitForLoadState("load"); await sleep(b, 300);
  // another tab raises a request (written as the store writes it): the storage event reaches the dashboard
  await b.evaluate(() => {
    const box = JSON.parse(localStorage.getItem("officeos:it-desk") ?? "null");
    const at = new Date().toISOString();
    const base = box ?? { version: 1, next: { req: 1, tl: 1, act: 1, note: 1 }, requests: [], timeline: [], activity: [], notices: [], sla: null };
    const id = `ITR-${base.next.req}`;
    base.requests.push({ id, type: "it-issue", requesterId: "EMP-1105", subjectPersonId: null, title: "Printer on 2 is jammed", details: "", priority: "normal", status: "open", assignedTo: null, dueAt: "2026-11-28T04:30:00.000Z", createdAt: at, payload: {}, prepared: null, preparedBy: null, approvedBy: null, workedBy: [], checklist: null, closedNote: null });
    base.next.req += 1;
    localStorage.setItem("officeos:it-desk", JSON.stringify(base));
  });
  await sleep(n.t, 600);
  const after = await kpi(n.t, "kpi-open");
  check("D1", "a request raised in another tab moves Open requests at once, with no reload", before !== null && Number(after) === Number(before) + 1, `${before} -> ${after}`);
  await b.close();
  const mine0 = await kpi(n.t, "kpi-mine");
  await n.t.evaluate(() => { const box = JSON.parse(localStorage.getItem("officeos:it-desk")); box.requests.at(-1).assignedTo = "EMP-1106"; localStorage.setItem("officeos:it-desk", JSON.stringify(box)); window.dispatchEvent(new Event("focus")); });
  await sleep(n.t, 500);
  check("D2", "a change seen when the window comes back into focus moves My queue", Number(await kpi(n.t, "kpi-mine")) === Number(mine0) + 1, `${mine0} -> ${await kpi(n.t, "kpi-mine")}`);
  check("D3", "the five numbers: open, awaiting an Admin, my queue, licences renewing, offboarding due", await n.t.evaluate(() => ["kpi-open", "kpi-awaiting", "kpi-mine", "kpi-expiring", "kpi-exits"].every((i) => document.querySelector(`[data-kpi="${i}"]`))));
  await n.ctx.close();
}

// ---------- T ----------
if (ONLY.includes("T")) {
  console.log("\n--- T. The to-do ---");
  const n = await make("emp");
  await go(n, "tasks/my-todo.html", "emp");
  const tabNames = async () => n.t.evaluate(() => [...document.querySelectorAll("#todo-card [role=tab]")].map((x) => x.textContent.replace(/\d+$/, "").trim()));
  check("T1", "an employee's tabs: Mine and Assigned by me (no Team)", j(await tabNames()) === j(["Mine", "Assigned by me"]), j(await tabNames()));
  await n.t.fill("#qa-title", "Book the dentist"); await n.t.keyboard.press("Enter"); await sleep(n.t, 400);
  check("T2", "one line adds a personal task; with no date it is under No date", await n.t.evaluate(() => [...document.querySelectorAll('[data-section="nodate"] .tr__title')].some((b) => b.textContent === "Book the dentist")));
  await n.t.fill("#qa-title", "Send the weekly report"); await n.t.fill("#qa-due", "2026-11-27"); await n.t.click("#qa-add"); await sleep(n.t, 400);
  check("T3", "due today: under Today, its due date in words", await n.t.evaluate(() => [...document.querySelectorAll('[data-section="today"] .tr')].some((r) => r.textContent.includes("Send the weekly report") && r.textContent.includes("Due today"))));
  await n.t.fill("#qa-title", "Update the deployment notes"); await n.t.selectOption("#qa-kind", "work"); await n.t.fill("#qa-due", ""); await n.t.click("#qa-add"); await sleep(n.t, 300);
  check("T4", "work for yourself needs a due date: refused in words", /due date/i.test(await text(n.t, "#qa-error") ?? ""), await text(n.t, "#qa-error"));
  await n.t.fill("#qa-due", "2026-11-20"); await n.t.click("#qa-add"); await sleep(n.t, 300);
  check("T5", "...and never one in the past", /past/i.test(await text(n.t, "#qa-error") ?? ""), await text(n.t, "#qa-error"));
  const row = n.t.locator('.tr', { hasText: "Send the weekly report" });
  await row.locator(".tr__tick").click(); await sleep(n.t, 400);
  check("T6", "a tick finishes it: it moves to Done", await n.t.evaluate(() => [...document.querySelectorAll('[data-section="done"] .tr__title')].some((b) => b.textContent === "Send the weekly report")));
  check("T7", "the rows: a Personal tag and no ISO date anywhere", await n.t.evaluate(() => [...document.querySelectorAll(".tr")].every((r) => r.querySelector(".tr__tag")) && !/\b20\d\d-\d\d-\d\d\b/.test(document.querySelector("#todo-sections").innerText)));
  await go(n, "tasks/my-todo.html", "mgr");
  check("T8", "a manager also gets the Team tab", j(await tabNames()) === j(["Mine", "Assigned by me", "Team"]), j(await tabNames()));
  await n.t.locator("#todo-card [role=tab]", { hasText: "Team" }).click(); await sleep(n.t, 300);
  check("T9", "the team's tab never holds a personal task", !(await n.t.evaluate(() => document.querySelector("#todo-card").innerText.includes("Book the dentist"))));
  // a task past its day is under Overdue, in words (written as the store keeps it)
  await n.t.evaluate((id) => localStorage.setItem("officeos:tasks", JSON.stringify({ version: 1, nextPersonal: 2, nextWork: 1, nextNotice: 1, notices: [], work: [],
    personal: [{ id: "PT-1", ownerId: id, title: "Return the library book", notes: "", status: "pending", dueDate: "2026-11-20", priority: "normal", createdAt: "2026-11-18T04:30:00.000Z", doneAt: null }] })), WHO.emp[1]);
  await go(n, "tasks/my-todo.html", "emp");
  check("T10", "a task past its day is under Overdue: 'Overdue since 20 Nov 2026'", await n.t.evaluate(() => [...document.querySelectorAll('[data-section="overdue"] .tr')].some((r) => r.textContent.includes("Return the library book") && r.textContent.includes("Overdue since 20 Nov 2026"))));
  await n.ctx.close();
}

// ---------- A ----------
if (ONLY.includes("A")) {
  console.log("\n--- A. Announcements ---");
  const n = await make("hr");
  await go(n, "announcements/announcements.html", "emp");
  check("A1", "an employee reads the posts for everyone and has no Post button", (await n.t.locator("[data-post]").count()) >= 2 && (await n.t.locator("#post-open").count()) === 0);
  await go(n, "announcements/announcements.html", "hr");
  await n.t.click("#post-open"); await sleep(n.t, 300);
  await n.t.fill("#post-new-title", "Parking changes from Monday"); await n.t.fill("#post-new-body", "Use the B1 level from Monday; A1 is closed for repairs.");
  await n.t.selectOption("#post-new-pinned", "yes");
  await n.t.click('button[form="post-new-form"]'); await sleep(n.t, 500);
  check("A2", "HR posts it, pinned: it is first", (await n.t.evaluate(() => document.querySelector("[data-post] .post__title")?.textContent)) === "Parking changes from Monday");
  await go(n, LANDING.emp, "emp");
  await sleep(n.t, 300);
  const bell = await n.t.evaluate(() => document.querySelector(".topbar__icon-btn--dot")?.getAttribute("aria-label") ?? null);
  check("A3", "the employee's bell shows (they have no inbox) and names the new announcement", /1 new announcement/.test(bell ?? ""), bell);
  await n.t.click(".topbar__icon-btn--dot"); await sleep(n.t, 400);
  check("A4", "the bell lists it by title", /Parking changes from Monday/.test(await text(n.t, "#bell-post-updates") ?? ""));
  await n.t.keyboard.press("Escape");
  await go(n, "announcements/announcements.html", "emp"); await sleep(n.t, 400);
  await go(n, LANDING.emp, "emp");
  check("A5", "opening the page reads it: the bell no longer names a new announcement", !/announcement/.test((await n.t.evaluate(() => document.querySelector(".topbar__icon-btn--dot")?.getAttribute("aria-label") ?? "")) ?? ""));
  await go(n, "announcements/announcements.html", "hr");
  const first = n.t.locator("[data-post]").first();
  await first.locator("button", { hasText: "Take down" }).click(); await sleep(n.t, 200);
  await n.t.locator("[data-confirm-ok]").click(); await sleep(n.t, 400);
  check("A6", "taking it down: off the list, kept under Taken down or ended for HR", (await n.t.evaluate(() => document.querySelector("#posts-off")?.innerText.includes("Parking changes from Monday"))) && !(await n.t.evaluate(() => document.querySelector("#posts")?.innerText.includes("Parking changes"))));
  await n.ctx.close();
}

// ---------- H ----------
if (ONLY.includes("H")) {
  console.log("\n--- H. Help ---");
  const n = await make("emp");
  const heads = () => n.t.evaluate(() => [...document.querySelectorAll("#help .ds-card__title")].map((h) => h.textContent));
  await go(n, "help/help.html", "emp");
  const e = await heads();
  check("H1", "an employee: their own areas, not HR's, Finance's or IT's", e.includes("Your day") && !e.includes("People and HR") && !e.includes("Payroll and finance") && !e.includes("IT and assets"), j(e));
  const links = await n.t.evaluate(() => [...document.querySelectorAll("#help a")].map((a) => new URL(a.href).pathname));
  const bad = [];
  for (const l of [...new Set(links)]) { await n.t.goto(N + l); await n.t.waitForLoadState("load"); await sleep(n.t, 200); if (/403/.test(path_(n.t))) bad.push(l); }
  check("H2", "every link on it opens for them", bad.length === 0, j(bad));
  await go(n, "help/help.html", "hr");
  check("H3", "HR also gets People and HR", (await heads()).includes("People and HR"));
  await n.ctx.close();
}

// ---------- L ----------
if (ONLY.includes("L")) {
  console.log("\n--- L. Sign-in's demo tiles ---");
  const ctx = await browser.newContext({ ...size(1280), timezoneId: "Asia/Kolkata" });
  await ctx.clock.setFixedTime(new Date(NOW));
  const t = await ctx.newPage();
  await t.goto(N + "/pages/auth/login.html"); await t.waitForLoadState("load"); await sleep(t, 400);
  const tl = await t.evaluate(() => [...document.querySelectorAll("[data-demo-role]")].map((b) => [b.dataset.demoRole, b.innerText.replace(/\s+/g, " ").trim(), b.disabled]));
  check("L1", "one tile per role: Admin, HR, Manager, Finance, Employee, IT; each names the person", j(tl.map((x) => x[0])) === j(["admin", "hr", "mgr", "fin", "emp", "it"]) && tl.find((x) => x[0] === "mgr")[1].includes("Sneha Rao"), j(tl));
  check("L2", "IT, which nobody holds in the seed, is switched off and says so", tl.find((x) => x[0] === "it")[2] === true && /Nobody has this role yet/.test(tl.find((x) => x[0] === "it")[1]));
  await t.click('[data-demo-role="mgr"]'); await sleep(t, 800);
  check("L3", "the Manager tile signs in Sneha Rao", path_(t).endsWith("dashboard/employee.html") && /Good morning, Sneha/.test(await text(t, "#dash-greeting") ?? ""));
  await ctx.close();
  const appDir = path.dirname(DIST), offDist = path.join(appDir, "dist-demo-off");
  const built = spawnSync("npx", ["vite", "build", "--outDir", offDist, "--emptyOutDir"], { cwd: appDir, shell: true, env: { ...process.env, OFFICEOS_DEMO_OFF: "1" }, encoding: "utf8" });
  const srvOff = spawn("python", [path.join(HERE, "spa-serve.py"), "9974", offDist], { stdio: "ignore" });
  for (let i = 0; i < 60; i++) { try { if ((await fetch("http://127.0.0.1:9974/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  const c2 = await browser.newContext({ ...size(1280), timezoneId: "Asia/Kolkata" });
  const t2 = await c2.newPage();
  await t2.goto("http://127.0.0.1:9974/pages/auth/login.html"); await t2.waitForLoadState("load"); await sleep(t2, 500);
  const off = await t2.evaluate(() => ({ tiles: document.querySelectorAll("[data-demo-role]").length, grid: !!document.getElementById("demo-roles") }));
  check("L4", "demo mode off: no tile, no grid", built.status === 0 && off.tiles === 0 && !off.grid, j(off));
  await c2.close();
  try { srvOff.kill(); } catch {}
}

// ---------- X ----------
const STATES = [
  ["dash-emp", "emp", async (n) => { await go(n, LANDING.emp, "emp"); }],
  ["dash-mgr", "mgr", async (n) => { await go(n, LANDING.mgr, "mgr"); }],
  ["dash-hr", "hr", async (n) => { await go(n, LANDING.hr, "hr"); }],
  ["dash-fin", "fin", async (n) => { await go(n, LANDING.fin, "fin"); }],
  ["dash-admin", "admin", async (n) => { await go(n, LANDING.admin, "admin"); }],
  ["dash-it-landing", "it", async (n) => { await go(n, LANDING.it, "it"); }],
  ["it-desk", "it", async (n) => { await go(n, "it/dashboard.html", "it"); }],
  ["todo", "emp", async (n) => { await go(n, "tasks/my-todo.html", "emp"); }],
  ["todo-filled", "emp", async (n) => {
    await go(n, "tasks/my-todo.html", "emp");
    const add = async (title, due, kind) => { await n.t.fill("#qa-title", title); if (kind) await n.t.selectOption("#qa-kind", kind); await n.t.fill("#qa-due", due); await n.t.click("#qa-add"); await sleep(n.t, 250); };
    await add("Book the dentist", "", "personal");
    await add("Send the weekly report", "2026-11-27", "personal");
    await add("Renew the parking pass", "2026-11-27", "personal");
    await add("Update the deployment notes", "2026-12-03", "work");
    await n.t.locator(".tr", { hasText: "Renew the parking pass" }).locator(".tr__tick").click(); await sleep(n.t, 250);
    await n.t.evaluate(() => document.querySelectorAll("#todo-sections details").forEach((d) => { d.open = true; }));
    for (const x of await n.t.locator(".toast__close").all()) await x.click().catch(() => {});   // the four adds' toasts, so the rows can be seen
    await sleep(n.t, 300);
  }],
  ["todo-mgr-team", "mgr", async (n) => { await go(n, "tasks/my-todo.html", "mgr"); await n.t.locator("#todo-card [role=tab]", { hasText: "Team" }).click().catch(() => {}); await sleep(n.t, 300); }],
  ["announcements-emp", "emp", async (n) => { await go(n, "announcements/announcements.html", "emp"); }],
  ["announcements-hr", "hr", async (n) => { await go(n, "announcements/announcements.html", "hr"); }],
  ["announcements-post", "hr", async (n) => { await go(n, "announcements/announcements.html", "hr"); await n.t.click("#post-open"); await sleep(n.t, 300); }],
  ["help-emp", "emp", async (n) => { await go(n, "help/help.html", "emp"); }],
  ["help-admin", "admin", async (n) => { await go(n, "help/help.html", "admin"); }],
  ["menu-search", "hr", async (n) => { await go(n, LANDING.hr, "hr"); await n.t.keyboard.press("/"); await n.t.keyboard.type("lea"); await sleep(n.t, 250); }],
  ["top-search", "hr", async (n) => { await go(n, LANDING.hr, "hr"); const box = n.t.locator("#topbar-search input"); if (!(await box.isVisible())) await n.t.click(".topbar__search-open"); await n.t.type("#topbar-search input", "ro"); await sleep(n.t, 300); }],
  ["login", "emp", async (n) => { await n.t.evaluate(() => localStorage.removeItem("officeos:session")); await go(n, "auth/login.html"); }],
];
let screens = 0;
if (ONLY.includes("X")) {
  console.log("\n--- X. Widths and themes ---");
  for (const [w, theme] of [[412, "light"], [768, "light"], [1280, "light"], [412, "dark"], [768, "dark"], [1280, "dark"]]) {
    const n = await make("emp", { width: w, theme });
    const bad = [], words = [];
    for (const [name, who, setup] of STATES) {
      n.who = who;
      try { await setup(n); } catch (e) { bad.push(`${name}: couldn't be used (${String(e.message).split("\n")[0]})`); continue; }
      const r = await n.t.evaluate(() => ({ page: document.documentElement.scrollWidth <= window.innerWidth + 1, wide: [...document.querySelectorAll("main table, .modal.is-open table")].filter((tb) => tb.scrollWidth > (tb.closest(".table-wrap, .ds-card__body, .card, .modal__body, main")?.clientWidth ?? 0) + 2).map((tb) => tb.id) }));
      if (!r.page || r.wide.length) bad.push(`${name} ${j(r)}`);
      const said = await n.t.evaluate(() => [...document.querySelectorAll("#dash-hello, #dash-next, #dash-attention, #dash-announcements, #todo-sections, #posts, #help, #menu-search-results, #search-results")].map((e) => e.innerText).join(" | "));
      if (/\b20\d\d-\d\d-\d\d\b/.test(said) || /\b(?:EMP|ITR|AN|ANN|WT|PT|LV|RG|EXP)-\d+\b/.test(said)) words.push(`${name}: ${said.match(/\b20\d\d-\d\d-\d\d\b|\b(?:EMP|ITR|AN|ANN|WT|PT|LV|RG|EXP)-\d+\b/)?.[0]}`);
      await SHOT(n.t, `x-${name}-${who}-${w}-${theme}`);
      screens += 1;
      if (await dialogOpen(n.t)) { await n.t.keyboard.press("Escape"); await sleep(n.t, 200); }
    }
    check(`X1.${w}.${theme}`, `${w}px ${theme}: ${STATES.length} screens, none scrolls sideways, no table wider than its card`, bad.length === 0, bad.join(" | "));
    check(`X2.${w}.${theme}`, `${w}px ${theme}: no ISO date or record id in what is read`, words.length === 0, words.join(" | "));
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
    const m = await make("emp", { theme });
    const low = [];
    let total = 0;
    for (const name of ["dash-mgr", "todo", "announcements-hr", "help-emp", "menu-search", "login"]) {
      const [, who, setup] = STATES.find((s) => s[0] === name);
      m.who = who;
      await setup(m);
      const chips = await m.t.evaluate(() => {
        const probe = document.createElement("canvas").getContext("2d");
        // any computed colour (rgb, rgba, color(srgb ...) from color-mix) as [r, g, b, a]
        const rgba = (css) => { const c = String(css).trim(); let m = /^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.]+))?\)$/.exec(c); if (m) return [+m[1] * 255, +m[2] * 255, +m[3] * 255, m[4] === undefined ? 1 : +m[4]];
          m = /^rgba?\(([^)]+)\)$/.exec(c); if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
          probe.fillStyle = "#000"; probe.fillStyle = c; const v = probe.fillStyle; const h = /^#([0-9a-f]{6})$/i.exec(v); return h ? [...[0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16)), 1] : [0, 0, 0, 1]; };
        const rgb = (css) => rgba(css).slice(0, 3);
        // the background as seen: every translucent layer from the page up, blended
        const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } }
          let out = [255, 255, 255]; for (const [r, g, b, a] of layers.reverse()) out = [r * a + out[0] * (1 - a), g * a + out[1] * (1 - a), b * a + out[2] * (1 - a)]; return out; };
        const out = [];
        for (const el of document.querySelectorAll(".dh-hello__date, .dh-hello__role, .dh-today, .dh-tile__label, .dh-tile__count, .dh-list__item a, .dh-post__body, .dh-post__date, .dh-pin, .tr__meta span, .tr__title, .ts__count, .post__meta, .post__body, .help-faq summary, .nav__find-key, .nav__find-list small, .nav__group-fold, .auth-demo__role span, .auth-demo__role strong")) {
          if (!el.offsetParent && getComputedStyle(el).position !== "fixed") continue;
          out.push({ label: (el.textContent || el.placeholder || "").trim().slice(0, 30), fg: rgb(getComputedStyle(el).color), bg: bgOf(el) });
        }
        return out;
      });
      total += chips.length;
      for (const c of chips) if (ratio(c.fg, c.bg) < 4.5) low.push(`${name} "${c.label}" ${ratio(c.fg, c.bg).toFixed(2)}`);
      if (await dialogOpen(m.t)) { await m.t.keyboard.press("Escape"); await sleep(m.t, 200); }
    }
    check(`Z1.${theme}`, `${theme}: every new text pair reaches 4.5:1 (${total} read)`, total >= 30 && low.length === 0, j(low.slice(0, 6)));
    await m.ctx.close();
  }
}

console.log("\n--- Errors ---");
check("Z9", "no page or console errors", errs.length === 0, errs.slice(0, 5).join(" | "));
console.log(`\nsd1: passed ${passed}, failed ${failed}`);
await browser.close();
stop();