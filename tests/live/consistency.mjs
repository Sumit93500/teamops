// usage: node consistency.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 14E part 3 (JS stage), in jsdom with the js in ./js: links, figures shown in more than one place, and the flap.
//   L  links: the error pages' "Go to dashboard" is each role's own landing page (one it may open; signed out, unchanged); every visible link on every
//      page, as each role, leads to an existing page that role may open, but for the 11 decided ones (login's 4 role links, two-factor's backup code
//      placeholder, candidates' 4 sample links, the error pages' 2 "Go back")
//   B  each figure shown in more than one place agrees everywhere, as each role, and with the stores: headcount, present today, payroll gross, net and
//      TDS, reimbursements due, waiting for you (sidebar, bell, inbox, admin card), items to reorder, leave left, assets held, a payslip's net
//   K  the differences ruled on 14E part 3: my attendance's two "working days so far" (left, pinned); Open requests counts by My requests' Pending rule
//      for every person (14E part 4); the sidebar reads "N employees" (14E part 4); the designations page carries the sample notice (14E part 4); the
//      inbox's Pending tab counting static sample rows (left, pinned)
//   O  (14E part 4) Arjun's Open requests and its note; one more request of each kind planted, both places move together
//   F  the flap: a demo sign-in person (Arjun) who never checks in on a day after the seed day, read at 09:00, 10:00, 19:00 and 23:59 that day and at
//      00:30 and 10:00 the next: not yet, overdue, absent, absent, then present (the generated record), in every page's source (dayFor, teamFor,
//      summaryRange, hoursChart, payroll's open absences); a sample person who doesn't sign in is the same all along; one instant read in this
//      device zone gives the day as this zone's clock has it
//   E99 no js errors
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const RealDate = Date;
const NOW = new RealDate(2026, 8, 28, 10, 0, 0).getTime();
let now = NOW;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } };
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;
const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const WHO = { admin: ["admin", "Aarav Mehta", "EMP-1001"], hr: ["hr", "Priya Nair", "EMP-1003"], fin: ["fin", "Kabir Shah", "EMP-1008"], emp: ["emp", "Arjun Kapoor", "EMP-1105"], mgr: ["emp", "Sneha Rao", "EMP-1029"] };
const login = (who) => mem.set("officeos:session", JSON.stringify({ roleKey: WHO[who][0], userLabel: WHO[who][1], employeeId: WHO[who][2], signedInAt: now }));
let loads = 0, w, d, navigations = 0;
const allJsErrors = [];
async function open(page, who, { query = "", keep = false } = {}) {
  if (!keep) mem.clear();
  if (who) login(who); else mem.delete("officeos:session");
  const vc = new VirtualConsole(); timers = []; navigations = 0;
  vc.on("jsdomError", (e) => { if (/navigation/i.test(e.message)) navigations++; else allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(path.join(DIR, page), "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, getComputedStyle: w.getComputedStyle.bind(w) });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) { try { await import(`./js/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); } }
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} timer: ${e.message}`); } });
}
console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const num = (s) => Number(String(s ?? "").replace(/[^\d.]/g, "") || NaN);
const stat = (label) => { const s = [...d.querySelectorAll("main .stat")].find((x) => txt(x.querySelector(".stat__label")).startsWith(label)); return s && !s.closest("[hidden]") ? { value: txt(s.querySelector(".stat__value")), note: txt(s.querySelector(".stat__delta")) } : null; };
const meta = (title) => txt([...d.querySelectorAll("main .card")].find((c) => txt(c.querySelector(".card__title")).startsWith(title))?.querySelector(".card__meta"));
const tab = (label) => txt([...d.querySelectorAll("main .tabs__tab")].find((t) => txt(t).startsWith(label))?.querySelector(".badge"));
const tryImport = async (p) => { try { return await import(p); } catch (e) { allJsErrors.push(`import ${p}: ${e.message}`); return {}; } };

// =================================================================
section("L. Links");
await open("dashboard/admin.html", "admin");
const G = await tryImport("./js/core/guard.js");
const AUTH = await tryImport("./js/core/auth.js");
const landing = {}, errLinks = {};
for (const who of Object.keys(WHO)) {
  for (const page of ["errors/403.html", "errors/404.html", "errors/500.html"]) {
    await open(page, who);
    landing[who] = AUTH.getCurrentRole?.()?.landing;
    const a = [...d.querySelectorAll("main a")].find((x) => txt(x) === "Go to dashboard");
    const target = a ? new URL(a.getAttribute("href"), `http://localhost/office-os/pages/${page}`).pathname.split("/office-os/pages/")[1] : null;
    errLinks[`${who} ${page}`] = [target, !!target && fs.existsSync(path.join(DIR, target)), target ? G.canOpenPage?.(target) : null];
  }
}
check("L1", "the error pages' (403, 404, 500) 'Go to dashboard', as each role: that role's own landing page, which exists and which the role may open", Object.entries(errLinks).every(([k, [t, ex, ok]]) => t === landing[k.split(" ")[0]] && ex && ok === true) && Object.keys(errLinks).length === 15, j(errLinks));
const signedOut = [];
for (const page of ["errors/403.html", "errors/404.html", "errors/500.html"]) { await open(page, null); signedOut.push([...d.querySelectorAll("main a")].find((x) => txt(x) === "Go to dashboard")?.getAttribute("href")); }
check("L2", "signed out, the error pages' 'Go to dashboard' is as before (the Admin dashboard; the guard sends them to sign in)", signedOut.every((h) => h === "../dashboard/admin.html"), j(signedOut));
const DECIDED = ["auth/login.html|#|Admin", "auth/login.html|#|Employee", "auth/login.html|#|Finance", "auth/login.html|#|HR Manager", "auth/two-factor.html|#|Use a backup code",
  "recruitment/candidates.html|#|+ 1 more", "recruitment/candidates.html|#|+ 12 more", "recruitment/candidates.html|#|+ 20 more", "recruitment/candidates.html|#|+ 6 more",
  "errors/403.html|javascript:history.back()|Go back", "errors/404.html|javascript:history.back()|Go back"];
const pages = [];
for (const dd of fs.readdirSync(DIR)) { if (!fs.statSync(path.join(DIR, dd)).isDirectory()) continue; for (const f of fs.readdirSync(path.join(DIR, dd))) if (f.endsWith(".html")) pages.push(`${dd}/${f}`); }
const bad = new Set(), decidedSeen = new Set(); let linkCount = 0;
for (const who of Object.keys(WHO)) for (const page of pages) {
  await open(page, who);
  if (navigations && !page.startsWith("auth/") && !page.startsWith("errors/")) continue;
  for (const a of d.querySelectorAll("a")) {
    if (a.closest("[hidden]") || a.hidden) continue;
    linkCount++;
    const raw = a.getAttribute("href"), text = txt(a) || a.getAttribute("aria-label") || "";
    const key = `${page}|${raw}|${text}`;
    if (raw === null || raw === "" || raw === "#" || /^javascript:/i.test(raw)) { if (DECIDED.includes(key)) decidedSeen.add(key); else bad.add(`${who} ${key}`); continue; }
    if (/^(mailto|tel|https?):/i.test(raw)) continue;
    const u = new URL(raw, `http://localhost/office-os/pages/${page}`); const i = u.pathname.indexOf("/office-os/pages/");
    if (i < 0) continue;
    const t = u.pathname.slice(i + 17);
    if (!fs.existsSync(path.join(DIR, t)) || G.canOpenPage?.(t) !== true) bad.add(`${who} ${key} -> ${t}`);
  }
}
check("L3", `every visible link on every page, as each role (${pages.length} pages x 5 roles), leads to an existing page that role may open; the only exceptions are the 11 decided ones`, linkCount > 3000 && bad.size === 0 && decidedSeen.size === DECIDED.length, j({ links: linkCount, bad: [...bad].slice(0, 6), decided: decidedSeen.size }));

// =================================================================
section("B. The same figure everywhere");
const AS = await tryImport("./js/data/attendance-store.js");
const S = await tryImport("./js/data/store.js");
const PS = await tryImport("./js/data/payroll-store.js");
const IS = await tryImport("./js/data/inventory-store.js");
const WT = await tryImport("./js/ui/waiting.js");
const CD = await tryImport("./js/data/chart-data.js");
const LV = await tryImport("./js/ui/leave-view.js");
const MONEY = await tryImport("./js/ui/money.js");
const today = () => LV.todayIso();
const sidebarCount = () => num(txt(d.getElementById("sidebar-headcount")));
await open("dashboard/admin.html", "admin");
const B1 = { sidebar: sidebarCount(), admin: num(stat("Total employees")?.value), chart: num(meta("Headcount by department")), store: S.activeHeadcount() };
await open("users/departments.html", "admin"); B1.departments = num(stat("Employees")?.value);
await open("users/users-list.html", "admin"); B1.usersList = num(tab("All")) - num(tab("Inactive"));
check("B1", "headcount: the sidebar, the admin dashboard's Total employees, the headcount chart's total, the departments page and users-list (all but inactive) agree with activeHeadcount()", Object.values(B1).every((v) => v === B1.store) && B1.store > 0, j(B1));
const B2 = {};
for (const who of ["admin", "hr"]) {
  await open("dashboard/admin.html", who); B2[`${who} admin`] = stat("Present today")?.value;
  await open("attendance/team-attendance.html", who); B2[`${who} team`] = stat("Present")?.value;
}
B2.store = String(AS.summaryFor(today()).present);
check("B2", "present today: the admin dashboard and team attendance, as Admin and HR, agree with summaryFor()", Object.values(B2).every((v) => v === B2.store), j(B2));
const { year, month } = PS.runMonth(today()); const run = PS.payrollRun(year, month); const tot = PS.runTotals(run); const R = MONEY.rupees;
const B3 = {};
for (const who of ["admin", "fin"]) {
  await open("dashboard/finance.html", who); B3[`${who} finance gross`] = stat("Payroll")?.value; B3[`${who} finance net`] = stat("Net pay")?.value; B3[`${who} finance tds`] = stat("Tax deducted")?.value;
  await open("payroll/payroll-run.html", who); B3[`${who} run gross`] = stat("Gross pay")?.value; B3[`${who} run net`] = stat("Net pay")?.value;
  await open("finance/tax-deductions.html", who); B3[`${who} tax tds`] = stat("Income tax")?.value;
}
await open("dashboard/admin.html", "admin"); B3["admin dashboard gross"] = stat("Payroll")?.value;
const tds = R(PS.payslipTotals(run.rows).tds);
check("B3", "payroll: gross (admin and finance dashboards, the run), net (finance dashboard, the run) and TDS (finance dashboard, tax page) agree with the run's totals", Object.entries(B3).every(([k, v]) => v === (k.includes("tds") ? tds : k.includes("net") ? R(tot.net) : R(tot.gross))), j(B3));
const B4 = {};
for (const who of ["admin", "fin"]) { await open("finance/expenses.html", who); B4[`${who} expenses`] = stat("Approved, to pay")?.value; await open("dashboard/finance.html", who); B4[`${who} finance`] = stat("Reimbursements due")?.value; }
check("B4", "reimbursements: the expenses page's Approved, to pay and the finance dashboard's Reimbursements due agree, as Admin and Finance", new Set(Object.values(B4)).size === 1 && !!B4["admin expenses"], j(B4));
const B5 = {};
for (const who of Object.keys(WHO)) {
  await open("requests/approvals-inbox.html", who);
  const badge = d.querySelector(".nav__item[data-count-waiting] .nav__count");   // ui/sidebar.js: no count drawn when nothing waits
  const bell = d.querySelector(".topbar__icon-btn--dot[aria-haspopup]")?.getAttribute("aria-label") ?? "";
  B5[who] = { sidebar: badge && !badge.closest("[hidden]") ? num(txt(badge)) : 0, bell: num(bell), inbox: num(stat("Waiting for you")?.value), store: WT.waitingCount?.(WHO[who][2], WHO[who][0]) };
}
await open("dashboard/admin.html", "admin"); const card = meta("Pending approvals").match(/of (\d+)/);
check("B5", "waiting for you: the sidebar badge, the bell, the inbox stat (and the admin dashboard's Pending approvals card) agree with waitingCount(), as each role", Object.values(B5).every((x) => x.sidebar === x.store && x.bell === x.store && x.inbox === x.store) && Number(card?.[1]) === B5.admin.store, j({ ...B5, adminCard: card?.[1] }));
await open("inventory/items.html", "admin"); const B6 = { items: num(stat("Low stock")?.value) + num(stat("Out of stock")?.value), alerts: num(meta("Reorder alerts")) };
await open("dashboard/admin.html", "admin"); B6.admin = num(stat("Items to reorder")?.value); B6.store = IS.reorderAlerts().length;
check("B6", "stock to reorder: items' Low plus Out of stock, its Reorder alerts card and the admin dashboard's Items to reorder agree with reorderAlerts()", Object.values(B6).every((v) => v === B6.store), j(B6));
const lb = CD.leaveBalanceChart?.("EMP-1105") ?? { labels: [], series: [] };
const left = (type) => CD.valuesOf(lb, "Left")[lb.labels.indexOf(type)];
const B7 = { store: ["casual", "sick", "earned"].reduce((s, t) => s + (left(t) ?? 0), 0) };
await open("dashboard/employee.html", "emp"); B7.dashboard = num(stat("Leave balance")?.value);
await open("leave/my-leave.html", "emp"); B7.myLeave = [...d.querySelectorAll(".balance")].slice(0, 3).reduce((s, t) => s + num(t.querySelector(".balance__value").firstChild.textContent), 0);
await open("users/user-profile.html", "admin", { query: "?id=EMP-1105" }); B7.profile = [...d.querySelectorAll(".bar-row")].filter((r) => ["Casual", "Sick", "Earned"].includes(txt(r.children[0]))).reduce((s, r) => s + num(txt(r.querySelector(".bar-row__value"))), 0);
check("B7", "leave left (Arjun, casual + sick + earned): his dashboard, his My leave tiles and his profile (as Admin) agree with balanceFor()", Object.values(B7).every((v) => v === B7.store) && B7.store > 0, j(B7));
const held = IS.allAssets().filter((a) => a.holderId === "EMP-1105" && a.status === "assigned").length;
await open("inventory/my-assets.html", "emp"); const B8 = { myAssets: num(meta("Assigned to me")) };
await open("users/user-profile.html", "admin", { query: "?id=EMP-1105" }); B8.profile = num(meta("Assets")); B8.store = held;
check("B8", "assets held (Arjun): My assets and his profile (as Admin) agree with the asset register", Object.values(B8).every((v) => v === held) && held > 0, j(B8));
const slip = PS.payrollRunFor?.("EMP-1105", year, month);
await open("payroll/payslips.html", "emp"); const B9 = { payslips: stat("Net pay,")?.value, run: R(run.rows.find((r) => r.userId === "EMP-1105")?.net ?? NaN) };
check("B9", "a payslip's net (Arjun, this month): his payslips page and the payroll run's row agree", B9.payslips === B9.run && !!B9.run && !!slip, j(B9));

// =================================================================
section("K. Left for a ruling, pinned as they are today");
await open("attendance/my-attendance.html", "emp");
const K1 = { summary: num(meta("Month summary")), log: num(meta("Daily log").replace(/^\D+/, "")) };
check("K1", "my attendance (Arjun, not in yet today): the Month summary counts finished working days (19), the Daily log every listed day, today included (20)", K1.summary === 19 && K1.log === 20, j(K1));
// Round 14E part 4 (behaviour; K2 pinned the dashboard's 2 against My requests' 3: the two now count by one rule, data/own-requests.js)
const OR = await tryImport("./js/data/own-requests.js");
const openNow = async (who) => { await open("dashboard/employee.html", who, { keep: true }); const dash = stat("Open requests"); await open("requests/my-requests.html", who, { keep: true }); return { dashboard: num(dash?.value), note: dash?.note, myRequests: num(tab("Pending")), approvedTab: num(tab("Approved")), store: OR.openRequests?.(WHO[who][2]).length }; };
mem.clear(); await open("dashboard/admin.html", "admin", { keep: true });
const people = S.getAllUsers().filter((u) => u.status !== "inactive");
const each = {};
for (const u of people) {
  WHO[`p-${u.id}`] = [u.role, u.name, u.id];
  const r = await openNow(`p-${u.id}`);
  each[u.id] = r;
}
check("K2", "Open requests (employee dashboard) equals My requests' Pending, from one rule (openRequests()), for every person in the seed data", people.length >= 9 && Object.values(each).every((r) => r.dashboard === r.myRequests && r.myRequests === r.store), j(Object.fromEntries(Object.entries(each).map(([k, v]) => [k, [v.dashboard, v.myRequests, v.store]]))));
check("O1", "Arjun: 3 open (1 leave, 1 claim, 1 asset) on both, his expense claim now counted on the dashboard (was 2: '1 leave, 1 asset')", each["EMP-1105"]?.dashboard === 3 && each["EMP-1105"]?.myRequests === 3 && each["EMP-1105"]?.note === "1 leave, 1 claim, 1 asset", j(each["EMP-1105"]));
// One more of each kind, planted for Arjun: pending leave, correction, claim and asset request; an asset request approved but not handed over (open),
// one fulfilled and a paid claim (both approved)
const plantOne = (key, pick, change) => { const b = JSON.parse(mem.get(key)); const base = b.records.find(pick) ?? b.records[0]; b.records.push({ ...structuredClone(base), ...change }); mem.set(key, JSON.stringify(b)); };
const before = await openNow("emp");
plantOne("officeos:leave-requests", (r) => r.status === "pending", { id: "LV-901", userId: "EMP-1105", status: "pending", appliedOn: "2026-09-27" });
plantOne("officeos:regularizations", (r) => r.status === "pending", { id: "RG-901", userId: "EMP-1105", status: "pending", appliedOn: "2026-09-27" });
plantOne("officeos:expense-claims", (r) => r.status === "pending", { id: "EXP-901", userId: "EMP-1105", status: "pending", appliedOn: "2026-09-27" });
plantOne("officeos:expense-claims", (r) => r.status === "pending", { id: "EXP-902", userId: "EMP-1105", status: "paid", stage: "done", appliedOn: "2026-09-20" });
plantOne("officeos:asset-requests", (r) => r.status === "pending", { id: "ARQ-901", userId: "EMP-1105", status: "pending", appliedOn: "2026-09-27" });
plantOne("officeos:asset-requests", (r) => r.status === "pending", { id: "ARQ-902", userId: "EMP-1105", status: "approved", stage: "done", appliedOn: "2026-09-26" });
plantOne("officeos:asset-requests", (r) => r.status === "pending", { id: "ARQ-903", userId: "EMP-1105", status: "fulfilled", stage: "done", appliedOn: "2026-09-25" });
const after = await openNow("emp");
check("O2", "after one more request of each kind (Arjun): both count 5 more open (leave, correction, claim, asset, and the approved asset request not handed over); the fulfilled request and the paid claim go to Approved (2 more)", after.dashboard === before.dashboard + 5 && after.myRequests === after.dashboard && after.store === after.dashboard && after.approvedTab === before.approvedTab + 2, j({ before, after }));
// Round 14E part 4 (behaviour; K3 pinned "9 active employees": the sidebar now reads "9 employees", the same count)
const K3 = {};
for (const who of ["admin", "hr", "fin", "emp", "mgr"]) { mem.clear(); await open("dashboard/employee.html", who); K3[who] = txt(d.getElementById("sidebar-headcount")); }
await open("users/users-list.html", "admin"); const tabs3 = { activeTab: num(tab("Active")), onLeaveTab: num(tab("On leave")) };
await open("dashboard/hr.html", "hr"); const hrNote = stat("On leave today")?.note ?? "";
check("K3", "the sidebar reads '9 employees' (everyone not inactive: activeHeadcount()), never 'active', as each role, and the HR dashboard's On leave today note says 'of 9 employees' for the same count; users-list's tabs as before (Active 8, On leave 1)",
  Object.values(K3).every((t) => t === `${S.activeHeadcount()} employees`) && hrNote.includes(` of ${S.activeHeadcount()} employees, `) && !/active/.test(hrNote) && tabs3.activeTab === 8 && tabs3.onLeaveTab === 1, j({ ...K3, hrNote, ...tabs3 }));
// Round 14E part 4 (behaviour; K4 pinned the page as a static table: it now carries the sample notice; its figures are as before)
await open("access/designations.html", "admin");
const desRows = [...d.querySelectorAll("main tbody tr")].map((tr) => [...tr.children].map(txt));
const notice = d.querySelector("main > .alert, main .page-header + .alert");
const K4 = { rows: desRows.length, employees: desRows.reduce((s, r) => s + num(r[3]), 0), notice: txt(notice), cls: notice?.className };
const SAMPLE = []; for (const pg of ["announcements/announcements.html", "recruitment/candidates.html", "system/backup.html", "system/reports.html", "attendance/shifts.html"]) { await open(pg, "admin"); const a = [...d.querySelectorAll("main .alert")].find((x) => txt(x).startsWith("Sample, not built yet:")); SAMPLE.push([pg, a?.className, a?.tagName]); }
check("K4", "the designations page is marked as a sample with the pattern the other sample pages use (a div.alert.alert--info, 'Sample, not built yet: ...'), straight under the page header; its table as before (9 rows, 156)", K4.rows === 9 && K4.employees === 156 && /^Sample, not built yet: .+ This page shows how it could look; nothing here is saved, and the .+ listed are examples\.$/.test(K4.notice) && K4.cls === "alert alert--info mb-4" && SAMPLE.every(([, c, t]) => /^alert alert--info( mb-4)?$/.test(c ?? "") && t === "DIV") && notice?.previousElementSibling?.classList.contains("page-header"), j({ K4, SAMPLE }));
await open("requests/approvals-inbox.html", "admin");
const K5 = { pendingTab: num(tab("Pending")), waiting: num(stat("Waiting for you")?.value), staticRows: d.querySelectorAll("main tbody [data-static], main tbody tr[data-sample]").length };
check("K5", "the inbox's Pending tab (Admin, 11) counts its static sample rows with the real ones; Waiting for you is 8", K5.pendingTab === 11 && K5.waiting === 8, j(K5));

// =================================================================
section("F. The flap");
const at = (y, mo, da, h, mi) => new RealDate(y, mo - 1, da, h, mi).getTime();
mem.clear(); now = at(2026, 9, 25, 10, 0); await open("dashboard/admin.html", "admin", { keep: true });   // the seed day: 25 Sep
const DAY = "2026-09-28";
const readDay = (id) => {
  const day = AS.dayFor(id, DAY);
  const team = AS.teamFor(DAY).find((x) => x.userId === id);
  const range = AS.rangeFor(id, "2026-09-15", LV.todayIso() < DAY ? DAY : LV.todayIso()) ?? [];
  const hc = CD.hoursChart?.(range, LV.todayIso());
  const kind = hc ? hc.marks[hc.labels.indexOf(DAY)]?.kind : null;
  const pr = PS.payrollRunFor?.(id, 2026, 9);
  const open = (pr?.openAbsences ?? []).some((a) => a.date === DAY);
  const sum = AS.summaryRange(DAY, DAY)?.[0];
  return { status: day?.status, team: team?.status, chart: kind, openAbsence: open, absentInSummary: sum?.absent ?? null };
};
const CASES = [["28 Sep 09:00", at(2026, 9, 28, 9, 0)], ["28 Sep 10:00", at(2026, 9, 28, 10, 0)], ["28 Sep 19:00", at(2026, 9, 28, 19, 0)], ["28 Sep 23:59", at(2026, 9, 28, 23, 59)], ["29 Sep 00:30", at(2026, 9, 29, 0, 30)], ["29 Sep 10:00", at(2026, 9, 29, 10, 0)]];
const F = {};
for (const [label, t] of CASES) { now = t; F[label] = { arjun: readDay("EMP-1105"), rohan: readDay("EMP-1042") }; }
console.log("      " + j(F));
const st = (l) => F[l].arjun.status;
check("F1", "Arjun (a demo sign-in person) never checks in on 28 Sep: 'not-yet' at 09:00 and 10:00, 'absent' at 19:00 and 23:59, every source the same (day, team, chart)", st("28 Sep 09:00") === "not-yet" && st("28 Sep 10:00") === "not-yet" && st("28 Sep 19:00") === "absent" && st("28 Sep 23:59") === "absent"
  && ["28 Sep 19:00", "28 Sep 23:59"].every((l) => F[l].arjun.team === "absent" && F[l].arjun.chart === "absent"), j(Object.fromEntries(Object.entries(F).map(([k, v]) => [k, v.arjun.status]))));
check("F2", "the flap, as it is (left for a ruling): from 00:30 the next day the same 28 Sep reads 'present' in every source (a generated record); the day's absent count drops from 4 (the four demo sign-in people) to 0; payroll never held it (it doesn't count today, and the next day there's nothing to count)",
  ["29 Sep 00:30", "29 Sep 10:00"].every((l) => F[l].arjun.status === "present" && F[l].arjun.team === "present" && F[l].arjun.chart === "worked" && !F[l].arjun.openAbsence && F[l].arjun.absentInSummary === 0)
  && F["28 Sep 19:00"].arjun.absentInSummary === 4 && !F["28 Sep 19:00"].arjun.openAbsence, j({ at19: F["28 Sep 19:00"].arjun, next: F["29 Sep 00:30"].arjun }));
check("F3", "a sample person who doesn't sign in (Rohan) reads 'present' on 28 Sep from 10:00 on, at every time after (no flap)", ["28 Sep 10:00", "28 Sep 19:00", "28 Sep 23:59", "29 Sep 00:30", "29 Sep 10:00"].every((l) => F[l].rohan.status === "present"), j(Object.fromEntries(Object.entries(F).map(([k, v]) => [k, v.rohan.status]))));
// One instant, 28 Sep 19:00 UTC, read in this device's zone: the local date and time decide which side of the flap the day is on
now = RealDate.UTC(2026, 8, 28, 19, 0); const local = new RealDate(now); const there = readDay("EMP-1105");
const expect = local.getDate() === 29 ? "present" : local.getHours() >= 18 && local.getMinutes() >= 30 || local.getHours() >= 19 ? "absent" : "not-yet";
check("F4", `one instant (28 Sep 19:00 UTC) read in this zone (${local.getDate()} Sep ${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")} local): Arjun's 28 Sep is '${expect}', as this zone's clock has the day (India: present; UTC: absent; Los Angeles: not yet)`, there.status === expect, j(there));
now = NOW;

check("E99", "no js errors", allJsErrors.length === 0, j(allJsErrors.slice(0, 5)));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(0);
