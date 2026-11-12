// usage: node reasons2.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 14E part 2 (visible information instead of hover-only titles and refuse-with-a-toast), in jsdom with the js in ./js. Part 1's showReason()
// line (class "reason", tied by aria-describedby) now also carries what lived only in a title on things that aren't controls, the words of a refusal
// known before the click, and why two settings switches can't be changed. The title, the toast and enablement are as they were.
//   T  the Overdue badge's "Not checked in by HH:MM": mark-attendance, my-attendance, the employee and admin dashboards, team attendance
//   A  a problem report: asset-assignment's Problem reported badge, my-assets' disabled Reported button
//   I  items: "n of m ready to assign" and why the rest can't be assigned
//   Q  salary structure: the coming salary under a Starts / Revision due badge, who proposed a waiting change
//   U  user profile: Deactivate and Delete, when the click would refuse (your own account; deleteProblem())
//   G  settings: the Payroll and Expenses module switches ("Always on")
//   W  scope and words (frozen js-pre14E2 against js-pre14E1)    E99 no js errors
// The clock is local wall time, set per section; storage is in memory, seeded when first read.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const read = (...p) => (fs.existsSync(path.join(...p)) ? fs.readFileSync(path.join(...p), "utf8") : "");
const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replaceAll("\\", "/")).sort() : []);

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 9, 28);
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const SESS = { admin: ["admin", "Aarav Mehta", AARAV], hr: ["hr", "Priya Nair", PRIYA], fin: ["fin", "Kabir Shah", KABIR], emp: ["emp", "Arjun Kapoor", ARJUN] };
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null, navigations = [];
const allJsErrors = [];
async function open(page, query = "") {
  const vc = new VirtualConsole();
  timers = []; navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message.slice(0, 60)); else allJsErrors.push(`${page}: ${e.message}`); });
  const html = read(DIR, `${page}.html`);
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = () => true;
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
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
const $ = (id) => d.getElementById(id);
const S = await import("./js/data/store.js");
const PS = await import("./js/data/payroll-store.js");
const I = await import("./js/data/inventory-store.js");
const IV = await import("./js/ui/inventory-view.js");

// The line an element's aria-describedby names, if it's a reason line.
const lineOf = (c) => { const l = c && d.getElementById(c.getAttribute("aria-describedby") ?? ""); return l?.classList.contains("reason") ? l : null; };
const says = (c) => { const l = lineOf(c); return [txt(c), c?.title ?? null, Boolean(l), l ? l.textContent : null, l ? l.hidden : null]; };
// `c` shows `text` on a line of its own right after it (or after `after`): a span.reason, shown, tied, and the title is still `title`.
const shows = (c, text, title, after = c) => { const l = lineOf(c); return Boolean(c) && c.title === title && Boolean(l) && l.tagName === "SPAN" && l.className === "reason" && l.textContent === text && !l.hidden && !c.hidden && l.previousElementSibling === after; };
const none = (c) => Boolean(c) && !c.hasAttribute("aria-describedby");
const lines = () => [...d.querySelectorAll(".reason")];
const visible = () => lines().filter((l) => !l.hidden && !l.closest("[hidden]"));
const tied = () => lines().every((l) => d.querySelectorAll(`[aria-describedby="${l.id}"]`).length === 1);
const ids = () => new Set(lines().map((l) => l.id)).size === lines().length;
const toast = () => txt([...d.querySelectorAll(".toast__text")].at(-1));

// Every Overdue badge on the page: its title in words on the line right after it; every other badge has none; one line per Overdue badge.
function overdueState() {
  const od = [...d.querySelectorAll(".badge--overdue")];
  const others = [...d.querySelectorAll(".badge:not(.badge--overdue)")];
  return { n: od.length, ok: od.every((b) => /^Not checked in by \d\d:\d\d$/.test(b.title) && shows(b, b.title, b.title)), othersNone: others.every(none), lines: lines().length, tied: tied(), ids: ids(), sample: od.slice(0, 2).map(says) };
}
const overdueOk = (s, min = 1) => s.n >= min && s.ok && s.othersNone && s.lines === s.n && s.tied && s.ids;

