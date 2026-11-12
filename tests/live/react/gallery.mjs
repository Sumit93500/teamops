// React round 4's component gallery check (msedge, headless). usage: node gallery.mjs <app dist> <shots dir>
// /gallery as Admin at 1280 and 412 (Pixel 6a), light and dark (fixed clock, Mon 28 Sep 2026 10:00 IST): every component is
// drawn, and each one behaves:
//   G  drawn: 4 stats, a 14-column chart with its readout line, 3 bar rows, the table (10 rows, pager, sortable heading, search,
//      Export), tabs, badges, a person, 3 steps, 2 empty states ("No data in this range."), the not-built button; no
//      horizontal page scroll; no page or console errors.
//   K  the chart: the hint, then a click and a keyboard focus show the column's value in words; each colour-only kind of bar
//      (leave, absent, missing check-out, day off) also carries a pattern (a background image), the plain bars don't.
//   T  the table: sort by Employee both ways (aria-sort, ▲/▼, order), search narrows ("No matches." when nothing), the pager,
//      Export downloads gallery-employees-2026-09-28.csv with the header; at 412 the rows are cards (data-cards, labels).
//   D  dialogs: Confirm asks in words (role alertdialog, focus on Cancel), Esc answers no and returns focus; the danger one
//      answers yes on its button; the form modal: focus on its first field, Tab stays inside, Esc with nothing typed closes
//      (focus back on its opener); typed, Esc / the close button / the backdrop ask "Discard what you've entered?":
//      Keep editing keeps it open with the text, Discard closes it.
//   B  tabs switch their panel; the not-built button's toast; a success toast.
//   S  shots: the whole gallery at each width and theme, the form modal with the discard question, the chart's readout.
//   N  (D2a) the design foundation's components drawn: page header, 4 KPI cards (arrow AND words), the hero (pills, a hatched
//      band named in words, a dashed second line), the filter bar, segmented, toggle, pills, the check-in select field, icon buttons
//   K  (D2a) the keyboard: FilterBar tab order, presets, Custom, Clear All; Tabs arrows/Home/End; Segmented; Toggle; DownloadMenu;
//      SelectField's status line
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
const srv = spawn("python", [path.join(HERE, "spa-serve.py"), "9977", DIST], { stdio: "ignore" });
const stop = () => { try { srv.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9977";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const SIZES = { 412: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA }, 1280: { viewport: { width: 1280, height: 900 } } };
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(10)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 400)}` : ""}`); };
const j = JSON.stringify;

async function open(width, theme) {
  const ctx = await browser.newContext({ ...SIZES[width], timezoneId: "Asia/Kolkata", acceptDownloads: true });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date("2026-09-28T10:00:00+05:30"));
  await ctx.addInitScript((th) => {
    if (sessionStorage.getItem("g-set")) return;
    sessionStorage.setItem("g-set", "1"); localStorage.clear();
    localStorage.setItem("officeos:theme", JSON.stringify(th));
    localStorage.setItem("officeos:session", JSON.stringify({ userLabel: "Aarav Mehta", employeeId: "EMP-1001", signedInAt: 1790000000000 }));
  }, theme);
  const t = await ctx.newPage();
  const errs = []; t.on("pageerror", (e) => errs.push(e.message)); t.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await t.goto(N + "/gallery"); await t.waitForLoadState("load"); await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(300);
  return { ctx, t, errs };
}

