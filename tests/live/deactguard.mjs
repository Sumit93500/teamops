// usage: node deactguard.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 9Y: there must always be an ACTIVE Admin (round-9x-notes.md). isLastAdmin counts only active Admins, for
// demoting, deleting and now deactivating; deactivateUser(id, { byRole }) refuses a non-Admin deactivating any Admin;
// user-profile.js's Deactivate button says who is asking. In jsdom with the js in ./js; ./js-pre9Y, ./html-pre9Y and
// ./css-pre9Y are the code, pages and styles before this round (office-os 80cf801). Clock fixed at Fri 9 Oct 2026 10:00.
//   A  deactivateUser: HR (any non-Admin) can't deactivate an Admin; an Admin, or no byRole, can deactivate one of two
//      active Admins; nobody can deactivate the last active Admin (an inactive Admin on record doesn't help)
//   U  the same rule through updateUser's status (the user form's route); unaffected writes
//   P  user-profile.html end to end: the Deactivate button as HR and as the Admin; Reactivate
//   F  user-form.html end to end: the "account active" box on the last active Admin
//   Z  demoting and deleting: an inactive Admin on record no longer counts (reverses adminguard Z8)
//   R  reactivation is never guarded, including out of a store with no active Admin
//   X  the change set: data/store.js and pages/user-profile.js only; no page, no css; no errors
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
setNow(2026, 10, 9);
globalThis.setTimeout = () => 0;
globalThis.setInterval = () => 0;
URL.createObjectURL = () => "blob:test";
URL.revokeObjectURL = () => {};

const WHO = { aarav: ["admin", "Aarav Mehta", "EMP-1001"], priya: ["hr", "Priya Nair", "EMP-1003"], kabir: ["fin", "Kabir Shah", "EMP-1008"] };
let loads = 0, w = null, d = null, saved = {};
const jsErrors = [], navigations = [], confirms = [];
async function open(who, page, script, query = "") {
  if (w) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => (/navigation/i.test(e.message) ? navigations : jsErrors).push(`${who} ${page}: ${e.message}`));
  const dom = new JSDOM(RAW(page), { url: `http://localhost/office-os/pages/${page}${query}`, virtualConsole: vc });
  w = dom.window; d = w.document;
  w.confirm = (msg) => { confirms.push(msg); return true; };
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
const safe = (f) => { try { return f(); } catch (e) { return { ok: "threw", error: e.message }; } };

