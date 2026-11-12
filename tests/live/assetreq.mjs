// usage: node assetreq.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 6E: asset requests. data/asset-requests-store.js (new), ui/asset-request-view.js (new), "Request an asset"
// on my-assets.html, the requests card and request fulfilment on asset-assignment.html, asset rows in My requests
// and the approvals inbox (and its badge), the employee dashboard, and the adjacent "IT Support" cleanup.
// ./js-pre6E and ./html-pre6E are the code and pages before this round (6D's result). Fixed clock: Wed 30 Sep
// 2026 11:00 local.
//   A  the store: seed, submit (rules and chain per person), previewRoute
//   B  decide: who may, stage by stage, reject needs a note
//   C  fulfil: assets:assign, approved only, the requested type, through assignAsset(); close; cancel
//   D  reads: pendingFor, waitingOn, awaitingAsset, decisions; reset
//   E  my-assets.html: the request form and the "My asset requests" card
//   F  asset-assignment.html: the open requests card, Approve / Reject, Assign (fulfil) and Close
//   G  my-requests.html: asset rows, Cancel, tabs, filter, progress
//   H  the approvals inbox and the Approvals badge
//   I  the employee dashboard;  J  the adjacent pages;  K  access;  L  source layout
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const ASSIGN = "inventory/asset-assignment.html", MINE = "inventory/my-assets.html", MYREQ = "requests/my-requests.html",
  INBOX = "requests/approvals-inbox.html", DASH = "dashboard/employee.html", USERS = "users/users-list.html";
const SCRIPT = { [ASSIGN]: "asset-assignment", [MINE]: "my-assets", [MYREQ]: "my-requests", [INBOX]: "approvals-inbox",
  [DASH]: "employee-dashboard", [USERS]: "users-list" };

const RealDate = Date;
const NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029",
  ROHAN = "EMP-1042", DIVYA = "EMP-1061", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const WHO = {
  aarav: ["admin", "Aarav Mehta", AARAV], priya: ["hr", "Priya Nair", PRIYA], kabir: ["fin", "Kabir Shah", KABIR],
  sneha: ["emp", "Sneha Rao", SNEHA], arjun: ["emp", "Arjun Kapoor", ARJUN], rohan: ["emp", "Rohan Gupta", ROHAN],
  vikram: ["emp", "Vikram Singh", VIKRAM], ananya: ["emp", "Ananya Iyer", ANANYA], oldEmp: ["emp", "Arjun Kapoor", undefined],
};

