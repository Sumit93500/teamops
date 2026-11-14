// L3's harness (msedge, headless): Mark attendance with the place check, and where check-ins came from on My attendance, Team
// attendance and the HR dashboard. New screens, read by meaning (ids, labels, words, cells, dialogs, toasts), never by CSS.
// usage: node att3.mjs <app dist> <pristine tree> <shots dir>   [ONLY=MGDPTCHXKWE]
// Geolocation is mocked per context; the clock is fixed at Mon 28 Sep 2026 09:20 local (check-in open, not late) in each zone.
//   M  the page as it opens: status, Check-In From (only allowed places), Use my location, the status line, the device line, the
//      button off until a reading allows it, the privacy line
//   G  the readings, in India, UTC and Los Angeles time: inside (distance and radius), exactly at the radius (inside), just
//      outside, far outside, bad accuracy (retry words, button off), permission denied, no location in the browser; then a
//      check-in from inside: toast, the status, today's place and distance, a registered device
//   D  devices: a new device registers on check-in; the limit reached (button off, the words); a device registered to someone
//      else checks in but is flagged
//   P  places: home not set (only the office listed); not home-eligible (only the office); home set (office and home, WFH from
//      home); a branch employee (the branch, not the head office: the head office is "outside")
//   T  check-out: same place (not flagged); a different place shows the flagged notice and asks first, then flags the day
//   H  the views: My attendance's Place column and Flagged badge, its flagged filter; Team attendance's Place column, Flagged
//      badge and filter (HR sees everyone, a manager only their reports); the HR dashboard's flagged check-ins
//   C  (L4) the chosen place with an office and a home that overlap: the record names the place chosen, not the nearer one;
//      Check-Out From shows the check-in's place and a check-out there isn't flagged; a check-out elsewhere still asks and flags
//   X  (L4) Team attendance's Export: Place in words and a Flagged column (Yes / No), Status without the flag; the page's own
//      table unchanged; the Flagged filter narrows the file; a manager has no Export
//   K  keyboard: Check-In From, Use my location and Check in in order; Enter checks in
//   W  412 and 1280, light and dark: Mark attendance (ready to check in, and flagged check-out), My attendance, Team attendance:
//      no sideways scroll; shots
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
const ONLY = process.env.ONLY ?? "MGDPTCHXKWE";
fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const srvN = spawn("python", [path.join(HERE, "spa-serve.py"), "9988", DIST], { stdio: "ignore" });
const stop = () => { try { srvN.kill(); } catch {} };
process.on("exit", stop); process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
const N = "http://127.0.0.1:9988";
for (let i = 0; i < 60; i++) { try { if ((await fetch(N + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const WHO = { admin: ["Aarav Mehta", "EMP-1001"], hr: ["Priya Nair", "EMP-1003"], emp: ["Arjun Kapoor", "EMP-1105"], mgr: ["Sneha Rao", "EMP-1029"], rohan: ["Rohan Gupta", "EMP-1042"] };
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const SIZES = { 412: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA }, 1280: { viewport: { width: 1280, height: 900 } } };
const ZONES = { "Asia/Kolkata": "+05:30", UTC: "Z", "America/Los_Angeles": "-07:00" };
const PRIVACY = "Your location is read only when you check in or out, never in the background.";
const PAGE = "attendance/mark-attendance.html";
const HEAD = { lat: 28.4523, lng: 77.0723 };
const M_PER_DEG = (6371008.8 * Math.PI) / 180;   // metres per degree of latitude (the store's mean radius)
const north = (p, m) => ({ latitude: p.lat + m / M_PER_DEG, longitude: p.lng });
const HOME_A = { address: "12 MG Road, Gurugram", lat: 28.48, lng: 77.08, setAt: "2026-09-01T04:00:00.000Z", setBy: "EMP-1105" };
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu", "--disable-partial-raster"] });
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(18)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 700)}` : ""}`); };
const j = JSON.stringify;
const errs = [];
const fmt = (m) => `${Number(m).toLocaleString("en-IN")} m`;
// F1: the place line says the check's answer: metres under 1 km, else km to one decimal
const far = (m) => (m < 1000 ? fmt(m) : `${(m / 1000).toLocaleString("en-IN", { maximumFractionDigits: 1 })} km`);
const okLine = (m, place, verb = "check-in") => `You are ${far(m)} from ${place}, ${verb} allowed`;
const noLine = (m, place, r, verb = "check-in") => `You are ${far(m)} from ${place} (limit ${r} m), ${verb} not allowed`;

