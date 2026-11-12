// access.mjs: a page round's parity harness (built by mk-harness.py from att.mjs; edit access-sections.mjs.txt) (msedge, headless). usage: node att.mjs <app dist> <pristine tree> <shots dir>   ONLY=<letters>
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
const ONLY = process.env.ONLY ?? "REWGDPX";
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
    text: tx(m.innerText),
    controls: [...m.querySelectorAll("button, a.btn, input, select, textarea")].filter(vis).map((c) => [c.tagName, tx(c.tagName === "TEXTAREA" ? "" : c.tagName === "SELECT" ? [...c.options].map((o) => tx(o.textContent)).join(" ") : c.textContent) || tx(c.getAttribute("aria-label") || c.name || c.id || ""), c.disabled ?? null, c.type === "radio" || c.type === "checkbox" ? c.checked : c.value ?? null]),
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

// ---- access.mjs's own sections (round 16), spliced into att.mjs's core by mk-harness.py ----
//   R  roles list, as each role: as opened; search "fin", "system", "zzz", then cleared
//   E  role editor, as each role, for ?role= admin, hr, fin, emp, a name that isn't a role ("boss") and none
//   W  approval workflows, as each role: as opened; a placeholder's toast (Edit on the first row)
//   G  delegation (a sample), as each role: as opened; a placeholder's toast (Delegate approvals)
//   D  designations, rebuilt from real data (new; the old page was a sample, so its table is not the reference): as each
//      role, the rows asserted against data/users.js + config/roles.js (title, department, default role, people holding it,
//      inactive left out); the department filter (Engineering, then Finance, then all); the Add form's role options (Admin
//      only for an Admin); Manage roles only with roles:manage; the parts the sample shared (header, Add form, its note) as
//      on the old page; Edit's and Add designation's toasts
const settle = (t, ms = 250) => t.waitForTimeout(ms);
const same = (n, label, a, b) => { const bad = a.map((v, i) => j(v) === j(b[i])).indexOf(false); check(n, label, bad === -1 && a.length === b.length, bad === -1 ? `${a.length} steps` : `step ${bad}: ${where(j(a[bad]), j(b[bad]))}`); };
const toastAfter = async (t, sel) => { const b = await t.$(sel); if (!b) return "none"; await b.click(); await settle(t, 300); return (await toasts(t)).at(-1) ?? "no toast"; };
const imp = (rel) => import(new URL("file:///" + path.join(PRIST, rel).replace(/\\/g, "/")).href);

if (ONLY.includes("R")) {
  console.log("--- R. Roles list ---");
  await pages("R", "access/roles-list.html", async (who, x) => {
    const steps = async (t) => {
      const out = [];
      for (const q of ["fin", "system", "zzz", ""]) { await t.fill('input[aria-label="Search roles"]', q); await settle(t, 150); out.push(await read(t)); }
      return out;
    };
    same(`R2.${who}`, `${who}: search fin, system, zzz, cleared`, await steps(x.o.t), await steps(x.n.t));
  });
}

if (ONLY.includes("E")) {
  console.log("--- E. Role editor ---");
  for (const q of ["admin", "hr", "fin", "emp", "boss", ""]) {
    await pages(`E${q || "none"}`, `access/role-editor.html${q ? `?role=${q}` : ""}`, async (who, x) => {
      const title = async (t) => [await t.title(), await t.evaluate(() => document.querySelector("#role-crumb")?.textContent)];
      same(`E${q || "none"}2.${who}`, `${who}: the tab's title and the crumb`, [await title(x.o.t)], [await title(x.n.t)]);
    });
  }
}

if (ONLY.includes("W")) {
  console.log("--- W. Approval workflows ---");
  await pages("W", "access/approval-workflows.html", async (who, x) => {
    same(`W2.${who}`, `${who}: Edit on the first row: its toast`, [await toastAfter(x.o.t, "main tbody tr:first-child [data-not-implemented]")], [await toastAfter(x.n.t, "main tbody tr:first-child [data-not-implemented]")]);
  });
}

if (ONLY.includes("G")) {
  console.log("--- G. Delegation (sample) ---");
  await pages("G", "access/delegation.html", async (who, x) => {
    const sel = 'main [data-not-implemented="Delegate approvals"]:visible';
    same(`G2.${who}`, `${who}: Delegate approvals: its toast`, [await toastAfter(x.o.t, sel)], [await toastAfter(x.n.t, sel)]);
  });
}

