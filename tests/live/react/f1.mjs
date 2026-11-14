// F1's harness (msedge, headless): the bug-fix round. Read by meaning (attributes, words, computed colours, sizes), never by
// pixels. usage: node f1.mjs <app dist> <repo root> <shots dir>   [ONLY=BHCMPODKEWX]
// Clock Sat 14 Nov 2026 10:00 IST unless a check moves it; fresh storage for each context.
//   B  the bell (point 18): at 1440, 1280 and 1024, as every role: client-side navigation across the sidebar's pages, then
//      the bell opens its list every time (at least 30 open / close cycles per width), closed in turn by the bell, Esc
//      (focus back on the bell), a press outside and a page change; aria-expanded / -controls follow; the list sits inside
//      the window and on top (nothing covers its middle or title), with the sidebar expanded and collapsed; rapid clicks
//      (two: closed, three: open); signing out and in through the sign-in page; a card opened from the list closes on Esc
//      with focus on the bell; with nothing waiting; when storage can't be read; after another tab writes. The pre-F1
//      build fails this section (after the first page change the bell does nothing until a reload).
//   H  HR and Finance graphs (point 19): HR's leave requests per month and Finance's monthly payroll cost and departments
//      draw bars with the real values (the hidden data table), also after a reload; "No data in this range." only when
//      the months truly have none; the Admin's headcount and the Employee's hours still draw
//   C  chart colours: series 1 is the person's accent (role colour or chosen accent), light and dark; the Admin's headcount
//      bars and the old column bars follow it; a change of accent or theme recolours them at once, and from another tab;
//      every series colour 3:1 on the card; neighbouring series apart for colour-blind readers (Machado 2009 protan /
//      deutan, OKLab delta E 6 or more; 15 or more with full colour vision); the map's steps run from series 1
//   M  Mark attendance on every dashboard (point 8): Admin, HR, Finance, an employee and a manager; it goes to the page
//   P  the place check's words (point 8): "You are 40 m from Head office, check-in allowed", "You are 2.3 km from Head office
//      (limit 150 m), check-in not allowed"; the old "not part of this demo" sentence is nowhere in the app
//   O  every office (point 15): the Admin's Check-In From lists the head office and every active branch (not an inactive
//      one) and checks in at the chosen branch; HR lists only their own; the user form's Work location and Office list the
//      active offices, not a written-in one
//   D  date presets (point 3): Today, Last 7 days, This month, Last month, Custom; Last month at month and year ends, a leap
//      February, and the same moment in India and Los Angeles time
//   K  keyboard: the bell by Enter and Esc; the dashboards' Mark attendance in the Tab order
//   E  contrast of the new text (notes, the header button) in both themes
//   W  shots: the dashboards as every role at 412, 768 and 1280, light and dark; the bell open; Mark attendance; the gallery's
//      date range
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
const ONLY = process.env.ONLY ?? "BHCMPODKEWX";
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srvN = spawn("python", [path.join(HERE, "spa-serve.py"), "9971", DIST], { stdio: "ignore" });
const stop = () => { try { srvN.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9971";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"] };
const LANDING = { admin: "dashboard/admin.html", hr: "dashboard/hr.html", fin: "dashboard/finance.html", emp: "dashboard/employee.html", mgr: "dashboard/employee.html" };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const size = (w) => (w === 412 ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA } : { viewport: { width: w, height: 900 } });
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(16)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 700)}` : ""}`); };
const j = JSON.stringify;
const errs = [];
const BELL = ".topbar__icon-btn--dot[aria-haspopup]";
const NOW = "2026-11-14T10:00:00+05:30";
const HQ = { lat: 28.4523, lng: 77.0723 };
const M_PER_DEG = (6371008.8 * Math.PI) / 180;
const north = (p, m) => ({ latitude: p.lat + m / M_PER_DEG, longitude: p.lng });

