// usage: node pagenotes.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 11F: three static lines that said more than is true (11E E1 / E2 / E3). ./js-pre11F, ./html-pre11F and
// ./css-pre11F are the code, pages and css before this round (office-os e93d118).
//   I  approvals-inbox: "…Those go to another Admin, so nobody approves their own work." becomes "You can't approve or
//      reject a request you raised yourself. An Admin's own requests don't come here: they're approved automatically."
//      Both rules are checked against the four stores (leave, attendance corrections, expense claims, asset requests).
//   U  user-profile: "Two-factor sign-in" said "On" (a success badge) on every profile; the page script now writes "Not
//      recorded yet", muted, no badge. Everything else on the profile as before.
//   C  change-password: the warning "…change it now and sign out of all devices." becomes an info line saying nothing on
//      the page changes a password, signs anyone out or saves its settings; 11B's toast unchanged.
//   X  scope: exactly pages/user-profile.js, requests/approvals-inbox.html and account/change-password.html.
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

const AARAV = ["admin", "Aarav Mehta", "EMP-1001"], PRIYA = ["hr", "Priya Nair", "EMP-1003"], KABIR = ["fin", "Kabir Shah", "EMP-1008"], ARJUN = ["emp", "Arjun Kapoor", "EMP-1105"];
let writes = [];
const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { writes.push(k.replace("officeos:", "")); mem.set(k, String(v)); }, removeItem: (k) => { writes.push(`-${k.replace("officeos:", "")}`); mem.delete(k); }, clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
let loads = 0, w = null, d = null, navigations = [];
const allJsErrors = [];
// Opens a page from `dir` with the js under `js` (./js or ./js-pre11F), running the module scripts its HTML loads,
// signed in as `who`, on the shared storage.
async function open(page, { dir = DIR, js = "js", who = AARAV, query = "" } = {}) {
  const vc = new VirtualConsole();
  navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message.slice(0, 60)); else if (!/form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
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
const INBOX = "You can't approve or reject a request you raised yourself. An Admin's own requests don't come here: they're approved automatically.";
const CHANGE = "Passwords aren't part of OfficeOS yet: sign-in is picking a demo role, so nothing on this page changes a password, signs anyone out or saves these settings.";
const html = (dir, page) => fs.readFileSync(`${dir}/${page}.html`, "utf8");
// The page with `line` swapped for `old` must be the old page, byte for byte, and `line` must appear once.
// Round 11G (layout; `dir` added, default the live pages): C3 reads 11F's frozen result (html-pre11G = HEAD 7a95b0a); the live
// change-password has 11G's cuts since (signnotes.mjs C6 / X2)
const onlyLine = (page, line, old, dir = DIR) => { const a = html(dir, page), b = html(`${HERE}html-pre11F`, page); return a.split(line).length === 2 && a.replace(line, old) === b; };

// =================================================================
section("I. approvals-inbox: the self-decision line, and the rules it states");
fresh();
await open("requests/approvals-inbox");
const ia = [...d.querySelectorAll(".alert")].filter((a) => !a.closest("[hidden]"));
const inboxAlert = ia.find((a) => /raised yourself/.test(a.textContent));
check("I1", "the inbox's line: an info alert, last in the page's aside, with the new wording",
  inboxAlert?.className === "alert alert--info" && inboxAlert.textContent === INBOX && inboxAlert.parentElement?.tagName === "ASIDE" && inboxAlert.parentElement.lastElementChild === inboxAlert, j([inboxAlert?.className, inboxAlert?.textContent]));
check("I2", "…nothing on the page says 'another Admin' or 'nobody approves their own work' any more", !/another Admin|nobody approves their own work/.test(d.body.textContent));
check("I3", "…and the rest of approvals-inbox.html is byte-for-byte what it was",
  onlyLine("requests/approvals-inbox", `        <div class="alert alert--info">${INBOX}</div>\r\n`, "        <div class=\"alert alert--info\">You can't approve a request you raised yourself. Those go to another Admin, so nobody approves their own work.</div>\r\n", `${HERE}html-pre12Z`));   // Round 12Z (layout; was the live page): as 77b5ddb has it; the live page: salinbox.mjs X2
// The rules, from the stores: an Admin's own request is approved at once; anyone else's waits; nobody decides their own.
const L = await import("./js/data/leave-store.js"), E = await import("./js/data/expenses-store.js"), A = await import("./js/data/asset-requests-store.js"), T = await import("./js/data/attendance-store.js");
const { CATEGORY_KEYS } = await import("./js/data/expenses.js");
const { ASSET_TYPES } = await import("./js/data/inventory.js");
const S = await import("./js/data/store.js");
const iso = (n) => { const x = new RealDate(NOW - n * 86400000); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
// An attendance correction someone may really ask for: the first day (today, then back a week) and issue the store
// accepts. The demo identities' seeded days are clean, so in practice it's today's missed check-in at 09:30.
function correction(id) {
  for (let n = 0; n <= 7; n++) for (const [issue, time] of [["missed-check-in", "09:30"], ["missed-check-out", "18:00"], ["late-arrival", "09:30"]]) {
    const r = T.requestRegularization(id, { date: iso(n), issue, time, reason: "pagenotes" });
    if (r.ok) return r;
  }
  return { ok: false, error: "no correctable day" };
}
const KINDS = [
  ["leave", (id) => L.applyLeave(id, { type: "casual", from: "2026-11-20", to: "2026-11-20", duration: "full", reason: "pagenotes" }), (rid, id, role) => L.decideLeave(rid, id, role, "approve")],
  ["correction", correction, (rid, id, role) => T.decideRegularization(rid, id, role, "approve")],
  ["expense", (id) => E.submitExpense(id, { category: CATEGORY_KEYS[0], amount: 62000, date: "2026-10-30", reason: "pagenotes", receipt: "bill.pdf" }), (rid, id, role) => E.decideExpense(rid, id, role, "approve")],
  ["asset", (id) => A.submitAssetRequest(id, { assetType: Object.keys(ASSET_TYPES)[0], reason: "pagenotes" }), (rid, id, role) => A.decideAssetRequest(rid, id, role, "approve")],
];
const rules = {};
for (const [who, role, id] of [["Aarav", "admin", "EMP-1001"], ["Priya", "hr", "EMP-1003"], ["Kabir", "fin", "EMP-1008"]]) {
  for (const [kind, ask, decide] of KINDS) {
    fresh(); S.getAllUsers();
    const r = ask(id);
    const self = r.ok ? decide(r.record.id, id, role) : null;
    rules[`${who} ${kind}`] = r.ok ? { status: r.record.status, auto: r.record.history.some((h) => h.decision === "auto-approved"), self: self.ok ? "ALLOWED" : self.error } : { error: r.error };
  }
}
const admins = S.getAllUsers().filter((u) => u.role === "admin" && u.status !== "inactive").length;
const r = (k) => rules[k];
check("I4", "the rule holds in all four stores: an Admin's own leave, correction, expense claim and asset request are approved automatically at once",
  ["leave", "correction", "expense", "asset"].every((k) => r(`Aarav ${k}`)?.status === "approved" && r(`Aarav ${k}`).auto), j(Object.fromEntries(Object.entries(rules).filter(([k]) => k.startsWith("Aarav")))));
check("I5", "…and nobody can decide their own: HR's and Finance's own requests wait, and deciding them themselves is refused, in all four stores",
  ["Priya", "Kabir"].every((p) => ["leave", "correction", "expense", "asset"].every((k) => r(`${p} ${k}`)?.status === "pending" && /your own/.test(r(`${p} ${k}`).self ?? ""))), j(Object.fromEntries(Object.entries(rules).filter(([k]) => !k.startsWith("Aarav")))));
check("I6", "…and there is one active Admin in the seed, so 'another Admin' had no one to mean", admins === 1, String(admins));

// =================================================================
section("U. user-profile: Two-factor sign-in");
const kvRows = () => Object.fromEntries([...d.querySelectorAll(".kv__row")].map((row) => [norm(row.querySelector("dt")?.textContent), norm(row.querySelector("dd")?.textContent)]));
const statusBadge = () => { const b = d.querySelectorAll(".profile__badges .badge")[1]; return b ? `${b.className}: ${b.textContent.trim()}` : null; };
const profiles = {};
for (const [id, viewer] of [["EMP-1105", AARAV], ["EMP-1061", AARAV], ["EMP-1003", PRIYA]]) {
  fresh();
  await open("users/user-profile", { query: `?id=${id}`, who: viewer });
  const dd = [...d.querySelectorAll(".kv__row")].find((row) => norm(row.querySelector("dt")?.textContent) === "Two-factor sign-in")?.querySelector("dd");
  profiles[id] = { text: norm(dd?.textContent), cls: dd?.className ?? null, badges: dd?.querySelectorAll(".badge").length ?? null, rows: kvRows(), status: statusBadge() };
  fresh();
  await open("users/user-profile", { query: `?id=${id}`, who: viewer, dir: `${HERE}html-pre11F`, js: "js-pre11F" });
  const od = [...d.querySelectorAll(".kv__row")].find((row) => norm(row.querySelector("dt")?.textContent) === "Two-factor sign-in")?.querySelector("dd");
  profiles[id].old = { html: od?.innerHTML.trim(), rows: kvRows(), status: statusBadge() };
}
check("U1", "on every profile (an active, an inactive and an HR person's), 'Two-factor sign-in' says 'Not recorded yet', muted, with no badge",
  Object.values(profiles).every((p) => p.text === "Not recorded yet" && /\btext-muted\b/.test(p.cls) && p.badges === 0), j(Object.fromEntries(Object.entries(profiles).map(([k, p]) => [k, [p.text, p.cls, p.badges]]))));
// Round 11G (was only "Two-factor sign-in" left out): 11G's "Last sign-in" row is left out too; it says "Not recorded yet"
// since 11G (signnotes.mjs S1 / S2), and every other row is still compared live
const without = (rows) => Object.fromEntries(Object.entries(rows).filter(([k]) => k !== "Two-factor sign-in" && k !== "Last sign-in" && k !== "Data scope"));   // Round Manager scoping part 2 (layout: Data scope's words changed since)
check("U2", "…and every other row and the status badge are exactly what the pre-11F script showed (Divya still 'Inactive', from her record)",
  Object.values(profiles).every((p) => j(without(p.rows)) === j(without(p.old.rows)) && p.status === p.old.status) && /Inactive/.test(profiles["EMP-1061"].status), j(Object.fromEntries(Object.entries(profiles).map(([k, p]) => [k, p.status]))));
check("U3", "before 11F, side by side: the same three profiles showed a success badge 'On'",
  Object.values(profiles).every((p) => p.old.html === '<span class="badge badge--success">On</span>'), j(Object.values(profiles).map((p) => p.old.html)));
// Round 11N (layout; layout; was the live page: read from the frozen result html-pre11N = HEAD fcdc960; the live user-profile.html has 11N's Delete button since (roadnotes.mjs X2))
check("U4", "user-profile.html itself is unchanged (the fix is in the page script)", html(`${HERE}html-pre11N`, "users/user-profile") === html(`${HERE}html-pre11F`, "users/user-profile"));

// =================================================================
section("C. change-password: the line under the forms");
fresh();
await open("account/change-password");
const aside = d.querySelector("main aside.stack");
const ca = aside?.lastElementChild;
check("C1", "the line: an info alert, still last in the page's side column, with the new wording",
  ca?.className === "alert alert--info" && ca.textContent === CHANGE, j([ca?.className, ca?.textContent]));
check("C2", "…nothing on the page says 'change it now' or 'sign out of all devices', and no warning alert is left",
  !/change it now|sign out of all devices/i.test(d.body.textContent) && !d.querySelector(".alert--warning"));
check("C3", "…and the rest of change-password.html is byte-for-byte what it was",
  onlyLine("account/change-password", `      <div class="alert alert--info">${CHANGE}</div>\r\n`, "      <div class=\"alert alert--warning\">If you think someone else knows your password, change it now and sign out of all devices.</div>\r\n", `${HERE}html-pre11G`));
const f = d.querySelector("form.form, form");
f.elements.current.value = "x"; f.elements.new.value = "N3w-pass!"; f.elements.confirm.value = "N3w-pass!";
writes = []; f.dispatchEvent(new w.Event("submit", { cancelable: true }));
const t = [...d.querySelectorAll(".toast")].map((x) => `${["success", "info"].find((k) => x.className.includes(`toast--${k}`))}: ${x.querySelector(".toast__text").textContent.trim()}`);
check("C4", "…and 11B's form is unchanged: matching passwords still say 'Passwords aren't part of OfficeOS yet: nothing was changed.' (info), nothing written",
  j(t) === j(["info: Passwords aren't part of OfficeOS yet: nothing was changed."]) && writes.length === 0, j([t, writes]));
check("E1", "no JS errors on any load", allJsErrors.length === 0, allJsErrors.join(" | "));

// =================================================================
section("X. Scope: exactly 11F's lines");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
// Round 11N (layout; layout; was the live js: read from the frozen result js-pre11N = HEAD fcdc960, the live tree has 11N's scripts since (roadnotes.mjs X1 / X4))
const changedJs = walk(`${HERE}js-pre11N`).filter((f) => !fs.existsSync(`${HERE}js-pre11F/${f}`) || SRC("js-pre11N", f) !== SRC("js-pre11F", f)).sort();
// Round 11H (layout; was the live pages, here and in X2): 11F's own page set, read from the frozen result (html-pre11H = HEAD
// d731571); the live reset-password.html has 11H's cuts since (resetnotes.mjs R2 / X2). The css half: Round 13U, below.
const changedHtml = walk(`${HERE}html-pre11H`).filter((f) => !fs.existsSync(`${HERE}html-pre11F/${f}`) || fs.readFileSync(`${HERE}html-pre11H/${f}`, "utf8") !== fs.readFileSync(`${HERE}html-pre11F/${f}`, "utf8")).sort();
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre11F", f)) : [];
check("X1", "js changed: exactly pages/user-profile.js; nothing added or removed",
  j(changedJs) === j(["pages/user-profile.js"]) && j(walk(`${HERE}js-pre11N`).sort()) === j(walk(`${HERE}js-pre11F`).sort()), j(changedJs));
check("X2", "pages changed: exactly account/change-password.html and requests/approvals-inbox.html (user-profile.html untouched); no css; nothing added or removed",
  j(changedHtml) === j(["account/change-password.html", "requests/approvals-inbox.html"]) && changedCss.length === 0 && j(walk(`${HERE}html-pre11H`).sort()) === j(walk(`${HERE}html-pre11F`).sort()), j([changedHtml, changedCss]));
const up = SRC("js", "pages/user-profile.js"), up0 = SRC("js-pre11F", "pages/user-profile.js");
const ib = html(DIR, "requests/approvals-inbox"), ib0 = html(`${HERE}html-pre11F`, "requests/approvals-inbox");
const cp = html(DIR, "account/change-password"), cp0 = html(`${HERE}html-pre11F`, "account/change-password");
check("X3", "all three CRLF only; each final newline as before",
  [up, ib, cp].every((s) => !/[^\r]\n/.test(s)) && up.endsWith("\n") === up0.endsWith("\n") && ib.endsWith("\n") === ib0.endsWith("\n") && cp.endsWith("\n") === cp0.endsWith("\n"));
const cnt = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
// Round 11G (layout; was the live js): 11F's own lines, read from its frozen result (js-pre11G = HEAD 7a95b0a); the live
// user-profile.js has 11G's loop since (signnotes.mjs X4)
const A0 = cnt(up0.split("\r\n")), B0 = cnt(SRC("js-pre11G", "pages/user-profile.js").split("\r\n"));
const removed = [...A0].flatMap(([l, n]) => Array(Math.max(0, n - (B0.get(l) ?? 0))).fill(l)).sort();
const added = [...B0].reduce((s, [l, n]) => s + Math.max(0, n - (A0.get(l) ?? 0)), 0);
check("X4", "…and within user-profile.js only 11F's lines: the 2-line 'Access' comment out; a 4-line comment and the 5-line Two-factor row in",
  j(removed) === j(["  // Access. \"Two-factor sign-in\" and \"Last sign-in\" stay static; the approval", "  // chain is the one this person's leave and corrections really go through."].sort()) && added === 9, j({ removed, added }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