const HOMES = (people) => ["officeos:home-locations", JSON.stringify({ version: 1, people })];
const person = (eligible, permanent = null) => ({ homeEligible: eligible, permanent, temporary: null, history: [] });
const TOKEN = (c) => ["officeos:device-token", JSON.stringify({ token: c.repeat(32), createdAt: "2026-09-20T04:00:00.000Z" })];
const DEVICES = (recs) => ["officeos:devices", JSON.stringify({ version: 1, nextNum: recs.length + 1, records: recs.map((r, i) => ({ id: `DEV-${i + 1}`, label: "Edge on Windows", registeredAt: "2026-09-20T04:00:00.000Z", lastUsedAt: "2026-09-27T04:00:00.000Z", ...r })) })];
const BRANCH = ["officeos:offices", JSON.stringify({ version: 1, nextNum: 3, assignments: { "EMP-1105": "OFF-2" }, records: [
  { id: "OFF-1", name: "Head office", type: "head", address: "Sector 44, Gurugram, Haryana 122003", state: "Haryana", lat: HEAD.lat, lng: HEAD.lng, radiusM: 150, active: true, sample: true, note: "Sample coordinates: set the real location." },
  { id: "OFF-2", name: "Pune branch", type: "branch", address: "Hinjewadi Phase 1, Pune 411057", state: "Maharashtra", lat: 18.5913, lng: 73.7389, radiusM: 200, active: true, sample: false, note: "" }] })];

async function open(who, page, { width = 1280, theme = "light", store = [], geo = null, deny = false, zone = "Asia/Kolkata", at = "09:20", noGeo = false } = {}) {
  const ctx = await browser.newContext({ ...SIZES[width], timezoneId: zone, ...(geo ? { geolocation: { accuracy: 20, ...geo }, permissions: ["geolocation"] } : {}) });
  await useLocalFonts(ctx);
  await ctx.clock.setFixedTime(new Date(`2026-09-28T${at}:00${ZONES[zone]}`));
  await ctx.addInitScript(([w, th, st, ng]) => {
    if (ng) Object.defineProperty(Navigator.prototype, "geolocation", { get: () => undefined, configurable: true });
    if (sessionStorage.getItem("u-set")) return;
    sessionStorage.setItem("u-set", "1"); localStorage.clear();
    localStorage.setItem("officeos:theme", JSON.stringify(th));
    localStorage.setItem("officeos:session", JSON.stringify({ userLabel: w[0], employeeId: w[1], signedInAt: 1790000000000 }));
    for (const [k, v] of st) localStorage.setItem(k, v);
  }, [WHO[who], theme, store, noGeo]);
  if (deny) await ctx.clearPermissions();
  const t = await ctx.newPage();
  t.on("pageerror", (e) => errs.push(`${who} ${page}: ${e.message}`));
  t.on("console", (m) => { if (m.type() === "error") errs.push(`${who} ${page}: console ${m.text()}`); });
  await t.goto(N + "/pages/" + page); await t.waitForLoadState("load"); await t.evaluate(() => document.fonts.ready); await t.waitForTimeout(400);
  return { ctx, t };
}
const settle = (t, ms = 250) => t.waitForTimeout(ms);
const toast = async (t) => (await t.evaluate(() => [...document.querySelectorAll(".toast .toast__text")].map((e) => e.textContent.trim()))).at(-1) ?? null;
const text = (t, sel) => t.evaluate((sel) => { const e = document.querySelector(sel); return e && !e.hidden ? e.innerText.replace(/\s+/g, " ").trim() : null; }, sel);
const stored = (t, key) => t.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), key);
const state = (t) => t.evaluate(() => {
  const tx = (s) => (s ? s.innerText.replace(/\s+/g, " ").trim() : null);
  const sel = document.getElementById("checkin-from");
  const btn = document.getElementById("check-in-btn") ?? document.getElementById("check-out-btn");
  return { status: tx(document.getElementById("punch-status")), label: sel ? document.querySelector('label[for="checkin-from"]').textContent : null, options: sel ? [...sel.options].map((o) => o.textContent) : null, value: sel?.value ?? null,
    locate: tx(document.getElementById("locate-btn")), line: tx(document.getElementById("place-status")), device: tx(document.getElementById("device-status")),
    button: btn ? [btn.id, btn.textContent.trim(), btn.disabled] : null, error: tx(document.getElementById("punch-error")), flag: tx(document.getElementById("flag-notice")),
    privacy: [...document.querySelectorAll("main .ds-privacy")].map((p) => p.textContent).includes("Your location is read only when you check in or out, never in the background.") };
});
async function locate(t) { await t.click("#locate-btn"); await settle(t, 500); return state(t); }
async function asked(t, yes) {
  await t.waitForSelector(".confirm-dialog", { timeout: 3000 }).catch(() => {});
  const q = await t.evaluate(() => [...document.querySelectorAll(".confirm-dialog .modal__title, .confirm-dialog .modal__desc")].map((p) => p.textContent).join("\n"));
  await t.click(yes ? "[data-confirm-ok]" : "[data-confirm-cancel]").catch(() => {});
  await settle(t, 350);
  return q;
}

