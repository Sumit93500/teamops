// usage: node managerid.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 9V: the reporting manager is kept by id, so a namesake or a rename no longer drops the manager stage (9V's
// investigation: a second "Sneha Rao", or renaming her, sent her reports' new requests straight to HR while both
// profile pages still named her). In jsdom with the js in ./js; ./js-pre9V, ./html-pre9V and ./css-pre9V are the code,
// pages and styles before this round (office-os 0518d14). Clock fixed at Thu 8 Oct 2026 10:00.
//   A  the store: every record keeps reportingManagerId beside the name; a name given alone is matched once, when saved;
//      records saved before 9V get their id once, when loaded
//   B  user-form.html end to end: the manager list by id; HR and the Admin set, change and clear a manager
//   N  a namesake: a second "Sneha Rao" leaves Sneha's reports with Sneha                    (the brief's regression)
//   R  a rename: Sneha renamed keeps her reports, and both profile pages show the new name   (the brief's regression)
//   P  policy unchanged (decisions 1, 3, 4): HR naming herself, a Finance double, no manager: all as before
//   C  the seed's Kabir -> Meera double documented beside Aarav's; comments only
//   X  the change set; no page, no css; no errors
import fs from "fs";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const DIR = process.argv[2] ?? new URL("../w/pages", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const HERE = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const RAW = (p) => fs.readFileSync(`${DIR}/${p}`, "utf8");
const SRC = (dir, p) => fs.readFileSync(`${HERE}${dir}/${p}`, "utf8");

const RealDate = Date;
let NOW = 0;
const setNow = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
setNow(2026, 10, 8);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
URL.createObjectURL = () => "blob:test";
URL.revokeObjectURL = () => {};

const WHO = { aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"], kabir: ["fin", "Kabir Shah", "EMP-1008"], arjun: ["emp", "Arjun Kapoor", "EMP-1105"] };
let loads = 0, w = null, d = null, saved = {};
const jsErrors = [], navigations = [];
async function open(who, page, script, query = "") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => (/navigation/i.test(e.message) ? navigations : jsErrors).push(`${who} ${page}: ${e.message}`));
  const dom = new JSDOM(RAW(page), { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  Object.entries(saved).forEach(([k, v]) => w.localStorage.setItem(k, v));
  Object.assign(globalThis, { window: w, document: d, localStorage: w.localStorage, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement });
  loads++;
  (await import("./js/core/auth.js")).signIn(...WHO[who]);
  navigations.length = 0;
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
const walk = (root, rel = "") => fs.readdirSync(`${root}/${rel}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${rel}${e.name}/`) : [`${rel}${e.name}`]));
const safe = (f) => { try { return f(); } catch (e) { return `threw: ${e.message}`; } };

const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const L = await import("./js/data/leave-store.js");
const E = await import("./js/data/expenses-store.js");
const A = await import("./js/data/attendance-store.js");
const Q = await import("./js/data/asset-requests-store.js");
const UF = "users/user-form.html";
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029", ROHAN = "EMP-1042", DIVYA = "EMP-1061", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const $ = (id) => d.getElementById(id);
const submit = () => d.querySelector("form").dispatchEvent(new w.Event("submit", { cancelable: true }));
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${t.className.replace("toast toast--", "")}:${txt(t.querySelector(".toast__text"))}`);
const mgr = (id) => { const u = S.getUser(id); return u && [u.reportingManagerId, u.reportingManager]; };
const managerOptions = () => [...$("manager").options].map((o) => [o.value, o.textContent]);
const selectedManager = () => [$("manager").value, txt($("manager").selectedOptions[0])];
const pickManager = (label, nth = 0) => { const o = [...$("manager").options].filter((x) => x.textContent === label)[nth]; if (o) $("manager").value = o.value; return Boolean(o); };
const kv = (label) => txt([...d.querySelectorAll(".kv__row")].find((r) => txt(r.querySelector("dt")) === label)?.querySelector("dd"));
const leaveOf = (id, day = "2026-10-12") => L.applyLeave(id, { type: "casual", from: day, to: day, reason: "x" });
const decideL = (rid, id, role) => L.decideLeave(rid, id, role, "approve");
const claim = (id, amount = 400) => E.submitExpense(id, { category: "meals", amount, date: "2026-10-07", reason: "x", receipt: "bill.pdf" });
const assetReq = (id) => Q.submitAssetRequest(id, { assetType: "monitor", reason: "x" });
function correction(id) {   // the first correction the attendance rules accept in the last week
  for (let day = 7; day >= 1; day--) for (const issue of ["missed-check-out", "late-arrival", "missed-check-in"]) {
    const r = A.requestRegularization(id, { date: `2026-10-0${day}`, issue, time: issue === "missed-check-out" ? "18:30" : "09:30", reason: "x" });
    if (r.ok) return r;
  }
  return { ok: false };
}
const first = (r) => (r?.ok ? [r.record.stage, r.record.managerId] : ["refused", r?.error]);
// Every kind of new request from this person: where it goes first (stage, managerId)
const allFirst = (id) => [first(leaveOf(id)), first(correction(id)), first(claim(id)), first(assetReq(id))];
const toSneha = j(Array(4).fill(["manager", SNEHA]));
const users = () => JSON.parse(localStorage.getItem("officeos:users"));

// =====================================================================
section("A. The store keeps the manager by id");
fresh(); await open("aarav", "dashboard/admin.html", null);
const seeded = Object.fromEntries([AARAV, PRIYA, KABIR, ANANYA, MEERA, SNEHA, ROHAN, DIVYA, VIKRAM, ARJUN].map((id) => [id, mgr(id)]));
check("A1", "the seed: every record has reportingManagerId beside the name; Priya / Kabir -> Aarav, Rohan / Arjun -> Sneha, Meera -> Kabir; Aarav's 'Rahul Deshmukh' (not on record) kept by name, with no id",
  S.getAllUsers().every((u) => "reportingManagerId" in u) && j(seeded) === j({ [AARAV]: [null, "Rahul Deshmukh"], [PRIYA]: [AARAV, "Aarav Mehta"], [KABIR]: [AARAV, "Aarav Mehta"],
    [ANANYA]: [null, undefined], [MEERA]: [KABIR, "Kabir Shah"], [SNEHA]: [null, undefined], [ROHAN]: [SNEHA, "Sneha Rao"], [DIVYA]: [null, undefined], [VIKRAM]: [null, undefined], [ARJUN]: [SNEHA, "Sneha Rao"] }), j(seeded));
check("A2", "managerFor() from the seed is what it was (Arjun, Rohan -> Sneha; Priya, Kabir -> Aarav; Meera, on leave herself, -> Kabir; Ananya, Vikram, Aarav: none)",
  j([ARJUN, ROHAN, PRIYA, KABIR, MEERA, ANANYA, VIKRAM, AARAV].map((id) => L.managerFor(id))) === j([SNEHA, SNEHA, AARAV, AARAV, KABIR, null, null, null]),
  j([ARJUN, ROHAN, PRIYA, KABIR, MEERA, ANANYA, VIKRAM, AARAV].map((id) => L.managerFor(id))));
let r = S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { reportingManagerId: KABIR });
const byId = mgr(ARJUN), noneR = (S.updateUser(USER_ACTOR("admin", ROHAN), ROHAN, { reportingManagerId: null }), mgr(ROHAN));
// a form opened before a rename sends the old label with the id: the person's own (current) name is what's saved
const staleLabel = (S.updateUser(USER_ACTOR("admin", VIKRAM), VIKRAM, { reportingManagerId: SNEHA, reportingManager: "Someone Else" }), mgr(VIKRAM));
check("A3", "saved by id: the name is the person's own, whatever label came with it; null is no manager ('')",
  r.ok && j(byId) === j([KABIR, "Kabir Shah"]) && L.managerFor(ARJUN) === KABIR && j(noneR) === j([null, ""]) && L.managerFor(ROHAN) === null && j(staleLabel) === j([SNEHA, "Sneha Rao"]), j([byId, noneR, staleLabel]));
const unknown = safe(() => S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { reportingManagerId: "EMP-9999" })), self = safe(() => S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { reportingManagerId: ARJUN }));
check("A4", "an unknown id, or the person themselves, is refused on the manager field, and nothing is saved",
  !unknown?.ok && unknown?.error === "No employee with id EMP-9999." && unknown?.field === "manager" && !self?.ok && self?.error === "Someone can't be their own reporting manager." && self?.field === "manager"
  && j(mgr(ARJUN)) === j([KABIR, "Kabir Shah"]), j([unknown, self]));
fresh(); await open("aarav", "dashboard/admin.html", null);
S.updateUser(USER_ACTOR("admin", ROHAN), ROHAN, { reportingManager: "Kabir Shah" });
const legacyName = mgr(ROHAN);
S.updateUser(USER_ACTOR("admin", VIKRAM), VIKRAM, { reportingManager: "Rahul Deshmukh" });
const noRecord = mgr(VIKRAM);
S.updateUser(USER_ACTOR("admin", ANANYA), ANANYA, { reportingManager: "Divya Menon" });
const inactiveName = mgr(ANANYA);
check("A5", "a name given without an id (callers from before 9V) is matched once, when saved: Kabir's id; a name not on record has no id and keeps the name; an inactive person's id is kept (and resolves to no manager while inactive)",
  j(legacyName) === j([KABIR, "Kabir Shah"]) && j(noRecord) === j([null, "Rahul Deshmukh"]) && j(inactiveName) === j([DIVYA, "Divya Menon"]) && L.managerFor(ANANYA) === null
  && (S.reactivateUser(USER_ACTOR("admin", DIVYA), DIVYA), L.managerFor(ANANYA) === DIVYA), j([legacyName, noRecord, inactiveName]));
fresh(); await open("aarav", "dashboard/admin.html", null);
const twin = S.addUser(USER_ACTOR("admin", null), { name: "Sneha Rao", email: "sneha.rao2@northwind.com", department: "SAL" }).record;
S.updateUser(USER_ACTOR("admin", ROHAN), ROHAN, { reportingManager: "Sneha Rao" });
const ambiguous = mgr(ROHAN);
S.updateUser(USER_ACTOR("admin", twin.id), twin.id, { status: "inactive", dateOfLeaving: LEAVING_11Y() });
S.updateUser(USER_ACTOR("admin", ROHAN), ROHAN, { reportingManager: "Sneha Rao" });
const activeOne = mgr(ROHAN);
check("A6", "two people with that name when it's saved: no id (as the old rule); with only one of them active, the active one",
  j(ambiguous) === j([null, "Sneha Rao"]) && j(activeOne) === j([SNEHA, "Sneha Rao"]), j([ambiguous, activeOne]));
const added = S.addUser(USER_ACTOR("admin", null), { name: "Test Hire", email: "test.hire@northwind.com", department: "ENG", reportingManagerId: SNEHA }).record;
const addedPlain = S.addUser(USER_ACTOR("admin", null), { name: "Test Plain", email: "test.plain@northwind.com", department: "ENG" }).record;
check("A7", "addUser: by id, as updateUser; with no manager given, reportingManagerId null",
  j([added?.reportingManagerId, added?.reportingManager]) === j([SNEHA, "Sneha Rao"]) && "reportingManagerId" in (addedPlain ?? {}) && addedPlain.reportingManagerId === null, j([added, addedPlain].map((u) => u && [u.reportingManagerId, u.reportingManager])));
// a users box saved before 9V: no reportingManagerId anywhere, version 3 as now
fresh(); await open("aarav", "dashboard/admin.html", null);
S.updateUser(USER_ACTOR("admin", ROHAN), ROHAN, { phone: "+91 90000 00001" });
{ const box = users(); box.records.forEach((u) => delete u.reportingManagerId); localStorage.setItem("officeos:users", j(box)); }
const migrated = [ARJUN, ROHAN, PRIYA, AARAV].map(mgr);
const storedNow = users();
check("A8", "a users box saved before 9V (no ids): each manager matched by name once, when loaded, and saved; the box isn't re-seeded (an edit in it survives)",
  j(migrated) === j([[SNEHA, "Sneha Rao"], [SNEHA, "Sneha Rao"], [AARAV, "Aarav Mehta"], [null, "Rahul Deshmukh"]]) && storedNow.records.every((u) => "reportingManagerId" in u)
  && storedNow.version === 3 && S.getUser(ROHAN).phone === "+91 90000 00001", j(migrated));
S.addUser(USER_ACTOR("admin", null), { name: "Sneha Rao", email: "sneha.rao2@northwind.com", department: "SAL" });
check("A9", "…and a namesake added after that changes nothing", L.managerFor(ARJUN) === SNEHA && L.managerFor(ROHAN) === SNEHA);

// =====================================================================
section("B. user-form.html, end to end");
fresh(); await open("priya", UF, "user-form", `?id=${ARJUN}`);
const opts = managerOptions();
check("B1", "HR's form for Arjun: the manager list is valued by id, labelled by name (active people, not Arjun), Sneha selected",
  j(opts) === j([["", "No reporting manager"], [AARAV, "Aarav Mehta"], [PRIYA, "Priya Nair"], [KABIR, "Kabir Shah"], [ANANYA, "Ananya Iyer"], [SNEHA, "Sneha Rao"], [ROHAN, "Rohan Gupta"], [VIKRAM, "Vikram Singh"]])
  && j(selectedManager()) === j([SNEHA, "Sneha Rao"]), j([opts, selectedManager()]));
pickManager("Rohan Gupta"); submit();
check("B2", "HR picks Rohan Gupta and saves: stored by id with his name; Arjun's new requests go to Rohan",
  j(toasts()) === j(["success:Employee saved."]) && j(mgr(ARJUN)) === j([ROHAN, "Rohan Gupta"]) && L.managerFor(ARJUN) === ROHAN, j([toasts(), mgr(ARJUN)]));
await open("priya", UF, "user-form", `?id=${ARJUN}`);
const reopened = selectedManager();
pickManager("No reporting manager"); submit();
check("B3", "reopened, Rohan is selected; HR picks 'No reporting manager': saved as none ('' and null)",
  j(reopened) === j([ROHAN, "Rohan Gupta"]) && j(mgr(ARJUN)) === j([null, ""]) && L.managerFor(ARJUN) === null, j([reopened, mgr(ARJUN)]));
await open("aarav", UF, "user-form", `?id=${ARJUN}`);
pickManager("Kabir Shah"); submit();
check("B4", "the Admin sets a manager the same way (Kabir)", j(toasts()) === j(["success:Employee saved."]) && j(mgr(ARJUN)) === j([KABIR, "Kabir Shah"]), j(mgr(ARJUN)));
await open("priya", UF, "user-form");
$("first-name").value = "New"; $("last-name").value = "Hire"; $("work-email").value = "new.hire@northwind.com"; $("department").value = "ENG";
pickManager("Sneha Rao"); submit();
const hire = S.getAllUsers().find((u) => u.email === "new.hire@northwind.com");
check("B5", "HR adds a new employee with Sneha as manager: stored by id; their first leave goes to Sneha",
  j(hire && [hire.reportingManagerId, hire.reportingManager]) === j([SNEHA, "Sneha Rao"]) && hire && first(leaveOf(hire.id))[1] === SNEHA, j(hire && mgr(hire.id)));
fresh(); await open("aarav", UF, "user-form", `?id=${AARAV}`);
const rahulShown = selectedManager();
$("phone").value = "+91 98100 11224"; submit();
check("B6", "Aarav's manager 'Rahul Deshmukh' (not on record) is shown selected and survives a save unchanged, still with no id",
  rahulShown[1] === "Rahul Deshmukh" && j(toasts()) === j(["success:Employee saved."]) && j(mgr(AARAV)) === j([null, "Rahul Deshmukh"]) && S.getUser(AARAV).phone === "+91 98100 11224", j([rahulShown, mgr(AARAV)]));
fresh(); await open("priya", "dashboard/hr.html", null);
S.updateUser(USER_ACTOR("admin", ARJUN), ARJUN, { reportingManagerId: DIVYA });
await open("priya", UF, "user-form", `?id=${ARJUN}`);
const divyaShown = selectedManager();
$("phone").value = "+91 90000 00002"; submit();
check("B7", "an inactive manager (Divya) isn't offered to others but stays selected on Arjun's form, and survives a save unchanged",
  j(divyaShown) === j([DIVYA, "Divya Menon"]) && j(mgr(ARJUN)) === j([DIVYA, "Divya Menon"]) && S.getUser(ARJUN).phone === "+91 90000 00002", j([divyaShown, mgr(ARJUN)]));

// =====================================================================
section("N. A namesake no longer drops the manager stage");
fresh(); await open("priya", UF, "user-form");
$("first-name").value = "Sneha"; $("last-name").value = "Rao"; $("work-email").value = "sneha.rao2@northwind.com"; $("department").value = "SAL";
submit();
const twin2 = S.getAllUsers().find((u) => u.email === "sneha.rao2@northwind.com");
check("N1", "HR adds a second 'Sneha Rao' (Sales) in the form: saved", Boolean(twin2) && j(toasts()) === j(["success:Employee saved."]) && S.getAllUsers().filter((u) => u.name === "Sneha Rao").length === 2);
check("N2", "Arjun and Rohan still have Sneha (EMP-1029) as their manager", L.managerFor(ARJUN) === SNEHA && L.managerFor(ROHAN) === SNEHA, j([L.managerFor(ARJUN), L.managerFor(ROHAN)]));
const nFirst = allFirst(ARJUN);
check("N3", "Arjun's new leave, correction, expense claim and asset request all go to Sneha at the manager stage (was: straight to HR / skipped)", j(nFirst) === toSneha, j(nFirst));
const nLeave = L.requestsFor(ARJUN).find((x) => x.status === "pending" && x.from === "2026-10-12");
check("N4", "…and HR can't decide that manager stage: 'Only Sneha Rao, the requester's manager…'", decideL(nLeave?.id, PRIYA, "hr").error === "Only Sneha Rao, the requester's manager, can decide this request now.");
await open("priya", "users/user-profile.html", "user-profile", `?id=${ARJUN}`);
const nProfile = [kv("Reporting manager"), kv("Approval chain")];
check("N5", "Arjun's profile: Reporting manager 'Sneha Rao' and Approval chain 'Sneha Rao, then HR or an Admin' agree", j(nProfile) === j(["Sneha Rao", "Sneha Rao, then HR or an Admin"]), j(nProfile));
await open("priya", UF, "user-form", `?id=${VIKRAM}`);
const twins = managerOptions().filter(([, label]) => label === "Sneha Rao");
pickManager("Sneha Rao", 1); submit();
check("N6", "the form offers both Sneha Raos as separate choices (two ids); HR gives Vikram the new one, and only he goes to her",
  twins.length === 2 && twins[0][0] === SNEHA && twins[1][0] === twin2?.id && L.managerFor(VIKRAM) === twin2?.id && L.managerFor(ARJUN) === SNEHA, j([twins, L.managerFor(VIKRAM)]));
await open("priya", UF, "user-form", `?id=${ARJUN}`);
const nSel = selectedManager();
$("phone").value = "+91 90000 00003"; submit();
check("N7", "Arjun's form still has the first Sneha (EMP-1029) selected, and saving it unchanged keeps her", nSel[0] === SNEHA && j(mgr(ARJUN)) === j([SNEHA, "Sneha Rao"]), j([nSel, mgr(ARJUN)]));

// =====================================================================
section("R. A rename no longer drops the manager stage");
fresh(); await open("priya", UF, "user-form", `?id=${SNEHA}`);
$("last-name").value = "Rao-Iyer"; submit();
check("R1", "HR renames Sneha 'Sneha Rao-Iyer' in the form: saved", j(toasts()) === j(["success:Employee saved."]) && S.getUser(SNEHA).name === "Sneha Rao-Iyer");
check("R2", "Arjun and Rohan still have her as their manager", L.managerFor(ARJUN) === SNEHA && L.managerFor(ROHAN) === SNEHA, j([L.managerFor(ARJUN), L.managerFor(ROHAN)]));
const rFirst = allFirst(ARJUN);
const rLeave = L.requestsFor(ARJUN).find((x) => x.status === "pending" && x.from === "2026-10-12");
check("R3", "Arjun's new leave, correction, claim and asset request go to her at the manager stage; the leave shows 'Sneha Rao-Iyer' as its approver",
  j(rFirst) === toSneha && L.currentApproverName(rLeave) === "Sneha Rao-Iyer", j([rFirst, L.currentApproverName(rLeave)]));
await open("priya", "users/user-profile.html", "user-profile", `?id=${ARJUN}`);
const rProfile = [kv("Reporting manager"), kv("Approval chain")];
await open("arjun", "account/my-profile.html", "my-profile");
const rMine = kv("Reporting manager");
check("R4", "both profile pages show the new name: user-profile 'Sneha Rao-Iyer' / 'Sneha Rao-Iyer, then HR or an Admin'; my-profile 'Sneha Rao-Iyer'",
  j(rProfile) === j(["Sneha Rao-Iyer", "Sneha Rao-Iyer, then HR or an Admin"]) && rMine === "Sneha Rao-Iyer", j([rProfile, rMine]));
await open("priya", UF, "user-form", `?id=${ARJUN}`);
const rSel = selectedManager();
$("phone").value = "+91 90000 00004"; submit();
check("R5", "Arjun's form shows her new name selected (EMP-1029); saving it unchanged keeps her, with her new name", j(rSel) === j([SNEHA, "Sneha Rao-Iyer"]) && j(mgr(ARJUN)) === j([SNEHA, "Sneha Rao-Iyer"]), j([rSel, mgr(ARJUN)]));
S.updateUser(USER_ACTOR("admin", SNEHA), SNEHA, { name: "Sneha Rao" });
check("R6", "renamed back, nothing else needed", L.managerFor(ARJUN) === SNEHA && L.approvalChainText(ARJUN) === "Sneha Rao, then HR or an Admin");

// =====================================================================
section("P. Policy unchanged (decisions 1, 3 and 4)");
fresh(); await open("priya", UF, "user-form", `?id=${ARJUN}`);
pickManager("Priya Nair"); submit();
let pl = leaveOf(ARJUN);
const p1a = decideL(pl.record?.id, PRIYA, "hr"), p1b = decideL(pl.record?.id, PRIYA, "hr");
check("P1", "HR may still name herself Arjun's manager, and then decides both stages of his leave (accepted, as before)",
  L.managerFor(ARJUN) === PRIYA && p1a.ok && p1b.ok && p1b.record.status === "approved" && j(p1b.record.history.slice(1).map((h) => `${h.stage}:${h.byUserId}`)) === j([`manager:${PRIYA}`, `hr:${PRIYA}`]), j(p1b.record?.history.map((h) => h.decision)));
await open("priya", UF, "user-form", `?id=${ARJUN}`);
pickManager("Kabir Shah"); submit();
const pc = claim(ARJUN);
const p2 = (E.decideExpense(pc.record.id, KABIR, "fin", "approve"), E.decideExpense(pc.record.id, KABIR, "fin", "approve"));
check("P2", "HR may still make Kabir Arjun's manager; Kabir then decides the manager and Finance stages of a ₹400 claim (accepted)",
  p2.ok && p2.record.status === "approved" && j(p2.record.history.filter((h) => h.decision === "approved").map((h) => `${h.stage}:${h.byUserId}`)) === j([`manager:${KABIR}`, `finance:${KABIR}`]), j(p2.record?.history.map((h) => h.decision)));
await open("priya", UF, "user-form", `?id=${ARJUN}`);
pickManager("No reporting manager"); submit();
const p3 = [first(leaveOf(ARJUN, "2026-10-13")), claim(ARJUN).record?.stage, assetReq(ARJUN).record?.stage];
check("P3", "no reporting manager: leave straight to HR, the claim to Finance, the asset request to an Admin (unchanged)", j(p3) === j([["hr", null], "finance", "admin"]), j(p3));

// =====================================================================
section("C. The seed's Kabir -> Meera double, documented (comments only)");
fresh(); await open("aarav", "dashboard/admin.html", null);
check("C1", "the seed: Meera's ₹400 claim would go to Kabir as her manager, then Kabir again at Finance", j(E.previewRoute(MEERA, 400).map((s) => [s.stage, s.holderIds])) === j([["manager", [KABIR]], ["finance", [KABIR]]]));
const exSrc = SRC("js", "data/expenses-store.js"), acSrc = SRC("js", "data/approval-chain.js");
check("C2", "expenses-store.js's header names both seeded doubles as the accepted limitation (5B / 5E), Kabir for Meera included; approval-chain.js points to it",
  /Someone who holds two stages of a claim decides both: a known, accepted\r\n\/\/ limitation, with no skip rule \(round-5b-notes\.md decision 3, kept in 5E\)\./.test(exSrc)
  && /Aarav for Kabir \(manager, then Admin above ₹50,000\) and Kabir\r\n\/\/ for Meera \(manager, then Finance\)/.test(exSrc) && /Kabir for Meera, as manager and Finance/.test(acSrc));
const code = (s) => s.split("\r\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
// Round 10T (layout; was the live expenses-store.js): 10T adds the manager-stage fallback to it (mgrfall.mjs X1 / X4), so
// 9V's claim is read from its frozen copy (js-pre10T = HEAD 39c7334); approval-chain.js stays live
// Round 11R (layout; layout; was the live approval-chain.js: read from the frozen result js-pre11R = HEAD 86414a0, the live tree has 11R's permission overrides since (overrides.mjs X1))
check("C3", "…and in those two files only comments changed: the code lines are identical to before",
  code(SRC("js-pre10T", "data/expenses-store.js")) === code(SRC("js-pre9V", "data/expenses-store.js")) && code(SRC("js-pre11R", "data/approval-chain.js")) === code(SRC("js-pre9V", "data/approval-chain.js")));

// =====================================================================
section("X. Change set and hygiene");
// Round 9W (layout; was the live js vs js-pre9V, here and in X1 / X3 / X4): 9V's own change set, read from its frozen
// result (js-pre9W = HEAD 35a5710); the live store.js has 9W's lines since (demoteguard.mjs X1 / X4)
const changedJs = walk(`${HERE}js-pre9W`).filter((f) => SRC("js-pre9W", f) !== SRC("js-pre9V", f)).sort();
// Round 11B (layout; was the live pages, here and in the check below): this round's own page claim, read from its
// frozen result (html-pre11B = HEAD 97e1e6c); the live pages have 11B's sessions.html banner since (acctpages.mjs X2)
const changedHtml = walk(`${HERE}html-pre11B`).filter((f) => f.endsWith(".html") && SRC("html-pre11B", f) !== SRC("html-pre9V", f)).sort();
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const cssRoot = `${HERE}css-pre13U`;
const changedCss = walk(cssRoot).filter((f) => fs.readFileSync(`${cssRoot}/${f}`, "utf8") !== SRC("css-pre9V", f));
const FILES = ["data/approval-chain.js", "data/expenses-store.js", "data/leave-store.js", "data/store.js", "pages/my-profile.js", "pages/user-form.js", "pages/user-profile.js"];
check("X1", "js changed: exactly the seven files; nothing added or removed", j(changedJs) === j(FILES) && j(walk(`${HERE}js-pre9W`).sort()) === j(walk(`${HERE}js-pre9V`).sort()), j(changedJs));
check("X2", "no page and no css changed; nothing added or removed", changedHtml.length === 0 && changedCss.length === 0 && j(walk(`${HERE}html-pre11B`).sort()) === j(walk(`${HERE}html-pre9V`).sort()), j([changedHtml, changedCss]));
check("X3", "the seven are CRLF only, with no final newline", changedJs.map((f) => SRC("js-pre9W", f)).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
// Each file's lines, as a multiset: the lines 9V replaced must be exactly these, and it adds exactly this many (what
// the added lines do is A-R's business), so an edit anywhere else in these files shows here.
const lineDelta = (f) => {
  const count = (s) => s.split("\r\n").reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const a = count(SRC("js-pre9V", f)), b = count(SRC("js-pre9W", f));
  const minus = (x, y) => [...x].flatMap(([l, n]) => Array(Math.max(0, n - (y.get(l) ?? 0))).fill(l));
  return { removed: minus(a, b), added: minus(b, a).length };
};
const EXPECTED = {
 "data/store.js": {
  "removed": [
   "  return isValidBox(box) && Number.isInteger(box.nextIdNum) ? box : seedUsers();",
   "  Object.assign(record, copy(rest));"
  ],
  "added": 48
 },
 "data/leave-store.js": {
  "removed": [
   "// The requester's reportingManager is a name. It counts only if exactly one",
   "// active user has that exact name (and it isn't the requester).",
   "  const name = user.reportingManager;",
   "  if (!name) return null;",
   "  const matches = getAllUsers().filter((u) => u.status === \"active\" && u.name === name && u.id !== user.id);",
   "  return matches.length === 1 ? matches[0].id : null;"
  ],
  "added": 4
 },
 "pages/my-profile.js": {
  "removed": [
   "import { getUser, getAllDepartments } from \"../data/store.js\";",
   "  setKv(\"Reporting manager\", orDash(user.reportingManager));"
  ],
  "added": 2
 },
 "pages/user-profile.js": {
  "removed": [
   "import { getUser, getAllUsers, getAllDepartments, deactivateUser, reactivateUser } from \"../data/store.js\";",
   "  setKv(\"Reporting manager\", orDash(user.reportingManager));"
  ],
  "added": 2
 },
 "pages/user-form.js": {
  "removed": [
   "    .map((u) => ({ value: u.name, label: u.name })));",
   "  ensureOption(field(\"manager\"), editing.reportingManager);",
   "  field(\"manager\").value = editing.reportingManager ?? \"\";",
   "    reportingManager: managerSelect.value ? managerSelect.selectedOptions[0].textContent : \"\","
  ],
  "added": 15
 },
 "data/expenses-store.js": {
  "removed": [],
  "added": 6
 },
 "data/approval-chain.js": {
  "removed": [
   "// claims and asset requests (round-5b-notes.md)."
  ],
  "added": 2
 }
};
check("X4", "…and within them, only 9V's lines (removed lines exact; added lines counted)",
  Object.entries(EXPECTED).every(([f, e]) => safe(() => j(lineDelta(f))) === j(e)), j(Object.fromEntries(Object.keys(EXPECTED).map((f) => [f, safe(() => lineDelta(f))]))));
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
