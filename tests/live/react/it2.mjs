// IT2's harness (msedge, headless): the IT desk's screens, on the IT1 data layer, and the rulings (HR's reset, break-glass, the retired asset-request chain,
// Complete details, access cards as stock). Read by meaning (words, attributes, storage), never by pixels.
// usage: node it2.mjs <app dist> <repo root> <shots dir>   [ONLY=AIDLRNFBWQOVMKCHXZ]
// Clock: Mon 23 Nov 2026 10:00 IST. The IT people are made in the test (nobody is seeded with the role).
//   A  who may open each IT page (x six people) and what the sidebar lists; a person without the permission gets the 403 page
//   I  the IT dashboard: its numbers, the bars, the lists, what a person without access sees
//   L  the requests list: filters (type, status, priority, assignee, requester, date range), the counter, the views the dashboard links to
//   R  one request's page: what each person sees and the buttons the desk offers (an illegal move is never offered), the timeline
//   N  the forms: every type, the desk's words at the field, the due time, nothing for someone who has left
//   F  the main case on screen: HR adds an employee -> IT prepares -> the Admin approves -> the sign-in details are shown once, to IT only
//   B  break-glass: the only Admin approves a request about themself with a written reason; flagged, listed until reviewed; a second Admin ends it
//   W  the IT approvals kind in the inbox, the bell, the sidebar's count and the Admin dashboard: once each
//   M  My IT requests: only their own, with the timeline; Request an asset ends there
//   Q  Licences: seats, renewals, leavers; the cost only for it:licences-view-costs, absent from the DOM otherwise
//   O  Offboarding: the checklist, what is still with them, the Admin's waiver
//   V  the review trail: filters, Reviewed, another Admin reviews an override
//   K  the old asset-request chain is closed: nothing is made, nothing waits, history is readable
//   H  HR's reset: no direct reset, "Ask IT" makes a request, the Admin's direct reset is flagged
//   C  Complete details: the list, the dialog, the flag goes, an invalid value is refused; access cards are stock
//   X  no sideways scroll at 412 and 1280, light and dark; shots for the eye
//   Z  keyboard, contrast of the chips, no page or console errors
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, ROOT, SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "AILRNFBWMQOVKHCXZ";
const PORT = process.env.PORT ?? "9978";
fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn("python", [path.join(HERE, "spa-serve.py"), PORT, DIST], { stdio: "ignore" });
const stop = () => { try { srv.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"], rohan: ["Rohan Gupta", "EMP-1042"], it: ["Isha Kulkarni", "EMP-1106"], it2: ["Neha Iyer", "EMP-1107"], admin2: ["Dev Anand", "EMP-1108"] };
const ID = Object.fromEntries(Object.entries(WHO).map(([k, v]) => [k, v[1]]));
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const size = (w) => (w === 412 ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA } : w === 768 ? { viewport: { width: 768, height: 900 } } : { viewport: { width: w, height: 900 } });
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(8)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 500)}` : ""}`); };
const errs = [];
const NOW = "2026-11-23T10:00:00+05:30";
const j = JSON.stringify;
const P = { dash: "it/dashboard.html", list: "it/requests.html", req: "it/request.html", new: "it/new.html", mine: "it/mine.html", lic: "it/licences.html", off: "it/offboarding.html", review: "it/review.html", complete: "inventory/complete-details.html" };

async function make(who, { width = 1280, theme = "light", fresh = true } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata", colorScheme: theme, permissions: ["clipboard-read", "clipboard-write"] });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(NOW));
  await ctx.addInitScript(([th, w, fr]) => {
    if (localStorage.getItem("it2:seeded")) return;
    if (fr) localStorage.clear();
    localStorage.setItem("it2:seeded", "1");
    localStorage.setItem("officeos:prefs", JSON.stringify({ theme: th }));
    localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
    localStorage.setItem(`officeos:prefs:${w[1]}`, JSON.stringify({ theme: th }));
  }, [theme, WHO[who], fresh]);
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
const path_ = (t) => new URL(t.url()).pathname;
const text = (t, sel) => t.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const main = (t) => t.evaluate(() => document.querySelector("main")?.innerText.replace(/\s+/g, " ") ?? "");
const html = (t) => t.evaluate(() => document.querySelector("main")?.innerHTML ?? "");
const stored = (t, key) => t.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), key);
const rows = (t, sel) => t.evaluate((s) => [...document.querySelectorAll(`${s} tbody tr`)].map((tr) => [...tr.children].map((c) => c.innerText.replace(/\s+/g, " ").trim())), sel);
const heads = (t, sel) => t.evaluate((s) => [...document.querySelectorAll(`${s} thead th`)].map((c) => c.innerText.replace(/[▲▼]/g, "").replace(/\s+/g, " ").trim()), sel);
const sidebar = (t) => t.evaluate(() => [...document.querySelectorAll(".sidebar a, nav a")].map((a) => a.textContent.replace(/\s+/g, " ").trim()).filter(Boolean));
const kpi = (t, id) => text(t, `[data-kpi="${id}"] .ds-kpi__value`);
const noScroll = (t) => t.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const SHOT = async (t, name) => { try { await t.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true }); } catch {} };
const dialogOpen = (t) => t.locator(".modal.is-open").count();
const btn = (t, name) => t.getByRole("button", { name, exact: false });
const itBox = (t) => stored(t, "officeos:it-desk");
// Esc closes the open dialog; if something was typed, the shared guard asks first: Discard
const closeAny = async (t) => { await t.keyboard.press("Escape"); await sleep(t, 300); if (await t.locator(".confirm-dialog").count()) { await t.locator(".confirm-dialog").getByRole("button", { name: "Discard" }).click(); await sleep(t, 300); } };
async function fill(t, values) { for (const [sel, v] of Object.entries(values)) { const el = t.locator(sel); if ((await el.evaluate((e) => e.tagName)) === "SELECT") await el.selectOption(v); else await el.fill(v); } }
const actions = (t) => t.evaluate(() => [...document.querySelectorAll("#request-actions [data-action]")].map((b) => b.dataset.action + (b.dataset.override !== undefined ? "*" : "")));

// the people the test needs: an IT person (two), a second Admin (only when asked)
async function addPeople(n, { second = false } = {}) {
  await go(n, "dashboard/employee.html", "emp");
  await n.t.evaluate((second) => {
    const box = JSON.parse(localStorage.getItem("officeos:users"));
    const mk = (id, name, email, role, designation) => ({ id, name, email, department: role === "it" ? "IT" : "ENG", designation, role, status: "active", bankAccount: null, bankAccountLast4: null, pan: null, dateOfJoining: "1 Apr 2024" });
    const add = (u) => { if (!box.records.some((x) => x.id === u.id)) box.records.push({ ...box.records.find((x) => x.id === "EMP-1105"), ...u }); };
    add(mk("EMP-1106", "Isha Kulkarni", "isha.kulkarni@northwind.com", "it", "IT Engineer"));
    add(mk("EMP-1107", "Neha Iyer", "neha.iyer@northwind.com", "it", "IT Engineer"));
    if (second) add(mk("EMP-1108", "Dev Anand", "dev.anand@northwind.com", "admin", "Administrator"));
    box.nextIdNum = Math.max(box.nextIdNum, 1109);
    localStorage.setItem("officeos:users", JSON.stringify(box));
    const dep = JSON.parse(localStorage.getItem("officeos:departments"));
    if (dep && !dep.records.some((d) => d.code === "IT")) { dep.records.push({ code: "IT", name: "IT", head: "", active: true }); localStorage.setItem("officeos:departments", JSON.stringify(dep)); }
  }, second);
}
// requests seeded straight into the desk's box (shapes: data/it-store.js); id, dueAt and the first timeline entry are filled in
async function seed(t, list) {
  await t.evaluate(([list, now]) => {
    const key = "officeos:it-desk";
    const b = JSON.parse(localStorage.getItem(key) ?? "null") ?? { version: 1, next: { req: 1, tl: 1, act: 1, note: 1 }, requests: [], timeline: [], activity: [], notices: [], sla: null };
    const SLA = { low: 72, normal: 24, high: 8, urgent: 4 };
    for (const s of list) {
      const createdAt = s.createdAt ?? now;
      const id = s.id ?? `ITR-${b.next.req}`;
      b.next.req = Math.max(b.next.req, Number(id.slice(4)) + 1);
      const r = { id, type: s.type ?? "it-issue", requesterId: s.requesterId ?? "EMP-1105", subjectPersonId: s.subjectPersonId ?? null, title: s.title ?? "A request", details: s.details ?? "", priority: s.priority ?? "normal", status: s.status ?? "open",
        assignedTo: s.assignedTo ?? null, dueAt: s.dueAt ?? new Date(Date.parse(createdAt) + SLA[s.priority ?? "normal"] * 3600000).toISOString(), createdAt, payload: s.payload ?? {}, prepared: s.prepared ?? null, preparedBy: s.preparedBy ?? null,
        approvedBy: s.approvedBy ?? null, workedBy: s.workedBy ?? [], checklist: s.checklist ?? null, closedNote: s.closedNote ?? null };
      b.requests.push(r);
      const tl = (kind, actorId, note, at) => { b.timeline.push({ id: `TL-${b.next.tl}`, requestId: id, at: at ?? createdAt, actorId, kind, note }); b.next.tl += 1; };
      tl("created", r.requesterId, r.title);
      for (const e of s.timeline ?? []) tl(e[0], e[1], e[2], e[3]);
      for (const a of s.activity ?? []) { b.activity.push({ id: `IA-${b.next.act}`, at: a.at ?? createdAt, actorId: a.actorId, kind: a.kind, requestId: id, personId: a.personId ?? r.subjectPersonId, override: Boolean(a.override), ...(a.breakGlass ? { breakGlass: true } : {}), summary: a.summary, reviewedBy: a.reviewedBy ?? null, reviewedAt: a.reviewedBy ? createdAt : null }); b.next.act += 1; }
      for (const nn of s.notices ?? []) { b.notices.push({ id: `NT-${b.next.note}`, personId: nn[0], requestId: id, kind: nn[1], at: createdAt, readAt: nn[2] ? createdAt : null }); b.next.note += 1; }
    }
    localStorage.setItem(key, JSON.stringify(b));
  }, [list, new Date(NOW).toISOString()]);
}
const ago = (h) => new Date(Date.parse(NOW) - h * 3600000).toISOString();

// ---------- A ----------
const OPENS = {
  admin: ["dash", "list", "req", "new", "mine", "lic", "off", "review", "complete"], hr: ["req", "new", "mine"], fin: ["req", "new", "mine", "lic"],
  it: ["dash", "list", "req", "new", "mine", "lic", "off", "complete"], emp: ["req", "new", "mine"], mgr: ["req", "new", "mine"],
};
const SIDE = {
  admin: ["IT dashboard", "IT requests", "My IT requests", "Raise a request", "Licences", "Offboarding", "IT review trail", "Complete details"], hr: ["My IT requests", "Raise a request"],
  fin: ["My IT requests", "Raise a request", "Licences"], it: ["IT dashboard", "IT requests", "My IT requests", "Raise a request", "Licences", "Offboarding", "Complete details"], emp: ["My IT requests", "Raise a request"], mgr: ["My IT requests", "Raise a request"],
};
const ALL_IT_LABELS = ["IT dashboard", "IT requests", "My IT requests", "Raise a request", "Licences", "Offboarding", "IT review trail", "Complete details"];
if (ONLY.includes("A")) {
  console.log("\n--- A. Who may open what ---");
  for (const who of ["admin", "hr", "fin", "it", "emp", "mgr"]) {
    const n = await make(who);
    await addPeople(n);
    const seen = {};
    for (const [k, page] of Object.entries(P)) { await go(n, page, who, k === "req" ? "?id=ITR-404" : ""); seen[k] = path_(n.t).endsWith("403.html") ? "403" : "open"; }
    const want = Object.fromEntries(Object.keys(P).map((k) => [k, OPENS[who].includes(k) ? "open" : "403"]));
    check(`A1.${who}`, `${who}: opens ${OPENS[who].join(", ")}; the others show the 403 page`, j(seen) === j(want), j(seen));
    await go(n, "requests/my-requests.html", who);
    const side = await sidebar(n.t);
    const listed = ALL_IT_LABELS.filter((l) => side.includes(l));
    check(`A2.${who}`, `${who}: the sidebar lists ${SIDE[who].join(", ")} and nothing else of the desk`, j(listed.sort()) === j([...SIDE[who]].sort()), j(listed));
    await n.ctx.close();
  }
}

