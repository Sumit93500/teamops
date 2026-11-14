// P4b's harness (msedge, headless): the leave screens under the tenure leave policy. Read by meaning. usage: node leave4.mjs <app dist>
// <repo root> <shots dir>   [ONLY=MBAVTLPKWE]
// Clock Fri 15 Jan 2027 10:00 IST unless a check says otherwise; the policy starts 2026-12-01 by default (data/pay-settings.js), so
// it applies; leaveFrom is written straight into storage to put today before, at and after the start.
//   M  My leave: the band badge and the next change, the cards, carry-forward / encashment, loss of pay, how it is worked out
//   B  the bands: an employee over a year, one under it, an intern, the exact anniversary day, before the start (as it was)
//   A  Apply for leave: covered / beyond the balance, the confirm before applying leave that would be unpaid
//   V  Leave approvals: the Pay column (would be unpaid), who sees what
//   T  Team leave: the Band column and the policy's balances; a manager sees only their reports
//   L  Leave policy: who sees it, edit through the module's checks, the start date, history, Close leave year (preview, once)
//   P  the profile and the user form: the leave band, read-only
//   K  keyboard and names; W contrast; E no page errors
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, , SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "MBAVTLPKWE";
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srvN = spawn("python", [path.join(HERE, "spa-serve.py"), "9975", DIST], { stdio: "ignore" });
const stop = () => { try { srvN.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9975";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"], rohan: ["Rohan Gupta", "EMP-1042"], ananya: ["Ananya Iyer", "EMP-1017"], meera: ["Meera Joshi", "EMP-1023"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const size = (w) => (w === 412 ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA } : { viewport: { width: w, height: 900 } });
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(8)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 700)}` : ""}`); };
const j = JSON.stringify;
const errs = [];
const FROM = (leaveFrom) => ({ "officeos:pay-settings": { version: 1, statutoryFrom: null, leaveFrom, audit: [] } });

