// D2b's chart check (msedge, headless). usage: node charts.mjs <app dist> <shots dir>
// Fixed clock Mon 28 Sep 2026 10:00 IST; local fonts. Reads /gallery's "Charts and map" section (sample data) and the Admin
// dashboard's headcount card (the proof chart: the store's own numbers).
//   L  every chart and the map load (lazy chunks), at 1280 and 412, light and dark: each has an accessible name, a readout, a
//      data table with one row per point; the gallery has no horizontal scroll; the shots for the contact sheet
//   C1 empty: "No data in this range." and no plot          C2 one point: one bar, the readout names it
//   C3 many points: 365 rows; Last 7 days -> 7; Clear All -> 365 again and disabled
//   C4 long labels: the axis cuts them with "…", the table and readout keep the whole name, nothing wider than its card
//   C5 negative values: a zero line, a negative tick, "-3" in the table
//   K  keyboard: the plot is one Tab stop; arrow keys / Home / End move the readout
//   T  412 touch: a tap on a bar, a donut part and a state changes the readout to that point
//   M  map: 36 states with names; zoom in / out / reset; arrow keys move between states; the tooltip; hatched "No data"
//   S  "Show as table" shows and hides the table (aria-pressed)
//   D  dark: the series colour is the dark token
//   P  the Admin dashboard's headcount: BarChart, a bar per department with people, the table matches the store's active headcount
//   E  no page or console errors
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const DIST = process.argv[2], SHOTS = process.argv[3];
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srv = spawn("python", [path.join(HERE, "spa-serve.py"), "9979", DIST], { stdio: "ignore" });
const stop = () => { try { srv.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9979";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const SIZES = { 412: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA }, 1280: { viewport: { width: 1280, height: 900 } } };
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(14)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 600)}` : ""}`); };
const j = JSON.stringify;
const allErrs = [];
const CHARTS = ["g-area-chart", "g-donut-chart", "g-grouped-chart", "g-stacked-chart", "g-map-chart", "g-one-chart", "g-many-chart", "g-negative-chart", "g-long-chart", "g-long-cols-chart"];
const ROWS = { "g-area-chart": 90, "g-donut-chart": 6, "g-grouped-chart": 7, "g-stacked-chart": 6, "g-map-chart": 12, "g-one-chart": 1, "g-many-chart": 365, "g-negative-chart": 6, "g-long-chart": 6, "g-long-cols-chart": 6 };

async function open(url, width = 1280, theme = "light") {
  const ctx = await browser.newContext({ ...SIZES[width], timezoneId: "Asia/Kolkata" });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date("2026-09-28T10:00:00+05:30"));
  await ctx.addInitScript((th) => {
    if (sessionStorage.getItem("c-set")) return;
    sessionStorage.setItem("c-set", "1"); localStorage.clear();
    localStorage.setItem("officeos:theme", JSON.stringify(th));
    localStorage.setItem("officeos:session", JSON.stringify({ userLabel: "Aarav Mehta", employeeId: "EMP-1001", signedInAt: 1790000000000 }));
  }, theme);
  const t = await ctx.newPage();
  t.on("pageerror", (e) => allErrs.push(`${url} ${width} ${theme}: ${e.message}`));
  t.on("console", (m) => { if (m.type() === "error") allErrs.push(`${url} ${width} ${theme}: console ${m.text()}`); });
  await t.goto(N + url); await t.waitForLoadState("load"); await t.evaluate(() => document.fonts.ready);
  await t.waitForFunction(() => document.querySelectorAll(".recharts-surface").length >= 9 || document.querySelector("#headcount-bars .recharts-surface"), null, { timeout: 15000 }).catch(() => {});
  await t.waitForFunction(() => !document.querySelector(".ds-chart__loading"), null, { timeout: 15000 }).catch(() => {});
  await t.waitForTimeout(300);
  return { ctx, t };
}
const readout = (t, id) => t.evaluate((id) => document.querySelector(`#${id} .ds-chart__readout`)?.textContent ?? null, id);
const rows = (t, id) => t.evaluate((id) => [...document.querySelectorAll(`#${id} .ds-chart__table tbody tr`)].map((r) => [...r.cells].map((c) => c.textContent)), id);

