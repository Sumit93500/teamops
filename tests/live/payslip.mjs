// usage: node payslip.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 4E: payroll/payslip-view.html and payroll/payslips.html with the js in ./js, in jsdom. The clock is
// local wall time, Wed 30 Sep 2026 11:00, except where a section moves it to Thu 1 Oct 2026 11:00; the seed is
// generated around "now" when storage is first read.
//   A  the store's new read helpers: payslipsFor(), payslipTotals(); ui/money.js; ui/pii.js
//   B  Arjun (Employee) opens his own payslip: no parameters, ?month only, ?employee=self&month
//   C  Arjun asks for someone else's payslip: 403, nothing drawn, same answer for a real or unknown id
//   D  Finance / Admin open other people's payslips (allowed); HR (no payslips:view) can't; links that name no payslip
//   E  on hold: no bank account (Arjun, own), no salary (a new hire, own)
//   F  loss of pay: Vikram's late-mark half day (September), Arjun's unpaid leave day (October); a month with none
//   G  payslips.html, 30 Sep: Arjun's history, stat cards, year to date, View / Download
//   H  payslips.html, 1 Oct: two months, a partly recorded month, two financial years
//   I  sessions: old session with no employee id, nobody signed in
//   J  end to end: every "View payslip" link on payroll-run.html opens that person's real payslip
//   K  what this round leaves alone on the two pages (vs the frozen pre-4E HTML)
//   L  source layout, on frozen copies only: js-pre4E / js-post4E and html-pre4E / html-post4E
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HTML = {
  view: fs.readFileSync(`${DIR}/payroll/payslip-view.html`, "utf8"),
  list: fs.readFileSync(`${DIR}/payroll/payslips.html`, "utf8"),
  run: fs.readFileSync(`${DIR}/payroll/payroll-run.html`, "utf8"),
  user: fs.readFileSync(`${DIR}/users/user-profile.html`, "utf8"),
  me: fs.readFileSync(`${DIR}/account/my-profile.html`, "utf8"),
};
const SCRIPT = { view: "payslip-view", list: "payslips", run: "payroll-run", user: "user-profile", me: "my-profile" };
const FILE = { view: "payroll/payslip-view.html", list: "payroll/payslips.html", run: "payroll/payroll-run.html", user: "users/user-profile.html", me: "account/my-profile.html" };
const PRE = {
  view: fs.readFileSync(new URL("./html-pre4E/payslip-view.html", import.meta.url), "utf8"),
  list: fs.readFileSync(new URL("./html-pre4E/payslips.html", import.meta.url), "utf8"),
};

const RealDate = Date;
const SEP30 = new RealDate(2026, 8, 30, 11, 0, 0).getTime();
const OCT1 = new RealDate(2026, 9, 1, 11, 0, 0).getTime();
let NOW = SEP30;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const WHO = {
  arjun: ["emp", "Arjun Kapoor", "EMP-1105"], vikram: ["emp", "Vikram Singh", "EMP-1088"],
  kabir: ["fin", "Kabir Shah", "EMP-1008"], aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"],
  oldEmp: ["emp", "Arjun Kapoor", undefined], oldAdmin: ["admin", "Aarav Mehta", undefined],
};

let loads = 0, w = null, d = null, saved = {};
let jsErrors = [], navigations = [], htmlWrites = [];
async function open(page, who, query = "") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  jsErrors = []; navigations = []; htmlWrites = [];
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations.push(e.message); else jsErrors.push(e.message); });
  const dom = new JSDOM(HTML[page], { url: `http://localhost/office-os/pages/${FILE[page]}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  const proto = w.Element.prototype;
  const inner = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", { get: inner.get, set(v) { htmlWrites.push(String(v)); inner.set.call(this, v); }, configurable: true });
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  const auth = await import("./js/core/auth.js");
  if (!who) auth.signOut(); else auth.signIn(...(Array.isArray(who) ? who : WHO[who]));
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${SCRIPT[page]}.js?load=${loads}`); } catch (e) { jsErrors.push(`import: ${e.message}`); }
}
function fresh(at = SEP30) { if (w) w.localStorage.clear(); saved = {}; NOW = at; }
// Round 11W (restage; G4's pause, round-11v-notes.md V3 option 2): the seed's pending late-arrival corrections named
// here are rejected by Priya Nair (HR) at the check's clock, before any page reads storage. A pending one now pauses
// its late mark (payroll-store.js pausedLateMarks); decided first, every late mark counts, so the figures and wording
// below are the ones they always were. RG-102 is Vikram's (one of his three September late marks: the ₹1,455 case);
// RG-103, Sneha's, is decided too only where a check reads the run page's "Attendance recorded" wording.
async function decideFirst(ids = ["RG-102"]) {
  const box = new Map();
  globalThis.localStorage = w ? w.localStorage : { getItem: (k) => (box.has(k) ? box.get(k) : null), setItem: (k, v) => box.set(k, String(v)), removeItem: (k) => box.delete(k), clear: () => box.clear(), key: (i) => [...box.keys()][i] ?? null, get length() { return box.size; } };
  const A11W = await import("./js/data/attendance-store.js");
  for (const id of ids) { const r = A11W.decideRegularization(id, "EMP-1003", "hr", "reject", "Decided before the clock (round 11W)"); if (!r.ok) throw new Error(`round 11W restage, ${id}: ${r.error}`); }
  if (!w) saved = Object.fromEntries(box);
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const money = (n) => `₹${n.toLocaleString("en-IN")}`;

// ---- readers ----
const $ = (id) => d.getElementById(id);
const fld = (name) => txt(d.querySelector(`main [data-field="${name}"]`));
const fldClass = (name) => d.querySelector(`main [data-field="${name}"]`).className;
const INFO = ["name", "id", "designation", "department", "joined", "pay-date", "bank", "pan", "regime", "working-days", "days-paid", "lop-days"];
const AMOUNTS = ["basic", "hra", "conveyance", "special", "gross", "pf", "pt", "tds", "deductions", "net"];
const info = () => INFO.map(fld);
const amounts = () => AMOUNTS.map(fld);
const notes = () => [...$("payslip-notes").children].map(txt);
const head = () => [d.title, txt($("payslip-crumb-parent")), $("payslip-crumb-parent").getAttribute("href"), txt($("payslip-crumb")), txt($("payslip-title")), txt($("payslip-subtitle"))];
const message = () => ($("payslip-message").hidden ? null : [txt($("payslip-message-title")), txt($("payslip-message-text"))]);
const badge = () => [txt($("payslip-status")), $("payslip-status").className, $("payslip-status").title];
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => txt(t.querySelector(".toast__text")) ?? txt(t));
const stat = (key) => { const s = d.querySelector(`[data-stat="${key}"]`); return [txt(s.querySelector(".stat__label")), txt(s.querySelector(".stat__value")), txt(s.querySelector(".stat__delta"))]; };
// Round 14E part 1 (layout): a cell's text without the hold reason under its badge (class reason); reasons.mjs Y1 pins that line
const listRows = () => [...$("payslip-rows").children].map((tr) => [...tr.children].map((td) => { const c = td.cloneNode(true); c.querySelectorAll(".reason").forEach((r) => r.remove()); return txt(c); }));
const ytd = () => ["gross", "pf", "pt", "tds", "deductions", "net"].map(fld);
const storageKeys = () => Object.keys(w.localStorage).sort();
const noMoneyHtml = () => !htmlWrites.some((h) => /₹|Arjun|Rohan|Vikram|Kabir/.test(h));

