// FS1's harness (msedge, headless): stored files in the React app. Read by meaning (words, attributes, storage), never by pixels.
// usage: node fs1.mjs <app dist> <repo root> <shots dir>   [ONLY=UVRPDSINKWCX]
// Clock: Fri 20 Nov 2026 10:00 IST. Files are made in the test (a small PDF, PNG and JPG; an SVG; files at and over the limits).
//   U  the claim form: choose a file (name, size, type, preview), refusals said under it and announced, Replace / Remove, send: kept in IndexedDB
//   V  who sees the claim's file: the claimant's manager in the approval card, HR and Finance on Expenses, the Admin and others "You don't have
//      access to this file."; old claims' text labelled "Entered as text"; View opens it (an image in a dialog), the audit trail has the view
//   R  the rules in the page: an SVG named .png, a web page named .pdf, 5 MB + 1 byte, 0 bytes, a double extension
//   P  the photo: added on My profile, shown in the header and on the profile; HR sees it on the person's profile; HR uploads one from the form
//   D  documents: HR adds a file on a document row; the person sees it; Finance can't open the profile's documents
//   S  sign-out and a change of person revoke every object URL made for files; the next person can't read the last one's
//   I  IndexedDB unavailable: a plain message and the claim isn't kept as sent
//   N  no "demo" wording on the changed pages
//   K  keyboard: the picker's buttons are reachable and labelled; the error is tied to it
//   W  no sideways scroll at 412 and 1280, light and dark, on the changed pages; shots
//   C  contrast of the picker's words, the "Entered as text" tag and the no-access line (4.5:1)
//   X  no page or console errors
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const EDGE = path.join(HERE, "..", "edge");
const { chromium } = createRequire(path.join(EDGE, "x.js"))("playwright-core");
const { useLocalFonts } = await import(new URL("file:///" + path.join(EDGE, "lib", "local-fonts.mjs").replace(/\\/g, "/")).href);
const [DIST, ROOT, SHOTS] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "UVRPDSINKWCX";
fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn("python", [path.join(HERE, "spa-serve.py"), "9978", DIST], { stdio: "ignore" });
const stop = () => { try { srv.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9978";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], fin: ["Kabir Shah", "EMP-1008"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"], rohan: ["Rohan Gupta", "EMP-1042"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const size = (w) => (w === 412 ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA } : { viewport: { width: w, height: 900 } });
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(8)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 500)}` : ""}`); };
const errs = [];
let expectGone = false;   // S3 reads a revoked URL on purpose: its failed load is the point
const NOW = "2026-11-20T10:00:00+05:30";
const j = JSON.stringify;
// files
const enc = (s) => Buffer.from(s, "latin1");
const PDF = enc("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
// a real 2x2 PNG (decodable, so the photo crop works)
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP8z8DwnwEJMDGgAQYAAP8VAgB2qZJmAAAAAElFTkSuQmCC", "base64");
const big = (n) => { const b = Buffer.alloc(n, 0x11); b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff; b[3] = 0xe0; b[n - 2] = 0xff; b[n - 1] = 0xd9; return b; };
const FILE = (name, buffer, mimeType = "application/octet-stream") => ({ name, mimeType, buffer });

async function make(who, { width = 1280, theme = "light", noIdb = false } = {}) {
  const ctx = await browser.newContext({ ...size(width), timezoneId: "Asia/Kolkata", colorScheme: theme });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(NOW));
  await ctx.addInitScript(([th, w, noIdb]) => {
    // count object URLs: made and revoked
    window.__made = []; window.__revoked = [];
    const mk = URL.createObjectURL.bind(URL), rv = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (o) => { const u = mk(o); window.__made.push(u); return u; };
    URL.revokeObjectURL = (u) => { window.__revoked.push(u); return rv(u); };
    if (noIdb) { try { Object.defineProperty(window, "indexedDB", { value: undefined, configurable: true }); } catch {} }
    if (localStorage.getItem("fs1:seeded")) return;
    localStorage.clear(); localStorage.setItem("fs1:seeded", "1");
    localStorage.setItem("officeos:prefs", JSON.stringify({ theme: th }));
    localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
    localStorage.setItem(`officeos:prefs:${w[1]}`, JSON.stringify({ theme: th }));
  }, [theme, WHO[who], noIdb]);
  const t = await ctx.newPage();
  t.on("pageerror", (e) => errs.push(`${who}: ${e.message}`));
  t.on("console", (m) => { if (m.type() === "error" && !/storage: failed/.test(m.text()) && !(expectGone && /ERR_FILE_NOT_FOUND/.test(m.text()))) errs.push(`${who}: console ${m.text()}`); });
  await t.goto(N + "/pages/auth/login.html"); await t.waitForLoadState("load");
  return { ctx, t, who };
}
async function go(n, page, who) {
  if (who) await n.t.evaluate((w) => { localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 })); }, WHO[who]);
  await n.t.goto(N + "/pages/" + page); await n.t.waitForLoadState("load");
  await n.t.evaluate(() => document.fonts.ready); await n.t.waitForTimeout(450);
}
const settle = (t, ms = 400) => t.waitForTimeout(ms);
const text = (t, sel) => t.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const bodyText = (t) => t.evaluate(() => document.querySelector("main")?.innerText.replace(/\s+/g, " ") ?? "");
const stored = (t, key) => t.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), key);
const idbKeys = (t) => t.evaluate(() => new Promise((res) => { const r = indexedDB.open("officeos-files", 1); r.onupgradeneeded = () => r.result.createObjectStore("blobs"); r.onsuccess = () => { const tx = r.result.transaction("blobs", "readonly").objectStore("blobs").getAllKeys(); tx.onsuccess = () => res(tx.result); tx.onerror = () => res(null); }; r.onerror = () => res(null); }));
const choose = async (t, scope, f) => { await t.locator(`${scope} [data-file-input]`).setInputFiles(f); await settle(t, 500); };
async function fillClaim(t, amount = "1200") {
  await t.selectOption("#expense-category", { index: 1 }); await t.fill("#expense-amount", amount); await t.fill("#expense-date", "2026-11-18"); await t.fill("#expense-reason", "Cab to the client office");
}