// L: every chart loads, both widths and themes
for (const width of [1280, 412]) for (const theme of ["light", "dark"]) {
  const { ctx, t } = await open("/gallery", width, theme);
  const s = await t.evaluate((ids) => ids.map((id) => {
    const f = document.getElementById(id);
    if (!f) return [id, "missing"];
    const plot = f.querySelector(".ds-chart__plot");
    return [id, Boolean(f.querySelector(".recharts-surface, .ds-map__svg")), plot?.getAttribute("aria-label")?.length > 10, (f.querySelector(".ds-chart__readout")?.textContent ?? "").length > 3,
      f.querySelectorAll(".ds-chart__table tbody tr").length, f.getBoundingClientRect().right <= f.closest(".ds-card").getBoundingClientRect().right + 1];
  }), CHARTS);
  const scroll = await t.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  const bad = s.filter(([id, drawn, named, read, n, fits]) => !(drawn === true && named && read && n === ROWS[id] && fits));
  check(`L.${width}.${theme}`, "every chart and the map drawn, named, read out, tabled; no sideways scroll", !bad.length && scroll, j({ bad, scroll }));
  const sec = await t.$(".gallery__charts-section");
  await t.evaluate(() => { document.querySelector(".topbar")?.style.setProperty("position", "static"); });
  if (sec) await sec.screenshot({ path: path.join(SHOTS, `charts-${width}-${theme}.png`), animations: "disabled" });
  if (theme === "dark") {
    // D: the first series' colour in the dark theme
    const fill = await t.evaluate(() => getComputedStyle(document.querySelector("#g-one-chart pattern rect")).fill);
    check(`D.${width}`, "dark: series 1 is the dark token (#6ea8ff)", fill === "rgb(110, 168, 255)", fill);
  }
  if (width === 412 && theme === "light") {
    // T: taps
    const before = await readout(t, "g-grouped-chart");
    const bars = await t.$$("#g-grouped-chart .recharts-bar-rectangle");
    await bars[2]?.scrollIntoViewIfNeeded(); await bars[2]?.tap(); await t.waitForTimeout(200);
    const after = await readout(t, "g-grouped-chart");
    check("T.bar", "412: a tapped bar is read out", before.startsWith("Highest: 26 Sep") && after === "24 Sep: Planned 166 check-ins, Actual 103 check-ins", j([before, after]));
    const slice = await t.$$("#g-donut-chart .recharts-pie-sector");
    await slice[1]?.scrollIntoViewIfNeeded(); await slice[1]?.tap(); await t.waitForTimeout(200);
    check("T.donut", "412: a tapped donut part is read out", (await readout(t, "g-donut-chart")) === "Sick: 26 days (21%)", await readout(t, "g-donut-chart"));
    const ka = await t.$('#g-map-chart path[data-state="Karnataka"]');
    await ka.scrollIntoViewIfNeeded(); await ka.tap(); await t.waitForTimeout(200);
    const tip = await t.evaluate(() => document.querySelector("#g-map-chart .ds-map__tip")?.textContent);
    check("T.map", "412: a tapped state is read out, with its tooltip", (await readout(t, "g-map-chart")) === "Karnataka: 38 employees" && tip === "Karnataka: 38 employees", j([await readout(t, "g-map-chart"), tip]));
  }
  await ctx.close();
}

