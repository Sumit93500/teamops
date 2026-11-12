// L1's harness (msedge, headless): the users pages ported in the design system, and the new offices, company profile and
// footer screens. usage: node users.mjs <app dist> <pristine tree> <shots dir>   [ONLY=RLFPDOCAXKWE]
// Old page (pristine, served as the static site) against the new route, same session, fixed clock Mon 28 Sep 2026 10:00 IST,
// fresh storage each. The design is new, so nothing is compared by CSS class: each side is read by meaning (headings, ids,
// labels, table cells, dialog and toast words), and TEXT, behaviour and role access must match.
//   R  role access: admin, hr, fin, emp and a manager (Sneha) open each users page: the same page or the same 403
//   L  users list: header, tabs and counts, table (every cell), actions per role; each filter step; Export's file; the
//      Reset question's words
//   F  user form: every field (value, disabled, options), access summary, effective permissions, overrides and their
//      lock, for Add and Edit as Admin / HR, own record, an Admin, not found; saving (new, email taken); New: office and
//      home check-in saved
//   P  user profile: header, details, sensitive (Reveal), access, overrides, leave, assets, activity, actions, reasons;
//      Reset password; Deactivate (the date check, then done); Reactivate; Delete refused; not found. New: check-in places,
//      devices (Admin reset, asked)
//   D  departments: numbers, cards, note; Add (code taken, then added), Edit (saved), deactivating one with people (asked)
//   O  offices (new): who sees what; Add branch (state required, then added); this device's location; deactivate (asked);
//      moving someone; the privacy line
//   C  Settings, Company profile (new): checks; a saved name reaches the shell, the tab and About; HR reads only
//   A  About: overview and mission when added, "Not added yet." when not; the offices; live counts
//   X  sign-in and error pages: "© 2026 <company> · Powered by OfficeOS" at the end, the panel's old line gone
//   K  keyboard: users list filters in order, a status tab by Enter; the offices dialog closes on Esc
//   W  412 and 1280, light and dark: every new screen without sideways scroll; shots
//   E  no page or console errors on the new side
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, PRIST, SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "RLFPDOCAXKWE";
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srvN = spawn("python", [path.join(HERE, "spa-serve.py"), "9985", DIST], { stdio: "ignore" });
const srvO = spawn("python", [path.join(EDGE, "lib", "serve.py"), "9986", PRIST], { stdio: "ignore" });
const stop = () => { try { srvN.kill(); srvO.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9985", O = "http://127.0.0.1:9986";
for (const u of [N + "/", O + "/pages/errors/404.html"]) { for (let i = 0; i < 60; i++) { try { if ((await fetch(u)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); } }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"], out: null };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const SIZES = { 412: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA }, 1280: { viewport: { width: 1280, height: 900 } } };
const COMPANY = "Northwind Technologies Pvt. Ltd.";
const PRIVACY = "Your location is read only when you check in or out, never in the background.";
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(16)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 700)}` : ""}`); };
const j = JSON.stringify;
function where(x, y) {
  x = x ?? "(nothing)"; y = y ?? "(nothing)";
  let i = 0; while (i < x.length && x[i] === y[i]) i++;
  return `at ${i}: old …${x.slice(Math.max(0, i - 60), i + 160)}… new …${y.slice(Math.max(0, i - 60), i + 160)}…`;
}
const same = (n, label, a, b) => check(n, label, j(a) === j(b), j(a) === j(b) ? "" : where(j(a), j(b)));
const newErrs = [];

async function open(base, who, page, { width = 1280, theme = "light", prep = null, geo = null } = {}) {
  const ctx = await browser.newContext({ ...SIZES[width], timezoneId: "Asia/Kolkata", acceptDownloads: true, ...(geo ? { geolocation: geo, permissions: ["geolocation"] } : {}) });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date("2026-09-28T10:00:00+05:30"));
  await ctx.addInitScript(([w, th]) => {
    if (sessionStorage.getItem("u-set")) return;
    sessionStorage.setItem("u-set", "1"); localStorage.clear();
    localStorage.setItem("officeos:theme", JSON.stringify(th));
    if (w) localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
  }, [WHO[who], theme]);
  const t = await ctx.newPage();
  const errs = [];
  t.on("pageerror", (e) => errs.push(e.message)); t.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
  if (base === N) { t.on("pageerror", (e) => newErrs.push(`${who} ${page}: ${e.message}`)); t.on("console", (m) => { if (m.type() === "error") newErrs.push(`${who} ${page}: console ${m.text()}`); }); }
  const dialogs = [];
  t.on("dialog", async (d) => { dialogs.push(d.message()); await (t.answer ? d.accept() : d.dismiss()); });
  await t.goto(base + "/pages/" + page); await t.waitForLoadState("load"); await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(350);
  if (prep) { await t.evaluate(prep); await t.reload(); await t.waitForLoadState("load"); await t.waitForTimeout(400); }
  return { ctx, t, errs, dialogs, at: () => new URL(t.url()).pathname + new URL(t.url()).search };
}
const settle = (t, ms = 200) => t.waitForTimeout(ms);
const toasts = (t) => t.evaluate(() => [...document.querySelectorAll(".toast .toast__text")].map((e) => e.textContent.trim()));
// The question asked: the old page's window.confirm (recorded), the new page's in-app dialog (read, then answered).
async function asked(x, yes) {
  if (x.isNew) {
    await x.t.waitForSelector(".confirm-dialog", { timeout: 3000 }).catch(() => {});
    const text = await x.t.evaluate(() => [...document.querySelectorAll(".confirm-dialog .modal__title, .confirm-dialog .modal__desc")].map((p) => p.textContent).join("\n"));
    await x.t.click(yes ? ".confirm-dialog .modal__footer .btn:last-child, .confirm-dialog [data-confirm-ok]" : "[data-confirm-cancel]").catch(() => {});
    await settle(x.t);
    return text;
  }
  await settle(x.t);
  return x.dialogs.at(-1) ?? null;
}
async function pair(who, page, opts = {}) {
  const o = await open(O, who, page, opts), n = await open(N, who, page, opts);
  n.isNew = true;
  return { o, n, close: async () => { await o.ctx.close(); await n.ctx.close(); } };
}
const normalise = (s) => (s ?? "").replace(/\s+/g, " ").trim();

