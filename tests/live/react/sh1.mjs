// SH1's harness (msedge, headless): shift-based attendance in the React app. Read by meaning (words, attributes, storage),
// never by pixels. usage: node sh1.mjs <app dist> <repo root> <shots dir>   [ONLY=RSAMDTOLKCWX]
// Clock: Tue 8 Dec 2026 21:20 IST (the shift rules apply from 1 Dec) unless a check says otherwise. The scenario: Arjun on
// Night from 1 Dec (HR), Sales on Early, Rohan swapped to Night on 9 Dec by Sneha; Arjun's nights of 1-7 Dec stored (a
// short leave, an incomplete night, 70 min of overtime on the 7th).
//   R  who opens Shifts: Admin and HR; Finance, an employee and a manager are sent to 403
//   S  the Shifts page: the four shifts with their rules in words, the night mark, who is on each today; New shift: the live
//      preview and the night mark as times are typed, each field's message, created; deactivating one in use refused with
//      who is on it; an unused one deactivated and reactivated (asked first)
//   A  assigning: HR's Assign shift (search, select, Night from a date) before the rules start; the change in "Assignments
//      and swaps" (date range, "No data in this range."); the profile's Shift card and history for HR, a manager (no Assign),
//      the person (My profile)
//   M  Mark attendance on a night shift: 21:20 "Your shift starts at 22:00, check-in opens at 21:30."; 21:45 check-in open;
//      the shift card (Night, 22:00 - 07:00, opens 21:30)
//   D  dashboards: the employee's "Your shift: Night, 22:00 to 07:00 (next morning)" and the next window; the Admin's table
//      has a Shift column; HR's "Shifts today"
//   T  team attendance: Shift and Overtime columns, Short leave / Incomplete chips; filters by shift and by every active
//      office; a manager swaps one date for a report (with a reason; an overlapping one refused); HR completes an incomplete night
//   O  overtime: waiting for the manager in the bell, the sidebar count and the inbox (type Overtime); approved there; HR
//      doesn't see it (Arjun has a manager)
//   L  leave balances show comp-off when it is on
//   K  keyboard: New shift opens with Enter, the name has focus, Esc closes
//   C  contrast: the shift line, cells, pills and preview, light and dark (4.5:1)
//   W  no sideways scroll at 412 and 1280, light and dark, on every changed page; shots
//   X  no page or console errors
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, , SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "RSAMDTOLKCWX";
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srv = spawn("python", [path.join(HERE, "spa-serve.py"), "9974", DIST], { stdio: "ignore" });
const stop = () => { try { srv.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9974";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const size = (w) => (w === 412 ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA } : { viewport: { width: w, height: 900 } });
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(16)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 600)}` : ""}`); };
const j = JSON.stringify;
const errs = [];
const NOW = "2026-12-08T21:20:00+05:30";
const ASSIGN = { version: 1, people: [{ id: "SA-1", seq: 1, userId: "EMP-1105", shiftId: "SH-3", from: "2026-12-01", to: null, by: "EMP-1003", at: "2026-11-20T05:00:00.000Z", note: "Night desk" }],
  departments: [{ seq: 2, departmentId: "SAL", shiftId: "SH-2", from: "2026-12-01", by: "EMP-1003", at: "2026-11-20T05:00:00.000Z" }],
  swaps: [{ id: "SW-3", seq: 3, userId: "EMP-1042", date: "2026-12-09", shiftId: "SH-3", fromShiftId: "SH-1", reason: "Covering the night desk", by: "EMP-1029", at: "2026-11-21T05:00:00.000Z" }], seq: 4, audit: [] };
const COMP_ON = { version: 1, shiftRulesFrom: null, latePolicy: null, compOff: { on: true, minutesPerDay: 480, expiryDays: 90 }, audit: [] };
const NIGHTS = [["2026-12-01", "21:55", "07:05"], ["2026-12-02", "22:00", "05:00"], ["2026-12-03", "22:00", null], ["2026-12-04", "22:40", "07:00"], ["2026-12-07", "22:05", "08:40"]];

