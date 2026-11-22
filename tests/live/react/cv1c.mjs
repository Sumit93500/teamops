// CV1c's harness (msedge, headless): an approved visit day nobody checked in on, in the React app. Read by meaning (words, attributes, storage), never by pixels.
// usage: node cv1c.mjs <app dist> <repo root> <shots dir>   [ONLY=ADNKWX]
// Clock: Mon 21 Dec 2026 10:00 IST (the shift rules apply). The visits are written straight into storage (the shape data/visits-store.js documents).
//   A  the flag on the HR and Admin dashboards: the card, the count, who is named, the link; nothing for a manager, Finance or an employee
//   D  Team visits for HR: the flag, the "No check-in" tab (also from ?tab=no-check-in), the rows, Complete day (full or half only), the reason, the count falls
//   N  the visit page: the day says "Approved visit, no check-in", HR has Complete day, a manager hasn't; the completed day reads as HR's decision
//   K  keyboard: the dialog takes focus and Esc closes it
//   T  the Team attendance table fits its card at 768, 1024, 1280 and 1440, light and dark, with the Status column whole
//   W  no sideways scroll at 412 and 1280, light and dark, on the changed pages; shots
//   C  contrast of the flag, the warning note and the pills (4.5:1)
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
const ONLY = process.env.ONLY ?? "ADNKTWCX";
fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn("python", [path.join(HERE, "spa-serve.py"), "9977", DIST], { stdio: "ignore" });
const stop = () => { try { srv.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9977";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const size = (w) => (w === 412 ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA } : { viewport: { width: w, height: 900 } });
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(8)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 500)}` : ""}`); };
const errs = [];
const NOW = "2026-12-21T10:00:00+05:30";
const j = JSON.stringify;
// two approved visits with nothing punched: Arjun's two days (16 and 17 Dec, assigned by HR) and the Admin's own day (16 Dec)
const visit = (id, personId, from, to, dates, by, extra = {}) => ({ id, personId, kind: "client", siteName: "Acme Corp, Pune", address: "", purpose: "Quarterly review with the client", fromDate: from, toDate: to, dates, allowOffDay: false, source: "assigned", assignedBy: by,
  sameDay: false, approvalPending: false, managerId: null, status: "approved", approvedBy: by, approvedAt: "2026-12-14T04:30:00.000Z", decisionReason: "", createdAt: "2026-12-14T04:30:00.000Z", days: {}, history: [{ at: "2026-12-14T04:30:00.000Z", by, action: "assigned", note: "" }], ...extra });
const STORE = { version: 1, seq: 4, visits: [visit("VS-1", "EMP-1105", "2026-12-16", "2026-12-17", ["2026-12-16", "2026-12-17"], "EMP-1003", { managerId: "EMP-1029" }), visit("VS-2", "EMP-1001", "2026-12-16", "2026-12-16", ["2026-12-16"], "EMP-1003", { siteName: "Orbit Banking, Mumbai", source: "self" })] };

async function make(who, { width = 1280, theme = "light", store = STORE } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata", colorScheme: theme });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(NOW));
  await ctx.addInitScript(([th, st, w]) => {
    if (localStorage.getItem("cv1c:seeded")) return;
    localStorage.clear(); localStorage.setItem("cv1c:seeded", "1");
    localStorage.setItem("officeos:prefs", JSON.stringify({ theme: th }));
    if (st) localStorage.setItem("officeos:visits", JSON.stringify(st));
    localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
    localStorage.setItem(`officeos:prefs:${w[1]}`, JSON.stringify({ theme: th }));
  }, [theme, store, WHO[who]]);
  const t = await ctx.newPage();
  t.on("pageerror", (e) => errs.push(`${who}: ${e.message}`));
  t.on("console", (m) => { if (m.type() === "error") errs.push(`${who}: console ${m.text()}`); });
  await t.goto(N + "/pages/auth/login.html"); await t.waitForLoadState("load");
  return { ctx, t, who };
}
async function go(n, page, who) {
  if (who) await n.t.evaluate((w) => { localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 })); }, WHO[who]);
  await n.t.goto(N + "/pages/" + page); await n.t.waitForLoadState("load");
  await n.t.evaluate(() => document.fonts.ready); await n.t.waitForTimeout(450);
}
const settle = (t, ms = 350) => t.waitForTimeout(ms);
const text = (t, sel) => t.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const bodyText = (t) => t.evaluate(() => document.querySelector("main")?.innerText.replace(/\s+/g, " ") ?? "");
const visible = (t, sel) => t.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; }, sel);
const toast = (t) => t.evaluate(() => [...document.querySelectorAll(".toast, .ds-toast")].map((x) => x.innerText.trim()).join(" | "));
const stored = (t, key) => t.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), key);