// cases, keyboard, map, table: 1280 light
{
  const { ctx, t } = await open("/gallery");
  const e = await t.evaluate(() => { const f = document.getElementById("g-empty-chart"); return [f.querySelector(".ds-chart__empty")?.innerText.trim(), Boolean(f.querySelector(".ds-chart__plot, svg.recharts-surface")), f.querySelectorAll("table").length]; });
  check("C1", "empty: \"No data in this range.\", no plot, no table", e[0] === "No data in this range." && !e[1] && e[2] === 0, j(e));
  const one = await t.evaluate(() => document.querySelectorAll("#g-one-chart .recharts-bar-rectangle").length);
  check("C2", "one point: one bar, read out", one === 1 && (await readout(t, "g-one-chart")) === "Highest: Engineering: 4 employees" && j(await rows(t, "g-one-chart")) === j([["Engineering", "4"]]), j([one, await readout(t, "g-one-chart")]));
  // C3: the date range on 365 points
  const sel = "#g-many-chart select";
  const n0 = (await rows(t, "g-many-chart")).length;
  await t.selectOption(sel, "7d"); await t.waitForTimeout(150);
  const r7 = await rows(t, "g-many-chart");
  const sum7 = await t.evaluate(() => document.querySelector("#g-many-chart .ds-date-range__summary").textContent);
  const clear = t.locator("#g-many-chart .ds-filterbar button", { hasText: "Clear All" });
  const enabled = await clear.isEnabled();
  await clear.click(); await t.waitForTimeout(150);
  const n1 = (await rows(t, "g-many-chart")).length;
  check("C3", "many points: 365; Last 7 days: 7 (22 to 28 Sep); Clear All: 365 and off", n0 === 365 && r7.length === 7 && r7[0][0] === "22 Sep" && r7[6][0] === "28 Sep" && sum7 === "22 Sep to 28 Sep 2026" && enabled && n1 === 365 && !(await clear.isEnabled()),
    j([n0, r7.length, r7[0]?.[0], r7[6]?.[0], sum7, enabled, n1]));
  // C4: long labels
  const lg = await t.evaluate(() => ["g-long-chart", "g-long-cols-chart"].map((id) => {
    const f = document.getElementById(id);
    const ticks = [...f.querySelectorAll(".recharts-cartesian-axis-tick-value")].map((x) => x.textContent).filter((x) => /[A-Za-z]/.test(x));
    return [ticks.some((x) => x.includes("…")), [...f.querySelectorAll(".ds-chart__table tbody th")].map((x) => x.textContent)[4], f.getBoundingClientRect().right <= f.closest(".ds-card").getBoundingClientRect().right + 1];
  }));
  check("C4", "long labels: cut with … on the axis, whole in the table, inside the card", lg.every(([cut, whole, fits]) => cut && whole === "Customer Success and Support (India and APAC)" && fits)
    && (await readout(t, "g-long-chart")) === "Highest: Engineering and Platform Reliability: 14 employees", j([lg, await readout(t, "g-long-chart")]));
  // C5: negative values
  const ng = await t.evaluate(() => { const f = document.getElementById("g-negative-chart"); return [f.querySelectorAll(".recharts-reference-line").length, [...f.querySelectorAll(".recharts-cartesian-axis-tick-value")].map((x) => x.textContent)]; });
  const nr = await rows(t, "g-negative-chart");
  check("C5", "negative values: a zero line, a negative tick, -3 in the table", ng[0] >= 1 && ng[1].some((v) => v.startsWith("-")) && nr[0][1] === "-3", j([ng, nr[0]]));
  // K: keyboard on the area chart
  await t.focus("#g-area-chart .ds-chart__plot");
  const k0 = await readout(t, "g-area-chart");
  await t.keyboard.press("ArrowLeft"); const k1 = await readout(t, "g-area-chart");
  await t.keyboard.press("Home"); const k2 = await readout(t, "g-area-chart");
  await t.keyboard.press("End"); const k3 = await readout(t, "g-area-chart");
  const tabStops = await t.evaluate(() => [...document.querySelectorAll("#g-area-chart .ds-chart__plot *")].filter((e) => e.tabIndex >= 0 && e.getAttribute("tabindex") !== null).length);
  check("K", "keyboard: one Tab stop; arrows, Home and End move the readout", k0.startsWith("28 Sep:") && k1.startsWith("27 Sep:") && k2.startsWith("1 Jul:") && k3 === k0 && tabStops === 0, j([k0, k1, k2, k3, tabStops]));
  // S: Show as table
  const tg = t.locator("#g-donut-chart .ds-chart__toggle");
  const vis = () => t.evaluate(() => { const w = document.querySelector("#g-donut-chart .ds-chart__table").parentElement; return [w.className, w.getBoundingClientRect().height > 40]; });
  const s0 = await vis(); await tg.click(); const s1 = [await vis(), await tg.getAttribute("aria-pressed")]; await tg.click(); const s2 = [await vis(), await tg.getAttribute("aria-pressed")];
  check("S", "Show as table shows the table and hides it again", s0[0] === "visually-hidden" && s1[0][1] && s1[1] === "true" && s2[0][0] === "visually-hidden" && s2[1] === "false", j([s0, s1, s2]));
  // M: the map
  const m = await t.evaluate(() => {
    const f = document.getElementById("g-map-chart"), st = [...f.querySelectorAll("path[data-state]")];
    return [st.length, st.every((p) => (p.getAttribute("aria-label") ?? "").includes(": ")), st.filter((p) => p.tabIndex === 0).length, getComputedStyle(f.querySelector('path[data-state="Bihar"]')).fill.startsWith("url("),
      f.querySelector('path[data-state="Bihar"]').getAttribute("aria-label"), f.querySelector(".ds-chart__credit")?.textContent];
  });
  const g = () => t.evaluate(() => document.querySelector("#g-map-chart .ds-map__svg > g").getAttribute("transform"));
  const btn = (l) => t.locator(`#g-map-chart button[aria-label="${l}"]`);
  const z0 = [await g(), await btn("Zoom out").isDisabled(), await btn("Reset zoom").isDisabled()];
  await btn("Zoom in").click(); const z1 = await g();
  await btn("Zoom in").click(); await btn("Zoom out").click(); const z2 = await g();
  await btn("Reset zoom").click(); const z3 = [await g(), await btn("Reset zoom").isDisabled()];
  check("M.zoom", "map: zoom in 1.5x, out, reset", z0[0] === "translate(0 0) scale(1)" && z0[1] && z0[2] && /scale\(1\.5\)$/.test(z1) && z2 === z1 && z3[0] === "translate(0 0) scale(1)" && z3[1], j([z0, z1, z2, z3]));
  await t.focus('#g-map-chart path[data-state="Andaman and Nicobar Islands"]');
  const a0 = await readout(t, "g-map-chart");
  await t.keyboard.press("ArrowRight"); const a1 = await readout(t, "g-map-chart");
  const focused = await t.evaluate(() => document.activeElement.dataset.state);
  await t.keyboard.press("End"); const a2 = await readout(t, "g-map-chart");
  check("M.states", "map: 36 named states, one Tab stop, hatched No data, credit; arrows move focus and readout", m[0] === 36 && m[1] && m[2] === 1 && m[3] && m[4] === "Bihar: no data"
    && m[5] === "Map shapes: MapSVG, CC BY 4.0 (the @svg-maps/india package)." && a0 === "Andaman and Nicobar Islands: no data" && a1 === "Andhra Pradesh: no data" && focused === "Andhra Pradesh" && a2 === "West Bengal: 9 employees", j([m, a0, a1, focused, a2]));
  await ctx.close();
}

