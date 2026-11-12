// React rounds 8-9's attendance pages parity (msedge, headless). usage: node att.mjs <app dist> <pristine tree> <shots dir>   ONLY=<letters>
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
const ONLY = process.env.ONLY ?? "MYSPX";
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
  await ctx.clock.setFixedTime(new Date("2026-09-28T10:00:00+05:30"));
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
    text: tx(m.innerText),
    controls: [...m.querySelectorAll("button, a.btn, input, select, textarea")].filter(vis).map((c) => [c.tagName, tx(c.textContent || c.getAttribute("aria-label") || c.name || c.id || ""), c.disabled ?? null, c.type === "radio" || c.type === "checkbox" ? c.checked : c.value ?? null]),
    tables: [...m.querySelectorAll("table")].map((tb) => [...tb.querySelectorAll("tbody tr")].filter(vis).map((r) => [...r.cells].map((c) => tx(c.innerText)))),
    hiddenIds: [...m.querySelectorAll("[id]")].filter((e) => e.hidden).map((e) => e.id).sort(),
    cal: [...m.querySelectorAll(".calendar__day")].map((c) => c.className.replace("calendar__day ", "")).join("|"),
  };
});
const toasts = (t) => t.evaluate(() => [...document.querySelectorAll(".toast")].map((e) => e.className + " | " + e.querySelector(".toast__text").textContent.trim()));
function compare(n, label, a, b) {
  if (!a || !b) { check(n, label, false, `old ${j(a)?.slice(0, 100)} new ${j(b)?.slice(0, 100)}`); return; }
  const diff = Object.keys(a).filter((k) => j(a[k]) !== j(b[k]));
  check(n, label, diff.length === 0, diff.length ? diff.map((k) => `${k}: old ${j(a[k]).slice(0, 400)} new ${j(b[k]).slice(0, 400)}`).join(" ; ") : `${a.text.length} chars, ${a.controls.length} controls, ${a.tables.map((x) => x.length).join("+") || 0} rows`);
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

if (ONLY.includes("M")) {
  console.log("--- M. Mark attendance ---");
  await pages("M", "attendance/mark-attendance.html", async (who, x) => {
    if (!["emp", "mgr", "admin"].includes(who)) return;
    const flow = async (t) => {
      const out = [];
      const wfh = await t.$('input[name="mode"][value="wfh"]:not([disabled])');
      if (wfh) await wfh.check();
      const inBtn = await t.$("#check-in-btn:not([disabled])");
      if (inBtn) { await inBtn.click(); await t.waitForTimeout(300); }
      out.push(await toasts(t), await read(t));
      const outBtn = await t.$("#check-out-btn:not([disabled])");
      if (outBtn) { await outBtn.click(); await t.waitForTimeout(300); }
      out.push(await toasts(t), await read(t));
      return out;
    };
    const [a, b] = [await flow(x.o.t), await flow(x.n.t)];
    check(`M2.${who}`, `${who}: Work from home, Check in, Check out: the same toasts and page after each`, j(a) === j(b), j(a) === j(b) ? j(b[0]) + " " + j(b[2]) : `old ${j(a).slice(0, 600)} new ${j(b).slice(0, 600)}`);
  });
}

if (ONLY.includes("Y")) {
  console.log("\n--- Y. My attendance ---");
  await pages("Y", "attendance/my-attendance.html", async (who, x) => {
    const months = async (t) => {
      const out = [];
      const values = await t.evaluate(() => [...document.querySelectorAll("#month-select option")].map((o) => o.value));
      for (const v of values.slice(1)) { await t.selectOption("#month-select", v); await t.waitForTimeout(200); out.push(await read(t)); }
      await t.selectOption("#month-select", values[0]); await t.waitForTimeout(200);
      return out;
    };
    const [ma, mb] = [await months(x.o.t), await months(x.n.t)];
    const bad = ma.map((a, i) => j(a) === j(mb[i])).indexOf(false);
    check(`Y2.${who}`, `${who}: each earlier month the same`, bad === -1 && ma.length === mb.length, bad === -1 ? `${ma.length} months` : `month ${bad + 1}: ${Object.keys(ma[bad]).filter((k) => j(ma[bad][k]) !== j(mb[bad][k])).map((k) => `${k}: old ${j(ma[bad][k]).slice(0, 300)} new ${j(mb[bad][k]).slice(0, 300)}`).join(" ; ")}`);
    // Request fix: open, refuse without a time, send
    const fix = async (t) => {
      const btn = await t.$('#daily-log button:has-text("Request fix")'); if (!btn) return "no Request fix";
      await btn.click(); await t.waitForTimeout(300);
      const form = await t.evaluate(() => ["reg-date", "reg-issue", "reg-time", "reg-manager", "reg-reason"].map((id) => document.getElementById(id)?.value).concat([document.activeElement.id]));
      await t.click('.modal.is-open button[type="submit"]'); await t.waitForTimeout(200);
      const err = await t.evaluate(() => [document.querySelector(".modal.is-open .form-error")?.textContent ?? null, document.querySelector(".modal.is-open .form-error")?.closest(".form-field")?.querySelector("input,select,textarea")?.id ?? null]);
      await t.fill("#reg-time", "09:30"); await t.fill("#reg-reason", "Traffic on the bridge");
      await t.click('.modal.is-open button[type="submit"]'); await t.waitForTimeout(400);
      return [form, err, await t.evaluate(() => Boolean(document.querySelector(".modal.is-open"))), await toasts(t), await read(t)];
    };
    const [fa, fb] = [await fix(x.o.t), await fix(x.n.t)];
    check(`Y3.${who}`, `${who}: Request fix: the form filled in, a missing time refused in the store's words, sent: the same toast and page`, j(fa) === j(fb), j(fa) === j(fb) ? j(fb).slice(0, 260) : `old ${j(fa).slice(0, 700)} new ${j(fb).slice(0, 700)}`);
    if (who === "mgr" || who === "emp") {
      const cancel = async (t, x2) => {
        const btn = await t.$('#daily-log button:has-text("Cancel")'); if (!btn) return "no Cancel";
        await ask(x2, '#daily-log button:has-text("Cancel")', true);
        return [x2.msg, await toasts(t), await read(t)];
      };
      const [ca, cb] = [await cancel(x.o.t, x.o), await cancel(x.n.t, x.n)];
      check(`Y4.${who}`, `${who}: Cancel a pending correction: the same question, toast and page`, j(ca) === j(cb), j(ca) === j(cb) ? j(cb).slice(0, 200) : `old ${j(ca).slice(0, 500)} new ${j(cb).slice(0, 500)}`);
    }
  });
}

if (ONLY.includes("S")) {
  console.log("\n--- S. Shifts (sample page) ---");
  await pages("S", "attendance/shifts.html", async (who, x) => {
    const ph = async (t) => { const b = await t.$("main [data-not-implemented]:visible"); if (!b) return "none"; await b.click(); await t.waitForTimeout(200); return toasts(t); };
    const [a, b] = [await ph(x.o.t), await ph(x.n.t)];
    check(`S2.${who}`, `${who}: a placeholder's toast`, j(a) === j(b), j([a, b]));
  });
}

if (ONLY.includes("T")) {
  console.log("\n--- T. Team attendance ---");
  await pages("T", "attendance/team-attendance.html", async (who, x) => {
    const steps = async (t) => {
      const out = [];
      for (const tab of ["present", "late", "on-leave", "absent", "all"]) { await t.click(`.tabs__tab[data-tab="${tab}"]`); await t.waitForTimeout(120); out.push((await read(t)).tables); }
      await t.fill("#team-search", "a"); await t.waitForTimeout(120); out.push(await read(t));
      await t.fill("#team-search", ""); await t.selectOption("#team-dept", { index: 1 }); await t.waitForTimeout(120); out.push(await read(t));
      await t.selectOption("#team-dept", { index: 0 }); await t.click("#team-sort"); await t.waitForTimeout(120); out.push((await read(t)).tables, await t.evaluate(() => document.querySelector("th.is-sortable").getAttribute("aria-sort")));
      await t.click("#team-sort");
      for (const day of ["2026-09-25", "2026-09-26", "2026-08-03"]) { await t.fill("#team-date", day); await t.dispatchEvent("#team-date", "change"); await t.waitForTimeout(200); out.push(await read(t)); }
      await t.fill("#team-date", "2026-10-05"); await t.dispatchEvent("#team-date", "change"); await t.waitForTimeout(250);
      out.push(await t.evaluate(() => document.getElementById("team-date").value), await toasts(t));
      return out;
    };
    const [a, b] = [await steps(x.o.t), await steps(x.n.t)];
    const bad = a.map((v, i) => j(v) === j(b[i])).indexOf(false);
    check(`T2.${who}`, `${who}: each tab, search, department, sort, three other dates, a future date refused`, bad === -1, bad === -1 ? `${a.length} steps` : `step ${bad}: old ${j(a[bad]).slice(0, 500)} new ${j(b[bad]).slice(0, 500)}`);
    if (who === "admin" || who === "hr") {
      const files = async (t) => {
        const got = []; t.on("download", async (dl) => got.push([dl.suggestedFilename(), fs.readFileSync(await dl.path(), "utf8")]));
        const exp = await t.$("main button[data-export]"); if (!exp) return "no Export";
        await exp.click(); await t.waitForTimeout(1500); return got;
      };
      const [fa, fb] = [await files(x.o.t), await files(x.n.t)];
      check(`T3.${who}`, `${who}: Export, the same file byte for byte`, j(fa) === j(fb) && fa.length === 1, j([typeof fa === "string" ? fa : fa.map((f) => [f[0], f[1].length]), typeof fb === "string" ? fb : fb.map((f) => [f[0], f[1].length])]));
    }
  });
}

if (ONLY.includes("G")) {
  console.log("\n--- G. Regularization ---");
  await pages("G", "attendance/regularization.html", async (who, x) => {
    const steps = async (t) => {
      const out = [];
      for (const i of [2, 3, 1]) { await t.click(`.tabs__tab:nth-child(${i})`); await t.waitForTimeout(150); out.push(await read(t)); }
      await t.fill(".input--search", "vik"); await t.waitForTimeout(120); out.push(await read(t));
      await t.fill(".input--search", "zzz"); await t.waitForTimeout(120); out.push(await read(t));
      await t.fill(".input--search", ""); await t.waitForTimeout(120);
      return out;
    };
    const [a, b] = [await steps(x.o.t), await steps(x.n.t)];
    const bad = a.map((v, i) => j(v) === j(b[i])).indexOf(false);
    check(`G2.${who}`, `${who}: each tab, a search, no matches`, bad === -1, bad === -1 ? `${a.length} steps` : `step ${bad}: old ${j(a[bad]).slice(0, 500)} new ${j(b[bad]).slice(0, 500)}`);
    if (who === "hr" || who === "admin") {
      const decide = async (x2) => {
        const t = x2.t, out = [];
        const approve = 'main tbody tr:first-child .btn--primary';
        if (!(await t.$(approve))) return "no decision buttons";
        await ask(x2, approve, true); out.push(x2.msg, await toasts(t), await read(t));
        const rej = 'main tbody tr:first-child .btn:not(.btn--primary)';
        if (await t.$(rej)) {
          await t.click(rej); await t.waitForTimeout(250);
          await t.click(".modal.is-open button[type=submit]"); await t.waitForTimeout(200);
          out.push(await t.evaluate(() => document.querySelector(".modal.is-open .form-error")?.textContent ?? null));
          await t.fill(".modal.is-open textarea", "Badge log shows 10:20"); await t.click(".modal.is-open button[type=submit]"); await t.waitForTimeout(300);
          out.push(await toasts(t), await read(t));
        }
        return out;
      };
      const [da, db] = [await decide(x.o), await decide(x.n)];
      check(`G3.${who}`, `${who}: Approve (the question, the toast, the page) and Reject (no reason refused, then a reason)`, j(da) === j(db), j(da) === j(db) ? j(db).slice(0, 250) : `old ${j(da).slice(0, 600)} new ${j(db).slice(0, 600)}`);
      const files = async (t) => { const got = []; t.on("download", async (dl) => got.push([dl.suggestedFilename(), fs.readFileSync(await dl.path(), "utf8")])); await t.click("main button[data-export]"); await t.waitForTimeout(1500); return got; };
      const [fa, fb] = [await files(x.o.t), await files(x.n.t)];
      check(`G4.${who}`, `${who}: Export after the decisions, the same file byte for byte`, j(fa) === j(fb) && fa.length === 1, j([fa.map((f) => [f[0], f[1].length]), fb.map((f) => [f[0], f[1].length])]));
    }
  });
}

// E (round 9b): the empty states, asserted on both sides, run against a reference tree that has them (pristine + rer/w).
if (ONLY.includes("E")) {
  console.log("\n--- E. Empty ranges on the attendance pages (round 9b) ---");
  const MSG = "No data in this range.";
  const state = (t, which) => t.evaluate(([w, msg]) => {
    const tx = (s) => (s ?? "").replace(/\s+/g, " ").trim();
    const stats = [...document.querySelectorAll(`main ${w === "my" ? "" : "[data-stat]"}.stat, main [data-stat].stat`)].filter((v, i, a) => a.indexOf(v) === i).map((s) => [tx(s.querySelector(".stat__value")?.textContent), tx(s.querySelector(".stat__delta")?.textContent), s.querySelector(".stat__delta")?.className ?? null]);
    const box = w === "my" ? document.querySelector("#month-summary .card__body") : document.getElementById("team-dept-bars");
    const after = box.parentElement.querySelector(".empty[data-no-data]");
    const tbody = w === "my" ? document.querySelector("#daily-log tbody") : document.getElementById("team-rows");
    const rows = [...tbody.querySelectorAll("tr")].map((r) => [r.cells.length, r.cells[0]?.colSpan, tx(r.innerText)]);
    return { stats, allNoData: stats.length === 4 && stats.every(([v, n]) => v === "–" && n === msg), chartHidden: box.hidden, noDataBox: after ? tx(after.innerText) : null,
      rows: rows.slice(0, 3), oneMsgRow: rows.length === 1 && rows[0][1] === 6 && rows[0][2] === msg,
      counts: [...document.querySelectorAll(".tabs__tab .badge--count")].map((b) => b.textContent).join(","), min: document.getElementById("team-date")?.min ?? null };
  }, [which, MSG]);
  const setDate = async (t, v) => { await t.fill("#team-date", v); await t.dispatchEvent("#team-date", "change"); await t.waitForTimeout(250); };
  for (const who of ["emp", "hr", "admin"]) {
    const x = await both(who, "attendance/my-attendance.html");
    const live = [await state(x.o.t, "my"), await state(x.n.t, "my")];
    for (const y of [x.o.t, x.n.t]) { await y.selectOption("#month-select", "2026-08"); await y.waitForTimeout(250); }
    const empty = [await state(x.o.t, "my"), await state(x.n.t, "my")];
    const page = [await read(x.o.t), await read(x.n.t)];
    for (const y of [x.o.t, x.n.t]) { await y.selectOption("#month-select", "2026-09"); await y.waitForTimeout(250); }
    const back = [await state(x.o.t, "my"), await state(x.n.t, "my")];
    const nb = empty[1];
    check(`E1.${who}`, `${who}, my attendance, Aug 2026 (before records): 4 stats "–" + the message, the summary hidden with the message after it, the log one message row; as the reference`,
      nb.allNoData && nb.chartHidden && nb.noDataBox === MSG && nb.oneMsgRow && j(empty[0]) === j(empty[1]) && j(page[0]) === j(page[1]), j(nb));
    check(`E2.${who}`, `${who}, my attendance: Sep 2026 (and as opened) draw as before, no message; as the reference`,
      [live[1], back[1]].every((s) => !s.allNoData && !s.chartHidden && s.noDataBox === null && !s.oneMsgRow) && j(live[0]) === j(live[1]) && j(back[0]) === j(back[1]), j([live[1], back[1]]));
    await x.o.ctx.close(); await x.n.ctx.close();
  }
  for (const who of ["hr", "admin", "mgr"]) {
    const x = await both(who, "attendance/team-attendance.html");
    const startDay = await x.n.t.evaluate(() => JSON.parse(localStorage.getItem("officeos:attendance")).records.map((r) => r.date).sort()[0]);
    const live = [await state(x.o.t, "team"), await state(x.n.t, "team")];
    for (const y of [x.o.t, x.n.t]) await setDate(y, "2020-01-06");
    const empty = [await state(x.o.t, "team"), await state(x.n.t, "team")];
    const page = [await read(x.o.t), await read(x.n.t)];
    let files = "n/a";
    if (who !== "mgr") {
      const grab = async (t) => { const got = []; t.on("download", async (dl) => got.push([dl.suggestedFilename(), fs.readFileSync(await dl.path(), "utf8")])); await t.click("main button[data-export]"); await t.waitForTimeout(1500); return got; };
      const [fa, fb] = [await grab(x.o.t), await grab(x.n.t)];
      files = j(fa) === j(fb) && fa.length === 1 ? "same" : j([fa, fb]).slice(0, 300);
    }
    for (const y of [x.o.t, x.n.t]) await setDate(y, "2026-09-27");
    const sunday = [await state(x.o.t, "team"), await state(x.n.t, "team"), await read(x.o.t), await read(x.n.t)];
    for (const y of [x.o.t, x.n.t]) await setDate(y, "2026-09-28");
    const back = [await state(x.o.t, "team"), await state(x.n.t, "team")];
    const nb = empty[1];
    check(`E3.${who}`, `${who}, team attendance: the date's min is the first day on record (${startDay}); 2020-01-06: 4 stats "–" + the message, one message row, tab counts 0, the department chart hidden with the message; Export the same file; as the reference`,
      live[1].min === startDay && nb.allNoData && nb.oneMsgRow && /^0(,0){4}$/.test(nb.counts) && nb.chartHidden && nb.noDataBox === MSG && (files === "n/a" || files === "same")
      && j(empty[0]) === j(empty[1]) && j(page[0]) === j(page[1]) && j(live[0]) === j(live[1]), j([live[1].min, nb, files]));
    check(`E4.${who}`, `${who}, team attendance: a Sunday keeps its rows and stat notes (the chart says the message); back to today everything draws; as the reference`,
      !sunday[1].allNoData && !sunday[1].oneMsgRow && sunday[1].noDataBox === MSG && !back[1].chartHidden && back[1].noDataBox === null && !back[1].allNoData
      && j(sunday[0]) === j(sunday[1]) && j(sunday[2]) === j(sunday[3]) && j(back[0]) === j(back[1]), j([sunday[1], back[1]]));
    await x.o.ctx.close(); await x.n.ctx.close();
  }
}

// F (round 9b): shots of the empty states (my attendance Aug 2026, team attendance 2020-01-06), old and new, 1280 and 412, light and dark
if (ONLY.includes("F")) {
  let n = 0;
  const heads = {};
  for (const [page, step] of [["attendance/my-attendance.html", async (t) => { await t.selectOption("#month-select", "2026-08"); }],
    ["attendance/team-attendance.html", async (t) => { await t.fill("#team-date", "2020-01-06"); await t.dispatchEvent("#team-date", "change"); }]]) {
    for (const width of [1280, 412]) for (const theme of ["light", "dark"]) for (const [side, base] of [["old", O], ["new", N]]) {
      const x = await open(base, "hr", page, { width, theme });
      await step(x.t); await x.t.waitForTimeout(400);
      heads[`${page} ${width} ${theme}`] = [...(heads[`${page} ${width} ${theme}`] ?? []), await x.t.evaluate(() => [...document.querySelectorAll("main thead")].map((h) => [h.innerText.replace(/\s+/g, " ").trim(), [...h.querySelectorAll("th")].filter((th) => th.getClientRects().length && getComputedStyle(th).position !== "absolute").map((th) => th.innerText.replace(/\s+/g, " ").trim())]))];
      await x.t.screenshot({ path: path.join(SHOTS, `empty-${page.split("/")[1].replace(".html", "")}-${width}-${theme}-${side}.png`), fullPage: true }); n++;
      await x.ctx.close();
    }
  }
  check("F1", "empty-state shots written", n === 16, `${n} files`);
  const badHeads = Object.entries(heads).filter(([, [a, b]]) => j(a) !== j(b));
  check("F2", "the table headings as drawn (on a phone: \"Sort by\" before a sortable column) the same, old and new", badHeads.length === 0, badHeads.length ? j(badHeads).slice(0, 600) : j(heads[`attendance/team-attendance.html 412 light`]));
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
  await phoneCards("P", (process.env.PHONE_PAGES ?? "emp:attendance/mark-attendance.html,emp:attendance/my-attendance.html,admin:attendance/shifts.html").split(",").map((s) => s.split(":")));
}

if (ONLY.includes("X")) {
  console.log("\n--- X. Shots ---");
  let k = 0;
  const list = (process.env.SHOT_PAGES ?? "emp:attendance/mark-attendance.html,emp:attendance/my-attendance.html,admin:attendance/shifts.html").split(",").map((s) => s.split(":"));
  for (const [who, page] of list) for (const width of [1280, 412]) for (const theme of ["light", "dark"]) for (const [side, base] of [["old", O], ["new", N]]) {
    const x = await open(base, who, page, { width, theme });
    await x.t.screenshot({ path: path.join(SHOTS, `${page.split("/")[1].replace(".html", "")}-${width}-${theme}-${side}.png`), fullPage: true, animations: "disabled" });
    k++; await x.ctx.close();
  }
  check("X1", "shots written", k === list.length * 8, `${k} files`);
}

await browser.close();
console.log(`\natt: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
