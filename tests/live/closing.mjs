// usage: node closing.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 14F: check-in closes at the day's own end and opens at 8:30 AM. The store (checkIn, checkInWindow,
// requestRegularization), the punch page (mark-attendance.html) and the Request fix form (my-attendance.html),
// in jsdom with the js in ./js. The clock is faked to the second, in local time, so the three zones read the same
// wall clock; setTimeout/setInterval are captured so the punch page's minute tick can be fired on demand.
// Scope and words are read from frozen copies (js-pre14F against js-pre14H); the live tree: jsguard.mjs.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const read = (...p) => (fs.existsSync(path.join(...p)) ? fs.readFileSync(path.join(...p), "utf8") : "");
const exists = (...p) => fs.existsSync(path.join(...p));
const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replaceAll("\\", "/")).sort() : []);
const PAGES = {
  mark: ["attendance", "mark-attendance", read(DIR, "attendance", "mark-attendance.html")],
  my: ["attendance", "my-attendance", read(DIR, "attendance", "my-attendance.html")],
};

const RealDate = Date;
let NOW = 0;
const at = (y, mo, d, h, mi, s = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, s).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const BASE = () => at(2026, 9, 28, 10, 0);   // Mon 28 Sep 2026, as mark.mjs
BASE();
let timeouts = [], intervals = [];
globalThis.setTimeout = (fn, ms) => { timeouts.push({ fn, ms }); return timeouts.length; };
globalThis.setInterval = (fn, ms) => { intervals.push({ fn, ms }); return 1000 + intervals.length; };
// A throw in a timer is a page error, as in a browser, not a crash of the suite (E1).
function tick() { const due = timeouts; timeouts = []; for (const t of [...due, ...intervals]) { try { t.fn(); } catch (e) { jsErrors.push(`tick: ${e.message}`); } } }

const WHO = {
  arjun: ["emp", "Arjun Kapoor", "EMP-1105"], vikram: ["emp", "Vikram Singh", "EMP-1088"],
  aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"], kabir: ["fin", "Kabir Shah", "EMP-1008"],
};
const ID = Object.fromEntries(Object.entries(WHO).map(([k, v]) => [k, v[2]]));

