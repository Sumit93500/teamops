// React round 6's dashboards parity (msedge, headless). usage: node dash.mjs <app dist> <pristine tree> <shots dir> [ONLY=AE...]
// The old page (pristine) and the new route, same session, fixed clock (Mon 28 Sep 2026 10:00 IST), fresh storage each. Compared
// inside main#main: the header (title, subtitle, buttons shown), every stat (label, value, note and its tone, shown or hidden), the
// chart (each bar's title, kind and height; the summary label; range and note), every list, card and table text, the table's
// footer; then the page's own controls (admin: search, department, Next; Export's two files byte for byte).
//   A  admin dashboard, as each role that opens it      E  employee dashboard, as each role that opens it
//   Z  the empty states (new only; the old page draws a chart of zeros): admin with everyone joining tomorrow, employee as a new
//      joiner: "No data in this range." in the chart's place, the range and note kept; the other cards unchanged
//   S  shots: each dashboard at 1280 and 412, light and dark, old and new; and each empty state
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, PRIST, SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "AEZS";
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srvN = spawn("python", [path.join(HERE, "spa-serve.py"), "9981", DIST], { stdio: "ignore" });
const srvO = spawn("python", [path.join(EDGE, "lib", "serve.py"), "9982", PRIST], { stdio: "ignore" });
const stop = () => { try { srvN.kill(); srvO.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9981", O = "http://127.0.0.1:9982";
for (const u of [N + "/", O + "/pages/errors/404.html"]) { for (let i = 0; i < 60; i++) { try { if ((await fetch(u)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); } }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const SIZES = { 412: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA }, 1280: { viewport: { width: 1280, height: 900 } } };
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(14)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 500)}` : ""}`); };
const j = JSON.stringify;

async function open(base, who, page, { width = 1280, theme = "light", prep = null } = {}) {
  const ctx = await browser.newContext({ ...SIZES[width], timezoneId: "Asia/Kolkata", acceptDownloads: true });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date("2026-09-28T10:00:00+05:30"));
  await ctx.addInitScript(([w, th]) => {
    if (sessionStorage.getItem("d-set")) return;
    sessionStorage.setItem("d-set", "1"); localStorage.clear();
    localStorage.setItem("officeos:theme", JSON.stringify(th));
    localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
  }, [WHO[who], theme]);
  const t = await ctx.newPage();
  const errs = []; t.on("pageerror", (e) => errs.push(e.message)); t.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await t.goto(base + "/pages/" + page); await t.waitForLoadState("load"); await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(350);
  if (prep) { await t.evaluate(prep); await t.reload(); await t.waitForLoadState("load"); await t.waitForTimeout(400); }
  return { ctx, t, errs, at: new URL(t.url()).pathname };
}

