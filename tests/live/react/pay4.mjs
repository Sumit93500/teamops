// P4a's harness (msedge, headless): the pay screens under the new statutory rules. Read by meaning (text, aria, computed
// colours). usage: node pay4.mjs <app dist> <repo root> <shots dir>   [ONLY=SPBRTXYAKW]
// Clock Mon 16 Nov 2026 10:00 IST, fresh storage each. The new rules start with 2026-11 by default (data/pay-settings.js), so
// November is the new engine's month; the start-month setting is written straight into storage to put November before, at and
// after the boundary.
//   S  payslip view: template earnings, PF / ESI / PT / LWF / TDS, regime, rules as of, Unverified note, the employer box (who
//      sees it), an earlier month as it was, print, 412 / 1280
//   B  the start-month boundary: November before, at and after it; the setting saved from Settings > Payroll
//   P  payslips list: year to date with ESI and LWF, the Unverified note, how this year's tax is worked out, compare regimes
//   R  payroll run: the new columns and totals, the banner, the old columns before the start month
//   T  salary page: the templates (Admin edits through the module's checks, Finance reads), a person's template, cost to
//      company, the regime and the declaration; who may open it
//   X  tax page: the signed-in person's explanation and the regime comparison
//   Y  Rates and rules: the rows, filters, who sees what, verify (asked first; name + date), add a dated row
//   A  Settings > Payroll: the start month and PF on full wages
//   K  keyboard and names; W contrast of the Unverified note and the pills; E no page errors
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, , SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "SBPRTXYAKWE";
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
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(8)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 700)}` : ""}`); };
const j = JSON.stringify;
const errs = [];
const UNVERIFIED = "These rates are samples until an Admin verifies them.";
const START = (statutoryFrom) => ({ "officeos:pay-settings": { version: 1, statutoryFrom, leaveFrom: null, audit: [] } });

async function context({ width = 1280, theme = "light" } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata", colorScheme: theme });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date("2026-11-16T10:00:00+05:30"));
  return ctx;
}
async function seed(ctx, who, store = {}, theme = "light") {
  await ctx.addInitScript(([w, st, th]) => {
    try { if (localStorage.getItem("x-seeded")) return; } catch { return; }
    try { localStorage.clear(); localStorage.setItem("x-seeded", "1"); localStorage.setItem("officeos:theme", JSON.stringify(th)); if (w) localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
      for (const [k, v] of Object.entries(st)) localStorage.setItem(k, JSON.stringify(v)); } catch {}
  }, [who ? WHO[who] : null, store, theme]);
}
async function page(ctx, url) {
  const t = await ctx.newPage();
  t.on("pageerror", (e) => errs.push(`${url}: ${e.message}`));
  await t.goto(N + "/pages/" + url); await t.waitForLoadState("load");
  await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(500);
  return t;
}
async function open(who, url, opts = {}) { const ctx = await context(opts); await seed(ctx, who, opts.store ?? {}, opts.theme ?? "light"); return { ctx, t: await page(ctx, url) }; }
const settle = (t, ms = 300) => t.waitForTimeout(ms);
const txt = (t, sel) => t.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, " ").trim() : null; }, sel);
const all = (t, sel) => t.evaluate((s) => [...document.querySelectorAll(s)].map((e) => e.innerText.replace(/\s+/g, " ").trim()), sel);
const field = (t, name) => txt(t, `[data-field="${name}"]`);
const num = (s) => (s == null ? NaN : Number(String(s).replace(/[^\d.-]/g, "")));
const slipUrl = (id, month = "2026-11") => `payroll/payslip-view.html?employee=${id}&month=${month}`;
const noScroll = (t) => t.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const at403 = (t) => t.url().includes("/errors/403.html");

