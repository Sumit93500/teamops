// F2's harness (msedge, headless): new joiners, the sign-in pages, counters, rebuilt sections, lockout requests and bank details
// in the React app. Read by meaning (words, attributes, storage), never by pixels.
// usage: node f2.mjs <app dist> <repo root> <shots dir>   [ONLY=LJOPUBFKCWX]
// Clock: Mon 16 Nov 2026 10:00 IST. Isha Verma (EMP-1999, a copy of Arjun's record) joins on 1 Dec 2026.
//   L  sign-in: the brand panel beside the card at 1280 (the company's name from its profile, a product line, three points),
//      hidden at 412 where the card names the company; the demo's accounts in their own section under the card; the footer
//      "© 2026 <company> · Powered by OfficeOS"; Show / Hide; empty, malformed and wrong sign-ins say so; the 5th wrong one says
//      "Too many attempts. Try again after HH:MM, ..."; forgot, reset and set-password pages built the same way
//   J  a future joiner: Mark attendance says "Joins on 1 Dec 2026" and can't check in; nothing counted before joining
//   O  counters: Offices' "Who works where" says "N people" with nothing filtered, "Showing 1 of N people" with a search; the
//      joiner listed "joins on 1 Dec 2026", not counted as working
//   P  rebuilt sections: no placeholder page in any role's navigation; each placeholder URL shows "This section is being
//      rebuilt." with Back to dashboard (the role's landing); no placeholder or round wording anywhere in app/src
//   U  lockout: the Admin's inbox, bell and dashboard have the locked account (Unlock now / Dismiss); Unlock now unlocks; the
//      users list's Locked badge and Sign-in filter; the profile's lock banner with Unlock (Admin), without it (HR); HR's inbox
//      has no unlock request
//   B  bank details: "entered by hand" help; the profile shows filled fields first and the empty ones under "Not added (N)",
//      collapsed, with Add; Finance's edit: the bank name fills in from the IFSC, the account typed twice, a mismatch said at
//      the field; saved and masked
//   F  the employee form's Pay and tax: the note, IFSC to bank name, a company's PAN and a mistyped Aadhaar refused at the field
//   K  keyboard: sign-in's order (email, password, Show, Forgot password, Sign in); "Not added" opens with Enter
//   C  contrast: the brand panel, the demo section, Not added, the rebuilt page, the lock banner, light and dark (4.5:1)
//   W  no sideways scroll at 412 and 1280, light and dark, on every changed page; shots
//   X  no page or console errors
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, ROOT, SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "LJOPUBFKCWX";
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srv = spawn("python", [path.join(HERE, "spa-serve.py"), "9975", DIST], { stdio: "ignore" });
const stop = () => { try { srv.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9975";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"], joiner: ["Isha Verma", "EMP-1999"] };
const LANDING = { admin: "/pages/dashboard/admin.html", hr: "/pages/dashboard/hr.html", fin: "/pages/dashboard/finance.html", emp: "/pages/dashboard/employee.html", mgr: "/pages/dashboard/employee.html" };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const size = (w) => (w === 412 ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA } : { viewport: { width: w, height: 900 } });
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(16)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 600)}` : ""}`); };
const j = JSON.stringify;
const errs = [];
const NOW = "2026-11-16T10:00:00+05:30";
const LOCKED = /^Too many attempts\. Try again after \d\d:\d\d, or ask your administrator to unlock your account\.$/;
const COMPANY = "Northwind Technologies Pvt. Ltd.";