// scenario: false (the seed only), true (assignments + nights), or "settings" (and comp-off on)
async function open(who, page, { width = 1280, theme = "light", now = NOW, scenario = true } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata" });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(now));
  await ctx.addInitScript(([w, th, sc, a, s]) => {
    if (localStorage.getItem("sh1:seeded")) return;
    localStorage.clear(); localStorage.setItem("sh1:seeded", "1");
    if (w) { localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 })); localStorage.setItem(`officeos:prefs:${w[1]}`, JSON.stringify({ theme: th })); }
    else localStorage.setItem("officeos:prefs", JSON.stringify({ theme: th }));
    if (sc) localStorage.setItem("officeos:shift-assignments", JSON.stringify(a));
    if (sc === "settings") localStorage.setItem("officeos:shift-settings", JSON.stringify(s));
  }, [who ? WHO[who] : null, theme, scenario, ASSIGN, COMP_ON]);
  const t = await ctx.newPage();
  t.on("pageerror", (e) => errs.push(`${who} ${page}: ${e.message}`));
  t.on("console", (m) => { if (m.type() === "error") errs.push(`${who} ${page}: console ${m.text()}`); });
  await t.goto(N + "/pages/" + page); await t.waitForLoadState("load");
  if (scenario) {
    // the nights are written once the seed exists (it is made on the first read), then the page is read again
    const done = await t.evaluate((nights) => {
      if (localStorage.getItem("sh1:nights")) return true;
      const raw = localStorage.getItem("officeos:attendance");
      if (!raw) return false;
      const box = JSON.parse(raw);
      box.records = box.records.filter((x) => !(x.userId === "EMP-1105" && nights.some((n) => n[0] === x.date)));
      nights.forEach(([date, inT, outT], i) => box.records.push({ id: `AT-9${i}00`, userId: "EMP-1105", date, checkIn: inT, checkOut: outT, mode: "office", source: "punch", originalCheckIn: null, originalCheckOut: null, history: [] }));
      localStorage.setItem("officeos:attendance", JSON.stringify(box)); localStorage.setItem("sh1:nights", "1");
      return false;
    }, NIGHTS);
    if (!done) { await t.reload(); await t.waitForLoadState("load"); }
  }
  await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(450);
  return { ctx, t };
}
const settle = (t, ms = 350) => t.waitForTimeout(ms);
const text = (t, sel) => t.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const path_ = (t) => new URL(t.url()).pathname;
const toast = (t) => t.evaluate(() => [...document.querySelectorAll(".toast, [role='status'].ds-toast, .ds-toast")].map((x) => x.innerText.trim()).join(" | "));

// ---------- R ----------
if (ONLY.includes("R")) {
  console.log("\n--- R. Who opens Shifts ---");
  for (const who of ["admin", "hr", "fin", "emp", "mgr"]) {
    const n = await open(who, "attendance/shifts.html");
    const ok = path_(n.t).endsWith("attendance/shifts.html") && (await n.t.$("#shift-list")) !== null;
    check(`R.${who}`, `${who}: ${["admin", "hr"].includes(who) ? "opens the Shifts page" : "sent to 403 (shifts:manage)"}`, ["admin", "hr"].includes(who) ? ok : path_(n.t).endsWith("errors/403.html"), path_(n.t));
    await n.ctx.close();
  }
}

