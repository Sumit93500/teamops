// usage: node cardbell.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 14G: the approval card (read-only) and the bell's list, in jsdom with the js in ./js. The card's content per kind, its three states,
// every entry point (Admin and Finance Review, HR and inbox row titles, the bell's items), the bell with 0, 1, 5 and 6+ waiting, RBAC per role,
// focus, Escape, the backdrop and the card's Tab trap. The clock is faked (Mon 28 Sep 2026 10:00, local) so waiting times read the same in the
// three zones. Scope and words from frozen copies (js-pre14G against js-pre14F, css-pre14G against css-pre14H); the live tree: jsguard, cssguard.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const read = (...p) => (fs.existsSync(path.join(...p)) ? fs.readFileSync(path.join(...p), "utf8") : "");
const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replaceAll("\\", "/")).sort() : []);
const PAGES = {
  admin: ["dashboard", "admin", "admin-dashboard"],
  finance: ["dashboard", "finance", "finance-dashboard"],
  hr: ["dashboard", "hr", "hr-dashboard"],
  inbox: ["requests", "approvals-inbox", "approvals-inbox"],
  profile: ["account", "my-profile", "my-profile"],
};

const RealDate = Date;
let NOW = 0;
const at = (y, mo, d, h, mi, s = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, s).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const BASE = () => at(2026, 9, 28, 10, 0);   // Mon 28 Sep 2026, as the other suites
BASE();
globalThis.setTimeout = () => 0;   // toasts and ticks aren't needed here
globalThis.setInterval = () => 0;
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r)); };   // the bell loads the card module on its first click

const WHO = {
  aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"], kabir: ["fin", "Kabir Shah", "EMP-1008"],
  sneha: ["emp", "Sneha Rao", "EMP-1029"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"], rohan: ["emp", "Rohan Gupta", "EMP-1042"],
};
const ID = Object.fromEntries(Object.entries(WHO).map(([k, v]) => [k, v[2]]));

let loads = 0, w = null, d = null, saved = {};
const jsErrors = [];
async function open(page, who) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const [folder, name, script] = PAGES[page];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) jsErrors.push(`${name}/${who}: ${e.message}`); });
  const dom = new JSDOM(read(DIR, folder, `${name}.html`), { url: `http://localhost/office-os/pages/${folder}/${name}.html`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.confirm = () => true;
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, HTMLElement: w.HTMLElement, location: w.location });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors.push(`${script} import: ${e.message}`); }
  await settle();
}
async function fresh() {
  if (!w) { const dom = new JSDOM("", { url: "http://localhost/office-os/" }); w = dom.window; Object.assign(globalThis, { window: w, document: w.document, localStorage: w.localStorage }); }
  w.localStorage.clear(); saved = {}; BASE();
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const has = (m, name) => typeof m?.[name] === "function";

const C = await import("./js/ui/approval-card.js").catch(() => ({}));   // missing: every check below fails rather than the suite crashing
const WT = await import("./js/ui/waiting.js");
const L = await import("./js/data/leave-store.js");
const A = await import("./js/data/attendance-store.js");
const E = await import("./js/data/expenses-store.js");
const R = await import("./js/data/asset-requests-store.js");
const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const LVW = await import("./js/ui/leave-view.js");
const role =(who) => WHO[who][0];
const waits = (who) => WT.waitingFor(ID[who], role(who));
const flat = (who) => Object.entries(waits(who)).flatMap(([kind, list]) => list.map((r) => ({ kind, r })));
const counts = (who) => Object.values(waits(who)).map((l) => l.length).join("/");

const card = () => d.getElementById("approval-card");
const isOpen = () => !!card()?.classList.contains("is-open");
const state = () => card()?.dataset.state ?? null;
const rows = () => [...(card()?.querySelectorAll(".kv__row") ?? [])].map((r) => [txt(r.querySelector("dt")), txt(r.querySelector("dd"))]);
const labels = () => rows().map(([l]) => l);
const footLinks = () => [...(card()?.querySelectorAll(".modal__footer a") ?? [])].map((a) => [txt(a), a.getAttribute("aria-label"), a.getAttribute("href")]);
const panel = () => d.getElementById("bell-panel");
const bell = () => d.querySelector(".topbar__icon-btn--dot");
const items = () => [...(panel()?.querySelectorAll(".bell-panel__item") ?? [])];
const click = (n, opts = {}) => { const e = new w.MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...opts }); n?.dispatchEvent(e); return e; };
const key = (n, k, opts = {}) => { const e = new w.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...opts }); n?.dispatchEvent(e); return e; };
const openCard = (kind, id, opts) => { try { C.openApprovalCard(kind, id, opts); return true; } catch (e) { jsErrors.push(`openApprovalCard: ${e.message}`); return false; } };
const close = () => { try { C.closeApprovalCard(); } catch (e) { jsErrors.push(`closeApprovalCard: ${e.message}`); } };
const INBOX_HREF = "../requests/approvals-inbox.html";
const SINCE = { leave: (r) => r.history[0].at, corrections: (r) => r.history[0].at, expenses: (r) => r.history.at(-1).at, assets: (r) => r.history.at(-1).at, salary: (p) => p.enteredAt };

