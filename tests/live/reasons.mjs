// usage: node reasons.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 14E part 1 (visible reasons for disabled controls), in jsdom with the js in ./js. A reason that lived only in a title never shows on a phone;
// now each disabled control in the list has it as a line of text after it (class "reason"), tied by aria-describedby, the title kept; enabled, no line.
//   E  expenses.html: Pay approved claims (Admin: someone else pays; Finance: enabled, then paid out; an old session with no employee ID)
//   S  salary-structure.html: a row's Edit (your own salary; nobody else could approve a change)
//   P  payroll-run.html: Prepare run and Approve run (the store's reasons; the October fixture of payruns.mjs for the enabled states)
//   F  finance dashboard: a run row's On hold badge (no bank account on file)
//   Y  payslips.html: a history row's On hold badge
//   L  the helper itself: a reason, reworded, none (the line and aria-describedby go), one again
//   C  the shared rule (frozen css-pre14E1)    W  scope and words (frozen js-pre14E1 against js-pre14GB)    E99 no js errors
// The clock is local wall time, set per section; storage is in memory, seeded when first read.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const read = (...p) => (fs.existsSync(path.join(...p)) ? fs.readFileSync(path.join(...p), "utf8") : "");
const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replaceAll("\\", "/")).sort() : []);

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 9, 28);
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const SESS = { admin: ["admin", "Aarav Mehta", AARAV], hr: ["hr", "Priya Nair", PRIYA], fin: ["fin", "Kabir Shah", KABIR], emp: ["emp", "Arjun Kapoor", ARJUN] };
const setSession = (roleKey, userLabel, employeeId) => mem.set("officeos:session", JSON.stringify({ roleKey, userLabel, employeeId, signedInAt: NOW }));

let loads = 0, w = null, d = null, navigations = [];
const allJsErrors = [];
async function open(page, query = "") {
  const vc = new VirtualConsole();
  timers = []; navigations = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message.slice(0, 60)); else allJsErrors.push(`${page}: ${e.message}`); });
  const html = read(DIR, `${page}.html`);
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  w.confirm = () => true;
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`./js/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); }
  }
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} timer: ${e.message}`); } });
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const $ = (id) => d.getElementById(id);
const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const rawEdit = (key, match, change) => { const box = JSON.parse(mem.get(`officeos:${key}`)); box.records.filter(match).forEach(change); mem.set(`officeos:${key}`, JSON.stringify(box)); };

// The line a control's aria-describedby names, if it's a reason line.
const lineOf = (c) => { const l = c && d.getElementById(c.getAttribute("aria-describedby") ?? ""); return l?.classList.contains("reason") ? l : null; };
// What a control says about its reason: [disabled, title, describedby resolves to a reason line, its text, the line hidden as the control is]
const says = (c) => { const l = lineOf(c); return [Boolean(c?.disabled), c?.title ?? null, Boolean(l), l ? l.textContent : null, l ? l.hidden === c.hidden : null]; };
// A disabled control showing `text`: the line is tied, says exactly it, is a span.reason, shown, hidden only with the control, and the title is `title`.
const shows = (c, text, title) => { const l = lineOf(c); return Boolean(c) && c.disabled && c.title === title && Boolean(l) && l.tagName === "SPAN" && l.className === "reason" && l.textContent === text && !l.hidden && !c.hidden; };
// An enabled (or reason-less) control: no line tied, none left in the page for it.
const none = (c) => Boolean(c) && !c.hasAttribute("aria-describedby");
const lines = () => [...d.querySelectorAll(".reason")];
const visible = () => lines().filter((l) => !l.hidden && !l.closest("[hidden]"));
const tied = () => lines().every((l) => d.querySelectorAll(`[aria-describedby="${l.id}"]`).length === 1);   // each line belongs to exactly one control
const ids = () => new Set(lines().map((l) => l.id)).size === lines().length;

// =================================================================
section("E. Expenses: Pay approved claims");
mem.clear(); setNow(2026, 9, 28);
setSession(...SESS.admin); await open("finance/expenses");
const pay = () => $("pay-approved");
check("E1", "Admin: disabled, with the title's reason as a line after it in the header's actions, tied by aria-describedby, the title kept",
  shows(pay(), "Someone else has to pay the approved claims.", "Someone else has to pay the approved claims") && pay().nextElementSibling === lineOf(pay())
  && lineOf(pay()).parentElement.className === "page-header__actions" && lineOf(pay()).dataset.permission === "expenses:pay" && lines().length === 1 && tied(), j(says(pay())));