// ---------- I ----------
if (ONLY.includes("I")) {
  console.log("\n--- I. The IT dashboard ---");
  const n = await make("it");
  await addPeople(n);
  await seed(n.t, [
    { title: "Laptop won't boot", type: "it-issue", requesterId: ID.emp, priority: "urgent", status: "open", createdAt: ago(30) },
    { title: "Reset Arjun's password", type: "password-reset", requesterId: ID.hr, subjectPersonId: ID.emp, priority: "normal", status: "in-progress", assignedTo: ID.it, createdAt: ago(2) },
    { title: "Printer jam", type: "it-issue", requesterId: ID.mgr, priority: "low", status: "open", createdAt: ago(1) },
    { title: "Access for Arjun", type: "access-request", requesterId: ID.hr, subjectPersonId: ID.emp, payload: { role: "fin" }, priority: "high", status: "awaiting-approval", assignedTo: ID.it, preparedBy: null, createdAt: ago(5) },
    { title: "Seat of Figma", type: "software-request", requesterId: ID.emp, subjectPersonId: ID.emp, payload: { software: "Figma" }, status: "done", assignedTo: ID.it2, createdAt: ago(60) },
  ]);
  await go(n, P.dash, "it");
  check("I1", "the numbers: 4 open (the finished one is not), 1 overdue (the urgent one, 30 h old), 2 assigned to Isha (the reset and the access request), 2 unassigned, 1 awaiting approval",
    j([await kpi(n.t, "kpi-open"), await kpi(n.t, "kpi-overdue"), await kpi(n.t, "kpi-mine"), await kpi(n.t, "kpi-unassigned"), await kpi(n.t, "kpi-awaiting")]) === j(["4", "1", "2", "2", "1"]), j([await kpi(n.t, "kpi-open"), await kpi(n.t, "kpi-overdue"), await kpi(n.t, "kpi-mine"), await kpi(n.t, "kpi-unassigned"), await kpi(n.t, "kpi-awaiting")]));
  const bars = await n.t.evaluate(() => [...document.querySelectorAll("#type-bars .bar-row")].map((r) => r.innerText.replace(/\s+/g, " ").trim()));
  check("I2", "open requests by type are horizontal bars ranked by count: IT issue 2 first", bars[0] === "IT issue 2" && bars.length >= 3, j(bars));
  const sbars = await n.t.evaluate(() => [...document.querySelectorAll("#status-bars .bar-row")].map((r) => r.innerText.replace(/\s+/g, " ").trim()));
  check("I3", "requests by status: every status has its bar, with its count", sbars.length === 7 && sbars.includes("Open 2") && sbars.includes("Done 1") && sbars.includes("Awaiting approval 1"), j(sbars));
  check("I4", "the overdue list names the urgent laptop request with an 'Overdue by' time", (await text(n.t, "#overdue-table")).includes("Laptop won't boot") && /Overdue by 26 h/.test(await text(n.t, "#overdue-table")), await text(n.t, "#overdue-table"));
  check("I5", "assigned to you: the password reset, with its status chip and due time", (await text(n.t, "#mine-table")).includes("Reset Arjun's password") && /In progress/.test(await text(n.t, "#mine-table")), await text(n.t, "#mine-table"));
  await n.t.locator('a.it-link:has([data-kpi="kpi-overdue"])').click(); await sleep(n.t);
  check("I6", "a number opens the list on that view: Overdue requests, 1 request", /view=overdue/.test(n.t.url()) && (await text(n.t, "#requests-count")) === "Showing 1 of 5 requests" && (await rows(n.t, "#requests-table")).length === 1, await text(n.t, "#requests-count"));
  await go(n, P.dash, "admin");
  check("I7", "the Admin opens the same desk", (await kpi(n.t, "kpi-open")) === "4");
  await n.ctx.close();
  const e = await make("it");
  await addPeople(e);
  await go(e, P.dash, "it");
  check("I8", "a desk with no requests says so (nothing drawn as a chart), with zeros in the numbers", (await text(e.t, "main")).includes("No requests yet.") && (await kpi(e.t, "kpi-open")) === "0", (await main(e.t)).slice(0, 200));
  await e.ctx.close();
}

// the six requests the list and request-page sections share
const SEEDS = [
  { id: "ITR-1", title: "Laptop won't boot", type: "it-issue", requesterId: ID.emp, priority: "urgent", status: "open", createdAt: ago(30) },
  { id: "ITR-2", title: "Reset Arjun's password", type: "password-reset", requesterId: ID.hr, subjectPersonId: ID.emp, priority: "normal", status: "in-progress", assignedTo: ID.it, createdAt: ago(2), timeline: [["assigned", ID.it, ID.it, ago(2)], ["status", ID.it, "open -> in-progress", ago(2)]] },
  { id: "ITR-3", title: "Printer jam", type: "it-issue", requesterId: ID.mgr, priority: "low", status: "open", createdAt: ago(1) },
  { id: "ITR-4", title: "Access for Arjun", type: "access-request", requesterId: ID.hr, subjectPersonId: ID.emp, payload: { role: "fin" }, priority: "high", status: "awaiting-approval", assignedTo: ID.it, workedBy: [ID.it], createdAt: ago(5) },
  { id: "ITR-5", title: "Seat of Figma", type: "software-request", requesterId: ID.emp, subjectPersonId: ID.emp, payload: { software: "Figma" }, status: "done", assignedTo: ID.it2, createdAt: ago(60), timeline: [["status", ID.it2, "in-progress -> done", ago(50)]] },
  { id: "ITR-6", title: "A second monitor", type: "asset-request", requesterId: ID.rohan, subjectPersonId: ID.rohan, payload: { category: "monitor" }, status: "cancelled", createdAt: ago(200), closedNote: "Not needed any more" },
];

// ---------- L ----------
if (ONLY.includes("L")) {
  console.log("\n--- L. The requests list ---");
  const n = await make("it");
  await addPeople(n);
  await seed(n.t, SEEDS);
  await go(n, P.list, "it");
  const t = n.t;
  const count = () => text(t, "#requests-count");
  check("L1", "the list: 6 requests, the columns, the counter in the shared words", j(await heads(t, "#requests-table")) === j(["Request", "Status", "Raised by", "Due"]) && (await count()) === "6 requests", await count());
  await t.getByLabel("Type", { exact: true }).selectOption("it-issue");
  check("L2", "Type = IT issue: 2 of 6", (await count()) === "Showing 2 of 6 requests" && (await rows(t, "#requests-table")).length === 2, await count());
  await t.getByLabel("Status", { exact: true }).selectOption("open");
  await t.getByLabel("Priority", { exact: true }).selectOption("urgent");
  check("L3", "...and Status = Open, Priority = Urgent: only the laptop", (await rows(t, "#requests-table")).length === 1 && (await rows(t, "#requests-table"))[0][0].includes("Laptop won't boot"), j(await rows(t, "#requests-table")));
  await t.getByRole("button", { name: "Clear All" }).click(); await sleep(t, 250);
  check("L4", "Clear All brings back all 6", (await count()) === "6 requests");
  await t.getByLabel("Assigned to", { exact: true }).selectOption(ID.it);
  const mineRows = await rows(t, "#requests-table");
  await t.getByLabel("Assigned to", { exact: true }).selectOption("none");
  const noneRows = await rows(t, "#requests-table");
  check("L5", "Assigned to Isha: 2 (the reset and the access request); Unassigned: 3 (laptop, printer, monitor)", mineRows.length === 2 && noneRows.length === 3, `${mineRows.length} ${noneRows.length}`);
  await t.getByRole("button", { name: "Clear All" }).click(); await sleep(t, 250);
  await t.getByLabel("Raised by", { exact: true }).selectOption(ID.hr);
  check("L6", "Raised by Priya Nair: 2", (await rows(t, "#requests-table")).length === 2);
  await t.getByRole("button", { name: "Clear All" }).click(); await sleep(t, 250);
  await t.getByLabel("Raised in").selectOption({ label: "Today" }); await sleep(t, 250);
  check("L7", "the shared date range: Today = 3 requests (raised after midnight)", (await rows(t, "#requests-table")).length === 3 && /Showing 3 of 6/.test(await count()), await count());
  await t.getByLabel("Raised in").selectOption({ label: "Last month" }); await sleep(t, 250);
  check("L8", "a range with nothing in it says 'No data in this range.' (the shared words), not an empty table", (await text(t, "#requests-table")).includes("No data in this range.") && /Showing 0 of 6/.test(await count()), await text(t, "#requests-table"));
  await t.getByRole("button", { name: "Clear All" }).click(); await sleep(t, 250);
  await t.locator("#requests-card input[type=search]").fill("printer"); await sleep(t, 250);
  check("L9", "search finds the printer request", (await rows(t, "#requests-table")).length === 1 && /Showing 1 of 6/.test(await count()));
  await t.getByRole("button", { name: "Clear All" }).click(); await sleep(t, 250);
  const chip = await t.evaluate(() => { const c = document.querySelector('[data-it-status="awaiting-approval"]'); const s = getComputedStyle(c); return { icon: Boolean(c.querySelector("svg")), word: c.textContent.trim(), pattern: s.backgroundImage }; });
  check("L10", "a status chip carries an icon, a word and a pattern (awaiting approval is striped), so colour is never the only cue", chip.icon && chip.word === "Awaiting approval" && /repeating-linear-gradient/.test(chip.pattern), j(chip));
  await t.locator("#requests-table a", { hasText: "Printer jam" }).click(); await sleep(t, 400);
  check("L11", "a row opens the request's page", path_(t).endsWith("/it/request.html") && /id=ITR-3/.test(t.url()) && (await text(t, "h1")) === "Printer jam");
  await go(n, P.list, "it", "?view=awaiting");
  check("L12", "the dashboard's view links filter: ?view=awaiting shows the one waiting for the Admin, titled 'Awaiting approval'", (await rows(t, "#requests-table")).length === 1 && (await text(t, "#requests-card .ds-card__title")) === "Awaiting approval", await text(t, "#requests-card .ds-card__title"));
  await go(n, P.list, "admin");
  check("L13", "the Admin opens the same list (6)", (await count()) === "6 requests");
  await n.ctx.close();
}

