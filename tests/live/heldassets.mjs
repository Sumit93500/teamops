// usage: node heldassets.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12S: round-12r-notes.md R11.3 ruling (a) and R7.3, approved. Two separate edits in user-profile.js:
//   A  the Deactivate dialog notes the assets the person still holds when it opens: "They still hold AST-0119 (MacBook
//      Pro 14"). Take it back on Asset assignment." Display only: the deactivation goes through as before, nothing is
//      returned from the dialog, inventory-store.js is untouched. Nothing shown for someone holding none.
//   W  (R7.3) the Reactivate toast reads `${user.name} reactivated.` (its "deactivated" arm was unreachable).
// ./js-pre12S, ./html-pre12S and ./css-pre12S are the code, pages and css before this round (office-os f34d64e).
//   G  R11.3 reproduced: the dialog said nothing of Rohan's MacBook; deactivated, he still held it
//   H  holders: the note (one, several, Sneha's); the deactivation, the toast, the asset records == the code before's
//   Z  holding none: no note, the dialog's body == the code before's
//   C  the note is read when the dialog opens; Cancel and reopen; the date error; a demo identity (Arjun, three assets)
//   I  inventory untouched: assignAsset still refuses an inactive holder; Asset assignment's own alert as before
//   R  R7.3: Reactivate's toast == the code before's; the dead arm gone
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
const AARAV = "EMP-1001", SNEHA = "EMP-1029", ROHAN = "EMP-1042", DIVYA = "EMP-1061", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

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

const S = await import("./js/data/store.js");
const I = await import("./js/data/inventory-store.js");
const OLDI = await import("./js-pre12S/data/inventory-store.js");

const seeded = () => { mem.clear(); setNow(2026, 10, 30, 19); S.getAllUsers(); I.allAssets(); setNow(2026, 11, 20); };
seeded();
const snap = new Map(mem);
const restore = () => { mem.clear(); for (const [k, v] of snap) mem.set(k, v); setNow(2026, 11, 20); };
const all = () => j([...mem.entries()].filter(([k]) => k !== "officeos:session").sort());

// The profile's Deactivate, clicked: what the dialog shows. `act` then: "send" (the dialog sent with `date`), "cancel"
// or nothing. Returns the note, the body's text, the toast and the stored bytes afterwards.
const btn = () => [...d.querySelectorAll(".page-header__actions button")].find((b) => /activate/i.test(txt(b)));
const toast = () => txt([...d.querySelectorAll(".toast")].at(-1)?.querySelector(".toast__text"));
async function dialog(id, { js = "./js", act = null, date = "2026-11-20", before = () => {} } = {}) {
  restore(); before();
  setSession("admin", "Aarav Mehta", AARAV); await open("users/user-profile", `?id=${id}`, js);
  btn()?.click();
  const modal = d.getElementById("deactivate-modal");
  const noteEl = d.getElementById("deactivate-modal-assets");
  const out = { open: Boolean(modal?.classList.contains("is-open")), note: noteEl ? txt(noteEl) : null, noteClass: noteEl?.className ?? null,
    afterField: noteEl ? noteEl.previousElementSibling?.classList.contains("form-field") && noteEl.parentElement?.classList.contains("modal__body") : null,
    body: txt(modal?.querySelector(".modal__body")) };
  if (act === "send") {
    d.getElementById("deactivate-date").value = date;
    modal.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
    out.error = txt(d.getElementById("deactivate-date-error")) || null;
    out.stillOpen = Boolean(d.getElementById("deactivate-modal"));
  } else if (act === "cancel") {
    [...modal.querySelectorAll("button")].find((b) => txt(b) === "Cancel")?.click();
    out.stillOpen = Boolean(d.getElementById("deactivate-modal"));
  }
  out.toast = toast() || null;
  out.store = all();
  return out;
}
const sameAsBefore = (a, b) => a.toast === b.toast && a.store === b.store && (a.error ?? null) === (b.error ?? null);
const MAC = 'AST-0119 (MacBook Pro 14")';
const nameOf = (tag) => { const a = I.getAsset(tag); return I.allItems().find((i) => i.sku === a.sku)?.name; };