const PS = await import("./js/data/payroll-store.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const L = await import("./js/data/leave-store.js");
const MONEY = await import("./js/ui/money.js");
const PII = await import("./js/ui/pii.js");
const dept = (code) => S.getAllDepartments().find((x) => x.code === code)?.name;
const slipOf = (id, month, today = "2026-09-30") => PS.payslipsFor(id, today).find((s) => s.month === month);
// What the info block and the amounts should say for one person's payslip, from the store and the user record.
const expectedInfo = (id, slip) => {
  const u = S.getUser(id);
  return [u.name, u.id, u.designation ?? "—", dept(u.department) ?? "—", u.dateOfJoining || "—", "Not set",
    u.bankAccountLast4 ? `•••• •••• ${u.bankAccountLast4}` : "Not on file", u.pan ? `•••••${u.pan.slice(-5)}` : "Not on file",
    slip.regime === "new" ? "New regime" : "—", String(slip.workingDays), String(slip.workingDays - slip.lop.days), String(slip.lop.days)];
};
const expectedAmounts = (slip) => [...["basic", "hra", "conveyance", "special"].map((k) => money(slip.earnings[k])), money(slip.gross),
  ...["pf", "pt", "tds"].map((k) => money(slip.deductionLines[k])), money(slip.deductions), money(slip.net)];

// =====================================================================
section("A. Store helpers, ui/money.js, ui/pii.js (30 Sep)");
fresh(); await decideFirst(); await open("view", "arjun");   // Round 11W (restage): RG-102 rejected first (A6's totals include Vikram's)
const arjunSlips = PS.payslipsFor("EMP-1105", "2026-09-30");
const sepArjun = arjunSlips[0];
const { attendance: _a, period: _p, ...sepCore } = sepArjun ?? {};
check("A1", "payslipsFor(Arjun, 30 Sep): one payslip, September; August and before have no attendance records",
  j(arjunSlips.map((s) => s.month)) === j(["2026-09"]), j(arjunSlips.map((s) => s.month)));
check("A2", "each payslip is payrollRunFor()'s row, which carries the month's period and attendance coverage (since Round 7B)",
  j(sepArjun) === j(PS.payrollRunFor("EMP-1105", 2026, 9)) && j(sepCore) !== j(sepArjun) && j(sepArjun?.period) === j({ from: "2026-09-01", to: "2026-09-30" })
  && j(sepArjun?.attendance) === j({ noData: 0, notYet: 1, openAbsences: [], uncountedAbsences: 0, pausedLateMarks: 0 /* Round 11W (shape): G4's pause */, beforeJoining: 0, joined: "2023-01-12" } /* Round 8F (shape) */) /* Round 8D (shape): + openAbsences, uncountedAbsences */, j([sepArjun?.period, sepArjun?.attendance]));
check("A3", "Arjun, September: 88,000 gross, PF 4,224, PT 200, TDS 0, net 83,576, no loss of pay, Draft",
  j([sepArjun?.gross, sepArjun?.deductionLines, sepArjun?.net, sepArjun?.lop.days, sepArjun?.status]) === j([88000, { pf: 4224, pt: 200, tds: 0 }, 83576, 0, "draft"]));
check("A4", "no payslips: inactive Divya, an unknown id, a bad date, no date",
  [["EMP-1061", "2026-09-30"], ["EMP-9999", "2026-09-30"], ["EMP-1105", "2026-09-31"], ["EMP-1105", undefined], ["EMP-1105", "Sep 2026"]].every(([id, day]) => { try { return j(PS.payslipsFor(id, day)) === "[]"; } catch { return false; } }));
check("A5", "every tracked person has exactly September on 30 Sep", S.getAllUsers().filter((u) => u.status !== "inactive").every((u) => j(PS.payslipsFor(u.id, "2026-09-30").map((s) => s.month)) === j(["2026-09"])));
const two = [slipOf("EMP-1001", "2026-09"), slipOf("EMP-1088", "2026-09")];
const sum = (f) => two.reduce((s, x) => s + f(x), 0);
check("A6", "payslipTotals: the sums of gross, PF, PT, TDS, deductions and net; [] totals 0",
  j(PS.payslipTotals(two)) === j({ gross: sum((x) => x.gross), pf: sum((x) => x.deductionLines.pf), pt: sum((x) => x.deductionLines.pt), tds: sum((x) => x.deductionLines.tds), deductions: sum((x) => x.deductions), net: sum((x) => x.net) })
  && j(PS.payslipTotals(two)) === j({ gross: 222545, pf: 10682, pt: 400, tds: 14083, deductions: 25165, net: 197380 })
  && j(PS.payslipTotals([])) === j({ gross: 0, pf: 0, pt: 0, tds: 0, deductions: 0, net: 0 }), j(PS.payslipTotals(two)));
check("A7", "nothing is written to storage by the helpers (no payslip or run key)", !storageKeys().some((k) => /payslip|payroll|run/i.test(k)), j(storageKeys()));
const W = MONEY.rupeesInWords;
check("A8", "rupeesInWords: the static payslip's sentence, Indian units, hyphens, 0 and 1",
  W(74100) === "Seventy-four thousand one hundred rupees only." && W(83576) === "Eighty-three thousand five hundred seventy-six rupees only."
  && W(138037) === "One lakh thirty-eight thousand thirty-seven rupees only." && W(1234567) === "Twelve lakh thirty-four thousand five hundred sixty-seven rupees only."
  && W(10000000) === "One crore rupees only." && W(110) === "One hundred ten rupees only." && W(0) === "Zero rupees only." && W(1) === "One rupee only."
  && W(999999999) === "Ninety-nine crore ninety-nine lakh ninety-nine thousand nine hundred ninety-nine rupees only.", W(1234567));
check("A9", "rupees(): ₹ with Indian grouping", MONEY.rupees(138037) === "₹1,38,037" && MONEY.rupees(0) === "₹0" && MONEY.rupees(10000000) === "₹1,00,00,000");
check("A10", "maskAccount / maskPan: the masks the profile pages used; '' when nothing is on file",
  PII.maskAccount("4821") === "•••• •••• 4821" && PII.maskPan("KPBPK3421F") === "•••••3421F"
  && [PII.maskAccount(null), PII.maskAccount(""), PII.maskAccount(undefined), PII.maskPan(null), PII.maskPan("")].every((x) => x === ""));

// =====================================================================
section("B. Arjun (Employee) opens his own payslip, 30 Sep");
for (const [n, q] of [["B1", ""], ["B2", "?month=2026-09"], ["B3", "?employee=EMP-1105&month=2026-09"], ["B4", "?employee=%20EMP-1105%20"]]) {
  fresh(); await open("view", "arjun", q);
  check(n, `"${q || "(no parameters)"}": September's payslip, every field from the store`,
    jsErrors.length === 0 && navigations.length === 0 && message() === null && !$("payslip").hidden
    && j(info()) === j(expectedInfo("EMP-1105", sepArjun)) && j(amounts()) === j(expectedAmounts(sepArjun)), j([jsErrors, info(), amounts()]));
}
check("B5", "the exact figures: 35,200 / 17,600 / 1,600 / 33,600 = 88,000; 4,224 / 200 / 0 = 4,424; net 83,576",
  j(amounts()) === j(["₹35,200", "₹17,600", "₹1,600", "₹33,600", "₹88,000", "₹4,224", "₹200", "₹0", "₹4,424", "₹83,576"]), j(amounts()));
check("B6", "info: Arjun's record, masked bank and PAN (class masked), New regime, 22 working days, 22 paid, 0 LOP; pay date 'Not set' (muted)",
  j(info()) === j(["Arjun Kapoor", "EMP-1105", "Software Engineer", "Engineering", "12 Jan 2023", "Not set", "•••• •••• 4821", "•••••3421F", "New regime", "22", "22", "0"])
  && fldClass("bank") === "masked" && fldClass("pan") === "masked" && fldClass("pay-date") === "text-muted", j(info()));
check("B7", "header: title, crumb 'My payslips' -> payslips.html, 'Payslip, September 2026', subtitle says Draft, not paid",
  j(head()) === j(["Payslip, September 2026 | OfficeOS", "My payslips", "payslips.html", "September 2026", "Payslip, September 2026", "Draft: not approved or paid yet"])
  && $("payslip-back").getAttribute("href") === "payslips.html" && txt($("payslip-back")) === "Back to payslips", j(head()));
check("B8", "period: September 2026, 'Pay period 1 – 30 Sep 2026'; article labelled for September",
  txt($("payslip-month")) === "September 2026" && txt($("payslip-period")) === "Pay period 1 – 30 Sep 2026" && $("payslip").getAttribute("aria-label") === "Payslip for September 2026");
check("B9", "status badge Draft (warning), never Paid; amount in words for 83,576",
  j(badge()) === j(["Draft", "badge badge--warning badge--dot", ""]) && txt($("payslip-words")) === "Amount in words: Eighty-three thousand five hundred seventy-six rupees only.", j(badge()));
check("B10", "notes: only that September isn't over (today not recorded yet); no hold, no loss-of-pay note",
  j(notes()) === j(["September 2026 isn't over: 1 working day hasn't been recorded yet, so late marks, unpaid leave and absences can still change this payslip."] /* Round 8D (behaviour; was "so late marks and unpaid leave can still change") */) && !$("payslip-notes").hidden, j(notes()));
check("B11", "Print or save as PDF works (inline window.print) and Download PDF is gone (Round Demo buttons part 1, behaviour; was 'Print still works and Download PDF is still the placeholder')",
  (() => { const p = $("payslip-print"); return !p.hidden && p.getAttribute("onclick") === "window.print()" && txt(p) === "Print or save as PDF" && $("payslip-download") === null && toasts().length === 0; })(), j(toasts()));
check("B12", "no money or names written through innerHTML; nothing about payslips stored", noMoneyHtml() && !storageKeys().some((k) => /payslip|payroll/i.test(k)));

// =====================================================================
section("C. Arjun asks for someone else's payslip");
const denied = {};
// Round 7B: the static payslip is neutral and hidden (no sample person), so "untouched" means still blank.
const untouchedView = () => txt($("payslip-title")) === "Payslip" && fld("name") === "—" && fld("net") === "—" && message() === null;
for (const [n, q, what] of [["C1", "?employee=EMP-1042&month=2026-09", "Rohan's (real)"], ["C2", "?employee=EMP-1042", "Rohan's, no month"],
  ["C3", "?employee=EMP-9999&month=2026-09", "an unknown id"], ["C4", "?employee=emp-1105", "his own id in lower case (not his id)"], ["C5", "?employee=EMP-1061", "inactive Divya's"]]) {
  fresh(); await open("view", "arjun", q);
  denied[n] = d.querySelector("main").outerHTML;
  check(n, `${what}: sent to the 403 page, the payslip hidden, nothing of anyone drawn`,
    navigations.length === 1 && $("payslip").hidden && untouchedView() && !d.querySelector("main").textContent.includes("Rohan") && jsErrors.length === 0, j([navigations, jsErrors]));
}
check("C6", "the response doesn't tell a real id from an unknown one: the page is byte-identical for Rohan's id and EMP-9999", denied.C1 === denied.C3 && denied.C1 === denied.C2);
fresh(); await open("view", "vikram", "?employee=EMP-1105");
check("C7", "the same for another employee (Vikram asking for Arjun's)", navigations.length === 1 && $("payslip").hidden);

// =====================================================================
section("D. Finance / Admin open other people's payslips; HR can't");
fresh(); await open("view", "kabir", "?employee=EMP-1042&month=2026-09");
const rohan = slipOf("EMP-1042", "2026-09");
check("D1", "Kabir (Finance, payslips:view) opens Rohan's: Rohan's payslip, every field from the store",
  navigations.length === 0 && jsErrors.length === 0 && j(info()) === j(expectedInfo("EMP-1042", rohan)) && j(amounts()) === j(expectedAmounts(rohan)), j([info(), amounts()]));
check("D2", "Rohan's figures: 92,000 gross, net 87,384; masked •••• •••• 7305 / •••••4172K; no joining date on record -> —",
  fld("gross") === "₹92,000" && fld("net") === "₹87,384" && fld("bank") === "•••• •••• 7305" && fld("pan") === "•••••4172K" && fld("joined") === "—");
check("D3", "header names whose it is; the way back is the payroll run",
  j(head()) === j(["Payslip, September 2026, Rohan Gupta | OfficeOS", "Payroll run", "payroll-run.html", "Rohan Gupta, September 2026", "Payslip, September 2026", "Rohan Gupta (EMP-1042). Draft: not approved or paid yet"])
  && $("payslip-back").getAttribute("href") === "payroll-run.html" && txt($("payslip-back")) === "Back to payroll run", j(head()));
fresh(); await open("view", "kabir");
check("D4", "Kabir with no parameters: his own payslip (135,000; TDS 9,313), crumb back to My payslips",
  fld("name") === "Kabir Shah" && fld("gross") === "₹1,35,000" && fld("tds") === "₹9,313" && txt($("payslip-crumb-parent")) === "My payslips" && txt($("payslip-subtitle")) === "Draft: not approved or paid yet");
fresh(); await open("view", "aarav", "?employee=EMP-1105&month=2026-09");
check("D5", "Aarav (Admin) opens Arjun's: allowed, same figures Arjun sees", navigations.length === 0 && j(amounts()) === j(expectedAmounts(sepArjun)) && fld("name") === "Arjun Kapoor");
fresh(); await open("view", "priya", "?employee=EMP-1105&month=2026-09");
check("D6", "Priya (HR, no payslips:view): 403 for someone else's", navigations.length === 1 && $("payslip").hidden && untouchedView());
fresh(); await open("view", "priya");
check("D7", "Priya's own payslip opens (every role has payslip:view-own): 125,000, TDS 7,813",
  navigations.length === 0 && fld("name") === "Priya Nair" && fld("gross") === "₹1,25,000" && fld("tds") === "₹7,813");
const ROLES = (await import("./js/config/roles.js")).ROLES;
const ROUTES = (await import("./js/config/routes.js")).ROUTES;
check("D8", "permissions as they are (unchanged): payslips:view for Admin and Finance only; route null for both pages",
  ROUTES["payroll/payslip-view.html"] === null && ROUTES["payroll/payslips.html"] === null
  && j(Object.keys(ROLES).filter((r) => ROLES[r].permissions.includes("payslips:view"))) === j(["admin", "fin"]));
const msgCase = async (n, who, q, title, text) => {
  fresh(); await open("view", who, q);
  check(n, `${q}: '${title}'`, j(message()) === j([title, text]) && $("payslip").hidden && $("payslip-download") === null /* Round Demo buttons part 1 (behaviour; was hidden: there's no Download PDF) */ && $("payslip-print").hidden
    && txt($("payslip-title")) === "Payslip" && d.title === "Payslip | OfficeOS" && navigations.length === 0 && jsErrors.length === 0, j(message()));
};
await msgCase("D9", "kabir", "?employee=EMP-9999", "No such employee", "There's no employee with the ID EMP-9999.");
await msgCase("D10", "kabir", "?employee=EMP-1061", "No payslips for Divya Menon", "Divya Menon is inactive and isn't in payroll.");
await msgCase("D11", "arjun", "?month=2026-08", "No payslip for August 2026", "Payslips start in September 2026, the first month with attendance records. Before that, loss of pay can't be checked.");
await msgCase("D12", "arjun", "?month=2026-10", "No payslip for October 2026", "October 2026 hasn't started yet. The newest payslip is for September 2026.");
await msgCase("D13", "arjun", "?month=2026-13", "That isn't a month", 'The link asks for "2026-13". A month looks like 2026-09.');
await msgCase("D14", "arjun", "?month=Sept", "That isn't a month", 'The link asks for "Sept". A month looks like 2026-09.');
await msgCase("D15", "kabir", "?employee=EMP-1042&month=2025-04", "No payslip for April 2025", "Payslips start in September 2026, the first month with attendance records. Before that, loss of pay can't be checked.");
check("D16", "...and for someone else the message's way back is still the payroll run", $("payslip-back").getAttribute("href") === "payroll-run.html");
fresh(); await open("view", "kabir", "?employee=%3Cimg%20src%3Dx%3E");
check("D17", "an id with markup in it is shown as text, not markup", txt($("payslip-message-text")) === "There's no employee with the ID <img src=x>." && !d.querySelector("main img"));

// =====================================================================
section("E. On hold");
fresh(); await open("view", "arjun");
S.updateUser(USER_ACTOR("admin", "EMP-1105"), "EMP-1105", { bankAccount: null, bankAccountLast4: null });
await open("view", "arjun");
const heldArjun = slipOf("EMP-1105", "2026-09");
check("E1", "Arjun with no bank account: On hold (danger, reason in the title); the pay is still worked out and shown",
  heldArjun.holdReason === "No bank account on file" && j(badge()) === j(["On hold", "badge badge--danger badge--dot", "No bank account on file"])
  && j(amounts()) === j(expectedAmounts(heldArjun)) && fld("net") === "₹83,576" && !$("payslip-cols").hidden && !$("payslip-words").hidden, j(badge()));
check("E2", "bank account 'Not on file' (muted, not masked); PAN still masked; subtitle gives the reason",
  fld("bank") === "Not on file" && fldClass("bank") === "text-muted" && fld("pan") === "•••••3421F" && txt($("payslip-subtitle")) === "On hold: No bank account on file");
await open("list", "arjun");
check("E8", "his list: September On hold, and its pay still counts in the year's totals (as the run counts on-hold rows)",
  listRows()[0][5] === "On hold" && listRows()[0][4] === "₹83,576" && fld("net") === "₹83,576" && stat("ytd-net")[1] === "₹83,576" && stat("latest")[2] === "On hold: No bank account on file", j([listRows(), stat("latest")]));
await open("view", "arjun");
check("E3", "the hold note comes first", notes()[0] === "On hold: No bank account on file. The pay above is worked out, but it can't be paid until a bank account is added.", j(notes()));
fresh(); await open("view", "kabir");
const hire = S.addUser(USER_ACTOR("admin", null), { name: "Zoya Khan", email: "zoya.khan@northwind.com", role: "emp", department: "SUP", designation: "Support Executive", status: "active" });
const ZOYA = ["emp", "Zoya Khan", hire.record.id];
await open("view", ZOYA);
const zoya = PS.payslipsFor(hire.record.id, "2026-09-30");
check("E4", "a new hire with no salary has a September payslip (attendance exists: absences so far), on hold for no salary",
  j(zoya.map((s) => [s.month, s.status, s.holdReason, s.gross, s.net])) === j([["2026-09", "on-hold", "No salary on file for this month", 0, 0]]), j(zoya.map((s) => s.month)));
check("E5", "her payslip shows no figures: earnings/deductions and words hidden, net '—' (not ₹0), regime '—', badge On hold",
  $("payslip-cols").hidden && $("payslip-words").hidden && fld("net") === "—" && fld("regime") === "—" && badge()[0] === "On hold" && jsErrors.length === 0, j([fld("net"), fld("regime")]));
check("E6", "...the note says why; no bank or PAN on file for a new hire; working days still from attendance",
  notes()[0] === "On hold: No salary on file for this month. Nothing can be worked out or paid for September 2026 until a salary is added."
  && fld("bank") === "Not on file" && fld("pan") === "Not on file" && fld("working-days") === "22" && fld("department") === "Customer Support", j(notes()));
await open("list", ZOYA);
check("E7", "her list: September On hold with dashes, not ₹0; stat 'Net pay' —; year totals ₹0",
  j(listRows()[0].slice(0, 6)) === j(["September 2026", "1 – 30 Sep", "—", "—", "—", "On hold"]) && stat("latest")[1] === "—"
  && stat("latest")[2] === "On hold: No salary on file for this month" && ytd().every((x) => x === "₹0"), j([listRows(), stat("latest")]));

// =====================================================================
section("F. Loss of pay");
fresh(); await decideFirst(); await open("view", "vikram");   // Round 11W (restage): RG-102 rejected first (F1-F4)
const vik = slipOf("EMP-1088", "2026-09");
check("F1", "Vikram (own payslip, September): 3 late marks -> 1 penalty half day -> 0.5 LOP day, ₹1,455 off 64,000",
  j([vik.monthlyGross, vik.lop, vik.gross]) === j([64000, { penaltyHalfDays: 1, unpaidLeaveDays: 0, absenceDays: 0, days: 0.5, amount: 1455 }, 62545]) /* Round 8D (shape): lop.absenceDays; his 15 Sep absence isn't counted, no joining date on file */, j(vik.lop));
check("F2", "info: 22 working days, 21.5 paid, 0.5 LOP; earnings on the 62,545 left (25,018 / 12,509 / 1,600 / 23,418), PF 3,002, net 59,343",
  j(info().slice(9)) === j(["22", "21.5", "0.5"]) && j(amounts()) === j(["₹25,018", "₹12,509", "₹1,600", "₹23,418", "₹62,545", "₹3,002", "₹200", "₹0", "₹3,202", "₹59,343"]), j([info().slice(9), amounts()]));
check("F3", "the earnings lines add up to the gross shown", ["basic", "hra", "conveyance", "special"].reduce((s, k) => s + Number(fld(k).replace(/[₹,]/g, "")), 0) === 62545);
check("F4", "the loss-of-pay line explains the deduction exactly",
  notes()[0] === "Loss of pay: ₹1,455 for 0.5 day (1 late-mark half day), out of 22 working days, taken off the monthly salary of ₹64,000. The earnings above are on the ₹62,545 left.", j(notes()));
fresh(OCT1); await open("view", "arjun");
const L1 = L.applyLeave("EMP-1105", { type: "unpaid", from: "2026-10-06", to: "2026-10-06", duration: "full", reason: "Test" });
L.decideLeave(L1.record.id, "EMP-1029", "emp", "approve");   // Round 8C (setup): Sneha, the requester's manager, approves first
const L2 = L.decideLeave(L1.record.id, "EMP-1003", "hr", "approve");
const L3 = L.applyLeave("EMP-1105", { type: "unpaid", from: "2026-10-07", to: "2026-10-07", duration: "first-half", reason: "Test" });
L.applyLeave("EMP-1105", { type: "unpaid", from: "2026-10-08", to: "2026-10-08", duration: "full", reason: "Pending, not counted" });
L.decideLeave(L3.record.id, "EMP-1029", "emp", "approve");   // Round 8C (setup): Sneha, the requester's manager, approves first
L.decideLeave(L3.record.id, "EMP-1003", "hr", "approve");
await open("view", "arjun", "?month=2026-10");
const octA = slipOf("EMP-1105", "2026-10", "2026-10-01");
check("F5", "Arjun, October (1 Oct clock): approved unpaid leave 1 + 0.5 day = 1.5 LOP days; the pending day isn't counted",
  L1.ok && L2.ok && L3.ok && j(octA.lop) === j({ penaltyHalfDays: 0, unpaidLeaveDays: 1.5, absenceDays: 0 /* Round 8D (shape) */, days: 1.5, amount: Math.round(88000 * 1.5 / octA.workingDays) })
  && fld("lop-days") === "1.5" && fld("days-paid") === String(octA.workingDays - 1.5) && j(amounts()) === j(expectedAmounts(octA)), j(octA.lop));
check("F6", "...its loss-of-pay line names unpaid leave; the month-in-progress note follows",
  notes()[0] === `Loss of pay: ${money(octA.lop.amount)} for 1.5 days (1.5 days of unpaid leave), out of ${octA.workingDays} working days, taken off the monthly salary of ₹88,000. The earnings above are on the ${money(octA.gross)} left.`
  && notes()[1]?.startsWith("October 2026 isn't over: ") && notes().length === 2, j(notes()));
await open("view", "arjun", "?month=2026-09");
check("F7", "a month with no loss of pay (Arjun, September): LOP 0, no loss-of-pay line, full 88,000",
  fld("lop-days") === "0" && fld("gross") === "₹88,000" && !notes().some((x) => x.startsWith("Loss of pay")), j(notes()));

// =====================================================================
section("G. payslips.html, Arjun, 30 Sep");
fresh(); await open("list", "arjun");
check("G1", "loads with no errors or redirect", jsErrors.length === 0 && navigations.length === 0, j(jsErrors));
check("G2", "history: one row, September 2026, from the store (gross / deductions / net), Draft, View + Download",
  j(listRows()) === j([["September 2026", "1 – 30 Sep", "₹88,000", "₹4,424", "₹83,576", "Draft", "ViewDownload"]]), j(listRows()));
const view = $("payslip-rows").querySelector("a.btn");
check("G3", "View goes to payslip-view.html?employee=EMP-1105&month=2026-09 (a real link: no placeholder)",
  view.getAttribute("href") === "payslip-view.html?employee=EMP-1105&month=2026-09" && !view.hasAttribute("data-not-implemented"));
const dl = $("payslip-rows").querySelector("button");
dl.click();
check("G4", "Download per row: still the placeholder, shown (payslip:download); Download all too",
  !dl.hidden && toasts().at(-1) === "Download isn't available in this demo." && (() => { const all = d.querySelector('[data-not-implemented="Download all"]'); all.click(); return !all.hidden && toasts().at(-1) === "Download all isn't available in this demo."; })(), j(toasts()));
// Round 9F (behaviour; was "TDS, Sep"): the note names the sample tax rates
check("G5", "stat cards: Net pay, September ₹83,576 (Draft); this year ₹83,576 'Sep, 1 payslip'; TDS ₹0 'TDS on sample tax rates, Sep' (Round 9F); next 'Sep 2026'",
  j([stat("latest"), stat("ytd-net"), stat("ytd-tds"), stat("next")]) === j([["Net pay, September", "₹83,576", "Draft, not paid yet"], ["Net pay this year", "₹83,576", "Sep, 1 payslip"],
    ["Tax deducted this year", "₹0", "TDS on sample tax rates, Sep"], ["Next payslip", "Sep 2026", "Draft, not paid yet; no pay date set"]]), j([stat("latest"), stat("ytd-net"), stat("ytd-tds"), stat("next")]));
check("G6", "year to date = payslipTotals of the year's payslips; meta 'Sep 2026'",
  j(ytd()) === j(Object.values((({ gross, pf, pt, tds, deductions, net }) => ({ gross, pf, pt, tds, deductions, net }))(PS.payslipTotals(arjunSlips))).map(money))
  && j(ytd()) === j(["₹88,000", "₹4,224", "₹200", "₹0", "₹4,424", "₹83,576"]) && txt($("payslip-ytd-meta")) === "Sep 2026", j(ytd()));
check("G7", "financial year: one option, 2026 – 27 (the only year with payslips); history meta says it",
  j([...$("payslip-year").options].map((o) => [o.value, o.text])) === j([["2026", "Financial year 2026 – 27"]]) && txt($("payslip-history-meta")) === "Financial year 2026 – 27");
check("G8", "the masking alert says who really sees them (Round 7B)", txt(d.querySelector(".alert--info")) === "Your bank account and PAN are always masked on payslips. HR and Admins can see them in full on your employee profile.");
check("G9", "no money written through innerHTML", noMoneyHtml());
fresh(); await open("list", "kabir");
check("G10", "Finance sees only their own payslips here (Kabir's), not everyone's", j(listRows().map((r) => r.slice(0, 5))) === j([["September 2026", "1 – 30 Sep", "₹1,35,000", "₹15,993", "₹1,19,007"]])
  && $("payslip-rows").querySelector("a").getAttribute("href") === "payslip-view.html?employee=EMP-1008&month=2026-09", j(listRows()));
const empPerms = [...ROLES.emp.permissions];
ROLES.emp.permissions.splice(ROLES.emp.permissions.indexOf("payslip:download"), 1);
fresh(); await open("list", "arjun");
const dlHidden = [...$("payslip-rows").querySelectorAll("button")].every((b) => b.hidden);
ROLES.emp.permissions.splice(0, ROLES.emp.permissions.length, ...empPerms);
check("G12", "a role without payslip:download (removed for this check) gets no per-row Download", dlHidden && ROLES.emp.permissions.includes("payslip:download"));
fresh(); await decideFirst(); await open("list", "vikram");   // Round 11W (restage): RG-102 rejected first
check("G11", "Vikram's list: September after loss of pay (62,545 / 3,202 / 59,343)", j(listRows()[0].slice(2, 5)) === j(["₹62,545", "₹3,202", "₹59,343"]));

// =====================================================================
section("H. payslips.html on 1 Oct: two months, a partly recorded one, two financial years");
fresh(OCT1); await open("list", "arjun");
const oct = PS.payslipsFor("EMP-1105", "2026-10-01");
check("H1", "1 Oct: the seed starts 14 working days back (11 Sep), so Arjun has October and September; September has 8 days before records began",
  j(oct.map((s) => [s.month, s.attendance])) === j([["2026-10", { noData: 0, notYet: 20, openAbsences: [], uncountedAbsences: 0, pausedLateMarks: 0, beforeJoining: 0, joined: "2023-01-12" }], ["2026-09", { noData: 8, notYet: 0, openAbsences: [], uncountedAbsences: 0, pausedLateMarks: 0 /* Round 11W (shape): G4's pause, both months */, beforeJoining: 0, joined: "2023-01-12" /* Round 8F (shape) */ }]]) /* Round 8D (shape) */, j(oct.map((s) => [s.month, s.attendance])));
check("H2", "history newest first: October, September", j(listRows().map((r) => r[0])) === j(["October 2026", "September 2026"]) && listRows()[0][1] === "1 – 31 Oct");
const tot = PS.payslipTotals(oct);
check("H3", "Net pay, September (the newest month before this one); next payslip October; this year sums both",
  j([stat("latest"), stat("next")]) === j([["Net pay, September", money(oct[1].net), "Draft, not paid yet"], ["Next payslip", "Oct 2026", "Draft, not paid yet; no pay date set"]])
  // Round 9F (behaviour; was "TDS, Sep to Oct")
  && j(stat("ytd-net")) === j(["Net pay this year", money(tot.net), "Sep to Oct, 2 payslips"]) && j(stat("ytd-tds")) === j(["Tax deducted this year", money(tot.tds), "TDS on sample tax rates, Sep to Oct"]), j([stat("latest"), stat("ytd-net")]));
check("H4", "year to date = sum of both months; meta 'Sep – Oct 2026'",
  j(ytd()) === j([tot.gross, tot.pf, tot.pt, tot.tds, tot.deductions, tot.net].map(money)) && tot.gross === 176000 && txt($("payslip-ytd-meta")) === "Sep – Oct 2026", j(ytd()));
await open("view", "arjun", "?month=2026-09");
check("H5", "September's payslip on 1 Oct says 8 working days came before records began (paid in full, unchecked)",
  j(notes()) === j(["8 working days of September 2026 came before attendance records began; they're paid in full, without a loss-of-pay check."]), j(notes()));
// Attendance from March: trackingStart moves back, so March to September all have records (absences).
const box = JSON.parse(w.localStorage.getItem("officeos:attendance"));
box.records.push({ id: `AT-${box.nextNum++}`, userId: "EMP-1105", date: "2026-03-10", checkIn: "09:10", checkOut: "18:10", mode: "office", source: "seed", originalCheckIn: null, originalCheckOut: null, history: [] });
w.localStorage.setItem("officeos:attendance", JSON.stringify(box));
await open("list", "arjun");
const all = PS.payslipsFor("EMP-1105", "2026-10-01");
check("H6", "with a record in March, payslips run March to October (8 months): March has no salary (effective 1 Apr), so it's on hold",
  j(all.map((s) => s.month)) === j(["2026-10", "2026-09", "2026-08", "2026-07", "2026-06", "2026-05", "2026-04", "2026-03"]) && all.at(-1).holdReason === "No salary on file for this month", j(all.map((s) => s.month)));
check("H7", "the year select offers 2026 – 27 then 2025 – 26; 2026 – 27 shows April to October (7 rows)",
  j([...$("payslip-year").options].map((o) => o.text)) === j(["Financial year 2026 – 27", "Financial year 2025 – 26"]) && listRows().length === 7
  && listRows().at(-1)[0] === "April 2026" && stat("ytd-net")[2] === "Apr to Oct, 7 payslips" && txt($("payslip-ytd-meta")) === "Apr – Oct 2026", j([listRows().map((r) => r[0]), stat("ytd-net")]));
const s = $("payslip-year"); s.value = "2025"; s.dispatchEvent(new w.Event("change", { bubbles: true }));
check("H8", "choosing 2025 – 26: March 2026 only, on hold with dashes; year totals ₹0; meta follows",
  j(listRows()) === j([["March 2026", "1 – 31 Mar", "—", "—", "—", "On hold", "ViewDownload"]]) && ytd().every((x) => x === "₹0")
  && txt($("payslip-history-meta")) === "Financial year 2025 – 26" && txt($("payslip-ytd-meta")) === "Mar 2026" && stat("ytd-net")[2] === "Mar, 1 payslip", j(listRows()));
check("H9", "...the last-month and next-payslip cards don't change with the year", stat("latest")[0] === "Net pay, September" && stat("next")[1] === "Oct 2026");
check("H10", "...and the re-drawn rows' Download is still a working placeholder", (() => { $("payslip-rows").querySelector("button").click(); return toasts().at(-1) === "Download isn't available in this demo."; })());
s.value = "2026"; s.dispatchEvent(new w.Event("change", { bubbles: true }));
check("H11", "back to 2026 – 27: the 7 rows again", listRows().length === 7 && jsErrors.length === 0);
fresh(OCT1); await open("view", "arjun");
check("H12", "payslip-view with no parameters on 1 Oct: the newest payslip, October", txt($("payslip-title")) === "Payslip, October 2026" && fld("working-days") === String(PS.payslipsFor("EMP-1105", "2026-10-01")[0].workingDays));
const box2 = JSON.parse(w.localStorage.getItem("officeos:attendance"));
box2.records.push({ id: `AT-${box2.nextNum++}`, userId: "EMP-1105", date: "2025-12-15", checkIn: "09:10", checkOut: "18:10", mode: "office", source: "seed", originalCheckIn: null, originalCheckOut: null, history: [] });
w.localStorage.setItem("officeos:attendance", JSON.stringify(box2));
const back = PS.payslipsFor("EMP-1105", "2026-10-01").map((x) => x.month);
check("H13", "records from Dec 2025: payslips run back across the year boundary, October 2026 to December 2025 (11 months)",
  back.length === 11 && back[0] === "2026-10" && back.at(-1) === "2025-12" && back.includes("2026-01"), j(back));

// =====================================================================
section("I. Sessions");
fresh(); await open("list", "oldEmp");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("I1", "payslips.html, old session with no employee id: signed out and sent to sign in (round 11P, N2); no payslip rows, dashes",
  navigations.length === 1 && localStorage.getItem("officeos:session") === null && listRows().length === 0
  && ["latest", "ytd-net", "ytd-tds", "next"].every((k) => stat(k)[1] === "—") && jsErrors.length === 0, j(listRows()));
fresh(); await open("view", "oldEmp");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("I2", "payslip-view, old Employee session, no parameters: signed out and sent to sign in (round 11P, N2); no one's payslip shown", navigations.length === 1 && localStorage.getItem("officeos:session") === null && fld("name") !== "Arjun Kapoor", j([message(), fld("name")]));
fresh(); await open("view", "oldEmp", "?employee=EMP-1105");
check("I3", "old Employee session asking for an id (can't be shown to be theirs): 403", navigations.length === 1 && $("payslip").hidden);
fresh(); await open("view", "oldAdmin", "?employee=EMP-1105&month=2026-09");
// Round 11P (behaviour; behaviour; N2: a session with no employee id is now signed out at the guard and sent to sign in, so the page script finds nobody signed in and draws nothing)
check("I4", "old Admin session asking for an id: signed out and sent to sign in (round 11P, N2); Arjun's payslip not shown", navigations.length === 1 && localStorage.getItem("officeos:session") === null && fld("name") !== "Arjun Kapoor" && fld("net") !== "₹83,576", j([fld("name"), fld("net")]));
for (const [n, page] of [["I5", "view"], ["I6", "list"]]) {
  fresh(); await open(page, null, page === "view" ? "?employee=EMP-1042" : "");
  check(n, `${FILE[page]}, nobody signed in: sent to the login page, the script draws nothing`,
    navigations.length === 1 && jsErrors.length === 0 && (page === "view" ? untouchedView() && $("payslip").hidden : listRows().length === 0 && stat("latest")[1] === "—"), j(navigations));   /* Round 7B: nothing shown, not the old sample */
}

// =====================================================================
section("J. End to end: payroll-run.html -> payslip-view.html");
for (const who of ["kabir", "aarav"]) {
  fresh(); await open("run", who);
  const run = PS.payrollRun(2026, 9, { preparedBy: "EMP-1008" });
  const links = [...d.getElementById("run-rows").querySelectorAll("a.btn")].map((a) => [a.getAttribute("href"), a.hasAttribute("data-not-implemented"), a.hidden]);
  const first = d.getElementById("run-rows").querySelector("a.btn");
  const ev = new w.MouseEvent("click", { bubbles: true, cancelable: true });
  first.dispatchEvent(ev);
  check(`J1${who[0]}`, `${who}: the run's 9 links carry employee + month, have no placeholder, and a click isn't stopped (no preventDefault, no toast; jsdom doesn't follow links, so J2 opens each href)`,
    links.length === 9 && links.every(([href, ni, hidden], i) => href === `payslip-view.html?employee=${run.rows[i].userId}&month=2026-09` && !ni && !hidden)
    && !ev.defaultPrevented && toasts().length === 0, j([links.length, ev.defaultPrevented, toasts(), navigations]));
  const bad = [];
  for (const [href] of links) {
    const target = new URL(href, "http://localhost/office-os/pages/payroll/payroll-run.html");
    const id = target.searchParams.get("employee");
    await open("view", who, target.search);
    const row = run.rows.find((r) => r.userId === id);
    if (!(navigations.length === 0 && jsErrors.length === 0 && fld("id") === id && fld("name") === S.getUser(id).name && fld("net") === money(row.net)
      && fld("gross") === money(row.gross) && fld("deductions") === money(row.deductions) && txt($("payslip-month")) === "September 2026")) bad.push(id);
  }
  check(`J2${who[0]}`, `${who}: each link lands on that person's real September payslip, the same gross / deductions / net as the run row`, bad.length === 0, j(bad));
}

// =====================================================================
section("K. What this round leaves alone (vs the frozen pre-4E HTML)");
const STATIC = { view: new JSDOM(PRE.view).window.document, list: new JSDOM(PRE.list).window.document };
fresh(); await open("view", "arjun");
const strip = (node) => { const c = node.cloneNode(true); c.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id")); c.removeAttribute?.("id"); return c.outerHTML.replaceAll(' hidden=""', ""); };
check("K1", "payslip-view: company block, info labels, column headings, net label unchanged; footer's first line unchanged, its bank / PAN line corrected (Round 7B)",
  strip(d.querySelector(".payslip__brand")) === strip(STATIC.view.querySelector(".payslip__brand")) && strip(d.querySelector(".payslip__foot").children[0]) === strip(STATIC.view.querySelector(".payslip__foot").children[0])
  && txt(d.querySelector(".payslip__foot").children[1]) === "Bank and PAN details are always masked on payslips. HR and Admins can see them in full on the employee's profile."
  // Round 9F (behaviour; was: every label equal to the frozen pre-4E page's): the same labels, except that the Income tax
  // (TDS) line now reads "Income tax (TDS), sample tax rates"
  && j([...d.querySelectorAll(".payslip dt, .payslip h3, .payslip__net span:not(.badge)")].map(txt)) === j([...STATIC.view.querySelectorAll(".payslip dt, .payslip h3, .payslip__net span:not(.badge)")].map(txt).map((t) => (t === "Income tax (TDS)" ? "Income tax (TDS), sample tax rates" : t))));
check("K2", "topbar unchanged apart from what app.js does on every page", txt(d.querySelector(".topbar__left")) === txt(STATIC.view.querySelector(".topbar__left")));
fresh(); await open("list", "arjun");
check("K3", "payslips: page title and subtitle, table head, card titles, stat icons unchanged",
  txt(d.querySelector("h1")) === "My payslips" && strip(d.querySelector("thead")) === strip(STATIC.list.querySelector("thead"))
  && j([...d.querySelectorAll(".card__title")].map(txt)) === j([...STATIC.list.querySelectorAll(".card__title")].map(txt))
  && j([...d.querySelectorAll(".stat__icon")].map(strip)) === j([...STATIC.list.querySelectorAll(".stat__icon")].map(strip)));

// =====================================================================
section("M. The profile pages with nothing on file (the masking helper's empty case)");
fresh(); await open("me", "arjun");
S.updateUser(USER_ACTOR("admin", "EMP-1105"), "EMP-1105", { bankAccount: null, bankAccountLast4: null, pan: null });
await open("me", "arjun");
const kv = (label) => [...d.querySelectorAll(".kv__row")].find((r) => txt(r.querySelector("dt")) === label)?.querySelector("dd");
check("M1", "my-profile: no bank account and no PAN -> 'Not on file' (muted) for both, as before",
  txt(kv("Bank account")) === "Not on file" && kv("Bank account").className === "text-muted" && txt(kv("PAN")) === "Not on file" && kv("PAN").className === "text-muted" && jsErrors.length === 0);
await open("user", "aarav", "?id=EMP-1105");
check("M2", "user-profile: no bank account and no PAN -> 'Not on file' for both, as before",
  txt(kv("Bank account")) === "Not on file" && txt(kv("PAN")) === "Not on file" && jsErrors.length === 0, j([txt(kv("Bank account")), txt(kv("PAN"))]));
S.updateUser(USER_ACTOR("admin", "EMP-1042"), "EMP-1042", { bankAccountLast4: null });
await open("user", "aarav", "?id=EMP-1042");
const bankSpan = kv("Bank account").querySelector("span");
const before = txt(bankSpan);
kv("Bank account").querySelector("button").click();
check("M3", "user-profile: the full number on file but no last 4 -> the bare mask '•••• ••••', and Reveal still shows the number",
  before === "•••• ••••" && txt(bankSpan) === S.getUser("EMP-1042").bankAccount.replace(/(\d{4})(?=\d)/g, "$1 "), j([before, txt(bankSpan)]));

// =====================================================================
section("L. Source layout (frozen copies only)");
const walk = (dir, base = "") => fs.readdirSync(new URL(`./${dir}/${base}`, import.meta.url), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const POST = walk("js-post4E");
const changed = POST.filter((p) => !fs.existsSync(new URL(`./js-pre4E/${p}`, import.meta.url)) || src("js-post4E", p) !== src("js-pre4E", p));
check("L1", "Round 4E's js changes (its result vs the code before it): exactly these 8; nothing removed",
  j(changed) === j(["data/payroll-store.js", "pages/my-profile.js", "pages/payroll-run.js", "pages/payslip-view.js", "pages/payslips.js", "pages/user-profile.js", "ui/money.js", "ui/pii.js"])
  && walk("js-pre4E").every((p) => POST.includes(p)), j(changed));
const block = /\r\n\r\n\/\/ ---------- payslips ----------[\s\S]*?net: 0 \}\);/;
check("L2", "payroll-store.js: only the payslips block (payslipsFor, payslipTotals) added after canApprove; nothing else touched",
  src("js-post4E", "data/payroll-store.js").replace(block, "") === src("js-pre4E", "data/payroll-store.js") && block.test(src("js-post4E", "data/payroll-store.js")));
const runPre = src("js-pre4E", "pages/payroll-run.js"), runPost = src("js-post4E", "pages/payroll-run.js");
check("L3", "payroll-run.js: only the data-not-implemented line removed and its comment rewritten",
  runPost === runPre.replace(`  // payslip-view.html isn't wired yet (it always shows one sample payslip), so\r\n  // the link carries the employee and month for the payslip round to read, and\r\n  // until then shows a "not available" toast instead of the wrong person's payslip.\r\n`,
    `  // Opens this person's payslip for the run's month (payslip-view.html reads\r\n  // ?employee and ?month).\r\n`).replace(`  link.dataset.notImplemented = "Viewing a September payslip";\r\n`, "") && runPost !== runPre);
const JSTREE = POST.filter((p) => p.endsWith(".js"));
const maskLiterals = JSTREE.filter((p) => /•••• •••• \$\{|•••••\$\{/.test(src("js-post4E", p)));
check("L4", "masking: one copy left, in ui/pii.js; my-profile and user-profile import it (before: two copies, in those two pages)",
  j(maskLiterals) === j(["ui/pii.js"]) && j(walk("js-pre4E").filter((p) => /•••• •••• \$\{|•••••\$\{/.test(src("js-pre4E", p)))) === j(["pages/my-profile.js", "pages/user-profile.js"])
  && ["pages/my-profile.js", "pages/user-profile.js", "pages/payslip-view.js"].every((p) => src("js-post4E", p).includes('import { maskAccount, maskPan } from "../ui/pii.js";')), j(maskLiterals));
check("L5", "the profile pages' masking lines changed only to call the helper (user-profile keeps its '•••• ••••' fallback)",
  src("js-post4E", "pages/my-profile.js").replace('import { maskAccount, maskPan } from "../ui/pii.js";\r\n', "")
    .replace("(masked by ui/pii.js, as on the employee profile page; no Reveal here)", "(same masking as the employee profile page, no Reveal here)")
    .replace("maskAccount(user.bankAccountLast4)", "user.bankAccountLast4 ? `•••• •••• ${user.bankAccountLast4}` : \"\"").replace("maskPan(user.pan)", "user.pan ? `•••••${user.pan.slice(-5)}` : \"\"") === src("js-pre4E", "pages/my-profile.js")
  && src("js-post4E", "pages/user-profile.js").replace('import { maskAccount, maskPan } from "../ui/pii.js";\r\n', "")
    .replace("// Sensitive details, masked by ui/pii.js (last 4 of the account, last 5 of the PAN)", "// Sensitive details (same masking as the static page: last 4 of the account, last 5 of the PAN)")
    .replace('maskAccount(user.bankAccountLast4) || "•••• ••••"', "user.bankAccountLast4 ? `•••• •••• ${user.bankAccountLast4}` : \"•••• ••••\"").replace("maskPan(user.pan),", "user.pan ? `•••••${user.pan.slice(-5)}` : \"\",") === src("js-pre4E", "pages/user-profile.js"));
const pages = ["pages/payslip-view.js", "pages/payslips.js"].map((p) => src("js-post4E", p)).join("\n");
check("L6", "the two page scripts work out no pay: no payroll.js import or pay function; read only payslipsFor / payslipTotals from the store",
  !/payroll\.js"|computePay|splitGross|monthlyTds|lossOfPay|providentFund|payrollRunFor|monthFor/.test(pages)
  && /import \{ payslipsFor \} from "\.\.\/data\/payroll-store\.js";/.test(pages) && /import \{ payslipsFor, payslipTotals \} from "\.\.\/data\/payroll-store\.js";/.test(pages));
check("L7", "no innerHTML in the new scripts", !/innerHTML/.test(pages + ["ui/money.js", "ui/pii.js"].map((p) => src("js-post4E", p)).join("")));
check("L8", "ui/money.js and ui/pii.js import nothing", ["ui/money.js", "ui/pii.js"].every((p) => !/\bimport\b/.test(src("js-post4E", p))));
const hpre = (f) => src("html-pre4E", f), hpost = (f) => src("html-post4E", f);
check("L9", "payroll pages not in scope untouched by Round 4E: payroll-run.html, salary-structure.html (its result vs before)",
  j(walk("html-post4E")) === j(walk("html-pre4E")) && ["payroll-run.html", "salary-structure.html"].every((f) => hpost(f) === hpre(f)));
const undoView = hpost("payslip-view.html")
  .replace(/ id="payslip(-[a-z-]+)?"/g, "").replace(/ data-field="[a-z-]+"/g, "")
  .replace(/  <section class="card" hidden>[\s\S]*?<\/section>\r\n\r\n/, "")
  .replace('\r\n    <div hidden></div>', "")
  .replace('\r\n<script type="module" src="../../assets/js/pages/payslip-view.js"></script>', "");
check("L10", "payslip-view.html: only ids / data-field hooks, the message card, the notes box and the script tag added", undoView === hpre("payslip-view.html"));
const undoList = hpost("payslips.html")
  .replace(/ id="payslip-[a-z-]+"/g, "").replace(/ data-field="[a-z-]+"/g, "").replace(/ data-stat="[a-z-]+"/g, "")
  .replace('\r\n<script type="module" src="../../assets/js/pages/payslips.js"></script>', "");
check("L11", "payslips.html: only ids / data-stat / data-field hooks and the script tag added", undoList === hpre("payslips.html"));
check("L12", "new / changed files CRLF with no final newline",
  [...changed.map((p) => ["js-post4E", p]), ["html-post4E", "payslip-view.html"], ["html-post4E", "payslips.html"]].every(([dir, p]) => { const t = src(dir, p); return !t.endsWith("\n") && !/(^|[^\r])\n/.test(t); }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