// ---------- S ----------
if (ONLY.includes("S")) {
  console.log("\n--- S. Payslip view ---");
  const a = await open("admin", slipUrl("EMP-1001"));
  const gross = num(await field(a.t, "gross")), basic = num(await field(a.t, "basic"));
  const lines = ["basic", "hra", "medical", "conveyance", "special"], comps = await Promise.all(lines.map((k) => field(a.t, k)));
  const ded = Object.fromEntries(await Promise.all(["pf", "esi", "pt", "lwf", "tds"].map(async (k) => [k, num(await field(a.t, k))])));
  const total = num(await field(a.t, "deductions")), net = num(await field(a.t, "net"));
  check("S1", "Aarav's November payslip: the Standard template's earnings (basic is half the gross; medical 1,250; conveyance 1,600) that add up to the gross",
    comps.every(Boolean) && basic === gross / 2 && num(comps[2]) === 1250 && num(comps[3]) === 1600 && lines.reduce((s, _, i) => s + num(comps[i]), 0) === gross, j([gross, comps]));
  check("S2", "deductions: PF 3,000 (the ceiling), ESI 0, PT 0 (Haryana, unverified), LWF 35, TDS; they add up; net = gross - deductions",
    ded.pf === 3000 && ded.esi === 0 && ded.pt === 0 && ded.lwf === 35 && total === ded.pf + ded.esi + ded.pt + ded.lwf + ded.tds && net === gross - total, j([ded, total, net]));
  check("S3", "the regime (New regime), the day the rules were taken as of (1 Nov 2026), and the section", (await field(a.t, "regime")) === "New regime" && /1 Nov 2026/.test(await field(a.t, "rules-as-of")) && /section 392/.test(await txt(a.t, "#payslip-notes") ?? "") && /Income tax \(TDS\), section 392/.test(await txt(a.t, ".payslip__cols") ?? ""));
  check("S4", "the Unverified label with its words and a link to Rates and rules (the Admin may open it)", (await txt(a.t, "#unverified-rates"))?.startsWith("Unverified rates " + UNVERIFIED) && (await a.t.locator("#unverified-rates a").getAttribute("href")) === "/pages/payroll/rates-rules.html");
  const emp = await all(a.t, "#payslip-employer .pay-line");
  check("S5", "the employer box (the person's own): EPF and EPS 3,000, EDLI 125, admin 125, ESI 0, LWF 70, gratuity accrual, the totals and the cost to company",
    emp.length === 8 && /3,000/.test(emp[0]) && /125/.test(emp[1]) && /125/.test(emp[2]) && /₹0/.test(emp[3]) && /70/.test(emp[4]) && /Gratuity accrual/.test(emp[5]) && /Cost to company/.test(emp[7]), j(emp));
  const stat = await txt(a.t, "#payslip-employer p");
  check("S6", "it says the employer contributions are not taken from the pay", /not taken from your pay/.test(stat ?? ""));
  let printed = 0; await a.t.exposeFunction("seenPrint", () => { printed++; }); await a.t.evaluate(() => { window.print = () => window.seenPrint(); });
  await a.t.click("#payslip-print");
  check("S7", "Print or save as PDF still opens the print dialog", printed === 1);
  await a.ctx.close();
  // who sees the employer box
  const f = await open("fin", slipUrl("EMP-1105"));
  check("S8", "Finance (payslips:view) opening Arjun's payslip sees the box", (await f.t.locator("#payslip-employer").count()) === 1 && (await field(f.t, "regime")) === "New regime");
  await f.ctx.close();
  const h = await open("hr", slipUrl("EMP-1003"));
  check("S9", "HR sees the box on their own payslip", (await h.t.locator("#payslip-employer").count()) === 1);
  const h2 = await page(h.ctx, slipUrl("EMP-1105"));
  check("S10", "HR can't open someone else's payslip (as before): the 403 page, no employer box", at403(h2) && (await h2.locator("#payslip-employer").count()) === 0);
  await h.ctx.close();
  const mg = await open("mgr", slipUrl("EMP-1105"));
  check("S11", "a manager opening a team member's payslip: the 403 page; no employer box ever", at403(mg.t) && (await mg.t.locator("#payslip-employer").count()) === 0);
  const own = await page(mg.ctx, slipUrl("EMP-1029"));
  check("S12", "the manager's own payslip has the box", (await own.locator("#payslip-employer").count()) === 1);
  await mg.ctx.close();
  const e = await open("emp", slipUrl("EMP-1105"));
  check("S13", "an employee's own payslip has the box and the same lines", (await e.t.locator("#payslip-employer").count()) === 1 && (await field(e.t, "lwf")) === "₹35");
  const old = await page(e.ctx, slipUrl("EMP-1105", "2026-10"));
  check("S14", "October (before the start month) is the payslip it was: 'sample tax rates', no employer box, no Rules as of, no ESI line", (await old.locator("#payslip-employer").count()) === 0 && /sample tax rates/.test(await txt(old, ".payslip__cols") ?? "") && (await field(old, "rules-as-of")) === null && (await field(old, "esi")) === null);
  const gone = await page(e.ctx, slipUrl("EMP-1105", "2026-08"));
  check("S14b", "a month with no payslip says 'No data in this range.' as before", (await txt(gone, "#payslip-message-title")) === "No data in this range.");
  await e.ctx.close();
  for (const w of [1280, 412]) {
    const n = await open("emp", slipUrl("EMP-1105"), { width: w });
    check(`S15.${w}`, `${w}: no sideways scroll`, await noScroll(n.t));
    await n.t.screenshot({ path: path.join(SHOTS, `payslip-${w}.png`), fullPage: true });
    await n.ctx.close();
  }
}

