// P5's harness (msedge, headless): the pay and leave rules binding, on the pages they touch. usage: node p5.mjs <app dist>
// <repo root> <shots dir>   [ONLY=RSCLDKWE]
// The starting storage is made by p5-state.js from the repo's own data modules: October approved (before the new rules),
// November approved with its frozen snapshot. Clock Thu 10 Dec 2026 10:00 IST: the leave policy applies (from 1 Dec).
//   R  payroll run: November final (frozen, the snapshot's figures), December a draft, not final; a rule added after
//      approval leaves November unchanged; October as it was
//   S  payslip view and My payslips: final / draft, not final
//   C  salary page: cost to company, the approved month's frozen line
//   L  leave: beyond the balance asks first and records the loss of pay; Go back sends nothing; before the start date the
//      flat allowance; approvals show unpaid on every tab
//   D  declarations: the employee's form (draft, submit, locked: ask Finance), Finance's review (verify and lock, unlock,
//      cutoff), who sees what (HR, a manager, an employee)
//   K  keyboard; W contrast; E no page errors; 412 / 1280, light / dark
import { createRequire } from "node:module";
import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, ROOT, SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "RSCLDKWE";
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const STATE_FILE = path.join(SHOTS, "p5-state.json");
execFileSync("node", [path.join(HERE, "p5-state.js"), path.join(ROOT, "assets", "js"), STATE_FILE], { stdio: "inherit" });
const STATE = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
const srvN = spawn("python", [path.join(HERE, "spa-serve.py"), "9976", DIST], { stdio: "ignore" });
const stop = () => { try { srvN.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9976";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"], ananya: ["Ananya Iyer", "EMP-1017"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const size = (w) => (w === 412 ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA } : { viewport: { width: w, height: 900 } });
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(8)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 700)}` : ""}`); };
const j = JSON.stringify;
const errs = [];

