// pay.mjs: a page round's parity harness (built by mk-harness.py from att.mjs; edit pay-sections.mjs.txt) (msedge, headless). usage: node att.mjs <app dist> <pristine tree> <shots dir>   ONLY=<letters>
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
const ONLY = process.env.ONLY ?? "RSVQPX";
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

// ---- pay.mjs's own sections (round 11), spliced into att.mjs's core by mk-harness.py ----
//   R  payroll run (run against pristine + rer/w: its no-data month is rer's), Admin and Finance: no month, this month, the
//      month before records (no data), the month after the current one, two links that aren't a month; the search and the
//      status filter; each with the page's title. (Other roles: where they land.)
//   W  payroll run's Prepare and Approve, at CLOCK (a date after September closes): Finance prepares September, then Admin
//      approves it in the same browser: the page, toast and title after each
//   S  my payslips, as each role: as opened; each financial year
//   V  payslip view: your own (no link), each role; a month; a month with no payslip; a month not started; a link that isn't a
//      month; someone else's (403 without payslips:view; with it, the way back is the payroll run); an unknown employee
//   Q  payslip view printed (print media, A4): the same number of pages, old and new (one)
const settle = (t, ms = 250) => t.waitForTimeout(ms);
const same = (n, label, a, b) => { const bad = a.map((v, i) => j(v) === j(b[i])).indexOf(false); check(n, label, bad === -1 && a.length === b.length, bad === -1 ? `${a.length} steps` : `step ${bad}: ${where(j(a[bad]), j(b[bad]))}`); };
async function pair(n, who, url, more) {
  const x = { o: await open(O, who, url), n: await open(N, who, url) };
  const look = async (t) => ({ at: new URL(t.url()).pathname + new URL(t.url()).search, title: await t.title(), page: await read(t) });
  const [a, b] = [await look(x.o.t), await look(x.n.t)];
  check(n, `${who} on ${url}: lands, title and page as the old site`, j(a) === j(b), j(a) === j(b) ? `${a.at} | ${a.title} | ${a.page?.text.length ?? 0} chars` : where(j(a), j(b)));
  if (more && j(a) === j(b) && a.page) await more(x);
  if (x.o.errs.length || x.n.errs.length) check(`${n}.err`, "no page errors", false, j([x.o.errs, x.n.errs]));
  await x.o.ctx.close(); await x.n.ctx.close();
}

if (ONLY.includes("R")) {
  console.log("--- R. Payroll run ---");
  const RUN = "payroll/payroll-run.html";
  for (const who of ROLES) {
    if (who !== "admin" && who !== "fin") { await pair(`R0.${who}`, who, RUN); continue; }
    for (const [k, q] of [["now", ""], ["sep", "?month=2026-09"], ["aug", "?month=2026-08"], ["oct", "?month=2026-10"], ["bad1", "?month=2026-13"], ["bad2", "?month=sep"]]) {
      await pair(`R1.${who}.${k}`, who, RUN + q, k !== "sep" ? null : async (x) => {
        const steps = async (t) => {
          const out = [];
          await t.fill("#run-search", "a"); await settle(t, 150); out.push((await read(t)).tables, await t.evaluate(() => document.getElementById("run-rows-meta").textContent));
          await t.fill("#run-search", ""); await t.selectOption("#run-status-filter", "on-hold"); await settle(t, 150); out.push(await read(t));
          await t.selectOption("#run-status-filter", "draft"); await settle(t, 150); out.push(await read(t));
          await t.fill("#run-search", "zzz"); await settle(t, 150); out.push(await read(t));
          out.push(await t.evaluate(() => [...document.querySelectorAll(".page-header__actions .reason, .page-header__actions button")].map((e) => [e.tagName, e.textContent.trim(), e.title ?? "", e.hidden, e.disabled ?? null])));
          return out;
        };
        same(`R2.${who}`, `${who}: September: search, the status filter, no matches; the buttons, their titles and reasons`, await steps(x.o.t), await steps(x.n.t));
      });
    }
  }
}

