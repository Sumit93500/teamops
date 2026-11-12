// usage: node tidyups.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round Small tidy-ups (JS stage), in jsdom with the js in ./js; the round's js read as text only from the frozen js-pretu (jsguard holds the live js to it):
//   R  the Regularization page goes by one name: its <title>, topbar, breadcrumb, h1 and search name, and every link to it (team attendance's and
//      shifts' header buttons, the HR dashboard's card footer) say "Regularization"; "Regularization requests" and "All corrections" are gone
//   K  phone.js's dead `.table__check` test is gone; nothing has that class; every table on every page gets the same card parts as before the
//      round (the frozen js-predb1's phone.js against this round's, at 390 px); an empty-heading column is still an actions column
//   E99 no js errors
// The clock is local wall time (Mon 28 Sep 2026 10:00); storage is in memory, seeded when first read.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const read = (...p) => (fs.existsSync(path.join(...p)) ? fs.readFileSync(path.join(...p), "utf8") : "");
const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replaceAll("\\", "/")).sort() : []);
const JSNOW = path.join(HERE, "js-pretu"), JSBEFORE = path.join(HERE, "js-predb1");

const RealDate = Date;
const NOW = new RealDate(2026, 8, 28, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const SESS = { admin: ["admin", "Aarav Mehta", "EMP-1001"], hr: ["hr", "Priya Nair", "EMP-1003"] };
const fresh = (who) => { mem.clear(); mem.set("officeos:session", JSON.stringify({ roleKey: SESS[who][0], userLabel: SESS[who][1], employeeId: SESS[who][2], signedInAt: NOW })); };

let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, query = "") {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) allJsErrors.push(`${page}${query}: ${e.message}`); });
  const html = read(DIR, `${page}.html`);
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, getComputedStyle: w.getComputedStyle.bind(w) });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`./js/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); }
  }
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} timer: ${e.message}`); } });
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const own = (el) => [...(el?.childNodes ?? [])].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").replace(/\s+/g, " ").trim();   // the link's own words, without the count badge
const NAME = "Regularization";
const PAGES = walk(DIR).filter((f) => f.endsWith(".html"));

// =================================================================
section("R. One name for the Regularization page");
fresh("hr"); await open("attendance/regularization");
const names = [d.title, txt(d.querySelector(".topbar strong")), txt(d.querySelector('main .breadcrumb__item[aria-current="page"]')), txt(d.querySelector("main h1"))];
check("R1", "the page itself: <title> 'Regularization | OfficeOS', topbar, breadcrumb and h1 'Regularization'", j(names) === j([`${NAME} | OfficeOS`, NAME, NAME, NAME]), j(names));
const nav = await import("./js/config/nav.js");
const entry = (nav.OTHER_PAGES ?? []).find((p) => p.href === "attendance/regularization.html");
const inSidebar = nav.NAV.flatMap((g) => g.items).filter((i) => i.href === "attendance/regularization.html");
check("R2", "its search name (nav.js OTHER_PAGES) is 'Regularization', under Attendance; the sidebar has no entry for it (nothing to change there)", entry?.label === NAME && entry.group === "Attendance" && inSidebar.length === 0, j([entry, inSidebar]));
const links = [];
for (const f of PAGES) {
  const doc = new JSDOM(read(DIR, f)).window.document;
  for (const a of doc.querySelectorAll('a[href$="regularization.html"]')) links.push([f, txt(a)]);
}
check("R3", "every link to it in every page's markup (3: team attendance, shifts, the HR dashboard) reads 'Regularization'",
  j(links) === j([["attendance/shifts.html", NAME], ["attendance/team-attendance.html", NAME], ["dashboard/hr.html", NAME]]), j(links));
const stale = PAGES.flatMap((f) => [/Regularization requests/, /All corrections/].filter((r) => r.test(read(DIR, f))).map((r) => `${f} ${r.source}`));
const staleJs = walk(JSNOW).filter((f) => f.endsWith(".js")).flatMap((f) => [/Regularization requests/, /All corrections/].filter((r) => r.test(read(JSNOW, f))).map((r) => `${f} ${r.source}`));
check("R4", "'Regularization requests' and 'All corrections' are nowhere: not in any page, not in the js (js-pretu)", stale.length === 0 && staleJs.length === 0 && PAGES.length > 50, j([stale, staleJs]));
fresh("hr"); await open("attendance/team-attendance");
const reg = d.getElementById("team-reg-link");
check("R5", "team attendance (HR): the header button reads 'Regularization', with its count badge after it, to regularization.html",
  own(reg) === NAME && reg.getAttribute("href") === "regularization.html" && /^\d+ pending$/.test(txt(reg.querySelector(".badge--count"))), j([own(reg), txt(reg), reg?.getAttribute("href")]));
