// usage: node appearance.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 13X (round-13v-scoping.md V2, V9; J-T1 to J-T6): the theme and accent system. The topbar's Appearance menu: Light, Dark,
// Match the device, "My role's colour" or one of six accents, saved per device (officeos:theme, officeos:accent). Printed
// payslips and avatars keep the role's colour. Settings' Appearance card saves the theme. ./js-pre13X, ./html-pre13X and
// ./css-pre13W are the code, pages and css before this round (office-os 7d931bd); ./css-pre13X is this round's css.
//   G  before;  N  nothing saved;  T  theme;  A  accent;  K  keyboard and clicks;  S  Settings;  C  css rules;  E  no page errors;  X  scope
// jsdom applies no stylesheet, so css is checked here as rules and in Edge as computed colours.
// Fresh storage, Mon 9 Nov 2026 11:00.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const CSS = path.join(DIR, "..", "assets", "css");

const RealDate = Date;
const NOW = new RealDate(2026, 10, 9, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

let loads = 0, w = null, d = null, saved = {}, device = null;
const allErrors = [];
async function open(target) {
  const page = target.split("?")[0];
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation|reload/i.test(e.message)) allErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(path.join(DIR, page), "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${target}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.confirm = () => true;
  if (device) w.matchMedia = () => device;
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  // A throw in app.js (matchMedia unguarded, say) fails E1 and the checks after it, rather than crashing and dropping them from the total.
  try { await import(`./js/app.js?load=${loads}`); } catch (e) { allErrors.push(`app.js on ${page}: ${e.message}`); }
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
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "");   // a missing file fails its check, on pristine, rather than crashing

fresh(); await open("auth/login.html");
const AU = await import("./js/core/auth.js");
const ARJUN = ["emp", "Arjun Kapoor", "EMP-1105"], AARAV = ["admin", "Aarav Mehta", "EMP-1001"], PRIYA = ["hr", "Priya Nair", "EMP-1003"], KABIR = ["fin", "Kabir Shah", "EMP-1008"];
async function as(who, page) { fresh(); await open("auth/login.html"); AU.signIn(...who); await open(page); }
const press = (key, target = d.body) => target.dispatchEvent(new w.KeyboardEvent("keydown", { key, bubbles: true }));
const click = (n) => { const e = new w.MouseEvent("click", { bubbles: true, cancelable: true }); n?.dispatchEvent(e); return e; };
const css = (dir, f) => read(path.join(dir, f)).replace(/\r\n/g, "\n");
const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const html = () => d.documentElement;
const key = (k) => w.localStorage.getItem(`officeos:${k}`);
const menu = () => d.querySelector(".theme-menu")?.closest(".dropdown");
const trigger = () => menu()?.querySelector(":scope > button");
const themeBtn = (v) => d.querySelector(`[data-theme-choice="${v}"]`);
const accentBtn = (v) => d.querySelector(`[data-accent-choice="${v}"]`);
const pressed = (sel) => [...d.querySelectorAll(sel)].filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.themeChoice ?? b.dataset.accentChoice);
const SIX = ["indigo", "blue", "teal", "violet", "slate", "pink"], NAMES = ["Indigo", "Blue", "Teal", "Violet", "Slate", "Pink"];