// =====================================================================
section("S. Fixtures: what waits on a clean seed (leave / corrections / expenses / assets / salary)");
await fresh();
await open("profile", "aarav");
// A salary change proposed by Finance (Kabir) for Rohan waits for the Admin (Aarav); a leave request from Rohan with a reason and a contact phone waits for Sneha.
const sp = PS.proposeSalary(ID.kabir, ID.rohan, { gross: 100000, effectiveFrom: "2026-10-01" });
const lv = L.applyLeave(ID.rohan, { type: "casual", from: "2026-10-19", to: "2026-10-20", duration: "full", reason: "Family wedding", contactPhone: "98765 43210" });
const SP = sp.ok ? sp.record.id : null, LV = lv.ok ? lv.record.id : null;
check("S1", "the fixtures: a pending salary change (Kabir for Rohan) and a leave request from Rohan with a reason and a contact phone", !!SP && !!LV && sp.record.status === "pending", j([sp.error ?? SP, lv.error ?? LV]));
const C0 = { aarav: counts("aarav"), priya: counts("priya"), kabir: counts("kabir"), sneha: counts("sneha"), arjun: counts("arjun") };
check("S2", "what waits: Aarav 3/3/1/1/1, Priya 2/3/0/0/0, Kabir 0/0/2/0/0, Sneha 3/0/1/1/0, Arjun nothing", j(C0) === j({ aarav: "3/3/1/1/1", priya: "2/3/0/0/0", kabir: "0/0/2/0/0", sneha: "3/0/1/1/0", arjun: "0/0/0/0/0" }), j(C0));
check("S3", "the module's API is there", ["openApprovalCard", "closeApprovalCard", "cardState", "cardOpener", "cardLink", "toggleBellPanel", "openBellPanel", "closeBellPanel"].every((f) => has(C, f)));

