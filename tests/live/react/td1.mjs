// TD1's harness (msedge, headless): the to-do screens on tasks-store.js. Read by meaning (words, attributes, storage), never by pixels.
// usage: node td1.mjs <app dist> <repo root> <shots dir>   [ONLY=APUWDBKXZ]
// Clock: Mon 23 Nov 2026 10:00 IST. People: Aarav Admin, Priya HR, Kabir Finance, Isha IT (made in the test), Sneha (manager of Rohan and Arjun), Rohan, Arjun.
//   A  who may open each page and what the sidebar lists (six roles)
//   P  PRIVACY: a personal task's words are in no page, dashboard, card, bell or team view for anyone but its owner
//   U  Personal tab: quick add, edit, status in the row, delete (with the question), filters, the counter
//   W  Work: a manager assigns (the picker holds only who they may assign to), the assignee starts, comments, finishes; the assigner reopens with a reason
//   D  the dashboards' "My tasks" card (Employee, manager's team line, Admin, HR) and Team tasks' progress
//   B  the bell: updates on tasks (also for someone with no approvals inbox), idempotent
//   K  keyboard
//   X  no sideways scroll at 412, 768 and 1280, light and dark, every screen and state; shots for the eye
//   Z  contrast, no page or console errors
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, ROOT, SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "APUWDBKXZ";
const PORT = process.env.PORT ?? "9976";
fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn("python", [path.join(HERE, "spa-serve.py"), PORT, DIST], { stdio: "ignore" });
const stop = () => { try { srv.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], it: ["Isha Kulkarni", "EMP-1106"], mgr: ["Sneha Rao", "EMP-1029"], rohan: ["Rohan Gupta", "EMP-1042"], arjun: ["Arjun Kapoor", "EMP-1105"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const size = (w) => (w === 412 ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA } : { viewport: { width: w, height: 900 } });
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(8)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 500)}` : ""}`); };
const errs = [];
const NOW = "2026-11-23T10:00:00+05:30";
const j = JSON.stringify;
const P = { todo: "tasks/my-todo.html", team: "tasks/team.html" };
const SECRET = "Quietly plan my resignation";

async function make(who, { width = 1280, theme = "light" } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata", colorScheme: theme });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(NOW));
  await ctx.addInitScript(([th, w]) => {
    if (localStorage.getItem("td1:seeded")) return;
    localStorage.clear();
    localStorage.setItem("td1:seeded", "1");
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
async function go(n, page, who) {
  if (who) await n.t.evaluate((w) => { localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 })); }, WHO[who]);
  await n.t.goto(N + "/pages/" + page); await n.t.waitForLoadState("load");
  await n.t.evaluate(() => document.fonts.ready); await sleep(n.t, 450);
}
async function addIt(n) {
  await go(n, "dashboard/employee.html", "arjun");
  await n.t.evaluate(() => {
    const box = JSON.parse(localStorage.getItem("officeos:users"));
    if (!box.records.some((x) => x.id === "EMP-1106")) box.records.push({ ...box.records.find((x) => x.id === "EMP-1105"), id: "EMP-1106", name: "Isha Kulkarni", email: "isha.kulkarni@northwind.com", department: "IT", designation: "IT Engineer", role: "it", reportingManagerId: null, reportingManager: "", dateOfJoining: "1 Apr 2024" });
    box.nextIdNum = Math.max(box.nextIdNum, 1107);
    localStorage.setItem("officeos:users", JSON.stringify(box));
  });
}
// the box, as the data layer keeps it
const seed = (t, { personal = [], work = [] } = {}) => t.evaluate(([personal, work]) => {
  localStorage.setItem("officeos:tasks", JSON.stringify({ version: 1, nextPersonal: personal.length + 1, nextWork: work.length + 1, nextNotice: 1, personal, work, notices: [] }));
}, [personal, work]);
const AT = "2026-11-20T04:30:00.000Z";
const pt = (n, o) => ({ id: `PT-${n}`, ownerId: "EMP-1042", title: `Personal ${n}`, notes: "", status: "pending", dueDate: "2026-11-30", priority: "normal", createdAt: AT, doneAt: null, ...o });
const wt = (n, o) => ({ id: `WT-${n}`, title: `Work ${n}`, description: "", assigneeId: "EMP-1042", assignerId: "EMP-1029", reportToId: "EMP-1029", status: "pending", dueDate: "2026-11-30", priority: "normal", createdAt: AT, startedAt: null, doneAt: null,
  timeline: [{ at: AT, actorId: "EMP-1029", kind: "created", note: "" }, { at: AT, actorId: "EMP-1029", kind: "assigned", note: "EMP-1042" }], ...o });