const read = (t) => t.evaluate(() => {
  const m = document.querySelector("main#main");
  if (!m) return null;
  const vis = (e) => Boolean(e) && e.getClientRects().length > 0;
  const tx = (e) => (e ? e.innerText.replace(/\s+/g, " ").trim() : null);
  const chart = m.querySelector(".chart");
  return {
    h1: tx(m.querySelector(".page-header h1")), sub: tx(m.querySelector(".page-header__subtitle")),
    buttons: [...m.querySelectorAll(".page-header__actions .btn")].filter(vis).map(tx),
    stats: [...m.querySelectorAll(".stat")].map((s) => [s.dataset.stat, vis(s), tx(s.querySelector(".stat__label")), tx(s.querySelector(".stat__value")), tx(s.querySelector(".stat__delta")), s.querySelector(".stat__delta")?.className ?? null]),
    chartLabel: chart?.getAttribute("aria-label") ?? null,
    bars: chart ? [...chart.querySelectorAll(".chart__bar")].map((b) => [b.title, b.className.replace("chart__bar", "").trim().replace("chart__bar--", ""), b.style.getPropertyValue("--h")]) : null,
    labels: chart ? [...chart.querySelectorAll(".chart__label")].map(tx) : null,
    metas: [...m.querySelectorAll(".card__meta")].map(tx), notes: [...m.querySelectorAll(".card__body > p.text-xs")].map(tx),
    // D2b: the headcount card is the design system's BarChart on the new side; both sides are read as "<department> <count>"
    // pairs (old: the bar rows; new: the chart's data table), so the text compares exactly and the drawing doesn't
    cards: [...m.querySelectorAll(".list, .activity, #headcount-bars, #balance-card")].map((c) => [c.id || c.className, c.id !== "headcount-bars" ? tx(c)
      : c.querySelector(".bar-row") ? [...c.querySelectorAll(".bar-row")].map((r) => `${tx(r.firstElementChild)} ${tx(r.querySelector(".bar-row__value"))}`).join(" ")
      : [...c.querySelectorAll(".ds-chart__table tbody tr")].map((r) => [...r.cells].map(tx).join(" ")).join(" ")]),
    links: [...m.querySelectorAll(".card__header a, .list__item a")].map((a) => [tx(a), new URL(a.href).pathname]),
    tables: [...m.querySelectorAll("table:not(.ds-chart__table)")].map((tb) => [[...tb.querySelectorAll("thead th")].map(tx), [...tb.querySelectorAll("tbody tr")].map((r) => [...r.cells].map(tx))]),
    footer: tx(m.querySelector(".card__footer .card__meta")),
    noData: [...m.querySelectorAll("[data-no-data]")].map(tx),
  };
});
function compare(n, label, a, b, skip = []) {
  const diff = Object.keys(a).filter((k) => !skip.includes(k) && j(a[k]) !== j(b[k]));
  check(n, label, diff.length === 0, diff.length ? diff.map((k) => `${k}: old ${j(a[k])} new ${j(b[k])}`).join(" ; ") : `${a.stats.length} stats, ${a.bars?.length ?? 0} bars, ${a.tables.map((x) => x[1].length).join("+")} rows`);
}

async function both(who, page, n) {
  const o = await open(O, who, page), nw = await open(N, who, page);
  if (o.at !== nw.at || !o.at.endsWith(page)) { check(n, `${who} on ${page}: lands where the old site does`, o.at === nw.at, `${o.at} | ${nw.at}`); await o.ctx.close(); await nw.ctx.close(); return null; }
  return { o, n: nw };
}

if (ONLY.includes("A")) {
  console.log("--- A. Admin dashboard ---");
  for (const who of ["admin", "hr", "fin", "emp", "mgr"]) {
    const x = await both(who, "dashboard/admin.html", `A.${who}`); if (!x) continue;
    const [a, b] = [await read(x.o.t), await read(x.n.t)];
    compare(`A1.${who}`, `${who}: the page as it opens`, a, b);
    // search, department, Next
    const steps = async (t) => {
      const out = [];
      await t.fill("#admin-search", "a"); await t.waitForTimeout(150); out.push((await read(t)).tables[0][1].length, await t.evaluate(() => document.getElementById("admin-rows-meta").textContent));
      await t.fill("#admin-search", ""); await t.selectOption("#admin-dept", { index: 1 }); await t.waitForTimeout(150); out.push(await t.evaluate(() => [document.getElementById("admin-rows-meta").textContent, document.querySelector("#admin-dept").value]));
      await t.selectOption("#admin-dept", { index: 0 }); await t.waitForTimeout(100);
      const next = await t.$("#admin-next:not([disabled])");
      if (next) { await next.click(); await t.waitForTimeout(150); }
      out.push(await t.evaluate(() => [document.getElementById("admin-rows-meta").textContent, document.getElementById("admin-prev").disabled, document.getElementById("admin-next").disabled, document.querySelectorAll("#admin-rows tr").length]));
      return out;
    };
    const [sa, sb] = [await steps(x.o.t), await steps(x.n.t)];
    check(`A2.${who}`, `${who}: search, department, Next`, j(sa) === j(sb), j(sa) === j(sb) ? j(sb) : `old ${j(sa)} new ${j(sb)}`);
    if (who === "admin") {
      const files = async (t) => {
        const exp = await t.$('main .page-header__actions button[data-export]'); if (!exp) return [];
        const got = [];
        t.on("download", async (dl) => got.push([dl.suggestedFilename(), fs.readFileSync(await dl.path(), "utf8")]));
        await exp.click(); await t.waitForTimeout(1500);
        return got.sort((p, q) => p[0].localeCompare(q[0]));
      };
      const [fa, fb] = [await files(x.o.t), await files(x.n.t)];
      check("A3.admin", "Export: the same two files, byte for byte", fa.length === 2 && j(fa) === j(fb), j([fa.map((f) => [f[0], f[1].length]), fb.map((f) => [f[0], f[1].length])]));
    }
    if (x.o.errs.length || x.n.errs.length) check(`A9.${who}`, "no page errors", false, j([x.o.errs, x.n.errs]));
    await x.o.ctx.close(); await x.n.ctx.close();
  }
}

