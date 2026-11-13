// S1's harness (msedge, headless): the collapsible desktop sidebar. Read by meaning (attributes, labels, sizes, focus,
// computed colours), never by pixels. usage: node side.mjs <app dist> <repo root> <shots dir>   [ONLY=DTARKLCWE]
// Fixed clock Mon 28 Sep 2026 10:00 IST, fresh storage each.
//   D  defaults with no choice: 1440 and 1280 expanded, 1279 and 1024 collapsed; 412 keeps the drawer (no toggle) even with
//      "expanded" stored
//   T  the toggle: label and aria-expanded, collapses and expands, focus stays, the choice stored and applied after a reload;
//      the head script marks <html> before any of the app's js runs (no flash); with no choice the width follows the window
//   A  collapsed: every item has a name, its label as a chip on hover AND keyboard focus, the active item marked, group
//      headings hidden, the brand only its mark (its name kept for screen readers), the count on the icon; expanded: every
//      item's icon and label, the headings, the brand's name, the avatar and name, the count pill, aria-current
//   R  every role (admin, hr, fin, emp, a manager): expanded shows every item the role's nav has, the same ones as collapsed
//   K  keyboard: Tab order brand, toggle, the first item; Enter and Space toggle with focus kept
//   L  layout: no sideways scroll at 1440 / 1280 / 1024 in both states on wide pages; a chart and a table re-measure when
//      toggled; the width moves smoothly (0.2 s) and not at all with reduced motion
//   C  contrast of the new pairs on the sidebar (labels, headings, the person's lines, the toggle, the count)
//   W  shots: 1440 / 1280 / 1024 both states, light and dark; 412 with the drawer open
//   E  no page or console errors
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, , SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "DTARKLCWE";
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srvN = spawn("python", [path.join(HERE, "spa-serve.py"), "9974", DIST], { stdio: "ignore" });
const stop = () => { try { srvN.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9974";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const size = (w) => (w === 412 ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA } : { viewport: { width: w, height: 900 } });
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(16)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 700)}` : ""}`); };
const j = JSON.stringify;
const errs = [];
const PAGE = "dashboard/admin.html";

async function open(who, page, { width = 1280, theme = "light", side = null, motion = "no-preference", blockJs = false } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata", reducedMotion: motion });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date("2026-09-28T10:00:00+05:30"));
  await ctx.addInitScript(([w, th, sd]) => {
    if (sessionStorage.getItem("u-set")) return;
    sessionStorage.setItem("u-set", "1"); localStorage.clear();
    localStorage.setItem("officeos:theme", JSON.stringify(th));
    localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
    if (sd) localStorage.setItem("officeos:sidebar", JSON.stringify(sd));
  }, [WHO[who], theme, side]);
  if (blockJs) await ctx.route(/\/assets\/.*\.js$/, (r) => r.abort());
  const t = await ctx.newPage();
  if (!blockJs) {
    t.on("pageerror", (e) => errs.push(`${who} ${page}: ${e.message}`));
    t.on("console", (m) => { if (m.type() === "error") errs.push(`${who} ${page}: console ${m.text()}`); });
  }
  await t.goto(N + "/pages/" + page); await t.waitForLoadState("load");
  if (!blockJs) { await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(400); }
  return { ctx, t };
}
const settle = (t, ms = 350) => t.waitForTimeout(ms);
const state = (t) => t.evaluate(() => {
  const b = document.getElementById("sidebar-toggle"), s = document.getElementById("sidebar");
  return { wide: document.documentElement.hasAttribute("data-nav-wide"), width: Math.round(s.getBoundingClientRect().width),
    label: b?.getAttribute("aria-label") ?? null, expanded: b?.getAttribute("aria-expanded") ?? null, shown: b ? getComputedStyle(b).display !== "none" : false,
    stored: JSON.parse(localStorage.getItem("officeos:sidebar") ?? "null"), focus: document.activeElement?.id || document.activeElement?.className || null };
});
const vis = (t, sel) => t.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== "hidden"; }), sel);