const path_ = (t) => new URL(t.url()).pathname;
const text = (t, sel) => t.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const body = (t) => t.evaluate(() => document.body.innerText);
const rows = (t, sel) => t.evaluate((s) => [...document.querySelectorAll(`${s} tbody tr`)].map((tr) => [...tr.children].map((c) => c.innerText.replace(/\s+/g, " ").trim())), sel);
const sidebar = (t) => t.evaluate(() => [...document.querySelectorAll(".sidebar a, nav a")].map((a) => a.textContent.replace(/\s+/g, " ").trim()).filter(Boolean));
const SHOT = async (t, name) => { try { await t.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true }); } catch {} };
const dialogOpen = (t) => t.locator(".modal.is-open").count();
const stored = (t) => t.evaluate(() => JSON.parse(localStorage.getItem("officeos:tasks") ?? "null"));
const tab = async (t, name) => { await t.getByRole("tab", { name: new RegExp(`^${name}`) }).click(); await sleep(t, 250); };
const fill = async (t, sel, v) => { await t.fill(sel, v); };
// SD1: My to-do lists compact rows in sections (Overdue, Today, Upcoming, No date, Done folded): a row is [title, its line of tag, due,
// status, who], and the section it sits in
const trows = (t) => t.evaluate(() => [...document.querySelectorAll("#todo-sections .tr")].map((r) => [r.querySelector(".tr__title").textContent.trim(), [...r.querySelector(".tr__meta").children].map((c) => c.textContent.trim()).join(" "), r.closest("[data-section]").dataset.section]));   // textContent: Done is folded
const unfold = (t) => t.evaluate(() => document.querySelectorAll("#todo-sections details").forEach((d) => { d.open = true; }));
const openTitle = async (t, title) => { await unfold(t); await t.locator(".tr", { hasText: title }).locator(".tr__title").click(); await sleep(t, 350); };

// ---------- A ----------
if (ONLY.includes("A")) {
  console.log("\n--- A. Who may open what ---");
  const n = await make("admin");
  await addIt(n);
  const want = { admin: [1, 1], hr: [1, 1], mgr: [1, 1], fin: [1, 1], it: [1, 0], arjun: [1, 0], rohan: [1, 0] };   // Kabir (Finance) manages Meera: a manager, so he may open Team tasks
  const got = {}, side = {};
  for (const who of Object.keys(want)) {
    got[who] = [];
    for (const page of [P.todo, P.team]) { await go(n, page, who); got[who].push(path_(n.t).endsWith(page) ? 1 : 0); }
    await go(n, "dashboard/employee.html", who); const s = await sidebar(n.t); side[who] = [s.includes("My to-do") ? 1 : 0, s.includes("Team tasks") ? 1 : 0];
  }
  check("A1", "My to-do opens for all seven; Team tasks only for a manager (Sneha, and Kabir who manages Meera), HR and the Admin (IT and colleagues get the 403 page)", j(got) === j(want), j(got));
  check("A2", "the sidebar lists My to-do for everyone and Team tasks only for those who may open it", j(side) === j(want), j(side));
  await go(n, P.team, "arjun");
  check("A3", "a colleague with no reports sent to Team tasks lands on 403", path_(n.t).endsWith("errors/403.html"));
  await n.ctx.close();
}

