// leave.mjs: a page round's parity harness (built by mk-harness.py from att.mjs; edit leave-sections.mjs.txt) (msedge, headless). usage: node att.mjs <app dist> <pristine tree> <shots dir>   ONLY=<letters>
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
const ONLY = process.env.ONLY ?? "ALTHPX";
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
    controls: [...m.querySelectorAll("button, a.btn, input, select, textarea")].filter(vis).map((c) => [c.tagName, tx(c.tagName === "TEXTAREA" ? "" : c.textContent) || tx(c.getAttribute("aria-label") || c.name || c.id || ""), c.disabled ?? null, c.type === "radio" || c.type === "checkbox" ? c.checked : c.value ?? null]),
    tables: [...m.querySelectorAll("table")].map((tb) => [...tb.querySelectorAll("tbody tr")].filter(vis).map((r) => [...r.cells].map((c) => tx(c.innerText)))),
    hiddenIds: [...m.querySelectorAll("[id]")].filter((e) => e.hidden).map((e) => e.id).sort(),
    cal: [...m.querySelectorAll(".calendar__day")].map((c) => c.className.replace("calendar__day ", "")).join("|"),
  };
});
const toasts = (t) => t.evaluate(() => [...document.querySelectorAll(".toast")].map((e) => e.className + " | " + e.querySelector(".toast__text").textContent.trim()));
function where(x, y) {
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

// ---- leave.mjs's own sections (round 10), spliced between att.mjs's core and its P / X sections by mk-leave.py ----
//   A  apply leave, as each role: as opened; Sick picked, a range, then a half day over two dates refused live; a store error
//      (more casual days than are left) under its field; then a valid request sent: the toasts, the button, where it lands
//   L  leave approvals, as each role: as opened; each tab, search, the type filter; Export byte for byte (Admin, HR); on
//      Pending, Approve the first decidable request (the question, toast, page) and Reject the next (no reason refused, then one)
//   T  team leave, as each role: as opened; the next two months and back three
//   H  holidays, as each role: as opened; each year; the month arrows; Add holiday (empty refused, a weekday added); Remove an
//      upcoming one (the question, toast, page)
const settle = (t, ms = 250) => t.waitForTimeout(ms);
const files = async (t) => {
  const got = []; t.on("download", async (dl) => got.push([dl.suggestedFilename(), fs.readFileSync(await dl.path(), "utf8")]));
  const exp = await t.$("main button[data-export]:visible"); if (!exp) return "no Export";
  await exp.click(); await t.waitForTimeout(1500); return got;
};
const same = (n, label, a, b) => { const bad = a.map((v, i) => j(v) === j(b[i])).indexOf(false); check(n, label, bad === -1 && a.length === b.length, bad === -1 ? `${a.length} steps` : `step ${bad}: ${where(j(a[bad]), j(b[bad]))}`); };

if (ONLY.includes("A")) {
  console.log("--- A. Apply for leave ---");
  await pages("A", "leave/apply-leave.html", async (who, x) => {
    const steps = async (t) => {
      const out = [];
      await t.click('label.choice:has(input[value="sick"])'); await settle(t); out.push(await read(t));
      await t.fill("#from-date", "2026-10-05"); await t.dispatchEvent("#from-date", "change"); await t.fill("#to-date", "2026-10-07"); await t.dispatchEvent("#to-date", "change"); await settle(t); out.push(await read(t));
      await t.selectOption("#duration", "first-half"); await settle(t); out.push(await read(t), await t.evaluate(() => document.getElementById("duration").getAttribute("aria-describedby")));
      await t.selectOption("#duration", "full"); await t.click('label.choice:has(input[value="casual"])');
      await t.fill("#from-date", "2026-10-01"); await t.dispatchEvent("#from-date", "change"); await t.fill("#to-date", "2026-12-31"); await t.dispatchEvent("#to-date", "change");
      await t.fill("#leave-reason", "A long trip"); await settle(t); out.push(await read(t));
      await t.click('#leave-form button[type="submit"]'); await settle(t, 400);
      out.push(await read(t), await toasts(t), await t.evaluate(() => [document.activeElement?.id || document.activeElement?.name || "", [...document.querySelectorAll("#leave-form .form-error")].map((e) => [e.id, e.textContent])]));
      await t.fill("#to-date", "2026-10-02"); await t.dispatchEvent("#to-date", "change"); await settle(t); out.push(await read(t));
      await t.click('#leave-form button[type="submit"]'); await settle(t, 300);
      out.push(await toasts(t), await t.evaluate(() => document.querySelector('#leave-form button[type="submit"]').disabled));
      await t.waitForTimeout(1600); out.push(new URL(t.url()).pathname);
      return out;
    };
    same(`A2.${who}`, `${who}: Sick, a range, a half day over two dates refused live; too many casual days refused under the field; a valid request sent: toasts, button, landing`, await steps(x.o.t), await steps(x.n.t));
  });
}

if (ONLY.includes("L")) {
  console.log("\n--- L. Leave approvals ---");
  await pages("L", "leave/leave-approvals.html", async (who, x) => {
    const steps = async (t) => {
      const out = [];
      for (const i of [1, 2, 0]) { await t.click(`.table__toolbar .tabs__tab >> nth=${i}`); await settle(t, 150); out.push((await read(t)).tables, (await read(t)).controls); }
      await t.fill(".table__toolbar .input--search", "a"); await settle(t, 150); out.push(await read(t));
      await t.selectOption('select[aria-label="Filter by leave type"]', "sick"); await settle(t, 150); out.push(await read(t));
      await t.fill(".table__toolbar .input--search", "zzz"); await settle(t, 150); out.push(await read(t));
      await t.fill(".table__toolbar .input--search", ""); await t.selectOption('select[aria-label="Filter by leave type"]', ""); await settle(t, 150);
      return out;
    };
    same(`L2.${who}`, `${who}: each tab, a search, the type filter, no matches`, await steps(x.o.t), await steps(x.n.t));
    if (who === "admin" || who === "hr") {
      const [fa, fb] = [await files(x.o.t), await files(x.n.t)];
      check(`L3.${who}`, `${who}: Export (Pending), the same file byte for byte`, j(fa) === j(fb) && fa.length === 1, j([typeof fa === "string" ? fa : fa.map((f) => [f[0], f[1].length]), typeof fb === "string" ? fb : fb.map((f) => [f[0], f[1].length])]));
      for (const y of [x.o.t, x.n.t]) { await y.click(".table__toolbar .tabs__tab >> nth=1"); await settle(y, 150); }
      const [ga, gb] = [await files(x.o.t), await files(x.n.t)];
      check(`L4.${who}`, `${who}: Export (Approved, every page), the same file byte for byte`, j(ga) === j(gb) && ga.length === 1, j([typeof ga === "string" ? ga : ga.map((f) => [f[0], f[1].length]), typeof gb === "string" ? gb : gb.map((f) => [f[0], f[1].length])]));
      for (const y of [x.o.t, x.n.t]) { await y.click(".table__toolbar .tabs__tab >> nth=0"); await settle(y, 150); }
    }
    const decide = async (t, x2) => {
      const out = [];
      if (!(await t.$('main tbody button:has-text("Approve"):visible'))) return ["nothing to decide", await read(t)];
      await ask(x2, 'main tbody button:has-text("Approve") >> nth=0', true); await settle(t, 300);
      out.push(x2.msg, await toasts(t), await read(t));
      if (!(await t.$('main tbody button:has-text("Reject"):visible'))) return out;
      await t.click('main tbody button:has-text("Reject") >> nth=0'); await settle(t, 300);
      out.push(await t.evaluate(() => { const m = document.querySelector(".modal.is-open"); return m ? [m.querySelector(".modal__title")?.textContent, m.querySelector(".modal__desc")?.textContent, document.activeElement.id] : null; }));
      await t.click('.modal.is-open button[type="submit"]'); await settle(t, 200);
      out.push(await t.evaluate(() => document.querySelector(".modal.is-open .form-error")?.textContent ?? null));
      await t.fill(".modal.is-open textarea", "Team cover is short that week"); await t.click('.modal.is-open button[type="submit"]'); await settle(t, 400);
      out.push(await toasts(t), await read(t), await t.evaluate(() => Boolean(document.querySelector(".modal.is-open"))));
      return out;
    };
    same(`L5.${who}`, `${who}: Approve the first decidable request (question, toast, page), Reject the next (no reason refused, then a reason)`, await decide(x.o.t, x.o), await decide(x.n.t, x.n));
  });
}

if (ONLY.includes("T")) {
  console.log("\n--- T. Team leave ---");
  await pages("T", "leave/team-leave.html", async (who, x) => {
    const steps = async (t) => {
      const out = [];
      for (const dir of ["next", "next", "prev", "prev", "prev"]) { await t.click(`[data-month="${dir}"]`); await settle(t, 150); out.push(await read(t)); }
      return out;
    };
    same(`T2.${who}`, `${who}: the calendar two months on and back three`, await steps(x.o.t), await steps(x.n.t));
  });
}

if (ONLY.includes("H")) {
  console.log("\n--- H. Holidays ---");
  await pages("H", "leave/holidays.html", async (who, x) => {
    const steps = async (t) => {
      const out = [];
      const years = await t.evaluate(() => [...document.querySelectorAll('select[aria-label="Choose year"] option')].map((o) => o.value));
      for (const y of [...years.slice(1), years[0]]) { await t.selectOption('select[aria-label="Choose year"]', y); await settle(t, 150); out.push(await read(t)); }
      for (const dir of ["prev", "next", "next", "next", "next"]) { const b = await t.$(`[data-month="${dir}"]:not([disabled])`); if (b) await b.click(); await settle(t, 120); out.push(await read(t)); }
      return out;
    };
    same(`H2.${who}`, `${who}: each year, the month arrows`, await steps(x.o.t), await steps(x.n.t));
    if (!(await x.n.t.$('main button[data-permission="holidays:manage"]:visible'))) return;
    const add = async (t) => {
      const out = [];
      await t.click('main .page-header__actions button[data-permission="holidays:manage"]'); await settle(t, 300);
      out.push(await t.evaluate(() => [document.activeElement.id, Boolean(document.querySelector(".modal.is-open"))]));
      await t.click('.modal.is-open button[type="submit"]'); await settle(t, 200);
      out.push(await t.evaluate(() => [document.activeElement.id, [...document.querySelectorAll(".modal.is-open .form-error")].map((e) => [e.id, e.textContent])]));
      await t.fill("#holiday-date", "2026-12-08"); await t.selectOption("#holiday-kind", "company"); await t.fill("#holiday-name", "Founders Day");
      await t.click('.modal.is-open button[type="submit"]'); await settle(t, 400);
      out.push(await toasts(t), await read(t), await t.evaluate(() => Boolean(document.querySelector(".modal.is-open"))));
      return out;
    };
    same(`H3.${who}`, `${who}: Add holiday: empty refused under the field, then a weekday added (toast, the calendar on its month)`, await add(x.o.t), await add(x.n.t));
    const remove = async (t, x2) => {
      await ask(x2, '#holiday-list button:has-text("Remove") >> nth=0', true); await settle(t, 300);
      return [x2.msg, await toasts(t), await read(t)];
    };
    same(`H4.${who}`, `${who}: Remove the first upcoming holiday: the question, the toast, the page`, await remove(x.o.t, x.o), await remove(x.n.t, x.n));
  });
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
  await phoneCards("P", (process.env.PHONE_PAGES ?? "emp:leave/apply-leave.html,hr:leave/leave-approvals.html,mgr:leave/team-leave.html,hr:leave/holidays.html").split(",").map((s) => s.split(":")));
}

if (ONLY.includes("X")) {
  console.log("\n--- X. Shots ---");
  let k = 0;
  const list = (process.env.SHOT_PAGES ?? "emp:leave/apply-leave.html,hr:leave/leave-approvals.html,mgr:leave/team-leave.html,hr:leave/holidays.html").split(",").map((s) => s.split(":"));
  for (const [who, page] of list) for (const width of [1280, 412]) for (const theme of ["light", "dark"]) for (const [side, base] of [["old", O], ["new", N]]) {
    const x = await open(base, who, page, { width, theme });
    await x.t.screenshot({ path: path.join(SHOTS, `${page.split("/")[1].replace(".html", "")}-${width}-${theme}-${side}.png`), fullPage: true, animations: "disabled" });
    k++; await x.ctx.close();
  }
  check("X1", "shots written", k === list.length * 8, `${k} files`);
}

await browser.close();
console.log(`\nleave: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
