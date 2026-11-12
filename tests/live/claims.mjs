// usage: node claims.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 9L: 9K's findings as decided (round-9k-notes.md), in jsdom with the js in ./js. ./js-pre9L, ./html-pre9L and
// ./css-pre9L are the code, pages and styles before this round (office-os e95a91f).
//   A  audit-log.html: no Export while nothing is logged          B  its sample rows generic (no real people or figures)
//   C  its facts: "Admin and HR Manager", no Super Admin, the tooltip doesn't claim reveals are logged
//   D  login / two-factor: no logging claims; backup.html labelled "Sample, not built yet"
//   E  "Leave for you to decide" (hr.html) and "Waiting, all stages" (leave-approvals.html): each says what it counts
//   F  work from home isn't "out" (leave-approvals' card, leave-store's overlaps())
//   G  user-profile's Leave balance card from the store          H  the employee dashboard's total: leave days only
//   I  data/leave.js: only its header                            J  the change set, line endings, no page errors
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const RAW = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const SRC = (dir, p) => fs.readFileSync(`${HERE}${dir}/${p}`, "utf8");
const OLD = (p) => SRC("html-pre9L", p);

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 10, 7);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
let blobs = [];
URL.createObjectURL = (b) => { blobs.push(b); return "blob:test"; };
URL.revokeObjectURL = () => {};