// ---------- readers (both designs) ----------
const head = (t) => t.evaluate(() => {
  const tx = (e) => (e ? e.innerText.replace(/\s+/g, " ").trim() : null);
  const vis = (e) => Boolean(e) && e.getClientRects().length > 0 && !e.closest("[hidden]");
  const actions = document.querySelector("main .page-header__actions, main .ds-page-header__actions");
  const subEl = document.querySelector("main .page-header__subtitle, main .ds-page-header__subtitle");
  return { h1: tx(document.querySelector("main h1")), sub: vis(subEl) ? tx(subEl) : null,
    crumbs: [...document.querySelectorAll("main .breadcrumb__item, main .ds-breadcrumb li")].map(tx),
    actions: actions ? [...actions.querySelectorAll("a, button")].filter(vis).map(tx) : [], title: document.title.replace(/ \| .*$/, "") };
});
const table = (t, sel = "main table") => t.evaluate((sel) => {
  const tb = document.querySelector(sel);
  const tx = (e) => e.innerText.replace(/\s+/g, " ").trim();
  if (!tb) return null;
  return { head: [...tb.querySelectorAll("thead th")].map(tx), rows: [...tb.querySelectorAll("tbody tr")].map((r) => [...r.cells].filter((c) => !c.hidden).map(tx)) };
}, sel);
const kv = (t, keys) => t.evaluate((keys) => {
  const out = {};
  for (const dt of document.querySelectorAll("main dt")) {
    const k = dt.textContent.trim();
    if (!keys.includes(k)) continue;
    const dd = dt.nextElementSibling;
    if (!dd || dd.getClientRects().length === 0) continue;
    out[k] = dd.innerText.replace(/\s+/g, " ").replace(/ ?(Reveal|Hide)$/, "").trim();
  }
  return keys.map((k) => [k, out[k] ?? null]);
}, keys);

// ---------- R: role access ----------
if (ONLY.includes("R")) {
  console.log("\n--- R. Role access ---");
  for (const page of ["users/users-list.html", "users/user-form.html", "users/user-profile.html?id=EMP-1042", "users/departments.html"]) {
    for (const who of ["admin", "hr", "fin", "emp", "mgr"]) {
      const x = await pair(who, page);
      await settle(x.n.t, 300);
      const at = (p) => (p.startsWith("/pages/errors/403") ? "403" : "page");
      same(`R.${page.split("/")[1].split(".")[0]}.${who}`, `${who} opens ${page}: the same outcome`, [at(x.o.at())], [at(x.n.at())]);
      await x.close();
    }
  }
}

// ---------- L: users list ----------
if (ONLY.includes("L")) {
  console.log("\n--- L. Users list ---");
  const read = (t) => t.evaluate(() => {
    const tx = (e) => e.innerText.replace(/\s+/g, " ").trim();
    const tabs = [...document.querySelectorAll('main .table__toolbar .tabs__tab, main [role="tablist"] [role="tab"]')].map((b) => {
      const count = b.querySelector(".badge--count, .ds-tabs__count")?.textContent.trim();
      return [tx(b).replace(new RegExp(`\\s*${count}$`), ""), count, (b.classList.contains("is-active") || b.getAttribute("aria-selected") === "true")];
    });
    const tb = document.querySelector("main table");
    return { tabs, head: [...tb.querySelectorAll("thead th")].map(tx), rows: [...tb.querySelectorAll("tbody tr")].map((r) => [...r.cells].filter((c) => !c.hidden).map(tx)),
      edits: [...tb.querySelectorAll("tbody a")].filter((a) => a.textContent.trim() === "Edit" && a.getClientRects().length).map((a) => new URL(a.href).pathname + new URL(a.href).search),
      names: [...tb.querySelectorAll("tbody a")].filter((a) => a.textContent.trim() !== "Edit").map((a) => new URL(a.href).pathname + new URL(a.href).search),
      selects: [...document.querySelectorAll("main select")].map((s) => [...s.options].map((o) => o.textContent.trim())) };
  });
  const searchSel = 'main input[type="search"]';
  const pickSelect = async (t, i, label) => { const s = (await t.$$("main select"))[i]; await s.selectOption({ label }); await settle(t, 150); };
  const tab = async (t, label) => { await t.click(`main [role="tab"]:has-text("${label}"), main .tabs__tab:has-text("${label}")`); await settle(t, 150); };
  for (const who of ["admin", "hr"]) {
    const x = await pair(who, "users/users-list.html");
    same(`L1.${who}`, `${who}: heading, subtitle, actions shown (Reset demo data, Export, Add employee)`, await head(x.o.t), await head(x.n.t));
    same(`L2.${who}`, `${who}: tabs with counts, the table (every cell), Edit links, profile links, the filters' options`, await read(x.o.t), await read(x.n.t));
    const steps = async (t) => {
      const out = [];
      await tab(t, "Active"); out.push(await read(t));
      await tab(t, "Inactive"); out.push(await read(t));
      await tab(t, "All"); await t.fill(searchSel, "ka"); await settle(t, 150); out.push(await read(t));
      await t.fill(searchSel, ""); await pickSelect(t, 0, "Engineering"); out.push(await read(t));
      await pickSelect(t, 1, "Employee"); out.push(await read(t));
      await t.fill(searchSel, "zzz"); await settle(t, 150); out.push(await read(t));
      return out;
    };
    const [a, b] = [await steps(x.o.t), await steps(x.n.t)];
    a.forEach((s, i) => same(`L3.${who}.${i + 1}`, `${who}: step ${i + 1} of Active, Inactive, search "ka", Engineering, Employee, "zzz" (No employees match these filters.)`, s, b[i]));
    await x.close();
  }
  {
    const x = await pair("admin", "users/users-list.html?dept=FIN");
    same("L4", "?dept=FIN (Departments' View people): the Finance filter is set", await read(x.o.t), await read(x.n.t));
    await x.close();
  }
  {
    const x = await pair("admin", "users/users-list.html");
    const file = async (t) => { const [d] = await Promise.all([t.waitForEvent("download"), t.click('main button:has-text("Export")')]); return [d.suggestedFilename(), fs.readFileSync(await d.path(), "utf8")]; };
    same("L5", "Export: the same file, name and bytes", await file(x.o.t), await file(x.n.t));
    const askReset = async (x2) => { await x2.t.click('main button:has-text("Reset demo data")'); return asked(x2, false); };
    same("L6", "Reset demo data asks the same question (answered no: nothing reset)", [await askReset(x.o)], [await askReset(x.n)]);
    await x.close();
  }
  for (const who of ["fin", "emp"]) { /* they get the 403 (R) */ }
}