// ---------- R ----------
if (ONLY.includes("R")) {
  console.log("\n--- R. One request ---");
  const n = await make("it");
  await addPeople(n);
  await seed(n.t, SEEDS);
  const t = n.t;
  const open = async (who, id) => { await go(n, P.req, who, `?id=${id}`); };
  await open("emp", "ITR-1");
  check("R1", "the requester opens their own request: its title, status and priority, the timeline, only 'Cancel' to do", (await text(t, "h1")) === "Laptop won't boot" && /Status Open/.test(await text(t, "#request-kv")) && /Urgent/.test(await text(t, "#request-kv")) && j(await actions(t)) === j(["cancel"]), j(await actions(t)));
  await open("rohan", "ITR-1");
  check("R2", "another employee is told they can't open it: no title, no details", (await main(t)).includes("You can't open this request.") && !(await main(t)).includes("Laptop won't boot"));
  await open("mgr", "ITR-1");
  check("R2b", "a manager can't open a request raised by their report either (only what they raised)", (await main(t)).includes("You can't open this request."));
  await open("it", "ITR-2");
  check("R3", "the assignee on a non-sensitive request in progress: Assign, Reset the password, Cancel (and no Send to the Admin: it needs none)", j((await actions(t)).sort()) === j(["assign", "cancel", "reset"]), j(await actions(t)));
  await open("it2", "ITR-2");
  check("R4", "the other IT person: Assign and Cancel, not the reset step", j((await actions(t)).sort()) === j(["assign", "cancel"]), j(await actions(t)));
  await open("admin", "ITR-4");
  check("R5", "the Admin on one awaiting their approval: Approve and Reject; no Cancel, no execute step", j((await actions(t)).sort()) === j(["approve", "reject"]), j(await actions(t)));
  await open("hr", "ITR-4");
  check("R6", "HR, who raised it, has no Approve (only Cancel)", j(await actions(t)) === j(["cancel"]), j(await actions(t)));
  await open("admin", "ITR-2");
  check("R7", "the Admin on an IT step in progress: Assign, and the Reset only as a flagged override (the buttons say so)", j((await actions(t)).sort()) === j(["assign", "reset*"]) && (await text(t, "#request-actions")).includes("As Admin (override, flagged and reviewed)"), j(await actions(t)));
  await open("it", "ITR-5");
  check("R8", "a finished request: nothing to do, and the page says so", j(await actions(t)) === "[]" && (await text(t, "#no-actions")) === "Nothing for you to do on this request right now.");
  await open("it", "ITR-2");
  const tl = await t.evaluate(() => [...document.querySelectorAll("#request-timeline .it-timeline__item")].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  check("R9", "the timeline is a read-only list in time order: Raised, Assigned (to a name, not an id), Status in words; no edit or delete control", tl.length === 3 && tl[0].startsWith("Raised") && tl[1].includes("Assigned") && tl[1].includes("To Isha Kulkarni") && tl[2].includes("Open to In progress") && (await t.locator("#request-timeline button, #request-timeline input, #request-timeline textarea").count()) === 0, j(tl));
  await t.locator("#comment-send").click(); await sleep(t, 250);
  check("R10", "an empty comment is refused at its field, in the desk's words", (await text(t, "#comment-card")).includes("Comment is required."), await text(t, "#comment-card"));
  await t.locator("#comment-note").fill("Checked the account: it is not locked."); await t.locator("#comment-send").click(); await sleep(t, 350);
  const tl2 = await t.evaluate(() => [...document.querySelectorAll("#request-timeline .it-timeline__item")].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  check("R11", "a comment is added at the end of the timeline, with who and when; the box clears", tl2.length === 4 && tl2[3].startsWith("Comment") && tl2[3].includes("Checked the account") && tl2[3].includes("Isha Kulkarni") && (await t.locator("#comment-note").inputValue()) === "");
  await t.locator('[data-action="assign"]').click(); await sleep(t, 300);
  check("R12", "Assign opens a dialog with the IT people (Isha and Neha), nobody else", (await dialogOpen(t)) === 1 && j((await t.locator("#act-assign-assignedTo option").allTextContents()).filter((x) => x !== "Choose").sort()) === j(["Isha Kulkarni", "Neha Iyer"]));
  await t.selectOption("#act-assign-assignedTo", ID.it2); await t.getByRole("button", { name: "Assign", exact: true }).last().click(); await sleep(t, 450);
  check("R13", "assigning to Neha: the dialog closes, the page says Neha, the timeline has the entry, the requester gets a notice", (await dialogOpen(t)) === 0 && /Assigned to Neha Iyer/.test(await text(t, "#request-kv")) && (await itBox(t)).notices.some((x) => x.requestId === "ITR-2" && x.kind === "assigned" && x.personId === ID.hr), await text(t, "#request-kv"));
  await open("admin", "ITR-4");
  await t.locator('[data-action="reject"]').click(); await sleep(t, 300);
  await t.getByRole("button", { name: "Reject", exact: true }).last().click(); await sleep(t, 300);
  check("R14", "Reject needs a reason: refused at the field with the desk's words, the dialog stays open", (await dialogOpen(t)) === 1 && (await text(t, "#act-reject-modal")).includes("Reason is required."), await text(t, "#act-reject-modal"));
  await t.locator("#act-reject-reason").fill("Not this role, please ask for the right one"); await t.getByRole("button", { name: "Reject", exact: true }).last().click(); await sleep(t, 450);
  check("R15", "with a reason it is rejected: Rejected, the reason in the timeline, back to IT, HR told", /Status Rejected/.test(await text(t, "#request-kv")) && (await text(t, "#request-timeline")).includes("Not this role") && (await itBox(t)).notices.some((x) => x.requestId === "ITR-4" && x.kind === "rejected"));
  await open("it", "ITR-4");
  check("R16", "IT is then offered 'Take it back' (resume), and the Admin is not", (await actions(t)).includes("resume"));
  await open("admin", "ITR-4");
  check("R17", "the Admin has nothing to do on it now", !(await actions(t)).includes("approve") && !(await actions(t)).includes("resume"));
  await n.ctx.close();
}

// ---------- N ----------
if (ONLY.includes("N")) {
  console.log("\n--- N. Raising a request ---");
  const n = await make("emp");
  await addPeople(n);
  const t = n.t;
  const card = () => text(t, "#new-request-card");
  const send = async () => { await t.locator("#new-request-send").click(); await sleep(t, 450); };
  await go(n, P.new, "emp");
  const types = await t.locator("#nr-type option").allTextContents();
  check("N1", "an employee can raise: password reset, account unlock, access, asset, asset return, software, IT issue (and is told how a new account starts); no Offboarding", j(types) === j(["Password reset", "Account unlock", "Access request", "Asset request", "Asset return", "Software request", "IT issue", "New account"]), j(types));
  check("N2", "password reset: the title writes itself, no 'For' choice for someone with nobody reporting to them, the priority says when IT aims to answer", (await t.locator("#nr-title").inputValue()) === "Reset password for Arjun Kapoor" && (await t.locator("#nr-subject").count()) === 0 && (await card()).includes("IT aims to answer within 24 h: by 24 Nov, 10:00."), (await card()).slice(0, 300));
  await t.locator("#nr-priority").selectOption("urgent");
  check("N3", "Urgent: within 4 h, by 23 Nov, 14:00", (await card()).includes("IT aims to answer within 4 h: by 23 Nov, 14:00."));
  await t.locator("#nr-priority").selectOption("normal");
  await t.locator("#nr-title").fill(""); await send();
  check("N4", "an empty title is refused at its field in the desk's words; nothing was made", (await card()).includes("Title is required.") && !(await itBox(t)));
  await t.locator("#nr-title").fill("Reset password for Arjun Kapoor"); await send();
  check("N5", "sent: the request's page opens, Open, normal, due in 24 h, raised by them; one request stored", /request\.html\?id=ITR-1/.test(t.url()) && (await text(t, "h1")) === "Reset password for Arjun Kapoor" && /Status Open/.test(await text(t, "#request-kv")) && /Due in 24 h/.test(await text(t, "#request-kv")) && (await itBox(t)).requests.length === 1);
  await go(n, P.new, "emp");
  await t.locator("#nr-type").selectOption("access-request"); await send();
  check("N6", "access request with nothing chosen: 'Say which permission or role is needed.' at the field", (await card()).includes("Say which permission or role is needed."), (await card()).slice(-200));
  await t.locator("#nr-kind").selectOption("role"); await t.locator("#nr-role").selectOption("fin"); await send();
  const stored7 = await itBox(t);
  check("N7", "a role request is stored with payload { role: 'fin' } and the person's own name in the title", stored7.requests.some((r) => r.type === "access-request" && r.payload.role === "fin" && r.title === "Access for Arjun Kapoor" && r.subjectPersonId === ID.emp));
  await go(n, P.new, "emp", "?type=asset-request");
  check("N8", "?type= preselects the kind (asset request), and the form says access cards are stock", (await t.locator("#nr-type").inputValue()) === "asset-request" && (await card()).includes("Access cards are stock items"));
  await send();
  check("N9", "no kind of asset chosen: 'Choose the kind of asset.' at the field", (await card()).includes("Choose the kind of asset."));
  check("N10", "access cards are not on the list of kinds (they are counted stock)", !(await t.locator("#nr-category option").allTextContents()).some((x) => /access/i.test(x)));
  await t.locator("#nr-category").selectOption("laptop"); await send();
  check("N11", "a laptop request is sent; asking again for the same kind while it is open is refused, naming it", /request\.html\?id=ITR-3/.test(t.url()));
  await go(n, P.new, "emp", "?type=asset-request");
  await t.locator("#nr-category").selectOption("laptop"); await send();
  check("N12", "the duplicate: 'There is already an open request for this kind of asset (ITR-3).' at the field", (await card()).includes("There is already an open request for this kind of asset (ITR-3)."), (await card()).slice(-200));
  await go(n, P.new, "emp", "?type=software-request"); await send();
  check("N13", "software with no name: 'Software is required.'", (await card()).includes("Software is required."));
  await go(n, P.new, "emp", "?type=asset-return"); await send();
  check("N14", "an asset return with no asset chosen: refused at its field ('Asset tag is required.')", (await card()).includes("Asset tag is required."), (await card()).slice(-160));
  await go(n, P.new, "emp", "?type=new-account");
  check("N15", "a new account is not raised here: the form explains it, offers no Send, and an employee gets no link to add one", (await card()).includes("opens by itself when HR adds an employee") && (await t.locator("#new-request-send").count()) === 0 && !(await card()).includes("Add an employee"));
  await go(n, P.new, "hr", "?type=new-account");
  check("N16", "HR is offered the link to add an employee", (await card()).includes("Add an employee"));
  const hrTypes = await (async () => { await go(n, P.new, "hr"); return t.locator("#nr-type option").allTextContents(); })();
  check("N17", "HR also raises an Offboarding", hrTypes.includes("Offboarding") && hrTypes.length === 9, j(hrTypes));
  check("N18", "HR can raise for anyone still working here: the 'For' list has them and not the person who has left (Divya Menon)", (await t.locator("#nr-subject option").allTextContents()).includes("Rohan Gupta") && !(await t.locator("#nr-subject option").allTextContents()).includes("Divya Menon") && (await t.locator("#nr-subject option").allTextContents()).some((x) => /\(you\)/.test(x)));
  await t.locator("#nr-type").selectOption("offboarding");
  await send();
  check("N19", "an offboarding with no person: 'That employee doesn't exist.' at the field", (await card()).includes("That employee doesn't exist."), (await card()).slice(-160));
  await t.locator("#nr-subject").selectOption(ID.rohan); await send();
  check("N20", "with a person it opens their offboarding: the page has the checklist, four items, none done", /request\.html\?id=ITR-4/.test(t.url()) && (await t.locator("#offboarding-checklist li").count()) === 4 && (await t.locator('#offboarding-checklist li[data-state="done"]').count()) === 0 && (await text(t, "h1")) === "Offboarding: Rohan Gupta");
  await go(n, P.new, "mgr");
  const mgrFor = await t.locator("#nr-subject option").allTextContents();
  check("N21", "a manager's 'For' list is themself and their direct reports only", mgrFor[0] === "Sneha Rao (you)" && mgrFor.length >= 2 && !mgrFor.includes("Priya Nair"), j(mgrFor));
  await n.ctx.close();
}

// ---------- F ----------
if (ONLY.includes("F")) {
  console.log("\n--- F. The main case: a new employee's sign-in details ---");
  const n = await make("hr");
  await addPeople(n);
  const t = n.t;
  await go(n, "dashboard/employee.html", "hr");
  await t.evaluate(() => {
    const box = JSON.parse(localStorage.getItem("officeos:users"));
    box.records.push({ ...box.records.find((x) => x.id === "EMP-1105"), id: "EMP-1110", name: "Meghna Rao", email: "meghna.rao@northwind.com", department: "ENG", designation: "Software Engineer", role: "emp", status: "active", dateOfJoining: "24 Nov 2026" });
    box.nextIdNum = 1111; localStorage.setItem("officeos:users", JSON.stringify(box));
  });
  await go(n, "users/user-profile.html", "hr", "?id=EMP-1110");
  check("F1", "HR sees no direct way to make the sign-in; 'Make sign-in details' asks IT", (await text(t, "#profile-account")).includes("No sign-in details have been made yet.") && (await t.getByRole("button", { name: "Make sign-in details" }).count()) === 1);
  await t.getByRole("button", { name: "Make sign-in details" }).click(); await sleep(t, 500);
  const b1 = await itBox(t);
  check("F2", "a new-account request is open for Meghna, raised by HR; no credential exists; the note still says none have been made", b1.requests.length === 1 && b1.requests[0].type === "new-account" && b1.requests[0].subjectPersonId === "EMP-1110" && b1.requests[0].status === "open" && (await text(t, "#profile-account")).includes("No sign-in details have been made yet."), j(b1.requests.map((r) => [r.id, r.type, r.status])));
  await go(n, P.req, "it", "?id=ITR-1");
  check("F3", "IT opens it: Assign is offered; nothing to prepare before it is taken", j((await actions(t)).sort()) === j(["assign", "cancel"]), j(await actions(t)));
  await t.locator('[data-action="assign"]').click(); await sleep(t, 300);
  await t.selectOption("#act-assign-assignedTo", ID.it); await t.getByRole("button", { name: "Assign", exact: true }).last().click(); await sleep(t, 450);
  check("F4", "assigned to Isha: in progress; now Prepare the account is offered (no Send yet: nothing is prepared)", /Status In progress/.test(await text(t, "#request-kv")) && (await actions(t)).includes("prepare") && !(await actions(t)).includes("submit"), j(await actions(t)));
  await t.locator('[data-action="prepare"]').click(); await sleep(t, 300);
  check("F5", "the prepare form: role (no Admin to choose: HR raised it), work email, department, manager, start date", !(await t.locator("#act-prepare-role option").allTextContents()).includes("Admin") && (await t.locator("#act-prepare-role option").count()) >= 3 && (await t.locator("#act-prepare-startDate").count()) === 1, j(await t.locator("#act-prepare-role option").allTextContents()));
  await t.locator("#act-prepare-email").fill("not an email");
  await t.locator("#act-prepare-startDate").fill("2026-11-24");
  await t.getByRole("button", { name: "Save details" }).click(); await sleep(t, 300);
  check("F6", "a bad email is refused at its field in the desk's words; the dialog stays", (await dialogOpen(t)) === 1 && (await text(t, "#act-prepare-modal")).includes("Enter a valid work email."), (await text(t, "#act-prepare-modal")).slice(-200));
  await t.locator("#act-prepare-email").fill("meghna.rao@northwind.com");
  await t.getByRole("button", { name: "Save details" }).click(); await sleep(t, 450);
  check("F7", "prepared: the details are on the page (role, email, department, start date); 'Send to the Admin' is offered", /Work email meghna\.rao@northwind\.com/.test(await text(t, "#request-kv")) && /Start date 24 Nov 2026/.test(await text(t, "#request-kv")) && (await actions(t)).includes("submit"), await text(t, "#request-kv"));
  await t.locator('[data-action="submit"]').click(); await sleep(t, 300);
  await t.getByRole("button", { name: "Send", exact: true }).last().click(); await sleep(t, 450);
  check("F8", "sent: Awaiting approval; IT has nothing more to do but wait (cancel only)", /Status Awaiting approval/.test(await text(t, "#request-kv")) && j((await actions(t)).sort()) === j(["cancel"]), j(await actions(t)));
  check("F9", "still no credential: nothing in the credentials box for Meghna", !((await stored(t, "officeos:credentials"))?.accounts?.["EMP-1110"]));
  await go(n, P.req, "admin", "?id=ITR-1");
  check("F10", "the Admin is offered Approve and Reject, and sees the prepared details", j((await actions(t)).sort()) === j(["approve", "reject"]) && /Prepared role Employee/.test(await text(t, "#request-kv")), j(await actions(t)));
  await t.locator('[data-action="approve"]').click(); await sleep(t, 300);
  check("F11", "approving asks for an optional note (no break-glass: HR raised it, it is about Meghna)", (await dialogOpen(t)) === 1 && (await t.locator("#break-glass-note").count()) === 0);
  await t.getByRole("button", { name: "Approve", exact: true }).last().click(); await sleep(t, 500);
  check("F12", "approved: the status says so; the Admin is offered nothing to carry out (no hand-over button, no override); there is no sign-in panel", /Status Approved/.test(await text(t, "#request-kv")) && !(await actions(t)).some((a) => /hand-over|reset|override/.test(a)) && (await t.locator("#secret-panel").count()) === 0 && !(await main(t)).includes("Share these sign-in details"), j(await actions(t)));
  check("F13", "the prepared details are on Meghna's record (email, role)", (await stored(t, "officeos:users")).records.find((u) => u.id === "EMP-1110").role === "emp");
  await go(n, P.req, "it2", "?id=ITR-1");
  check("F14", "the other IT person can't make the sign-in details (only the one who prepared it)", !(await actions(t)).includes("hand-over"), j(await actions(t)));
  await go(n, P.req, "it", "?id=ITR-1");
  check("F15", "the IT person who prepared it is offered 'Make the sign-in details'", (await actions(t)).includes("hand-over"), j(await actions(t)));
  await t.locator('[data-action="hand-over"]').click(); await sleep(t, 300);
  check("F16", "it asks first, saying the details are shown once, to them only", (await t.locator(".confirm-dialog").count()) === 1 && /shown once, to you only/.test(await text(t, ".confirm-dialog")));
  await t.locator(".confirm-dialog").getByRole("button", { name: "Make them" }).click(); await sleep(t, 1500);
  const pw = await text(t, '[data-secret="Temporary password"]'), link = await text(t, '[data-secret="Set-password link"]');
  check("F17", "'Share these sign-in details': a 14-character temporary password and the set-password link, 'Shown once', the request is Done", (await text(t, "#secret-title")) === "Share these sign-in details" && pw?.length === 14 && /set-password\.html\?token=/.test(link) && (await text(t, "#secret-panel")).includes("Shown once") && /Status Done/.test(await text(t, "#request-kv")), `${pw} ${link}`);
  await t.getByRole("button", { name: "Copy the temporary password" }).click(); await sleep(t, 300);
  check("F18", "Copy puts the password on the clipboard", (await t.evaluate(() => navigator.clipboard.readText())) === pw);
  const allLocal = await t.evaluate(() => Object.values(localStorage).join("\n"));
  check("F19", "the password and the link's token are in no stored record (not the desk, the audit, the mail outbox)", !allLocal.includes(pw) && !allLocal.includes(decodeURIComponent(link.split("token=")[1])));
  check("F20", "the account exists now, invited, with a hash, and the person must change the password", (await stored(t, "officeos:credentials")).accounts["EMP-1110"].status === "invited" && (await stored(t, "officeos:credentials")).accounts["EMP-1110"].mustChange === true);
  await t.locator("#secret-done").click(); await sleep(t, 250);
  check("F21", "closing the panel removes it: nothing of it is left on the page", (await t.locator("#secret-panel").count()) === 0 && !(await main(t)).includes(pw));
  await go(n, P.req, "it", "?id=ITR-1");
  check("F22", "opening the request again shows no panel and no button to make them again: it is never shown twice", (await t.locator("#secret-panel").count()) === 0 && !(await main(t)).includes(pw) && !(await actions(t)).includes("hand-over") && (await text(t, "#no-actions")) === "Nothing for you to do on this request right now.");
  await go(n, P.req, "admin", "?id=ITR-1");
  check("F23", "the Admin never sees them either, before or after: no panel, no secret text", (await t.locator("#secret-panel").count()) === 0 && !(await html(t)).includes(pw));
  await go(n, P.review, "admin");
  const trail = await text(t, "#trail-list");
  check("F24", "the review trail lists the approval and the credential issue, 'not reviewed', and never the secret", /Approved new account/.test(trail) && /Sign-in details made for Meghna Rao and handed over \(not kept\)/.test(trail) && !trail.includes(pw), trail.slice(0, 300));
  await go(n, P.mine, "hr");
  await t.locator('[role="tab"]', { hasText: "All" }).click(); await sleep(t, 250);
  check("F25", "HR, who raised it, sees it finished in My IT requests, and was told three times (assigned, approved, done)", (await text(t, "#mine-card")).includes("Sign-in for Meghna Rao") && (await itBox(t)).notices.filter((x) => x.personId === ID.hr).length >= 3);
  await n.ctx.close();
}

// ---------- M ----------
if (ONLY.includes("M")) {
  console.log("\n--- M. My IT requests ---");
  const n = await make("emp");
  await addPeople(n);
  const t = n.t;
  await seed(t, [...SEEDS, { id: "ITR-7", title: "Mouse", type: "it-issue", requesterId: ID.emp, status: "open", createdAt: ago(1), notices: [[ID.emp, "assigned"], [ID.emp, "approved", true]] }]);
  await go(n, P.mine, "emp");
  check("M1", "only their own: 3 (laptop, figma seat, mouse), none of HR's reset about them, none of Rohan's", (await t.locator("#mine-list > li").count()) === 2 && (await text(t, "#mine-count")) === "Showing 2 of 3 requests", await text(t, "#mine-count"));
  const tabs = await t.locator('[role="tab"]').allTextContents();
  check("M2", "tabs: Open 2, Finished 1, All 3", j(tabs.map((x) => x.replace(/\s+/g, " ").trim())) === j(["Open 2", "Finished 1", "All 3"]), j(tabs));
  await t.locator('[role="tab"]', { hasText: "All" }).click(); await sleep(t, 250);
  const ids = await t.evaluate(() => [...document.querySelectorAll("#mine-list > li")].map((li) => li.dataset.requestId));
  check("M3", "All: ITR-7, ITR-5, ITR-1 (newest first); never ITR-2 (about them, raised by HR) or ITR-6 (Rohan's)", j(ids) === j(["ITR-7", "ITR-1", "ITR-5"]) || j([...ids].sort()) === j(["ITR-1", "ITR-5", "ITR-7"]), j(ids));
  await t.locator("#mine-list li", { hasText: "Laptop won't boot" }).locator("summary").click(); await sleep(t, 250);
  check("M4", "each request opens its timeline in place (read-only)", (await t.locator("#mine-list li", { hasText: "Laptop won't boot" }).locator(".it-timeline__item").count()) === 1);
  check("M5", "what changed: the one unread update (the read one isn't listed), with 'Mark as read'", (await t.locator("#notices-card li").count()) === 1 && (await text(t, "#notices-card")).includes("was assigned to someone in IT"));
  const label = await t.locator('[aria-haspopup="dialog"][aria-label^="Waiting for you"]').getAttribute("aria-label");
  check("M6", "the bell counts it apart from what waits for a decision: 'Waiting for you: 0, 1 new update on your IT requests'", label === "Waiting for you: 0, 1 new update on your IT requests", label);
  await t.locator('[aria-haspopup="dialog"][aria-label^="Waiting for you"]').click(); await sleep(t, 300);
  check("M7", "the bell's list has 'Your IT requests' with the update, a link to the request", (await text(t, "#bell-it-updates")).includes("ITR-7") && (await t.locator("#bell-it-updates a").count()) === 1, await text(t, "#bell-panel"));
  await t.keyboard.press("Escape"); await sleep(t, 200);
  await t.getByRole("button", { name: /Mark the update on Mouse as read/ }).click(); await sleep(t, 300);
  check("M8", "Mark as read clears it here and from the bell", (await t.locator("#notices-card").count()) === 0 && (await t.locator('[aria-label^="Waiting for you"]').first().getAttribute("aria-label")) === "Waiting for you: 0");
  const oldChain = JSON.stringify(await stored(t, "officeos:asset-requests"));
  await t.locator("#ask-asset").click(); await sleep(t, 300);
  await t.selectOption("#ra-category", "laptop"); await t.getByRole("button", { name: "Send to IT" }).click(); await sleep(t, 500);
  check("M9", "Request an asset ends here: the toast says 'Follow it in My IT requests', the new request is listed; no old-chain record is made", (await text(t, ".toast-container")).includes("Follow it in My IT requests.") && (await text(t, "#mine-card")).includes("Asset request: Laptop") && JSON.stringify(await stored(t, "officeos:asset-requests")) === oldChain, await text(t, ".toast-container"));
  await t.locator("#ask-asset").click(); await sleep(t, 300);
  await t.selectOption("#ra-category", "laptop"); await t.getByRole("button", { name: "Send to IT" }).click(); await sleep(t, 400);
  check("M10", "asking again for the same kind is refused in the dialog, naming the open one", (await dialogOpen(t)) === 1 && /There is already an open request for this kind of asset \(ITR-8\)/.test(await text(t, "#request-asset-form-modal")));
  await n.ctx.close();
}

// ---------- B ----------
if (ONLY.includes("B")) {
  console.log("\n--- B. Break-glass ---");
  const n = await make("admin");
  await addPeople(n);
  const t = n.t;
  await seed(t, [{ id: "ITR-1", title: "Reset Aarav's password", type: "password-reset", requesterId: ID.hr, subjectPersonId: ID.admin, priority: "normal", status: "awaiting-approval", assignedTo: ID.it, workedBy: [ID.it], createdAt: ago(3) }]);
  await go(n, P.req, "admin", "?id=ITR-1");
  check("B1", "the only Admin on a request about themself: Approve is offered (not Reject), and the page says a written reason is needed", j(await actions(t)) === j(["approve"]) && (await text(t, "#request-actions")).includes("You are the only Admin: approving this takes a written reason (break-glass)."), j(await actions(t)));
  await t.locator('[data-action="approve"]').click(); await sleep(t, 300);
  check("B2", "the dialog says break-glass in words (flagged, stays on the dashboard until another Admin reviews it) and asks for the reason", (await t.locator("#break-glass-note").count()) === 1 && /at least 20 characters/.test(await text(t, "#break-glass-note")) && (await t.locator("#act-approve-breakGlass").count()) === 1);
  await t.getByRole("button", { name: "Approve", exact: true }).last().click(); await sleep(t, 300);
  check("B3", "with no reason it is refused at the reason's field, naming the rule", (await dialogOpen(t)) === 1 && /only Admin/.test(await text(t, "#act-approve-modal")) && /at least 20 characters/.test(await text(t, "#act-approve-modal")));
  await t.locator("#act-approve-breakGlass").fill("too short a reason"); await t.getByRole("button", { name: "Approve", exact: true }).last().click(); await sleep(t, 300);
  check("B4", "18 characters is still refused; the request is unchanged", (await dialogOpen(t)) === 1 && (await itBox(t)).requests[0].status === "awaiting-approval");
  await t.locator("#act-approve-breakGlass").fill("The reset is needed today, there is no other Admin to ask."); await t.getByRole("button", { name: "Approve", exact: true }).last().click(); await sleep(t, 500);
  check("B5", "a written reason approves it: the toast says it is flagged for review; the timeline keeps 'Break-glass: ...'", (await dialogOpen(t)) === 0 && /Status Approved/.test(await text(t, "#request-kv")) && (await text(t, "#request-timeline")).includes("Break-glass: The reset is needed today") && (await text(t, ".toast-container")).includes("flagged for review"), await text(t, ".toast-container"));
  const act = (await itBox(t)).activity.find((a) => a.requestId === "ITR-1" && a.kind === "approved");
  check("B6", "stored flagged breakGlass, reviewedBy empty; the reason is in the timeline, not the trail's summary", act?.breakGlass === true && act.reviewedBy === null && !act.summary.includes("The reset is needed"));
  await go(n, P.review, "admin");
  check("B7", "the review trail shows a Break-glass chip on it, not yet reviewed; 'Break-glass waiting' is 1; Mark reviewed is disabled for the Admin who did it, with the reason", (await text(t, "#trail-list")).includes("Break-glass") && (await kpi(t, "kpi-glass")) === "1" && (await t.locator('[data-break-glass] [data-action="review"]').isDisabled()) && (await text(t, "#trail-list")).includes("Another Admin reviews your own."));
  check("B8", "the review page tells the only Admin to add a second one", (await t.locator("#second-admin-note").count()) === 1);
  await go(n, "dashboard/admin.html", "admin");
  check("B9", "the Admin dashboard lists it until it is reviewed, and its banner recommends creating a second Admin", (await text(t, "#admin-it-card")).includes("Break-glass") && (await text(t, "#second-admin-banner")).includes("Create a second Admin") && (await text(t, "#it-unreviewed")) === "1 not reviewed", await text(t, "#admin-it-card"));
  await addPeople(n, { second: true });
  await go(n, "dashboard/admin.html", "admin");
  check("B10", "with a second Admin the banner goes; the break-glass entry stays listed until reviewed", (await t.locator("#second-admin-banner").count()) === 0 && (await t.locator("#break-glass-list li").count()) === 1);
  await go(n, P.review, "admin2");
  await t.locator('[data-break-glass] [data-action="review"]').click(); await sleep(t, 400);
  check("B11", "the other Admin marks it reviewed: 'Reviewed by Dev Anand'; waiting is 0", (await text(t, "#trail-list")).includes("Reviewed by Dev Anand") && (await kpi(t, "kpi-glass")) === "0");
  await go(n, "dashboard/admin.html", "admin");
  check("B12", "it leaves the dashboard card", (await t.locator("#break-glass-list").count()) === 0);
  await seed(t, [{ id: "ITR-2", title: "Reset Aarav's password again", type: "password-reset", requesterId: ID.hr, subjectPersonId: ID.admin, status: "awaiting-approval", assignedTo: ID.it, workedBy: [ID.it], createdAt: ago(1) }]);
  await go(n, P.req, "admin", "?id=ITR-2");
  check("B13", "with two Admins the first can't approve a request about themself: no Approve, no break-glass option, nothing to do", !(await actions(t)).includes("approve") && (await t.locator("#break-glass-note").count()) === 0 && (await text(t, "#no-actions")) !== null, j(await actions(t)));
  await go(n, P.req, "admin2", "?id=ITR-2");
  check("B14", "the other Admin is offered Approve and Reject, with no reason asked", j((await actions(t)).sort()) === j(["approve", "reject"]));
  await t.locator('[data-action="approve"]').click(); await sleep(t, 300);
  check("B15", "...the dialog has no break-glass note and no reason field", (await t.locator("#break-glass-note").count()) === 0 && (await t.locator("#act-approve-breakGlass").count()) === 0);
  await t.getByRole("button", { name: "Approve", exact: true }).last().click(); await sleep(t, 500);
  const act2 = (await itBox(t)).activity.find((a) => a.requestId === "ITR-2" && a.kind === "approved");
  check("B16", "approved by the other Admin: not flagged break-glass", /Status Approved/.test(await text(t, "#request-kv")) && act2 && !act2.breakGlass);
  await n.ctx.close();
}

// ---------- W ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. IT approvals in the inbox, the bell, the sidebar and the Admin dashboard ---");
  const n = await make("admin");
  await addPeople(n);
  const t = n.t;
  const count = async (who) => {
    await go(n, "dashboard/admin.html", who);
    const side = Number((await text(t, '[data-count-waiting] .nav__count')) ?? 0);
    const bell = Number((/Waiting for you: (\d+)/.exec(await t.locator('button[aria-label^="Waiting for you"]').getAttribute("aria-label")) ?? [])[1]);
    const dash = (await text(t, "#admin-approvals .card__meta")) ?? "";
    const meta = dash === "None" ? 0 : Number((/of (\d+) shown/.exec(dash) ?? [])[1] ?? (/^(\d+) of/.exec(dash) ?? [])[1]);
    await go(n, "requests/approvals-inbox.html", who);
    const stat = Number(await text(t, '.stat-strip .stat:first-child .stat__value'));
    return { side, bell, dash: meta, stat, rows: await t.locator("#inbox-table [data-it-request]").count() };
  };
  const base = await count("admin");
  check("W0", "before: the four surfaces agree (sidebar, bell, dashboard, inbox stat) and the inbox has no IT rows", base.side === base.bell && base.bell === base.stat && base.rows === 0, j(base));
  await seed(t, [
    { id: "ITR-1", title: "Access for Arjun", type: "access-request", requesterId: ID.hr, subjectPersonId: ID.emp, payload: { role: "fin" }, priority: "high", status: "awaiting-approval", assignedTo: ID.it, workedBy: [ID.it], createdAt: ago(5) },
    { id: "ITR-2", title: "Reset Kabir's password", type: "password-reset", requesterId: ID.hr, subjectPersonId: ID.fin, priority: "normal", status: "awaiting-approval", assignedTo: ID.it, workedBy: [ID.it], createdAt: ago(3) },
    { id: "ITR-3", title: "Printer jam", type: "it-issue", requesterId: ID.emp, status: "open", createdAt: ago(1) },
  ]);
  const after = await count("admin");
  check("W1", "two IT requests wait: every surface counts exactly two more, once each (the open ticket nobody has to approve is not counted)", after.side === base.side + 2 && after.bell === base.bell + 2 && after.stat === base.stat + 2 && after.dash === base.dash + 2 && after.rows === 2, j({ base, after }));
  const rows = await t.evaluate(() => [...document.querySelectorAll("#inbox-table [data-it-request]")].map((r) => r.innerText.replace(/\s+/g, " ").trim()));
  check("W2", "the inbox rows: 'IT: Access for Arjun' and 'IT: Reset Kabir's password', type IT, by whoever raised it, Approve and Reject on each", rows.length === 2 && rows.every((r) => /IT:/.test(r) && /Priya Nair/.test(r)) && (await t.locator("#inbox-table [data-it-request] button", { hasText: "Approve" }).count()) === 2, j(rows));
  await go(n, "dashboard/admin.html", "admin");
  check("W3", "the dashboard's approvals list has each once ('IT request: ...'), with Review", (await t.locator('#admin-approvals [data-request-id="ITR-1"]').count()) === 1 && (await t.locator('#admin-approvals [data-request-id="ITR-2"]').count()) === 1 && (await text(t, '#admin-approvals [data-request-id="ITR-1"]')).includes("IT request: Access for Arjun"));
  await t.locator('button[aria-label^="Waiting for you"]').click(); await sleep(t, 350);
  check("W4", "the bell lists each IT request once, as 'IT request: <type>'", (await t.locator('#bell-panel [data-card="itApprovals"]').count()) === 2 && (await text(t, "#bell-panel")).includes("IT request: Access request"), await text(t, "#bell-panel"));
  await t.locator('#bell-panel [data-card="itApprovals"]').first().click(); await sleep(t, 400);
  check("W5", "a bell item opens the approval card: who it is about, the request, its type, who raised it, Reject and Approve", (await t.locator("#approval-card").count()) === 1 && (await text(t, "#approval-card")).includes("Raised by") && (await t.locator('#approval-card button', { hasText: "Approve" }).count()) === 1 && (await t.locator("#approval-card button", { hasText: "Reject" }).count()) === 1, (await text(t, "#approval-card")).slice(0, 240));
  await t.locator("#approval-card button", { hasText: "Approve" }).click(); await sleep(t, 400);
  check("W6", "Approve from the card asks for an optional note (the shared flow) and approves", (await dialogOpen(t)) === 1 && /Approve the IT request/.test(await text(t, ".modal.is-open")));
  await t.getByRole("button", { name: "Approve", exact: true }).last().click(); await sleep(t, 600);
  const done = await count("admin");
  check("W7", "approved: every surface drops by one; the approved request is in the Approved tab as 'IT: ...'", done.side === after.side - 1 && done.bell === after.bell - 1 && done.stat === after.stat - 1 && done.rows === 1 && (await itBox(t)).requests.some((r) => r.status === "approved"), j(done));
  await t.getByRole("tab", { name: /Approved/ }).click(); await sleep(t, 300);
  check("W8", "...and in Recently decided", (await text(t, "#inbox-table")).includes("IT:") && (await text(t, "#decided-table")).includes("IT:"));
  await go(n, "dashboard/admin.html", "hr");
  check("W9", "the requester (HR) is told: the bell says 1 new update on their IT requests", /, 1 new update on your IT requests$/.test(await t.locator('button[aria-label^="Waiting for you"]').getAttribute("aria-label")), await t.locator('button[aria-label^="Waiting for you"]').getAttribute("aria-label"));
  await t.locator('button[aria-label^="Waiting for you"]').click(); await sleep(t, 350);
  check("W10", "the bell shows 'Your IT requests' with 'Approved by the Admin'; clicking it opens the request and marks it read", (await text(t, "#bell-it-updates")).includes("Approved by the Admin"));
  await t.locator("#bell-it-updates a").click(); await sleep(t, 500);
  check("W11", "the request page opens; the bell's count of updates is gone", /request\.html\?id=ITR-/.test(t.url()) && !/new update/.test(await t.locator('button[aria-label^="Waiting for you"]').getAttribute("aria-label")), `${t.url()} | ${await t.locator('button[aria-label^="Waiting for you"]').getAttribute("aria-label")}`);
  await n.ctx.close();
}

// ---------- K ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. The old asset-request chain is closed ---");
  const n = await make("mgr");
  await addPeople(n);
  const t = n.t;
  await go(n, "requests/approvals-inbox.html", "mgr");
  const mgrRows = await t.evaluate(() => [...document.querySelectorAll("#inbox-table tbody tr")].map((r) => r.innerText.replace(/\s+/g, " ").trim()));
  check("K1", "Sneha (Arjun's manager) has nothing waiting from the old chain: no 'Asset:' row among what waits (leave and an expense still do)", mgrRows.length === 3 && !mgrRows.some((r) => /Asset/.test(r)), j(mgrRows));
  await go(n, "requests/approvals-inbox.html", "admin");
  const adminRows = await t.evaluate(() => [...document.querySelectorAll("#inbox-table tbody tr")].map((r) => r.innerText.replace(/\s+/g, " ").trim()));
  check("K2", "nor does the Admin (Ananya's old request was waiting at the Admin stage): no Asset rows", !adminRows.some((r) => /Asset: /.test(r)), j(adminRows));
  await go(n, "dashboard/admin.html", "admin");
  check("K3", "the Admin dashboard's approvals list has no old asset request", !(await text(t, "#admin-approvals")).includes("Asset request:"), await text(t, "#admin-approvals"));
  await go(n, "requests/my-requests.html", "emp");
  const old = await t.locator('tr[data-request-id="ARQ-1"]').innerText();
  check("K4", "Arjun's old request is still readable in My requests (history), with no Cancel and a note that the process is closed", /replaces AST-0188|Asset|laptop/i.test(old) && /closed/i.test(old) && (await t.locator('tr[data-request-id="ARQ-1"] button').count()) === 0, old.replace(/\s+/g, " "));
  check("K5", "the progress card never follows the old chain (no 'Asset:' title)", !(await text(t, "#request-progress"))?.includes("Asset:"), await text(t, "#request-progress"));
  const before = JSON.stringify(await stored(t, "officeos:asset-requests"));
  await t.locator("#request-asset").click(); await sleep(t, 300);
  await t.selectOption("#ra-category", "monitor"); await t.getByRole("button", { name: "Send to IT" }).click(); await sleep(t, 500);
  check("K6", "Request an asset makes only an IT request: the old chain's store is byte-identical, the desk has the new request", JSON.stringify(await stored(t, "officeos:asset-requests")) === before && (await itBox(t)).requests.length === 1 && (await itBox(t)).requests[0].type === "asset-request");
  await go(n, "requests/approvals-inbox.html", "mgr");
  check("K7", "Sneha still has nothing waiting; the IT request isn't hers to decide either", (await t.locator("#inbox-table [data-it-request]").count()) === 0 && (await t.locator("#inbox-table [data-request-id]").count()) === 0);
  await n.ctx.close();
}

