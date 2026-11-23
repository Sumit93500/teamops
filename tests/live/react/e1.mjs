// E1's harness (msedge, headless): sign-in accounts and the whole employee record. Read by meaning (words, attributes, the
// DOM, storage), never by pixels. usage: node e1.mjs <app dist> <repo root> <shots dir>   [ONLY=LNFRDPMATKEWXGB]
// Clock Mon 16 Nov 2026 10:00 IST unless a check moves it; fresh storage for each context.
//   L  Sign in: the page (labels, Show / Hide, Forgot, demo buttons; no "part of this demo"); a wrong password and an unknown
//      email get the same words, focused; the demo password signs a seeded person in; the role buttons still work; 5 wrong
//      tries lock (the right password then refused too)
//   N  a new employee: an Admin creates one in the form (IT1: HR's goes to IT as a request); "Share these sign-in details" once (a 14-character temporary password, the
//      48-hour link, copy buttons, "Email delivery arrives with the backend"); nothing secret in storage; invited on the
//      profile; their first sign-in goes to Set password and every other URL sends them back; the rules and the meter;
//      afterwards their landing page, active; the invite link then says it was used
//   F  Forgot password: the same page for a real and an unknown email; the Admin's Mail outbox has the reset mail (no secret
//      stored; Open link in this tab); the reset page sets a new password and it signs in; an expired link (61 minutes
//      later), a tampered one, none at all: each says so, with Ask for a new link
//   R  an Admin's help on the profile: a locked person shows Locked and Unlock works; Disable sign-in (asked first) ends their
//      session at the next step, with the reason on the sign-in page; Enable; HR sends a reset link (shown once); the
//      account events are listed for the Admin, never a secret
//   D  the record as each one sees it: HR / Admin every section; Finance team and pay fields (no birth date, Aadhaar,
//      addresses); the manager team fields only (no Pay section, no bank, PAN, Aadhaar, birth date in the DOM at all); another
//      employee can't see it; no raw bank account, PAN or Aadhaar anywhere in the page's HTML until Show (pii:view or the
//      person); Show for Finance only on salary
//   P  the person's own profile: edit phone and emergency contacts (rows added, a row's error), saved; "Ask for a change" of
//      the bank account; Finance reviews it from the approval card and approves; the masked number follows; HR sees the
//      change history (masked) and the completeness with what's missing
//   M  My account pages: the Appearance tab on all four; Change password is real (wrong current refused, the rules, then
//      signs in with the new one)
//   A  no "not available in this demo" on the sign-in pages or the profiles
//   T  storage: no plain password or token in any stored value after every flow (scanned)
//   K  keyboard: the sign-in form by Tab and Enter; the profile's Edit and Save by keyboard; focus to the message on errors
//   E  contrast: the sign-in pages' text and messages, light and dark
//   W  shots: the sign-in pages and states at 412, 768 and 1280, light and dark; profiles as every role, masked and shown;
//      the share dialog, the outbox, change password
//   G  (E1b) demo mode off (a build with config/demo.js mode false): no demo hint, no role buttons, the demo password refused;
//      on, the hint and four buttons; Disable sign-in is the Admin's own permission (accounts:disable)
//   B  (E1b) the team pages' names: HR and Admin get a profile link on every row, a manager only on their direct reports
//      (through the router: no page load), an employee without reports can't open the pages; the profile a manager opens
//   X  no page or console errors
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, , SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "LNFRDPMATKEWXGB";
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srvN = spawn("python", [path.join(HERE, "spa-serve.py"), "9972", DIST], { stdio: "ignore" });
const stop = () => { try { srvN.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9972";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"], ananya: ["Ananya Iyer", "EMP-1017"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const size = (w) => (w === 412 ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA } : { viewport: { width: w, height: 900 } });
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(16)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 600)}` : ""}`); };
const j = JSON.stringify;
const errs = [];
const NOW = "2026-11-16T10:00:00+05:30";
const DEMO = "Northwind@2026";
const INVALID = "That email and password don't match. Check them and try again.";
const LOCKED_RE = /^Too many attempts\. Try again after \d\d:\d\d, or ask your administrator to unlock your account\.$/;   // F2: the words carry the time
const RESET_SENT = "If an account uses that email, a link to reset its password is on its way. The link works once, for 60 minutes.";
const secrets = new Set();

async function open(who, page, { width = 1280, theme = "light", now = NOW, seed = null } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata", permissions: ["clipboard-read", "clipboard-write"] });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(now));
  await ctx.addInitScript(([w, th, sd]) => {
    if (sessionStorage.getItem("u-set") || localStorage.getItem("e1:seeded")) return;
    sessionStorage.setItem("u-set", "1"); localStorage.clear(); localStorage.setItem("e1:seeded", "1");
    localStorage.setItem("officeos:theme", JSON.stringify(th));
    if (w) {
      localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
      localStorage.setItem(`officeos:prefs:${w[1]}`, JSON.stringify({ theme: th }));
    } else localStorage.setItem("officeos:prefs", JSON.stringify({ theme: th }));
    if (sd) for (const [k, v] of Object.entries(sd)) localStorage.setItem(k, JSON.stringify(v));
  }, [who ? WHO[who] : null, theme, seed]);
  const t = await ctx.newPage();
  t.on("pageerror", (e) => errs.push(`${who} ${page}: ${e.message}`));
  t.on("console", (m) => { if (m.type() === "error") errs.push(`${who} ${page}: console ${m.text()}`); });
  await t.goto(N + "/pages/" + page); await t.waitForLoadState("load");
  await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(500);
  return { ctx, t };
}
const settle = (t, ms = 350) => t.waitForTimeout(ms);
const text = (t, sel) => t.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const path_ = (t) => new URL(t.url()).pathname;
const navTo = (t, href) => t.evaluate((h) => { window.history.pushState({}, "", h); window.dispatchEvent(new PopStateEvent("popstate")); }, href);
const storage = (t) => t.evaluate(() => Object.keys(localStorage).map((k) => `${k}=${localStorage.getItem(k)}`).join("\n"));
async function scan(t, label) {
  const all = await storage(t);
  const leaks = [...secrets].filter((s) => s && (all.includes(s) || all.includes(encodeURIComponent(s))));
  check(`T.${label}`, `${label}: no plain password or token in any stored value (${secrets.size} known)`, !leaks.length, leaks.length);
}
async function signIn(t, email, password) {
  await t.fill("#email", email); await t.fill("#password", password);
  await t.click('form button[type="submit"]'); await t.waitForTimeout(900);
}
async function signOut(t) {
  await t.click('button[aria-label="Account menu"]'); await settle(t, 150);
  await t.click("[data-signout]"); await settle(t, 500);
}
const tokenOf = (link) => decodeURIComponent(link.split("token=")[1] ?? "");