// ---------- M ----------
if (ONLY.includes("M")) {
  console.log("\n--- M. As it opens ---");
  const n = await open("emp", PAGE, { geo: north(HEAD, 40) });
  const s = await state(n.t);
  check("M1", "employee: not checked in yet; Check-In From lists only the head office (with its radius); Use my location; the line says to press it; a new device (0 of 2); Check in off; the privacy line",
    s.status === "Not checked in yet" && s.label === "Check-In From" && j(s.options) === j(["Head office (150 m)"]) && s.locate === "Use my location"
    && s.line === "Press Use my location. It's read once, now, to check you're at the place you chose." && s.device === "New device. Checking in registers this browser (0 of 2 used)."
    && j(s.button) === j(["check-in-btn", "Check in", true]) && s.privacy, j(s));
  check("M2", "nothing was read or written by opening the page (no device token made)", (await stored(n.t, "officeos:device-token")) === null);
  await n.ctx.close();
}

// ---------- G ----------
if (ONLY.includes("G")) {
  console.log("\n--- G. Readings, in three time zones ---");
  for (const zone of Object.keys(ZONES)) {
    const z = zone.split("/").pop();
    const cases = [["inside", north(HEAD, 40), 20], ["edge", north(HEAD, 150), 20], ["just-out", north(HEAD, 151.2), 20], ["far", north(HEAD, 5000), 20], ["inaccurate", north(HEAD, 10), 180]];
    for (const [name, pos, acc] of cases) {
      const n = await open("emp", PAGE, { zone, geo: { ...pos, accuracy: acc } });
      const s = await locate(n.t);
      const d = Math.round(Math.abs(pos.latitude - HEAD.lat) * M_PER_DEG);
      const want = name === "inaccurate" ? [`Your location is only accurate to within ${fmt(acc)}; it needs to be within 100 m. Move near a window or outdoors, then press Use my location again.`, true, "Try again"]
        : d <= 150 ? [okLine(d, "Head office"), false, "Use my location"] : [noLine(d, "Head office", 150), true, "Use my location"];
      check(`G1.${z}.${name}`, `${zone}, ${name} (${d} m, accuracy ${acc} m): the line, the button ${want[1] ? "off" : "on"}`, s.line === want[0] && s.button[2] === want[1] && s.locate === want[2], j([s.line, s.button, s.locate]));
      await n.ctx.close();
    }
    const dn = await open("emp", PAGE, { zone, deny: true });
    const sd = await locate(dn.t);
    check(`G2.${z}.denied`, `${zone}: permission denied says how to allow it; button off`, sd.line === "Location is blocked for this site. Allow it in your browser's site settings, then press Use my location again." && sd.button[2], j(sd));
    await dn.ctx.close();
    const un = await open("emp", PAGE, { zone, noGeo: true });
    const su = await locate(un.t);
    check(`G3.${z}.unsupported`, `${zone}: a browser without location says to use another; button off`, su.line === "This browser can't share its location, so you can't check in from it. Use another browser, or your phone." && su.button[2], j(su));
    await un.ctx.close();
    const n = await open("emp", PAGE, { zone, geo: north(HEAD, 40) });
    await locate(n.t);
    await n.t.click("#check-in-btn"); await settle(n.t, 400);
    const after = await state(n.t);
    const today = await n.t.evaluate(() => [document.getElementById("stat-check-in")?.textContent, document.getElementById("stat-check-in-place")?.textContent]);
    const rec = (await stored(n.t, "officeos:attendance")).records.find((r) => r.userId === "EMP-1105" && r.date === "2026-09-28");
    const dev = await stored(n.t, "officeos:devices");
    check(`G4.${z}.checkin`, `${zone}: checked in from inside at 09:20 local: the toast, "Checked in at 09:20", from Head office 40 m; the record has the place and distance; this browser registered; now Check out`,
      (await toast(n.t)) === "Checked in from Head office." && after.status === "Checked in at 09:20" && j(today) === j(["09:20", "Head office, 40 m"]) && rec?.checkInPlace === "head" && rec.checkInDistanceM === 40
      && !rec.flagged && dev?.records.length === 1 && after.button?.[0] === "check-out-btn" && after.label === "Check-Out From", j([after, today, rec && { p: rec.checkInPlace, d: rec.checkInDistanceM }]));
    await n.ctx.close();
  }
}