// =================================================================
section("G. R11.3, reproduced");
const g = [await dialog(ROHAN, { js: "./js-pre12S", act: "send" }), await dialog(ROHAN, { act: "send" })];
check("G1", "the code before: Rohan's dialog said only \"Last working day\"; sent, he was deactivated still holding AST-0119",
  g[0].open && g[0].note === null && g[0].body === "Last working day" && g[0].toast === "Rohan Gupta deactivated. Last working day: 20 Nov 2026.", j([g[0].body, g[0].toast]));
check("G2", "...AST-0119 assigned to Rohan before, and after his deactivation it's in Asset assignment's list of assets held by inactive people", (() => {
  restore(); const before = I.assetsFor(ROHAN).map((a) => a.id); S.deactivateUser("EMP-1003", ROHAN, "2026-11-20");
  return j(before) === j(["AST-0119"]) && I.assetsHeldByInactive().some((a) => a.id === "AST-0119");
})());

// =================================================================
section("H. Holders");
const h1 = g[1];
check("H1", `Rohan's dialog: "They still hold ${MAC}. Take it back on Asset assignment.", a warning alert after the date field`,
  h1.open && h1.note === `They still hold ${MAC}. Take it back on Asset assignment.` && h1.noteClass === "alert alert--warning mt-4" && h1.afterField === true, j([h1.note, h1.noteClass, h1.afterField]));
check("H2", "sent with 20 Nov: the same toast and the same stored bytes (users, assets, everything) as the code before", sameAsBefore(h1, g[0]) && h1.toast === "Rohan Gupta deactivated. Last working day: 20 Nov 2026.", j([h1.toast, h1.store === g[0].store]));
restore();
const give = () => setup(I.assignAsset(AARAV, "AST-0218", { holderId: ROHAN, date: "2026-11-19" }), "AST-0218 to Rohan");
function setup(r, what) { if (!r?.ok) console.log(`setup (${what}):`, errOf(r)); return r; }
const h3 = await dialog(ROHAN, { before: give, act: "send" }), h3p = await dialog(ROHAN, { before: give, act: "send", js: "./js-pre12S" });
restore(); give();
const tag218 = `AST-0218 (${nameOf("AST-0218")})`;
check("H3", `two assets (AST-0218 given him 19 Nov): both, by tag, "Take them back"`, h3.note === `They still hold ${MAC}, ${tag218}. Take them back on Asset assignment.`, h3.note);
check("H4", "...and sent: == the code before's toast and stored bytes", sameAsBefore(h3, h3p), j([h3.toast, h3p.toast]));
const h5 = await dialog(SNEHA, { act: "send" }), h5p = await dialog(SNEHA, { act: "send", js: "./js-pre12S" });
restore();
check("H5", `Sneha: "They still hold AST-0217 (${nameOf("AST-0217")}). Take it back on Asset assignment."; sent: == the code before's`,
  h5.note === `They still hold AST-0217 (${nameOf("AST-0217")}). Take it back on Asset assignment.` && sameAsBefore(h5, h5p), j([h5.note, h5.toast]));

// =================================================================
section("Z. Holding none");
const z = await dialog(VIKRAM, { act: "send" }), zp = await dialog(VIKRAM, { act: "send", js: "./js-pre12S" });
const z0 = await dialog(VIKRAM), z0p = await dialog(VIKRAM, { js: "./js-pre12S" });
check("Z1", "Vikram holds nothing: no note; the dialog's body exactly the code before's (\"Last working day\")", z0.note === null && z0.body === z0p.body && z0.body === "Last working day", j([z0.body, z0p.body]));
check("Z2", "...sent: the same toast and stored bytes as the code before", sameAsBefore(z, zp), j(z.toast));