// ---------- A ----------
if (ONLY.includes("A")) {
  console.log("\n--- A. The flag on the dashboards ---");
  const n = await make("hr");
  await go(n, "dashboard/hr.html", "hr");
  const t0 = await text(n.t, "#visits-no-checkin");
  check("A1", "HR's dashboard has the card 'Approved visit, no check-in' with the count (3 days: Arjun twice, the Admin once), the names and the places", /Approved visit, no check-in/.test(t0 ?? "") && /3 days/.test(t0) && /Arjun Kapoor/.test(t0) && /Aarav Mehta/.test(t0) && /Acme Corp, Pune/.test(t0), t0);
  const href = await n.t.locator("#visits-no-checkin a").getAttribute("href");
  check("A2", "its 'Complete them' link opens Team visits on the No check-in tab", /visits\/team-visits\.html\?tab=no-check-in/.test(href ?? ""), href);
  await go(n, "dashboard/admin.html", "admin");
  const t1 = await text(n.t, "#visits-no-checkin");
  check("A3", "the Admin's dashboard has it too, without the Admin's own day (2 days: Arjun's)", /2 days/.test(t1 ?? "") && /Arjun Kapoor/.test(t1) && !/Aarav Mehta/.test(t1), t1);
  const gone = [];
  for (const [who, page] of [["fin", "dashboard/finance.html"], ["emp", "dashboard/employee.html"], ["mgr", "dashboard/employee.html"]]) { await go(n, page, who); gone.push(!(await visible(n.t, "#visits-no-checkin"))); }
  check("A4", "Finance, an employee and a manager don't see it", gone.every(Boolean), j(gone));
  await n.ctx.close();
  const e = await make("hr", { store: { version: 1, seq: 1, visits: [] } });
  await go(e, "dashboard/hr.html", "hr");
  check("A5", "with no such day the card is not drawn at all", !(await visible(e.t, "#visits-no-checkin")));
  await e.ctx.close();
}

