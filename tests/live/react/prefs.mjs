// A1's harness (msedge, headless): the one appearance store (app/src/data/prefs.js), the header's Appearance menu, the
// Appearance page and Settings > Appearance. Read by meaning (attributes, aria, measured sizes, computed colours).
// usage: node prefs.mjs <app dist> <repo root> <shots dir>   [ONLY=SXUMDARBFLKPCWE]
// Fixed clock Mon 28 Sep 2026 10:00 IST, fresh storage each.
//   S  the header menu and Settings > Appearance show each other's change at once
//   X  two pages in one browser: a change in one shows in the other (the storage event)
//   U  per person: Admin and HR each keep their own; the old theme / accent keys are still written
//   M  Match the device follows an emulated colour-scheme change live
//   D  density and text size change measured sizes (rows, buttons, text), and back
//   A  an accent changes the primary colour (header, buttons); the charts' series colours don't change
//   R  Reset to default: every choice back, no attribute left, the button off, the words
//   B  sidebar default: Collapsed at 1440, Expanded at 1024, Remember = S1's last toggle
//   F  no flash: with the app's js blocked, <html> already carries the stored choices
//   L  storage blocked: writes refused -> applied for this visit, said so; everything refused -> the page still opens
//   K  keyboard and names: radio groups named, arrow keys choose, Tab order, the menu's link to the page
//   P  412: the page usable (no sideways scroll); compact + large text on wide pages at 412 / 1280 / 1024
//   C  the panel's text pairs at AA for every accent x theme
//   W  shots: the page at 1280 / 412, light / dark
//   E  no page errors
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, , SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "SXUMDARBFLKPCWE";
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srvN = spawn("python", [path.join(HERE, "spa-serve.py"), "9972", DIST], { stdio: "ignore" });
const stop = () => { try { srvN.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9972";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const size = (w) => (w === 412 ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA } : { viewport: { width: w, height: 900 } });
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(16)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 700)}` : ""}`); };
const j = JSON.stringify;
const errs = [];
const PAGE = "account/appearance.html";

async function context({ width = 1280, scheme = "light", block = null } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata", colorScheme: scheme });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date("2026-09-28T10:00:00+05:30"));
  if (block) await ctx.addInitScript((mode) => {
    const deny = () => { throw new DOMException("blocked", "SecurityError"); };
    Storage.prototype.setItem = deny;
    if (mode === "all") { Storage.prototype.getItem = deny; Storage.prototype.removeItem = deny; }
  }, block);
  return ctx;
}
async function seed(ctx, who, store = {}) {
  await ctx.addInitScript(([w, st]) => {   // once per browser (a second tab mustn't clear the first one's storage)
    try { if (localStorage.getItem("x-seeded")) return; } catch { return; }
    try { localStorage.clear(); localStorage.setItem("x-seeded", "1"); if (w) localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
      for (const [k, v] of Object.entries(st)) localStorage.setItem(k, JSON.stringify(v)); } catch {}
  }, [who ? WHO[who] : null, store]);
}
async function page(ctx, url, { js = true } = {}) {
  const t = await ctx.newPage();
  t.on("pageerror", (e) => errs.push(`${url}: ${e.message}`));
  await t.goto(N + "/pages/" + url); await t.waitForLoadState("load");
  if (js) { await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(400); }
  return t;
}
async function open(who, url, opts = {}) { const ctx = await context(opts); await seed(ctx, who, opts.store ?? {}); return { ctx, t: await page(ctx, url) }; }
const settle = (t, ms = 300) => t.waitForTimeout(ms);
const attrs = (t) => t.evaluate(() => { const d = document.documentElement; return { theme: d.dataset.theme ?? null, accent: d.dataset.accent ?? null, density: d.dataset.density ?? null, text: d.dataset.text ?? null, motion: d.dataset.motion ?? null, wide: d.hasAttribute("data-nav-wide") }; });
const chosen = (t, scope = "") => t.evaluate((scope) => Object.fromEntries([...document.querySelectorAll(`${scope} [data-appearance-panel] [role=radiogroup]`)].map((g) => [g.getAttribute("aria-label") ?? document.getElementById(g.getAttribute("aria-labelledby"))?.textContent, g.querySelector("[aria-checked=true]")?.textContent.trim()])), scope);
const pick = async (t, group, label, scope = "") => { await t.click(`${scope} [data-appearance-panel] [role=radiogroup]:is([aria-label="${group}"], [aria-labelledby$="${group === "Accent colour" ? "accent-label" : "x"}"]) >> role=radio[name="${label}"]`); await settle(t, 200); };
const openMenu = async (t) => { await t.click('.topbar__actions button[aria-label="Appearance"]'); await settle(t, 200); };
const menuState = (t) => t.evaluate(() => ({ theme: document.querySelector('.theme-menu [data-theme-choice][aria-pressed="true"]')?.dataset.themeChoice, accent: document.querySelector('.theme-menu [data-accent-choice][aria-pressed="true"]')?.dataset.accentChoice }));
const stored = (t, k) => t.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return "blocked"; } }, k);

