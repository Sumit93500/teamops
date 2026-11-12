// usage: node remnants.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 9N: the last of the backlog from 9K / 9L / 9M, in jsdom with the js in ./js. ./js-pre9N, ./html-pre9N and
// ./css-pre9N are the code, pages and styles before this round (office-os 5369081).
//   A  approvals-inbox.html: the backup-restore samples are requested by "An Admin" (was "IT Support")
//   B  user-form.html: no "Auditor" extra-role option
//   C  approval-workflows.html: the Leave row's types include unpaid leave
//   Z  the change set, line endings, no page errors
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const RAW = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const SRC = (dir, p) => fs.readFileSync(`${HERE}${dir}/${p}`, "utf8");
const OLD = (p) => SRC("html-pre9N", p);

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 10, 7);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
URL.createObjectURL = () => "blob:test";
URL.revokeObjectURL = () => {};

const WHO = { aarav: ["admin", "Aarav Mehta", "EMP-1001"] };
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
// The lines that differ from the frozen copy, by position, as [line number, new line]; null if the count changed.
const changedLines = (p) => { const a = RAW(p).split("\r\n"), b = OLD(p).split("\r\n"); return a.length === b.length ? a.map((l, i) => [i + 1, l.trim()]).filter(([i]) => a[i - 1] !== b[i - 1]) : null; };
// A table row's cells, by column header.
const byHeader = (tr) => { const heads = [...tr.closest("table").querySelectorAll("thead th")].map(txt); return Object.fromEntries([...tr.children].map((td, i) => [heads[i], txt(td)])); };

const { ROLES } = await import("./js/config/roles.js");
const { LEAVE_POLICY, LEAVE_TYPES } = await import("./js/data/leave-store.js");

// =====================================================================
section("A. approvals-inbox.html: the backup-restore samples");
const IN = "requests/approvals-inbox.html";
setNow(2026, 10, 7); fresh();
await open("aarav", IN, "approvals-inbox");
const pendingRow = [...d.querySelectorAll("tbody tr")].find((tr) => /Backup restore request/.test(txt(tr)) && !tr.hidden);
check("A1", "Aarav's inbox, Pending: the sample 'Backup restore request' is requested by 'An Admin' (was 'IT Support'), still labelled a sample, backup of 14 Sep",
  pendingRow && byHeader(pendingRow)["Requested by"] === "An Admin" && /Sample, not built yet/.test(txt(pendingRow)) && byHeader(pendingRow).Details === "Backup of 14 Sep, 1.2 GB", j(pendingRow && byHeader(pendingRow)));
const inbox = parse(RAW(IN));
const decided = [...inbox.querySelectorAll('tr[data-static][data-type="system"][data-status="rejected"]')];
check("A2", "the decided sample (Rejected, 11 Sep) is requested by 'An Admin' too", decided.length === 1 && byHeader(decided[0])["Requested by"] === "An Admin" && /Rejected/.test(txt(decided[0])),
  j(decided.map(byHeader)));
const holders = Object.values(ROLES).filter((r) => r.permissions.includes("backup:restore")).map((r) => r.label);
const bkStep = txt(parse(RAW("system/backup.html")).querySelector(".stepper__text strong"));
check("A3", "…which matches backup.html's 'An Admin asks' (9M) and the app: only the Admin role holds backup:restore", bkStep === "An Admin asks" && j(holders) === j(["Admin"]), j([bkStep, holders]));
check("A4", "no 'IT Support' anywhere on the inbox page", !/IT Support/.test(RAW(IN)));
// Round 9Q (layout; was the live page vs html-pre9N): 9N's own two cells, read from its frozen result (html-pre9Q =
// HEAD 9a1932d; 9P didn't touch the inbox); the live page's other samples are generic since (generic.mjs W1)
const inNow = SRC("html-pre9Q", IN).split("\r\n"), inOld = OLD(IN).split("\r\n");
const inD = inNow.length === inOld.length ? inNow.map((l, i) => [i + 1, l.trim()]).filter(([i]) => inNow[i - 1] !== inOld[i - 1]) : null;
check("A5", "approvals-inbox.html: exactly those two cells changed (same line count)", inD?.length === 2 && inD.every(([, l]) => /<td>An Admin<\/td>$/.test(l)), j(inD));

// =====================================================================
section("B. user-form.html: no Auditor extra role");
const UF = "users/user-form.html";
setNow(2026, 10, 7); fresh();
await open("aarav", UF, "user-form", "?id=EMP-1105");
const extra = [...d.querySelectorAll('input[name="extraRole"]')].map((i) => [i.value, txt(i.closest("label"))]);
// Round 11R (behaviour; Q-D1: Additional roles dropped in round 11R; none of them was a role)
check("B1", "Additional roles: none at all (Auditor gone in 9N, the other three with the field in round 11R)", j(extra) === "[]" && !/Additional roles/.test(txt(d.querySelector("main"))), j(extra));
const designations = txt(parse(RAW("access/designations.html")).querySelector("main"));
// Round 11R (behaviour; Q-D1: with no additional role left, 'each one left' would hold of nothing; it now says so)
check("B2", "…none left (round 11R); 'Auditor' is now on no page and in no js",
  extra.length === 0
  && fs.readdirSync(DIR, { recursive: true }).filter((f) => f.endsWith(".html")).every((f) => !/Auditor/.test(fs.readFileSync(`${DIR}/${f}`, "utf8")))
  && !/Auditor/.test(fs.readdirSync(`${HERE}js`, { recursive: true }).filter((f) => f.endsWith(".js")).map((f) => SRC("js", f)).join("\n")));