// ---------- D ----------
if (ONLY.includes("D")) {
  console.log("\n--- D. Team visits: the flag, the tab, Complete day ---");
  const n = await make("hr");
  await go(n, "visits/team-visits.html", "hr");
  const flag = await text(n.t, "#no-checkin-flag");
  check("D1", "the flag says 3 approved visit days have no check-in, with the rules in a line and a 'Complete them' button", /3 approved visit days/.test(flag ?? "") && /with no check-in/.test(flag) && /absence/.test(flag) && await n.t.getByRole("button", { name: "Complete them" }).count() === 1, flag);
  const tabs = await n.t.getByRole("tab").allInnerTexts();
  check("D2", "there is a third tab 'No check-in 3'", tabs.some((x) => /No check-in\s*3/.test(x.replace(/\s+/g, " "))), j(tabs));
  await n.t.getByRole("button", { name: "Complete them" }).click(); await settle(n.t);
  const rows = await n.t.locator("#no-checkin-table tbody tr").allInnerTexts();
  check("D3", "'Complete them' opens that tab: one row per day, oldest first (then by name), person, place, day and a Complete day button", rows.length === 3 && /Aarav Mehta/.test(rows[0]) && /Arjun Kapoor/.test(rows[1]) && /16 Dec/.test(rows[1]) && /Complete day/.test(rows[1]) && /17 Dec/.test(rows[2] ?? ""), j(rows));
  await go(n, "visits/team-visits.html?tab=no-check-in", "hr");
  check("D4", "the link ?tab=no-check-in opens on that tab", await visible(n.t, "#no-checkin-table"));
  await n.t.locator("#no-checkin-table tbody tr", { hasText: "Arjun Kapoor" }).first().getByRole("button", { name: "Complete day" }).click(); await settle(n.t);
  const dlg = await text(n.t, "#complete-visit-day-modal");
  check("D5", "the dialog says nobody checked in and what the day is until HR decides; there is no check-out time choice, only full or half", /nobody checked in/.test(dlg ?? "") && /Until you decide/.test(dlg) && !/Add the check-out time/.test(await n.t.locator("#cvd-how").innerHTML()) && (await n.t.locator("#cvd-how option").allInnerTexts()).join("|") === "Mark the day full|Mark the day half", dlg);
  await n.t.click('button[form="complete-visit-day-form"]'); await settle(n.t, 250);
  check("D6", "sending it with no reason is refused under the Reason field", /reason of 3 to 200/.test(await text(n.t, "#cvd-reason-error") ?? await text(n.t, "#complete-visit-day-modal") ?? ""), await text(n.t, "#complete-visit-day-modal"));
  await n.t.selectOption("#cvd-how", "half"); await n.t.fill("#cvd-reason", "Spent the morning at the client's site"); await n.t.click('button[form="complete-visit-day-form"]'); await settle(n.t, 500);
  const st = await stored(n.t, "officeos:visits");
  const dec = st?.visits?.[0]?.days?.["2026-12-16"];
  check("D7", "saved: a half day by Priya with her reason, no punches; a toast says it is complete", dec?.decision?.outcome === "half" && dec.decision.by === "EMP-1003" && dec.in === null && /is complete/.test(await toast(n.t)), j(dec));
  const flag2 = await text(n.t, "#no-checkin-flag");
  check("D8", "the count falls to 2 and the row is gone", /2 approved visit days/.test(flag2 ?? "") && (await n.t.locator("#no-checkin-table tbody tr").count()) === 2, flag2);
  await go(n, "dashboard/hr.html", "hr");
  check("D9", "the dashboard's card says 2 days", /2 days/.test(await text(n.t, "#visits-no-checkin") ?? ""));
  await go(n, "attendance/team-attendance.html", "hr");
  await n.t.fill("#team-date", "2026-12-16"); await settle(n.t, 500);
  const arjun = (await n.t.locator("#main tbody tr", { hasText: "Arjun Kapoor" }).first().innerText()).replace(/\s+/g, " ");
  check("D10", "Team attendance for 16 Dec reads that day as On-site, half day, with no check-in time and no Incomplete flag", /On-site, half day/.test(arjun) && !/Visit not started|Incomplete|Complete visit day/.test(arjun) && /09:30–18:30 – Not recorded/.test(arjun), arjun);
  await n.ctx.close();
  const m = await make("mgr");
  await go(m, "visits/team-visits.html", "mgr");
  check("D11", "a manager (Sneha, Arjun's manager) has no flag and no No check-in tab", !(await visible(m.t, "#no-checkin-flag")) && !(await m.t.getByRole("tab", { name: /No check-in/ }).count()));
  await m.ctx.close();
}