// ---------- S ----------
if (ONLY.includes("S")) {
  console.log("\n--- S. Header menu <-> Settings ---");
  const n = await open("admin", "system/settings.html");
  await openMenu(n.t); await n.t.click('.theme-menu [data-theme-choice="dark"]'); await settle(n.t);
  let a = await attrs(n.t), c = await chosen(n.t, "#appearance");
  check("S1", "the menu's Dark: the page turns dark and Settings > Appearance shows Dark at once", a.theme === "dark" && c.Theme === "Dark", j([a, c]));
  await n.t.keyboard.press("Escape");
  await pick(n.t, "Accent colour", "Teal", "#appearance");
  await openMenu(n.t);
  const m = await menuState(n.t);
  a = await attrs(n.t);
  check("S2", "Settings' Teal: the page's accent is teal and the menu marks Teal", a.accent === "teal" && m.accent === "teal" && m.theme === "dark", j([a, m]));
  await n.t.keyboard.press("Escape");
  await pick(n.t, "Density", "Compact", "#appearance");
  const saved = await n.t.evaluate(() => document.querySelector("#appearance .ap-saved")?.textContent);
  check("S3", "a choice applies at once and says \"Saved\" (no Save button)", (await attrs(n.t)).density === "compact" && saved === "Saved" && (await n.t.locator("#save-appearance").count()) === 0, saved);
  await n.ctx.close();
}

// ---------- X ----------
if (ONLY.includes("X")) {
  console.log("\n--- X. Two tabs ---");
  const ctx = await context(); await seed(ctx, "admin");
  const a = await page(ctx, PAGE), b = await page(ctx, "dashboard/admin.html");
  await pick(a, "Theme", "Dark"); await pick(a, "Text size", "Large"); await settle(b, 400);
  const s = await attrs(b);
  check("X1", "a change on the Appearance page shows in the other open tab (dark, large text)", s.theme === "dark" && s.text === "large", j(s));
  await openMenu(b); await b.click('.theme-menu [data-accent-choice="pink"]'); await settle(a, 400);
  const c = await chosen(a);
  check("X2", "and back: the other tab's header menu picks Pink, the Appearance page marks it", c["Accent colour"] === "Pink" && (await attrs(a)).accent === "pink", j(c));
  await ctx.close();
}

// ---------- U ----------
if (ONLY.includes("U")) {
  console.log("\n--- U. Per person ---");
  const ctx = await context(); await seed(ctx, "hr");
  const t = await page(ctx, PAGE);
  await pick(t, "Text size", "Small");
  const signAs = async (who) => { await t.evaluate((w) => localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 })), WHO[who]); await t.reload(); await t.waitForLoadState("load"); await settle(t, 400); };
  await signAs("admin");
  await pick(t, "Theme", "Dark"); await pick(t, "Density", "Compact");
  const admin = await attrs(t);
  await signAs("hr");
  const hr = await attrs(t);
  await signAs("admin");
  const back = await attrs(t);
  const keys = await t.evaluate(() => [JSON.parse(localStorage.getItem("officeos:prefs:EMP-1001")), JSON.parse(localStorage.getItem("officeos:prefs:EMP-1003")), localStorage.getItem("officeos:theme")]);
  check("U1", "HR keeps small text, light, comfortable; Admin keeps dark + compact; switching back and forth each sees their own",
    hr.text === "small" && hr.density === null && hr.theme === "light" && admin.theme === "dark" && admin.density === "compact" && admin.text === null && j(back) === j(admin), j([hr, admin, back]));
  check("U2", "saved per person (officeos:prefs:<id>); the old theme key is still written", keys[0]?.theme === "dark" && keys[1]?.text === "small" && keys[2] === "\"dark\"", j(keys));
  await ctx.close();
}

