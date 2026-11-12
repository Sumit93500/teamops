// usage: node statuses.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12R: round-12p-notes.md P11, rulings approved. Two separate edits:
//   P11.1 (store.js) addUser and changeUser refuse a status other than "active", "on-leave" or "inactive" when one is
//         sent; a missing status key stays unchecked; null and "" are refused like any other value. New string, on the
//         status field: "Status must be active, on-leave or inactive."
//   P11.2 (user-profile.js) the status button handler's unreachable deactivateUser(getCurrentUserId(), user.id) is
//         removed: deactivating goes to the dialog first (11Y). No behavior change.
// ./js-pre12R, ./html-pre12R and ./css-pre12R are the code, pages and css before this round (office-os 6f3fc29).
//   G  P11.1 reproduced: odd values stored by the code before, refused now
//   I  invalid values on addUser and updateUser (and through deactivate / reactivate's callers: none sends one)
//   V  the three valid values: every result == the code before's (12P / 11Y refusals included)
//   M  no status key: unchecked, == the code before's
//   O  order: the permission / Admin-only / overrides refusals first; this one before every later status rule
//   F  the edit form: never sends an odd value; a record stored with one before meets the refusal as a toast
//   D  P11.2: the profile's Deactivate / Reactivate clicks give the same toasts and the same stored bytes as before
//   E  no page errors;  X  scope
// Storage seeded Fri 30 Oct 2026 19:00; pages opened 20 Nov 11:00.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
setNow(2026, 11, 20);
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", MEERA = "EMP-1023", ROHAN = "EMP-1042", DIVYA = "EMP-1061", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

