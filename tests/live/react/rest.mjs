// rest.mjs: a page round's parity harness (built by mk-harness.py from att.mjs; edit rest-sections.mjs.txt) (msedge, headless). usage: node att.mjs <app dist> <pristine tree> <shots dir>   ONLY=<letters>
// Old page (pristine) and new route, same session, fixed clock (Mon 28 Sep 2026 10:00 IST), fresh storage. Compared in main#main:
// the visible text (innerText), every control (buttons and links shown, their disabled state; inputs, radios, selects and their
// values), each table's rows, and the toasts. A question before an action is window.confirm on the old page, the in-app dialog on
// the new one (round 4); both are answered.
//   M  mark attendance, as each role: as opened; Work from home picked, Check in; Check out
//   Y  my attendance, as each role: as opened; each earlier month; Request fix (filled in; time missing refused; sent); Cancel (Sneha's)
//   S  shifts (a sample page), as each role: as opened; a placeholder's toast
//   P  phone cards at 412 on every table of these pages
//   T  team attendance (round 9)   G  regularization (round 9)
//   X  shots: each page at 1280 and 412, light and dark, old and new
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, PRIST, SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "ASRP";
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srvN = spawn("python", [path.join(HERE, "spa-serve.py"), "9983", DIST], { stdio: "ignore" });
const srvO = spawn("python", [path.join(EDGE, "lib", "serve.py"), "9984", PRIST], { stdio: "ignore" });
const stop = () => { try { srvN.kill(); srvO.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9983", O = "http://127.0.0.1:9984";
for (const u of [N + "/", O + "/pages/errors/404.html"]) { for (let i = 0; i < 60; i++) { try { if ((await fetch(u)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); } }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"] };
const ROLES = Object.keys(WHO);
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const SIZES = { 412: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA }, 1280: { viewport: { width: 1280, height: 900 } } };
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(16)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 500)}` : ""}`); };
const j = JSON.stringify;