// ---------- L ----------
if (ONLY.includes("L")) {
  console.log("\n--- L. Sign in ---");
  const n = await open(null, "auth/login.html");
  const t = n.t;
  const page = await t.evaluate(() => ({ h1: document.querySelector("h1")?.textContent, email: document.querySelector('label[for="email"]')?.textContent, pw: document.querySelector('label[for="password"]')?.textContent,
    type: document.getElementById("password")?.type, forgot: [...document.querySelectorAll("a")].some((a) => a.textContent === "Forgot password?"), demo: document.querySelectorAll("[data-demo-role]").length,
    old: /part of this demo|isn't available in this demo/.test(document.body.textContent) }));
  check("L1", "the page: Sign in, labelled Work email and Password, the password hidden, Forgot password?, 4 demo buttons, no demo disclaimers", page.h1 === "Sign in" && /Work email/.test(page.email) && /Password/.test(page.pw) && page.type === "password" && page.forgot && page.demo === 4 && !page.old, j(page));
  await t.fill("#password", "abc"); await t.click(".pw-control__toggle"); const shown = await t.getAttribute("#password", "type"); await t.click(".pw-control__toggle");
  check("L2", "Show / Hide turns the password into text and back, with aria-pressed", shown === "text" && (await t.getAttribute("#password", "type")) === "password" && (await t.getAttribute(".pw-control__toggle", "aria-pressed")) === "false");
  await signIn(t, "arjun.kapoor@northwind.com", "wrong-guess-1");
  const m1 = await t.evaluate(() => ({ text: document.getElementById("auth-message")?.textContent, role: document.getElementById("auth-message")?.getAttribute("role"), focus: document.activeElement?.id }));
  await signIn(t, "nobody.here@northwind.com", "wrong-guess-1");
  const m2 = await t.evaluate(() => document.getElementById("auth-message")?.textContent);
  check("L3", "a wrong password and an unknown email: the same words, an alert that takes focus", m1.text === INVALID && m2 === INVALID && m1.role === "alert" && m1.focus === "auth-message", j([m1, m2]));
  await signIn(t, "arjun.kapoor@northwind.com", DEMO);
  check("L4", "the demo password signs Arjun in: his dashboard", path_(t).endsWith("dashboard/employee.html"), path_(t));
  await signOut(t);
  await t.click('[data-demo-role="hr"]'); await settle(t, 700);
  check("L5", "the HR demo button still signs in, to the HR dashboard", path_(t).endsWith("dashboard/hr.html"));
  await signOut(t);
  for (let i = 0; i < 5; i++) await signIn(t, "kabir.shah@northwind.com", `nope-${i}`);
  const locked = await text(t, "#auth-message");
  await signIn(t, "kabir.shah@northwind.com", DEMO);
  check("L6", "5 wrong tries lock; then even the right password is refused with the same words", LOCKED_RE.test(locked ?? "") && (await text(t, "#auth-message")) === locked && path_(t).endsWith("auth/login.html"), locked);
  await n.ctx.clock.setFixedTime(new Date("2026-11-16T10:16:00+05:30"));
  await signIn(t, "kabir.shah@northwind.com", DEMO);
  check("L7", "16 minutes later the lock is over: Kabir signs in", path_(t).endsWith("dashboard/finance.html"), path_(t));
  await n.ctx.close();
}

// ---------- N ----------
let invite = null;
if (ONLY.includes("N")) {
  console.log("\n--- N. A new employee ---");
  // IT1 (behaviour; was HR): HR's new employee opens a new-account request for IT (no details shown; tests/live/itdesk.mjs A), so the
  // direct flow, "Share these sign-in details", is the Admin's (flagged as an override on the IT review trail)
  const n = await open("admin", "users/user-form.html");
  const t = n.t;
  await t.fill("#first-name", "Meghna"); await t.fill("#last-name", "Rao");
  await t.click('[data-step="contact"]'); await t.fill("#work-email", "meghna.rao@northwind.com");
  await t.click('[data-step="employment"]'); await t.selectOption("#department", { label: "Engineering" }); await t.selectOption("#designation", { label: "Software Engineer" }); await t.fill("#joining", "2026-11-16");
  await t.click('[data-step="review"]'); await settle(t, 200);
  await t.click('.uf-actions button[type="submit"]'); await t.waitForTimeout(1500);
  const share = await t.evaluate(() => ({ title: document.querySelector("#share-modal .modal__title, #share-modal h2")?.textContent, temp: document.getElementById("share-temp")?.textContent, link: document.getElementById("share-link")?.textContent,
    copies: [...document.querySelectorAll("#share-details button")].map((b) => b.textContent), words: document.getElementById("share-details")?.textContent }));
  invite = share;
  if (share.temp) secrets.add(share.temp);
  if (share.link) secrets.add(tokenOf(share.link));
  check("N1", "Create employee shows 'Share these sign-in details': a 14-character temporary password (no look-alikes), the set-password link, two Copy buttons",
    share.title === "Share these sign-in details" && /^[A-HJ-NP-Za-km-z2-9]{14}$/.test(share.temp ?? "") && /\/pages\/auth\/set-password\.html\?token=[A-Za-z0-9_-]{43}$/.test(share.link ?? "") && j(share.copies) === j(["Copy", "Copy"]), j(share));
  check("N2", "it says plainly that email delivery arrives with the backend, and that they're shown only now", /Email delivery arrives with the backend/.test(share.words ?? "") && /shown only now/.test(await text(t, "#share-modal")));
  await t.click("#share-details button"); await settle(t, 200);
  const clip = await t.evaluate(() => navigator.clipboard.readText().catch(() => ""));
  check("N3", "Copy puts the temporary password on the clipboard", clip === share.temp);
  await scan(t, "N4");
  await t.click('#share-modal .ds-btn--primary'); await settle(t, 900);
  check("N5", "Done goes to the users list", path_(t).endsWith("users/users-list.html"));
  const id = await t.evaluate(() => JSON.parse(localStorage.getItem("officeos:users")).records.find((u) => u.email === "meghna.rao@northwind.com")?.id);
  await navTo(t, `/pages/users/user-profile.html?id=${id}`); await settle(t, 700);
  check("N6", "her profile's Sign-in account: Invited", (await text(t, "#account-status")) === "Invited");
  await signOut(t);
  await signIn(t, "meghna.rao@northwind.com", share.temp);
  check("N7", "her first sign-in with the temporary password goes to Set password", path_(t).endsWith("auth/set-password.html") && (await text(t, "h1")) === "Choose a new password");
  for (const page of ["dashboard/employee.html", "account/my-profile.html", "requests/approvals-inbox.html"]) {
    await t.goto(N + "/pages/" + page); await settle(t, 600);
    check(`N8.${page.split("/")[1].replace(".html", "")}`, `opening ${page} by its URL comes back to Set password`, path_(t).endsWith("auth/set-password.html"), path_(t));
  }
  await navTo(t, "/pages/dashboard/employee.html"); await settle(t, 400);
  check("N9", "...and so does a page change inside the app", path_(t).endsWith("auth/set-password.html"));
  await t.fill("#new-password", "Meghna Rao"); await t.fill("#confirm-password", "Meghna Rao"); await t.click('form button[type="submit"]'); await settle(t, 300);
  const e1 = await text(t, "#new-password-error");
  await t.fill("#new-password", "Lantern-Orbit-42"); await t.fill("#confirm-password", "Lantern-Orbit-43"); await t.click('form button[type="submit"]'); await settle(t, 300);
  const e2 = await text(t, "#confirm-password-error");
  const meter = await t.evaluate(() => ({ score: document.getElementById("pw-meter").dataset.score, word: document.querySelector(".pw-meter__word").textContent, ok: document.querySelectorAll("#pw-rules li[data-ok]").length }));
  check("N10", "the rules (her name refused), the second field must match, the meter says Strong with every rule ticked", /name, email/.test(e1 ?? "") && e2 === "The two passwords don't match." && meter.score === "4" && meter.word === "Strength: Strong" && meter.ok === 3, j([e1, e2, meter]));
  secrets.add("Lantern-Orbit-42");
  await t.fill("#confirm-password", "Lantern-Orbit-42"); await t.click('form button[type="submit"]'); await t.waitForTimeout(1200);
  check("N11", "saved: her dashboard", path_(t).endsWith("dashboard/employee.html"), path_(t));
  await signOut(t);
  await signIn(t, "meghna.rao@northwind.com", share.temp);
  check("N12", "the temporary password no longer works", (await text(t, "#auth-message")) === INVALID);
  await t.goto(share.link); await settle(t, 900);
  check("N13", "the set-password link now says it was already used, with Ask for a new link", (await text(t, "h1")) === "This link was already used" && (await t.$("a.ds-btn--primary")) !== null);
  await scan(t, "N14");
  await n.ctx.close();
}

// ---------- F ----------
if (ONLY.includes("F")) {
  console.log("\n--- F. Forgot and reset ---");
  const n = await open(null, "auth/forgot-password.html");
  const t = n.t;
  const ask = async (email) => { await t.goto(N + "/pages/auth/forgot-password.html"); await settle(t, 400); await t.fill("#email", email); await t.click('form button[type="submit"]'); await t.waitForTimeout(700); return t.evaluate(() => document.querySelector("main").innerText.replace(/\s+/g, " ").trim()); };
  const real = await ask("priya.nair@northwind.com"), ghost = await ask("ghost.person@northwind.com");
  check("F1", "a real and an unknown email get the identical page", real === ghost && real.includes(RESET_SENT), j([real.slice(0, 120), ghost.slice(0, 120)]));
  // the links live only in this tab's memory (never stored), so the rest happens in one tab, without a reload
  await t.goto(N + "/pages/auth/forgot-password.html"); await settle(t, 400);
  await t.fill("#email", "priya.nair@northwind.com"); await t.click('form button[type="submit"]'); await t.waitForTimeout(700);
  await t.click('button:has-text("Use another email")'); await settle(t, 200);
  await t.fill("#email", "arjun.kapoor@northwind.com"); await t.click('form button[type="submit"]'); await t.waitForTimeout(700);
  await t.click('a:has-text("Back to sign in")'); await settle(t, 400);
  await t.click('[data-demo-role="admin"]'); await settle(t, 700);
  await navTo(t, "/pages/system/mail-outbox.html"); await settle(t, 600);
  const mails = await t.evaluate(() => [...document.querySelectorAll(".outbox__mail")].map((m) => ({ to: m.querySelector(".ds-hint")?.textContent, subject: m.querySelector(".outbox__subject")?.textContent, link: m.querySelector("a.ds-btn")?.href ?? null, note: m.innerText })));
  const linked = mails.filter((m) => m.link);
  check("F2", "the Admin's Mail outbox: every reset mail (Arjun's newest), Open link only for this tab's two, none for the unknown email", mails.length === 3 && mails[0].subject === "Reset your password" && /arjun\.kapoor/.test(mails[0].to)
    && linked.length === 2 && /The link is kept only in the browser tab that made it/.test(mails[2].note) && !mails.some((m) => /ghost/.test(m.to)), j(mails.map((m) => [m.to, Boolean(m.link)])));
  for (const m of linked) secrets.add(tokenOf(m.link));
  await scan(t, "F3");
  const arjunLink = linked[0].link, priyaFresh = linked[1].link;
  await signOut(t);
  await t.goto(arjunLink); await settle(t, 900);
  check("F4", "the reset page: Reset your password, for Arjun's email", (await text(t, "h1")) === "Reset your password" && /arjun\.kapoor@northwind\.com/.test(await text(t, "#auth-lead")));
  await t.fill("#new-password", "Quiet-River-77"); await t.fill("#confirm-password", "Quiet-River-77"); await t.click('form button[type="submit"]'); await t.waitForTimeout(1200);
  secrets.add("Quiet-River-77");
  check("F5", "reset: 'Password set', then Sign in", (await text(t, "h1")) === "Password set");
  await t.goto(N + "/pages/auth/login.html"); await settle(t, 400);
  await signIn(t, "arjun.kapoor@northwind.com", "Quiet-River-77");
  check("F6", "the new password signs Arjun in", path_(t).endsWith("dashboard/employee.html"));
  await signOut(t);
  const priyaLink = priyaFresh;
  await n.ctx.clock.setFixedTime(new Date("2026-11-16T11:01:00+05:30"));
  await t.goto(priyaLink); await settle(t, 900);
  check("F7", "61 minutes later Priya's link: 'This link has expired', with Ask for a new link", (await text(t, "h1")) === "This link has expired" && /^Ask for a new one\.$/.test(await text(t, "#link-problem")) /* F2b: the heading says it; the box no longer repeats it */ && (await text(t, "a.ds-btn--primary")) === "Ask for a new link");
  const tampered = priyaLink.slice(0, -2) + (priyaLink.endsWith("AA") ? "BB" : "AA");
  await t.goto(tampered); await settle(t, 900);
  check("F8", "a tampered token: 'This link isn't valid'", (await text(t, "h1")) === "This link isn't valid");
  await t.goto(N + "/pages/auth/reset-password.html"); await settle(t, 600);
  check("F9", "no token at all: 'This link isn't valid', with Ask for a new link", (await text(t, "h1")) === "This link isn't valid" && (await text(t, "a.ds-btn--primary")) === "Ask for a new link");
  await t.goto(arjunLink); await settle(t, 900);
  check("F10", "Arjun's used link: 'already used'", (await text(t, "h1")) === "This link was already used");
  await n.ctx.close();
}

// ---------- R ----------
if (ONLY.includes("R")) {
  console.log("\n--- R. An Admin's help ---");
  const n = await open(null, "auth/login.html");
  const t = n.t;
  for (let i = 0; i < 5; i++) await signIn(t, "kabir.shah@northwind.com", `bad-${i}`);
  await t.click('[data-demo-role="admin"]'); await settle(t, 700);
  await navTo(t, "/pages/users/user-profile.html?id=EMP-1008"); await settle(t, 700);
  check("R1", "Kabir's profile: Locked, with Unlock", (await text(t, "#account-status")) === "Locked" && (await t.$('#account-actions button:has-text("Unlock")')) !== null);
  await t.click('#account-actions button:has-text("Unlock")'); await settle(t, 400);
  check("R2", "Unlock: Active again", (await text(t, "#account-status")) === "Active");
  const ev = await t.evaluate(() => [...document.querySelectorAll("#account-events li")].map((li) => li.querySelector("span").textContent));
  check("R3", "the account events: Unlocked, Locked, Failed sign-ins", ev.includes("Unlocked") && ev.includes("Locked") && ev.includes("Failed sign-ins"), j(ev));
  await navTo(t, "/pages/users/user-profile.html?id=EMP-1105"); await settle(t, 700);
  await t.click('#account-actions button:has-text("Disable sign-in")'); await settle(t, 300);
  const asked = await t.evaluate(() => document.querySelector(".confirm-dialog, [role=alertdialog], .modal.is-open")?.innerText ?? "");
  await t.click('.modal.is-open .ds-btn--danger, .modal.is-open .btn--danger'); await settle(t, 400);
  check("R4", "Disable sign-in asks first (the record stays), then Disabled", /Disable Arjun Kapoor's sign-in\?/.test(asked) && (await text(t, "#account-status")) === "Disabled", asked.slice(0, 120));
  await t.evaluate(() => localStorage.setItem("officeos:session", JSON.stringify({ userLabel: "Arjun Kapoor", employeeId: "EMP-1105", signedInAt: Date.now() })));
  await navTo(t, "/pages/leave/my-leave.html"); await settle(t, 700);
  const r5 = { at: path_(t), msg: await text(t, "#auth-message"), session: await t.evaluate(() => localStorage.getItem("officeos:session")) };
  check("R5", "Arjun's session ends at the next step: the sign-in page says why", r5.at.endsWith("auth/login.html") && /disabled/.test(r5.msg ?? "") && !r5.session, j(r5));
  await signIn(t, "arjun.kapoor@northwind.com", DEMO);
  check("R6", "disabled: his right password is refused", (await text(t, "#auth-message")) === "This account can't sign in. Ask an Admin.");
  await t.click('[data-demo-role="emp"]'); await settle(t, 500);
  check("R7", "...and the Employee demo button too", path_(t).endsWith("auth/login.html") && /can't sign in/.test(await text(t, "#auth-message")));
  await t.click('[data-demo-role="admin"]'); await settle(t, 700);
  await navTo(t, "/pages/users/user-profile.html?id=EMP-1105"); await settle(t, 700);
  await t.click('#account-actions button:has-text("Enable sign-in")'); await settle(t, 400);
  check("R8", "Enable sign-in: Active", (await text(t, "#account-status")) === "Active");
  await signOut(t);
  await t.click('[data-demo-role="hr"]'); await settle(t, 700);
  await navTo(t, "/pages/users/user-profile.html?id=EMP-1105"); await settle(t, 700);
  const hrButtons = await t.evaluate(() => [...document.querySelectorAll("#account-actions button")].map((b) => b.textContent));
  check("R9", "HR: no direct reset any more (IT2: accounts:reset is the Admin's): 'Ask IT to reset the password' only; no Unlock or Disable; no account events", j(hrButtons) === j(["Ask IT to reset the password"]) && !(await t.$("#account-events")), j(hrButtons));
  await signOut(t);   // IT2 (behaviour): the reset is the Admin's now
  await t.click('[data-demo-role="admin"]'); await settle(t, 700);
  await navTo(t, "/pages/users/user-profile.html?id=EMP-1105"); await settle(t, 700);
  await t.click('#account-actions button:has-text("Send reset link")'); await settle(t, 300);
  await t.click(".modal.is-open .ds-btn--primary, .modal.is-open .btn--primary"); await settle(t, 900);
  const link = await text(t, "#share-link");
  if (link) secrets.add(tokenOf(link));
  check("R10", "the Admin's reset link is shown once in the share dialog (60 minutes) (IT2: was HR's)", /reset-password\.html\?token=/.test(link ?? "") && /60 minutes/.test(await text(t, "#share-details")), link);
  await t.click("#share-modal .ds-btn--primary"); await settle(t, 300);
  await signOut(t);
  await t.click('[data-demo-role="hr"]'); await settle(t, 700);
  await navTo(t, "/pages/users/user-profile.html?id=EMP-1001"); await settle(t, 700);
  check("R11", "HR on the Admin's profile: no reset buttons (IT2: only 'Ask IT to reset the password', which an Admin approves)", j(await t.evaluate(() => [...document.querySelectorAll("#account-actions button")].map((b) => b.textContent))) === j(["Ask IT to reset the password"]));
  await scan(t, "R12");
  await n.ctx.close();
}

// ---------- D ----------
const RAW = { bank: "50100234567891", pan: "ABCPK1234Q", aadhaar: "234567890123" };
const RECORDS = { version: 1, people: { "EMP-1105": { aadhaar: "234567890123", ifsc: "HDFC0001234", emergencyContacts: [{ name: "Ravi Kapoor", relation: "Father", phone: "+91 98111 22334" }], skills: [{ skill: "React" }], documents: [{ type: "Passport", number: "M1234567", expiry: "2031-05-01" }] } }, history: [], requests: [], nextReq: 1 };
async function withPay(t) {
  await t.evaluate(([b, p]) => { const box = JSON.parse(localStorage.getItem("officeos:users")); const u = box.records.find((x) => x.id === "EMP-1105"); u.bankAccount = b; u.bankAccountLast4 = b.slice(-4); u.pan = p; localStorage.setItem("officeos:users", JSON.stringify(box)); }, [RAW.bank, RAW.pan]);
  await t.reload(); await t.waitForTimeout(800);
}
const fields = (t) => t.evaluate(() => [...document.querySelectorAll("[data-field]")].map((e) => e.dataset.field).filter((v, i, a) => a.indexOf(v) === i));
const sections = (t) => t.evaluate(() => [...document.querySelectorAll(".pf-section")].map((s) => s.id));
if (ONLY.includes("D")) {
  console.log("\n--- D. Who sees what ---");
  for (const [who, want] of [["admin", "all"], ["hr", "all"], ["fin", "pay"], ["mgr", "team"], ["ananya", "none"]]) {
    const n = await open(who, "users/user-profile.html?id=EMP-1105", { seed: { "officeos:employee-records": RECORDS } });
    await withPay(n.t);
    const html = await n.t.content();
    const f = await fields(n.t), s = await sections(n.t);
    const raw = Object.values(RAW).filter((v) => html.includes(v)).concat(html.includes("M1234567") ? ["doc"] : []);
    if (want === "none") {
      check(`D.${who}`, "another employee (not their manager): the 403 page, no record in the page", path_(n.t).endsWith("errors/403.html") && !f.length && !raw.length, j([path_(n.t), f, raw]));
      await n.ctx.close();
      continue;
    }
    check(`D1.${who}`, `${who}: no bank account, PAN, Aadhaar or document number in the page's HTML`, !raw.length, j(raw));
    if (want === "all") check(`D2.${who}`, `${who}: all five sections and every field, the bank masked to its last 4`, s.length === 5 && f.includes("dob") && f.includes("aadhaar") && f.includes("bankAccount") && (await text(n.t, '[data-field="bankAccount"] [data-masked]')) === "•••• •••• 7891", j([s, f.length]));
    if (want === "pay") check(`D2.${who}`, "Finance: team and pay fields; no birth date, Aadhaar, addresses, emergency contacts, documents in the DOM", s.includes("profile-pay") && !["dob", "aadhaar", "address", "permanentAddress", "emergencyContacts", "documents", "dependants"].some((k) => f.includes(k)), j([s, f]));
    if (want === "team") check(`D2.${who}`, "the manager: team fields only; no Pay or Role and access section; no bank, PAN, Aadhaar, birth date, address in the DOM", !s.includes("profile-pay") && !s.includes("profile-access") && !["dob", "aadhaar", "bankAccount", "pan", "salary", "address", "emergencyContacts"].some((k) => f.includes(k)) && f.includes("skills") && f.includes("phone"), j([s, f]));
    if (want !== "team") {
      const showBank = await n.t.$('[data-field="bankAccount"] button');
      const showSalary = await n.t.$('[data-field="salary"] button');
      if (who === "fin") check("D3.fin", "Finance: no Show on the bank account; Show on salary", !showBank && Boolean(showSalary));
      else {
        await showBank.click(); await settle(n.t, 200);
        check(`D3.${who}`, `${who}: Show gives the full bank account; Hide masks it again`, (await text(n.t, '[data-field="bankAccount"] .ds-reveal')).includes(RAW.bank));
        await n.t.click('[data-field="bankAccount"] button'); await settle(n.t, 150);
        check(`D4.${who}`, `${who}: hidden again; the Show is in the audit trail`, !(await n.t.content()).includes(RAW.bank) && await n.t.evaluate(() => JSON.parse(localStorage.getItem("officeos:audit-trail")).events.some((e) => e.kind === "field-revealed")));
      }
    }
    await n.ctx.close();
  }
}

// ---------- P ----------
if (ONLY.includes("P")) {
  console.log("\n--- P. My own profile, a change request, history ---");
  const n = await open("emp", "account/my-profile.html", { seed: { "officeos:employee-records": RECORDS } });
  const t = n.t;
  await withPay(t);
  check("P1", "My profile shows the five sections of my record", (await sections(t)).length === 5);
  await t.click("#edit-contact"); await settle(t, 200);
  const editable = await t.evaluate(() => [...document.querySelectorAll("#profile-contact input, #profile-contact textarea")].map((i) => i.id).filter((id) => !id.includes("-0-") && !id.includes("-1-")));
  check("P2", "Edit contact: only phone, personal email, addresses and emergency contacts (not the work email)", j(editable) === j(["pf-phone", "pf-personalEmail", "pf-address", "pf-permanentAddress"]), j(editable));
  await t.fill("#pf-phone", "+91 90000 11111");
  await t.click('#profile-contact button:has-text("Add emergency contact")'); await settle(t, 100);
  await t.fill("#pf-emergencyContacts-1-name", "Neha Kapoor"); await t.click('#profile-contact button[type="submit"]'); await settle(t, 300);
  const rowErr = await text(t, "#pf-emergencyContacts-error");
  await t.fill("#pf-emergencyContacts-1-relation", "Sister"); await t.fill("#pf-emergencyContacts-1-phone", "+91 98111 55667");
  await t.click('#profile-contact button[type="submit"]'); await settle(t, 400);
  check("P3", "a row with a missing field is refused at the list; complete, it saves: the new phone and two contacts", /row 2: enter the relation/.test(rowErr ?? "") && (await text(t, '[data-field="phone"] dd')) === "+91 90000 11111" && (await t.locator('[data-list="emergencyContacts"] tbody tr').count()) === 2, rowErr);
  check("P4", "no Edit for the bank on my own profile: Ask for a change", (await t.$("#edit-pay")) === null && (await t.$("#ask-pay")) !== null);
  await t.click("#ask-pay"); await settle(t, 200);
  await t.fill("#pf-bankAccount", "60200345678912"); await t.fill("#pf-bankAccount-confirm", "60200345678912");   // F2: typed twice
  await t.click('#profile-pay button[type="submit"]'); await settle(t, 400);
  check("P5", "Ask for the change: waiting, shown masked", /Bank account: •••• •••• 8912/.test(await text(t, "#profile-requests") ?? "") && /Waiting/.test(await text(t, "#profile-requests")));
  const htmlSelf = await t.content();
  check("P6", "the new number isn't in my page either (masked)", !htmlSelf.includes("60200345678912"));
  await t.evaluate(() => localStorage.setItem("officeos:session", JSON.stringify({ userLabel: "Kabir Shah", employeeId: "EMP-1008", signedInAt: Date.now() })));
  await t.goto(N + "/pages/users/user-profile.html?id=EMP-1105"); await settle(t, 800);
  const bell = await t.getAttribute(".topbar__icon-btn--dot[aria-haspopup]", "aria-label");
  await t.click('#profile-requests button:has-text("Review")'); await settle(t, 400);
  const card = await t.evaluate(() => ({ what: document.querySelector("#approval-card .approval-card__what")?.textContent, rows: [...document.querySelectorAll("#approval-card dt")].map((d) => d.textContent) }));
  check("P7", "Finance: the request counts in the bell; Review opens the approval card (bank and tax, masked rows)", /Waiting for you: [1-9]/.test(bell) && card.what === "Bank and tax details change" && card.rows.includes("Bank account"), j([bell, card]));
  await t.click('#approval-card button:has-text("Approve")'); await settle(t, 300);
  const q = await t.$(".modal.is-open .ds-btn--primary, .modal.is-open .btn--primary"); if (q) { await q.click(); await settle(t, 500); }
  check("P8", "Approve: the bank account is the new one (masked •••• •••• 8912)", (await text(t, '[data-field="bankAccount"] [data-masked]')) === "•••• •••• 8912" && /Approved/.test(await text(t, "#profile-requests")));
  await t.evaluate(() => localStorage.setItem("officeos:session", JSON.stringify({ userLabel: "Priya Nair", employeeId: "EMP-1003", signedInAt: Date.now() })));
  await t.goto(N + "/pages/users/user-profile.html?id=EMP-1105"); await settle(t, 800);
  const hist = await t.evaluate(() => [...document.querySelectorAll("#history-table tbody tr")].map((r) => [...r.cells].slice(2).map((c) => c.textContent)));
  check("P9", "HR's change history: the phone (old to new), the bank account masked, as a request", hist.some((h) => h[0] === "Phone" && h[2] === "+91 90000 11111") && hist.some((h) => h[0] === "Bank account" && /^•/.test(h[1]) && /^•/.test(h[2])) && !j(hist).includes("60200345678912"), j(hist));
  const comp = await t.evaluate(() => ({ meta: document.querySelector("#profile-completeness .ds-card__meta, #profile-completeness [class*=meta]")?.textContent, missing: document.getElementById("completeness-missing")?.textContent }));
  check("P10", "HR sees the completeness: a percentage and what's missing", /^\d+%$/.test(comp.meta ?? "") && /^Missing: /.test(comp.missing ?? ""), j(comp));
  await t.evaluate(() => localStorage.setItem("officeos:session", JSON.stringify({ userLabel: "Arjun Kapoor", employeeId: "EMP-1105", signedInAt: Date.now() })));
  await t.goto(N + "/pages/account/my-profile.html"); await settle(t, 700);
  check("P11", "Arjun has no change history or completeness on his own page", (await t.$("#profile-history")) === null && (await t.$("#profile-completeness")) === null);
  await n.ctx.close();
}

// ---------- M ----------
if (ONLY.includes("M")) {
  console.log("\n--- M. My account pages ---");
  const n = await open("emp", "account/my-profile.html");
  const t = n.t;
  for (const page of ["my-profile", "change-password"]) {   // F2: Sessions and Notifications are placeholder pages (rebuilt, f2.mjs P)
    await t.goto(`${N}/pages/account/${page}.html`); await settle(t, 500);
    const tab = await t.evaluate(() => [...document.querySelectorAll(".acct-tabs a")].map((a) => a.textContent));
    check(`M1.${page}`, `${page}: the account tabs include Appearance`, tab.includes("Appearance"), j(tab));
  }
  await t.click('.acct-tabs a:has-text("Appearance")'); await settle(t, 600);
  check("M2", "Appearance opens the appearance page (the A1 store)", path_(t).endsWith("account/appearance.html"));
  await t.goto(`${N}/pages/account/change-password.html`); await settle(t, 500);
  await t.fill("#pw-current", "not-it"); await t.fill("#pw-new", "Brighter-Lantern-5"); await t.fill("#pw-confirm", "Brighter-Lantern-5"); await t.click('form button[type="submit"]'); await t.waitForTimeout(800);
  const e1 = await text(t, "#pw-current-error");
  await t.fill("#pw-current", DEMO); await t.fill("#pw-new", "arjun.kapoor@northwind.com"); await t.fill("#pw-confirm", "arjun.kapoor@northwind.com"); await t.click('form button[type="submit"]'); await t.waitForTimeout(400);
  const e2 = await text(t, "#pw-new-error");
  await t.fill("#pw-new", "Brighter-Lantern-5"); await t.fill("#pw-confirm", "Brighter-Lantern-5"); await t.click('form button[type="submit"]'); await t.waitForTimeout(1200);
  secrets.add("Brighter-Lantern-5");
  const toast = await text(t, ".toast");
  check("M3", "Change password: a wrong current one refused, the rules, then changed", e1 === "Your current password isn't right." && /name, email/.test(e2 ?? "") && /Password changed/.test(toast ?? ""), j([e1, e2, toast]));
  await signOut(t);
  await signIn(t, "arjun.kapoor@northwind.com", "Brighter-Lantern-5");
  check("M4", "the new password signs in", path_(t).endsWith("dashboard/employee.html"));
  await scan(t, "M5");
  await n.ctx.close();
}

// ---------- A ----------
if (ONLY.includes("A")) {
  console.log("\n--- A. No demo disclaimers ---");
  const bad = [];
  for (const [who, page] of [[null, "auth/login.html"], [null, "auth/forgot-password.html"], [null, "auth/reset-password.html"], ["admin", "users/user-profile.html?id=EMP-1105"], ["emp", "account/my-profile.html"], ["emp", "account/change-password.html"]]) {
    const n = await open(who, page);
    const body = await n.t.evaluate(() => document.body.innerText);
    if (/not available in this demo|isn't available in this demo|aren't part of OfficeOS|part of this demo/i.test(body)) bad.push(page);
    await n.ctx.close();
  }
  check("A1", "the sign-in pages, profiles and change password say nothing is 'not available in this demo'", !bad.length, j(bad));
}

// ---------- K ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard ---");
  const n = await open(null, "auth/login.html");
  const t = n.t;
  await t.keyboard.press("Tab");
  let guard = 0;
  while (guard++ < 6 && (await t.evaluate(() => document.activeElement?.id)) !== "email") await t.keyboard.press("Tab");
  await t.keyboard.type("arjun.kapoor@northwind.com"); await t.keyboard.press("Tab"); await t.keyboard.type(DEMO);
  const order = [];
  for (let i = 0; i < 3; i++) { await t.keyboard.press("Tab"); order.push(await t.evaluate(() => document.activeElement?.textContent?.trim() || document.activeElement?.id)); }
  await t.focus("#password"); await t.keyboard.press("Enter"); await t.waitForTimeout(1000);
  check("K1", "the form by keyboard: email, password, then Show, Forgot password?, Sign in; Enter signs in", j(order) === j(["Show", "Forgot password?", "Sign in"]) && path_(t).endsWith("dashboard/employee.html"), j(order));
  await navTo(t, "/pages/account/my-profile.html"); await settle(t, 600);
  await t.focus("#edit-contact"); await t.keyboard.press("Enter"); await settle(t, 200);
  const focus = await t.evaluate(() => document.activeElement?.id);
  await t.keyboard.press("Escape").catch(() => {});
  check("K2", "Edit by keyboard puts focus in the first field", focus === "pf-phone", focus);
  const ring = await t.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== "none" || getComputedStyle(document.activeElement.closest(".ds-control") ?? document.activeElement).boxShadow !== "none");
  check("K3", "the focused field shows a focus ring", ring);
  await n.ctx.close();
}

// ---------- E ----------
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
if (ONLY.includes("E")) {
  console.log("\n--- E. Contrast ---");
  for (const theme of ["light", "dark"]) {
    const n = await open(null, "auth/login.html", { theme });
    await signIn(n.t, "x@northwind.com", "bad-pw-1");
    const pairs = await n.t.evaluate(() => {
      const rgb = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (m) return m[1].split(/[ ,/]+/).filter(Boolean).map(Number); const k = c.match(/color\(srgb ([^)]+)\)/); return k ? k[1].trim().split(/\s+/).slice(0, 3).map((x) => Math.round(Number(x) * 255)) : null; };
      const bgOf = (e) => { for (let x = e; x; x = x.parentElement) { const c = rgb(getComputedStyle(x).backgroundColor); if (c && (c.length < 4 || c[3] > 0.5)) return c.slice(0, 3); } return [255, 255, 255]; };
      return ["#auth-title", "#auth-lead", 'label[for="email"]', ".ds-hint", "#auth-message", ".pw-control__toggle", ".auth-row a", ".auth-demo__title"].map((s) => { const e = document.querySelector(s); return e ? [s, rgb(getComputedStyle(e).color).slice(0, 3), bgOf(e)] : [s, null, null]; });
    });
    const low = pairs.filter(([, f, b]) => !f || ratio(f, b) < 4.5).map(([s, f, b]) => [s, f && ratio(f, b).toFixed(2)]);
    check(`E1.${theme}`, `${theme}: the sign-in page's text and its message are 4.5:1 or more`, !low.length, j(low));
    await n.ctx.close();
  }
}

// ---------- W ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. Shots ---");
  let shots = 0;
  for (const theme of ["light", "dark"]) for (const w of [412, 768, 1280]) {
    for (const page of ["auth/login.html", "auth/forgot-password.html", "auth/reset-password.html"]) {
      const n = await open(null, page, { width: w, theme });
      await n.t.screenshot({ path: path.join(SHOTS, `${page.split("/")[1].replace(".html", "")}-${w}-${theme}.png`), fullPage: true }); shots++;
      if (page === "auth/login.html") { await signIn(n.t, "x@northwind.com", "bad-pw-1"); await n.t.screenshot({ path: path.join(SHOTS, `login-error-${w}-${theme}.png`), fullPage: true }); shots++; }
      await n.ctx.close();
    }
  }
  for (const theme of ["light", "dark"]) for (const w of [412, 1280]) {
    for (const who of ["admin", "fin", "mgr"]) {
      const n = await open(who, "users/user-profile.html?id=EMP-1105", { width: w, theme, seed: { "officeos:employee-records": RECORDS } });
      await withPay(n.t);
      await n.t.screenshot({ path: path.join(SHOTS, `profile-${who}-${w}-${theme}.png`), fullPage: true }); shots++;
      await n.ctx.close();
    }
    const n = await open("emp", "account/my-profile.html", { width: w, theme, seed: { "officeos:employee-records": RECORDS } });
    await withPay(n.t);
    await n.t.click("#edit-contact"); await settle(n.t, 200);
    await n.t.screenshot({ path: path.join(SHOTS, `myprofile-edit-${w}-${theme}.png`), fullPage: true }); shots++;
    await n.ctx.close();
    const c = await open("emp", "account/change-password.html", { width: w, theme });
    await c.t.screenshot({ path: path.join(SHOTS, `change-password-${w}-${theme}.png`), fullPage: true }); shots++;
    await c.ctx.close();
  }
  check("W1", "shots taken", shots === 24 + 20, shots);
}

