// usage: node holipast.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 13R (round-13q-scoping.md Q3 / Q4 / Q5 ruled: H + D; 13O O5.1 / O5.2): pages/holidays.js gives a past holiday's
// row no Remove button (the store refuses it, round 10O, and that never relaxes); data/holidays.js removeHoliday()'s
// refusal writes the date as the pages do, "26 Jan 2026" (dayLabel()), the wording otherwise unchanged. ./js-pre13R,
// ./html-pre13R and ./css-pre13R are the code, pages and css before this round (office-os 8e20454).
//   G  the code before;  R  the refusal's date;  P  the holidays page;  E  no page errors;  X  scope
// Fresh storage, Mon 9 Nov 2026 11:00 (6 of the 7 seeded holidays are past: Diwali was 8 Nov).
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");

const RealDate = Date;
const NOW = new RealDate(2026, 10, 9, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

let loads = 0, w = null, d = null, saved = {};
const allErrors = [];
async function open(page, dir = DIR) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) allErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(path.join(dir, page), "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.HTMLElement.prototype.scrollIntoView = function () {};
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  await import(`./js/app.js?load=${loads}`);
  for (const m of html.matchAll(/assets\/js\/pages\/([\w-]+)\.js/g)) {
    try { await import(`./js/pages/${m[1]}.js?load=${loads}`); } catch (e) { allErrors.push(`import ${m[1]}: ${e.message}`); }
  }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }
const txt = (n) => n?.textContent.replace(/\s+/g, " ").trim() ?? "";

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;

fresh(); await open("auth/login.html");
const AU = await import("./js/core/auth.js");
const H = await import("./js/data/holidays.js");
const V = await import("./js/ui/leave-view.js");
const OLD = await import("./js-pre13R/data/holidays.js");
const PRIYA = "EMP-1003", ARJUN = "EMP-1105";
const PAST = { "Republic Day": "26 Jan 2026", "Holi": "4 Mar 2026", "Independence Day": "15 Aug 2026", "Gandhi Jayanti": "2 Oct 2026", "Dussehra": "20 Oct 2026", "Diwali": "8 Nov 2026" };
const idOf = (name) => H.getAllHolidays().find((h) => h.name === name)?.id;
const stored = () => w.localStorage.getItem("officeos:holidays");

// =================================================================
section("G. The code before (js-pre13R)");
fresh(); await open("auth/login.html"); H.getAllHolidays();
const g1 = OLD.removeHoliday(PRIYA, idOf("Republic Day"));
const oldPage = fs.readFileSync(path.join(HERE, "js-pre13R", "pages", "holidays.js"), "utf8");
check("G1", "the code before refused Republic Day with the raw ISO date, and gave every row a Remove",
  g1.ok === false && g1.error === "Can't remove a past holiday (2026-01-26)." && oldPage.includes("item.append(tile, content, badge, remove);"), j(g1));

// =================================================================
section("R. The refusal's date");
fresh(); await open("auth/login.html"); H.getAllHolidays();
const before = stored();
const r1 = Object.fromEntries(Object.keys(PAST).map((name) => [name, H.removeHoliday(PRIYA, idOf(name))]));
check("R1", "each of the six past seeded holidays, removed by Priya: refused, 'Can't remove a past holiday (26 Jan 2026).' (1 Mar-style days without a leading zero: '4 Mar 2026', '2 Oct 2026'); nothing stored changed",
  Object.entries(PAST).every(([name, label]) => r1[name].ok === false && r1[name].error === `Can't remove a past holiday (${label}).`) && stored() === before, j(r1));
const iso = Object.fromEntries(H.getAllHolidays().map((h) => [h.name, h.date]));
check("R2", "...each date as the pages write a day: ui/leave-view.js formatDay(date, true)",
  Object.keys(PAST).every((name) => r1[name].error === `Can't remove a past holiday (${V.formatDay(iso[name], true)}).`), j(Object.keys(PAST).map((n) => V.formatDay(iso[n], true))));
const old = Object.fromEntries(Object.keys(PAST).map((name) => [name, OLD.removeHoliday(PRIYA, idOf(name))]));
check("R3", "...and only the date differs from the code before's refusal (the wording as it was)",
  Object.keys(PAST).every((name) => old[name].ok === false && old[name].error.replace(iso[name], PAST[name]) === r1[name].error), j(Object.values(old).map((o) => o.error)));
const r4 = H.removeHoliday(ARJUN, idOf("Republic Day"));
check("R4", "the other refusal unchanged: Arjun (no holidays:manage) gets 'You can't remove holidays.'", r4.ok === false && r4.error === "You can't remove holidays.", j(r4));
const today = H.addHoliday(PRIYA, { date: "2026-11-09", name: "Today off", kind: "company" });
const r5 = [H.removeHoliday(PRIYA, today.record?.id), H.removeHoliday(PRIYA, idOf("Christmas"))];
check("R5", "a holiday dated today, and Christmas (future), can still be removed", today.ok && r5.every((r) => r.ok === true), j(r5));

// =================================================================
section("P. The holidays page");
const rows = () => [...d.querySelectorAll("#holiday-list .list__item")].map((item) => {
  const b = item.querySelector("button");
  return { name: txt(item.querySelector(".list__title")), badge: txt(item.querySelector(".badge")), remove: b ? (b.hidden ? "hidden" : txt(b)) : null };
});
const asked = [];
async function holidaysAs(role, name, id) {
  fresh(); await open("auth/login.html");
  AU.signIn(role, name, id);
  await open("leave/holidays.html");
  asked.length = 0;
  w.confirm = (m) => { asked.push(m); return true; };
}
await holidaysAs("hr", "Priya Nair", PRIYA);
const p1 = rows();
check("P1", "Priya's 2026 list on 9 Nov: the six Past rows have no Remove button at all; Christmas (Upcoming) has Remove",
  p1.length === 7 && p1.filter((r) => r.badge === "Past").map((r) => r.name).sort().join() === Object.keys(PAST).sort().join()
  && p1.every((r) => (r.badge === "Past" ? r.remove === null : r.remove === "Remove")), j(p1));