// ---------- B ----------
if (ONLY.includes("B")) {
  console.log("\n--- B. The start month ---");
  const lines = async (from) => { const n = await open("emp", slipUrl("EMP-1105"), { store: START(from) }); const r = { tds: await txt(n.t, "[data-field=tds]"), esi: await field(n.t, "esi"), box: await n.t.locator("#payslip-employer").count(), hint: await n.t.evaluate(() => [...document.querySelectorAll(".pay-line dt")].map((d) => d.innerText)), pf: await field(n.t, "pf"), basic: await field(n.t, "basic"), regime: await field(n.t, "regime"), asof: await field(n.t, "rules-as-of") }; await n.ctx.close(); return r; };
  const before = await lines("2026-12"), at = await lines("2026-11"), after = await lines("2026-10");
  check("B1", "start 2026-12: November is the payslip it always was (Basic 40%, PF 12% of basic, TDS 'sample tax rates', no ESI, no employer box)", before.box === 0 && before.esi === null && before.hint.includes("Income tax (TDS), sample tax rates") && before.asof === null, j(before));
  check("B2", "start 2026-11 (at the boundary): November is the new engine's", at.box === 1 && at.esi !== null && at.hint.includes("Medical allowance") && /1 Nov 2026/.test(at.asof), j(at));
  check("B3", "start 2026-10 (the month after the start): still the new engine's", after.box === 1 && after.hint.includes("Medical allowance"), j(after));
  check("B4", "the old November's figures differ from the new (the old basic is 40%): Basic and PF are not the same", before.basic !== at.basic && before.pf !== at.pf, j([before.basic, at.basic, before.pf, at.pf]));
}

// ---------- P ----------
if (ONLY.includes("P")) {
  console.log("\n--- P. Payslips list and the tax explanation ---");
  const n = await open("emp", "payroll/payslips.html");
  const ytd = await all(n.t, ".breakdown__row");
  check("P1", "the year to date has ESI and LWF lines for a year holding a new-rules month", ytd.some((r) => /^Employee state insurance/.test(r)) && ytd.some((r) => /^Labour welfare fund ₹35/.test(r)), j(ytd));
  check("P2", "the Unverified note, in its words", (await txt(n.t, ".payslip, main") ) !== null && (await txt(n.t, "#unverified-rates"))?.includes(UNVERIFIED));
  check("P3", "no link to Rates and rules for an employee (they can't open it): the words only", (await n.t.locator("#unverified-rates a").count()) === 0);
  const ex = await txt(n.t, "#tax-explain");
  check("P4", "'How your tax is worked out': the projection, the standard deduction, the slabs, the cess, the months so far", /Projected income for the year/.test(ex) && /Standard deduction/.test(ex) && /Health and education cess/.test(ex) && /Your months/.test(ex) && /Nov/.test(ex) && (await n.t.locator("#tax-slabs li").count()) === 7, ex?.slice(0, 200));
  const cmp = await txt(n.t, "#tax-compare");
  check("P5", "Compare regimes: new, old (no declaration), the difference in rupees, and the answer in words", /New regime/.test(cmp) && /Old regime, with no declaration/.test(cmp) && /Difference/.test(cmp) && /(New|Old) regime is lower/.test(cmp) && /costs ₹[\d,]+ less a year|come to the same/.test(await txt(n.t, "#tax-compare-text")), cmp);
  await n.ctx.close();
  const m = await open("hr", "payroll/payslips.html");
  check("P6", "an HR person's own page has them too", (await m.t.locator("#tax-explain").count()) === 1);
  await m.ctx.close();
}