for (const width of [1280, 412]) for (const theme of ["light", "dark"]) {
  const tag = `${width}.${theme}`;
  const { ctx, t, errs } = await open(width, theme);
  const g = await t.evaluate(() => ({
    stats: document.querySelectorAll(".stat-strip .stat").length, cols: document.querySelectorAll(".chart .chart__col").length,
    readout: document.querySelector(".chart__readout")?.textContent, readoutShown: document.querySelector(".chart__readout")?.getClientRects().length > 0,
    bars: document.querySelectorAll(".bar-row").length, rows: document.querySelectorAll(".table tbody tr").length, pager: document.querySelector(".pagination span")?.textContent ?? "(none)",
    sortable: document.querySelectorAll("th.is-sortable").length, search: Boolean(document.querySelector(".input--search")), exp: [...document.querySelectorAll(".table__toolbar .btn")].some((b) => b.textContent === "Export"),
    tabs: document.querySelectorAll(".tabs__tab").length, badges: document.querySelectorAll(".gallery__row .badge").length, person: document.querySelector(".gallery__section > .table__user .table__user-name")?.textContent,
    steps: document.querySelectorAll(".stepper__step").length, empty: [...document.querySelectorAll(".empty__title")].map((e) => e.textContent), notBuilt: document.querySelectorAll("[data-not-implemented]").length,
    shell: Boolean(document.querySelector(".sidebar .nav__item")), scroll: document.documentElement.scrollWidth <= innerWidth, cards: document.querySelector(".table").hasAttribute("data-cards"),
  }));
  const okG = g.stats === 4 && g.cols === 14 && g.readoutShown && g.bars === 3 && g.rows === 5 && /^Showing 1 to 5 of 10$/.test(g.pager) && g.sortable === 3 && g.search && g.exp && g.tabs === 3
    && g.badges === 5 && g.person === "Arjun Kapoor" && g.steps === 3 && g.empty[0] === "No data in this range." && g.notBuilt >= 6 && g.shell && g.scroll && g.cards === (width === 412);
  check(`G.${tag}`, `everything drawn at ${width} ${theme}`, okG, j(g));

  // K: the chart
  const hint = width === 412 ? "Tap a bar for its value" : "Select a bar for its value";
  await t.click(".chart__col:nth-child(4)"); await t.waitForTimeout(100);
  const k1 = await t.evaluate(() => [document.querySelector(".chart__readout").textContent, document.querySelector(".chart__col:nth-child(4)").classList.contains("is-selected")]);
  await t.focus(".chart__col:nth-child(6)"); await t.waitForTimeout(100);
  const k2 = await t.evaluate(() => document.querySelector(".chart__readout").textContent);
  const cue = await t.evaluate(() => [...document.querySelectorAll(".chart__bar")].map((b) => [b.className.replace("chart__bar", "").trim() || "plain", getComputedStyle(b).backgroundImage !== "none"]));
  const cueOk = cue.every(([kind, has]) => (kind === "plain" ? !has : has)) && new Set(cue.map(([k]) => k)).size === 5;
  check(`K.${tag}`, "the readout: hint, click, focus; a pattern on every colour-only bar", g.readout === hint && k1[0] === "Thu, 17 Sep: Absent" && k1[1] && k2 === "Sat, 19 Sep: On leave" && cueOk, j([g.readout, k1, k2, cue]));

  // T: the table
  const names = () => t.evaluate(() => [...document.querySelectorAll(".table tbody tr")].map((r) => r.querySelector(".table__user-name")?.textContent ?? r.textContent.trim()));
  const first = await names();
  const sortBtn = ".table th.is-sortable .sort-btn";
  await t.click(sortBtn); await t.waitForTimeout(100);
  const desc = await names(), sortState = await t.evaluate(() => [document.querySelector(".table th.is-sortable").getAttribute("aria-sort"), document.querySelector(".table th.is-sortable").textContent]);
  const sortedAsc = [...first].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  await t.fill(".input--search", "arj"); await t.waitForTimeout(100);
  const found = await names();
  await t.fill(".input--search", "zzzz"); await t.waitForTimeout(100);
  const none = await names();
  await t.fill(".input--search", ""); await t.waitForTimeout(100);
  let file = null, header = null;
  if (width === 1280) {
    const [dl] = await Promise.all([t.waitForEvent("download"), t.click(".table__toolbar .btn:has-text('Export')")]);
    file = dl.suggestedFilename(); header = fs.readFileSync(await dl.path(), "utf8").split("\r\n")[0].replace(/^﻿/, "");
  }
  const tOk = j(first) === j(sortedAsc) && j(desc) === j([...desc].sort((a, b) => b.localeCompare(a, "en", { numeric: true }))) && desc[0].localeCompare(first.at(-1)) > 0 && sortState[0] === "descending" && sortState[1].includes("▼") && found.length === 1 && found[0] === "Arjun Kapoor"
    && none[0] === "No matches." && (width === 412 || (file === "gallery-employees-2026-09-28.csv" && header === "Employee,Department,Designation,Status"));
  check(`T.${tag}`, "sort both ways, search, no matches, export", tOk, j({ first: first.slice(0, 3), desc: desc.slice(0, 2), sortState, found, none, file, header }));

  // D: dialogs
  const answer = () => t.evaluate(() => document.getElementById("gallery-answer").textContent);
  await t.click("button:has-text('Danger confirm')"); await t.waitForTimeout(150);
  const d1 = await t.evaluate(() => { const d = document.querySelector(".confirm-dialog"); return [d?.getAttribute("role"), d?.querySelector(".confirm-dialog__question").textContent, document.activeElement.textContent, d?.querySelector("[data-confirm-ok]").className]; });
  await t.click(".confirm-dialog [data-confirm-ok]"); await t.waitForTimeout(150);
  const a1 = await answer();
  await t.click(".gallery__row button:has-text('Confirm')"); await t.waitForTimeout(150);
  const d2 = await t.evaluate(() => [...document.querySelectorAll(".confirm-dialog .modal__body p")].map((p) => p.textContent));
  await t.keyboard.press("Escape"); await t.waitForTimeout(150);
  const a2 = [await answer(), await t.evaluate(() => [Boolean(document.querySelector(".confirm-dialog")), document.activeElement.textContent])];
  check(`D1.${tag}`, "confirm: words, role, focus on Cancel; yes on its button; Esc says no and returns focus", d1[0] === "alertdialog" && d1[1] === "Remove Diwali on 8 Nov 2026?" && d1[2] === "Cancel" && d1[3].includes("btn--danger") && a1 === "Answered: yes"
    && j(d2) === j(["Approve this request?", "Priya Nair, Work from home, 1 Oct"]) && a2[0] === "Answered: no" && a2[1][0] === false && a2[1][1] === "Confirm", j([d1, a1, d2, a2]));

  const modalState = () => t.evaluate(() => [Boolean(document.querySelector(".modal.is-open:not(.confirm-dialog)")), document.querySelector(".confirm-dialog .confirm-dialog__question")?.textContent ?? null, document.activeElement.id || document.activeElement.textContent.trim(), document.getElementById("g-name")?.value ?? null]);
  await t.click("[data-open-modal]"); await t.waitForTimeout(150);
  const m1 = await modalState();
  for (let i = 0; i < 6; i++) await t.keyboard.press("Tab");
  const inside = await t.evaluate(() => Boolean(document.activeElement.closest(".modal.is-open")));
  await t.keyboard.press("Escape"); await t.waitForTimeout(150);
  const m2 = await modalState();
  await t.click("[data-open-modal]"); await t.waitForTimeout(150); await t.fill("#g-name", "Design");
  await t.keyboard.press("Escape"); await t.waitForTimeout(150);
  const m3 = await modalState();
  if (width === 1280 && theme === "light") await t.screenshot({ path: path.join(SHOTS, "gallery-discard-1280-light.png") });
  await t.click(".confirm-dialog [data-confirm-cancel]"); await t.waitForTimeout(150);
  const m4 = await modalState();
  await t.click(".modal.is-open:not(.confirm-dialog) .modal__close"); await t.waitForTimeout(150);
  const m5 = await modalState();
  await t.click(".confirm-dialog [data-confirm-ok]"); await t.waitForTimeout(150);
  const m6 = await modalState();
  await t.click("[data-open-modal]"); await t.waitForTimeout(150); await t.fill("#g-name", "x");
  await t.mouse.click(5, 300); await t.waitForTimeout(150);
  const m7 = await modalState();
  await t.keyboard.press("Escape"); await t.waitForTimeout(150);   // Esc on the question: keep editing
  const m8 = await modalState();
  const dOk = m1[0] && m1[2] === "g-name" && inside && !m2[0] && m2[2] === "Open a form" && m3[0] && m3[1] === "Discard what you've entered?" && m4[0] && m4[1] === null && m4[3] === "Design"
    && m5[1] === "Discard what you've entered?" && !m6[0] && m6[1] === null && m7[1] === "Discard what you've entered?" && m8[0] && m8[1] === null && m8[3] === "x";
  check(`D2.${tag}`, "the form modal: focus, Tab trap, Esc closes clean; typed: Esc / close / backdrop ask; Keep editing keeps the text; Discard closes", dOk, j([m1, inside, m2, m3, m4, m5, m6, m7, m8]));
  await t.click(".modal.is-open:not(.confirm-dialog) .modal__footer .btn:has-text('Cancel')"); await t.waitForTimeout(150);

  // B: tabs, toasts
  await t.click(".tabs__tab:nth-child(2)"); await t.waitForTimeout(100);
  const tabs = await t.evaluate(() => [...document.querySelectorAll(".tab-panel")].map((p) => !p.hidden));
  await t.click("button[data-not-implemented='Bulk upload']"); await t.click("button:has-text('Success toast')"); await t.waitForTimeout(150);
  const toasts = await t.evaluate(() => [...document.querySelectorAll(".toast")].map((e) => e.className + " | " + e.querySelector(".toast__text").textContent));
  check(`B.${tag}`, "tabs switch; not-built and success toasts", j(tabs) === j([false, true, false]) && toasts.includes("toast toast--info | Bulk upload isn't available in this demo.") && toasts.includes("toast toast--success | Saved."), j([tabs, toasts]));
  check(`E.${tag}`, "no page or console errors", !errs.length, j(errs));

  // N (D2a): the design foundation's components, drawn
  await t.evaluate(() => document.querySelectorAll(".toast").forEach((x) => x.remove()));
  const nd = await t.evaluate(() => {
    const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)];
    const txt = (e) => e?.innerText.replace(/\s+/g, " ").trim() ?? null;
    return {
      header: q("#g-foundation")?.textContent, crumbs: qa(".gallery__foundation .ds-breadcrumb li").map((l) => l.textContent),
      kpis: qa(".ds-kpi").length, changes: qa(".ds-kpi__change").map((c) => [txt(c), c.className.replace("ds-kpi__change", "").trim()]),
      trends: qa(".ds-kpi__trend").map((s) => s.getAttribute("aria-label")),
      hero: { title: q(".ds-hero__title")?.textContent, pills: qa(".ds-hero .ds-pill").map((p) => p.textContent), value: q(".ds-hero__value")?.textContent,
        band: q(".ds-hero__band-label")?.textContent, legend: qa(".ds-hero__legend li").map((l) => l.textContent), plot: q(".ds-hero__plot")?.getAttribute("aria-label"),
        hatch: getComputedStyle(q(".ds-hero__band")).backgroundImage.includes("repeating-linear-gradient"), dashed: q(".ds-hero__plot path:nth-of-type(2)")?.getAttribute("stroke-dasharray") },
      filters: qa(".gallery__foundation .ds-filterbar label").map((l) => l.textContent), clear: [q(".ds-filterbar .ds-btn")?.textContent, q(".ds-filterbar .ds-btn")?.disabled],
      summary: q(".ds-date-range__summary")?.textContent, pills: qa(".gallery__foundation .gallery__row .ds-pill").map((p) => p.textContent),
      seg: [q(".ds-segmented")?.getAttribute("role"), qa(".ds-segmented__option").map((o) => `${o.textContent}:${o.getAttribute("aria-checked")}:${o.tabIndex}`)],
      toggle: [q(".ds-toggle")?.getAttribute("role"), q(".ds-toggle")?.getAttribute("aria-checked"), txt(q(".ds-toggle"))],
      field: [q(".ds-select-field label")?.textContent, q(".ds-select-field select")?.selectedOptions[0]?.textContent, q(".ds-select-field .ds-field__helper")?.textContent, q(".ds-select-field .ds-status")?.textContent,
        (q(".ds-select-field select")?.getAttribute("aria-describedby") ?? "").split(" ").length],
      icons: qa(".gallery__foundation .ds-page-header .ds-icon-btn").map((b) => `${b.getAttribute("aria-label")}:${b.title}`),
      scroll: document.documentElement.scrollWidth <= innerWidth,
    };
  });
  const nOk = nd.header === "Design foundation" && j(nd.crumbs) === j(["Gallery", "Design foundation"]) && nd.kpis === 4
    && j(nd.changes) === j([["▲ Up: 3.4% vs last month", "ds-kpi__change--good"], ["▲ Up: 2 more than last week", "ds-kpi__change--bad"], ["▼ Down: 1 fewer than yesterday", "ds-kpi__change--good"], ["■ No change: Same as last week", ""]])
    && j(nd.trends) === j(["Trend over 13 weeks: rising", "Trend over 6 weeks: rising"])
    && nd.hero.title === "Performance" && j(nd.hero.pills) === j(["In progress", "Due in 3 days"]) && nd.hero.value === "67%" && nd.hero.band === "Holiday week" && j(nd.hero.legend) === j(["This quarter", "Last quarter"]) && nd.hero.hatch && nd.hero.dashed === "6 4" && /holiday week is marked/.test(nd.hero.plot)
    && j(nd.filters) === j(["Date range", "Department", "Search people"]) && j(nd.clear) === j(["Clear All", true]) && nd.summary === "Showing all dates"
    && j(nd.pills) === j(["Live", "Pending", "Overdue", "New", "This month"]) && nd.seg[0] === "radiogroup" && j(nd.seg[1]) === j(["Volume:true:0", "Value:false:-1", "Count:false:-1"])
    && j(nd.toggle) === j(["switch", "true", "Live updates On"]) && j(nd.field) === j(["Check-In From", "Head Office", "Where you're working today (sample: the location rules come later)", "Online, 47 m from the office", 2])
    && j(nd.icons) === j(["Refresh:Refresh", "Download:Download"]) && nd.scroll;
  check(`N.${tag}`, "design foundation drawn: header, 4 KPIs (arrow + words), hero (pills, hatched band named), filters, segmented, toggle, pills, select field, icon buttons", nOk, j(nd));

  // K (D2a): the keyboard. FilterBar: Tab goes date range -> department -> search (Clear All skipped while disabled, then reached);
  // a preset says its dates; Custom shows two labelled dates; Clear All resets everything. Tabs: arrows / Home / End. Segmented:
  // one Tab stop, arrows choose. Toggle: Space. DownloadMenu: Enter opens on its first item, arrows move, Esc closes back on the
  // button, a choice runs. SelectField: the status line follows the choice.
  const active = () => t.evaluate(() => { const a = document.activeElement; return a.id ? (document.querySelector(`label[for="${a.id}"]`)?.textContent ?? a.id) : (a.getAttribute("aria-label") ?? a.textContent.trim()); });
  await t.focus(".ds-filterbar select");
  const order = [await active()];
  for (let i = 0; i < 3; i++) { await t.keyboard.press("Tab"); order.push(await active()); }
  await t.selectOption(".ds-filterbar select", "7d"); await t.waitForTimeout(80);
  const k7 = await t.evaluate(() => [document.querySelector(".ds-date-range__summary").textContent, document.querySelector(".ds-filterbar .ds-btn").disabled, document.getElementById("g-filter-state").textContent]);
  await t.focus(".ds-field--search input"); await t.keyboard.press("Tab");
  const toClear = await active();
  await t.selectOption(".ds-filterbar select", "custom"); await t.waitForTimeout(80);
  const kc = await t.evaluate(() => [[...document.querySelectorAll(".ds-date-range__custom label")].map((l) => l.textContent), [...document.querySelectorAll(".ds-date-range__custom input")].map((i) => i.value), document.querySelector(".ds-date-range__summary").textContent]);
  await t.fill(".ds-field--search input", "Arjun");
  await t.focus(".ds-filterbar .ds-btn"); await t.keyboard.press("Enter"); await t.waitForTimeout(80);
  const kx = await t.evaluate(() => [document.querySelector(".ds-filterbar select").value, document.querySelector(".ds-field--search input").value, document.querySelector(".ds-date-range__summary").textContent, document.querySelector(".ds-filterbar .ds-btn").disabled, document.getElementById("g-filter-state").textContent]);
  check(`K1.${tag}`, "FilterBar by keyboard: tab order, a preset in words, Custom's dates, Clear All resets", j(order) === j(["Date range", "Department", "Search people", "Volume"]) && j(k7) === j(["22 Sep to 28 Sep 2026", false, "Filters: 22 Sep to 28 Sep 2026; all departments; no search"])
    && toClear === "Clear All" && j(kc) === j([["From", "To"], ["2026-09-22", "2026-09-28"], "22 Sep to 28 Sep 2026"]) && j(kx) === j(["", "", "Showing all dates", true, "Filters: all dates; all departments; no search"]), j({ order, k7, toClear, kc, kx }));

  await t.focus(".tabs__tab:nth-child(1)");
  const tabState = () => t.evaluate(() => [[...document.querySelectorAll(".tabs__tab")].findIndex((b) => b === document.activeElement), [...document.querySelectorAll(".tabs__tab")].findIndex((b) => b.getAttribute("aria-selected") === "true"), [...document.querySelectorAll(".tab-panel")].findIndex((p) => !p.hidden)]);
  const ks = [];
  for (const key of ["ArrowRight", "End", "ArrowRight", "Home", "ArrowLeft"]) { await t.keyboard.press(key); ks.push(await tabState()); }
  check(`K2.${tag}`, "Tabs: arrows, Home and End move and open", j(ks) === j([[1, 1, 1], [2, 2, 2], [0, 0, 0], [0, 0, 0], [2, 2, 2]]), j(ks));

  await t.focus(".ds-segmented__option[aria-checked='true']");
  await t.keyboard.press("ArrowRight"); await t.waitForTimeout(50);
  const s1 = await t.evaluate(() => [document.activeElement.textContent, document.activeElement.getAttribute("aria-checked"), document.getElementById("g-seg-state").textContent]);
  await t.keyboard.press("End"); await t.keyboard.press("ArrowRight"); await t.waitForTimeout(50);
  const s2 = await t.evaluate(() => [document.activeElement.textContent, document.getElementById("g-seg-state").textContent]);
  await t.keyboard.press("Tab");
  const s3 = await t.evaluate(() => document.activeElement.getAttribute("role"));
  await t.keyboard.press("Space"); await t.waitForTimeout(50);
  const s4 = await t.evaluate(() => [document.activeElement.getAttribute("aria-checked"), document.activeElement.innerText.replace(/\s+/g, " ").trim()]);
  check(`K3.${tag}`, "Segmented: arrows choose (wrapping), one Tab stop; Toggle: Space switches, says Off", j(s1) === j(["Value", "true", "Showing by value"]) && j(s2) === j(["Volume", "Showing by volume"]) && s3 === "switch" && j(s4) === j(["false", "Live updates Off"]), j([s1, s2, s3, s4]));

  {   // its own scope: m1..m4 are also D2's names above
  await t.focus(".gallery__foundation .ds-menu > button"); await t.keyboard.press("Enter"); await t.waitForTimeout(80);
  const m1 = await t.evaluate(() => [document.querySelector(".ds-menu > button").getAttribute("aria-expanded"), document.activeElement.textContent]);
  await t.keyboard.press("ArrowDown");
  const m2 = await active();
  await t.keyboard.press("Escape"); await t.waitForTimeout(50);
  const m3 = await t.evaluate(() => [document.querySelector(".ds-menu > button").getAttribute("aria-expanded"), Boolean(document.querySelector(".ds-menu__list")), document.activeElement.getAttribute("aria-label")]);
  await t.keyboard.press("Enter"); await t.waitForTimeout(80); await t.keyboard.press("Enter"); await t.waitForTimeout(120);
  const m4 = await t.evaluate(() => [[...document.querySelectorAll(".toast .toast__text")].map((x) => x.textContent), Boolean(document.querySelector(".ds-menu__list")), document.activeElement.getAttribute("aria-label")]);
  check(`K4.${tag}`, "DownloadMenu: Enter opens on the first item, arrows move, Esc closes back on the button, a choice runs", j(m1) === j(["true", "Download as CSV"]) && m2 === "Download as PDF" && j(m3) === j(["false", false, "Download"])
    && j(m4) === j([["Downloaded: CSV (gallery sample)."], false, "Download"]), j([m1, m2, m3, m4]));
  }

  await t.selectOption(".ds-select-field select", "client"); await t.waitForTimeout(50);
  const f1 = await t.evaluate(() => { const s = document.querySelector(".ds-select-field .ds-status"); return [s.textContent, s.className, document.querySelector(".ds-select-field select").getAttribute("aria-describedby").includes(s.id)]; });
  check(`K5.${tag}`, "SelectField: the status line follows the choice, in words, and the field points at it", j(f1) === j(["At a client site: location not checked yet", "ds-status ds-status--warning", true]), j(f1));
  await t.selectOption(".ds-select-field select", "head");
  if (theme === "light") await t.locator(".gallery__foundation").screenshot({ path: path.join(SHOTS, `foundation-${width}-${theme}.png`) });

  await t.evaluate(() => document.querySelectorAll(".toast").forEach((x) => x.remove()));
  await t.click(".chart__col:nth-child(4)");
  await t.screenshot({ path: path.join(SHOTS, `gallery-${width}-${theme}.png`), fullPage: true, animations: "disabled" });
  await ctx.close();
}

await browser.close();
console.log(`\ngallery: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