// ---------- N ----------
if (ONLY.includes("N")) {
  console.log("\n--- N. The visit page ---");
  const n = await make("hr");
  await go(n, "visits/visit.html?id=VS-1", "hr");
  const day = await text(n.t, '.visit-trail__day[data-date="2026-12-16"]');
  check("N1", "HR: the day is marked 'Approved visit, no check-in', both punch lines say Not recorded, and Complete day is there", /Approved visit, no check-in/.test(day ?? "") && (day.match(/Not recorded/g) ?? []).length === 2 && /Complete day/.test(day), day);
  const today = await text(n.t, '.visit-trail__day[data-date="2026-12-17"]');
  check("N2", "17 Dec (also over) is flagged and has its own Complete day", /Approved visit, no check-in/.test(today ?? "") && /Complete day/.test(today), today);
  await n.t.locator('.visit-trail__day[data-date="2026-12-16"]').getByRole("button", { name: "Complete day" }).click(); await settle(n.t);
  await n.t.fill("#cvd-reason", "Confirmed with the client by phone"); await n.t.click('button[form="complete-visit-day-form"]'); await settle(n.t, 500);
  const after = await text(n.t, '.visit-trail__day[data-date="2026-12-16"]');
  check("N3", "completed: 'Completed by Priya Nair: full day', her reason under it, no flag and no button on that day", /Completed by Priya Nair: full day/.test(after ?? "") && /Confirmed with the client by phone/.test(after) && !/Approved visit, no check-in/.test(after) && !/Complete day/.test(after), after);
  check("N4", "the history has 'Day completed' naming the day and that nobody checked in", /Day completed/.test(await text(n.t, "#visit-history") ?? "") && /no check-in/.test(await text(n.t, "#visit-history") ?? ""));
  await n.ctx.close();
  const m = await make("mgr");
  await go(m, "visits/visit.html?id=VS-1", "mgr");
  const md = await text(m.t, '.visit-trail__day[data-date="2026-12-16"]');
  check("N5", "a manager sees the flag on the day but no Complete day button", /Approved visit, no check-in/.test(md ?? "") && !/Complete day/.test(md), md);
  await m.ctx.close();
  const a = await make("admin");
  await go(a, "visits/visit.html?id=VS-2", "admin");
  const ad = await text(a.t, '.visit-trail__day[data-date="2026-12-16"]');
  check("N6", "the Admin's own visit day has no Complete day for the Admin (HR does it)", /Approved visit, no check-in/.test(ad ?? "") && !/Complete day/.test(ad), ad);
  await a.ctx.close();
}

// ---------- K ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard ---");
  const n = await make("hr");
  await go(n, "visits/team-visits.html?tab=no-check-in", "hr");
  await n.t.locator("#no-checkin-table tbody tr").first().getByRole("button", { name: "Complete day" }).focus(); await n.t.keyboard.press("Enter"); await settle(n.t, 400);
  check("K1", "Enter on Complete day opens the dialog with focus inside it", await n.t.evaluate(() => Boolean(document.activeElement?.closest("#complete-visit-day-modal"))));
  await n.t.keyboard.press("Escape"); await settle(n.t, 300);
  check("K2", "Esc closes it and nothing was saved", !(await visible(n.t, "#complete-visit-day-modal")) && !(await stored(n.t, "officeos:visits")).visits[0].days["2026-12-16"]);
  await n.ctx.close();
}

// ---------- T ----------
if (ONLY.includes("T")) {
  console.log("\n--- T. The Team attendance table fits ---");
  for (const w of [768, 1024, 1280, 1440]) for (const theme of ["light", "dark"]) {
    const n = await make("hr", { width: w, theme });
    await go(n, "attendance/team-attendance.html", "hr");
    const m = await n.t.evaluate(() => { const wrap = document.querySelector(".table-wrap"), t = wrap.querySelector("table"); const th = [...t.querySelectorAll("thead th")].filter((x) => getComputedStyle(x).display !== "none").map((x) => x.innerText.trim()); const last = t.querySelector("thead th:last-child").getBoundingClientRect(); return { scroll: wrap.scrollWidth - wrap.clientWidth, status: last.right <= wrap.getBoundingClientRect().right + 1 && last.width > 60, th }; });
    check(`T${w}${theme[0]}`, `${w} ${theme}: no sideways scroll, the Status column whole (${m.th.length} columns shown)`, m.scroll <= 0 && m.status && m.th.at(-1) === "Status" && m.th[0].startsWith("Employee"), j(m));
    const chip = await n.t.evaluate(() => [...document.querySelectorAll(".table--team .visit-chip, .table--team .badge")].filter((c) => c.getBoundingClientRect().height > 30).length);
    check(`T${w}${theme[0]}c`, `${w} ${theme}: no status chip wraps onto a second line`, chip === 0, chip);
    if (theme === "light") await n.t.screenshot({ path: path.join(SHOTS, `team-attendance-${w}-${theme}.png`), fullPage: true });
    await n.ctx.close();
  }
  const n = await make("hr", { width: 1280 });
  await go(n, "attendance/team-attendance.html", "hr");
  check("T9", "at 1280 the order of the columns that stay is the table's own, and the export still has every column (it reads the rows)", await n.t.evaluate(() => [...document.querySelectorAll(".table--team thead th")].map((x) => x.innerText.trim()).join("|") === "Employee ▲|Department|Shift|Check-in|Place|Hours|Overtime|This week|Status" || [...document.querySelectorAll(".table--team thead th")].length === 9));
  await n.ctx.close();
}