// ---------- P ----------
if (ONLY.includes("P")) {
  console.log("\n--- P. A personal task is private ---");
  const n = await make("rohan");
  await go(n, "dashboard/employee.html", "rohan");
  await seed(n.t, { personal: [pt(1, { title: SECRET, notes: "tell nobody", dueDate: "2026-11-22" })], work: [wt(1, { title: "Ship the release" })] });
  await go(n, P.todo, "rohan");
  check("P1", "the owner sees it on Mine, under Overdue, in words (SD1: the sections)", (await body(n.t)).includes(SECRET) && (await trows(n.t)).some((r) => r[0] === SECRET && r[2] === "overdue" && /Overdue since 22 Nov 2026/.test(r[1])), j(await trows(n.t)));
  let leaks = [];
  for (const who of ["mgr", "hr", "admin", "fin", "arjun"]) {
    await go(n, "dashboard/employee.html", who);
    for (const page of [P.todo, P.team, "dashboard/employee.html", "dashboard/admin.html", "dashboard/hr.html", "requests/approvals-inbox.html"]) {
      await go(n, page, who);
      const b = await body(n.t);
      if (b.includes("resignation") || b.includes("tell nobody")) leaks.push(`${who} ${page}`);
    }
    await n.t.evaluate(() => document.querySelector('[aria-controls="bell-panel"], .topbar__icon-btn--dot')?.click()); await sleep(n.t, 250);
    if ((await body(n.t)).includes("resignation")) leaks.push(`${who} bell`);
  }
  check("P2", "for the manager, HR, the Admin, Finance and a colleague: no page, dashboard, inbox or bell shows the personal task's words", leaks.length === 0, leaks.join(" | "));
  await go(n, P.team, "mgr");
  const prog = await rows(n.t, "#people-table");
  check("P3", "the manager's Team tasks counts Rohan's work task but not his personal one (1 task)", prog.find((r) => r[0] === "Rohan Gupta")?.[1] === "1", j(prog));
  check("P4", "the work task he was given is visible to the manager; the personal one never in her task list", (await text(n.t, "#team-tasks-table")).includes("Ship the release") && !(await text(n.t, "#team-tasks-table")).includes("resignation"));
  const audit = await n.t.evaluate(() => localStorage.getItem("officeos:audit-trail") ?? "");
  check("P5", "no stored key but the tasks box holds the words", !audit.includes("resignation") && (await n.t.evaluate(() => Object.keys(localStorage).filter((k) => k !== "officeos:tasks" && localStorage.getItem(k).includes("resignation")).length)) === 0);
  await n.ctx.close();
}

// ---------- U ----------
if (ONLY.includes("U")) {
  console.log("\n--- U. Personal tasks ---");
  const n = await make("rohan");
  const t = n.t;
  await go(n, P.todo, "rohan");
  // SD1: the rows are compact (no status column or filters); status, notes and priority are in the edit dialog (the title opens it)
  check("U1", "empty: 'Nothing on your list.' and the quick add; the tab's count says 0", (await body(t)).includes("Nothing on your list.") && (await t.locator("#quick-add").count()) === 1 && /0$/.test((await t.locator('[role="tab"][aria-selected="true"]').innerText()).trim()), j([await t.locator('[role="tab"][aria-selected="true"]').innerText(), await t.locator("#quick-add").count()]));
  await SHOT(t, "u-empty-rohan-1280-light");
  check("U2", "Add is disabled until there is a title", await t.locator("#qa-add").isDisabled());
  await fill(t, "#qa-title", "Buy the cake"); await fill(t, "#qa-due", "2026-11-24"); await t.click("#qa-add"); await sleep(t, 400);
  const r1 = await trows(t);
  check("U3", "quick add: listed under Upcoming as Personal, due in words; stored pending; the title box is cleared; the count 1", r1.length === 1 && r1[0][0] === "Buy the cake" && r1[0][2] === "upcoming" && r1[0][1].includes("Personal") && r1[0][1].includes("Due 24 Nov 2026") && (await stored(t)).personal[0].status === "pending" && (await t.inputValue("#qa-title")) === "" && /1$/.test((await t.locator('[role="tab"][aria-selected="true"]').innerText()).trim()), j([r1, await t.inputValue("#qa-title")]));
  await openTitle(t, "Buy the cake");
  await t.selectOption("#pedit-status", "in-progress"); await t.locator("#pedit-modal button[type=submit]").click(); await sleep(t, 400);
  check("U4", "the status changes (In progress), from the task's dialog", (await stored(t)).personal[0].status === "in-progress");
  await openTitle(t, "Buy the cake");
  await fill(t, "#pedit-title", "Buy the cake and candles"); await fill(t, "#pedit-notes", "Chocolate"); await t.locator("#pedit-modal button[type=submit]").click(); await sleep(t, 400);
  check("U5", "edit: the new title is shown, the notes kept", (await trows(t))[0]?.[0] === "Buy the cake and candles" && (await stored(t)).personal[0].notes === "Chocolate");
  await openTitle(t, "Buy the cake and candles");
  await fill(t, "#pedit-title", "x".repeat(130));
  check("U6", "the title field stops at 120 characters (maxlength), as the data layer does", (await t.getAttribute("#pedit-title", "maxlength")) === "120" && (await t.inputValue("#pedit-title")).length <= 120);
  await t.keyboard.press("Escape"); await sleep(t, 300); if (await t.locator(".confirm-dialog").count()) { await t.locator(".confirm-dialog").getByRole("button", { name: "Discard" }).click(); await sleep(t, 300); }
  await t.getByRole("button", { name: "Delete" }).first().click(); await sleep(t, 300);
  check("U7", "Delete asks first; Cancel keeps it", (await t.locator(".confirm-dialog").count()) === 1);
  await t.locator(".confirm-dialog").getByRole("button", { name: "Cancel" }).click(); await sleep(t, 300);
  check("U8", "...still listed", (await trows(t)).length === 1);
  await t.getByRole("button", { name: "Delete" }).first().click(); await sleep(t, 300); await t.locator(".confirm-dialog").getByRole("button", { name: "Delete" }).click(); await sleep(t, 400);
  check("U9", "Delete confirmed: gone, empty state back", (await body(t)).includes("Nothing on your list.") && (await stored(t)).personal.length === 0);
  await seed(t, { personal: [pt(1, { title: "Low one", priority: "low" }), pt(2, { title: "Urgent one", priority: "urgent", dueDate: "2026-12-30" }), pt(3, { title: "Done one", status: "done" })] });
  await go(n, P.todo, "rohan");
  const f1 = await trows(t);
  check("U10", "the sections: the two open ones under Upcoming, soonest first; the finished one under Done (SD1: in place of the filters)", j(f1.map((r) => [r[0], r[2]])) === j([["Low one", "upcoming"], ["Urgent one", "upcoming"], ["Done one", "done"]]), j(f1));
  check("U11", "Done is folded until opened", (await t.evaluate(() => document.querySelector('[data-section="done"]')?.open)) === false);
  await t.locator('.tr', { hasText: "Low one" }).locator(".tr__tick").click(); await sleep(t, 400);
  check("U12", "a tick finishes a personal task: stored done, moved to Done", (await stored(t)).personal.find((x) => x.title === "Low one").status === "done" && (await trows(t)).find((r) => r[0] === "Low one")[2] === "done");
  await n.ctx.close();
}