// =====================================================================
section("A. One card for every kind: what it shows (Aarav, on the Admin dashboard)");
await open("admin", "aarav");
const first = (kind) => waits("aarav")[kind][0] ?? { id: "none", userId: "none", history: [{ at: "" }] };   // missing: the checks fail, the suite goes on
const shown = {};
for (const kind of ["leave", "corrections", "expenses", "assets", "salary"]) {
  const r = first(kind);
  openCard(kind, r.id, { opener: d.body });
  shown[kind] = { title: txt(d.getElementById("approval-card-title")), what: txt(card()?.querySelector(".approval-card__what")), labels: labels(), reason: txt(card()?.querySelector(".approval-card__reason p")), state: state(), text: txt(card()), r };
  close();
}
const L1 = shown.leave, C1 = shown.corrections, X1 = shown.expenses, AS1 = shown.assets, SL1 = shown.salary;
check("A1", "leave: the person as the title, the leave type under it, and the reason", L1.state === "open" && L1.title === S.getUser(L1.r.userId)?.name && L1.what === LVW.typeLabel(L1.r.type) && !!L1.r.reason && L1.reason === L1.r.reason, j([L1.title, L1.what, L1.reason]));
check("A2", "leave: exactly those rows, in that order", j(L1.labels) === j(["Dates", "Days", "Applied", "Stage", "Waiting"]), j(L1.labels));
check("A3", "a correction: Regularization, Date, Issue, Corrected to (and Recorded when there was a time), Applied, Stage, Waiting", C1.state === "open" && C1.what === "Regularization" && j(C1.labels) === j(["Date", "Issue", ...(C1.r.recordedTime ? ["Recorded"] : []), "Corrected to", "Applied", "Stage", "Waiting"]), j([C1.what, C1.labels]));
check("A4", "an expense claim: Amount, Category, Spent on, (Receipt), Applied, Stage, Waiting", X1.state === "open" && X1.what === "Expense claim" && j(X1.labels) === j(["Amount", "Category", "Spent on", ...(X1.r.receipt ? ["Receipt"] : []), "Applied", "Stage", "Waiting"]), j([X1.what, X1.labels]));
check("A5", "an asset request: Asset, (Replaces), Applied, Stage, Waiting", AS1.state === "open" && AS1.what === "Asset request" && j(AS1.labels) === j(["Asset", ...(AS1.r.replacesTag ? ["Replaces"] : []), "Applied", "Stage", "Waiting"]), j([AS1.what, AS1.labels]));
check("A6", "a salary change: New gross, Current gross, From, Proposed by, Waiting; no Stage, no reason", SL1.state === "open" && SL1.what === "Salary change" && j(SL1.labels) === j(["New gross", "Current gross", "From", "Proposed by", "Waiting"]) && SL1.reason === null && /Kabir Shah/.test(SL1.text) && /1,00,000/.test(SL1.text), j([SL1.what, SL1.labels]));
openCard("expenses", first("expenses").id, { opener: d.body });
const xr = Object.fromEntries(rows());
check("A7", "values read from the record: the amount in rupees, the category's name, the stage capitalised (Finance / Admin / Manager)", xr.Amount?.startsWith("₹") && /^(Manager|Finance|Admin)$/.test(xr.Stage ?? "") && xr.Category && !/^[a-z-]+$/.test(xr.Category), j(xr));
close();
openCard("leave", first("leave").id, { opener: d.body });
const lr = Object.fromEntries(rows());
check("A8", "leave's Stage is Manager or HR; Waiting is the inbox's wording (Just now / N min / N hours / N days)", /^(Manager|HR)$/.test(lr.Stage ?? "") && /^(Just now|\d+ min|\d+ hours?|\d+ days?)$/.test(lr.Waiting ?? ""), j(lr));
check("A9", "the card is a dialog: role, aria-modal, named by its title; the title has focus; a ✕ named Close", card()?.getAttribute("role") === "dialog" && card()?.getAttribute("aria-modal") === "true" && card()?.getAttribute("aria-labelledby") === "approval-card-title" && d.activeElement?.id === "approval-card-title" && card()?.querySelector(".modal__close")?.getAttribute("aria-label") === "Close");
check("A10", "More: one link to the Approvals inbox, named 'More in Approvals inbox'", j(footLinks()) === j([["More", "More in Approvals inbox", INBOX_HREF]]), j(footLinks()));
check("A11", "the card lives outside main (ui/phone.js only watches main) and is built once", card()?.parentElement === d.body && !d.querySelector("main")?.contains(card()) && d.querySelectorAll("#approval-card").length === 1);
close();

// =====================================================================
section("B. The reason and the contact phone (Sneha, team lead, Rohan's leave)");
await open("profile", "sneha");
openCard("leave", LV, { opener: d.body });
check("B1", "a team lead deciding it reads the reason", state() === "open" && txt(card()?.querySelector(".approval-card__reason p")) === "Family wedding", txt(card()));
check("B2", "the contact phone stays off the card", !/98765|43210/.test(card()?.textContent ?? "") && !/contactPhone/.test(read(HERE, "js-pre14G", "ui", "approval-card.js")) && read(HERE, "js-pre14G", "ui", "approval-card.js") !== "");
close();