// ---------- M ----------
if (ONLY.includes("M")) {
  console.log("\n--- M. Match the device ---");
  const n = await open("admin", PAGE, { scheme: "dark" });
  await pick(n.t, "Theme", "Match the device");
  const a = (await attrs(n.t)).theme;
  await n.t.emulateMedia({ colorScheme: "light" }); await settle(n.t);
  const b = (await attrs(n.t)).theme;
  await n.t.emulateMedia({ colorScheme: "dark" }); await settle(n.t);
  const c = (await attrs(n.t)).theme;
  check("M1", "Match the device: dark on a dark device, light the moment the device turns light, dark again", a === "dark" && b === "light" && c === "dark", j([a, b, c]));
  await n.ctx.close();
}

// ---------- D ----------
if (ONLY.includes("D")) {
  console.log("\n--- D. Density and text size ---");
  const measure = (t) => t.evaluate(() => { const td = document.querySelector("main .table tbody td"), btn = document.querySelector("main .btn, main .ds-btn"), h1 = document.querySelector("main h1");
    return { row: Math.round(td.closest("tr").getBoundingClientRect().height), cellPad: parseFloat(getComputedStyle(td).paddingTop), text: parseFloat(getComputedStyle(td).fontSize), btn: Math.round(btn.getBoundingClientRect().height), h1: parseFloat(getComputedStyle(h1).fontSize) }; });
  const at = async (store) => { const n = await open("admin", "users/users-list.html", { store }); const m = await measure(n.t); await n.ctx.close(); return m; };
  const base = await at({}), compact = await at({ "officeos:prefs:EMP-1001": { density: "compact" } });
  const small = await at({ "officeos:prefs:EMP-1001": { text: "small" } }), large = await at({ "officeos:prefs:EMP-1001": { text: "large" } });
  check("D1", "compact: shorter rows, less cell padding, smaller buttons; the text size unchanged", compact.row < base.row && compact.cellPad < base.cellPad && compact.btn < base.btn && compact.text === base.text, j([base, compact]));
  check("D2", "text size: small < default < large for the table text and the heading", small.text < base.text && base.text < large.text && small.h1 < base.h1 && base.h1 < large.h1, j([small, base, large]));
  const n = await open("admin", "dashboard/admin.html", { store: { "officeos:prefs:EMP-1001": { text: "large" } } });
  const tick = await n.t.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".recharts-wrapper svg text")).fontSize));
  await n.ctx.close();
  check("D3", "the charts' text follows the text size (large: 13 px axis labels, 12 by default)", tick === 13, tick);
}

// ---------- A ----------
if (ONLY.includes("A")) {
  console.log("\n--- A. Accent ---");
  const read = (t) => t.evaluate(() => ({ primary: getComputedStyle(document.documentElement).getPropertyValue("--primary-base").trim(), bar: getComputedStyle(document.querySelector(".topbar")).backgroundColor,
    chart: getComputedStyle(document.documentElement).getPropertyValue("--ds-chart-1").trim(), button: getComputedStyle(document.querySelector("main .btn--primary, main .ds-btn--primary")).backgroundColor }));
  const n = await open("admin", "dashboard/admin.html");
  const a = await read(n.t);
  await openMenu(n.t); await n.t.click('.theme-menu [data-accent-choice="teal"]'); await settle(n.t);
  const b = await read(n.t);
  check("A1", "Teal: the primary colour, the header and the primary button change; the charts' first series colour doesn't", a.primary !== b.primary && b.primary === "#0f766e" && a.bar !== b.bar && a.button !== b.button && a.chart === b.chart, j([a, b]));
  await n.ctx.close();
}