// ---------- W ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. Work tasks ---");
  const n = await make("mgr");
  const t = n.t;
  await go(n, P.todo, "mgr");
  await t.click("#assign-open"); await sleep(t, 350);
  const opts = await t.locator("#assign-assigneeId option").allTextContents();
  check("W1", "the Assign picker holds only Sneha herself, Rohan and Arjun (no one else)", j(opts.slice(1).sort()) === j(["Arjun Kapoor", "Rohan Gupta", "Sneha Rao"]), j(opts));
  await t.selectOption("#assign-assigneeId", { label: "Rohan Gupta" }); await fill(t, "#assign-title", "Prepare the Q4 deck"); await fill(t, "#assign-description", "Ten slides"); await fill(t, "#assign-dueDate", "2026-11-25");
  await t.locator("#assign-modal button[type=submit]").click(); await sleep(t, 500);
  check("W2", "assigned: the dialog closes and the task shows under Assigned by me with 'For Rohan Gupta' (SD1 rows)", (await dialogOpen(t)) === 0 && (await tab(t, "Assigned by me"), (await trows(t)).some((r) => r[0] === "Prepare the Q4 deck" && r[1].includes("For Rohan Gupta"))), j(await trows(t)));
  check("W2b", "on Assigned by me a row has no tick or status control (only the assignee moves a status)", (await t.locator("#todo-sections .tr__tick, #todo-sections select").count()) === 0);
  await t.click("#assign-open"); await sleep(t, 300); await t.selectOption("#assign-assigneeId", { label: "Arjun Kapoor" }); await fill(t, "#assign-title", "Late one"); await fill(t, "#assign-dueDate", "2026-11-01"); await t.locator("#assign-modal button[type=submit]").click(); await sleep(t, 400);
  check("W3", "a past due date is refused at the field, in the data layer's words; the dialog stays open", (await dialogOpen(t)) === 1 && /can't be in the past/.test(await text(t, "#assign-modal")));
  await t.keyboard.press("Escape"); await sleep(t, 300); if (await t.locator(".confirm-dialog").count()) { await t.locator(".confirm-dialog").getByRole("button", { name: "Discard" }).click(); await sleep(t, 300); }
  await go(n, P.todo, "rohan");
  check("W4", "Rohan sees it on Mine (SD1: work and personal together): 'From Sneha Rao', To do, with the update on top: 'Task assigned to you: Prepare the Q4 deck'", (await trows(t)).some((r) => r[0] === "Prepare the Q4 deck" && r[1].includes("From Sneha Rao") && r[1].includes("To do")) && (await text(t, "#task-updates")).includes("Task assigned to you: Prepare the Q4 deck"), j(await trows(t)));
  await openTitle(t, "Prepare the Q4 deck");
  check("W5", "the detail: Start and Mark done (not Edit or Cancel: he isn't the assigner), the timeline, who it reports to (Sneha)", (await t.locator('[data-action="start"]').count()) === 1 && (await t.locator('[data-action="edit"]').count()) === 0 && (await text(t, "#task-facts")).includes("Reports to Sneha Rao") && (await t.locator("#task-timeline li").count()) === 2);
  await SHOT(t, "w-detail-rohan-1280-light");
  await t.click('[data-action="start"]'); await sleep(t, 350);
  check("W6", "Start: In progress, and 'Back to pending' appears", (await text(t, "#task-chips")).includes("In progress") && (await t.locator('[data-action="back"]').count()) === 1);
  await fill(t, "#task-comment", "Working on it"); await t.click("#task-comment-send"); await sleep(t, 300);
  check("W7", "a comment is added to the timeline", (await text(t, "#task-timeline")).includes("Working on it"));
  await t.click('[data-action="done"]'); await sleep(t, 350);
  check("W8", "Mark done: Done; no way back for the assignee", (await text(t, "#task-chips")).includes("Done") && (await t.locator('[data-action="start"], [data-action="back"], [data-action="done"]').count()) === 0);
  await go(n, "dashboard/employee.html", "mgr");
  await t.evaluate(() => document.querySelector(".topbar__icon-btn--dot")?.click()); await sleep(t, 300);
  check("W9", "Sneha's bell has 'Done: Prepare the Q4 deck'", (await text(t, "#bell-task-updates"))?.includes("Done: Prepare the Q4 deck") ?? false);
  await go(n, P.todo, "mgr"); await tab(t, "Assigned by me"); await openTitle(t, "Prepare the Q4 deck");   // SD1: under Done, folded
  check("W10", "the assigner's detail of a finished task: Reopen only", (await t.locator('[data-action="reopen"]').count()) === 1 && (await t.locator('[data-action="edit"]').count()) === 0);
  await t.click('[data-action="reopen"]'); await sleep(t, 300); await t.locator("#reopen-modal button[type=submit]").click(); await sleep(t, 300);
  check("W11", "reopen without a reason is refused at the field", (await dialogOpen(t)) === 2 && (await text(t, "#reopen-modal")).includes("Enter the reason") || /reason/i.test((await text(t, "#reopen-modal")) ?? ""));
  await fill(t, "#reopen-note", "Missed a slide"); await t.locator("#reopen-modal button[type=submit]").click(); await sleep(t, 400);
  check("W12", "with a reason it reopens: Pending again, the timeline says Reopened", (await text(t, "#task-chips")).includes("Pending") && (await text(t, "#task-timeline")).includes("Reopened"));
  await n.ctx.close();
}

