// usage: node closeout.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 6I: the leftover items. ./js-pre6I, ./html-pre6I and ./css-pre6I are the code, pages and styles before this
// round (6H's result, c9d5973). Fixed clock: Wed 30 Sep 2026 11:00 local, unless a check moves it.
//   A  item 1: expenseTotals() and inherited names (the read side; before 6I it wrote onto built-ins)
//   B  item 2: approval-workflows.html's stat strip, from the four built workflows' stores
//   C  item 3, the store: reportProblem / closeReport / openReportOf; Return and Send for repair close a report
//   D  item 3, my-assets.html: Report a problem and Report issue
//   E  item 3, asset-assignment.html: the badge, the alert and the Update modal
//   G  who can open what;  L  source layout
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const ASSIGN = "inventory/asset-assignment.html", MINE = "inventory/my-assets.html", FLOWS = "access/approval-workflows.html";
const SCRIPT = { [ASSIGN]: "asset-assignment", [MINE]: "my-assets", [FLOWS]: "approval-workflows" };

const RealDate = Date;
let NOW = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
const setClock = (y, m, d) => { NOW = new RealDate(y, m - 1, d, 11, 0, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ROHAN = "EMP-1042", DIVYA = "EMP-1061", ARJUN = "EMP-1105";
const WHO = {
  aarav: ["admin", "Aarav Mehta", AARAV], priya: ["hr", "Priya Nair", PRIYA], kabir: ["fin", "Kabir Shah", KABIR],
  arjun: ["emp", "Arjun Kapoor", ARJUN], rohan: ["emp", "Rohan Gupta", ROHAN], nobody: null,
};

let loads = 0, w = null, d = null, saved = {}, jsErrors = [], navigations = [], htmlWrites = [];
async function open(page, who, query = "") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = []; navigations = []; htmlWrites = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else jsErrors.push(e.message); });
  const dom = new JSDOM(read(page), { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.HTMLAnchorElement.prototype.click = function () {};
  w.HTMLElement.prototype.scrollIntoView = function () {};
  const proto = w.Element.prototype;
  const inner = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", { get: inner.get, set(v) { htmlWrites.push(String(v)); inner.set.call(this, v); }, configurable: true });
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  const auth = await import("./js/core/auth.js");
  if (WHO[who]) auth.signIn(...WHO[who]); else auth.signOut();
  await import(`./js/app.js?load=${loads}`);
  if (navigations.length) return;
  try { await import(`./js/pages/${SCRIPT[page]}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;

// A page must be open before the stores are first read (they need localStorage).
await open(MINE, "arjun");
const I = await import("./js/data/inventory-store.js");
const E = await import("./js/data/expenses-store.js");
const S = await import("./js/data/store.js");
const L = await import("./js/data/leave-store.js");

// ---- readers ----
const $ = (id) => d.getElementById(id);
const statOf = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return s ? [txt(s.querySelector(".stat__value")), txt(s.querySelector(".stat__delta")), s.querySelector(".stat__delta")?.className] : null; };
const typeIn = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event("input", { bubbles: true })); };
const choose = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event("change", { bubbles: true })); };
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => ({ type: t.className.replace("toast toast--", ""), text: txt(t.querySelector(".toast__text")) }));
const clearToasts = () => d.querySelectorAll(".toast").forEach((t) => t.remove());
const errorAt = (id) => txt($(id)?.closest(".form-field")?.querySelector(".form-error"));
const errors = () => [...d.querySelectorAll(".form-error")].map(txt);
const submit = (formId) => { clearToasts(); $(formId).querySelector('[type="submit"]').click(); };
const isOpen = (id) => $(id)?.classList.contains("is-open") ?? false;
const options = (id) => [...$(id).options].map((o) => [o.value, txt(o), o.disabled]);
const mineRow = (tag) => [...($("my-asset-rows")?.children ?? [])].find((tr) => tr.dataset.tag === tag);
const regRow = (tag) => [...($("asset-rows")?.children ?? [])].find((tr) => tr.dataset.tag === tag);
const btnIn = (scope, label) => [...(scope?.querySelectorAll("button") ?? [])].find((b) => txt(b) === label) ?? null;
const reportBadgeIn = (tr) => [...(tr?.querySelectorAll(".badge") ?? [])].find((b) => txt(b) === "Problem reported") ?? null;
const last = (tag) => I.getAsset(tag).history.at(-1);

// =====================================================================
section("A. Item 1: expenseTotals() and inherited names");
const claim = (category, status = "pending", amount = 100) => ({ category, status, amount });
const before = { proto: Object.prototype.count, ctor: Object.count, str: Object.prototype.toString.count };
const odd = [claim("constructor"), claim("__proto__", "approved", 200), claim("toString", "paid", 300), claim("hasOwnProperty", "constructor", 400), claim("travel", "__proto__", 500)];
let totals = null, threw = null;
try { totals = E.expenseTotals(odd); } catch (e) { threw = e.message; }
check("A1", "inherited-name categories and statuses don't throw, and write nothing onto Object.prototype, Object or a built-in",
  threw === null && Object.prototype.count === before.proto && Object.count === before.ctor && Object.prototype.toString.count === before.str && ({}).count === undefined, threw ?? "");
check("A2", "they still count in the overall figures (5 claims, ₹1,500), in no category or status of their own; travel's own one counts as travel",
  totals.count === 5 && totals.amount === 1500 && totals.byCategory.travel.count === 1 && totals.byCategory.travel.amount === 500
  && Object.values(totals.byCategory).reduce((a, t) => a + t.count, 0) === 1 && totals.byStatus.pending.count === 1 && totals.byStatus.approved.count === 1 && totals.byStatus.paid.count === 1
  && !Object.hasOwn(totals.byCategory, "constructor") && !Object.hasOwn(totals.byStatus, "__proto__"), j([totals.count, totals.amount]));
const seedTotals = E.expenseTotals(E.allExpenses());
check("A3", "the seed's totals are unchanged by the guard (7 claims; every category and status present)",
  seedTotals.count === 7 && Object.keys(seedTotals.byCategory).length === Object.keys((await import("./js/data/expenses.js")).CATEGORIES).length
  && j(Object.keys(seedTotals.byStatus)) === j(["pending", "approved", "paid", "rejected", "cancelled"]));
check("A4", "the write side still refuses them (6G): submitExpense with category 'constructor' stores nothing",
  !E.submitExpense(ARJUN, { category: "constructor", amount: 100, date: "2026-09-29", reason: "x" }).ok && E.allExpenses().length === 7);
// Before 6I the same input wrote onto built-ins (6G's finding, and worse for "__proto__"). Shown on the frozen copy, then undone.
const OLD = await import("./js-pre6I/data/expenses-store.js");
OLD.expenseTotals([claim("__proto__")]);
const polluted = Object.hasOwn(Object.prototype, "count");
delete Object.prototype.count; delete Object.prototype.amount;
check("A5", "(before 6I, for the record: a '__proto__' category set count on Object.prototype itself; undone here)", polluted && ({}).count === undefined);

// =====================================================================
section("B. Item 2: approval-workflows.html's stat strip");
fresh(); await open(FLOWS, "aarav");
check("B1", "30 Sep: 20 requests sent this month, '+18 vs August' (2 in August), up",
  j(statOf("requests")) === j(["20", "+18 vs August", "stat__delta stat__delta--up"]) && jsErrors.length === 0, j(statOf("requests")) + jsErrors);
check("B2", "average decision time 1.1 days, over the 9 decided requests (sent to final decision; none auto-approved in the seed)",
  j(statOf("decision")) === j(["1.1 days", "Over 9 decisions", "stat__delta"]), j(statOf("decision")));
check("B3", "'Waiting over 2 days' replaces Escalated: 14 of the 14 pending requests were sent more than 2 days ago; down",
  j(statOf("waiting")) === j(["14", "Of 14 requests waiting for a decision", "stat__delta stat__delta--down"]), j(statOf("waiting")));
const strip = txt(d.querySelector(".stat-strip"));
// Round 12Z (behavior; was "4 active, 5 not built yet"): Salary revision and Payroll run are Active (salinbox.mjs W3)
check("B4", "no invented figure or concept is left: no 184, +22, 1.4 days, 'Target is', 'Escalated'; the Workflows tile counts the table (Round 7C: 9; 12Z: 6 active, 3 not built yet; was 8 / 4)",
  !/184|\+22|1\.4 days|Target is|Escalated|Waited over/.test(strip) && /Workflows 9 6 active, 3 not built yet/.test(strip), strip);
// The figures follow the stores: a leave request sent today is counted, and waits (not yet over 2 days).
const ok1 = L.applyLeave(ARJUN, { type: "casual", from: "2026-10-12", to: "2026-10-12", duration: "full", reason: "Errand" });
await open(FLOWS, "aarav");
check("B5", "a leave request sent today is counted on the next load (21, '+19 vs August'); 15 pending, still 14 over 2 days",
  ok1.ok && j(statOf("requests")) === j(["21", "+19 vs August", "stat__delta stat__delta--up"]) && j(statOf("waiting").slice(0, 2)) === j(["14", "Of 15 requests waiting for a decision"]),
  `${ok1.error ?? ""} ${j(statOf("requests"))} ${j(statOf("waiting"))}`);
// An Admin's own asset request is auto-approved when sent: counted as sent, never as a decision.
const R = await import("./js/data/asset-requests-store.js");
const auto = R.submitAssetRequest(AARAV, { assetType: "monitor", reason: "A second screen" });
await open(FLOWS, "aarav");
check("B8", "an auto-approved request (an Admin's own) is counted as sent (22) but left out of the average (still over 9 decisions)",
  auto.ok && auto.record.status === "approved" && statOf("requests")[0] === "22" && j(statOf("decision")) === j(["1.1 days", "Over 9 decisions", "stat__delta"]), `${auto.error ?? ""} ${j(statOf("decision"))}`);
// A decision on a pending request is counted the moment it's made: Priya approves Arjun's errand.
L.decideLeave(ok1.record.id, "EMP-1029", "emp", "approve");   // Round 8C (setup): Sneha, the requester's manager, approves first (her approval isn't the final decision)
const decided = L.decideLeave(ok1.record.id, PRIYA, "hr", "approve");
await open(FLOWS, "aarav");
check("B10", "a request decided today joins the average (over 10 decisions) and leaves the waiting count (Of 14)",
  decided.ok && statOf("decision")[1] === "Over 10 decisions" && statOf("waiting")[1] === "Of 14 requests waiting for a decision", `${decided.error ?? ""} ${j(statOf("decision"))}`);
setClock(2027, 1, 15);
fresh(); await open(FLOWS, "aarav");
// The attendance seed is made relative to today, so January has its own corrections; the rest stay in 2026.
const A = await import("./js/data/attendance-store.js");
const sentIn = (month) => [...L.allRequests(), ...A.allRegularizations(), ...E.allExpenses(), ...R.allAssetRequests()].filter((r) => r.appliedOn.startsWith(month)).length;
const jan = await sentIn("2027-01"), dec = await sentIn("2026-12");
check("B6", "15 Jan 2027: this month is January, compared with December (the year wraps back to 2026-12)",
  jan > 0 && j(statOf("requests")) === j([String(jan), `+${jan - dec} vs December`, "stat__delta stat__delta--up"]), `${jan}/${dec} ${j(statOf("requests"))}`);
// 15 Oct 2026: fewer sent in October than in September, so the change is negative, with a real minus sign, and down.
setClock(2026, 10, 15);
fresh(); await open(FLOWS, "aarav");
const oct = sentIn("2026-10"), sep = sentIn("2026-09");
check("B11", "15 Oct 2026: fewer than September: '−N vs September' (a minus sign, not a hyphen), down",
  oct < sep && j(statOf("requests")) === j([String(oct), `−${sep - oct} vs September`, "stat__delta stat__delta--down"]), `${oct}/${sep} ${j(statOf("requests"))}`);
// Near midnight the local day (appliedOn) and the UTC timestamp can fall in different months: a request sent at
// 23:30 on 30 Sep is September's, one at 00:30 on 1 Oct is October's, wherever the office is (India: the second is
// 30 Sep in UTC; Los Angeles: the first is 1 Oct in UTC). The month is the local one.
fresh(); await open(FLOWS, "aarav");
NOW = new RealDate(2026, 8, 30, 23, 30, 0).getTime();
const late = L.applyLeave(ARJUN, { type: "casual", from: "2026-10-12", to: "2026-10-12", duration: "full", reason: "Late send" });
NOW = new RealDate(2026, 9, 1, 0, 30, 0).getTime();
const early = L.applyLeave(ARJUN, { type: "casual", from: "2026-10-13", to: "2026-10-13", duration: "full", reason: "Early send" });
setClock(2026, 10, 2);
await open(FLOWS, "aarav");
const oct2 = sentIn("2026-10"), sep2 = sentIn("2026-09");
check("B12", "requests sent at 23:30 on 30 Sep and 00:30 on 1 Oct (local) count in September and October, by the local day",
  late.ok && early.ok && late.record.appliedOn === "2026-09-30" && early.record.appliedOn === "2026-10-01"
  && j(statOf("requests").slice(0, 2)) === j([String(oct2), oct2 === sep2 ? "Same as September" : `${oct2 > sep2 ? "+" : "−"}${Math.abs(oct2 - sep2)} vs September`]),
  `${late.error ?? ""}${early.error ?? ""} ${oct2}/${sep2} ${j(statOf("requests"))}`);
setClock(2026, 9, 30);
for (const key of ["leave-requests", "regularizations", "expense-claims", "asset-requests"]) w.localStorage.setItem(`officeos:${key}`, JSON.stringify({ version: 1, nextNum: 1, records: [] }));
await open(FLOWS, "aarav");
check("B7", "with no requests at all: '0' 'Same as August'; '—' 'No decisions yet'; '0' 'Nothing waiting for a decision'",
  j([statOf("requests"), statOf("decision"), statOf("waiting")]) === j([["0", "Same as August", "stat__delta"], ["—", "No decisions yet", "stat__delta"], ["0", "Nothing waiting for a decision", "stat__delta"]]),
  j([statOf("requests"), statOf("decision"), statOf("waiting")]));
check("B9", "the static strip holds no figure ('—' until the script runs), and the page loads its script after app.js",
  ["requests", "decision", "waiting"].every((k) => new RegExp(`data-stat="${k}"[\\s\\S]*?<strong class="stat__value">—</strong>`).test(read(FLOWS)))
  && /app\.js"><\/script>\r?\n<script type="module" src="\.\.\/\.\.\/assets\/js\/pages\/approval-workflows\.js"><\/script>/.test(read(FLOWS)));

// =====================================================================
section("C. Item 3, the store");
fresh(); await open(MINE, "arjun");
const moves0 = I.allMovements().length;
const a188 = I.getAsset("AST-0188");
check("C1", "the seed has no open report", I.assetsWithOpenReports().length === 0 && I.allAssets().every((a) => I.openReportOf(a) === null));
const r1 = I.reportProblem(ARJUN, "AST-0188", "  Battery lasts under an hour  ");
const e1 = last("AST-0188");
check("C2", "Arjun reports his laptop: one 'reported' history entry (by him, holder him, no movement, note trimmed)",
  r1.ok && e1.action === "reported" && e1.byUserId === ARJUN && e1.holderId === ARJUN && e1.movementId === null && e1.note === "Battery lasts under an hour"
  && I.getAsset("AST-0188").history.length === a188.history.length + 1, j(r1.error ?? e1));
check("C3", "Q4: status, condition, holder and since unchanged; no stock movement", ["status", "condition", "holderId", "since", "location"].every((k) => I.getAsset("AST-0188")[k] === a188[k]) && I.allMovements().length === moves0);
check("C4", "openReportOf gives that entry; assetsWithOpenReports lists the asset", j(I.openReportOf(I.getAsset("AST-0188"))) === j(e1) && j(I.assetsWithOpenReports().map((a) => a.id)) === j(["AST-0188"]));
const refuse = (r) => [r.ok, r.error, r.field ?? null];
check("C5", "one open report per asset: a second is refused at the asset field, and stores nothing",
  j(refuse(I.reportProblem(ARJUN, "AST-0188", "Also the hinge"))) === j([false, "You've already reported a problem with AST-0188. An Admin will look at it.", "tag"]) && I.getAsset("AST-0188").history.length === a188.history.length + 1);
check("C6", "refused: no asset chosen; someone else's asset; an asset in repair; an unknown or inherited tag; an empty note",
  j([refuse(I.reportProblem(ARJUN, "", "x")), refuse(I.reportProblem(ARJUN, "AST-0119", "x")), refuse(I.reportProblem(ARJUN, "AST-0099", "x")),
    refuse(I.reportProblem(ARJUN, "AST-9999", "x")), refuse(I.reportProblem(ARJUN, "constructor", "x")), refuse(I.reportProblem(ARJUN, "AST-0302", "   "))])
  === j([[false, "Choose an asset.", "tag"], [false, "You can only report a problem with equipment assigned to you.", "tag"], [false, "You can only report a problem with equipment assigned to you.", "tag"],
    [false, "You can only report a problem with equipment assigned to you.", "tag"], [false, "You can only report a problem with equipment assigned to you.", "tag"], [false, "Say what's wrong with it.", "note"]]));
check("C7", "refused for someone inactive (Divya) or not on the list", !I.reportProblem(DIVYA, "AST-0188", "x").ok && I.reportProblem(DIVYA, "AST-0188", "x").error === "You can't report problems with equipment." && !I.reportProblem("EMP-0000", "AST-0188", "x").ok);
check("C8", "closeReport: refused for non-Admins (assets:assign), without a note, or with no open report",
  j([refuse(I.closeReport(PRIYA, "AST-0188", "x")), refuse(I.closeReport(ARJUN, "AST-0188", "x")), refuse(I.closeReport(AARAV, "AST-0188", " ")), refuse(I.closeReport(AARAV, "AST-0302", "x"))])
  === j([[false, "You can't close problem reports.", null], [false, "You can't close problem reports.", null], [false, "Say what was done about it.", "note"], [false, "AST-0302 has no open problem report.", null]]));
const c1 = I.closeReport(AARAV, "AST-0188", "Battery recalibrated; fine now");
check("C9", "Aarav closes it: a 'report-closed' entry (by him, holder Arjun, no movement); no open report; asset untouched",
  c1.ok && last("AST-0188").action === "report-closed" && last("AST-0188").byUserId === AARAV && last("AST-0188").holderId === ARJUN && last("AST-0188").movementId === null
  && I.openReportOf(I.getAsset("AST-0188")) === null && I.getAsset("AST-0188").status === "assigned" && I.allMovements().length === moves0);
check("C10", "a closed report can be followed by a new one", I.reportProblem(ARJUN, "AST-0188", "Battery again").ok && I.openReportOf(I.getAsset("AST-0188"))?.note === "Battery again");
const len = I.getAsset("AST-0188").history.length;
check("C11", "Send for repair closes it with its own entry only (no extra 'report-closed')",
  I.sendForRepair(AARAV, "AST-0188", "Battery again").ok && I.openReportOf(I.getAsset("AST-0188")) === null && I.getAsset("AST-0188").history.length === len + 1 && last("AST-0188").action === "sent-to-repair");
I.reportProblem(ARJUN, "AST-0302", "Dead pixels");
check("C12", "Return to the store closes it too", I.returnAsset(AARAV, "AST-0302", { condition: "fair", location: "store-a" }).ok && I.openReportOf(I.getAsset("AST-0302")) === null);
I.reportProblem(ROHAN, "AST-0119", "Keyboard sticks");
I.reportProblem(ARJUN, "AST-0455", "Card stopped working");
check("C13", "assetsWithOpenReports: both open reports (same instant here; E3 checks the order by time)", j(I.assetsWithOpenReports().map((a) => a.id).sort()) === j(["AST-0119", "AST-0455"]));
check("C14", "openReportOf is null for an asset with no history, a missing asset, or one assigned before the register", I.openReportOf(null) === null && I.openReportOf({ history: [] }) === null && I.openReportOf({}) === null);

// =====================================================================
section("D. Item 3, my-assets.html");
fresh(); await open(MINE, "arjun");
const headerBtn = $("report-btn");
check("D1", "header 'Report a problem': real (assets:report, no placeholder), enabled; rows' 'Report issue' carry their tag; no JS errors",
  headerBtn && headerBtn.dataset.permission === "assets:report" && !headerBtn.dataset.notImplemented && !headerBtn.disabled && !headerBtn.hidden
  && j([...$("my-asset-rows").querySelectorAll("button")].map((b) => [txt(b), b.dataset.reportTag, b.disabled])) === j([["Report issue", "AST-0188", false], ["Report issue", "AST-0302", false], ["Report issue", "AST-0455", false]])
  && jsErrors.length === 0, jsErrors.join(" | "));
headerBtn.click();
check("D2", "the header button opens the form: his three assets to choose from, none chosen; the form is novalidate",
  isOpen("report-modal") && $("report-form").noValidate && $("p-tag").value === ""
  && j(options("p-tag")) === j([["", "Choose an asset", false], ["AST-0188", "AST-0188, Dell Latitude 5420", false], ["AST-0302", "AST-0302, Dell 24\" monitor", false], ["AST-0455", "AST-0455, Office access card", false]]), j(options("p-tag")));
submit("report-form");
check("D3", "sending empty: 'Choose an asset.' at the asset field only; nothing stored; the form stays open", errorAt("p-tag") === "Choose an asset." && errors().length === 1 && I.assetsWithOpenReports().length === 0 && isOpen("report-modal"));
choose("p-tag", "AST-0302");
check("D4", "choosing clears that error", errors().length === 0);
submit("report-form");
check("D5", "no note: 'Say what's wrong with it.' at the note", errorAt("p-note") === "Say what's wrong with it." && errors().length === 1 && I.assetsWithOpenReports().length === 0);
typeIn("p-note", "<img src=x onerror=alert(1)> flickers");
check("D6", "typing clears it", errors().length === 0);
submit("report-form");
const row302 = mineRow("AST-0302");
check("D7", "sent: toast, form closed; the row's button is a disabled 'Reported' (tooltip: day and note), with no badge (it would widen the table at 1280)",
  j(toasts()) === j([{ type: "success", text: "Problem reported. An Admin will look at it." }]) && !isOpen("report-modal") && !reportBadgeIn(row302) && btnIn(row302, "Reported")?.disabled === true
  && btnIn(row302, "Reported").title === "Reported 30 Sep 2026: <img src=x onerror=alert(1)> flickers. An Admin will look at it." && !d.querySelector("#my-asset-rows img"), j(toasts()));
btnIn(mineRow("AST-0188"), "Report issue").click();
check("D8", "a row's 'Report issue' opens the form with that asset chosen; the reported one is listed but can't be chosen",
  isOpen("report-modal") && $("p-tag").value === "AST-0188" && j(options("p-tag")[2]) === j(["AST-0302", "AST-0302, Dell 24\" monitor (already reported)", true]));
await open(MINE, "arjun");
check("D9", "it stays reported on the next load; the other rows are unaffected", btnIn(mineRow("AST-0302"), "Reported")?.disabled === true && btnIn(mineRow("AST-0188"), "Report issue")?.disabled === false);
I.closeReport(AARAV, "AST-0302", "Replaced the cable");
await open(MINE, "arjun");
check("D10", "once an Admin closes it, the row is back to 'Report issue', enabled, no tooltip", btnIn(mineRow("AST-0302"), "Report issue")?.disabled === false && !btnIn(mineRow("AST-0302"), "Report issue").title);
await open(MINE, "kabir");
check("D11", "someone holding nothing (Kabir): the header button is disabled; no rows to report on", I.assetsFor(KABIR).length === 0 && $("report-btn").disabled && $("my-asset-rows").querySelectorAll("button").length === 0);
await open(MINE, "rohan");
check("D12", "Rohan's form offers only his own asset", (() => { $("report-btn").click(); return j(options("p-tag").map((o) => o[0])) === j(["", "AST-0119"]); })());
check("D13", "nothing on my-assets is drawn through innerHTML", !htmlWrites.some((h) => /report|Problem|AST-/.test(h)));

// =====================================================================
section("E. Item 3, asset-assignment.html");
fresh(); await open(ASSIGN, "aarav");
check("E1", "no reports: no badge, the report alert hidden; the Update modal for an assigned asset offers only Return / Send for repair",
  [...$("asset-rows").children].every((tr) => !reportBadgeIn(tr)) && $("report-alert")?.hidden === true && jsErrors.length === 0
  && (() => { btnIn(regRow("AST-0188"), "Update").click(); return $("u-report").hidden && j(options("u-action").map((o) => o[0])) === j(["return", "repair"]); })());
// Arjun reports at 09:00, Rohan at 10:30: Arjun's is older though his tag sorts later.
NOW = new RealDate(2026, 8, 30, 9, 0, 0).getTime(); I.reportProblem(ARJUN, "AST-0188", "Battery lasts under an hour");
NOW = new RealDate(2026, 8, 30, 10, 30, 0).getTime(); I.reportProblem(ROHAN, "AST-0119", "Keyboard sticks");
setClock(2026, 9, 30);
await open(ASSIGN, "aarav");
check("E2", "reported rows show 'Problem reported' by their status (tooltip: day and note); others don't",
  reportBadgeIn(regRow("AST-0188"))?.title === "Reported 30 Sep 2026: Battery lasts under an hour" && !!reportBadgeIn(regRow("AST-0119")) && !reportBadgeIn(regRow("AST-0302")));
check("E3", "the alert lists them, oldest report first, with holder and day, and says how to settle them",
  $("report-alert")?.hidden === false && txt($("report-alert")) === "2 assets have a problem reported: AST-0188 (Arjun Kapoor, 30 Sep 2026), AST-0119 (Rohan Gupta, 30 Sep 2026). Open Update to send them for repair, take them back, or close the report.", txt($("report-alert")));
btnIn(regRow("AST-0188"), "Update").click();
check("E4", "Update shows the report and adds 'Close the report, no action needed' after Return / Send for repair",
  !$("u-report").hidden && txt($("u-report")) === "Arjun Kapoor reported a problem on 30 Sep 2026: Battery lasts under an hour"
  && j(options("u-action").map((o) => o[0])) === j(["return", "repair", "close-report"]) && txt($("u-note-label")) === "What's wrong?");
choose("u-action", "repair");
check("E5", "Send for repair: what's wrong starts as the report's text", !$("u-note-field").hidden && $("u-cond-field").hidden && $("u-note").value === "Battery lasts under an hour" && txt($("u-note-label")) === "What's wrong?");
choose("u-action", "close-report");
check("E6", "Close the report: the note empties and asks 'What was done?'; condition and location hidden",
  $("u-note").value === "" && txt($("u-note-label")) === "What was done?" && !$("u-note-field").hidden && $("u-cond-field").hidden && $("u-loc-field").hidden);
typeIn("u-note", "Checked: battery fine");
choose("u-action", "repair"); choose("u-action", "close-report");
check("E7", "a note typed by hand is kept when the action changes", $("u-note").value === "Checked: battery fine");
typeIn("u-note", "  ");
submit("asset-modal-form");
check("E8", "closing with no note: 'Say what was done about it.' at the note; still open", errorAt("u-note") === "Say what was done about it." && I.openReportOf(I.getAsset("AST-0188")) !== null && isOpen("asset-modal"));
typeIn("u-note", "Checked: battery fine");
submit("asset-modal-form");
check("E9", "closed: toast, badge gone, the alert down to one, the asset still Arjun's",
  j(toasts()) === j([{ type: "success", text: "AST-0188 problem report closed." }]) && !reportBadgeIn(regRow("AST-0188")) && /^1 asset has a problem reported: AST-0119 \(Rohan Gupta/.test(txt($("report-alert")))
  && I.getAsset("AST-0188").holderId === ARJUN && last("AST-0188").note === "Checked: battery fine", j(toasts()));
btnIn(regRow("AST-0119"), "Update").click(); choose("u-action", "repair");
submit("asset-modal-form");
check("E10", "Send for repair from the modal (report's text as the note) settles the last one: alert hidden, in repair",
  I.getAsset("AST-0119").status === "in-repair" && last("AST-0119").note === "Keyboard sticks" && $("report-alert")?.hidden === true && I.assetsWithOpenReports().length === 0);
btnIn(regRow("AST-0119"), "Update").click();
check("E11", "in repair: only Back from repair (no report option); the report box hidden", j(options("u-action").map((o) => o[0])) === j(["repaired"]) && $("u-report").hidden);
I.reportProblem(ARJUN, "AST-0302", "<b>bold</b> & co");
await open(ASSIGN, "aarav");
btnIn(regRow("AST-0302"), "Update").click();
check("E12", "a report's text is shown as text (badge, alert, modal), never as markup", txt($("u-report")).endsWith(": <b>bold</b> & co") && !d.querySelector("#u-report b, #report-alert b, #asset-rows b")
  && reportBadgeIn(regRow("AST-0302")).title.endsWith(": <b>bold</b> & co") && !htmlWrites.some((h) => /bold/.test(h)));

// =====================================================================
section("G. Who can open what");
for (const who of ["priya", "kabir", "arjun"]) {
  fresh(); await open(FLOWS, who);
  check(`G1${who[0]}`, `approval-workflows.html (workflows:view, Admin): ${who} is sent away, the strip never filled`, navigations.length === 1 && statOf("requests")[0] === "—");
}
// The page script still runs while the guard redirects (as in a browser): it must fill nothing for them.
fresh(); await open(FLOWS, "kabir");
await import(`./js/pages/approval-workflows.js?load=${loads}x`);
check("G3", "run anyway for Kabir (no workflows:view), the script fills nothing: every figure stays '—'", ["requests", "decision", "waiting"].every((k) => statOf(k)[0] === "—"), j(["requests", "decision", "waiting"].map(statOf)));
fresh(); await open(MINE, "priya");
check("G2", "HR can report too (assets:report is self-service): the button is there, disabled only if she holds nothing", !!$("report-btn") && !$("report-btn").hidden && $("report-btn").disabled === (I.assetsFor(PRIYA).length === 0));

// =====================================================================
section("L. Source layout");
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, base) : [`${dir}/${e.name}`.slice(base.length + 1).replaceAll("\\", "/")]));
const root = (dd) => new URL(`./${dd}`, import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const changed = (a, b) => walk(a).sort().filter((p) => !fs.existsSync(`${b}/${p}`) || fs.readFileSync(`${a}/${p}`, "utf8") !== fs.readFileSync(`${b}/${p}`, "utf8"));
const JS = ["data/expenses-store.js", "data/inventory-store.js", "pages/approval-workflows.js", "pages/asset-assignment.js", "pages/my-assets.js", "ui/inventory-view.js"];
const PAGES = [FLOWS, ASSIGN, MINE];
check("L1", "js: exactly the six (one new: pages/approval-workflows.js); config/ untouched", j(changed(root("js-pre6J"), root("js-pre6I"))) === j(JS) && walk(root("js-pre6J")).length === walk(root("js-pre6I")).length + 1
  && walk(root("js-pre6J")).filter((p) => p.startsWith("config/")).every((p) => src("js-pre6J", p) === src("js-pre6I", p)), j(changed(root("js-pre6J"), root("js-pre6I"))));
check("L2", "pages: exactly the three; css untouched", j(changed(root("html-pre6J"), root("html-pre6I")).filter((p) => p.endsWith(".html")).sort()) === j([...PAGES].sort()) && j(changed(root("css-pre6J"), root("css-pre6I"))) === j([]),
  j(changed(root("html-pre6J"), root("html-pre6I")).filter((p) => p.endsWith(".html"))));
const lf = (s) => s.replace(/\r\n/g, "\n");
const code = (p) => lf(src("js", p)).split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
check("L3", "no innerHTML in the new or changed scripts; my-assets / asset-assignment toasts with a store message go through escapeHtml",
  JS.every((p) => !/innerHTML|insertAdjacentHTML|outerHTML/.test(code(p))) && !/showToast\(result\.error/.test(code("pages/my-assets.js") + code("pages/asset-assignment.js")));
check("L4", "item 1 is the one helper and that loop line in expenseTotals()", (() => {
  // Round 9V (layout; was the live js): 6J's own edit, read from its frozen result (js-pre9V = HEAD 0518d14); the live
  // expenses-store.js has 9V's header comment since (managerid.mjs C2 / C3)
  const a = lf(src("js-pre6I", "data/expenses-store.js")).split("\n"), b = lf(src("js-pre9V", "data/expenses-store.js")).split("\n");
  const removed = a.filter((l) => !b.includes(l)), added = b.filter((l) => !a.includes(l));
  return j(removed) === j(["// category (every status and category is present, at 0 if none).", "    for (const t of [out, out.byStatus[c.status], out.byCategory[c.category]]) {"])
    && added.some((l) => l.includes("Object.hasOwn(totals, key)")) && added.some((l) => l.includes("own(out.byStatus, c.status), own(out.byCategory, c.category)")) && added.length === 5; })());
check("L5", "the collections keep their versions (no migration): assets 1, expense-claims 1", /key: "assets", version: 1,/.test(src("js", "data/inventory-store.js")) && /key: "expense-claims", version: 1,/.test(src("js", "data/expenses-store.js")));
const files = [...JS.map((p) => src("js", p)), ...PAGES.map(read)];
check("L6", "the nine files: CRLF only, no final newline", files.every((s) => !/[^\r]\n/.test(s) && !/\r(?!\n)/.test(s) && !s.endsWith("\n")));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
