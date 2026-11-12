// L2's harness (msedge, headless): My locations, location changes in the approvals inbox / card / bell / sidebar count /
// Admin dashboard, My devices on My profile, and Offices in the sidebar. New screens only (no old page to compare), read by
// meaning (ids, labels, words, table cells, dialogs, toasts), never by CSS look.
// usage: node locs.mjs <app dist> <pristine tree> <shots dir>   [ONLY=RNSCAHDYKWE]
// Fixed clock Mon 28 Sep 2026 10:00 IST, fresh storage each, geolocation mocked per context.
//   R  every role opens My locations; Offices is in the sidebar's Attendance section for every role; search finds My locations
//   N  not home-eligible (employee, manager): the office, why there's no home check-in and whom to ask; no forms
//   S  eligible employee: both homes "Not set"; the address refused when empty; "Use my current location" fills the position;
//      saved once (toast, "Set" chip, history line); a typed bad latitude refused at its field; Request change: the reason
//      refused when short, then sent (toast, "Change waiting" chip, request row "Waiting for an Admin", no second request);
//      Cancel request asks first, then "Cancelled"
//   C  the counts: a waiting change adds 1 to the Admin's bell and sidebar Approvals count, nothing to HR's or a manager's
//   A  Admin decides: the inbox row (Location badge, the type filter), the card (rows, Approve / Reject), the Admin dashboard's
//      list; Approve asks, then applies the new place; Reject needs a reason, then keeps the old place; Approved / Rejected
//      tabs; the employee sees the decision and the history
//   H  HR and a manager: no location rows, no Location decisions; "Who approves what" names an Admin
//   D  My devices on My profile: none yet; two with this one marked; the limit warning; the honest note; Admin reset on the
//      user profile reachable (asked, then the toast, none left)
//   Y  an Admin's own change applies at once, logged ("Changed", decided by You)
//   K  keyboard: the set form in order; the change dialog opens on its first field and Esc closes it; an inbox title by Enter
//   W  412 and 1280, light and dark: My locations (both states), My profile, Approvals: no sideways scroll; shots
//   E  no page or console errors
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, , SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "RNSCAHDYKWE";
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srvN = spawn("python", [path.join(HERE, "spa-serve.py"), "9987", DIST], { stdio: "ignore" });
const stop = () => { try { srvN.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9987";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const SIZES = { 412: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA }, 1280: { viewport: { width: 1280, height: 900 } } };
const PRIVACY = "Your location is read only when you check in or out, never in the background.";
const PAGE = "account/my-locations.html";
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(16)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 700)}` : ""}`); };
const j = JSON.stringify;
const errs = [];

// Storage the tests start from.
const HOME = (people) => ["officeos:home-locations", JSON.stringify({ version: 1, people })];
const person = (eligible, permanent = null, temporary = null) => ({ homeEligible: eligible, permanent, temporary, history: [] });
const PLACE_A = { address: "12 MG Road, Gurugram", lat: 28.48, lng: 77.08, setAt: "2026-09-01T04:00:00.000Z", setBy: "EMP-1105" };
const CHANGE = (over = {}) => ({ id: "LC-1", type: "location-change", userId: "EMP-1105", kind: "permanent", place: { address: "45 Golf Course Road, Gurugram", lat: 28.45, lng: 77.1 },
  reason: "Moved house", status: "pending", requestedAt: "2026-09-27T04:30:00.000Z", decidedAt: null, decidedBy: null, note: "",
  history: [{ at: "2026-09-27T04:30:00.000Z", byUserId: "EMP-1105", action: "requested", note: "" }], ...over });
const CHANGES = (records) => ["officeos:location-changes", JSON.stringify({ version: 1, nextNum: records.length + 1, records })];
const WAITING = [HOME({ "EMP-1105": person(true, PLACE_A) }), CHANGES([CHANGE()])];

