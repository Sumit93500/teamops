// usage: node fictional.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 9P: no fictional roles left ("IT Support", "Store Manager": neither is a role in roles.js or anyone's
// designation in users.js), in jsdom with the js in ./js. ./js-pre9P, ./html-pre9P and ./css-pre9P are the code, pages
// and styles before this round (office-os 8ee9ad7).
//   A  approval-workflows.html: the Backup restore chain is Admin -> Another Admin (was IT Support -> Admin)
//   B  announcements.html: the network-maintenance post is by "An Admin" (was "IT Support", Operations)
//   C  errors/500.html: "tell an Admin" (was "tell IT Support")
//   D  approval-workflows.html: no "Store Manager" (the Purchase order chain and the limits sample's two tiers)
//   E  approval-workflows.html: the Purchase order row's note follows D
//   W  approval-workflows.html: exactly those five lines changed
//   G  neither name on any page; in js only the dead data/requests.js
//   Z  the change set, line endings, the out-of-scope pages untouched, no page errors
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const RAW = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const SRC = (dir, p) => fs.readFileSync(`${HERE}${dir}/${p}`, "utf8");
const OLD = (p) => SRC("html-pre9P", p);

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
// The lines that differ from the frozen copy, by position, as [line number, new line]; null if the count changed.
const changedLines = (p) => { const a = SRC("html-pre14A", p).split("\r\n"), b = OLD(p).split("\r\n");   /* Round 14A (layout; was the live page): 9c7423e's, frozen; the live pages: pagefreeze.mjs */ return a.length === b.length ? a.map((l, i) => [i + 1, l.trim()]).filter(([i]) => a[i - 1] !== b[i - 1]) : null; };
const walk = (root, rel = "") => fs.readdirSync(`${root}/${rel}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${rel}${e.name}/`) : [`${rel}${e.name}`]));

const { ROLES } = await import("./js/config/roles.js");
const { PERMISSIONS } = await import("./js/config/permissions.js");
const holders = (perm) => Object.values(ROLES).filter((r) => r.permissions.includes(perm)).map((r) => r.label);
const FICTIONAL = /IT Support|Store Manager/;

// =====================================================================
section("A. approval-workflows.html: the Backup restore chain");
const WF = "access/approval-workflows.html";
fresh();
await open("aarav", WF, "approval-workflows");
const wfRow = (name) => [...d.querySelectorAll("tbody tr")].find((tr) => txt(tr.querySelector(".table__user-name")) === name);
// A row as drawn: name, sub-line, the chain's steps with their start / end class, the note, the status badge.
const rowOf = (name) => { const tr = wfRow(name); return tr && {
  name: txt(tr.querySelector(".table__user-name")), sub: txt(tr.querySelector(".table__user-sub")),
  chain: [...tr.querySelectorAll(".chain__step")].map((s) => [txt(s), s.classList.contains("chain__step--start") ? "start" : s.classList.contains("chain__step--end") ? "end" : "-"]),
  note: txt(tr.children[2]), status: txt(tr.children[3]) }; };
const backup = rowOf("Backup restore");
check("A1", "the Backup restore row: Admin -> Another Admin (was IT Support -> Admin); its name, sub-line, 'Admin only' and 'Not built' as before",
  j(backup) === j({ name: "Backup restore", sub: "Rolling back company data", chain: [["Admin", "start"], ["Another Admin", "end"]], note: "Admin only", status: "Not built" }), j(backup));
const bkSteps = [...parse(RAW("system/backup.html")).querySelectorAll(".stepper__text strong")].map(txt);
check("A2", "…the same two people as backup.html's restore steps (9M: 'An Admin asks', 'Another Admin approves'), and the app's: only the Admin role holds backup:restore",
  j(bkSteps.slice(0, 2)) === j(["An Admin asks", "Another Admin approves"]) && j(holders("backup:restore")) === j(["Admin"])
  && backup?.chain[0][0] === holders("backup:restore")[0] && backup?.chain[1][0] === `Another ${holders("backup:restore")[0]}`, j([bkSteps, holders("backup:restore")]));
check("A3", "no 'IT Support' anywhere on the workflows page", !/IT Support/.test(RAW(WF)) && !/IT Support/.test(txt(d.body)));

// =====================================================================
section("B. announcements.html: the network-maintenance post");
const AN = "announcements/announcements.html";
await open("aarav", AN, null);
const posts = [...d.querySelectorAll("article.post")];
const net = posts.find((p) => txt(p.querySelector(".post__title")) === "Office network maintenance on Saturday");
const head = net && { avatar: txt(net.querySelector(".avatar")), author: txt(net.querySelector(".post__head .fw-medium")), meta: txt(net.querySelector(".post__head small")) };
check("B1", "the post is by 'An Admin', avatar 'AD', dated 16 Sep (was 'IT Support', 'IT', 'Operations, 16 Sep')",
  j(head) === j({ avatar: "AD", author: "An Admin", meta: "16 Sep" }), j(head));
