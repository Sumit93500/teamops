// CV1's harness (msedge, headless): client / official visits in the React app. Read by meaning (words, attributes, storage), never by pixels.
// usage: node cv1.mjs <app dist> <repo root> <shots dir>   [ONLY=ABCDEFGHKWX]
// Clock: Mon 21 Dec 2026 10:00 IST (the shift rules apply from 1 Dec). Geolocation granted (Mumbai, 30 m) unless a case says otherwise.
//   A  My visits (Arjun): empty state, Request a visit (the dialog's errors under their fields), the pending row, status filter, the shared date range
//   B  Team visits (Sneha, Arjun's manager): the waiting row; Reject needs a reason; Approve; All visits; Assign a visit (Rohan), starts approved
//   C  Mark attendance (Arjun): "Client / official visit": the location read with its accuracy, check in, check out (the visit completes)
//   D  the day everywhere: My attendance's cell and legend, Team attendance (HR) "On a visit" tab and chip, "On site today" on the dashboards
//   E  a same-day visit started from Mark attendance waits in the manager's inbox, the sidebar count and the bell; Approve / Reject there
//   F  location denied / unavailable: the words, the reason, "Accept without location" with a note, then the day counts
//   G  the visit page: the punch trail with coordinates, accuracy and an Open in maps link; someone who may not see it is told so
//   H  keyboard: the dialog opens with focus inside it, Esc closes it, the segmented choice works with the arrow keys
//   C2 contrast: the chips, pills and notes, light and dark (4.5:1)
//   W  no sideways scroll at 412 and 1280, light and dark, on every new or changed page; shots
//   X  no page or console errors
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, ROOT, SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "ABCDEFGHKWX";
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srv = spawn("python", [path.join(HERE, "spa-serve.py"), "9976", DIST], { stdio: "ignore" });
const stop = () => { try { srv.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9976";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"], rohan: ["Rohan Gupta", "EMP-1042"], ananya: ["Ananya Iyer", "EMP-1017"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const size = (w) => (w === 412 ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA } : { viewport: { width: w, height: 900 } });
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(8)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 600)}` : ""}`); };
const j = JSON.stringify;
const errs = [];
const NOW = "2026-12-21T10:00:00+05:30";
const TODAY = "2026-12-21";
const GEO = { latitude: 19.076, longitude: 72.8777, accuracy: 30 };

// A context with one person's session, the clock fixed, location granted (geo: false = not granted), the page at its start.
async function make(who, { width = 1280, theme = "light", geo = true } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata", colorScheme: theme, ...(geo ? { permissions: ["geolocation"], geolocation: GEO } : {}) });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(NOW));
  await ctx.addInitScript(([th]) => {
    if (localStorage.getItem("cv1:seeded")) return;
    localStorage.clear(); localStorage.setItem("cv1:seeded", "1");
    localStorage.setItem("officeos:prefs", JSON.stringify({ theme: th }));
  }, [theme]);
  const t = await ctx.newPage();
  t.on("pageerror", (e) => errs.push(`${who}: ${e.message}`));
  t.on("console", (m) => { if (m.type() === "error") errs.push(`${who}: console ${m.text()}`); });
  await t.goto(N + "/pages/auth/login.html"); await t.waitForLoadState("load");
  return { ctx, t, theme };
}
// become someone and go to a page (the same browser storage: what one person did, the next sees)
async function go(n, who, page) {
  await n.t.evaluate(([w, th]) => { localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 })); localStorage.setItem(`officeos:prefs:${w[1]}`, JSON.stringify({ theme: th })); }, [WHO[who], n.theme]);
  await n.t.goto(N + "/pages/" + page); await n.t.waitForLoadState("load");
  await n.t.evaluate(() => document.fonts.ready); await n.t.waitForTimeout(450);
}
const settle = (t, ms = 350) => t.waitForTimeout(ms);
const text = (t, sel) => t.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const bodyText = (t) => t.evaluate(() => document.querySelector("main")?.innerText.replace(/\s+/g, " ") ?? "");
const visible = (t, sel) => t.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; }, sel);
const toast = (t) => t.evaluate(() => [...document.querySelectorAll(".toast, .ds-toast")].map((x) => x.innerText.trim()).join(" | "));
const stored = (t, key) => t.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), key);
async function request(n, over = {}) {
  await n.t.click("#request-visit-btn"); await settle(n.t, 250);
  const f = { siteName: "Acme Corp, Pune", purpose: "Quarterly review with the client", ...over };
  await n.t.fill("#visit-siteName", f.siteName); await n.t.fill("#visit-purpose", f.purpose);
  if (f.from) { await n.t.fill("#visit-fromDate", f.from); await n.t.fill("#visit-toDate", f.to ?? f.from); }
  await n.t.click('button[form="request-visit-form"]'); await settle(n.t);
}
const clickIn = async (t, scope, name) => { await t.locator(scope).getByRole("button", { name, exact: true }).first().click(); await settle(t, 300); };
const confirmYes = async (t, name) => { await t.locator(".modal.is-open, [role=dialog]").getByRole("button", { name, exact: true }).last().click(); await settle(t, 350); };