let loads = 0, w = null, d = null, saved = {};
const jsErrors = [];
async function open(page, who) {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const [folder, name, html] = PAGES[page];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) jsErrors.push(`${name}/${who}: ${e.message}`); });
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${folder}/${name}.html`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.confirm = () => true;
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, HTMLElement: w.HTMLElement });
  timeouts = []; intervals = [];
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  await import(`./js/app.js?load=${loads}`);
  try { await import(`./js/pages/${name}.js?load=${loads}`); } catch (e) { jsErrors.push(`${name} import: ${e.message}`); }
}
// Fresh demo data, then the clock set; the next open() starts from it. Storage needs a window: a blank one the first time.
async function fresh() {
  if (!w) { const dom = new JSDOM("", { url: "http://localhost/office-os/" }); w = dom.window; Object.assign(globalThis, { window: w, document: w.document, localStorage: w.localStorage }); }
  w.localStorage.clear(); saved = {}; BASE();
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);
const A = await import("./js/data/attendance-store.js");
const L = await import("./js/data/leave-store.js");
const H = await import("./js/data/holidays.js");
const U = await import("./js/data/store.js");
const HOL_ACTOR = "EMP-1003";   // HR (Priya) holds holidays:manage, as in mark.mjs
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const txt = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? null;
const j = JSON.stringify;

// Approves a leave request or a correction stage by stage: the manager on file, then HR (Aarav when the requester is Priya).
function approveAll(get, decide, id) {
  for (let i = 0; i < 3; i++) {
    const r = get(id);
    if (!r || r.status !== "pending") break;
    const by = r.stage === "manager" && r.managerId && r.managerId !== r.userId ? r.managerId : r.userId === ID.priya ? ID.aarav : ID.priya;
    decide(id, by, U.getUser(by).role, "approve");
  }
  return get(id)?.status ?? "missing";
}
const leaveById = (id) => L.allRequests().find((r) => r.id === id);
function leave(who, from, to, duration) {
  const r = L.applyLeave(ID[who], { type: "casual", from, to, duration, reason: "Round 14F fixture" });
  return r.ok ? approveAll(leaveById, L.decideLeave, r.record.id) : `refused: ${r.error}`;
}
// The fixtures every section starts from (the demo identities, who never get a sample punch, with no leave on 28 Sep): Kabir second-half and Priya first-half leave today; Arjun a full day on Thu 1 Oct;
// an optional holiday on Tue 29 Sep, a company one on Wed 30 Sep. Returns what each became.
function fixtures() {
  return [
    leave("kabir", "2026-09-28", "2026-09-28", "second-half"), leave("priya", "2026-09-28", "2026-09-28", "first-half"), leave("arjun", "2026-10-01", "2026-10-01", "full"),
    H.addHoliday(HOL_ACTOR, { date: "2026-09-29", name: "Optional day", kind: "optional" }).ok, H.addHoliday(HOL_ACTOR, { date: "2026-09-30", name: "Company day", kind: "company" }).ok,
  ];
}
const win = (day) => (typeof A.checkInWindow === "function" ? A.checkInWindow(day) : "(no checkInWindow)");   // missing fails its check rather than crashing
const tryIn = (who) => { const r = A.checkIn(ID[who], "office"); return r.ok ? `ok ${r.record.checkIn}` : r.error; };
const today = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; };   // local, never toISOString
const dayOf = (who) => A.dayFor(ID[who], today());
const CLOSED = "Check-in closed at 6:30 PM.";
const OPENS = "Check-in opens at 8:30 AM.";
const NOTE = "Check-in closed at 6:30 PM. If you were working today, use Request fix on My attendance.";

// =====================================================================
section("S. The fixtures");
await fresh();
const fx = fixtures();
check("S1", "fixtures: two half-day leaves and a full day approved, an optional and a company holiday added", j(fx) === j(["approved", "approved", "approved", true, true]), j(fx));
check("S2", "and they read as meant: Kabir second-half, Priya first-half today; 29 Sep optional (a working day), 30 Sep a holiday, 1 Oct Arjun on leave, 3 Oct a weekend",
  dayOf("kabir").halfDayLeave === "second-half" && dayOf("priya").halfDayLeave === "first-half" && A.dayFor(ID.arjun, "2026-09-29").holiday?.kind === "optional"
  && A.dayFor(ID.arjun, "2026-09-30").status === "holiday" && A.dayFor(ID.arjun, "2026-10-01").status === "on-leave" && A.dayFor(ID.arjun, "2026-10-03").status === "weekend",
  j([dayOf("kabir").halfDayLeave, dayOf("priya").halfDayLeave, A.dayFor(ID.arjun, "2026-09-29").holiday, A.dayFor(ID.arjun, "2026-09-30").status, A.dayFor(ID.arjun, "2026-10-01").status]));

// =====================================================================
section("A. The store: when check-in is open");
check("A1", "checkInWindow: opens 08:30 (510), closes at the day's own end: 18:30 (1110), 14:00 (840) with second-half leave, 18:30 with first-half or no day",
  j(win(dayOf("arjun"))) === j({ opens: 510, closes: 1110 }) && j(win(dayOf("kabir"))) === j({ opens: 510, closes: 840 })
  && j(win(dayOf("priya"))) === j({ opens: 510, closes: 1110 }) && j(win(null)) === j({ opens: 510, closes: 1110 }),
  j([win(dayOf("arjun")), win(dayOf("kabir")), win(dayOf("priya"))]));
check("A2", "the rules gain earliestCheckIn 08:30; every other rule unchanged", j(A.ATTENDANCE_RULES) === j({ shiftStart: "09:30", shiftEnd: "18:30", earliestCheckIn: "08:30", graceMinutes: 15, halfSplit: "14:00", fullDayMinutes: 480, halfDayMinutes: 240, penaltyEvery: 3, requestWindowDays: A.ATTENDANCE_RULES.requestWindowDays }), j(A.ATTENDANCE_RULES));

await fresh(); fixtures(); at(2026, 9, 28, 18, 29, 59);
const a3 = tryIn("arjun");
check("A3", "18:29:59: still open; saved at 18:29, marked late by 539 min (L1: late until closing)", a3 === "ok 18:29" && dayOf("arjun").status === "late" && dayOf("arjun").minutesLate === 539, `${a3} ${dayOf("arjun").status} ${dayOf("arjun").minutesLate}`);
await fresh(); fixtures(); at(2026, 9, 28, 18, 30, 0);
const a4 = tryIn("arjun");
check("A4", "18:30:00: closed, in the approved words, and nothing written; the day reads absent", a4 === CLOSED && dayOf("arjun").checkIn === null && dayOf("arjun").status === "absent", `${a4} ${dayOf("arjun").status}`);
at(2026, 9, 28, 23, 59, 59);
check("A5", "23:59:59: still closed", tryIn("arjun") === CLOSED && dayOf("arjun").checkIn === null);
await fresh(); fixtures(); at(2026, 9, 28, 8, 29, 59);
const a6 = [tryIn("arjun")]; at(2026, 9, 28, 8, 29, 0); a6.push(tryIn("arjun")); at(2026, 9, 28, 0, 5, 0); a6.push(tryIn("arjun")); at(2026, 9, 28, 0, 0, 0); a6.push(tryIn("arjun"));
check("A6", "before 8:30 refused: 08:29:59, 08:29, 00:05 and midnight (no 'on time' check-in just after midnight any more); nothing written", j(a6) === j([OPENS, OPENS, OPENS, OPENS]) && dayOf("arjun").checkIn === null, j(a6));
at(2026, 9, 28, 8, 30, 0);
const a7 = tryIn("arjun");
check("A7", "08:30:00: open, on time (present, no late minutes)", a7 === "ok 08:30" && dayOf("arjun").status === "present" && dayOf("arjun").minutesLate === 0, `${a7} ${dayOf("arjun").status}`);

await fresh(); fixtures(); at(2026, 9, 28, 13, 59, 59);
const a8 = tryIn("kabir");
await fresh(); fixtures(); at(2026, 9, 28, 14, 0, 0);
const a8b = tryIn("kabir");
check("A8", "second-half leave (Kabir, Finance): 13:59:59 open; 14:00 closed, stating 2:00 PM", a8 === "ok 13:59" && a8b === "Check-in closed at 2:00 PM." && dayOf("kabir").checkIn === null, `${a8} | ${a8b}`);
await fresh(); fixtures(); at(2026, 9, 28, 18, 29, 0);
const a9 = tryIn("priya");
await fresh(); fixtures(); at(2026, 9, 28, 18, 30, 0);
const a9b = tryIn("priya");
check("A9", "first-half leave (Priya, HR): still 18:30, 18:29 open and 18:30 closed", a9 === "ok 18:29" && a9b === CLOSED, `${a9} | ${a9b}`);

await fresh(); at(2026, 9, 28, 18, 30, 0);   // the roles: no leave fixtures, so each closes at the shift's own end
const roles = ["aarav", "priya", "kabir"].map((who) => `${who}: ${tryIn(who)}`);
check("A10", "Admin, HR and Finance are blocked the same at 18:30", j(roles) === j([`aarav: ${CLOSED}`, `priya: ${CLOSED}`, `kabir: ${CLOSED}`]), j(roles));
await fresh(); at(2026, 9, 28, 18, 29, 0);
const rolesOpen = ["aarav", "priya", "kabir"].map((who) => tryIn(who));
check("A11", "and all three can still check in at 18:29", j(rolesOpen) === j(["ok 18:29", "ok 18:29", "ok 18:29"]), j(rolesOpen));

await fresh(); fixtures(); at(2026, 9, 28, 10, 0, 0); tryIn("arjun");
at(2026, 9, 28, 23, 59, 0);
const out1 = A.checkOut(ID.arjun);
check("A12", "check-out isn't limited: in at 10:00, out at 23:59 works", out1.ok && dayOf("arjun").checkOut === "23:59", out1.error ?? dayOf("arjun").checkOut);
await fresh(); fixtures(); at(2026, 9, 28, 13, 0, 0); tryIn("kabir");
at(2026, 9, 28, 18, 45, 0);
const out2 = A.checkOut(ID.kabir);
check("A13", "with second-half leave too: in at 13:00, out at 18:45, after the day's 14:00 end", out2.ok && dayOf("kabir").checkOut === "18:45", out2.error ?? "");

await fresh(); fixtures();
const offDays = [];
for (const [date, h] of [["2026-10-03", 8], ["2026-10-03", 19], ["2026-09-30", 8], ["2026-09-30", 19], ["2026-10-01", 8], ["2026-10-01", 19]]) { const [y, m, dd] = date.split("-").map(Number); at(y, m, dd, h, 0); offDays.push(tryIn("arjun")); }
check("A14", "weekends, holidays and full-day leave keep their own refusals, before 8:30 and after closing alike",
  j(offDays) === j(["Today is a weekend, so no attendance is needed.", "Today is a weekend, so no attendance is needed.", "Today is a holiday, so no attendance is needed.", "Today is a holiday, so no attendance is needed.",
    "You're on approved leave today, so check-in is closed.", "You're on approved leave today, so check-in is closed."]), j(offDays));
const fresh29 = async () => { await fresh(); at(2026, 9, 29, 10, 0); return H.addHoliday(HOL_ACTOR, { date: "2026-09-29", name: "Optional day", kind: "optional" }).ok; };   // seeded on 29 Sep: no sample day for Arjun there
await fresh29(); at(2026, 9, 29, 19, 0);
const optLate = tryIn("arjun");
await fresh29(); at(2026, 9, 29, 10, 0);
const optDay = tryIn("arjun");
check("A15", "an optional holiday is a working day: closed at 19:00, open at 10:00", optLate === CLOSED && optDay === "ok 10:00", `${optLate} | ${optDay}`);
await fresh(); fixtures(); at(2026, 9, 28, 18, 29, 0);
const s29 = dayOf("arjun").status; at(2026, 9, 28, 18, 30, 0);
check("A16", "the day still turns absent at the same moment check-in closes (unchanged: not-yet at 18:29, absent at 18:30)", s29 === "not-yet" && dayOf("arjun").status === "absent", `${s29} ${dayOf("arjun").status}`);

// =====================================================================
section("B. The punch page");
const $ = (id) => d.getElementById(id);
const badge = () => `${txt($("punch-status"))} {${$("punch-status").className.split(" ").filter((c) => c !== "badge" && c !== "badge--dot").join(" ")}}`;
const buttons = () => `in:${$("check-in-btn").disabled ? "off" : "on"} out:${$("check-out-btn").disabled ? "off" : "on"}`;
const noteText = () => ($("punch-note").hidden ? "" : txt($("punch-note")));
const errorText = () => ($("punch-error").hidden ? "" : txt($("punch-error")));
const modes = () => [...d.querySelectorAll('input[name="mode"]')].map((i) => `${i.value}${i.checked ? "*" : ""}${i.disabled ? "(off)" : ""}`).join(" ");
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${t.className.replace("toast toast--", "")}:${t.querySelector(".toast__text").textContent.trim()}`);
const state = () => `${badge()} | ${buttons()} | ${modes()} | note: ${noteText()} | error: ${errorText()}`;

