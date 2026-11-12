// React round 1's parity check for My leave (msedge, headless). usage: node parity.mjs <app dist> <pristine tree> <shots dir>
// The old page (pristine, /pages/leave/my-leave.html) and the new route side by side, same session, same fixed clock (Mon 28 Sep 2026
// 10:00 IST), fresh storage each. Compared, inside <main>: heading and subtitle, which header buttons show, each balance card's text and bar
// width, the year options and the one picked, the table's header and every row's cells, which Cancel buttons show, the pager, the pending
// card (shown or not, its text and steps) and the holidays list.
//   P  as Employee (Arjun), HR (Priya) and a manager (Sneha): the page as it opens, then with last year picked.
//   C  the cancel flow as Arjun: Cancel dismissed changes nothing; Cancel accepted: the confirm's words, the toast's words and type, and the
//      whole page afterwards, on both.
//   S  shots by eye: Arjun's page at 412 (Pixel 6a) and 1280, light and dark, old and new, into <shots dir>.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const DIST = process.argv[2], PRIST = process.argv[3], SHOTS = process.argv[4];
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srvN = spawn("python", [path.join(HERE, "spa-serve.py"), "9973", DIST], { stdio: "ignore" });
const srvO = spawn("python", [path.join(EDGE, "lib", "serve.py"), "9974", PRIST], { stdio: "ignore" });
const stop = () => { try { srvN.kill(); srvO.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9973", O = "http://127.0.0.1:9974";
for (const u of [N + "/", O + "/pages/errors/404.html"]) { for (let i = 0; i < 60; i++) { try { if ((await fetch(u)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); } }
const PAGE = "/pages/leave/my-leave.html";
const WHO = { emp: ["Arjun Kapoor", "EMP-1105"], hr: ["Priya Nair", "EMP-1003"], mgr: ["Sneha Rao", "EMP-1029"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const SIZES = { 412: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA }, 1280: { viewport: { width: 1280, height: 900 } } };

const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const j = JSON.stringify;

async function open(base, who, width = 1280, theme = "light") {
  const ctx = await browser.newContext({ ...SIZES[width], timezoneId: "Asia/Kolkata" });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date("2026-09-28T10:00:00+05:30"));
  await ctx.addInitScript(([w, th]) => {
    if (sessionStorage.getItem("parity-set")) return;
    sessionStorage.setItem("parity-set", "1");
    localStorage.clear();
    localStorage.setItem("officeos:theme", JSON.stringify(th));
    localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
  }, [WHO[who], theme]);
  const t = await ctx.newPage();
  const errs = []; t.on("pageerror", (e) => errs.push(e.message));
  await t.goto(base + PAGE); await t.waitForLoadState("load");
  await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(300);
  return { ctx, t, errs };
}

// What the page shows, read the same way on both.
const read = (t) => t.evaluate(() => {
  const m = document.querySelector("main#main");
  const vis = (e) => Boolean(e) && e.getClientRects().length > 0;
  const tx = (e) => (e ? e.innerText.replace(/\s+/g, " ").trim() : null);
  const q = (s) => m.querySelector(s), qa = (s) => [...m.querySelectorAll(s)];
  const sel = q('select[aria-label="Filter by year"]');
  const pend = q("#pending-request");
  return {
    h1: tx(q(".page-header h1")), subtitle: tx(q(".page-header__subtitle")),
    buttons: qa(".page-header__actions .btn").filter(vis).map(tx),
    balances: qa(".balance").map((b) => ({ text: tx(b), bar: b.querySelector(".progress")?.className, w: b.querySelector(".progress__bar")?.style.getPropertyValue("--w") })),
    years: [...sel.options].map((o) => o.value + ":" + o.textContent), year: sel.value,
    head: qa(".table thead th").map(tx),
    rows: qa(".table tbody tr").map((r) => [...r.cells].map((c) => (vis(c.querySelector("button")) || !c.querySelector("button") ? tx(c) : tx(c).replace(/Cancel$/, "").trim()) + (c.colSpan > 1 ? `[colspan ${c.colSpan}]` : ""))),
    cancels: qa(".table tbody button").filter(vis).length,
    pager: vis(q(".pagination")) ? tx(q(".pagination")) : "(hidden)",
    pending: vis(pend) ? { title: tx(pend.querySelector(".card__header")), body: tx(pend.querySelector(".card__body")), steps: [...pend.querySelectorAll(".stepper__step")].map((s) => s.className) } : "(hidden)",
    holidays: qa("#upcoming-holidays .list__item").map(tx),
  };
});
function compare(n, label, a, b) {
  const keys = Object.keys(a);
  const diff = keys.filter((k) => j(a[k]) !== j(b[k]));
  check(n, label, diff.length === 0, diff.length ? diff.map((k) => `${k}: old ${j(a[k])} new ${j(b[k])}`).join(" ; ") : `${a.rows.length} rows, ${a.balances.length} balances, pending ${a.pending === "(hidden)" ? "hidden" : "shown"}, ${a.holidays.length} holidays, years ${a.years.length}`);
}

console.log("--- P. The page as it opens, and with last year picked: Employee, HR, a manager ---");
for (const who of Object.keys(WHO)) {
  const o = await open(O, who), n = await open(N, who);
  compare(`P1.${who}`, `${who}: opens the same`, await read(o.t), await read(n.t));
  for (const x of [o, n]) { await x.t.selectOption('main select[aria-label="Filter by year"]', "2025"); await x.t.waitForTimeout(200); }
  compare(`P2.${who}`, `${who}: 2025 picked, the same`, await read(o.t), await read(n.t));
  check(`P3.${who}`, `${who}: no page errors`, !o.errs.length && !n.errs.length, j([...o.errs, ...n.errs]));
  await o.ctx.close(); await n.ctx.close();
}

console.log("\n--- M. Phone cards at 412 (Arjun): the table's card markup, and Details opens a row ---");
{
  const o = await open(O, "emp", 412), n = await open(N, "emp", 412);
  const cards = (t) => t.evaluate(() => {
    const tb = document.querySelector("main .table");
    return { cards: tb.hasAttribute("data-cards"), role: tb.getAttribute("role"),
      rows: [...tb.querySelectorAll("tbody tr")].map((r) => [...r.cells].map((c) => `${c.dataset.label}|${c.dataset.cardPart}|${c.getAttribute("role")}|${c.querySelector(".table__more") ? "more" : ""}|${getComputedStyle(c).display}`)) };
  });
  const [co, cn] = [await cards(o.t), await cards(n.t)];
  check("M1", "the same card markup and cell display", j(co) === j(cn) && co.cards, j(co) === j(cn) ? `${co.rows.length} rows, cells ${co.rows[0]?.join(" ; ")}` : `old ${j(co)} new ${j(cn)}`);
  for (const x of [o, n]) { await x.t.click("main .table tbody tr:nth-child(2) .table__more"); await x.t.waitForTimeout(150); }
  const opened = (t) => t.evaluate(() => { const r = document.querySelector("main .table tbody tr:nth-child(2)"); return [r.classList.contains("is-open"), r.querySelector(".table__more").getAttribute("aria-expanded"), getComputedStyle(r.cells[3]).display, r.cells[3].innerText.replace(/\s+/g, " ").trim()]; });
  const [po, pn] = [await opened(o.t), await opened(n.t)];
  check("M2", "Details opens the row the same way", j(po) === j(pn) && po[0], j([po, pn]));
  check("M3", "no page errors", !o.errs.length && !n.errs.length, j([...o.errs, ...n.errs]));
  await o.ctx.close(); await n.ctx.close();
}

console.log("\n--- C. Cancel as Arjun ---");
{
  const o = await open(O, "emp"), n = await open(N, "emp");
  const before = await read(n.t);
  check("C0", "Arjun has a pending request with a shown Cancel", before.cancels > 0, `cancels ${before.cancels}`);
  // The question: the old page asks with window.confirm, the new one (round 4) with the in-app dialog. Either is answered
  // here; x.kind says which one asked, x.focus where the in-app one put focus, x.after whether it closed after the answer.
  const ask = async (x, yes) => {
    x.msg = undefined; x.kind = undefined;
    const handler = (d) => { x.msg = d.message(); x.kind = "browser"; yes ? d.accept() : d.dismiss(); };
    x.t.once("dialog", handler);
    await x.t.click("main .table tbody button:visible"); await x.t.waitForTimeout(250);
    if (x.kind) return;
    x.t.off("dialog", handler);
    const dlg = await x.t.evaluate(() => { const d = document.querySelector(".confirm-dialog"); return d ? [d.querySelector(".confirm-dialog__question").textContent, document.activeElement.hasAttribute("data-confirm-cancel"), d.getAttribute("role")] : null; });
    if (!dlg) return;
    [x.msg, x.focus] = dlg; x.kind = "in-app";
    await x.t.click(yes ? ".confirm-dialog [data-confirm-ok]" : ".confirm-dialog [data-confirm-cancel]"); await x.t.waitForTimeout(350);
    x.after = await x.t.evaluate(() => [Boolean(document.querySelector(".confirm-dialog")), document.activeElement?.textContent.trim()]);
  };
  // dismissed: nothing changes
  for (const x of [o, n]) await ask(x, false);
  check("C1", "dismissed: the same question on both", o.msg === n.msg && /^Cancel your .+ request for .+\?$/.test(n.msg), j([o.msg, n.msg]));
  if (n.kind === "in-app") check("C1b", "the new page asks in the in-app dialog (role alertdialog), focus on the safe answer, closed after it, focus back on Cancel", n.focus === true && n.after[0] === false && n.after[1] === "Cancel", j([n.kind, n.focus, n.after]));
  compare("C2", "dismissed: the page unchanged (new == its own before)", before, await read(n.t));
  // accepted
  for (const x of [o, n]) await ask(x, true);
  const toast = (t) => t.evaluate(() => [...document.querySelectorAll(".toast")].map((e) => e.className + " | " + e.querySelector(".toast__text, .toast__message, .toast__body")?.innerText.trim()));
  const [to, tn] = [await toast(o.t), await toast(n.t)];
  check("C3", "accepted: the same toast", j(to) === j(tn) && tn.length === 1, j([to, tn]));
  const [ao, an] = [await read(o.t), await read(n.t)];
  compare("C4", "accepted: the page after, the same", ao, an);
  check("C5", "accepted: one Cancel fewer, the request now Cancelled", an.cancels === before.cancels - 1 && an.rows.some((r) => r.includes("Cancelled")), `cancels ${before.cancels} -> ${an.cancels}`);
  check("C6", "no page errors", !o.errs.length && !n.errs.length, j([...o.errs, ...n.errs]));
  await o.ctx.close(); await n.ctx.close();
}

console.log("\n--- S. Shots by eye (Arjun) ---");
const shots = [];
for (const width of [412, 1280]) for (const theme of ["light", "dark"]) for (const [side, base] of [["old", O], ["new", N]]) {
  const x = await open(base, "emp", width, theme);
  const file = `my-leave-${width}-${theme}-${side}.png`;
  await x.t.screenshot({ path: path.join(SHOTS, file), fullPage: true, animations: "disabled" });
  shots.push(file); await x.ctx.close();
}
check("S1", "8 shots written", shots.every((f) => fs.existsSync(path.join(SHOTS, f))), shots.join(", "));

await browser.close();
console.log(`\nparity: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