// ---------- D ----------
if (ONLY.includes("D")) {
  console.log("\n--- D. Devices ---");
  let n = await open("emp", PAGE, { geo: north(HEAD, 40), store: [TOKEN("c"), DEVICES([{ userId: "EMP-1105", token: "a".repeat(32) }, { userId: "EMP-1105", token: "b".repeat(32), label: "Chrome on Android" }])] });
  let s = await locate(n.t);
  check("D1", "the limit reached: the device line says so and whom to ask; Check in stays off though the place is fine",
    s.device === "Device limit reached. You already use 2 devices. Ask an Admin to reset yours to check in from this one." && s.button[2] === true && s.line === okLine(40, "Head office"), j(s));
  await n.ctx.close();
  n = await open("emp", PAGE, { geo: north(HEAD, 40), store: [TOKEN("a"), DEVICES([{ userId: "EMP-1105", token: "a".repeat(32) }])] });
  s = await state(n.t);
  check("D2", "a registered device: \"Registered device. This browser is one of your devices.\"", s.device === "Registered device. This browser is one of your devices.", s.device);
  await n.ctx.close();
  n = await open("emp", PAGE, { geo: north(HEAD, 40), store: [TOKEN("a"), DEVICES([{ userId: "EMP-1029", token: "a".repeat(32) }])] });
  s = await locate(n.t);
  await n.t.click("#check-in-btn"); await settle(n.t, 400);
  const rec = (await stored(n.t, "officeos:attendance")).records.find((r) => r.userId === "EMP-1105" && r.date === "2026-09-28");
  check("D3", "a device registered to someone else: the line warns; the check-in goes through, flagged \"shared-device\" (toast says so)",
    s.device === "New device. Checking in registers this browser (0 of 2 used). It's also registered to another employee, so check-ins from it are flagged for HR." && rec?.flagged === true && j(rec.flagReasons) === j(["shared-device"])
    && (await toast(n.t)) === "Checked in from Head office. Flagged for HR: this device is registered to someone else too.", j([s.device, rec?.flagReasons]));
  await n.ctx.close();
}

// ---------- P ----------
if (ONLY.includes("P")) {
  console.log("\n--- P. Places ---");
  let n = await open("emp", PAGE, { store: [HOMES({ "EMP-1105": person(true) })] });
  check("P1", "home-eligible, no home set: only the office is listed", j((await state(n.t)).options) === j(["Head office (150 m)"]));
  await n.ctx.close();
  n = await open("emp", PAGE, { store: [HOMES({ "EMP-1105": person(true, HOME_A) })], geo: { latitude: HOME_A.lat + 30 / M_PER_DEG, longitude: HOME_A.lng } });
  let s = await state(n.t);
  check("P2", "home set: the office and your permanent home", j(s.options) === j(["Head office (150 m)", "your permanent home (150 m)"]), j(s.options));
  await n.t.selectOption("#checkin-from", "homePermanent"); s = await locate(n.t);
  await n.t.click("#check-in-btn"); await settle(n.t, 400);
  const rec = (await stored(n.t, "officeos:attendance")).records.find((r) => r.userId === "EMP-1105" && r.date === "2026-09-28");
  check("P3", "from home: \"30 m from your permanent home\"; checked in as work from home, the place stamped",
    s.line === okLine(30, "your permanent home") && rec?.mode === "wfh" && rec.checkInPlace === "homePermanent" && (await text(n.t, "#stat-check-in")) === "09:20 (WFH)", j([s.line, rec?.mode, rec?.checkInPlace]));
  await n.ctx.close();
  n = await open("emp", PAGE, { store: [BRANCH], geo: north(HEAD, 20) });
  s = await locate(n.t);
  check("P4", "a branch employee: only the Pune branch is listed; at the head office they're far outside it, Check in off",
    j(s.options) === j(["Pune branch (200 m)"]) && /^You are [\d,.]+ km from Pune branch \(limit 200 m\), check-in not allowed$/.test(s.line) && s.button[2], j(s));
  await n.ctx.close();
  n = await open("emp", PAGE, { store: [BRANCH], geo: { latitude: 18.5913 + 100 / M_PER_DEG, longitude: 73.7389 } });
  s = await locate(n.t);
  check("P5", "at the branch: inside its 200 m radius, Check in on", s.line === okLine(100, "Pune branch") && !s.button[2], j(s));
  await n.ctx.close();
}