const WHO = { aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"] };
let loads = 0, w = null, d = null, saved = {};
const jsErrors = [];
async function open(who, page, script, query = "") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) jsErrors.push(`${who} ${page}: ${e.message}`); });
  const dom = new JSDOM(RAW(page), { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  if (script) { try { await import(`./js/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); } }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const $ = (id) => d.getElementById(id);
const parse = (html) => new JSDOM(html).window.document;
const statOf = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return [txt(s.querySelector(".stat__label")), txt(s.querySelector(".stat__value")), txt(s.querySelector(".stat__delta"))]; };
const statByLabel = (label) => { const s = [...d.querySelectorAll(".stat")].find((x) => txt(x.querySelector(".stat__label")) === label); return s ? [txt(s.querySelector(".stat__value")), txt(s.querySelector(".stat__delta"))] : null; };
const card = (title) => [...d.querySelectorAll(".card")].find((c) => txt(c.querySelector(".card__title")) === title);
const bars = (root) => [...root.querySelectorAll(".bar-row")].map((b) => `${txt(b.children[0])}=${txt(b.children[2])}@${b.querySelector(".bar-row__fill").style.getPropertyValue("--w")}`);
// Only the lines that differ, as [old, new] pairs, for files whose line count didn't change.
const lineDiff = (a, b) => { const x = a.split("\r\n"), y = b.split("\r\n"); return x.length !== y.length ? null : x.map((l, i) => [l, y[i]]).filter(([p, q]) => p !== q); };

const S = await import("./js/data/store.js");
const L = await import("./js/data/leave-store.js");
const A = await import("./js/data/attendance-store.js");
const I = await import("./js/data/inventory-store.js");
const { ROLES } = await import("./js/config/roles.js");

// =====================================================================
section("A. The audit log: no Export while nothing is logged");
const AUD = "system/audit-log.html";
setNow(2026, 10, 7); fresh();
await open("aarav", AUD, null);
check("A1", "Aarav (who holds audit:export) sees no Export button: the page has no [data-export] at all", d.querySelectorAll("[data-export]").length === 0 && !/>Export</.test(RAW(AUD)));
blobs = [];
d.querySelectorAll("button").forEach((b) => { if (!b.dataset.notImplemented) b.click(); });
check("A2", "…so nothing on the page downloads the sample as a file (every button clicked: no file)", blobs.length === 0, String(blobs.length));
await open("priya", AUD, null);
check("A3", "HR (audit:view) still opens the page and sees the same: no Export", d.querySelectorAll("[data-export]").length === 0 && /Audit log/.test(txt(d.querySelector("h1"))));

// =====================================================================
section("B. The sample rows: generic, nothing that reads as a real record");
const aud = parse(RAW(AUD));
// Each cell's text pieces joined with " " (so "10" and "9 in stock" stay apart); the person cell as its name only.
const pieces = (node) => { const out = []; const wk = node.ownerDocument.createTreeWalker(node, 4); for (let t = wk.nextNode(); t; t = wk.nextNode()) { const v = t.textContent.replace(/\s+/g, " ").trim(); if (v && !t.parentElement.closest(".avatar")) out.push(v); } return out.join(" "); };
const rows = [...aud.querySelectorAll("tbody tr")].map((tr) => [...tr.children].map(pieces));
const main = txt(aud.querySelector("main"));
const people = S.getAllUsers();
check("B1", "six rows, as before, each with a time, a role (not a person), an action, a module, a record, a masked address and a result", rows.length === 6 && rows.every((r) => r.length === 7),
  j(rows.map((r) => r.slice(0, 3))));
check("B2", "no user's name or e-mail anywhere on the page (all 10 users checked)", people.every((u) => !main.includes(u.name) && !main.includes(u.email)), people.filter((u) => main.includes(u.name)).map((u) => u.name).join());
check("B3", "no item name from the inventory, and no real stock change: no item's ledger ever went 10 -> 9",
  I.allItems().every((i) => !main.includes(i.name)) && /An item 10 9 in stock/.test(rows[2][4]) && (() => {
    const steps = []; for (const i of I.allItems()) { let s = i.openingStock; for (const m of [...I.movementsFor(i.sku)].reverse()) { steps.push([s, s + m.change]); s += m.change; } } return !steps.some(([a, b]) => a === 10 && b === 9);
  })());
check("B4", "no real punch: the correction row is 10:20 -> 09:30, and no seeded correction recorded 10:20", /a past date 10:20 09:30/.test(rows[4][4]) && !A.allRegularizations().some((r) => r.recordedTime === "10:20"), rows[4][4]);
check("B5", "times carry no date, addresses are masked as x.x.x.x (or –)", rows.every((r) => /^\d\d:\d\d$/.test(r[0]) && (r[5] === "x.x.x.x" || r[5] === "–")), j(rows.map((r) => [r[0], r[5]])));
check("B6", "who: An HR Manager, An Admin, An Admin, Unknown, An HR Manager, System", j(rows.map((r) => r[1])) === j(["An HR Manager", "An Admin", "An Admin", "Unknown", "An HR Manager", "System"]), j(rows.map((r) => r[1])));
check("B7", "…and the page's alert still says it's a sample (untouched)", txt(aud.querySelector(".alert")) === txt(parse(OLD(AUD)).querySelector(".alert")) && /^Sample, not built yet:/.test(txt(aud.querySelector(".alert"))));

// =====================================================================
section("C. The page's facts");
const kv = Object.fromEntries([...aud.querySelectorAll(".kv__row")].map((r) => [txt(r.querySelector("dt")), txt(r.querySelector("dd"))]));
const readers = Object.values(ROLES).filter((r) => r.permissions.includes("audit:view")).map((r) => r.label);
check("C1", "'Who can read it: Admin and HR Manager' (was 'Admin and Auditor'): exactly the roles holding audit:view", kv["Who can read it"] === "Admin and HR Manager" && j(readers) === j(["Admin", "HR Manager"]), j([kv["Who can read it"], readers]));
check("C2", "no Auditor and no Super Admin anywhere on the page (neither role exists)", !/Auditor|Super Admin/.test(main));
const tip = txt(aud.querySelector(".tooltip__text"));
check("C3", "the tooltip no longer says reveals are 'always logged'; it says OfficeOS doesn't record them yet", tip === "In a real audit log, viewing full bank or PAN details would be recorded with the viewer's name. OfficeOS doesn't record it yet." && !/always logged/.test(RAW(AUD)), tip);
check("C4", "'Nobody, an Admin included, can change or delete an entry…'; the rest of the policy card as before",
  /Nobody, an Admin included, can change or delete an entry\. A mistake is corrected with a new entry/.test(main) && kv["Kept for"] === "7 years" && kv["Can it be edited"] === "Never" && kv["Can it be deleted"] === "Never");
check("C5", "audit-log.html: nothing changed but the Export button, the six rows, the tooltip and those two lines",
  (() => { const o = parse(OLD(AUD)), n = aud; return txt(o.querySelector(".stat-strip")) === txt(n.querySelector(".stat-strip")) && txt(o.querySelector("thead")) === txt(n.querySelector("thead")) && txt(o.querySelector(".pagination")) === txt(n.querySelector(".pagination")) && j([...o.querySelectorAll(".card__title")].map(txt)) === j([...n.querySelectorAll(".card__title")].map(txt)); })());

// =====================================================================
section("D. Sign-in, two-factor and backup");
const feats = (p) => [...parse(RAW(p)).querySelectorAll(".auth__feature")].map((f) => [txt(f.querySelector("strong")), txt(f.querySelector("p"))]);
check("D1", "login: 'Request history: Every request keeps its history: who sent it, who decided, and when.' (was 'Full audit trail: Every change is recorded…')",
  j(feats("auth/login.html")[3]) === j(["Request history", "Every request keeps its history: who sent it, who decided, and when."]) && !/Every change is recorded|audit trail/i.test(RAW("auth/login.html")), j(feats("auth/login.html")[3]));
const hist = L.allRequests()[0].history[0];
check("D2", "…which is true: every request's history has who and when (leave's first entry, as one example)", Boolean(hist.byUserId && hist.at && hist.decision));
check("D3", "two-factor: 'Sign-in history: Not recorded yet: OfficeOS doesn't keep a sign-in log.' (was 'Every sign-in is logged…')",
  j(feats("auth/two-factor.html")[1]) === j(["Sign-in history", "Not recorded yet: OfficeOS doesn't keep a sign-in log."]) && !/sign-in is logged|saved in the audit log/i.test(RAW("auth/two-factor.html")), j(feats("auth/two-factor.html")[1]));
check("D4", "…the other bullets of both pages unchanged", j(feats("auth/login.html").slice(0, 3)) === j([...parse(OLD("auth/login.html")).querySelectorAll(".auth__feature")].slice(0, 3).map((f) => [txt(f.querySelector("strong")), txt(f.querySelector("p"))]))
  // Round 11J (layout; was the live two-factor.html): 9L left feature 1 alone; read from the frozen result (html-pre11J = HEAD
  // bfdcf3f); the live page's feature 1 says "Not enforced yet" since 11J (authnotes.mjs T1). login's half stays live.
  && j([...parse(SRC("html-pre11J", "auth/two-factor.html")).querySelectorAll(".auth__feature")].map((f) => [txt(f.querySelector("strong")), txt(f.querySelector("p"))])[0]) === j([...parse(OLD("auth/two-factor.html")).querySelectorAll(".auth__feature")].map((f) => [txt(f.querySelector("strong")), txt(f.querySelector("p"))])[0]));
const bk = parse(RAW("system/backup.html"));
check("D5", "backup.html: a page alert 'Sample, not built yet: backups aren't part of OfficeOS yet…', first in the page", /^Sample, not built yet: backups aren't part of OfficeOS yet\./.test(txt(bk.querySelector(".stack > .alert"))) && bk.querySelector(".stack").firstElementChild.classList.contains("alert"));
check("D6", "…its four cards labelled 'Sample, not built yet' (Backups, Storage, Schedule, How a restore works)",
  j([...bk.querySelectorAll(".card__header")].filter((h) => h.querySelector(".card__meta")).map((h) => [txt(h.querySelector(".card__title")), txt(h.querySelector(".card__meta"))])) === j([["Backups", "Sample, not built yet"], ["Storage", "Sample, not built yet"], ["Schedule", "Sample, not built yet"], ["How a restore works", "Sample, not built yet"]]));
check("D7", "…'1 request open' is gone (no restore request exists); the warning about restoring stays", !/1 request open/.test(RAW("system/backup.html")) && /Restoring replaces today's company data/.test(txt(bk.querySelector("main"))));
// Round 9M (layout; was the live backup.html vs html-pre9L): 9L's own backup.html lines, read from its frozen result
// (html-pre9M = HEAD fb6165b); the live page now also holds 9M's restore steps (deferred.mjs A7)
check("D8", "backup.html: only those lines changed (an alert added, four card labels)",
  (() => { const o = OLD("system/backup.html").split("\r\n"), n = SRC("html-pre9M", "system/backup.html").split("\r\n"); return n.length === o.length + 2 && n.filter((l) => !o.includes(l)).length === 4 + 1 && o.filter((l) => !n.includes(l)).length === 4; })());

// =====================================================================
section("E. The two pending-leave counts each say what they count");
setNow(2026, 10, 7); fresh();
await open("priya", "dashboard/hr.html", "hr-dashboard");
const hrPending = statOf("pending");
const mine = L.pendingFor("EMP-1003", "hr");
check("E1", "hr.html: 'Leave for you to decide' 2 (was 'Pending leave requests'): what Priya may decide now", j(hrPending) === j(["Leave for you to decide", "2", "Oldest is 19 days old"]) && mine.length === 2, j(hrPending));
await open("priya", "leave/leave-approvals.html", "leave-approvals");
const all = L.allRequests().filter((r) => r.status === "pending" && r.userId !== "EMP-1003");
check("E2", "leave-approvals.html: 'Waiting, all stages' 4 (was 'Pending'): every request still waiting, either stage, her own aside", j(statByLabel("Waiting, all stages")) === j(["4", "Oldest is 20 days old"]) && all.length === 4 && statByLabel("Pending") === null, j(statByLabel("Waiting, all stages")));
check("E3", "…the same 4 as the Pending tab, and the 2 she may decide are among them", txt([...d.querySelectorAll(".tabs__tab")][0]) === "Pending 4" && mine.every((m) => all.some((a) => a.id === m.id)));
const HR_JS = SRC("js", "pages/hr-dashboard.js");
check("E4", "hr-dashboard.js no longer says it's the same as leave-approvals' Pending; it says they can differ",
  !/The same wording as leave-approvals\.html's Pending stat|What this person may decide, as on leave-approvals\.html/.test(HR_JS) && /so the two figures can differ/.test(HR_JS));
setNow(2026, 10, 7, 11, 0);
L.decideLeave("LV-2189", "EMP-1029", "emp", "approve"); L.decideLeave("LV-2201", "EMP-1029", "emp", "approve");
await open("priya", "dashboard/hr.html", "hr-dashboard");
const after = statOf("pending")[1];
await open("priya", "leave/leave-approvals.html", "leave-approvals");
check("E5", "once Sneha approves her two, both read 4: the counts differ only by what's still with a manager", after === "4" && (statByLabel("Waiting, all stages") ?? [])[0] === "4", `${after} / ${(statByLabel("Waiting, all stages") ?? [])[0]}`);

// =====================================================================
section("F. Work from home isn't 'out'");
setNow(2026, 10, 7); fresh();
await open("priya", "leave/leave-approvals.html", "leave-approvals");
const outList = () => [...$("out-next-week").querySelectorAll(".list__item")].map((i) => txt(i.querySelector(".list__title")));
check("F1", "'Out in the next 7 days': Ananya and Rohan; Priya's work-from-home day (LV-2211, 7 Oct) is left out", j(outList()) === j(["Ananya Iyer", "Rohan Gupta"]), j(outList()));
setNow(2026, 10, 7, 11, 0);
const wfh = L.applyLeave("EMP-1105", { type: "wfh", from: "2026-10-14", to: "2026-10-14", reason: "Plumber" });
check("F2", "overlaps(): a work-from-home request needs no cover (Arjun's WFH on 14 Oct, the day Sneha and Rohan are off: none)", wfh.ok && L.overlaps(wfh.record.id).length === 0, j(wfh.ok ? L.overlaps(wfh.record.id).map((r) => r.id) : wfh.error));
check("F3", "…and takes nobody away: Arjun working from home on 14 Oct isn't a clash for Sneha's 14 Oct leave (still only Rohan's)", wfh.ok && j(L.overlaps("LV-2202").map((r) => r.id)) === j(["LV-2189"]), j(L.overlaps("LV-2202").map((r) => r.id)));
const cas = L.applyLeave("EMP-1105", { type: "casual", from: "2026-10-12", to: "2026-10-12", reason: "Errand" });
await open("priya", "leave/leave-approvals.html", "leave-approvals");
check("F4", "a casual day in the window is still out (Arjun, 12 Oct); his WFH on 14 Oct isn't", cas.ok && outList().includes("Arjun Kapoor") && [...$("out-next-week").querySelectorAll(".list__sub")].every((s) => !/14 Oct, Engineering/.test(txt(s)) || /13 – 15 Oct/.test(txt(s))), j(outList()));
check("F5", "the overlap alert names leave only: Rohan with 1 other person (Sneha)", txt($("overlap-alert")) === "Rohan Gupta's dates overlap with 1 other person from Engineering. Check team cover before approving.", txt($("overlap-alert")));

// =====================================================================
section("G. The profile's Leave balance card");
setNow(2026, 10, 7); fresh();
await open("priya", "users/user-profile.html", "user-profile", "?id=EMP-1105");
const lc = card("Leave balance");
check("G1", "HR on Arjun's profile (?id=EMP-1105): Casual 10, Sick 6, Earned 10, WFH 4, each with the share of its allowance left; the card's year 2026",
  j(bars(lc)) === j(["Casual=10@83%", "Sick=6@75%", "Earned=10@100%", "WFH=4@100%"]) && txt(lc.querySelector(".card__meta")) === "2026", j(bars(lc)));
check("G2", "…'No leave data available yet' is gone; the note says what the figures are", !/No leave data available yet/.test(txt(lc)) && /Days left this year; work from home, this month\./.test(txt(lc)));
const b = L.balanceFor("EMP-1105");
check("G3", "…the store's own figures (balanceFor)", b.casual.left === 10 && b.sick.left === 6 && b.earned.left === 10 && b.wfh.left === 4);
await open("arjun", "dashboard/employee.html", "employee-dashboard");
const dashBars = bars($("balance-card"));
check("G4", "…the same as Arjun's own dashboard card", j(dashBars) === j(["Casual=10@83%", "Sick=6@75%", "Earned=10@100%", "WFH=4@100%"]), j(dashBars));
await open("priya", "users/user-profile.html", "user-profile", "?id=EMP-1105");
check("G5", "'Recent activity' still says there's none (no log exists)", /No recent activity/.test(txt(card("Recent activity"))));

// =====================================================================
section("H. The employee dashboard's total: leave days only");
await open("arjun", "dashboard/employee.html", "employee-dashboard");
check("H1", "'Leave balance' 26 days: Casual 10, Earned 10, Sick 6 (was 30 days with WFH 4)", j(statOf("balance").slice(1)) === j(["26 days", "Casual 10, Earned 10, Sick 6"]), j(statOf("balance")));
check("H2", "…the card still lists work from home on its own row", bars($("balance-card")).some((x) => x.startsWith("WFH=4")));

// =====================================================================
section("I. data/leave.js: only its header");
const LV = SRC("js", "data/leave.js"), LV0 = SRC("js-pre9L", "data/leave.js");
check("I1", "the header says the file isn't used and names data/leave-store.js", LV.startsWith("// data/leave.js\r\n// Not used: nothing imports this file.") && /data\/leave-store\.js, which every leave page and dashboard reads\./.test(LV));
check("I2", "…everything after the header is byte for byte as before", SRC("js-pre14A", "data/leave.js").split("\r\n").slice(4).join("\r\n") === LV0.split("\r\n").slice(2).join("\r\n"));   // Round 14A (layout; was the live js): 9c7423e's, frozen; the live js: jsguard.mjs
const walk = (root, rel = "") => fs.readdirSync(`${root}/${rel}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${rel}${e.name}/`) : [`${rel}${e.name}`]));
check("I3", "…and true: no js file or page imports it", [...walk(`${HERE}js`).map((f) => SRC("js", f)), ...walk(DIR).filter((f) => f.endsWith(".html")).map(RAW)].every((s) => !/[/"']leave\.js["']/.test(s)));

// =====================================================================
section("J. Change set and hygiene");
// Round 9M (layout; was the live js / pages / css vs the pre9L copies): 9L's own change set, read from its frozen
// result (js-pre9M, html-pre9M, css-pre9M = HEAD fb6165b); the live tree now holds 9M's (deferred.mjs Z1 / Z2)
const changedJs = walk(`${HERE}js-pre9M`).filter((f) => SRC("js-pre9M", f) !== SRC("js-pre9L", f)).sort();
const changedHtml = walk(`${HERE}html-pre9M`).filter((f) => f.endsWith(".html") && SRC("html-pre9M", f) !== OLD(f)).sort();
const changedCss = walk(`${HERE}css-pre9M`).filter((f) => SRC("css-pre9M", f) !== SRC("css-pre9L", f));
check("J1", "js changed from HEAD: data/leave-store.js, data/leave.js, pages/employee-dashboard.js, pages/hr-dashboard.js, pages/leave-approvals.js, pages/user-profile.js; nothing added or removed",
  j(changedJs) === j(["data/leave-store.js", "data/leave.js", "pages/employee-dashboard.js", "pages/hr-dashboard.js", "pages/leave-approvals.js", "pages/user-profile.js"]) && j(walk(`${HERE}js-pre9M`).sort()) === j(walk(`${HERE}js-pre9L`).sort()), j(changedJs));
check("J2", "pages changed: auth/login, auth/two-factor, dashboard/hr, leave/leave-approvals, system/audit-log, system/backup; css unchanged",
  j(changedHtml) === j(["auth/login.html", "auth/two-factor.html", "dashboard/hr.html", "leave/leave-approvals.html", "system/audit-log.html", "system/backup.html"]) && changedCss.length === 0 && j(walk(`${HERE}html-pre9M`).sort()) === j(walk(`${HERE}html-pre9L`).sort()), j([changedHtml, changedCss]));
check("J3", "hr.html and leave-approvals.html: only the stat label changed", j(lineDiff(OLD("dashboard/hr.html"), SRC("html-pre14A", "dashboard/hr.html") /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */)?.map(([, n]) => n.trim())) === j(['<span class="stat__label">Leave for you to decide</span>'])
  && j(lineDiff(OLD("leave/leave-approvals.html"), SRC("html-pre14A", "leave/leave-approvals.html"))?.map(([, n]) => n.trim())) === j(['<span class="stat__label">Waiting, all stages</span>']));
// The js edits, file by file: undo each one by hand (comment lines aside); what's left must be HEAD's code.
const code = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l)).join("\r\n");
// Round 9V (layout; was the live js): 9L's own edits (J5-J9), read from its frozen result (js-pre9V = HEAD 0518d14);
// the live js has 9V's leave-store.js and user-profile.js since (managerid.mjs X1)
const was = (f) => code(SRC("js-pre9L", f)), now = (f) => code(SRC("js-pre9V", f));
check("J5", "hr-dashboard.js: only comments changed", now("pages/hr-dashboard.js") === was("pages/hr-dashboard.js"));
check("J6", "leave-approvals.js: only the stat's label (E) and the work-from-home filter (F)",
  now("pages/leave-approvals.js").replace('setStat("Waiting, all stages"', 'setStat("Pending"').replace(' && r.type !== "wfh" && r.from', " && r.from") === was("pages/leave-approvals.js"));
check("J7", "leave-store.js: only overlaps()' two work-from-home tests",
  now("data/leave-store.js").replace('if (!request || request.type === "wfh") return [];', "if (!request) return [];").replace(' && r.type !== "wfh" && COUNTED', " && COUNTED") === was("data/leave-store.js"));
check("J8", "employee-dashboard.js: only renderBalanceStat's total (leave days, then the same sum and sort)",
  now("pages/employee-dashboard.js").replace('  const leave = rows.filter((r) => r.type !== "wfh");\r\n', "").replace("const total = leave.reduce", "const total = rows.reduce").replace("const most = [...leave]", "const most = [...rows]") === was("pages/employee-dashboard.js"));
const upNow = now("pages/user-profile.js"), upFn = upNow.slice(upNow.indexOf("const LEAVE_SHORT"), upNow.indexOf("function renderOverrides() {"));
check("J9", "user-profile.js: only the leave card (two imports, renderLeave(), its call in place of the empty card)",
  upNow.replace(upFn, "").replace('import { approvalChainText, LEAVE_TYPES, balanceFor } from "../data/leave-store.js";\r\nimport { barRow } from "../ui/chart.js";', 'import { approvalChainText } from "../data/leave-store.js";')
    .replace("  renderLeave();\r\n", '  emptyCard("Leave balance", "No leave data available yet");\r\n') === was("pages/user-profile.js"));
check("J4", "the 12 are CRLF only, with no final newline", [...changedJs.map((f) => SRC("js-pre9M", f)), ...changedHtml.map((f) => SRC("html-pre9M", f))].every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
