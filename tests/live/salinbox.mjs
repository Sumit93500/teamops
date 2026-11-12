// usage: node salinbox.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 12Z (R9c-3): the approvals inbox and its sidebar count list a waiting salary change for whoever may decide it
// (salary:view only); Approve / Reject there through ui/salary-change-view.js's flow (moved out of salary-structure.js,
// which uses it too); Approved / Rejected list the ones you decided and the ones you proposed, with who decided them and
// a rejection's note (round-12y-notes.md Y7.3). The payroll run's "Salary edits pending ... Not checked" check is
// computed (payroll-store.js waitingSalaryChanges()); approval-workflows.html marks Salary revision and Payroll run
// Active. ./js-pre12Z, ./html-pre12Z and ./css-pre12Z are the code, pages and css before this round (office-os 77b5ddb).
//   G  before;  P  Pending and the count, by who's signed in;  D  deciding from the inbox;  N  the decided tabs, the
//   proposer's view, Recently decided, the stats;  R  the payroll run's check;  W  the workflow page;  H  the inbox page;
//   S  the salary page's flow, shared;  A  the Admin dashboard's Pending approvals card;  E  no page errors;  X  scope
// Storage: the seed as it is, 20 Nov 11:00 (the inbox reads every decided request); for the payroll run, seeded on Fri
// 30 Oct 19:00 with October settled and approved (salchain's fixture), then 9 Dec.
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
setNow(2026, 11, 20);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", SNEHA = "EMP-1029", ROHAN = "EMP-1042", VIKRAM = "EMP-1088";
const SESSION = { fin: ["fin", "Kabir Shah", KABIR], admin: ["admin", "Aarav Mehta", AARAV], hr: ["hr", "Priya Nair", PRIYA], sneha: ["admin", "Sneha Rao", SNEHA] };

let loads = 0, w = null, d = null;
const allJsErrors = [];
let asked = [], answer = true;
async function open(page, who, query = "", js = "./js") {
  mem.set("officeos:session", JSON.stringify({ roleKey: who[0], userLabel: who[1], employeeId: who[2], signedInAt: NOW }));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/navigation|form submission/i.test(e.message)) allJsErrors.push(`${page}: ${e.message}`); });
  const html = fs.readFileSync(`${DIR}/${page}.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  asked = []; answer = true;
  w.confirm = (msg) => { asked.push(msg); return answer; };
  w.HTMLElement.prototype.scrollIntoView = () => {};
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`${js}/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); }
  }
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const safe = (fn) => { try { return fn(); } catch (e) { return { ok: false, error: `threw: ${e.message}` }; } };
const errOf = (r) => (r?.ok ? "ok" : r?.error ?? "no result");

const S = await import("./js/data/store.js");
const PS = await import("./js/data/payroll-store.js");
const OLDPS = await import("./js-pre12Z/data/payroll-store.js");   // before this round, on the same storage
const has = (name) => typeof PS[name] === "function";
const setup = (r, what) => { if (!r?.ok) console.log(`setup (${what}):`, errOf(r)); return r; };
const propose = (actor, who, gross, from) => safe(() => PS.proposeSalary(actor, who, { gross, effectiveFrom: from }));
const decide = (actor, id, decision, note) => safe(() => PS.decideSalaryProposal(actor, id, decision, note));
const proposal = (id) => PS.salaryProposals().find((p) => p.id === id) ?? null;