setSession(...SESS.fin); await open("finance/expenses");
const e2 = [says(pay()), lines().length];
check("E2", "Kabir (a claim is his to pay): enabled, no line, no aria-describedby; the title is the count and amount as before", !pay().disabled && none(pay()) && lines().length === 0 && /^1 claim, ₹[\d,]+$/.test(pay().title), j(e2));
pay().click();
check("E3", "he pays it: the same button is now disabled and the line appears, 'No approved claims are waiting to be paid.' (once, tied)",
  shows(pay(), "No approved claims are waiting to be paid.", "No approved claims are waiting to be paid") && lines().length === 1 && tied(), j(says(pay())));
mem.clear(); setSession("fin", "Kabir Shah", undefined); await open("finance/expenses");
check("E4", "an old session with no employee ID never reaches the button (can() reads the record, so the page is left first): nothing drawn, no line; the third reason is the title's words, unreachable today",
  navigations.length > 0 && !pay().disabled && pay().title === "" && lines().length === 0, j([navigations.length, says(pay())]));

// =================================================================
section("S. Salary structure: a row's Edit");
mem.clear(); setNow(2026, 9, 28);
const editOf = (id) => d.querySelector(`tr[data-user-id="${id}"] .table__actions button[data-permission="salary:edit"]`);
const rowsEdit = () => [...d.querySelectorAll("tr[data-user-id]")].map((tr) => [tr.dataset.userId, tr.querySelector('.table__actions button[data-permission="salary:edit"]')]).filter(([, b]) => b);
setSession(...SESS.fin); await open("payroll/salary-structure");
const OWN = "You can't change your own salary.";
const NOBODY = "No one else could approve a change to Aarav Mehta's salary: make someone else an Admin first.";
check("S1", "Kabir: his own row's Edit is disabled, with 'You can't change your own salary.' as a line under the row's buttons (in its actions cell), the title kept",
  shows(editOf(KABIR), OWN, OWN) && lineOf(editOf(KABIR)).parentElement === editOf(KABIR).closest("td") && lineOf(editOf(KABIR)).previousElementSibling === editOf(KABIR).closest(".btn-group"), j(says(editOf(KABIR))));
check("S2", "Aarav's row: disabled, 'No one else could approve a change to Aarav Mehta's salary: make someone else an Admin first.'", shows(editOf(AARAV), NOBODY, NOBODY), j(says(editOf(AARAV))));
const s3 = rowsEdit().map(([id, b]) => [id, b.disabled, Boolean(lineOf(b)), b.disabled ? lineOf(b)?.textContent === b.title : !b.hasAttribute("aria-describedby")]);
check("S3", "every row: a line exactly where Edit is disabled, saying its title; every enabled Edit has none; one line per disabled Edit, ids unique",
  s3.length >= 8 && s3.every(([, dis, has, ok]) => dis === has && ok) && lines().length === s3.filter(([, dis]) => dis).length && s3.filter(([, dis]) => dis).length === 2 && tied() && ids(), j(s3));
setSession(...SESS.admin); await open("payroll/salary-structure");
check("S4", "Aarav (Admin): only his own row has a line ('You can't change your own salary.'); Kabir's Edit is enabled with none",
  shows(editOf(AARAV), OWN, OWN) && !editOf(KABIR).disabled && none(editOf(KABIR)) && lines().length === 1, j([says(editOf(AARAV)), says(editOf(KABIR))]));

// =================================================================
section("P. Payroll run: Prepare run and Approve run");
mem.clear(); setNow(2026, 9, 28);
setSession(...SESS.admin); await open("payroll/payroll-run");
const prep = () => $("prepare-run"), appr = () => $("approve-run");
const P1P = PS.prepareProblem(AARAV, 2026, 9), P1A = PS.approveProblem(AARAV, 2026, 9);
check("P1", "Aarav, September (not ended): both disabled, each with the store's reason as a line, the titles kept", shows(prep(), P1P, P1P) && shows(appr(), P1A, P1A)
  && P1A === "September 2026's run hasn't been prepared yet." && P1P.startsWith("September 2026 can't be prepared yet: it hasn't ended yet; "), j([says(prep()), says(appr())]));
const order = [...appr().parentElement.children].map((c) => c.id || c.className);
check("P2", "both lines come after the buttons (so the row of buttons stays together), Prepare's first, in the header's actions; two lines in all, ids unique",
  j(order.slice(-2)) === j([lineOf(prep())?.id, lineOf(appr())?.id]) && order.indexOf("approve-run") === order.length - 3 && lines().length === 2 && ids() && tied(), j(order));