// ---------- T ----------
if (ONLY.includes("T")) {
  console.log("\n--- T. Check-out ---");
  let n = await open("emp", PAGE, { geo: north(HEAD, 40) });
  await locate(n.t); await n.t.click("#check-in-btn"); await settle(n.t, 400);
  let s = await locate(n.t);
  check("T1", "same place: no flagged notice, Check out on", s.flag === null && s.button[0] === "check-out-btn" && !s.button[2], j(s));
  await n.t.click("#check-out-btn"); await settle(n.t, 400);
  let rec = (await stored(n.t, "officeos:attendance")).records.find((r) => r.userId === "EMP-1105" && r.date === "2026-09-28");
  check("T2", "checked out: \"Checked out.\", not flagged, the check-out place stamped", (await toast(n.t)) === "Checked out." && rec?.checkOutPlace === "head" && !rec.flagged && (await text(n.t, "#punch-status")) === "Checked out at 09:20", j(rec));
  await n.ctx.close();
  n = await open("emp", PAGE, { store: [HOMES({ "EMP-1105": person(true, HOME_A) })], geo: north(HEAD, 40) });
  await locate(n.t); await n.t.click("#check-in-btn"); await settle(n.t, 400);
  await n.ctx.setGeolocation({ latitude: HOME_A.lat, longitude: HOME_A.lng, accuracy: 15 });
  s = await locate(n.t);
  check("T3", "from home after an office check-in: the flagged notice before confirming",
    s.flag === "Flagged: you checked in at Head office and you're at your permanent home now. Checking out here flags the day for HR." && s.button[0] === "check-out-btn" && !s.button[2], j(s));
  await n.t.click("#check-out-btn");
  const q = await asked(n.t, false);
  rec = (await stored(n.t, "officeos:attendance")).records.find((r) => r.userId === "EMP-1105" && r.date === "2026-09-28");
  check("T4", "Check out asks first (the places, flagged for HR); No leaves it checked in", q === "Check out from your permanent home?\nYou checked in at Head office. A check-out from another place is flagged for HR to look at." && !rec.checkOut, j([q, rec?.checkOut]));
  await n.t.click("#check-out-btn"); await asked(n.t, true);
  rec = (await stored(n.t, "officeos:attendance")).records.find((r) => r.userId === "EMP-1105" && r.date === "2026-09-28");
  check("T5", "Yes: checked out, flagged \"place-changed\"; the toast says why", rec?.checkOut === "09:20" && rec.flagged && rec.flagReasons.includes("place-changed") && (await toast(n.t)) === "Checked out. Flagged for HR: a different place than your check-in.", j(rec));
  const keep = await n.t.evaluate(() => [localStorage.getItem("officeos:attendance"), localStorage.getItem("officeos:home-locations"), localStorage.getItem("officeos:devices")]);
  fs.writeFileSync(path.join(SHOTS, "flagged-store.json"), JSON.stringify(keep));
  await n.ctx.close();
}

// ---------- H ----------
if (ONLY.includes("H")) {
  console.log("\n--- H. My attendance, Team attendance, HR dashboard ---");
  const keepFile = path.join(SHOTS, "flagged-store.json");
  const keep = fs.existsSync(keepFile) ? JSON.parse(fs.readFileSync(keepFile, "utf8")) : null;
  const store = keep ? [["officeos:attendance", keep[0]], ["officeos:home-locations", keep[1]], ["officeos:devices", keep[2]]] : [];
  check("H0", "the flagged day from T is there to read", Boolean(keep));
  let n = await open("emp", "attendance/my-attendance.html", { store, at: "18:00" });
  const log = await n.t.evaluate(() => { const tb = document.querySelector("#daily-log table"); return { head: [...tb.querySelectorAll("thead th")].map((h) => h.textContent.trim()), first: [...tb.querySelector("tbody tr").cells].map((c) => c.innerText.replace(/\s+/g, " ").trim()) }; });
  check("H1", "My attendance: a Place column after Check-in; today's row: Head office 40 m, out at your permanent home; Flagged beside the status",
    j(log.head.slice(0, 4)) === j(["Date", "Check-in", "Place", "Check-out"]) && log.first[2].startsWith("Head office 40 m Out: Permanent home") && /Flagged/.test(log.first[5]), j(log));
  const rowsBefore = await n.t.evaluate(() => document.querySelectorAll("#daily-log tbody tr").length);
  await n.t.check("#log-flagged"); await settle(n.t);
  const rowsAfter = await n.t.evaluate(() => [...document.querySelectorAll("#daily-log tbody tr")].map((r) => r.dataset.date));
  check("H2", "My attendance: Flagged only narrows the log to the flagged day", rowsBefore > 1 && j(rowsAfter) === j(["2026-09-28"]), j([rowsBefore, rowsAfter]));
  await n.ctx.close();
  for (const who of ["hr", "mgr", "admin"]) {
    n = await open(who, "attendance/team-attendance.html", { store, at: "18:00" });
    const t = await n.t.evaluate(() => { const tb = document.querySelector("#team-table") ?? document.querySelector("main table"); const head = [...tb.querySelectorAll("thead th")].map((h) => h.innerText.replace(/\s+/g, " ").trim());
      const row = [...tb.querySelectorAll("tbody tr")].find((r) => r.innerText.includes("Arjun Kapoor")); return { head, row: row ? [...row.cells].map((c) => c.innerText.replace(/\s+/g, " ").trim()) : null, n: tb.querySelectorAll("tbody tr").length }; });
    check(`H3.${who}`, `${who}: Team attendance has a Place column; Arjun's row shows Head office and Flagged`, t.head.includes("Place") && t.row && t.row.some((c) => c.startsWith("Head office 40 m")) && t.row.some((c) => /Flagged/.test(c)), j(t));
    await n.t.selectOption("#team-flag", "flagged"); await settle(n.t);
    const flagged = await n.t.evaluate(() => [...document.querySelectorAll("main table tbody tr")].map((r) => r.innerText.replace(/\s+/g, " ").trim().slice(0, 30)));
    check(`H4.${who}`, `${who}: the Flagged filter leaves Arjun only`, flagged.length === 1 && flagged[0].includes("Arjun Kapoor"), j(flagged));
    await n.ctx.close();
  }
  n = await open("emp", "attendance/my-attendance.html", { store, at: "18:00", width: 412 });
  const phoneCard = await n.t.evaluate(() => [...document.querySelector("#daily-log tbody tr").cells].map((c) => `${c.dataset.label}|${c.dataset.cardPart}|${getComputedStyle(c).display}`));
  check("H8", "My attendance at 412: the card shows Date, Check-in and Place up front, the status, Check-out and Hours in Details", j(phoneCard.slice(0, 3)) === j(["Date|primary|block", "Check-in|key|block", "Place|key|block"]) && phoneCard.some((c) => c.startsWith("Check-out|")), j(phoneCard));
  await n.ctx.close();
  n = await open("rohan", "attendance/team-attendance.html", { store, at: "18:00" });
  check("H5", "someone without reports or attendance:view-all can't open Team attendance (the manager rule)", (await n.t.evaluate(() => location.pathname)) === "/pages/errors/403.html");
  await n.ctx.close();
  n = await open("hr", "dashboard/hr.html", { store, at: "18:00" });
  const card = await n.t.evaluate(() => { const c = document.getElementById("flagged-card"); return c ? [...c.querySelectorAll("tbody tr")].map((r) => [...r.cells].map((x) => x.innerText.replace(/\s+/g, " ").trim())) : null; });
  check("H6", "HR dashboard: Flagged check-ins lists Arjun's day with both places and why", j(card?.[0]?.slice(0, 2)) === j(["Arjun Kapoor", "28 Sep"]) && card[0].join(" ").includes("Checked out from a different place"), j(card));
  await n.ctx.close();
  n = await open("hr", "dashboard/hr.html", { at: "18:00" });
  check("H7", "HR dashboard with nothing flagged: the empty words", (await text(n.t, "#flagged-card tbody")) === "No flagged check-ins in the last 7 days.", await text(n.t, "#flagged-card tbody"));
  await n.ctx.close();
}