// ---------- D ----------
if (ONLY.includes("D")) {
  console.log("\n--- D. Dashboards and Team tasks ---");
  const n = await make("rohan");
  const t = n.t;
  await go(n, "dashboard/employee.html", "rohan");
  await seed(t, { personal: [pt(1, { dueDate: "2026-11-23" }), pt(2, { dueDate: "2026-11-22" })], work: [wt(1, { dueDate: "2026-11-23" }), wt(2, { assigneeId: "EMP-1105", dueDate: "2026-11-21" }), wt(3, { status: "done", dueDate: "2026-11-20" })] });
  await go(n, "dashboard/employee.html", "rohan");
  // SD1: the "My tasks" card is now the frame's My to-do tile (its count: open tasks) and the Needs you lines (overdue, due today, the team's overdue)
  const tile = (k) => t.evaluate((x) => document.querySelector(`[data-tile="${x}"] .dh-tile__count`)?.textContent ?? "", k);
  const needs = () => t.evaluate(() => [...document.querySelectorAll("[data-attention]")].map((e) => e.innerText.trim()));
  check("D1", "Rohan's dashboard: My to-do 3 open (personal and work); Needs you: 1 overdue, 2 due today; no team line", (await tile("todo")) === "3" && (await needs()).includes("1 of your tasks is overdue") && (await needs()).includes("2 tasks are due today") && !(await needs()).some((x) => /your team/.test(x)), j([await tile("todo"), await needs()]));
  await SHOT(t, "d-card-rohan-1280-light");
  await go(n, "dashboard/employee.html", "mgr");
  check("D2", "the manager's dashboard has the team line: Arjun's overdue one counts (1 task in your team is overdue), and Team tasks is a tile", (await needs()).includes("1 task in your team is overdue") && (await t.locator('[data-tile="teamTasks"]').count()) === 1, j(await needs()));
  await seed(t, { personal: [pt(1, { dueDate: "2026-11-23" }), pt(2, { dueDate: "2026-11-22" }), pt(7, { id: "PT-7", ownerId: "EMP-1001", title: "Admin's own", dueDate: "2026-11-23" }), pt(8, { id: "PT-8", ownerId: "EMP-1003", title: "HR's own", dueDate: "2026-11-22" })], work: [wt(1, { dueDate: "2026-11-23" }), wt(2, { assigneeId: "EMP-1105", dueDate: "2026-11-21" }), wt(3, { status: "done", dueDate: "2026-11-20" })] });
  await go(n, "dashboard/admin.html", "admin");
  const adminNeeds = await needs();
  await go(n, "dashboard/hr.html", "hr");
  const hrNeeds = await needs();
  check("D3", "the Admin dashboard and the HR dashboard tell them of their own tasks too (Needs you, to My to-do)", adminNeeds.includes("1 task is due today") && hrNeeds.includes("1 of your tasks is overdue") && (await t.locator('[data-attention="tasks-overdue"] a').getAttribute("href")).endsWith("tasks/my-todo.html"), j([adminNeeds, hrNeeds]));
  await go(n, P.team, "mgr");
  const prog = await rows(t, "#people-table");
  check("D4", "Team tasks: progress by person for her two reports only (Rohan 2 tasks, Arjun 1; overdue 0 / 1)", j(prog.map((r) => [r[0], r[1], r[3] === undefined ? "" : r[3]])).includes("Rohan Gupta") && prog.length === 2 && prog.find((r) => r[0] === "Arjun Kapoor")[3] === "1", j(prog));
  check("D5", "the chart is drawn by the shared chart components (a figure with its data table)", (await t.locator("#team-bars").count()) === 1);
  await SHOT(t, "d-team-mgr-1280-light");
  await t.locator('[data-person="EMP-1105"]').click(); await sleep(t, 300);
  check("D6", "choosing a person narrows the task list to them", (await rows(t, "#team-tasks-table")).length === 1 && (await text(t, "#team-tasks-card")).includes("Tasks of Arjun Kapoor"));
  await go(n, P.team, "hr");
  check("D7", "HR sees everyone in the progress table (8 people)", (await rows(t, "#people-table")).length === 8);
  await t.click("#assign-open"); await sleep(t, 300);
  check("D8", "HR's Assign picker holds everyone active", (await t.locator("#assign-assigneeId option").count()) >= 9);
  await n.ctx.close();
}