// ---------- R ----------
if (ONLY.includes("R")) {
  console.log("\n--- R. Reset ---");
  const n = await open("admin", PAGE, { store: { "officeos:prefs:EMP-1001": { theme: "dark", accent: "violet", density: "compact", text: "large", sidebar: "collapsed", motion: "reduce" } } });
  const before = await attrs(n.t);
  await n.t.click("#ap-reset"); await settle(n.t);
  const after = await attrs(n.t), c = await chosen(n.t);
  const s = await n.t.evaluate(() => ({ off: document.getElementById("ap-reset").disabled, say: document.querySelector(".ap-saved").textContent }));
  check("R1", "Reset to default: light, the role's colour, comfortable, default text, remember, follow the device; no attribute left; the button off; \"Back to the default look\"",
    before.density === "compact" && after.theme === "light" && after.accent === null && after.density === null && after.text === null && after.motion === null && after.wide === true
    && j(Object.values(c)) === j(["Light", "My role's colour", "Comfortable", "Default", "Remember my last choice", "Follow the device"]) && s.off && s.say === "Back to the default look", j([after, c, s]));
  await n.ctx.close();
}

// ---------- B ----------
if (ONLY.includes("B")) {
  console.log("\n--- B. Sidebar default ---");
  const width = (t) => t.evaluate(() => Math.round(document.getElementById("sidebar").getBoundingClientRect().width));
  let n = await open("admin", "dashboard/admin.html", { width: 1440, store: { "officeos:prefs:EMP-1001": { sidebar: "collapsed" }, "officeos:sidebar": "expanded" } });
  check("B1", "Collapsed at 1440 (even with an earlier \"expanded\" toggle stored)", (await width(n.t)) === 64);
  await n.ctx.close();
  n = await open("admin", "dashboard/admin.html", { width: 1024, store: { "officeos:prefs:EMP-1001": { sidebar: "expanded" } } });
  check("B2", "Expanded at 1024", (await width(n.t)) === 240);
  await n.ctx.close();
  n = await open("admin", PAGE, { width: 1440 });
  await n.t.click("#sidebar-toggle"); await settle(n.t, 400);
  await n.t.reload(); await settle(n.t, 400);
  const r = await width(n.t);
  await pick(n.t, "Sidebar on a computer", "Expanded"); await settle(n.t, 400);
  const e = await width(n.t);
  check("B3", "Remember (the default): the last toggle holds after a reload (S1); choosing Expanded opens it at once", r === 64 && e === 240, j([r, e]));
  await n.ctx.close();
}

// ---------- F ----------
if (ONLY.includes("F")) {
  console.log("\n--- F. No flash ---");
  const ctx = await context({ width: 1440 }); await seed(ctx, "admin", { "officeos:prefs:EMP-1001": { theme: "dark", accent: "teal", density: "compact", text: "large", sidebar: "collapsed", motion: "reduce" } });
  await ctx.route(/\/assets\/.*\.js$/, (r) => r.abort());
  const t = await ctx.newPage(); await t.goto(N + "/pages/dashboard/admin.html"); await t.waitForLoadState("load");
  const a = await attrs(t), root = await t.evaluate(() => document.getElementById("root").childElementCount);
  check("F1", "before any app js runs, <html> already has every stored choice (dark, teal, compact, large, reduce, collapsed)", root === 0 && j(a) === j({ theme: "dark", accent: "teal", density: "compact", text: "large", motion: "reduce", wide: false }), j(a));
  await ctx.close();
  const c2 = await context({ width: 1440 }); await seed(c2, "hr", { "officeos:theme": "dark", "officeos:accent": "pink" });
  await c2.route(/\/assets\/.*\.js$/, (r) => r.abort());
  const t2 = await c2.newPage(); await t2.goto(N + "/pages/dashboard/hr.html"); await t2.waitForLoadState("load");
  const b = await attrs(t2);
  check("F2", "someone with only the old theme / accent keys keeps them (nothing regresses)", b.theme === "dark" && b.accent === "pink", j(b));
  await c2.close();
}