let loads = 0, w = null, d = null, saved = {};
let jsErrors = [], navigations = [], htmlWrites = [], confirms = [], confirmAnswer = true;
async function open(page, who, hash = "") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = []; navigations = []; htmlWrites = []; confirms = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else jsErrors.push(e.message); });
  const dom = new JSDOM(read(page), { url: `http://localhost/office-os/pages/${page}${hash}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  const proto = w.Element.prototype;
  const inner = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", { get: inner.get, set(v) { htmlWrites.push(String(v)); inner.set.call(this, v); }, configurable: true });
  w.confirm = (m) => { confirms.push(m); return confirmAnswer; };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  const auth = await import("./js/core/auth.js");
  if (!who) auth.signOut(); else auth.signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${SCRIPT[page]}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }
// The store functions run against the current window's localStorage.
async function storeOnly() { fresh(); await open(MINE, "arjun"); }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;

const R = await import("./js/data/asset-requests-store.js");
const I = await import("./js/data/inventory-store.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const { PERMISSIONS, ALL_PERMISSIONS } = await import("./js/config/permissions.js");
const { ROLES } = await import("./js/config/roles.js");
const { ROUTES } = await import("./js/config/routes.js");
const { NAV } = await import("./js/config/nav.js");

// ---- readers ----
const $ = (id) => d.getElementById(id);
const pieces = (node) => { if (!node) return "(missing)"; const out = []; const it = node.ownerDocument.createTreeWalker(node, 4); for (let n = it.nextNode(); n; n = it.nextNode()) { const t = n.textContent.replace(/\s+/g, " ").trim(); if (t) out.push(t); } return out.join(" | "); };
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => ({ type: t.className.replace("toast toast--", ""), text: txt(t.querySelector(".toast__text")) }));
const clearToasts = () => d.querySelectorAll(".toast").forEach((t) => t.remove());
const lastToast = () => toasts().at(-1) ?? null;
const errorAt = (id) => txt($(id).closest(".form-field").querySelector(".form-error"));
const errors = (scope = d) => [...scope.querySelectorAll(".form-error")].map(txt);
// Not found (e.g. a missing row): a detached, inert button, so the checks that follow fail rather than crash.
const btn = (scope, label) => [...(scope?.querySelectorAll("button") ?? [])].find((b) => txt(b) === label) ?? d.createElement("button");
const options = (id) => [...$(id).options].map((o) => [o.value, txt(o)]);
const choose = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event("change", { bubbles: true })); };
const typeIn = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event("input", { bubbles: true })); };
const submit = (formId) => { clearToasts(); $(formId).querySelector('[type="submit"]').click(); };
const isOpen = (id) => $(id)?.classList.contains("is-open") ?? false;
const reqItems = () => [...$("asset-request-list").children];
const reqItem = (id) => d.querySelector(`#asset-request-list [data-request="${id}"]`);
const status = (id) => R.getAssetRequest(id)?.status;
const decisions = (r) => r.history.map((h) => `${h.stage}:${h.decision}:${h.byUserId ?? "-"}`);
const navCount = () => txt(d.querySelector('.nav__item[data-count-waiting] .nav__count')) ?? "0";
// The reject / close modals built by ui/leave-decision.js.
async function inModal(modalId, noteId, note) {
  $(noteId).value = note;
  clearToasts();
  $(modalId).querySelector('[type="submit"]').click();
}

// =====================================================================
section("A. The store: seed, submit, previewRoute");
await storeOnly();
const seed = R.allAssetRequests();
check("A1", "the seed: the two requests asset-assignment.html's sample card showed, with real people (Ishita Bose gone)",
  j(seed.map((r) => [r.id, r.userId, r.assetType, r.replacesTag, r.status, r.stage, r.managerId, r.appliedOn])) === j([
    ["ARQ-1", ARJUN, "laptop", "AST-0188", "pending", "manager", SNEHA, "2026-09-17"],
    ["ARQ-2", ANANYA, "monitor", null, "pending", "admin", null, "2026-09-24"]]), j(seed));
check("A2", "seed history: Arjun's applied (with Sneha); Ananya's applied + manager skipped ('No manager on file'), stored as instants in office time",
  j(seed.map(decisions)) === j([["manager:applied:EMP-1105"], ["manager:applied:EMP-1017", "manager:skipped:-"]])
  && seed[1].history[1].note === "No manager on file" && seed[0].history[0].at === "2026-09-17T04:45:00.000Z" && seed[1].history[0].at === "2026-09-24T07:10:00.000Z");
check("A3", "the seed's managers are what managerFor() gives today (Arjun -> Sneha; Ananya none)", seed[0].managerId === (await import("./js/data/leave-store.js")).managerFor(ARJUN)
  && (await import("./js/data/leave-store.js")).managerFor(ANANYA) === null);

const refusal = (r) => [r.ok, r.error, r.field ?? null];
check("A4", "the type must be one of ASSET_TYPES ('constructor' too)", j(refusal(R.submitAssetRequest(ARJUN, { assetType: "", reason: "x" }))) === j([false, "Choose what you need.", "assetType"])
  && j(refusal(R.submitAssetRequest(ARJUN, { assetType: "constructor", reason: "x" }))) === j([false, "Choose what you need.", "assetType"]));
check("A5", "a reason is required (blank counts as none)", j(refusal(R.submitAssetRequest(ARJUN, { assetType: "laptop", reason: "   " }))) === j([false, "Say why you need it.", "reason"]));
check("A6", "replacing: only your own assigned equipment (Rohan's MacBook, an unknown tag and the available AST-0218 are refused)",
  [{ t: "AST-0119" }, { t: "AST-9999" }, { t: "AST-0218" }].every(({ t }) => j(refusal(R.submitAssetRequest(ARJUN, { assetType: "laptop", reason: "x", replacesTag: t }))) === j([false, "You can only replace equipment assigned to you.", "replacesTag"])));
check("A7", "replacing: the same type (Arjun's monitor isn't a laptop)", j(refusal(R.submitAssetRequest(ARJUN, { assetType: "laptop", reason: "x", replacesTag: "AST-0302" }))) === j([false, "AST-0302 isn't a laptop.", "replacesTag"]));
check("A8", "an inactive person (Divya) or an unknown id can't request", j(refusal(R.submitAssetRequest(DIVYA, { assetType: "laptop", reason: "x" }))) === j([false, "Divya Menon is inactive and can't request equipment.", null])
  && R.submitAssetRequest("EMP-0000", { assetType: "laptop", reason: "x" }).error === "No employee with id EMP-0000.");
check("A9", "nothing was stored by any refusal", R.allAssetRequests().length === 2);

const sent = {};
for (const [who, id] of [["arjun", ARJUN], ["vikram", VIKRAM], ["priya", PRIYA], ["kabir", KABIR], ["meera", MEERA], ["aarav", AARAV]]) {
  const r = R.submitAssetRequest(id, { assetType: "monitor", reason: `  Needs a screen (${who})  ` });
  sent[who] = r.record ?? { id: `refused: ${r.error}`, history: [], status: null };   // a refusal fails A10-A15 instead of crashing
}
check("A10", "every request is stored with the next ARQ id, the reason trimmed, no tag, sent today", j(Object.values(sent).map((r) => r.id)) === j(["ARQ-3", "ARQ-4", "ARQ-5", "ARQ-6", "ARQ-7", "ARQ-8"])
  && sent.arjun.reason === "Needs a screen (arjun)" && Object.values(sent).every((r) => r.assetTag === null && r.replacesTag === null && r.appliedOn === "2026-09-30"));
check("A11", "Arjun -> his manager Sneha first", sent.arjun.status === "pending" && sent.arjun.stage === "manager" && sent.arjun.managerId === SNEHA && j(decisions(sent.arjun)) === j(["manager:applied:EMP-1105"]));
check("A12", "Vikram (no manager on file) -> straight to the Admin stage, the manager stage skipped with its reason",
  sent.vikram.stage === "admin" && sent.vikram.managerId === null && j(decisions(sent.vikram)) === j(["manager:applied:EMP-1088", "manager:skipped:-"]) && sent.vikram.history[1].note === "No manager on file");
check("A13", "Priya and Kabir -> their manager, Aarav, at the manager stage (the accepted double approval)", [sent.priya, sent.kabir].every((r) => r.stage === "manager" && r.managerId === AARAV));
check("A14", "Meera (on leave, still active) -> her manager Kabir", sent.meera.stage === "manager" && sent.meera.managerId === KABIR);
check("A15", "Aarav's own request: auto-approved at both stages, straight to waiting for an asset",
  sent.aarav.status === "approved" && sent.aarav.stage === "fulfilment" && j(decisions(sent.aarav)) === j(["manager:applied:EMP-1001", "manager:auto-approved:EMP-1001", "admin:auto-approved:EMP-1001"])
  && sent.aarav.history.slice(1).every((h) => h.note === "Auto-approved (Admin)"));
check("A16", "a request may replace one of your own assets of that type (Arjun's laptop AST-0188)", R.submitAssetRequest(ARJUN, { assetType: "laptop", reason: "Old", replacesTag: " AST-0188 " }).record?.replacesTag === "AST-0188");
const route = (id) => R.previewRoute(id).map((r) => `${r.stage}:${r.holderIds.join("+") || "-"}`);
check("A17", "previewRoute: Arjun Sneha then Aarav; Vikram no manager then Aarav; Priya Aarav twice; Aarav [] (auto)",
  j(route(ARJUN)) === j(["manager:EMP-1029", "admin:EMP-1001"]) && j(route(VIKRAM)) === j(["manager:-", "admin:EMP-1001"])
  && j(route(PRIYA)) === j(["manager:EMP-1001", "admin:EMP-1001"]) && j(R.previewRoute(AARAV)) === "[]" && j(R.previewRoute(DIVYA)) === "[]");
// Round 9U (behaviour; was S.updateUser(AARAV, { role: "emp" })): the store now refuses to leave nobody with the Admin
// role (adminguard.mjs Z1), so the no-Admin state is written into storage, as data saved before 9U could hold it
S.updateUser(USER_ACTOR("admin", "EMP-1001"), "EMP-1001", {}); { const box = JSON.parse(localStorage.getItem("officeos:users")); box.records.forEach((u) => { if (u.role === "admin") u.role = "emp"; }); localStorage.setItem("officeos:users", JSON.stringify(box)); }   // the only Admin, for the moment not one (an Admin can't be deactivated)
check("A18", "with no Admin, nobody can approve: the request is refused, not stored", j(refusal(R.submitAssetRequest(VIKRAM, { assetType: "laptop", reason: "x" }))) === j([false, "Nobody can approve this request at the moment. Ask an Admin.", null])
  && R.allAssetRequests().length === 9);
S.updateUser(USER_ACTOR("admin", AARAV), AARAV, { role: "admin" });

// =====================================================================
section("B. Decide: who may, stage by stage");
await storeOnly();
const dec = (id, who, role, decision, note) => refusal(R.decideAssetRequest(id, who, role, decision, note));
check("B1", "nobody else at the manager stage: Rohan, Aarav (an Admin, but not Arjun's manager), a role that isn't theirs",
  j(dec("ARQ-1", ROHAN, "emp", "approve")) === j([false, "Only the requester's manager can decide this request at the manager stage.", null])
  && j(dec("ARQ-1", AARAV, "admin", "approve")) === j([false, "Only the requester's manager can decide this request at the manager stage.", null])
  && j(dec("ARQ-1", SNEHA, "admin", "approve")) === j([false, "You can't decide asset requests.", null]));
check("B2", "never your own", j(dec("ARQ-1", ARJUN, "emp", "approve")) === j([false, "You can't decide your own asset request.", null]));
check("B3", "a rejection needs a note (at the note field); an unknown decision is refused", j(dec("ARQ-1", SNEHA, "emp", "reject", " ")) === j([false, "Add a note saying why the request is rejected.", "note"])
  && dec("ARQ-1", SNEHA, "emp", "maybe")[1] === 'Decision must be "approve" or "reject".' && status("ARQ-1") === "pending");
const b4 = R.decideAssetRequest("ARQ-1", SNEHA, "emp", "approve");
check("B4", "Sneha approves at the manager stage: it goes to the Admin stage", b4.ok && b4.record.status === "pending" && b4.record.stage === "admin" && j(decisions(b4.record).slice(-1)) === j(["manager:approved:EMP-1029"]));
check("B5", "Sneha can't decide it again at the Admin stage; only an Admin can", j(dec("ARQ-1", SNEHA, "emp", "approve")) === j([false, "Only an Admin can decide this request at the Admin stage.", null]));
const b6 = R.decideAssetRequest("ARQ-1", AARAV, "admin", "approve");
check("B6", "Aarav approves at the Admin stage: approved, waiting for an asset (stage 'fulfilment')", b6.ok && b6.record.status === "approved" && b6.record.stage === "fulfilment" && b6.record.assetTag === null);
check("B7", "a decided request can't be decided again", j(dec("ARQ-1", AARAV, "admin", "reject", "no")) === j([false, "This request is already approved.", null]));
const b8 = R.decideAssetRequest("ARQ-2", AARAV, "admin", "reject", "  We have no spare monitors this quarter  ");
check("B8", "a rejection ends it at any stage, with the note trimmed", b8.ok && b8.record.status === "rejected" && b8.record.stage === "done" && b8.record.history.at(-1).note === "We have no spare monitors this quarter");
const priyaReq = R.submitAssetRequest(PRIYA, { assetType: "laptop", reason: "x" }).record;
R.decideAssetRequest(priyaReq.id, AARAV, "admin", "approve");
check("B9", "Priya's request: Aarav decides the manager stage, then (by role) the Admin stage too", R.getAssetRequest(priyaReq.id).stage === "admin"
  && R.decideAssetRequest(priyaReq.id, AARAV, "admin", "approve").record.status === "approved");
check("B10", "an unknown request", R.decideAssetRequest("ARQ-99", AARAV, "admin", "approve").error === "No asset request ARQ-99.");
const arjun2 = R.submitAssetRequest(ARJUN, { assetType: "laptop", reason: "x" }).record;
S.deactivateUser(USER_ACTOR("admin", SNEHA), SNEHA, LEAVING_11Y());
// Round 10T (decision; was "and nobody else can at that stage", waitingOn []): the manager stage now falls back to an Admin
// when the manager can no longer decide (mgrfall.mjs A1-A11)
check("B11", "an inactive manager can't decide (an Admin may decide that stage instead: round 10T)", j(dec(arjun2.id, SNEHA, "emp", "approve")) === j([false, "You can't decide asset requests.", null]) && j(R.waitingOn(R.getAssetRequest(arjun2.id))) === j([AARAV]));
S.reactivateUser(USER_ACTOR("admin", SNEHA), SNEHA);

// =====================================================================
section("C. Fulfil, close, cancel");
await storeOnly();
R.decideAssetRequest("ARQ-1", SNEHA, "emp", "approve");
const ful = (id, who, tag, fields) => refusal(R.fulfilAssetRequest(id, who, tag, fields));
check("C1", "only someone with assets:assign (Sneha and Priya can't)", j(ful("ARQ-1", SNEHA, "AST-0218")) === j([false, "You can't assign assets.", null]) && ful("ARQ-1", PRIYA, "AST-0218")[1] === "You can't assign assets.");
check("C2", "not before it's approved", j(ful("ARQ-1", AARAV, "AST-0218")) === j([false, "This request is still waiting for approval.", null]));
R.decideAssetRequest("ARQ-1", AARAV, "admin", "approve");
check("C3", "an asset is required, must exist, and must be the requested type (at the tag field)",
  j(ful("ARQ-1", AARAV, " ")) === j([false, "Choose an asset.", "tag"]) && j(ful("ARQ-1", AARAV, "AST-9999")) === j([false, "No asset AST-9999.", "tag"])
  && j(ful("ARQ-1", AARAV, "AST-0302")) === j([false, "AST-0302 isn't a laptop.", "tag"]));
const movesBefore = I.allMovements().length;
check("C4", "an asset that isn't available is refused by assignAsset() itself (AST-0217 is Sneha's), nothing changes",
  j(ful("ARQ-1", AARAV, "AST-0217")) === j([false, "AST-0217 is assigned, not available.", null]) && status("ARQ-1") === "approved" && I.allMovements().length === movesBefore);
check("C5", "assignAsset()'s field errors come back as they are (a future date, at date)", j(ful("ARQ-1", AARAV, "AST-0218", { date: "2026-10-05" })) === j([false, "The date can't be in the future.", "date"]));
const c6 = R.fulfilAssetRequest("ARQ-1", AARAV, "AST-0218", { date: "2026-09-29", condition: "fair" });
const asset = I.getAsset("AST-0218");
check("C6", "fulfilled: AST-0218 assigned to Arjun (date, condition), the request records the tag and who handed it over",
  c6.ok && c6.record.status === "fulfilled" && c6.record.stage === "done" && c6.record.assetTag === "AST-0218" && c6.asset?.id === "AST-0218"
  && asset.status === "assigned" && asset.holderId === ARJUN && asset.since === "2026-09-29" && asset.condition === "fair"
  && j(decisions(c6.record).slice(-1)) === j(["fulfilment:fulfilled:EMP-1001"]) && c6.record.history.at(-1).note === "AST-0218", j(c6.record));
const move = I.allMovements()[0];
check("C7", "the hand-over is the asset register's own: one stock-out of IT-1021 for Arjun, in the asset's history",
  I.allMovements().length === movesBefore + 1 && move.sku === "IT-1021" && move.change === -1 && move.assetTag === "AST-0218" && move.holderId === ARJUN && move.recordedBy === AARAV
  && asset.history.at(-1).action === "assigned" && asset.history.at(-1).movementId === move.id);
check("C8", "the replaced laptop is not taken back by this (AST-0188 still Arjun's)", I.getAsset("AST-0188").status === "assigned" && I.getAsset("AST-0188").holderId === ARJUN);
check("C9", "a fulfilled request can't be fulfilled, closed or cancelled", ful("ARQ-1", AARAV, "AST-0218")[1] === "This request is already fulfilled."
  && R.closeAssetRequest("ARQ-1", AARAV, "x").error === "This request is already fulfilled." && R.cancelAssetRequest("ARQ-1", ARJUN).error === "This request is already fulfilled, so it can't be cancelled.");
const vik = R.submitAssetRequest(VIKRAM, { assetType: "laptop", reason: "x" }).record;
R.decideAssetRequest(vik.id, AARAV, "admin", "approve");
I.returnAsset(AARAV, "AST-0217", { condition: "good", location: "store-a" });   // a laptop back in the store to hand over
S.deactivateUser(USER_ACTOR("admin", VIKRAM), VIKRAM, LEAVING_11Y());
const c10 = R.fulfilAssetRequest(vik.id, AARAV, "AST-0217");
check("C10", "the requester has since left: assignAsset() refuses at holderId, the request stays approved, the laptop stays in the store",
  j(refusal(c10)) === j([false, "Vikram Singh is inactive and can't be given an asset.", "holderId"]) && status(vik.id) === "approved" && I.getAsset("AST-0217").status === "available");
S.reactivateUser(USER_ACTOR("admin", VIKRAM), VIKRAM);
R.decideAssetRequest("ARQ-2", AARAV, "admin", "approve");
check("C11", "close: assets:assign only, a note required, approved only", R.closeAssetRequest("ARQ-2", SNEHA, "x").error === "You can't close asset requests."
  && j(refusal(R.closeAssetRequest("ARQ-2", AARAV, " "))) === j([false, "Add a note saying why the request is closed.", "note"]));
const c12 = R.closeAssetRequest("ARQ-2", AARAV, " No monitor is tagged yet ");
check("C12", "closed without an asset, with the note", c12.ok && c12.record.status === "closed" && c12.record.stage === "done" && c12.record.assetTag === null && j(decisions(c12.record).slice(-1)) === j(["fulfilment:closed:EMP-1001"]) && c12.record.history.at(-1).note === "No monitor is tagged yet");
const pend = R.submitAssetRequest(ROHAN, { assetType: "monitor", reason: "x" }).record;
check("C13", "close refuses a pending request", R.closeAssetRequest(pend.id, AARAV, "x").error === "This request is still waiting for approval.");
check("C14", "cancel: only the requester", R.cancelAssetRequest(pend.id, SNEHA).error === "Only the person who sent this request can cancel it.");
const c15 = R.cancelAssetRequest(pend.id, ROHAN);
check("C15", "cancel while pending", c15.ok && c15.record.status === "cancelled" && c15.record.stage === "done" && j(decisions(c15.record).slice(-1)) === j(["manager:cancelled:EMP-1042"]));
const appr = vik;   // Vikram's laptop request, approved and still waiting (C10)
const c16 = R.cancelAssetRequest(appr.id, VIKRAM);
check("C16", "cancel while approved and waiting for an asset (until one is handed over)", c16.ok && c16.record.status === "cancelled" && j(decisions(c16.record).slice(-1)) === j(["fulfilment:cancelled:EMP-1088"]));
check("C17", "a cancelled request can't be cancelled again or fulfilled", R.cancelAssetRequest(appr.id, VIKRAM).error === "This request is already cancelled, so it can't be cancelled." && ful(appr.id, AARAV, "AST-0099")[1] === "This request is already cancelled.");

// =====================================================================
section("D. Reads and reset");
await storeOnly();
const ids = (list) => list.map((r) => r.id);
check("D1", "pendingFor: Sneha has ARQ-1 (manager), Aarav ARQ-2 (Admin), nobody else anything; never a role that isn't theirs",
  j(ids(R.pendingFor(SNEHA, "emp"))) === j(["ARQ-1"]) && j(ids(R.pendingFor(AARAV, "admin"))) === j(["ARQ-2"])
  && [[ARJUN, "emp"], [PRIYA, "hr"], [KABIR, "fin"], [ROHAN, "emp"], [SNEHA, "admin"], [AARAV, "emp"], ["EMP-0000", "emp"]].every(([u, r]) => R.pendingFor(u, r).length === 0));
check("D2", "waitingOn: who decides now; once approved, who may assign (Aarav); nothing after", j(R.waitingOn(R.getAssetRequest("ARQ-1"))) === j([SNEHA]) && j(R.waitingOn(R.getAssetRequest("ARQ-2"))) === j([AARAV]) && j(R.waitingOn(null)) === "[]");
R.decideAssetRequest("ARQ-2", AARAV, "admin", "approve");
const own = R.submitAssetRequest(AARAV, { assetType: "access-card", reason: "Spare" }).record;
check("D3", "awaitingAsset: the approved ones, oldest sent first", j(ids(R.awaitingAsset())) === j(["ARQ-2", own.id]) && j(R.waitingOn(R.getAssetRequest("ARQ-2"))) === j([AARAV]));
check("D4", "requests for a person: their own only", j(ids(R.assetRequestsFor(ARJUN))) === j(["ARQ-1"]) && R.assetRequestsFor(ROHAN).length === 0);
R.decideAssetRequest("ARQ-1", SNEHA, "emp", "reject", "Not this quarter");
check("D5", "decisions by a person: their own approve / reject entries (not auto-approvals), newest first",
  j(R.assetRequestDecisionsBy(AARAV).map((x) => [x.request.id, x.entry.decision])) === j([["ARQ-2", "approved"]]) && j(R.assetRequestDecisionsBy(SNEHA).map((x) => [x.request.id, x.entry.decision])) === j([["ARQ-1", "rejected"]]));
const copy = R.getAssetRequest("ARQ-1"); copy.status = "pending"; copy.history.length = 0;
check("D6", "reads are copies: changing one changes nothing stored", R.getAssetRequest("ARQ-1").status === "rejected" && R.getAssetRequest("ARQ-1").history.length === 2);
R.resetAssetRequestData();
check("D7", "reset: back to the seed", j(ids(R.allAssetRequests())) === j(["ARQ-1", "ARQ-2"]) && status("ARQ-1") === "pending");

// =====================================================================
section("E. my-assets.html: Request an asset and the requests card");
fresh();
await open(MINE, "arjun");
const reqBtn = $("request-asset-btn");
// Round 6I: Report a problem / Report issue are real too now (closeout.mjs).
check("E1", "no JS errors; 'Request an asset' is real now (assets:request, no placeholder); so are 'Report a problem' and 'Report issue' since 6I",
  jsErrors.length === 0 && reqBtn.dataset.permission === "assets:request" && !reqBtn.dataset.notImplemented && !reqBtn.disabled
  && !btn(d, "Report a problem").dataset.notImplemented && [...d.querySelectorAll("#my-asset-rows button")].every((b) => !b.dataset.notImplemented && b.dataset.reportTag), jsErrors.join(" | "));
const card = () => $("request-card-body");
check("E2", "the card shows his open request: title, badge 'With manager', the reason, and its steps (Sneha now, then an Admin, then the hand-over)",
  pieces(card()) === "Laptop, replaces AST-0188 | With manager | My laptop is over 3 years old and too slow for builds | Sent | 17 Sep by you | 2 | Manager approval | Waiting for Sneha Rao | 3 | Admin approval | An Admin | 4 | Asset handed over | An Admin assigns one once it's approved", pieces(card()));
check("E3", "the sample is gone: no 'Sample, not built yet', no 'Laptop upgrade request' heading; a link to My requests", !/Sample, not built yet|Laptop upgrade request/.test(txt(d.querySelector("main")))
  && $("request-card").querySelector(".card__header a")?.getAttribute("href") === "../requests/my-requests.html");
reqBtn.click();
check("E4", "the button opens the form: types from ASSET_TYPES, 'Replaces' starts with only 'Nothing', and who it goes to",
  isOpen("request-modal") && j(options("r-type")) === j([["", "Choose a type"], ["laptop", "Laptop"], ["monitor", "Monitor"], ["access-card", "Access card"]])
  && j(options("r-replaces")) === j([["", "Nothing, it's in addition"]]) && txt($("request-chain")) === "Your request goes to Sneha Rao, then an Admin. Once it's approved, an asset is assigned to you.");
choose("r-type", "laptop");
check("E5", "choosing a type offers only his own assets of that type", j(options("r-replaces")) === j([["", "Nothing, it's in addition"], ["AST-0188", "AST-0188, Dell Latitude 5420"]]));
choose("r-type", "access-card");
check("E6", "... and changes with the type (his access card)", j(options("r-replaces").map((o) => o[0])) === j(["", "AST-0455"]));
choose("r-type", ""); submit("request-form");
check("E7", "the form is novalidate; an empty send shows the store's first refusal at its field, nothing stored",
  $("request-form").noValidate && errorAt("r-type") === "Choose what you need." && errors().length === 1 && R.allAssetRequests().length === 2 && isOpen("request-modal"));
choose("r-type", "laptop");
check("E8", "changing the field clears its error", errors().length === 0);
submit("request-form");
check("E9", "no reason: at the reason", errorAt("r-reason") === "Say why you need it." && errors().length === 1);
typeIn("r-reason", "Second laptop for testing");
check("E10", "typing clears it", errors().length === 0);
choose("r-replaces", "AST-0188"); submit("request-form");
const e11 = R.allAssetRequests().at(-1);
check("E11", "sent: closed, a fixed toast, stored as typed (the replaced tag too)", !isOpen("request-modal") && j(lastToast()) === j({ type: "success", text: "Asset request sent." })
  && e11.id === "ARQ-3" && e11.userId === ARJUN && e11.assetType === "laptop" && e11.replacesTag === "AST-0188" && e11.reason === "Second laptop for testing");
check("E12", "the card shows the newest open request, and says another is open", pieces(card()).startsWith("Laptop, replaces AST-0188 | With manager | Second laptop for testing | Sent | 30 Sep by you")
  && /1 other request is open too\.$/.test(txt(card())));
reqBtn.click();
check("E13", "reopening starts clean (no old values or errors)", $("r-type").value === "" && $("r-reason").value === "" && errors().length === 0);
choose("r-type", "laptop");
choose("r-replaces", "AST-0188");
typeIn("r-reason", "x");
I.returnAsset(AARAV, "AST-0188", { condition: "fair", location: "store-a" });   // taken back meanwhile, in another tab
submit("request-form");
check("E14", "a store refusal that comes up only on sending (AST-0188 taken back meanwhile) shows at Replaces", errorAt("r-replaces") === "You can only replace equipment assigned to you."
  && R.allAssetRequests().length === 3);
fresh();
await open(MINE, "vikram");
$("request-asset-btn").click();
check("E15", "Vikram (no manager on file): the form says so", txt($("request-chain")) === "Your request goes to an Admin (no manager on file). Once it's approved, an asset is assigned to you."
  && txt(card()) === "You haven't asked for any equipment. Use Request an asset when you need something.");
choose("r-type", "laptop"); typeIn("r-reason", "Mine is broken"); submit("request-form");
check("E15b", "his request's steps: the manager stage shown as skipped, with why; waiting for Aarav at the Admin stage",
  pieces(card()) === "Laptop | With Admin | Mine is broken | Sent | 30 Sep by you | Manager approval skipped | No manager on file | 3 | Admin approval | Waiting for Aarav Mehta | 4 | Asset handed over | An Admin assigns one once it's approved", pieces(card()));
await open(MINE, "aarav");
$("request-asset-btn").click();
choose("r-type", "monitor"); typeIn("r-reason", "Spare for demos"); submit("request-form");
check("E16", "Aarav: told it's approved at once; the card shows it waiting for an asset",
  /^As an Admin, your request is approved as soon as you send it/.test(txt($("request-chain"))) && j(lastToast()) === j({ type: "success", text: "Request approved. Admin requests are approved automatically." })
  && pieces(card()) === "Monitor | Waiting for an asset | Spare for demos | Sent | 30 Sep by you | Manager approval | Approved automatically (Admin) | Admin approval | Approved automatically (Admin) | 4 | Asset handed over | Waiting for Aarav Mehta", pieces(card()));
fresh();
await open(MINE, "arjun", "#request");
check("E17", "my-assets.html#request (My requests' button) opens the form", isOpen("request-modal") && jsErrors.length === 0);
await open(MINE, "oldEmp");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("E18", "an old session with no employee id: signed out and sent to sign in (round 11P, N2); the form isn't wired, nothing opens", navigations.length === 1 && localStorage.getItem("officeos:session") === null && !isOpen("request-modal")
  && jsErrors.length === 0, txt(card()));
fresh();
await open(MINE, "arjun");
R.decideAssetRequest("ARQ-1", SNEHA, "emp", "reject", "Use the spare one from Rohan's team");
await open(MINE, "arjun");
check("E19", "a decided request: the latest one, its badge and the rejection's reason", pieces(card()).startsWith("Laptop, replaces AST-0188 | Rejected | My laptop is over 3 years old and too slow for builds | Reason: Use the spare one from Rohan's team"));
check("E20", "no innerHTML from the page script (names and reasons are text)", htmlWrites.every((h) => !/Rohan's team|Arjun Kapoor/.test(h)));
fresh();
await open(MINE, "arjun");
const e21 = R.submitAssetRequest(ARJUN, { assetType: "monitor", reason: "Never mind" }).record;
R.cancelAssetRequest(e21.id, ARJUN);
await open(MINE, "arjun");
check("E21", "the card prefers an open request: his cancelled one is newer, but ARQ-1 (still pending) is shown", pieces(card()).startsWith("Laptop, replaces AST-0188 | With manager | "), pieces(card()));

// =====================================================================
section("F. asset-assignment.html: the open requests card");
fresh();
await open(ASSIGN, "aarav");
check("F1", "no JS errors; 'Open asset requests', '2 open', oldest first; the sample text gone", jsErrors.length === 0 && txt($("asset-requests-meta")) === "2 open"
  && j(reqItems().map((i) => i.dataset.request)) === j(["ARQ-1", "ARQ-2"]) && !/Sample, not built yet|Ishita/.test(txt(d.querySelector("main"))), jsErrors.join(" | "));
check("F2", "Arjun's (with his manager): who, what, why, where it is, a badge, no buttons for Aarav",
  pieces(reqItem("ARQ-1")) === "AK | Arjun Kapoor: Laptop, replaces AST-0188 | My laptop is over 3 years old and too slow for builds | With Sneha Rao | With manager" && reqItem("ARQ-1").querySelectorAll("button").length === 0);
check("F3", "Ananya's (at the Admin stage): 'Waiting for your approval', Reject / Approve on assets:approve",
  pieces(reqItem("ARQ-2")) === "AI | Ananya Iyer: Monitor | A second monitor for the weekly sales reports | Waiting for your approval | Reject | Approve"
  && [...reqItem("ARQ-2").querySelectorAll("button")].every((b) => b.dataset.permission === "assets:approve" && !b.hidden));
confirmAnswer = false; btn(reqItem("ARQ-2"), "Approve").click(); confirmAnswer = true;
check("F4", "Approve asks first (the shared confirm, plain text); No changes nothing", confirms[0] === "Approve this request?\nAnanya Iyer: Monitor (ARQ-2). A second monitor for the weekly sales reports" && status("ARQ-2") === "pending");
clearToasts(); btn(reqItem("ARQ-2"), "Approve").click();
check("F5", "approved: a fixed toast; the item now waits for an asset, with Close and Assign (assets:assign)",
  j(lastToast()) === j({ type: "success", text: "Request approved. It's waiting for an asset to be assigned." }) && status("ARQ-2") === "approved"
  && pieces(reqItem("ARQ-2")) === "AI | Ananya Iyer: Monitor | A second monitor for the weekly sales reports | Approved, waiting for an asset | Close | Assign"
  && [...reqItem("ARQ-2").querySelectorAll("button")].every((b) => b.dataset.permission === "assets:assign"));
btn(reqItem("ARQ-2"), "Assign").click();
check("F6", "Assign fills the form for the request: a note naming it, only available monitors (none), Ananya fixed",
  !$("a-request").hidden && txt($("a-request")) === "For Ananya Iyer's monitor request (ARQ-2). Assign without a request"
  && j(options("a-asset")) === j([["", "No monitor is available to assign"]]) && $("a-person").disabled && j(options("a-person")) === j([[ANANYA, "Ananya Iyer, Sales"]]));
btn($("a-request"), "Assign without a request").click();
check("F7", "'Assign without a request' goes back to a plain assignment: every available asset and every active person",
  $("a-request").hidden && !$("a-person").disabled && j(options("a-asset").map((o) => o[0])) === j(["", "AST-0218"]) && options("a-person").length === 10);
btn(reqItem("ARQ-2"), "Close").click();
check("F8", "Close opens a note modal (not Reject's wording) describing the request", isOpen("close-asset-request-modal") && txt($("close-asset-request-modal-title")) === "Close asset request"
  && txt($("close-asset-request-modal").querySelector('[type="submit"]')) === "Close request" && txt($("close-asset-request-modal").querySelector(".modal__desc")) === "Ananya Iyer: Monitor (ARQ-2). A second monitor for the weekly sales reports");
await inModal("close-asset-request-modal", "close-asset-request-note", "  ");
check("F9", "an empty note is refused inside the modal", isOpen("close-asset-request-modal") && txt($("close-asset-request-modal").querySelector(".form-error")) === "Add a note saying why the request is closed." && status("ARQ-2") === "approved");
await inModal("close-asset-request-modal", "close-asset-request-note", "No monitor is tagged yet");
check("F10", "closed: a fixed toast, gone from the card ('1 open')", !isOpen("close-asset-request-modal") && j(lastToast()) === j({ type: "success", text: "Request closed." }) && status("ARQ-2") === "closed"
  && txt($("asset-requests-meta")) === "1 open" && !reqItem("ARQ-2"));
R.decideAssetRequest("ARQ-1", SNEHA, "emp", "approve");
await open(ASSIGN, "aarav");
check("F11", "after Sneha's approval Arjun's is Aarav's to decide here", pieces(reqItem("ARQ-1")).endsWith("Waiting for your approval | Reject | Approve"));
btn(reqItem("ARQ-1"), "Reject").click();
check("F12", "Reject opens the shared reject modal", isOpen("reject-asset-request-modal") && txt($("reject-asset-request-modal").querySelector('[type="submit"]')) === "Reject request");
d.querySelector("#reject-asset-request-modal .modal__close").click();
check("F13", "the ✕ closes it unchanged", !isOpen("reject-asset-request-modal") && status("ARQ-1") === "pending");
clearToasts(); btn(reqItem("ARQ-1"), "Approve").click();
btn(reqItem("ARQ-1"), "Assign").click();
check("F14", "Arjun's laptop: the note says what it replaces and to take that back; only available laptops (AST-0218)",
  txt($("a-request")) === "For Arjun Kapoor's laptop request (ARQ-1). It replaces AST-0188: take that back with Update once this one is handed over. Assign without a request"
  && j(options("a-asset").map((o) => o[0])) === j(["", "AST-0218"]) && $("a-person").value === ARJUN);
submit("assign-form");
check("F15", "no asset chosen: the page's own 'Choose an asset.'", errorAt("a-asset") === "Choose an asset." && status("ARQ-1") === "approved");
choose("a-asset", "AST-0218"); $("a-date").value = "2026-10-03"; submit("assign-form");
check("F16", "the store's refusal shows at its field (a future date)", errorAt("a-date") === "The date can't be in the future." && status("ARQ-1") === "approved");
$("a-date").value = ""; choose("a-cond", "fair"); submit("assign-form");
check("F17", "assigned through the request: an escaped toast naming both, the request fulfilled, the asset Arjun's",
  j(lastToast()) === j({ type: "success", text: "AST-0218 assigned to Arjun Kapoor. Request ARQ-1 is fulfilled." }) && status("ARQ-1") === "fulfilled"
  && R.getAssetRequest("ARQ-1").assetTag === "AST-0218" && I.getAsset("AST-0218").holderId === ARJUN && I.getAsset("AST-0218").condition === "fair" && I.getAsset("AST-0218").since === "2026-09-30");
check("F18", "the page redraws: the card empty, the form plain again, the register shows AST-0218 assigned",
  txt($("asset-requests-meta")) === "None open" && txt($("asset-request-list")) === "No asset requests are open." && $("a-request").hidden && !$("a-person").disabled
  && /Arjun Kapoor/.test(txt(d.querySelector('#asset-rows tr[data-tag="AST-0218"]'))));
await open(MINE, "arjun");
check("F18b", "Arjun's card: Fulfilled, the last step naming the asset, who handed it over and when",
  /^Laptop, replaces AST-0188 \| Fulfilled \| /.test(pieces(card())) && pieces(card()).endsWith("| Asset handed over | AST-0218, from Aarav Mehta, 30 Sep"), pieces(card()));
fresh();
await open(ASSIGN, "aarav");
S.updateUser(USER_ACTOR("admin", VIKRAM), VIKRAM, { name: '<img src=x onerror="window.pwned=1">Vikram' });
const f18c = R.submitAssetRequest(VIKRAM, { assetType: "laptop", reason: "x" }).record;
R.decideAssetRequest(f18c.id, AARAV, "admin", "approve");
await open(ASSIGN, "aarav");
btn(reqItem(f18c.id), "Assign").click();
choose("a-asset", "AST-0218"); submit("assign-form");
check("F18c", "a requester's name with markup is text in the toast (escaped), not an element", status(f18c.id) === "fulfilled" && !d.querySelector(".toast img") && !w.pwned
  && lastToast()?.text === `AST-0218 assigned to <img src=x onerror="window.pwned=1">Vikram. Request ${f18c.id} is fulfilled.`, j(lastToast()));
fresh();
await open(ASSIGN, "aarav");
R.decideAssetRequest("ARQ-2", AARAV, "admin", "approve");
await open(ASSIGN, "aarav");
btn(reqItem("ARQ-2"), "Assign").click();
R.cancelAssetRequest("ARQ-2", ANANYA);
btn(d.querySelector('#asset-rows tr[data-tag="AST-0218"]'), "Assign").click();
check("F19", "a row's Assign leaves request mode (a plain assignment of that asset)", $("a-request").hidden && $("a-asset").value === "AST-0218" && !$("a-person").disabled);
fresh();
await open(ASSIGN, "aarav");
R.decideAssetRequest("ARQ-2", AARAV, "admin", "approve");
await open(ASSIGN, "aarav");
btn(reqItem("ARQ-2"), "Assign").click();
R.cancelAssetRequest("ARQ-2", ANANYA);
btn(d.querySelector('#asset-rows tr[data-tag="AST-0218"]'), "Update").click();
choose("u-action", "repair"); typeIn("u-note", "Fan noise"); submit("asset-modal-form");
check("F20", "a request cancelled meanwhile: the next redraw drops request mode", $("a-request").hidden && !$("a-person").disabled && !reqItem("ARQ-2"));
fresh();
await open(ASSIGN, "sneha");
check("F21", "Sneha (no assets:view) is redirected; nothing drawn", navigations.length > 0 && reqItems().length === 0);
check("F22", "no innerHTML with request text", htmlWrites.every((h) => !/weekly sales|too slow/.test(h)));

// =====================================================================
section("G. my-requests.html: asset rows");
fresh();
await open(MYREQ, "arjun");
const rows = () => [...d.querySelectorAll(".table tbody tr")];
const rowFor = (id) => d.querySelector(`.table tbody tr[data-request-id="${id}"]`);
check("G1", "no JS errors; the static 'Laptop upgrade / IT Support' row is gone; his real request is a row: title, Asset, sent, with Sneha, Pending, Cancel",
  jsErrors.length === 0 && !rows().some((tr) => /IT Support|Laptop upgrade/.test(txt(tr))) && pieces(rowFor("ARQ-1")) === "Laptop, replaces AST-0188 | Asset | 17 Sep | Sneha Rao | Pending | Cancel"
  && btn(rowFor("ARQ-1"), "Cancel").dataset.permission === "requests:cancel" && !btn(rowFor("ARQ-1"), "Cancel").dataset.notImplemented, jsErrors.join(" | "));
const pill = (label) => [...d.querySelectorAll(".table__toolbar .tabs__tab")].find((p) => txt(p).startsWith(label));
const count = (label) => txt(pill(label).querySelector(".badge--count"));
const allBefore = Number(count("All"));
const typeSel = d.querySelector('.table__toolbar select[aria-label="Filter by type"]');
typeSel.value = "asset"; typeSel.dispatchEvent(new w.Event("change"));
check("G2", "the type filter's Asset option shows only asset rows", rows().length === 1 && rows()[0].dataset.requestId === "ARQ-1");
typeSel.value = ""; typeSel.dispatchEvent(new w.Event("change"));
check("G3", "the progress card takes the newest pending request of any kind: his travel claim (25 Sep) is newer than his asset request (17 Sep)", /^Expense:/.test(txt(d.querySelector("#request-progress .card__title"))));
confirmAnswer = false; btn(rowFor("ARQ-1"), "Cancel").click(); confirmAnswer = true;
check("G4", "Cancel asks first; No changes nothing", confirms[0] === "Cancel your asset request (Laptop, replaces AST-0188)?" && status("ARQ-1") === "pending");
clearToasts(); btn(rowFor("ARQ-1"), "Cancel").click();
check("G5", "cancelled: a fixed toast, the row Cancelled with no button, counted only under All", j(lastToast()) === j({ type: "success", text: "Asset request cancelled." })
  && pieces(rowFor("ARQ-1")) === "Laptop, replaces AST-0188 | Asset | 17 Sep | — | Cancelled" && Number(count("All")) === allBefore);
const g6 = R.submitAssetRequest(ARJUN, { assetType: "monitor", reason: "Second screen" }).record;
await open(MYREQ, "arjun");
check("G6", "a new request is the newest pending: the progress card shows its steps", txt(d.querySelector("#request-progress .card__title")) === "Asset: Monitor"
  && pieces(d.querySelector("#request-progress .card__body")) === "Sent | 30 Sep by you | 2 | Manager approval | Waiting for Sneha Rao | 3 | Admin approval | An Admin | 4 | Asset handed over | An Admin assigns one once it's approved");
R.decideAssetRequest(g6.id, SNEHA, "emp", "approve");
R.decideAssetRequest(g6.id, AARAV, "admin", "approve");
await open(MYREQ, "arjun");
// Round 14E part 4 (behaviour, as ruled 2026-11-10; was "counted under Approved": approved but not handed over yet is still open, so under Pending)
check("G7", "approved and waiting: 'Assign: Aarav Mehta', Approved, Cancel still there; counted under Pending (still open)",
  pieces(rowFor(g6.id)) === "Monitor | Asset | 30 Sep | Assign: Aarav Mehta | Approved | Cancel" && (pill("Pending").click(), rows().some((tr) => tr.dataset.requestId === g6.id)));
pill("All").click();
R.closeAssetRequest(g6.id, AARAV, "No monitor is tagged yet");
await open(MYREQ, "arjun");
check("G8", "closed: who closed it, 'Closed', the note; only under All", pieces(rowFor(g6.id)) === "Monitor | Asset | 30 Sep | Aarav Mehta | Closed | No monitor is tagged yet"
  && (pill("Approved").click(), !rows().some((tr) => tr.dataset.requestId === g6.id)) && (pill("Rejected").click(), !rows().some((tr) => tr.dataset.requestId === g6.id)));
const g9 = R.submitAssetRequest(ARJUN, { assetType: "laptop", reason: "x" }).record;
R.decideAssetRequest(g9.id, SNEHA, "emp", "approve"); R.decideAssetRequest(g9.id, AARAV, "admin", "approve");
R.fulfilAssetRequest(g9.id, AARAV, "AST-0218");
await open(MYREQ, "arjun");
check("G9", "fulfilled: who handed it over, 'Fulfilled', no Cancel; counted under Approved", pieces(rowFor(g9.id)) === "Laptop | Asset | 30 Sep | Aarav Mehta | Fulfilled"
  && rowFor(g9.id).querySelector(".badge--success") && (pill("Approved").click(), rows().some((tr) => tr.dataset.requestId === g9.id)));
pill("All").click();
const g10 = R.submitAssetRequest(ARJUN, { assetType: "laptop", reason: "y" }).record;
R.decideAssetRequest(g10.id, SNEHA, "emp", "reject", "Wait for the refresh");
await open(MYREQ, "arjun");
check("G10", "rejected: who rejected it and the reason", pieces(rowFor(g10.id)) === "Laptop | Asset | 30 Sep | Sneha Rao | Rejected | Wait for the refresh");
await open(MYREQ, "rohan");
check("G11", "Rohan sees none of Arjun's requests", !rows().some((tr) => tr.dataset.requestId));
check("G12", "My requests' 'Request an asset' opens the form on my-assets.html", d.querySelector('.page-header__actions a[data-permission="assets:request"]').getAttribute("href") === "../inventory/my-assets.html#request");

// =====================================================================
section("H. The approvals inbox and the Approvals badge");
fresh();
await open(INBOX, "sneha");
const inboxRows = () => [...d.querySelectorAll("#inbox-table tbody tr")];
const inboxRow = (id) => d.querySelector(`#inbox-table tbody tr[data-request-id="${id}"]`);
check("H1", "Sneha: Arjun's laptop request is in her inbox (manager stage, buttons with no permission: by relationship); her badge counts it (claim + request + her reports' 2 leave requests = 4; Round 8C, was 2)",
  jsErrors.length === 0 && pieces(inboxRow("ARQ-1")) === "AK | Asset: Arjun Kapoor, laptop | Asset | Arjun Kapoor | Laptop, replaces AST-0188, manager stage | 13 days | Reject | Approve"
  && [...inboxRow("ARQ-1").querySelectorAll("button")].every((b) => !b.dataset.permission) && navCount() === "4", pieces(inboxRow("ARQ-1") ?? d.body).slice(0, 200));
clearToasts(); btn(inboxRow("ARQ-1"), "Approve").click();
check("H2", "Sneha approves: 'It goes to an Admin next', gone from her pending, her badge 3 (Round 8C, was 1)", j(lastToast()) === j({ type: "success", text: "Request approved. It goes to an Admin next." })
  && !inboxRow("ARQ-1") && navCount() === "3" && R.getAssetRequest("ARQ-1").stage === "admin");
const tab = (label) => [...d.querySelectorAll(".table__toolbar .tabs__tab")].find((p) => txt(p).startsWith(label));
tab("Approved").click();
check("H3", "her Approved tab: her own decision on it", pieces(inboxRow("ARQ-1")) === "AK | Asset: Arjun Kapoor, laptop | Asset | Arjun Kapoor | Laptop, replaces AST-0188, you approved it at the manager stage | 30 Sep");
const statVal = (label) => txt([...d.querySelectorAll(".stat-strip .stat")].find((s) => txt(s.querySelector(".stat__label")) === label)?.querySelector(".stat__value"));
check("H3b", "her stats count it: Approved this week 2 (it and her seeded RG-101 approval), Waiting for you 3 (the claim and her reports' 2 leave requests) (Round 8C; was 1 / 1)", statVal("Approved this week") === "2" && statVal("Waiting for you") === "3",
  `${statVal("Approved this week")} / ${statVal("Waiting for you")}`);
check("H4", "Recently decided lists it (this week)", [...d.querySelectorAll("#decided-table tbody tr")].some((tr) => pieces(tr) === "Asset: Arjun Kapoor, laptop | Asset | Arjun Kapoor | Approved | 30 Sep"));
await open(INBOX, "aarav");
check("H5", "Aarav: both requests now at the Admin stage, on assets:approve, oldest first among his asset rows",
  j(inboxRows().filter((tr) => tr.dataset.type === "asset").map((tr) => tr.dataset.requestId)) === j(["ARQ-1", "ARQ-2"])
  && [...inboxRow("ARQ-2").querySelectorAll("button")].every((b) => b.dataset.permission === "assets:approve" && !b.hidden));
const typeFilter = d.querySelector('.table__toolbar select[aria-label="Filter by type"]');
typeFilter.value = "asset"; typeFilter.dispatchEvent(new w.Event("change"));
check("H6", "the type filter has Asset now and shows only asset rows", [...typeFilter.options].some((o) => txt(o) === "Asset") && inboxRows().every((tr) => tr.dataset.type === "asset") && inboxRows().length === 2);
btn(inboxRow("ARQ-2"), "Reject").click();
await inModal("reject-asset-request-modal", "reject-asset-request-note", "No spare monitors this quarter");
check("H7", "Aarav rejects Ananya's in the inbox: a fixed toast, rejected with the note", j(lastToast()) === j({ type: "success", text: "Asset request rejected." }) && status("ARQ-2") === "rejected"
  && R.getAssetRequest("ARQ-2").history.at(-1).note === "No spare monitors this quarter");
await open(INBOX, "arjun");
check("H8", "Arjun has nothing to decide: no asset rows, no badge", !inboxRows().some((tr) => tr.dataset.type === "asset") && navCount() === "0");
await open(INBOX, "priya");
check("H9", "Priya (HR): no asset rows (not a manager of anyone asking, no assets:approve)", !inboxRows().some((tr) => tr.dataset.type === "asset"));
check("H10", "'Who approves what': asset requests are 'Manager, then an Admin' (no 'IT reviews')", [...d.querySelectorAll("#who-approves .kv__row")].some((r) => pieces(r) === "Asset requests | Manager, then an Admin") && !/IT reviews/.test(txt($("who-approves"))));
check("H11", "the 'headset for Neha Kulkarni' decided sample is gone; the other samples are kept", !/Neha Kulkarni|headset/.test(read(INBOX))
  && d.querySelectorAll("#decided-table tr[data-static]").length === 2 && d.querySelectorAll("#inbox-table tr[data-static]").length === 3);
fresh();
const pr = await (async () => { await open(INBOX, "aarav"); return R.submitAssetRequest(PRIYA, { assetType: "laptop", reason: "x" }).record; })();
await open(INBOX, "aarav");
clearToasts(); btn(inboxRow(pr.id), "Approve").click();
check("H12", "Priya's request: Aarav approves as her manager, and it comes back to him at the Admin stage, saying he approved it already",
  /You approved it at the manager stage on 30 Sep$/.test(txt(inboxRow(pr.id)?.children[3])) && j(lastToast()) === j({ type: "success", text: "Request approved. It goes to an Admin next." }));
// waitingCount() asks can() of whoever is signed in, so each count is taken under that person's own session.
const waiting = await import("./js/ui/waiting.js");
const counts = {};
for (const who of ["aarav", "sneha", "arjun", "priya", "kabir"]) {
  await open(DASH, who);
  counts[who] = [navCount(), String(waiting.waitingCount(WHO[who][2], WHO[who][0])), waiting.waitingFor(WHO[who][2], WHO[who][0]).assets.map((r) => r.id).join("+")];
}
check("H13", "the badge is ui/waiting.js's count, assets included, on every page (here the dashboard): Aarav has the two at the Admin stage, Sneha Arjun's",
  Object.values(counts).every(([shown, n]) => shown === n) && j(Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v[2]]))) === j({ aarav: `ARQ-2+${pr.id}`, sneha: "ARQ-1", arjun: "", priya: "", kabir: "" }), j(counts));
fresh();
await open(DASH, "rohan");
const sidebarHas = () => [...d.querySelectorAll(".nav__item")].some((a) => txt(a).startsWith("Approvals"));
const rohanBefore = sidebarHas();
const rq = R.submitAssetRequest(ARJUN, { assetType: "monitor", reason: "x" }).record;
// As if Rohan had been Arjun's manager when it was sent (a request keeps the manager it was sent to).
w.localStorage.setItem("officeos:asset-requests", w.localStorage.getItem("officeos:asset-requests").replace(/"managerId":"EMP-1029","appliedOn":"2026-09-30"/, `"managerId":"${ROHAN}","appliedOn":"2026-09-30"`));
await open(DASH, "rohan");
check("H14", "someone with an asset request waiting on them as its manager gets the Approvals item (as with expense claims)", !rohanBefore && sidebarHas() && navCount() === "1");

// =====================================================================
section("I. The employee dashboard");
fresh();
await open(DASH, "arjun");
const stat = () => [txt(d.querySelector('[data-stat="requests"] .stat__value')), txt(d.querySelector('[data-stat="requests"] .stat__delta'))];
const leavePending = (await import("./js/data/leave-store.js")).requestsFor(ARJUN).filter((r) => r.status === "pending").length;
// Round 14E part 4 (behaviour; was leave + 1 asset: Open requests counts what My requests lists under Pending, his pending expense claim too)
const claimsPending = (await import("./js/data/expenses-store.js")).expensesFor(ARJUN).filter((c) => c.status === "pending").length;
check("I1", "Open requests counts his real asset request, not a static '1 asset' added for everyone", jsErrors.length === 0 && j(stat()) === j([String(leavePending + claimsPending + 1), `${leavePending} leave, ${claimsPending} claim${claimsPending === 1 ? "" : "s"}, 1 asset`])
  && !d.querySelector("[data-static-count]"), j(stat()));
await open(DASH, "rohan");
check("I2", "Rohan has none: no asset in his count", !/asset/.test(stat()[1]));
check("I3", "the static 'Laptop upgrade / Sent to IT Support' line and activity are gone", !/IT Support|Laptop upgrade/.test(txt(d.querySelector("main"))));
fresh();
await open(DASH, "vikram");
R.submitAssetRequest(VIKRAM, { assetType: "laptop", reason: "x" });
await open(DASH, "vikram");
check("I4", "his newest pending request is the asset one: 'Laptop request', waiting for Aarav", pieces($("my-requests-list")) === "A | Laptop request | Waiting for Aarav Mehta | Pending", pieces($("my-requests-list")));
const vr = R.assetRequestsFor(VIKRAM)[0];
R.decideAssetRequest(vr.id, AARAV, "admin", "approve");
await open(DASH, "vikram");
check("I5", "approved and waiting for an asset: still open (counted), and in his updates", /1 asset/.test(stat()[1]) && /Your laptop request was approved/.test(txt($("updates"))));
R.fulfilAssetRequest(vr.id, AARAV, "AST-0218");
await open(DASH, "vikram");
check("I6", "fulfilled: no longer open; 'Your laptop request was fulfilled: AST-0218'", !/asset/.test(stat()[1]) && /Your laptop request was fulfilled: AST-0218/.test(txt($("updates"))));
fresh();
await open(DASH, "arjun");
R.decideAssetRequest("ARQ-1", SNEHA, "emp", "approve");
await open(DASH, "arjun");
check("I7", "a manager's approval alone isn't shown as the answer (still pending at the Admin stage)", !/laptop request was/.test(txt($("updates"))));
R.decideAssetRequest("ARQ-1", AARAV, "admin", "reject", "No");
await open(DASH, "arjun");
check("I8", "rejected: shown with the danger dot", [...$("updates").children].some((i) => /Your laptop request was rejected/.test(txt(i)) && i.querySelector(".activity__dot--danger")));

// =====================================================================
section("J. The adjacent pages");
check("J1", "approval-workflows.html: Asset request is Employee -> Manager -> Admin (no IT Support step)", (() => {
  const doc = new JSDOM(read("access/approval-workflows.html")).window.document;
  const row = [...doc.querySelectorAll("tr")].find((tr) => /^Asset request/.test(txt(tr.children[0]) ?? ""));
  return j([...row.querySelectorAll(".chain__step")].map(txt)) === j(["Employee", "Manager", "Admin"]);
})());
check("J2", "notifications.html: the laptop request is with your manager, not IT Support", /Your laptop request is with your manager/.test(read("account/notifications.html")) && !/request is with IT Support|Checking stock and device age/.test(read("account/notifications.html")));
// Round 9P (behaviour; was: allowed one line, the workflows table's Backup restore chain starting at "IT Support",
// 9N's version; 9N had already withdrawn 6E's allowance for the inbox's backup-restore samples): that chain now starts
// at Admin, the only role holding backup:restore, so none of these seven pages may mention "IT Support" at all.
check("J3", "no 'IT Support' left anywhere about asset requests (Round 9P: on none of these seven pages, the workflows' Backup restore chain included)",
  ["requests/approvals-inbox.html", "requests/my-requests.html", "dashboard/employee.html", "inventory/my-assets.html", "inventory/asset-assignment.html", "account/notifications.html", "access/approval-workflows.html"]
    .every((p) => !/IT Support/.test(read(p))));
fresh();
await open(USERS, "aarav");
R.submitAssetRequest(ROHAN, { assetType: "laptop", reason: "x" });
const resetBtn = btn(d, "Reset demo data");
resetBtn.click();
// Round 13N (behaviour; M1.3: the list goes on to deleted people's names, so asset requests are no longer last)
check("J4", "Reset demo data also resets asset requests (and says so)", /expense claims, inventory, asset requests and /.test(confirms[0]) && R.allAssetRequests().length === 2);

// =====================================================================
section("K. Access");
check("K1", "no new permission: assets:request / view-own / report for every role (SELF_SERVICE), assets:approve Admin only",
  j(PERMISSIONS.assets) === j(["view-own", "assign", "approve", "report", "request", "view"]) && (await import("./js-pre6F/config/permissions.js")).ALL_PERMISSIONS.length === 76
  && ["hr", "fin", "emp"].every((r) => ["assets:request", "assets:view-own", "assets:report"].every((p) => ROLES[r].permissions.includes(p)) && !ROLES[r].permissions.includes("assets:approve")));
check("K2", "routes and nav unchanged: my-assets on assets:view-own, the inbox personal (null)", ROUTES["inventory/my-assets.html"] === "assets:view-own" && ROUTES["requests/approvals-inbox.html"] === null
  && ROUTES["requests/my-requests.html"] === "requests:view-own");
await open(MINE, "kabir");
check("K3", "Finance (Kabir) can request too (his manager Aarav, then an Admin)", (($("request-asset-btn").click(), txt($("request-chain")))) === "Your request goes to Aarav Mehta, then an Admin. Once it's approved, an asset is assigned to you.");
await open(MINE, null);
check("K4", "signed out: redirected, the form isn't wired", navigations.length > 0 && !isOpen("request-modal"));

// =====================================================================
section("L. Source layout");
// What 6E changed, read from 6E's result frozen (js-pre6F / html-pre6F); 6F's own changes are vendorpages L1 / L2.
const lf = (p) => src("js-pre6F", p).replace(/\r\n/g, "\n");
const lfPre = (p) => src("js-pre6E", p).replace(/\r\n/g, "\n");
const walk = (dir) => fs.readdirSync(new URL(`./${dir}/`, import.meta.url), { recursive: true }).filter((f) => /\.js$/.test(f)).map((f) => f.replace(/\\/g, "/")).sort();
const changedJs = walk("js-pre6F").filter((p) => !fs.existsSync(new URL(`./js-pre6E/${p}`, import.meta.url)) || lf(p) !== lfPre(p));
check("L1", "js: the new store and view, waiting.js, sidebar.js, leave-decision.js and five page scripts; no other store, rule or config file",
  j(changedJs) === j(["data/asset-requests-store.js", "pages/approvals-inbox.js", "pages/asset-assignment.js", "pages/employee-dashboard.js", "pages/my-assets.js", "pages/my-requests.js",
    "pages/users-list.js", "ui/asset-request-view.js", "ui/leave-decision.js", "ui/sidebar.js", "ui/waiting.js"]), j(changedJs));
const htmlWalk = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => /\.html$/.test(f)).map((f) => f.replace(/\\/g, "/")).sort();
const preDir = new URL("./html-pre6E/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const dir6E = new URL("./html-pre6F/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read6E = (p) => fs.readFileSync(`${dir6E}/${p}`, "utf8");
const changedHtml = htmlWalk(dir6E).filter((p) => read6E(p) !== fs.readFileSync(`${preDir}/${p}`, "utf8"));
check("L2", "pages: the seven with asset-request content", j(changedHtml) === j(["access/approval-workflows.html", "account/notifications.html", "dashboard/employee.html",
  "inventory/asset-assignment.html", "inventory/my-assets.html", "requests/approvals-inbox.html", "requests/my-requests.html"]), j(changedHtml));
check("L3", "the leave-decision change is only the optional submit label (default 'Reject request')", lfPre("ui/leave-decision.js").split("\n").filter((l) => !lf("ui/leave-decision.js").split("\n").includes(l))
  .every((l) => /"Reject request"\);/.test(l)) && /labels\.submit \?\? "Reject request"/.test(lf("ui/leave-decision.js")));