// =================================================================
section("T. The Overdue badge's time, in words (28 Sep 2026, 10:00; the demo identities never get an automatic check-in)");
mem.clear(); setNow(2026, 9, 28, 10, 0);
setSession(...SESS.emp); await open("attendance/mark-attendance");
const markBadge = () => d.querySelector("#recent-punches tbody tr")?.lastElementChild.querySelector(".badge");
const t1 = overdueState();
check("T1", "mark-attendance (Arjun): today's Overdue badge has 'Not checked in by 09:45' as a line right after it in its cell, tied, the title kept; no other badge has one",
  overdueOk(t1) && t1.n === 1 && markBadge()?.classList.contains("badge--overdue") && lineOf(markBadge())?.textContent === "Not checked in by 09:45" && lineOf(markBadge()).parentElement === markBadge().parentElement, j(t1));
$("check-in-btn").click();
check("T2", "he checks in: the row is redrawn as Late, and no line is left anywhere", txt(markBadge()) === "Late" && lines().length === 0, j([says(markBadge()), lines().length]));
mem.clear(); setNow(2026, 9, 28, 10, 0);
setSession(...SESS.emp); await open("attendance/my-attendance");
const myBadge = () => d.querySelector('#daily-log tbody tr[data-date="2026-09-28"]')?.children[4].querySelector(".badge");
const t3 = overdueState();
check("T3", "my-attendance (Arjun): today's log row, the same line; the month's other rows have none", overdueOk(t3) && t3.n === 1 && shows(myBadge(), "Not checked in by 09:45", "Not checked in by 09:45"), j(t3));
setNow(2026, 9, 28, 9, 40); await open("attendance/my-attendance");
check("T4", "09:40 (before the grace time): 'Not in yet', no title, no line", txt(myBadge()) === "Not in yet" && none(myBadge()) && lines().length === 0, j([says(myBadge()), lines().length]));
setNow(2026, 9, 28, 10, 0); await open("dashboard/employee");
const t5 = overdueState();
check("T5", "the employee dashboard (Arjun): his recent attendance, today's Overdue badge with its line", overdueOk(t5) && t5.n === 1, j(t5));
setSession(...SESS.admin); await open("dashboard/admin");
const t6 = overdueState();
check("T6", "the admin dashboard (Aarav): each Overdue badge in today's attendance with its own line, its own title's words", overdueOk(t6), j(t6));
setSession(...SESS.hr); await open("attendance/team-attendance");
const t7 = overdueState();
check("T7", "team attendance (Priya): each Overdue badge with its own line", overdueOk(t7), j(t7));

// =================================================================
section("A. A problem report: asset-assignment's badge, my-assets' Reported button");
mem.clear(); setNow(2026, 9, 28, 10, 0);
setSession(...SESS.admin); await open("inventory/asset-assignment");
const reportBadges = () => [...d.querySelectorAll("tr[data-tag] .badge")].filter((b) => txt(b) === "Problem reported");
const a1 = [reportBadges().length, lines().length];
check("A1", "the seed: a line under each Problem reported badge (its title's words) and nowhere else", reportBadges().every((b) => shows(b, b.title, b.title) && b.title.startsWith("Reported ")) && lines().length === reportBadges().length, j(a1));
const r = I.reportProblem(ARJUN, "AST-0188", "Battery lasts under an hour");
await open("inventory/asset-assignment");
const b188 = () => d.querySelector('tr[data-tag="AST-0188"]') && [...d.querySelectorAll('tr[data-tag="AST-0188"] .badge')].find((b) => txt(b) === "Problem reported");
check("A2", "Arjun reports AST-0188: its badge shows 'Reported <day>: Battery lasts under an hour' under it, tied, the title kept; one line per badge",
  r.ok && /^Reported 28 Sep( 2026)?: Battery lasts under an hour$/.test(b188()?.title ?? "") && shows(b188(), b188().title, b188().title) && lines().length === reportBadges().length && tied() && ids(), j([r.ok, says(b188())]));
