// req.mjs: a page round's parity harness (built by mk-harness.py from att.mjs; edit req-sections.mjs.txt) (msedge, headless). usage: node att.mjs <app dist> <pristine tree> <shots dir>   ONLY=<letters>
// Old page (pristine) and new route, same session, fixed clock (Mon 28 Sep 2026 10:00 IST), fresh storage. Compared in main#main:
// the visible text (innerText), every control (buttons and links shown, their disabled state; inputs, radios, selects and their
// values), each table's rows, and the toasts. A question before an action is window.confirm on the old page, the in-app dialog on
// the new one (round 4); both are answered.
//   M  mark attendance, as each role: as opened; Work from home picked, Check in; Check out
//   Y  my attendance, as each role: as opened; each earlier month; Request fix (filled in; time missing refused; sent); Cancel (Sneha's)
//   S  shifts (a sample page), as each role: as opened; a placeholder's toast
//   P  phone cards at 412 on every table of these pages
//   T  team attendance (round 9)   G  regularization (round 9)
//   X  shots: each page at 1280 and 412, light and dark, old and new
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, PRIST, SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "IKMCPX";
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srvN = spawn("python", [path.join(HERE, "spa-serve.py"), "9983", DIST], { stdio: "ignore" });
const srvO = spawn("python", [path.join(EDGE, "lib", "serve.py"), "9984", PRIST], { stdio: "ignore" });
const stop = () => { try { srvN.kill(); srvO.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9983", O = "http://127.0.0.1:9984";
for (const u of [N + "/", O + "/pages/errors/404.html"]) { for (let i = 0; i < 60; i++) { try { if ((await fetch(u)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); } }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"] };
const ROLES = Object.keys(WHO);
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const SIZES = { 412: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA }, 1280: { viewport: { width: 1280, height: 900 } } };
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(16)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 500)}` : ""}`); };
const j = JSON.stringify;

async function open(base, who, page, { width = 1280, theme = "light" } = {}) {
  const ctx = await browser.newContext({ ...SIZES[width], timezoneId: "Asia/Kolkata" });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(process.env.CLOCK ?? "2026-09-28T10:00:00+05:30"));
  await ctx.addInitScript(([w, th]) => {
    if (sessionStorage.getItem("a-set")) return;
    sessionStorage.setItem("a-set", "1"); localStorage.clear();
    localStorage.setItem("officeos:theme", JSON.stringify(th));
    localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
  }, [WHO[who], theme]);
  const t = await ctx.newPage();
  const errs = []; t.on("pageerror", (e) => errs.push(e.message)); t.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await t.goto(base + "/pages/" + page); await t.waitForLoadState("load"); await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(400);
  return { ctx, t, errs, at: new URL(t.url()).pathname };
}
const read = (t) => t.evaluate(() => {
  const m = document.querySelector("main#main");
  if (!m) return null;
  const vis = (e) => e.getClientRects().length > 0;
  const tx = (s) => s.replace(/\s+/g, " ").trim();
  return {
    // L2 (ruled): the inbox's type filter gains "Location" and Who approves what gains "Home location changes: An Admin" (the
    // React app's sixth kind, checked in locs.mjs); read without them so the rest still matches the old page.
    // L4 (the brief): HR's inbox gains a read-only "Location changes" tab (checked in locs.mjs V); read without it too.
    text: tx(m.innerText).replace(" Asset Salary Location ", " Asset Salary ").replace(" Home location changes An Admin", "").replace(/(Rejected \d+) Location changes/, "$1"),
    controls: [...m.querySelectorAll("button, a.btn, input, select, textarea")].filter(vis).filter((c) => !(c.tagName === "BUTTON" && c.getAttribute("role") === "tab" && tx(c.textContent) === "Location changes")).map((c) => [c.tagName, tx(c.tagName === "TEXTAREA" ? "" : c.tagName === "SELECT" ? c.textContent.replace(/SalaryLocation$/, "Salary") : c.textContent) || tx(c.getAttribute("aria-label") || c.name || c.id || ""), c.disabled ?? null, c.type === "radio" || c.type === "checkbox" ? c.checked : c.value ?? null]),
    tables: [...m.querySelectorAll("table")].map((tb) => [...tb.querySelectorAll("tbody tr")].filter(vis).map((r) => [...r.cells].map((c) => tx(c.innerText)))),
    hiddenIds: [...m.querySelectorAll("[id]")].filter((e) => e.hidden).map((e) => (/^reason-\d+$|^_r_\w*_$/.test(e.id) ? "reason" : e.id)).sort(),
    cal: [...m.querySelectorAll(".calendar__day")].map((c) => c.className.replace("calendar__day ", "")).join("|"),
  };
});
const toasts = (t) => t.evaluate(() => [...document.querySelectorAll(".toast")].map((e) => e.className + " | " + e.querySelector(".toast__text").textContent.trim()));
function where(x, y) {
  x = x ?? "(nothing)"; y = y ?? "(nothing)";
  let i = 0; while (i < x.length && x[i] === y[i]) i++;
  return `at ${i}: old …${x.slice(Math.max(0, i - 80), i + 220)}… new …${y.slice(Math.max(0, i - 80), i + 220)}…`;
}
function compare(n, label, a, b) {
  if (!a || !b) { check(n, label, false, `old ${j(a)?.slice(0, 100)} new ${j(b)?.slice(0, 100)}`); return; }
  const diff = Object.keys(a).filter((k) => j(a[k]) !== j(b[k]));
  check(n, label, diff.length === 0, diff.length ? diff.map((k) => `${k}: ${where(j(a[k]), j(b[k]))}`).join(" ; ") : `${a.text.length} chars, ${a.controls.length} controls, ${a.tables.map((x) => x.length).join("+") || 0} rows`);
}
async function both(who, page) { return { o: await open(O, who, page), n: await open(N, who, page) }; }
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
async function pages(letter, page, rolesFn) {
  for (const who of ROLES) {
    const x = await both(who, page);
    if (x.o.at !== x.n.at || !x.o.at.endsWith(page)) {
      check(`${letter}.${who}`, `${who} on ${page}: lands where the old site does`, x.o.at === x.n.at, `${x.o.at} | ${x.n.at}`);
    } else {
      compare(`${letter}1.${who}`, `${who} on ${page}: as it opens`, await read(x.o.t), await read(x.n.t));
      if (rolesFn) await rolesFn(who, x);
      if (x.o.errs.length || x.n.errs.length) check(`${letter}9.${who}`, "no page errors", false, j([x.o.errs, x.n.errs]));
    }
    await x.o.ctx.close(); await x.n.ctx.close();
  }
}