// ---------- S ----------
if (ONLY.includes("S")) {
  console.log("\n--- S. The Shifts page ---");
  const n = await open("hr", "attendance/shifts.html");
  const rows = await n.t.evaluate(() => [...document.querySelectorAll("#shift-list tbody tr[data-shift]")].map((r) => ({ id: r.dataset.shift, text: r.innerText.replace(/\s+/g, " ") })));
  check("S1", "four shifts: General (default), Early, Night (overnight), Part-time, each with its rules in words", j(rows.map((r) => r.id)) === j(["SH-1", "SH-2", "SH-3", "SH-4"]) && /Late after 09:45\. Half day under 8 h\. Absent under 4 h\. Overtime after 18:45 in 30 min blocks/.test(rows[0].text) && /Overnight/.test(rows[2].text) && /22:00 to 07:00 \(next day\)/.test(rows[2].text), j(rows.map((r) => r.text.slice(0, 120))));
  check("S2", "who is on each today: Night 1 person (Arjun), Early 1 (Ananya, Sales' default)", /1 person/.test(rows[2].text) && /1 person/.test(rows[1].text));
  check("S3", "the rules apply note (since 1 Dec 2026)", /Shift rules apply since 1 Dec 2026/.test(await text(n.t, "#rules-start")));
  await n.t.click("#new-shift"); await settle(n.t);
  await n.t.fill("#shift-name", "Late night"); await n.t.fill("#shift-start", "23:00"); await n.t.fill("#shift-end", "07:30"); await n.t.fill("#shift-breakMin", "30"); await settle(n.t, 200);
  const pre = await text(n.t, "#shift-preview");
  check("S4", "typing night times: the night mark and the live preview in plain words", (await n.t.$("#night-mark")) !== null && /23:00 to 07:30 the next morning \(night shift\)/.test(pre) && /Check-in opens at 22:00\. Late after 23:15\./.test(pre), pre);
  await n.t.fill("#shift-absentBelowHours", "7"); await settle(n.t, 150);
  await n.t.click('#shift-modal button[type="submit"]'); await settle(n.t);
  const err = await n.t.evaluate(() => [...document.querySelectorAll("#shift-modal .ds-field__error")].map((e) => e.innerText));
  check("S5", "a bad threshold: its own message under the field, the preview names what to fix, nothing saved", err.some((e) => /Absent must be at or under the half-day hours/.test(e)) && /To see the rules, fix/.test(await text(n.t, "#shift-preview")), j(err));
  await n.t.fill("#shift-absentBelowHours", "4"); await n.t.click('#shift-modal button[type="submit"]'); await settle(n.t, 500);
  check("S6", "saved: the new shift is in the list, marked overnight", (await n.t.evaluate(() => [...document.querySelectorAll("#shift-list tbody tr")].some((r) => /Late night/.test(r.innerText) && /Overnight/.test(r.innerText)))));
  await n.t.click('[data-toggle="SH-3"]'); await settle(n.t, 300);
  await n.t.click(".modal.is-open .ds-btn--danger, .modal.is-open .btn--danger"); await settle(n.t, 500);
  check("S7", "deactivating Night (Arjun is on it) is refused with who is on it", /Night is still in use.*Arjun Kapoor/.test(await toast(n.t)) && /Active/.test(await text(n.t, '[data-shift="SH-3"]')), await toast(n.t));
  await n.t.click('[data-toggle="SH-4"]'); await settle(n.t, 300);
  await n.t.click(".modal.is-open .ds-btn--danger, .modal.is-open .btn--danger"); await settle(n.t, 500);
  const box = await n.t.evaluate(() => JSON.parse(localStorage.getItem("officeos:shifts")).shifts.find((s) => s.id === "SH-4").active);
  check("S8", "Part-time (nobody on it) is deactivated after the question", box === false);
  await n.ctx.close();
}