if (ONLY.includes("D")) {
  console.log("--- D. Designations, from real data ---");
  const { DESIGNATIONS, USERS, DEPARTMENTS } = await imp("assets/js/data/users.js");
  const { ROLES: ROLE_DEFS } = await imp("assets/js/config/roles.js");
  const dept = (c) => DEPARTMENTS.find((d) => d.code === c)?.name ?? c;
  const expected = (code) => DESIGNATIONS.filter((d) => !code || d.department === code).map((d) => [d.title, dept(d.department), ROLE_DEFS[d.defaultRole].label,
    String(USERS.filter((u) => u.status !== "inactive" && u.designation === d.title).length), "Edit"]);
  const shared = (t) => t.evaluate(() => {
    const tx = (s) => (s ?? "").replace(/\s+/g, " ").trim();
    const m = document.querySelector("main#main");
    // the department and role options are the store's and the config's now (D5, D6): masked here
    return [tx(m.querySelector(".page-header")?.innerText), tx(m.querySelector("aside")?.innerText.replace(/Select department[\s\S]*?Default role/, "Select department … Default role").replace(/Select role[\s\S]*?New employees/, "Select role … New employees"))];
  });
  for (const who of ROLES) {
    const x = await both(who, "access/designations.html");
    if (x.o.at !== x.n.at || !x.n.at.endsWith("designations.html")) { check(`D.${who}`, `${who}: lands where the old site does`, x.o.at === x.n.at, `${x.o.at} | ${x.n.at}`); await x.o.ctx.close(); await x.n.ctx.close(); continue; }
    const t = x.n.t;
    const rows = async () => (await read(t)).tables[0];
    // Edit hides without designations:edit: then the actions cell is empty
    const edit = await t.$("main tbody [data-not-implemented]:visible");
    const fix = (list) => (edit ? list : list.map((r) => [...r.slice(0, 4), ""]));
    check(`D1.${who}`, `${who}: every designation, its department, default role and people holding it`, j(await rows()) === j(fix(expected(""))), j(await rows()));
    await t.selectOption('select[aria-label="Filter by department"]', "ENG"); await settle(t, 150);
    check(`D2.${who}`, `${who}: Engineering only`, j(await rows()) === j(fix(expected("ENG"))), j(await rows()));
    await t.selectOption('select[aria-label="Filter by department"]', "FIN"); await settle(t, 150);
    check(`D3.${who}`, `${who}: Finance only`, j(await rows()) === j(fix(expected("FIN"))), j(await rows()));
    await t.selectOption('select[aria-label="Filter by department"]', ""); await settle(t, 150);
    check(`D4.${who}`, `${who}: all again`, (await rows()).length === DESIGNATIONS.length);
    const roleOpts = await t.$$eval("#d-role option", (os) => os.map((o) => o.textContent));
    const wantRoles = ["Select role", "Employee", "HR Manager", "Finance Manager", ...(who === "admin" ? ["Admin"] : [])];
    check(`D5.${who}`, `${who}: the default role options (Admin only for an Admin)`, j(roleOpts) === j(wantRoles), j(roleOpts));
    const deptOpts = await t.$$eval("#d-dept option", (os) => os.map((o) => o.textContent));
    check(`D6.${who}`, `${who}: the department options: the store's active departments`, j(deptOpts) === j(["Select department", ...DEPARTMENTS.map((d) => d.name)]), j(deptOpts));
    const manage = await t.$('main a:has-text("Manage roles"):visible');
    check(`D7.${who}`, `${who}: Manage roles shown only with roles:manage (Admin)`, Boolean(manage) === (who === "admin"));
    const [so, sn] = [await shared(x.o.t), await shared(t)];
    check(`D8.${who}`, `${who}: the header and the Add form as on the old page`, j(so) === j(sn), where(j(so), j(sn)));
    if (edit) same(`D9.${who}`, `${who}: Edit's toast`, [await toastAfter(x.o.t, "main tbody tr:first-child [data-not-implemented]")], [await toastAfter(t, "main tbody tr:first-child [data-not-implemented]")]);
    const add = 'main [data-not-implemented="Add designation"]:visible';
    same(`D10.${who}`, `${who}: Add designation's toast`, [await toastAfter(x.o.t, add)], [await toastAfter(t, add)]);
    if (x.n.errs.length) check(`D11.${who}`, "no page errors", false, j(x.n.errs));
    await x.o.ctx.close(); await x.n.ctx.close();
    // the phone cards at 412: the old sample's rows were examples (9), the real list has 10; each row's card parts as the old's
    const card = async (base) => { const y = await open(base, who, "access/designations.html", { width: 412 }); const r = await y.t.evaluate(() => {
      const tb = document.querySelector("main table"); const rows = [...tb.querySelectorAll("tbody tr")].map((r) => [...r.cells].map((c) => `${c.dataset.label}|${c.dataset.cardPart}|${c.querySelector(".table__more") ? "more" : ""}|${getComputedStyle(c).display}`).join(","));
      return [tb.hasAttribute("data-cards"), [...new Set(rows)]]; }); await y.ctx.close(); return r; };
    const [co, cn] = [await card(O), await card(N)];
    check(`D12.${who}`, `${who}: at 412 the rows are cards with the old sample's parts`, j(co) === j(cn), where(j(co), j(cn)));
  }
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
  await phoneCards("P", (process.env.PHONE_PAGES ?? "admin:access/roles-list.html,admin:access/role-editor.html?role=hr,admin:access/approval-workflows.html,admin:access/delegation.html").split(",").map((s) => s.split(":")));
}

if (ONLY.includes("X")) {
  console.log("\n--- X. Shots ---");
  let k = 0;
  const list = (process.env.SHOT_PAGES ?? "admin:access/roles-list.html,admin:access/role-editor.html?role=hr,admin:access/approval-workflows.html,admin:access/delegation.html").split(",").map((s) => s.split(":"));
  for (const [who, page] of list) for (const width of [1280, 412]) for (const theme of ["light", "dark"]) for (const [side, base] of [["old", O], ["new", N]]) {
    const x = await open(base, who, page, { width, theme });
    await x.t.screenshot({ path: path.join(SHOTS, `${page.split("/")[1].replace(".html", "").replace(/[?&=]/g, "-")}-${width}-${theme}-${side}.png`), fullPage: true, animations: "disabled" });
    k++; await x.ctx.close();
  }
  check("X1", "shots written", k === list.length * 8, `${k} files`);
}

await browser.close();
console.log(`\naccess: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
