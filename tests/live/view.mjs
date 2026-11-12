// usage: node view.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 3F-0: ui/attendance-view.js (hoursText, dayBadge) on its own, and the day badges it draws on
// mark-attendance.html (Recent punches) and my-attendance.html (daily log), in jsdom, with the js in ./js.
// The clock is local wall time on Mon 28 Sep 2026 and is set before each fresh seed. Arjun (a demo
// sign-in identity) never gets an automatic check-in, so his "today" row shows the not-in-yet states.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HTML = {
  mark: fs.readFileSync(`${DIR}/attendance/mark-attendance.html`, "utf8"),
  my: fs.readFileSync(`${DIR}/attendance/my-attendance.html`, "utf8"),
};
const SCRIPT = { mark: "mark-attendance", my: "my-attendance" };
const src = (p) => fs.readFileSync(new URL(`./js/${p}`, import.meta.url), "utf8");
const CSS = fs.readFileSync(`${DIR}/../assets/css/pages/attendance.css`, "utf8");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 9, 28, 10, 0);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const WHO = { arjun: ["emp", "Arjun Kapoor", "EMP-1105"], priya: ["hr", "Priya Nair", "EMP-1003"] };
let loads = 0, w = null, d = null, saved = {};
const jsErrors = [];
async function open(page, who = "arjun") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) jsErrors.push(`${page}/${who}: ${e.message}`); });
  const dom = new JSDOM(HTML[page], { url: `http://localhost/office-os/pages/attendance/${SCRIPT[page]}.html`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${SCRIPT[page]}.js?load=${loads}`); } catch (e) { jsErrors.push(`${page} import: ${e.message}`); }
}
function fresh(h, mi) { setNow(2026, 9, 28, h, mi); if (w) w.localStorage.clear(); saved = {}; }

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;
const look = (b) => (b ? `${txt(b)}[${[...b.classList].filter((c) => c !== "badge").join(" ")}]${b.title ? `{${b.title}}` : ""}` : null);

// ---- readers ----
const markToday = () => d.querySelector("#recent-punches tbody tr")?.lastElementChild.querySelector(".badge");
const myToday = () => [...d.querySelectorAll("#daily-log tbody tr")].find((tr) => tr.dataset.date === "2026-09-28")?.children[4].querySelector(".badge");

// =====================================================================
section("The shared module on its own");
fresh(10, 0);
await open("mark");   // a document for el()
const V = await import("./js/ui/attendance-view.js");
check("V1", "hoursText: 0 -> 0h 00m, 524 -> 8h 44m, 545 -> 9h 05m, 600 -> 10h 00m", [0, 524, 545, 600].map(V.hoursText).join(" | ") === "0h 00m | 8h 44m | 9h 05m | 10h 00m", [0, 524, 545, 600].map(V.hoursText).join(" | "));
const every = ["present", "late", "half-day", "absent", "on-leave", "holiday", "weekend", "no-data", "not-yet"].map((status) => look(V.dayBadge({ status, overdue: false })));
check("V2", "dayBadge(day) for every status: labels and classes (not-yet is 'Not in yet', outlined)", j(every) === j([
  "Present[badge--success badge--dot]", "Late[badge--warning badge--dot]", "Half day[badge--info badge--dot]", "Absent[badge--danger badge--dot]",
  "On leave[badge--info badge--dot]", "Holiday[badge--dot]", "Weekend[badge--dot]", "No data[badge--dot]", "Not in yet[badge--dot badge--not-yet]"]), j(every));
check("V3", "overdue day: outlined red 'Overdue', title with the 09:45 deadline", look(V.dayBadge({ status: "not-yet", overdue: true, halfDayLeave: null })) === "Overdue[badge--dot badge--overdue]{Not checked in by 09:45}");
check("V4", "first-half leave moves the deadline in the title to 14:15; second-half keeps 09:45",
  V.dayBadge({ status: "not-yet", overdue: true, halfDayLeave: "first-half" }).title === "Not checked in by 14:15" && V.dayBadge({ status: "not-yet", overdue: true, halfDayLeave: "second-half" }).title === "Not checked in by 09:45");
check("V5", "an unknown status falls back to a plain badge with the status text", look(V.dayBadge({ status: "mystery" })) === "mystery[badge--dot]");
check("V6", "dayBadge accepts a real store day (dayFor) and returns a fresh <span> each call", V.dayBadge((await import("./js/data/attendance-store.js")).dayFor("EMP-1105", "2026-09-25")).tagName === "SPAN" && V.dayBadge({ status: "late" }) !== V.dayBadge({ status: "late" }));

section("Source: one copy, imported by all three pages");
const PAGES = ["mark-attendance", "my-attendance", "team-attendance"].map((p) => [p, src(`pages/${p}.js`)]);
check("S1", "no page defines hoursText, BADGE, dayBadge or checkInBy any more", PAGES.every(([, s]) => !/const hoursText|const BADGE|function dayBadge|function checkInBy/.test(s)), PAGES.filter(([, s]) => /const hoursText|const BADGE|function dayBadge|function checkInBy/.test(s)).map(([p]) => p).join());
check("S2", "each page imports dayBadge, and hoursText or the hoursCell built on it, from ../ui/attendance-view.js", PAGES.every(([, s]) => { const m = /import \{([^}]*)\} from "\.\.\/ui\/attendance-view\.js";/.exec(s); const names = m ? m[1].split(",").map((x) => x.trim()) : []; return names.includes("dayBadge") && (names.includes("hoursText") || names.includes("hoursCell")); }));
check("S3", "every dayBadge call passes the whole day, never day.status", PAGES.every(([, s]) => !/dayBadge\(\s*\w+\.status\s*\)/.test(s)) && PAGES.every(([, s]) => (s.match(/dayBadge\(/g) ?? []).length === 1));
const allJs = fs.readdirSync(new URL("./js/pages/", import.meta.url)).map((f) => src(`pages/${f}`)).concat(fs.readdirSync(new URL("./js/ui/", import.meta.url)).map((f) => src(`ui/${f}`)));
check("S4", "no script under js/pages or js/ui still says \"Not yet\"", !allJs.some((s) => /["'`]Not yet/.test(s)));
check("S5", "the shared module never uses innerHTML (only its header comment mentions it)", !/\.(innerHTML|outerHTML)|insertAdjacentHTML\(/.test(src("ui/attendance-view.js")) && /never innerHTML/.test(src("ui/attendance-view.js")));
check("S6", "the outline classes it uses exist in attendance.css (loaded on every page via style.css)", /\.badge--not-yet\s*\{/.test(CSS) && /\.badge--overdue\s*\{/.test(CSS));

section("mark-attendance.html, Recent punches, today's row (Arjun)");
fresh(9, 40); await open("mark");
check("K1", "09:40 (before the grace time): outlined 'Not in yet', no title", look(markToday()) === "Not in yet[badge--dot badge--not-yet]", look(markToday()));
check("K2", "…the big status badge above is unchanged ('Not checked in yet')", txt(d.getElementById("punch-status")) === "Not checked in yet", txt(d.getElementById("punch-status")));
fresh(9, 45); await open("mark");
check("K3", "09:45 exactly: still 'Not in yet'", txt(markToday()) === "Not in yet", txt(markToday()));
fresh(9, 46); await open("mark");
check("K4", "09:46: outlined red 'Overdue', title 'Not checked in by 09:45'", look(markToday()) === "Overdue[badge--dot badge--overdue]{Not checked in by 09:45}", look(markToday()));
check("K5", "…the status badge above still reads 'Not checked in yet'", txt(d.getElementById("punch-status")) === "Not checked in yet");
d.getElementById("check-in-btn").click();
check("K6", "checking in at 09:46 turns the row into the solid 'Late' badge", look(markToday()) === "Late[badge--warning badge--dot]", look(markToday()));
fresh(18, 31); await open("mark");
check("K7", "18:31 (after the shift): solid 'Absent', not Overdue", look(markToday()) === "Absent[badge--danger badge--dot]", look(markToday()));
check("K8", "other rows unchanged: hours as 'Xh YYm', Present/Late badges", [...d.querySelectorAll("#recent-punches tbody tr")].slice(1).every((tr) => /^(\d+h \d\dm|–)$/.test(txt(tr.children[3])) && /^(Present|Late)/.test(txt(tr.children[4]))));

section("my-attendance.html, daily log, today's row (Arjun)");
fresh(9, 40); await open("my");
check("Y1", "09:40: outlined 'Not in yet' in the log", look(myToday()) === "Not in yet[badge--dot badge--not-yet]", look(myToday()));
check("Y2", "…the calendar tag for today still says 'Not in yet' (unchanged)", txt(d.querySelector("#attendance-calendar .calendar__day--today .calendar__tag")) === "Not in yet");
fresh(9, 46); await open("my");
check("Y3", "09:46: outlined red 'Overdue' with the 09:45 title", look(myToday()) === "Overdue[badge--dot badge--overdue]{Not checked in by 09:45}", look(myToday()));
fresh(18, 31); await open("my");
check("Y4", "18:31: solid 'Absent'", look(myToday()) === "Absent[badge--danger badge--dot]", look(myToday()));
const L = await import("./js/data/leave-store.js");
fresh(8, 0); await open("my");
const lv = L.applyLeave("EMP-1105", { type: "casual", from: "2026-09-28", to: "2026-09-28", duration: "first-half", reason: "Clinic" });
const ok = lv.ok && L.decideLeave(lv.record.id, "EMP-1029", "emp", "approve").ok && L.decideLeave(lv.record.id, "EMP-1003", "hr", "approve").ok;   // Round 8C (setup): Sneha, the requester's manager, approves first
setNow(2026, 9, 28, 14, 15); await open("my");
check("Y5", "first-half leave: at 14:15 still 'Not in yet'", ok && txt(myToday()) === "Not in yet", txt(myToday()));
setNow(2026, 9, 28, 14, 16); await open("my");
check("Y6", "…at 14:16 'Overdue' with title 'Not checked in by 14:15'", look(myToday()) === "Overdue[badge--dot badge--overdue]{Not checked in by 14:15}", look(myToday()));
setNow(2026, 9, 28, 14, 16); await open("mark");
check("Y7", "…mark-attendance shows the same badge for the same day", look(markToday()) === "Overdue[badge--dot badge--overdue]{Not checked in by 14:15}", look(markToday()));
check("E1", "no page errors", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