if (ONLY.includes("W")) {
  console.log("\n--- W. Prepare and approve (CLOCK) ---");
  // The suites' recipe (gap.mjs seeded(), rejoin.mjs october()): seeded at CLOCK (Fri 30 Oct 19:00), October's pending leave
  // cancelled and corrections rejected, Vikram given a joining date; then on 10 Nov October's window has shut.
  const flow = async (base) => {
    const x = await open(base, "fin", "payroll/payroll-run.html");
    const t = x.t, out = [];
    await t.evaluate(() => {
      const edit = (key, fn) => { const box = JSON.parse(localStorage.getItem(`officeos:${key}`)); box.records.forEach(fn); localStorage.setItem(`officeos:${key}`, JSON.stringify(box)); };
      edit("leave-requests", (r) => { if (r.status === "pending" && r.type !== "wfh") r.status = "cancelled"; });
      edit("regularizations", (r) => { if (r.status === "pending") r.status = "rejected"; });
      edit("users", (u) => { if (u.name === "Vikram Singh") u.dateOfJoining = "8 Jan 2024"; });
    });
    await x.ctx.clock.setFixedTime(new Date("2026-11-10T10:00:00+05:30"));
    await t.goto(base + "/pages/payroll/payroll-run.html?month=2026-10"); await t.waitForLoadState("load"); await settle(t, 500);
    const state = async () => [await t.title(), await read(t), await t.evaluate(() => [...document.querySelectorAll(".page-header__actions .reason, .page-header__actions button")].map((e) => [e.tagName, e.textContent.trim(), e.title ?? "", e.hidden, e.disabled ?? null]))];
    out.push(await state());
    const prep = await t.$("#prepare-run:not([disabled])");
    if (prep) { await prep.click(); await settle(t, 400); }
    out.push(prep ? "prepared" : "prepare disabled", await toasts(t), await state());
    await t.evaluate(() => localStorage.setItem("officeos:session", JSON.stringify({ userLabel: "Aarav Mehta", employeeId: "EMP-1001", signedInAt: 1790000000000 })));
    await t.reload(); await t.waitForLoadState("load"); await settle(t, 500);
    out.push(await state());
    const appr = await t.$("#approve-run:not([disabled])");
    if (appr) { await appr.click(); await settle(t, 400); }
    out.push(appr ? "approved" : "approve disabled", await toasts(t), await state());
    await x.ctx.close();
    return out;
  };
  const [a, b] = [await flow(O), await flow(N)];
  same("W1", `Finance prepares October, Admin approves it (seeded ${process.env.CLOCK ?? "default"}, run on 10 Nov): the page, buttons, toasts and title after each`, a, b);
  check("W2", "the flow really ran: prepared, then approved", a[1] === "prepared" && a[5] === "approved", j([a[1], a[5], a[6]]));
}

if (ONLY.includes("S")) {
  console.log("\n--- S. My payslips ---");
  await pages("S", "payroll/payslips.html", async (who, x) => {
    const steps = async (t) => {
      const out = [];
      const years = await t.evaluate(() => [...document.querySelectorAll("#payslip-year option")].map((o) => o.value));
      for (const y of [...years.slice(1), years[0]]) { await t.selectOption("#payslip-year", y); await settle(t, 150); out.push(await read(t)); }
      out.push(await t.evaluate(() => [...document.querySelectorAll("#payslip-rows .reason, #payslip-rows .badge")].map((e) => [e.className, e.textContent, e.title ?? ""])));
      return out;
    };
    same(`S2.${who}`, `${who}: each financial year; the badges and hold reasons`, await steps(x.o.t), await steps(x.n.t));
  });
}

if (ONLY.includes("V")) {
  console.log("\n--- V. Payslip view ---");
  const V = "payroll/payslip-view.html";
  for (const who of ROLES) for (const [k, q] of [["own", ""], ["sep", "?month=2026-09"], ["aug", "?month=2026-08"], ["dec", "?month=2026-12"], ["bad", "?month=2026-9"]]) await pair(`V1.${who}.${k}`, who, V + q);
  for (const who of ["emp", "fin", "admin", "hr"]) {
    await pair(`V2.${who}.other`, who, `${V}?employee=EMP-1105&month=2026-09`);
    await pair(`V2.${who}.admin`, who, `${V}?employee=EMP-1001`);
    await pair(`V2.${who}.none`, who, `${V}?employee=EMP-9999`);
  }
}

if (ONLY.includes("Q")) {
  console.log("\n--- Q. Payslip view printed ---");
  for (const [who, q] of [["emp", ""], ["fin", "?employee=EMP-1105&month=2026-09"]]) {
    const pdfPages = async (base) => {
      const x = await open(base, who, `payroll/payslip-view.html${q}`);
      await x.t.emulateMedia({ media: "print" });
      const pdf = (await x.t.pdf({ format: "A4", printBackground: true })).toString("latin1");
      const text = await x.t.evaluate(() => [...document.querySelectorAll("body *")].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden" && e.children.length === 0).map((e) => e.textContent.trim()).filter(Boolean).join(" "));
      await x.ctx.close();
      return [(pdf.match(/\/Type\s*\/Page[^s]/g) ?? []).length, text];
    };
    const [a, b] = [await pdfPages(O), await pdfPages(N)];
    check(`Q1.${who}`, `${who}: printed on A4: one page, old and new, the same text printed`, a[0] === 1 && b[0] === 1 && a[1] === b[1], a[1] === b[1] ? `${a[0]} | ${b[0]} pages` : `${a[0]} | ${b[0]} pages; ${where(a[1], b[1])}`);
  }
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
  await phoneCards("P", (process.env.PHONE_PAGES ?? "fin:payroll/payroll-run.html,emp:payroll/payslips.html,emp:payroll/payslip-view.html").split(",").map((s) => s.split(":")));
}

if (ONLY.includes("X")) {
  console.log("\n--- X. Shots ---");
  let k = 0;
  const list = (process.env.SHOT_PAGES ?? "fin:payroll/payroll-run.html,emp:payroll/payslips.html,emp:payroll/payslip-view.html").split(",").map((s) => s.split(":"));
  for (const [who, page] of list) for (const width of [1280, 412]) for (const theme of ["light", "dark"]) for (const [side, base] of [["old", O], ["new", N]]) {
    const x = await open(base, who, page, { width, theme });
    await x.t.screenshot({ path: path.join(SHOTS, `${page.split("/")[1].replace(".html", "")}-${width}-${theme}-${side}.png`), fullPage: true, animations: "disabled" });
    k++; await x.ctx.close();
  }
  check("X1", "shots written", k === list.length * 8, `${k} files`);
}

await browser.close();
console.log(`\npay: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
