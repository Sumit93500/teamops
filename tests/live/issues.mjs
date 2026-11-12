// usage: node issues.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Cleanup Round D: the correction words (ui/attendance-view.js: ISSUE_LABEL, issueLabel, correctionDetails),
// checked against the code they replace. ./js is the new code, ./js-preD the code before this round.
//   A  the pieces on their own, against verbatim copies of the old inline versions (and the correction
//      describe text in ui/leave-decision.js, through the Approve confirm and the Reject modal)
//   B  the pages that used them, old code vs new code: the whole document, storage, confirm() texts and JS
//      errors after loading as five people at six clock times, with the seeded corrections and with extra ones
//      (every issue, an unknown issue, with and without a recorded time), then the same generic interactions
//   C  source layout: one copy left, imported by the four files; exports; no import cycle
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const read = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const src = (dir, p) => fs.readFileSync(new URL(`./${dir}/${p}`, import.meta.url), "utf8");
const PAGES = {
  reg: ["attendance/regularization.html", "regularization"],
  inbox: ["requests/approvals-inbox.html", "approvals-inbox"],
  hr: ["dashboard/hr.html", "hr-dashboard"],
  // Doesn't show corrections, but now loads ui/attendance-view.js through ui/leave-decision.js.
  leave: ["leave/leave-approvals.html", "leave-approvals"],
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
let confirms = [];
const jsErrors = { js: [], "js-postD": [], "js-preD": [] };
function fresh(html = "<!doctype html><html><body></body></html>", url = "http://localhost/office-os/pages/x.html", errs = jsErrors.js, tag = "blank") {
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) errs.push(`${tag}: ${e.message}`); });
  const dom = new JSDOM(html, { url, virtualConsole: vc });
  w = dom.window; d = w.document;
  w.localStorage.clear();
  confirms = [];
  w.confirm = (m) => { confirms.push(m); return true; };
  w.alert = () => {};
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, Event: w.Event });
}

// Extra corrections added to the seeded ones (built from seeded requests, so the rest of each record is real):
// every issue, an issue the label list doesn't know, with and without a recorded time, in every status.
const EXTRA = [
  ["RG-102", { id: "RG-201", userId: "EMP-1029", issue: "missed-check-in", time: "09:40", recordedTime: null }],
  ["RG-102", { id: "RG-202", userId: "EMP-1042", issue: "early-departure", time: "18:30", recordedTime: "16:10" }],
  ["RG-102", { id: "RG-203", userId: "EMP-1088", issue: "missed-check-out", time: "18:05", recordedTime: "17:45" }],
  ["RG-102", { id: "RG-204", userId: "EMP-1017", issue: "early-departure", time: "18:30", recordedTime: null }],
  ["RG-101", { id: "RG-205", userId: "EMP-1042", issue: "missed-check-in", time: "09:35", recordedTime: null }],
  ["RG-105", { id: "RG-206", userId: "EMP-1029", issue: "early-departure", time: "18:30", recordedTime: "17:05" }],
];
async function addExtra(dir) {
  (await import(`./${dir}/data/attendance-store.js`)).allRegularizations();   // seeds, at the current clock
  const box = JSON.parse(w.localStorage.getItem("officeos:regularizations"));
  for (const [from, change] of EXTRA) box.records.push({ ...box.records.find((r) => r.id === from), ...change });
  w.localStorage.setItem("officeos:regularizations", JSON.stringify(box));
}

