// usage: node signnotes.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 11G: two follow-ups to 11F (F8.3 / F8.4), static content that described sign-ins and a password OfficeOS doesn't
// have. ./js-pre11G, ./html-pre11G and ./css-pre11G are the code, pages and css before this round (office-os 7a95b0a).
//   S  user-profile: "Last sign-in" said "Today, 09:10" on every profile; nothing logs sign-ins (9L). The page script now
//      writes "Not recorded yet", muted, exactly as 11F did for "Two-factor sign-in". Everything else as before.
//   C  change-password: the "Your password must have" card (green ticks), the strength meter ("Strength: Good. Add a symbol
//      to make it strong.") and "Last changed on 14 Jun 2026" are gone; the footer says "Fields marked * are required."
//      11F's info line and 11B's form are unchanged.
//   X  scope: exactly pages/user-profile.js and account/change-password.html.
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

const AARAV = ["admin", "Aarav Mehta", "EMP-1001"], PRIYA = ["hr", "Priya Nair", "EMP-1003"], ARJUN = ["emp", "Arjun Kapoor", "EMP-1105"];
let writes = [];
const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { writes.push(k.replace("officeos:", "")); mem.set(k, String(v)); }, removeItem: (k) => { writes.push(`-${k.replace("officeos:", "")}`); mem.delete(k); }, clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
let loads = 0, w = null, d = null;
const allJsErrors = [];
// Opens a page from `dir` with the js under `js` (./js or ./js-pre11G), running the module scripts its HTML loads,
// signed in as `who`, on the shared storage.
async function open(page, { dir = DIR, js = "js", who = AARAV, query = "" } = {}) {
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${dir}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = () => true;
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, HTMLElement: w.HTMLElement });
  loads++;
  (await import(`./${js}/core/auth.js`)).signIn(...who);
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
const PRE = `${HERE}html-pre11G`;

// =================================================================
section("S. user-profile: Last sign-in");
const kvDd = (label) => [...d.querySelectorAll(".kv__row")].find((row) => norm(row.querySelector("dt")?.textContent) === label)?.querySelector("dd");
const kvRows = () => Object.fromEntries([...d.querySelectorAll(".kv__row")].map((row) => [norm(row.querySelector("dt")?.textContent), norm(row.querySelector("dd")?.textContent)]));
const statusBadge = () => { const b = d.querySelectorAll(".profile__badges .badge")[1]; return b ? `${b.className}: ${b.textContent.trim()}` : null; };
const row = (label) => { const dd = kvDd(label); return { text: norm(dd?.textContent), cls: dd?.className ?? null, badges: dd?.querySelectorAll(".badge").length ?? null }; };
const profiles = {};
for (const [id, viewer] of [["EMP-1105", AARAV], ["EMP-1061", AARAV], ["EMP-1003", PRIYA]]) {
  fresh();
  await open("users/user-profile", { query: `?id=${id}`, who: viewer });
  profiles[id] = { last: row("Last sign-in"), twoFactor: row("Two-factor sign-in"), rows: kvRows(), status: statusBadge() };
  fresh();
  await open("users/user-profile", { query: `?id=${id}`, who: viewer, dir: PRE, js: "js-pre11G" });
  profiles[id].old = { last: row("Last sign-in"), twoFactor: row("Two-factor sign-in"), rows: kvRows(), status: statusBadge() };
}
const P = Object.values(profiles);
const show = (k) => j(Object.fromEntries(Object.entries(profiles).map(([id, p]) => [id, k(p)])));
check("S1", "on every profile (an active, an inactive and an HR person viewing her own), 'Last sign-in' says 'Not recorded yet', muted, no badge",
  P.every((p) => p.last.text === "Not recorded yet" && /\btext-muted\b/.test(p.last.cls) && p.last.badges === 0), show((p) => p.last));
check("S2", "…and nothing on any profile still says 'Today, 09:10' (or any time in that card)",
  P.every((p) => !Object.values(p.rows).some((v) => /09:10|\bToday\b/.test(v))), show((p) => p.rows["Last sign-in"]));
check("S3", "…'Two-factor sign-in' is exactly 11F's: 'Not recorded yet', muted, no badge, as before this round",
  P.every((p) => j(p.twoFactor) === j(p.old.twoFactor) && p.twoFactor.text === "Not recorded yet" && /\btext-muted\b/.test(p.twoFactor.cls) && p.twoFactor.badges === 0), show((p) => p.twoFactor));
const without = (rows) => Object.fromEntries(Object.entries(rows).filter(([k]) => k !== "Last sign-in" && k !== "Data scope"));   // Round Manager scoping part 2 (layout: Data scope's words changed since)
check("S4", "…and every other row and the status badge are exactly what the pre-11G script showed (Divya still 'Inactive', from her record)",
  P.every((p) => j(without(p.rows)) === j(without(p.old.rows)) && p.status === p.old.status) && /Inactive/.test(profiles["EMP-1061"].status), show((p) => p.status));