async function open(base, who, page, { width = 1280, theme = "light" } = {}) {
  const ctx = await browser.newContext({ ...SIZES[width], timezoneId: "Asia/Kolkata" });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(process.env.CLOCK ?? "2026-09-28T10:00:00+05:30"));
  await ctx.addInitScript(([w, th]) => {
    if (sessionStorage.getItem("a-set")) return;
    sessionStorage.setItem("a-set", "1"); localStorage.clear();
    localStorage.setItem("officeos:theme", JSON.stringify(th));
    localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
  }, [WHO[who], theme]);
  const t = await ctx.newPage();
  const errs = []; t.on("pageerror", (e) => errs.push(e.message)); t.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await t.goto(base + "/pages/" + page); await t.waitForLoadState("load"); await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(400);
  return { ctx, t, errs, at: new URL(t.url()).pathname };
}
const read = (t) => t.evaluate(() => {
  const m = document.querySelector("main#main");
  if (!m) return null;
  const vis = (e) => e.getClientRects().length > 0;
  const tx = (s) => s.replace(/\s+/g, " ").trim();
  return {
    text: tx(m.innerText),
    controls: [...m.querySelectorAll("button, a.btn, input, select, textarea")].filter(vis).map((c) => [c.tagName, tx(c.tagName === "TEXTAREA" ? "" : c.tagName === "SELECT" ? [...c.options].map((o) => tx(o.textContent)).join(" ") : c.textContent) || tx(c.getAttribute("aria-label") || c.name || c.id || ""), c.disabled ?? null, c.type === "radio" || c.type === "checkbox" ? c.checked : c.value ?? null]),
    tables: [...m.querySelectorAll("table")].map((tb) => [...tb.querySelectorAll("tbody tr")].filter(vis).map((r) => [...r.cells].map((c) => tx(c.innerText)))),
    hiddenIds: [...m.querySelectorAll("[id]")].filter((e) => e.hidden).map((e) => (/^reason-\d+$|^_r_\w*_$/.test(e.id) ? "reason" : e.id)).sort(),
    cal: [...m.querySelectorAll(".calendar__day")].map((c) => c.className.replace("calendar__day ", "")).join("|"),
  };
});
const toasts = (t) => t.evaluate(() => [...document.querySelectorAll(".toast")].map((e) => e.className + " | " + e.querySelector(".toast__text").textContent.trim()));
function where(x, y) {
  x = x ?? "(nothing)"; y = y ?? "(nothing)";
  let i = 0; while (i < x.length && x[i] === y[i]) i++;
  return `at ${i}: old …${x.slice(Math.max(0, i - 80), i + 220)}… new …${y.slice(Math.max(0, i - 80), i + 220)}…`;
}
function compare(n, label, a, b) {
  if (!a || !b) { check(n, label, false, `old ${j(a)?.slice(0, 100)} new ${j(b)?.slice(0, 100)}`); return; }
  const diff = Object.keys(a).filter((k) => j(a[k]) !== j(b[k]));
  check(n, label, diff.length === 0, diff.length ? diff.map((k) => `${k}: ${where(j(a[k]), j(b[k]))}`).join(" ; ") : `${a.text.length} chars, ${a.controls.length} controls, ${a.tables.map((x) => x.length).join("+") || 0} rows`);
}
async function both(who, page) { return { o: await open(O, who, page), n: await open(N, who, page) }; }
async function ask(x, selector, yes) {
  x.msg = undefined;
  const handler = (dlg) => { x.msg = dlg.message(); yes ? dlg.accept() : dlg.dismiss(); };
  x.t.once("dialog", handler);
  await x.t.click(selector); await x.t.waitForTimeout(250);
  if (x.msg !== undefined) return;
  x.t.off("dialog", handler);
  const q = await x.t.evaluate(() => { const dd = document.querySelector(".confirm-dialog"); return dd ? [...dd.querySelectorAll(".modal__body p")].map((p) => p.textContent).join("\n") : null; });
  if (q === null) return;
  x.msg = q;
  await x.t.click(yes ? ".confirm-dialog [data-confirm-ok]" : ".confirm-dialog [data-confirm-cancel]"); await x.t.waitForTimeout(300);
}
async function pages(letter, page, rolesFn) {
  for (const who of ROLES) {
    const x = await both(who, page);
    if (x.o.at !== x.n.at || !x.o.at.endsWith(page)) {
      check(`${letter}.${who}`, `${who} on ${page}: lands where the old site does`, x.o.at === x.n.at, `${x.o.at} | ${x.n.at}`);
    } else {
      compare(`${letter}1.${who}`, `${who} on ${page}: as it opens`, await read(x.o.t), await read(x.n.t));
      if (rolesFn) await rolesFn(who, x);
      if (x.o.errs.length || x.n.errs.length) check(`${letter}9.${who}`, "no page errors", false, j([x.o.errs, x.n.errs]));
    }
    await x.o.ctx.close(); await x.n.ctx.close();
  }
}