// ---------- B ----------
if (ONLY.includes("B")) {
  console.log("\n--- B. The bell ---");
  const n = await make("arjun");
  const t = n.t;
  await addIt(n);
  await go(n, "dashboard/employee.html", "arjun");
  await seed(t, { personal: [pt(1, { ownerId: "EMP-1105", title: "My own due tomorrow", dueDate: "2026-11-24" })] });
  await go(n, "dashboard/employee.html", "arjun");
  const label = await t.evaluate(() => document.querySelector(".topbar__icon-btn--dot")?.getAttribute("aria-label") ?? null);
  check("B1", "a plain employee's bell counts the update: 'Waiting for you: 0, 1 new update on your tasks'", label === "Waiting for you: 0, 1 new update on your tasks", label);
  await t.click(".topbar__icon-btn--dot"); await sleep(t, 350);
  check("B2", "the panel: 'Your tasks' with 'Due tomorrow: My own due tomorrow' (a personal task, to its owner)", (await text(t, "#bell-task-updates")).includes("Due tomorrow: My own due tomorrow"));
  await SHOT(t, "b-bell-arjun-1280-light");
  await t.keyboard.press("Escape"); await sleep(t, 200);
  for (let i = 0; i < 3; i++) { await go(n, "dashboard/employee.html", "arjun"); }
  check("B3", "reloads make no second update (still one)", (await stored(t)).notices.filter((x) => x.kind === "due-tomorrow").length === 1);
  await go(n, "dashboard/employee.html", "mgr");
  check("B4", "nobody else is told about it: the manager's bell has nothing from Arjun's personal task", !(await t.evaluate(() => document.body.innerText)).includes("My own due tomorrow"));
  await n.ctx.close();
}