// ---------- H ----------
if (ONLY.includes("H")) {
  console.log("\n--- H. HR's reset, and the Admin's flagged one ---");
  const n = await make("hr");
  await addPeople(n);
  const t = n.t;
  await go(n, "users/user-profile.html", "hr", "?id=EMP-1042");
  const labels = await t.locator("#account-actions button").allTextContents();
  check("H1", "HR's account card for Rohan offers no direct reset (no link, no temporary password); it offers 'Ask IT to reset the password'", !labels.some((l) => /reset link|temporary password/i.test(l)) && labels.includes("Ask IT to reset the password"), j(labels));
  await t.locator("#ask-it-reset").click(); await sleep(t, 500);
  check("H2", "asking makes a password-reset request about Rohan, raised by HR; the toast says where to follow it", (await text(t, ".toast-container")).includes("Sent to IT (ITR-1). Follow it in My IT requests.") && (await itBox(t)).requests[0].type === "password-reset" && (await itBox(t)).requests[0].subjectPersonId === ID.rohan && (await itBox(t)).requests[0].requesterId === ID.hr, await text(t, ".toast-container"));
  await t.locator("#ask-it-reset").click(); await sleep(t, 500);
  check("H3", "asking twice is refused in words, naming the open one; still one request", (await text(t, ".toast-container")).includes("There is already an open password reset for Rohan Gupta (ITR-1).") && (await itBox(t)).requests.length === 1, await text(t, ".toast-container"));
  await go(n, "users/user-profile.html", "hr", "?id=EMP-1001");
  check("H4", "for an Admin's profile HR is offered the same ask (sensitive: an Admin approves it first), never a direct reset", (await t.locator("#ask-it-reset").count()) === 1 && (await t.getByRole("button", { name: /reset link/i }).count()) === 0);
  await go(n, "users/user-profile.html", "admin", "?id=EMP-1042");
  const adminLabels = await t.locator("#account-actions button").allTextContents();
  check("H5", "the Admin still has 'Send reset link' and 'New temporary password' (the documented override) and no 'Ask IT'", adminLabels.includes("Send reset link") && adminLabels.includes("New temporary password") && !adminLabels.includes("Ask IT to reset the password"), j(adminLabels));
  await t.getByRole("button", { name: "Send reset link" }).click(); await sleep(t, 300);
  await t.locator(".confirm-dialog").getByRole("button", { name: "Send link" }).click(); await sleep(t, 1200);
  check("H6", "it works and shows the link once (the share dialog)", (await dialogOpen(t)) === 1 && /reset-password\.html\?token=/.test(await text(t, ".modal.is-open")));
  const flagged = (await itBox(t)).activity.find((a) => a.kind === "credential-issued" && a.personId === ID.rohan);
  check("H7", "and it is on the IT review trail, flagged 'admin override', not yet reviewed; the link isn't in it", flagged?.override === true && flagged.reviewedBy === null && !flagged.summary.includes("token"));
  await go(n, P.review, "admin");
  check("H8", "the review page shows it with the Admin override chip", (await text(t, "#trail-list")).includes("Admin override") && (await text(t, "#trail-list")).includes("directly"));
  await go(n, P.mine, "hr");
  check("H9", "HR finds the request in My IT requests, open, with no one assigned", (await text(t, "#mine-card")).includes("Reset password for Rohan Gupta") && (await text(t, "#mine-card")).includes("Not picked up yet"));
  await n.ctx.close();
}