// The seed as it is, on 20 Nov 11:00; `sneha` makes Sneha a second Admin.
function plain({ sneha = false } = {}) {
  mem.clear(); setNow(2026, 10, 30, 19); S.getAllUsers(); PS.allSalaries(); setNow(2026, 11, 20);
  if (sneha) setup(safe(() => S.updateUser(AARAV, SNEHA, { role: "admin" })), "Sneha an Admin");
}
function rawEdit(key, match, change) {
  const box = JSON.parse(mem.get(`officeos:${key}`));
  box.records.filter(match).forEach(change);
  mem.set(`officeos:${key}`, JSON.stringify(box));
}
// salchain's fixture: pending leave cancelled and corrections rejected (so October and November settle), Vikram given a
// joining date, October prepared by Kabir and approved by Aarav on 9 Nov; then 20 Nov.
function settled() {
  mem.clear(); setNow(2026, 10, 30, 19); S.getAllUsers(); PS.allSalaries(); PS.payrollRun(2026, 10);
  rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
  rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
  S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });
  setNow(2026, 11, 9);
  setup(safe(() => PS.prepareRun(KABIR, 2026, 10)), "prepare 2026-10"); setup(safe(() => PS.approveRun(AARAV, 2026, 10)), "approve 2026-10");
  setNow(2026, 11, 20);
}
function novemberApprovedInStorage() {
  const box = JSON.parse(mem.get("officeos:payroll-runs") ?? '{"version":1,"nextNum":1,"records":[]}');
  const rows = PS.payrollRun(2026, 11).rows;
  box.records.push({ id: `PR-${box.nextNum}`, month: "2026-11", status: "approved", preparedBy: KABIR, preparedAt: "2026-12-09T11:00", approvedBy: AARAV, approvedAt: "2026-12-09T12:00", rows, totals: PS.runTotals({ rows }), history: [] });
  box.nextNum += 1;
  mem.set("officeos:payroll-runs", JSON.stringify(box));
}

