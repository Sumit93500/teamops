// usage: node holders.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 9T: three samples that said something the app's own rules or data contradict (9S's findings), corrected; in
// jsdom with the js in ./js. ./js-pre9T, ./html-pre9T and ./css-pre9T are the code, pages and styles before this round
// (office-os 31841f0, 9R applied). The clock is fixed at Thu 8 Oct 2026 10:00, as roster.mjs and the browser check.
//   D  delegation.html: every delegator is an Admin, the only role holding delegation:create (rows 1 and 3 were an HR
//      Manager and an employee)
//   S  delegation.html: each delegation's status agrees with its period on 8 Oct 2026 (row 1, 29 Sep – 3 Oct, said
//      Scheduled)
//   N  notifications.html: the work-from-home approval is credited to whoever gave the final approval in the seed
//      (LV-2160: an HR Manager, after the manager)
//   W  exactly these lines changed      Z  the change set, line endings, 9L-9R's other pages untouched, no errors
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const RAW = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const SRC = (dir, p) => fs.readFileSync(`${HERE}${dir}/${p}`, "utf8");
const OLD = (p) => SRC("html-pre9T", p);

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 10, 8);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
URL.createObjectURL = () => "blob:test";
URL.revokeObjectURL = () => {};

const WHO = { aarav: ["admin", "Aarav Mehta", "EMP-1001"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"] };
let loads = 0, w = null, d = null, saved = {};
const jsErrors = [];
async function open(who, page, script, query = "") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) jsErrors.push(`${who} ${page}: ${e.message}`); });
  const dom = new JSDOM(RAW(page), { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
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
const parse = (html) => new JSDOM(html).window.document;
const changedLines = (p) => { const a = SRC("html-pre14A", p).split("\r\n"), b = OLD(p).split("\r\n");   /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */ return a.length === b.length ? a.map((l, i) => [i + 1, l.trim()]).filter(([i]) => a[i - 1] !== b[i - 1]) : null; };
const walk = (root, rel = "") => fs.readdirSync(`${root}/${rel}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${rel}${e.name}/`) : [`${rel}${e.name}`]));

const { ROLES } = await import("./js/config/roles.js");
const { ROUTES } = await import("./js/config/routes.js");
const { USERS, MANAGER_OF } = await import("./js/data/users.js");
const { CHAIN_STAGES } = await import("./js/data/approval-chain.js");
const holders = (perm) => Object.values(ROLES).filter((r) => r.permissions.includes(perm)).map((r) => r.label);
const userById = (id) => USERS.find((u) => u.id === id);
// "An HR Manager" / "An Admin" / "An employee": the article and the role's label, as 9L / 9Q / 9R (roster.mjs)
const asLabel = (role) => `${/^([AEIOU]|HR\b)/i.test(role) ? "An" : "A"} ${role === "Employee" ? "employee" : role}`;

const D_ = "access/delegation.html", N_ = "account/notifications.html";
const TWO = [D_, N_];

// =====================================================================
section("D. delegation.html: every delegator holds delegation:create");
fresh();
await open("aarav", D_, null);
const rowsOf = (doc) => [...doc.querySelectorAll("main table tbody tr")];
const cellsOf = (tr) => [txt(tr.querySelector(".avatar")), txt(tr.querySelector(".table__user-name")), ...[...tr.children].slice(1).map(txt)];
const dRows = rowsOf(d).map(cellsOf);
check("D1", "the three delegations, as drawn for Aarav: An Admin -> Anil Verma (Ended), An Admin -> Ritu Malhotra (Scheduled), An Admin -> A department head (Ended); avatar AD on each",
  j(dRows) === j([["AD", "An Admin", "Anil Verma", "29 Sep – 3 Oct", "Leave, regularization", "Ended"], ["AD", "An Admin", "Ritu Malhotra", "12 – 16 Oct", "Purchase orders, role changes", "Scheduled"],
    ["AD", "An Admin", "A department head", "12 – 14 Jul", "Leave, regularization", "Ended"]]), j(dRows));
const covers = { "Leave, regularization": ["leave:approve", "attendance:approve"], "Purchase orders, role changes": [] };   // purchase orders and role changes: no permission of their own; Admin holds everything
check("D2", "…each is someone who may delegate: delegation:create is Admin's alone (and gates the page), and an Admin can approve what each row hands over",
  j(holders("delegation:create")) === j(["Admin"]) && ROUTES[D_] === "delegation:create" && dRows.every((r) => r[1] === asLabel(ROLES.admin.label))
  && dRows.every((r) => covers[r[4]] && covers[r[4]].every((p) => ROLES.admin.permissions.includes(p))), j([holders("delegation:create"), ROUTES[D_]]));