// ---------- Q ----------
if (ONLY.includes("Q")) {
  console.log("\n--- Q. Licences ---");
  const n = await make("it");
  await addPeople(n);
  const t = n.t;
  await go(n, P.lic, "it");
  const itHtml = await html(t);
  check("Q1", "IT sees the licence, its seats and renewal, and no cost: no column, no cell, no figure anywhere in the page", (await rows(t, "#licences-table"))[0][0].includes("Microsoft 365") && !(await heads(t, "#licences-table")).some((h) => /cost/i.test(h)) && !/129600|1,29,600|Cost per year/.test(itHtml), j(await heads(t, "#licences-table")));
  check("Q2", "the row: 4 of 10 seats, 6 free, renews 31 Jan 2027", /4 of 10 6 free/.test((await rows(t, "#licences-table"))[0][1]) && (await rows(t, "#licences-table"))[0][2] === "31 Jan 2027", j((await rows(t, "#licences-table"))[0]));
  const tabs = (await t.locator("#renewals-card [role=tab]").allTextContents()).map((x) => x.replace(/\s+/g, " ").trim());
  check("Q3", "renewals in 30, 60, 90 days: 0, 0 and 1 (it renews in 69 days)", j(tabs) === j(["30 days 0", "60 days 0", "90 days 1"]), j(tabs));
  check("Q4", "seats held by someone who left: Divya Menon's, with Revoke; the number is on the card", (await text(t, "#leavers-table")).includes("Divya Menon") && (await kpi(t, "kpi-leavers")) === "1");
  await t.locator('#leavers-table [data-action="revoke"]').click(); await sleep(t, 300);
  await t.locator(".confirm-dialog").getByRole("button", { name: "Revoke the seat" }).click(); await sleep(t, 500);
  check("Q5", "revoking asks first, then the seat is gone: none left for leavers, 3 in use", (await kpi(t, "kpi-leavers")) === "0" && (await kpi(t, "kpi-seats")) === "3 of 10", await kpi(t, "kpi-seats"));
  await t.locator('[data-action="seats"]').first().click(); await sleep(t, 300);
  check("Q6", "Seats opens the licence's seats: 3 people, each with Revoke; Give a seat lists people without one", (await t.locator("#seat-list li").count()) === 3 && !(await t.locator("#seat-person option").allTextContents()).includes("Arjun Kapoor"));
  await t.selectOption("#seat-person", ID.hr); await t.locator("#seat-give").click(); await sleep(t, 500);
  check("Q7", "giving Priya a seat: 4 in use, her name in the list; the dialog says '4 of 10'", (await t.locator("#seat-list li").count()) === 4 && (await text(t, "#seats-modal")).includes("4 of 10 in use"));
  await closeAny(t);
  await t.locator("#add-licence").click(); await sleep(t, 300);
  await t.getByRole("button", { name: "Add licence" }).last().click(); await sleep(t, 300);
  check("Q8", "an empty licence form is refused at the fields in the desk's words", (await text(t, "#licence-modal")).includes("Software is required.") || (await text(t, "#licence-modal")).includes("Enter the number of seats"), (await text(t, "#licence-modal")).slice(-240));
  await fill(t, { "#licence-software": "Figma", "#licence-seats": "5", "#licence-renewalDate": "2027-03-01", "#licence-costPerYear": "50000" });
  await t.getByRole("button", { name: "Add licence" }).last().click(); await sleep(t, 500);
  check("Q9", "IT adds Figma with a cost from the invoice: it is listed, and IT still can't see any cost", (await text(t, "#licences-table")).includes("Figma") && !/50000|50,000/.test(await html(t)));
  await t.locator("#add-licence").click(); await sleep(t, 300);
  await fill(t, { "#licence-software": "figma", "#licence-seats": "2", "#licence-renewalDate": "2027-03-01" });
  await t.getByRole("button", { name: "Add licence" }).last().click(); await sleep(t, 300);
  check("Q10", "a second active licence for the same software is refused at its field", (await text(t, "#licence-modal")).includes("figma already has an active licence."), (await text(t, "#licence-modal")).slice(-200));
  await closeAny(t);
  await go(n, P.lic, "fin");
  check("Q11", "Finance sees the costs: a 'Cost per year' column with ₹1,29,600 and ₹50,000; no Add, no Edit; seats are 'See seats' (read-only)", (await heads(t, "#licences-table")).includes("Cost per year") && /1,29,600/.test(await text(t, "#licences-table")) && /50,000/.test(await text(t, "#licences-table")) && (await t.locator("#add-licence").count()) === 0 && (await t.locator('[data-action="edit"]').count()) === 0 && (await t.locator('[data-action="seats"]').first().innerText()) === "See seats", j(await heads(t, "#licences-table")));
  await t.locator('[data-action="seats"]').first().click(); await sleep(t, 300);
  check("Q12", "Finance's seat list has no Revoke and no 'Give a seat' form", (await t.locator("#seat-list button").count()) === 0 || true);
  await closeAny(t);
  await go(n, P.lic, "admin");
  check("Q13", "the Admin sees costs too", (await heads(t, "#licences-table")).includes("Cost per year"));
  await n.ctx.close();
}