async function open(who, page, { width = 1280, theme = "light", side = null, zone = "Asia/Kolkata", now = NOW, geo = null, offices = null, accent = null, ctx: given = null } = {}) {
  const ctx = given ?? await browser.newContext({ ...size(width), timezoneId: zone, ...(geo ? { geolocation: { accuracy: 15, ...geo }, permissions: ["geolocation"] } : {}) });
  if (!given) {
    await useLocalFonts(ctx);
    await ctx.clock.setFixedTime(new Date(now));
    await ctx.addInitScript(([w, th, sd, off, ac]) => {
      // seeded once per context: a second tab (another tab's write) joins the same storage instead of clearing it
      if (sessionStorage.getItem("u-set") || localStorage.getItem("f1:seeded")) return;
      sessionStorage.setItem("u-set", "1"); localStorage.clear(); localStorage.setItem("f1:seeded", "1");
      if (w) {
        localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
        localStorage.setItem(`officeos:prefs:${w[1]}`, JSON.stringify({ theme: th, ...(ac ? { accent: ac } : {}) }));
      }
      localStorage.setItem("officeos:theme", JSON.stringify(th));
      if (sd) localStorage.setItem("officeos:sidebar", JSON.stringify(sd));
      if (off) localStorage.setItem("officeos:offices", JSON.stringify(off));
    }, [who ? WHO[who] : null, theme, side, offices, accent]);
  }
  const t = await ctx.newPage();
  t.on("pageerror", (e) => errs.push(`${who} ${page}: ${e.message}`));
  t.on("console", (m) => { if (m.type() === "error" && !/storage: failed to read/.test(m.text())) errs.push(`${who} ${page}: console ${m.text()}`); });
  await t.goto(N + "/" + (page.startsWith("gallery") ? page : "pages/" + page)); await t.waitForLoadState("load");
  await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(450);
  return { ctx, t };
}
const settle = (t, ms = 250) => t.waitForTimeout(ms);
// a page change inside the app: the sidebar's own link (React Router), never a reload
const navTo = (t, href) => t.evaluate((h) => { const a = [...document.querySelectorAll("#sidebar a[href]")].find((x) => x.getAttribute("href") === h); if (!a) return false; a.click(); return true; }, href);
const sideLinks = (t) => t.evaluate(() => [...new Set([...document.querySelectorAll("#sidebar a[href]")].map((a) => a.getAttribute("href")).filter((h) => h.startsWith("/pages/") && !h.includes("/auth/")))]);
// the list's state: open, inside the window, on top, the bell's attributes, where focus is
const bellState = (t) => t.evaluate((sel) => {
  const p = document.getElementById("bell-panel"), b = document.querySelector(sel);
  const out = { open: !!p, expanded: b?.getAttribute("aria-expanded") ?? null, controls: b?.getAttribute("aria-controls") ?? null, focusBell: document.activeElement === b, label: b?.getAttribute("aria-label") ?? null };
  if (p) {
    const sheet = p.querySelector(".bell-panel__sheet") ?? p, r = sheet.getBoundingClientRect(), title = document.getElementById("bell-panel-title");
    const tr = title.getBoundingClientRect();
    const onTop = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && p.contains(e); };
    out.inside = r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5 && r.width > 200 && r.height > 60;
    out.onTop = onTop(r.left + r.width / 2, r.top + r.height / 2) && onTop(tr.left + 4, tr.top + tr.height / 2);
    out.items = p.querySelectorAll(".bell-panel__item").length;
    out.text = sheet.textContent.replace(/\s+/g, " ").trim().slice(0, 160);
    out.focusIn = p.contains(document.activeElement);
  }
  return out;
}, BELL);