async function open(who, page, { width = 1280, theme = "light", store = [], geo = null, deny = false } = {}) {
  const ctx = await browser.newContext({ ...SIZES[width], timezoneId: "Asia/Kolkata", ...(geo ? { geolocation: geo, permissions: ["geolocation"] } : {}) });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date("2026-09-28T10:00:00+05:30"));
  await ctx.addInitScript(([w, th, st]) => {
    if (sessionStorage.getItem("u-set")) return;
    sessionStorage.setItem("u-set", "1"); localStorage.clear();
    localStorage.setItem("officeos:theme", JSON.stringify(th));
    localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
    for (const [k, v] of st) localStorage.setItem(k, v);
  }, [WHO[who], theme, store]);
  if (deny) await ctx.clearPermissions();
  const t = await ctx.newPage();
  t.on("pageerror", (e) => errs.push(`${who} ${page}: ${e.message}`));
  t.on("console", (m) => { if (m.type() === "error") errs.push(`${who} ${page}: console ${m.text()}`); });
  await t.goto(N + "/pages/" + page); await t.waitForLoadState("load"); await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(400);
  return { ctx, t };
}
const settle = (t, ms = 250) => t.waitForTimeout(ms);
const toast = async (t) => (await t.evaluate(() => [...document.querySelectorAll(".toast .toast__text")].map((e) => e.textContent.trim()))).at(-1) ?? null;
const text = (t, sel) => t.evaluate((sel) => { const e = document.querySelector(sel); return e ? e.innerText.replace(/\s+/g, " ").trim() : null; }, sel);
const rows = (t, sel) => t.evaluate((sel) => [...document.querySelectorAll(`${sel} tbody tr`)].map((r) => [...r.cells].map((c) => c.innerText.replace(/\s+/g, " ").trim())), sel);
const chip = (t, kind) => text(t, `#home-${kind} .ds-card__meta`);
const stored = (t, key) => t.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), key);
async function asked(t, yes) {
  await t.waitForSelector(".confirm-dialog", { timeout: 3000 }).catch(() => {});
  const q = await t.evaluate(() => [...document.querySelectorAll(".confirm-dialog .modal__title, .confirm-dialog .modal__desc")].map((p) => p.textContent).join("\n"));
  await t.click(yes ? "[data-confirm-ok]" : "[data-confirm-cancel]").catch(() => {});
  await settle(t, 300);
  return q;
}
const bell = (t) => t.evaluate(() => document.querySelector(".topbar__icon-btn--dot[aria-haspopup]")?.getAttribute("aria-label") ?? null);
const navCount = (t) => t.evaluate(() => document.querySelector("[data-count-waiting] .nav__count")?.textContent ?? "0");

// ---------- R ----------
if (ONLY.includes("R")) {
  console.log("\n--- R. Who opens what ---");
  for (const who of Object.keys(WHO)) {
    const n = await open(who, PAGE);
    const s = await n.t.evaluate(() => {
      const att = [...document.querySelectorAll(".nav__section")].find((s) => s.querySelector(".nav__group-title")?.textContent === "Attendance");
      return { at: location.pathname, h1: document.querySelector("main h1")?.textContent, title: document.title.replace(/ \| .*$/, ""),
        items: att ? [...att.querySelectorAll(".nav__panel a")].map((a) => a.textContent.trim()) : [], href: att ? [...att.querySelectorAll(".nav__panel a")].find((a) => a.textContent.trim() === "Offices")?.getAttribute("href") : null,
        privacy: [...document.querySelectorAll("main .ds-privacy")].map((p) => p.textContent).includes("Your location is read only when you check in or out, never in the background.") };
    });
    check(`R1.${who}`, `${who}: opens My locations (heading, tab title, privacy line); Offices last in the sidebar's Attendance section`,
      s.at === "/pages/account/my-locations.html" && s.h1 === "My locations" && s.title === "My locations" && s.privacy && s.items.at(-1) === "Offices" && s.href === "/pages/company/offices.html", j(s));
    await n.ctx.close();
  }
  const n = await open("emp", "dashboard/employee.html");
  await n.t.fill("#topbar-search input, .topbar__search input", "my loc").catch(() => {});
  await settle(n.t, 300);
  const found = await n.t.evaluate(() => [...document.querySelectorAll(".search__results a, .search-results a, [role='listbox'] [role='option']")].map((a) => a.textContent.replace(/\s+/g, " ").trim()));
  check("R2", "the topbar search finds My locations (under Attendance)", found.some((f) => f.startsWith("My locations")), j(found));
  await n.ctx.close();
}