// ---------- A ----------
if (ONLY.includes("A")) {
  console.log("\n--- A. Assigning ---");
  const n = await open("hr", "attendance/shifts.html", { now: "2026-11-16T10:00:00+05:30", scenario: false });
  check("A1", "before any assignment: 'No assignments yet' (an empty state, not an empty table)", /No assignments yet/.test(await text(n.t, "#shift-changes")));
  check("A2", "before the start date the note says when the shift rules start", /Shift rules start on 1 Dec 2026/.test(await text(n.t, "#rules-start")));
  await n.t.click("#bulk-assign"); await settle(n.t);
  await n.t.selectOption("#assign-shift", "SH-3");
  check("A3", "the dialog previews the chosen shift's rules and starts on the rules' start date", /22:00 to 07:00 the next morning/.test(await text(n.t, "#assign-preview")) && (await n.t.inputValue("#assign-from")) === "2026-12-01");
  await n.t.fill('#assign-people ~ * input, [aria-label="Search people"]', "Arjun"); await settle(n.t, 200);
  await n.t.click("#assign-people label:has-text('Arjun Kapoor') input"); await settle(n.t, 100);
  await n.t.click('#assign-shift-modal button[type="submit"]'); await settle(n.t, 600);
  const changes = await text(n.t, "#shift-changes");
  check("A4", "Arjun on Night from 1 Dec, no end, by Priya: in Assignments and swaps", /Arjun Kapoor/.test(changes) && /1 Dec 2026 to no end/.test(changes) && /Priya Nair/.test(changes), changes?.slice(0, 300));
  await n.t.selectOption("#shift-changes select >> nth=0", "custom"); await settle(n.t, 200);
  await n.t.fill("#shift-changes input[type=date] >> nth=0", "2026-11-17"); await n.t.fill("#shift-changes input[type=date] >> nth=1", "2026-11-20"); await settle(n.t, 300);
  check("A5", "a date range it doesn't touch: 'No data in this range.'", /No data in this range\./.test(await text(n.t, "#shift-changes")));
  await n.t.goto(N + "/pages/users/user-profile.html?id=EMP-1105"); await settle(n.t, 700);
  const card = await text(n.t, "#profile-shift");
  check("A6", "HR on Arjun's profile: the Shift card (General today, the rules start on 1 Dec), Assign shift, the history with Night from 1 Dec", /Shift rules start on 1 Dec 2026/.test(card) && /General/.test(card) && (await n.t.$("#assign-shift")) !== null && /Night/.test(await text(n.t, "#profile-shift-list")), card?.slice(0, 300));
  await n.ctx.close();
  const m = await open("mgr", "users/user-profile.html?id=EMP-1105");
  check("A7", "the manager (Sneha) on Arjun: the Shift card on Night, no Assign shift", /Night/.test(await text(m.t, "#profile-shift")) && (await m.t.$("#assign-shift")) === null);
  await m.ctx.close();
  const e = await open("emp", "account/my-profile.html");
  check("A8", "Arjun's own My profile: his shift and its history, no Assign", /Night/.test(await text(e.t, "#my-shift-card")) && /Night desk/.test(await text(e.t, "#my-shift-card")) && (await e.t.$("#assign-shift")) === null);
  await e.ctx.close();
}

// ---------- M ----------
if (ONLY.includes("M")) {
  console.log("\n--- M. Mark attendance on a night shift ---");
  const n = await open("emp", "attendance/mark-attendance.html");
  check("M1", "21:20: 'Your shift starts at 22:00, check-in opens at 21:30.' and the button can't be used", (await text(n.t, "#punch-note")) === "Your shift starts at 22:00, check-in opens at 21:30." && await n.t.$eval("#check-in-btn", (b) => b.disabled), await text(n.t, "#punch-note"));
  check("M2", "the shift card: Night, 22:00 - 07:00 (next morning), check-in opens 21:30", /Night/.test(await text(n.t, "#shift-name")) && /22:00 – 07:00 \(next morning\)/.test(await text(n.t, "#shift-timing")) && (await text(n.t, "#shift-opens")) === "21:30");
  check("M3", "the rule line says the window and when it is late", /Check-in opens at 21:30; after 22:15 is marked late/.test(await text(n.t, "#punch-rule")));
  await n.ctx.close();
  const o = await open("emp", "attendance/mark-attendance.html", { now: "2026-12-08T21:45:00+05:30" });
  check("M4", "21:45: check-in is open (the place check comes next): no refusal, Check-In From shown", (await o.t.$("#checkin-from")) !== null && (await text(o.t, "#punch-status")) === "Not checked in yet" && !(await o.t.$eval("#punch-note", (p) => !p.hidden && p.innerText.trim())));
  await o.ctx.close();
}

// ---------- D ----------
if (ONLY.includes("D")) {
  console.log("\n--- D. Dashboards ---");
  const e = await open("emp", "dashboard/employee.html");
  const line = await text(e.t, "#dash-shift");
  check("D1", "the employee's dashboard: 'Your shift: Night, 22:00 to 07:00 (next morning)' and 'Next check-in: today, opens at 21:30.'", /Your shift: Night, 22:00 to 07:00 \(next morning\)/.test(line) && /Next check-in: today, opens at 21:30\./.test(line), line);
  await e.ctx.close();
  const a = await open("admin", "dashboard/admin.html");
  const head = await a.t.evaluate(() => [...document.querySelectorAll('table[data-export-name="admin-dashboard-attendance"] th')].map((x) => x.innerText.trim()));
  check("D2", "the Admin's attendance table has a Shift column; Arjun's row says Night", head.includes("Shift") && /Night/.test(await a.t.evaluate(() => [...document.querySelectorAll("#admin-rows tr")].find((r) => /Arjun Kapoor/.test(r.innerText))?.innerText ?? "")), j(head));
  await a.ctx.close();
  const h = await open("hr", "dashboard/hr.html");
  const st = await text(h.t, "#shifts-today");
  check("D3", "HR's 'Shifts today': General, Early and Night with who is on them", /General/.test(st) && /Early/.test(st) && /Night/.test(st), st);
  await h.ctx.close();
}