// The October fixture (payruns.mjs): seeded 30 Oct 19:00, opened 9 Nov, the month's pending requests settled, Vikram given a joining date.
mem.clear(); setNow(2026, 10, 30, 19); PS.payrollRun(2026, 10); setNow(2026, 11, 9, 11);
rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
setSession(...SESS.fin); await open("payroll/payroll-run", "?month=2026-10");
check("P3", "Kabir, October ready: Prepare enabled with no line; Approve is hidden (Finance) and so is any line for it: no line shows",
  !prep().disabled && none(prep()) && appr().hidden && visible().length === 0 && lines().every((l) => l.hidden), j([says(prep()), says(appr()), lines().map((l) => [l.textContent, l.hidden])]));
prep().click();
check("P4", "he prepares it: Prepare redrawn ('Prepare again'); still nothing shown under the buttons for him", PS.storedRun(2026, 10)?.preparedBy === KABIR && visible().length === 0, j([says(prep()), visible().map((l) => l.textContent)]));
setSession(...SESS.admin); await open("payroll/payroll-run", "?month=2026-10");
const NOBODY_RUN = "No one else could approve October 2026's run: make someone else an Admin first.";
check("P5", "Aarav: Approve enabled with no line; Prepare disabled, its line the store's reason (nobody else could approve)",
  !appr().disabled && none(appr()) && shows(prep(), NOBODY_RUN, NOBODY_RUN) && lines().length === 1, j([says(prep()), says(appr())]));
appr().click();
const A1 = "October 2026's run is approved, so it can't be prepared again.", A2 = "October 2026's run is already approved.";
check("P6", "he approves it: both now disabled, each line updated or added once (no duplicates), the store's words", PS.storedRun(2026, 10)?.status === "approved"
  && shows(prep(), A1, A1) && shows(appr(), A2, A2) && lines().length === 2 && ids() && tied(), j([says(prep()), says(appr()), lines().length]));

// =================================================================
section("F. Finance dashboard: a run row's On hold badge");
mem.clear(); setNow(2026, 9, 28);
setSession(...SESS.fin); await open("dashboard/finance");
check("F1", "the seed: no row is on hold, so no line", lines().length === 0 && d.querySelectorAll("tr[data-user-id] .badge").length >= 8, j(lines().map((l) => l.textContent)));
S.updateUser(AARAV, ARJUN, { bankAccount: null, bankAccountLast4: null });
await open("dashboard/finance");
const holdBadge = () => d.querySelector(`tr[data-user-id="${ARJUN}"] .badge`);
check("F2", "Arjun with no bank account: his badge reads On hold and the reason shows under it, tied, the title kept; no other row has a line",
  txt(holdBadge()) === "On hold" && holdBadge().title === "No bank account on file" && lineOf(holdBadge())?.textContent === "No bank account on file" && lineOf(holdBadge()).previousElementSibling === holdBadge()
  && !lineOf(holdBadge()).hidden && lines().length === 1 && tied(), j([txt(holdBadge()), says(holdBadge())]));

// =================================================================
section("Y. Payslips: a history row's On hold badge");
setSession(...SESS.emp); await open("payroll/payslips");
const held = () => [...d.querySelectorAll("#payslip-rows .badge")].filter((b) => txt(b) === "On hold");
check("Y1", "Arjun (no bank account): each On hold row shows 'No bank account on file' under its badge, tied, the title kept; one line per held row",
  held().length >= 1 && held().every((b) => b.title === "No bank account on file" && lineOf(b)?.textContent === "No bank account on file" && !lineOf(b).hidden) && lines().length === held().length && ids() && tied(),
  j(held().map((b) => says(b))));
S.updateUser(AARAV, ARJUN, { bankAccount: "501734819999", bankAccountLast4: "9999" });
await open("payroll/payslips");
check("Y2", "with a bank account on file again: no row is on hold and no line shows", held().length === 0 && lines().length === 0, j(lines().map((l) => l.textContent)));

// =================================================================
section("L. The helper: a reason, another, none, and one again");
const LV = await import("./js/ui/leave-view.js");
const box = d.createElement("div"), btn = d.createElement("button"), next = d.createElement("i");
box.append(btn, next); d.body.append(box);
const step = (text) => { LV.showReason?.(btn, text); const l = lineOf(btn); return [l?.textContent ?? null, box.querySelectorAll(".reason").length, btn.getAttribute("aria-describedby"), btn.nextElementSibling === l && Boolean(l)]; };
const l1 = [step("First reason."), step("Second reason."), step(""), step("Again.")];
check("L1", "showReason(): a line right after the control, then the same line reworded (not a second), then no text: the line and aria-describedby are gone; a reason again adds one back",
  j(l1.map(([t, n, , after]) => [t, n, after])) === j([["First reason.", 1, true], ["Second reason.", 1, true], [null, 0, false], ["Again.", 1, true]]) && l1[2][2] === null && l1[0][2] === l1[1][2] && l1[3][2] !== l1[0][2], j(l1));