// Round 11R (behaviour; R0 test 4: everyone's own pages can't be overridden, so payslip:view-own went; an Employee is offered nothing to deny)
check("B3", "…9M's deny list is gone with payslip:view-own (round 11R): nothing to deny for Arjun, an Employee; editing him opens without a page error",
  d.querySelectorAll('input[name="deny"]').length === 0 && jsErrors.length === 0);
// Round 11L (layout; was the live user-form.html): 9N's own one-line removal, read from the frozen result (html-pre11L = HEAD 2883a77); the
// live tree has 11L's removal of two switches since (sweepnotes.mjs W3 / W4)
const ufNow = SRC("html-pre11L", UF).split("\r\n"), ufOld = OLD(UF).split("\r\n");
check("B4", "user-form.html: exactly that one line removed, nothing added",
  ufNow.length === ufOld.length - 1 && j(ufOld.filter((l) => !ufNow.includes(l)).map((l) => l.trim())) === j(['<label class="check"><input type="checkbox" name="extraRole" value="auditor"> Auditor</label>'])
  && ufNow.every((l) => ufOld.includes(l)));

// =====================================================================
section("C. approval-workflows.html: unpaid leave in the Leave row");
const WF = "access/approval-workflows.html";
setNow(2026, 10, 7); fresh();
await open("aarav", WF, "approval-workflows");
const leaveRow = [...d.querySelectorAll("tbody tr")].find((tr) => txt(tr.querySelector(".table__user-name")) === "Leave");
const sub = txt(leaveRow?.querySelector(".table__user-sub"));
const policy = LEAVE_TYPES.map((t) => LEAVE_POLICY[t].label.replace(/ leave$/, "").toLowerCase()).join(", ");
check("C1", "the Leave row: 'Casual, sick, earned, work from home, unpaid' (was without unpaid) = every leave type, in LEAVE_POLICY's order",
  sub === "Casual, sick, earned, work from home, unpaid" && sub.toLowerCase() === policy, j([sub, policy]));
check("C2", "…the rest of the row as before: Employee -> Manager -> HR, 'All leave types. No manager on file: straight to HR', Active",
  j([...leaveRow.querySelectorAll(".chain__step")].map(txt)) === j(["Employee", "Manager", "HR"]) && txt(leaveRow.children[2]) === "All leave types. No manager on file: straight to HR" && /Active/.test(txt(leaveRow.children[3])));
const ex = [...d.querySelectorAll("#expense-example .stepper__step")].map((s) => `${txt(s.querySelector("strong"))}:${s.classList.contains("is-done") ? "done" : s.classList.contains("is-current") ? "current" : "-"}`);
check("C3", "9M's ₹62,000 example is unchanged (drawn at Admin)", j(ex) === j(["Employee sends:done", "Manager:done", "Finance:done", "Admin:current"]), j(ex));
// Round 9P (layout; was the live page vs html-pre9N): 9N's own line, read from its frozen result (html-pre9P =
// HEAD 8ee9ad7); the live page has since lost its fictional roles too (fictional.mjs W1)
const wfNow = SRC("html-pre9P", WF).split("\r\n"), wfOld = OLD(WF).split("\r\n");
const wfD = wfNow.length === wfOld.length ? wfNow.map((l, i) => [i + 1, l.trim()]).filter(([i]) => wfNow[i - 1] !== wfOld[i - 1]) : null;
check("C4", "approval-workflows.html: exactly that one line changed (same line count)", wfD?.length === 1 && /Casual, sick, earned, work from home, unpaid<\/span><\/td>$/.test(wfD[0][1]), j(wfD));

// =====================================================================
section("Z. Change set and hygiene");
const walk = (root, rel = "") => fs.readdirSync(`${root}/${rel}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${rel}${e.name}/`) : [`${rel}${e.name}`]));
// Round 9P (layout; was the live js / pages / css vs the pre9N copies): 9N's own change set, read from its frozen
// result (js-pre9P, html-pre9P, css-pre9P = HEAD 8ee9ad7); the live tree now holds 9P's (fictional.mjs Z1 / Z2)
const changedJs = walk(`${HERE}js-pre9P`).filter((f) => SRC("js-pre9P", f) !== SRC("js-pre9N", f)).sort();
const changedHtml = walk(`${HERE}html-pre9P`).filter((f) => f.endsWith(".html") && SRC("html-pre9P", f) !== OLD(f)).sort();
const changedCss = walk(`${HERE}css-pre9P`).filter((f) => SRC("css-pre9P", f) !== SRC("css-pre9N", f));
check("Z1", "no js changed; nothing added or removed", changedJs.length === 0 && j(walk(`${HERE}js-pre9P`).sort()) === j(walk(`${HERE}js-pre9N`).sort()), j(changedJs));
check("Z2", "pages changed: access/approval-workflows, requests/approvals-inbox, users/user-form (not backup.html, not designations.html); css unchanged",
  j(changedHtml) === j(["access/approval-workflows.html", "requests/approvals-inbox.html", "users/user-form.html"]) && changedCss.length === 0 && j(walk(`${HERE}html-pre9P`).sort()) === j(walk(`${HERE}html-pre9N`).sort()), j([changedHtml, changedCss]));
check("Z3", "the 3 are CRLF only, with no final newline", changedHtml.map((f) => SRC("html-pre9P", f)).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