// ---------- D ----------
if (ONLY.includes("D")) {
  console.log("\n--- D. Defaults (no choice stored) ---");
  for (const [w, wide] of [[1440, true], [1280, true], [1279, false], [1024, false]]) {
    const n = await open("admin", PAGE, { width: w });
    const s = await state(n.t);
    check(`D1.${w}`, `${w}: ${wide ? "expanded (240 px), \"Collapse sidebar\", aria-expanded true" : "collapsed (64 px), \"Expand sidebar\", aria-expanded false"}`,
      s.wide === wide && s.width === (wide ? 240 : 64) && s.label === (wide ? "Collapse sidebar" : "Expand sidebar") && s.expanded === String(wide) && s.shown && s.stored === null, j(s));
    await n.ctx.close();
  }
  for (const side of [null, "expanded"]) {
    const n = await open("admin", PAGE, { width: 412, side });
    const s = await state(n.t);
    await n.t.click(".topbar__menu-toggle"); await settle(n.t);
    const drawer = await n.t.evaluate(() => { const s = document.getElementById("sidebar"); return { open: s.classList.contains("is-open"), width: Math.round(s.getBoundingClientRect().width),
      labels: [...s.querySelectorAll(".nav__trigger-label")].filter((l) => l.getBoundingClientRect().width > 0).length }; });
    check(`D2.${side ?? "none"}`, `412${side ? " with \"expanded\" stored" : ""}: no toggle; the drawer opens as before (its section labels shown)`, !s.shown && drawer.open && drawer.labels > 3 && drawer.width > 300, j([s, drawer]));
    await n.ctx.close();
  }
}

