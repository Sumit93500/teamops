// usage: node legend.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 13T (round-13s-scoping.md S3 / S4 / S5 ruled: p-I; 12K K7.5): each attendance legend ends with a "No record"
// entry, its dot colour set inline (no js, no css): my-attendance's --color-text-muted, the calendar's "future" look
// (No data, Before joining, After leaving, Not in yet); team-attendance's --color-border, the legend's light dot, for
// the week strip's "nd" square. ./js-pre13T, ./html-pre13T and ./css-pre13T are the code, pages and css before this
// round (office-os 429cf92).
//   G  the legends before;  L  the legends now;  F  the looks the entry names;  E  no page errors;  X  scope
// Fresh storage, Mon 9 Nov 2026 11:00.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const PRE = path.join(HERE, "html-pre13T");

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
const MY = "attendance/my-attendance.html", TEAM = "attendance/team-attendance.html";
// A legend's entries as [text, class, inline --c], from a rendered page.
const legend = () => [...d.querySelectorAll(".calendar__legend span")].map((s) => [txt(s), s.className, s.style.getPropertyValue("--c").trim()]);
const staticLegend = (dir, page) => [...new JSDOM(fs.readFileSync(path.join(dir, page), "utf8")).window.document.querySelectorAll(".calendar__legend span")].map((s) => [txt(s), s.className, s.style.getPropertyValue("--c").trim()]);
async function rendered(page, who) { fresh(); await open("auth/login.html"); AU.signIn(...who); await open(page); return legend(); }
const ARJUN = ["emp", "Arjun Kapoor", "EMP-1105"], AARAV = ["admin", "Aarav Mehta", "EMP-1001"];
const MY_BEFORE = ["On time", "Late", "Absent", "On leave", "Holiday", "Weekend"], TEAM_BEFORE = ["Present", "Late", "Half day", "Absent", "On leave", "Holiday", "Not in yet"];

// =================================================================
section("G. The legends before (html-pre13T)");
const myPre = staticLegend(PRE, MY), teamPre = staticLegend(PRE, TEAM);
check("G1", "before: my-attendance's legend On time … Weekend, team-attendance's Present … Not in yet; neither had a 'No record' entry",
  j(myPre.map((e) => e[0])) === j(MY_BEFORE) && j(teamPre.map((e) => e[0])) === j(TEAM_BEFORE), j([myPre.map((e) => e[0]), teamPre.map((e) => e[0])]));

// =================================================================
section("L. The legends now");
const my = await rendered(MY, ARJUN);
check("L1", "my-attendance (Arjun, rendered): the entries as before, then 'No record' last",
  j(my.map((e) => e[0])) === j([...MY_BEFORE, "No record"]), j(my.map((e) => e[0])));
check("L2", "...its dot: no class, --c: var(--color-text-muted) set inline", j(my.at(-1)) === j(["No record", "", "var(--color-text-muted)"]), j(my.at(-1)));
check("L3", "...every other entry exactly as before (text, class, no inline colour)", j(my.slice(0, -1)) === j(myPre), j([my.slice(0, -1), myPre]));
const team = await rendered(TEAM, AARAV);
check("L4", "team-attendance (Aarav, rendered): the entries as before, then 'No record' last",
  j(team.map((e) => e[0])) === j([...TEAM_BEFORE, "No record"]), j(team.map((e) => e[0])));
check("L5", "...its dot: no class, --c: var(--color-border) set inline", j(team.at(-1)) === j(["No record", "", "var(--color-border)"]), j(team.at(-1)));
check("L6", "...every other entry exactly as before", j(team.slice(0, -1)) === j(teamPre), j([team.slice(0, -1), teamPre]));

// =================================================================
section("F. The looks the entry names");
// my-attendance: the four kinds still take the "future" look, whose tag dot is .calendar__day's --c (the css isn't
// rendered in jsdom, so it's read from the css and the page script that 13T leaves unchanged).
const myJs = fs.readFileSync(path.join(HERE, "js", "pages", "my-attendance.js"), "utf8");
const cal = fs.readFileSync(path.join(DIR, "..", "assets", "css", "components", "calendar.css"), "utf8");
const FUTURE = { "no-data": "No data", "not-joined": "Before joining", left: "After leaving" };
check("F1", "my-attendance.js cellLook: no-data, not-joined and left take the 'future' look with their tags; not-yet too ('Not in yet' today)",
  Object.entries(FUTURE).every(([s, tag]) => myJs.includes(`case "${s}": return ["future", "${tag}"];`)) && myJs.includes('default: return ["future", day.date === today ? "Not in yet" : ""];   // not-yet'));