// ---------- G ----------
if (ONLY.includes("G")) {
  console.log("\n--- G. Demo mode (E1b) ---");
  // a second build with demo mode off, served on its own port, in a folder of its own beside the normal dist
  const { spawnSync } = await import("node:child_process");
  const appDir = path.dirname(DIST);
  const offDist = path.join(appDir, "dist-demo-off");
  const built = spawnSync("npx", ["vite", "build", "--outDir", offDist, "--emptyOutDir"], { cwd: appDir, shell: true, env: { ...process.env, OFFICEOS_DEMO_OFF: "1" }, encoding: "utf8" });
  check("G0", "a build with demo mode off", built.status === 0 && fs.existsSync(path.join(offDist, "index.html")), (built.stderr ?? "").slice(-200));
  const srvOff = spawn("python", [path.join(HERE, "spa-serve.py"), "9973", offDist], { stdio: "ignore" });
  for (let i = 0; i < 60; i++) { try { if ((await fetch("http://127.0.0.1:9973/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  const ctx = await browser.newContext({ ...size(1280), timezoneId: "Asia/Kolkata" });
  await ctx.clock.setFixedTime(new Date(NOW));
  const t = await ctx.newPage();
  t.on("pageerror", (e) => errs.push(`demo-off: ${e.message}`));
  await t.goto("http://127.0.0.1:9973/pages/auth/login.html"); await t.waitForLoadState("load"); await t.waitForTimeout(500);
  const off = await t.evaluate(() => ({ demo: !!document.getElementById("demo-title"), buttons: document.querySelectorAll("[data-demo-role]").length, text: /Northwind@2026|demo/i.test(document.body.innerText) }));
  check("G1", "off: the sign-in page has no demo hint, no role buttons and never names the demo password", !off.demo && off.buttons === 0 && !off.text, j(off));
  await t.fill("#email", "arjun.kapoor@northwind.com"); await t.fill("#password", DEMO); await t.click('form button[type="submit"]'); await t.waitForTimeout(900);
  check("G2", "off: the demo password signs nobody in (the usual words, still on the sign-in page)", (await text(t, "#auth-message")) === INVALID && new URL(t.url()).pathname.endsWith("auth/login.html"), await text(t, "#auth-message"));
  await t.goto("http://127.0.0.1:9973/pages/dashboard/admin.html"); await t.waitForTimeout(600);
  check("G3", "off: with nobody signed in the app still sends you to sign in", new URL(t.url()).pathname.endsWith("auth/login.html"));
  await ctx.close();
  try { srvOff.kill(); } catch {}
  const n = await open(null, "auth/login.html");
  const on = await n.t.evaluate(() => ({ demo: !!document.getElementById("demo-title"), buttons: document.querySelectorAll("[data-demo-role]").length, code: document.querySelector(".auth-demo code")?.textContent }));
  check("G4", "on (the default build): the hint with the demo password and the four role buttons", on.demo && on.buttons === 4 && on.code === DEMO, j(on));
  await n.ctx.close();
  // Disable sign-in belongs to accounts:disable: the Admin sees it, HR (reset only) doesn't, and neither does the Unlock-only story
  const a = await open("admin", "users/user-profile.html?id=EMP-1105");
  const adminBtns = await a.t.evaluate(() => [...document.querySelectorAll("#account-actions button")].map((b) => b.textContent));
  check("G5", "the Admin's card offers Disable sign-in (accounts:disable) beside the reset buttons", adminBtns.includes("Disable sign-in") && adminBtns.includes("Send reset link"), j(adminBtns));
  await a.ctx.close();
  const h = await open("hr", "users/user-profile.html?id=EMP-1105");
  const hrBtns = await h.t.evaluate(() => [...document.querySelectorAll("#account-actions button")].map((b) => b.textContent));
  check("G6", "HR's card has no Disable sign-in", !hrBtns.includes("Disable sign-in") && !hrBtns.includes("Enable sign-in"), j(hrBtns));
  await h.ctx.close();
}

// ---------- B ----------
if (ONLY.includes("B")) {
  console.log("\n--- B. Team pages link to profiles (E1b) ---");
  const names = (t, sel) => t.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => ({ text: e.textContent.trim(), tag: e.tagName, href: e.getAttribute("href") })), sel);
  for (const [who, page, sel, label] of [["mgr", "attendance/team-attendance.html", "#team-rows .table__user-name", "Team attendance"], ["mgr", "leave/team-leave.html", "main table .table__user-name", "Team leave"],
    ["hr", "attendance/team-attendance.html", "#team-rows .table__user-name", "Team attendance"], ["admin", "attendance/team-attendance.html", "#team-rows .table__user-name", "Team attendance"], ["hr", "leave/team-leave.html", "main table .table__user-name", "Team leave"], ["admin", "leave/team-leave.html", "main table .table__user-name", "Team leave"]]) {
    const n = await open(who, page);
    await settle(n.t, 400);
    const list = await names(n.t, sel);
    const linked = list.filter((x) => x.tag === "A");
    check(`B1.${who}.${label}`, `${who} on ${label}: ${list.length} names, every one a profile link`, list.length > 0 && linked.length === list.length && linked.every((x) => /^\/pages\/users\/user-profile\.html\?id=EMP-\d+$/.test(x.href)), j(list.slice(0, 3)));
    if (who === "mgr" && label === "Team attendance") {
      const ids = linked.map((x) => x.href.split("id=")[1]);
      const reports = await n.t.evaluate(() => { const box = JSON.parse(localStorage.getItem("officeos:users") ?? "null"); return box ? box.records.filter((u) => u.reportingManagerId === "EMP-1029").map((u) => u.id) : null; });
      check("B2", "the manager's links are their direct reports only (and never themself)", ids.length > 0 && !ids.includes("EMP-1029") && (reports === null || ids.every((id) => reports.includes(id))), j(ids));
      await n.t.evaluate(() => { window.__marker = 1; });
      await n.t.click("#team-rows a.table__user-name"); await settle(n.t, 800);
      const sameDoc = await n.t.evaluate(() => window.__marker === 1);
      check("B3", "a name opens the person's profile through the router (no page load); the manager sees the team fields", new URL(n.t.url()).pathname.endsWith("users/user-profile.html") && sameDoc && (await n.t.$('[data-field="phone"]')) !== null && (await n.t.$('[data-field="bankAccount"]')) === null && (await n.t.$("#profile-pay")) === null);
    }
    await n.ctx.close();
  }
  const e = await open("emp", "attendance/team-attendance.html");
  await settle(e.t, 500);
  check("B4", "an employee with no reports can't open Team attendance (403): no names to link", new URL(e.t.url()).pathname.endsWith("errors/403.html"));
  await e.ctx.close();
}

// ---------- X ----------
if (ONLY.includes("X")) {
  console.log("\n--- X. Errors ---");
  check("X1", "no page or console errors", !errs.length, errs.slice(0, 5).join(" | "));
}

await browser.close();
console.log(`\ne1: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);