if (ONLY.includes("E")) {
  console.log("\n--- E. Employee dashboard ---");
  for (const who of ["emp", "mgr", "hr", "fin", "admin"]) {
    const x = await both(who, "dashboard/employee.html", `E.${who}`); if (!x) continue;
    compare(`E1.${who}`, `${who}: the page as it opens`, await read(x.o.t), await read(x.n.t));
    if (x.o.errs.length || x.n.errs.length) check(`E9.${who}`, "no page errors", false, j([x.o.errs, x.n.errs]));
    await x.o.ctx.close(); await x.n.ctx.close();
  }
}

// ---------------- round 7 ----------------
// The question before a decision: window.confirm on the old page, the in-app dialog on the new one; answered either way.
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
const toasts = (t) => t.evaluate(() => [...document.querySelectorAll(".toast")].map((e) => e.className + " | " + e.querySelector(".toast__text").textContent.trim()));

if (ONLY.includes("H")) {
  console.log("\n--- H. HR dashboard ---");
  for (const who of ["hr", "admin", "fin", "emp", "mgr"]) {
    const x = await both(who, "dashboard/hr.html", `H.${who}`); if (!x) continue;
    compare(`H1.${who}`, `${who}: the page as it opens`, await read(x.o.t), await read(x.n.t));
    const steps = async (t) => {
      const out = [];
      await t.fill("#leave-search", "a"); await t.waitForTimeout(120); out.push(await t.evaluate(() => [document.getElementById("leave-rows-meta").textContent, document.querySelectorAll("#leave-rows tr").length]));
      await t.fill("#leave-search", ""); await t.selectOption("#leave-status", "approved"); await t.waitForTimeout(120); out.push(await t.evaluate(() => [document.getElementById("leave-rows-meta").textContent, document.getElementById("leave-rows").innerText.replace(/\s+/g, " ").slice(0, 200)]));
      await t.selectOption("#leave-status", "rejected"); await t.fill("#leave-search", "zzz"); await t.waitForTimeout(120); out.push(await t.evaluate(() => [document.getElementById("leave-rows-meta").textContent, document.getElementById("leave-rows").innerText.trim()]));
      return out;
    };
    const [sa, sb] = [await steps(x.o.t), await steps(x.n.t)];
    check(`H2.${who}`, `${who}: search and status filter`, j(sa) === j(sb), j(sa) === j(sb) ? j(sb).slice(0, 200) : `old ${j(sa)} new ${j(sb)}`);
    if (x.o.errs.length || x.n.errs.length) check(`H9.${who}`, "no page errors", false, j([x.o.errs, x.n.errs]));
    await x.o.ctx.close(); await x.n.ctx.close();
  }
  // decisions as HR: Approve (the question, then the toast and the page), Reject (no reason refused, then a reason)
  const o = await open(O, "hr", "dashboard/hr.html"), n = await open(N, "hr", "dashboard/hr.html");
  const firstApprove = "#approvals-list .list__item:first-child .btn--primary";
  for (const x of [o, n]) await ask(x, firstApprove, false);
  check("H3", "Approve, then No: the same question, nothing changes", o.msg === n.msg && /^Approve this request\?\n/.test(n.msg ?? ""), j([o.msg, n.msg]));
  for (const x of [o, n]) await ask(x, firstApprove, true);
  const [ta, tb] = [await toasts(o.t), await toasts(n.t)];
  const [pa, pb] = [await read(o.t), await read(n.t)];
  check("H4", "Approve, then Yes: the same toast and the same page after (stats, list, activity, table)", j(ta) === j(tb) && tb.length === 1 && j(pa) === j(pb), j([ta, tb]) + (j(pa) === j(pb) ? "" : ` page differs: ${Object.keys(pa).filter((k) => j(pa[k]) !== j(pb[k])).join(",")}`));
  const rej = async (t) => {
    await t.click("#approvals-list .list__item:first-child .btn:not(.btn--primary)"); await t.waitForTimeout(250);
    const opened = await t.evaluate(() => { const m = [...document.querySelectorAll(".modal.is-open")].at(-1); return m ? [m.querySelector(".modal__title").textContent, m.querySelector(".modal__desc").textContent, document.activeElement.id] : null; });
    await t.click(".modal.is-open button[type=submit]"); await t.waitForTimeout(200);
    const err = await t.evaluate(() => document.querySelector(".modal.is-open .form-error")?.textContent ?? null);
    await t.fill(".modal.is-open textarea", "Team is short that week"); await t.click(".modal.is-open button[type=submit]"); await t.waitForTimeout(300);
    return [opened, err, await t.evaluate(() => Boolean(document.querySelector(".modal.is-open"))), await toasts(t)];
  };
  const [ra, rb] = [await rej(o.t), await rej(n.t)];
  check("H5", "Reject: the modal's title, the request, focus on the reason; no reason refused with the store's words; a reason rejects it, the modal closes, the same toast", j(ra) === j(rb) && ra[1],
    j(ra) === j(rb) ? j(rb).slice(0, 300) : `old ${j(ra)} new ${j(rb)}`);
  const [qa, qb] = [await read(o.t), await read(n.t)];
  compare("H6", "after the rejection: the same page", qa, qb);
  check("H7", "no page errors in the decisions", !o.errs.length && !n.errs.length, j([o.errs, n.errs]));
  await o.ctx.close(); await n.ctx.close();
}