// =====================================================================
section("C. The states: decided, moved on, gone; nothing of the request shown");
await open("admin", "aarav");
const decidedOne = first("leave");
L.decideLeave(decidedOne.id, ID.aarav, "admin", "reject", "Round 14G");
openCard("leave", decidedOne.id, { opener: d.body });
check("C1", "already decided: 'This request was already decided.', as the title, with See all; no details", state() === "decided" && txt(d.getElementById("approval-card-title")) === "This request was already decided." && j(footLinks()) === j([["See all", null, INBOX_HREF]]) && rows().length === 0 && !card()?.querySelector(".approval-card__reason"), j([state(), txt(card())]));
close();
openCard("leave", "LV-99999", { opener: d.body });
check("C2", "gone: 'This request no longer exists.' with See all", state() === "gone" && txt(d.getElementById("approval-card-title")) === "This request no longer exists." && j(footLinks()) === j([["See all", null, INBOX_HREF]]), j([state(), txt(card())]));
close();
await open("profile", "arjun");
const someone = flat("aarav").find((x) => x.kind === "corrections");
openCard("corrections", someone.r.id, { opener: d.body });
check("C3", "not theirs (Arjun, someone else's correction): 'It's no longer waiting for you.', without the person's name or details", state() === "not-yours" && txt(d.getElementById("approval-card-title")) === "It's no longer waiting for you." && !card()?.textContent.includes(S.getUser(someone.r.userId)?.name) && rows().length === 0, txt(card()));
close();
openCard("salary", SP, { opener: d.body });
const c4 = [state(), !/1,00,000|Rohan/.test(card()?.textContent ?? "")];
close();
openCard("salary", "SP-99999", { opener: d.body });
c4.push(state());
check("C4", "a salary change, to someone without salary:view: the same sentence, nothing else, whether or not it exists (not even that is told)", j(c4) === j(["not-yours", true, "not-yours"]), j(c4));
close();
// Moved on: Sneha approves Rohan's leave at the manager stage; it then waits for HR, not her.
await open("profile", "sneha");
L.decideLeave(LV, ID.sneha, "emp", "approve");
openCard("leave", LV, { opener: d.body });
check("C5", "moved on (Sneha approved her stage; now at HR): 'It's no longer waiting for you.'", state() === "not-yours" && L.getRequest(LV)?.stage === "hr", j([state(), L.getRequest(LV)?.stage]));
close();
check("C6", "cardState: an item is returned only when it waits for this person", has(C, "cardState") && C.cardState("leave", LV).why === "It's no longer waiting for you." && C.cardState("leave", "LV-99999").why === "This request no longer exists." && C.cardState("leave", decidedOne.id).why === "This request was already decided.");