const inbox = (who, js) => open("requests/approvals-inbox", who, "", js);
const realRows = () => [...d.querySelectorAll("#inbox-table tbody tr")].filter((tr) => !tr.hasAttribute("data-static") && tr.children.length > 1);
const salaryRows = () => realRows().filter((tr) => tr.dataset.type === "salary");
const cells = (tr) => [...(tr?.children ?? [])].slice(0, 5).map(txt);
const btns = (tr) => [...(tr?.querySelectorAll("button") ?? [])].map(txt);
const stat = (label) => txt([...d.querySelectorAll(".stat")].find((s) => txt(s.querySelector(".stat__label")) === label)?.querySelector(".stat__value"));
const navCount = () => Number(txt(d.querySelector(".nav__item[data-count-waiting] .nav__count")) || 0);
const pill = (label) => [...d.querySelectorAll(".table__toolbar .tabs__tab")].find((p) => txt(p).startsWith(label));
const pillCount = (label) => Number(txt(pill(label)?.querySelector(".badge--count")) || 0);
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => txt(t.querySelector(".toast__text")));
const typeSelect = () => d.querySelector('.table__toolbar select[aria-label="Filter by type"]');
const recent = () => [...d.querySelectorAll("#decided-table tbody tr")].filter((tr) => !tr.hasAttribute("data-static")).map((tr) => [...tr.children].map(txt).join(" | "));
const rejectModal = () => d.getElementById("reject-salary-modal");
function reject(note) {
  const m = rejectModal();
  if (!m) return;
  m.querySelector("textarea").value = note;
  m.querySelector("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
}
const NOTE = "Budget is frozen until April.";

// =================================================================
section("G. Before");
plain();
setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1");
await inbox(SESSION.admin, "./js-pre12Z");
const g1 = [realRows().filter((tr) => /Salary/.test(tr.textContent)).length, navCount(), realRows().length];
setup(decide(AARAV, "SP-1", "reject", NOTE), "SP-1 rejected");
await inbox(SESSION.fin, "./js-pre12Z");
pill("Rejected")?.click();
const g1b = d.body.textContent.includes(NOTE);
check("G1", "the code before: SP-1 (Kabir's, waiting) not in Aarav's inbox and not in his count (== his real Pending rows); rejected, its note nowhere in Kabir's inbox",
  g1[0] === 0 && g1[1] === g1[2] && !g1b, j([g1, g1b]));
settled(); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1"); setNow(2026, 12, 9);
await open("payroll/payroll-run", SESSION.fin, "?month=2026-11", "./js-pre12Z");
const g2 = [...d.querySelectorAll("#run-checks .list__item")].map((i) => txt(i.querySelector(".list__title")));
const g2s = txt([...d.querySelectorAll("#run-checks .list__item")].find((i) => /Salary/.test(i.textContent))?.querySelector(".list__sub"));
check("G2", "the code before: the run page's \"Salary edits pending\" says \"Not checked: salary change requests aren't built yet\" while November is held for SP-1", g2.includes("Salary edits pending") && g2s === "Not checked: salary change requests aren't built yet" && j(PS.runProblems(2026, 11)) === j(["1 salary change is waiting for a decision (Rohan Gupta)"]), j([g2s]));

// =================================================================
section("P. Pending, by who is signed in");
plain();
await inbox(SESSION.admin);
const p0 = [navCount(), realRows().length];
setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1");
await inbox(SESSION.admin);
const row = salaryRows()[0];
check("P1", "Aarav (Admin): one salary row: \"Salary: Rohan Gupta, ₹1,00,000\", Salary, requested by Kabir Shah, \"From 1 Nov 2026, now ₹92,000\", \"Just now\"; Reject / Approve",
  salaryRows().length === 1 && j(cells(row)) === j(["RGSalary: Rohan Gupta, ₹1,00,000", "Salary", "Kabir Shah", "From 1 Nov 2026, now ₹92,000", "Just now"]) && j(btns(row)) === j(["Reject", "Approve"]), j([cells(row), btns(row)]));
check("P2", "his sidebar count and \"Waiting for you\" go up by one, the count == his real Pending rows (ui/waiting.js counts it too)",
  navCount() === p0[0] + 1 && realRows().length === p0[1] + 1 && navCount() === realRows().length && Number(stat("Waiting for you")) === navCount(), j([p0, navCount(), realRows().length]));
const types = [...typeSelect().options].map(txt);
typeSelect().value = "salary"; typeSelect().dispatchEvent(new w.Event("change"));
check("P3", "a \"Salary\" type in the filter (last); chosen, only the salary row shows", types.at(-1) === "Salary" && realRows().length === 1 && realRows()[0].dataset.type === "salary"
  && d.querySelectorAll("#inbox-table tbody tr[data-static]").length === 0, j(types));
await inbox(SESSION.fin);
const p4 = [salaryRows().length, navCount()];
plain(); await inbox(SESSION.fin); const p4before = navCount();
check("P4", "Kabir (who proposed it): no salary row in Pending; his count as without it", p4[0] === 0 && p4[1] === p4before, j([p4, p4before]));
setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1");
await inbox(SESSION.hr);
check("P5", "Priya (HR: approvals:view, no salary:view): nothing about it, no Salary row, figure nowhere on the page",
  salaryRows().length === 0 && !d.body.textContent.includes("₹1,00,000") && !/Salary: /.test(d.body.textContent));
plain({ sneha: true }); setup(propose(KABIR, AARAV, 210000, "2026-12-01"), "Kabir proposes Aarav");
await inbox(SESSION.admin); const p6a = salaryRows().length;
await inbox(SESSION.sneha); const p6b = cells(salaryRows()[0]);
check("P6", "Sneha a second Admin, Kabir proposes Aarav's: not in Aarav's inbox (the person paid); in Sneha's", p6a === 0 && p6b[0] === "AMSalary: Aarav Mehta, ₹2,10,000", j([p6a, p6b]));
plain(); setup(propose(AARAV, ROHAN, 100000, "2026-12-01"), "Aarav's own change");
await inbox(SESSION.admin);
check("P7", "an Admin's own change (final at once): in no tab of his inbox", salaryRows().length === 0 && (pill("Approved")?.click(), salaryRows().length === 0));

plain(); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1"); setup(decide(AARAV, "SP-1", "reject", NOTE), "SP-1 rejected");
await inbox(SESSION.fin); pill("Rejected")?.click();
const p8a = salaryRows().length;
rawEdit("users", (u) => u.id === KABIR, (u) => { u.denyPermissions = ["salary:view"]; });   // an override, written into storage
await inbox(SESSION.fin); pill("Rejected")?.click();
check("P8", "Kabir with salary:view denied on his record (an override): his rejected change gone from his Rejected tab (it was there with it)",
  p8a === 1 && salaryRows().length === 0 && !d.body.textContent.includes(NOTE), j([p8a, salaryRows().length]));

// =================================================================
section("D. Deciding from the inbox");
plain(); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1");
await inbox(SESSION.admin);
const d0 = [navCount(), Number(stat("Approved this week"))];
salaryRows()[0]?.querySelectorAll("button")[1]?.click();
const d1 = proposal("SP-1");
check("D1", "Approve: confirm() names it as the salary page does; \"Salary change approved.\"; SP-1 approved by Aarav through setSalary() (Rohan's November ₹1,00,000); gone from Pending, the count down by one, \"Approved this week\" up by one",
  j(asked) === j(["Approve this request?\nRohan Gupta: ₹1,00,000 a month from 1 Nov 2026, proposed by Kabir Shah"]) && toasts().at(-1) === "Salary change approved."
  && d1?.status === "approved" && d1.decidedBy === AARAV && PS.salaryFor(ROHAN, 2026, 11)?.gross === 100000 && salaryRows().length === 0 && navCount() === d0[0] - 1
  && Number(stat("Approved this week")) === d0[1] + 1, j([asked, toasts().at(-1), d1?.status, navCount(), d0]));
pill("Approved")?.click();
check("D2", "the Approved tab: \"From 1 Nov 2026, you approved it\", decided 20 Nov, no buttons", j(cells(salaryRows()[0])) === j(["RGSalary: Rohan Gupta, ₹1,00,000", "Salary", "Kabir Shah", "From 1 Nov 2026, you approved it", "20 Nov"]) && btns(salaryRows()[0]).length === 0, j(cells(salaryRows()[0])));
plain(); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1");
await inbox(SESSION.admin);
answer = false; salaryRows()[0]?.querySelectorAll("button")[1]?.click(); answer = true;
const d3c = proposal("SP-1")?.status;
salaryRows()[0]?.querySelectorAll("button")[0]?.click();
const rm = rejectModal();
const d3 = [txt(rm?.querySelector(".modal__title")), txt(rm?.querySelector(".modal__desc")), rm?.querySelector("textarea")?.placeholder, txt(rm?.querySelector('button[type="submit"]'))];
reject("  ");
const d3e = [txt(rm?.querySelector(".form-error")), proposal("SP-1")?.status];
reject(NOTE);
check("D3", "Approve cancelled: nothing; Reject: the salary page's modal (\"Reject salary change\", the line, its placeholder, \"Reject change\"); an empty note refused under it; with a note: \"Salary change rejected.\", SP-1 rejected with it",
  d3c === "pending" && j(d3) === j(["Reject salary change", "Rohan Gupta: ₹1,00,000 a month from 1 Nov 2026, proposed by Kabir Shah", "Kept with the salary change; the employee doesn't see it", "Reject change"])
  && d3e[0] === "Add a note saying why the salary change is rejected." && d3e[1] === "pending" && toasts().at(-1) === "Salary change rejected." && proposal("SP-1")?.status === "rejected"
  && proposal("SP-1").history.at(-1).note === NOTE && salaryRows().length === 0, j([d3, d3e, toasts().at(-1)]));
plain(); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1"); novemberApprovedInStorage();
await inbox(SESSION.admin);
salaryRows()[0]?.querySelectorAll("button")[1]?.click();
check("D4", "refused at approval (November approved since, in storage): setSalary()'s words as a toast; still waiting, still listed",
  toasts().at(-1) === "November 2026's payroll is already approved, so a salary can take effect only after it." && proposal("SP-1")?.status === "pending" && salaryRows().length === 1, j(toasts().at(-1)));

// =================================================================
section("N. The decided tabs: who decided, and why");
plain(); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1"); setup(decide(AARAV, "SP-1", "reject", NOTE), "SP-1 rejected");
setup(propose(KABIR, VIKRAM, 70000, "2026-12-01"), "SP-2"); setup(decide(AARAV, "SP-2", "approve"), "SP-2 approved");
setup(propose(KABIR, SNEHA, 125000, "2026-12-01"), "SP-3"); setup(safe(() => PS.withdrawSalaryProposal(KABIR, "SP-3")), "SP-3 withdrawn");
await inbox(SESSION.fin);
pill("Rejected")?.click();
const n1 = salaryRows().map(cells);
pill("Approved")?.click();
const n2 = salaryRows().map(cells);
check("N1", "Kabir's Rejected tab: his SP-1 with who rejected it and the note, \"From 1 Nov 2026, Aarav Mehta rejected it: Budget is frozen until April.\"; Approved: SP-2, \"Aarav Mehta approved it\"; the withdrawn SP-3 in neither",
  j(n1) === j([["RGSalary: Rohan Gupta, ₹1,00,000", "Salary", "Kabir Shah", `From 1 Nov 2026, Aarav Mehta rejected it: ${NOTE}`, "20 Nov"]])
  && j(n2) === j([["VSSalary: Vikram Singh, ₹70,000", "Salary", "Kabir Shah", "From 1 Dec 2026, Aarav Mehta approved it", "20 Nov"]]), j([n1, n2]));
check("N2", "Kabir's Recently decided card and his stats don't take them (not his decisions)", !recent().some((r) => /Salary/.test(r)) && stat("Approved this week") === "0" && stat("Rejected this week") === "0", j([recent(), stat("Approved this week")]));
await inbox(SESSION.admin);
pill("Rejected")?.click();
const n3 = salaryRows().map(cells);
check("N3", "Aarav's Rejected tab: \"you rejected it\" with the note; his Recently decided lists both (requested by Kabir Shah); his week's stats count them",
  j(n3) === j([["RGSalary: Rohan Gupta, ₹1,00,000", "Salary", "Kabir Shah", `From 1 Nov 2026, you rejected it: ${NOTE}`, "20 Nov"]])
  && recent().filter((r) => /Salary/.test(r)).length === 2 && recent().includes("Salary: Rohan Gupta, ₹1,00,000 | Salary | Kabir Shah | Rejected | 20 Nov")
  && Number(stat("Rejected this week")) >= 1, j([n3, recent().filter((r) => /Salary/.test(r))]));
plain();
const markup = "Not now <b>bold</b>";
setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1"); setup(decide(AARAV, "SP-1", "reject", markup), "rejected with markup");
await inbox(SESSION.fin); pill("Rejected")?.click();
check("N4", "a note with markup shows as text, no element made", cells(salaryRows()[0])[3] === `From 1 Nov 2026, Aarav Mehta rejected it: ${markup}` && !salaryRows()[0]?.querySelector("b"));
await inbox(SESSION.hr); pill("Rejected")?.click();
check("N5", "Priya (no salary:view): no salary row in Rejected either", salaryRows().length === 0);

plain({ sneha: true }); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1"); setup(decide(AARAV, "SP-1", "reject", NOTE), "SP-1 rejected by Aarav");
await inbox(SESSION.sneha); pill("Rejected")?.click();
check("N6", "Sneha (another Admin): Aarav's decision on Kabir's change isn't in her tabs (neither hers nor proposed by her)", salaryRows().length === 0);

// =================================================================
section("R. The payroll run's check");
const checkOf = () => { const i = [...d.querySelectorAll("#run-checks .list__item")].find((x) => /Salary/.test(txt(x.querySelector(".list__title")))); return [txt(i?.querySelector(".list__title")), txt(i?.querySelector(".list__sub")), txt(i?.lastElementChild), i?.lastElementChild?.className, i?.dataset.check]; };
settled(); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1"); setNow(2026, 12, 9);
await open("payroll/payroll-run", SESSION.fin, "?month=2026-11");
const r1 = checkOf();
check("R1", "9 Dec, SP-1 waiting for November: \"Salary changes waiting\", \"1 salary change is waiting for a decision (Rohan Gupta)\" (runProblems()'s words), \"In progress\", computed",
  j(r1) === j(["Salary changes waiting", "1 salary change is waiting for a decision (Rohan Gupta)", "In progress", "badge badge--info", "computed"]), j(r1));
setup(decide(AARAV, "SP-1", "approve"), "SP-1 approved");
await open("payroll/payroll-run", SESSION.fin, "?month=2026-11");
const r2 = checkOf();
check("R2", "decided: \"No salary change for November 2026 is waiting for a decision\", Done", j(r2) === j(["Salary changes waiting", "No salary change for November 2026 is waiting for a decision", "Done", "badge badge--success", "computed"]), j(r2));
// the store: waitingSalaryChanges() is what runProblems() names, and runProblems() is unchanged
const grid = [];
for (const [who, gross, from] of [[ROHAN, 100000, "2026-11-01"], [VIKRAM, 70000, "2026-12-01"], [SNEHA, 125000, "2027-01-01"]]) {
  settled(); setup(propose(KABIR, who, gross, from), `${who} from ${from}`); setNow(2026, 12, 9);
  for (const [y, m] of [[2026, 11], [2026, 12], [2027, 1]]) {
    const ws = has("waitingSalaryChanges") ? PS.waitingSalaryChanges(y, m).map((p) => p.id) : null;
    grid.push([`${who} ${from} ${y}-${m}`, j(ws), j(PS.runProblems(y, m)) === j(OLDPS.runProblems(y, m)), PS.runProblems(y, m).some((l) => /salary change/.test(l)) === (ws?.length > 0)]);
  }
}
check("R3", "waitingSalaryChanges(): the months a waiting change holds (Nov: from 1 Nov; Dec: from 1 Nov or 1 Dec; Jan: not from 2027 yet... as runProblems() names them); runProblems() the same as before over 9 cases",
  grid.every(([, , same, agrees]) => same && agrees) && j(grid.map(([, ws]) => ws)) === j(['["SP-1"]', '["SP-1"]', '["SP-1"]', "[]", '["SP-1"]', '["SP-1"]', "[]", "[]", '["SP-1"]']), j(grid));
check("R4", "waitingSalaryChanges(): no month, nothing", has("waitingSalaryChanges") && j(PS.waitingSalaryChanges(2026, 13)) === "[]" && j(PS.waitingSalaryChanges("x", 1)) === "[]");

// =================================================================
section("W. The workflow page");
plain(); await open("access/approval-workflows", SESSION.admin);
const wf = [...d.querySelectorAll("table tbody tr")].map((tr) => [txt(tr.querySelector(".table__user-name")), txt(tr.children[2]), txt(tr.children[3])]);
check("W1", "Salary revision and Payroll run Active (Salary revision: \"Every change. An Admin's own takes effect at once\"); the others as before (Purchase order, Role change, Backup restore Not built)",
  j(wf) === j([["Leave", "All leave types. No manager on file: straight to HR", "Active"], ["Attendance regularization", "Sent within 7 days. No manager on file: straight to HR", "Active"],
    ["Expense claim", "Admin added above ₹50,000. A stage nobody else can decide is skipped", "Active"], ["Purchase order", "Two other Admins above ₹1,00,000", "Not built"],
    ["Role change", "Every change", "Not built"], ["Salary revision", "Every change. An Admin's own takes effect at once", "Active"],
    ["Payroll run", "The person who prepared it can't approve it", "Active"], ["Asset request", "Every request", "Active"], ["Backup restore", "Admin only", "Not built"]]), j(wf));
check("W2", "the rules note and the alert say what's built",
  txt([...d.querySelectorAll(".card")].find((c) => /Rules for every workflow/.test(c.textContent))?.querySelector(".form-hint")) === "Every active workflow enforces both (a payroll run is never rejected: it's approved, or prepared again), and neither can be turned off. An Admin's own requests and salary changes are approved automatically."
  && txt(d.querySelector(".alert--info")) === "The person who prepared a payroll run can't approve it: an Admin who didn't prepare it approves it on the run page.");

const wstat = [...d.querySelectorAll(".stat")].find((x) => txt(x.querySelector(".stat__label")) === "Workflows");
check("W3", "the Workflows stat: 9, \"6 active, 3 not built yet\" (the table's own count)", txt(wstat?.querySelector(".stat__value")) === "9" && txt(wstat?.querySelector(".stat__delta")) === "6 active, 3 not built yet"
  && wf.filter(([, , st]) => st === "Active").length === 6 && wf.filter(([, , st]) => st === "Not built").length === 3, txt(wstat));

// =================================================================
section("H. The inbox page");
plain(); await inbox(SESSION.admin);
check("H1", "Who approves what: \"Salary revisions: Finance, then an Admin\"", txt([...d.querySelectorAll("#who-approves .kv__row")].find((r) => /Salary/.test(r.textContent))) === "Salary revisionsFinance, then an Admin");

// =================================================================
section("S. The salary page's flow, shared");
plain(); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1");
await open("payroll/salary-structure", SESSION.admin);
const sRow = [...d.querySelectorAll("#salary-rows tr")].find((r) => r.textContent.includes("Rohan Gupta"));
[...(sRow?.querySelectorAll("button") ?? [])].find((b) => txt(b) === "Approve")?.click();
check("S1", "Approve on the salary page: the same confirm() and toast, approved", j(asked) === j(["Approve this request?\nRohan Gupta: ₹1,00,000 a month from 1 Nov 2026, proposed by Kabir Shah"]) && toasts().at(-1) === "Salary change approved." && proposal("SP-1")?.status === "approved", j([asked, toasts()]));
const HERE = new URL(".", import.meta.url);
const srcAt = (dir, p) => fs.readFileSync(new URL(`${dir}/${p}`, HERE), "utf8");
const ss = srcAt("./js", "pages/salary-structure.js");
check("S2", "salary-structure.js no longer builds the flow: it imports describeChange / salaryChangeFlow from ui/salary-change-view.js, which is the only createDecisionFlow() for salary changes",
  !/createDecisionFlow/.test(ss) && ss.includes('import { describeChange, salaryChangeFlow } from "../ui/salary-change-view.js";') && /createDecisionFlow\(/.test(srcAt("./js", "ui/salary-change-view.js")));

// =================================================================
section("A. The Admin dashboard's Pending approvals card (it lists waitingFor()'s rows)");
plain(); setup(propose(KABIR, ROHAN, 100000, "2026-11-01"), "SP-1");
await open("dashboard/admin", SESSION.admin);
const items = [...d.querySelectorAll("#admin-approvals .list__item")].map((i) => [txt(i.querySelector(".list__title")), txt(i.querySelector(".list__sub"))]);
const meta = txt(d.querySelector("#admin-approvals .card__meta"));
check("A1", "Aarav's dashboard with SP-1 waiting: the card draws (no error), SP-1 first (proposed today) as \"Salary change: Rohan Gupta\", \"₹1,00,000 a month from 1 Nov 2026, proposed by Kabir Shah\"; \"4 of N shown\", N the Approvals count",
  j(items[0]) === j(["Salary change: Rohan Gupta", "₹1,00,000 a month from 1 Nov 2026, proposed by Kabir Shah"]) && items.length === 4 && meta === `4 of ${navCount()} shown` && navCount() > 4
  && !allJsErrors.some((e) => /dashboard/.test(e)), j([items[0], meta, navCount()]));
setup(propose(KABIR, VIKRAM, 70000, "2026-12-01"), "SP-2");
await open("dashboard/admin", SESSION.admin);
const items2 = [...d.querySelectorAll("#admin-approvals .list__item")].map((i) => txt(i.querySelector(".list__title")));
check("A2", "two waiting (SP-1, SP-2, both today): the card draws, the newer SP-2 first, then SP-1",
  j(items2.slice(0, 2)) === j(["Salary change: Vikram Singh", "Salary change: Rohan Gupta"]) && !allJsErrors.some((e) => /dashboard/.test(e)), j(items2));

// =================================================================
section("E. What stays");
check("E1", "no page script failed anywhere in this suite", allJsErrors.length === 0, j(allJsErrors.slice(0, 3)));

// =================================================================
section("X. Scope");
const walk = (dir, base = "") => fs.readdirSync(new URL(`${dir}/${base}`, HERE), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])).sort();
// Round 13B (layout, X1; was the live js): 12Z's own change set (js-pre13B = 250f083); the live js: relief.mjs X1
const jsNow = walk("./js-pre13B"), jsPre = walk("./js-pre12Z");
const changedJs = jsNow.filter((p) => !jsPre.includes(p) || srcAt("./js-pre13B", p) !== srcAt("./js-pre12Z", p));
check("X1", "js: one file added (ui/salary-change-view.js), six changed (data/payroll-store.js, pages/admin-dashboard.js, pages/approvals-inbox.js, pages/payroll-run.js, pages/salary-structure.js, ui/waiting.js), none removed",
  j(changedJs) === j(["data/payroll-store.js", "pages/admin-dashboard.js", "pages/approvals-inbox.js", "pages/payroll-run.js", "pages/salary-structure.js", "ui/salary-change-view.js", "ui/waiting.js"])
  && j(jsNow.filter((p) => !jsPre.includes(p))) === j(["ui/salary-change-view.js"]) && jsPre.every((p) => jsNow.includes(p)), j(changedJs));