// ---------- K ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard ---");
  const n = await make("rohan");
  const t = n.t;
  await go(n, P.todo, "rohan");
  await t.focus("#qa-title"); await t.keyboard.type("Keyboard task"); await t.keyboard.press("Enter"); await sleep(t, 400);
  check("K1", "typing a title and pressing Enter adds the task", (await trows(t)).length === 1);
  await t.focus('[role="tab"][aria-selected="true"]'); await t.keyboard.press("ArrowRight"); await sleep(t, 250);
  check("K2", "the arrow keys move between the tabs", (await t.locator('[role="tab"][aria-selected="true"]').innerText()).startsWith("Assigned by me"));
  await t.keyboard.press("ArrowLeft"); await sleep(t, 250);
  await t.focus("#todo-sections .tr__title"); await t.keyboard.press("Enter"); await sleep(t, 350);
  check("K3", "a task's dialog by keyboard (SD1: the title opens it): focus inside the dialog, Tab stays in, Esc closes and focus returns", (await t.evaluate(() => document.querySelector(".modal.is-open")?.contains(document.activeElement))) === true);
  for (let i = 0; i < 8; i++) await t.keyboard.press("Tab");
  const inside = await t.evaluate(() => document.querySelector(".modal.is-open")?.contains(document.activeElement));
  await t.keyboard.press("Escape"); await sleep(t, 300);
  check("K4", "...Tab stays inside; Esc closes; focus back on the title", inside === true && (await dialogOpen(t)) === 0 && (await t.evaluate(() => document.activeElement?.classList.contains("tr__title"))));
  const unnamed = await t.evaluate(() => [...document.querySelectorAll("main button, main a, main input, main select")].filter((b) => !(b.getAttribute("aria-label") || b.textContent.trim() || b.labels?.length)).length);
  check("K5", "every button, link, input and select on My to-do has a name", unnamed === 0, unnamed);
  await n.ctx.close();
}

// ---------- X ----------
const MANY = Array.from({ length: 30 }, (_, i) => pt(i + 1, { title: i === 0 ? "A very long task title that goes on and on so that the phone layout has to wrap it somewhere sensible and not scroll sideways at all" : `Task number ${i + 1}`, priority: ["low", "normal", "high", "urgent"][i % 4], dueDate: i % 3 ? "2026-12-0" + (1 + (i % 8)) : "2026-11-21", status: i % 7 === 0 ? "done" : "pending", notes: i === 1 ? "n".repeat(300) : "" }));
const WORKS = [wt(1, { title: "Overdue work from the manager", dueDate: "2026-11-20", priority: "urgent" }), wt(2, { title: "In progress", status: "in-progress", startedAt: AT }), wt(3, { title: "Finished", status: "done", doneAt: AT }), wt(4, { title: "Cancelled", status: "cancelled" }),
  wt(5, { assigneeId: "EMP-1105", title: "Arjun's overdue", dueDate: "2026-11-19" }), wt(6, { assigneeId: "EMP-1105", title: "Arjun's other", status: "in-progress" })];