// ---- req.mjs's own sections (round 13a), spliced into att.mjs's core by mk-harness.py ----
//   I  approvals inbox, as each role: as opened; each tab, each type; a pending row's title opens the card (its text, focus;
//      Escape closes it, focus back); Approve the first decidable request and Reject the next (no reason refused, then one)
//   M  my requests, as each role: as opened; each tab, each type; Cancel the first cancellable one (question, toast, page)
//   C  claim expense, as each role: as opened; an amount over the receipt limit (hint, chain); empty sent (the first error
//      under its field); a whole claim sent: the toasts, the button, where it lands
const settle = (t, ms = 250) => t.waitForTimeout(ms);
const same = (n, label, a, b) => { const bad = a.map((v, i) => j(v) === j(b[i])).indexOf(false); check(n, label, bad === -1 && a.length === b.length, bad === -1 ? `${a.length} steps` : `step ${bad}: ${where(j(a[bad]), j(b[bad]))}`); };
const modalState = (t) => t.evaluate(() => { const m = document.querySelector(".modal.is-open"); return m ? [m.querySelector(".modal__title")?.textContent, m.querySelector(".modal__desc")?.textContent, document.activeElement.id, [...m.querySelectorAll(".form-error")].map((e) => [e.id, e.textContent])] : null; });
// The card as the old one drew it: round 13b's Reject / Approve (the footer's .btn-group) left out; K checks them.
const cardState = (t) => t.evaluate(() => {
  const c = document.getElementById("approval-card");
  // closed: the old card stays in the page without is-open, the new one is removed; neither shows anything
  if (!c || !c.classList.contains("is-open")) return [false];
  const copy = c.cloneNode(true); copy.querySelector(".modal__footer .btn-group")?.remove(); document.body.append(copy);
  const text = copy.innerText.replace(/\s+/g, " ").trim(); copy.remove();
  return [true, c.dataset.state, text, document.activeElement?.id || document.activeElement?.textContent?.trim().slice(0, 40)];
});
const cardButtons = (t) => t.evaluate(() => [...document.querySelectorAll("#approval-card.is-open .modal__footer a, #approval-card.is-open .modal__footer button")].map((b) => b.textContent.trim()));

