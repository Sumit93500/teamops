// usage: node cells.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Cleanup Round C: the last shared pieces (ui/attendance-view.js: presentNote, checkInCell, hoursCell;
// ui/leave-view.js: fillDepartmentSelect, personCell; data/attendance-store.js: toMinutes, nowMinutes now
// exported), checked against the code they replace. ./js is the new code, ./js-preC the code before this round.
//   A  the pieces on their own, against verbatim copies of the old inline versions
//   B  the five pages that used them, old code vs new code: the whole document, storage and JS errors after
//      loading as five people at six clock times, then the same generic clicks, selects, dates and searches
//   C  source layout: no page keeps its own copy; the store only gained two `export`s; users-list untouched
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const PAGES = {
  team: ["attendance/team-attendance.html", "team-attendance"],
  admin: ["dashboard/admin.html", "admin-dashboard"],
  leave: ["leave/leave-approvals.html", "leave-approvals"],
  reg: ["attendance/regularization.html", "regularization"],
  mark: ["attendance/mark-attendance.html", "mark-attendance"],
};

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 9, 30, 11, 0);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const WHO = {
  priya: ["hr", "Priya Nair", "EMP-1003"], aarav: ["admin", "Aarav Mehta", "EMP-1001"], kabir: ["fin", "Kabir Shah", "EMP-1008"],
  arjun: ["emp", "Arjun Kapoor", "EMP-1105"], old: ["hr", "Priya Nair", undefined],
};
// [label, y, mo, d, h, mi]: a working day before, during and after the shift, a holiday, a weekend, a new year.
const CLOCKS = [
  ["Wed 30 Sep 08:00", 2026, 9, 30, 8, 0], ["Wed 30 Sep 11:00", 2026, 9, 30, 11, 0], ["Wed 30 Sep 19:00", 2026, 9, 30, 19, 0],
  ["Fri 2 Oct 11:00", 2026, 10, 2, 11, 0], ["Sat 3 Oct 11:00", 2026, 10, 3, 11, 0], ["Fri 1 Jan 2027 10:00", 2027, 1, 1, 10, 0],
];