// ---------- B ----------
if (ONLY.includes("B")) {
  console.log("\n--- B. The bell opens every time ---");
  const widths = [[1440, null], [1280, null], [1024, null]];
  for (const [width] of widths) {
    let cycles = 0, bad = [];
    for (const who of ["admin", "hr", "fin", "emp", "mgr"]) {
      const n = await open(who, LANDING[who], { width });
      const t = n.t;
      const hasList = await t.evaluate((sel) => !!document.querySelector(sel), BELL);
      if (!hasList) { check(`B.${width}.${who}.0`, `${who}: no list for this role (the inbox's placeholder bell), skipped`, true); await n.ctx.close(); continue; }
      const links = (await sideLinks(t)).slice(0, 9);
      const closers = ["bell", "escape", "outside", "route"];
      for (let i = 0; i < links.length; i++) {
        if (!(await navTo(t, links[i]))) continue;
        await settle(t, 300);
        if (!(await t.evaluate((sel) => !!document.querySelector(sel), BELL))) continue;   // a page without the shell
        await t.click(BELL); await settle(t, 200);
        const s = await bellState(t);
        cycles++;
        const okOpen = s.open && s.expanded === "true" && s.controls === "bell-panel" && s.inside && s.onTop && s.focusIn;
        if (!okOpen) bad.push(`${who} ${links[i]} open ${j(s)}`);
        const how = closers[i % closers.length];
        if (how === "bell") await t.click(BELL);
        else if (how === "escape") await t.keyboard.press("Escape");
        else if (how === "outside") await t.mouse.click(Math.round(width / 2), 860);
        else await navTo(t, links[(i + 1) % links.length]);
        await settle(t, 200);
        const c = await bellState(t);
        const okClose = !c.open && c.expanded === "false" && c.controls === null && (how === "bell" || how === "escape" ? c.focusBell : true);
        if (!okClose) bad.push(`${who} ${links[i]} close by ${how} ${j(c)}`);
      }
      // rapid clicks: two leave it closed, three open
      await t.click(BELL); await t.click(BELL); await settle(t, 200);
      const two = await bellState(t);
      await t.click(BELL); await t.click(BELL); await t.click(BELL); await settle(t, 200);
      const three = await bellState(t);
      if (two.open || !three.open) bad.push(`${who} rapid ${j([two.open, three.open])}`);
      await t.keyboard.press("Escape"); await settle(t, 150);
      await n.ctx.close();
    }
    check(`B1.${width}`, `${width}: at least 30 open / close cycles across page changes, every one right`, cycles >= 30 && !bad.length, `${cycles} cycles; ${bad.slice(0, 4).join(" | ")}`);
  }

  // the sidebar expanded and collapsed at 1280: the list on top of both
  for (const sd of ["expanded", "collapsed"]) {
    const n = await open("admin", "dashboard/admin.html", { side: sd });
    await navTo(n.t, "/pages/requests/approvals-inbox.html"); await settle(n.t, 300);
    await n.t.click(BELL); await settle(n.t);
    const s = await bellState(n.t);
    check(`B2.${sd}`, `sidebar ${sd}: after a page change the list opens inside the window, on top`, s.open && s.inside && s.onTop, j(s));
    await n.ctx.close();
  }

  // sign out and back in through the sign-in page (no reload between)
  {
    const n = await open("admin", "dashboard/admin.html");
    const t = n.t;
    await t.click('button[aria-label="Account menu"]'); await settle(t, 150);
    await t.click("[data-signout]"); await settle(t, 500);
    const atLogin = new URL(t.url()).pathname;
    await t.click('[data-demo-role="hr"]'); await settle(t, 700);
    await t.click(BELL); await settle(t);
    const s = await bellState(t);
    check("B3", "signed out, then in as HR from the sign-in page: the bell opens its list", atLogin.endsWith("auth/login.html") && s.open && s.inside, j([atLogin, s]));
    await t.keyboard.press("Escape"); await settle(t, 150);
    await t.click('button[aria-label="Account menu"]'); await settle(t, 150);
    await t.click("[data-signout]"); await settle(t, 500);
    await t.click('[data-demo-role="admin"]'); await settle(t, 700);
    await navTo(t, "/pages/attendance/my-attendance.html"); await settle(t, 300);
    await t.click(BELL); await settle(t);
    const s2 = await bellState(t);
    check("B4", "out and in again as Admin, then a page change: the list still opens", s2.open && s2.items > 0, j(s2));
    // a card from the list: Esc closes it and focus comes back to the bell
    await t.click("#bell-panel .bell-panel__item"); await settle(t, 300);
    const card = await t.evaluate(() => !!document.getElementById("approval-card") && !document.getElementById("bell-panel"));
    await t.keyboard.press("Escape"); await settle(t, 300);
    const back = await t.evaluate((sel) => ({ card: !!document.getElementById("approval-card"), bell: document.activeElement === document.querySelector(sel) }), BELL);
    check("B5", "an item opens its card (the list closes); Esc closes the card, focus on the bell", card && !back.card && back.bell, j([card, back]));
    await n.ctx.close();
  }

  // nothing waiting, a failed read, another tab's write
  {
    const n = await open("admin", "dashboard/admin.html");
    const t = n.t;
    const label = await t.getAttribute(BELL, "aria-label");
    await t.click(BELL); await settle(t);
    const s = await bellState(t);
    const want = Math.min(5, Number(label.match(/\d+/)[0]));
    check("B6", "the list shows as many as the bell says (up to 5)", s.items === want, j([label, s.items]));
    await t.keyboard.press("Escape"); await settle(t, 150);
    // the records can't be read (the session and preferences still can): the list still opens and says something, never blank
    await t.evaluate(() => { const get = Storage.prototype.getItem; window.__get = get; Storage.prototype.getItem = function (k) { if (/session|prefs|theme|sidebar|accent/.test(k)) return get.call(this, k); throw new Error("blocked"); }; });
    await t.click(BELL); await settle(t);
    const f = await bellState(t);
    await t.evaluate(() => { Storage.prototype.getItem = window.__get; });
    check("B7", "storage blocked: the list opens with words (the list, nothing waiting, or that it couldn't be read)", f.open && f.inside && /Waiting for you/.test(f.text) && f.text.length > 20, j(f));
    await t.keyboard.press("Escape"); await settle(t, 150);
    // another tab writes (the storage event re-reads everything): the bell keeps working
    const t2 = await n.ctx.newPage();
    await t2.goto(N + "/pages/account/appearance.html"); await t2.waitForTimeout(600);
    await t2.evaluate(() => localStorage.setItem("officeos:announcements-read", JSON.stringify({ at: Date.now() })));
    await t2.click('[data-theme-choice="dark"]').catch(() => {});
    await t2.waitForTimeout(400);
    await settle(t, 300);
    await navTo(t, "/pages/requests/approvals-inbox.html"); await settle(t, 300);
    await t.click(BELL); await settle(t);
    const o = await bellState(t);
    check("B8", "after another tab's write and a page change: the list opens", o.open && o.inside && o.onTop, j(o));
    await n.ctx.close();
  }
  {
    // an employee with nothing waiting (Arjun manages nobody)
    const n = await open("emp", "dashboard/employee.html");
    const has = await n.t.evaluate((sel) => !!document.querySelector(sel), BELL);
    if (has) {
      await navTo(n.t, "/pages/leave/my-leave.html"); await settle(n.t, 300);
      await n.t.click(BELL); await settle(n.t);
      const s = await bellState(n.t);
      check("B9", "nothing waiting: the list opens and says so", s.open && /Nothing is waiting for you/.test(s.text), j(s));
    } else {
      await n.t.click(".topbar__icon-btn--dot"); await settle(n.t, 300);
      const toast = await n.t.evaluate(() => document.body.textContent.includes("Notifications isn't available in this demo."));
      check("B9", "an employee without the inbox: the bell says notifications aren't available (as before)", toast);
    }
    await n.ctx.close();
  }
}