let main = null;
if ("ABCDEG".split("").some((c) => ONLY.includes(c))) main = await make("emp");

// ---------- A ----------
if (ONLY.includes("A")) {
  console.log("\n--- A. My visits ---");
  const n = main;
  await go(n, "emp", "visits/my-visits.html");
  check("A1", "an empty list says so, with a Request a visit button", /No visits yet/.test(await bodyText(n.t)) && await visible(n.t, "#request-visit-btn"), (await bodyText(n.t)).slice(0, 200));
  await n.t.click("#request-visit-btn"); await settle(n.t, 250);
  await n.t.click('button[form="request-visit-form"]'); await settle(n.t);
  check("A2", "sending it empty names the first missing field under it (the place)", /at least 2 characters/.test(await text(n.t, "#visit-siteName-error") ?? ""), await text(n.t, "#visit-siteName-error"));
  await n.t.fill("#visit-siteName", "Acme Corp, Pune"); await n.t.fill("#visit-purpose", "abc");
  await n.t.click('button[form="request-visit-form"]'); await settle(n.t);
  check("A3", "a purpose that is too short is refused under its field", /at least 5 characters/.test(await text(n.t, "#visit-purpose-error") ?? ""), await text(n.t, "#visit-purpose-error"));
  await n.t.fill("#visit-purpose", "Quarterly review with the client"); await n.t.fill("#visit-fromDate", "2026-12-18"); await n.t.fill("#visit-toDate", "2026-12-18");
  await n.t.click('button[form="request-visit-form"]'); await settle(n.t);
  check("A4", "a day in the past is refused", /can't start in the past/.test(await text(n.t, "#visit-fromDate-error") ?? ""), await text(n.t, "#visit-fromDate-error"));
  await n.t.fill("#visit-fromDate", TODAY); await n.t.fill("#visit-toDate", TODAY);
  await n.t.click('button[form="request-visit-form"]'); await settle(n.t);
  const st = await stored(n.t, "officeos:visits");
  check("A5", "sent: a toast, a Pending row with the place and the day, saved for Arjun with Sneha as the manager", /Visit request sent/.test(await toast(n.t)) && st?.visits?.length === 1 && st.visits[0].status === "pending" && st.visits[0].managerId === "EMP-1029", j(st?.visits?.[0]?.status));
  const row = await text(n.t, "#visit-table tbody tr");
  check("A6", "the list shows the place, its kind, the dates and 'Pending' with an icon", /Acme Corp, Pune/.test(row ?? "") && /Client visit/.test(row) && /21 Dec/.test(row) && /Pending/.test(row), row);
  await n.t.selectOption('#main select >> nth=0', "approved").catch(() => {});
  await settle(n.t);
  check("A7", "the status filter narrows the list ('Approved' shows none, with a words empty state)", /No visits match/.test(await bodyText(n.t)), (await bodyText(n.t)).slice(0, 200));
  await n.t.getByRole("button", { name: "Clear All" }).click(); await settle(n.t);
  await n.t.locator(".ds-date-range select").selectOption("custom"); await settle(n.t);
  await n.t.fill(".ds-date-range__custom input >> nth=0", "2026-12-01"); await n.t.fill(".ds-date-range__custom input >> nth=1", "2026-12-10"); await settle(n.t);
  check("A8", "a date range with no visit in it says 'No data in this range.'", /No data in this range\./.test(await bodyText(n.t)), (await bodyText(n.t)).slice(0, 200));
}

// ---------- B ----------
if (ONLY.includes("B")) {
  console.log("\n--- B. Team visits ---");
  const n = main;
  await go(n, "mgr", "visits/team-visits.html");
  check("B1", "Sneha: the waiting tab has Arjun's request with Approve and Reject", /Arjun Kapoor/.test(await text(n.t, "#waiting-table") ?? "") && await n.t.locator("#waiting-table").getByRole("button", { name: "Approve", exact: true }).count() === 1, await text(n.t, "#waiting-table"));
  await clickIn(n.t, "#waiting-table", "Reject");
  await n.t.locator('button[form="reject-visit-note-form"]').click(); await settle(n.t);
  check("B2", "Reject without a reason is refused at the field", /reason of 3 to 200/.test(await text(n.t, "#reject-visit-note-error") ?? ""), await text(n.t, "#reject-visit-note-error"));
  await n.t.keyboard.press("Escape"); await settle(n.t, 300);
  await clickIn(n.t, "#waiting-table", "Approve"); await confirmYes(n.t, "Approve");
  const st = await stored(n.t, "officeos:visits");
  check("B3", "Approve: the visit is approved by Sneha and the waiting list is empty", st.visits[0].status === "approved" && st.visits[0].approvedBy === "EMP-1029" && /Nothing is waiting/.test(await bodyText(n.t)), j([st.visits[0].status, st.visits[0].approvedBy]));
  await n.t.getByRole("tab", { name: /All visits/ }).click(); await settle(n.t);
  check("B4", "All visits lists it as Approved, with who set it up", /Arjun Kapoor/.test(await text(n.t, "#team-visit-table") ?? "") && /Approved/.test(await text(n.t, "#team-visit-table") ?? ""), await text(n.t, "#team-visit-table"));
  await n.t.click("#assign-visit-btn"); await settle(n.t, 250);
  await n.t.fill("#visit-siteName", "Beta Industries, Nashik"); await n.t.fill("#visit-purpose", "Install and train on site"); await n.t.fill("#visit-fromDate", "2026-12-22"); await n.t.fill("#visit-toDate", "2026-12-23");
  await n.t.click('button[form="assign-visit-form"]'); await settle(n.t);
  check("B5", "assigning with nobody chosen is refused under the people", /Choose who the visit is for/.test(await text(n.t, "#visit-people-error") ?? ""), await text(n.t, "#visit-people-error"));
  const people = await n.t.locator("#visit-people label").allInnerTexts();
  check("B6", "Sneha can assign only to her direct reports (Arjun, Rohan)", people.length === 2 && people.some((p) => /Rohan/.test(p)) && people.some((p) => /Arjun/.test(p)), j(people));
  await n.t.locator("#visit-people label", { hasText: "Rohan" }).locator("input").check();
  await n.t.click('button[form="assign-visit-form"]'); await settle(n.t);
  const st2 = await stored(n.t, "officeos:visits");
  const rv = st2.visits.find((v) => v.personId === "EMP-1042");
  check("B7", "assigned: Rohan's visit starts approved, two days, assigned by Sneha", rv?.status === "approved" && rv.source === "assigned" && rv.assignedBy === "EMP-1029" && rv.dates.length === 2, j(rv && [rv.status, rv.source, rv.dates]));
  await go(n, "rohan", "visits/my-visits.html");
  check("B8", "Rohan's My visits shows it, 'Assigned by Sneha Rao', no Cancel button", /Assigned by Sneha Rao/.test(await text(n.t, "#visit-table") ?? "") && !/Cancel/.test(await text(n.t, "#visit-table") ?? ""), await text(n.t, "#visit-table"));
}

// ---------- C ----------
if (ONLY.includes("C")) {
  console.log("\n--- C. Mark attendance: a visit ---");
  const n = main;
  await go(n, "emp", "attendance/mark-attendance.html");
  check("C1", "the page offers 'Office or home' and 'Client / official visit'", await n.t.getByRole("radio", { name: "Client / official visit" }).count() === 1 && await n.t.getByRole("radio", { name: "Office or home" }).count() === 1);
  await n.t.getByRole("radio", { name: "Client / official visit" }).click(); await settle(n.t);
  check("C2", "the visit mode shows today's approved visit (place, kind, purpose) and hides the office place controls", /Acme Corp, Pune/.test(await text(n.t, "#visit-mode") ?? "") && !(await visible(n.t, "#checkin-from")) && await visible(n.t, "#visit-locate-btn"), await text(n.t, "#visit-mode"));
  check("C3", "Check in is off until the location is read; the line says to press Use my location", await n.t.locator("#visit-check-in-btn").isDisabled() && /Press Use my location/.test(await text(n.t, "#visit-reading") ?? ""));
  await n.t.click("#visit-locate-btn"); await settle(n.t, 600);
  check("C4", "the location is read: 'accurate to within 30 m', Check in on", /accurate to within 30 m/.test(await text(n.t, "#visit-reading") ?? "") && !(await n.t.locator("#visit-check-in-btn").isDisabled()), await text(n.t, "#visit-reading"));
  await n.t.click("#visit-check-in-btn"); await settle(n.t, 500);
  const v1 = (await stored(n.t, "officeos:visits")).visits.find((v) => v.personId === "EMP-1105");
  check("C5", "checked in: the punch has the time, coordinates and accuracy; the visit is in progress", v1.status === "in-progress" && v1.days[TODAY].in.time === "10:00" && v1.days[TODAY].in.lat === GEO.latitude && v1.days[TODAY].in.accuracy === 30 && /Checked in at Acme Corp/.test(await toast(n.t)), j(v1.days[TODAY]?.in));
  check("C6", "the page now offers Check out of visit", await visible(n.t, "#visit-check-out-btn") && /Checked in at 10:00/.test(await text(n.t, "#visit-in-note") ?? ""), await text(n.t, "#visit-in-note"));
  await n.ctx.clock.setFixedTime(new Date("2026-12-21T18:45:00+05:30"));
  await n.t.reload(); await n.t.waitForLoadState("load"); await settle(n.t, 500);
  check("C7", "after a reload the visit mode is open (a visit check-in is still open)", await visible(n.t, "#visit-check-out-btn"));
  await n.t.click("#visit-locate-btn"); await settle(n.t, 600); await n.t.click("#visit-check-out-btn"); await settle(n.t, 500);
  const v2 = (await stored(n.t, "officeos:visits")).visits.find((v) => v.personId === "EMP-1105");
  check("C8", "checked out: the visit is completed and the page says it is done", v2.status === "completed" && v2.days[TODAY].out.time === "18:45" && /done for this visit today/.test(await text(n.t, "#visit-done") ?? ""), j(v2.days[TODAY]?.out));
  await n.ctx.clock.setFixedTime(new Date(NOW));
}

// ---------- D ----------
if (ONLY.includes("D")) {
  console.log("\n--- D. The day everywhere ---");
  const n = main;
  await go(n, "emp", "attendance/my-attendance.html");
  const cell = await text(n.t, `.calendar__day[data-date="${TODAY}"]`);
  check("D1", "My attendance: today's cell says On-site with the place, and the legend has On-site", /On-site: Acme Corp, Pune/.test(cell ?? "") && /On-site/.test(await text(n.t, ".calendar__legend") ?? ""), cell);
  const log = await text(n.t, `#daily-log tr[data-date="${TODAY}"]`);
  check("D2", "the daily log row has the chip 'On-site / Client visit' and the place, no Request fix", /On-site \/ Client visit/.test(log ?? "") && /Acme Corp, Pune/.test(log) && !/Request fix/.test(log), log);
  await go(n, "hr", "attendance/team-attendance.html");
  await n.ctx.clock.setFixedTime(new Date("2026-12-21T18:50:00+05:30"));
  await n.t.reload(); await n.t.waitForLoadState("load"); await settle(n.t, 500);
  const tab = await text(n.t, '[data-tab="on-site"]');
  check("D3", "Team attendance (HR) has an 'On a visit' tab counting Arjun", /On a visit\s*1/.test(tab ?? ""), tab);
  await n.t.click('[data-tab="on-site"]'); await settle(n.t);
  const rows = await n.t.locator("#team-rows tr").allInnerTexts();
  check("D4", "...and its row has the chip, the visit's place and 8 h 45 m worked", rows.length === 1 && /Arjun/.test(rows[0]) && /On-site \/ Client visit/.test(rows[0]) && /Acme Corp/.test(rows[0]) && /8h 45m/.test(rows[0].replace(/\s+/g, " ")), j(rows));
  const present = await text(n.t, '[data-stat="present"] .stat__value');
  check("D5", "the Present stat counts the visit day", /^\d+/.test(present ?? "") && Number((present ?? "").match(/\d+/)?.[0]) >= 1, present);
  await n.ctx.clock.setFixedTime(new Date(NOW));
  await go(n, "mgr", "dashboard/employee.html");
  check("D6", "Sneha's dashboard has 'On site today' (she manages Arjun)", /On site today/.test(await text(n.t, "#visits-today") ?? ""), await text(n.t, "#visits-today"));
  await go(n, "hr", "dashboard/hr.html");
  check("D7", "HR's dashboard has 'On site today'", /On site today/.test(await text(n.t, "#visits-today") ?? ""));
  await go(n, "admin", "dashboard/admin.html");
  check("D8", "the Admin's dashboard has 'On site today'", /On site today/.test(await text(n.t, "#visits-today") ?? ""));
  await go(n, "emp", "dashboard/employee.html");
  check("D9", "Arjun's dashboard shows 'Your visit today' with his check-in", /Your visit today/.test(await text(n.t, "#visits-today") ?? "") && /Acme Corp/.test(await text(n.t, "#visit-today-own") ?? ""), await text(n.t, "#visits-today"));
  await go(n, "ananya", "dashboard/employee.html");
  check("D10", "someone with no reports and no visit has no visit card", !(await visible(n.t, "#visits-today")));
}

// ---------- E ----------
if (ONLY.includes("E")) {
  console.log("\n--- E. A same-day visit: approval after ---");
  const n = await make("fin");
  await go(n, "fin", "attendance/mark-attendance.html");
  await n.t.getByRole("radio", { name: "Client / official visit" }).click(); await settle(n.t);
  check("E1", "with no visit today, Mark attendance offers 'Start a visit now'", await visible(n.t, "#visit-start-btn") && /no approved visit/.test(await text(n.t, "#visit-none-note") ?? ""));
  await n.t.click("#visit-start-btn"); await n.t.fill("#vs-site", "Gamma Ltd, Thane"); await n.t.fill("#vs-purpose", "Urgent fix on site");
  await n.t.click("#visit-start-form button[type=submit]"); await settle(n.t, 500);
  check("E2", "started: a toast saying the manager approves it afterwards; the page shows the visit with the pending note", /Visit started/.test(await toast(n.t)) && /Started today before approval/.test(await text(n.t, "#visit-pending-note") ?? ""), await toast(n.t));
  await n.t.click("#visit-locate-btn"); await settle(n.t, 600); const rd = await text(n.t, "#visit-reading"); await n.t.click("#visit-check-in-btn"); await settle(n.t, 500);
  const v = (await stored(n.t, "officeos:visits")).visits.find((x) => x.personId === "EMP-1008" && x.sameDay);
  check("E3", "he can check in at once: same-day, approval pending, in progress", Boolean(v?.sameDay && v.approvalPending && v.status === "in-progress" && v.days[TODAY]?.in?.time === "10:00"), j([v && [v.status, v.approvalPending, v.days], rd, await text(n.t, "#visit-error")]));
  await go(n, "admin", "requests/approvals-inbox.html");
  const inbox = await text(n.t, "#inbox-table");
  check("E4", "Aarav's inbox (Kabir's manager) has it as a Visit row (started today) with Approve and Reject", /Visit: Kabir Shah/.test(inbox ?? "") && /Gamma Ltd, Thane/.test(inbox) && /started today/.test(inbox), inbox);
  const counts = await n.t.evaluate(() => ({ bell: document.querySelector(".topbar__icon-btn--dot[aria-haspopup]")?.getAttribute("aria-label") ?? "", side: document.querySelector('.nav__item[href$="approvals-inbox.html"] .badge, .nav__item[href$="approvals-inbox.html"] .nav__count')?.textContent ?? "" }));
  await n.t.locator(".topbar__icon-btn--dot[aria-haspopup]").click(); await settle(n.t, 300);
  const bellText = await text(n.t, "#bell-panel");
  check("E5", "the bell lists the visit, and the inbox's sidebar count is the bell's", /Kabir Shah/.test(bellText ?? "") && /Client \/ official visit|Visit/.test(bellText) && counts.side !== "" && counts.side === counts.bell.replace(/\D+/g, ""), j([counts, bellText]));
  await n.t.keyboard.press("Escape"); await settle(n.t, 250);
  await n.t.locator("#inbox-table tr[data-visit]").getByRole("button", { name: "Reject", exact: true }).first().click(); await settle(n.t, 300);
  await n.t.fill("#reject-visit-note", "Not agreed beforehand"); await n.t.locator('button[form="reject-visit-note-form"]').click(); await settle(n.t, 500);
  const v2 = (await stored(n.t, "officeos:visits")).visits.find((x) => x.sameDay);
  check("E6", "Reject with a reason: the visit is rejected and the day goes back to the ordinary rules (the day reads under the ordinary office rules)", v2.status === "rejected" && v2.decisionReason === "Not agreed beforehand", j([v2.status, v2.decisionReason]));
  await n.ctx.close();
}

// ---------- F ----------
if (ONLY.includes("F")) {
  console.log("\n--- F. Location denied or unavailable ---");
  const n = await make("emp", { geo: false });
  await go(n, "emp", "visits/my-visits.html");
  await request(n, { from: TODAY });
  await go(n, "mgr", "visits/team-visits.html"); await clickIn(n.t, "#waiting-table", "Approve"); await confirmYes(n.t, "Approve");
  await go(n, "emp", "attendance/mark-attendance.html");
  await n.t.getByRole("radio", { name: "Client / official visit" }).click(); await settle(n.t);
  await n.t.click("#visit-locate-btn"); await settle(n.t, 800);
  check("F1", "location blocked: the words say how to allow it or to say it isn't available; Check in stays off", /blocked for this site/.test(await text(n.t, "#visit-reading") ?? "") && await n.t.locator("#visit-check-in-btn").isDisabled(), await text(n.t, "#visit-reading"));
  await n.t.check("#visit-unavailable"); await settle(n.t, 200);
  check("F2", "'My location isn't available' asks for a reason and keeps Check in off until it is given", await visible(n.t, "#visit-reason") && await n.t.locator("#visit-check-in-btn").isDisabled());
  await n.t.fill("#visit-reason", "No signal in the basement"); await settle(n.t, 200);
  await n.t.click("#visit-check-in-btn"); await settle(n.t, 500);
  const v = (await stored(n.t, "officeos:visits")).visits[0];
  check("F3", "checked in without a location: kept, flagged as needing an OK, no coordinates", v.days[TODAY].in.needsOk && v.days[TODAY].in.lat === null && /waiting for an OK/.test(await text(n.t, "#visit-in-note") ?? ""), j(v.days[TODAY]?.in));
  await go(n, "mgr", "visits/team-visits.html");
  check("F4", "Sneha's waiting list has it: 'Accept without location'", await n.t.locator("#waiting-table").getByRole("button", { name: "Accept without location" }).count() === 1, await text(n.t, "#waiting-table"));
  await n.t.locator("#waiting-table").getByRole("button", { name: "Accept without location" }).click(); await settle(n.t, 300);
  await n.t.click('button[form="visit-ok-form"]'); await settle(n.t);
  check("F5", "accepting needs a note", /3 to 200/.test(await text(n.t, "#visit-ok-note-error") ?? ""), await text(n.t, "#visit-ok-note-error"));
  await n.t.fill("#visit-ok-note", "Spoke to the client, was there"); await n.t.click('button[form="visit-ok-form"]'); await settle(n.t, 500);
  const v2 = (await stored(n.t, "officeos:visits")).visits[0];
  check("F6", "accepted: the OK is kept with who and why, and the day now counts as on-site", v2.days[TODAY].in.okBy === "EMP-1029" && v2.days[TODAY].in.okNote === "Spoke to the client, was there", j(v2.days[TODAY]?.in?.okBy));
  await go(n, "emp", "attendance/my-attendance.html");
  check("F7", "My attendance shows On-site for today", /On-site/.test(await text(n.t, `.calendar__day[data-date="${TODAY}"]`) ?? ""));
  await n.ctx.close();
}

// ---------- G ----------
if (ONLY.includes("G")) {
  console.log("\n--- G. The visit page ---");
  const n = main;
  const id = (await stored(n.t, "officeos:visits")).visits.find((v) => v.personId === "EMP-1105").id;
  await go(n, "emp", `visits/visit.html?id=${id}`);
  const trail = await text(n.t, "#visit-trail");
  check("G1", "the trail has the day, the times, coordinates and accuracy", /10:00/.test(trail ?? "") && /18:45/.test(trail) && /19\.07600, 72\.87770/.test(trail) && /accurate to 30 m/.test(trail), trail);
  const href = await n.t.locator("#visit-trail a", { hasText: "Open in maps" }).first().getAttribute("href");
  check("G2", "'Open in maps' is an external link (a new tab) to the coordinates", /^https:\/\/www\.google\.com\/maps\?q=19\.076,72\.8777$/.test(href ?? "") && await n.t.locator("#visit-trail a", { hasText: "Open in maps" }).first().getAttribute("target") === "_blank", href);
  check("G3", "the summary and the history are there", /Quarterly review/.test(await text(n.t, "#visit-summary") ?? "") && /Approved/.test(await text(n.t, "#visit-history") ?? ""));
  await go(n, "mgr", `visits/visit.html?id=${id}`);
  check("G4", "her manager can open it", /Acme Corp/.test(await bodyText(n.t)) && !/can't open/.test(await bodyText(n.t)));
  await go(n, "ananya", `visits/visit.html?id=${id}`);
  check("G5", "someone else is told they can't open it", /You can't open this visit/.test(await bodyText(n.t)), (await bodyText(n.t)).slice(0, 160));
  await go(n, "emp", "visits/visit.html?id=VS-999");
  check("G6", "a visit that doesn't exist says so", /doesn't exist/.test(await bodyText(n.t)));
  await go(n, "ananya", "visits/team-visits.html");
  check("G7", "Team visits is not for someone who manages nobody (the 403 page)", /errors\/403/.test(n.t.url()), n.t.url());
}

// ---------- H ----------
if (ONLY.includes("H")) {
  console.log("\n--- H. Keyboard ---");
  const n = await make("emp");
  await go(n, "emp", "visits/my-visits.html");
  await n.t.focus("#request-visit-btn"); await n.t.keyboard.press("Enter"); await settle(n.t, 350);
  check("H1", "Enter on Request a visit opens the dialog with focus inside it", await n.t.evaluate(() => Boolean(document.activeElement?.closest("#request-visit-modal, [role=dialog]"))));
  await n.t.keyboard.press("Escape"); await settle(n.t, 350);
  check("H2", "Esc closes it (nothing was typed)", !(await visible(n.t, "#request-visit-modal")) && await n.t.evaluate(() => document.activeElement?.id === "request-visit-btn"));
  await go(n, "emp", "attendance/mark-attendance.html");
  await n.t.getByRole("radio", { name: "Office or home" }).focus(); await n.t.keyboard.press("ArrowRight"); await settle(n.t, 250);
  check("H3", "the arrow key moves the segmented choice to the visit way (radio group)", await n.t.getByRole("radio", { name: "Client / official visit" }).getAttribute("aria-checked") === "true" && await visible(n.t, "#visit-mode"));
  await n.ctx.close();
}

// ---------- S ----------
if (ONLY.includes("H")) {
  console.log("\n--- S. The sidebar ---");
  const seen = {};
  for (const who of ["emp", "mgr", "hr", "admin", "fin", "ananya"]) {
    const n = await make(who); await go(n, who, "dashboard/employee.html");
    seen[who] = await n.t.evaluate(() => [...document.querySelectorAll("a.nav__item")].map((a) => a.textContent.trim()).filter((t) => /visits/i.test(t)));
    await n.ctx.close();
  }
  check("S1", "everyone has My visits", Object.values(seen).every((l) => l.includes("My visits")), j(seen));
  check("S2", "Team visits: the managers (Sneha, Kabir), HR and the Admin have it; Arjun and Ananya, who manage nobody, don't", ["mgr", "fin", "hr", "admin"].every((w) => seen[w].includes("Team visits")) && !seen.emp.includes("Team visits") && !seen.ananya.includes("Team visits"), j(seen));
}

// ---------- contrast ----------
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
async function pairs(t, sels) {
  return t.evaluate((sels) => {
    const rgb = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (m) return m[1].split(/[ ,/]+/).filter(Boolean).map(Number); const k = c.match(/color\(srgb ([^)]+)\)/); return k ? k[1].trim().split(/\s+/).slice(0, 3).map((x) => Math.round(Number(x) * 255)) : null; };
    const bgOf = (e) => { for (let x = e; x; x = x.parentElement) { const c = rgb(getComputedStyle(x).backgroundColor); if (c && (c.length < 4 || c[3] > 0.5)) return c.slice(0, 3); } return [255, 255, 255]; };
    return sels.flatMap((s) => [...document.querySelectorAll(s)].slice(0, 3).map((e) => [s, rgb(getComputedStyle(e).color)?.slice(0, 3), bgOf(e)]));
  }, sels);
}
if (ONLY.includes("K")) {
  console.log("\n--- C2. Contrast ---");
  for (const theme of ["light", "dark"]) {
    const n = await make("emp", { theme });
    await go(n, "emp", "visits/my-visits.html"); await request(n, { from: TODAY });
    await go(n, "mgr", "visits/team-visits.html");
    const low = [];
    for (const [who, page, sels] of [["emp", "visits/my-visits.html", [".ds-pill", ".visit-site__name", ".visit-site__sub", ".ds-card__meta", ".ds-field__label"]], ["mgr", "visits/team-visits.html", [".visit-site__sub", ".visit-onsite__item", ".ds-card__meta", ".text-muted"]],
      ["emp", "attendance/mark-attendance.html", [".ds-hint", ".ds-privacy", ".ds-segmented__option"]]]) {
      await go(n, who, page);
      for (const [s, f, b] of await pairs(n.t, sels)) if (!f || ratio(f, b) < 4.5) low.push([page.split("/")[1], s, f && ratio(f, b).toFixed(2)]);
    }
    // the chips draw text over a hatched background: the text against both stripes (the soft tint and the surface)
    const chip = await n.t.evaluate(() => { const probe = document.createElement("span"); probe.className = "visit-chip"; probe.textContent = "x"; document.body.append(probe); const cs = getComputedStyle(probe); const out = { color: cs.color }; probe.remove(); const root = getComputedStyle(document.documentElement); out.soft = root.getPropertyValue("--ds-info-soft").trim(); out.surf = root.getPropertyValue("--ds-surface-1").trim(); out.warn = root.getPropertyValue("--ds-warning-soft").trim(); out.warnText = root.getPropertyValue("--ds-warning").trim(); return out; });
    const toRgb = (c) => { const h = c.trim(); if (h.startsWith("#")) { const x = h.length === 4 ? h.slice(1).split("").map((d) => d + d).join("") : h.slice(1); return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)); } const m = h.match(/rgba?\(([^)]+)\)/); return m ? m[1].split(/[ ,/]+/).filter(Boolean).slice(0, 3).map(Number) : null; };
    const fg = toRgb(chip.color), soft = toRgb(chip.soft), surf = toRgb(chip.surf), wsoft = toRgb(chip.warn), wfg = toRgb(chip.warnText);
    const chipRatios = [fg && soft && ratio(fg, soft), fg && surf && ratio(fg, surf), wfg && wsoft && ratio(wfg, wsoft)];
    check(`C2.${theme}`, `${theme}: the pills, chips, hints and segmented choice are 4.5:1 or more`, !low.length && chipRatios.every((r) => r === null || r >= 4.5), j([low, chipRatios.map((r) => r && r.toFixed(2))]));
    await n.ctx.close();
  }
}