const old = parse(OLD(D_));
const firstCell = (tr) => tr.children[0].outerHTML;
check("D3", "…rows 1 and 3's delegator cell is row 2's byte for byte (avatar AD in avatar--3, the colour every AD avatar has, as in the audit log and announcements)",
  rowsOf(d).every((tr) => firstCell(tr) === firstCell(rowsOf(old)[1]))
  && ["system/audit-log.html", "announcements/announcements.html"].every((p) => [...parse(RAW(p)).querySelectorAll("main .avatar")].filter((a) => txt(a) === "AD").every((a) => a.className === "avatar avatar--3")),
  j(rowsOf(d).map(firstCell)));
check("D4", "…nothing else on the page moved: delegates, periods and cover as before; rows 2 and 3's status; the form ('Delegate to' options) and the 'Your delegations' card byte for byte",
  rowsOf(d).length === 3 && rowsOf(d).every((tr, i) => [1, 2, 3].every((k) => tr.children[k].outerHTML === rowsOf(old)[i].children[k].outerHTML))
  && [1, 2].every((i) => rowsOf(d)[i].children[4].outerHTML === rowsOf(old)[i].children[4].outerHTML)
  && parse(RAW(D_)).querySelector("main form").outerHTML === old.querySelector("main form").outerHTML
  && parse(RAW(D_)).querySelector("main aside").outerHTML === old.querySelector("main aside").outerHTML);

// =====================================================================
section("S. delegation.html: each status agrees with its period on Thu 8 Oct 2026");
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
// "29 Sep – 3 Oct" / "12 – 16 Oct": [start, end] in 2026 (the sample's year: its "Upcoming" card is 12 – 16 Oct)
const period = (t) => { const m = t.match(/^(\d+)(?: (\w{3}))? – (\d+) (\w{3})$/); return m ? [new RealDate(2026, MONTHS[m[2] ?? m[4]], +m[1]), new RealDate(2026, MONTHS[m[4]], +m[3], 23, 59)] : null; };
const today = new Date();
const expected = ([from, to]) => (to < today ? "Ended" : from > today ? "Scheduled" : "Active");
const agree = (rows) => rows.map((r) => [r[3], r[5], period(r[3]) && expected(period(r[3]))]);
check("S1", "every row's status is what its period says on 8 Oct 2026 (29 Sep – 3 Oct: Ended; 12 – 16 Oct: Scheduled; 12 – 14 Jul: Ended)",
  today.getFullYear() === 2026 && today.getMonth() === 9 && today.getDate() === 8 && agree(dRows).every(([, s, e]) => s === e), j(agree(dRows)));
check("S2", "…row 1's Ended badge is row 3's markup (badge badge--dot, no info colour)", rowsOf(d)[0].children[4].outerHTML === rowsOf(old)[2].children[4].outerHTML, rowsOf(d)[0].children[4].outerHTML);
const aside = d.querySelector("main aside");
check("S3", "…and the 'Your delegations' card, unchanged, still agrees: 1 scheduled (Ritu Malhotra, 12 – 16 Oct, starts after today), nothing active right now",
  txt(aside.querySelector(".card__meta")) === "1 scheduled" && /^12 – 16 Oct,/.test(txt(aside.querySelector(".list__sub"))) && expected(period("12 – 16 Oct")) === "Scheduled"
  && /Nothing active right now/.test(txt(aside)), txt(aside.querySelector(".card")));

// =====================================================================
section("N. notifications.html: the work-from-home approval credited as in the seed");
fresh();
await open("arjun", N_, null);
const noteOf = (n) => [txt(n.querySelector(".notif__title")), txt(n.querySelector(".list__sub")), txt(n.querySelector(".notif__time"))];
const notes = [...d.querySelectorAll(".notif")].map(noteOf);
const oldNotes = [...parse(OLD(N_)).querySelectorAll(".notif")].map(noteOf);
check("N1", "the work-from-home notification reads 'Leave. Approved by an HR Manager' (was 'by your manager'); the other four, its title and time as before",
  notes.length === 5 && j(notes[4]) === j(["Your work from home request for 12 Aug was approved", "Leave. Approved by an HR Manager", "12 Aug"])
  && j(notes.slice(0, 4)) === j(oldNotes.slice(0, 4)) && notes[4][0] === oldNotes[4][0] && notes[4][2] === oldNotes[4][2], j(notes[4]));
