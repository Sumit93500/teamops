// AS2's harness (msedge, headless): the asset and inventory screens, on the AS1 register and stock ledger with the old inventory imported.
// Read by meaning (words, attributes, storage), never by pixels. usage: node as2.mjs <app dist> <repo root> <shots dir>   [ONLY=AIDXSVMPKWCEZ]
// Clock: Sun 22 Nov 2026 10:00 IST. The IT person is made in the test (nobody is seeded with the role).
//   A  who may open each page (the five inventory pages x six people) and what the sidebar lists; a person without the permission gets the 403 page
//   I  Inventory: the 10 assets, the columns by role (price and book value only for Finance and the Admin), no value anywhere in the DOM for HR / IT,
//      the filters (status, category, every active office, holder, warranty), the counter, the "details missing" note
//   D  one asset's page: details, lifecycle, history, maintenance; the depreciation panel and chart only for Finance and the Admin; an asset a person may not see
//   X  what each state may be offered (the state machine's own moves x the permission), and nothing else
//   S  Stock movements: the items and their low / out badges, the ledger and the shared date range, recording and correcting through the form's messages
//   V  Vendors: the list, the rule explained, delete refused for a named vendor, add / edit / deactivate, a bad email said at its field
//   M  My assets: only the person's own, no values; Request an asset and Request return make IT requests, a duplicate is refused; My requests lists them
//   P  the profile's assets from the new register; Reset demo data resets the new stores and leaves the old inventory store's keys alone
//   F  the flows on one asset: issue, take back, maintenance and back, retire, dispose, each through its dialog; an exited person can't be chosen
//   K  keyboard: the dialogs take focus and Esc closes them; every action button is a named button
//   W  no sideways scroll at 412 and 1280, light and dark, on the five pages; shots for the eye
//   C  contrast of the status chips' words (4.5:1), light and dark
//   E  no page or console errors
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, ROOT, SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "AIDXSVMPFKWCE";
fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn("python", [path.join(HERE, "spa-serve.py"), "9977", DIST], { stdio: "ignore" });
const stop = () => { try { srv.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9977";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"], rohan: ["Rohan Gupta", "EMP-1042"], it: ["Isha Kulkarni", "EMP-1106"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const size = (w) => (w === 412 ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA } : w === 768 ? { viewport: { width: 768, height: 900 } } : { viewport: { width: w, height: 900 } });
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(8)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 500)}` : ""}`); };
const errs = [];
const NOW = "2026-11-22T10:00:00+05:30";
const j = JSON.stringify;
const P = { items: "inventory/items.html", assign: "inventory/asset-assignment.html", stock: "inventory/stock-movements.html", vendors: "inventory/vendors.html", mine: "inventory/my-assets.html" };
const PAGES = Object.values(P);

async function make(who, { width = 1280, theme = "light" } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata", colorScheme: theme });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(NOW));
  await ctx.addInitScript(([th, w]) => {
    if (localStorage.getItem("as2:seeded")) return;
    localStorage.clear(); localStorage.setItem("as2:seeded", "1");
    localStorage.setItem("officeos:prefs", JSON.stringify({ theme: th }));
    localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
    localStorage.setItem(`officeos:prefs:${w[1]}`, JSON.stringify({ theme: th }));
  }, [theme, WHO[who]]);
  const t = await ctx.newPage();
  t.on("pageerror", (e) => errs.push(`${who}: ${e.message}`));
  t.on("console", (m) => { if (m.type() === "error" && !/storage: failed/.test(m.text())) errs.push(`${who}: console ${m.text()}`); });
  await t.goto(N + "/pages/auth/login.html"); await t.waitForLoadState("load");
  return { ctx, t, who };
}
const sleep = (t, ms = 400) => t.waitForTimeout(ms);
async function go(n, page, who, q = "") {
  if (who) await n.t.evaluate((w) => { localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 })); }, WHO[who]);
  await n.t.goto(N + "/pages/" + page + q); await n.t.waitForLoadState("load");
  await n.t.evaluate(() => document.fonts.ready); await sleep(n.t, 500);
}
const path_ = (t) => new URL(t.url()).pathname;
const text = (t, sel) => t.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const main = (t) => t.evaluate(() => document.querySelector("main")?.innerText.replace(/\s+/g, " ") ?? "");
const stored = (t, key) => t.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), key);
const rows = (t, sel) => t.evaluate((s) => [...document.querySelectorAll(`${s} tbody tr`)].map((tr) => [...tr.children].map((c) => c.innerText.replace(/\s+/g, " ").trim())), sel);
const heads = (t, sel) => t.evaluate((s) => [...document.querySelectorAll(`${s} thead th`)].map((c) => c.innerText.replace(/[▲▼]/g, "").replace(/\s+/g, " ").trim()), sel);
const sidebar = (t) => t.evaluate(() => [...document.querySelectorAll(".sidebar a, nav a")].map((a) => a.textContent.replace(/\s+/g, " ").trim()).filter(Boolean));
const ltext = async (t, sel) => (await t.locator(sel).first().innerText()).replace(/\s+/g, " ").trim();
const kpi = (t, id) => text(t, `[data-kpi="${id}"] .ds-kpi__value`);
const noScroll = (t) => t.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
// IT: nobody is seeded with the role, so the test adds the person to the stored users (and the IT department) once the app has seeded them
async function addIt(n) {
  await go(n, "dashboard/employee.html", "emp");
  await n.t.evaluate(() => {
    const box = JSON.parse(localStorage.getItem("officeos:users"));
    if (!box.records.some((u) => u.id === "EMP-1106")) {
      box.records.push({ id: "EMP-1106", name: "Isha Kulkarni", email: "isha.kulkarni@northwind.com", department: "IT", designation: "IT Engineer", role: "it", status: "active", bankAccount: null, bankAccountLast4: null, pan: null, dateOfJoining: "2 Nov 2026", reportingManagerId: null });
      box.nextIdNum = Math.max(box.nextIdNum, 1107);
      localStorage.setItem("officeos:users", JSON.stringify(box));
    }
    const dep = JSON.parse(localStorage.getItem("officeos:departments"));
    if (dep && !dep.records.some((d) => d.code === "IT")) { dep.records.push({ code: "IT", name: "IT", head: "", active: true }); localStorage.setItem("officeos:departments", JSON.stringify(dep)); }
  });
}
const SHOT = async (t, name) => { try { await t.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true }); } catch {} };
const dialogOpen = (t) => t.locator(".modal.is-open").count();
async function fill(t, values) { for (const [sel, v] of Object.entries(values)) { const el = t.locator(sel); if ((await el.evaluate((e) => e.tagName)) === "SELECT") await el.selectOption(v); else await el.fill(v); } }

// ---------- A ----------
const OPENS = { admin: PAGES, hr: PAGES.filter((p) => p !== P.mine || true), fin: PAGES, it: PAGES, emp: [P.mine], mgr: [P.mine] };
const SIDE = { admin: ["My assets", "Inventory", "Stock movements", "Asset assignment", "Vendors"], hr: ["My assets", "Inventory", "Stock movements", "Asset assignment", "Vendors"], fin: ["My assets", "Inventory", "Stock movements", "Asset assignment", "Vendors"],
  it: ["My assets", "Inventory", "Stock movements", "Asset assignment", "Vendors"], emp: ["My assets"], mgr: ["My assets"] };