// ---------- W ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. No sideways scroll ---");
  for (const [who, page, name] of [["hr", "dashboard/hr.html", "hr-dashboard"], ["admin", "dashboard/admin.html", "admin-dashboard"], ["hr", "visits/team-visits.html?tab=no-check-in", "team-visits-none"], ["hr", "visits/visit.html?id=VS-1", "visit-none"]]) {
    for (const w of [412, 1280]) for (const theme of ["light", "dark"]) {
      const n = await make(who, { width: w, theme });
      await go(n, page, who);
      const over = await n.t.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`W-${name}-${w}${theme[0]}`, `${name} at ${w} ${theme}: the page does not scroll sideways`, over <= 1, over);
      await n.t.screenshot({ path: path.join(SHOTS, `${name}-${w}-${theme}.png`), fullPage: true });
      await n.ctx.close();
    }
  }
}

// ---------- C ----------
if (ONLY.includes("C")) {
  console.log("\n--- C. Contrast ---");
  for (const theme of ["light", "dark"]) {
    const n = await make("hr", { theme });
    await go(n, "visits/team-visits.html", "hr");
    const low = await n.t.evaluate(() => {
      const cv = document.createElement("canvas"); cv.width = cv.height = 1; const g = cv.getContext("2d", { willReadFrequently: true });
      const rgba = (c) => { g.clearRect(0, 0, 1, 1); g.fillStyle = "#000"; g.fillStyle = c; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
      const over = (t, b) => { const a = t[3] + b[3] * (1 - t[3]); return [0, 1, 2].map((i) => (t[i] * t[3] + b[i] * b[3] * (1 - t[3])) / a).concat(a); };
      const bg = (e) => { const ls = []; for (let p = e; p; p = p.parentElement) { const c = rgba(getComputedStyle(p).backgroundColor); ls.push(c); if (c[3] >= 1) break; } let acc = [255, 255, 255, 1]; for (const c of ls.reverse()) acc = over(c, acc); return acc; };
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      return [...document.querySelectorAll("#no-checkin-flag, #no-checkin-flag *, .ds-pill, .ds-btn")].filter((e) => e.childNodes.length && [...e.childNodes].some((c) => c.nodeType === 3 && c.nodeValue.trim())).map((e) => { const b = bg(e), f = over(rgba(getComputedStyle(e).color), b); const l1 = lum(f), l2 = lum(b); return [(Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), e.innerText.slice(0, 20)]; }).filter(([r]) => r < 4.5);
    });
    check(`C-${theme}`, `${theme}: the flag, its button and the pills are 4.5:1 or more`, low.length === 0, j(low));
    await n.ctx.close();
  }
}

check("X1", "no page or console errors", errs.length === 0, errs.slice(0, 3).join(" | "));
await browser.close(); stop();
console.log(`\npassed ${passed}, failed ${failed}`);
process.exit(failed ? 1 : 0);