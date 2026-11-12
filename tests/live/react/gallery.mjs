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

  await t.evaluate(() => document.querySelectorAll(".toast").forEach((x) => x.remove()));
  await t.click(".chart__col:nth-child(4)");
  await t.screenshot({ path: path.join(SHOTS, `gallery-${width}-${theme}.png`), fullPage: true, animations: "disabled" });
  await ctx.close();
}

await browser.close();
console.log(`\ngallery: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
