// usage: node sweepnotes.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 11L: four items from 11K's punch list (round-11k-notes.md K6 1-4). ./js-pre11L, ./html-pre11L and ./css-pre11L
// are the code, pages and css before this round (office-os 2883a77).
//   S  settings.html: a "Sample, not built yet" banner first in the page's stack; the two-factor row says "Not enforced
//      yet: …" (two-factor.html's words, 11J), its switch off and disabled. Everything else on the page unchanged.
//   R  user-profile.js: Reset password's toast says no reset link was sent ("Passwords aren't part of OfficeOS yet: …").
//   W  apply-leave.html / user-form.html: the "Tell my team by email once approved", "Send login invite by email" and
//      "Ask for a new password at first sign-in" switches are gone; the rest of both forms unchanged.
//   D  designations.html: "Manage roles" carries data-permission="roles:manage": hidden for HR (who'd get a 403),
//      shown for an Admin.
//   X  scope: exactly user-profile.js and those five pages.
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
let loads = 0, w = null, d = null, navigations = [], confirms = [], confirmAnswer = true;
const allJsErrors = [];
// Opens a page from `dir` with the js under `js` (./js or ./js-pre11L), signed in as `who`, running the module
// scripts its HTML loads (app.js among them: it applies data-permission).
async function open(page, { dir = DIR, js = "js", who = AARAV, query = "" } = {}) {
  const vc = new VirtualConsole();
  navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message.slice(0, 60)); else if (!/form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${dir}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = (q) => { confirms.push(q); return confirmAnswer; };
  w.HTMLElement.prototype.scrollIntoView = () => {};   // jsdom has none; settings.js calls it on a section link
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, HTMLElement: w.HTMLElement });
  loads++;
  (await import(`./${js}/core/auth.js`)).signIn(...who);
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) await import(`./${js}/${m[1]}?load=${loads}`);
}