if (ONLY.includes("I")) {
  console.log("--- I. Approvals inbox ---");
  await pages("I", "requests/approvals-inbox.html", async (who, x) => {
    const steps = async (t) => {
      const out = [];
      for (const i of [1, 2, 0]) { await t.click(`.table__toolbar .tabs__tab >> nth=${i}`); await settle(t, 150); out.push(await read(t)); }
      const types = await t.evaluate(() => [...document.querySelectorAll('select[aria-label="Filter by type"] option')].map((o) => o.value).filter((v) => v !== "location"));   // L2: Location is new (locs.mjs)
      for (const v of [...types.slice(1), ""]) { await t.selectOption('select[aria-label="Filter by type"]', v); await settle(t, 100); out.push((await read(t)).tables); }
      return out;
    };
    same(`I2.${who}`, `${who}: each tab, each type`, await steps(x.o.t), await steps(x.n.t));
    const card = async (t) => {
      const title = await t.$('#inbox-table [data-card]'); if (!title) return ["no card title"];
      await title.click(); await settle(t, 300);
      const open = await cardState(t);
      await t.keyboard.press("Escape"); await settle(t, 200);
      return [open, await cardState(t), await t.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 60))];
    };
    same(`I3.${who}`, `${who}: a pending title opens the card (text, focus); Escape closes it, focus back to the title`, await card(x.o.t), await card(x.n.t));
    const decide = async (t, x2) => {
      const out = [];
      const approve = await t.$('#inbox-table tbody button:has-text("Approve"):visible:not([data-not-implemented])');
      if (!approve) return ["nothing to decide"];
      await ask(x2, '#inbox-table tbody button:has-text("Approve"):visible:not([data-not-implemented]) >> nth=0', true); await settle(t, 400);
      out.push(x2.msg, await toasts(t), await read(t));
      if (await t.$('#inbox-table tbody button:has-text("Reject"):visible:not([data-not-implemented])')) {
        await t.click('#inbox-table tbody button:has-text("Reject"):visible:not([data-not-implemented]) >> nth=0'); await settle(t, 300);
        out.push(await modalState(t));
        await t.click('.modal.is-open button[type="submit"]'); await settle(t, 200); out.push(await modalState(t));
        await t.fill(".modal.is-open textarea", "Please send it again with details"); await t.click('.modal.is-open button[type="submit"]'); await settle(t, 400);
        out.push(await toasts(t), await read(t));
      }
      return out;
    };
    same(`I4.${who}`, `${who}: Approve the first decidable request (question, toast, page), Reject the next (no reason refused, then one)`, await decide(x.o.t, x.o), await decide(x.n.t, x.n));
    // the newest toast only: earlier steps' toasts may still be fading, at different moments on each side
    const sample = async (t) => { const b = await t.$("#inbox-table [data-not-implemented]:visible"); if (!b) return "none"; await b.click(); await settle(t, 200); return (await toasts(t)).at(-1); };
    const [sa, sb] = [await sample(x.o.t), await sample(x.n.t)];
    check(`I5.${who}`, `${who}: a sample row's button: its toast`, j(sa) === j(sb), j([sa, sb]));
  });
}