// ---------- R ----------
if (ONLY.includes("R")) {
  console.log("\n--- R. Payroll run ---");
  const f = await open("fin", "payroll/payroll-run.html?month=2026-11");
  const head = await all(f.t, "#run-rows thead th, table thead th");
  check("R1", "the run's columns from the start month: Employee, State, Gross, PF, ESI, PT, LWF, TDS, Net pay, Employer cost, Status", ["Employee", "State", "Gross", "PF", "ESI", "PT", "LWF", "TDS", "Net pay", "Employer cost", "Status"].every((c) => head.includes(c)), j(head));
  const rows = await f.t.evaluate(() => [...document.querySelectorAll("#run-rows tr")].map((r) => [...r.children].map((c) => c.innerText.replace(/\s+/g, " ").trim())));
  check("R2", "every row names its state (Haryana) and has PF, LWF and an employer cost; the stats say the new rules", rows.length >= 9 && rows.every((r) => r.includes("Haryana")) && /new rules/.test(await txt(f.t, "[data-stat=gross]")) && (await f.t.locator("[data-stat=employer]").count()) === 1, j(rows[0]));
  const tot = await txt(f.t, "#run-statutory");
  check("R3", "the statutory totals: PF, ESI, PT, LWF, TDS, employer contributions, cost to company; challans stay samples", /Provident fund \(employees\)/.test(tot) && /Labour welfare fund/.test(tot) && /Cost to company/.test(tot) && /samples: nothing is filed or paid/.test(tot), tot?.slice(0, 120));
  check("R4", "the Unverified banner, and the Figures note (P5: Draft, not final until approved; the old 'still fix the earlier rules' note is gone)", (await txt(f.t, "#run-unverified"))?.includes(UNVERIFIED) && /^Draft, not final/.test(await txt(f.t, "#run-rules-note") ?? "") && !/still fix/.test(await f.t.evaluate(() => document.body.innerText)));
  const sums = await f.t.evaluate(() => { const g = (k) => Number(document.querySelector(`#run-statutory-totals [data-field=${k}]`).innerText.replace(/[^\d]/g, "")); return [g("pf"), g("lwf")]; });
  const colSum = (name) => rows.reduce((s, r) => s + num(r[head.indexOf(name)]), 0);
  check("R5", "the totals are the columns' sums (PF and LWF)", sums[0] === colSum("PF") && sums[1] === colSum("LWF"), j([sums, colSum("PF"), colSum("LWF")]));
  await f.ctx.close();
  const o = await open("fin", "payroll/payroll-run.html?month=2026-11", { store: START("2026-12") });
  const oh = await all(o.t, "table thead th");
  check("R6", "before the start month the run is as it was: Gross, Deductions, Net pay; no totals card", oh.includes("Deductions") && !oh.includes("ESI") && (await o.t.locator("#run-statutory").count()) === 0);
  await o.ctx.close();
  const a = await open("admin", "payroll/payroll-run.html?month=2026-08");
  check("R7", "a month with no records is still 'No data in this range.'", (await a.t.evaluate(() => document.body.innerText)).includes("No data in this range."));
  await a.ctx.close();
  for (const w of [1280, 412]) {
    const n = await open("fin", "payroll/payroll-run.html?month=2026-11", { width: w });
    check(`R8.${w}`, `${w}: no sideways scroll`, await noScroll(n.t));
    await n.t.screenshot({ path: path.join(SHOTS, `run-${w}.png`), fullPage: true });
    await n.ctx.close();
  }
}