// ---------- T ----------
if (ONLY.includes("T")) {
  console.log("\n--- T. Team attendance ---");
  const m = await open("mgr", "attendance/team-attendance.html");
  const heads = await m.t.evaluate(() => [...document.querySelectorAll('table[data-export-name="team-attendance"] th')].map((x) => x.innerText.replace(/\s+/g, " ").trim()));
  check("T1", "Shift and Overtime columns", heads.includes("Shift") && heads.includes("Overtime"), j(heads));
  const shiftOpts = await m.t.$$eval("#team-shift option", (o) => o.map((x) => x.textContent));
  const officeOpts = await m.t.$$eval("#team-office option", (o) => o.map((x) => x.textContent));
  check("T2", "filters by shift (every active shift) and by office (every active office)", j(shiftOpts) === j(["All shifts", "General", "Early", "Night", "Part-time"]) && officeOpts[0] === "All offices" && officeOpts.length >= 2, j([shiftOpts, officeOpts]));
  await m.t.selectOption("#team-shift", "SH-3"); await settle(m.t);
  const names = await m.t.$$eval("#team-rows .table__user-name", (x) => x.map((e) => e.textContent));
  check("T3", "Night only: Arjun", j(names) === j(["Arjun Kapoor"]), j(names));
  await m.t.selectOption("#team-shift", ""); await m.t.fill("#team-date", "2026-12-07"); await settle(m.t, 500);
  const arjun = await m.t.evaluate(() => [...document.querySelectorAll("#team-rows tr")].find((r) => /Arjun/.test(r.innerText))?.innerText.replace(/\s+/g, " "));
  check("T4", "7 Dec: Arjun's night, out 08:40 next morning: present, 1h of overtime", /Present/.test(arjun) && /\b1h\b/.test(arjun), arjun);
  await m.t.click("#swap-shift-open"); await settle(m.t);
  check("T5", "a manager's swap: only their direct reports to choose from", j(await m.t.$$eval("#swap-user option", (o) => o.map((x) => x.textContent))) === j(["Arjun Kapoor", "Rohan Gupta"]));
  await m.t.selectOption("#swap-user", "EMP-1042"); await m.t.fill("#swap-date", "2026-12-10"); await m.t.selectOption("#swap-shift", "SH-2");
  await m.t.click('#swap-shift-modal button[type="submit"]'); await settle(m.t, 300);
  check("T6", "no reason: refused under the field", /reason of 3 to 200/.test(await text(m.t, "#swap-shift-modal")));
  await m.t.fill("#swap-reason", "Covering the early desk"); await m.t.click('#swap-shift-modal button[type="submit"]'); await settle(m.t, 400);
  check("T6b", "back-to-back: Early on the 10th (opens 05:30) after his Night swap on the 9th (ends 07:00) is refused as an overlap", /overlap Night the day before, which ends at 07:00/.test(await text(m.t, "#swap-shift-modal")));
  await m.t.fill("#swap-date", "2026-12-11"); await m.t.click('#swap-shift-modal button[type="submit"]'); await settle(m.t, 500);
  const sw = await m.t.evaluate(() => JSON.parse(localStorage.getItem("officeos:shift-assignments")).swaps.find((s) => s.date === "2026-12-11"));
  check("T7", "saved: Rohan on Early on 11 Dec, by Sneha, with the reason", sw?.userId === "EMP-1042" && sw.shiftId === "SH-2" && sw.by === "EMP-1029" && sw.reason === "Covering the early desk", j(sw));
  await m.ctx.close();
  const h = await open("hr", "attendance/team-attendance.html");
  await h.t.fill("#team-date", "2026-12-03"); await settle(h.t, 500);
  const row3 = await h.t.evaluate(() => [...document.querySelectorAll("#team-rows tr")].find((r) => /Arjun/.test(r.innerText))?.innerText.replace(/\s+/g, " "));
  check("T8", "3 Dec, no check-out: Arjun's day is Incomplete with HR's Complete day", /Incomplete/.test(row3) && /Complete day/.test(row3), row3);
  await h.t.click('button:has-text("Complete day")'); await settle(h.t);
  await h.t.fill("#complete-time", "07:00"); await h.t.fill("#complete-note", "Forgot to check out");
  await h.t.click('#complete-day-modal button[type="submit"]'); await settle(h.t, 500);
  const after = await h.t.evaluate(() => [...document.querySelectorAll("#team-rows tr")].find((r) => /Arjun/.test(r.innerText))?.innerText.replace(/\s+/g, " "));
  check("T9", "completed: no longer incomplete; the record keeps the history", !/Incomplete/.test(after) && await h.t.evaluate(() => JSON.parse(localStorage.getItem("officeos:attendance")).records.find((r) => r.userId === "EMP-1105" && r.date === "2026-12-03")?.history.at(-1)?.action === "regularized"), after);
  await h.ctx.close();
  const f = await open("emp", "attendance/my-attendance.html");
  const log = await text(f.t, "#daily-log");
  check("T10", "My attendance: the Shift and Overtime columns, Short leave on the 2nd, Incomplete on the 3rd", /Shift/.test(log) && /Overtime/.test(log) && /Short leave/.test(log) && /Incomplete/.test(log) && /Your shift: Night/.test(await text(f.t, "#my-shift")), log?.slice(0, 200));
  await f.ctx.close();
}