if (ONLY.includes("F")) {
  console.log("\n--- F. Finance dashboard ---");
  for (const who of ["fin", "admin", "hr", "emp", "mgr"]) {
    const x = await both(who, "dashboard/finance.html", `F.${who}`); if (!x) continue;
    compare(`F1.${who}`, `${who}: the page as it opens`, await read(x.o.t), await read(x.n.t));
    const steps = async (t) => {
      const inp = await t.$('main .table__filters input'); if (!inp) return null;
      await inp.fill("ka"); await t.waitForTimeout(150);
      return t.evaluate(() => [...document.querySelectorAll("#fin-run-rows tr")].map((r) => r.hidden));
    };
    const [sa, sb] = [await steps(x.o.t), await steps(x.n.t)];
    check(`F2.${who}`, `${who}: the run table's search hides the same rows`, j(sa) === j(sb), j([sa, sb]));
    if (who === "fin" || who === "admin") {
      const files = async (t) => {
        const got = []; t.on("download", async (dl) => got.push([dl.suggestedFilename(), fs.readFileSync(await dl.path(), "utf8")]));
        const inp = await t.$('main .table__filters input'); if (inp) await inp.fill("");
        await t.click('main .page-header__actions button[data-export]'); await t.waitForTimeout(1500);
        return got.sort((p, q) => p[0].localeCompare(q[0]));
      };
      const [fa, fb] = [await files(x.o.t), await files(x.n.t)];
      check(`F3.${who}`, `${who}: Export, the same files byte for byte`, fa.length === 2 && j(fa) === j(fb), j([fa.map((f) => [f[0], f[1].length]), fb.map((f) => [f[0], f[1].length])]));
    }
    if (x.o.errs.length || x.n.errs.length) check(`F9.${who}`, "no page errors", false, j([x.o.errs, x.n.errs]));
    await x.o.ctx.close(); await x.n.ctx.close();
  }
}