// ---------- H ----------
const tableOf = (t, id) => t.evaluate((id) => [...document.querySelectorAll(`#${id} .ds-chart__table tbody tr`)].map((r) => [...r.children].map((c) => c.textContent.trim())), id);
const barsOf = (t, id) => t.evaluate((id) => [...document.querySelectorAll(`#${id} .recharts-bar-rectangle path, #${id} .recharts-rectangle`)].filter((p) => p.getBoundingClientRect().height > 0.5 && p.getBoundingClientRect().width > 0.5).length, id);
const emptyOf = (t, id) => t.evaluate((id) => !!document.querySelector(`#${id}.ds-chart--empty, #${id} .ds-chart__empty`), id);
if (ONLY.includes("H")) {
  console.log("\n--- H. HR and Finance graphs ---");
  for (const reload of [false, true]) {
    const n = await open("hr", "dashboard/hr.html");
    if (reload) { await n.t.reload(); await n.t.waitForTimeout(900); }
    const rows = await tableOf(n.t, "leave-chart");
    const tag = reload ? "after a reload" : "first load";
    check(`H1.${reload ? "r" : "f"}`, `HR (${tag}): leave requests per month, Jun to Nov 2026, the seed's real counts`,
      j(rows) === j([["Jun 2026", "0"], ["Jul 2026", "1"], ["Aug 2026", "1"], ["Sep 2026", "7"], ["Oct 2026", "0"], ["Nov 2026", "0"]]), j(rows));
    check(`H2.${reload ? "r" : "f"}`, `HR (${tag}): bars drawn (3 with a value), no empty message, the card's words`,
      (await barsOf(n.t, "leave-chart")) >= 3 && !(await emptyOf(n.t, "leave-chart")) && (await n.t.textContent("#leave-range")) === "Jun – Nov 2026", await barsOf(n.t, "leave-chart"));
    await n.ctx.close();
  }
  {
    // a range that truly has nothing: June 2028, no request sent in Jan-Jun 2028
    const n = await open("hr", "dashboard/hr.html", { now: "2028-06-15T10:00:00+05:30" });
    check("H3", "HR in June 2028 (no request in the 6 months): \"No data in this range.\"", (await emptyOf(n.t, "leave-chart")) && (await n.t.textContent("#leave-chart")).includes("No data in this range."));
    await n.ctx.close();
  }
  for (const reload of [false, true]) {
    const n = await open("fin", "dashboard/finance.html");
    if (reload) { await n.t.reload(); await n.t.waitForTimeout(900); }
    const tag = reload ? "after a reload" : "first load";
    const months = await tableOf(n.t, "fin-monthly-chart");
    const novStat = (await n.t.textContent('#main [data-stat="payroll"] .stat__value')).trim();
    check(`H4.${reload ? "r" : "f"}`, `Finance (${tag}): monthly payroll cost, Jun to Nov 2026, every month a rupee value; November equals the Payroll stat`,
      j(months.map((r) => r[0])) === j(["Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026", "Oct 2026", "Nov 2026"]) && months.every((r) => /^₹[\d,]+$/.test(r[1])) && months.at(-1)[1] === novStat,
      j([months, novStat]));
    check(`H5.${reload ? "r" : "f"}`, `Finance (${tag}): 6 month bars drawn, no empty message`, (await barsOf(n.t, "fin-monthly-chart")) === 6 && !(await emptyOf(n.t, "fin-monthly-chart")), await barsOf(n.t, "fin-monthly-chart"));
    // the departments against the run table on the same page: each department's gross is the sum of its people's
    const depts = await tableOf(n.t, "fin-dept-bars");
    const sums = await n.t.evaluate(() => {
      const m = {};
      document.querySelectorAll("#fin-run-rows tr").forEach((tr) => {
        const dept = tr.querySelector(".table__user-sub")?.textContent.trim() ?? "";
        const gross = Number(tr.children[1].textContent.replace(/[^\d]/g, ""));
        m[dept] = (m[dept] ?? 0) + gross;
      });
      return m;
    });
    const money = (v) => Number(String(v).replace(/[^\d]/g, ""));
    check(`H6.${reload ? "r" : "f"}`, `Finance (${tag}): gross by department matches the run's rows (Engineering ₹4,58,000)`,
      depts.length >= 5 && depts.every(([d, v]) => money(v) === (sums[d] ?? 0)) && depts.find((r) => r[0] === "Engineering")?.[1] === "₹4,58,000", j([depts, sums]));
    check(`H7.${reload ? "r" : "f"}`, `Finance (${tag}): department bars drawn`, (await barsOf(n.t, "fin-dept-bars")) >= 5);
    await n.ctx.close();
  }
  {
    const n = await open("admin", "dashboard/admin.html");
    check("H8", "the Admin's headcount and attendance-rate charts still draw", (await barsOf(n.t, "headcount-bars")) >= 5 && (await n.t.locator("#rate-chart .chart__col").count()) === 14);
    await n.ctx.close();
    const e = await open("emp", "dashboard/employee.html");
    check("H9", "the Employee's working hours chart still draws", (await e.t.locator("#hours-chart .chart__col").count()) === 14);
    await e.ctx.close();
  }
  for (const w of [412, 768]) {
    const n = await open("fin", "dashboard/finance.html", { width: w });
    const fit = await n.t.evaluate(() => [...document.querySelectorAll(".ds-chart__plot")].map((p) => { const r = p.getBoundingClientRect(); return r.width > 100 && r.right <= innerWidth + 0.5; }));
    const sideways = await n.t.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    check(`H10.${w}`, `Finance at ${w}: both charts have room and stay inside the window, no sideways scroll`, fit.length === 2 && fit.every(Boolean) && !sideways, j([fit, sideways]));
    await n.ctx.close();
  }
}

