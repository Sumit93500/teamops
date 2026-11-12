// usage: node dots.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 9H: a cancellation's activity dot is the neutral grey (activity__dot--muted, --color-text-muted) on both the
// Finance dashboard's expense feed and the Admin dashboard's feed (9G: the Finance role's accent, which "primary" uses,
// is all but the warning colour of "sent"). In jsdom with the js in ./js; ./js-pre9H and ./css-pre9H are the code and
// styles before this round (office-os 55cee02). The rendered colours are measured in the browser check (b-check9h).
//   A  Finance's feed: cancelled muted; sent warning, approved / paid success, rejected danger unchanged
//   B  Admin's feed: cancelled muted (the same class as Finance's for the same event); closed, stock out still primary
//   C  the CSS: one new rule, --dot: var(--color-text-muted); the other four rules and tokens.css untouched
//   D  the change set, line endings, no page errors
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const PAGE = { fin: ["dashboard/finance.html", "finance-dashboard"], admin: ["dashboard/admin.html", "admin-dashboard"] };
const HTML = Object.fromEntries(Object.entries(PAGE).map(([k, [p]]) => [k, fs.readFileSync(`${DIR}/${p}`, "utf8")]));
const SRC = (dir, p) => fs.readFileSync(`${HERE}${dir}/${p}`, "utf8");
const CSS = (p) => fs.readFileSync(`${DIR}/../assets/css/${p}`, "utf8");
const CSS0 = (p) => SRC("css-pre9H", p);

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 10, 7);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const WHO = { aarav: ["admin", "Aarav Mehta", "EMP-1001"], kabir: ["fin", "Kabir Shah", "EMP-1008"] };
let loads = 0, w = null, d = null, saved = {};
const jsErrors = [];
async function open(who, page) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) jsErrors.push(`${who} ${page}: ${e.message}`); });
  const dom = new JSDOM(HTML[page], { url: `http://localhost/office-os/pages/${PAGE[page][0]}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${PAGE[page][1]}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
function fresh() { if (w) w.localStorage.clear(); saved = {}; }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
// [text, dot modifier] for each item of a feed
const feed = (id) => [...d.getElementById(id).querySelectorAll(".activity__item")].map((i) => [txt(i.querySelector(".activity__text")), i.querySelector(".activity__dot").className.replace("activity__dot activity__dot--", "")]);
const dotOf = (items, re) => items.find(([t]) => re.test(t))?.[1];

const E = await import("./js/data/expenses-store.js");
const AR = await import("./js/data/asset-requests-store.js");
const I = await import("./js/data/inventory-store.js");

// =====================================================================
section("A. The Finance dashboard's expense feed");
setNow(2026, 10, 7); fresh(); await open("kabir", "fin");
const before = feed("fin-activity");
setNow(2026, 10, 7, 11, 0);
const c1 = E.cancelExpense("EXP-3106", "EMP-1105");   // Arjun's ₹1,850, sent 25 Sep
await open("kabir", "fin");
const fin = feed("fin-activity");
check("A1", "Arjun cancels his ₹1,850 claim: the cancellation leads with the muted dot", c1.ok && fin[0][0].startsWith("₹1,850 claim from Arjun Kapoor cancelled by Arjun Kapoor") && fin[0][1] === "muted", j(fin[0]));
check("A2", "…the same claim's 'sent' line keeps the warning dot, so the two now differ", dotOf(fin, /^Expense claim from Arjun Kapoor, ₹1,850/) === "warning" && fin[0][1] !== dotOf(fin, /^Expense claim from Arjun Kapoor, ₹1,850/), j(fin));
check("A3", "…approved and paid keep success (the seeded feed's other dots, unchanged)", fin.filter(([t]) => / (approved|paid) by /.test(t)).every(([, c]) => c === "success") && fin.some(([t]) => / paid by /.test(t)), j(fin));
check("A4", "before any cancellation nothing in the feed is muted (the seed has none)", !before.some(([, c]) => c === "muted"), j(before));
setNow(2026, 10, 7, 12, 0);
E.decideExpense("EXP-3105", "EMP-1008", "fin", "reject", "Not a business trip");
await open("kabir", "fin");
check("A5", "a rejection still reads danger (not muted): cancelled and rejected stay apart", dotOf(feed("fin-activity"), / rejected by Kabir Shah/) === "danger" && dotOf(feed("fin-activity"), / cancelled by /) === "muted", j(feed("fin-activity")));

// =====================================================================
section("B. The Admin dashboard's feed");
await open("aarav", "admin");
const adm = feed("admin-activity");
const finCancel = fin[0];
check("B1", "the same cancellation on the Admin feed: the same text and the same muted dot (9D's rule)", j(adm.find(([t]) => t === finCancel[0])) === j(finCancel), j([adm.find(([t]) => / cancelled by /.test(t)), finCancel]));
// an asset request closed without an asset, and a stock-out: both still primary (out of scope)
setNow(2026, 10, 7, 13, 0);
const ar = AR.submitAssetRequest("EMP-1001", { assetType: "monitor", reason: "Second screen" });   // Aarav's own: auto-approved at both stages
const closed = AR.closeAssetRequest(ar.record.id, "EMP-1001", "None in stock");
setNow(2026, 10, 7, 13, 5);
const out = I.recordMovement("EMP-1001", { sku: "STA-3015", type: "out", quantity: 2, reference: "Desks" });
await open("aarav", "admin");
const adm2 = feed("admin-activity");
check("B2", "'closed' (an asset request ended without an asset) is still primary: not in this round's scope", closed.ok && dotOf(adm2, / closed by Aarav Mehta/) === "primary", j(adm2));
check("B3", "a stock-out is still primary, a sent request still warning", out.ok && dotOf(adm2, /^Stock out: /) === "primary" && dotOf(adm2, /^Asset request from Aarav Mehta/) === "warning", j(adm2));
check("B4", "the mapping in the source: cancelled 'muted' in both feeds; closed 'primary' on Admin",
  /cancelled: \{ dot: "muted", /.test(SRC("js", "pages/finance-dashboard.js")) && /cancelled: "muted",/.test(SRC("js", "pages/admin-dashboard.js")) && /closed: "primary" \}/.test(SRC("js", "pages/admin-dashboard.js")));

// =====================================================================
section("C. The CSS");
const dash = CSS("pages/dashboard.css"), dash0 = CSS0("pages/dashboard.css");
const rule = (s, mod) => (s.match(new RegExp(`\\.activity__dot--${mod}\\s*\\{([^}]*)\\}`)) ?? [])[1]?.trim();
check("C1", "dashboard.css defines .activity__dot--muted once, as --dot: var(--color-text-muted)", (dash.match(/\.activity__dot--muted\s*\{/g) ?? []).length === 1 && rule(dash, "muted") === "--dot: var(--color-text-muted);", rule(dash, "muted"));
check("C2", "…and the four existing dot rules are as before", ["primary", "success", "warning", "danger"].every((m) => rule(dash, m) === rule(dash0, m)));
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 (C3, C4; C1, C2 and C5 read the rules, and stay live)
const dashLines = SRC("css-pre13U", "pages/dashboard.css").split("\r\n"), dash0Lines = dash0.split("\r\n");
check("C3", "dashboard.css: exactly one line added (the rule), nothing else changed", dashLines.length === dash0Lines.length + 1 && dashLines.filter((l) => !dash0Lines.includes(l)).length === 1 && dash0Lines.every((l) => dashLines.includes(l)));
check("C4", "tokens.css is byte for byte HEAD's: no role accent, status colour or muted grey changed (light or dark)", SRC("css-pre13U", "base/tokens.css") === CSS0("base/tokens.css"));
check("C5", "the grey is the same token the bare dot already falls back to (no new colour introduced)", /background: var\(--dot, var\(--color-text-muted\)\);/.test(dash));

// =====================================================================
section("D. Change set and hygiene");
const walk = (root, rel = "") => fs.readdirSync(`${root}/${rel}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${rel}${e.name}/`) : [`${rel}${e.name}`]));
// Round 9J (layout; was ./js vs js-pre9H): 9H's own change set, read from its frozen result (js-pre9J = HEAD 3b6c915);
// ./js now holds 9J's. D2's css: Round 13U, below
const changedJs = walk(`${HERE}js-pre9J`).filter((f) => SRC("js-pre9J", f) !== SRC("js-pre9H", f)).sort();
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const cssRoot = `${HERE}css-pre13U`;
const changedCss = walk(cssRoot).filter((f) => fs.readFileSync(`${cssRoot}/${f}`, "utf8") !== CSS0(f)).sort();
check("D1", "js changed from HEAD: pages/admin-dashboard.js and pages/finance-dashboard.js; nothing added or removed", j(changedJs) === j(["pages/admin-dashboard.js", "pages/finance-dashboard.js"]) && j(walk(`${HERE}js-pre9J`).sort()) === j(walk(`${HERE}js-pre9H`).sort()), j(changedJs));
check("D2", "css changed from HEAD: pages/dashboard.css only", j(changedCss) === j(["pages/dashboard.css"]) && j(walk(cssRoot).sort()) === j(walk(`${HERE}css-pre9H`).sort()), j(changedCss));
check("D3", "the three are CRLF only, with no final newline", [dash, SRC("js", "pages/finance-dashboard.js"), SRC("js", "pages/admin-dashboard.js")].every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