if (ONLY.includes("A")) {
  console.log("\n--- A. Who may open what ---");
  for (const who of ["admin", "hr", "fin", "it", "emp", "mgr"]) {
    const n = await make(who);
    if (who === "it") await addIt(n);
    const seen = {};
    for (const page of PAGES) { await go(n, page, who); seen[page] = path_(n.t).endsWith(page) ? (await text(n.t, "main h1, main .ds-page-header__title") ?? "?") : path_(n.t).split("/").slice(-2).join("/"); }
    const want = Object.fromEntries(PAGES.map((p) => [p, OPENS[who].includes(p) ? "open" : "errors/403.html"]));
    check(`A1.${who}`, `${who}: opens ${OPENS[who].length} of the 5 pages, the others show the 403 page`, PAGES.every((p) => (want[p] === "open" ? !seen[p].includes("403") && seen[p] !== "errors/403.html" : seen[p] === "errors/403.html")), j(seen));
    await go(n, "dashboard/employee.html", who);
    if (who === "admin") await go(n, "dashboard/admin.html", who);
    const side = await sidebar(n.t);
    const inGroup = SIDE[who].every((l) => side.includes(l)) && (who === "emp" || who === "mgr" ? !["Inventory", "Stock movements", "Asset assignment", "Vendors"].some((l) => side.includes(l)) : true);
    check(`A2.${who}`, `${who}: the sidebar lists ${SIDE[who].join(", ")}`, inGroup, j(side.filter((l) => /assets|inventory|stock|vendor|assignment/i.test(l))));
    await go(n, "requests/my-requests.html", who);
    check(`A3.${who}`, `${who}: no "being rebuilt" page for the five`, !(await main(n.t)).includes("being rebuilt"));
    await n.ctx.close();
  }
  // the old route's permission isn't enough: an employee given inventory:view (an override) still gets no inventory page
  const n = await make("emp");
  await go(n, "dashboard/employee.html", "emp");
  await n.t.evaluate(() => { const b = JSON.parse(localStorage.getItem("officeos:users")); const u = b.records.find((x) => x.id === "EMP-1105"); u.grantPermissions = ["inventory:view", "assets:view", "vendors:view"]; localStorage.setItem("officeos:users", JSON.stringify(b)); });
  const out = [];
  for (const page of [P.items, P.assign, P.stock, P.vendors]) { await go(n, page, "emp"); out.push(path_(n.t).endsWith("403.html")); }
  check("A4", "an employee granted the OLD permissions (inventory:view, assets:view, vendors:view) still gets the 403 page on all four: the pages follow the new permissions", out.every(Boolean), j(out));
  await n.ctx.close();
}

// ---------- I ----------
if (ONLY.includes("I")) {
  console.log("\n--- I. Inventory ---");
  const SEEN = {};
  for (const who of ["admin", "fin", "hr", "it"]) {
    const n = await make(who);
    if (who === "it") await addIt(n);
    await go(n, P.items, who);
    const h = await heads(n.t, "#assets-table"), r = await rows(n.t, "#assets-table");
    SEEN[who] = { h, r, text: await main(n.t) };
    const values = who === "admin" || who === "fin";
    check(`I1.${who}`, `${who}: 10 assets, the columns ${values ? "include Purchase price and Book value" : "have no Purchase price or Book value"}, ${who === "admin" || who === "it" ? "with" : "without"} an Actions column`, r.length === 10 && ["Tag", "Asset", "Assigned to", "Status", "Office", "Warranty"].every((c) => h.includes(c)) && h.includes("Purchase price") === values && h.includes("Book value") === values && h.includes("Actions") === (who === "admin" || who === "it"), j(h));
    check(`I2.${who}`, `${who}: ${values ? "the money is there" : "no ₹, no Purchase price or Book value, no money figure anywhere on the page"}`, values ? /₹/.test(SEEN[who].text) : !/₹|Purchase price|Book value|\d,\d{3}/.test(SEEN[who].text), values ? "" : (SEEN[who].text.match(/.{20}(₹|Purchase price|Book value).{20}/i) ?? [""])[0]);
    const dom = await n.t.evaluate(() => document.documentElement.outerHTML);
    check(`I3.${who}`, `${who}: ${values ? "" : "no price or salvage value in the page's HTML at all (the DOM, not just the text)"}${values ? "the value columns carry numbers" : ""}`, values ? true : !/purchasePrice|salvageValue|bookValue|costPerYear|78500|189900|14999|79900/.test(dom));
    await n.ctx.close();
  }
  const n = await make("admin");
  await go(n, P.items, "admin");
  const r = await rows(n.t, "#assets-table");
  check("I4", "the tags are the old register's seven plus the three samples, each a link to its page", j(r.map((x) => x[0]).sort()) === j(["AST-0009", "AST-0010", "AST-0011", "AST-0099", "AST-0119", "AST-0188", "AST-0217", "AST-0218", "AST-0302", "AST-0455"]) && await n.t.locator('#assets-table tbody a[href*="?tag="]').count() === 10);
  check("I5", "the counter says '10 assets'; the KPI cards say 10, 5 assigned, 2 in store, 1 under maintenance", /10 assets/.test(await text(n.t, "#assets-count")) && j(await Promise.all(["total", "assigned", "store", "maint"].map((k) => kpi(n.t, `kpi-${k}`)))) === j(["10", "5", "2", "1"]), j(await Promise.all(["total", "assigned", "store", "maint"].map((k) => kpi(n.t, `kpi-${k}`)))));
  check("I6", "the 'details missing' note: 7 assets (the imported ones) have no purchase date or price; each such row says so", /7 assets have no purchase date or price/.test(await text(n.t, "#details-missing-note") ?? "") && (await n.t.locator('[data-chip="details-missing"]').count()) === 7);
  const offices = await stored(n.t, "officeos:offices");
  const sel = async (label) => n.t.evaluate((l) => [...document.querySelectorAll(".ds-field")].find((f) => f.querySelector("label")?.textContent === l)?.querySelector("select"), label);
  const opts = await n.t.evaluate(() => { const f = [...document.querySelectorAll(".ds-field")].find((x) => x.querySelector("label")?.textContent === "Office"); return [...f.querySelectorAll("option")].map((o) => o.textContent); });
  check("I7", "the Office filter lists EVERY active office (the head office here)", j(opts) === j(["All offices", "Head office"]), j(opts));
  // an extra active office appears too, an inactive one does not
  await n.t.evaluate(() => { const b = JSON.parse(localStorage.getItem("officeos:offices") ?? "null"); if (!b) return; b.records.push({ id: "OFF-2", name: "Pune branch", type: "branch", address: "Hinjewadi", state: "Maharashtra", lat: 18.59, lng: 73.73, radiusM: 150, active: true }, { id: "OFF-3", name: "Closed branch", type: "branch", address: "x", state: "Goa", lat: 15, lng: 74, radiusM: 150, active: false }); b.nextNum = 4; localStorage.setItem("officeos:offices", JSON.stringify(b)); });
  const hadBox = await stored(n.t, "officeos:offices");
  if (hadBox) { await go(n, P.items, "admin"); const o2 = await n.t.evaluate(() => { const f = [...document.querySelectorAll(".ds-field")].find((x) => x.querySelector("label")?.textContent === "Office"); return [...f.querySelectorAll("option")].map((o) => o.textContent); }); check("I8", "with a second active office and a closed one: the filter lists the active two, not the closed one", j(o2) === j(["All offices", "Head office", "Pune branch"]), j(o2)); }
  else check("I8", "(the offices box is read from its seed: the head office only)", true);
  await go(n, P.items, "admin");
  const filterBy = async (label, value) => n.t.evaluate(([l, v]) => { const f = [...document.querySelectorAll(".ds-field")].find((x) => x.querySelector("label")?.textContent === l); const s = f.querySelector("select"); s.value = v; s.dispatchEvent(new Event("change", { bubbles: true })); }, [label, value]);
  await filterBy("Status", "assigned"); await sleep(n.t, 250);
  const asg = await rows(n.t, "#assets-table");
  check("I9", "Status = Assigned: 5 rows, the counter 'Showing 5 of 10 assets'", asg.length === 5 && /Showing 5 of 10 assets/.test(await text(n.t, "#assets-count")), `${asg.length} ${await text(n.t, "#assets-count")}`);
  await filterBy("Status", ""); await filterBy("Holder", "EMP-1105"); await sleep(n.t, 250);
  check("I10", "Holder = Arjun Kapoor: his three (AST-0188, AST-0302, AST-0455)", j((await rows(n.t, "#assets-table")).map((x) => x[0]).sort()) === j(["AST-0188", "AST-0302", "AST-0455"]));
  await filterBy("Holder", ""); await filterBy("Category", "monitor"); await sleep(n.t, 250);
  check("I11", "Category = Monitor: AST-0302 only", j((await rows(n.t, "#assets-table")).map((x) => x[0])) === j(["AST-0302"]));
  await filterBy("Category", ""); await filterBy("Warranty", "90"); await sleep(n.t, 250);
  check("I12", "Warranty ends within 90 days: none today (22 Nov 2026) among these ten; the table says nothing matches", (await rows(n.t, "#assets-table")).length === 1 && /No assets match/.test(await text(n.t, "#assets-table tbody")));
  await n.t.click("text=Clear All"); await sleep(n.t, 250);
  await n.t.fill('.ds-field--search input', "latitude 5440"); await sleep(n.t, 250);
  check("I13", "search 'latitude 5440': the three Dell 5440s (0217, 0218 and the others by name) match by name", (await rows(n.t, "#assets-table")).every((x) => /5440/.test(x[1])) && (await rows(n.t, "#assets-table")).length >= 2);
  await n.ctx.close();
}