check("S5", "before 11G, side by side: the same three profiles all showed the same static 'Today, 09:10', unmuted",
  P.every((p) => p.old.last.text === "Today, 09:10" && !/text-muted/.test(p.old.last.cls ?? "")), show((p) => p.old.last));
// Round 11N (layout; layout; was the live page: read from the frozen result html-pre11N = HEAD fcdc960; the live user-profile.html has 11N's Delete button since (roadnotes.mjs X2))
check("S6", "user-profile.html itself is unchanged (the fix is in the page script)", html(`${HERE}html-pre11N`, "users/user-profile") === html(PRE, "users/user-profile"));

// =================================================================
section("C. change-password: no checklist, meter or date for a password that doesn't exist");
const CHANGE = "Passwords aren't part of OfficeOS yet: sign-in is picking a demo role, so nothing on this page changes a password, signs anyone out or saves these settings.";
fresh();
await open("account/change-password", { who: ARJUN });
const body = norm(d.querySelector("main").textContent);
const newField = d.getElementById("pw-new")?.closest(".form-field");
check("C1", "no strength meter: no .strength bars and no 'Strength:' hint; 'New password' is its label and input only, as 'Confirm new password' is",
  !d.querySelector(".strength, .strength__bar") && !/Strength|Add a symbol/.test(body) && j([...newField.children].map((e) => e.className)) === j(["form-label form-label--required", "input-group input-group--action"])
  && j([...newField.children].map((e) => e.className)) === j([...d.getElementById("pw-confirm").closest(".form-field").children].map((e) => e.className)), j([...newField.children].map((e) => e.className)));
const aside = d.querySelector("main aside.stack");
check("C2", "no requirements checklist: no 'Your password must have', no .reqs and no ticks; the side column is 'Extra protection' then 11F's info line, unchanged",
  !/must have|At least 12 characters|last 3 passwords/.test(body) && !d.querySelector(".reqs, .is-met")
  && j([...aside.children].map((e) => e.className + ":" + norm(e.querySelector(".card__title")?.textContent ?? e.textContent))) === j(["card:Extra protection", `alert alert--info:${CHANGE}`]),
  j([...aside.children].map((e) => e.className)));
const foot = d.querySelector("form .card__footer");
check("C3", "the form's footer: 'Fields marked * are required.' where the date was, the buttons after it as before",
  foot.children.length === 2 && foot.children[0].className === "card__meta" && foot.children[0].textContent === "Fields marked * are required." && foot.children[1].className === "btn-group"
  && norm(foot.children[1].textContent) === "Cancel Update password", j([...foot.children].map((e) => `${e.className}: ${norm(e.textContent)}`)));
const fields = ["pw-current", "pw-new", "pw-confirm"].map((id) => d.getElementById(id));
check("C4", "…and the note is true: all three fields are required and labelled with the * class, and they're all the form has",
  fields.every((f) => f.required && d.querySelector(`label[for="${f.id}"]`).classList.contains("form-label--required"))
  && d.querySelectorAll("form .form-label--required").length === 3 && d.querySelectorAll("form input.input").length === 3);
check("C5", "nothing on the page gives a date for the password: no 'Last changed', no '14 Jun 2026'", !/Last changed|14 Jun 2026|Jun 2026/.test(body));
// The rest of the page, byte for byte: the old page with exactly these three changes is the new page.
const CUTS = [
  ['            <div class="strength" data-level="3" aria-hidden="true">\r\n              <span class="strength__bar"></span><span class="strength__bar"></span><span class="strength__bar"></span><span class="strength__bar"></span>\r\n            </div>\r\n            <span class="form-hint">Strength: Good. Add a symbol to make it strong.</span>\r\n', ""],
  ['        <span class="card__meta">Last changed on 14 Jun 2026</span>\r\n', '        <span class="card__meta">Fields marked * are required.</span>\r\n'],
  ['      <section class="card">\r\n        <div class="card__header"><h3 class="card__title">Your password must have</h3></div>\r\n        <div class="card__body">\r\n          <ul class="reqs">\r\n'
   + '            <li class="is-met">At least 12 characters</li>\r\n            <li class="is-met">An uppercase and a lowercase letter</li>\r\n            <li class="is-met">At least one number</li>\r\n'
   + '            <li>At least one symbol, like ! or #</li>\r\n            <li class="is-met">Different from your last 3 passwords</li>\r\n          </ul>\r\n        </div>\r\n      </section>\r\n\r\n', ""],
];
const cp0 = html(PRE, "account/change-password");
check("C6", "…and the rest of change-password.html is byte-for-byte what it was (the old page with exactly those three cuts)",
  CUTS.every(([a]) => cp0.split(a).length === 2) && CUTS.reduce((s, [a, b]) => s.replace(a, b), cp0) === html(`${HERE}html-pre14A`, "account/change-password") /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */);