// =====================================================================
section("D. Entry points: Admin and Finance Review, HR and inbox row titles");
await fresh();
await open("admin", "aarav");
const reviews = () => [...d.querySelectorAll(".list__item a.btn")].filter((a) => txt(a) === "Review");
const rv = reviews();
const e1 = click(rv[0]);
check("D1", "Admin: Review opens the card for that row's request (kind and id), still a link to the inbox (href kept)", isOpen() && state() === "open" && rv[0]?.getAttribute("href") === INBOX_HREF && e1.defaultPrevented && card()?.dataset.kind && rv[0]?.closest(".list__item")?.dataset.requestId === (flat("aarav").find((x) => x.kind === card()?.dataset.kind && x.r.id === rv[0]?.closest(".list__item")?.dataset.requestId)?.r.id), j([state(), card()?.dataset.kind, rv[0]?.closest(".list__item")?.dataset.requestId]));
key(d.activeElement, "Escape");
check("D2", "Escape closes it and focus goes back to that Review", !isOpen() && d.activeElement === rv[0]);
const e2 = click(rv[1], { ctrlKey: true });
check("D3", "Ctrl-click (and Shift, Alt, Cmd, the middle button) leaves it a link: no card", !isOpen() && !e2.defaultPrevented);
check("D4", "every Review on the Admin dashboard says it opens a dialog", rv.length === 4 && rv.every((a) => a.getAttribute("aria-haspopup") === "dialog"), rv.length);
await open("finance", "kabir");
const frv = reviews();
click(frv[0]);
check("D5", "Finance: Review opens that claim's card", isOpen() && card()?.dataset.kind === "expenses" && frv[0]?.closest(".list__item")?.dataset.claimId && state() === "open" && frv.length === 2, j([frv.length, state()]));
close();
await open("hr", "priya");
const hrTitles = [...d.querySelectorAll(".list__title[data-card]")];
check("D6", "HR dashboard: each pending row's title is a button in place (role, tabindex 0, aria-haspopup), its text unchanged", hrTitles.length === 3 && hrTitles.every((t) => t.getAttribute("role") === "button" && t.tabIndex === 0 && t.getAttribute("aria-haspopup") === "dialog" && t.tagName === "SPAN" && t.className === "list__title"), j(hrTitles.map(txt)));
hrTitles[0]?.focus(); key(hrTitles[0], "Enter");
check("D7", "Enter on a title opens its card (with More); Escape returns focus to the title", isOpen() && state() === "open" && footLinks().length === 1 && (key(d.activeElement, "Escape"), !isOpen() && d.activeElement === hrTitles[0]));
check("D8", "HR keeps its own Approve and Reject on the rows", d.querySelectorAll(".list__item [data-permission]").length >= 1 || d.querySelectorAll(".list__item .btn").length >= 2);
await open("inbox", "aarav");
const inboxTitles = [...d.querySelectorAll("#inbox-table .table__user-name[data-card]")];
const allTitles = [...d.querySelectorAll("#inbox-table .table__user-name")];
check("D9", "inbox: every real pending row's title opens the card (as many as waitingFor(), 8 for Aarav on a clean seed); the sample rows' don't", inboxTitles.length === flat("aarav").length && inboxTitles.length === 8 && allTitles.length > inboxTitles.length && allTitles.filter((t) => !t.dataset.card).every((t) => t.closest("tr")?.hasAttribute("data-static")), j([inboxTitles.length, allTitles.length]));
click(inboxTitles[0]);
check("D10", "an inbox card has no More (this is where More leads)", isOpen() && state() === "open" && footLinks().length === 0 && !card()?.querySelector(".modal__footer"));
close();
const approvedPill = [...d.querySelectorAll(".table__toolbar .tabs__tab")].find((p) => /Approved/.test(txt(p)));
click(approvedPill);
check("D11", "decided rows (Approved tab) keep plain titles", d.querySelectorAll("#inbox-table .table__user-name[data-card]").length === 0 && d.querySelectorAll("#inbox-table .table__user-name").length > 0);
const pendingPill = [...d.querySelectorAll(".table__toolbar .tabs__tab")].find((p) => /Pending/.test(txt(p)));
click(pendingPill);
// The inbox, out of date: a row decided behind its back. Its card says so, without See all, and closing it redraws the list.
const stale = [...d.querySelectorAll("#inbox-table .table__user-name[data-card]")].find((t) => t.dataset.card === "leave");
const staleId = flat("aarav").find((x) => x.kind === "leave" && stale && txt(stale).includes(S.getUser(x.r.userId)?.name))?.r.id;
L.decideLeave(staleId, ID.aarav, "admin", "reject", "Round 14G");
const before = d.querySelectorAll("#inbox-table .table__user-name[data-card]").length;
click(stale);
const staleState = state(), staleFoot = footLinks().length;
close();
const after = d.querySelectorAll("#inbox-table .table__user-name[data-card]").length;
check("D12", "a stale inbox row: the card says it was already decided, no See all there; closing it redraws the list (one row fewer)", staleState === "decided" && staleFoot === 0 && after === before - 1, j([staleState, staleFoot, before, after]));
await open("admin", "aarav");
const adm = reviews(); const admBefore = adm.length;
const gone = flat("aarav").find((x) => adm[0]?.closest(".list__item")?.dataset.requestId === x.r.id);
if (gone?.kind === "leave") L.decideLeave(gone.r.id, ID.aarav, "admin", "reject", "Round 14G");
else if (gone?.kind === "corrections") A.decideRegularization(gone.r.id, ID.aarav, "admin", "reject", "Round 14G");
else if (gone?.kind === "assets") R.decideAssetRequest(gone.r.id, ID.aarav, "admin", "reject", "Round 14G");
else if (gone?.kind === "expenses") E.decideExpense(gone.r.id, ID.aarav, "admin", "reject", "Round 14G");
click(adm[0]);
const admState = state();
close();
const admFocus = d.activeElement === bell();   // the Review it came from was redrawn away: focus goes to the bell, not lost
check("D13", "the Admin dashboard, out of date: the card says decided (with See all), closing it redraws Pending approvals, and focus goes to the bell (its Review is gone)", admState === "decided" && reviews().length === admBefore && !reviews().some((a) => a.closest(".list__item")?.dataset.requestId === gone?.r.id) && admFocus, j([gone?.kind, admState, admBefore, reviews().length, admFocus]));