// open a page as someone (null: signed out). joiner: Isha is added once the users store exists; lock: Arjun's 5 wrong
// sign-ins first (on the sign-in page, signed out), then the session.
async function open(who, page, { width = 1280, theme = "light", joiner = false, lock = false } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata", colorScheme: theme });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(NOW));
  await ctx.addInitScript(([th]) => {
    if (localStorage.getItem("f2:seeded")) return;
    localStorage.clear(); localStorage.setItem("f2:seeded", "1");
    localStorage.setItem("officeos:prefs", JSON.stringify({ theme: th }));
  }, [theme]);
  const t = await ctx.newPage();
  t.on("pageerror", (e) => errs.push(`${who} ${page}: ${e.message}`));
  t.on("console", (m) => { if (m.type() === "error") errs.push(`${who} ${page}: console ${m.text()}`); });
  const as = async (w) => t.evaluate(([w, th]) => { localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 })); localStorage.setItem(`officeos:prefs:${w[1]}`, JSON.stringify({ theme: th })); }, [w, theme]);
  await t.goto(N + "/pages/auth/login.html"); await t.waitForLoadState("load");   // the origin's storage, before the session
  if (lock) {
    for (let i = 0; i < 5; i++) { await t.fill("#email", "arjun.kapoor@northwind.com"); await t.fill("#password", `wrong-${i}`); await t.click('#main button[type="submit"]'); await t.waitForTimeout(200); }
  }
  if (joiner) {
    await as(WHO.admin);
    await t.goto(N + "/pages/dashboard/admin.html"); await t.waitForLoadState("load"); await t.waitForTimeout(300);
    await t.evaluate(() => {
      const box = JSON.parse(localStorage.getItem("officeos:users"));
      if (box.records.some((u) => u.id === "EMP-1999")) return;
      const a = box.records.find((u) => u.id === "EMP-1105");
      box.records.push({ ...a, id: "EMP-1999", name: "Isha Verma", email: "isha.verma@northwind.com", dateOfJoining: "1 Dec 2026", bankAccount: null, bankAccountLast4: null, pan: null });
      localStorage.setItem("officeos:users", JSON.stringify(box));
    });
  }
  if (who) await as(WHO[who]);
  else await t.evaluate(() => localStorage.removeItem("officeos:session"));
  await t.goto(N + "/pages/" + page); await t.waitForLoadState("load");
  await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(450);
  return { ctx, t };
}
const settle = (t, ms = 350) => t.waitForTimeout(ms);
const text = (t, sel) => t.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const visible = (t, sel) => t.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; }, sel);
const toast = (t) => t.evaluate(() => [...document.querySelectorAll(".toast, .ds-toast")].map((x) => x.innerText.trim()).join(" | "));

// ---------- L ----------
if (ONLY.includes("L")) {
  console.log("\n--- L. Sign-in pages ---");
  let n = await open(null, "auth/login.html");
  check("L1", "1280: the brand panel beside the card, with the company's name, a product line and three points", await visible(n.t, "aside.auth-brand") && (await text(n.t, ".auth-brand__name > span:last-child")) === COMPANY
    && (await n.t.$$eval(".auth-brand__points li", (l) => l.length)) === 3 && /attendance, leave and pay/.test(await text(n.t, ".auth-brand__line")), await text(n.t, "aside.auth-brand"));
  check("L2", "the demo's accounts in their own section under the card (not inside it), 4 role buttons", (await n.t.$(".auth-card .auth-demo")) === null && (await n.t.$$eval("section.auth-demo [data-demo-role]", (b) => b.length)) === 4);
  check("L3", "the footer: \"© 2026 <company> · Powered by OfficeOS\"", (await text(n.t, ".app-footer--auth")) === `© 2026 ${COMPANY} · Powered by OfficeOS`, await text(n.t, ".app-footer--auth"));
  await n.t.fill("#password", "secret"); await n.t.click(".pw-control__toggle");
  check("L4", "Show shows the password, Hide hides it", (await n.t.getAttribute("#password", "type")) === "text" && (await n.t.getAttribute(".pw-control__toggle", "aria-pressed")) === "true");
  await n.t.click(".pw-control__toggle"); await n.t.fill("#password", "");
  await n.t.click('#main button[type="submit"]'); await settle(n.t);
  const empty = await text(n.t, "#auth-message");
  await n.t.fill("#email", "arjun.kapoor"); await n.t.fill("#password", "x"); await n.t.click('#main button[type="submit"]'); await settle(n.t);
  const shape = await text(n.t, "#auth-message");
  check("L5", "nothing typed, then a malformed email: each says what to do", empty === "Enter your work email and your password." && shape === "Enter your work email, like name@company.com.", `${empty} | ${shape}`);
  const tries = [];
  for (let i = 0; i < 5; i++) { await n.t.fill("#email", "arjun.kapoor@northwind.com"); await n.t.fill("#password", `wrong-${i}`); await n.t.click('#main button[type="submit"]'); await settle(n.t, 250); tries.push(await text(n.t, "#auth-message")); }
  check("L6", "a wrong password says so; the 5th: \"Too many attempts. Try again after 10:15, or ask your administrator ...\"", !LOCKED.test(tries[0]) && LOCKED.test(tries[4]) && tries[4].includes("10:15"), j(tries));
  await n.ctx.close();
  n = await open(null, "auth/login.html", { width: 412 });
  check("L7", "412: the brand panel is hidden; the card names the company", !(await visible(n.t, "aside.auth-brand")) && (await visible(n.t, ".auth-card__brand")) && (await text(n.t, ".auth-card__brand > span:last-child")) === COMPANY);
  await n.ctx.close();
  const same = [];
  for (const page of ["auth/forgot-password.html", "auth/reset-password.html?token=nope", "auth/set-password.html?token=nope"]) {
    n = await open(null, page);
    same.push([page, await visible(n.t, "aside.auth-brand"), await visible(n.t, ".auth-card"), (await text(n.t, ".app-footer--auth"))?.startsWith("© 2026"), (await n.t.$("section.auth-demo")) === null]);
    await n.ctx.close();
  }
  check("L8", "forgot, reset and set-password: the same brand panel, card and footer (no demo section)", same.every((s) => s.slice(1).every(Boolean)), j(same));
}