const f = d.querySelector("form");
f.elements.current.value = "x"; f.elements.new.value = "N3w-pass!"; f.elements.confirm.value = "other";
f.dispatchEvent(new w.Event("submit", { cancelable: true }));
const mismatch = norm(d.querySelector(".form-error")?.textContent);
f.elements.confirm.value = "N3w-pass!";
writes = []; f.dispatchEvent(new w.Event("submit", { cancelable: true }));
const t = [...d.querySelectorAll(".toast")].map((x) => `${["success", "info"].find((k) => x.className.includes(`toast--${k}`))}: ${x.querySelector(".toast__text").textContent.trim()}`);
check("C7", "…and 11B's form is unchanged: different passwords say 'Passwords don't match.'; matching ones say nothing was changed (info), nothing written",
  mismatch === "Passwords don't match." && j(t) === j(["info: Passwords aren't part of OfficeOS yet: nothing was changed."]) && writes.length === 0, j([mismatch, t, writes]));
check("E1", "no JS errors on any load", allJsErrors.length === 0, allJsErrors.join(" | "));

// =================================================================
section("X. Scope: exactly 11G's lines");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
// Round 11N (layout; layout; was the live js: read from the frozen result js-pre11N = HEAD fcdc960, the live tree has 11N's scripts since (roadnotes.mjs X1 / X4))
const changedJs = walk(`${HERE}js-pre11N`).filter((f) => !fs.existsSync(`${HERE}js-pre11G/${f}`) || SRC("js-pre11N", f) !== SRC("js-pre11G", f)).sort();
// Round 11H (layout; was the live pages, here and in X2): 11G's own page set, read from the frozen result (html-pre11H = HEAD
// d731571); the live reset-password.html has 11H's cuts since (resetnotes.mjs R2 / X2). The css half: Round 13U, below. X2's
// label is kept as 11G wrote it; since 11H, reset-password no longer uses users.css's .strength / .reqs either.
const changedHtml = walk(`${HERE}html-pre11H`).filter((f) => !fs.existsSync(`${PRE}/${f}`) || fs.readFileSync(`${HERE}html-pre11H/${f}`, "utf8") !== fs.readFileSync(`${PRE}/${f}`, "utf8")).sort();
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre11G", f)) : [];
check("X1", "js changed: exactly pages/user-profile.js; nothing added or removed",
  j(changedJs) === j(["pages/user-profile.js"]) && j(walk(`${HERE}js-pre11N`).sort()) === j(walk(`${HERE}js-pre11G`).sort()), j(changedJs));
check("X2", "pages changed: exactly account/change-password.html (user-profile.html untouched); no css (users.css's .strength / .reqs stay: reset-password uses them); nothing added or removed",
  j(changedHtml) === j(["account/change-password.html"]) && changedCss.length === 0 && j(walk(`${HERE}html-pre11H`).sort()) === j(walk(PRE).sort()), j([changedHtml, changedCss]));
const up = SRC("js", "pages/user-profile.js"), up0 = SRC("js-pre11G", "pages/user-profile.js");
const cp = html(DIR, "account/change-password");
check("X3", "both CRLF only; each final newline as before", [up, cp].every((s) => !/[^\r]\n/.test(s)) && up.endsWith("\n") === up0.endsWith("\n") && cp.endsWith("\n") === cp0.endsWith("\n"));
const cnt = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
// Round 11L (layout; was the live js): 11G's own lines, read from the frozen result (js-pre11L = HEAD 2883a77); the
// live tree has 11L's reset toast since (sweepnotes.mjs X4)
const A0 = cnt(up0.split("\r\n")), B0 = cnt(SRC("js-pre11L", "pages/user-profile.js").split("\r\n"));
const removed = [...A0].flatMap(([l, n]) => Array(Math.max(0, n - (B0.get(l) ?? 0))).fill(l)).sort();
const added = [...B0].reduce((s, [l, n]) => s + Math.max(0, n - (A0.get(l) ?? 0)), 0);
check("X4", "…and within user-profile.js only 11G's lines: 11F's 4-line 'Access' comment and its 4 Two-factor lines out; a 4-line comment and the 6-line loop in",
  j(removed) === j(['  // Access. "Last sign-in" stays static; the approval chain is the one this', "  // person's leave and corrections really go through. Nothing records or",
    "  // enforces two-factor sign-in, so that row says so, muted and without the", '  // HTML\'s "On" badge (round 11F; it showed "On" on every profile).',
    '  const twoFactor = kvDd("Two-factor sign-in");', "  if (twoFactor) {", '    twoFactor.textContent = "Not recorded yet";', '    twoFactor.classList.add("text-muted");'].sort()) && added === 10, j({ removed, added }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