check("B2", "…its title, body, audience and read count as before; still the third of four posts",
  posts.length === 4 && posts[2] === net && txt(net.querySelector(".post__body")) === "Wi-Fi and VPN will be down from 10 PM to 2 AM. Save your work first, and avoid scheduling late deployments."
  && j([...net.querySelectorAll(".post__foot span")].map(txt)) === j(["Sent to Engineering and Operations", "Read by 118 of 129"]), j(net && [...net.querySelectorAll(".post__foot span")].map(txt)));
check("B3", "…and an Admin may post: Admin holds announcements:create", holders("announcements:create").includes("Admin"), j(holders("announcements:create")));
const oldPosts = [...parse(OLD(AN)).querySelectorAll("article.post")];
// Round 9R (layout; was the live posts / page vs html-pre9P): 9P's own lines, read from its frozen result (html-pre9R =
// HEAD f16d1ac); the live posts' authors are role-based since (roster.mjs A1)
const posts9R = [...parse(SRC("html-pre9R", AN)).querySelectorAll("article.post")];
check("B4", "the other three posts are byte for byte as before (their real names are 9Q's, not this round's)",
  [0, 1, 3].every((i) => posts9R[i].outerHTML === oldPosts[i].outerHTML));
const anNow = SRC("html-pre9R", AN).split("\r\n"), anOld = OLD(AN).split("\r\n");
const anD = anNow.length === anOld.length ? anNow.map((l, i) => [i + 1, l.trim()]).filter(([i]) => anNow[i - 1] !== anOld[i - 1]) : null;
check("B5", "announcements.html: exactly the post head's two lines changed (same line count); no 'IT Support' on the page",
  j(anD) === j([[159, '<div class="avatar avatar--3">AD</div>'], [160, '<div class="grow"><span class="fw-medium">An Admin</span><small>16 Sep</small></div>']]) && !/IT Support/.test(RAW(AN)), j(anD));

// =====================================================================
section("C. errors/500.html");
const E5 = "errors/500.html";
await open("aarav", E5, null);
check("C1", "'If it keeps happening, tell an Admin and share the reference below.' (was 'tell IT Support')",
  txt(d.querySelector(".empty__text")) === "The page couldn't be loaded. Your data is safe. Try again in a moment. If it keeps happening, tell an Admin and share the reference below.", txt(d.querySelector(".empty__text")));
const e5D = changedLines(E5);
check("C2", "500.html: exactly that line changed (same line count); its reference and buttons as before; no 'IT Support'",
  e5D?.length === 1 && e5D[0][0] === 24 && txt(d.querySelector("code")) === "REF-7F3A-2291" && j([...d.querySelectorAll(".btn-group .btn")].map(txt)) === j(["Try again", "Go to dashboard"]) && !/IT Support/.test(SRC("html-pre14A", E5)), j(e5D));

// =====================================================================
section("D. approval-workflows.html: no Store Manager");
await open("aarav", WF, "approval-workflows");
const po = rowOf("Purchase order");
check("D1", "the Purchase order row: Admin -> Another Admin (was Store Manager -> Admin); name, sub-line, 'Not built' as before",
  j([po?.name, po?.sub, po?.chain, po?.status]) === j(["Purchase order", "Stock and equipment", [["Admin", "start"], ["Another Admin", "end"]], "Not built"]), j(po));
const limits = [...d.querySelectorAll(".card")].find((c) => txt(c.querySelector(".card__title")) === "Purchase order limits");
const tiers = [...(limits?.querySelectorAll(".tier") ?? [])].map((t) => [txt(t.querySelector(".tier__range")), txt(t.querySelector(".table__user-sub")), txt(t.querySelector(".badge"))]);
check("D2", "'Purchase order limits' (still a labelled sample): 'Another Admin approves' up to ₹1,00,000, 'Two other Admins approve' above; the 1 / 2 approver badges kept",
  j(tiers) === j([["Up to ₹1,00,000", "Another Admin approves", "1 approver"], ["Above ₹1,00,000", "Two other Admins approve", "2 approvers"]]) && txt(limits.querySelector(".card__meta")) === "Sample, not built yet", j(tiers));
check("D3", "…why Admin: no purchase-order permission exists, and only the Admin role holds the stock and vendor ones (inventory:create, vendors:create)",
  !Object.keys(PERMISSIONS).some((m) => /purchase|order/i.test(m)) && !Object.values(PERMISSIONS).flat().some((a) => /purchase|order/i.test(a))
  && j(holders("inventory:create")) === j(["Admin"]) && j(holders("vendors:create")) === j(["Admin"]));
check("D4", "no 'Store Manager' anywhere on the workflows page", !/Store Manager/.test(RAW(WF)) && !/Store Manager/.test(txt(d.body)));

// =====================================================================
section("E. approval-workflows.html: the Purchase order row's note");
check("E1", "'Two other Admins above ₹1,00,000' (was 'Admin only above ₹1,00,000', untrue with an Admin starting the chain), as the second tier says",
  po?.note === "Two other Admins above ₹1,00,000" && tiers[1]?.[1] === "Two other Admins approve", po?.note);