setSession(...SESS.emp); await open("inventory/my-assets");
const rep = (tag) => d.querySelector(`button[data-report-tag="${tag}"]`);
const others = () => [...d.querySelectorAll("button[data-report-tag]")].filter((b) => b.dataset.reportTag !== "AST-0188");
check("A3", "my-assets (Arjun): AST-0188's Reported button is disabled, its title's words a line under it in its cell, taking its permission; his other assets' Report issue buttons are enabled with none",
  rep("AST-0188")?.disabled && txt(rep("AST-0188")) === "Reported" && /^Reported 28 Sep( 2026)?: Battery lasts under an hour\. An Admin will look at it\.$/.test(rep("AST-0188").title)
  && shows(rep("AST-0188"), rep("AST-0188").title, rep("AST-0188").title) && lineOf(rep("AST-0188")).parentElement === rep("AST-0188").closest("td") && lineOf(rep("AST-0188")).dataset.permission === "assets:report"
  && others().every((b) => !b.disabled && none(b)) && lines().length === 1, j([says(rep("AST-0188")), others().map(says), lines().length]));

// =================================================================
section("I. Items: how much can be assigned, and why not the rest");
mem.clear(); setNow(2026, 9, 28, 10, 0);
setSession(...SESS.admin); await open("inventory/items");
const notes = () => [...d.querySelectorAll("tbody td div.text-sm.text-muted")].filter((n) => / of \d+ ready to assign$/.test(txt(n)));
check("I1", "each 'n of m ready to assign' note has the untagged-units sentence as a line right after it, tied, the title kept; no other line",
  notes().length >= 1 && notes().every((n) => shows(n, IV.UNTAGGED_TIP, IV.UNTAGGED_TIP)) && lines().length === notes().length && tied() && ids()
  && IV.UNTAGGED_TIP === "Untagged units are counted in stock but can't be assigned until they're tagged.", j([notes().length, notes().slice(0, 1).map(says)]));

// =================================================================
section("Q. Salary structure: the coming salary, and who proposed a waiting change");
mem.clear(); setNow(2026, 9, 28, 10, 0);
setSession(...SESS.fin); await open("payroll/salary-structure");
const statusBadge = (id) => d.querySelector(`tr[data-user-id="${id}"] td:not(.table__actions) .badge`);
const titled = () => [...d.querySelectorAll("tr[data-user-id] .badge[title]")].filter((b) => b.title);
const editLines = () => [...d.querySelectorAll("tr[data-user-id] .table__actions .reason")];
check("Q1", "the seed: only part 1's Edit lines; any status badge with a title has its line, and no other", lines().length === editLines().length + titled().length && titled().every((b) => shows(b, b.title, b.title)), j([lines().length, editLines().length, titled().map(says)]));
const set = PS.setSalary(AARAV, VIKRAM, { gross: 90000, effectiveFrom: "2026-11-01" });
const sp = PS.proposeSalary(KABIR, ROHAN, { gross: 130000, effectiveFrom: "2026-12-01" });
await open("payroll/salary-structure");
const vb = statusBadge(VIKRAM);
check("Q2", "Vikram's revision (₹90,000 from 1 Nov): 'Revision due 1 Nov 2026', and '₹90,000 a month from 1 Nov 2026' as a line under it, tied, the title kept",
  set.ok && txt(vb) === "Revision due 1 Nov 2026" && shows(vb, "₹90,000 a month from 1 Nov 2026", "₹90,000 a month from 1 Nov 2026"), j([set.ok, says(vb)]));