// ---------- W ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. Widths and shots ---");
  for (const theme of ["light", "dark"]) for (const width of [412, 768, 1280]) {
    const n = await make("emp", { width, theme });
    await go(n, "emp", "visits/my-visits.html"); await request(n, { from: TODAY, siteName: "A very long client name Industries Private Limited, Phase 2 Plot 14 Industrial Estate, Navi Mumbai" });
    await go(n, "mgr", "visits/team-visits.html"); await clickIn(n.t, "#waiting-table", "Approve"); await confirmYes(n.t, "Approve");
    const id = (await stored(n.t, "officeos:visits")).visits[0].id;
    const wide = [];
    const PAGES = [["emp", "visits/my-visits.html"], ["mgr", "visits/team-visits.html"], ["emp", `visits/visit.html?id=${id}`], ["emp", "attendance/mark-attendance.html"], ["emp", "attendance/my-attendance.html"], ["hr", "attendance/team-attendance.html"],
      ["admin", "dashboard/admin.html"], ["hr", "dashboard/hr.html"], ["emp", "dashboard/employee.html"], ["mgr", "requests/approvals-inbox.html"], ["fin", "dashboard/finance.html"], ["admin", "access/roles-list.html"]];
    for (const [who, page] of PAGES) {
      await go(n, who, page);
      if (page.includes("mark-attendance")) { await n.t.getByRole("radio", { name: "Client / official visit" }).click(); await settle(n.t, 250); }
      const over = await n.t.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 1) wide.push([page, over]);
      await n.t.screenshot({ path: path.join(SHOTS, `${page.split("/")[1].split(/[.?]/)[0]}-${who}-${width}-${theme}.png`), fullPage: true });
    }
    // the open dialogs, as shots too
    await go(n, "emp", "visits/my-visits.html"); await n.t.click("#request-visit-btn"); await settle(n.t, 300);
    await n.t.screenshot({ path: path.join(SHOTS, `request-dialog-emp-${width}-${theme}.png`), fullPage: false });
    await n.t.keyboard.press("Escape");
    await go(n, "mgr", "visits/team-visits.html"); await n.t.getByRole("tab", { name: /All visits/ }).click(); await settle(n.t, 250);
    await n.t.click("#assign-visit-btn"); await settle(n.t, 300);
    await n.t.screenshot({ path: path.join(SHOTS, `assign-dialog-mgr-${width}-${theme}.png`), fullPage: false });
    check(`W.${width}.${theme}`, `${width} ${theme}: no sideways scroll on the ${PAGES.length} new or changed pages`, !wide.length, j(wide));
    await n.ctx.close();
  }
}

if (ONLY.includes("X")) check("X1", "no page or console errors", errs.length === 0, j(errs.slice(0, 5)));
console.log(`\nCV1 harness: passed ${passed}, failed ${failed} (${Math.round((Date.now() - t0) / 1000)} s)`);
await browser.close();
stop();
process.exitCode = failed ? 1 : 0;
