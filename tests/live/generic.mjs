// usage: node generic.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 9Q: the Approvals inbox's sample rows name no real person (9L's rule for the audit log: roles, not people, at
// both ends), in jsdom with the js in ./js. ./js-pre9Q, ./html-pre9Q and ./css-pre9Q are the code, pages and styles
// before this round (office-os 9a1932d).
//   A  the pending role change: "Role change: an employee", avatar RC, requested by "An HR Manager"
//   B  the pending purchase order PO-2291: requested by "An Admin"
//   C  the decided role change (Approved, 16 Sep): "Role change: an employee", requested by "An HR Manager"
//   G  no seeded person's name or initials in any sample row
//   W  approvals-inbox.html: exactly those four lines changed
//   Z  the change set, line endings, the other pages untouched, no page errors
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const RAW = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const SRC = (dir, p) => fs.readFileSync(`${HERE}${dir}/${p}`, "utf8");
const OLD = (p) => SRC("html-pre9Q", p);

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 10, 8);
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
const changedLines = (p) => { const a = RAW(p).split("\r\n"), b = OLD(p).split("\r\n"); return a.length === b.length ? a.map((l, i) => [i + 1, l.trim()]).filter(([i]) => a[i - 1] !== b[i - 1]) : null; };
const walk = (root, rel = "") => fs.readdirSync(`${root}/${rel}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${rel}${e.name}/`) : [`${rel}${e.name}`]));

const { ROLES } = await import("./js/config/roles.js");
const { PERMISSIONS } = await import("./js/config/permissions.js");
const { USERS, DEPARTMENTS } = await import("./js/data/users.js");
const holders = (perm) => Object.values(ROLES).filter((r) => r.permissions.includes(perm)).map((r) => r.label);
const person = (name) => USERS.find((u) => u.name === name);
const SAMPLE = "Sample, not built yet";
// A sample row as drawn: the request cell split into avatar / name / sub-line, then the other cells by column header.
const rowOf = (tr) => {
  if (!tr) return null;
  const heads = [...tr.closest("table").querySelectorAll("thead th")].map(txt);
  const o = { avatar: txt(tr.querySelector(".avatar")), name: txt(tr.querySelector(".table__user-name")), sub: txt(tr.querySelector(".table__user-sub")) };
  [...tr.children].slice(1).forEach((td, i) => { if (heads[i + 1] && heads[i + 1] !== "Actions") o[heads[i + 1]] = txt(td); });
  return o;
};

const IN = "requests/approvals-inbox.html", WF = "access/approval-workflows.html";
fresh();
await open("aarav", IN, "approvals-inbox");
const visible = () => [...d.querySelectorAll("#inbox-table tbody tr")].filter((tr) => !tr.hidden && tr.style.display !== "none");
const statics = () => visible().filter((tr) => tr.hasAttribute("data-static"));
const pill = (label) => [...d.querySelectorAll(".tabs__tab")].find((p) => txt(p).startsWith(label));
const wfChain = (name) => { const tr = [...parse(RAW(WF)).querySelectorAll("tbody tr")].find((r) => txt(r.querySelector(".table__user-name")) === name); return [...tr.querySelectorAll(".chain__step")].map(txt); };

// =====================================================================
section("A. The pending role change");
const rc = rowOf(statics().find((tr) => tr.dataset.type === "access"));
check("A1", "Aarav's Pending tab: 'Role change: an employee' (avatar RC), still a labelled sample, requested by 'An HR Manager'; details and wait as before",
  j(rc) === j({ avatar: "RC", name: "Role change: an employee", sub: SAMPLE, Type: "Access", "Requested by": "An HR Manager", Details: "Employee to Team Lead", Waiting: "2 hours" }), j(rc));
check("A2", "…the roles are the app's: the requester is Priya's role (HR Manager, who holds users:edit; the workflows' Role change chain starts at HR); the person changed is an Employee, as 'Employee to Team Lead' says",
  ROLES[person("Priya Nair").role].label === "HR Manager" && holders("users:edit").includes("HR Manager") && wfChain("Role change")[0] === "HR"
  && ROLES[person("Sneha Rao").role].label === "Employee" && rc?.Details.startsWith(`${ROLES.emp.label} to `), j([person("Priya Nair").role, wfChain("Role change")]));
check("A3", "…'Employee to Team Lead' kept as it was (what the role-change workflow depicts is 9K's finding, not this round's)", /<td>Employee to Team Lead<\/td>/.test(RAW(IN)) && RAW(IN).split("Employee to Team Lead").length === 2);

// =====================================================================
section("B. The pending purchase order");
const po = rowOf(statics().find((tr) => tr.dataset.type === "purchase"));
check("B1", "PO-2291 requested by 'An Admin' (was Vikram Singh (Store)); title, avatar PO, sample line, ₹9,75,000 TechNova and '1 day' as before",
  j(po) === j({ avatar: "PO", name: "Purchase order PO-2291", sub: SAMPLE, Type: "Purchase", "Requested by": "An Admin", Details: "₹9,75,000, TechNova", Waiting: "1 day" }), j(po));
check("B2", "…why an Admin: no purchase-order permission exists, only the Admin role holds inventory:create and vendors:create, and the workflows' Purchase order chain starts at an Admin (9P)",
  !Object.keys(PERMISSIONS).some((m) => /purchase|order/i.test(m)) && j(holders("inventory:create")) === j(["Admin"]) && j(holders("vendors:create")) === j(["Admin"])
  && j(wfChain("Purchase order")) === j(["Admin", "Another Admin"]), j(wfChain("Purchase order")));