// =====================================================================
section("E. The bell: a button that opens the list of what waits");
await fresh();
await open("profile", "aarav");
check("E1", "the bell is a button that says it opens a dialog, closed (aria-expanded false), with the count as before", bell()?.tagName === "BUTTON" && bell().type === "button" && bell().getAttribute("aria-haspopup") === "dialog" && bell().getAttribute("aria-expanded") === "false" && bell().getAttribute("aria-label") === `Waiting for you: ${WT.waitingCount(ID.aarav, "admin")}` && bell().hasAttribute("data-waiting") && !bell().hasAttribute("data-not-implemented") && !!bell().querySelector("svg"), j([bell()?.tagName, bell()?.getAttribute("aria-label")]));
click(bell()); await settle();
const want = flat("aarav").map((x) => ({ ...x, since: RealDate.parse(SINCE[x.kind](x.r)) })).sort((a, b) => b.since - a.since || b.r.id.localeCompare(a.r.id, "en", { numeric: true })).slice(0, 5);
const got = items().map((b) => b.dataset.card + " " + txt(b.querySelector(".bell-panel__name")));
check("E2", "6+ waiting (Aarav, 9): the list shows 5, newest first by when each started waiting", items().length === 5 && j(got) === j(want.map((x) => `${x.kind} ${S.getUser(x.r.userId)?.name}`)), j(got));
check("E3", "the list: a dialog named 'Waiting for you', focus on its heading, the bell expanded and pointing to it, See all to the inbox", panel() && !panel()?.hidden && panel()?.getAttribute("role") === "dialog" && txt(d.getElementById(panel()?.getAttribute("aria-labelledby"))) === "Waiting for you" && d.activeElement?.id === "bell-panel-title" && bell().getAttribute("aria-expanded") === "true" && bell().getAttribute("aria-controls") === "bell-panel" && txt(panel()?.querySelector(".bell-panel__footer a")) === "See all" && panel()?.querySelector(".bell-panel__footer a")?.getAttribute("href") === INBOX_HREF);
check("E4", "each item: the person, what it is, how long it has waited; outside main", items().every((b) => txt(b.querySelector(".bell-panel__name")) && txt(b.querySelector(".bell-panel__what")) && /^(Just now|\d+ min|\d+ hours?|\d+ days?)$/.test(txt(b.querySelector(".bell-panel__when")))) && !d.querySelector("main")?.contains(panel()));
key(panel(), "Escape");
check("E5", "Escape closes the list; focus back on the bell; not expanded", panel()?.hidden && d.activeElement === bell() && bell().getAttribute("aria-expanded") === "false");
click(bell()); await settle();
click(items()[1]);
check("E6", "an item opens its card (the right one); the list closes", panel()?.hidden && isOpen() && state() === "open" && card()?.dataset.kind === want[1].kind && txt(d.getElementById("approval-card-title")) === S.getUser(want[1].r.userId)?.name);
close();
check("E7", "closing the card puts focus on the bell (the item it came from is gone)", d.activeElement === bell());
click(bell()); await settle(); click(bell()); await settle();
check("E8", "the bell toggles the list", panel()?.hidden && bell().getAttribute("aria-expanded") === "false");
click(bell()); await settle();
d.body.dispatchEvent(new w.Event("pointerdown", { bubbles: true }));
check("E9", "a press outside closes it", panel()?.hidden);
await open("profile", "priya");
click(bell()); await settle();
check("E10", "exactly 5 waiting (Priya): all 5 listed", items().length === 5 && flat("priya").length === 5);
await open("profile", "kabir");
E.decideExpense(waits("kabir").expenses[0].id, ID.kabir, "fin", "reject", "Round 14G");
click(bell()); await settle();
check("E11", "1 waiting (Kabir, after deciding one of his 2): 1 listed", items().length === 1 && flat("kabir").length === 1);
await open("profile", "arjun");
click(bell()); await settle();
check("E12", "0 waiting (Arjun): 'Nothing is waiting for you.', See all still there, no dot", items().length === 0 && txt(panel()?.querySelector(".bell-panel__empty")) === "Nothing is waiting for you." && !!panel()?.querySelector(".bell-panel__footer a") && !bell().hasAttribute("data-waiting"));