// ---- rest.mjs's own sections (round 23), spliced into att.mjs's core by mk-harness.py ----
//   A  account, as each role: my profile (as opened; Phone and City changed + Save changes: the toast, the page, and after a
//      reload; Discard after an edit; a store refusal: an emergency phone of letters, its error under the field), change
//      password (as opened; the eye button; different passwords: the error, focus; the same: the toast), sessions and
//      notifications (samples: as opened; a placeholder's toast)
//   S  system, as each role: reports, backup (samples: as opened; a placeholder's toast), audit log (as opened; search
//      "fail", "zzz", cleared), settings (as opened; the Security link marked; Dark picked + Save appearance: the toast, the
//      theme on <html>, the radios after; a placeholder's toast)
//   R  recruitment and announcements, as each role: job openings (as opened; the Closed tab; search "design", "zzz"),
//      candidates, announcements (as opened; a placeholder's toast)
const settle = (t, ms = 250) => t.waitForTimeout(ms);
const same = (n, label, a, b) => { const bad = a.map((v, i) => j(v) === j(b[i])).indexOf(false); check(n, label, bad === -1 && a.length === b.length, bad === -1 ? `${a.length} steps` : `step ${bad}: ${where(j(a[bad]), j(b[bad]))}`); };
const toastAfter = async (t, sel) => { const b = await t.$(sel); if (!b) return "none"; await b.click(); await settle(t, 300); return (await toasts(t)).at(-1) ?? "no toast"; };
const firstPlaceholder = "main [data-not-implemented]:visible";
const reload = async (t) => { await t.reload(); await t.waitForLoadState("load"); await settle(t, 400); };
const errs = (t) => t.evaluate(() => [...document.querySelectorAll("main .form-error")].map((e) => [e.id, e.textContent, e.closest(".form-field")?.querySelector("input,textarea")?.id]));
const focused = (t) => t.evaluate(() => document.activeElement?.id ?? null);

const sample = (letter, page) => pages(letter, page, async (who, x) => {
  same(`${letter}2.${who}`, `${who}: the first placeholder's toast`, [await toastAfter(x.o.t, firstPlaceholder)], [await toastAfter(x.n.t, firstPlaceholder)]);
});
const searching = (letter, page, box, words) => pages(letter, page, async (who, x) => {
  const steps = async (t) => { const out = []; for (const q of [...words, ""]) { await t.fill(box, q); await settle(t, 150); out.push(await read(t)); } return out; };
  same(`${letter}2.${who}`, `${who}: search ${words.join(", ")}, cleared`, await steps(x.o.t), await steps(x.n.t));
  same(`${letter}3.${who}`, `${who}: the first placeholder's toast`, [await toastAfter(x.o.t, firstPlaceholder)], [await toastAfter(x.n.t, firstPlaceholder)]);
});

if (ONLY.includes("A")) {
  console.log("--- A. Account ---");
  await pages("Ap", "account/my-profile.html", async (who, x) => {
    const flow = async (t) => {
      const out = [];
      await t.fill("#p-phone", "+91 90000 11111"); await t.fill("#p-city", "Pune"); await t.click('main button[type="submit"]'); await settle(t, 400);
      out.push(await toasts(t), await read(t), await errs(t));
      await reload(t); out.push(await read(t), await t.inputValue("#p-phone"), await t.inputValue("#p-city"));
      await t.fill("#p-city", "Somewhere"); await t.click('main button[type="reset"]'); await settle(t, 200); out.push(await t.inputValue("#p-city"));
      await t.fill("#e-phone", "call me maybe"); await t.click('main button[type="submit"]'); await settle(t, 300);
      out.push(await errs(t), await focused(t), (await toasts(t)).at(-1));
      await t.fill("#e-phone", "+91 98110 55667"); await settle(t, 100); out.push(await errs(t));
      return out;
    };
    same(`Ap2.${who}`, `${who}: Save (toast, page, after a reload), Discard, a refused emergency phone (error, focus), cleared on typing`, await flow(x.o.t), await flow(x.n.t));
    same(`Ap3.${who}`, `${who}: Change photo's toast`, [await toastAfter(x.o.t, firstPlaceholder)], [await toastAfter(x.n.t, firstPlaceholder)]);
  });
  await pages("Ac", "account/change-password.html", async (who, x) => {
    const flow = async (t) => {
      const out = [];
      await t.fill("#pw-current", "old-one"); await t.click("#pw-current + .input-group__action"); out.push(await t.getAttribute("#pw-current", "type"));
      await t.click("#pw-current + .input-group__action"); out.push(await t.getAttribute("#pw-current", "type"));
      await t.fill("#pw-new", "abc12345"); await t.fill("#pw-confirm", "abc123"); await t.click('main button[type="submit"]'); await settle(t, 250);
      out.push(await errs(t), await focused(t), await toasts(t));
      await t.fill("#pw-confirm", "abc12345"); await settle(t, 100); out.push(await errs(t));
      await t.click('main button[type="submit"]'); await settle(t, 300); out.push(await errs(t), await toasts(t));
      return out;
    };
    same(`Ac2.${who}`, `${who}: the eye; different passwords (error, focus); typing clears it; the same (the toast)`, await flow(x.o.t), await flow(x.n.t));
  });
  await sample("As", "account/sessions.html");
  await sample("An", "account/notifications.html");
}