// =====================================================================
section("W. approval-workflows.html: exactly the five lines");
const NEW = [
  [236, '<td><div class="chain"><span class="chain__step chain__step--start">Admin</span><span class="chain__step chain__step--end">Another Admin</span></div></td>'],
  [237, "<td>Two other Admins above ₹1,00,000</td>"],
  [271, '<td><div class="chain"><span class="chain__step chain__step--start">Admin</span><span class="chain__step chain__step--end">Another Admin</span></div></td>'],
  [291, '<div><span class="tier__range">Up to ₹1,00,000</span><span class="table__user-sub">Another Admin approves</span></div>'],
  [295, '<div><span class="tier__range">Above ₹1,00,000</span><span class="table__user-sub">Two other Admins approve</span></div>'],
];
// Round 12Z (layout; was the live page): 9P's lines as 77b5ddb has the page (html-pre12Z); the live page: salinbox.mjs X2
const wfNow = SRC("html-pre12Z", WF).split("\r\n"), wfOld = OLD(WF).split("\r\n");
const wfD = wfNow.length === wfOld.length ? wfNow.map((l, i) => [i + 1, l.trim()]).filter(([i]) => wfNow[i - 1] !== wfOld[i - 1]) : null;
check("W1", "approval-workflows.html: the two chains, the note and the two tiers changed, nothing else (same line count)", j(wfD) === j(NEW), j(wfD));

// =====================================================================
section("G. Neither name anywhere");
const pages = walk(DIR).filter((f) => f.endsWith(".html"));
check("G1", "no page mentions 'IT Support' or 'Store Manager'", pages.length > 0 && pages.every((f) => !FICTIONAL.test(RAW(f))), j(pages.filter((f) => FICTIONAL.test(RAW(f)))));
const jsWith = walk(`${HERE}js`).filter((f) => FICTIONAL.test(SRC("js", f)));
check("G2", "in js, only data/requests.js still says 'Store Manager': a comment in a file nothing imports (backlog L4 keeps it byte for byte)",
  j(jsWith) === j(["data/requests.js"]) && SRC("js", "data/requests.js").split("\n").filter((l) => FICTIONAL.test(l)).every((l) => /^\s.*\/\/.*Store Manager/.test(l))
  && walk(`${HERE}js`).filter((f) => f.endsWith(".js")).every((f) => !/[/"']requests\.js["']/.test(SRC("js", f))) && pages.every((f) => !/[/"']requests\.js["']/.test(RAW(f))), j(jsWith));

// =====================================================================
section("Z. Change set and hygiene");
// Round 9Q (layout; was the live js / pages / css vs the pre9P copies): 9P's own change set, read from its frozen
// result (js-pre9Q, html-pre9Q, css-pre9Q = HEAD 9a1932d); the live tree now holds 9Q's (generic.mjs Z1 / Z2)
const changedJs = walk(`${HERE}js-pre9Q`).filter((f) => SRC("js-pre9Q", f) !== SRC("js-pre9P", f)).sort();
const changedHtml = walk(`${HERE}html-pre9Q`).filter((f) => f.endsWith(".html") && SRC("html-pre9Q", f) !== OLD(f)).sort();
const changedCss = walk(`${HERE}css-pre9Q`).filter((f) => SRC("css-pre9Q", f) !== SRC("css-pre9P", f));
check("Z1", "no js changed; nothing added or removed", changedJs.length === 0 && j(walk(`${HERE}js-pre9Q`).sort()) === j(walk(`${HERE}js-pre9P`).sort()), j(changedJs));
check("Z2", "pages changed: access/approval-workflows, announcements/announcements, errors/500; css unchanged",
  j(changedHtml) === j(["access/approval-workflows.html", "announcements/announcements.html", "errors/500.html"]) && changedCss.length === 0 && j(walk(`${HERE}html-pre9Q`).sort()) === j(walk(`${HERE}html-pre9P`).sort()), j([changedHtml, changedCss]));
check("Z3", "the 3 are CRLF only, with no final newline", changedHtml.map((f) => SRC("html-pre9Q", f)).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
const LATER = ["requests/approvals-inbox.html", "access/delegation.html", "account/notifications.html", "recruitment/candidates.html", "system/reports.html", "system/backup.html"];
// Round 9Q (layout; was the live pages vs html-pre9P): what 9P left alone, read from its frozen result (html-pre9Q =
// HEAD 9a1932d); the live inbox's samples are generic since (generic.mjs), the others still untouched (generic.mjs Z4)
check("Z4", "out of scope, byte for byte as before: the inbox's real-name samples (9Q), the whole-page samples (9R), backup.html",
  LATER.every((p) => SRC("html-pre9Q", p) === OLD(p)), j(LATER.filter((p) => SRC("html-pre9Q", p) !== OLD(p))));
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