async function context({ width = 1280, theme = "light", at = "2027-01-15T10:00:00+05:30" } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata", colorScheme: theme });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(at));
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
const num = (s) => (s == null ? NaN : Number(String(s).replace(/[^\d.-]/g, "")));
const noScroll = (t) => t.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const at403 = (t) => t.url().includes("/errors/403.html");
const card = (t, type) => txt(t, `#policy-balances [data-type="${type}"]`);
const MY = "leave/my-leave.html";

// ---------- M ----------
if (ONLY.includes("M")) {
  console.log("\n--- M. My leave ---");
  const a = await open("emp", MY);
  check("M1", "Arjun (over a year): the band badge says Over 1 year, with no next change", (await txt(a.t, "#my-band")) === "Over 1 year", await txt(a.t, "#my-band"));
  const cards = await all(a.t, "#policy-balances .balance");
  check("M2", "five cards: casual 12 left of 12 a year; sick 8; earned (1 per 20 days worked); work from home 4 a month; unpaid no limit",
    cards.length === 5 && /^Casual leave 12 a year 12\s*days left/.test(cards[0]) && /^Sick leave 8 a year 8\s*days left/.test(cards[1]) && /^Earned leave 1 per 20 days worked/.test(cards[2]) && /^Work from home 4 a month 4\s*days left/.test(cards[3]) && /^Unpaid leave No limit 0\s*days taken/.test(cards[4]), j(cards));
  check("M3", "the carry-forward and encashment lines: carried in 0; up to 30 days of earned leave at year end; earned leave above 30 days is paid out", /Carried forward into this year\s*0 days/.test(await txt(a.t, "#leave-lines")) && /Up to 30 days of earned leave/.test(await txt(a.t, "[data-field=carry-cap]")) && /above 30 days is paid out/.test(await txt(a.t, "[data-field=encash]")));
  check("M4", "loss of pay: none; and the note that only Unpaid leave is deducted from pay until payroll reads the policy", /^None/.test(await txt(a.t, "#leave-lop-text")) && /only leave applied for as Unpaid leave is deducted/.test(await txt(a.t, "#leave-lop")));
  const how = await all(a.t, "#leave-explain li");
  check("M5", "'How your balance is worked out' in plain words: casual and sick a year, earned per 20 working days, carry-forward and encashment, work from home", how.length === 4 && /Casual leave is 12 days and sick leave 8 days a year/.test(how[0]) && /1 day for every 20 working days/.test(how[1]) && /carry forward/.test(how[2]) && /Work from home is 4 a month/.test(how[3]), j(how));
  check("M6", "the policy's start is named in that card; the history table is still there", /the policy applies from 1 Dec 2026/.test(await txt(a.t, "#leave-how")) && (await a.t.locator("main table tbody tr").count()) > 0);
  await a.ctx.close();
  for (const w of [1280, 412]) { const n = await open("emp", MY, { width: w }); check(`M7.${w}`, `${w}: no sideways scroll`, await noScroll(n.t)); await n.t.screenshot({ path: path.join(SHOTS, `myleave-${w}.png`), fullPage: true }); await n.ctx.close(); }
}

// ---------- B ----------
if (ONLY.includes("B")) {
  console.log("\n--- B. The bands ---");
  const r = await open("rohan", MY);
  check("B1", "Rohan (joined 2 Feb 2026): Under 1 year, 'Over 1 year from 2 Feb 2027'", (await txt(r.t, "#my-band")) === "Under 1 year Over 1 year from 2 Feb 2027", await txt(r.t, "#my-band"));
  const rc = await all(r.t, "#policy-balances .balance");
  check("B2", "a full year in 2027: casual 12, sick 8; earned is usable (joined over 6 months ago)", /^Casual leave 12 a year, pro-rated 12\s*days left/.test(rc[0]) && /^Sick leave 8 a year, pro-rated 8\s*days left/.test(rc[1]) && !/usable from/.test(rc[2]), j(rc));
  check("B3", "the explanation says when they move up", /You move to the Over 1 year band on 2 Feb 2027/.test(await txt(r.t, "#leave-explain")));
  await r.ctx.close();
  const eve = await open("rohan", MY, { at: "2027-02-01T10:00:00+05:30" }), day = await open("rohan", MY, { at: "2027-02-02T10:00:00+05:30" });
  check("B4", "the exact anniversary day: 1 Feb 2027 Under 1 year; 2 Feb 2027 Over 1 year, no next change", (await txt(eve.t, "#my-band")) === "Under 1 year Over 1 year from 2 Feb 2027" && (await txt(day.t, "#my-band")) === "Over 1 year", j([await txt(eve.t, "#my-band"), await txt(day.t, "#my-band")]));
  await eve.ctx.close(); await day.ctx.close();
  const i = await open("ananya", MY);
  const ic = await all(i.t, "#policy-balances .balance");
  check("B5", "Ananya (intern): Intern; casual 1 a month (1 in January), sick and earned not part of the intern leave, nothing carried", (await txt(i.t, "#my-band")) === "Intern" && /^Casual leave 1 a month 1\s*day left/.test(ic[0]) && /Not part of the intern leave/.test(ic[1]) && /Not part of the intern leave/.test(ic[2]) && /None for interns/.test(await txt(i.t, "[data-field=carry-cap]")), j(ic));
  await i.ctx.close();
  const m = await open("meera", MY, { at: "2026-10-06T10:00:00+05:30", store: FROM("2026-10-06") });
  const mc = await all(m.t, "#policy-balances .balance");
  check("B6", "Meera (under a year, 9 earned days taken against 7): loss of pay shown on the card and in the Loss of pay card", /Loss of pay 2 days beyond your balance/.test(mc[2]) && /2 days of earned leave/.test(await txt(m.t, "#leave-lop-text")), j(mc[2]));
  await m.ctx.close();
  const o = await open("emp", MY, { store: FROM("2027-02-01") });
  check("B7", "before the start date the page is as it was: no band badge, no policy cards, the old balance cards", (await o.t.locator("#my-band").count()) === 0 && (await o.t.locator("#policy-balances").count()) === 0 && (await o.t.locator(".balance-grid .balance").count()) === 5);
  await o.ctx.close();
  const e0 = await open("emp", MY, { store: FROM("2027-01-15") });
  check("B8", "on the start day itself the policy applies", (await e0.t.locator("#policy-balances").count()) === 1);
  await e0.ctx.close();
}

// ---------- A ----------
if (ONLY.includes("A")) {
  console.log("\n--- A. Apply for leave ---");
  const a = await open("emp", "leave/apply-leave.html");
  check("A1", "before dates are picked: the card says to pick them", /Pick the dates/.test(await txt(a.t, "#leave-outcome-text")));
  await a.t.fill("#from-date", "2027-01-20"); await a.t.fill("#to-date", "2027-01-20"); await a.t.fill("#leave-reason", "Appointment"); await settle(a.t);
  check("A2", "one casual day in a balance of 12: Covered", /Covered/.test(await txt(a.t, "#leave-outcome-text")) && /All of these days are covered/.test(await txt(a.t, "#leave-outcome-text")));
  await a.ctx.close();
  const i = await open("ananya", "leave/apply-leave.html");
  await i.t.click('label.choice:has-text("Sick leave")'); await i.t.fill("#from-date", "2027-01-20"); await i.t.fill("#to-date", "2027-01-20"); await i.t.fill("#leave-reason", "Fever"); await settle(i.t);
  const out = await txt(i.t, "#leave-outcome-text");
  check("A3", "an intern asking for sick leave: 'Loss of pay: 1 of these 1 days are beyond your balance and would be unpaid. 0 are covered.'", /^Loss of pay 1 day of these 1 day are beyond your balance and would be unpaid\. 0 days are covered\./.test(out), out);
  await i.t.click('button:has-text("Send request")'); await settle(i.t);
  const ask = await txt(i.t, ".confirm-dialog");
  check("A4", "Send asks first, in words, with Apply anyway and Go back", /Apply anyway\?/.test(ask) && /beyond your sick leave balance and would be unpaid \(loss of pay\)/.test(ask) && (await i.t.locator("[data-confirm-ok]").innerText()) === "Apply anyway" && (await i.t.locator("[data-confirm-cancel]").innerText()) === "Go back", ask);
  await i.t.click("[data-confirm-cancel]"); await settle(i.t);
  check("A5", "Go back sends nothing: still on the page, no request yet", i.t.url().includes("apply-leave") && (await i.t.evaluate(() => JSON.parse(localStorage.getItem("officeos:leave-requests") ?? "null")?.records?.filter((r) => r.userId === "EMP-1017" && r.type === "sick").length ?? 0)) === 0);
  await i.t.click('button:has-text("Send request")'); await settle(i.t); await i.t.click("[data-confirm-ok]"); await settle(i.t, 1800);
  check("A6", "Apply anyway sends it: on to My leave, the request listed", i.t.url().includes(MY) && /Sick leave/.test(await txt(i.t, "main")));
  await i.ctx.close();
  const c = await open("emp", "leave/apply-leave.html");
  await c.t.fill("#from-date", "2027-01-20"); await c.t.fill("#to-date", "2027-01-20"); await c.t.fill("#leave-reason", "Appointment"); await c.t.click('button:has-text("Send request")'); await settle(c.t, 1800);
  check("A7", "a covered request sends with no question", c.t.url().includes(MY));
  await c.ctx.close();
  const o = await open("ananya", "leave/apply-leave.html", { store: FROM("2027-02-01") });
  check("A8", "before the start date the page is as it was: no 'Under the leave policy' card", (await o.t.locator("#leave-outcome").count()) === 0);
  await o.ctx.close();
}

// ---------- V ----------
if (ONLY.includes("V")) {
  console.log("\n--- V. Leave approvals ---");
  const mk = async () => {
    const i = await open("ananya", "leave/apply-leave.html");
    await i.t.click('label.choice:has-text("Sick leave")'); await i.t.fill("#from-date", "2027-01-20"); await i.t.fill("#to-date", "2027-01-20"); await i.t.fill("#leave-reason", "Fever");
    await i.t.click('button:has-text("Send request")'); await settle(i.t); await i.t.click("[data-confirm-ok]"); await settle(i.t, 1800);
    const store = await i.t.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith("officeos:")).map((k) => [k, JSON.parse(localStorage.getItem(k))])));
    await i.ctx.close(); return store;
  };
  const store = await mk();
  const store2 = Object.fromEntries(Object.entries(store).filter(([k]) => !k.startsWith("officeos:session")));
  const h = await open("hr", "leave/leave-approvals.html", { store: store2 });
  const head = await all(h.t, "main table thead th");
  check("V1", "HR's pending list has a Pay column", head.includes("Pay"), j(head));
  const rows = await all(h.t, "main table tbody tr");
  const ana = rows.find((r) => /Ananya Iyer/.test(r) && /Sick leave/.test(r));
  check("V2", "Ananya's sick request: 'Would be unpaid: 1 day' (words in a badge)", /Would be unpaid: 1 day/.test(ana ?? ""), ana);
  check("V3", "other pending rows say Paid or name the days that would be unpaid; every pending row has one", rows.every((r) => /(Paid|Would be unpaid)/.test(r)), j(rows.slice(0, 3)));
  await h.ctx.close();
  const o = await open("hr", "leave/leave-approvals.html", { store: { ...store2, ...FROM("2027-02-01") } });
  check("V4", "before the start date no Pay column", !(await all(o.t, "main table thead th")).includes("Pay"));
  await o.ctx.close();
  const e = await open("emp", "leave/leave-approvals.html");
  check("V5", "an employee still has no approvals page (403)", at403(e.t));
  await e.ctx.close();
}

