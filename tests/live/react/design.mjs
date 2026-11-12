// D2a's design-foundation check (msedge, headless). usage: node design.mjs <app dist> <shots dir>
// Fixed clock Mon 28 Sep 2026 10:00 IST; Google Fonts from the local cache. The company is data/company.js's (the Settings page's
// source): "Northwind Technologies Pvt. Ltd.".
//   B  branding, as every role (admin hr fin emp, manager Sneha) at 1280 and 412, light and dark:
//        1280: the rail's brand and the header's first crumb are links to About named with the company; the header reads
//              "<company> / <page>"; no "OfficeOS" above the content; "Powered by OfficeOS" is the last thing in the page,
//              under the content; the tab title is "<page> | <company>"; the brand link opens About
//        412:  the header's company mark is a link to About ("About <company>"), the crumb isn't shown, the title is; the footer
//              ends the page
//   A  About, as every role: opens (signed out: sign-in); h1 About; the details are the Settings page's values; Employees and
//      Departments are the store's own counts (localStorage officeos:users / officeos:departments); Overview and Mission say
//      "Not added yet."; Offices says they arrive with the offices round; nothing else claims anything
//   P  sign-in, forgot password, 403, 404 (signed out and in): the brand panel shows the company's mark and name, not
//      "OfficeOS"; "Powered by OfficeOS" after the page's main; the tab title
//   R  reduced motion: with prefers-reduced-motion a token transition finishes at once (--ds-fast 0ms, transitions 0.01ms)
//   E  no page or console errors anywhere
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const DIST = process.argv[2], SHOTS = process.argv[3];
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srv = spawn("python", [path.join(HERE, "spa-serve.py"), "9978", DIST], { stdio: "ignore" });
const stop = () => { try { srv.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9978";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const SIZES = { 412: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA }, 1280: { viewport: { width: 1280, height: 900 } } };
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"], out: null };
const LANDING = { admin: "dashboard/admin.html", hr: "dashboard/hr.html", fin: "dashboard/finance.html", emp: "dashboard/employee.html", mgr: "dashboard/employee.html" };
const COMPANY = "Northwind Technologies Pvt. Ltd.", ABOUT = "/pages/company/about.html";
const DETAILS = [["Company name", COMPANY], ["Address", "Sector 44, Gurugram, Haryana 122003"], ["Time zone", "India Standard Time (UTC+5:30)"], ["Currency", "Indian rupee (₹)"], ["Financial year starts in", "April"], ["Employee ID prefix", "EMP-"]];
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(14)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 500)}` : ""}`); };
const j = JSON.stringify;
const allErrs = [];

async function open(who, url, width = 1280, theme = "light", extra = {}) {
  const ctx = await browser.newContext({ ...SIZES[width], timezoneId: "Asia/Kolkata", ...extra });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date("2026-09-28T10:00:00+05:30"));
  await ctx.addInitScript(([w, th]) => {
    if (sessionStorage.getItem("d-set")) return;
    sessionStorage.setItem("d-set", "1"); localStorage.clear();
    localStorage.setItem("officeos:theme", JSON.stringify(th));
    if (w) localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
  }, [WHO[who], theme]);
  const t = await ctx.newPage();
  t.on("pageerror", (e) => allErrs.push(`${who} ${url}: ${e.message}`));
  t.on("console", (m) => { if (m.type() === "error") allErrs.push(`${who} ${url}: console ${m.text()}`); });
  await t.goto(N + url); await t.waitForLoadState("load"); await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(250);
  return { ctx, t };
}