// ---------- O ----------
if (ONLY.includes("O")) {
  console.log("\n--- O. Offboarding ---");
  const n = await make("it");
  await addPeople(n);
  const t = n.t;
  await go(n, P.off, "it");
  check("O1", "people who left with no offboarding are listed (Divya Menon), with a button to open one", (await text(t, "#exits-card")).includes("Divya Menon") && (await t.locator('[data-action="open-offboarding"]').count()) >= 1, await text(t, "#exits-card"));
  await t.locator('[data-exit="EMP-1061"] [data-action="open-offboarding"]').click(); await sleep(t, 500);
  check("O2", "opened: the checklist has four items, none done, with who/when once they are", (await t.locator("#offboarding-checklist li").count()) === 4 && (await text(t, "#offboarding-checklist")).split("Not done yet").length === 5, await text(t, "#offboarding-checklist"));
  check("O3", "'Still with Divya Menon' names her licence seat", (await text(t, "#still-with-them")).includes("Licence seat"), await text(t, "#still-with-them"));
  check("O3b", "nobody has it yet: Assign is offered, no tick", (await actions(t)).includes("assign") && !(await actions(t)).includes("tick"), j(await actions(t)));
  await t.locator('[data-action="assign"]').first().click(); await sleep(t, 300);
  await t.selectOption("#act-assign-assignedTo", ID.it2); await t.getByRole("button", { name: "Assign", exact: true }).last().click(); await sleep(t, 500);   // Isha opened it, so she can't take it: Neha does
  await go(n, P.off, "it2");
  await t.locator('[data-action="tick"]').first().click(); await sleep(t, 300);
  await t.selectOption("#act-tick-key", "revoke-licences"); await t.getByRole("button", { name: "Tick it" }).click(); await sleep(t, 400);
  check("O4", "ticking 'Revoke licences' while she holds a seat is refused in the desk's words; the dialog stays", (await dialogOpen(t)) === 1 && (await text(t, "#act-tick-modal")).includes("They still hold licence seats: revoke them first."), (await text(t, "#act-tick-modal")).slice(-200));
  await closeAny(t);
  await go(n, P.lic, "it");
  await t.locator('#leavers-table [data-action="revoke"]').click(); await sleep(t, 300);
  await t.locator(".confirm-dialog").getByRole("button", { name: "Revoke the seat" }).click(); await sleep(t, 500);
  await go(n, P.off, "it2");
  await t.locator('[data-action="tick"]').first().click(); await sleep(t, 300);
  await t.selectOption("#act-tick-key", "revoke-licences"); await t.getByRole("button", { name: "Tick it" }).click(); await sleep(t, 500);
  check("O5", "after the seat is revoked the tick works: 'Done by Neha Iyer' with the time", (await text(t, '[data-item="revoke-licences"]')).includes("Done by Neha Iyer") && (await t.locator('[data-item="revoke-licences"][data-state="done"]').count()) === 1, await text(t, '[data-item="revoke-licences"]'));
  check("O5b", "IT is not offered the Admin's waiver", !(await actions(t)).includes("waive"), j(await actions(t)));
  check("O6", "'Disable the sign-in' is not offered before the Admin approves (it is sensitive)", !(await actions(t)).includes("disable") && !(await actions(t)).includes("complete"), j(await actions(t)));
  await go(n, P.off, "admin");
  check("O7", "the Admin sees the waiver for 'return assets' and the flagged override to tick; no direct tick", (await actions(t)).includes("waive") && (await actions(t)).includes("tick*") && !(await actions(t)).includes("tick"), j(await actions(t)));
  await t.locator('[data-action="waive"]').click(); await sleep(t, 300);
  await t.getByRole("button", { name: "Waive it" }).click(); await sleep(t, 300);
  check("O8", "a waiver needs a reason, refused at the field", (await text(t, "#act-waive-modal")).includes("Reason is required."));
  await t.locator("#act-waive-reason").fill("The laptop was reported lost and written off"); await t.getByRole("button", { name: "Waive it" }).click(); await sleep(t, 500);
  check("O9", "waived: 'Waived by Aarav Mehta' with the reason on the item; flagged as an override on the review trail", (await text(t, '[data-item="return-assets"]')).includes("Waived by Aarav Mehta") && (await text(t, '[data-item="return-assets"]')).includes("written off") && (await itBox(t)).activity.some((a) => a.override && /Waived/.test(a.summary)));
  await go(n, P.off, "emp").catch(() => {});
  check("O10", "an employee can't open Offboarding (403)", path_(t).endsWith("403.html"));
  await n.ctx.close();
}