// K (round 13b): the card's own Approve / Reject. The old card had none, so the reference is the same decision taken on the
// old inbox's row: the same question, toasts, inbox page and bell count after. The new card's footer is More (none on the
// inbox's cards), then Reject and Approve; the card closes as either starts, and focus comes back afterwards.
if (ONLY.includes("K")) {
  console.log("\n--- K. Deciding on the card (new) as on the old row ---");
  const bellLabel = (t) => t.evaluate(() => document.querySelector(".topbar__icon-btn--dot[aria-haspopup]")?.getAttribute("aria-label") ?? null);
  for (const who of ["admin", "hr", "fin", "mgr"]) {
    for (const which of ["Approve", "Reject"]) {
      const x = await both(who, "requests/approvals-inbox.html");
      const row = '#inbox-table tbody tr:has([data-card]) >> nth=0';
      if (!(await x.n.t.$('#inbox-table [data-card]'))) { check(`K0.${who}.${which}`, `${who}: nothing waits, so no card to decide`, true, "skipped"); await x.o.ctx.close(); await x.n.ctx.close(); continue; }
      // new: open the first pending row's card, then its button
      await x.n.t.click('#inbox-table [data-card] >> nth=0'); await settle(x.n.t, 300);
      const footer = await cardButtons(x.n.t);
      const out = { o: [], n: [] };
      if (which === "Approve") {
        await ask(x.n, "#approval-card.is-open .modal__footer button:has-text('Approve')", true); await settle(x.n.t, 400);
        await ask(x.o, `${row} >> button:has-text("Approve")`, true); await settle(x.o.t, 400);
        out.n.push(x.n.msg); out.o.push(x.o.msg);
      } else {
        await x.n.t.click("#approval-card.is-open .modal__footer button:has-text('Reject')"); await settle(x.n.t, 300);
        await x.o.t.click(`${row} >> button:has-text("Reject")`); await settle(x.o.t, 300);
        for (const [k, t] of [["o", x.o.t], ["n", x.n.t]]) {
          out[k].push(await t.evaluate(() => Boolean(document.querySelector("#approval-card.is-open"))), await modalState(t));
          await t.click('.modal.is-open button[type="submit"]'); await settle(t, 200); out[k].push(await modalState(t));
          await t.fill(".modal.is-open textarea", "Not this week, please"); await t.click('.modal.is-open button[type="submit"]'); await settle(t, 400);
        }
      }
      for (const [k, t] of [["o", x.o.t], ["n", x.n.t]]) out[k].push(await toasts(t), await read(t), await bellLabel(t));
      const focus = await x.n.t.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent?.trim().slice(0, 40) || document.activeElement?.tagName);
      same(`K1.${who}.${which}`, `${who}: ${which} from the card does what ${which} on the old row did: question/modal, toasts, the inbox after, the bell's count`, out.o, out.n);
      check(`K2.${who}.${which}`, `${who}: the card's footer is Reject, Approve (no More on the inbox's card); the card closed; focus back (the row is gone: the bell)`,
        j(footer) === j(["Reject", "Approve"]) && !(await x.n.t.$("#approval-card.is-open")) && /Waiting for you/.test(focus ?? ""), j([footer, focus]));
      await x.o.ctx.close(); await x.n.ctx.close();
    }
  }
  // from the bell on a dashboard: the card has More, then Reject and Approve; Approve decides it and the bell's count drops
  const x = await open(N, "hr", "dashboard/hr.html");
  const before = await bellLabel(x.t);
  await x.t.click(".topbar__icon-btn--dot[aria-haspopup]"); await settle(x.t, 300);
  await x.t.click("#bell-panel .bell-panel__item >> nth=0"); await settle(x.t, 300);
  const footer = await cardButtons(x.t);
  await ask(x, "#approval-card.is-open .modal__footer button:has-text('Approve')", true); await settle(x.t, 400);
  const after = await bellLabel(x.t);
  const n = (s) => Number(/(\d+)/.exec(s ?? "")?.[1] ?? NaN);
  check("K3.hr.bell", "HR on the dashboard: bell, first item's card: More, Reject, Approve; Approve asks, decides, and the bell's count drops by one",
    j(footer) === j(["More", "Reject", "Approve"]) && /^Approve this request\?/.test(x.msg ?? "") && n(after) === n(before) - 1, j([footer, x.msg?.slice(0, 60), before, after, await toasts(x.t)]));
  await x.ctx.close();
}

// Z (round 13b): shots of the new card with its Reject / Approve, from the bell, 1280 and 412, light and dark (new only)
if (ONLY.includes("Z")) {
  let k = 0;
  for (const width of [1280, 412]) for (const theme of ["light", "dark"]) {
    const x = await open(N, "hr", "dashboard/hr.html", { width, theme });
    await x.t.click(".topbar__icon-btn--dot[aria-haspopup]"); await settle(x.t, 300);
    await x.t.click("#bell-panel .bell-panel__item >> nth=0"); await settle(x.t, 400);
    await x.t.screenshot({ path: path.join(SHOTS, `card-decide-${width}-${theme}.png`) }); k++;
    await x.ctx.close();
  }
  check("Z1", "card shots written", k === 4, `${k} files`);
}

