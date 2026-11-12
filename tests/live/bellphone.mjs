// usage: node bellphone.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 14G bug (the bell on a phone), in jsdom with the js in ./js. On a real Pixel 6a the bell's list didn't appear. Two causes, both pinned here:
//   P  a second tap while the card's script was still on its way closed the list the first tap was opening (two clicks before the script answers);
//   R  any resize closed it, and Chrome for Android fires resize as its address bar slides in or out (a height-only change): now only a new width does.
// Scope and words from frozen copies (js-pre14GB against js-pre14G); the live tree: jsguard. The clock is faked (Mon 28 Sep 2026 10:00, local).
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const read = (...p) => (fs.existsSync(path.join(...p)) ? fs.readFileSync(path.join(...p), "utf8") : "");
const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replaceAll("\\", "/")).sort() : []);
const PAGES = { admin: ["dashboard", "admin", "admin-dashboard"], profile: ["account", "my-profile", "my-profile"] };

const RealDate = Date;
let NOW = 0;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
NOW = new RealDate(2026, 8, 28, 10, 0).getTime();
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r)); };   // the bell loads the card's script on its first click

let loads = 0, w = null, d = null;
const jsErrors = [];
async function open(page) {
  const [folder, name, script] = PAGES[page];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) jsErrors.push(`${name}: ${e.message}`); });
  const dom = new JSDOM(read(DIR, folder, `${name}.html`), { url: `http://localhost/office-os/pages/${folder}/${name}.html`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  w.localStorage.clear();
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, HTMLElement: w.HTMLElement, location: w.location });
  loads++;
  (await import("./js/core/auth.js")).signIn("admin", "Aarav Mehta", "EMP-1001");
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`${script} import: ${e.message}`); }
  await settle();
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const bell = () => d.querySelector(".topbar__icon-btn--dot");
const panel = () => d.getElementById("bell-panel");
const st = () => ({ open: !!panel() && !panel().hidden, expanded: bell()?.getAttribute("aria-expanded") ?? null, focus: d.activeElement?.id || d.activeElement?.className || null });
const isOpen = (s) => s.open && s.expanded === "true" && s.focus === "bell-panel-title";
const isShut = (s) => !s.open && s.expanded === "false";
const size = (wd, ht) => { Object.defineProperty(w, "innerWidth", { value: wd, configurable: true }); Object.defineProperty(w, "innerHeight", { value: ht, configurable: true }); w.dispatchEvent(new w.Event("resize")); };

// ---------------------------------------------------------------
section("S. The premise: the bell is 14G's button on both pages");
await open("profile");
check("S1", "My profile: the bell is a button that opens the list (aria-haspopup, aria-expanded false), nothing open yet", bell()?.tagName === "BUTTON" && bell().getAttribute("aria-haspopup") === "dialog" && isShut(st()) && !panel(), j(st()));

// ---------------------------------------------------------------
section("P. A second tap while the card's script is still on its way (a slow phone's first tap)");
bell().click(); bell().click(); await settle();   // both clicks land before the script answers
const p1 = st();
check("P1", "two taps before the script answers: the list is open, the bell says expanded, focus on its heading (the second tap no longer closes it)", isOpen(p1), j(p1));
bell().click(); await settle();
const p2 = st();
check("P2", "a tap after it opened still closes it, focus back on the bell (the toggle works as before)", isShut(p2) && d.activeElement === bell(), j(p2));
bell().click(); await settle();
const p3 = st();
check("P3", "and a tap after that opens it again (nothing stays blocked once the script answered)", isOpen(p3), j(p3));

// ---------------------------------------------------------------
section("R. A resize: only a new width closes the list, not the address bar");
await open("admin");   // the dashboard has the card's script already (its Review buttons)
size(412, 839); bell().click(); await settle();
const r0 = st();
size(412, 915); const r1 = st();   // the address bar slides away as the page scrolls
size(412, 839); const r2 = st();   // and back
check("R1", "open at 412 x 839, the address bar slides away (915) and back (839): the list stays open, expanded, focus on its heading", isOpen(r0) && isOpen(r1) && isOpen(r2), j([r0, r1, r2]));
size(915, 412); const r3 = st();   // the phone turned
check("R2", "a new width (the phone turned, a window resized) still closes it, as in 14G", isShut(r3), j(r3));
bell().click(); await settle(); const r4 = st();
size(915, 380); const r5 = st();
check("R3", "opened again at the new width, a height-only change there keeps it open too (the width it opened at is what counts)", isOpen(r4) && isOpen(r5), j([r4, r5]));
size(1280, 800); const r6 = st();
check("R4", "and from there a desktop-width resize closes it", isShut(r6), j(r6));

// ---------------------------------------------------------------
section("W. Scope and words, from frozen copies");
const NOWJS = path.join(HERE, "js-pre14GB"), PREV = path.join(HERE, "js-pre14G");
const a = walk(NOWJS), b = walk(PREV);
const changed = a.filter((f) => b.includes(f) && read(NOWJS, f) !== read(PREV, f));
check("W1", "against 14G's js, exactly ui/approval-card.js and ui/topbar.js changed; no file added or removed", a.length === b.length && a.length > 90 && j(a) === j(b) && j(changed) === j(["ui/approval-card.js", "ui/topbar.js"]), j({ files: a.length, changed }));
const literals = (s) => new Set((s.replace(/(^|\s)\/\/\s.*$/gm, "$1").match(/"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) ?? []));
const sameWords = ["ui/approval-card.js", "ui/topbar.js"].map((f) => { const x = literals(read(NOWJS, f)), y = literals(read(PREV, f)); return [f, [...x].filter((s) => !y.has(s)), [...y].filter((s) => !x.has(s)), x.size]; });
check("W2", "no new words: the two files' string literals are 14G's, none added or removed", sameWords.every(([, add, gone, n]) => !add.length && !gone.length && n > 20), j(sameWords));

section("E. No js errors");
check("E99", "no js errors on any load", jsErrors.length === 0, j(jsErrors.slice(0, 3)));
console.log(`\n${passed} passed, ${failed} failed`);