const NEW = ["data/asset-requests-store.js", "ui/asset-request-view.js", "pages/my-assets.js", "pages/asset-assignment.js", "pages/my-requests.js", "pages/approvals-inbox.js", "pages/employee-dashboard.js"];
const code = (p) => lf(p).split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");   // comments may name innerHTML
check("L4", "no innerHTML in the new or changed page scripts", NEW.every((p) => !/innerHTML|insertAdjacentHTML|outerHTML/.test(code(p))));
check("L5", "the store reuses managerFor(), expenses.js's nextStage / firstStage and inventory-store's assignAsset (no copies of them)",
  /import \{ managerFor \} from "\.\/leave-store\.js"/.test(lf("data/asset-requests-store.js")) && /import \{ nextStage, firstStage \} from "\.\/expenses\.js"/.test(lf("data/asset-requests-store.js"))
  && /assignAsset\(actorUserId, assetTag, handOver\)/.test(lf("data/asset-requests-store.js")) && !/function (nextStage|firstStage|managerFor|resolveManager)/.test(lf("data/asset-requests-store.js")));
check("L6", "every page decides through ui/asset-request-view.js's flows (one decide path)", ["pages/asset-assignment.js", "pages/approvals-inbox.js"].every((p) => /assetRequestFlow\./.test(lf(p)) && !/decideAssetRequest/.test(lf(p))));
const files = [...walk("js-pre6F").filter((p) => changedJs.includes(p)).map((p) => src("js-pre6F", p)), ...changedHtml.map(read6E)];
check("L7", "the changed files: CRLF only, no final newline", files.every((t) => !/[^\r]\n/.test(t) && !t.endsWith("\n")));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
