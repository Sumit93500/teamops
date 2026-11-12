// usage: node authpages.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 11D: the three sign-in pages stop claiming what didn't happen (11C C1 / C2 / C3). ./js-pre11D, ./html-pre11D and
// ./css-pre11D are the code, pages and css before this round (office-os 9d9355d).
//   R  reset-password: the new / confirm match check is unchanged; on a match the page now says "Passwords aren't part of
//      OfficeOS yet: nothing was reset." (an info toast) and stays put, where it said "Password reset. Sign in with your
//      new password." (success) and went to the sign-in page. Nothing is written either way.
//   T  two-factor: "Verified." (success) becomes "Codes aren't checked in this demo: signing in as Aarav Mehta (Admin)."
//      (info). The sign-in is exactly what it was: Aarav as Admin after the timer, replacing any session (9U's demo
//      sign-in), then the landing page.
//   F  forgot-password.html: the success alert shown on load ("…a reset link is on its way…") is an info alert in the same
//      place saying no link is sent; the rest of the page exactly as it was, "Send reset link" still a labelled placeholder.
//   X  scope: exactly pages/reset-password.js, pages/two-factor.js and auth/forgot-password.html, only 11D's lines.
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

const KABIR = ["fin", "Kabir Shah", "EMP-1008"];
let writes = [];
const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { writes.push(k.replace("officeos:", "")); mem.set(k, String(v)); }, removeItem: (k) => { writes.push(`-${k.replace("officeos:", "")}`); mem.delete(k); }, clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
let loads = 0, w = null, d = null, navigations = [];
const allJsErrors = [];
// Opens a page from `dir` with the js under `js` (./js or ./js-pre11D), signed in as `who` or signed out, on the shared
// storage.
async function open(page, script, { dir = DIR, js = "js", who = null } = {}) {
  const vc = new VirtualConsole();
  navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message.slice(0, 60)); else if (!/form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const dom = new JSDOM(fs.readFileSync(`${dir}/${page}.html`, "utf8"), { url: `http://localhost/office-os/pages/${page}.html`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = () => true;
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, HTMLElement: w.HTMLElement });
  loads++;
  if (who) (await import(`./${js}/core/auth.js`)).signIn(...who);
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
const snap = () => j([...mem.entries()].sort());
const submit = (f) => f.dispatchEvent(new w.Event("submit", { cancelable: true }));
const session = () => JSON.parse(mem.get("officeos:session") ?? "null");
// Round 13L (behavior; was [roleKey, userLabel, employeeId]): the session keeps no role now (sessrole.mjs). KABIR /
// AARAV stay [role, name, id] for signing in; who() is compared with their name and id (.slice(1)); T5 compares the
// code before 11D through the same who().
const who = () => (session() ? [session().userLabel, session().employeeId] : null);
const RESET = "Passwords aren't part of OfficeOS yet: nothing was reset.";
const CODE = "Codes aren't checked in this demo: signing in as Aarav Mehta (Admin).";
const FORGOT = "Sample, not built yet: passwords aren't part of OfficeOS yet, so no reset link is sent. To sign in, pick a role under \"Preview as\" on the sign-in page.";
const AARAV = ["admin", "Aarav Mehta", "EMP-1001"];

// =================================================================
section("R. reset-password (signed out, as it's reached from Forgot password?)");
const fillR = (nw, conf) => { const f = d.querySelector("form"); f.elements.new.value = nw; f.elements.confirm.value = conf; return f; };
fresh();
await open("auth/reset-password", "reset-password");
let f = fillR("N3w-pass!", "different");
writes = []; submit(f);
const err = d.querySelector(".form-error");
check("R1", "new and confirm differ: 'Passwords don't match.' under Confirm, linked to it; no toast; nothing written; typing clears it (unchanged)",
  err?.textContent === "Passwords don't match." && f.elements.confirm.getAttribute("aria-describedby") === err?.id && toasts().length === 0 && writes.length === 0
  && (f.elements.confirm.dispatchEvent(new w.Event("input", { bubbles: true })), !d.querySelector(".form-error")), j([err?.textContent, toasts(), writes]));
fresh();
await open("auth/reset-password", "reset-password");
const before = snap();
f = fillR("N3w-pass!", "N3w-pass!");
writes = []; submit(f);
const r2 = toasts();
const pendingR = timers.length; timers.splice(0).forEach((fn) => fn());
check("R2", "they match: the page says 'Passwords aren't part of OfficeOS yet: nothing was reset.' as an info toast (not 'Password reset.', not a success)", j(r2) === j([`info: ${RESET}`]), j(r2));
check("R3", "…and stays put: no navigation (even after every timer has run), no error, nothing written, storage byte-identical, still nobody signed in",
  navigations.length === 0 && !d.querySelector(".form-error") && writes.length === 0 && snap() === before && who() === null, j({ navigations, pendingR, writes }));
check("R4", "…what was typed stays in the fields (nothing reset, nothing submitted)", f.elements.new.value === "N3w-pass!" && f.elements.confirm.value === "N3w-pass!");
fresh();
await open("auth/reset-password", "reset-password", { dir: `${HERE}html-pre11D`, js: "js-pre11D" });
submit(fillR("N3w-pass!", "N3w-pass!"));
const oldR = toasts(); timers.splice(0).forEach((fn) => fn());
check("R5", "before 11D, side by side: the same submit said 'Password reset. Sign in with your new password.' (success) and went to the sign-in page",
  j(oldR) === j(["success: Password reset. Sign in with your new password."]) && navigations.length === 1, j([oldR, navigations]));

// =================================================================
section("T. two-factor (the toast's words only; the sign-in is unchanged)");
// Runs the page from `opts` (signed out, or signed in as `who`): fill `code` into the six boxes, submit, then every timer.
async function twoFactor(code, opts = {}) {
  fresh();
  await open("auth/two-factor", "two-factor", opts);
  const boxes = [...d.querySelectorAll(".otp__input")];
  boxes.forEach((b, i) => (b.value = code[i] ?? ""));
  const startedAs = who();
  writes = []; submit(d.querySelector("form"));
  const t = toasts(), error = d.querySelector(".form-error")?.textContent ?? null;
  const pending = timers.length; timers.splice(0).forEach((fn) => fn());
  return { boxes: boxes.length, startedAs, toasts: t, error, pending, writes: [...writes], after: who(), navigations: navigations.length };
}
const t1 = await twoFactor("123");
check("T1", "fewer than six boxes filled: 'Enter all 6 digits of the code.'; no toast; nothing written; nobody signed in (unchanged)",
  t1.boxes === 6 && t1.error === "Enter all 6 digits of the code." && t1.toasts.length === 0 && t1.writes.length === 0 && t1.after === null && t1.navigations === 0, j(t1));
const t2 = await twoFactor("000000");
check("T2", "six boxes filled (any code): the toast says 'Codes aren't checked in this demo: signing in as Aarav Mehta (Admin).' as info (not 'Verified.', not a success)",
  j(t2.toasts) === j([`info: ${CODE}`]), j(t2.toasts));
// Round 11P (behaviour; the landing is the record role's (N3), so the sign-in reads Aarav's record, and from empty storage the users store seeds itself on that first read)
check("T3", "…and the sign-in is what it was: after the timer, Aarav Mehta signed in as Admin (one session write; the users store now also seeded, as the landing reads his record: round 11P), then the landing page",
  j(t2.after) === j(AARAV.slice(1)) && j(t2.writes) === j(["session", "users"]) && t2.navigations === 1, j(t2));
const t4 = await twoFactor("xxxxxx", { who: KABIR });
check("T4", "…signed in as Kabir (Finance): the same toast, and his session is still replaced by Aarav's (9U's accepted demo sign-in, unchanged)",
  j(t4.startedAs) === j(KABIR.slice(1)) && j(t4.toasts) === j([`info: ${CODE}`]) && j(t4.after) === j(AARAV.slice(1)) && j(t4.writes) === j(["session"]) && t4.navigations === 1, j(t4));
const old2 = await twoFactor("000000", { dir: `${HERE}html-pre11D`, js: "js-pre11D" });
const old4 = await twoFactor("xxxxxx", { dir: `${HERE}html-pre11D`, js: "js-pre11D", who: KABIR });
check("T5", "before 11D, side by side: the same submits said 'Verified.' (success), and signed in, wrote and navigated exactly as now",
  j(old2.toasts) === j(["success: Verified."]) && j(old4.toasts) === j(["success: Verified."])
  // Round 11P (behaviour; as T3: 11P's users seed set aside)
  && j([old2.after, old2.writes, old2.pending, old2.navigations]) === j([t2.after, t2.writes.filter((k) => k !== "users"), t2.pending, t2.navigations])
  && j([old4.after, old4.writes, old4.navigations]) === j([t4.after, t4.writes, t4.navigations]), j([old2, old4]));

// =================================================================
section("F. forgot-password.html");
fresh();
await open("auth/forgot-password", null);
const inner = d.querySelector(".auth__inner");
const alerts = [...d.querySelectorAll(".alert")];
const form = inner?.querySelector("form");
check("F1", "on load, the page's one alert: an info alert right after the form and before 'Remembered it?', with the new wording",
  alerts.length === 1 && alerts[0].className === "alert alert--info mt-6" && alerts[0].textContent === FORGOT && form?.nextElementSibling === alerts[0]
  && alerts[0].nextElementSibling?.classList.contains("auth__help") && /Remembered it\?/.test(alerts[0].nextElementSibling.textContent), j(alerts.map((a) => [a.className, a.textContent])));
check("F2", "…nothing on the page claims a link was sent: no success alert, no 'on its way', no 'works for 30 minutes'",
  !d.querySelector(".alert--success") && !/on its way|works for 30 minutes/.test(d.body.textContent));
const html = fs.readFileSync(`${DIR}/auth/forgot-password.html`, "utf8"), html0 = fs.readFileSync(`${HERE}html-pre11D/auth/forgot-password.html`, "utf8");
const OLD2 = "      <!-- This message appears only after the form is sent. The JS stage will show and hide it. -->\r\n      <div class=\"alert alert--success mt-6\">If an account exists for that email, a reset link is on its way. The link works for 30 minutes.</div>\r\n";
const NEW1 = `      <div class="alert alert--info mt-6">${FORGOT}</div>\r\n`;
// Round 11J (layout; was the live forgot-password.html): 11D's own line, read from the frozen result (html-pre11J = HEAD
// bfdcf3f); the live page has 11J's subheading and lead since (authnotes.mjs F5 / X2)
const html11J = fs.readFileSync(`${HERE}html-pre11J/auth/forgot-password.html`, "utf8");
check("F3", "…and the rest of forgot-password.html is byte-for-byte what it was: putting the old comment and alert back in place of the new line gives the old page",
  html11J.split(NEW1).length === 2 && html11J.replace(NEW1, OLD2) === html0);
writes = []; const send = d.querySelector('button[type="submit"]'); send.click();
check("F4", "'Send reset link' is still the labelled placeholder (\"…isn't available in this demo.\"), writing nothing, nobody signed in",
  send.dataset.notImplemented === "Send reset link" && j(toasts()) === j(["info: Send reset link isn't available in this demo."]) && writes.length === 0 && who() === null, j([toasts(), writes]));
const links = [...d.querySelectorAll(".auth__help a")].map((a) => a.getAttribute("href"));
check("F5", "…its links are unchanged: back to sign in, and the preview of reset-password", j(links) === j(["login.html", "reset-password.html"]), j(links));
check("E1", "no JS errors on any load", allJsErrors.length === 0, allJsErrors.join(" | "));

// =================================================================
section("X. Scope: exactly 11D's lines");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
// Round 11F (layout; was the live js and pages, here and in X1 / X2): 11D's own change set, read from its frozen result
// (js-pre11F / html-pre11F = HEAD e93d118); the live tree has 11F's user-profile.js, approvals-inbox.html and change-password.html since (pagenotes.mjs X1 / X2)
const changedJs = walk(`${HERE}js-pre11F`).filter((f) => !fs.existsSync(`${HERE}js-pre11D/${f}`) || SRC("js-pre11F", f) !== SRC("js-pre11D", f)).sort();
const changedHtml = walk(`${HERE}html-pre11F`).filter((f) => !fs.existsSync(`${HERE}html-pre11D/${f}`) || fs.readFileSync(`${HERE}html-pre11F/${f}`, "utf8") !== fs.readFileSync(`${HERE}html-pre11D/${f}`, "utf8"));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre11D", f)) : [];
check("X1", "js changed: exactly pages/reset-password.js and pages/two-factor.js; nothing added or removed",
  j(changedJs) === j(["pages/reset-password.js", "pages/two-factor.js"]) && j(walk(`${HERE}js-pre11F`).sort()) === j(walk(`${HERE}js-pre11D`).sort()), j(changedJs));
check("X2", "pages changed: exactly auth/forgot-password.html (reset-password.html and two-factor.html untouched); no css; nothing added or removed",
  j(changedHtml) === j(["auth/forgot-password.html"]) && changedCss.length === 0 && j(walk(`${HERE}html-pre11F`).sort()) === j(walk(`${HERE}html-pre11D`).sort()), j([changedHtml, changedCss]));
const rp = SRC("js-pre14A", "pages/reset-password.js"), tf = SRC("js-pre14A", "pages/two-factor.js");   // Round 14A (layout; was the live js): 9c7423e's, frozen; the live js: jsguard.mjs
const rp0 = SRC("js-pre11D", "pages/reset-password.js"), tf0 = SRC("js-pre11D", "pages/two-factor.js");
check("X3", "all three CRLF only; each final newline as before (the two scripts keep theirs, forgot-password.html still has none)",
  [rp, tf, html].every((s) => !/[^\r]\n/.test(s)) && rp.endsWith("\r\n") === rp0.endsWith("\r\n") && tf.endsWith("\r\n") === tf0.endsWith("\r\n") && html.endsWith("\n") === html0.endsWith("\n"));
const cnt = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
const delta = (a, b) => { const A = cnt(a.split("\r\n")), B = cnt(b.split("\r\n")); return { removed: [...A].flatMap(([l, n]) => Array(Math.max(0, n - (B.get(l) ?? 0))).fill(l)).sort(), added: [...B].reduce((t, [l, n]) => t + Math.max(0, n - (A.get(l) ?? 0)), 0) }; };
const dR = delta(rp0, rp), dT = delta(tf0, tf);
check("X4", "…and within the two scripts only 11D's lines: reset-password's header line, paths import, success toast and 3-line redirect out, 4 header lines and the new toast in; two-factor's header line and 'Verified.' out, 2 header lines and the new toast in",
  j(dR.removed) === j(["// same twice, then sends the user back to sign in. UI only: no password is changed.", "import { resolvePageLink } from \"../core/paths.js\";", "    showToast(\"Password reset. Sign in with your new password.\", \"success\");", "    setTimeout(() => {", "      window.location.href = resolvePageLink(\"auth/login.html\");", "    }, 1200);"].sort()) && dR.added === 5
  && j(dT.removed) === j(["// signs in and redirects. UI only: the code itself is not verified.", "    showToast(\"Verified.\", \"success\");"].sort()) && dT.added === 3,
  j({ dR, dT }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