async function openPage(dir, page, who, extra) {
  const [path, script] = PAGES[page];
  fresh(read(path), `http://localhost/office-os/pages/${path}`, jsErrors[dir], `${dir}/${page}/${who}`);
  loads++;
  if (extra) await addExtra(dir);
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
const AV = await import("./js/ui/attendance-view.js");
const A = await import("./js/data/attendance-store.js");
const D = await import("./js/ui/leave-decision.js");
const OD = await import("./js-preD/ui/leave-decision.js");
const OV = await import("./js-preD/ui/leave-view.js");

// ---------- the old inline versions, verbatim from the code before this round ----------
// regularization.js, approvals-inbox.js, hr-dashboard.js and ui/leave-decision.js (the same line in all four)
const ISSUE_LABEL = { "late-arrival": "Late arrival", "missed-check-in": "Missed check-in", "missed-check-out": "Missed check-out" };
// approvals-inbox.js and hr-dashboard.js (identical)
const oldIssueLabel = (r) => ISSUE_LABEL[r.issue] ?? r.issue;
const oldCorrectionDetails = (r) => `${oldIssueLabel(r)}, ${r.recordedTime ? `${r.recordedTime} to ${r.time}` : r.time}`;
// regularization.js, the Issue cell (inline)
const oldRegIssueCell = (request) => OV.el("td", "", ISSUE_LABEL[request.issue] ?? request.issue);
// ui/leave-decision.js, correctionFlow's describe (inline)
const oldDescribe = (r) => `${OV.nameOf(r.userId)}: ${ISSUE_LABEL[r.issue] ?? r.issue}, ${OV.formatDay(r.date)}, corrected to ${r.time}`;

// =====================================================================
section("A. The pieces on their own");
const literal = (dir, p) => { const m = /const ISSUE_LABEL = (\{[^}]*\});/.exec(src(dir, p)); return m ? JSON.parse(m[1]) : null; };
const OLD_FILES = ["pages/regularization.js", "pages/approvals-inbox.js", "pages/hr-dashboard.js", "ui/leave-decision.js"];
check("A1", "ISSUE_LABEL == each of the four old copies (same keys, same words, same order)",
  OLD_FILES.every((p) => j(literal("js-preD", p)) === j(AV.ISSUE_LABEL)) && j(AV.ISSUE_LABEL) === j(ISSUE_LABEL), j(AV.ISSUE_LABEL));
check("A2", "its keys are the store's ISSUES, in order", j(Object.keys(AV.ISSUE_LABEL)) === j(A.ISSUES), j(A.ISSUES));

const ISSUES = ["late-arrival", "missed-check-in", "missed-check-out", "early-departure", "", undefined, "Late arrival", "constructor"];
const RECORDED = ["10:24", "17:45", null, undefined, ""];
const TIMES = ["09:30", "18:00"];
const req = (issue, recordedTime, time) => ({ id: "RG-900", userId: "EMP-1088", date: "2026-09-29", issue, recordedTime, time, status: "pending" });
const CASES = ISSUES.flatMap((i) => RECORDED.flatMap((rt) => TIMES.map((t) => req(i, rt, t))));
check("A3", `issueLabel == the old issueLabel (inbox, HR dashboard) for ${ISSUES.length} issues (3 known, unknown, empty, missing, a label, a prototype key)`,
  ISSUES.every((i) => AV.issueLabel(req(i)) === oldIssueLabel(req(i))));
const html = (node) => node.outerHTML;
check("A4", "el(\"td\", \"\", issueLabel(r)) == regularization's old inline Issue cell for the same issues",
  ISSUES.every((i) => html(OV.el("td", "", AV.issueLabel(req(i)))) === html(oldRegIssueCell(req(i)))));
check("A5", `correctionDetails == the old one (inbox, HR dashboard) on ${CASES.length} cases (issues x recorded time set / null / missing / "" x two times)`,
  CASES.every((r) => AV.correctionDetails(r) === oldCorrectionDetails(r)));
const WORDS = [
  [req("late-arrival", "10:24", "09:30"), "Late arrival", "Late arrival, 10:24 to 09:30"],
  [req("missed-check-in", null, "09:40"), "Missed check-in", "Missed check-in, 09:40"],
  [req("missed-check-out", null, "18:00"), "Missed check-out", "Missed check-out, 18:00"],
  [req("missed-check-out", "17:45", "18:05"), "Missed check-out", "Missed check-out, 17:45 to 18:05"],
  [req("early-departure", "16:10", "18:30"), "early-departure", "early-departure, 16:10 to 18:30"],
  [req("early-departure", undefined, "18:30"), "early-departure", "early-departure, 18:30"],
];
check("A6", "wording: all three issues and an unknown one, with and without a recorded time",
  WORDS.every(([r, label, details]) => AV.issueLabel(r) === label && AV.correctionDetails(r) === details), j(WORDS.map(([r]) => AV.correctionDetails(r))));