// =================================================================
section("G. Before (js-pre13X, html-pre13X, css-pre13W)");
const preTheme = fs.readFileSync(path.join(HERE, "js-pre13X", "ui", "theme.js"), "utf8");
check("G1", "before: theme.js had no accent, no menu and no device setting", !/accent|renderThemeMenu|matchMedia/i.test(preTheme));
const preTokens = css(path.join(HERE, "css-pre13W"), "base/tokens.css");
check("G2", "before: tokens.css had no accent block and no --role-base; the role lines set --primary-base", !/data-accent|--role-base/.test(preTokens) && /\[data-role="admin"\] \{ --primary-base: #4f46e5; \}/.test(preTokens));
const preSettings = fs.readFileSync(path.join(HERE, "html-pre13X", "system", "settings.html"), "utf8");
check("G3", "before: Settings' Save appearance was a placeholder, 'Accent color', and the banner said nothing here is saved", preSettings.includes('data-not-implemented="Save appearance"') && preSettings.includes("<th>Accent color</th>") && preSettings.includes("how they could look; nothing here is saved or applied") && preSettings.includes("Each role's accent color is set from its role.") && preSettings.split("Default theme").length === 3 && preSettings.includes("Follows each person's setting"));

// =================================================================
section("N. Nothing saved: exactly as today");
await as(AARAV, "dashboard/admin.html");
check("N1", "no theme or accent saved: <html> has neither attribute, and takes the role's colour", !html().hasAttribute("data-theme") && !html().hasAttribute("data-accent") && html().dataset.role === "admin");
check("N2", "...and nothing was written to either key", key("theme") === null && key("accent") === null);
check("N3", "the menu shows Light and My role's colour as the current choices", j(pressed("[data-theme-choice]")) === j(["light"]) && j(pressed("[data-accent-choice]")) === j([""]) && txt(d.querySelector(".theme-menu__current")) === "My role's colour", j(pressed("[data-theme-choice]")));
for (const [n, who, page, role] of [["N4", AARAV, "dashboard/admin.html", "admin"], ["N5", PRIYA, "dashboard/hr.html", "hr"], ["N6", KABIR, "dashboard/finance.html", "fin"], ["N7", ARJUN, "dashboard/employee.html", "emp"]]) {
  await as(who, page);
  check(n, `${role}: the menu is there, first in the topbar's actions, and the role's colour stands`, !!menu() && d.querySelector(".topbar__actions").firstElementChild === menu() && html().dataset.role === role && !html().hasAttribute("data-accent"));
}
const labels = () => [...d.querySelectorAll("[data-accent-choice]")].map((b) => b.getAttribute("aria-label"));
check("N8", "the choices: My role's colour first, then the six; every swatch named, and the menu's three themes", j(labels()) === j(["My role's colour", ...NAMES]) && j([...d.querySelectorAll("[data-theme-choice]")].map(txt)) === j(["Light", "Dark", "Match the device"]), j(labels()));
check("N9", "the menu's button is labelled 'Appearance', and its two groups are named", trigger()?.getAttribute("aria-label") === "Appearance" && d.querySelector('.theme-menu__themes[role="group"]')?.getAttribute("aria-label") === "Theme" && d.querySelector('.theme-menu__accents[role="group"]')?.getAttribute("aria-label") === "Accent colour");
check("N10", "no free colour picker anywhere in the menu", !d.querySelector('.theme-menu input'));
check("N12", "the menu's visible words, exactly", txt(d.querySelector(".theme-menu")) === "Theme LightDarkMatch the device Accent colour My role's colour", txt(d.querySelector(".theme-menu")));
fresh(); await open("auth/login.html");
check("N11", "a page with no topbar (login) has no menu and no error", !menu() && allErrors.length === 0, j(allErrors.slice(0, 2)));

// =================================================================
section("T. Theme");
await as(ARJUN, "dashboard/employee.html");
click(themeBtn("dark"));
check("T1", "Dark: data-theme dark, saved in officeos:theme, pressed", html().dataset.theme === "dark" && key("theme") === '"dark"' && j(pressed("[data-theme-choice]")) === j(["dark"]), key("theme"));
await open("leave/apply-leave.html");
check("T2", "it persists to the next page, and the menu shows it", html().dataset.theme === "dark" && j(pressed("[data-theme-choice]")) === j(["dark"]));
await open("leave/apply-leave.html");
check("T3", "...and across a reload", html().dataset.theme === "dark");
click(themeBtn("light"));
check("T4", "Light: data-theme light, saved", html().dataset.theme === "light" && key("theme") === '"light"');
click(themeBtn("system"));
check("T5", "Match the device with no matchMedia (jsdom): saved as system, paints light, no error", html().dataset.theme === "light" && key("theme") === '"system"' && allErrors.length === 0, j(allErrors.slice(0, 2)));
let listeners = [];
const stub = (matches) => ({ matches, addEventListener: (t, f) => listeners.push([t, f]) });
device = stub(true);
await open("leave/apply-leave.html");
check("T6", "Match the device, device dark: paints dark, and still saved as system (the menu shows Match the device)", html().dataset.theme === "dark" && key("theme") === '"system"' && j(pressed("[data-theme-choice]")) === j(["system"]));
device.matches = false; listeners.filter(([t]) => t === "change").forEach(([, f]) => f());
check("T7", "the device changes to light: the page follows without a reload", html().dataset.theme === "light");
click(themeBtn("dark")); device.matches = true; listeners.filter(([t]) => t === "change").forEach(([, f]) => f());
device.matches = false; listeners.filter(([t]) => t === "change").forEach(([, f]) => f());
check("T8", "with Dark chosen, a change on the device changes nothing", html().dataset.theme === "dark");
device = stub(false); click(themeBtn("system")); await open("leave/apply-leave.html");
check("T9", "Match the device, device light: paints light", html().dataset.theme === "light");
device = null;
for (const [n, bad] of [["T10", '"neon"'], ["T11", "7"], ["T12", "{not json"]]) {
  await as(ARJUN, "dashboard/employee.html"); w.localStorage.setItem("officeos:theme", bad); await open("dashboard/employee.html");
  check(n, `a saved theme that isn't one of the three (${bad}): ignored, as if nothing were saved`, !html().hasAttribute("data-theme") && j(pressed("[data-theme-choice]")) === j(["light"]));
}

// =================================================================
section("A. Accent");
await as(ARJUN, "dashboard/employee.html");
for (const [i, a] of SIX.entries()) {
  click(accentBtn(a));
  check(`A${i + 1}`, `${a}: data-accent ${a}, saved in officeos:accent, pressed, and named in the menu`, html().dataset.accent === a && key("accent") === `"${a}"` && j(pressed("[data-accent-choice]")) === j([a]) && txt(d.querySelector(".theme-menu__current")) === NAMES[i], key("accent"));
}
click(accentBtn("teal"));
check("A7", "an accent leaves data-role alone: the role is still known", html().dataset.role === "emp" && html().dataset.accent === "teal");
await open("requests/claim-expense.html");
check("A8", "it persists to the next page", html().dataset.accent === "teal" && j(pressed("[data-accent-choice]")) === j(["teal"]));
click(accentBtn(""));
check("A9", "My role's colour: the attribute and the key are both gone, not set to nothing", !html().hasAttribute("data-accent") && key("accent") === null && j(pressed("[data-accent-choice]")) === j([""]) && txt(d.querySelector(".theme-menu__current")) === "My role's colour", key("accent"));
for (const [n, bad] of [["A10", '"#ff0000"'], ["A11", '"green"'], ["A12", "{not json"]]) {
  await as(ARJUN, "dashboard/employee.html"); w.localStorage.setItem("officeos:accent", bad); await open("dashboard/employee.html");
  check(n, `a saved accent that isn't one of the six (${bad}): ignored, the role's colour stands`, !html().hasAttribute("data-accent") && j(pressed("[data-accent-choice]")) === j([""]));
}
await as(ARJUN, "dashboard/employee.html");
click(accentBtn("pink")); click(themeBtn("dark"));
d.querySelector("[data-signout]")?.click();
await open("auth/login.html");
check("A13", "per device: sign-out keeps both keys, and the login page takes both", key("accent") === '"pink"' && key("theme") === '"dark"' && html().dataset.accent === "pink" && html().dataset.theme === "dark", `${key("accent")} ${html().dataset.accent}`);
AU.signIn(...AARAV); await open("dashboard/admin.html");
check("A14", "the next person on this device gets the same look (J-T3), on their own role", html().dataset.accent === "pink" && html().dataset.theme === "dark" && html().dataset.role === "admin");
await open("users/users-list.html");
const boxes = () => Object.keys(w.localStorage).filter((k) => k.startsWith("officeos:")).length, boxesBefore = boxes();
[...d.querySelectorAll(".page-header__actions button")].find((b) => b.textContent === "Reset demo data")?.click();
check("A15", "Reset demo data really ran, and leaves both keys alone (J-T5)", boxes() < boxesBefore && key("accent") === '"pink"' && key("theme") === '"dark"', `${boxesBefore} -> ${boxes()}; ${key("accent")} ${key("theme")}`);

// =================================================================
section("K. Keyboard and clicks (ui/dropdown.js)");
await as(AARAV, "dashboard/admin.html");
const isOpen = () => menu()?.classList.contains("is-open");
check("K1", "on load: closed, aria-expanded false", !isOpen() && trigger()?.getAttribute("aria-expanded") === "false");
trigger()?.focus(); click(trigger());
check("K2", "pressed: open, aria-expanded true", isOpen() && trigger()?.getAttribute("aria-expanded") === "true");
click(accentBtn("teal"));
check("K3", "a choice leaves it open, so colours can be compared", isOpen() && html().dataset.accent === "teal");
click(themeBtn("dark"));
check("K4", "...and a theme choice too", isOpen() && html().dataset.theme === "dark");
accentBtn("blue")?.focus(); press("Escape");
check("K5", "Esc closes it, aria-expanded false, focus back on its button", !isOpen() && trigger()?.getAttribute("aria-expanded") === "false" && d.activeElement === trigger());
click(trigger()); click(d.body);
check("K6", "a click elsewhere closes it", !isOpen() && trigger()?.getAttribute("aria-expanded") === "false");
click(trigger()); click(trigger());
check("K7", "its button closes it", !isOpen());
const account = () => [...d.querySelectorAll(".topbar .dropdown")].find((x) => x.querySelector("[data-signout]"));
click(trigger()); click(account().querySelector("button"));
check("K8", "opening the account menu closes it: one menu at a time", !isOpen() && account().classList.contains("is-open"));
click(trigger());
check("K9", "...and the other way round", isOpen() && !account().classList.contains("is-open"));
click(trigger());
check("K10", "the menu's own button is what ui/dropdown.js treats as its trigger, not a choice inside it", trigger()?.matches(".topbar__icon-btn") && !trigger()?.hasAttribute("data-accent-choice"));
check("K11", "the theme and accent choices are real buttons, so they reach the keyboard", [...d.querySelectorAll("[data-theme-choice], [data-accent-choice]")].every((b) => b.tagName === "BUTTON" && b.type === "button"));
const drop = read(path.join(HERE, "js-pre14A", "ui", "dropdown.js"));   // Round 14A (layout; was the live js): 9c7423e's, frozen; the live js: jsguard.mjs
check("K12", "no second menu pattern: dropdown.js and menu-toggle.js are unchanged, and theme.js has no key handler of its own", drop === read(path.join(HERE, "js-pre13X", "ui", "dropdown.js")) && read(path.join(HERE, "js-pre14A", "ui", "menu-toggle.js")) === read(path.join(HERE, "js-pre13X", "ui", "menu-toggle.js")) && !/keydown|Escape/.test(read(path.join(HERE, "js", "ui", "theme.js"))));

// =================================================================
section("S. Settings' Appearance card");
await as(AARAV, "system/settings.html");
const radio = (v) => d.querySelector(`input[name="theme"][value="${v}"]`), checkedRadio = () => d.querySelector('input[name="theme"]:checked')?.value;
const saveBtn = () => d.getElementById("save-appearance");
const toasts = () => [...d.querySelectorAll(".toast-container .toast__text")].map(txt);
check("S1", "nothing saved: Light is the card's choice", checkedRadio() === "light");
check("S2", "the card's Save button is real now: no placeholder, and it stays Admin's (settings:edit)", !!saveBtn() && !saveBtn().hasAttribute("data-not-implemented") && saveBtn().getAttribute("data-permission") === "settings:edit" && txt(saveBtn()) === "Save appearance");
radio("dark").checked = true;
check("S3", "picking a radio saves nothing until Save", key("theme") === null && !html().hasAttribute("data-theme"));
click(saveBtn());
check("S4", "Save: applied and saved, with 'Appearance saved.'", html().dataset.theme === "dark" && key("theme") === '"dark"' && toasts().includes("Appearance saved."), j(toasts()));
check("S5", "the topbar's menu shows what the card saved", j(pressed("[data-theme-choice]")) === j(["dark"]));
click(themeBtn("system"));
check("S6", "...and the card shows what the menu saved", checkedRadio() === "system");
await open("system/settings.html");
check("S7", "a saved choice is on the card when the page opens", checkedRadio() === "system");
click(themeBtn("light")); await open("system/settings.html");
check("S8", "...Light too", checkedRadio() === "light");
const banner = txt(d.querySelector("main .alert--info"));
check("S9", "the sample banner stays, and says what now really saves", banner === "Sample, not built yet: company settings aren't part of OfficeOS yet. This page shows how they could look; apart from the Appearance theme, which saves on this device, nothing here is saved or applied, and the rules and values listed are examples.", banner);
const heads = [...d.querySelectorAll("#appearance th")].map(txt);
check("S10", "'Accent colour', and the roles' accent swatches stay", j(heads) === j(["Role", "Accent colour", "Colour code"]) && ["admin", "hr", "fin", "emp"].every((r) => d.querySelector(`#appearance .swatch--${r}`)), j(heads));
const others = [...d.querySelectorAll("main [data-not-implemented]")].map((b) => b.getAttribute("data-not-implemented"));
check("S11", "every other Save on the page stays a placeholder: the banner is true of them", others.length > 0 && !others.includes("Save appearance") && others.every((x) => x !== ""), j(others));
// J-X3: the three strings the approval changed, in its words
const cardFoot = txt(d.querySelector("#appearance .card__footer .card__meta"));
check("S12", "the card's footer: the accent is the role's unless someone picks their own", cardFoot === "Each role's accent colour is set from its role, unless someone picks their own in the Appearance menu.", cardFoot);
const cardLabel = txt(d.querySelector("#appearance .form-label")), cardGroup = d.querySelector('#appearance [role="radiogroup"]')?.getAttribute("aria-label");
check("S13", "'Theme on this device': what the card shows and what a screen reader hears", cardLabel === "Theme on this device" && cardGroup === "Theme on this device", j([cardLabel, cardGroup]));
const metas = [...d.querySelectorAll("#appearance .choice__meta")].map(txt);
check("S14", "'Follows this device's setting' on Match the device; the other two as they were", j(metas) === j(["Bright background", "Easier on the eyes at night", "Follows this device's setting"]), j(metas));
const cardWords = txt(d.getElementById("appearance")), oldWords = /Default theme|each person's|accent color/;
check("S15", "the card's visible words, exactly, and none of the old ones", cardWords === "Appearance Theme on this device LightBright background DarkEasier on the eyes at night Match the deviceFollows this device's setting Role Accent colour Colour code AdminIndigo#4F46E5 HRTeal#0F766E FinanceAmber brown#B45309 EmployeeBlue#2563EB Each role's accent colour is set from its role, unless someone picks their own in the Appearance menu. Save appearance" && !oldWords.test(cardWords), cardWords);

// =================================================================
section("C. The css");
const tokens = css(CSS, "base/tokens.css"), print = css(CSS, "print.css"), avatar = css(CSS, "components/avatar.css");
const accentLines = [...noComments(tokens).matchAll(/\[data-accent="(\w+)"\]\s*\{([^}]*)\}/g)];
check("C1", "the six accents, in order, each with its ruled colour", j(accentLines.map((m) => m[1])) === j(SIX) && j(accentLines.map((m) => m[2].match(/#[0-9a-f]{6}/)?.[0])) === j(["#4f46e5", "#245fe2", "#0f766e", "#6d28d9", "#475569", "#be185d"]), j(accentLines.map((m) => m[1])));   // Round Contrast pass (behaviour; blue was #2563eb: 4.44 on its soft fill, contrast.mjs F4)
check("C2", "each only overrides --primary-base", accentLines.length === 6 && accentLines.every((m) => /^\s*--primary-base: #[0-9a-f]{6};\s*$/.test(m[2])));
const lastRole = tokens.lastIndexOf('[data-role="emp"]'), firstAccent = tokens.indexOf('[data-accent="indigo"]');
check("C3", "the block comes after the role accents, so it wins over them", lastRole > 0 && firstAccent > lastRole);
check("C4", "the role colours are as they were, now in --role-base", [["admin", "#4f46e5"], ["hr", "#0f766e"], ["fin", "#aa4e09"], ["emp", "#245fe2"]] /* Round Contrast pass (behaviour; were #b45309 and #2563eb: contrast.mjs K3, F4) */.every(([r, c]) => new RegExp(`\\[data-role="${r}"\\]\\s*\\{ --role-base: ${c}; \\}`).test(tokens)) && /--primary-base: var\(--role-base\)/.test(tokens));
check("C5", "print: the role's colour, whatever the accent (J-T4)", /:root, \[data-theme="dark"\] \{[^}]*--primary-base: var\(--role-base\);[^}]*--color-primary: var\(--primary-base\);/.test(print));
const IMPORT = noComments(css(CSS, "style.css"));
check("C6", "...and that holds only if print.css comes after tokens.css, which it does", IMPORT.indexOf("print.css") > IMPORT.indexOf("base/tokens.css") && IMPORT.indexOf("base/tokens.css") >= 0);
check("C7", "avatars keep the role's colour: the plain avatar reads --role-primary, in both themes and in print", /\.avatar \{[^}]*background: var\(--role-primary-soft\);\s*color: var\(--role-primary\);/.test(avatar) && /--role-primary: var\(--role-base\)/.test(tokens) && /\[data-theme="dark"\] \{[^}]*--role-primary: color-mix\(in srgb, var\(--role-base\) 62%, #ffffff\);/.test(tokens) && /--role-primary: var\(--role-base\);/.test(print));
const block = (s) => noComments(s).split("\n").filter((l) => /--color-(sidebar|success|warning|danger|info)|--chip-/.test(l)).join("\n");
check("C8", "the sidebar, status and avatar-chip colours are untouched, in both themes", block(css(path.join(HERE, "css-pre14B"), "base/tokens.css")) === block(preTokens));   // Round 14C (layout; was the live tokens): 1b6b3dd's, frozen; 14C adds two sidebar tokens (rail.mjs X5)
const PRE = path.join(HERE, "css-pre13W");
check("C9", "the sidebar, auth panel and tooltip css are untouched", ["layout/shell.css", "pages/auth.css", "components/tooltip.css"].every((f) => css(path.join(HERE, "css-pre13X"), f) === css(PRE, f)));   // Round 13Z (scope; was the live css; 13Z's own shell.css edit: honest.mjs X2)
check("C10", "the swatches read the accent block: nothing repeats a hex in the menu's css or in theme.js", !/#[0-9a-f]{3,6}\b/i.test(noComments(css(CSS, "components/theme-menu.css"))) && !/#[0-9a-f]{6}\b/i.test(read(path.join(HERE, "js", "ui", "theme.js"))));
check("C11", "no no-flash script this round (J-T6): no page's head changed", !/data-theme|data-accent|officeos:/.test(fs.readFileSync(path.join(HERE, "html-pre14A", "dashboard", "admin.html"), "utf8").split("</head>")[0]));   // Round 14B (layout; was the live page): 13X's claim, read from 9c7423e's page; 14B added the script on purpose (noflash.mjs)
const menuCss = noComments(css(CSS, "components/theme-menu.css"));
check("C12", "on a phone the menu hangs from the topbar, so it can't run off the left edge of a narrow screen", /@media \(max-width: 560px\) \{\s*\.dropdown:has\(\.theme-menu\) \{ position: static; \}\s*\.theme-menu \{ right: var\(--space-4\); max-width: calc\(100vw - 2 \* var\(--space-4\)\); \}/.test(menuCss));
check("C13", "in dark a swatch shows the lightened accent the UI uses, and the role's swatch its role's colour, whatever the accent", /\[data-theme="dark"\] \.theme-swatch \{ background: color-mix\(in srgb, var\(--primary-base\) 62%, var\(--color-text\)\); \}/.test(menuCss) && /\.theme-swatch\.theme-swatch--role \{ background: var\(--role-primary\); \}/.test(menuCss));
check("C14", "the seven swatches fit one row of the 248px menu: 7 x 26 + 6 x 6 is no wider than its 224px inside", /\.theme-menu \{ width: 248px; padding: var\(--space-3\); \}/.test(menuCss) && /\.theme-menu__accents \{ display: flex; flex-wrap: wrap; gap: 6px; \}/.test(menuCss) && /\.theme-swatch \{\s*width: 26px;/.test(menuCss));

// =================================================================
section("E. No page errors");
check("E1", "no page errors in any load", allErrors.length === 0, j(allErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const walk = (dir) => fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile())
  .map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replace(/\\/g, "/")).sort();
const changedIn = (now, then) => { const a = walk(now), b = walk(then); return { changed: a.filter((f) => b.includes(f) && fs.readFileSync(path.join(now, f), "latin1") !== fs.readFileSync(path.join(then, f), "latin1")), added: a.filter((f) => !b.includes(f)), removed: b.filter((f) => !a.includes(f)) }; };
const js = changedIn(path.join(HERE, "js-pre13Z"), path.join(HERE, "js-pre13X"));   // Round 13Z (scope, X1, X3, X5, X6; were the live tree): 13X's own change, frozen; the live tree: honest.mjs X1, X3
check("X1", "js: exactly app.js, pages/settings.js and ui/theme.js changed; nothing added or removed", j(js) === j({ changed: ["app.js", "pages/settings.js", "ui/theme.js"], added: [], removed: [] }), j(js));
const cssNow = changedIn(path.join(HERE, "css-pre13X"), PRE);
check("X2", "css: exactly base/tokens.css, components/avatar.css, print.css and style.css changed; components/theme-menu.css added", j(cssNow) === j({ changed: ["base/tokens.css", "components/avatar.css", "print.css", "style.css"], added: ["components/theme-menu.css"], removed: [] }), j(cssNow));
const pages = changedIn(path.join(HERE, "html-pre13Z"), path.join(HERE, "html-pre13X"));
check("X3", "pages: exactly system/settings.html changed; nothing added or removed", j(pages) === j({ changed: ["system/settings.html"], added: [], removed: [] }), j(pages));
const crlf = (s) => !/[^\r]\n/.test(s) && !s.endsWith("\n");
check("X4", "every changed file CRLF with no final newline",
  js.changed.every((f) => crlf(fs.readFileSync(path.join(HERE, "js-pre13Z", f), "utf8"))) && [...cssNow.changed, ...cssNow.added].every((f) => crlf(fs.readFileSync(path.join(HERE, "css-pre13X", f), "utf8"))) && pages.changed.every((f) => crlf(fs.readFileSync(path.join(HERE, "html-pre13Z", f), "utf8"))));
const linesOf = (s) => s.split("\r\n");
const settingsNow = linesOf(fs.readFileSync(path.join(HERE, "html-pre13Z", "system", "settings.html"), "utf8")), settingsThen = linesOf(preSettings);
const diffLines = settingsNow.filter((l, i) => l !== settingsThen[i]);
const reviewed = [["how they could look; nothing here", "how they could look; apart from the Appearance theme, which saves on this device, nothing here"], ["<th>Accent color</th>", "<th>Accent colour</th>"], ['data-not-implemented="Save appearance">', 'id="save-appearance">'],
  ["Each role's accent color is set from its role.", "Each role's accent colour is set from its role, unless someone picks their own in the Appearance menu."], ['<p class="form-label mb-2">Default theme</p>', '<p class="form-label mb-2">Theme on this device</p>'], ['aria-label="Default theme"', 'aria-label="Theme on this device"'], ["Follows each person's setting", "Follows this device's setting"]];
const wantedSettings = reviewed.reduce((s, [a, b]) => s.replace(a, b), preSettings);
check("X5", "settings.html: exactly seven lines differ, in exactly these words (the banner, the label, the Save button, J-X3's footer, label, group name and Match the device)", settingsNow.length === settingsThen.length && diffLines.length === 7 && settingsNow.join("\r\n") === wantedSettings, diffLines.length);
const addedLines = (f) => { const a = new Set(fs.readFileSync(path.join(HERE, "js-pre13X", f), "utf8").split("\r\n")); return fs.readFileSync(path.join(HERE, "js-pre13Z", f), "utf8").split("\r\n").filter((l) => !a.has(l)).join("\n"); };
const quoted = (s) => [...s.replace(/^\s*\/\/.*$/gm, "").matchAll(/"([A-Z][a-z][^"]*)"/g)].map((m) => m[1]);
const strs = [...new Set(["app.js", "ui/theme.js", "pages/settings.js"].flatMap((f) => quoted(addedLines(f))))].sort();
check("X6", "the only new words in the js: the three themes, the six accents, the menu's labels, 'Appearance saved.'", j(strs) === j(["Accent colour", "Appearance", "Appearance saved.", "Blue", "Dark", "Indigo", "Light", "Match the device", "My role's colour", "Pink", "Slate", "Teal", "Theme", "Violet"]), j(strs));
check("X7", "toggleTheme stays as it was, and core/storage.js is unchanged: keys through its save, load and remove", /export function toggleTheme\(\) \{/.test(read(path.join(HERE, "js", "ui", "theme.js"))) && read(path.join(HERE, "js-pre14A", "core", "storage.js")) === read(path.join(HERE, "js-pre13X", "core", "storage.js")) && !/localStorage/.test(read(path.join(HERE, "js", "ui", "theme.js"))));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