// =====================================================================
section("C. The decided role change");
pill("Approved").click();
// The script draws the decided samples here as clones (decidedClone): data-type kept, data-static not; the sample line is.
const rcDone = rowOf(visible().find((tr) => tr.dataset.type === "access" && txt(tr.querySelector(".table__user-sub")) === SAMPLE));
check("C1", "Approved tab: 'Role change: an employee', still a labelled sample, requested by 'An HR Manager', decided 16 Sep",
  rcDone?.name === "Role change: an employee" && rcDone.sub === SAMPLE && rcDone.Type === "Access" && rcDone["Requested by"] === "An HR Manager" && rcDone.Decided === "16 Sep", j(rcDone));
const dec = [...d.querySelectorAll("#decided-table tbody tr[data-static]")].map(rowOf);
check("C2", "Recently decided: the same two samples, the role change first (Approved, 16 Sep), then the backup restore (An Admin, 9N)",
  j(dec.map((r) => [r.name, r["Requested by"], r.Decision, r.Date])) === j([["Role change: an employee", "An HR Manager", "Approved", "16 Sep"], ["Backup restore request", "An Admin", "Rejected", "11 Sep"]]), j(dec));

// =====================================================================
section("G. No real person in any sample row");
const raw = parse(RAW(IN));
const sampleRows = [...raw.querySelectorAll("tr[data-static]")];
const NAMES = [...USERS.map((u) => u.name), ...DEPARTMENTS.map((x) => x.head)];
const WORDS = [...new Set(NAMES.flatMap((n) => n.split(" ")))];
const hit = sampleRows.map((tr) => tr.textContent).filter((t) => WORDS.some((x) => new RegExp(`\\b${x}\\b`).test(t)));
check("G1", `the inbox's ${sampleRows.length} sample rows name nobody from users.js (no user, no department head; no first or last name alone)`, sampleRows.length === 5 && hit.length === 0, j(hit));
const initials = new Set(NAMES.map((n) => n.split(" ").map((x) => x[0]).join("")));
const avatars = sampleRows.map((tr) => txt(tr.querySelector(".avatar"))).filter(Boolean);
check("G2", "…nor anyone's initials: the sample avatars are RC, PO, BR (their titles' initials)", j(avatars) === j(["RC", "PO", "BR"]) && avatars.every((a) => !initials.has(a)), j(avatars));

// =====================================================================
section("W. approvals-inbox.html: exactly the four lines");
// Round 11F (layout; was the live page, here and in the check below): this round's own claim, read from 11F's frozen
// result (html-pre11F = HEAD e93d118); the live approvals-inbox has 11F's self-decision line since (pagenotes.mjs I3 / X2)
const inD = ((a, b) => (a.length === b.length ? a.map((l, i) => [i + 1, l.trim()]).filter(([i]) => a[i - 1] !== b[i - 1]) : null))(SRC("html-pre11F", IN).split("\r\n"), OLD(IN).split("\r\n"));
check("W1", "the role change's title cell and requester, the purchase order's requester, the decided role change's line; nothing else (same line count)",
  j(inD?.map(([n]) => n)) === j([210, 212, 220, 283]) && inD[1][1] === "<td>An HR Manager</td>" && inD[2][1] === "<td>An Admin</td>"
  && /avatar--1">RC<\/div><div><span class="table__user-name">Role change: an employee<\/span>/.test(inD[0][1]) && /Role change: an employee<\/span>.*<td>An HR Manager<\/td>$/.test(inD[3][1]), j(inD));

// =====================================================================
section("Z. Change set and hygiene");
// Round 9R (layout; was the live js / pages / css vs the pre9Q copies): 9Q's own change set, read from its frozen
// result (js-pre9R, html-pre9R, css-pre9R = HEAD f16d1ac); the live tree now holds 9R's (roster.mjs Z1 / Z2)
const changedJs = walk(`${HERE}js-pre9R`).filter((f) => SRC("js-pre9R", f) !== SRC("js-pre9Q", f)).sort();
const changedHtml = walk(`${HERE}html-pre9R`).filter((f) => f.endsWith(".html") && SRC("html-pre9R", f) !== OLD(f)).sort();
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const cssRoot = `${HERE}css-pre13U`;
const changedCss = walk(`${HERE}css-pre9R`).filter((f) => SRC("css-pre9R", f) !== SRC("css-pre9Q", f));
check("Z1", "no js changed; nothing added or removed", changedJs.length === 0 && j(walk(`${HERE}js-pre9R`).sort()) === j(walk(`${HERE}js-pre9Q`).sort()), j(changedJs));
check("Z2", "pages changed: requests/approvals-inbox only; css unchanged",
  j(changedHtml) === j([IN]) && changedCss.length === 0 && j(walk(`${HERE}html-pre9R`).sort()) === j(walk(`${HERE}html-pre9Q`).sort()), j([changedHtml, changedCss]));
check("Z3", "it is CRLF only, with no final newline", changedHtml.map((f) => SRC("html-pre9R", f)).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
const LATER = ["access/delegation.html", "account/notifications.html", "announcements/announcements.html", "recruitment/candidates.html", "system/reports.html",
  "system/backup.html", "users/user-form.html", WF, "errors/500.html"];
// Round 9R (layout; was the live pages vs html-pre9Q): what 9Q left alone, read from its frozen result (html-pre9R =
// HEAD f16d1ac); the five whole-page samples are role-based since (roster.mjs), the rest still untouched (roster.mjs Z4)
check("Z4", "byte for byte as before: the five whole-page samples (9R), backup.html, user-form, workflows, 500", LATER.every((p) => SRC("html-pre9R", p) === OLD(p)), j(LATER.filter((p) => SRC("html-pre9R", p) !== OLD(p))));
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