// Round 13N (layout, X2; was the live pages): 12Z's own pages, html-pre13N (173c8ce) against html-pre12Z; the live
// pages: resetcard.mjs X2
const pagesNow = walk("./html-pre13N").filter((f) => f.endsWith(".html"));
const changedPages = pagesNow.filter((p) => srcAt("./html-pre13N", p) !== srcAt("./html-pre12Z", p));
check("X2", "two pages changed (access/approval-workflows.html, requests/approvals-inbox.html), none added; no css changed",
  j(changedPages) === j(["access/approval-workflows.html", "requests/approvals-inbox.html"]) && j(pagesNow) === j(walk("./html-pre12Z").filter((p) => p.endsWith(".html")))
  && walk("./css-pre12Z").every((p) => srcAt("./css-pre13U", p) /* Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3 */ === srcAt("./css-pre12Z", p)), j(changedPages));
const crlf = (s) => !s.endsWith("\n") && !/(^|[^\r])\n/.test(s);
check("X3", "CRLF, no final newline: the seven js files and the two pages",
  changedJs.every((p) => crlf(srcAt("./js", p))) && changedPages.every((p) => crlf(fs.readFileSync(`${DIR}/${p}`, "utf8"))));
const codeOf = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l));
const added = (now, pre) => codeOf(now).filter((l) => !codeOf(pre).includes(l));
const fn = (s, name) => { const a = s.search(new RegExp(`\\n(export )?function ${name}\\(`)); return a < 0 ? "" : s.slice(a, s.indexOf("\r\n}", a) + 3); };
// Round 13D (layout, X4; was the live payroll-store.js): as 2d67e81 has it (js-pre13D); the live one: tdsyear.mjs X4
const [ps, psP] = [srcAt("./js-pre13D", "data/payroll-store.js"), srcAt("./js-pre12Z", "data/payroll-store.js")];
const SAME = ["setSalary", "proposeSalary", "decideSalaryProposal", "withdrawSalaryProposal", "salaryProposals", "pendingSalaryProposal", "proposalDecidersFor", "prepareRun", "approveRun", "prepareProblem", "approveProblem", "payrollRun"];
check("X4", "payroll-store.js: runProblems() calls the moved filter (salaryChangesHolding(), the same expression), waitingSalaryChanges() added; the chain and the run functions byte for byte",
  SAME.every((f) => fn(ps, f) === fn(psP, f) && fn(ps, f).length > 40) && fn(ps, "runProblems").includes("const salaryChanges = salaryChangesHolding(first, inRun);")
  && fn(ps, "salaryChangesHolding").includes('return storedProposals().filter((p) => p.status === "pending" && inRun.has(p.userId) && p.effectiveFrom <= first')
  && j(added(ps, psP).filter((l) => !/^\s*$/.test(l))) === j([
    '  const salaryChanges = salaryChangesHolding(first, inRun);', "function salaryChangesHolding(first, inRun) {",
    '  return storedProposals().filter((p) => p.status === "pending" && inRun.has(p.userId) && p.effectiveFrom <= first',
    "export function waitingSalaryChanges(year, month) {", "  if (!validMonth(y, m)) return [];",
    '  return salaryChangesHolding(`${monthKey(y, m)}-01`, new Set(payrollRun(y, m).rows.map((r) => r.userId)));']), j(added(ps, psP)));
const [pr, prP] = [srcAt("./js-pre14A", "pages/payroll-run.js"), srcAt("./js-pre12Z", "pages/payroll-run.js")];   // Round 14A (layout; was the live js): 9c7423e's, frozen; the live js: jsguard.mjs
check("X5", "payroll-run.js: the import, salaryCheck() and its one call in place of the placeholder; the rest of renderChecks() and the page the same",
  pr.replace(/\r\n\/\/ Salary changes waiting[\s\S]*?\r\n}\r\n\r\n(?=function renderChecks)/, "\r\n").replace("    salaryCheck(run, label, done),", '    checkItem("Salary edits pending",\r\n      "Not checked: salary change requests aren\'t built yet",\r\n      "badge", "Not tracked", "placeholder"),').replace(", runMonth, waitingSalaryChanges }", ", runMonth }") === prP);

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