const { getRequest, approvalChainText } = await import(`./js/data/leave-store.js?load=${loads}`);
const lv = getRequest("LV-2160");
const steps = lv?.history.filter((h) => h.decision === "approved").map((h) => [h.stage, h.byUserId, ROLES[userById(h.byUserId)?.role]?.label]) ?? [];
check("N2", "…it is the reader's seeded LV-2160 (Arjun, work from home, 12 Aug, approved): his manager approved the manager stage, then an HR Manager the HR stage, the final one",
  lv?.userId === "EMP-1105" && lv.type === "wfh" && lv.from === "2026-08-12" && lv.status === "approved" && lv.stage === "done"
  && j(CHAIN_STAGES) === j(["manager", "hr"]) && j(steps.map((s) => s[0])) === j(CHAIN_STAGES)
  && steps[0][1] === MANAGER_OF["EMP-1105"] && steps[1][2] === "HR Manager" && asLabel(steps[1][2]) === "An HR Manager"
  && approvalChainText("EMP-1105") === "Sneha Rao, then HR or an Admin", j(steps));
check("N3", "…the manager can't give the final approval: Sneha's role (Employee) holds no leave:approve; she decides only the manager stage, by relationship",
  ROLES[userById("EMP-1029").role].label === "Employee" && !ROLES.emp.permissions.includes("leave:approve") && j(holders("leave:approve")) === j(["Admin", "HR Manager"]));

// =====================================================================
section("W. Exactly these lines");
const LINES = { [D_]: [269, 271, 279], [N_]: [157] };
const got = Object.fromEntries(TWO.map((p) => [p, changedLines(p)?.map(([n]) => n) ?? null]));
check("W1", "each page differs from html-pre9T only in its own lines (same line counts): delegation 269, 271, 279; notifications 157", j(got) === j(LINES), j(got));

// =====================================================================
section("Z. Change set and hygiene");
// Round 9U (layout; was the live js vs js-pre9T): 9T's own claim, read from its frozen result (js-pre9U = HEAD
// 4f73ccf); the live js has 9U's user-form.js and store.js since (adminguard.mjs X1)
const changedJs = walk(`${HERE}js-pre9U`).filter((f) => SRC("js-pre9U", f) !== SRC("js-pre9T", f)).sort();
// Round 11B (layout; was the live pages, here and in the check below): this round's own page claim, read from its
// frozen result (html-pre11B = HEAD 97e1e6c); the live pages have 11B's sessions.html banner since (acctpages.mjs X2)
const changedHtml = walk(`${HERE}html-pre11B`).filter((f) => f.endsWith(".html") && SRC("html-pre11B", f) !== OLD(f)).sort();
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const cssRoot = `${HERE}css-pre13U`;
const changedCss = walk(cssRoot).filter((f) => fs.readFileSync(`${cssRoot}/${f}`, "utf8") !== SRC("css-pre9T", f));
check("Z1", "no js changed; nothing added or removed", changedJs.length === 0 && j(walk(`${HERE}js-pre9U`).sort()) === j(walk(`${HERE}js-pre9T`).sort()), j(changedJs));
check("Z2", "pages changed: exactly the two; css unchanged", j(changedHtml) === j([...TWO].sort()) && changedCss.length === 0 && j(walk(`${HERE}html-pre11B`).sort()) === j(walk(`${HERE}html-pre9T`).sort()), j([changedHtml, changedCss]));
check("Z3", "the 2 are CRLF only, with no final newline", changedHtml.map(RAW).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
// Round 11F (layout; was the live page, here and in the check below): this round's own claim, read from 11F's frozen
// result (html-pre11F = HEAD e93d118); the live approvals-inbox has 11F's self-decision line since (pagenotes.mjs I3 / X2)
const DONE = ["announcements/announcements.html", "recruitment/candidates.html", "system/reports.html", "requests/approvals-inbox.html", "access/approval-workflows.html",
  "errors/500.html", "system/backup.html", "users/user-form.html", "system/audit-log.html"];
check("Z4", "byte for byte as before: 9R's other three pages (announcements, candidates, reports), 9Q's inbox, 9P's workflows and 500, 9M's backup, 9N's user-form, 9L's audit log",
  DONE.every((p) => SRC("html-pre11F", p) === OLD(p)), j(DONE.filter((p) => SRC("html-pre11F", p) !== OLD(p))));
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
