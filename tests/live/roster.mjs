// usage: node roster.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 9R: the five whole-page samples name no real person (users.js' people and department heads), as 9L / 9N / 9Q:
// role-based labels from roles.js / users.js at both ends; made-up names kept. In jsdom with the js in ./js.
// ./js-pre9R, ./html-pre9R and ./css-pre9R are the code, pages and styles before this round (office-os f16d1ac).
//   D  access/delegation.html        N  account/notifications.html      A  announcements/announcements.html
//   C  recruitment/candidates.html   R  system/reports.html
//   G  no seeded person's name or initials left in the five pages' content (the topbar is the signed-in person)
//   W  each page: exactly its own lines changed      Z  the change set, line endings, other pages untouched, no errors
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const RAW = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const SRC = (dir, p) => fs.readFileSync(`${HERE}${dir}/${p}`, "utf8");
const OLD = (p) => SRC("html-pre9R", p);

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 10, 8);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
URL.createObjectURL = () => "blob:test";
URL.revokeObjectURL = () => {};

const WHO = { aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"] };
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
const { USERS, DEPARTMENTS, MANAGER_OF } = await import("./js/data/users.js");
const holders = (perm) => Object.values(ROLES).filter((r) => r.permissions.includes(perm)).map((r) => r.label);
const roleOf = (name) => ROLES[USERS.find((u) => u.name === name)?.role]?.label;
// "An HR Manager" / "An Admin" / "A Finance Manager" / "An employee": the article and the role's label, as 9L / 9Q
const asLabel = (role) => `${/^([AEIOU]|HR\b)/i.test(role) ? "An" : "A"} ${role === "Employee" ? "employee" : role}`;   // "An HR …": said aitch

const D_ = "access/delegation.html", N_ = "account/notifications.html", A_ = "announcements/announcements.html", C_ = "recruitment/candidates.html", R_ = "system/reports.html";
const FIVE = [D_, N_, A_, C_, R_];

// =====================================================================
section("D. delegation.html");
fresh();
await open("aarav", D_, null);
const opts = [...d.querySelectorAll("#d-to option")].map(txt);
check("D1", "'Delegate to': Ritu Malhotra (Admin) kept (made up), then 'A department head' and 'An HR Manager' (were Rahul Deshmukh, Priya Nair)",
  j(opts) === j(["Select a colleague", "Ritu Malhotra (Admin)", "A department head", "An HR Manager"]), j(opts));
// Round 9T (layout; was the live page as drawn): 9R's own result, read from its frozen result (html-pre9T = HEAD
// 31841f0); the live delegators are all Admins since, and row 1 has Ended (holders.mjs D1 / S1)
const dRows = [...parse(SRC("html-pre9T", D_)).querySelectorAll("main table tbody tr")].map((tr) => [txt(tr.querySelector(".avatar")), txt(tr.querySelector(".table__user-name")), ...[...tr.children].slice(1).map(txt)]);
check("D2", "the three delegations: An HR Manager -> Anil Verma, An Admin -> Ritu Malhotra, An employee -> A department head; periods, cover and status as before",
  j(dRows) === j([["HR", "An HR Manager", "Anil Verma", "29 Sep – 3 Oct", "Leave, regularization", "Scheduled"], ["AD", "An Admin", "Ritu Malhotra", "12 – 16 Oct", "Purchase orders, role changes", "Scheduled"],
    ["EM", "An employee", "A department head", "12 – 14 Jul", "Leave, regularization", "Ended"]]), j(dRows));
const rahul = DEPARTMENTS.find((x) => x.head === "Rahul Deshmukh");
check("D3", "…each label is the person's own: Priya (HR Manager), Aarav (Admin), Sneha (Employee) in users.js / roles.js; Rahul Deshmukh is Engineering's head (DEPARTMENTS) with no employee record",
  asLabel(roleOf("Priya Nair")) === "An HR Manager" && asLabel(roleOf("Aarav Mehta")) === "An Admin" && asLabel(roleOf("Sneha Rao")) === "An employee"
  && rahul?.code === "ENG" && !USERS.some((u) => u.name === "Rahul Deshmukh"), j([roleOf("Priya Nair"), roleOf("Aarav Mehta"), roleOf("Sneha Rao"), rahul]));

// =====================================================================
section("N. notifications.html");
await open("arjun", N_, null);
// Round 9T (layout; was the live page as drawn): 9R's own result, read from its frozen result (html-pre9T = HEAD
// 31841f0); the live work-from-home approval is credited to an HR Manager since (holders.mjs N1)
const notes = [...parse(SRC("html-pre9T", N_)).querySelectorAll(".notif")].map((n) => [txt(n.querySelector(".notif__title")), txt(n.querySelector(".list__sub"))]);
check("N1", "the five notifications: approved by an HR Manager; with your manager (6E); posted by an HR Manager; sent to your manager; approved by your manager",
  j(notes) === j([["Your regularization for 17 Sep was approved", "Attendance. Approved by an HR Manager"], ["Your laptop request is with your manager", "Requests. Waiting for manager approval"],
    ["New announcement: Team offsite on 12 Oct", "Company. Posted by an HR Manager"], ["Your leave request for 3 Oct was sent to your manager", "Leave. Waiting for the first approval"],
    ["Your work from home request for 12 Aug was approved", "Leave. Approved by your manager"]]), j(notes));
check("N2", "…'your manager' is who Sneha was to the sample's reader (Arjun -> Sneha in MANAGER_OF), the page's own wording since 6E; Priya is an HR Manager, who also posts announcements",
  MANAGER_OF["EMP-1105"] === "EMP-1029" && roleOf("Priya Nair") === "HR Manager" && holders("announcements:create").includes("HR Manager"));

// =====================================================================
section("A. announcements.html");
await open("aarav", A_, null);
const posts = [...d.querySelectorAll("article.post")];
const heads = posts.map((p) => [txt(p.querySelector(".avatar")), txt(p.querySelector(".post__head .fw-medium")), txt(p.querySelector(".post__head small"))]);
check("A1", "the posts' authors: An HR Manager (avatar HR) on the three that were Priya Nair's, dated as before with her department; 9P's 'An Admin' post unchanged",
  j(heads) === j([["HR", "An HR Manager", "HR, 17 Sep"], ["HR", "An HR Manager", "HR, 15 Sep"], ["AD", "An Admin", "16 Sep"], ["HR", "An HR Manager", "HR, 1 Sep"]]), j(heads));
const oldPosts = [...parse(OLD(A_)).querySelectorAll("article.post")];
const rest = (p) => [...p.children].filter((c) => !c.classList.contains("post__head")).map((c) => c.outerHTML).join("");
check("A2", "…everything but the heads byte for byte as before (titles, bodies, audiences, read counts, the Pinned badge); HR Manager holds announcements:create",
  posts.length === 4 && posts.every((p, i) => rest(p) === rest(oldPosts[i])) && !!posts[0].querySelector(".badge") && holders("announcements:create").includes("HR Manager"));

// =====================================================================
section("C. candidates.html");
await open("priya", C_, null);
const interviews = [...d.querySelectorAll(".list__item .list__content")].map((c) => `${txt(c.querySelector(".list__title"))} | ${txt(c.querySelector(".list__sub"))}`);
check("C1", "interviews this week: with a department head / an employee / an HR Manager (were Rahul Deshmukh, Sneha Rao, Priya Nair); the candidates and times as before",
  j(interviews) === j(["Aditi Bhatt, 11:00 AM | With a department head, technical round", "Kunal Arora, 3:00 PM | With an employee, technical round", "Ritika Sen, 10:30 AM | With an HR Manager, HR round"]), j(interviews));
const cards = (doc) => [...doc.querySelectorAll(".cand")].map((c) => c.outerHTML);
check("C2", "the candidates themselves (made-up names) byte for byte as before", cards(d).length > 0 && j(cards(d)) === j(cards(parse(OLD(C_)))), String(cards(d).length));

// =====================================================================
section("R. reports.html");
await open("aarav", R_, null);
const card = [...d.querySelectorAll(".card")].find((c) => txt(c.querySelector(".card__title")) === "Recent exports");
const ex = [...(card?.querySelectorAll("tbody tr") ?? [])].map((tr) => [...tr.children].map(txt));
check("R1", "recent exports, run by: A Finance Manager, An HR Manager, An Admin, An Admin (were Kabir Shah, Priya Nair, Vikram Singh, Aarav Mehta)",
  j(ex) === j([["Payroll register, Sep", "PDF", "A Finance Manager", "20 min ago", "412 KB"], ["Attendance summary, week 37", "CSV", "An HR Manager", "Yesterday", "86 KB"],
    ["Inventory and assets", "CSV", "An Admin", "16 Sep", "54 KB"], ["Headcount and turnover", "PDF", "An Admin", "14 Sep", "238 KB"]]), j(ex));
check("R2", "…each is someone who may export reports (reports:export), and the inventory one an Admin, the only role with inventory:view: Vikram's own role, Employee, has neither",
  ["Finance Manager", "HR Manager", "Admin"].every((r) => holders("reports:export").includes(r)) && j(holders("inventory:view")) === j(["Admin"])
  && !holders("reports:export").includes(roleOf("Vikram Singh")) && asLabel(roleOf("Kabir Shah")) === "A Finance Manager", j([holders("reports:export"), holders("inventory:view")]));

// =====================================================================
section("G. No real person left on the five pages");
const FULL = [...USERS.map((u) => u.name), ...DEPARTMENTS.map((x) => x.head)];
const WORDS = [...new Set(FULL.flatMap((n) => n.split(" ")))];
const MADE_UP = ["Sanya Kapoor", "Kunal Arora", "Varun Sethi"];   // candidates whose made-up surnames a seeded person shares
const leftover = FIVE.flatMap((p) => {
  let t = txt(parse(RAW(p)).querySelector("main")) + " " + [...parse(RAW(p)).querySelectorAll("main [title], main [aria-label]")].map((n) => `${n.title} ${n.getAttribute("aria-label")}`).join(" ");
  MADE_UP.forEach((m) => { t = t.replaceAll(m, ""); });
  return WORDS.filter((x) => new RegExp(`\\b${x}\\b`).test(t)).map((x) => `${p}: ${x}`);
});
check("G1", "no users.js name (a user or a department head; first or last name alone) in the five pages' content, titles or labels; the made-up candidates aside", leftover.length === 0, j(leftover));
const INITIALS = new Set(FULL.map((n) => n.split(" ").map((x) => x[0]).join("")));
// Each avatar with the name beside it (the candidates' own cards aside: made-up people, their own initials)
const avatars = FIVE.flatMap((p) => [...parse(RAW(p)).querySelectorAll("main .avatar")].filter((a) => !a.closest(".cand"))
  .map((a) => [txt(a), txt(a.parentElement.querySelector(".table__user-name, .fw-medium, .list__title"))]));
check("G2", "no avatar in the five pages' content is a seeded person's initials: HR beside An HR Manager, AD beside An Admin, EM beside An employee; RM only beside the made-up Ritu Malhotra",
  avatars.every(([a]) => !INITIALS.has(a)) && avatars.every(([a, n]) => ({ HR: "An HR Manager", AD: "An Admin", EM: "An employee", RM: "Ritu Malhotra" })[a] === n), j(avatars));

// =====================================================================
section("W. Exactly these lines");
const LINES = { [D_]: [163, 164, 269, 274, 279, 280], [N_]: [137, 147, 152, 157], [A_]: [138, 139, 149, 150, 169, 170], [C_]: [218, 223, 228], [R_]: [322, 323, 324, 325] };
// Round 9T (layout; was the live pages vs html-pre9R): 9R's own lines, read from its frozen result (html-pre9T = HEAD
// 31841f0); the live delegation page also has 9T's line 271 (holders.mjs W1)
const lines9R = (p) => { const a = SRC("html-pre9T", p).split("\r\n"), b = OLD(p).split("\r\n"); return a.length === b.length ? a.map((l, i) => [i + 1, l.trim()]).filter(([i]) => a[i - 1] !== b[i - 1]) : null; };
const got = Object.fromEntries(FIVE.map((p) => [p, lines9R(p)?.map(([n]) => n) ?? null]));
check("W1", "each page differs from html-pre9R only in its own lines (same line counts): delegation 6, notifications 4, announcements 6, candidates 3, reports 4", j(got) === j(LINES), j(got));
const before = FIVE.flatMap((p) => changedLines(p) ?? []).map(([, l]) => l).join("\n");
check("W2", "…and none of the changed lines still holds a seeded name", !WORDS.some((x) => new RegExp(`\\b${x}\\b`).test(before.replace(/Kunal Arora/g, ""))));

// =====================================================================
section("Z. Change set and hygiene");
// Round 9U (layout; was the live js vs js-pre9R): 9R's own claim, read from its frozen result (js-pre9U = HEAD
// 4f73ccf, whose js is 9R's); the live js has 9U's user-form.js and store.js since (adminguard.mjs X1)
const changedJs = walk(`${HERE}js-pre9U`).filter((f) => SRC("js-pre9U", f) !== SRC("js-pre9R", f)).sort();
// Round 11B (layout; was the live pages, here and in the check below): this round's own page claim, read from its
// frozen result (html-pre11B = HEAD 97e1e6c); the live pages have 11B's sessions.html banner since (acctpages.mjs X2)
const changedHtml = walk(`${HERE}html-pre11B`).filter((f) => f.endsWith(".html") && SRC("html-pre11B", f) !== OLD(f)).sort();
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const cssRoot = `${HERE}css-pre13U`;
const changedCss = walk(cssRoot).filter((f) => fs.readFileSync(`${cssRoot}/${f}`, "utf8") !== SRC("css-pre9R", f));
check("Z1", "no js changed; nothing added or removed", changedJs.length === 0 && j(walk(`${HERE}js-pre9U`).sort()) === j(walk(`${HERE}js-pre9R`).sort()), j(changedJs));
check("Z2", "pages changed: exactly the five; css unchanged", j(changedHtml) === j([...FIVE].sort()) && changedCss.length === 0 && j(walk(`${HERE}html-pre11B`).sort()) === j(walk(`${HERE}html-pre9R`).sort()), j([changedHtml, changedCss]));
check("Z3", "the 5 are CRLF only, with no final newline", changedHtml.map(RAW).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
const DONE = ["requests/approvals-inbox.html", "access/approval-workflows.html", "errors/500.html", "system/backup.html", "users/user-form.html", "system/audit-log.html"];
// Round 11F (layout; was the live page, here and in the check below): this round's own claim, read from 11F's frozen
// result (html-pre11F = HEAD e93d118); the live approvals-inbox has 11F's self-decision line since (pagenotes.mjs I3 / X2)
check("Z4", "byte for byte as before: 9N-9Q's pages (inbox, workflows, 500, backup, user-form) and 9L's audit log", DONE.every((p) => SRC("html-pre11F", p) === OLD(p)), j(DONE.filter((p) => SRC("html-pre11F", p) !== OLD(p))));
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
