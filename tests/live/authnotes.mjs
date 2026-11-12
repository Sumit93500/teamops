// usage: node authnotes.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 11J: forgot-password and two-factor stop promising an email, a policy and a code that OfficeOS doesn't have
// (round-11i-notes.md I1 / I2). ./js-pre11J, ./html-pre11J and ./css-pre11J are the code, pages and css before this round
// (office-os bfdcf3f).
//   F  forgot-password: the subheading and the left panel's lead say no reset link is sent (11D's alert below already
//      did); the button, both help links and 11D's alert unchanged.
//   T  two-factor: "Admin, HR and Finance always use two-factor sign-in." becomes "Not enforced yet: …"; the lead loses
//      "protected by a second check…"; the subheading and hint say codes aren't checked and nothing generates one;
//      "Trust this device for 30 days" is gone; "Use a backup code" is data-not-implemented. Each new sentence is checked
//      against what the app does. The OTP boxes, "Sign-in history", the button, the submit flow and 11D's toast unchanged.
//   X  scope: exactly auth/forgot-password.html and auth/two-factor.html; no js, no css.
// Round 12A (layout, T2): user-form.js joins user-profile.js among the js that mention two-factor, in a comment saying
// nothing records it (its Access summary row now reads "Not recorded yet").
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

let writes = [];
const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { writes.push(k.replace("officeos:", "")); mem.set(k, String(v)); }, removeItem: (k) => { writes.push(`-${k.replace("officeos:", "")}`); mem.delete(k); }, clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
let loads = 0, w = null, d = null, navigations = [];
const allJsErrors = [];
// Opens a page from `dir` with the js under `js` (./js or ./js-pre11J), signed in as `who` or signed out, running the
// module scripts its HTML loads.
async function open(page, { dir = DIR, js = "js", who = null } = {}) {
  const vc = new VirtualConsole();
  navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message.slice(0, 60)); else if (!/form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${dir}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, HTMLElement: w.HTMLElement });
  loads++;
  if (who) (await import(`./${js}/core/auth.js`)).signIn(...who);
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
const PRE = `${HERE}html-pre11J`;
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${["success", "danger", "warning", "info"].find((k) => t.className.includes(`toast--${k}`)) ?? "?"}: ${t.querySelector(".toast__text").textContent.trim()}`);
const session = () => JSON.parse(mem.get("officeos:session") ?? "null");
// Round 13L (behavior; was [roleKey, userLabel, employeeId]): the session keeps no role now (sessrole.mjs); who is signed
// in is the label and the id (the role is the record's). AARAV / ARJUN stay [role, name, id] for signing in; who() is
// compared with their name and id (.slice(1)).
const who = () => (session() ? [session().userLabel, session().employeeId] : null);
// The old page with exactly these (old, new) swaps, each found once, must be the new page byte for byte.
const onlyThese = (page, swaps) => { const a = html(PRE, page); return swaps.every(([o]) => a.split(o).length === 2) && swaps.reduce((s, [o, n]) => s.replace(o, n), a) === html(`${HERE}html-pre14A`, page); };   // Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs
const L = (s) => `${s}\r\n`;

const F_SUB = "No problem. No reset link is sent in this demo: the note below says how to get in.";
const F_LEAD = "Passwords aren't part of OfficeOS yet, so no link is sent: pick a role on the sign-in page to get in.";
const F_ALERT = "Sample, not built yet: passwords aren't part of OfficeOS yet, so no reset link is sent. To sign in, pick a role under \"Preview as\" on the sign-in page.";
const T_FEATURE = "Not enforced yet: every role, Admin, HR and Finance included, signs in without a code.";
const T_LEAD = "A preview of a second sign-in check. OfficeOS doesn't ask for one yet.";
const T_SUB = "Codes aren't checked in this demo: any 6 digits sign you in as Aarav Mehta (Admin).";
const T_HINT = "Nothing generates or sends a code yet.";
const T_TOAST = "Codes aren't checked in this demo: signing in as Aarav Mehta (Admin).";
const AARAV = ["admin", "Aarav Mehta", "EMP-1001"], ARJUN = ["emp", "Arjun Kapoor", "EMP-1105"];

// =================================================================
section("F. forgot-password: no email promised");
fresh();
await open("auth/forgot-password");
let body = norm(d.body.textContent);
check("F1", "the subheading says no reset link is sent and points at the note below; no 'we'll send you a reset link'",
  d.querySelector(".auth__sub")?.textContent === F_SUB && !/we'll send|send you a reset link/.test(body), d.querySelector(".auth__sub")?.textContent);
check("F2", "the left panel's lead says the same and how to get in; no 'we'll send a link', no 'It only takes a minute'",
  d.querySelector(".auth__lead")?.textContent === F_LEAD && !/send a link to choose|only takes a minute/.test(body), d.querySelector(".auth__lead")?.textContent);
const alert = d.querySelector(".alert");
check("F3", "…and the page agrees with itself: 11D's alert, unchanged, is the 'note below' (after the subheading and the form), and the sign-in page has 'Preview as'",
  alert?.textContent === F_ALERT && d.querySelector(".auth__sub").compareDocumentPosition(alert) & w.Node.DOCUMENT_POSITION_FOLLOWING && d.querySelector("form").compareDocumentPosition(alert) & w.Node.DOCUMENT_POSITION_FOLLOWING
  && /auth__demo-title">Preview as</.test(html(DIR, "auth/login")), alert?.textContent);
const send = d.querySelector("button[type=submit]");
d.getElementById("fp-email").value = "arjun.kapoor@northwind.com";
writes = [];
const sendNotPrevented = send.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
check("F4", "the button is unchanged: 'Send reset link' says it isn't available (info), the click is stopped, nothing written",
  send.dataset.notImplemented === "Send reset link" && j(toasts()) === j(["info: Send reset link isn't available in this demo."]) && !sendNotPrevented && writes.length === 0 && navigations.length === 0, j([toasts(), sendNotPrevented, writes]));
check("F5", "…and the rest of forgot-password.html is byte-for-byte what it was (the old page with exactly those two lines swapped)",
  onlyThese("auth/forgot-password", [
    [L("      <p class=\"auth__lead\">Enter your work email and we'll send a link to choose a new password. It only takes a minute.</p>"), L(`      <p class="auth__lead">${F_LEAD}</p>`)],
    [L("      <p class=\"auth__sub\">No problem. Enter your work email and we'll send you a reset link.</p>"), L(`      <p class="auth__sub">${F_SUB}</p>`)],
  ]));

// =================================================================
section("T. two-factor: no policy, code or trust that isn't there");
fresh();
await open("auth/two-factor");
body = norm(d.body.textContent);
const feats = [...d.querySelectorAll(".auth__feature")].map((f) => [norm(f.querySelector("strong")?.textContent), norm(f.querySelector("p")?.textContent)]);
check("T1", "feature 1 says two-factor isn't enforced, in feature 2's 'Not recorded yet' style; no 'always use two-factor', no 'Required for sensitive roles'",
  j(feats) === j([["Two-factor sign-in", T_FEATURE], ["Sign-in history", "Not recorded yet: OfficeOS doesn't keep a sign-in log."]]) && !/always use two-factor|Required for sensitive roles/.test(body), j(feats));
// What backs T1: no role's sign-in goes through this page, and nothing else reads or enforces a second factor.
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
const jsRefs = walk(`${HERE}js`).filter((f) => /two-factor/.test(SRC("js", f))).sort();
const pageRefs = walk(DIR).filter((f) => f.endsWith(".html") && /two-factor\.html/.test(fs.readFileSync(`${DIR}/${f}`, "utf8")));
const login = SRC("js", "pages/login.js");
check("T2", "…which is what the app does: no page links to two-factor.html, login.js signs every role straight in, and only guard's public list and comments mention two-factor",
  pageRefs.length === 0 && /signIn\(roleKey[\s\S]*?redirectToLanding\(\)/.test(login) && !/two-factor/.test(login)
  && j(jsRefs) === j(["core/guard.js", "pages/two-factor.js", "pages/user-form.js", "pages/user-profile.js", "ui/otp.js"]) && /"auth\/two-factor\.html",/.test(SRC("js", "core/guard.js")), j({ pageRefs, jsRefs }));
check("T3", "the lead no longer says records are 'protected by a second check, so a stolen password isn't enough'",
  d.querySelector(".auth__lead")?.textContent === T_LEAD && !/protected by a second check|stolen password/.test(body), d.querySelector(".auth__lead")?.textContent);
check("T4", "the subheading and the hint say what's true: codes aren't checked, any 6 digits sign you in as Aarav (Admin), nothing generates a code; no 'authenticator app', no 'every 30 seconds'",
  d.querySelector(".auth__sub")?.textContent === T_SUB && d.querySelector(".form-hint")?.textContent === T_HINT && !/authenticator app|every 30 seconds/.test(body), j([d.querySelector(".auth__sub")?.textContent, d.querySelector(".form-hint")?.textContent]));
check("T5", "'Trust this device for 30 days' is gone: no trust box; the form is the code field, then the button",
  !d.querySelector("input[name=trust]") && !/Trust this device/.test(body) && j([...d.querySelector("form").children].map((e) => e.className)) === j(["form-field", "btn btn--primary btn--lg btn--block"]), j([...d.querySelector("form").children].map((e) => e.className)));
const backup = [...d.querySelectorAll("a")].find((a) => /backup code/.test(a.textContent));
writes = [];
const backupNotPrevented = backup?.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
check("T6", "'Use a backup code' still a link, now data-not-implemented: the click says it isn't available (info) and is stopped (no '#'), nothing written",
  backup?.className === "link" && backup.getAttribute("href") === "#" && backup.dataset.notImplemented === "Use a backup code" && norm(backup.parentElement.textContent) === "Lost your phone? Use a backup code"
  && j(toasts()) === j(["info: Use a backup code isn't available in this demo."]) && backupNotPrevented === false && writes.length === 0, j([toasts(), backupNotPrevented]));
// The submit flow, unchanged, and what T4's subheading says about it.
async function submitCode(code, opts) {
  fresh();
  await open("auth/two-factor", opts);
  [...d.querySelectorAll(".otp__input")].forEach((x, i) => { x.value = code[i] ?? ""; });
  d.querySelector("form").dispatchEvent(new w.Event("submit", { cancelable: true }));
  const t = toasts(), err = norm(d.querySelector(".form-error")?.textContent);
  timers.splice(0).forEach((fn) => fn());
  return { t, err, who: who(), navs: navigations.length };
}
const signedOut = await submitCode("000000"), asArjun = await submitCode("123456", { who: ARJUN }), short = await submitCode("123");
check("T7", "…which is what the page does: any 6 digits (signed out, or over Arjun's Employee session) give 11D's toast and end signed in as Aarav (Admin); 3 digits -> 'Enter all 6 digits of the code.' (unchanged)",
  [signedOut, asArjun].every((r) => j(r.t) === j([`info: ${T_TOAST}`]) && j(r.who) === j(AARAV.slice(1)) && r.navs === 1) && short.err === "Enter all 6 digits of the code." && short.who === null && short.t.length === 0, j({ signedOut, asArjun, short }));
check("T8", "…and the rest of two-factor.html is byte-for-byte what it was: the six OTP boxes, 'Sign-in history', the button, the headline (the old page with exactly those six changes)",
  onlyThese("auth/two-factor", [
    [L("      <p class=\"auth__lead\">Payroll, salaries and personal records are protected by a second check, so a stolen password isn't enough to get in.</p>"), L(`      <p class="auth__lead">${T_LEAD}</p>`)],
    [L("            <strong>Required for sensitive roles</strong>") + L("            <p>Admin, HR and Finance always use two-factor sign-in.</p>"), L("            <strong>Two-factor sign-in</strong>") + L(`            <p>${T_FEATURE}</p>`)],
    [L("      <p class=\"auth__sub\">Open your authenticator app and type the 6-digit code for OfficeOS.</p>"), L(`      <p class="auth__sub">${T_SUB}</p>`)],
    [L("          <span class=\"form-hint\">The code changes every 30 seconds.</span>"), L(`          <span class="form-hint">${T_HINT}</span>`)],
    [L("        <label class=\"check\"><input type=\"checkbox\" name=\"trust\"> Trust this device for 30 days</label>") + "\r\n", ""],
    [L("      <p class=\"auth__help\">Lost your phone? <a class=\"link\" href=\"#\">Use a backup code</a></p>"), L("      <p class=\"auth__help\">Lost your phone? <a class=\"link\" href=\"#\" data-not-implemented=\"Use a backup code\">Use a backup code</a></p>")],
  ]));

// =================================================================
section("R. before 11J, side by side");
fresh();
await open("auth/forgot-password", { dir: PRE, js: "js-pre11J" });
const oldF = norm(d.body.textContent);
fresh();
await open("auth/two-factor", { dir: PRE, js: "js-pre11J" });
const oldT = norm(d.body.textContent);
const oldBackup = [...d.querySelectorAll("a")].find((a) => /backup code/.test(a.textContent));
const oldNotPrevented = oldBackup.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
check("R1", "pre-11J: forgot-password promised 'we'll send you a reset link' right above 'no reset link is sent'; two-factor said 'always use two-factor', 'authenticator app', 'every 30 seconds', 'Trust this device', and its backup link did nothing (no toast, not stopped)",
  /we'll send you a reset link/.test(oldF) && /no reset link is sent/.test(oldF) && /always use two-factor/.test(oldT) && /authenticator app/.test(oldT) && /every 30 seconds/.test(oldT) && /Trust this device/.test(oldT)
  && toasts().length === 0 && oldNotPrevented === true);
check("E1", "no JS errors on any load", allJsErrors.length === 0, allJsErrors.join(" | "));

// =================================================================
section("X. Scope: exactly 11J's lines");
// Round 11L (layout; was the live js and pages, here and in X1 / X2): 11J's own change set (no js; two pages), read from the frozen result (js-pre11L / html-pre11L = HEAD 2883a77); the
// live tree has 11L's user-profile.js and four pages since (sweepnotes.mjs X1 / X2)
const changedJs = walk(`${HERE}js-pre11L`).filter((f) => !fs.existsSync(`${HERE}js-pre11J/${f}`) || SRC("js-pre11L", f) !== SRC("js-pre11J", f));
const changedHtml = walk(`${HERE}html-pre11L`).filter((f) => !fs.existsSync(`${PRE}/${f}`) || fs.readFileSync(`${HERE}html-pre11L/${f}`, "utf8") !== fs.readFileSync(`${PRE}/${f}`, "utf8")).sort();
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre11J", f)) : [];
check("X1", "no js changed (two-factor.js and placeholder.js are as they were); nothing added or removed",
  changedJs.length === 0 && j(walk(`${HERE}js-pre11L`).sort()) === j(walk(`${HERE}js-pre11J`).sort()), j(changedJs));
check("X2", "pages changed: exactly auth/forgot-password.html and auth/two-factor.html (login.html and reset-password.html untouched); no css; nothing added or removed",
  j(changedHtml) === j(["auth/forgot-password.html", "auth/two-factor.html"]) && changedCss.length === 0 && j(walk(`${HERE}html-pre11L`).sort()) === j(walk(PRE).sort()), j([changedHtml, changedCss]));
check("X3", "both CRLF only; each final newline as before",
  ["auth/forgot-password", "auth/two-factor"].every((p) => { const a = html(DIR, p), b = html(PRE, p); return !/[^\r]\n/.test(a) && a.endsWith("\n") === b.endsWith("\n"); }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