// ---------- J ----------
if (ONLY.includes("J")) {
  console.log("\n--- J. A future joiner ---");
  let n = await open("joiner", "attendance/mark-attendance.html", { joiner: true });
  check("J1", "Mark attendance: \"Joins on 1 Dec 2026\"; check-in can't be used before then", (await text(n.t, "#punch-status")) === "Joins on 1 Dec 2026" && /starts on your joining date, 1 Dec 2026/.test(await text(n.t, "#punch-note"))
    && await n.t.evaluate(() => { const b = document.getElementById("check-in-btn"); return !b || b.disabled || b.hidden; }), await text(n.t, "#punch-status"));
  await n.ctx.close();
  n = await open("joiner", "attendance/my-attendance.html", { joiner: true });
  const body = await text(n.t, "#main");
  check("J2", "My attendance: no absences before joining (nothing counted)", !/\b[1-9]\d* absent/i.test(body) && !/Absent\s+[1-9]/.test(body), body.slice(0, 300));
  await n.ctx.close();
}

// ---------- O ----------
if (ONLY.includes("O")) {
  console.log("\n--- O. Counters ---");
  const n = await open("admin", "company/offices.html", { joiner: true });
  const meta0 = await text(n.t, "#people-card .ds-card__meta");
  const rows0 = await n.t.$$eval("#people-card tbody tr", (r) => r.length);
  check("O1", "nothing filtered: \"N people, 1 joining soon\", every person listed, no \"Showing\"", meta0 === `${rows0} people, 1 joining soon` && !/Showing/.test(meta0), `${meta0} (${rows0} rows)`);
  check("O2", "the joiner listed \"joins on 1 Dec 2026\"; People working counts only those already working", /Isha Verma.*joins on 1 Dec 2026/.test(await text(n.t, "#people-card tbody")) && (await text(n.t, "#main")).includes(`People working ${rows0 - 1}`), (await text(n.t, ".ds-stat, .ds-kpis"))?.slice(0, 200));
  await n.t.locator("#people-card input[type='search']").fill("kapoor"); await settle(n.t, 500);
  const meta1 = await text(n.t, "#people-card .ds-card__meta");
  check("O3", "a search on: \"Showing 1 of N people\"", meta1 === `Showing 1 of ${rows0} people`, meta1);
  await n.ctx.close();
}