if (ONLY.includes("S")) {
  console.log("--- S. System ---");
  // reports: its chart has the value readout at every width now (the chart ruling of 2026-11-10, ColumnChart), so the new
  // page's readout line is asserted, then set aside, and the rest compared with the old page; at 412 both have the line
  for (const who of ROLES) {
    const x = await both(who, "system/reports.html");
    if (x.o.at !== x.n.at || !x.n.at.endsWith("reports.html")) { check(`Sr.${who}`, `${who} on system/reports.html: lands where the old site does`, x.o.at === x.n.at, `${x.o.at} | ${x.n.at}`); }
    else {
      const line = await x.n.t.evaluate(() => { const p = document.querySelector("main .chart + .chart__readout"); const s = p?.textContent; p?.remove(); return s; });
      check(`Sr0.${who}`, `${who}: the chart's readout line under it`, line === "Select a bar for its value", line);
      compare(`Sr1.${who}`, `${who} on system/reports.html: as it opens (the readout set aside)`, await read(x.o.t), await read(x.n.t));
      same(`Sr2.${who}`, `${who}: the first placeholder's toast`, [await toastAfter(x.o.t, firstPlaceholder)], [await toastAfter(x.n.t, firstPlaceholder)]);
      const tap = async (base) => { const y = await open(base, who, "system/reports.html", { width: 412 }); await y.t.click("main .chart__col:nth-child(12)"); await settle(y.t, 200);
        const r = await y.t.evaluate(() => [document.querySelector("main .chart__readout")?.textContent, document.querySelector("main .chart .is-selected .chart__bar")?.title]); await y.ctx.close(); return r; };
      same(`Sr3.${who}`, `${who}: at 412, tapping September shows its value`, [await tap(O)], [await tap(N)]);
    }
    await x.o.ctx.close(); await x.n.ctx.close();
  }
  await sample("Sb", "system/backup.html");
  await searching("Sa", "system/audit-log.html", 'input[aria-label="Search the log"]', ["fail", "payroll", "zzz"]);
  await pages("Ss", "system/settings.html", async (who, x) => {
    const flow = async (t) => {
      const out = [];
      await t.click('.settings__nav a[href="#security"]'); await settle(t, 600);
      out.push(await t.evaluate(() => [...document.querySelectorAll(".settings__link")].map((l) => l.className)));
      out.push(await t.evaluate(() => [...document.querySelectorAll(".reason")].map((r) => [r.textContent, r.previousElementSibling?.textContent, document.querySelector(`[aria-describedby="${r.id}"]`)?.getAttribute("aria-label")])));
      const save = await t.$("#save-appearance:visible");
      if (save) {
        await t.click('label.choice:has(input[value="dark"]) .choice__title'); await save.click(); await settle(t, 300);
        out.push(await toasts(t), await t.evaluate(() => [document.documentElement.dataset.theme, localStorage.getItem("officeos:theme")]));
        await reload(t);
        out.push(await t.evaluate(() => [...document.querySelectorAll('input[name="theme"]')].map((r) => r.checked)));
      }
      out.push(await toastAfter(t, firstPlaceholder));
      return out;
    };
    same(`Ss2.${who}`, `${who}: Security marked; the Always on lines; Dark + Save appearance (toast, theme, after a reload); a placeholder`, await flow(x.o.t), await flow(x.n.t));
  });
}

