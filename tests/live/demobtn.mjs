// usage: node demobtn.mjs [pagesDir]   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round Demo buttons part 1 (JS stage), in jsdom with the js in ./js; css read only from the frozen copy, css-prelo:
//   M  team attendance's Message: a mailto: link to each Needs attention person's work email (from the users store), subject "Attendance on <date>",
//      an aria-label naming them; the same rows as before for each role (Admin and HR everyone, Sneha her direct reports); no placeholder left
//   P  My profile's Save changes: the person's own contact details and emergency contact (7 fields), saved, shown again after a reload, Discard
//      back to them; Preferred name shown disabled and never saved; a bad personal email refused inline; Change photo still a placeholder
//   S  the store's updateOwnContact(): own record only, those fields only (every other field refused, nothing saved), active people only; the email
//      rule is the browser's own for type="email"; updateUser() for HR unchanged
//   Y  payslip-view: one "Print or save as PDF" button (window.print()), no Download PDF; print.css's rules (frozen css) print the payslip alone,
//      light; the payslips list's Download and Download all stay placeholders
//   U  user-profile's Reset password: the info toast only; no confirm(), no "Reset requested" note, nothing written
//   A  my-attendance: the static-page branch and its own toast are gone; an old or deleted session is signed out, and nothing handles the form
//   E99 no js errors
// The clock is local wall time (Mon 28 Sep 2026 10:00; one section moves it to Mon 4 Jan 2027); storage is in memory, seeded when first read.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const { JSDOM, VirtualConsole } = createRequire(import.meta.url)("../node_modules/jsdom");

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const DIR = process.argv[2] ?? path.join(HERE, "..", "w", "pages");
const read = (...p) => (fs.existsSync(path.join(...p)) ? fs.readFileSync(path.join(...p), "utf8") : "");
const CSS = path.join(HERE, "css-prelo");

const RealDate = Date;
let NOW = new RealDate(2026, 8, 28, 10, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
globalThis.setInterval = () => 0;

const mem = new Map();
const MEM = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.localStorage = MEM;
const SESS = { admin: ["admin", "Aarav Mehta", "EMP-1001"], hr: ["hr", "Priya Nair", "EMP-1003"], fin: ["fin", "Kabir Shah", "EMP-1008"], emp: ["emp", "Arjun Kapoor", "EMP-1105"], sneha: ["emp", "Sneha Rao", "EMP-1029"] };
const session = (who) => mem.set("officeos:session", JSON.stringify({ roleKey: SESS[who][0], userLabel: SESS[who][1], employeeId: SESS[who][2], signedInAt: NOW }));
const fresh = (who) => { mem.clear(); if (who) session(who); };

let loads = 0, w = null, d = null, confirms = [];
const allJsErrors = [];
async function open(page, query = "") {
  const vc = new VirtualConsole();
  timers = [];
  vc.on("jsdomError", (e) => { if (!/navigation/i.test(e.message)) allJsErrors.push(`${page}${query}: ${e.message}`); });
  const html = read(DIR, `${page}.html`);
  const dom = new JSDOM(html, { url: `http://localhost/office-os/pages/${page}.html${query}`, virtualConsole: vc, pretendToBeVisual: true });
  w = dom.window; d = w.document;
  Object.defineProperty(w, "localStorage", { value: MEM, configurable: true });
  confirms = [];
  w.confirm = (q) => { confirms.push(q); return true; };
  Object.assign(globalThis, { window: w, document: d, Node: w.Node, NodeFilter: w.NodeFilter, HTMLElement: w.HTMLElement, getComputedStyle: w.getComputedStyle.bind(w) });
  loads++;
  for (const m of html.matchAll(/<script type="module" src="[^"]*assets\/js\/([^"]+)"/g)) {
    try { await import(`./js/${m[1]}?load=${loads}`); } catch (e) { allJsErrors.push(`${page} import: ${e.message}`); }
  }
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) { allJsErrors.push(`${page} timer: ${e.message}`); } });
}