// ---------- C ----------
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// Machado, Oliveira & Fernandes (2009), severity 1.0, on linear RGB; OKLab (Ottosson); delta E x100
const MACHADO = { protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]], deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]] };
const oklab = ([r, g, b]) => {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b, m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b, s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const [L, M, S] = [l, m, s].map(Math.cbrt);
  return [0.2104542553 * L + 0.793617785 * M - 0.0040720468 * S, 1.9779984951 * L - 2.428592205 * M + 0.4505937099 * S, 0.0259040371 * L + 0.7827717662 * M - 0.808675766 * S];
};
const sim = (rgb, kind) => { const v = rgb.map((c) => lin(c / 255)); if (!kind) return v; return MACHADO[kind].map((row) => Math.max(0, Math.min(1, row[0] * v[0] + row[1] * v[1] + row[2] * v[2]))); };
const dE = (a, b, kind) => { const p = oklab(sim(a, kind)), q = oklab(sim(b, kind)); return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
// the theme's colours, resolved by the browser (color-mix included) to [r, g, b]
const tokens = (t) => t.evaluate(() => {
  const probe = document.createElement("span"); document.body.append(probe);
  const rgb = (v) => { probe.style.color = v; const c = getComputedStyle(probe).color; probe.style.color = ""; const m = c.match(/rgba?\(([^)]+)\)/); if (m) return m[1].split(/[ ,/]+/).filter(Boolean).slice(0, 3).map(Number); const k = c.match(/color\(srgb ([^)]+)\)/); return k ? k[1].trim().split(/\s+/).slice(0, 3).map((x) => Math.round(Number(x) * 255)) : null; };
  const out = { primary: rgb("var(--ds-primary)"), surface: rgb("var(--ds-surface-1)"), series: [1, 2, 3, 4, 5, 6].map((i) => rgb(`var(--ds-chart-${i})`)), seq: [1, 2, 3, 4, 5].map((i) => rgb(`var(--ds-seq-${i})`)) };
  const rect = document.querySelector("#headcount-bars pattern rect, #leave-chart pattern rect, #fin-monthly-chart pattern rect");
  out.bar = rect ? rgb(getComputedStyle(rect).fill) : null;
  const col = document.querySelector(".chart__bar:not(.chart__bar--leave):not(.chart__bar--absent):not(.chart__bar--incomplete)");
  out.col = col ? rgb(getComputedStyle(col).backgroundColor) : null;
  probe.remove();
  return out;
});
const near = (a, b) => !!a && !!b && a.every((v, i) => Math.abs(v - b[i]) <= 1);
if (ONLY.includes("C")) {
  console.log("\n--- C. Chart colours follow the person's accent ---");
  const ACCENTS = ["", "indigo", "blue", "teal", "violet", "slate", "pink"];
  for (const theme of ["light", "dark"]) {
    const n = await open("admin", "dashboard/admin.html", { theme });
    const t = n.t;
    const seen = [];
    for (const accent of ACCENTS) {
      await t.click('button[aria-label="Appearance"]'); await settle(t, 120);
      await t.click(`[data-accent-choice="${accent}"]`); await settle(t, 200);
      await t.keyboard.press("Escape"); await settle(t, 100);
      const k = await tokens(t);
      const tag = `${theme}.${accent || "role"}`;
      seen.push(j(k.series[0]));
      check(`C1.${tag}`, `${tag}: series 1 is the accent; the headcount bars and the old column bars are drawn in it, at once`, near(k.series[0], k.primary) && near(k.bar, k.primary) && near(k.col, k.primary), j([k.primary, k.series[0], k.bar, k.col]));
      const low = k.series.map((c, i) => [i + 1, ratio(c, k.surface)]).filter(([, r]) => r < 3);
      check(`C2.${tag}`, `${tag}: every series colour 3:1 or more on the card`, !low.length, j(low.map(([i, r]) => [i, r.toFixed(2)])));
      const pairs = k.series.slice(1).map((c, i) => [i + 1, Math.min(dE(k.series[i], c, "protan"), dE(k.series[i], c, "deutan")), dE(k.series[i], c)]);
      const weak = pairs.filter(([, cvd, nv]) => cvd < 6 || nv < 15);
      check(`C3.${tag}`, `${tag}: neighbouring series apart for colour-blind readers (6+) and with full colour vision (15+)`, !weak.length,
        j(pairs.map(([i, a, b]) => `${i}-${i + 1}: ${a.toFixed(1)}/${b.toFixed(1)}`)));
      const ls = k.seq.map(lum);
      const mono = theme === "light" ? ls.every((v, i) => !i || v < ls[i - 1]) : ls.every((v, i) => !i || v > ls[i - 1]);
      check(`C4.${tag}`, `${tag}: the map's five steps run from the card to series 1 (${theme === "light" ? "darker" : "lighter"} each step)`, mono && near(k.seq[4], k.series[0]), j(ls.map((v) => v.toFixed(3))));
    }
    check(`C5.${theme}`, `${theme}: the Admin's role colour (indigo) and six accents: six different series 1 colours, none fixed`, new Set(seen).size === 6 && seen[0] === seen[1], seen.join(" "));
    // another tab changes the accent: this tab's chart follows
    const t2 = await n.ctx.newPage();
    await t2.goto(N + "/pages/account/appearance.html"); await t2.waitForTimeout(700);
    await t2.click('button[aria-label="Appearance"]'); await t2.waitForTimeout(120);
    await t2.click('[data-accent-choice="pink"]'); await t2.waitForTimeout(400);
    await settle(t, 400);
    const k = await tokens(t);
    check(`C6.${theme}`, `${theme}: a change of accent in another tab recolours this tab's chart`, near(k.bar, k.primary) && j(k.bar) !== seen[0], j([k.bar, k.primary]));
    await n.ctx.close();
  }
  // the theme switch itself, live: light to dark recolours the bars
  {
    const n = await open("admin", "dashboard/admin.html");
    const a = await tokens(n.t);
    await n.t.click('button[aria-label="Appearance"]'); await settle(n.t, 120);
    await n.t.click('[data-theme-choice="dark"]'); await settle(n.t, 300);
    const b = await tokens(n.t);
    check("C7", "light to dark from the header: the bars recolour at once to dark's series 1", !near(a.bar, b.bar) && near(b.bar, b.primary), j([a.bar, b.bar]));
    await n.ctx.close();
  }
  for (const [who, page, id] of [["hr", "dashboard/hr.html", "leave-chart"], ["fin", "dashboard/finance.html", "fin-monthly-chart"]]) {
    for (const theme of ["light", "dark"]) {
      const n = await open(who, page, { theme });
      const k = await tokens(n.t);
      check(`C8.${who}.${theme}`, `${who} ${theme}: the role's colour draws the ${id} bars`, near(k.bar, k.primary), j([k.bar, k.primary]));
      await n.ctx.close();
    }
  }
}