// ---------- T ----------
if (ONLY.includes("T")) {
  console.log("\n--- T. Team leave ---");
  const h = await open("hr", "leave/team-leave.html");
  const head = await all(h.t, "#team-balances thead th");
  const rows = await all(h.t, "#team-balances tbody tr");
  check("T1", "HR: a Band column and the policy's balances: Employee, Band, Casual leave, Sick leave, Earned leave", j(head) === j(["Employee", "Band", "Casual leave", "Sick leave", "Earned leave", "Work from home"]), j(head));
  const row = (n) => rows.find((r) => r.includes(n));
  check("T2", "Arjun: Over 1 year, 12 / 8 days left; Rohan: Under 1 year; Ananya: Intern with casual 1 and no sick or earned", /Arjun Kapoor.*Over 1 year 12 days left 8\s*days left/.test(row("Arjun")) && /Rohan Gupta.*Under 1 year/.test(row("Rohan")) && /Ananya Iyer.*Intern 1 days left 0 days left 0 days left/.test(row("Ananya")), j(rows.slice(0, 4)));
  await h.ctx.close();
  const m = await open("mgr", "leave/team-leave.html");
  const mr = await all(m.t, "#team-balances tbody tr");
  check("T3", "a manager (Sneha) sees only their reports, with the band", mr.length === 2 && mr.every((r) => /(Rohan Gupta|Arjun Kapoor)/.test(r)) && mr.every((r) => /(Under 1 year|Over 1 year)/.test(r)), j(mr));
  await m.ctx.close();
  const o = await open("hr", "leave/team-leave.html", { store: FROM("2027-02-01") });
  check("T4", "before the start date: no Band column", !(await all(o.t, "#team-balances thead th")).includes("Band"));
  await o.ctx.close();
}

