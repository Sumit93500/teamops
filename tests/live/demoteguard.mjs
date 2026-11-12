// usage: node demoteguard.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 9W: only an Admin may take the Admin role away from someone, however many Admins there are (9U's build, B7.3:
// HR could still demote one of two Admins, as only granting and the last Admin were guarded). In jsdom with the js in
// ./js; ./js-pre9W, ./html-pre9W and ./css-pre9W are the code, pages and styles before this round (office-os 35a5710).
// Clock fixed at Thu 8 Oct 2026 10:00.
//   D  updateUser with { byRole }: a non-Admin can't demote one of two (or three) Admins; an Admin can, another Admin
//      or himself; no byRole, as before; the last Admin keeps 9U's refusal and message; other changes unaffected
//   F  user-form.html end to end: HR demoting the second Admin is refused as a toast; the Admin doing it is saved
//   R  deleteUser(id, { byRole }): a non-Admin can't delete one of two Admins; an Admin can; no byRole, as before
//   X  the change set: data/store.js only; no page, no css; no errors
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const RAW = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const SRC = (dir, p) => fs.readFileSync(`${HERE}${dir}/${p}`, "utf8");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 10, 8);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
URL.createObjectURL = () => "blob:test";
URL.revokeObjectURL = () => {};

const WHO = { aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"] };
let loads = 0, w = null, d = null, saved = {};
const jsErrors = [], navigations = [];
async function open(who, page, script, query = "") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => (/navigation/i.test(e.message) ? navigations : jsErrors).push(`${who} ${page}: ${e.message}`));
  const dom = new JSDOM(RAW(page), { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  navigations.length = 0;
  await import(`./js/app.js?load=${loads}`);
  if (script) { try { await import(`./js/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); } }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const walk = (root, rel = "") => fs.readdirSync(`${root}/${rel}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${rel}${e.name}/`) : [`${rel}${e.name}`]));
const safe = (f) => { try { return f(); } catch (e) { return { ok: "threw", error: e.message }; } };

const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const UF = "users/user-form.html";
const AARAV = "EMP-1001", ROHAN = "EMP-1042";
const $ = (id) => d.getElementById(id);
const pick = (title) => { $("designation").value = title; $("designation").dispatchEvent(new w.Event("change")); };
const submit = () => d.querySelector("form").dispatchEvent(new w.Event("submit", { cancelable: true }));
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${t.className.replace("toast toast--", "")}:${txt(t.querySelector(".toast__text"))}`);
const roleOf = (id) => S.getUser(id)?.role;
const admins = () => S.getAllUsers().filter((u) => u.role === "admin").map((u) => u.id).sort();
const LAST_ADMIN = "There must always be an Admin: make someone else an Admin first.";
const REMOVE = "Only an Admin can take the Admin role away from someone or delete an Admin.";
const person = (n, extra = {}) => ({ name: `Test ${n}`, email: `test.${n}@northwind.com`, department: "ENG", ...extra });
const anAdmin = (n) => S.addUser(USER_ACTOR("admin", null), person(n, { role: "admin", designation: "Administrator" })).record;
const refusedWith = (r, msg) => r?.ok === false && r.error === msg;
// A fresh store with Aarav plus `extra` more Admins; returns their ids
async function withAdmins(extra) { fresh(); await open("aarav", "dashboard/admin.html", null); return Array.from({ length: extra }, (_, i) => anAdmin(`a${i}`).id); }

// =====================================================================
section("D. Demoting an Admin through the store");
let [second] = await withAdmins(1);
const byHr = [safe(() => S.updateUser(USER_ACTOR("hr", second), second, { role: "emp" })), safe(() => S.updateUser(USER_ACTOR("hr", AARAV), AARAV, { role: "hr", designation: "HR Manager" }))];
check("D1", "HR (byRole hr) demoting either of two Admins is refused, with the reason; both still Admins",
  byHr.every((r) => refusedWith(r, REMOVE)) && j(admins()) === j([AARAV, second].sort()), j(byHr.map((r) => r.error)));
const byOthers = ["fin", "emp"].map((b) => safe(() => S.updateUser(USER_ACTOR(b ?? "admin", second), second, { role: "emp" })));
// Round 10Y (decision; was REMOVE): Finance and an Employee hold no users:edit on record, so the store refuses them first
check("D2", "…and so is anyone else who isn't an Admin (Finance, an Employee), now refused before the Admin rule (round 10Y)", byOthers.every((r) => refusedWith(r, "You can't edit employees.")) && roleOf(second) === "admin", j(byOthers.map((r) => r.error)));
const [s3, t3] = await withAdmins(2);
const ofThree = safe(() => S.updateUser(USER_ACTOR("hr", t3), t3, { role: "emp" }));
check("D3", "…however many Admins there are: HR demoting one of three is refused", refusedWith(ofThree, REMOVE) && admins().length === 3, j(ofThree));
[second] = await withAdmins(1);
const other = safe(() => S.updateUser(USER_ACTOR("admin", second), second, { role: "emp", designation: "Software Engineer" }));
check("D4", "an Admin (byRole admin) demoting a different Admin, one of two: saved; Aarav is the one left",
  other.ok === true && roleOf(second) === "emp" && j(admins()) === j([AARAV]), j(other.error ?? "ok"));
[second] = await withAdmins(1);
const self = safe(() => S.updateUser(USER_ACTOR("admin", AARAV), AARAV, { role: "emp", designation: "Software Engineer" }));
check("D5", "…and demoting himself, one of two: saved (adminguard Z5's case, through the store)", self.ok === true && j(admins()) === j([second]), j(self.error ?? "ok"));
[second] = await withAdmins(1);
const plain = safe(() => S.updateUser(USER_ACTOR("admin", second), second, { role: "emp" }));
check("D6", "no byRole (the seed, scripts, the existing suite calls): demoting one of two is saved, as before", plain.ok === true && j(admins()) === j([AARAV]), j(plain.error ?? "ok"));
await withAdmins(0);
const lastByHr = safe(() => S.updateUser(USER_ACTOR("hr", AARAV), AARAV, { role: "emp" }));
const lastByAdmin = safe(() => S.updateUser(USER_ACTOR("admin", AARAV), AARAV, { role: "emp" }));
check("D7", "the only Admin: still refused with 9U's message, whoever asks (HR included); the new rule doesn't change it",
  refusedWith(lastByHr, LAST_ADMIN) && refusedWith(lastByAdmin, LAST_ADMIN) && j(admins()) === j([AARAV]), j([lastByHr.error, lastByAdmin.error]));
[second] = await withAdmins(1);
const hrOther = [safe(() => S.updateUser(USER_ACTOR("hr", ROHAN), ROHAN, { role: "hr" })), safe(() => S.updateUser(USER_ACTOR("hr", ROHAN), ROHAN, { role: "emp" })),
  safe(() => S.updateUser(USER_ACTOR("hr", second), second, { phone: "+91 90000 00005" })), safe(() => S.updateUser(USER_ACTOR("admin", second), second, { role: "admin" }))];
check("D8", "unaffected: HR changing a non-Admin's role (emp -> hr -> emp); HR saving an Admin's phone with no role in it; an Admin keeping an Admin an Admin",
  hrOther.every((r) => r.ok === true) && roleOf(ROHAN) === "emp" && S.getUser(second).phone === "+91 90000 00005" && roleOf(second) === "admin", j(hrOther.map((r) => r.ok === true || r.error)));

// =====================================================================
section("F. user-form.html, end to end");
[second] = await withAdmins(1);
await open("priya", UF, "user-form", `?id=${second}`);
pick("Software Engineer"); submit();
check("F1", "HR opens the second Admin's form, picks Software Engineer and saves: refused as a toast with the reason; still an Admin",
  j(toasts()) === j([`danger:${REMOVE}`]) && roleOf(second) === "admin" && admins().length === 2, j(toasts()));
await open("aarav", UF, "user-form", `?id=${second}`);
pick("Software Engineer"); submit();
check("F2", "the Admin does the same to the other Admin: saved; Aarav is the one left", j(toasts()) === j(["success:Employee saved."]) && roleOf(second) === "emp" && j(admins()) === j([AARAV]), j(toasts()));
[second] = await withAdmins(1);
await open("aarav", UF, "user-form", `?id=${AARAV}`);
pick("Software Engineer"); submit();
check("F3", "the Admin demoting himself in the form, one of two: saved (adminguard Z5's case)", j(toasts()) === j(["success:Employee saved."]) && j(admins()) === j([second]), j(toasts()));
await withAdmins(0);
await open("priya", UF, "user-form", `?id=${AARAV}`);
pick("Software Engineer"); submit();
check("F4", "HR demoting the only Admin in the form: still 9U's last-Admin toast (adminguard Z3)", j(toasts()) === j([`danger:${LAST_ADMIN}`]) && roleOf(AARAV) === "admin", j(toasts()));

// =====================================================================
section("R. Deleting an Admin");
[second] = await withAdmins(1);
const delByHr = ["hr", "fin", "emp"].map((b) => safe(() => S.deleteUser(USER_ACTOR(b ?? "admin", second), second)));
// Round 10Y (decision; was all three refused with REMOVE): Finance and an Employee hold no users:deactivate on record
// Round 11N (behaviour; behaviour; users:delete is Admin only since round 11N (it was users:deactivate, which HR holds), so HR can't delete; it's refused before the Admin-only rule now, like Finance and an Employee)
check("R1", "HR deleting one of two Admins is refused, as Finance and an Employee are: none holds users:delete (round 11N); still on record",
  delByHr.every((r) => refusedWith(r, "You can't delete employees.")) && Boolean(S.getUser(second)) && admins().length === 2, j(delByHr.map((r) => r.error)));
const delByAdmin = safe(() => S.deleteUser(USER_ACTOR("admin", second), second));
check("R2", "an Admin (byRole admin) deleting the other Admin, one of two: deleted; Aarav is the one left",
  delByAdmin.ok === true && !S.getUser(second) && j(admins()) === j([AARAV]), j(delByAdmin.error ?? "ok"));
[second] = await withAdmins(1);
const delPlain = safe(() => S.deleteUser(USER_ACTOR("admin", second), second));
check("R3", "no byRole: deleting one of two Admins is done, as before (adminguard Z7)", delPlain.ok === true && j(admins()) === j([AARAV]), j(delPlain.error ?? "ok"));
[second] = await withAdmins(1);
S.updateUser(USER_ACTOR("admin", AARAV), AARAV, { role: "emp", designation: "Software Engineer" });
const lastDel = [safe(() => S.deleteUser(USER_ACTOR("hr", second), second)), safe(() => S.deleteUser(USER_ACTOR("admin", second), second)), safe(() => S.deleteUser(USER_ACTOR("admin", second), second))];
// Round 11N (behaviour; behaviour; users:delete is Admin only since round 11N (it was users:deactivate, which HR holds), so HR can't delete; an Admin (the last one, on themselves) still gets 9U's message, which comes before the self rule)
check("R4", "the last Admin (Aarav demoted): deleting them is still refused with 9U's message when an Admin asks; HR is refused before that (round 11N)",
  refusedWith(lastDel[0], "You can't delete employees.") && lastDel.slice(1).every((r) => refusedWith(r, LAST_ADMIN)) && j(admins()) === j([second]), j(lastDel.map((r) => r.error)));
await withAdmins(0);
const hire = S.addUser(USER_ACTOR("admin", null), person("x")).record;
// Round 11N (behaviour; behaviour; users:delete is Admin only since round 11N (it was users:deactivate, which HR holds), so HR can't delete; an Admin deletes the non-Admin instead, and Aarav (asking about himself) still gets the demo-identity refusal)
const delOthers = [safe(() => S.deleteUser(USER_ACTOR("hr", hire.id), hire.id)), safe(() => S.deleteUser(USER_ACTOR("admin", hire.id), hire.id)), safe(() => S.deleteUser(USER_ACTOR("admin", null), AARAV))];
check("R5", "a non-Admin: HR is refused (users:delete, round 11N), an Admin deletes them; Aarav, a demo sign-in identity, is still refused as before",
  refusedWith(delOthers[0], "You can't delete employees.") && delOthers[1].ok === true && !S.getUser(hire.id) && delOthers[2].error === "EMP-1001 is a demo sign-in identity and can't be deleted.", j(delOthers.map((r) => r.ok === true || r.error)));

// =====================================================================
section("X. Change set and hygiene");
// Round 9Y (layout; was the live js vs js-pre9W, here and in X1 / X3 / X4): 9W's own change set, read from its frozen
// result (js-pre9Y = HEAD 80cf801); the live js has 9Y's lines since (deactguard.mjs X1 / X4)
const changedJs = walk(`${HERE}js-pre9Y`).filter((f) => SRC("js-pre9Y", f) !== SRC("js-pre9W", f)).sort();
// Round 11B (layout; was the live pages, here and in the check below): this round's own page claim, read from its
// frozen result (html-pre11B = HEAD 97e1e6c); the live pages have 11B's sessions.html banner since (acctpages.mjs X2)
const changedHtml = walk(`${HERE}html-pre11B`).filter((f) => f.endsWith(".html") && SRC("html-pre11B", f) !== SRC("html-pre9W", f)).sort();
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const cssRoot = `${HERE}css-pre13U`;
const changedCss = walk(cssRoot).filter((f) => fs.readFileSync(`${cssRoot}/${f}`, "utf8") !== SRC("css-pre9W", f));
check("X1", "js changed: exactly data/store.js; nothing added or removed", j(changedJs) === j(["data/store.js"]) && j(walk(`${HERE}js-pre9Y`).sort()) === j(walk(`${HERE}js-pre9W`).sort()), j(changedJs));
check("X2", "no page and no css changed; nothing added or removed", changedHtml.length === 0 && changedCss.length === 0 && j(walk(`${HERE}html-pre11B`).sort()) === j(walk(`${HERE}html-pre9W`).sort()), j([changedHtml, changedCss]));
check("X3", "store.js is CRLF only, with no final newline", changedJs.map((f) => SRC("js-pre9Y", f)).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
// The file's lines, as a multiset: the lines 9W replaced must be exactly these, and it adds exactly this many (what the
// added lines do is D-R's business), so an edit anywhere else in store.js shows here.
const lineDelta = (f) => {
  const count = (s) => s.split("\r\n").reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const a = count(SRC("js-pre9W", f)), b = count(SRC("js-pre9Y", f));
  const minus = (x, y) => [...x].flatMap(([l, n]) => Array(Math.max(0, n - (y.get(l) ?? 0))).fill(l));
  return { removed: minus(a, b), added: minus(b, a).length };
};
const EXPECTED = {
 "data/store.js": {
  "removed": [
   "export function deleteUser(id) {"
  ],
  "added": 8
 }
};
check("X4", "…and within it, only 9W's lines (removed lines exact; added lines counted)",
  Object.entries(EXPECTED).every(([f, e]) => j(lineDelta(f)) === j(e)), j(Object.fromEntries(Object.keys(EXPECTED).map((f) => [f, lineDelta(f)]))));
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