// What the page says about its brand and footer.
const brandState = (t) => t.evaluate(() => {
  const vis = (el) => Boolean(el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden");
  const brand = document.querySelector(".sidebar__brand"), crumb = document.querySelector(".topbar__company"), mark = document.querySelector(".topbar__brand");
  const footer = document.querySelector(".app-footer"), main = document.querySelector("main");
  const name = (el) => el ? (el.getAttribute("aria-label") || el.innerText || el.textContent).trim() : null;
  const topText = [...document.querySelectorAll(".sidebar__brand, .topbar")].map((e) => e.innerText).join(" ");
  const last = [...document.body.querySelectorAll("*")].filter((e) => vis(e) && e.innerText?.trim() && !e.closest("#root > div > .sidebar, .card-host, [id^='approval'], [id^='bell'], .toast-region, #recharts_measurement_span")).at(-1);   // D2b: Recharts measures label widths in a span at top -20000px
  return {
    brand: brand && { tag: brand.tagName, href: brand.getAttribute("href"), name: brand.textContent.trim(), title: brand.title, vis: vis(brand) },
    crumb: crumb && { href: crumb.getAttribute("href"), text: crumb.textContent, vis: vis(crumb) },
    mark: mark && { href: mark.getAttribute("href"), label: mark.getAttribute("aria-label"), vis: vis(mark) },
    left: document.querySelector(".topbar__left")?.innerText.replace(/\s+/g, " ").trim() ?? null,
    footer: footer && { text: footer.innerText.trim(), below: footer.getBoundingClientRect().top >= main.getBoundingClientRect().bottom - 1, afterMain: Boolean(main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING), lastText: last ? last.innerText.trim() : null },
    officeosOnTop: /OfficeOS/.test(topText), title: document.title, page: location.pathname,
    scroll: document.documentElement.scrollWidth <= innerWidth,
  };
});

// B: branding
for (const who of ["admin", "hr", "fin", "emp", "mgr"]) for (const width of [1280, 412]) for (const theme of ["light", "dark"]) {
  const tag = `${who}.${width}.${theme}`;
  const { ctx, t } = await open(who, `/pages/${LANDING[who]}`, width, theme);
  await t.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await t.waitForTimeout(100);
  const s = await brandState(t);
  const pageTitle = (await t.evaluate(() => document.querySelector(".topbar__left strong")?.textContent)) ?? "";
  const common = s.footer?.text === "Powered by OfficeOS" && s.footer.below && s.footer.afterMain && s.footer.lastText === "Powered by OfficeOS" && !s.officeosOnTop
    && s.title === `${pageTitle} | ${COMPANY}` && s.scroll;
  const ok = width === 1280
    ? common && s.brand?.tag === "A" && s.brand.href === ABOUT && s.brand.name === `N${COMPANY}` && s.brand.vis && s.crumb?.href === ABOUT && s.crumb.text === COMPANY && s.crumb.vis && s.left === `${COMPANY} / ${pageTitle}` && !s.mark?.vis
    : common && s.mark?.vis && s.mark.href === ABOUT && s.mark.label === `About ${COMPANY}` && !s.crumb?.vis && s.left === pageTitle;
  check(`B.${tag}`, `branding: company link${width === 1280 ? "s (rail + header)" : " (header mark)"} to About, footer last, tab title`, ok, j(s));
  if (theme === "light" && (who === "admin" || who === "emp")) {
    await t.click(width === 1280 ? ".topbar__company" : ".topbar__brand"); await t.waitForTimeout(250);
    const at = await t.evaluate(() => [location.pathname, document.querySelector("main h1")?.textContent, document.title]);
    check(`B.go.${tag}`, "the company link opens About", at[0] === ABOUT && at[1] === "About" && at[2] === `About | ${COMPANY}`, j(at));
  }
  await ctx.close();
}

// A: About, as every role; signed out goes to sign-in
for (const who of ["admin", "hr", "fin", "emp", "mgr"]) {
  const { ctx, t } = await open(who, ABOUT);
  const a = await t.evaluate(() => {
    const box = (k) => JSON.parse(localStorage.getItem("officeos:" + k) ?? "null")?.records ?? [];
    const kpi = (id) => document.querySelector(`[data-kpi="${id}"] .ds-kpi__value`)?.textContent;
    const card = (id) => document.querySelector(`#${id} .ds-card__body`)?.innerText.trim();
    return {
      h1: document.querySelector("main h1")?.textContent, crumbs: [...document.querySelectorAll(".ds-breadcrumb li")].map((l) => l.textContent),
      details: [...document.querySelectorAll(".about__details > div")].map((d) => [d.querySelector("dt").textContent, d.querySelector("dd").textContent]),
      employees: kpi("employees"), departments: kpi("departments"),
      storeEmployees: String(box("users").filter((u) => u.status !== "inactive").length), storeDepartments: String(box("departments").length),
      sidebarCount: document.getElementById("sidebar-headcount")?.textContent,
      hero: document.querySelector(".ds-hero")?.innerText.replace(/\s+/g, " ").trim(),
      overview: card("about-overview"), mission: card("about-mission"), offices: card("about-offices"),
      note: document.querySelector("#about-company .ds-card__footer")?.textContent,
      h1count: document.querySelectorAll("h1").length,
    };
  });
  const ok = a.h1 === "About" && a.h1count === 1 && j(a.crumbs) === j(["Company", "About"]) && j(a.details) === j(DETAILS) && a.employees === a.storeEmployees && a.departments === a.storeDepartments
    && a.sidebarCount === `${a.storeEmployees} employees` && a.hero.includes(`${a.storeEmployees} employees`) && a.hero.includes(`across ${a.storeDepartments} departments`)
    && a.overview === "Not added yet." && a.mission === "Not added yet." && a.offices === "Offices arrive with the offices round." && a.note === "OfficeOS doesn't store company settings yet, so these are the Settings page's sample values.";
  check(`A.${who}`, "About: Settings' details, the store's counts, Not added yet, offices later", ok, j(a));
  await ctx.close();
}
{
  const { ctx, t } = await open("out", ABOUT);
  check("A.out", "About signed out: sign-in", new URL(t.url()).pathname === "/pages/auth/login.html", t.url());
  await ctx.close();
}

// P: the sign-in and error pages
for (const [who, p, title] of [["out", "auth/login.html", "Sign in"], ["out", "auth/forgot-password.html", "Forgot password"], ["out", "errors/403.html", "No access"], ["admin", "errors/404.html", "Page not found"]]) {
  for (const width of [1280, 412]) {
    const { ctx, t } = await open(who, `/pages/${p}`, width);
    const s = await t.evaluate(() => {
      const logo = document.querySelector(".auth__logo"), footer = document.querySelector(".app-footer"), main = document.querySelector("main.auth");
      return { logo: logo?.innerText.replace(/\s+/g, " ").trim() ?? null, mark: logo?.querySelector(".brand-mark")?.textContent ?? null, label: document.querySelector(".auth__brand")?.getAttribute("aria-label") ?? null,
        footer: footer?.innerText.trim(), after: Boolean(main && footer && main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING), title: document.title,
        topOfficeOS: logo ? /OfficeOS/.test(logo.innerText) : false, scroll: document.documentElement.scrollWidth <= innerWidth };
    });
    const brandOk = p.startsWith("auth/") ? s.logo === `N ${COMPANY}` && s.mark === "N" && s.label === `About ${COMPANY}` : s.logo === null;
    check(`P.${p}.${width}`, `${p}: company brand, footer after main, tab title`, brandOk && !s.topOfficeOS && s.footer === "Powered by OfficeOS" && s.after && s.title === `${title} | ${COMPANY}` && s.scroll, j(s));
    if (width === 1280 && p === "auth/login.html") await t.screenshot({ path: path.join(SHOTS, "login-1280.png"), fullPage: true });
    await ctx.close();
  }
}

// R: reduced motion
{
  const { ctx, t } = await open("admin", "/gallery", 1280, "light", { reducedMotion: "reduce" });
  const r = await t.evaluate(() => [getComputedStyle(document.documentElement).getPropertyValue("--ds-fast").trim(), getComputedStyle(document.querySelector(".ds-segmented__option")).transitionDuration]);
  await ctx.close();
  const { ctx: c2, t: t2 } = await open("admin", "/gallery", 1280, "light", { reducedMotion: "no-preference" });
  const n = await t2.evaluate(() => [getComputedStyle(document.documentElement).getPropertyValue("--ds-fast").trim(), getComputedStyle(document.querySelector(".ds-segmented__option")).transitionDuration]);
  await c2.close();
  // the browser gives the custom property as written after its own normalising ("0s" / ".12s") and the transition in seconds
  const secs = (v) => parseFloat(v.split(",")[0]);
  check("R", "reduced motion: transitions finish at once; without it they run", secs(r[0]) === 0 && secs(r[1]) <= 0.001 && secs(n[0]) === 0.12 && secs(n[1]) === 0.12, j([r, n]));
}

check("E", "no page or console errors", !allErrs.length, j(allErrs));
await browser.close();
console.log(`\ndesign: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);