// ---------- L ----------
if (ONLY.includes("L")) {
  console.log("\n--- L. Storage blocked ---");
  let ctx = await context({ block: "writes" }); await seed(ctx, null);
  // the session can't be written either: seed it before blocking by reading a real value through a getItem shim
  await ctx.addInitScript((w) => { const real = Storage.prototype.getItem; Storage.prototype.getItem = function (k) { return k === "officeos:session" ? JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }) : real.call(this, k); }; }, WHO.admin);
  let t = await page(ctx, PAGE);
  await pick(t, "Theme", "Dark");
  const a = await attrs(t), say = await t.evaluate(() => document.querySelector(".ap-saved").textContent);
  check("L1", "writes refused: Dark still applies and the page says it's for this visit only", a.theme === "dark" && say.startsWith("Applied for this visit only"), j([a, say]));
  await ctx.close();
  ctx = await context({ block: "all" }); t = await page(ctx, "auth/login.html");
  const ok = await t.evaluate(() => Boolean(document.querySelector("form, main")));
  check("L2", "all storage refused: the sign-in page still opens (defaults), no page error", ok && !errs.some((e) => e.startsWith("auth/login")), j(errs.slice(-2)));
  await ctx.close();
}

// ---------- K ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard and names ---");
  const n = await open("admin", PAGE);
  const names = await n.t.evaluate(() => [...document.querySelectorAll("[data-appearance-panel] [role=radiogroup]")].map((g) => g.getAttribute("aria-label") ?? document.getElementById(g.getAttribute("aria-labelledby"))?.textContent));
  check("K1", "six named radio groups", j(names) === j(["Theme", "Accent colour", "Density", "Text size", "Sidebar on a computer", "Motion"]), j(names));
  await n.t.focus('[data-appearance-panel] [role=radiogroup][aria-label="Theme"] [aria-checked=true]');
  await n.t.keyboard.press("ArrowRight"); await settle(n.t);
  const t1 = (await attrs(n.t)).theme;
  await n.t.keyboard.press("Tab");
  const onAccent = await n.t.evaluate(() => document.activeElement.closest("[role=radiogroup]")?.getAttribute("aria-labelledby"));
  await n.t.keyboard.press("ArrowRight"); await settle(n.t);
  const a1 = (await attrs(n.t)).accent;
  await n.t.keyboard.press("Tab");
  const onDensity = await n.t.evaluate(() => document.activeElement.closest("[role=radiogroup]")?.getAttribute("aria-label"));
  check("K2", "arrow keys choose (Dark, then Indigo); one Tab stop per group, in order", t1 === "dark" && onAccent === "ap-accent-label" && a1 === "indigo" && onDensity === "Density", j([t1, onAccent, a1, onDensity]));
  await n.t.focus("#ap-reset"); await n.t.keyboard.press("Enter"); await settle(n.t);
  check("K3", "Reset works from the keyboard", (await attrs(n.t)).theme === "light");
  await openMenu(n.t);
  const link = await n.t.evaluate(() => { const a = document.getElementById("appearance-more"); return [a?.textContent, a?.getAttribute("href")]; });
  check("K4", "the header menu links to the page (\"All appearance settings\")", j(link) === j(["All appearance settings", "/pages/account/appearance.html"]), j(link));
  await n.ctx.close();
  for (const who of ["hr", "fin", "emp"]) {
    const m = await open(who, PAGE);
    const h = await m.t.evaluate(() => [location.pathname, document.querySelector("main h1")?.textContent, document.querySelectorAll("[data-appearance-panel] [role=radiogroup]").length]);
    check(`K5.${who}`, `${who} opens the Appearance page with every choice`, h[0] === "/pages/account/appearance.html" && h[1] === "Appearance" && h[2] === 6, j(h));
    await m.ctx.close();
  }
}