// =====================================================================
section("F. RBAC: each person's bell lists only what they may decide today");
await fresh();
const people = ["aarav", "priya", "kabir", "sneha", "arjun"];
const rb = {};
for (const who of people) {
  await open("profile", who);
  click(bell()); await settle();
  const listed = items().map((b) => b.dataset.card);
  const mine = flat(who).map((x) => x.kind);
  rb[who] = listed.length === Math.min(5, mine.length) && listed.every((k) => mine.includes(k));
}
check("F1", "Admin, HR, Finance, a team lead and an employee: each list is drawn from their own waitingFor()", Object.values(rb).every(Boolean), j(rb));
await open("profile", "kabir");
const notKabirs = flat("aarav").filter((x) => !flat("kabir").some((y) => y.r.id === x.r.id));
const leaks = notKabirs.filter((x) => { openCard(x.kind, x.r.id, { opener: d.body }); const s = state(); const t = card()?.textContent ?? ""; close(); return s !== "not-yours" || t.includes(S.getUser(x.r.userId)?.name); });
check("F2", "every one of Aarav's items, opened by Kabir: 'no longer waiting for you', no name shown", notKabirs.length >= 6 && leaks.length === 0, j(leaks.map((x) => x.r.id)));
// Someone who can't open the inbox keeps the honest placeholder (no list): honest.mjs B8.