let claimId = null;
// ---------- U ----------
if (ONLY.includes("U")) {
  console.log("\n--- U. The claim form ---");
  const n = await make("emp");
  await go(n, "requests/claim-expense.html", "emp");
  check("U1", "the Receipt is a file picker: Choose a file, the types and limit, and no 'demo' words", await n.t.locator("#expense-receipt-choose").count() === 1 && /PDF, JPG or PNG, up to 5 MB/.test(await text(n.t, "#expense-receipt") ?? "") && !/demo/i.test(await bodyText(n.t)), await text(n.t, "#expense-receipt"));
  check("U2", "on a desktop it offers dropping a file, not a camera", /or drop a file here/.test(await text(n.t, "#expense-receipt") ?? "") && await n.t.locator("#expense-receipt-camera").count() === 0);
  await choose(n.t, "#expense-receipt", FILE("cab receipt.pdf", PDF, "application/pdf"));
  const chip = await text(n.t, "#expense-receipt .fp__file");
  check("U3", "chosen: the name, 'PDF', the size, Open, Replace and Remove", /cab receipt\.pdf/.test(chip ?? "") && /PDF, \d+ bytes/.test(chip) && /Open/.test(chip) && /Replace/.test(chip) && /Remove/.test(chip), chip);
  await n.t.getByRole("button", { name: /^Remove/ }).click(); await settle(n.t);
  check("U4", "Remove takes it back to Choose a file", await n.t.locator("#expense-receipt-choose").count() === 1);
  await choose(n.t, "#expense-receipt", FILE("slip.png", PNG, "image/png"));
  check("U5", "an image shows its thumbnail", await n.t.locator("#expense-receipt .fp__thumb").count() === 1 && /slip\.png/.test(await text(n.t, "#expense-receipt") ?? ""));
  await fillClaim(n.t);
  await n.t.click('#expense-form button[type="submit"]'); await settle(n.t, 1200);
  const files = await stored(n.t, "officeos:files"), claims = await stored(n.t, "officeos:expense-claims");
  const meta = files?.files?.[0];
  claimId = meta?.linkTo?.id;
  check("U6", "sent: the claim names the file, and the file is kept: a record (expense-payslip, PNG, its sha256, by Arjun) and the bytes in IndexedDB", meta && meta.kind === "expense-payslip" && meta.mime === "image/png" && meta.ownerId === "EMP-1105" && /^[0-9a-f]{64}$/.test(meta.sha256) && (await idbKeys(n.t))?.includes(meta.id) && JSON.stringify(claims).includes(claimId), j(meta));
  check("U7", "the record keeps no bytes (they are only in IndexedDB)", !JSON.stringify(files).includes("iVBOR") && !JSON.stringify(files).includes("PNG\\r"));
  await n.ctx.close();
}