const AARAV = ["admin", "Aarav Mehta", "EMP-1001"], PRIYA = ["hr", "Priya Nair", "EMP-1003"];
console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const norm = (s) => (s ?? "").replace(/\s+/g, " ").trim();
const fresh = () => { mem.clear(); timers = []; writes = []; confirms = []; confirmAnswer = true; };
const html = (dir, page) => fs.readFileSync(`${dir}/${page}.html`, "utf8");
const PRE = `${HERE}html-pre11L`;
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${["success", "danger", "warning", "info"].find((k) => t.className.includes(`toast--${k}`)) ?? "?"}: ${t.querySelector(".toast__text").textContent.trim()}`);
// The old page with exactly these (old, new) swaps, each found once, must be the new page byte for byte.
// Round 11R (layout; a page may now be read from a frozen result instead of the live tree (W4))
const onlyThese = (page, swaps, to = `${HERE}html-pre14A`) => {   /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */ const a = html(PRE, page); return swaps.every(([o]) => a.split(o).length === 2) && swaps.reduce((s, [o, n]) => s.replace(o, n), a) === html(to, page); };
const L = (s) => `${s}\r\n`;

const BANNER = "Sample, not built yet: company settings aren't part of OfficeOS yet. This page shows how they could look; nothing here is saved or applied, and the rules and values listed are examples.";
const TWO_FACTOR = "Not enforced yet: every role, Admin, HR and Finance included, signs in without a code.";

// =================================================================
section("S. settings: a sample banner, and a two-factor row that agrees with the two-factor page");
fresh();
await open("system/settings");
const stack = d.querySelector(".settings .stack");
const banner = stack?.firstElementChild;
check("S1", "the banner: an info alert, first in the page's stack (backup / audit-log / reports' pattern), with its exact text",
  // Round 13X (behaviour, S1: the card saves now, so the banner says so; BANNER is still 11L's words, which S6's old page is built from)
  banner?.className === "alert alert--info" && banner.textContent === "Sample, not built yet: company settings aren't part of OfficeOS yet. This page shows how they could look; apart from the Appearance theme, which saves on this device, nothing here is saved or applied, and the rules and values listed are examples." && !banner.closest("[hidden]")
  && [...d.querySelectorAll("main .alert")].filter((a) => /^Sample, not built yet/.test(a.textContent)).length === 1, j([banner?.className, banner?.textContent]));
const rowOf = (label) => [...d.querySelectorAll(".setting-row")].find((r) => norm(r.querySelector("strong")?.textContent).startsWith(label));
const tf = rowOf("Two-factor sign-in for sensitive roles"), tfBox = tf?.querySelector("input");
check("S2", "the two-factor row says 'Not enforced yet: …', its switch off and disabled; no 'Always on' anywhere on the page",
  norm(tf?.querySelector("span")?.textContent) === TWO_FACTOR && tfBox?.checked === false && tfBox.disabled === true && !/Always on/.test(d.getElementById("security")?.textContent ?? "Always on"), j([norm(tf?.querySelector("span")?.textContent), tfBox?.checked, tfBox?.disabled]));   // Round 14E part 2 (behaviour, for ruling): 11L's "no 'Always on'" read in the Security card, not the whole page; the Modules card's two locked switches say "Always on" (reasons2.mjs G1-G2)
const tfPage = new JSDOM(html(DIR, "auth/two-factor")).window.document;
const tfFeature = norm([...tfPage.querySelectorAll(".auth__feature")].find((f) => norm(f.querySelector("strong")?.textContent) === "Two-factor sign-in")?.querySelector("p")?.textContent);
check("S3", "…in exactly the words two-factor.html uses for the same fact (11J), so the two pages agree", tfFeature === TWO_FACTOR, tfFeature);
const controls = (label) => { const r = rowOf(label); return r ? [norm(r.querySelector(".setting-row__text span")?.textContent), ...[...r.querySelectorAll("input, select")].map((c) => `${c.tagName}:${c.type ?? ""}:${c.checked ?? ""}:${c.disabled}:${c.value}`)] : null; };
fresh();
await open("system/settings", { dir: PRE, js: "js-pre11L" });
const old = Object.fromEntries(["Sign out after being idle", "Minimum password length", "Ask for a new password every", "Lock an account after failed sign-ins", "Payroll only from the office network", "Payroll", "Inventory and assets", "Recruitment", "Expenses", "Announcements", "Carry forward unused leave"].map((k) => [k, controls(k)]));
const oldTf = rowOf("Two-factor sign-in for sensitive roles");
const oldTfState = [norm(oldTf?.querySelector("span")?.textContent), oldTf?.querySelector("input")?.checked, oldTf?.querySelector("input")?.disabled];
fresh();
await open("system/settings");
const now = Object.fromEntries(Object.keys(old).map((k) => [k, controls(k)]));
check("S4", "idle sign-out, password rules, lockout, the office-network row, the five Modules switches and carry-forward are exactly as before (inert under the banner)",
  j(now) === j(old) && Object.values(now).every(Boolean) && now["Sign out after being idle"].some((c) => /SELECT/.test(c)), j(Object.keys(now).filter((k) => j(now[k]) !== j(old[k]))));
check("S5", "before 11L, side by side: 'Always on for Admin, HR and Finance', switch on and enabled; no banner", j(oldTfState) === j(["Always on for Admin, HR and Finance", true, false]), j(oldTfState));
const sw = [
  [L("    <div class=\"stack\">") + L("") + L("      <section class=\"card\" id=\"company\">"), L("    <div class=\"stack\">") + L("") + L(`      <div class="alert alert--info">${BANNER}</div>`) + L("") + L("      <section class=\"card\" id=\"company\">")],
  [L("            <div class=\"setting-row__text\"><strong>Two-factor sign-in for sensitive roles</strong><span>Always on for Admin, HR and Finance</span></div>") + L("            <div class=\"setting-row__control\"><label class=\"switch\"><input type=\"checkbox\" aria-label=\"Two-factor sign-in for sensitive roles\" checked></label></div>"),
   L(`            <div class="setting-row__text"><strong>Two-factor sign-in for sensitive roles</strong><span>${TWO_FACTOR}</span></div>`) + L("            <div class=\"setting-row__control\"><label class=\"switch\"><input type=\"checkbox\" aria-label=\"Two-factor sign-in for sensitive roles\" disabled></label></div>")],
];
// Round 13X (layout, S6; was the live page): 11L's change, html-pre13X (7d931bd) against the old page; the live page: appearance.mjs X3, X5
check("S6", "…and the rest of settings.html is byte-for-byte what it was (the old page with exactly those two changes)", onlyThese("system/settings", sw, `${HERE}html-pre13X`));
const link = d.querySelector('.settings__nav a[href="#security"]');
link.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
check("S7", "settings.js unchanged: a section link still becomes the active one", link.classList.contains("is-active") && d.querySelectorAll(".settings__nav .is-active").length === 1);

// =================================================================
section("R. user-profile: Reset password says no link was sent");
const RESET = (email) => `Passwords aren't part of OfficeOS yet: no reset link was sent to ${email}.`;
async function reset(opts, answer = true) {
  fresh();
  await open("users/user-profile", { query: "?id=EMP-1105", ...opts });
  const btn = [...d.querySelectorAll("button")].find((b) => norm(b.textContent) === "Reset password");
  confirmAnswer = answer; writes = [];
  btn?.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
  return { t: toasts(), note: norm(d.querySelector(".reset-note")?.textContent), confirms: [...confirms], writes: [...writes], shown: btn && !btn.hidden };
}
const r1 = await reset({});
check("R1", "Aarav resets Arjun's password: the info toast says passwords aren't part of OfficeOS and no reset link was sent to arjun.kapoor@northwind.com; nothing written",
  j(r1.t) === j([`info: ${RESET("arjun.kapoor@northwind.com")}`]) && r1.writes.length === 0 && r1.shown, j(r1));