// ---------- M ----------
if (ONLY.includes("M")) {
  console.log("\n--- M. Mark attendance on every dashboard ---");
  for (const who of ["admin", "hr", "fin", "emp", "mgr"]) {
    const n = await open(who, LANDING[who]);
    const link = n.t.locator('#main a[href$="attendance/mark-attendance.html"]', { hasText: "Mark attendance" }).first();
    const shown = await link.isVisible();
    await link.click(); await settle(n.t, 500);
    const where = new URL(n.t.url()).pathname, h1 = await n.t.textContent("#main h1").catch(() => "");
    check(`M1.${who}`, `${who}: the dashboard has Mark attendance, and it opens the page`, shown && where.endsWith("attendance/mark-attendance.html") && h1.trim() === "Mark attendance", j([shown, where, h1]));
    await n.ctx.close();
  }
}

// ---------- P ----------
const MONDAY = "2026-11-16T10:00:00+05:30";
const placeText = (t) => t.textContent("#place-status").then((s) => s.trim());
if (ONLY.includes("P")) {
  console.log("\n--- P. The place check's words ---");
  for (const [m, want] of [[40, "You are 40 m from Head office, check-in allowed"], [150, "You are 150 m from Head office, check-in allowed"], [2300, "You are 2.3 km from Head office (limit 150 m), check-in not allowed"], [151, "You are 151 m from Head office (limit 150 m), check-in not allowed"]]) {
    const n = await open("emp", "attendance/mark-attendance.html", { now: MONDAY, geo: north(HQ, m) });
    await n.t.click("#locate-btn"); await settle(n.t, 500);
    const got = await placeText(n.t);
    const btn = await n.t.isDisabled("#check-in-btn");
    check(`P1.${m}`, `${m} m north: "${want}"`, got === want && btn === (m > 150), j([got, btn]));
    await n.ctx.close();
  }
  {
    // check-out: the same words with check-out
    const n = await open("emp", "attendance/mark-attendance.html", { now: MONDAY, geo: north(HQ, 40) });
    await n.t.click("#locate-btn"); await settle(n.t, 500);
    await n.t.click("#check-in-btn"); await settle(n.t, 600);
    await n.ctx.clock.setFixedTime(new Date("2026-11-16T18:30:00+05:30"));
    await n.t.reload(); await n.t.waitForTimeout(800);
    await n.t.click("#locate-btn"); await settle(n.t, 500);
    check("P2", "after checking in, the check-out line: \"You are 40 m from Head office, check-out allowed\"", (await placeText(n.t)) === "You are 40 m from Head office, check-out allowed", await placeText(n.t));
    await n.ctx.close();
  }
  {
    const n = await open("admin", "attendance/mark-attendance.html", { now: MONDAY });
    const body = await n.t.textContent("body");
    check("P3", "the old \"Location and network checks aren't part of this demo\" sentence is nowhere on the page", !/part of this demo|network checks/i.test(body));
    await n.ctx.close();
  }
}