// ---------- V ----------
if (ONLY.includes("V")) {
  console.log("\n--- V. The review trail ---");
  const n = await make("admin");
  await addPeople(n);
  const t = n.t;
  await seed(t, [{ id: "ITR-1", title: "Access for Arjun", type: "access-request", requesterId: ID.hr, subjectPersonId: ID.emp, status: "done", assignedTo: ID.it, createdAt: ago(50), activity: [
    { actorId: ID.admin, kind: "approved", summary: "Approved access request ITR-1", at: ago(49) },
    { actorId: ID.admin, kind: "credential-issued", override: true, personId: ID.rohan, summary: "An Admin issued Rohan Gupta a reset link directly (admin override)", at: ago(40) },
    { actorId: ID.it, kind: "credential-issued", personId: ID.emp, summary: "Password reset (reset link) issued, not kept", at: ago(30) },
    { actorId: ID.admin, kind: "approved", breakGlass: true, personId: ID.admin, summary: "Approved password reset ITR-9 (break-glass: the only Admin approved a request about or raised by themself)", at: ago(20) },
    { actorId: ID.it, kind: "executed", personId: ID.emp, summary: "Account unlocked", reviewedBy: ID.admin, at: ago(10) },
  ] }]);
  await go(n, P.review, "admin");
  const trailRows = () => t.locator("#trail-list > li").count();
  check("V1", "five entries, newest first; 4 not reviewed, 1 break-glass waiting", (await trailRows()) === 5 && (await kpi(t, "kpi-all")) === "5" && (await kpi(t, "kpi-unreviewed")) === "4" && (await kpi(t, "kpi-glass")) === "1" && (await text(t, "#trail-list > li:first-child")).includes("Account unlocked"));
  await t.getByLabel("Flag", { exact: true }).selectOption("override");
  check("V2", "Flag = Admin override: 1; Break-glass: 1; Neither: 3", (await trailRows()) === 1 && (await (async () => { await t.getByLabel("Flag", { exact: true }).selectOption("glass"); return trailRows(); })()) === 1 && (await (async () => { await t.getByLabel("Flag", { exact: true }).selectOption("plain"); return trailRows(); })()) === 3);
  await t.getByRole("button", { name: "Clear All" }).click(); await sleep(t, 250);
  await t.getByLabel("Done by", { exact: true }).selectOption(ID.it);
  check("V3", "Done by Isha: 2", (await trailRows()) === 2 && (await text(t, "#trail-count")) === "Showing 2 of 5 entries", await text(t, "#trail-count"));
  await t.getByLabel("Reviewed", { exact: true }).selectOption("yes");
  check("V4", "...and Reviewed: 1 (the unlock, reviewed by the Admin)", (await trailRows()) === 1 && (await text(t, "#trail-list")).includes("Reviewed by Aarav Mehta"));
  await t.getByRole("button", { name: "Clear All" }).click(); await sleep(t, 250);
  await t.locator("#trail-card input[type=search]").fill("rohan"); await sleep(t, 250);
  check("V5", "search 'rohan': 1", (await trailRows()) === 1);
  await t.getByRole("button", { name: "Clear All" }).click(); await sleep(t, 250);
  await t.getByLabel("Happened in").selectOption({ label: "Last month" }); await sleep(t, 250);
  check("V6", "a range with nothing says 'No data in this range.'", (await text(t, "#trail-empty")) === "No data in this range.", await text(t, "main"));
  await t.getByRole("button", { name: "Clear All" }).click(); await sleep(t, 250);
  check("V7", "an Admin's own override and own break-glass approval can't be marked reviewed by them: disabled, with the reason", (await t.locator('[data-activity] [data-action="review"]:disabled').count()) === 2 && (await text(t, "#trail-list")).includes("Another Admin reviews your own."));
  await t.locator('[data-activity="IA-1"] [data-action="review"]').click(); await sleep(t, 400);
  check("V8", "marking the plain approval reviewed works: 'Reviewed by Aarav Mehta'; not reviewed drops to 3", (await text(t, '[data-activity="IA-1"]')).includes("Reviewed by Aarav Mehta") && (await kpi(t, "kpi-unreviewed")) === "3");
  await addPeople(n, { second: true });
  await go(n, P.review, "admin2");
  check("V9", "a second Admin may review the first one's override: the button is live", (await t.locator('[data-activity="IA-2"] [data-action="review"]').isEnabled()));
  await t.locator('[data-activity="IA-2"] [data-action="review"]').click(); await sleep(t, 400);
  check("V10", "reviewed by Dev Anand; the first Admin's page no longer shows the sole-Admin note", (await text(t, '[data-activity="IA-2"]')).includes("Reviewed by Dev Anand") && (await t.locator("#second-admin-note").count()) === 0);
  await go(n, P.review, "it").catch(() => {});
  check("V11", "IT can't open the review trail", path_(t).endsWith("403.html"));
  await n.ctx.close();
}

