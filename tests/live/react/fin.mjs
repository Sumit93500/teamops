// fin.mjs: a page round's parity harness (built by mk-harness.py from att.mjs; edit fin-sections.mjs.txt) (msedge, headless). usage: node att.mjs <app dist> <pristine tree> <shots dir>   ONLY=<letters>
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
const ONLY = process.env.ONLY ?? "GTEPX";
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
// P4a (ruled): the Salary structure page's components table is the salary templates now and the example person gets template, cost
// and regime cards, and "Add component" is gone. Both pages are read without those parts: the old page's components card and
// Add component button, the new page's cards.
const stripP4a = (t) => t.evaluate(() => {
  for (const s of ["#salary-templates", "#salary-plan", "#salary-ctc", "#salary-regime", "#salary-example-new"]) document.querySelector(s)?.remove();
  for (const h of document.querySelectorAll("section.card .card__title")) if (h.textContent.trim() === "Salary components") h.closest("section.card").remove();
  for (const b of document.querySelectorAll(".page-header__actions button, .page-header__actions a")) if (/Add component/.test(b.textContent)) b.remove();
});
const read = async (t) => { await stripP4a(t); return read0(t); };
const read0 = (t) => t.evaluate(() => {
  const m = document.querySelector("main#main");
  if (!m) return null;
  const vis = (e) => e.getClientRects().length > 0;
  const tx = (s) => s.replace(/\s+/g, " ").trim();
  return {
    text: tx(m.innerText),
    controls: [...m.querySelectorAll("button, a.btn, input, select, textarea")].filter(vis).map((c) => [c.tagName, tx(c.tagName === "TEXTAREA" ? "" : c.textContent) || tx(c.getAttribute("aria-label") || c.name || c.id || ""), c.disabled ?? null, c.type === "radio" || c.type === "checkbox" ? c.checked : c.value ?? null]),
    tables: [...m.querySelectorAll("table")].map((tb) => [...tb.querySelectorAll("tbody tr")].filter(vis).map((r) => [...r.cells].map((c) => tx(c.innerText)))),
    hiddenIds: [...m.querySelectorAll("[id]")].filter((e) => e.hidden).map((e) => (/^reason-\d+$|^_r_\w*_$/.test(e.id) ? "reason" : e.id)).sort(),
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

// ---- fin.mjs's own sections (round 12), spliced into att.mjs's core by mk-harness.py ----
//   G  salary structure, as each role: as opened; search, department, no matches; Breakdown on another row; Export (both files,
//      byte for byte). Finance: Edit (empty refused under the field, then sent: waits), Withdraw it (the question, the toast).
//      Admin: Edit someone (takes effect at once). Finance proposes, then Admin approves it and rejects a second (no reason
//      refused, then a reason), in the same browser
//   T  tax deductions, as each role: as opened; Export (every file, byte for byte); a placeholder's toast
//   E  expenses, as each role: as opened; each tab, search, category, no matches; Export (Pending and Paid, byte for byte);
//      Approve the first decidable claim and Reject the next; Pay approved claims (the question, the toasts, the page)
const settle = (t, ms = 250) => t.waitForTimeout(ms);
const same = (n, label, a, b) => { const bad = a.map((v, i) => j(v) === j(b[i])).indexOf(false); check(n, label, bad === -1 && a.length === b.length, bad === -1 ? `${a.length} steps` : `step ${bad}: ${where(j(a[bad]), j(b[bad]))}`); };
const files = async (t, n = 1) => {
  const got = []; t.on("download", async (dl) => got.push([dl.suggestedFilename(), fs.readFileSync(await dl.path(), "utf8")]));
  const exp = await t.$("main button[data-export]:visible"); if (!exp) return "no Export";
  await exp.click(); await t.waitForTimeout(1500); return got.sort((a, b) => a[0].localeCompare(b[0]));
};
const fileCheck = (n, label, fa, fb, count) => check(n, label, j(fa) === j(fb) && fa.length === count,
  j([typeof fa === "string" ? fa : fa.map((f) => [f[0], f[1].length]), typeof fb === "string" ? fb : fb.map((f) => [f[0], f[1].length])]));
const switchTo = async (t, label, id) => { await t.evaluate(([l, i]) => localStorage.setItem("officeos:session", JSON.stringify({ userLabel: l, employeeId: i, signedInAt: 1790000000000 })), [label, id]); await t.reload(); await t.waitForLoadState("load"); await settle(t, 500); };
const modalState = (t) => t.evaluate(() => { const m = document.querySelector(".modal.is-open"); return m ? [m.querySelector(".modal__title")?.textContent, m.querySelector(".modal__desc")?.textContent, document.activeElement.id, [...m.querySelectorAll(".form-error")].map((e) => [e.id, e.textContent]), [...m.querySelectorAll("input,textarea")].map((i) => i.value)] : null; });
const rowOf = (t, name) => t.evaluate((nm) => { const r = [...document.querySelectorAll("#salary-rows tr")].find((tr) => tr.innerText.includes(nm)); return r ? r.innerText.replace(/\s+/g, " ").trim() : null; }, name);

if (ONLY.includes("G")) {
  console.log("--- G. Salary structure ---");
  await pages("G", "payroll/salary-structure.html", async (who, x) => {
    const steps = async (t) => {
      const out = [];
      await t.fill("#salary-search", "a"); await settle(t, 150); out.push(await read(t));
      await t.fill("#salary-search", ""); await t.selectOption("#salary-department", { index: 1 }); await settle(t, 150); out.push(await read(t));
      await t.selectOption("#salary-department", ""); await t.fill("#salary-search", "zzz"); await settle(t, 150); out.push(await read(t));
      await t.fill("#salary-search", ""); await settle(t, 150);
      await t.click('#salary-rows tr:nth-child(3) button:has-text("Breakdown")'); await settle(t, 150); out.push(await read(t));
      return out;
    };
    same(`G2.${who}`, `${who}: search, department, no matches; Breakdown on the third row`, await steps(x.o.t), await steps(x.n.t));
    const [fa0, fb] = [await files(x.o.t), await files(x.n.t)];
    const fa = Array.isArray(fa0) ? fa0.filter((f) => !f[0].startsWith("salary-components")) : fa0;   // P4a: the components file is gone with the table
    fileCheck(`G3.${who}`, `${who}: Export: the employee salaries file byte for byte (the components file is gone with the table, P4a)`, fa, fb, 1);
    if (who === "fin") {
      const flow = async (t, x2) => {
        const out = [];
        await t.click('#salary-rows tr:has-text("Rohan Gupta") button:has-text("Edit")'); await settle(t, 300); out.push(await modalState(t));
        await t.fill("#salary-gross", ""); await t.click('.modal.is-open button[type="submit"]'); await settle(t, 200); out.push(await modalState(t));
        await t.fill("#salary-gross", "99000"); await t.fill("#salary-month", "2026-11"); await t.click('.modal.is-open button[type="submit"]'); await settle(t, 400);
        out.push(await toasts(t), await rowOf(t, "Rohan Gupta"), await read(t));
        await ask(x2, '#salary-rows tr:has-text("Rohan Gupta") button:has-text("Withdraw")', true); await settle(t, 300);
        out.push(x2.msg, await toasts(t), await rowOf(t, "Rohan Gupta"));
        return out;
      };
      same(`G4.${who}`, `${who}: Edit Rohan: empty refused under the field; ₹99,000 from Nov sent (waits); Withdraw: question, toast, row`, await flow(x.o.t, x.o), await flow(x.n.t, x.n));
    }
    if (who === "admin") {
      const flow = async (t) => {
        await t.click('#salary-rows tr:has-text("Arjun Kapoor") button:has-text("Edit")'); await settle(t, 300);
        const m = await modalState(t);
        await t.fill("#salary-gross", "91000"); await t.fill("#salary-month", "2026-12"); await t.click('.modal.is-open button[type="submit"]'); await settle(t, 400);
        return [m, await toasts(t), await rowOf(t, "Arjun Kapoor"), await read(t)];
      };
      same(`G5.${who}`, `${who}: Edit Arjun: ₹91,000 from Dec takes effect at once (revision due): dialog, toast, row, page`, await flow(x.o.t), await flow(x.n.t));
    }
  });
  const decide = async (base) => {
    const x = await open(base, "fin", "payroll/salary-structure.html");
    const t = x.t, out = [];
    for (const [name, gross] of [["Rohan Gupta", "99000"], ["Meera Joshi", "110000"]]) {
      await t.click(`#salary-rows tr:has-text("${name}") button:has-text("Edit")`); await settle(t, 300);
      await t.fill("#salary-gross", gross); await t.fill("#salary-month", "2026-11"); await t.click('.modal.is-open button[type="submit"]'); await settle(t, 400);
    }
    out.push(await toasts(t));
    await switchTo(t, "Aarav Mehta", "EMP-1001");
    out.push(await rowOf(t, "Rohan Gupta"), await rowOf(t, "Meera Joshi"));
    await ask(x, '#salary-rows tr:has-text("Rohan Gupta") button:has-text("Approve")', true); await settle(t, 400);
    out.push(x.msg, await toasts(t), await rowOf(t, "Rohan Gupta"));
    await t.click('#salary-rows tr:has-text("Meera Joshi") button:has-text("Reject")'); await settle(t, 300);
    out.push(await modalState(t));
    await t.click('.modal.is-open button[type="submit"]'); await settle(t, 200); out.push(await modalState(t));
    await t.fill(".modal.is-open textarea", "Not in this year's budget"); await t.click('.modal.is-open button[type="submit"]'); await settle(t, 400);
    out.push(await toasts(t), await rowOf(t, "Meera Joshi"), await read(t));
    await x.ctx.close();
    return out;
  };
  const [a, b] = [await decide(O), await decide(N)];
  same("G6", "Finance proposes two changes; Admin approves Rohan's (question, toast, row) and rejects Meera's (the modal, no reason refused, a reason)", a, b);
  check("G7", "the decisions really ran", /approved/.test(j(a[4])) && /rejected/.test(j(a[8])), j([a[4], a[8]]).slice(0, 300));
}

if (ONLY.includes("T")) {
  console.log("\n--- T. Tax deductions ---");
  await pages("T", "finance/tax-deductions.html", async (who, x) => {
    const [fa, fb] = [await files(x.o.t), await files(x.n.t)];
    fileCheck(`T2.${who}`, `${who}: Export: every file byte for byte`, fa, fb, 2);
    const ph = async (t) => { const b = await t.$("main [data-not-implemented]:visible"); if (!b) return "none"; await b.click(); await settle(t, 200); return toasts(t); };
    const [pa, pb] = [await ph(x.o.t), await ph(x.n.t)];
    check(`T3.${who}`, `${who}: a placeholder's toast`, j(pa) === j(pb), j([pa, pb]));
  });
}

if (ONLY.includes("E")) {
  console.log("\n--- E. Expenses ---");
  await pages("E", "finance/expenses.html", async (who, x) => {
    const steps = async (t) => {
      const out = [];
      for (const i of [1, 2, 3, 0]) { await t.click(`.table__toolbar .tabs__tab >> nth=${i}`); await settle(t, 150); out.push(await read(t)); }
      await t.fill("#expense-search", "a"); await settle(t, 150); out.push(await read(t));
      await t.selectOption("#expense-category", { index: 1 }); await settle(t, 150); out.push(await read(t));
      await t.fill("#expense-search", "zzz"); await settle(t, 150); out.push(await read(t));
      await t.fill("#expense-search", ""); await t.selectOption("#expense-category", ""); await settle(t, 150);
      return out;
    };
    same(`E2.${who}`, `${who}: each tab, search, category, no matches`, await steps(x.o.t), await steps(x.n.t));
    const [fa, fb] = [await files(x.o.t), await files(x.n.t)];
    fileCheck(`E3.${who}`, `${who}: Export (Pending), byte for byte`, fa, fb, 1);
    for (const y of [x.o.t, x.n.t]) { await y.click(".table__toolbar .tabs__tab >> nth=2"); await settle(y, 150); }
    const [ga, gb] = [await files(x.o.t), await files(x.n.t)];
    fileCheck(`E4.${who}`, `${who}: Export (Paid), byte for byte`, ga, gb, 1);
    for (const y of [x.o.t, x.n.t]) { await y.click(".table__toolbar .tabs__tab >> nth=0"); await settle(y, 150); }
    const decide = async (t, x2) => {
      const out = [];
      if (!(await t.$('main tbody button:has-text("Approve"):visible'))) out.push("nothing to decide");
      else {
        await ask(x2, 'main tbody button:has-text("Approve") >> nth=0', true); await settle(t, 300);
        out.push(x2.msg, await toasts(t), await read(t));
        if (await t.$('main tbody button:has-text("Reject"):visible')) {
          await t.click('main tbody button:has-text("Reject") >> nth=0'); await settle(t, 300);
          out.push(await modalState(t));
          await t.click('.modal.is-open button[type="submit"]'); await settle(t, 200); out.push(await modalState(t));
          await t.fill(".modal.is-open textarea", "No receipt attached"); await t.click('.modal.is-open button[type="submit"]'); await settle(t, 400);
          out.push(await toasts(t), await read(t));
        }
      }
      const pay = await t.$("#pay-approved:not([disabled]):visible");
      if (pay) { await ask(x2, "#pay-approved", true); await settle(t, 400); out.push(x2.msg, await toasts(t), await read(t)); } else out.push("pay disabled");
      return out;
    };
    same(`E5.${who}`, `${who}: Approve the first decidable claim, Reject the next (no reason refused, then one); Pay approved claims`, await decide(x.o.t, x.o), await decide(x.n.t, x.n));
  });
}

async function phoneCards(letter, list) {
  for (const [who, page] of list) {
    const o = await open(O, who, page, { width: 412 }), n = await open(N, who, page, { width: 412 });
    await o.t.waitForTimeout(700);
    const cards = async (t) => { await stripP4a(t); return t.evaluate(() => [...document.querySelectorAll("main table")].map((tb) => ({ cards: tb.hasAttribute("data-cards"),
      rows: [...tb.querySelectorAll("tbody tr")].map((r) => [...r.cells].map((c) => `${c.dataset.label}|${c.dataset.cardPart}|${c.querySelector(".table__more") ? "more" : ""}|${getComputedStyle(c).display}`)) }))); };
    const [a, b] = [await cards(o.t), await cards(n.t)];
    check(`${letter}.${who}.${page.split("/")[1].replace(".html", "")}`, `${who} on ${page} at 412: the same cards`, j(a) === j(b), j(a) === j(b) ? `${a.length} tables, ${a.map((x) => x.rows.length).join("+")} rows` : `old ${j(a).slice(0, 400)} new ${j(b).slice(0, 400)}`);
    await o.ctx.close(); await n.ctx.close();
  }
}
if (ONLY.includes("P")) {
  console.log("\n--- P. Phone cards at 412 ---");
  await phoneCards("P", (process.env.PHONE_PAGES ?? "admin:payroll/salary-structure.html,fin:finance/expenses.html,fin:finance/tax-deductions.html").split(",").map((s) => s.split(":")));
}

if (ONLY.includes("X")) {
  console.log("\n--- X. Shots ---");
  let k = 0;
  const list = (process.env.SHOT_PAGES ?? "admin:payroll/salary-structure.html,fin:finance/expenses.html,fin:finance/tax-deductions.html").split(",").map((s) => s.split(":"));
  for (const [who, page] of list) for (const width of [1280, 412]) for (const theme of ["light", "dark"]) for (const [side, base] of [["old", O], ["new", N]]) {
    const x = await open(base, who, page, { width, theme });
    await x.t.screenshot({ path: path.join(SHOTS, `${page.split("/")[1].replace(".html", "")}-${width}-${theme}-${side}.png`), fullPage: true, animations: "disabled" });
    k++; await x.ctx.close();
  }
  check("X1", "shots written", k === list.length * 8, `${k} files`);
}

await browser.close();
console.log(`\nfin: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