// ---------- P ----------
if (ONLY.includes("P")) {
  console.log("\n--- P. Rebuilt sections ---");
  const PLACE = ["announcements/announcements.html",
    "recruitment/job-openings.html", "recruitment/candidates.html", "system/reports.html", "system/audit-log.html", "system/backup.html", "access/delegation.html", "access/approval-workflows.html",
    "account/notifications.html", "account/sessions.html"];
  const inNav = [];
  for (const who of ["admin", "hr", "fin", "emp", "mgr"]) {
    const n = await open(who, LANDING[who].replace("/pages/", ""));
    const hrefs = await n.t.$$eval("a[href]", (a) => a.map((x) => new URL(x.href).pathname));
    for (const p of PLACE) if (hrefs.includes(`/pages/${p}`)) inNav.push([who, p]);
    await n.ctx.close();
  }
  check("P1", "no placeholder page is linked anywhere on any role's landing page (navigation included)", !inNav.length, j(inNav));
  const bad = [];
  for (const [i, p] of PLACE.entries()) {
    const who = p.startsWith("account/") ? "emp" : "admin";   // the account pages are everyone's; the rest the Admin can open
    const n = await open(who, p);
    const title = await text(n.t, "#rebuilding-title"), back = await n.t.getAttribute("#rebuilding-back", "href").catch(() => null);
    if (title !== "This section is being rebuilt." || !back?.endsWith(LANDING[who]) || /demo|round|sample|not built/i.test(await text(n.t, "#main"))) bad.push([p, who, title, back]);
    if (i === 0) { await n.t.click("#rebuilding-back"); await settle(n.t); if (new URL(n.t.url()).pathname !== LANDING[who]) bad.push(["back", n.t.url()]); }
    await n.ctx.close();
  }
  check("P2", `each of the ${PLACE.length} placeholder URLs shows the neutral page with Back to dashboard (the role's landing)`, !bad.length, j(bad));
  // no placeholder or round wording left in the app's code (comments and the developer's Gallery page aside)
  const PHRASES = /not built yet|isn't built yet|not available in this demo|coming soon|sample page|in a later round/i, ROUNDS = /\b[Rr]ound \d+[A-Z]?\b(?! of)/;
  const WORDS = { test: (s) => PHRASES.test(s) || ROUNDS.test(s) };
  const hits = [];
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(jsx?|css)$/.test(f.name) && f.name !== "Gallery.jsx") {
    fs.readFileSync(p, "utf8").split(/\r?\n/).forEach((l, i) => { const code = l.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "").replace(/\{\/\*.*?\*\/\}/g, ""); if (!/^\s*(\*|\/\*)/.test(l) && WORDS.test(code)) hits.push(`${path.relative(ROOT, p)}:${i + 1}`); }); } } };
  walk(path.join(ROOT, "app", "src"));
  check("P3", "no placeholder or round wording in app/src outside comments (Gallery aside)", !hits.length, j(hits.slice(0, 12)));
}

// ---------- U ----------
if (ONLY.includes("U")) {
  console.log("\n--- U. Lockout requests ---");
  let n = await open("admin", "requests/approvals-inbox.html", { lock: true });
  const row = await text(n.t, "[data-unlock]");
  check("U1", "the Admin's inbox: \"Locked account: Arjun Kapoor\", 5 failed sign-ins, with Dismiss and Unlock now", /Locked account: Arjun Kapoor/.test(row) && /5 failed sign-ins/.test(row) && /Dismiss/.test(row) && /Unlock now/.test(row), row);
  check("U2", "the bell counts it", Number((await n.t.getAttribute("button[aria-label^='Waiting for you']", "aria-label")).match(/\d+/)[0]) >= 1);
  await n.t.click("[data-unlock] button:has-text('Unlock now')"); await settle(n.t);
  const ask = await text(n.t, ".confirm-dialog__question");
  await n.t.click("[data-confirm-ok]"); await settle(n.t, 500);
  const cred = await n.t.evaluate(() => JSON.parse(localStorage.getItem("officeos:credentials") ?? "{}"));
  const acc = cred.accounts?.["EMP-1105"] ?? cred["EMP-1105"] ?? {};
  check("U3", "Unlock now asks \"Unlock this account now?\", then unlocks (no lock, the count cleared) and the row is gone", /Unlock this account now\?/.test(ask) && !acc.lockedUntil && !acc.failedCount && (await n.t.$("[data-unlock]")) === null, `${ask} ${j(acc).slice(0, 200)}`);
  await n.ctx.close();
  n = await open("admin", "dashboard/admin.html", { lock: true });
  check("U4", "the Admin's dashboard lists it with the other approvals", /Locked account: Arjun Kapoor/.test(await text(n.t, "#main")));
  await n.ctx.close();
  n = await open("admin", "users/users-list.html", { lock: true });
  check("U5", "the users list: a Locked badge on Arjun's row", (await n.t.$$("[data-locked='EMP-1105']")).length === 1);
  await n.t.selectOption("select:near(:text('Sign-in'))", "locked").catch(async () => { const s = await n.t.$$("select"); for (const x of s) { const o = await x.$$eval("option", (os) => os.map((q) => q.value)); if (o.includes("locked")) { await x.selectOption("locked"); break; } } });
  await settle(n.t, 400);
  const names = await n.t.$$eval("tbody tr", (r) => r.map((x) => x.innerText.replace(/\s+/g, " ")));
  check("U6", "the Sign-in filter: Locked shows Arjun alone", names.length === 1 && /Arjun Kapoor/.test(names[0]) && /Locked/.test(names[0]), j(names));
  await n.ctx.close();
  n = await open("admin", "users/user-profile.html?id=EMP-1105", { lock: true });
  const banner = await text(n.t, "#profile-lock");
  await n.t.click("#profile-unlock"); await settle(n.t, 400);
  check("U7", "the profile: \"Sign-in locked.\" with Unlock for the Admin; Unlock lifts it", /Sign-in locked\./.test(banner) && (await n.t.$("#profile-lock")) === null && /can sign in again/.test(await toast(n.t)), banner);
  await n.ctx.close();
  n = await open("hr", "users/user-profile.html?id=EMP-1105", { lock: true });
  check("U8", "HR sees the banner without Unlock (accounts:unlock is the Admin's)", (await n.t.$("#profile-lock")) !== null && (await n.t.$("#profile-unlock")) === null);
  await n.ctx.close();
  n = await open("hr", "requests/approvals-inbox.html", { lock: true });
  check("U9", "HR's inbox has no unlock request", (await n.t.$("[data-unlock]")) === null);
  await n.ctx.close();
}