// The correction describe text, through the flows themselves: the Approve confirm (answered No, so nothing is
// decided) and the Reject modal's description line, new flow vs the old one.
const DESCRIBE_CASES = [...ISSUES.map((i) => req(i, "10:24", "09:30")), { ...req("missed-check-in", null, "09:40"), userId: "EMP-9999" }];
const viaFlows = (flow) => DESCRIBE_CASES.map((r) => {
  fresh();
  w.confirm = (m) => { confirms.push(m); return false; };
  flow.approveCorrection(r);
  flow.openRejectCorrectionModal(r);
  return [confirms[0], d.querySelector(".modal__desc")?.textContent, storage()];
});
const neuFlow = viaFlows(D), oldFlow = viaFlows(OD);
// Round 9V (behaviour; was the storage compared as it is): the store now saves reportingManagerId on every user record
// (managerid.mjs A1), which the old flow's store (js-preD) doesn't know; that one key is set aside, the rest compared
const withoutManagerIds = ([c, m, s]) => [c, m, j(JSON.parse(s).map(([k, v]) => [k, k === "officeos:users"
  ? j({ ...JSON.parse(v), records: JSON.parse(v).records.map(({ reportingManagerId: _id, ...u }) => u) }) : v]))];
check("A7", `the Approve confirm and Reject modal texts == the old flow's for ${DESCRIBE_CASES.length} corrections (same storage, no correction decided)`,
  j(neuFlow.map(withoutManagerIds)) === j(oldFlow) && neuFlow.every(([c, m, s]) => c === `Approve this request?\n${m}` && !s.includes("officeos:regularizations")), j(neuFlow[0].slice(0, 2)));
check("A8", "... and == the old describe line, verbatim", neuFlow.every(([, m], i) => m === oldDescribe(DESCRIBE_CASES[i])), j(neuFlow.slice(0, 2).map(([, m]) => m)));
fresh();