// ---------- O ----------
if (ONLY.includes("O")) {
  console.log("\n--- O. Overtime ---");
  const m = await open("mgr", "requests/approvals-inbox.html");
  const row = await m.t.$('[data-overtime="OT:EMP-1105:2026-12-07"]');
  const sideCount = await m.t.evaluate(() => document.querySelector('a[href$="approvals-inbox.html"] .badge, a[href$="approvals-inbox.html"] .sidebar__count, a[href$="approvals-inbox.html"] [class*="count"]')?.textContent.trim());
  check("O1", "Arjun's 7 Dec overtime waits for Sneha: a row in the inbox (Overtime, 1h)", row !== null && /Overtime: Arjun Kapoor/.test(await row.innerText()) && /\b1h\b/.test(await row.innerText()), sideCount);
  await m.t.selectOption('select[aria-label="Filter by type"]', "overtime"); await settle(m.t);
  check("O2", "the type filter Overtime shows only it", (await m.t.$$("#inbox-table tbody tr")).length === 1);
  await m.t.click('[data-overtime="OT:EMP-1105:2026-12-07"] button:has-text("Approve")'); await settle(m.t, 300);
  await m.t.click(".modal.is-open .ds-btn--primary, .modal.is-open .btn--primary"); await settle(m.t, 500);
  const dec = await m.t.evaluate(() => JSON.parse(localStorage.getItem("officeos:overtime") ?? "null")?.decisions ?? []);
  check("O3", "approved: stored once, 60 min, by Sneha", dec.length === 1 && dec[0].status === "approved" && dec[0].minutes === 60 && dec[0].by === "EMP-1029", j(dec));
  await m.ctx.close();
  const h = await open("hr", "requests/approvals-inbox.html");
  check("O4", "HR doesn't get it (Arjun has a manager)", (await h.t.$('[data-overtime^="OT:EMP-1105"]')) === null);
  await h.ctx.close();
}

// ---------- L ----------
if (ONLY.includes("L")) {
  console.log("\n--- L. Comp-off in leave balances ---");
  const n = await open("emp", "leave/my-leave.html", { scenario: "settings" });
  check("L1", "comp-off on: My leave says how comp-off works", /Every 8 h of approved overtime earns a day, usable for 90 days/.test(await text(n.t, '[data-field="comp-off"]') ?? ""), await text(n.t, '[data-field="comp-off"]'));
  await n.ctx.close();
  const o = await open("emp", "leave/my-leave.html");
  check("L2", "comp-off off (the default) and none earned: no comp-off line", (await o.t.$('[data-field="comp-off"]')) === null);
  await o.ctx.close();
}