// ---------- C (L4) ----------
if (ONLY.includes("C")) {
  console.log("\n--- C. The chosen place (overlapping places) ---");
  const NEAR = { address: "Next to the office, Gurugram", lat: HEAD.lat + 100 / M_PER_DEG, lng: HEAD.lng, setAt: "2026-09-01T04:00:00.000Z", setBy: "EMP-1105" };   // 100 m north: overlaps the office
  const store = [HOMES({ "EMP-1105": person(true, NEAR) })];
  const today = async (t) => (await stored(t, "officeos:attendance")).records.find((r) => r.userId === "EMP-1105" && r.date === "2026-09-28");
  let n = await open("emp", PAGE, { store, geo: north(HEAD, 60) });   // 60 m from the office, 40 m from home
  let s = await locate(n.t);
  check("C1", "inside both, the office chosen: the line measures the office (60 m)", s.value === "head" && s.line === okLine(60, "Head office") && !s.button[2], j(s));
  await n.t.click("#check-in-btn"); await settle(n.t, 400);
  let rec = await today(n.t);
  check("C2", "checked in: the record names the chosen office (60 m), not the nearer home; office work; the toast says Head office",
    rec?.checkInPlace === "head" && rec.checkInDistanceM === 60 && rec.mode === "office" && (await toast(n.t)) === "Checked in from Head office.", j(rec));
  s = await locate(n.t);
  check("C3", "check-out in the overlap: Check-Out From shows the check-in's place, no flagged notice, Check out on",
    s.label === "Check-Out From" && s.value === "head" && s.flag === null && s.line === okLine(60, "Head office", "check-out") && !s.button[2], j(s));
  await n.t.click("#check-out-btn"); await settle(n.t, 400);
  rec = await today(n.t);
  check("C4", "checked out at the office, not flagged (the nearer home isn't taken for a move)", rec?.checkOutPlace === "head" && rec.flagged === false && (await toast(n.t)) === "Checked out.", j(rec));
  await n.ctx.close();
  n = await open("emp", PAGE, { store, geo: north(HEAD, 60) });
  await n.t.selectOption("#checkin-from", "homePermanent"); s = await locate(n.t);
  check("C5", "inside both, home chosen: the line measures home (40 m)", s.line === okLine(40, "your permanent home") && !s.button[2], j(s));
  await n.t.click("#check-in-btn"); await settle(n.t, 400);
  rec = await today(n.t);
  check("C6", "checked in: the record names home (40 m), work from home", rec?.checkInPlace === "homePermanent" && rec.checkInDistanceM === 40 && rec.mode === "wfh", j(rec));
  await n.ctx.setGeolocation({ ...north(HEAD, -100), accuracy: 15 });   // 100 m south: the office only (home is 200 m away)
  s = await locate(n.t);
  check("C7", "then at the office only: Check-Out From shows home; the line says where the check-out counts (the office, 100 m, allowed: F1); the flagged notice names the office",
    s.value === "homePermanent" && s.line === okLine(100, "Head office", "check-out") && s.flag === "Flagged: you checked in at Permanent home and you're at Head office now. Checking out here flags the day for HR." && !s.button[2], j(s));
  await n.t.click("#check-out-btn"); await asked(n.t, true);
  rec = await today(n.t);
  check("C8", "a check-out at another of your places still works when asked: the office named, flagged place-changed", rec?.checkOutPlace === "head" && rec.flagged && rec.flagReasons.includes("place-changed"), j(rec));
  await n.ctx.close();
}