// =================================================================
section("C. When it's read; Cancel; the date error; a demo identity");
const c1 = await dialog(ROHAN, { before: () => setup(I.returnAsset(AARAV, "AST-0119", { location: "store-a", condition: "good" }), "AST-0119 back") });
check("C1", "AST-0119 taken back before the dialog opens: no note (it's read when the dialog opens)", c1.note === null && c1.open, j(c1.note));
// What opening the profile and its dialog stores by itself (the page's own reads seed other stores): "nothing stored" means no change from this.
const OPENED = (await dialog(ROHAN)).store;
const c2 = await dialog(ROHAN, { act: "cancel" });
check("C2", "Cancel: the dialog closes, nothing stored, no toast", c2.note !== null && !c2.stillOpen && c2.store === OPENED && c2.toast === null, j([c2.stillOpen, c2.toast, c2.store === OPENED]));
restore(); setSession("admin", "Aarav Mehta", AARAV); await open("users/user-profile", `?id=${ROHAN}`);
btn()?.click(); [...d.getElementById("deactivate-modal").querySelectorAll("button")].find((b) => txt(b) === "Cancel")?.click(); btn()?.click();
check("C3", "Cancel, then Deactivate again: one dialog, one note", d.querySelectorAll("#deactivate-modal").length === 1 && d.querySelectorAll("#deactivate-modal-assets").length === 1);
const c4 = await dialog(ROHAN, { act: "send", date: "2026-11-25" }), c4p = await dialog(ROHAN, { act: "send", date: "2026-11-25", js: "./js-pre12S" });
check("C4", "a date later than today: the error under the date as before, the dialog stays open with the note, nothing stored",
  c4.error === "The last working day can't be later than today (20 Nov 2026)." && c4.stillOpen && c4.note !== null && sameAsBefore(c4, c4p) && c4.store === OPENED,
  j([c4.error, c4.stillOpen]));
const c5 = await dialog(ARJUN, { act: "send" }), c5p = await dialog(ARJUN, { act: "send", js: "./js-pre12S" });
const arjun = I.assetsFor(ARJUN).sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true })).map((a) => `${a.id} (${nameOf(a.id)})`).join(", ");
check("C5", "Arjun (a demo sign-in identity) holds three: listed by tag; sent: the store's refusal as before, nothing stored",
  c5.note === `They still hold ${arjun}. Take them back on Asset assignment.` && sameAsBefore(c5, c5p) && /demo sign-in identity/.test(c5.toast ?? ""), j([c5.note, c5.toast]));

// =================================================================
section("I. The inventory is untouched");
restore(); S.deactivateUser("EMP-1003", ROHAN, "2026-11-20");
const i1 = [errOf(safe(() => I.assignAsset(AARAV, "AST-0218", { holderId: ROHAN }))), errOf(safe(() => OLDI.assignAsset(AARAV, "AST-0218", { holderId: ROHAN })))];
check("I1", "assignAsset still refuses an inactive holder, word for word as before", i1[0] === "Rohan Gupta is inactive and can't be given an asset." && i1[0] === i1[1], j(i1));
restore(); S.deactivateUser("EMP-1003", ROHAN, "2026-11-20");
setSession("admin", "Aarav Mehta", AARAV); await open("inventory/asset-assignment"); const aNow = txt(d.getElementById("inactive-alert"));
await open("inventory/asset-assignment", "", "./js-pre12S"); const aPre = txt(d.getElementById("inactive-alert"));
check("I2", "Asset assignment's alert for assets held by inactive people: the same as before (AST-0119, Rohan)", aNow === aPre && /AST-0119 \(Rohan Gupta\)/.test(aNow), aNow);

// =================================================================
section("R. R7.3: the Reactivate toast");
async function reactivate(js) { restore(); setSession("admin", "Aarav Mehta", AARAV); await open("users/user-profile", `?id=${DIVYA}`, js); btn()?.click(); return { toast: toast(), store: all(), button: txt(btn()) }; }
const r1 = await reactivate("./js"), r1p = await reactivate("./js-pre12S");
check("R1", "Divya's Reactivate: \"Divya Menon reactivated.\", the button Deactivate; toast and stored bytes == the code before's",
  r1.toast === "Divya Menon reactivated." && r1.button === "Deactivate" && r1.toast === r1p.toast && r1.store === r1p.store, j([r1.toast, r1p.toast]));