// Round Demo buttons part 1 (behaviour; were "the confirm and the on-screen note are unchanged" and "saying no to the confirm still does nothing")
check("R2", "…no confirm() and no on-screen 'Reset requested' note", r1.confirms.length === 0 && r1.note === "", j([r1.confirms, r1.note]));
const r2 = await reset({}, false);
check("R3", "…so a confirm answered no changes nothing: there's none; the same toast, no note", j(r2.t) === j([`info: ${RESET("arjun.kapoor@northwind.com")}`]) && r2.confirms.length === 0 && r2.note === "", j(r2));
const r0 = await reset({ dir: PRE, js: "js-pre11L" });
check("R4", "before 11L, side by side: 'Reset link sent to arjun.kapoor@northwind.com (demo).'", j(r0.t) === j(["info: Reset link sent to arjun.kapoor@northwind.com (demo)."]), j(r0.t));
check("R5", "…and the new words agree with the sign-in pages: forgot-password says no reset link is sent, reset-password's script opens with the same 'Passwords aren't part of OfficeOS yet:'",
  html(DIR, "auth/forgot-password").includes("so no reset link is sent") && SRC("js", "pages/reset-password.js").includes("\"Passwords aren't part of OfficeOS yet: nothing was reset.\""));

// =================================================================
section("W. apply-leave and user-form: the switches nothing read are gone");
fresh();
await open("leave/apply-leave");
const leaveSwitches = [...d.querySelectorAll("main .toggle-list .switch")].map((s) => norm(s.textContent));
check("W1", "apply-leave: no 'Tell my team by email'; its 'Notifications' list keeps 'I can be reached for urgent work' only",
  !/Tell my team|by email/.test(d.body.textContent) && j(leaveSwitches) === j(["I can be reached for urgent work"]) && [...d.querySelectorAll("h4.form-subtitle")].some((h) => norm(h.textContent) === "Notifications"), j(leaveSwitches));