// ---------- T ----------
if (ONLY.includes("T")) {
  console.log("\n--- T. Salary page ---");
  const a = await open("admin", "payroll/salary-structure.html");
  const tpl = await txt(a.t, "#salary-templates");
  check("T1", "the templates: Standard (basic 50% of gross, HRA 50% of basic, medical, conveyance, LTA optional, special the balance) and Intern stipend; no placeholder 'Add component' or dummy rows",
    /Standard/.test(tpl) && /Intern stipend/.test(tpl) && /50% of gross/.test(tpl) && /50% of basic/.test(tpl) && /The balance of the gross/.test(tpl) && /Optional/.test(tpl) && !/not available in this demo/i.test(await txt(a.t, "main") ?? ""), tpl?.slice(0, 160));
  check("T2", "the Admin has Edit on each editable component (not the balancing ones)", (await a.t.locator("[data-edit-component]").count()) === 5 && (await a.t.locator('[data-edit-component="standard:special"]').count()) === 0);
  await a.t.fill("#template-gross", "200000"); await settle(a.t);
  check("T3", "the preview follows the gross typed: 2,00,000 gives a basic of 1,00,000", /1,00,000/.test(await txt(a.t, '[data-template="standard"]')));
  await a.t.click('[data-edit-component="standard:basic"]'); await settle(a.t);
  await a.t.fill("#template-value", "120"); await a.t.click("#template-edit-form button[type=submit], button[form=template-edit-form]"); await settle(a.t);
  check("T4", "an invalid rule is refused by the module, in its words, under the field", /share above 0, up to 1|add up to more than the gross/.test(await txt(a.t, "#template-value-error") ?? ""), await txt(a.t, "#template-edit"));
  await a.t.fill("#template-value", "45"); await a.t.click("button[form=template-edit-form]"); await settle(a.t, 500);
  check("T5", "45% saved: the preview (on 2,00,000) now shows 90,000; a toast says so", /90,000/.test(await txt(a.t, '[data-template="standard"]')) && /Basic salary in Standard is now 45% of gross/.test(await txt(a.t, ".toast-container") ?? ""));
  await a.t.click('tr[data-user-id="EMP-1105"] button:has-text("Breakdown")'); await settle(a.t);
  check("T6", "the person card for the person picked (Arjun; the Admin can't edit their own): template picker, cost to company, the regime (New by default)", (await a.t.locator("#plan-template").count()) === 1 && (await a.t.locator("#salary-ctc table").count()) === 1 && /New regime/.test(await txt(a.t, "#regime-now") ?? ""));
  const ctc = await all(a.t, "#ctc-table tbody tr");
  check("T7", "the CTC view: gross, employer PF, EDLI and admin, ESI, LWF, gratuity accrual, cost to company; a month and a year (the year is twelve times)", ctc.length === 7 && /Gratuity accrual/.test(ctc[5]) && num(ctc[6].split("₹")[2]) === num(ctc[6].split("₹")[1]) * 12, j(ctc));
  // a declaration
  await a.t.fill("#decl-rent", "30000"); await a.t.fill("#decl-invest", "150000"); await a.t.fill("#decl-other", "50000"); await a.t.click("#decl-save"); await settle(a.t, 500);
  check("T8", "the old-regime declaration saves: the pill says Old regime; the proofs note is there", /Old regime/.test(await txt(a.t, "#regime-now") ?? "") && /Proofs are not collected in this demo/.test(await txt(a.t, "#declaration-form") ?? ""));
  await a.t.fill("#decl-rent", "-5"); await a.t.click("#decl-save"); await settle(a.t);
  check("T9", "a negative amount is refused by the module under its field", /whole rupees/.test(await txt(a.t, "#decl-rent-error") ?? ""));
  await a.t.click("#regime-new"); await settle(a.t, 400);
  check("T10", "'Back to the new regime' returns to New regime", /New regime/.test(await txt(a.t, "#regime-now") ?? ""));
  await a.ctx.close();
  const f = await open("fin", "payroll/salary-structure.html");
  await f.t.click('tr[data-user-id="EMP-1105"] button:has-text("Breakdown")'); await settle(f.t);
  check("T11", "Finance reads the templates but has no Edit; can pick a template and record a declaration", (await f.t.locator("[data-edit-component]").count()) === 0 && (await f.t.locator("#plan-save").count()) === 1 && (await f.t.locator("#decl-save").count()) === 1);
  await f.t.selectOption("#plan-template", "intern"); await f.t.click("#plan-save"); await settle(f.t, 500);
  check("T12", "Finance sets the intern stipend template: the preview has one line, 'No PF, ESI or gratuity' says so", /Stipend/.test(await txt(f.t, "#plan-preview") ?? "") && /A stipend: no PF, ESI or gratuity/.test(await txt(f.t, "#salary-plan") ?? ""));
  await f.ctx.close();
  for (const who of ["hr", "emp", "mgr"]) { const n = await open(who, "payroll/salary-structure.html"); check(`T13.${who}`, `${who}: the salary page is the 403 page, as before`, at403(n.t)); await n.ctx.close(); }
  for (const w of [1280, 412]) { const n = await open("admin", "payroll/salary-structure.html", { width: w }); check(`T14.${w}`, `${w}: no sideways scroll`, await noScroll(n.t)); await n.t.screenshot({ path: path.join(SHOTS, `salary-${w}.png`), fullPage: true }); await n.ctx.close(); }
}

