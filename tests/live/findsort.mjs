// usage: node findsort.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 14H (round-14h-scoping.md; J-H1 to J-H11): sorting on the phone's cards and the search on phones.
//   Sorting (560 px and under): a card table with a sortable column keeps that column's own button above the cards, after "Sort by", which is for the eye only (aria-hidden).
//   Search (820 px and under, where responsive.css hides the box): an icon in the topbar opens the box across it; a second Esc or "Close search" shuts it and focus goes
//   back to the icon; leaving it shuts it; Ctrl+K opens it; reopened, the last text comes back selected. Same results and keyboard as the desktop box.
//   S  the sort's css;  T  sorting, run;  Q  the search's css;  B  the search, run;  W  the words;  X  scope, from frozen copies;  E  no page errors
// jsdom has no layout and applies no stylesheet: sizes, contrast, layout shift and the screen are checked in Edge (b-check14h.mjs). Fresh storage, Mon 9 Nov 2026 11:00.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const CSS = path.join(DIR, "..", "assets", "css");
let passed = 0, failed = 0;
const check = (id, label, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${id.padEnd(5)} ${label}${!ok && detail !== "" ? `  -> ${detail}` : ""}`); ok ? passed++ : failed++; };
const section = (s) => console.log(`\n--- ${s} ---`);
const j = JSON.stringify;
const read = (...p) => (fs.existsSync(path.join(...p)) ? fs.readFileSync(path.join(...p), "utf8") : "");   // missing fails its check rather than crashing
const exists = (...p) => fs.existsSync(path.join(...p));
const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replaceAll("\\", "/")).sort() : []);
const txt = (n) => n?.textContent.replace(/\s+/g, " ").trim() ?? "";
console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}`);

const RealDate = Date;
const NOW = new RealDate(2026, 10, 9, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
const settle = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => queueMicrotask(r)); };

// ---------- a page, run: app.js and the page's own module, at a width (matchMedia answers max-width and min-width queries)
let loads = 0, w = null, d = null, saved = {}, width = 390;
const allErrors = [];
async function open(target, at = width) {
  width = at;
  const page = target.split("?")[0];
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation|reload/i.test(e.message)) allErrors.push(`${page}: ${e.message}`); });
  const html = read(DIR, page);
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${target}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.confirm = () => true;
  w.matchMedia = (q) => { const mx = q.match(/\(max-width: (\d+)px\)/), mn = q.match(/\(min-width: (\d+)px\)/); return { matches: mx ? width <= +mx[1] : mn ? width >= +mn[1] : false, addEventListener() {}, removeEventListener() {} }; };
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, getComputedStyle: w.getComputedStyle.bind(w), MutationObserver: w.MutationObserver });
  loads++;
  try { await import(`./js/app.js?load=${loads}`); } catch (e) { allErrors.push(`app.js on ${page}: ${e.message}`); }
  for (const m of html.matchAll(/assets\/js\/pages\/([\w-]+)\.js/g)) {
    try { await import(`./js/pages/${m[1]}.js?load=${loads}`); } catch (e) { allErrors.push(`import ${m[1]}: ${e.message}`); }
  }
  await settle();
}
const AU = await import("./js/core/auth.js");
const WHO = { admin: ["admin", "Aarav Mehta", "EMP-1001"], emp: ["emp", "Arjun Kapoor", "EMP-1105"] };
async function as(who, page, at) { if (w) w.localStorage.clear(); saved = {}; await open("auth/login.html", at); AU.signIn(...WHO[who]); await open(page, at); }
const missing = () => d.createElement("i");   // what a check reads when the element isn't there: it fails rather than crashing
const click = (n) => { const e = new w.MouseEvent("click", { bubbles: true, cancelable: true }); (n ?? missing()).dispatchEvent(e); return e; };
const key = (k, opts = {}, target = d.activeElement ?? d.body) => { const e = new w.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...opts }); target.dispatchEvent(e); return e; };