const note = d.querySelector(`tr[data-user-id="${ROHAN}"] div.mt-2[title]`);
const want = `Proposed by Kabir Shah on 28 Sep 2026 (${sp.record?.id})`;
check("Q3", "Rohan's waiting change: the Waiting note has 'Proposed by Kabir Shah on 28 Sep 2026 (<id>)' as a line right after it, tied, the title kept; his badge's line (if any) comes before the note",
  sp.ok && shows(note, want, want) && (lineOf(statusBadge(ROHAN)) ? lineOf(statusBadge(ROHAN)).nextElementSibling === note : statusBadge(ROHAN)?.nextElementSibling === note), j([sp.ok, says(note)]));
check("Q4", "in all: part 1's Edit lines, one per titled badge, one per waiting note; ids unique, each tied once",
  lines().length === editLines().length + titled().length + d.querySelectorAll("tr[data-user-id] div.mt-2[title]").length && tied() && ids(), j([lines().length, editLines().length, titled().length]));

// =================================================================
section("U. User profile: Deactivate and Delete, when the click would refuse");
mem.clear(); setNow(2026, 9, 28, 10, 0);
setSession(...SESS.admin); await open("users/user-profile", `?id=${AARAV}`);
const acts = () => d.querySelector(".page-header__actions");
const btn = (t) => [...acts().querySelectorAll("button")].find((b) => txt(b) === t);
const DEACT = "You can't deactivate your own account.", DEL = "You can't delete your own account.";
check("U1", "Aarav on his own profile: Deactivate and Delete stay enabled (no title), each with the toast's words as a line, both after the buttons, Deactivate's first, each taking its button's permission",
  !btn("Deactivate").disabled && !btn("Delete").disabled && shows(btn("Deactivate"), DEACT, "", btn("Delete")) && shows(btn("Delete"), DEL, "", lineOf(btn("Deactivate")))
  &&lineOf(btn("Deactivate")).dataset.permission === "users:deactivate" && lineOf(btn("Delete")).dataset.permission === "users:delete" && lines().length === 2 && tied(),
  j([says(btn("Deactivate")), says(btn("Delete")), [...acts().children].map((c) => c.className || txt(c))]));
btn("Delete").click(); const u2a = toast();
btn("Deactivate").click(); const u2b = toast();
check("U2", "the clicks still refuse with the same toasts, and the lines stay as they were", u2a === DEL && u2b === DEACT && S.getUser(AARAV)?.status !== "inactive" && lineOf(btn("Delete"))?.textContent === DEL && lineOf(btn("Deactivate"))?.textContent === DEACT && lines().length === 2, j([u2a, u2b]));
await open("users/user-profile", `?id=${PRIYA}`);
const u3 = S.deleteProblem(AARAV, PRIYA);
check("U3", "Aarav on Priya (a demo sign-in identity): Delete's line is deleteProblem()'s words; Deactivate has none", u3 === "EMP-1003 is a demo sign-in identity and can't be deleted." && shows(btn("Delete"), u3, "") && none(btn("Deactivate")) && lines().length === 1, j([says(btn("Deactivate")), says(btn("Delete"))]));
btn("Delete").click();
check("U4", "…and its click still refuses with that toast", toast() === u3, toast());
const free = S.getAllUsers().find((u) => !S.deleteProblem(AARAV, u.id) && u.id !== AARAV);
await open("users/user-profile", `?id=${free?.id}`);
check("U5", "someone who can be deleted: no line under either button", Boolean(free) && none(btn("Deactivate")) && none(btn("Delete")) && lines().length === 0, j([free?.id, lines().map((l) => l.textContent)]));
setSession(...SESS.hr); await open("users/user-profile", `?id=${VIKRAM}`);
const u6 = lines().map((l) => [l.textContent, l.hidden, l.dataset.permission]);
check("U6", "Priya (HR, no users:delete) on Vikram: the Delete button is hidden, and so is any line for it; nothing shows", btn("Delete")?.hidden !== false && visible().length === 0 && lines().every((l) => l.hidden), j(u6));