// ---------- X ----------
if (ONLY.includes("X")) {
  console.log("\n--- X. Tax page ---");
  const f = await open("fin", "finance/tax-deductions.html");
  check("X1", "Finance's own tax first (how it is worked out, compare regimes), then the company's figures as before", (await f.t.locator("#tax-explain").count()) === 1 && (await f.t.locator("#tax-compare").count()) === 1 && (await f.t.locator("#tax-month").count()) === 1);
  check("X2", "the difference is in words, not colour only", /(lower|same)/.test(await txt(f.t, "#tax-compare-text") ?? "") && (await f.t.locator("#tax-compare .ds-pill").count()) === 1);
  await f.ctx.close();
  for (const who of ["hr", "emp", "mgr"]) { const n = await open(who, "finance/tax-deductions.html"); check(`X3.${who}`, `${who}: the tax page is still the 403 page`, at403(n.t)); await n.ctx.close(); }
  const d = await open("admin", "payroll/payslips.html", { store: { "officeos:pay-structures": { version: 1, templates: {}, people: {}, regimes: { "EMP-1001": { "2026-27": "old" } }, declarations: { "EMP-1001": { "2026-27": { rentMonthly: 40000, metro: true, investments: 150000, other: 50000, declaredOn: "2026-10-01", recordedBy: "EMP-1008" } } }, audit: [] } } });
  const t = await txt(d.t, "#tax-explain"), c = await txt(d.t, "#tax-compare");
  check("X4", "someone on the old regime with a declaration: the explanation says old, shows 'Declared deductions'; the comparison uses the declaration", /old regime/.test(t) && /Declared deductions/.test(t) && /with your declaration/.test(c) && /declaration of 1 Oct 2026/.test(c), c);
  await d.ctx.close();
}