check("P2", "...every row's badge is as before (six Past, one Upcoming): only the button is gone", j(p1.map((r) => r.badge)) === j(["Past", "Past", "Past", "Past", "Past", "Past", "Upcoming"]));
const toasts = () => [...d.querySelectorAll(".toast__text")].map(txt);
d.querySelector('button[aria-label="Remove Christmas"]')?.click();
check("P3", "Remove on Christmas: asks 'Remove Christmas on 25 Dec 2026?' as before; OK removes it ('Holiday removed.'), gone from the list",
  j(asked) === j(["Remove Christmas on 25 Dec 2026?"]) && toasts().includes("Holiday removed.") && !idOf("Christmas") && !rows().some((r) => r.name === "Christmas"), j([asked, toasts()]));
// A holiday dated today isn't past (the store's `<`): its row keeps Remove, and it removes.
await holidaysAs("hr", "Priya Nair", PRIYA);
H.addHoliday(PRIYA, { date: "2026-11-09", name: "Today off", kind: "company" });
await open("leave/holidays.html");
asked.length = 0; w.confirm = (m) => { asked.push(m); return true; };
const p4row = rows().find((r) => r.name === "Today off");
d.querySelector('button[aria-label="Remove Today off"]')?.click();
check("P4", "a holiday added for today: Upcoming, with Remove; it asks 'Remove Today off on 9 Nov 2026?' and removes",
  p4row?.badge === "Upcoming" && p4row?.remove === "Remove" && asked[0]?.startsWith("Remove Today off on 9 Nov 2026?") && !idOf("Today off"), j([p4row, asked]));
await holidaysAs("emp", "Arjun Kapoor", ARJUN);
const p5 = rows();
check("P5", "Arjun (Employee): the same seven rows, and no Remove shown on any (hidden by the permission, as before)",
  p5.length === 7 && p5.every((r) => r.remove === null || r.remove === "hidden"), j(p5));

// =================================================================
section("E. No page errors");
check("E1", "no page errors in any load", allErrors.length === 0, j(allErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const walk = (dir) => fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile())
  .map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replace(/\\/g, "/")).sort();
const changedIn = (now, then) => { const a = walk(now), b = walk(then); return { changed: a.filter((f) => b.includes(f) && fs.readFileSync(path.join(now, f), "latin1") !== fs.readFileSync(path.join(then, f), "latin1")), added: a.filter((f) => !b.includes(f)), removed: b.filter((f) => !a.includes(f)) }; };
// Round 13W (layout, X1; was the live js): 13R's own change, js-pre13W (cad5061) against js-pre13R; the live js: shell.mjs X1
const js = changedIn(path.join(HERE, "js-pre13W"), path.join(HERE, "js-pre13R"));
check("X1", "js: exactly data/holidays.js and pages/holidays.js changed; nothing added or removed", j(js) === j({ changed: ["data/holidays.js", "pages/holidays.js"], added: [], removed: [] }), j(js));
// Round 13T (layout, X2; was the live pages): 13R's own pages, html-pre13T (429cf92) against html-pre13R; the live
// pages: legend.mjs X1
const pages = changedIn(path.join(HERE, "html-pre13T"), path.join(HERE, "html-pre13R")), css = /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ changedIn(path.join(HERE, "css-pre13U"), path.join(HERE, "css-pre13R"));
check("X2", "no page and no css changed, added or removed", j(pages) === j({ changed: [], added: [], removed: [] }) && j(css) === j({ changed: [], added: [], removed: [] }), j([pages, css]));
const src = (root, f) => fs.readFileSync(path.join(HERE, root, f), "utf8");
const crlf = (s) => !/[^\r]\n/.test(s) && !s.endsWith("\n");
const code = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l)).map((l) => l.replace(/\s+\/\/ .*$/, ""));
const diffOf = (f) => { const a = code(src("js-pre13R", f)), b = code(src("js", f)); return { gone: a.filter((l) => !b.includes(l)), added: b.filter((l) => !a.includes(l)) }; };
const exportsOf = (s) => [...s.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]).sort();
const dh = diffOf("data/holidays.js"), ph = diffOf("pages/holidays.js");
check("X3", "data/holidays.js: CRLF, no final newline, the same exports; comments aside, dayLabel() added and the past-holiday refusal's line replaced",
  crlf(src("js", "data/holidays.js")) && j(exportsOf(src("js", "data/holidays.js"))) === j(exportsOf(src("js-pre13R", "data/holidays.js")))
  && j(dh.gone) === j(["  if (holiday && holiday.date < todayIso()) return fail(`Can't remove a past holiday (${holiday.date}).`);"])
  && dh.added.length === 2 && dh.added[0].startsWith("const dayLabel = (iso) =>") && dh.added[1] === "  if (holiday && holiday.date < todayIso()) return fail(`Can't remove a past holiday (${dayLabel(holiday.date)}).`);", j(dh));
check("X4", "pages/holidays.js: CRLF, no final newline; comments aside, only the row's append line replaced",
  crlf(src("js", "pages/holidays.js")) && j(ph) === j({ gone: ["  item.append(tile, content, badge, remove);"], added: ["  item.append(tile, content, badge, ...(past ? [] : [remove]));"] }), j(ph));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