// A page, with its scripts from ./js (this round) or ./js-pre12R (the code before).
let loads = 0, w = null, d = null;
const allJsErrors = [];
async function open(page, query = "", js = "./js") {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${DIR}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = () => true;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`${js}/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); }
  }
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const safe = (fn) => { try { return fn(); } catch (e) { return { ok: false, error: `threw: ${e.message}` }; } };
const errOf = (r) => (r?.ok ? "ok" : r?.error ?? "no result");
const toast = () => txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));

const S = await import("./js/data/store.js");
const OLDS = await import("./js-pre12R/data/store.js");   // before this round, on the same storage
const BAD = "Status must be active, on-leave or inactive.";
const NEW = { name: "Neha Kapoor", email: "neha.kapoor@northwind.com", department: "ENG", designation: "Software Engineer" };

const seeded = () => { mem.clear(); setNow(2026, 10, 30, 19); S.getAllUsers(); setNow(2026, 11, 20); };
seeded();
const snap = new Map(mem);
const restore = () => { mem.clear(); for (const [k, v] of snap) mem.set(k, v); };
const users = () => mem.get("officeos:users");
function rawEdit(id, fields) {
  const box = JSON.parse(mem.get("officeos:users"));
  Object.assign(box.records.find((u) => u.id === id), fields);
  mem.set("officeos:users", JSON.stringify(box));
}
// The same call on this round's store and the code before's, each from the same storage: results and stored users.
function bothStores(call) {
  restore(); const a = j(safe(() => call(S))), aStore = users();
  restore(); const b = j(safe(() => call(OLDS))), bStore = users();
  restore();
  return { a, b, same: a === b && aStore === bStore };
}

const INVALID = [["\"Inactive\"", "Inactive"], ["\"INACTIVE\"", "INACTIVE"], ["\"left\"", "left"], ["\"terminated\"", "terminated"], ["\"\"", ""], ["null", null],
  ["undefined (the key sent)", undefined], ["\" active\"", " active"], ["\"active \"", "active "], ["\"on leave\"", "on leave"], ["0", 0], ["false", false], ["[\"active\"]", ["active"]], ["{}", {}]];

// =================================================================
section("G. P11.1, reproduced");
restore();
const g = [safe(() => S.updateUser(AARAV, VIKRAM, { status: "left" })), safe(() => S.addUser(AARAV, { ...NEW, status: "left" }))];
check("G1", "updateUser and addUser with status \"left\": refused with the new string, on the status field; nothing stored",
  g.every((r) => errOf(r) === BAD && r.field === "status") && users() === snap.get("officeos:users"), j(g));
const g2 = bothStores((m) => m.updateUser(AARAV, VIKRAM, { status: "left" }));
restore(); OLDS.updateUser(AARAV, VIKRAM, { status: "left" });
check("G2", "the code before stored it (Vikram \"left\": still counted as working, no last working day)", JSON.parse(g2.b).ok && S.getUser(VIKRAM).status === "left" && S.leavingDate(S.getUser(VIKRAM)) === null && S.activeHeadcount() === 9, g2.b.slice(0, 80));

// =================================================================
section("I. Invalid values");
const iBad = [], iOld = [];
for (const [label, value] of INVALID) {
  restore();
  const u = safe(() => S.updateUser(AARAV, VIKRAM, { status: value }));
  const a = safe(() => S.addUser(AARAV, { ...NEW, status: value }));
  if (errOf(u) !== BAD || u.field !== "status" || errOf(a) !== BAD || a.field !== "status" || users() !== snap.get("officeos:users")) iBad.push(`${label}: ${j([u, a])}`);
  restore();
  if (safe(() => OLDS.updateUser(AARAV, VIKRAM, { status: value })).ok) iOld.push(label);
}
check("I1", `${INVALID.length} invalid values (case, words, "", null, an explicit undefined, spaces, 0, false, a list, an object): updateUser and addUser each refuse them with the string on status; nothing stored`,
  iBad.length === 0, j(iBad.slice(0, 2)));
check("I2", "the code before stored every one through updateUser", iOld.length === INVALID.length, j(iOld.length));
restore();
const i3 = [safe(() => S.updateUser(AARAV, VIKRAM, { status: "left", phone: "+91 90000 00001" })), safe(() => S.updateUser(AARAV, DIVYA, { status: "left" })), safe(() => S.updateUser(AARAV, MEERA, { status: "Active" }))];
check("I3", "with other fields in the same save (nothing saved), from an inactive record and from an on-leave one: refused the same way",
  i3.every((r) => errOf(r) === BAD) && users() === snap.get("officeos:users"), j(i3.map(errOf)));

// =================================================================
section("V. The three valid values, as before");
const vBad = [];
const VALID_CALLS = [
  ["updateUser active (Vikram, already)", (m) => m.updateUser(AARAV, VIKRAM, { status: "active" })],
  ["updateUser on-leave (Vikram)", (m) => m.updateUser(AARAV, VIKRAM, { status: "on-leave" })],
  ["updateUser active (Meera, on leave)", (m) => m.updateUser(AARAV, MEERA, { status: "active" })],
  ["updateUser inactive, no date (11Y's refusal)", (m) => m.updateUser(AARAV, VIKRAM, { status: "inactive" })],
  ["updateUser inactive + 20 Nov", (m) => m.updateUser(AARAV, VIKRAM, { status: "inactive", dateOfLeaving: "2026-11-20" })],
  ["updateUser active (Divya, inactive: a reactivation)", (m) => m.updateUser(AARAV, DIVYA, { status: "active" })],
  ["updateUser inactive (Divya, already)", (m) => m.updateUser(AARAV, DIVYA, { status: "inactive" })],
  ["deactivateUser (Vikram, 20 Nov)", (m) => m.deactivateUser(PRIYA, VIKRAM, "2026-11-20")],
  ["reactivateUser (Divya)", (m) => m.reactivateUser(AARAV, DIVYA)],
  ["addUser active", (m) => m.addUser(AARAV, { ...NEW, status: "active" })],
  ["addUser on-leave", (m) => m.addUser(AARAV, { ...NEW, status: "on-leave" })],
  ["addUser inactive (12P's refusal)", (m) => m.addUser(AARAV, { ...NEW, status: "inactive" })],
];
for (const [label, call] of VALID_CALLS) { const r = bothStores(call); if (!r.same) vBad.push(`${label}: ${r.a} vs ${r.b}`); }
check("V1", `${VALID_CALLS.length} saves with "active", "on-leave" or "inactive" (11Y's and 12P's refusals among them): result and stored users identical to the code before's`, vBad.length === 0, j(vBad.slice(0, 2)));
const v2 = bothStores((m) => m.addUser(AARAV, { ...NEW, status: "inactive" }));
check("V2", "\"inactive\" on addUser still meets 12P's refusal, not this one", JSON.parse(v2.a).error === "A last working day is recorded only when someone is deactivated.", v2.a);

// =================================================================
section("M. No status key: unchecked");
const mBad = [];
for (const [label, call] of [
  ["updateUser phone only", (m) => m.updateUser(AARAV, VIKRAM, { phone: "+91 90000 00002" })],
  ["updateUser joining date only", (m) => m.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" })],
  ["updateUser {}", (m) => m.updateUser(AARAV, VIKRAM, {})],
  ["addUser no status", (m) => m.addUser(AARAV, { ...NEW })],
]) { const r = bothStores(call); if (!r.same || !JSON.parse(r.a).ok) mBad.push(`${label}: ${r.a}`); }
check("M1", "saves without a status key (a field alone, nothing at all, a new person): saved, identical to the code before's", mBad.length === 0, j(mBad.slice(0, 2)));
restore(); S.addUser(AARAV, { ...NEW });
check("M2", "a new person with no status is stored active (addUser's default)", S.getAllUsers().find((u) => u.email === NEW.email)?.status === "active");
restore(); rawEdit(VIKRAM, { status: "left" });
const m3 = safe(() => S.updateUser(AARAV, VIKRAM, { phone: "+91 90000 00003" }));
check("M3", "a record stored with an odd status before: a save that doesn't send status is not refused (only what's sent is checked)", m3.ok && S.getUser(VIKRAM).status === "left", errOf(m3));

// =================================================================
section("O. Order");
restore();
const o = [
  [safe(() => S.updateUser(ARJUN, VIKRAM, { status: "left" })), "You can't edit employees."],
  [safe(() => S.addUser(ARJUN, { ...NEW, status: "left" })), "You can't add employees."],
];
check("O1", "an Employee (no users:edit / users:create): the permission refusal first, as before", o.every(([r, want]) => errOf(r) === want), j(o.map(([r]) => errOf(r))));
const o2 = [errOf(safe(() => S.updateUser(PRIYA, VIKRAM, { role: "admin", status: "left" }))), errOf(safe(() => OLDS.updateUser(PRIYA, VIKRAM, { role: "admin" }))),
  errOf(safe(() => S.addUser(PRIYA, { ...NEW, role: "admin", status: "left" })))];
check("O2", "HR giving the Admin role (updateUser and addUser): the Admin-only refusal first, as before", o2[0] === o2[1] && o2[2] === o2[1] && /^Only an Admin/.test(o2[0]), j(o2));
restore();
const o3 = [safe(() => S.updateUser(AARAV, AARAV, { status: "Inactive" })), safe(() => S.updateUser(AARAV, PRIYA, { status: "Inactive" })), safe(() => S.updateUser(AARAV, ROHAN, { status: "", dateOfLeaving: "2026-11-20" })),
  safe(() => S.addUser(AARAV, { ...NEW, name: "", status: "left" })), safe(() => S.addUser(AARAV, { ...NEW, status: null, dateOfLeaving: "2026-11-06" }))];
check("O3", "before every later rule: your own account, a demo identity, a date sent with it (11Y), a missing name, 12P's last working day",
  o3.every((r) => errOf(r) === BAD), j(o3.map(errOf)));

// =================================================================
section("F. The edit form");
const formSrc = fs.readFileSync(new URL("./js/pages/user-form.js", import.meta.url), "utf8");
check("F1", "user-form.js sends a stored status back, \"active\" or \"inactive\" (no other literal status)",
  /let status = editing\?\.status \?\? "active";/.test(formSrc) && j([...formSrc.matchAll(/status = [^;]*;/g)].map((m) => m[0]).join(" ").match(/"[a-z-]+"/g)?.filter((x) => !["\"active\"", "\"inactive\""].includes(x)) ?? []) === "[]");
async function formSave(id, js) {
  setSession("admin", "Aarav Mehta", AARAV); await open("users/user-form", `?id=${id}`, js);
  d.getElementById("phone").value = "+91 90000 00004";
  d.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  return toast();
}
restore(); rawEdit(VIKRAM, { status: "left" });
const f2 = await formSave(VIKRAM);
check("F2", "Vikram stored as \"left\" before this round: his edit form (box ticked) re-sends it and meets the refusal as a toast; nothing stored",
  f2 === BAD && S.getUser(VIKRAM).phone !== "+91 90000 00004" && S.getUser(VIKRAM).status === "left", f2);
restore(); rawEdit(VIKRAM, { status: "left" });
const f3 = await formSave(VIKRAM, "./js-pre12R");
check("F3", "the code before saved it", f3 === "Employee saved." && S.getUser(VIKRAM).phone === "+91 90000 00004", f3);
restore(); rawEdit(VIKRAM, { status: "left" });
setNow(2026, 11, 20);
const f4 = errOf(safe(() => S.deactivateUser(PRIYA, VIKRAM, "2026-11-20")));
check("F4", "...and such a record can be set right on the profile: Deactivate (with a last working day) sends a valid status", f4 === "ok" && S.getUser(VIKRAM).status === "inactive", f4);
restore();
const f5 = [await formSave(VIKRAM), await formSave(MEERA)];
check("F5", "valid records save as before from the form (Vikram active, Meera on leave)", f5.every((t) => t === "Employee saved.") && S.getUser(MEERA).status === "on-leave", j(f5));

// =================================================================
section("D. P11.2: the profile's status button");
// The same clicks on this round's page and the code before's, each from the same storage: toasts and stored bytes.
async function clicks(js, id, steps) {
  restore(); setSession("admin", "Aarav Mehta", AARAV); await open("users/user-profile", `?id=${id}`, js);
  const out = [];
  for (const step of steps) out.push(await step());
  return { out, store: users() };
}
const btn = () => [...d.querySelectorAll(".page-header__actions button")].find((b) => /activate/i.test(txt(b)));
const modalOpen = () => Boolean(d.getElementById("deactivate-modal")?.classList.contains("is-open"));   // ui/modal.js openModal()
const SCENARIOS = [
  ["Deactivate clicked on Vikram: the dialog, nothing stored", VIKRAM, [async () => { const before = modalOpen(); btn()?.click(); return [txt(btn()), before, modalOpen(), Boolean(d.getElementById("deactivate-date"))]; }]],
  ["Deactivate, then the dialog sent with 20 Nov", VIKRAM, [async () => { btn()?.click(); const i = d.getElementById("deactivate-date"); if (i) i.value = "2026-11-20"; d.getElementById("deactivate-modal")?.querySelector("form")?.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); return [toast(), txt(btn())]; }]],
  ["Reactivate clicked on Divya", DIVYA, [async () => { btn()?.click(); return [toast(), txt(btn())]; }]],
  ["Deactivate on Aarav's own profile", AARAV, [async () => { btn()?.click(); return [toast()]; }]],
];
const dBad = [], dSeen = [], dOut = [], dStored = [];
for (const [label, id, steps] of SCENARIOS) {
  const a = await clicks("./js", id, steps), b = await clicks("./js-pre12R", id, steps);
  dSeen.push(`${label}: ${j(a.out)}`); dOut.push(a.out[0]); dStored.push(a.store !== snap.get("officeos:users"));
  if (j(a.out) !== j(b.out) || a.store !== b.store) dBad.push(`${label}: ${j(a.out)} vs ${j(b.out)}`);
}
check("D1", `${SCENARIOS.length} click sequences (Deactivate -> the dialog; the dialog sent; Reactivate; your own account): the same toasts, buttons and stored bytes as the code before`, dBad.length === 0, j(dBad.length ? dBad : dSeen));
check("D3", "...and what they show: Deactivate opens the dialog and stores nothing; the dialog deactivates with the date; Reactivate reactivates; your own account is refused",
  j(dOut[0]) === j(["Deactivate", false, true, true]) && !dStored[0]
  && j(dOut[1]) === j(["Vikram Singh deactivated. Last working day: 20 Nov 2026.", "Reactivate"]) && dStored[1]
  && j(dOut[2]) === j(["Divya Menon reactivated.", "Deactivate"]) && dStored[2]
  && j(dOut[3]) === j(["You can't deactivate your own account."]) && !dStored[3], j(dOut));
// Round 13P (layout, D2; was the live js): 12R's change on js-pre13P (686c99d); 13P adds deleteProblem to the store
// import (delask.mjs X5)
const prof = fs.readFileSync(new URL("./js-pre13P/pages/user-profile.js", import.meta.url), "utf8"), profPre = fs.readFileSync(new URL("./js-pre12R/pages/user-profile.js", import.meta.url), "utf8");
const calls = (s) => (s.match(/deactivateUser\(/g) ?? []).length;
check("D2", "user-profile.js: one deactivateUser( call left, the dialog's (with the date); the store import unchanged",
  calls(profPre) === 2 && calls(prof) === 1 && /deactivateUser\(getCurrentUserId\(\), user\.id, input\.value\)/.test(prof) && !/deactivateUser\(getCurrentUserId\(\), user\.id\)/.test(prof)
  && prof.match(/^import .*store\.js";$/m)?.[0] === profPre.match(/^import .*store\.js";$/m)?.[0], j([calls(profPre), calls(prof)]));

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12S"), jsPre = walk("./js-pre12R");   // Round 12S (layout; was the live js): 12R's own change set (js-pre12S = f34d64e)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12S", p) !== srcAt("./js-pre12R", p));
check("X1", "exactly two js files changed, none added or removed: data/store.js and pages/user-profile.js", j(changedJs) === j(["data/store.js", "pages/user-profile.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12R").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12R", p))
  && walk("./css-pre12R").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12R", p)));
const [st, stPre] = [srcAt("./js-pre12S", "data/store.js"), srcAt("./js-pre12R", "data/store.js")];   // Round 12S (layout; was the live js)
const profX = srcAt("./js-pre12S", "pages/user-profile.js");   // Round 12S (layout; X3 / X4 read 12R's result; D2 keeps the live file)
const crlf = (s) => !s.endsWith("\n") && !/(^|[^\r])\n/.test(s);
const code = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l)).join("\r\n");
const literals = (s) => [...new Set([...code(s).matchAll(/`[^`\r\n]*`|"[^"\r\n]*"/g)].map((m) => m[0]))].sort();
const added = literals(st).filter((x) => !literals(stPre).includes(x));
check("X3", "both files CRLF, no final newline, imports unchanged; store.js's only new string literals are the message and \"on-leave\" (in USER_STATUSES; not shown)",
  [st, stPre, profX, profPre].every(crlf) && j(st.match(/^import .*$/gm)) === j(stPre.match(/^import .*$/gm)) && j(profX.match(/^import .*$/gm)) === j(profPre.match(/^import .*$/gm))
  && j(added) === j([`"${BAD}"`, '"on-leave"']) && literals(profX).filter((x) => !literals(profPre).includes(x)).length === 0, j(added));
// store.js minus the two new lines and the constants block == before; user-profile.js differs in that one line only.
const strip = (s) => s.replace(/\r\n  if \("status" in (rest|changes) && !USER_STATUSES\.includes\(\1\.status\)\) return fail\(BAD_STATUS, "status"\);   \/\/ round 12R/g, "")
  .replace(/\/\/ The statuses a person can have[\s\S]*?const BAD_STATUS = [^\r\n]*\r\n\r\n/, "");
const lineDiff = (a, b) => { const x = a.split("\r\n"), y = b.split("\r\n"); return x.length === y.length ? x.map((l, i) => [l, y[i]]).filter(([p, q]) => p !== q) : null; };
const pd = lineDiff(profX, profPre);
check("X4", "store.js: only the two checks and the constants added; user-profile.js: the one line, from the ternary to reactivateUser alone",
  strip(st) === stPre && (st.match(/USER_STATUSES\.includes/g) ?? []).length === 2
  && pd?.length === 1 && /reactivateUser\(getCurrentUserId\(\), user\.id\);/.test(pd[0][0]) && /deactivating \? deactivateUser/.test(pd[0][1]), j(pd));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