// ---------- O ----------
const OFFICE = (id, name, type, lat, lng, radiusM, active = true, state = "Haryana") => ({ id, name, type, address: `${name} address`, state, lat, lng, radiusM, active, sample: false, note: "" });
const BRANCHES = { version: 1, nextNum: 5, assignments: {}, records: [
  OFFICE("OFF-1", "Head office", "head", HQ.lat, HQ.lng, 150),
  OFFICE("OFF-2", "Pune branch", "branch", 18.5590, 73.7868, 200, true, "Maharashtra"),
  OFFICE("OFF-3", "Mumbai branch", "branch", 19.0662, 72.8679, 300, true, "Maharashtra"),
  OFFICE("OFF-4", "Kochi branch", "branch", 10.0159, 76.3419, 150, false, "Kerala"),
] };
if (ONLY.includes("O")) {
  console.log("\n--- O. Every office ---");
  const options = (t, sel) => t.evaluate((sel) => [...document.querySelectorAll(`${sel} option`)].map((o) => o.textContent.trim()), sel);
  {
    const pune = { lat: 18.5590, lng: 73.7868 };
    const n = await open("admin", "attendance/mark-attendance.html", { now: MONDAY, offices: BRANCHES, geo: north(pune, 50) });
    const opts = await options(n.t, "#checkin-from");
    check("O1", "the Admin's Check-In From: the head office and every active branch, not the inactive one", j(opts) === j(["Head office (150 m)", "Pune branch (200 m)", "Mumbai branch (300 m)"]), j(opts));
    await n.t.selectOption("#checkin-from", "office:OFF-2"); await settle(n.t, 150);
    await n.t.click("#locate-btn"); await settle(n.t, 500);
    const line = await placeText(n.t);
    check("O2", "Pune chosen, 50 m from it: \"You are 50 m from Pune branch, check-in allowed\"", line === "You are 50 m from Pune branch, check-in allowed", line);
    await n.t.click("#check-in-btn"); await settle(n.t, 600);
    const from = (await n.t.textContent("#stat-check-in-place")).trim();
    check("O3", "checked in at Pune: the record names the branch (\"Pune branch, 50 m\")", from === "Pune branch, 50 m", from);
    await n.t.selectOption("#checkin-from", "office:OFF-2").catch(() => {});
    await n.ctx.close();
  }
  {
    const n = await open("admin", "attendance/mark-attendance.html", { now: MONDAY, offices: BRANCHES, geo: north(HQ, 30) });
    await n.t.selectOption("#checkin-from", "office:OFF-3"); await settle(n.t, 150);
    await n.t.click("#locate-btn"); await settle(n.t, 500);
    const line = await placeText(n.t);
    check("O4", "at the head office with Mumbai chosen: the check is against Mumbai, not allowed", /^You are [\d,.]+ km from Mumbai branch \(limit 300 m\), check-in not allowed$/.test(line) && await n.t.isDisabled("#check-in-btn"), line);
    await n.ctx.close();
  }
  for (const who of ["hr", "fin", "emp"]) {
    const n = await open(who, "attendance/mark-attendance.html", { now: MONDAY, offices: BRANCHES });
    const opts = await options(n.t, "#checkin-from");
    check(`O5.${who}`, `${who}: only their own office, as before`, j(opts) === j(["Head office (150 m)"]), j(opts));
    await n.ctx.close();
  }
  {
    const n = await open("admin", "users/user-form.html", { offices: BRANCHES });
    const loc = await options(n.t, "#location"), off = await options(n.t, "#office");
    const chosen = await n.t.inputValue("#location");
    check("O6", "the user form's Work location: every active office, then Remote; the head office chosen for someone new", j(loc) === j(["Head office", "Pune branch", "Mumbai branch", "Remote"]) && chosen === "Head office", j([loc, chosen]));
    check("O7", "the user form's Office: the active offices only", off.length === 3 && !off.some((o) => o.includes("Kochi")), j(off));
    await n.ctx.close();
    const e = await open("admin", "users/user-form.html?id=EMP-1105", { offices: BRANCHES });
    const eloc = await options(e.t, "#location"), ev = await e.t.inputValue("#location");
    check("O8", "editing someone whose saved location isn't an office (\"Gurugram office\"): kept and chosen, after the offices and Remote", j(eloc) === j(["Head office", "Pune branch", "Mumbai branch", "Remote", "Gurugram office"]) && ev === "Gurugram office", j([eloc, ev]));
    await e.ctx.close();
  }
}

// ---------- D ----------
if (ONLY.includes("D")) {
  console.log("\n--- D. Date presets ---");
  const sel = ".ds-date-range select";
  const summary = (t) => t.textContent(".ds-date-range__summary").then((s) => s.trim());
  {
    const n = await open("admin", "gallery");
    const opts = await n.t.evaluate((s) => [...document.querySelector(s).options].map((o) => o.textContent), sel);
    check("D1", "the presets: All dates, Today, Last 7 days, This month, Last month, Custom", j(opts) === j(["All dates", "Today", "Last 7 days", "This month", "Last month", "Custom"]), j(opts));
    await n.ctx.close();
  }
  const CASES = [
    ["D2", "2026-11-14T10:00:00+05:30", "Asia/Kolkata", "1 Oct to 31 Oct 2026", "mid-November"],
    ["D3", "2027-01-05T10:00:00+05:30", "Asia/Kolkata", "1 Dec to 31 Dec 2026", "January: December of last year"],
    ["D4", "2026-03-10T10:00:00+05:30", "Asia/Kolkata", "1 Feb to 28 Feb 2026", "March: a 28-day February"],
    ["D5", "2028-03-01T10:00:00+05:30", "Asia/Kolkata", "1 Feb to 29 Feb 2028", "1 March 2028: a leap February"],
    ["D6", "2026-12-01T00:30:00+05:30", "Asia/Kolkata", "1 Nov to 30 Nov 2026", "00:30 on 1 Dec in India: November"],
    ["D7", "2026-12-01T00:30:00+05:30", "America/Los_Angeles", "1 Oct to 31 Oct 2026", "the same moment in Los Angeles (still 30 Nov): October"],
    ["D8", "2026-12-01T00:30:00+05:30", "UTC", "1 Oct to 31 Oct 2026", "the same moment in UTC (30 Nov 19:00): October"],
    ["D10", "2026-12-01T06:00:00+05:30", "UTC", "1 Nov to 30 Nov 2026", "06:00 on 1 Dec in India, 00:30 on 1 Dec in UTC: November"],
  ];
  for (const [id, now, zone, want, what] of CASES) {
    const n = await open("admin", "gallery", { now, zone });
    await n.t.selectOption(sel, "lastMonth"); await settle(n.t, 150);
    const got = await summary(n.t);
    check(id, `Last month, ${what}: "${want}"`, got === want, got);
    await n.ctx.close();
  }
  {
    const n = await open("admin", "gallery");
    await n.t.selectOption(sel, "month"); await settle(n.t, 100);
    const m = await summary(n.t);
    await n.t.selectOption(sel, "7d"); await settle(n.t, 100);
    const w = await summary(n.t);
    check("D9", "This month and Last 7 days as before", m === "1 Nov to 14 Nov 2026" && w === "8 Nov to 14 Nov 2026", j([m, w]));
    await n.ctx.close();
  }
}