console.log(`HTML from: ${DIR}   TZ=${process.env.TZ ?? "(system)"}  offset now=${-new RealDate().getTimezoneOffset()} min`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const $ = (id) => d.getElementById(id);
const toasts = () => [...d.querySelectorAll(".toast")].map((t) => `${["success", "danger", "warning", "info"].find((k) => t.className.includes(`toast--${k}`)) ?? "?"}:${txt(t.querySelector(".toast__text"))}`);
const click = (node) => node.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
const S = await import("./js/data/store.js?suite=1");
const userByName = (name) => S.getAllUsers().find((u) => u.name === name);
// updateOwnContact(), a refusal instead of a crash where it doesn't exist (pristine, both ways)
const own = (...a) => { try { return S.updateOwnContact(...a); } catch (e) { return { ok: false, error: `THREW ${e.message}` }; } };

// =================================================================
section("M. Team attendance: Message is a mailto: link");
const links = () => [...$("team-attention").querySelectorAll(".list__item")].filter((i) => i.querySelector(".list__title")).map((i) => {
  const a = i.querySelector("a");
  return { name: txt(i.querySelector(".list__title")), tag: a?.tagName.toLowerCase(), text: txt(a), cls: a?.className, href: a?.getAttribute("href"), label: a?.getAttribute("aria-label"), buttons: i.querySelectorAll("button").length };
});
const want = (name, day) => `mailto:${userByName(name)?.email}?subject=${encodeURIComponent(`Attendance on ${day}`)}`;
const good = (rows, day) => rows.length > 0 && rows.every((r) => r.tag === "a" && r.text === "Message" && r.cls === "btn btn--sm" && r.buttons === 0 && r.href === want(r.name, day) && r.label === `Message ${r.name}`);
const pickDate = (iso) => { const i = $("team-date"); i.value = iso; i.dispatchEvent(new w.Event("change", { bubbles: true })); };
fresh("admin"); await open("attendance/team-attendance");
const admin = links();
console.log(`      Admin, today: ${j(admin.map((r) => [r.name, r.href, r.label]))}`);
check("M1", "Admin, today: every Needs attention row has a Message link (an <a>, 'Message', btn btn--sm, no button), mailto: that person's work email from the users store, subject 'Attendance on 28 Sep', aria-label 'Message <name>'",
  good(admin, "28 Sep"), j(admin));
check("M2", "…the rows are the same people as before (5 at 10:00: Aarav, Arjun, Kabir, Priya, Vikram), each a different address", j(admin.map((r) => r.name)) === j(["Aarav Mehta", "Arjun Kapoor", "Kabir Shah", "Priya Nair", "Vikram Singh"]) && new Set(admin.map((r) => r.href)).size === 5, j(admin.map((r) => r.name)));
check("M3", "…the href in full for Arjun: mailto:arjun.kapoor@northwind.com?subject=Attendance%20on%2028%20Sep", admin.find((r) => r.name === "Arjun Kapoor")?.href === "mailto:arjun.kapoor@northwind.com?subject=Attendance%20on%2028%20Sep", admin.find((r) => r.name === "Arjun Kapoor")?.href);
check("M4", "no placeholder left on the page's main content: no [data-not-implemented] in main, no 'Message' button anywhere",
  !d.querySelector("main [data-not-implemented]") && ![...d.querySelectorAll("button")].some((b) => txt(b) === "Message"), j([...d.querySelectorAll("main [data-not-implemented]")].map((b) => b.dataset.notImplemented)));
click($("team-attention").querySelector("a") ?? d.body);
check("M5", "clicking Message shows no demo toast (the browser opens the email)", toasts().length === 0, j(toasts()));
// A past day lists only someone with no check-in: a hire from 1 Sep with none (the seed checks everyone else in on past days).
const HIRE = { name: "Test Hire", email: "test.hire@northwind.com", department: "ENG", designation: "Software Engineer", dateOfJoining: "1 Sep 2026" };
const hire = S.addUser("EMP-1001", HIRE);
await open("attendance/team-attendance");
pickDate("2026-09-25");
const past = links();
console.log(`      Admin, 25 Sep (a hire from 1 Sep with no check-ins added): ${j(past.map((r) => [r.name, r.href]))}`);
check("M6", "a picked date: the subject names it ('Attendance on 25 Sep') on every row; the new hire's link is to test.hire@northwind.com", hire.ok && good(past, "25 Sep") && past.some((r) => r.href === "mailto:test.hire@northwind.com?subject=Attendance%20on%2025%20Sep"), j([hire.ok, past]));
fresh("hr"); await open("attendance/team-attendance");
const hr = links();
check("M7", "HR (attendance:view-all): the same rows and links as Admin", j(hr) === j(admin), j(hr));
fresh("sneha"); await open("attendance/team-attendance");
const sneha = links();
const reports = S.getAllUsers().filter((u) => u.reportingManagerId === "EMP-1029").map((u) => u.name);
console.log(`      Sneha: ${j(sneha.map((r) => [r.name, r.href]))}; her direct reports ${j(reports)}`);
check("M8", "Sneha (a manager): only her direct reports' rows, each with its own mailto: (Arjun's: arjun.kapoor@northwind.com), as Admin's for the same people",
  sneha.length > 0 && sneha.every((r) => reports.includes(r.name)) && good(sneha, "28 Sep") && j(sneha) === j(admin.filter((r) => reports.includes(r.name))), j(sneha));
fresh("emp"); await open("attendance/team-attendance");
check("M9", "Arjun (no reports, no attendance:view-all) can't open the page (the guard sends him to 403): no Message link drawn", !d.querySelector('#team-attention a[href^="mailto:"]'), j(links()));
fresh("admin");
const up = S.updateUser("EMP-1001", "EMP-1105", { email: "arjun.k@northwind.com" });
await open("attendance/team-attendance");
check("M10", "the address follows the store: Arjun's work email changed by an Admin, his link changes, the others' don't",
  up.ok && links().find((r) => r.name === "Arjun Kapoor")?.href === "mailto:arjun.k@northwind.com?subject=Attendance%20on%2028%20Sep" && j(links().filter((r) => r.name !== "Arjun Kapoor")) === j(admin.filter((r) => r.name !== "Arjun Kapoor")), j(links()));
const src = read(HERE, "js", "pages", "team-attendance.js");
check("M11", "team-attendance.js: no data-not-implemented, no placeholder import", !/notImplemented|not-implemented|initPlaceholders/.test(src));
// another year: the subject carries it
NOW = new RealDate(2027, 0, 4, 10, 0, 0).getTime();
fresh("admin"); await open("attendance/team-attendance");
const jan = links();
S.addUser("EMP-1001", { ...HIRE, dateOfJoining: "1 Dec 2026" });
await open("attendance/team-attendance");
pickDate("2026-12-31");
const dec = links();
console.log(`      Admin on 4 Jan 2027: ${j(jan.map((r) => r.href))}; 31 Dec 2026: ${j(dec.map((r) => r.href))}`);
check("M12", "on Mon 4 Jan 2027: today's subject 'Attendance on 4 Jan'; 31 Dec 2026 picked: 'Attendance on 31 Dec 2026' (another year: with it)", good(jan, "4 Jan") && good(dec, "31 Dec 2026"), j([jan, dec]));
NOW = new RealDate(2026, 8, 28, 10, 0, 0).getTime();

// =================================================================
section("P. My profile: Save changes");
const IDS = { "p-phone": "phone", "p-email": "personalEmail", "p-city": "city", "p-address": "address", "e-name": "emergencyContactName", "e-rel": "emergencyContactRelation", "e-phone": "emergencyContactPhone" };
const form = () => d.querySelector("main form");
const submit = () => { const e = new w.Event("submit", { bubbles: true, cancelable: true }); form().dispatchEvent(e); return e.defaultPrevented; };
const setVal = (id, v) => { const f = $(id); f.value = v; f.dispatchEvent(new w.Event("input", { bubbles: true })); };
const values = () => Object.fromEntries(Object.keys(IDS).map((id) => [id, $(id).value]));
const rec = (id = "EMP-1105") => S.getUser(id);
const without = (r, keys) => Object.fromEntries(Object.entries(r).filter(([k]) => !keys.includes(k)));
fresh("emp"); await open("account/my-profile");
const before = rec();
const saveBtn = form().querySelector('[type="submit"]');
check("P1", "the page shows Arjun's 7 saved fields from the store; Save changes is a real submit (data-permission profile:edit-own, no data-not-implemented); Change photo is still a placeholder",
  Object.entries(IDS).every(([id, k]) => $(id).value === (before[k] ?? "")) && txt(saveBtn) === "Save changes" && saveBtn.dataset.permission === "profile:edit-own" && !saveBtn.hasAttribute("data-not-implemented")
  && [...d.querySelectorAll("main [data-not-implemented]")].map((b) => b.dataset.notImplemented).join() === "Change photo", j([values(), saveBtn.outerHTML]));
check("P2", "Preferred name is shown disabled ('Arjun'), with the hint 'From your name on record. To change it, ask HR.' tied to it",
  $("p-name").disabled && $("p-name").value === "Arjun" && $("p-name").getAttribute("aria-describedby") === "p-name-hint" && txt($("p-name-hint")) === "From your name on record. To change it, ask HR." && $("p-name-hint").className === "form-hint");
const NEWV = { "p-phone": "+91 90000 11111", "p-email": "  arjun.new@example.com ", "p-city": "Noida", "p-address": "Sector 62, Noida, Uttar Pradesh 201309", "e-name": "Ravi Kapoor", "e-rel": "Brother", "e-phone": "+91 90000 22222" };
Object.entries(NEWV).forEach(([id, v]) => setVal(id, v));
$("p-name").value = "Arj";
const prevented = submit();
const after = rec();
check("P3", "Save: 'Saved.' (success), the submit stays on the page, and the 7 fields are stored as typed, trimmed",
  prevented && j(toasts()) === j(["success:Saved."]) && Object.entries(IDS).every(([id, k]) => after[k] === NEWV[id].trim()), j([toasts(), without(after, [])]));
check("P4", "…nothing else on the record changed (name, work email, designation, department, role, status, pay and bank fields, manager…): the record minus those 7 is as before",
  j(without(after, Object.values(IDS))) === j(without(before, Object.values(IDS))) && after.name === "Arjun Kapoor", j(Object.keys(after).filter((k) => j(after[k]) !== j(before[k]))));
setVal("p-phone", "typed, then discarded"); form().reset();
check("P5", "Discard after a save goes back to what was saved, not to the old values", j(values()) === j(Object.fromEntries(Object.entries(NEWV).map(([k, v]) => [k, v.trim()]))), j(values()));
await open("account/my-profile");
check("P6", "after a reload the page shows the saved values; the header still 'Arjun Kapoor', Preferred name 'Arjun'",
  j(values()) === j(Object.fromEntries(Object.entries(NEWV).map(([k, v]) => [k, v.trim()]))) && txt(d.querySelector(".profile__name")) === "Arjun Kapoor" && $("p-name").value === "Arjun", j(values()));
const raw = mem.get("officeos:users");
setVal("p-email", "arjun@"); setVal("p-phone", "+91 1");
const prevented2 = submit();
const err = d.querySelector("main .form-error");
check("P7", "a bad personal email (the browser stops it first; sent anyway): refused inline under Personal email, 'Enter a valid email address, like name@example.com.', no toast, nothing saved (the phone neither)",
  prevented2 && txt(err) === "Enter a valid email address, like name@example.com." && err?.closest(".form-field")?.contains($("p-email")) && $("p-email").getAttribute("aria-describedby") === "p-email-error" && toasts().length === 0 && mem.get("officeos:users") === raw,
  j([txt(err), toasts()]));
setVal("p-email", "arjun@example.com");
check("P8", "…typing clears the error", !d.querySelector("main .form-error"));
check("P9", "Personal email is <input type=\"email\"> (the browser's check, as user-form's work email), phones type=\"tel\"; the form isn't novalidate", $("p-email").type === "email" && $("p-phone").type === "tel" && $("e-phone").type === "tel" && !form().noValidate);
setVal("e-phone", ""); setVal("p-email", "arjun.new@example.com"); setVal("p-phone", "+91 90000 11111");
submit();
check("P10", "a field may be emptied: the emergency phone saved empty", rec().emergencyContactPhone === "" && j(toasts().slice(-1)) === j(["success:Saved."]), j(toasts()));
fresh("admin"); await open("account/my-profile");
const otherBefore = rec("EMP-1105");
setVal("p-phone", "+91 98100 99999"); submit();
check("P11", "an Admin saves their own phone the same way; Arjun's record untouched", rec("EMP-1001").phone === "+91 98100 99999" && j(rec("EMP-1105")) === j(otherBefore) && j(toasts()) === j(["success:Saved."]), j(toasts()));

// =================================================================
section("S. The store: updateOwnContact()");
fresh();
const snap = () => mem.get("officeos:users");
S.getAllUsers();
let r = own("EMP-1105", "EMP-1105", { phone: "  +91 1 ", city: "Pune" });
check("S1", "Arjun on his own record: saved, trimmed", r.ok && rec().phone === "+91 1" && rec().city === "Pune", j(r));
let s0 = snap();
r = own("EMP-1105", "EMP-1029", { phone: "+91 2" });
check("S2", "Arjun on Sneha's record: refused, 'You can only change your own contact details.', nothing saved", !r.ok && r.error === "You can only change your own contact details." && snap() === s0, j(r));
r = own("EMP-1001", "EMP-1105", { phone: "+91 3" });
check("S3", "an Admin on Arjun's record: refused the same (HR and Admins edit people through updateUser)", !r.ok && r.error === "You can only change your own contact details." && snap() === s0, j(r));
r = own("EMP-1003", "EMP-1105", { phone: "+91 3" });
check("S4", "HR on Arjun's record: refused the same", !r.ok && r.error === "You can only change your own contact details." && snap() === s0, j(r));
const PROTECTED = ["name", "email", "designation", "department", "role", "status", "id", "bankAccount", "bankAccountLast4", "pan", "reportingManagerId", "reportingManager", "dateOfJoining", "dateOfLeaving", "dob", "location", "employmentType", "grantPermissions", "denyPermissions", "leavingPeriods", "salary", "ctc", "preferredName"];
const refused = PROTECTED.map((k) => [k, own("EMP-1105", "EMP-1105", { [k]: k === "role" ? "admin" : "x" })]);
check("S5", `each other field on his own record (${PROTECTED.length}: name, work email, designation, department, role, status, id, bank, PAN, manager, dates, location, type, permissions, salary...): refused, naming the field, nothing saved`,
  refused.every(([k, x]) => !x.ok && x.error === "Only your contact details and emergency contact can be changed here." && x.field === k) && snap() === s0, j(refused.filter(([k, x]) => x.ok || x.field !== k)));
r = own("EMP-1105", "EMP-1105", { phone: "+91 4", role: "admin" });
check("S6", "a save with an allowed and a protected field: refused whole (the phone isn't saved either)", !r.ok && r.field === "role" && snap() === s0 && rec().role === "emp", j(r));
r = [own(null, "EMP-1105", { phone: "1" }), own("EMP-9999", "EMP-9999", { phone: "1" })];
check("S7", "nobody signed in, or someone not on record: refused, 'You can't change your profile.'", r.every((x) => !x.ok && x.error === "You can't change your profile.") && snap() === s0, j(r));
const box = JSON.parse(snap()); box.records.find((u) => u.id === "EMP-1088").status = "inactive"; mem.set("officeos:users", JSON.stringify(box)); s0 = snap();
r = own("EMP-1088", "EMP-1088", { phone: "1" });
check("S8", "an inactive person (Vikram, set inactive in storage): refused the same, nothing saved", !r.ok && r.error === "You can't change your profile." && snap() === s0, j(r));
check("S9", "OWN_CONTACT_FIELDS is exactly the 7 the page sends", j(S.OWN_CONTACT_FIELDS) === j(["phone", "personalEmail", "city", "address", "emergencyContactName", "emergencyContactRelation", "emergencyContactPhone"]), j(S.OWN_CONTACT_FIELDS));
const SAMPLES = ["a@b.co", "first.last+tag@example.co.in", "x@localhost", "o'neil@example.com", "arjun", "a@", "@b.com", "a b@c.com", "a@b..com", "a@-b.com", "a@b_c.com", "a@b.com.", "a@@b.com", "a@b.com,c@d.com"];
const probe = d.createElement("input"); probe.type = "email";
const verdicts = SAMPLES.map((v) => { probe.value = v; const store = own("EMP-1105", "EMP-1105", { personalEmail: v }); return [v, store.ok, !probe.validity.typeMismatch, store.ok ? "" : store.field]; });
console.log(`      [value, store ok, browser ok]: ${j(verdicts)}`);
check("S10", "the personal email rule is the browser's own for type=\"email\": on 14 samples the store and the input agree (4 valid, 10 not)",
  verdicts.every(([, a, b]) => a === b) && verdicts.filter((v) => v[1]).length === 4 && verdicts.filter((v) => !v[1]).every((v) => v[3] === "personalEmail"), j(verdicts.filter(([, a, b]) => a !== b)));
r = own("EMP-1105", "EMP-1105", { personalEmail: "" });
check("S11", "an empty personal email is allowed (cleared)", r.ok && rec().personalEmail === "", j(r));
r = S.updateUser("EMP-1003", "EMP-1105", { phone: "+91 5", designation: "Senior Software Engineer" });
check("S12", "updateUser() unchanged: HR (users:edit) still changes Arjun's phone and designation", r.ok && rec().phone === "+91 5" && rec().designation === "Senior Software Engineer", j(r));

// =================================================================
section("Y. Payslip: Print or save as PDF");
fresh("emp"); await open("payroll/payslip-view");
const acts = () => [...d.querySelectorAll(".page-header__actions > *")].map((n) => [n.tagName.toLowerCase(), txt(n), n.hidden]);
const pr = $("payslip-print");
check("Y1", "Arjun's payslip: the actions are Back to payslips and one 'Print or save as PDF' (btn btn--primary, onclick window.print(), shown once the payslip is drawn)",
  j(acts()) === j([["a", "Back to payslips", false], ["button", "Print or save as PDF", false]]) && pr.getAttribute("onclick") === "window.print()" && pr.className === "btn btn--primary" && !$("payslip").hidden, j(acts()));
check("Y2", "no Download PDF left: no #payslip-download, no 'Download PDF' text, no [data-not-implemented] in main", !$("payslip-download") && !/Download PDF/.test(d.body.textContent) && !d.querySelector("main [data-not-implemented]"));
check("Y3", "the button sits in the page header (print.css hides .page-header), the payslip outside it", Boolean(pr.closest(".page-header")) && !$("payslip").closest(".page-header, .sidebar, .topbar"));
await open("payroll/payslip-view", "?month=2020-01");
check("Y4", "a month with no payslip: the message, and Print or save as PDF stays hidden", !$("payslip-message").hidden && $("payslip").hidden && $("payslip-print").hidden && !$("payslip-download"), j(acts()));
const css = (f) => read(CSS, f);
const P = css("print.css");
const hideRule = /([^{}]+)\{\s*display:\s*none\s*!important;\s*\}/.exec(P)?.[1].replace(/\/\*[\s\S]*?\*\//g, "").split(",").map((x) => x.trim()) ?? [];
const darkBlock = /:root,\s*\[data-theme="dark"\]\s*\{([^}]*)\}/.exec(P)?.[1] ?? "";
check("Y5", "print.css (frozen css-prelo; the live css equals it, cssguard): style.css imports it for print only", /@import url\("print\.css"\) print;/.test(css("style.css")));
check("Y6", "…it hides everything that isn't the document: the sidebar, topbar, page header (the buttons), breadcrumb, alerts, toasts, dialogs and .no-print; the bell panel too (modal.css)",
  [".sidebar", ".topbar", ".page-header", ".breadcrumb", ".alert", ".toast-container", ".modal", ".no-print"].every((x) => hideRule.includes(x)) && /@media print \{ \.bell-panel \{ display: none !important; \} \}/.test(css("components/modal.css")), j(hideRule));
check("Y7", "…light colours even in dark mode: :root and [data-theme=dark] get color-scheme light, a white background and surface, dark text; body white",
  /color-scheme:\s*light/.test(darkBlock) && /--color-bg:\s*#ffffff/.test(darkBlock) && /--color-surface:\s*#ffffff/.test(darkBlock) && /--color-text:\s*#101828/.test(darkBlock) && /body\s*\{\s*background:\s*#ffffff/.test(P), darkBlock.slice(0, 200));
check("Y8", "…on A4, the payslip kept in one piece (break-inside: avoid), full width, flat", /@page\s*\{\s*size:\s*A4;/.test(P) && /\.payslip\s*\{[^}]*max-width:\s*none;[^}]*break-inside:\s*avoid;/.test(P) && /\.content\s*\{[^}]*padding:\s*0;/.test(P));
await open("payroll/payslips");
const dl = [...d.querySelectorAll("main button, main a")].filter((b) => /^Download/.test(txt(b)));
check("Y9", "the payslips list's Download (each row) and Download all stay placeholders (the backend's)", dl.length > 1 && dl.every((b) => b.dataset.notImplemented === txt(b)) && dl.some((b) => txt(b) === "Download all") && dl.some((b) => txt(b) === "Download"), j(dl.map((b) => [txt(b), b.dataset.notImplemented])));

// =================================================================
section("U. Employee profile: Reset password");
for (const who of ["admin", "hr"]) {
  fresh(who); await open("users/user-profile", "?id=EMP-1105");
  const btn = [...d.querySelectorAll(".page-header__actions button")].find((b) => txt(b) === "Reset password");
  const s1 = j([...mem]);
  click(btn); click(btn);
  check(`U${who === "admin" ? 1 : 2}`, `${who === "admin" ? "Admin" : "HR"}: Reset password (shown) gives the info toast 'Passwords aren't part of OfficeOS yet: no reset link was sent to arjun.kapoor@northwind.com.' each time; no confirm(), no 'Reset requested' note, nothing written`,
    btn && !btn.hidden && j(toasts()) === j(Array(2).fill("info:Passwords aren't part of OfficeOS yet: no reset link was sent to arjun.kapoor@northwind.com.")) && confirms.length === 0 && !d.querySelector(".reset-note") && !/Reset requested/.test(d.body.textContent) && j([...mem]) === s1,
    j([toasts(), confirms, txt(d.querySelector(".reset-note"))]));
}
const upSrc = read(HERE, "js", "pages", "user-profile.js");
check("U3", "user-profile.js: no 'Send a password reset' confirm and no reset-note left", !/Send a password reset|reset-note|Reset requested \$/.test(upSrc));

// =================================================================
section("A. My attendance: no static-page branch");
const maSrc = read(HERE, "js", "pages", "my-attendance.js");
check("A1", "my-attendance.js: no 'Send request isn't available in this demo.' toast and no else branch for the static page; its other 4 toasts stay", !/showToast\("[^"]*isn't available/.test(maSrc) &&!/\} else if \(form\)/.test(maSrc) && (maSrc.match(/showToast\(/g) ?? []).length === 4, (maSrc.match(/showToast\(([^)]*)/g) ?? []).join(" | "));
for (const [n, label, sess] of [["A2", "an old session (no employee id)", { roleKey: "emp", userLabel: "Arjun Kapoor", signedInAt: NOW }], ["A3", "a deleted person's session (EMP-9999)", { roleKey: "emp", userLabel: "Gone", employeeId: "EMP-9999", signedInAt: NOW }]]) {
  mem.clear(); mem.set("officeos:session", j(sess));
  await open("attendance/my-attendance");
  const signedOut = !mem.has("officeos:session");
  click(d.querySelector('#daily-log button[data-modal="regularize-modal"]') ?? d.body);
  let prevented = null;
  d.querySelector("#regularize-modal form").addEventListener("submit", (e) => { prevented = e.defaultPrevented; });
  const e = new w.Event("submit", { bubbles: true, cancelable: true });
  d.querySelector("#regularize-modal form").dispatchEvent(e);
  check(n, `${label}: the guard signs it out (the login page opens); nothing on the page handles Send request (not prevented, no toast)`, signedOut && prevented === false && toasts().length === 0, j([signedOut, prevented, toasts()]));
}

check("E99", "no js errors", allJsErrors.length === 0, j(allJsErrors.slice(0, 5)));
console.log(`\n${passed} passed, ${failed} failed`);