// ---------- F: user form ----------
const FIELDS = ["first-name", "last-name", "work-email", "phone", "dob", "emp-id", "bank-account", "pan", "department", "designation", "manager", "joining", "emp-type", "location", "default-role"];
const readForm = (t) => t.evaluate((ids) => {
  const tx = (e) => (e ? e.innerText.replace(/\s+/g, " ").trim() : null);
  const fields = ids.map((id) => {
    const el = document.getElementById(id);
    if (!el) return [id, null];
    const label = document.querySelector(`label[for="${id}"]`);
    return [id, tx(label)?.replace(/\s*\*$/, ""), el.value, el.disabled, el.required, el.tagName === "SELECT" ? [...el.options].map((o) => [o.value, o.textContent.trim()]) : null];
  });
  const summary = {};
  for (const dt of document.querySelectorAll("main dt")) summary[dt.textContent.trim()] = dt.nextElementSibling?.innerText.replace(/\s+/g, " ").trim();
  const opts = (name) => [...document.querySelectorAll(`#${name}-options input`)].map((i) => [i.value, i.checked, i.disabled]);
  const reason = document.getElementById("overrides-reason");
  const chipsBox = document.getElementById("effective-permissions");
  return { fields, summary: ["Designation", "Default role", "Data scope", "Approval chain", "Two-factor sign-in"].map((k) => [k, summary[k] ?? null]),
    count: document.getElementById("effective-count")?.textContent.trim(), chips: chipsBox ? [...chipsBox.children].map((c) => c.textContent.trim()) : null,
    granted: chipsBox ? [...chipsBox.children].filter((c) => c.title === "Granted to this person").map((c) => c.textContent.trim()) : null,
    grant: opts("grant"), deny: opts("deny"), noneGrant: tx(document.getElementById("grant-options"))?.startsWith("None") ?? null,
    reason: reason && !reason.hidden && reason.getClientRects().length ? reason.textContent.trim() : "",
    account: document.getElementById("account-active")?.getClientRects().length ? document.getElementById("account-active").checked : null,
    submit: [...document.querySelectorAll('main button[type="submit"]')].filter((b) => b.getClientRects().length).map((b) => b.textContent.trim()) };
}, FIELDS);
if (ONLY.includes("F")) {
  console.log("\n--- F. User form ---");
  for (const [who, q] of [["admin", ""], ["hr", ""], ["admin", "?id=EMP-1105"], ["admin", "?id=EMP-1003"], ["admin", "?id=EMP-1001"], ["admin", "?id=EMP-1008"], ["hr", "?id=EMP-1105"], ["hr", "?id=EMP-1042"]]) {
    const x = await pair(who, `users/user-form.html${q}`);
    same(`F1.${who}${q}`, `${who} ${q || "(add)"}: heading, crumbs, tab title`, await head(x.o.t), await head(x.n.t));
    same(`F2.${who}${q}`, `${who} ${q || "(add)"}: every field, access summary, effective permissions, overrides and their lock, Account, the submit button`, await readForm(x.o.t), await readForm(x.n.t));
    await x.close();
  }
  {
    // the designation drives the role, the summary and the overrides; ticking an override redraws Effective permissions
    const x = await pair("admin", "users/user-form.html");
    const steps = async (t) => {
      const out = [];
      await t.selectOption("#designation", { label: "HR Manager" }); await settle(t, 150); out.push(await readForm(t));
      await t.selectOption("#manager", { label: "Sneha Rao" }); await settle(t, 150); out.push(await readForm(t));
      await t.check('#grant-options input[value="inventory:view"]'); await t.check('#deny-options input[value="audit:view"]'); await settle(t, 150); out.push(await readForm(t));
      return out;
    };
    const [a, b] = [await steps(x.o.t), await steps(x.n.t)];
    a.forEach((s, i) => same(`F3.${i + 1}`, `designation HR Manager, manager Sneha, then an extra and a denied permission: step ${i + 1}`, s, b[i]));
    await x.close();
  }
  {
    const x = await pair("admin", "users/user-form.html?id=EMP-9999");
    const nf = (t) => t.evaluate(() => ({ text: document.querySelector("main .empty")?.innerText.replace(/\s+/g, " ").trim() ?? null, back: document.querySelector("main .empty a")?.getAttribute("href")?.replace(/^\.\.\//, "/pages/") }));
    same("F4", "not found: heading, crumb, the empty state and its link", [await head(x.o.t), (await nf(x.o.t)).text], [await head(x.n.t), (await nf(x.n.t)).text]);
    await x.close();
  }
  // saving
  const fill = async (t, email) => {
    await t.fill("#first-name", "Neha"); await t.fill("#last-name", "Verma"); await t.fill("#work-email", email);
    await t.selectOption("#department", { label: "Engineering" }); await t.selectOption("#designation", { label: "Software Engineer" });
    await t.fill("#joining", "2026-10-05");
  };
  const submit = async (t) => { await t.click('main button[type="submit"]'); await settle(t, 300); };
  {
    const x = await pair("admin", "users/user-form.html");
    const taken = async (t) => { await fill(t, "arjun.kapoor@northwind.com"); await submit(t); return t.evaluate(() => [document.querySelector("#work-email-error, .form-error")?.textContent.trim() ?? null, document.activeElement?.id]); };
    same("F5", "an email already used: the store's words at the email field, focus there", [(await taken(x.o.t))[0]], [(await taken(x.n.t))[0]]);
    const ok = async (t) => { await t.fill("#work-email", "neha.verma@northwind.com"); await submit(t); const tt = await toasts(t); await t.waitForURL(/users-list/, { timeout: 4000 }).catch(() => {}); return [tt.at(-1), new URL(t.url()).pathname]; };
    same("F6", "saved: \"Employee saved.\", then the list", await ok(x.o.t), await ok(x.n.t));
    const listed = async (t) => (await table(t))?.rows.find((r) => r[0].includes("Neha Verma"))?.slice(0, 6);
    same("F7", "the new employee in the list, as on the old page", await listed(x.o.t), await listed(x.n.t));
    await x.close();
  }
  {
    // new only: office and home check-in, saved after the employee
    const n = await open(N, "admin", "users/user-form.html?id=EMP-1105", { prep: () => {
      const box = { version: 1, nextNum: 3, assignments: {}, records: [
        { id: "OFF-1", name: "Head office", type: "head", address: "Sector 44, Gurugram, Haryana 122003", state: "Haryana", lat: 28.4523, lng: 77.0723, radiusM: 150, active: true, sample: true, note: "Sample coordinates: set the real location." },
        { id: "OFF-2", name: "Pune branch", type: "branch", address: "Hinjewadi, Pune", state: "Maharashtra", lat: 18.59, lng: 73.73, radiusM: 200, active: true, sample: false, note: "" }] };
      localStorage.setItem("officeos:offices", JSON.stringify(box));
    } });
    const opts = await n.t.evaluate(() => [...document.querySelectorAll("#office option")].map((o) => o.textContent));
    await n.t.selectOption("#office", "OFF-2"); await n.t.click("#home-eligible"); await submit(n.t);
    const after = await n.t.evaluate(() => [JSON.parse(localStorage.getItem("officeos:offices")).assignments["EMP-1105"], JSON.parse(localStorage.getItem("officeos:home-locations") ?? "{}").people?.["EMP-1105"]?.homeEligible]);
    check("F8", "New: the Admin picks Arjun's office (offices listed with their state) and turns on home check-in; both saved with the employee", j(opts) === j(["Head office, Haryana", "Pune branch, Maharashtra"]) && j(after) === j(["OFF-2", true]), j([opts, after]));
    await n.ctx.close();
    const h = await open(N, "hr", "users/user-form.html?id=EMP-1105");
    const hs = await h.t.evaluate(() => [document.getElementById("office").disabled, document.getElementById("home-eligible").disabled, document.getElementById("office").closest(".ds-field").querySelector(".ds-field__helper")?.textContent]);
    check("F9", "New: HR can't change the office (Admin only, said under it) but can turn home check-in on or off", j(hs) === j([true, false, "Only an Admin can change someone's office."]), j(hs));
    await h.ctx.close();
  }
}

// ---------- P: user profile ----------
const PROFILE_KEYS = ["Work email", "Phone", "Location", "Employment type", "Department", "Reporting manager", "Date of joining", "Last working day", "Tenure", "Bank account", "PAN", "Salary",
  "Designation", "Default role", "Data scope", "Approval chain", "Two-factor sign-in", "Last sign-in"];
const readProfile = (t) => t.evaluate(() => {
  const tx = (e) => (e ? e.innerText.replace(/\s+/g, " ").trim() : null);
  const card = (title) => [...document.querySelectorAll("main section, main .card, main .ds-card")].find((c) => tx(c.querySelector(".card__title, .ds-card__title")) === title);
  const reasons = [...document.querySelectorAll("main .reason, main [id$='-reason']")].filter((r) => r.getClientRects().length && !r.hidden).map(tx);
  const leave = card("Leave balance");
  const assets = card("Assets");
  return {
    name: tx(document.querySelector(".profile__name, #profile-name")), meta: tx(document.querySelector(".profile__meta, #profile-meta")),
    badges: [...document.querySelectorAll(".profile__badges .badge, #profile-badges > *")].map(tx),
    overrides: tx(card("Permission overrides")?.querySelector(".card__meta, .ds-card__meta")), overrideText: tx(card("Permission overrides")?.querySelector(".card__body, .ds-card__body")),
    leave: leave ? [...leave.querySelectorAll(".bar-row, dl > div")].map((r) => tx(r)) : null,
    assets: assets ? [tx(assets.querySelector(".card__meta, .ds-card__meta")), ...[...assets.querySelectorAll(".list__item, dl > div")].map((r) => tx(r).replace(/ Good$| Fair$| Poor$/, (m) => m))] : null,
    activity: tx(card("Recent activity")?.querySelector(".card__body, .ds-card__body, p")), reasons,
  };
});
if (ONLY.includes("P")) {
  console.log("\n--- P. User profile ---");
  for (const [who, id] of [["admin", "EMP-1042"], ["admin", "EMP-1105"], ["admin", "EMP-1061"], ["admin", "EMP-1001"], ["admin", "EMP-1088"], ["hr", "EMP-1042"], ["hr", "EMP-1003"]]) {
    const x = await pair(who, `users/user-profile.html?id=${id}`);
    const [ho, hn] = [await head(x.o.t), await head(x.n.t)];
    same(`P1.${who}.${id}`, `${who} on ${id}: heading, crumbs, actions shown, tab title`, ho, hn);
    const [ko, kn] = [await kv(x.o.t, PROFILE_KEYS), await kv(x.n.t, PROFILE_KEYS)];
    // Ruled L1 difference: with no joining date on record the old page kept its static sample tenure ("5 years, 6
    // months"); the new one says "—". Compared without that row then.
    const noJoin = ko.find((r) => r[0] === "Date of joining")?.[1] === "—";
    const drop = (rows) => (noJoin ? rows.map((r) => (r[0] === "Tenure" ? [r[0], "(no joining date)"] : r)) : rows);
    same(`P2.${who}.${id}`, `${who} on ${id}: every detail, sensitive and access row${noJoin ? " (tenure: no joining date, ruled)" : ""}`, drop(ko), drop(kn));
    same(`P3.${who}.${id}`, `${who} on ${id}: name, line, badges, overrides, leave, assets, activity, the reasons under the buttons`, await readProfile(x.o.t), await readProfile(x.n.t));
    await x.close();
  }
  {
    const x = await pair("admin", "users/user-profile.html?id=EMP-1042");
    const reveal = async (t) => { const b = await t.$$('main button:has-text("Reveal")'); await b[0].click(); await settle(t); const a = await kv(t, ["Bank account"]); await (await t.$$('main button:has-text("Hide")'))[0].click(); await settle(t); return [a, await kv(t, ["Bank account"])]; };
    same("P4", "Reveal shows the whole account, Hide masks it again", await reveal(x.o.t), await reveal(x.n.t));
    const reset = async (t) => { await t.click('main button:has-text("Reset password")'); await settle(t, 300); return (await toasts(t)).at(-1); };
    same("P5", "Reset password: the toast (nothing is sent)", [await reset(x.o.t)], [await reset(x.n.t)]);
    const del = async (t) => { await t.click('main button:has-text("Delete")'); await settle(t, 300); return (await toasts(t)).at(-1); };
    same("P6", "Delete Rohan: refused at once with the reason (his open leave request)", [await del(x.o.t)], [await del(x.n.t)]);
    await x.close();
  }
  {
    const x = await pair("admin", "users/user-profile.html?id=EMP-1088");
    const deact = async (t) => {
      await t.click('main button:has-text("Deactivate")'); await settle(t, 300);
      const dlg = await t.evaluate(() => { const m = document.querySelector("#deactivate-modal"); return m ? [m.querySelector(".modal__title")?.textContent, m.querySelector(".modal__desc")?.textContent, document.getElementById("deactivate-date")?.value, m.querySelector("[id$='-assets']")?.textContent ?? null] : null; });
      await t.fill("#deactivate-date", "2026-10-30"); await t.click('#deactivate-modal button[type="submit"]'); await settle(t, 250);
      const err = await t.evaluate(() => document.querySelector("#deactivate-date-error, #deactivate-modal .form-error, #deactivate-modal [role='alert']")?.textContent.trim() ?? null);
      await t.fill("#deactivate-date", "2026-09-25"); await t.click('#deactivate-modal button[type="submit"]'); await settle(t, 350);
      return [dlg, err, (await toasts(t)).at(-1), (await kv(t, ["Last working day"]))[0][1]];
    };
    same("P7", "Deactivate Vikram: the dialog's words, a later date refused in the store's words, then done (toast, last working day shown)", await deact(x.o.t), await deact(x.n.t));
    await x.close();
  }
  {
    const x = await pair("admin", "users/user-profile.html?id=EMP-1061");
    x.o.t.answer = true;
    const react = async (xx) => { await xx.t.click('main button:has-text("Reactivate")'); const q = await asked(xx, true); await settle(xx.t, 300); return [q, (await toasts(xx.t)).at(-1)]; };
    same("P8", "Reactivate Divya: the same question, then the toast", await react(x.o), await react(x.n));
    await x.close();
  }
  {
    const x = await pair("admin", "users/user-profile.html?id=EMP-9999");
    const nf = (t) => t.evaluate(() => document.querySelector("main .empty")?.innerText.replace(/\s+/g, " ").trim() ?? null);
    same("P9", "not found: the crumb and the empty state", [(await head(x.o.t)).crumbs, await nf(x.o.t)], [(await head(x.n.t)).crumbs, await nf(x.n.t)]);
    await x.close();
  }
  {
    // new only: check-in places and devices
    const n = await open(N, "admin", "users/user-profile.html?id=EMP-1105", { prep: () => {
      localStorage.setItem("officeos:devices", JSON.stringify({ version: 1, nextNum: 3, records: [
        { id: "DEV-1", userId: "EMP-1105", token: "a".repeat(32), label: "Edge on Windows", registeredAt: "2026-09-20T04:00:00.000Z", lastUsedAt: "2026-09-27T04:00:00.000Z" },
        { id: "DEV-2", userId: "EMP-1105", token: "b".repeat(32), label: "Chrome on Android", registeredAt: "2026-09-21T04:00:00.000Z", lastUsedAt: "2026-09-26T04:00:00.000Z" }] }));
      localStorage.setItem("officeos:home-locations", JSON.stringify({ version: 1, people: { "EMP-1105": { homeEligible: true, permanent: { address: "12 MG Road, Gurugram", lat: 28.48, lng: 77.08, setAt: "2026-09-01T00:00:00.000Z", setBy: "EMP-1105" }, temporary: null, history: [] } } }));
    } });
    const places = await kv(n.t, ["Office", "Home check-in", "Permanent home", "Temporary home", "Change requests waiting"]);
    check("P10", "New: Check-in places for Arjun: head office in Haryana, home check-in allowed, his permanent home, no temporary, none waiting",
      j(places) === j([["Office", "Head office (head office, Haryana)"], ["Home check-in", "Allowed"], ["Permanent home", "12 MG Road, Gurugram"], ["Temporary home", "Not set"], ["Change requests waiting", "0"]]), j(places));
    const dev = await n.t.evaluate(() => { const c = document.getElementById("profile-devices"); return [c.querySelector(".ds-card__meta")?.textContent, [...c.querySelectorAll("dt")].map((d) => d.textContent), c.querySelector(".ds-card__footer")?.textContent]; });
    check("P11", "New: Devices: 2 of 2, each named; the honest note", dev[0] === "2 of 2" && j(dev[1]) === j(["Edge on Windows", "Chrome on Android"]) && /can't prove who is using it/.test(dev[2]), j(dev));
    await n.t.click('#profile-devices button:has-text("Reset devices")');
    n.isNew = true;
    const q = await asked(n, true);
    await settle(n.t, 300);
    const after = [await toasts(n.t), await n.t.evaluate(() => document.querySelector("#profile-devices .ds-card__meta")?.textContent)];
    check("P12", "New: Reset devices asks first, then clears them (toast; 0 of 2)", q.startsWith("Reset Arjun Kapoor's devices?") && after[0].at(-1) === "Arjun Kapoor's devices were reset (2 devices removed)." && after[1] === "0 of 2", j([q, after]));
    await n.ctx.close();
    const h = await open(N, "hr", "users/user-profile.html?id=EMP-1105");
    const hd = await h.t.evaluate(() => [document.querySelector("#profile-devices .ds-hint")?.textContent, Boolean(document.querySelector('#profile-devices button'))]);
    check("P13", "New: HR sees why devices aren't shown (Admin only) and no Reset button", j(hd) === j(["Only an Admin can see someone else's devices.", false]), j(hd));
    await h.ctx.close();
  }
}

// ---------- D: departments ----------
const readDepts = (t) => t.evaluate(() => {
  const tx = (e) => (e ? e.innerText.replace(/\s+/g, " ").trim() : null);
  const stats = [...document.querySelectorAll("main .stat, main [data-stat]")].map((s) => [tx(s.querySelector(".stat__label, .ds-kpi__label")), tx(s.querySelector(".stat__value, .ds-kpi__value")),
    tx(s.querySelector(".stat__delta, [data-stat-note]")) ?? ""]);
  const cards = [...document.querySelectorAll("main .dept, main [data-dept]")].map((c) => [tx(c.querySelector(".dept__name, .ds-card__title")), tx(c.querySelector(".dept__code, .ds-card__meta")),
    tx(c.querySelector(".badge, .ds-pill")), tx(c.querySelector(".dept__head .fw-medium, .ds-person__name")),
    [...c.querySelectorAll(".dept__stat, dl > div")].map((s) => tx(s)), c.querySelector('a[href*="users-list"]')?.getAttribute("href").replace(/^.*users-list/, "users-list"),
    [...c.querySelectorAll("button")].filter((b) => b.getClientRects().length).map(tx)]);
  return { stats, cards, note: tx(document.querySelector("main .alert, main .ds-note")) };
});
if (ONLY.includes("D")) {
  console.log("\n--- D. Departments ---");
  for (const who of ["admin", "hr"]) {
    const x = await pair(who, "users/departments.html");
    same(`D1.${who}`, `${who}: heading, crumbs, actions shown`, await head(x.o.t), await head(x.n.t));
    same(`D2.${who}`, `${who}: the four numbers, every card, the note`, await readDepts(x.o.t), await readDepts(x.n.t));
    await x.close();
  }
  {
    const x = await pair("admin", "users/departments.html");
    const dialog = (t) => t.evaluate(() => { const m = document.querySelector("#dept-modal"); return [m?.querySelector(".modal__title")?.textContent, m?.querySelector(".modal__desc")?.textContent, document.getElementById("dept-code")?.disabled,
      [...document.querySelectorAll("#dept-head option")].map((o) => o.textContent)]; });
    const add = async (t) => {
      await t.click('main button:has-text("Add department")'); await settle(t, 300);
      const opened = await dialog(t);
      await t.fill("#dept-name", "Marketing"); await t.fill("#dept-code", "eng"); await t.click('#dept-modal button[type="submit"], button[form="dept-form"]'); await settle(t, 250);
      const err = await t.evaluate(() => [document.querySelector("#dept-code-error, #dept-modal .form-error")?.textContent.trim() ?? null, document.getElementById("dept-code")?.value]);
      await t.fill("#dept-code", "mkt"); await t.click('#dept-modal button[type="submit"], button[form="dept-form"]'); await settle(t, 350);
      return [opened, err, (await toasts(t)).at(-1), (await readDepts(t)).cards.find((c) => c[0] === "Marketing")];
    };
    same("D3", "Add department: the dialog, a code already used (ENG) refused in the store's words, then MKT added (toast, card)", await add(x.o.t), await add(x.n.t));
    const edit = async (t) => {
      const card = await t.$('main .dept:has-text("Sales"), main [data-dept="SAL"]');
      await (await card.$('button:has-text("Edit")')).click(); await settle(t, 300);
      const opened = await dialog(t);
      await t.fill("#dept-name", "Sales and Marketing"); await t.click('#dept-modal button[type="submit"], button[form="dept-form"]'); await settle(t, 350);
      return [opened, (await toasts(t)).at(-1), (await readDepts(t)).cards.map((c) => c[0])];
    };
    same("D4", "Edit Sales: the dialog (code fixed), renamed, saved", await edit(x.o.t), await edit(x.n.t));
    await x.close();
  }
  {
    const x = await pair("admin", "users/departments.html");
    x.o.t.answer = false;
    const deact = async (xx) => {
      const card = await xx.t.$('main .dept:has-text("Engineering"), main [data-dept="ENG"]');
      await (await card.$('button:has-text("Edit")')).click(); await settle(xx.t, 300);
      await xx.t.click("#dept-active"); await xx.t.click('#dept-modal button[type="submit"], button[form="dept-form"]');
      return asked(xx, false);
    };
    same("D5", "deactivating Engineering (people in it) asks first; answered no, nothing saved", [await deact(x.o)], [await deact(x.n)]);
    await x.close();
  }
}

// ---------- O: offices (new) ----------
if (ONLY.includes("O")) {
  console.log("\n--- O. Offices (new) ---");
  for (const who of ["admin", "hr", "fin", "emp", "mgr"]) {
    const n = await open(N, who, "company/offices.html");
    const s = await n.t.evaluate(() => ({ h1: document.querySelector("main h1")?.textContent, rows: [...document.querySelectorAll("#offices-table tbody tr")].map((r) => [...r.cells].map((c) => c.innerText.replace(/\s+/g, " ").trim())),
      add: Boolean([...document.querySelectorAll("main button")].find((b) => b.textContent.includes("Add branch"))), selects: document.querySelectorAll("#office-people select").length,
      privacy: [...document.querySelectorAll(".ds-privacy")].map((p) => p.textContent).includes("Your location is read only when you check in or out, never in the background."), at: location.pathname }));
    const admin = who === "admin";
    check(`O1.${who}`, `${who}: opens Offices; the head office (Haryana, 150 m, 9 people, sample location marked); ${admin ? "Add branch, Edit and the office pickers" : "no Add, Edit or pickers"}; the privacy line`,
      s.at === "/pages/company/offices.html" && s.h1 === "Offices" && s.rows.length === 1 && s.rows[0].slice(0, 7).join(" | ") === "Head office Sample location | Head office | Haryana | Sector 44, Gurugram, Haryana 122003 | 150 m | 9 | Active"
      && s.add === admin && (s.selects > 0) === admin && (s.rows[0].length === 8) === admin && s.privacy, j(s));
    await n.ctx.close();
  }
  {
    const n = await open(N, "admin", "company/offices.html", { geo: { latitude: 18.5913, longitude: 73.7389, accuracy: 25 } });
    n.isNew = true;
    await n.t.click('main button:has-text("Add branch")'); await settle(n.t, 300);
    await n.t.fill("#office-name", "Pune branch"); await n.t.fill("#office-address", "Hinjewadi Phase 1, Pune 411057");
    await n.t.click('#office-modal button:has-text("Use this device")'); await settle(n.t, 600);
    const pos = await n.t.evaluate(() => [document.getElementById("office-lat").value, document.getElementById("office-lng").value, document.querySelector("#office-modal [role='status']")?.textContent, [...document.querySelectorAll("#office-modal .ds-privacy")].map((p) => p.textContent)]);
    check("O2", "this device's location fills latitude and longitude, says how accurate, and the privacy line is beside it", pos[0] === "18.5913" && pos[1] === "73.7389" && pos[2] === "Location read (to within 25 m)." && pos[3].includes(PRIVACY), j(pos));
    await n.t.click('button[form="office-form"]'); await settle(n.t, 250);
    const err = await n.t.evaluate(() => document.querySelector("#office-state-error")?.textContent);
    check("O3", "no state chosen: refused at the field in the store's words", err === "Choose the office's state or union territory.", err);
    await n.t.selectOption("#office-state", "Maharashtra"); await n.t.fill("#office-radius", "300"); await n.t.click('button[form="office-form"]'); await settle(n.t, 350);
    const added = await n.t.evaluate(() => [...document.querySelectorAll("#offices-table tbody tr")].map((r) => r.cells[0].innerText.replace(/\s+/g, " ").trim() + " | " + r.cells[2].innerText + " | " + r.cells[4].innerText));
    check("O4", "added: Pune branch, Maharashtra, 300 m (toast)", j(added) === j(["Head office Sample location | Haryana | 150 m", "Pune branch | Maharashtra | 300 m"]) && (await toasts(n.t)).at(-1) === "Pune branch added.", j([added, await toasts(n.t)]));
    await n.t.selectOption('#office-people select[aria-label="Office for Arjun Kapoor"]', { label: "Pune branch" }); await settle(n.t, 300);
    const moved = [(await toasts(n.t)).at(-1), await n.t.evaluate(() => [...document.querySelectorAll("#offices-table tbody tr")].map((r) => r.cells[5].innerText))];
    check("O5", "Arjun moved to Pune from Who works where: toast, the people counts follow (8 and 1)", moved[0] === "Arjun Kapoor now works from Pune branch." && j(moved[1]) === j(["8", "1"]), j(moved));
    await n.t.click('main button[aria-label="Deactivate Pune branch"]');
    const q = await asked(n, true);
    await settle(n.t, 300);
    const after = await n.t.evaluate(() => [...document.querySelectorAll("#offices-table tbody tr")].map((r) => r.cells[6].innerText + "/" + r.cells[5].innerText));
    check("O6", "deactivating Pune asks first, naming who works there; then inactive and Arjun back on the head office", q === "Deactivate Pune branch?\n1 person works there; they'll check in at the head office until it's active again or they're moved." && j(after) === j(["Active/9", "Inactive/0"]), j([q, after]));
    await n.ctx.close();
  }
  {
    const n = await open(N, "admin", "company/offices.html");
    await n.t.context().clearPermissions();
    await n.t.click('main button[aria-label="Edit Head office"]'); await settle(n.t, 300);
    const sample = await n.t.evaluate(() => document.querySelector("#office-modal .ds-note")?.textContent);
    await n.t.click('#office-modal button:has-text("Use this device")'); await settle(n.t, 800);
    const denied = await n.t.evaluate(() => document.querySelector("#office-modal [role='status']")?.textContent);
    check("O7", "editing the head office says its coordinates are a sample; a denied location says what to do instead", sample === "Sample coordinates: set the real location." && /denied|couldn't be read/.test(denied ?? ""), j([sample, denied]));
    await n.t.fill("#office-lat", "28.4595"); await n.t.fill("#office-lng", "77.0266"); await n.t.click('button[form="office-form"]'); await settle(n.t, 350);
    const row = await n.t.evaluate(() => document.querySelector("#offices-table tbody tr").cells[0].innerText.replace(/\s+/g, " ").trim());
    check("O8", "setting the real position clears the sample mark", row === "Head office", row);
    await n.ctx.close();
  }
}

// ---------- C: company profile (new) ----------
if (ONLY.includes("C")) {
  console.log("\n--- C. Settings: Company profile (new) ---");
  const n = await open(N, "admin", "system/settings.html");
  const start = await n.t.evaluate(() => [document.getElementById("cp-name").value, document.getElementById("cp-overview").value, document.getElementById("cp-mission").value, document.getElementById("cp-name").disabled]);
  check("C1", "Admin: the profile's name, empty overview and mission, editable", j(start) === j([COMPANY, "", "", false]), j(start));
  await n.t.fill("#cp-name", " "); await n.t.click('#company-profile button[type="submit"]'); await settle(n.t, 250);
  const e1 = await n.t.evaluate(() => document.getElementById("cp-name-error")?.textContent);
  await n.t.fill("#cp-name", "Contoso Ltd."); await n.t.fill("#cp-overview", "x".repeat(1001)); await n.t.click('#company-profile button[type="submit"]'); await settle(n.t, 250);
  const e2 = await n.t.evaluate(() => document.getElementById("cp-overview-error")?.textContent);
  check("C2", "the store's checks at their fields: no name, an overview of 1,001 characters", e1 === "Enter the company name." && e2 === "The overview can be at most 1000 characters (it has 1001).", j([e1, e2]));
  await n.t.fill("#cp-overview", "We build calm software for busy offices."); await n.t.fill("#cp-mission", "Make office work simple."); await n.t.click('#company-profile button[type="submit"]'); await settle(n.t, 350);
  const saved = await n.t.evaluate(() => [document.querySelector(".toast:last-child .toast__text")?.textContent, document.querySelector(".sidebar__brand")?.textContent.trim(), document.title]);
  check("C3", "saved: toast; the shell's brand and the tab title follow at once", saved[0] === "Company profile saved." && saved[1].endsWith("Contoso Ltd.") && saved[2].endsWith("| Contoso Ltd."), j(saved));
  await n.t.goto(N + "/pages/company/about.html"); await settle(n.t, 400);
  const about = await n.t.evaluate(() => [document.querySelector("#about-overview .ds-card__body")?.innerText.trim(), document.querySelector("#about-mission .ds-card__body")?.innerText.trim(), document.querySelector(".ds-page-header__subtitle")?.textContent]);
  check("C4", "About shows the overview, mission and new name", j(about) === j(["We build calm software for busy offices.", "Make office work simple.", "Contoso Ltd."]), j(about));
  await n.t.goto(N + "/pages/auth/login.html"); await settle(n.t, 400);
  const foot = await n.t.evaluate(() => document.querySelector(".app-footer")?.textContent);
  check("C5", "the sign-in page's footer names the saved company", foot === "© 2026 Contoso Ltd. · Powered by OfficeOS", foot);
  await n.ctx.close();
  const h = await open(N, "hr", "system/settings.html");
  // Settings needs settings:edit (Admin only, unchanged), so HR never reaches the section; everyone reads the profile on About
  check("C6", "HR opening Settings gets the 403 page (Settings is Admin-only, as before)", h.at() === "/pages/errors/403.html", h.at());
  await h.ctx.close();
}

// ---------- A: about ----------
if (ONLY.includes("A")) {
  console.log("\n--- A. About ---");
  const n = await open(N, "emp", "company/about.html");
  const a = await n.t.evaluate(() => ({ overview: document.querySelector("#about-overview .ds-card__body")?.innerText.trim(), mission: document.querySelector("#about-mission .ds-card__body")?.innerText.trim(),
    offices: [...document.querySelectorAll("#about-offices li")].map((l) => l.innerText.replace(/\s+/g, " ").trim()), kpis: [...document.querySelectorAll("[data-kpi] .ds-kpi__value")].map((v) => v.textContent),
    link: document.querySelector('#about-offices a')?.getAttribute("href") }));
  check("A1", "an employee: Not added yet. (nothing saved), the head office with type, state and address, counts 9 / 6 / 1, a link to Offices",
    a.overview === "Not added yet." && a.mission === "Not added yet." && j(a.offices) === j(["Head office Head office Haryana · Sector 44, Gurugram, Haryana 122003"]) && j(a.kpis) === j(["9", "6", "1"]) && a.link === "/pages/company/offices.html", j(a));
  await n.ctx.close();
}

// ---------- X: footer ----------
if (ONLY.includes("X")) {
  console.log("\n--- X. Sign-in and error pages: the footer ---");
  for (const [who, page] of [["out", "auth/login.html"], ["out", "auth/forgot-password.html"], ["out", "auth/reset-password.html"], ["out", "auth/two-factor.html"], ["out", "errors/403.html"], ["admin", "errors/404.html"], ["out", "errors/500.html"]]) {
    const n = await open(N, who, page);
    const s = await n.t.evaluate(() => { const f = document.querySelector(".app-footer"), m = document.querySelector("main"); return [f?.textContent, Boolean(m && f && m.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING), Boolean(document.querySelector(".auth__copy")), /© 2026 OfficeOS/.test(document.body.innerText)]; });
    check(`X.${page}`, `${page}: "© 2026 ${COMPANY} · Powered by OfficeOS" after the page, the panel's old line gone`, j(s) === j([`© 2026 ${COMPANY} · Powered by OfficeOS`, true, false, false]), j(s));
    await n.ctx.close();
  }
}

// ---------- K: keyboard ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard ---");
  const n = await open(N, "admin", "users/users-list.html");
  await n.t.focus('main input[type="search"]');
  const order = [];
  for (let i = 0; i < 3; i++) { await n.t.keyboard.press("Tab"); order.push(await n.t.evaluate(() => document.activeElement.labels?.[0]?.textContent ?? document.activeElement.textContent.trim())); }
  await n.t.fill('main input[type="search"]', "ka"); await n.t.keyboard.press("Tab"); await n.t.keyboard.press("Tab"); await n.t.keyboard.press("Tab");
  const clear = await n.t.evaluate(() => document.activeElement.textContent.trim());
  await n.t.keyboard.press("Enter"); await settle(n.t, 150);
  const cleared = await n.t.evaluate(() => document.querySelector('main input[type="search"]').value);
  check("K1", "users list: search, Department, Role, then the table (Clear All is off and skipped while nothing is set); with a search typed, Tab reaches Clear All and Enter clears", j(order) === j(["Department", "Role", "Aarav Mehta"]) && clear === "Clear All" && cleared === "", j([order, clear, cleared]));
  await n.t.focus('main [role="tab"][data-status="inactive"]'); await n.t.keyboard.press("Enter"); await settle(n.t, 150);
  const rows = await n.t.evaluate(() => document.querySelectorAll("main table tbody tr").length);
  check("K2", "a status tab works from the keyboard (Inactive: 1 row)", rows === 1, rows);
  await n.ctx.close();
  const o = await open(N, "admin", "company/offices.html");
  await o.t.click('main button:has-text("Add branch")'); await settle(o.t, 300);
  const focused = await o.t.evaluate(() => document.activeElement.id);
  await o.t.keyboard.press("Escape"); await settle(o.t, 300);
  const closed = await o.t.evaluate(() => !document.querySelector("#office-modal.is-open"));
  check("K3", "the offices dialog opens on its first field and Esc closes it", focused === "office-name" && closed, j([focused, closed]));
  await o.ctx.close();
}

// ---------- W: widths and themes ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. 412 and 1280, light and dark ---");
  for (const page of ["users/users-list.html", "users/user-form.html?id=EMP-1105", "users/user-profile.html?id=EMP-1042", "users/departments.html", "company/offices.html", "system/settings.html", "company/about.html", "auth/login.html"])
    for (const width of [1280, 412]) for (const theme of ["light", "dark"]) {
      const n = await open(N, page.startsWith("auth/") ? "out" : "admin", page, { width, theme });
      const ok = await n.t.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      check(`W.${page.split("?")[0]}.${width}.${theme}`, `${page} at ${width}, ${theme}: no sideways scroll`, ok);
      await n.t.screenshot({ path: path.join(SHOTS, `${page.replace(/[\/?=.]/g, "_")}-${width}-${theme}.png`), fullPage: true, animations: "disabled" });
      await n.ctx.close();
    }
}

check("E", "no page or console errors on the new side", !newErrs.length, j(newErrs));
await browser.close();
console.log(`\nusers: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