// P: the proof chart on the Admin dashboard
for (const width of [1280, 412]) {
  const { ctx, t } = await open("/pages/dashboard/admin.html", width);
  const p = await t.evaluate(() => {
    const f = document.getElementById("headcount-bars");
    const users = JSON.parse(localStorage.getItem("officeos:users") ?? "null")?.records ?? [];
    const deps = JSON.parse(localStorage.getItem("officeos:departments") ?? "null")?.records ?? [];
    const want = deps.map((d) => [d.name, String(users.filter((u) => u.department === d.code && u.status !== "inactive").length)]);
    return { bars: f?.querySelectorAll(".recharts-bar-rectangle").length, rows: [...(f?.querySelectorAll(".ds-chart__table tbody tr") ?? [])].map((r) => [...r.cells].map((c) => c.textContent)), want,
      readout: f?.querySelector(".ds-chart__readout")?.textContent, meta: document.getElementById("headcount-meta")?.textContent, scroll: document.documentElement.scrollWidth <= innerWidth };
  });
  const total = p.want.reduce((s, r) => s + Number(r[1]), 0);
  // a department with nobody draws no bar (zero length); it stays in the table with 0
  check(`P.${width}`, "Admin dashboard headcount: BarChart of the store's active headcount per department", p.bars === p.want.filter((r) => r[1] !== "0").length && j(p.rows) === j(p.want) && p.want.length > 0 && p.meta === `${total} total` && p.readout?.startsWith("Highest: ") && p.scroll, j(p));
  await t.locator("#headcount-bars").scrollIntoViewIfNeeded();
  await (await t.$("#headcount-bars"))?.screenshot({ path: path.join(SHOTS, `proof-headcount-${width}.png`) });
  await ctx.close();
}

check("E", "no page or console errors", !allErrs.length, j(allErrs));
await browser.close();
console.log(`\ncharts: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