// =====================================================================
section("G. Focus, Escape, the backdrop, the Tab trap (the card only)");
await open("admin", "aarav");
const op = reviews()[0];
click(op);
const fs1 = [...(card()?.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]') ?? [])];
check("G1", "inside the card: the ✕ and More, in that order", fs1.length === 2 && fs1[0]?.classList.contains("modal__close") && txt(fs1[1]) === "More");
fs1[1]?.focus(); key(fs1[1], "Tab");
check("G2", "Tab on the last goes to the first", d.activeElement === fs1[0]);
fs1[0]?.focus(); key(fs1[0], "Tab", { shiftKey: true });
check("G3", "Shift+Tab on the first goes to the last", d.activeElement === fs1[1]);
d.getElementById("approval-card-title")?.focus(); key(d.activeElement, "Tab", { shiftKey: true });
check("G4", "Shift+Tab from the title (where it opens) stays inside", d.activeElement === fs1[1]);
click(card());
check("G5", "a click on the backdrop closes it; focus back on Review", !isOpen() && d.activeElement === op);
click(op); click(card()?.querySelector(".modal__close"));
check("G6", "the ✕ closes it", !isOpen() && d.activeElement === op);
click(op);
const escE = key(d.activeElement, "Escape");
check("G7", "Escape is the card's own (it doesn't reach the page's dialogs)", !isOpen() && escE.defaultPrevented);

// =====================================================================
section("W. Words and scope, from frozen copies (the live tree: jsguard.mjs, cssguard.mjs, pagefreeze.mjs)");
const added = (a, b) => { const S2 = new Set(a.split("\r\n")); return b.split("\r\n").filter((l) => !S2.has(l)); };
const changed = (a, b) => walk(b).filter((p) => read(HERE, a, p) !== read(HERE, b, p));
const jsChanged = changed("js-pre14F", "js-pre14G");
check("W1", "js: exactly ui/approval-card.js (new), ui/topbar.js and the four pages' scripts", j(jsChanged) === j(["pages/admin-dashboard.js", "pages/approvals-inbox.js", "pages/finance-dashboard.js", "pages/hr-dashboard.js", "ui/approval-card.js", "ui/topbar.js"]) && walk(HERE + "/js-pre14G").length === walk(HERE + "/js-pre14F").length + 1, j(jsChanged));
check("W2", "css: only components/modal.css; no page changed (html-pre14B is still the live pages)", j(changed("css-pre14H", "css-pre14G")) === j(["components/modal.css"]) && walk(HERE + "/css-pre14G").length === walk(HERE + "/css-pre14H").length, j(changed("css-pre14H", "css-pre14G")));
const card14 = read(HERE, "js-pre14G", "ui/approval-card.js");
const words = [...card14.split("\r\n").filter((l) => !/^\s*\/\//.test(l)).join("\n").matchAll(/["`]([A-Z][a-z'][^"`$]*?)["`]/g)].map((m) => m[1]);
const APPROVED = ["More", "See all", "This request was already decided.", "It's no longer waiting for you.", "This request no longer exists.", "More in Approvals inbox",
  "Reason", "Stage", "Waiting", "Applied", "Dates", "Days", "Amount", "Category", "Spent on", "Receipt", "Asset", "Replaces", "Issue", "Recorded", "Corrected to", "New gross", "Current gross", "From", "Proposed by",
  // listed for approval in the notes (W3's list): existing app words, plus Date and "No salary on file"
  "Date", "Close", "Waiting for you", "Nothing is waiting for you.", "No salary on file", "Regularization", "Expense claim", "Asset request", "Salary change", "Manager", "HR", "Just now", "Tab", "Escape", "Enter"];
check("W3", "the card module's words are the approved ones and those listed for approval (no others)", words.length > 20 && words.every((x) => APPROVED.includes(x)), j([...new Set(words.filter((x) => !APPROVED.includes(x)))]));
check("W4", "built with DOM calls: no HTML strings, nothing stored or fetched", !/innerHTML|outerHTML|insertAdjacentHTML|localStorage|sessionStorage|fetch\(/.test(card14));
check("W5", "the pages' new lines only wire the card (no other change in what they draw)", ["pages/admin-dashboard.js", "pages/finance-dashboard.js", "pages/hr-dashboard.js"].every((p) => added(read(HERE, "js-pre14F", p), read(HERE, "js-pre14G", p)).filter((l) => !/^\s*\/\//.test(l) && l.trim()).every((l) => /cardLink|cardOpener|approval-card\.js|const title = el\("span", "list__title"|^\s*title,$/.test(l))));
check("W6", "the decision code is untouched (deciding stays on the rows): leave-decision.js, the stores, waiting.js, modal.js", ["ui/leave-decision.js", "ui/waiting.js", "ui/modal.js", "data/leave-store.js", "data/attendance-store.js", "data/expenses-store.js", "data/asset-requests-store.js", "data/payroll-store.js"].every((p) => read(HERE, "js-pre14F", p) === read(HERE, "js-pre14G", p) && read(HERE, "js-pre14G", p) !== ""));
check("W7", "every changed or new file CRLF, no final newline", jsChanged.every((p) => { const s = read(HERE, "js-pre14G", p); return !/[^\r]\n/.test(s) && !s.endsWith("\n"); }) && (() => { const s = read(HERE, "css-pre14G", "components/modal.css"); return !/[^\r]\n/.test(s) && !s.endsWith("\n"); })());
const css14 = read(HERE, "css-pre14G", "components/modal.css");
check("W8", "css: bottom sheets at 560 and under, the list not printed (.modal already isn't), tokens only (no new colour)", /@media screen and \(max-width: 560px\)/.test(css14) && /@media print \{ \.bell-panel \{ display: none !important; \} \}/.test(css14) && !/#[0-9a-f]{3,6}\b|rgb\(/i.test(added(read(HERE, "css-pre14H", "components/modal.css"), css14).join("\n")));

// =====================================================================
section("E. No page errors");
check("E99", "no JS errors across all page loads", jsErrors.length === 0, jsErrors.length ? jsErrors.slice(0, 3).join(" | ") : `none (${loads} loads)`);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
