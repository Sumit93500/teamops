// React round 1's smoke test (msedge, headless). usage: node smoke.mjs <app dist> <pristine tree> [workers=3]
// Every page (the 55 of config/routes.js + the public ones) as every role (signed out, Admin, HR, Finance, Employee Arjun, manager Sneha
// EMP-1029) in the new app. Each case passes when: no pageerror, no console error, no failed request; a <main> is drawn with text; and the
// page the app ends on is the one the OLD site ends on for the same session (its guard is the oracle: sign-in, 403, or the page itself).
// The clock is fixed at Mon 28 Sep 2026 10:00 IST; Google Fonts come from the local cache.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const DIST = process.argv[2], PRIST = process.argv[3], WORKERS = Number(process.argv[4] ?? 3);
const t0 = Date.now();
const srvN = spawn("python", [path.join(HERE, "spa-serve.py"), "9971", DIST], { stdio: "ignore" });
const srvO = spawn("python", [path.join(EDGE, "lib", "serve.py"), "9972", PRIST], { stdio: "ignore" });
const stop = () => { try { srvN.kill(); srvO.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9971", O = "http://127.0.0.1:9972";
for (const u of [N + "/", O + "/pages/errors/404.html"]) { for (let i = 0; i < 60; i++) { try { if ((await fetch(u)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); } }

// The 55 pages, read from the pristine tree's config the way app/src/routes.js reads it.
const routesSrc = fs.readFileSync(path.join(PRIST, "assets", "js", "config", "routes.js"), "utf8");
const routed = [...routesSrc.matchAll(/^\s*"([a-z-]+\/[a-z0-9-]+\.html)":/gm)].map((m) => m[1]);
const PUBLIC = ["auth/login.html", "auth/forgot-password.html", "auth/reset-password.html", "auth/two-factor.html", "errors/403.html", "errors/404.html", "errors/500.html"];
const PAGES = [...routed, ...PUBLIC];
const WHO = { out: null, admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"] };

const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
async function open(base, who, pagePath, isNew) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "Asia/Kolkata" });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date("2026-09-28T10:00:00+05:30"));
  await ctx.addInitScript((w) => {
    if (sessionStorage.getItem("smoke-set")) return;
    sessionStorage.setItem("smoke-set", "1");
    localStorage.clear();
    if (w) localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
  }, WHO[who]);
  const t = await ctx.newPage();
  const errs = [];
  t.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  t.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
  t.on("requestfailed", (r) => errs.push("requestfailed: " + r.url()));
  t.on("response", (r) => { if (r.status() >= 400) errs.push(`http ${r.status()}: ${r.url()}`); });
  await t.goto(base + "/pages/" + pagePath);
  await t.waitForLoadState("load");
  await t.waitForTimeout(isNew ? 150 : 300);
  const at = new URL(t.url()).pathname.replace(/^\/pages\//, "");
  const main = isNew ? await t.evaluate(() => { const m = document.querySelector("#root main"); return m ? m.innerText.trim().length : -1; }) : null;
  const shell = await t.evaluate(() => Boolean(document.querySelector(".sidebar .nav__item") && document.querySelector(".topbar .avatar")));   // the drawn shell (React round 2)
  await ctx.close();
  return { at, errs, main, shell };
}

const cases = [];
for (const who of Object.keys(WHO)) for (const p of PAGES) cases.push([who, p]);
let passed = 0, failed = 0; const fails = [];
let next = 0; const tally = {}; let shells = 0;
async function worker() {
  while (next < cases.length) {
    const [who, p] = cases[next++];
    const [o, n] = [await open(O, who, p, false), await open(N, who, p, true)];
    const ok = n.at === o.at && !n.errs.length && n.main > 0 && n.shell === o.shell; if (n.shell) shells++;
    const kind = n.at === "auth/login.html" && p !== n.at ? "to sign-in" : n.at === "errors/403.html" && p !== n.at ? "to 403" : n.at === p ? "opened" : "elsewhere";
    tally[`${who} ${kind}`] = (tally[`${who} ${kind}`] ?? 0) + 1;
    if (ok) passed++; else { failed++; fails.push(`FAIL  ${who.padEnd(5)} ${p}  old->${o.at}  new->${n.at}  main=${n.main}  shell old ${o.shell} new ${n.shell}  ${n.errs.join(" | ")}`); }
  }
}
await Promise.all(Array.from({ length: WORKERS }, worker));
await browser.close();
fails.forEach((f) => console.log(f));
for (const who of Object.keys(WHO)) console.log(`${who.padEnd(5)} ` + ["opened", "to sign-in", "to 403", "elsewhere"].map((k) => `${k} ${tally[`${who} ${k}`] ?? 0}`).join(", "));
const byWho = Object.keys(WHO).map((w) => `${w} ${PAGES.length}`).join(", ");
console.log(`\nsmoke: ${PAGES.length} pages x ${Object.keys(WHO).length} sessions (${byWho}) = ${cases.length} cases (${shells} inside the shell, as on the old site); passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