// ---------- N ----------
if (ONLY.includes("N")) {
  console.log("\n--- N. Not home-eligible ---");
  for (const who of ["emp", "mgr"]) {
    const n = await open(who, PAGE);
    const s = await n.t.evaluate(() => ({ office: [...document.querySelectorAll("#my-office dt")].map((d) => `${d.textContent}: ${d.nextElementSibling.textContent}`),
      off: document.querySelector("#home-off-text")?.innerText.replace(/\s+/g, " ").trim(), forms: document.querySelectorAll("main form").length,
      cards: [...document.querySelectorAll("main .ds-card__title")].map((h) => h.textContent) }));
    check(`N1.${who}`, `${who}: the office (head office, 150 m), "Home check-in isn't on for you", whom to ask by name (HR / Admin), no forms, no request or history cards`,
      j(s.office) === j(["Office: Head office", "Address: Sector 44, Gurugram, Haryana 122003", "Radius: 150 m"]) && /^Home check-in isn't on for you\. You check in from your office, Head office\. If you work from home, ask .*Priya Nair.* to turn on home check-in for you\./.test(s.off ?? "")
      && s.forms === 0 && j(s.cards) === j(["Your office", "Home check-in"]), j(s));
    await n.ctx.close();
  }
}

// ---------- S ----------
if (ONLY.includes("S")) {
  console.log("\n--- S. Set once, then request a change ---");
  const n = await open("emp", PAGE, { store: [HOME({ "EMP-1105": person(true) })], geo: { latitude: 28.4721, longitude: 77.0725, accuracy: 30 } });
  check("S1", "eligible: both homes \"Not set\" with a form each; empty requests and history say what comes next",
    (await chip(n.t, "permanent")) === "Not set" && (await chip(n.t, "temporary")) === "Not set" && (await n.t.locator("#set-permanent-form").count()) === 1 && (await n.t.locator("#set-temporary-form").count()) === 1
    && (await text(n.t, "#location-requests tbody")) === "No change requests yet. Once a home is set, Request change sends one." && (await text(n.t, "#location-history tbody")) === "Nothing yet. Setting a home adds a line here.",
    j([await chip(n.t, "permanent"), await text(n.t, "#location-requests tbody"), await text(n.t, "#location-history tbody")]));
  await n.t.click("#set-permanent-form button[type=submit]"); await settle(n.t);
  check("S2", "saving with no address: refused at the address in the store's words", (await text(n.t, "#set-permanent-address-error")) === "Enter the address.", await text(n.t, "#set-permanent-address-error"));
  await n.t.click("#set-permanent-locate"); await settle(n.t, 600);
  const pos = await n.t.evaluate(() => [document.getElementById("set-permanent-lat").value, document.getElementById("set-permanent-lng").value, document.querySelector("#set-permanent-form [role='status']")?.textContent]);
  check("S3", "Use my current location fills the position and says how accurate", j(pos) === j(["28.4721", "77.0725", "Location read (to within 30 m)."]), j(pos));
  await n.t.fill("#set-permanent-address", "7 Palm Grove, Sector 49, Gurugram"); await n.t.click("#set-permanent-form button[type=submit]"); await settle(n.t, 350);
  const after = [await toast(n.t), await chip(n.t, "permanent"), await text(n.t, "#home-permanent dl"), (await rows(n.t, "#location-history"))[0]];
  check("S4", "saved: toast, \"Set\" chip, the address / position / radius / day, a history line (Set: permanent home, by You)",
    after[0] === "Permanent home saved. You can check in from it now." && after[1] === "Set" && after[2] === "Address 7 Palm Grove, Sector 49, Gurugram Position 28.4721, 77.0725 Radius 150 m Set on 28 Sep 2026"
    && j(after[3]) === j(["28 Sep 2026", "Set: permanent home", "—", "7 Palm Grove, Sector 49, Gurugram", "You"]), j(after));
  await n.t.fill("#set-temporary-address", "Hotel Lake View, Pune"); await n.t.fill("#set-temporary-lat", "abc"); await n.t.fill("#set-temporary-lng", "73.8"); await n.t.click("#set-temporary-form button[type=submit]"); await settle(n.t);
  const latErr = await text(n.t, "#set-temporary-lat-error");
  check("S5", "a typed latitude that isn't a number: refused at the latitude", /latitude/i.test(latErr ?? ""), latErr);
  await n.t.click('#home-permanent button:has-text("Request change")'); await settle(n.t, 350);
  const dlg = await n.t.evaluate(() => [document.querySelector("#change-modal .modal__title, #change-modal h2")?.textContent, document.activeElement?.id]);
  await n.t.fill("#change-address", "45 Golf Course Road, Gurugram"); await n.t.fill("#change-lat", "28.45"); await n.t.fill("#change-lng", "77.1"); await n.t.fill("#change-reason", "x");
  await n.t.click('button[form="change-form"]'); await settle(n.t);
  const rErr = await text(n.t, "#change-reason-error");
  check("S6", "Request change: the dialog names the home; a one-letter reason is refused at the reason", dlg[0] === "Change your permanent home" && rErr === "Give a reason for the change.", j([dlg, rErr]));
  await n.t.fill("#change-reason", "Moved house"); await n.t.click('button[form="change-form"]'); await settle(n.t, 350);
  const sent = [await toast(n.t), await chip(n.t, "permanent"), await text(n.t, "#home-permanent-pending p"), (await rows(n.t, "#location-requests"))[0], await n.t.locator('#home-permanent button:has-text("Request change")').count()];
  check("S7", "sent: toast, \"Change waiting\" chip, the waiting note, the request row \"Waiting for an Admin\", no second Request change",
    sent[0] === "Change request sent. An Admin will approve or reject it." && sent[1] === "Change waiting" && sent[2] === "Waiting for an Admin since 28 Sep 2026: 45 Golf Course Road, Gurugram."
    && j(sent[3]) === j(["LC-1", "Permanent home", "45 Golf Course Road, Gurugram", "Moved house", "28 Sep 2026", "Waiting for an Admin", "—"]) && sent[4] === 0, j(sent));
  await n.t.click('#home-permanent-pending button:has-text("Cancel request")');
  const q = await asked(n.t, true);
  const cancelled = [await toast(n.t), await chip(n.t, "permanent"), (await rows(n.t, "#location-requests"))[0]?.[5]];
  check("S8", "Cancel request asks first; then cancelled (toast, \"Set\" chip again, status Cancelled)",
    q === "Cancel your permanent home change request?\nThe place stays as it is now." && cancelled[0] === "Change request cancelled." && cancelled[1] === "Set" && cancelled[2] === "Cancelled", j([q, cancelled]));
  await n.ctx.close();
  const d = await open("emp", PAGE, { store: [HOME({ "EMP-1105": person(true) })], deny: true });
  await d.t.click("#set-permanent-locate"); await settle(d.t, 800);
  const denied = await text(d.t, "#set-permanent-form [role='status']");
  check("S9", "location permission denied: says what to do instead (type the position)", /denied|couldn't be read/.test(denied ?? "") && /type/i.test(denied ?? ""), denied);
  await d.ctx.close();
}

// ---------- C ----------
if (ONLY.includes("C")) {
  console.log("\n--- C. Counts ---");
  for (const who of ["admin", "hr", "mgr"]) {
    const a = await open(who, "requests/approvals-inbox.html", { store: [HOME({ "EMP-1105": person(true, PLACE_A) })] });
    const b = await open(who, "requests/approvals-inbox.html", { store: WAITING });
    const [ba, bb, na, nb] = [await bell(a.t), await bell(b.t), await navCount(a.t), await navCount(b.t)];
    const num = (s) => Number(String(s).replace(/\D/g, "") || 0);
    const plus = who === "admin" ? 1 : 0;
    check(`C1.${who}`, `${who}: a waiting location change adds ${plus} to the bell and the sidebar's Approvals count`, num(bb) - num(ba) === plus && num(nb) - num(na) === plus, j([ba, bb, na, nb]));
    await a.ctx.close(); await b.ctx.close();
  }
}

// ---------- A ----------
if (ONLY.includes("A")) {
  console.log("\n--- A. Admin decides ---");
  {
    const n = await open("admin", "requests/approvals-inbox.html", { store: WAITING });
    const row = await n.t.evaluate(() => { const r = document.querySelector('#inbox-table tr[data-change-id="LC-1"]'); return r ? [...r.cells].map((c) => c.innerText.replace(/\s+/g, " ").trim()) : null; });
    check("A1", "the inbox lists it: title, Location badge, who, the new address, waiting time, Reject / Approve",
      j(row) === j(["AK Home location: Arjun Kapoor, permanent", "Location", "Arjun Kapoor", "45 Golf Course Road, Gurugram", "1 day", "Reject Approve"]), j(row));
    await n.t.selectOption('select[aria-label="Filter by type"]', "location"); await settle(n.t);
    const filtered = await n.t.evaluate(() => [...document.querySelectorAll("#inbox-table tbody tr")].map((r) => r.dataset.changeId ?? r.dataset.type));
    const who = await n.t.evaluate(() => [...document.querySelectorAll("#who-approves dt")].map((d) => `${d.textContent}: ${d.nextElementSibling.textContent}`).at(-1));
    check("A2", "the type filter has Location (1 row); Who approves what: Home location changes, An Admin", j(filtered) === j(["LC-1"]) && who === "Home location changes: An Admin", j([filtered, who]));
    await n.t.click('#inbox-table tr[data-change-id="LC-1"] [data-card]'); await settle(n.t, 350);
    const card = await n.t.evaluate(() => { const c = document.getElementById("approval-card"); return c ? { kind: c.dataset.kind, title: c.querySelector("#approval-card-title")?.textContent, what: c.querySelector(".approval-card__what")?.textContent,
      rows: [...c.querySelectorAll("dt")].map((d) => `${d.textContent}: ${d.nextElementSibling.textContent}`), reason: c.querySelector(".approval-card__reason p")?.textContent, buttons: [...c.querySelectorAll(".modal__footer button")].map((b) => b.textContent.trim()) } : null; });
    check("A3", "its card: the person, \"Permanent home location change\", new address / position / now / sent / waiting, the reason, Reject and Approve",
      card?.kind === "locations" && card.title === "Arjun Kapoor" && card.what === "Permanent home location change"
      && j(card.rows) === j(["New address: 45 Golf Course Road, Gurugram", "Position: 28.45, 77.1", "Now: 12 MG Road, Gurugram", "Sent: 27 Sep", "Waiting: 1 day"]) && card.reason === "Moved house" && j(card.buttons) === j(["Reject", "Approve"]), j(card));
    await n.t.keyboard.press("Escape"); await settle(n.t);
    await n.t.click('#inbox-table tr[data-change-id="LC-1"] button:has-text("Approve")');
    const q = await asked(n.t, true);
    const done = [await toast(n.t), await n.t.locator('#inbox-table tr[data-change-id="LC-1"]').count(), (await stored(n.t, "officeos:home-locations")).people["EMP-1105"].permanent.address];
    check("A4", "Approve asks (the person, the home, the new address); then the toast, the row leaves Pending, the new place applies",
      q === "Approve this request?\nArjun Kapoor: permanent home to 45 Golf Course Road, Gurugram" && done[0] === "Location change approved. The new place counts from now." && done[1] === 0 && done[2] === "45 Golf Course Road, Gurugram", j([q, done]));
    await n.t.selectOption('select[aria-label="Filter by type"]', ""); await n.t.click('main [role="tab"]:has-text("Approved")'); await settle(n.t);
    const ap = await n.t.evaluate(() => { const r = document.querySelector('#inbox-table tr[data-change-id="LC-1"]'); return r ? [...r.cells].map((c) => c.innerText.replace(/\s+/g, " ").trim()).slice(1, 5) : null; });
    const recent = await n.t.evaluate(() => [...document.querySelectorAll("#decided-table tbody tr")].map((r) => r.cells[0].innerText.trim()));
    check("A5", "Approved tab: the change, decided today; Recently decided lists it", j(ap) === j(["Location", "Arjun Kapoor", "45 Golf Course Road, Gurugram", "28 Sep"]) && recent.includes("Home location: Arjun Kapoor, permanent"), j([ap, recent]));
    const store = await n.t.evaluate(() => [localStorage.getItem("officeos:home-locations"), localStorage.getItem("officeos:location-changes")]);
    await n.ctx.close();
    const e = await open("emp", PAGE, { store: [["officeos:home-locations", store[0]], ["officeos:location-changes", store[1]]] });
    const seen = [(await rows(e.t, "#location-requests"))[0], (await rows(e.t, "#location-history"))[0], await text(e.t, "#home-permanent dl")];
    check("A6", "the employee sees it: Approved by Aarav Mehta today, the history line (Changed, from, to, by), the new address",
      j(seen[0]) === j(["LC-1", "Permanent home", "45 Golf Course Road, Gurugram", "Moved house", "27 Sep 2026", "Approved", "Aarav Mehta, 28 Sep 2026"])
      && j(seen[1]) === j(["28 Sep 2026", "Changed: permanent home", "12 MG Road, Gurugram", "45 Golf Course Road, Gurugram", "Aarav Mehta"]) && (seen[2] ?? "").startsWith("Address 45 Golf Course Road, Gurugram"), j(seen));
    await e.ctx.close();
  }
  {
    const n = await open("admin", "requests/approvals-inbox.html", { store: WAITING });
    await n.t.click('#inbox-table tr[data-change-id="LC-1"] button:has-text("Reject")'); await settle(n.t, 300);
    const title = await n.t.evaluate(() => [...document.querySelectorAll(".modal.is-open .modal__title")].map((t) => t.textContent).at(-1));
    await n.t.click('button[form="reject-location-note-form"]'); await settle(n.t);
    const err = await text(n.t, "#reject-location-note-error");
    await n.t.fill("#reject-location-note", "Send a utility bill for the new address."); await n.t.click('button[form="reject-location-note-form"]'); await settle(n.t, 350);
    const s = await stored(n.t, "officeos:location-changes"), h = await stored(n.t, "officeos:home-locations");
    check("A7", "Reject: the dialog; no reason refused (\"Give a reason. The employee sees it.\"); then the toast, rejected with the note, the old place kept",
      title === "Reject location change" && err === "Give a reason. The employee sees it." && (await toast(n.t)) === "Location change rejected." && s.records[0].status === "rejected"
      && s.records[0].note === "Send a utility bill for the new address." && h.people["EMP-1105"].permanent.address === "12 MG Road, Gurugram", j([title, err, s.records[0].status]));
    await n.t.click('main [role="tab"]:has-text("Rejected")'); await settle(n.t);
    const rj = await n.t.evaluate(() => document.querySelector('#inbox-table tr[data-change-id="LC-1"]')?.cells[3].innerText.trim());
    check("A8", "Rejected tab: the row's details carry the note", rj === "45 Golf Course Road, Gurugram: Send a utility bill for the new address.", rj);
    await n.ctx.close();
  }
  {
    const n = await open("admin", "dashboard/admin.html", { store: WAITING });
    const item = await n.t.evaluate(() => { const i = document.querySelector('[data-request-id="LC-1"]'); return i ? [i.querySelector(".list__title")?.textContent, i.querySelector(".list__sub")?.textContent] : null; });
    check("A9", "the Admin dashboard's Waiting for you list has it", j(item) === j(["Home location change: Arjun Kapoor", "Permanent home to 45 Golf Course Road, Gurugram"]), j(item));
    await n.t.click('.topbar__icon-btn--dot[aria-haspopup]'); await settle(n.t, 300);
    const bellList = await n.t.evaluate(() => [...document.querySelectorAll("#bell-panel .bell-panel__item")].map((b) => `${b.dataset.card}: ${b.querySelector(".bell-panel__what")?.textContent}`));
    check("A10", "the bell's list has it", bellList.includes("locations: Permanent home location change"), j(bellList));
    await n.ctx.close();
  }
}

// ---------- H ----------
if (ONLY.includes("H")) {
  console.log("\n--- H. HR and a manager ---");
  for (const who of ["hr", "mgr"]) {
    const n = await open(who, "requests/approvals-inbox.html", { store: WAITING });
    const s = await n.t.evaluate(() => ({ rows: document.querySelectorAll("#inbox-table tr[data-change-id]").length, opts: [...document.querySelectorAll('select[aria-label="Filter by type"] option')].map((o) => o.textContent) }));
    check(`H1.${who}`, `${who}: no location change rows (only an Admin decides them)`, s.rows === 0, j(s));
    await n.ctx.close();
  }
}

// ---------- D ----------
if (ONLY.includes("D")) {
  console.log("\n--- D. My devices ---");
  const DEV = (n) => ["officeos:devices", JSON.stringify({ version: 1, nextNum: n + 1, records: [
    { id: "DEV-1", userId: "EMP-1105", token: "a".repeat(32), label: "Edge on Windows", registeredAt: "2026-09-20T04:00:00.000Z", lastUsedAt: "2026-09-27T04:00:00.000Z" },
    { id: "DEV-2", userId: "EMP-1105", token: "b".repeat(32), label: "Chrome on Android", registeredAt: "2026-09-21T04:00:00.000Z", lastUsedAt: "2026-09-26T04:00:00.000Z" }].slice(0, n) })];
  const TOKEN = (c) => ["officeos:device-token", JSON.stringify({ token: c.repeat(32), createdAt: "2026-09-20T04:00:00.000Z" })];
  const read = (t) => t.evaluate(() => { const c = document.getElementById("my-devices"); return c ? { meta: c.querySelector(".card__meta")?.textContent, items: [...c.querySelectorAll(".list__item")].map((i) => i.innerText.replace(/\s+/g, " ").trim()),
    empty: c.querySelector(".card__body > p.text-muted:not(#device-note)")?.textContent ?? null, limit: c.querySelector("#device-limit")?.textContent ?? null, note: c.querySelector("#device-note")?.textContent } : null; });
  const NOTE = "A browser can't prove who is using it: a device here is a random token kept in this browser, nothing more. If you clear your browser's data, this one counts as new.";
  let n = await open("emp", "account/my-profile.html");
  let s = await read(n.t);
  check("D1", "none yet: \"0 of 2\", what registers one, the honest note; no token is made by looking", s?.meta === "0 of 2" && s.empty === "No devices yet. Your first check-in registers the device it comes from." && s.note === NOTE
    && (await stored(n.t, "officeos:device-token")) === null, j(s));
  const places = await n.t.evaluate(() => [...document.querySelectorAll("#my-places dt")].map((d) => `${d.textContent}: ${d.nextElementSibling.textContent}`));
  check("D2", "Check-in places on My profile: the office, home check-in off, a link to My locations", j(places) === j(["Office: Head office", "Home check-in: Off"])
    && (await n.t.getAttribute('#my-places a', "href")) === "/pages/account/my-locations.html", j(places));
  await n.ctx.close();
  n = await open("emp", "account/my-profile.html", { store: [DEV(2), TOKEN("a")] });
  s = await read(n.t);
  check("D3", "two devices, this one marked, \"2 of 2\", no limit warning (this one is registered)", s.meta === "2 of 2" && j(s.items) === j(["Edge on Windows This device Registered 20 Sep 2026, last used 27 Sep 2026", "Chrome on Android Registered 21 Sep 2026, last used 26 Sep 2026"]) && s.limit === null, j(s));
  await n.ctx.close();
  n = await open("emp", "account/my-profile.html", { store: [DEV(2), TOKEN("c")] });
  s = await read(n.t);
  check("D4", "a third browser: neither marked; the limit warning says check-ins are refused until an Admin resets", !s.items.some((i) => i.includes("This device")) && s.limit === "This device isn't registered and you already use 2. Check-ins from it are refused until an Admin resets your devices.", j(s));
  await n.ctx.close();
  n = await open("admin", "users/user-profile.html?id=EMP-1105", { store: [DEV(2)] });
  await n.t.click('#profile-devices button:has-text("Reset devices")');
  const q = await asked(n.t, true);
  const after = [await toast(n.t), await text(n.t, "#profile-devices .ds-card__body")];
  check("D5", "the Admin's reset on the user profile: asked, then the toast, none left", q === "Reset Arjun Kapoor's devices?\nTheir next check-in registers the device it comes from, up to 2." && after[0] === "Arjun Kapoor's devices were reset (2 devices removed)." && after[1] === "No devices registered yet.", j([q, after]));
  await n.ctx.close();
}

// ---------- Y ----------
if (ONLY.includes("Y")) {
  console.log("\n--- Y. An Admin's own change ---");
  const n = await open("admin", PAGE, { store: [HOME({ "EMP-1001": person(true, { ...PLACE_A, setBy: "EMP-1001", address: "3 Aralias, Gurugram" }) })] });
  await n.t.click('#home-permanent button:has-text("Request change")'); await settle(n.t, 350);
  const note = await text(n.t, "#change-form .ds-note");
  await n.t.fill("#change-address", "9 Magnolias, Gurugram"); await n.t.fill("#change-lat", "28.46"); await n.t.fill("#change-lng", "77.09"); await n.t.fill("#change-reason", "Moved");
  await n.t.click('button[form="change-form"]'); await settle(n.t, 400);
  const s = [await toast(n.t), await chip(n.t, "permanent"), (await rows(n.t, "#location-requests"))[0], (await rows(n.t, "#location-history"))[0]];
  check("Y1", "the dialog says it applies at once; sent: the toast, still \"Set\" (nothing waits), Approved by You, a Changed line",
    note === "You're an Admin: your own change applies at once and is kept in your history." && s[0] === "Permanent home changed. As an Admin, your own change applies at once; it's kept in your history." && s[1] === "Set"
    && s[2]?.[5] === "Approved" && s[2]?.[6] === "You, 28 Sep 2026" && j(s[3]) === j(["28 Sep 2026", "Changed: permanent home", "3 Aralias, Gurugram", "9 Magnolias, Gurugram", "You"]), j([note, s]));
  await n.ctx.close();
  const b = await open("admin", "requests/approvals-inbox.html", { store: [HOME({ "EMP-1001": person(true, PLACE_A) }), CHANGES([CHANGE({ userId: "EMP-1001" })])] });
  check("Y2", "an Admin's own waiting change (if one were left) isn't theirs to decide: no row", (await b.t.locator("#inbox-table tr[data-change-id]").count()) === 0);
  await b.ctx.close();
}

// ---------- K ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard ---");
  const n = await open("emp", PAGE, { store: [HOME({ "EMP-1105": person(true, PLACE_A) })] });
  await n.t.focus("#set-temporary-address");
  const order = [];
  for (let i = 0; i < 4; i++) { await n.t.keyboard.press("Tab"); order.push(await n.t.evaluate(() => document.activeElement.id || document.activeElement.textContent.trim())); }
  check("K1", "the set form in order: address, Use my current location, latitude, longitude, Save", j(order) === j(["set-temporary-locate", "set-temporary-lat", "set-temporary-lng", "Save temporary home"]), j(order));
  await n.t.focus('#home-permanent button:has-text("Request change")'); await n.t.keyboard.press("Enter"); await settle(n.t, 350);
  const first = await n.t.evaluate(() => document.activeElement.id);
  await n.t.keyboard.press("Escape"); await settle(n.t, 300);
  const closed = await n.t.evaluate(() => !document.querySelector("#change-modal.is-open"));
  const back = await n.t.evaluate(() => document.activeElement.textContent.trim());
  check("K2", "Request change by Enter: the dialog opens on its first field; Esc closes it and focus returns", first === "change-address" && closed && back === "Request change", j([first, closed, back]));
  await n.ctx.close();
  const a = await open("admin", "requests/approvals-inbox.html", { store: WAITING });
  await a.t.focus('#inbox-table tr[data-change-id="LC-1"] [data-card]'); await a.t.keyboard.press("Enter"); await settle(a.t, 300);
  check("K3", "an inbox location title opens its card by Enter", (await a.t.evaluate(() => document.getElementById("approval-card")?.dataset.kind)) === "locations");
  await a.ctx.close();
}

// ---------- W ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. 412 and 1280, light and dark ---");
  const cases = [["emp", PAGE, [HOME({ "EMP-1105": person(true, PLACE_A) }), CHANGES([CHANGE()])], "eligible"], ["mgr", PAGE, [], "off"], ["emp", "account/my-profile.html", [], "profile"], ["admin", "requests/approvals-inbox.html", WAITING, "inbox"]];
  for (const [who, page, store, tag] of cases)
    for (const width of [1280, 412]) for (const theme of ["light", "dark"]) {
      const n = await open(who, page, { width, theme, store });
      const ok = await n.t.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      check(`W.${tag}.${width}.${theme}`, `${page} (${tag}) at ${width}, ${theme}: no sideways scroll`, ok);
      await n.t.screenshot({ path: path.join(SHOTS, `locs-${tag}-${width}-${theme}.png`), fullPage: true, animations: "disabled" });
      await n.ctx.close();
    }
}

check("E", "no page or console errors", !errs.length, j(errs));
await browser.close();
console.log(`\nlocs: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