if (ONLY.includes("Y")) {
  console.log("\n--- Y. Round 7's empty states (new only) ---");
  const EMPTY_LEAVE = () => { const box = JSON.parse(localStorage.getItem("officeos:leave-requests")); box.records = []; localStorage.setItem("officeos:leave-requests", JSON.stringify(box)); };
  const EMPTY_SALARIES = () => { const box = JSON.parse(localStorage.getItem("officeos:salaries")); box.records = []; localStorage.setItem("officeos:salaries", JSON.stringify(box)); };
  for (const [n, who, page, prep, sel] of [["Y1", "hr", "dashboard/hr.html", EMPTY_LEAVE, "#leave-rows"], ["Y2", "fin", "dashboard/finance.html", EMPTY_SALARIES, "#fin-run-rows"], ["Y3", "admin", "dashboard/finance.html", EMPTY_SALARIES, "#fin-run-rows"]]) {
    const live = await open(N, who, page);
    const before = await read(live.t);
    const z = await open(N, who, page, { prep });
    const after = await read(z.t);
    const rowsText = await z.t.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, " ").trim().slice(0, 80), sel);
    const ok = before.noData.length === 0 && j(after.noData) === j(["No data in this range."]) && !z.errs.length;
    check(n, `${who} on ${page}: "No data in this range." in the chart's place`, ok, j({ before: before.noData, after: after.noData, rows: rowsText, errs: z.errs }));
    await z.t.screenshot({ path: path.join(SHOTS, `empty-${page.split("/")[1].replace(".html", "")}-${who}-1280-new.png`), fullPage: true });
    await live.ctx.close(); await z.ctx.close();
  }
}

if (ONLY.includes("M")) {
  console.log("\n--- M. Phone cards at 412: each table's card markup and cell display, Details opens a row ---");
  for (const [who, page] of [["admin", "dashboard/admin.html"], ["emp", "dashboard/employee.html"], ["mgr", "dashboard/employee.html"], ["hr", "dashboard/hr.html"], ["fin", "dashboard/finance.html"]]) {
    const o = await open(O, who, page, { width: 412 }), n = await open(N, who, page, { width: 412 });
    await o.t.waitForTimeout(700);
    // D2b: a chart's data table (.ds-chart__table) isn't one of the page's tables
    const cards = (t) => t.evaluate(() => [...document.querySelectorAll("main table:not(.ds-chart__table)")].map((tb) => ({ cards: tb.hasAttribute("data-cards"), role: tb.getAttribute("role"),
      rows: [...tb.querySelectorAll("tbody tr")].map((r) => [...r.cells].map((c) => `${c.dataset.label}|${c.dataset.cardPart}|${c.getAttribute("role")}|${c.querySelector(".table__more") ? "more" : ""}|${getComputedStyle(c).display}`)) })));
    const [a, b] = [await cards(o.t), await cards(n.t)];
    let opened = "no Details";
    if (await o.t.$("main .table__more")) {
      for (const x of [o, n]) { await x.t.click("main tbody tr:first-child .table__more"); await x.t.waitForTimeout(150); }
      const st = (t) => t.evaluate(() => { const r = document.querySelector("main table:not(.ds-chart__table) tbody tr:first-child"); return [r.classList.contains("is-open"), r.querySelector(".table__more").getAttribute("aria-expanded")]; });
      opened = j([await st(o.t), await st(n.t)]);
    }
    check(`M.${who}.${page.split("/")[1].replace(".html", "")}`, `${who} on ${page} at 412: the same cards`, j(a) === j(b) && a.every((x) => x.cards) && (opened === "no Details" || (() => { const [p, q] = JSON.parse(opened); return p[0] === true && j(p) === j(q); })()),
      j(a) === j(b) ? `${a.length} tables, ${a.map((x) => x.rows.length).join("+")} rows; ${opened}` : `old ${j(a)} new ${j(b)}`);
    await o.ctx.close(); await n.ctx.close();
  }
}