check("F2", "calendar.css: a day's tag dot is --c, .calendar__day's --c is var(--color-text-muted), and the future look doesn't change it: the colour the entry names",
  /\.calendar__day \{\s*--c: var\(--color-text-muted\);/.test(cal) && /\.calendar__tag::before \{[^}]*background: var\(--c\);/.test(cal) && /\.calendar__day--future\s*\{ color: var\(--color-text-muted\); \}/.test(cal));
fresh(); await open("auth/login.html"); AU.signIn(...ARJUN); await open(MY);
const todayCell = d.querySelector('.calendar__day[data-date="2026-11-09"]');
check("F3", "Arjun's 9 Nov cell (today, nothing recorded yet): the future look, tagged 'Not in yet'",
  todayCell?.classList.contains("calendar__day--future") && txt(todayCell?.querySelector(".calendar__tag")) === "Not in yet", todayCell?.className);
const teamJs = fs.readFileSync(path.join(HERE, "js", "pages", "team-attendance.js"), "utf8");
check("F4", "team-attendance.js WEEK: no-data, before joining and after leaving take the 'nd' square the team entry stands for",
  teamJs.includes('"no-data": ["nd", "ND", "no data"],') && teamJs.includes('"not-joined": ["nd", "NJ", "before joining"],') && teamJs.includes('left: ["nd", "AL", "after leaving"],'));

// =================================================================
section("E. No page errors");
check("E1", "no page errors in any load", allErrors.length === 0, j(allErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const walk = (dir) => fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile())
  .map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replace(/\\/g, "/")).sort();
const changedIn = (now, then) => { const a = walk(now), b = walk(then); return { changed: a.filter((f) => b.includes(f) && fs.readFileSync(path.join(now, f), "latin1") !== fs.readFileSync(path.join(then, f), "latin1")), added: a.filter((f) => !b.includes(f)), removed: b.filter((f) => !a.includes(f)) }; };
// Round 13X (layout, X1; was the live pages): 13T's own change, html-pre13X (7d931bd) against html-pre13T; the live pages: appearance.mjs X3
const pages = changedIn(path.join(HERE, "html-pre13X"), PRE);
check("X1", "pages: exactly attendance/my-attendance.html and attendance/team-attendance.html changed; nothing added or removed",
  j(pages) === j({ changed: [MY, TEAM], added: [], removed: [] }), j(pages));
// Round 13W (layout, X2; was the live js): 13T's own change, js-pre13W (cad5061) against js-pre13T; the live js: shell.mjs X1
const js = changedIn(path.join(HERE, "js-pre13W"), path.join(HERE, "js-pre13T")), css = /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ changedIn(path.join(HERE, "css-pre13U"), path.join(HERE, "css-pre13T"));
check("X2", "no js and no css changed, added or removed", j(js) === j({ changed: [], added: [], removed: [] }) && j(css) === j({ changed: [], added: [], removed: [] }), j([js, css]));
const crlf = (s) => !/[^\r]\n/.test(s) && !s.endsWith("\n");
const added = (page) => { const a = fs.readFileSync(path.join(PRE, page), "utf8").split("\r\n"), b = fs.readFileSync(path.join(HERE, "html-pre14A", page), "utf8").split("\r\n"); /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */ const i = b.findIndex((l, k) => l !== a[k]); return b.length === a.length + 1 && j(b.slice(0, i)) === j(a.slice(0, i)) && j(b.slice(i + 1)) === j(a.slice(i)) ? b[i] : null; };
check("X3", "each page: CRLF, no final newline; exactly one line added, nothing else changed",
  [MY, TEAM].every((p) => crlf(fs.readFileSync(path.join(HERE, "html-pre14A", p), "utf8")))
  && added(MY) === '            <span style="--c: var(--color-text-muted)">No record</span>' && added(TEAM) === '          <span style="--c: var(--color-border)">No record</span>', j([added(MY), added(TEAM)]));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