if (ONLY.includes("M")) {
  console.log("\n--- M. My requests ---");
  await pages("M", "requests/my-requests.html", async (who, x) => {
    const steps = async (t) => {
      const out = [];
      for (const i of [1, 2, 3, 0]) { await t.click(`.table__toolbar .tabs__tab >> nth=${i}`); await settle(t, 150); out.push(await read(t)); }
      for (const v of ["leave", "asset", "attendance", "expense", ""]) { await t.selectOption('select[aria-label="Filter by type"]', v); await settle(t, 100); out.push((await read(t)).tables); }
      return out;
    };
    same(`M2.${who}`, `${who}: each tab, each type`, await steps(x.o.t), await steps(x.n.t));
    const cancel = async (t, x2) => {
      if (!(await t.$('main tbody button:has-text("Cancel"):visible'))) return ["nothing to cancel"];
      await ask(x2, 'main tbody button:has-text("Cancel") >> nth=0', true); await settle(t, 400);
      return [x2.msg, await toasts(t), await read(t)];
    };
    same(`M3.${who}`, `${who}: Cancel the first cancellable request: question, toast, page`, await cancel(x.o.t, x.o), await cancel(x.n.t, x.n));
  });
}

if (ONLY.includes("C")) {
  console.log("\n--- C. Claim expense ---");
  await pages("C", "requests/claim-expense.html", async (who, x) => {
    const steps = async (t) => {
      const out = [];
      await t.fill("#expense-amount", "60000"); await settle(t, 150); out.push(await read(t));
      await t.fill("#expense-amount", ""); await t.click('#expense-form button[type="submit"]'); await settle(t, 250);
      out.push(await t.evaluate(() => [document.activeElement.id, [...document.querySelectorAll("#expense-form .form-error")].map((e) => [e.id, e.textContent])]), await toasts(t));
      await t.selectOption("#expense-category", "travel"); await t.fill("#expense-amount", "1850"); await t.fill("#expense-date", "2026-09-25");
      await t.fill("#expense-receipt", "cab.pdf"); await t.fill("#expense-reason", "Cab to the client office"); await settle(t, 150);
      out.push(await read(t));
      await t.click('#expense-form button[type="submit"]'); await settle(t, 300);
      out.push(await toasts(t), await t.evaluate(() => document.querySelector('#expense-form button[type="submit"]').disabled));
      await t.waitForTimeout(1600); out.push(new URL(t.url()).pathname);
      return out;
    };
    same(`C2.${who}`, `${who}: over the receipt limit; empty refused under the field; a whole claim sent: toasts, button, landing`, await steps(x.o.t), await steps(x.n.t));
  });
}

async function phoneCards(letter, list) {
  for (const [who, page] of list) {
    const o = await open(O, who, page, { width: 412 }), n = await open(N, who, page, { width: 412 });
    await o.t.waitForTimeout(700);
    const cards = (t) => t.evaluate(() => [...document.querySelectorAll("main table")].map((tb) => ({ cards: tb.hasAttribute("data-cards"),
      rows: [...tb.querySelectorAll("tbody tr")].map((r) => [...r.cells].map((c) => `${c.dataset.label}|${c.dataset.cardPart}|${c.querySelector(".table__more") ? "more" : ""}|${getComputedStyle(c).display}`)) })));
    const [a, b] = [await cards(o.t), await cards(n.t)];
    check(`${letter}.${who}.${page.split("/")[1].replace(".html", "")}`, `${who} on ${page} at 412: the same cards`, j(a) === j(b), j(a) === j(b) ? `${a.length} tables, ${a.map((x) => x.rows.length).join("+")} rows` : `old ${j(a).slice(0, 400)} new ${j(b).slice(0, 400)}`);
    await o.ctx.close(); await n.ctx.close();
  }
}
if (ONLY.includes("P")) {
  console.log("\n--- P. Phone cards at 412 ---");
  await phoneCards("P", (process.env.PHONE_PAGES ?? "admin:requests/approvals-inbox.html,emp:requests/my-requests.html,emp:requests/claim-expense.html").split(",").map((s) => s.split(":")));
}

if (ONLY.includes("X")) {
  console.log("\n--- X. Shots ---");
  let k = 0;
  const list = (process.env.SHOT_PAGES ?? "admin:requests/approvals-inbox.html,emp:requests/my-requests.html,emp:requests/claim-expense.html").split(",").map((s) => s.split(":"));
  for (const [who, page] of list) for (const width of [1280, 412]) for (const theme of ["light", "dark"]) for (const [side, base] of [["old", O], ["new", N]]) {
    const x = await open(base, who, page, { width, theme });
    await x.t.screenshot({ path: path.join(SHOTS, `${page.split("/")[1].replace(".html", "")}-${width}-${theme}-${side}.png`), fullPage: true, animations: "disabled" });
    k++; await x.ctx.close();
  }
  check("X1", "shots written", k === list.length * 8, `${k} files`);
}

await browser.close();
console.log(`\nreq: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