// ---------- Y ----------
if (ONLY.includes("Y")) {
  console.log("\n--- Y. Rates and rules ---");
  const a = await open("admin", "payroll/rates-rules.html");
  const rows = await a.t.locator("#rate-rows tbody tr").count();
  const banner = await txt(a.t, "#unverified-banner");
  check("Y1", "the Admin sees the rows with Verify and Add dated row; the banner counts the unverified rows in its words", rows > 0 && /^\d+ of 90 rows are unverified\./.test(banner) && banner.includes(UNVERIFIED) && (await a.t.locator("#add-rule").count()) === 1 && (await a.t.locator("[data-verify]").count()) > 0, banner);
  const unv0 = Number(/^(\d+)/.exec(banner)[1]);
  check("Y2", "the KPI cards count rows by status (90 rows: 5 confirmed, 11 secondary, 74 unverified, 0 verified)", (await txt(a.t, "#rate-kpis")) === "Rows 90 Confirmed 5 Secondary 11 Unverified 74 Verified by an Admin 0", await txt(a.t, "#rate-kpis"));
  await a.t.selectOption("select >> nth=0", "Haryana"); await settle(a.t);
  const hr = await all(a.t, "#rate-rows tbody tr");
  check("Y3", "the state filter: Haryana has the PT (0, unverified) and the two LWF rows with their sources", hr.length === 3 && hr.some((r) => /^pt Haryana/.test(r) && /Unverified/.test(r)) && hr.filter((r) => /^lwf Haryana/.test(r) && /Confirmed/.test(r)).length === 2, j(hr));
  check("Y4", "each row carries its confidence as a badge (words), its effective date and its source link", hr.every((r) => /(Confirmed|Secondary|Unverified)/.test(r)) && (await a.t.locator("#rate-rows a[href^='https://hrylabour']").count()) === 2);
  await a.t.click('button:has-text("Clear All")'); await settle(a.t);
  await a.t.selectOption("select >> nth=1", "confirmed"); await settle(a.t);
  check("Y5", "the status filter: Confirmed shows the 5 confirmed rows", (await a.t.locator("#rate-rows tbody tr").count()) === 5);
  await a.t.click('button:has-text("Clear All")'); await a.t.fill(".ds-filterbar input[type=search]", "cess"); await settle(a.t);
  check("Y6", "search finds the cess row (unverified, 4%)", (await all(a.t, "#rate-rows tbody tr")).some((r) => /^tax.cess/.test(r) && /Unverified/.test(r)));
  // verify
  await a.t.click('[data-verify="tax.cess@all@2025-04-01"]'); await settle(a.t);
  const ask = await txt(a.t, ".confirm-dialog");
  check("Y7", "Verify asks first and says what it records (name and today's date)", /Verify tax\.cess@all@2025-04-01\?/.test(ask) && /records your name and today's date/.test(ask), ask);
  await a.t.click("[data-confirm-cancel]"); await settle(a.t);
  check("Y8", "Cancel leaves the row unverified", /Not verified/.test((await all(a.t, "#rate-rows tbody tr"))[0]));
  await a.t.click('[data-verify="tax.cess@all@2025-04-01"]'); await a.t.click("[data-confirm-ok]"); await settle(a.t, 500);
  const row = (await all(a.t, "#rate-rows tbody tr"))[0];
  check("Y9", "verified: the row shows who and when (Aarav Mehta, 16 Nov 2026) and its badge; the button reads Verified", /Verified by an Admin/.test(row) && /Aarav Mehta, 16 Nov 2026/.test(row) && (await a.t.locator('[data-verify="tax.cess@all@2025-04-01"]').innerText()) === "Verified" && (await a.t.locator('[data-verify="tax.cess@all@2025-04-01"]').isDisabled()));
  check("Y10", "the banner now counts one fewer", Number(/^(\d+)/.exec(await txt(a.t, "#unverified-banner"))[1]) === unv0 - 1);
  // add a row
  await a.t.click('button:has-text("Clear All")'); await a.t.click("#add-rule"); await settle(a.t);
  await a.t.fill("#rule-from", "2027-04-01"); await a.t.click("button[form=add-rule-form]"); await settle(a.t);
  check("Y11", "an empty source is refused by the module under its field", /Give the source/.test(await txt(a.t, "#rule-source-error") ?? ""));
  await a.t.fill("#rule-source", "https://example.org/pf"); await a.t.selectOption("#rule-key", "pf"); await a.t.fill("#rule-ee", "12"); await a.t.fill("#rule-er", "12"); await a.t.fill("#rule-value", "{bad"); await a.t.click("button[form=add-rule-form]"); await settle(a.t);
  check("Y12", "a value that isn't JSON is refused in words", /valid JSON/.test(await txt(a.t, "#rule-value-error") ?? ""));
  await a.t.fill("#rule-value", '{"wageCeiling": 30000, "epsRate": 0.0833}'); await a.t.click("button[form=add-rule-form]"); await settle(a.t, 500);
  check("Y13", "a dated row is added: a toast, the new row in the table (pf, 1 Apr 2027, Unverified)", /pf@all@2027-04-01 added/.test(await txt(a.t, ".toast-container") ?? ""));
  await a.t.fill(".ds-filterbar input[type=search]", "pf"); await settle(a.t);
  check("Y14", "the new row is listed, unverified, with its source link", (await all(a.t, "#rate-rows tbody tr")).some((r) => /^pf All 12% \/ 12% .*1 Apr 2027/.test(r) && /Unverified/.test(r)) && (await a.t.locator("#rate-rows a[href='https://example.org/pf']").count()) === 1);
  await a.ctx.close();
  const f = await open("fin", "payroll/rates-rules.html");
  check("Y15", "Finance reads: the rows and the banner, no Verify, no Add dated row", (await f.t.locator("#rate-rows tbody tr").count()) > 0 && (await f.t.locator("[data-verify]").count()) === 0 && (await f.t.locator("#add-rule").count()) === 0);
  await f.ctx.close();
  for (const who of ["hr", "emp", "mgr"]) { const n = await open(who, "payroll/rates-rules.html"); check(`Y16.${who}`, `${who}: the 403 page`, at403(n.t)); await n.ctx.close(); }
  for (const w of [1280, 412]) { const n = await open("admin", "payroll/rates-rules.html", { width: w }); check(`Y17.${w}`, `${w}: no sideways scroll`, await noScroll(n.t)); await n.t.screenshot({ path: path.join(SHOTS, `rates-${w}.png`), fullPage: true }); await n.ctx.close(); }
}

// ---------- A ----------
if (ONLY.includes("A")) {
  console.log("\n--- A. Settings > Payroll ---");
  const a = await open("admin", "system/settings.html");
  check("A1", "the Payroll card: the start month (2026-11 until changed) and PF on full wages (off)", (await a.t.inputValue("#pay-start-month")) === "2026-11" && !(await a.t.isChecked("#pay-pf-full")));
  await a.t.fill("#pay-start-month", "2026-12"); await a.t.click("#pay-start-save"); await settle(a.t, 500);
  check("A2", "the start month saves: a toast, 'Now: December 2026'", /start with December 2026/.test(await txt(a.t, ".toast-container") ?? "") && /Now: December 2026/.test(await txt(a.t, "#payroll-settings") ?? ""));
  const p = await page(a.ctx, slipUrl("EMP-1001"));
  check("A3", "and November's payslip is the old one again", (await p.locator("#payslip-employer").count()) === 0);
  await a.t.fill("#pay-start-month", "2026-11"); await a.t.click("#pay-start-save"); await settle(a.t, 400);
  await a.t.check("#pay-pf-full"); await settle(a.t, 500);
  const p2 = await page(a.ctx, slipUrl("EMP-1001"));
  const gross = num(await field(p2, "gross")), basic = num(await field(p2, "basic"));
  check("A4", "PF on full wages: Aarav's PF is 12% of the wages (his basic), not 3,000; the switch is remembered", num(await field(p2, "pf")) === Math.round(basic * 0.12) && basic > 25000 && (await a.t.isChecked("#pay-pf-full")), j([basic, gross, await field(p2, "pf")]));
  const bad = await a.t.fill("#pay-start-month", "").then(() => a.t.evaluate(() => document.querySelector("#pay-start-save").disabled));
  check("A5", "an empty month can't be saved (the button is off)", bad === true);
  await a.ctx.close();
  const f = await open("fin", "system/settings.html");
  check("A6", "Finance has no Settings page (the 403 page, as before)", at403(f.t));
  await f.ctx.close();
}

// ---------- K ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard and names ---");
  const a = await open("admin", "payroll/rates-rules.html");
  await a.t.focus("#add-rule"); await a.t.keyboard.press("Enter"); await settle(a.t);
  check("K1", "Add dated row opens from the keyboard; the dialog is named; Esc closes it", (await a.t.getAttribute("#add-rule-modal", "aria-labelledby")) !== null && (await txt(a.t, "#add-rule-modal h2")) === "Add a dated row");
  await a.t.keyboard.press("Escape"); await settle(a.t);
  check("K2", "Esc closes it", (await a.t.locator("#add-rule-modal").count()) === 0);
  const labels = await a.t.evaluate(() => [...document.querySelectorAll("#main input, #main select, main input, main select")].filter((e) => e.type !== "hidden").every((e) => e.labels?.length || e.getAttribute("aria-label")));
  check("K3", "every field on the page has a name", labels);
  await a.t.focus('[data-verify="pf@all@2014-09-01"]'); await a.t.keyboard.press("Enter"); await settle(a.t);
  check("K4", "Verify from the keyboard asks first; focus is on Cancel (the safe answer)", (await a.t.evaluate(() => document.activeElement?.hasAttribute("data-confirm-cancel"))) === true);
  await a.ctx.close();
  const s = await open("admin", "payroll/salary-structure.html");
  await s.t.focus('[data-edit-component="standard:medical"]'); await s.t.keyboard.press("Enter"); await settle(s.t);
  check("K5", "a component's Edit opens from the keyboard with the field focused", (await s.t.evaluate(() => document.activeElement?.id)) === "template-value");
  await s.ctx.close();
}