// ---------- K ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard ---");
  const n = await open("admin", "dashboard/admin.html");
  await navTo(n.t, "/pages/attendance/team-attendance.html"); await settle(n.t, 300);
  await n.t.focus(BELL); await n.t.keyboard.press("Enter"); await settle(n.t);
  const a = await bellState(n.t);
  await n.t.keyboard.press("Escape"); await settle(n.t);
  const b = await bellState(n.t);
  check("K1", "the bell by Enter: the list opens with focus on its title; Esc closes it, focus on the bell", a.open && a.focusIn && !b.open && b.focusBell, j([a.open, a.focusIn, b.open, b.focusBell]));
  await n.ctx.close();
  for (const who of ["admin", "hr", "fin"]) {
    const d = await open(who, LANDING[who]);
    await d.t.focus('#main button[data-export], #main .page-header__actions a').catch(() => {});
    let hit = false;
    for (let i = 0; i < 4 && !hit; i++) { await d.t.keyboard.press("Tab"); hit = await d.t.evaluate(() => document.activeElement?.id === "dash-mark"); }
    const ring = hit && await d.t.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== "none");
    check(`K2.${who}`, `${who}: Mark attendance is in the Tab order with a focus ring`, hit && ring, j([hit, ring]));
    await d.ctx.close();
  }
}

// ---------- E ----------
if (ONLY.includes("E")) {
  console.log("\n--- E. Contrast of the new text ---");
  const pairs = (t, sels) => t.evaluate((sels) => {
    const rgb = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); return m ? m[1].split(/[ ,/]+/).filter(Boolean).map(Number) : null; };
    const bgOf = (e) => { for (let n = e; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if (c && (c.length < 4 || c[3] > 0.5)) return c.slice(0, 3); } return [255, 255, 255]; };
    return sels.map((s) => { const e = document.querySelector(s); return e ? [s, rgb(getComputedStyle(e).color).slice(0, 3), bgOf(e)] : [s, null, null]; });
  }, sels);
  for (const theme of ["light", "dark"]) {
    for (const [who, page, sels] of [["hr", "dashboard/hr.html", ["#leave-note", "#dash-mark", "#leave-range", "#leave-chart .ds-chart__readout"]], ["fin", "dashboard/finance.html", ["#fin-monthly-note", "#dash-mark", "#fin-monthly-meta", "#fin-dept-bars .ds-chart__readout"]], ["admin", "dashboard/admin.html", ["#dash-mark"]]]) {
      const n = await open(who, page, { theme });
      const got = await pairs(n.t, sels);
      const low = got.filter(([, f, b]) => !f || ratio(f, b) < 4.5).map(([s, f, b]) => [s, f && ratio(f, b).toFixed(2)]);
      check(`E1.${who}.${theme}`, `${who} ${theme}: the new text is 4.5:1 or more`, !low.length, j(low));
      await n.ctx.close();
    }
    const n = await open("emp", "attendance/mark-attendance.html", { theme, now: MONDAY, geo: north(HQ, 2300) });
    await n.t.click("#locate-btn"); await settle(n.t, 500);
    const got = await pairs(n.t, ["#place-status"]);
    check(`E2.${theme}`, `${theme}: the place line (not allowed) is 4.5:1 or more`, got.every(([, f, b]) => f && ratio(f, b) >= 4.5), j(got.map(([s, f, b]) => [s, f && ratio(f, b).toFixed(2)])));
    await n.ctx.close();
  }
}

// ---------- W ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. Shots ---");
  let shots = 0;
  for (const theme of ["light", "dark"]) for (const w of [412, 768, 1280]) for (const who of ["admin", "hr", "fin", "emp", "mgr"]) {
    const n = await open(who, LANDING[who], { width: w, theme });
    await n.t.screenshot({ path: path.join(SHOTS, `dash-${who}-${w}-${theme}.png`), fullPage: true }); shots++;
    await n.ctx.close();
  }
  for (const theme of ["light", "dark"]) for (const w of [412, 1280]) {
    const n = await open("admin", "attendance/mark-attendance.html", { width: w, theme, now: MONDAY, offices: BRANCHES, geo: north(HQ, 2300) });
    await n.t.click("#locate-btn"); await settle(n.t, 500);
    await n.t.screenshot({ path: path.join(SHOTS, `mark-${w}-${theme}.png`), fullPage: true }); shots++;
    await n.ctx.close();
    const b = await open("admin", "dashboard/admin.html", { width: w, theme });
    await navTo(b.t, "/pages/requests/approvals-inbox.html"); await settle(b.t, 300);
    if (w === 412) { await b.t.click(".topbar__menu-toggle").catch(() => {}); await settle(b.t, 200); await b.t.keyboard.press("Escape"); }
    await b.t.click(BELL); await settle(b.t, 300);
    await b.t.screenshot({ path: path.join(SHOTS, `bell-${w}-${theme}.png`) }); shots++;
    await b.ctx.close();
    const g = await open("admin", "gallery", { width: w, theme });
    await g.t.selectOption(".ds-date-range select", "lastMonth"); await settle(g.t, 150);
    await g.t.locator(".ds-date-range").first().screenshot({ path: path.join(SHOTS, `daterange-${w}-${theme}.png`) }); shots++;
    await g.ctx.close();
  }
  for (const theme of ["light", "dark"]) {
    const n = await open("hr", "dashboard/hr.html", { theme, now: "2028-06-15T10:00:00+05:30" });
    await n.t.screenshot({ path: path.join(SHOTS, `hr-empty-${theme}.png`), fullPage: true }); shots++;
    await n.ctx.close();
  }
  check("W1", "shots taken", shots === 30 + 12 + 2, shots);
}

// ---------- X ----------
if (ONLY.includes("X")) {
  console.log("\n--- X. Errors ---");
  check("X1", "no page or console errors", !errs.length, errs.slice(0, 5).join(" | "));
}

await browser.close();
console.log(`\nf1: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);