const prof = fs.readFileSync(new URL("./js/pages/user-profile.js", import.meta.url), "utf8"), profPre = fs.readFileSync(new URL("./js-pre12S/pages/user-profile.js", import.meta.url), "utf8");
check("R2", "the toast's template: `${user.name} reactivated.`; no `deactivating ? \"deactivated\"` left; the Deactivate toast untouched",
  prof.includes('showToast(`${user.name} reactivated.`, "success");') && !prof.includes('deactivating ? "deactivated"') && profPre.includes('deactivating ? "deactivated"')
  && prof.includes("showToast(`${user.name} deactivated. Last working day: ${formatDay(leavingDate(user), true)}.`, \"success\");"));

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const HERE = new URL(".", import.meta.url);
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const jsNow = walk("./js-pre12T"), jsPre = walk("./js-pre12S");   // Round 12T (layout; was the live js): 12S's own change set (js-pre12T = 34322e0)
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre12T", p) !== srcAt("./js-pre12S", p));
const profX = srcAt("./js-pre12T", "pages/user-profile.js");   // Round 12T (layout; X3 / X4 read 12S's result; R2 keeps the live file)
check("X1", "exactly one js file changed, none added or removed: pages/user-profile.js (inventory-store.js and store.js untouched)", j(changedJs) === j(["pages/user-profile.js"]) && j(jsNow) === j(jsPre), j(changedJs));
// Round 12W (layout; was the live pages' text, in X2 below): this round's own page claim, read from its frozen result
// (html-pre12W = HEAD 34dd4ed); the live salary-structure.html has 12W's alert sentence since (saledit.mjs X2). The list is frozen too since 14A.
const pagesNow = walk("./html-pre14A").filter((f) => f.endsWith(".html"));   // Round 14A (layout; was the live list): 9c7423e's; pages added or removed: pagefreeze.mjs F2, F3
check("X2", "no page and no css changed", j(pagesNow) === j(walk("./html-pre12S").filter((p) => p.endsWith(".html"))) && pagesNow.every((p) => srcAt("./html-pre12W", p) === srcAt("./html-pre12S", p))
  && walk("./css-pre12S").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12S", p)));
const crlf = (s) => !s.endsWith("\n") && !/(^|[^\r])\n/.test(s);
const code = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l)).join("\r\n");
const literals = (s) => [...new Set([...code(s).matchAll(/`[^`\r\n]*`|"[^"\r\n]*"/g)].map((m) => m[0]))].sort();
const added = literals(profX).filter((x) => !literals(profPre).includes(x)), gone = literals(profPre).filter((x) => !literals(profX).includes(x));
check("X3", "CRLF, no final newline, imports unchanged; new literals: the note and its parts, the alert class, the toast; gone: the old toast",
  crlf(profX) && j(profX.match(/^import .*$/gm)) === j(profPre.match(/^import .*$/gm))
  && j(added) === j(['"alert alert--warning mt-4"', '`${DEACTIVATE_ID}-assets`', '`${a.id} (${names.get(a.sku) ?? a.sku})`', '`${user.name} reactivated.`', '`They still hold ${list}. Take ${held.length === 1 ? "it" : "them"} back on Asset assignment.`'].sort())
  && j(gone) === j(['`${user.name} ${deactivating ? "deactivated" : "reactivated"}.`']), j([added, gone]));
// user-profile.js minus heldNote() (and its comment), the dialog's two new lines, with the old toast line == before.
const strip = (s) => s.replace(/\/\/ The equipment they still hold[\s\S]*?\r\n}\r\n\r\n(?=function deactivateDialog)/, "")
  .replace("\r\n  const held = heldNote();\r\n  if (held) body.append(held);", "")
  .replace('showToast(`${user.name} reactivated.`, "success");', 'showToast(`${user.name} ${deactivating ? "deactivated" : "reactivated"}.`, "success");');
check("X4", "only heldNote() added, the two lines in deactivateDialog(), and the toast line: the rest of user-profile.js byte for byte",
  profX !== profPre && strip(profX) === profPre && profX.includes("function heldNote()"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