// ---------- B ----------
if (ONLY.includes("B")) {
  console.log("\n--- B. Bank details on the profile ---");
  let n = await open("hr", "users/user-profile.html?id=EMP-1105");
  const pay = await n.t.evaluate(() => { const c = document.getElementById("profile-pay"); const d = c.querySelector("details.pf-missing"); return { shown: [...c.querySelectorAll(".pf-kv > div")].map((x) => x.dataset.field), missing: [...c.querySelectorAll("details.pf-missing li")].map((x) => x.dataset.field), open: d?.open, summary: d?.querySelector("summary").innerText }; });
  check("B1", "Pay and tax: filled fields shown (account, PAN, salary), the empty ones under \"Not added (N)\", collapsed", j(pay.shown) === j(["bankAccount", "pan", "salary"]) && pay.missing.includes("ifsc") && pay.missing.includes("branch") && pay.open === false && pay.summary === `Not added (${pay.missing.length})`, j(pay));
  check("B2", "no wall of \"Not given\" on the profile", !(await text(n.t, "#main")).includes("Not given"));
  await n.ctx.close();
  n = await open("fin", "users/user-profile.html?id=EMP-1105");
  await n.t.evaluate(() => { document.querySelector("#profile-pay details.pf-missing").open = true; });
  await n.t.click("#profile-pay [data-add='ifsc']"); await settle(n.t);
  check("B3", "Add on IFSC opens the edit form at the IFSC", (await n.t.evaluate(() => document.activeElement?.id)) === "pf-ifsc");
  check("B4", "the help says bank details are entered by hand, and the branch is typed", /entered by hand/.test(await text(n.t, "#profile-pay")) && /branch lookup arrives with the backend/.test(await text(n.t, "#profile-pay")));
  await n.t.fill("#pf-ifsc", "hdfc0001234"); await settle(n.t, 150);
  check("B5", "typing the IFSC: capitals, and the bank name fills in (HDFC Bank)", (await n.t.inputValue("#pf-ifsc")) === "HDFC0001234" && (await n.t.inputValue("#pf-bankName")) === "HDFC Bank");
  await n.t.fill("#pf-bankAccount", "123456789012"); await n.t.fill("#pf-bankAccount-confirm", "123456789000");
  await n.t.click("#profile-pay button[type='submit']"); await settle(n.t);
  check("B6", "the account typed differently twice: said at the confirm field, nothing saved", /don't match/.test(await text(n.t, "#pf-bankAccount-confirm-error") ?? "") && (await n.t.$("#pf-ifsc")) !== null);
  await n.t.fill("#pf-bankAccount-confirm", "123456789012");
  await n.t.click("#profile-pay button[type='submit']"); await settle(n.t, 500);
  const after = await text(n.t, "#profile-pay");
  check("B7", "saved: the IFSC and HDFC Bank shown; the account masked to its last 4", /HDFC0001234/.test(after) && /HDFC Bank/.test(after) && /9012/.test(after) && !after.includes("123456789012"), after.slice(0, 300));
  await n.ctx.close();
  n = await open("emp", "account/my-profile.html");
  await n.t.evaluate(() => { const d = document.querySelector("#profile-pay details.pf-missing"); if (d) d.open = true; });
  await n.t.click("#profile-pay [data-add='ifsc']").catch(() => {}); await settle(n.t);
  check("B8", "the person's own Add opens \"Ask for a change\" (Finance or HR checks it)", /Finance or HR checks/.test(await text(n.t, "#profile-pay")) && (await n.t.evaluate(() => document.activeElement?.id)) === "pf-ifsc");
  await n.ctx.close();
}

// ---------- F ----------
if (ONLY.includes("F")) {
  console.log("\n--- F. The employee form's Pay and tax ---");
  const n = await open("hr", "users/user-form.html?id=EMP-1105&section=pay");
  check("F1", "the note: entered by hand, not fetched or verified", /entered by hand.*doesn't fetch or verify/.test(await text(n.t, "#pay-entered")));
  await n.t.fill("#ifsc", "icic0004321"); await settle(n.t, 150);
  check("F2", "IFSC in capitals, the bank name ICICI Bank", (await n.t.inputValue("#ifsc")) === "ICIC0004321" && (await n.t.inputValue("#bank-name")) === "ICICI Bank");
  await n.t.fill("#ifsc", "ZZZZ0004321"); await settle(n.t, 150);
  check("F3", "an unknown bank code: the name stays to type, with a hint saying so", /isn't in our list/.test(await text(n.t, "#bank-name-hint") ?? ""));
  await n.t.fill("#ifsc", "ICIC0004321");
  await n.t.fill("#pan", "abccd1234f"); await n.t.fill("#aadhaar", "234567150124");
  await n.t.click("button:has-text('Save changes')"); await settle(n.t, 400);
  check("F4", "a company's PAN and a mistyped Aadhaar: each refused at its field, nothing saved", /P as the 4th letter/.test(await text(n.t, "#pan-error") ?? "") && /last digit checks/.test(await text(n.t, "#aadhaar-error") ?? ""), `${await text(n.t, "#pan-error")} | ${await text(n.t, "#aadhaar-error")}`);
  await n.ctx.close();
  // a new employee with the joining date left empty joins today (16 Nov 2026), never as if long-serving
  const a = await open("hr", "users/user-form.html");
  await a.t.fill("#first-name", "Tara"); await a.t.fill("#last-name", "Sen"); await a.t.click("#uf-next"); await settle(a.t);
  await a.t.fill("#work-email", "tara.sen@northwind.com"); await a.t.click("#uf-next"); await settle(a.t);
  await a.t.selectOption("#department", { label: "Engineering" }); await a.t.selectOption("#designation", { label: "Software Engineer" });
  await a.t.click('[data-step="review"]'); await settle(a.t);
  await a.t.waitForFunction(() => [...document.querySelectorAll("#review dt")].some((dt) => dt.textContent === "Date of joining" && dt.offsetParent), null, { timeout: 4000 }).catch(() => {});
  const shown = (await a.t.evaluate(() => Object.fromEntries([...document.querySelectorAll("#review dt")].map((dt) => [dt.textContent, dt.nextElementSibling.innerText.trim()]))))["Date of joining"];
  await a.t.click('.uf-actions button[type="submit"]'); await settle(a.t, 800);
  const made = await a.t.evaluate(() => JSON.parse(localStorage.getItem("officeos:users")).records.find((u) => u.email === "tara.sen@northwind.com"));
  check("F5", "Add employee with the joining date left empty: Review says \"16 Nov 2026 (today)\" and the record joins on 16 Nov 2026", shown === "16 Nov 2026 (today)" && made?.dateOfJoining === "16 Nov 2026", `${shown} | ${made?.dateOfJoining}`);
  await a.ctx.close();
}

// ---------- K ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard ---");
  let n = await open(null, "auth/login.html");
  await n.t.focus("#email");
  const order = [];
  for (let i = 0; i < 4; i++) { await n.t.keyboard.press("Tab"); order.push(await n.t.evaluate(() => document.activeElement?.id || document.activeElement?.className || document.activeElement?.textContent)); }
  check("K1", "sign-in's Tab order: email, password, Show, Forgot password, Sign in", j(order) === j(["password", "pw-control__toggle", "link", "ds-btn ds-btn--primary"]), j(order));
  await n.ctx.close();
  n = await open("hr", "users/user-profile.html?id=EMP-1105");
  await n.t.focus("#profile-pay details.pf-missing > summary"); await n.t.keyboard.press("Enter"); await settle(n.t, 200);
  check("K2", "\"Not added\" opens with Enter", await n.t.evaluate(() => document.querySelector("#profile-pay details.pf-missing").open));
  await n.ctx.close();
}

// ---------- C ----------
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
async function pairs(t, sels) {
  return t.evaluate((sels) => {
    const rgb = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (m) return m[1].split(/[ ,/]+/).filter(Boolean).map(Number); const k = c.match(/color\(srgb ([^)]+)\)/); return k ? k[1].trim().split(/\s+/).slice(0, 3).map((x) => Math.round(Number(x) * 255)) : null; };
    const bgOf = (e) => { for (let x = e; x; x = x.parentElement) { const c = rgb(getComputedStyle(x).backgroundColor); if (c && (c.length < 4 || c[3] > 0.5)) return c.slice(0, 3); } return [255, 255, 255]; };
    return sels.flatMap((s) => [...document.querySelectorAll(s)].slice(0, 3).map((e) => [s, rgb(getComputedStyle(e).color)?.slice(0, 3), bgOf(e)]));
  }, sels);
}
if (ONLY.includes("C")) {
  console.log("\n--- C. Contrast ---");
  for (const theme of ["light", "dark"]) {
    const low = [];
    for (const [who, page, sels, opt] of [[null, "auth/login.html", [".auth-brand__name", ".auth-brand__line", ".auth-brand__points strong", ".auth-brand__points li > span:last-child", ".auth-demo__title", ".auth-demo .ds-hint", ".auth-card__lead", ".app-footer--auth span"]],
      ["hr", "users/user-profile.html?id=EMP-1105", [".pf-missing > summary", ".pf-missing__list > li > span", ".pf-missing__list .ds-btn", "#profile-lock"], { lock: true }], ["admin", "system/reports.html", [".rebuilding__title", ".rebuilding__text"]]]) {
      const n = await open(who, page, { theme, ...(opt ?? {}) });
      await n.t.evaluate(() => document.querySelectorAll("details.pf-missing").forEach((d) => { d.open = true; }));
      for (const [s, f, b] of await pairs(n.t, sels)) if (!f || ratio(f, b) < 4.5) low.push([page.split("/")[1], s, f && ratio(f, b).toFixed(2)]);
      await n.ctx.close();
    }
    check(`C1.${theme}`, `${theme}: the brand panel, demo section, Not added, lock banner and rebuilt page are 4.5:1 or more`, !low.length, j(low));
  }
}

