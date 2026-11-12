// usage: node delheld.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12T: round-12s-notes.md S9, ruling (a). The profile's Delete confirmation names the assets the person still
// holds, in the Deactivate dialog's words (12S): "Delete {name}? … brings them back.\n\nThey still hold AST-0119
// (MacBook Pro 14"). Take it back on Asset assignment." No refusal: deleteUser() and inventory-store.js are untouched,
// the deletion goes as before; someone holding nothing sees the confirmation unchanged. Two edits in user-profile.js:
// R splits 12S's heldNote() into heldText() + heldNote() (no behavior change); D adds heldText() to the confirmation.
// ./js-pre12T, ./html-pre12T and ./css-pre12T are the code, pages and css before this round (office-os 34322e0).
//   G  S9 reproduced: the confirmation said nothing; deleted, the asset left assigned to an id no longer on the list
//   H  holders: the confirmation, word for word; confirmed: the deletion, toast and stored bytes == the code before's
//   Z  holding none: the confirmation exactly the code before's;  K  Cancel: nothing stored
//   F  every refusal path: all ten people, October approved and not, == the code before's (toast, stored bytes); a demo
//      identity and someone paid in an approved run, each holding assets; your own account (no confirmation)
//   N  the Deactivate dialog's note (12S) unchanged by R;  E  no page errors;  X  scope
// Storage seeded Fri 30 Oct 2026 19:00; pages opened 20 Nov 11:00 (October settled on 9 Nov where approved).
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
const AARAV = "EMP-1001", KABIR = "EMP-1008", SNEHA = "EMP-1029", ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null, asked = [], answer = true;
const allJsErrors = [];
async function open(page, query = "", js = "./js") {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${DIR}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = (m) => { asked.push(m); return answer; };
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

const S = await import("./js/data/store.js");
const I = await import("./js/data/inventory-store.js");
const PS = await import("./js/data/payroll-store.js");
const RQ = [await import("./js/data/leave-store.js"), await import("./js/data/attendance-store.js"), await import("./js/data/expenses-store.js"), await import("./js/data/asset-requests-store.js")];
// Round 13H: deleteUser() refuses while the person has anything open (round-13g-scoping.md G3 (a)). The person's own
// requests are settled in storage first (pending -> cancelled; an approved claim -> paid, an approved asset request ->
// closed), so this keeps testing what it did; the refusal itself is delopen.mjs.
const SETTLED = [["leave-requests", { pending: "cancelled" }], ["regularizations", { pending: "cancelled" }],
  ["expense-claims", { pending: "cancelled", approved: "paid" }], ["asset-requests", { pending: "cancelled", approved: "closed" }]];
const settleOwn = (who) => {
  for (const [key, done] of SETTLED) {
    const box = JSON.parse(localStorage.getItem(`officeos:${key}`) ?? "null");
    if (!box) continue;
    box.records.filter((r) => (who === null || r.userId === who) && done[r.status]).forEach((r) => { r.status = done[r.status]; });
    localStorage.setItem(`officeos:${key}`, JSON.stringify(box));
  }
};

function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
const setup = (r, what) => { if (!r?.ok) console.log(`setup (${what}):`, errOf(r)); return r; };
// Seeded; with `approve`, October settled and approved on 9 Nov (as rejoin.mjs does). Then 20 Nov.
function seeded({ approve = false } = {}) {
  mem.clear(); setNow(2026, 10, 30, 19); S.getAllUsers(); I.allAssets(); PS.payrollRun(2026, 10); setNow(2026, 11, 9);
  if (approve) {
    rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
    rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
    S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
    setup(safe(() => PS.prepareRun(KABIR, 2026, 10)), "prepare Oct"); setup(safe(() => PS.approveRun(AARAV, 2026, 10)), "approve Oct");
  }
  // Round 13H (behavior): everyone's open requests settled (the four stores read first, so their seeds are saved), for
  // the build and the code before alike; 12T's deletes go through as they did.
  RQ[0].allRequests(); RQ[1].allRegularizations(); RQ[2].allExpenses(); RQ[3].allAssetRequests(); settleOwn(null);
  setNow(2026, 11, 20);
}
// Round 13J (layout; was every key but the session): a delete now also writes "officeos:deleted-names" (the code before
// 12T doesn't), so the comparison leaves that key out; what a delete stores is delnames.mjs S1.
const all = () => j([...mem.entries()].filter(([k]) => k !== "officeos:session" && k !== "officeos:deleted-names").sort());
const BASE = (name) => `Delete ${name}? They'll be removed from the employee list. Only Reset demo data brings them back.`;
const MAC = 'AST-0119 (MacBook Pro 14")';
const nameOf = (tag) => { const a = I.getAsset(tag); return I.allItems().find((i) => i.sku === a.sku)?.name; };

// The profile's Delete clicked as Aarav, the confirmation answered `yes`: what it asked, the toast, stored bytes.
const delBtn = () => [...d.querySelectorAll(".page-header__actions button")].find((b) => txt(b) === "Delete");
const toast = () => txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text")) || null;
async function del(id, { js = "./js", yes = true, before = () => {}, approve = false, who = ["admin", "Aarav Mehta", AARAV] } = {}) {
  seeded({ approve }); before();
  setSession(...who); await open("users/user-profile", `?id=${id}`, js);
  asked = []; answer = yes;
  delBtn()?.click();
  return { asked: [...asked], toast: toast(), onList: Boolean(S.getUser(id)), store: all() };
}
const same = (a, b) => a.toast === b.toast && a.store === b.store && a.onList === b.onList;

// =================================================================
section("G. S9, reproduced");
const g = await del(ROHAN, { js: "./js-pre12T" });
check("G1", "the code before: Rohan's confirmation said only that he'd be removed; confirmed, he was deleted",
  j(g.asked) === j([BASE("Rohan Gupta")]) && g.toast === "Rohan Gupta deleted." && !g.onList, j(g.asked));
check("G2", "...and AST-0119 stayed assigned to an id no longer on the list (assetsHeldByInactive)",
  I.allAssets().find((a) => a.id === "AST-0119")?.holderId === ROHAN && I.assetsHeldByInactive().some((a) => a.id === "AST-0119"));

// =================================================================
section("H. Holders");
const h1 = await del(ROHAN), h1p = await del(ROHAN, { js: "./js-pre12T" });
check("H1", `Rohan: the confirmation's sentence, a blank line, then "They still hold ${MAC}. Take it back on Asset assignment."`,
  j(h1.asked) === j([`${BASE("Rohan Gupta")}\n\nThey still hold ${MAC}. Take it back on Asset assignment.`]), j(h1.asked));
check("H2", "confirmed: deleted, the same toast and stored bytes (every key) as the code before", same(h1, h1p) && !h1.onList && h1.toast === "Rohan Gupta deleted.", j([h1.toast, h1.store === h1p.store]));
const give = () => setup(I.assignAsset(AARAV, "AST-0218", { holderId: ROHAN, date: "2026-11-19" }), "AST-0218 to Rohan");
const h3 = await del(ROHAN, { before: give }), h3p = await del(ROHAN, { before: give, js: "./js-pre12T" });
seeded(); give();
check("H3", "two assets: both by tag, \"Take them back\"; confirmed: == the code before's",
  j(h3.asked) === j([`${BASE("Rohan Gupta")}\n\nThey still hold ${MAC}, AST-0218 (${nameOf("AST-0218")}). Take them back on Asset assignment.`]) && same(h3, h3p), j(h3.asked));
const h4 = await del(SNEHA), h4p = await del(SNEHA, { js: "./js-pre12T" });
seeded();
check("H4", "Sneha (AST-0217): named; confirmed: == the code before's",
  j(h4.asked) === j([`${BASE("Sneha Rao")}\n\nThey still hold AST-0217 (${nameOf("AST-0217")}). Take it back on Asset assignment.`]) && same(h4, h4p), j([h4.asked, h4.toast]));

// =================================================================
section("Z / K. Holding none; Cancel");
const z = await del(VIKRAM), zp = await del(VIKRAM, { js: "./js-pre12T" });
check("Z1", "Vikram (holding nothing): the confirmation exactly the code before's; confirmed: == the code before's",
  j(z.asked) === j(zp.asked) && j(z.asked) === j([BASE("Vikram Singh")]) && same(z, zp), j(z.asked));
const k = await del(ROHAN, { yes: false }), kp = await del(ROHAN, { yes: false, js: "./js-pre12T" });
check("K1", "Rohan, Cancel: asked once (with the note), nothing deleted, no toast, the same stored bytes as the code before",
  k.asked.length === 1 && /They still hold/.test(k.asked[0]) && k.onList && k.toast === null && same(k, kp), j([k.onList, k.toast]));

// =================================================================
section("F. The refusals, as before");
const fBad = [], fSeen = new Set();
for (const approve of [false, true]) {
  seeded({ approve });
  for (const u of S.getAllUsers()) {
    const a = await del(u.id, { approve }), b = await del(u.id, { approve, js: "./js-pre12T" });
    fSeen.add(a.toast);
    const heldNow = (seeded({ approve }), I.assetsFor(u.id).length);
    // Round 13P (behaviour; G4.3, round-13o-scoping.md O2 (b)): someone the store refuses (still listed after OK) is
    // asked nothing now, the refusal coming at once (your own account wasn't asked before either); everyone deleted is
    // asked as before
    const askedOk = a.onList ? a.asked.length === 0
      : a.asked.length === b.asked.length && a.asked.every((m, i) => m === b.asked[i] || (heldNow && m.startsWith(`${b.asked[i]}\n\nThey still hold `)));
    if (!same(a, b) || !askedOk) fBad.push(`${u.id}${approve ? " (Oct approved)" : ""}: ${j([a.toast, b.toast, a.asked, b.asked])}`);
  }
}
check("F1", "all ten people, October approved and not: toasts, list and stored bytes == the code before's; each confirmation == before's, plus the note for a holder; someone refused isn't asked at all (13P)",
  fBad.length === 0, j(fBad.length ? fBad.slice(0, 2) : [...fSeen]));
const f2 = await del(ARJUN), f2p = await del(ARJUN, { js: "./js-pre12T" });
seeded(); const arjun = I.assetsFor(ARJUN).sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true })).map((a) => `${a.id} (${nameOf(a.id)})`).join(", ");
// Round 13P (behaviour; G4.3): refused at once, so there's no confirmation to name his assets in
check("F2", "Arjun (a demo identity, three assets): the store's refusal at once, no confirmation (13P), still on the list",
  arjun.split(", ").length === 3 && j(f2.asked) === "[]" && f2.toast === "EMP-1105 is a demo sign-in identity and can't be deleted." && f2.onList && same(f2, f2p), j([f2.asked, f2.toast]));