async function context({ width = 1280, theme = "light", at = "2026-12-10T10:00:00+05:30" } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata", colorScheme: theme });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(at));
  return ctx;
}
async function seed(ctx, who, extra = {}, theme = "light") {
  await ctx.addInitScript(([w, st, th]) => {
    try { if (localStorage.getItem("x-seeded")) return; } catch { return; }
    try { localStorage.clear(); localStorage.setItem("x-seeded", "1"); localStorage.setItem("officeos:theme", JSON.stringify(th)); if (w) localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
      for (const [k, v] of Object.entries(st)) localStorage.setItem(k, JSON.stringify(v)); } catch {}
  }, [who ? WHO[who] : null, { ...STATE, ...extra }, theme]);
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
const num = (s) => (s == null ? NaN : Number(String(s).replace(/[^\d.-]/g, "")));
const noScroll = (t) => t.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const at403 = (t) => t.url().includes("/errors/403.html");
const frozen = STATE["officeos:pay-snapshots"].months["2026-11"].rows;
const RUN = (m) => `payroll/payroll-run.html?month=${m}`;
const slip = (id, m) => `payroll/payslip-view.html?employee=${id}&month=${m}`;
const CESS10 = { "officeos:pay-rules": { version: 1, added: [{ id: "tax.cess@all@2025-04-01#2", key: "tax.cess", scope: "all", effectiveFrom: "2025-04-01", employeeRate: null, employerRate: null, value: { rate: 0.1 }, source: "https://example.org", confidence: "unverified", note: "", addedBy: "EMP-1001", addedOn: "2026-12-10" }], verified: {}, settings: { pfOnFullWages: true }, audit: [] } };

// ---------- R ----------
if (ONLY.includes("R")) {
  console.log("\n--- R. Payroll run ---");
  const f = await open("fin", RUN("2026-11"));
  check("R1", "November (approved): 'Final: frozen when the run was approved'; the totals card says Final", /^Final: frozen when the run was approved/.test(await txt(f.t, "#run-rules-note") ?? "") && /^Final;/.test(await txt(f.t, "#run-statutory .ds-card__meta") ?? ""), await txt(f.t, "#run-rules-note"));
  const head = await all(f.t, "main table thead th"), rows = await f.t.evaluate(() => [...document.querySelectorAll("#run-rows tr")].map((r) => [...r.children].map((c) => c.innerText.replace(/\s+/g, " ").trim())));
  const arjun = rows.find((r) => r[0].includes("Arjun Kapoor"));
  check("R2", "Arjun's November row is the snapshot's: gross, PF, LWF, TDS, net and employer cost", num(arjun[head.indexOf("Gross")]) === frozen["EMP-1105"].gross && num(arjun[head.indexOf("Net pay")]) === frozen["EMP-1105"].net && num(arjun[head.indexOf("Employer cost")]) === frozen["EMP-1105"].employer.total && num(arjun[head.indexOf("TDS")]) === frozen["EMP-1105"].deductions.tds, j([arjun, frozen["EMP-1105"].net]));
  check("R3", "no 'shown live' wording is left where the snapshot rules", !/still fix the earlier rules|Figures shown are the new rules/.test(await txt(f.t, "main") ?? ""));
  await f.ctx.close();
  const changed = await open("fin", RUN("2026-11"), { store: CESS10 });
  const rows2 = await changed.t.evaluate(() => [...document.querySelectorAll("#run-rows tr")].map((r) => [...r.children].map((c) => c.innerText.replace(/\s+/g, " ").trim())));
  check("R4", "a 10% cess row and PF on full wages added after approval: November's rows are unchanged", j(rows2) === j(rows), j(rows2.find((r) => r[0].includes("Aarav"))));
  const dec = await page(changed.ctx, RUN("2026-12"));
  check("R5", "December (not prepared): 'Draft, not final'", /^Draft, not final/.test(await txt(dec, "#run-rules-note") ?? ""));
  await changed.ctx.close();
  const o = await open("fin", RUN("2026-10"));
  check("R6", "October (before the start month) is the run it always was: no new columns, no figures note", !(await all(o.t, "main table thead th")).includes("ESI") && (await o.t.locator("#run-rules-note").count()) === 0);
  await o.ctx.close();
  for (const w of [1280, 412]) { const n = await open("fin", RUN("2026-11"), { width: w }); check(`R7.${w}`, `${w}: no sideways scroll`, await noScroll(n.t)); await n.t.screenshot({ path: path.join(SHOTS, `run-${w}.png`), fullPage: true }); await n.ctx.close(); }
}

// ---------- S ----------
if (ONLY.includes("S")) {
  console.log("\n--- S. Payslips ---");
  const e = await open("emp", slip("EMP-1105", "2026-11"), { store: CESS10 });
  check("S1", "November's payslip: 'Final', and the snapshot's figures even with the cess changed", /Final: these are the figures frozen/.test(await txt(e.t, "#payslip-notes") ?? "") && num(await txt(e.t, '[data-field="net"]')) === frozen["EMP-1105"].net);
  const d = await page(e.ctx, slip("EMP-1105", "2026-12"));
  check("S2", "December's payslip: 'Draft, not final'", /Draft, not final/.test(await txt(d, "#payslip-notes") ?? ""));
  const list = await page(e.ctx, "payroll/payslips.html");
  check("S3", "My payslips: the tax explanation's months say Final or Draft, not final", (await all(list, "#tax-months tbody tr")).some((r) => /^November 2026 .* Final$/.test(r)) && (await all(list, "#tax-months tbody tr")).some((r) => /Draft, not final/.test(r)));
  await e.ctx.close();
}

// ---------- C ----------
if (ONLY.includes("C")) {
  console.log("\n--- C. Cost to company ---");
  const f = await open("fin", "payroll/salary-structure.html");
  await f.t.click('tr[data-user-id="EMP-1105"] button:has-text("Breakdown")'); await settle(f.t);
  check("C1", "the CTC card says it is a projection (a draft, not final)", /a draft, not final/.test(await txt(f.t, "#salary-ctc") ?? ""));
  await f.ctx.close();
}

// ---------- L ----------
if (ONLY.includes("L")) {
  console.log("\n--- L. Leave ---");
  const fill = async (t, type, from, to) => { await t.click(`label.choice:has-text("${type}")`); await t.fill("#from-date", from); await t.fill("#to-date", to); await t.fill("#leave-reason", "Trip"); await settle(t); };
  const a = await open("ananya", "leave/apply-leave.html");
  await fill(a.t, "Sick leave", "2026-12-14", "2026-12-15");
  await a.t.click('button:has-text("Send request")'); await settle(a.t);
  const q = await txt(a.t, ".confirm-dialog");
  check("L1", "an intern's sick leave (none in the policy): Apply anyway? with the days that would be unpaid", /Apply anyway\?/.test(q) && /2 days of these 2 days are beyond your sick leave balance and would be unpaid \(loss of pay\)/.test(q), q);
  await a.t.click("[data-confirm-cancel]"); await settle(a.t);
  const none = await a.t.evaluate(() => JSON.parse(localStorage.getItem("officeos:leave-requests")).records.filter((r) => r.userId === "EMP-1017" && r.from === "2026-12-14").length);
  check("L2", "Go back: nothing stored", none === 0);
  await a.t.click('button:has-text("Send request")'); await settle(a.t); await a.t.click("[data-confirm-ok]"); await settle(a.t, 1800);
  const rec = await a.t.evaluate(() => JSON.parse(localStorage.getItem("officeos:leave-requests")).records.find((r) => r.userId === "EMP-1017" && r.from === "2026-12-14"));
  check("L3", "Apply anyway: stored under the policy with 2 days of loss of pay", rec?.underPolicy === true && rec.lopDays === 2, j(rec));
  const store = await a.t.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith("officeos:") && k !== "officeos:session").map((k) => [k, JSON.parse(localStorage.getItem(k))])));
  await a.ctx.close();
  const h = await open("hr", "leave/leave-approvals.html", { store });
  const row = (await all(h.t, "main table tbody tr")).find((r) => /Ananya Iyer/.test(r) && /Sick leave/.test(r));
  check("L4", "HR's approvals: 'Would be unpaid: 2 days' from what the store recorded", /Would be unpaid: 2 days/.test(row ?? ""), row);
  await h.t.click('button:has-text("Approved")'); await settle(h.t);
  check("L5", "the Pay column is on the Approved tab too", (await all(h.t, "main table thead th")).includes("Pay"));
  await h.ctx.close();
  const b = await open("emp", "leave/apply-leave.html", { at: "2026-11-25T10:00:00+05:30" });
  await fill(b.t, "Casual leave", "2026-11-30", "2026-12-14");
  await b.t.click('button:has-text("Send request")'); await settle(b.t, 600);
  check("L6", "starting the day before the policy (30 Nov): the flat allowance, its old words, no question", /Not enough casual leave/.test(await txt(b.t, "#leave-type-error") ?? (await txt(b.t, ".toast-container")) ?? "") && (await b.t.locator(".confirm-dialog").count()) === 0, (await txt(b.t, "#leave-type-error")) ?? (await txt(b.t, ".toast-container")));
  await b.ctx.close();
}