// =================================================================
section("G. Settings: the Payroll and Expenses module switches");
mem.clear(); setNow(2026, 9, 28, 10, 0);
setSession(...SESS.admin); await open("system/settings");
const sw = (name) => d.querySelector(`#modules input[aria-label="${name}"]`);
const desc = (name) => sw(name)?.closest(".setting-row")?.querySelector(".setting-row__text span");
check("G1", "Payroll and Expenses (checked, disabled): 'Always on' as a line under the module's description, tied to the switch",
  ["Payroll module", "Expenses module"].every((n) => sw(n).checked && sw(n).disabled && lineOf(sw(n))?.textContent === "Always on" && lineOf(sw(n)).className === "reason" && lineOf(sw(n)).previousElementSibling === desc(n) && !lineOf(sw(n)).hidden),
  j(["Payroll module", "Expenses module"].map((n) => says(sw(n)))));
const g2 = [...d.querySelectorAll('#modules input[type="checkbox"]')].filter((i) => !i.disabled);
check("G2", "the other module switches (enabled) have none; two lines in all, each tied once", g2.length === 3 && g2.every(none) && lines().length === 2 && tied() && ids(), j([g2.length, lines().length]));

// =================================================================
section("W. Scope and words, from frozen copies");
const NOWJS = path.join(HERE, "js-pre14E2"), PREV = path.join(HERE, "js-pre14E1");
const a = walk(NOWJS), b = walk(PREV);
const FILES = ["pages/admin-dashboard.js", "pages/asset-assignment.js", "pages/employee-dashboard.js", "pages/items.js", "pages/mark-attendance.js", "pages/my-assets.js",
  "pages/my-attendance.js", "pages/salary-structure.js", "pages/settings.js", "pages/team-attendance.js", "pages/user-profile.js", "ui/csv-export.js"];
const changed = a.filter((f) => b.includes(f) && read(NOWJS, f) !== read(PREV, f));
check("W1", "against 14E part 1's js, exactly the eleven page scripts and ui/csv-export.js changed (ui/leave-view.js not); no file added or removed", a.length === b.length && a.length > 90 && j(a) === j(b) && j(changed) === j(FILES), j({ files: a.length, changed }));
const literals = (s) => new Set((s.replace(/(^|\s)\/\/\s.*$/gm, "$1").match(/"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) ?? []));
const NEW = { "pages/settings.js": ['"../ui/leave-view.js"', '"Payroll module"', '"Expenses module"', '`#modules input[aria-label="${name}"]`', '"Always on"', '".setting-row"', '".setting-row__text span"'],
  "ui/csv-export.js": [`".avatar, .reason, svg, [hidden], [aria-hidden='true']"`] };
const GONE = { "ui/csv-export.js": [`".avatar, svg, [hidden], [aria-hidden='true']"`] };
const words = FILES.map((f) => { const x = literals(read(NOWJS, f)), y = literals(read(PREV, f)); return [f, [...x].filter((s) => !y.has(s)).sort(), [...y].filter((s) => !x.has(s))]; });
check("W2", "no other words: the only new string literals are settings.js's import, the two switches' names, its selectors and 'Always on', and the export's skip list gaining .reason (its old list the one removed)",
  words.every(([f, add, gone]) => j(add) === j([...(NEW[f] ?? [])].sort()) && j(gone) === j(GONE[f] ?? [])), j(words.filter(([, add, gone]) => add.length || gone.length)));
const calls = FILES.map((f) => (read(NOWJS, f).match(/showReason\(/g) ?? []).length - (read(PREV, f).match(/showReason\(/g) ?? []).length);
check("W3", "the pages call the one helper: once each, salary structure twice more, user profile twice (the export never); the titles are all still set",
  j(calls) === j([1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 0]) &&FILES.every((f) => (read(NOWJS, f).match(/\.title = |title: /g) ?? []).length === (read(PREV, f).match(/\.title = |title: /g) ?? []).length), j(calls));

section("E. No js errors");
check("E99", "no js errors on any load", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));
console.log(`\n${passed} passed, ${failed} failed`);