// ---------- the css, as rules (the live phone.css: this suite is one of cssguard's named readers)
const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const phoneCss = noComments(read(CSS, "layout", "phone.css"));
const blockOf = (s, q, from = 0) => { const i = s.indexOf(`@media ${q}`, from); if (i < 0) return ""; let depth = 0, k = s.indexOf("{", i); const a = k; for (; k < s.length; k++) { if (s[k] === "{") depth++; if (s[k] === "}" && --depth === 0) break; } return s.slice(a, k); };
const small = blockOf(phoneCss, "screen and (max-width: 560px)"), touch = blockOf(phoneCss, "screen and (max-width: 820px)");
const outside = (() => { let s = phoneCss; for (const q of ["screen and (max-width: 560px)", "screen and (max-width: 820px)"]) { let i; while ((i = s.indexOf(`@media ${q}`)) >= 0) { const b = blockOf(s, q); s = s.slice(0, i) + s.slice(s.indexOf(b, i) + b.length + 1); } } return s; })();
const rulesOf = (s, re) => [...s.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter((m) => re.test(m[1])).map((m) => [m[1].trim(), m[2].trim()]);

// =================================================================
section("S. Sorting on the cards: the css (J-H1)");
const SORTED = "main .table:has(thead th:nth-child(4)):has(thead th.is-sortable)";
check("S1", "off the phone and in print, 'Sort by', the search icon and its close button are hidden: in the first rule, outside any media rule", phoneCss.trim().startsWith(".topbar__back, .chart__readout, .table__more, .table__sort-label, .topbar__search-open, .topbar__search-close { display: none; }"));
const sortRules = rulesOf(phoneCss, /is-sortable|sort-btn/);
check("S2", "the sortable header is shown only in a card table (4 columns or more) that has a sortable column, only at 560 and under", sortRules.length === 5 && sortRules.every(([sel]) => sel.startsWith(SORTED + " thead")) && rulesOf(small, /is-sortable|sort-btn/).length === 5, j(sortRules.map(([s]) => s)));
check("S3", "it shows as a row, not clipped: the header is static, its own size, nothing clipped", new RegExp(`${SORTED.replace(/[().:]/g, "\\$&")} thead \\{ position: static; display: block; width: auto; height: auto; overflow: visible; clip-path: none;`).test(small) && /thead tr \{ display: flex; align-items: center; flex-wrap: wrap; gap: 8px; \}/.test(small));
check("S4", "the other headings stay clipped, so a screen reader still has them", /thead th:not\(\.is-sortable\) \{ position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset\(50%\); \}/.test(small) && !/th:not\(\.is-sortable\) \{[^}]*display: none/.test(small));
check("S5", "the button is a 44 px target, in the accent colour", /thead \.sort-btn \{ min-height: 44px; color: var\(--color-primary\); \}/.test(small));
check("S6", "'Sort by' shows only at 560 and under, muted, in sentence case", /\.table__sort-label \{ display: inline; color: var\(--color-text-muted\); text-transform: none; letter-spacing: 0;/.test(small) && !/\.table__sort-label \{ display: inline/.test(touch + outside));

// =================================================================
section("T. Sorting on the cards, run (Team attendance, Admin)");
const sortTh = () => d.querySelector("th.is-sortable") ?? missing();
const sortBtn = () => sortTh().querySelector(".sort-btn") ?? missing();
const labels = () => [...sortTh().querySelectorAll(".table__sort-label")];
const names = () => [...d.querySelectorAll("#team-rows tr")].map((tr) => txt(tr.querySelector(".table__user-name"))).filter(Boolean);
let csvBlob = null;
URL.createObjectURL = (b) => { csvBlob = b; return "blob:findsort"; };
URL.revokeObjectURL = () => {};
const { exportTableAsCsv } = await import("./js/ui/csv-export.js");
const csvOf = async () => { csvBlob = null; exportTableAsCsv(d.querySelector("table[data-export-name]") ?? missing(), "x"); return csvBlob ? await csvBlob.text() : ""; };
await as("admin", "attendance/team-attendance.html", 900);
const wideHead = sortTh().innerHTML, wideCsv = await csvOf(), wideNames = names();
check("T1", "wider than 560 nothing is added: the heading is as the page wrote it", labels().length === 0 && txt(sortTh()) === "Employee ▲" && sortTh().getAttribute("aria-sort") === "ascending", txt(sortTh()));
await as("admin", "attendance/team-attendance.html", 390);
check("T2", "at 390 the heading gets one 'Sort by', first, hidden from screen readers, outside the button", labels().length === 1 && sortTh().firstElementChild === labels()[0] && txt(labels()[0]) === "Sort by" && labels()[0].getAttribute("aria-hidden") === "true" && !sortBtn().contains(labels()[0]), sortTh().innerHTML.slice(0, 160));
check("T3", "the button is the page's own, unchanged: its name, its arrow and the heading's aria-sort", sortBtn().id === "team-sort" && txt(sortBtn()) === "Employee ▲" && sortTh().getAttribute("aria-sort") === "ascending" && sortTh().getAttribute("role") === "columnheader");
check("T4", "the cards' label for the column is still 'Employee', not 'Sort by Employee'", names().length > 3 && [...d.querySelectorAll("#team-rows tr")].every((tr) => tr.children[0]?.dataset.label === "Employee"), j([...d.querySelectorAll("#team-rows td")].slice(0, 1).map((t) => t.dataset.label)));
check("T5", "the same rows in the same order as at 900", j(names()) === j(wideNames), j(names()));
check("T6", "csv: the export is the same file as at 900, its header 'Employee'", wideCsv !== "" && (await csvOf()) === wideCsv && /^﻿?Employee,Department,/.test(wideCsv.split("\r\n")[0]) && !wideCsv.includes("Sort by"), wideCsv.slice(0, 60));
click(sortBtn()); await settle();
check("T7", "tapping it sorts, as on the desktop: Z to A, the arrow and aria-sort follow", sortTh().getAttribute("aria-sort") === "descending" && txt(sortBtn()) === "Employee ▼" && j(names()) === j([...wideNames].sort((a, b) => b.localeCompare(a))) && j(names()) !== j(wideNames), j(names()));
check("T8", "the table drawn again keeps exactly one 'Sort by', and the cards' labels", labels().length === 1 && [...d.querySelectorAll("#team-rows tr")].every((tr) => tr.children[0]?.dataset.label === "Employee"));
click(sortBtn()); await settle();
check("T9", "and back to A to Z", sortTh().getAttribute("aria-sort") === "ascending" && j(names()) === j(wideNames));
await open("users/users-list.html", 390);
check("T10", "a card table with no sortable column gets no 'Sort by'", !!d.querySelector("table[data-cards]") && !d.querySelector(".table__sort-label"));

// =================================================================
section("Q. The search on phones: the css (J-H3 to J-H5)");
check("Q1", "the icon shows at 820 and under only", /\.topbar__search-open \{ display: grid;/.test(touch) && !/\.topbar__search-open \{ display: grid/.test(small + outside));
check("Q2", "the box stays hidden until opened: responsive.css still hides it at 820, and phone.css shows it only on .is-searching", /\.topbar__search \{ display: none; \}/.test(noComments(read(CSS, "layout", "responsive.css"))) && (() => { const shown = rulesOf(phoneCss, /\.topbar__search(?![-\w])/).filter(([s, b]) => /display: (flex|block|grid|inline)/.test(b) && !/dropdown__menu|search-close/.test(s)); return shown.length === 1 && shown[0][0] === ".topbar.is-searching .topbar__search"; })());
check("Q3", "open, it lies across the topbar, inset, above what it covers", /\.topbar\.is-searching \.topbar__search \{ position: absolute; inset: 5px 8px; z-index: 1; display: flex; width: auto; margin: 0;/.test(touch));
check("Q4", "what it covers is hidden by visibility, so it leaves the Tab order but keeps its place", /\.topbar\.is-searching > :not\(\.topbar__search\) \{ visibility: hidden; \}/.test(touch) && !/is-searching[^{]*\{[^}]*display: none/.test(phoneCss));
check("Q5", "the field is 16 px, so a phone doesn't zoom, and 42 px tall", /\.topbar__search input \{ min-height: 42px; font-size: 16px; \}/.test(touch));
check("Q6", "one close button: the browser's own clear button is hidden, and Ctrl K's hint", /\.topbar__search input::-webkit-search-cancel-button \{ -webkit-appearance: none; display: none; \}/.test(touch) && /\.topbar__search kbd \{ display: none; \}/.test(touch));
check("Q7", "the close button shows only in the box, at 820 and under, as a 44 px icon button", /\.topbar__search \.topbar__search-close \{ display: grid; flex: none; \}/.test(touch) && /\.topbar__icon-btn,[^{]*\{ min-width: 44px; min-height: 44px;/.test(touch));
check("Q8", "the results are the box's width, capped at 420 px or 60% of the screen, and scroll; each a 44 px row", /\.topbar__search \.dropdown__menu:not\(\[hidden\]\) \{ left: 0; right: 0; width: auto; max-height: min\(420px, 60vh\); overflow-y: auto; \}/.test(touch) && /\.topbar__search \.dropdown__item \{ min-height: 44px; \}/.test(touch));
check("Q9", "no grey tap mark left on the icon once the box covers it", /\.topbar__search-open \{ display: grid; -webkit-tap-highlight-color: transparent; \}/.test(touch));
check("Q11", "the icons' place is kept until they're drawn (no late shift): Appearance's and Search's, while the page's own <label> box is there; two icons and the row's gap at 820, two icons at 560 where the row has none", /\.topbar:has\(> label\.topbar__search\) \.topbar__actions::before \{ content: ""; flex: none; width: calc\(88px \+ var\(--space-3\)\); \}/.test(touch) && /html \.topbar:has\(> label\.topbar__search\) \.topbar__actions::before \{ width: 88px; \}/.test(small) && /\.topbar__actions \{ flex: none; gap: 0;/.test(small) && !/topbar__actions::before/.test(outside));
check("Q13", "P2 (ruled): at 560 and under the topbar has no side padding and no gaps, so a title gets back the room the icon took (b-check14d G4 at 360; the 44 px targets keep the icons off the edge)", /\.topbar \{ padding: 0; gap: 0; \}/.test(small) && !/\.topbar \{ padding: 0 4px;/.test(phoneCss));
await as("admin", "dashboard/admin.html", 390);
check("Q12", "...and the swap happens: once drawn there's no <label> box left, so the kept place is gone and the icon is in it", !d.querySelector(".topbar > label.topbar__search") && d.querySelector(".topbar > div.topbar__search") !== null && d.querySelectorAll(".topbar__search-open").length === 1);
check("Q10", "nothing about the search outside the 820 block but the first rule and, at 560, the kept place's width: the desktop box is untouched", rulesOf(outside, /topbar__search|is-searching/).length === 1 && j(rulesOf(small, /topbar__search|is-searching/).map(([s]) => s)) === j(["html .topbar:has(> label.topbar__search) .topbar__actions::before"]), j([rulesOf(outside, /topbar__search|is-searching/), rulesOf(small, /topbar__search|is-searching/)]));

// =================================================================
section("B. The search on phones, run (J-H3 to J-H9)");
const box = () => d.querySelector(".topbar__search") ?? missing();
const input = () => box().querySelector("input") ?? missing();
const opener = () => d.querySelector(".topbar__search-open") ?? missing();
const shut = () => d.querySelector(".topbar__search-close") ?? missing();
const list = () => d.getElementById("search-results") ?? missing();
const topbar = () => d.querySelector(".topbar") ?? missing();
const searching = () => topbar().classList.contains("is-searching");
const type = (q) => { const i = input(); i.value = q; i.dispatchEvent(new w.Event("input", { bubbles: true })); return [...list().querySelectorAll("a")]; };
const labelOf = (o) => txt(o.children[0]);
const phone = () => { box().style.display = "none"; };   // what responsive.css does at 820 and under; jsdom applies no stylesheet
await as("admin", "dashboard/admin.html", 390);
const icons = d.querySelectorAll(".topbar__search-open"), closes = d.querySelectorAll(".topbar__search-close");
check("B1", "one icon, in the topbar's icon row just before the bell: a button named 'Search' that controls the box, closed", icons.length === 1 && opener().parentElement?.classList.contains("topbar__actions") && opener().nextElementSibling?.classList.contains("topbar__icon-btn--dot") && opener().tagName === "BUTTON" && opener().type === "button" && opener().className === "topbar__icon-btn topbar__search-open" && opener().getAttribute("aria-label") === "Search" && opener().getAttribute("aria-controls") === box().id && box().id === "topbar-search" && opener().getAttribute("aria-expanded") === "false");
const glass = box().querySelector("svg");
check("B2", "its icon is the box's own magnifier, a copy, hidden from screen readers", opener().children.length === 1 && opener().firstElementChild?.outerHTML === glass?.outerHTML && opener().firstElementChild !== glass && glass?.getAttribute("aria-hidden") === "true");
check("B3", "one close button, in the box after the field (Tab goes field, then ✕): named 'Close search', the dialogs' ✕, hidden from screen readers", closes.length === 1 && shut().parentElement === box() && shut().nextElementSibling === list() && !!(input().compareDocumentPosition(shut()) & w.Node.DOCUMENT_POSITION_FOLLOWING) && shut().type === "button" && shut().className === "topbar__icon-btn topbar__search-close" && shut().getAttribute("aria-label") === "Close search" && shut().querySelector("svg")?.getAttribute("aria-hidden") === "true" && shut().querySelector("svg")?.getAttribute("viewBox") === "0 0 24 24" && shut().querySelector("svg path")?.getAttribute("d") === "M6 6l12 12M18 6 6 18" && shut().querySelector("svg")?.namespaceURI === "http://www.w3.org/2000/svg");
phone();
click(opener());
check("B4", "the icon opens it: the topbar is .is-searching, the icon says expanded, focus is in the field", searching() && opener().getAttribute("aria-expanded") === "true" && d.activeElement === input());
let o = type("leave");
check("B5", "it finds what the desktop box finds", o.map(labelOf).join() === "My leave,Leave approvals,Team leave,Apply for leave" /* Round Manager scoping part 2 (behaviour: Team leave too) */ && list().hidden === false, j(o.map(labelOf)));   // Round Small leftovers (behaviour: Apply for leave is found too, smallleft.mjs Q1)
let e1 = key("Escape", {}, input());
check("B6", "the first Esc closes the results only: the box stays open, with its text and the focus", e1.defaultPrevented && list().hidden === true && searching() && input().value === "leave" && d.activeElement === input());
let e2 = key("Escape", {}, input());
check("B7", "the second Esc shuts the box, and focus goes back to the icon", e2.defaultPrevented && !searching() && opener().getAttribute("aria-expanded") === "false" && d.activeElement === opener());
click(opener());
check("B8", "reopened: what was typed is back, selected, so typing replaces it", searching() && input().value === "leave" && input().selectionStart === 0 && input().selectionEnd === 5 && d.activeElement === input());
const down = new w.MouseEvent("mousedown", { bubbles: true, cancelable: true }); shut().dispatchEvent(down);
check("B9", "pressing the close button doesn't take the focus out of the box first", down.defaultPrevented && d.activeElement === input() && searching());
click(shut());
check("B10", "the close button shuts it and focus goes back to the icon, not into the field", !searching() && d.activeElement === opener() && opener().getAttribute("aria-expanded") === "false" && list().hidden === true);
click(opener()); type("pay");
shut().focus();
check("B11", "moving within the box (to its close button) leaves it open", searching() && d.activeElement === shut());
const elsewhere = d.querySelector("main a, main button") ?? missing(); elsewhere.focus();
check("B12", "leaving the box shuts it, and the focus stays where it went", !searching() && d.activeElement === elsewhere && opener().getAttribute("aria-expanded") === "false" && list().hidden === true);
elsewhere.blur();
const ck = key("k", { ctrlKey: true }, d.body);
check("B13", "Ctrl+K at 820 and under (the box hidden, the icon showing) opens the box", ck.defaultPrevented && searching() && d.activeElement === input());
key("Escape", {}, input());
opener().style.display = "none";
const ck2 = key("k", { ctrlKey: true }, d.body);
check("B14", "...and with no icon either, there's no search on the screen: Ctrl+K is left to the browser", !ck2.defaultPrevented && !searching() && d.activeElement !== input());
opener().style.display = "";
const modal = d.createElement("div"); modal.className = "modal is-open"; d.body.append(modal);
const ck3 = key("k", { ctrlKey: true }, d.body);
check("B15", "with a dialog open, Ctrl+K doesn't open the search behind it", !ck3.defaultPrevented && !searching());
modal.remove();
const plainEsc = key("Escape", {}, input());
check("B16", "Esc with the box shut (and no results) is left alone, even at the field", !plainEsc.defaultPrevented && !searching());
click(opener()); type("payslip");
let followed = null;
d.addEventListener("click", (ev) => { const a = ev.target.closest?.("#search-results a"); if (a) { followed = a.getAttribute("href"); ev.preventDefault(); } });
const en = key("Enter", {}, input());
check("B17", "Enter opens the highlighted result, as on the desktop (the phone keyboard's Go key is Enter)", en.defaultPrevented && followed === "../payroll/payslips.html", followed);
// the desktop box: the same results, Ctrl+K focuses it, nothing opens across the topbar
await as("admin", "dashboard/admin.html", 1280);
const desk = (q) => type(q).map((x) => `${labelOf(x)}|${x.getAttribute("href")}`);
const deskRes = ["a", "leave", "aarav", "pay", "zzz"].map(desk);
input().blur();
const dk = key("k", { ctrlKey: true }, d.body);
check("B18", "on the desktop Ctrl+K focuses the box as before, and nothing opens across the topbar", dk.defaultPrevented && d.activeElement === input() && !searching() && opener().getAttribute("aria-expanded") === "false");
const deskEsc = (input().focus(), type("leave"), key("Escape", {}, input()), key("Escape", {}, input()));
check("B19", "on the desktop the second Esc is still the browser's", !deskEsc.defaultPrevented && !searching());
await as("admin", "dashboard/admin.html", 390); phone(); click(opener());
const phoneRes = ["a", "leave", "aarav", "pay", "zzz"].map(desk);
check("B20", "the phone's box gives the desktop's results, the same links, for the same words", j(phoneRes) === j(deskRes) && deskRes[2].some((x) => x.includes("user-profile.html?id=EMP-1001")), j(phoneRes.map((r) => r.length)));
// RBAC: an Employee's search lists pages only
await as("emp", "dashboard/employee.html", 390); phone(); click(opener());
o = type("a");
check("B21", "as an Employee: the icon and the box, pages only, no people", searching() && o.length === 5 && o.every((x) => !/user-profile\.html/.test(x.getAttribute("href") ?? "")) && type("Aarav").length === 0, j(o.map(labelOf)));
await open("auth/login.html", 390);
check("B22", "a page with no topbar: no icon, no close button, nothing drawn", !d.querySelector(".topbar__search-open") && !d.querySelector(".topbar__search-close") && !d.getElementById("search-results"));
await as("admin", "users/user-profile.html?id=EMP-1042", 390); phone();
check("B23", "a detail page with the back arrow has the icon too, after the arrow's own row is drawn", d.querySelectorAll(".topbar__search-open").length === 1 && (click(opener()), searching()) && d.activeElement === input());

// =================================================================
section("W. The words (J-H2, J-H7)");
const added = (a, b) => { const A = new Set(a.split("\r\n")); return b.split("\r\n").filter((l) => !A.has(l)); };
const newLines = (f) => added(read(HERE, "js-pre14D", f), read(HERE, "js-pre14H", f)).join("\n");
const quoted = (s) => [...s.replace(/^\s*\/\/.*$/gm, "").matchAll(/"([A-Z][a-z][^"]*)"/g)].map((m) => m[1]);
const words = [...new Set(["ui/phone.js", "ui/search.js"].flatMap((f) => quoted(newLines(f))))].sort();
check("W1", "the only words in the new js lines: Close search, Search and Sort by", j(words) === j(["Close search", "Search", "Sort by"]), j(words));
check("W2", "'Search' isn't new: the box's own name, which the icon reuses", /"Search"/.test(read(HERE, "js-pre14D", "ui", "search.js")) && /<input type="search" placeholder="Search" aria-label="Search">/.test(read(DIR, "dashboard", "admin.html")));
check("W3", "no HTML strings in the new code: the icon and the close button are built with DOM calls", !/innerHTML|outerHTML|insertAdjacentHTML/.test(newLines("ui/search.js") + newLines("ui/phone.js")) && /createElementNS\(SVG, "svg"\)/.test(newLines("ui/search.js")));
check("W4", "phone.css adds no words", ![...phoneCss.matchAll(/content: "([^"]*)"/g)].some((m) => m[1] !== ""));
check("W5", "nothing fetched and nothing stored by the new lines", !/fetch\(|XMLHttpRequest|localStorage|sessionStorage|https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(newLines("ui/search.js") + newLines("ui/phone.js")));

// =================================================================
section("X. Scope, from frozen copies (the live tree: jsguard.mjs, cssguard.mjs, pagefreeze.mjs)");
const changedIn = (a, b) => walk(path.join(HERE, a)).filter((f) => !exists(HERE, b, f) || read(HERE, a, f) !== read(HERE, b, f));
const same = (a, b) => j(walk(path.join(HERE, a))) === j(walk(path.join(HERE, b)));
check("X1", "js: exactly ui/phone.js and ui/search.js changed; nothing added or removed", j(changedIn("js-pre14H", "js-pre14D")) === j(["ui/phone.js", "ui/search.js"]) && same("js-pre14H", "js-pre14D"), j(changedIn("js-pre14H", "js-pre14D")));
check("X2", "css: exactly layout/phone.css changed; nothing added or removed", j(changedIn("css-pre14H", "css-pre14D")) === j(["layout/phone.css"]) && same("css-pre14H", "css-pre14D"), j(changedIn("css-pre14H", "css-pre14D")));
const crlf = (s) => s !== "" && !/(^|[^\r])\n/.test(s) && !s.endsWith("\n");
check("X3", "every changed file CRLF, no final newline", [read(HERE, "js-pre14H", "ui", "phone.js"), read(HERE, "js-pre14H", "ui", "search.js"), read(HERE, "css-pre14H", "layout", "phone.css")].every(crlf));
const holdOf = (s) => s.slice(s.indexOf("/* ---------- The hold ----------"));
check("X4", "the hold is byte for byte 14D's, still at 1000 ms", holdOf(read(HERE, "css-pre14H", "layout", "phone.css")) === holdOf(read(HERE, "css-pre14D", "layout", "phone.css")) && holdOf(read(HERE, "css-pre14H", "layout", "phone.css")).includes("animation: phone-reveal 0s 1000ms forwards;"));
const backOf = (s) => s.split("\r\n").filter((l) => /DETAIL_PAGES|BACK_ICON|function addBack|topbar__back/.test(l)).join("\n");
check("X5", "the back arrow is untouched: its pages, its icon and its code", backOf(read(HERE, "js-pre14H", "ui", "phone.js")) !== "" && backOf(read(HERE, "js-pre14H", "ui", "phone.js")) === backOf(read(HERE, "js-pre14D", "ui", "phone.js")) && read(HERE, "js-pre14H", "ui", "phone.js").includes(read(HERE, "js-pre14D", "ui", "phone.js").slice(read(HERE, "js-pre14D", "ui", "phone.js").indexOf("function addBack"), read(HERE, "js-pre14D", "ui", "phone.js").indexOf("function markReady"))));
// the only lines search.js lost: the old header line, the box's click (now it ignores its button too), Esc's early return and its close (now two steps), Ctrl+K's one test (now two)
const SEARCH_REMOVED = ["// The box is hidden below 820 px (responsive.css), and then Ctrl+K is left alone.", '  box.addEventListener("click", (e) => { if (!e.target.closest("a")) input.focus(); });', "      if (list.hidden) return;", "      close();", '    if (getComputedStyle(box).display === "none" || document.querySelector(".modal.is-open")) return;'];
const searchD = { added: added(read(HERE, "js-pre14D", "ui", "search.js"), read(HERE, "js-pre14H", "ui", "search.js")), removed: added(read(HERE, "js-pre14H", "ui", "search.js"), read(HERE, "js-pre14D", "ui", "search.js")) };
check("X6", "search.js: what it finds is untouched (matchingPages, matchingPeople and buildOption as they were)", ["function matchingPages", "function matchingPeople", "function buildOption"].every((fn) => { const a = read(HERE, "js-pre14D", "ui", "search.js"), b = read(HERE, "js-pre14H", "ui", "search.js"); const cut = (s) => s.slice(s.indexOf(fn), s.indexOf("\r\n}\r\n", s.indexOf(fn))); return cut(a) !== "" && cut(a) === cut(b); }) && j(searchD.removed) === j(SEARCH_REMOVED), j(searchD.removed));
check("X7", "responsive.css is 14D's: the box's own hiding rule wasn't touched", read(HERE, "css-pre14H", "layout", "responsive.css") !== "" && read(HERE, "css-pre14H", "layout", "responsive.css") === read(HERE, "css-pre14D", "layout", "responsive.css"));

// =================================================================
section("E. No page errors");
check("E1", "no page errors in any load", allErrors.length === 0, j(allErrors.slice(0, 5)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