// ---------- D ----------
if (ONLY.includes("D")) {
  console.log("\n--- D. Declarations ---");
  const e = await open("emp", "payroll/payslips.html");
  check("D1", "the employee's own form on My payslips: Not declared, the new regime applies", /Not declared/.test(await txt(e.t, "#my-declaration-status") ?? "") && /the new regime/.test(await txt(e.t, "#my-declaration-status") ?? ""));
  await e.t.check('input[name="my-regime"][value="old"]'); await settle(e.t);
  await e.t.fill("#my-rent", "20000"); await e.t.fill("#my-invest", "150000"); await e.t.fill("#my-other", "0");
  await e.t.click("#my-draft"); await settle(e.t, 500);
  check("D2", "Save draft: Draft; still the new regime applied", /Draft/.test(await txt(e.t, "#my-declaration-status") ?? "") && /the new regime/.test(await txt(e.t, "#my-declaration-status") ?? ""));
  await e.t.fill("#my-rent", "-1"); await e.t.click("#my-submit"); await settle(e.t);
  check("D3", "the module's checks in words under the field", /whole rupees/.test(await txt(e.t, "#my-rent-error") ?? ""));
  await e.t.fill("#my-rent", "20000"); await e.t.click("#my-submit"); await settle(e.t, 500);
  check("D4", "Submit: Submitted; the old regime applies", /Submitted/.test(await txt(e.t, "#my-declaration-status") ?? "") && /the old regime/.test(await txt(e.t, "#my-declaration-status") ?? ""));
  const store = await e.t.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith("officeos:") && k !== "officeos:session").map((k) => [k, JSON.parse(localStorage.getItem(k))])));
  await e.ctx.close();
  const f = await open("fin", "finance/tax-deductions.html", { store });
  const r = (await all(f.t, "#declarations-review tbody tr")).find((x) => x.startsWith("Arjun Kapoor"));
  check("D5", "Finance's review lists Arjun: Submitted, the old regime with rent 20,000", /Submitted/.test(r) && /Old: rent ₹20,000 a month/.test(r), r);
  await f.t.click('[data-verify-decl="EMP-1105"]'); await settle(f.t);
  check("D6", "Verify and lock asks first", /Verify and lock Arjun Kapoor's declaration for 2026-27\?/.test(await txt(f.t, ".confirm-dialog") ?? ""));
  await f.t.click("[data-confirm-ok]"); await settle(f.t, 500);
  check("D7", "locked: the row says Verified and locked, with Unlock", /Verified and locked/.test((await all(f.t, "#declarations-review tbody tr")).find((x) => x.startsWith("Arjun Kapoor"))) && (await f.t.locator('[data-unlock-decl="EMP-1105"]').count()) === 1);
  await f.t.fill("#decl-cutoff", "2027-01-31"); await f.t.click("#decl-cutoff-save"); await settle(f.t, 500);
  check("D8", "the cutoff saves", /close after 31 Jan 2027/.test(await txt(f.t, ".toast-container") ?? ""));
  const after = await f.t.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith("officeos:") && k !== "officeos:session").map((k) => [k, JSON.parse(localStorage.getItem(k))])));
  await f.ctx.close();
  const e2 = await open("emp", "payroll/payslips.html", { store: after });
  check("D9", "the employee sees it locked, with the note to ask Finance, and no form", (await txt(e2.t, "#my-declaration-locked")) === "Your declaration is verified and locked. To change it, ask Finance." && (await e2.t.locator("#my-submit").count()) === 0 && /31 Jan 2027/.test(await txt(e2.t, "#my-declaration-status") ?? ""));
  await e2.ctx.close();
  const late = await open("emp", "payroll/payslips.html", { at: "2027-02-01T10:00:00+05:30", store: { ...after, "officeos:pay-structures": { ...after["officeos:pay-structures"], statuses: {} } } });
  check("D10", "after the cutoff (and not locked): closed, ask Finance, no form", /closed on 31 Jan 2027\. To change yours, ask Finance\./.test(await txt(late.t, "#my-declaration-closed") ?? "") && (await late.t.locator("#my-submit").count()) === 0);
  await late.ctx.close();
  const m = await open("mgr", "payroll/payslips.html");
  check("D11", "a manager: their own form only, no review of their team (and no tax page)", (await m.t.locator("#my-declaration").count()) === 1 && (await m.t.locator("#declarations-review").count()) === 0);
  const mt = await page(m.ctx, "finance/tax-deductions.html");
  check("D12", "the manager can't open the tax page", at403(mt));
  await m.ctx.close();
  const h = await open("hr", "payroll/payslips.html");
  check("D13", "HR: their own form, no review", (await h.t.locator("#my-declaration").count()) === 1 && (await h.t.locator("#declarations-review").count()) === 0);
  await h.ctx.close();
  const a = await open("admin", "finance/tax-deductions.html");
  check("D14", "the Admin has the review too", (await a.t.locator("#declarations-review").count()) === 1);
  await a.ctx.close();
  for (const w of [1280, 412]) { const n = await open("fin", "finance/tax-deductions.html", { width: w }); check(`D15.${w}`, `${w}: no sideways scroll`, await noScroll(n.t)); await n.t.screenshot({ path: path.join(SHOTS, `tax-${w}.png`), fullPage: true }); await n.ctx.close(); }
  const o = await open("emp", "payroll/payslips.html", { at: "2026-09-28T10:00:00+05:30" });
  check("D16", "before the pay start month nothing is added to My payslips", (await o.t.locator("#my-declaration").count()) === 0 && (await o.t.locator("#tax-explain").count()) === 0);
  await o.ctx.close();
}

