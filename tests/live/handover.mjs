// usage: node handover.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 10F: an asset's hand-over date can't be before the day it last came back to the store (10E, E5: assignAsset
// had no lower bound, so a new holder's `since` could reach back into an earlier holder's time). ./js-pre10F,
// ./html-pre10F and ./css-pre10F are the code, pages and css before this round (office-os ef1ee4a).
// A movable clock: it starts at Wed 30 Sep 2026 13:00 local; at() moves it, so an asset can come back on an earlier day.
//   A  assignAsset: the floor (the last history entry's local day), its message, the boundary, assets with no history
//   Z  the floor's calendar: the local day, the one max = today uses, in every zone (office time isn't)
//   F  fulfilAssetRequest passes the refusal on, at the date field
//   J  the joining date is NOT a floor (decision pins: a pre-joiner can be handed equipment)
//   P  asset-assignment.html: the date input's min follows the chosen asset; the store's refusal at the date field
//   X  scope: exactly inventory-store.js and asset-assignment.js, only 10F's lines
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const ASSIGN = "inventory/asset-assignment.html";

const RealDate = Date;
let NOW = new RealDate(2026, 8, 30, 13, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const at = (day, hour = 13, minute = 0) => { NOW = new RealDate(2026, 8, day, hour, minute, 0).getTime(); };   // a day in September 2026, local
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const AARAV = "EMP-1001", SNEHA = "EMP-1029", ROHAN = "EMP-1042", ARJUN = "EMP-1105";
const WHO = { aarav: ["admin", "Aarav Mehta", AARAV] };

let loads = 0, w = null, d = null, saved = {}, jsErrors = [];
async function open(page, who) {
  const cur = globalThis.localStorage;   // the in-memory one before the first page, then the last page's
  saved = Object.fromEntries(Array.from({ length: cur.length }, (_, i) => cur.key(i)).map((k) => [k, cur.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = [];
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) jsErrors.push(e.message); });
  const dom = new JSDOM(fs.readFileSync(`${DIR}/${page}`, "utf8"), { url: `http://localhost/office-os/pages/${page}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.HTMLAnchorElement.prototype.click = function () {};
  w.HTMLElement.prototype.scrollIntoView = function () {};
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  const auth = await import("./js/core/auth.js");
  auth.signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/asset-assignment.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
// The store modules read localStorage through the global; before any page is open, an in-memory one stands in.
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
function fresh() { globalThis.localStorage.clear(); if (w) w.localStorage.clear(); saved = {}; at(30); }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const res = (r) => (r.ok ? [true] : [false, r.error, r.field ?? null]);

const I = await import("./js/data/inventory-store.js");
const R = await import("./js/data/asset-requests-store.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
// Read through a guard, so a run against code without it fails its checks rather than crashing (9Z).
const floorOf = (asset) => (typeof I.earliestHandOver === "function" ? I.earliestHandOver(asset) : "(no earliestHandOver)");
const floorMsg = (day, tag) => `The date can't be before ${day}, when ${tag} came back to the store.`;
const RET = { condition: "good", location: "store-a" };

// =====================================================================
section("A. assignAsset: the hand-over date can't be before the asset's last history entry");
fresh();
at(20, 10);
const back = I.returnAsset(AARAV, "AST-0217", RET);   // Sneha's since 18 Sep; history: returned 14 Sep, assigned 18 Sep, now returned 20 Sep
at(30);
check("A1", "earliestHandOver: the day of the asset's last history entry (AST-0217, back on 20 Sep); null with no history (AST-0218) or no asset",
  back.ok && floorOf(I.getAsset("AST-0217")) === "2026-09-20" && floorOf(I.getAsset("AST-0218")) === null && floorOf(null) === null,
  j([floorOf(I.getAsset("AST-0217")), floorOf(I.getAsset("AST-0218"))]));
const moves = I.allMovements().length, stock = I.stockOf("IT-1021");
check("A2", "a day before it came back: refused at the date field, naming the day; nothing assigned or moved",
  j(res(I.assignAsset(AARAV, "AST-0217", { holderId: ROHAN, date: "2026-09-19" }))) === j([false, floorMsg("2026-09-20", "AST-0217"), "date"])
  && I.getAsset("AST-0217").status === "available" && I.allMovements().length === moves && I.stockOf("IT-1021") === stock);
check("A3", "the LAST entry counts, not the first: 15 Sep (after its 14 Sep return, before the 20 Sep one) is refused too",
  j(res(I.assignAsset(AARAV, "AST-0217", { holderId: ROHAN, date: "2026-09-15" }))) === j([false, floorMsg("2026-09-20", "AST-0217"), "date"]));
const onFloor = I.assignAsset(AARAV, "AST-0217", { holderId: ROHAN, date: "2026-09-20" });
check("A4", "the floor day itself is fine (the boundary): since 20 Sep", onFloor.ok && I.getAsset("AST-0217").since === "2026-09-20", j(res(onFloor)));
fresh();
at(20, 10); I.returnAsset(AARAV, "AST-0217", RET); at(30);
const past = I.assignAsset(AARAV, "AST-0217", { holderId: ROHAN, date: "2026-09-25" });
check("A5", "a past date after the floor still works, and is the one kept: since 25 Sep", past.ok && I.getAsset("AST-0217").since === "2026-09-25", j(res(past)));
fresh();
I.returnAsset(AARAV, "AST-0217", RET);   // today, 30 Sep: 10E's probe
check("A6", "10E's case: taken back today, then handed over dated 1 Jan 2015, or yesterday: both refused, naming today",
  j(res(I.assignAsset(AARAV, "AST-0217", { holderId: ARJUN, date: "2015-01-01" }))) === j([false, floorMsg("2026-09-30", "AST-0217"), "date"])
  && j(res(I.assignAsset(AARAV, "AST-0217", { holderId: ARJUN, date: "2026-09-29" }))) === j([false, floorMsg("2026-09-30", "AST-0217"), "date"]));
check("A7", "…dated today it's fine; so is no date (today)", I.assignAsset(AARAV, "AST-0217", { holderId: ARJUN, date: "2026-09-30" }).ok && I.getAsset("AST-0217").since === "2026-09-30");
fresh();
I.returnAsset(AARAV, "AST-0217", RET);
check("A8", "…no date: today, fine", I.assignAsset(AARAV, "AST-0217", { holderId: ARJUN }).ok && I.getAsset("AST-0217").since === "2026-09-30");
fresh();
I.returnAsset(AARAV, "AST-0217", RET);
check("A9", "the earlier checks still come first: a future date, an impossible one",
  j(res(I.assignAsset(AARAV, "AST-0217", { holderId: ARJUN, date: "2026-10-01" }))) === j([false, "The date can't be in the future.", "date"])
  && j(res(I.assignAsset(AARAV, "AST-0217", { holderId: ARJUN, date: "2026-02-30" }))) === j([false, "Pick a valid date.", "date"]));
fresh();
check("A10", "unchanged: an asset with no history (AST-0218, tagged before the register was kept) has no floor: 1 Jan 2020 is kept",
  I.assignAsset(AARAV, "AST-0218", { holderId: ROHAN, date: "2020-01-01" }).ok && I.getAsset("AST-0218").since === "2020-01-01");
fresh();
at(25, 9); const repaired = I.returnFromRepair(AARAV, "AST-0099", RET); at(30);   // in repair since 8 Sep
check("A11", "back from repair counts the same: AST-0099 back on 25 Sep, so 24 Sep is refused (naming 25 Sep) and 25 Sep is fine",
  repaired.ok && floorOf(I.getAsset("AST-0099")) === "2026-09-25"
  && j(res(I.assignAsset(AARAV, "AST-0099", { holderId: ROHAN, date: "2026-09-24" }))) === j([false, floorMsg("2026-09-25", "AST-0099"), "date"])
  && I.assignAsset(AARAV, "AST-0099", { holderId: ROHAN, date: "2026-09-25" }).ok);

// =====================================================================
section("Z. The floor's calendar: the local day, as max = today");
fresh();
at(30, 23, 30);   // 30 Sep 23:30 local: already 1 Oct in office time (UTC+05:30) in UTC and Los Angeles
I.returnAsset(AARAV, "AST-0217", RET);
const zFloor = floorOf(I.getAsset("AST-0217"));
const zToday = I.assignAsset(AARAV, "AST-0217", { holderId: ROHAN, date: "2026-09-30" });
check("Z1", `taken back at 23:30 local on 30 Sep: the floor is 30 Sep (the local day) in every zone, so it can go out again dated today (TZ=${process.env.TZ ?? "system"})`,
  zFloor === "2026-09-30" && zToday.ok && I.getAsset("AST-0217").since === "2026-09-30", j([zFloor, res(zToday)]));
at(30);

// =====================================================================
section("F. fulfilAssetRequest passes the refusal on");
fresh();
R.decideAssetRequest("ARQ-1", SNEHA, "emp", "approve");
R.decideAssetRequest("ARQ-1", AARAV, "admin", "approve");   // Arjun's laptop request, now approved
I.returnAsset(AARAV, "AST-0217", RET);
const fMoves = I.allMovements().length;
check("F1", "fulfilling ARQ-1 with AST-0217 dated before it came back: the same refusal, at the date field; the request stays approved, nothing moved",
  R.getAssetRequest("ARQ-1").status === "approved"
  && j(res(R.fulfilAssetRequest("ARQ-1", AARAV, "AST-0217", { date: "2026-09-29" }))) === j([false, floorMsg("2026-09-30", "AST-0217"), "date"])
  && R.getAssetRequest("ARQ-1").status === "approved" && I.allMovements().length === fMoves);
const ful = R.fulfilAssetRequest("ARQ-1", AARAV, "AST-0217", { date: "2026-09-30" });
check("F2", "…dated on the floor: fulfilled, Arjun's since 30 Sep", ful.ok && ful.record.status === "fulfilled" && I.getAsset("AST-0217").holderId === ARJUN && I.getAsset("AST-0217").since === "2026-09-30", j(res(ful)));

// =====================================================================
section("J. The joining date is not a floor (decision)");
fresh();
check("J1", "Arjun joined 12 Jan 2023; AST-0218 (no history) dated 1 Jun 2022 is still kept: the joining date isn't checked",
  S.joiningDate(S.getUser(ARJUN).dateOfJoining) === "2023-01-12" && I.assignAsset(AARAV, "AST-0218", { holderId: ARJUN, date: "2022-06-01" }).ok && I.getAsset("AST-0218").since === "2022-06-01");
fresh();
const joiner = S.addUser(USER_ACTOR("admin", null), { name: "Isha Verma", email: "isha.verma@northwind.com", department: "ENG", designation: "Software Engineer", dateOfJoining: "15 Oct 2026" });
check("J2", "someone joining on 15 Oct can be handed a laptop today, before their first day (a joining-date floor would refuse it)",
  joiner.ok && S.joiningDate(joiner.record.dateOfJoining) === "2026-10-15" && I.assignAsset(AARAV, "AST-0218", { holderId: joiner.record.id }).ok && I.getAsset("AST-0218").since === "2026-09-30",
  j(res(joiner)));

// =====================================================================
section("P. asset-assignment.html: the date input's min follows the chosen asset");
fresh();
at(20, 10); I.returnAsset(AARAV, "AST-0217", RET); at(30);
await open(ASSIGN, "aarav");
const $ = (id) => d.getElementById(id);
const choose = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event("change", { bubbles: true })); };
const errorAt = (id) => txt($(id).closest(".form-field").querySelector(".form-error"));
const submit = (formId) => { d.querySelectorAll(".toast").forEach((t) => t.remove()); $(formId).querySelector('[type="submit"]').click(); };
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => txt(t.querySelector(".toast__text")));
const rowOf = (tag) => [...$("asset-rows").children].find((tr) => tr.dataset.tag === tag);
const btn = (node, label) => [...node.querySelectorAll("button")].find((b) => txt(b) === label);
const minOf = () => ($("a-date").hasAttribute("min") ? $("a-date").min : null);
check("P1", "no JS errors; before an asset is chosen: max = today, no min", jsErrors.length === 0 && $("a-date").max === "2026-09-30" && minOf() === null, jsErrors.join(" | ") || j(minOf()));
choose("a-asset", "AST-0217");
check("P2", "choosing AST-0217 (back on 20 Sep): min = 2026-09-20, max still today", minOf() === "2026-09-20" && $("a-date").max === "2026-09-30", j(minOf()));
choose("a-asset", "AST-0218");
check("P3", "then AST-0218 (no history): no min again", minOf() === null, j(minOf()));
choose("a-asset", "");
btn(rowOf("AST-0217"), "Assign").click();
check("P4", "a row's Assign (AST-0217): the asset chosen, min = 2026-09-20", $("a-asset").value === "AST-0217" && minOf() === "2026-09-20", j([$("a-asset").value, minOf()]));
choose("a-person", ROHAN); $("a-date").value = "2026-09-19";
submit("assign-form");
check("P5", "submitted a day early (typed past the min): the store's refusal at the date field; still available",
  errorAt("a-date") === floorMsg("2026-09-20", "AST-0217") && I.getAsset("AST-0217").status === "available", j(errorAt("a-date")));
$("a-date").value = "2026-09-20";
submit("assign-form");
check("P6", "on the floor: assigned (the toast), since 20 Sep; the form reset, so no min until an asset is chosen",
  toasts().some((t) => t === "AST-0217 assigned to Rohan Gupta.") && I.getAsset("AST-0217").since === "2026-09-20" && minOf() === null, j([toasts(), minOf()]));
fresh();
R.decideAssetRequest("ARQ-1", SNEHA, "emp", "approve");
R.decideAssetRequest("ARQ-1", AARAV, "admin", "approve");
at(22, 10); I.returnAsset(AARAV, "AST-0217", RET); at(30);
await open(ASSIGN, "aarav");
btn(d.querySelector('#asset-request-list [data-request="ARQ-1"]'), "Assign").click();
choose("a-asset", "AST-0217");
check("P7", "fulfilling ARQ-1: choosing AST-0217 (back on 22 Sep) sets min = 2026-09-22", $("a-person").disabled && minOf() === "2026-09-22", j(minOf()));
check("P8", "no JS errors on the way", jsErrors.length === 0, jsErrors.join(" | "));

// =====================================================================
section("X. Scope: exactly 10F's lines");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1)]));
const SRC = (dir, f) => fs.readFileSync(`${HERE}${dir}/${f}`, "utf8");
// Round 10H (layout; was the live js vs js-pre10F, here and in X1 / X3 / X4): 10F's own change set, read from its frozen
// result (js-pre10H = HEAD f777a00); the live js has 10H's lines since (joinguard.mjs X1 / X4)
const changedJs = walk(`${HERE}js-pre10H`).filter((f) => SRC("js-pre10H", f) !== SRC("js-pre10F", f)).sort();
// Round 11B (layout; was the live pages, here and in the check below): this round's own page claim, read from its
// frozen result (html-pre11B = HEAD 97e1e6c); the live pages have 11B's sessions.html banner since (acctpages.mjs X2)
const changedHtml = walk(`${HERE}html-pre11B`).filter((f) => fs.readFileSync(`${HERE}html-pre11B/${f}`, "utf8") !== fs.readFileSync(`${HERE}html-pre10F/${f}`, "utf8"));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const CSS = `${HERE}css-pre13U`;
const changedCss = fs.existsSync(CSS) ? walk(CSS).filter((f) => fs.readFileSync(`${CSS}/${f}`, "utf8") !== SRC("css-pre10F", f)) : [];
const FILES = ["data/inventory-store.js", "pages/asset-assignment.js"];
check("X1", "js changed: exactly data/inventory-store.js and pages/asset-assignment.js; nothing added or removed", j(changedJs) === j(FILES) && j(walk(`${HERE}js-pre10H`).sort()) === j(walk(`${HERE}js-pre10F`).sort()), j(changedJs));
check("X2", "no page and no css changed; nothing added or removed", changedHtml.length === 0 && changedCss.length === 0 && j(walk(`${HERE}html-pre11B`).sort()) === j(walk(`${HERE}html-pre10F`).sort()), j([changedHtml, changedCss]));
check("X3", "the two are CRLF only, with no final newline", changedJs.map((f) => SRC("js-pre10H", f)).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
const count = (s) => s.split("\r\n").reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
const delta = Object.fromEntries(FILES.map((f) => {
  const a = count(SRC("js-pre10F", f)), b = count(SRC("js-pre10H", f));
  const removed = [...a].flatMap(([l, n]) => Array(Math.max(0, n - (b.get(l) ?? 0))).fill(l)).sort();
  const added = [...b].reduce((t, [l, n]) => t + Math.max(0, n - (a.get(l) ?? 0)), 0);
  return [f, { removed, added }];
}));
const WANT = {
  "data/inventory-store.js": { removed: [], added: 16 },
  "pages/asset-assignment.js": { removed: [
    "    assetSelect.addEventListener(\"change\", () => { clearError(assetSelect); syncCondition(); });",
    "  openReportOf, assetsWithOpenReports, closeReport,",
    "  syncCondition();",
    "  syncCondition();",
    "// The condition starts as the chosen asset's own.",
    "function syncCondition() {",
  ].sort(), added: 10 },
};
check("X4", "…and within them, only 10F's lines (removed lines exact; added lines counted)", j(delta) === j(WANT), j(delta));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