// ---------- X (L4) ----------
if (ONLY.includes("X")) {
  console.log("\n--- X. Team attendance Export: Place and Flagged ---");
  const keepFile = path.join(SHOTS, "flagged-store.json");
  const keep = fs.existsSync(keepFile) ? JSON.parse(fs.readFileSync(keepFile, "utf8")) : null;
  const store = keep ? [["officeos:attendance", keep[0]], ["officeos:home-locations", keep[1]], ["officeos:devices", keep[2]]] : [];
  check("X0", "the flagged day from T is there to read", Boolean(keep));
  const csv = (s) => s.replace(/^﻿/, "").split("\r\n").map((line) => { const out = []; let cur = "", q = false;
    for (let i = 0; i < line.length; i++) { const c = line[i]; if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; } else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c; }
    out.push(cur); return out; });
  const grab = async (t) => { const got = []; t.on("download", async (dl) => got.push([dl.suggestedFilename(), fs.readFileSync(await dl.path(), "utf8")])); await t.click("main button[data-export]"); await t.waitForTimeout(1500); return got; };
  for (const who of ["hr", "admin"]) {
    const n = await open(who, "attendance/team-attendance.html", { store, at: "18:00" });
    const files = await grab(n.t);
    const rows = files.length === 1 ? csv(files[0][1]) : [];
    const head = rows[0] ?? [];
    const col = (name) => head.indexOf(name);
    const arjun = rows.find((r) => r[0] === "Arjun Kapoor");
    check(`X1.${who}`, `${who}: one file; its columns: Employee, Employee ID, Department, Check-in, Place, Hours, This week, Status, Flagged`,
      files.length === 1 && /^team-attendance-\d{4}-\d{2}-\d{2}\.csv$/.test(files[0][0]) && j(head) === j(["Employee", "Employee ID", "Department", "Check-in", "Place", "Hours", "This week", "Status", "Flagged"]), j([files.map((f) => f[0]), head]));
    check(`X2.${who}`, `${who}: Arjun's row: Place in words (in at the office, out at home), Status without the flag (Absent: in and out at 09:20), Flagged with the reason (L5: "Yes: checked out from a different place")`,
      arjun && /^Head office, 40 m; out: Permanent home(, \d+ m)?$/.test(arjun[col("Place")]) && arjun[col("Status")] === "Absent" && arjun[col("Flagged")] === "Yes: checked out from a different place", j(arjun));
    const others = rows.slice(1).filter((r) => r[0] !== "Arjun Kapoor");
    check(`X3.${who}`, `${who}: everyone else: Flagged No, Place empty (no place recorded)`, others.length > 5 && others.every((r) => r[col("Flagged")] === "No" && r[col("Place")] === ""), j(others.slice(0, 3)));
    const screen = await n.t.evaluate(() => [...document.querySelectorAll('table[data-export-name="team-attendance"] thead th')].map((h) => h.innerText.replace(/[▲▼]/g, "").replace(/\s+/g, " ").trim()));
    check(`X4.${who}`, `${who}: the page's own table is unchanged (7 columns, no Flagged column)`, screen.length === 7 && !screen.includes("Flagged"), j(screen));
    await n.t.selectOption("#team-flag", "flagged"); await settle(n.t);
    const only = await grab(n.t);
    const fr = only.length ? csv(only.at(-1)[1]) : [];
    check(`X5.${who}`, `${who}: with Flagged only, the file has Arjun's row only`, fr.length === 2 && fr[1][0] === "Arjun Kapoor" && fr[1][fr[0].indexOf("Flagged")] === "Yes: checked out from a different place", j(fr.slice(0, 3)));
    await n.ctx.close();
  }
  // L5: every reason code in words; several joined; an unknown code as it is; a flag without a reason is a bare Yes
  if (keep) {
    const att = JSON.parse(keep[0]);
    const day = att.records.find((r) => r.flagged);
    const give = [["shared-device"], ["device-changed", "place-changed"], ["something-new"], []];
    const others = ["EMP-1001", "EMP-1017", "EMP-1008", "EMP-1003"].map((userId, i) => ({ ...day, userId, flagged: true, flagReasons: give[i] }));
    att.records = att.records.filter((r) => !(r.date === day.date && others.some((o) => o.userId === r.userId))).concat(others);
    const n = await open("hr", "attendance/team-attendance.html", { store: [["officeos:attendance", JSON.stringify(att)], store[1], store[2]], at: "18:00" });
    const files = await grab(n.t);
    const rows = files.length === 1 ? csv(files[0][1]) : [];
    const cells = rows.slice(1).map((r) => r[rows[0].indexOf("Flagged")]);
    const want = ["Yes: shared device", "Yes: checked out from a different device; checked out from a different place", "Yes: something-new", "Yes", "Yes: checked out from a different place"];
    check("X7", "L5: the Flagged cell words every reason code (shared device, a different device + a different place, an unknown code as it is, none = Yes); everyone else No",
      others.length === 4 && want.every((w) => cells.filter((c) => c === w).length === 1) && cells.filter((c) => c === "No").length === cells.length - 5 && cells.length > 6, j(cells));
    const screen = await n.t.evaluate(() => [...document.querySelectorAll('table[data-export-name="team-attendance"] thead th')].length);
    check("X8", "L5: the page's own table is still 7 columns", screen === 7, screen);
    await n.ctx.close();
  }
  const m = await open("mgr", "attendance/team-attendance.html", { store, at: "18:00" });
  check("X6", "a manager's team view has no Export (as before)", (await m.t.locator("main button[data-export]").count()) === 0);
  await m.ctx.close();
}