// ---------- W ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. Widths and shots ---");
  const PAGES = [[null, "auth/login.html"], [null, "auth/forgot-password.html"], [null, "auth/reset-password.html?token=nope"], ["admin", "company/offices.html"], ["admin", "system/reports.html"], ["admin", "requests/approvals-inbox.html"],
    ["admin", "users/users-list.html"], ["hr", "users/user-profile.html?id=EMP-1105"], ["emp", "account/my-profile.html"], ["hr", "users/user-form.html?id=EMP-1105&section=pay"], ["joiner", "attendance/mark-attendance.html"],
    ["admin", "dashboard/admin.html"], ["hr", "dashboard/hr.html"], ["emp", "dashboard/employee.html"], ["admin", "system/settings.html"], ["emp", "requests/my-requests.html"]];
  for (const theme of ["light", "dark"]) for (const width of [412, 1280]) {
    const wide = [];
    for (const [who, page] of PAGES) {
      const n = await open(who, page, { width, theme, joiner: who === "joiner", lock: page.includes("inbox") || page.includes("users-list") });
      const over = await n.t.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 1) wide.push([page, over]);
      if (theme === "light" || width === 412) await n.t.screenshot({ path: path.join(SHOTS, `${page.split("/")[1].split(/[.?]/)[0]}-${who ?? "out"}-${width}-${theme}.png`), fullPage: true });
      await n.ctx.close();
    }
    check(`W.${width}.${theme}`, `${width} ${theme}: no sideways scroll on the ${PAGES.length} changed pages`, !wide.length, j(wide));
  }
}

if (ONLY.includes("X")) check("X1", "no page or console errors", errs.length === 0, j(errs.slice(0, 5)));
console.log(`\nF2 harness: passed ${passed}, failed ${failed} (${Math.round((Date.now() - t0) / 1000)} s)`);
await browser.close();
stop();
process.exit(failed ? 1 : 0);