await fresh(); fixtures(); at(2026, 9, 28, 18, 30, 0); await open("mark", "arjun");
check("B1", "after closing: the red badge stays, Check in is off as on holidays, the work mode is locked, and the note points to Request fix",
  badge() === "Not checked in, the shift has ended {badge--danger}" && buttons() === "in:off out:off" && modes() === "office*(off) wfh(off)" && noteText() === NOTE && errorText() === "", state());
check("B2", "the note is plain text in the existing line under the buttons (no link, no markup)", $("punch-note").children.length === 0 && $("punch-note").closest(".card") === $("check-in-btn").closest(".card"));
await fresh(); fixtures(); at(2026, 9, 28, 8, 0, 0); await open("mark", "arjun");
check("B3", "before 8:30: 'Not checked in yet' (amber), Check in off, mode locked, the note says when it opens", badge() === "Not checked in yet {badge--warning}" && buttons() === "in:off out:off" && modes() === "office*(off) wfh(off)" && noteText() === OPENS, state());
at(2026, 9, 28, 8, 30, 0); tick();
check("B4", "the minute tick at 8:30 opens it by itself: Check in on, the mode free, no note", buttons() === "in:on out:off" && modes() === "office* wfh" && noteText() === "", state());
await fresh(); fixtures(); at(2026, 9, 28, 18, 29, 0); await open("mark", "arjun");
const b5 = state(); at(2026, 9, 28, 18, 30, 0); tick();
check("B5", "an open page closes by itself on the 18:30 tick", b5.includes("in:on") && badge() === "Not checked in, the shift has ended {badge--danger}" && buttons() === "in:off out:off" && noteText() === NOTE, `${b5} || ${state()}`);
await fresh(); fixtures(); at(2026, 9, 28, 18, 29, 30); await open("mark", "arjun");
const b6 = buttons(); at(2026, 9, 28, 18, 30, 5); $("check-in-btn").click();
check("B6", "a tab open past closing (no tick yet): the click is refused by the store, in the existing error line; nothing saved, no success toast; the redraw closes it",
  b6 === "in:on out:off" && errorText() === CLOSED && dayOf("arjun").checkIn === null && !toasts().some((t) => t.startsWith("success")) && buttons() === "in:off out:off" && noteText() === NOTE, `${b6} || ${state()} || ${j(toasts())}`);