// ---------- R ----------
if (ONLY.includes("R")) {
  console.log("\n--- R. The rules in the page ---");
  const n = await make("emp");
  await go(n, "requests/claim-expense.html", "emp");
  const err = () => text(n.t, "#expense-receipt-error");
  await choose(n.t, "#expense-receipt", FILE("photo.png", enc('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), "image/png"));
  check("R1", "an SVG named .png is refused under the picker, in words, announced (role alert)", /SVG image/.test(await err() ?? "") && await n.t.locator("#expense-receipt-error[role=alert]").count() === 1 && await n.t.locator("#expense-receipt .fp__file").count() === 0, await err());
  await choose(n.t, "#expense-receipt", FILE("invoice.pdf", enc("<!DOCTYPE html><html><script>x()</script></html>"), "application/pdf"));
  check("R2", "a web page named .pdf is refused", /web page/.test(await err() ?? ""), await err());
  await choose(n.t, "#expense-receipt", FILE("big.jpg", big(5 * 1024 * 1024 + 1), "image/jpeg"));
  check("R3", "5 MB + 1 byte is refused with the limit said", /limit is 5 MB/.test(await err() ?? ""), await err());
  await choose(n.t, "#expense-receipt", FILE("ok.jpg", big(5 * 1024 * 1024), "image/jpeg"));
  check("R4", "exactly 5 MB is accepted", /ok\.jpg/.test(await text(n.t, "#expense-receipt .fp__file") ?? "") && !(await err()));
  await n.t.getByRole("button", { name: /^Remove/ }).click(); await settle(n.t);
  await choose(n.t, "#expense-receipt", FILE("empty.pdf", Buffer.alloc(0), "application/pdf"));
  check("R5", "a zero-byte file is refused as empty", /empty/.test(await err() ?? ""), await err());
  await choose(n.t, "#expense-receipt", FILE("bill.exe.pdf", PDF, "application/pdf"));
  check("R6", "a double extension is refused", /two extensions/.test(await err() ?? ""), await err());
  check("R7", "the picker points at its error (aria-describedby)", (await n.t.getAttribute("#expense-receipt-choose", "aria-describedby"))?.includes("expense-receipt-error"));
  await n.ctx.close();
}

// ---------- V ----------
if (ONLY.includes("V")) {
  console.log("\n--- V. Who sees the claim's file ---");
  const n = await make("emp");
  await go(n, "requests/claim-expense.html", "emp");
  await choose(n.t, "#expense-receipt", FILE("cab.png", PNG, "image/png"));
  await fillClaim(n.t); await n.t.click('#expense-form button[type="submit"]'); await settle(n.t, 1200);
  // Sneha (his manager): the bell's card
  await go(n, "dashboard/employee.html", "mgr");
  await n.t.locator(".topbar__icon-btn--dot[aria-haspopup]").click(); await settle(n.t, 400);
  await n.t.locator("#bell-panel .bell-panel__item", { hasText: "Expense" }).first().click(); await settle(n.t, 500);
  const card = await text(n.t, "#approval-card") ?? "";
  check("V1", "the manager's approval card shows the file with View", /cab\.png/.test(card) && /View/.test(card), card.slice(0, 300));
  await n.t.locator("#approval-card").getByRole("button", { name: /^View/ }).first().click(); await settle(n.t, 800);
  check("V2", "View opens the image in a dialog through the checked path (a blob URL)", await n.t.locator("#file-viewer img").count() === 1 && /^blob:/.test(await n.t.getAttribute("#file-viewer img", "src") ?? ""));
  const ev = (await stored(n.t, "officeos:audit-trail"))?.events ?? [];
  check("V3", "the audit trail has the view: Sneha viewed Arjun's file, by id", ev.some((e) => e.kind === "file-viewed" && e.actorId === "EMP-1029" && e.userId === "EMP-1105" && /FL-\d+/.test(e.detail)));
  await n.t.keyboard.press("Escape"); await settle(n.t);
  // HR and Finance: Expenses
  for (const who of ["fin"]) {   // HR has no Expenses page (no expenses:view); HR's right to the file is checked in files.mjs
    await go(n, "finance/expenses.html", who);
    const cell = await n.t.locator("#expense-rows tr", { hasText: "₹1,200" }).first().innerText().catch(() => "");
    check(`V4.${who}`, `${who}: Expenses shows the file with View`, /cab\.png/.test(cell) && /View/.test(cell), cell.replace(/\s+/g, " ").slice(0, 200));
  }
  await go(n, "finance/expenses.html", "admin");
  const adminCell = await n.t.locator("#expense-rows tr", { hasText: "₹1,200" }).first().innerText().catch(() => "");
  check("V5", "the Admin sees 'You don't have access to this file.' (a ruling item), never a link", /You don't have access to this file\./.test(adminCell) && !/cab\.png/.test(adminCell), adminCell.replace(/\s+/g, " ").slice(0, 200));
  const old = await n.t.locator("#expense-rows .fv-old").first().innerText().catch(() => "");
  check("V6", "an old claim's receipt text shows labelled 'Entered as text'", /Entered as text/.test(old), old);
  await n.ctx.close();
}

// ---------- P ----------
if (ONLY.includes("P")) {
  console.log("\n--- P. The photo ---");
  const n = await make("emp");
  await go(n, "account/my-profile.html", "emp");
  const btn = n.t.locator("#photo-edit-btn");
  check("P1", "My profile's Photo has 'Add or change photo' and no 'later round' words", await btn.count() === 1 && !/later round|demo/i.test(await bodyText(n.t)));
  if (await btn.count()) {
    await btn.click(); await settle(n.t);
    await choose(n.t, "#photo-editor", FILE("me.png", PNG, "image/png")); await settle(n.t, 600);
    check("P2", "the dialog shows the square crop with Zoom and two position sliders", await n.t.locator("#photo-editor canvas").count() === 1 && await n.t.getByLabel("Zoom").count() === 1 && await n.t.getByLabel("Left to right").count() === 1);
    await n.t.getByRole("button", { name: "Save photo" }).click(); await settle(n.t, 1200);
    const files = (await stored(n.t, "officeos:files"))?.files ?? [];
    check("P3", "saved as Arjun's profile photo: a JPEG made from the crop", files.some((f) => f.kind === "profile-photo" && f.ownerId === "EMP-1105" && f.mime === "image/jpeg" && f.status === "active"), j(files.map((f) => [f.kind, f.mime, f.status])));
    await go(n, "account/my-profile.html", "emp");
    check("P4", "the header's avatar is the photo (an img), and so is the profile's", await n.t.locator(".topbar .avatar-photo img").count() === 1 && await n.t.locator(".profile .avatar-photo img, .pf-photo .avatar-photo img").count() >= 1);
    await go(n, "users/user-profile.html?id=EMP-1105", "hr");
    check("P5", "HR sees it on Arjun's profile", await n.t.locator(".profile-head .avatar-photo img").count() === 1);
    await go(n, "users/user-form.html?id=EMP-1042", "hr");
    check("P6", "the employee form's Upload photo is back (a real button, not a 'not available' one)", await n.t.locator("#upload-photo-btn").count() === 1 && !/not available/i.test(await bodyText(n.t)));
  }
  await n.ctx.close();
}

// ---------- D ----------
if (ONLY.includes("D")) {
  console.log("\n--- D. Documents ---");
  const n = await make("hr");
  await n.t.evaluate(() => { const box = { version: 1, people: { "EMP-1105": { documents: [{ type: "Passport", number: "M1234567", expiry: "2030-01-01" }, { type: "Bank passbook", number: "123456789012", expiry: "" }] } }, history: [], requests: [], nextReq: 1 }; localStorage.setItem("officeos:employee-records", JSON.stringify(box)); });
  await go(n, "users/user-profile.html?id=EMP-1105", "hr");
  const docs = n.t.locator('[data-list="documents"]');
  check("D1", "HR: the document rows have a File column with Add file", await docs.count() === 1 && /File/.test(await docs.locator("thead").innerText()) && await docs.getByRole("button", { name: /Add file/ }).count() === 2);
  await docs.getByRole("button", { name: /Add file/ }).first().click(); await settle(n.t);
  await choose(n.t, "#doc-file-modal", FILE("passport.pdf", PDF, "application/pdf"));
  await n.t.getByRole("button", { name: "Save file" }).click(); await settle(n.t, 1000);
  check("D2", "saved: the row shows passport.pdf with View, Replace, Remove", /passport\.pdf/.test(await docs.locator("tbody tr").first().innerText()) && await docs.locator("tbody tr").first().getByRole("button", { name: /^View/ }).count() === 1);
  await go(n, "account/my-profile.html", "emp");
  const mine = await n.t.locator('[data-list="documents"] tbody tr').first().innerText().catch(() => "");
  check("D3", "Arjun sees his document's file", /passport\.pdf/.test(mine), mine);
  await go(n, "users/user-profile.html?id=EMP-1105", "fin");
  check("D4", "Finance's view of Arjun has no documents list (Finance doesn't see personal fields)", await n.t.locator('[data-list="documents"]').count() === 0);
  await n.ctx.close();
}

// ---------- S ----------
if (ONLY.includes("S")) {
  console.log("\n--- S. Sign-out and a change of person ---");
  const n = await make("emp");
  await go(n, "requests/claim-expense.html", "emp");
  await choose(n.t, "#expense-receipt", FILE("cab.png", PNG, "image/png"));
  await fillClaim(n.t); await n.t.click('#expense-form button[type="submit"]'); await settle(n.t, 1200);
  await go(n, "account/my-profile.html", "emp");
  await n.t.locator("#photo-edit-btn").click(); await settle(n.t);
  await choose(n.t, "#photo-editor", FILE("me.png", PNG, "image/png")); await settle(n.t, 500);
  await n.t.getByRole("button", { name: "Save photo" }).click(); await settle(n.t, 1200);
  await go(n, "dashboard/employee.html", "emp");
  const photoUrl = await n.t.getAttribute(".topbar .avatar-photo img", "src");
  check("S1", "the header's photo is a blob URL made after the check", /^blob:/.test(photoUrl ?? ""));
  await n.t.locator('button[aria-label="Account menu"]').click(); await settle(n.t, 300);
  await n.t.getByRole("button", { name: /Sign out/ }).click().catch(async () => { await n.t.getByRole("link", { name: /Sign out/ }).click(); });
  await settle(n.t, 600);
  const rev = await n.t.evaluate(() => window.__revoked ?? []);
  check("S2", "signing out revoked the photo's object URL", rev.includes(photoUrl), j(rev.slice(-3)));
  // a change of person in the same tab (another person's session)
  const n2 = await make("emp");
  await go(n2, "dashboard/employee.html", "emp");
  const u1 = await n2.t.getAttribute(".topbar .avatar-photo img", "src").catch(() => null);
  await n2.ctx.close();
  await go(n, "dashboard/employee.html", "rohan");
  expectGone = true;
  const last = await n.t.evaluate(async (u) => { try { await fetch(u); return "readable"; } catch { return "gone"; } }, photoUrl);
  await settle(n.t, 200); expectGone = false;
  check("S3", "after the change of person Arjun's old URL can't be read in this tab, and Rohan's header shows no photo of Arjun's", last === "gone" && await n.t.locator(".topbar .avatar-photo img").count() === 0, last);
  await n.ctx.close();
}

// ---------- I ----------
if (ONLY.includes("I")) {
  console.log("\n--- I. IndexedDB unavailable ---");
  const n = await make("emp", { noIdb: true });
  await go(n, "requests/claim-expense.html", "emp");
  await choose(n.t, "#expense-receipt", FILE("cab.pdf", PDF, "application/pdf"));
  await fillClaim(n.t); await n.t.click('#expense-form button[type="submit"]'); await settle(n.t, 1200);
  const e = await text(n.t, "#expense-receipt-error");
  const claims = (await stored(n.t, "officeos:expense-claims"))?.records ?? (await stored(n.t, "officeos:expense-claims")) ?? [];
  check("I1", "a plain message says why ('private browsing or blocked site storage') and the claim wasn't sent", /wasn't sent/.test(e ?? "") && /private browsing/.test(e), e);
  check("I2", "the claim it made is cancelled, not left waiting with no file", JSON.stringify(claims).includes("cancelled"));
  await n.ctx.close();
}

// ---------- N, K, W, C ----------
const PAGES = [["emp", "requests/claim-expense.html", "claim"], ["hr", "finance/expenses.html", "expenses"], ["emp", "account/my-profile.html", "my-profile"], ["hr", "users/user-profile.html?id=EMP-1105", "profile"], ["hr", "users/user-form.html?id=EMP-1105", "form"], ["mgr", "requests/approvals-inbox.html", "inbox"]];
if (ONLY.includes("N")) {
  console.log("\n--- N. No demo wording ---");
  const n = await make("emp");
  for (const [who, page, name] of PAGES) { await go(n, page, who); const b = await n.t.evaluate(() => document.body.innerText); check(`N-${name}`, `${name}: no 'demo', 'not available' or 'a later round' words`, !/in this demo|not available in|later round|arrives with file storage/i.test(b), (b.match(/.{0,40}(demo|later round|not available).{0,40}/i) ?? [""])[0]); }
  await n.ctx.close();
}
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard ---");
  const n = await make("emp");
  await go(n, "requests/claim-expense.html", "emp");
  let reached = false;
  for (let i = 0; i < 30 && !reached; i++) { /* TD1 (behaviour; was 25: My to-do is one more sidebar link before the form) */ await n.t.keyboard.press("Tab"); reached = await n.t.evaluate(() => document.activeElement?.id === "expense-receipt-choose"); }
  check("K1", "Tab reaches 'Choose a file'; its name says Receipt and the hint is tied to it", reached && /Receipt/.test(await n.t.evaluate(() => { const b = document.getElementById("expense-receipt-choose"); return (b.getAttribute("aria-labelledby") ?? "").split(" ").map((id) => document.getElementById(id)?.innerText).join(" "); })) && (await n.t.getAttribute("#expense-receipt-choose", "aria-describedby"))?.includes("expense-receipt-hint"));
  check("K2", "the hidden file inputs are out of the Tab order", await n.t.evaluate(() => [...document.querySelectorAll("[data-file-input], [data-camera-input]")].every((x) => x.tabIndex === -1)));
  await n.ctx.close();
  const p = await make("emp", { width: 412 });
  await go(p, "requests/claim-expense.html", "emp");
  check("K3", "on a phone the picker also has 'Take a photo' (camera capture)", await p.t.locator("#expense-receipt-camera").count() === 1 && await p.t.locator("[data-camera-input][capture]").count() === 1);
  await p.ctx.close();
}
if (ONLY.includes("W")) {
  console.log("\n--- W. No sideways scroll ---");
  for (const [who, page, name] of PAGES) for (const w of [412, 1280]) for (const theme of ["light", "dark"]) {
    const n = await make(who, { width: w, theme });
    await go(n, page, who);
    const over = await n.t.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`W-${name}-${w}${theme[0]}`, `${name} at ${w} ${theme}: no sideways scroll`, over <= 1, over);
    await n.t.screenshot({ path: path.join(SHOTS, `${name}-${w}-${theme}.png`), fullPage: true });
    await n.ctx.close();
  }
}
if (ONLY.includes("C")) {
  console.log("\n--- C. Contrast ---");
  for (const theme of ["light", "dark"]) {
    const n = await make("hr", { theme });
    await go(n, "finance/expenses.html", "hr");
    const low = await n.t.evaluate(() => {
      const cv = document.createElement("canvas"); cv.width = cv.height = 1; const g = cv.getContext("2d", { willReadFrequently: true });
      const rgba = (c) => { g.clearRect(0, 0, 1, 1); g.fillStyle = "#000"; g.fillStyle = c; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
      const over = (t, b) => { const a = t[3] + b[3] * (1 - t[3]); return [0, 1, 2].map((i) => (t[i] * t[3] + b[i] * b[3] * (1 - t[3])) / a).concat(a); };
      const bg = (e) => { const ls = []; for (let p = e; p; p = p.parentElement) { const c = rgba(getComputedStyle(p).backgroundColor); ls.push(c); if (c[3] >= 1) break; } let acc = [255, 255, 255, 1]; for (const c of ls.reverse()) acc = over(c, acc); return acc; };
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      return [...document.querySelectorAll(".fv-old__tag, .fv-none, .fp__name, .fp__sub, .fv .ds-btn")].map((e) => { const b = bg(e), f = over(rgba(getComputedStyle(e).color), b); const l1 = lum(f), l2 = lum(b); return [(Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), e.className]; }).filter(([r]) => r < 4.5);
    });
    check(`C-${theme}`, `${theme}: the file words, the tag and the buttons are 4.5:1 or more`, low.length === 0, j(low.slice(0, 4)));
    await n.ctx.close();
  }
}

check("X1", "no page or console errors", errs.length === 0, errs.slice(0, 3).join(" | "));
await browser.close(); stop();
console.log(`\npassed ${passed}, failed ${failed}`);
process.exit(failed ? 1 : 0);