// ---------- K ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard ---");
  const n = await open("hr", "attendance/shifts.html");
  await n.t.focus("#new-shift"); await n.t.keyboard.press("Enter"); await settle(n.t);
  check("K1", "Enter on New shift opens the dialog with the name focused", (await n.t.evaluate(() => document.activeElement?.id)) === "shift-name");
  await n.t.keyboard.press("Escape"); await settle(n.t);
  check("K2", "Esc closes it (nothing typed), focus back on New shift", (await n.t.$("#shift-modal.is-open, .modal.is-open #shift-form")) === null && (await n.t.evaluate(() => document.activeElement?.id)) === "new-shift");
  await n.ctx.close();
}

// ---------- C ----------
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
async function pairs(t, sels) {
  return t.evaluate((sels) => {
    const rgb = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (m) return m[1].split(/[ ,/]+/).filter(Boolean).map(Number); const k = c.match(/color\(srgb ([^)]+)\)/); return k ? k[1].trim().split(/\s+/).slice(0, 3).map((x) => Math.round(Number(x) * 255)) : null; };
    const bgOf = (e) => { for (let x = e; x; x = x.parentElement) { const c = rgb(getComputedStyle(x).backgroundColor); if (c && (c.length < 4 || c[3] > 0.5)) return c.slice(0, 3); } return [255, 255, 255]; };
    return sels.flatMap((s) => [...document.querySelectorAll(s)].slice(0, 3).map((e) => [s, rgb(getComputedStyle(e).color).slice(0, 3), bgOf(e)]));
  }, sels);
}
if (ONLY.includes("C")) {
  console.log("\n--- C. Contrast ---");
  for (const theme of ["light", "dark"]) {
    const low = [];
    for (const [who, page, sels] of [["emp", "attendance/my-attendance.html", [".shift-line__text strong", ".shift-line__sub", ".shift-cell__name", ".shift-cell__sub", ".badge--warning"]],
      ["hr", "attendance/shifts.html", [".shift-rules", ".ds-pill--info", ".ds-pill--warning", ".ds-pill--success", "#rules-start"]], ["hr", "users/user-profile.html?id=EMP-1105", [".shift-now__hours", ".shift-history__sub", ".shift-history__dates"]]]) {
      const n = await open(who, page, { theme });
      for (const [s, f, b] of await pairs(n.t, sels)) if (!f || ratio(f, b) < 4.5) low.push([page.split("/")[1], s, f && ratio(f, b).toFixed(2)]);
      await n.ctx.close();
    }
    check(`C1.${theme}`, `${theme}: the shift texts, cells, pills and notes are 4.5:1 or more`, !low.length, j(low));
  }
}

// ---------- W ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. Widths and shots ---");
  const PAGES = [["hr", "attendance/shifts.html"], ["hr", "users/user-profile.html?id=EMP-1105"], ["emp", "attendance/my-attendance.html"], ["emp", "attendance/mark-attendance.html"], ["mgr", "attendance/team-attendance.html"], ["emp", "dashboard/employee.html"], ["hr", "dashboard/hr.html"], ["admin", "dashboard/admin.html"], ["mgr", "requests/approvals-inbox.html"], ["emp", "account/my-profile.html"]];
  for (const theme of ["light", "dark"]) for (const width of [412, 1280]) {
    const wide = [];
    for (const [who, page] of PAGES) {
      const n = await open(who, page, { width, theme });
      const over = await n.t.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 1) wide.push([page, over]);
      if (theme === "light" || width === 412) await n.t.screenshot({ path: path.join(SHOTS, `${page.split("/")[1].split(".")[0]}-${who}-${width}-${theme}.png`), fullPage: true });
      await n.ctx.close();
    }
    check(`W.${width}.${theme}`, `${width} ${theme}: no sideways scroll on the ${PAGES.length} changed pages`, !wide.length, j(wide));
  }
}

// ---------- X ----------
if (ONLY.includes("X")) check("X1", "no page or console errors", errs.length === 0, j(errs.slice(0, 5)));
console.log(`\nSH1 harness: passed ${passed}, failed ${failed} (${Math.round((Date.now() - t0) / 1000)} s)`);
await browser.close();
stop();
process.exit(failed ? 1 : 0);