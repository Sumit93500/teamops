// React round 2's shell parity check (msedge, headless). usage: node shell.mjs <app dist> <pristine tree> <shots dir> [ONLY=letters]
// The old page after app.js has drawn its shell, against the new app's shell, same session and fixed clock (Mon 28 Sep 2026 10:00 IST).
//   D  the drawn shell at 1280, for Admin, HR, Finance, Employee (Arjun) and a manager (Sneha) on their landing page, My leave and one more
//      page: the sidebar (brand, the person's name and designation, each section's button, title, links with their page, which is
//      current, the waiting count), Sign out, the footer's chip, the topbar's title, the actions in order (name, title, dot), the
//      avatar, <html data-role> and data-nav-drawn.
//   R  the rail: a section's button clicked opens its flyout (is-open, aria-expanded, the panel's top) and Esc closes it; ArrowDown
//      moves between the rail's stops; the same on both.
//   Q  search as Admin and as Arjun: the results for "le", "pay", "arj", "zzz" (labels, where, page), the first one active; Enter opens it.
//   T  the Appearance menu: opens, its pressed choices; Dark and then Teal applied on both (<html data-theme>, data-accent, the menu).
//   N  router navigation (new only): a sidebar link opens its page without a full load; Back returns; the topbar title and the
//      current item follow; no static text in the topbar or sidebar changes after the first paint (a MutationObserver from the start).
//   F  no role-colour flash (new only): the topbar's background on the first frame equals the settled one, as Employee on an
//      HR-marked page and as HR on an Admin-marked page.
//   S  shots: My leave and the Admin dashboard, Admin and Arjun, at 1280 and 412, light and dark, old and new.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const DIST = process.argv[2], PRIST = process.argv[3], SHOTS = process.argv[4], ONLY = process.env.ONLY ?? "DRQTNFS";
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srvN = spawn("python", [path.join(HERE, "spa-serve.py"), "9975", DIST], { stdio: "ignore" });
const srvO = spawn("python", [path.join(EDGE, "lib", "serve.py"), "9976", PRIST], { stdio: "ignore" });
const stop = () => { try { srvN.kill(); srvO.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9975", O = "http://127.0.0.1:9976";
for (const u of [N + "/", O + "/pages/errors/404.html"]) { for (let i = 0; i < 60; i++) { try { if ((await fetch(u)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); } }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"] };
const PAGES = { admin: ["dashboard/admin.html", "leave/my-leave.html", "users/users-list.html"], hr: ["dashboard/hr.html", "leave/my-leave.html", "leave/leave-approvals.html"],
  fin: ["dashboard/finance.html", "leave/my-leave.html", "payroll/payroll-run.html"], emp: ["dashboard/employee.html", "leave/my-leave.html", "requests/my-requests.html"],
  mgr: ["dashboard/employee.html", "leave/my-leave.html", "leave/team-leave.html"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const SIZES = { 412: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA }, 1280: { viewport: { width: 1280, height: 900 } } };
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
// D2a's ruled branding (2026-11-12): the app shows the company (data/company.js) where the old pages show "OfficeOS". It is applied
// to the OLD side only, and only to these fields; everything else still has to match exactly:
//   the sidebar's brand "O OfficeOS" -> the company's mark + name; the header's "Workspace / page" -> "<company> / page";
//   at 412 the header's company mark ("About <company>") after the menu button (not on a detail page, where the back arrow is);
//   the sign-in pages' brand panel "O OfficeOS ..." -> "N <company> ..."; the tab title "page | OfficeOS" -> "page | <company>".
const COMPANY = "Northwind Technologies Pvt. Ltd.";
const ruledShell = (s) => ({ ...s, brand: s.brand === "O OfficeOS" ? `N${COMPANY}` : s.brand, crumbs: s.crumbs?.replace(/^Workspace\//, `${COMPANY}/`) });
const ruledPhone = (s) => (s.toggle?.[0] ? { ...s, shown: [s.shown[0], `About ${COMPANY}`, ...s.shown.slice(1)] } : s);
// L1 (ruled): the brand panel's "© 2026 OfficeOS. All rights reserved." line is gone; the footer says "© <year> <company> · Powered by OfficeOS"
const ruledAuth = (s) => ({ ...s, text: s.text?.replace(/^O OfficeOS /, `N ${COMPANY} `).replace(/ © 2026 OfficeOS\. All rights reserved\./, ""), title: s.title?.replace(/\| OfficeOS$/, `| ${COMPANY}`) });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(9)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 600)}` : ""}`); };
const j = JSON.stringify;

async function open(base, who, page, width = 1280, theme = "light", init = null) {
  const ctx = await browser.newContext({ ...SIZES[width], timezoneId: "Asia/Kolkata" });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date("2026-09-28T10:00:00+05:30"));
  await ctx.addInitScript(([w, th]) => {
    if (sessionStorage.getItem("shell-set")) return;
    sessionStorage.setItem("shell-set", "1");
    localStorage.clear();
    localStorage.setItem("officeos:theme", JSON.stringify(th));
    if (w) localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
  }, [WHO[who] ?? null, theme]);
  if (init) await ctx.addInitScript(init);
  const t = await ctx.newPage();
  const errs = []; t.on("pageerror", (e) => errs.push(e.message)); t.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await t.goto(base + "/pages/" + page); await t.waitForLoadState("load");
  await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(350);
  return { ctx, t, errs };
}

const readShell = (t) => t.evaluate(() => {
  const tx = (e) => (e ? e.textContent.replace(/\s+/g, " ").trim() : null);
  const sb = document.querySelector(".sidebar"), top = document.querySelector(".topbar");
  const path = (a) => new URL(a.href, location.href).pathname + new URL(a.href, location.href).search;
  const actions = [...top.querySelector(".topbar__actions").children].map((c) => {
    const b = c.matches("button") ? c : c.querySelector(":scope > button");
    return { tag: c.className || c.tagName, label: b.getAttribute("aria-label"), title: b.getAttribute("title"), dot: b.hasAttribute("data-waiting"), popup: b.getAttribute("aria-haspopup") };
  });
  return {
    role: document.documentElement.dataset.role, drawn: document.documentElement.hasAttribute("data-nav-drawn"),
    brand: tx(sb.querySelector(".sidebar__brand")), profile: tx(sb.querySelector(".nav__profile")),
    sections: [...sb.querySelectorAll(".nav__section")].map((s) => ({
      cls: [...s.classList].sort().join(" "), trigger: s.querySelector(".nav__trigger") ? [s.querySelector(".nav__trigger").getAttribute("aria-label"), s.querySelector(".nav__trigger").getAttribute("aria-expanded")] : null,
      title: tx(s.querySelector(".nav__group-title")),
      items: [...s.querySelectorAll(".nav__panel a")].map((a) => [tx(a), path(a), a.classList.contains("is-active"), a.getAttribute("aria-current"), a.dataset.label ?? null, a.querySelector("svg").getAttribute("class"), a.querySelector("svg path").getAttribute("d").slice(0, 20)]),
    })),
    signout: tx(sb.querySelector(".nav__signout")), footer: [sb.querySelector(".sidebar__footer").getAttribute("aria-label"), tx(sb.querySelector(".sidebar__footer-text"))],
    crumbs: tx(top.querySelector(".topbar__left")), actions,
    avatar: [tx(top.querySelector(".avatar")), top.querySelector(".avatar").getAttribute("title")],
    account: [...top.querySelectorAll(".dropdown:last-child .dropdown__item")].map((a) => [tx(a), a.href ? path(a) : null]),
    search: [top.querySelector(".topbar__search input").getAttribute("placeholder"), tx(top.querySelector(".topbar__search kbd"))],
  };
});
function compare(n, label, a, b) {
  const diff = Object.keys(a).filter((k) => j(a[k]) !== j(b[k]));
  check(n, label, diff.length === 0, diff.length ? diff.map((k) => `${k}: old ${j(a[k])} new ${j(b[k])}`).join(" ; ") : `${a.sections?.length ?? ""} sections, ${a.actions?.length ?? ""} actions, "${a.crumbs ?? ""}"`);
}

if (ONLY.includes("D")) {
  console.log("--- D. The drawn shell at 1280 ---");
  for (const who of Object.keys(PAGES)) for (const page of PAGES[who]) {
    const o = await open(O, who, page), n = await open(N, who, page);
    compare(`D.${who}.${page.split("/")[1].replace(".html", "")}`, `${who} on ${page}`, ruledShell(await readShell(o.t)), await readShell(n.t));
    if (o.errs.length || n.errs.length) check(`D.${who}.err`, "no page errors", false, j([o.errs, n.errs]));
    await o.ctx.close(); await n.ctx.close();
  }
}

if (ONLY.includes("R")) {
  console.log("\n--- R. The rail ---");
  const o = await open(O, "admin", "leave/my-leave.html"), n = await open(N, "admin", "leave/my-leave.html");
  const rail = async (t) => {
    const out = [];
    const triggers = await t.$$(".nav__trigger");
    for (const k of [0, 2]) {
      await triggers[k].focus(); await t.keyboard.press("Enter"); await t.waitForTimeout(100);
      // the panel's top relative to its button (D2a: the rail's brand is taller, so every button sits 10px lower; the panel still
      // opens level with its button, which is what this checks)
      out.push(await t.evaluate(() => { const s = document.querySelector(".nav__section.is-open"); return s ? [s.querySelector(".nav__trigger").getAttribute("aria-label"), s.querySelector(".nav__trigger").getAttribute("aria-expanded"), Math.round(parseFloat(s.querySelector(".nav__panel").style.top) - s.querySelector(".nav__trigger").getBoundingClientRect().top), document.activeElement.textContent.trim()] : null; }));
      await t.keyboard.press("Escape"); await t.waitForTimeout(100);
      out.push(await t.evaluate(() => [document.querySelectorAll(".nav__section.is-open").length, document.activeElement.getAttribute("aria-label")]));
    }
    await (await t.$(".nav__trigger")).focus();
    for (let i = 0; i < 3; i++) await t.keyboard.press("ArrowDown");
    out.push(await t.evaluate(() => document.activeElement.getAttribute("aria-label") ?? document.activeElement.textContent.trim()));
    await t.mouse.move(30, 300); await t.hover(".nav__section:nth-child(3) .nav__trigger"); await t.waitForTimeout(300);
    out.push(await t.evaluate(() => document.querySelector(".nav__section.is-open .nav__trigger")?.getAttribute("aria-label") ?? null));
    await t.mouse.move(700, 500); await t.waitForTimeout(450);
    out.push(await t.evaluate(() => document.querySelectorAll(".nav__section.is-open").length));
    return out;
  };
  const [ro, rn] = [await rail(o.t), await rail(n.t)];
  check("R1", "keyboard open + focus, Esc, arrows, hover open and leave: the same", j(ro) === j(rn), j(ro) === j(rn) ? j(rn) : `old ${j(ro)} new ${j(rn)}`);
  await o.ctx.close(); await n.ctx.close();
}

if (ONLY.includes("Q")) {
  console.log("\n--- Q. Search ---");
  for (const who of ["admin", "emp"]) {
    const o = await open(O, who, "leave/my-leave.html"), n = await open(N, who, "leave/my-leave.html");
    const res = async (t, q) => {
      await t.fill(".topbar__search input", q); await t.waitForTimeout(100);
      return t.evaluate(() => { const l = document.getElementById("search-results"); return [l.hidden, [...l.children].map((c) => [c.textContent.trim(), c.getAttribute("href"), c.classList.contains("is-active"), c.getAttribute("role")])]; });
    };
    for (const q of ["le", "pay", "arj", "zzz"]) {
      const [a, b] = [await res(o.t, q), await res(n.t, q)];
      const norm = (r) => j([r[0], r[1].map(([x, h, act, role]) => [x, h ? new URL(h, "http://x/pages/leave/").pathname + new URL(h, "http://x/pages/leave/").search : null, act, role])]);
      check(`Q.${who}.${q}`, `${who} searches "${q}"`, norm(a) === norm(b), norm(a) === norm(b) ? `${b[1].length} results` : `old ${norm(a)} new ${norm(b)}`);
    }
    await o.t.fill(".topbar__search input", "pay"); await n.t.fill(".topbar__search input", "pay");
    await o.t.keyboard.press("ArrowDown"); await n.t.keyboard.press("ArrowDown");
    await Promise.all([o.t.keyboard.press("Enter"), n.t.keyboard.press("Enter")]); await o.t.waitForTimeout(700); await n.t.waitForTimeout(300);
    check(`Q.${who}.enter`, `${who}: ArrowDown + Enter on "pay" opens the same page`, new URL(o.t.url()).pathname === new URL(n.t.url()).pathname, [o.t.url(), n.t.url()].join(" | "));
    await o.ctx.close(); await n.ctx.close();
  }
}

if (ONLY.includes("T")) {
  console.log("\n--- T. The Appearance menu ---");
  const o = await open(O, "hr", "leave/my-leave.html"), n = await open(N, "hr", "leave/my-leave.html");
  const st = (t) => t.evaluate(() => ({ open: document.querySelector(".theme-menu").closest(".dropdown").classList.contains("is-open"), theme: document.documentElement.dataset.theme ?? null, accent: document.documentElement.dataset.accent ?? null,
    pressed: [...document.querySelectorAll(".theme-menu [aria-pressed='true']")].map((b) => b.textContent || b.getAttribute("aria-label")), current: document.querySelector(".theme-menu__current").textContent }));
  const steps = async (t) => {
    const out = [];
    await t.click('button[aria-label="Appearance"]'); await t.waitForTimeout(100); out.push(await st(t));
    await t.click('[data-theme-choice="dark"]'); await t.waitForTimeout(100); out.push(await st(t));
    await t.click('[data-accent-choice="teal"]'); await t.waitForTimeout(100); out.push(await st(t));
    await t.keyboard.press("Escape"); await t.waitForTimeout(100); out.push(await st(t), await t.evaluate(() => document.activeElement.getAttribute("aria-label")));
    return out;
  };
  const [a, b] = [await steps(o.t), await steps(n.t)];
  check("T1", "open, Dark, Teal, Esc: the same states", j(a) === j(b), j(a) === j(b) ? j(b) : `old ${j(a)} new ${j(b)}`);
  await o.ctx.close(); await n.ctx.close();
}

if (ONLY.includes("N")) {
  console.log("\n--- N. Router navigation and no text rewritten after paint (new only) ---");
  const watch = () => {
    window.__rewrites = []; window.__marker = "kept";
    new MutationObserver((ms) => ms.forEach((m) => {
      const el = m.target.nodeType === 3 ? m.target.parentElement : m.target;
      if (el?.closest?.(".topbar, .sidebar") && m.type === "characterData") window.__rewrites.push(el.className + ": " + m.oldValue + " -> " + m.target.data);
    })).observe(document, { subtree: true, characterData: true, characterDataOldValue: true });
  };
  const n = await open(N, "emp", "leave/my-leave.html", 1280, "light", watch);
  await n.t.evaluate(() => document.querySelector('.sidebar a[href="/pages/requests/my-requests.html"]').click()); await n.t.waitForTimeout(250);   // inside a closed flyout
  const after = await n.t.evaluate(() => [location.pathname, window.__marker, document.querySelector(".topbar__left strong").textContent, document.querySelector(".nav__item.is-active")?.getAttribute("href"), document.title]);
  check("N1", "a sidebar link opens its page through the router (no full load)", after[0] === "/pages/requests/my-requests.html" && after[1] === "kept" && after[3] === after[0], j(after));
  await n.t.goBack(); await n.t.waitForTimeout(250);
  const back = await n.t.evaluate(() => [location.pathname, window.__marker, document.querySelector(".topbar__left strong").textContent, document.title, document.querySelector("main h1").textContent]);
  check("N2", "Back returns to My leave, still without a full load", back[0] === "/pages/leave/my-leave.html" && back[1] === "kept" && back[2] === "My leave" && back[4] === "My leave", j(back));
  const rw = await n.t.evaluate(() => window.__rewrites);
  check("N3", "no text in the topbar or sidebar rewritten in place after paint", rw.length === 0, j(rw.slice(0, 5)));
  check("N4", "no page errors", !n.errs.length, j(n.errs));
  await n.ctx.close();
}

if (ONLY.includes("F")) {
  console.log("\n--- F. No role-colour flash (new only) ---");
  for (const [who, page] of [["emp", "announcements/announcements.html"], ["emp", "leave/my-leave.html"], ["fin", "announcements/announcements.html"], ["hr", "users/users-list.html"], ["hr", "dashboard/hr.html"]]) {
    const firstFrame = () => {
      window.__bars = [];
      const tick = () => { const b = document.querySelector(".topbar"); if (b) window.__bars.push(getComputedStyle(b).backgroundColor + "|" + document.documentElement.dataset.role); if (window.__bars.length < 40) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    };
    const n = await open(N, who, page, 1280, "light", firstFrame);
    const bars = await n.t.evaluate(() => [...new Set(window.__bars)]);
    check(`F.${who}.${page.split("/")[1].replace(".html", "")}`, `${who} on ${page}: one bar colour from the first frame`, bars.length === 1, j(bars));
    await n.ctx.close();
  }
}

// ---------------- round 3 ----------------
if (ONLY.includes("P")) {
  console.log("\n--- P. The phone shell at 412: the topbar, the back arrow, the drawer (accordion), Esc ---");
  const phoneRead = (t) => t.evaluate(() => {
    const vis = (e) => Boolean(e) && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
    const top = document.querySelector(".topbar"), sb = document.querySelector(".sidebar");
    return { back: vis(top.querySelector(".topbar__back")) ? new URL(top.querySelector(".topbar__back").href).pathname : null, hasBack: document.documentElement.hasAttribute("data-has-back"),
      toggle: [vis(top.querySelector(".topbar__menu-toggle")), top.querySelector(".topbar__menu-toggle").getAttribute("aria-label"), top.querySelector(".topbar__menu-toggle").getAttribute("aria-expanded")],
      title: top.querySelector(".topbar__left strong").textContent, shown: [...top.querySelectorAll("button, a")].filter(vis).map((b) => b.getAttribute("aria-label") ?? b.textContent.trim()),
      drawer: sb.classList.contains("is-open"), open: [...sb.querySelectorAll(".nav__section.is-open .nav__trigger")].map((b) => b.getAttribute("aria-label")),
      profile: vis(sb.querySelector(".nav__profile")) ? sb.querySelector(".nav__profile").textContent.replace(/\s+/g, " ").trim() : null, signout: vis(sb.querySelector(".nav__signout")),
      focus: document.activeElement === document.body ? "(body)" : document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent.trim().slice(0, 30), ready: document.documentElement.hasAttribute("data-phone-ready"), mainShown: vis(document.querySelector("main")) };
  });
  for (const [who, page] of [["emp", "leave/my-leave.html"], ["admin", "users/user-form.html"], ["emp", "leave/apply-leave.html"], ["admin", "dashboard/admin.html"]]) {
    const o = await open(O, who, page, 412), n = await open(N, who, page, 412);
    await o.t.waitForTimeout(800);
    const steps = async (t) => {
      const out = [await phoneRead(t)];
      if (!(await t.isVisible(".topbar__menu-toggle"))) return out;   // a detail page: the back arrow has the menu button's place
      await t.click(".topbar__menu-toggle"); await t.waitForTimeout(250); out.push(await phoneRead(t));
      const other = await t.$$(".sidebar .nav__section:not(.is-open) .nav__trigger");
      if (other[1]) { await other[1].click(); await t.waitForTimeout(150); out.push(await phoneRead(t)); }
      await t.keyboard.press("Escape"); await t.waitForTimeout(250); out.push(await phoneRead(t));
      return out;
    };
    const [a, b] = [(await steps(o.t)).map(ruledPhone), await steps(n.t)];
    const name = `P.${who}.${page.split("/")[1].replace(".html", "")}`;
    check(name, `${who} on ${page} at 412: topbar, drawer open, another section, Esc`, j(a) === j(b), j(a) === j(b) ? j(b.at(-1)).slice(0, 300) : `see ${name}.json`);
    if (j(a) !== j(b)) fs.writeFileSync(path.join(SHOTS, `${name}.json`), JSON.stringify({ old: a, new: b }, null, 1));
    await o.t.screenshot({ path: path.join(SHOTS, `phone-${who}-${page.split("/")[1].replace(".html", "")}-drawer-old.png`) }).catch(() => {});
    await o.ctx.close(); await n.ctx.close();
  }
}

if (ONLY.includes("B")) {
  console.log("\n--- B. The bell: the list of what waits, a card, Esc, See all ---");
  for (const [who, width] of [["hr", 1280], ["admin", 1280], ["mgr", 1280], ["hr", 412]]) {
    const o = await open(O, who, "leave/my-leave.html", width), n = await open(N, who, "leave/my-leave.html", width);
    const read = (t) => t.evaluate(() => {
      const vis = (e) => Boolean(e) && !e.hidden && e.getClientRects().length > 0;
      const p = document.getElementById("bell-panel"), c = document.getElementById("approval-card");
      const bell = document.querySelector(".topbar__icon-btn--dot");
      return { bell: [bell.getAttribute("aria-label"), bell.getAttribute("aria-expanded"), bell.hasAttribute("data-waiting")],
        // the card as the old one drew it: round 13b's Reject / Approve (its footer's .btn-group) left out; req.mjs K checks them
        panel: vis(p) ? p.innerText.replace(/\s+/g, " ").trim() : null, card: c?.classList.contains("is-open") ? [c.dataset.state, (() => {
          const copy = c.cloneNode(true); copy.querySelector(".modal__footer .btn-group")?.remove(); document.body.append(copy);
          const text = copy.innerText.replace(/\s+/g, " ").trim(); copy.remove(); return text; })()] : null,
        focus: document.activeElement?.id || document.activeElement?.getAttribute("aria-label") };
    });
    const steps = async (t) => {
      const out = [await read(t)];
      await t.click(".topbar__icon-btn--dot"); await t.waitForTimeout(500); out.push(await read(t));
      if (await t.$(".bell-panel__item")) { await t.click(".bell-panel__item"); await t.waitForTimeout(250); out.push(await read(t)); await t.keyboard.press("Escape"); await t.waitForTimeout(150); out.push(await read(t)); }
      await t.click(".topbar__icon-btn--dot"); await t.waitForTimeout(300); out.push(await read(t));
      await t.click("#bell-panel .bell-panel__footer a"); await t.waitForTimeout(900); out.push(new URL(t.url()).pathname);
      return out;
    };
    const [a, b] = [await steps(o.t), await steps(n.t)];
    check(`B.${who}.${width}`, `${who} at ${width}: bell, list, card, Esc, See all`, j(a) === j(b), j(a) === j(b) ? j(b[1]).slice(0, 300) : `old ${j(a)} new ${j(b)}`);
    if (o.errs.length || n.errs.length) check(`B.${who}.err`, "no page errors", false, j([o.errs, n.errs]));
    if (width === 412 || who === "hr") { await n.t.goBack(); await n.t.waitForTimeout(300); await n.t.click(".topbar__icon-btn--dot"); await n.t.waitForTimeout(400); await n.t.screenshot({ path: path.join(SHOTS, `bell-${who}-${width}-new.png`) }); }
    await o.ctx.close(); await n.ctx.close();
  }
}

if (ONLY.includes("A")) {
  console.log("\n--- A. The sign-in and error pages: markup, links, forms, toasts ---");
  const read = (t) => t.evaluate(() => {
    const m = document.querySelector("main.auth");
    return { cls: m?.className, style: m?.getAttribute("style"), text: m?.innerText.replace(/\s+/g, " ").trim(), links: [...(m?.querySelectorAll("a") ?? [])].map((a) => [a.textContent.trim(), a.getAttribute("href") === "#" || a.getAttribute("href").startsWith("javascript") ? a.getAttribute("href") : new URL(a.href).pathname]),
      role: document.documentElement.dataset.role, title: document.title, sidebar: Boolean(document.querySelector(".sidebar")) };
  });
  const toast = (t) => t.evaluate(() => [...document.querySelectorAll(".toast")].map((e) => e.className + " | " + e.innerText.replace(/×/g, "").trim()));
  for (const who of [null, "emp", "fin"]) for (const page of ["auth/login.html", "auth/forgot-password.html", "auth/reset-password.html", "auth/two-factor.html", "errors/403.html", "errors/404.html", "errors/500.html"]) {
    if (who && page.startsWith("auth/") && page !== "auth/forgot-password.html") continue;
    const o = await open(O, who ?? "out", page), n = await open(N, who ?? "out", page);
    const [a, b] = [ruledAuth(await read(o.t)), await read(n.t)];
    check(`A.${who ?? "out"}.${page.split("/")[1].replace(".html", "")}`, `${who ?? "signed out"} on ${page}`, j(a) === j(b), j(a) === j(b) ? `${a.links.length} links, role ${a.role}` : `old ${j(a)} new ${j(b)}`);
    await o.ctx.close(); await n.ctx.close();
  }
  const flows = {
    "auth/reset-password.html": async (t) => { await t.fill("#rp-new", "abc12345"); await t.fill("#rp-confirm", "abc"); await t.click("form button[type=submit]"); await t.waitForTimeout(200);
      const e1 = await t.evaluate(() => [document.querySelector(".form-error")?.textContent, document.activeElement.id]);
      await t.fill("#rp-confirm", "abc12345"); await t.click("form button[type=submit]"); await t.waitForTimeout(200); return [e1, await t.evaluate(() => document.querySelectorAll(".form-error").length), await toast(t)]; },
    "auth/two-factor.html": async (t) => { await t.click("form button[type=submit]"); await t.waitForTimeout(200);
      const e1 = await t.evaluate(() => [document.querySelector(".form-error")?.textContent, document.activeElement.className]);
      const boxes = await t.$$(".otp__input"); for (const [i, b] of boxes.entries()) await b.type(String(i + 1));
      await t.click("form button[type=submit]"); await t.waitForTimeout(300); const ts = await toast(t); await t.waitForTimeout(1600);
      return [e1, ts, new URL(t.url()).pathname, await t.evaluate(() => JSON.parse(localStorage.getItem("officeos:session"))?.employeeId)]; },
    "auth/forgot-password.html": async (t) => { const ph = await t.$("[data-not-implemented]"); if (ph) { await ph.click(); await t.waitForTimeout(200); }
      const ts = await toast(t); await t.click('main a[href="login.html"]'); await t.waitForTimeout(700); return [ts, new URL(t.url()).pathname]; },
    "auth/login.html": async (t) => { await t.click('[data-demo-role="fin"]'); await t.waitForTimeout(800); return [new URL(t.url()).pathname, await t.evaluate(() => JSON.parse(localStorage.getItem("officeos:session"))?.employeeId)]; },
  };
  for (const [page, flow] of Object.entries(flows)) {
    const o = await open(O, "out", page), n = await open(N, "out", page);
    const [a, b] = [await flow(o.t), await flow(n.t)];
    check(`A.flow.${page.split("/")[1].replace(".html", "")}`, `${page}: the page's own behaviour`, j(a) === j(b), j(a) === j(b) ? j(b) : `old ${j(a)} new ${j(b)}`);
    if (o.errs.length || n.errs.length) check(`A.flow.err`, "no page errors", false, j([o.errs, n.errs]));
    await o.ctx.close(); await n.ctx.close();
  }
  for (const [page, width, theme] of [["auth/login.html", 1280, "light"], ["auth/login.html", 412, "dark"], ["errors/403.html", 1280, "dark"], ["auth/two-factor.html", 412, "light"]]) for (const [side, base] of [["old", O], ["new", N]]) {
    const x = await open(base, "out", page, width, theme);
    await x.t.screenshot({ path: path.join(SHOTS, `public-${page.split("/")[1].replace(".html", "")}-${width}-${theme}-${side}.png`) }); await x.ctx.close();
  }
}

if (ONLY.includes("S")) {
  console.log("\n--- S. Shots ---");
  let k = 0;
  for (const [who, page] of [["admin", "dashboard/admin.html"], ["emp", "leave/my-leave.html"]]) for (const width of [1280, 412]) for (const theme of ["light", "dark"]) for (const [side, base] of [["old", O], ["new", N]]) {
    const x = await open(base, who, page, width, theme);
    await x.t.screenshot({ path: path.join(SHOTS, `shell-${who}-${page.split("/")[1].replace(".html", "")}-${width}-${theme}-${side}.png`), animations: "disabled" });
    k++; await x.ctx.close();
  }
  const n = await open(N, "admin", "leave/my-leave.html");
  await n.t.click(".nav__section:nth-child(3) .nav__trigger"); await n.t.waitForTimeout(150);
  await n.t.screenshot({ path: path.join(SHOTS, "shell-admin-flyout-1280-new.png") });
  await n.t.click('button[aria-label="Appearance"]'); await n.t.waitForTimeout(150);
  await n.t.screenshot({ path: path.join(SHOTS, "shell-admin-theme-menu-1280-new.png") });
  await n.t.keyboard.press("Escape"); await n.t.fill(".topbar__search input", "le"); await n.t.waitForTimeout(150);
  await n.t.screenshot({ path: path.join(SHOTS, "shell-admin-search-1280-new.png") });
  await n.ctx.close();
  check("S1", "shots written", fs.readdirSync(SHOTS).filter((f) => f.startsWith("shell-")).length === k + 3, `${k + 3} files`);
}

await browser.close();
console.log(`\nshell: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