// ---------- K ----------
if (ONLY.includes("K")) {
  console.log("\n--- K. Keyboard ---");
  const n = await open("emp", PAGE, { store: [HOMES({ "EMP-1105": person(true, HOME_A) })], geo: north(HEAD, 40) });
  await n.t.focus("#checkin-from");
  const order = ["checkin-from"];
  for (let i = 0; i < 2; i++) { await n.t.keyboard.press("Tab"); order.push(await n.t.evaluate(() => document.activeElement.id)); }
  await n.t.focus("#locate-btn"); await n.t.keyboard.press("Enter"); await settle(n.t, 500);
  await n.t.keyboard.press("Tab");
  const at = await n.t.evaluate(() => document.activeElement.id);
  await n.t.keyboard.press("Enter"); await settle(n.t, 400);
  check("K1", "Check-In From, then Use my location; after a reading, Tab reaches Check in and Enter checks in",
    j(order.slice(0, 2)) === j(["checkin-from", "locate-btn"]) && at === "check-in-btn" && (await toast(n.t)) === "Checked in from Head office.", j([order, at]));
  await n.ctx.close();
}

// ---------- W ----------
if (ONLY.includes("W")) {
  console.log("\n--- W. 412 and 1280, light and dark ---");
  const keepFile = path.join(SHOTS, "flagged-store.json");
  const keep = fs.existsSync(keepFile) ? JSON.parse(fs.readFileSync(keepFile, "utf8")) : null;
  const store = keep ? [["officeos:attendance", keep[0]], ["officeos:home-locations", keep[1]], ["officeos:devices", keep[2]]] : [];
  const cases = [["emp", PAGE, [], "mark", true], ["emp", "attendance/my-attendance.html", store, "my", false], ["hr", "attendance/team-attendance.html", store, "team", false], ["hr", "dashboard/hr.html", store, "hr", false]];
  for (const [who, page, st, tag, read] of cases)
    for (const width of [1280, 412]) for (const theme of ["light", "dark"]) {
      const n = await open(who, page, { width, theme, store: st, geo: north(HEAD, 40), at: tag === "mark" ? "09:20" : "18:00" });
      if (read) await locate(n.t);
      const ok = await n.t.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      check(`W.${tag}.${width}.${theme}`, `${page} at ${width}, ${theme}: no sideways scroll`, ok);
      await n.t.screenshot({ path: path.join(SHOTS, `att3-${tag}-${width}-${theme}.png`), fullPage: true, animations: "disabled" });
      await n.ctx.close();
    }
}

check("E", "no page or console errors", !errs.length, j(errs));
await browser.close();
console.log(`\natt3: passed ${passed}, failed ${failed}; ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