await fresh(); fixtures(); at(2026, 9, 28, 14, 0, 0); await open("mark", "kabir");
check("B7", "second-half leave at 14:00: closed, and the note states 2:00 PM", buttons() === "in:off out:off" && noteText() === "Check-in closed at 2:00 PM. If you were working today, use Request fix on My attendance.", state());
await fresh(); fixtures(); at(2026, 9, 28, 13, 59, 0); await open("mark", "kabir");
check("B8", "and at 13:59 still open", buttons() === "in:on out:off" && noteText() === "", state());
const b9 = [];
for (const who of ["aarav", "priya", "kabir"]) { await fresh(); at(2026, 9, 28, 18, 30, 0); await open("mark", who); b9.push(`${who}: ${buttons()} ${noteText() === NOTE}`); }
check("B9", "Admin, HR and Finance see the same closed page", j(b9) === j(["aarav: in:off out:off true", "priya: in:off out:off true", "kabir: in:off out:off true"]), j(b9));
await fresh(); fixtures(); at(2026, 9, 28, 10, 0, 0); tryIn("arjun"); at(2026, 9, 28, 19, 0, 0); await open("mark", "arjun");
const b10 = state(); $("check-out-btn").click();
check("B10", "checked in, after closing: Check out still on, and it works (19:00, success toast)", /^Checked in at 10:00, late by 30 min \{badge--warning\} \| in:off out:on/.test(b10) && dayOf("arjun").checkOut === "19:00" && toasts().includes("success:Checked out."), `${b10} || ${j(toasts())}`);
await fresh(); fixtures(); at(2026, 10, 3, 19, 0, 0); await open("mark", "arjun");
const b11 = state(); at(2026, 9, 30, 8, 0, 0); await open("mark", "arjun");
check("B11", "a weekend after closing and a holiday before 8:30 keep their own notes, not the new ones",
  b11 === "Weekend {} | in:off out:off | office*(off) wfh(off) | note: No attendance is needed on weekends. | error: " && noteText() === "No attendance is needed on holidays.", `${b11} || ${state()}`);