if (ONLY.includes("R")) {
  console.log("--- R. Recruitment and announcements ---");
  await pages("Rj", "recruitment/job-openings.html", async (who, x) => {
    const flow = async (t) => {
      const out = [];
      await t.click('main .tabs__tab:has-text("Closed")'); await settle(t, 150);
      out.push(await t.evaluate(() => [...document.querySelectorAll("main .tabs__tab")].map((b) => b.classList.contains("is-active"))));
      for (const q of ["design", "zzz", ""]) { await t.fill('input[aria-label="Search jobs"]', q); await settle(t, 150); out.push(await read(t)); }
      out.push(await toastAfter(t, firstPlaceholder));
      return out;
    };
    same(`Rj2.${who}`, `${who}: the Closed tab marked; search design, zzz, cleared; a placeholder`, await flow(x.o.t), await flow(x.n.t));
  });
  await sample("Rc", "recruitment/candidates.html");
  await sample("Ra", "announcements/announcements.html");
}

async function phoneCards(letter, list) {
  for (const [who, page] of list) {
    const o = await open(O, who, page, { width: 412 }), n = await open(N, who, page, { width: 412 });
    await o.t.waitForTimeout(700);
    const cards = (t) => t.evaluate(() => [...document.querySelectorAll("main table")].map((tb) => ({ cards: tb.hasAttribute("data-cards"),
      rows: [...tb.querySelectorAll("tbody tr")].map((r) => [...r.cells].map((c) => `${c.dataset.label}|${c.dataset.cardPart}|${c.querySelector(".table__more") ? "more" : ""}|${getComputedStyle(c).display}`)) })));
    const [a, b] = [await cards(o.t), await cards(n.t)];
    check(`${letter}.${who}.${page.split("/")[1].replace(".html", "")}`, `${who} on ${page} at 412: the same cards`, j(a) === j(b), j(a) === j(b) ? `${a.length} tables, ${a.map((x) => x.rows.length).join("+")} rows` : `old ${j(a).slice(0, 400)} new ${j(b).slice(0, 400)}`);
    await o.ctx.close(); await n.ctx.close();
  }
}
if (ONLY.includes("P")) {
  console.log("\n--- P. Phone cards at 412 ---");
  await phoneCards("P", (process.env.PHONE_PAGES ?? "emp:account/my-profile.html,emp:account/change-password.html,emp:account/sessions.html,emp:account/notifications.html,admin:system/reports.html,admin:system/audit-log.html,admin:system/backup.html,admin:system/settings.html,hr:recruitment/job-openings.html,hr:recruitment/candidates.html,emp:announcements/announcements.html").split(",").map((s) => s.split(":")));
}

if (ONLY.includes("X")) {
  console.log("\n--- X. Shots ---");
  let k = 0;
  const list = (process.env.SHOT_PAGES ?? "emp:account/my-profile.html,emp:account/change-password.html,emp:account/sessions.html,emp:account/notifications.html,admin:system/reports.html,admin:system/audit-log.html,admin:system/backup.html,admin:system/settings.html,hr:recruitment/job-openings.html,hr:recruitment/candidates.html,emp:announcements/announcements.html").split(",").map((s) => s.split(":"));
  for (const [who, page] of list) for (const width of [1280, 412]) for (const theme of ["light", "dark"]) for (const [side, base] of [["old", O], ["new", N]]) {
    const x = await open(base, who, page, { width, theme });
    await x.t.screenshot({ path: path.join(SHOTS, `${page.split("/")[1].replace(".html", "").replace(/[?&=]/g, "-")}-${width}-${theme}-${side}.png`), fullPage: true, animations: "disabled" });
    k++; await x.ctx.close();
  }
  check("X1", "shots written", k === list.length * 8, `${k} files`);
}

await browser.close();
console.log(`\nrest: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