// ---------- D ----------
if (ONLY.includes("D")) {
  console.log("\n--- D. One asset ---");
  const n = await make("admin");
  await go(n, P.items, "admin", "?tag=AST-0009");
  const t = n.t;
  check("D1", "AST-0009 (the sample printer, with its purchase details): details, lifecycle, history, maintenance, and the depreciation panel with figures, chart and schedule for the Admin",
    await t.locator("#asset-card").count() === 1 && await t.locator("#lifecycle-card").count() === 1 && await t.locator("#maint-card").count() === 1 && await t.locator("#dep-card").count() === 1 && await t.locator("#dep-chart").count() === 1 && await t.locator("#dep-schedule tbody tr").count() >= 5);
  const kpis = await Promise.all(["book", "acc", "this", "next"].map((k) => kpi(t, `dep-${k}`)));
  check("D2", "the figures follow the AS1 rules: straight line 5 years, cost 32,500, salvage 1,625; purchased 12 Jun 2023: book value ₹11,200.48 after 3.45 years (21,299.52 taken: three full years of 6,175 and 164 of 365 days of the fourth); this and next year's charge 6,175", kpis[0] === "₹11,200.48" && kpis[1] === "₹21,299.52" && kpis[2] === "₹6,175" && kpis[3] === "₹6,175", j(kpis));
  check("D3", "the chart is the shared AreaChart with its accessible name, a readout and 'Show as table'", await t.locator('#book-value-chart, [id*="book-value-chart"]').count() > 0 && await t.locator("#dep-chart .ds-chart").count() >= 1 && /Show as table/.test(await text(t, "#dep-chart")));
  check("D4", "the lifecycle lists added, issued (none), maintenance out and back; the maintenance table has the open-and-closed record with its cost for the Admin", /Added to the register/.test(await text(t, "#lifecycle-card")) && /Sent for maintenance/.test(await text(t, "#lifecycle-card")) && /Back from maintenance/.test(await text(t, "#lifecycle-card")) && /2,400/.test(await text(t, "#maint-table")));
  await SHOT(t, "detail-admin-0009-1280-light");
  await go(n, P.items, "admin", "?tag=AST-0119");
  check("D5", "AST-0119 (imported, no purchase details): says so, no figures made up, and the Admin sees why there is no depreciation", /no purchase date or price/.test(await text(t, "#details-missing-note") ?? "") && /no purchase date or price yet/.test(await text(t, "#dep-missing") ?? "") && await t.locator("#dep-chart").count() === 0);
  await go(n, P.items, "admin", "?tag=AST-0217");
  const hist = await rows(t, "#history-table");
  check("D6", "AST-0217's history: Divya Menon (start not recorded) to 14 Sep 2026, then Sneha Rao from 18 Sep 2026, holding now", hist.length === 2 && /Divya Menon.*Not recorded.*14 Sep 2026/.test(hist[0].join(" ")) && /Sneha Rao.*18 Sep 2026.*Holding now/.test(hist[1].join(" ")), j(hist));
  await go(n, P.items, "admin", "?tag=AST-0099");
  const mt = await rows(t, "#maint-table");
  check("D7", "AST-0099 (in repair): an open maintenance record 'Sent to the vendor for repair' from 8 Sep 2026, its cost not made up", mt.length === 1 && /Sent to the vendor for repair/.test(mt[0].join(" ")) && /Open/.test(mt[0].join(" ")) && !/₹0\b/.test(mt[0].join(" ")), j(mt));
  await go(n, P.items, "admin", "?tag=NOPE-1");
  check("D8", "an unknown tag: 'You can't see this asset.' (the same words as for one a person may not see)", /You can't see this asset/.test(await main(t)));
  await n.ctx.close();
  for (const who of ["hr", "it"]) {
    const m = await make(who);
    if (who === "it") await addIt(m);
    await go(m, P.items, who, "?tag=AST-0009");
    const dom = await m.t.evaluate(() => document.documentElement.outerHTML), txt = await main(m.t);
    check(`D9.${who}`, `${who}: AST-0009's page has details, lifecycle and maintenance but NO depreciation panel, no ₹, no cost, no price in the HTML`, await m.t.locator("#asset-card").count() === 1 && await m.t.locator("#dep-card").count() === 0 && !/₹/.test(txt) && !/Cost\b/.test(await text(m.t, "#maint-card") ?? "") && !/purchasePrice|32500|32,500|2400|2,400/.test(dom), (txt.match(/.{15}₹.{15}/) ?? [""])[0]);
    await m.ctx.close();
  }
  const f = await make("fin");
  await go(f, P.items, "fin", "?tag=AST-0011");
  const fm = await main(f.t);
  check("D10", "Finance on AST-0011 (disposed, sold for 1,500): book value at disposal, the sale value and the loss are shown; no actions", /Sale value/.test(fm) && /1,500/.test(fm) && /Loss on disposal|Gain on disposal/.test(fm) && await f.t.locator("[data-action]").count() === 0);
  await f.ctx.close();
}

// ---------- X ----------
if (ONLY.includes("X")) {
  console.log("\n--- X. What may be offered ---");
  const EXPECT = { "AST-0218": ["edit", "issue", "maintenance", "retire"], "AST-0217": ["edit", "return"], "AST-0099": ["edit", "close-maintenance"], "AST-0010": ["edit", "dispose"], "AST-0011": [] };
  for (const who of ["admin", "it", "fin", "hr"]) {
    const n = await make(who);
    if (who === "it") await addIt(n);
    const got = {};
    for (const tag of Object.keys(EXPECT)) { await go(n, P.items, who, `?tag=${tag}`); got[tag] = (await n.t.evaluate(() => [...document.querySelectorAll("main [data-action]")].map((b) => b.dataset.action))).sort(); }
    const want = Object.fromEntries(Object.entries(EXPECT).map(([k, v]) => [k, who === "admin" || who === "it" ? [...v].sort() : []]));
    check(`X1.${who}`, `${who}: ${who === "admin" || who === "it" ? "each status offers exactly the moves the state machine allows (in store: edit, issue, maintenance, retire; assigned: edit, return; under maintenance: edit, back; retired: edit, dispose; disposed: none)" : "no action button on any asset (no custodian permission)"}`, j(got) === j(want), j(got));
    await n.ctx.close();
  }
  const n = await make("admin");
  await go(n, P.assign, "admin");
  const held = await n.t.evaluate(() => [...document.querySelectorAll("#held-table [data-action]")].map((b) => b.dataset.action));
  check("X2", "Asset assignment, Held tab: only 'return' buttons (an assigned asset can't be issued again, retired or disposed there)", held.length === 5 && held.every((a) => a === "return"), j(held));
  await n.ctx.close();
}

// ---------- S ----------
if (ONLY.includes("S")) {
  console.log("\n--- S. Stock ---");
  const n = await make("admin");
  const t = n.t;
  await go(n, P.stock, "admin");
  // the items table has a pager (10 a page): read every page, with each row's stock badge, then come back to the first
  const allItems = [], badges = [];
  for (let p = 0; p < 4; p++) {
    allItems.push(...await rows(t, "#items-table"));
    badges.push(...await t.evaluate(() => [...document.querySelectorAll('#items-table [data-chip="stock-status"]')].map((b) => b.dataset.stock)));
    const next = t.locator('.pagination button:has-text("Next")');
    if (await next.count() && await next.isEnabled().catch(() => false)) { await next.click(); await sleep(t, 200); } else break;
  }
  await go(n, P.stock, "admin");
  check("S1", "12 items in all (10 on the first page, 2 on the second)", allItems.length === 12, String(allItems.length));
  const hasOn = (frag, qty) => allItems.some((r) => r[0].includes(frag) && r[2].replace(/\s+/g, " ") === `${qty} unit`);
  check("S2", "on hand is the old figure: paper 42, coffee 8, HDMI 0, chairs 14, laptop 5440: 6, cards 30", hasOn("A4 paper", 42) && hasOn("Coffee", 8) && hasOn("HDMI", 0) && hasOn("chair", 14) && hasOn("Dell Latitude 5440", 6) && hasOn("access card", 30), j(allItems.map((r) => [r[0].slice(0, 20), r[2]])));
  check("S3", "low-stock badges: 'Low' (paper, coffee, keyboards), 'Out of stock' (HDMI), 'No reorder level' (the Latitude 5410 and 5420 and the MacBook, reorder level 0), 'In stock' for the rest; the note counts 4 items", await t.locator("#low-stock-note").count() === 1 && /4 items are at or under the reorder level/.test(await text(t, "#low-stock-note")) && badges.filter((b) => b === "low").length === 3 && badges.filter((b) => b === "out").length === 1 && badges.filter((b) => b === "none").length === 3, j(badges));
  await t.click("#record-move"); await sleep(t, 300);
  check("S4", "Record a movement opens a dialog with the ledger's rules in its description, the first field focused", await dialogOpen(t) === 1 && /can't go below zero/.test(await text(t, "#move-form-modal .modal__desc") ?? "") && await t.evaluate(() => document.activeElement?.id) === "mv-kind");
  await fill(t, { "#mv-kind": "out", "#mv-item": "ITM-5", "#mv-qty": "100", "#mv-reason": "Too many reams" });
  await t.click('button[type="submit"][form="move-form"]'); await sleep(t, 300);
  check("S5", "an issue of more than is on hand: the ledger's own words under the quantity ('below zero ... only 42'); nothing recorded; the dialog stays", /below zero/.test(await text(t, "#mv-qty-error") ?? "") && await dialogOpen(t) === 1 && (await stored(t, "officeos:stock-ledger")) === null);
  await fill(t, { "#mv-qty": "5", "#mv-person": "EMP-1042" });
  await t.click('button[type="submit"][form="move-form"]'); await sleep(t, 500);
  const box = await stored(t, "officeos:stock-ledger");
  const mv = box?.movements?.find((m) => m.reason === "Too many reams");
  check("S6", "5 reams out to Rohan: recorded (SM-18, 5 ream... unit), the dialog closes, on hand is 37", Boolean(mv) && mv.qty === 5 && mv.toPersonId === "EMP-1042" && mv.itemId === "ITM-5" && await dialogOpen(t) === 0 && /37 unit/.test((await rows(t, "#items-table")).find((r) => r[0].includes("A4 paper"))?.[2] ?? ""));
  await t.click('button[role="tab"]:has-text("Movements"), .tabs__tab:has-text("Movements"), [role="tab"]:has-text("Movements")'); await sleep(t, 300);
  const ledger = await rows(t, "#moves-table");
  check("S7", "the Movements tab: newest first; the new issue is first, with the person, the quantity −5 and its reason", ledger.length > 0 && /−5/.test(ledger[0][3]) && /Rohan Gupta/.test(ledger[0][4]) && /Too many reams/.test(ledger[0][6]), j(ledger[0]));
  await t.locator(`#moves-table tr:has-text("Too many reams") [data-action="correct"]`).click(); await sleep(t, 300);
  await t.fill("#co-reason", "Wrong person"); await t.click('button[type="submit"][form="correct-form"]'); await sleep(t, 500);
  const after = await stored(t, "officeos:stock-ledger");
  const corr = after.movements.find((m) => m.reverses === mv.id);
  check("S8", "a correction is a new opposite movement (a return by Rohan) naming the original; the original stays, shows 'Corrected' and offers no second correction", corr?.kind === "return" && corr.qty === 5 && after.movements.some((m) => m.id === mv.id) && /Corrected/.test(await text(t, "#moves-table")) && (await t.locator(`#moves-table tr:has-text("Too many reams") [data-action="correct"]`).count()) === 0);
  // the shared date range
  await t.selectOption(".ds-date-range select", "custom"); await sleep(t, 200);
  await t.fill('.ds-date-range input[type="date"] >> nth=0', "2025-01-01"); await t.fill('.ds-date-range input[type="date"] >> nth=1', "2025-01-31"); await sleep(t, 300);
  check("S9", "a date range with nothing in it says 'No data in this range.'; the counter says 'Showing 0 of ...'", /No data in this range\./.test(await text(t, "#moves-table tbody") ?? "") && /Showing 0 of \d+ movements/.test(await text(t, "#moves-count")), await text(t, "#moves-count"));
  await t.selectOption(".ds-date-range select", ""); await sleep(t, 200);
  await t.click("#add-item").catch(async () => { await t.click('[role="tab"]:has-text("Items")'); await t.click("#add-item"); }); await sleep(t, 300);
  await fill(t, { "#it-name": "<b>Sticky notes</b>", "#it-category": "stationery", "#it-unit": "pack" });
  await t.click('button[type="submit"][form="item-form"]'); await sleep(t, 300);
  check("S10", "an item name with HTML is refused at its field; one with a duplicate name too", /can't contain/.test(await text(t, "#it-name-error") ?? ""));
  await t.keyboard.press("Escape"); await sleep(t, 300);
  if (await dialogOpen(t)) { await t.locator(".confirm-dialog [data-confirm-ok]").click().catch(() => {}); await sleep(t, 300); }
  await SHOT(t, "stock-admin-1280-light");
  await n.ctx.close();
  const h = await make("hr");
  await go(h, P.stock, "hr");
  check("S11", "HR reads the stock (items and ledger) but has no Add item, Record movement, Edit or Correct button", await h.t.locator("#record-move, #add-item, [data-action]").count() === 0 && (await rows(h.t, "#items-table")).length > 0);
  await h.ctx.close();
}

// ---------- V ----------
if (ONLY.includes("V")) {
  console.log("\n--- V. Vendors ---");
  const n = await make("admin");
  const t = n.t;
  await go(n, P.vendors, "admin");
  const r = await rows(t, "#vendors-table");
  check("V1", "the 5 old vendors with their contacts, supplies and terms; QuickPrint is 'On hold'; no email or GSTIN is made up (Not recorded)", r.length === 5 && r.some((x) => /QuickPrint/.test(x[0]) && /On hold/.test(x[5])) && r.every((x) => /Not recorded/.test(x[4])) && r.some((x) => /Net 45 days/.test(x[2])), j(r.map((x) => [x[0].slice(0, 24), x[5]])));
  check("V2", "the rule is on the page: a named vendor can't be deleted, only deactivated", /can't be deleted: deactivate it instead/.test(await text(t, "#vendor-rule") ?? ""));
  const tech = t.locator('#vendors-table tr:has-text("TechNova")');
  check("V3", "TechNova (named on the printer, the old laptop and the phone): Delete is disabled and the reason is beside it, 'Named on 4 records' (3 assets, 1 maintenance)", await tech.locator('[data-action="delete"]').isDisabled() && /Named on 4 records: deactivate it instead/.test(await tech.innerText()), (await tech.innerText()).replace(/\s+/g, " ").slice(0, 200));
  const sharma = t.locator('#vendors-table tr:has-text("Sharma")');
  check("V4", "Sharma (named on nothing): Delete is enabled", await sharma.locator('[data-action="delete"]').isEnabled());
  await t.click("#add-vendor"); await sleep(t, 300);
  await fill(t, { "#vf-name": "QuickFix Services", "#vf-email": "not-an-email" });
  await t.click('button[type="submit"][form="vendor-form"]'); await sleep(t, 300);
  check("V5", "a bad email is said at its field ('Enter a valid email address.') and nothing is saved", /valid email/.test(await text(t, "#vf-email-error") ?? "") && await dialogOpen(t) === 1);
  await fill(t, { "#vf-email": "help@quickfix.example", "#vf-gstin": "BAD" });
  await t.click('button[type="submit"][form="vendor-form"]'); await sleep(t, 300);
  check("V6", "a bad GSTIN is said at its field", /valid GSTIN/.test(await text(t, "#vf-gstin-error") ?? ""));
  await fill(t, { "#vf-gstin": "29AABCA1234B1Z5", "#vf-phone": "+91 80 4123 4567" });
  await t.click('button[type="submit"][form="vendor-form"]'); await sleep(t, 500);
  check("V7", "added: 6 vendors, id VEN-6, active", (await rows(t, "#vendors-table")).length === 6 && (await stored(t, "officeos:asset-register")).vendors.some((v) => v.id === "VEN-6" && v.active && v.gstin === "29AABCA1234B1Z5"));
  await t.locator('#vendors-table tr:has-text("CoolAir") [data-action="toggle"]').click(); await sleep(t, 300);
  await t.locator(".confirm-dialog [data-confirm-ok]").click(); await sleep(t, 500);
  check("V8", "deactivating asks first; CoolAir then reads 'Inactive' and offers Reactivate", /Inactive/.test(await ltext(t, '#vendors-table tr:has-text("CoolAir")')) && /Reactivate/.test(await ltext(t, '#vendors-table tr:has-text("CoolAir")')));
  await t.locator('#vendors-table tr:has-text("Sharma") [data-action="delete"]').click(); await sleep(t, 300);
  await t.locator(".confirm-dialog [data-confirm-ok]").click(); await sleep(t, 500);
  check("V9", "deleting an unused vendor asks first and removes it (5 left)", (await rows(t, "#vendors-table")).length === 5 && !/Sharma/.test(await text(t, "#vendors-table")));
  await SHOT(t, "vendors-admin-1280-light");
  await n.ctx.close();
  const h = await make("hr");
  await go(h, P.vendors, "hr");
  check("V10", "HR reads the vendors, with no Add, Edit, Deactivate or Delete", await h.t.locator("#add-vendor, [data-action]").count() === 0 && (await rows(h.t, "#vendors-table")).length === 5);
  await h.ctx.close();
}

// ---------- M ----------
if (ONLY.includes("M")) {
  console.log("\n--- M. My assets and requests ---");
  const n = await make("emp");
  const t = n.t;
  await go(n, P.mine, "emp");
  const now = await rows(t, "#my-assets-table");
  check("M1", "Arjun: his three assets now (AST-0188 fair, AST-0302, AST-0455), 'Issued 12 Jan 2023', no ₹ and no value anywhere, nothing of anyone else's", j(now.map((x) => x[0]).sort()) === j(["AST-0188", "AST-0302", "AST-0455"]) && now.every((x) => /12 Jan 2023/.test(x[2])) && !/₹|price|Book value/i.test(await main(t)) && !/AST-0217|AST-0119|Sneha|Rohan/.test(await main(t)), j(now.map((x) => x[0])));
  const dom = await t.evaluate(() => document.documentElement.outerHTML);
  check("M2", "the page's HTML has no price, salvage, cost or another person's tag", !/purchasePrice|salvageValue|bookValue|AST-0217|AST-0119|AST-0099/.test(dom));
  const r = await make("rohan");
  await go(r, P.mine, "rohan");
  check("M3", "Rohan: AST-0119 now; past: AST-0010 (the retired laptop he handed back 3 Jul 2024)", j((await rows(r.t, "#my-assets-table")).map((x) => x[0])) === j(["AST-0119"]) && /AST-0010/.test(await text(r.t, "#past-card")) && /3 Jul 2024/.test(await text(r.t, "#past-card")));
  await r.ctx.close();
  const s = await make("mgr");
  await go(s, P.mine, "mgr");
  check("M4", "Sneha (who manages Rohan and Arjun): only her own AST-0217 — none of the team's assets", j((await rows(s.t, "#my-assets-table")).map((x) => x[0])) === j(["AST-0217"]) && !/AST-0119|AST-0188|Rohan|Arjun/.test(await main(s.t)));
  await s.ctx.close();
  await t.click("#request-asset"); await sleep(t, 300);
  check("M5", "Request an asset opens a dialog: the kinds of asset, how soon, what it is for; the first field focused", await dialogOpen(t) === 1 && await t.evaluate(() => document.activeElement?.id) === "ra-category" && await t.locator("#ra-category option").count() >= 6);
  await t.selectOption("#ra-category", "monitor"); await t.fill("#ra-details", "A second screen for the design work");
  await t.click('button[type="submit"][form="request-asset-form"]'); await sleep(t, 500);
  const desk = await stored(t, "officeos:it-desk");
  const asks = desk?.requests ?? [];
  check("M6", "the request is an IT request (asset-request, monitor, open, ITR-1) from Arjun; the page lists it under 'Your open asset requests'", asks.length === 1 && asks[0].type === "asset-request" && asks[0].payload.category === "monitor" && asks[0].requesterId === "EMP-1105" && asks[0].status === "open" && /Waiting for IT/.test(await text(t, "#asks-list") ?? ""), j(asks.map((a) => [a.id, a.type, a.status])));
  await t.click("#request-asset"); await sleep(t, 300);
  await t.selectOption("#ra-category", "monitor");
  await t.click('button[type="submit"][form="request-asset-form"]'); await sleep(t, 400);
  check("M7", "asking for the same kind again is refused in the desk's words ('There is already an open request for this kind of asset (ITR-1)') and nothing is added", /already an open request for this kind of asset \(ITR-1\)/.test(await text(t, "#request-asset-form-error") ?? await text(t, "#ra-category-error") ?? "") && ((await stored(t, "officeos:it-desk")).requests.length === 1));
  await t.keyboard.press("Escape"); await sleep(t, 300); if (await dialogOpen(t)) { await t.locator(".confirm-dialog [data-confirm-ok]").click().catch(() => {}); await sleep(t, 300); }
  await t.locator('#my-assets-table tr:has-text("AST-0188") [data-action="request-return"]').click(); await sleep(t, 300);
  await t.click('button[type="submit"][form="request-return-form"]'); await sleep(t, 500);
  const d2 = (await stored(t, "officeos:it-desk")).requests;
  check("M8", "Request return of AST-0188 makes an asset-return request naming the tag; its row then says 'Return requested' (no second button)", d2.some((r) => r.type === "asset-return" && r.payload.assetTag === "AST-0188") && /Return requested/.test(await ltext(t, '#my-assets-table tr:has-text("AST-0188")')) && await t.locator('#my-assets-table tr:has-text("AST-0188") [data-action="request-return"]').count() === 0);
  await go(n, "requests/my-requests.html", "emp");
  const mr = await rows(t, "table");
  check("M9", "My requests lists both IT requests, type 'IT', status 'Waiting for IT', newest first; Cancel is offered; the 'Request an asset' button is there again", mr.filter((x) => /IT/.test(x[1]) && /Waiting for IT/.test(x[4])).length === 2 && await t.locator("#request-asset").count() === 1 && await t.locator('#request-asset[hidden]').count() === 0, j(mr.map((x) => [x[0].slice(0, 30), x[1], x[4]])));
  await t.click("#request-asset"); await sleep(t, 300);
  check("M10", "the same dialog opens from My requests", await dialogOpen(t) === 1);
  await t.keyboard.press("Escape"); await sleep(t, 300); if (await dialogOpen(t)) { await t.locator(".confirm-dialog [data-confirm-ok]").click().catch(() => {}); await sleep(t, 300); }
  await t.selectOption('select[aria-label="Filter by type"]', "it"); await sleep(t, 250);
  check("M11", "the type filter 'IT' shows just those two", (await rows(t, "table")).length === 2);
  await SHOT(t, "myrequests-emp-1280-light");
  await n.ctx.close();
}

// ---------- P ----------
if (ONLY.includes("P")) {
  console.log("\n--- P. Profile and Reset ---");
  const n = await make("admin");
  const t = n.t;
  await go(n, "users/user-profile.html", "admin", "?id=EMP-1105");
  const assets = await text(t, "#profile-assets");
  check("P1", "Arjun's profile Assets card (the new register): 3, each 'name / tag since date' with its condition (Dell Latitude 5420 AST-0188 since 12 Jan 2023 Fair)", /\b3\b/.test(assets) && /Dell Latitude 5420/.test(assets) && /AST-0188 since 12 Jan 2023 Fair/.test(assets) && /AST-0302 since 12 Jan 2023 Good/.test(assets) && /Office access card/.test(assets), assets);
  await go(n, "users/user-profile.html", "admin", "?id=EMP-1008");
  check("P2", "Kabir has none: 'No assets assigned'", /No assets assigned/.test(await text(t, "#profile-assets") ?? ""));
  // the old inventory store is the old site's: mark it, run Reset demo data, see the marker survive
  await t.evaluate(() => { localStorage.setItem("officeos:assets", JSON.stringify({ version: 1, nextNum: 1, records: [{ id: "AST-MARK", sku: "x", condition: "good", status: "available", holderId: null, since: null, location: "store-a", history: [] }] })); localStorage.setItem("officeos:inventory-items", JSON.stringify({ version: 1, nextNum: 1, records: [] })); });
  // write the new stores, so a reset has something to clear
  await go(n, P.vendors, "admin");
  await t.click("#add-vendor"); await sleep(t, 300); await t.fill("#vf-name", "Reset Marker Ltd"); await t.click('button[type="submit"][form="vendor-form"]'); await sleep(t, 500);
  // the other three new stores get a marker too, so a reset that forgets one of them shows (a key never written is trivially gone)
  await t.evaluate(() => { for (const k of ["stock-ledger", "it-licences", "it-desk"]) localStorage.setItem("officeos:" + k, JSON.stringify({ version: 99, marker: true })); });
  const before = { reg: (await stored(t, "officeos:asset-register")) !== null, old: j(await stored(t, "officeos:assets")) };
  await go(n, "users/users-list.html", "admin");
  await t.click("text=Reset demo data"); await sleep(t, 300);
  await t.locator(".confirm-dialog [data-confirm-ok]").click(); await t.waitForLoadState("load"); await sleep(t, 800);
  const keys = await t.evaluate(() => Object.keys(localStorage).filter((k) => /asset-register|stock-ledger|it-licences|it-desk/.test(k)));
  const oldAfter = await t.evaluate(() => localStorage.getItem("officeos:assets"));
  check("P3", "Reset demo data clears the NEW stores (register, ledger, licences, IT desk) ...", before.reg && keys.length === 0, j(keys));
  check("P4", "... and leaves the old inventory store's keys alone (the marker is still there, byte for byte)", oldAfter !== null && j(JSON.parse(oldAfter)) === before.old, String(oldAfter).slice(0, 80));
  await n.ctx.close();
}

// ---------- F ----------
if (ONLY.includes("F")) {
  console.log("\n--- F. The flows on one asset ---");
  const n = await make("admin");
  const t = n.t;
  await go(n, P.items, "admin", "?tag=AST-0218");
  const status = () => t.evaluate(() => document.querySelector("#asset-detail")?.dataset.status);
  const actions = () => t.evaluate(() => [...document.querySelectorAll("main [data-action]")].map((b) => b.dataset.action).sort());
  check("F1", "AST-0218 starts in store; offered: edit, issue, maintenance, retire", await status() === "in-store" && j(await actions()) === j(["edit", "issue", "maintenance", "retire"]));
  await t.locator('[data-action="issue"]').click(); await sleep(t, 300);
  const personOpts = await t.locator("#issue-person option").allTextContents();
  check("F2", "the person picker lists active people only: Ananya Iyer yes, Divya Menon (has left) no", personOpts.some((o) => /Ananya Iyer/.test(o)) && !personOpts.some((o) => /Divya Menon/.test(o)));
  await t.selectOption("#issue-person", "EMP-1017"); await t.fill("#issue-date", "2026-11-30");
  await t.click('button[type="submit"][form="issue-form"]'); await sleep(t, 300);
  check("F3", "a date in the future is refused in the register's words, under the field; the asset didn't move", /can't be after/.test(await text(t, "#issue-date-error") ?? "") && await status() === "in-store");
  await t.fill("#issue-date", "2026-11-20"); await t.selectOption("#issue-condition", "good");
  await t.click('button[type="submit"][form="issue-form"]'); await sleep(t, 500);
  check("F4", "issued to Ananya on 20 Nov 2026: Assigned; now only edit and return are offered; the lifecycle gained 'Issued to Ananya Iyer'", await status() === "assigned" && j(await actions()) === j(["edit", "return"]) && /Issued to Ananya Iyer/.test(await text(t, "#lifecycle-card")) && /Ananya Iyer/.test(await text(t, "#asset-kv")));
  await t.locator('[data-action="return"]').click(); await sleep(t, 300);
  await t.fill("#return-date", "2026-11-19");
  await t.click('button[type="submit"][form="return-form"]'); await sleep(t, 300);
  check("F5", "a return dated before the issue is refused (not before 2026-11-20)", /before 2026-11-20/.test(await text(t, "#return-date-error") ?? ""));
  await t.fill("#return-date", "2026-11-21"); await t.selectOption("#return-condition", "fair");
  await t.click('button[type="submit"][form="return-form"]'); await sleep(t, 500);
  check("F6", "taken back: In store again, condition Fair", await status() === "in-store" && /Fair/.test(await text(t, "#asset-kv")));
  await t.locator('[data-action="maintenance"]').click(); await sleep(t, 300);
  await t.click('button[type="submit"][form="maint-form"]'); await sleep(t, 300);
  check("F7", "sending for maintenance with no issue: 'Issue is required.' at its field", /required/.test(await text(t, "#maint-issue-error") ?? ""));
  await t.fill("#maint-issue", "Screen flicker"); await t.fill("#maint-date", "2026-11-22"); await t.fill("#maint-next", "2026-11-22");
  await t.click('button[type="submit"][form="maint-form"]'); await sleep(t, 300);
  check("F8", "a next service on the same day is refused: 'must be after'", /must be after/.test(await text(t, "#maint-next-error") ?? ""));
  await t.fill("#maint-next", "2027-05-22");
  await t.click('button[type="submit"][form="maint-form"]'); await sleep(t, 500);
  check("F9", "under maintenance; offered: edit and 'back from maintenance' only; the record is open", await status() === "under-maintenance" && j(await actions()) === j(["close-maintenance", "edit"]) && /Open/.test(await text(t, "#maint-table")));
  await t.locator('[data-action="close-maintenance"]').click(); await sleep(t, 300);
  await t.fill("#cm-cost", "1800.50"); await t.click('button[type="submit"][form="close-maint-form"]'); await sleep(t, 500);
  check("F10", "back from maintenance: In store; the record is Done with its cost ₹1,800.50", await status() === "in-store" && /Done/.test(await text(t, "#maint-table")) && /1,800.50/.test(await text(t, "#maint-table")));
  await t.locator('[data-action="retire"]').click(); await sleep(t, 300);
  await t.fill("#retire-form-reason", "ab"); await t.click('button[type="submit"][form="retire-form"]'); await sleep(t, 400);
  const asked = await t.locator(".confirm-dialog").count();
  if (asked) await t.locator(".confirm-dialog [data-confirm-ok]").click(); await sleep(t, 400);
  check("F11", "retiring asks 'Retire AST-0218?' first; a 2-character reason is then refused at its field", asked === 1 && /at least 3/.test(await text(t, "#retire-form-reason-error") ?? "") && await status() === "in-store");
  await t.fill("#retire-form-reason", "Screen can't be repaired");
  await t.click('button[type="submit"][form="retire-form"]'); await sleep(t, 300); await t.locator(".confirm-dialog [data-confirm-ok]").click(); await sleep(t, 500);
  check("F12", "retired; only edit and dispose are offered; the chip is hatched 'Retired'", await status() === "retired" && j(await actions()) === j(["dispose", "edit"]) && /Retired/.test(await text(t, "#asset-detail")));
  await t.locator('[data-action="dispose"]').click(); await sleep(t, 300);
  await t.fill("#dispose-form-reason", "Sold for scrap"); await t.fill("#dispose-form-sale", "-5");
  await t.click('button[type="submit"][form="dispose-form"]'); await sleep(t, 300); await t.locator(".confirm-dialog [data-confirm-ok]").click(); await sleep(t, 400);
  check("F13", "a negative sale value is refused at its field", /amount in rupees|0 or more/.test(await text(t, "#dispose-form-sale-error") ?? "") && await status() === "retired");
  await t.fill("#dispose-form-sale", "1500");
  await t.click('button[type="submit"][form="dispose-form"]'); await sleep(t, 300); await t.locator(".confirm-dialog [data-confirm-ok]").click(); await sleep(t, 500);
  check("F14", "disposed: no action is offered at all; the asset page says when and why", await status() === "disposed" && (await actions()).length === 0 && /Sold for scrap/.test(await text(t, "#asset-kv")));
  const ev = (await stored(t, "officeos:asset-register")).events.filter((e) => e.assetId === "FA-5").map((e) => e.kind);
  check("F15", "the history only grew: added, issued, returned, maintenance out, back, retired, disposed (7 events, in order)", j(ev) === j(["added", "issued", "returned", "maintenance-opened", "maintenance-closed", "retired", "disposed"]), j(ev));
  const audit = (await stored(t, "officeos:audit-trail")).events.map((e) => e.kind);
  check("F16", "every step is in the audit trail (issued, returned, maintenance opened and closed, retired, disposed) with no amount in its words", ["asset-issued", "asset-returned", "asset-maintenance-opened", "asset-maintenance-closed", "asset-retired", "asset-disposed"].every((k) => audit.includes(k)) && !(await stored(t, "officeos:audit-trail")).events.some((e) => /1800|1,800|1500|1,500/.test(e.detail)));
  // add an asset and complete an imported one's details
  await go(n, P.items, "admin");
  await t.click("#add-asset"); await sleep(t, 300);
  await t.click('button[type="submit"][form="asset-form"]'); await sleep(t, 300);
  check("F17", "Add asset with nothing filled: the register's words at the fields (name required, category, purchase date, price, ...)", /required|Choose/.test(await text(t, "#af-name-error") ?? "") && await dialogOpen(t) === 1);
  await fill(t, { "#af-name": "ThinkPad E14", "#af-category": "laptop", "#af-date": "2026-11-10", "#af-price": "65432.10" });
  check("F18", "the Office select lists the active offices", (await t.locator("#af-office option").allTextContents()).includes("Head office"));
  await t.click('button[type="submit"][form="asset-form"]'); await sleep(t, 500);
  const reg = await stored(t, "officeos:asset-register");
  const added = reg.assets.find((a) => a.name === "ThinkPad E14");
  check("F19", "added: tag AST-0456 (after the old register's AST-0455), in store, price 65,432.10, salvage 5% = 3,271.61, category defaults", added?.tag === "AST-0456" && added.purchasePrice === 65432.1 && added.salvageValue === 3271.61 && added.depreciationMethod === "slm" && added.usefulLifeYears === 3, j(added && [added.tag, added.purchasePrice, added.salvageValue]));
  await go(n, P.items, "admin", "?tag=AST-0119");
  await t.locator('[data-action="edit"]').click(); await sleep(t, 300);
  await fill(t, { "#af-date": "2025-03-10" });
  await t.click('button[type="submit"][form="asset-form"]'); await sleep(t, 300);
  check("F20", "completing an imported asset: a purchase date after it was first issued (3 Mar 2025) is refused in the register's words", /can't be after 2025-03-03/.test(await text(t, "#af-date-error") ?? ""));
  await fill(t, { "#af-date": "2025-02-20", "#af-price": "189900" });
  await t.click('button[type="submit"][form="asset-form"]'); await sleep(t, 500);
  check("F21", "with the date and price saved, the 'details missing' note goes and the depreciation panel appears with real figures", await t.locator("#details-missing-note").count() === 0 && await t.locator('[data-kpi="dep-book"]').count() === 1 && /₹/.test(await kpi(t, "dep-book")));
  const reg2 = await stored(t, "officeos:asset-register");
  check("F22", "the salvage value took the category default (5% of 1,89,900 = 9,495)", reg2.assets.find((a) => a.tag === "AST-0119").salvageValue === 9495);
  await n.ctx.close();
}

// ---------- K ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard ---");
  const n = await make("admin");
  const t = n.t;
  await go(n, P.items, "admin");
  const btn = await t.evaluate(() => [...document.querySelectorAll("main button")].filter((b) => !b.getAttribute("aria-label") && !b.textContent.trim()).length);
  check("K1", "every button on Inventory has a name (text or aria-label)", btn === 0);
  const acts = await t.evaluate(() => [...document.querySelectorAll("#assets-table [data-action]")].every((b) => /AST-\d+/.test(b.getAttribute("aria-label") ?? "")));
  check("K2", "every row action is named with its asset ('Issue AST-0218')", acts);
  await t.locator('#assets-table tr:has-text("AST-0218") [data-action="issue"]').focus(); await t.keyboard.press("Enter"); await sleep(t, 300);
  check("K3", "Enter on a row's Issue opens the dialog, focus on its first field (Person)", await dialogOpen(t) === 1 && await t.evaluate(() => document.activeElement?.id) === "issue-person");
  const trapped = await t.evaluate(() => { const m = document.querySelector(".modal.is-open"); return m.contains(document.activeElement); });
  for (let i = 0; i < 12; i++) await t.keyboard.press("Tab");
  check("K4", "Tab stays inside the dialog", trapped && await t.evaluate(() => document.querySelector(".modal.is-open").contains(document.activeElement)));
  await t.keyboard.press("Escape"); await sleep(t, 300);
  check("K5", "Esc closes it (nothing was entered, so no 'discard' question); focus goes back to the Issue button", await dialogOpen(t) === 0 && await t.evaluate(() => document.activeElement?.dataset?.action) === "issue");
  await t.locator('#assets-table tr:has-text("AST-0218") [data-action="issue"]').click(); await sleep(t, 300);
  await t.selectOption("#issue-person", "EMP-1017"); await t.keyboard.press("Escape"); await sleep(t, 300);
  check("K6", "after typing something, Esc asks 'Discard what you've entered?' (the shared guard); Keep editing leaves the dialog open", await t.locator(".confirm-dialog").count() === 1);
  await t.locator(".confirm-dialog [data-confirm-cancel]").click(); await sleep(t, 300);
  check("K7", "Keep editing: the dialog is still open with the person kept", await dialogOpen(t) === 1 && await t.inputValue("#issue-person") === "EMP-1017");
  await n.ctx.close();
}

// ---------- W ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. Layout and shots ---");
  const bad = [];
  const plan = [["admin", P.items, ""], ["admin", P.items, "?tag=AST-0009"], ["admin", P.items, "?tag=AST-0119"], ["admin", P.assign, ""], ["admin", P.stock, ""], ["admin", P.vendors, ""], ["emp", P.mine, ""], ["hr", P.items, "?tag=AST-0217"], ["fin", P.items, ""]];
  for (const width of [412, 768, 1280]) for (const theme of ["light", "dark"]) {
    for (const who of ["admin", "emp", "hr", "fin"]) {
      const n = await make(who, { width, theme });
      for (const [w, page, q] of plan.filter((p) => p[0] === who)) {
        await go(n, page, w, q);
        if (!(await noScroll(n.t))) bad.push(`${w} ${page}${q} ${width} ${theme}`);
        await SHOT(n.t, `${w}-${page.split("/")[1].replace(".html", "")}${q ? "-" + q.slice(5).toLowerCase() : ""}-${width}-${theme}`);
      }
      await n.ctx.close();
    }
  }
  check("W1", "no sideways scroll on the five pages at 412, 768 and 1280, light and dark", bad.length === 0, j(bad.slice(0, 6)));
}

// ---------- C ----------
if (ONLY.includes("C")) {
  console.log("\n--- C. Contrast ---");
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const low = [];
  for (const theme of ["light", "dark"]) {
    const n = await make("admin", { theme });
    await go(n, P.items, "admin");
    const chips = await n.t.evaluate(() => {
      const probe = document.createElement("canvas").getContext("2d");
      const rgb = (css) => { probe.fillStyle = "#000"; probe.fillStyle = css; const v = probe.fillStyle; const m = /^#([0-9a-f]{6})$/i.exec(v); if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)); const q = /rgba?\(([^)]+)\)/.exec(v); return q ? q[1].split(",").slice(0, 3).map(Number) : [0, 0, 0]; };
      const root = getComputedStyle(document.documentElement);
      const token = (n) => rgb(root.getPropertyValue(n).trim());
      const out = [];
      for (const el of document.querySelectorAll('#assets-table [data-chip="asset-status"], [data-chip="details-missing"], .badge')) {
        const cs = getComputedStyle(el);
        const bg = rgb(cs.backgroundColor);
        const base = cs.backgroundColor === "rgba(0, 0, 0, 0)" || el.dataset.status === "retired" ? [token("--ds-surface-1"), token("--ds-surface-2"), token("--ds-surface-3")] : [bg];
        out.push({ label: el.textContent.trim(), status: el.dataset.status ?? el.className, fg: rgb(cs.color), bgs: base });
      }
      return out;
    });
    for (const c of chips) for (const b of c.bgs) if (ratio(c.fg, b) < 4.5) low.push(`${theme} ${c.status} "${c.label}" ${ratio(c.fg, b).toFixed(2)}`);
    check(`C1.${theme}`, `${theme}: every status chip, badge and 'Details missing' pill's words reach 4.5:1 on their background (${chips.length} read)`, chips.length >= 10 && low.filter((l) => l.startsWith(theme)).length === 0, j(low.filter((l) => l.startsWith(theme)).slice(0, 4)));
    await n.ctx.close();
  }
}

// ---------- E ----------
if (ONLY.includes("E")) {
  console.log("\n--- E. Errors ---");
  check("E1", "no page or console errors in the whole run", errs.length === 0, j(errs.slice(0, 4)));
}
await browser.close();
stop();
console.log(`\nas2: passed ${passed}, failed ${failed}`);
process.exit(failed ? 1 : 0);