check("W2", "…and the rest of apply-leave.html is byte-for-byte what it was",
  onlyThese("leave/apply-leave", [[L("          <label class=\"switch\"><input type=\"checkbox\" checked> Tell my team by email once approved</label>"), ""]]));
fresh();
await open("users/user-form");
const accountSwitches = [...d.querySelectorAll("main .toggle-list .switch")].map((s) => norm(s.textContent));
check("W3", "user-form: no 'Send login invite by email', no 'Ask for a new password at first sign-in'; 'Account active' stays (user-form.js reads it)",
  !/login invite|new password at first/.test(d.body.textContent) && j(accountSwitches) === j(["Account active"]) && d.getElementById("account-active")?.checked === true && /field\("account-active"\)/.test(SRC("js", "pages/user-form.js")), j(accountSwitches));
// Round 11R (layout; layout; was the live user-form.html: read from the frozen result html-pre11R = HEAD 86414a0, the live tree has 11R's permission overrides since (overrides.mjs X1))
check("W4", "…and the rest of user-form.html is byte-for-byte what it was",
  onlyThese("users/user-form", [[L("          <label class=\"switch\"><input type=\"checkbox\" checked> Send login invite by email</label>") + L("          <label class=\"switch\"><input type=\"checkbox\" checked> Ask for a new password at first sign-in</label>"), ""]], `${HERE}html-pre11R`));
check("W5", "…and neither script ever read them: apply-leave.js and user-form.js unchanged and mention no email, invite or first-sign-in option",
  // Round 11R (layout; layout; was the live user-form.js: read from the frozen result js-pre11R = HEAD 86414a0, the live tree has 11R's permission overrides since (overrides.mjs X1))
  SRC("js-pre14A", "pages/apply-leave.js") === SRC("js-pre11L", "pages/apply-leave.js") && SRC("js-pre11R", "pages/user-form.js") === SRC("js-pre11L", "pages/user-form.js")
  && !/invite|tell my team|first sign-in|notify/i.test(SRC("js", "pages/apply-leave.js") + SRC("js", "pages/user-form.js")));

// =================================================================
section("D. designations: Manage roles only for roles that can open it");
const { ROUTES } = await import("./js/config/routes.js");
const { ROLES } = await import("./js/config/roles.js");
const manage = async (who) => { fresh(); await open("access/designations", { who }); const a = [...d.querySelectorAll(".page-header__actions a")].find((x) => norm(x.textContent) === "Manage roles"); return { href: a?.getAttribute("href"), perm: a?.dataset.permission, hidden: a ? a.hidden || Boolean(a.closest("[hidden]")) : null }; };
const asHr = await manage(PRIYA), asAdmin = await manage(AARAV);
check("D1", "as HR (no roles:manage) the 'Manage roles' link is hidden; as Aarav (Admin) it's shown; same href",
  asHr.hidden === true && asAdmin.hidden === false && asHr.href === "roles-list.html" && asAdmin.href === "roles-list.html" && asHr.perm === "roles:manage", j({ asHr, asAdmin }));
check("D2", "…which is the route's own rule: roles-list.html needs roles:manage, held by admin and not by hr",
  ROUTES["access/roles-list.html"] === "roles:manage" && ROLES.admin.permissions.includes("roles:manage") && !ROLES.hr.permissions.includes("roles:manage"));
// Every page-header link a role sees on designations.html leads to a page that role can open.
const seen = async (who, role) => { fresh(); await open("access/designations", { who }); return [...d.querySelectorAll(".page-header a[href$='.html']")].filter((a) => !a.hidden && !a.closest("[hidden]")).map((a) => `access/${a.getAttribute("href")}`).filter((p) => ROUTES[p] && !ROLES[role].permissions.includes(ROUTES[p])); };
const deadHr = await seen(PRIYA, "hr"), deadAdmin = await seen(AARAV, "admin");
check("D3", "…so no header link on designations.html leads HR or an Admin to a 403", deadHr.length === 0 && deadAdmin.length === 0, j({ deadHr, deadAdmin }));
check("D4", "…and the rest of designations.html is byte-for-byte what it was",
  onlyThese("access/designations", [[L("      <a class=\"btn\" href=\"roles-list.html\">Manage roles</a>"), L("      <a class=\"btn\" href=\"roles-list.html\" data-permission=\"roles:manage\">Manage roles</a>")]]));