// =====================================================================
section("B. The pages, old code vs new code");
const iso = (y, mo, dd) => `${y}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
async function script(dir, page, who, clock, extra, interact) {
  const [, y, mo, dd, h, mi] = clock;
  setNow(y, mo, dd, h, mi);
  const snaps = [];
  const snap = (what) => snaps.push({ what, html: d.documentElement.outerHTML, storage: storage(), confirms: j(confirms) });
  await openPage(dir, page, who, extra);
  snap("load");
  if (!interact) return snaps;
  const main = () => d.querySelector("main") ?? d.body;
  const fire = (node, type) => node.dispatchEvent(new w.Event(type, { bubbles: true }));
  [...main().querySelectorAll(".tabs__tab")].forEach((tab, i) => { tab.click(); snap(`tab ${i}`); });
  main().querySelector(".tabs__tab")?.click();
  [...main().querySelectorAll("select")].forEach((sel, s) => [...sel.options].slice(0, 8).forEach((o, i) => { sel.value = o.value; fire(sel, "change"); snap(`select ${s}.${i}`); }));
  [...main().querySelectorAll("select")].forEach((sel) => { sel.value = sel.options[0]?.value ?? ""; fire(sel, "change"); });
  [...main().querySelectorAll('input[type="date"]')].forEach((input) => [iso(y, mo, dd - 1 || 1), "2026-09-26", "2026-10-02"].forEach((v) => { input.value = v; fire(input, "change"); fire(input, "input"); snap(`date ${v}`); }));
  [...main().querySelectorAll('input[type="search"], .input--search')].forEach((input, s) => ["ar", "zzz", ""].forEach((v) => { input.value = v; fire(input, "input"); snap(`search ${s} "${v}"`); }));
  const live = (t) => [...main().querySelectorAll("button[data-permission]")].filter((b) => b.textContent.trim() === t && !b.disabled && !b.closest("[data-static]"));
  // Reject opens the modal with the describe line; Cancel closes it without deciding.
  live("Reject").slice(0, 6).forEach((b, i) => {
    b.click(); snap(`reject ${i}`);
    [...d.querySelectorAll(".modal button")].find((x) => x.textContent.trim() === "Cancel")?.click(); snap(`cancel ${i}`);
  });
  // Approve (confirm says yes) the first live request, three times over; each re-render brings the next one up.
  for (let i = 0; i < 3; i++) { const b = live("Approve")[0]; if (!b) break; b.click(); snap(`approve ${i}`); }
  return snaps;
}
const LABELS = ["Late arrival", "Missed check-in", "Missed check-out", "early-departure"];
let n = 0, totalSnaps = 0;
const seen = {};
for (const page of Object.keys(PAGES)) {
  const staticHtml = new JSDOM(read(PAGES[page][0])).window.document.querySelector("main")?.innerHTML;
  let snaps = 0, rendered = 0;
  const differ = [];
  seen[page] = new Set();
  for (const extra of [false, true]) {
    for (const clock of CLOCKS) {
      const interact = clock[0] === "Wed 30 Sep 11:00" || clock[0] === "Fri 1 Jan 2027 10:00";
      for (const who of Object.keys(WHO)) {
        // Round D's committed result (js-postD, frozen at 9eecf18), so later rounds' intended page changes
        // (e.g. Round 4G's sidebar headcount on every page) don't count against it.
        const neu = await script("js-postD", page, who, clock, extra, interact);
        const neuMain = neu[0].html;
        const old = await script("js-preD", page, who, clock, extra, interact);
        snaps += neu.length;
        if (!neuMain.includes(staticHtml)) rendered++;
        for (const s of neu) {
          for (const l of LABELS) if (s.html.includes(`>${l}<`) || s.html.includes(`${l}, `) || s.confirms.includes(`${l}, `)) seen[page].add(l);
        }
        neu.forEach((s, i) => { const o = old[i]; if (!o || o.what !== s.what || o.html !== s.html || o.storage !== s.storage || o.confirms !== s.confirms) differ.push(`${extra ? "extra" : "seed"}/${clock[0]}/${who}/${s.what}`); });
        if (old.length !== neu.length) differ.push(`${clock[0]}/${who}: ${neu.length} vs ${old.length} steps`);
      }
    }
  }
  totalSnaps += snaps;
  check(`B${++n}`, `${PAGES[page][0]}: ${snaps} snapshots (5 people x 6 clocks x seeded/extra corrections, interactions at 2 clocks) identical; the script changed the page in ${rendered} runs`,
    differ.length === 0 && rendered > 0, differ.length ? `${differ.length} differ, first ${j(differ.slice(0, 3))}` : "");
}
check(`B${++n}`, "the compared pages showed every issue label (reg: Issue column; inbox: Details; HR: approvals list, confirm text) and the unknown issue as it is",
  ["reg", "inbox"].every((p) => LABELS.every((l) => seen[p].has(l))) && seen.hr.size > 0 && seen.leave.size === 0,
  Object.entries(seen).map(([p, s]) => `${p}: ${[...s].join(", ") || "none"}`).join(" | "));
check(`B${++n}`, "no JS errors on either tree (new, old)", jsErrors.js.length === 0 && jsErrors["js-postD"].length === 0 && jsErrors["js-preD"].length === 0, `${j([...jsErrors.js, ...jsErrors["js-postD"]].slice(0, 3))} / ${j(jsErrors["js-preD"].slice(0, 3))}`);

// =====================================================================
section("C. Source layout");
const code = (s) => s.split(/\r?\n/).filter((l) => !l.trim().startsWith("//")).join("\n");
const walk = (dir, base = "") => fs.readdirSync(new URL(`./${dir}/${base}`, import.meta.url), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
const ALL = walk("js");
const defines = (s, name) => new RegExp(`(const|let|var|function)\\s+${name}\\b`).test(s);
const NAMES = ["ISSUE_LABEL", "issueLabel", "correctionDetails"];
const definers = ALL.flatMap((p) => NAMES.filter((x) => defines(code(src("js", p)), x)).map((x) => `${p}:${x}`));
check("C1", `${NAMES.join(", ")} are defined only in ui/attendance-view.js (whole js tree)`,
  j(definers) === j(NAMES.map((x) => `ui/attendance-view.js:${x}`)), j(definers));
const wordsIn = ALL.filter((p) => /"(Late arrival|Missed check-in|Missed check-out)"/.test(code(src("js", p))));
check("C2", "the three issue words are written only in ui/attendance-view.js (code, comments aside)", j(wordsIn) === j(["ui/attendance-view.js"]), j(wordsIn));
const importsFrom = (p, from) => { const m = new RegExp(`import \\{([^}]*)\\} from "${from.replace(/[.]/g, "\\.")}";`).exec(src("js", p)); return m ? m[1].split(",").map((x) => x.trim()).sort() : null; };
const USERS = [["pages/regularization.js", "../ui/attendance-view.js", ["issueLabel"]], ["pages/approvals-inbox.js", "../ui/attendance-view.js", ["correctionDetails"]],
  ["pages/hr-dashboard.js", "../ui/attendance-view.js", ["correctionDetails"]], ["ui/leave-decision.js", "./attendance-view.js", ["issueLabel"]]];
check("C3", "the four files import what they use from ui/attendance-view.js (regularization, leave-decision: issueLabel; inbox, HR dashboard: correctionDetails)",
  USERS.every(([p, from, names]) => j(importsFrom(p, from)) === j(names)), j(USERS.map(([p, from]) => importsFrom(p, from))));
// Round D's own change set: its result (js-postD, frozen at the commit) vs the code before it, so later rounds can't disturb it.
const POST_D = walk("js-postD");
const changed = POST_D.filter((p) => !fs.existsSync(new URL(`./js-preD/${p}`, import.meta.url)) || src("js-postD", p) !== src("js-preD", p));
check("C4", "the only files Round D changed are the five (its result vs the code before it)", j(changed) === j(["pages/approvals-inbox.js", "pages/hr-dashboard.js", "pages/regularization.js", "ui/attendance-view.js", "ui/leave-decision.js"])
  && j(walk("js-preD")) === j(POST_D), j(changed));
const exportsOf = async (dir, p) => Object.keys(await import(`./${dir}/${p}`)).sort();
const kept = [];
for (const p of ["ui/attendance-view.js", "ui/leave-decision.js"]) {
  const before = await exportsOf("js-preD", p), after = await exportsOf("js", p);
  kept.push(`${p}: ${before.every((x) => after.includes(x)) ? "all kept" : "MISSING " + before.filter((x) => !after.includes(x))} +[${after.filter((x) => !before.includes(x))}]`);
}
check("C5", "every old export is still exported; the new ones are exactly the three", kept.every((k) => k.includes("all kept")) && j(kept.map((k) => k.split("+")[1]))
  === j(["[ISSUE_LABEL,correctionDetails,issueLabel]", "[]"]), kept.join(" | "));
// Static import graph from ui/attendance-view.js: it must not reach ui/leave-decision.js (which now imports it).
const resolve = (from, spec) => new URL(spec, `file:///x/${from}`).pathname.slice(3);
const reach = (start) => { const out = new Set(), todo = [start]; while (todo.length) { const p = todo.pop(); if (out.has(p)) continue; out.add(p); for (const m of src("js", p).matchAll(/^import [^;]*? from "([^"]+)";/gm)) todo.push(resolve(p, m[1])); } return out; };
const reached = reach("ui/attendance-view.js");
check("C6", "no import cycle: ui/attendance-view.js doesn't import (directly or not) ui/leave-decision.js or a page", !reached.has("ui/leave-decision.js") && ![...reached].some((p) => p.startsWith("pages/")), j([...reached].sort()));
check("C7", "no innerHTML / outerHTML / insertAdjacentHTML / document.write in ui/attendance-view.js (comments aside)", !/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(code(src("js", "ui/attendance-view.js"))));

console.log(`\n${totalSnaps} page snapshots compared in all`);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