const fx29 = await fresh29(); at(2026, 9, 29, 19, 0, 0); await open("mark", "arjun");
check("B12", "an optional holiday after closing: the closed page, as any working day", fx29 && buttons() === "in:off out:off" && noteText() === NOTE, state());
check("B13", "the rule line is unchanged (the optional rule sentence was dropped)", txt($("punch-rule")) === "Shift 9:30 AM – 6:30 PM. Checking in after 9:45 AM is marked late.", txt($("punch-rule")));

// =====================================================================
section("C. Request fix after closing (my-attendance.html)");
const errors = () => [...d.querySelectorAll("#regularize-modal .form-error")].map((e) => { const input = e.closest(".form-field").querySelector("input, select, textarea"); return `${input.id}:${e.textContent}${input.getAttribute("aria-describedby") === e.id ? "" : "(unlinked)"}`; });
const setField = (id, value) => { const i = $(id); i.value = value; i.dispatchEvent(new w.Event("input", { bubbles: true })); };
const submit = () => d.querySelector("#regularize-modal form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
const actionOf = (label) => [...d.querySelectorAll("#daily-log tbody tr")].find((tr) => txt(tr.children[0]) === label)?.querySelector(".table__actions");
const modalOpen = () => $("regularize-modal").classList.contains("is-open");
const mine = () => A.regularizationsFor(ID.arjun).filter((r) => r.date === "2026-09-28");

await fresh(); fixtures(); at(2026, 9, 28, 18, 30, 0); await open("my", "arjun");
const fix = actionOf("Mon, 28 Sep");
check("C1", "today, after closing, has its Request fix on My attendance (the note's pointer is real)", txt(fix) === "Request fix", txt(fix) ?? "(no row)");
fix?.querySelector("button")?.click();
check("C2", "it opens the form for today, as a missed check-in", modalOpen() && $("reg-date").value === "2026-09-28" && $("reg-issue").value === "missed-check-in", `${modalOpen()} ${$("reg-date").value} ${$("reg-issue").value}`);
setField("reg-time", "18:45"); setField("reg-reason", "Forgot to punch");
submit();
check("C3", "a corrected check-in after the day's end is refused on the time field, in the approved words; nothing saved",
  j(errors()) === j(["reg-time:The corrected check-in has to be before 6:30 PM."]) && modalOpen() && mine().length === 0, j(errors()));
setField("reg-time", "18:30"); submit();
check("C4", "18:30 itself too (the end is refused, ruled 2026-11-07)", j(errors()) === j(["reg-time:The corrected check-in has to be before 6:30 PM."]) && mine().length === 0, j(errors()));
setField("reg-time", "09:30"); submit();
const sent = mine();
check("C5", "09:30 is sent, to Arjun's manager first, as before", sent.length === 1 && sent[0].status === "pending" && sent[0].stage === "manager" && !modalOpen() && toasts().includes("success:Correction request sent."), j(sent.map((r) => [r.status, r.stage])));
const done = sent.length ? approveAll(A.getRegularization, A.decideRegularization, sent[0].id) : "none";
check("C6", "approved by the manager and then HR, the missed day is recorded: 09:30, present, and still open for check-out", done === "approved" && dayOf("arjun").checkIn === "09:30" && dayOf("arjun").status === "present" && dayOf("arjun").inProgress, `${done} ${j([dayOf("arjun").checkIn, dayOf("arjun").status])}`);
await open("mark", "arjun");
check("C7", "the punch page then shows the corrected check-in with Check out on", badge() === "Checked in at 09:30 {badge--success}" && buttons() === "in:off out:on", state());

// =====================================================================
section("D. Corrections in the store");
const ask = (who, date, issue, time) => { const r = A.requestRegularization(ID[who], { date, issue, time, reason: "Round 14F" }); if (r.ok) A.cancelRegularization(r.record.id, ID[who]); return r.ok ? "ok" : `${r.field}: ${r.error}`; };
await fresh(); fixtures(); at(2026, 9, 28, 19, 0, 0);
const d1 = ["18:29", "18:30", "23:45"].map((t) => ask("arjun", "2026-09-28", "missed-check-in", t));
check("D1", "a missed check-in: 18:29 allowed; 18:30 (the day's end itself, ruled 2026-11-07) and 23:45 refused on the time field",
  j(d1) === j(["ok", "time: The corrected check-in has to be before 6:30 PM.", "time: The corrected check-in has to be before 6:30 PM."]), j(d1));
const d2 = ["13:59", "14:00"].map((t) => ask("kabir", "2026-09-28", "missed-check-in", t));
check("D2", "with second-half leave the end is 14:00: 13:59 allowed, 14:00 refused, stating 2:00 PM", j(d2) === j(["ok", "time: The corrected check-in has to be before 2:00 PM."]), j(d2));
// A late arrival can pass the end only on an old record (a 23:00 punch from before the rule; leave can't be added once checked in): written to storage.
await fresh(); at(2026, 9, 28, 10, 0, 0); tryIn("vikram");
const box = JSON.parse(localStorage.getItem("officeos:attendance")); const rec = box.records.find((r) => r.userId === ID.vikram && r.date === "2026-09-28");
if (rec) { rec.checkIn = "23:00"; localStorage.setItem("officeos:attendance", JSON.stringify(box)); }
at(2026, 9, 29, 11, 0, 0);
const d3 = ["19:00", "09:40"].map((t) => ask("vikram", "2026-09-28", "late-arrival", t));
check("D3", "a late arrival too: on an old 23:00 check-in, correcting to 19:00 is after the day's end and refused; 09:40 is fine",
  A.dayFor(ID.vikram, "2026-09-28").checkIn === "23:00" && j(d3) === j(["time: The corrected check-in has to be before 6:30 PM.", "ok"]), `${A.dayFor(ID.vikram, "2026-09-28").checkIn} ${j(d3)}`);
await fresh(); fixtures(); at(2026, 9, 28, 10, 0, 0); tryIn("arjun");
at(2026, 9, 29, 11, 0, 0);
const d4 = ask("arjun", "2026-09-28", "missed-check-out", "23:00");
check("D4", "a missed check-out isn't limited: 23:00 for yesterday is still accepted", d4 === "ok", d4);
await fresh(); fixtures(); at(2026, 9, 28, 19, 0, 0);
const d5 = ask("arjun", "2026-09-28", "late-arrival", "18:45");
check("D5", "the earlier refusals still come first (a late arrival with no check-in: choose Missed check-in)", d5 === "issue: There's no check-in that day to correct. Choose Missed check-in instead.", d5);
const aaravFix = A.requestRegularization(ID.aarav, { date: "2026-09-28", issue: "missed-check-in", time: "18:40", reason: "x" });
const aaravOk = A.requestRegularization(ID.aarav, { date: "2026-09-28", issue: "missed-check-in", time: "09:30", reason: "x" });
check("D6", "an Admin's own correction (auto-approved) is held to the same end: 18:40 refused, 09:30 applied at once", !aaravFix.ok && aaravFix.error === "The corrected check-in has to be before 6:30 PM." && aaravOk.ok && aaravOk.record.status === "approved" && dayOf("aarav").checkIn === "09:30",
  `${aaravFix.error} | ${aaravOk.ok && aaravOk.record.status}`);

// =====================================================================
section("W. Words and scope, from frozen copies (the live tree: jsguard.mjs, pagefreeze.mjs)");
const added = (a, b) => { const S = new Set(a.split("\r\n")); return b.split("\r\n").filter((l) => !S.has(l)); };
const newCode = (f) => added(read(HERE, "js-pre14H", f), read(HERE, "js-pre14F", f)).filter((l) => !/^\s*\/\//.test(l)).join("\n");
const words = [...(newCode("data/attendance-store.js") + "\n" + newCode("pages/mark-attendance.js")).matchAll(/[`"]([A-Z][a-z][^`"]*)[`"]/g)].map((m) => m[1]);
check("W1", "the only words in the new lines are the four approved strings (the time filled in from the day)", j(words) === j([
  "Check-in opens at ${clockLabel(opens)}.", "Check-in closed at ${clockLabel(closes)}.", "The corrected check-in has to be before ${clockLabel(closes)}.",
  "Check-in closed at ${twelveHour(checkInWindow(day).closes)}. If you were working today, use Request fix on My attendance.", "Check-in opens at ${twelveHour(checkInWindow(day).opens)}."]), j(words));
check("W2", "the note is set through setNote (textContent); no HTML strings, nothing fetched or stored in the new lines", !/innerHTML|outerHTML|insertAdjacentHTML|fetch\(|localStorage|sessionStorage/.test(newCode("data/attendance-store.js") + newCode("pages/mark-attendance.js")));
const changedIn = (a, b) => walk(path.join(HERE, a)).filter((f) => !exists(HERE, b, f) || read(HERE, a, f) !== read(HERE, b, f));
check("X1", "js: exactly data/attendance-store.js and pages/mark-attendance.js changed; nothing added or removed", j(changedIn("js-pre14F", "js-pre14H")) === j(["data/attendance-store.js", "pages/mark-attendance.js"]) && j(walk(path.join(HERE, "js-pre14F"))) === j(walk(path.join(HERE, "js-pre14H"))), j(changedIn("js-pre14F", "js-pre14H")));
const crlf = (s) => s !== "" && !/(^|[^\r])\n/.test(s) && !s.endsWith("\n");
check("X2", "both changed files CRLF, no final newline", ["data/attendance-store.js", "pages/mark-attendance.js"].every((f) => crlf(read(HERE, "js-pre14F", f))));
const fnOf = (s, name) => { const i = s.indexOf(`export function ${name}(`); return i < 0 ? "" : s.slice(i, s.indexOf("\r\n}\r\n", i) + 3); };
check("X3", "check-out, the day's derivation and the correction's approval are byte for byte 14H's (check-out stays open; nothing re-judged at approval)",
  ["checkOut", "decideRegularization", "dayFor"].every((n) => fnOf(read(HERE, "js-pre14F", "data", "attendance-store.js"), n) !== "" && fnOf(read(HERE, "js-pre14F", "data", "attendance-store.js"), n) === fnOf(read(HERE, "js-pre14H", "data", "attendance-store.js"), n))
  && (() => { const s = (v) => { const t = read(HERE, v, "data", "attendance-store.js"); return t.slice(t.indexOf("function deriveDay("), t.indexOf("// ---------- reads ----------")); }; return s("js-pre14F") !== "" && s("js-pre14F") === s("js-pre14H"); })());
check("X4", "the form's page code is untouched: the refusal reaches it through the store's existing time-field error", read(HERE, "js-pre14F", "pages", "my-attendance.js") !== "" && read(HERE, "js-pre14F", "pages", "my-attendance.js") === read(HERE, "js-pre14H", "pages", "my-attendance.js"));
check("X5", "the device clock still (T1): no office offset in the new lines", !/OFFICE_OFFSET|getTimezoneOffset|UTC|Intl\./.test(newCode("data/attendance-store.js") + newCode("pages/mark-attendance.js")));

// =====================================================================
section("E. No page errors");
check("E1", "no JS errors across all page loads", jsErrors.length === 0, jsErrors.join(" / ") || `none (${loads} loads)`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