const f3 = await del(ROHAN, { approve: true }), f3p = await del(ROHAN, { approve: true, js: "./js-pre12T" });
// Round 13P (behaviour; G4.3): refused at once, no confirmation (it named AST-0119)
check("F3", "Rohan, October approved (paid in it): \"…paid in an approved payroll run (October 2026)…\" as before, at once, no confirmation (13P), still on the list",
  f3.asked.length === 0 && /is paid in an approved payroll run \(October 2026\), so they can't be deleted/.test(f3.toast ?? "") && f3.onList && same(f3, f3p), j([f3.toast]));
const f4 = await del(AARAV), f4p = await del(AARAV, { js: "./js-pre12T" });
check("F4", "Aarav's own profile: refused before any confirmation, as before", f4.asked.length === 0 && f4.toast === "You can't delete your own account." && same(f4, f4p), j([f4.asked, f4.toast]));

// =================================================================
section("N. The Deactivate dialog (12S) unchanged");
const nBad = [];
for (const id of [ROHAN, VIKRAM, ARJUN, SNEHA]) {
  const notes = [];
  for (const js of ["./js", "./js-pre12T"]) {
    seeded(); setSession("admin", "Aarav Mehta", AARAV); await open("users/user-profile", `?id=${id}`, js);
    [...d.querySelectorAll(".page-header__actions button")].find((b) => txt(b) === "Deactivate")?.click();
    const n = d.getElementById("deactivate-modal-assets");
    notes.push(j([n ? txt(n) : null, n?.className ?? null, txt(d.getElementById("deactivate-modal")?.querySelector(".modal__body"))]));
  }
  if (notes[0] !== notes[1]) nBad.push(`${id}: ${notes.join(" vs ")}`);
}
check("N1", "Rohan, Vikram, Arjun and Sneha: the Deactivate dialog's note, class and body exactly the code before's (R changes nothing there)", nBad.length === 0, j(nBad));

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12U"), jsPre = walk("./js-pre12T");   // Round 12U (layout; was the live js): 12T's own change set (js-pre12U = 8e1663d)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12U", p) !== srcAt("./js-pre12T", p));
check("X1", "exactly one js file changed, none added or removed: pages/user-profile.js (store.js with deleteUser(), and inventory-store.js, untouched)", j(changedJs) === j(["pages/user-profile.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12T").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12T", p))
  && walk("./css-pre12T").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12T", p)));
const [prof, profPre] = [srcAt("./js-pre12U", "pages/user-profile.js"), srcAt("./js-pre12T", "pages/user-profile.js")];   // Round 12U (layout; was the live js)
const crlf = (s) => !s.endsWith("\n") && !/(^|[^\r])\n/.test(s);
const code = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l)).join("\r\n");
const literals = (s) => [...new Set([...code(s).matchAll(/`[^`\r\n]*`|"[^"\r\n]*"/g)].map((m) => m[0]))].sort();
const added = literals(prof).filter((x) => !literals(profPre).includes(x)), gone = literals(profPre).filter((x) => !literals(prof).includes(x));
check("X3", "CRLF, no final newline, imports unchanged; the confirmation's template the only literal changed (the note's own words move, unchanged)",
  crlf(prof) && j(prof.match(/^import .*$/gm)) === j(profPre.match(/^import .*$/gm))
  && j(gone) === j(["`Delete ${user.name}? They'll be removed from the employee list. Only Reset demo data brings them back.`"])
  // (the new template nests one, `\n\n${held}`, so the one-line extractor sees it as these two pieces)
  && j(added) === j(["` : \"\"}`", "`Delete ${user.name}? They'll be removed from the employee list. Only Reset demo data brings them back.${held ? `"]), j([added, gone]));
// user-profile.js with this round's block (heldText + heldNote) put back as 12S had it and the two Delete lines as
// before == the code before, byte for byte.
const fn = (s, name) => { const a = s.indexOf(`function ${name}(`); return a < 0 ? "" : s.slice(a, s.indexOf("\n}", a) + 2); };
const blockNow = prof.slice(prof.indexOf("// The equipment they still hold, in words"), prof.indexOf("\n}", prof.indexOf("function heldNote(")) + 2);
const blockPre = profPre.slice(profPre.indexOf("// The equipment they still hold, as the Deactivate dialog"), profPre.indexOf("\n}", profPre.indexOf("function heldNote(")) + 2);
const back = prof.replace(blockNow, blockPre)
  .replace("  const held = heldText();   // round 12T: what they still hold, in the Deactivate dialog's words\r\n", "")
  .replace("Only Reset demo data brings them back.${held ? `\\n\\n${held}` : \"\"}`", "Only Reset demo data brings them back.`");
check("X4", "only the held-assets block (heldText() + heldNote()) and the Delete handler's two lines changed: the rest byte for byte",
  blockNow.length > 400 && blockPre.length > 400 && back === profPre && fn(prof, "deactivateDialog") === fn(profPre, "deactivateDialog"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