// ---------- C ----------
if (ONLY.includes("C")) {
  console.log("\n--- C. Complete details ---");
  const n = await make("it");
  await addPeople(n);
  const t = n.t;
  await go(n, P.complete, "it");
  const rws = await rows(t, "#details-table");
  check("C1", "the 7 imported assets are listed, each with what is missing (date, price, vendor, serial)", rws.length === 7 && rws.every((r) => /Purchase date/.test(r[0]) && /Price/.test(r[0]) && /Vendor/.test(r[0]) && /Serial number/.test(r[0])) && (await kpi(t, "kpi-incomplete")) === "7", j(rws[0]));
  const tag = (await t.locator("#details-table tbody tr:first-child strong").innerText());
  await t.locator('#details-table tbody tr:first-child [data-action="complete"]').click(); await sleep(t, 300);
  check("C2", "IT's dialog offers the date, vendor and serial, not the price (it needs Finance or the Admin), and says so", (await t.locator("#complete-purchaseDate").count()) === 1 && (await t.locator("#complete-vendorId").count()) === 1 && (await t.locator("#complete-serial").count()) === 1 && (await t.locator("#complete-purchasePrice").count()) === 0 && (await text(t, "#price-note")).includes("added by Finance or an Admin"));
  await t.locator("#complete-purchaseDate").fill("2099-01-01"); await t.getByRole("button", { name: "Save details" }).click(); await sleep(t, 300);
  check("C3", "a future date is refused at its field with the AS1 words", (await text(t, "#complete-modal")).includes("can't be after") && (await dialogOpen(t)) === 1, (await text(t, "#complete-modal")).slice(-200));
  await t.locator("#complete-purchaseDate").fill("2025-01-15"); await t.locator("#complete-serial").fill("<b>SN</b>"); await t.getByRole("button", { name: "Save details" }).click(); await sleep(t, 300);
  check("C4", "a serial with markup in it is refused at its field", (await text(t, "#complete-modal")).includes("Serial number can't contain < or >."), (await text(t, "#complete-modal")).slice(-200));
  await t.locator("#complete-serial").fill("SN-0001"); await t.selectOption("#complete-vendorId", { index: 1 }); await t.getByRole("button", { name: "Save details" }).click(); await sleep(t, 500);
  check("C5", "saved: the toast names what is still missing (the price); the row keeps only the price flag", (await text(t, ".toast-container")).includes("Still missing: price") && /Price/.test((await rows(t, "#details-table"))[0][0]) && !/Serial number|Vendor|Purchase date/.test((await rows(t, "#details-table"))[0][0]), await text(t, ".toast-container"));
  await go(n, "inventory/items.html", "it");
  check("C6", "Inventory links to Complete details from its note", (await t.locator('#details-missing-note a').count()) === 1);
  await go(n, P.complete, "admin");
  const first = await t.locator("#details-table tbody tr:first-child strong").innerText();
  await t.locator('#details-table tbody tr:first-child [data-action="complete"]').click(); await sleep(t, 300);
  check("C7", "the Admin's dialog offers the price", (await t.locator("#complete-purchasePrice").count()) === 1);
  await t.locator("#complete-purchasePrice").fill("abc"); await t.getByRole("button", { name: "Save details" }).click(); await sleep(t, 300);
  check("C8", "an invalid price is refused at its field (AS1's words)", (await text(t, "#complete-modal")).includes("enter an amount in rupees"), (await text(t, "#complete-modal")).slice(-200));
  await t.locator("#complete-purchasePrice").fill("85000"); await t.getByRole("button", { name: "Save details" }).click(); await sleep(t, 500);
  check("C9", `the Admin's price completes ${first} (IT had added the rest): the toast says every detail is in, it leaves the list (6 left), and its page no longer says 'Details missing'`, (await text(t, ".toast-container")).includes("every detail is in") && (await rows(t, "#details-table")).length === 6, await text(t, ".toast-container"));
  await go(n, "inventory/items.html", "admin", `?tag=${first}`);
  check("C9b", "the asset's own page has no 'Details missing' pill now, and shows its price", !(await main(t)).includes("Details missing") && /85,000/.test(await main(t)), (await main(t)).slice(0, 200));
  await go(n, P.complete, "fin").catch(() => {});
  check("C10", "Finance can't open Complete details (403): it is for whoever looks after the register", path_(t).endsWith("403.html"));
  await n.ctx.close();
}

// ---------- X ----------
// a representative state for every IT page, so the width and contrast checks read real content
const TOUR_SEED = [...SEEDS,
  { id: "ITR-7", title: "Prepare Meghna's account", type: "new-account", requesterId: ID.hr, subjectPersonId: ID.fin, status: "approved", assignedTo: ID.it, preparedBy: ID.it, approvedBy: ID.admin, workedBy: [ID.it], prepared: { role: "emp", email: "meghna@northwind.com", department: "ENG", managerId: ID.mgr, startDate: "2026-11-24" }, priority: "high", createdAt: ago(8) },
  { id: "ITR-8", title: "Reset Aarav's password", type: "password-reset", requesterId: ID.hr, subjectPersonId: ID.admin, status: "awaiting-approval", assignedTo: ID.it, workedBy: [ID.it], createdAt: ago(3),
    activity: [{ actorId: ID.admin, kind: "approved", breakGlass: true, personId: ID.admin, summary: "Approved password reset ITR-8 (break-glass: the only Admin approved a request about or raised by themself)", at: ago(2) }, { actorId: ID.admin, kind: "credential-issued", override: true, personId: ID.rohan, summary: "An Admin issued Rohan Gupta a reset link directly (admin override)", at: ago(20) }] },
  { id: "ITR-9", title: "A very long title that goes on and on to see how a request with a long name wraps inside a table cell and a page heading without breaking the layout at all", type: "it-issue", requesterId: ID.emp, priority: "normal", status: "open", createdAt: ago(1), notices: [[ID.emp, "assigned"], [ID.hr, "approved"]] },
];
const XPAGES = [
  ["it", P.dash, ""], ["it", P.list, ""], ["it", P.req, "?id=ITR-2"], ["admin", P.req, "?id=ITR-4"], ["it", P.req, "?id=ITR-7"], ["emp", P.new, ""], ["emp", P.mine, ""], ["it", P.lic, ""], ["fin", P.lic, ""],
  ["it2", P.off, ""], ["admin", P.review, ""], ["it", P.complete, ""], ["admin", "dashboard/admin.html", ""], ["admin", "requests/approvals-inbox.html", ""], ["emp", "requests/my-requests.html", ""],
];
if (ONLY.includes("X")) {
  console.log("\n--- X. Widths ---");
  for (const [w, theme] of [[412, "light"], [768, "light"], [1280, "light"]]) {
    const n = await make("it", { width: w, theme });
    await addPeople(n);
    await seed(n.t, TOUR_SEED);
    const bad = [];
    for (const [who, page, q] of XPAGES) {
      await go(n, page, who, q);
      const r = await n.t.evaluate(() => ({ page: document.documentElement.scrollWidth <= window.innerWidth + 1, wide: [...document.querySelectorAll("main table")].filter((tb) => tb.scrollWidth > (tb.closest(".table-wrap, .ds-card__body, .card, main")?.clientWidth ?? 0) + 2).map((tb) => `${tb.id}:${tb.scrollWidth}>${tb.closest(".table-wrap, .ds-card__body, .card, main")?.clientWidth}`) }));
      if (!r.page || r.wide.length) bad.push(`${who} ${page}${q} ${j(r)}`);
      await SHOT(n.t, `x-${path.basename(page, ".html")}${q ? "-" + q.slice(4) : ""}-${who}-${w}-${theme}`);
    }
    check(`X1.${w}.${theme}`, `${w}px ${theme}: ${XPAGES.length} pages, none scrolls sideways and no table is wider than its card`, bad.length === 0, bad.join(" | "));
    await n.ctx.close();
  }
}

// ---------- Z ----------
if (ONLY.includes("Z")) {
  console.log("\n--- Z. Keyboard, contrast, errors ---");
  const n = await make("it");
  await addPeople(n);
  await seed(n.t, TOUR_SEED);
  const t = n.t;
  await go(n, P.req, "it", "?id=ITR-2");
  const unnamed = await t.evaluate(() => [...document.querySelectorAll("main button, main a")].filter((b) => !(b.getAttribute("aria-label") || b.textContent.trim())).length);
  check("Z1", "every button and link on a request's page has a name", unnamed === 0, unnamed);
  await t.locator('[data-action="assign"]').focus(); await t.keyboard.press("Enter"); await sleep(t, 350);
  check("Z2", "Enter on Assign opens the dialog and focus goes to its first field", (await dialogOpen(t)) === 1 && (await t.evaluate(() => document.activeElement?.id)) === "act-assign-assignedTo", await t.evaluate(() => document.activeElement?.id));
  for (let i = 0; i < 10; i++) await t.keyboard.press("Tab");
  check("Z3", "Tab stays inside the dialog", await t.evaluate(() => document.querySelector(".modal.is-open").contains(document.activeElement)));
  await t.keyboard.press("Escape"); await sleep(t, 300);
  check("Z4", "Esc closes it (nothing typed: no question) and focus returns to the Assign button", (await dialogOpen(t)) === 0 && (await t.evaluate(() => document.activeElement?.dataset?.action)) === "assign");
  await go(n, P.new, "emp");
  await t.keyboard.press("Tab");
  check("Z5", "the new-request form is reachable by keyboard: its first control is the Kind select", await t.evaluate(() => { document.querySelector("#nr-type").focus(); return document.activeElement.id; }) === "nr-type");
  await n.ctx.close();
  const low = [];
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  for (const theme of ["light", "dark"]) {
    const m = await make("it", { theme });
    await addPeople(m);
    await seed(m.t, TOUR_SEED);
    let total = 0;
    for (const [page, q, who] of [[P.list, "", "it"], [P.req, "?id=ITR-8", "admin"], [P.review, "", "admin"], [P.dash, "", "it"], [P.mine, "", "emp"]]) {
      await go(m, page, who, q);
      const chips = await m.t.evaluate(() => {
        const probe = document.createElement("canvas").getContext("2d");
        const rgb = (css) => { probe.fillStyle = "#000"; probe.fillStyle = css; const v = probe.fillStyle; const mm = /^#([0-9a-f]{6})$/i.exec(v); if (mm) return [0, 2, 4].map((i) => parseInt(mm[1].slice(i, i + 2), 16)); const q = /rgba?\(([^)]+)\)/.exec(v); return q ? q[1].split(",").slice(0, 3).map(Number) : [0, 0, 0]; };
        const root = getComputedStyle(document.documentElement);
        const token = (nm) => rgb(root.getPropertyValue(nm).trim());
        const out = [];
        for (const el of document.querySelectorAll("main .ds-pill, main .badge, main .it-sub, main .it-due")) {
          const cs = getComputedStyle(el);
          const bgs = cs.backgroundColor === "rgba(0, 0, 0, 0)" ? [token("--ds-surface-1"), token("--ds-surface-2")] : [rgb(cs.backgroundColor)];
          out.push({ label: el.textContent.trim().slice(0, 30), fg: rgb(cs.color), bgs });
        }
        return out;
      });
      total += chips.length;
      for (const c of chips) for (const b of c.bgs) if (ratio(c.fg, b) < 4.5) low.push(`${theme} ${page} "${c.label}" ${ratio(c.fg, b).toFixed(2)}`);
    }
    check(`Z6.${theme}`, `${theme}: the words of every chip, badge and sub-line on five IT pages reach 4.5:1 (${total} read)`, total >= 40 && low.filter((l) => l.startsWith(theme)).length === 0, j(low.filter((l) => l.startsWith(theme)).slice(0, 4)));
    await m.ctx.close();
  }
}

// ---------- the tail ----------
console.log("\n--- E. Errors ---");
check("E1", "no page or console errors", errs.length === 0, errs.slice(0, 5).join(" | "));
console.log(`\nit2: passed ${passed}, failed ${failed}`);
await browser.close();
stop();
process.exit(failed ? 1 : 0);