// ---------- L ----------
if (ONLY.includes("L")) {
  console.log("\n--- L. Leave policy ---");
  const a = await open("admin", "leave/leave-policy.html");
  check("L1", "the Admin's page: the sample note, the start date, the table by band, the Edit buttons", /Sample numbers These numbers are samples until the company sets its own\. You can edit them below\./.test(await txt(a.t, "#leave-sample")) && /From 1 Dec 2026/.test(await txt(a.t, "#leave-start")) && (await a.t.locator("[data-edit-policy]").count()) === 10, await txt(a.t, "#leave-sample"));
  const cells = await all(a.t, "#leave-bands [data-cell]");
  check("L2", "the numbers: interns casual 1 a month, none, none; under 1 year 12 and 8 a year pro-rated, earned per 20 days usable after 6 months; over 1 year with encashment above 30",
    cells[0] === "1 day a month" && cells[3] === "None" && cells[6] === "None" && /pro-rated by month/.test(cells[1]) && /1 day per 20 days worked; usable after 6 months; carry forward up to 30 days; no encashment/.test(cells[7]) && /encash above 30 days/.test(cells[8]), j(cells));
  await a.t.click('[data-edit-policy="over1:casual"]'); await settle(a.t);
  await a.t.fill("#lp-amount", "13.25"); await a.t.click("button[form=leave-edit-form]"); await settle(a.t);
  check("L3", "a quarter day is refused by the module under the field", /whole or half days/.test(await txt(a.t, "#lp-amount-error") ?? ""), await txt(a.t, "#leave-edit"));
  await a.t.fill("#lp-amount", "14"); await a.t.click("button[form=leave-edit-form]"); await settle(a.t, 500);
  check("L4", "14 saves: the cell reads 14 days a year; a toast; the history says who and what", /14 days a year/.test(await txt(a.t, '[data-cell="over1:casual"]')) && /Over 1 year: Casual leave saved/.test(await txt(a.t, ".toast-container") ?? "") && /Aarav Mehta\. Over 1 year, Casual leave: Days \(a month, or a year\) 14/.test(await txt(a.t, "#lp-history") ?? ""), await txt(a.t, "#lp-history"));
  await a.t.click('[data-edit-policy="over1:earned"]'); await settle(a.t);
  await a.t.fill("#lp-per", "0"); await a.t.click("button[form=leave-edit-form]"); await settle(a.t);
  check("L5", "days worked per earned day of 0 is refused in words", /whole number from 1/.test(await txt(a.t, "#lp-per-error") ?? ""));
  await a.t.keyboard.press("Escape"); await settle(a.t);
  if (await a.t.locator("[data-confirm-ok]").count()) { await a.t.click("[data-confirm-ok]"); await settle(a.t); }   // the discard question
  await a.t.fill("#lp-start", "2027-01-10"); await a.t.click("#lp-start-save"); await settle(a.t);
  check("L6", "a start date in the past is refused with the module's words", /can't start in the past: leave already taken is never rewritten/.test(await txt(a.t, "#leave-start") ?? ""));
  await a.t.fill("#lp-start", "2027-03-01"); await a.t.click("#lp-start-save"); await settle(a.t, 500);
  check("L7", "a later start saves: 'From 1 Mar 2027'; in the history", /From 1 Mar 2027/.test(await txt(a.t, "#leave-start")) && /Policy start set to 1 Mar 2027/.test(await txt(a.t, "#lp-history") ?? ""));
  await a.t.fill("#lp-start", "2026-12-01").catch(() => {});
  await a.ctx.close();
  // year close, on a fresh browser
  const c = await open("admin", "leave/leave-policy.html");
  const years = await all(c.t, "#lp-year option");
  check("L8", "Close a leave year: 2026 and 2025 are offered (both have ended); the preview lists everyone employed by 31 Dec", j(years) === j(["2026", "2025"]) && (await c.t.locator("#leave-close tbody tr").count()) === 10, j(years));
  const pv = await all(c.t, "#leave-close tbody tr");
  const arjunRow = pv.find((r) => r.startsWith("Arjun Kapoor")), ananyaRow = pv.find((r) => r.startsWith("Ananya Iyer"));
  check("L9", "Arjun: Over 1 year on 31 Dec; earned left carried forward; Ananya (intern) carries and loses nothing", /^Arjun Kapoor Over 1 year/.test(arjunRow) && /^Ananya Iyer Intern 0 days 0 days 0 days 0 days$/.test(ananyaRow), j([arjunRow, ananyaRow]));
  const carriedArjun = parseFloat(arjunRow.match(/[\d.]+ days?/g)[1]);
  await c.t.click("#lp-close"); await settle(c.t);
  const q = await txt(c.t, ".confirm-dialog");
  check("L10", "closing asks first and says the totals carried and paid out, once", /Close the 2026 leave year\?/.test(q) && /carried forward: [\d.]+ days? in all/.test(q) && /Paid out \(encashed\): [\d.]+ days?/.test(q) && /closes once/.test(q), q);
  await c.t.click("[data-confirm-cancel]"); await settle(c.t);
  check("L11", "Cancel closes nothing", (await c.t.locator("#lp-closed").count()) === 0);
  await c.t.click("#lp-close"); await c.t.click("[data-confirm-ok]"); await settle(c.t, 600);
  check("L12", "Close: a toast, the year is listed as closed by Aarav Mehta; the button now offers 2025 only", /2026 leave year is closed/.test(await txt(c.t, ".toast-container") ?? "") && /2026: closed by Aarav Mehta on 15 Jan 2027/.test(await txt(c.t, "#lp-closed") ?? "") && j(await all(c.t, "#lp-year option")) === j(["2025"]));
  const myp = await page(c.ctx, MY);
  await c.t.evaluate(() => localStorage.setItem("officeos:session", JSON.stringify({ userLabel: "Arjun Kapoor", employeeId: "EMP-1105", signedInAt: 1790000000000 })));
  await myp.reload(); await myp.waitForLoadState("load"); await settle(myp, 500);
  check("L13", "Arjun's 2027 balance now carries what the preview said", num(await txt(myp, "[data-field=carried-in]")) === carriedArjun, j([await txt(myp, "[data-field=carried-in]"), carriedArjun]));
  await c.ctx.close();
  const f = await open("admin", "leave/leave-policy.html", { at: "2026-11-16T10:00:00+05:30" });
  check("L14", "while 2026 hasn't ended: only 2025 can be closed; and 'the 2026 leave year can be closed from 1 January 2027' once everything that ended is closed", (await all(f.t, "#lp-year option")).includes("2025") && !(await all(f.t, "#lp-year option")).includes("2026"));
  await f.ctx.close();
  const h = await open("hr", "leave/leave-policy.html");
  check("L15", "HR reads: the table and the history, no Edit, no Save start date, no Close", (await h.t.locator("[data-edit-policy]").count()) === 0 && (await h.t.locator("#lp-start-save").count()) === 0 && (await h.t.locator("#lp-close").count()) === 0 && /You can't|An Admin can edit them/.test(await txt(h.t, "#leave-sample")) && (await h.t.locator("#leave-bands").count()) === 1);
  await h.ctx.close();
  for (const who of ["fin", "emp", "mgr"]) { const n = await open(who, "leave/leave-policy.html"); check(`L16.${who}`, `${who}: the 403 page`, at403(n.t)); await n.ctx.close(); }
  for (const w of [1280, 412]) { const n = await open("admin", "leave/leave-policy.html", { width: w }); check(`L17.${w}`, `${w}: no sideways scroll`, await noScroll(n.t)); await n.t.screenshot({ path: path.join(SHOTS, `policy-${w}.png`), fullPage: true }); await n.ctx.close(); }
}

// ---------- P ----------
if (ONLY.includes("P")) {
  console.log("\n--- P. Profile and user form ---");
  const h = await open("hr", "users/user-profile.html?id=EMP-1042");
  check("P1", "Rohan's profile: the Leave band row, read-only: 'Under 1 year, over 1 year from 2 Feb 2027'", /Leave band\s*Under 1 year, over 1 year from 2 Feb 2027/.test(await txt(h.t, "#profile-details") ?? ""), await txt(h.t, "#profile-details"));
  await h.ctx.close();
  const f = await open("hr", "users/user-form.html?id=EMP-1042&section=employment");
  check("P2", "the user form's employment type says the band under the field", /Leave band: Under 1 year, over 1 year from 2 Feb 2027/.test(await txt(f.t, "#emp-type-hint") ?? ""), await txt(f.t, "#emp-type-hint"));
  await f.ctx.close();
  const o = await open("hr", "users/user-profile.html?id=EMP-1042", { store: FROM("2027-02-01") });
  check("P3", "before the start date the profile is as it was", !/Leave band/.test(await txt(o.t, "#profile-details") ?? ""));
  await o.ctx.close();
}

// ---------- K ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard and names ---");
  const a = await open("admin", "leave/leave-policy.html");
  await a.t.focus('[data-edit-policy="intern:casual"]'); await a.t.keyboard.press("Enter"); await settle(a.t);
  check("K1", "Edit opens from the keyboard; the dialog is named", (await a.t.getAttribute("#leave-edit", "aria-labelledby")) !== null && /Intern: Casual leave/.test(await txt(a.t, "#leave-edit h2") ?? ""));
  await a.t.keyboard.press("Escape"); await settle(a.t);
  check("K2", "Esc closes it", (await a.t.locator("#leave-edit").count()) === 0);
  check("K3", "every field has a name", await a.t.evaluate(() => [...document.querySelectorAll("main input, main select")].filter((e) => e.type !== "hidden").every((e) => e.labels?.length || e.getAttribute("aria-label"))));
  await a.t.focus("#lp-close"); await a.t.keyboard.press("Enter"); await settle(a.t);
  check("K4", "Close leave year from the keyboard asks first with Cancel focused", (await a.t.evaluate(() => document.activeElement?.hasAttribute("data-confirm-cancel"))) === true);
  await a.ctx.close();
  const m = await open("emp", "leave/apply-leave.html");
  check("K5", "the policy card is a named region of the form's aside", (await m.t.locator("#leave-outcome h3").innerText()) === "Under the leave policy");
  await m.ctx.close();
}

// ---------- W ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. Contrast ---");
  const lows = [];
  for (const theme of ["light", "dark"]) for (const [url, who] of [[MY, "meera"], ["leave/leave-policy.html", "admin"], ["leave/apply-leave.html", "ananya"], ["leave/team-leave.html", "hr"]]) {
    const n = await open(who, url, { theme, at: who === "meera" ? "2026-10-06T10:00:00+05:30" : "2027-01-15T10:00:00+05:30", store: who === "meera" ? FROM("2026-10-06") : {} });
    if (url === "leave/apply-leave.html") { await n.t.click('label.choice:has-text("Sick leave")'); await n.t.fill("#from-date", "2027-01-20"); await n.t.fill("#to-date", "2027-01-20"); await settle(n.t); }
    const r = await n.t.evaluate(() => {
      const rgb = (s) => { const v = (s.match(/[\d.]+/g) ?? []).map(Number); return s.startsWith("color(srgb") ? v.map((x, i) => (i < 3 ? x * 255 : x)) : v; };
      const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const bgOf = (e) => { for (let x = e; x; x = x.parentElement) { const c = rgb(getComputedStyle(x).backgroundColor); if (c.length >= 3 && (c[3] ?? 1) > 0.9) return lum(c); } return 1; };
      const out = [];
      for (const e of document.querySelectorAll(".ds-note--warning, .ds-pill, .band .ds-pill, .balance__meta, #leave-outcome .badge, #leave-lop p, #leave-explain li, .badge--warning")) {
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
  check("W1", "the band pills, the loss-of-pay and policy cards are at least 4.5:1 in both themes", lows.length === 0, j(lows));
}

if (ONLY.includes("E")) check("E1", "no page errors", errs.length === 0, j(errs.slice(0, 5)));
await browser.close();
console.log(`\nleave4: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);