const STATES = [
  ["empty", "arjun", async (n) => { await go(n, P.todo, "arjun"); await seed(n.t, {}); await go(n, P.todo, "arjun"); }],
  ["personal-many", "rohan", async (n) => { await go(n, P.todo, "rohan"); await seed(n.t, { personal: MANY }); await go(n, P.todo, "rohan"); }],
  ["work", "rohan", async (n) => { await go(n, P.todo, "rohan"); await seed(n.t, { work: WORKS }); await go(n, P.todo, "rohan"); await unfold(n.t); }],   // SD1: work is on Mine
  ["detail", "rohan", async (n) => { await go(n, P.todo, "rohan"); await seed(n.t, { work: WORKS }); await go(n, P.todo, "rohan"); await n.t.locator('[data-task^="WT-"] .tr__title').first().click(); await sleep(n.t, 350); }],
  ["assign-dialog", "mgr", async (n) => { await go(n, P.todo, "mgr"); await n.t.click("#assign-open"); await sleep(n.t, 350); }],
  ["by-me", "mgr", async (n) => { await go(n, P.todo, "mgr"); await seed(n.t, { work: WORKS }); await go(n, P.todo, "mgr"); await tab(n.t, "Assigned by me"); }],
  ["team", "mgr", async (n) => { await go(n, P.team, "mgr"); await seed(n.t, { work: WORKS }); await go(n, P.team, "mgr"); }],
  ["team-hr", "hr", async (n) => { await go(n, P.team, "hr"); await seed(n.t, { work: WORKS }); await go(n, P.team, "hr"); }],
  ["team-empty", "mgr", async (n) => { await go(n, P.team, "mgr"); await seed(n.t, {}); await go(n, P.team, "mgr"); }],
  ["card-employee", "rohan", async (n) => { await go(n, "dashboard/employee.html", "rohan"); await seed(n.t, { personal: [pt(1, { dueDate: "2026-11-22" })], work: WORKS }); await go(n, "dashboard/employee.html", "rohan"); }],
  ["card-manager", "mgr", async (n) => { await go(n, "dashboard/employee.html", "mgr"); await seed(n.t, { work: WORKS }); await go(n, "dashboard/employee.html", "mgr"); }],
  ["card-admin", "admin", async (n) => { await go(n, "dashboard/admin.html", "admin"); }],
  ["bell", "rohan", async (n) => { await go(n, "dashboard/employee.html", "rohan"); await seed(n.t, { personal: [pt(1, { dueDate: "2026-11-24" })], work: WORKS }); await go(n, "dashboard/employee.html", "rohan"); await n.t.click(".topbar__icon-btn--dot"); await sleep(n.t, 350); }],
  ["no-access", "arjun", async (n) => { await go(n, P.team, "arjun"); }],
];
let screens = 0;
if (ONLY.includes("X")) {
  console.log("\n--- X. Widths and themes ---");
  for (const [w, theme] of [[412, "light"], [768, "light"], [1280, "light"], [412, "dark"], [1280, "dark"]]) {
    const n = await make("rohan", { width: w, theme });
    const bad = [];
    for (const [name, who, setup] of STATES) {
      await setup(n);
      const r = await n.t.evaluate(() => ({ page: document.documentElement.scrollWidth <= window.innerWidth + 1, wide: [...document.querySelectorAll("main table[id], .modal.is-open table[id]")].filter((tb) => tb.scrollWidth > (tb.closest(".table-wrap, .ds-card__body, .card, .modal__body, main")?.clientWidth ?? 0) + 2).map((tb) => tb.id) }));
      if (!r.page || r.wide.length) bad.push(`${name} ${j(r)}`);
      await SHOT(n.t, `x-${name}-${who}-${w}-${theme}`);
      screens += 1;
      for (let i = 0; i < 2; i++) if (await dialogOpen(n.t)) { await n.t.keyboard.press("Escape"); await sleep(n.t, 200); }
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
    const m = await make("rohan", { theme });
    const low = [];
    let total = 0;
    for (const name of ["personal-many", "work", "detail", "card-employee"]) {
      const [, , setup] = STATES.find((s) => s[0] === name);
      await setup(m);
      const chips = await m.t.evaluate(() => {
        const probe = document.createElement("canvas").getContext("2d");
        // SD1: color(srgb ...) (from color-mix) read too
        const rgb = (css) => { const k = /^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)/.exec(String(css).trim()); if (k) return [1, 2, 3].map((i) => Math.round(Number(k[i]) * 255)); probe.fillStyle = "#000"; probe.fillStyle = css; const v = probe.fillStyle; const mm = /^#([0-9a-f]{6})$/i.exec(v); if (mm) return [0, 2, 4].map((i) => parseInt(mm[1].slice(i, i + 2), 16)); const q = /rgba?\(([^)]+)\)/.exec(v); return q ? q[1].split(",").slice(0, 3).map(Number) : [0, 0, 0]; };
        const root = getComputedStyle(document.documentElement);
        const token = (nm) => rgb(root.getPropertyValue(nm).trim());
        const out = [];
        for (const el of document.querySelectorAll("main .ds-pill, main .td-sub, main .td-card__label, main .td-title-btn, main .tr__tag, main .tr__due, main .tr__status, main .tr__who, main .ts__label, .modal.is-open .ds-pill, .modal.is-open .td-dl dt")) {   // SD1: the rows' words
          const cs = getComputedStyle(el);
          const bgs = cs.backgroundColor === "rgba(0, 0, 0, 0)" ? [token("--ds-surface-1"), token("--ds-surface-2")] : [rgb(cs.backgroundColor)];
          out.push({ label: el.textContent.trim().slice(0, 30), fg: rgb(cs.color), bgs });
        }
        return out;
      });
      total += chips.length;
      for (const c of chips) for (const b of c.bgs) if (ratio(c.fg, b) < 4.5) low.push(`${name} "${c.label}" ${ratio(c.fg, b).toFixed(2)}`);
    }
    check(`Z1.${theme}`, `${theme}: every chip, sub-line, link-button and label on the to-do screens reaches 4.5:1 (${total} read)`, total >= 30 && low.length === 0, j(low.slice(0, 5)));
    await m.ctx.close();
  }
}

console.log("\n--- E. Errors ---");
check("Z9", "no page or console errors", errs.length === 0, errs.slice(0, 5).join(" | "));
console.log(`\ntd1: passed ${passed}, failed ${failed}`);
await browser.close();
stop();
process.exit(failed ? 1 : 0);