let loads = 0, w = null, d = null;
const jsErrors = { js: [], "js-postC": [], "js-preC": [] };
function fresh(html = "<!doctype html><html><body></body></html>", url = "http://localhost/office-os/pages/x.html", errs = jsErrors.js, tag = "blank") {
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) errs.push(`${tag}: ${e.message}`); });
  const dom = new JSDOM(html, { url, virtualConsole: vc });
  w = dom.window; d = w.document;
  w.localStorage.clear();
  w.confirm = () => true;
  w.alert = () => {};
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, Event: w.Event });
}
async function openPage(dir, page, who) {
  const [path, script] = PAGES[page];
  fresh(read(path), `http://localhost/office-os/pages/${path}`, jsErrors[dir], `${dir}/${page}/${who}`);
  loads++;
  (await import(`./${dir}/core/auth.js`)).signIn(...WHO[who]);
  await import(`./${dir}/app.js?load=${loads}`);
  try { await import(`./${dir}/pages/${script}.js?load=${loads}`); } catch (e) { jsErrors[dir].push(`${page} import: ${e.message}`); }
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const storage = () => j(Object.keys(w.localStorage).sort().map((k) => [k, w.localStorage.getItem(k)]));

fresh();
const V = await import("./js/ui/leave-view.js");
const AV = await import("./js/ui/attendance-view.js");
const A = await import("./js/data/attendance-store.js");
const S = await import("./js/data/store.js");
const OV = await import("./js-preC/ui/leave-view.js");
const OAV = await import("./js-preC/ui/attendance-view.js");

// ---------- the old inline versions, verbatim from the pages before this round (el etc. from js-preC) ----------
const { el, percent, avatarClass, initials, departmentName } = OV;
const { hoursText } = OAV;
// mark-attendance and admin-dashboard
const oldToMinutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
// admin-dashboard
const oldNowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
// team-attendance (rows are { day, week, user })
function oldTeamOffNote(rows) {
  const holiday = rows.find((r) => r.day.status === "holiday")?.day.holiday;
  if (holiday) return `Holiday: ${holiday.name}`;
  if (rows.some((r) => r.day.status === "weekend")) return "Weekend";
  if (rows.some((r) => r.day.status === "no-data")) return "No attendance records for this date";
  if (rows.length && rows.every((r) => r.day.status === "on-leave")) return "Everyone is on leave";
  return "No active employees";
}
const oldTeamPresent = (summary, rows) => { const { expected } = summary; return expected ? `${percent(summary.present, expected)} of ${expected} expected` : oldTeamOffNote(rows); };
// admin-dashboard
function oldAdminOffNote(days) {
  const holiday = days.find((d) => d.status === "holiday")?.holiday;
  if (holiday) return `Holiday: ${holiday.name}`;
  if (days.some((d) => d.status === "weekend")) return "Weekend";
  if (days.some((d) => d.status === "no-data")) return "No attendance records for this date";
  if (days.length && days.every((d) => d.status === "on-leave")) return "Everyone is on leave";
  return "No active employees";
}
const oldAdminPresent = (summary, days) => (summary.expected ? `${percent(summary.present, summary.expected)} of ${summary.expected} expected` : oldAdminOffNote(days));
// team-attendance and admin-dashboard (identical)
function oldCheckInCell(day) {
  const td = el("td");
  if (!day.checkIn) {
    td.textContent = "–";
    return td;
  }
  td.append(el("span", "", day.checkIn));
  if (day.mode === "wfh") td.append(" ", el("span", "badge", "WFH"));
  if (day.originalCheckIn) td.append(el("span", "table__user-sub", `was ${day.originalCheckIn}`));
  return td;
}
function oldHoursCell(day) {
  const td = el("td", "table__num");
  if (day.minutesWorked === null) {
    td.textContent = day.incomplete ? "No check-out" : "–";
    return td;
  }
  td.append(el("span", "", hoursText(day.minutesWorked)));
  if (day.inProgress) td.append(el("span", "table__user-sub", "so far"));
  return td;
}
// team-attendance and admin-dashboard start-up (identical)
function oldFillSelect(deptSelect) {
  deptSelect.replaceChildren(el("option", "", "All departments"), ...S.getAllDepartments().map((d) => {
    const option = el("option", "", d.name);
    option.value = d.code;
    return option;
  }));
  deptSelect.options[0].value = "";
}
// team-attendance
function oldTeamPersonCell(row) {
  const td = el("td");
  const wrap = el("div", "table__user");
  const text = el("div");
  text.append(el("span", "table__user-name", row.user?.name ?? row.day.userId), el("span", "table__user-sub", row.day.userId));
  wrap.append(el("div", avatarClass(row.day.userId), initials(row.user?.name)), text);
  td.append(wrap);
  return td;
}
// admin-dashboard
function oldAdminPersonCell(person, day) {
  const td = el("td");
  const wrap = el("div", "table__user");
  const text = el("div");
  text.append(el("span", "table__user-name", person?.name ?? day.userId), el("span", "table__user-sub", person?.email ?? ""));
  wrap.append(el("div", avatarClass(day.userId), initials(person?.name)), text);
  td.append(wrap);
  return td;
}
// leave-approvals and regularization (identical)
function oldRequestPersonCell(request) {
  const person = S.getUser(request.userId);
  const td = el("td");
  const wrap = el("div", "table__user");
  const text = el("div");
  text.append(el("span", "table__user-name", person?.name ?? request.userId), el("span", "table__user-sub", departmentName(person?.department)));
  wrap.append(el("div", avatarClass(request.userId), initials(person?.name)), text);
  td.append(wrap);
  return td;
}

// =====================================================================
section("A. The pieces on their own");
const pad = (n) => String(n).padStart(2, "0");
const TIMES = Array.from({ length: 1440 }, (_, m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
check("A1", "toMinutes (the store's, now exported) == the pages' old toMinutes for all 1440 valid \"HH:MM\"", TIMES.every((t) => A.toMinutes(t) === oldToMinutes(t)));
const RULE_TIMES = Object.entries(A.ATTENDANCE_RULES).filter(([, v]) => typeof v === "string");
check("A2", `the only values the pages pass are ATTENDANCE_RULES times (${RULE_TIMES.map(([k, v]) => `${k} ${v}`).join(", ")}), all valid, so both give the same minutes`,
  RULE_TIMES.every(([, v]) => A.toMinutes(v) !== null && A.toMinutes(v) === oldToMinutes(v))
    && ["pages/mark-attendance.js", "pages/admin-dashboard.js"].every((p) => [...src("js-preC", p).matchAll(/toMinutes\(([^)]*)\)/g)].map((m) => m[1]).filter((a) => a !== "hhmm").every((a) => /^(R|ATTENDANCE_RULES)\.(shiftStart|shiftEnd|halfSplit)$/.test(a))));
const BAD_TIMES = ["9:30", "24:00", "", "ab:cd", "09:60"];
check("A3", "where they would differ (never reached): invalid input gives null from the store, a number or NaN from the old page copy",
  j(BAD_TIMES.map((t) => [A.toMinutes(t), oldToMinutes(t)])) === j([[null, NaN], [null, 1440], [null, 0], [null, NaN], [null, 600]]), j(BAD_TIMES.map((t) => [t, A.toMinutes(t), oldToMinutes(t)])));
const nows = [];
for (const [h, m] of [[0, 0], [0, 1], [8, 59], [9, 30], [12, 0], [18, 29], [18, 30], [23, 59]]) { setNow(2026, 9, 30, h, m); nows.push([A.nowMinutes(), oldNowMinutes()]); }
setNow(2026, 9, 30, 11, 0);
check("A4", "nowMinutes (the store's) == admin's old nowMinutes at 8 clock times, midnight to 23:59", nows.every(([a, b]) => a === b), j(nows));

const day = (status, extra = {}) => ({ userId: "EMP-1042", date: "2026-09-30", status, checkIn: null, minutesWorked: null, ...extra });
const DAY_SETS = {
  empty: [],
  holiday: [day("holiday", { holiday: { name: "Gandhi Jayanti" } }), day("holiday", { holiday: { name: "Gandhi Jayanti" } })],
  weekend: [day("weekend"), day("weekend")],
  noData: [day("no-data"), day("no-data")],
  allLeave: [day("on-leave"), day("on-leave")],
  leaveAndInactive: [day("on-leave"), day("absent")],
  mixedHolidayWeekend: [day("weekend"), day("holiday", { holiday: { name: "Diwali" } })],
  mixedWeekendNoData: [day("no-data"), day("weekend")],
  working: [day("present"), day("late"), day("absent")],
};
const SUMMARIES = [{ present: 0, expected: 0 }, { present: 4, expected: 8 }, { present: 1, expected: 3 }, { present: 7, expected: 7 }, { present: 0, expected: 9 }];
const presentCases = SUMMARIES.flatMap((s) => Object.entries(DAY_SETS).map(([name, days]) => [s, name, days]));
check("A5", `presentNote(summary, days) == admin's old line on ${presentCases.length} (summary, days) cases`, presentCases.every(([s, , days]) => AV.presentNote(s, days) === oldAdminPresent(s, days)));
check("A6", "presentNote(summary, rows.map(r => r.day)) == team's old line on its rows ({ day, week, user })",
  presentCases.every(([s, , days]) => { const rows = days.map((dd) => ({ day: dd, week: [], user: undefined })); return AV.presentNote(s, rows.map((r) => r.day)) === oldTeamPresent(s, rows); }));
check("A7", "presentNote wording",
  j([[SUMMARIES[1], []], [SUMMARIES[2], []], [SUMMARIES[0], DAY_SETS.holiday], [SUMMARIES[0], DAY_SETS.weekend], [SUMMARIES[0], DAY_SETS.noData], [SUMMARIES[0], DAY_SETS.allLeave], [SUMMARIES[0], []]].map(([s, dd]) => AV.presentNote(s, dd)))
    === j(["50% of 8 expected", "33.3% of 3 expected", "Holiday: Gandhi Jayanti", "Weekend", "No attendance records for this date", "Everyone is on leave", "No active employees"]));

const CELL_DAYS = [
  day("present", { checkIn: "09:12", minutesWorked: 524 }), day("late", { checkIn: "10:24", mode: "wfh", minutesWorked: 300 }),
  day("present", { checkIn: "09:30", originalCheckIn: "10:24", minutesWorked: 480 }), day("present", { checkIn: "09:05", mode: "wfh", originalCheckIn: "09:50", minutesWorked: 60, inProgress: true }),
  day("present", { checkIn: "09:20", incomplete: true }), day("absent"), day("not-yet"), day("on-leave"), day("half-day", { checkIn: "14:10", minutesWorked: 0 }),
];
const html = (node) => node.outerHTML;
check("A8", `checkInCell == the old one on ${CELL_DAYS.length} days (none, WFH, corrected, both)`, CELL_DAYS.every((dd) => html(AV.checkInCell(dd)) === html(oldCheckInCell(dd))));
check("A9", `hoursCell == the old one on ${CELL_DAYS.length} days (hours, so far, no check-out, none, zero)`, CELL_DAYS.every((dd) => html(AV.hoursCell(dd)) === html(oldHoursCell(dd))));
check("A10", "cell markup", html(AV.checkInCell(CELL_DAYS[3])) === '<td><span>09:05</span> <span class="badge">WFH</span><span class="table__user-sub">was 09:50</span></td>'
  && html(AV.hoursCell(CELL_DAYS[3])) === '<td class="table__num"><span>1h 00m</span><span class="table__user-sub">so far</span></td>', html(AV.checkInCell(CELL_DAYS[3])) + html(AV.hoursCell(CELL_DAYS[3])));

const selects = () => { const a = d.createElement("select"), b = d.createElement("select"); a.innerHTML = b.innerHTML = '<option>Static</option><option value="x">Old</option>'; return [a, b]; };
const [s1, s2] = selects();
V.fillDepartmentSelect(s1); oldFillSelect(s2);
check("A11", `fillDepartmentSelect == the old fill (${s1.options.length} options, replacing static ones)`, s1.outerHTML === s2.outerHTML && s1.value === "" && s1.options[0].textContent === "All departments", s1.outerHTML.slice(0, 120));
S.addDepartment?.({ code: "QA", name: "Quality" });
const [s3, s4] = selects();
V.fillDepartmentSelect(s3); oldFillSelect(s4);
check("A12", "... and after a department is added to the store", s3.outerHTML === s4.outerHTML && s3.options.length === s1.options.length + (S.getAllDepartments().some((x) => x.code === "QA") ? 1 : 0));
fresh();

const USERS = S.getAllUsers();
const people = [...USERS.map((u) => [u.id, u]), ["EMP-9999", undefined], ["EMP-1042", { ...USERS.find((u) => u.id === "EMP-1042"), email: undefined }]];
check("A13", `personCell(userId, user, userId) == team's old cell for ${people.length} people (every user, an unknown id)`,
  people.every(([id, u]) => html(V.personCell(id, u, id)) === html(oldTeamPersonCell({ day: { userId: id }, user: u, week: [] }))));
check("A14", `personCell(userId, user, user?.email ?? "") == admin's old cell (every user, unknown id, no email)`,
  people.every(([id, u]) => html(V.personCell(id, u, u?.email ?? "")) === html(oldAdminPersonCell(u, { userId: id }))));
check("A15", "personCell(userId, getUser(userId), departmentName(...)) == leave-approvals' / regularization's old cell",
  [...USERS.map((u) => u.id), "EMP-9999"].every((id) => { const p = S.getUser(id); return html(V.personCell(id, p, V.departmentName(p?.department))) === html(oldRequestPersonCell({ userId: id })); }));
const cell = html(V.personCell("EMP-1003", S.getUser("EMP-1003"), "EMP-1003"));
check("A16", "personCell markup", /^<td><div class="table__user"><div class="avatar avatar--\d">PN<\/div><div><span class="table__user-name">Priya Nair<\/span><span class="table__user-sub">EMP-1003<\/span><\/div><\/div><\/td>$/.test(cell), cell);

// =====================================================================
section("B. The five pages, old code vs new code");
const iso = (y, mo, dd) => `${y}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
async function script(dir, page, who, clock, interact) {
  const [, y, mo, dd, h, mi] = clock;
  setNow(y, mo, dd, h, mi);
  const snaps = [];
  const snap = (what) => snaps.push({ what, html: d.documentElement.outerHTML, storage: storage() });
  await openPage(dir, page, who);
  snap("load");
  if (!interact) return snaps;
  const main = () => d.querySelector("main") ?? d.body;
  const fire = (node, type) => node.dispatchEvent(new w.Event(type, { bubbles: true }));
  [...main().querySelectorAll(".tabs__tab")].forEach((tab, i) => { tab.click(); snap(`tab ${i}`); });
  [...main().querySelectorAll("select")].forEach((sel, s) => [...sel.options].slice(0, 8).forEach((o, i) => { sel.value = o.value; fire(sel, "change"); snap(`select ${s}.${i}`); }));
  [...main().querySelectorAll('input[type="date"]')].forEach((input) => [iso(y, mo, dd - 1 || 1), "2026-09-26", "2026-10-02", "2026-09-01", "2026-09-28"].forEach((v) => { input.value = v; fire(input, "change"); fire(input, "input"); snap(`date ${v}`); }));
  [...main().querySelectorAll('input[type="search"], .input--search')].forEach((input, s) => ["ar", "zzz", ""].forEach((v) => { input.value = v; fire(input, "input"); snap(`search ${s} "${v}"`); }));
  const byText = (t) => [...main().querySelectorAll("button")].filter((b) => b.textContent.trim() === t && !b.disabled);
  for (const t of ["Next", "Previous", "Next"]) { const b = byText(t)[0]; if (b) { b.click(); snap(`button ${t}`); } }
  for (const id of ["check-in-btn", "check-out-btn"]) { const b = d.getElementById(id); if (b && !b.disabled) { b.click(); snap(`#${id}`); } }
  const approve = [...main().querySelectorAll("button[data-permission]")].find((b) => b.textContent.trim() === "Approve" && !b.closest("[data-static]"));
  if (approve) { approve.click(); snap("approve"); }
  return snaps;
}
let n = 0, totalSnaps = 0;
for (const page of Object.keys(PAGES)) {
  const staticHtml = new JSDOM(read(PAGES[page][0])).window.document.querySelector("main")?.innerHTML;
  let snaps = 0, rendered = 0;
  // The page comparison runs on Round C's committed result (js-postC, frozen at d68ddb1), so later rounds' intended
  // changes to these pages don't disturb it; the per-page suites test the live code.
  const differ = [];
  for (const clock of CLOCKS) {
    const interact = clock[0] === "Wed 30 Sep 11:00" || clock[0] === "Fri 1 Jan 2027 10:00";
    for (const who of Object.keys(WHO)) {
      const neu = await script("js-postC", page, who, clock, interact);
      const neuMain = d.querySelector("main")?.innerHTML;
      const old = await script("js-preC", page, who, clock, interact);
      snaps += neu.length;
      if (neuMain !== staticHtml) rendered++;
      neu.forEach((s, i) => { const o = old[i]; if (!o || o.what !== s.what || o.html !== s.html || o.storage !== s.storage) differ.push(`${clock[0]}/${who}/${s.what}`); });
      if (old.length !== neu.length) differ.push(`${clock[0]}/${who}: ${neu.length} vs ${old.length} steps`);
    }
  }
  totalSnaps += snaps;
  check(`B${++n}`, `${PAGES[page][0]}: ${snaps} snapshots (5 people x 6 clocks, interactions at 2 clocks) identical; the script changed the page in ${rendered} runs`,
    differ.length === 0 && rendered > 0, differ.length ? `${differ.length} differ, first ${j(differ.slice(0, 3))}` : "");
}
check("B6", "no JS errors on either tree (new, old)", jsErrors.js.length === 0 && jsErrors["js-postC"].length === 0 && jsErrors["js-preC"].length === 0, `${j([...jsErrors.js, ...jsErrors["js-postC"]].slice(0, 3))} / ${j(jsErrors["js-preC"].slice(0, 3))}`);

// =====================================================================
section("C. Source layout");
const code = (s) => s.split(/\r?\n/).filter((l) => !l.trim().startsWith("//")).join("\n");
const CALLERS = Object.values(PAGES).map(([, s]) => [s, src("js", `pages/${s}.js`)]);
const defines = (s, name) => new RegExp(`(const|let|function)\\s+${name}\\b`).test(s);
const NAMES = ["offNote", "personCell", "checkInCell", "hoursCell", "toMinutes", "nowMinutes"];
check("C1", `no page defines its own ${NAMES.join(", ")}`, CALLERS.every(([, s]) => NAMES.every((x) => !defines(s, x))),
  CALLERS.flatMap(([p, s]) => NAMES.filter((x) => defines(s, x)).map((x) => `${p}:${x}`)).join(" "));
const ALL = [...fs.readdirSync(new URL("./js/pages/", import.meta.url)).map((f) => `pages/${f}`), ...fs.readdirSync(new URL("./js/ui/", import.meta.url)).map((f) => `ui/${f}`)];
const where = (re) => ALL.filter((p) => re.test(code(src("js", p))));
// Round C left users-list.js as it was: its committed result (js-postC) vs the code before it. (Round 5C
// later changed users-list.js's reset button, so the live file no longer equals js-preC.)
check("C2", "\"All departments\" option lists are built in ui/leave-view.js and users-list.js's own fillSelect (left as it was)",
  j(where(/"All departments"/)) === j(["pages/users-list.js", "ui/leave-view.js"]) && src("js-postC", "pages/users-list.js") === src("js-preC", "pages/users-list.js"), j(where(/"All departments"/)));
// The two-line person cell (name span + sub-line). approvals-inbox and hr-dashboard build a different, one-line
// cell (avatar + one title span, no sub-line) and users-list links the name, so they don't match this shape.
const PERSON_CELL = /el\("span", "table__user-name", [^;]*"table__user-sub"/;
check("C3", "the two-line person cell (name + sub-line) is built only in ui/leave-view.js", j(where(PERSON_CELL)) === j(["ui/leave-view.js"]), j(where(PERSON_CELL)));
// Round C's own change to the store: its committed result (js-postC) vs the code before it.
const storeNew = src("js-postC", "data/attendance-store.js").replace(/\r/g, ""), storeOld = src("js-preC", "data/attendance-store.js").replace(/\r/g, "");
check("C4", "data/attendance-store.js only gained `export` on toMinutes and nowMinutes (and a comment line); its own calls are untouched",
  storeNew.replace("export function toMinutes(", "function toMinutes(").replace("// Minutes since local midnight, now.\nexport function nowMinutes(", "function nowMinutes(") === storeOld);
const exportsOf = async (dir, p) => Object.keys(await import(`./${dir}/${p}`)).sort();
const kept = [];
for (const p of ["ui/leave-view.js", "ui/attendance-view.js", "data/attendance-store.js"]) {
  const before = await exportsOf("js-preC", p), after = await exportsOf("js", p);
  kept.push(`${p}: ${before.every((x) => after.includes(x)) ? "all kept" : "MISSING " + before.filter((x) => !after.includes(x))} +[${after.filter((x) => !before.includes(x))}]`);
}
check("C5", "every old export is still exported; the round's new ones are all there (later rounds may add more)", kept.every((k) => k.includes("all kept"))
  && [["fillDepartmentSelect", "personCell"], ["checkInCell", "hoursCell", "presentNote"], ["nowMinutes", "toMinutes"]].every((names, i) => names.every((x) => kept[i].split("+")[1].slice(1, -1).split(",").includes(x))), kept.join(" | "));
check("C6", "no innerHTML / outerHTML / insertAdjacentHTML / document.write in the changed shared modules (comments aside)",
  ["ui/leave-view.js", "ui/attendance-view.js", "data/attendance-store.js"].every((p) => !/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(code(src("js", p)))));

console.log(`\n${totalSnaps} page snapshots compared in all`);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