box.remove();

// =================================================================
section("C. The shared rule (frozen css-pre14E1)");
const CSS = read(HERE, "css-pre14E1", "components", "form.css"), CSS0 = read(HERE, "css-pre14G", "components", "form.css");
const RULE = ".reason { display: block; width: 0; min-width: 100%; margin-top: var(--space-1); font-size: var(--text-xs); color: var(--color-text-muted); white-space: normal; overflow-wrap: anywhere; }";
check("C1", "components/form.css has the one .reason rule (muted xs text, a line of its own as wide as its control's space, wrapping), right after .form-hint's",
  CSS.split(RULE).length === 2 && CSS.replace(/\r\n/g, "\n").includes(`.form-hint[data-missing="true"] { color: var(--color-warning); }   /* advisory, not an error (claim-expense.js) */\n/* Why a control can't be used`), j(CSS.match(/\.reason \{[^}]*\}/g)));
const added = CSS.replace(/\r\n/g, "\n").split("\n").filter((l) => !CSS0.replace(/\r\n/g, "\n").split("\n").includes(l));
check("C2", "and nothing else in it changed: 3 lines added (a 2-line comment and the rule), none removed", added.length === 3 && CSS.replace(/\r\n/g, "\n").split("\n").length === CSS0.replace(/\r\n/g, "\n").split("\n").length + 3, j(added));
const cssA = walk(path.join(HERE, "css-pre14E1")), cssB = walk(path.join(HERE, "css-pre14G"));
check("C3", "against 14G's css, exactly components/form.css changed; no file added or removed", j(cssA) === j(cssB) && cssA.length > 30 && j(cssA.filter((f) => read(HERE, "css-pre14E1", f) !== read(HERE, "css-pre14G", f))) === j(["components/form.css"]), cssA.length);

// =================================================================
section("W. Scope and words, from frozen copies");
const NOWJS = path.join(HERE, "js-pre14E1"), PREV = path.join(HERE, "js-pre14GB");
const a = walk(NOWJS), b = walk(PREV);
const FILES = ["pages/expenses.js", "pages/finance-dashboard.js", "pages/payroll-run.js", "pages/payslips.js", "pages/salary-structure.js", "ui/leave-view.js"];
const changed = a.filter((f) => b.includes(f) && read(NOWJS, f) !== read(PREV, f));
check("W1", "against 14G bug's js, exactly the five page scripts and ui/leave-view.js changed; no file added or removed", a.length === b.length && a.length > 90 && j(a) === j(b) && j(changed) === j(FILES), j({ files: a.length, changed }));
const literals = (s) => new Set((s.replace(/(^|\s)\/\/\s.*$/gm, "$1").match(/"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) ?? []));
const NEW = { "ui/leave-view.js": ['"aria-describedby"', '"reason"', "`reason-${++reasons}`"], "pages/expenses.js": ["`${payButton.title}.`"], "pages/salary-structure.js": ['"button:disabled"'] };
const words = FILES.map((f) => { const x = literals(read(NOWJS, f)), y = literals(read(PREV, f)); return [f, [...x].filter((s) => !y.has(s)).sort(), [...y].filter((s) => !x.has(s))]; });
check("W2", "no other words: the only new string literals are the line's class, id and attribute names, the period after Pay's title and Edit's selector; none removed",
  words.every(([f, add, gone]) => j(add) === j([...(NEW[f] ?? [])].sort()) && !gone.length), j(words));
const calls = FILES.slice(0, 5).map((f) => (read(NOWJS, f).match(/showReason\(/g) ?? []).length);
check("W3", "the pages call the one helper: expenses 1, finance dashboard 1, payroll run 2, payslips 1, salary structure 1; the titles are all still set", j(calls) === j([1, 1, 2, 1, 1])
  && FILES.slice(0, 5).every((f) => (read(NOWJS, f).match(/\.title = /g) ?? []).length === (read(PREV, f).match(/\.title = /g) ?? []).length), j(calls));

section("E. No js errors");
check("E99", "no js errors on any load", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));
console.log(`\n${passed} passed, ${failed} failed`);