const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs
const UF = "users/user-form.html", UP = "users/user-profile.html";
const AARAV = "EMP-1001", ROHAN = "EMP-1042";
const $ = (id) => d.getElementById(id);
const submit = () => d.querySelector("form").dispatchEvent(new w.Event("submit", { cancelable: true }));
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${t.className.replace("toast toast--", "")}:${txt(t.querySelector(".toast__text"))}`);
const statusBtn = () => d.querySelector('.page-header__actions button[data-permission="users:deactivate"]');
// Round 11Y (fixture): the profile's Deactivate opens a dialog asking for the last working day (it opens on today); its
// Deactivate is what the confirm's OK was. A refusal that isn't about the date closes it and shows the same toast.
// Reactivate still confirms.
const pressDeactivate = () => { statusBtn().click(); d.getElementById("deactivate-modal")?.querySelector("form")?.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); };
const LAST_DAY_11Y = () => { const iso = LEAVING_11Y(); return `${Number(iso.slice(8))} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`; };
const statusOf = (id) => S.getUser(id)?.status;
const roleOf = (id) => S.getUser(id)?.role;
const admins = () => S.getAllUsers().filter((u) => u.role === "admin").map((u) => `${u.id}:${u.status}`).sort();
const LAST_ADMIN = "There must always be an Admin: make someone else an Admin first.";
const LAST_ACTIVE = "There must always be an active Admin: make someone else an Admin, or reactivate one, first.";
const ONLY_ADMIN = "Only an Admin can deactivate another Admin.";
const ADMIN_ONLY = "Only an Admin can give someone the Admin role or save an Admin's details.";
const person = (n, extra = {}) => ({ name: `Test ${n}`, email: `test.${n}@northwind.com`, department: "ENG", ...extra });
// Round 12P (fixture; was addUser with extra's status, and 12P refuses "inactive"): an inactive Admin is added active,
// then marked inactive in storage: the same stored record, with no last working day.
const anAdmin = (n, { status, ...extra } = {}) => {
  const record = S.addUser(USER_ACTOR("admin", null), person(n, { role: "admin", designation: "Administrator", ...extra, ...(status && status !== "inactive" ? { status } : {}) })).record;
  if (status === "inactive") {
    const k = Object.keys(w.localStorage).find((x) => x.endsWith("users")), box = JSON.parse(w.localStorage.getItem(k));
    box.records.find((u) => u.id === record.id).status = record.status = "inactive"; w.localStorage.setItem(k, JSON.stringify(box));
  }
  return record;
};
const refusedWith = (r, msg) => r?.ok === false && r.error === msg;
const demoteAarav = () => S.updateUser(USER_ACTOR("admin", AARAV), AARAV, { role: "emp", designation: "Software Engineer" });
// A fresh store with Aarav plus `extra` more active Admins; returns their ids
async function withAdmins(extra) { fresh(); await open("aarav", "dashboard/admin.html", null); return Array.from({ length: extra }, (_, i) => anAdmin(`a${i}`).id); }
// A fresh store whose only active Admin is B (Aarav demoted, as he is protected from deactivation); `asleep` adds an
// inactive Admin on record too (round-9x-notes.md P2 / P3). Returns { b, c }.
async function onlyActive(asleep) {
  const [b] = await withAdmins(1);
  const c = asleep ? anAdmin("c", { status: "inactive" }).id : null;
  demoteAarav();
  return { b, c };
}

// =====================================================================
section("A. deactivateUser");
let [second] = await withAdmins(1);
const nonAdmins = ["hr", "fin", "emp"].map((b) => safe(() => S.deactivateUser(USER_ACTOR(b ?? "admin", second), second, LEAVING_11Y())));
// Round 10Y (decision; was all three refused with ONLY_ADMIN): Finance and an Employee hold no users:deactivate on record,
// so the store refuses them before the Admin-only rule (userguard.mjs G4); HR still gets ONLY_ADMIN
check("A1", "HR deactivating one of two active Admins is refused, with the reason; Finance and an Employee are refused before that (round 10Y); still active",
  refusedWith(nonAdmins[0], ONLY_ADMIN) && nonAdmins.slice(1).every((r) => refusedWith(r, "You can't deactivate employees.")) && statusOf(second) === "active", j(nonAdmins.map((r) => r.error)));
const [s3, t3] = await withAdmins(2);
const ofThree = safe(() => S.deactivateUser(USER_ACTOR("hr", t3), t3, LEAVING_11Y()));
check("A2", "…however many active Admins there are: HR deactivating one of three is refused", refusedWith(ofThree, ONLY_ADMIN) && statusOf(t3) === "active", j(ofThree.error));
[second] = await withAdmins(1);
const byAdmin = safe(() => S.deactivateUser(USER_ACTOR("admin", second), second, LEAVING_11Y()));
check("A3", "an Admin (byRole admin) deactivating the other of two active Admins: saved; Aarav is the active one left",
  byAdmin.ok === true && j(admins()) === j([`${AARAV}:active`, `${second}:inactive`].sort()), j(byAdmin.error ?? "ok"));
[second] = await withAdmins(1);
const plain = safe(() => S.deactivateUser(USER_ACTOR("admin", second), second, LEAVING_11Y()));
check("A4", "no byRole (scripts, the existing suite calls: inventory C2 / D13's case): one of two active Admins is deactivated, as before",
  plain.ok === true && statusOf(second) === "inactive" && statusOf(AARAV) === "active", j(plain.error ?? "ok"));
let { b } = await onlyActive(false);
const last = [safe(() => S.deactivateUser(USER_ACTOR("admin", b), b, LEAVING_11Y())), safe(() => S.deactivateUser(USER_ACTOR("admin", b), b, LEAVING_11Y()))];
check("A5", "the last active Admin (the only Admin, Aarav demoted): refused with no byRole and by an Admin, with the reason; still active",
  last.every((r) => refusedWith(r, LAST_ACTIVE)) && statusOf(b) === "active", j(last.map((r) => r.error)));
({ b } = await onlyActive(true));
const lastWithAsleep = [safe(() => S.deactivateUser(USER_ACTOR("admin", b), b, LEAVING_11Y())), safe(() => S.deactivateUser(USER_ACTOR("admin", b), b, LEAVING_11Y()))];
check("A6", "…and with an inactive Admin on record too (9X's P2): still the last active one, refused",
  lastWithAsleep.every((r) => refusedWith(r, LAST_ACTIVE)) && statusOf(b) === "active", j(lastWithAsleep.map((r) => r.error)));
({ b } = await onlyActive(true));
const lastByHr = safe(() => S.deactivateUser(USER_ACTOR("hr", b), b, LEAVING_11Y()));
check("A7", "HR on the last active Admin: refused with the last-active reason (checked first: true whoever asks), not the Admin-only one",
  refusedWith(lastByHr, LAST_ACTIVE) && statusOf(b) === "active", j(lastByHr.error));
await withAdmins(0);
const others = [safe(() => S.deactivateUser(USER_ACTOR("hr", ROHAN), ROHAN, LEAVING_11Y())), safe(() => S.deactivateUser(USER_ACTOR("admin", AARAV), AARAV, LEAVING_11Y())), safe(() => S.deactivateUser(USER_ACTOR("admin", AARAV), AARAV, LEAVING_11Y()))];
check("A8", "unaffected: HR deactivating a non-Admin is saved; Aarav, a demo sign-in identity, is refused as before (by an Admin, or with no byRole)",
  others[0].ok === true && statusOf(ROHAN) === "inactive" && others.slice(1).every((r) => refusedWith(r, "EMP-1001 is a demo sign-in identity and can't be deactivated.")) && statusOf(AARAV) === "active",
  j(others.map((r) => r.ok === true || r.error)));
[second] = await withAdmins(1);
const leave = S.updateUser(USER_ACTOR("admin", AARAV), AARAV, { status: "on-leave" });
const whileAway = safe(() => S.deactivateUser(USER_ACTOR("admin", second), second, LEAVING_11Y()));
check("A9", "an Admin on leave counts as active (as every approval stage counts them): with Aarav on leave, the other Admin may be deactivated",
  leave.ok === true && whileAway.ok === true && j(admins()) === j([`${AARAV}:on-leave`, `${second}:inactive`].sort()), j([leave.error ?? "ok", whileAway.error ?? "ok"]));

// =====================================================================
section("U. The same rule through updateUser's status");
[second] = await withAdmins(1);
const uHr = safe(() => S.updateUser(USER_ACTOR("hr", second), second, { status: "inactive", dateOfLeaving: LEAVING_11Y() }));
const uAdmin = safe(() => S.updateUser(USER_ACTOR("admin", second), second, { status: "inactive", dateOfLeaving: LEAVING_11Y() }));
check("U1", "updateUser(…, { status: 'inactive' }): HR on one of two active Admins refused (Admin-only); an Admin: saved",
  refusedWith(uHr, ONLY_ADMIN) && uAdmin.ok === true && statusOf(second) === "inactive", j([uHr.error, uAdmin.error ?? "ok"]));
({ b } = await onlyActive(true));
const uLast = [safe(() => S.updateUser(USER_ACTOR("admin", b), b, { status: "inactive", dateOfLeaving: LEAVING_11Y() })), safe(() => S.updateUser(USER_ACTOR("admin", b), b, { status: "inactive", dateOfLeaving: LEAVING_11Y(), phone: "+91 90000 00006" }))];
check("U2", "…the last active Admin, no byRole or an Admin's save with other fields: refused, nothing saved",
  uLast.every((r) => refusedWith(r, LAST_ACTIVE)) && statusOf(b) === "active" && S.getUser(b).phone !== "+91 90000 00006", j(uLast.map((r) => r.error)));
let c;
({ b, c } = await onlyActive(true));
const unaffected = [safe(() => S.updateUser(USER_ACTOR("hr", c), c, { status: "inactive" /* Round 11Y (fixture): c is already inactive, so this isn't a deactivation and gives no last working day */ })), safe(() => S.updateUser(USER_ACTOR("admin", b), b, { status: "on-leave" })),
  safe(() => S.updateUser(USER_ACTOR("admin", b), b, { phone: "+91 90000 00007" })), safe(() => S.updateUser(USER_ACTOR("admin", b), b, { status: "active" }))];
check("U3", "unaffected: an already-inactive Admin saved inactive again (removes nobody, even by HR); the last active Admin put on leave (still active), saving their phone, or saving them active",
  unaffected.every((r) => r.ok === true) && statusOf(b) === "active" && S.getUser(b).phone === "+91 90000 00007" && statusOf(c) === "inactive",
  j(unaffected.map((r) => r.ok === true || r.error)));

// =====================================================================
section("P. user-profile.html, end to end");
[second] = await withAdmins(1);
await open("priya", UP, "user-profile", `?id=${second}`);
confirms.length = 0; pressDeactivate();   // Round 11Y (fixture)
check("P1", "HR on the second Admin's profile clicks Deactivate and confirms: refused as a toast with the reason; still active; the button still says Deactivate",
  j(toasts()) === j([`danger:${ONLY_ADMIN}`]) && statusOf(second) === "active" && txt(statusBtn()) === "Deactivate" && confirms.length === 0 /* Round 11Y (behaviour; was 1: the dialog asks instead of a confirm) */, j([toasts(), txt(statusBtn())]));
await open("aarav", UP, "user-profile", `?id=${second}`);
pressDeactivate();   // Round 11Y (fixture)
// Round 11Y (behaviour; was "Test a0 deactivated.": the toast names the last working day)
check("P2", "the Admin does the same: saved; the button now says Reactivate", j(toasts()) === j([`success:Test a0 deactivated. Last working day: ${LAST_DAY_11Y()}.`]) && statusOf(second) === "inactive" && txt(statusBtn()) === "Reactivate", j([toasts(), txt(statusBtn())]));
({ b } = await onlyActive(true));
await open("aarav", UP, "user-profile", `?id=${b}`);
pressDeactivate();   // Round 11Y (fixture)
// Round 10Y (decision; was LAST_ACTIVE's toast): onlyActive() demoted Aarav on record, so his Admin session is refused by the
// store before the last-Admin rule (the record decides: userguard.mjs G2); the outcome is the same, b stays active
// Round 11P (behaviour; N4: the page reads his role on record (Employee), not the Admin session's; this check still passed, and now also pins that)
check("P3", "Aarav's Admin session (his record demoted) deactivating the last active Admin: the guard now turns him away (his role on record lacks users:view: one navigation, round 11P); pressed anyway, refused as a toast by the record check (round 10Y)", navigations.length === 1 && j(toasts()) === j(["danger:You can't deactivate employees."]) && statusOf(b) === "active", j([toasts(), navigations.length]));
await open("priya", UP, "user-profile", `?id=${b}`);
pressDeactivate();   // Round 11Y (fixture)
check("P4", "…HR doing it: the same last-active toast", j(toasts()) === j([`danger:${LAST_ACTIVE}`]) && statusOf(b) === "active", j(toasts()));
({ b, c } = await onlyActive(true));
await open("priya", UP, "user-profile", `?id=${c}`);
statusBtn().click();
check("P5", "HR reactivates the inactive Admin from their profile: saved (reactivation isn't guarded)", j(toasts()) === j(["success:Test c reactivated."]) && statusOf(c) === "active", j(toasts()));
await withAdmins(0);
await open("priya", UP, "user-profile", `?id=${ROHAN}`);
pressDeactivate();   // Round 11Y (fixture)
await open("aarav", UP, "user-profile", `?id=${AARAV}`);
pressDeactivate();
const own = toasts();
check("P6", "unaffected: HR deactivating a non-Admin from the profile is saved; the Admin on his own profile still gets the page's own-account toast",
  statusOf(ROHAN) === "inactive" && j(own) === j(["danger:You can't deactivate your own account."]) && statusOf(AARAV) === "active", j(own));

// =====================================================================
section("F. user-form.html, end to end");
({ b } = await onlyActive(false));
await open("aarav", UF, "user-form", `?id=${b}`);
$("account-active").checked = false; submit();
// Round 10Y (decision; was LAST_ACTIVE's toast): as P3, Aarav's record is demoted, so the store refuses his edit first
// Round 11P (behaviour; N4: as P3; this check still passed, and now also pins that)
check("F1", "Aarav's Admin session (his record demoted) unchecks 'Account active' on the last active Admin's form: the guard now turns him away (one navigation, round 11P); pressed anyway, refused as a toast by the record check (round 10Y); still active",
  navigations.length === 1 && j(toasts()) === j(["danger:You can't edit employees."]) && statusOf(b) === "active", j([toasts(), navigations.length]));
[second] = await withAdmins(1);
await open("aarav", UF, "user-form", `?id=${second}`);
$("account-active").checked = false; submit();
// Round 11Y (behaviour; was "saved": the edit form gives no last working day, so it can't deactivate; its refusal
// points to the profile, where the same deactivation is allowed: the store call stands for the dialog, as in P2)
check("F2", "…on the second of two active Admins: the form points to the profile (round 11Y); deactivating there is allowed",
  j(toasts()) === j(["danger:Deactivate them from their profile, which asks for their last working day."]) && statusOf(second) === "active"
  && S.deactivateUser(USER_ACTOR("admin", second), second, LEAVING_11Y()).ok === true && statusOf(second) === "inactive", j(toasts()));
[second] = await withAdmins(1);
await open("priya", UF, "user-form", `?id=${second}`);
$("account-active").checked = false; submit();
check("F3", "HR doing it on the second Admin's form: still 9U's refusal for any HR save of an Admin (unchanged)", j(toasts()) === j([`danger:${ADMIN_ONLY}`]) && statusOf(second) === "active", j(toasts()));

// =====================================================================
section("Z. Demoting and deleting: an inactive Admin on record no longer counts");
await withAdmins(0);
c = anAdmin("c", { status: "inactive" }).id;
const demote = [safe(() => S.updateUser(USER_ACTOR("admin", AARAV), AARAV, { role: "emp" })), safe(() => S.updateUser(USER_ACTOR("admin", AARAV), AARAV, { role: "emp", designation: "Software Engineer" }))];
check("Z1", "Aarav active, an inactive Admin on record: demoting Aarav is refused, with no byRole or by an Admin (was allowed: adminguard Z8)",
  demote.every((r) => refusedWith(r, LAST_ADMIN)) && roleOf(AARAV) === "admin", j(demote.map((r) => r.error)));
({ b, c } = await onlyActive(true));
const del = [safe(() => S.deleteUser(USER_ACTOR("admin", b), b)), safe(() => S.deleteUser(USER_ACTOR("admin", b), b))];
check("Z2", "deleting the only active Admin with an inactive one on record: refused, with no byRole or by an Admin; still on record",
  del.every((r) => refusedWith(r, LAST_ADMIN)) && Boolean(S.getUser(b)), j(del.map((r) => r.error)));
({ b, c } = await onlyActive(true));
const sleeper = [safe(() => S.updateUser(USER_ACTOR("admin", c), c, { role: "emp" })), safe(() => S.deleteUser(USER_ACTOR("admin", c), c))];
check("Z3", "the inactive Admin themselves may still be demoted, then deleted, while an active Admin remains", sleeper.every((r) => r.ok === true) && !S.getUser(c) && j(admins()) === j([`${b}:active`]),
  j(sleeper.map((r) => r.ok === true || r.error)));
[second] = await withAdmins(1);
const two = [safe(() => S.updateUser(USER_ACTOR("admin", second), second, { role: "emp" })), safe(() => S.deleteUser(USER_ACTOR("admin", second), second))];
check("Z4", "unaffected: with two active Admins, demoting then deleting one is done (adminguard Z5 / Z7's case)", two.every((r) => r.ok === true) && j(admins()) === j([`${AARAV}:active`]),
  j(two.map((r) => r.ok === true || r.error)));

// =====================================================================
section("R. Reactivation");
({ b, c } = await onlyActive(true));
const re = [safe(() => S.reactivateUser(USER_ACTOR("admin", c), c))];
check("R1", "reactivating an inactive Admin: saved, with nothing to say who asks; now there are two active", re[0].ok === true && j(admins()) === j([`${b}:active`, `${c}:active`].sort()), j(re[0].error ?? "ok"));
// A store saved with no active Admin (as one could be before this round): written directly, then read back.
await withAdmins(0);
c = anAdmin("c", { status: "inactive" }).id;
const box = JSON.parse(w.localStorage.getItem(Object.keys(w.localStorage).find((k) => k.endsWith("users"))));
box.records.find((u) => u.id === AARAV).role = "emp";
w.localStorage.setItem(Object.keys(w.localStorage).find((k) => k.endsWith("users")), JSON.stringify(box));
const before = admins();
// Round 10Y (decision; was reactivating with nobody saying who): with no active Admin there's no Admin to act, so HR
// (users:deactivate on record) reactivates; the way back is still there
const back = safe(() => S.reactivateUser(USER_ACTOR("hr", c), c));
const again = safe(() => S.deactivateUser(USER_ACTOR("hr", c), c, LEAVING_11Y()));
check("R2", "a store saved with no active Admin: reactivating the inactive one works; deactivating them again is then refused (the last active one)",
  j(before) === j([`${c}:inactive`]) && back.ok === true && refusedWith(again, LAST_ACTIVE) && j(admins()) === j([`${c}:active`]), j([before, back.error ?? "ok", again.error]));

// =====================================================================
section("X. Change set and hygiene");
// Round 10F (layout; was the live js vs js-pre9Y, here and in X1 / X3 / X4): 9Y's own change set, read from its frozen
// result (js-pre10F = HEAD ef1ee4a); the live js has 10F's lines since (handover.mjs X1 / X4)
const changedJs = walk(`${HERE}js-pre10F`).filter((f) => SRC("js-pre10F", f) !== SRC("js-pre9Y", f)).sort();
// Round 11B (layout; was the live pages, here and in the check below): this round's own page claim, read from its
// frozen result (html-pre11B = HEAD 97e1e6c); the live pages have 11B's sessions.html banner since (acctpages.mjs X2)
const changedHtml = walk(`${HERE}html-pre11B`).filter((f) => f.endsWith(".html") && SRC("html-pre11B", f) !== SRC("html-pre9Y", f)).sort();
// Round 13U (layout; was the live css): read from the frozen css-pre13U (office-os cad5061); the live css: cssguard.mjs C1-C3
const cssRoot = `${HERE}css-pre13U`;
const changedCss = walk(cssRoot).filter((f) => fs.readFileSync(`${cssRoot}/${f}`, "utf8") !== SRC("css-pre9Y", f));
const FILES = ["data/store.js", "pages/user-profile.js"];
check("X1", "js changed: exactly data/store.js and pages/user-profile.js; nothing added or removed", j(changedJs) === j(FILES) && j(walk(`${HERE}js-pre10F`).sort()) === j(walk(`${HERE}js-pre9Y`).sort()), j(changedJs));
check("X2", "no page and no css changed; nothing added or removed", changedHtml.length === 0 && changedCss.length === 0 && j(walk(`${HERE}html-pre11B`).sort()) === j(walk(`${HERE}html-pre9Y`).sort()), j([changedHtml, changedCss]));
check("X3", "the two are CRLF only, with no final newline", changedJs.map((f) => SRC("js-pre10F", f)).every((s) => !/[^\r]\n/.test(s) && !s.endsWith("\n")));
// Each file's lines, as a multiset: the lines 9Y replaced must be exactly these, and it adds exactly this many (what the
// added lines do is A-R's business), so an edit anywhere else in either file shows here.
const lineDelta = (f) => {
  const count = (s) => s.split("\r\n").reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const a = count(SRC("js-pre9Y", f)), b = count(SRC("js-pre10F", f));
  const minus = (x, y) => [...x].flatMap(([l, n]) => Array(Math.max(0, n - (y.get(l) ?? 0))).fill(l));
  return { removed: minus(a, b), added: minus(b, a).length };
};
const EXPECTED = {
 "data/store.js": {
  "removed": [
   "// Is this person the only one on record with the Admin role? (updateUser / deleteUser keep at least one.)",
   "const isLastAdmin = (records, id) => !records.some((u) => u.id !== id && u.role === \"admin\");",
   "export function deactivateUser(id) {",
   "  return updateUser(id, { status: \"inactive\" });"
  ],
  "added": 13
 },
 "pages/user-profile.js": {
  "removed": [
   "import { getCurrentUserId } from \"../core/auth.js\";",
   "  const result = deactivating ? deactivateUser(user.id) : reactivateUser(user.id);"
  ],
  "added": 3
 }
};
check("X4", "…and within them, only 9Y's lines (removed lines exact; added lines counted)",
  Object.entries(EXPECTED).every(([f, e]) => j(lineDelta(f)) === j(e)), j(Object.fromEntries(Object.keys(EXPECTED).map((f) => [f, lineDelta(f)]))));
check("ERR", "no page errors in any run", jsErrors.length === 0, j(jsErrors));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;


// Round 11Y (fixture): deactivating needs a last working day since round 11Y (R8 part iii); the fixtures give today's,
// on this suite's clock, as the profile's dialog does. Hoisted, so every call above can use it.
function LEAVING_11Y() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