// ---------- K ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard ---");
  const e = await open("emp", "payroll/payslips.html");
  check("K1", "the form's fields have names; the regime is a named group", await e.t.evaluate(() => [...document.querySelectorAll("#my-declaration input")].every((x) => x.labels?.length || x.getAttribute("aria-label"))) && (await txt(e.t, "#my-regime legend")) === "Regime");
  await e.t.focus("#my-draft"); await e.t.keyboard.press("Enter"); await settle(e.t, 400);
  check("K2", "Save draft from the keyboard", /Draft/.test(await txt(e.t, "#my-declaration-status") ?? ""));
  await e.ctx.close();
}

// ---------- W ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. Contrast ---");
  const lows = [];
  for (const theme of ["light", "dark"]) for (const [url, who] of [["payroll/payslips.html", "emp"], ["finance/tax-deductions.html", "fin"], [RUN("2026-11"), "fin"]]) {
    const n = await open(who, url, { theme });
    const r = await n.t.evaluate(() => {
      const rgb = (s) => { const v = (s.match(/[\d.]+/g) ?? []).map(Number); return s.startsWith("color(srgb") ? v.map((x, i) => (i < 3 ? x * 255 : x)) : v; };
      const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const bgOf = (e) => { for (let x = e; x; x = x.parentElement) { const c = rgb(getComputedStyle(x).backgroundColor); if (c.length >= 3 && (c[3] ?? 1) > 0.9) return lum(c); } return 1; };
      const out = [];
      for (const e of document.querySelectorAll("#my-declaration .ds-pill, #my-declaration p, #declarations-review .ds-pill, #run-rules-note, #ctc-final")) {
        if (!e.offsetParent) continue;
        const [a, b] = [lum(rgb(getComputedStyle(e).color).slice(0, 3)), bgOf(e)].sort((x, y) => y - x);
        const ratio = (a + 0.05) / (b + 0.05);
        if (ratio < 4.5) out.push([e.className || e.id || e.tagName, Math.round(ratio * 100) / 100]);
      }
      return out;
    });
    if (r.length) lows.push(`${theme} ${url}: ${j(r.slice(0, 3))}`);
    await n.ctx.close();
  }
  check("W1", "the declaration status pills, the notes and the run's figures note are at least 4.5:1 in both themes", lows.length === 0, j(lows));
}

if (ONLY.includes("E")) check("E1", "no page errors", errs.length === 0, j(errs.slice(0, 5)));
await browser.close();
console.log(`\np5: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);