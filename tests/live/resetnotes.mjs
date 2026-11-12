// usage: node resetnotes.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 11H: reset-password.html given 11G's change-password treatment. ./js-pre11H, ./html-pre11H and ./css-pre11H are
// the code, pages and css before this round (office-os d731571).
//   M  the strength meter ("Strength: Good. Add a symbol to make it strong.") and the ticked requirements list are gone.
//   L  the page's other static claims about a reset that isn't happening: "This link expires in 30 minutes. Need a new
//      one? Request another link" is gone; "After the reset, you'll be signed out of every device." is gone; "Resetting
//      the password for arjun.kapoor@northwind.com" now says passwords aren't part of OfficeOS (forgot-password's words).
//   R  11D's form unchanged; the rest of the page byte for byte.
//   X  scope: exactly pages/auth/reset-password.html; no js, no css.
// The page is opened signed out, as it's reached from Forgot password. A fixed clock: Mon 2 Nov 2026 10:00 local time.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
const NOW = new RealDate(2026, 10, 2, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

let writes = [];
const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { writes.push(k.replace("officeos:", "")); mem.set(k, String(v)); }, removeItem: (k) => { writes.push(`-${k.replace("officeos:", "")}`); mem.delete(k); }, clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
let loads = 0, w = null, d = null, navigations = [];
const allJsErrors = [];
// Opens a page from `dir` with the js under `js` (./js or ./js-pre11H), signed out, running the module scripts its HTML loads.
async function open(page, { dir = DIR, js = "js" } = {}) {
  const vc = new VirtualConsole();
  navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message.slice(0, 60)); else if (!/form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${dir}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, HTMLElement: w.HTMLElement });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) await import(`./${js}/${m[1]}?load=${loads}`);
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const norm = (s) => (s ?? "").replace(/\s+/g, " ").trim();
const fresh = () => { mem.clear(); timers = []; writes = []; };
const html = (dir, page) => fs.readFileSync(`${dir}/${page}.html`, "utf8");
const PRE = `${HERE}html-pre11H`;
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${["success", "danger", "warning", "info"].find((k) => t.className.includes(`toast--${k}`)) ?? "?"}: ${t.querySelector(".toast__text").textContent.trim()}`);
const SUB = "Passwords aren't part of OfficeOS yet, so there's no reset link and nothing on this page resets a password. To sign in, pick a role under \"Preview as\" on the sign-in page.";
const RESET = "Passwords aren't part of OfficeOS yet: nothing was reset.";

fresh();
await open("auth/reset-password");
const body = norm(d.body.textContent);
const form = d.querySelector("form");
const shape = (id) => [...d.getElementById(id).closest(".form-field").children].map((e) => e.className);

// =================================================================
section("M. no strength meter and no ticked requirements");
check("M1", "no strength meter: no .strength bars and no 'Strength:' hint; 'New password' is its label and input only, as 'Confirm new password' is",
  !d.querySelector(".strength, .strength__bar") && !/Strength|Add a symbol/.test(body) && j(shape("rp-new")) === j(["form-label form-label--required", "input-group input-group--action"]) && j(shape("rp-new")) === j(shape("rp-confirm")), j(shape("rp-new")));
check("M2", "no requirements list: no .reqs, no ticks, none of its rules; the form is the two fields, then the button",
  !d.querySelector(".reqs, .is-met") && !/At least 12 characters|uppercase and a lowercase|At least one number|At least one symbol/.test(body)
  && j([...form.children].map((e) => e.className)) === j(["form-field", "form-field", "btn btn--primary btn--lg btn--block"]), j([...form.children].map((e) => e.className)));

// =================================================================
section("L. no link, no sign-out and no account that aren't there");
const sub = d.querySelector(".auth__sub");
check("L1", "under the title, what's true: passwords aren't part of OfficeOS, no reset link, nothing here resets one, and how to sign in; no one's address",
  sub?.textContent === SUB && sub.children.length === 0 && !/arjun\.kapoor@|@northwind\.com|Resetting the password for/.test(body), j(sub?.innerHTML));
check("L2", "the left panel no longer promises 'you'll be signed out of every device': it says only 'Pick something you haven't used before.'",
  norm(d.querySelector(".auth__lead")?.textContent) === "Pick something you haven't used before." && !/signed out of every device|After the reset/.test(body), d.querySelector(".auth__lead")?.textContent);
const helps = [...d.querySelectorAll(".auth__help")].map((p) => [norm(p.textContent), [...p.querySelectorAll("a")].map((a) => a.getAttribute("href"))]);
check("L3", "no 'This link expires in 30 minutes' and no 'Request another link': the only help line left is 'Back to sign in' (login.html)",
  !/expires|30 minutes|Request another link|Need a new one/.test(body) && j(helps) === j([["Back to sign in", ["login.html"]]]), j(helps));
check("L4", "…and the new line points somewhere real: the sign-in page has 'Preview as', and forgot-password says the same about reset links (11D)",
  /auth__demo-title">Preview as</.test(html(DIR, "auth/login")) && html(DIR, "auth/forgot-password").includes("passwords aren't part of OfficeOS yet, so no reset link is sent. To sign in, pick a role under \"Preview as\" on the sign-in page."));

// =================================================================
section("R. the rest unchanged");
const fill = (nw, conf) => { form.elements.new.value = nw; form.elements.confirm.value = conf; };
fill("N3w-pass!", "different");
writes = []; form.dispatchEvent(new w.Event("submit", { cancelable: true }));
const err = norm(d.querySelector(".form-error")?.textContent);
fill("N3w-pass!", "N3w-pass!");
form.elements.confirm.dispatchEvent(new w.Event("input", { bubbles: true }));
form.dispatchEvent(new w.Event("submit", { cancelable: true }));
const t = toasts(); timers.splice(0).forEach((fn) => fn());
check("R1", "11D's form unchanged: different passwords say 'Passwords don't match.'; matching ones say nothing was reset (info); no navigation, nothing written, nobody signed in",
  err === "Passwords don't match." && j(t) === j([`info: ${RESET}`]) && navigations.length === 0 && writes.length === 0 && !mem.has("officeos:session"), j([err, t, navigations, writes]));
const CUTS = [
  ['      <p class="auth__lead">Pick something you haven\'t used before. After the reset, you\'ll be signed out of every device.</p>\r\n', '      <p class="auth__lead">Pick something you haven\'t used before.</p>\r\n'],
  ['      <p class="auth__sub">Resetting the password for <strong>arjun.kapoor@northwind.com</strong></p>\r\n', `      <p class="auth__sub">${SUB}</p>\r\n`],
  ['          <div class="strength" data-level="3" aria-hidden="true">\r\n            <span class="strength__bar"></span><span class="strength__bar"></span><span class="strength__bar"></span><span class="strength__bar"></span>\r\n          </div>\r\n          <span class="form-hint">Strength: Good. Add a symbol to make it strong.</span>\r\n', ""],
  ['        <ul class="reqs">\r\n          <li class="is-met">At least 12 characters</li>\r\n          <li class="is-met">An uppercase and a lowercase letter</li>\r\n          <li class="is-met">At least one number</li>\r\n          <li>At least one symbol, like ! or #</li>\r\n        </ul>\r\n\r\n', ""],
  ['      <p class="auth__help">This link expires in 30 minutes. Need a new one? <a class="link" href="forgot-password.html">Request another link</a></p>\r\n', ""],
];
const rp0 = html(PRE, "auth/reset-password"), rp = html(`${HERE}html-pre14A`, "auth/reset-password");   // Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs
check("R2", "…and the rest of reset-password.html is byte-for-byte what it was (the old page with exactly those five changes)",
  CUTS.every(([a]) => rp0.split(a).length === 2) && CUTS.reduce((s, [a, b]) => s.replace(a, b), rp0) === rp);
fresh();
await open("auth/reset-password", { dir: PRE, js: "js-pre11H" });
const old = norm(d.body.textContent);
check("R3", "before 11H, side by side: the meter's hint, 3 of 4 rules ticked, the 30-minute link, Arjun's address and the sign-out promise were all on the page",
  /Strength: Good/.test(old) && d.querySelectorAll(".reqs .is-met").length === 3 && /expires in 30 minutes/.test(old) && /arjun\.kapoor@northwind\.com/.test(old) && /signed out of every device/.test(old));
check("E1", "no JS errors on any load", allJsErrors.length === 0, allJsErrors.join(" | "));

// =================================================================
section("X. Scope: exactly 11H's lines");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
// Round 11L (layout; was the live js, here and in X1): 11H's own change set (no js), read from the frozen result (js-pre11L = HEAD 2883a77); the
// live tree has 11L's user-profile.js since (sweepnotes.mjs X1)
const changedJs = walk(`${HERE}js-pre11L`).filter((f) => !fs.existsSync(`${HERE}js-pre11H/${f}`) || SRC("js-pre11L", f) !== SRC("js-pre11H", f));
// Round 11J (layout; was the live pages, here and in X2): 11H's own page set, read from the frozen result (html-pre11J = HEAD
// bfdcf3f); the live forgot-password and two-factor pages have 11J's lines since (authnotes.mjs X2). The css half: Round 13U, below.
const changedHtml = walk(`${HERE}html-pre11J`).filter((f) => !fs.existsSync(`${PRE}/${f}`) || fs.readFileSync(`${HERE}html-pre11J/${f}`, "utf8") !== fs.readFileSync(`${PRE}/${f}`, "utf8")).sort();
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre11H", f)) : [];
check("X1", "no js changed (reset-password.js is 11D's, untouched); nothing added or removed",
  changedJs.length === 0 && j(walk(`${HERE}js-pre11L`).sort()) === j(walk(`${HERE}js-pre11H`).sort()), j(changedJs));
check("X2", "pages changed: exactly auth/reset-password.html (forgot-password.html and login.html untouched); no css; nothing added or removed",
  j(changedHtml) === j(["auth/reset-password.html"]) && changedCss.length === 0 && j(walk(`${HERE}html-pre11J`).sort()) === j(walk(PRE).sort()), j([changedHtml, changedCss]));
check("X3", "CRLF only; final newline as before", !/[^\r]\n/.test(rp) && rp.endsWith("\n") === rp0.endsWith("\n"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