// rer's emptyrange P1/P2 fixtures, in the browser's storage
const JOIN_TOMORROW = () => {
  const box = JSON.parse(localStorage.getItem("officeos:users"));
  box.records.forEach((u) => { u.dateOfJoining = "2026-09-29"; });
  localStorage.setItem("officeos:users", JSON.stringify(box));
  ["attendance", "attendance-seed", "regularizations"].forEach((k) => localStorage.removeItem(`officeos:${k}`));
};
const NEW_JOINER = () => {
  const box = JSON.parse(localStorage.getItem("officeos:users"));
  const a = box.records.find((u) => u.id === "EMP-1105");
  box.records.push({ ...a, id: "EMP-1999", name: "Nina New", email: "nina.new@northwind.com", dateOfJoining: "2026-09-28" });
  localStorage.setItem("officeos:users", JSON.stringify(box));
  localStorage.setItem("officeos:session", JSON.stringify({ userLabel: "Nina New", employeeId: "EMP-1999", signedInAt: 1790000000000 }));
};

if (ONLY.includes("Z")) {
  console.log("\n--- Z. Empty states (new only) ---");
  for (const [n, who, page, prep, keep] of [["Z1", "admin", "dashboard/admin.html", JOIN_TOMORROW, "headcount-bars"], ["Z2", "emp", "dashboard/employee.html", NEW_JOINER, "balance-card"]]) {
    const live = await open(N, who, page);
    const before = await read(live.t);
    const z = await open(N, who, page, { prep });
    const after = await read(z.t);
    const keptCard = (r) => r.cards.find((c) => c[0] === keep);
    const ok = before.bars?.length === 14 && before.noData.length === 0 && after.bars === null && j(after.noData) === j(["No data in this range."]) && after.metas[0] && after.metas[0] !== "–"
      && after.notes[0] === before.notes[0] && Boolean(keptCard(after)?.[1]) && !z.errs.length;
    check(n, `${page}: "No data in this range." in the chart's place, the range and note kept, the other cards still drawn`, ok, j({ before: [before.bars?.length, before.noData], after: [after.bars, after.noData, after.metas[0], after.notes[0], keptCard(after)?.[1]?.slice(0, 40)], errs: z.errs }));
    await z.t.screenshot({ path: path.join(SHOTS, `empty-${page.split("/")[1].replace(".html", "")}-1280-new.png`), fullPage: true });
    await live.ctx.close(); await z.ctx.close();
  }
}

if (ONLY.includes("S")) {
  console.log("\n--- S. Shots ---");
  let k = 0;
  for (const [who, page] of (process.env.SHOTS_PAGES ?? "admin:dashboard/admin.html,emp:dashboard/employee.html").split(",").map((s) => s.split(":"))) for (const width of [1280, 412]) for (const theme of ["light", "dark"]) for (const [side, base] of [["old", O], ["new", N]]) {
    const x = await open(base, who, page, { width, theme });
    await x.t.screenshot({ path: path.join(SHOTS, `${page.split("/")[1].replace(".html", "")}-${width}-${theme}-${side}.png`), fullPage: true, animations: "disabled" });
    k++; await x.ctx.close();
  }
  check("S1", "shots written", k % 8 === 0 && k > 0, `${k} files`);
}

await browser.close();
console.log(`\ndash: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