// ---------- P ----------
if (ONLY.includes("P")) {
  console.log("\n--- P. Phones and combinations ---");
  let n = await open("emp", PAGE, { width: 412 });
  const p = await n.t.evaluate(() => [document.documentElement.scrollWidth, innerWidth, [...document.querySelectorAll("[data-appearance-panel] [role=radio], #ap-reset")].every((b) => { const r = b.getBoundingClientRect(); return r.right <= innerWidth && r.height >= 32; })]);
  check("P1", "412: no sideways scroll; every choice inside the screen and at least 32 px tall", p[0] <= p[1] && p[2], j(p));
  await n.ctx.close();
  const bad = [];
  for (const w of [412, 1024, 1280]) for (const pg of ["dashboard/admin.html", "users/users-list.html", "users/user-form.html", "attendance/team-attendance.html", "system/settings.html"]) {
    n = await open("admin", pg, { width: w, store: { "officeos:prefs:EMP-1001": { density: "compact", text: "large", sidebar: "expanded" } } });
    const o = await n.t.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    if (o[0] > o[1]) bad.push([w, pg, o]);
    await n.ctx.close();
  }
  check("P2", "compact + large text + expanded sidebar: no sideways scroll on 5 pages at 412 / 1024 / 1280", bad.length === 0, j(bad));
}

// ---------- C ----------
if (ONLY.includes("C")) {
  console.log("\n--- C. Contrast of the panel ---");
  const lows = [];
  for (const theme of ["light", "dark"]) for (const accent of ["", "indigo", "blue", "teal", "violet", "slate", "pink"]) {
    const n = await open("admin", PAGE, { store: { "officeos:prefs:EMP-1001": { theme, accent } } });
    await n.t.click("[data-appearance-panel] [role=radiogroup][aria-label=Density] >> role=radio[name=Compact]"); await settle(n.t, 150);
    const r = await n.t.evaluate(() => {
      const rgb = (s) => { const v = (s.match(/[\d.]+/g) ?? []).map(Number); return s.startsWith("color(srgb") ? v.map((x, i) => (i < 3 ? x * 255 : x)) : v; };
      const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const bgOf = (e) => { for (let x = e; x; x = x.parentElement) { const c = rgb(getComputedStyle(x).backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] > 0.5)) return c.slice(0, 3); } return [255, 255, 255]; };
      const ratio = (e) => { const [a, b] = [lum(rgb(getComputedStyle(e).color).slice(0, 3)), lum(bgOf(e))].sort((x, y) => y - x); return Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100; };
      const q = (s) => document.querySelector(s);
      return { label: ratio(q(".ap-row__label")), help: ratio(q(".ap-row__help")), swatch: ratio(q(".ap-swatch")), chosen: ratio(q(".ds-segmented__option[aria-checked=true]")), option: ratio(q(".ds-segmented__option[aria-checked=false]")),
        saved: ratio(q(".ap-saved")), reset: ratio(q("#ap-reset")), heading: ratio(q("main h1")) };
    });
    for (const [k, v] of Object.entries(r)) if (v < 4.5) lows.push([theme, accent || "role", k, v]);
    await n.ctx.close();
  }
  check("C1", "the panel's text at 4.5:1 or more, 2 themes x 7 accent settings (8 pairs each)", lows.length === 0, j(lows));
}

// ---------- W ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. Shots ---");
  for (const w of [1280, 412]) for (const theme of ["light", "dark"]) {
    const n = await open("admin", PAGE, { width: w, store: { "officeos:prefs:EMP-1001": { theme } } });
    await n.t.screenshot({ path: path.join(SHOTS, `appearance-${w}-${theme}.png`), fullPage: true });
    await n.ctx.close();
  }
  check("W1", "shots written", fs.readdirSync(SHOTS).filter((f) => f.startsWith("appearance-")).length >= 4);
}

if (ONLY.includes("E")) check("E1", "no page errors", errs.length === 0, j(errs.slice(0, 5)));
await browser.close();
console.log(`\nprefs: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
