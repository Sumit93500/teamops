// usage: node acctpages.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 11B: two account pages stop presenting nothing as something (11A A1 / A2). ./js-pre11B, ./html-pre11B and
// ./css-pre11B are the code, pages and css before this round (office-os 97e1e6c).
//   P  change-password: the new / confirm match check is unchanged; on a match the page now says "Passwords aren't part
//      of OfficeOS yet: nothing was changed." (an info toast) and stays put, where it said "Password updated." and went to
//      my-profile. Nothing is written either way. change-password.html is untouched.
//   S  sessions.html: notifications.html's 7B banner, in the same place, saying the page is a sample; the rest of the page
//      exactly as it was, its buttons still the labelled placeholders they were, and the topbar's real Sign out unchanged.
//   X  scope: exactly pages/change-password.js and pages/account/sessions.html, only 11B's lines.
// A fixed clock: Mon 2 Nov 2026 10:00 local time.
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

const ARJUN = ["emp", "Arjun Kapoor", "EMP-1105"];
let writes = [];
const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { writes.push(k.replace("officeos:", "")); mem.set(k, String(v)); }, removeItem: (k) => { writes.push(`-${k.replace("officeos:", "")}`); mem.delete(k); }, clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
let loads = 0, w = null, d = null, jsErrors = [], navigations = [];
const allJsErrors = [];
// Opens a page from `dir` with the js under `js` (./js or ./js-pre11B), signed in as Arjun, on the shared storage.
async function open(page, script, { dir = DIR, js = "js" } = {}) {
  const vc = new VirtualConsole();
  jsErrors = []; navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message.slice(0, 60)); else if (!/form submission/i.test(e.message)) { jsErrors.push(e.message); allJsErrors.push(`${page}: ${e.message}`); } });
  const dom = new JSDOM(fs.readFileSync(`${dir}/${page}.html`, "utf8"), { url: `http://localhost/office-os/pages/${page}.html`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = () => true;
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, HTMLElement: w.HTMLElement });
  loads++;
  (await import(`./${js}/core/auth.js`)).signIn(...ARJUN);
  await import(`./${js}/app.js?load=${loads}`);
  if (script) await import(`./${js}/pages/${script}.js?load=${loads}`);
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${["success", "danger", "warning", "info"].find((k) => t.className.includes(`toast--${k}`)) ?? "?"}: ${t.querySelector(".toast__text").textContent.trim()}`);
const fresh = () => { mem.clear(); timers = []; writes = []; };
const NOTHING = "Passwords aren't part of OfficeOS yet: nothing was changed.";
const BANNER = "Sample, not built yet: OfficeOS keeps one sign-in per browser, so there are no other devices or sessions to manage. This tab shows how it could look; nothing here signs anyone out or saves these choices, and the devices and sign-in alerts listed are examples.";

// =================================================================
section("P. change-password");
const fill = (cur, nw, conf) => { const f = d.querySelector("form"); f.elements.current.value = cur; f.elements.new.value = nw; f.elements.confirm.value = conf; return f; };
fresh();
await open("account/change-password", "change-password");
let f = fill("anything", "N3w-pass!", "different");
writes = []; f.dispatchEvent(new w.Event("submit", { cancelable: true }));
const err = d.querySelector(".form-error");
check("P1", "new and confirm differ: 'Passwords don't match.' under Confirm, linked to it; no toast; nothing written (unchanged)",
  err?.textContent === "Passwords don't match." && f.elements.confirm.getAttribute("aria-describedby") === err?.id && toasts().length === 0 && writes.length === 0, j([err?.textContent, toasts(), writes]));
f.elements.confirm.dispatchEvent(new w.Event("input", { bubbles: true }));
check("P2", "…typing in Confirm clears the error (unchanged)", !d.querySelector(".form-error"));
fresh();
await open("account/change-password", "change-password");
const sessionBefore = mem.get("officeos:session");
f = fill("anything at all", "N3w-pass!", "N3w-pass!");
const others = [...d.querySelectorAll('input[type="checkbox"]')].find((c) => /other devices/.test(c.parentElement.textContent));
writes = []; f.dispatchEvent(new w.Event("submit", { cancelable: true }));
const t3 = toasts();
const pending = timers.length; timers.splice(0).forEach((fn) => fn());
check("P3", "they match: the page says 'Passwords aren't part of OfficeOS yet: nothing was changed.' as an info toast (not 'Password updated.', not a success)",
  j(t3) === j([`info: ${NOTHING}`]), j(t3));
check("P4", "…and stays put: no navigation (even after every timer has run), no error, nothing written, the session untouched (with 'Sign me out of all other devices' ticked)",
  navigations.length === 0 && !d.querySelector(".form-error") && writes.length === 0 && mem.get("officeos:session") === sessionBefore && others?.checked === true, j({ navigations, pending, writes, others: others?.checked }));
check("P5", "…what was typed stays in the fields (nothing reset, nothing submitted)", f.elements.new.value === "N3w-pass!" && f.elements.confirm.value === "N3w-pass!" && f.elements.current.value === "anything at all");
// Side by side: the same page and click with the script before 11B.
fresh();
await open("account/change-password", "change-password", { dir: `${HERE}html-pre11B`, js: "js-pre11B" });
f = fill("x", "N3w-pass!", "N3w-pass!");
f.dispatchEvent(new w.Event("submit", { cancelable: true }));
const old = toasts(); timers.splice(0).forEach((fn) => fn());
check("P6", "before 11B, side by side: the same submit said 'Password updated.' (success) and then went to my-profile", j(old) === j(["success: Password updated."]) && navigations.length === 1, j([old, navigations]));

// =================================================================
section("S. sessions.html");
fresh();
await open("account/sessions", null);
const stack = d.querySelector(".acct-tabs + .stack") ?? d.querySelector(".stack");
const banner = stack?.firstElementChild;
check("S1", "the banner: the first thing in the page's .stack, right after the account tabs, an info alert, with the new wording",
  banner?.className === "alert alert--info" && banner.textContent === BANNER && d.querySelector(".acct-tabs")?.nextElementSibling === stack, j([banner?.className, banner?.textContent]));
await open("account/notifications", null);
const nStack = d.querySelector(".acct-tabs + .stack"), nBanner = nStack?.firstElementChild;
check("S2", "…the same shape and place as notifications.html's 7B banner (an info alert, first in the .stack after the tabs, starting 'Sample, not built yet:')",
  nBanner?.className === "alert alert--info" && /^Sample, not built yet: /.test(nBanner.textContent) && /^Sample, not built yet: /.test(BANNER) && Boolean(nStack), j(nBanner?.className));
const html = fs.readFileSync(`${DIR}/account/sessions.html`, "utf8"), html0 = fs.readFileSync(`${HERE}html-pre11B/account/sessions.html`, "utf8");
const inserted = `    <div class="alert alert--info">${BANNER}</div>\r\n\r\n`;
const htmlFrozen = fs.readFileSync(`${HERE}html-pre14A/account/sessions.html`, "utf8");   // Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs
check("S3", "…and the rest of sessions.html is byte-for-byte what it was: removing the banner line and its blank line gives the old page", htmlFrozen.replace(inserted, "") === html0 && htmlFrozen.split(inserted).length === 2);
fresh();
await open("account/sessions", null);
const buttons = [...d.querySelectorAll('button[data-permission="sessions:end-own"]')];
writes = []; buttons.forEach((b) => b.click());
check("S4", "its four Sign out buttons are still the labelled placeholders (\"…isn't available in this demo.\"), writing nothing",
  buttons.length === 4 && j([...new Set(toasts())]) === j(["info: Sign out isn't available in this demo.", "info: Sign out of all other devices isn't available in this demo."]) && writes.length === 0, j([buttons.length, toasts(), writes]));
const devices = [...d.querySelectorAll(".device .list__title")].map((t) => t.textContent.replace(/\s+/g, " ").trim());
check("S5", "…the sample devices and the Frankfurt alert are still there (now labelled as examples)", devices.length === 4 && [...d.querySelectorAll(".alert")].some((a) => /Frankfurt/.test(a.textContent)), j(devices));
writes = []; d.querySelector("[data-signout]").click();
check("S6", "the topbar's real Sign out still works on this page: removes the one session key", j(writes) === j(["-session"]) && !mem.has("officeos:session"), j(writes));
check("E1", "no JS errors on any load", allJsErrors.length === 0, allJsErrors.join(" | "));

// =================================================================
section("X. Scope: exactly 11B's lines");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
// Round 11D (layout; was the live js and pages, here and in X1 / X2): 11B's own change set, read from its frozen result
// (js-pre11D / html-pre11D = HEAD 9d9355d); the live tree has 11D's two auth scripts and forgot-password.html since (authpages.mjs X1 / X2)
const changedJs = walk(`${HERE}js-pre11D`).filter((f) => !fs.existsSync(`${HERE}js-pre11B/${f}`) || SRC("js-pre11D", f) !== SRC("js-pre11B", f)).sort();
const changedHtml = walk(`${HERE}html-pre11D`).filter((f) => !fs.existsSync(`${HERE}html-pre11B/${f}`) || fs.readFileSync(`${HERE}html-pre11D/${f}`, "utf8") !== fs.readFileSync(`${HERE}html-pre11B/${f}`, "utf8"));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre11B", f)) : [];
check("X1", "js changed: exactly pages/change-password.js; nothing added or removed", j(changedJs) === j(["pages/change-password.js"]) && j(walk(`${HERE}js-pre11D`).sort()) === j(walk(`${HERE}js-pre11B`).sort()), j(changedJs));
check("X2", "pages changed: exactly account/sessions.html (change-password.html untouched); no css; nothing added or removed",
  j(changedHtml) === j(["account/sessions.html"]) && changedCss.length === 0 && j(walk(`${HERE}html-pre11D`).sort()) === j(walk(`${HERE}html-pre11B`).sort()), j([changedHtml, changedCss]));
const cp = SRC("js-pre14A", "pages/change-password.js");   // Round 14A (layout; was the live js): 9c7423e's, frozen; the live js: jsguard.mjs
const cp0 = SRC("js-pre11B", "pages/change-password.js");
check("X3", "both CRLF only; the final newline as before (change-password.js keeps its one, sessions.html still has none)", [cp, html].every((s) => !/[^\r]\n/.test(s)) && cp.endsWith("\r\n") === cp0.endsWith("\r\n") && html.endsWith("\n") === html0.endsWith("\n"));
const cnt = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
const a0 = cnt(SRC("js-pre11B", "pages/change-password.js").split("\r\n")), b0 = cnt(cp.split("\r\n"));
const removed = [...a0].flatMap(([l, n]) => Array(Math.max(0, n - (b0.get(l) ?? 0))).fill(l)).sort();
const added = [...b0].reduce((t, [l, n]) => t + Math.max(0, n - (a0.get(l) ?? 0)), 0);
check("X4", "…and within change-password.js only 11B's lines: the header's second line, the paths import, the success toast and the 3-line redirect out; 3 header lines and the new toast in",
  j(removed) === j(["    setTimeout(() => {", "    showToast(\"Password updated.\", \"success\");", "    }, 1200);", "      window.location.href = resolvePageLink(\"account/my-profile.html\");", "// same twice, then shows a success message. UI only: no password is changed.", "import { resolvePageLink } from \"../core/paths.js\";"].sort()) && added === 4,
  j({ removed, added }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