await open("dashboard/hr");
const foot = [...d.querySelectorAll("#approvals-list + .card__footer a")].map((a) => `${txt(a)}>${a.getAttribute("href")}`);
check("R6", "the HR dashboard's card footer: 'All leave requests' (unchanged) and 'Regularization'", j(foot) === j(["All leave requests>../leave/leave-approvals.html", `${NAME}>../attendance/regularization.html`]), j(foot));
fresh("admin"); await open("attendance/shifts");
const sh = [...d.querySelectorAll(".page-header__actions a")].map((a) => `${txt(a)}>${a.getAttribute("href")}`);
check("R7", "shifts (a sample page; only its link to the real page changes): the header link reads 'Regularization'", j(sh) === j([`${NAME}>regularization.html`]), j(sh));

// =================================================================
section("K. phone.js: no .table__check, the same cards");
const now = read(JSNOW, "ui", "phone.js"), before = read(JSBEFORE, "ui", "phone.js");
check("K1", "phone.js (js-pretu) has no table__check", now.length > 1000 && !now.includes("table__check"));
const lb = before.split("\r\n"), ln = now.split("\r\n");
const changed = lb.map((l, i) => (l === ln[i] ? null : [l, ln[i]])).filter(Boolean);
check("K2", "…and that clause is the only change: one line, isActions(), loses ` || th.classList.contains(\"table__check\")`; every other line as before",
  lb.length === ln.length && changed.length === 1 && changed[0][0].replace(' || th.classList.contains("table__check")', "") === changed[0][1] && changed[0][1].startsWith("const isActions = (th) =>"), j(changed));
const withClass = PAGES.filter((f) => read(DIR, f).includes("table__check"));
const cssWith = walk(path.join(HERE, "css-prelo")).filter((f) => read(HERE, "css-prelo", f).includes("table__check"));
check("K3", "nothing has that class: no page's markup, no css (frozen css-prelo), no other js file (js-pretu)", withClass.length === 0 && cssWith.length === 0 && walk(JSNOW).every((f) => !read(JSNOW, f).includes("table__check")), j([withClass, cssWith]));
// the card parts phone.js gives every table's cells, at 390 px, with this round's phone.js and the one before it
let widthNow = 390;
function env(page, html) {
  const dom = new JSDOM(html ?? read(DIR, page), { url: `http://localhost/office-os/pages/${page}`, virtualConsole: new VirtualConsole() });
  w = dom.window; d = w.document;
  w.matchMedia = (q) => ({ get matches() { const m = q.match(/\(max-width: (\d+)px\)/); return m ? widthNow <= +m[1] : false; }, addEventListener: () => {} });
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, HTMLElement: w.HTMLElement, MutationObserver: w.MutationObserver, getComputedStyle: w.getComputedStyle.bind(w) });
}
const parts = () => [...d.querySelectorAll("table")].map((t) => [...t.querySelectorAll("tr")].map((r) => [...r.children].map((c) => `${c.dataset.cardPart ?? "-"}:${c.dataset.label ?? "-"}`).join("|")).join("/")).join("#");
const PNOW = await import(`./js-pretu/ui/phone.js?k=1`), PBEFORE = await import(`./js-predb1/ui/phone.js?k=2`);
const diffs = []; let tables = 0, cards = 0;
for (const f of PAGES) {
  env(f); PBEFORE.initPhone(); const a = parts();
  env(f); PNOW.initPhone(); const b = parts(); tables += d.querySelectorAll("table").length; cards += d.querySelectorAll("table[data-cards]").length;
  if (a !== b) diffs.push(f);
}
console.log(`      ${PAGES.length} pages, ${tables} tables, ${cards} as cards`);
check("K4", `every table on every page (${PAGES.length} pages, ${tables} tables, ${cards} drawn as cards at 390 px) gets the same card parts and labels from this round's phone.js as from the one before it`, diffs.length === 0 && cards > 20, j(diffs));
const T = (head) => `<!doctype html><html><body><main><table class="table"><thead><tr>${head}<th>Name</th><th>Status</th><th>Department</th><th class="table__actions"></th></tr></thead><tbody><tr><td>x</td><td>Arjun</td><td>Active</td><td>Engineering</td><td>Edit</td></tr></tbody></table></main></body></html>`;
env("x.html", T('<th class="table__check"></th>')); PNOW.initPhone();
const k5 = [...d.querySelectorAll("tbody td")].map((c) => c.dataset.cardPart);
check("K5", "a column with that class and an empty heading (as a checkbox column had) is still an actions column, through the empty-heading rule", j(k5) === j(["actions", "primary", "status", "key", "actions"]), j(k5));

check("E99", "no js errors", allJsErrors.length === 0, j(allJsErrors.slice(0, 5)));
console.log(`\n${passed} passed, ${failed} failed`);