// ---------- T ----------
if (ONLY.includes("T")) {
  console.log("\n--- T. The toggle and the choice ---");
  let n = await open("admin", PAGE, { width: 1280 });
  await n.t.click("#sidebar-toggle"); await settle(n.t);
  let s = await state(n.t);
  check("T1", "1280: the toggle collapses it (64 px), says \"Expand sidebar\", aria-expanded false; stored \"collapsed\"; focus on the toggle",
    !s.wide && s.width === 64 && s.label === "Expand sidebar" && s.expanded === "false" && s.stored === "collapsed" && s.focus === "sidebar-toggle", j(s));
  await n.t.reload(); await n.t.waitForLoadState("load"); await settle(n.t, 400);
  s = await state(n.t);
  check("T2", "after a reload: still collapsed", !s.wide && s.width === 64 && s.stored === "collapsed", j(s));
  await n.t.click("#sidebar-toggle"); await settle(n.t);
  s = await state(n.t);
  check("T3", "the toggle expands it again; stored \"expanded\"", s.wide && s.width === 240 && s.label === "Collapse sidebar" && s.stored === "expanded", j(s));
  await n.ctx.close();
  n = await open("admin", PAGE, { width: 1024, side: "expanded" });
  s = await state(n.t);
  check("T4", "1024 with \"expanded\" chosen: expanded (the choice wins over the width)", s.wide && s.width === 240, j(s));
  await n.ctx.close();
  n = await open("admin", PAGE, { width: 1440, side: "collapsed" });
  s = await state(n.t);
  check("T5", "1440 with \"collapsed\" chosen: collapsed", !s.wide && s.width === 64, j(s));
  await n.ctx.close();
  for (const [w, side, wide] of [[1440, null, true], [1440, "collapsed", false], [1024, null, false], [1024, "expanded", true]]) {
    n = await open("admin", PAGE, { width: w, side, blockJs: true });
    const before = await n.t.evaluate(() => ({ wide: document.documentElement.hasAttribute("data-nav-wide"), app: typeof window.__vite_plugin_react_preamble_installed__, root: document.getElementById("root").childElementCount,
      width: getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width").trim() }));
    check(`T6.${w}.${side ?? "none"}`, `before any app js runs (${w}, ${side ?? "no choice"}): <html> is already ${wide ? "expanded" : "collapsed"} (no flash)`, before.wide === wide && before.root === 0, j(before));
    await n.ctx.close();
  }
  n = await open("admin", PAGE, { width: 1440 });
  await n.t.setViewportSize({ width: 1100, height: 900 }); await settle(n.t);
  const narrow = await state(n.t);
  await n.t.setViewportSize({ width: 1300, height: 900 }); await settle(n.t);
  const wider = await state(n.t);
  check("T7", "no choice: the width follows the window (1100 collapsed, 1300 expanded), nothing stored", !narrow.wide && narrow.width === 64 && wider.wide && wider.width === 240 && wider.stored === null, j([narrow, wider]));
  await n.t.click("#sidebar-toggle"); await settle(n.t); await n.t.click("#sidebar-toggle"); await settle(n.t);
  await n.t.setViewportSize({ width: 1100, height: 900 }); await settle(n.t);
  s = await state(n.t);
  check("T8", "once expanded by the person, it stays expanded at 1100", s.wide && s.width === 240 && s.stored === "expanded", j(s));
  await n.ctx.close();
}

// ---------- A ----------
if (ONLY.includes("A")) {
  console.log("\n--- A. Collapsed and expanded, item by item ---");
  let n = await open("admin", PAGE, { width: 1280, side: "collapsed" });
  const names = await n.t.evaluate(() => [...document.querySelectorAll("#sidebar__nav .nav__trigger, #sidebar__nav .nav__section--single a, #sidebar-toggle, .sidebar__brand")]
    .map((e) => (e.getAttribute("aria-label") || e.textContent || "").replace(/\s+/g, " ").trim()));
  check("A1", "collapsed: every rail button and link has a name (the brand: the company's name)", names.length > 8 && names.every(Boolean) && names[0].endsWith("Northwind Technologies Pvt. Ltd."), j(names));
  const chip = (sel) => n.t.evaluate((sel) => getComputedStyle(document.querySelector(sel), "::before").content, sel);
  await n.t.hover("#sidebar__nav .nav__trigger >> nth=0"); await settle(n.t, 80);
  const hoverChip = await chip("#sidebar__nav .nav__trigger");
  await n.t.mouse.move(900, 600); await settle(n.t, 400);
  await n.t.evaluate(() => document.activeElement?.blur());
  await n.t.focus("#sidebar-toggle"); await n.t.keyboard.press("Tab");
  const focused = await n.t.evaluate(() => document.activeElement?.getAttribute("data-label"));
  const focusChip = await n.t.evaluate(() => getComputedStyle(document.activeElement, "::before").content);
  const toggleChip = await (async () => { await n.t.hover("#sidebar-toggle"); await settle(n.t, 80); return chip("#sidebar-toggle"); })();
  check("A2", "collapsed: the label shows as a chip on hover (\"Attendance\"), on keyboard focus (the first item), and on the toggle", hoverChip !== "none" && hoverChip.length > 2 && focused && focusChip === `"${focused}"` && toggleChip === "\"Expand sidebar\"", j([hoverChip, focused, focusChip, toggleChip]));
  const marks = await n.t.evaluate(() => { const a = document.querySelector("#sidebar__nav .nav__item.is-active"), o = [...document.querySelectorAll("#sidebar__nav .nav__section--single .nav__item:not(.is-active)")][0];
    return { current: a?.getAttribute("aria-current"), activeBg: getComputedStyle(a).backgroundColor, otherBg: getComputedStyle(o).backgroundColor }; });
  check("A3", "collapsed: the active item is marked (aria-current, its own background)", marks.current === "page" && marks.activeBg !== marks.otherBg && marks.activeBg !== "rgba(0, 0, 0, 0)", j(marks));
  const headings = await vis(n.t, "#sidebar__nav .nav__group-title");
  const brand = await n.t.evaluate(() => ({ name: Math.round(document.querySelector(".sidebar__brand-name").getBoundingClientRect().width), mark: Math.round(document.querySelector(".sidebar__brand .brand-mark").getBoundingClientRect().width) }));
  const count = await n.t.evaluate(() => { const c = document.querySelector("[data-count-waiting] .nav__count"), i = c?.closest("a").getBoundingClientRect(), r = c?.getBoundingClientRect();
    return c ? { text: c.textContent, w: Math.round(r.width), inside: r.left >= i.left - 1 && r.right <= i.right + 1 && r.top >= i.top - 1 } : null; });
  const profile = await vis(n.t, ".nav__profile");
  const avatar = await vis(n.t, ".topbar .avatar, .topbar [aria-haspopup] .avatar, .topbar__avatar");
  check("A4", "collapsed: no group headings; the brand is its mark only; the count is a small number on the icon; the person's avatar stays in the header",
    headings.every((v) => !v) && brand.name <= 1 && brand.mark >= 28 && count && Number(count.text) > 0 && count.w <= 24 && count.inside && profile.every((v) => !v) && avatar.some(Boolean), j([brand, count, profile, avatar]));
  await n.ctx.close();
  n = await open("admin", PAGE, { width: 1280 });
  const ex = await n.t.evaluate(() => {
    const shown = (e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
    const items = [...document.querySelectorAll("#sidebar__nav a.nav__item")];
    return { items: items.length, labelled: items.filter((a) => shown(a) && a.innerText.trim() && a.getBoundingClientRect().width > 150 && shown(a.querySelector("svg"))).length,
      headings: [...document.querySelectorAll("#sidebar__nav .nav__section:not(.nav__section--single) .nav__group-title")].filter(shown).map((h) => h.textContent),
      triggers: [...document.querySelectorAll("#sidebar__nav .nav__trigger")].filter(shown).length,
      brand: Math.round(document.querySelector(".sidebar__brand-name").getBoundingClientRect().width), person: document.querySelector(".nav__profile")?.innerText.replace(/\s+/g, " ").trim(),
      avatar: shown(document.querySelector(".nav__profile-avatar")), count: document.querySelector("[data-count-waiting] .nav__count")?.textContent,
      active: document.querySelector("#sidebar__nav [aria-current=page]")?.innerText.trim() };
  });
  check("A5", "expanded: every item shows its icon and label; the group headings; no section buttons; the brand's name; the avatar and name; the count; Dashboard current",
    ex.items > 20 && ex.labelled === ex.items && ex.headings.length >= 4 && ex.triggers === 0 && ex.brand > 60 && ex.person === "AM Aarav Mehta Administrator" && ex.avatar && Number(ex.count) > 0 && ex.active === "Dashboard", j(ex));
  await n.ctx.close();
}

// ---------- R ----------
if (ONLY.includes("R")) {
  console.log("\n--- R. Every role's items ---");
  for (const who of Object.keys(WHO)) {
    const links = async (side) => { const n = await open(who, PAGE.replace("admin", who === "admin" ? "admin" : who === "fin" ? "finance" : who === "hr" ? "hr" : "employee"), { width: 1280, side });
      const r = await n.t.evaluate(() => [...document.querySelectorAll("#sidebar__nav a")].map((a) => [a.getAttribute("href"), a.innerText.trim(), (() => { const b = a.getBoundingClientRect(); return b.width > 150 && b.height > 20; })()]));
      await n.ctx.close(); return r; };
    const [wide, rail] = [await links("expanded"), await links("collapsed")];
    check(`R1.${who}`, `${who}: expanded shows every item of the role's nav, labelled (${wide.length}), the same links as collapsed`,
      wide.length > 5 && wide.every((x) => x[1] && x[2]) && j(wide.map((x) => x[0])) === j(rail.map((x) => x[0])), j(wide.filter((x) => !x[2]).concat([[wide.length, rail.length]])));
  }
}

// ---------- K ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard ---");
  for (const side of ["expanded", "collapsed"]) {
    const n = await open("admin", PAGE, { width: 1280, side });
    await n.t.evaluate(() => document.querySelector(".sidebar__brand").focus());
    const order = [await n.t.evaluate(() => document.activeElement.className)];
    for (let i = 0; i < 2; i++) { await n.t.keyboard.press("Tab"); order.push(await n.t.evaluate(() => document.activeElement.id || document.activeElement.getAttribute("aria-label") || document.activeElement.innerText.trim())); }
    check(`K1.${side}`, `${side}: Tab goes brand, the toggle, then the first item (Dashboard)`, order[0].includes("sidebar__brand") && order[1] === "sidebar-toggle" && order[2] === "Dashboard", j(order));
    await n.t.focus("#sidebar-toggle"); await n.t.keyboard.press("Enter"); await settle(n.t);
    const a = await state(n.t);
    await n.t.keyboard.press("Space"); await settle(n.t);
    const b = await state(n.t);
    check(`K2.${side}`, `${side}: Enter toggles, Space toggles back, focus stays on the toggle`, a.wide === (side === "collapsed") && b.wide === (side === "expanded") && a.focus === "sidebar-toggle" && b.focus === "sidebar-toggle", j([a, b]));
    await n.ctx.close();
  }
}

// ---------- L ----------
if (ONLY.includes("L")) {
  console.log("\n--- L. Layout ---");
  const PAGES = ["dashboard/admin.html", "attendance/team-attendance.html", "users/users-list.html", "payroll/payroll-run.html", "system/reports.html", "system/audit-log.html", "inventory/items.html", "requests/approvals-inbox.html"];
  for (const w of [1440, 1280, 1024]) for (const side of ["expanded", "collapsed"]) {
    const bad = [];
    for (const p of PAGES) {
      const n = await open("admin", p, { width: w, side });
      const o = await n.t.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      if (o[0] > o[1]) bad.push([p, o]);
      await n.ctx.close();
    }
    check(`L1.${w}.${side}`, `${w}, ${side}: no sideways scroll on ${PAGES.length} wide pages`, bad.length === 0, j(bad));
  }
  const n = await open("admin", PAGE, { width: 1280 });
  const measure = () => n.t.evaluate(() => { const svg = document.querySelector("main .recharts-surface"), card = svg?.closest(".ds-card, .card, section");
    const tb = [...document.querySelectorAll("main table:not(.ds-chart__table)")].filter((x) => x.getBoundingClientRect().width > 0).at(-1), tw = tb.parentElement;
    return { chart: Math.round(svg.getBoundingClientRect().width), card: Math.round(card.getBoundingClientRect().width), table: Math.round(tb.getBoundingClientRect().width), wrap: Math.round(tw.getBoundingClientRect().width), main: Math.round(document.getElementById("main").getBoundingClientRect().width) }; });
  const a = await measure();
  await n.t.click("#sidebar-toggle"); await settle(n.t, 700);
  const b = await measure();
  check("L2", "toggled at 1280: main grows by 176 px; the chart and the table re-measure to fit (wider, inside their cards)",
    b.main - a.main === 176 && b.chart > a.chart + 50 && b.chart <= b.card && b.table > a.table + 50 && b.table <= b.wrap + 1, j([a, b]));
  const tr = await n.t.evaluate(() => [getComputedStyle(document.querySelector(".app")).transitionProperty, getComputedStyle(document.querySelector(".app")).transitionDuration]);
  await n.ctx.close();
  const m = await open("admin", PAGE, { width: 1280, motion: "reduce" });
  const tm = await m.t.evaluate(() => getComputedStyle(document.querySelector(".app")).transitionDuration);
  await m.ctx.close();
  check("L3", "the width moves in 0.2 s; with reduced motion it doesn't animate", tr[0].includes("grid-template-columns") && tr[1].split(",").includes("0.2s") && tm.split(",").every((d) => parseFloat(d) < 0.01), j([tr, tm]));   // the app's reduced-motion rule makes every duration 0.01 ms
}

// ---------- C ----------
if (ONLY.includes("C")) {
  console.log("\n--- C. Contrast ---");
  for (const theme of ["light", "dark"]) for (const who of ["admin", "hr", "fin", "emp"]) {
    const n = await open(who, PAGE.replace("admin", { admin: "admin", hr: "hr", fin: "finance", emp: "employee" }[who]), { width: 1280, theme });
    const r = await n.t.evaluate(() => {
      // rgb()/rgba(), or color(srgb r g b / a) with 0-1 channels (what color-mix() computes to)
      const rgb = (s) => { const n = (s.match(/[\d.]+/g) ?? []).map(Number); return s.startsWith("color(srgb") ? n.map((v, i) => (i < 3 ? v * 255 : v)) : n; };
      const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const over = (fg, bg) => (fg.length === 4 && fg[3] < 1 ? fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3])) : fg.slice(0, 3));
      const bgOf = (e) => { for (let x = e; x; x = x.parentElement) { const c = rgb(getComputedStyle(x).backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] > 0)) return c.length === 4 && c[3] < 1 ? over(c, rgb(getComputedStyle(document.getElementById("sidebar")).backgroundColor)) : c.slice(0, 3); } return [255, 255, 255]; };
      const ratio = (e, prop = "color") => { const bg = bgOf(e), fg = over(rgb(getComputedStyle(e)[prop]), bg); const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x); return Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100; };
      const q = (s) => document.querySelector(s);
      return { label: ratio(q("#sidebar__nav .nav__section:not(.nav__section--single) a.nav__item:not(.is-active)")), active: ratio(q("#sidebar__nav a.nav__item.is-active")),
        heading: ratio(q("#sidebar__nav .nav__section:not(.nav__section--single) .nav__group-title")), name: ratio(q(".nav__profile-text strong")), role: ratio(q(".nav__profile-text span")),
        brand: ratio(q(".sidebar__brand-name")), toggle: ratio(q("#sidebar-toggle")), count: q("[data-count-waiting] .nav__count") ? ratio(q("[data-count-waiting] .nav__count")) : 99,
        footer: ratio(q(".sidebar__footer-text")) };
    });
    const low = Object.entries(r).filter(([k, v]) => v < (k === "toggle" ? 3 : 4.5));
    check(`C1.${who}.${theme}`, `${who}, ${theme}: sidebar text 4.5:1 or more, the toggle's icon 3:1 or more`, low.length === 0, j(r));
    await n.ctx.close();
  }
}

// ---------- W ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. Shots ---");
  for (const theme of ["light", "dark"]) {
    for (const w of [1440, 1280, 1024]) for (const side of [null, w === 1024 ? "expanded" : "collapsed"]) {
      const n = await open("admin", PAGE, { width: w, theme, side });
      await n.t.screenshot({ path: path.join(SHOTS, `side-${w}-${side ?? "default"}-${theme}.png`) });
      await n.ctx.close();
    }
    const n = await open("admin", PAGE, { width: 412, theme });
    await n.t.click(".topbar__menu-toggle"); await settle(n.t);
    await n.t.screenshot({ path: path.join(SHOTS, `side-412-drawer-${theme}.png`) });
    await n.ctx.close();
  }
  check("W1", "shots written", fs.readdirSync(SHOTS).filter((f) => f.startsWith("side-")).length >= 14);
}

// ---------- E ----------
if (ONLY.includes("E")) check("E1", "no page or console errors", errs.length === 0, j(errs.slice(0, 5)));
await browser.close();
console.log(`\nside: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