fresh();
await open("access/designations", { who: PRIYA, dir: PRE, js: "js-pre11L" });
const oldHr = [...d.querySelectorAll(".page-header__actions a")].find((x) => norm(x.textContent) === "Manage roles");
check("D5", "before 11L, side by side: HR saw 'Manage roles' (it led to a 403)", oldHr && !oldHr.hidden);
check("E1", "no JS errors on any load", allJsErrors.length === 0, allJsErrors.join(" | "));

// =================================================================
section("X. Scope: exactly 11L's lines");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
// Round 11N (layout; was the live js and pages, here and in X1 / X2 / X4: 11L's own change set, read from the frozen result js-pre11N / html-pre11N = HEAD fcdc960; the live tree has 11N's files since (roadnotes.mjs X1 / X2). X3 stays live; the css half: Round 13U, below)
const changedJs = walk(`${HERE}js-pre11N`).filter((f) => !fs.existsSync(`${HERE}js-pre11L/${f}`) || SRC("js-pre11N", f) !== SRC("js-pre11L", f)).sort();
const changedHtml = walk(`${HERE}html-pre11N`).filter((f) => !fs.existsSync(`${PRE}/${f}`) || fs.readFileSync(`${HERE}html-pre11N/${f}`, "utf8") !== fs.readFileSync(`${PRE}/${f}`, "utf8")).sort();
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre11L", f)) : [];
check("X1", "js changed: exactly pages/user-profile.js; nothing added or removed",
  j(changedJs) === j(["pages/user-profile.js"]) && j(walk(`${HERE}js-pre11N`).sort()) === j(walk(`${HERE}js-pre11L`).sort()), j(changedJs));
check("X2", "pages changed: exactly access/designations, leave/apply-leave, system/settings and users/user-form (user-profile.html untouched); no css; nothing added or removed",
  j(changedHtml) === j(["access/designations.html", "leave/apply-leave.html", "system/settings.html", "users/user-form.html"]) && changedCss.length === 0 && j(walk(`${HERE}html-pre11N`).sort()) === j(walk(PRE).sort()), j([changedHtml, changedCss]));
const files = [["js", "js-pre11L", "pages/user-profile.js"], ...["access/designations", "leave/apply-leave", "system/settings", "users/user-form"].map((p) => [null, null, p])];
check("X3", "all five CRLF only; each final newline as before",
  files.every(([a, b, f]) => { const x = a ? SRC(a, f) : html(DIR, f), y = b ? SRC(b, f) : html(PRE, f); return !/[^\r]\n/.test(x) && x.endsWith("\n") === y.endsWith("\n"); }));
const cnt = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
const up = SRC("js-pre11N", "pages/user-profile.js"), up0 = SRC("js-pre11L", "pages/user-profile.js");
const A0 = cnt(up0.split("\r\n")), B0 = cnt(up.split("\r\n"));
const removed = [...A0].flatMap(([l, n]) => Array(Math.max(0, n - (B0.get(l) ?? 0))).fill(l)).sort();
const added = [...B0].reduce((s, [l, n]) => s + Math.max(0, n - (A0.get(l) ?? 0)), 0);
check("X4", "…and within user-profile.js only 11L's lines: the 1-line reset comment and the toast out; a 3-line comment and the new toast in",
  j(removed) === j(["// Demo only: nothing is sent or saved, the note is just on screen.", "  showToast(`Reset link sent to ${user.email} (demo).`, \"info\");"].sort()) && added === 4, j({ removed, added }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