// ---------- W ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. Contrast ---");
  const lows = [];
  for (const theme of ["light", "dark"]) for (const [url, who] of [[slipUrl("EMP-1105"), "emp"], ["payroll/rates-rules.html", "admin"], ["payroll/payroll-run.html?month=2026-11", "fin"], ["payroll/payslips.html", "emp"]]) {
    const n = await open(who, url, { theme });
    const r = await n.t.evaluate(() => {
      const rgb = (s) => { const v = (s.match(/[\d.]+/g) ?? []).map(Number); return s.startsWith("color(srgb") ? v.map((x, i) => (i < 3 ? x * 255 : x)) : v; };
      const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const bgOf = (e) => { for (let x = e; x; x = x.parentElement) { const c = rgb(getComputedStyle(x).backgroundColor); if (c.length >= 3 && (c[3] ?? 1) > 0.9) return lum(c); } return 1; };
      const out = [];
      for (const e of document.querySelectorAll(".ds-note--warning, .ds-pill, .ds-note, #payslip-employer dt, #payslip-employer dd, #tax-compare dt")) {
        if (!e.offsetParent) continue;
        const [a, b] = [lum(rgb(getComputedStyle(e).color).slice(0, 3)), bgOf(e)].sort((x, y) => y - x);
        const ratio = (a + 0.05) / (b + 0.05);
        if (ratio < 4.5) out.push([e.className || e.tagName, Math.round(ratio * 100) / 100]);
      }
      return out;
    });
    if (r.length) lows.push(`${theme} ${url}: ${j(r.slice(0, 3))}`);
    await n.ctx.close();
  }
  check("W1", "the Unverified note, the pills and the new cards' text are at least 4.5:1 in both themes", lows.length === 0, j(lows));
}

if (ONLY.includes("E")) check("E1", "no page errors", errs.length === 0, j(errs.slice(0, 5)));
await browser.close();
console.log(`\npay4: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);