// usage: node shared.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Cleanup Round B: the shared formatting helpers (ui/leave-view.js: shortDate, whenText, plural, percent;
// data/holidays.js: addDays; ui/stats.js: setStatValue, setStatNote, setOptionalStatNote; ui/chart.js:
// chartColumns, barRow), checked against the code they replace. ./js is the new code, ./js-preB the code
// before this round.
//   A  the helpers on their own, against verbatim copies of the old inline versions
//   B  the ten pages that used them, old code vs new code: the whole document, storage and JS errors after
//      loading as five people at six clock times, then the same generic clicks, selects, dates and searches
//   C  source layout: no page keeps its own copy; every old export is still there
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const PAGES = {
  mark: ["attendance/mark-attendance.html", "mark-attendance"],
  my: ["attendance/my-attendance.html", "my-attendance"],
  team: ["attendance/team-attendance.html", "team-attendance"],
  employee: ["dashboard/employee.html", "employee-dashboard"],
  hr: ["dashboard/hr.html", "hr-dashboard"],
  admin: ["dashboard/admin.html", "admin-dashboard"],
  leave: ["leave/leave-approvals.html", "leave-approvals"],
  departments: ["users/departments.html", "departments"],
  inbox: ["requests/approvals-inbox.html", "approvals-inbox"],
  profile: ["users/user-profile.html", "user-profile"],
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
// [label, y, mo, d, h, mi]: a working day before, during and after the shift, a weekend, a holiday, a new year.
const CLOCKS = [
  ["Wed 30 Sep 08:00", 2026, 9, 30, 8, 0], ["Wed 30 Sep 11:00", 2026, 9, 30, 11, 0], ["Wed 30 Sep 19:00", 2026, 9, 30, 19, 0],
  ["Fri 2 Oct 11:00", 2026, 10, 2, 11, 0], ["Sat 3 Oct 11:00", 2026, 10, 3, 11, 0], ["Fri 1 Jan 2027 10:00", 2027, 1, 1, 10, 0],
];

let loads = 0, w = null, d = null;
const jsErrors = { js: [], "js-postB": [], "js-preB": [] };
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
async function openPage(dir, page, who, query = "") {
  const [path, script] = PAGES[page];
  fresh(read(path), `http://localhost/office-os/pages/${path}${query}`, jsErrors[dir], `${dir}/${page}/${who}`);
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
const H = await import("./js/data/holidays.js");
const ST = await import("./js/ui/stats.js");
const CH = await import("./js/ui/chart.js");
const OV = await import("./js-preB/ui/leave-view.js");
const OH = await import("./js-preB/data/holidays.js");

// ---------- the old inline versions, verbatim from the pages before this round ----------
// mark-attendance, my-attendance, team-attendance, employee-, hr-, admin-dashboard
const oldShortDate = (iso) => `${OV.weekdayName(iso).slice(0, 3)}, ${OV.formatDay(iso)}`;
// employee-, hr-, admin-dashboard
const oldAddDays = (iso, n) => OH.isoFromDayNumber(OH.dayNumber(iso) + n);
// employee- and hr-dashboard; today was the page's module constant (todayIso() at load)
const oldWhenText = (today) => function whenText(iso) {
  if (iso === today) return "Today";
  if (iso === oldAddDays(today, -1)) return "Yesterday";
  return OV.formatDay(iso, iso.slice(0, 4) !== today.slice(0, 4));
};
// departments, my-attendance, team-attendance, employee-, hr-dashboard
const oldPlural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// user-profile tenureText()
const oldProfilePlural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
// team-attendance, hr-, admin-dashboard
const oldPercent = (part, whole) => `${Math.round((part / whole) * 1000) / 10}%`;

// =====================================================================
section("A. Helpers on their own");
const days = (from, n) => Array.from({ length: n }, (_, i) => OH.isoFromDayNumber(OH.dayNumber(from) + i));
const DATES = [...days("2025-12-01", 1200), "2024-02-29", "1999-12-31", "2000-01-01"];
const BAD = ["", "2026-02-30", "not a date", undefined, null];
check("A1", `shortDate == old inline shortDate on ${DATES.length} dates (Dec 2025 - Mar 2029, leap days) and ${BAD.length} bad inputs`,
  [...DATES, ...BAD].every((iso) => V.shortDate(iso) === oldShortDate(iso)), j([...DATES, ...BAD].filter((iso) => V.shortDate(iso) !== oldShortDate(iso)).slice(0, 3)));
check("A2", "shortDate wording", j(["2026-09-28", "2026-10-04", "2027-01-01"].map(V.shortDate)) === j(["Mon, 28 Sep", "Sun, 4 Oct", "Fri, 1 Jan"]));

const SHIFTS = [-400, -366, -365, -31, -30, -7, -2, -1, 0, 1, 2, 30, 365, 366, 400];
const addPairs = [...DATES.filter((_, i) => i % 7 === 0), ...BAD].flatMap((iso) => SHIFTS.map((n) => [iso, n]));
check("A3", `addDays == old inline addDays on ${addPairs.length} (date, n) pairs, bad dates included`,
  addPairs.every(([iso, n]) => H.addDays(iso, n) === oldAddDays(iso, n)), j(addPairs.filter(([iso, n]) => H.addDays(iso, n) !== oldAddDays(iso, n)).slice(0, 3)));
check("A4", "addDays across month, year and leap-day edges",
  j([["2026-09-30", 1], ["2026-12-31", 1], ["2028-02-28", 1], ["2028-03-01", -1], ["2027-01-01", -1]].map(([iso, n]) => H.addDays(iso, n)))
    === j(["2026-10-01", "2027-01-01", "2028-02-29", "2028-02-29", "2026-12-31"]));

const TODAYS = ["2026-09-30", "2026-01-01", "2027-01-01", "2028-03-01", "2026-12-31"];
const whenPairs = TODAYS.flatMap((today) => [...SHIFTS.map((n) => OH.isoFromDayNumber(OH.dayNumber(today) + n)), "2025-01-20"].map((iso) => [iso, today]));
check("A5", `whenText(iso, today) == the old page whenText with that today, ${whenPairs.length} pairs over 5 todays`,
  whenPairs.every(([iso, today]) => V.whenText(iso, today) === oldWhenText(today)(iso)), j(whenPairs.filter(([iso, today]) => V.whenText(iso, today) !== oldWhenText(today)(iso)).slice(0, 3)));
check("A6", "whenText wording: Today, Yesterday, same year, other year, across New Year",
  j([["2026-09-30", "2026-09-30"], ["2026-09-29", "2026-09-30"], ["2026-09-28", "2026-09-30"], ["2025-01-20", "2026-09-30"], ["2026-12-31", "2027-01-01"], ["2026-12-30", "2027-01-01"]].map(([a, b]) => V.whenText(a, b)))
    === j(["Today", "Yesterday", "28 Sep", "20 Jan 2025", "Yesterday", "30 Dec 2026"]));

const NS = [0, 1, 2, 3, 0.5, 1.5, -1, 10, 100];
const WORDS = [["day", "days"], ["person", "people"], ["late mark", "late marks"], ["half day", "half days"], ["working day", "working days"], ["employee", "employees"], ["request", "requests"], ["correction", "corrections"]];
check("A7", `plural == old plural for ${NS.length * WORDS.length} (n, one, many)`, NS.every((n) => WORDS.every(([o, m]) => V.plural(n, o, m) === oldPlural(n, o, m))));
check("A8", "user-profile: plural(n, word, word + \"s\") == its old plural(n, word) for 0-40 years and months",
  Array.from({ length: 41 }, (_, n) => n).every((n) => ["year", "month"].every((wd) => V.plural(n, wd, `${wd}s`) === oldProfilePlural(n, wd))));
const PCT = [];
for (let whole = 0; whole <= 25; whole++) for (let part = 0; part <= whole + 1; part++) PCT.push([part, whole]);
check("A9", `percent == old percent for ${PCT.length} (part, whole), whole 0 included`, PCT.every(([p, wh]) => V.percent(p, wh) === oldPercent(p, wh)));
check("A10", "percent wording: \"50%\", \"12.5%\", \"33.3%\", \"66.7%\", \"100%\"", j([[1, 2], [1, 8], [1, 3], [2, 3], [4, 4]].map(([a, b]) => V.percent(a, b))) === j(["50%", "12.5%", "33.3%", "66.7%", "100%"]));

// ---------- stat cards: each page's old setStat body vs its new body, on the same card ----------
const OLD_STAT = {
  // team-attendance
  team: (stat, value, note, tone = "") => {
    stat.querySelector(".stat__value").textContent = String(value);
    const delta = stat.querySelector(".stat__delta");
    delta.className = `stat__delta${tone ? ` stat__delta--${tone}` : ""}`;
    delta.textContent = note;
  },
  // employee- and hr-dashboard
  dash: (stat, value, note, tone = "") => {
    stat.querySelector(".stat__value").textContent = value;
    const delta = stat.querySelector(".stat__delta");
    delta.className = `stat__delta${tone ? ` stat__delta--${tone}` : ""}`;
    delta.textContent = note;
  },
  // admin-dashboard
  admin: (stat, value, note) => {
    stat.querySelector(".stat__value").textContent = value;
    const delta = stat.querySelector(".stat__delta");
    delta.className = "stat__delta";
    delta.textContent = note;
  },
  // my-attendance
  my: (stat, value, note) => {
    stat.querySelector(".stat__value").textContent = value;
    const delta = stat.querySelector(".stat__delta");
    delta.className = "stat__delta";
    delta.textContent = note;
    delta.hidden = !note;
  },
  // leave-approvals (el from ui/leave-view.js)
  leave: (stat, value, note) => {
    stat.querySelector(".stat__value").textContent = value;
    let delta = stat.querySelector(".stat__delta");
    if (!note) {
      delta?.remove();
      return;
    }
    if (!delta) {
      delta = OV.el("span", "stat__delta");
      stat.querySelector(".stat__value").after(delta);
    }
    delta.textContent = note;
  },
  // departments (its own el(), the same as ui/leave-view.js's)
  departments: (stat, value, note) => {
    stat.querySelector(".stat__value").textContent = value;
    let delta = stat.querySelector(".stat__delta");
    if (!note) {
      delta?.remove();
      return;
    }
    if (!delta) {
      delta = OV.el("span", "stat__delta");
      stat.querySelector(".stat__value").after(delta);
    }
    delta.className = "stat__delta";
    delta.textContent = note;
  },
  // approvals-inbox
  inbox: (stat, value) => {
    stat.querySelector(".stat__value").textContent = value;
    stat.querySelector(".stat__delta")?.remove();
  },
};
// The new bodies, as the pages now have them (after each page's own lookup).
const NEW_STAT = {
  team: (stat, value, note, tone = "") => { ST.setStatValue(stat, String(value)); ST.setStatNote(stat, note, tone); },
  dash: (stat, value, note, tone = "") => { ST.setStatValue(stat, value); ST.setStatNote(stat, note, tone); },
  admin: (stat, value, note) => { ST.setStatValue(stat, value); ST.setStatNote(stat, note); },
  my: (stat, value, note) => { ST.setStatValue(stat, value); ST.setStatNote(stat, note).hidden = !note; },
  leave: (stat, value, note) => { ST.setStatValue(stat, value); ST.setOptionalStatNote(stat, note); },
  departments: (stat, value, note) => { ST.setStatValue(stat, value); ST.setOptionalStatNote(stat, note); },
  inbox: (stat, value) => { ST.setStatValue(stat, value); ST.setOptionalStatNote(stat, ""); },
};
const CARDS = {
  none: "",
  plain: '<span class="stat__delta">Old note</span>',
  empty: '<span class="stat__delta"></span>',
  toned: '<span class="stat__delta stat__delta--up">Old note</span>',
  hidden: '<span class="stat__delta" hidden="">Old note</span>',
  extra: '<span class="stat__delta" data-static-count="1" data-static-text="1 asset">1 leave, 1 asset</span>',
};
const card = (inner) => { const div = d.createElement("div"); div.innerHTML = `<div class="stat"><span class="stat__label">L</span><span class="stat__value">0</span>${inner}</div>`; return div.firstElementChild; };
// value, note, tone: a note, no note, a toned note, a number, back to a note
const STEPS = [["5", "Five", ""], ["6", "", "down"], ["7", "Seven", "down"], [8, "Eight", "up"], ["–", "", ""], ["9", "Nine", ""]];
function runCard(fn, inner) {
  const stat = card(inner);
  return STEPS.map(([v, n, t]) => { try { fn(stat, v, n, t); return stat.outerHTML; } catch (e) { return `throws ${e.constructor.name}`; } });
}
const statDiffs = [];
for (const shape of Object.keys(OLD_STAT)) {
  for (const [name, inner] of Object.entries(CARDS)) {
    const a = runCard(OLD_STAT[shape], inner), b = runCard(NEW_STAT[shape], inner);
    if (j(a) !== j(b)) statDiffs.push(`${shape}/${name}`);
  }
}
check("A11", `stat cards: new body == old body for ${Object.keys(OLD_STAT).length} page shapes x ${Object.keys(CARDS).length} cards x ${STEPS.length} steps (note, no note, tone, number), except the one noted in A12`,
  j(statDiffs) === j(["leave/toned"]), j(statDiffs));
check("A12", "the one difference, leave-approvals on a card whose line already has a tone class, can't happen: leave-approvals.html has no .stat__delta, and the page only makes plain ones",
  !/stat__delta/.test(read("leave/leave-approvals.html")) && !/stat__delta--/.test(src("js-preB", "pages/leave-approvals.js")));
const shown = (() => { const s = card(CARDS.plain); ST.setStatValue(s, "3"); ST.setStatNote(s, "Late", "down"); return s.outerHTML; })();
check("A13", "setStatValue + setStatNote markup", shown === '<div class="stat"><span class="stat__label">L</span><span class="stat__value">3</span><span class="stat__delta stat__delta--down">Late</span></div>', shown);
const opt = card(CARDS.none);
const optSteps = [];
ST.setOptionalStatNote(opt, "Added"); optSteps.push(opt.innerHTML);
ST.setOptionalStatNote(opt, ""); optSteps.push(opt.innerHTML);
ST.setOptionalStatNote(opt, "Again"); optSteps.push(opt.innerHTML);
check("A14", "setOptionalStatNote: adds the line after the number, removes it on \"\", adds it back",
  j(optSteps) === j(['<span class="stat__label">L</span><span class="stat__value">0</span><span class="stat__delta">Added</span>', '<span class="stat__label">L</span><span class="stat__value">0</span>', '<span class="stat__label">L</span><span class="stat__value">0</span><span class="stat__delta">Again</span>']), j(optSteps));

// ---------- charts: each page's old column loop vs chartColumns with the page's new look ----------
const outer = (nodes) => nodes.map((n) => n.outerHTML).join("");
// employee-dashboard, verbatim (barLook returned [modifier, height, what])
const MARKER = 6;
const isOff = (day) => day.status === "weekend" || day.status === "holiday";
function oldBarLook(day) {
  if (isOff(day)) return ["chart__bar--muted", 0, day.holiday && day.status === "holiday" ? `${day.holiday.name}, day off` : "day off"];
  if (day.status === "no-data") return ["chart__bar--muted", 0, "no data"];
  if (day.status === "on-leave") return ["chart__bar--leave", MARKER, "on leave"];
  if (day.minutesWorked !== null) {
    const hours = (day.minutesWorked / 60).toFixed(1);
    const height = Math.min(100, Math.round(day.minutesWorked / 6));   // 10 hours = the top of the chart
    if (day.inProgress) return ["chart__bar--progress", height, `${hours} hours so far`];
    const note = { late: ", late", "half-day": ", half day", absent: ", under 4 hours (absent)" }[day.status] ?? "";
    return ["", height, `${hours} hours${note}`];
  }
  if (day.incomplete) return ["chart__bar--incomplete", MARKER, `checked in at ${day.checkIn}, no check-out`];
  if (day.status === "absent") return ["chart__bar--absent", MARKER, "absent"];
  return ["", 0, day.overdue ? "not checked in yet (overdue)" : "not in yet"];   // not-yet: today
}
const oldEmployeeCols = (list) => list.map((day) => {
  const el = OV.el;
  const [modifier, height, what] = oldBarLook(day);
  const bar = el("span", `chart__bar${modifier ? ` ${modifier}` : ""}`);
  bar.style.setProperty("--h", String(height));
  bar.title = `${oldShortDate(day.date)}: ${what}`;
  const track = el("div", "chart__track");
  track.append(bar);
  const col = el("div", "chart__col");
  col.append(track, el("span", "chart__label", String(OV.dayOfMonth(day.date))));
  return col;
});
// The same branches as the page's barLook, returning { modifier, height, what } (the new page code).
const newBarLook = (day) => { const [modifier, height, what] = oldBarLook(day); return { modifier, height, what }; };
const EMP_DAYS = [
  { date: "2026-09-19", status: "weekend" }, { date: "2026-10-02", status: "holiday", holiday: { name: "Gandhi Jayanti" } },
  { date: "2026-09-01", status: "no-data" }, { date: "2026-09-21", status: "on-leave", minutesWorked: null },
  { date: "2026-09-22", status: "present", minutesWorked: 524 }, { date: "2026-09-23", status: "late", minutesWorked: 700 },
  { date: "2026-09-24", status: "half-day", minutesWorked: 250 }, { date: "2026-09-25", status: "absent", minutesWorked: 100 },
  { date: "2026-09-28", status: "present", minutesWorked: 90, inProgress: true }, { date: "2026-09-29", status: "present", minutesWorked: null, incomplete: true, checkIn: "09:10" },
  { date: "2026-09-30", status: "absent", minutesWorked: null }, { date: "2026-10-01", status: "not-yet", minutesWorked: null, overdue: true },
  { date: "2026-10-05", status: "not-yet", minutesWorked: null }, { date: "2026-10-06", status: "present", minutesWorked: 0 },
];
check("A15", `employee chart: chartColumns(days, look) == the old loop for ${EMP_DAYS.length} days covering every bar kind`,
  outer(CH.chartColumns(EMP_DAYS, newBarLook)) === outer(oldEmployeeCols(EMP_DAYS)));
// hr-dashboard, verbatim
const oldHrCols = (list, top) => list.map((day) => {
  const el = OV.el;
  const bar = el("span", `chart__bar${day.off ? " chart__bar--muted" : ""}`);
  bar.style.setProperty("--h", String(Math.round((day.count / top) * 100)));
  bar.title = `${oldShortDate(day.date)}: ${oldPlural(day.count, "request", "requests")}`;
  const track = el("div", "chart__track");
  track.append(bar);
  const col = el("div", "chart__col");
  col.append(track, el("span", "chart__label", String(OV.dayOfMonth(day.date))));
  return col;
});
const HR_DAYS = days("2026-09-17", 14).map((date, i) => ({ date, count: [0, 1, 2, 5, 7, 0, 3][i % 7], off: i % 7 >= 5 }));
const hrLook = (top) => (day) => ({ modifier: day.off ? "chart__bar--muted" : "", height: Math.round((day.count / top) * 100), what: V.plural(day.count, "request", "requests") });
check("A16", "hr chart: chartColumns == the old loop (tops 5 and 7, days off, 0 / 1 / many requests)",
  [5, 7].every((top) => outer(CH.chartColumns(HR_DAYS, hrLook(top))) === outer(oldHrCols(HR_DAYS, top))));
// admin-dashboard, verbatim
const oldAdminCols = (range, today, todayOpen) => range.map((s) => {
  const el = OV.el;
  const partial = s.date === today && todayOpen;
  let modifier = "";
  let height = 0;
  let what;
  if (!s.expected) {
    modifier = " chart__bar--muted";
    what = s.off ? "day off" : "nobody expected";
  } else {
    height = Math.round((s.present / s.expected) * 100);
    if (partial) modifier = " chart__bar--progress";
    what = `${height}%${partial ? " so far" : ""} (${s.present} of ${s.expected} expected)`;
  }
  const bar = el("span", `chart__bar${modifier}`);
  bar.style.setProperty("--h", String(height));
  bar.title = `${oldShortDate(s.date)}: ${what}`;
  const track = el("div", "chart__track");
  track.append(bar);
  const col = el("div", "chart__col");
  col.append(track, el("span", "chart__label", String(OV.dayOfMonth(s.date))));
  return col;
});
const adminLook = (today, todayOpen) => (s) => {
  if (!s.expected) return { modifier: "chart__bar--muted", height: 0, what: s.off ? "day off" : "nobody expected" };
  const partial = s.date === today && todayOpen;
  const height = Math.round((s.present / s.expected) * 100);
  return { modifier: partial ? "chart__bar--progress" : "", height, what: `${height}%${partial ? " so far" : ""} (${s.present} of ${s.expected} expected)` };
};
const AD_DAYS = days("2026-09-17", 14).map((date, i) => ({ date, expected: [8, 8, 0, 0, 9, 7, 8][i % 7], present: [8, 6, 0, 0, 4, 7, 0][i % 7], off: i % 7 === 2 }));
check("A17", "admin chart: chartColumns == the old loop (today open and closed, nobody expected, day off, 0% and 100%)",
  [true, false].every((open) => outer(CH.chartColumns(AD_DAYS, adminLook("2026-09-30", open))) === outer(oldAdminCols(AD_DAYS, "2026-09-30", open))));
const col = CH.chartColumns([{ date: "2026-09-28" }], () => ({ modifier: "chart__bar--leave", height: 6, what: "on leave" }))[0].outerHTML;
check("A18", "chartColumns markup: col > track > bar (class, --h, title) + label", col === '<div class="chart__col"><div class="chart__track"><span class="chart__bar chart__bar--leave" style="--h: 6;" title="Mon, 28 Sep: on leave"></span></div><span class="chart__label">28</span></div>', col);

// ---------- bar rows: the four old builders vs barRow ----------
const oldBarRow = (label, value, width) => {   // every copy: employee (balance), admin (headcount), team (departments), my-attendance (summary)
  const el = OV.el;
  const bar = el("div", "bar-row");
  const track = el("div", "bar-row__track");
  const fill = el("span", "bar-row__fill");
  fill.style.setProperty("--w", width);
  track.append(fill);
  bar.append(el("span", "", label), track, el("span", "bar-row__value", value));
  return bar;
};
const ROWS = [
  ["employee", "Casual", String(6), `${60}%`, 60], ["employee", "WFH", String(0), `${0}%`, 0],
  ["admin", "Engineering", String(4), `${Math.round((4 / 4) * 100)}%`, Math.round((4 / 4) * 100)], ["admin", "Customer Support", String(0), `${Math.round((0 / 4) * 100)}%`, 0],
  ["team", "Finance", `${75}%`, `${75 ?? 0}%`, 75], ["team", "Sales", "–", `${null ?? 0}%`, null ?? 0],
  ["my", "On time", String(12), `${Math.round((12 / 17) * 100)}%`, Math.round((12 / 17) * 100)], ["my", "Absent", String(0), `${0}%`, 0],
];
check("A19", `barRow(label, value, percent) == the old hand-built rows (${ROWS.length} rows from the four pages' value and width formulas)`,
  ROWS.every(([, label, value, oldWidth, pct]) => CH.barRow(label, value, pct).outerHTML === oldBarRow(label, value, oldWidth).outerHTML));
const row = CH.barRow("Sales", "–", 0).outerHTML;
check("A20", "barRow markup", row === '<div class="bar-row"><span>Sales</span><div class="bar-row__track"><span class="bar-row__fill" style="--w: 0%;"></span></div><span class="bar-row__value">–</span></div>', row);

// =====================================================================
section("B. The ten pages, old code vs new code");
// Load, snapshot; then generic interactions, each followed by a snapshot. The same steps run on both trees.
const iso = (y, mo, dd) => `${y}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
async function script(dir, page, who, clock, interact, query) {
  const [, y, mo, dd, h, mi] = clock;
  setNow(y, mo, dd, h, mi);
  const snaps = [];
  const snap = (what) => snaps.push({ what, html: d.documentElement.outerHTML, storage: storage() });
  await openPage(dir, page, who, query);
  snap("load");
  if (!interact) return snaps;
  const main = () => d.querySelector("main") ?? d.body;
  const fire = (node, type) => node.dispatchEvent(new w.Event(type, { bubbles: true }));
  [...main().querySelectorAll(".tabs__tab")].forEach((tab, i) => { tab.click(); snap(`tab ${i}`); });
  [...main().querySelectorAll("select")].forEach((sel, s) => [...sel.options].slice(0, 6).forEach((o, i) => { sel.value = o.value; fire(sel, "change"); snap(`select ${s}.${i}`); }));
  [...main().querySelectorAll('input[type="date"]')].forEach((input) => [iso(y, mo, dd - 1 || 1), "2026-09-26", "2026-10-02", "2026-09-01"].forEach((v) => { input.value = v; fire(input, "change"); fire(input, "input"); snap(`date ${v}`); }));
  [...main().querySelectorAll('input[type="search"], .input--search')].forEach((input, s) => ["ar", "zzz", ""].forEach((v) => { input.value = v; fire(input, "input"); snap(`search ${s} "${v}"`); }));
  const byText = (t) => [...main().querySelectorAll("button")].filter((b) => b.textContent.trim() === t && !b.disabled);
  for (const t of ["Next", "Previous", "Check in", "Check out"]) { const b = byText(t)[0]; if (b) { b.click(); snap(`button ${t}`); } }
  for (const id of ["check-in-btn", "check-out-btn"]) { const b = d.getElementById(id); if (b && !b.disabled) { b.click(); snap(`#${id}`); } }
  const approve = [...main().querySelectorAll("button[data-permission]")].find((b) => b.textContent.trim() === "Approve" && !b.closest("[data-static]"));
  if (approve) { approve.click(); snap("approve"); }
  return snaps;
}
const QUERIES = { profile: ["", "?id=EMP-1105", "?id=EMP-1003", "?id=EMP-9999"] };
let n = 0, totalSnaps = 0;
for (const page of Object.keys(PAGES)) {
  // The page comparison runs on Round B's committed result (js-postB, frozen at 8d39933), so later rounds' intended
  // changes to these pages don't disturb it; the per-page suites test the live code.
  const staticHtml = new JSDOM(read(PAGES[page][0])).window.document.querySelector("main")?.innerHTML;
  let snaps = 0, rendered = 0;
  const differ = [];
  for (const clock of CLOCKS) {
    const interact = clock[0] === "Wed 30 Sep 11:00" || clock[0] === "Fri 1 Jan 2027 10:00";
    for (const who of Object.keys(WHO)) {
      for (const query of QUERIES[page] ?? [""]) {
        const neu = await script("js-postB", page, who, clock, interact, query);
        const neuMain = d.querySelector("main")?.innerHTML;
        const old = await script("js-preB", page, who, clock, interact, query);
        snaps += neu.length;
        if (neuMain !== staticHtml) rendered++;
        neu.forEach((s, i) => { const o = old[i]; if (!o || o.what !== s.what || o.html !== s.html || o.storage !== s.storage) differ.push(`${clock[0]}/${who}${query}/${s.what}`); });
        if (old.length !== neu.length) differ.push(`${clock[0]}/${who}${query}: ${neu.length} vs ${old.length} steps`);
      }
    }
  }
  totalSnaps += snaps;
  check(`B${++n}`, `${PAGES[page][0]}: ${snaps} snapshots (5 people x 6 clocks${QUERIES[page] ? ` x ${QUERIES[page].length} ids` : ""}, interactions at 2 clocks) identical; the script changed the page in ${rendered} runs`,
    differ.length === 0 && rendered > 0, differ.length ? `${differ.length} differ, first ${j(differ.slice(0, 3))}` : "");
}
check("B11", "no JS errors on either tree (new, old)", jsErrors.js.length === 0 && jsErrors["js-postB"].length === 0 && jsErrors["js-preB"].length === 0, `${j([...jsErrors.js, ...jsErrors["js-postB"]].slice(0, 3))} / ${j(jsErrors["js-preB"].slice(0, 3))}`);

// =====================================================================
section("C. Source layout");
const CALLERS = ["mark-attendance", "my-attendance", "team-attendance", "employee-dashboard", "hr-dashboard", "admin-dashboard", "leave-approvals", "departments", "approvals-inbox", "user-profile"];
const PAGE_SRC = CALLERS.map((p) => [p, src("js", `pages/${p}.js`)]);
const code = (s) => s.split(/\r?\n/).filter((l) => !l.trim().startsWith("//")).join("\n");
const defines = (s, name) => new RegExp(`(const|let|function)\\s+${name}\\b`).test(s);
const keeps = (name) => PAGE_SRC.filter(([, s]) => defines(s, name)).map(([p]) => p);
check("C1", "no page defines its own shortDate, whenText, addDays, plural or percent",
  ["shortDate", "whenText", "addDays", "plural", "percent"].every((name) => !keeps(name).length), ["shortDate", "whenText", "addDays", "plural", "percent"].map((x) => `${x}:${keeps(x)}`).join(" "));
const ALL_JS = fs.readdirSync(new URL("./js/pages/", import.meta.url)).map((f) => [`pages/${f}`, src("js", `pages/${f}`)]);
const holders = (re) => [...ALL_JS, ...["ui/leave-view.js", "ui/chart.js", "ui/stats.js", "ui/attendance-view.js"].map((p) => [p, src("js", p)])].filter(([, s]) => re.test(code(s))).map(([p]) => p);
check("C2", "chart columns and bar rows are built only in ui/chart.js (\"chart__col\", \"bar-row__fill\")",
  j(holders(/chart__col|bar-row__fill/)) === j(["ui/chart.js"]), j(holders(/chart__col|bar-row__fill/)));
check("C3", "the eight stat-card pages no longer touch .stat__value / .stat__delta text or classes themselves",
  ["team-attendance", "employee-dashboard", "hr-dashboard", "admin-dashboard", "leave-approvals", "departments", "approvals-inbox", "my-attendance"]
    .every((p) => !/\.stat__value"\)\.textContent|delta\.className|delta\.textContent|"stat__delta"/.test(code(src("js", `pages/${p}.js`)))));
const exportsOf = async (dir, p) => Object.keys(await import(`./${dir}/${p}`)).sort();
const kept = [];
for (const p of ["ui/leave-view.js", "data/holidays.js", "ui/leave-decision.js", "ui/attendance-view.js"]) {
  const before = await exportsOf("js-preB", p), after = await exportsOf("js", p);
  kept.push(`${p}: ${before.every((x) => after.includes(x)) ? "all kept" : "MISSING " + before.filter((x) => !after.includes(x))} +[${after.filter((x) => !before.includes(x))}]`);
}
check("C4", "every old export of the changed modules is still exported (new ones listed)", kept.every((k) => k.includes("all kept")), kept.join(" | "));
check("C5", "ui/stats.js exports setStatValue, setStatNote, setOptionalStatNote and imports nothing; ui/chart.js exports chartColumns, barRow",
  j(await exportsOf("js", "ui/stats.js")) === j(["setOptionalStatNote", "setStatNote", "setStatValue"]) && !/^import /m.test(src("js", "ui/stats.js"))
    && j(await exportsOf("js", "ui/chart.js")) === j(["barRow", "chartColumns"]));
check("C6", "no innerHTML / outerHTML / insertAdjacentHTML / document.write in the new or changed shared modules (comments aside)",
  ["ui/stats.js", "ui/chart.js", "ui/leave-view.js", "data/holidays.js"].every((p) => !/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(code(src("js", p)))));

console.log(`\n${totalSnaps} page snapshots compared in all`);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
